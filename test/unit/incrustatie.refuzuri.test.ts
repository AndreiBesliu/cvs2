/**
 * Refuzurile incrustației în V (ADR 0170 §4), judecate de lucrare înainte de traseu, cu motivul: jocul sub 0,1 mm sau cel puțin
 * cât adâncimea, dopul săpat (D − g + H) peste conul frezei, o freză cu vârf plat, dopul fără freza dreaptă (12.1↑d),
 * incrustația pe altceva decât un V-carve (12.1↑b); banda (ADR 0172, primită din 12.1↑c) și refuzurile ei. Pe hârtie: V60 Ø6
 * are conul 3 / tan 30° = 5,196 mm. Plus gruparea: două incrustații ale aceleiași piese, cu alt joc, sunt două dopuri (cheia
 * V-carve-ului cuprinde incrustația).
 * Găsite prin otrăvurile 12.1 (R01–R08, G01, G02): niciun test nu le cerea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document, Operatie } from '../../src/model/document.ts';
import { refuzIncrustatie } from '../../src/cam/incrustatie.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { suprafataPeScule } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const INC = { fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'fata' } as const;

/** Operația de incrustație de bază: V60 Ø6 (T2), adâncimea 3, fundul plat cu freza dreaptă Ø3 (T1). */
function operatie(p: Record<string, unknown> = {}, id = 'o', noduri = ['a']): Record<string, unknown> {
  return {
    id, tip: 'vcarve', noduri, latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5,
    scula: { numar: 2, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } },
    urechi: null, rampa: null, intrari: null, colturi: null,
    fundPlat: { scula: { numar: 1, nume: 'freza dreapta', diametru: 3 }, pasLateral: 1.2 },
    incrustatie: { ...INC }, ...p,
  };
}

