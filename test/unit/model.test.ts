import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, PLAFON, VERSIUNE_SCHEMA, type Document, type Instanta, type Nod, type Piesa } from '../../src/model/document.ts';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou, PLAFON_ISTORIC, reface, type Comanda } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { docDin, ID, lume } from './ajutor-document.ts';

const FOAIA = { latime: 140, inaltime: 100, grosime: 18 };
const dreptunghi = (id: string) => ({ id, forma: { tip: 'dreptunghi' as const, latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } });
const cerc = (id: string) => ({ id, forma: { tip: 'cerc' as const, raza: 15 }, matrice: { ...ID, e: 70, f: 50 } });
const piesa = (id: string): Piesa => ({ id, radacina: { tip: 'element', id, forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID } }, operatii: [] });
const instanta = (id: string, p = id, x = 0, y = 0): Instanta => ({ id, piesa: p, x, y, rotire: 0 });

/** Documentul brut, cu o schimbare făcută pe o copie: pentru documente pe care schema trebuie să le refuze. */
function stricat(d: Document, f: (x: any) => void): unknown {
  const x = structuredClone(d);
  f(x);
  return x;
}

test('un document valid trece prin ușa unică, neschimbat', () => {
  const d = docDin(FOAIA, dreptunghi('e1'), cerc('e2'));
  const r = incarca(JSON.parse(JSON.stringify(d)));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (r.ok) assert.deepEqual(r.doc, d);
  assert.equal(VERSIUNE_SCHEMA, 6);
});

test('ușa refuză, cu motiv: ce nu e obiect, fără versiune, dintr-o versiune mai nouă, cu valori absurde', () => {
  const d = docDin(FOAIA, cerc('e1'));
  assert.equal(incarca(null).ok, false);
  assert.equal(incarca([]).ok, false);
  assert.equal(incarca({ ...d, schema: undefined }).ok, false);
  const nou = incarca({ ...d, schema: VERSIUNE_SCHEMA + 1 });
  assert.match(nou.ok ? '' : nou.motiv, /versiune mai nouă/);
  const negativ = incarca(stricat(d, (x) => { x.piese[0].radacina.forma.raza = -5; }));
  assert.match(negativ.ok ? '' : negativ.motiv, /piese\.0\.radacina\.forma\.raza/);
  assert.equal(incarca(stricat(d, (x) => { x.foi[0].instante[0].x = Number.NaN; })).ok, false, 'NaN');
  assert.equal(incarca(stricat(d, (x) => { x.foi[0].instante[0].rotire = 360; })).ok, false, 'rotirea 360');
  assert.equal(incarca(stricat(d, (x) => { x.foi = []; })).ok, false, 'fără foi');
  assert.equal(incarca(stricat(d, (x) => { x.piese.push(x.piese[0]); })).ok, false, 'două piese cu același id');
  assert.equal(incarca(stricat(d, (x) => { x.foi[0].instante[0].piesa = 'lipsa'; })).ok, false, 'instanța spre o piesă lipsă');
  assert.equal(incarca(stricat(d, (x) => { x.foi.push({ ...x.foi[0], id: 'f2' }); })).ok, false, 'aceeași instanță pe două foi');
  assert.equal(incarca(stricat(d, (x) => { x.piese[0].id = 'x y'; x.foi[0].instante[0].piesa = 'x y'; })).ok, false, 'id cu spațiu');
});

test('arborele: id-uri de noduri unice în piesă (nu în document), adâncimea de cel mult 32, fără să umple stiva', () => {
  const grup = (id: string, copii: Nod[]): Nod => ({ tip: 'grup', id, matrice: { ...ID }, copii });
  const el = (id: string): Nod => ({ tip: 'element', id, forma: { tip: 'cerc', raza: 5 }, matrice: { ...ID } });
  const cu = (radacini: Nod[]): Document => ({
    ...documentNou(FOAIA),
    piese: radacini.map((radacina, i) => ({ id: `p${i}`, radacina, operatii: [] })),
    foi: [{ id: 'f1', stoc: FOAIA, instante: radacini.map((_, i) => instanta(`i${i}`, `p${i}`)) }],
  });
  assert.ok(incarca(cu([grup('g', [el('a'), grup('h', [el('b')])]), el('a')])).ok, 'același id de nod în două piese e voie');
  assert.equal(incarca(cu([grup('g', [el('a'), grup('h', [el('a')])])])).ok, false, 'același id în aceeași piesă');
  const adanc = (n: number): Nod => {
    let nod = el('frunza');
    for (let i = 1; i < n; i++) nod = grup(`g${i}`, [nod]);
    return nod;
  };
  assert.ok(incarca(cu([adanc(PLAFON.adancime)])).ok, '32 de niveluri');
  const r = incarca(cu([adanc(PLAFON.adancime + 1)]));
  assert.match(r.ok ? '' : r.motiv, /32 de niveluri/);
  // 200 000 de niveluri: parserul recursiv ar fi umplut stiva; ușa le refuză înainte.
  const foarteAdanc = incarca(cu([adanc(200_000)]));
  assert.equal(foarteAdanc.ok, false);
});

