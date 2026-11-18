/**
 * Incrustația cu pereți drepți (ADR 0171): geometria locașului și a dopului, fără lucrare (o folosesc și lucrarea foii, și
 * dopul, `dopDrept.ts`). R e raza celei mai mici freze a locașului, r a celei mai mici a dopului, c jocul lateral, ρ =
 * max(0, r − c):
 * - **locașul** taie desenul închis cu ρ (unghiurile intrânde rotunjite cu ρ); buzunarul îi rotunjește singur vârfurile cu R,
 *   deci conturul tăiat e P = deschiderea cu R a închiderii cu ρ;
 * - **dopul** e P micșorat cu c: vârfurile au R − c (sau ascuțite), unghiurile ρ + c ≥ r, deci frezele dopului îl taie exact,
 *   fără lemn rămas în unghiuri, iar arcele perechi sunt concentrice: jocul e c pe tot conturul.
 * O parte mai îngustă decât freza locașului dispare din el (refuz); părțile unite de închidere și cât se retrage cel mai ascuțit
 * vârf se spun ca avertismente. Cu treaptă (ADR 0175 §3), locașul are două niveluri, fiecare potrivit la fel (`nivelDreapta`):
 * nivelul de sus, cu flanșa dopului, și deschiderea de sub umăr, cu tija lui.
 */
import type { Contur } from '../geom/conturBaza.ts';
import { arieCuSemn, inSensTrigonometric, inverseaza } from '../geom/contur.ts';
import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
import { DISTANTA_MINIMA, offsetFigura, type Regiune } from '../geom/offset.ts';
import { JOC_INCRUSTATIE_MINIM, pasLateralImplicit, type Operatie, type Scula } from '../model/document.ts';
import { valoriIncrustatieDreapta } from '../model/incrustatie.ts';
import { jsonCanonic } from '../model/jsonCanonic.ts';

export type FrezaDreapta = { readonly scula: Scula; readonly pasLateral: number };

/**
 * Frezele locașului (a operației, apoi cele de rest) și ale dopului (ale lui, sau aceleași). Razele lor cele mai mici, cu care
 * se potrivesc colțurile, le dă `valoriIncrustatieDreapta` (un singur loc, comun cu panoul).
 */
export function frezeIncrustatieDreapta(op: Operatie): { readonly locas: readonly FrezaDreapta[]; readonly dop: readonly FrezaDreapta[] } {
  const locas: FrezaDreapta[] = [{ scula: op.scula, pasLateral: op.pasLateral ?? pasLateralImplicit(op.scula.diametru) }, ...(op.rest ?? [])];
  const inc = op.incrustatie;
  const dop: readonly FrezaDreapta[] = inc?.fel === 'drept' && inc.frezeDop && inc.frezeDop.length > 0 ? inc.frezeDop : locas;
  return { locas, dop };
}

/**
 * De ce nu se poate tăia incrustația cu pereți drepți (ADR 0171 §4), sau null: doar pe un buzunar; frezele dopului drepte;
 * jocul lateral sub raza celei mai mici freze a locașului (altfel vârfurile dopului ies ascuțite și jocul crește în ele); dopul
 * ridicat sprijinit pe față cere jocul de sub el cel puțin `JOC_INCRUSTATIE_MINIM` și sub adâncime. Freza în V a buzunarului o
 * refuză lucrarea, ca la orice buzunar. Gaura (ADR 0175) n-are fund: dopul ridicat nu se sprijină pe el, iar jocul de sub dop
 * nu se aplică. Treapta (ADR 0175 §4, precizarea din 17.11): dopul stă pe umăr sau pe fund (la gaură, doar pe umăr); umărul
 * mai sus decât fundul (la gaură, decât fața de jos a foii, `grosimeFoaie`) și mai lat decât jocul lateral; jocul g cel puțin
 * `JOC_INCRUSTATIE_MINIM`, sub D − d pe umăr (tija are lungime) și sub d pe fund. Fără treaptă, nu pe umăr.
 */
