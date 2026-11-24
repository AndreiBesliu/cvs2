import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caleArc, cifraCota, desenCota, desenRadial, desenUnghi, distantaLaDesen, distantaRadiala, formatImplicit, laturiUnghi, linieUnghiDinCursor, scrieCifra, scrieUnghi, STIL_IMPLICIT, textCota, type CapatDesen, type DesenCota, type FormatCifre } from '../../src/model/desenCota.ts';
import type { Cota } from '../../src/model/document.ts';
import { valoareCota } from '../../src/model/cote.ts';

/**
 * Raza, diametrul și unghiul (ADR 0330 §4, §6; felia 10.4↑b), pe hârtie: linia razei din centru, din afară sau după loc,
 * diametrul prin centru, arcul unghiului în sectorul ales de cursor, cu extensiile laturilor; cifrele în inch cu fracții, în
 * grade zecimale și în grade-minute-secunde; prefixele razei și diametrului.
 */
const P = (x: number, y: number): { x: number; y: number } => ({ x, y });
const egal = (a: { x: number; y: number } | undefined, x: number, y: number, unde: string, tol = 1e-9): void => {
  assert.ok(a && Math.abs(a.x - x) < tol && Math.abs(a.y - y) < tol, `${unde}: (${a?.x}, ${a?.y}), nu (${x}, ${y})`);
};
const aproape = (a: number, b: number, unde: string, tol = 1e-9): void => { assert.ok(Math.abs(a - b) < tol, `${unde}: ${a}, nu ${b}`); };
const S = STIL_IMPLICIT;
const sag = (c: CapatDesen | undefined): readonly [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }] => {
  assert.ok(c?.fel === 'sageata');
  return c.puncte;
};
/** Mijlocul bazei unei săgeți. */
const baza = (c: CapatDesen | undefined): { x: number; y: number } => {
  const [, b1, b2] = sag(c);
  return { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 };
};

// „R30”, „Ø50”, „90°”: trei semne, deci 3 × 0,6 × 3,5 = 6,3 mm; golul cifrei 0,3 × 3,5 = 1,05.
test('raza din centru (cifra înăuntru): linia c → p, săgeata cu vârful pe cerc, spre afară, cifra pe linie la r + d', () => {
  const r = desenRadial('raza', P(10, 20), P(40, 20), -10, S, 'R30') as DesenCota;
  assert.ok(r);
  egal(r.linie[0], 10, 20, 'linia pornește din centru');
  egal(r.linie[1], 40, 20, 'și se oprește pe cerc');
  assert.equal(r.capete.length, 1);
  egal(sag(r.capete[0])[0], 40, 20, 'vârful săgeții pe cerc');
  egal(baza(r.capete[0]), 37.5, 20, 'baza spre centru, la 2,5 mm');
  egal(r.text.p, 30, 21.05, 'cifra la r + d = 20 de centru, deasupra');
  assert.equal(r.text.unghi, 0);
  assert.deepEqual(r.extensii, []);
  assert.equal(r.arc, null);
  // Cifra nu trece de săgeată: la d = −1, centrul ei rămâne la r − capăt − gol − w/2 = 30 − 2,5 − 1,05 − 3,15 = 23,3.
  egal((desenRadial('raza', P(10, 20), P(40, 20), -1, S, 'R30') as DesenCota).text.p, 33.3, 21.05, 'cifra oprită înaintea săgeții');
  // Nici de centru: la d = −29, centrul ei la gol + w/2 = 4,2.
  egal((desenRadial('raza', P(10, 20), P(40, 20), -29, S, 'R30') as DesenCota).text.p, 14.2, 21.05, 'cifra oprită după centru');
});

test('raza din afară (cifra afară): linia de dincolo de cerc, săgeata cu vârful pe cerc, spre centru; cifra la cel puțin un capăt și un gol', () => {
  const r = desenRadial('raza', P(10, 20), P(40, 20), 10, S, 'R30') as DesenCota;
  egal(r.linie[0], 40, 20, 'linia pornește de pe cerc');
  egal(r.linie[1], 53.15, 20, 'și trece pe sub toată cifra: 30 + 10 + 3,15');
  egal(sag(r.capete[0])[0], 40, 20, 'vârful pe cerc');
  egal(baza(r.capete[0]), 42.5, 20, 'baza spre afară');
  egal(r.text.p, 50, 21.05, 'cifra la d = 10 dincolo de cerc');
  // Prea aproape de cerc: centrul cifrei la capăt + gol + w/2 = 6,7 de cerc.
  egal((desenRadial('raza', P(10, 20), P(40, 20), 1, S, 'R30') as DesenCota).text.p, 46.7, 21.05, 'cifra după săgeată');
  aproape(distantaRadiala(P(10, 20), P(40, 20), P(47, 23)), 7, 'locul cifrei din cursor: proiecția, față de cerc');
});

