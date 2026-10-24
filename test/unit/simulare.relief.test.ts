import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cazul } from '../oracles/simulare.cazuri.ts';
import { simuleazaInBazin } from '../../src/jobs/bazin.ts';
import { calculeazaBanda, mutariPentruBanda, previzualizarePentru, reliefPentru, RELIEF_LATURA, RELIEF_MAXIM, uneste } from '../../src/sim/banda.ts';
import { campNou, compacteaza, dimensiuni, valoare, type ParametriCamp } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { parametriGrila, programCaz, simuleazaCaz } from './ajutor-simulare.ts';

/**
 * Relieful vederii 3D (ADR 0057 §2): cel mai jos Z pe bloc, cu blocul o putere a lui 2 (cel mult o dală), trimis de
 * fiecare bandă doar pentru rândurile ei. La blocul 1, relieful e exact câmpul nucleului (ADR 0010: afișarea citește
 * celulele, nu recalculează); pe orice număr de fire, același relief, bit cu bit; cererea lui nu schimbă amprenta.
 */

const program = (id: string) => {
  const c = cazul(id);
  const p = pregatesteProgram(programCaz(c), 0);
  if (!p.ok) throw new Error(`${id}: ${p.motiv}`);
  return { c, p };
};

test('blocul: cel mai mic care încape (1 pe o placă mică, 4 pe foaia de 2440 × 1220 la 0,25 mm); null peste plafoane', () => {
  assert.deepEqual(reliefPentru({ x0: 0, y0: 0, latime: 60, inaltime: 40, celula: 0.05, sus: 0 }), { latime: 1200, inaltime: 800, bloc: 1 });
  const foaie = reliefPentru({ x0: 0, y0: 0, latime: 2440, inaltime: 1220, celula: 0.25, sus: 0 });
  assert.deepEqual(foaie, { latime: 2440, inaltime: 1220, bloc: 4 });
  // O latură lungă cere blocul ei, chiar cu pixelii sub plafon.
  const lunga = reliefPentru({ x0: 0, y0: 0, latime: 1100, inaltime: 10, celula: 0.25, sus: 0 });
  assert.deepEqual(lunga, { latime: 2200, inaltime: 20, bloc: 2 });
  assert.ok(lunga.latime <= RELIEF_LATURA);
  // La plafonul celulelor câmpului (2²⁶), blocul 16 încape mereu sub plafonul pixelilor.
  assert.ok(2 ** 26 / 256 <= RELIEF_MAXIM);
  assert.equal(reliefPentru({ x0: 0, y0: 0, latime: 100, inaltime: 100, celula: 0.01, sus: 0 }, 10), null);
});

test('la blocul 1, relieful e câmpul nucleului, celulă cu celulă, pe 1 și pe 3 fire', async () => {
  for (const id of ['gravura-v60', 'sant-bila', 'arc-g3']) {
    const { c, p } = program(id);
    const camp = parametriGrila(c.grila), relief = reliefPentru(camp);
    assert.ok(relief && relief.bloc === 1, id);
    const F = simuleazaCaz(c);
    for (const fire of [1, 3]) {
      const r = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, fund: -18, relief }, fire);
      assert.ok(r.relief, id);
      assert.equal(r.relief.z.length, F.nx * F.ny);
      let diferite = 0, taiate = 0;
      for (let j = 0; j < F.ny; j++) {
        for (let i = 0; i < F.nx; i++) {
          const v = valoare(F, i, j);
          if (!Object.is(r.relief.z[j * F.nx + i], v)) diferite++;
          if (v < F.sus) taiate++;
        }
      }
      assert.equal(diferite, 0, `${id}, ${fire} fire`);
      assert.ok(taiate > 1000, `${id}: are ce compara (${taiate} celule tăiate)`);
    }
  }
});

