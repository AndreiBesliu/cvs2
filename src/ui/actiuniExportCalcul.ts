import { iesireDinFoaie, type IesireFoaie } from '../cam/iesire.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../cam/job.ts';
import { fireImplicite, simuleazaInBazin, SimulareAnulata } from '../jobs/bazin.ts';
import type { Program, Scula } from '../ir/ir.ts';
import type { Montaj } from '../ir/montaj.ts';
import { profilDinSetari, type ProfilMasina } from '../ir/masina.ts';
import { PROFIL_GRBL_11H } from '../ir/masini/grbl11h.ts';
import { PLAFON, type Document } from '../model/document.ts';
import { CONTRACTE } from '../post/contracte/index.ts';
import { GRBL_11 } from '../post/contracte/grbl11.ts';
import { exporta, type ProgramExportat } from '../post/export.ts';
import { posteaza } from '../post/post.ts';
import { reliefPentru } from '../sim/banda.ts';
import { campPentruFoaie, dimensiuni, type ParametriCamp } from '../sim/camp.ts';
import type { DateScula, GrupSimulare } from '../sim/nucleu.ts';
import { pregatesteProgram } from '../sim/program.ts';
import { estimeazaTimp, type Portiune } from '../sim/timp.ts';
import type { Timpi } from '../sim/animatie.ts';
import type { FereastraRelief, ParametriExport, ProgramSimulare, ReliefSimulat, RezultatExport, RezumatJob, SimulareExport } from './actiuniExportTipuri.ts';

/** Așteptarea axului după pornire: un parametru al mașinii; profilul mașinii vine în etapa 3. */
const ASTEPTARE_AX = 3;

/** Aceeași ieșire, pe același traseu: confirmarea omului acoperă exact ce a văzut, nu o ieșire calculată după aceea. */
function aceeasiIesire(a: IesireFoaie | undefined, b: IesireFoaie): boolean {
  if (!a || a.amprenta !== b.amprenta) return false;
  const egal = (u: number, v: number): boolean => Math.abs(u - v) <= 1e-9;
  const [x, y] = [a.depasire, b.depasire];
  return egal(x.stanga, y.stanga) && egal(x.dreapta, y.dreapta) && egal(x.jos, y.jos) && egal(x.sus, y.sus);
}

/** Exportul propriu-zis: documentul → profilele → IR → postul ales (ADR 0083) → octeții cu SHA-256. Se încarcă la cerere. */
export async function calculeazaExport(doc: Document, p: ParametriExport): Promise<RezultatExport> {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  const job = programDinDocument(doc, REGIM_IMPLICIT, p.supracursa ?? 0);
  if (!job.ok) return job;
  const iesire = iesireDinFoaie(job.program, foaie.stoc);
  if (iesire) {
    const { stanga, dreapta, jos, sus } = iesire.depasire;
    // Plafonul pe artefact (T23): o ieșire cât încă o foaie maximă e o greșeală de poziție, nu o intenție.
    if (Math.max(stanga, dreapta, jos, sus) > PLAFON.latura) {
      return { ok: false, motiv: `freza iese din foaie cu peste ${PLAFON.latura} mm` };
    }
    if (!aceeasiIesire(p.confirmareIesire, iesire)) {
      return { ok: false, motiv: 'freza iese din foaie: exportul cere confirmarea ta', cereConfirmare: iesire };
    }
  }
  const e = await exporta(job.program, { foaie: foaie.stoc, origine: p.origine, z0: p.z0 }, CONTRACTE[p.post ?? 'grbl-11'], {
    asteptareAx: ASTEPTARE_AX, unitati: p.unitati ?? 'mm', ...(p.strategieScula ? { strategieScula: p.strategieScula } : {}),
    ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
  });
  if (!e.ok) return e;
  return {
    ok: true, program: e.exportat, fisiere: e.fisiere, avertismente: job.avertismente,
    // Cu fișiere separate, fiecare are scula lui; altfel, sculele programului, în ordinea în care se montează.
    rezumat: e.fisiere.length > 1
      ? unesteRezumate(e.fisiere.map((f) => rezumatJob(f, f.scula ? [f.scula] : sculeProgram(job.program), p.setariMasina)))
      : rezumatJob(e.exportat, sculeProgram(job.program), p.setariMasina),
    simulare: (semnal) => simuleazaExport(job.program, foaie.stoc, semnal),
  };
}

/**
 * Simularea programului exportat (ADR 0047 §5): IR-ul (coordonatele documentului), pe toată foaia, la 0,25 mm, în bazinul
 * de workere. Un refuz sau un worker căzut nu oprește exportul: dialogul spune de ce lipsește simularea.
 */
