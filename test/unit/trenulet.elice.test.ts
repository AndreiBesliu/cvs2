/**
 * Elicea din atelierul Easy 3Draw (ADR 0282, felia 3.Tq), pe plasele reale:
 * - corpul închis (fiecare muchie orientată are perechea ei) pe plaja parametrilor: 2–8 palete, Ø20–200, formele, profilele,
 *   găurile, sensurile, conul;
 * - cotele: diametrul (cea mai mare rază față de butuc), butucul Ø8 cu gaura din calibrare (cruce, știft, bară), înălțimea
 *   (cel puțin 8, cât un știft, sau cât cere paleta la rădăcină), conul;
 * - tipărită fără suport: fiecare secțiune a paletei își are punctul cel mai de jos pe masă (z = 0);
 * - unghiul paletei, măsurat din plasă (direcția principală a secțiunii cilindrice): răsucită, β(r) = atan(P / 2πr); plată, β
 *   la fel peste tot, cât la 70 % din rază (pe hârtie: Ø72, pasul 0,7 → P 50,4, 63,5° la butuc, 12,56° la vârf);
 * - paletele nu se ating; „stânga” e oglinda lui „dreapta”; marginile plajei se spun.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Cote = { z: number; D: number; P: number; pd: number; lat: number; plata: boolean; bRad: number; bVarf: number; consola: number };
type Lego = {
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  eliceCote(d: Record<string, unknown>): Cote;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const elice = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'elice', ...d });
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

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
/** Vârfurile plasei în coordonate polare față de butuc: [r, θ, z]. */
function polare(p: Piesa, c: [number, number]): [number, number, number][] {
  return p.tri.flat().map(([x, y, z]): [number, number, number] => [Math.hypot(x - c[0], y - c[1]), Math.atan2(y - c[1], x - c[0]), z]);
}
/** Unghiul paletei 0 (pe θ ≈ 0) la raza rr, din direcția principală a punctelor ei de lângă rr (în s = rr·θ și z). */
function unghiDinPlasa(v: [number, number, number][], rr: number, palete: number): number {
  const pts = v.filter(([r, th]) => Math.abs(r - rr) < 1.3 && Math.abs(th) < Math.PI / palete);
  const s = pts.map(([, th]) => rr * th), h = pts.map(([, , z]) => z);
  const ms = s.reduce((t, x) => t + x, 0) / s.length, mh = h.reduce((t, x) => t + x, 0) / h.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < s.length; i++) { sxx += (s[i]! - ms) ** 2; syy += (h[i]! - mh) ** 2; sxy += (s[i]! - ms) * (h[i]! - mh); }
  return Math.abs(0.5 * Math.atan2(2 * sxy, sxx - syy)) * 180 / Math.PI;
}

test('corpul e închis pe plaja parametrilor (palete, diametre, forme, profile, găuri, sensuri, conul)', () => {
  const cazuri: Record<string, unknown>[] = [];
  for (const forma of ['rot', 'ingust', 'drept']) for (const profil of ['placa', 'aripa']) for (const gaura of ['x', 'r', 'b', 'nu'])
    cazuri.push({ forma, profil, gaura });
  for (const palete of [2, 3, 5, 8]) for (const diametru of [20, 30, 200]) cazuri.push({ palete, diametru, sens: palete % 2 ? 'stanga' : 'dreapta', con: 'da' });
  cazuri.push({ pas: 1.5, latime: 60, palete: 2, diametru: 200 }, { pas: 0.3, latime: 15, palete: 8, diametru: 20 }, { paleta: 'plata', pas: 0.59, diametru: 73.9 });
  for (const d of cazuri) {
    const p = elice(d);
    assert.equal(muchiiRele(p.tri), 0, JSON.stringify(d));
    assert.ok(p.tri.length > 500, JSON.stringify(d));
  }
});

