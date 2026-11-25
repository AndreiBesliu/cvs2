/**
 * Finisarea paralelă a reliefului (felia 18.1↑c-2, ADR 0310 §4–§6, ADR 0312), judecată de oracolul 3D independent
 * (`test/oracles/relief3d.ts`): pe calotă, pe pană, pe un relief cu un perete subțire de o celulă și pe valuri, cu bila, plata
 * și V-ul, aliniat și la un unghi, cu marginea „perete” și „trece”, rotit, oglindit și scalat, două reliefuri suprapuse:
 * - invarianta 4: pe fiecare segment al traseului (16 sub-eșantioane), vârful nu coboară sub CL-ul exact al modelului (cu fața
 *   plăcii în afara dreptunghiului, la „perete”); nici sub podea;
 * - pasul pe trecere, pe material (simulatorul de material al oracolului): nicio mutare nu intră mai adânc decât pasul, iar
 *   nicio rapidă nu atinge lemnul;
 * - creasta pe un plan, măsurată de simulatorul independent: cât spune formula pe hârtie, R − √(R² − (s/2)²);
 * - trecerile: ⌈adâncimea / pas⌉.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finisareRelief, type FrezaFinisare, type ParametriFinisare, type ReliefCam } from '../../src/cam/reliefFinisare.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import {
  clExact, clPlan, creastaPlan, creastaSimulata, IndexO, judecaTraseul, materialO, suprafataBila, triunghiuriModel, type FrezaO, type PasO, type PunctO,
} from '../oracles/relief3d.ts';

const Z_SIGUR = 5;

/** O grilă din funcție, în centrele celulelor (rândul j în sus). */
function grila(nx: number, ny: number, c: number, z: (x: number, y: number) => number): Float64Array {
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = z((i + 0.5) * c, (j + 0.5) * c);
  return v;
}

type M = ReliefCam['m'];
const T = (e: number, f: number): M => ({ a: 1, b: 0, c: 0, d: 1, e, f });
/** Rotire cu `grade` (și oglindire pe X, la cerere), apoi mutare. */
function rot(grade: number, e: number, f: number, oglinda = false): M {
  const t = (grade * Math.PI) / 180, co = Math.cos(t), si = Math.sin(t), s = oglinda ? -1 : 1;
  return { a: co * s, b: si * s, c: -si, d: co, e, f };
}

/** Un relief cu valorile date, mutat cu `dz` (cotele în lume), în transformarea `m`. */
function relief(valori: Float64Array, nx: number, ny: number, c: number, m: M, dz: number): ReliefCam {
  return { nx, ny, celula: c, z: valori.map((v) => v + dz), m };
}

/** Triunghiurile modelului unui relief, în lume. */
function triunghiuriLume(r: ReliefCam): Float64Array {
  const T0 = triunghiuriModel(r.z, r.nx, r.ny, r.celula), out = new Float64Array(T0.length);
  for (let k = 0; k < T0.length; k += 3) {
    const x = T0[k]!, y = T0[k + 1]!;
    out[k] = r.m.a * x + r.m.c * y + r.m.e; out[k + 1] = r.m.b * x + r.m.d * y + r.m.f; out[k + 2] = T0[k + 2]!;
  }
  return out;
}

/** Fața plăcii (Z = 0) în jurul dreptunghiului reliefului, o ramă lată `l`, în lume (marginea „perete”). */
function rama(r: ReliefCam, l: number): Float64Array {
  const W = r.nx * r.celula, H = r.ny * r.celula, out: number[] = [];
  const quad = (x0: number, y0: number, x1: number, y1: number): void => {
    const p = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [r.m.a * x! + r.m.c * y! + r.m.e, r.m.b * x! + r.m.d * y! + r.m.f, 0]);
    out.push(...p[0]!, ...p[1]!, ...p[2]!, ...p[0]!, ...p[2]!, ...p[3]!);
  };
  quad(-l, -l, W + l, 0); quad(-l, H, W + l, H + l); quad(-l, 0, 0, H); quad(W, 0, W + l, H);
  return Float64Array.from(out);
}

const concat = (...a: Float64Array[]): Float64Array => {
  const out = new Float64Array(a.reduce((s, x) => s + x.length, 0));
  let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; }
  return out;
};

/** Pozițiile vârfului, din mișcări, pornind din (x0, y0, Z sigur). */
function pasi(miscari: readonly Miscare[], x0: number, y0: number): PasO[] {
  let x = x0, y = y0, z = Z_SIGUR;
  const out: PasO[] = [{ x, y, z, rapida: true }];
  for (const m of miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    out.push({ x, y, z, rapida: m.tip === 'rapida' });
  }
  return out;
}

