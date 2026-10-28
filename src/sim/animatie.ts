/**
 * Animația traseului (ADR 0099), modelul pur: cronologia mișcărilor unui program, cu timpul fiecăreia dat din afară (estimarea
 * planificatorului, ADR 0046, pe liniile postului), poziția frezei la orice moment, pașii înainte / înapoi și drumul parcurs
 * între două momente, ca linii frânte (arcele cu toleranța cerută).
 *
 * Coordonatele sunt ale documentului (IR-ul, ADR 0008): X, Y în mm de la colțul stânga-jos al foii, Z față de fața de sus a
 * materialului. Freza pornește din zeroul programului, la Z sigur (ce face pregătirea postului: Z sigur, axul, pauza lui).
 * O schimbare de sculă urcă la Z sigur (ca postul), iar finalul urcă la Z sigur. În interiorul unei mișcări, poziția e
 * liniară în timp (accelerațiile sunt în timpul mișcării, nu în forma ei): pe arc, unghiul și Z-ul.
 */
import { baleiajArc, type Miscare, type Program, type Scula } from '../ir/ir.ts';

export type Punct3 = { readonly x: number; readonly y: number; readonly z: number };

/** Felul unui pas: o mișcare a programului care ia timp sau mută freza, plus finalul. */
export type TipPas = 'rapida' | 'taiere' | 'arc' | 'pauza' | 'scula' | 'ax' | 'final';

export type PasAnimatie = {
  /** Indicele mișcării în program, sau -1 pentru final. */
  readonly miscare: number;
  readonly tip: TipPas;
  readonly t0: number;
  readonly t1: number;
  readonly de: Punct3;
  readonly la: Punct3;
  /** Doar pe arc: centrul și baleiajul cu semn (radiani). */
  readonly arc: { readonly cx: number; readonly cy: number; readonly baleiaj: number } | null;
  /** Scula montată în timpul pasului (cea nouă abia după schimbare). */
  readonly scula: Scula;
  /** mm/min la tăieri și arce; altfel `null`. */
  readonly avans: number | null;
  /** Textul ultimei etichete de dinainte (lucrarea: profil, buzunar…), sau `null`. */
  readonly eticheta: string | null;
};

export type Cronologie = {
  readonly pasi: readonly PasAnimatie[];
  /** Pregătirea (de la 0 la `start`), apoi pașii, până la `durata`. */
  readonly start: number;
  readonly durata: number;
  readonly pornire: Punct3;
  readonly scula: Scula;
};

/** Timpul, în secunde: înaintea primei mișcări, al fiecărei mișcări (cu indicele ei) și al finalului. */
export type Timpi = { readonly pregatire: number; readonly miscari: ArrayLike<number>; readonly final: number };

const timp = (v: number, ce: string): number => {
  if (!Number.isFinite(v) || v < 0) throw new Error(`timp nevalid pentru ${ce}: ${v}`);
  return v;
};