test('cotele: diametrul, butucul Ø8 cu gaura din calibrare, înălțimea și conul', () => {
  const e = L.efective();
  // diametrul: cea mai mare rază față de centrul butucului
  for (const diametru of [27.4, 72, 200]) {
    const p = elice({ diametru, gaura: 'nu' }), v = polare(p, centru(p)), R = Math.max(...v.map((q) => q[0]));
    assert.ok(Math.abs(R - diametru / 2) < 0.05, `Ø${diametru}: raza ${R}`);
  }
  // înălțimea implicită: butucul de 8 (paletele de Ø72 la pasul 0,7 încap sub el); conul urcă 1,3 · 4 peste el: 13,2
  assert.ok(Math.abs(elice().dim[2]! - 8) < 1e-9, `înălțimea ${elice().dim[2]}`);
  assert.ok(Math.abs(elice({ con: 'da' }).dim[2]! - 13.2) < 1e-9, `cu con ${elice({ con: 'da' }).dim[2]}`);
  // paleta lată și abruptă la rădăcină cere butucul mai înalt: Ø200, 2 palete, pasul 1,5 (P 300), lățimea 60 %: la r 3,6,
  // β = atan(300 / 2π · 3,6) = 85,69°, coarda 0,6 · 60 = 36 (sub 0,85 · π · 3,6 / cos β); peste Ø80, paleta e groasă de
  // 1,2 · 200 / 80 = 3 la rădăcină (ADR 0340, 3.Cm-5), deci 36 · sin β + 3 · cos β = 36,12: butucul, 36,2; mai departe,
  // paletele (coarda 60, la 60°) urcă peste el
  const inalta = elice({ diametru: 200, palete: 2, pas: 1.5, latime: 60, gaura: 'nu' }), ci = centru(inalta);
  const butuc = polare(inalta, ci).filter((q) => Math.abs(q[0] - 4) < 1e-3);
  assert.ok(Math.abs(Math.max(...butuc.map((q) => q[2])) - 36.2) < 1e-9, `butucul înalt: ${Math.max(...butuc.map((q) => q[2]))}`);
  assert.ok(inalta.dim[2]! > 40, `paletele, mai înalte decât butucul: ${inalta.dim[2]}`);
  // gaura: vârfurile ei (prisma are vârfuri doar sus și jos), sub r 3,3: sub rădăcina paletelor (r 3,6) și butucul (r 4)
  const gaura = (g: string) => {
    const p = elice({ gaura: g }), v = polare(p, centru(p)).filter((q) => q[0] < 3.3);
    return { min: Math.min(...v.map((q) => q[0])), max: Math.max(...v.map((q) => q[0])) };
  };
  const x = gaura('x'), r = gaura('r'), b = gaura('b');
  assert.ok(Math.abs(x.max - Math.hypot(e.axGauraD! / 2, e.axGauraLat! / 2)) < 0.02, `crucea: colțul brațului ${x.max}`);
  assert.ok(Math.abs(x.min - e.axGauraLat! / 2 * Math.SQRT2) < 0.02, `crucea: colțul dintre brațe ${x.min}`);
  assert.ok(Math.abs(r.min - e.gauraD! / 2) < 0.03 && Math.abs(r.max - e.gauraD! / 2) < 0.03, `știftul: ${JSON.stringify(r)}`);
  assert.ok(Math.abs(b.min - e.baraGauraD! / 2) < 0.03 && Math.abs(b.max - e.baraGauraD! / 2) < 0.03, `bara: ${JSON.stringify(b)}`);
});

test('tipărită fără suport: fiecare secțiune a paletei își are punctul cel mai de jos pe masă', () => {
  for (const d of [{}, { profil: 'aripa' }, { paleta: 'plata', pas: 0.59, diametru: 73.9 }, { palete: 8, diametru: 40, pas: 0.4 }]) {
    const p = elice({ ...d, gaura: 'nu' }), v = polare(p, centru(p)), R = Math.max(...v.map((q) => q[0]));
    assert.ok(Math.min(...p.tri.flat().map((q) => q[2])) === 0, JSON.stringify(d));
    // pe razele secțiunilor de dincolo de butuc: cel mai de jos punct, la z = 0
    const raze = [...new Set(v.filter((q) => q[0] > 4.6).map((q) => q[0].toFixed(4)))].map(Number);
    assert.ok(raze.length >= 20, `secțiuni: ${raze.length}`);
    for (const rr of raze) {
      const zmin = Math.min(...v.filter((q) => Math.abs(q[0] - rr) < 1e-4).map((q) => q[2]));
      assert.ok(Math.abs(zmin) < 1e-9, `${JSON.stringify(d)}: la r ${rr}, z min ${zmin}`);
    }
    assert.ok(R > 4.6);
  }
});

