/**
 * Contractele atelierelor (ADR 0125, felia 4.6↑a): NcStudio, RichAuto, Syntec, Mach3 și Mach4, după sonda s8
 * (`docs/faza2/sonde/s8-posturi/RAPORT.md`, §5 și Anexa A). Pe hârtie: programul întreg al fiecăruia, cu o schimbare de sculă;
 * apoi, pe corpusul CAM, aceleași mișcări pe toate cele opt contracte, citite de un cititor scris doar după regulile din s8
 * (`ajutor-dialecte.ts`); codurile scrise sunt în contract și în documentația controlerului; punctul zecimal; refuzurile
 * RichAuto; deplasarea rapidă despărțită; numele fișierelor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../../src/ir/ir.ts';
import type { Montaj } from '../../src/ir/montaj.ts';
import { calculeazaTraseul } from '../../src/jobs/calculCam.ts';
import { despacheteaza } from '../../src/jobs/impachetare.ts';
import { ASTEPTARE_AX } from '../../src/jobs/rezumat.ts';
import type { Contract, StrategieScula } from '../../src/post/contract.ts';
import { CONTRACTE, ID_CONTRACTE, type IdContract } from '../../src/post/contracte/index.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { MACH3 } from '../../src/post/contracte/mach3.ts';
import { MACH4 } from '../../src/post/contracte/mach4.ts';
import { NCSTUDIO } from '../../src/post/contracte/ncstudio.ts';
import { RICHAUTO } from '../../src/post/contracte/richauto.ts';
import { SYNTEC } from '../../src/post/contracte/syntec.ts';
import { numeFisier } from '../../src/post/export.ts';
import { posteaza, posteazaPeScule } from '../../src/post/post.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';
import { citesteProgram, type DialectCitit, type Eveniment } from './ajutor-dialecte.ts';

const FOAIA = { latime: 300, inaltime: 200, grosime: 18 };
const MONTAJ: Montaj = { foaie: FOAIA, origine: 'stanga-jos', z0: 'sus' };
const T1: Scula = { numar: 1, nume: 'freza plata', diametru: 6 };
const T2: Scula = { numar: 2, nume: 'freza plata', diametru: 3 };
const OPT = { asteptareAx: 3 };
const program = (miscari: readonly Miscare[], scula: Scula = T1): Program => ({ axe: AXE_XYZ, scula, turatie: 18000, zSigur: 5, miscari });

/** Programul de pe hârtie: o linie, un semicerc G3, o schimbare de sculă, o linie cu noua sculă. */
const P = program([
  { tip: 'rapida', la: { X: 20, Y: 20 } },
  { tip: 'taiere', la: { Z: -3 }, avans: 300 },
  { tip: 'taiere', la: { X: 45 }, avans: 1000 },
  { tip: 'arc', la: { X: 45, Y: 45 }, centru: { x: 45, y: 32.5 }, sens: 'trigonometric', avans: 1000 },
  { tip: 'rapida', la: { Z: 5 } },
  { tip: 'schimba-scula', scula: T2, turatie: 20000 },
  { tip: 'rapida', la: { X: 100, Y: 50 } },
  { tip: 'taiere', la: { Z: -2 }, avans: 200 },
  { tip: 'taiere', la: { X: 120 }, avans: 800 },
  { tip: 'rapida', la: { Z: 5 } },
]);
// Pe hârtie: semicercul are centrul la 12,5 mm deasupra startului (I0 J12.5), în sens trigonometric (G3), cu avansul de
// pe linia dinainte (F nu se repetă); după schimbare, avansul se scrie din nou.
const LUCRU_T1 = ['G0 X20.000 Y20.000', 'G1 Z-3.000 F300.0', 'G1 X45.000 F1000.0', 'G3 X45.000 Y45.000 I0.000 J12.500', 'G0 Z5.000'];
const LUCRU_T2 = ['G0 X100.000 Y50.000', 'G1 Z-2.000 F200.0', 'G1 X120.000 F800.0', 'G0 Z5.000'];
const ORIGINE = 'origine stanga-jos, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm';

function linii(r: ReturnType<typeof posteaza>): string[] {
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  return r.ok ? r.text.slice(0, -1).split('\n') : [];
}

