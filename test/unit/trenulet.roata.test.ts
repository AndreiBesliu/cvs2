/**
 * Roata cu anvelopă din atelierul Easy 3Draw (ADR 0280, felia 3.Tj), pe hârtie, față de cotele LEGO din biblioteca LDraw
 * (CC BY 4.0): janta 55982 are scaunul anvelopei la r 8,4 pe 13,6 mm, cu un canal la mijloc pentru nervura anvelopei;
 * anvelopa 58090 are 30,4 × 13,6, alezajul la r 8,24–8,40 și nervura de 2,8 mm la bază care coboară până la r 7,46.
 * - corpul e închis la toate felurile (dintr-o bucată, doar janta, doar anvelopa), fețele, benzile și găurile;
 * - janta tipărită are scaunul la r 8,4 (varianta 3) și canalul până la r 7,35; anvelopa tipărită are alezajul la r 8,25 și
 *   nervura până la r 7,45, deci se pune pe janta tipărită ca pe cea LEGO: 0,15 mm strâns pe rază, nervura liberă în canal;
 * - varianta jantei mută scaunul cu 0,05 mm pe rază (0,1 pe diametru), cu cinci jante de probă în setul de calibrare;
 * - spițele încap de la janta de Ø20,4 (cu gaura de ax): 3,5 mm între butuc (r 4,8) și bandă (r D/2 − 1,9).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Lego = {
  seteaza(s?: Record<string, unknown> | null): void;
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): { tri: Tri[]; dim: number[]; avert: string[] };
  calibrare(): { nume: string; titlu: string; tri: Tri[] }[];
  spiteIncap(janta: number, gaura?: string): boolean;
  jantaMinimaSpite(gaura?: string): number;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const cu = <T>(s: Record<string, unknown>, f: () => T): T => { L.seteaza(s); try { return f(); } finally { L.seteaza({}); } };
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const roata = (d: Record<string, unknown>) => L.construieste({ tip: 'roata', ...d });

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
/** Punctele (r, z) ale vârfurilor, față de axa roții (mijlocul cutiei), rotunjite la 0,001 mm. */
function profil(p: { tri: Tri[]; dim: number[] }): [number, number][] {
  const cx = p.dim[0]! / 2, cy = p.dim[1]! / 2, s = new Map<string, [number, number]>();
  for (const t of p.tri) for (const q of t) {
    const r = Math.round(Math.hypot(q[0] - cx, q[1] - cy) * 1000) / 1000, z = Math.round(q[2] * 1000) / 1000;
    s.set(`${r},${z}`, [r, z]);
  }
  return [...s.values()];
}
const aproape = (a: number, b: number, tol = 0.002) => Math.abs(a - b) <= tol;

test('corpul e închis la toate felurile, fețele, benzile și găurile, cu cutia cerută', () => {
  for (const fel of ['plina', 'janta', 'anvelopa']) for (const spite of ['disc', 'drepte', 'y', 'gauri']) for (const banda of ['nervuri', 'neteda', 'blocuri']) {
    for (const gaura of ['x', 'r', 'nu']) {
      const p = roata({ fel, diam: 56, janta: 36, lat: 26, spite, nrSpite: 5, banda, gaura });
      assert.equal(muchiiRele(p.tri), 0, `${fel}, ${spite}, ${banda}, ${gaura}: muchii fără pereche`);
      const d = fel === 'janta' ? 36 : 56;
      assert.ok(aproape(p.dim[0]!, d, 0.02) && aproape(p.dim[1]!, d, 0.02) && aproape(p.dim[2]!, 26), `${fel}: cutia ${simplu(p.dim).join(' × ')}`);
    }
  }
  const lego = roata({});
  assert.deepEqual(simplu(lego.dim.map((v) => Math.round(v * 100) / 100)), [30.4, 30.4, 13.6], 'implicit: ca LEGO 30,4 × 14');
  assert.equal(muchiiRele(lego.tri), 0);
});

