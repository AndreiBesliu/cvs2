/**
 * Degroșarea reliefului (felia 18.1↑d-1, ADR 0310 §4, ADR 0313), judecată de oracolul 3D independent
 * (`test/oracles/relief3d.ts`): pe un platou adânc (buzunarul cu peretele plăcii), pe pană, pe calotă, pe valuri rotite și
 * oglindite, pe două reliefuri suprapuse și cu podeaua deasupra modelului:
 * - adaosul: pe fiecare segment de tăiere (16 sub-eșantioane), vârful nu coboară sub CL-ul cu adaosul (freza plată de rază
 *   R + a, plus a; cu fața plăcii în afara dreptunghiului, la „perete”) și nici sub podea;
 * - pasul pe trecere, pe material: nicio mutare nu intră mai adânc decât pasul, nicio rapidă nu atinge lemnul;
 * - lemnul rămas, pe hârtie: pe platou, a (și peretele neatins pe a); pe pană, a · (1 + g) (plus surplusul câmpului);
 * - degroșarea, apoi finisarea, pe același lemn: finisarea nu intră mai adânc decât pasul ei; invers (finisarea întâi, „A mea”),
 *   degroșarea nu atinge modelul plus adaosul și nu intră mai adânc decât pasul ei;
 * - coborârea: orice mutare de tăiere care coboară (și cea de la începutul unei linii, de pe perete în lemn) are viteza pe Z cel
 *   mult avansul de plonjare (`coborariRepeziO`), la degroșare și la finisare; trecerile, ⌈adâncimea / pas⌉.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { degrosareRelief, finisareRelief, type ParametriDegrosare, type ReliefCam } from '../../src/cam/reliefFinisare.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import {
  adaosPePlan, clAdaos, clExact, coborariRepeziO, IndexO, judecaDegrosarea, judecaTraseul, materialSecventaO, ramasO, triunghiuriModel, type PasAvansO,
  type PasO, type ZonaO,
} from '../oracles/relief3d.ts';

const Z_SIGUR = 5;

function grila(nx: number, ny: number, c: number, z: (x: number, y: number) => number): Float64Array {
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = z((i + 0.5) * c, (j + 0.5) * c);
  return v;
}

type M = ReliefCam['m'];
const T = (e: number, f: number): M => ({ a: 1, b: 0, c: 0, d: 1, e, f });
function rot(grade: number, e: number, f: number, oglinda = false): M {
  const t = (grade * Math.PI) / 180, co = Math.cos(t), si = Math.sin(t), s = oglinda ? -1 : 1;
  return { a: co * s, b: si * s, c: -si, d: co, e, f };
}
function relief(valori: Float64Array, nx: number, ny: number, c: number, m: M, dz: number): ReliefCam {
  return { nx, ny, celula: c, z: valori.map((v) => v + dz), m };
}
function triunghiuriLume(r: ReliefCam): Float64Array {
  const T0 = triunghiuriModel(r.z, r.nx, r.ny, r.celula), out = new Float64Array(T0.length);
  for (let k = 0; k < T0.length; k += 3) {
    const x = T0[k]!, y = T0[k + 1]!;
    out[k] = r.m.a * x + r.m.c * y + r.m.e; out[k + 1] = r.m.b * x + r.m.d * y + r.m.f; out[k + 2] = T0[k + 2]!;
  }
  return out;
}
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
function pasi(miscari: readonly Miscare[], x0: number, y0: number): PasAvansO[] {
  let x = x0, y = y0, z = Z_SIGUR;
  const out: PasAvansO[] = [{ x, y, z, rapida: true }];
  for (const m of miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    out.push(m.tip === 'rapida' ? { x, y, z, rapida: true } : { x, y, z, rapida: false, f: m.avans });
  }
  return out;
}
function zonaDin(p: readonly PasO[], l: number): ZonaO {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of p) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  return { x0: x0 - l, y0: y0 - l, x1: x1 + l, y1: y1 + l };
}

type Caz = Omit<ParametriDegrosare, 'zSigur' | 'avans' | 'avansPlonjare' | 'unghi' | 'margine'> & {
  readonly nume: string; readonly unghi?: number; readonly margine?: 'perete' | 'trece';
};

/** Rulează degroșarea și o judecă cu oracolul (adaosul, podeaua, pasul pe material, rapidele). */
function judeca(c: Caz): { readonly miscari: Miscare[]; readonly pasi: PasO[]; readonly treceri: number; readonly ix: IndexO } {
  const o: ParametriDegrosare = {
    ...c, unghi: c.unghi ?? 0, margine: c.margine ?? 'perete', zSigur: Z_SIGUR, avans: 1200, avansPlonjare: 400,
  };
  const r = degrosareRelief(o);
  if (!r.ok) assert.fail(`${c.nume}: ${r.motiv}`);
  const tri = concat(...c.reliefuri.map(triunghiuriLume), ...(o.margine === 'perete' ? c.reliefuri.map((x) => rama(x, c.raza + c.adaos + 2)) : []));
  const ix = new IndexO(tri, 2);
  const p = pasi(r.miscari, 0, 0);
  const probleme = judecaDegrosarea(ix, c.raza, c.adaos, p, { podea: -c.adancime, pas: c.pas, zona: zonaDin(p, c.raza + 1), pasGrila: 0.2, tol: 1e-6 });
  assert.deepEqual(probleme.slice(0, 3), [], `${c.nume}: ${probleme.length} probleme`);
  // Coborârea în lemn: nicio mutare de tăiere nu coboară mai repede decât avansul de plonjare (și cea pe loc îl are întreg).
  assert.deepEqual(coborariRepeziO(p, 400).slice(0, 3), [], `${c.nume}: coborâri prea repezi`);
  // Și invers: o mutare de tăiere care nu coboară (palierul, urcarea) merge cu avansul de tăiere, nu încetinită la plonjare.
  for (let k = 1; k < p.length; k++) {
    const q = p[k]!;
    if (!q.rapida && q.z >= p[k - 1]!.z - 1e-9) assert.equal(q.f, 1200, `${c.nume}: pasul ${k} nu coboară, dar are avansul ${q.f}`);
  }
  let zc = Z_SIGUR;
  for (const m of r.miscari) {
    if (m.tip !== 'taiere' && m.tip !== 'rapida') continue;
    const z = m.la.Z ?? zc;
    if (m.tip === 'taiere' && m.la.X === undefined && m.la.Y === undefined && z < zc) assert.equal(m.avans, 400, `${c.nume}: o coborâre pe loc fără avansul de plonjare`);
    zc = z;
  }
  return { miscari: r.miscari, pasi: p, treceri: r.treceri, ix };
}

