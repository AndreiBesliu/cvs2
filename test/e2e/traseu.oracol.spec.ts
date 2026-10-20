import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adauga } from './ajutor-panza.ts';
import {
  aproximeaza, citesteProgram, deplaseaza, deseneaza, distanta, imagineDinPlat, inDocument, inPixeli, judeca,
  origineDinAntet, ProgramRefuzat, pxPeMm, razaOri,
  type Arc, type Imagine, type Pixel, type Primitiva, type Punct, type RGBA, type Vedere,
} from '../oracles/strat-traseu.ts';

/**
 * Testul de legătură al ORACOLULUI STRATULUI DE TRASEU (ADR 0038, „Dovada și probele”; sesiune independentă, fără
 * citirea implementării): programul se ia din exportul aplicației, ca omul; pixelii se citesc din canvasul WebGL2 al
 * stratului (`preserveDrawingBuffer`, verificat la rulare, încrucișat cu `readPixels`); oracolul spune, din textul
 * G-code și din vederea pânzei, unde trebuie să cadă traseul. Pe hârtie: dreptunghiul profilat pe exterior cu Ø6 (rama
 * la 3 mm, ±1 px la 10 px/mm), cercul Ø30 pe exterior (raza 15 + 3, ±1 px la 1 000 px/mm, la marginea foii de 2 440 mm)
 * și linia tăiată pe linie (aceiași pixeli ca vectorul ei). Martorii negativi: traseul decalat cu 1 px, raza × 1,01,
 * rapidele desenate ca tăieri, arcul cu sensul întors. Primele teste (hârtia) rulează fără browser.
 */
test.use({ locale: 'ro-RO' });

const VERDE: RGBA = [10, 125, 83, 255];
const GRI: RGBA = [125, 133, 144, 204];
const aproape = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;

function egalePrimitive(real: readonly Primitiva[], asteptat: readonly Primitiva[]): string[] {
  const erori: string[] = [];
  if (real.length !== asteptat.length) return [`${real.length} primitive în loc de ${asteptat.length}`];
  const pct = (a: Punct, b: Punct): boolean => aproape(a[0], b[0]) && aproape(a[1], b[1]);
  asteptat.forEach((e, i) => {
    const r = real[i] as Primitiva;
    const bine = r.fel === e.fel && r.tip === e.tip && r.linia === e.linia && pct(r.a, e.a) && pct(r.b, e.b)
      && (r.fel !== 'arc' || e.fel !== 'arc' || (pct(r.c, e.c) && aproape(r.r, e.r) && aproape(r.u0, e.u0) && aproape(r.baleiaj, e.baleiaj)));
    if (!bine) erori.push(`#${i}: ${JSON.stringify(r)} în loc de ${JSON.stringify(e)}`);
  });
  return erori;
}

// ───────────────────────────── Hârtia: oracolul singur, pe valori calculate de mână ─────────────────────────────

const PROGRAM_HARTIE = [
  '(antet cu cifre: foaia 300 x 200, G1 X99 Y99 in comentariu)',
  'G90 G17 G21 G94',
  'G0 Z5.000',
  'G0 X10.000 Y10.000 ; din punctul necunoscut de la pornire: nimic desenat',
  'G1 Z-1.000 F300.0',
  'G1 X20.000 F1000.0',
  'Y20.000',
  'G3 X10.000 Y20.000 I-5.000 J0.000',
  'G2 X10.000 Y20.000 I0.000 J-5.000',
  'G0 X30.000 Y40.000',
  'G1X40Y40',
  'G4 P0.5',
  'G2 X40.000 Y30.000 I0 J-5',
  'M5',
  'M30',
].join('\n');

const PRIMITIVE_HARTIE: readonly Primitiva[] = [
  { fel: 'segment', tip: 'taiere', linia: 6, a: [10, 10], b: [20, 10] },
  { fel: 'segment', tip: 'taiere', linia: 7, a: [20, 10], b: [20, 20] },
  { fel: 'arc', tip: 'taiere', linia: 8, a: [20, 20], b: [10, 20], c: [15, 20], r: 5, u0: 0, baleiaj: Math.PI },
  { fel: 'arc', tip: 'taiere', linia: 9, a: [10, 20], b: [10, 20], c: [10, 15], r: 5, u0: Math.PI / 2, baleiaj: -2 * Math.PI },
  { fel: 'segment', tip: 'rapid', linia: 10, a: [10, 20], b: [30, 40] },
  { fel: 'segment', tip: 'taiere', linia: 11, a: [30, 40], b: [40, 40] },
  { fel: 'arc', tip: 'taiere', linia: 13, a: [40, 40], b: [40, 30], c: [40, 35], r: 5, u0: Math.PI / 2, baleiaj: -Math.PI },
];

test('hârtia: citirea programului (modurile modale, I / J incrementale, sensul și cercul întreg ca GRBL, originea)', () => {
  expect(egalePrimitive(citesteProgram(PROGRAM_HARTIE), PRIMITIVE_HARTIE)).toEqual([]);
  // Cu originea programului în (300, 200) (dreapta-sus pe foaia de 300 × 200), totul se mută cu atât.
  const mutat = PRIMITIVE_HARTIE.map((p) => (p.fel === 'segment'
    ? { ...p, a: [p.a[0] + 300, p.a[1] + 200] as Punct, b: [p.b[0] + 300, p.b[1] + 200] as Punct }
    : { ...p, a: [p.a[0] + 300, p.a[1] + 200] as Punct, b: [p.b[0] + 300, p.b[1] + 200] as Punct, c: [p.c[0] + 300, p.c[1] + 200] as Punct }));
  expect(egalePrimitive(citesteProgram(PROGRAM_HARTIE, [300, 200]), mutat)).toEqual([]);
  // Coordonatele negative ale unui program cu originea dreapta-sus (export.spec.ts: gaura din (82, 50) → X-218 Y-150).
  const neg = citesteProgram('(origine dreapta-sus, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm)\nG90 G21\nG0 X-218.000 Y-150.000\nG1 X-208.000 Y-150.000');
  expect(neg).toHaveLength(1);
  const dinAntet = citesteProgram('(origine dreapta-sus, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm)\nG90 G21\nG0 X-218.000 Y-150.000\nG1 X-208.000 Y-150.000',
    origineDinAntet('(origine dreapta-sus, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm)'));
  expect(egalePrimitive(dinAntet, [{ fel: 'segment', tip: 'taiere', linia: 4, a: [82, 50], b: [92, 50] }])).toEqual([]);
});

