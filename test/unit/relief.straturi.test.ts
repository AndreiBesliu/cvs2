/**
 * Straturile reliefului (ADR 0310 §1, §7; ADR 0320, felia 18.1↑j): editarea listei de straturi a unui relief, pură, pe
 * hârtie. Ochiul, numele și modul unui strat; ordinea (de jos în sus în document, sus = spre capătul listei); ștergerea (nu
 * și a ultimului); un strat nou deasupra, cu un id liber; câte sunt ascunse. Fiecare schimbare dă o formă nouă (cea veche
 * rămâne neatinsă, ca jurnalul s-o poată pune la loc) sau null când nu e nimic de făcut ori nu se poate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FormaRelief } from '../../src/model/document.ts';
import { STRATURI_RELIEF_MAXIM } from '../../src/model/document.ts';
import {
  cuStrat, cuStratNou, idStratNou, mutaStrat, straturiAscunse, stergeStrat,
} from '../../src/model/straturiRelief.ts';

const A = 'a'.repeat(64), B = 'b'.repeat(64), C = 'c'.repeat(64);
const relief = (): FormaRelief => ({
  tip: 'relief', nx: 10, ny: 8, celula: 0.5,
  straturi: [
    { id: 's1', nume: 'fundul', mod: 'aduna', vizibil: true, dale: A },
    { id: 's2', nume: 'logo', mod: 'inalt', vizibil: true, dale: B },
    { id: 's3', mod: 'scade', vizibil: false, dale: C },
  ],
});
const ids = (f: FormaRelief | null): string[] => (f ? f.straturi.map((s) => s.id) : []);

test('ochiul, numele și modul unui strat; restul formei și celelalte straturi rămân; forma veche e neatinsă', () => {
  const f = relief(), copie = structuredClone(f);
  const ascuns = cuStrat(f, 's2', { vizibil: false });
  assert.ok(ascuns);
  assert.equal(ascuns.straturi[1]?.vizibil, false);
  assert.deepEqual(ascuns.straturi[0], f.straturi[0]);
  assert.deepEqual(ascuns.straturi[2], f.straturi[2]);
  assert.equal(ascuns.nx, 10);
  assert.deepEqual(f, copie);
  assert.equal(cuStrat(f, 's1', { mod: 'inmulteste' })?.straturi[0]?.mod, 'inmulteste');
  assert.equal(cuStrat(f, 's3', { nume: 'gravura' })?.straturi[2]?.nume, 'gravura');
  // Un nume gol scoate numele (stratul se arată după id), nu păstrează un șir gol.
  const fara = cuStrat(f, 's1', { nume: '   ' });
  assert.ok(fara);
  assert.equal(Object.hasOwn(fara.straturi[0] ?? {}, 'nume'), false);
  // Câmpurile necunoscute ale unui strat (dintr-o versiune mai nouă) rămân.
  const cuNecunoscut: FormaRelief = { ...f, straturi: f.straturi.map((s) => (s.id === 's2' ? { ...s, viitor: 7 } : s)) };
  assert.equal(cuStrat(cuNecunoscut, 's2', { mod: 'jos' })?.straturi[1]?.['viitor'], 7);
});

test('nimic de schimbat sau un strat care nu există: null', () => {
  const f = relief();
  assert.equal(cuStrat(f, 's1', { vizibil: true }), null);
  assert.equal(cuStrat(f, 's2', { mod: 'inalt', nume: 'logo' }), null);
  assert.equal(cuStrat(f, 'nu-e', { vizibil: false }), null);
});

test('ordinea: sus spre capătul listei (deasupra în compus), jos spre început; la margini, null', () => {
  const f = relief();
  assert.deepEqual(ids(mutaStrat(f, 's1', 'sus')), ['s2', 's1', 's3']);
  assert.deepEqual(ids(mutaStrat(f, 's2', 'sus')), ['s1', 's3', 's2']);
  assert.deepEqual(ids(mutaStrat(f, 's3', 'jos')), ['s1', 's3', 's2']);
  assert.equal(mutaStrat(f, 's3', 'sus'), null);
  assert.equal(mutaStrat(f, 's1', 'jos'), null);
  assert.equal(mutaStrat(f, 'nu-e', 'sus'), null);
});

test('ștergerea: un strat pleacă, ultimul rămâne (un relief are cel puțin un strat)', () => {
  const f = relief();
  assert.deepEqual(ids(stergeStrat(f, 's2')), ['s1', 's3']);
  const unul: FormaRelief = { ...f, straturi: [f.straturi[0]!] };
  assert.equal(stergeStrat(unul, 's1'), null);
  assert.equal(stergeStrat(f, 'nu-e'), null);
});

test('stratul nou: deasupra tuturor, „adună”, vizibil, cu id-ul liber cel mai mic sN; peste plafon, null', () => {
  const f = relief();
  assert.equal(idStratNou(f), 's4');
  assert.equal(idStratNou({ ...f, straturi: [{ id: 's2', mod: 'aduna', vizibil: true, dale: A }] }), 's1');
  const nou = cuStratNou(f, { dale: C, nume: 'al doilea logo' });
  assert.ok(nou);
  assert.deepEqual(nou.straturi.at(-1), { id: 's4', nume: 'al doilea logo', mod: 'aduna', vizibil: true, dale: C });
  assert.equal(nou.straturi.length, 4);
  assert.equal(cuStratNou(f, { dale: C, nume: '', mod: 'scade' })?.straturi.at(-1)?.mod, 'scade');
  assert.equal(Object.hasOwn(cuStratNou(f, { dale: C, nume: '' })?.straturi.at(-1) ?? {}, 'nume'), false);
  const plin: FormaRelief = {
    ...f, straturi: Array.from({ length: STRATURI_RELIEF_MAXIM }, (_, k) => ({ id: `s${k + 1}`, mod: 'aduna' as const, vizibil: true, dale: A })),
  };
  assert.equal(cuStratNou(plin, { dale: B, nume: 'x' }), null);
});

test('câte straturi sunt ascunse (exportul le spune: nu se taie)', () => {
  assert.equal(straturiAscunse(relief()), 1);
  assert.equal(straturiAscunse(cuStrat(relief(), 's3', { vizibil: true })!), 0);
});