test('cotele LEGO: janta cu scaunul la r 8,4 și canalul nervurii; anvelopa cu alezajul la r 8,25 și nervura până la r 7,45', () => {
  const W = 13.6, zc = W / 2;
  const j = profil(roata({ fel: 'janta' })), a = profil(roata({ fel: 'anvelopa' }));
  // janta: cel mai mare r e scaunul (8,4); canalul, la r 7,35, de la zc − 1,6 până la zc + 1,6 − 1,05 (sus teșit la 45°)
  assert.ok(aproape(Math.max(...j.map(([r]) => r)), 8.4), 'scaunul la r 8,4');
  const canal = j.filter(([r]) => aproape(r, 7.35)).map(([, z]) => z);
  assert.ok(canal.some((z) => aproape(z, zc - 1.6)) && canal.some((z) => aproape(z, zc + 1.6 - 1.05)), `canalul: ${canal.join(', ')}`);
  // anvelopa: Ø30,4 afară; alezajul la r 8,25 (0,15 strâns pe scaunul de 8,4, ca LEGO: 8,24 pe 8,4); nervura până la 7,45
  assert.ok(aproape(Math.max(...a.map(([r]) => r)), 15.2), 'Ø30,4');
  assert.ok(a.some(([r, z]) => aproape(r, 8.25) && aproape(z, 0)), 'alezajul');
  const varf = a.filter(([r]) => aproape(r, 7.45)).map(([, z]) => z);
  assert.ok(varf.some((z) => aproape(z, zc - 0.6)) && varf.some((z) => aproape(z, zc + 0.6)), `vârful nervurii: ${varf.join(', ')}`);
  // nervura (trapez: ±1,4 la r 8,25, ±0,6 la r 7,45) stă liberă în canal (fundul la 7,35; pereții: jos vertical la zc − 1,6,
  // sus teșit de la (7,35; zc + 0,55) la (8,4; zc + 1,6)): cel puțin 0,05 mm peste tot
  const jocMin = Math.min(...[0, 0.25, 0.5, 0.75, 1].map((t) => {
    const r = 7.45 + 0.8 * t, h = 0.6 + 0.8 * t;
    const sus = zc + 0.55 + (r - 7.35) - (zc + h);
    return Math.min(r - 7.35, (zc - h) - (zc - 1.6), sus);
  }));
  assert.ok(jocMin >= 0.05, `nervura în canal: jocul minim ${jocMin.toFixed(3)} mm`);
});

test('varianta jantei mută scaunul cu 0,05 mm pe rază pe variantă; anvelopa și roata dintr-o bucată nu se mută', () => {
  for (let v = 1; v <= 5; v++) {
    const rj = Math.max(...profil(cu({ varianta_janta: v }, () => roata({ fel: 'janta' }))).map(([r]) => r));
    assert.ok(aproape(rj, 8.4 + (v - 3) * 0.05), `varianta ${v}: scaunul la ${rj}`);
    const ra = Math.min(...profil(cu({ varianta_janta: v }, () => roata({ fel: 'anvelopa' }))).map(([r]) => r));
    assert.ok(aproape(ra, 7.45), `varianta ${v}: anvelopa neschimbată (${ra})`);
  }
  assert.equal(cu({ varianta_janta: 5 }, () => L.efective()['jantaD']), 0.2);
});