export async function simuleazaExport(
  program: Program, foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number }, semnal?: AbortSignal,
): Promise<SimulareExport> {
  const p = pregatesteProgram(program, 0);
  if (!p.ok) return { ok: false, motiv: p.motiv, eroare: false };
  const camp = campPentruFoaie(foaie), d = dimensiuni(camp.celula, camp.latime, camp.inaltime);
  try {
    const r = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, ...(p.apoi ? { apoi: p.apoi } : {}), fund: -foaie.grosime }, fireImplicite(), semnal ? { semnal } : {});
    return {
      ok: true, amprenta: r.amprenta, volum: r.volum, adancimeMax: r.adancimeMax, prinFoaie: r.prinFoaie, grosime: foaie.grosime,
      celula: camp.celula, celule: [d.nx, d.ny],
      fire: r.fire, ms: r.ms, previzualizare: { latime: r.previzualizare.latime, inaltime: r.previzualizare.inaltime, z: r.previzualizare.z },
    };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    return e instanceof SimulareAnulata ? { ok: false, motiv, eroare: false, anulata: true } : { ok: false, motiv, eroare: true };
  }
}

/** Ce ține `ProgramSimulare.date`: scula și mutările nucleului (IR-ul, în coordonatele documentului), cu grupurile de după schimbări. */
type DateSimulare = { readonly scula: DateScula; readonly mutari: Float64Array; readonly apoi?: readonly GrupSimulare[] };

/**
 * Programul documentului pentru vederea 3D (ADR 0057 §1): același CAM ca traseul și exportul (fără supracursă), apoi
 * mutările nucleului, cu fața plăcii la Z 0. Pe firul principal, ca traseul; simularea, în bazin.
 */
export function programSimulare(doc: Document): ProgramSimulare {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  const job = programDinDocument(doc, REGIM_IMPLICIT, 0);
  if (!job.ok) return { ok: false, motiv: job.motiv };
  const p = pregatesteProgram(job.program, 0);
  if (!p.ok) return { ok: false, motiv: p.motiv };
  const date: DateSimulare = { scula: p.scula, mutari: p.mutari, ...(p.apoi ? { apoi: p.apoi } : {}) };
  return { ok: true, foaie: { latime: foaie.stoc.latime, inaltime: foaie.stoc.inaltime, grosime: foaie.stoc.grosime }, date };
}

/** Fereastra plăcii întregi, la celula implicită (sau dublată, peste plafonul celulelor: ADR 0047 §1). */
export function fereastraFoii(foaie: { readonly latime: number; readonly inaltime: number }): FereastraRelief {
  const c = campPentruFoaie(foaie);
  return { x0: c.x0, y0: c.y0, latime: c.latime, inaltime: c.inaltime, celula: c.celula };
}

/**
 * Relieful unei ferestre (ADR 0057 §2, §4): placa întreagă, sau o parte a ei la 0,1 mm; în bazinul de workere, cu
 * anularea vederii (un document schimbat, o fereastră nouă, vederea închisă). Ca la simularea exportului, `eroare` = s-a
 * stricat ceva (merge în jurnal); un refuz sau o anulare nu.
 */
export async function simuleazaRelief(
  program: Extract<ProgramSimulare, { ok: true }>, fereastra: FereastraRelief, semnal?: AbortSignal,
): Promise<ReliefSimulat> {
  const { scula, mutari, apoi } = program.date as DateSimulare;
  const camp: ParametriCamp = { ...fereastra, sus: 0 };
  const relief = reliefPentru(camp);
  if (!relief) return { ok: false, motiv: `fereastra de ${fereastra.latime} × ${fereastra.inaltime} mm nu încape în relief la ${fereastra.celula} mm`, eroare: false };
  try {
    const r = await simuleazaInBazin({ camp, scula, mutari, ...(apoi ? { apoi } : {}), fund: -program.foaie.grosime, relief }, fireImplicite(), semnal ? { semnal } : {});
    if (!r.relief) return { ok: false, motiv: 'simularea n-a întors relieful', eroare: true };
    return {
      ok: true, fereastra, latime: r.relief.latime, inaltime: r.relief.inaltime, bloc: r.relief.bloc, z: r.relief.z, sus: r.sus,
      fund: r.fund, adancimeMax: r.adancimeMax, prinFoaie: r.prinFoaie, fire: r.fire, ms: r.ms,
    };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    return e instanceof SimulareAnulata ? { ok: false, motiv, eroare: false, anulata: true } : { ok: false, motiv, eroare: true };
  }
}

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
 * Timpul jobului de lângă traseu (ADR 0046 §8): programul traseului prin același post și același contract ca exportul,
 * cu montajul stânga-jos și Z0 sus (implicitul dialogului), apoi rezumatul. Montajele sunt translații, deci colțul ales la
 * export schimbă timpul doar prin rotunjirea coordonatelor. Nu descarcă nimic; un program refuzat de post dă motivul.
 */
export function timpProgram(program: Program, foaie: Montaj['foaie'], setari: string | undefined): RezumatJob {
  const r = posteaza(program, { foaie, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: ASTEPTARE_AX });
  if (!r.ok) return { ok: false, sursa: 'program', linie: 0, motiv: r.motiv };
  const rez = rezumatJob(r, sculeProgram(program), setari);
  // Animația traseului (ADR 0099) pornește din cipul timpului: programul și mașina lui vin cu rezumatul.
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