test('hârtia: originea din antet, pe cele patru colțuri', () => {
  const antet = (c: string) => `(CNC Vector Studio)\n(origine ${c}, Z0 jos, foaia 300.000 x 200.000 x 18.000 mm)\n`;
  expect(origineDinAntet(antet('stanga-jos'))).toEqual([0, 0]);
  expect(origineDinAntet(antet('dreapta-jos'))).toEqual([300, 0]);
  expect(origineDinAntet(antet('dreapta-sus'))).toEqual([300, 200]);
  expect(origineDinAntet(antet('stanga-sus'))).toEqual([0, 200]);
  expect(() => origineDinAntet('G90 G21\n')).toThrow(ProgramRefuzat);
});

test('hârtia: ce nu e în contract se refuză cu motiv, nu se ghicește', () => {
  const cazuri: ReadonlyArray<readonly [string, RegExp]> = [
    ['G91 G21\nG1 X1 Y1', /G91/],
    ['G90 G20\nG1 X1 Y1', /G20/],
    ['G90 G21 G18\n', /G18/],
    ['G90 G21\nG0 X0 Y0\nG2 X10 Y0 R5', /forma R/],
    ['G90 G21\nG92 X0 Y0', /G92/],
    ['G90 G21 G90.1\n', /G90\.1/],
    ['G90 G21\nG0 X0 Y0\nG2 X10 Y0 I3 J0', /error:33/],
    ['G90 G21\nG2 X10 Y0 I5 J0', /necunoscut/],
    ['G1 X1 Y1', /G90 și G21/],
    ['G90 G21\nX1 Y1', /fără mod/],
    ['G90 G21\nG0 X1 X2', /două ori/],
    ['G90 G21\nG0 X1 (neinchis', /paranteză/],
    ['G90 G21\nG0 X1 Q', /necitit/],
  ];
  for (const [program, motiv] of cazuri) expect(() => citesteProgram(program), program).toThrow(motiv);
  // Raza capetelor diferă cu 0,004 mm: sub pragul GRBL (0,005 mm), deci arcul trece.
  expect(citesteProgram('G90 G21\nG0 X0 Y0\nG2 X10.004 Y0 I5 J0')).toHaveLength(1);
});

test('hârtia: vederea (scara, translația, dpr) și distanța cu semn, la segment și la arc', () => {
  const v: Vedere = { scara: 10, tx: 100.25, ty: 500.5, dpr: 2 };
  expect(inPixeli([10, 20], v)).toEqual([400.5, 601]);
  const d = inDocument([400.5, 600.5], v);
  expect(d[0]).toBeCloseTo(10, 12);
  expect(d[1]).toBeCloseTo(20.025, 12);
  expect(pxPeMm(v)).toBe(20);
  // Pixelul (400, 600) are centrul la ½ px deasupra liniei y = 20 mm (Y = 601): 0,025 mm, adică 0,5 px la 20 px/mm.
  const seg = PRIMITIVE_HARTIE[0] as Primitiva;
  const r = distanta([15, 10.025], seg);
  expect(r.d).toBeCloseTo(0.025, 12);
  expect(r.semn).toBeCloseTo(0.025, 12); // în stânga sensului (10,10) → (20,10)
  expect(r.interior).toBe(true);
  expect(distanta([25, 10], seg)).toMatchObject({ d: 5, interior: false });
  // Semicercul orar de pe linia 13 (centrul (40, 35), din (40, 40) în (40, 30)) trece prin est, (45, 35).
  const arc = PRIMITIVE_HARTIE[6] as Primitiva;
  const est = distanta([46, 35], arc);
  expect(est.d).toBeCloseTo(1, 12);
  expect(est.semn).toBeCloseTo(1, 12);
  expect(est.interior).toBe(true);
  // Vestul (34, 35) nu e pe arc: cel mai aproape e un capăt, la √(6² + 5²).
  const vest = distanta([34, 35], arc);
  expect(vest.d).toBeCloseTo(Math.hypot(6, 5), 12);
  expect(vest.interior).toBe(false);
  // Cercul întreg de pe linia 9: orice direcție e pe el.
  expect(distanta([10, 9], PRIMITIVE_HARTIE[3] as Primitiva).d).toBeCloseTo(1, 12);
});