export function refuzIncrustatieDreapta(op: Operatie, unde: string, grosimeFoaie?: number): string | null {
  const i = op.incrustatie;
  if (i?.fel !== 'drept') return null;
  if (op.tip !== 'buzunar') return `${unde}: incrustația cu pereți drepți e a unui buzunar (pe un V-carve, alege incrustația în V)`;
  const v = (i.frezeDop ?? []).find((f) => f.scula.forma !== undefined);
  if (v) return `${unde}: frezele dopului sunt drepte (T${v.scula.numar} e în V)`;
  const gaura = i.locas === 'gaura';
  const tr = i.treapta;
  if (tr) {
    if (i.sprijin === 'fata') return `${unde}: cu treaptă, dopul stă pe umăr sau pe fund (pe față stă doar dopul fără treaptă)`;
    if (gaura && i.sprijin === 'fund') return `${unde}: gaura n-are fund: dopul în trepte stă pe umăr`;
    const D = gaura && grosimeFoaie !== undefined ? grosimeFoaie : op.adancime;
    if (!(tr.adancime < D)) {
      return `${unde}: umărul, la ${tr.adancime} mm, trebuie să fie mai sus decât ${gaura ? 'fața de jos a foii' : 'fundul locașului'} (${fix(D)} mm)`;
    }
    if (!(tr.latime > i.jocLateral)) {
      return `${unde}: umărul, lat de ${tr.latime} mm, trebuie să fie mai lat decât jocul lateral (${i.jocLateral} mm): altfel flanșa dopului nu stă pe el`;
    }
    if (!gaura) {
      const care = i.sprijin === 'fund' ? 'jocul de deasupra umărului' : 'jocul de sub tijă';
      if (!(i.joc >= JOC_INCRUSTATIE_MINIM)) return `${unde}: ${care}, de ${i.joc} mm, trebuie să fie cel puțin ${JOC_INCRUSTATIE_MINIM} mm`;
      if (i.sprijin === 'fund' && !(i.joc < tr.adancime)) {
        return `${unde}: jocul de deasupra umărului, de ${i.joc} mm, trebuie să fie sub adâncimea umărului (${tr.adancime} mm)`;
      }
      if (i.sprijin === 'umar' && !(i.joc < D - tr.adancime)) {
        return `${unde}: jocul de sub tijă, de ${i.joc} mm, trebuie să fie sub D − d = ${fix(D - tr.adancime)} mm (altfel tija n-are lungime)`;
      }
    }
  } else if (i.sprijin === 'umar') {
    return `${unde}: sprijinul pe umăr cere treapta (umărul locașului)`;
  }
  if (gaura && i.dop === 'ridicat' && i.sprijin === 'fund') {
    return `${unde}: gaura n-are fund: dopul ridicat se sprijină pe fața plăcii (sau alege dopul decupat)`;
  }
  const raze = valoriIncrustatieDreapta(op);
  if (raze && !(i.jocLateral < raze.rLocas)) {
    return `${unde}: jocul lateral, de ${i.jocLateral} mm, trebuie să fie sub raza celei mai mici freze a locașului (R${fix(raze.rLocas)}): altfel vârfurile dopului ies ascuțite și jocul crește în ele`;
  }
  if (!tr && i.dop === 'ridicat' && i.sprijin === 'fata' && !gaura) {
    if (!(i.joc >= JOC_INCRUSTATIE_MINIM)) {
      return `${unde}: jocul de sub dop, de ${i.joc} mm, trebuie să fie cel puțin ${JOC_INCRUSTATIE_MINIM} mm (dopul sprijinit pe față)`;
    }
    if (!(i.joc < op.adancime)) return `${unde}: jocul de sub dop, de ${i.joc} mm, trebuie să fie sub adâncimea locașului (${op.adancime} mm)`;
  }
  return null;
}

/** Contururile regiunilor, într-o listă (exterioarele trigonometrice, golurile orare). */
export const contururiRegiuni = (r: readonly Regiune[]): Contur[] => r.flatMap((g) => [g.exterior, ...g.gauri]);

/**
 * Desenul (contururi închise care nu se ating, citite par-impar) ca regiuni: fiecare contur orientat după adâncimea lui
 * (par: trigonometric, impar: orar), fiecare gaură în cel mai mic exterior care o cuprinde.
 */
export function regiuniDesen(contururi: readonly Contur[]): Regiune[] {
  const t = contururi.map((c) => inSensTrigonometric(c));
  const adancime = t.map((c, i) => {
    const p = c.varfuri[0]?.p;
    return p ? t.filter((alt, j) => j !== i && inRegiune(p, [alt])).length : 0;
  });
  const exterioare = t.map((c, i) => ({ c, i, arie: Math.abs(arieCuSemn(c)) })).filter((x) => (adancime[x.i] ?? 0) % 2 === 0);
  const regiuni = exterioare.map((x) => ({ exterior: x.c, gauri: [] as Contur[], arie: x.arie, adancime: adancime[x.i] ?? 0 }));
  for (const [i, c] of t.entries()) {
    if ((adancime[i] ?? 0) % 2 === 0) continue;
    const p = c.varfuri[0]?.p;
    let gazda: (typeof regiuni)[number] | undefined;
    for (const r of regiuni) {
      if (p && r.adancime === (adancime[i] ?? 0) - 1 && inRegiune(p, [r.exterior]) && (!gazda || r.arie < gazda.arie)) gazda = r;
    }
    gazda?.gauri.push(inverseaza(c));
  }
  return regiuni.map(({ exterior, gauri }) => ({ exterior, gauri }));
}

