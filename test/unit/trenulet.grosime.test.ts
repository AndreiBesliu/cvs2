/**
 * Grosimea paletelor la elicele mari (ADR 0340, felia 3.Cm-5; răspunsul 2a al owner-ului: crește cu diametrul doar peste
 * Ø80), pe plasele reale:
 * - până la Ø80, elicea și ventilatorul (rotorul și carcasa) sunt cele de dinainte, la octet (amprenta, luată din motorul lui
 *   18.47.0, înaintea feliei); elicea de barcă nu se schimbă deloc (își avea deja grosimea după diametru);
 * - peste Ø80, paleta se îngroașă cu diametrul, în aceeași formă: k = Ø / 80, de la 1,2 · k la rădăcină la 0,8 · k la vârf
 *   (pe hârtie: Ø200, 3 și 2 mm; ventilatorul Ø120, 1,8 și 1,2), măsurat pe secțiunile plasei;
 * - cotele o spun (`tRad`, `tVarf`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; baza: number[] };
type Lego = {
  construieste(d: Record<string, unknown>): Piesa;
  eliceCote(d: Record<string, unknown>): { D: number; P: number; tRad: number; tVarf: number };
  ventilatorCote(d: Record<string, unknown>): { D: number; P: number; Rt: number; rh: number; tRad: number; tVarf: number };
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const piesa = (tip: string, d: Record<string, unknown>) => L.construieste({ tip, ...d });
const amprenta = (tip: string, defs: readonly Record<string, unknown>[]) => {
  const h = createHash('sha256');
  for (const d of defs) h.update(JSON.stringify(piesa(tip, d).tri));
  return h.digest('hex');
};

/** Elicele de până la Ø80: fiecare diametru cu toate formele, paletele, profilele, pașii, lățimile, sensurile, găurile, conul. */
const ELICE: Record<string, unknown>[] = [];
for (let i = 0; i < 48; i++) {
  ELICE.push({ palete: 2 + (i % 7), diametru: [20, 27.4, 43.1, 72, 80][i % 5], pas: [0.3, 0.7, 1.5][(i >> 1) % 3], latime: [15, 30, 60][(i >> 2) % 3],
    forma: ['rot', 'ingust', 'drept'][(i >> 1) % 3], paleta: (i >> 3) % 2 ? 'plata' : 'rasucita', profil: (i >> 2) % 2 ? 'aripa' : 'placa',
    sens: i % 2 ? 'stanga' : 'dreapta', gaura: ['x', 'r', 'b', 'nu'][(i >> 2) % 4], con: (i >> 4) % 2 ? 'da' : 'nu' });
}
/** Ventilatoarele de până la Ø80: rotorul și carcasa, cu paletele, jocul, pașii, lățimile, sensurile, găurile, inelul, urechile. */
const VENTILATOR: Record<string, unknown>[] = [];
for (let i = 0; i < 32; i++) {
  VENTILATOR.push({ piesa: i % 4 === 3 ? 'carcasa' : 'rotor', palete: 3 + (i % 10), diametru: [24, 40, 56.3, 80][i % 4], joc: [0.3, 0.8, 2][(i >> 1) % 3],
    pas: [0.3, 0.8, 1.5][(i >> 2) % 3], latime: [15, 45, 60][(i >> 1) % 3], sens: (i >> 1) % 2 ? 'stanga' : 'dreapta',
    gaura: ['x', 'r', 'b', 'nu'][(i >> 2) % 4], inel: (i >> 3) % 2 ? 'da' : 'nu', urechi: (i >> 4) % 2 ? 4 : 2 });
}
/** Elicele de barcă, pe toată plaja: nu se schimbă deloc. */
const BARCA: Record<string, unknown>[] = [];
for (let i = 0; i < 12; i++) {
  BARCA.push({ palete: 3 + (i % 3), diametru: [20, 56.3, 90, 120][i % 4], pas: [0.5, 1, 1.6][(i >> 1) % 3], latime: [40, 100, 150][(i >> 2) % 3],
    inclinare: [0, 20, 40][i % 3], pupa: [0, 10][(i >> 2) % 2], sens: i % 2 ? 'stanga' : 'dreapta', capac: (i >> 1) % 2 ? 'da' : 'nu' });
}

test('până la Ø80, elicea și ventilatorul sunt cele de dinainte, la octet; elicea de barcă, pe toată plaja', () => {
  assert.equal(amprenta('elice', ELICE), 'a9ab101fcb52612b79d84756d8bb491bda7f5059e55f32f3e46846e64343d196');
  assert.equal(amprenta('ventilator', VENTILATOR), 'd3bd40186eb78a26fff0e6f3d8baddcacbda5f97e5fac8a61fd589e8a4b91321');
  assert.equal(amprenta('eliceBarca', BARCA), '1739bdd632f4c202bd5dc607610163e8f0f645c987732ce876292a499ec6fe06');
});