test('platoul (buzunarul cu peretele plăcii): adaosul pe fund, peretele neatins pe a, trecerile ⌈(adâncimea − a) / pas⌉', () => {
  const c = 0.5, nx = 60, ny = 40, R = 3, a = 0.5;
  const r = relief(grila(nx, ny, c, () => 0), nx, ny, c, T(10, 20), -6);
  const j = judeca({ nume: 'platou', reliefuri: [r], raza: R, adaos: a, pasLateral: 2.4, pas: 2, adancime: 20 });
  assert.equal(j.treceri, Math.ceil((6 - a) / 2));
  const lemn = materialSecventaO([{ pasi: j.pasi, f: { fel: 'plata', R } }], { x0: 5, y0: 15, x1: 45, y1: 45 }, 0.1, 0, 0.02).lemn;
  // Pe rândul din mijloc (y = 30, în lume), de la a + 0,3 de pereții din stânga și din dreapta: rămân a deasupra fundului.
  const mijloc = ramasO(lemn, () => -6, 0, (x, y) => Math.abs(y - 30) < 0.06 && x > 10 + a + 0.3 && x < 40 - a - 0.3);
  assert.ok(mijloc.coloane > 200 && Math.abs(mijloc.min - a) < 1e-9 && Math.abs(mijloc.max - a) < 1e-9, `fundul: ${mijloc.min} … ${mijloc.max}`);
  // Lângă perete, pe a: nicio coloană atinsă.
  assert.equal(ramasO(lemn, () => -6, 0, (x, y) => Math.abs(y - 30) < 0.06 && (x < 10 + a - 0.05 || x > 40 - a + 0.05)).coloane, 0);
});

test('pana 0 → −5 mm (g = 0,25), liniile de-a lungul pantei: rămâne a · (1 + g), cel mult cu surplusul câmpului', () => {
  const c = 0.5, nx = 40, ny = 30, R = 2, a = 0.4, g = 0.25;
  const r = relief(grila(nx, ny, c, (x) => x * g), nx, ny, c, T(0, 0), -5);
  const j = judeca({ nume: 'pana', reliefuri: [r], raza: R, adaos: a, pasLateral: 2, pas: 2, adancime: 10, margine: 'trece' });
  const lemn = materialSecventaO([{ pasi: j.pasi, f: { fel: 'plata', R } }], { x0: -4, y0: -4, x1: 24, y1: 19 }, 0.1, 0, 0.02).lemn;
  const hartie = adaosPePlan(R, a, g);
  // Pe hârtie: sub linie, a · (1 + g) (buza de sus a frezei, la R + a, lasă a pe verticală, iar cea de jos, la R în urmă, încă
  // a · g); între două linii (s = 2 mm), buza de jos ajunge doar la √(R² − (s/2)²) în urmă: încă g · (R − √(R² − (s/2)²)).
  // Surplusul câmpului: celula de calcul (h = 1/16 mm) și segmentul liniei, cel mult 2 · h · g.
  const h = 0.0625, s = 2, asteptat = a * (1 + g), intre = g * (R - Math.sqrt(R * R - (s / 2) ** 2)), surplus = 2 * h * g;
  const ram = ramasO(lemn, (x) => x * g - 5, 0, (x, y) => x > 3 && x < 14 && y > 3 && y < 12);
  assert.ok(ram.coloane > 1000, `${ram.coloane} coloane`);
  assert.ok(ram.min >= asteptat - 1e-6 && ram.min <= asteptat + surplus + 1e-6, `cel mai puțin ${ram.min}, pe hârtie ${asteptat} (+${surplus})`);
  assert.ok(ram.max <= asteptat + intre + surplus + 1e-6, `cel mai mult ${ram.max}, pe hârtie ${asteptat + intre} (+${surplus})`);
  // Pe normală, cel puțin a.
  assert.ok(hartie.normala >= a);
});

