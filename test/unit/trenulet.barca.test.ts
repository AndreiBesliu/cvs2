/**
 * Elicea de barcă din atelierul Easy 3Draw (ADR 0282, felia 3.Tr), pe plasele reale:
 * - corpul închis (fiecare muchie orientată are perechea ei) pe plaja parametrilor: 3–5 palete, Ø20–120, pasul, lățimea,
 *   înclinarea, găurile, sensurile, capacul;
 * - cotele: diametrul, butucul (Ø8, sau 18 % din diametru la elicele mari; înalt cât paletele, cel puțin 8), capacul rotunjit
 *   (1,2 raze de butuc), gaura din calibrare;
 * - tipărită fără suport: fiecare secțiune a paletei își are punctul cel mai de jos pe masă (z = 0);
 * - pasul constant, măsurat pe fața plată a paletei: tan β(r) = P / 2πr; pe hârtie, Ø40 la pasul 1 → P 40, 57,86° la butuc,
 *   17,66° la vârf, consola 0,628 mm pe strat;
 * - secțiunea ogivală, pe hârtie: fața plată sus (spre pupa), spatele bombat jos; groasă la mijlocul corzii de la 1,6 (4 % din
 *   diametru, între 1,6 și 3) la 0,8 la vârf, cu muchiile de 0,6;
 * - conturul „ureche”: coarda crește eliptic de la 60 % la rădăcină la toată lățimea la 60 % din paletă, apoi se rotunjește
 *   eliptic spre vârf;
 * - înclinarea înapoi: mijlocul corzii, mutat pe cerc cu unghiul · x², în urma rotației;
 * - paletele nu se ating (cel mult 85 % din pasul dintre ele, pe fiecare rază); „stânga” e oglinda lui „dreapta”;
 * - cât din disc acoperă paletele, față de aceeași sumă făcută pe plasă; marginile plajei se spun.
 * Valorile „pe hârtie” sunt calculate separat de motor (formulele din ADR, cu un script de o singură folosință).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Cote = { z: number; D: number; P: number; pd: number; lat: number; inc: number; rh: number; Hh: number; bRad: number; bVarf: number; consola: number; acoperire: number };
type Lego = {
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  eliceBarcaCote(d: Record<string, unknown>): Cote;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const barca = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'eliceBarca', ...d });
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const grade = (x: number) => x * 180 / Math.PI;
/** Unghiul adus în (−π, π]. */
const unghi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
/** Centrul butucului: motorul face elicea în jurul originii, iar `construieste` o mută cu −baza (colțul cutiei). */
function centru(p: Piesa): [number, number] {
  return [-p.baza[0]!, -p.baza[1]!];
}
type Polar = [r: number, th: number, z: number];
/** Vârfurile plasei în coordonate polare față de butuc: [r, θ, z]. */
function polare(p: Piesa): Polar[] {
  const c = centru(p);
  return p.tri.flat().map(([x, y, z]): Polar => [Math.hypot(x - c[0], y - c[1]), Math.atan2(y - c[1], x - c[0]), z]);
}
/** Razele stațiilor paletei (secțiunile plasei), crescător: de la rădăcina din butuc (cu 0,4 mm în el) la vârf. */
function statii(v: readonly Polar[], rh: number): number[] {
  const pe = new Map<string, number>();
  for (const q of v) if (q[0] > rh - 0.5 && Math.abs(q[0] - rh) > 1e-3 && !pe.has(q[0].toFixed(4))) pe.set(q[0].toFixed(4), q[0]);
  return [...pe.values()].sort((a, b) => a - b);
}
/**
 * Secțiunea paletei 0 la raza unei stații, adusă înapoi din unghiul ei de pe hârtie (β) și din înclinarea de pe hârtie (σ, în
 * radiani): punctele corzii, cu fața de sus (`sus`, în lungul grosimii) și grosimea; plus punctele feței de sus pe cerc (s, z).
 */
