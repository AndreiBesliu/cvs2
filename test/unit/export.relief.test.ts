/**
 * Rândul editabil al operațiilor reliefului în fereastra exportului (felia 18.1↑d-4, ADR 0315): ce arată fișa (valorile
 * documentului, ca text), ce câmpuri sunt greșite (marginile ușii documentului și ale lucrării) și ce scrie Exportă în operație.
 * Un Exportă fără nicio schimbare scrie aceeași operație, la octet; o freză cu alt diametru sau altă formă își pierde originea
 * din bibliotecă (scrisă de mână); marginea și planul zero, schimbate pe un rând, ajung și pe perechea lui (lucrarea le cere
 * egale pe același relief, ADR 0313 §5).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Operatie } from '../../src/model/document.ts';
import { operatieReliefDinDialog } from '../../src/app/valoriOperatii.ts';
import { campuriReliefGresite, cuPerechile, randRelief, valoriRelief, type RandRelief } from '../../src/ui/exportRelief.ts';
import type { FinisareExport } from '../../src/ui/FisaFinisare.tsx';

const fin: FinisareExport = {
  cheie: 'p/f', fel: 'finisare', descriere: 'Relief', perechi: ['p/d'],
  scula: { numar: 2, diametru: 6, forma: 'bila' }, pasLateral: 0.6, celula: 0.25, unghi: 0, aliniat: true, margine: 'perete', adancime: 18, pas: 3,
};
const deg: FinisareExport = {
  cheie: 'p/d', fel: 'degrosare', adaos: 0.5, descriere: 'Relief', perechi: ['p/f'],
  scula: { numar: 1, diametru: 6, forma: 'plata' }, pasLateral: 2.5, unghi: 90, aliniat: true, margine: 'trece', planZero: 2, adancime: 18, pas: 3,
};
const ro = (x: number): string => String(x).replace('.', ',');

test('rândul ca text, din valorile documentului (cu virgula în română)', () => {
  const r = randRelief(fin, ro);
  assert.deepEqual(r, {
    fel: 'finisare', numarScula: '2', diametruScula: '6', formaScula: 'bila', unghiV: '60', varfV: '0', razaColt: '1', pasLateral: '0,6', adaos: '0,5',
    unghi: '0', aliniat: true, margine: 'perete', z: 'varf', planZero: '0', adancime: '18', pas: '3', origineScula: null,
  });
  const d = randRelief(deg, ro);
  assert.equal(d.fel, 'degrosare');
  assert.equal(d.adaos, '0,5');
  assert.equal(d.formaScula, 'plata');
  assert.equal(d.z, 'plan');
  assert.equal(d.planZero, '2');
  assert.equal(d.margine, 'trece');
  const v: FinisareExport = { ...fin, scula: { numar: 3, diametru: 3, forma: 'v', unghi: 60, varf: 0.2 } };
  const rv = randRelief(v, String);
  assert.deepEqual([rv.formaScula, rv.unghiV, rv.varfV], ['v', '60', '0.2']);
});

test('valorile citite din text (oricare separator) și câmpurile greșite: marginile ușii și ale lucrării', () => {
  const r = randRelief(fin, ro);
  assert.deepEqual(valoriRelief(r), {
    fel: 'finisare', scula: { numar: 2, diametru: 6, forma: { tip: 'bila' }, origine: null }, pasLateral: 0.6, adaos: 0.5, unghi: 0, aliniat: true,
    margine: 'perete', planZero: null, adancime: 18, pas: 3,
  });
  assert.deepEqual(campuriReliefGresite(r), []);
  const rau = (p: Partial<RandRelief>): readonly string[] => campuriReliefGresite({ ...r, ...p });
  assert.deepEqual(rau({ numarScula: '0' }), ['scula']);
  assert.deepEqual(rau({ numarScula: '1,5' }), ['scula']);
  assert.deepEqual(rau({ diametruScula: '' }), ['diametru']);
  // Pasul lateral: peste 0, cel mult diametrul frezei (altfel rămân dungi: refuzul lucrării) și cel mult ușa (25 mm).
  assert.deepEqual(rau({ pasLateral: '0' }), ['pas-lateral']);
  assert.deepEqual(rau({ pasLateral: '6' }), []);
  assert.deepEqual(rau({ pasLateral: '6,01' }), ['pas-lateral']);
  assert.deepEqual(rau({ unghi: '180' }), ['unghi']);
  assert.deepEqual(rau({ unghi: '-1' }), ['unghi']);
  assert.deepEqual(rau({ unghi: '179,9' }), []);
  // Planul zero, doar cu „plan”: în [0, 1 000].
  assert.deepEqual(rau({ planZero: '-1' }), []);
  assert.deepEqual(rau({ z: 'plan', planZero: '-1' }), ['plan-zero']);
  assert.deepEqual(rau({ z: 'plan', planZero: '0' }), []);
  assert.deepEqual(rau({ z: 'plan', planZero: '1000,5' }), ['plan-zero']);
  assert.deepEqual(rau({ adancime: '0' }), ['adancime']);
  assert.deepEqual(rau({ pas: 'x' }), ['pas']);
  // V-ul: unghiul în marginile frezei în V, vârful de la 0 până sub diametru.
  assert.deepEqual(rau({ formaScula: 'v', unghiV: '0' }), ['unghi-v']);
  assert.deepEqual(rau({ formaScula: 'v', varfV: '6' }), ['varf-v']);
  assert.deepEqual(rau({ formaScula: 'v', varfV: '0' }), []);
  // Adaosul, doar la degroșare: în [0, 10].
  const d = randRelief(deg, ro);
  assert.deepEqual(campuriReliefGresite({ ...d, adaos: '0' }), []);
  assert.deepEqual(campuriReliefGresite({ ...d, adaos: '10,1' }), ['adaos']);
  assert.deepEqual(campuriReliefGresite({ ...r, adaos: '99' }), []);
  // Degroșarea merge doar cu freza plată (ADR 0313 §1): forma ei nu se alege, deci nu e greșită.
  assert.equal(valoriRelief({ ...d, formaScula: 'bila' })?.scula.forma, null);
  assert.equal(valoriRelief({ ...r, pas: 'x' }), null);
});

test('marginea și planul zero se scriu și pe perechea rândului (aceeași regulă ca panoul); restul, doar pe el', () => {
  const p = { 'p/f': randRelief(fin, String), 'p/d': randRelief(deg, String), 'q/f': randRelief({ ...fin, cheie: 'q/f', perechi: [] }, String) };
  const perechi = new Map([['p/f', ['p/d']], ['p/d', ['p/f']], ['q/f', []]]);
  const a = cuPerechile(p, perechi, 'p/f', { margine: 'trece', pasLateral: '1' });
  assert.equal(a['p/f']!.margine, 'trece');
  assert.equal(a['p/f']!.pasLateral, '1');
  assert.equal(a['p/d']!.margine, 'trece');
  assert.equal(a['p/d']!.pasLateral, '2.5');
  assert.equal(a['q/f'], p['q/f']);
  const b = cuPerechile(p, perechi, 'p/d', { z: 'varf' });
  assert.equal(b['p/f']!.z, 'varf');
  const c = cuPerechile(p, perechi, 'p/d', { z: 'plan', planZero: '4' });
  assert.deepEqual([c['p/f']!.z, c['p/f']!.planZero], ['plan', '4']);
  // Un rând necunoscut: nimic nu se schimbă.
  assert.equal(cuPerechile(p, perechi, 'x/y', { margine: 'trece' }), p);
});

const opFin: Operatie = {
  id: 'f', tip: 'finisare', noduri: ['r'], latura: 'pe-linie', adancime: 18, pas: 3, pasLateral: 0.6,
  scula: { numar: 2, nume: 'Bila 6 din biblioteca', diametru: 6, forma: { tip: 'bila' }, biblioteca: { id: 'b1', rev: 3 }, regim: { turatie: 16000, avans: 1500, plonjare: 400 } },
  finisare: { unghi: 0 }, rang: 1,
} as Operatie;
const opDeg: Operatie = {
  id: 'd', tip: 'degrosare', noduri: ['r'], latura: 'pe-linie', adancime: 18, pas: 3, pasLateral: 2.5,
  scula: { numar: 1, nume: 'freza plata 6', diametru: 6 }, degrosare: { adaos: 0.5, unghi: 90, margine: 'trece', planZero: 2 },
} as Operatie;
/** Originea frezei din document, cum o citește fereastra (felia 18.1↑d-5, ca `origineDin` din `ExportConectat`). */
const origineDin = (s: Operatie['scula']): { readonly origine?: NonNullable<RandRelief['origineScula']> } => (s.biblioteca ? {
  origine: {
    nume: s.nume, biblioteca: { id: s.biblioteca.id, rev: s.biblioteca.rev }, ...(s.regim ? { regim: s.regim } : {}),
    ...(s.tais !== undefined ? { tais: s.tais } : {}),
  },
} : {});
const finDin = (o: Operatie): FinisareExport => ({
  ...fin, cheie: `p/${o.id}`, fel: o.tip === 'degrosare' ? 'degrosare' : 'finisare', ...(o.tip === 'degrosare' ? { adaos: o.degrosare!.adaos } : {}),
  scula: o.scula.forma?.tip === 'v'
    ? { numar: o.scula.numar, diametru: o.scula.diametru, forma: 'v', unghi: o.scula.forma.unghi, ...(o.scula.forma.varf !== undefined ? { varf: o.scula.forma.varf } : {}), ...origineDin(o.scula) }
    : o.scula.forma?.tip === 'toroidala'
    ? { numar: o.scula.numar, diametru: o.scula.diametru, forma: 'toroidala', razaColt: o.scula.forma.raza, ...origineDin(o.scula) }
    : { numar: o.scula.numar, diametru: o.scula.diametru, forma: o.scula.forma?.tip === 'bila' ? 'bila' : 'plata', ...origineDin(o.scula) },
  pasLateral: o.pasLateral!, unghi: (o.tip === 'degrosare' ? o.degrosare : o.finisare)!.unghi,
  aliniat: o.finisare?.nealiniat !== true, margine: (o.tip === 'degrosare' ? o.degrosare : o.finisare)!.margine === 'trece' ? 'trece' : 'perete',
  ...((o.tip === 'degrosare' ? o.degrosare : o.finisare)!.planZero !== undefined ? { planZero: (o.tip === 'degrosare' ? o.degrosare : o.finisare)!.planZero! } : {}),
  adancime: o.adancime, pas: o.pas,
});
const scrie = (o: Operatie, p: Partial<RandRelief> = {}): Operatie => {
  const v = valoriRelief({ ...randRelief(finDin(o), String), ...p });
  assert.ok(v);
  return operatieReliefDinDialog(o, v);
};

