/**
 * Ventilatorul cu carcasă din atelierul Easy 3Draw (ADR 0282, felia 3.Ts), pe plasele reale:
 * - corpul închis pe plaja parametrilor: rotorul (3–12 palete, Ø24–120, cu inel sau fără, sensurile, găurile) și carcasa
 *   (cu 2 sau 4 urechi);
 * - rotorul: vârful paletelor la Ø / 2 − jocul (de carcasă), butucul (Ø8, sau un sfert din rază la cele mari; înalt cât
 *   paletele, cel puțin 8), inelul prins de palete (ca LEGO 50899: gros de 1,2, în același contur);
 * - tipărit fără suport: fiecare secțiune a paletei își are punctul cel mai de jos pe masă;
 * - pasul constant, pe coarda paletei: tan β = P / 2πr, cu P = pasul · Ø;
 * - coarda: de la 60 % la rădăcină la lățimea cerută după primul sfert, apoi la fel până la vârf (vârful drept, lângă carcasă);
 * - paletele nu se ating; „stânga” e oglinda lui „dreapta”;
 * - carcasa: tubul (Ø interior cât s-a cerut, peretele de 2), înaltă cât paletele + 4 (cel puțin 8), cu urechile de jos
 *   (groase cât o grindă, 7,8) și găurile de știft din calibrare, cu lamaj, pe grila axului: la k · 8 mm de ax;
 * - marginile plajei se spun.
 * Valorile „pe hârtie” sunt calculate separat de motor (formulele din ADR, cu un script de o singură folosință).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Cote = {
  z: number; D: number; joc: number; Rt: number; pd: number; P: number; lat: number; rh: number; Hh: number; Hinel: number;
  Hc: number; k: number; urechi: number; bRad: number; bVarf: number; consola: number;
};
type Lego = {
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  ventilatorCote(d: Record<string, unknown>): Cote;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const rotor = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'ventilator', piesa: 'rotor', ...d });
const carcasa = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'ventilator', piesa: 'carcasa', ...d });
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const unghi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
type Polar = [r: number, th: number, z: number];
/**
 * Vârfurile plasei (fiecare o dată) în coordonate polare față de axă (motorul o face în jurul originii, `construieste` o mută
 * cu −baza). Corpurile făcute cu `prismaGauri` (butucul, inelul, carcasa) au vârfurile mișcate cu cel mult 0,0001 mm.
 */
function polare(p: Piesa): Polar[] {
  const c = [-p.baza[0]!, -p.baza[1]!], unice = new Map<string, P3>();
  for (const q of p.tri.flat()) unice.set(q.join(','), q);
  return [...unice.values()].map(([x, y, z]): Polar => [Math.hypot(x - c[0]!, y - c[1]!), Math.atan2(y - c[1]!, x - c[0]!), z]);
}
/** Vârfurile plasei, față de axă, în (x, y, z). */
function puncte(p: Piesa): P3[] {
  const c = [-p.baza[0]!, -p.baza[1]!];
  return p.tri.flat().map(([x, y, z]): P3 => [x - c[0]!, y - c[1]!, z]);
}
/** Razele stațiilor paletelor, crescător (fără vârfurile butucului, ale inelului și ale găurii). */
function statii(v: readonly Polar[], rh: number, scoase: readonly number[] = []): number[] {
  const pe = new Map<string, number>();
  for (const q of v) if (q[0] > rh - 0.5 && Math.abs(q[0] - rh) > 1e-3 && !scoase.some((s) => Math.abs(q[0] - s) < 1e-3) && !pe.has(q[0].toFixed(4))) pe.set(q[0].toFixed(4), q[0]);
  return [...pe.values()].sort((a, b) => a - b);
}
/**
 * Secțiunea paletei 0 la raza unei stații: proiectată pe coardă (unghiul β de pe hârtie), lățimea ei și capetele coardei
 * (mijlocul celor două puncte de la fiecare muchie, unde placa curbată are linia de mijloc pe coardă).
 */