test('unghiul paletei, din plasă: răsucită, atan(P / 2πr); plată, ca la 70 % din rază; pe hârtie, Ø72 la pasul 0,7', () => {
  // pe hârtie: P = 0,7 · 72 = 50,4; la butuc (r 4), atan(50,4 / 8π) = 63,5°; la vârf (r 36), atan(0,7 / π) = 12,56°;
  // consola la vârf, pe strat de 0,2: 0,2 / tan 12,56° = 0,898
  const c = L.eliceCote({});
  assert.ok(Math.abs(c.P - 50.4) < 1e-9 && Math.abs(c.bRad * 180 / Math.PI - 63.50) < 0.01, `P ${c.P}, β butuc ${c.bRad * 180 / Math.PI}`);
  assert.ok(Math.abs(c.bVarf * 180 / Math.PI - 12.56) < 0.01 && Math.abs(c.consola - 0.898) < 0.001, `β vârf ${c.bVarf}, consola ${c.consola}`);
  const p = elice({ gaura: 'nu' }), v = polare(p, centru(p));
  for (const f of [0.5, 0.7, 0.9]) {
    const rr = f * 36, astept = Math.atan(50.4 / (2 * Math.PI * rr)) * 180 / Math.PI, m = unghiDinPlasa(v, rr, 3);
    assert.ok(Math.abs(m - astept) < 1, `răsucită, la ${f}: ${m} față de ${astept}`);
  }
  // plată, ca 15790 din LDraw (Ø73,9 față de axa ei, 15°): pasul 0,59 dă la 70 % din rază atan(0,59 / (0,7 · π)) = 15,02°
  const dp = { paleta: 'plata', pas: 0.59, diametru: 73.9, gaura: 'nu' }, pp = elice(dp), vp = polare(pp, centru(pp));
  assert.ok(Math.abs(L.eliceCote(dp).bVarf * 180 / Math.PI - 15.02) < 0.01 && Math.abs(L.eliceCote(dp).bRad - L.eliceCote(dp).bVarf) < 1e-12);
  for (const f of [0.4, 0.7, 0.9]) {
    const m = unghiDinPlasa(vp, f * 36.95, 3);
    assert.ok(Math.abs(m - 15.02) < 1, `plată, la ${f}: ${m}`);
  }
});

test('paletele nu se ating: pe fiecare rază, unghiul ocupat de o paletă rămâne sub pasul dintre palete', () => {
  for (const d of [{ palete: 8, latime: 60, diametru: 40 }, { palete: 5, latime: 60, pas: 1.5 }, { palete: 2, latime: 60, pas: 0.3 }]) {
    const p = elice({ ...d, gaura: 'nu' }), v = polare(p, centru(p)).filter((q) => q[0] > 4.05), z = d.palete;
    const raze = [...new Set(v.map((q) => q[0].toFixed(4)))].map(Number);
    for (const rr of raze) {
      const inel = v.filter((q) => Math.abs(q[0] - rr) < 1e-4);
      // paleta 0 (θ ≈ 0): jumătatea ei de unghi, sub 0,86 din jumătatea pasului; nimic pe bisectoarea dintre palete
      const jum = Math.max(...inel.filter((q) => Math.abs(q[1]) < Math.PI / z).map((q) => Math.abs(q[1])));
      assert.ok(jum < 0.86 * Math.PI / z, `${JSON.stringify(d)}: la r ${rr}, jumătatea paletei ${jum} din ${Math.PI / z}`);
      assert.ok(!inel.some((q) => Math.abs(Math.abs(q[1]) - Math.PI / z) < 0.01), `${JSON.stringify(d)}: la r ${rr}, ceva pe bisectoare`);
    }
  }
});