test('Exportă fără nicio schimbare scrie aceeași operație, la octet (freza din bibliotecă își păstrează originea)', () => {
  for (const o of [opFin, opDeg]) {
    const n = scrie(o);
    assert.equal(JSON.stringify(n), JSON.stringify(o));
  }
});

test('Exportă scrie valorile schimbate: pasul lateral, adâncimea, pasul, unghiul, liniile, marginea, planul zero, adaosul', () => {
  const n = scrie(opFin, { pasLateral: '0.5', adancime: '12', pas: '2', unghi: '45', aliniat: false, margine: 'trece', z: 'plan', planZero: '1.5' });
  assert.equal(n.pasLateral, 0.5);
  assert.equal(n.adancime, 12);
  assert.equal(n.pas, 2);
  assert.deepEqual(n.finisare, { unghi: 45, nealiniat: true, margine: 'trece', planZero: 1.5 });
  // Freza n-a fost atinsă: rămâne cu originea ei; rangul rămâne (îl scrie apoi ordinea).
  assert.equal(n.scula, opFin.scula);
  assert.equal(n.rang, 1);
  // Înapoi la implicite: câmpurile opționale pleacă.
  const m = scrie(n, { aliniat: true, margine: 'perete', z: 'varf' });
  assert.deepEqual(m.finisare, { unghi: 45 });
  const d = scrie(opDeg, { adaos: '0.3', margine: 'perete', z: 'varf', unghi: '0' });
  assert.deepEqual(d.degrosare, { adaos: 0.3, unghi: 0 });
});

