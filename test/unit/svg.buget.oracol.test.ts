/**
 * Ușa SVG, felia 2.7d (recenzia): plafoanele și bugetele noi, aplicația față de oracol, departe de margini (modelul
 * unităților de lucru e al implementării; oracolul nu-i prezice granițele exacte):
 * - bugetul potrivirilor CSS (ADR 0035 §4): 10 000 de reguli `*` verificate pe 3 000 de elemente (~3·10⁷ > 2·10⁷) →
 *   `plafon` / `css`; pe 1 000 de elemente (~10⁷) trece;
 * - plafonul total de vârfuri (ADR 0035 §7, ADR 0036 §9) se judecă întâi pe intrare: o formă nonzero cu 5 × 45 000 de
 *   vârfuri suprapuse e refuzată (`plafon`) fără normalizare, cu `nonzero-normalizate` = `nonzero-refuzate` = 0;
 * - o ieșire cu un contur peste plafonul căii (50 000): reuniunea a două subcăi de 32 000 de vârfuri (~53 700) se refuză,
 *   iar forma se citește ca în 2.7c, numărată (`nonzero-refuzate`);
 * - bugetul normalizării e al întregului fișier (ADR 0036 §10: 24·10⁶, „cât două forme la plafonul lor”), în ordinea
 *   documentului: din copiile identice ale celei mai grele forme acceptate singure, primele se normalizează, ultimele se
 *   refuză (un sufix). Forma cea mai grea (k triunghiuri rotite, cu reuniunea mică) se caută cu aplicația (o căutare
 *   binară pe k), fără unitățile ei: dacă plafonul unei forme e jumătate din bugetul fișierului, din 4 copii a treia nu
 *   mai încape.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteSvg } from '../../src/io/svg.ts';
import { citesteSvgO, judecaRezultat, parserTest } from '../oracles/svg.ts';
import { judecaHartia, judecaHartiaFinala, mm, type Hartie } from '../oracles/svg.cazuri.ts';

const enc = (t: string): Uint8Array => new TextEncoder().encode(t);
type App = { ok: boolean; cod?: string; detaliu?: string; cai?: Array<{ forma: number; varfuri: unknown[] }>; avertismente?: Record<string, number> };
const app = (b: Uint8Array): App => citesteSvg(b, { parser: parserTest() }) as unknown as App;

function judeca(b: Uint8Array, h: Hartie, densitate: number): App {
  const a = app(b);
  const o = citesteSvgO(b, { densitateNonzero: densitate });
  assert.deepEqual(judecaHartia(o, h), [], 'oracolul față de hârtie');
  assert.deepEqual(judecaRezultat(a, o, { N: 4, densitateNonzero: densitate }), [], 'aplicația față de oracol');
  assert.deepEqual(judecaHartiaFinala(a, o, h), [], 'aplicația față de hârtie, după normalizare');
  return a;
}

/** Un poligon regulat cu n vârfuri, ca subcale (în sensul SVG crescător). */
const poligonD = (cx: number, cy: number, r: number, n: number): string =>
  `M ${Array.from({ length: n }, (_, i) => `${(cx + r * Math.cos((2 * Math.PI * i) / n)).toFixed(6)} ${(cy + r * Math.sin((2 * Math.PI * i) / n)).toFixed(6)}`).join(' L ')} Z`;

test('bugetul potrivirilor CSS (§4): 10 000 de reguli `*` × 3 000 de elemente → plafon / css; × 1 000 → trece', () => {
  const reguli = '*{fill:red}'.repeat(10_000);
  const drept = (n: number): string => Array.from({ length: n }, (_, i) => `<rect x="${(i % 100) * 2}" y="${Math.floor(i / 100) * 2}" width="1" height="1"/>`).join('');
  judeca(enc(mm(210, 210, `<style>${reguli}</style>${drept(3000)}`)), { cod: 'plafon', detaliu: 'css' }, 1);
  judeca(enc(mm(210, 210, `<style>${reguli}</style>${drept(1000)}`)), { cai: 1000 }, 1);
});

test('plafonul vârfurilor se judecă întâi pe intrare (ADR 0036 §9): 5 × 45 000 de vârfuri suprapuse într-o formă nonzero → plafon, fără normalizare', () => {
  const d = [0, 1, 2, 3, 4].map((k) => poligonD(40 + 5 * k, 50, 30, 45_000)).join(' ');
  const b = enc(mm(100, 100, `<path d="${d}"/>`));
  const t0 = performance.now();
  const a = judeca(b, { cod: 'plafon' }, 0.01);
  const t = performance.now() - t0;
  assert.equal(a.avertismente?.['nonzero-normalizate'], 0);
  assert.equal(a.avertismente?.['nonzero-refuzate'], 0);
  // Un fișier refuzat oricum nu mai plătește normalizarea (recenzia 2.7d): secunde, nu zeci de secunde.
  assert.ok(t < 30_000, `${t.toFixed(0)} ms`);
});