test('fața: discul, spițele drepte, în Y și găurile; spițele încap de la janta de Ø20,4 cu gaura de ax', () => {
  assert.equal(L.jantaMinimaSpite('x'), 20.4);
  assert.equal(L.spiteIncap(20.3, 'x'), false);
  assert.equal(L.spiteIncap(20.4, 'x'), true);
  // pe janta mică, spițele cerute dau fața plină, cu avertisment, aceeași cu discul
  const mic = roata({ spite: 'y' }), disc = roata({ spite: 'disc' });
  assert.ok(mic.avert.some((a) => a.includes('prea mică pentru spițe')), mic.avert.join(' | '));
  assert.equal(mic.tri.length, disc.tri.length, 'fața plină');
  // fiecare spiță dreaptă e o prismă (12 triunghiuri); una în Y, trei
  const tri = (spite: string, nrSpite: number) => roata({ fel: 'janta', janta: 36, lat: 26, spite, nrSpite }).tri.length;
  assert.equal(tri('drepte', 9) - tri('drepte', 3), 6 * 12, 'spițele drepte');
  assert.equal(tri('y', 7) - tri('y', 4), 3 * 3 * 12, 'spițele în Y');
  // câte spițe: între 3 și 12
  assert.equal(tri('drepte', 20), tri('drepte', 12));
  assert.equal(tri('drepte', 1), tri('drepte', 3));
  // fața, cât 0,3 din lățime (la 13,6 mm: 4,08), de la butuc (r 4,8 − 0,3) la bandă
  assert.ok(profil(roata({})).some(([r, z]) => aproape(r, 4.5) && aproape(z, 4.08)), 'fața de 4,08 mm');
  // la janta de 36: peretele de sub canal e 0,04·D (1,44), deci banda pornește de la r 18 − 1,05 − 1,44 = 15,51; spița
  // dreaptă are 0,07·D = 2,52 mm (capătul ei, la r 15,81, la ±1,26 de axa ei)
  const j = roata({ fel: 'janta', janta: 36, lat: 26, spite: 'drepte', nrSpite: 3 }), c = j.dim[0]! / 2;
  assert.ok(profil(j).some(([r, z]) => aproape(r, 15.51) && aproape(z, 26)), 'banda de la r 15,51');
  const capete = j.tri.flatMap((t) => t).filter((q) => Math.abs(q[2]) < 1e-9 && aproape(q[0] - c, 15.81, 0.01)).map((q) => Math.round((q[1] - c) * 100) / 100);
  assert.deepEqual([...new Set(capete)].sort((a, b) => a - b), [-1.26, 1.26], 'spița de 2,52 mm');
});

test('găurile butucului: crucea axului, cercul știftului sau fără (diferența de volum = aria găurii × lățimea)', () => {
  const e = L.efective(), W = 13.6, v = (gaura: string) => {
    let s = 0;
    for (const [a, b, c] of roata({ gaura }).tri) s += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    return s / 6;
  };
  const crucea = 2 * e['axGauraD']! * e['axGauraLat']! - e['axGauraLat']! ** 2;
  const cercul = (48 / 2) * (e['gauraD']! / 2) ** 2 * Math.sin((2 * Math.PI) / 48);
  const [x, r, nu] = [v('x'), v('r'), v('nu')];
  assert.ok(Math.abs(nu - x - crucea * W) < 0.05, `crucea: ${(nu - x).toFixed(3)} față de ${(crucea * W).toFixed(3)} mm³`);
  assert.ok(Math.abs(nu - r - cercul * W) < 0.05, `cercul: ${(nu - r).toFixed(3)} față de ${(cercul * W).toFixed(3)} mm³`);
});