test('„stânga” e oglinda lui „dreapta”; muchia de atac sus, în sensul rotației', () => {
  const pd = elice({ gaura: 'nu' }), ps = elice({ gaura: 'nu', sens: 'stanga' });
  const cd = centru(pd), cs = centru(ps);
  // fiecare vârf al stângii, oglindit (y → −y față de butuc), are un vârf al dreptei la mai puțin de 1e-6 mm (căutat pe o grilă)
  // doar paletele (dincolo de r 4,05): vârfurile butucului sunt mișcate deterministic, după coordonate, cu cel mult 0,0001 mm
  // (`prismaGauri`, pentru triangularea fețelor), deci nu se oglindesc exact
  const vd = polare(pd, cd).filter((q) => q[0] > 4.05).map(([r, th, z]): P3 => [r * Math.cos(th), r * Math.sin(th), z]);
  const vs = polare(ps, cs).filter((q) => q[0] > 4.05).map(([r, th, z]): P3 => [r * Math.cos(th), -r * Math.sin(th), z]);
  const grila = new Map<string, P3[]>(), cel = (q: P3, d = [0, 0, 0]) => q.map((x, i) => Math.floor(x / 0.01) + d[i]!).join(',');
  for (const q of vd) { const k = cel(q); (grila.get(k) ?? grila.set(k, []).get(k)!).push(q); }
  let lipsa = 0;
  for (const q of vs) {
    let gasit = false;
    for (let a = -1; a <= 1 && !gasit; a++) for (let b = -1; b <= 1 && !gasit; b++) for (let c = -1; c <= 1 && !gasit; c++)
      gasit = (grila.get(cel(q, [a, b, c])) ?? []).some((w) => Math.hypot(w[0] - q[0], w[1] - q[1], w[2] - q[2]) < 1e-6);
    if (!gasit) lipsa++;
  }
  assert.ok(lipsa === 0 && vs.length === vd.length, `vârfuri fără pereche în oglindă: ${lipsa} din ${vs.length}`);
  // dreapta: pe paleta 0, la 70 % din rază, partea cu θ > 0 (în sensul rotației, trigonometric de sus) e cea de sus
  const v = polare(pd, cd).filter(([r, th]) => Math.abs(r - 25.2) < 1.3 && Math.abs(th) < 1);
  const sus = v.filter((q) => q[1] > 0).reduce((t, q) => t + q[2], 0) / v.filter((q) => q[1] > 0).length;
  const jos = v.filter((q) => q[1] < 0).reduce((t, q) => t + q[2], 0) / v.filter((q) => q[1] < 0).length;
  assert.ok(sus > jos + 1, `muchia de atac: ${sus} față de ${jos}`);
});

test('marginile: paletele și diametrul în afara plajei se spun', () => {
  assert.deepEqual(simplu(elice({ palete: 12 }).avert), ['O elice are între 2 și 8 palete: am făcut-o cu 8.']);
  assert.deepEqual(simplu(elice({ palete: 1 }).avert), ['O elice are între 2 și 8 palete: am făcut-o cu 2.']);
  assert.deepEqual(simplu(elice({ diametru: 250 }).avert), ['Diametrul unei elice e între 20 și 200 mm: am făcut-o de 200 mm.']);
  assert.deepEqual(simplu(elice({ diametru: 72, palete: 3 }).avert), []);
  assert.equal(L.eliceCote({ pas: 5 }).pd, 1.5);
  assert.equal(L.eliceCote({ latime: 5 }).lat, 15);
});

/** Razele stațiilor paletei (secțiunile plasei), crescător: de la rădăcina din butuc (r 3,6) la vârf. */
function statii(v: [number, number, number][]): number[] {
  const pe = new Map<string, number>();
  for (const q of v) if (q[0] > 3.5 && Math.abs(q[0] - 4) > 1e-3 && !pe.has(q[0].toFixed(4))) pe.set(q[0].toFixed(4), q[0]);
  return [...pe.values()].sort((a, b) => a - b);
}
/**
 * Secțiunea paletei 0 la raza unei stații, adusă înapoi din unghiul ei de pe hârtie: u de-a lungul corzii (0 la muchia de fugă),
 * `mijloc` și `gros` în fiecare punct al corzii (linia de mijloc față de capete, grosimea dintre fața de sus și cea de jos).
 */
