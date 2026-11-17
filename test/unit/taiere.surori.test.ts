/**
 * Tăierea și conversia unei piese puse de mai multe ori (felia 10.3↑m, ADR 0180), pe hârtie. Piesa „s”, un pătrat de 100 × 100,
 * e pusă de patru ori: pe foaia 1 la (0, 0) („s”) și la (300, 0) („i2”); pe foaia 2 la (500, 50), rotită cu 90° („i3”), apoi o
 * formă a ei („x”, 20 × 20 la (0, 0)), apoi încă o dată la (700, 0) („i4”).
 * - **fără alegere:** tăierea și conversia se refuză (`impartita`); decuparea care doar șterge o instanță trece (cealaltă rămâne);
 * - **«Taie piesa»** (X = 50, pe „s”): fiecare instanță devine două bucăți, puse fiecare de patru ori (două piese noi, „s”
 *   plecată); pe foaia 1, „s” ([0, 50] și [50, 100] × [0, 100]) și „i2” ([300, 350] și [350, 400]); pe foaia 2, „i3” rotită
 *   ([400, 500] × [50, 100] și [400, 500] × [100, 150]), „x” la locul ei, între bucățile lui „i3” și ale lui „i4”; anularea pune
 *   documentul exact; documentul de după trece de ușă;
 * - **refuzurile «Taie piesa»:** două instanțe alese tăiate în locuri diferite ale piesei (Y = 30, cu „i2” mutată la Y = 20:
 *   30 și 10 în desenul piesei) dau `diferite`, iar tăiate la fel (amândouă la 30) trec; o plăcuță (o instanță a piesei cu
 *   literele ei) dă `placute`; la intersecții (cuțit care depinde de vecini), tot `impartita`;
 * - **«Desprinde și taie»:** pe documentul cu „s” și „i2” desprinse, X = 50 taie doar „s”; comanda desprinde doar „s”, iar
 *   „i2”, „i3” și „i4” rămân pe piesa „s” (pusă de trei ori); anularea exactă;
 * - **conversia** („În dreptunghi”, cu mărimea 40 × 20): fără alegere, `impartita`; cu «Convertește piesa», piesa „s” se
 *   schimbă în locul ei (o dată, cu „s” și „i2” alese), deci toate cele patru; cu «Desprinde și convertește», doar „s” primește
 *   piesa ei, convertită, iar celelalte trei rămân pe piesa veche.
 * - **la otrăvuri** (felia 10.3↑m): o formă pusă o dată, printre cele alese, nu e „cu surori”, iar de câte ori e pusă e cea mai
 *   folosită; „i2” rotită cu 180° la (300, 60) se taie la Y = 30 în același loc al piesei ca „s” (bucățile vin în ordine
 *   inversă, iar rotirea lasă zgomot: amprenta, fără ordine și rotunjită la 1e-6, le găsește la fel), iar comanda le pune la
 *   locul fiecărei instanțe (aceeași foaie ca tăiate pe rând, ca forme); tăiată
 *   doar „i2”, a doua aleasă, degruparea arată spre piesa desprinsă acum (alta decât pe documentul de calcul); conversia unui
 *   șablon de plăcuțe, ca piesă, se sare, numărată; la «Desprinde și convertește», o a doua piesă cu surori, neschimbată (o cale
 *   deschisă, la „În dreptunghi”), nu se desprinde.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Cutie } from '../../src/geom/cutie.ts';
import { converteste } from '../../src/model/conversie.ts';
import type { Document, FormaDoc, Instanta } from '../../src/model/document.ts';
import { anuleaza, executa, istoricNou, type Comanda } from '../../src/model/jurnal.ts';
import { cutieInstanta, folosiri } from '../../src/model/pieseLegate.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type CerereTaiere, type RezultatTaiere } from '../../src/model/taiere.ts';
import { aleseCuSurori, catePuse, comenziTaiePiesa, desprindeSiConverteste, desprindeSiTaie, desprinse } from '../../src/model/taiereSurori.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 600, grosime: 18 };
const dreptunghi = (w: number, h: number): FormaDoc => ({ tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 });
const inst = (id: string, x: number, y: number, rotire = 0): Instanta => ({ id, piesa: 's', x, y, rotire });

/** Piesa „s” pusă de patru ori, pe două foi (vezi antetul), plus forma „x” pe foaia 2. */
function document(): Document {
  const d = docDin(stoc, { id: 's', forma: dreptunghi(100, 100), matrice: { ...ID, e: 0, f: 0 } }, { id: 'x', forma: dreptunghi(20, 20), matrice: { ...ID, e: 0, f: 0 } });
  const [f1] = d.foi;
  assert.ok(f1);
  const x = f1.instante.find((i) => i.id === 'x') as Instanta;
  return {
    ...d,
    foi: [
      { ...f1, instante: [f1.instante[0] as Instanta, inst('i2', 300, 0)] },
      { id: 'f2', stoc: { ...stoc }, instante: [inst('i3', 500, 50, 90), x, inst('i4', 700, 0)] },
    ],
  };
}

