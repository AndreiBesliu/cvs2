import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cazul } from '../oracles/simulare.cazuri.ts';
import { firePentru, simuleazaInBazin, SimulareAnulata } from '../../src/jobs/bazin.ts';
import { amprentaCamp, calculeazaBanda } from '../../src/sim/banda.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { parametriGrila, programCaz, simuleazaCaz } from './ajutor-simulare.ts';

/**
 * Bazinul simulării (ADR 0015, ADR 0047 §4): fără stare între joburi; în browser, câte un worker pe bandă; în Node (fără
 * `Worker`), aceleași benzi rulate pe rând, prin aceeași funcție. Workerele adevărate și amprenta lor în Edge: e2e.
 */

test('câte fire: unul mai puțin decât nucleele, între 1 și 8', () => {
  assert.equal(firePentru(1), 1);
  assert.equal(firePentru(2), 1);
  assert.equal(firePentru(5), 4);
  assert.equal(firePentru(32), 8);
  assert.equal(firePentru(Number.NaN), 1);
  assert.equal(firePentru(0), 1);
});

test('în Node, bazinul rulează benzile pe rând: 1 și 4 fire, același rezumat, aceeași amprentă ca nucleul direct', async () => {
  const c = cazul('gravura-v60');
  const p = pregatesteProgram(programCaz(c), 0);
  assert.ok(p.ok);
  const camp = parametriGrila(c.grila);
  const unu = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, fund: -18 }, 1);
  const patru = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, fund: -18 }, 4);
  assert.equal(unu.fire, 1);
  assert.equal(patru.fire, 4);
  assert.equal(unu.amprenta, amprentaCamp(simuleazaCaz(c)));
  assert.equal(patru.amprenta, unu.amprenta);
  assert.ok(Object.is(patru.volum, unu.volum));
  assert.deepEqual(patru.previzualizare, unu.previzualizare);
  assert.ok(unu.ms >= 0 && Number.isFinite(unu.ms));
});

test('mutările cererii nu se schimbă (fiecare bandă primește copia ei)', async () => {
  const c = cazul('tangent');
  const p = pregatesteProgram(programCaz(c), 0);
  assert.ok(p.ok);
  const inainte = p.mutari.slice();
  await simuleazaInBazin({ camp: parametriGrila(c.grila), scula: p.scula, mutari: p.mutari, fund: -18 }, 3);
  assert.deepEqual(p.mutari, inainte);
});

/**
 * Workerele bazinului, cu un `Worker` fals în Node (recenzia 19.10): un worker care tace, unul care raportează o eroare, un
 * job anulat — toate workerele jobului se opresc și nimic nu rămâne pentru jobul următor; unul care răspunde dă exact
 * rezultatul benzilor rulate pe rând.
 */
type Fel = 'tace' | 'eroare' | 'raspunde' | 'incet';
const lumea: { fel: Fel; create: number; oprite: number } = { fel: 'raspunde', create: 0, oprite: 0 };

class WorkerFals {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string; preventDefault: () => void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  oprit = false;
  constructor(url: URL) {
    assert.match(String(url), /lucratorSimulare\.ts$/);
    lumea.create++;
  }
  postMessage(m: { id: number; cerere: Parameters<typeof calculeazaBanda>[0] }): void {
    const fel = lumea.fel;
    if (fel === 'tace') return;
    setTimeout(() => {
      if (this.oprit) return;
      if (fel === 'eroare') this.onmessage?.({ data: { id: m.id, ok: false, motiv: 'o bandă a căzut' } });
      else this.onmessage?.({ data: { id: m.id, ok: true, raspuns: calculeazaBanda(m.cerere) } });
    }, fel === 'incet' ? 200 : 1);
  }
  terminate(): void {
    if (!this.oprit) lumea.oprite++;
    this.oprit = true;
  }
}

async function cuWorkerFals(fel: Fel, f: () => Promise<void>): Promise<void> {
  const g = globalThis as unknown as { Worker?: unknown };
  const vechi = g.Worker;
  g.Worker = WorkerFals;
  Object.assign(lumea, { fel, create: 0, oprite: 0 });
  try { await f(); } finally { g.Worker = vechi; }
}

function cerereCaz(id: string) {
  const c = cazul(id);
  const p = pregatesteProgram(programCaz(c), 0);
  if (!p.ok) throw new Error(p.motiv);
  return { camp: parametriGrila(c.grila), scula: p.scula, mutari: p.mutari, fund: -18 };
}

test('workerele răspund: același rezultat ca benzile pe rând; toate oprite la capăt', async () => {
  const local = await simuleazaInBazin(cerereCaz('tangent'), 3);
  await cuWorkerFals('raspunde', async () => {
    const r = await simuleazaInBazin(cerereCaz('tangent'), 3);
    assert.equal(r.amprenta, local.amprenta);
    assert.ok(Object.is(r.volum, local.volum));
    assert.deepEqual([lumea.create, lumea.oprite], [3, 3]);
  });
});

test('un worker care tace: jobul cade la termen, iar toate workerele lui se opresc (jobul următor pornește altele)', async () => {
  await cuWorkerFals('tace', async () => {
    await assert.rejects(simuleazaInBazin(cerereCaz('tangent'), 2, { termenMs: 30 }), /n-a răspuns/);
    assert.deepEqual([lumea.create, lumea.oprite], [2, 2]);
    lumea.fel = 'raspunde';
    await simuleazaInBazin(cerereCaz('tangent'), 2);
    assert.deepEqual([lumea.create, lumea.oprite], [4, 4], 'jobul următor are workerele lui');
  });
});

test('o bandă care raportează o eroare: jobul cade cu motivul ei, toate workerele se opresc', async () => {
  await cuWorkerFals('eroare', async () => {
    await assert.rejects(simuleazaInBazin(cerereCaz('tangent'), 3), /o bandă a căzut/);
    assert.deepEqual([lumea.create, lumea.oprite], [3, 3]);
  });
});

test('anularea: jobul cade cu SimulareAnulata, workerele se opresc; un semnal deja anulat nu pornește nimic', async () => {
  await cuWorkerFals('incet', async () => {
    const ac = new AbortController();
    const p = simuleazaInBazin(cerereCaz('tangent'), 2, { semnal: ac.signal });
    setTimeout(() => { ac.abort(); }, 20);
    await assert.rejects(p, SimulareAnulata);
    assert.deepEqual([lumea.create, lumea.oprite], [2, 2]);
    const gata = new AbortController();
    gata.abort();
    await assert.rejects(simuleazaInBazin(cerereCaz('tangent'), 2, { semnal: gata.signal }), SimulareAnulata);
    assert.equal(lumea.create, 2, 'un job deja anulat a pornit workere');
  });
});

test('în Node fără Worker, un semnal deja anulat oprește benzile', async () => {
  const ac = new AbortController();
  ac.abort();
  await assert.rejects(simuleazaInBazin(cerereCaz('tangent'), 2, { semnal: ac.signal }), SimulareAnulata);
});
