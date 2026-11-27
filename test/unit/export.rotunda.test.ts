/**
 * Bila și toroidala în proiect (ADR 0303, felia 16.A↑e-4), partea pură: rândul ferestrei exportului poartă forma rotundă
 * (bila, toroidala cu raza colțului), Exportă o scrie în document, iar lucrarea o taie pe canelură (16.A↑e-3). Pe hârtie:
 *
 * - **forma pe rând** (`formaDinRand`, `campuriForma`): plata, V-ul, bila și toroidala, dus-întors; o rază de necitit nu e o formă;
 * - **identitatea frezei** pentru numărul T (`numarPentruRand`, `cheieFreza`): bila, toroidala cu altă rază și plata de același Ø
 *   sunt trei freze;
 * - **alegerea din bibliotecă** (`cuFrezaAleasa`, `cuValorileNoi`), **nota** (`diferenteFreza`: felul și raza) și
 *   **recunoașterea** (`stareOrigine`): forma întreagă, nu doar diametrul;
 * - **copia de readus** (`copieDeReadus`, `frezaDinCopie`): bila rămâne bilă, toroidala rămâne toroidală;
 * - **marginile** (`campuriSculaGresite`): raza colțului în (0, Ø / 2);
 * - **ce scrie Exportă** (`operatieDinDialog`): forma rotundă, cu numele după formă; fără schimbare, aceeași freză, la octet; iar
 *   programul are forma în IR;
 * - **listele**: rândul poartă formele rotunde (`formaPeRand`); Tăierea oferă bila și toroidala doar unde lucrarea le primește.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  campuriForma, campuriSculaGresite, cheieFreza, copieDeReadus, cuFrezaAleasa, cuValorileNoi, diferenteFreza, formaDinRand, locuriFreze,
  numarPentruRand, stareOrigine, type FrezaOferita, type FormaRand, type OrigineFreza, type Rand,
} from '../../src/ui/exportRand.ts';
import { formaPeRand, operatieCuRand } from '../../src/model/formaFrezei.ts';
import { frezePeRanduri, frezePotrivite } from '../../src/model/alegereFreza.ts';
import { FELURI_CU_CAM, frezaDinCopie, sculaDinFreza, type Freza, type FrezaSalvata } from '../../src/model/freza.ts';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import type { Operatie } from '../../src/model/document.ts';

const T1: OrigineFreza = { nume: 'Toroidală Ø6 r1', biblioteca: { id: 't6', rev: 1 }, regim: { turatie: 18000, avans: 1000, plonjare: 300 } };
const B6: OrigineFreza = { nume: 'Bilă Ø6', biblioteca: { id: 'b6', rev: 1 }, regim: { turatie: 18000, avans: 1000, plonjare: 300 } };

/** Un rând de canelură (profil pe linie), cu freza plată Ø6 scrisă de mână, peste care se pun valorile date. */
function rand(p: Partial<Rand> = {}): Rand {
  return {
    numarScula: '2', diametruScula: '6', origineScula: null, regimMana: { turatie: '', avans: '', plonjare: '' }, formaScula: 'plata', unghiV: '60', varfV: '0', razaColt: '1', directie: '', latura: 'pe-linie',
    sens: 'urcare', adancime: '1', pas: '1.5', urechi: false, numarUrechi: '4', latimeUreche: '8', grosimeUreche: '2', modUrechi: 'egale',
    rampa: false, lungimeRampa: '10', intrari: false, razaIntrare: '3', colturi: '', despartire: false, tip: 'profil', retragereCompleta: '1',
    pasLateral: '2.4', coborare: 'plonjare', unghiCoborare: '3', lungimeZigzag: '20', razaElice: '3',
    fundPlat: false, numarSculaFund: '3', diametruSculaFund: '3.175', pasLateralFund: '1.2', origineFund: null, rest: [], restFund: [],
    strategie: 'inele', unghiParalel: '0', incrustatie: false, jocInc: '0.5', fierastrauInc: '2', margineInc: '5', acelasiSpatiu: false,
    jurDop: 'fata', latimeBanda: '', decupareBanda: true, placaBanda: '', frezaBanda: false, numarSculaBanda: '8', diametruSculaBanda: '3',
    origineBanda: null, numarPunti: '4', latimePunti: '4', grosimePunti: '1', incrustatieDreapta: false, lateralInc: '0.1', dopInc: 'ridicat',
    sprijinInc: 'fund', locasInc: 'buzunar', treaptaInc: 'fara', adancimeTreapta: '1.5', latimeTreapta: '3', frezaDop: false,
    numarSculaDop: '5', diametruSculaDop: '3', pasLateralDop: '1.2', origineDop: null, restDop: [], ...p,
  };
}
const din = (o: OrigineFreza, diametru: number, forma: FormaRand | undefined, numar = 2): FrezaOferita => ({
  id: o.biblioteca.id, nume: o.nume, pas: 3, pasLateral: Math.floor(diametru * 400) / 1000,
  scula: { numar, diametru, ...(forma ? { forma } : {}), origine: o },
});