const cerere = (alese: readonly string[], o: Partial<CerereTaiere> = {}): CerereTaiere => ({ cutit: { fel: 'x', x: 50 }, alese, inchide: true, ...o });
type Ok = Extract<RezultatTaiere, { ok: true }>;
const ok = (r: RezultatTaiere): Ok => (r.ok ? r : assert.fail(`refuzată: ${r.motiv}`));
const cutie = (d: Document, foaie: number, id: string): Cutie => {
  const i = d.foi[foaie]?.instante.find((x) => x.id === id);
  const p = d.piese.find((x) => x.id === i?.piesa);
  assert.ok(i && p, `instanța ${id} pe foaia ${foaie + 1}`);
  const c = cutieInstanta(p, i);
  assert.ok(c);
  return c;
};
const aproape = (a: Cutie, b: readonly [number, number, number, number], mesaj: string): void => {
  const [minX, minY, maxX, maxY] = b;
  for (const [k, v] of [['minX', minX], ['minY', minY], ['maxX', maxX], ['maxY', maxY]] as const) assert.ok(Math.abs(a[k] - v) < 1e-9, `${mesaj}: ${k} ${a[k]}, nu ${v}`);
};
/** Comanda aplicată (un pas), documentul de după trecut de ușă și anularea exactă. */
function aplicat(d: Document, comenzi: readonly Comanda[]): Document {
  const h = executa(istoricNou(d), { tip: 'lot', comenzi });
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(h.doc))), 'documentul de după trece de ușă');
  assert.deepEqual({ ...anuleaza(h).doc, rev: d.rev }, d, 'anularea pune documentul exact');
  return h.doc;
}

test('fără alegere: tăierea și conversia se refuză; alesele cu surori și de câte ori e pusă piesa lor', () => {
  const d = document();
  assert.deepEqual(aleseCuSurori(d, 'f1', ['i2', 's']), ['s', 'i2'], 'în ordinea foii');
  assert.deepEqual(aleseCuSurori(d, 'f1', ['s', 'nu-e']), ['s']);
  assert.equal(catePuse(d, 'f1', ['s']), 4);
  assert.equal(catePuse(d, 'f1', []), 0);
  // „x”, pusă o dată, pe foaia 1 după „s” și „i2”: nu e cu surori, iar de câte ori e cea mai folosită (4), nu a ultimei (1).
  const [f1] = d.foi;
  assert.ok(f1);
  const cuX: Document = { ...d, foi: [{ ...f1, instante: [...f1.instante, { id: 'x', piesa: 'x', x: 600, y: 0, rotire: 0 }] }, { ...(d.foi[1] as Document['foi'][number]), instante: (d.foi[1]?.instante ?? []).filter((i) => i.id !== 'x') }] };
  assert.deepEqual(aleseCuSurori(cuX, 'f1', ['s', 'x']), ['s']);
  assert.equal(catePuse(cuX, 'f1', ['s', 'x']), 4);
  assert.deepEqual(taie(d, cerere(['s'])), { ok: false, motiv: 'impartita' });
  assert.deepEqual(converteste(d, { fel: 'dreptunghi', alese: ['s'], toleranta: 0.1, marime: { latime: 40, inaltime: 20 } }), { ok: false, motiv: 'impartita' });
});