test('elementele în lume: instanța ∘ grupurile ∘ elementul, în preordine, cu rotirea exactă la 90°', () => {
  const d: Document = {
    ...documentNou(FOAIA),
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...ID, e: 10, f: 0 }, copii: [
          { tip: 'element', id: 'a', forma: { tip: 'cerc', raza: 1 }, matrice: { ...ID, e: 5, f: 0 } },
          { tip: 'element', id: 'b', forma: { tip: 'cerc', raza: 2 }, matrice: { ...ID } },
        ],
      },
      operatii: [],
    }],
    foi: [{ id: 'f1', stoc: FOAIA, instante: [{ id: 'i', piesa: 'p', x: 100, y: 50, rotire: 90 }] }],
  };
  const [a, b] = elementeFoaie(d);
  // a: local (0, 0) → +5 → +10 → (15, 0) → rotit 90° → (0, 15) → +(100, 50) → (100, 65).
  assert.equal(a?.idLume, 'i/a');
  assert.deepEqual([a?.matrice.e, a?.matrice.f], [100, 65]);
  assert.deepEqual([a?.matrice.a, a?.matrice.b, a?.matrice.c, a?.matrice.d], [0, 1, -1, 0]);
  assert.equal(b?.idLume, 'i/b');
  assert.deepEqual([b?.matrice.e, b?.matrice.f], [100, 60]);
});

test('migrarea v1 → v2 → v3: o piesă și o instanță pe element, cu id-ul lui; geometria în lume, aceeași; câmpurile necunoscute rămân', () => {
  const v1 = {
    schema: 1, rev: 7, extra: 'sus',
    foaie: { ...FOAIA, fibra: 'x' },
    elemente: [
      { id: 'e1', nume: 'ușița', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 2 }, matrice: { a: 0, b: 1, c: -1, d: 0, e: 20, f: -0 }, strat: 3 },
      { id: 'e2', forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 }, matrice: { a: 2, b: 0, c: 0, d: 0.5, e: 70, f: 50 } },
    ],
  };
  const r = incarca(structuredClone(v1));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const d = r.doc;
  assert.equal(d.schema, 6);
  assert.equal(d.rev, 7);
  assert.equal(d['extra'], 'sus');
  assert.deepEqual(d.foi, [{ id: 'f1', stoc: { ...FOAIA, fibra: 'x' }, instante: [
    { id: 'e1', piesa: 'e1', x: 20, y: -0, rotire: 0 }, { id: 'e2', piesa: 'e2', x: 70, y: 50, rotire: 0 },
  ] }]);
  assert.deepEqual(d.piese[0], {
    id: 'e1', nume: 'ușița',
    radacina: { tip: 'element', id: 'e1', forma: v1.elemente[0]?.forma, matrice: { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 }, strat: 3 },
    operatii: [{ id: 'e1', tip: 'profil', noduri: ['e1'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null }],
  });
  assert.equal('nume' in (d.piese[1] ?? {}), false, 'fără nume, piesa n-are câmpul');
  const lumi = elementeFoaie(d);
  assert.deepEqual(lumi.map((e) => e.idLume), [lume('e1'), lume('e2')]);
  for (const [i, e] of lumi.entries()) {
    const m = v1.elemente[i]?.matrice;
    assert.ok(m);
    for (const k of ['a', 'b', 'c', 'd', 'e', 'f'] as const) assert.ok(e.matrice[k] === m?.[k], `${e.idLume}.${k}: ${e.matrice[k]} față de ${m?.[k]}`);
  }
  // Migrarea e deterministă și idempotentă la ușă.
  const r2 = incarca(structuredClone(v1));
  assert.ok(r2.ok);
  if (r2.ok) assert.equal(jsonCanonic(r2.doc), jsonCanonic(d));
  const r3 = incarca(JSON.parse(JSON.stringify(d)));
  assert.ok(r3.ok);
  if (r3.ok) assert.equal(jsonCanonic(r3.doc), jsonCanonic(d));
});

test('un document v1 stricat e refuzat de schema v1, înainte de migrare', () => {
  const r = incarca({ schema: 1, rev: 0, foaie: FOAIA, elemente: [cerc('e1'), cerc('e1')] });
  assert.match(r.ok ? '' : r.motiv, /documentul v1 nu respectă schema/);
  assert.equal(incarca({ schema: 1, rev: 0, foaie: FOAIA, elemente: 'nu' }).ok, false);
});