const frezaO = (f: FrezaFinisare): FrezaO => (f.fel === 'v' ? { fel: 'v', R: f.raza, alfa: (f.unghi * Math.PI) / 360, t: f.varf / 2 } : { fel: f.fel, R: f.raza });

type Caz = {
  readonly nume: string; readonly reliefuri: readonly ReliefCam[]; readonly freza: FrezaFinisare;
  readonly unghi?: number; readonly nealiniat?: boolean; readonly margine?: 'perete' | 'trece';
  readonly pasLateral: number; readonly pas: number; readonly adancime: number;
};

/** Rulează finisarea și o judecă cu oracolul: scobitura, podeaua, rapidele, pasul pe trecere pe material. */
function judeca(c: Caz): { readonly miscari: Miscare[]; readonly pasi: PasO[]; readonly treceri: number } {
  const o: ParametriFinisare = {
    reliefuri: c.reliefuri, freza: c.freza, unghi: c.unghi ?? 0, nealiniat: c.nealiniat ?? false, margine: c.margine ?? 'perete',
    pasLateral: c.pasLateral, pas: c.pas, adancime: c.adancime, zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
  };
  const r = finisareRelief(o);
  if (!r.ok) assert.fail(`${c.nume}: ${r.motiv}`);
  const f = frezaO(c.freza);
  const tri = concat(...c.reliefuri.map(triunghiuriLume), ...(o.margine === 'perete' ? c.reliefuri.map((x) => rama(x, f.R + 2)) : []));
  const ix = new IndexO(tri, 2);
  const p = pasi(r.miscari, 0, 0);
  // Invarianta 4 și podeaua, pe tot traseul (rapidele stau la Z sigur, deasupra a tot).
  const probleme = judecaTraseul(ix, f, p, { podea: -c.adancime, tol: 1e-6, sub: 16 });
  assert.deepEqual(probleme.slice(0, 3), [], `${c.nume}: scobituri (${probleme.length})`);
  assert.ok(p.every((q) => q.z >= -c.adancime - 1e-9), `${c.nume}: sub podea`);
  // Pasul pe trecere și rapidele, pe material.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of p) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  const mat = materialO(p, f, { x0: x0 - f.R - 1, y0: y0 - f.R - 1, x1: x1 + f.R + 1, y1: y1 + f.R + 1 }, 0.2, 0, 0.04);
  assert.ok(mat.taiere <= c.pas + 0.03, `${c.nume}: o mutare intră ${mat.taiere} mm în lemn (pasul ${c.pas}) la ${JSON.stringify(mat.unde)}`);
  assert.equal(mat.rapida, 0, `${c.nume}: o rapidă atinge lemnul (${mat.rapida} mm la ${JSON.stringify(mat.undeRapida)})`);
  return { miscari: r.miscari, pasi: p, treceri: r.treceri };
}

const bila = (raza: number): FrezaFinisare => ({ fel: 'bila', raza });

test('calota cu bila Ø6, aliniat la 0°, peretele rămâne: fără scobituri, pasul pe material, trecerile', () => {
  const c = 0.5, n = 40, Rs = 8;
  const v = grila(n, n, c, (x, y) => { const d2 = (x - 10) ** 2 + (y - 10) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; });
  const r = relief(v, n, n, c, T(30, 40), -Rs);
  const j = judeca({ nume: 'calota', reliefuri: [r], freza: bila(3), pasLateral: 1, pas: 3, adancime: 20 });
  // Trecerile urmează cel mai adânc CL (bila nu ajunge în colțuri lângă calotă): ⌈adâncimea traseului / pas⌉.
  const jos = -Math.min(...j.pasi.map((p) => p.z));
  assert.ok(jos > 3 && jos < 8, `cel mai jos: ${jos}`);
  assert.equal(j.treceri, Math.ceil(jos / 3 - 1e-9));
});

test('pana 0 → 5 mm, la 30°, cu freza trecând de margine, cu bila, plata și V90', () => {
  const c = 0.5, nx = 40, ny = 30;
  const v = grila(nx, ny, c, (x) => (x / 20) * 5);
  for (const freza of [bila(2), { fel: 'plata', raza: 1.5 } as const, { fel: 'v', raza: 3, unghi: 90, varf: 0 } as const]) {
    judeca({ nume: `pana ${freza.fel}`, reliefuri: [relief(v, nx, ny, c, T(10, 10), -5)], freza, unghi: 30, margine: 'trece', pasLateral: 1, pas: 2, adancime: 8 });
  }
});

