/**
 * Filele Roadmap și Documentație din `/admin` (ADR 0048), partea pură: adresa din `#` (fila, documentul, ancora),
 * aducerea fișierelor generate (o singură cerere, eșecul nu rămâne ținut minte, forma verificată) și ce arată cronologia
 * (progresul unei etape, intervalul unei felii, etapa aleasă implicit).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteAdresa, scrieAdresa } from '../../src/admin/adresa.ts';
import { aducatorDocumentatie } from '../../src/admin/documentatie/aducere.ts';
import { aduseGata, etapaImplicita, interval, progresEtapa, reperLive } from '../../src/admin/roadmap/vedere.ts';
import type { Etapa, Felie, Roadmap } from '../../shared/documentatie.ts';

test('adresa: fila, documentul și ancora, dus-întors; ce nu e o filă sau o cale de document e ignorat', () => {
  assert.deepEqual(citesteAdresa('#roadmap'), { fila: 'roadmap', document: null, ancora: null });
  assert.deepEqual(citesteAdresa('#documentatie'), { fila: 'documentatie', document: null, ancora: null });
  assert.deepEqual(citesteAdresa('#documentatie/docs/adr/0047-nucleul-de-simulare.md'), { fila: 'documentatie', document: 'docs/adr/0047-nucleul-de-simulare.md', ancora: null });
  assert.deepEqual(citesteAdresa('#documentatie/PLAN.md#5.4-etapele'), { fila: 'documentatie', document: 'PLAN.md', ancora: '5.4-etapele' });
  assert.deepEqual(citesteAdresa('#erori'), { fila: 'erori', document: null, ancora: null });
  assert.equal(citesteAdresa(''), null);
  assert.equal(citesteAdresa('#altceva'), null);
  // O cale care iese din documentație sau nu e un .md: fila rămâne, documentul nu.
  for (const rau of ['#documentatie/../secret.md', '#documentatie/docs/x.txt', '#documentatie/%2e%2e/a.md', '#documentatie/a<b>.md', '#documentatie/%E0%A4%A']) {
    assert.deepEqual(citesteAdresa(rau), { fila: 'documentatie', document: null, ancora: null }, rau);
  }
  for (const a of [
    { fila: 'roadmap' as const, document: null, ancora: null },
    { fila: 'documentatie' as const, document: 'docs/etape/etapa-03.md', ancora: 'jurnalul-feliilor' },
    { fila: 'documentatie' as const, document: 'docs/adr/0037-contururile-deschise.md', ancora: 'ce-îi-trebuie' },
  ]) assert.deepEqual(citesteAdresa(scrieAdresa(a)), a);
  assert.equal(scrieAdresa({ fila: 'documentatie', document: 'docs/adr/README.md', ancora: null }), '#documentatie/docs/adr/README.md');
});

const ROADMAP_MIC: Roadmap = {
  schema: 1, limba: 'ro', netraduse: 0, etape: [], owner: [], adr: {},
  cifre: { saptamani: 0, etape: 0, tampoane: 0, etapeGata: 0, etapaCurenta: null, felii: { gata: 0, inLucru: 0, deFacut: 0, aduse: 0 }, adr: { total: 0, acceptate: 0, propuse: 0, inlocuite: 0, altele: 0 }, placi: { fise: 0, taiate: 0 } },
};

/** Un `fetch` fals: răspunsurile pe rând, cu cererile numărate. */
function fals(raspunsuri: Array<() => Promise<Response>>): { readonly aduce: (u: string) => Promise<Response>; readonly cereri: string[] } {
  const cereri: string[] = [];
  return { cereri, aduce: (u) => { cereri.push(u); const r = raspunsuri.shift(); return r ? r() : Promise.reject(new Error('nicio cerere în plus')); } };
}
const json = (x: unknown, status = 200): Promise<Response> => Promise.resolve(new Response(JSON.stringify(x), { status }));

