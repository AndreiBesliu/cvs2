import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cazul } from '../oracles/simulare.cazuri.ts';
import { calculeazaBanda, previzualizarePentru, uneste } from '../../src/sim/banda.ts';
import { CELULA_IMPLICITA, campPentruFoaie, PLAFON_CELULE, valoare } from '../../src/sim/camp.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { parametriGrila, programCaz, simuleazaCaz } from './ajutor-simulare.ts';

/**
 * Rezumatul simulării pentru om (ADR 0047 §5): volumul scos, adâncimea cea mai mare, trecerea prin foaie, previzualizarea
 * în tonuri de gri (pe blocuri de celule, cel mai adânc punct al blocului). Valorile pe hârtie: numărate pe celulele
 * valorii exacte a piesei, nu luate din nucleu.
 */

function rezumat(id: string, fund: number) {
  const c = cazul(id);
  const p = pregatesteProgram(programCaz(c), 0);
  if (!p.ok) throw new Error(p.motiv);
  const camp = parametriGrila(c.grila), previzualizare = previzualizarePentru(camp);
  return uneste(camp, previzualizare, fund, [calculeazaBanda({ camp, banda: { n: 1, w: 0 }, scula: p.scula, mutari: p.mutari, fund, previzualizare })]);
}

test('volumul pe hârtie: șanțul plat Ø6 la −3 = 3 mm × aria celulelor hârtiei (și ≈ 40 × 6 + π·9, aria exactă)', () => {
  const c = cazul('sant-plat'), g = c.grila, h = c.hartie;
  assert.ok(h);
  const nx = Math.ceil(g.latime / g.celula - 1e-9), ny = Math.ceil(g.inaltime / g.celula - 1e-9);
  let hartie = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) hartie += -h(g.x0 + (i + 0.5) * g.celula, g.y0 + (j + 0.5) * g.celula);
  hartie *= g.celula * g.celula;
  const r = rezumat('sant-plat', -18);
  assert.ok(Math.abs(r.volum - hartie) <= 1e-9 * hartie, `volumul ${r.volum} față de hârtia ${hartie}`);
  const exact = 3 * (40 * 6 + Math.PI * 9);
  assert.ok(Math.abs(r.volum - exact) <= 0.01 * exact, `volumul ${r.volum} față de aria exactă ${exact}`);
  assert.equal(r.zMin, -3);
  assert.equal(r.adancimeMax, 3);
  assert.equal(r.prinFoaie, false);
});

test('prin foaie: o plonjare la −5 într-o foaie de 4 mm scoate doar cei 4 mm ai foii și spune că a trecut', () => {
  const adanc = rezumat('plonjare-plata', -4), gros = rezumat('plonjare-plata', -18);
  assert.equal(adanc.prinFoaie, true);
  assert.equal(gros.prinFoaie, false);
  assert.equal(adanc.adancimeMax, 5, 'adâncimea cea mai mare e a sculei, nu a foii');
  assert.ok(Math.abs(adanc.volum / gros.volum - 4 / 5) <= 1e-12, `${adanc.volum} / ${gros.volum}`);
});

test('previzualizarea: fiecare pixel e cel mai adânc punct al blocului lui de celule; netăiat = fața', () => {
  for (const id of ['arc-g3', 'gravura-v60', 'rampa-bila']) {
    const c = cazul(id), F = simuleazaCaz(c), r = rezumat(id, -18);
    const { latime, inaltime, bloc, z } = r.previzualizare;
    assert.ok(latime <= 480 && inaltime <= 480 && latime * bloc >= F.nx && inaltime * bloc >= F.ny, `${latime} × ${inaltime}, bloc ${bloc}`);
    assert.equal(z.length, latime * inaltime);
    for (let py = 0; py < inaltime; py++) for (let px = 0; px < latime; px++) {
      let m = F.sus;
      for (let j = py * bloc; j < Math.min(F.ny, (py + 1) * bloc); j++) for (let i = px * bloc; i < Math.min(F.nx, (px + 1) * bloc); i++) m = Math.min(m, valoare(F, i, j));
      if (!Object.is(z[py * latime + px], Math.fround(m))) assert.fail(`${id}: pixelul (${px}, ${py}) = ${z[py * latime + px]}, blocul ${m}`);
    }
  }
});

test('previzualizarea unei foi mici nu se mărește: un bloc e cel puțin o celulă', () => {
  const p = previzualizarePentru({ x0: 0, y0: 0, latime: 10, inaltime: 5, celula: 0.25, sus: 0 });
  assert.deepEqual(p, { latime: 40, inaltime: 20, bloc: 1 });
});

test('grila foii: 0,25 mm implicit (ADR 0010); o foaie peste plafonul de celule primește o celulă dublată până încape', () => {
  assert.equal(CELULA_IMPLICITA, 0.25);
  const placa = campPentruFoaie({ latime: 2440, inaltime: 1220 });
  assert.deepEqual(placa, { x0: 0, y0: 0, latime: 2440, inaltime: 1220, celula: 0.25, sus: 0 });
  const mare = campPentruFoaie({ latime: 10_000, inaltime: 10_000 });
  const n = Math.ceil(10_000 / mare.celula) ** 2;
  assert.ok(n <= PLAFON_CELULE && mare.celula > 0.25, `celula ${mare.celula}: ${n} de celule`);
  assert.ok(Math.ceil(10_000 / (mare.celula / 2)) ** 2 > PLAFON_CELULE, 'celula nu e cea mai mică care încape');
});