test('cotele: până la Ø80, 1,2 și 0,8; peste, cu k = Ø / 80 (pe hârtie: Ø200, 3 și 2; ventilatorul Ø120, 1,8 și 1,2)', () => {
  const e = (D: number) => L.eliceCote({ diametru: D }), v = (D: number) => L.ventilatorCote({ diametru: D });
  for (const D of [20, 72, 80]) assert.deepEqual([e(D).tRad, e(D).tVarf], [1.2, 0.8], `elicea Ø${D}`);
  for (const D of [24, 40, 80]) assert.deepEqual([v(D).tRad, v(D).tVarf], [1.2, 0.8], `ventilatorul Ø${D}`);
  const aproape = (a: number, b: number) => Math.abs(a - b) < 1e-12;
  assert.ok(aproape(e(200).tRad, 3) && aproape(e(200).tVarf, 2), `elicea Ø200: ${e(200).tRad}, ${e(200).tVarf}`);
  assert.ok(aproape(e(120).tRad, 1.8) && aproape(e(120).tVarf, 1.2), 'elicea Ø120');
  assert.ok(aproape(e(100).tRad, 1.5) && aproape(e(100).tVarf, 1), 'elicea Ø100');
  assert.ok(aproape(v(120).tRad, 1.8) && aproape(v(120).tVarf, 1.2), 'ventilatorul Ø120');
  assert.ok(e(80.1).tRad > 1.2 && e(80.1).tRad < 1.202, 'chiar peste prag, puțin mai groasă');
});

/** Vârfurile plasei în polare față de butuc: [r, θ, z]. */
function polare(p: Piesa): [number, number, number][] {
  const c = [-p.baza[0]!, -p.baza[1]!], unice = new Map<string, P3>();
  for (const q of p.tri.flat()) unice.set(q.join(','), q);
  return [...unice.values()].map(([x, y, z]) => [Math.hypot(x - c[0]!, y - c[1]!), Math.atan2(y - c[1]!, x - c[0]!), z]);
}
/**
 * Grosimea paletei 0 la raza unei stații, măsurată pe plasă: secțiunea adusă înapoi din unghiul ei (β = atan(P / 2πr), paleta
 * răsucită), apoi, pe fiecare punct al corzii, distanța dintre fața de sus și cea de jos (la placa curbată, aceeași peste tot).
 */
function grosime(v: readonly [number, number, number][], rr: number, P: number, palete: number): number {
  const b = Math.atan(P / (2 * Math.PI * rr)), pe = new Map<string, number[]>();
  for (const [r, th, z] of v) {
    if (Math.abs(r - rr) > 1e-6 || Math.abs(th) > Math.PI / palete) continue;
    const s = rr * th, u = s * Math.cos(b) + z * Math.sin(b), w = -s * Math.sin(b) + z * Math.cos(b);
    const k = u.toFixed(4);
    (pe.get(k) ?? pe.set(k, []).get(k)!).push(w);
  }
  const g = [...pe.values()].filter((w) => w.length === 2).map((w) => Math.abs(w[0]! - w[1]!));
  assert.ok(g.length > 10, `secțiunea de la r ${rr}: ${g.length} perechi`);
  return Math.max(...g);
}
/** Razele stațiilor paletei, din plasă, de la rădăcină la vârf (fără cercurile butucului). */
function statii(v: readonly [number, number, number][], rh: number): number[] {
  const pe = new Map<string, number>();
  for (const [r] of v) if (r > rh + 1e-3 && !pe.has(r.toFixed(5))) pe.set(r.toFixed(5), r);
  return [...pe.values()].sort((a, b) => a - b);
}

test('pe plasă: peste Ø80, secțiunile au grosimea 1,2 · k − 0,4 · k · x; până la Ø80, 1,2 − 0,4 · x', () => {
  const cazuri: [string, Record<string, unknown>, number, number][] = [
    ['elicea Ø200', { tip: 'elice', diametru: 200, palete: 2, pas: 1.5, latime: 60 }, 200 / 80, 4],
    ['elicea Ø120', { tip: 'elice', diametru: 120, palete: 3 }, 120 / 80, 4],
    ['elicea Ø72', { tip: 'elice', diametru: 72, palete: 3 }, 1, 4],
    ['rotorul Ø120', { tip: 'ventilator', piesa: 'rotor', diametru: 120, palete: 5 }, 120 / 80, NaN],
    ['rotorul Ø40', { tip: 'ventilator', piesa: 'rotor', diametru: 40, palete: 5 }, 1, NaN],
  ];
  for (const [nume, d, k, rhElice] of cazuri) {
    const p = L.construieste({ ...d, gaura: 'nu' }), v = polare(p);
    const ventilator = d.tip === 'ventilator', q = ventilator ? L.ventilatorCote(d) : L.eliceCote(d);
    const rh = ventilator ? L.ventilatorCote(d).rh : rhElice, R = ventilator ? L.ventilatorCote(d).Rt : L.eliceCote(d).D / 2;
    const st = statii(v, rh);
    // două stații: aproape de rădăcină și aproape de vârf (secțiunea de la vârf, închisă ca fâșie, se sare)
    for (const rr of [st[1]!, st[st.length - 3]!]) {
      const x = (rr - rh) / (R - rh), t = k * 1.2 - k * 0.4 * x, g = grosime(v, rr, q.P, Number(d.palete));
      assert.ok(Math.abs(g - t) < 1e-6, `${nume}, r ${rr.toFixed(2)} (x ${x.toFixed(2)}): ${g.toFixed(6)}, pe hârtie ${t.toFixed(6)}`);
    }
  }
});
