/**
 * Claritatea editorului elicelor (ADR 0340, felia 3.Cm-4), în motor:
 * - fiecare câmp numeric al celor trei elice (elicea, elicea de barcă, ventilatorul), cerut în afara plajei, e adus la margine și
 *   spus: paletele și diametrul ca până acum, iar de acum și pasul, lățimea, înclinările, jocul și urechile (constatarea 5 a
 *   auditului: motorul le strângea în tăcere). Textul îl dă și `…Cote(d).avert`, din care editorul își ia mesajul;
 * - ce nu e număr (lipsă, gol, `null`, un cuvânt) ia implicitul, fără nimic de spus (la elice și la elicea de barcă, un câmp gol
 *   spunea „am făcut-o cu 3”: `+""` e 0);
 * - la margine, nimic de spus; plasele, aceleași ca la valoarea de la margine;
 * - sensul rotorului, pe plasă: la „dreapta”, ca la elice, muchia de sus e spre +θ (fraza din editor: privit dinspre partea de pe
 *   masă, „Dreapta” se rotește în sensul acelor de ceasornic și suflă aerul spre ea).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; avert: string[]; baza: number[] };
type Lego = {
  construieste(d: Record<string, unknown>): Piesa;
  eliceCote(d: Record<string, unknown>): { avert: string[] };
  eliceBarcaCote(d: Record<string, unknown>): { avert: string[] };
  ventilatorCote(d: Record<string, unknown>): { avert: string[]; Rt: number };
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const piesa = (tip: string, d: Record<string, unknown>) => L.construieste({ tip, ...d });

/** Câmpul, valoarea cerută și ce se spune (null: nimic). */
type Caz = [string, unknown, string | null];
const ELICE: Caz[] = [
  ['palete', 12, 'O elice are între 2 și 8 palete: am făcut-o cu 8.'],
  ['palete', 1, 'O elice are între 2 și 8 palete: am făcut-o cu 2.'],
  ['diametru', 250, 'Diametrul unei elice e între 20 și 200 mm: am făcut-o de 200 mm.'],
  ['diametru', 10, 'Diametrul unei elice e între 20 și 200 mm: am făcut-o de 20 mm.'],
  ['pas', 3, 'Pasul unei elice e între 0,3 și 1,5 × diametrul: am făcut-o cu 1,5.'],
  ['pas', 0.25, 'Pasul unei elice e între 0,3 și 1,5 × diametrul: am făcut-o cu 0,3.'],
  ['latime', 70, 'Lățimea paletei unei elice e între 15 și 60 % din rază: am făcut-o de 60 %.'],
  ['latime', 14.5, 'Lățimea paletei unei elice e între 15 și 60 % din rază: am făcut-o de 15 %.'],
  ['pas', 0.3, null], ['pas', 1.5, null], ['latime', 15, null], ['latime', 60, null], ['palete', 8, null], ['diametru', 20, null],
  ['palete', '', null], ['palete', null, null], ['diametru', '', null], ['pas', 'x', null], ['latime', undefined, null],
];
const BARCA: Caz[] = [
  ['palete', 8, 'O elice de barcă are între 3 și 5 palete: am făcut-o cu 5.'],
  ['diametru', 150, 'Diametrul unei elice de barcă e între 20 și 120 mm: am făcut-o de 120 mm.'],
  ['pas', 2, 'Pasul unei elice de barcă e între 0,5 și 1,6 × diametrul: am făcut-o cu 1,6.'],
  ['pas', 0.4, 'Pasul unei elice de barcă e între 0,5 și 1,6 × diametrul: am făcut-o cu 0,5.'],
  ['latime', 200, 'Lățimea paletei unei elice de barcă e între 40 și 150 % din rază: am făcut-o de 150 %.'],
  ['latime', 30, 'Lățimea paletei unei elice de barcă e între 40 și 150 % din rază: am făcut-o de 40 %.'],
  ['inclinare', 50, 'Înclinarea înapoi a unei elice de barcă e între 0 și 40°: am făcut-o de 40°.'],
  ['inclinare', -5, 'Înclinarea înapoi a unei elice de barcă e între 0 și 40°: am făcut-o de 0°.'],
  ['pupa', 20, 'Înclinarea spre pupa a unei elice de barcă e între 0 și 15°: am făcut-o de 15°.'],
  ['pupa', -1, 'Înclinarea spre pupa a unei elice de barcă e între 0 și 15°: am făcut-o de 0°.'],
  ['pas', 0.5, null], ['pas', 1.6, null], ['latime', 40, null], ['latime', 150, null], ['inclinare', 0, null], ['inclinare', 40, null],
  ['pupa', 0, null], ['pupa', 15, null], ['palete', '', null], ['diametru', null, null], ['inclinare', 'mult', null], ['pupa', '', null],
];
const VENTILATOR: Caz[] = [
  ['palete', 14, 'Un ventilator are între 3 și 12 palete: l-am făcut cu 12.'],
  ['diametru', 10, 'Carcasa unui ventilator are între 24 și 120 mm în interior: am făcut-o de 24 mm.'],
  ['joc', 5, 'Jocul de la vârful paletelor e între 0,3 și 2 mm: l-am făcut de 2 mm.'],
  ['joc', 0.1, 'Jocul de la vârful paletelor e între 0,3 și 2 mm: l-am făcut de 0,3 mm.'],
  ['pas', 2, 'Pasul unui ventilator e între 0,3 și 1,5 × diametrul: l-am făcut cu 1,5.'],
  ['pas', 0.2, 'Pasul unui ventilator e între 0,3 și 1,5 × diametrul: l-am făcut cu 0,3.'],
  ['latime', 80, 'Lățimea paletei unui ventilator e între 15 și 60 % din rază: l-am făcut de 60 %.'],
  ['latime', 10, 'Lățimea paletei unui ventilator e între 15 și 60 % din rază: l-am făcut de 15 %.'],
  ['urechi', 3, 'Carcasa unui ventilator are 2 sau 4 urechi: am făcut-o cu 2.'],
  ['joc', 0.3, null], ['joc', 2, null], ['pas', 0.3, null], ['pas', 1.5, null], ['latime', 15, null], ['latime', 60, null],
  ['urechi', 2, null], ['urechi', 4, null], ['urechi', 'x', null], ['joc', '', null], ['latime', 'lat', null],
];