function sectiune(v: readonly Polar[], rr: number, beta: number, palete: number) {
  const pts = v.filter(([r, th]) => Math.abs(r - rr) < 1e-4 && Math.abs(th) < Math.PI / palete)
    .map(([, th, z]) => { const s = rr * th; return { s, z, u: s * Math.cos(beta) + z * Math.sin(beta) }; });
  const u0 = Math.min(...pts.map((q) => q.u)), u1 = Math.max(...pts.map((q) => q.u));
  const capat = (u: number) => { const q = pts.filter((w) => Math.abs(w.u - u) < 1e-7); return { s: q.reduce((a, w) => a + w.s, 0) / q.length, z: q.reduce((a, w) => a + w.z, 0) / q.length, n: q.length }; };
  return { coarda: u1 - u0, a: capat(u0), b: capat(u1), zmin: Math.min(...pts.map((q) => q.z)) };
}
/** Pe hârtie, rotorul implicit (Ø40, jocul 0,8, 7 palete, pasul 0,8): raza stației i, de la rădăcina din butuc (4,4) la vârf (19,2). */
const hartie = (i: number) => { const r = 4.4 + (19.2 - 4.4) * i / 28; return { r, beta: Math.atan(32 / (2 * Math.PI * r)) }; };

test('corpul e închis pe plaja parametrilor: rotorul (palete, diametre, inelul, sensurile, găurile) și carcasa (2 sau 4 urechi)', () => {
  const cazuri: Record<string, unknown>[] = [{ piesa: 'rotor' }, { piesa: 'carcasa' }];
  for (const gaura of ['x', 'r', 'b', 'nu']) for (const inel of ['nu', 'da']) cazuri.push({ piesa: 'rotor', gaura, inel });
  for (const palete of [3, 7, 12]) for (const diametru of [24, 33.3, 120]) cazuri.push({ piesa: 'rotor', palete, diametru, sens: palete % 2 ? 'stanga' : 'dreapta', inel: palete === 12 ? 'da' : 'nu' });
  for (const urechi of [2, 4]) for (const diametru of [24, 41, 48, 120]) cazuri.push({ piesa: 'carcasa', urechi, diametru });
  cazuri.push({ piesa: 'rotor', pas: 1.5, latime: 60, palete: 3, diametru: 120, joc: 2 }, { piesa: 'rotor', pas: 0.3, latime: 15, palete: 12, diametru: 24, joc: 0.3 });
  for (const d of cazuri) {
    const p = L.construieste({ tip: 'ventilator', ...d });
    assert.equal(muchiiRele(p.tri), 0, JSON.stringify(d));
    assert.ok(p.tri.length > 300, JSON.stringify(d));
    assert.ok(p.tri.flat(2).every(Number.isFinite), JSON.stringify(d));
  }
});