/** Offsetul figurii, sau figura neschimbată la o distanță sub rezoluție. */
function offset(regiuni: readonly Regiune[], d: number): { readonly ok: true; readonly regiuni: readonly Regiune[] } | { readonly ok: false; readonly motiv: string } {
  if (Math.abs(d) < DISTANTA_MINIMA) return { ok: true, regiuni };
  const r = offsetFigura(contururiRegiuni(regiuni), d);
  return r.ok ? { ok: true, regiuni: r.regiuni } : r;
}

const fix = (x: number): string => String(Math.round(x * 1000) / 1000);

/** Un nivel al locașului cu pereți drepți (ADR 0171), cu dopul lui. */
export type NivelDreapta = {
  /** Figura pe care o taie buzunarul nivelului: desenul lui închis cu ρ. */
  readonly locas: readonly Regiune[];
  /** Conturul tăiat al nivelului: figura deschisă cu R (din ea se face dopul). */
  readonly taiat: readonly Regiune[];
  /** Conturul dopului pe nivelul ăsta: cel tăiat, micșorat cu c, în coordonatele foii (neoglindit). */
  readonly dop: readonly Regiune[];
};

export type FiguraDreapta = NivelDreapta & {
  /**
   * Deschiderea de sub umăr (ADR 0175 §3), doar cu treaptă: nivelul de jos, de la d la D, cu tija dopului. Atunci nivelul de
   * mai sus (`locas`, `taiat`, `dop`) e cel până la d, cu flanșa dopului.
   */
  readonly jos?: NivelDreapta;
  readonly avertismente: readonly string[];
};

type Raze = { readonly rLocas: number; readonly rho: number; readonly c: number };

/**
 * Un nivel din desenul lui (regiuni): închiderea cu ρ, deschiderea cu R, dopul micșorat cu c; sau motivul (o parte mai îngustă
 * decât freza locașului). `ce`: cum se cheamă nivelul în motiv (gol pentru desenul însuși).
 */
function nivelDreapta(s: readonly Regiune[], raze: Raze, ce: string): { readonly ok: true; readonly nivel: NivelDreapta } | { readonly ok: false; readonly motiv: string } {
  const { rLocas, rho, c } = raze;
  // Închiderea: +ρ, apoi −ρ.
  const larg = offset(s, rho);
  if (!larg.ok) return { ok: false, motiv: `${ce}locașul (închiderea cu ${fix(rho)} mm): ${larg.motiv}` };
  const locas = offset(larg.regiuni, -rho);
  if (!locas.ok) return { ok: false, motiv: `${ce}locașul (închiderea cu ${fix(rho)} mm): ${locas.motiv}` };
  // Deschiderea cu R: întâi −R; o regiune fără nimic înăuntru după el nu încape în locaș.
  // Al unui nivel care nu e desenul însuși (deschiderea de sub umăr): o parte prea îngustă se spune la fel, oricum ar dispărea.
  const preaIngust = `${ce}o parte e mai îngustă decât freza locașului (Ø${fix(2 * rLocas)}): micșorează lățimea umărului`;
  const ingust = offsetFigura(contururiRegiuni(locas.regiuni), -rLocas);
  if (!ingust.ok) {
    return { ok: false, motiv: ce === '' ? `desenul e mai îngust decât freza locașului (Ø${fix(2 * rLocas)}): nu încape în locaș (${ingust.motiv})` : preaIngust };
  }
  for (const r of locas.regiuni) {
    const are = ingust.regiuni.some((x) => {
      const p = x.exterior.varfuri[0]?.p;
      return p !== undefined && inRegiune(p, [r.exterior]);
    });
    if (!are) return { ok: false, motiv: ce === '' ? `o parte a desenului e mai îngustă decât freza locașului (Ø${fix(2 * rLocas)}): nu încape în locaș` : preaIngust };
  }
  const taiat = offset(ingust.regiuni, rLocas);
  if (!taiat.ok) return { ok: false, motiv: `${ce}conturul tăiat al locașului: ${taiat.motiv}` };
  const dop = offset(taiat.regiuni, -c);
  if (!dop.ok) return { ok: false, motiv: `${ce}conturul dopului (locașul micșorat cu ${fix(c)} mm): ${dop.motiv}` };
  return { ok: true, nivel: { locas: locas.regiuni, taiat: taiat.regiuni, dop: dop.regiuni } };
}

/**
 * Locașul și dopul unei incrustații cu pereți drepți, din desen (contururile operației, pe foaie) și din operație: figura
 * buzunarului, conturul tăiat și conturul dopului, cu avertismentele; sau motivul (o parte care nu încape în locaș). Cu treaptă
 * (ADR 0175 §3): spre interior, nivelul de sus e desenul, iar deschiderea e desenul micșorat cu s; spre exterior, deschiderea e
 * desenul, iar nivelul de sus e desenul lărgit cu s; fiecare potrivit la fel. Avertismentele (părțile unite, vârful retras)
 * sunt ale nivelului care urmează desenul.
 */
