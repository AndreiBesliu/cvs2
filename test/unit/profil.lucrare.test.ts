/**
 * Profilul desenat în lucrare (ADR 0304 §1, §3, felia 16.A↑f-1): ușa v32 îl primește pe orice freză a unei operații, simularea
 * îl taie (simulare.profil.test.ts), iar lucrarea îl refuză pe orice operație și pe orice freză în plus, cu motivul care
 * numește forma, T-ul și calea, până la CAM-ul lui (canelura în f-2, marginea profilată în f-3). Fereastra exportului nu-i face
 * rând (`formaPeRand`), deci Exportă nu scrie o plată în locul lui. Tabelul `motivFormaPeOperatie` pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { felFrezei, formaPeRand, motivFormaPeOperatie, operatieCuRand } from '../../src/model/formaFrezei.ts';
import { VERSIUNE_SCHEMA, type Document, type FormaSculaDoc, type Latura, type Operatie, type TipOperatie } from '../../src/model/document.ts';

type Liber = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const RUND = [[0, 0], [1.5, 0], [2.2, 0.3], [3, 0.9], [3.6, 1.8], [4, 3]];
const plata = (numar: number, diametru: number): Liber => ({ numar, nume: 'freza plata', diametru });
const prof = (numar: number, diametru = 8, puncte: unknown = RUND): Liber => ({ numar, nume: 'freza profil', diametru, forma: { tip: 'profil', puncte } });
const inV = (numar: number, diametru: number, unghi: number): Liber => ({ numar, nume: `freza V${unghi}`, diametru, forma: { tip: 'v', unghi } });
const op = (v: Liber): Liber => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: plata(1, 6), latura: 'interior', sens: 'urcare', adancime: 6, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
function doc(operatii: readonly Liber[]): Liber {
  return {
    schema: VERSIUNE_SCHEMA, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...I },
        copii: [{ tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }, matrice: { ...I, e: 20, f: 20 } }],
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

test('motivFormaPeOperatie: profilul desenat nu merge încă nicăieri (f-1); restul, ca până acum', () => {
  const Pf: FormaSculaDoc = { tip: 'profil', puncte: [[0, 0], [1.5, 0], [4, 3]] };
  const locuri: ReadonlyArray<readonly [TipOperatie, Latura]> = [
    ['profil', 'pe-linie'], ['profil', 'exterior'], ['profil', 'interior'], ['profil', 'stanga'], ['buzunar', 'interior'],
    ['gaurire', 'interior'], ['vcarve', 'interior'], ['finisare', 'pe-linie'], ['degrosare', 'pe-linie'],
  ];
  for (const [tip, latura] of locuri) {
    assert.equal(motivFormaPeOperatie(tip, latura, Pf, { adancime: 100 }, 8), 'profil', `${tip} ${latura}`);
  }
  assert.equal(felFrezei(Pf), 'profilată');
  assert.equal(formaPeRand(Pf), false);
  assert.equal(motivFormaPeOperatie('profil', 'exterior', undefined, { adancime: 1 }, 6), null);
});

test('lucrarea refuză profilul desenat pe orice operație și pe orice freză în plus, cu forma, T-ul și calea în motiv', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, string, number]> = [
    ['canelura', op({ scula: prof(1), latura: 'pe-linie', adancime: 1 }), 'scula', 1],
    ['profilul pe o parte', op({ scula: prof(1) }), 'scula', 1],
    ['buzunarul', op({ tip: 'buzunar', scula: prof(1), pasLateral: 2 }), 'scula', 1],
    ['freza de rest', op({ tip: 'buzunar', pasLateral: 2, rest: [{ scula: prof(2, 3, [[0, 0], [1.5, 0.5]]), pasLateral: 1 }] }), 'rest[0]', 2],
    ['fundul plat', op({ tip: 'vcarve', scula: inV(1, 6, 90), fundPlat: { scula: prof(2, 3, [[0, 0], [1.5, 0.2]]), pasLateral: 1 } }), 'fundPlat', 2],
    ['frezele dopului drept', op({ tip: 'buzunar', pasLateral: 2, incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5, frezeDop: [{ scula: prof(2, 3, [[0, 0], [1.5, 0.2]]), pasLateral: 1 }] } }), 'incrustatie.frezeDop[0]', 2],
  ];
  for (const [nume, o, cale, numar] of cazuri) {
    const m = motiv(doc([o]));
    assert.match(m, /^p\/o: freza profilată/, `${nume}: ${m}`);
    assert.ok(m.includes(`(T${numar}, ${cale})`), `${nume}: motivul nu numește T${numar} și ${cale}: ${m}`);
    assert.match(m, /nu se taie încă/, nume);
  }
  // Fără profil, aceleași operații nu sunt refuzate de regula lui.
  assert.doesNotMatch(motiv(doc([op({})])), /profilat/);
});

test('fereastra exportului nu face rând unei operații cu un profil desenat (Exportă n-ar purta forma)', () => {
  const d = deschis(doc([op({ scula: prof(1), latura: 'pe-linie', adancime: 1 })]));
  const o = d.piese[0]!.operatii[0] as Operatie;
  assert.equal(operatieCuRand(o), false);
  const cuRest = deschis(doc([op({ tip: 'buzunar', pasLateral: 2, rest: [{ scula: prof(2, 3, [[0, 0], [1.5, 0.5]]), pasLateral: 1 }] })]));
  assert.equal(operatieCuRand(cuRest.piese[0]!.operatii[0] as Operatie), false);
  assert.equal(operatieCuRand(deschis(doc([op({})])).piese[0]!.operatii[0] as Operatie), true);
});