test('JSON-ul canonic nu depinde de ordinea cheilor și refuză numerele nefinite', () => {
  assert.equal(jsonCanonic({ b: 1, a: [2, { d: 3, c: 4 }] }), jsonCanonic({ a: [2, { c: 4, d: 3 }], b: 1 }));
  assert.equal(jsonCanonic({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.throws(() => jsonCanonic({ x: Number.POSITIVE_INFINITY }));
});

const adauga = (id: string, pozitie: number, pozPiesa: number): Comanda =>
  ({ tip: 'adauga', foaie: 'f1', instanta: instanta(id), pozitie, piesa: { piesa: piesa(id), pozitie: pozPiesa } });

test('jurnalul: adaugă, anulează, reface, iar o comandă nouă golește refacerile', () => {
  let h = istoricNou(documentNou(FOAIA));
  h = executa(h, adauga('e1', 0, 0));
  h = executa(h, adauga('e2', 1, 1));
  const ids = (): string[] => (h.doc.foi[0]?.instante ?? []).map((i) => i.id);
  assert.deepEqual(ids(), ['e1', 'e2']);
  h = anuleaza(h);
  assert.deepEqual(ids(), ['e1']);
  assert.deepEqual(h.doc.piese.map((p) => p.id), ['e1'], 'anularea scoate și piesa nouă');
  h = reface(h);
  assert.deepEqual(ids(), ['e1', 'e2']);
  h = anuleaza(h);
  h = executa(h, { tip: 'sterge', foaie: 'f1', instanta: instanta('e1'), pozitie: 0, piesa: { piesa: piesa('e1'), pozitie: 0 } });
  assert.equal(h.viitor.length, 0);
  assert.deepEqual(h.doc.foi[0]?.instante, []);
  assert.deepEqual(h.doc.piese, []);
});

test('jurnalul: o înlocuire anulată revine exact la valorile vechi; un lot se anulează într-un pas', () => {
  const d = docDin(FOAIA, cerc('e1'), cerc('e2'));
  const [v1, v2] = d.foi[0]?.instante ?? [];
  assert.ok(v1 && v2);
  const c: Comanda = {
    tip: 'lot', comenzi: [
      { tip: 'inlocuieste-instanta', foaie: 'f1', vechi: v1, nou: { ...v1, x: 99 } },
      { tip: 'inlocuieste-instanta', foaie: 'f1', vechi: v2, nou: { ...v2, rotire: 90 } },
    ],
  };
  const h = executa(istoricNou(d), c);
  assert.deepEqual(h.doc.foi[0]?.instante.map((i) => [i.x, i.rotire]), [[99, 0], [70, 90]]);
  assert.equal(h.doc.rev, d.rev + 1, 'un lot e o singură revizie');
  const inapoi = anuleaza(h);
  assert.deepEqual(inapoi.doc.foi, d.foi);
  const p = d.piese[0];
  assert.ok(p);
  const nou = { ...p, nume: 'redenumită' };
  const hp = executa(istoricNou(d), { tip: 'inlocuieste-piesa', vechi: p, nou });
  assert.equal(hp.doc.piese[0]?.nume, 'redenumită');
  assert.deepEqual(anuleaza(hp).doc.piese, d.piese);
});

test(`jurnalul ține cel mult ${PLAFON_ISTORIC} de comenzi, iar comenzile imposibile aruncă`, () => {
  let h = istoricNou(documentNou(FOAIA));
  for (let i = 0; i < PLAFON_ISTORIC + 20; i++) h = executa(h, adauga(`e${i}`, i, i));
  assert.equal(h.trecut.length, PLAFON_ISTORIC);
  assert.throws(() => executa(h, adauga('e0', 0, 0)), /există deja/);
  assert.throws(() => executa(h, { tip: 'sterge', foaie: 'f1', instanta: instanta('nu-exista'), pozitie: 0 }), /nu există/);
  assert.throws(() => executa(h, { tip: 'adauga', foaie: 'f1', instanta: instanta('x', 'lipsa'), pozitie: 0 }), /piesa lipsă/);
  assert.throws(() => executa(h, { tip: 'adauga', foaie: 'f9', instanta: instanta('x', 'e0'), pozitie: 0 }), /foaia f9/);
  // O piesă care mai are instanțe nu se șterge odată cu una dintre ele.
  const d = executa(h, { tip: 'adauga', foaie: 'f1', instanta: instanta('copie', 'e0'), pozitie: 0 }).doc;
  assert.throws(() => executa(istoricNou(d), { tip: 'sterge', foaie: 'f1', instanta: instanta('copie', 'e0'), pozitie: 0, piesa: { piesa: piesa('e0'), pozitie: 0 } }), /mai are instanțe/);
});

test('lumea e mărginită: scara și translația compuse în piesă, instanța, elementele în lume (ADR 0024, precizarea 5)', () => {
  const grup = (id: string, scara: number, copii: Nod[]): Nod => ({ tip: 'grup', id, matrice: { ...ID, a: scara, d: scara }, copii });
  const el: Nod = { tip: 'element', id: 'el', forma: { tip: 'cerc', raza: 1 }, matrice: { ...ID } };
  const cu = (radacina: Nod, x = 0): Document => ({
    ...documentNou(FOAIA), piese: [{ id: 'p', radacina, operatii: [] }], foi: [{ id: 'f1', stoc: FOAIA, instante: [instanta('i', 'p', x, 0)] }],
  });
  // Fiecare scară locală e mică (100), dar compuse dau 10 000 (trece) și 1 000 000 (nu trece).
  assert.ok(incarca(cu(grup('a', 100, [grup('b', 100, [el])]))).ok, 'scara compusă 10 000');
  const prea = incarca(cu(grup('a', 100, [grup('b', 100, [grup('c', 100, [el])])])));
  assert.match(prea.ok ? '' : prea.motiv, /scalat peste 10000/);
  assert.ok(incarca(cu(el, PLAFON.translatie)).ok, 'instanța exact la margine');
  assert.match((() => { const r = incarca(cu(el, PLAFON.translatie + 1)); return r.ok ? '' : r.motiv; })(), /instanța i stă la peste/);
  // 100 001 de elemente în lume: o piesă cu 1 000 de elemente, pusă de 100 de ori, plus încă una cu un element.
  const multe: Nod = { tip: 'grup', id: 'g', matrice: { ...ID }, copii: Array.from({ length: 1000 }, (_, k) => ({ ...el, id: `e${k}` })) };
  const d: Document = {
    ...documentNou(FOAIA),
    piese: [{ id: 'p', radacina: multe, operatii: [] }, piesa('q')],
    foi: [{ id: 'f1', stoc: FOAIA, instante: Array.from({ length: 100 }, (_, k) => instanta(`i${k}`, 'p')) }],
  };
  assert.ok(incarca(d).ok, '100 × 1 000 = 100 000 de elemente în lume');
  const peste = incarca({ ...d, foi: [{ id: 'f1', stoc: FOAIA, instante: [...(d.foi[0]?.instante ?? []), instanta('q')] }] });
  assert.match(peste.ok ? '' : peste.motiv, /elemente în lume, peste 100000/);
});

test('migrarea refuză ciocnirile de nume și matricile v1 peste margini; câmpul `copii` al unui element rămâne câmp', () => {
  const v1 = (extra: Record<string, unknown>, element: Record<string, unknown> = {}) =>
    ({ schema: 1, rev: 0, foaie: FOAIA, elemente: [{ ...cerc('e1'), ...element }], ...extra });
  assert.match((() => { const r = incarca(v1({ piese: [] })); return r.ok ? '' : r.motiv; })(), /câmpul „piese”/);
  assert.match((() => { const r = incarca(v1({ foi: 1 })); return r.ok ? '' : r.motiv; })(), /câmpul „foi”/);
  assert.match((() => { const r = incarca(v1({}, { tip: 'x' })); return r.ok ? '' : r.motiv; })(), /elementul v1 e1 are câmpul „tip”/);
  assert.equal(incarca(v1({}, { matrice: { ...ID, a: 1e300 } })).ok, false, 'scara absurdă din v1');
  // Un `copii` adânc pe un element nu e arbore: 40 de niveluri, peste cele 32 ale arborelui, nu se numără la adâncime.
  let adanc: unknown = [];
  for (let i = 0; i < 40; i++) adanc = [{ copii: adanc }];
  const r = incarca(v1({}, { copii: adanc }));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (r.ok) assert.ok('copii' in (r.doc.piese[0]?.radacina ?? {}));
  // Câmpurile necunoscute ale matricei v1 rămân pe matricea elementului.
  const m = incarca(v1({}, { matrice: { ...ID, e: 5, f: 6, unitate: 'mm' } }));
  assert.ok(m.ok);
  if (m.ok) assert.deepEqual(m.doc.piese[0]?.radacina.matrice, { ...ID, unitate: 'mm' });
});

test('cheile __proto__, constructor și prototype rămân date: ușa nu le scoate și nu schimbă prototipul', () => {
  const text = '{"schema":6,"rev":0,"__proto__":{"x":1},"piese":[{"id":"p","constructor":3,"operatii":[],"radacina":{"tip":"element","id":"a","forma":{"tip":"cerc","raza":1},"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}}}],"foi":[{"id":"f1","stoc":{"latime":10,"inaltime":10,"grosime":1},"instante":[{"id":"i","piesa":"p","x":0,"y":0,"rotire":0,"campuri":{"__proto__":"v","prototype":"w"}}]}]}';
  const r = incarca(JSON.parse(text));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(jsonCanonic(r.doc), jsonCanonic(JSON.parse(text)));
  assert.equal(Object.getPrototypeOf(r.doc), Object.prototype);
  assert.equal(Object.getPrototypeOf(r.doc.foi[0]?.instante[0]?.campuri), Object.prototype);
  assert.equal(({} as Record<string, unknown>)['x'], undefined, 'nimic nu ajunge pe prototipul comun');
});

test('ușa refuză ce consumatorii n-ar putea desena: raza colțului peste jumătate de latură, arce sub o matrice neuniformă, JSON prea adânc, rev nesigur', () => {
  const cu = (forma: Record<string, unknown>, matrice: Record<string, number> = { ...ID }) => ({
    ...documentNou(FOAIA),
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'a', forma, matrice }, operatii: [] }],
    foi: [{ id: 'f1', stoc: FOAIA, instante: [instanta('i', 'p')] }],
  });
  assert.ok(incarca(cu({ tip: 'dreptunghi', latime: 10, inaltime: 12, razaColt: 5 })).ok, 'raza exact jumătate');
  assert.match((() => { const r = incarca(cu({ tip: 'dreptunghi', latime: 10, inaltime: 12, razaColt: 5.5 })); return r.ok ? '' : r.motiv; })(), /raza colțului/);
  assert.match((() => { const r = incarca(cu({ tip: 'cerc', raza: 5 }, { ...ID, a: 2 })); return r.ok ? '' : r.motiv; })(), /arce sub o matrice neuniformă/);
  assert.ok(incarca(cu({ tip: 'dreptunghi', latime: 10, inaltime: 12, razaColt: 0 }, { ...ID, a: 2 })).ok, 'dreptunghiul fără arce trece și scalat neuniform');
  assert.ok(incarca(cu({ tip: 'cerc', raza: 5 }, { a: 0, b: -2, c: -2, d: 0, e: 0, f: 0 })).ok, 'oglindire cu scară uniformă');
  let adanc: unknown = 1;
  for (let i = 0; i < 300; i++) adanc = { x: adanc };
  assert.match((() => { const r = incarca({ ...cu({ tip: 'cerc', raza: 5 }), extra: adanc }); return r.ok ? '' : r.motiv; })(), /niveluri de imbricare/);
  assert.equal(incarca({ ...cu({ tip: 'cerc', raza: 5 }), rev: 2 ** 53 }).ok, false, 'rev peste întregul sigur');
});

