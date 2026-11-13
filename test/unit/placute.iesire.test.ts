/**
 * Textul care iese din plăcuță (ADR 0210 §4, răspunsul 5; felia 11.4↑c): plăcuța e conturul închis cel mai mare al piesei,
 * din afara textelor; o literă iese când trece de el cu mai mult decât toleranța proiectului (0,001 mm). Literele plăcuțelor
 * sunt aici forme alese pe hârtie (pătrate și dreptunghiuri), puse în grupul unui text adevărat al șablonului; rama, un
 * dreptunghi sau un cerc. Plus textele scrise cu fontul (un „I” și douăzeci de „W”), avertismentele și numele plăcuței.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { avertismente } from '../../src/model/avertismente.ts';
import { documentNou, type Document, type GrupNod, type Instanta, type Nod, type Piesa, type TextePlacuta } from '../../src/model/document.ts';
import { numePlacutei, placaPiesei, placuteCuTextIesit, textIese } from '../../src/model/placuteIesire.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { piesaText } from '../../src/text/piesaText.ts';
import { textePlacutei } from '../../src/text/placute.ts';

const r0 = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/roboto.ttf', import.meta.url))));
if (!r0.ok) throw new Error(r0.cod);
const font: Font = r0.font;
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

const P = (continut: string): ParametriText => ({ continut, inaltime: 10, spatiere: 0, interlinie: 1.2, aliniere: 'stanga' });
/** Grupul unui text adevărat „{nume}” (cu blocul lui valid), mutat în (x, y) pe plăcuță. */
function grupText(id: string, x: number, y: number, continut = '{nume}'): GrupNod {
  const r = piesaText(aseazaText(font, P(continut)), { ...P(continut), font: 'roboto' }, id);
  assert.ok(r.ok);
  const g = r.piesa.radacina;
  assert.ok(g.tip === 'grup');
  return { ...g, id, matrice: { ...ID, e: x, f: y } };
}
const dreptunghi = (id: string, x: number, y: number, latime: number, inaltime: number): Nod => ({
  tip: 'element', id, forma: { tip: 'dreptunghi', latime, inaltime, razaColt: 0 }, matrice: { ...ID, e: x, f: y },
});
const cerc = (id: string, x: number, y: number, raza: number): Nod => ({ tip: 'element', id, forma: { tip: 'cerc', raza }, matrice: { ...ID, e: x, f: y } });
/** Piesa: rădăcina cu copiii dați (rama, textul). */
const piesa = (copii: Nod[], id = 'p'): Piesa => ({ id, radacina: { tip: 'grup', id: 'rad', matrice: ID, copii }, operatii: [] });
/** Literele unei plăcuțe, în grupul `g`, în coordonatele grupului: forme alese pe hârtie. */
const litere = (g: string, ...copii: Nod[]): Record<string, TextePlacuta> => ({ [g]: { continut: 'x', copii, operatii: {} } });

test('rama dreptunghi 100 × 30: o literă lipită de latură rămâne, una care trece cu 0,002 mm iese, una cu 0,0005 mm (sub toleranță) nu', () => {
  // Textul stă în (0, 0) (grupul fără deplasare): literele de mai jos sunt chiar în coordonatele ramei.
  const p = piesa([dreptunghi('rama', 0, 0, 100, 30), grupText('t', 0, 0)]);
  const placa = placaPiesei(p);
  assert.ok(placa);
  assert.equal(placa.dreptunghi, true);
  assert.deepEqual(placa.cutie, { minX: 0, minY: 0, maxX: 100, maxY: 30 });
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 90, 10, 10, 10))), false, 'lipită de latura dreaptă (90…100)');
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 90.002, 10, 10, 10))), true, 'trece de latura dreaptă cu 0,002 mm');
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 90.0005, 10, 10, 10))), false, '0,0005 mm: sub toleranța proiectului');
  // Pe fiecare latură: stânga, jos, sus.
  assert.equal(textIese(p, litere('t', dreptunghi('l1', -1, 10, 10, 10))), true);
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 40, -1, 10, 10))), true);
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 40, 21, 10, 10))), true, 'sus: 21 + 10 = 31 > 30');
  // A doua literă iese, prima nu: plăcuța are textul ieșit.
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 10, 10, 5, 5), dreptunghi('l2', 98, 10, 5, 5))), true);
});

test('literele sunt în grupul textului: deplasarea grupului pe plăcuță se socotește', () => {
  // Grupul în (60, 5): o literă de 30 mm din x = 5 al grupului ajunge la 60 + 5 + 30 = 95 (înăuntru); din 15, la 105 (iese).
  const p = piesa([dreptunghi('rama', 0, 0, 100, 30), grupText('t', 60, 5)]);
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 5, 0, 30, 10))), false);
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 15, 0, 30, 10))), true);
});

