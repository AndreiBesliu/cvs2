/**
 * Programele plăcii 11 comise (`docs/etape/placa-11.md`, felia 11.7, ADR 0210): exportul „Toate foile” al aplicației de acum,
 * pe documentul plăcii făcut pe drumul ferestrei «Din CSV…», e, octet cu octet, arhiva din `test/placi/placa-11/`, iar
 * programele din ea, fișierele de lângă ea, pe care le taie owner-ul; fișa le poartă amprentele. Fiecare foaie din arhivă e
 * exportul foii singure. Cotele lor pe hârtie le probează `placa11.test.ts`, pe exportul proaspăt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import './limbi.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { documentPlaca11, exportPlaca11, PARAMETRI } from '../placi/placa-11/genereaza.ts';

const dosar = new URL('../placi/placa-11/', import.meta.url);
const aur = (nume: string): Buffer => readFileSync(new URL(nume, dosar));
const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const FISA = readFileSync(new URL('../../docs/etape/placa-11.md', import.meta.url), 'utf8');
const LIMITE = { fisiere: 100, octetiFisier: 50_000_000, octetiTotal: 200_000_000 };
const PROGRAME = ['cncvs2-stanga-jos-foaia-1-1-T3.nc', 'cncvs2-stanga-jos-foaia-1-2-T5.nc', 'cncvs2-stanga-jos-foaia-2-1-T3.nc', 'cncvs2-stanga-jos-foaia-2-2-T5.nc'];

test('exportul „Toate foile” de acum e arhiva de aur, iar programele din ea sunt fișierele de aur; fișa le poartă amprentele', async () => {
  const r = await exportPlaca11();
  const zip = r.fisiere[0];
  assert.ok(zip);
  assert.equal(zip.nume, 'cncvs2-stanga-jos-foile.zip');
  assert.ok(Buffer.from(zip.octeti).equals(aur(zip.nume)), 'arhiva diferă de ce exportă aplicația acum: rulează node test/placi/placa-11/genereaza.ts');
  assert.ok(FISA.includes(sha(zip.octeti)), 'fișa n-are amprenta arhivei');
  const z = await citesteZip(zip.octeti, LIMITE);
  assert.ok(z.ok);
  assert.deepEqual(z.intrari.map((x) => x.nume), PROGRAME);
  for (const x of z.intrari) {
    assert.ok(Buffer.from(x.octeti).equals(aur(x.nume)), `${x.nume} diferă de fișierul de aur`);
    assert.ok(FISA.includes(sha(x.octeti)), `fișa n-are amprenta lui ${x.nume}`);
  }
});

test('fiecare foaie din arhivă e exportul ei singure (aceiași parametri, fără „Toate foile”)', async () => {
  const d = documentPlaca11();
  const { toateFoile: _t, ...singura } = PARAMETRI;
  assert.equal(d.foi.length, 2);
  for (const [k, f] of d.foi.entries()) {
    const s = await calculeazaExport(doarFoaia(d, f.id), { ...singura });
    assert.ok(s.ok, s.ok ? '' : s.motiv);
    if (!s.ok) return;
    assert.deepEqual(s.fisiere.map((x) => x.nume), [`cncvs2-stanga-jos-1-T3.nc`, `cncvs2-stanga-jos-2-T5.nc`]);
    s.fisiere.forEach((x, j) => { assert.ok(Buffer.from(x.octeti).equals(aur(PROGRAME[2 * k + j]!)), `${f.id}: ${x.nume}`); });
  }
});
