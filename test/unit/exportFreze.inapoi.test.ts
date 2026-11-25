/**
 * „Pune-o înapoi în bibliotecă” (ADR 0300 §5, felia 16.A↑b-6), pe hârtie:
 *
 * - **copia de pe rând** (`copieDeReadus`): pe locul unei freze cu origine, ce știe proiectul despre ea (id-ul și versiunea
 *   originii, numele, T-ul, diametrul, forma, valorile de lucru, tăișul) și pașii rândului; fără origine sau cu un număr
 *   de necitit, nimic;
 * - **freza din copie** (`frezaDinCopie`): felul din formă (plată, V, gravare cu vârful), valorile de lucru ale copiei (lipsă: cele
 *   ale frezelor de pornire), pasul pe trecere al rândului, pasul lateral din mm în procente din diametru (cel mult 50 %);
 * - **lista cu freza pusă înapoi** (`cuFrezaReadusa`): cu id-ul originii, o versiune peste a copiei, un nume liber; refuzată cu
 *   id-ul încă în listă, cu lista plină sau cu valori în afara marginilor;
 * - **rândurile după** (`cuFrezaPusaInapoi`): locul apăsat ia freza pusă înapoi (numele liber, versiunea); celelalte locuri cu
 *   aceeași origine, doar cele care diferă de ea cel mult prin nume.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copieDeReadus, cuFrezaPusaInapoi, type FrezaOferita, type OrigineFreza, type Rand } from '../../src/ui/exportRand.ts';
import { cuFrezaReadusa, frezaDinCopie, MARGINI_FREZA, type FrezaSalvata } from '../../src/model/freza.ts';

const P12: OrigineFreza = { nume: 'Plată Ø12', biblioteca: { id: 'std-plata-12', rev: 3 }, regim: { turatie: 16000, avans: 1400, plonjare: 350 }, tais: 30 };
const V60: OrigineFreza = { nume: 'V60 Ø6', biblioteca: { id: 'v60', rev: 1 }, regim: { turatie: 18000, avans: 1000, plonjare: 300 } };

/** Un rând al ferestrei, cu valorile date peste cele ale unui profil cu freza plată Ø12 din bibliotecă. */
function rand(p: Partial<Rand> = {}): Rand {
  return {
    numarScula: '6', diametruScula: '12', origineScula: P12, formaScula: 'plata', unghiV: '60', varfV: '0', directie: '', latura: 'exterior',
    sens: 'urcare', adancime: '6', pas: '4', urechi: false, numarUrechi: '4', latimeUreche: '8', grosimeUreche: '2', modUrechi: 'egale',
    rampa: false, lungimeRampa: '10', intrari: false, razaIntrare: '3', colturi: '', despartire: false, tip: 'profil', retragereCompleta: '1',
    pasLateral: '4.8', coborare: 'plonjare', unghiCoborare: '3', lungimeZigzag: '20', razaElice: '3',
    fundPlat: false, numarSculaFund: '3', diametruSculaFund: '3.175', pasLateralFund: '1.27', origineFund: null, rest: [], restFund: [],
    strategie: 'inele', unghiParalel: '0', incrustatie: false, jocInc: '0.5', fierastrauInc: '2', margineInc: '5', acelasiSpatiu: false,
    jurDop: 'fata', latimeBanda: '', decupareBanda: true, placaBanda: '', frezaBanda: false, numarSculaBanda: '8', diametruSculaBanda: '3',
    origineBanda: null, numarPunti: '4', latimePunti: '4', grosimePunti: '1', incrustatieDreapta: false, lateralInc: '0.1', dopInc: 'ridicat',
    sprijinInc: 'fund', locasInc: 'buzunar', treaptaInc: 'fara', adancimeTreapta: '1.5', latimeTreapta: '3', frezaDop: false,
    numarSculaDop: '5', diametruSculaDop: '3', pasLateralDop: '1.2', origineDop: null, restDop: [], ...p,
  };
}

