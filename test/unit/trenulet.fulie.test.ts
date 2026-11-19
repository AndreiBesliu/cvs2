/**
 * Fulia din atelierul Easy 3Draw (ADR 0280, felia 3.Tk), pe hârtie, față de cotele LEGO din biblioteca LDraw (CC BY 4.0,
 * secțiunile r–z și felia z = 0 ale pieselor 4185a și 4185b, pe pași de 0,1 mm):
 * - Ø24, obada de 3,5 mm, butucul de 4 mm, discul de 2,4 mm cu șase găuri de știft (Ø4,75 la r 8, de la 30°, din 60 în 60 de
 *   grade), peretele de 0,5 mm sub canal (banda de la r 10,5);
 * - canalul în V (4185a): de la r 12 la ±1,3 mm de mijloc până la r 11 la ±0,65 mm, cu fundul plat; canalul rotund
 *   (4185b): fundul la r 10,99, r 11,15 la ±0,5, r 11,5 la ±0,84, r 12 la ±1,0;
 * - cureaua deschisă dintre două fulii: 2·√(C² − d²) + π(r1 + r2) + 2d·asin(d / C), pe fundul canalelor.
 * Tipărită culcată (fața jos), fulia are fața și obada la z 0, iar butucul iese cu 0,5 mm în sus.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[] };
type Lego = {
  seteaza(s?: Record<string, unknown> | null): void;
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  fulieFete(d: Record<string, unknown>): { D: number; W: number; spite: boolean; stift: boolean };
  fulieMinimaFata(d: Record<string, unknown>, fata: 'spite' | 'stift'): number;
  cureaua(a: Record<string, unknown>, b: Record<string, unknown>, C: unknown): { lungime: number; minim: number; atinge: boolean };
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const fulie = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'fulie', ...d });
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const aproape = (a: number, b: number, tol = 0.002) => Math.abs(a - b) <= tol;

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
/** Raza cea mai mare a plasei pe planul z (din intersecția triunghiurilor cu el): profilul canalului, ca la LDraw. */
function razaMax(p: Piesa, z: number): number {
  const cx = p.dim[0]! / 2, cy = p.dim[1]! / 2;
  let rmax = -Infinity;
  for (const t of p.tri) {
    const a = t.map((q) => q[2] - z);
    if (Math.min(...a) > 0 || Math.max(...a) < 0) continue;
    for (let i = 0; i < 3; i++) {
      const P = t[i]!, Q = t[(i + 1) % 3]!, ap = a[i]!, aq = a[(i + 1) % 3]!;
      if (ap === aq || !((ap <= 0 && aq >= 0) || (aq <= 0 && ap >= 0))) continue;
      const w = ap / (ap - aq);
      rmax = Math.max(rmax, Math.hypot(P[0] + (Q[0] - P[0]) * w - cx, P[1] + (Q[1] - P[1]) * w - cy));
    }
  }
  return rmax;
}
/**
 * Câte corpuri cuprind punctul de la raza r, unghiul u (grade) și înălțimea z, față de axa fuliei: numărul de înfășurare pe
 * o rază în sus, din semnul normalelor tăiate (corpurile se suprapun, deci paritatea nu ajunge). Unghiul și raza se mișcă
 * puțin, ca raza să nu treacă printr-o muchie.
 */
function material(p: Piesa, r: number, u: number, z: number): boolean {
  const a = (u * Math.PI) / 180 + 0.0137, x = p.dim[0]! / 2 + (r + 1.1e-4) * Math.cos(a), y = p.dim[1]! / 2 + (r + 1.1e-4) * Math.sin(a);
  let w = 0;
  for (const [A, B, C] of p.tri) {
    const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    if (Math.abs(d) < 1e-12) continue;
    const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / d;
    if (l1 < 0 || l2 < 0 || l1 + l2 > 1) continue;
    if (l1 * A[2] + l2 * B[2] + (1 - l1 - l2) * C[2] <= z) continue;
    w += (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) > 0 ? 1 : -1;
  }
  return w > 0;
}
function volum(tri: readonly Tri[]): number {
  let v = 0;
  for (const [a, b, c] of tri) v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  return v / 6;
}