function sectiune(v: readonly Polar[], rr: number, beta: number, sigma: number, palete: number) {
  const brut = v.filter(([r, th]) => Math.abs(r - rr) < 1e-4 && Math.abs(unghi(th - sigma)) < Math.PI / palete)
    .map(([, th, z]) => { const s = rr * unghi(th - sigma); return { s, z, u: s * Math.cos(beta) + z * Math.sin(beta), w: -s * Math.sin(beta) + z * Math.cos(beta) }; });
  const u0 = Math.min(...brut.map((q) => q.u)), coarda = Math.max(...brut.map((q) => q.u)) - u0;
  const pe = new Map<string, typeof brut>();
  for (const q of brut) { const k = (q.u - u0).toFixed(5); (pe.get(k) ?? pe.set(k, []).get(k)!).push(q); }
  const puncte = [...pe].map(([k, qs]) => {
    const sus = qs.reduce((a, b) => (b.w > a.w ? b : a)), jos = qs.reduce((a, b) => (b.w < a.w ? b : a));
    return { x: +k / coarda, sus, gros: sus.w - jos.w };
  }).sort((a, b) => a.x - b.x);
  return { coarda, puncte, lat: Math.max(...brut.map((q) => q.s)) - Math.min(...brut.map((q) => q.s)), zmin: Math.min(...brut.map((q) => q.z)) };
}
/** Pe hârtie, pentru elicea implicită (Ø40, butucul Ø8): raza stației i, locul ei pe paletă și unghiul paletei la pasul 40. */
const R0 = 3.6, RAZA = 20, PAS = 40;
const hartie = (i: number) => { const r = R0 + (RAZA - R0) * i / 28; return { r, x: Math.max(0, (r - 4) / 16), beta: Math.atan(PAS / (2 * Math.PI * r)) }; };

test('corpul e închis pe plaja parametrilor (palete, diametre, pasul, lățimea, înclinarea, găuri, sensuri, capacul)', () => {
  const cazuri: Record<string, unknown>[] = [{}];
  for (const gaura of ['x', 'r', 'b', 'nu']) for (const capac of ['nu', 'da']) cazuri.push({ gaura, capac });
  for (const palete of [3, 4, 5]) for (const diametru of [20, 33.3, 73, 120]) cazuri.push({ palete, diametru, sens: palete % 2 ? 'stanga' : 'dreapta', capac: 'da' });
  for (const pas of [0.5, 1.6]) for (const latime of [40, 150]) for (const inclinare of [0, 40]) cazuri.push({ pas, latime, inclinare, palete: 5 });
  cazuri.push({ diametru: 120, pas: 1.6, latime: 150 }, { diametru: 20, pas: 0.5, latime: 40, palete: 5, inclinare: 40 });
  for (const d of cazuri) {
    const p = barca(d);
    assert.equal(muchiiRele(p.tri), 0, JSON.stringify(d));
    assert.ok(p.tri.length > 500, JSON.stringify(d));
    assert.ok(p.tri.flat(2).every(Number.isFinite), JSON.stringify(d));
  }
});

