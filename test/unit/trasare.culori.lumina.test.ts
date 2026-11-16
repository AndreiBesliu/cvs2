import { test } from 'node:test';
import assert from 'node:assert/strict';
import { culoriLuminate, traseazaCulori, type OptiuniCulori, type RezultatCulori } from '../../src/trasare/culori.ts';
import type { Lumina } from '../../src/trasare/lumina.ts';
import type { ImagineRGBA } from '../../src/trasare/trasare.ts';
import { CERNELURI_COLOR, HARTIE_COLOR, culoriMasurate, pozaColor, type CuloriMasurate, type PozaColor } from './ajutor-poze.ts';

/**
 * Lumina pe culori (ADR 0226, felia 25.4↑b): pe poze color sintetice cu clasele știute (`ajutor-poze.ts`: o foaie albă cu
 * un disc roșu, un dreptunghi albastru, un triunghi verde, linii negre și un inel galben, sau un desen cu linii colorate de
 * 6 px), trasate cu numărul automat de culori: câte culori ies (adevărul: 6, cu hârtia), ce clase se rup sau se unesc, ce
 * culori are paleta. „Neuniformă”: fiecare canal raportat la fundalul lui neted, cu albul hârtiei la 255; „Cu umbre”: la
 * fundalul local. Plafoanele, din prototip (`.tmp/proto-254b.ts`, în ADR).
 */

const W = 600, H = 400;
const OPT: OptiuniCulori = { numar: null, legaturi: [], bifate: null, netezime: 'echilibrat', petePx: 25, gauriPx: 0 };
function trasata(p: ImagineRGBA, lumina?: Lumina): Extract<RezultatCulori, { ok: true }> {
  const r = traseazaCulori(p, { ...OPT, ...(lumina ? { lumina } : {}) });
  assert.ok(r.ok);
  return r;
}
const cu = (p: PozaColor, lumina?: Lumina): CuloriMasurate => culoriMasurate(p, trasata(p, lumina));
const text = (m: CuloriMasurate): string => `${m.K} culori; rupte: ${m.despartite.join(', ') || '—'}; unite: ${m.unite.join(', ') || '—'}; greșite ${(100 * m.gresite).toFixed(2)} %`;
/** Culorile desenului, cum ies sub o lumină albă: fiecare canal al cernelii raportat la al hârtiei, cu hârtia la 255. */
const adevarate = [[255, 255, 255], ...CERNELURI_COLOR.map((k) => k.map((v, i) => Math.min(255, (255 * v) / (HARTIE_COLOR[i] ?? 255))))];
const POZE = {
  egala: pozaColor({ W, H }),
  laterala: pozaColor({ W, H, laterala: 0.5, dominanta: true }),
  umbra: pozaColor({ W, H, laterala: 0.3, umbra: true }),
  tabla: pozaColor({ W, H, laterala: 0.4, tabla: true }),
  liniiEgala: pozaColor({ W, H, linii: true }),
  liniiUmbra: pozaColor({ W, H, laterala: 0.3, umbra: true, linii: true }),
} as const;

test('lumina egală: fără corecție, 6 culori; Neuniformă nu strică nimic, nici Cu umbre pe un desen cu linii', () => {
  for (const [nume, m] of [['Uniformă', cu(POZE.egala)], ['Neuniformă', cu(POZE.egala, 'neuniforma')], ['Cu umbre, liniile', cu(POZE.liniiEgala, 'umbre')]] as const) {
    assert.ok(m.K === 6 && m.despartite.length === 0 && m.unite.length === 0 && m.gresite <= 0.002, `${nume}: ${text(m)}`);
  }
});