test('corpul e închis la toate canalele, fețele și găurile, de la cea mai mică la cea mai mare fulie', () => {
  for (const canal of ['v', 'rotund', 'plat']) for (const spite of ['disc', 'stift', 'drepte', 'y']) for (const gaura of ['x', 'r', 'nu'])
    for (const [diam, lat, latCanal] of [[24, 3.5, undefined], [12, 2, undefined], [200, 40, 20], [48, 7.5, 3.3], [17.8, 4, 1]]) {
      const p = fulie({ canal, spite, gaura, diam, lat, latCanal, nrSpite: 5 });
      assert.equal(muchiiRele(p.tri), 0, `${canal}, ${spite}, ${gaura}, Ø${diam} × ${lat}: muchii fără pereche`);
    }
  const lego = fulie();
  assert.deepEqual(simplu(lego.dim.map((v) => Math.round(v * 1000) / 1000)), [24, 24, 4], 'implicit: ca LEGO 4185, Ø24, cu butucul de 4 mm');
  assert.deepEqual(simplu(lego.avert), []);
});

test('cotele LEGO 4185a: canalul în V, banda, discul cu găurile de știft, butucul și crucea', () => {
  const p = fulie(), zc = 1.75;
  // canalul: fundul la r 11 pe ±0,65, flancul drept până la r 12 la ±1,3 (r 11,5 la ±0,975), marginile la r 12 până la fețe
  for (const s of [-1, 1]) {
    for (const dz of [0, 0.3, 0.6]) assert.ok(aproape(razaMax(p, zc + s * dz), 11), `fundul la ${s * dz}: ${razaMax(p, zc + s * dz)}`);
    assert.ok(aproape(razaMax(p, zc + s * 0.975), 11.5), `flancul la ${s * 0.975}: ${razaMax(p, zc + s * 0.975)}`);
    assert.ok(aproape(razaMax(p, zc + s * 0.8), 11 + 0.15 / 0.65), `flancul la ${s * 0.8}`);
    for (const dz of [1.35, 1.7]) assert.ok(aproape(razaMax(p, zc + s * dz), 12), `marginea la ${s * dz}`);
  }
  // materialul, punct cu punct: canalul gol, marginile pline, banda de la r 10,5 (peretele de 0,5 sub fund)
  const gol: [number, number, number][] = [[11.05, 0, 1.75], [11.05, 0, 1.15], [11.55, 0, 2.725], [11.95, 0, 2.9], [12.05, 0, 0.2], [10.45, 0, 3.0]];
  const plin: [number, number, number][] = [[10.95, 0, 1.75], [11.45, 0, 2.725], [11.95, 0, 0.2], [11.95, 0, 3.3], [10.55, 0, 3.0]];
  // discul, de 2,4 mm, pe fața de jos; butucul, r 3,89 (crucea + 1,2), înalt de 4 mm; crucea de 5 × 2 (varianta 3)
  gol.push([6.5, 0, 2.45], [3.95, 45, 3.95], [3.85, 45, 4.05], [2.45, 0, 2], [0.9, 90, 3]);
  plin.push([6.5, 0, 2.35], [3.85, 45, 3.95], [2.55, 0, 2], [1.5, 45, 2]);
  // șase găuri de știft la r 8, de la 30° din 60 în 60 (Ø5, varianta 3), cu discul plin între ele; știftul LEGO (Ø4,75) trece
  // de bandă: la r 10,4, peste disc, e gol
  for (let k = 0; k < 6; k++) { gol.push([8, 30 + 60 * k, 1.2], [5.55, 30 + 60 * k, 1.2], [10.4, 30 + 60 * k, 3.0]); plin.push([8, 60 * k, 1.2], [5.45, 30 + 60 * k, 1.2]); }
  for (const [r, u, z] of gol) assert.equal(material(p, r, u, z), false, `gol la r ${r}, ${u}°, z ${z}`);
  for (const [r, u, z] of plin) assert.equal(material(p, r, u, z), true, `plin la r ${r}, ${u}°, z ${z}`);
});

