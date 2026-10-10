/**
 * Cazurile oracolului rampei (ADR 0029), cu ZERO importuri din `src/`:
 * - `CAZURI_RAMPA`: cazurile pe hârtie din §6, fiecare cu documentul v6, traseul analitic (din `regiune.ts`), PERIMETRUL
 *   scris ca formulă închisă și INTRĂRILE scrise pe hârtie (numere sau formule de mână: 0, 10, 20; 0, 7π, 14π;
 *   0, 188, 3S/2 + 8; …), nu calculate de oracol;
 * - un SCRIITOR de programe cu rampă „cum cere contractul” (`programRampa`), cu propria lui copie a formulelor din §2
 *   (zonele, scoate, intrările, zR, max cu profilul urechilor din ADR 0028 §3, tura până la e_{k+1} + P și la
 *   e_n + Lr + P) și a emitentului din §3 (tăieturile exacte, Z liniar pe bucată, arcele ca elice, F pe bucățile care
 *   coboară), plus MARTORII NEGATIVI din §6 ca mutații ale lui: rampa care pleacă de la −d_k (plonjare), intrările
 *   nerotite, tura care nu re-acoperă rampa (pană), rampa care ignoră urechile (doar zR), intrarea lăsată pe un flanc
 *   (ediția întâi: fără `scoate`, cu coborârea pe verticală până la Z-ul cel mai puțin adânc dintre rampă și profil);
 * - `corpusRampa`: corpusul 2.4 (`corpusUrechi`: geometria 2.3a / 2.3b, foi de 3–18 mm, urechi care încap) adus la v6,
 *   cu rampe alese de un PRNG propriu pe o parte din operații (10, o lungime la întâmplare, sau 10 000, adică P/2).
 */
import { migreazaV5V6O, type DocV5O, type DocV6O, type RampaO, type UrechiO } from './document.ts';
import { lungime, punctLa, startul, type Primitiva } from './regiune.ts';
import { aleator, cerc, drept, laMasina, type Montaj, type Stoc } from './regiune.cazuri.ts';
import { treceri as trecerileOperatiei } from './sens.cazuri.ts';
import { corpusUrechi, docUrechi, drumCerut, type CazCorpusUrechi, type FormaUrechi } from './urechi.cazuri.ts';

const PI = Math.PI;

// ---------------------------------------------------------------------------------------------------------------
// Documentele.

/** Un document v6 cu o operație pe fiecare formă, toate cu aceleași urechi, rampă, adâncime și pas. */
export function docRampa(
  stoc: Stoc, forme: readonly FormaUrechi[],
  o: { readonly diametru: number; readonly adancime: number; readonly pas: number; readonly urechi: UrechiO | null; readonly rampa: RampaO | null },
): DocV6O {
  const v6 = migreazaV5V6O(docUrechi(stoc, forme, o));
  for (const p of v6.piese) for (const op of p.operatii) op.rampa = o.rampa === null ? null : { ...o.rampa };
  return v6;
}

// ---------------------------------------------------------------------------------------------------------------
// Cazurile pe hârtie (ADR 0029 §6).

export type CazRampa = {
  readonly nume: string;
  readonly stoc: Stoc;
  readonly forma: FormaUrechi;
  readonly diametru: number;
  readonly adancime: number;
  readonly pas: number;
  readonly urechi: UrechiO | null;
  readonly lungime: number;
  readonly supracursa: number;
  /** Perimetrul traseului centrului frezei, pe hârtie (formula închisă). */
  readonly P: number;
  /** Intrările cerute, desfășurate, scrise pe hârtie. */
  readonly intrari: readonly number[];
  /** Adâncimile trecerilor, pe hârtie. */
  readonly d: readonly number[];
  readonly doc: DocV6O;
};