test('«Taie piesa» (X = 50): fiecare instanță, pe ambele foi, devine două bucăți puse de patru ori; anularea exactă', () => {
  const d = document();
  const r = ok(taie(d, cerere(['s'], { surori: 'piesa' })));
  assert.equal(r.degrupate.length, 1);
  const dupa = aplicat(d, comenziTaiePiesa(d, 'f1', r.degrupate));
  assert.ok(!dupa.piese.some((p) => p.id === 's'), 'piesa veche a plecat');
  const n = folosiri(dupa);
  const [a, b] = r.degrupate[0]?.parti.map((x) => x.piesa.id) ?? [];
  assert.ok(a && b);
  assert.equal(n.get(a), 4);
  assert.equal(n.get(b), 4);
  assert.equal(dupa.piese.length, 3, 'cele două bucăți și forma „x”');
  // Foaia 1: bucățile lui „s”, apoi ale lui „i2”, la locurile lor.
  const f1 = dupa.foi[0]?.instante ?? [];
  assert.deepEqual(f1.map((i) => i.piesa), [a, b, a, b]);
  assert.deepEqual(f1.slice(0, 2).map((i) => i.id), r.ids, 'bucățile instanței alese păstrează id-urile tăierii');
  aproape(cutie(dupa, 0, f1[0]?.id ?? ''), [0, 0, 50, 100], '„s”, A');
  aproape(cutie(dupa, 0, f1[1]?.id ?? ''), [50, 0, 100, 100], '„s”, B');
  aproape(cutie(dupa, 0, f1[2]?.id ?? ''), [300, 0, 350, 100], '„i2”, A');
  aproape(cutie(dupa, 0, f1[3]?.id ?? ''), [350, 0, 400, 100], '„i2”, B');
  // Foaia 2: „i3” rotită (A dedesubt, B deasupra), „x” la locul ei, apoi „i4”.
  const f2 = dupa.foi[1]?.instante ?? [];
  assert.deepEqual(f2.map((i) => i.piesa), [a, b, 'x', a, b]);
  aproape(cutie(dupa, 1, f2[0]?.id ?? ''), [400, 50, 500, 100], '„i3”, A');
  aproape(cutie(dupa, 1, f2[1]?.id ?? ''), [400, 100, 500, 150], '„i3”, B');
  aproape(cutie(dupa, 1, f2[3]?.id ?? ''), [700, 0, 750, 100], '„i4”, A');
  aproape(cutie(dupa, 1, f2[4]?.id ?? ''), [750, 0, 800, 100], '„i4”, B');
  assert.equal(new Set([...f1, ...f2].map((i) => i.id)).size, 9, 'niciun id de instanță repetat');
});

test('«Taie piesa»: tăiate în locuri diferite ale piesei, `diferite`; la fel, trec; plăcuțele, `placute`; intersecțiile, `impartita`', () => {
  const d = document();
  const Y30 = { fel: 'y' as const, y: 30 };
  // Amândouă la Y = 30 din piesă: aceeași tăietură, deci o singură pereche de piese, puse de patru ori.
  const la = ok(taie(d, cerere(['s', 'i2'], { cutit: Y30, surori: 'piesa' })));
  assert.equal(la.degrupate.length, 2);
  const dupa = aplicat(d, comenziTaiePiesa(d, 'f1', la.degrupate));
  assert.equal(dupa.piese.length, 3);
  // „i2” mutată la Y = 20: tăiată la 10 în desenul piesei, „s” la 30.
  const [f1] = d.foi;
  assert.ok(f1);
  const mutat: Document = { ...d, foi: [{ ...f1, instante: [f1.instante[0] as Instanta, inst('i2', 300, 20)] }, ...d.foi.slice(1)] };
  assert.deepEqual(taie(mutat, cerere(['s', 'i2'], { cutit: Y30, surori: 'piesa' })), { ok: false, motiv: 'diferite' });
  // „i2” rotită cu 180° la (300, 60): Y = 30 o taie la 60 − 30 = 30 în desenul piesei, ca pe „s”, cu bucățile invers și zgomotul
  // rotirii; trece, iar pe foaie bucățile stau unde le-ar pune și tăierea fiecăreia (cutiile, aceleași).
  const rotita: Document = { ...d, foi: [{ ...f1, instante: [f1.instante[0] as Instanta, inst('i2', 300, 60, 180)] }, ...d.foi.slice(1)] };
  const rr = ok(taie(rotita, cerere(['s', 'i2'], { cutit: Y30, surori: 'piesa' })));
  assert.equal(rr.degrupate.length, 2);
  const peFoaie = aplicat(rotita, comenziTaiePiesa(rotita, 'f1', rr.degrupate));
  const cutiiI2 = (peFoaie.foi[0]?.instante ?? []).slice(2).map((i) => cutie(peFoaie, 0, i.id)).map((k) => [k.minY, k.maxY].map((v) => Math.round(v * 1e6) / 1e6));
  assert.deepEqual(cutiiI2.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0)), [[-40, 30], [30, 60]], '„i2”: bucățile de o parte și de alta a lui Y = 30');
  // O plăcuță: o instanță a piesei (oriunde) are literele ei.
  const placuta: Document = { ...d, foi: [d.foi[0] as Document['foi'][number], { ...(d.foi[1] as Document['foi'][number]), instante: [{ ...inst('i3', 500, 50, 90), texte: {} }, ...(d.foi[1]?.instante.slice(1) ?? [])] }] };
  assert.deepEqual(taie(placuta, cerere(['s'], { surori: 'piesa' })), { ok: false, motiv: 'placute' });
  // Intersecțiile depind de vecini: «Taie piesa» nu e o opțiune acolo.
  const cu: Document = { ...d, foi: [{ ...f1, instante: [...f1.instante, { id: 'x', piesa: 'x', x: 90, y: 40, rotire: 0 }] }, { ...(d.foi[1] as Document['foi'][number]), instante: (d.foi[1]?.instante ?? []).filter((i) => i.id !== 'x') }] };
  assert.deepEqual(taie(cu, cerere(['s', 'x'], { cutit: { fel: 'intersectii' }, inchide: false, surori: 'piesa' })), { ok: false, motiv: 'impartita' });
});