// ——— Pe hârtie: programul întreg al fiecărui contract nou ———

test('NcStudio, pe hârtie: comentariul cu apostrof, fără G94, G4 P în ms, setările N4063 / N4034 / N4035, M0 la schimbare', () => {
  const antet = ['G90 G17 G21', 'G40 G49 G80', 'G54', 'G0 Z5.000'];
  assert.deepEqual(linii(posteaza(P, MONTAJ, NCSTUDIO, { ...OPT, strategieScula: 'm0-comentariu' })), [
    "'CNC Vector Studio", "'post NcStudio",
    "'controler: N4063 = 1", "'controler: N4034 = 0", "'controler: N4035 = 0",
    `'${ORIGINE}`, "'scula T1 freza plata D6.000", "'scula: M0, cu scula in comentariu",
    ...antet, 'M3 S18000', 'G4 P3000',
    ...LUCRU_T1, 'M5',
    "'SCHIMBA SCULA: T2 freza plata D3.000, apoi zero Z", 'M0',
    ...antet, 'M3 S20000', 'G4 P3000',
    ...LUCRU_T2, 'M5', 'M30',
  ]);
});

test('NcStudio, implicit: fișiere separate pe sculă (n-are M06), fiecare program întreg', () => {
  assert.equal(NCSTUDIO.scula.implicita, 'fisiere-separate');
  const r = posteazaPeScule(P, MONTAJ, NCSTUDIO, OPT);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const cap = (s: string): string[] => [
    "'CNC Vector Studio", "'post NcStudio", "'controler: N4063 = 1", "'controler: N4034 = 0", "'controler: N4035 = 0", `'${ORIGINE}`, s,
    'G90 G17 G21', 'G40 G49 G80', 'G54', 'G0 Z5.000',
  ];
  assert.deepEqual(r.fisiere.map((f) => f.text.slice(0, -1).split('\n')), [
    [...cap("'scula T1 freza plata D6.000"), 'M3 S18000', 'G4 P3000', ...LUCRU_T1, 'M5', 'M30'],
    [...cap("'scula T2 freza plata D3.000"), 'M3 S20000', 'G4 P3000', ...LUCRU_T2, 'M5', 'M30'],
  ]);
});

test('RichAuto, pe hârtie: fără comentarii, fără unități, fără WCS și fără G4 (întârzierea e a controlerului), fișiere separate', () => {
  assert.deepEqual(RICHAUTO.scula.acceptate, ['fisiere-separate']);
  const r = posteazaPeScule(P, MONTAJ, RICHAUTO, OPT);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.deepEqual(r.fisiere.map((f) => f.text.slice(0, -1).split('\n')), [
    ['G90', 'G0 Z5.000', 'M3 S18000', ...LUCRU_T1, 'M5', 'M30'],
    ['G90', 'G0 Z5.000', 'M3 S20000', ...LUCRU_T2, 'M5', 'M30'],
  ]);
  // Întârzierea axului din controler acoperă așteptarea pe care alte posturi o scriu cu G4 (s8 A.5).
  assert.ok(RICHAUTO.setari.includes(`Spindle delay >= ${ASTEPTARE_AX * 1000} ms`), RICHAUTO.setari.join('; '));
});

test('Syntec, pe hârtie: % și O0001, G71, T1 M6 la pornire, G43 H după WCS (după G49 din antet), G4 P în ms, % la capăt', () => {
  const dupa = (n: number, s: number): string[] => ['G54', `G43 H${n}`, 'G0 Z5.000', `M3 S${s}`, 'G4 P3000'];
  assert.equal(SYNTEC.scula.implicita, 'm6-controler');
  assert.deepEqual(linii(posteaza(P, MONTAJ, SYNTEC, OPT)), [
    '%', 'O0001',
    '(CNC Vector Studio)', '(post Syntec)', `(${ORIGINE})`, '(scula T1 freza plata D6.000)', '(scula: M6 la controler)',
    'G90 G17 G71 G94', 'G40 G49 G80', 'T1 M6', ...dupa(1, 18000),
    ...LUCRU_T1, 'M5',
    '(scula T2 freza plata D3.000)', 'T2 M6', 'G90 G17 G71 G94', 'G40 G49 G80', ...dupa(2, 20000),
    ...LUCRU_T2, 'M5', 'M30', '%',
  ]);
  // Inch: G70, 5 zecimale.
  const inch = linii(posteaza(P, MONTAJ, SYNTEC, { ...OPT, unitati: 'inch' }));
  assert.ok(inch.includes('G90 G17 G70 G94') && inch.includes('G0 X0.78740 Y0.78740'), inch.join('\n'));
});