test('linia razei aleasă: din centru și cu cifra afară (linia trece de cerc), din afară și cu cifra înăuntru (tot afară)', () => {
  const c = desenRadial('raza', P(10, 20), P(40, 20), 10, { ...S, raza: 'centru' }, 'R30') as DesenCota;
  egal(c.linie[0], 10, 20, 'din centru');
  egal(c.linie[1], 53.15, 20, 'până după cifră');
  egal(baza(c.capete[0]), 37.5, 20, 'săgeata tot spre afară');
  egal(c.text.p, 50, 21.05, 'cifra afară');
  const a = desenRadial('raza', P(10, 20), P(40, 20), -10, { ...S, raza: 'afara' }, 'R30') as DesenCota;
  egal(a.linie[0], 40, 20, 'din afară');
  egal(baza(a.capete[0]), 42.5, 20, 'săgeata spre centru');
  egal(a.text.p, 46.7, 21.05, 'cifra dusă afară');
  assert.equal(desenRadial('raza', P(10, 20), P(10, 20), 5, S), null, 'punctul în centru: fără desen');
});

test('diametrul: linia prin centru, de la punctul opus la cel ales, două săgeți spre afară; cifra înăuntru sau pe prelungire', () => {
  const r = desenRadial('diametru', P(0, 0), P(0, 25), -25, S, 'Ø50') as DesenCota;
  egal(r.linie[0], 0, -25, 'de la punctul opus');
  egal(r.linie[1], 0, 25, 'la cel ales');
  assert.equal(r.capete.length, 2);
  egal(sag(r.capete[0])[0], 0, 25, 'vârful la punctul ales');
  egal(baza(r.capete[0]), 0, 22.5, 'baza spre centru');
  egal(sag(r.capete[1])[0], 0, -25, 'vârful la cel opus');
  egal(baza(r.capete[1]), 0, -22.5, 'baza spre centru');
  egal(r.text.p, -1.05, 0, 'cifra în centru, la stânga liniei verticale (deasupra, citită de jos în sus)');
  assert.equal(r.text.unghi, 90);
  const a = desenRadial('diametru', P(0, 0), P(0, 25), 8, S, 'Ø50') as DesenCota;
  egal(a.linie[0], 0, -25, 'tot prin centru');
  egal(a.linie[1], 0, 36.15, 'prelungită pe sub cifră: 25 + 8 + 3,15');
  egal(a.text.p, -1.05, 33, 'cifra la 8 dincolo de cerc');
  // Cifra înăuntru nu trece de săgeată: la d = −1, centrul ei la r − capăt − gol − w/2 = 25 − 2,5 − 1,05 − 3,15 = 18,3.
  egal((desenRadial('diametru', P(0, 0), P(0, 25), -1, S, 'Ø50') as DesenCota).text.p, -1.05, 18.3, 'cifra oprită înaintea săgeții');
  egal((desenRadial('diametru', P(0, 0), P(0, 25), -49, S, 'Ø50') as DesenCota).text.p, -1.05, -18.3, 'și înaintea celei opuse');
  // Linia razei nu schimbă diametrul.
  assert.deepEqual(desenRadial('diametru', P(0, 0), P(0, 25), 8, { ...S, raza: 'centru' }, 'Ø50'), a);
});