test('freza: alt T o păstrează; alt diametru sau altă formă o face scrisă de mână (fără originea, valorile de lucru și tăișul)', () => {
  const t3 = scrie(opFin, { numarScula: '3' });
  assert.deepEqual(t3.scula, { ...opFin.scula, numar: 3 });
  const d4 = scrie(opFin, { diametruScula: '4' });
  assert.deepEqual(d4.scula, { numar: 2, nume: 'freza bila', diametru: 4, forma: { tip: 'bila' } });
  const v = scrie(opFin, { formaScula: 'v', unghiV: '60', varfV: '0.2' });
  assert.deepEqual(v.scula, { numar: 2, nume: 'freza V60 varf 0.2', diametru: 6, forma: { tip: 'v', unghi: 60, varf: 0.2 } });
  const p = scrie(opFin, { formaScula: 'plata' });
  assert.deepEqual(p.scula, { numar: 2, nume: 'freza plata', diametru: 6 });
  // Pe aceeași formă în V, doar vârful schimbat: freza scrisă de mână, cu un câmp necunoscut al formei păstrat.
  const opV = { ...opFin, scula: { numar: 4, nume: 'V60', diametru: 6, forma: { tip: 'v', unghi: 60, profil: 'x' } } } as Operatie;
  assert.equal(JSON.stringify(scrie(opV)), JSON.stringify(opV));
  const vf = scrie(opV, { varfV: '0.3' });
  assert.deepEqual(vf.scula, { numar: 4, nume: 'freza V60 varf 0.3', diametru: 6, forma: { tip: 'v', profil: 'x', unghi: 60, varf: 0.3 } });
  // Degroșarea: freza rămâne plată, oricare ar fi forma din text.
  const dg = scrie(opDeg, { diametruScula: '8', formaScula: 'bila' });
  assert.deepEqual(dg.scula, { numar: 1, nume: 'freza plata', diametru: 8 });
});