test('Mach3, pe hârtie: G91.1 pe linia lui, T pe linia dinaintea lui M6, G4 P în secunde, setările profilului', () => {
  const antet = ['G90 G17 G21 G94', 'G40 G49 G80', 'G91.1', 'G54', 'G0 Z5.000'];
  assert.equal(MACH3.scula.implicita, 'm6-controler');
  assert.deepEqual(linii(posteaza(P, MONTAJ, MACH3, OPT)), [
    '(CNC Vector Studio)', '(post Mach3)',
    '(controler: G04 Dwell param in Milliseconds = off)', '(controler: Tool Change = Stop Spindle. Wait for Cycle Start)',
    `(${ORIGINE})`, '(scula T1 freza plata D6.000)', '(scula: M6 la controler)',
    ...antet, 'M3 S18000', 'G4 P3.000',
    ...LUCRU_T1, 'M5',
    '(scula T2 freza plata D3.000)', 'T2', 'M6', ...antet, 'M3 S20000', 'G4 P3.000',
    ...LUCRU_T2, 'M5', 'M30',
  ]);
});

test('Mach4, pe hârtie: ca Mach3, fără setări (T pe linia dinainte merge cu ambele setări ale lui M6), G4 P2.0-stil, M30 apoi %', () => {
  const antet = ['G90 G17 G21 G94', 'G40 G49 G80', 'G91.1', 'G54', 'G0 Z5.000'];
  assert.deepEqual(linii(posteaza(P, MONTAJ, MACH4, OPT)), [
    '(CNC Vector Studio)', '(post Mach4)', `(${ORIGINE})`, '(scula T1 freza plata D6.000)', '(scula: M6 la controler)',
    ...antet, 'M3 S18000', 'G4 P3.000',
    ...LUCRU_T1, 'M5',
    '(scula T2 freza plata D3.000)', 'T2', 'M6', ...antet, 'M3 S20000', 'G4 P3.000',
    ...LUCRU_T2, 'M5', 'M30', '%',
  ]);
});

// ——— Contractele ca date ———

/**
 * Codurile documentate ale fiecărui controler, pe hârtie, din s8 Anexa A (citit) sau din dialectul de bază pe care
 * documentația îl numește (dedus: Syntec = Fanuc 0M cu G70 / G71, A.6; Mach = RS274NGC, A.7–A.8). `DE_PROBAT`: ce scrie
 * contractul deși documentația nu-l pomenește, propus de s8 pentru proba din atelier.
 */