test('hârtia: arcul aproximat are săgeata sub ½ px și cel mai mic număr de coarde (106 pe sfertul de R18 la 1 000 px/mm)', () => {
  const v: Vedere = { scara: 1000, tx: 0, ty: 0, dpr: 1 };
  const sfert: Arc = { fel: 'arc', tip: 'taiere', linia: 1, a: [2438, 50], b: [2420, 68], c: [2420, 50], r: 18, u0: 0, baleiaj: Math.PI / 2 };
  const pl = aproximeaza(sfert, v);
  // De mână: unghiul unei coarde cu săgeata ½ px pe raza de 18 000 px e 2·acos(1 − 0,5/18 000) ≈ 0,014907 rad; π/2 din
  // el = 105,37, deci 106 coarde (107 puncte); cu 105, săgeata ar fi 18 000·(1 − cos(π/420)) ≈ 0,5036 px.
  expect(pl).toHaveLength(107);
  expect(pl[0]).toEqual([2438, 50]);
  expect(pl[106]).toEqual([2420, 68]);
  let sageata = 0;
  for (let k = 0; k + 1 < pl.length; k++) {
    const a = pl[k] as Punct, b = pl[k + 1] as Punct;
    for (let t = 0; t <= 1; t += 1 / 64) {
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      sageata = Math.max(sageata, (18 - Math.hypot(x - 2420, y - 50)) * 1000);
    }
  }
  expect(sageata).toBeLessThanOrEqual(0.5);
  expect(sageata).toBeGreaterThan(0.45);
  // O rază sub ½ px: o singură coardă.
  expect(aproximeaza({ ...sfert, r: 0.0004, a: [2420.0004, 50], b: [2420, 50.0004] }, v)).toHaveLength(2);
});

/** O imagine făcută de mână: pixelii (x0…x1, y) aprinși cu culoarea dată. */
function rand(x0: number, x1: number, y: number, c: RGBA): Pixel[] {
  const r: Pixel[] = [];
  for (let x = x0; x <= x1; x++) r.push({ x, y, rgba: c });
  return r;
}

test('hârtia: judecătorul, pe imagini făcute de mână (decalajul, golul, pixelul rătăcit, culorile)', () => {
  // La 10 px/mm, cu ty = 100,5: linia y = 1 mm cade pe Y = 90,5, adică pe centrele rândului 90; x 1…5 mm → X 10…50.
  const v: Vedere = { scara: 10, tx: 0, ty: 100.5, dpr: 1 };
  const taiere: Primitiva = { fel: 'segment', tip: 'taiere', linia: 1, a: [1, 1], b: [5, 1] };
  const rapid: Primitiva = { fel: 'segment', tip: 'rapid', linia: 2, a: [1, 3], b: [5, 3] };
  const img = (p: Pixel[]): Imagine => ({ latime: 100, inaltime: 100, aprinsi: p });
  const bun = judeca(img(rand(10, 49, 90, VERDE)), [taiere], v);
  expect(bun.motive).toEqual([]);
  expect(bun.abatereMaxima).toBe(0);
  expect(bun.esantioane).toBe(161);
  expect(bun.medii).toEqual([{ linia: 1, tip: 'taiere', n: 36, medie: 0 }]);
  // Un rând mai jos: fiecare pixel e la 1 px (încă în ±1 px), dar media e −1 (dreapta sensului): prins.
  const jos = judeca(img(rand(10, 49, 91, VERDE)), [taiere], v);
  expect(jos.inPlus).toBe(0);
  expect(jos.goluri).toBe(0);
  expect(jos.medieMaxima).toBeCloseTo(1, 12);
  expect(jos.motive).toHaveLength(1);
  expect(jos.motive[0]).toMatch(/abaterea medie -1\.00/);
  // Un gol de 4 pixeli (x 18…21): punctele de la X 19,25 la 20,75 n-au pixel la 1,5 px: 7 goluri.
  const gol = judeca(img([...rand(10, 17, 90, VERDE), ...rand(22, 49, 90, VERDE)]), [taiere], v);
  expect(gol.goluri).toBe(7);
  expect(gol.ok).toBe(false);
  // Un pixel rătăcit la 3 px de linie.
  const ratacit = judeca(img([...rand(10, 49, 90, VERDE), { x: 15, y: 93, rgba: VERDE }]), [taiere], v);
  expect(ratacit.inPlus).toBe(1);
  expect(ratacit.abatereMaxima).toBeCloseTo(3, 12);
  // Culorile: tăierea verde, rapidul (Y = 70,5) gri: trece; rapidul verde: „rapidele au culoarea tăierilor”; oracolul
  // care ia rapidul drept tăiere vede tăieri în două culori.
  const doua = img([...rand(10, 49, 90, VERDE), ...rand(10, 49, 70, GRI)]);
  const cuRapid = judeca(doua, [taiere, rapid], v);
  expect(cuRapid.motive).toEqual([]);
  expect(cuRapid.taiere.culoare).toEqual(VERDE);
  expect(cuRapid.rapid.culoare).toEqual(GRI);
  expect(judeca(img([...rand(10, 49, 90, VERDE), ...rand(10, 49, 70, VERDE)]), [taiere, rapid], v).motive.join()).toMatch(/rapidele au culoarea tăierilor/);
  expect(judeca(doua, [taiere, { ...rapid, tip: 'taiere' }], v).motive.join()).toMatch(/tăierile nu au o singură culoare/);
});

test('hârtia: desenul de referință al oracolului trece judecata, iar martorii lui negativi pică', () => {
  const v: Vedere = { scara: 4.3, tx: 37.7, ty: 512.2, dpr: 1.5 };
  const prims = citesteProgram(PROGRAM_HARTIE);
  const img = deseneaza(prims, v, 800, 800, { taiere: VERDE, rapid: GRI });
  const bun = judeca(img, prims, v);
  expect(bun.motive).toEqual([]);
  expect(bun.rapid.n).toBeGreaterThan(20);
  const px = 1 / pxPeMm(v);
  expect(judeca(img, deplaseaza(prims, px, 0), v).ok).toBe(false);
  expect(judeca(img, deplaseaza(prims, 0, -px), v).ok).toBe(false);
  expect(judeca(img, razaOri(prims, 1.01), v).ok).toBe(false);
  expect(judeca(img, citesteProgram(intoarceArcele(PROGRAM_HARTIE)), v).ok).toBe(false);
  expect(judeca(deseneaza(prims, v, 800, 800, { taiere: VERDE, rapid: VERDE }), prims, v).ok).toBe(false);
});

