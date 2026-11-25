/**
 * Decorațiunile de Crăciun din atelierul Easy 3Draw (ADR 0285, felia 3.Cl-1): fulgul, steaua și brăduțul, pe plasele reale
 * ale motorului.
 * - fiecare formă are aici **modelul ei de pe hârtie** (miezul, brațele și ramurile fulgului; colțurile stelei; etajele
 *   bradului; inelul de agățat), scris din ADR, iar plasa e întrebată punct cu punct: lemn sau gol, ca pe hârtie;
 * - piesele sunt plate, închise, dintr-o bucată, cu pereții drepți: se tipăresc culcate, fără suport;
 * - nervura cea mai subțire (linia fulgului, conturul stelei, tija inelului) se măsoară pe plasă;
 * - agățătoarea: inelul (golul de 3 mm, peretele de 1,6) sau gaura de 2,5 mm, cu cel puțin 1,6 mm de lemn în jur;
 * - bradul în picioare: două plăci cu fante, una de jos și una de sus, care intră una în alta.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, dinMotor, type P3, type Piesa } from './ajutor-plasa-lego.ts';

type P2 = [number, number];
type Def = Record<string, unknown>;
type Vf = [number, number, number];
const Lc = L as typeof L & {
  fulgCote(d: Def): { diam: number; grosime: number; linie: number; ramuri: number; unghi: number; inceput: number; lungime: number; miez: string; agatatoare: string; facute: number; linieMax: number };
  steaCote(d: Def): { varfuri: number; diam: number; interior: number; grosime: number; fel: string; linie: number; agatatoare: string; varf: number };
  bradCote(d: Def): { inaltime: number; etaje: number; latime: number; grosime: number; fel: string; agatatoare: string; lat: number; fanta: number; taiat: number };
  _: { unesteForme(forme: readonly (readonly Vf[])[]): { ext: Vf[]; gauri: Vf[][] }[] };
};
const fulg = (d: Def = {}) => L.construieste({ tip: 'fulg', ...d });
const stea = (d: Def = {}) => L.construieste({ tip: 'stea', ...d });
const brad = (d: Def = {}) => L.construieste({ tip: 'brad', ...d });
const E = L.efective();
const RAD = Math.PI / 180;
const r2 = (x: number) => Math.round(x * 100) / 100;
const num = (v: unknown, implicit: number): number => (typeof v === 'number' ? v : implicit);

// ---------------------------------------------------------------------------------------------- uneltele de pe hârtie
const inPoli = (poli: readonly P2[], [x, y]: P2): boolean => {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const a = poli[i]!, b = poli[j]!;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
};
const distSeg = ([x, y]: P2, a: P2, b: P2): number => {
  const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
};
const distMargine = (poli: readonly P2[], p: P2): number => Math.min(...poli.map((a, i) => distSeg(p, a, poli[(i + 1) % poli.length]!)));
/** Poligonul regulat cu n vârfuri pe cercul de rază r, primul la unghiul u0. */
const regulat = (n: number, r: number, u0: number): P2[] => Array.from({ length: n }, (_, k): P2 => [r * Math.cos(u0 + 2 * Math.PI * k / n), r * Math.sin(u0 + 2 * Math.PI * k / n)]);
/** Steaua cu n colțuri pe raza R (primul la unghiul u0) și cu vârfurile dinăuntru pe raza ri, la jumătatea dintre colțuri. */
const steaPoli = (n: number, R: number, ri: number, u0: number): P2[] => Array.from({ length: 2 * n }, (_, k): P2 => { const r = k % 2 ? ri : R, u = u0 + Math.PI * k / n; return [r * Math.cos(u), r * Math.sin(u)]; });
/** Tija cu capăt rotund: pleacă drept din A, pe direcția u, lungă de lg (până la vârful capătului), lată de w. */
const inTija = (A: P2, u: number, lg: number, w: number, [x, y]: P2): boolean => {
  const dx = Math.cos(u), dy = Math.sin(u), s = (x - A[0]) * dx + (y - A[1]) * dy, t = -(x - A[0]) * dy + (y - A[1]) * dx, c = lg - w / 2;
  return s >= 0 && (s <= c ? Math.abs(t) <= w / 2 : Math.hypot(s - c, t) <= w / 2);
};
/** Inelul de agățat (ADR 0285): golul de 3 mm, peretele de 1,6, cu vârful piesei intrat 0,4 mm în perete (centrul, la 1,9). */
const INEL = { gol: 1.5, afara: 3.1, sus: 1.9, tot: 5 };
const inInel = (varf: number, [x, y]: P2): boolean => { const r = Math.hypot(x, y - (varf + INEL.sus)); return r >= INEL.gol && r <= INEL.afara; };
/** Tija inelului pe un vârf ascuțit: lată de 2,4, de la 0,2 peste vârf până unde forma e mai lată decât ea. */
const TIJA = 2.4;
function inTijaInel(poli: readonly P2[], varf: number, [x, y]: P2): boolean {
  let k = 1;
  while (!inPoli(poli, [TIJA / 2 + 0.2, varf - k / 10]) && k < 2000) k++;
  return Math.abs(x) <= TIJA / 2 && y <= varf + 0.2 && y >= varf - k / 10;
}
/** Numere la întâmplare, mereu aceleași. */
function sir(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/**
 * Plasa față de hârtie, în `puncte` locuri la întâmplare din cutia dată, la înălțimea z: lemnul plasei e lemnul de pe
 * hârtie. Punctele de lângă o margine (la mai puțin de 0,04 mm) nu se judecă: arcele plasei sunt din laturi.
 */
function caPeHartie(p: Piesa, pe: (q: P2) => boolean, cutie: readonly [number, number, number, number], z: number, ce: string, puncte = 3000, samanta = 7): { judecate: number; lemn: number } {
  const u = sir(samanta), [x0, y0, x1, y1] = cutie, e = 0.04;
  let judecate = 0, lemn = 0;
  for (let i = 0; i < puncte; i++) {
    const q: P2 = [x0 + (x1 - x0) * u(), y0 + (y1 - y0) * u()], a = pe(q);
    if ([[e, 0], [-e, 0], [0, e], [0, -e], [e, e], [-e, -e], [e, -e], [-e, e]].some(([dx, dy]) => pe([q[0] + dx!, q[1] + dy!]) !== a)) continue;
    judecate++; if (a) lemn++;
    assert.equal(plin(p, dinMotor(p, [q[0], q[1], z] as P3)), a, `${ce}: la (${q[0].toFixed(2)}, ${q[1].toFixed(2)}) plasa are ${a ? 'gol' : 'lemn'}, iar hârtia ${a ? 'lemn' : 'gol'}`);
  }
  return { judecate, lemn };
}
/** Bucățile de lemn de pe segmentul A → B (la înălțimea z), cu pasul de 0,01 mm: [de unde, până unde], în mm de la A. */
function bucati(p: Piesa, A: P2, B: P2, z: number): [number, number][] {
  const lg = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.round(lg / 0.01), out: [number, number][] = [];
  let de = -1;
  for (let k = 0; k <= n; k++) {
    const t = k / n, a = plin(p, dinMotor(p, [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1]), z] as P3));
    if (a && de < 0) de = k;
    if ((!a || k === n) && de >= 0) { out.push([de * lg / n, (a ? k : k - 1) * lg / n]); de = -1; }
  }
  return out;
}
const inchisa = (p: Piesa, ce: string, corpuri = 1) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(m.corpuri, corpuri, `${ce}: câte bucăți`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};
/** Piesa plată, cu pereții drepți: fiecare triunghi e orizontal (jos sau sus) sau vertical; nimic nu stă în aer. */
function plata(p: Piesa, ce: string): void {
  for (const [a, b, c] of p.tri) {
    const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const lg = Math.hypot(n[0]!, n[1]!, n[2]!);
    if (lg < 1e-12) continue;
    const nz = Math.abs(n[2]! / lg);
    assert.ok(nz < 1e-9 || nz > 1 - 1e-9, `${ce}: un triunghi înclinat (nz = ${nz})`);
  }
}
const aria = (v: readonly Vf[]): number => { // conturul din laturi drepte (probele unirii nu folosesc arce)
  let s = 0;
  for (let i = 0; i < v.length; i++) { const a = v[i]!, b = v[(i + 1) % v.length]!; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
};
const drept = (x0: number, y0: number, x1: number, y1: number): Vf[] => [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]];
/** Aria unui contur cu arce: poligonul vârfurilor, plus (la arcul spre dreapta mersului) sau minus segmentul de cerc. */
const ariaArce = (v: readonly Vf[]): number => {
  let s = aria(v);
  for (let i = 0; i < v.length; i++) {
    const a = v[i]!, b = v[(i + 1) % v.length]!, t = 4 * Math.atan(Math.abs(a[2]));
    if (t < 1e-12) continue;
    const raza = Math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * Math.sin(t / 2));
    s += Math.sign(a[2]) * raza * raza / 2 * (t - Math.sin(t));
  }
  return s;
};