test('forma pe rând: plata, V-ul, bila și toroidala, dus-întors; raza de necitit sau ≤ 0 nu e o formă', () => {
  const forme: ReadonlyArray<FormaRand | undefined> = [undefined, { tip: 'v', unghi: 60 }, { tip: 'v', unghi: 30, varf: 0.2 }, { tip: 'bila' }, { tip: 'toroidala', raza: 1.5 }];
  for (const f of forme) assert.deepEqual(formaDinRand({ ...rand(), ...campuriForma(f) }), f ?? null, JSON.stringify(f));
  assert.deepEqual(campuriForma({ tip: 'toroidala', raza: 1.5 }), { formaScula: 'toroidala', razaColt: '1.5' });
  assert.deepEqual(campuriForma({ tip: 'bila' }), { formaScula: 'bila' });
  assert.equal(formaDinRand(rand({ formaScula: 'toroidala', razaColt: 'x' })), undefined);
  assert.equal(formaDinRand(rand({ formaScula: 'toroidala', razaColt: '0' })), undefined);
});

test('identitatea frezei: bila, toroidala cu altă rază și plata de același Ø sunt freze diferite pentru T', () => {
  const plata = { numar: 2, diametru: 6 }, bila = { numar: 2, diametru: 6, forma: { tip: 'bila' } as const };
  const t1 = { numar: 2, diametru: 6, forma: { tip: 'toroidala', raza: 1 } as const }, t2 = { numar: 2, diametru: 6, forma: { tip: 'toroidala', raza: 2 } as const };
  assert.equal(numarPentruRand([plata], bila), 1);
  assert.equal(numarPentruRand([t1], t2), 1);
  assert.equal(numarPentruRand([t1], { ...t1 }), 2);
  assert.equal(numarPentruRand([bila], t1), 1);
  assert.notEqual(cheieFreza(6, null, null, false, 1), cheieFreza(6, null, null, false, 2));
  assert.notEqual(cheieFreza(6, null, null, false, 1), cheieFreza(6, null, null, true));
  assert.notEqual(cheieFreza(6, null, null, false, 1), cheieFreza(6, null, null));
});

test('alegerea din bibliotecă și valorile noi pun forma rotundă pe rând (felul și raza)', () => {
  const t = din(T1, 6, { tip: 'toroidala', raza: 1 }, 4);
  const ales = cuFrezaAleasa(rand(), 'scula', t, 4);
  assert.equal(ales.formaScula, 'toroidala');
  assert.equal(ales.razaColt, '1');
  assert.equal(cuFrezaAleasa(rand(), 'scula', din(B6, 6, { tip: 'bila' }), 2).formaScula, 'bila');
  const noi = cuValorileNoi(rand({ origineScula: T1 }), 'scula', din(T1, 6, { tip: 'toroidala', raza: 1.2 }));
  assert.deepEqual([noi.formaScula, noi.razaColt], ['toroidala', '1.2']);
});

