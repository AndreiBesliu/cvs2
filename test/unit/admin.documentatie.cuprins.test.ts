import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cuprins, dataStarii, desparteTitlul, sectiuneaDeAcum } from '../../src/admin/documentatie/cuprins.ts';

/** Fila Documentație (ADR 0260 §8, felia A.6), partea pură: cuprinsul, secțiunea de acum, titlul ADR-ului și data stării. */

test('cuprinsul: titlurile de nivel 2 și 3 de la rădăcină, cu ancorele cititorului (și cele repetate), fără cod, liste sau citate', () => {
  const text = [
    '# Titlul', '', '## Problema', 'text', '', '### Un `cod` și **accent**', '', '#### Prea adânc', '', '```', '## nu e titlu', '```', '',
    '- ## în listă', '', '> ## în citat', '', '## Problema', '', '## Decizia',
  ].join('\n');
  assert.deepEqual(cuprins(text), [
    { ancora: 'problema', text: 'Problema', nivel: 2 },
    { ancora: 'un-cod-și-accent', text: 'Un cod și accent', nivel: 3 },
    { ancora: 'problema-1', text: 'Problema', nivel: 2 },
    { ancora: 'decizia', text: 'Decizia', nivel: 2 },
  ]);
  assert.deepEqual(cuprins('doar un paragraf'), []);
});

test('secțiunea de acum: ultimul titlu urcat la prag; niciunul la începutul documentului; ultimul, la capătul paginii', () => {
  assert.equal(sectiuneaDeAcum([-900, -40, 96, 400], 96, false), 2);
  assert.equal(sectiuneaDeAcum([-900, -40, 97, 400], 96, false), 1);
  assert.equal(sectiuneaDeAcum([150, 400], 96, false), -1);
  assert.equal(sectiuneaDeAcum([-900, -40, 300, 600], 96, true), 3);
  assert.equal(sectiuneaDeAcum([], 96, true), -1);
  // Un titlu care nu e pe pagină (Infinity) nu urcă niciodată.
  assert.equal(sectiuneaDeAcum([-10, Number.POSITIVE_INFINITY], 96, false), 0);
});

test('titlul de nivel 1 de la început, despărțit de rest (rândurile goale dinainte sărite, CRLF); altfel, tot textul', () => {
  assert.deepEqual(desparteTitlul('\n\n# ADR 0260 — Pagina `/admin` ##\n\n**Starea:** x\n'), { titlu: 'ADR 0260 — Pagina `/admin`', rest: '\n**Starea:** x\n' });
  assert.deepEqual(desparteTitlul('# Titlu\r\nrest\r\n'), { titlu: 'Titlu', rest: 'rest\n' });
  for (const t of ['## Nu e nivel 1\n# Titlu', '#Lipit', 'text\n# Titlu', '']) assert.deepEqual(desparteTitlul(t), { titlu: null, rest: t });
});

test('data stării: prima dată din rândul „**Starea:**”; fără dată acolo (sau fără rând), nimic', () => {
  assert.equal(dataStarii('# T\n\n**Starea:** acceptat pe 13.11.2026, completat pe 14.11.2026.\n\nPe 01.01.2027'), '13.11.2026');
  assert.equal(dataStarii('# T\n\n**Starea:** propus.\n\nPe 01.01.2027 altceva'), null);
  assert.equal(dataStarii('# T\n\nStarea: acceptat pe 13.11.2026'), null);
  // ADR-ul liniei, din repo: titlul, data, iar cuprinsul restului începe cu „Problema”.
  const adr = readFileSync('docs/adr/0260-adminul-reproiectat.md', 'utf8');
  const { titlu, rest } = desparteTitlul(adr);
  assert.match(titlu ?? '', /^ADR 0260 — Pagina `\/admin` reproiectată/);
  assert.equal(dataStarii(rest), '13.11.2026');
  assert.deepEqual(cuprins(rest).slice(0, 3).map((i) => i.text), ['Problema', 'Decizia', 'Feliile']);
});
