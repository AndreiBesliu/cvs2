/**
 * Oracolul sensului de tăiere (ADR 0027, amendat pe 09.10) și invarianta 9 din poartă, judecate:
 * - pe fizică: partea în care stă materialul păstrat la urcare se derivă din grosimea așchiei (axul M3), iar tabelul
 *   ADR-ului iese din derivare, nu e copiat;
 * - pe hârtie: aria cu semn (pătrate, cercuri din semicercuri, dreptunghiul rotunjit al plăcii 1, cercul dintr-un bloc,
 *   montajul oglindit), buclele (treceri coborâte sau cu ridicare, legături la adâncime, drumuri deschise, închiderea
 *   în toleranța rotunjirii, eticheta nouă la adâncime, rampa, dus-întors), placa 1 (fișierele vechi, regenerarea
 *   întoarsă din 18cf16d, cea cerută de §7) pe ambele colțuri ale ei, placa pe toate 4 colțurile și ambele Z0,
 *   dreptunghiuri rotunjite, instanțe rotite, oglindiri, `pe-linie`, legarea etichetei de operație, etichetele;
 * - pe a doua metodă: aria exactă față de aria eșantionată, pe bucle aleatoare cu arce, pe toate colțurile;
 * - amendamentul ADR 0028 §5 (felia 2.4): pe fiecare program judecat aici, verdictele invariantei 9 sunt exact cele ale
 *   primei redactări (ultimul test);
 * - lipirea cu aplicația (testele „lipire:”): orice program al aplicației trece invariantele 9 și 2 pe corpusul 2.3a
 *   (cu sensuri la întâmplare); schimbarea sensului unei operații întoarce semnul buclelor ei și numai al lor, din
 *   același punct de pornire; `pe-linie` nu schimbă nimic; fișierele de aur ale plăcii 1.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { citeste, esantioane, type Punct3 } from '../oracles/gcode.ts';
import { laDocument, poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import { type DocV4O, type Liber, type SensO } from '../oracles/document.ts';
import { citesteEticheta, regiuneDinDocument, verificaEticheta, type Regiune } from '../oracles/regiune.ts';
import {
  aschia, buclele, bucleleInainteDe0028, parteaPastrataPrinAschie, semnAsteptat, sensulPeretelui, sensurileEtichetelor,
  verificaSensul, type Bucla, type EtichetaActiva,
} from '../oracles/sens.ts';
import {
  aleator, cerc, corpus, documentRegiune, drept, oglinda, PLACA_1, programDinTrasee, simple, STOC, tr, type CazCorpus, type Montaj,
} from '../oracles/regiune.cazuri.ts';
import {
  ariaEsantionata, cuEtichete, docPlaca1, PLACA_1_INTOARSA, PLACA_1_NOUA, PLACA_1_VECHE, STOC_PLACA, traseeCerute,
} from '../oracles/sens.cazuri.ts';
import { programulAplicatiei, schemaAplicatiei } from './ajutor-lipire.ts';

const aproape = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol;
const egal = (a: number, b: number, mesaj = '', tol = 1e-9): void => assert.ok(aproape(a, b, tol), `${mesaj}: ${a} ≠ ${b}`);

const MONTAJE: readonly Montaj[] = (['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const)
  .flatMap((origine) => (['sus', 'jos'] as const).map((z0) => ({ foaie: STOC, origine, z0 })));
const SENSURI: readonly SensO[] = ['urcare', 'opozitie'];

function ctxDe(reg: Regiune, D: number, m: Montaj = MONTAJE[0]!): ContextPoarta {
  return { foaie: m.foaie, origine: m.origine, z0: m.z0, diametruScula: D, pas: 1000, supracursa: 0, asteptareAx: 3, regiune: reg };
}
/**
 * Fiecare program judecat de poartă în acest fișier, cu contextul lui: la sfârșit, verdictele invariantei 9 amendate
 * (ADR 0028 §5) se compară cu ale primei redactări, pe toate (proba că programele fără urechi nu-și schimbă verdictul).
 */
const vazute: Array<{ readonly text: string; readonly ctx: ContextPoarta }> = [];
const poartaV = (text: string, ctx: ContextPoarta): Incalcare[] => {
  vazute.push({ text, ctx });
  return poarta(text, ctx);
};
const inv = (n: number) => (text: string, ctx: ContextPoarta): Incalcare[] => poartaV(text, ctx).filter((i) => i.invarianta === n);
const inv9 = inv(9);
const inv2 = inv(2);
const mesaje = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n');

/** Programele scrise de mână: antetul scriitorului, liniile date, ridicarea și oprirea. */
const CAP = ['(CNC Vector Studio)', 'G90 G17 G21 G94', 'G54', 'G0 Z5.000', 'M3 S18000', 'G4 P3.000'];
const prg = (...linii: string[]): string => `${[...CAP, ...linii, 'G0 Z5.000', 'M5', 'M30'].join('\n')}\n`;

/** Buclele unui text, cu montajul dat (implicit, mașina = documentul), etichetele fiind comentariile-etichetă. */
function bucleText(text: string, laDoc: (p: Punct3) => Punct3 = (p) => p): Bucla[] {
  const { evenimente, comentarii } = citeste(text);
  return buclele(evenimente, comentarii.filter((c) => citesteEticheta(c.text) !== null).map((c) => c.linia), laDoc);
}

/** Etichetele programului, ca în poartă: valide (ale unei tăieturi din document, singure pe linie) sau null. */
function eticheteleProgramului(text: string, reg: Regiune): EtichetaActiva[] {
  return citeste(text).comentarii.flatMap((c) => {
    const et = citesteEticheta(c.text);
    if (et === null) return [];
    return [{ linia: c.linia, eticheta: et !== 'stricata' && c.singur && !verificaEticheta(reg, et) ? et : null }];
  });
}

/** Un pătrat de latură `l` din (x, y), trigonometric sau orar, ca linii G1. */
function patrat(x: number, y: number, l: number, trig: boolean): string[] {
  const v = trig ? [[x + l, y], [x + l, y + l], [x, y + l], [x, y]] : [[x, y + l], [x + l, y + l], [x + l, y], [x, y]];
  return v.map(([a, b], k) => `G1 X${a!.toFixed(3)} Y${b!.toFixed(3)}${k === 0 ? ' F1000.0' : ''}`);
}

// ── Fizica: tabelul din așchie ─────────────────────────────────────────────────────────────────────────────────────