test('cotele: diametrul, butucul (Ø8, sau 18 % din diametru; înalt cât paletele), capacul, gaura din calibrare', () => {
  const e = L.efective();
  // diametrul: cea mai mare rază față de centrul butucului
  for (const diametru of [20, 40, 73.5, 120]) {
    const v = polare(barca({ diametru, gaura: 'nu' })), R = Math.max(...v.map((q) => q[0]));
    assert.ok(Math.abs(R - diametru / 2) < 0.05, `Ø${diametru}: raza ${R}`);
  }
  // butucul: raza max(4; 0,09 · D, la zecime): Ø40 → 4 (3,6 e sub 4); Ø50 → 4,5; Ø73 → 6,6 (6,57); Ø120 → 10,8
  for (const [diametru, rh] of [[20, 4], [40, 4], [50, 4.5], [73, 6.6], [120, 10.8]] as const) {
    assert.ok(Math.abs(L.eliceBarcaCote({ diametru }).rh - rh) < 1e-9, `Ø${diametru}: butucul ${L.eliceBarcaCote({ diametru }).rh}`);
    // fețele lui: cele mai depărtate vârfuri de sus (z = înălțimea butucului) de sub rădăcina paletelor... sunt chiar pe raza lui
    const p = barca({ diametru, gaura: 'nu' }), v = polare(p), Hh = L.eliceBarcaCote({ diametru }).Hh;
    const sus = v.filter((q) => Math.abs(q[2] - Hh) < 1e-9 && q[0] < rh + 1e-3);
    assert.ok(Math.abs(Math.max(...sus.map((q) => q[0])) - rh) < 1e-3, `Ø${diametru}: raza butucului, din plasă ${Math.max(...sus.map((q) => q[0]))}`);
  }
  // înălțimea: butucul e cât cea mai înaltă secțiune a paletei, la zecime în sus, cel puțin 8 (un știft). Pe hârtie, elicea
  // implicită: cea mai înaltă secțiune, 11,427 (la r ≈ 7,7) → 11,5; cu capacul (1,2 · 4 peste butuc), 16,3
  assert.ok(Math.abs(L.eliceBarcaCote({}).Hh - 11.5) < 1e-9 && Math.abs(barca().dim[2]! - 11.5) < 1e-9, `înălțimea ${barca().dim[2]}`);
  assert.ok(Math.abs(barca({ capac: 'da' }).dim[2]! - 16.3) < 1e-9, `cu capac ${barca({ capac: 'da' }).dim[2]}`);
  // paletele mici și culcate încap sub un știft: Ø20, 5 palete, pasul 0,5, lățimea 40 % (cea mai înaltă secțiune, 2,01) → 8
  const mica = { diametru: 20, palete: 5, pas: 0.5, latime: 40 };
  assert.ok(Math.abs(L.eliceBarcaCote(mica).Hh - 8) < 1e-9 && Math.abs(barca(mica).dim[2]! - 8) < 1e-9, `mica: ${barca(mica).dim[2]}`);
  // nicio paletă nu trece de butuc în sus
  for (const d of [{}, { palete: 5, latime: 150 }, { diametru: 120, pas: 1.6 }]) {
    const p = barca({ ...d, gaura: 'nu' });
    assert.ok(Math.max(...p.tri.flat().map((q) => q[2])) <= L.eliceBarcaCote(d).Hh + 1e-9, JSON.stringify(d));
  }
  // capacul: vârful pe axă, la 1,2 raze peste butuc; rotunjit (la jumătatea înălțimii lui e încă lat de peste 80 % din butuc)
  const cap = barca({ capac: 'da', gaura: 'nu' }), vc = polare(cap).filter((q) => q[2] > 11.5 + 1e-6);
  const varf = vc.reduce((a, b) => (b[2] > a[2] ? b : a));
  assert.ok(Math.abs(varf[2] - 16.3) < 1e-9 && varf[0] < 1e-9, `vârful capacului: ${varf}`);
  const laJum = Math.max(...vc.filter((q) => Math.abs(q[2] - (11.4 + 4.9 * 0.5)) < 1e-6).map((q) => q[0]));
  assert.ok(Math.abs(laJum - 4 * Math.cos(Math.PI / 6)) < 1e-6, `capacul la jumătatea înălțimii: ${laJum}`);
  // gaura: vârfurile ei, sub r 3,3 (sub rădăcina paletelor, r 3,6, și butucul, r 4)
  const gaura = (g: string) => {
    const v = polare(barca({ gaura: g })).filter((q) => q[0] < 3.3);
    return { min: Math.min(...v.map((q) => q[0])), max: Math.max(...v.map((q) => q[0])) };
  };
  const x = gaura('x'), r = gaura('r'), b = gaura('b');
  assert.ok(Math.abs(x.max - Math.hypot(e.axGauraD! / 2, e.axGauraLat! / 2)) < 0.02, `crucea: colțul brațului ${x.max}`);
  assert.ok(Math.abs(r.min - e.gauraD! / 2) < 0.03 && Math.abs(r.max - e.gauraD! / 2) < 0.03, `știftul: ${JSON.stringify(r)}`);
  assert.ok(Math.abs(b.min - e.baraGauraD! / 2) < 0.03 && Math.abs(b.max - e.baraGauraD! / 2) < 0.03, `bara: ${JSON.stringify(b)}`);
  assert.equal(polare(barca({ gaura: 'nu' })).filter((q) => q[0] < 3.3 && q[0] > 1e-6).length, 0);
});