test('rotorul: vârful la Ø / 2 − jocul, butucul (Ø8, sau un sfert din rază), înalt cât paletele (cel puțin 8), gaura din calibrare', () => {
  const e = L.efective();
  // pe hârtie: Ø40 cu jocul 0,8 → vârful la 19,2; Ø24 cu 0,3 → 11,7; Ø120 cu 2 → 58
  for (const [diametru, joc, R] of [[40, 0.8, 19.2], [24, 0.3, 11.7], [120, 2, 58]] as const) {
    const v = polare(rotor({ diametru, joc, gaura: 'nu' }));
    assert.ok(Math.abs(Math.max(...v.map((q) => q[0])) - R) < 1e-6, `Ø${diametru}, jocul ${joc}: vârful la ${Math.max(...v.map((q) => q[0]))}`);
    assert.ok(Math.abs(L.ventilatorCote({ diametru, joc }).Rt - R) < 1e-9);
  }
  // butucul: max(4; un sfert din raza vârfului, la zecime): Ø40 → 4,8; Ø24 → 4; Ø120 cu jocul 2 → 14,5; înălțimea, cât cea mai
  // înaltă secțiune a paletei, la zecime în sus, cel puțin 8: implicit 8 (paletele, 4,59); Ø120, 3 palete, pasul 1,5, lățimea 60 → 27
  for (const [d, rh, Hh] of [[{}, 4.8, 8], [{ diametru: 24 }, 4, 8], [{ diametru: 120, joc: 2 }, 14.5, 12.4], [{ diametru: 120, palete: 3, pas: 1.5, latime: 60 }, 14.8, 27]] as const) {
    const q = L.ventilatorCote(d);
    assert.ok(Math.abs(q.rh - rh) < 1e-9 && Math.abs(q.Hh - Hh) < 1e-9, `${JSON.stringify(d)}: butucul ${q.rh} × ${q.Hh}`);
    const p = rotor({ ...d, gaura: 'nu' });
    assert.ok(Math.abs(p.dim[2]! - Hh) < 1e-9, `${JSON.stringify(d)}: înălțimea ${p.dim[2]}`);
    assert.ok(Math.max(...p.tri.flat().map((w) => w[2])) <= Hh + 1e-9);
    const sus = polare(p).filter((w) => Math.abs(w[2] - Hh) < 1e-9);
    assert.ok(Math.abs(Math.max(...sus.map((w) => w[0])) - rh) < 1e-3, `${JSON.stringify(d)}: raza butucului sus ${Math.max(...sus.map((w) => w[0]))}`);
  }
  // gaura: vârfurile ei, sub raza 3,3 (sub rădăcina paletelor, 4,4, și butucul, 4,8)
  const gaura = (g: string) => {
    const v = polare(rotor({ gaura: g })).filter((q) => q[0] < 3.3);
    return { min: Math.min(...v.map((q) => q[0])), max: Math.max(...v.map((q) => q[0])) };
  };
  const x = gaura('x'), r = gaura('r'), b = gaura('b');
  assert.ok(Math.abs(x.max - Math.hypot(e.axGauraD! / 2, e.axGauraLat! / 2)) < 0.02, `crucea: colțul brațului ${x.max}`);
  assert.ok(Math.abs(r.min - e.gauraD! / 2) < 0.03 && Math.abs(r.max - e.gauraD! / 2) < 0.03, `știftul: ${JSON.stringify(r)}`);
  assert.ok(Math.abs(b.min - e.baraGauraD! / 2) < 0.03 && Math.abs(b.max - e.baraGauraD! / 2) < 0.03, `bara: ${JSON.stringify(b)}`);
});

test('inelul prins de palete (ca LEGO 50899): gros de 1,2, în același contur (vârful tot la Ø / 2 − jocul), înalt cât paletele', () => {
  const p = rotor({ inel: 'da', gaura: 'nu' }), v = polare(p), q = L.ventilatorCote({ inel: 'da' });
  // pe hârtie: inelul de la 18 la 19,2, înalt de 4,6 (cea mai înaltă secțiune a paletelor, 4,582, la zecime în sus); paletele
  // intră în el 0,4 (până la 18,4)
  assert.ok(Math.abs(q.Hinel - 4.6) < 1e-9, `inelul înalt de ${q.Hinel}`);
  assert.ok(Math.abs(Math.max(...v.map((w) => w[0])) - 19.2) < 1e-3);
  const inel = v.filter((w) => w[0] > 17.95);
  const perete = (w: Polar) => Math.abs(w[0] - 18) < 1e-3 || Math.abs(w[0] - 19.2) < 1e-3;
  assert.ok(inel.every((w) => perete(w) || Math.abs(w[0] - 18.4) < 1e-9), 'în inel, doar pereții lui și capetele paletelor');
  const pereti = inel.filter(perete);
  assert.deepEqual([...new Set(pereti.map((w) => w[2].toFixed(6)))].sort(), ['0.000000', '4.600000']);
  const varfPalete = Math.max(...v.filter((w) => w[0] < 18.5).map((w) => w[0]));
  assert.ok(Math.abs(varfPalete - 18.4) < 1e-6, `paletele, până la ${varfPalete}`);
  // fără inel, nimic între 18,5 și 19,2 nu e perete
  assert.ok(!polare(rotor({ gaura: 'nu' })).some((w) => Math.abs(w[0] - 18) < 1e-3));
});

test('tipărit fără suport: fiecare secțiune a paletei își are punctul cel mai de jos pe masă', () => {
  for (const d of [{}, { palete: 12, diametru: 24 }, { diametru: 120, pas: 1.5, latime: 60, palete: 3 }, { inel: 'da' }]) {
    const q = L.ventilatorCote(d), p = rotor({ ...d, gaura: 'nu' }), v = polare(p);
    assert.ok(Math.min(...p.tri.flat().map((w) => w[2])) === 0, JSON.stringify(d));
    const scoase = d.inel === 'da' ? [q.Rt, q.Rt - 1.2] : [];
    const raze = statii(v, q.rh, scoase);
    assert.equal(raze.length, 29, JSON.stringify(d));
    for (const rr of raze) {
      const zmin = Math.min(...v.filter((w) => Math.abs(w[0] - rr) < 1e-4).map((w) => w[2]));
      assert.ok(Math.abs(zmin) < 1e-9, `${JSON.stringify(d)}: la r ${rr}, z min ${zmin}`);
    }
  }
});

