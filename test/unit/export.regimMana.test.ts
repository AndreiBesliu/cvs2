/**
 * Turația, avansul și plonjarea pe o freză „scrisă de mână” (ADR 0291 §3, 3a; felia 28.8↑p), pe hârtie:
 *
 * - **câmpurile rândului** (`campuriRegimGresite`, `regimDinRand`): gol = valoarea implicită a lucrării (18 000 rot/min,
 *   1 000 și 300 mm/min); toate goale = fără valori, deci programul de azi; turația un întreg în [1, 100 000], avansul și
 *   plonjarea în (0, 100 000], ca ușa documentului (v27); virgula zecimală, ca în restul ferestrei;
 * - **scrierea** (`operatieDinDialog`): pe o freză fără origine din bibliotecă, valorile intră în `scula.regim` (fără schemă
 *   nouă: documentul le are de la v27), la locul lor dacă documentul le avea (un Exportă fără schimbare scrie aceeași freză, la
 *   octet); șterse toate, câmpul pleacă; o freză din bibliotecă își păstrează valorile ei, nu pe cele de mână;
 * - **programul**: turația, avansul și plonjarea scrise taie (`M3 S…`, `F…`), iar o freză fără ele, ca azi;
 * - **Z-ul sigur și parcarea** (`campuriAerGresite`, `parametriAer`): implicit, nimic trimis (cererea de dinainte); Z-ul sigur
 *   între 1 și 100 mm; parcarea la XY0 e (0, 0), într-un punct cu semn, cel mult 10 000 mm pe fiecare axă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import type { Document, Operatie } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { AVANS_IMPLICIT, PLONJARE_IMPLICITA, TURATIE_IMPLICITA } from '../../src/cam/regimExport.ts';
import {
  AER_IMPLICIT, campuriAerGresite, campuriRegimGresite, frezeRanduri, locuriFreze, parametriAer, regimDinRand, REGIM_GOL, stareOrigine,
  type FrezaOferita, type Rand, type RegimRand, type SculaOperatie,
} from '../../src/ui/exportRand.ts';
import { docDin, ID } from './ajutor-document.ts';

const OP: Operatie = {
  id: 'e1', tip: 'profil', noduri: ['e1'], latura: 'exterior', sens: 'urcare', adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null,
  scula: { numar: 1, nume: 'freza plata', diametru: 6 },
} as Operatie;
const R = (turatie: string, avans: string, plonjare: string): RegimRand => ({ turatie, avans, plonjare });

test('câmpurile: gol = valoarea implicită, toate goale = fără valori; marginile ușii documentului; virgula zecimală', () => {
  assert.deepEqual([TURATIE_IMPLICITA, AVANS_IMPLICIT, PLONJARE_IMPLICITA], [18_000, 1_000, 300]);
  assert.deepEqual(REGIM_GOL, R('', '', ''));
  assert.equal(regimDinRand(REGIM_GOL), null);
  assert.equal(regimDinRand(R('  ', '', ' ')), null);
  assert.deepEqual(regimDinRand(R('16000', '', '')), { turatie: 16_000, avans: 1_000, plonjare: 300 });
  assert.deepEqual(regimDinRand(R('', '800,5', '250')), { turatie: 18_000, avans: 800.5, plonjare: 250 });
  assert.deepEqual(regimDinRand(R('100000', '100000', '0,1')), { turatie: 100_000, avans: 100_000, plonjare: 0.1 });
  assert.deepEqual(campuriRegimGresite(R('16000', '800', '250')), []);
  assert.deepEqual(campuriRegimGresite(REGIM_GOL), []);
  // Turația: un întreg, de la 1 la 100 000.
  for (const t of ['0', '-5', '100001', '1500,5', 'repede']) assert.deepEqual(campuriRegimGresite(R(t, '', '')), ['turatie'], t);
  // Avansul și plonjarea: peste 0, cel mult 100 000.
  for (const a of ['0', '-1', '100000,1', 'x']) {
    assert.deepEqual(campuriRegimGresite(R('', a, '')), ['avans'], a);
    assert.deepEqual(campuriRegimGresite(R('', '', a)), ['plonjare'], a);
  }
  assert.deepEqual(campuriRegimGresite(R('0', '0', '0')), ['turatie', 'avans', 'plonjare']);
  assert.equal(regimDinRand(R('0', '', '')), undefined, 'un câmp greșit nu dă valori');
});

const cu = (o: Operatie, s: SculaOperatie): Operatie['scula'] => operatieDinDialog(o, undefined, s).scula;

test('scrierea: pe o freză scrisă de mână, valorile în `regim`, la locul lor; șterse, pleacă; pe una din bibliotecă, ale ei', () => {
  const regim = { turatie: 16_000, avans: 800, plonjare: 250 };
  // Fără valori: aceeași freză, la octet.
  assert.equal(JSON.stringify(cu(OP, { numar: 1, diametru: 6, origine: null, regim: null })), JSON.stringify(OP.scula));
  // Cu valori: în `regim`, fără origine.
  const scrisa = cu(OP, { numar: 1, diametru: 6, origine: null, regim });
  assert.deepEqual(scrisa, { numar: 1, nume: 'freza plata', diametru: 6, regim });
  // Un Exportă fără schimbare, peste o freză care le are deja: aceeași freză, cu cheile în aceeași ordine.
  const cuRegim = { ...OP, scula: { numar: 1, nume: 'freza plata', regim, diametru: 6, ceva: 'necunoscut' } } as unknown as Operatie;
  assert.equal(JSON.stringify(cu(cuRegim, { numar: 1, diametru: 6, origine: null, regim })), JSON.stringify(cuRegim.scula));
  // Schimbate: la locul lor; șterse toate: câmpul pleacă, restul rămâne.
  assert.equal(JSON.stringify(cu(cuRegim, { numar: 1, diametru: 6, origine: null, regim: { ...regim, avans: 900 } })),
    JSON.stringify({ numar: 1, nume: 'freza plata', regim: { turatie: 16_000, avans: 900, plonjare: 250 }, diametru: 6, ceva: 'necunoscut' }));
  assert.equal(JSON.stringify(cu(cuRegim, { numar: 1, diametru: 6, origine: null, regim: null })),
    JSON.stringify({ numar: 1, nume: 'freza plata', diametru: 6, ceva: 'necunoscut' }));
  // Un apelant fără câmpul `regim`: rămân cele din document.
  assert.deepEqual(cu(cuRegim, { numar: 1, diametru: 6, origine: null }), cuRegim.scula);
  // O freză din bibliotecă, trecută pe „Scrisă de mână” cu valori noi: originea și valorile ei pleacă, rămân cele scrise.
  const dinBiblioteca = { ...OP, scula: { numar: 6, nume: 'Plată Ø12', diametru: 12, biblioteca: { id: 'p12', rev: 3 }, regim: { turatie: 20_000, avans: 2000, plonjare: 600 }, tais: 30 } } as Operatie;
  assert.deepEqual(cu(dinBiblioteca, { numar: 6, diametru: 12, origine: null, regim }), { numar: 6, nume: 'freza plata', diametru: 12, regim });
  // Cu originea din bibliotecă pe rând, valorile ei câștigă: cele de mână nu se aplică.
  const origine = { nume: 'Plată Ø12', biblioteca: { id: 'p12', rev: 3 }, regim: { turatie: 20_000, avans: 2000, plonjare: 600 } };
  assert.deepEqual(cu(OP, { numar: 6, diametru: 12, origine, regim })['regim'], origine.regim);
});

/** Un dreptunghi tăiat pe exterior, cu operația dată, trecut prin ușa documentului. */
function document(o: Operatie): Document {
  const d = docDin({ latime: 300, inaltime: 200, grosime: 18 }, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } });
  const p = d.piese[0]!;
  const brut = { ...d, piese: [{ ...p, operatii: [{ ...o, id: 'a', noduri: [p.radacina.tip === 'grup' ? p.radacina.copii[0]!.id : p.radacina.id] }] }] };
  const r = incarca(JSON.parse(JSON.stringify(brut)));
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