test('unghiul din trei puncte: vârful și laturile; sectorul ales de cursor (s1, s2), raza arcului = distanța cursorului', () => {
  const p = [P(0, 0), P(50, 0), P(0, 40)];
  const l = laturiUnghi(p);
  assert.ok(l);
  egal(l.v, 0, 0, 'vârful e primul punct');
  assert.deepEqual(linieUnghiDinCursor(p, P(10, 10)), { d: Math.hypot(10, 10), s1: 1, s2: 1 });
  assert.deepEqual(linieUnghiDinCursor(p, P(-10, 10)), { d: Math.hypot(10, 10), s1: -1, s2: 1 });
  assert.deepEqual(linieUnghiDinCursor(p, P(-10, -10)), { d: Math.hypot(10, 10), s1: -1, s2: -1 });
  assert.deepEqual(linieUnghiDinCursor(p, P(3, -4)), { d: 5, s1: 1, s2: -1 });
  assert.equal(linieUnghiDinCursor(p, P(0, 0)), null, 'cursorul în vârf');
  // Unghiul din fiecare sector: 90 în toate; cu laturile la 60°, 60 și 120.
  const c = (s1: number, s2: number): Cota => ({ id: 'c', fel: 'unghi', puncte: [], linie: { d: 20, s1, s2 } });
  const p60 = [P(0, 0), P(10, 0), P(5, 5 * Math.sqrt(3))];
  aproape(valoareCota(c(1, 1), p60) ?? 0, 60, 'sectorul dintre laturi');
  aproape(valoareCota(c(-1, 1), p60) ?? 0, 120, 'cu prima latură întoarsă');
  aproape(valoareCota(c(-1, -1), p60) ?? 0, 60, 'opus');
});

test('desenul unghiului drept: arcul de la 0° la 90° pe raza d, săgețile înăuntru pe coarda unui capăt, cifra în afara arcului', () => {
  const r = desenUnghi([P(0, 0), P(50, 0), P(0, 40)], 20, 1, 1, S, '90°') as DesenCota;
  assert.ok(r?.arc);
  egal(r.arc.centru, 0, 0, 'centrul arcului e vârful');
  assert.equal(r.arc.raza, 20);
  aproape(r.arc.de, 0, 'de la 0');
  aproape(r.arc.baleiaj, Math.PI / 2, 'un sfert de cerc');
  assert.deepEqual(r.arce, [r.arc], 'arcul întreg, cifra fiind deasupra');
  assert.deepEqual(r.extensii, [], 'laturile ajung la arc: fără extensii');
  egal(sag(r.capete[0])[0], 20, 0, 'vârful primei săgeți la capătul arcului');
  // Baza pe coarda de 2,5 mm spre punctul arcului de la unghiul 2,5 / 20 = 0,125.
  const q = P(20 * Math.cos(0.125), 20 * Math.sin(0.125));
  const b0 = baza(r.capete[0]);
  aproape(Math.hypot(b0.x - 20, b0.y), 2.5, 'baza la 2,5 mm de vârf');
  aproape((b0.x - 20) * (q.y - 0) - b0.y * (q.x - 20), 0, 'pe coarda spre arc', 1e-9);
  egal(sag(r.capete[1])[0], 0, 20, 'vârful celei de-a doua la celălalt capăt');
  // Cifra: tangenta la 45° e (−1, 1), citită la −45°; „sus”-ul ei e spre afară, deci baza la R + gol = 21,05 de vârf.
  aproape(r.text.unghi, -45, 'cifra citibilă, de-a lungul tangentei');
  egal(r.text.p, 21.05 * Math.SQRT1_2, 21.05 * Math.SQRT1_2, 'baza cifrei, la mijlocul arcului, în afară');
  // Arcul de la 180° la 270°: tangenta din mijloc (225°) se citește tot la −45°, dar „sus”-ul cifrei e acum spre vârf, deci
  // baza ei stă la R + gol + înălțime (24,55), ca toată cifra să fie în afara arcului.
  const j = desenUnghi([P(0, 0), P(-50, 0), P(0, -40)], 20, 1, 1, S, '90°') as DesenCota;
  aproape(j.arc?.de ?? 0, Math.PI, 'de la 180°');
  aproape(j.text.unghi, -45, 'citibilă');
  egal(j.text.p, -24.55 * Math.SQRT1_2, -24.55 * Math.SQRT1_2, 'baza cifrei, cu înălțimea ei mai departe');
});

