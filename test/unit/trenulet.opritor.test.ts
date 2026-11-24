/**
 * Axul cu opritor și știftul cu bucșă din atelierul Easy 3Draw (ADR 0284, felia 3.Cb), pe plasele reale ale motorului:
 * - **axul cu opritor:** axul în cruce de azi, cu un disc la un capăt (Ø gulerului știftului, gros de 1 mm, tăiat de
 *   masă), în lungimea axului: discul se sprijină pe fața grinzii și axul nu mai trece prin gaură; fără opritor, axul e
 *   cel de până acum, triunghi cu triunghi;
 * - **știftul cu bucșă:** capătul scurt al știftului e o bucșă plină (Ø 7,2, tăiată de masă), lungă de un pas, fără guler
 *   și fără fantă; partea de știft rămâne cum era;
 * - un punct e judecat „în lemn” sau „în gol” după numărul de înfășurare al plasei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, dinMotor, amprentaPlasei, type Piesa } from './ajutor-plasa-lego.ts';

const P = L.parametri();
const S = P.pas!, AX = P.ax_d!, AXL = P.ax_lat!, RGUL = P.guler_d! / 2, GL = P.guler_lat!, RS = P.stift_technic_d! / 2, RB = P.bucsa_d! / 2;
/** Pe hârtie: opritorul e gros de 1 mm; știftul stă culcat pe o față teșită de 0,35 mm. */
const OPRITOR = 1, TESIT = 0.35, AX0 = RS - TESIT;
const inchisa = (p: Piesa, ce: string) => { const m = plasa(p.tri); assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`); };
const r3 = (x: number) => Math.round(x * 1000) / 1000;

test('axul fără opritor e cel de până acum; cu opritor, are aceeași lungime și un disc la capăt', () => {
  for (const lung of [2, 3, 4, 8, 12]) {
    const simplu = L.construieste({ tip: 'ax', lung }), cu = L.construieste({ tip: 'ax', lung, opritor: true }), Lx = S * lung - 0.2;
    assert.deepEqual(cote(simplu), [r3(Lx), AX, AX], `axul ${lung}`);
    assert.equal(amprentaPlasei(L.construieste({ tip: 'ax', lung, opritor: false })), amprentaPlasei(simplu), `axul ${lung}: fără opritor, aceeași plasă`);
    assert.equal(simplu.avert.length, 0);
    // cu opritor: lungimea rămâne; lățimea e a discului; înălțimea, de la masă până în vârful discului
    assert.deepEqual(cote(cu), [r3(Lx), r3(2 * RGUL), r3(AX / 2 + RGUL)], `axul ${lung} cu opritor`);
    assert.equal(cu.avert.length, 0);
    inchisa(cu, `axul ${lung} cu opritor`);
    inchisa(simplu, `axul ${lung}`);
  }
  assert.deepEqual(cote(L.construieste({ tip: 'ax', lung: 4, opritor: true })), [31.8, 6, 5.375]);
});

test('opritorul: un disc rotund pe axa axului, gros de 1 mm, doar la capăt, tăiat de masă', () => {
  for (const lung of [2, 4, 9]) {
    const p = L.construieste({ tip: 'ax', lung, opritor: true }), Lx = S * lung - 0.2;
    // în coordonatele motorului: axa axului e la (y, z) = (AX / 2, AX / 2), iar masa e la z = 0
    const la = (x: number, raza: number, grade: number) => plin(p, dinMotor(p, [x, AX / 2 + raza * Math.cos(grade * Math.PI / 180), AX / 2 + raza * Math.sin(grade * Math.PI / 180)]));
    for (const g of [20, 45, 70, 110, 135, 160, 200, 340]) {
      // pe diagonale (între brațele crucii), lemnul e doar în disc
      assert.equal(la(Lx - OPRITOR / 2, RGUL - 0.15, g), true, `axul ${lung}, ${g}°: în disc`);
      assert.equal(la(Lx - OPRITOR / 2, RGUL + 0.15, g), false, `axul ${lung}, ${g}°: dincolo de disc`);
      assert.equal(la(Lx - OPRITOR - 0.15, RGUL - 0.15, g), false, `axul ${lung}, ${g}°: înaintea discului`);
      assert.equal(la(Lx - OPRITOR + 0.15, RGUL - 0.15, g), true, `axul ${lung}, ${g}°: începutul discului`);
      assert.equal(la(0.3, RGUL - 0.15, g), false, `axul ${lung}, ${g}°: capătul fără opritor`);
    }
    // discul e tăiat de masă: sub axă, lemnul se oprește la masă, nu la raza discului
    assert.equal(plin(p, dinMotor(p, [Lx - OPRITOR / 2, AX / 2, 0.1])), true, `axul ${lung}: discul, deasupra mesei`);
    assert.equal(plin(p, dinMotor(p, [Lx - OPRITOR / 2, AX / 2, -0.1])), false, `axul ${lung}: sub masă`);
    assert.equal(r3(p.baza[2]!), 0, `axul ${lung}: nimic sub masă`);
    // crucea axului rămâne cum era, până la disc
    for (const x of [0.3, Lx / 2, Lx - OPRITOR - 0.3]) {
      assert.equal(la(x, AX / 2 - 0.15, 0), true, `axul ${lung}, x ${x}: brațul crucii`);
      assert.equal(la(x, AX / 2 - 0.15, 90), true, `axul ${lung}, x ${x}: brațul de sus`);
      assert.equal(la(x, AXL / 2 + 0.5, 45), false, `axul ${lung}, x ${x}: între brațe`);
      assert.equal(la(x, AX / 2 + 0.15, 0), false, `axul ${lung}, x ${x}: dincolo de braț`);
    }
  }
});

test('știftul cu bucșă: capătul scurt e o bucșă plină de un pas; partea de știft rămâne cum era', () => {
  for (const lung of [2, 3]) for (const fanta of [true, false]) {
    const p = L.construieste({ tip: 'stiftTechnic', lung, capat: 'bucsa', fanta }), Lx = lung * S - 0.2, x0 = lung === 2 ? Lx / 2 : Lx - (S - 0.1);
    const ce = `știftul ${lung}${fanta ? '' : ', fără fantă'}`;
    inchisa(p, ce);
    assert.equal(p.avert.length, 0, ce);
    // cutia: lungimea știftului, lățimea bucșei, înălțimea de la masă (fața teșită) până în vârful bucșei
    assert.deepEqual(cote(p), [r3(Lx), r3(2 * RB), r3(AX0 + RB)], ce);
    // în coordonatele motorului: axa e la y = 0, z = AX0; masa, la z = 0
    const la = (x: number, raza: number, grade: number) => plin(p, dinMotor(p, [x, raza * Math.cos(grade * Math.PI / 180), AX0 + raza * Math.sin(grade * Math.PI / 180)]));
    for (const g of [0, 45, 90, 135, 180]) {
      // bucșa: de la gulerul de altădată până la capăt
      for (const x of [x0 + 0.2, (x0 + Lx) / 2, Lx - 0.2]) {
        assert.equal(la(x, RB - 0.15, g), true, `${ce}, x ${x.toFixed(1)}, ${g}°: în bucșă`);
        assert.equal(la(x, RB + 0.15, g), false, `${ce}, x ${x.toFixed(1)}, ${g}°: dincolo de bucșă`);
      }
      // partea de știft: raza știftului, fără guler (bucșa ține locul lui)
      for (const x of [6, x0 - 0.2, x0 - GL / 2 - 0.1]) {
        if (x >= x0) continue;
        assert.equal(la(x, RS + 0.15, g), false, `${ce}, x ${x.toFixed(1)}, ${g}°: lângă știft, fără guler`);
        if (g === 90) assert.equal(la(x, RS - 0.15, g), true, `${ce}, x ${x.toFixed(1)}: în știft`);
      }
    }
    // bucșa e plină și fără fantă; e tăiată de masă
    assert.equal(la(Lx - 1, 0, 0), true, `${ce}: axa bucșei`);
    assert.equal(la(Lx - 1, 1, 90), true, `${ce}: deasupra axei bucșei`);
    assert.equal(plin(p, dinMotor(p, [Lx - 1, 0, 0.1])), true, `${ce}: bucșa, deasupra mesei`);
    assert.equal(plin(p, dinMotor(p, [Lx - 1, 0, -0.1])), false, `${ce}: sub masă`);
    assert.equal(r3(p.baza[2]!), 0, `${ce}: nimic sub masă`);
    // capătul de știft își ține fanta (golul de pe axă), doar dacă e cerută
    assert.equal(la(1, 0, 0), !fanta, `${ce}: fanta de la capătul de știft`);
    assert.equal(la(1, RS - 0.5, 0), true, `${ce}: lângă fantă`);
    assert.equal(la(6, 0, 0), true, `${ce}: miezul știftului, după fantă`);
  }
});

test('știfturile de până acum nu se schimbă: cu capăt de știft sau de ax, aceleași plase', () => {
  const ref = (d: Record<string, unknown>) => amprentaPlasei(L.construieste({ tip: 'stiftTechnic', ...d }));
  // fără `capat`, cu „stift” și cu un cuvânt necunoscut: știftul obișnuit
  for (const lung of [2, 3]) {
    assert.equal(ref({ lung }), ref({ lung, capat: 'stift' }));
    assert.equal(ref({ lung, capat: 'altceva' }), ref({ lung, capat: 'stift' }));
    assert.notEqual(ref({ lung, capat: 'bucsa' }), ref({ lung, capat: 'stift' }));
    assert.notEqual(ref({ lung, capat: 'bucsa' }), ref({ lung, capat: 'ax' }));
    // știftul obișnuit are gulerul; cel cu bucșă are cutia mai mare
    const s = L.construieste({ tip: 'stiftTechnic', lung }), b = L.construieste({ tip: 'stiftTechnic', lung, capat: 'bucsa' });
    assert.deepEqual(cote(s), [r3(lung * S - 0.2), r3(2 * RGUL), r3(AX0 + RGUL)]);
    assert.ok(cote(b)[1]! > cote(s)[1]! && cote(b)[2]! > cote(s)[2]!);
  }
});
