import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frezaDinDate, type FrezaSalvata } from '../../src/model/freza.ts';
import {
  cuDinCont, cuFrezeleBrowserului, cuListaCompleta, cuRezultate, deAdusDinBrowser, deTrimis, imbina, jsonCanonic, rezolva, sincronDate,
  sincronDin, SINCRON_GOL,
  type BibliotecaCont, type StareSincron,
} from '../../src/model/frezeSincron.ts';

/**
 * Sincronizarea bibliotecii de freze cu contul (ADR 0300 §7, felia 16.A↑c), pură: îmbinarea pe câmpuri față de ultima
 * versiune comună (doar un câmp schimbat pe ambele părți întreabă; ștearsă pe o parte și schimbată pe cealaltă, la fel), ce
 * vine din cont, ce pleacă (scrierile și ștergerile, cu versiunea văzută), răspunsurile serverului, lista întreagă și
 * alegerea omului într-un conflict. Fiecare caz, pe hârtie.
 */

const f = (id: string, alte: Partial<FrezaSalvata> & Record<string, unknown> = {}): FrezaSalvata => ({
  id, rev: 1, schimbatLa: 1000, nume: `Freza ${id}`, fel: 'plata', diametru: 6, numar: 1, turatie: 18000, avans: 1000,
  plonjare: 300, pas: 3, pasLateral: 40, ...alte,
} as FrezaSalvata);
const j = (x: FrezaSalvata): string => jsonCanonic(x);
const bib = (freze: FrezaSalvata[], s: Partial<StareSincron> = {}, brute: unknown[] = []): BibliotecaCont =>
  ({ freze, brute, sincron: { ...SINCRON_GOL, ...s } });
const baze = (...l: [string, number, string | null][]): StareSincron['baze'] => new Map(l.map(([id, versiune, json]) => [id, { versiune, json }]));
let n = 0;
const idNou = (): string => `nou${++n}`;

test('JSON-ul canonic nu ține de ordinea cheilor, nici în obiectele din interior', () => {
  assert.equal(jsonCanonic({ b: 1, a: { d: 2, c: [1, { f: 1, e: 2 }] } }), '{"a":{"c":[1,{"e":2,"f":1}],"d":2},"b":1}');
  assert.equal(jsonCanonic(f('a', { nume: 'x' })), jsonCanonic({ ...f('a'), nume: 'x' }));
});

test('îmbinarea pe câmpuri: o parte schimbată se ia; câmpuri diferite se adună; același câmp, aceeași valoare, trece', () => {
  const b = f('a');
  const mea = f('a', { rev: 2, schimbatLa: 2000, nume: 'Mea' });
  const cont = f('a', { rev: 2, schimbatLa: 3000, turatie: 20000 });
  assert.deepEqual(imbina(b, mea, b), { ok: true, rezultat: mea });
  assert.deepEqual(imbina(b, b, cont), { ok: true, rezultat: cont });
  // Ambele, pe câmpuri diferite: numele meu, turația din cont; versiunea peste amândouă, data cea mai nouă.
  assert.deepEqual(imbina(b, mea, cont), { ok: true, rezultat: f('a', { rev: 3, schimbatLa: 3000, nume: 'Mea', turatie: 20000 }) });
  // Aceeași schimbare pe ambele părți: cea din cont, fără o versiune nouă.
  assert.deepEqual(imbina(b, f('a', { rev: 2, avans: 800 }), f('a', { rev: 5, avans: 800 })), { ok: true, rezultat: f('a', { rev: 5, avans: 800 }) });
  // Un câmp scos pe o parte (nota) și neatins pe cealaltă: scos.
  const cuNota = f('a', { nota: 'x' });
  assert.deepEqual(imbina(cuNota, f('a', { rev: 2 }), f('a', { rev: 2, nota: 'x', numar: 7 })), { ok: true, rezultat: f('a', { rev: 3, numar: 7 }) });
});

