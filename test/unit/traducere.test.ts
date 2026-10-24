import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { esteRoadmap, FISIER_ROADMAP, FISIER_ROADMAP_EN, type Etapa, type Felie, type Roadmap } from '../../shared/documentatie.ts';
import { genereazaDocumentatia, primaPropozitie } from '../../scripts/documentatie.ts';
import {
  amprenta, CALE_DICTIONAR_EN, citesteDictionar, dictionarLaZi, textePentruTraducere, traduceRoadmap, type DictionarFisier,
} from '../../scripts/traducere.ts';

/** Roadmap-ul în engleză (ADR 0056): dicționarul cu amprenta textului român, traducerea, lipsurile; și roadmap-ul real. */

const felie = (id: string, titlu: string, descriere: string, nota: string): Felie => ({
  id, titlu, descriere, stare: 'gata', started: '20.10 10:00', completed: '20.10 11:00', treceri: 1, nota: primaPropozitie(nota),
  notaIntreaga: nota, adr: [], adusa: false, parinte: null, jurnal: 'docs/etape/etapa-03.md', dinSubfelii: false,
});
const etapa = (felii: Felie[]): Etapa => ({
  id: '3', numar: 3, saptamana: 3, tinta: 'Ținta', inchide: '—', placa: 'placa 3', live: 'da', areLive: true, stare: 'in-lucru',
  curenta: true, asteaptaPlaca: false, fisa: 'docs/etape/etapa-03.md', pornita: '16.10', fisaPlacii: null, placaTaiata: null,
  felii, puncte: [{ numar: 1, titlu: 'Punctul', descriere: 'Descrierea punctului.', felii: [] }],
});
const MIC: Roadmap = {
  schema: 1, limba: 'ro', netraduse: 0,
  etape: [etapa([felie('3.1', 'Jurnalul', 'Jurnalul de erori.', 'Prima propoziție. A doua propoziție.'), felie('3.2', 'Ținta', 'Raportorul.', '')])],
  owner: [{ ce: 'Placa 1', pentru: '3.5', termen: 'cât mai curând', etapa: '3', fisa: 'docs/etape/etapa-03.md', ancora: null }],
  adr: { '0039': { cale: 'docs/adr/0039-jurnalul.md', titlu: 'Jurnalul de erori pe server', stare: 'acceptat' } },
  cifre: { saptamani: 33, etape: 30, tampoane: 3, etapeGata: 0, etapaCurenta: '3', felii: { gata: 2, inLucru: 0, deFacut: 0, aduse: 0 }, adr: { total: 1, acceptate: 1, propuse: 0, inlocuite: 0, altele: 0 }, placi: { fise: 0, taiate: 0 } },
};
const dictionar = (perechi: Array<[string, string]>): DictionarFisier => ({
  schema: 1, texte: Object.fromEntries(perechi.map(([ro, en]) => [amprenta(ro), { ro, en }])),
});

test('amprenta: sha256, primii 16 hex, aceeași pentru același text; textele de tradus, unice, fără liniuță și gol', () => {
  assert.match(amprenta('Ținta'), /^[0-9a-f]{16}$/);
  assert.equal(amprenta('Ținta'), amprenta('Ținta'));
  assert.notEqual(amprenta('Ținta'), amprenta('Ținta '));
  const t = textePentruTraducere(MIC);
  // „Ținta” apare de două ori (ținta etapei și titlul feliei 3.2): o singură dată; „—” și nota goală nu se traduc.
  assert.equal(t.filter((s) => s === 'Ținta').length, 1);
  assert.ok(!t.includes('—') && !t.includes(''));
  assert.ok(t.includes('Prima propoziție. A doua propoziție.') && !t.includes('Prima propoziție.'), 'nota scurtă se derivează, nu se traduce');
  assert.deepEqual(t.slice(-4), ['Placa 1', '3.5', 'cât mai curând', 'Jurnalul de erori pe server']);
});