test('pana cu liniile peste pantă (90°): rămâne între a · (1 + g) și a · (1 + g) + g · s, plus surplusul', () => {
  const c = 0.5, nx = 40, ny = 30, R = 2, a = 0.4, g = 0.25, s = 1.5;
  const r = relief(grila(nx, ny, c, (x) => x * g), nx, ny, c, T(0, 0), -5);
  const j = judeca({ nume: 'pana 90°', reliefuri: [r], raza: R, adaos: a, unghi: 90, pasLateral: s, pas: 2, adancime: 10, margine: 'trece' });
  const lemn = materialSecventaO([{ pasi: j.pasi, f: { fel: 'plata', R } }], { x0: -4, y0: -4, x1: 24, y1: 19 }, 0.1, 0, 0.02).lemn;
  const ram = ramasO(lemn, (x) => x * g - 5, 0, (x, y) => x > 3 && x < 14 && y > 3 && y < 12);
  // Peste linii: o coloană e tăiată cel mai jos de linia cea mai din vale aflată la cel mult R de ea, deci rămâne cel mult cu
  // g · s peste a · (1 + g); surplusul câmpului, cel mult 2 · h · g.
  const surplus = 2 * 0.0625 * g;
  assert.ok(ram.min >= a * (1 + g) - 1e-6 && ram.max <= a * (1 + g) + g * s + surplus + 1e-6, `rămas ${ram.min} … ${ram.max}`);
});

test('calota, rotită și oglindită, cu marginea „perete” și „trece”: adaosul, pasul, trecerile', () => {
  const c = 0.5, n = 40, Rs = 8;
  const v = grila(n, n, c, (x, y) => { const d2 = (x - 10) ** 2 + (y - 10) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; });
  for (const [m, margine] of [[T(30, 40), 'perete'], [rot(35, 30, 25), 'trece'], [rot(-20, 20, 30, true), 'perete']] as const) {
    const j = judeca({ nume: `calota ${margine}`, reliefuri: [relief(v, n, n, c, m, -Rs - 1)], raza: 3, adaos: 0.5, margine, pasLateral: 2.4, pas: 2.5, adancime: 20 });
    const jos = -Math.min(...j.pasi.map((p) => p.z));
    assert.equal(j.treceri, Math.ceil(jos / 2.5 - 1e-9));
  }
});

test('valuri, două reliefuri suprapuse, podeaua deasupra modelului, la un unghi oarecare', () => {
  const c = 0.5, nx = 36, ny = 30;
  const val = grila(nx, ny, c, (x, y) => 3 + 2 * Math.sin(x * 0.6) * Math.cos(y * 0.45) + 0.7 * Math.sin(x * 1.9 + y));
  const r1 = relief(val, nx, ny, c, rot(15, 10, 8), -7);
  const r2 = relief(grila(24, 24, c, (x, y) => 4 - 0.1 * ((x - 6) ** 2 + (y - 6) ** 2) ** 0.5), 24, 24, c, rot(-30, 18, 14), -6);
  // Cu marginea „trece”: modelul exact e chiar reuniunea celor două (cu „perete”, rama unuia ar trece peste celălalt).
  judeca({ nume: 'valuri și cupola', reliefuri: [r1, r2], raza: 2, adaos: 0.6, unghi: 37, pasLateral: 1.8, pas: 1.5, adancime: 20, margine: 'trece' });
  // Podeaua la 4 mm: deasupra fundului valurilor.
  const j = judeca({ nume: 'valuri cu podea', reliefuri: [r1], raza: 2, adaos: 0.3, unghi: 0, pasLateral: 2, pas: 1.5, adancime: 4, margine: 'trece' });
  assert.ok(Math.min(...j.pasi.map((p) => p.z)) >= -4 + 0.3 - 1e-9, 'podeaua plus adaosul');
});