test('îmbinarea pe câmpuri: același câmp, valori diferite, e conflict (cu numele câmpurilor); ștearsă și schimbată, la fel', () => {
  const b = f('a');
  assert.deepEqual(imbina(b, f('a', { rev: 2, turatie: 16000, nume: 'M' }), f('a', { rev: 2, turatie: 20000, nume: 'M' })), { ok: false, campuri: ['turatie'] });
  assert.deepEqual(imbina(b, null, f('a', { rev: 2, turatie: 20000 })), { ok: false, campuri: ['*'] });
  assert.deepEqual(imbina(b, f('a', { rev: 2, turatie: 20000 }), null), { ok: false, campuri: ['*'] });
  // Ștearsă pe ambele părți: ștearsă. Ștearsă pe o parte, neatinsă pe cealaltă: ștearsă.
  assert.deepEqual(imbina(b, null, null), { ok: true, rezultat: null });
  assert.deepEqual(imbina(b, null, b), { ok: true, rezultat: null });
  assert.deepEqual(imbina(b, b, null), { ok: true, rezultat: null });
  // Fără bază (același id, făcut pe ambele părți): ce diferă e conflict.
  assert.deepEqual(imbina(null, f('a', { nume: 'X' }), f('a', { nume: 'Y' })), { ok: false, campuri: ['nume'] });
  assert.deepEqual(imbina(null, f('a'), f('a')), { ok: true, rezultat: f('a') });
  // Îmbinarea care n-ar fi o freză bună (vârful frezei de gravare peste diametrul micșorat): conflict pe câmpurile diferite.
  const v = f('v', { fel: 'gravare', unghi: 30, varf: 0.2, diametru: 6 });
  assert.notEqual(frezaDinDate(v), null);
  const r = imbina(v, { ...v, rev: 2, diametru: 3 }, { ...v, rev: 2, varf: 4 });
  assert.deepEqual(r, { ok: false, campuri: ['diametru', 'varf'] });
});

test('din cont: una nouă intră; una neschimbată aici se ia din cont; una ștearsă în cont pleacă; aceeași versiune se sare', () => {
  const a = f('a'), b = f('b'), c = f('c');
  const pornire = bib([a, b], { dupa: 2, baze: baze(['a', 1, j(a)], ['b', 2, j(b)]) });
  const a2 = f('a', { rev: 2, turatie: 20000 });
  const r = cuDinCont(pornire, [
    { id: 'a', versiune: 3, json: j(a2) }, { id: 'b', versiune: 4, json: null }, { id: 'c', versiune: 5, json: j(c) },
    { id: 'a', versiune: 3, json: j(a2) },
  ]);
  assert.deepEqual(r.freze, [a2, c]);
  assert.deepEqual([...r.sincron.baze], [['a', { versiune: 3, json: j(a2) }], ['b', { versiune: 4, json: null }], ['c', { versiune: 5, json: j(c) }]]);
  assert.deepEqual(deTrimis(r), { scrise: [], sterse: [], mari: [] });
});

test('din cont: schimbată pe ambele părți, pe câmpuri diferite, se îmbină și pleacă înapoi cu versiunea din cont', () => {
  const a = f('a');
  const mea = f('a', { rev: 2, schimbatLa: 2000, nume: 'Mea' });
  const cont = f('a', { rev: 2, schimbatLa: 3000, turatie: 20000 });
  const r = cuDinCont(bib([mea], { baze: baze(['a', 1, j(a)]) }), [{ id: 'a', versiune: 7, json: j(cont) }]);
  const imbinata = f('a', { rev: 3, schimbatLa: 3000, nume: 'Mea', turatie: 20000 });
  assert.deepEqual(r.freze, [imbinata]);
  assert.deepEqual(r.sincron.baze.get('a'), { versiune: 7, json: j(cont) });
  assert.deepEqual(deTrimis(r).scrise, [{ id: 'a', vazuta: 7, json: j(imbinata) }]);
});