test('tipărită fără suport: fiecare secțiune a paletei își are punctul cel mai de jos pe masă', () => {
  for (const d of [{}, { inclinare: 40, palete: 5, latime: 150 }, { diametru: 120, pas: 1.6 }, { diametru: 20, pas: 0.5, latime: 40 }]) {
    const q = L.eliceBarcaCote(d), p = barca({ ...d, gaura: 'nu' }), v = polare(p);
    assert.ok(Math.min(...p.tri.flat().map((w) => w[2])) === 0, JSON.stringify(d));
    const raze = statii(v, q.rh);
    assert.equal(raze.length, 29, JSON.stringify(d));
    for (const rr of raze) {
      const zmin = Math.min(...v.filter((w) => Math.abs(w[0] - rr) < 1e-4).map((w) => w[2]));
      assert.ok(Math.abs(zmin) < 1e-9, `${JSON.stringify(d)}: la r ${rr}, z min ${zmin}`);
    }
  }
});

test('pasul constant, pe fața plată a paletei: tan β = P / 2πr; pe hârtie, Ø40 la pasul 1', () => {
  // pe hârtie: P = 1 · 40; la butuc (r 4), atan(40 / 8π) = 57,86°; la vârf (r 20), atan(1 / π) = 17,66°; consola la vârf, pe
  // strat de 0,2: 0,2 · π = 0,628
  const c = L.eliceBarcaCote({});
  assert.ok(c.z === 3 && c.D === 40 && c.pd === 1 && c.lat === 100 && c.inc === 20, JSON.stringify(c));
  assert.ok(Math.abs(c.P - 40) < 1e-9 && Math.abs(grade(c.bRad) - 57.858) < 1e-3, `P ${c.P}, β butuc ${grade(c.bRad)}`);
  assert.ok(Math.abs(grade(c.bVarf) - 17.657) < 1e-3 && Math.abs(c.consola - 0.2 * Math.PI) < 1e-9, `β vârf ${grade(c.bVarf)}, consola ${c.consola}`);
  const v = polare(barca({ gaura: 'nu' })), raze = statii(v, 4);
  for (const i of [0, 5, 14, 22, 28]) {
    const h = hartie(i), s = sectiune(v, raze[i]!, h.beta, 20 * Math.PI / 180 * h.x ** 2, 3);
    assert.ok(Math.abs(raze[i]! - h.r) < 1e-9, `stația ${i}: r ${raze[i]}`);
    const a = s.puncte[0]!.sus, b = s.puncte[s.puncte.length - 1]!.sus;
    assert.ok(Math.abs((b.z - a.z) / (b.s - a.s) - PAS / (2 * Math.PI * h.r)) < 1e-9, `stația ${i}: panta ${(b.z - a.z) / (b.s - a.s)}`);
  }
  // alt pas, alt diametru: Ø73 la pasul 1,6 → P 116,8; la 60 % din paletă panta e tot P / 2πr
  const d = { diametru: 73, pas: 1.6, gaura: 'nu' }, q = L.eliceBarcaCote(d), v2 = polare(barca(d)), r2 = statii(v2, q.rh)[17]!;
  const x2 = (r2 - q.rh) / (36.5 - q.rh), s2 = sectiune(v2, r2, Math.atan(116.8 / (2 * Math.PI * r2)), 20 * Math.PI / 180 * x2 ** 2, 3);
  const a2 = s2.puncte[0]!.sus, b2 = s2.puncte[s2.puncte.length - 1]!.sus;
  assert.ok(Math.abs(q.P - 116.8) < 1e-9 && Math.abs((b2.z - a2.z) / (b2.s - a2.s) - 116.8 / (2 * Math.PI * r2)) < 1e-9);
});