export function cronologie(program: Program, timpi: Timpi): Cronologie {
  const n = program.miscari.length;
  if (timpi.miscari.length !== n) throw new Error(`timpii au ${timpi.miscari.length} valori pentru ${n} mișcări`);
  const pornire: Punct3 = { x: 0, y: 0, z: program.zSigur };
  const pasi: PasAnimatie[] = [];
  let t = timp(timpi.pregatire, 'pregătire');
  const start = t;
  let p = pornire;
  let scula = program.scula;
  let eticheta: string | null = null;
  const adauga = (miscare: number, tip: TipPas, dt: number, la: Punct3, extra: Partial<Pick<PasAnimatie, 'arc' | 'avans'>> = {}): void => {
    pasi.push({ miscare, tip, t0: t, t1: t + dt, de: p, la, arc: extra.arc ?? null, scula, avans: extra.avans ?? null, eticheta });
    t += dt;
    p = la;
  };
  const tinta = (m: Extract<Miscare, { la: unknown }>): Punct3 => ({ x: m.la.X ?? p.x, y: m.la.Y ?? p.y, z: m.la.Z ?? p.z });
  for (let i = 0; i < n; i++) {
    const m = program.miscari[i] as Miscare;
    const dt = timp(timpi.miscari[i] as number, `mișcarea ${i}`);
    switch (m.tip) {
      case 'eticheta':
        eticheta = m.text;
        if (dt > 0) adauga(i, 'ax', dt, p);
        break;
      case 'rapida': {
        const la = tinta(m);
        if (dt > 0 || la.x !== p.x || la.y !== p.y || la.z !== p.z) adauga(i, 'rapida', dt, la);
        break;
      }
      case 'taiere':
        adauga(i, 'taiere', dt, tinta(m), { avans: m.avans });
        break;
      case 'arc': {
        const la = tinta(m);
        const baleiaj = baleiajArc(p, la, m.centru, m.sens === 'trigonometric');
        adauga(i, 'arc', dt, la, { arc: { cx: m.centru.x, cy: m.centru.y, baleiaj }, avans: m.avans });
        break;
      }
      case 'pauza':
        adauga(i, 'pauza', dt, p);
        break;
      case 'schimba-scula':
        adauga(i, 'scula', dt, { x: p.x, y: p.y, z: Math.max(p.z, program.zSigur) });
        scula = m.scula;
        break;
      case 'ax-pornit':
      case 'ax-oprit':
        if (dt > 0) adauga(i, 'ax', dt, p);
        break;
      default: {
        const _exhaustiv: never = m;
        throw new Error(`mișcare necunoscută: ${JSON.stringify(_exhaustiv)}`);
      }
    }
  }
  adauga(-1, 'final', timp(timpi.final, 'final'), { x: p.x, y: p.y, z: Math.max(p.z, program.zSigur) });
  return { pasi, start, durata: t, pornire, scula: program.scula };
}

/** Pura: poziția pe pas la fracțiunea `f` din timpul lui. */
function pozitiePe(s: PasAnimatie, f: number): Punct3 {
  const z = s.de.z + (s.la.z - s.de.z) * f;
  if (s.arc) {
    const { cx, cy, baleiaj } = s.arc;
    const r = Math.hypot(s.de.x - cx, s.de.y - cy);
    if (f >= 1) return { x: s.la.x, y: s.la.y, z };
    const u = Math.atan2(s.de.y - cy, s.de.x - cx) + baleiaj * f;
    return { x: cx + r * Math.cos(u), y: cy + r * Math.sin(u), z };
  }
  return { x: s.de.x + (s.la.x - s.de.x) * f, y: s.de.y + (s.la.y - s.de.y) * f, z };
}

export type StareAnimatie = Punct3 & {
  /** Pasul de acum, de la 1; 0 în pregătire. */
  readonly pas: number;
  readonly miscare: number;
  readonly tip: TipPas | 'pregatire';
  readonly scula: Scula;
  readonly avans: number | null;
  readonly eticheta: string | null;
};

/** Toleranța momentelor: capătul unui pas, citit ca număr cu virgulă, rămâne al lui. */
const EPS = 1e-9;

/** Primul pas care se termină după `t` (căutare binară); `pasi.length` dacă toți s-au terminat. */
function primulDupa(c: Cronologie, t: number): number {
  let lo = 0;
  let hi = c.pasi.length;
  while (lo < hi) {
    const mij = (lo + hi) >> 1;
    if ((c.pasi[mij] as PasAnimatie).t1 > t) hi = mij;
    else lo = mij + 1;
  }
  return lo;
}

/**
 * Freza la momentul `t`. Sfârșitul unui pas e al lui (pasul tocmai încheiat, cu freza la capătul lui): „Pasul următor” arată
 * pasul pe care l-a parcurs, nu începutul celui de după; la fel sfârșitul pregătirii.
 */