test('un perete subțire de o celulă (ADR 0310 §11: eșantionul în nod sapă aici) și valuri, rotite, oglindite', () => {
  const c = 0.5, nx = 30, ny = 30;
  const perete = grila(nx, ny, c, (x) => (Math.abs(x - 7.75) < 0.01 ? 6 : 1));
  judeca({ nume: 'perete subțire', reliefuri: [relief(perete, nx, ny, c, rot(25, 20, 5), -6)], freza: bila(1.5), unghi: 90, pasLateral: 0.5, pas: 2.5, adancime: 10 });
  judeca({ nume: 'perete subțire, plata', reliefuri: [relief(perete, nx, ny, c, rot(25, 20, 5, true), -6)], freza: { fel: 'plata', raza: 1 }, unghi: 0, pasLateral: 1, pas: 2.5, adancime: 10 });
  const valuri = grila(nx, ny, c, (x, y) => 2 + Math.sin(x * 1.3) * Math.cos(y * 0.9) + 0.5 * Math.sin(x * 3.1 + y * 2.3));
  judeca({ nume: 'valuri', reliefuri: [relief(valuri, nx, ny, c, rot(-40, 15, 12), -3.6)], freza: { fel: 'v', raza: 2, unghi: 60, varf: 0.2 }, unghi: 70, nealiniat: true, pasLateral: 0.4, pas: 1.5, adancime: 10 });
});

test('podeaua oprește finisarea; scalarea uniformă (celula în lume); planul zero sub față lasă relieful deasupra tăiat la față', () => {
  const c = 0.25, n = 40;
  const v = grila(n, n, c, (x, y) => 4 - Math.hypot(x - 5, y - 5));
  // Podeaua la 2 mm: tot ce e mai jos rămâne la −2.
  const j = judeca({ nume: 'podea', reliefuri: [relief(v, n, n, c * 1.5, T(0, 0), -4)], freza: bila(1), pasLateral: 0.5, pas: 1, adancime: 2 });
  assert.equal(Math.min(...j.pasi.map((p) => p.z)), -2);
  // Relieful ridicat cu 1 mm peste față (planul zero la 3 mm, vârful la +1): nimic nu se taie deasupra feței, iar avertismentul o spune.
  const o = finisareRelief({
    reliefuri: [relief(v, n, n, c, T(0, 0), -3)], freza: bila(1), unghi: 0, nealiniat: false, margine: 'perete',
    pasLateral: 0.5, pas: 1, adancime: 10, zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
  });
  assert.ok(o.ok && o.avertismente.some((a) => /deasupra feței/.test(a)));
});

// Cu marginea „trece”: modelul exact e chiar cele două reliefuri (cu „perete”, fața plăcii ar fi în afara reuniunii lor, pe care
// rama unui relief n-o spune; peretele e probat pe reliefurile singure).
test('două reliefuri suprapuse: fiecare cu liniile lui, nicio scobitură în celălalt („păstrează înalt”)', () => {
  const c = 0.5, n = 24;
  const a = grila(n, n, c, (x, y) => 3 + Math.sin(x) * Math.sin(y));
  const b = grila(n, n, c, (x) => 1 + x / 6);
  judeca({
    nume: 'suprapuse', reliefuri: [relief(a, n, n, c, T(0, 0), -4.2), relief(b, n, n, c, rot(35, 6, -2), -4.2)],
    freza: bila(1.5), margine: 'trece', pasLateral: 0.6, pas: 2, adancime: 12,
  });
});