test('banda de rulare: trei canale de 0,4 mm, netedă sau cu blocuri alternate pe umeri', () => {
  const W = 13.6, zc = W / 2, R = 15.2;
  const n = profil(roata({ banda: 'nervuri' })), t = profil(roata({ banda: 'neteda' }));
  const canale = [...new Set(n.filter(([r]) => aproape(r, R - 0.4)).map(([, z]) => Math.round((z - zc) * 10) / 10))].sort((a, b) => a - b);
  assert.deepEqual(canale, [-2.8, -2.4, -0.2, 0.2, 2.4, 2.8], 'canalele, de 0,4 mm, la −2,6, 0 și +2,6 de mijloc');
  assert.ok(!t.some(([r]) => aproape(r, R - 0.4)), 'netedă: fără canale');
  // umerii: de la r 15,2 la 14,05 pe 1,8 mm, ca LEGO (15,15 → 14,0)
  assert.ok(t.some(([r, z]) => aproape(r, R - 1.15) && aproape(z, 0)) && t.some(([r, z]) => aproape(r, R) && aproape(z, 1.8)), 'umerii');
  // blocurile: câte unul la ~3,2 mm pe circumferință (30), alternate jos și sus, pe baza coborâtă cu 0,6
  const b = roata({ banda: 'blocuri' });
  assert.equal(muchiiRele(b.tri), 0);
  const p = profil(b);
  assert.ok(p.some(([r, z]) => aproape(r, R - 0.6) && aproape(z, W * 0.3)), 'baza coborâtă pe umăr');
  // blocurile: fața lor dinăuntru, la r 15,2 − 0,8, numai pe ele; pe fiecare umăr, câte unul la doi pași (15 jos, 15 sus)
  const c = b.dim[0]! / 2, unghiuri = (jos: boolean) => b.tri.flatMap((t) => t)
    .filter((q) => aproape(Math.hypot(q[0] - c, q[1] - c), R - 0.8) && (q[2] < W / 2) === jos)
    .map((q) => Math.atan2(q[1] - c, q[0] - c)).sort((a, b2) => a - b2);
  const grupuri = (u: number[]) => u.filter((a, i) => i === 0 || a - u[i - 1]! > 0.15).length - (u.length && u[0]! + 2 * Math.PI - u[u.length - 1]! <= 0.15 ? 1 : 0);
  assert.deepEqual([grupuri(unghiuri(true)), grupuri(unghiuri(false))], [15, 15], 'blocurile: 15 jos și 15 sus');
});

test('marginile și avertismentele: janta, anvelopa peste jantă, lățimea', () => {
  const j = roata({ fel: 'janta', janta: 10 });
  assert.ok(aproape(j.dim[0]!, 12.6, 0.01), `janta cel puțin 12,6: ${j.dim[0]}`);
  assert.ok(j.avert.some((a) => a.includes('12,6')), j.avert.join(' | '));
  const a = roata({ diam: 18, janta: 16.8 });
  assert.ok(aproape(a.dim[0]!, 20.8, 0.01), `anvelopa cu 2 mm peste jantă: ${a.dim[0]}`);
  assert.ok(a.avert.some((x) => x.includes('2 mm')), a.avert.join(' | '));
  // între Ø D + 2 și D + 4 tot se ridică la D + 4 (2 mm de cauciuc pe rază, nu 1)
  assert.ok(aproape(roata({ diam: 20, janta: 16.8 }).dim[0]!, 20.8, 0.01), 'Ø20 pe janta de 16,8: 20,8');
  assert.ok(aproape(roata({ lat: 2 }).dim[2]!, 4) && aproape(roata({ lat: 60 }).dim[2]!, 40), 'lățimea între 4 și 40');
  assert.deepEqual(simplu(roata({}).avert), [], 'implicit: fără avertisment');
});

test('setul de calibrare: cinci jante LEGO, cu scaunul Ø16,6 … 17,0, închise, cu semnul pe fața de sus', () => {
  const jante = L.calibrare().filter((p) => p.nume.startsWith('calibrare_janta_'));
  assert.deepEqual(simplu(jante.map((p) => p.nume)), [1, 2, 3, 4, 5].map((v) => `calibrare_janta_${v}`));
  for (const [i, p] of jante.entries()) {
    const d = String(Math.round((16.6 + 0.1 * i) * 100) / 100).replace('.', ',');
    assert.ok(p.titlu.includes(`Ø ${d} mm`), p.titlu);
    assert.equal(muchiiRele(p.tri), 0, `${p.nume}: închisă`);
    // semnul: i + 1 cubulețe de 1 mm peste banda de sus (13,6 mm), câte 12 triunghiuri
    const varf = Math.max(...p.tri.flatMap((t) => t.map((q) => q[2])));
    assert.ok(Math.abs(varf - 14.59) < 1e-9, `${p.nume}: semnul deasupra (${varf})`);
    assert.equal(p.tri.length - jante[0]!.tri.length, 12 * i, `${p.nume}: ${i + 1} cubulețe`);
  }
});
