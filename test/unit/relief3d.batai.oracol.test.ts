/**
 * Proba bătăilor (ADR 0310 §5, rândul 18.1↑h din §8; felia 18.1↑h-2): o imagine cu linii fine, finisată aliniat (fără bătăi) și
 * nealiniat (bătăile măsurate). Relieful: dungi paralele cu liniile finisării, o celulă de 0,5 mm creastă (−1), una vale
 * (−1,5), deci perioada imaginii e P = 1 mm, crestele în centrele rândurilor pare (y = 0,25 + m). Bila Ø3 (R = 1,5).
 *
 * Pe hârtie: o linie la distanța φ (|φ| ≤ P / 2) de cea mai apropiată creastă se sprijină pe creastă (panta dungii, 1, e mai
 * mare decât a bilei la r ≤ 0,5, R / √(R² − r²) · r ≤ 0,354), deci CL = −1 − (R − √(R² − φ²)): −1 pe creastă, −1,0858 pe vale.
 * Câmpul conservativ e o margine de sus (ADR 0310 §4). Grila de calcul (h = 1/16 mm) e aliniată cu a reliefului, deci creasta
 * cade pe o latură de celulă de calcul: celula de lângă ea, spre linie, are maximul −1 și stă la φ − h de linie. Cota liniei e
 * deci −1 − urcarea(max(0, φ − h)), iar surplusul, cel mult urcarea(P / 2) − urcarea(P / 2 − h) (urcarea e convexă); celulele de
 * pe pantă coboară cu h la fiecare celulă, mai mult decât urcă bila pe h (cel mult 0,354 · h), deci nu dau mai mult.
 *
 * - **Aliniat** (0° sau 90°, pasul un număr întreg de celule): fiecare linie trece printr-un centru de celulă, deci φ e 0 sau
 *   P / 2, iar suprafața tăiată se repetă exact cu perioada imaginii (sau cu cel mai mic multiplu comun cu pasul): media ei pe o
 *   fereastră cât perioada e aceeași peste tot. Fără bătăi.
 * - **Nealiniat** (pasul s ales uniform pe lățime): φ alunecă de la o linie la alta cu s − P · rotunjit(s / P), deci media
 *   suprafeței pe o perioadă urcă și coboară cu perioada bătăii, s · P / |s − P · rotunjit(s / P)|. Bătăile, măsurate.
 *
 * Măsura e independentă de CAM: suprafața lăsată de bilă vine din simulatorul oracolului (`suprafataBila`, sferele pe mișcări).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELULA_CALCUL, finisareRelief } from '../../src/cam/reliefFinisare.ts';
import { suprafataBila, type PunctO } from '../oracles/relief3d.ts';
import { grila, pasi, relief, T } from './ajutor-relief-finisare.ts';

const C = 0.5, P = 1, R = 1.5, NX = 20, NY = 100;
const urcare = (r: number): number => R - Math.sqrt(R * R - r * r);
/** Surplusul cel mai mare al câmpului conservativ peste CL-ul exact, pe hârtie (vezi capul fișierului; plus rotunjirea Float32). */
const SURPLUS = urcare(P / 2) - urcare(P / 2 - CELULA_CALCUL) + 1e-6;

type Finisata = { readonly treceri: PunctO[][]; readonly linii: Map<number, number[]>; readonly pas: number };

/** Finisarea dungilor; pentru fiecare linie (după coordonata laterală), CL-ul la jumătatea lungimii. */
function finiseaza(ax: 0 | 90, nealiniat: boolean, pasLateral: number): Finisata {
  // La 90°, grila se rotește: dungile variază pe X, liniile merg pe Y.
  const nx = ax === 0 ? NX : NY, ny = ax === 0 ? NY : NX;
  const v = grila(nx, ny, C, (x, y) => (Math.floor((ax === 0 ? y : x) / C) % 2 === 0 ? -1 : -1.5));
  const r = relief(v, nx, ny, C, T(0, 0), 0);
  const f = finisareRelief({
    reliefuri: [r], unghi: ax, nealiniat, margine: 'perete', pas: 3, adancime: 5, zSigur: 5, avans: 1000, avansPlonjare: 300,
    pasLateral, freza: { fel: 'bila', raza: R },
  });
  assert.ok(f.ok, f.ok ? '' : f.motiv);
  const p = pasi(f.miscari, 0, 0), mijloc = (NX * C) / 2;
  const linii = new Map<number, number[]>();
  // Liniile drepte ies ca mișcări lungi: CL-ul la jumătatea lățimii, pe segmentul care o trece.
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1]!, b = p[i]!;
    const [la, lb, ua, ub] = ax === 0 ? [a.y, b.y, a.x, b.x] : [a.x, b.x, a.y, b.y];
    if (b.rapida || la !== lb || ua === ub || (ua - mijloc) * (ub - mijloc) > 0) continue;
    const z = a.z + ((mijloc - ua) / (ub - ua)) * (b.z - a.z), k = Math.round(la * 1e6);
    (linii.get(k) ?? linii.set(k, []).get(k)!).push(z);
  }
  return { treceri: [p.filter((q) => !q.rapida).map((q) => ({ x: q.x, y: q.y, z: q.z }))], linii, pas: f.pasLateral };
}

/** Distanța semnată de la `l` la cea mai apropiată creastă (crestele la 0,25 + m · P). */
const faza = (l: number): number => ((((l - C / 2) % P) + 1.5 * P) % P) - P / 2;