test('rama cerc R 50 cu centrul în (50, 50): cutia literei în cutia cercului nu ajunge, se judecă punctele', () => {
  const p = piesa([cerc('rama', 50, 50, 50), grupText('t', 0, 0)]);
  const placa = placaPiesei(p);
  assert.ok(placa);
  assert.equal(placa.dreptunghi, false, 'un cerc nu e cutia lui');
  // Pătratul 10 × 10 din (5, 5): în cutia cercului, dar colțul (5, 5) e la √(45² + 45²) ≈ 63,6 mm de centru > 50.
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 5, 5, 10, 10))), true);
  // Dreptunghiul 5 × 10 din (40, 85): colțul cel mai depărtat, (40, 95), e la √(10² + 45²) ≈ 46,1 mm < 50.
  assert.equal(textIese(p, litere('t', dreptunghi('l1', 40, 85, 5, 10))), false);
  // Un cerc-literă R 5 cu centrul în (50, 93): ajunge la 98 > 100? Nu: 93 + 5 = 98 pe verticală, sub 100: înăuntru.
  assert.equal(textIese(p, litere('t', cerc('l1', 50, 93, 5))), false);
  // Cu centrul în (50, 96): ajunge la 101 > 100 (cutia lui iese din cutia cercului).
  assert.equal(textIese(p, litere('t', cerc('l1', 50, 96, 5))), true);
});

test('pe o ramă cerc, o literă care iese doar între vârfurile ei: arcul pe diagonală, curba între capete', () => {
  const p = piesa([cerc('rama', 50, 50, 50), grupText('t', 0, 0)]);
  // Cercul-literă R 5 în (82, 82): vârfurile lui (pe axe) sunt la √(37² + 32²) ≈ 48,9 mm de centru (înăuntru), dar mijlocul
  // arcului dintre ele, pe diagonală, (85,54; 85,54), e la ≈ 50,26 mm: iese cu 0,26 mm.
  assert.equal(textIese(p, litere('t', cerc('l1', 82, 82, 5))), true);
  // Același R 5 în (80, 80): mijlocul diagonal e la ≈ 47,4 mm: înăuntru.
  assert.equal(textIese(p, litere('t', cerc('l1', 80, 80, 5))), false);
  // O cale închisă (85, 50) → (50, 85) → (50, 50): vârfurile la 35 și 0 mm de centru; latura întâi e o curbă cu punctele de
  // control (110, 85) și (85, 110), al cărei mijloc, 0,125·A + 0,375·c1 + 0,375·c2 + 0,125·B = (90, 90), e la ≈ 56,6 mm.
  const curba: Nod = {
    tip: 'element', id: 'l1', matrice: ID,
    forma: { tip: 'cale', inchis: true, varfuri: [
      { p: { x: 85, y: 50 }, s: { tip: 'C', c1: { x: 110, y: 85 }, c2: { x: 85, y: 110 } } },
      { p: { x: 50, y: 85 }, s: { tip: 'L' } },
      { p: { x: 50, y: 50 }, s: { tip: 'L' } },
    ] },
  };
  assert.equal(textIese(p, litere('t', curba)), true);
});

test('plăcuța e conturul închis cel mai mare din afara textelor: o gaură mică nu e plăcuța, un alt text nici, o linie deschisă nici', () => {
  // Rama 100 × 30 și o gaură R 2 în (5, 5): plăcuța e rama.
  const cuGaura = piesa([dreptunghi('rama', 0, 0, 100, 30), cerc('gaura', 5, 5, 2), grupText('t', 0, 0)]);
  assert.deepEqual(placaPiesei(cuGaura)?.cutie, { minX: 0, minY: 0, maxX: 100, maxY: 30 });
  assert.equal(textIese(cuGaura, litere('t', dreptunghi('l1', 20, 10, 10, 10))), false, 'în afara găurii, în ramă');
  // Și cu gaura înaintea ramei în arbore (parcurgerea o întâlnește ultima): tot rama, cea mai mare.
  const gauraIntai = piesa([cerc('gaura', 5, 5, 2), dreptunghi('rama', 0, 0, 100, 30), grupText('t', 0, 0)]);
  assert.deepEqual(placaPiesei(gauraIntai)?.cutie, { minX: 0, minY: 0, maxX: 100, maxY: 30 });
  assert.equal(textIese(gauraIntai, litere('t', dreptunghi('l1', 20, 10, 10, 10))), false);
  // Fără ramă, doar textul cu câmp și un text fix („Masa”, alt bloc): n-are plăcuță, deci nimic nu iese, oricât de mare.
  const doarText = piesa([grupText('t', 0, 0), grupText('fix', 0, 50, 'Masa')]);
  assert.equal(placaPiesei(doarText), null);
  assert.equal(textIese(doarText, litere('t', dreptunghi('l1', -500, -500, 1000, 1000))), false);
  // O linie deschisă nu închide o plăcuță.
  const linie: Nod = { tip: 'element', id: 'linie', forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 100, y: 0 }, s: { tip: 'L' } }] }, matrice: ID };
  assert.equal(placaPiesei(piesa([linie, grupText('t', 0, 0)])), null);
  // Textul fix de pe ramă nu e măsurat (nu e al plăcuței) și nu e plăcuța: o ramă mică lângă el rămâne plăcuța.
  const cuFix = piesa([dreptunghi('rama', 0, 0, 100, 30), grupText('t', 0, 0), grupText('fix', 0, 200, 'MMMMMMMMMMMMMMMMMMMM')]);
  assert.deepEqual(placaPiesei(cuFix)?.cutie, { minX: 0, minY: 0, maxX: 100, maxY: 30 });
  assert.equal(textIese(cuFix, litere('t', dreptunghi('l1', 20, 10, 10, 10))), false);
});