// ---------------------------------------------------------------------------------------------- unirea formelor
test('unirea formelor ține golurile rămase între ele: un „U” cu capac are un gol, iar o bară prin el îl desparte în două', () => {
  const U: Vf[] = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [8, 10, 0], [8, 2, 0], [2, 2, 0], [2, 10, 0], [0, 10, 0]], capac = drept(-1, 7, 11, 9), bara = drept(4, -1, 6, 12);
  // (tablourile motorului vin din alt tărâm: se copiază înainte de `deepEqual`)
  const sume = (f: Vf[][]) => Array.from(Lc._.unesteForme(f), (u) => [r2(aria(u.ext)), Array.from(u.gauri, (g) => r2(Math.abs(aria(g)))).sort((a, b) => a - b)]);
  // „U”-ul (52) și capacul (24, din care 8 peste picioare): marginea cuprinde 68 + golul de 6 × 5
  assert.deepEqual(sume([U, capac]), [[98, [30]]]);
  assert.deepEqual(sume([capac, U]), [[98, [30]]], 'în ordinea cealaltă');
  assert.deepEqual(sume([U.slice().reverse(), capac]), [[98, [30]]], 'cu un contur dat în sens orar');
  // bara de 2 prin mijloc: golul rămâne în două bucăți de 2 × 5, iar marginea crește cu ce iese bara afară (2 jos, 6 sus)
  assert.deepEqual(sume([U, capac, bara]), [[106, [10, 10]]]);
  assert.deepEqual(sume([bara, U, capac]), [[106, [10, 10]]], 'bara întâi');
  // o formă care acoperă golul îl închide; două forme depărtate rămân două bucăți; una cuprinsă de alta nu schimbă nimic
  assert.deepEqual(sume([U, capac, drept(1, 1, 9, 8)]), [[98, []]]);
  assert.deepEqual(sume([drept(0, 0, 4, 4), drept(10, 0, 14, 4)]).map(([a]) => a), [16, 16]);
  assert.deepEqual(sume([drept(0, 0, 10, 10), drept(2, 2, 4, 4)]), [[100, []]]);
  // golul rămâne al bucății lui: o formă depărtată, venită după, nu-l șterge și nu-l primește
  assert.deepEqual(sume([U, capac, drept(20, 0, 24, 4)]), [[98, [30]], [16, []]]);
  // o formă pusă cu totul în gol e o insulă: o bucată a ei, iar golul rămâne întreg în jurul ei
  assert.deepEqual(sume([U, capac, drept(4, 4, 6, 6)]), [[98, [30]], [4, []]]);
  // un gol închis de forma nouă cu o bucată pierde ce acoperă altă bucată, unită după: bara stă în „U” fără să-l atingă,
  // iar capacul le leagă; din golul de 30 rămân 24, iar marginea crește cu cât iese bara peste capac (2 × 3)
  assert.deepEqual(sume([U, drept(4, 4, 6, 12), capac]), [[104, [24]]]);
  // un contur cu arce, dat în sens orar (o tijă de 4 × 8 cu capătul rotund, raza 2): întors, își ține arcul pe aceeași
  // latură, bombat tot în afară
  const tijaOrar: Vf[] = [[0, 2, 0], [8, 2, -1], [8, -2, 0], [0, -2, 0]], intoarsa = Lc._.unesteForme([tijaOrar]);
  assert.equal(intoarsa.length, 1);
  assert.ok(Math.abs(ariaArce(intoarsa[0]!.ext) - (32 + 2 * Math.PI)) < 1e-9, `aria tijei întoarse: ${ariaArce(intoarsa[0]!.ext)}`);
  // unită cu un dreptunghi care o taie: 16 în plus, fără cei 4 × 2 de peste tijă
  const cuDrept = Lc._.unesteForme([tijaOrar, drept(3, -4, 5, 4)]);
  assert.ok(Math.abs(ariaArce(cuDrept[0]!.ext) - (32 + 2 * Math.PI + 8)) < 1e-9, `aria tijei cu dreptunghiul: ${ariaArce(cuDrept[0]!.ext)}`);
});

// ---------------------------------------------------------------------------------------------- fulgul
type FulgHartie = { R: number; w: number; h: number; miez: string; m: number; a: number; perechi: { p: number; lg: number }[]; inel: boolean };
/** Fulgul de pe hârtie (ADR 0285): miezul, cele șase brațe (unul în sus) și perechile de ramuri de pe fiecare. */
function fulgPeHartie(d: Def = {}): FulgHartie {
  const R = num(d.diam, 70) / 2, w = num(d.linie, 2), miez = typeof d.miez === 'string' ? d.miez : 'hexagon', n = num(d.ramuri, 2), a = num(d.unghi, 60) * RAD;
  const inc = num(d.inceput, 40) / 100, lung = num(d.lungime, 28) / 100;
  // cât ține miezul pe braț: hexagonul, steaua (colțurile ei, între brațe) sau hexagonul gol
  const m = miez === 'hexagon' ? Math.max(0.18 * R, 2 * w) : miez === 'stea' ? Math.max(0.26 * R, 2.8 * w) : Math.max(0.24 * R, 3.2 * w);
  const perechi: { p: number; lg: number }[] = [];
  for (let j = 0; j < n; j++) {
    // perechile, de la „începutul” brațului liber până la 86 % din el; spre vârf, tot mai scurte (până la 55 %)
    const f = n === 1 ? inc : inc + (0.86 - inc) * j / (n - 1), p = m + (R - m) * f;
    // o ramură nu trece de cercul fulgului: centrul capătului ei rotund rămâne la cel mult R − w / 2 de mijloc
    const lg = Math.min(lung * R * (n === 1 ? 1 : 1 - 0.45 * j / (n - 1)), w / 2 - p * Math.cos(a) + Math.sqrt(p * p * Math.cos(a) ** 2 + (R - w / 2) ** 2 - p * p));
    if (lg >= 1.5 * w) perechi.push({ p, lg });
  }
  return { R, w, h: num(d.grosime, 2.4), miez, m, a, perechi, inel: d.agatatoare !== 'fara' };
}
function inFulg(q: FulgHartie, P: P2): boolean {
  const { R, w, m } = q, hex = (r: number) => regulat(6, r, 30 * RAD);
  if (q.miez === 'hexagon' && inPoli(hex(m), P)) return true;
  if (q.miez === 'stea' && inPoli(steaPoli(6, m, 0.55 * m, 0), P)) return true;
  if (q.miez === 'gol' && inPoli(hex(m), P) && !inPoli(hex(m - w / Math.cos(30 * RAD)), P)) return true;
  const r0 = q.miez === 'gol' ? m - 0.6 * w : 0.3 * w;
  for (let k = 0; k < 6; k++) {
    const u = (90 + 60 * k) * RAD, dx = Math.cos(u), dy = Math.sin(u);
    if (inTija([r0 * dx, r0 * dy], u, R - r0, w, P)) return true;
    for (const { p, lg } of q.perechi) for (const s of [1, -1]) if (inTija([p * dx, p * dy], u + s * q.a, lg, w, P)) return true;
  }
  return q.inel && inInel(R, P);
}
const cutieFulg = (q: FulgHartie): [number, number, number, number] => [-q.R - 1, -q.R - 1, q.R + 1, q.R + INEL.tot + 1];
/** Lățimea fulgului de pe hârtie: capetele rotunde ale brațelor și ale ramurilor (centrul lor, plus jumătate de linie). */
function latFulg(q: FulgHartie): number {
  let x = 0;
  for (let k = 0; k < 6; k++) {
    const u = (90 + 60 * k) * RAD;
    x = Math.max(x, Math.abs((q.R - q.w / 2) * Math.cos(u)));
    for (const { p, lg } of q.perechi) for (const s of [1, -1]) x = Math.max(x, Math.abs(p * Math.cos(u) + (lg - q.w / 2) * Math.cos(u + s * q.a)));
  }
  return 2 * x + q.w;
}