test('traducerea: fiecare text din dicționar; nota scurtă din nota întreagă tradusă; ce lipsește rămâne în română, numărat', () => {
  const d = dictionar([
    ['Ținta', 'The goal'], ['placa 3', 'plate 3'], ['da', 'yes'], ['Jurnalul', 'The log'], ['Jurnalul de erori.', 'The error log.'],
    ['Prima propoziție. A doua propoziție.', 'First sentence. Second sentence.'], ['Punctul', 'The point'],
    ['Descrierea punctului.', 'The point\'s description.'], ['Placa 1', 'Plate 1'], ['3.5', '3.5'], ['cât mai curând', 'as soon as possible'],
    ['Jurnalul de erori pe server', 'Server-side error log'],
  ]);
  const { roadmap: en, lipsa } = traduceRoadmap(MIC, d, primaPropozitie);
  assert.equal(en.limba, 'en');
  assert.deepEqual(lipsa, ['Raportorul.']);
  assert.equal(en.netraduse, 1);
  const [f1, f2] = en.etape[0]?.felii ?? [];
  assert.deepEqual([f1?.titlu, f1?.descriere, f1?.notaIntreaga, f1?.nota], ['The log', 'The error log.', 'First sentence. Second sentence.', 'First sentence.']);
  assert.deepEqual([f2?.titlu, f2?.descriere, f2?.nota], ['The goal', 'Raportorul.', '']);
  assert.deepEqual([en.etape[0]?.tinta, en.etape[0]?.inchide, en.etape[0]?.live], ['The goal', '—', 'yes']);
  assert.equal(en.etape[0]?.puncte[0]?.descriere, 'The point\'s description.');
  assert.deepEqual([en.owner[0]?.ce, en.owner[0]?.termen], ['Plate 1', 'as soon as possible']);
  assert.equal(en.adr['0039']?.titlu, 'Server-side error log');
  // Restul rămâne neschimbat: id-urile, stările, datele, cifrele.
  assert.deepEqual([en.etape[0]?.id, f1?.id, f1?.stare, f1?.started, en.cifre], [MIC.etape[0]?.id, '3.1', 'gata', '20.10 10:00', MIC.cifre]);
  assert.ok(esteRoadmap(JSON.parse(JSON.stringify(en))));
  // Fără dicționar: totul în română, toate numărate.
  const gol = traduceRoadmap(MIC, null, primaPropozitie);
  assert.equal(gol.roadmap.netraduse, textePentruTraducere(MIC).length);
  // O intrare a cărei română nu e textul (alt text cu aceeași amprentă): nu se folosește.
  const strain: DictionarFisier = { schema: 1, texte: { [amprenta('Ținta')]: { ro: 'Altceva', en: 'Wrong' } } };
  assert.equal(traduceRoadmap(MIC, strain, primaPropozitie).roadmap.etape[0]?.tinta, 'Ținta');
});

test('dicționarul la zi: păstrează traducerile folosite, adaugă gol ce e nou, scoate ce nu mai e folosit; cheile sortate', () => {
  const vechi = dictionar([['Ținta', 'The goal'], ['Vechi', 'Old']]);
  const { dictionar: d, noi, scoase } = dictionarLaZi(['Ținta', 'Nou'], vechi);
  assert.deepEqual([noi, scoase], [1, 1]);
  assert.equal(d.texte[amprenta('Ținta')]?.en, 'The goal');
  assert.deepEqual(d.texte[amprenta('Nou')], { ro: 'Nou', en: '' });
  assert.equal(d.texte[amprenta('Vechi')], undefined);
  assert.deepEqual(Object.keys(d.texte), Object.keys(d.texte).slice().sort());
  // Citirea: forma greșită = null; intrările goale nu se iau drept traduceri.
  for (const rau of ['nu json', '{"schema":2,"texte":{}}', '{"schema":1}', '{"schema":1,"texte":{"a":{"ro":1,"en":"x"}}}']) assert.equal(citesteDictionar(rau), null, rau);
  const citit = citesteDictionar(JSON.stringify(d));
  assert.ok(citit);
  assert.equal(citit?.texte[amprenta('Nou')], undefined);
});

test('roadmap-ul real: fișierul în engleză are forma, toate textele traduse și niciuna nefolosită (traducerea vine cu fișa)', () => {
  const fisiere = genereazaDocumentatia(process.cwd());
  const ro: unknown = JSON.parse(fisiere.get(FISIER_ROADMAP) ?? 'null');
  const en: unknown = JSON.parse(fisiere.get(FISIER_ROADMAP_EN) ?? 'null');
  assert.ok(esteRoadmap(ro) && esteRoadmap(en));
  if (!esteRoadmap(ro) || !esteRoadmap(en)) return;
  assert.deepEqual([ro.limba, ro.netraduse, en.limba], ['ro', 0, 'en']);
  const dict = citesteDictionar(readFileSync(CALE_DICTIONAR_EN, 'utf8'));
  const { noi, scoase } = dictionarLaZi(textePentruTraducere(ro), dict);
  assert.equal(noi, 0, `${noi} texte fără traducere: rulează „npm run traduceri” și completează „en” în ${CALE_DICTIONAR_EN}`);
  assert.equal(scoase, 0, `${scoase} traduceri nefolosite: „npm run traduceri” le scoate`);
  assert.equal(en.netraduse, 0);
  // Aceeași structură: etapele, feliile și stările lor.
  assert.deepEqual(en.etape.map((e) => [e.id, e.stare, e.felii.map((f) => [f.id, f.stare])]), ro.etape.map((e) => [e.id, e.stare, e.felii.map((f) => [f.id, f.stare])]));
});
