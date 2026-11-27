/**
 * Profilul desenat în proiect (ADR 0304 §5, felia 16.A↑f-3), partea pură a ferestrei exportului și a alegerii din bibliotecă:
 *
 * - **forma pe rând** (`formaDinRand`, `campuriForma`): profilul cu punctele lui, dus-întors; fără puncte nu e o formă;
 * - **regula** (`profilPermis`, `motivProfilRand`): pe linie și, din 16.A↑f-4, pe o parte (cu fund plat, până la înălțimea
 *   profilului, fără urechi, degajări, intrări și despărțire), ca `motivFormaPeOperatie` din model; rândul „pe hârtie” spune
 *   retragerea muchiei;
 * - **identitatea frezei** pentru numărul T (`numarPentruRand`): două siluete sunt două freze, aceeași siluetă una;
 * - **alegerea din bibliotecă** (`cuFrezaAleasa`) pune profilul pe rând; **nota** (`diferenteFreza`) vede silueta schimbată;
 * - **copia de readus** (`copieDeReadus`): un profil nu se pune înapoi (copia n-are felul parametric);
 * - **ce scrie Exportă** (`operatieDinDialog`): profilul, cu numele după formă; fără schimbare, aceeași freză, la octet; programul
 *   are silueta în IR;
 * - **listele**: rândul poartă profilul; Tăierea îl oferă pe canelură, nu pe o parte.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  campuriForma, copieDeReadus, cuFrezaAleasa, diferenteFreza, formaDinRand, fundProfilRand, inaltimeProfilRand, locuriFreze,
  motivProfilRand, numarPentruRand, profilPermis, type FrezaOferita, type FormaRand, type OrigineFreza, type Rand,
} from '../../src/ui/exportRand.ts';
import { fundProfil, inaltimeProfil } from '../../src/model/profilMargine.ts';
import { hartieRand } from '../../src/app/hartieExport.ts';
import { formaPeRand, motivFormaPeOperatie, operatieCuRand } from '../../src/model/formaFrezei.ts';
import { frezePeRanduri, frezePotrivite } from '../../src/model/alegereFreza.ts';
import { sculaDinFreza, type Freza, type FrezaSalvata } from '../../src/model/freza.ts';
import { puncteProfil } from '../../src/model/profilFreza.ts';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import type { Latura, Operatie, TipOperatie } from '../../src/model/document.ts';

const PLATA6: Freza = { nume: 'Plată Ø6', fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2, turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40 };
const salvata = (f: Freza, id: string): FrezaSalvata => ({ ...f, id, rev: 1, schimbatLa: 1_000 });
const ROT3 = salvata({ ...PLATA6, nume: 'Rotunjire R3', fel: 'rotunjire', diametru: 12, raza: 3, tais: undefined }, 'r3');
const ROT4 = salvata({ ...PLATA6, nume: 'Rotunjire R4', fel: 'rotunjire', diametru: 12, raza: 4, tais: undefined }, 'r4');
const P6 = salvata(PLATA6, 'p6');
const PR3 = puncteProfil(ROT3)!, PR4 = puncteProfil(ROT4)!;
const F3: FormaRand = { tip: 'profil', puncte: PR3 }, F4: FormaRand = { tip: 'profil', puncte: PR4 };
const O3: OrigineFreza = { nume: 'Rotunjire R3', biblioteca: { id: 'r3', rev: 1 }, regim: { turatie: 18000, avans: 1000, plonjare: 300 } };

/** Un rând de canelură (profil pe linie), cu freza plată Ø12 scrisă de mână, peste care se pun valorile date. */
function rand(p: Partial<Rand> = {}): Rand {
  return {
    numarScula: '2', diametruScula: '12', origineScula: null, regimMana: { turatie: '', avans: '', plonjare: '' }, formaScula: 'plata', unghiV: '60', varfV: '0', razaColt: '1', directie: '', latura: 'pe-linie',
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

test('forma pe rând: profilul cu punctele lui, dus-întors; fără puncte nu e o formă', () => {
  assert.deepEqual(campuriForma(F3), { formaScula: 'profil', profil: PR3 });
  assert.deepEqual(formaDinRand({ ...rand(), ...campuriForma(F3) }), F3);
  assert.equal(formaDinRand(rand({ formaScula: 'profil' })), undefined);
});

test('regula ferestrei: profilul pe linie și pe o parte (până la înălțimea lui, cu fund plat, fără opțiuni), ca regula modelului', () => {
  const locuri: ReadonlyArray<readonly [Rand['tip'] & TipOperatie, Latura]> = [
    ['profil', 'pe-linie'], ['profil', 'exterior'], ['profil', 'interior'], ['profil', 'stanga'], ['profil', 'dreapta'],
    ['buzunar', 'interior'], ['gaurire', 'interior'], ['vcarve', 'interior'],
  ];
  // Rotunjirea R3 pe Ø12: fundul plat 3, înălțimea 3; la 2 mm merge pe o parte, la 3,5 nu.
  for (const d of [2, 3, 3.5]) {
    for (const [tip, latura] of locuri) {
      const model = motivFormaPeOperatie(tip, latura, { tip: 'profil', puncte: PR3 }, { adancime: d }, 12) === null;
      assert.equal(profilPermis(rand({ tip, latura, formaScula: 'profil', profil: PR3, adancime: String(d) })), model, `${tip} ${latura} la ${d}`);
    }
  }
  assert.equal(profilPermis(rand({ tip: 'buzunar', latura: 'interior' })), true);
  // Motivele: fundul plat lipsă, adâncimea peste înălțime, opțiunile pe o parte; pe linie, nimic.
  const ext = (p: Partial<Rand>): Rand => rand({ latura: 'exterior', formaScula: 'profil', profil: PR3, adancime: '2', ...p });
  assert.equal(motivProfilRand(ext({})), null);
  assert.equal(motivProfilRand(ext({ profil: [[0, 0], [6, 2]] })), 'fund');
  assert.equal(motivProfilRand(ext({ adancime: '3,5' })), 'adancime');
  assert.equal(motivProfilRand(ext({ adancime: 'x' })), null);
  for (const o of [{ urechi: true }, { colturi: 'dog-bone' as const }, { intrari: true }, { despartire: true }]) assert.equal(motivProfilRand(ext(o)), 'optiuni', JSON.stringify(o));
  assert.equal(motivProfilRand(rand({ formaScula: 'profil', profil: PR3, adancime: '20', urechi: true })), null);
  assert.equal(motivProfilRand(rand({ tip: 'buzunar', latura: 'interior', formaScula: 'profil', profil: PR3 })), 'profil');
  assert.equal(fundProfilRand(PR3), fundProfil(PR3));
  assert.equal(inaltimeProfilRand(PR3), inaltimeProfil(PR3));
});

test('rândul „pe hârtie”: pe o parte, retragerea muchiei de sus; pe linie și peste înălțime, nimic', () => {
  const intrare = {
    tip: 'profil' as const, adancime: 2, incrustatie: 'fara' as const, pas: 1, grosime: 18, supracursa: 0, prinFoaie: false, diametruScula: 12,
    retragere: null, diametre: [], forma: F3,
  };
  const m = hartieRand({ ...intrare, peOParte: true }).margine;
  // R3 pe Ø12: h(r) = √(9 − (6 − r)²) după fundul plat 3, deci la 2 mm r = 6 − √5; retragerea r − 3, sub 0,001 de arc.
  assert.ok(m !== null && m !== undefined && Math.abs(m.retragere - (3 - Math.sqrt(5))) < 2e-3, JSON.stringify(m));
  assert.equal(hartieRand({ ...intrare, peOParte: false }).margine ?? null, null);
  assert.equal(hartieRand({ ...intrare, peOParte: true, adancime: 3.5 }).margine ?? null, null);
});

test('identitatea frezei: două siluete sunt două freze pentru T, aceeași siluetă una', () => {
  const a = { numar: 2, diametru: 12, forma: F3 }, b = { numar: 2, diametru: 12, forma: F4 };
  assert.equal(numarPentruRand([a], b), 1);
  assert.equal(numarPentruRand([a], { ...a }), 2);
  assert.equal(numarPentruRand([{ numar: 2, diametru: 12 }], a), 1);
});

test('alegerea din bibliotecă pune profilul pe rând; nota vede silueta schimbată și felul schimbat', () => {
  const ales = cuFrezaAleasa(rand(), 'scula', din(O3, 12, F3, 4), 4);
  assert.equal(ales.formaScula, 'profil');
  assert.deepEqual(ales.profil, PR3);
  assert.equal(ales.diametruScula, '12');
  const loc = locuriFreze(rand({ formaScula: 'profil', profil: PR3, origineScula: O3 }))[0]!;
  assert.deepEqual(loc.forma, F3);
  assert.deepEqual(diferenteFreza(loc, din(O3, 12, F3)), []);
  assert.deepEqual(diferenteFreza(loc, din(O3, 12, F4)).map((d) => [d.camp, d.aici, d.acolo]), [['silueta', 3, 4]]);
  assert.deepEqual(diferenteFreza(loc, din(O3, 12, { tip: 'bila' })).map((d) => d.camp), ['forma']);
});

test('un profil nu se pune înapoi în bibliotecă din copia de pe rând (copia n-are felul parametric)', () => {
  assert.equal(copieDeReadus(rand({ formaScula: 'profil', profil: PR3, origineScula: O3 }), 'scula'), null);
});

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const opLinie: Operatie = {
  id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 2, nume: 'freza plata', diametru: 12 }, latura: 'pe-linie', sens: 'urcare',
  adancime: 2, pas: 1, urechi: null, rampa: null, intrari: null, colturi: null,
} as Operatie;

test('ce scrie Exportă: profilul, cu numele după formă; fără schimbare, aceeași freză; programul are silueta în IR', () => {
  const scris = operatieDinDialog(opLinie, undefined, { numar: 2, diametru: 12, forma: F3 });
  assert.deepEqual(scris.scula, { numar: 2, nume: 'freza profilata', diametru: 12, forma: { tip: 'profil', puncte: PR3 } });
  // Fără schimbare: aceeași freză (numele de acum, câmpurile necunoscute ale formei), la octet.
  const cu = { ...opLinie, scula: { numar: 2, nume: 'Rotunjire R3', diametru: 12, forma: { tip: 'profil', puncte: PR3.map(([r, h]) => [r, h]), x: 7 } } } as Operatie;
  assert.equal(JSON.stringify(operatieDinDialog(cu, undefined, { numar: 2, diametru: 12, forma: F3 }).scula), JSON.stringify(cu.scula));
  // Altă siluetă: numele urmează forma, câmpul necunoscut rămâne.
  assert.deepEqual(operatieDinDialog(cu, undefined, { numar: 2, diametru: 12, forma: F4 }).scula,
    { numar: 2, nume: 'freza profilata', diametru: 12, forma: { tip: 'profil', puncte: PR4, x: 7 } });
  // Înapoi la plată: forma pleacă.
  assert.deepEqual(operatieDinDialog(cu, undefined, { numar: 2, diametru: 12 }).scula, { numar: 2, nume: 'freza plata', diametru: 12 });
  const doc = {
    schema: 32, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: [{ tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }, matrice: { ...I, e: 20, f: 20 } }] }, operatii: [scris] }],
    foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 80, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
  const r = incarca(doc);
  if (!r.ok) assert.fail(r.motiv);
  const p = programDinDocument(r.doc, REGIM_IMPLICIT);
  if (!p.ok) assert.fail(p.motiv);
  assert.deepEqual(p.program.scula.forma, { tip: 'profil', puncte: PR3 });
});

