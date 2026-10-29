/**
 * Rezumatul jobului (ADR 0046) și timpii traseului (ADR 0099): estimarea planificatorului pe octeții postului. Le
 * calculează workerul CAM (ADR 0109), lângă program; animația traseului își ia timpii tot de aici. Mutate din
 * `src/ui/actiuniExportCalcul.ts`, neschimbate.
 */
import type { Program, Scula } from '../ir/ir.ts';
import type { Montaj } from '../ir/montaj.ts';
import { profilDinSetari, type ProfilMasina } from '../ir/masina.ts';
import { PROFIL_GRBL_11H } from '../ir/masini/grbl11h.ts';
import { GRBL_11 } from '../post/contracte/grbl11.ts';
import type { ProgramExportat } from '../post/export.ts';
import { posteaza } from '../post/post.ts';
import type { Timpi } from '../sim/animatie.ts';
import { estimeazaTimp, type Portiune } from '../sim/timp.ts';

/** Așteptarea axului după pornire: un parametru al mașinii; profilul mașinii vine în etapa 3. */
export const ASTEPTARE_AX = 3;

/** Timpul și distanțele unei bucăți a jobului (ADR 0046): secunde și milimetri. */
export type TimpPortiune = { readonly secunde: number; readonly pauze: number; readonly taiere: number; readonly rapide: number };

/**
 * Rezumatul jobului (ADR 0046): estimarea timpului pe octeții exportați, cu modelul planificatorului GRBL, pe tot jobul,
 * pe operație și pe sculă. `ok: false` nu oprește exportul (programul e scris oricum), doar spune de ce lipsește timpul.
 */
export type RezumatJob =
  | {
    readonly ok: true;
    readonly total: TimpPortiune;
    /** Pe operație, cu cheia rândurilor dialogului (`<piesă>/<operație>`), în ordinea în care începe tăierea lor. */
    readonly peOperatie: ReadonlyArray<TimpPortiune & { readonly operatie: string }>;
    /** Ce nu ține de nicio operație: pornirea (Z sigur, axul, pauza lui) și finalul (retragerea, oprirea axului). */
    readonly restul: TimpPortiune;
    readonly peScula: ReadonlyArray<TimpPortiune & { readonly numar: number; readonly nume: string; readonly diametru: number }>;
    /** Opririle pentru schimbarea sculei (ADR 0084): timpul lor (al omului) nu e în estimare. */
    readonly opriri: number;
    /** Mașina pe care s-a estimat, cu vitezele maxime (mm/min) și accelerațiile (mm/s²) pe X, Y, Z. */
    readonly masina: {
      readonly nume: string; readonly sursa: 'implicit' | 'setari';
      readonly vitezaMaxima: readonly [number, number, number]; readonly acceleratie: readonly [number, number, number];
    };
    /** Câte blocuri de tăiere cer un avans peste viteza maximă a mașinii pe direcția lor (controlerul îl taie). */
    readonly liniiLimitate: number;
    /** Doar la timpul de lângă traseu (`timpProgram`): programul și mașina lui, pentru animația traseului (ADR 0099). */
    readonly traseu?: { readonly program: Program; readonly foaie: Montaj['foaie']; readonly setari: string | undefined };
  }
  /**
   * `sursa`: ce n-a putut citi estimarea, setările lipite sau programul; `linie`: linia din textul lor (de la 1), sau 0.
   * `motiv` e al domeniului (în română, ca motivele exportului); interfața îl pune în fraza ei, tradusă.
   */
  | { readonly ok: false; readonly sursa: 'setari' | 'program'; readonly linie: number; readonly motiv: string };

const zero = (): { secunde: number; pauze: number; taiere: number; rapide: number } => ({ secunde: 0, pauze: 0, taiere: 0, rapide: 0 });