/** Un document v2, ca pe disc înainte de ADR 0025: piese fără operații. */
const v2 = (piese: unknown[], instante: unknown[], extra: Record<string, unknown> = {}): Record<string, unknown> =>
  ({ schema: 2, rev: 4, piese, foi: [{ id: 'f1', stoc: FOAIA, instante }], ...extra });
const el2 = (id: string, forma: Record<string, unknown>, e = 0): Record<string, unknown> => ({ tip: 'element', id, forma, matrice: { ...ID, e } });
const SCULA_IMPLICITA = { numar: 1, nume: 'freza plata', diametru: 6 };

test('migrarea v2 → v3 (ADR 0025): o operație pe element, cu id-ul lui, în preordine; cercul interior 8/4, dreptunghiul exterior 3/3', () => {
  const brut = v2([
    { id: 'p', nume: 'raft', alt: 1, radacina: { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
      el2('d', { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }),
      { tip: 'grup', id: 'h', matrice: { ...ID }, copii: [el2('c', { tip: 'cerc', raza: 3 }, 10)] },
      el2('e', { tip: 'cerc', raza: 2 }, 20),
    ] } },
    { id: 'gol', radacina: { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [] } },
  ], [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }], { extra: 'sus' });
  const r = incarca(structuredClone(brut));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.doc.schema, 6);
  assert.equal(r.doc.rev, 4);
  assert.equal(r.doc['extra'], 'sus');
  const [p, gol] = r.doc.piese;
  assert.equal(p?.['alt'], 1, 'câmpurile necunoscute ale piesei rămân');
  assert.deepEqual(p?.operatii, [
    { id: 'd', tip: 'profil', noduri: ['d'], scula: SCULA_IMPLICITA, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null },
    { id: 'c', tip: 'profil', noduri: ['c'], scula: SCULA_IMPLICITA, latura: 'interior', sens: 'urcare', adancime: 8, pas: 4, urechi: null, rampa: null },
    { id: 'e', tip: 'profil', noduri: ['e'], scula: SCULA_IMPLICITA, latura: 'interior', sens: 'urcare', adancime: 8, pas: 4, urechi: null, rampa: null },
  ]);
  assert.deepEqual(gol?.operatii, [], 'o piesă fără elemente n-are operații');
  // Arborele și foile nu se schimbă; migrarea e deterministă, iar documentul migrat trece neschimbat prin ușă.
  assert.deepEqual(p?.radacina, (brut['piese'] as Array<Record<string, unknown>>)[0]?.['radacina']);
  const r2 = incarca(structuredClone(brut));
  assert.ok(r2.ok && jsonCanonic(r2.doc) === jsonCanonic(r.doc));
  const r3 = incarca(JSON.parse(JSON.stringify(r.doc)));
  assert.ok(r3.ok && jsonCanonic(r3.doc) === jsonCanonic(r.doc));
});