const FOAIE_3: Stoc = { latime: 700, inaltime: 300, grosime: 3 };
const u = (numar: number, latime: number, grosime: number): UrechiO => ({ numar, latime, grosime });
const caz = (
  nume: string, stoc: Stoc, forma: FormaUrechi, adancime: number, pas: number, urechi: UrechiO | null, lungimeRampa: number,
  P: number, intrari: readonly number[], d: readonly number[], supracursa = 0, diametru = 6,
): CazRampa => ({
  nume, stoc, forma, diametru, adancime, pas, urechi, lungime: lungimeRampa, supracursa, P, intrari, d,
  doc: docRampa(stoc, [forma], { diametru, adancime, pas, urechi, rampa: { lungime: lungimeRampa } }),
});

/** Dreptunghiul 300 × 200 cu colțuri ascuțite, Ø6 pe exterior: P = 2·(306 + 206) − 8·3 + 2π·3 = 1000 + 6π. */
const P_DR = 1000 + 6 * PI;
/** Cu 4 urechi: S = P / 4; urechea j are centrul la (j + ½)·S, h = ℓ = 4 (W = 8; 0,45·(S − 8) ≫ 4), zona ±8. */
const S_DR = P_DR / 4;
const DR: FormaUrechi = { id: 'a', forma: drept(300, 200), x: 50, y: 50, latura: 'exterior' };

/**
 * Pe hârtie (freza Ø6, R = 3):
 * - dreptunghiul 300 × 200, 3 treceri de 1 mm (foaia 3, adâncimea 3, pasul 1), rampa 10: e = 0, 10, 20;
 * - cercul R100 pe exterior: P = 2π·103 = 206π; e = 0, 10, 20;
 * - gaura R10 (interior): traseul R7, P = 14π ≈ 43,98 < 2·30, deci Lr = P/2 = 7π: e = 0, 7π, 14π;
 * - dreptunghiul cu urechile 4 × 8 × 1,5 (vârful 1,5: trec trecerile 2 și 3), zonele [(j + ½)·S − 8, (j + ½)·S + 8]:
 *   · rampa 188: e₂ = 188 (între zonele 0 și 1); e₂ + Lr = 376 cade pe flancul care urcă al urechii 1
 *     (3S/2 − 8 = 374,07 < 376 < 3S/2 − 4 = 378,07) și se mută la 3S/2 + 8 = 390,07;
 *   · rampa 130: e₁ + Lr = 130 cade pe palierul urechii 0 (S/2 − 4 = 123,36 < 130 < S/2 + 4 = 131,36) și se mută la
 *     S/2 + 8 = 135,36; e₃ = S/2 + 8 + 130 = 265,36 (în afara zonelor);
 *   · rampa 75: e = 0, 75, 150; rampa trecerii 2, [75 + P, 150 + P], trece peste urechea 0 (zona [119,36; 135,36]): zR
 *     coboară de la −1 la −2, iar profilul trecerii 2 (palierul la −1,5) e mai puțin adânc între întâlnirile de la
 *     ≈ 122,31 și ≈ 133,61;
 * - ca placa 2: 120 × 80 cu colțurile R10, Ø6: P = 2·(126 + 86) − 8·13 + 2π·13 = 320 + 26π; MDF 12, adâncimea 12 în
 *   pași de 4, urechile 4 × 8 × 2 (vârful 10: trece doar trecerea 3), rampa 10: e = 0, 10, 20 (zona 0 începe la
 *   S/2 − 8 = 42,21);
 * - supracursa 0,3: 300 × 200 pe foaia 18, adâncimea 18,3 în pași de 6,1, urechile 4 × 8 × 2 (vârful 16), rampa 10.
 */
