/**
 * Freza toroidală în lucrare (ADR 0303 §1, §4, felia 16.A↑e-1): ușa v31 o primește pe orice freză a unei operații, simularea o
 * taie (simulare.toroidala.test.ts), iar lucrarea o refuză pe orice operație în afara canelurii (profilul pe linie, din
 * 16.A↑e-3a, canelura.rotunda.test.ts), cu motivul care numește forma, T-ul și calea, până la CAM-ul ei (e-4, e-5). Fereastra exportului nu-i face rând (copia ei știe doar plata și V-ul: ar scrie la Exportă o
 * plată în locul toroidalei), deci o lasă neschimbată, ca pe bilă. Tabelul `motivFormaPeOperatie` pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { felFrezei, formaPeRand, motivFormaPeOperatie, operatieCuRand } from '../../src/model/formaFrezei.ts';
import type { Document, FormaSculaDoc, Latura, Operatie, TipOperatie } from '../../src/model/document.ts';

type Liber = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const plata = (numar: number, diametru: number): Liber => ({ numar, nume: 'freza plata', diametru });
const toro = (numar: number, diametru: number, raza: number): Liber => ({ numar, nume: 'freza toroidala', diametru, forma: { tip: 'toroidala', raza } });
const inV = (numar: number, diametru: number, unghi: number): Liber => ({ numar, nume: `freza V${unghi}`, diametru, forma: { tip: 'v', unghi } });
const op = (v: Liber): Liber => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: plata(1, 6), latura: 'interior', sens: 'urcare', adancime: 6, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
const relief = { tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: 'ab'.repeat(32) }] };
function doc(operatii: readonly Liber[], cuRelief = false): Liber {
  return {
    schema: 31, rev: 0,
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

test('motivFormaPeOperatie: toroidala merge doar pe profilul pe linie (nici pe finisarea reliefului); restul, ca până acum', () => {
  const T: FormaSculaDoc = { tip: 'toroidala', raza: 1 }, B: FormaSculaDoc = { tip: 'bila' }, V: FormaSculaDoc = { tip: 'v', unghi: 60 };
  const randuri: ReadonlyArray<readonly [TipOperatie, Latura, FormaSculaDoc | undefined, string | null]> = [
    ['profil', 'pe-linie', T, null], ['profil', 'exterior', T, 'toroidala'], ['profil', 'stanga', T, 'toroidala'],
    ['buzunar', 'interior', T, 'toroidala'], ['gaurire', 'interior', T, 'toroidala'], ['vcarve', 'interior', T, 'toroidala'],
    ['finisare', 'pe-linie', T, 'toroidala'], ['degrosare', 'pe-linie', T, 'toroidala'],
    // Neschimbate (finisare.bila.test.ts, degrosare): bila doar la finisare, degroșarea doar cu plata, V-ul pe linie și în V-carve.
    ['finisare', 'pe-linie', B, null], ['profil', 'exterior', B, 'bila'], ['degrosare', 'pe-linie', undefined, null],
    ['degrosare', 'pe-linie', B, 'degrosare'], ['vcarve', 'interior', V, null], ['profil', 'exterior', V, 'v-pe-linie'],
    ['buzunar', 'interior', undefined, null],
  ];
  for (const [tip, latura, forma, asteptat] of randuri) assert.equal(motivFormaPeOperatie(tip, latura, forma), asteptat, `${tip} ${latura} ${forma?.tip ?? 'plata'}`);
  assert.equal(felFrezei(T), 'toroidală');
  assert.deepEqual([felFrezei(undefined), felFrezei(V), felFrezei(B)], ['plată', 'în V', 'bilă']);
});

test('lucrarea refuză toroidala pe orice operație în afara canelurii și pe orice freză în plus, cu forma, T-ul și calea în motiv', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, string, number]> = [
    ['profilul', op({ scula: toro(1, 6, 1) }), 'scula', 1],
    ['buzunarul', op({ tip: 'buzunar', scula: toro(1, 6, 1.5), pasLateral: 2 }), 'scula', 1],
    ['freza de rest', op({ tip: 'buzunar', pasLateral: 2, rest: [{ scula: toro(2, 3, 0.5), pasLateral: 1 }] }), 'rest[0]', 2],
    ['fundul plat', op({ tip: 'vcarve', scula: inV(1, 6, 90), fundPlat: { scula: toro(2, 3, 0.5), pasLateral: 1 } }), 'fundPlat', 2],
    ['freza de rest a fundului', op({ tip: 'vcarve', scula: inV(1, 6, 90), fundPlat: { scula: plata(2, 3), pasLateral: 1, rest: [{ scula: toro(3, 2, 0.5), pasLateral: 0.5 }] } }), 'fundPlat.rest[0]', 3],
    ['frezele dopului drept', op({ tip: 'buzunar', pasLateral: 2, incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5, frezeDop: [{ scula: toro(2, 3, 0.5), pasLateral: 1 }] } }), 'incrustatie.frezeDop[0]', 2],
    ['freza decupării benzii', op({ tip: 'vcarve', scula: inV(1, 6, 90), adancime: 3, incrustatie: { fel: 'v', joc: 0.5, fierastrau: 1, margine: 5, jurDop: 'banda', banda: { decupare: true, grosimePlaca: 6, freza: toro(2, 3, 0.5), punti: { numar: 2, latime: 4, grosime: 1 } } } }), 'incrustatie.banda.freza', 2],
  ];
  for (const [nume, o, cale, numar] of cazuri) {
    const m = motiv(doc([o]));
    assert.match(m, /^p\/o: freza toroidală/, `${nume}: ${m}`);
    assert.ok(m.includes(`(T${numar}, ${cale})`), `${nume}: motivul nu numește T${numar} și ${cale}: ${m}`);
    assert.match(m, /nu se taie încă/, nume);
  }
  // Canelura cu toroidala se taie (canelura.rotunda.test.ts).
  assert.equal(motiv(doc([op({ scula: toro(1, 6, 1), latura: 'pe-linie' })])), '');
  // Pe o finisare și pe o degroșare a reliefului, la fel (nu doar refuzul degroșării, „cu o freză plată”).
  const reliefOp = (tip: 'finisare' | 'degrosare'): Liber => op({
    id: 'f', tip, noduri: ['r'], scula: toro(4, 6, 1), latura: 'pe-linie', adancime: 8, pas: 3, pasLateral: 0.5,
    ...(tip === 'finisare' ? { finisare: { unghi: 0 } } : { degrosare: { adaos: 0.5, unghi: 0 } }),
  });
  for (const tip of ['finisare', 'degrosare'] as const) {
    const m = motiv(doc([reliefOp(tip)], true));
    assert.match(m, /^p\/f: freza toroidală \(T4, scula\) nu se taie încă/, `${tip}: ${m}`);
  }
  // Fără toroidală, aceleași operații nu sunt refuzate de regula ei.
  assert.doesNotMatch(motiv(doc([op({})])), /toroidal/);
  assert.equal(motiv(doc([op({})])), '');
});

test('fereastra exportului: rând doar pentru frezele plate și în V (copia ei); bila, toroidala și o formă necunoscută, fără rând', () => {
  assert.equal(formaPeRand(undefined), true);
  assert.equal(formaPeRand({ tip: 'v', unghi: 60 }), true);
  assert.equal(formaPeRand({ tip: 'v', unghi: 30, varf: 0.2 }), true);
  assert.equal(formaPeRand({ tip: 'bila' }), false);
  assert.equal(formaPeRand({ tip: 'toroidala', raza: 1 }), false);
  assert.equal(formaPeRand({ tip: 'conica' } as unknown as FormaSculaDoc), false);
  // Operația întreagă: toate frezele ei (aici, una de rest toroidală); finisarea și degroșarea au rândul lor, doar de citit.
  const cu = (v: Liber): Operatie => op(v) as unknown as Operatie;
  assert.equal(operatieCuRand(cu({})), true);
  assert.equal(operatieCuRand(cu({ scula: inV(1, 6, 60), latura: 'pe-linie' })), true);
  assert.equal(operatieCuRand(cu({ scula: toro(1, 6, 1) })), false);
  assert.equal(operatieCuRand(cu({ tip: 'buzunar', pasLateral: 2, rest: [{ scula: toro(2, 3, 0.5), pasLateral: 1 }] })), false);
  assert.equal(operatieCuRand(cu({ tip: 'buzunar', pasLateral: 2, rest: [{ scula: plata(2, 3), pasLateral: 1 }] })), true);
  assert.equal(operatieCuRand(cu({ tip: 'finisare', scula: plata(1, 6) })), false);
  assert.equal(operatieCuRand(cu({ tip: 'degrosare', scula: plata(1, 6) })), false);
});
