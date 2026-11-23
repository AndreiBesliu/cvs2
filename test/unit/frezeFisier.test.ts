/**
 * Fișierul bibliotecii de freze (ADR 0300 §8, felia 16.A↑a): JSON-ul propriu, dus-întors (fără id, versiune și dată, cu
 * câmpurile necunoscute păstrate), și CSV-ul cu coloanele din manual (separatorul `;` cu virgula zecimală sau `,` cu punctul,
 * ghilimelele, BOM-ul, Windows-1250, coloanele lipsă cu valorile implicite); refuzurile, cu motivul.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteFisierFreze, COLOANE_CSV, FORMAT_FREZE, textFisierFreze } from '../../src/io/frezeFisier.ts';
import { MARGINI_FREZA, type Freza, type FrezaSalvata } from '../../src/model/freza.ts';

const PLATA6: Freza = {
  nume: 'Plată Ø6', fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2,
  turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40,
};
const GRAVARE: Freza = { ...PLATA6, nume: 'Gravare 30°', fel: 'gravare', diametru: 3.175, unghi: 30, varf: 0.2, numar: 5, pas: 1, tais: undefined };

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

test('JSON-ul: dus-întors, fără id, versiune și dată, cu câmpurile necunoscute; formatul și versiunea scrise', () => {
  const lista: FrezaSalvata[] = [
    { ...PLATA6, id: 'a', rev: 3, schimbatLa: 5 },
    { ...GRAVARE, id: 'b', rev: 1, schimbatLa: 6, regimuriPeMaterial: [{ material: 'MDF', avans: 1500 }] },
  ];
  const text = textFisierFreze(lista);
  const x = JSON.parse(text) as Record<string, unknown>;
  assert.equal(x['format'], FORMAT_FREZE);
  assert.equal(x['v'], 1);
  assert.ok(!text.includes('"rev"') && !text.includes('"schimbatLa"') && !text.includes('"id"'));
  const r = citesteFisierFreze(enc(text));
  assert.ok(r.ok);
  assert.equal(r.fel, 'json');
  assert.equal(r.sarite, 0);
  const { tais: _t, ...gravareFaraTais } = GRAVARE;
  void _t;
  assert.deepEqual(r.freze, [PLATA6, { ...gravareFaraTais, regimuriPeMaterial: [{ material: 'MDF', avans: 1500 }] }]);
});

test('JSON-ul: refuzurile (gol, stricat, alt format, versiune nouă, prea multe) și frezele greșite sărite', () => {
  assert.deepEqual(citesteFisierFreze(enc('   ')), { ok: false, motiv: 'gol' });
  assert.deepEqual(citesteFisierFreze(enc('{ "format": ')), { ok: false, motiv: 'json' });
  assert.deepEqual(citesteFisierFreze(enc('{"format":"altceva","v":1,"freze":[]}')), { ok: false, motiv: 'format' });
  assert.deepEqual(citesteFisierFreze(enc(`{"format":"${FORMAT_FREZE}","v":2,"freze":[]}`)), { ok: false, motiv: 'versiune' });
  assert.deepEqual(citesteFisierFreze(enc(`{"format":"${FORMAT_FREZE}","v":1,"freze":{}}`)), { ok: false, motiv: 'format' });
  const multe = Array.from({ length: MARGINI_FREZA.freze + 1 }, (_, i) => ({ ...PLATA6, nume: `F${i}` }));
  assert.deepEqual(citesteFisierFreze(enc(JSON.stringify({ format: FORMAT_FREZE, v: 1, freze: multe }))), { ok: false, motiv: 'prea-multe' });
  const r = citesteFisierFreze(enc(JSON.stringify({ format: FORMAT_FREZE, v: 1, freze: [PLATA6, { ...PLATA6, diametru: 0 }, 3, { ...PLATA6, fel: 'bila' }] })));
  assert.ok(r.ok);
  assert.deepEqual(r.freze, [PLATA6]);
  assert.equal(r.sarite, 3);
  assert.deepEqual(citesteFisierFreze(new Uint8Array(5_000_001)), { ok: false, motiv: 'prea-mare' });
});

test('CSV-ul cu `;` și virgula zecimală (Excel în română), cu BOM și ghilimele', () => {
  const csv = '﻿nume;fel;diametru;unghi;varf;numar;turatie;avans;plonjare;pas;pas_lateral;tais;taisuri;nota\r\n'
    + 'Plată Ø6;plata;6;;;2;18000;1000;300;3;40;22;2;\r\n'
    + 'Gravare 30°;gravare;3,175;30;0,2;5;18000;1000;300;1;40;;;"cod 30-02; vârf 0,2"\r\n';
  const r = citesteFisierFreze(enc(csv));
  assert.ok(r.ok);
  assert.equal(r.fel, 'csv');
  assert.deepEqual(r.freze, [PLATA6, { ...GRAVARE, tais: undefined, taisuri: undefined, nota: 'cod 30-02; vârf 0,2' }].map(farăNedefinite));
  assert.equal(r.sarite, 0);
});

test('CSV-ul cu `,` și punctul zecimal; coloanele în altă ordine, cu majuscule; valorile lipsă din valorile implicite', () => {
  const csv = 'Fel,Nume,Diametru,Unghi\nv,V90 Ø12,12,90\nflat,Plată Ø3.175,3.175,\n';
  const r = citesteFisierFreze(enc(csv));
  assert.ok(r.ok);
  // Implicitele (ADR 0300 §8, manualul): T 1, 18 000 rot/min, 1 000 și 300 mm/min, pasul lateral 40 %, pasul cât raza (plata)
  // sau 1 mm (V și gravarea).
  assert.deepEqual(r.freze, [
    { nume: 'V90 Ø12', fel: 'v', diametru: 12, unghi: 90, numar: 1, turatie: 18000, avans: 1000, plonjare: 300, pas: 1, pasLateral: 40 },
    { nume: 'Plată Ø3.175', fel: 'plata', diametru: 3.175, numar: 1, turatie: 18000, avans: 1000, plonjare: 300, pas: 1.5875, pasLateral: 40 },
  ]);
});

test('CSV-ul: o coloană necesară lipsă (nume, fel, diametru) e refuzul; un rând greșit se sare; Windows-1250', () => {
  assert.deepEqual(citesteFisierFreze(enc('nume;diametru\nA;6\n')), { ok: false, motiv: 'coloane' });
  assert.deepEqual(citesteFisierFreze(enc('nume;fel;diametru\n')), { ok: true, fel: 'csv', freze: [], sarite: 0 });
  const r = citesteFisierFreze(enc('nume;fel;diametru\nA;plata;6\nB;bila;6\nC;plata;abc\nD;plata;6;extra\n'));
  assert.ok(r.ok);
  assert.deepEqual(r.freze.map((f) => f.nume), ['A', 'D']);
  assert.equal(r.sarite, 2);
  // „Plată” în Windows-1250: ă = 0xE3.
  const w = Uint8Array.from([...enc('nume;fel;diametru\nPlat'), 0xe3, ...enc(';plata;6\n')]);
  const rw = citesteFisierFreze(w);
  assert.ok(rw.ok);
  assert.equal(rw.freze[0]?.nume, 'Plată');
});

test('coloanele CSV, în ordinea din manual', () => {
  assert.deepEqual(COLOANE_CSV, ['nume', 'fel', 'diametru', 'unghi', 'varf', 'numar', 'turatie', 'avans', 'plonjare', 'pas', 'pas_lateral', 'tais', 'taisuri', 'nota']);
});

function farăNedefinite(f: Freza): Freza {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as Freza;
}
