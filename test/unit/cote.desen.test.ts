import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desenLiniar, distantaDinCursor, distantaLaDesen, felAutomat, scrieCifra, STIL_IMPLICIT, textCota, textValoare, type CapatDesen, type DesenCota, type FormatCifre } from '../../src/model/desenCota.ts';
import type { Cota } from '../../src/model/document.ts';

/**
 * Desenul unei cote liniare (ADR 0330 §4, §5), pe hârtie: linia de cotă la distanța `d` de mijlocul celor două puncte, pe
 * normala direcției măsurate (orizontala: în sus, verticala: spre stânga, aliniata: în stânga drumului a → b); liniile de
 * extensie, cu golul față de formă și depășirea liniei de cotă; capetele înăuntru, sau în afară când nu încap; cifra la mijloc,
 * deasupra liniei, citibilă (unghiul în (−90°, 90°]). Plus felul ales de Automată după locul cursorului și textul cifrei.
 */
const P = (x: number, y: number): { x: number; y: number } => ({ x, y });
const egal = (a: { x: number; y: number }, x: number, y: number, unde: string): void => {
  assert.ok(Math.abs(a.x - x) < 1e-9 && Math.abs(a.y - y) < 1e-9, `${unde}: (${a.x}, ${a.y}), nu (${x}, ${y})`);
};
const S = STIL_IMPLICIT;

/** Vârful și baza unei săgeți. */
const sag = (c: CapatDesen | undefined): readonly [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }] => {
  assert.ok(c?.fel === 'sageata');
  return c.puncte;
};

test('stilul implicit, din ADR 0330 §6: golul 1, depășirea 2, capetele 2,5 (săgeți pline), cifrele 3,5 mm deasupra, extensiile arătate', () => {
  assert.deepEqual(S, { gol: 1, depasire: 2, capat: 2.5, inaltime: 3.5, capete: 'plina', extensii: true, loc: 'deasupra' });
});

test('orizontala: linia la y = mijloc + d, picioarele, extensiile cu golul și depășirea, capetele înăuntru, cifra deasupra', () => {
  // a = (0, 0), b = (100, 20): mijlocul pe Y e 10; d = 15 → linia la y = 25.
  const r = desenLiniar('orizontala', P(0, 0), P(100, 20), 15, S) as DesenCota;
  assert.ok(r);
  egal(r.picioare[0], 0, 25, 'piciorul lui a');
  egal(r.picioare[1], 100, 25, 'piciorul lui b');
  egal(r.linie[0], 0, 25, 'linia de la');
  egal(r.linie[1], 100, 25, 'linia până la');
  assert.equal(r.extensii.length, 2);
  egal(r.extensii[0]?.[0] ?? P(0, 0), 0, 1, 'extensia lui a pornește la golul de 1 mm');
  egal(r.extensii[0]?.[1] ?? P(0, 0), 0, 27, 'și trece cu 2 mm de linie');
  egal(r.extensii[1]?.[0] ?? P(0, 0), 100, 21, 'extensia lui b');
  egal(r.extensii[1]?.[1] ?? P(0, 0), 100, 27, 'extensia lui b, capătul');
  // Capetele: vârful în picior, baza la 2,5 mm spre înăuntru, lățimea 2,5 / 3.
  const c1 = sag(r.capete[0]), c2 = sag(r.capete[1]);
  assert.equal(r.capete[0]?.fel === 'sageata' && r.capete[0].plina, true);
  assert.deepEqual(r.bucati, [r.linie], 'linia întreagă');
  egal(c1[0], 0, 25, 'vârful primului capăt');
  egal(c1[1], 2.5, 25 + 2.5 / 6, 'baza lui, sus');
  egal(c1[2], 2.5, 25 - 2.5 / 6, 'baza lui, jos');
  egal(c2[0], 100, 25, 'vârful celui de-al doilea');
  egal(c2[1], 97.5, 25 - 2.5 / 6, 'baza lui');
  // Cifra: la mijloc, cu baza la 0,3 × 3,5 = 1,05 mm deasupra liniei, orizontală.
  egal(r.text.p, 50, 25 + 1.05, 'cifra');
  assert.equal(r.text.unghi, 0);
});

test('orizontala sub puncte (d negativ): extensiile coboară, linia la y = 10 − 30 = −20', () => {
  const r = desenLiniar('orizontala', P(0, 0), P(100, 20), -30, S) as DesenCota;
  egal(r.picioare[0], 0, -20, 'piciorul lui a');
  egal(r.extensii[0]?.[0] ?? P(9, 9), 0, -1, 'extensia lui a pornește sub a');
  egal(r.extensii[0]?.[1] ?? P(9, 9), 0, -22, 'și trece de linie în jos');
  egal(r.extensii[1]?.[0] ?? P(9, 9), 100, 19, 'extensia lui b, sub b');
  // Cifra rămâne deasupra liniei, citibilă (nu „sub” ea, întoarsă).
  egal(r.text.p, 50, -20 + 1.05, 'cifra');
});