test('copia de pe rând: originea, T-ul, diametrul, forma, valorile de lucru, tăișul și pașii rândului', () => {
  assert.deepEqual(copieDeReadus(rand(), 'scula'), {
    id: 'std-plata-12', rev: 3, nume: 'Plată Ø12', numar: 6, diametru: 12, regim: { turatie: 16000, avans: 1400, plonjare: 350 }, tais: 30,
    pas: 4, pasLateral: null,
  });
  // La buzunar, și pasul lateral al rândului (mm); la V, forma, cu vârful doar dacă e.
  assert.equal(copieDeReadus(rand({ tip: 'buzunar', latura: 'interior' }), 'scula')?.pasLateral, 4.8);
  const v = rand({ tip: 'vcarve', origineScula: V60, numarScula: '3', diametruScula: '6', formaScula: 'v', unghiV: '60', varfV: '0' });
  assert.deepEqual(copieDeReadus(v, 'scula'), {
    id: 'v60', rev: 1, nume: 'V60 Ø6', numar: 3, diametru: 6, forma: { tip: 'v', unghi: 60 }, regim: V60.regim, pas: 4, pasLateral: null,
  });
  assert.deepEqual(copieDeReadus({ ...v, varfV: '0.2' }, 'scula')?.forma, { tip: 'v', unghi: 60, varf: 0.2 });
  // Fundul plat, cu pasul lateral lui; o freză de rest, cu al ei.
  const f = rand({ ...v, fundPlat: true, origineFund: P12, numarSculaFund: '6', diametruSculaFund: '12', pasLateralFund: '6',
    restFund: [{ numar: '1', diametru: '3.175', pas: '1.27', origine: { ...P12, nume: 'Plată Ø3,175', biblioteca: { id: 'p3', rev: 2 } } }] });
  assert.deepEqual(copieDeReadus(f, 'fund'), { ...copieDeReadus(rand(), 'scula'), pasLateral: 6 });
  assert.deepEqual(copieDeReadus(f, { rest: 'fund', k: 0 }), {
    id: 'p3', rev: 2, nume: 'Plată Ø3,175', numar: 1, diametru: 3.175, regim: P12.regim, tais: 30, pas: 4, pasLateral: 1.27,
  });
  // Fără origine, un loc care nu e pe rând sau un număr de necitit: nimic.
  assert.equal(copieDeReadus(rand({ origineScula: null }), 'scula'), null);
  assert.equal(copieDeReadus(f, { rest: 'fund', k: 1 }), null);
  assert.equal(copieDeReadus(rand(), 'fund'), null);
  assert.equal(copieDeReadus(rand({ diametruScula: 'x' }), 'scula'), null);
  assert.equal(copieDeReadus(rand({ numarScula: '' }), 'scula'), null);
  // Un pas de necitit nu oprește copia: freza își ia pasul ei.
  assert.equal(copieDeReadus(rand({ pas: 'x' }), 'scula')?.pas, null);
});

test('freza din copie: felul din formă, valorile copiei, pasul rândului, pasul lateral în procente', () => {
  const plata = frezaDinCopie({ nume: 'Plată Ø12', numar: 6, diametru: 12, regim: { turatie: 16000, avans: 1400, plonjare: 350 }, tais: 30, pas: 4, pasLateral: 4.8 });
  assert.deepEqual(plata, {
    nume: 'Plată Ø12', fel: 'plata', diametru: 12, tais: 30, numar: 6, turatie: 16000, avans: 1400, plonjare: 350, pas: 4, pasLateral: 40,
  });
  assert.deepEqual(frezaDinCopie({ nume: 'V60 Ø6', numar: 3, diametru: 6, forma: { tip: 'v', unghi: 60 }, pas: 1.5, pasLateral: null }), {
    nume: 'V60 Ø6', fel: 'v', diametru: 6, unghi: 60, numar: 3, turatie: 18000, avans: 1000, plonjare: 300, pas: 1.5, pasLateral: 40,
  });
  const g = frezaDinCopie({ nume: 'Gravare', numar: 5, diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.2 }, pas: 1, pasLateral: null });
  assert.deepEqual([g.fel, g.unghi, g.varf], ['gravare', 30, 0.2]);
  // Pasul lateral: 1,27 mm din Ø3,175 sunt 40 %; peste jumătate, 50 %; pasul de necitit, jumătate din diametru.
  assert.equal(frezaDinCopie({ nume: 'a', numar: 1, diametru: 3.175, pas: 1, pasLateral: 1.27 }).pasLateral, 40);
  assert.equal(frezaDinCopie({ nume: 'a', numar: 1, diametru: 6, pas: 1, pasLateral: 4 }).pasLateral, 50);
  assert.equal(frezaDinCopie({ nume: 'a', numar: 1, diametru: 6, pas: null, pasLateral: null }).pas, 3);
  assert.equal(frezaDinCopie({ nume: 'a', numar: 1, diametru: 6, pas: 0, pasLateral: 0 }).pas, 3);
  assert.equal(frezaDinCopie({ nume: 'a', numar: 1, diametru: 6, pas: 0, pasLateral: 0 }).pasLateral, 40);
});

/** O freză ținută, ca în bibliotecă. */
const tinuta = (id: string, nume: string, diametru = 6): FrezaSalvata => ({
  id, rev: 1, schimbatLa: 1, nume, fel: 'plata', diametru, numar: 2, turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40,
});
const P12_FREZA = frezaDinCopie({ nume: 'Plată Ø12', numar: 6, diametru: 12, regim: { turatie: 16000, avans: 1400, plonjare: 350 }, tais: 30, pas: 4, pasLateral: 4.8 });

