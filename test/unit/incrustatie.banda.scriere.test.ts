/**
 * Ce scrie Exportă pentru banda dopului în V (ADR 0172, `operatieDinDialog`): valorile rândului peste cele din document,
 * ÎMBINATE (un câmp necunoscut al benzii, al frezei ei sau al punților rămâne, la locul lui, ca la urechi, ADR 0016), cu numele
 * frezei păstrat; lățimea lipsă (cea mai mică) și freza lipsă (a fundului plat) pleacă; pe fața coborâtă, banda pleacă; Exportă
 * fără nicio schimbare nu scrie o comandă (aceeași operație; banda, cu cheile în aceeași ordine).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Operatie } from '../../src/model/document.ts';
import type { BandaOperatie } from '../../src/ui/DialogExport.tsx';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const scula = { numar: 2, diametru: 6, forma: { tip: 'v' as const, unghi: 60 } };

/** Banda din document: lățimea, decuparea, placa, freza ei (T8 cu nume și un câmp al atelierului) și punțile, cu necunoscute. */
const BANDA = {
  latime: 8, decupare: true, grosimePlaca: 6, nota: 'placa de nuc',
  freza: { numar: 8, nume: 'freza T8 a atelierului', diametru: 2, lungime: 22 }, punti: { numar: 3, latime: 5, grosime: 1.5, culoare: 'roșu' },
};

/** Operația de incrustație din document (prin ușă), v22, cu banda dată (null: fără ea). */
function operatieDinDocument(banda: unknown = BANDA, jurDop: 'fata' | 'banda' = 'banda'): Operatie {
  const r = incarca({
    schema: 23, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: I, forma: { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 } },
      operatii: [{
        id: 'o', tip: 'vcarve', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5,
        scula: { numar: 2, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } },
        urechi: null, rampa: null, intrari: null, colturi: null,
        fundPlat: { scula: { numar: 1, nume: 'freza dreapta', diametru: 3 }, pasLateral: 1.2 },
        incrustatie: { fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop, ...(banda !== null ? { banda } : {}) },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 100, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc.piese[0]!.operatii[0]!;
}

/** Rândul ferestrei, cu incrustația dată. */
const randul = (jurDop: 'fata' | 'banda', banda?: BandaOperatie) => ({
  scula, latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5, urechi: null, rampa: null, intrari: null, colturi: null,
  tip: 'vcarve', fundPlat: { numar: 1, diametru: 3, pasLateral: 1.2 },
  incrustatie: { joc: 0.5, fierastrau: 2, margine: 5, jurDop, ...(banda ? { banda } : {}) },
} as const);

/** Banda rândului, cum o dă fereastra pentru BANDA (aceleași valori). */
const LA_FEL: BandaOperatie = { latime: 8, decupare: true, grosimePlaca: 6, freza: { numar: 8, diametru: 2 }, punti: { numar: 3, latime: 5, grosime: 1.5 } };

test('Exportă îmbină banda rândului peste cea din document: valorile noi, necunoscutele rămân la locul lor, numele frezei la fel', () => {
  const o = operatieDinDocument();
  const scrisa = operatieDinDialog(o, randul('banda', { latime: 9, decupare: true, grosimePlaca: 7, freza: { numar: 8, diametru: 2.5 }, punti: { numar: 4, latime: 4, grosime: 1 } }), scula);
  const i = scrisa.incrustatie;
  assert.equal(i?.fel, 'v');
  if (i?.fel !== 'v') return;
  assert.deepEqual(i.banda, {
    latime: 9, decupare: true, grosimePlaca: 7, nota: 'placa de nuc',
    freza: { numar: 8, nume: 'freza T8 a atelierului', diametru: 2.5, lungime: 22 }, punti: { numar: 4, latime: 4, grosime: 1, culoare: 'roșu' },
  });
  // Ordinea cheilor din document rămâne (o necunoscută nu sare la coadă).
  assert.deepEqual(Object.keys(i.banda ?? {}), Object.keys(BANDA));
});

test('lățimea lipsă (cea mai mică) și freza lipsă (a fundului plat) pleacă din bandă; o freză nouă se cheamă „freza dreapta”', () => {
  const o = operatieDinDocument();
  const fara = operatieDinDialog(o, randul('banda', { decupare: false, grosimePlaca: 6, punti: { numar: 3, latime: 5, grosime: 1.5 } }), scula);
  assert.ok(fara.incrustatie?.fel === 'v');
  if (fara.incrustatie?.fel !== 'v') return;
  assert.ok(!Object.hasOwn(fara.incrustatie.banda ?? {}, 'latime'));
  assert.ok(!Object.hasOwn(fara.incrustatie.banda ?? {}, 'freza'));
  assert.equal(fara.incrustatie.banda?.decupare, false);
  assert.equal(fara.incrustatie.banda?.['nota'], 'placa de nuc');
  const noua = operatieDinDialog(operatieDinDocument(null), randul('banda', { decupare: true, grosimePlaca: 5.5, freza: { numar: 3, diametru: 4 }, punti: { numar: 4, latime: 4, grosime: 1 } }), scula);
  assert.ok(noua.incrustatie?.fel === 'v');
  if (noua.incrustatie?.fel !== 'v') return;
  assert.deepEqual(noua.incrustatie.banda, { decupare: true, grosimePlaca: 5.5, freza: { numar: 3, nume: 'freza dreapta', diametru: 4 }, punti: { numar: 4, latime: 4, grosime: 1 } });
  // Ce scrie Exportă trece de ușă (o operație v22 validă).
  const r = incarca({
    schema: 23, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'a', matrice: I, forma: { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 } }, operatii: [noua] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 100, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
});

test('pe fața coborâtă, banda pleacă; fără valori din dialog, rămâne; cu aceleași valori, operația e aceeași, cu cheile incrustației la fel', () => {
  const o = operatieDinDocument();
  const fata = operatieDinDialog(o, randul('fata'), scula);
  assert.ok(fata.incrustatie?.fel === 'v' && !Object.hasOwn(fata.incrustatie, 'banda'));
  assert.equal(fata.incrustatie?.fel === 'v' ? fata.incrustatie.jurDop : '', 'fata');
  assert.deepEqual(operatieDinDialog(o, undefined, scula).incrustatie, o.incrustatie);
  const aceeasi = operatieDinDialog(o, randul('banda', LA_FEL), scula);
  assert.deepEqual(aceeasi, o);
  assert.equal(JSON.stringify(aceeasi.incrustatie), JSON.stringify(o.incrustatie));
});

test('freza decupării scrisă din fereastră e dreaptă: o `forma` rămasă în document pleacă, numele și necunoscutele rămân', () => {
  const o = operatieDinDocument({ ...BANDA, freza: { ...BANDA.freza, forma: { tip: 'v', unghi: 90 } } });
  const scrisa = operatieDinDialog(o, randul('banda', LA_FEL), scula);
  assert.ok(scrisa.incrustatie?.fel === 'v');
  if (scrisa.incrustatie?.fel !== 'v') return;
  assert.deepEqual(scrisa.incrustatie.banda?.freza, { numar: 8, nume: 'freza T8 a atelierului', diametru: 2, lungime: 22 });
});