export function figuraDreapta(desen: readonly Contur[], op: Operatie): { readonly ok: true; readonly figura: FiguraDreapta } | { readonly ok: false; readonly motiv: string } {
  const i = op.incrustatie;
  if (i?.fel !== 'drept') return { ok: false, motiv: 'operația n-are o incrustație cu pereți drepți' };
  const raze = valoriIncrustatieDreapta(op);
  if (!raze) return { ok: false, motiv: 'operația n-are o incrustație cu pereți drepți' };
  const { rLocas, rDop, rho } = raze;
  const s = regiuniDesen(desen);
  const tr = i.treapta;
  const exterior = tr?.spre === 'exterior';
  // Nivelul care urmează desenul: singurul fără treaptă, cel de sus spre interior, deschiderea spre exterior.
  const alDesenului = nivelDreapta(s, raze, '');
  if (!alDesenului.ok) return alDesenului;
  let sus = alDesenului.nivel;
  let jos: NivelDreapta | undefined;
  if (tr) {
    const dispare = `deschiderea de sub umăr dispare într-o parte a desenului: umărul (${fix(tr.latime)} mm pe fiecare parte) și freza locașului (Ø${fix(2 * rLocas)}) nu încap în ea; micșorează lățimea umărului`;
    if (exterior) {
      const larg = offset(s, tr.latime);
      if (!larg.ok) return { ok: false, motiv: `nivelul de sus al umărului (desenul lărgit cu ${fix(tr.latime)} mm): ${larg.motiv}` };
      const n = nivelDreapta(larg.regiuni, raze, 'nivelul de sus al umărului: ');
      if (!n.ok) return n;
      sus = n.nivel;
      jos = alDesenului.nivel;
    } else {
      // Micșorat până dispare de tot, offsetul întoarce `ok: false` („offsetul interior dispare”); o parte dispărută, doar ea,
      // o prinde verificarea de mai jos (fiecare parte a nivelului de sus are o deschidere).
      const ingust = offset(s, -tr.latime);
      if (!ingust.ok) return { ok: false, motiv: dispare };
      const n = nivelDreapta(ingust.regiuni, raze, 'deschiderea de sub umăr: ');
      if (!n.ok) return n;
      jos = n.nivel;
    }
    // Fiecare parte a nivelului de sus are o deschidere sub umăr.
    for (const r of sus.locas) {
      const are = jos.taiat.some((x) => {
        const p = x.exterior.varfuri[0]?.p;
        return p !== undefined && inRegiune(p, [r.exterior]);
      });
      if (!are) return { ok: false, motiv: dispare };
    }
  }
  const avertismente: string[] = [];
  if (alDesenului.nivel.locas.length < s.length) {
    avertismente.push(`părți ale desenului se unesc în locaș: pereții dintre ele sunt mai subțiri decât freza dopului (Ø${fix(2 * rDop)}) plus jocul`);
  }
  // Cât se retrage cel mai ascuțit vârf: cel mai depărtat vârf al desenului care a rămas în afara conturului tăiat.
  const contururiTaiate = contururiRegiuni(alDesenului.nivel.taiat);
  let retras = 0;
  for (const k of desen) {
    for (const v of k.varfuri) {
      if (inRegiune(v.p, contururiTaiate)) continue;
      retras = Math.max(retras, Math.min(...contururiTaiate.map((x) => distantaLaContur(v.p, x))));
    }
  }
  if (retras > 0.01) {
    avertismente.push(`colțurile se potrivesc cu frezele (vârfurile locașului R${fix(rLocas)}, unghiurile R${fix(rho)}): cel mai ascuțit vârf se retrage ${fix(retras)} mm față de desen`);
  }
  return { ok: true, figura: { ...sus, ...(jos ? { jos } : {}), avertismente } };
}

/**
 * Cheia regiunii unei incrustații cu pereți drepți (ca la V-carve, ADR 0170): operațiile aceleiași piese dintr-o instanță cu
 * aceleași valori (freza, adâncimea, pasul, sensul, pasul lateral, frezele de rest, strategia, coborârea, incrustația) se taie
 * ca o singură figură, cu golurile ei: un text cu operațiile importului (exteriorul, golurile) rămâne o literă cu goluri.
 */
export function valoriBuzunarDrept(op: Operatie): string {
  return jsonCanonic({
    scula: { numar: op.scula.numar, diametru: op.scula.diametru }, adancime: op.adancime, pas: op.pas, sens: op.sens,
    pasLateral: op.pasLateral ?? null, rest: op.rest ?? null, strategie: op.strategie ?? null, coborare: op.coborare ?? null,
    incrustatie: op.incrustatie ?? null,
  });
}