test('listele: rândul poartă profilul; Tăierea îl oferă pe canelură și pe o parte până la înălțimea lui; pe o freză în plus, fără rând', () => {
  assert.equal(formaPeRand({ tip: 'profil', puncte: PR3 }), true);
  assert.deepEqual(sculaDinFreza(ROT3).forma, { tip: 'profil', puncte: PR3 });
  assert.equal(operatieCuRand({ ...opLinie, scula: { ...opLinie.scula, forma: { tip: 'profil', puncte: PR3 } } } as Operatie), true);
  assert.equal(operatieCuRand({ ...opLinie, tip: 'buzunar', latura: 'interior', pasLateral: 2, rest: [{ scula: { numar: 3, nume: 'r', diametru: 6, forma: { tip: 'profil', puncte: [[0, 0], [3, 1]] } }, pasLateral: 1 }] } as Operatie), false);
  assert.deepEqual(frezePeRanduri([P6, ROT3]).map((f) => f.id), ['p6', 'r3']);
  assert.deepEqual(frezePotrivite([P6, ROT3], [{ tip: 'profil', latura: 'pe-linie' }]).map((f) => f.id), ['p6', 'r3']);
  // Pe o parte (16.A↑f-4): până la înălțimea profilului (3 mm la R3), nu peste.
  assert.deepEqual(frezePotrivite([P6, ROT3], [{ tip: 'profil', latura: 'exterior', adancime: 20 }]).map((f) => f.id), ['p6']);
  assert.deepEqual(frezePotrivite([P6, ROT3], [{ tip: 'profil', latura: 'exterior', adancime: 2 }]).map((f) => f.id), ['p6', 'r3']);
  assert.deepEqual(frezePotrivite([P6, ROT3], [{ tip: 'buzunar', latura: 'interior' }]).map((f) => f.id), ['p6']);
});