test('fizica (M3): pe peretele din stânga dintele intră pe perete cu așchia ~0 și iese gros (opoziție); pe cel din dreapta, invers (urcare)', () => {
  // Pe hârtie (R 3, fz 0.05, ae 0.5): pe peretele păstrat, dintele e la vârful semilunii (cercul de acum taie cercul
  // dintelui precedent în x = −fz / 2, y = ±√(9 − 0.025²) = ±2.999896, încă în fâșie): așchia 0. La marginea fâșiei
  // (sin φ0 = 2.5 / 3, cos φ0 = 0.552771): h = 3 − (−0.05·0.552771 + √(9 − 0.0025·0.694444)) = 0.027928.
  const st = aschia('stanga'), dr = aschia('dreapta');
  egal(st.intrare, 0, 'stânga, intrarea', 1e-5);
  egal(st.iesire, 0.027928, 'stânga, ieșirea', 5e-4);
  egal(dr.intrare, 0.027928, 'dreapta, intrarea', 5e-4);
  egal(dr.iesire, 0, 'dreapta, ieșirea', 1e-5);
  assert.equal(sensulPeretelui('stanga'), 'opozitie');
  assert.equal(sensulPeretelui('dreapta'), 'urcare');
  assert.equal(parteaPastrataPrinAschie('urcare'), 'dreapta', 'G41 + M3 = urcare: piesa la dreapta');
  assert.equal(parteaPastrataPrinAschie('opozitie'), 'stanga');
  // Axul invers (M4, ADR 0027 „Limitele”) întoarce totul.
  assert.equal(parteaPastrataPrinAschie('urcare', 'M4'), 'stanga');
  assert.equal(parteaPastrataPrinAschie('opozitie', 'M4'), 'dreapta');
});

test('tabelul ADR 0027 §1 (amendat) iese din fizică: exterior urcare −, exterior opoziție +, interior urcare +, interior opoziție −', () => {
  assert.deepEqual(
    (['exterior', 'interior'] as const).flatMap((l) => SENSURI.map((s) => [l, s, semnAsteptat(l, s)])),
    [['exterior', 'urcare', -1], ['exterior', 'opozitie', 1], ['interior', 'urcare', 1], ['interior', 'opozitie', -1]],
  );
});

// ── Aria cu semn, pe hârtie ─────────────────────────────────────────────────────────────────────────────────────────