test('nota bibliotecii vede felul și raza; recunoașterea cere forma întreagă', () => {
  const loc = locuriFreze(rand({ formaScula: 'toroidala', razaColt: '1', origineScula: T1 }))[0]!;
  assert.deepEqual(loc.forma, { tip: 'toroidala', raza: 1 });
  assert.deepEqual(diferenteFreza(loc, din(T1, 6, { tip: 'toroidala', raza: 1 })), []);
  assert.deepEqual(diferenteFreza(loc, din(T1, 6, { tip: 'toroidala', raza: 1.5 })).map((d) => [d.camp, d.aici, d.acolo]), [['raza', 1, 1.5]]);
  const felul = diferenteFreza(loc, din(T1, 6, { tip: 'bila' })).map((d) => d.camp);
  assert.ok(felul.includes('forma'), `felul schimbat nu apare: ${felul.join(', ')}`);
  // Recunoașterea: o toroidală r1 scrisă de mână e recunoscută ca toroidala r1 din bibliotecă, nu ca bila sau ca r2.
  const mana = locuriFreze(rand({ formaScula: 'toroidala', razaColt: '1' }))[0]!;
  const bib = [din(B6, 6, { tip: 'bila' }), din({ ...T1, biblioteca: { id: 't2', rev: 1 } }, 6, { tip: 'toroidala', raza: 2 }), din(T1, 6, { tip: 'toroidala', raza: 1 })];
  assert.equal(stareOrigine(mana, bib)?.fel === 'recunoscuta' ? (stareOrigine(mana, bib) as { freza: FrezaOferita }).freza.id : null, 't6');
  const plata = locuriFreze(rand())[0]!;
  assert.equal(stareOrigine(plata, bib), null);
});

test('copia de readus ține bila și toroidala, iar freza bibliotecii din ea are felul și raza lor', () => {
  const c = copieDeReadus(rand({ formaScula: 'toroidala', razaColt: '1', origineScula: T1 }), 'scula');
  assert.deepEqual(c?.forma, { tip: 'toroidala', raza: 1 });
  const f = frezaDinCopie({ nume: 'T', numar: 2, diametru: 6, forma: { tip: 'toroidala', raza: 1 }, pas: 1.5, pasLateral: null });
  assert.deepEqual([f.fel, f.raza], ['toroidala', 1]);
  const b = frezaDinCopie({ nume: 'B', numar: 2, diametru: 6, forma: { tip: 'bila' }, pas: 1.5, pasLateral: null });
  assert.equal(b.fel, 'bila');
  assert.equal(frezaDinCopie({ nume: 'P', numar: 2, diametru: 6, pas: 1.5, pasLateral: null }).fel, 'plata');
});

test('marginile: raza colțului toroidalei în (0, Ø / 2)', () => {
  assert.deepEqual(campuriSculaGresite(rand({ formaScula: 'toroidala', razaColt: '1' })), []);
  assert.deepEqual(campuriSculaGresite(rand({ formaScula: 'toroidala', razaColt: '3' })), ['raza']);
  assert.deepEqual(campuriSculaGresite(rand({ formaScula: 'toroidala', razaColt: '0' })), ['raza']);
  assert.deepEqual(campuriSculaGresite(rand({ formaScula: 'toroidala', razaColt: '' })), ['raza']);
  assert.deepEqual(campuriSculaGresite(rand({ formaScula: 'bila', razaColt: '' })), []);
});

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const opLinie: Operatie = {
  id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 2, nume: 'freza plata', diametru: 6 }, latura: 'pe-linie', sens: 'urcare',
  adancime: 1, pas: 1.5, urechi: null, rampa: null, intrari: null, colturi: null,
} as Operatie;