test('verticala: linia la x = mijloc − d (normala spre stânga), cifra rotită cu 90°, la stânga liniei', () => {
  const r = desenLiniar('verticala', P(0, 0), P(20, 50), 12, S) as DesenCota;
  // Mijlocul pe X e 10; normala (−1, 0): linia la x = −(−10 + 12)... adică x = 10 − 12 = −2.
  egal(r.picioare[0], -2, 0, 'piciorul lui a');
  egal(r.picioare[1], -2, 50, 'piciorul lui b');
  assert.equal(r.text.unghi, 90);
  egal(r.text.p, -2 - 1.05, 25, 'cifra, la stânga liniei');
});

test('aliniata: paralelă cu a → b, la d pe stânga drumului; cifra citibilă și când drumul merge spre stânga', () => {
  const r = desenLiniar('aliniata', P(0, 0), P(30, 40), 10, S) as DesenCota;
  // u = (0,6; 0,8), n = (−0,8; 0,6): picioarele la a + 10 n și b + 10 n.
  egal(r.picioare[0], -8, 6, 'piciorul lui a');
  egal(r.picioare[1], 22, 46, 'piciorul lui b');
  assert.ok(Math.abs(r.text.unghi - (Math.atan2(40, 30) * 180) / Math.PI) < 1e-9);
  const inv = desenLiniar('aliniata', P(30, 40), P(0, 0), -10, S) as DesenCota;
  egal(inv.picioare[0], 22, 46, 'același desen, cu punctele schimbate și d cu semnul invers');
  assert.ok(Math.abs(inv.text.unghi - r.text.unghi) < 1e-9, 'unghiul cifrei, citibil, același');
  egal(inv.text.p, r.text.p.x, r.text.p.y, 'cifra, în același loc');
});

test('capetele în afară când linia e mai scurtă decât două capete: linia se prelungește cu câte două capete', () => {
  const r = desenLiniar('orizontala', P(0, 0), P(4, 0), 10, S) as DesenCota;
  const c1 = sag(r.capete[0]);
  egal(c1[0], 0, 10, 'vârful');
  egal(c1[1], -2.5, 10 - 2.5 / 6, 'baza, în afară');
  egal(r.linie[0], -5, 10, 'linia, prelungită spre stânga');
  egal(r.linie[1], 9, 10, 'și spre dreapta');
});

test('un punct chiar pe linia de cotă n-are extensie; aliniata între două puncte identice n-are desen', () => {
  const r = desenLiniar('orizontala', P(0, 0), P(100, 20), -10, S) as DesenCota;
  // Linia la y = 0: a e pe ea.
  assert.equal(r.extensii.length, 1);
  assert.equal(desenLiniar('aliniata', P(5, 5), P(5, 5), 10, S), null);
});

test('distanța din cursor: semnată, pe normală, față de mijloc; inversa desenului', () => {
  assert.equal(distantaDinCursor('orizontala', P(0, 0), P(100, 20), P(40, 25)), 15);
  assert.equal(distantaDinCursor('verticala', P(0, 0), P(20, 50), P(-2, 7)), 12);
  assert.ok(Math.abs(distantaDinCursor('aliniata', P(0, 0), P(30, 40), P(-8, 6)) - 10) < 1e-12);
});

test('Automată: deasupra sau dedesubt e orizontala, la stânga sau la dreapta verticala, înăuntru aliniata', () => {
  const a = P(0, 0), b = P(100, 20);
  assert.equal(felAutomat(a, b, P(50, 40)), 'orizontala');
  assert.equal(felAutomat(a, b, P(50, -5)), 'orizontala');
  assert.equal(felAutomat(a, b, P(120, 10)), 'verticala');
  assert.equal(felAutomat(a, b, P(-3, 10)), 'verticala');
  assert.equal(felAutomat(a, b, P(50, 10)), 'aliniata');
  // În colț, axa pe care cursorul a ieșit mai mult.
  assert.equal(felAutomat(a, b, P(105, 40)), 'orizontala');
  assert.equal(felAutomat(a, b, P(130, 25)), 'verticala');
  assert.equal(felAutomat(a, b, P(110, 30)), 'orizontala', 'la egalitate (10 și 10), orizontala');
  // Două puncte pe orizontală: orice loc deasupra dă orizontala (aceeași lungime ca aliniata).
  assert.equal(felAutomat(P(0, 0), P(50, 0), P(10, 8)), 'orizontala');
});

