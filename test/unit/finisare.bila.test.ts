/**
 * Freza bilă și finisarea reliefului în lucrare (ADR 0312, feliile 18.1↑c-1 și c-2): ușa primește bila pe
 * orice freză, iar lucrarea o refuză, cu motivul care numește forma și calea, oriunde nu e o finisare (scula, frezele de rest,
 * fundul plat și frezele lui de rest, frezele dopului, freza decupării benzii); câmpul `finisare` pe alt fel e refuzat; o
 * finisare nu ajunge printre tăieturile pe contur. Tabelul `motivFormaPeOperatie` pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { felFrezei, frezeleOperatiei, motivFormaPeOperatie } from '../../src/model/formaFrezei.ts';
import { taieturiFoaie } from '../../src/model/lume.ts';
import type { Document, FormaSculaDoc, Latura, Operatie, TipOperatie } from '../../src/model/document.ts';

type Liber = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const plata = (numar: number, diametru: number): Liber => ({ numar, nume: 'freza plata', diametru });
const bila = (numar: number, diametru: number): Liber => ({ numar, nume: 'freza bila', diametru, forma: { tip: 'bila' } });
const inV = (numar: number, diametru: number, unghi: number): Liber => ({ numar, nume: `freza V${unghi}`, diametru, forma: { tip: 'v', unghi } });
const op = (v: Liber): Liber => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: plata(1, 6), latura: 'interior', sens: 'urcare', adancime: 6, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
const relief = { tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: 'ab'.repeat(32) }] };
function doc(operatii: readonly Liber[], cuRelief = false): Liber {
  return {
    schema: 29, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...I },
        copii: [
          { tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }, matrice: { ...I, e: 20, f: 20 } },
          ...(cuRelief ? [{ tip: 'element', id: 'r', forma: relief, matrice: { ...I, e: 100, f: 20 } }] : []),
        ],
      },
      operatii: [...operatii],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}
const deschis = (d: Liber): Document => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const motiv = (d: Liber): string => {
  const r = programDinDocument(deschis(d), REGIM_IMPLICIT);
  return r.ok ? '' : r.motiv;
};
const finisare = (v: Liber = {}): Liber => op({
  id: 'f', tip: 'finisare', noduri: ['r'], scula: bila(4, 6), latura: 'pe-linie', adancime: 8, pas: 3, pasLateral: 0.5,
  finisare: { unghi: 0 }, ...v,
});

test('motivFormaPeOperatie: pe finisare merg plata, V-ul și bila; bila nicăieri altundeva; V-ul ca până acum', () => {
  const B: FormaSculaDoc = { tip: 'bila' }, V: FormaSculaDoc = { tip: 'v', unghi: 60 };
  const randuri: ReadonlyArray<readonly [TipOperatie, Latura, FormaSculaDoc | undefined, string | null]> = [
    ['finisare', 'pe-linie', undefined, null], ['finisare', 'pe-linie', V, null], ['finisare', 'pe-linie', B, null],
    ['finisare', 'exterior', B, null],
    ['profil', 'pe-linie', B, 'bila'], ['profil', 'exterior', B, 'bila'], ['buzunar', 'interior', B, 'bila'],
    ['gaurire', 'interior', B, 'bila'], ['vcarve', 'interior', B, 'bila'],
    ['vcarve', 'interior', V, null], ['vcarve', 'interior', undefined, 'vcarve'], ['profil', 'pe-linie', V, null],
    ['profil', 'exterior', V, 'v-pe-linie'], ['buzunar', 'interior', undefined, null],
  ];
  for (const [tip, latura, forma, asteptat] of randuri) assert.equal(motivFormaPeOperatie(tip, latura, forma), asteptat, `${tip} ${latura} ${forma?.tip ?? 'plata'}`);
  assert.deepEqual([felFrezei(undefined), felFrezei(V), felFrezei(B)], ['plată', 'în V', 'bilă']);
});

test('frezeleOperatiei: toate frezele, cu calea lor, în ordine', () => {
  const o = {
    ...op({ tip: 'buzunar', rest: [{ scula: plata(2, 3), pasLateral: 1 }] }),
    fundPlat: { scula: plata(3, 3), pasLateral: 1, rest: [{ scula: plata(4, 2), pasLateral: 0.5 }] },
    incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5, frezeDop: [{ scula: plata(5, 2), pasLateral: 0.5 }] },
  } as unknown as Operatie;
  assert.deepEqual(frezeleOperatiei(o).map((f) => `${f.cale}:T${f.scula.numar}`), [
    'scula:T1', 'rest[0]:T2', 'fundPlat:T3', 'fundPlat.rest[0]:T4', 'incrustatie.frezeDop[0]:T5',
  ]);
  const v = { ...op({ tip: 'vcarve' }), incrustatie: { fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'banda', banda: { decupare: true, grosimePlaca: 6, freza: plata(7, 3), punti: { numar: 2, latime: 4, grosime: 1 } } } } as unknown as Operatie;
  assert.deepEqual(frezeleOperatiei(v).map((f) => f.cale), ['scula', 'incrustatie.banda.freza']);
});

test('lucrarea refuză bila oriunde nu e o finisare, cu forma și calea în motiv', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, string]> = [
    ['profilul', op({ scula: bila(1, 6) }), 'scula'],
    ['profilul pe linie', op({ scula: bila(1, 6), latura: 'pe-linie' }), 'scula'],
    ['buzunarul', op({ tip: 'buzunar', scula: bila(1, 6), pasLateral: 2 }), 'scula'],
    ['freza de rest', op({ tip: 'buzunar', pasLateral: 2, rest: [{ scula: bila(2, 3), pasLateral: 1 }] }), 'rest[0]'],
    ['fundul plat', op({ tip: 'vcarve', scula: inV(1, 6, 90), fundPlat: { scula: bila(2, 3), pasLateral: 1 } }), 'fundPlat'],
    ['freza de rest a fundului', op({ tip: 'vcarve', scula: inV(1, 6, 90), fundPlat: { scula: plata(2, 3), pasLateral: 1, rest: [{ scula: bila(3, 2), pasLateral: 0.5 }] } }), 'fundPlat.rest[0]'],
    ['frezele dopului drept', op({ tip: 'buzunar', pasLateral: 2, incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5, frezeDop: [{ scula: bila(2, 3), pasLateral: 1 }] } }), 'incrustatie.frezeDop[0]'],
    ['freza decupării benzii', op({ tip: 'vcarve', scula: inV(1, 6, 90), adancime: 3, incrustatie: { fel: 'v', joc: 0.5, fierastrau: 1, margine: 5, jurDop: 'banda', banda: { decupare: true, grosimePlaca: 6, freza: bila(2, 3), punti: { numar: 2, latime: 4, grosime: 1 } } } }), 'incrustatie.banda.freza'],
  ];
  for (const [nume, o, cale] of cazuri) {
    const m = motiv(doc([o]));
    assert.match(m, /freza bilă/, `${nume}: ${m}`);
    assert.ok(m.includes(`, ${cale})`), `${nume}: motivul nu numește ${cale}: ${m}`);
    assert.match(m, /doar la finisarea reliefului/, nume);
  }
  // Fără bilă, aceleași operații (acolo unde se taie) nu sunt refuzate de regula bilei.
  assert.doesNotMatch(motiv(doc([op({})])), /bilă/);
});

test('câmpul `finisare` pe alt fel e refuzat de lucrare; ușa îl primește', () => {
  const d = doc([op({ finisare: { unghi: 30 } })]);
  assert.match(motiv(d), /valorile finisării sunt doar ale unei finisări a reliefului/);
});

test('o finisare nu e o tăietură pe contur; fără dalele reliefului, lucrarea o refuză (programul ei: finisare.program.test.ts)', () => {
  const d = deschis(doc([op({}), finisare()], true));
  const t = taieturiFoaie(d);
  assert.deepEqual(t.map((x) => x.operatie), ['o']);
  assert.match(motiv(doc([op({}), finisare()], true)), /i\/r: dalele reliefului nu sunt în acest browser/);
  // O finisare pe o piesă care nu e pe foaie nu contează.
  const fara = doc([op({})], true);
  (fara['piese'] as Liber[]).push({ id: 'q', radacina: { tip: 'element', id: 'r', forma: relief, matrice: { ...I } }, operatii: [finisare()] });
  assert.equal(motiv(fara), '');
});