test('creasta pe un plan, cu bila: cât spune formula pe hârtie, R − √(R² − (s/2)²)', () => {
  const c = 0.5, n = 60;
  for (const [R, s] of [[3, 1], [3, 1.5], [1.5, 0.5]] as const) {
    const v = grila(n, n, c, () => 2);
    const r = relief(v, n, n, c, T(0, 0), -4);
    const o = finisareRelief({
      reliefuri: [r], freza: bila(R), unghi: 0, nealiniat: false, margine: 'trece', pasLateral: s, pas: 10, adancime: 10,
      zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
    });
    assert.ok(o.ok);
    // Trecerile de tăiere, ca liste de puncte; creasta în mijlocul reliefului, departe de capete.
    const treceri: PunctO[][] = [];
    let cur: PunctO[] = [];
    let x = 0, y = 0, z = Z_SIGUR;
    for (const m of o.miscari) {
      if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
      x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
      if (m.tip === 'rapida' || Math.abs(z + 2) > 1e-9) { if (cur.length > 1) treceri.push(cur); cur = []; continue; }
      cur.push({ x, y, z });
    }
    if (cur.length > 1) treceri.push(cur);
    const puncte: Array<readonly [number, number]> = [];
    for (let q = 0; q <= 300; q++) puncte.push([15 + (q % 3) * 0.37, 12 + (q * 6) / 300]);
    const masurata = creastaSimulata(treceri, R, puncte, () => -2, 0.02);
    const hartie = creastaPlan(R, o.pasLateral);
    assert.ok(Math.abs(masurata - hartie) < 2e-3, `R ${R}, s ${s}: creasta ${masurata}, pe hârtie ${hartie}`);
  }
});

test('refuzurile: pasul lateral peste diametru, unghiul în afară, fără relief', () => {
  const r = relief(grila(4, 4, 1, () => 0), 4, 4, 1, T(0, 0), -1);
  const baza: ParametriFinisare = {
    reliefuri: [r], freza: bila(1), unghi: 0, nealiniat: false, margine: 'perete', pasLateral: 0.5, pas: 1, adancime: 5,
    zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
  };
  const motiv = (o: Partial<ParametriFinisare>): string => { const x = finisareRelief({ ...baza, ...o }); return x.ok ? '' : x.motiv; };
  assert.match(motiv({ pasLateral: 2.01 }), /pasul lateral/);
  assert.match(motiv({ unghi: 180 }), /unghiul/);
  assert.match(motiv({ reliefuri: [] }), /niciun relief/);
  assert.equal(motiv({}), '');
});

test('celula fină (sub 1/16 mm: câmpul pe cele 9 puncte, fără diviziune): un perete subțire și valuri, fără scobituri', () => {
  const c = 0.05, n = 80;
  const perete = grila(n, n, c, (x) => (Math.abs(x - 2.025) < 0.001 ? 1.5 : 0.2));
  judeca({ nume: 'perete fin', reliefuri: [relief(perete, n, n, c, rot(15, 3, 4), -1.5)], freza: bila(0.5), unghi: 90, pasLateral: 0.1, pas: 1, adancime: 4 });
  const valuri = grila(n, n, c, (x, y) => 1 + 0.4 * Math.sin(x * 4) * Math.cos(y * 3));
  judeca({ nume: 'valuri fine', reliefuri: [relief(valuri, n, n, c, T(1, 1), -1.4)], freza: { fel: 'plata', raza: 0.4 }, unghi: 0, pasLateral: 0.2, pas: 1, adancime: 4 });
});

test('surplusul pe o pantă de 30°: cel mult (1,5–2) · celula de calcul · tan(pantă) (s5 §2), fără scobitură', () => {
  // Pe o pantă de 30°, cu celula reliefului de 0,5 mm (de calcul, 1/16 mm), departe de margini.
  const c = 0.5, n = 40, g = Math.tan(Math.PI / 6);
  const v = grila(n, n, c, (x) => g * x);
  const r = relief(v, n, n, c, T(0, 0), -g * 20);
  const o = finisareRelief({
    reliefuri: [r], freza: bila(2), unghi: 0, nealiniat: false, margine: 'trece', pasLateral: 0.5, pas: 100, adancime: 30,
    zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
  });
  assert.ok(o.ok);
  let max = 0, min = Infinity;
  for (const m of o.miscari) {
    if (m.tip !== 'taiere' || m.la.X === undefined || m.la.Y === undefined || m.la.Z === undefined) continue;
    const x = m.la.X, y = m.la.Y;
    if (x < 3 || x > 17 || y < 3 || y > 17) continue;
    const d = m.la.Z - clPlan({ fel: 'bila', R: 2 }, g, 0, -g * 20, x, y);
    max = Math.max(max, d); min = Math.min(min, d);
  }
  assert.ok(min >= -1e-9, `scobitură: ${min}`);
  assert.ok(max <= 2 * 0.0625 * g + 1e-6, `surplusul ${max} trece de 2 · h · tan 30° = ${2 * 0.0625 * g}`);
  // Și ce rămâne după finisare: suprafața lăsată de bilă (simulatorul independent, peste mutările de tăiere), cu fața plăcii
  // (Z = 0) acolo unde bila n-a trecut. Un traseu ridicat peste lemn n-ar mai tăia, iar măsura de mai sus nu l-ar vedea.
  const treceri: PunctO[][] = [];
  let cur: PunctO[] = [];
  let px = 0, py = 0, pz = Z_SIGUR;
  for (const m of o.miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
    px = m.la.X ?? px; py = m.la.Y ?? py; pz = m.la.Z ?? pz;
    if (m.tip === 'rapida') { if (cur.length > 1) treceri.push(cur); cur = [{ x: px, y: py, z: pz }]; continue; }
    cur.push({ x: px, y: py, z: pz });
  }
  if (cur.length > 1) treceri.push(cur);
  let ramas = 0;
  for (let q = 0; q < 120; q++) {
    const x = 4 + (q % 12) * 1.1, y = 4 + Math.floor(q / 12) * 1.3;
    ramas = Math.max(ramas, Math.min(0, suprafataBila(treceri, 2, x, y, 0.02)) - (g * x - g * 20));
  }
  // Creasta dintre linii pe panta de-a lungul lor: (R − √(R² − (s/2)²)) / cos 30°; plus surplusul și eșantionarea.
  const limita = creastaPlan(2, 0.5) / Math.cos(Math.PI / 6) + 2 * 0.0625 * g + 0.01;
  assert.ok(ramas <= limita, `rămâne ${ramas} mm deasupra pantei (cel mult ${limita})`);
});

