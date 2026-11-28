/**
 * Cotele pe loturi de linii (ADR 0323, planul liniilor pe workere; felia 18.1↑h-6). Finisarea și degroșarea sunt acum în trei
 * părți: planul (liniile, refuzurile, avertismentele, fără câmpul întreg), cotele unui lot de linii (`coteLot`, cu câmpul doar
 * pe benzile de care are nevoie lotul, pe fiecare relief) și mișcările. Ca un bazin de workere să dea același program, octet cu
 * octet, loturile lipite trebuie să dea cotele dintr-o bucată, bit cu bit, oricum ar fi împărțite liniile.
 *
 * Cazurile: un relief și două (al doilea rotit și mutat, cu cotele lui peste ale primului), liniile la 0°, 90°, 30° și
 * nealiniate, bila, plata, V-ul și toroidala, marginea „perete” și „trece”; degroșarea cu adaos (cota ei e a frezei plate de rază
 * R + a, deci benzile se fac după raza aceea, nu după a frezei). Împărțirile: la întâmplare (sămânță fixă), și câte o linie pe lot.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coteLot, planDegrosare, planFinisare, type FrezaFinisare, type LinieZ, type ParametriFinisare, type PlanTreceri, type ReliefCam } from '../../src/cam/reliefFinisare.ts';

function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function relief(r: () => number, nx: number, ny: number, c: number, m: ReliefCam['m']): ReliefCam {
  const z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = -2 + Math.sin(i * 0.4) * Math.cos(j * 0.3) - (r() < 0.05 ? 3 * r() : 0.3 * r());
  return { nx, ny, celula: c, z, m };
}

/** Lotul dintr-o bucată și loturile unei împărțiri, pe fiecare relief, lipite. */
function comparaLoturi(plan: PlanTreceri, r: () => number, eticheta: string): number {
  let linii = 0;
  for (const { ip, linii: ls } of plan.liniiPe) {
    const n = ls.length, tot = coteLot(plan, ip, 0, n);
    for (const fel of ['intamplare', 'cate-una'] as const) {
      const lipite: LinieZ[] = [];
      let k = 0;
      while (k < n) {
        const pas = fel === 'cate-una' ? 1 : 1 + Math.floor(r() * Math.max(1, n / 3));
        lipite.push(...coteLot(plan, ip, k, Math.min(n, k + pas)));
        k += pas;
      }
      assert.equal(lipite.length, tot.length, `${eticheta}, relieful ${ip}, ${fel}`);
      for (const [q, l] of lipite.entries()) {
        const t = tot[q]!;
        assert.equal(l.z.length, t.z.length);
        for (let i = 0; i < l.z.length; i++) {
          assert.ok(Object.is(l.x[i], t.x[i]) && Object.is(l.y[i], t.y[i]), `${eticheta}: punctul ${i} al liniei ${q}`);
          assert.ok(l.z[i] === t.z[i], `${eticheta}, relieful ${ip}, ${fel}, linia ${q}, punctul ${i}: ${l.z[i]} față de ${t.z[i]}`);
        }
      }
    }
    linii += n;
  }
  return linii;
}

const FREZE: readonly FrezaFinisare[] = [
  { fel: 'bila', raza: 1.5 }, { fel: 'plata', raza: 1 }, { fel: 'v', raza: 2, unghi: 90, varf: 0.3 }, { fel: 'toroidala', raza: 1.5, colt: 0.5 },
];
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const ROTIT = { a: Math.cos(0.5), b: Math.sin(0.5), c: -Math.sin(0.5), d: Math.cos(0.5), e: 6, f: -2 };

test('finisarea: loturile de linii, fiecare cu benzile lui, lipite = cotele dintr-o bucată, bit cu bit', () => {
  const r = aleator(42);
  let linii = 0;
  for (const [caz, [unghi, nealiniat]] of ([[0, false], [90, false], [30, false], [0, true]] as const).entries()) {
    for (const doua of [false, true]) {
      const reliefuri = [relief(r, 40, 30, 0.5, I), ...(doua ? [relief(r, 20, 24, 0.25, ROTIT)] : [])];
      const o: ParametriFinisare = {
        reliefuri, unghi, nealiniat, margine: caz % 2 === 0 ? 'perete' : 'trece', pas: 3, adancime: 8, zSigur: 5, avans: 1000,
        avansPlonjare: 300, pasLateral: 0.6, freza: FREZE[caz]!,
      };
      const pl = planFinisare(o);
      assert.ok(pl.ok, pl.ok ? '' : pl.motiv);
      linii += comparaLoturi(pl.plan, r, `${unghi}°${nealiniat ? ' nealiniat' : ''}, ${doua ? 'două reliefuri' : 'un relief'}`);
    }
  }
  assert.ok(linii > 300, `${linii} linii`);
});

test('degroșarea: aceleași loturi, cu benzile după raza cotei (R + adaos), nu după a frezei', () => {
  const r = aleator(7);
  for (const adaos of [0, 0.5, 2]) {
    const reliefuri = [relief(r, 40, 30, 0.5, I), relief(r, 20, 24, 0.25, ROTIT)];
    const pl = planDegrosare({
      reliefuri, unghi: 0, margine: 'perete', pas: 2, adancime: 8, zSigur: 5, avans: 1000, avansPlonjare: 300, pasLateral: 0.8,
      raza: 1.5, adaos,
    });
    assert.ok(pl.ok, pl.ok ? '' : pl.motiv);
    const n = comparaLoturi(pl.plan, r, `degroșarea, adaosul ${adaos}`);
    assert.ok(n > 10, `${n} linii`);
  }
});