test('«Desprinde și taie»: doar instanța tăiată primește piesa ei; celelalte rămân pe piesa „s”; anularea exactă', () => {
  const d = document();
  const d1 = desprinse(d, 'f1', ['s', 'i2']);
  assert.equal(folosiri(d1).get('s'), 2, 'pe documentul de calcul, „s” și „i2” desprinse');
  const r = ok(taie(d1, cerere(['s', 'i2'])));
  assert.deepEqual(r.degrupate.map((x) => x.instanta.id), ['s'], 'X = 50 taie doar „s”');
  const x = desprindeSiTaie(d, 'f1', r.degrupate.map((y) => y.instanta.id), r.degrupate);
  const dupa = aplicat(d, [...x.comenzi, { tip: 'degrupeaza', foaie: 'f1', degrupate: x.degrupate }]);
  assert.equal(folosiri(dupa).get('s'), 3, '„i2”, „i3” și „i4”, tot pe „s”');
  const f1 = dupa.foi[0]?.instante ?? [];
  assert.deepEqual(f1.map((i) => i.id), [...r.ids, 'i2']);
  aproape(cutie(dupa, 0, r.ids[0] ?? ''), [0, 0, 50, 100], '„s”, A');
  aproape(cutie(dupa, 0, r.ids[1] ?? ''), [50, 0, 100, 100], '„s”, B');
  assert.equal(f1.find((i) => i.id === 'i2')?.piesa, 's');
  // Tăiată doar „i2”, a doua aleasă: pe documentul de calcul, piesa ei desprinsă e a doua nouă, acum e prima.
  const r2 = ok(taie(d1, cerere(['s', 'i2'], { cutit: { fel: 'x', x: 350 } })));
  assert.deepEqual(r2.degrupate.map((y) => y.instanta.id), ['i2']);
  const x2 = desprindeSiTaie(d, 'f1', ['i2'], r2.degrupate);
  assert.notEqual(r2.degrupate[0]?.piesa.id, x2.degrupate[0]?.piesa.id, 'piesa desprinsă acum are alt id decât pe documentul de calcul');
  const dupa2 = aplicat(d, [...x2.comenzi, { tip: 'degrupeaza', foaie: 'f1', degrupate: x2.degrupate }]);
  assert.equal(folosiri(dupa2).get('s'), 3, '„s”, „i3” și „i4”');
});

