/**
 * Corpusul CAM-ului pe căi (ADR 0034 §6 / §9; felia 2.7b, sesiune independentă, scris doar din ADR), cu ZERO importuri
 * din `src/`. Documente v9 cu căi din linii, arce (`bulge`) și cubice, scrise de mână (formele mele, nu ale altei
 * sesiuni): o inimă (cubice, un vârf convex și o scobitură concavă), o cale amestecată (L, A, C), un L cu o latură curbă
 * (un colț concav L–L), o cruce (8 colțuri convexe L–L pentru o gaură), litera O (contur și contraformă, în aceeași
 * piesă), un O din pătratice (aduse exact la cubice), un val de 244 mm (o cubică lungă), o cubică cu vârf (cusp).
 * Pe fiecare: `exterior` / `interior` / `pe-linie`, cu urechi, rampă, intrări, degajări (dog-bone, T-bone), sub
 * similitudini oglindite și rotite și (fără arce) sub o forfecare, freze Ø3,175 / Ø6 / Ø8, toate colțurile de origine
 * și ambele Z0. Plus o gaură-cale într-o piesă-cale și trei perechi care se ating (regiunea trebuie să le refuze).
 *
 * Așteptările scrise de mână, pe fiecare caz: câte colțuri de degajat are fiecare tăietură (ADR 0032 §2 pe o cale: doar
 * L–L, pe partea deșeului) și, la perechile care se ating, elementele atingerii.
 */
import { migreazaV4V8O, type ColturiO, type DocV9O, type IntrariO, type LaturaO, type MatriceO, type RampaO, type SensO, type UrechiO } from './document.ts';
import { documentRegiune, ID, type Montaj, type Stoc } from './regiune.cazuri.ts';
import type { FormaO, VarfCale } from './regiune.ts';

type P = { readonly x: number; readonly y: number };
const p = (x: number, y: number): P => ({ x, y });

/** Constructorii vârfurilor (coordonatele elementului): segmentul pleacă din vârf spre următorul. */
export const vL = (x: number, y: number): VarfCale => ({ p: p(x, y), s: { tip: 'L' } });
export const vA = (x: number, y: number, bulge: number): VarfCale => ({ p: p(x, y), s: { tip: 'A', bulge } });
export const vC = (x: number, y: number, c1x: number, c1y: number, c2x: number, c2y: number): VarfCale => ({ p: p(x, y), s: { tip: 'C', c1: p(c1x, c1y), c2: p(c2x, c2y) } });
export const cale = (varfuri: readonly VarfCale[]): FormaO => ({ tip: 'cale', inchis: true, varfuri });

/**
 * O cale dintr-un text în stilul SVG (M, L, C, Q, Z; coordonate absolute, cu Y în sus), scalată și mutată. Q devine
 * cubica ei exactă (c1 = p₀ + ⅔(q − p₀), c2 = p₁ + ⅔(q − p₁)). Textul se închide singur (ultimul punct = primul).
 */
export function caleDin(d: string, s = 1, dx = 0, dy = 0): FormaO {
  const tok = d.trim().split(/[\s,]+/);
  const varfuri: VarfCale[] = [];
  let i = 0, cmd = '';
  let cur = p(0, 0), start = p(0, 0);
  const num = (): number => { const v = Number(tok[i++]); if (!Number.isFinite(v)) throw new Error(`caleDin: ${d}`); return v; };
  const pt = (): P => { const x = num(), y = num(); return p(x * s + dx, y * s + dy); };
  while (i < tok.length) {
    const t = tok[i]!;
    if (/^[MLCQZ]$/.test(t)) { cmd = t; i++; if (cmd === 'Z') continue; }
    if (cmd === 'M') { cur = pt(); start = cur; cmd = 'L'; continue; }
    if (cmd === 'L') { const b = pt(); varfuri.push({ p: cur, s: { tip: 'L' } }); cur = b; continue; }
    if (cmd === 'C') { const c1 = pt(), c2 = pt(), b = pt(); varfuri.push({ p: cur, s: { tip: 'C', c1, c2 } }); cur = b; continue; }
    if (cmd === 'Q') {
      const q = pt(), b = pt();
      varfuri.push({ p: cur, s: { tip: 'C', c1: p(cur.x + (2 / 3) * (q.x - cur.x), cur.y + (2 / 3) * (q.y - cur.y)), c2: p(b.x + (2 / 3) * (q.x - b.x), b.y + (2 / 3) * (q.y - b.y)) } });
      cur = b;
      continue;
    }
    throw new Error(`caleDin: ${t}`);
  }
  if (cur.x !== start.x || cur.y !== start.y) varfuri.push({ p: cur, s: { tip: 'L' } });
  return cale(varfuri);
}

