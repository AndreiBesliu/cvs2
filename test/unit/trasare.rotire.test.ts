import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INCREDERE_MINIMA, UNGHI_CAUTAT, UNGHI_SUGESTIE, gasesteUnghiul, panzaRotita, rotesteImaginea,
} from '../../src/trasare/rotire.ts';
import { decodeazaTiff } from '../../src/trasare/tiff.ts';
import type { ImagineRGBA } from '../../src/trasare/trasare.ts';
import { citestePng } from './ajutor-png.ts';
import { pagina, randeaza } from './ajutor-rotire.ts';

/**
 * Îndreptarea scanărilor (ADR 0271, felia 25.4↑c): unghiul găsit pe pagini rotite de alt program (GDI+, din
 * `test/fixtures/trasare/rotire/genereaza.ps1`: un desen tehnic, o pagină de text, o scanare alb-negru G4) și pe paginile
 * sintetice ale prototipului (acoperirea exactă, unghiurile pe hârtie), cazurile nesigure, rotirea (pânza, fondul, marginea
 * prelungită, reducerea). Plafoanele, din măsurătorile prototipului (în ADR): 0,05° pe fixturile GDI+, 0,02° pe paginile
 * sintetice.
 */

const DIR = 'test/fixtures/trasare/rotire';
const png = (f: string): ImagineRGBA => citestePng(new Uint8Array(readFileSync(`${DIR}/${f}`)));

/** Unghiul găsit, care trebuie să existe și să fie la cel mult `tol` grade de cel adevărat. */
function aproape(img: ImagineRGBA, adevarat: number, tol: number, ce: string): number {
  const g = gasesteUnghiul(img);
  assert.ok(g.unghi !== null, `${ce}: nesigur (încrederea ${g.incredere.toFixed(2)})`);
  assert.ok(Math.abs(g.unghi - adevarat) <= tol, `${ce}: ${g.unghi.toFixed(4)}° în loc de ${adevarat}°`);
  assert.ok(g.incredere >= INCREDERE_MINIMA, `${ce}: încrederea ${g.incredere}`);
  return g.unghi;
}

test('scanările rotite de GDI+ (alt program): desenul +1,7° și −6,5°, textul −3,2°, scanarea G4 −0,6°, la cel mult 0,05°', async () => {
  aproape(png('desen-p1.7.png'), 1.7, 0.05, 'desen +1,7°');
  aproape(png('desen-m6.5.png'), -6.5, 0.05, 'desen −6,5°');
  aproape(png('text-m3.2.png'), -3.2, 0.05, 'text −3,2°');
  const t = await decodeazaTiff(new Uint8Array(readFileSync(`${DIR}/desen-g4-m0.6.tif`)), { pagina: 1, maxPixeli: 16_000_000 });
  assert.ok(t.ok);
  aproape(t.img, -0.6, 0.05, 'G4 −0,6°');
  // Pagina nerotită: unghiul e sub pragul sugestiei.
  const zero = gasesteUnghiul(png('desen-p0.png'));
  assert.ok(zero.unghi !== null && Math.abs(zero.unghi) < 0.05 && Math.abs(zero.unghi) < UNGHI_SUGESTIE, `nerotită: ${zero.unghi}`);
});

test('paginile sintetice, la unghiurile pe hârtie: desenul gri (0 … ±9°) și alb-negru, textul, la cel mult 0,02°', () => {
  const desen = pagina('desen', 1000, 700);
  for (const u of [0, 0.15, -0.4, 1, -2.3, 5, -9]) aproape(randeaza(desen, 1000, 700, u), u, 0.02, `desen ${u}°`);
  for (const u of [0.3, -1.2]) aproape(randeaza(desen, 1000, 700, u, { binar: true }), u, 0.02, `desen alb-negru ${u}°`);
  const text = pagina('text', 800, 1100);
  for (const u of [-2.3, 5]) aproape(randeaza(text, 800, 1100, u), u, 0.02, `text ${u}°`);
  // Doar linii verticale (un gard, o grilă de coloane): unghiul vine din proiecția pe coloane.
  const gard = Array.from({ length: 12 }, (_, k) => ({ t: 'seg', ax: 120 + 60 * k, ay: 150, bx: 120 + 60 * k, by: 550, hw: 1.5 } as const));
  aproape(randeaza(gard, 900, 700, 1.5), 1.5, 0.02, 'linii verticale 1,5°');
});