test('din cont: același câmp schimbat pe ambele părți e conflict: freza mea rămâne, ce e în cont se ține, nimic nu pleacă', () => {
  const a = f('a');
  const mea = f('a', { rev: 2, turatie: 16000 });
  const cont = f('a', { rev: 2, turatie: 20000 });
  const r = cuDinCont(bib([mea], { baze: baze(['a', 1, j(a)]) }), [{ id: 'a', versiune: 7, json: j(cont) }]);
  assert.deepEqual(r.freze, [mea]);
  assert.deepEqual(r.sincron.baze.get('a'), { versiune: 1, json: j(a) });
  assert.deepEqual([...r.sincron.conflicte], [['a', { versiune: 7, json: j(cont), campuri: ['turatie'] }]]);
  assert.deepEqual(deTrimis(r), { scrise: [], sterse: [], mari: [] });
  // Ștearsă aici, schimbată în cont: tot conflict.
  const s = cuDinCont(bib([], { baze: baze(['a', 1, j(a)]) }), [{ id: 'a', versiune: 7, json: j(cont) }]);
  assert.deepEqual(s.sincron.conflicte.get('a')?.campuri, ['*']);
  assert.deepEqual(deTrimis(s), { scrise: [], sterse: [], mari: [] });
});

test('din cont: o freză pe care versiunea de azi n-o citește se ține neatinsă, cu numele ei luat', () => {
  const noua = { id: 'x', rev: 1, schimbatLa: 1, nume: 'Bilă Ø6', fel: 'bila', diametru: 6 };
  const r = cuDinCont(bib([]), [{ id: 'x', versiune: 1, json: JSON.stringify(noua) }]);
  assert.deepEqual(r.freze, []);
  assert.deepEqual(r.brute, [noua]);
  assert.deepEqual(deTrimis(r), { scrise: [], sterse: [], mari: [] });
  const r2 = cuDinCont(r, [{ id: 'x', versiune: 2, json: JSON.stringify({ ...noua, nume: 'Bilă' }) }]);
  assert.deepEqual(r2.brute, [{ ...noua, nume: 'Bilă' }]);
  assert.deepEqual(cuDinCont(r2, [{ id: 'x', versiune: 3, json: null }]).brute, []);
});

test('din cont: numele luat de o freză nouă de aici, netrimisă încă: a mea primește un nume liber', () => {
  const mea = f('m', { nume: 'Plată Ø6' });
  const cont = f('c', { nume: 'plată  ø6' });
  const r = cuDinCont(bib([mea]), [{ id: 'c', versiune: 1, json: j(cont) }]);
  assert.deepEqual(r.freze.map((x) => [x.id, x.nume]), [['m', 'Plată Ø6 (2)'], ['c', 'plată  ø6']]);
  // Două freze din cont cu același nume (redenumite pe două calculatoare): cea venită primește un nume liber, aici, și pleacă.
  const a = f('a', { nume: 'A' }), b = f('b', { nume: 'B' });
  const p = bib([a, b], { baze: baze(['a', 1, j(a)], ['b', 2, j(b)]) });
  const r2 = cuDinCont(p, [{ id: 'b', versiune: 3, json: j(f('b', { rev: 2, nume: 'A' })) }]);
  assert.deepEqual(r2.freze.map((x) => x.nume), ['A', 'A (2)']);
  assert.deepEqual(deTrimis(r2).scrise.map((x) => [x.id, x.vazuta]), [['b', 3]]);
});

test('ce pleacă: cele noi cu versiunea 0, cele schimbate cu versiunea văzută, ștergerile; nu cele în conflict sau peste plafon', () => {
  const a = f('a'), b = f('b'), c = f('c'), d = f('d'), mare = f('m', { nota2: 'x'.repeat(9000) });
  const b2 = f('b', { rev: 2, nume: 'B2' });
  const s = bib([a, b2, c, mare], {
    baze: baze(['a', 1, j(a)], ['b', 2, j(b)], ['d', 4, j(d)], ['e', 5, null], ['c', 6, j(f('c', { nume: 'vechi' }))]),
    conflicte: new Map([['c', { versiune: 8, json: null, campuri: ['*'] }]]),
  });
  assert.deepEqual(deTrimis(s), {
    scrise: [{ id: 'b', vazuta: 2, json: j(b2) }],
    sterse: [{ id: 'd', vazuta: 4 }],
    mari: ['m'],
  });
});