test('secțiunea ogivală, pe hârtie: fața plată sus, spatele bombat jos; groasă de la 1,6 la 0,8, cu muchiile de 0,6', () => {
  const v = polare(barca({ gaura: 'nu' })), raze = statii(v, 4);
  // stația 14 (r = 3,6 + 16,4 · 14 / 28 = 11,8; la 48,75 % din paletă): grosimea 1,6 − 0,8 · 0,4875 = 1,21
  for (const [i, t] of [[1, 1.59071], [14, 1.21], [22, 0.97571], [28, 0.8]] as const) {
    const h = hartie(i), s = sectiune(v, raze[i]!, h.beta, 20 * Math.PI / 180 * h.x ** 2, 3);
    assert.equal(s.puncte.length, 13, `stația ${i}`);
    // fața de sus e plată: toate punctele ei, la aceeași înălțime în lungul grosimii
    const w0 = s.puncte[0]!.sus.w;
    assert.ok(s.puncte.every((q) => Math.abs(q.sus.w - w0) < 1e-9), `stația ${i}: fața de sus nu e plată`);
    // grosimea: 0,6 la muchii, t la mijlocul corzii, parabolă între ele (0,6 + (t − 0,6) · 4x(1 − x))
    for (const q of s.puncte) assert.ok(Math.abs(q.gros - (0.6 + (t - 0.6) * 4 * q.x * (1 - q.x))) < 1e-5, `stația ${i}, x ${q.x}: grosimea ${q.gros}`);
    assert.ok(Math.abs(s.puncte[6]!.x - 0.5) < 1e-5 && Math.abs(s.puncte[6]!.gros - t) < 1e-5, `stația ${i}: la mijloc ${s.puncte[6]!.gros}`);
    assert.ok(Math.abs(s.puncte[0]!.gros - 0.6) < 1e-9 && Math.abs(s.puncte[12]!.gros - 0.6) < 1e-9, `stația ${i}: muchiile`);
  }
  // rădăcina mai groasă la elicele mari: 4 % din diametru, între 1,6 și 3: Ø60 → 2,4; Ø120 → 3 (4,8 e peste)
  for (const [diametru, t] of [[60, 2.4], [120, 3]] as const) {
    const q = L.eliceBarcaCote({ diametru }), vv = polare(barca({ diametru, gaura: 'nu' })), r0 = statii(vv, q.rh)[0]!;
    const s = sectiune(vv, r0, Math.atan(diametru / (2 * Math.PI * r0)), 0, 3);
    assert.ok(Math.abs(r0 - (q.rh - 0.4)) < 1e-9 && Math.abs(s.puncte[6]!.gros - t) < 1e-5, `Ø${diametru}: rădăcina groasă de ${s.puncte[6]!.gros}`);
  }
});