// ---------------------------------------------------------------------------------------------------------------
// Formele (coordonate locale, mm).

/** Inima: vârful convex jos în (0, −40), scobitura concavă sus în (0, 30); doar cubice; sensul orar. 90 × ~82. */
export const INIMA_D = 'M 0 -40 C -10 -25 -45 -5 -45 15 C -45 40 -10 45 0 30 C 10 45 45 40 45 15 C 45 -5 10 -25 0 -40 Z';
/** Calea amestecată: linie, arc (bulge 0,4, spre exterior), cubică, linie; colțul (0, 0) e singurul L–L. */
export const amestecata = (): FormaO => cale([vL(0, 0), vA(60, 0, 0.4), vC(60, 40, 45, 55, 15, 55), vL(0, 40)]);
/** L-ul cu o latură curbă: colțurile L–L (0, 0), (70, 0), (70, 25) convexe, (30, 25) concav; (30, 60), (0, 60) cu cubica. */
export const ell = (): FormaO => cale([vL(0, 0), vL(70, 0), vL(70, 25), vL(30, 25), vC(30, 60, 25, 70, 5, 70), vL(0, 60)]);
/** Crucea 60 × 60, brațe de 20: 8 colțuri convexe, 4 concave, toate L–L. */
export const cruce = (): FormaO => cale([
  vL(20, 0), vL(40, 0), vL(40, 20), vL(60, 20), vL(60, 40), vL(40, 40), vL(40, 60), vL(20, 60), vL(20, 40), vL(0, 40), vL(0, 20), vL(20, 20),
]);
/** O elipsă din patru cubice (κ = 4(√2 − 1)/3), centrul în origine, semiaxele rx, ry, sensul trigonometric. */
export function elipsa(rx: number, ry: number): FormaO {
  const k = (4 * (Math.SQRT2 - 1)) / 3;
  return cale([
    vC(rx, 0, rx, k * ry, k * rx, ry), vC(0, ry, -k * rx, ry, -rx, k * ry), vC(-rx, 0, -rx, -k * ry, -k * rx, -ry), vC(0, -ry, k * rx, -ry, rx, -k * ry),
  ]);
}
/** Un O din pătratice (ca un font TrueType), adus la cubice exacte. */
export const O_PATRATICE = 'M 25 0 Q 25 25 0 25 Q -25 25 -25 0 Q -25 -25 0 -25 Q 25 -25 25 0 Z';
/** Valul: o cubică de 244 mm jos, apoi dreptunghiul (Y în sus). */
export const VAL_D = 'M 0 60 C 60 120 120 0 244 61 L 244 122 L 0 122 Z';
/** Cubica cu vârf (cusp) în (30, 45): derivata se anulează la t = 0,5; închisă cu o linie. */
export const cuVarf = (): FormaO => cale([vC(0, 0, 60, 60, 0, 60), vL(60, 0)]);
/** Un pătrat-cale (doar linii), colțul stânga-jos în (x, y). */
export const patrat = (x: number, y: number, l: number): FormaO => cale([vL(x, y), vL(x + l, y), vL(x + l, y + l), vL(x, y + l)]);