test('textul: zecimalele (implicit 2), zerourile tăiate, virgula în română; `<>` e valoarea, restul textului rămâne', () => {
  assert.equal(textValoare(120, true), '120');
  assert.equal(textValoare(120.5, true), '120,5');
  assert.equal(textValoare(120.456, true), '120,46');
  assert.equal(textValoare(120.456, false), '120.46');
  assert.equal(textValoare(0.004, true), '0');
  assert.equal(textValoare(-0.004, true), '0', 'fără „-0”');
  assert.equal(textValoare(99.996, true), '100');
  assert.equal(textValoare(250, false, 0), '250', 'fără zecimale, zerourile întregului rămân');
  const c = (text?: string): Cota => ({ id: 'c', fel: 'orizontala', ...(text === undefined ? {} : { text }) });
  assert.equal(textCota(c(), '50,25'), '50,25');
  assert.equal(textCota(c('4× <> mm'), '50,25'), '4× 50,25 mm');
  assert.equal(textCota(c('fix'), '50,25'), 'fix');
});

test('distanța unui punct la desenul cotei: la linie, la extensii și la cifră', () => {
  const r = desenLiniar('orizontala', P(0, 0), P(100, 20), 15, S) as DesenCota;
  assert.equal(distantaLaDesen(r, '120', P(50, 27)), 0, 'pe cifră (deasupra liniei: 6,3 × 3,5 mm, cu baza la 26,05)');
  assert.ok(Math.abs(distantaLaDesen(r, '120', P(10, 24)) - 1) < 1e-9, 'la 1 mm sub linie');
  assert.ok(Math.abs(distantaLaDesen(r, '120', P(50, 24.5)) - 0.5) < 1e-9, 'sub linie, sub cifră: cutia cifrei e doar deasupra');
  assert.ok(Math.abs(distantaLaDesen(r, '120', P(-1, 10)) - 1) < 1e-9, 'la 1 mm de extensia lui a');
  assert.ok(distantaLaDesen(r, '120', P(50, 10)) > 5, 'între puncte, sub linie, departe de tot');
});

const F: FormatCifre = { unitate: 'mm', zecimale: 2, zerouri: 'taiate', pas: null, virgula: true, cuUnitate: false };

test('cifra, după setări: unitatea (mm, cm, inch), zecimalele, zerourile, separatorul, unitatea scrisă', () => {
  assert.equal(scrieCifra(120, F), '120');
  assert.equal(scrieCifra(120, { ...F, unitate: 'cm' }), '12');
  assert.equal(scrieCifra(125, { ...F, unitate: 'cm' }), '12,5');
  // 120 / 25,4 = 4,7244…
  assert.equal(scrieCifra(120, { ...F, unitate: 'inch', zecimale: 3 }), '4,724');
  assert.equal(scrieCifra(120, { ...F, unitate: 'inch', zecimale: 3, cuUnitate: true, virgula: false }), '4.724 in');
  assert.equal(scrieCifra(120, { ...F, zerouri: 'pastrate' }), '120,00');
  assert.equal(scrieCifra(120.5, { ...F, zerouri: 'pastrate' }), '120,50');
  assert.equal(scrieCifra(120.456, { ...F, virgula: false }), '120.46');
  assert.equal(scrieCifra(120, { ...F, cuUnitate: true }), '120 mm');
  assert.equal(scrieCifra(99.6, { ...F, zecimale: 0 }), '100');
  assert.equal(scrieCifra(250, { ...F, zecimale: 0, zerouri: 'pastrate' }), '250', 'fără zecimale, zerourile întregului rămân');
  assert.equal(scrieCifra(-0.001, F), '0', 'fără „-0”');
});

test('cifra rotunjită la un pas: 0,5 și 0,25 (cu zecimalele pasului, chiar cerute mai puține)', () => {
  assert.equal(scrieCifra(120.3, { ...F, pas: 0.5 }), '120,5');
  assert.equal(scrieCifra(120.2, { ...F, pas: 0.5 }), '120');
  assert.equal(scrieCifra(120.2, { ...F, pas: 0.5, zerouri: 'pastrate' }), '120,00');
  assert.equal(scrieCifra(120.3, { ...F, pas: 0.25, zecimale: 0 }), '120,25');
  assert.equal(scrieCifra(120.3, { ...F, pas: 1, zecimale: 0 }), '120');
  // În cm, pasul e în cm: 12,34 cm la 0,5 → 12,5.
  assert.equal(scrieCifra(123.4, { ...F, unitate: 'cm', pas: 0.5 }), '12,5');
});