test('răspunsurile: scrisă primește baza nouă; conflictul se îmbină ca o venire din cont; contul plin se ține minte', () => {
  const a = f('a'), b = f('b'), c = f('c'), d = f('d');
  const a2 = f('a', { rev: 2, nume: 'A2' });
  const s = bib([a2, b, c], { baze: baze(['a', 1, j(a)], ['d', 3, j(d)]) });
  const t = deTrimis(s);
  assert.deepEqual(t.scrise.map((x) => x.id), ['a', 'b', 'c']);
  const contB = f('b', { turatie: 20000 });
  const r = cuRezultate(s, t, [
    { id: 'a', stare: 'scrisa', versiune: 9 },
    { id: 'b', stare: 'conflict', versiune: 4, json: j(contB) },
    { id: 'c', stare: 'plina' },
    { id: 'd', stare: 'scrisa', versiune: 10 },
  ]);
  assert.deepEqual(r.sincron.baze.get('a'), { versiune: 9, json: j(a2) });
  assert.deepEqual(r.sincron.baze.get('d'), { versiune: 10, json: null });
  // b: fără bază, aceeași freză cu altă turație în cont: conflict pe turație.
  assert.deepEqual(r.sincron.conflicte.get('b'), { versiune: 4, json: j(contB), campuri: ['turatie'] });
  assert.deepEqual(r.sincron.plina, ['c']);
  // Ștergerea unei freze pe care contul n-a avut-o: baza pleacă.
  const z = cuRezultate(bib([], { baze: baze(['z', 2, j(f('z'))]) }), { scrise: [], sterse: [{ id: 'z', vazuta: 2 }], mari: [] }, [{ id: 'z', stare: 'scrisa', versiune: 0 }]);
  assert.equal(z.sincron.baze.has('z'), false);
  // O scriere reușită scoate freza din lista celor care n-au încăput.
  assert.deepEqual(cuRezultate(r, { scrise: [{ id: 'c', vazuta: 0, json: j(c) }], sterse: [], mari: [] }, [{ id: 'c', stare: 'scrisa', versiune: 11 }]).sincron.plina, []);
});

test('lista întreagă: o freză știută din cont care lipsește a fost ștearsă acolo; schimbată aici, e conflict', () => {
  const a = f('a'), b = f('b'), c = f('c');
  const b2 = f('b', { rev: 2, nume: 'B2' });
  const s = bib([a, b2, c], { baze: baze(['a', 1, j(a)], ['b', 2, j(b)], ['c', 3, j(c)], ['x', 4, null]) });
  const r = cuListaCompleta(s, new Set(['c']));
  assert.deepEqual(r.freze, [b2, c]);
  assert.equal(r.sincron.baze.has('a'), false);
  assert.equal(r.sincron.baze.has('x'), false);
  assert.deepEqual(r.sincron.conflicte.get('b'), { versiune: 0, json: null, campuri: ['*'] });
});

