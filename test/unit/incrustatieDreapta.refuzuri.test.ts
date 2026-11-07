/**
 * Refuzurile incrustației cu pereți drepți (ADR 0171 §4), cu motivul, înainte de traseu: pe altceva decât un buzunar, o freză în
 * V a dopului, jocul lateral cel puțin cât raza celei mai mici freze a locașului (vârfurile dopului ar ieși ascuțite, cu jocul
 * crescut în ele), jocul de sub dopul sprijinit pe față sub 0,1 mm sau cel puțin cât adâncimea, o parte a desenului mai îngustă
 * decât freza locașului (dispare din el; singură sau lângă alta lată, găsită prin otrava F05: refuzul celei de lângă alta n-avea
 * probă), dopul decupat cu marginea mai mică decât freza lui (șanțul ar ieși din placă). Pe hârtie: freza Ø3 are R1,5; cu o
 * freză de rest Ø2, cea mai mică are R1.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document, Operatie } from '../../src/model/document.ts';
import { refuzIncrustatie } from '../../src/cam/incrustatie.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const INC = { fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5 } as const;

/** Buzunarul de bază: freza plată Ø3 (T1), adâncimea 6 în treceri de 3, pasul lateral 1,2, cu incrustația de bază. */
function operatie(p: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'o', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 6, pas: 3, pasLateral: 1.2,
    scula: { numar: 1, nume: 'freza plata', diametru: 3 }, urechi: null, rampa: null, intrari: null, colturi: null,
    incrustatie: { ...INC }, ...p,
  };
}

/** Un document cu un dreptunghi (x, y, lățime, înălțime) și operația dată, pe o foaie de 200 × 150 × 18. */
function documentCu([x, y, w, h]: readonly [number, number, number, number], op: unknown): Document {
  const r = incarca({
    schema: 21, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'a', matrice: { ...I, e: x, f: y }, forma: { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 } }, operatii: [op] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

const refuz = (p: Record<string, unknown>): string | null => refuzIncrustatie(operatie(p) as unknown as Operatie, 'e1/a');
const exporta = (d: Document) => calculeazaExport(d, { origine: 'stanga-jos', z0: 'sus' });

test('pe hârtie: incrustația de bază (Ø3, c 0,1, dopul ridicat pe fund) nu e refuzată și iese cu dopul ei', async () => {
  assert.equal(refuz({}), null);
  const r = await exporta(documentCu([20, 20, 30, 20], operatie()));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  assert.equal(r.dopuri.length, 1);
});

test('pe un V-carve, incrustația cu pereți drepți e refuzată: e a unui buzunar', () => {
  assert.match(refuz({ tip: 'vcarve', scula: { numar: 2, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } } }) ?? '',
    /incrustația cu pereți drepți e a unui buzunar/);
});

test('frezele dopului sunt drepte: una în V e refuzată, cu numărul ei', () => {
  const frezeDop = [{ scula: { numar: 4, nume: 'freza V90', diametru: 6, forma: { tip: 'v', unghi: 90 } }, pasLateral: 1 }];
  assert.match(refuz({ incrustatie: { ...INC, frezeDop } }) ?? '', /frezele dopului sunt drepte \(T4 e în V\)/);
});

test('jocul lateral cel puțin cât raza celei mai mici freze a locașului e refuzat (R1,5; cu o freză de rest Ø2, R1)', () => {
  assert.match(refuz({ incrustatie: { ...INC, jocLateral: 1.5 } }) ?? '', /jocul lateral, de 1\.5 mm, trebuie să fie sub raza celei mai mici freze a locașului \(R1\.5\)/);
  assert.equal(refuz({ incrustatie: { ...INC, jocLateral: 1.49 } }), null);
  const rest = [{ scula: { numar: 2, nume: 'freza plata', diametru: 2 }, pasLateral: 0.8 }];
  assert.match(refuz({ rest, incrustatie: { ...INC, jocLateral: 1 } }) ?? '', /\(R1\)/);
  assert.equal(refuz({ rest, incrustatie: { ...INC, jocLateral: 0.99 } }), null);
});

test('dopul sprijinit pe față: jocul de sub el sub 0,1 sau cel puțin cât adâncimea e refuzat; pe fund, jocul nu se judecă', () => {
  const fata = { ...INC, sprijin: 'fata' };
  assert.match(refuz({ incrustatie: { ...fata, joc: 0.05 } }) ?? '', /jocul de sub dop, de 0\.05 mm, trebuie să fie cel puțin 0\.1 mm/);
  assert.match(refuz({ incrustatie: { ...fata, joc: 6 } }) ?? '', /trebuie să fie sub adâncimea locașului \(6 mm\)/);
  assert.equal(refuz({ incrustatie: { ...fata, joc: 5.9 } }), null);
  assert.equal(refuz({ incrustatie: { ...INC, joc: 6 } }), null);
});

test('o parte mai îngustă decât freza locașului (2 mm, cu Ø3) e refuzată: nu încape în locaș', async () => {
  const r = await exporta(documentCu([20, 20, 2, 30], operatie()));
  assert.ok(!r.ok);
  assert.match(r.motiv, /mai îngust.* decât freza locașului \(Ø3\)/);
});

test('dopul decupat cu marginea mai mică decât freza lui e refuzat; cât freza, trece', async () => {
  const r = await exporta(documentCu([20, 20, 30, 20], operatie({ incrustatie: { ...INC, dop: 'decupat', margine: 2 } })));
  assert.ok(!r.ok);
  assert.match(r.motiv, /marginea dopului decupat \(2 mm\) trebuie să fie cel puțin cât freza lui \(Ø3\)/);
  const bun = await exporta(documentCu([20, 20, 30, 20], operatie({ incrustatie: { ...INC, dop: 'decupat', margine: 3 } })));
  assert.ok(bun.ok, bun.ok ? '' : bun.motiv);
});

/** Un document cu mai multe dreptunghiuri (x, y, lățime, înălțime), câte un element, toate în aceeași operație. */
function documentCuMulte(dreptunghiuri: readonly (readonly [number, number, number, number])[], op: Record<string, unknown>): Document {
  const copii = dreptunghiuri.map(([x, y, w, h], k) => ({
    tip: 'element', id: String.fromCharCode(97 + k), matrice: { ...I, e: x, f: y }, forma: { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 },
  }));
  const r = incarca({
    schema: 21, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: I, copii }, operatii: [{ ...op, noduri: copii.map((c) => c.id) }] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

test('într-un desen cu mai multe părți, una mai îngustă decât freza (2 mm, lângă una de 30 × 20) e refuzată: ar dispărea din locaș', async () => {
  const r = await exporta(documentCuMulte([[20, 20, 30, 20], [70, 20, 2, 30]], operatie()));
  assert.ok(!r.ok);
  assert.match(r.motiv, /o parte a desenului e mai îngustă decât freza locașului \(Ø3\): nu încape în locaș/);
  // Lată de 3,2 mm (cât freza plus 0,2): încape, deci trece.
  const bun = await exporta(documentCuMulte([[20, 20, 30, 20], [70, 20, 3.2, 30]], operatie()));
  assert.ok(bun.ok, bun.ok ? '' : bun.motiv);
});