/** Sculele unui program IR, în ordinea în care se montează (scula de antet, apoi fiecare schimbare), fiecare o dată. */
export function sculeProgram(p: Program): Scula[] {
  const rez: Scula[] = [p.scula];
  for (const m of p.miscari) if (m.tip === 'schimba-scula' && !rez.some((s) => s.numar === m.scula.numar)) rez.push(m.scula);
  return rez;
}

/** Rezumatul mai multor fișiere (câte unul pe sculă): sumele, operațiile și sculele lor, mașina primului. */
export function unesteRezumate(r: readonly RezumatJob[]): RezumatJob {
  const gresit = r.find((x) => !x.ok);
  if (gresit) return gresit;
  const bune = r.filter((x): x is Extract<RezumatJob, { ok: true }> => x.ok);
  const prim = bune[0];
  if (!prim) return { ok: false, sursa: 'program', linie: 0, motiv: 'niciun fișier' };
  const suma = (f: (x: Extract<RezumatJob, { ok: true }>) => ReturnType<typeof zero>) => bune.reduce((s, x) => {
    const p = f(x);
    return { secunde: s.secunde + p.secunde, pauze: s.pauze + p.pauze, taiere: s.taiere + p.taiere, rapide: s.rapide + p.rapide };
  }, zero());
  return {
    ok: true, total: suma((x) => x.total), restul: suma((x) => x.restul), peOperatie: bune.flatMap((x) => x.peOperatie),
    peScula: bune.flatMap((x) => x.peScula), masina: prim.masina, liniiLimitate: bune.reduce((s, x) => s + x.liniiLimitate, 0),
    // Fișierele separate n-au opriri: fiecare e al unei singure freze.
    opriri: 0,
  };
}

/**
 * Rezumatul jobului (ADR 0046): estimarea pe octeții exportați, cu profilul mașinii (implicitele GRBL 1.1h, sau peste ele
 * răspunsul la `$$` lipit de om), împărțită pe secțiunile postului: fiecare operație adună secțiunile ei (o operație pe
 * mai multe elemente sau instanțe are mai multe), iar pornirea și finalul merg la „restul”. Pe scule (ADR 0084): fiecare
 * secțiune merge la scula montată atunci (`scule[0]` de la pornire, apoi cea din secțiunea de după fiecare schimbare);
 * opririle pentru schimbare se numără, fără timp (estimarea cu opririle senderului).
 */
export function rezumatJob(program: Pick<ProgramExportat, 'text' | 'sectiuni'>, scule: readonly Scula[], setari: string | undefined): RezumatJob {
  const pm = profilMasina(setari);
  if (!pm.ok) return { ok: false, sursa: 'setari', linie: pm.linie, motiv: pm.motiv };
  const profil = pm.profil;
  const e = estimeazaTimp(program.text, profil, program.sectiuni.map((s) => s.linie), undefined, { opriri: true });
  if (!e.ok) return { ok: false, sursa: 'program', linie: e.linie, motiv: e.motiv };
  const adauga = (la: ReturnType<typeof zero> | undefined, p: Portiune | undefined): void => {
    if (!la || !p) return;
    la.secunde += p.secunde;
    la.pauze += p.pauze;
    la.taiere += p.taiere;
    la.rapide += p.rapide;
  };
  const restul = zero();
  adauga(restul, e.portiuni[0]);
  const peOperatie = new Map<string, ReturnType<typeof zero>>();
  const peScula = new Map<number, ReturnType<typeof zero>>(scule.map((s) => [s.numar, zero()]));
  let montata = scule[0]?.numar;
  adauga(peScula.get(montata ?? -1), e.portiuni[0]);
  for (const [k, s] of program.sectiuni.entries()) {
    const p = e.portiuni[k + 1];
    if (s.scula !== undefined) montata = s.scula;
    adauga(peScula.get(montata ?? -1), p);
    if (s.operatie === undefined) {
      adauga(restul, p);
      continue;
    }
    let la = peOperatie.get(s.operatie);
    if (!la) {
      la = zero();
      peOperatie.set(s.operatie, la);
    }
    adauga(la, p);
  }
  const axa = (a: 'X' | 'Y' | 'Z') => profil.axe[a] ?? { vitezaMaxima: Number.NaN, acceleratie: Number.NaN };
  return {
    ok: true,
    total: e.total,
    peOperatie: [...peOperatie].map(([operatie, p]) => ({ operatie, ...p })),
    restul,
    peScula: scule.map((s) => ({ numar: s.numar, nume: s.nume, diametru: s.diametru, ...(peScula.get(s.numar) ?? zero()) })),
    opriri: e.opriri,
    masina: {
      nume: profil.nume, sursa: profil.sursa,
      vitezaMaxima: [axa('X').vitezaMaxima, axa('Y').vitezaMaxima, axa('Z').vitezaMaxima],
      acceleratie: [axa('X').acceleratie, axa('Y').acceleratie, axa('Z').acceleratie],
    },
    liniiLimitate: e.liniiLimitate,
  };
}