test('la blocul 4, cel mai jos Z pe bloc; același relief pe 1, 2 și 5 fire; amprenta nu se schimbă', async () => {
  const { c, p } = program('arc-g3');
  const camp = parametriGrila(c.grila);
  const { nx, ny } = dimensiuni(camp.celula, camp.latime, camp.inaltime);
  const rel = { latime: Math.ceil(nx / 4), inaltime: Math.ceil(ny / 4), bloc: 4 };
  const F = simuleazaCaz(c);
  const asteptat = new Float32Array(rel.latime * rel.inaltime).fill(F.sus);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = (j >> 2) * rel.latime + (i >> 2);
    asteptat[k] = Math.min(asteptat[k]!, valoare(F, i, j));
  }
  const fara = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, fund: -18 }, 2);
  assert.equal(fara.relief, undefined);
  for (const fire of [1, 2, 5]) {
    const r = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, fund: -18, relief: rel }, fire);
    assert.deepEqual(r.relief?.z, asteptat, `${fire} fire`);
    assert.equal(r.amprenta, fara.amprenta);
    assert.ok(Object.is(r.volum, fara.volum));
    assert.deepEqual(r.previzualizare, fara.previzualizare);
  }
});

test('o fereastră a plăcii la aceeași celulă are exact celulele plăcii întregi (vederea fină la 0,1 mm, ADR 0057 §4)', async () => {
  const { c, p } = program('cerc-complet');
  const plin: ParametriCamp = { ...parametriGrila(c.grila), celula: 0.1 };
  const F = campNou(plin);
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  // Fereastra începe la (17·0,1·16, 9·0,1·16) mm, pe grila plăcii; 20,8 × 17,6 mm. Centrul unei celule se calculează din
  // alt x0 (ulp-uri), deci comparația e până la 1e-6 mm, nu bit cu bit.
  const i0 = 17 * 16, j0 = 9 * 16, fereastra: ParametriCamp = { ...plin, x0: i0 * 0.1, y0: j0 * 0.1, latime: 208 * 0.1, inaltime: 176 * 0.1 };
  const relief = reliefPentru(fereastra);
  assert.deepEqual(relief, { latime: 208, inaltime: 176, bloc: 1 });
  const r = await simuleazaInBazin({ camp: fereastra, scula: p.scula, mutari: p.mutari, fund: -18, relief }, 3);
  let diferite = 0, taiate = 0;
  for (let j = 0; j < 176; j++) for (let i = 0; i < 208; i++) {
    const v = valoare(F, i0 + i, j0 + j);
    if (Math.abs(r.relief!.z[j * 208 + i]! - v) > 1e-6) diferite++;
    if (v < 0) taiate++;
  }
  assert.equal(diferite, 0);
  assert.ok(taiate > 500, `are ce compara (${taiate})`);
});

test('unirea refuză o bandă fără relief sau cu relieful de altă mărime', () => {
  const { c, p } = program('sant-plat');
  const camp = parametriGrila(c.grila), previzualizare = previzualizarePentru(camp), relief = reliefPentru(camp)!;
  const banda = { n: 2, w: 0 };
  const cu = calculeazaBanda({ camp, banda, scula: p.scula, fund: -18, previzualizare, relief, mutari: mutariPentruBanda(p.mutari, p.scula, camp, banda) });
  const fara = calculeazaBanda({ camp, banda: { n: 2, w: 1 }, scula: p.scula, fund: -18, previzualizare, mutari: mutariPentruBanda(p.mutari, p.scula, camp, { n: 2, w: 1 }) });
  assert.throws(() => uneste(camp, previzualizare, -18, [cu, fara], relief), /n-a trimis relieful/);
  assert.throws(() => uneste(camp, previzualizare, -18, [cu, { ...fara, relief: new Float32Array(3) }], relief), /are 3 pixeli/);
});

test('banda refuză un relief cu blocul care nu e o putere a lui 2 (sau peste o dală) ori cu altă grilă decât a câmpului', () => {
  const { c, p } = program('sant-plat');
  const camp = parametriGrila(c.grila), previzualizare = previzualizarePentru(camp), banda = { n: 1, w: 0 };
  const cere = (relief: { latime: number; inaltime: number; bloc: number }) => () => calculeazaBanda({ camp, banda, scula: p.scula, fund: -18, previzualizare, relief, mutari: p.mutari.slice() });
  assert.throws(cere({ latime: 400, inaltime: 267, bloc: 3 }), /putere a lui 2/);
  assert.throws(cere({ latime: 38, inaltime: 25, bloc: 32 }), /putere a lui 2/);
  assert.throws(cere({ latime: 600, inaltime: 399, bloc: 2 }), /600 × 399 pe blocul 2/);
  assert.doesNotThrow(cere({ latime: 600, inaltime: 400, bloc: 2 }));
});