test('conturul „ureche”, pe hârtie: de la 60 % la rădăcină la toată lățimea la 60 % din paletă, apoi rotunjit eliptic spre vârf', () => {
  // Ø40, lățimea 100 %: coarda cea mai mare, 20. Stația i e la r = 3,6 + 16,4 · i / 28, adică la x = (r − 4) / 16 din paletă.
  const v = polare(barca({ gaura: 'nu' })), raze = statii(v, 4);
  const coarda = (i: number) => { const h = hartie(i); return sectiune(v, raze[i]!, h.beta, 20 * Math.PI / 180 * h.x ** 2, 3).coarda; };
  // până la 60 %: 20 · √(1 − 0,64 · ((0,6 − x) / 0,6)²). Stația 1 (x 0,01161): 20 · 0,620099 = 12,40197; stația 8 (x 0,26786):
  // 20 · 0,896592 = 17,93184; stația 17 (x 0,59732): 19,99987
  assert.ok(Math.abs(coarda(1) - 12.40197) < 1e-4, `stația 1: ${coarda(1)}`);
  assert.ok(Math.abs(coarda(8) - 17.93184) < 1e-4, `stația 8: ${coarda(8)}`);
  assert.ok(Math.abs(coarda(17) - 19.99987) < 1e-4, `stația 17: ${coarda(17)}`);
  // după 60 %: 20 · √(1 − ((x − 0,6) / 0,4)²). Stația 22 (x 0,78036): 20 · 0,892578 = 17,85156; stația 27 (x 0,96339): 8,35847
  assert.ok(Math.abs(coarda(22) - 17.85156) < 1e-4, `stația 22: ${coarda(22)}`);
  assert.ok(Math.abs(coarda(27) - 8.35847) < 1e-4, `stația 27: ${coarda(27)}`);
  // vârful: 2,5 grosimi (2), nu strâns într-un punct
  assert.ok(Math.abs(coarda(28) - 2) < 1e-6, `vârful: ${coarda(28)}`);
  // lățimea cerută se vede: la 60 %, coarda e 60 · 20 / 100 = 12
  const v60 = polare(barca({ gaura: 'nu', latime: 60 })), h17 = hartie(17);
  const c60 = sectiune(v60, statii(v60, 4)[17]!, h17.beta, 20 * Math.PI / 180 * h17.x ** 2, 3).coarda;
  assert.ok(Math.abs(c60 - 0.6 * 19.99987) < 1e-4, `lățimea 60 %: ${c60}`);
});

test('înclinarea înapoi: mijlocul corzii, mutat pe cerc cu unghiul · x², în urma rotației (spre muchia de sus)', () => {
  for (const [inclinare, sens] of [[20, 'dreapta'], [0, 'dreapta'], [40, 'dreapta'], [20, 'stanga']] as const) {
    const semn = sens === 'stanga' ? -1 : 1, v = polare(barca({ gaura: 'nu', inclinare, sens })), raze = statii(v, 4);
    for (const i of [0, 8, 14, 22, 28]) {
      // dreapta: fața de sus urcă spre θ mai mare, iar mijlocul corzii ei stă la +unghiul · x²; stânga e oglinda (θ → −θ)
      const h = hartie(i), sigma = semn * inclinare * Math.PI / 180 * h.x ** 2;
      const pts = v.filter(([r, th]) => Math.abs(r - raze[i]!) < 1e-4 && Math.abs(unghi(th - sigma)) < Math.PI / 3)
        .map(([, th, z]) => ({ th: unghi(th - sigma), z, w: -semn * raze[i]! * unghi(th - sigma) * Math.sin(h.beta) + z * Math.cos(h.beta) }));
      const w0 = Math.max(...pts.map((q) => q.w)), sus = pts.filter((q) => Math.abs(q.w - w0) < 1e-9).sort((a, b) => a.z - b.z);
      const unice = sus.filter((q, k) => k === 0 || Math.abs(q.z - sus[k - 1]!.z) > 1e-9);
      assert.equal(unice.length, 13, `${inclinare}° ${sens}, stația ${i}`);
      assert.ok(Math.abs(unice[6]!.th) < 1e-9, `${inclinare}° ${sens}, stația ${i}: mijlocul la ${grade(unice[6]!.th)}° de locul de pe hârtie`);
      // muchia de sus e în sensul în care urcă paleta: spre +θ la dreapta, spre −θ la stânga
      assert.ok(semn * (unice[12]!.th - unice[0]!.th) > 0, `${inclinare}° ${sens}, stația ${i}: sensul`);
    }
  }
  // pe hârtie, la 20°: stația 14 (x 0,4875), 20 · 0,4875² = 4,753°; vârful, 20°
  assert.ok(Math.abs(20 * hartie(14).x ** 2 - 4.753) < 1e-3 && hartie(28).x === 1);
});