function sectiune(v: [number, number, number][], rr: number, beta: number, palete: number): { coarda: number; puncte: { x: number; mijloc: number; gros: number }[] } {
  const brut = v.filter(([r, th]) => Math.abs(r - rr) < 1e-4 && Math.abs(th) < Math.PI / palete)
    .map(([, th, z]) => ({ u: rr * th * Math.cos(beta) + z * Math.sin(beta), w: -rr * th * Math.sin(beta) + z * Math.cos(beta) }));
  const u0 = Math.min(...brut.map((q) => q.u)), coarda = Math.max(...brut.map((q) => q.u)) - u0;
  const pe = new Map<string, number[]>();
  for (const q of brut) { const k = (q.u - u0).toFixed(5); (pe.get(k) ?? pe.set(k, []).get(k)!).push(q.w); }
  const puncte = [...pe].map(([k, w]) => ({ x: +k / coarda, mijloc: (Math.max(...w) + Math.min(...w)) / 2, gros: Math.max(...w) - Math.min(...w) })).sort((a, b) => a.x - b.x);
  const m0 = (puncte[0]!.mijloc + puncte[puncte.length - 1]!.mijloc) / 2;
  return { coarda, puncte: puncte.map((q) => ({ ...q, mijloc: q.mijloc - m0 })) };
}

test('secțiunea plăcii curbate, pe hârtie: coarda cerută, grosimea de la 1,2 la 0,8, săgeata de 4 % din coardă, cu fața bombată în sus', () => {
  // Ø72, lățimea 30 %: coarda cea mai mare 0,3 · 36 = 10,8; la paleta rotunjită, plină între 25 % și 55 % din paletă
  const p = elice({ gaura: 'nu' }), v = polare(p, centru(p)), raze = statii(v);
  const beta = (r: number) => Math.atan(50.4 / (2 * Math.PI * r));
  assert.equal(raze.length, 29);
  // rădăcina: în butuc cu 0,4 mm (r 3,6), coarda 60 % din cea mai mare (6,48), groasă de 1,2
  assert.ok(Math.abs(raze[0]! - 3.6) < 1e-9, `rădăcina la r ${raze[0]}`);
  const rad = sectiune(v, raze[0]!, beta(raze[0]!), 3);
  assert.ok(Math.abs(rad.coarda - 6.48) < 1e-6, `coarda la rădăcină ${rad.coarda}`);
  assert.ok(rad.puncte.every((q) => Math.abs(q.gros - 1.2) < 1e-6), `grosimea la rădăcină ${rad.puncte.map((q) => q.gros.toFixed(3))}`);
  // la mijlocul paletei (stația 12: r = 3,6 + 32,4 · 12 / 28 = 17,486, la 42 % din paletă): coarda întreagă, 10,8; grosimea
  // 1,2 − 0,4 · 0,4214 = 1,031; linia de mijloc urcă la mijlocul corzii cu 4 % din coardă, 0,432 (parabolă: 4 · 0,04 · x(1 − x))
  const r12 = raze[12]!, x12 = (r12 - 4) / 32, mij = sectiune(v, r12, beta(r12), 3);
  assert.ok(Math.abs(r12 - 17.4857) < 1e-3 && Math.abs(x12 - 0.4214) < 1e-3, `stația 12: r ${r12}`);
  assert.ok(Math.abs(mij.coarda - 10.8) < 1e-6, `coarda la mijloc ${mij.coarda}`);
  assert.equal(mij.puncte.length, 13);
  for (const q of mij.puncte) {
    assert.ok(Math.abs(q.gros - 1.0314) < 1e-3, `grosimea la x ${q.x}: ${q.gros}`);
    assert.ok(Math.abs(q.mijloc - 4 * 0.04 * q.x * (1 - q.x) * 10.8) < 1e-6, `săgeata la x ${q.x}: ${q.mijloc}`);
  }
  assert.ok(Math.abs(mij.puncte[6]!.mijloc - 0.432) < 1e-6, `săgeata la mijlocul corzii ${mij.puncte[6]!.mijloc}`);
  // vârful: 2,5 · 0,8 = 2 (rotunjit, nu strâns într-un punct), gros de 0,8
  const varf = sectiune(v, 36, beta(36), 3);
  assert.ok(Math.abs(varf.coarda - 2.0) < 1e-6 && varf.puncte.every((q) => Math.abs(q.gros - 0.8) < 1e-6), `vârful: coarda ${varf.coarda}`);
});

