/**
 * Cazurile oracolului regiunii păstrate (ADR 0026): documentele de pe hârtie, un scriitor de G-code pentru programele
 * scrise „de mână” (din primitive, rotunjite la 3 zecimale, cu montajul) și corpusul determinist (mulberry32) pentru
 * lipirea cu aplicația. ZERO importuri din `src/`.
 */
import type { DocV3O, LaturaO, MatriceO } from './document.ts';
import { capeteArc, contur, distantaListe, startul, type Contur, type FormaO, type Primitiva } from './regiune.ts';
import type { ColtOrigine } from './poarta.ts';

export const ID: MatriceO = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
export const tr = (e: number, f: number): MatriceO => ({ ...ID, e, f });
/** Oglindirea pe X care ține dreptunghiul [0, w] pe loc: x′ = w − x. */
export const oglinda = (w: number): MatriceO => ({ a: -1, b: 0, c: 0, d: 1, e: w, f: 0 });

export const drept = (latime: number, inaltime: number, razaColt = 0): FormaO => ({ tip: 'dreptunghi', latime, inaltime, razaColt });
export const cerc = (raza: number): FormaO => ({ tip: 'cerc', raza });

export type ElementC = {
  readonly id: string;
  readonly forma: FormaO;
  readonly matrice?: MatriceO;
  /** O operație pe fiecare latură din listă, în ordine (o latură repetată = două operații, de exemplu degroșare + finisare). */
  readonly laturi: readonly LaturaO[];
  readonly adancime?: number;
};
export type PiesaC = { readonly id: string; readonly elemente: readonly ElementC[]; readonly grup?: MatriceO };
export type InstantaC = { readonly id: string; readonly piesa: string; readonly x: number; readonly y: number; readonly rotire?: number };
export type Stoc = { readonly latime: number; readonly inaltime: number; readonly grosime: number };

export const STOC: Stoc = { latime: 300, inaltime: 200, grosime: 18 };

/**
 * Un document v3 (ADR 0025): fiecare piesă are rădăcina un grup `g` cu elementele ei, iar fiecare element primește câte
 * o operație de profil pe fiecare latură cerută, toate cu aceeași sculă (T1, diametrul dat), adâncimea și pasul.
 */
export function documentRegiune(
  stoc: Stoc, piese: readonly PiesaC[], instante: readonly InstantaC[],
  o: { readonly diametru: number; readonly adancime?: number; readonly pas?: number; readonly foaie2?: readonly InstantaC[] },
): DocV3O {
  const scula = { numar: 1, nume: 'freza plata', diametru: o.diametru };
  const pas = o.pas ?? 3;
  return {
    schema: 3,
    rev: 0,
    piese: piese.map((p) => {
      let n = 0;
      return {
        id: p.id,
        radacina: {
          tip: 'grup', id: 'rad', matrice: p.grup ?? ID,
          copii: p.elemente.map((e) => ({ tip: 'element', id: e.id, forma: { ...e.forma }, matrice: e.matrice ?? ID })),
        },
        operatii: p.elemente.flatMap((e) => e.laturi.map((latura) => ({
          id: `op${++n}`, tip: 'profil', noduri: [e.id], scula: { ...scula }, latura, adancime: e.adancime ?? o.adancime ?? 3, pas,
        }))),
      };
    }),
    foi: [
      { id: 'f1', stoc: { ...stoc }, instante: instante.map((i) => ({ id: i.id, piesa: i.piesa, x: i.x, y: i.y, rotire: i.rotire ?? 0 })) },
      ...(o.foaie2 ? [{ id: 'f2', stoc: { ...stoc }, instante: o.foaie2.map((i) => ({ id: i.id, piesa: i.piesa, x: i.x, y: i.y, rotire: i.rotire ?? 0 })) }] : []),
    ],
  };
}