// ───────────────────────────── Legătura: aplicația din `dist/`, în Edge ─────────────────────────────

/** G2 ↔ G3 în textul programului: același capăt și același centru, sensul întors. */
function intoarceArcele(text: string): string {
  return text.replace(/G([23])(?![0-9.])/g, (_m, d: string) => (d === '2' ? 'G3' : 'G2'));
}

/** G0 → G1: rapidele citite ca tăieri. */
function rapideCaTaieri(text: string): string {
  return text.replace(/G0(?![0-9.])/g, 'G1');
}

const panza = (page: Page) => page.getByTestId('panza');
const strat = (page: Page) => page.getByTestId('strat-traseu');

async function cadre(page: Page, n = 2): Promise<void> {
  await page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((ok) => requestAnimationFrame(() => { ok(null); }));
  }, n);
}

/** Vederea pânzei, după ce ultima cerere trimisă workerului a fost și afișată (ca `ajutor-panza.ts`). */
async function vedere(page: Page): Promise<Vedere> {
  await cadre(page);
  await expect.poll(async () => {
    const [c, a] = await Promise.all([panza(page).getAttribute('data-cerere'), panza(page).getAttribute('data-afisata')]);
    return c !== null && c === a && c !== '0';
  }).toBe(true);
  return panza(page).evaluate((el) => {
    const d = (el as HTMLElement).dataset;
    return { scara: Number(d['scara']), tx: Number(d['tx']), ty: Number(d['ty']), dpr: Number(d['dpr']) };
  });
}

async function centruPanza(page: Page): Promise<Punct> {
  const b = await panza(page).boundingBox();
  if (!b) throw new Error('pânza n-are cutie');
  return [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)];
}

/** Trage cu butonul din mijloc (pan), din punctul `de` în punctul `la` (px CSS ai paginii), printr-un ocol. */
async function pan(page: Page, de: Punct, la: Punct): Promise<void> {
  await page.mouse.move(de[0], de[1]);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move((de[0] + la[0]) / 2 + 9, (de[1] + la[1]) / 2 + 9, { steps: 3 });
  await page.mouse.move(la[0], la[1], { steps: 3 });
  await page.mouse.up({ button: 'middle' });
}

/** Aduce punctul P (mm) în centrul pânzei, apoi mărește în jurul lui până la scara țintă (sau până la plafon). */
async function laScara(page: Page, tinta: number, P: Punct): Promise<Vedere> {
  const b = await panza(page).boundingBox();
  if (!b) throw new Error('pânza n-are cutie');
  const c = await centruPanza(page);
  let v = await vedere(page);
  const de: Punct = [b.x + v.tx + P[0] * v.scara, b.y + v.ty - P[1] * v.scara];
  if (de[0] < b.x + 5 || de[1] < b.y + 5 || de[0] > b.x + b.width - 5 || de[1] > b.y + b.height - 5) throw new Error(`punctul ${P.join(', ')} nu e pe ecran`);
  await pan(page, de, c);
  await page.mouse.move(c[0], c[1]);
  v = await vedere(page);
  // Pasul rotiței se măsoară (factorul pe unitatea de deltaY), apoi se calculează deltaY-ul care duce la țintă.
  let k: number | null = null;
  for (let i = 0; i < 60 && Math.abs(v.scara / tinta - 1) > 1e-12; i++) {
    const inainte = v.scara;
    const dy: number = k === null ? (tinta > v.scara ? -100 : 100) : Math.max(-3000, Math.min(3000, -Math.log(tinta / v.scara) / k));
    await page.mouse.wheel(0, dy);
    v = await vedere(page);
    if (v.scara === inainte) break; // plafonul
    if (k === null) k = -Math.log(v.scara / inainte) / dy;
  }
  return v;
}

/**
 * Mută vederea cu o fracțiune de pixel, ca milimetrii întregi să cadă pe centrele pixelilor (la o scară cu px/mm întreg):
 * la o linie orizontală sau verticală exact pe granița dintre doi pixeli, rasterizarea alege oricare, iar martorul
 * „decalat cu 1 px” n-ar mai fi sigur.
 */
async function fazaPeCentre(page: Page): Promise<Vedere> {
  const v = await vedere(page);
  const delta = (u: number): number => {
    const f = (((u * v.dpr) % 1) + 1) % 1;
    let d = 0.5 - f;
    if (d > 0.5) d -= 1;
    if (d <= -0.5) d += 1;
    return d / v.dpr;
  };
  const c = await centruPanza(page);
  await pan(page, c, [c[0] + delta(v.tx), c[1] + delta(v.ty)]);
  const w = await vedere(page);
  const faza = (u: number): number => (((u * w.dpr) % 1) + 1) % 1;
  if (Math.abs(faza(w.tx) - 0.5) > 0.02 || Math.abs(faza(w.ty) - 0.5) > 0.02) throw new Error(`faza n-a ajuns pe centre: ${w.tx}, ${w.ty}`);
  return w;
}

type Captura = { readonly img: Imagine; readonly pdb: boolean; readonly diferente: number; readonly aliniat: boolean; readonly stins: string | undefined };

/**
 * Pixelii aprinși ai stratului. Cu `preserveDrawingBuffer` (atributul contextului, citit la rulare), canvasul se copiază
 * cu `drawImage` și se încrucișează cu `readPixels` (premultiplicat, de jos în sus); fără el, `readPixels` într-un cadru.
 */
