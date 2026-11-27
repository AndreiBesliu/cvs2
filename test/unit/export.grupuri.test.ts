/**
 * Fișa fiecărei operații în fereastra exportului (ADR 0290, felia 28.8↑a), pe hârtie: grupurile fiecărui fel de operație, în
 * ordine, grupul fiecărui câmp al ferestrei (un câmp nou fără grup cade aici) și grupul în care se spune fiecare valoare greșită.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GRUP_CAMP, GRUP_VERDICT, GRUPURI_FOAIE, GRUPURI_MASINA, GRUPURI_RELIEF, grupuriGresite, grupuriOperatie, verdicteGresite, type FelFisa, type VerdictRand,
} from '../../src/ui/exportGrupuri.ts';

// Câmpurile stau în fereastră (foaia, mașina), în fișa operației, scoasă într-o componentă a ei (28.8↑f-3), și în fișa
// operațiilor reliefului (felia 18.1↑d-4).
const SURSA = ['DialogExport.tsx', 'FisaOperatie.tsx', 'FisaFinisare.tsx'].map((f) => readFileSync(new URL(`../../src/ui/${f}`, import.meta.url), 'utf8')).join('\n');

/**
 * Câmpurile ferestrei, din sursă: `data-camp="x"` (și pe cartonașe, din 28.8↑b-2, scris tot așa, pentru catalogul controalelor)
 * și listele frezelor de rest (`${pre}rest-…`, pe trei liste).
 */
function campuriDinSursa(): Set<string> {
  const out = new Set<string>();
  for (const m of SURSA.matchAll(/data-camp="([a-z0-9-]+)"/g)) out.add(m[1] ?? '');
  for (const m of SURSA.matchAll(/data-camp=\{`\$\{pre\}([a-z0-9-]+)`\}/g)) for (const pre of ['', 'fund-', 'dop-']) out.add(`${pre}${m[1] ?? ''}`);
  return out;
}

test('fiecare câmp al ferestrei are grupul lui, iar fiecare intrare a hărții e un câmp al ferestrei', () => {
  const campuri = campuriDinSursa();
  // Proba se sprijină pe forma sursei: fără câmpurile ei știute, ar trece goală.
  for (const c of ['adancime', 'pas', 'latura', 'urechi-lemn', 'urechi-mijloc', 'fund-rest-pas', 'dop-rest-scula', 'inc-treapta-latime', 'relief-pas-lateral', 'relief-z']) assert.ok(campuri.has(c), c);
  const fara = [...campuri].filter((c) => !(c in GRUP_CAMP));
  assert.deepEqual(fara, [], `câmpuri fără grup: ${fara.join(', ')}`);
  const straine = Object.keys(GRUP_CAMP).filter((c) => !campuri.has(c));
  assert.deepEqual(straine, [], `grupuri pentru câmpuri care nu mai sunt: ${straine.join(', ')}`);
});

const fel = (f: Partial<FelFisa>): FelFisa => ({ tip: 'profil', deschis: false, inele: true, incrustatie: false, banda: false, incrustatieDreapta: false, ...f });