test('canalul rotund, ca 4185b, și canalul plat cu marginile teșite la 45°; obada se lărgește cât să-l cuprindă', () => {
  // rotund: semicercul de r 1, cu centrul pe marginea de r 12 (LDraw: 10,99 la mijloc, 11,15 la ±0,5, 11,5 la ±0,84)
  const r = fulie({ canal: 'rotund' }), zc = 1.75;
  for (const [dz, lego] of [[0, 10.994], [0.5, 11.151], [0.84, 11.5]] as [number, number][]) {
    const pe = 12 - Math.sqrt(1 - dz * dz);
    for (const s of [-1, 1]) {
      assert.ok(aproape(razaMax(r, zc + s * dz), pe, 0.01), `rotund la ${s * dz}: ${razaMax(r, zc + s * dz)} față de ${pe}`);
      assert.ok(Math.abs(razaMax(r, zc + s * dz) - lego) < 0.05, `rotund la ${s * dz}, față de LEGO ${lego}`);
    }
  }
  assert.deepEqual(simplu(r.avert), []);
  // plat: cureaua de 4 pe scaunul de la r 10,8, marginile de 1,2 teșite la 45°: obada de 3,5 se face de 7,2 (cu avertisment),
  // iar găurile de știft nu mai încap (banda la r 10,3): fața, plină
  const p = fulie({ canal: 'plat' }), zp = 3.6;
  assert.deepEqual(simplu(p.dim.map((v) => Math.round(v * 1000) / 1000)), [24, 24, 7.7]);
  assert.deepEqual(simplu(p.avert), ['Canalul cere o obadă de cel puțin 7,2 mm: am făcut-o de 7,2 mm.', 'Fulia e prea mică pentru găurile de știft: am făcut fața plină.']);
  for (const s of [-1, 1]) {
    for (const dz of [0, 1, 1.9]) assert.ok(aproape(razaMax(p, zp + s * dz), 10.8), `scaunul la ${s * dz}`);
    assert.ok(aproape(razaMax(p, zp + s * 2.6), 11.4), `teșitura la ${s * 2.6}`);
    assert.ok(aproape(razaMax(p, zp + s * 3.4), 12), `marginea la ${s * 3.4}`);
  }
  const lat = fulie({ canal: 'v', latCanal: 6 });
  assert.equal(simplu(lat.dim)[2], 7.3);
  assert.equal(lat.avert[0], 'Canalul cere o obadă de cel puțin 6,8 mm: am făcut-o de 6,8 mm.');
});

test('fața: găurile de știft pe cercurile grilei (6 la r 8, 12 la r 16), spițele drepte și în Y, de la ce diametru încap', () => {
  // la Ø48 × 7,5: discul de 2,4, cu găuri pe r 8 și r 16; la r 24 n-ar mai încăpea (banda e la r 22,04)
  const g = fulie({ diam: 48, lat: 7.5 });
  for (let k = 0; k < 6; k++) { assert.equal(material(g, 8, 30 + 60 * k, 1), false); assert.equal(material(g, 8, 60 * k, 1), true); }
  for (let k = 0; k < 12; k++) { assert.equal(material(g, 16, 15 + 30 * k, 1), false, `r 16, ${15 + 30 * k}°`); assert.equal(material(g, 16, 30 * k, 1), true); }
  assert.equal(material(g, 20.2, 15, 1), true, 'nimic dincolo de r 18,5');
  // spițele: drepte la 0°, 72° …; în Y, ramurile la ±0,35·π/N de spiță, lângă bandă
  const d = fulie({ diam: 48, lat: 7.5, spite: 'drepte', nrSpite: 5 }), mij = (3.893 + 22.04) / 2;
  for (let k = 0; k < 5; k++) { assert.equal(material(d, mij, 72 * k, 1), true, `spița ${k}`); assert.equal(material(d, mij, 72 * k + 36, 1), false); }
  const y = fulie({ diam: 48, lat: 7.5, spite: 'y', nrSpite: 5 });
  assert.equal(material(y, 21, 12.6, 1), true, 'ramura Y');
  assert.equal(material(y, 21, 0, 1), false, 'între ramurile Y');
  // pragurile: găurile de știft de la Ø24 (știftul trece de bandă), spițele de la Ø17,8 (butucul e același la toate găurile)
  assert.equal(L.fulieMinimaFata({}, 'stift'), 24);
  assert.equal(L.fulieMinimaFata({}, 'spite'), 17.8);
  assert.equal(L.fulieMinimaFata({ gaura: 'r' }, 'spite'), 17.8);
  assert.equal(L.fulieMinimaFata({ canal: 'plat' }, 'stift'), 24.4);
  assert.deepEqual(simplu(L.fulieFete({ diam: 23.9 })), { D: 23.9, W: 3.5, spite: true, stift: false });
  const mic = fulie({ diam: 17.7, spite: 'y' });
  assert.deepEqual(simplu(mic.avert), ['Fulia e prea mică pentru spițe: am făcut fața plină.']);
  assert.equal(material(mic, 6, 30, 1), true, 'fața plină');
});