async function captureaza(page: Page): Promise<Captura> {
  await cadre(page, 3);
  const r = await page.evaluate(async () => {
    const p = document.querySelector<HTMLCanvasElement>('[data-testid="panza"]');
    const s = document.querySelector<HTMLCanvasElement>('[data-testid="strat-traseu"]');
    if (!p || !s) throw new Error('lipsește pânza sau stratul');
    const gl = s.getContext('webgl2');
    if (!gl) throw new Error('stratul n-are context WebGL2');
    const pdb = gl.getContextAttributes()?.preserveDrawingBuffer === true;
    const w = s.width, h = s.height;
    const citesteGl = (): Uint8Array => {
      const b = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b);
      return b;
    };
    const plat: number[] = [];
    let diferente = 0;
    if (pdb) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (!g) throw new Error('fără context 2D');
      g.drawImage(s, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      const b = citesteGl();
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = 4 * (y * w + x), j = 4 * ((h - 1 - y) * w + x);
          const a = d[i + 3] ?? 0;
          if (a !== (b[j + 3] ?? 0)) diferente++;
          if (a > 0) plat.push(x, y, d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0, a);
        }
      }
    } else {
      const b = await new Promise<Uint8Array>((ok) => { requestAnimationFrame(() => { ok(citesteGl()); }); });
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const j = 4 * ((h - 1 - y) * w + x);
          const a = b[j + 3] ?? 0;
          if (a > 0) plat.push(x, y, Math.round(((b[j] ?? 0) * 255) / a), Math.round(((b[j + 1] ?? 0) * 255) / a), Math.round(((b[j + 2] ?? 0) * 255) / a), a);
        }
      }
    }
    const bp = p.getBoundingClientRect(), bs = s.getBoundingClientRect();
    const aliniat = w === p.width && h === p.height && bp.x === bs.x && bp.y === bs.y && bp.width === bs.width && bp.height === bs.height
      && w === Math.round(bs.width * devicePixelRatio);
    return { w, h, plat, pdb, diferente, aliniat, stins: s.dataset['stins'] };
  });
  return { img: imagineDinPlat(r.w, r.h, r.plat), pdb: r.pdb, diferente: r.diferente, aliniat: r.aliniat, stins: r.stins };
}

/** Capturează până când două citiri la rând sunt identice (stratul a terminat de redesenat după vedere). */
async function capturaStabila(page: Page): Promise<Captura> {
  let a = await captureaza(page);
  for (let i = 0; i < 10; i++) {
    const b = await captureaza(page);
    if (b.img.aprinsi.length === a.img.aprinsi.length && b.img.aprinsi.every((p, k) => p.x === a.img.aprinsi[k]?.x && p.y === a.img.aprinsi[k]?.y)) return b;
    a = b;
  }
  throw new Error('stratul nu se liniștește');
}

/** Exportul, ca omul: dialogul, laturile alese pe rânduri, Ø6, descărcarea; întoarce textul fișierului. */
async function exporta(page: Page, laturi: Readonly<Record<string, string>> = {}): Promise<string> {
  await page.locator('[data-actiune="export.gcode"]').click();
  for (const [r, latura] of Object.entries(laturi)) await page.locator(`[data-operatie="${r}"] select[data-camp="latura"]`).selectOption(latura);
  await expect(page.locator('[data-camp="diametru"]')).toHaveValue('6');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  await page.getByRole('button', { name: 'Închide' }).click();
  return text;
}

/** „Arată traseul” cu tasta T; stratul are vârfuri, nu e stins și nu are cip. */
async function aratTraseul(page: Page): Promise<void> {
  await page.keyboard.press('t');
  await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/);
  await expect(strat(page)).toHaveAttribute('data-stins', 'false');
  await expect(page.getByTestId('traseu-stare')).toHaveCount(0);
}

async function panouDeschis(page: Page): Promise<void> {
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toHaveAttribute('data-deschis', 'true');
}

async function scrie(page: Page, camp: string, valoare: string): Promise<void> {
  const c = page.locator(`[data-camp="${camp}"]`);
  await c.fill(valoare);
  await c.press('Enter');
  await expect(c).toHaveValue(valoare);
}

/** Punctele primitivei, la cel mult `pas` mm unul de altul, pe geometria ei exactă. */
function puncte(pr: Primitiva, pas: number): Punct[] {
  const r: Punct[] = [];
  if (pr.fel === 'segment') {
    const n = Math.max(1, Math.ceil(Math.hypot(pr.b[0] - pr.a[0], pr.b[1] - pr.a[1]) / pas));
    for (let i = 0; i <= n; i++) r.push([pr.a[0] + ((pr.b[0] - pr.a[0]) * i) / n, pr.a[1] + ((pr.b[1] - pr.a[1]) * i) / n]);
  } else {
    const n = Math.max(1, Math.ceil((Math.abs(pr.baleiaj) * pr.r) / pas));
    for (let i = 0; i <= n; i++) { const u = pr.u0 + (pr.baleiaj * i) / n; r.push([pr.c[0] + pr.r * Math.cos(u), pr.c[1] + pr.r * Math.sin(u)]); }
  }
  return r;
}

/**
 * Pe hârtie: tăierile programului stau pe figura dată (distanța ei ≤ 1 µm) și o acoperă toată (fiecare punct al figurii
 * are un punct de tăiere la cel mult 1 µm + pasul).
 */
function peHartie(prims: readonly Primitiva[], laFigura: (p: Punct) => number, figura: readonly Punct[]): { departe: number; neacoperit: number } {
  const taieri = prims.filter((p) => p.tip === 'taiere');
  const pts = taieri.flatMap((p) => puncte(p, 0.02));
  const departe = pts.reduce((m, p) => Math.max(m, laFigura(p)), 0);
  let neacoperit = 0;
  for (const q of figura) neacoperit = Math.max(neacoperit, pts.reduce((m, p) => Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1])), Infinity));
  return { departe, neacoperit };
}