test('unghiul cu o latură întoarsă: arcul în celălalt sector, extensia pe prelungirea laturii, de după vârf', () => {
  const r = desenUnghi([P(0, 0), P(50, 0), P(0, 40)], 20, -1, 1, S, '90°') as DesenCota;
  aproape(r.arc?.de ?? 0, Math.PI / 2, 'arcul pornește de la latura în sus');
  aproape(r.arc?.baleiaj ?? 0, Math.PI / 2, 'până la prelungirea spre stânga');
  assert.equal(r.extensii.length, 1);
  egal(r.extensii[0]?.[0], -1, 0, 'extensia de la golul de după vârf');
  egal(r.extensii[0]?.[1], -22, 0, 'până la depășirea de după arc');
});

test('unghiul din două laturi: vârful la încrucișarea dreptelor; extensiile până la arc sau de la arc la latură', () => {
  // Latura 1 de la (0, 0) la (10, 0); latura 2 de la (20, 5) la (20, 30): dreptele se taie în (20, 0).
  const p = [P(0, 0), P(10, 0), P(20, 5), P(20, 30)];
  egal(laturiUnghi(p)?.v, 20, 0, 'vârful');
  // Sectorul (+e1, +e2): latura 1 rămâne în urma vârfului (proiecțiile −20 și −10), latura 2 începe la 5 de el.
  const r = desenUnghi(p, 3, 1, 1, S) as DesenCota;
  assert.equal(r.extensii.length, 2);
  egal(r.extensii[0]?.[0], 21, 0, 'pe semidreapta laturii 1, de la golul de după vârf');
  egal(r.extensii[0]?.[1], 25, 0, 'până la depășirea de după arc');
  egal(r.extensii[1]?.[0], 20, 1, 'pe latura 2: de la arc (3 − 2)');
  egal(r.extensii[1]?.[1], 20, 4, 'până la golul dinaintea laturii (5 − 1)');
  // Cu latura 1 întoarsă (spre ea): ea începe la 10 de vârf, deci extensia de la 3 − 2 la 10 − 1.
  const q = desenUnghi(p, 3, -1, 1, S) as DesenCota;
  egal(q.extensii[0]?.[0], 19, 0, 'de la arc');
  egal(q.extensii[0]?.[1], 11, 0, 'până înaintea laturii');
  const c: Cota = { id: 'c', fel: 'unghi', puncte: [], linie: { d: 3, s1: 1, s2: 1 } };
  aproape(valoareCota(c, p) ?? 0, 90, 'valoarea, din aceleași laturi');
  assert.equal(laturiUnghi([P(0, 0), P(10, 0), P(0, 5), P(10, 5)]), null, 'laturi paralele: fără vârf');
  assert.equal(desenUnghi([P(0, 0), P(10, 0), P(0, 5), P(10, 5)], 3, 1, 1, S), null);
  assert.equal(linieUnghiDinCursor([P(0, 0), P(10, 0), P(0, 5), P(10, 5)], P(3, 3)), null);
  assert.equal(desenUnghi([P(0, 0), P(0, 0), P(0, 5)], 3, 1, 1, S), null, 'o latură de lungime zero');
  assert.equal(desenUnghi([P(0, 0), P(10, 0), P(0, 5)], 0, 1, 1, S), null, 'raza arcului zero');
});

test('unghiul cu arcul scurt: săgețile în afară, arcul prelungit cu câte două capete; cifra în linie (arcul întrerupt) și orizontală', () => {
  // 60° pe raza 4: arcul are 4,19 mm, sub două capete (5 mm); dt = 2,5 / 4 = 0,625.
  const r = desenUnghi([P(0, 0), P(10, 0), P(5, 5 * Math.sqrt(3))], 4, 1, 1, S) as DesenCota;
  aproape(r.arc?.baleiaj ?? 0, Math.PI / 3, 'arcul măsurat rămâne 60°');
  aproape(r.arce[0]?.de ?? 0, -1.25, 'cel desenat, prelungit cu 2 × 0,625');
  aproape(r.arce[0]?.baleiaj ?? 0, Math.PI / 3 + 2.5, 'la ambele capete');
  egal(sag(r.capete[0])[0], 4, 0, 'vârful tot la capătul arcului');
  const b = baza(r.capete[0]);
  assert.ok(b.y < 0, 'baza în afara arcului (sub latura de la 0°)');
  // În linie: „90°” (6,3 mm) pe raza 20: arcul lipsește pe (3,15 + 1,05) / 20 = 0,21 rad de o parte și de alta a mijlocului.
  const l = desenUnghi([P(0, 0), P(50, 0), P(0, 40)], 20, 1, 1, { ...S, loc: 'in-linie' }, '90°') as DesenCota;
  assert.equal(l.arce.length, 2);
  aproape(l.arce[0]?.baleiaj ?? 0, Math.PI / 4 - 0.21, 'prima bucată, până la cifră');
  aproape(l.arce[1]?.de ?? 0, Math.PI / 4 + 0.21, 'a doua, de după ea');
  aproape((l.arce[1]?.de ?? 0) + (l.arce[1]?.baleiaj ?? 0), Math.PI / 2, 'până la capăt');
  const o = desenUnghi([P(0, 0), P(50, 0), P(0, 40)], 20, 1, 1, { ...S, loc: 'orizontala' }, '90°') as DesenCota;
  assert.equal(o.text.unghi, 0);
  // Cutia cifrei (6,3 × 3,5), afară, pe bisectoare: ext = √½ × (3,15 + 1,75); centrul la 20 + 1,05 + ext de vârf.
  const k = (20 + 1.05 + Math.SQRT1_2 * 4.9) * Math.SQRT1_2;
  egal(o.text.p, k, k - 1.75, 'baza cifrei orizontale');
});