test('grila pixelilor nu trage unghiul spre 0: textul pe hârtie gri, cu zgomot, rotit cu 0,15°, iese la 0,02°', () => {
  // Fără punctele mutate cu o fracțiune de pixel, ieșea 0,004° (prototipul, în ADR).
  aproape(randeaza(pagina('text', 1240, 1754), 1240, 1754, 0.15, { zgomot: 0.15, hartie: 0.9 }), 0.15, 0.02, 'text cu zgomot 0,15°');
});

test('desenul alb pe negru (pagina inversată) dă același unghi: hârtia e ce domină marginea', () => {
  aproape(randeaza(pagina('desen', 1000, 700), 1000, 700, 2.3, { invers: true }), 2.3, 0.02, 'desen inversat 2,3°');
});

test('nesigur: cercurile, schița și zgomotul (încrederea sub prag), un punct, o imagine transparentă; peste ±10°', () => {
  for (const fel of ['cercuri', 'schita', 'zgomot'] as const) {
    const g = gasesteUnghiul(randeaza(pagina(fel, 1000, 700), 1000, 700, 2));
    assert.equal(g.unghi, null, `${fel}: ${g.unghi}`);
    assert.ok(g.incredere < INCREDERE_MINIMA && g.incredere > 0.9, `${fel}: încrederea ${g.incredere}`);
  }
  const punct = randeaza([{ t: 'disc', cx: 300, cy: 200, r: 3 }], 600, 400, 0);
  assert.deepEqual(gasesteUnghiul(punct), { unghi: null, incredere: 0 });
  const transp = randeaza(pagina('desen', 600, 400), 600, 400, 2);
  const d = new Uint8ClampedArray(transp.date);
  for (let i = 3; i < d.length; i += 8) d[i] = 0;
  assert.deepEqual(gasesteUnghiul({ ...transp, date: d }), { unghi: null, incredere: 0 });
  // Dincolo de interval, maximul cade la capătul lui: nesigur, nu ±10°.
  assert.equal(UNGHI_CAUTAT, 10);
  assert.equal(gasesteUnghiul(randeaza(pagina('desen', 1000, 700), 1000, 700, 12)).unghi, null);
  assert.equal(gasesteUnghiul(randeaza(pagina('desen', 1000, 700), 1000, 700, -12.5)).unghi, null);
});

/** Centrul de greutate al întunecimii (255 − roșu) unei imagini. */
function centru(img: ImagineRGBA): [number, number] {
  let s = 0, sx = 0, sy = 0;
  for (let y = 0; y < img.inaltime; y++) {
    for (let x = 0; x < img.latime; x++) {
      const w = 255 - (img.date[4 * (y * img.latime + x)] ?? 255);
      s += w; sx += w * (x + 0.5); sy += w * (y + 0.5);
    }
  }
  return [sx / s, sy / s];
}

test('rotirea: pânza mărită cât să încapă imaginea, punctul dus unde trebuie, pagina îndreptată are unghiul 0', () => {
  assert.deepEqual(panzaRotita(400, 300, 10), { latime: 446, inaltime: 365 });
  assert.deepEqual(panzaRotita(400, 300, -10), { latime: 446, inaltime: 365 });
  // Un disc la 100 px în dreapta centrului, pe o pagină rotită cu +10°: îndreptată, pagina îl duce cu 10° în sensul acelor
  // (y în jos): la (100 cos 10°, 100 sin 10°) de centrul pânzei.
  const disc = randeaza([{ t: 'disc', cx: 300, cy: 150, r: 5 }], 400, 300, 0);
  const r = rotesteImaginea(disc, 10, { prelungeste: false, maxPixeli: 16_000_000 });
  assert.equal(r.k, 1);
  assert.deepEqual([r.img.latime, r.img.inaltime], [446, 365]);
  const [x, y] = centru(r.img), a = (10 * Math.PI) / 180;
  assert.ok(Math.abs(x - (223 + 100 * Math.cos(a))) < 0.05 && Math.abs(y - (182.5 + 100 * Math.sin(a))) < 0.05, `discul la (${x}, ${y})`);
  // Desenul GDI+ rotit cu +1,7°, îndreptat: unghiul găsit apoi e aproape 0.
  const d = rotesteImaginea(png('desen-p1.7.png'), aproape(png('desen-p1.7.png'), 1.7, 0.05, 'desen'), { prelungeste: false, maxPixeli: 16_000_000 });
  const g = gasesteUnghiul(d.img);
  assert.ok(g.unghi !== null && Math.abs(g.unghi) < 0.02, `îndreptat: ${g.unghi}`);
});