test('creasta la 30° (liniile la cel mult pasul cerut): cel mult cât formula cu pasul cerut', () => {
  const c = 0.5, n = 60, R = 3, s = 1;
  const r = relief(grila(n, n, c, () => 2), n, n, c, T(0, 0), -4);
  const o = finisareRelief({
    reliefuri: [r], freza: bila(R), unghi: 30, nealiniat: false, margine: 'trece', pasLateral: s, pas: 10, adancime: 10,
    zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
  });
  assert.ok(o.ok);
  assert.ok(o.pasLateral <= s + 1e-12 && o.pasLateral > 0.9 * s, `pasul folosit ${o.pasLateral}`);
  const treceri: PunctO[][] = [];
  let cur: PunctO[] = [], x = 0, y = 0, z = Z_SIGUR;
  for (const m of o.miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    if (m.tip === 'rapida' || Math.abs(z + 2) > 1e-9) { if (cur.length > 1) treceri.push(cur); cur = []; continue; }
    cur.push({ x, y, z });
  }
  if (cur.length > 1) treceri.push(cur);
  const puncte: Array<readonly [number, number]> = [];
  for (let q = 0; q <= 400; q++) puncte.push([12 + (q % 7) * 0.31, 10 + (q * 8) / 400]);
  const m = creastaSimulata(treceri, R, puncte, () => -2, 0.02);
  assert.ok(m <= creastaPlan(R, s) + 2e-4, `creasta ${m}, pe hârtie cel mult ${creastaPlan(R, s)}`);
  assert.ok(m >= creastaPlan(R, o.pasLateral) - 2e-3, `creasta ${m}, sub cea a pasului folosit ${creastaPlan(R, o.pasLateral)}`);
});

/** Un relief aspru: valori pseudoaleatoare, deterministe, între 0 și `a`. */
function aspru(n: number, a: number, samanta: number): Float64Array {
  const v = new Float64Array(n * n);
  let s = samanta;
  for (let k = 0; k < v.length; k++) {
    s = (s * 48271) % 2147483647;
    v[k] = (s / 2147483647) * a;
  }
  return v;
}

test('relieful aspru, cu V-ul, la celula fină (câmpul pe 9 puncte), cu liniile nealiniate la 33°', () => {
  // Pante sub cot(θ/2) / 2: aici maximul unei celule poate sta pe latura ei sau în colț, nu în centrul unei vecine. Liniile
  // nealiniate: pe cele aliniate, fiecare segment trece prin celulele vecine, iar câmpul lor ascunde un maxim uitat (diagonala
  // fixă și V-ul cu vârf plat le prind valurile de mai sus).
  const c = 0.05, n = 40, v = aspru(n, 0.6 * c, 11);
  let max = 0;
  for (const x of v) max = Math.max(max, x);
  judeca({
    nume: 'aspru, V90 la 33°', reliefuri: [relief(v, n, n, c, T(1, 1), -max)], freza: { fel: 'v', raza: 0.4, unghi: 90, varf: 0 },
    unghi: 33, nealiniat: true, margine: 'trece', pasLateral: 0.7 * c, pas: 1, adancime: 2,
  });
});