test('migrarea v2 → v3 refuză o piesă care are deja câmpul „operatii” (s-ar pierde), oricare i-ar fi valoarea', () => {
  for (const valoare of [[], 'x', null]) {
    const r = incarca(v2([{ id: 'p', operatii: valoare, radacina: el2('a', { tip: 'cerc', raza: 1 }) }], [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }]));
    assert.match(r.ok ? '' : r.motiv, /piesa v2 p are câmpul „operatii”/, JSON.stringify(valoare));
  }
  // Un document v2 stricat rămâne refuzat după migrare, de schema v3.
  assert.equal(incarca(v2([{ id: 'p', radacina: el2('a', { tip: 'cerc', raza: -1 }) }], [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }])).ok, false);
  assert.equal(incarca(v2('nu' as unknown as unknown[], [])).ok, false);
});

test('operațiile v3: id unic în piesă, noduri distincte, doar elemente ale piesei; valorile în margini', () => {
  const d = docDin(FOAIA, cerc('e1'));
  const ok = (f: (x: any) => void): boolean => incarca(stricat(d, f)).ok;
  const motiv = (f: (x: any) => void): string => { const r = incarca(stricat(d, f)); return r.ok ? '' : r.motiv; };
  assert.ok(ok(() => {}), 'documentul de bază');
  assert.ok(ok((x) => { x.piese[0].operatii = []; }), 'o piesă fără operații e voie');
  assert.ok(ok((x) => { x.piese[0].operatii.push({ ...x.piese[0].operatii[0], id: 'o2', latura: 'pe-linie' }); }), 'două operații pe același element');
  assert.match(motiv((x) => { x.piese[0].operatii.push({ ...x.piese[0].operatii[0] }); }), /două operații cu id-ul e1/);
  assert.match(motiv((x) => { x.piese[0].operatii[0].noduri = ['e1', 'e1']; }), /referă un nod de două ori/);
  assert.match(motiv((x) => { x.piese[0].operatii[0].noduri = ['lipsa']; }), /referă lipsa, care nu e un element al piesei/);
  assert.equal(ok((x) => { x.piese[0].operatii[0].noduri = []; }), false, 'fără noduri');
  assert.equal(ok((x) => { x.piese[0].operatii[0].tip = 'buzunar'; }), false, 'alt tip decât profil');
  assert.equal(ok((x) => { x.piese[0].operatii[0].latura = 'stanga'; }), false, 'latura necunoscută');
  assert.equal(ok((x) => { delete x.piese[0].operatii; }), false, 'v3 fără câmpul operatii');
  for (const [camp, rau, bun] of [
    ['adancime', 0, 1000], ['adancime', 1000.5, 0.001], ['pas', 0, 1000], ['pas', Number.NaN, 0.5],
  ] as const) {
    assert.equal(ok((x) => { x.piese[0].operatii[0][camp] = rau; }), false, `${camp} = ${rau}`);
    assert.ok(ok((x) => { x.piese[0].operatii[0][camp] = bun; }), `${camp} = ${bun}`);
  }
  for (const [camp, rau, bun] of [
    ['diametru', 0, 100], ['diametru', 100.1, 0.1], ['numar', 0, 999], ['numar', 1.5, 1], ['numar', 1000, 7],
  ] as const) {
    assert.equal(ok((x) => { x.piese[0].operatii[0].scula[camp] = rau; }), false, `scula.${camp} = ${rau}`);
    assert.ok(ok((x) => { x.piese[0].operatii[0].scula[camp] = bun; }), `scula.${camp} = ${bun}`);
  }
  assert.equal(ok((x) => { x.piese[0].operatii[0].scula.nume = 'x'.repeat(PLAFON.numeLungime + 1); }), false, 'numele sculei prea lung');
});