/**
 * Timpul jobului de lângă traseu (ADR 0046 §8), fără programul alături: programul traseului prin același post și același
 * contract ca exportul, cu montajul stânga-jos și Z0 sus (implicitul dialogului), apoi rezumatul. Montajele sunt
 * translații, deci colțul ales la export schimbă timpul doar prin rotunjirea coordonatelor. Nu descarcă nimic; un program
 * refuzat de post dă motivul. Îl calculează workerul CAM (ADR 0109); firul principal pune programul lui alături.
 */
export function rezumatTraseu(program: Program, foaie: Montaj['foaie'], setari: string | undefined): RezumatJob {
  const r = posteaza(program, { foaie, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: ASTEPTARE_AX });
  if (!r.ok) return { ok: false, sursa: 'program', linie: 0, motiv: r.motiv };
  return rezumatJob(r, sculeProgram(program), setari);
}

/** Timpul jobului de lângă traseu, cu programul și mașina lui alături: animația traseului (ADR 0099) pornește din cip. */
export function timpProgram(program: Program, foaie: Montaj['foaie'], setari: string | undefined): RezumatJob {
  const rez = rezumatTraseu(program, foaie, setari);
  return rez.ok ? { ...rez, traseu: { program, foaie, setari } } : rez;
}

/** Mașina estimării: profilul implicit, sau cel din setările `$$` lipite (cu linia unei setări pe care n-o poate citi). */
function profilMasina(setari: string | undefined): { ok: true; profil: ProfilMasina } | { ok: false; linie: number; motiv: string } {
  if (setari === undefined || setari.trim() === '') return { ok: true, profil: PROFIL_GRBL_11H };
  const s = profilDinSetari(setari, PROFIL_GRBL_11H);
  return s.ok ? { ok: true, profil: s.profil } : { ok: false, linie: s.linie, motiv: s.motiv };
}

/**
 * Timpul fiecărei mișcări a programului traseului, pentru animație (ADR 0099): același post și aceeași mașină ca
 * `timpProgram`, cu estimarea împărțită la liniile la care începe fiecare mișcare (`liniiMiscari`). Suma e exact timpul
 * jobului. `null` când postul refuză programul sau setările `$$` nu se pot citi: animația merge atunci pe timpi simpli.
 */
export function secundePeMiscare(program: Program, foaie: Montaj['foaie'], setari: string | undefined): (Timpi & { readonly miscari: Float64Array }) | null {
  const r = posteaza(program, { foaie, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: ASTEPTARE_AX });
  const pm = profilMasina(setari);
  if (!r.ok || !pm.ok) return null;
  const e = estimeazaTimp(r.text, pm.profil, r.liniiMiscari, undefined, { opriri: true });
  if (!e.ok) return null;
  const n = program.miscari.length;
  const miscari = new Float64Array(n);
  for (let k = 0; k < n; k++) miscari[k] = e.portiuni[k + 1]?.secunde ?? 0;
  return { pregatire: e.portiuni[0]?.secunde ?? 0, miscari, final: e.portiuni[n + 1]?.secunde ?? 0 };
}
