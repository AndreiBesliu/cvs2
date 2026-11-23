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
  // β = atan(300 / 2π · 3,6) = 85,69°, coarda 0,6 · 60 = 36 (sub 0,85 · π · 3,6 / cos β), deci 36 · sin β + 1,2 · cos β = 35,99:
  // butucul, 36,0; mai departe, paletele (coarda 60, la 60°) urcă peste el
  const inalta = elice({ diametru: 200, palete: 2, pas: 1.5, latime: 60, gaura: 'nu' }), ci = centru(inalta);
  const butuc = polare(inalta, ci).filter((q) => Math.abs(q[0] - 4) < 1e-3);
  assert.ok(Math.abs(Math.max(...butuc.map((q) => q[2])) - 36.0) < 1e-9, `butucul înalt: ${Math.max(...butuc.map((q) => q[2]))}`);
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