test('programul: valorile scrise de mână taie, iar o freză fără ele, ca azi', async () => {
  const azi = await calculeazaExport(document(OP), { origine: 'stanga-jos', z0: 'sus' });
  const scris = operatieDinDialog(OP, undefined, { numar: 1, diametru: 6, origine: null, regim: { turatie: 16_000, avans: 800, plonjare: 250 } });
  const cu = await calculeazaExport(document(scris), { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(azi.ok && cu.ok);
  if (!azi.ok || !cu.ok) return;
  const a = azi.fisiere[0]!.text, b = cu.fisiere[0]!.text;
  assert.match(a, /^M3 S18000$/m);
  assert.match(a, / F1000\.0$/m);
  assert.match(a, / F300\.0$/m);
  assert.match(b, /^M3 S16000$/m);
  assert.doesNotMatch(b, /S18000|F1000\.0|F300\.0/);
  assert.match(b, / F800\.0$/m);
  assert.match(b, /^G1 Z-?\d+\.\d+ F250\.0$/m);
  // Fără valori, aceeași operație dă programul de azi, la octet.
  const fara = operatieDinDialog(OP, undefined, { numar: 1, diametru: 6, origine: null, regim: null });
  const r = await calculeazaExport(document(fara), { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(r.ok && r.fisiere[0]!.text === a);
});

test('Z-ul sigur și parcarea în fereastră: implicit, nimic trimis; marginile; la XY0, (0, 0); un punct cu semn și virgulă', () => {
  assert.deepEqual(AER_IMPLICIT, { zSigur: '5', parcare: 'nu', x: '0', y: '0' });
  assert.deepEqual(parametriAer(AER_IMPLICIT), {});
  assert.deepEqual(parametriAer({ ...AER_IMPLICIT, zSigur: '5,0' }), {});
  assert.deepEqual(parametriAer({ ...AER_IMPLICIT, zSigur: '20' }), { zSigur: 20 });
  assert.deepEqual(parametriAer({ ...AER_IMPLICIT, zSigur: '12,5', parcare: 'origine' }), { zSigur: 12.5, parcare: { x: 0, y: 0 } });
  assert.deepEqual(parametriAer({ ...AER_IMPLICIT, parcare: 'punct', x: '-20,5', y: '250' }), { parcare: { x: -20.5, y: 250 } });
  // Un punct ales, dar câmpurile scrise rămân doar pentru el.
  assert.deepEqual(parametriAer({ ...AER_IMPLICIT, parcare: 'nu', x: 'ceva', y: '' }), {});
  for (const z of ['0,99', '0', '-5', '100,01', '', 'sus']) {
    assert.deepEqual(campuriAerGresite({ ...AER_IMPLICIT, zSigur: z }), ['z-sigur'], z);
    assert.equal(parametriAer({ ...AER_IMPLICIT, zSigur: z }), null, z);
  }
  for (const z of ['1', '100', '3,25']) assert.deepEqual(campuriAerGresite({ ...AER_IMPLICIT, zSigur: z }), [], z);
  assert.deepEqual(campuriAerGresite({ ...AER_IMPLICIT, parcare: 'punct', x: '10000,001', y: '-10000' }), ['parcare-x']);
  assert.deepEqual(campuriAerGresite({ ...AER_IMPLICIT, parcare: 'punct', x: '', y: 'x' }), ['parcare-x', 'parcare-y']);
  assert.deepEqual(campuriAerGresite({ ...AER_IMPLICIT, parcare: 'punct', x: '−10', y: '+5' }), []);
});

/** Un rând de profil cu freza T1 Ø6 (doar câmpurile pe care le citește `frezeRanduri`). */
const rand = (p: Partial<Rand>): Rand => ({
  numarScula: '1', diametruScula: '6', origineScula: null, regimMana: REGIM_GOL, formaScula: 'plata', unghiV: '60', varfV: '0', razaColt: '1', tip: 'profil',
  fundPlat: false, incrustatieDreapta: false, frezaDop: false, incrustatie: false, jurDop: 'fata', decupareBanda: false, frezaBanda: false,
  rest: [], restFund: [], restDop: [], ...p,
}) as unknown as Rand;

test('T-ul: turația scrisă de mână e știută, ca a unei freze din bibliotecă; cu o origine, a ei; fără, necunoscută', () => {
  assert.deepEqual(frezeRanduri([['a', rand({})]]), [{ numar: 1, diametru: 6 }]);
  assert.deepEqual(frezeRanduri([['a', rand({ regimMana: R('16000', '', '') })]]), [{ numar: 1, diametru: 6, turatie: 16_000 }]);
  // Doar avansul scris: turația e cea a lucrării, scrisă și ea.
  assert.deepEqual(frezeRanduri([['a', rand({ regimMana: R('', '800', '') })]]), [{ numar: 1, diametru: 6, turatie: 18_000 }]);
  // Un câmp greșit: nicio valoare scrisă, deci turația nu e știută.
  assert.deepEqual(frezeRanduri([['a', rand({ regimMana: R('0', '', '') })]]), [{ numar: 1, diametru: 6 }]);
  const origine = { nume: 'Plată Ø6', biblioteca: { id: 'p6', rev: 1 }, regim: { turatie: 20_000, avans: 1000, plonjare: 300 } };
  assert.deepEqual(frezeRanduri([['a', rand({ origineScula: origine, regimMana: R('16000', '', '') })]]), [{ numar: 1, diametru: 6, turatie: 20_000 }]);
});

/** O freză plată Ø6 din bibliotecă, cu valorile date (sau fără). */
const P6 = (regim?: { turatie: number; avans: number; plonjare: number }): FrezaOferita => ({
  id: 'p6', nume: 'Plată Ø6', pas: 3, pasLateral: 2.4,
  scula: { numar: 2, diametru: 6, origine: { nume: 'Plată Ø6', biblioteca: { id: 'p6', rev: 1 }, ...(regim ? { regim } : {}) } },
});
const recunoscuta = (p: Rand, b: FrezaOferita): string | undefined => {
  const st = stareOrigine(locuriFreze(p)[0]!, [b]);
  return st?.fel === 'recunoscuta' ? st.freza.nume : undefined;
};

test('recunoașterea „Scrisă de mână (ca „…”)”: cu valori scrise de mână, doar o freză cu aceleași valori; fără ele, ca azi', () => {
  const b = P6({ turatie: 18_000, avans: 1000, plonjare: 300 });
  // Fără valori scrise: Ø și forma, ca azi.
  assert.equal(recunoscuta(rand({}), b), 'Plată Ø6');
  assert.equal(recunoscuta(rand({}), P6({ turatie: 20_000, avans: 2000, plonjare: 600 })), 'Plată Ø6');
  // Cu valori scrise altfel decât ale frezei din bibliotecă: nu mai e „ca” ea.
  assert.equal(recunoscuta(rand({ regimMana: R('16000', '', '') }), b), undefined);
  assert.equal(recunoscuta(rand({ regimMana: R('', '800', '') }), b), undefined);
  // Cu aceleași valori (scrise, sau golurile luate din lucrare): e.
  assert.equal(recunoscuta(rand({ regimMana: R('18000', '1000', '300') }), b), 'Plată Ø6');
  assert.equal(recunoscuta(rand({ regimMana: R('18000', '', '') }), b), 'Plată Ø6');
  // O freză din bibliotecă fără valorile ei taie cu cele ale lucrării: aceleași, recunoscută; altele, nu.
  assert.equal(recunoscuta(rand({ regimMana: R('', '', '300') }), P6()), 'Plată Ø6');
  assert.equal(recunoscuta(rand({ regimMana: R('', '', '250') }), P6()), undefined);
  // Un câmp greșit: fără valori de comparat, deci ca fără ele.
  assert.equal(recunoscuta(rand({ regimMana: R('0', '', '') }), b), 'Plată Ø6');
});