// ---------------------------------------------------------------------------------------------------------------
// Documentul.

export type ElemCale = {
  readonly id: string; readonly forma: FormaO; readonly matrice?: MatriceO; readonly latura: LaturaO; readonly adancime: number;
  readonly sens?: SensO; readonly urechi?: UrechiO | null; readonly rampa?: RampaO | null; readonly intrari?: IntrariO | null; readonly colturi?: ColturiO | null;
};
export type PiesaCale = { readonly id: string; readonly elemente: readonly ElemCale[]; readonly x: number; readonly y: number; readonly rotire?: number };

/** Un document v9: fiecare piesă pusă o dată (`<piesă>/<element>` în lume), câte o operație pe element, în ordine. */
export function docCaleCam(stoc: Stoc, piese: readonly PiesaCale[], o: { readonly diametru: number; readonly pas: number }): DocV9O {
  const v4 = documentRegiune(
    stoc,
    piese.map((pz) => ({
      id: pz.id,
      elemente: pz.elemente.map((e) => ({ id: e.id, forma: e.forma, matrice: e.matrice ?? ID, laturi: [e.latura], adancime: e.adancime, sensuri: [e.sens ?? 'urcare'] })),
    })),
    piese.map((pz) => ({ id: pz.id, piesa: pz.id, x: pz.x, y: pz.y, rotire: pz.rotire ?? 0 })),
    { diametru: o.diametru, pas: o.pas },
  );
  const v8 = migreazaV4V8O(v4);
  v8.piese.forEach((pz, k) => {
    pz.operatii.forEach((op, j) => {
      const e = piese[k]!.elemente[j]!;
      op.urechi = e.urechi ?? null;
      op.rampa = e.rampa ?? null;
      op.intrari = e.intrari ?? null;
      op.colturi = e.colturi ?? null;
    });
  });
  return { ...v8, schema: 9 } as unknown as DocV9O;
}

export type CazPoartaCale = {
  readonly nume: string;
  readonly doc: DocV9O;
  readonly montaj: { readonly origine: Montaj['origine']; readonly z0: Montaj['z0'] };
  readonly D: number;
  /** Colțurile de degajat ale fiecărei tăieturi (idLume), numărate de mână (ADR 0032 §2: L–L, pe partea deșeului). */
  readonly colturi?: Readonly<Record<string, number>>;
  /** Elementele care se ating (regiunea și exportul trebuie să refuze). */
  readonly atingere?: readonly string[];
};

const STOC: Stoc = { latime: 300, inaltime: 220, grosime: 12 };
const ORIGINI: ReadonlyArray<CazPoartaCale['montaj']> = [
  { origine: 'stanga-jos', z0: 'sus' }, { origine: 'dreapta-jos', z0: 'jos' }, { origine: 'dreapta-sus', z0: 'sus' }, { origine: 'stanga-sus', z0: 'jos' },
  { origine: 'stanga-jos', z0: 'jos' }, { origine: 'dreapta-jos', z0: 'sus' }, { origine: 'dreapta-sus', z0: 'jos' }, { origine: 'stanga-sus', z0: 'sus' },
];
const ur = (numar: number, latime: number, grosime: number): UrechiO => ({ numar, latime, grosime });
const rad = (g: number): number => (g * Math.PI) / 180;
/** O similitudine: scara s, rotirea θ (grade), oglindită (det < 0) dacă `oglinda`, apoi mutată. */
const simil = (s: number, theta: number, oglinda: boolean, e = 0, f = 0): MatriceO => {
  const c = s * Math.cos(rad(theta)), n = s * Math.sin(rad(theta));
  return oglinda ? { a: c, b: n, c: n, d: -c, e, f } : { a: c, b: n, c: -n, d: c, e, f };
};