test('o operație pe un grup e refuzată: se taie doar elementele (ADR 0025)', () => {
  const d: Document = {
    ...documentNou(FOAIA),
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [{ tip: 'element', id: 'a', forma: { tip: 'cerc', raza: 1 }, matrice: { ...ID } }] }, operatii: [] }],
    foi: [{ id: 'f1', stoc: FOAIA, instante: [instanta('i', 'p')] }],
  };
  const op = { id: 'o', tip: 'profil', scula: SCULA_IMPLICITA, latura: 'interior', sens: 'urcare', adancime: 1, pas: 1, urechi: null, rampa: null };
  assert.ok(incarca(stricat(d, (x) => { x.piese[0].operatii = [{ ...op, noduri: ['a'] }]; })).ok);
  const r = incarca(stricat(d, (x) => { x.piese[0].operatii = [{ ...op, noduri: ['g'] }]; }));
  assert.match(r.ok ? '' : r.motiv, /referă g, care nu e un element al piesei/);
});

test(`plafoanele v3: cel mult ${PLAFON.operatii} de operații și ${PLAFON.taieturi} de tăieturi (operație × nod × instanță)`, () => {
  const op = (id: string) => ({ id, tip: 'profil' as const, noduri: ['a'], scula: SCULA_IMPLICITA, latura: 'interior' as const, sens: 'urcare' as const, adancime: 1, pas: 1, urechi: null, rampa: null });
  const radacina: Nod = { tip: 'element', id: 'a', forma: { tip: 'cerc', raza: 1 }, matrice: { ...ID } };
  // Două operații pe un singur element, puse de 50 000 de ori: 100 000 de tăieturi (trece), cu încă o instanță 100 002.
  const cu = (n: number): Document => ({
    ...documentNou(FOAIA),
    piese: [{ id: 'p', radacina, operatii: [op('o1'), op('o2')] }],
    foi: [{ id: 'f1', stoc: FOAIA, instante: Array.from({ length: n }, (_, k) => instanta(`i${k}`, 'p')) }],
  });
  assert.ok(incarca(cu(50_000)).ok, '100 000 de tăieturi');
  const peste = incarca(cu(50_001));
  assert.match(peste.ok ? '' : peste.motiv, /tăieturi/);
  // 100 001 de operații pe un element.
  const multe: Document = {
    ...documentNou(FOAIA),
    piese: [{ id: 'p', radacina, operatii: Array.from({ length: PLAFON.operatii + 1 }, (_, k) => op(`o${k}`)) }],
    foi: [{ id: 'f1', stoc: FOAIA, instante: [] }],
  };
  const r = incarca(multe);
  assert.match(r.ok ? '' : r.motiv, /operații/);
});

