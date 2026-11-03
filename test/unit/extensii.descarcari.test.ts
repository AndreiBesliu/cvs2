/**
 * Descărcările extensiilor (ADR 0129 §C), fără browser: serviciul `descarcari.salveaza`, cu și fără permisiune; numele
 * curățat (calea, caracterele oprite, cele de control și de direcție), tipurile din lista albă; datele primite (text, octeți,
 * `Blob`) și plafonul. `salveaza` primește numele bun și datele, sau nimic la un refuz.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE_DESCARCARE, numeDescarcare, servesteDescarcarile, TIPURI_DESCARCARE } from '../../src/extensii/descarcari.ts';

const CU = ['descarcari'];
function cere(argumente: unknown[], permisiuni: readonly string[] = CU, metoda = 'salveaza') {
  const salvate: { nume: string; date: Blob }[] = [];
  const r = servesteDescarcarile(permisiuni, metoda, argumente, (nume, date) => { salvate.push({ nume, date }); });
  return { r, salvate };
}
const marime = (n: number): Blob => Object.defineProperty(new Blob([]), 'size', { value: n });

test('numele: ultima parte a căii, fără caracterele oprite, cu un tip din lista albă', () => {
  assert.equal(numeDescarcare('circuit_cnc.zip'), 'circuit_cnc.zip');
  assert.equal(numeDescarcare('../../Windows/rau.zip'), 'rau.zip');
  assert.equal(numeDescarcare('C:\\x\\piesa.STL'), 'piesa.STL');
  assert.equal(numeDescarcare('a<b>c:d"e|f?g*h.json'), 'a_b_c_d_e_f_g_h.json');
  assert.equal(numeDescarcare('  .ascuns.txt. '), 'ascuns.txt');
  assert.equal(numeDescarcare('cale\u0000nul\u001f.nc'), 'cale_nul_.nc');
  assert.equal(numeDescarcare('poza\u202egnp.zip'), 'pozagnp.zip');
  assert.equal(numeDescarcare('cărămizi_ăîșț.stl'), 'cărămizi_ăîșț.stl');
  assert.equal(numeDescarcare('x.zip'.padStart(LIMITE_DESCARCARE.nume, 'a')), 'x.zip'.padStart(LIMITE_DESCARCARE.nume, 'a'));
  for (const t of TIPURI_DESCARCARE) assert.equal(numeDescarcare(`f.${t}`), `f.${t}`);
  for (const rau of ['program.exe', 'pagina.html', 'script.js', 'scurtatura.lnk', 'fara-tip', 'zip', '.zip', '', '   ', 'a/', 'a.zip/',
    'x.zip'.padStart(LIMITE_DESCARCARE.nume + 1, 'a'), 12, null, undefined, { nume: 'a.zip' }]) {
    assert.equal(numeDescarcare(rau), null, String(rau));
  }
});

test('serviciul: fără permisiune, refuzul; o metodă necunoscută; numele și datele rele; plafonul', () => {
  for (const p of [[], ['stocare']]) assert.deepEqual(cere(['a.zip', 'x'], p).r, { ok: false, eroare: 'descarcari:permisiune' });
  assert.deepEqual(cere(['a.zip', 'x'], CU, 'sterge').r, { ok: false, eroare: 'descarcari:necunoscut' });
  assert.deepEqual(cere(['a.exe', 'x']).r, { ok: false, eroare: 'descarcari:nume' });
  assert.deepEqual(cere(['a.zip']).r, { ok: false, eroare: 'descarcari:date' });
  for (const rau of [undefined, null, 12, { a: 1 }, [1, 2], new Uint16Array(2)]) {
    assert.deepEqual(cere(['a.zip', rau]).r, { ok: false, eroare: 'descarcari:date' }, String(rau));
  }
  const peste = cere(['a.zip', marime(LIMITE_DESCARCARE.octeti + 1)]);
  assert.deepEqual(peste.r, { ok: false, eroare: 'descarcari:prea-mare' });
  assert.equal(peste.salvate.length, 0);
  assert.deepEqual(cere(['a.zip', marime(LIMITE_DESCARCARE.octeti)]).r, { ok: true, rezultat: 'a.zip' });
});

test('serviciul: textul, octeții și Blob-ul ajung la salvare, cu numele curățat', async () => {
  const text = cere(['../c.json', '{"ă":1}']);
  assert.deepEqual(text.r, { ok: true, rezultat: 'c.json' });
  assert.deepEqual(text.salvate.map((s) => s.nume), ['c.json']);
  assert.equal(await text.salvate[0]?.date.text(), '{"ă":1}');
  const u8 = cere(['g.nc', new Uint8Array([9, 71, 48, 10, 9]).subarray(1, 4)]);
  assert.deepEqual([...new Uint8Array(await u8.salvate[0]?.date.arrayBuffer() ?? new ArrayBuffer(0))], [71, 48, 10]);
  assert.equal(cere(['g.nc', new Uint8Array([1, 2]).buffer]).salvate[0]?.date.size, 2);
  const blob = new Blob(['PK'], { type: 'application/zip' });
  const b = cere(['piese.zip', blob]);
  assert.deepEqual(b.salvate, [{ nume: 'piese.zip', date: blob }]);
});