test('conflictul, la alegerea omului: a mea pleacă peste cea din cont; cea din cont o înlocuiește; amândouă păstrează o copie', () => {
  const a = f('a', { nume: 'A' });
  const mea = f('a', { rev: 2, nume: 'A', turatie: 16000 });
  const cont = f('a', { rev: 2, nume: 'A', turatie: 20000 });
  const s = cuDinCont(bib([mea], { baze: baze(['a', 1, j(a)]) }), [{ id: 'a', versiune: 7, json: j(cont) }]);
  const m = rezolva(s, 'a', 'mea', idNou, 5000);
  assert.deepEqual(m.freze, [mea]);
  assert.equal(m.sincron.conflicte.size, 0);
  assert.deepEqual(deTrimis(m).scrise, [{ id: 'a', vazuta: 7, json: j(mea) }]);
  const c = rezolva(s, 'a', 'cont', idNou, 5000);
  assert.deepEqual(c.freze, [cont]);
  assert.deepEqual(deTrimis(c), { scrise: [], sterse: [], mari: [] });
  const am = rezolva(s, 'a', 'amandoua', () => 'copie', 5000);
  assert.deepEqual(am.freze, [cont, { ...mea, id: 'copie', rev: 1, schimbatLa: 5000, nume: 'A (2)' }]);
  assert.deepEqual(deTrimis(am).scrise.map((x) => [x.id, x.vazuta]), [['copie', 0]]);
  // Ștearsă aici, schimbată în cont: „a mea” o șterge și din cont; „amândouă” o ia pe cea din cont.
  const st = cuDinCont(bib([], { baze: baze(['a', 1, j(a)]) }), [{ id: 'a', versiune: 7, json: j(cont) }]);
  assert.deepEqual(deTrimis(rezolva(st, 'a', 'mea', idNou, 5000)).sterse, [{ id: 'a', vazuta: 7 }]);
  assert.deepEqual(rezolva(st, 'a', 'amandoua', idNou, 5000).freze, [cont]);
  // Una fără conflict: neschimbată.
  assert.equal(rezolva(st, 'zz', 'mea', idNou, 5000), st);
});

test('starea sincronizării, ținută: dus-întors; o valoare stricată, cheile periculoase și versiunile greșite se aruncă', () => {
  const s: StareSincron = {
    dupa: 12, baze: baze(['a', 1, '{"id":"a"}'], ['b', 2, null]),
    conflicte: new Map([['a', { versiune: 3, json: null, campuri: ['*'] }]]), plina: ['c'],
  };
  assert.deepEqual(sincronDin(JSON.parse(JSON.stringify(sincronDate(s)))), s);
  assert.deepEqual(sincronDin(undefined), SINCRON_GOL);
  assert.deepEqual(sincronDin({ dupa: -1, baze: 'x' }), SINCRON_GOL);
  const rau = sincronDin({ dupa: 3, baze: [{ id: '__proto__', versiune: 1, json: null }, { id: 'ok', versiune: 1.5, json: null }, { id: 'b', versiune: 2, json: 7 }], conflicte: [{ id: 'c' }], plina: ['__proto__', 'd'] });
  assert.deepEqual(rau, { dupa: 3, baze: new Map(), conflicte: new Map(), plina: ['d'] });
});

test('prima logare: frezele din acest browser pe care contul nu le știe intră, cu id-ul lor și un nume liber, până la plafon', () => {
  const a = f('a', { nume: 'Plată Ø6' }), b = f('b', { nume: 'B' }), c = f('c', { nume: 'C' }), d = f('d', { nume: 'D' });
  // Contul știe a (în listă) și d (doar în baze: ștearsă acolo); b și c sunt noi.
  const cont = bib([f('x', { nume: 'plată ø6' }), a], { baze: baze(['d', 4, null]) });
  assert.deepEqual(deAdusDinBrowser(cont, [a, b, c, d]).map((x) => x.id), ['b', 'c']);
  const r = cuFrezeleBrowserului(cont, [a, { ...b, nume: 'Plată Ø6' }, c, d], 3);
  assert.deepEqual(r.b.freze.map((x) => [x.id, x.nume]), [['x', 'plată ø6'], ['a', 'Plată Ø6'], ['b', 'Plată Ø6 (2)']]);
  assert.deepEqual([r.adaugate, r.sarite], [1, 1]);
  assert.deepEqual(deTrimis(r.b).scrise.map((x) => [x.id, x.vazuta]), [['x', 0], ['a', 0], ['b', 0]]);
  // A doua oară, nimic de adus.
  assert.deepEqual(deAdusDinBrowser(cuFrezeleBrowserului(cont, [b, c], 500).b, [b, c]), []);
});