test('degroșarea, apoi finisarea, pe același lemn: finisarea nu intră mai adânc decât pasul ei; nimic sub model; coborârile, cu plonjarea', () => {
  const c = 0.5, n = 40, Rs = 8;
  const v = grila(n, n, c, (x, y) => { const d2 = (x - 10) ** 2 + (y - 10) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; });
  const r = relief(v, n, n, c, T(5, 5), -Rs - 1);
  const deg = degrosareRelief({ reliefuri: [r], raza: 3, adaos: 0.5, unghi: 0, margine: 'perete', pasLateral: 2.4, pas: 2.5, adancime: 20, zSigur: Z_SIGUR, avans: 1200, avansPlonjare: 400 });
  const fin = finisareRelief({ reliefuri: [r], freza: { fel: 'bila', raza: 1.5 }, unghi: 0, nealiniat: false, margine: 'perete', pasLateral: 0.5, pas: 3, adancime: 20, zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300 });
  assert.ok(deg.ok && fin.ok);
  const pd = pasi(deg.miscari, 0, 0), pf = pasi(fin.miscari, 0, 0), zona = { x0: 0, y0: 0, x1: 30, y1: 30 };
  // Coborârea: nici degroșarea, nici finisarea nu intră în lemn mai repede decât avansul de plonjare (și pe peretele calotei).
  assert.deepEqual(coborariRepeziO(pd, 400).slice(0, 3), []);
  assert.deepEqual(coborariRepeziO(pf, 300).slice(0, 3), []);
  const inainte = materialSecventaO([{ pasi: pd, f: { fel: 'plata', R: 3 } }, { pasi: pf, f: { fel: 'bila', R: 1.5 } }], zona, 0.2, 0, 0.04);
  assert.ok(inainte.blocuri[0]!.taiere <= 2.5 + 0.05 && inainte.blocuri[1]!.taiere <= 3 + 0.05, `adâncimi ${inainte.blocuri.map((b) => b.taiere)}`);
  assert.ok(inainte.blocuri.every((b) => b.rapida === 0));
  // Finisarea întâi (ordinea de mână): degroșarea de după rămâne deasupra modelului plus adaos și nu intră mai adânc decât pasul.
  const invers = materialSecventaO([{ pasi: pf, f: { fel: 'bila', R: 1.5 } }, { pasi: pd, f: { fel: 'plata', R: 3 } }], zona, 0.2, 0, 0.04);
  assert.ok(invers.blocuri[1]!.taiere <= 2.5 + 0.05 && invers.blocuri.every((b) => b.rapida === 0));
  const ix = new IndexO(concat(triunghiuriLume(r), rama(r, 6)), 2);
  assert.deepEqual(judecaTraseul(ix, { fel: 'bila', R: 1.5 }, pf, { podea: -20, tol: 1e-6, sub: 4 }).slice(0, 2), []);
  for (const q of pd) if (!q.rapida) assert.ok(q.z >= clAdaos(ix, 3, 0.5, q.x, q.y, -20) - 1e-6);
  // Lemnul de la capăt: nicăieri sub model (bila), deci nici degroșarea nu l-a atins.
  const zModel = (x: number, y: number): number => clExact(new IndexO(triunghiuriLume(r), 2), { fel: 'plata', R: 1e-9 }, x, y, -Infinity);
  assert.ok(ramasO(inainte.lemn, zModel, 0, (x, y) => x > 7 && x < 23 && y > 7 && y < 23).min >= -1e-6);
});

test('refuzurile: raza, pasul lateral peste diametru, pasul, adaosul, unghiul, fără reliefuri; nimic de tăiat e un avertisment', () => {
  const c = 0.5, r = relief(grila(10, 10, c, () => 0), 10, 10, c, T(0, 0), -2);
  const baza: ParametriDegrosare = { reliefuri: [r], raza: 2, adaos: 0.5, unghi: 0, margine: 'perete', pasLateral: 2, pas: 1, adancime: 10, zSigur: 5, avans: 1, avansPlonjare: 1 };
  for (const [k, v] of [['raza', 0], ['pasLateral', 4.5], ['pas', 0], ['adaos', -0.1], ['unghi', 180]] as const) {
    const x = degrosareRelief({ ...baza, [k]: v });
    assert.ok(!x.ok, `${k} = ${v} trebuia refuzat`);
  }
  assert.ok(!degrosareRelief({ ...baza, reliefuri: [] }).ok);
  // Adaosul mai mare decât adâncimea reliefului: degroșarea n-are ce tăia, cu avertismentul.
  const nimic = degrosareRelief({ ...baza, adaos: 2.5 });
  assert.ok(nimic.ok && nimic.miscari.length === 0 && nimic.avertismente.some((t) => t.includes('degroșarea n-are ce tăia')));
  // Aceeași intrare, aceleași mișcări.
  assert.deepEqual(degrosareRelief(baza), degrosareRelief(baza));
});