const DE_BAZA: ReadonlyArray<Omit<CazPoartaCale, 'montaj'> & { readonly montaj?: CazPoartaCale['montaj'] }> = [
  {
    nume: 'C01 inima exterior, Ø6, două treceri',
    doc: docCaleCam(STOC, [{ id: 'h', x: 120, y: 105, elemente: [{ id: 'h', forma: caleDin(INIMA_D), latura: 'exterior', adancime: 6 }] }], { diametru: 6, pas: 3 }),
    D: 6,
  },
  {
    nume: 'C02 inima interior (o gaură în schelet), Ø3,175, opoziție',
    doc: docCaleCam(STOC, [{ id: 'h', x: 120, y: 105, elemente: [{ id: 'h', forma: caleDin(INIMA_D), latura: 'interior', adancime: 4, sens: 'opozitie' }] }], { diametru: 3.175, pas: 2 }),
    D: 3.175,
  },
  {
    nume: 'C03 inima pe-linie, Ø3,175, 1 mm',
    doc: docCaleCam(STOC, [{ id: 'h', x: 120, y: 105, elemente: [{ id: 'h', forma: caleDin(INIMA_D), latura: 'pe-linie', adancime: 1 }] }], { diametru: 3.175, pas: 1 }),
    D: 3.175,
  },
  {
    nume: 'C04 cale amestecată (L, A, C) exterior, prin foaie, cu urechi 4 × 8 × 2',
    doc: docCaleCam(STOC, [{ id: 'm', x: 110, y: 80, elemente: [{ id: 'm', forma: amestecata(), latura: 'exterior', adancime: 12, urechi: ur(4, 8, 2) }] }], { diametru: 6, pas: 4 }),
    D: 6,
  },
  {
    nume: 'C05 cale amestecată exterior cu rampă de 10 mm',
    doc: docCaleCam(STOC, [{ id: 'm', x: 110, y: 80, elemente: [{ id: 'm', forma: amestecata(), latura: 'exterior', adancime: 6, rampa: { lungime: 10 } }] }], { diametru: 6, pas: 3 }),
    D: 6,
  },
  {
    nume: 'C06 cale amestecată interior cu intrări de 3 mm (degajare dog-bone în colțul L–L)',
    doc: docCaleCam(STOC, [{ id: 'm', x: 110, y: 80, elemente: [{ id: 'm', forma: amestecata(), latura: 'interior', adancime: 6, intrari: { raza: 3 }, colturi: { tip: 'dog-bone' } }] }], { diametru: 6, pas: 3 }),
    D: 6,
    colturi: { 'm/m': 1 },
  },
  {
    nume: 'C07 cale amestecată exterior cu intrări și rampă (ADR 0031), opoziție',
    doc: docCaleCam(STOC, [{ id: 'm', x: 110, y: 80, elemente: [{ id: 'm', forma: amestecata(), latura: 'exterior', adancime: 6, sens: 'opozitie', intrari: { raza: 3 }, rampa: { lungime: 10 } }] }], { diametru: 6, pas: 3 }),
    D: 6,
  },
  {
    nume: 'C08 L-ul cu latura curbă, exterior, dog-bone: degajarea doar în colțul concav L–L (30, 25)',
    doc: docCaleCam(STOC, [{ id: 'l', x: 110, y: 80, elemente: [{ id: 'l', forma: ell(), latura: 'exterior', adancime: 6, colturi: { tip: 'dog-bone' } }] }], { diametru: 6, pas: 3 }),
    D: 6,
    colturi: { 'l/l': 1 },
  },
  {
    nume: 'C09 crucea interior, T-bone: opt colțuri convexe L–L',
    doc: docCaleCam(STOC, [{ id: 'x', x: 120, y: 80, elemente: [{ id: 'x', forma: cruce(), latura: 'interior', adancime: 6, colturi: { tip: 't-bone' } }] }], { diametru: 6, pas: 3 }),
    D: 6,
    colturi: { 'x/x': 8 },
  },
  {
    nume: 'C10 L-ul cu latura curbă, interior, dog-bone și rampă: trei colțuri convexe L–L',
    doc: docCaleCam(STOC, [{ id: 'l', x: 110, y: 80, elemente: [{ id: 'l', forma: ell(), latura: 'interior', adancime: 6, colturi: { tip: 'dog-bone' }, rampa: { lungime: 10 } }] }], { diametru: 6, pas: 3 }),
    D: 6,
    colturi: { 'l/l': 3 },
  },
  {
    nume: 'C11 crucea exterior, dog-bone, cu urechi: patru colțuri concave L–L',
    doc: docCaleCam(STOC, [{ id: 'x', x: 120, y: 80, elemente: [{ id: 'x', forma: cruce(), latura: 'exterior', adancime: 12, colturi: { tip: 'dog-bone' }, urechi: ur(4, 6, 2) }] }], { diametru: 6, pas: 4 }),
    D: 6,
    colturi: { 'x/x': 4 },
  },
  {
    nume: 'C12 litera O: conturul exterior și contraforma interior, în aceeași piesă (o gaură-cale într-o piesă-cale), Ø3,175',
    doc: docCaleCam(STOC, [{
      id: 'o', x: 150, y: 110, elemente: [
        { id: 'contur', forma: elipsa(30, 40), latura: 'exterior', adancime: 6 },
        { id: 'contra', forma: elipsa(15, 25), latura: 'interior', adancime: 6 },
      ],
    }], { diametru: 3.175, pas: 3 }),
    D: 3.175,
  },
  {
    nume: 'C13 inima (piesă, ×1,5) cu o gaură amestecată (×0,5) înăuntru, în aceeași piesă, cu intrări pe gaură',
    doc: docCaleCam(STOC, [{
      id: 'h', x: 150, y: 110, elemente: [
        { id: 'inima', forma: caleDin(INIMA_D, 1.5), latura: 'exterior', adancime: 6 },
        { id: 'gaura', forma: amestecata(), matrice: { a: 0.5, b: 0, c: 0, d: 0.5, e: -17, f: -8 }, latura: 'interior', adancime: 6, intrari: { raza: 3 } },
      ],
    }], { diametru: 6, pas: 3 }),
    D: 6,
  },
  {
    nume: 'C14 valul de 244 mm (o cubică lungă), exterior, prin foaie, cu urechi 6 × 10 × 2',
    doc: docCaleCam(STOC, [{ id: 'v', x: 28, y: -35, elemente: [{ id: 'v', forma: caleDin(VAL_D), latura: 'exterior', adancime: 12, urechi: ur(6, 10, 2) }] }], { diametru: 6, pas: 6 }),
    D: 6,
  },
  {
    nume: 'C15 cubica cu vârf (cusp), exterior, Ø3,175',
    doc: docCaleCam(STOC, [{ id: 'c', x: 120, y: 80, elemente: [{ id: 'c', forma: cuVarf(), latura: 'exterior', adancime: 4 }] }], { diametru: 3.175, pas: 2 }),
    D: 3.175,
  },
  {
    nume: 'C16 cale amestecată sub o similitudine oglindită, rotită 30° și scalată 1,2, pusă cu rotirea 90 (arcele rămân arce)',
    doc: docCaleCam(STOC, [{ id: 's', x: 150, y: 110, rotire: 90, elemente: [{ id: 's', forma: amestecata(), matrice: simil(1.2, 30, true), latura: 'exterior', adancime: 6, colturi: { tip: 't-bone' } }] }], { diametru: 6, pas: 3 }),
    D: 6,
    // Colțul (0, 0) e convex pe piesă: pe exterior, nicio degajare.
    colturi: { 's/s': 0 },
  },
  {
    nume: 'C17 L-ul cu latura curbă sub o forfecare (doar linii și cubice), exterior, dog-bone',
    doc: docCaleCam(STOC, [{ id: 'f', x: 100, y: 70, elemente: [{ id: 'f', forma: ell(), matrice: { a: 1, b: 0, c: 0.3, d: 1, e: 0, f: 0 }, latura: 'exterior', adancime: 6, colturi: { tip: 'dog-bone' } }] }], { diametru: 6, pas: 3 }),
    D: 6,
    colturi: { 'f/f': 1 },
  },
  {
    nume: 'C18 O din pătratice (TrueType), interior, Ø8',
    doc: docCaleCam(STOC, [{ id: 'q', x: 150, y: 110, elemente: [{ id: 'q', forma: caleDin(O_PATRATICE), latura: 'interior', adancime: 6 }] }], { diametru: 8, pas: 3 }),
    D: 8,
  },
  {
    nume: 'C19 trei căi pe aceeași foaie (inima exterior, crucea interior cu T-bone, valul mic pe-linie), Ø6',
    doc: docCaleCam(STOC, [
      { id: 'h', x: 60, y: 160, elemente: [{ id: 'h', forma: caleDin(INIMA_D, 0.8), latura: 'exterior', adancime: 6 }] },
      { id: 'x', x: 160, y: 130, elemente: [{ id: 'x', forma: cruce(), latura: 'interior', adancime: 6, colturi: { tip: 't-bone' } }] },
      { id: 'v', x: 20, y: 10, elemente: [{ id: 'v', forma: caleDin(VAL_D, 0.5), latura: 'pe-linie', adancime: 1 }] },
    ], { diametru: 6, pas: 3 }),
    D: 6,
    colturi: { 'x/x': 8 },
  },
  // Perechile care se ating: regiunea (ADR 0026 §2) și exportul refuză.
  {
    nume: 'R01 două inimi care se suprapun (exterior, exterior)',
    doc: docCaleCam(STOC, [
      { id: 'a', x: 100, y: 105, elemente: [{ id: 'a', forma: caleDin(INIMA_D), latura: 'exterior', adancime: 6 }] },
      { id: 'b', x: 160, y: 105, elemente: [{ id: 'b', forma: caleDin(INIMA_D), latura: 'exterior', adancime: 6 }] },
    ], { diametru: 6, pas: 3 }),
    D: 6,
    atingere: ['a/a', 'b/b'],
  },
  {
    nume: 'R02 două pătrate-cale cu o latură comună (exterior, exterior)',
    doc: docCaleCam(STOC, [
      { id: 'a', x: 100, y: 80, elemente: [{ id: 'a', forma: patrat(0, 0, 40), latura: 'exterior', adancime: 6 }] },
      { id: 'b', x: 140, y: 80, elemente: [{ id: 'b', forma: patrat(0, 0, 40), latura: 'exterior', adancime: 6 }] },
    ], { diametru: 6, pas: 3 }),
    D: 6,
    atingere: ['a/a', 'b/b'],
  },
  {
    nume: 'R03 o gaură-cale (triunghi) cu un vârf pe marginea piesei-cale (exterior, interior; aceeași piesă)',
    doc: docCaleCam(STOC, [{
      id: 'p', x: 100, y: 70, elemente: [
        { id: 'piesa', forma: patrat(0, 0, 60), latura: 'exterior', adancime: 6 },
        { id: 'gaura', forma: cale([vL(30, 20), vL(60, 30), vL(30, 40)]), latura: 'interior', adancime: 6 },
      ],
    }], { diametru: 6, pas: 3 }),
    D: 6,
    atingere: ['p/piesa', 'p/gaura'],
  },
];

/** Corpusul, cu montajul rotit pe cele 8 combinații (colțul de origine × Z0). */
export const CAZURI_POARTA_CALE: readonly CazPoartaCale[] = DE_BAZA.map((c, k) => ({ ...c, montaj: c.montaj ?? ORIGINI[k % ORIGINI.length]! }));
