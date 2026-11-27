/**
 * Programele plăcii reliefului comise (placa 18; `docs/etape/placa-18.md`, felia 18.1↑d-2, ADR 0310, ADR 0312, ADR 0313):
 * exportul aplicației de acum, pe documentul plăcii făcut pe drumul ei (stratul din grilă, rolul „Relief 3D”, ușa, calculul
 * exportului cu câte un fișier pe freză), e, octet cu octet, cele două fișiere din `test/placi/placa-18/`, pe care le taie
 * owner-ul; fișa le poartă amprentele. Cotele lor, prezise de oracolul simulării, le probează `placa18.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import './limbi.ts';
import { documentPlaca18, fisierePlaca18 } from '../placi/placa-18/genereaza.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';

const dosar = new URL('../placi/placa-18/', import.meta.url);
const aur = (nume: string): Buffer => readFileSync(new URL(nume, dosar));
const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const FISA = readFileSync(new URL('../../docs/etape/placa-18.md', import.meta.url), 'utf8');
export const PROGRAME_18 = ['placa-18-1-T1.nc', 'placa-18-2-T2.nc'] as const;

test('exportul de acum e fișierele de aur, octet cu octet (T1 degroșarea, T2 finisarea); fișa le poartă amprentele', async () => {
  const f = await fisierePlaca18();
  assert.deepEqual(f.map((x) => x.nume), [...PROGRAME_18]);
  for (const x of f) {
    const o = new TextEncoder().encode(x.text);
    assert.ok(Buffer.from(o).equals(aur(x.nume)), `${x.nume} diferă de ce exportă aplicația acum: rulează node test/placi/placa-18/genereaza.ts`);
    assert.ok(FISA.includes(sha(o)), `fișa n-are amprenta lui ${x.nume}`);
  }
});

test('documentul plăcii: rolul „Relief 3D” (degroșarea, apoi finisarea), cu valorile fișei, trece de ușă la versiunea curentă', async () => {
  const { doc } = await documentPlaca18();
  assert.equal(doc.schema, VERSIUNE_SCHEMA);
  const ops = doc.piese[0]!.operatii;
  assert.deepEqual(ops.map((o) => o.tip), ['degrosare', 'finisare']);
  const [d, f] = ops;
  assert.deepEqual([d!.scula.numar, d!.scula.diametru, d!.scula.forma], [1, 6, undefined]);
  assert.deepEqual([f!.scula.numar, f!.scula.diametru, f!.scula.forma], [2, 6, { tip: 'bila' }]);
  assert.deepEqual([d!.pas, d!.pasLateral, d!.degrosare], [3, 2.5, { adaos: 0.5, unghi: 0 }]);
  assert.deepEqual([f!.pas, f!.pasLateral, f!.finisare], [3, 1.5, { unghi: 0 }]);
});