export const CAZURI_RAMPA: readonly CazRampa[] = [
  caz('dreptunghi 300 × 200, 3 treceri, rampa 10', FOAIE_3, DR, 3, 1, null, 10, P_DR, [0, 10, 20], [1, 2, 3]),
  caz('cercul R100, rampa 10', FOAIE_3, { id: 'a', forma: cerc(100), x: 200, y: 150, latura: 'exterior' }, 3, 1, null, 10, 206 * PI, [0, 10, 20], [1, 2, 3]),
  caz('gaura R10 (interior), rampa 30: Lr = P/2', FOAIE_3, { id: 'g', forma: cerc(10), x: 200, y: 150, latura: 'interior' }, 3, 1, null, 30, 14 * PI, [0, 7 * PI, 14 * PI], [1, 2, 3]),
  caz('dreptunghi cu urechi 4 × 8, rampa 188: e₂ + Lr cade pe flancul urechii 1', FOAIE_3, DR, 3, 1, u(4, 8, 1.5), 188, P_DR, [0, 188, 1.5 * S_DR + 8], [1, 2, 3]),
  caz('dreptunghi cu urechi 4 × 8, rampa 130: e₁ + Lr cade pe palierul urechii 0', FOAIE_3, DR, 3, 1, u(4, 8, 1.5), 130, P_DR, [0, 0.5 * S_DR + 8, 0.5 * S_DR + 138], [1, 2, 3]),
  caz('dreptunghi cu urechi 4 × 8, rampa 75: rampa trecerii 2 trece peste urechea 0', FOAIE_3, DR, 3, 1, u(4, 8, 1.5), 75, P_DR, [0, 75, 150], [1, 2, 3]),
  caz('ca placa 2: 120 × 80 R10, MDF 12, 12 / 4, urechi 4 × 8 × 2, rampa 10', { latime: 200, inaltime: 150, grosime: 12 },
    { id: 'p', forma: drept(120, 80, 10), x: 40, y: 35, latura: 'exterior' }, 12, 4, u(4, 8, 2), 10, 320 + 26 * PI, [0, 10, 20], [4, 8, 12]),
  caz('supracursa 0,3: 300 × 200 pe foaia 18, 18,3 / 6,1, urechi 4 × 8 × 2, rampa 10', { latime: 400, inaltime: 300, grosime: 18 },
    DR, 18.3, 6.1, u(4, 8, 2), 10, P_DR, [0, 10, 20], [6.1, 12.2, 18.3], 0.3),
];

/** Vârful urechii (ADR 0028 §2), pe hârtie. */
export const varfRampa = (c: { readonly stoc: Stoc; readonly urechi: UrechiO | null }): number => (c.urechi === null ? Infinity : c.stoc.grosime - c.urechi.grosime);

// ---------------------------------------------------------------------------------------------------------------
// Scriitorul, cu propria copie a formulelor, și martorii negativi.

/** Martorii negativi din §6. */
export type MartorRampa = 'plonjare' | 'nerotite' | 'pana' | 'fara-urechi' | 'flanc';

export type TraseuRampa = {
  readonly eticheta: string | null;
  /** Drumul, în sensul de mers, din vârful 0. */
  readonly drum: readonly Primitiva[];
  readonly adancime: number;
  readonly pas: number;
  readonly grosimeFoaie: number;
  readonly urechi: UrechiO | null;
  /** Lungimea rampei; `null` = fără rampă (forma de la §4: plonjare în vârful 0, ridicare între treceri). */
  readonly rampa: number | null;
  readonly martor?: MartorRampa;
  /** Fără rampă: coborârea pe verticală între treceri, fără ridicare (programele scrise de mână dinainte de 2.5a). */
  readonly intre?: 'ridica' | 'coboara';
  /** Abateri mici, pentru toleranțele porții: intrările mutate cu atât (mm, desfășurat, de la a doua încolo). */
  readonly abatereIntrari?: number;
};

const f3 = (v: number): string => {
  const s = v.toFixed(3);
  return s === '-0.000' ? '0.000' : s;
};
const modP = (s: number, P: number): number => ((s % P) + P) % P;

/**
 * Programul complet (antetul ca al aplicației), cu fiecare traseu: eticheta, apoi bucla după §2 (cu rampă) sau §4
 * (fără), apoi ridicarea. Z se scrie doar când se schimbă; pe o bucată care coboară, F = min(1000, 300·L₃ / |ΔZ|).
 */
export function programRampa(trasee: readonly TraseuRampa[], montaj: Montaj): string {
  const M = laMasina(montaj);
  const zSus = M(0, 0, 5)[2];
  const L: string[] = ['(CNC Vector Studio)', 'G90 G17 G21 G94', 'G54', `G0 Z${f3(zSus)}`, 'M3 S18000', 'G4 P3.000'];
  for (const t of trasee) {
    if (t.eticheta !== null) L.push(`(${t.eticheta})`);
    scrieTraseu(L, t, M, zSus);
    L.push(`G0 Z${f3(zSus)}`);
  }
  L.push('M5', 'M30');
  return `${L.join('\n')}\n`;
}

