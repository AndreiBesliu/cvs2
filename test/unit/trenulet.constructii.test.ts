/**
 * Construcțiile cu nume din atelierul Easy 3Draw (ADR 0284, partea D; felia 3.Ch), pe funcțiile pure ale motorului:
 * - `cheieDef`: cheia unei definiții de piesă, aceeași oricum ar fi ordinea câmpurilor (două piese cu aceeași cheie sunt
 *   aceeași piesă, deci în lista construcției și în lista de printat stau pe un singur rând);
 * - `pieseConstructie`: piesele unei construcții, pe rânduri, cu bucățile adunate, în ordinea în care apar prima dată;
 * - `timpPrint`: timpul de printat, în secunde, din grame (PLA, 1,24 g/cm³, ca la `grame`) și debitul mediu al
 *   imprimantei (mm³/s);
 * - `curataNume` și `numeLiber`: numele unei construcții (fără spațiile de prisos, cel mult 60 de caractere) și primul nume
 *   liber pornind de la cel dorit („Construcția 2”, „Șasiu (copie) 2”).
 * Valorile sunt pe hârtie: 12,4 g de PLA = 10 000 mm³, deci 2 000 s la 5 mm³/s.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L } from './ajutor-plasa-lego.ts';

type Def = Record<string, unknown> & { tip: string };
const Lc = L as unknown as {
  cheieDef(d: unknown): string;
  pieseConstructie<D>(defs: readonly D[]): { def: D; bucati: number }[];
  timpPrint(grame: number, debit: number): number | null;
  curataNume(nume: unknown, max?: number): string;
  numeLiber(existente: readonly string[], dorit: string): string;
};
// motorul rulează în alt context (vm): copiile lui se compară după ce trec prin JSON
const copie = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

test('cheieDef: aceeași cheie oricum ar fi ordinea câmpurilor, și în obiectele dinăuntru', () => {
  const a = { tip: 'caramida', placi: 3, celule: [[0, 0], [1, 0]], laterale: { sus: true, jos: false } };
  const b = { celule: [[0, 0], [1, 0]], laterale: { jos: false, sus: true }, placi: 3, tip: 'caramida' };
  assert.equal(Lc.cheieDef(a), Lc.cheieDef(b));
  // cheia e JSON-ul cu câmpurile în ordine alfabetică, la fiecare nivel
  assert.equal(Lc.cheieDef(b), '{"celule":[[0,0],[1,0]],"laterale":{"jos":false,"sus":true},"placi":3,"tip":"caramida"}');
});

test('cheieDef: ordinea dintr-un șir contează, la fel orice valoare; un câmp nedefinit lipsește, ca în JSON', () => {
  const a = { tip: 'caramida', celule: [[0, 0], [1, 0]] };
  assert.notEqual(Lc.cheieDef(a), Lc.cheieDef({ tip: 'caramida', celule: [[1, 0], [0, 0]] }));
  assert.notEqual(Lc.cheieDef(a), Lc.cheieDef({ tip: 'caramida', celule: [[0, 0], [2, 0]] }));
  assert.notEqual(Lc.cheieDef({ tip: 'ax', lung: 3 }), Lc.cheieDef({ tip: 'ax', lung: '3' }));
  assert.equal(Lc.cheieDef({ tip: 'ax', lung: 3, capat: undefined }), Lc.cheieDef({ lung: 3, tip: 'ax' }));
  assert.equal(Lc.cheieDef({ tip: 'ax', lung: 3, capat: undefined }), '{"lung":3,"tip":"ax"}');
});

test('pieseConstructie: aceeași piesă se adună, în ordinea în care apare prima dată', () => {
  const A: Def = { tip: 'caramida', placi: 3, celule: [[0, 0]] }, A2: Def = { celule: [[0, 0]], placi: 3, tip: 'caramida' };
  const B: Def = { tip: 'ax', lung: 3 }, C: Def = { tip: 'grinda', celule: [[0, 0, 'r']] };
  const r = copie(Lc.pieseConstructie([A, B, A, C, B, A2]));
  assert.deepEqual(r, [{ def: A, bucati: 3 }, { def: B, bucati: 2 }, { def: C, bucati: 1 }]);
  // rândul ține definiția primei apariții (cu ordinea ei de câmpuri), nu a ultimei (A2, scrisă altfel)
  assert.deepEqual(Object.keys(r[0]!.def), ['tip', 'placi', 'celule']);
  assert.deepEqual(copie(Lc.pieseConstructie([])), []);
  assert.deepEqual(copie(Lc.pieseConstructie([B])), [{ def: B, bucati: 1 }]);
});

test('timpPrint: volumul de PLA (1,24 g/cm³) la debitul mediu, în secunde', () => {
  // 12,4 g = 10 000 mm³; la 5 mm³/s, 2 000 s; la 8 mm³/s, 1 250 s
  assert.ok(Math.abs(Lc.timpPrint(12.4, 5)! - 2000) < 1e-9);
  assert.ok(Math.abs(Lc.timpPrint(12.4, 8)! - 1250) < 1e-9);
  // 1 g = 806,45… mm³; la 1 mm³/s, 806,45… s
  assert.ok(Math.abs(Lc.timpPrint(1, 1)! - 1000 / 1.24) < 1e-9);
  assert.equal(Lc.timpPrint(0, 5), 0);
});

test('timpPrint: fără debit bun sau cu grame nebune nu spune niciun timp', () => {
  for (const [g, d] of [[10, 0], [10, -3], [10, NaN], [10, Infinity], [-1, 5], [NaN, 5], [Infinity, 5]] as [number, number][])
    assert.equal(Lc.timpPrint(g, d), null, `${g} g la ${d} mm³/s`);
});

test('curataNume: fără spațiile de la margini și cele duble; cel mult 60 de caractere; ce nu e text dă gol', () => {
  assert.equal(Lc.curataNume('  Șasiu   cu\tpatru\n roți  '), 'Șasiu cu patru roți');
  assert.equal(Lc.curataNume('x'.repeat(70)), 'x'.repeat(60));
  // tăiat la 60, fără spațiul rămas la capăt
  assert.equal(Lc.curataNume('a'.repeat(59) + ' bcd'), 'a'.repeat(59));
  assert.equal(Lc.curataNume('abc', 2), 'ab');
  assert.equal(Lc.curataNume('   '), '');
  assert.equal(Lc.curataNume(undefined), '');
  assert.equal(Lc.curataNume(42), '');
});

test('numeLiber: numele dorit, dacă e liber; altfel „nume 2”, „nume 3”…, comparat fără majuscule și spații de margine', () => {
  assert.equal(Lc.numeLiber([], 'Construcția 1'), 'Construcția 1');
  assert.equal(Lc.numeLiber(['Șasiu'], 'Macara'), 'Macara');
  assert.equal(Lc.numeLiber(['Șasiu'], 'Șasiu'), 'Șasiu 2');
  assert.equal(Lc.numeLiber(['Șasiu', 'Șasiu 2', 'Șasiu 4'], 'Șasiu'), 'Șasiu 3');
  assert.equal(Lc.numeLiber(['șasiu'], 'Șasiu'), 'Șasiu 2');
  assert.equal(Lc.numeLiber([' Șasiu '], 'Șasiu'), 'Șasiu 2');
  // numele dorit e curățat întâi
  assert.equal(Lc.numeLiber([], '  Barca   mea '), 'Barca mea');
  // un nume liber nu trece de 60 de caractere, nici cu numărul pus la capăt
  const lung = 'y'.repeat(60), r = Lc.numeLiber([lung], lung);
  assert.equal(r.length, 60);
  assert.ok(r.endsWith(' 2') && r !== lung);
});

test('numeLiber: un nume dorit care se termină deja cu un număr, luat, merge mai departe de la numărul lui', () => {
  // copia lui „Macara 2” e „Macara 3”, nu „Macara 2 2”
  assert.equal(Lc.numeLiber(['Macara', 'Macara 2'], 'Macara 2'), 'Macara 3');
  assert.equal(Lc.numeLiber(['Macara 2'], 'Macara 2'), 'Macara 3');
  assert.equal(Lc.numeLiber(['Rama 10', 'Rama 11'], 'Rama 10'), 'Rama 12');
  // liber, rămâne cum e
  assert.equal(Lc.numeLiber(['Macara'], 'Macara 7'), 'Macara 7');
  // un număr lipit de cuvânt nu e un număr pus la capăt
  assert.equal(Lc.numeLiber(['V8'], 'V8'), 'V8 2');
  // doar numărul: „2” luat dă „3”
  assert.equal(Lc.numeLiber(['2'], '2'), '3');
});

test('nrLiber: cel mai mic număr întreg pozitiv pe care nu-l are nicio construcție', () => {
  const Ln = L as unknown as { nrLiber(folosite: readonly number[]): number };
  assert.equal(Ln.nrLiber([]), 1);
  assert.equal(Ln.nrLiber([1, 2, 3]), 4);
  assert.equal(Ln.nrLiber([2, 3]), 1);
  assert.equal(Ln.nrLiber([1, 3, 4]), 2);
  assert.equal(Ln.nrLiber([3, 1, 1]), 2);
});

test('durataPrint: timpul rotunjit la minut, „≈ 12 min”, „≈ 1 h 5 min”, „≈ 2 h”; sub un minut, „< 1 min”; fără timp, „—”', () => {
  const Ld = L as unknown as { durataPrint(s: number | null): string };
  assert.equal(Ld.durataPrint(0), '< 1 min');
  assert.equal(Ld.durataPrint(59.9), '< 1 min');
  // de la un minut în sus, rotunjit la minut: 60 s, 89 s → 1 min; 90 s → 2 min
  assert.equal(Ld.durataPrint(60), '≈ 1 min');
  assert.equal(Ld.durataPrint(89), '≈ 1 min');
  assert.equal(Ld.durataPrint(90), '≈ 2 min');
  assert.equal(Ld.durataPrint(59 * 60 + 29), '≈ 59 min');
  // 59 min 30 s se rotunjește la o oră fixă
  assert.equal(Ld.durataPrint(59 * 60 + 30), '≈ 1 h');
  assert.equal(Ld.durataPrint(65 * 60), '≈ 1 h 5 min');
  assert.equal(Ld.durataPrint(120 * 60), '≈ 2 h');
  assert.equal(Ld.durataPrint(26 * 3600 + 40 * 60), '≈ 26 h 40 min');
  assert.equal(Ld.durataPrint(null), '—');
  assert.equal(Ld.durataPrint(NaN), '—');
  assert.equal(Ld.durataPrint(-5), '—');
});
