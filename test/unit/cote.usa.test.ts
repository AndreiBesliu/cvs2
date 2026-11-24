import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { documentNou, PLAFON, VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou, reface } from '../../src/model/jurnal.ts';
import { problemaCote } from '../../src/model/schemaDocument.ts';
import { cuCote } from '../../src/model/usaCurenta.ts';

/**
 * Cotele foii (ADR 0330 §2): opționale, fără schemă nouă (documentul rămâne v27), judecate de ușă pe documentul brut, cu
 * judecata adusă la cerere (`judecataCote.ts`, ca a plăcuțelor); păstrate cu câmpurile lor necunoscute, iar o cotă cu un fel
 * necunoscut (a unei versiuni mai noi), neatinsă. Comanda lor din jurnal, cu anularea și refacerea exacte.
 */

const STOC = { latime: 300, inaltime: 200, grosime: 18 };
const cuCoteBrut = (cote: unknown): Record<string, unknown> => {
  const d = documentNou(STOC) as unknown as { foi: Array<Record<string, unknown>> };
  const f = d.foi[0];
  if (f) f['cote'] = cote;
  return d as unknown as Record<string, unknown>;
};
const motiv = (r: ReturnType<typeof incarca>): string => (r.ok ? 'trece' : r.motiv);
const leg = { instanta: 'i1', nod: 'e1', loc: { fel: 'varf', k: 2 }, n: 4 };
const BUNE = [
  { id: 'c1', fel: 'orizontala', puncte: [{ x: 0, y: 0, legatura: leg }, { x: 100, y: 0 }], linie: { d: 10 } },
  { id: 'c2', fel: 'verticala', puncte: [{ x: 0, y: 0 }, { x: 0, y: 50, legatura: { ...leg, loc: { fel: 'cutie', i: 8 } } }], linie: { d: -10 }, text: '<> mm' },
  { id: 'c3', fel: 'aliniata', puncte: [{ x: 0, y: 0, legatura: { ...leg, loc: { fel: 'mijloc', k: 0 } } }, { x: 30, y: 40 }], linie: { d: 5 } },
  { id: 'c4', fel: 'raza', puncte: [{ x: 50, y: 50, legatura: { ...leg, loc: { fel: 'centru', k: 1 } } }, { x: 60, y: 50, legatura: { ...leg, loc: { fel: 'cadran', k: 1, q: 3 } } }], linie: { d: 8 } },
  { id: 'c5', fel: 'diametru', puncte: [{ x: 50, y: 50 }, { x: 60, y: 50 }], linie: { d: -2 } },
  { id: 'c6', fel: 'unghi', puncte: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }], linie: { d: 15, s1: -1, s2: 1 } },
  { id: 'c7', fel: 'unghi', puncte: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 15 }], linie: { d: 6 } },
];

test('ușa: un document fără cote rămâne neatins (câmpul e opțional; schema rămâne cea curentă)', () => {
  const d = documentNou(STOC);
  const r = incarca(JSON.parse(JSON.stringify(d)));
  assert.ok(r.ok);
  assert.equal(jsonCanonic(r.doc), jsonCanonic(d));
  assert.equal(r.doc.schema, VERSIUNE_SCHEMA);
  assert.equal(problemaCote(d), null);
});

test('ușa: cotele bune trec, de fiecare fel, cu câmpurile necunoscute păstrate și o cotă dintr-o versiune mai nouă neatinsă', () => {
  const cote = [
    ...BUNE.map((c, i) => (i === 0 ? { ...c, culoare: 'albastru', puncte: [{ ...c.puncte[0], ceva: 1 }, c.puncte[1]] } : c)),
    { id: 'c8', fel: 'toleranta-din-viitor', puncte: 'orice', alt: { x: Number.MAX_VALUE } },
  ];
  const r = incarca(cuCoteBrut(cote));
  assert.ok(r.ok, motiv(r));
  assert.deepEqual(r.doc.foi[0]?.cote, cote);
  assert.equal(r.doc.schema, VERSIUNE_SCHEMA);
});