function scrieTraseu(L: string[], t: TraseuRampa, M: ReturnType<typeof laMasina>, zSus: number): void {
  const prim = t.drum.filter((p) => p.tip !== 'punct');
  const lung = prim.map(lungime);
  const cum = lung.reduce<number[]>((a, x) => [...a, a[a.length - 1]! + x], [0]);
  const P = cum[cum.length - 1]!;
  const d = trecerileOperatiei(t.adancime, t.pas);
  const n = d.length;
  // Profilul urechilor (ADR 0028 §3), copia scriitorului.
  const varf = t.urechi === null ? Infinity : t.grosimeFoaie - t.urechi.grosime;
  const S = t.urechi === null ? P : P / t.urechi.numar;
  const W = t.urechi?.latime ?? 0;
  const h = W / 2;
  const l = Math.min(W / 2, 0.45 * (S - W));
  const centre = t.urechi === null ? [] : Array.from({ length: t.urechi.numar }, (_, j) => (j + 0.5) * S);
  if (t.urechi !== null && W > 0.9 * S) throw new Error('urechile nu încap: scriitorul refuză, ca exportul');
  const cuUrechi = (k: number): boolean => t.urechi !== null && d[k]! > varf;
  const fund = (k: number, s: number): number => {
    if (!cuUrechi(k)) return -d[k]!;
    const x = modP(s, P);
    for (const c of centre) {
      const a = Math.abs(x - c);
      if (a <= h) return -varf;
      if (a < h + l) return -varf - ((d[k]! - varf) * (a - h)) / l;
    }
    return -d[k]!;
  };
  const rupturiK = (k: number, a: number, b: number): number[] => {
    if (!cuUrechi(k)) return [];
    const rez: number[] = [];
    for (let m = Math.floor(a / P) - 1; m * P <= b; m++) {
      for (const c of centre) for (const q of [c - h - l, c - h, c + h, c + h + l]) if (m * P + q > a && m * P + q < b) rez.push(m * P + q);
    }
    return rez;
  };

  // Punctele de tăiere ale drumului în plan, pe [a, b]: capetele primitivelor și sferturile arcelor.
  const geometrie = (a: number, b: number): number[] => {
    const rez: number[] = [];
    for (let m = Math.floor(a / P); m * P <= b; m++) {
      prim.forEach((p, i) => {
        const baza = m * P + cum[i]!;
        const q = [baza];
        if (p.tip === 'arc') {
          const bucati = Math.max(1, Math.ceil(Math.abs(p.du) / (PI / 2) - 1e-9));
          for (let j = 1; j < bucati; j++) q.push(baza + (lung[i]! * j) / bucati);
        }
        for (const x of q) if (x > a && x < b) rez.push(x);
      });
    }
    return rez;
  };

  const [x0, y0] = M(startul(prim[0]!).x, startul(prim[0]!).y, 0);
  /** Starea scrisă: Z și F (text), pentru „doar unde se schimbă”. */
  let zScris = '';
  let fScris = '';
  const scrieBucata = (a: number, b: number, za: number, zb: number): void => {
    if (b - a <= 1e-9) return;
    const m = Math.floor(((a + b) / 2) / P);
    const mij = modP((a + b) / 2, P);
    let i = 0;
    while (i + 1 < prim.length && cum[i + 1]! <= mij) i++;
    const p = prim[i]!;
    const la = Math.max(0, Math.min(lung[i]!, a - m * P - cum[i]!)), lb = Math.max(0, Math.min(lung[i]!, b - m * P - cum[i]!));
    const A = punctLa(p, la), B = punctLa(p, lb);
    const [xb, yb, zbm] = M(B.x, B.y, zb);
    const zTxt = f3(zbm) === zScris ? '' : ` Z${f3(zbm)}`;
    zScris = f3(zbm);
    const L3 = Math.hypot(b - a, za - zb);
    const fTxt = (zb < za - 1e-12 ? Math.min(1000, (300 * L3) / (za - zb)) : 1000).toFixed(1);
    const f = fTxt === fScris ? '' : ` F${fTxt}`;
    fScris = fTxt;
    if (p.tip === 'segment' || b - a < 1e-6) {
      L.push(`G1 X${f3(xb)} Y${f3(yb)}${zTxt}${f}`);
    } else if (p.tip === 'arc') {
      const [xa, ya] = M(A.x, A.y, 0);
      const [cx, cy] = M(p.c.x, p.c.y, 0);
      L.push(`${p.du > 0 ? 'G3' : 'G2'} X${f3(xb)} Y${f3(yb)}${zTxt} I${f3(cx - Number(f3(xa)))} J${f3(cy - Number(f3(ya)))}${f}`);
    }
  };
  const vertical = (z: number): void => {
    const zm = M(0, 0, z)[2];
    L.push(`G1 Z${f3(zm)} F300.0`);
    zScris = f3(zm);
    fScris = '300.0';
  };

  if (t.rampa === null) {
    // §4: fiecare trecere, plonjare în vârful 0, bucla la fundul ei, ridicare (sau coborâre pe verticală, martorul vechi).
    d.forEach((dk, k) => {
      if (k === 0) L.push(`G0 X${f3(x0)} Y${f3(y0)}`);
      else if ((t.intre ?? 'ridica') === 'ridica') L.push(`G0 Z${f3(zSus)}`);
      vertical(-dk);
      const taieturi = [0, ...new Set([...geometrie(0, P), ...rupturiK(k, 0, P)])].sort((x, y) => x - y);
      taieturi.push(P);
      for (let j = 0; j + 1 < taieturi.length; j++) scrieBucata(taieturi[j]!, taieturi[j + 1]!, fund(k, taieturi[j]!), fund(k, taieturi[j + 1]!));
    });
    return;
  }

  // §2, cu rampă: intrările, ferestrele trecerilor, Z(σ).
  const Lr = Math.min(t.rampa, P / 2);
  const zone = centre.map((c) => [c - h - l, c + h + l] as const);
  const scoateS = (s: number): number => {
    const x = modP(s, P);
    for (const [a, b] of zone) if (x > a && x < b) return s + (b - x);
    return s;
  };
  const e = [0];
  while (e.length < n) {
    const brut = e[e.length - 1]! + Lr;
    const urm = t.martor === 'nerotite' ? e[e.length - 1]! : t.martor === 'flanc' ? brut : scoateS(brut);
    e.push(urm + (t.abatereIntrari ?? 0));
  }
  const sigma = e.map((x, k) => x + k * P);
  const capat = sigma[n - 1]! + (t.martor === 'pana' ? P : Lr + P);
  const zR = (k: number, s: number): number => -((k === 0 ? 0 : d[k - 1]!) + ((d[k]! - (k === 0 ? 0 : d[k - 1]!)) * (s - sigma[k]!)) / Lr);
  /** Pe rampă: max(zR, zP) (§2); martorii: fundul trecerii (plonjare), doar zR (fără urechi). */
  const peRampa = (k: number, s: number): number => {
    if (t.martor === 'plonjare') return fund(k, s);
    if (t.martor === 'fara-urechi') return zR(k, s);
    return Math.max(zR(k, s), fund(k, s));
  };
  /** Z-ul la dreapta lui s (începutul unei bucăți) și la stânga lui (capătul ei), pe trecerea k. */
  const zDreapta = (k: number, s: number): number => (s < sigma[k]! + Lr - 1e-12 ? peRampa(k, s) : fund(k, s));
  const zStanga = (k: number, s: number): number => (s > sigma[k]! && s <= sigma[k]! + Lr + 1e-12 ? peRampa(k, s) : fund(k, s));

  L.push(`G0 X${f3(x0)} Y${f3(y0)}`);
  // §2.2: prin aer, până la fața de sus, cu avansul de plonjare.
  vertical(0);
  let zAcum = 0;
  for (let k = 0; k < n; k++) {
    const a0 = sigma[k]!, b0 = k + 1 < n ? sigma[k + 1]! : capat;
    const taieturi = new Set<number>([...geometrie(a0, b0), ...rupturiK(k, a0, b0)]);
    if (a0 + Lr < b0) taieturi.add(a0 + Lr);
    // Întâlnirile zR = zP pe rampă (pe fiecare bucată dintre rupturi, zR − zP e liniar).
    const repere = [a0, ...rupturiK(k, a0, Math.min(b0, a0 + Lr)), Math.min(b0, a0 + Lr)].sort((x, y) => x - y);
    for (let j = 0; j + 1 < repere.length; j++) {
      const p = repere[j]!, q = repere[j + 1]!;
      const fp = zR(k, p) - fund(k, p), fq = zR(k, q) - fund(k, q);
      if ((fp > 0 && fq < 0) || (fp < 0 && fq > 0)) taieturi.add(p + ((q - p) * fp) / (fp - fq));
    }
    const lista = [a0, ...[...taieturi].filter((x) => x > a0 && x < b0).sort((x, y) => x - y), b0];
    for (let j = 0; j + 1 < lista.length; j++) {
      const p = lista[j]!, q = lista[j + 1]!;
      // Dacă Z-ul de plecare nu e cel la care a rămas freza (intrarea martorilor), mișcarea pe verticală.
      const zp = zDreapta(k, p);
      if (Math.abs(zp - zAcum) > 1e-9) vertical(zp);
      const zq = zStanga(k, q);
      scrieBucata(p, q, zp, zq);
      zAcum = zq;
    }
  }
}