test('conversia: «Convertește piesa» schimbă piesa „s” în locul ei (o dată); «Desprinde și convertește», doar instanța aleasă', () => {
  const d = document();
  const c = { fel: 'dreptunghi' as const, alese: ['s', 'i2'], toleranta: 0.1, marime: { latime: 40, inaltime: 20 } };
  const p = converteste(d, { ...c, surori: 'piesa' });
  assert.ok(p.ok);
  assert.deepEqual(p.piese.map((x) => x.id), ['s'], 'o singură dată, cu două instanțe alese');
  assert.equal(p.convertite, 1);
  const toate = aplicat(d, [{ tip: 'inlocuieste-piesa', vechi: d.piese.find((x) => x.id === 's') as Document['piese'][number], nou: p.piese[0] as Document['piese'][number] }]);
  for (const [f, id] of [[0, 's'], [0, 'i2'], [1, 'i3'], [1, 'i4']] as const) {
    const k = cutie(toate, f, id);
    assert.ok(Math.abs(Math.max(k.maxX - k.minX, k.maxY - k.minY) - 40) < 1e-9, `„${id}”, 40 × 20`);
  }
  // «Desprinde și convertește», doar pe „s”.
  const d1 = desprinse(d, 'f1', ['s']);
  const r = converteste(d1, { ...c, alese: ['s'] });
  assert.ok(r.ok);
  const x = desprindeSiConverteste(d, d1, 'f1', ['s'], r.piese);
  const vechi = new Map(x.doc.piese.map((q) => [q.id, q]));
  const dupa = aplicat(d, [...x.comenzi, ...x.piese.map((q): Comanda => ({ tip: 'inlocuieste-piesa', vechi: vechi.get(q.id) as Document['piese'][number], nou: q }))]);
  assert.equal(folosiri(dupa).get('s'), 3);
  const ks = cutie(dupa, 0, 's'), k2 = cutie(dupa, 0, 'i2');
  aproape(ks, [30, 40, 70, 60], '„s”, 40 × 20 în mijlocul ei');
  aproape(k2, [300, 0, 400, 100], '„i2”, neschimbată');
  // Un șablon de plăcuțe (o instanță a piesei are literele ei), convertit ca piesă: sărit, numărat.
  const placuta: Document = { ...d, foi: [d.foi[0] as Document['foi'][number], { ...(d.foi[1] as Document['foi'][number]), instante: [{ ...inst('i3', 500, 50, 90), texte: {} }, ...(d.foi[1]?.instante.slice(1) ?? [])] }] };
  const pl = converteste(placuta, { ...c, alese: ['s'], surori: 'piesa' });
  assert.ok(pl.ok);
  assert.deepEqual([pl.piese.length, pl.sarite], [0, 1]);
  // «Desprinde și convertește» cu o a doua piesă cu surori, neschimbată (o cale deschisă nu devine dreptunghi): ea rămâne legată.
  const L = { tip: 'L' } as const;
  const deschisa: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: L }, { p: { x: 50, y: 0 }, s: L }, { p: { x: 50, y: 50 }, s: L }] };
  const baza = docDin(stoc, { id: 's', forma: dreptunghi(100, 100), matrice: { ...ID, e: 0, f: 0 } }, { id: 'l', forma: deschisa, matrice: { ...ID, e: 0, f: 200 } });
  const [fb] = baza.foi;
  assert.ok(fb);
  const dd: Document = { ...baza, foi: [{ ...fb, instante: [...fb.instante, inst('s2', 300, 0), { id: 'l2', piesa: 'l', x: 300, y: 200, rotire: 0 }] }] };
  const dd1 = desprinse(dd, 'f1', ['s', 'l']);
  const rr = converteste(dd1, { ...c, alese: ['s', 'l'] });
  assert.ok(rr.ok);
  assert.equal(rr.piese.length, 1, 'doar pătratul');
  const xx = desprindeSiConverteste(dd, dd1, 'f1', ['s', 'l'], rr.piese);
  const vechi2 = new Map(xx.doc.piese.map((q) => [q.id, q]));
  const dupa2 = aplicat(dd, [...xx.comenzi, ...xx.piese.map((q): Comanda => ({ tip: 'inlocuieste-piesa', vechi: vechi2.get(q.id) as Document['piese'][number], nou: q }))]);
  assert.equal(folosiri(dupa2).get('l'), 2, 'calea deschisă rămâne pusă de două ori');
  assert.equal(folosiri(dupa2).get('s'), 1, 'doar „s2” pe piesa veche');
});
