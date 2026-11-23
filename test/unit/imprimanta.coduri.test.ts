/**
 * Felia 3.6v (ADR 0195 §A): codurile imprimantei explicate. Dicționarul familiei K1 (tabelul și textele în ambele limbi, cu
 * aceleași chei; linkurile doar spre wiki-ul Creality), generatorul și gărzile lui, forma citită din rețea, căutarea (întâi
 * cheia, apoi codul), pana de curent în driver și în evenimente, textul notificării cu explicația, setarea nouă și precache-ul.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { dictionarImprimanta, genereazaCoduriImprimanta } from '../../scripts/coduriImprimanta.ts';
import {
  esteDictionarImprimanta, explicaEroare, FAMILII_IMPRIMANTA, fisierCoduriImprimanta, WIKI_CREALITY, type DictionarImprimanta,
} from '../../shared/coduriImprimanta.ts';
import { motivPrecache } from '../../shared/precache.ts';
import { citesteSetari, SETARI_IMPLICITE, textEveniment } from '../../src/app/notificariImprimanta.ts';
import { CHEIE_NOTIFICARI } from '../../src/app/imprimantaLaPornire.ts';
import { adaugaMesaje } from '../../src/i18n/t.ts';
import { enImprimanta } from '../../src/i18n/imprimanta.en.ts';
import { roImprimanta } from '../../src/i18n/imprimanta.ro.ts';
import { CODURI_K1, LISTA_K1 } from '../../src/machine/imprimanta/coduri/k1.ts';
import { textK1En } from '../../src/machine/imprimanta/coduri/k1.en.ts';
import { textK1Ro } from '../../src/machine/imprimanta/coduri/k1.ro.ts';
import { citesteCadru, CREALITY_K1 } from '../../src/machine/imprimanta/creality.ts';
import { IMPRIMANTA_NECUNOSCUTA } from '../../src/machine/imprimanta/driver.ts';
import { cheieEveniment, evenimente, type Clipa, type Eveniment } from '../../src/machine/imprimanta/evenimente.ts';

adaugaMesaje({ ro: roImprimanta, en: enImprimanta });

const RO = dictionarImprimanta('creality-k1', 'ro');
const EN = dictionarImprimanta('creality-k1', 'en');

test('3.6v: dicționarul K1: aceleași chei în tabel și în ambele limbi, fiecare cu codul de pe ecran, titlul și ce faci', () => {
  const chei = Object.keys(CODURI_K1).map(Number).sort((a, b) => a - b);
  assert.equal(chei.length, 126);
  assert.deepEqual(Object.keys(textK1Ro).map(Number).sort((a, b) => a - b), chei);
  assert.deepEqual(Object.keys(textK1En).map(Number).sort((a, b) => a - b), chei);
  assert.deepEqual(Object.keys(RO.erori), chei.map(String));
  assert.deepEqual(Object.keys(EN.erori), chei.map(String));
  for (const k of chei) {
    const r = RO.erori[String(k)], e = EN.erori[String(k)];
    assert.ok(r && e, `cheia ${k}`);
    // Codul, gravitatea și pagina sunt ale cheii, nu ale limbii.
    assert.deepEqual([r.cod, r.grava, r.wiki], [e.cod, e.grava, e.wiki], `cheia ${k}`);
    // Codul de pe ecran poartă numărul cheii (cu literele categoriei sau fără): CX2585, AC0101, 2014.
    assert.match(r.cod, new RegExp(`^(?:[A-Z]{2})?0*${k}$`), `cheia ${k}: ${r.cod}`);
    for (const t of [r.titlu, r.faci, e.titlu, e.faci]) assert.ok(t.trim() !== '' && t.length <= 160, `cheia ${k}: „${t}”`);
    // Titlul e scurt, fără punct la capăt (notificarea pune „titlu. ce faci”); ce faci se încheie cu un punct.
    assert.doesNotMatch(r.titlu, /\.$/, `cheia ${k}`);
    assert.doesNotMatch(e.titlu, /\.$/, `cheia ${k}`);
    assert.match(r.faci, /\.$/, `cheia ${k}`);
    assert.match(e.faci, /\.$/, `cheia ${k}`);
  }
  // Cheile fără înțeles la Creality și cele ale Creality Print, nu ale imprimantei, lipsesc.
  for (const k of [2536, 2537, 2566, 2567, 2568, 20000, 20010]) assert.equal(Object.hasOwn(CODURI_K1, k), false, `cheia ${k}`);
  // Cele grave și cele obișnuite, cum le spune tabelul.
  assert.deepEqual([RO.erori['2585']?.grava, RO.erori['116']?.grava, RO.erori['801']?.grava], [true, false, false]);
  assert.equal(RO.erori['5000']?.cod, 'CC5000');
});

test('3.6v: linkurile duc doar spre wiki-ul Creality, în engleză; lista codurilor K1; 12 pagini', () => {
  assert.equal(LISTA_K1, 'https://wiki.creality.com/en/k1-flagship-series/k1-series-general-documents/error-code-summary');
  const cuPagina = Object.entries(CODURI_K1).filter(([, c]) => c.wiki !== undefined);
  assert.equal(cuPagina.length, 12);
  for (const [k, c] of cuPagina) assert.ok(c.wiki?.startsWith('https://wiki.creality.com/en/k1-flagship-series/'), `cheia ${k}: ${c.wiki}`);
  assert.equal(RO.erori['2509']?.wiki, 'https://wiki.creality.com/en/k1-flagship-series/k1-series-general-documents/2509-error-trouble-shooting');
  // 2571 are pagina lui (Creality Print trimitea la cea a lui 2121).
  assert.equal(RO.erori['2571']?.wiki, 'https://wiki.creality.com/en/k1-flagship-series/k1-series-general-documents/2571-error-troubleshooting');
  assert.equal(WIKI_CREALITY, 'https://wiki.creality.com/');
});

test('3.6v: generatorul: un fișier pe familie și limbă, cu forma citită de fereastră, sub plafonul de 8 kB gzip', () => {
  const g = genereazaCoduriImprimanta();
  assert.deepEqual([...g.keys()], ['coduri/creality-k1.ro.json', 'coduri/creality-k1.en.json']);
  assert.deepEqual(FAMILII_IMPRIMANTA, ['creality-k1']);
  assert.equal(fisierCoduriImprimanta('creality-k1', 'en'), 'coduri/creality-k1.en.json');
  for (const [cale, text] of g) {
    const limba = cale.endsWith('.ro.json') ? 'ro' : 'en';
    const d: unknown = JSON.parse(text);
    assert.ok(esteDictionarImprimanta(d, 'creality-k1', limba), cale);
    assert.ok(gzipSync(text, { level: 9 }).length / 1024 <= 8, `${cale}: ${(gzipSync(text, { level: 9 }).length / 1024).toFixed(1)} kB`);
  }
  assert.equal(RO.nume, 'Creality K1');
  assert.equal(RO.lista, LISTA_K1);
});

test('3.6v: gărzile generatorului: o cheie fără text sau un text fără cheie oprește generarea', () => {
  const faraUnul = Object.fromEntries(Object.entries(textK1Ro).filter(([k]) => k !== '2585'));
  assert.throws(() => dictionarImprimanta('creality-k1', 'ro', faraUnul), /chei fără text: 2585/);
  const cuUnulInPlus = { ...textK1Ro, 9999: { titlu: 'Ceva', faci: 'Altceva.' } };
  assert.throws(() => dictionarImprimanta('creality-k1', 'ro', cuUnulInPlus), /texte fără cheie: 9999/);
});

test('3.6v: forma citită din rețea: alt host, alt cod, altă familie sau limbă, o cheie stricată nu trec', () => {
  const baza = JSON.parse(JSON.stringify(RO)) as { erori: Record<string, Record<string, unknown>>; [k: string]: unknown };
  const cu = (f: (d: typeof baza) => void): unknown => {
    const d = JSON.parse(JSON.stringify(baza)) as typeof baza;
    f(d);
    return d;
  };
  assert.ok(esteDictionarImprimanta(cu(() => undefined), 'creality-k1', 'ro'));
  assert.equal(esteDictionarImprimanta(cu(() => undefined), 'creality-k1', 'en'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { d['familie'] = 'alta'; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { d['schema'] = 2; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { (d.erori['2509'] as Record<string, unknown>)['wiki'] = 'https://exemplu.ro/2509'; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { (d.erori['2509'] as Record<string, unknown>)['wiki'] = 'https://wiki.creality.com/" onclick="x'; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { d['lista'] = 'http://wiki.creality.com/en/'; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { (d.erori['2585'] as Record<string, unknown>)['cod'] = '<b>2585</b>'; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { (d.erori['2585'] as Record<string, unknown>)['grava'] = 'da'; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { (d.erori['2585'] as Record<string, unknown>)['faci'] = ''; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { d.erori['0'] = { ...d.erori['2585'] }; }), 'creality-k1', 'ro'), false);
  assert.equal(esteDictionarImprimanta(cu((d) => { d.erori['25x'] = { ...d.erori['2585'] }; }), 'creality-k1', 'ro'), false);
});

test('3.6v: căutarea: întâi cheia, apoi codul; un număr necunoscut, ca atare; fără eroare, nimic', () => {
  const d: DictionarImprimanta = RO;
  assert.deepEqual(explicaEroare(d, 2585, 2585), { numar: 2585, intrare: d.erori['2585'] });
  // Cheia înaintea codului, chiar dacă și codul e în dicționar.
  assert.equal(explicaEroare(d, 2509, 2585)?.intrare?.cod, 'CX2585');
  // O cheie necunoscută: codul, dacă e cunoscut (CC5000 al K1C-ului owner-ului, cu o cheie care nu-i aparține).
  assert.deepEqual(explicaEroare(d, 5000, 12), { numar: 5000, intrare: d.erori['5000'] });
  // Cheia 0 (fără cheie): codul.
  assert.equal(explicaEroare(d, 5000, 0)?.intrare?.cod, 'CC5000');
  assert.equal(explicaEroare(d, 5000, null)?.intrare?.cod, 'CC5000');
  // Niciunul cunoscut: numărul arătat e cheia.
  assert.deepEqual(explicaEroare(d, 7777, 4410), { numar: 4410, intrare: null });
  assert.deepEqual(explicaEroare(d, 4410, null), { numar: 4410, intrare: null });
  assert.equal(explicaEroare(d, null, null), null);
  assert.equal(explicaEroare(d, 0, 0), null);
});

test('3.6v: pana de curent în driver (`repoPlrStatus`): 1 da, 0 nu, lipsă nespus; K1 are dicționarul `creality-k1`', () => {
  assert.equal(citesteCadru('{"repoPlrStatus":1}').stare.reluareDupaPana, true);
  assert.equal(citesteCadru('{"repoPlrStatus":0}').stare.reluareDupaPana, false);
  assert.equal(citesteCadru('{"state":1}').stare.reluareDupaPana, undefined);
  assert.equal(IMPRIMANTA_NECUNOSCUTA.reluareDupaPana, null);
  assert.equal(CREALITY_K1.coduri, 'creality-k1');
});

const F = '/usr/data/printer_data/gcodes/placute_PLA_18m.gcode';
const clipa = (x: Partial<Clipa> = {}): Clipa => ({
  legatura: 'vie', lucrare: 'imprima', fisier: F, eroare: null, cheieEroare: null, faraFilament: false, reluareDupaPana: false, strat: 5,
  pauzaFisier: null, trecut: 600, filament: 2000, ...x,
});

test('3.6v: evenimentele: pana de curent o dată, la schimbare; eroarea poartă și codul', () => {
  const [p] = evenimente(clipa({ lucrare: 'libera', fisier: null }), clipa({ lucrare: 'libera', fisier: null, reluareDupaPana: true }));
  assert.deepEqual(p, { fel: 'pana', fisier: null, strat: null, nota: null, cheie: null, cod: null, durata: null, filament: null });
  assert.deepEqual(evenimente(clipa({ reluareDupaPana: true }), clipa({ reluareDupaPana: true })), []);
  assert.deepEqual(evenimente(clipa({ reluareDupaPana: null }), clipa({ reluareDupaPana: false })), []);
  // Prima clipă după legare nu spune nimic (o legare nouă nu repetă).
  assert.deepEqual(evenimente(null, clipa({ reluareDupaPana: true })), []);
  // Cu legătura pierdută, nimic; la revenire, se anunță.
  assert.deepEqual(evenimente(clipa(), clipa({ legatura: 'pierduta', reluareDupaPana: true })).map((e) => e.fel), ['pierduta']);
  assert.deepEqual(evenimente(clipa({ legatura: 'pierduta' }), clipa({ reluareDupaPana: true })).map((e) => e.fel), ['pana']);
  const [e] = evenimente(clipa(), clipa({ eroare: 5000, cheieEroare: 12 }));
  assert.deepEqual([e?.fel, e?.cheie, e?.cod], ['eroare', 12, 5000]);
  const [f] = evenimente(clipa(), clipa({ eroare: 5000, cheieEroare: null }));
  assert.deepEqual([f?.cheie, f?.cod], [5000, 5000]);
  assert.equal(cheieEveniment(p as Eveniment), 'pana||');
});

test('3.6v: notificarea unei erori, cu explicația: codul de pe ecran în titlu, ce s-a întâmplat și ce faci în text; altfel, cheia', () => {
  const durata = (x: number): string => `${Math.round(x / 60)} min`;
  const e: Eveniment = { fel: 'eroare', fisier: F, strat: null, nota: null, cheie: 2586, cod: 2586, durata: null, filament: null };
  assert.deepEqual(textEveniment(e, 'K1C-8578', 'placute_PLA_18m.gcode', durata, RO.erori['2586'] ?? null), {
    titlu: 'K1C-8578: eroare CY2586',
    corp: 'Coordonatele Y ies din cursă. Fișierul cere o mișcare pe Y dincolo de pat. Refeliază-l pentru imprimanta ta sau mută piesele spre mijlocul patului.',
  });
  assert.deepEqual(textEveniment(e, 'K1C-8578', 'placute_PLA_18m.gcode', durata), {
    titlu: 'K1C-8578: o eroare', corp: 'Cheia 2586: textul ei e pe ecranul imprimantei.',
  });
  // Explicația contează doar la o eroare.
  const g: Eveniment = { ...e, fel: 'pana', cheie: null, cod: null };
  assert.deepEqual(textEveniment(g, 'K1C-8578', '', durata, RO.erori['2586'] ?? null), {
    titlu: 'K1C-8578: pană de curent', corp: 'Imprimarea s-a oprit la o pană de curent. Imprimanta te întreabă pe ecran dacă o reia.',
  });
});

test('3.6v: setarea „Pană de curent”, pornită implicit; o setare veche (fără ea) o primește pornită', () => {
  assert.equal(SETARI_IMPLICITE.evenimente.pana, true);
  const vechi = JSON.stringify({ v: 1, evenimente: { gata: true, eroare: false, primulStrat: true }, sunet: false });
  const s = citesteSetari({ getItem: (k) => (k === CHEIE_NOTIFICARI ? vechi : null), setItem: () => undefined });
  assert.deepEqual([s.evenimente.pana, s.evenimente.eroare, s.evenimente.primulStrat, s.sunet], [true, false, true, false]);
});

test('3.6v: dicționarul imprimantei e în precache, ca al controlerelor; alte fișiere din coduri/, nu', () => {
  assert.equal(motivPrecache('coduri/creality-k1.ro.json'), 'precache');
  assert.equal(motivPrecache('coduri/creality-k1.en.json'), 'precache');
  assert.equal(motivPrecache('coduri/ro.json'), 'precache');
  assert.notEqual(motivPrecache('coduri/creality-k1.de.json'), 'precache');
  assert.notEqual(motivPrecache('coduri/Creality-K1.ro.json'), 'precache');
  assert.notEqual(motivPrecache('coduri/creality-k1.ro.json.map'), 'precache');
});