/** Piesa cu un singur element, pusă o dată: `<id>/<id>` în lume, ca formele din v1. */
export function simple(
  stoc: Stoc, forme: ReadonlyArray<{ id: string; forma: FormaO; x: number; y: number; laturi: readonly LaturaO[]; rotire?: number; adancime?: number }>,
  o: { diametru: number; adancime?: number; pas?: number },
): DocV3O {
  return documentRegiune(
    stoc,
    forme.map((f) => ({ id: f.id, elemente: [{ id: f.id, forma: f.forma, laturi: f.laturi, ...(f.adancime === undefined ? {} : { adancime: f.adancime }) }] })),
    forme.map((f) => ({ id: f.id, piesa: f.id, x: f.x, y: f.y, ...(f.rotire === undefined ? {} : { rotire: f.rotire }) })),
    o,
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Programele scrise de mână: din primitive (în document), cu montajul, rotunjite la 3 zecimale ca postul.

export type Montaj = { readonly foaie: Stoc; readonly origine: ColtOrigine; readonly z0: 'sus' | 'jos' };
export type Traseu = {
  /** Textul etichetei fără paranteze (`e1/e1: dreptunghi, exterior, 3 mm`), sau null: fără etichetă. */
  readonly eticheta: string | null;
  readonly primitive: readonly Primitiva[];
  readonly adancime: number;
};

const f3 = (v: number): string => {
  const s = v.toFixed(3);
  return s === '-0.000' ? '0.000' : s;
};

export function laMasina(m: Montaj): (x: number, y: number, z: number) => [number, number, number] {
  const ox = m.origine === 'dreapta-jos' || m.origine === 'dreapta-sus' ? m.foaie.latime : 0;
  const oy = m.origine === 'dreapta-sus' || m.origine === 'stanga-sus' ? m.foaie.inaltime : 0;
  const oz = m.z0 === 'jos' ? m.foaie.grosime : 0;
  return (x, y, z) => [x - ox, y - oy, z + oz];
}

/**
 * Programul complet (antetul aplicației: G90 G17 G21 G94, G54, Z sus, axul pornit, pauza de 3 s), cu fiecare traseu:
 * eticheta, rapida deasupra startului, plonjarea, apoi primitivele (arcele împărțite în bucăți de cel mult 90°).
 * Liniile `extra` se pun după antet, înaintea traseelor (pentru otrăvuri: o tăiere fără etichetă).
 */
export function programDinTrasee(trasee: readonly Traseu[], montaj: Montaj, extra: readonly string[] = []): string {
  const M = laMasina(montaj);
  const zSus = M(0, 0, 5)[2];
  const L: string[] = ['(CNC Vector Studio)', 'G90 G17 G21 G94', 'G54', `G0 Z${f3(zSus)}`, 'M3 S18000', 'G4 P3.000', ...extra];
  for (const t of trasee) {
    if (t.eticheta !== null) L.push(`(${t.eticheta})`);
    const s = startul(t.primitive[0]!);
    const [x0, y0, zj] = M(s.x, s.y, -t.adancime);
    L.push(`G0 X${f3(x0)} Y${f3(y0)}`, `G1 Z${f3(zj)} F300.0`);
    let cur = s;
    for (const p of t.primitive) {
      if (p.tip === 'punct') continue;
      const st = startul(p);
      if (Math.hypot(st.x - cur.x, st.y - cur.y) > 1e-9) {
        const [x, y] = M(st.x, st.y, 0);
        L.push(`G1 X${f3(x)} Y${f3(y)} F1000.0`);
      }
      if (p.tip === 'segment') {
        const [x, y] = M(p.b.x, p.b.y, 0);
        L.push(`G1 X${f3(x)} Y${f3(y)} F1000.0`);
        cur = p.b;
        continue;
      }
      const n = Math.max(1, Math.ceil(Math.abs(p.du) / (Math.PI / 2) - 1e-9));
      for (let k = 0; k < n; k++) {
        const ua = p.u0 + (p.du * k) / n, ub = p.u0 + (p.du * (k + 1)) / n;
        const a = { x: p.c.x + p.r * Math.cos(ua), y: p.c.y + p.r * Math.sin(ua) };
        const b = k === n - 1 ? capeteArc(p)[1] : { x: p.c.x + p.r * Math.cos(ub), y: p.c.y + p.r * Math.sin(ub) };
        const [xa, ya] = M(a.x, a.y, 0);
        const [xb, yb] = M(b.x, b.y, 0);
        const [cx, cy] = M(p.c.x, p.c.y, 0);
        // I/J din startul rotunjit, ca postul (T9).
        const i = cx - Number(f3(xa)), j = cy - Number(f3(ya));
        L.push(`${p.du > 0 ? 'G3' : 'G2'} X${f3(xb)} Y${f3(yb)} I${f3(i)} J${f3(j)} F1000.0`);
        cur = b;
      }
    }
    L.push(`G0 Z${f3(zSus)}`);
  }
  L.push('M5', 'M30');
  return `${L.join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------------------------
// Placa 1, pe hârtie: dreptunghiul 100 × 60 la (20, 20), exterior; cercul R15 la (70, 50), interior; freza Ø6.

export const PLACA_1 = (diametru = 6): DocV3O => simple(STOC, [
  { id: 'e1', forma: drept(100, 60), x: 20, y: 20, laturi: ['exterior'] },
  { id: 'e2', forma: cerc(15), x: 70, y: 50, laturi: ['interior'], adancime: 8 },
], { diametru, pas: 4 });

// ---------------------------------------------------------------------------------------------------------------
// Corpusul pentru lipire: perechi de piese la distanțe în jurul diametrului, găuri lângă margini, imbricări, rotiri și
// oglindiri, instanțe repetate, atingeri, `pe-linie`, toate colțurile de origine. Determinist.

/** mulberry32: determinist, pe 32 de biți. */
export function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type CazCorpus = {
  readonly nume: string;
  readonly familie: string;
  readonly doc: DocV3O;
  readonly diametru: number;
  readonly origine: ColtOrigine;
  readonly z0: 'sus' | 'jos';
};

const COLTURI: readonly ColtOrigine[] = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'];
const DIAMETRE = [3.175, 6, 8] as const;
/** Abaterile de la prag: sub ε (prinse), în bandă, exact pe prag, peste. */
const ABATERI = [-2, -0.5, -0.05, -0.0062, -0.0038, 0, 0.0004, 0.3, 1.5] as const;

const alege = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const rot = (u: number, x: number, y: number): [number, number] => {
  const c = Math.cos((u * Math.PI) / 180), s = Math.sin((u * Math.PI) / 180);
  return [c * x - s * y, s * x + c * y];
};

/** Unde trebuie pusă instanța ca dreptunghiul [0, w] × [0, h], rotit cu un multiplu de 90°, să înceapă în (X, Y). */
function laColt(rotire: number, w: number, h: number, X: number, Y: number): { x: number; y: number } {
  const min = rotire === 0 ? [0, 0] : rotire === 90 ? [-h, 0] : rotire === 180 ? [-w, -h] : [0, -w];
  return { x: X - min[0]!, y: Y - min[1]! };
}

export function corpus(samanta = 0x2a3a): CazCorpus[] {
  const r = aleator(samanta);
  const rez: CazCorpus[] = [];
  let k = 0;
  const adauga = (familie: string, nume: string, doc: DocV3O, diametru: number): void => {
    const origine = COLTURI[k % 4]!;
    const z0 = Math.floor(k / 4) % 2 === 0 ? 'sus' : 'jos';
    k++;
    rez.push({ familie, nume, doc, diametru, origine, z0 });
  };

  // A. Perechi de piese, la distanța D + abatere, pe o direcție rotită (dreptunghiuri, cercuri, amestecate).
  for (let n = 0; n < 72; n++) {
    const D = alege(r, DIAMETRE);
    const abatere = ABATERI[n % ABATERI.length]!;
    const g = D + abatere;
    const fel = alege(r, ['dd', 'dc', 'cc', 'dd'] as const);
    const unghi = alege(r, [0, 90, 180, 270, 30, 45, 117.5] as const);
    const w1 = 30 + Math.round(r() * 40), h1 = 25 + Math.round(r() * 30);
    const rc1 = alege(r, [0, 0, 3, 8] as const);
    const x0 = 120, y0 = 70;
    if (fel === 'dd') {
      const w2 = 20 + Math.round(r() * 30), h2 = 20 + Math.round(r() * 30), rc2 = alege(r, [0, 2] as const);
      // B lângă latura din dreapta a lui A (în cadrul rotit), suprapuse pe Y: distanța dintre laturi e g.
      const yo = Math.round((r() - 0.5) * 10);
      const [dx, dy] = rot(unghi, w1 + g, yo);
      const oglindit = r() < 0.3;
      const doc = documentRegiune(STOC, [
        { id: 'a', elemente: [{ id: 'e', forma: drept(w1, h1, rc1), laturi: ['exterior'] }], ...(oglindit ? { grup: oglinda(w1) } : {}) },
        { id: 'b', elemente: [{ id: 'e', forma: drept(w2, h2, rc2), laturi: ['exterior'] }] },
      ], [
        { id: 'A', piesa: 'a', x: x0, y: y0, rotire: unghi },
        { id: 'B', piesa: 'b', x: x0 + dx, y: y0 + dy, rotire: unghi },
      ], { diametru: D });
      adauga('perechi', `dd ${w1}x${h1}r${rc1} | ${w2}x${h2}r${rc2} g=D${abatere >= 0 ? '+' : ''}${abatere} D${D} ${unghi}°${oglindit ? ' oglindit' : ''}`, doc, D);
    } else if (fel === 'dc') {
      const raza = 8 + Math.round(r() * 15);
      const yc = Math.round(h1 * (0.2 + 0.6 * r()));
      const [dx, dy] = rot(unghi, w1 + g + raza, yc);
      const doc = documentRegiune(STOC, [
        { id: 'a', elemente: [{ id: 'e', forma: drept(w1, h1, rc1), laturi: ['exterior'] }] },
        { id: 'b', elemente: [{ id: 'e', forma: cerc(raza), laturi: ['exterior'] }] },
      ], [
        { id: 'A', piesa: 'a', x: x0, y: y0, rotire: unghi },
        { id: 'B', piesa: 'b', x: x0 + dx, y: y0 + dy },
      ], { diametru: D });
      adauga('perechi', `dc ${w1}x${h1}r${rc1} | R${raza} g=D${abatere >= 0 ? '+' : ''}${abatere} D${D} ${unghi}°`, doc, D);
    } else {
      const r1 = 10 + Math.round(r() * 20), r2 = 8 + Math.round(r() * 15);
      const [dx, dy] = rot(unghi, r1 + r2 + g, 0);
      const doc = simple(STOC, [
        { id: 'a', forma: cerc(r1), x: 120, y: 100, laturi: ['exterior'] },
        { id: 'b', forma: cerc(r2), x: 120 + dx, y: 100 + dy, laturi: ['exterior'] },
      ], { diametru: D });
      adauga('perechi', `cc R${r1} | R${r2} g=D${abatere >= 0 ? '+' : ''}${abatere} D${D} ${unghi}°`, doc, D);
    }
  }

  // B. Găuri lângă marginea piesei (în piesă și în schelet), la distanțe în jurul atingerii; găuri apropiate între ele.
  const DELTE_GAURA = [-1, 0, 4e-7, 3e-6, 0.3, 2] as const;
  for (let n = 0; n < 24; n++) {
    const D = alege(r, DIAMETRE);
    const delta = DELTE_GAURA[n % DELTE_GAURA.length]!;
    const raza = D / 2 + 4 + Math.round(r() * 8);
    const w = 90, h = 60, x = 60, y = 50;
    const inPiesa = n % 2 === 0;
    // Gaura lângă latura din dreapta: înăuntru (marginea la delta de latură) sau în schelet (în afară, la delta).
    const cx = inPiesa ? x + w - delta - raza : x + w + delta + raza;
    const doc = simple(STOC, [
      { id: 'p', forma: drept(w, h, alege(r, [0, 4] as const)), x, y, laturi: ['exterior'] },
      { id: 'g', forma: cerc(raza), x: cx, y: y + h / 2, laturi: ['interior'] },
    ], { diametru: D });
    adauga('gauri', `gaură R${raza} ${inPiesa ? 'în piesă' : 'în schelet'} la ${delta} de margine, D${D}`, doc, D);
  }
  for (const delta of [-0.5, 0, 5e-7, 2e-6, 0.4] as const) {
    const D = 6;
    const doc = simple(STOC, [
      { id: 'g1', forma: cerc(12), x: 100, y: 100, laturi: ['interior'] },
      { id: 'g2', forma: cerc(9), x: 100 + 21 + delta, y: 100, laturi: ['interior'] },
    ], { diametru: D });
    adauga('gauri', `două găuri în schelet la ${delta}`, doc, D);
  }

  // C. Imbricări: insula în gaură (distanța 2R + abatere), piesa în piesă, gaura în gaură, insula în gaura din schelet.
  for (let n = 0; n < 36; n++) {
    const D = alege(r, DIAMETRE);
    const R = D / 2;
    const abatere = ABATERI[n % ABATERI.length]!;
    const fel = n % 4;
    const cx = 150, cy = 100;
    if (fel === 0 || fel === 3) {
      // Piesa mare (sau nimic: insula în gaura din schelet), gaura, insula.
      const rg = 30 + Math.round(r() * 15);
      const ri = rg - (2 * R + abatere);
      const gauraDreapta = r() < 0.5;
      const piese: PiesaC[] = [{
        id: 'p',
        elemente: [
          ...(fel === 0 ? [{ id: 'mare', forma: drept(240, 170, 10), matrice: tr(-120, -85), laturi: ['exterior'] as LaturaO[] }] : []),
          gauraDreapta
            ? { id: 'gaura', forma: drept(2 * rg, 2 * rg, 6), matrice: tr(-rg, -rg), laturi: ['interior'] as LaturaO[] }
            : { id: 'gaura', forma: cerc(rg), laturi: ['interior'] as LaturaO[] },
          gauraDreapta
            ? { id: 'insula', forma: drept(2 * ri, 2 * ri, Math.max(0, 6 - 2 * R - abatere)), matrice: tr(-ri, -ri), laturi: ['exterior'] as LaturaO[] }
            : { id: 'insula', forma: cerc(ri), laturi: ['exterior'] as LaturaO[] },
        ],
        ...(r() < 0.3 ? { grup: { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 } } : {}),
      }];
      const doc = documentRegiune(STOC, piese, [{ id: 'I', piesa: 'p', x: cx, y: cy, rotire: alege(r, [0, 90, 33] as const) }], { diametru: D });
      adauga('imbricate', `${fel === 0 ? 'piesă ⊃ ' : ''}gaură ⊃ insulă, distanța 2R${abatere >= 0 ? '+' : ''}${abatere}, ${gauraDreapta ? 'dreptunghiuri' : 'cercuri'} D${D}`, doc, D);
    } else if (fel === 1) {
      // Piesa în piesă, fără gol: refuz oricât de departe ar fi.
      const doc = simple(STOC, [
        { id: 'mare', forma: drept(160, 120, 5), x: 60, y: 40, laturi: ['exterior'] },
        { id: 'mica', forma: alege(r, [cerc(15), drept(40, 25, 3)] as const), x: 110 + abatere, y: 80, laturi: ['exterior'] },
      ], { diametru: D });
      adauga('imbricate', `piesă în piesă, D${D}`, doc, D);
    } else {
      // Gaura în gaură (în piesă): deșeu în deșeu, trece dacă inelele nu se ating.
      const doc = simple(STOC, [
        { id: 'mare', forma: drept(160, 120, 5), x: 60, y: 40, laturi: ['exterior'] },
        { id: 'g1', forma: cerc(40), x: 140, y: 100, laturi: ['interior'] },
        { id: 'g2', forma: cerc(20), x: 140 + 20 - 0.5, y: 100, laturi: ['interior'] },
      ], { diametru: D });
      adauga('imbricate', `gaură în gaură, D${D}`, doc, D);
    }
  }

  // D. Instanțe repetate ale piesei plăcii 1 (dreptunghi + gaură), pe un rând, cu distanța D + abatere între ele;
  // rotiri cu multipli de 90° și oglindiri.
  for (let n = 0; n < 27; n++) {
    const D = alege(r, DIAMETRE);
    const abatere = ABATERI[n % ABATERI.length]!;
    const w = 50, h = 34;
    const oglindit = n % 3 === 1;
    const piesa: PiesaC = {
      id: 'p',
      elemente: [
        { id: 'rama', forma: drept(w, h, alege(r, [0, 4] as const)), laturi: ['exterior'] },
        { id: 'gaura', forma: cerc(7), matrice: tr(15, 17), laturi: ['interior'], adancime: 6 },
      ],
      ...(oglindit ? { grup: oglinda(w) } : {}),
    };
    const nr = 2 + (n % 3);
    const instante: InstantaC[] = [];
    let X = 20;
    for (let i = 0; i < nr; i++) {
      const rotire = alege(r, [0, 90, 180, 270] as const);
      const lx = rotire === 90 || rotire === 270 ? h : w;
      instante.push({ id: `i${i}`, piesa: 'p', ...laColt(rotire, w, h, X, 60 + (i % 2) * 7), rotire });
      X += lx + D + abatere;
    }
    const doc = documentRegiune(STOC, [piesa], instante, { diametru: D });
    adauga('instante', `${nr} instanțe la D${abatere >= 0 ? '+' : ''}${abatere}, D${D}${oglindit ? ' oglindite' : ''}`, doc, D);
  }
  // Două instanțe rotite cu 45°, pe direcția rotită.
  for (const abatere of [-0.4, -0.0062, 0, 0.5] as const) {
    const D = 6;
    const [dx, dy] = rot(45, 60 + D + abatere, 0);
    const doc = documentRegiune(STOC, [{ id: 'p', elemente: [{ id: 'e', forma: drept(60, 30, 5), laturi: ['exterior'] }] }], [
      { id: 'i1', piesa: 'p', x: 80, y: 40, rotire: 45 },
      { id: 'i2', piesa: 'p', x: 80 + dx, y: 40 + dy, rotire: 45 },
    ], { diametru: D });
    adauga('instante', `două instanțe la 45°, D${abatere >= 0 ? '+' : ''}${abatere}`, doc, D);
  }

  // E. Atingeri și laturi: instanțe suprapuse, cercuri tangente, dreptunghiuri care se taie, element cu ambele laturi,
  // un element cu două operații pe aceeași latură (un singur inel).
  {
    const D = 6;
    const p1: PiesaC = { id: 'p', elemente: [{ id: 'e', forma: drept(50, 30, 4), laturi: ['exterior'] }] };
    adauga('atingeri', 'aceeași piesă de două ori în același loc', documentRegiune(STOC, [p1], [
      { id: 'i1', piesa: 'p', x: 50, y: 50 }, { id: 'i2', piesa: 'p', x: 50, y: 50 },
    ], { diametru: D }), D);
    adauga('atingeri', 'cercuri piese tangente', simple(STOC, [
      { id: 'a', forma: cerc(20), x: 80, y: 100, laturi: ['exterior'] }, { id: 'b', forma: cerc(10), x: 110, y: 100, laturi: ['exterior'] },
    ], { diametru: D }), D);
    adauga('atingeri', 'dreptunghiuri care se taie', simple(STOC, [
      { id: 'a', forma: drept(60, 40), x: 40, y: 40, laturi: ['exterior'] }, { id: 'b', forma: drept(60, 40), x: 80, y: 60, laturi: ['exterior'] },
    ], { diametru: D }), D);
    adauga('atingeri', 'gaura care taie latura piesei', simple(STOC, [
      { id: 'a', forma: drept(80, 50), x: 40, y: 40, laturi: ['exterior'] }, { id: 'b', forma: cerc(10), x: 118, y: 65, laturi: ['interior'] },
    ], { diametru: D }), D);
    adauga('atingeri', 'element cu ambele laturi', simple(STOC, [
      { id: 'a', forma: drept(80, 50), x: 40, y: 40, laturi: ['exterior', 'interior'] },
    ], { diametru: D }), D);
    adauga('atingeri', 'două operații exterior pe același element (degroșare + finisare)', simple(STOC, [
      { id: 'a', forma: drept(80, 50, 6), x: 40, y: 40, laturi: ['exterior', 'exterior'] },
      { id: 'b', forma: cerc(12), x: 80, y: 65, laturi: ['interior', 'interior'], adancime: 6 },
    ], { diametru: D }), D);
    adauga('atingeri', 'gaura concentrică cu insula, raze egale (coincid)', simple(STOC, [
      { id: 'a', forma: cerc(20), x: 100, y: 100, laturi: ['interior'] }, { id: 'b', forma: cerc(20), x: 100, y: 100, laturi: ['exterior'] },
    ], { diametru: D }), D);
  }

  // F. `pe-linie`: nu e inel și nu se judecă, oricât ar intra în piese.
  for (const D of DIAMETRE) {
    adauga('pe-linie', `gravură pe-linie peste o piesă, D${D}`, simple(STOC, [
      { id: 'p', forma: drept(100, 60, 5), x: 40, y: 40, laturi: ['exterior'] },
      { id: 'grav', forma: cerc(25), x: 90, y: 70, laturi: ['pe-linie'], adancime: 1 },
      { id: 'canal', forma: drept(150, 10), x: 20, y: 65, laturi: ['pe-linie'], adancime: 1 },
    ], { diametru: D, adancime: 3 }), D);
    adauga('pe-linie', `pe-linie și exterior pe același element, lângă altă piesă la D + 1, D${D}`, simple(STOC, [
      { id: 'a', forma: drept(60, 40), x: 40, y: 40, laturi: ['pe-linie', 'exterior'] },
      { id: 'b', forma: drept(60, 40), x: 100 + D + 1, y: 40, laturi: ['exterior'] },
    ], { diametru: D }), D);
  }

  // G. Doar foaia 0: pe foaia a doua, aceleași piese suprapuse nu contează.
  {
    const D = 6;
    const piese: PiesaC[] = [{ id: 'p', elemente: [{ id: 'e', forma: drept(50, 30), laturi: ['exterior'] }] }];
    adauga('foi', 'foaia 2 are instanțe suprapuse', documentRegiune(STOC, piese, [{ id: 'i1', piesa: 'p', x: 50, y: 50 }], {
      diametru: D, foaie2: [{ id: 'j1', piesa: 'p', x: 50, y: 50 }, { id: 'j2', piesa: 'p', x: 60, y: 50 }],
    }), D);
  }

  // H. Lângă marginea foii (cere confirmarea ieșirii), cu o pereche prea apropiată sau curată.
  for (const abatere of [-1, 0.5] as const) {
    const D = 6;
    adauga('margine', `pereche lângă marginea stângă, D${abatere >= 0 ? '+' : ''}${abatere}`, simple(STOC, [
      { id: 'a', forma: drept(40, 30), x: 1, y: 60, laturi: ['exterior'] },
      { id: 'b', forma: drept(40, 30), x: 41 + D + abatere, y: 60, laturi: ['exterior'] },
    ], { diametru: D }), D);
  }
  // I. Colț la colț: B pe diagonala lui A (cele mai apropiate puncte sunt colțurile, ascuțite sau rotunjite), la
  // distanța D + abatere între colțuri, pe o direcție rotită; plus cerc lângă colțul unui dreptunghi.
  for (let n = 0; n < 27; n++) {
    const D = alege(r, DIAMETRE);
    const abatere = ABATERI[n % ABATERI.length]!;
    const unghi = alege(r, [0, 90, 22.5, 60, 200] as const);
    const rcA = alege(r, [0, 5, 12] as const), rcB = alege(r, [0, 3, 9] as const);
    const w = 50, h = 35;
    // Colțul (w, h) al lui A și colțul (0, 0) al lui B, rotunjite cu rcA și rcB: centrele colțurilor sunt la
    // (w − rcA, h − rcA) și (rcB, rcB) față de originile lor; distanța dintre arce = |centre| − rcA − rcB. Pun centrele pe
    // diagonala de 45° la distanța g + rcA + rcB.
    const g = D + abatere;
    const k = (g + rcA + rcB) / Math.SQRT2;
    const bx = w - rcA + k - rcB, by = h - rcA + k - rcB;
    if (n % 3 === 2) {
      const raza = 10 + Math.round(r() * 10);
      const kc = (g + rcA + raza) / Math.SQRT2;
      const [dx, dy] = rot(unghi, w - rcA + kc, h - rcA + kc);
      adauga('colturi', `cerc R${raza} la colțul r${rcA}, g=D${abatere >= 0 ? '+' : ''}${abatere} D${D} ${unghi}°`, documentRegiune(STOC, [
        { id: 'a', elemente: [{ id: 'e', forma: drept(w, h, rcA), laturi: ['exterior'] }] },
        { id: 'b', elemente: [{ id: 'e', forma: cerc(raza), laturi: ['exterior'] }] },
      ], [{ id: 'A', piesa: 'a', x: 90, y: 50, rotire: unghi }, { id: 'B', piesa: 'b', x: 90 + dx, y: 50 + dy }], { diametru: D }), D);
      continue;
    }
    const [dx, dy] = rot(unghi, bx, by);
    adauga('colturi', `colț r${rcA} la colț r${rcB}, g=D${abatere >= 0 ? '+' : ''}${abatere} D${D} ${unghi}°`, documentRegiune(STOC, [
      { id: 'a', elemente: [{ id: 'e', forma: drept(w, h, rcA), laturi: ['exterior'] }] },
      { id: 'b', elemente: [{ id: 'e', forma: drept(40, 30, rcB), laturi: ['exterior'] }] },
    ], [{ id: 'A', piesa: 'a', x: 90, y: 50, rotire: unghi }, { id: 'B', piesa: 'b', x: 90 + dx, y: 50 + dy, rotire: unghi }], { diametru: D }), D);
  }

  // J. Dreptunghiuri ascuțite sub matrici afine (scalare neuniformă, forfecare): paralelograme la distanța D + abatere,
  // una deasupra celeilalte, a doua cu o gaură (paralelogram) înăuntru.
  for (let n = 0; n < 18; n++) {
    const D = alege(r, DIAMETRE);
    const abatere = ABATERI[n % ABATERI.length]!;
    const fel = n % 3;
    // Forfecarea x′ = x + t·y păstrează laturile orizontale; scalarea (sx, sy) le păstrează paralele cu axele.
    const t = fel === 0 ? 0.5 : fel === 1 ? -0.3 : 0;
    const sx = fel === 2 ? 1.6 : 1, sy = fel === 2 ? 0.7 : 1;
    const M = { a: sx, b: 0, c: t * sy, d: sy, e: 0, f: 0 };
    const w = 40, h = 30;
    const g = D + abatere;
    const doc = documentRegiune(STOC, [
      { id: 'a', elemente: [{ id: 'e', forma: drept(w, h), matrice: M, laturi: ['exterior'] }] },
      {
        id: 'b',
        elemente: [
          { id: 'e', forma: drept(w, h), matrice: M, laturi: ['exterior'] },
          { id: 'gaura', forma: drept(14, 12), matrice: { ...M, e: 12 * sx + 9 * t * sy, f: 9 * sy }, laturi: ['interior'] },
        ],
      },
    ], [{ id: 'A', piesa: 'a', x: 80, y: 40 }, { id: 'B', piesa: 'b', x: 80 + (n % 2 === 0 ? 0 : 15), y: 40 + sy * h + g }], { diametru: D });
    adauga('afine', `paralelograme ${fel === 0 ? 'forfecate +0.5' : fel === 1 ? 'forfecate −0.3' : 'scalate 1.6 × 0.7'}, g=D${abatere >= 0 ? '+' : ''}${abatere} D${D}`, doc, D);
  }

  // K. Imbricare adâncă: piesă ⊃ gaură ⊃ piesă ⊃ gaură ⊃ piesă (cercuri concentrice sau dreptunghiuri centrate), cu pasul
  // dintre niveluri în jurul lui 2R pe un nivel ales la întâmplare.
  for (let n = 0; n < 18; n++) {
    const D = alege(r, DIAMETRE);
    const R = D / 2;
    const abatere = ABATERI[n % ABATERI.length]!;
    const strans = Math.floor(r() * 4);
    const raze: number[] = [];
    let raza = 90;
    for (let nivel = 0; nivel < 5; nivel++) {
      raze.push(raza);
      raza -= nivel === strans ? 2 * R + abatere : 2 * R + 4 + Math.round(r() * 6);
    }
    const dreptunghiuri = n % 2 === 1;
    const elemente = raze.map((rz, nivel) => ({
      id: `n${nivel}`,
      forma: dreptunghiuri ? drept(2 * rz, 1.4 * rz, Math.min(6, rz * 0.3)) : cerc(rz),
      ...(dreptunghiuri ? { matrice: tr(-rz, -0.7 * rz) } : {}),
      laturi: [nivel % 2 === 0 ? 'exterior' : 'interior'] as LaturaO[],
    }));
    const doc = documentRegiune(STOC, [{ id: 'p', elemente }], [{ id: 'I', piesa: 'p', x: 150, y: 100, rotire: alege(r, [0, 45, 90] as const) }], { diametru: D });
    adauga('adanci', `5 niveluri ${dreptunghiuri ? 'dreptunghiuri' : 'cercuri'}, nivelul ${strans} la 2R${abatere >= 0 ? '+' : ''}${abatere}, D${D}`, doc, D);
  }

  // L. Găuri apropiate în aceeași piesă (deșeu lângă deșeu: doar atingerea refuză), și `pe-linie` peste un inel.
  for (const delta of [-0.3, 0, 5e-7, 2e-6, 0.01, 0.5] as const) {
    const D = 6;
    adauga('gauri', `două găuri în aceeași piesă la ${delta}`, simple(STOC, [
      { id: 'p', forma: drept(120, 80, 5), x: 40, y: 40, laturi: ['exterior'] },
      { id: 'g1', forma: cerc(15), x: 80, y: 80, laturi: ['interior'] },
      { id: 'g2', forma: drept(20, 30, 4), x: 95 + delta, y: 65, laturi: ['interior'] },
    ], { diametru: D }), D);
  }
  adauga('pe-linie', 'pe-linie exact pe conturul unei piese', simple(STOC, [
    { id: 'p', forma: drept(80, 50, 6), x: 40, y: 40, laturi: ['exterior'] },
    { id: 'l', forma: drept(80, 50, 6), x: 40, y: 40, laturi: ['pe-linie'], adancime: 1 },
  ], { diametru: 6 }), 6);

  // M. Așezări aleatoare: 3–6 forme (dreptunghiuri rotunjite sau nu, cercuri), rotite, cu laturi la întâmplare; fiecare
  // formă nouă e pusă la o distanță în jurul lui D … 2D de cea mai apropiată (cazurile grele), mai rar departe, rar oriunde.
  for (let n = 0; n < 70; n++) {
    const D = alege(r, DIAMETRE);
    const forme: Array<{ id: string; forma: FormaO; x: number; y: number; rotire: number; laturi: LaturaO[]; c: Contur }> = [];
    const tinta = 3 + Math.floor(r() * 4);
    for (let incercare = 0; forme.length < tinta && incercare < 600; incercare++) {
      const forma = r() < 0.6
        ? drept(15 + Math.round(r() * 60), 15 + Math.round(r() * 45), alege(r, [0, 0, 2, 6] as const))
        : cerc(6 + Math.round(r() * 25));
      const rotire = alege(r, [0, 0, 90, 30, 75, 160] as const);
      const x = 20 + r() * 240, y = 20 + r() * 150;
      const rad = (rotire * Math.PI) / 180;
      const c = contur(forma, { a: Math.cos(rad), b: Math.sin(rad), c: -Math.sin(rad), d: Math.cos(rad), e: x, f: y });
      if (c.cutie.minX < 5 || c.cutie.maxX > 295 || c.cutie.minY < 5 || c.cutie.maxY > 195) continue;
      const d = forme.length ? Math.min(...forme.map((f) => distantaListe(c.primitive, f.c.primitive))) : Infinity;
      const greu = d >= D - 2 && d <= 2 * D + 0.5;
      if (!((d >= 2 * D + 1 && r() < 0.25) || greu || r() < 0.03)) continue;
      forme.push({ id: `f${forme.length}`, forma, x, y, rotire, laturi: [r() < 0.62 ? 'exterior' : 'interior'], c });
    }
    const doc = documentRegiune(STOC, forme.map((f) => ({ id: f.id, elemente: [{ id: 'e', forma: f.forma, laturi: f.laturi }] })),
      forme.map((f) => ({ id: f.id.toUpperCase(), piesa: f.id, x: f.x, y: f.y, rotire: f.rotire })), { diametru: D });
    adauga('aleator', `${forme.length} forme, D${D}, #${n}`, doc, D);
  }
  // N. Pragul: perechea axată la distanța D − p, cu p de o parte și de alta a lui ε (pătrunderea pe traseul ideal e p;
  // la p = ε exact, „la limită”).
  for (const D of [6, 3.175] as const) {
    for (const p of [1e-5, 0.001, 0.0045, 0.0049, 0.005, 0.0051, 0.0055] as const) {
      adauga('prag', `pereche la D − ${p}, D${D}`, simple(STOC, [
        { id: 'a', forma: drept(50, 40), x: 30, y: 30, laturi: ['exterior'] },
        { id: 'b', forma: drept(50, 40), x: 80 + D - p, y: 35, laturi: ['exterior'] },
      ], { diametru: D }), D);
    }
  }
  return rez;
}