test('aducerea: o singură cerere pentru același fișier, la adresa lui', async () => {
  const f = fals([() => json(ROADMAP_MIC)]);
  const d = aducatorDocumentatie(f.aduce);
  const [a, b] = await Promise.all([d.roadmap('ro'), d.roadmap('ro')]);
  assert.equal(a, b);
  assert.deepEqual(f.cereri, ['/documentatie/roadmap.json']);
});

test('aducerea în engleză (ADR 0056): fișierul ei, separat de cel român; fără `limba` / `netraduse`, forma e refuzată', async () => {
  const f = fals([() => json({ ...ROADMAP_MIC, limba: 'en', netraduse: 2 }), () => json(ROADMAP_MIC)]);
  const d = aducatorDocumentatie(f.aduce);
  assert.equal((await d.roadmap('en')).netraduse, 2);
  assert.equal((await d.roadmap('ro')).limba, 'ro');
  assert.deepEqual(f.cereri, ['/documentatie/roadmap.en.json', '/documentatie/roadmap.json']);
  const { limba: _l, ...faraLimba } = ROADMAP_MIC;
  const g = fals([() => json(faraLimba)]);
  await assert.rejects(aducatorDocumentatie(g.aduce).roadmap('ro'), (e: unknown) => e instanceof Error && e.message === 'forma');
});

test('aducerea: un eșec (rețeaua, 404, altă formă) nu rămâne ținut minte; cererea următoare încearcă din nou', async () => {
  const f = fals([
    () => Promise.reject(new TypeError('Failed to fetch')),
    () => json({ eroare: 1 }, 404),
    () => Promise.resolve(new Response('<!doctype html><html>aplicația</html>', { status: 200 })),
    // Forma întreagă, dar altă schemă (un build viitor): tot „forma”.
    () => json({ ...ROADMAP_MIC, schema: 2 }),
    () => json(ROADMAP_MIC),
  ]);
  const d = aducatorDocumentatie(f.aduce);
  await assert.rejects(d.roadmap('ro'), /Failed to fetch/);
  await assert.rejects(d.roadmap('ro'), /HTTP 404/);
  await assert.rejects(d.roadmap('ro'), (e: unknown) => e instanceof Error && e.message === 'forma');
  await assert.rejects(d.roadmap('ro'), (e: unknown) => e instanceof Error && e.message === 'forma');
  assert.equal((await d.roadmap('ro')).schema, 1);
  assert.equal(f.cereri.length, 5);
});

test('aducerea unui document: calea codată pe segmente, textul ca atare; catalogul verificat', async () => {
  const f = fals([
    () => Promise.resolve(new Response('# Titlu\n', { status: 200 })),
    () => json({ schema: 1, documente: [{ cale: 'PLAN.md', eticheta: 'Planul', categorie: 'plan' }] }),
  ]);
  const d = aducatorDocumentatie(f.aduce);
  assert.equal(await d.document('docs/adr/0001-ă b.md'), '# Titlu\n');
  assert.equal((await d.catalog()).documente.length, 1);
  assert.deepEqual(f.cereri, ['/documentatie/doc/docs/adr/0001-%C4%83%20b.md', '/documentatie/catalog.json']);
});

const felie = (id: string, stare: Felie['stare'], adusa = false): Felie => ({
  id, titlu: id, descriere: '', stare, started: null, completed: null, treceri: null, nota: '', notaIntreaga: '', adr: [], adusa,
  parinte: null, jurnal: null, dinSubfelii: false,
});
const etapa = (x: Partial<Etapa>): Etapa => ({
  id: '1', numar: 1, saptamana: 1, tinta: '', inchide: '', placa: '', live: '', areLive: false, stare: 'viitoare', curenta: false,
  asteaptaPlaca: false, fisa: null, pornita: null, fisaPlacii: null, placaTaiata: null, felii: [], puncte: [],
  prag: { facut: 0, inLucru: 0, deFacut: 0, fara: 0 }, ...x,
});