test('toroidala pe finisare (felia 18.1↑e, ADR 0319): rândul, raza colțului în (0, Ø / 2), citirea și ce scrie Exportă', () => {
  // Din document: forma și raza colțului, ca text.
  const tor: FinisareExport = { ...fin, scula: { numar: 3, diametru: 6, forma: 'toroidala', razaColt: 1.5 } };
  const r = randRelief(tor, ro);
  assert.deepEqual([r.formaScula, r.razaColt], ['toroidala', '1,5']);
  assert.deepEqual(valoriRelief(r)?.scula.forma, { tip: 'toroidala', raza: 1.5 });
  assert.deepEqual(campuriReliefGresite(r), []);
  // Raza colțului: peste 0 și sub jumătatea diametrului (cu Ø / 2 e o bilă), ca la ușă.
  const rau = (p: Partial<RandRelief>): readonly string[] => campuriReliefGresite({ ...r, ...p });
  assert.deepEqual(rau({ razaColt: '0' }), ['raza-colt']);
  assert.deepEqual(rau({ razaColt: '3' }), ['raza-colt']);
  assert.deepEqual(rau({ razaColt: '2,999' }), []);
  assert.deepEqual(rau({ razaColt: 'x' }), ['raza-colt']);
  assert.deepEqual(rau({ diametruScula: '4', razaColt: '2' }), ['raza-colt']);
  // Doar cu toroidala: pe bilă, raza scrisă nu se judecă.
  assert.deepEqual(rau({ formaScula: 'bila', razaColt: '0' }), []);
  assert.equal(valoriRelief({ ...r, razaColt: '' }), null);
  // Degroșarea rămâne plată: o toroidală scrisă pe ea nu e citită ca formă.
  assert.equal(valoriRelief({ ...randRelief(deg, ro), formaScula: 'toroidala', razaColt: '1' })?.scula.forma, null);
  // Exportă: altă formă sau altă rază fac freza scrisă de mână, cu numele după formă; pe aceeași formă, un câmp necunoscut rămâne.
  const t = scrie(opFin, { formaScula: 'toroidala', razaColt: '1.5' });
  assert.deepEqual(t.scula, { numar: 2, nume: 'freza toroidala r1.5', diametru: 6, forma: { tip: 'toroidala', raza: 1.5 } });
  const opT = { ...opFin, scula: { numar: 4, nume: 'Toro', diametru: 6, forma: { tip: 'toroidala', raza: 1, profil: 'x' } } } as Operatie;
  assert.equal(JSON.stringify(scrie(opT)), JSON.stringify(opT));
  const rc = scrie(opT, { razaColt: '2' });
  assert.deepEqual(rc.scula, { numar: 4, nume: 'freza toroidala r2', diametru: 6, forma: { tip: 'toroidala', profil: 'x', raza: 2 } });
  // De pe toroidală pe bilă: forma bilei, fără raza colțului.
  assert.deepEqual(scrie(opT, { formaScula: 'bila' }).scula, { numar: 4, nume: 'freza bila', diametru: 6, forma: { tip: 'bila' } });
});