test('formele paletei, pe hârtie: rotunjită (eliptică după 55 %), îngustată (jumătate la vârf), dreaptă; rădăcina, de la 60 % la toată coarda pe primul sfert', () => {
  const beta = (r: number) => Math.atan(50.4 / (2 * Math.PI * r));
  const coarda = (forma: string, i: number) => {
    const p = elice({ gaura: 'nu', forma }), v = polare(p, centru(p)), r = statii(v)[i]!;
    return { c: sectiune(v, r, beta(r), 3).coarda, x: Math.max(0, (r - 4) / 32) };
  };
  // vârful (stația 28): dreapta, 10,8; îngustată, 5,4; rotunjită, 2 (cât 2,5 grosimi)
  assert.ok(Math.abs(coarda('drept', 28).c - 10.8) < 1e-6 && Math.abs(coarda('ingust', 28).c - 5.4) < 1e-6 && Math.abs(coarda('rot', 28).c - 2.0) < 1e-6);
  // stația i e la r = 3,6 + 32,4 · i / 28, adică la (r − 4) / 32 din paletă. Stația 20 (r 26,743; 71,07 %): îngustată,
  // 10,8 · (1 − 0,5 · 0,7107) = 6,962; rotunjită, 10,8 · √(1 − ((0,7107 − 0,55) / 0,45)²) = 10,8 · 0,9340 = 10,087; stația 15
  // (r 20,957; 52,99 %, sub 55 %): rotunjita e încă plină, 10,8
  const i20 = coarda('ingust', 20), r20 = coarda('rot', 20), r15 = coarda('rot', 15);
  assert.ok(Math.abs(i20.x - 0.7107) < 1e-4 && Math.abs(i20.c - 6.962) < 2e-3, `îngustată la ${i20.x}: ${i20.c}`);
  assert.ok(Math.abs(r20.c - 10.087) < 2e-3, `rotunjită la ${r20.x}: ${r20.c}`);
  assert.ok(Math.abs(r15.x - 0.5299) < 1e-4 && Math.abs(r15.c - 10.8) < 1e-6, `rotunjită la ${r15.x}: ${r15.c}`);
  // rădăcina, la dreaptă: stația 2 (r 5,914; 5,98 %): 10,8 · (0,6 + 0,4 · 0,0598 / 0,25) = 7,514; stația 7 (r 11,7; 24,06 %):
  // 10,8 · (0,6 + 0,4 · 0,2406 / 0,25) = 10,638; stația 8 (r 12,857; 27,68 %, peste primul sfert): 10,8
  const d2 = coarda('drept', 2), d7 = coarda('drept', 7), d8 = coarda('drept', 8);
  assert.ok(Math.abs(d2.x - 0.0598) < 1e-4 && Math.abs(d2.c - 7.514) < 2e-3, `rădăcina la ${d2.x}: ${d2.c}`);
  assert.ok(Math.abs(d7.x - 0.2406) < 1e-4 && Math.abs(d7.c - 10.638) < 2e-3, `rădăcina la ${d7.x}: ${d7.c}`);
  assert.ok(Math.abs(d8.x - 0.2768) < 1e-4 && Math.abs(d8.c - 10.8) < 1e-6, `capătul rădăcinii la ${d8.x}: ${d8.c}`);
});