test('pasul constant, pe coarda paletei: tan β = P / 2πr; pe hârtie, Ø40 la pasul 0,8 → P 32, 46,7° la butuc, 14,86° la vârf', () => {
  const c = L.ventilatorCote({});
  assert.ok(c.z === 7 && c.D === 40 && c.joc === 0.8 && c.pd === 0.8 && c.lat === 45 && c.urechi === 2, JSON.stringify(c));
  assert.ok(Math.abs(c.P - 32) < 1e-9, `P ${c.P}`);
  assert.ok(Math.abs(c.bRad * 180 / Math.PI - 46.696) < 1e-3 && Math.abs(c.bVarf * 180 / Math.PI - 14.856) < 1e-3, `β ${c.bRad} ${c.bVarf}`);
  assert.ok(Math.abs(c.consola - 0.2 / (32 / (2 * Math.PI * 19.2))) < 1e-9, `consola ${c.consola}`);
  const v = polare(rotor({ gaura: 'nu' })), raze = statii(v, 4.8);
  for (const i of [0, 8, 14, 21, 28]) {
    const h = hartie(i), s = sectiune(v, raze[i]!, h.beta, 7);
    assert.ok(Math.abs(raze[i]! - h.r) < 1e-9, `stația ${i}: r ${raze[i]}`);
    assert.ok(s.a.n === 2 && s.b.n === 2, `stația ${i}: capetele`);
    assert.ok(Math.abs((s.b.z - s.a.z) / (s.b.s - s.a.s) - 32 / (2 * Math.PI * h.r)) < 1e-9, `stația ${i}: panta ${(s.b.z - s.a.z) / (s.b.s - s.a.s)}`);
  }
});

test('coarda, pe hârtie: lățimea cerută (45 % din 19,2 = 8,64) până la vârf; lângă butuc, strânsă la 85 % din pasul dintre palete', () => {
  const v = polare(rotor({ gaura: 'nu' })), raze = statii(v, 4.8);
  const coarda = (i: number) => sectiune(v, raze[i]!, hartie(i).beta, 7).coarda;
  // stațiile 14, 21 și 28 (r 11,8; 15,5; 19,2): toată lățimea, 8,64, și la vârf (drept, fără rotunjire)
  for (const i of [14, 21, 28]) assert.ok(Math.abs(coarda(i) - 8.64) < 1e-6, `stația ${i}: ${coarda(i)}`);
  // stațiile 2 și 8 (r 5,457; 8,629): coarda cerută (5,815; 8,64) nu încape; secțiunea e strânsă la 0,85 · 2πr / 7, deci coarda
  // iese 4,5710 și 6,9705 (pe hârtie, cu aceeași strângere)
  assert.ok(Math.abs(coarda(2) - 4.570989) < 1e-5, `stația 2: ${coarda(2)}`);
  assert.ok(Math.abs(coarda(8) - 6.970478) < 1e-5, `stația 8: ${coarda(8)}`);
  // lățimea cerută se vede: 30 % din 19,2 = 5,76, la vârf
  const v30 = polare(rotor({ gaura: 'nu', latime: 30 }));
  assert.ok(Math.abs(sectiune(v30, statii(v30, 4.8)[28]!, hartie(28).beta, 7).coarda - 5.76) < 1e-6);
});