test('progresul unei etape: feliile gata din toate; fără fișă, punctele planului atinse de felii aduse', () => {
  assert.deepEqual(progresEtapa(etapa({ fisa: 'a.md', felii: [felie('1.1', 'gata'), felie('1.2', 'in-lucru'), felie('1.3', 'de-facut')] })), { gata: 1, total: 3, fel: 'felii' });
  assert.deepEqual(progresEtapa(etapa({
    felii: [felie('4.2↑', 'gata', true)],
    puncte: [{ numar: 1, titlu: '', descriere: '', felii: [] }, { numar: 2, titlu: '', descriere: '', felii: ['4.2↑'] }],
  })), { gata: 1, total: 2, fel: 'puncte' });
  assert.deepEqual(progresEtapa(etapa({})), { gata: 0, total: 0, fel: 'nimic' });
  // Fără fișă și fără puncte: rândurile de prag pe care le închide (făcut = 1, în lucru = ½); cele fără rând nu intră.
  const prag = { facut: 1, inLucru: 1, deFacut: 2, fara: 1 };
  assert.deepEqual(progresEtapa(etapa({ prag })), { gata: 1.5, total: 4, fel: 'prag' });
  // Punctele planului și fișa au întâietate.
  assert.equal(progresEtapa(etapa({ prag, puncte: [{ numar: 1, titlu: '', descriere: '', felii: [] }] })).fel, 'puncte');
  assert.equal(progresEtapa(etapa({ prag, fisa: 'a.md', felii: [felie('1.1', 'gata')] })).fel, 'felii');
  assert.deepEqual(progresEtapa(etapa({ prag: { facut: 0, inLucru: 0, deFacut: 0, fara: 3 } })), { gata: 0, total: 0, fel: 'nimic' });
});

test('cronologia: feliile aduse înainte și gata, numărate pe etapele fără fișă; pe etapa cu fișă, nimic în plus', () => {
  const aduse = [felie('6.A↑', 'gata', true), felie('6.B↑', 'gata', true), felie('6.C↑', 'in-lucru', true)];
  assert.equal(aduseGata(etapa({ felii: aduse })), 2);
  assert.equal(aduseGata(etapa({ fisa: 'docs/etape/etapa-03.md', felii: [felie('3.1', 'gata'), felie('6.A↑', 'gata', true)] })), 0);
  assert.equal(aduseGata(etapa({ felii: [felie('5.1', 'gata')] })), 0);
});

test('intervalul unei felii: aceeași zi o singură dată; zile diferite întregi; neterminată cu săgeata deschisă', () => {
  assert.equal(interval('16.10 21:35', '16.10 22:20'), '16.10 21:35 → 22:20');
  assert.equal(interval('09.10 21:57', '10.10 09:20'), '09.10 21:57 → 10.10 09:20');
  assert.equal(interval('16.10', '17.10 14:45'), '16.10 → 17.10 14:45');
  assert.equal(interval('16.10', '16.10'), '16.10');
  assert.equal(interval('02.01 12:00', null), '02.01 12:00 →');
  assert.equal(interval(null, null), '');
});

test('reperul unui live: ce spune coloana în afară de „da” (primul, pachetul la ateliere, lansarea); nimic pe un live obișnuit', () => {
  assert.equal(reperLive('**da (primul)**'), 'primul');
  assert.equal(reperLive('da; **pachetul la ateliere**'), 'pachetul la ateliere');
  assert.equal(reperLive('da; **proba închisă pornește în săptămâna 15**'), 'proba închisă pornește în săptămâna 15');
  assert.equal(reperLive('**lansarea**'), 'lansarea');
  assert.equal(reperLive('da'), null);
  assert.equal(reperLive('nu'), null);
});

test('etapa aleasă implicit: cea curentă; fără ea, prima', () => {
  const e = [etapa({ id: '1' }), etapa({ id: '2', curenta: true }), etapa({ id: 'T1', numar: null })];
  assert.equal(etapaImplicita({ ...ROADMAP_MIC, etape: e }), '2');
  assert.equal(etapaImplicita({ ...ROADMAP_MIC, etape: [etapa({ id: '1' })] }), '1');
  assert.equal(etapaImplicita(ROADMAP_MIC), null);
});