/** Martorii negativi geometrici: aceeași imagine, judecată față de drumul decalat cu 1 px pe fiecare direcție dată. */
function decalari(img: Imagine, prims: readonly Primitiva[], v: Vedere, directii: readonly Punct[]): string[] {
  const s = pxPeMm(v);
  const trecute: string[] = [];
  for (const [dx, dy] of directii) if (judeca(img, deplaseaza(prims, dx / s, -dy / s), v).ok) trecute.push(`(${dx}, ${dy}) px`);
  return trecute;
}

/** Cifrele verdictului, ca adnotare a testului (raportul JSON le arată). */
function noteaza(eticheta: string, v: ReturnType<typeof judeca>): void {
  test.info().annotations.push({
    type: 'verdict',
    description: `${eticheta}: ${v.aprinsi} pixeli aprinși, abaterea maximă ${v.abatereMaxima.toFixed(3)} px, media maximă ${v.medieMaxima.toFixed(3)} px, `
      + `${v.esantioane} puncte ale drumului, ${v.goluri} goluri; tăieri ${v.taiere.n} (${v.taiere.culoare?.join(',') ?? '—'}), rapide ${v.rapid.n} (${v.rapid.culoare?.join(',') ?? '—'})`,
  });
}

for (const dpr of [1, 2]) {
  test.describe(`dpr ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });

    test(`dreptunghiul profilat pe exterior cu Ø6, la 10 px/mm (dpr ${dpr}): rama la 3 mm de contur, ±1 px; martorii pică`, async ({ page }) => {
      await page.goto('/');
      await adauga(page, 'dreptunghi');
      const text = await exporta(page);
      expect(text).toContain('(e1/e1: dreptunghi, exterior, 3 mm)');
      expect(text).toContain('(scula T1 freza plata D6.000)');
      const prims = citesteProgram(text, origineDinAntet(text));
      // Pe hârtie: dreptunghiul 100 × 60 din (20, 20), rama centrului frezei la R = 3 mm de el, pe dinafară.
      const laDreptunghi = (p: Punct): number => Math.abs(Math.hypot(Math.max(20 - p[0], 0, p[0] - 120), Math.max(20 - p[1], 0, p[1] - 80)) - 3);
      const rama: Punct[] = [];
      for (let t = 0; t <= 1; t += 1 / 400) rama.push([20 + 100 * t, 17], [20 + 100 * t, 83], [17, 20 + 60 * t], [123, 20 + 60 * t]);
      for (let u = 0; u < 2 * Math.PI; u += Math.PI / 200) {
        const cx = Math.cos(u) >= 0 ? 120 : 20, cy = Math.sin(u) >= 0 ? 80 : 20;
        rama.push([cx + 3 * Math.cos(u), cy + 3 * Math.sin(u)]);
      }
      const h = peHartie(prims, laDreptunghi, rama);
      expect(h.departe).toBeLessThanOrEqual(0.001);
      expect(h.neacoperit).toBeLessThanOrEqual(0.021);
      expect(prims.filter((p) => p.fel === 'arc')).toHaveLength(4);

      await aratTraseul(page);
      const v0 = await laScara(page, 10, [70, 50]);
      expect(v0.scara).toBeCloseTo(10, 9);
      const v = await fazaPeCentre(page);
      expect(v.dpr).toBe(dpr);
      // Toată rama e în canvas, cu loc.
      for (const q of [[17, 17], [123, 83]] as const) {
        const X = inPixeli(q, v);
        expect(X[0]).toBeGreaterThan(10);
        expect(X[1]).toBeGreaterThan(10);
        expect(X[0]).toBeLessThan(1280 * dpr - 10);
        expect(X[1]).toBeLessThan(720 * dpr - 10);
      }
      const c = await capturaStabila(page);
      expect(c.pdb).toBe(true);
      expect(c.aliniat).toBe(true);
      expect(c.diferente).toBe(0);
      expect(c.stins).toBe('false');
      const verdict = judeca(c.img, prims, v);
      noteaza(`dreptunghi dpr ${dpr}`, verdict);
      expect(verdict.motive).toEqual([]);
      expect(verdict.esantioane).toBeGreaterThan(3000 * dpr);
      expect(verdict.aprinsi).toBeGreaterThan(3000 * dpr);
      // Martorii negativi: decalat cu 1 px pe fiecare direcție, colțurile cu sensul întors.
      expect(decalari(c.img, prims, v, [[1, 0], [-1, 0], [0, 1], [0, -1]])).toEqual([]);
      const intors = judeca(c.img, citesteProgram(intoarceArcele(text), origineDinAntet(text)), v);
      expect(intors.ok).toBe(false);
      expect(intors.goluri).toBeGreaterThan(100);
    });
  });
}

test('rapidele separat de tăieri: drumul lor, altă culoare; martorii: rapidele citite ca tăieri, desenate ca tăieri', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  const text = await exporta(page);
  const prims = citesteProgram(text, origineDinAntet(text));
  // Pe hârtie (placa 1 A): gaura Ø30 cu Ø6 (raza 12, în două treceri), apoi rapidul din (82, 50) în colțul ramei (20, 17).
  expect(prims.filter((p) => p.tip === 'rapid')).toEqual([{ fel: 'segment', tip: 'rapid', linia: expect.any(Number), a: [82, 50], b: [20, 17] }]);
  await aratTraseul(page);
  await laScara(page, 5, [70, 50]);
  const v = await fazaPeCentre(page);
  const c = await capturaStabila(page);
  const verdict = judeca(c.img, prims, v);
  noteaza('rapide', verdict);
  expect(verdict.motive).toEqual([]);
  expect(verdict.rapid.n).toBeGreaterThan(100);
  expect(verdict.taiere.n).toBeGreaterThan(1000);
  // Martorul 1: oracolul care citește G0 ca G1 vede tăieri în două culori.
  expect(judeca(c.img, citesteProgram(rapideCaTaieri(text), origineDinAntet(text)), v).motive.join()).toMatch(/tăierile nu au o singură culoare/);
  // Martorul 2: aceeași imagine, cu rapidele vopsite în culoarea tăierilor.
  const rc = verdict.rapid.culoare, tc = verdict.taiere.culoare;
  if (!rc || !tc) throw new Error('fără culori');
  const vopsit: Imagine = { ...c.img, aprinsi: c.img.aprinsi.map((p) => (p.rgba.join() === rc.join() ? { ...p, rgba: tc } : p)) };
  expect(judeca(vopsit, prims, v).motive.join()).toMatch(/rapidele au culoarea tăierilor/);
  // Și decalajul cu 1 px pică și aici.
  expect(decalari(c.img, prims, v, [[1, 0], [-1, 0], [0, 1], [0, -1]])).toEqual([]);
});

test('cercul Ø30 pe exterior la marginea foii de 2 440 mm, la 1 000 px/mm: raza 15 + 3, ±1 px (precizia relativă la bucată)', async ({ page }) => {
  await page.goto('/');
  await panouDeschis(page);
  await scrie(page, 'foaie-latime', '2440');
  await adauga(page, 'cerc');
  // Colțul stânga-jos al cutiei cercului în (2400, 35): centrul în (2415, 50); centrul frezei ajunge la 2433, iar
  // marginea ei la 2436, la 4 mm de marginea foii (mai aproape, exportul cere confirmarea ieșirii din foaie).
  await scrie(page, 'pozitie-x', '2400');
  await expect(page.locator('[data-camp="pozitie-y"]')).toHaveValue('35');
  const text = await exporta(page, { 'e1/e1': 'exterior' });
  expect(text).toContain('foaia 2440.000 x 200.000');
  expect(text).toContain('(e1/e1: cerc, exterior,');
  const prims = citesteProgram(text, origineDinAntet(text));
  const cerc: Punct[] = [];
  for (let u = 0; u < 2 * Math.PI; u += Math.PI / 720) cerc.push([2415 + 18 * Math.cos(u), 50 + 18 * Math.sin(u)]);
  const h = peHartie(prims, (p) => Math.abs(Math.hypot(p[0] - 2415, p[1] - 50) - 18), cerc);
  expect(h.departe).toBeLessThanOrEqual(0.001);
  expect(h.neacoperit).toBeLessThanOrEqual(0.021);

  // Foaia lățită a rămas în afara vederii: întâi toată foaia, ca traseul cercului să fie pe ecran (`data-varfuri` numără,
  // după cum se vede la rulare, doar vârfurile din vedere).
  await page.locator('[data-actiune="vedere.potriveste"]').click();
  await aratTraseul(page);
  for (const unghi of [0, 45]) {
    await page.locator('[data-actiune="vedere.potriveste"]').click();
    const u = (unghi * Math.PI) / 180;
    const v = await laScara(page, 1000, [2415 + 18 * Math.cos(u), 50 + 18 * Math.sin(u)]);
    expect(v.scara).toBe(1000);
    await expect(page.getByTestId('traseu-stare')).toHaveCount(0);
    const c = await capturaStabila(page);
    expect(c.aliniat).toBe(true);
    expect(c.diferente).toBe(0);
    const verdict = judeca(c.img, prims, v);
    noteaza(`cerc la ${unghi}°`, verdict);
    expect(verdict.motive, `la ${unghi}°`).toEqual([]);
    expect(verdict.esantioane, `la ${unghi}°`).toBeGreaterThan(2000);
    // Martorii: raza × 1,01 (180 px mai departe), decalat cu 1 px pe normala cercului în fereastră (sensul arcului, aici,
    // nu se poate întoarce: cercul e din două semicercuri, iar semicercul întors e celălalt, cu aceiași pixeli).
    expect(judeca(c.img, razaOri(prims, 1.01), v).ok, `la ${unghi}°`).toBe(false);
    const n: Punct = [Math.cos(u), -Math.sin(u)];
    expect(decalari(c.img, prims, v, [n, [-n[0], -n[1]]]), `la ${unghi}°`).toEqual([]);
  }
});

test('peste contract: același cerc la plafonul foii (10 000 mm), la 1 000 px/mm, unde float32 absolut ar avea pasul de 1 px', async ({ page }) => {
  // ADR 0038 §1: la 2 440 mm, pasul lui float32 (0,25 px) stă sub ±1 px; la 10 000 mm e 1 px. Proba e PARȚIALĂ: un desen
  // simulat cu vârfurile absolute în float32 (aceleași coarde, aceeași rasterizare) pică judecata în 8 din 20 de plasări
  // sub-pixel la 10 000 mm și doar în 3 din 20 la 2 440 mm: ±1 px, cu săgeata de ½ px, nu dovedește precizia relativă.
  await page.goto('/');
  await panouDeschis(page);
  await scrie(page, 'foaie-latime', '10000');
  await adauga(page, 'cerc');
  await scrie(page, 'pozitie-x', '9960');
  const text = await exporta(page, { 'e1/e1': 'exterior' });
  expect(text).toContain('foaia 10000.000 x 200.000');
  const prims = citesteProgram(text, origineDinAntet(text));
  const cerc: Punct[] = [];
  for (let u = 0; u < 2 * Math.PI; u += Math.PI / 720) cerc.push([9975 + 18 * Math.cos(u), 50 + 18 * Math.sin(u)]);
  const h = peHartie(prims, (p) => Math.abs(Math.hypot(p[0] - 9975, p[1] - 50) - 18), cerc);
  expect(h.departe).toBeLessThanOrEqual(0.001);
  expect(h.neacoperit).toBeLessThanOrEqual(0.021);
  await page.locator('[data-actiune="vedere.potriveste"]').click();
  await aratTraseul(page);
  for (const unghi of [0, 45]) {
    await page.locator('[data-actiune="vedere.potriveste"]').click();
    const u = (unghi * Math.PI) / 180;
    const v = await laScara(page, 1000, [9975 + 18 * Math.cos(u), 50 + 18 * Math.sin(u)]);
    expect(v.scara).toBe(1000);
    await expect(page.getByTestId('traseu-stare')).toHaveCount(0);
    const c = await capturaStabila(page);
    expect(c.aliniat).toBe(true);
    const verdict = judeca(c.img, prims, v);
    noteaza(`cerc 10 000 mm la ${unghi}°`, verdict);
    expect(verdict.motive, `la ${unghi}°`).toEqual([]);
    expect(verdict.esantioane, `la ${unghi}°`).toBeGreaterThan(2000);
  }
});

test('linia tăiată pe linie: traseul cade pe aceiași pixeli ca vectorul ei', async ({ page }) => {
  await page.goto('/');
  // Linia (50, 50) → (150, 50) pe foaie (în SVG, y crește în jos: y = 200 − 150).
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300mm" height="200mm" viewBox="0 0 300 200"><line x1="50" y1="150" x2="150" y2="150" stroke="black"/></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'linia.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg, 'utf8') });
  await page.locator('[data-buton="importa"]').click();
  const text = await exporta(page, { 'e1/deschise': 'pe-linie' });
  const prims = citesteProgram(text, origineDinAntet(text));
  expect(prims.filter((p) => p.tip === 'taiere')).toEqual([{ fel: 'segment', tip: 'taiere', linia: expect.any(Number), a: [50, 50], b: [150, 50] }]);
  await aratTraseul(page);
  // Nimic selectat: vectorul se desenează ca linie obișnuită, nu ca selecție.
  await page.keyboard.press('Escape');
  const v0 = await vedere(page);
  const b = await panza(page).boundingBox();
  if (!b) throw new Error('pânza n-are cutie');
  await page.mouse.click(b.x + v0.tx + 250 * v0.scara, b.y + v0.ty - 150 * v0.scara);
  await expect(page.getByTestId('selectie')).toContainText('Nimic selectat');
  await laScara(page, 10, [100, 50]);
  const v = await fazaPeCentre(page);
  const c = await capturaStabila(page);
  const verdict = judeca(c.img, prims, v);
  noteaza('linie', verdict);
  expect(verdict.motive).toEqual([]);
  expect(decalari(c.img, prims, v, [[0, 1], [0, -1]])).toEqual([]);
  // Vectorul, pe pânză: cerneala (diferența față de culoarea foii) pe fiecare coloană a liniei, în ±4 px.
  const [Xa, Y] = inPixeli([50, 50], v);
  const [Xb] = inPixeli([150, 50], v);
  const x0 = Math.ceil(Xa) + 2, x1 = Math.floor(Xb) - 2, y0 = Math.floor(Y) - 4;
  const cerneala = await page.evaluate(([x0, x1, y0]) => {
    const el = document.querySelector<HTMLCanvasElement>('[data-testid="panza"]');
    if (!el) throw new Error('fără pânză');
    const cv = document.createElement('canvas');
    cv.width = el.width;
    cv.height = el.height;
    const g = cv.getContext('2d');
    if (!g) throw new Error('fără 2D');
    g.drawImage(el, 0, 0);
    const d = g.getImageData(x0, y0, x1 - x0 + 1, 9).data;
    const v = getComputedStyle(document.documentElement).getPropertyValue('--panza-foaie').trim();
    const foaie = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    const rez: number[] = [];
    for (let k = 0; k < d.length; k += 4) rez.push(Math.abs((d[k] ?? 0) - (foaie[0] ?? 0)) + Math.abs((d[k + 1] ?? 0) - (foaie[1] ?? 0)) + Math.abs((d[k + 2] ?? 0) - (foaie[2] ?? 0)));
    return rez;
  }, [x0, x1, y0] as const);
  const w = x1 - x0 + 1;
  const randuriTraseu = new Map<number, number[]>();
  for (const p of c.img.aprinsi) if (p.x >= x0 && p.x <= x1) randuriTraseu.set(p.x, [...(randuriTraseu.get(p.x) ?? []), p.y]);
  let diferite = 0, abatere = 0;
  for (let x = x0; x <= x1; x++) {
    const col = Array.from({ length: 9 }, (_, j) => cerneala[j * w + (x - x0)] ?? 0);
    const max = Math.max(...col);
    const rv = y0 + col.indexOf(max);
    const rt = randuriTraseu.get(x) ?? [];
    if (rt.length !== 1 || rt[0] !== rv) diferite++;
    const suma = col.reduce((a, q) => a + q, 0);
    const centru = y0 + 0.5 + col.reduce((a, q, j) => a + q * j, 0) / suma;
    abatere = Math.max(abatere, Math.abs(centru - Y));
  }
  // Vectorul însuși stă pe linia de pe hârtie (centrul cernelii la cel mult ½ px), iar traseul aprinde, pe fiecare
  // coloană, exact rândul cel mai plin al vectorului.
  expect(abatere).toBeLessThanOrEqual(0.5);
  expect(diferite).toBe(0);
});