test('profilul de aripă (NACA 4412), pe hârtie: gros de 12 % din coardă spre muchia de atac, cel puțin cât placa, cu săgeata de 4 % la 40 % de muchia de atac', () => {
  // Ø200, 2 palete, lățimea 60 %: coarda 60; stația 12 (r = 3,6 + 96,4 · 12 / 28 = 44,914; la 42,6 %): pasul 0,7 → β = atan(140 / 2πr)
  const d = { gaura: 'nu', profil: 'aripa', diametru: 200, palete: 2, latime: 60 }, p = elice(d), v = polare(p, centru(p)), r = statii(v)[12]!;
  // peste Ø80, grosimea plăcii crește cu k = 200 / 80 = 2,5 (ADR 0340, 3.Cm-5)
  const x = (r - 4) / 96, s = sectiune(v, r, Math.atan(140 / (2 * Math.PI * r)), 2), t = 2.5 * (1.2 - 0.4 * x);
  assert.ok(Math.abs(s.coarda - 60) < 1e-6, `coarda ${s.coarda}`);
  // punctele corzii sunt pe cosinus (x = ½ − ½ cos(πi / 12)); grosimea NACA la xa = 1 − x de la muchia de atac:
  // 0,6 · (0,2969 √xa − 0,126 xa − 0,3516 xa² + 0,2843 xa³ − 0,1036 xa⁴) · c; cea mai mare dintre puncte, la xa = 0,25: 0,11882 · 60 = 7,129
  const cel = s.puncte.reduce((a, b) => (b.gros > a.gros ? b : a));
  assert.ok(Math.abs(cel.x - 0.75) < 1e-6 && Math.abs(cel.gros - 7.129) < 2e-3, `cel mai gros: la ${cel.x}, ${cel.gros}`);
  // la muchia de fugă și la cea de atac, cât placa (k · (1,2 − 0,4 · x)): profilul nu se subțiază sub grosimea plăcii
  assert.ok(Math.abs(s.puncte[0]!.gros - t) < 1e-6 && Math.abs(s.puncte[12]!.gros - t) < 1e-6, `muchiile: ${s.puncte[0]!.gros}, ${s.puncte[12]!.gros} față de ${t}`);
  assert.ok(s.puncte.every((q) => q.gros >= t - 1e-9));
  // linia de mijloc: la mijlocul corzii (xa = 0,5), 0,04 / 0,36 · (1 − 0,8 + 0,4 − 0,25) · 60 = 2,333; mai sus spre muchia de atac
  // (xa = 0,3706, în fața săgeții maxime: 0,25 · (0,8 · 0,3706 − 0,3706²) · 60 = 2,387), mai jos spre cea de fugă (xa = 0,6294:
  // 0,04 / 0,36 · (0,2 + 0,8 · 0,6294 − 0,6294²) · 60 = 2,049)
  assert.ok(Math.abs(s.puncte[6]!.mijloc - 2.3333) < 1e-3, `săgeata la mijloc ${s.puncte[6]!.mijloc}`);
  assert.ok(Math.abs(s.puncte[7]!.mijloc - 2.387) < 2e-3 && Math.abs(s.puncte[5]!.mijloc - 2.049) < 2e-3, `săgeata: ${s.puncte[7]!.mijloc}, ${s.puncte[5]!.mijloc}`);
});

test('vârful paletei rotunjite, la diametrele la care ultima stație cade cu o rotunjire peste 100 % din paletă: 2,5 · grosimea vârfului (2 mm până la Ø80), fără NaN', () => {
  // la 99 dintre diametrele din 0,1 în 0,1 mm (20,3; 20,8 … 155,3 … 195,8), r0 + (R − r0) · 28 / 28 iese cu un ulp peste R, iar
  // 1 − ((x − 0,55) / 0,45)² coboară sub zero cu 9e-16: radicalul lui ar fi NaN, deci coarda vârfului și toată plasa lui
  for (const diametru of [20.3, 20.8, 155.3, 177.8, 195.8]) {
    const p = elice({ gaura: 'nu', diametru }), v = polare(p, centru(p)), R = diametru / 2;
    assert.ok(p.tri.flat().every((q) => q.every(Number.isFinite)), `Ø${diametru}: un vârf fără coordonate`);
    assert.equal(muchiiRele(p.tri), 0, `Ø${diametru}`);
    const raze = statii(v), varf = sectiune(v, raze[28]!, Math.atan(0.7 * diametru / (2 * Math.PI * raze[28]!)), 3);
    // coarda vârfului, 2,5 · 0,8 · k (peste Ø80, k = Ø / 80: ADR 0340, 3.Cm-5): Ø155,3 → 3,8825
    const coarda = 2.5 * 0.8 * Math.max(1, diametru / 80);
    assert.ok(Math.abs(raze[28]! - R) < 1e-9 && Math.abs(varf.coarda - coarda) < 1e-6, `Ø${diametru}: vârful la r ${raze[28]}, coarda ${varf.coarda}, pe hârtie ${coarda}`);
  }
});