test('alegerea pe arcul unghiului: distanța la arc (nu la coardă), la capetele lui în afara sectorului', () => {
  const r = desenUnghi([P(0, 0), P(50, 0), P(0, 40)], 20, 1, 1, S, '90°') as DesenCota;
  const t = Math.PI / 8;
  aproape(distantaLaDesen(r, '90°', P(21 * Math.cos(t), 21 * Math.sin(t))), 1, 'la 1 mm în afara arcului');
  aproape(distantaLaDesen(r, '90°', P(10, 10)), 20 - Math.hypot(10, 10), 'înăuntru, pe coarda capetelor nu prinde');
  aproape(distantaLaDesen(r, '90°', P(20, -5)), 5, 'sub capătul de la 0°');
});

test('desenul oricărei cote, după fel: liniar, rază, diametru, unghi; un fel necunoscut sau fără puncte n-are desen', () => {
  const pr = [P(10, 20), P(40, 20)];
  assert.deepEqual(desenCota({ id: 'c', fel: 'raza', linie: { d: -10 } }, pr, S, 'R30'), desenRadial('raza', P(10, 20), P(40, 20), -10, S, 'R30'));
  assert.deepEqual(desenCota({ id: 'c', fel: 'diametru', linie: { d: 4 } }, pr, S), desenRadial('diametru', P(10, 20), P(40, 20), 4, S));
  const pu = [P(0, 0), P(50, 0), P(0, 40)];
  assert.deepEqual(desenCota({ id: 'c', fel: 'unghi', linie: { d: 20, s1: -1 } }, pu, S), desenUnghi(pu, 20, -1, 1, S));
  const p4 = [P(0, 0), P(10, 0), P(20, 5), P(20, 30)];
  const u4 = desenCota({ id: 'c', fel: 'unghi', linie: { d: 3, s2: -1 } }, p4, S);
  assert.ok(u4);
  assert.deepEqual(u4, desenUnghi(p4, 3, 1, -1, S), 'și din două laturi (patru puncte)');
  assert.equal(desenCota({ id: 'c', fel: 'cota-3d', linie: { d: 1 } }, pr, S), null);
  assert.equal(desenCota({ id: 'c', fel: 'raza', linie: { d: 1 } }, [P(0, 0)], S), null);
  assert.equal(desenCota({ id: 'c', fel: 'raza' }, pr, S), null, 'fără linie');
  assert.equal(desenCota({ id: 'c', fel: 'raza', linie: { d: 1 } }, pu, S), null, 'trei puncte la rază');
});

const F: FormatCifre = { ...formatImplicit(true), zecimale: 2 };