test('lumina dintr-o parte, cu dominantă: Uniformă rupe hârtia în două; Neuniformă dă 6 culori, cele adevărate (hârtia albă)', () => {
  const u = cu(POZE.laterala);
  // Măsurat: 7 culori, hârtia ruptă, 36 % din pixelii curați greșiți.
  assert.ok(u.despartite.includes('hârtia') && u.gresite > 0.2, `Uniformă: ${text(u)}`);
  const n = cu(POZE.laterala, 'neuniforma');
  assert.ok(n.K === 6 && n.despartite.length === 0 && n.unite.length === 0 && n.gresite <= 0.002, `Neuniformă: ${text(n)}`);
  // Balansul de alb (răspunsul 1a): paleta are culorile desenului sub o lumină albă, oricare ar fi dominanta (măsurat: la
  // cel mult 2 trepte pe canal; galbenul, cerneala deschisă, e al lui).
  n.culori.forEach((c, k) => {
    const a = adevarate[k] ?? [0, 0, 0];
    assert.ok(c.every((v, i) => Math.abs(v - (a[i] ?? 0)) <= 8), `clasa ${k}: ${c.join(', ')} față de ${a.map((v) => v.toFixed(0)).join(', ')}`);
  });
});

test('creta colorată pe tablă: Uniformă unește culorile; Neuniformă dă 6 (fundalul tablei adus la media lui, fără tăieri)', () => {
  const u = cu(POZE.tabla);
  // Măsurat: 4 culori, verdele, negrul (creta albă) și galbenul unite.
  assert.ok(u.unite.length > 0, `Uniformă: ${text(u)}`);
  const n = cu(POZE.tabla, 'neuniforma');
  assert.ok(n.K === 6 && n.despartite.length === 0 && n.unite.length === 0 && n.gresite <= 0.002, `Neuniformă: ${text(n)}`);
  // Fundalul rămâne închis (nu e adus la alb pe tablă).
  const f = n.culori[0] ?? [255, 255, 255];
  assert.ok(Math.max(...f) < 80, `tabla: ${f.join(', ')}`);
});

test('liniile colorate cu umbra tare a telefonului: Cu umbre dă 6 culori; Neuniformă (netedă) rupe hârtia', () => {
  const c = cu(POZE.liniiUmbra, 'umbre');
  assert.ok(c.K === 6 && c.despartite.length === 0 && c.unite.length === 0 && c.gresite <= 0.002, `Cu umbre: ${text(c)}`);
  const n = cu(POZE.liniiUmbra, 'neuniforma');
  assert.ok(n.despartite.includes('hârtia'), `Neuniformă: ${text(n)}`);
});

test('formele pline cu umbra tare: niciuna nu o repară (ADR 0226, răspunsul 2a); Cu umbre golește formele pline', () => {
  const n = cu(POZE.umbra, 'neuniforma');
  assert.ok(n.despartite.includes('hârtia'), `Neuniformă: ${text(n)}`);
  // Cu umbre: o formă plină mai lată decât fereastra devine fundal, deci se unește cu hârtia (măsurat: roșul, albastrul și
  // verdele cu hârtia).
  const c = cu(POZE.umbra, 'umbre');
  assert.ok(c.unite.includes('hârtia+1') && c.unite.includes('hârtia+2'), `Cu umbre: ${text(c)}`);
});

test('pe transparență, lumina nu se aplică: aceleași culori, iar raportul spune „uniforma”, fără variație', () => {
  const p = pozaColor({ W, H, laterala: 0.5, transparent: true });
  const fara = trasata(p), n = trasata(p, 'neuniforma');
  assert.equal(n.raport.lumina, 'uniforma');
  assert.equal(n.raport.inegala, null);
  assert.deepEqual(n.raport.paleta.map((c) => c.hex), fara.raport.paleta.map((c) => c.hex));
  assert.deepEqual([...n.etichete], [...fara.etichete]);
});

test('sugestia raportului: la Uniformă, cât variază hârtia (peste 25 % pe lumina dintr-o parte, aproape deloc pe cea egală)', () => {
  const l = trasata(POZE.laterala), e = trasata(POZE.egala), n = trasata(POZE.laterala, 'neuniforma');
  assert.equal(l.raport.lumina, 'uniforma');
  assert.ok((l.raport.inegala ?? 0) > 0.25, `laterală: ${l.raport.inegala}`);
  assert.ok((e.raport.inegala ?? 1) < 0.1, `egală: ${e.raport.inegala}`);
  assert.equal(n.raport.lumina, 'neuniforma');
  assert.equal(n.raport.inegala, null);
});