test('butucul Ø8 × 8 și conul: paleta intră în butuc, conul stă în el cu 0,1 mm și îl închide sus', () => {
  const p = elice({ gaura: 'nu', con: 'da' }), v = polare(p, centru(p));
  // butucul: vârfurile de pe r 4, de la masă la 8
  const butuc = v.filter((q) => Math.abs(q[0] - 4) < 1e-3 && q[2] <= 8 + 1e-9);
  assert.ok(butuc.length > 100 && Math.abs(Math.min(...butuc.map((q) => q[2]))) < 1e-9 && Math.abs(Math.max(...butuc.map((q) => q[2])) - 8) < 1e-9);
  // conul: baza pe r 4 la z 7,9 (0,1 mm în butuc, deci lipit de el), centrul bazei și vârful pe axă, la 7,9 și la 8 + 1,3 · 4 = 13,2
  const axa = v.filter((q) => q[0] < 1e-6).map((q) => q[2]);
  assert.ok(Math.abs(Math.min(...axa) - 7.9) < 1e-9 && Math.abs(Math.max(...axa) - 13.2) < 1e-9, `conul pe axă: ${Math.min(...axa)} … ${Math.max(...axa)}`);
  const baza = v.filter((q) => Math.abs(q[0] - 4) < 1e-3 && Math.abs(q[2] - 7.9) < 1e-9);
  assert.ok(baza.length >= 64, `baza conului: ${baza.length} vârfuri`);
  // paleta: rădăcina la r 3,6, în butuc (între gaura de cel mult r 2,6 și peretele de la r 4)
  assert.ok(Math.abs(statii(v)[0]! - 3.6) < 1e-9);
  // fără con, nimic pe axă peste butuc
  const fara = elice({ gaura: 'nu' });
  assert.ok(Math.abs(Math.max(...fara.tri.flat().map((q) => q[2])) - 8) < 1e-9);
});

test('implicitele și marginile plajei: 3 palete, Ø72, pasul 0,7, lățimea 30 %; fiecare parametru, adus în plaja lui', () => {
  const c = L.eliceCote({});
  assert.deepEqual([c.z, c.D, c.pd, c.lat, c.plata], [3, 72, 0.7, 30, false]);
  // lipsă, gol sau fără sens: implicitul; paletele, la întreg
  assert.deepEqual([L.eliceCote({ palete: '', diametru: null, pas: 'x', latime: undefined }).z, L.eliceCote({ diametru: '' }).D, L.eliceCote({ pas: 'x' }).pd], [3, 72, 0.7]);
  assert.equal(L.eliceCote({ palete: 3.4 }).z, 3);
  assert.equal(L.eliceCote({ palete: 4.6 }).z, 5);
  // marginile, de ambele părți
  assert.deepEqual([L.eliceCote({ palete: 1 }).z, L.eliceCote({ palete: 9 }).z], [2, 8]);
  assert.deepEqual([L.eliceCote({ diametru: 19 }).D, L.eliceCote({ diametru: 201 }).D], [20, 200]);
  assert.deepEqual([L.eliceCote({ pas: 0.29 }).pd, L.eliceCote({ pas: 1.51 }).pd], [0.3, 1.5]);
  assert.deepEqual([L.eliceCote({ latime: 14 }).lat, L.eliceCote({ latime: 61 }).lat], [15, 60]);
  assert.deepEqual(simplu(elice({ diametru: 10 }).avert), ['Diametrul unei elice e între 20 și 200 mm: am făcut-o de 20 mm.']);
  // în plajă, la margine, nimic de spus
  assert.deepEqual(simplu(elice({ palete: 2, diametru: 20 }).avert), []);
  assert.deepEqual(simplu(elice({ palete: 8, diametru: 200 }).avert), []);
});