test('paletele nu se ating: pe fiecare rază, golul dintre ele e cel puțin 15 % din pasul dintre palete', () => {
  for (const d of [{ palete: 12, latime: 60 }, { palete: 12, latime: 60, pas: 0.3, diametru: 24 }, { palete: 7, latime: 60, pas: 1.5, diametru: 120 }]) {
    const q = L.ventilatorCote(d), v = polare(rotor({ ...d, gaura: 'nu' })), raze = statii(v, q.rh), pas = 2 * Math.PI / q.z;
    let strans = 0;
    for (const rr of raze) {
      const a = v.filter((w) => Math.abs(w[0] - rr) < 1e-4).map((w) => { const f = w[1] / pas; return (f - Math.floor(f)) * pas; }).sort((p1, p2) => p1 - p2);
      let gol = a[0]! + pas - a[a.length - 1]!;
      for (let k = 1; k < a.length; k++) gol = Math.max(gol, a[k]! - a[k - 1]!);
      assert.ok(gol >= 0.15 * pas - 1e-9, `${JSON.stringify(d)}: la r ${rr}, golul ${gol} din ${pas}`);
      if (pas - gol > 0.84 * pas) strans++;
    }
    assert.ok(strans >= 3, `${JSON.stringify(d)}: stații strânse la limită: ${strans}`);
  }
});