test('motorul știe fulgul, iar cel implicit are Ø70, linia de 2, două perechi de ramuri la 60°, miezul hexagon și inelul', () => {
  assert.ok(L.tipuri.includes('fulg'));
  const p = fulg(), q = Lc.fulgCote({});
  assert.deepEqual([q.diam, q.grosime, q.linie, q.ramuri, q.unghi, q.inceput, q.lungime, q.miez, q.agatatoare, q.facute], [70, 2.4, 2, 2, 60, 40, 28, 'hexagon', 'inel', 2]);
  // lat: până la capetele ramurilor de pe brațele de la ±30° (ies cu 1,2 mm peste vârfurile brațelor, care ar da
  // 2 · (34 · cos 30° + 1) = 60,89); înalt: de la vârful de jos la marginea inelului (35 + 1,9 + 3,1)
  const lat = latFulg(fulgPeHartie());
  assert.ok(Math.abs(lat - 63.27) < 0.01 && Math.abs(p.dim[0]! - lat) < 0.01, `lățimea ${p.dim[0]} față de ${lat}`);
  // fără ramuri, lățimea e a brațelor
  assert.ok(Math.abs(fulg({ ramuri: 0 }).dim[0]! - 2 * (34 * Math.cos(30 * RAD) + 1)) < 0.01);
  assert.deepEqual([r2(p.dim[1]!), r2(p.dim[2]!)], [75, 2.4]);
  assert.deepEqual([r2(p.baza[1]!), r2(p.baza[2]!)], [-35, 0]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicit'); plata(p, 'implicit');
  assert.equal(amprentaPlasei(fulg({ diam: 70, grosime: 2.4, linie: 2, ramuri: 2, unghi: 60, inceput: 40, lungime: 28, miez: 'hexagon', agatatoare: 'inel' })), amprentaPlasei(p));
  // fără inel: înalt cât diametrul; capătul brațului e rotund (colțul unui capăt drept ar fi lemn)
  const fara = fulg({ agatatoare: 'fara' });
  assert.equal(r2(fara.dim[1]!), 70);
  assert.ok(plin(fara, dinMotor(fara, [0, 34.8, 1.2] as P3)) && !plin(fara, dinMotor(fara, [0.8, 34.8, 1.2] as P3)), 'capătul brațului de sus e rotund');
});

test('fulgul e cel de pe hârtie, punct cu punct: miezul, brațele, ramurile și inelul, la toate cele trei miezuri', () => {
  const cazuri: Def[] = [
    {}, { miez: 'stea' }, { miez: 'gol' }, { agatatoare: 'fara', ramuri: 0 }, { diam: 30, linie: 1.2, ramuri: 1, unghi: 45, miez: 'gol' },
    { diam: 150, linie: 5, ramuri: 4, unghi: 30, inceput: 20, lungime: 45, miez: 'stea' }, { diam: 100, linie: 3, ramuri: 3, unghi: 75, inceput: 70, lungime: 10 },
    { diam: 50, linie: 1.6, ramuri: 4, unghi: 50, inceput: 25, lungime: 40, miez: 'gol', grosime: 4 }, { diam: 90, linie: 2.4, ramuri: 3, unghi: 35, inceput: 30, lungime: 45 },
  ];
  for (const d of cazuri) {
    const p = fulg(d), q = fulgPeHartie(d), ce = JSON.stringify(d);
    inchisa(p, ce); plata(p, ce);
    assert.equal(p.avert.length, 0, ce);
    const r = caPeHartie(p, (P) => inFulg(q, P), cutieFulg(q), q.h / 2, ce);
    assert.ok(r.judecate > 2000 && r.lemn > 100, `${ce}: ${r.judecate} puncte judecate, ${r.lemn} în lemn`);
    // de jos până sus, aceeași formă; peste și sub piesă, nimic
    for (const z of [0.05, q.h - 0.05]) caPeHartie(p, (P) => inFulg(q, P), cutieFulg(q), z, `${ce}, la z = ${z}`, 300, 11);
    caPeHartie(p, () => false, cutieFulg(q), q.h + 0.05, `${ce}, peste piesă`, 300, 13);
    assert.equal(r2(p.dim[2]!), q.h, ce);
  }
});

test('fulgii la întâmplare ies mereu închiși, dintr-o bucată, ca pe hârtie („Alt fulg”)', () => {
  const u = sir(2026), intre = (a: number, b: number) => a + Math.floor(u() * (b - a + 1));
  for (let i = 0; i < 60; i++) {
    const d: Def = { diam: intre(30, 150), linie: intre(12, 30) / 10, ramuri: intre(0, 4), unghi: intre(30, 75), inceput: intre(20, 70), lungime: intre(10, 45), miez: ['hexagon', 'stea', 'gol'][intre(0, 2)], grosime: 2 };
    // linia rămâne în marginea diametrului (cel mult o șesime din rază)
    d.linie = Math.min(d.linie as number, Lc.fulgCote(d).linieMax);
    const p = fulg(d), q = fulgPeHartie(d), ce = JSON.stringify(d);
    inchisa(p, ce);
    caPeHartie(p, (P) => inFulg(q, P), cutieFulg(q), 1, ce, 500, 100 + i);
  }
});

test('ramurile se numără pe plasă, iar linia are grosimea cerută: brațul, ramura și peretele miezului gol', () => {
  for (const d of [{}, { diam: 100, linie: 1.2, ramuri: 4, unghi: 45, lungime: 20 }, { diam: 60, linie: 3, ramuri: 1, inceput: 50 }] as Def[]) {
    const p = fulg(d), q = fulgPeHartie(d), ce = JSON.stringify(d), { w, R, m, h } = q;
    // pe o dreaptă de lângă brațul de sus (la 0,5 mm de marginea lui), de la miez la vârf: câte o bucată de lemn pe pereche
    // (dreapta se oprește sub inel, care coboară cu 1,2 mm sub vârf)
    const x = w / 2 + 0.5, pe = bucati(p, [x, m + 0.3], [x, R - 1.25], h / 2);
    assert.equal(pe.length, q.perechi.length, `${ce}: ${pe.length} ramuri numărate, ${q.perechi.length} pe hârtie`);
    // brațul, tăiat de-a latul înaintea primei perechi: o singură bucată, lată cât linia
    const y = (m + (q.perechi[0]?.p ?? R - 2)) / 2 + 0.2, brat = bucati(p, [-w, y], [w, y], h / 2);
    assert.equal(brat.length, 1, ce);
    assert.ok(Math.abs(brat[0]![1] - brat[0]![0] - w) < 0.03, `${ce}: brațul are ${brat[0]![1] - brat[0]![0]} mm`);
    // fiecare ramură din dreapta, tăiată de-a latul la mijlocul ei: lată cât linia, până la lungimea de pe hârtie
    for (const { p: loc, lg } of q.perechi) {
      const u = 90 * RAD - q.a, dx = Math.cos(u), dy = Math.sin(u), c: P2 = [dx * lg * 0.6, loc + dy * lg * 0.6];
      const lat = bucati(p, [c[0] + dy * w, c[1] - dx * w], [c[0] - dy * w, c[1] + dx * w], h / 2);
      assert.equal(lat.length, 1, ce);
      assert.ok(Math.abs(lat[0]![1] - lat[0]![0] - w) < 0.03, `${ce}: ramura are ${lat[0]![1] - lat[0]![0]} mm`);
      assert.ok(plin(p, dinMotor(p, [dx * (lg - 0.1), loc + dy * (lg - 0.1), h / 2] as P3)), `${ce}: ramura ajunge la ${lg}`);
      assert.ok(!plin(p, dinMotor(p, [dx * (lg + 0.1), loc + dy * (lg + 0.1), h / 2] as P3)), `${ce}: ramura nu trece de ${lg}`);
    }
  }
  // miezul gol: între brațe, peretele hexagonului are grosimea liniei; în mijloc, gol
  const d = { miez: 'gol', linie: 2.4 }, p = fulg(d), q = fulgPeHartie(d), perete = bucati(p, [0, 0], [q.m, 0], 1.2);
  assert.equal(perete.length, 1);
  assert.ok(Math.abs(perete[0]![1] - perete[0]![0] - 2.4) < 0.03, `peretele miezului are ${perete[0]![1] - perete[0]![0]} mm`);
  assert.ok(Math.abs(perete[0]![1] - q.m * Math.cos(30 * RAD)) < 0.02, 'peretele se termină la apotema hexagonului');
});

test('inelul fulgului: golul de 3 mm, peretele de 1,6, prins de vârful brațului de sus fără să se subțieze', () => {
  for (const d of [{}, { diam: 30, linie: 1.2 }, { diam: 150, linie: 5, miez: 'gol' }] as Def[]) {
    const p = fulg(d), q = fulgPeHartie(d), ce = JSON.stringify(d), c = q.R + INEL.sus;
    // pe verticală, prin centrul inelului: brațul, apoi golul de 3 mm, apoi peretele de sus, de 1,6
    const sus = bucati(p, [0, q.R - 1], [0, q.R + INEL.tot + 1], 1);
    assert.equal(sus.length, 2, ce);
    assert.ok(Math.abs(sus[0]![1] - (c - 1.5 - (q.R - 1))) < 0.02 && Math.abs(sus[1]![0] - (c + 1.5 - (q.R - 1))) < 0.02, `${ce}: golul inelului`);
    assert.ok(Math.abs(sus[1]![1] - sus[1]![0] - 1.6) < 0.02, `${ce}: peretele de sus`);
    // pe orizontală, prin centru: perete, gol, perete
    const lat = bucati(p, [-5, c], [5, c], 1);
    assert.equal(lat.length, 2, ce);
    for (const [a, b] of lat) assert.ok(Math.abs(b - a - 1.6) < 0.03, `${ce}: peretele inelului are ${b - a} mm`);
    // gâtul dintre inel și fulg: de la brațul întreg până în inel, lemnul nu e nicăieri mai îngust decât linia (la liniile
    // groase, decât 2,3 mm)
    // (se măsoară bucata de lemn de pe axă: alături pot trece ramurile ultimei perechi)
    for (let y = q.R - q.w / 2 - 0.5; y < q.R + 0.35; y += 0.1) {
      const gat = bucati(p, [-6, y], [6, y], 1).find(([x0, x1]) => x0 < 6 && x1 > 6);
      assert.ok(gat && gat[1] - gat[0] > Math.min(q.w, 2.3) - 0.03, `${ce}: gâtul are ${gat ? gat[1] - gat[0] : 0} mm la y = ${y}`);
    }
  }
});

test('marginile fulgului: ce iese din ele e adus înapoi, cu un mesaj; linia nu trece de o șesime din rază', () => {
  const q = Lc.fulgCote({ diam: 500, grosime: 0.2, linie: 0.4, ramuri: 9, unghi: 10, inceput: 5, lungime: 90, miez: 'altceva', agatatoare: 'carlig' });
  assert.deepEqual([q.diam, q.grosime, q.linie, q.ramuri, q.unghi, q.inceput, q.lungime, q.miez, q.agatatoare], [150, 1.2, 1.2, 4, 30, 20, 45, 'hexagon', 'inel']);
  assert.equal(fulg({ diam: 500 }).avert.length, 1);
  assert.match(fulg({ diam: 500 }).avert[0]!, /între 30 și 150 mm/);
  assert.equal(fulg({ linie: 0.4 }).avert.length, 1);
  assert.match(fulg({ linie: 0.4 }).avert[0]!, /am făcut-o de 1,2 mm\.$/);
  // Ø30: raza 15, deci linia de cel mult 2,5
  const mic = Lc.fulgCote({ diam: 30, linie: 4 });
  assert.deepEqual([mic.linie, mic.linieMax], [2.5, 2.5]);
  assert.equal(Lc.fulgCote({ diam: 70 }).linieMax, 5);
  assert.match(fulg({ diam: 30, linie: 4 }).avert[0]!, /între 1,2 și 2,5 mm: am făcut-o de 2,5 mm\.$/);
  // zecimile și întregii: 70,04 e 70; 2,5 perechi sunt 3 (rotunjit); numerele scrise ca text sunt primite
  const z = Lc.fulgCote({ diam: '70.04', ramuri: 2.5, linie: '2' });
  assert.deepEqual([z.diam, z.ramuri, z.linie], [70, 3, 2]);
  // o ramură prea scurtă ca să se vadă (sub o linie și jumătate) nu se face: la 10 % din 15 mm rămâne 1,5 mm
  assert.equal(Lc.fulgCote({ diam: 30, linie: 1.2, ramuri: 2, lungime: 10 }).facute, 0);
});

// ---------------------------------------------------------------------------------------------- steaua
type SteaHartie = { n: number; R: number; ri: number; h: number; fel: string; linie: number; ag: string; poli: P2[] };
/** Steaua de pe hârtie (ADR 0285): colțurile pe raza R (unul în sus), vârfurile dinăuntru pe „interior” % din ea. */
function steaPeHartie(d: Def = {}): SteaHartie {
  const n = num(d.varfuri, 5), R = num(d.diam, 70) / 2, ri = num(d.interior, 40) / 100 * R, fel = typeof d.fel === 'string' ? d.fel : 'plina';
  return { n, R, ri, h: num(d.grosime, 3), fel, linie: num(d.linie, 2.4), ag: typeof d.agatatoare === 'string' ? d.agatatoare : 'inel', poli: steaPoli(n, R, ri, 90 * RAD) };
}
/** Steaua plată (plină sau doar conturul), cu agățătoarea ei; `gaura`: centrul găurii, măsurat pe plasă. */
function inStea(q: SteaHartie, P: P2, gaura?: P2): boolean {
  if (q.ag === 'inel' && (inInel(q.R, P) || inTijaInel(q.poli, q.R, P))) return true;
  if (!inPoli(q.poli, P)) return false;
  if (gaura && Math.hypot(P[0] - gaura[0], P[1] - gaura[1]) < 1.25) return false;
  return q.fel !== 'contur' || distMargine(q.poli, P) < q.linie;
}
const cutieStea = (q: SteaHartie): [number, number, number, number] => [-q.R - 1, -q.R - 1, q.R + 1, q.R + INEL.tot + 1];

test('motorul știe steaua, iar cea implicită are 5 colțuri, Ø70, plină, groasă de 3, cu inelul pe colțul de sus', () => {
  assert.ok(L.tipuri.includes('stea'));
  const p = stea(), q = Lc.steaCote({});
  assert.deepEqual([q.varfuri, q.diam, q.interior, q.grosime, q.fel, q.linie, q.agatatoare], [5, 70, 40, 3, 'plina', 2.4, 'inel']);
  // lat: colțurile de la 18° și 162°; înalt: de la colțurile de jos (la 54° sub orizontală) la marginea inelului
  assert.deepEqual(cote(p).map(r2), [r2(70 * Math.cos(18 * RAD)), r2(35 * Math.sin(54 * RAD) + 35 + INEL.tot), 3]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicită'); plata(p, 'implicită');
  // unghiul colțului (5 colțuri, interiorul la 40 %): 2 · atan(14 · sin 36° / (35 − 14 · cos 36°))
  assert.equal(q.varf, Math.round(2 * Math.atan(14 * Math.sin(36 * RAD) / (35 - 14 * Math.cos(36 * RAD))) / RAD));
  assert.equal(amprentaPlasei(stea({ varfuri: 5, diam: 70, interior: 40, grosime: 3, fel: 'plina', agatatoare: 'inel' })), amprentaPlasei(p));
  assert.equal(r2(stea({ agatatoare: 'fara' }).dim[1]!), r2(35 * Math.sin(54 * RAD) + 35));
});

test('steaua plină e cea de pe hârtie, punct cu punct, cu inelul și tija lui, de la 5 la 8 colțuri', () => {
  for (const d of [{}, { varfuri: 6, interior: 58 }, { varfuri: 8, interior: 75, diam: 150, grosime: 6 }, { varfuri: 7, interior: 30, diam: 30, grosime: 1.2 }, { agatatoare: 'fara', varfuri: 6 }] as Def[]) {
    const p = stea(d), q = steaPeHartie(d), ce = JSON.stringify(d);
    inchisa(p, ce); plata(p, ce);
    const r = caPeHartie(p, (P) => inStea(q, P), cutieStea(q), q.h / 2, ce);
    assert.ok(r.judecate > 2000 && r.lemn > 100, `${ce}: ${r.judecate} puncte judecate, ${r.lemn} în lemn`);
    caPeHartie(p, () => false, cutieStea(q), q.h + 0.05, `${ce}, peste piesă`, 300, 13);
    assert.equal(r2(p.dim[2]!), q.h, ce);
  }
});

test('inelul stelei stă pe o tijă de 2,4 mm: gâtul dintre inel și colțul ascuțit nu e mai subțire decât ea', () => {
  for (const d of [{}, { varfuri: 8, interior: 30 }, { varfuri: 5, interior: 75, diam: 40 }] as Def[]) {
    const p = stea(d), q = steaPeHartie(d), ce = JSON.stringify(d);
    // de la marginea de jos a inelului până unde colțul e mai lat decât tija: lemnul are cel puțin 2,4 mm
    for (const y of [q.R + 0.15, q.R - 0.4, q.R - 0.9, q.R - 1.2, q.R - 1.5, q.R - 2.5]) {
      const b = bucati(p, [-6, y], [6, y], q.h / 2);
      assert.equal(b.length, 1, `${ce}, la y = ${y}`);
      assert.ok(b[0]![1] - b[0]![0] > TIJA - 0.03, `${ce}: gâtul are ${b[0]![1] - b[0]![0]} mm la y = ${y}`);
    }
    const lat = bucati(p, [-5, q.R + INEL.sus], [5, q.R + INEL.sus], q.h / 2);
    assert.equal(lat.length, 2, ce);
    for (const [a, b] of lat) assert.ok(Math.abs(b - a - 1.6) < 0.03, `${ce}: peretele inelului are ${b - a} mm`);
  }
});

test('conturul stelei are peste tot grosimea liniei, iar o linie prea groasă lasă steaua plină, cu un mesaj', () => {
  for (const d of [{ fel: 'contur' }, { fel: 'contur', varfuri: 6, interior: 60, linie: 1.2, diam: 50 }, { fel: 'contur', varfuri: 8, interior: 70, linie: 4, diam: 120 }] as Def[]) {
    const p = stea(d), q = steaPeHartie(d), ce = JSON.stringify(d);
    inchisa(p, ce); plata(p, ce);
    assert.equal(p.avert.length, 0, ce);
    const r = caPeHartie(p, (P) => inStea(q, P), cutieStea(q), q.h / 2, ce);
    assert.ok(r.judecate > 2000 && r.lemn > 100, ce);
    assert.ok(!plin(p, dinMotor(p, [0, 0, q.h / 2] as P3)), `${ce}: mijlocul e gol`);
    // peretele, măsurat de-a curmezișul unei laturi (la mijlocul ei): cât linia
    const a = q.poli[0]!, b = q.poli[1]!, mij: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], lg = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / lg, ny = (b[0] - a[0]) / lg;
    const taiat = bucati(p, [mij[0] - nx, mij[1] - ny], [mij[0] + nx * (q.linie + 1), mij[1] + ny * (q.linie + 1)], q.h / 2);
    assert.equal(taiat.length, 1, ce);
    assert.ok(Math.abs(taiat[0]![1] - taiat[0]![0] - q.linie) < 0.03, `${ce}: peretele are ${taiat[0]![1] - taiat[0]![0]} mm`);
  }
  // Ø30 cu interiorul la 30 %: vârfurile dinăuntru sunt la 4,5 mm de mijloc, deci conturul de 4 ar lăsa un gol sub 1 mm²
  // (unul sub 3 mm² se astupă la tipărit: nu se mai face)
  const plina = stea({ fel: 'contur', diam: 30, interior: 30, linie: 4 });
  assert.equal(plina.avert.length, 1);
  assert.match(plina.avert[0]!, /plină/);
  assert.ok(plin(plina, dinMotor(plina, [0, 0, 1.5] as P3)));
  inchisa(plina, 'conturul prea gros');
});

test('gaura stelei: 2,5 mm, pe axa colțului de sus, cât mai sus, cu cel puțin 1,6 mm de lemn în jur', () => {
  for (const d of [{ agatatoare: 'gaura' }, { agatatoare: 'gaura', varfuri: 8, interior: 45, diam: 100 }, { agatatoare: 'gaura', varfuri: 6, interior: 70, diam: 40 }] as Def[]) {
    const p = stea(d), q = steaPeHartie(d), ce = JSON.stringify(d);
    inchisa(p, ce); plata(p, ce);
    assert.equal(p.avert.length, 0, ce);
    assert.equal(r2(p.dim[1]!), r2(q.R - Math.min(...q.poli.map(([, y]) => y))), `${ce}: fără inel`);
    // pe axă, de la colț în jos: lemn, golul găurii (2,5), lemn
    const ax = bucati(p, [0, q.R - 0.05], [0, 0], q.h / 2);
    assert.equal(ax.length, 2, ce);
    const sus = q.R - 0.05 - ax[0]![1], jos = q.R - 0.05 - ax[1]![0], c: P2 = [0, (sus + jos) / 2];
    assert.ok(Math.abs(sus - jos - 2.5) < 0.03, `${ce}: gaura are ${sus - jos} mm`);
    // peretele: de la centrul găurii la marginea stelei sunt cel puțin 1,25 + 1,6; cu 0,1 mai sus n-ar mai fi fost
    assert.ok(distMargine(q.poli, c) >= 2.85 - 0.02, `${ce}: peretele găurii are ${distMargine(q.poli, c) - 1.25} mm`);
    assert.ok(c[1] > q.R / 3, `${ce}: gaura e în colțul de sus`);
    assert.ok(distMargine(q.poli, [0, c[1] + 0.12]) < 2.85, `${ce}: gaura stă cât mai sus`);
    caPeHartie(p, (P) => inStea(q, P, c), cutieStea(q), q.h / 2, ce, 2000);
  }
  // pe conturul stelei nu e loc de gaură: rămâne inelul
  assert.equal(Lc.steaCote({ fel: 'contur', agatatoare: 'gaura' }).agatatoare, 'inel');
  // o stea mică și ascuțită n-are loc de gaură în colțul de sus (mai jos de o treime din rază n-ar mai atârna dreaptă):
  // primește inelul, cu un mesaj; cu 8 colțuri, e înaltă cât diametrul și inelul
  const ingusta = stea({ agatatoare: 'gaura', varfuri: 8, interior: 30, diam: 30 });
  assert.ok(ingusta.avert.some((x) => /prea îngustă pentru gaura de agățat: i-am pus un inel/.test(x)), ingusta.avert.join(' | '));
  assert.equal(r2(ingusta.dim[1]!), 30 + INEL.tot);
  inchisa(ingusta, 'steaua îngustă');
});

test('steaua în relief: muchii de la mijloc la colțuri și văi la vârfurile dinăuntru, fără nimic în aer', () => {
  for (const d of [{ fel: 'relief', grosime: 8, agatatoare: 'fara' }, { fel: 'relief', grosime: 5, varfuri: 8, interior: 55, diam: 100, agatatoare: 'fara' }, { fel: 'relief', grosime: 2, varfuri: 6, diam: 40, agatatoare: 'fara' }] as Def[]) {
    const p = stea(d), q = steaPeHartie(d), ce = JSON.stringify(d), H = q.h, prag = Math.min(1.2, H / 2);
    inchisa(p, ce);
    assert.deepEqual([r2(p.dim[2]!), p.avert.length], [H, 0], ce);
    // nimic în aer: afară de fața de jos, niciun triunghi nu privește în jos
    for (const [a, b, c] of p.tri) {
      const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      assert.ok(nz > -1e-9 || (a[2] < 1e-9 && b[2] < 1e-9 && c[2] < 1e-9), `${ce}: un triunghi privește în jos`);
    }
    // înălțimea de pe hârtie: pragul la margine, H la mijloc, liniar pe raza care trece prin punct
    const sus = (P: P2): number => {
      for (let i = 0; i < q.poli.length; i++) {
        const a = q.poli[i]!, b = q.poli[(i + 1) % q.poli.length]!, det = a[0] * b[1] - a[1] * b[0], la = (P[0] * b[1] - P[1] * b[0]) / det, lb = (a[0] * P[1] - a[1] * P[0]) / det;
        if (la >= 0 && lb >= 0 && la + lb <= 1) return prag + (H - prag) * (1 - la - lb);
      }
      return -1;
    };
    const u = sir(31);
    let judecate = 0;
    for (let i = 0; i < 4000; i++) {
      const P: P2 = [(2 * u() - 1) * (q.R + 1), (2 * u() - 1) * (q.R + 1)], z = u() * (H + 0.5), zs = sus(P);
      if (zs < 0 ? distMargine(q.poli, P) < 0.04 : distMargine(q.poli, P) < 0.04 || Math.abs(z - zs) < 0.04) continue;
      judecate++;
      assert.equal(plin(p, dinMotor(p, [P[0], P[1], z] as P3)), zs >= 0 && z < zs, `${ce}: la (${P[0].toFixed(2)}, ${P[1].toFixed(2)}, ${z.toFixed(2)}), cu fața de sus la ${zs.toFixed(2)}`);
    }
    assert.ok(judecate > 3000, ce);
    // muchia urcă de la prag (la colț) la H (în mijloc); valea, la fel, de la vârful dinăuntru
    assert.ok(plin(p, dinMotor(p, [0, 0, H - 0.05] as P3)) && !plin(p, dinMotor(p, [0, 0, H + 0.05] as P3)), `${ce}: mijlocul e la ${H}`);
  }
  // inelul stelei în relief e o bucată plată lângă ea (cel mult 2,4 mm), prinsă prin tijă; gaura nu se face în relief
  const cuInel = stea({ fel: 'relief', grosime: 8 }), q = steaPeHartie({});
  inchisa(cuInel, 'relief cu inel', 2);
  assert.equal(Lc.steaCote({ fel: 'relief', agatatoare: 'gaura' }).agatatoare, 'inel');
  const c = q.R + INEL.sus;
  assert.ok(plin(cuInel, dinMotor(cuInel, [0, c + 2.3, 2.35] as P3)) && !plin(cuInel, dinMotor(cuInel, [0, c + 2.3, 2.45] as P3)), 'inelul e gros de 2,4 mm');
  assert.ok(!plin(cuInel, dinMotor(cuInel, [0, c, 1] as P3)), 'golul inelului');
  assert.equal(r2(cuInel.dim[1]!), r2(35 * Math.sin(54 * RAD) + 35 + INEL.tot));
});

test('marginile stelei și colțurile prea ascuțite: mesajul spune unghiul', () => {
  const q = Lc.steaCote({ varfuri: 12, diam: 10, interior: 5, grosime: 40, fel: 'altfel', linie: 0.2, agatatoare: 'carlig' });
  assert.deepEqual([q.varfuri, q.diam, q.interior, q.grosime, q.fel, q.linie, q.agatatoare], [8, 30, 30, 12, 'plina', 1.2, 'inel']);
  // 8 colțuri cu interiorul la 30 %: 2 · atan(0,3 · sin 22,5° / (1 − 0,3 · cos 22,5°)) = 18°
  const ascutita = stea({ varfuri: 8, interior: 30 });
  assert.equal(Lc.steaCote({ varfuri: 8, interior: 30 }).varf, 18);
  assert.equal(ascutita.avert.length, 1);
  assert.match(ascutita.avert[0]!, /18°/);
  assert.equal(stea({ varfuri: 5, interior: 40 }).avert.length, 0);
  // linia e a conturului: la steaua plină, una din afara marginilor nu aduce niciun mesaj
  assert.equal(stea({ linie: 0.2 }).avert.length, 0);
  assert.match(stea({ fel: 'contur', linie: 0.2 }).avert[0]!, /între 1,2 și 6 mm/);
});

// ---------------------------------------------------------------------------------------------- brăduțul
type BradHartie = { H: number; n: number; W: number; h: number; picioare: boolean; ag: string; ht: number; e: number; tw: number; b: number[]; a: number[]; poli: P2[] };
/** Bradul de pe hârtie (ADR 0285): trunchiul și etajele, fiecare mai îngust; în picioare, cu talpa lată. */
function bradPeHartie(d: Def = {}): BradHartie {
  const H = num(d.inaltime, 80), n = num(d.etaje, 3), W = num(d.latime, 65) / 100 * H, picioare = d.fel === 'picioare';
  // trunchiul: 12 % din înălțime (cel puțin 4 mm); lat de 12 % din lățime (cel puțin 4 mm), iar în picioare, de 60 %
  const ht = Math.max(0.12 * H, 4), e = (H - ht) / n, tw = picioare ? 0.3 * W : Math.max(0.06 * W, 2);
  // etajul i: jos, lat cât (n − 0,75 · i) / n din lățime; sus se strânge la 45 % din etajul următor (ultimul, la vârf)
  const b = Array.from({ length: n }, (_, i) => W / 2 * (n - 0.75 * i) / n), a = b.map((_, i) => (i < n - 1 ? 0.45 * b[i + 1]! : 0));
  const dreapta: P2[] = [[tw, 0], [tw, ht]];
  for (let i = 0; i < n; i++) { dreapta.push([b[i]!, ht + i * e]); if (i < n - 1) dreapta.push([a[i]!, ht + (i + 1) * e]); }
  const poli: P2[] = [...dreapta, [0, H], ...dreapta.slice().reverse().map(([x, y]): P2 => [-x, y])];
  return { H, n, W, h: num(d.grosime, 3), picioare, ag: typeof d.agatatoare === 'string' ? d.agatatoare : 'inel', ht, e, tw, b, a, poli };
}
function inBrad(q: BradHartie, P: P2, gaura?: P2): boolean {
  if (q.ag === 'inel' && (inInel(q.H, P) || inTijaInel(q.poli, q.H, P))) return true;
  if (!inPoli(q.poli, P)) return false;
  return !(gaura && Math.hypot(P[0] - gaura[0], P[1] - gaura[1]) < 1.25);
}
const cutieBrad = (q: BradHartie): [number, number, number, number] => [-q.W / 2 - 1, -1, q.W / 2 + 1, q.H + INEL.tot + 1];

test('motorul știe bradul, iar cel implicit are 80 mm, 3 etaje, lat de 52, gros de 3, de agățat, cu inelul în vârf', () => {
  assert.ok(L.tipuri.includes('brad'));
  const p = brad(), q = Lc.bradCote({});
  assert.deepEqual([q.inaltime, q.etaje, q.latime, q.grosime, q.fel, q.agatatoare, q.lat], [80, 3, 65, 3, 'agatat', 'inel', 52]);
  assert.deepEqual(cote(p).map(r2), [52, 85, 3]);
  assert.deepEqual(Array.from(p.baza, r2), [-26, 0, 0]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicit'); plata(p, 'implicit');
  assert.equal(amprentaPlasei(brad({ inaltime: 80, etaje: 3, latime: 65, grosime: 3, fel: 'agatat', agatatoare: 'inel' })), amprentaPlasei(p));
  assert.deepEqual(cote(brad({ agatatoare: 'fara' })).map(r2), [52, 80, 3]);
});

test('bradul de agățat e cel de pe hârtie, punct cu punct: trunchiul, etajele, inelul sau gaura', () => {
  for (const d of [{}, { etaje: 2, latime: 40, inaltime: 30, grosime: 1.2 }, { etaje: 6, latime: 90, inaltime: 150, grosime: 6 }, { etaje: 4, agatatoare: 'fara' }, { etaje: 5, latime: 50, inaltime: 120 }] as Def[]) {
    const p = brad(d), q = bradPeHartie(d), ce = JSON.stringify(d);
    inchisa(p, ce); plata(p, ce);
    assert.equal(p.avert.length, 0, ce);
    const r = caPeHartie(p, (P) => inBrad(q, P), cutieBrad(q), q.h / 2, ce);
    assert.ok(r.judecate > 2000 && r.lemn > 100, ce);
    caPeHartie(p, () => false, cutieBrad(q), q.h + 0.05, `${ce}, peste piesă`, 300, 13);
    // etajele, măsurate pe plasă: imediat peste baza fiecăruia, lat cât pe hârtie; imediat sub ea, cât gâtul etajului de jos
    for (let i = 0; i < q.n; i++) {
      const y = q.ht + i * q.e, sus = bucati(p, [-q.W, y + 0.02], [q.W, y + 0.02], q.h / 2), jos = bucati(p, [-q.W, y - 0.02], [q.W, y - 0.02], q.h / 2);
      assert.equal(sus.length, 1, ce);
      assert.ok(Math.abs(sus[0]![1] - sus[0]![0] - 2 * q.b[i]!) < 0.15, `${ce}: etajul ${i + 1} are ${sus[0]![1] - sus[0]![0]} mm, pe hârtie ${2 * q.b[i]!}`);
      assert.ok(Math.abs(jos[0]![1] - jos[0]![0] - 2 * (i ? q.a[i - 1]! : q.tw)) < 0.15, `${ce}: sub etajul ${i + 1}`);
    }
  }
  for (const d of [{ agatatoare: 'gaura' }, { agatatoare: 'gaura', etaje: 6, latime: 40, inaltime: 60 }] as Def[]) {
    const p = brad(d), q = bradPeHartie(d), ce = JSON.stringify(d);
    inchisa(p, ce);
    assert.equal(r2(p.dim[1]!), q.H, ce);
    const ax = bucati(p, [0, q.H - 0.05], [0, 0], q.h / 2);
    assert.equal(ax.length, 2, ce);
    const sus = q.H - 0.05 - ax[0]![1], jos = q.H - 0.05 - ax[1]![0], c: P2 = [0, (sus + jos) / 2];
    assert.ok(Math.abs(sus - jos - 2.5) < 0.03, `${ce}: gaura are ${sus - jos} mm`);
    assert.ok(distMargine(q.poli, c) >= 2.85 - 0.02 && distMargine(q.poli, [0, c[1] + 0.12]) < 2.85, `${ce}: peretele găurii`);
    assert.ok(c[1] > q.ht + (q.n - 1) * q.e, `${ce}: gaura e în ultimul etaj`);
    caPeHartie(p, (P) => inBrad(q, P, c), cutieBrad(q), q.h / 2, ce, 2000);
  }
});

/** Cele două plăci ale bradului în picioare, pe hârtie: fanta de jos (A) și fanta de sus, cu vârful tăiat (B, alături). */
function inBradPicioare(q: BradHartie, P: P2): boolean {
  const s = q.h + 2 * (E.joc! + 0.1), mij = q.H / 2;
  // B se taie unde, de o parte și de alta a fantei, n-ar mai rămâne 1,2 mm
  let taiat = q.H;
  for (let i = 0; i < q.n; i++) {
    const y = q.ht + i * q.e;
    // (un etaj cu baza deja prea îngustă se taie cu 0,2 mm sub ea)
    if (y + q.e > mij && q.a[i]! < s / 2 + 1.2) { taiat = q.b[i]! > s / 2 + 1.2 ? y + q.e * (q.b[i]! - s / 2 - 1.2) / (q.b[i]! - q.a[i]!) : y - 0.2; break; }
  }
  if (inPoli(q.poli, P)) return !(Math.abs(P[0]) < s / 2 && P[1] < mij + 0.2);
  const Q: P2 = [P[0] - (q.W + 3), P[1]];
  return inPoli(q.poli, Q) && Q[1] < taiat && !(Math.abs(Q[0]) < s / 2 && Q[1] > mij - 0.2);
}

test('bradul în picioare: două plăci alăturate, cu fantele cât grosimea plus jocul, care intră una în alta', () => {
  for (const d of [{ fel: 'picioare' }, { fel: 'picioare', inaltime: 120, etaje: 5, latime: 55, grosime: 2 }, { fel: 'picioare', inaltime: 60, etaje: 2, latime: 80, grosime: 4 }] as Def[]) {
    const p = brad(d), q = bradPeHartie(d), ce = JSON.stringify(d), c = Lc.bradCote(d), s = q.h + 2 * (E.joc! + 0.1);
    inchisa(p, ce, 2); plata(p, ce);
    assert.equal(p.avert.length, 0, ce);
    assert.deepEqual(cote(p).map(r2), [r2(2 * q.W + 3), q.H, q.h], ce);
    assert.equal(r2(c.fanta), r2(s), ce);
    const r = caPeHartie(p, (P) => inBradPicioare(q, P), [-q.W / 2 - 1, -1, 1.5 * q.W + 4, q.H + 1], q.h / 2, ce, 5000);
    assert.ok(r.judecate > 3500 && r.lemn > 300, ce);
    // fanta primei plăci, măsurată la un sfert din înălțime: cât grosimea și jocul din calibrare, de două ori
    const jos = bucati(p, [-q.W, q.H / 4], [q.W / 2 + 1, q.H / 4], q.h / 2);
    assert.equal(jos.length, 2, ce);
    assert.ok(Math.abs(jos[1]![0] - jos[0]![1] - s) < 0.03, `${ce}: fanta de jos are ${jos[1]![0] - jos[0]![1]} mm`);
    // plăcile intră una în alta până la capăt: fanta de jos urcă peste mijloc, cea de sus coboară sub el
    const A = bucati(p, [0, 0], [0, q.H], q.h / 2), B = bucati(p, [q.W + 3, 0], [q.W + 3, q.H], q.h / 2);
    assert.ok(Math.abs(A[0]![0] - (q.H / 2 + 0.2)) < 0.02 && A.length === 1, `${ce}: fanta de jos se oprește la ${A[0]![0]}`);
    assert.ok(Math.abs(B[0]![1] - (q.H / 2 - 0.2)) < 0.02 && B.length === 1, `${ce}: fanta de sus coboară la ${B[0]![1]}`);
    // a doua placă e tăiată drept sus, unde lângă fantă rămân 1,2 mm de lemn
    const sus = bucati(p, [q.W / 2 + 2.5, c.taiat - 0.05], [1.5 * q.W + 3.5, c.taiat - 0.05], q.h / 2);
    assert.equal(sus.length, 2, ce);
    for (const [x0, x1] of sus) assert.ok(Math.abs(x1 - x0 - 1.2) < 0.06, `${ce}: lângă fantă, sus, rămân ${x1 - x0} mm`);
    assert.ok(c.taiat > q.ht + (q.n - 1) * q.e, `${ce}: a doua placă ajunge în ultimul etaj`);
  }
});

test('gaura care nu încape în brad: un brad mic și îngust primește inelul, cu un mesaj', () => {
  // 30 mm, lat de 12, 6 etaje: în ultimul etaj (lat de 4,5 la bază) nu e loc de o gaură de 2,5 cu 1,6 mm de lemn în jur
  // (mai jos ar încăpea, deasupra trunchiului, dar bradul ar atârna cu vârful în jos)
  const d = { agatatoare: 'gaura', inaltime: 30, latime: 40, etaje: 6 }, p = brad(d), q = bradPeHartie({ ...d, agatatoare: 'inel' });
  assert.equal(p.avert.length, 1);
  assert.match(p.avert[0]!, /prea îngust pentru gaura de agățat: i-am pus un inel/);
  assert.deepEqual(cote(p).map(r2), [12, 35, 3]);
  inchisa(p, 'gaura care nu încape');
  caPeHartie(p, (P) => inBrad(q, P), cutieBrad(q), 1.5, 'gaura care nu încape', 2000);
});

test('bradul în picioare, prea mic: a doua placă se oprește mai jos sau piciorul rămâne subțire, cu mesajul lor', () => {
  // 30 mm, gros de 3: gâtul dintre etaje (2,2 mm) e mai îngust decât fanta și pereții ei
  const mic = brad({ fel: 'picioare', inaltime: 30 }), q = bradPeHartie({ fel: 'picioare', inaltime: 30 });
  inchisa(mic, 'mic', 2);
  assert.ok(mic.avert.some((x) => /a doua placă/.test(x)), mic.avert.join(' | '));
  caPeHartie(mic, (P) => inBradPicioare(q, P), [-q.W / 2 - 1, -1, 1.5 * q.W + 4, q.H + 1], 1.5, 'mic', 3000);
  // 30 mm, lat de 40 %, gros de 6: talpa de 7,2 mm, fanta de 6,4
  const dg = { fel: 'picioare', inaltime: 30, latime: 40, grosime: 6 }, gros = brad(dg), qg = bradPeHartie(dg);
  assert.ok(gros.avert.some((x) => /prea groase/.test(x)), gros.avert.join(' | '));
  // a doua placă se taie în primul etaj care trece de mijloc (aici, al doilea: 12,67 + 8,67 · (4,5 − 4,4) / (4,5 − 1,35)),
  // nu la un gât subțire de sub mijloc, unde ea n-are fantă
  assert.ok(Math.abs(Lc.bradCote(dg).taiat - (4 + 26 / 3 + 26 / 3 * (4.5 - 4.4) / (4.5 - 1.35))) < 1e-6, String(Lc.bradCote(dg).taiat));
  caPeHartie(gros, (P) => inBradPicioare(qg, P), [-qg.W / 2 - 1, -1, 1.5 * qg.W + 4, qg.H + 1], 3, 'gros', 3000);
  // talpa lată, dar gâtul primului etaj (sub mijloc, deci în dreptul fantei de jos) prea îngust: tot „prea groase”;
  // cu bradul ceva mai lat, gâtul ajunge
  assert.ok(brad({ fel: 'picioare', inaltime: 40, latime: 40 }).avert.some((x) => /prea groase/.test(x)));
  assert.equal(brad({ fel: 'picioare', inaltime: 40, latime: 46 }).avert.filter((x) => /prea groase/.test(x)).length, 0);
});

test('marginile bradului; în picioare nu are agățătoare', () => {
  const q = Lc.bradCote({ inaltime: 400, etaje: 1, latime: 10, grosime: 9, fel: 'altfel', agatatoare: 'carlig' });
  assert.deepEqual([q.inaltime, q.etaje, q.latime, q.grosime, q.fel, q.agatatoare, q.lat], [150, 2, 40, 6, 'agatat', 'inel', 60]);
  assert.equal(brad({ inaltime: 400 }).avert.length, 1);
  assert.match(brad({ inaltime: 400 }).avert[0]!, /între 30 și 150 mm/);
  assert.equal(Lc.bradCote({ fel: 'picioare', agatatoare: 'inel' }).agatatoare, 'fara');
});

test('decorațiunile nu au prinderi și nu sunt piese rotunde: în „Modelul” stau pe grilă după cutia lor', () => {
  const Lp = L as typeof L & { prinderi(d: Def): unknown[]; asezareModel(d: Def): { gw: number; gd: number; ax: boolean } };
  for (const tip of ['fulg', 'stea', 'brad']) {
    assert.equal(Array.from(Lp.prinderi({ tip })).length, 0, tip);
    assert.equal(Lp.asezareModel({ tip }).ax, false, tip);
  }
});