test('migrarea v3 → v4 (ADR 0027): fiecare operație primește sens urcare; restul neschimbat; lanțul v2 → v4', () => {
  const d = docDin(FOAIA, dreptunghi('e1'), cerc('e2'));
  const v3 = JSON.parse(JSON.stringify({
    ...d, schema: 3, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map(({ sens: _s, urechi: _u, rampa: _r, ...o }) => ({ ...o, alt: 7 })) })),
  }));
  const r = incarca(v3);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.doc.schema, 6);
  assert.deepEqual(r.doc.piese.map((p) => p.operatii.map((o) => [o.id, o.latura, o.sens, o['alt']])), [[['e1', 'exterior', 'urcare', 7]], [['e2', 'interior', 'urcare', 7]]]);
  // Fără operații: nimic de adăugat, doar schema.
  const gol = incarca(JSON.parse(JSON.stringify({ ...documentNou(FOAIA), schema: 3 })));
  assert.ok(gol.ok && gol.doc.schema === 6 && gol.doc.piese.length === 0);
});

test('migrarea v4 → v5 (ADR 0028): fiecare operație primește urechi null; restul neschimbat; lanțul v3 → v5', () => {
  const d = docDin(FOAIA, dreptunghi('e1'), cerc('e2'));
  const v4 = JSON.parse(JSON.stringify({
    ...d, schema: 4, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map(({ urechi: _u, rampa: _r, ...o }) => ({ ...o, sens: 'opozitie', alt: 7 })) })),
  }));
  const r = incarca(v4);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.doc.schema, 6);
  assert.deepEqual(r.doc.piese.map((p) => p.operatii.map((o) => [o.id, o.sens, o.urechi, o['alt']])), [[['e1', 'opozitie', null, 7]], [['e2', 'opozitie', null, 7]]]);
  const gol = incarca(JSON.parse(JSON.stringify({ ...documentNou(FOAIA), schema: 4 })));
  assert.ok(gol.ok && gol.doc.schema === 6 && gol.doc.piese.length === 0);
  // Lanțul v3 → v4 → v5: sensul și urechile, amândouă.
  const v3 = JSON.parse(JSON.stringify({ ...d, schema: 3, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map(({ sens: _s, urechi: _u, rampa: _r, ...o }) => o) })) }));
  const r3 = incarca(v3);
  assert.ok(r3.ok && r3.doc.piese.every((p) => p.operatii.every((o) => o.sens === 'urcare' && o.urechi === null)));
});

test('migrarea v4 → v5 refuză o operație care are deja câmpul „urechi” (s-ar pierde), oricare i-ar fi valoarea', () => {
  const d = docDin(FOAIA, cerc('e1'));
  for (const valoare of [null, { numar: 4, latime: 8, grosime: 2 }, 3, 'da']) {
    const v4 = JSON.parse(JSON.stringify({ ...d, schema: 4, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map(({ rampa: _r, ...o }) => ({ ...o, urechi: valoare })) })) }));
    const r = incarca(v4);
    assert.match(r.ok ? '' : r.motiv, /operația v4 e1 din piesa e1 are câmpul „urechi”/, JSON.stringify(valoare));
  }
});

test('documentul v5: urechile sunt obligatorii, null sau { numar întreg 1–100, latime > 0, grosime > 0 }', () => {
  const d = docDin(FOAIA, cerc('e1'));
  const cu = (u: unknown): boolean => incarca(stricat(d, (x) => { x.piese[0].operatii[0].urechi = u; })).ok;
  assert.ok(cu(null));
  assert.ok(cu({ numar: 4, latime: 8, grosime: 2 }));
  assert.ok(cu({ numar: 1, latime: 0.5, grosime: 0.1, alt: 'pastrat' }), 'câmpurile necunoscute rămân');
  assert.ok(cu({ numar: PLAFON.urechi, latime: PLAFON.latura, grosime: PLAFON.grosime }), 'la plafon');
  assert.equal(incarca(stricat(d, (x) => { delete x.piese[0].operatii[0].urechi; })).ok, false, 'fără urechi');
  for (const rau of [
    { numar: 0, latime: 8, grosime: 2 }, { numar: 2.5, latime: 8, grosime: 2 }, { numar: PLAFON.urechi + 1, latime: 8, grosime: 2 },
    { numar: 4, latime: 0, grosime: 2 }, { numar: 4, latime: -1, grosime: 2 }, { numar: 4, latime: PLAFON.latura + 1, grosime: 2 },
    { numar: 4, latime: 8, grosime: 0 }, { numar: 4, latime: 8, grosime: PLAFON.grosime + 1 }, { numar: 4, latime: 8 }, 4, 'da',
  ]) assert.equal(cu(rau), false, JSON.stringify(rau));
});