/** Programul unui caz de hârtie (cu un martor, dacă e dat). */
export function programCazRampa(
  c: CazRampa, montaj: Montaj, o: { readonly martor?: MartorRampa; readonly pornire?: number; readonly abatereIntrari?: number; readonly rampa?: number | null } = {},
): string {
  return programRampa([{
    eticheta: `${c.forma.id}/${c.forma.id}: ${c.forma.forma.tip}, ${c.forma.latura}, ${c.adancime} mm`,
    drum: drumCerut(c.forma, c.diametru, o.pornire ?? 0),
    adancime: c.adancime, pas: c.pas, grosimeFoaie: c.stoc.grosime, urechi: c.urechi, rampa: o.rampa === undefined ? c.lungime : o.rampa,
    ...(o.martor ? { martor: o.martor } : {}), ...(o.abatereIntrari === undefined ? {} : { abatereIntrari: o.abatereIntrari }),
  }], montaj);
}

// ---------------------------------------------------------------------------------------------------------------
// Corpusul pentru lipire: corpusul 2.4 (cu urechi) adus la v6, cu rampe la întâmplare.

export type CazCorpusRampa = Omit<CazCorpusUrechi, 'doc'> & { readonly doc: DocV6O; readonly v5: DocV5O; readonly cuRampa: number };