test('paletele nu se ating: pe fiecare rază, o paletă ocupă cel mult 85 % din pasul dintre palete', () => {
  for (const d of [{ palete: 5, latime: 150 }, { palete: 5, latime: 150, pas: 0.5, inclinare: 40 }, { palete: 3, latime: 150, pas: 1.6, diametru: 120 }, { palete: 4, latime: 150, diametru: 20 }]) {
    const q = L.eliceBarcaCote(d), v = polare(barca({ ...d, gaura: 'nu' })), raze = statii(v, q.rh), R = q.D / 2;
    let taiate = 0;
    for (const rr of raze) {
      const x = Math.max(0, (rr - q.rh) / (R - q.rh)), sigma = q.inc * Math.PI / 180 * x ** 2;
      const inel = v.filter((w) => Math.abs(w[0] - rr) < 1e-4), pas = 2 * Math.PI / q.z;
      // unghiurile inelului, aduse toate într-un singur pas dintre palete: golul cel mai mare dintre două vecine (pe cerc) e
      // golul dintre palete; ce rămâne din pas e cât ocupă o paletă
      const a = inel.map((w) => { const f = (w[1] - sigma) / pas; return (f - Math.floor(f)) * pas; }).sort((p1, p2) => p1 - p2);
      let gol = a[0]! + pas - a[a.length - 1]!;
      for (let k = 1; k < a.length; k++) gol = Math.max(gol, a[k]! - a[k - 1]!);
      const lat = pas - gol;
      assert.ok(gol >= 0.15 * pas - 1e-9, `${JSON.stringify(d)}: la r ${rr}, golul dintre palete ${gol} din ${pas}`);
      if (lat > 0.84 * pas) taiate++;
    }
    // lățimea cerută (150 %) nu încape: mai multe secțiuni sunt tăiate chiar la limită
    assert.ok(taiate >= 5, `${JSON.stringify(d)}: secțiuni la limită ${taiate}`);
  }
});

test('„stânga” e oglinda lui „dreapta”', () => {
  const pd = barca({ gaura: 'nu' }), ps = barca({ gaura: 'nu', sens: 'stanga' });
  // doar paletele (dincolo de r 4,05): vârfurile butucului sunt mișcate deterministic cu cel mult 0,0001 mm (`prismaGauri`)
  const vd = polare(pd).filter((q) => q[0] > 4.05).map(([r, th, z]): P3 => [r * Math.cos(th), r * Math.sin(th), z]);
  const vs = polare(ps).filter((q) => q[0] > 4.05).map(([r, th, z]): P3 => [r * Math.cos(th), -r * Math.sin(th), z]);
  const grila = new Map<string, P3[]>(), cel = (q: P3, d = [0, 0, 0]) => q.map((x, i) => Math.floor(x / 0.01) + d[i]!).join(',');
  for (const q of vd) { const k = cel(q); (grila.get(k) ?? grila.set(k, []).get(k)!).push(q); }
  let lipsa = 0;
  for (const q of vs) {
    let gasit = false;
    for (let a = -1; a <= 1 && !gasit; a++) for (let b = -1; b <= 1 && !gasit; b++) for (let c = -1; c <= 1 && !gasit; c++)
      gasit = (grila.get(cel(q, [a, b, c])) ?? []).some((w) => Math.hypot(w[0] - q[0], w[1] - q[1], w[2] - q[2]) < 1e-6);
    if (!gasit) lipsa++;
  }
  assert.ok(lipsa === 0 && vs.length === vd.length && vd.length > 1000, `vârfuri fără pereche în oglindă: ${lipsa} din ${vs.length}`);
});