test('migrarea v3 → v4 refuză o operație care are deja câmpul „sens” (s-ar pierde), oricare i-ar fi valoarea', () => {
  const d = docDin(FOAIA, cerc('e1'));
  for (const valoare of ['urcare', 'orar', 1, null]) {
    const v3 = JSON.parse(JSON.stringify({ ...d, schema: 3, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => ({ ...o, sens: valoare })) })) }));
    const r = incarca(v3);
    assert.match(r.ok ? '' : r.motiv, /operația v3 e1 din piesa e1 are câmpul „sens”/, JSON.stringify(valoare));
  }
});

test('documentul v4: sensul e obligatoriu, doar urcare sau opoziție', () => {
  const d = docDin(FOAIA, cerc('e1'));
  assert.ok(incarca(stricat(d, (x) => { x.piese[0].operatii[0].sens = 'opozitie'; })).ok);
  assert.equal(incarca(stricat(d, (x) => { delete x.piese[0].operatii[0].sens; })).ok, false, 'fără sens');
  assert.equal(incarca(stricat(d, (x) => { x.piese[0].operatii[0].sens = 'orar'; })).ok, false, 'alt cuvânt');
});

test('migrarea v5 → v6 (ADR 0029): fiecare operație primește rampa null; restul neschimbat; lanțul v4 → v6', () => {
  const d = docDin(FOAIA, dreptunghi('e1'), cerc('e2'));
  const v5 = JSON.parse(JSON.stringify({
    ...d, schema: 5,
    piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map(({ rampa: _r, ...o }) => ({ ...o, urechi: { numar: 4, latime: 8, grosime: 2 }, alt: 7 })) })),
  }));
  const r = incarca(v5);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.doc.schema, 6);
  assert.deepEqual(r.doc.piese.map((p) => p.operatii.map((o) => [o.id, o.rampa, o.urechi?.numar, o['alt']])), [[['e1', null, 4, 7]], [['e2', null, 4, 7]]]);
  const gol = incarca(JSON.parse(JSON.stringify({ ...documentNou(FOAIA), schema: 5 })));
  assert.ok(gol.ok && gol.doc.schema === 6 && gol.doc.piese.length === 0);
  // Lanțul v4 → v5 → v6.
  const v4 = JSON.parse(JSON.stringify({ ...d, schema: 4, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map(({ urechi: _u, rampa: _r, ...o }) => o) })) }));
  const r4 = incarca(v4);
  assert.ok(r4.ok && r4.doc.piese.every((p) => p.operatii.every((o) => o.urechi === null && o.rampa === null)));
});

test('migrarea v5 → v6 refuză o operație care are deja câmpul „rampa” (s-ar pierde), oricare i-ar fi valoarea', () => {
  const d = docDin(FOAIA, cerc('e1'));
  for (const valoare of [null, { lungime: 10 }, 3, 'da']) {
    const v5 = JSON.parse(JSON.stringify({ ...d, schema: 5, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => ({ ...o, rampa: valoare })) })) }));
    const r = incarca(v5);
    assert.match(r.ok ? '' : r.motiv, /operația v5 e1 din piesa e1 are câmpul „rampa”/, JSON.stringify(valoare));
  }
});

test('documentul v6: rampa e obligatorie, null sau { lungime > 0, cel mult plafonul laturii }', () => {
  const d = docDin(FOAIA, cerc('e1'));
  const cu = (u: unknown): boolean => incarca(stricat(d, (x) => { x.piese[0].operatii[0].rampa = u; })).ok;
  assert.ok(cu(null));
  assert.ok(cu({ lungime: 10 }));
  assert.ok(cu({ lungime: 0.001, alt: 'pastrat' }), 'câmpurile necunoscute rămân');
  assert.ok(cu({ lungime: PLAFON.latura }), 'la plafon');
  assert.equal(incarca(stricat(d, (x) => { delete x.piese[0].operatii[0].rampa; })).ok, false, 'fără rampă');
  for (const rau of [{ lungime: 0 }, { lungime: -1 }, { lungime: PLAFON.latura + 1 }, { lungime: Number.NaN }, {}, 10, 'da', true]) {
    assert.equal(cu(rau), false, JSON.stringify(rau));
  }
});