test('inch în fracții: întregul și fracția simplificată, rotunjite la cel mult 1/numitor; semnul, zero, unitatea', () => {
  const fr = (inch: number, fractie = 16, cuUnitate = false): string => scrieCifra(inch * 25.4, { ...F, unitate: 'fractii', fractie, cuUnitate });
  assert.equal(fr(1.5), '1 1/2');
  assert.equal(fr(0.375), '3/8');
  assert.equal(fr(2), '2');
  assert.equal(fr(1 + 1 / 64), '1', 'la 1/16, 1 1/64 se rotunjește la 1');
  assert.equal(fr(1 + 1 / 64, 64), '1 1/64');
  assert.equal(fr(2.999), '3', 'aproape de întreg');
  assert.equal(fr(0), '0');
  assert.equal(fr(-0.5), '-1/2');
  assert.equal(fr(1 / 128), '0', 'sub jumătate de 1/16: zero');
  assert.equal(fr(-1 / 128), '0', 'și negativ, fără „-0”');
  assert.equal(fr(1.5, 16, true), '1 1/2 in');
  assert.equal(fr(0.3, 2), '1/2', 'la 1/2: 0,3 → 1/2');
  // Zecimalele, zerourile, pasul și separatorul nu țin de fracții.
  assert.equal(scrieCifra(1.5 * 25.4, { ...F, unitate: 'fractii', fractie: 8, zerouri: 'pastrate', pas: 0.25, virgula: true }), '1 1/2');
});

test('unghiul: grade zecimale (zecimalele, zerourile, separatorul) sau grade-minute-secunde (zecimalele secundelor)', () => {
  assert.equal(scrieUnghi(30.5, F), '30,5°');
  assert.equal(scrieUnghi(90, F), '90°');
  assert.equal(scrieUnghi(30.5, { ...F, zerouri: 'pastrate' }), '30,50°');
  assert.equal(scrieUnghi(30.456, { ...F, virgula: false }), '30.46°');
  assert.equal(scrieUnghi(30.456, { ...F, zecimaleUnghi: 0 }), '30°');
  assert.equal(scrieUnghi(30.5, { ...F, unghi: 'gms' }), '30°30′0″');
  assert.equal(scrieUnghi(30 + 15 / 60 + 9 / 3600, { ...F, unghi: 'gms', zecimaleUnghi: 0 }), '30°15′9″');
  assert.equal(scrieUnghi(59.99999, { ...F, unghi: 'gms', zecimaleUnghi: 0 }), '60°0′0″', 'rotunjirea nu dă „60″”');
  assert.equal(scrieUnghi(10 + 7 / 60 + 40 / 3600, { ...F, unghi: 'gms', zecimaleUnghi: 0 }), '10°7′40″', 'minutele se taie, nu se rotunjesc');
  // 10,123456° = 36 444,4416″ → 10°7′24,44″.
  assert.equal(scrieUnghi(10.123456, { ...F, unghi: 'gms' }), '10°7′24,44″');
  assert.equal(scrieUnghi(10.123456, { ...F, unghi: 'gms', zerouri: 'pastrate', zecimaleUnghi: 4 }), '10°7′24,4416″');
});

test('cifra după fel: raza și diametrul cu prefixele lor (și golite), unghiul în grade; `<>` cuprinde prefixul', () => {
  assert.equal(cifraCota('raza', 25, F), 'R25');
  assert.equal(cifraCota('diametru', 50, F), 'Ø50');
  assert.equal(cifraCota('raza', 25, { ...F, prefixR: '' }), '25');
  assert.equal(cifraCota('diametru', 50, { ...F, prefixD: 'D=' }), 'D=50');
  assert.equal(cifraCota('unghi', 90, F), '90°');
  assert.equal(cifraCota('aliniata', 120.5, F), '120,5');
  assert.equal(cifraCota('raza', 25.4, { ...F, unitate: 'fractii' }), 'R1');
  assert.equal(textCota({ id: 'c', fel: 'diametru', text: '4× <>' }, cifraCota('diametru', 10, F)), '4× Ø10');
});

test('calea SVG a arcului, pe ecranul cu Y în jos: sensul trigonometric al foii e sweep-flag 0; arcul mare are large-arc 1', () => {
  const sx = (x: number): number => 100 + 2 * x, sy = (y: number): number => 100 - 2 * y;
  assert.equal(caleArc({ centru: P(0, 0), raza: 10, de: 0, baleiaj: Math.PI / 2 }, sx, sy, 2), 'M120 100 A20 20 0 0 0 100 80');
  assert.match(caleArc({ centru: P(0, 0), raza: 10, de: 0, baleiaj: 1.5 * Math.PI }, sx, sy, 2), /^M120 100 A20 20 0 1 0 /);
});
