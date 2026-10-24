import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutieFormelor } from '../../src/app/editareCalcul.ts';
import { cotePeste, EPS_COTA, pozitiaRiglelor } from '../../src/canvas/gradatii.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Rigla pe marginea foii (ADR 0060): lipită de marginea de sus și din stânga a foii, lungă cât foaia, mutată cu ea; oprită
 * pe marginea zonei libere când foaia iese din ea. Cotele: cât ies formele din foaie, pe fiecare parte.
 */

const G = 20;
const zona = { x: 260, y: 100, w: 760, h: 560 };
const foaie = { latime: 300, inaltime: 200 };

test('rigla de sus deasupra foii, cât foaia; rigla din stânga la stânga ei; colțul nu se suprapune', () => {
  // Foaia de 300 × 200 la 2 px/mm, cu colțul stânga-jos în (300, 600): de la x 300 la 900, de la y 200 la 600.
  const v = { scara: 2, tx: 300, ty: 600 };
  const { sus, stanga } = pozitiaRiglelor(v, zona, foaie, G);
  assert.deepEqual(sus, { x0: 300, x1: 900, y: 180 });
  assert.deepEqual(stanga, { y0: 200, y1: 600, x: 280 });
});

test('foaia trasă peste marginea zonei: rigla se oprește pe marginea zonei, întinderea se taie la zonă', () => {
  // Foaia împinsă în sus-stânga: marginea de sus la y 50 (deasupra zonei), marginea din stânga la x 100 (sub panou).
  const v = { scara: 2, tx: 100, ty: 450 };
  const { sus, stanga } = pozitiaRiglelor(v, zona, foaie, G);
  assert.equal(sus?.y, zona.y, 'sus: pe marginea de sus a zonei');
  assert.equal(stanga?.x, zona.x, 'stânga: pe marginea din stânga a zonei');
  assert.equal(sus?.x0, zona.x + G, 'după colțul riglei din stânga');
  assert.equal(sus?.x1, 700, 'până la marginea din dreapta a foii');
  assert.equal(stanga?.y0, zona.y + G);
  assert.equal(stanga?.y1, 450);
  // Foaia cu totul în dreapta zonei: rigla de sus n-are ce arăta; cea din stânga rămâne lipită pe marginea din dreapta a zonei.
  const departe = pozitiaRiglelor({ scara: 2, tx: 1200, ty: 600 }, zona, foaie, G);
  assert.equal(departe.sus, null);
  assert.equal(departe.stanga?.x, zona.x + zona.w - G);
});

test('cotele: cât ies formele din foaie pe fiecare parte; nimic sub zgomot, nimic fără forme', () => {
  assert.deepEqual(cotePeste(null, foaie), { stanga: null, dreapta: null, jos: null, sus: null });
  assert.deepEqual(cotePeste({ minX: 10, minY: 10, maxX: 290, maxY: 190 }, foaie), { stanga: null, dreapta: null, jos: null, sus: null });
  assert.deepEqual(cotePeste({ minX: -12, minY: -3, maxX: 350, maxY: 225.5 }, foaie), { stanga: 12, dreapta: 50, jos: 3, sus: 25.5 });
  assert.deepEqual(cotePeste({ minX: -EPS_COTA / 2, minY: 0, maxX: 300 + EPS_COTA / 2, maxY: 200 }, foaie), { stanga: null, dreapta: null, jos: null, sus: null });
});

test('cutia formelor: toate formele foii (cercul după rază), goală fără forme', () => {
  const d = docDin({ latime: 300, inaltime: 200, grosime: 18 },
    { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 250, f: 20 } },
    { id: 'c', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: -5, f: 50 } });
  const k = cutieFormelor(d);
  assert.ok(k);
  assert.deepEqual([k.minX, k.minY, k.maxX, k.maxY].map((x) => Math.round(x * 1e9) / 1e9), [-20, 20, 350, 80]);
  assert.deepEqual(cotePeste(k, foaie), { stanga: 20, dreapta: 50, jos: null, sus: null });
  assert.equal(cutieFormelor(docDin({ latime: 300, inaltime: 200, grosime: 18 })), null);
});