function verifica(nume: string, tip: string, cote: (d: Record<string, unknown>) => { avert: string[] }, cazuri: readonly Caz[], extra: Record<string, unknown> = {}): void {
  for (const [camp, v, mesaj] of cazuri) {
    const d = { ...extra, [camp]: v }, asteptat = mesaj === null ? [] : [mesaj];
    assert.deepEqual(simplu(piesa(tip, d).avert), asteptat, `${nume}, ${camp} = ${String(v)}: în piesă`);
    assert.deepEqual(simplu(cote(d).avert), asteptat, `${nume}, ${camp} = ${String(v)}: în cote`);
  }
}

test('elicea: fiecare câmp din afara plajei e adus la margine și spus; la margine și fără număr, nimic', () => {
  verifica('elicea', 'elice', (d) => L.eliceCote(d), ELICE);
});
test('elicea de barcă: paletele, diametrul, pasul, lățimea și cele două înclinări, aduse la margine și spuse', () => {
  verifica('elicea de barcă', 'eliceBarca', (d) => L.eliceBarcaCote(d), BARCA);
});
test('ventilatorul: aceleași texte la rotor și la carcasă, pentru paletele, diametrul, jocul, pasul, lățimea și urechile', () => {
  verifica('rotorul', 'ventilator', (d) => L.ventilatorCote(d), VENTILATOR, { piesa: 'rotor' });
  verifica('carcasa', 'ventilator', (d) => L.ventilatorCote(d), VENTILATOR, { piesa: 'carcasa' });
});
test('mai multe câmpuri deodată: textele, în ordinea câmpurilor din editor', () => {
  assert.deepEqual(simplu(piesa('elice', { latime: 99, pas: 9, palete: 9 }).avert), [
    'O elice are între 2 și 8 palete: am făcut-o cu 8.',
    'Pasul unei elice e între 0,3 și 1,5 × diametrul: am făcut-o cu 1,5.',
    'Lățimea paletei unei elice e între 15 și 60 % din rază: am făcut-o de 60 %.',
  ]);
  assert.deepEqual(simplu(piesa('eliceBarca', { pupa: 99, inclinare: 99 }).avert), [
    'Înclinarea înapoi a unei elice de barcă e între 0 și 40°: am făcut-o de 40°.',
    'Înclinarea spre pupa a unei elice de barcă e între 0 și 15°: am făcut-o de 15°.',
  ]);
});
test('piesa făcută la margine e chiar piesa de la margine: plasa, aceeași', () => {
  assert.deepEqual(piesa('elice', { pas: 3, latime: 70 }).tri, piesa('elice', { pas: 1.5, latime: 60 }).tri);
  assert.deepEqual(piesa('eliceBarca', { pupa: 20, inclinare: 50 }).tri, piesa('eliceBarca', { pupa: 15, inclinare: 40 }).tri);
  assert.deepEqual(piesa('ventilator', { piesa: 'rotor', joc: 5 }).tri, piesa('ventilator', { piesa: 'rotor', joc: 2 }).tri);
  assert.deepEqual(piesa('ventilator', { piesa: 'carcasa', urechi: 3 }).tri, piesa('ventilator', { piesa: 'carcasa', urechi: 2 }).tri);
});

test('sensul rotorului, pe plasă: la „dreapta”, muchia de sus e spre +θ (ca la elice); la „stânga”, spre −θ', () => {
  for (const [sens, semn] of [['dreapta', 1], ['stanga', -1]] as const) {
    const p = piesa('ventilator', { piesa: 'rotor', gaura: 'nu', inel: 'nu', sens }), c = [-p.baza[0]!, -p.baza[1]!];
    const rr = 0.7 * L.ventilatorCote({}).Rt;
    // paleta 0 stă pe θ ≈ 0; vârfurile ei de lângă 70 % din raza vârfului, cu θ față de axa ei
    const v = p.tri.flat().map(([x, y, z]) => [Math.hypot(x - c[0]!, y - c[1]!), Math.atan2(y - c[1]!, x - c[0]!), z] as const)
      .filter(([r, th]) => Math.abs(r - rr) < 1 && Math.abs(th) < Math.PI / 7);
    const medie = (q: readonly (readonly [number, number, number])[]) => q.reduce((t, w) => t + w[2], 0) / q.length;
    const plus = medie(v.filter((q) => q[1] > 0)), minus = medie(v.filter((q) => q[1] < 0));
    assert.ok(semn * (plus - minus) > 1, `${sens}: muchia spre +θ la ${plus.toFixed(2)}, spre −θ la ${minus.toFixed(2)}`);
  }
});