test('grupurile fiecărui fel de operație, în ordinea din fereastră; ce nu se aplică nu apare', () => {
  assert.deepEqual(grupuriOperatie(fel({})), ['taietura', 'freza', 'adancime', 'sens', 'rampa', 'intrari', 'colturi', 'urechi']);
  // O cale deschisă: rampa, intrările, degajările și urechile vin într-o versiune următoare (ADR 0037 §12).
  assert.deepEqual(grupuriOperatie(fel({ deschis: true })), ['taietura', 'freza', 'adancime', 'sens']);
  assert.deepEqual(grupuriOperatie(fel({ tip: 'gaurire' })), ['taietura', 'freza', 'adancime', 'sens', 'gaurire']);
  assert.deepEqual(grupuriOperatie(fel({ tip: 'buzunar' })), ['taietura', 'freza', 'adancime', 'sens', 'golire', 'coborare', 'rest']);
  // Pe linii paralele, buzunarul coboară prin plonjare: fără grupul coborârii (ADR 0094).
  assert.deepEqual(grupuriOperatie(fel({ tip: 'buzunar', inele: false })), ['taietura', 'freza', 'adancime', 'sens', 'golire', 'rest']);
  assert.deepEqual(grupuriOperatie(fel({ tip: 'buzunar', incrustatieDreapta: true })),
    ['taietura', 'freza', 'adancime', 'sens', 'golire', 'coborare', 'rest', 'locas', 'treapta', 'dop']);
  assert.deepEqual(grupuriOperatie(fel({ tip: 'vcarve' })), ['taietura', 'freza', 'adancime', 'sens', 'fund']);
  assert.deepEqual(grupuriOperatie(fel({ tip: 'vcarve', incrustatie: true })), ['taietura', 'freza', 'adancime', 'sens', 'fund', 'incrustatie']);
  assert.deepEqual(grupuriOperatie(fel({ tip: 'vcarve', incrustatie: true, banda: true })), ['taietura', 'freza', 'adancime', 'sens', 'fund', 'incrustatie', 'banda']);
  // Banda e a incrustației: fără ea, nimic.
  assert.deepEqual(grupuriOperatie(fel({ tip: 'vcarve', banda: true })), ['taietura', 'freza', 'adancime', 'sens', 'fund']);
  assert.deepEqual(GRUPURI_FOAIE, ['foi', 'origine', 'z0']);
  assert.deepEqual(GRUPURI_MASINA, ['post', 'unitati', 'fisier', 'schimbare', 'aer', 'setari']);
});

const bun: VerdictRand = {
  scula: true, adancime: true, pas: true, numar: true, latime: true, grosime: true, rampa: true, intrari: true, pasLateral: true, coborare: true,
  retragere: true, vcarve: true, fund: true, varf: true, vPeLinie: true, rotunda: true, rest: true, strategie: true, incrustatie: true, dreapta: true, frezaDop: true,
  banda: true, puntiDop: true,
};

test('valoarea greșită se spune în grupul câmpului de reparat', () => {
  assert.deepEqual(grupuriGresite(bun), []);
  // Incrustația în V pornită cu freza plată (captura din 23.11): greșeala e la Freza, nu sub tabel.
  assert.deepEqual(grupuriGresite({ ...bun, vcarve: false }), ['freza']);
  assert.deepEqual(grupuriGresite({ ...bun, adancime: false, pas: false }), ['adancime']);
  assert.deepEqual(grupuriGresite({ ...bun, grosime: false, coborare: false }), ['urechi', 'coborare']);
  assert.deepEqual(verdicteGresite({ ...bun, pas: false, dreapta: false }), [['pas', 'adancime'], ['dreapta', 'dop']]);
  // Fiecare verdict are un grup în care se poate arăta: unul dintre cele ale operațiilor.
  const toate = new Set([...grupuriOperatie(fel({})), ...grupuriOperatie(fel({ tip: 'buzunar', incrustatieDreapta: true })), ...grupuriOperatie(fel({ tip: 'gaurire' })),
    ...grupuriOperatie(fel({ tip: 'vcarve', incrustatie: true, banda: true }))]);
  for (const [k, g] of Object.entries(GRUP_VERDICT)) assert.ok(toate.has(g), `${k} → ${g}`);
});

test('grupurile operațiilor reliefului (felia 18.1↑d-4): adaosul doar la degroșare; fiecare câmp `relief-` stă într-unul dintre ele', () => {
  assert.deepEqual(GRUPURI_RELIEF.finisare, ['freza-relief', 'linii', 'margine', 'podea']);
  assert.deepEqual(GRUPURI_RELIEF.degrosare, ['freza-relief', 'linii', 'adaos', 'margine', 'podea']);
  const ale = new Set(GRUPURI_RELIEF.degrosare);
  const relief = Object.entries(GRUP_CAMP).filter(([c]) => c.startsWith('relief-'));
  // 14 din felia 18.1↑d-4, plus lista „Din frezele mele” (18.1↑d-5).
  assert.equal(relief.length, 15);
  for (const [c, g] of relief) assert.ok(g.length === 1 && ale.has(g[0]!), `${c} → ${g.join(', ')}`);
  // Și invers: grupurile reliefului nu primesc câmpurile celorlalte operații.
  for (const [c, g] of Object.entries(GRUP_CAMP)) if (!c.startsWith('relief-')) assert.ok(g.every((x) => !['freza-relief', 'linii', 'adaos', 'margine', 'podea'].includes(x)), c);
});