const de = (prefix: string, a: number, b: number): string[] => Array.from({ length: b - a + 1 }, (_, k) => `${prefix}${a + k}`);
const DOCUMENTATE: Readonly<Record<IdContract, { readonly g: readonly string[]; readonly m: readonly string[] }>> = {
  'grbl-11': { g: [...de('G', 0, 4), 'G17', 'G20', 'G21', 'G40', 'G49', ...de('G', 54, 59), 'G80', 'G90', 'G94'], m: ['M0', 'M3', 'M5', 'M30'] },
  grblhal: { g: [...de('G', 0, 4), 'G17', 'G20', 'G21', 'G40', 'G49', ...de('G', 54, 59), 'G80', 'G90', 'G94'], m: ['M0', 'M3', 'M5', 'M6', 'M30'] },
  fluidnc: { g: [...de('G', 0, 4), 'G17', 'G20', 'G21', 'G40', 'G49', ...de('G', 54, 59), 'G80', 'G90', 'G94'], m: ['M0', 'M3', 'M5', 'M6', 'M30'] },
  // s8 A.4: G00–G04, G17–G19, G20 / G21, G40–G44, G49, G54–G59, G80–G89, G90; M00–M05, M30. Fără G94 și fără M06.
  ncstudio: { g: [...de('G', 0, 4), 'G17', 'G18', 'G19', 'G20', 'G21', ...de('G', 40, 44), 'G49', ...de('G', 54, 59), ...de('G', 80, 89), 'G90'], m: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M30'] },
  // s8 A.5, lista personalului Axiom (B11): G0–G4, G40–G44, G49, G54–G59, G80–G84, G90, G91; M3–M6, M8, M9.
  richauto: { g: [...de('G', 0, 4), ...de('G', 40, 44), 'G49', ...de('G', 54, 59), ...de('G', 80, 84), 'G90'], m: ['M3', 'M4', 'M5', 'M6', 'M8', 'M9'] },
  // s8 A.6: G00–G04, G17–G19, G43 / G44 / G49, G70 / G71, G73–G89; din Fanuc 0M: G40, G54–G59, G90, G94. M00–M06, M30.
  syntec: { g: [...de('G', 0, 4), 'G17', 'G18', 'G19', 'G40', 'G43', 'G44', 'G49', ...de('G', 54, 59), 'G70', 'G71', ...de('G', 73, 89), 'G90', 'G94'], m: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M30'] },
  mach3: { g: [...de('G', 0, 4), 'G17', 'G20', 'G21', 'G40', 'G43', 'G44', 'G49', ...de('G', 54, 59), 'G80', 'G90', 'G91.1', 'G94'], m: ['M0', 'M3', 'M5', 'M6', 'M30'] },
  mach4: { g: [...de('G', 0, 4), 'G17', 'G20', 'G21', 'G40', 'G43', 'G44', 'G49', ...de('G', 54, 59), 'G80', 'G90', 'G91.1', 'G94'], m: ['M0', 'M3', 'M5', 'M6', 'M30'] },
};
const DE_PROBAT: Partial<Record<IdContract, readonly string[]>> = {
  // s8 A.5: „sfârșit cu M30, de verificat”: lista Axiom n-are M30, iar manualul A11 nu-l pomenește.
  richauto: ['M30'],
};
const SENDER: readonly IdContract[] = ['grbl-11', 'grblhal', 'fluidnc'];

test('cele opt contracte: plafonul 70, 3 / 5 zecimale, strategiile, senderul doar pentru familia GRBL, codurile documentate, sursele', () => {
  assert.deepEqual(ID_CONTRACTE, ['grbl-11', 'grblhal', 'fluidnc', 'ncstudio', 'richauto', 'syntec', 'mach3', 'mach4']);
  for (const id of ID_CONTRACTE) {
    const k: Contract = CONTRACTE[id];
    assert.equal(k.liniaMaxima, 70, id);
    assert.deepEqual([k.zecimaleMm, k.zecimaleInch], [3, 5], id);
    assert.ok(k.scula.acceptate.includes(k.scula.implicita), id);
    assert.ok(k.scula.acceptate.includes('fisiere-separate'), `${id}: fișierele separate merg pe orice controler (s8 §5.4)`);
    // Bariera e a senderului aplicației: doar unde el vorbește controlerului.
    assert.equal(k.senderAplicatie, SENDER.includes(id), id);
    assert.equal(k.scula.acceptate.includes('bariera-sender'), k.senderAplicatie, id);
    if (k.scula.acceptate.includes('m0-comentariu')) assert.ok(k.comentariu !== null && k.coduriM.includes('M0'), id);
    assert.equal(k.coduriM.includes('M6'), k.scula.acceptate.includes('m6-controler'), `${id}: M6 doar cu M6 la controler`);
    if (k.antet.some((l) => l.includes('{unitati}'))) assert.ok(k.unitati.mm !== '', id);
    // Ce scrie contractul e în documentația controlerului (sau marcat de probat, cu sursa).
    const doc = DOCUMENTATE[id];
    for (const g of k.coduriG) assert.ok(doc.g.includes(g), `${id}: ${g} nu e documentat`);
    for (const m of k.coduriM) assert.ok(doc.m.includes(m) || (DE_PROBAT[id] ?? []).includes(m), `${id}: ${m} nu e documentat`);
    for (const camp of ['zecimale', 'unitati', 'elice', 'comentariu', 'liniaMaxima', 'pauza', 'arc', 'antet', 'wcs', 'scula', 'coduri', 'inceput', 'final', 'rapida', 'fisier', 'setari']) {
      assert.ok(k.surse[camp], `${id}: sursa câmpului ${camp}`);
    }
  }
  // Cele cinci noi sunt toate „documentate”: devin „probate” cu pachetul atelierelor (4.6↑b).
  for (const k of [NCSTUDIO, RICHAUTO, SYNTEC, MACH3, MACH4]) assert.ok(Object.values(k.surse).every((s) => s.stare === 'documentat'), k.nume);
  // Arcele (ADR 0125 §4): raza de 1 000 mm pe NcStudio și RichAuto (postul Autodesk pentru NcStudio), elicea în segmente
  // pe RichAuto (nicio sursă n-o pomenește), aceleași gărzi peste tot.
  assert.deepEqual([NCSTUDIO, RICHAUTO, SYNTEC, MACH3, MACH4].map((k) => [k.arc.razaMaxima, k.elice]), [[1000, true], [1000, false], [1e4, true], [1e4, true], [1e4, true]]);
  for (const k of [NCSTUDIO, RICHAUTO, SYNTEC, MACH3, MACH4]) assert.deepEqual(k.arc, { ...GRBL_11.arc, razaMaxima: k.arc.razaMaxima }, k.nume);
  assert.equal(RICHAUTO.unitati.inch, null);
  assert.equal(RICHAUTO.comentariu, null);
  assert.equal(RICHAUTO.pauza, null);
  assert.equal(RICHAUTO.wcs, null);
  assert.ok(RICHAUTO.numeScurt && !NCSTUDIO.numeScurt && !GRBL_11.numeScurt);
  assert.deepEqual([MACH3.extensie, MACH4.extensie, NCSTUDIO.extensie, RICHAUTO.extensie, SYNTEC.extensie], ['tap', 'tap', 'nc', 'nc', 'nc']);
});

// ——— Refuzurile RichAuto și deplasarea rapidă despărțită ———

test('RichAuto refuză cu motiv: inch (doar metric), ieșirea din foaie confirmată (n-are comentarii), o pauză din program', () => {
  const simplu = program([{ tip: 'rapida', la: { X: 20, Y: 20 } }, { tip: 'taiere', la: { Z: -3 }, avans: 300 }, { tip: 'rapida', la: { Z: 5 } }]);
  const inch = posteaza(simplu, MONTAJ, RICHAUTO, { ...OPT, unitati: 'inch' });
  assert.ok(!inch.ok && /doar în mm/.test(inch.motiv), JSON.stringify(inch));
  const iesire = posteaza(simplu, MONTAJ, RICHAUTO, { ...OPT, iesireConfirmata: { stanga: 2, dreapta: 0, jos: 0, sus: 0 } });
  assert.ok(!iesire.ok && /comentarii/.test(iesire.motiv), JSON.stringify(iesire));
  const pauza = posteaza(program([...simplu.miscari, { tip: 'pauza', secunde: 1 }]), MONTAJ, RICHAUTO, OPT);
  assert.ok(!pauza.ok && /pauz/.test(pauza.motiv), JSON.stringify(pauza));
  // Același program, pe un contract cu comentarii: ieșirea se scrie în antet.
  assert.ok(linii(posteaza(simplu, MONTAJ, NCSTUDIO, { ...OPT, iesireConfirmata: { stanga: 2, dreapta: 0, jos: 0, sus: 0 } })).includes("'CONFIRMAT: freza iese din foaie"));
});

test('deplasarea rapidă cu XY și Z: pe Syntec (G00 poate merge în „L”, s8 A.6) întâi urcarea, apoi XY; la coborâre, întâi XY', () => {
  const p = program([
    { tip: 'rapida', la: { X: 10, Y: 10 } },
    { tip: 'taiere', la: { Z: -1 }, avans: 300 },
    { tip: 'rapida', la: { X: 50, Y: 50, Z: 5 } },
    { tip: 'rapida', la: { X: 80, Y: 20, Z: 1 } },
    { tip: 'taiere', la: { Z: -1 }, avans: 300 },
    { tip: 'rapida', la: { Z: 5 } },
  ]);
  const lucru = (k: Contract): string[] => { const l = linii(posteaza(p, MONTAJ, k, OPT)); return l.slice(l.indexOf('G0 X10.000 Y10.000')); };
  assert.deepEqual(lucru(SYNTEC).slice(0, 7), ['G0 X10.000 Y10.000', 'G1 Z-1.000 F300.0', 'G0 Z5.000', 'G0 X50.000 Y50.000', 'G0 X80.000 Y20.000', 'G0 Z1.000', 'G1 Z-1.000']);
  for (const k of [NCSTUDIO, RICHAUTO, MACH3, MACH4]) assert.ok(k.rapidaSeparata, k.nume);
  // Familia GRBL: G0 e o linie dreaptă, deci programul ei nu se schimbă cu niciun octet.
  assert.deepEqual(lucru(GRBL_11).slice(0, 4), ['G0 X10.000 Y10.000', 'G1 Z-1.000 F300.0', 'G0 X50.000 Y50.000 Z5.000', 'G0 X80.000 Y20.000 Z1.000']);
});

test('numele fișierelor: ca până acum, iar pe RichAuto (stick FAT, s8 Anexa B) scurte, ASCII, cu majuscule', () => {
  assert.equal(numeFisier(GRBL_11, 'stanga-jos', 0, null), 'cncvs2-stanga-jos.nc');
  assert.equal(numeFisier(GRBL_11, 'dreapta-sus', 2, T2), 'cncvs2-dreapta-sus-3-T2.nc');
  assert.equal(numeFisier(MACH3, 'stanga-jos', 0, null), 'cncvs2-stanga-jos.tap');
  assert.equal(numeFisier(RICHAUTO, 'stanga-jos', 0, null), 'CNCVS2.NC');
  assert.equal(numeFisier(RICHAUTO, 'stanga-jos', 1, { ...T2, numar: 12 }), 'CV2T12.NC');
  assert.ok(/^[A-Z0-9]{1,8}\.NC$/.test(numeFisier(RICHAUTO, 'dreapta-sus', 98, { ...T2, numar: 255 })));
});

// ——— Pe corpusul CAM: aceleași mișcări pe toate contractele ———

const DIALECT: Readonly<Record<IdContract, DialectCitit>> = Object.fromEntries(ID_CONTRACTE.map((id) => {
  const k = CONTRACTE[id];
  const comentariu = k.comentariu === null ? 'niciunul' : k.comentariu.deschidere === "'" ? 'apostrof' : 'paranteze';
  return [id, { comentariu, pauza: k.pauza?.unitate ?? 's' } satisfies DialectCitit];
})) as Record<IdContract, DialectCitit>;

/** Ce se compară: fără compensarea lungimii (Syntec), fără scula aleasă înaintea primei tăieri, fără pauze unde lipsesc. */
function canonic(ev: readonly Eveniment[], faraPauza: boolean): Eveniment[] {
  const out: Eveniment[] = [];
  let taiat = false;
  for (const e of ev) {
    if (e.tip === 'lungime' || (e.tip === 'pauza' && faraPauza) || (e.tip === 'scula' && !taiat)) continue;
    if (e.tip === 'miscare' && e.g !== 0) taiat = true;
    out.push(e);
  }
  return out;
}

const TOLERANTA = 0.003;

/**
 * Aceeași cale: eveniment cu eveniment, cu o excepție geometrică. Un arc al referinței poate fi, pe alt contract, un șir de
 * G1 (raza peste gardă, elicea nedeclarată): fiecare capăt al șirului stă pe arc (raza, Z-ul între capete), iar ultimul e
 * exact capătul arcului.
 */
function aceeasiCale(ref: readonly Eveniment[], alt: readonly Eveniment[], eticheta: string): void {
  let b = 0;
  let poz = { x: 0, y: 0, z: 0 };
  for (const [a, ea] of ref.entries()) {
    const eb = alt[b];
    const capat = ea.tip === 'miscare' ? { x: ea.x ?? poz.x, y: ea.y ?? poz.y, z: ea.z ?? poz.z } : poz;
    if (ea.tip === 'miscare' && (ea.g === 2 || ea.g === 3) && eb?.tip === 'miscare' && eb.g === 1) {
      const c = { x: poz.x + (ea.i ?? 0), y: poz.y + (ea.j ?? 0) };
      const r = Math.hypot(poz.x - c.x, poz.y - c.y);
      const [z0, z1] = [Math.min(poz.z, capat.z), Math.max(poz.z, capat.z)];
      for (;;) {
        const s = alt[b];
        assert.ok(s?.tip === 'miscare' && s.g === 1, `${eticheta}: la arcul ${a}, după ${b} vine ${JSON.stringify(s)}`);
        if (s?.tip !== 'miscare') return;
        const p = { x: s.x ?? 0, y: s.y ?? 0, z: s.z ?? 0 };
        assert.ok(Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - r) <= TOLERANTA, `${eticheta}: segmentul ${b} iese de pe arcul ${a}`);
        assert.ok(p.z >= z0 - TOLERANTA && p.z <= z1 + TOLERANTA, `${eticheta}: Z-ul segmentului ${b}`);
        assert.equal(s.f, ea.f, `${eticheta}: avansul segmentului ${b}`);
        b++;
        if (p.x === capat.x && p.y === capat.y && p.z === capat.z) break;
      }
    } else {
      assert.deepEqual(eb, ea, `${eticheta}: evenimentul ${a} (al ${b}-lea pe contract)`);
      b++;
    }
    poz = capat;
  }
  assert.equal(b, alt.length, `${eticheta}: evenimente în plus`);
}

/** Strategiile care dau același șir de evenimente: M6 (bariera sau la controler), M0; fișierele separate, fișier cu fișier. */
const GRUPE: readonly (readonly StrategieScula[])[] = [['bariera-sender', 'm6-controler'], ['m0-comentariu'], ['fisiere-separate']];

test('corpusul CAM: pe fiecare contract, aceleași mișcări, pauze, turații și scule ca pe GRBL 1.1, în mm și în inch', () => {
  let comparatii = 0;
  for (const caz of CORPUS_CAM) {
    const t = calculeazaTraseul(caz.doc);
    if (!t.ok) continue;
    const prog = despacheteaza(t.program);
    const p0 = caz.parametri[0];
    const foaie = caz.doc.foi[0]?.stoc;
    assert.ok(p0 && foaie, caz.id);
    if (!p0 || !foaie) continue;
    const montaj: Montaj = { foaie, origine: p0.origine, z0: p0.z0 };
    const schimbari = prog.miscari.some((m) => m.tip === 'schimba-scula');
    for (const unitati of ['mm', 'inch'] as const) {
      for (const grupa of schimbari ? GRUPE : [['fisiere-separate'] as const]) {
        const texte = (k: Contract, strategie: StrategieScula): string[] | null => {
          const opt = { asteptareAx: ASTEPTARE_AX, unitati, strategieScula: strategie };
          if (schimbari && strategie === 'fisiere-separate') {
            const r = posteazaPeScule(prog, montaj, k, opt);
            assert.ok(r.ok, `${caz.id} ${k.nume}: ${r.ok ? '' : r.motiv}`);
            return r.ok ? r.fisiere.map((f) => f.text) : null;
          }
          const r = posteaza(prog, montaj, k, schimbari ? opt : { asteptareAx: ASTEPTARE_AX, unitati });
          assert.ok(r.ok, `${caz.id} ${k.nume}: ${r.ok ? '' : r.motiv}`);
          return r.ok ? [r.text] : null;
        };
        const strategieRef = grupa[0] ?? 'fisiere-separate';
        const ref = texte(GRBL_11, schimbari ? (strategieRef === 'm6-controler' ? 'bariera-sender' : strategieRef) : 'bariera-sender');
        if (!ref) continue;
        for (const id of ID_CONTRACTE) {
          const k = CONTRACTE[id];
          if (unitati === 'inch' && k.unitati.inch === null) continue;
          const strategie = schimbari ? grupa.find((s) => k.scula.acceptate.includes(s)) : k.scula.implicita;
          if (strategie === undefined) continue;
          const alt = texte(k, strategie);
          if (!alt) continue;
          assert.equal(alt.length, ref.length, `${caz.id} ${id} ${unitati} ${strategie}: fișierele`);
          for (const [f, text] of alt.entries()) {
            const eticheta = `${caz.id} ${id} ${unitati} ${strategie} #${f}`;
            const faraPauza = k.pauza === null;
            aceeasiCale(
              canonic(citesteProgram(ref[f] ?? '', DIALECT['grbl-11']).evenimente, faraPauza),
              canonic(citesteProgram(text, DIALECT[id]).evenimente, faraPauza),
              eticheta,
            );
            comparatii++;
          }
        }
      }
    }
  }
  assert.ok(comparatii > 100, `prea puține comparații: ${comparatii}`);
});

// ——— Codurile, punctul zecimal, pauza, pe fiecare contract ———

test('fiecare cuvânt scris e în contract; X / Y / Z / I / J / F au mereu punctul zecimal (pe Syntec, X10 = 0,010 mm); P, S, T, H întregi unde trebuie', () => {
  const elice = program([
    { tip: 'rapida', la: { X: 100, Y: 50 } },
    { tip: 'taiere', la: { Z: -2 }, avans: 200 },
    { tip: 'arc', la: { X: 100, Y: 50, Z: -4 }, centru: { x: 110, y: 50 }, sens: 'orar', avans: 800 },
    { tip: 'rapida', la: { Z: 5 } },
  ]);
  for (const id of ID_CONTRACTE) {
    const k = CONTRACTE[id];
    for (const unitati of k.unitati.inch === null ? (['mm'] as const) : (['mm', 'inch'] as const)) {
      // Cu bariera senderului, `T… M6` e scris, dar nu pleacă niciodată la controler (ADR 0080 regula 6, ADR 0083).
      const texte: { readonly text: string; readonly bariera: boolean }[] = [];
      for (const strategie of k.scula.acceptate) {
        if (strategie === 'fisiere-separate') {
          const r = posteazaPeScule(P, MONTAJ, k, { ...OPT, unitati });
          assert.ok(r.ok, r.ok ? '' : r.motiv);
          if (r.ok) texte.push(...r.fisiere.map((f) => ({ text: f.text, bariera: false })));
        } else {
          texte.push({ text: linii(posteaza(P, MONTAJ, k, { ...OPT, unitati, strategieScula: strategie })).join('\n') + '\n', bariera: strategie === 'bariera-sender' });
        }
      }
      texte.push({ text: linii(posteaza(elice, MONTAJ, k, { ...OPT, unitati })).join('\n') + '\n', bariera: false });
      for (const { text, bariera } of texte) {
        const c = citesteProgram(text, DIALECT[id]);
        const coduriM = bariera ? [...k.coduriM, 'M6'] : k.coduriM;
        for (const cod of c.coduri) assert.ok((cod.startsWith('G') ? k.coduriG : coduriM).includes(cod), `${id} ${unitati}: ${cod} nu e în contract`);
        for (const litera of ['X', 'Y', 'Z', 'I', 'J', 'F']) {
          for (const v of c.valori.get(litera) ?? []) assert.ok(v.includes('.'), `${id} ${unitati}: ${litera}${v} fără punct`);
        }
        for (const litera of ['S', 'T', 'H']) {
          for (const v of c.valori.get(litera) ?? []) assert.ok(/^\d+$/.test(v), `${id}: ${litera}${v} nu e întreg`);
        }
        for (const v of c.valori.get('P') ?? []) {
          assert.ok(k.pauza?.unitate === 'ms' ? /^\d+$/.test(v) : /^\d+\.\d+$/.test(v), `${id}: P${v} în unitatea ${k.pauza?.unitate}`);
        }
        // Pauza după pornirea axului e aceeași pe toate contractele care o scriu: 3 s, în unitatea fiecăruia.
        for (const e of c.evenimente) if (e.tip === 'pauza') assert.equal(e.secunde, 3, id);
        // Elicea: unde contractul n-o declară, nicio linie de arc cu Z.
        if (!k.elice) assert.ok(!text.split('\n').some((l) => /^G[23] .*Z/.test(l)), `${id}: elice scrisă`);
      }
    }
  }
});