/** Media suprafeței tăiate pe o fereastră de lățimea `L` (implicit perioada), de-a lungul axei laterale, la jumătatea lățimii. */
function medieFereastra(f: Finisata, ax: 0 | 90, L = P): { readonly l: number[]; readonly a: number[] } {
  const d = 0.025, w = Math.round(L / d), mijloc = (NX * C) / 2, ls: number[] = [], s: number[] = [];
  for (let l = 4; l <= NY * C - 4 + 1e-9; l += d) {
    ls.push(l);
    s.push(ax === 0 ? suprafataBila(f.treceri, R, mijloc, l, 0.02) : suprafataBila(f.treceri, R, l, mijloc, 0.02));
  }
  const l: number[] = [], a: number[] = [];
  for (let i = 0; i + w <= s.length; i++) {
    let m = 0;
    for (let k = 0; k < w; k++) m += s[i + k]!;
    l.push(ls[i]! + L / 2); a.push(m / w);
  }
  return { l, a };
}

/** Liniile departe de pereți (la peste R + o celulă de margine), cu CL-urile lor. */
function liniiDeMijloc(f: Finisata): [number, number[]][] {
  return [...f.linii].map(([k, zs]) => [k / 1e6, zs] as [number, number[]]).filter(([l]) => l > R + C && l < NY * C - R - C);
}

test('pe hârtie: surplusul câmpului conservativ, la celula de calcul de 1/16 mm: 0,0206 mm', () => {
  assert.ok(Math.abs(SURPLUS - 1e-6 - (Math.sqrt(1.5 ** 2 - 0.4375 ** 2) - Math.sqrt(2))) < 1e-12, `${SURPLUS}`);
  assert.ok(SURPLUS > 0.0205 && SURPLUS < 0.0207, `${SURPLUS}`);
  assert.ok(Math.abs(urcare(0.5) - (1.5 - Math.sqrt(2))) < 1e-12);
});

for (const ax of [0, 90] as const) {
  for (const s of [0.5, 0.9, 1, 1.6] as const) {
    test(`aliniat la ${ax}°, pasul cerut ${s}: liniile prin centre (φ = 0 sau P / 2), CL-ul pe hârtie, fără bătăi`, () => {
      const f = finiseaza(ax, false, s);
      const k = Math.max(1, Math.floor(s / C + 1e-9));
      assert.ok(Math.abs(f.pas - k * C) < 1e-12, `pasul ${f.pas}`);
      const mij = liniiDeMijloc(f);
      assert.ok(mij.length >= 20, `${mij.length} linii`);
      for (const [l, zs] of mij) {
        const fi = Math.abs(faza(l));
        assert.ok(fi < 1e-9 || Math.abs(fi - P / 2) < 1e-9, `linia de la ${l} nu trece printr-un centru (φ = ${fi})`);
        const h = -1 - urcare(fi);
        for (const z of zs) assert.ok(z >= h - 1e-9 && z <= h + SURPLUS, `linia ${l}: CL ${z}, pe hârtie ${h}`);
      }
      // Fără bătăi: suprafața se repetă exact cu cel mai mic multiplu comun al pasului și al perioadei (3 · P la 3 celule),
      // deci media pe o fereastră cât el e aceeași peste tot.
      const L = k % 2 === 1 && k > 1 ? k * C * 2 : P;
      const { a } = medieFereastra(f, ax, L);
      const bataie = Math.max(...a) - Math.min(...a);
      assert.ok(bataie < 1e-9, `bătaia aliniată: ${bataie}`);
    });
  }
}

for (const s of [0.9, 0.95] as const) {
  test(`nealiniat, pasul cerut ${s}: CL-ul fiecărei linii pe hârtie, iar bătăile au perioada de pe hârtie`, () => {
    const f = finiseaza(0, true, s);
    assert.ok(f.pas <= s + 1e-12 && f.pas > s - 0.1, `pasul ${f.pas}`);
    const mij = liniiDeMijloc(f);
    let urcat = Infinity, coborat = -Infinity;
    for (const [l, zs] of mij) {
      const h = -1 - urcare(Math.abs(faza(l)));
      urcat = Math.min(urcat, h); coborat = Math.max(coborat, h);
      for (const z of zs) assert.ok(z >= h - 1e-9 && z <= h + SURPLUS, `linia ${l}: CL ${z}, pe hârtie ${h}`);
    }
    // Faza alunecă: liniile trec și aproape de creastă, și aproape de vale.
    assert.ok(coborat > -1.005 && urcat < -1.07, `CL-urile pe hârtie: ${urcat} … ${coborat}`);
    // Bătăile: media pe o perioadă urcă și coboară, cu perioada s · P / |s − P · rotunjit(s / P)|.
    const { l, a } = medieFereastra(f, 0);
    const med = a.reduce((x, y) => x + y, 0) / a.length, bataie = Math.max(...a) - Math.min(...a);
    assert.ok(bataie > 0.03, `bătaia nealiniată: ${bataie}`);
    const urcari: number[] = [];
    for (let i = 1; i < a.length; i++) if (a[i - 1]! < med && a[i]! >= med) urcari.push(l[i]!);
    assert.ok(urcari.length >= 2, `${urcari.length} urcări`);
    const perioada = (urcari[urcari.length - 1]! - urcari[0]!) / (urcari.length - 1);
    const hartie = (f.pas * P) / Math.abs(f.pas - P * Math.round(f.pas / P));
    assert.ok(Math.abs(perioada - hartie) / hartie < 0.03, `perioada bătăii ${perioada}, pe hârtie ${hartie}`);
  });
}