test('capetele: săgeata deschisă, bara oblică (la 45°, „/”), punctul, fără; nici una nu mută linia la o cotă scurtă', () => {
  const S2 = (capete: typeof S.capete): DesenCota => desenLiniar('orizontala', P(0, 0), P(100, 20), 15, { ...S, capete }) as DesenCota;
  const d = S2('deschisa');
  assert.equal(d.capete[0]?.fel === 'sageata' && d.capete[0].plina, false);
  egal(sag(d.capete[0])[1], 2.5, 25 + 2.5 / 6, 'aceeași săgeată, doar conturul');
  const o = S2('oblica').capete[0];
  assert.ok(o?.fel === 'bara');
  const k = 1.25 * Math.SQRT1_2;
  egal(o.bucata[0], -k, 25 - k, 'bara, jos-stânga');
  egal(o.bucata[1], k, 25 + k, 'bara, sus-dreapta');
  const pt = S2('punct').capete[1];
  assert.ok(pt?.fel === 'punct');
  egal(pt.centru, 100, 25, 'punctul, în picior');
  assert.equal(pt.raza, 0.625);
  assert.deepEqual(S2('fara').capete, []);
  const scurta = desenLiniar('orizontala', P(0, 0), P(4, 0), 10, { ...S, capete: 'oblica' }) as DesenCota;
  egal(scurta.linie[0], 0, 10, 'linia scurtă nu se prelungește');
  egal(scurta.linie[1], 4, 10, 'nici la capăt');
});

test('liniile de extensie ascunse; cifra în linie (linia întreruptă) și mereu orizontală', () => {
  assert.deepEqual((desenLiniar('orizontala', P(0, 0), P(100, 20), 15, { ...S, extensii: false }) as DesenCota).extensii, []);
  // În linie: „100” are 3 × 0,6 × 3,5 = 6,3 mm; golul 1,05 de fiecare parte, deci linia lipsește pe ±4,2 mm de la mijloc.
  const l = desenLiniar('orizontala', P(0, 0), P(100, 20), 15, { ...S, loc: 'in-linie' }, '100') as DesenCota;
  assert.equal(l.bucati.length, 2);
  egal(l.bucati[0]?.[0] ?? P(9, 9), 0, 25, 'prima bucată, de la');
  egal(l.bucati[0]?.[1] ?? P(9, 9), 45.8, 25, 'până la cifră');
  egal(l.bucati[1]?.[0] ?? P(9, 9), 54.2, 25, 'a doua, de după cifră');
  egal(l.bucati[1]?.[1] ?? P(9, 9), 100, 25, 'până la capăt');
  egal(l.text.p, 50, 25 - 1.75, 'cifra centrată pe linie');
  assert.equal(distantaLaDesen(l, '100', P(50, 25)), 0, 'pe cifră');
  // Mereu orizontală, pe o cotă verticală (linia la x = −2): cutia cifrei („50”, 4,2 mm) la stânga liniei, la 1,05 mm.
  const v = desenLiniar('verticala', P(0, 0), P(20, 50), 12, { ...S, loc: 'orizontala' }, '50') as DesenCota;
  assert.equal(v.text.unghi, 0);
  egal(v.text.p, -2 - 1.05 - 2.1, 25 - 1.75, 'cifra orizontală, la stânga liniei verticale');
  // Pe o orizontală, „mereu orizontală” e chiar „deasupra”.
  const h = desenLiniar('orizontala', P(0, 0), P(100, 20), 15, { ...S, loc: 'orizontala' }, '100') as DesenCota;
  egal(h.text.p, 50, 25 + 1.05, 'ca deasupra');
});

test('mereu orizontală, pe o aliniată trasă spre stânga sau în jos: cifra tot deasupra liniei, ori la stânga ei', () => {
  // De la (100, 0) la (0, 0): normala aliniatei e în jos, iar d = −10 pune linia la y = 10. Cifra („100”), deasupra ei.
  const s = desenLiniar('aliniata', P(100, 0), P(0, 0), -10, { ...S, loc: 'orizontala' }, '100') as DesenCota;
  egal(s.linie[0], 100, 10, 'linia, deasupra');
  egal(s.text.p, 50, 10 + 1.05, 'cifra deasupra liniei, nu sub ea');
  // De la (0, 50) la (0, 0): normala e spre dreapta, d = −2 pune linia la x = −2. Cifra („50”, 4,2 mm), la stânga ei.
  const v = desenLiniar('aliniata', P(0, 50), P(0, 0), -2, { ...S, loc: 'orizontala' }, '50') as DesenCota;
  egal(v.linie[0], -2, 50, 'linia, la stânga');
  egal(v.text.p, -2 - 1.05 - 2.1, 25 - 1.75, 'cifra la stânga liniei');
});