export function stareLa(c: Cronologie, t: number): StareAnimatie {
  if (t <= c.start || c.pasi.length === 0) {
    return { ...c.pornire, pas: 0, miscare: -1, tip: 'pregatire', scula: c.scula, avans: null, eticheta: null };
  }
  // La capătul animației, finalul (și când nu ia timp: programul se termină deja la Z sigur).
  const k = t >= c.durata ? c.pasi.length - 1 : Math.min(primulDupa(c, t - EPS), c.pasi.length - 1);
  const s = c.pasi[k] as PasAnimatie;
  const f = s.t1 > s.t0 ? Math.min(1, Math.max(0, (t - s.t0) / (s.t1 - s.t0))) : 1;
  return { ...pozitiePe(s, f), pas: k + 1, miscare: s.miscare, tip: s.tip, scula: s.scula, avans: s.avans, eticheta: s.eticheta };
}

/** Pas cu pas, înainte: sfârșitul primului pas care se termină după `t` (pașii fără timp se sar); la final, durata. */
export function inainte(c: Cronologie, t: number): number {
  const k = primulDupa(c, t + EPS);
  return k < c.pasi.length ? (c.pasi[k] as PasAnimatie).t1 : c.durata;
}

/** Pas cu pas, înapoi: sfârșitul ultimului pas terminat înainte de `t`; înaintea primului, 0. */
export function inapoi(c: Cronologie, t: number): number {
  // Pașii dinaintea primului care se termină după `t` s-au terminat toți înainte de el.
  const k = primulDupa(c, t - EPS) - 1;
  return k >= 0 ? (c.pasi[k] as PasAnimatie).t1 : 0;
}

/** O linie frântă a drumului parcurs: x, y pe rând, în mm; deplasările rapide separat de tăieri. */
export type LinieParcursa = { readonly rapid: boolean; readonly puncte: readonly number[] };

/**
 * Drumul parcurs de freză între momentele `t0` și `t1`, în planul XY: mișcările doar pe Z nu se văd, iar arcele se împart în
 * coarde cu săgeata de cel mult `toleranta` mm. Bucățile la fel (rapide sau tăieri) și legate se unesc într-o linie.
 */
export function parcursIntre(c: Cronologie, t0: number, t1: number, toleranta: number): LinieParcursa[] {
  const iesire: Array<{ rapid: boolean; puncte: number[] }> = [];
  if (!(t1 > t0)) return iesire;
  const adaugaPunct = (rapid: boolean, x: number, y: number, prim: Punct3): void => {
    const ultima = iesire.at(-1);
    const n = ultima?.puncte.length ?? 0;
    const legata = ultima !== undefined && ultima.rapid === rapid && ultima.puncte[n - 2] === prim.x && ultima.puncte[n - 1] === prim.y;
    if (legata) ultima.puncte.push(x, y);
    else iesire.push({ rapid, puncte: [prim.x, prim.y, x, y] });
  };
  for (let k = primulDupa(c, t0); k < c.pasi.length; k++) {
    const s = c.pasi[k] as PasAnimatie;
    if (s.t0 >= t1) break;
    const fa = s.t1 > s.t0 ? Math.max(0, (t0 - s.t0) / (s.t1 - s.t0)) : 0;
    const fb = s.t1 > s.t0 ? Math.min(1, (t1 - s.t0) / (s.t1 - s.t0)) : 1;
    const a = pozitiePe(s, fa);
    const b = pozitiePe(s, fb);
    const rapid = s.tip !== 'taiere' && s.tip !== 'arc';
    if (s.arc && fb > fa) {
      const r = Math.hypot(s.de.x - s.arc.cx, s.de.y - s.arc.cy);
      const unghi = Math.abs(s.arc.baleiaj) * (fb - fa);
      // Săgeata coardei pe un unghi φ: r·(1 − cos(φ/2)) ≤ toleranța.
      const maxim = r > toleranta ? 2 * Math.acos(1 - toleranta / r) : Math.PI;
      const bucati = Math.max(1, Math.ceil(unghi / maxim - 1e-12));
      let prec: Punct3 = a;
      for (let j = 1; j <= bucati; j++) {
        const q = j === bucati ? b : pozitiePe(s, fa + ((fb - fa) * j) / bucati);
        adaugaPunct(rapid, q.x, q.y, prec);
        prec = q;
      }
    } else if (a.x !== b.x || a.y !== b.y) {
      adaugaPunct(rapid, b.x, b.y, a);
    }
  }
  return iesire;
}