/** O pagină 300 × 200 cu hârtia gri (200), un pătrat negru la mijloc și, la cerere, o bandă neagră de 3 px pe stânga. */
function hartieGri(banda: boolean): ImagineRGBA {
  const W = 300, H = 200, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = (x >= 130 && x < 170 && y >= 80 && y < 120) || (banda && x < 3) ? 0 : 200;
      d.set([v, v, v, 255], 4 * (y * W + x));
    }
  }
  return { latime: W, inaltime: H, date: d };
}

test('rotirea: colțurile pânzei au culoarea marginii; cu prelungirea, ce atinge marginea veche atinge și marginea nouă', () => {
  const r = rotesteImaginea(hartieGri(false), 5, { prelungeste: false, maxPixeli: 16_000_000 });
  assert.deepEqual(Array.from({ length: 4 }, (_, i) => r.img.date[i]), [200, 200, 200, 255]);
  // La jumătatea înălțimii, primii pixeli ai pânzei sunt în afara imaginii vechi (cam 7 px).
  const mij = Math.floor(r.img.inaltime / 2), la = (img: ImagineRGBA, x: number): number => img.date[4 * (mij * img.latime + x)] ?? -1;
  const fara = rotesteImaginea(hartieGri(true), 5, { prelungeste: false, maxPixeli: 16_000_000 }).img;
  const cu = rotesteImaginea(hartieGri(true), 5, { prelungeste: true, maxPixeli: 16_000_000 }).img;
  assert.equal(la(fara, 0), 200);
  assert.equal(la(cu, 0), 0);
  // Pătratul din mijloc e la fel în amândouă.
  assert.equal(la(fara, Math.floor(fara.latime / 2)), la(cu, Math.floor(cu.latime / 2)));
});

test('rotirea: peste maxPixeli, pânza redusă cu factorul k; sub 0,005°, aceeași imagine', () => {
  const img = randeaza(pagina('desen', 1000, 600), 1000, 600, 0);
  const p = panzaRotita(1000, 600, 10);
  const r = rotesteImaginea(img, 10, { prelungeste: false, maxPixeli: 400_000 });
  assert.ok(r.k < 1 && Math.abs(r.k - Math.sqrt(400_000 / (p.latime * p.inaltime))) < 1e-12, `k ${r.k}`);
  assert.ok(r.img.latime * r.img.inaltime <= 400_000);
  assert.ok(Math.abs(r.img.latime - p.latime * r.k) <= 1 && Math.abs(r.img.inaltime - p.inaltime * r.k) <= 1);
  // Pe pânza redusă, desenul e redus la fel: discul de la 100 px în dreapta centrului ajunge la 100 k px de centrul ei.
  const disc = rotesteImaginea(randeaza([{ t: 'disc', cx: 600, cy: 300, r: 6 }], 1000, 600, 0), 10, { prelungeste: false, maxPixeli: 400_000 });
  const [x, y] = centru(disc.img), a = (10 * Math.PI) / 180;
  assert.ok(Math.abs(x - (disc.img.latime / 2 + 100 * disc.k * Math.cos(a))) < 0.3, `discul la x ${x}`);
  assert.ok(Math.abs(y - (disc.img.inaltime / 2 + 100 * disc.k * Math.sin(a))) < 0.3, `discul la y ${y}`);
  // Desenul se îndreaptă și pe pânza redusă (pixelii ei sunt mai mari).
  const g = gasesteUnghiul(rotesteImaginea(randeaza(pagina('desen', 1000, 600), 1000, 600, 3), 3, { prelungeste: false, maxPixeli: 400_000 }).img);
  assert.ok(g.unghi !== null && Math.abs(g.unghi) < 0.03, `redusă: ${g.unghi}`);
  const t = rotesteImaginea(img, 0.004, { prelungeste: false, maxPixeli: 16_000_000 });
  // Identitatea, fără diff-ul a două imagini mari (o otravă care rotește totuși ar ține proba minute întregi).
  assert.ok(t.img === img, 'sub 0,005°, aceeași imagine');
  assert.equal(t.k, 1);
});