/**
 * Corpusul 2.4 (`corpusUrechi()`, toate colțurile, ambele Z0, toate laturile, ambele sensuri, urechi care încap) adus la
 * v6. Pe fiecare operație, cu probabilitatea 0,6: o rampă de 10 mm (implicitul dialogului), una între 1 și 60 mm (minimul
 * din precizarea din 10.10), sau
 * 10 000 mm (deci Lr = P/2 pe orice buclă). `v5` e același document fără rampe; `pas` = cel mult `pasMaxim` cazuri
 * (din `pasCaz` în `pasCaz`), ca lipirea să rămână în buget.
 */
export function corpusRampa(samanta = 0x25a0, pasCaz = 1): CazCorpusRampa[] {
  const r = aleator(samanta);
  return corpusUrechi().filter((_, k) => k % pasCaz === 0).map((c) => {
    const v6 = migreazaV5V6O(c.doc);
    let cuRampa = 0;
    for (const p of v6.piese) {
      for (const op of p.operatii) {
        if (r() >= 0.6) continue;
        const x = r();
        op.rampa = { lungime: x < 0.4 ? 10 : x < 0.85 ? Math.round((1 + r() * 59) * 1000) / 1000 : 10_000 };
        cuRampa++;
      }
    }
    return { ...c, doc: v6, v5: c.doc, cuRampa };
  });
}
