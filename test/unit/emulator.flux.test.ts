/**
 * Emulatorul GRBL sub încărcare (ADR 0079, felia 3.5a): 100 000 de linii scurte (unde o greșeală de un octet se adună) trec cu
 * 0 pierderi, cu bufferul plin până aproape de 128 și planificatorul plin; programele plăcilor 1 și 2 (exact octeții din fișele
 * lor, după SHA-256) se rejoacă fără nicio eroare și ajung unde spune textul lor. Martorii negativi arată că emulatorul nu e orb:
 * numărarea fără „+1” pierde octeți; o linie mai lungă decât bufferul blochează fluxul; una de peste 79 de caractere păstrate dă
 * error:11; numărarea în UTF-16 nu pierde octeți la GRBL 1.1 (octeții peste 0x7F se aruncă), dar diacriticele dintr-un comentariu
 * sunt override-uri: un program trebuie să fie ASCII.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { EmulatorGrbl } from '../emulator/grbl.ts';
import { ruleazaFlux } from '../emulator/flux.ts';

/** Zece linii cu deplasarea totală zero, de 1–11 octeți: goale, comentarii, mișcări modale fără G, cu spații. */
const MODEL = ['X.1', 'X-.1', 'G1X0.1', 'G1 X-0.100', '', '(a)', 'Y.05', 'Y-.05', 'G1Z.01', 'G1Z-.01'];
const linii = (n: number): string[] => ['G91', 'G1F500', ...Array.from({ length: n }, (_, k) => MODEL[k % MODEL.length] ?? '')];
const octeti = (l: readonly string[]): number => l.reduce((s, x) => s + new TextEncoder().encode(x).length + 1, 0);

test('100 000 de linii scurte: 0 pierderi, fiecare cu ok-ul ei, bufferul plin până aproape de 128, planificatorul plin, înapoi în origine', () => {
  const e = new EmulatorGrbl();
  const l = linii(100_000);
  const r = ruleazaFlux(l, e);
  assert.equal(r.blocat, false);
  assert.deepEqual(r.erori, []);
  assert.deepEqual(r.mesaje, []);
  assert.equal(r.ok, l.length);
  assert.equal(e.contoare.pierduti, 0);
  assert.equal(e.contoare.primiti, octeti(l), 'emulatorul a primit exact octeții trimiși');
  assert.equal(e.contoare.linii, l.length);
  assert.ok(e.contoare.varfRx >= 120 && e.contoare.varfRx <= 128, `vârful bufferului: ${e.contoare.varfRx}`);
  assert.equal(e.contoare.varfPlanificator, 15);
  for (const a of ['x', 'y', 'z'] as const) assert.ok(Math.abs(e.pozitie[a]) < 1e-6, `${a}: ${e.pozitie[a]}`);
  assert.equal(e.stare, 'Idle');
});

/** Ultima valoare a fiecărei axe din textul programului (G90, G54 fără decalaj: coordonatele mașinii). */
function ultima(text: string): { x: number; y: number; z: number } {
  const v = (l: string): number => {
    const m = [...text.matchAll(new RegExp(`${l}(-?\\d+(?:\\.\\d+)?)`, 'g'))].at(-1);
    return m ? Number(m[1]) : 0;
  };
  return { x: v('X'), y: v('Y'), z: v('Z') };
}

for (const [fisier, fisa] of [
  ['test/placi/placa-01/placa-01-A.nc', 'docs/etape/placa-01.md'],
  ['test/placi/placa-01/placa-01-B.nc', 'docs/etape/placa-01.md'],
  ['test/placi/placa-02/placa-02.nc', 'docs/etape/placa-02.md'],
] as const) {
  test(`rejucarea ${fisier.split('/').at(-1)}: octeții din fișa plăcii (SHA-256), fiecare linie ok, 0 pierderi, axul oprit, poziția din text`, () => {
    const bruti = readFileSync(fisier);
    const sha = createHash('sha256').update(bruti).digest('hex');
    assert.ok(readFileSync(fisa, 'utf8').includes(sha), `hash-ul ${sha} e în ${fisa}`);
    const text = bruti.toString('ascii');
    assert.ok(text.endsWith('\n') && !text.includes('\r'));
    const l = text.slice(0, -1).split('\n');
    const e = new EmulatorGrbl();
    // Pasul de 5 ms: programul ține minute întregi la 500 mm/min; fluxul tot nu lasă bufferul gol.
    const r = ruleazaFlux(l, e, { pasMs: 5 });
    assert.equal(r.blocat, false);
    assert.deepEqual(r.erori, []);
    assert.deepEqual(r.mesaje, ['[MSG:Pgm End]']);
    assert.equal(r.ok, l.length);
    assert.equal(e.contoare.pierduti, 0);
    assert.equal(e.contoare.primiti, bruti.length);
    assert.equal(e.ax, 0, 'axul oprit la sfârșit');
    const p = ultima(text);
    for (const a of ['x', 'y', 'z'] as const) assert.ok(Math.abs(e.pozitie[a] - p[a]) < 1e-9, `${a}: ${e.pozitie[a]} ≠ ${p[a]}`);
    // Cel puțin pauza de pornire a axului (G4 P3) și ceva mișcare.
    assert.ok(r.timp > 3000, `${r.timp} ms`);
  });
}

test('martor: numărarea fără „+1” (fără \\n) umple bufferul peste 128: emulatorul numără octeții pierduți', () => {
  const e = new EmulatorGrbl();
  const r = ruleazaFlux(linii(5_000), e, { numara: (l) => new TextEncoder().encode(l).length, timpMaxim: 60_000 });
  assert.ok(e.contoare.pierduti > 0, 'octeți pierduți');
  assert.ok(r.blocat || r.erori.length > 0 || r.ok < 5_002, 'fluxul nu mai iese curat');
});

test('martor: o linie mai lungă decât bufferul (128 de caractere + \\n) nu poate pleca niciodată: fluxul se blochează în fața ei', () => {
  const e = new EmulatorGrbl();
  const l = ['G90', `(${'x'.repeat(126)})`, 'G0X1'];
  const r = ruleazaFlux(l, e, { timpMaxim: 5_000 });
  assert.equal(r.blocat, true);
  assert.equal(r.ok, 1, 'doar linia dinaintea ei');
  assert.equal(e.contoare.primiti, 4);
});

test('martor: o linie de 100 de caractere păstrate încape în buffer, dar GRBL o refuză (error:11): senderul o refuză la încărcare', () => {
  const e = new EmulatorGrbl();
  const r = ruleazaFlux(['G90', `G0X${'1'.repeat(97)}`, 'G0X1'], e);
  assert.deepEqual(r.erori, [{ linie: 1, cod: 'error:11' }]);
  assert.equal(r.ok, 2);
});

test('martor: numărarea în UTF-16 nu pierde octeți la GRBL 1.1, dar „ț” din comentarii coboară override-ul axului până la 10 %', () => {
  const e = new EmulatorGrbl();
  const l = ['G90', ...Array.from({ length: 30 }, () => '(țintă)'), 'M3S10000'];
  const r = ruleazaFlux(l, e, { numara: (x) => x.length + 1 });
  assert.equal(e.contoare.pierduti, 0);
  assert.deepEqual(r.erori, []);
  assert.equal(e.override.ax, 10, '30 × (−10 %), cu podeaua de 10 %');
  assert.equal(e.contoare.aruncati, 30 * 3, 'C8 al lui „ț”, C4 83 ale lui „ă”');
});