test('butucul: cu 0,5 mm peste obadă; găurile diferă doar prin aria lor (crucea, cercul știftului sau fără)', () => {
  for (const lat of [3.5, 7.5]) {
    const e = L.efective(), H = lat + 0.5;
    const [x, r, nu] = ['x', 'r', 'nu'].map((gaura) => volum(fulie({ lat, gaura }).tri));
    const cruce = e.axGauraD! * e.axGauraLat! * 2 - e.axGauraLat! * e.axGauraLat!;
    const cerc = 48 / 2 * Math.sin((2 * Math.PI) / 48) * (e.gauraD! / 2) ** 2;
    assert.ok(aproape(nu! - x!, cruce * H, 0.01), `crucea, la lățimea ${lat}: ${nu! - x!}`);
    assert.ok(aproape(nu! - r!, cerc * H, 0.01), `cercul, la lățimea ${lat}: ${nu! - r!}`);
    assert.equal(simplu(fulie({ lat }).dim)[2], H);
  }
});

test('marginile și avertismentele: diametrul, cel mai mic diametru pentru butuc și canal, lățimea canalului', () => {
  assert.deepEqual(simplu(fulie({ diam: 10 }).avert), ['Fulia are între 12 și 200 mm: am făcut-o de Ø 12 mm.', 'Fulia e prea mică pentru găurile de știft: am făcut fața plină.']);
  assert.equal(simplu(fulie({ diam: 300 }).dim)[0], 200);
  // canalul în V de 6 cere 6 / 2,6 = 2,308 mm adâncime: la Ø12, butucul (r 2,693 + 1,2 = 3,893), canalul, peretele (0,5) și
  // 0,3 cer 2 · 7,0003 = 14,0005, deci Ø14,1 (în sus, la zecimi)
  const v6 = fulie({ diam: 12, latCanal: 6, spite: 'disc' });
  assert.equal(simplu(v6.dim)[0], 14.1);
  assert.equal(v6.avert[1], 'Fulia are nevoie de cel puțin Ø 14,1 mm (butucul, canalul și peretele dintre ele): am făcut-o de Ø 14,1 mm.');
  // lățimea canalului, de la 1 la 20; obada, de la 2 la 40
  assert.equal(simplu(fulie({ latCanal: 0.2, spite: 'disc' }).dim)[2], 4);
  assert.equal(simplu(fulie({ lat: 60, latCanal: 30, diam: 200 }).dim)[2], 40.5);
  // obada cerută de 1 se face 2, apoi cât canalul în V de 2,6 cu marginile de 0,4: 3,4 (butucul, 3,9)
  const ingusta = fulie({ lat: 1, spite: 'disc' });
  assert.equal(simplu(ingusta.dim)[2], 3.9);
  assert.deepEqual(simplu(ingusta.avert), ['Canalul cere o obadă de cel puțin 3,4 mm: am făcut-o de 3,4 mm.']);
});

test('cureaua: lungimea pe fundul canalelor, pe hârtie; fuliile care s-ar atinge', () => {
  // două fulii LEGO (fundul la r 11) la 32 mm: 2·32 + 2π·11 = 133,115
  const a = L.cureaua({}, {}, 32);
  assert.ok(aproape(a.lungime, 2 * 32 + 2 * Math.PI * 11, 1e-9) && aproape(a.lungime, 133.115, 0.001) && !a.atinge, JSON.stringify(a));
  // Ø24 și Ø40 (fundurile la r 11 și 19) la 48 mm: 2·√2240 + 30π + 16·asin(1/6) = 191,584
  const b = L.cureaua({}, { diam: 40 }, 48);
  assert.ok(aproape(b.lungime, 191.584, 0.001), String(b.lungime));
  // se ating sub R1 + R2 + 0,5; un cerc în celălalt: fără lungime
  assert.deepEqual(simplu(L.cureaua({}, {}, 24.4)), { lungime: 2 * 24.4 + 2 * Math.PI * 11, minim: 24.5, atinge: true });
  assert.equal(L.cureaua({}, {}, 24.5).atinge, false);
  assert.ok(Number.isNaN(L.cureaua({ diam: 100 }, {}, 30).lungime));
  // canalul plat: pe scaun (r 10,8)
  assert.ok(aproape(L.cureaua({ canal: 'plat' }, { canal: 'plat' }, 32).lungime, 64 + 2 * Math.PI * 10.8, 1e-9));
});