test('corecția, pe o foaie cu trei linii: lumina și dominanta pleacă; pe hârtie, albul la 255; pe tablă, nivelul ei mediu', () => {
  // Trei linii orizontale de 2 px (cerneala închisă pe hârtie, creta deschisă pe tablă): ele dau polaritatea; restul e fundal.
  const Wg = 200, Hg = 120, foaie = new Uint8ClampedArray(Wg * Hg * 4), tabla = new Uint8ClampedArray(Wg * Hg * 4);
  const peLinie = (y: number): boolean => [30, 60, 90].some((r) => y >= r && y < r + 2);
  const departe = (y: number): boolean => [30, 60, 90].every((r) => y < r - 3 || y >= r + 5);
  for (let y = 0; y < Hg; y++) {
    for (let x = 0; x < Wg; x++) {
      const l = 1 - (0.5 * x) / Wg - (0.1 * y) / Hg, q = 4 * (y * Wg + x), lin = peLinie(y);
      foaie.set(lin ? [40 * l, 40 * l, 40 * l, 250] : [230 * l * (1.05 - (0.1 * x) / Wg), 225 * l, 215 * l * (0.95 + (0.1 * x) / Wg), 250], q);
      tabla.set(lin ? [220 * l, 220 * l, 220 * l, 255] : [40 * l, 46 * l, 42 * l, 255], q);
    }
  }
  const f = culoriLuminate({ latime: Wg, inaltime: Hg, date: foaie }, 'neuniforma');
  for (let y = 0; y < Hg; y++) {
    if (!departe(y)) continue;
    for (let x = 0; x < Wg; x++) for (let k = 0; k < 3; k++) assert.ok((f.date[4 * (y * Wg + x) + k] ?? 0) >= 250, `foaia (${x}, ${y}), canalul ${k}: ${f.date[4 * (y * Wg + x) + k]}`);
  }
  const t = culoriLuminate({ latime: Wg, inaltime: Hg, date: tabla }, 'neuniforma');
  // Media fundalului tablei, pe fiecare canal: același nivel peste tot (la 3 trepte), fără tăieri.
  for (let k = 0; k < 3; k++) {
    let mn = 255, mx = 0;
    for (let y = 0; y < Hg; y++) {
      if (!departe(y)) continue;
      for (let x = 0; x < Wg; x++) { const v = t.date[4 * (y * Wg + x) + k] ?? 0; mn = Math.min(mn, v); mx = Math.max(mx, v); }
    }
    assert.ok(mx - mn <= 3 && mx < 60, `tabla, canalul ${k}: ${mn}–${mx}`);
  }
  // Alfa rămâne (aici 250: imaginea e tot opacă).
  assert.equal(f.date[3], 250);
});

test('viteza: Neuniformă pe 12 Mpx sub 1,5 s (măsurat în prototip, nescris pentru viteză: 1,0–1,1 s)', () => {
  const Wm = 4000, Hm = 3000, d = new Uint8ClampedArray(Wm * Hm * 4);
  let s = 3;
  for (let p = 0; p < Wm * Hm; p++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const l = 1 - 0.4 * ((p % Wm) / Wm), v = (s & 63) < 4 ? 40 : 230;
    d[4 * p] = v * l; d[4 * p + 1] = v * l * 0.98; d[4 * p + 2] = v * l * 0.95; d[4 * p + 3] = 255;
  }
  const t0 = performance.now();
  culoriLuminate({ latime: Wm, inaltime: Hm, date: d }, 'neuniforma');
  const t = performance.now() - t0;
  assert.ok(t < 1500, `${t.toFixed(0)} ms`);
});