test('ușa: forma greșită, numerele în afara plafonului, id-urile duble și prea multe cote sunt refuzate, cu motivul', () => {
  const c = (o: Record<string, unknown>): unknown[] => [{ ...BUNE[0], ...o }];
  const p = (o: Record<string, unknown>): unknown[] => c({ puncte: [{ x: 0, y: 0, ...o }, { x: 1, y: 0 }] });
  const l = (o: Record<string, unknown>): unknown[] => p({ legatura: { ...leg, ...o } });
  const rele: Array<[unknown, RegExp]> = [
    ['nu e listă', /cote/],
    [[3], /cot/],
    [[{ fel: 'orizontala', puncte: [{ x: 0, y: 0 }, { x: 1, y: 0 }], linie: { d: 1 } }], /id/],
    [[{ id: '', fel: 'orizontala' }], /id/],
    [[{ id: 'x'.repeat(PLAFON.idLungime + 1), fel: 'orizontala' }], /id/],
    [[BUNE[0], BUNE[0]], /c1/],
    [[{ id: 'c1' }], /fel/],
    [c({ fel: 3 }), /fel/],
    [c({ puncte: [{ x: 0, y: 0 }] }), /punct/],
    [c({ fel: 'unghi' }), /punct/],
    [c({ fel: 'unghi', puncte: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 }] }), /punct/],
    [c({ puncte: 'nu' }), /punct/],
    [c({ linie: undefined }), /linie/],
    [c({ linie: { d: Number.NaN } }), /linie/],
    [c({ linie: { d: PLAFON.translatie * 2 } }), /linie/],
    [c({ linie: { d: 1, s1: 0 } }), /s1/],
    [c({ linie: { d: 1, s2: 'da' } }), /s2/],
    [c({ text: 7 }), /text/],
    [c({ text: 'x'.repeat(PLAFON.numeLungime + 1) }), /text/],
    [p({ x: Number.POSITIVE_INFINITY }), /x/],
    [p({ y: -PLAFON.translatie * 2 }), /y/],
    [p({ legatura: 'nu' }), /legătur/],
    [l({ instanta: 5 }), /instan/],
    [l({ nod: '' }), /nod/],
    [l({ n: -1 }), /\bn\b/],
    [l({ n: 2.5 }), /\bn\b/],
    [l({ loc: { fel: 'colt', k: 0 } }), /loc/],
    [l({ loc: { fel: 'varf', k: -1 } }), /\bk\b/],
    [l({ loc: { fel: 'varf', k: 1.5 } }), /\bk\b/],
    [l({ loc: { fel: 'cadran', k: 0, q: 4 } }), /\bq\b/],
    [l({ loc: { fel: 'cutie', i: 9 } }), /\bi\b/],
    [l({ loc: null }), /loc/],
    [Array.from({ length: PLAFON.cote + 1 }, (_, i) => ({ ...BUNE[0], id: `c${i}` })), /cel mult/],
  ];
  for (const [cote, re] of rele) {
    const r = incarca(cuCoteBrut(cote));
    assert.ok(!r.ok, `trebuia refuzat: ${JSON.stringify(cote).slice(0, 120)}`);
    assert.match(r.motiv, re, JSON.stringify(cote).slice(0, 120));
  }
});

test('ușa: cheile `__proto__`, `constructor` și `prototype` sunt date (ADR 0024 §9): o cotă cu ele trece neatinsă', () => {
  const brut = JSON.parse(`{"id":"c1","fel":"orizontala","puncte":[{"x":0,"y":0},{"x":1,"y":0}],"linie":{"d":1},"__proto__":{"x":1},"constructor":2}`) as unknown;
  const r = incarca(cuCoteBrut([brut]));
  assert.ok(r.ok, motiv(r));
  assert.equal(JSON.stringify(r.doc.foi[0]?.cote), JSON.stringify([brut]));
});

test('pornirea: privirea „are cote?” cere judecata doar pentru o listă care nu e goală', () => {
  assert.equal(cuCote(cuCoteBrut([])), false);
  assert.equal(cuCote(documentNou(STOC)), false);
  assert.equal(cuCote(cuCoteBrut(BUNE)), true);
  assert.equal(cuCote(cuCoteBrut('stricat')), true, 'o valoare care nu e listă trebuie judecată (și refuzată)');
  assert.equal(cuCote(null), false);
});

test('jurnalul: `inlocuieste-cote` schimbă lista unei foi, cu anularea și refacerea exacte; lista goală scoate câmpul', () => {
  const d = documentNou(STOC);
  const f = d.foi[0];
  assert.ok(f);
  let h = istoricNou(d);
  h = executa(h, { tip: 'inlocuieste-cote', foaie: f.id, vechi: [], nou: [BUNE[0] as never] });
  assert.deepEqual(h.doc.foi[0]?.cote, [BUNE[0]]);
  assert.equal(h.doc.rev, d.rev + 1);
  h = anuleaza(h);
  assert.equal(jsonCanonic({ ...h.doc, rev: d.rev }), jsonCanonic(d), 'după anulare, documentul e cel de dinainte (fără câmpul `cote`)');
  h = reface(h);
  assert.deepEqual(h.doc.foi[0]?.cote, [BUNE[0]]);
  h = executa(h, { tip: 'inlocuieste-cote', foaie: f.id, vechi: [BUNE[0] as never], nou: [] });
  assert.ok(!Object.hasOwn(h.doc.foi[0] ?? {}, 'cote'), 'lista goală scoate câmpul');
  const r = incarca(JSON.parse(JSON.stringify(h.doc)));
  assert.ok(r.ok, motiv(r));
  assert.throws(() => executa(h, { tip: 'inlocuieste-cote', foaie: 'nu-exista', vechi: [], nou: [] }), /nu există/);
});

test('pornirea: fără judecata cotelor adusă, ușa documentului curent refuză un document cu cote; cu ea, îl primește', () => {
  // Un proces nou, cu doar ușa documentului curent (ca la pornire): aici, ușa întreagă a adus deja judecata.
  const cod = `
    const m = await import(${JSON.stringify(new URL('../../src/model/usaCurenta.ts', import.meta.url).href)});
    const d = ${JSON.stringify(cuCoteBrut(BUNE))};
    const fara = m.incarcaCurent(structuredClone(d));
    await import(${JSON.stringify(new URL('../../src/model/judecataCote.ts', import.meta.url).href)});
    const cu = m.incarcaCurent(structuredClone(d));
    const gol = ${JSON.stringify(cuCoteBrut([]))};
    console.log(JSON.stringify({ fara: fara.ok ? 'ok' : fara.motiv, cu: cu.ok, gol: m.incarcaCurent(gol).ok }));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', cod], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout.trim().split('\n').at(-1) ?? '{}') as { fara: string; cu: boolean; gol: boolean };
  assert.match(o.fara, /judecata lor nu e încărcată/);
  assert.equal(o.cu, true);
  assert.equal(o.gol, true, 'o listă goală nu cere judecata');
});