test('cât din disc acoperă paletele: suma lățimilor pe cerc, de la butuc la vârf, față de aria discului', () => {
  // aceeași sumă, făcută aici pe plasă (trapeze între stații, de la raza butucului): trebuie să dea cât spune motorul
  const dinPlasa = (d: Record<string, unknown>) => {
    const q = L.eliceBarcaCote(d), v = polare(barca({ ...d, gaura: 'nu' })), raze = statii(v, q.rh), R = q.D / 2;
    const lat = raze.map((rr) => {
      const x = Math.max(0, (rr - q.rh) / (R - q.rh)), sigma = q.inc * Math.PI / 180 * x ** 2;
      const a = v.filter((w) => Math.abs(w[0] - rr) < 1e-4 && Math.abs(unghi(w[1] - sigma)) < Math.PI / q.z).map((w) => rr * unghi(w[1] - sigma));
      return Math.max(...a) - Math.min(...a);
    });
    let arie = 0;
    for (let i = 0; i + 1 < raze.length; i++) {
      const a = raze[i]!, b = raze[i + 1]!;
      if (b <= q.rh) continue;
      const ra = Math.max(a, q.rh), la = a >= q.rh ? lat[i]! : lat[i]! + (lat[i + 1]! - lat[i]!) * (q.rh - a) / (b - a);
      arie += (la + lat[i + 1]!) / 2 * (b - ra);
    }
    return q.z * arie / (Math.PI * R * R);
  };
  // pe hârtie (scriptul separat): implicita, 55,14 %; 5 palete cu lățimea 150 %, 76,26 %; cea mai îngustă (Ø20, 5 palete,
  // pasul 0,5, lățimea 40 %), 32,91 %
  for (const [d, hartia] of [[{}, 0.5514], [{ palete: 5, latime: 150 }, 0.7626], [{ diametru: 20, palete: 5, pas: 0.5, latime: 40 }, 0.3291]] as const) {
    const a = L.eliceBarcaCote(d).acoperire;
    assert.ok(Math.abs(a - hartia) < 5e-5, `${JSON.stringify(d)}: ${a} față de ${hartia} pe hârtie`);
    assert.ok(Math.abs(a - dinPlasa(d)) < 1e-9, `${JSON.stringify(d)}: ${a} față de ${dinPlasa(d)} din plasă`);
    // niciodată peste 85 % din inelul dintre butuc și vârf
    assert.ok(a < 0.85 * (1 - (L.eliceBarcaCote(d).rh / (L.eliceBarcaCote(d).D / 2)) ** 2));
  }
});

test('implicitele și marginile: paletele și diametrul în afara plajei se spun; pasul, lățimea și înclinarea se aduc în plajă', () => {
  assert.deepEqual(simplu(barca({ palete: 8 }).avert), ['O elice de barcă are între 3 și 5 palete: am făcut-o cu 5.']);
  assert.deepEqual(simplu(barca({ palete: 2 }).avert), ['O elice de barcă are între 3 și 5 palete: am făcut-o cu 3.']);
  assert.deepEqual(simplu(barca({ diametru: 150 }).avert), ['Diametrul unei elice de barcă e între 20 și 120 mm: am făcut-o de 120 mm.']);
  assert.deepEqual(simplu(barca({ diametru: 12 }).avert), ['Diametrul unei elice de barcă e între 20 și 120 mm: am făcut-o de 20 mm.']);
  assert.deepEqual(simplu(barca({ diametru: 40, palete: 3 }).avert), []);
  assert.deepEqual(simplu(barca().avert), []);
  const c = (d: Record<string, unknown>) => L.eliceBarcaCote(d);
  assert.deepEqual([c({ pas: 5 }).pd, c({ pas: 0.1 }).pd], [1.6, 0.5]);
  assert.deepEqual([c({ latime: 500 }).lat, c({ latime: 5 }).lat], [150, 40]);
  assert.deepEqual([c({ inclinare: 90 }).inc, c({ inclinare: -5 }).inc], [40, 0]);
  // ce nu e număr ia implicitul
  assert.deepEqual([c({ palete: 'x' }).z, c({ diametru: null }).D, c({ pas: '' }).pd, c({ latime: undefined }).lat, c({ inclinare: 'mult' }).inc], [3, 40, 1, 100, 20]);
  // aceeași piesă din valorile implicite scrise și din nimic
  assert.deepEqual(barca({ palete: 3, diametru: 40, pas: 1, latime: 100, inclinare: 20, sens: 'dreapta', gaura: 'x', capac: 'nu' }).tri, barca().tri);
});