/** Un document cu dreptunghiurile date (x, y, lățime, înălțime), câte un element, și operațiile date. */
function documentCu(dreptunghiuri: readonly (readonly [number, number, number, number])[], operatii: readonly unknown[]): Document {
  const copii = dreptunghiuri.map(([x, y, w, h], k) => ({
    tip: 'element', id: String.fromCharCode(97 + k), matrice: { ...I, e: x, f: y }, forma: { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 },
  }));
  const r = incarca({
    schema: 20, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: I, copii }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

const refuz = (p: Record<string, unknown>): string | null => refuzIncrustatie(operatie(p) as unknown as Operatie, 'e1/a');

test('pe hârtie: incrustația de bază (V60 Ø6, D 3, g 0,5, H 2: dopul la 4,5 din conul de 5,196) nu e refuzată', () => {
  assert.equal(refuz({}), null);
});

test('jocul pentru clei: sub 0,1 mm (crestele colțurilor ar ține dopul) și cel puțin cât adâncimea sunt refuzate, cu motivul', () => {
  assert.match(refuz({ incrustatie: { ...INC, joc: 0.05 } }) ?? '', /jocul pentru clei, de 0\.05 mm, trebuie să fie cel puțin 0\.1 mm/);
  assert.equal(refuz({ incrustatie: { ...INC, joc: 0.1, fierastrau: 2 } }), null);
  assert.match(refuz({ incrustatie: { ...INC, joc: 3 } }) ?? '', /trebuie să fie sub adâncimea locașului \(3 mm\)/);
});

test('dopul săpat peste con: D − g + H = 3 − 0,5 + 2,7 = 5,2 > 5,196 e refuzat; 2,69 (5,19) trece', () => {
  assert.match(refuz({ incrustatie: { ...INC, fierastrau: 2.7 } }) ?? '', /dopul se sapă până la 5\.2 mm .* conul frezei în V \(Ø6, 60°\) are 5\.196 mm/);
  assert.equal(refuz({ incrustatie: { ...INC, fierastrau: 2.69 } }), null);
});

test('freza cu vârf plat și incrustația pe un profil: refuzate, cu rolul potrivit; banda și dopul fără freză dreaptă sunt primite', () => {
  assert.match(refuz({ scula: { numar: 2, nume: 'freza V60 varf 0.2', diametru: 6, forma: { tip: 'v', unghi: 60, varf: 0.2 } } }) ?? '', /vârf plat/);
  // Din 12.1↑c (ADR 0172), banda e primită: fără câmpul ei (un document de dinainte de v22), cu valorile implicite.
  assert.equal(refuz({ incrustatie: { ...INC, jurDop: 'banda' } }), null);
  // Din 12.1↑d (ADR 0173), fără freză dreaptă, fundul îl fac inelele frezei V: nu mai e un refuz.
  const { fundPlat: _f, ...faraFund } = operatie();
  void _f;
  assert.equal(refuzIncrustatie(faraFund as unknown as Operatie, 'e1/a'), null);
  assert.match(refuz({ tip: 'profil', latura: 'interior', scula: { numar: 2, nume: 'freza plata', diametru: 6 } }) ?? '',
    /incrustația în V e a unui V-carve \(pe un buzunar, alege incrustația cu pereți drepți\)/);
});

test('banda (ADR 0172): fără freza dreaptă, cu freza decupării în V sau cu numărul altei freze, mai îngustă decât cea mai mică, cu placa sub punți: refuzate, cu motivul', () => {
  // Pe hârtie: H 2, t = tan 30° = 0,57735, deci 2·H·t = 2,309; cu fundul plat Ø3, banda cea mai îngustă e 2,309 + 3 + 2·0,5 = 6,309;
  // cu decuparea Ø4, 7,309 (arătate rotunjite în sus: 6,31 și 7,31). S = 3 − 0,5 = 2,5, deci placa are cel puțin S + H + 1
  // (punțile) = 5,5. Fără decupare, freza ei nu contează: nici pentru lățime, nici ca număr.
  const banda = (b: Record<string, unknown>): Record<string, unknown> => ({ incrustatie: { ...INC, jurDop: 'banda', banda: { decupare: true, grosimePlaca: 5.5, punti: { numar: 4, latime: 4, grosime: 1 }, ...b } } });
  assert.equal(refuz(banda({})), null);
  // Fără freză dreaptă (ADR 0173): fundul benzii îl fac inelele V, dar decuparea (pusă implicit) cere freza ei; fără decupare
  // sau cu freza ei, primită. Banda cea mai îngustă n-are atunci freza fundului: 2,309 + 1 = 3,309, cu decuparea Ø4, 7,309.
  const faraFundCu = (b?: Record<string, unknown>): Operatie => {
    const { fundPlat: _f, ...o } = operatie({ incrustatie: { ...INC, jurDop: 'banda', ...(b ? { banda: { decupare: true, grosimePlaca: 5.5, punti: { numar: 4, latime: 4, grosime: 1 }, ...b } } : {}) } });
    void _f;
    return o as unknown as Operatie;
  };
  assert.match(refuzIncrustatie(faraFundCu(), 'e1/a') ?? '', /e1\/a: fără freză dreaptă, decuparea dopului cere freza ei: bifează „Altă freză pentru decupare” \(o freză dreaptă care taie prin placă\) sau scoate decuparea$/);
  assert.equal(refuzIncrustatie(faraFundCu({ decupare: false }), 'e1/a'), null);
  assert.equal(refuzIncrustatie(faraFundCu({ freza: { numar: 3, nume: 'dreapta', diametru: 4 } }), 'e1/a'), null);
  assert.match(refuzIncrustatie(faraFundCu({ decupare: false, latime: 3.3 }), 'e1/a') ?? '', /banda dopului, de 3\.3 mm, e mai îngustă decât cea mai mică, de 3\.31 mm \(pereții, fundul, fiecare cu freza lui\)/);
  assert.equal(refuzIncrustatie(faraFundCu({ decupare: false, latime: 3.31 }), 'e1/a'), null);
  assert.match(refuzIncrustatie(faraFundCu({ freza: { numar: 3, nume: 'dreapta', diametru: 4 }, latime: 7.3 }), 'e1/a') ?? '', /de 7\.31 mm \(pereții, fundul și tăietura decupării/);
  assert.match(refuz(banda({ freza: { numar: 3, nume: 'V90', diametru: 6, forma: { tip: 'v', unghi: 90 } } })) ?? '', /freza decupării dopului trebuie să fie dreaptă \(T3 e în V\)/);
  assert.match(refuz(banda({ freza: { numar: 2, nume: 'dreapta', diametru: 3 } })) ?? '', /freza decupării \(T2\) are numărul frezei în V/);
  assert.match(refuz(banda({ freza: { numar: 1, nume: 'dreapta', diametru: 4 } })) ?? '', /T1 are două diametre \(3 și 4 mm\)/);
  assert.equal(refuz(banda({ freza: { numar: 1, nume: 'dreapta', diametru: 3 } })), null, 'aceeași freză ca fundul plat');
  assert.match(refuz(banda({ latime: 6.3 })) ?? '', /banda dopului, de 6\.3 mm, e mai îngustă decât cea mai mică, de 6\.31 mm \(pereții, fundul plat și tăietura decupării/);
  assert.equal(refuz(banda({ latime: 6.31 })), null);
  assert.match(refuz(banda({ latime: 7.3, freza: { numar: 3, nume: 'dreapta', diametru: 4 } })) ?? '', /cea mai mică, de 7\.31 mm/);
  assert.match(refuz(banda({ grosimePlaca: 5.4 })) ?? '', /placa dopului, de 5\.4 mm, trebuie să aibă cel puțin 5\.5 mm/);
  assert.match(refuz(banda({ grosimePlaca: 6, punti: { numar: 4, latime: 4, grosime: 2 } })) ?? '', /cel puțin 6\.5 mm/);
  assert.equal(refuz(banda({ grosimePlaca: 3, decupare: false })), null, 'fără decupare, placa nu se taie');
  assert.equal(refuz(banda({ decupare: false, latime: 6.31, freza: { numar: 2, nume: 'V', diametru: 6, forma: { tip: 'v', unghi: 60 } } })), null, 'fără decupare, freza ei nu contează');
  assert.match(refuz(banda({ decupare: false, latime: 6.3 })) ?? '', /cea mai mică, de 6\.31 mm \(pereții, fundul plat, fiecare/);
});

test('lucrarea refuză incrustația înaintea traseului: programul foii nu iese, cu motivul și elementul', () => {
  const r = programDinDocument(documentCu([[20, 20, 20, 10]], [operatie({ incrustatie: { ...INC, joc: 0.05 } })]));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.motiv, /^i\/a: jocul pentru clei, de 0\.05 mm/);
});

test('două incrustații ale aceleiași piese, cu alt joc, sunt două dopuri; cu același joc, un singur dop', async () => {
  const doua = documentCu([[20, 20, 20, 10], [60, 20, 20, 10]], [operatie({}, 'o1', ['a']), operatie({ incrustatie: { ...INC, joc: 0.3 } }, 'o2', ['b'])]);
  const r = await calculeazaExport(doua, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.dopuri.length, 2);
  const unul = documentCu([[20, 20, 20, 10], [60, 20, 20, 10]], [operatie({}, 'o1', ['a']), operatie({}, 'o2', ['b'])]);
  const u = await calculeazaExport(unul, { origine: 'stanga-jos', z0: 'sus' });
  if (!u.ok) assert.fail(u.motiv);
  assert.equal(u.dopuri.length, 1);
});

test('locașul se grupează după aceeași cheie ca dopul: două incrustații cu alt joc, una în alta, nu fac un inel cu o creastă', async () => {
  // Pătratul 20 × 20 din (20, 20), cu jocul 0,5, și pătratul 6 × 6 din (27, 27) în el, cu jocul 0,3: două dopuri, deci două
  // regiuni și în programul foii. Pe hârtie, în (30, 27), pe latura pătratului mic, locașul mare e la −min(3, 7 / tan 30°) = −3;
  // grupate (cheia fără incrustație), cele două ar face un inel par-impar plus un buzunar, cu o creastă la suprafață acolo.
  const doc = documentCu([[20, 20, 20, 20], [27, 27, 6, 6]], [operatie({}, 'o1', ['a']), operatie({ incrustatie: { ...INC, joc: 0.3 } }, 'o2', ['b'])]);
  const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.dopuri.length, 2);
  const text = r.program.text;
  // Sculele bucăților, în ordine: cea de la pornire, apoi fiecare `T… M6` (T1 freza dreaptă Ø3, T2 V60 Ø6; regiunile își
  // schimbă freza fiecare, deci T1, T2, T1, T2).
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  const scule: SculaOracol[] = [m6[0] === 2 ? 1 : 2, ...m6].map((n) => (n === 1 ? { tip: 'plata', diametru: 3 } : { tip: 'v', diametru: 6, unghi: 60 }));
  const o = suprafataPeScule(text, { x0: 29.95, y0: 26.95, latime: 0.1, inaltime: 0.1, celula: 0.1 }, scule);
  assert.ok(Math.abs(o.z[0]! + 3) <= 0.05, `pe latura pătratului mic, locașul mare: ${o.z[0]} (−3 pe hârtie)`);
});