test('lista cu freza pusă înapoi: id-ul originii, o versiune peste a copiei, un nume liber; refuzurile', () => {
  const lista = [tinuta('a', 'Plată Ø6')];
  const r = cuFrezaReadusa(lista, 'std-plata-12', 4, P12_FREZA, 5000);
  assert.ok(r.ok);
  assert.deepEqual(r.freza, { ...P12_FREZA, id: 'std-plata-12', rev: 4, schimbatLa: 5000 });
  assert.deepEqual(r.lista, [...lista, r.freza]);
  // Numele luat de altă freză (sau de una necitită) primește „(2)”.
  const luat = cuFrezaReadusa([tinuta('b', 'plată ø12', 12)], 'std-plata-12', 4, P12_FREZA, 5000);
  assert.ok(luat.ok);
  assert.equal(luat.freza.nume, 'Plată Ø12 (2)');
  const rezervat = cuFrezaReadusa([], 'std-plata-12', 4, P12_FREZA, 5000, ['Plată Ø12']);
  assert.ok(rezervat.ok);
  assert.equal(rezervat.freza.nume, 'Plată Ø12 (2)');
  // Id-ul încă în listă (pusă înapoi între timp, în altă filă): nimic suprascris.
  assert.deepEqual(cuFrezaReadusa([tinuta('std-plata-12', 'Altceva')], 'std-plata-12', 4, P12_FREZA, 5000), { ok: false, probleme: { id: 'exista' } });
  // Lista plină.
  const plina = Array.from({ length: MARGINI_FREZA.freze }, (_, i) => tinuta(`f${i}`, `F${i}`));
  assert.deepEqual(cuFrezaReadusa(plina, 'std-plata-12', 4, P12_FREZA, 5000), { ok: false, probleme: { lista: 'plina' } });
  // Valori în afara marginilor bibliotecii (un tăiș mai scurt decât conul unui V).
  const r2 = cuFrezaReadusa([], 'v', 2, { ...P12_FREZA, fel: 'v', unghi: 60, tais: 0.5 }, 5000);
  assert.deepEqual(r2, { ok: false, probleme: { tais: 'con' } });
});

/** Freza pusă înapoi, ca o oferă aplicația ferestrei. */
const oferita = (o: OrigineFreza, diametru: number): FrezaOferita => ({
  id: o.biblioteca.id, nume: o.nume, pas: 4, pasLateral: diametru * 0.4, scula: { numar: 6, diametru, origine: o },
});

test('rândurile după: locul apăsat ia freza pusă înapoi; celelalte, doar dacă diferă de ea cel mult prin nume', () => {
  const pusa = oferita({ ...P12, nume: 'Plată Ø12 (2)', biblioteca: { id: 'std-plata-12', rev: 4 } }, 12);
  const param = {
    a: rand(),
    // Aceeași copie, pe alt rând: ia și ea freza pusă înapoi.
    b: rand({ numarScula: '7' }),
    // Altă copie a aceleiași freze (alt avans): rămâne, cu nota ei.
    c: rand({ origineScula: { ...P12, regim: { ...P12.regim!, avans: 900 } } }),
    // Altă freză: neatinsă.
    d: rand({ origineScula: V60, diametruScula: '6' }),
  };
  const dupa = cuFrezaPusaInapoi(param, 'a', 'scula', pusa, String);
  assert.deepEqual(dupa['a']!.origineScula, pusa.scula.origine);
  assert.deepEqual(dupa['b']!.origineScula, pusa.scula.origine);
  assert.equal(dupa['b']!.numarScula, '7');
  assert.deepEqual(dupa['c'], param.c);
  assert.deepEqual(dupa['d'], param.d);
  // Locul apăsat ia freza și când diferă de ea (copia fără valori de lucru, puse înapoi cu cele de pornire).
  const faraRegim = { a: rand({ origineScula: { nume: 'Plată Ø12', biblioteca: { id: 'std-plata-12', rev: 3 } } }) };
  const r = cuFrezaPusaInapoi(faraRegim, 'a', 'scula', pusa, String);
  assert.deepEqual(r['a']!.origineScula, pusa.scula.origine);
  // Pe o freză de rest, doar locul ei.
  const rest = { a: rand({ tip: 'buzunar', rest: [{ numar: '1', diametru: '12', pas: '4.8', origine: P12 }, { numar: '2', diametru: '6', pas: '2.4', origine: null }] }) };
  const rr = cuFrezaPusaInapoi(rest, 'a', { rest: 'buzunar', k: 0 }, pusa, String);
  assert.deepEqual(rr['a']!.rest[0]!.origine, pusa.scula.origine);
  assert.equal(rr['a']!.rest[1]!.origine, null);
});