test('cu fontul: „I” încape în rama 100 × 30, douăzeci de „W” (fiecare peste 5 mm lățime la 10 mm) nu', () => {
  const p = piesa([dreptunghi('rama', 0, 0, 100, 30), grupText('t', 5, 10)]);
  const scurt = textePlacutei(p, { nume: 'I' }, () => font);
  const lung = textePlacutei(p, { nume: 'W'.repeat(20) }, () => font);
  assert.ok(scurt.ok && lung.ok && scurt.texte && lung.texte);
  assert.equal(textIese(p, scurt.texte), false);
  assert.equal(textIese(p, lung.texte), true);
});

test('judecata e ținută pe obiecte: aceleași litere pe altă piesă (rama mai mică) se judecă din nou', () => {
  const t = litere('t', dreptunghi('l1', 60, 10, 10, 10));
  const mare = piesa([dreptunghi('rama', 0, 0, 100, 30), grupText('t', 0, 0)]);
  const mica = piesa([dreptunghi('rama', 0, 0, 50, 30), grupText('t', 0, 0)]);
  assert.equal(textIese(mare, t), false);
  assert.equal(textIese(mica, t), true);
  assert.equal(textIese(mare, t), false, 'rezultatul ținut al piesei mari rămâne al ei');
});

function docCu(p: Piesa, foi: ReadonlyArray<readonly Instanta[]>): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese: [p], foi: foi.map((instante, k) => ({ ...d.foi[0]!, id: `f${k + 1}`, instante: [...instante] })) };
}

test('avertismentele: doar plăcuțele foii cu textul ieșit, după cele ieșite din foaie; toate foile, fără foaie', () => {
  const p = piesa([dreptunghi('rama', 0, 0, 100, 30), grupText('t', 0, 0)]);
  const bine = litere('t', dreptunghi('l1', 10, 10, 10, 10));
  const iesit = litere('t', dreptunghi('l1', 95, 10, 10, 10));
  const d = docCu(p, [
    [{ id: 'a', piesa: 'p', x: 10, y: 10, rotire: 0, texte: bine }, { id: 'b', piesa: 'p', x: 10, y: 60, rotire: 0, texte: iesit }],
    [{ id: 'c', piesa: 'p', x: 10, y: 10, rotire: 0, texte: iesit }],
  ]);
  assert.deepEqual(avertismente(d, 0), [{ tip: 'text-iese-din-placuta', id: 'b', instanta: 'b' }]);
  assert.deepEqual(avertismente(d, 1), [{ tip: 'text-iese-din-placuta', id: 'c', instanta: 'c' }]);
  assert.deepEqual(placuteCuTextIesit(d).map((i) => i.id), ['b', 'c']);
  // O instanță fără litere (șablonul) nu e judecată.
  assert.deepEqual(placuteCuTextIesit(docCu(p, [[{ id: 'a', piesa: 'p', x: 10, y: 10, rotire: 0 }]])), []);
});

test('numele plăcuței: primul rând al textului ei, altfel numele piesei, altfel instanța', () => {
  const p: Piesa = { ...piesa([]), nume: 'Ecuson' };
  const i: Instanta = { id: 'a', piesa: 'p', x: 0, y: 0, rotire: 0 };
  assert.equal(numePlacutei({ ...i, texte: { t: { continut: '  Ana Popescu \nClasa a V-a', copii: [], operatii: {} } } }, p), 'Ana Popescu');
  assert.equal(numePlacutei({ ...i, texte: { t: { continut: '', copii: [], operatii: {} } } }, p), 'Ecuson');
  assert.equal(numePlacutei(i, undefined), 'a');
});