test('o ieșire cu un contur peste 50 000 de vârfuri (ADR 0036 §9): reuniunea a două subcăi de 32 000 → refuzată, citită ca în 2.7c, numărată', () => {
  // Două 32 000-goane de rază 40 la 70 mm: fiecare pierde în lentilă 2·acos(35/40) = 1,01 rad din 2π, deci reuniunea
  // păstrează ~84 % din vârfuri: ~53 700 > 50 000.
  const b = enc(mm(200, 100, `<path d="${poligonD(55, 50, 40, 32_000)} ${poligonD(125, 50, 40, 32_000)}"/>`));
  judeca(b, { cai: 2, avertismente: { 'nonzero-normalizate': 1 }, nonzeroRefuzate: 1, final: { cai: 2 } }, 0.05);
});

/**
 * k triunghiuri egale (latura ~69 mm), rotite și mutate pe o spirală de aur, în aceeași cale: ~k² încrucișări, dar
 * reuniunea e un singur contur mic (ieșirea nu atinge plafoanele de vârfuri).
 */
function triunghiuri(k: number, cx: number, cy: number): string {
  const d: string[] = [];
  for (let i = 0; i < k; i++) {
    const a = i * 2.399963229728653, r = 5 * Math.sqrt(i / k), rot = i * 0.7548776662466927;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    const v = [0, 1, 2].map((j) => { const u = rot + (j * 2 * Math.PI) / 3; return `${(x + 40 * Math.cos(u)).toFixed(4)} ${(y + 40 * Math.sin(u)).toFixed(4)}`; });
    d.push(`M ${v[0] as string} L ${v[1] as string} L ${v[2] as string} Z`);
  }
  return d.join(' ');
}
/** Formele normalizate, pe forme (o formă rămasă ca în 2.7c are cele k căi ale citirii). */
const normalizate = (a: App, forme: number, k: number): boolean[] =>
  Array.from({ length: forme }, (_, f) => (a.cai ?? []).filter((c) => c.forma === f).length !== k);

test('bugetul normalizării e al întregului fișier (ADR 0036 §10): copiile celei mai grele forme acceptate singure: primele normalizate, ultimele refuzate', () => {
  const unul = (k: number): boolean => normalizate(app(enc(mm(300, 300, `<path d="${triunghiuri(k, 150, 150)}"/>`))), 1, k)[0] === true;
  // Cea mai mare formă acceptată singură (normalizată), prin căutare binară pe k: o formă la plafonul ei.
  let lo = 4, hi = 400;
  assert.equal(unul(lo), true, 'forma mică trebuie normalizată');
  assert.equal(unul(hi), false, 'forma de 400 de triunghiuri a trecut singură: nu e destul de grea');
  while (hi - lo > 2) {
    const m = Math.floor((lo + hi) / 2);
    if (unul(m)) lo = m;
    else hi = m;
  }
  const K = 4;
  const corp = Array.from({ length: K }, (_, j) => `<path d="${triunghiuri(lo, 150 + (j % 2) * 300, 150 + Math.floor(j / 2) * 300)}"/>`).join('');
  const a = app(enc(mm(600, 600, corp)));
  assert.ok(a.ok, JSON.stringify(a).slice(0, 200));
  const n = normalizate(a, K, lo);
  // Sufixul: după prima formă refuzată, toate sunt refuzate; prima e normalizată; cel puțin una e refuzată.
  const prima = n.indexOf(false);
  assert.equal(n[0], true, `prima formă (${lo} triunghiuri) trebuia normalizată: ${JSON.stringify(n)}`);
  assert.ok(prima > 0, `cu ${K} forme la plafonul lor, bugetul fișierului (24·10⁶ = două forme) trebuia să refuze una: ${JSON.stringify(n)}`);
  assert.ok(n.slice(prima).every((x) => !x), `refuzurile nu sunt un sufix: ${JSON.stringify(n)}`);
  assert.equal(a.avertismente?.['nonzero-normalizate'], prima);
  assert.equal(a.avertismente?.['nonzero-refuzate'], K - prima);
});