test('„stânga” e oglinda lui „dreapta”', () => {
  const vd = puncte(rotor({ gaura: 'nu' })).filter(([x, y]) => Math.hypot(x, y) > 4.85).map(([x, y, z]): P3 => [x, y, z]);
  const vs = puncte(rotor({ gaura: 'nu', sens: 'stanga' })).filter(([x, y]) => Math.hypot(x, y) > 4.85).map(([x, y, z]): P3 => [x, -y, z]);
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

test('carcasa: tubul (Ø interior cerut, peretele 2), înaltă cât paletele + 4, urechile de jos cu găurile de știft la k · 8 mm de ax', () => {
  const e = L.efective();
  // pe hârtie, implicit (Ø40): tubul de la 20 la 22, înalt de max(8, ⌈4,594⌉ + 4) = 9; urechile pe x, găurile la 3 știfturi (24)
  const p = carcasa(), pts = puncte(p);
  assert.deepEqual(simplu(p.avert), []);
  assert.ok(Math.abs(p.dim[2]! - 9) < 1e-9 && Math.abs(L.ventilatorCote({}).Hc - 9) < 1e-9, `înaltă de ${p.dim[2]}`);
  // cutia: pe x, până la marginea urechii (24 + 3,6); pe y, tubul (22)
  assert.ok(Math.abs(p.dim[0]! - 55.2) < 1e-3 && Math.abs(p.dim[1]! - 44) < 1e-3, `cutia ${p.dim}`);
  const raze = pts.map(([x, y]) => Math.hypot(x, y));
  assert.ok(Math.abs(Math.min(...raze) - 20) < 1e-3, `interiorul tubului ${Math.min(...raze)}`);
  // tubul: de jos până sus; jos, în straturile urechilor (lamajul 0–0,8, gaura 0,79–7,01, lamajul 7–7,8), apoi singur (7,79–9)
  const tub = pts.filter(([x, y]) => Math.abs(Math.hypot(x, y) - 22) < 1e-3);
  assert.deepEqual([...new Set(tub.map((w) => w[2].toFixed(4)))].sort(), ['0.0000', '0.7900', '0.8000', '7.0000', '7.0100', '7.7900', '7.8000', '9.0000']);
  // urechile: groase de 7,8 (cât o grindă), gaura Ø din calibrare la mijloc, lamajul jos și sus (0,8)
  const gaura = (cx: number, cy: number, zz: number, q = pts) => {
    const g = q.filter(([x, y, z]) => Math.hypot(x - cx, y - cy) < 3.4 && Math.abs(z - zz) < 1e-9);
    return { n: g.length, min: Math.min(...g.map(([x, y]) => Math.hypot(x - cx, y - cy))), max: Math.max(...g.map(([x, y]) => Math.hypot(x - cx, y - cy))) };
  };
  const rotunda = (g: { n: number; min: number; max: number }, d: number) => g.n > 0 && Math.abs(g.min - d / 2) < 0.03 && Math.abs(g.max - d / 2) < 0.03;
  for (const cx of [24, -24]) {
    const mij = gaura(cx, 0, 0.79), jos = gaura(cx, 0, 0), sus = gaura(cx, 0, 7.8);
    assert.ok(rotunda(mij, e.gauraD!), `gaura la ${cx}: ${JSON.stringify(mij)}`);
    assert.ok(rotunda(jos, e.lamajD!) && rotunda(sus, e.lamajD!), `lamajul la ${cx}: ${JSON.stringify([jos, sus])}`);
  }
  // deasupra urechii (7,79–9), canalul lamajului trece și prin peretele carcasei: un știft intră și de sus; spre interior rămân
  // 0,8 mm de perete (lamajul începe la 24 − 3,2 = 20,8)
  for (const zz of [7.79, 9]) for (const cx of [24, -24]) {
    const sus = pts.filter(([, , z]) => Math.abs(z - zz) < 1e-9), d = (x: number, y: number) => Math.hypot(x - cx, y);
    assert.ok(sus.every(([x, y]) => d(x, y) > e.lamajD! / 2 - 0.03), `la z ${zz}, nimic în canalul de la ${cx}`);
    const canal = sus.filter(([x, y]) => Math.abs(d(x, y) - e.lamajD! / 2) < 0.03 && Math.hypot(x, y) < 21.99);
    assert.ok(canal.length >= 5, `la z ${zz}, peretele canalului de la ${cx}: ${canal.length} vârfuri`);
    assert.ok(Math.abs(Math.min(...canal.map(([x, y]) => Math.hypot(x, y))) - 20.8) < 0.03, `la z ${zz}, peretele rămas la ${cx}`);
  }
  const ureche = pts.filter(([x]) => x > 23);
  assert.deepEqual([...new Set(ureche.map((w) => w[2].toFixed(4)))].sort(), ['0.0000', '0.7900', '0.8000', '7.0000', '7.0100', '7.8000']);
  // pe y, nimic dincolo de tub cu 2 urechi; cu 4, și acolo găurile la 24
  assert.ok(!pts.some(([, y]) => Math.abs(y) > 22.001));
  const p4 = carcasa({ urechi: 4 }), pts4 = puncte(p4);
  assert.ok(Math.abs(p4.dim[0]! - 55.2) < 1e-3 && Math.abs(p4.dim[1]! - 55.2) < 1e-3, `cu 4 urechi: ${p4.dim}`);
  for (const [cx, cy] of [[0, 24], [0, -24], [24, 0], [-24, 0]] as const) assert.ok(rotunda(gaura(cx, cy, 0.79, pts4), e.gauraD!), `gaura la (${cx}, ${cy})`);
  // k = ⌈(Ø/2 + 0,8 + lamaj/2) / 8⌉: Ø24 → 2 (16); Ø48 → 4 (32, fiindcă 24 + 0,8 + 3,2 = 28); Ø120 → 8 (64)
  for (const [diametru, k] of [[24, 2], [40, 3], [48, 4], [120, 8]] as const) {
    assert.equal(L.ventilatorCote({ diametru }).k, k, `Ø${diametru}`);
    const pp = puncte(carcasa({ diametru }));
    assert.ok(rotunda(gaura(8 * k, 0, 0.79, pp), e.gauraD!) && rotunda(gaura(8 * k, 0, 0, pp), e.lamajD!), `Ø${diametru}: gaura la ${8 * k}`);
    // lamajul nu intră în tub: marginea lui, la cel puțin 0,8 de peretele dinăuntru
    assert.ok(8 * k - e.lamajD! / 2 >= diametru / 2 + 0.8 - 1e-9);
    // canalul de deasupra urechii, doar unde lamajul ajunge la peretele de afară (Ø24: 12,8 < 14; Ø120: 60,8 < 62; Ø48, cu
    // gaura la 32: 28,8 ≥ 26, tubul rămâne întreg)
    const Hc = L.ventilatorCote({ diametru }).Hc, sus = pp.filter(([x, y, z]) => Math.abs(z - Hc) < 1e-9 && Math.hypot(x, y) < diametru / 2 + 1.99);
    const canal = sus.filter(([x, y]) => [8 * k, -8 * k].some((cx) => Math.abs(Math.hypot(x - cx, y) - e.lamajD! / 2) < 0.03));
    assert.equal(canal.length > 0, 8 * k - e.lamajD! / 2 < diametru / 2 + 2, `Ø${diametru}: canalul`);
    assert.ok(sus.every(([x, y]) => canal.some((c) => c[0] === x && c[1] === y) || Math.abs(Math.hypot(x, y) - diametru / 2) < 1e-3), `Ø${diametru}: sus, doar golul și canalul`);
  }
});

test('carcasa se potrivește rotorului: jocul pe rază, înălțimea cât paletele + 4 (cel puțin 8), fără inel sau sens în ea', () => {
  for (const d of [{}, { diametru: 24, joc: 0.3 }, { diametru: 120, joc: 2 }, { diametru: 120, palete: 3, pas: 1.5, latime: 60 }]) {
    const q = L.ventilatorCote(d), r = polare(rotor({ ...d, gaura: 'nu' })), c = polare(carcasa(d));
    const varf = Math.max(...r.map((w) => w[0])), interior = Math.min(...c.map((w) => w[0]));
    assert.ok(Math.abs(interior - varf - q.joc) < 1e-3, `${JSON.stringify(d)}: jocul ${interior - varf}`);
    const hb = Math.max(...r.filter((w) => w[0] > q.rh + 0.01).map((w) => w[2]));
    assert.ok(Math.abs(q.Hc - Math.max(8, Math.ceil(hb - 1e-9) + 4)) < 1e-9, `${JSON.stringify(d)}: carcasa ${q.Hc}, paletele ${hb}`);
  }
  // pe hârtie: Ø24 cu jocul 0,3 → 8; Ø120 cu jocul 2 → 17; Ø120, 3 palete, pasul 1,5, lățimea 60 → 31
  assert.deepEqual([L.ventilatorCote({ diametru: 24, joc: 0.3 }).Hc, L.ventilatorCote({ diametru: 120, joc: 2 }).Hc, L.ventilatorCote({ diametru: 120, palete: 3, pas: 1.5, latime: 60 }).Hc], [8, 17, 31]);
  // carcasa nu depinde de inel, sens sau gaură
  const baza = carcasa().tri;
  for (const d of [{ inel: 'da' }, { sens: 'stanga' }, { gaura: 'r' }]) assert.deepEqual(carcasa(d).tri, baza, JSON.stringify(d));
});

test('implicitele și marginile: paletele și diametrul în afara plajei se spun; jocul, pasul, lățimea și urechile se aduc în plajă', () => {
  assert.deepEqual(simplu(rotor({ palete: 14 }).avert), ['Un ventilator are între 3 și 12 palete: l-am făcut cu 12.']);
  assert.deepEqual(simplu(rotor({ palete: 2 }).avert), ['Un ventilator are între 3 și 12 palete: l-am făcut cu 3.']);
  assert.deepEqual(simplu(rotor({ diametru: 150 }).avert), ['Carcasa unui ventilator are între 24 și 120 mm în interior: am făcut-o de 120 mm.']);
  assert.deepEqual(simplu(carcasa({ diametru: 10 }).avert), ['Carcasa unui ventilator are între 24 și 120 mm în interior: am făcut-o de 24 mm.']);
  assert.deepEqual(simplu(rotor().avert), []);
  const c = (d: Record<string, unknown>) => L.ventilatorCote(d);
  assert.deepEqual([c({ joc: 5 }).joc, c({ joc: 0.1 }).joc], [2, 0.3]);
  assert.deepEqual([c({ pas: 5 }).pd, c({ pas: 0.1 }).pd], [1.5, 0.3]);
  assert.deepEqual([c({ latime: 500 }).lat, c({ latime: 5 }).lat], [60, 15]);
  assert.deepEqual([c({ urechi: 4 }).urechi, c({ urechi: 3 }).urechi, c({ urechi: 'x' }).urechi], [4, 2, 2]);
  assert.deepEqual([c({ palete: 6.6 }).z, c({ palete: 3.4 }).z], [7, 3]);
  // ce nu e număr ia implicitul
  assert.deepEqual([c({ palete: 'x' }).z, c({ diametru: null }).D, c({ joc: '' }).joc, c({ pas: undefined }).pd, c({ latime: 'lat' }).lat], [7, 40, 0.8, 0.8, 45]);
  // aceeași piesă din valorile implicite scrise și din nimic
  assert.deepEqual(rotor({ palete: 7, diametru: 40, joc: 0.8, pas: 0.8, latime: 45, sens: 'dreapta', gaura: 'x', inel: 'nu' }).tri, rotor().tri);
  assert.deepEqual(carcasa({ palete: 7, diametru: 40, joc: 0.8, pas: 0.8, latime: 45, urechi: 2 }).tri, carcasa().tri);
});