test('aria pe hârtie: pătratul ±100, cercul R12 din două semicercuri ∓452.389, dreptunghiul rotunjit al plăcii ±6988.274, cercul dintr-un bloc, D-ul', () => {
  const una = (text: string): Bucla => {
    const b = bucleText(text);
    assert.equal(b.length, 1, JSON.stringify(b.map((x) => [x.linii, x.inchisa])));
    assert.ok(b[0]!.inchisa);
    return b[0]!;
  };
  egal(una(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0', ...patrat(0, 0, 10, true))).arie, 100, 'pătrat trigonometric');
  egal(una(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0', ...patrat(0, 0, 10, false))).arie, -100, 'pătrat orar');
  // π · 12² = 452.3893421169302.
  const cercul = (g: string): string => prg('G0 X82.000 Y50.000', 'G1 Z-4.000 F300.0', `${g} X58.000 Y50.000 I-12.000 J0.000 F1000.0`, `${g} X82.000 Y50.000 I12.000 J0.000`);
  egal(una(cercul('G2')).arie, -452.3893421169302, 'cercul G2', 1e-9);
  egal(una(cercul('G3')).arie, 452.3893421169302, 'cercul G3', 1e-9);
  // 106 × 66 − (4 − π) · 3² = 6996 − 7.725666117691862.
  const insula = (text: string): Bucla => bucleText(cuEtichete(text)).find((b) => b.z === -3)!;
  egal(insula(PLACA_1_VECHE.A).arie, 6988.274333882308, 'insula trigonometrică', 1e-9);
  egal(insula(PLACA_1_NOUA.A).arie, -6988.274333882308, 'insula orară', 1e-9);
  // Un bloc care închide cercul: GRBL îl execută ca cerc întreg (unghiul −2π): −π · 5².
  egal(una(prg('G0 X10.000 Y0.000', 'G1 Z-1.000 F300.0', 'G2 X10.000 Y0.000 I-5.000 J0.000 F1000.0')).arie, -78.53981633974483, 'cercul dintr-un bloc', 1e-9);
  // D: diametrul pe y = 0 și semicercul de sus: π · 25 / 2.
  egal(una(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0', 'G1 X10.000 Y0.000 F1000.0', 'G3 X0.000 Y0.000 I-5.000 J0.000')).arie, 39.269908169872416, 'D', 1e-9);
  // Montajul oglindit (x → −x), ipotetic: aria își schimbă semnul și pe arce (unghiul se întoarce cu el).
  const oglindit = bucleText(cercul('G2'), (p) => [-p[0], p[1], p[2]]);
  egal(oglindit[0]!.arie, 452.3893421169302, 'cercul G2 văzut în oglindă', 1e-9);
});

// ── Buclele ─────────────────────────────────────────────────────────────────────────────────────────────────────────

test('buclele: trecerile coborâte pe verticală și cele cu ridicare sunt bucle separate, fiecare cu adâncimea ei', () => {
  const sq = patrat(0, 0, 10, false);
  const jos = bucleText(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0', ...sq, 'G1 Z-2.000 F300.0', ...sq));
  assert.deepEqual(jos.map((b) => [b.z, b.inchisa, Math.round(b.arie)]), [[-1, true, -100], [-2, true, -100]]);
  const sus = bucleText(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0', ...sq, 'G0 Z5.000', 'G0 X0.000 Y0.000', 'G1 Z-2.000 F300.0', ...sq));
  assert.deepEqual(sus.map((b) => [b.z, b.inchisa, Math.round(b.arie)]), [[-1, true, -100], [-2, true, -100]]);
  // Un G1 fără deplasare la adâncime nu întrerupe bucla.
  const pe = bucleText(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0', sq[0]!, 'G1 Z-1.000', ...sq.slice(1)));
  assert.deepEqual(pe.map((b) => [b.inchisa, Math.round(b.arie)]), [[true, -100]]);
});

test('buclele: două bucle legate la adâncime dau bucla, legătura (deschisă) și bucla; închiderea în 0.002', () => {
  const legate = bucleText(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0', ...patrat(0, 0, 10, false), 'G1 X20.000 Y0.000', ...patrat(20, 0, 10, false)));
  assert.deepEqual(legate.map((b) => [b.inchisa, Math.round(b.arie), b.start.x]), [[true, -100, 0], [false, 0, 0], [true, -100, 20]]);
  // Capătul în (0.0015, 0), la 0.0015 de start: închisă, cu coarda până la start (aria 100 − ½·10·0.0015); la 0.003:
  // deschisă.
  const aproapeInchis = (d: string): Bucla[] => bucleText(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0',
    'G1 X10.000 Y0.000 F1000.0', 'G1 X10.000 Y10.000', 'G1 X0.000 Y10.000', `G1 X${d} Y0.000`));
  assert.deepEqual(aproapeInchis('0.0015').map((b) => b.inchisa), [true]);
  egal(aproapeInchis('0.0015')[0]!.arie, 100 - 0.0075, 'aria cu coarda', 1e-9);
  assert.deepEqual(aproapeInchis('0.003').map((b) => b.inchisa), [false]);
});

test('buclele: rampa întrerupe drumul, iar bucla de după ea se închide la capătul rampei; dus-întorsul are aria 0', () => {
  const rampa = bucleText(prg('G0 X0.000 Y0.000', 'G1 Z0.500 F300.0', 'G1 X10.000 Y0.000 Z-1.000 F1000.0',
    'G1 X10.000 Y10.000', 'G1 X0.000 Y10.000', 'G1 X0.000 Y0.000', 'G1 X10.000 Y0.000'));
  assert.deepEqual(rampa.map((b) => [b.inchisa, Math.round(b.arie), b.start.x, b.start.y]), [[true, 100, 10, 0]]);
  const dus = bucleText(prg('G0 X0.000 Y0.000', 'G1 Z-1.000 F300.0', 'G1 X10.000 Y0.000 F1000.0', 'G1 X0.000 Y0.000'));
  assert.deepEqual(dus.map((b) => [b.inchisa, b.arie]), [[true, 0]]);
});

// ── Poarta (invarianta 9) pe programe scrise de mână ────────────────────────────────────────────────────────────────

/** O piesă pătrată 10 × 10 la (100, 100), exterior, și o gaură R5 în alt loc, cu sensurile date. */
const docPatrat = (rama: SensO, gaura: SensO = 'urcare', adancime = 1): DocV4O => simple(STOC, [
  { id: 'p', forma: drept(10, 10), x: 100, y: 100, laturi: ['exterior'], sensuri: [rama], adancime },
  { id: 'g', forma: cerc(5), x: 200, y: 100, laturi: ['interior'], sensuri: [gaura], adancime },
], { diametru: 6 });
/** Traseul exterior al pătratului (latura 16 din (97, 97)), cu o etichetă. */
const progPatrat = (trig: boolean, eticheta = '(p/p: dreptunghi, exterior, 1 mm)', ...dupa: string[]): string =>
  prg(eticheta, 'G0 X97.000 Y97.000', 'G1 Z-1.000 F300.0', ...patrat(97, 97, 16, trig), ...dupa);

test('poarta: exteriorul în urcare se taie orar, în opoziție trigonometric; mesajul spune bucla, aria și ce trebuia', () => {
  const urc = regiuneDinDocument(docPatrat('urcare')), opz = regiuneDinDocument(docPatrat('opozitie'));
  assert.deepEqual(inv9(progPatrat(false), ctxDe(urc, 6)), []);
  assert.deepEqual(inv9(progPatrat(true), ctxDe(opz, 6)), []);
  const v = inv9(progPatrat(true), ctxDe(urc, 6));
  assert.equal(v.length, 1, mesaje(v));
  assert.match(v[0]!.mesaj, /bucla lui p\/p \(exterior, urcare\) la liniile 10–13, Z -1\.000 are aria 256\.000 mm² \(trigonometric\); trebuie orar/);
  assert.equal(inv9(progPatrat(false), ctxDe(opz, 6)).length, 1);
});

test('poarta: drumul deschis sub exterior / interior e încălcare; sub pe-linie nu; o buclă degenerată (aria 0) nu se judecă', () => {
  const reg = regiuneDinDocument(docPatrat('urcare'));
  const deschis = prg('(p/p: dreptunghi, exterior, 1 mm)', 'G0 X97.000 Y97.000', 'G1 Z-1.000 F300.0', ...patrat(97, 97, 16, false).slice(0, 3));
  assert.match(mesaje(inv9(deschis, ctxDe(reg, 6))), /drumul lui p\/p \(exterior\) la liniile 10–12, Z -1\.000 nu se închide/);
  // Legătura la adâncime dintre două bucle corecte: legătura e prinsă, buclele nu.
  const legate = progPatrat(false, undefined, 'G1 X120.000 Y97.000', ...patrat(120, 97, 4, false));
  assert.deepEqual(inv9(legate, ctxDe(reg, 6)).map((i) => /nu se închide/.test(i.mesaj)), [true]);
  // Dus-întors: aria 0, nu se judecă.
  const dus = prg('(p/p: dreptunghi, exterior, 1 mm)', 'G0 X97.000 Y97.000', 'G1 Z-1.000 F300.0', 'G1 X113.000 Y97.000 F1000.0', 'G1 X97.000 Y97.000');
  assert.deepEqual(inv9(dus, ctxDe(reg, 6)), []);
  // Mai multe bucle sub aceeași etichetă (insulele unui offset): fiecare judecată.
  const doua = progPatrat(false, undefined, 'G0 Z5.000', 'G0 X120.000 Y97.000', 'G1 Z-1.000 F300.0', ...patrat(120, 97, 4, true));
  assert.deepEqual(inv9(doua, ctxDe(reg, 6)).map((i) => i.linia), [17]);
});

test('poarta: o etichetă nouă la adâncime (fără ridicare) taie drumul: două drumuri deschise, nu o buclă a primei etichete', () => {
  // Pătratul p (exterior, urcare: orar) parcurs orar, dar cu eticheta găurii g la jumătatea lui, fără ridicare.
  const doc = docPatrat('urcare');
  const reg = regiuneDinDocument(doc);
  const sq = patrat(97, 97, 16, false);
  const taiat = prg('(p/p: dreptunghi, exterior, 1 mm)', 'G0 X97.000 Y97.000', 'G1 Z-1.000 F300.0', sq[0]!, sq[1]!, '(g/g: cerc, interior, 1 mm)', sq[2]!, sq[3]!);
  assert.deepEqual(inv9(taiat, ctxDe(reg, 6)).map((i) => [i.linia, /nu se închide/.test(i.mesaj)]), [[10, true], [13, true]]);
  assert.deepEqual(bucleText(taiat).map((b) => [b.inchisa, b.eticheta]), [[false, 0], [false, 1]]);
});

test('poarta: `pe-linie` nu se judecă în niciun sens; aceleași mișcări sub eticheta exterior a aceluiași element, da', () => {
  const doc = simple(STOC, [{ id: 'q', forma: drept(10, 10), x: 100, y: 100, laturi: ['exterior', 'pe-linie'], sensuri: ['urcare', 'opozitie'], adancime: 1 }], { diametru: 6 });
  const reg = regiuneDinDocument(doc);
  for (const trig of [true, false]) {
    const linie = prg('(q/q: dreptunghi, pe-linie, 1 mm)', 'G0 X100.000 Y100.000', 'G1 Z-1.000 F300.0', ...patrat(100, 100, 10, trig));
    assert.deepEqual(inv9(linie, ctxDe(reg, 6)), [], `pe-linie ${trig ? 'trigonometric' : 'orar'}`);
    const ext = linie.replace('(q/q: dreptunghi, pe-linie, 1 mm)', '(q/q: dreptunghi, exterior, 1 mm)');
    assert.equal(inv9(ext, ctxDe(reg, 6)).length, trig ? 1 : 0, `exterior ${trig ? 'trigonometric' : 'orar'}`);
  }
});

test('poarta: sensul vine din operația etichetei (adâncimea); la aceeași adâncime cu sensuri diferite, a k-a apariție e a k-a operație', () => {
  // Două operații exterior pe același pătrat: 1 mm în urcare, 2 mm în opoziție.
  const doc = docPatrat('urcare');
  const p = doc.piese[0]!;
  p.operatii.push({ ...p.operatii[0]!, id: 'fin', adancime: 2, sens: 'opozitie' });
  const reg = regiuneDinDocument(doc);
  const doua = (t1: boolean, t2: boolean, a2 = 2): string => prg(
    '(p/p: dreptunghi, exterior, 1 mm)', 'G0 X97.000 Y97.000', 'G1 Z-1.000 F300.0', ...patrat(97, 97, 16, t1), 'G0 Z5.000',
    `(p/p: dreptunghi, exterior, ${a2} mm)`, 'G0 X97.000 Y97.000', `G1 Z-${a2}.000 F300.0`, ...patrat(97, 97, 16, t2),
  );
  assert.deepEqual(inv9(doua(false, true), ctxDe(reg, 6)), []);
  assert.equal(inv9(doua(true, false), ctxDe(reg, 6)).length, 2);
  // Doar eticheta de 2 mm, singură în program: e a operației de 2 mm (opoziție), nu „prima apariție” a elementului.
  const doar2 = prg('(p/p: dreptunghi, exterior, 2 mm)', 'G0 X97.000 Y97.000', 'G1 Z-2.000 F300.0', ...patrat(97, 97, 16, true));
  assert.deepEqual(inv9(doar2, ctxDe(reg, 6)), []);
  assert.equal(inv9(doar2.replace(patrat(97, 97, 16, true).join('\n'), patrat(97, 97, 16, false).join('\n')), ctxDe(reg, 6)).length, 1);
  // Aceeași adâncime (1 mm), sensuri diferite: prima apariție a etichetei e a primei operații (urcare), a doua a celei
  // de-a doua (opoziție); o a treia apariție nu mai are operație.
  p.operatii[1]!.adancime = 1;
  const reg1 = regiuneDinDocument(doc);
  assert.deepEqual(inv9(doua(false, true, 1), ctxDe(reg1, 6)), []);
  assert.equal(inv9(doua(true, false, 1), ctxDe(reg1, 6)).length, 2);
  const trei = doua(false, true, 1).replace('M5', '(p/p: dreptunghi, exterior, 1 mm)\nG0 X97.000 Y97.000\nG1 Z-1.000 F300.0\n' + patrat(97, 97, 16, false).join('\n') + '\nG0 Z5.000\nM5');
  assert.match(mesaje(inv9(trei, ctxDe(reg1, 6))), /are 2 operații exterior de 1 mm cu sensuri diferite, iar eticheta apare de 3 ori/);
  // Același sens pe amândouă: oricâte apariții.
  p.operatii[1]!.sens = 'urcare';
  assert.deepEqual(inv9(trei.replace(patrat(97, 97, 16, true).join('\n'), patrat(97, 97, 16, false).join('\n')), ctxDe(regiuneDinDocument(doc), 6)), []);
});

test('poarta: bucla dinaintea primei etichete, sub o etichetă stricată, nesingură sau străină e încălcare a invariantei 9', () => {
  const reg = regiuneDinDocument(docPatrat('urcare'));
  const fara = prg('G0 X97.000 Y97.000', 'G1 Z-1.000 F300.0', ...patrat(97, 97, 16, false));
  assert.match(mesaje(inv9(fara, ctxDe(reg, 6))), /înaintea primei etichete/);
  assert.match(mesaje(inv9(progPatrat(false, '(p/p: dreptunghi, exterior, 1mm)'), ctxDe(reg, 6))), /etichetă nevalidă/);
  assert.match(mesaje(inv9(progPatrat(false, '(p/p: dreptunghi, exterior, 1 mm) G0 Z5.000'), ctxDe(reg, 6))), /etichetă nevalidă/);
  assert.match(mesaje(inv9(progPatrat(false, '(p/p: dreptunghi, exterior, 7 mm)'), ctxDe(reg, 6))), /etichetă nevalidă/);
  // Eticheta găurii pe traseul pătratului: o buclă orară sub interior + urcare (trebuie trigonometric).
  assert.match(mesaje(inv9(progPatrat(false, '(g/g: cerc, interior, 1 mm)'), ctxDe(reg, 6))), /bucla lui g\/g \(interior, urcare\).*trebuie trigonometric/);
});

test('poarta: un document v3 în context se judecă după migrare (urcare)', () => {
  const v3 = structuredClone(PLACA_1()) as unknown as Liber;
  v3['schema'] = 3;
  for (const p of v3['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) delete o['sens'];
  const reg = regiuneDinDocument(v3 as never);
  assert.deepEqual([...reg.taieturi.values()].flatMap((t) => [...t.sensuri.values()].flat()), ['urcare', 'urcare']);
  const bun = programDinTrasee(traseeCerute(PLACA_1(), 6), MONTAJE[0]!);
  assert.deepEqual(inv9(bun, ctxDe(reg, 6)), []);
  const rau = programDinTrasee(traseeCerute(PLACA_1(), 6, { intoarse: new Set(['e2/e2']) }), MONTAJE[0]!);
  assert.equal(inv9(rau, ctxDe(reg, 6)).length, 2);
});

// ── Placa 1, pe hârtie ──────────────────────────────────────────────────────────────────────────────────────────────

const ctxPlaca = (sens: { rama?: SensO; gaura?: SensO }, origine: 'stanga-jos' | 'dreapta-sus' | 'dreapta-jos' | 'stanga-sus'): ContextPoarta => ({
  foaie: STOC_PLACA, origine, z0: 'sus', diametruScula: 6, pas: 4, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(docPlaca1(sens)),
});

test('placa 1 (§7 amendat: gaura G3, insula G2, din același punct): A pe stânga-jos și B pe dreapta-sus trec toată poarta', () => {
  assert.deepEqual(poartaV(cuEtichete(PLACA_1_NOUA.A), ctxPlaca({}, 'stanga-jos')), []);
  assert.deepEqual(poartaV(cuEtichete(PLACA_1_NOUA.B), ctxPlaca({}, 'dreapta-sus')), []);
  // Aceleași linii (34), aceeași pornire a fiecărei bucle ca fișierele vechi; diferă doar insula.
  for (const f of ['A', 'B'] as const) {
    const nou = PLACA_1_NOUA[f].split('\n'), vechi = PLACA_1_VECHE[f].split('\n');
    assert.equal(nou.length, vechi.length);
    assert.equal(nou.length - 1, 34);
    const diferite = nou.flatMap((l, k) => (l === vechi[k] ? [] : [k + 1]));
    assert.deepEqual(diferite, [24, 25, 26, 27, 28, 29, 30, 31], f);
    assert.deepEqual(bucleText(cuEtichete(PLACA_1_NOUA[f])).map((b) => b.start), bucleText(cuEtichete(PLACA_1_VECHE[f])).map((b) => b.start), f);
  }
});

test('poarta: axul pornit cu M4 (invers) e încălcare a invariantei 9: tabelul e doar pentru M3; un M4 în comentariu nu', () => {
  const ctx = ctxPlaca({}, 'stanga-jos');
  const m4 = cuEtichete(PLACA_1_NOUA.A).replace('M3 S18000', 'M4 S18000');
  assert.deepEqual(inv9(m4, ctx).map((i) => [i.linia, i.mesaj]), [[9, 'sensul de tăiere: axul pornit cu M4 (invers); tabelul ADR 0027 e doar pentru M3']]);
  assert.deepEqual(inv9(cuEtichete(PLACA_1_NOUA.A).replace('(post GRBL 1.1)', '(post GRBL 1.1, fara M4)'), ctx), []);
  assert.deepEqual(inv9(cuEtichete(PLACA_1_NOUA.A).replace('M3 S18000', 'M03 S18000'), ctx), []);
  assert.equal(inv9(cuEtichete(PLACA_1_NOUA.A).replace('M3 S18000', 'M04 S18000'), ctx).length, 1);
});

test('placa 1 veche (totul G3): în urcare, insula e prinsă (o buclă); cu insula în opoziție trece; B la fel, pe colțul lui', () => {
  for (const [f, origine] of [['A', 'stanga-jos'], ['B', 'dreapta-sus']] as const) {
    const v = inv9(cuEtichete(PLACA_1_VECHE[f]), ctxPlaca({}, origine));
    assert.equal(v.length, 1, mesaje(v));
    assert.match(v[0]!.mesaj, /bucla lui e1\/e1 \(exterior, urcare\) la liniile 24–31, Z -3\.000 are aria 6988\.274 mm² \(trigonometric\); trebuie orar/);
    assert.deepEqual(inv9(cuEtichete(PLACA_1_VECHE[f]), ctxPlaca({ rama: 'opozitie' }, origine)), []);
  }
});

test('placa 1 întoarsă (18cf16d: gaura G2, insula G3): în urcare, trei bucle prinse (două treceri ale găurii, insula); totul în opoziție trece', () => {
  for (const [f, origine] of [['A', 'stanga-jos'], ['B', 'dreapta-sus']] as const) {
    const v = inv9(cuEtichete(PLACA_1_INTOARSA[f]), ctxPlaca({}, origine));
    assert.deepEqual(v.map((i) => i.linia), [14, 18, 24], mesaje(v));
    assert.match(v[0]!.mesaj, /e2\/e2 \(interior, urcare\).*aria -452\.389 mm² \(orar\); trebuie trigonometric/);
    assert.deepEqual(inv9(cuEtichete(PLACA_1_INTOARSA[f]), ctxPlaca({ rama: 'opozitie', gaura: 'opozitie' }, origine)), []);
  }
  // Noua, cu gaura cerută în opoziție: ambele treceri ale găurii.
  assert.deepEqual(inv9(cuEtichete(PLACA_1_NOUA.A), ctxPlaca({ gaura: 'opozitie' }, 'stanga-jos')).map((i) => i.linia), [14, 18]);
});

test('placa 1, montajul: B citit pe alt colț are alte coordonate (invarianta 2), dar același semn al buclelor (colțurile sunt translații)', () => {
  const corect = inv9(cuEtichete(PLACA_1_INTOARSA.B), ctxPlaca({}, 'dreapta-sus'));
  for (const origine of ['stanga-jos', 'dreapta-jos', 'stanga-sus'] as const) {
    assert.deepEqual(inv9(cuEtichete(PLACA_1_INTOARSA.B), ctxPlaca({}, origine)), corect, origine);
  }
  assert.ok(inv2(cuEtichete(PLACA_1_NOUA.B), ctxPlaca({}, 'stanga-jos')).length > 0);
  // Buclele lui B în document (dreapta-sus): aceleași starturi și arii ca ale lui A.
  const laDoc = (p: Punct3): Punct3 => laDocument(p, { foaie: STOC_PLACA, origine: 'dreapta-sus', z0: 'sus' });
  const b = bucleText(cuEtichete(PLACA_1_NOUA.B), laDoc), a = bucleText(cuEtichete(PLACA_1_NOUA.A));
  assert.deepEqual(b.map((x) => [x.start, x.z, x.arie.toFixed(6)]), a.map((x) => [x.start, x.z, x.arie.toFixed(6)]));
});

test('placa 1 pe cele 4 colțuri × 2 Z0 × 4 combinații de sens (traseele cerute, cu două treceri pe gaură): trece; un inel întors e prins pe fiecare trecere', () => {
  for (const m of MONTAJE) {
    for (const rama of SENSURI) {
      for (const gaura of SENSURI) {
        const doc = PLACA_1(6, { rama, gaura });
        const reg = regiuneDinDocument(doc);
        const unde = `${m.origine} ${m.z0} ${rama}/${gaura}`;
        for (const intre of ['coboara', 'ridica'] as const) {
          const text = programDinTrasee(traseeCerute(doc, 6, { intre }), m);
          assert.deepEqual([...inv9(text, ctxDe(reg, 6, m)), ...inv2(text, ctxDe(reg, 6, m))], [], `${unde} ${intre}`);
        }
        const g = inv9(programDinTrasee(traseeCerute(doc, 6, { intoarse: new Set(['e2/e2']) }), m), ctxDe(reg, 6, m));
        assert.equal(g.length, 2, `${unde}: gaura întoarsă\n${mesaje(g)}`);
        const r = inv9(programDinTrasee(traseeCerute(doc, 6, { intoarse: new Set(['e1/e1']) }), m), ctxDe(reg, 6, m));
        assert.equal(r.length, 1, `${unde}: rama întoarsă`);
        assert.match(r[0]!.mesaj, new RegExp(`e1/e1 \\(exterior, ${rama}\\)`));
      }
    }
  }
});

// ── Dreptunghiuri rotunjite, instanțe rotite, oglindiri ─────────────────────────────────────────────────────────────

test('dreptunghiuri rotunjite, cercuri, instanțe rotite (0°, 30°, 117,5°, 270°), oglindite: traseele cerute trec; oglindirea nu schimbă semnul cerut', () => {
  const r = aleator(0x9e05);
  let cazuri = 0;
  for (const rotire of [0, 30, 117.5, 270]) {
    for (const oglindit of [false, true]) {
      const sens = (): SensO => (r() < 0.5 ? 'urcare' : 'opozitie');
      const doc = documentRegiune(STOC, [{
        id: 'p',
        elemente: [
          { id: 'rama', forma: drept(80, 50, 8), laturi: ['exterior'], sensuri: [sens()] },
          { id: 'gaura', forma: drept(30, 20, 5), matrice: tr(10, 15), laturi: ['interior'], sensuri: [sens()] },
          { id: 'cerc', forma: cerc(6), matrice: tr(62, 25), laturi: ['interior'], sensuri: [sens()] },
        ],
        ...(oglindit ? { grup: oglinda(80) } : {}),
      }], [{ id: 'i', piesa: 'p', x: 150, y: 100, rotire }], { diametru: 6 });
      const reg = regiuneDinDocument(doc);
      for (const m of [MONTAJE[0]!, MONTAJE[5]!]) {
        const text = programDinTrasee(traseeCerute(doc, 6), m);
        assert.deepEqual(inv9(text, ctxDe(reg, 6, m)), [], `${rotire}° ${oglindit ? 'oglindit' : ''} ${m.origine}`);
        cazuri++;
      }
      // Desenul oglindit e parcurs invers (determinantul −1): traseul „cum e desenat” al ramei e orar, nu trigonometric.
      const rama = reg.inele.find((x) => x.idLume === 'i/rama')!;
      const desenat = rama.contur.drumIdeal(3, 'exterior')!;
      assert.equal(ariaEsantionata(desenat) < 0, oglindit, `orientarea desenului ${rotire}°`);
      // Semnul cerut nu depinde de oglindire: ce trece e mereu traseul orientat după latură și sens, iar „cum e desenat”
      // trece doar când desenul nimerește sensul.
      // Sensul ramei, citit direct din operația ei (nu din regiune).
      const sensRama = doc.piese[0]!.operatii.find((x) => x.noduri.includes('rama'))!.sens;
      const textDesenat = programDinTrasee([{ eticheta: 'i/rama: dreptunghi, exterior, 3 mm', primitive: desenat, adancime: 3 }], MONTAJE[0]!);
      const nimerit = (ariaEsantionata(desenat) > 0) === (semnAsteptat('exterior', sensRama) > 0);
      assert.equal(inv9(textDesenat, ctxDe(reg, 6)).length, nimerit ? 0 : 1, `desenat ${rotire}° ${oglindit}`);
    }
  }
  assert.equal(cazuri, 16);
});

// ── A doua metodă: aria exactă față de aria eșantionată ─────────────────────────────────────────────────────────────

test('a doua metodă: pe 400 de bucle aleatoare cu arce (G2 / G3, scrise rotunjit), aria exactă = aria eșantionată, pe toate colțurile', () => {
  const r = aleator(0xa41a);
  const f3 = (v: number): string => (v.toFixed(3) === '-0.000' ? '0.000' : v.toFixed(3));
  let cuArce = 0;
  for (let n = 0; n < 400; n++) {
    const m = MONTAJE[n % MONTAJE.length]!;
    const ox = m.origine === 'dreapta-jos' || m.origine === 'dreapta-sus' ? STOC.latime : 0;
    const oy = m.origine === 'dreapta-sus' || m.origine === 'stanga-sus' ? STOC.inaltime : 0;
    const cx = 60 + r() * 180, cy = 50 + r() * 100, rho = 5 + r() * 40;
    const k = 3 + Math.floor(r() * 7);
    const unghiuri = Array.from({ length: k }, () => r() * 2 * Math.PI).sort((a, b) => a - b);
    if (r() < 0.5) unghiuri.reverse();
    const v = unghiuri.map((u) => [Number(f3(cx + rho * Math.cos(u) - ox)), Number(f3(cy + rho * Math.sin(u) - oy))] as const);
    const linii = [`G0 X${f3(v[0]![0])} Y${f3(v[0]![1])}`, 'G1 Z-2.000 F300.0'];
    for (let i = 0; i < k; i++) {
      const a = v[i]!, b = v[(i + 1) % k]!;
      if (r() < 0.5) { linii.push(`G1 X${f3(b[0])} Y${f3(b[1])} F1000.0`); continue; }
      // Arcul prin a și b: centrul pe mediatoare, la o distanță oarecare; G2 sau G3 la întâmplare.
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (L < 0.5) { linii.push(`G1 X${f3(b[0])} Y${f3(b[1])} F1000.0`); continue; }
      const t = (r() - 0.5) * 3;
      const c = [mx - (dy / L) * t * L, my + (dx / L) * t * L];
      linii.push(`${r() < 0.5 ? 'G2' : 'G3'} X${f3(b[0])} Y${f3(b[1])} I${f3(c[0]! - a[0])} J${f3(c[1]! - a[1])} F1000.0`);
      cuArce++;
    }
    const text = prg(...linii);
    const laDoc = (p: Punct3): Punct3 => laDocument(p, m);
    const b = bucleText(text, laDoc);
    // Eșantionat: punctele mișcărilor de la adâncime, cu pasul 0.01 (coardele pierd cel mult θ·0.01²/12 ≈ 5e-5 mm² pe
    // arc), în document.
    const pts = citeste(text).evenimente.flatMap((e) => (e.tip === 'mutare' && e.m.cod !== 0 && e.m.startCunoscut && e.m.a[2] < 0 && e.m.b[2] < 0 && e.m.a[2] === e.m.b[2]
      ? esantioane(e.m, 0.01).map(laDoc) : []));
    let A = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!, q = pts[(i + 1) % pts.length]!;
      A += (p[0] - pts[0]![0]) * (q[1] - pts[0]![1]) - (q[0] - pts[0]![0]) * (p[1] - pts[0]![1]);
    }
    A /= 2;
    assert.equal(b.filter((x) => x.inchisa).length, 1, `#${n}: ${JSON.stringify(b.map((x) => [x.inchisa, x.linii]))}`);
    const exact = b.find((x) => x.inchisa)!.arie;
    assert.ok(Math.abs(exact - A) <= 1e-3 + 1e-6 * Math.abs(A), `#${n}: exact ${exact}, eșantionat ${A}`);
  }
  assert.ok(cuArce > 600, `${cuArce} arce`);
});

// ── Lipirea cu aplicația ────────────────────────────────────────────────────────────────────────────────────────────

/** Corpusul 2.3a (cu sensuri la întâmplare) și placa 1 pe toate montajele, în toate combinațiile de sens. */
function cazurileLipirii(): CazCorpus[] {
  return [
    ...MONTAJE.flatMap((m) => SENSURI.flatMap((rama) => SENSURI.map((gaura) => ({
      nume: `placa 1 ${m.origine} ${m.z0} ${rama}/${gaura}`, familie: 'placa', doc: PLACA_1(6, { rama, gaura }), diametru: 6, origine: m.origine, z0: m.z0,
    })))),
    ...corpus(),
  ];
}

type Lipit = { readonly caz: CazCorpus; readonly text: string | null; readonly motiv: string | null };
const ruleaza = async (cazuri: readonly CazCorpus[]): Promise<Lipit[]> => {
  const rez: Lipit[] = [];
  for (const caz of cazuri) {
    const r = await programulAplicatiei(caz.doc, { origine: caz.origine, z0: caz.z0 });
    rez.push({ caz, text: r.ok ? r.text : null, motiv: r.ok ? null : r.motiv });
  }
  return rez;
};
let lipire: Promise<Lipit[]> | null = null;
const programe = (): Promise<Lipit[]> => (lipire ??= ruleaza(cazurileLipirii()));

const ctxCaz = (caz: CazCorpus, doc: DocV4O = caz.doc): ContextPoarta => ({
  foaie: STOC, origine: caz.origine, z0: caz.z0, diametruScula: caz.diametru, pas: 4, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(doc),
});
const descrie = (c: CazCorpus): string => `[${c.familie}] ${c.nume} (${c.origine}, Z0 ${c.z0}, Ø${c.diametru})`;
const laDocCaz = (c: CazCorpus) => (p: Punct3): Punct3 => laDocument(p, { foaie: STOC, origine: c.origine, z0: c.z0 });

/** Documentul cu sensul întors pe operațiile alese (`alege(latura, k)`, k = al câtelea în document). */
function intoarce(doc: DocV4O, alege: (latura: string, k: number) => boolean): DocV4O {
  const d = structuredClone(doc);
  let k = 0;
  for (const p of d.piese) for (const o of p.operatii) if (alege(o.latura, k++)) o.sens = o.sens === 'urcare' ? 'opozitie' : 'urcare';
  return d;
}

test('lipire: aplicația e pe schema 4 sau 5 (ușa primește un v4; pe 5, îl migrează cu urechi: null)', async () => {
  const s = await schemaAplicatiei();
  assert.ok(s === 4 || s === 5, `schema ${s}`);
});

test('lipire: orice program scris de aplicație trece invariantele 9 și 2 (corpusul 2.3a cu sensuri la întâmplare, placa 1 × 8 montaje × 4 sensuri)', async () => {
  const rez = await programe();
  const rele: string[] = [];
  let bucle = 0, plus = 0, minus = 0;
  for (const x of rez) {
    if (x.text === null) continue;
    const v = poartaV(x.text, ctxCaz(x.caz)).filter((i) => i.invarianta === 9 || i.invarianta === 2);
    if (v.length) rele.push(`${descrie(x.caz)}: ${mesaje(v.slice(0, 3))}`);
    const reg = regiuneDinDocument(x.caz.doc);
    const et = eticheteleProgramului(x.text, reg);
    for (const b of bucleText(x.text, laDocCaz(x.caz))) {
      const e = et[b.eticheta]?.eticheta;
      if (!e || e.latura === 'pe-linie' || !b.inchisa) continue;
      bucle++;
      if (b.arie > 0) plus++; else minus++;
    }
  }
  assert.deepEqual(rele, []);
  const n = rez.filter((x) => x.text !== null).length;
  assert.ok(n >= 200 && plus > 150 && minus > 150, `${n} programe, ${bucle} bucle judecate (${plus} trigonometric, ${minus} orar)`);
  console.log(`lipire 9: ${rez.length} cazuri, ${n} programe, ${bucle} bucle exterior / interior judecate (${plus} +, ${minus} −)`);
});

/**
 * Perechile de bucle a două programe ale aceluiași document cu sensuri diferite: aceeași etichetă, aceeași adâncime,
 * aceeași pornire (§4), aceeași mărime a ariei; semnul se întoarce exact unde sensul așteptat s-a schimbat (pe
 * `pe-linie`, niciodată). Întoarce problemele și câte bucle s-au întors.
 */
function comparaIntoarse(caz: CazCorpus, a: string, b: string, docB: DocV4O): { rele: string[]; intoarse: number } {
  const rele: string[] = [];
  const regA = regiuneDinDocument(caz.doc), regB = regiuneDinDocument(docB);
  const etA = eticheteleProgramului(a, regA), etB = eticheteleProgramului(b, regB);
  const sA = sensurileEtichetelor(etA, regA), sB = sensurileEtichetelor(etB, regB);
  const ba = bucleText(a, laDocCaz(caz)), bb = bucleText(b, laDocCaz(caz));
  if (a.split('\n').length !== b.split('\n').length) rele.push(`numărul de linii: ${a.split('\n').length} ≠ ${b.split('\n').length}`);
  if (ba.length !== bb.length) return { rele: [...rele, `numărul de bucle: ${ba.length} ≠ ${bb.length}`], intoarse: 0 };
  let intoarse = 0;
  ba.forEach((x, k) => {
    const y = bb[k]!;
    const ea = etA[x.eticheta], eb = etB[y.eticheta];
    const unde = `bucla ${k} (${ea?.eticheta?.idLume ?? '?'}, liniile ${x.linii[0]} / ${y.linii[0]})`;
    if (JSON.stringify(ea?.eticheta) !== JSON.stringify(eb?.eticheta)) { rele.push(`${unde}: alte etichete`); return; }
    if (Math.abs(x.z - y.z) > 1e-9 || x.inchisa !== y.inchisa) { rele.push(`${unde}: altă adâncime sau închidere`); return; }
    if (Math.hypot(x.start.x - y.start.x, x.start.y - y.start.y) > 0.001) rele.push(`${unde}: pornirea s-a mutat (§4)`);
    // Aceeași buclă parcursă invers: aria diferă doar prin rotunjirea postului (fiecare punct cu cel mult 0,002 mm, deci
    // aria cu cel mult lungimea × 0,002), nu prin altă geometrie.
    if (Math.abs(Math.abs(x.arie) - Math.abs(y.arie)) > 0.002 * Math.max(x.lungime, y.lungime) + 1e-6) rele.push(`${unde}: aria ${x.arie} față de ${y.arie}`);
    if (!ea?.eticheta || !x.inchisa || Math.abs(x.arie) <= 1e-6) return;
    let trebuie = 1;
    if (ea.eticheta.latura !== 'pe-linie') {
      const sa = sA[x.eticheta], sb = sB[y.eticheta];
      if (!sa || !sb || 'motiv' in sa || 'motiv' in sb) { rele.push(`${unde}: fără sens așteptat`); return; }
      trebuie = sa.sens === sb.sens ? 1 : -1;
    }
    if (trebuie === -1) intoarse++;
    if (Math.sign(x.arie) * Math.sign(y.arie) !== trebuie) rele.push(`${unde}: semnul ${trebuie === -1 ? 'nu s-a întors' : 's-a întors'} (${x.arie.toFixed(3)} → ${y.arie.toFixed(3)})`);
  });
  return { rele, intoarse };
}

test('lipire: toate operațiile exterior / interior întoarse: fiecare buclă își schimbă semnul, din aceeași pornire, cu aceleași linii; noul program trece', async () => {
  const rez = (await programe()).filter((x) => x.text !== null);
  const intoarseToate = rez.map((x) => ({ ...x.caz, doc: intoarce(x.caz.doc, (l) => l !== 'pe-linie') }));
  const b = await ruleaza(intoarseToate);
  const rele: string[] = [];
  let comparate = 0, intoarse = 0;
  rez.forEach((x, k) => {
    const y = b[k]!;
    if (y.text === null) { rele.push(`${descrie(x.caz)}: întors, aplicația refuză: ${y.motiv}`); return; }
    const v = poartaV(y.text, ctxCaz(y.caz)).filter((i) => i.invarianta === 9 || i.invarianta === 2);
    if (v.length) rele.push(`${descrie(x.caz)}, întors: ${mesaje(v.slice(0, 2))}`);
    const c = comparaIntoarse(x.caz, x.text!, y.text, y.caz.doc);
    if (c.rele.length) rele.push(`${descrie(x.caz)}: ${c.rele.slice(0, 3).join('; ')}`);
    comparate++;
    intoarse += c.intoarse;
  });
  assert.deepEqual(rele, []);
  assert.ok(comparate >= 200 && intoarse >= 300, `${comparate} programe comparate, ${intoarse} bucle întoarse`);
});

test('lipire: o singură operație întoarsă (aleasă la întâmplare): se întorc doar buclele ei', async () => {
  const r = aleator(0x1a7e);
  const rez = (await programe()).filter((x) => x.text !== null);
  const alese = rez.map((x) => {
    const ops = x.caz.doc.piese.flatMap((p) => p.operatii).map((o, k) => [o.latura, k] as const).filter(([l]) => l !== 'pe-linie');
    const k = ops.length ? ops[Math.floor(r() * ops.length)]![1] : -1;
    return { ...x.caz, doc: intoarce(x.caz.doc, (_, j) => j === k) };
  });
  const b = await ruleaza(alese);
  const rele: string[] = [];
  const faraIntoarse: string[] = [];
  rez.forEach((x, k) => {
    const y = b[k]!;
    if (y.text === null) { rele.push(`${descrie(x.caz)}: aplicația refuză: ${y.motiv}`); return; }
    const c = comparaIntoarse(x.caz, x.text!, y.text, y.caz.doc);
    if (c.rele.length) rele.push(`${descrie(x.caz)}: ${c.rele.slice(0, 3).join('; ')}`);
    else if (c.intoarse === 0) faraIntoarse.push(descrie(x.caz));
  });
  assert.deepEqual(rele, []);
  // Operația aleasă își are buclele în program, deci cel puțin una se întoarce (rar: scula nu încape, plonjare pe loc).
  assert.ok(faraIntoarse.length <= rez.length / 20, faraIntoarse.join('\n'));
});

test('lipire: sensul de pe o operație pe-linie nu schimbă nimic din program (§3)', async () => {
  const rez = (await programe()).filter((x) => x.text !== null && x.caz.doc.piese.some((p) => p.operatii.some((o) => o.latura === 'pe-linie')));
  assert.ok(rez.length >= 4, `${rez.length} programe cu pe-linie`);
  const b = await ruleaza(rez.map((x) => ({ ...x.caz, doc: intoarce(x.caz.doc, (l) => l === 'pe-linie') })));
  rez.forEach((x, k) => assert.equal(b[k]!.text, x.text, descrie(x.caz)));
});

test('lipire: placa 1 prin aplicație: gaura în G3 la urcare și G2 la opoziție; insula în G2 la urcare și G3 la opoziție (textul arcelor)', async () => {
  const rez = (await programe()).filter((x) => x.caz.familie === 'placa');
  assert.equal(rez.length, 32);
  for (const x of rez) {
    assert.ok(x.text, descrie(x.caz));
    const linii = x.text.split('\n');
    const arce = (id: string): string[] => {
      const i = linii.findIndex((l) => l.startsWith(`(${id}:`));
      const j = linii.findIndex((l, k) => k > i && l.startsWith('(') && citesteEticheta(l) !== null);
      return linii.slice(i, j < 0 ? undefined : j).flatMap((l) => (/^G[23] /.test(l) ? [l.slice(0, 2)] : []));
    };
    // Sensul fiecărui inel, citit direct din operațiile documentului (nu din regiune).
    const sens = (id: string, l: 'exterior' | 'interior'): SensO => x.caz.doc.piese.find((p) => p.id === id.split('/')[1])!.operatii.find((o) => o.latura === l)!.sens;
    const gaura = arce('e2/e2'), rama = arce('e1/e1');
    assert.ok(gaura.length >= 4 && rama.length >= 4, descrie(x.caz));
    assert.deepEqual([...new Set(gaura)], [sens('e2/e2', 'interior') === 'urcare' ? 'G3' : 'G2'], `${descrie(x.caz)}: gaura`);
    assert.deepEqual([...new Set(rama)], [sens('e1/e1', 'exterior') === 'urcare' ? 'G2' : 'G3'], `${descrie(x.caz)}: rama`);
  }
});

test('lipire: fișierele de aur ale plăcii 1 din repo sunt exact cele cerute de §7 amendat și trec toată poarta, cu etichete, în urcare', () => {
  for (const f of ['A', 'B'] as const) {
    const text = readFileSync(new URL(`../placi/placa-01/placa-01-${f}.nc`, import.meta.url), 'utf8');
    assert.equal(text, PLACA_1_NOUA[f], `placa-01-${f}.nc nu e cea de pe hârtie`);
    assert.deepEqual(poartaV(cuEtichete(text), ctxPlaca({}, f === 'A' ? 'stanga-jos' : 'dreapta-sus')), [], f);
  }
});

test('amendamentul ADR 0028 §5: pe fiecare program judecat în acest fișier (scrise de mână, traseele cerute coborâte și ridicate, inele întoarse, aplicația), verdictele invariantei 9 sunt EXACT cele ale primei redactări', () => {
  let programe = 0, cuIncalcari = 0, verdicte = 0;
  const rele: string[] = [];
  for (const { text, ctx } of vazute) {
    if (!ctx.regiune) continue;
    const reg = ctx.regiune;
    const { evenimente } = citeste(text);
    const et = eticheteleProgramului(text, reg);
    const laDoc = (p: Punct3): Punct3 => laDocument(p, ctx);
    const nou = verificaSensul(evenimente, et, reg, laDoc).map((x) => `${x.linia}: ${x.mesaj}`);
    const vechi = verificaSensul(evenimente, et, reg, laDoc, bucleleInainteDe0028).map((x) => `${x.linia}: ${x.mesaj}`);
    if (JSON.stringify(nou) !== JSON.stringify(vechi)) rele.push(`${text.split('\n').length} linii: nou ${JSON.stringify(nou.slice(0, 2))}, vechi ${JSON.stringify(vechi.slice(0, 2))}`);
    programe++;
    if (vechi.length) cuIncalcari++;
    verdicte += vechi.length;
  }
  assert.deepEqual(rele, []);
  assert.ok(programe >= 500 && cuIncalcari >= 20, `${programe} programe, ${cuIncalcari} cu încălcări (${verdicte} verdicte)`);
  console.log(`amendamentul 9: ${programe} programe comparate, ${cuIncalcari} cu încălcări, ${verdicte} verdicte identice`);
});
