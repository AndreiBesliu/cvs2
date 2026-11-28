/**
 * Programele litofaniei plăcii 18 comise (felia 18.1↑i, ADR 0321; `docs/etape/placa-18.md`, partea a doua): exportul de acum,
 * pe documentul făcut pe drumul aplicației (harta grosimilor ca din fereastra „Litofanie”, rolul „Relief 3D” cu planul zero la
 * grosimea plăcii, câte un fișier pe freză), e, octet cu octet, cele două fișiere din `test/placi/placa-18/`; fișa le poartă
 * amprentele. Grosimile lor, prezise de oracolul simulării, le probează `placa18.litofanie.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import './limbi.ts';
import { documentLitofanie, fisiereLitofanie } from '../placi/placa-18/genereaza-litofanie.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';

const dosar = new URL('../placi/placa-18/', import.meta.url);
const aur = (nume: string): Buffer => readFileSync(new URL(nume, dosar));
const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const FISA = readFileSync(new URL('../../docs/etape/placa-18.md', import.meta.url), 'utf8');
export const PROGRAME_18_LITOFANIE = ['placa-18-litofanie-1-T1.nc', 'placa-18-litofanie-2-T2.nc'] as const;

test('exportul de acum e fișierele de aur ale litofaniei, octet cu octet; fișa le poartă amprentele', async () => {
  const f = await fisiereLitofanie();
  assert.deepEqual(f.map((x) => x.nume), [...PROGRAME_18_LITOFANIE]);
  for (const x of f) {
    const o = new TextEncoder().encode(x.text);
    assert.ok(Buffer.from(o).equals(aur(x.nume)), `${x.nume} diferă de ce exportă aplicația acum: rulează node test/placi/placa-18/genereaza-litofanie.ts`);
    assert.ok(FISA.includes(sha(o)), `fișa n-are amprenta lui ${x.nume}`);
  }
});

test('documentul litofaniei: „Relief 3D” cu planul zero la grosimea plăcii (6), freza plată Ø3 și bila Ø3, la versiunea curentă', async () => {
  const { doc } = await documentLitofanie();
  assert.equal(doc.schema, VERSIUNE_SCHEMA);
  assert.equal(doc.foi[0]?.stoc.grosime, 6);
  const [d, f] = doc.piese[0]!.operatii;
  assert.deepEqual([d!.tip, d!.scula.diametru, d!.scula.forma, d!.pas, d!.pasLateral, d!.degrosare], ['degrosare', 3, undefined, 2, 1.2, { adaos: 0.3, unghi: 0, planZero: 6 }]);
  assert.deepEqual([f!.tip, f!.scula.diametru, f!.scula.forma, f!.pas, f!.pasLateral, f!.finisare], ['finisare', 3, { tip: 'bila' }, 2, 0.5, { unghi: 0, planZero: 6 }]);
});