test('ce scrie Exportă: forma rotundă, cu numele după formă; fără schimbare, aceeași freză; programul are forma în IR', () => {
  const bila = operatieDinDialog(opLinie, undefined, { numar: 2, diametru: 6, forma: { tip: 'bila' } });
  assert.deepEqual(bila.scula, { numar: 2, nume: 'freza bila', diametru: 6, forma: { tip: 'bila' } });
  const tor = operatieDinDialog(opLinie, undefined, { numar: 2, diametru: 6, forma: { tip: 'toroidala', raza: 1.5 } });
  assert.deepEqual(tor.scula, { numar: 2, nume: 'freza toroidala r1.5', diametru: 6, forma: { tip: 'toroidala', raza: 1.5 } });
  // Fără schimbare: aceeași freză (numele de acum, câmpurile necunoscute ale formei), la octet.
  const cu = { ...opLinie, scula: { numar: 2, nume: 'Toroidala mea', diametru: 6, forma: { tip: 'toroidala', raza: 1.5, x: 7 } } } as Operatie;
  assert.equal(JSON.stringify(operatieDinDialog(cu, undefined, { numar: 2, diametru: 6, forma: { tip: 'toroidala', raza: 1.5 } }).scula), JSON.stringify(cu.scula));
  // Altă rază: numele urmează forma, câmpul necunoscut al formei rămâne.
  assert.deepEqual(operatieDinDialog(cu, undefined, { numar: 2, diametru: 6, forma: { tip: 'toroidala', raza: 1 } }).scula,
    { numar: 2, nume: 'freza toroidala r1', diametru: 6, forma: { tip: 'toroidala', raza: 1, x: 7 } });
  // Înapoi la plată: forma pleacă.
  assert.deepEqual(operatieDinDialog(cu, undefined, { numar: 2, diametru: 6 }).scula, { numar: 2, nume: 'freza plata', diametru: 6 });
  // Programul canelurii scrise așa are forma în IR.
  const doc = {
    schema: 31, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: [{ tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }, matrice: { ...I, e: 20, f: 20 } }] }, operatii: [tor] }],
    foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 80, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
  const r = incarca(doc);
  if (!r.ok) assert.fail(r.motiv);
  const p = programDinDocument(r.doc, REGIM_IMPLICIT);
  if (!p.ok) assert.fail(p.motiv);
  assert.deepEqual(p.program.scula.forma, { tip: 'toroidala', raza: 1.5 });
});

const salvata = (f: Freza, id: string): FrezaSalvata => ({ ...f, id, rev: 1, schimbatLa: 1_000 });
const PLATA6: Freza = { nume: 'Plată Ø6', fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2, turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40 };
const BILA6 = salvata({ ...PLATA6, nume: 'Bilă Ø6', fel: 'bila', tais: undefined }, 'b6');
const TOR6 = salvata({ ...PLATA6, nume: 'Toroidală Ø6 r1', fel: 'toroidala', raza: 1, tais: undefined }, 't6');
const P6 = salvata(PLATA6, 'p6');

test('listele: rândul poartă formele rotunde; Tăierea le oferă doar pe canelură; toroidala are CAM', () => {
  assert.ok((FELURI_CU_CAM as readonly string[]).includes('toroidala'));
  assert.deepEqual(sculaDinFreza(TOR6).forma, { tip: 'toroidala', raza: 1 });
  for (const f of [undefined, { tip: 'v', unghi: 60 }, { tip: 'bila' }, { tip: 'toroidala', raza: 1 }] as const) assert.equal(formaPeRand(f), true);
  assert.equal(operatieCuRand({ ...opLinie, scula: { ...opLinie.scula, forma: { tip: 'bila' } } } as Operatie), true);
  // O formă rotundă pe o freză în plus n-are copie pe rând (frezele în plus sunt plate): operația rămâne fără rând.
  assert.equal(operatieCuRand({ ...opLinie, tip: 'buzunar', latura: 'interior', pasLateral: 2, rest: [{ scula: { numar: 3, nume: 'b', diametru: 3, forma: { tip: 'bila' } }, pasLateral: 1 }] } as Operatie), false);
  assert.deepEqual(frezePeRanduri([P6, BILA6, TOR6]).map((f) => f.id), ['p6', 'b6', 't6']);
  assert.deepEqual(frezePotrivite([P6, BILA6, TOR6], [{ tip: 'profil', latura: 'pe-linie' }]).map((f) => f.id), ['p6', 'b6', 't6']);
  assert.deepEqual(frezePotrivite([P6, BILA6, TOR6], [{ tip: 'profil', latura: 'exterior' }]).map((f) => f.id), ['p6']);
  assert.deepEqual(frezePotrivite([P6, BILA6, TOR6], [{ tip: 'profil', latura: 'pe-linie' }, { tip: 'buzunar', latura: 'interior' }]).map((f) => f.id), ['p6']);
});
