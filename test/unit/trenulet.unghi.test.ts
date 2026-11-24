/**
 * Conectorul în unghi din atelierul Easy 3Draw (ADR 0284, felia 3.Cb), pe plasele reale ale motorului:
 * - un butuc rotund în picioare (Ø cât grinda groasă), cu gaura lui verticală (de știft, cu lamaj pe fețe; de ax; sau
 *   plin), din care pleacă 1–4 brațe pătrate (7,8 × 7,8), în planul mesei; fiecare braț are pe axa lui un manșon orb,
 *   adânc de un pas (de la 4 la 11,9 mm de centrul butucului), de ax sau de știft (cu lamaj la gură);
 * - corpul e închis, iar cutia e cea de pe hârtie (butucul și colțurile din vârful brațelor);
 * - un punct e judecat „în lemn” sau „în gol” după numărul de înfășurare al plasei, în reperul brațului (u de-a lungul
 *   lui, v în lateral, w pe verticală, de la mijloc);
 * - două brațe la mai puțin de 90° unul de altul ar intra unul în manșonul celuilalt: al doilea e lăsat afară și se spune.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, dinMotor, amprentaPlasei, muchiiFaraPereche, type P3, type Piesa } from './ajutor-plasa-lego.ts';

type Brat = readonly [number, string];
const unghi = (brate: readonly Brat[] | null, butuc?: string) => L.construieste({ tip: 'conectorUnghi', ...(brate ? { mansoane: brate } : {}), ...(butuc ? { butuc } : {}) });
const E = L.efective(), P = L.parametri();
const S = P.pas!, G = P.grinda_groasa!, M = G / 2, RG = E.gauraD! / 2, RL = E.lamajD! / 2, HL = P.lamaj_h!, AXD = E.axGauraD!, AXL = E.axGauraLat!;
/** Pe hârtie: fundul manșonului e la o jumătate de pas de centru, gura la un pas și jumătate (trasă cu 0,1). */
const FUND = S / 2, GURA = 1.5 * S - 0.1;
const rad = (g: number) => g * Math.PI / 180;

/** Punctul din reperul brațului de la `g` grade: `u` pe braț, `v` în lateral, `w` pe verticală, de la mijlocul grosimii. */
function loc(p: Piesa, g: number, u: number, v: number, w: number): P3 {
  const c = Math.cos(rad(g)), s = Math.sin(rad(g));
  return dinMotor(p, [u * c - v * s, u * s + v * c, M + w]);
}
/** Cutia de pe hârtie: butucul (cercul de rază M) și colțurile din vârful fiecărui braț. */
function cutie(unghiuri: readonly number[]): number[] {
  const xs = [-M, M], ys = [-M, M];
  for (const g of unghiuri) for (const v of [-M, M]) {
    const c = Math.cos(rad(g)), s = Math.sin(rad(g));
    xs.push(GURA * c - v * s); ys.push(GURA * s + v * c);
  }
  return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), G].map((x) => Math.round(x * 1000) / 1000);
}
const inchisa = (p: Piesa, ce: string) => { const m = plasa(p.tri); assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`); };

const PLAJA: readonly (readonly number[])[] = [[0], [0, 90], [0, 112.5], [0, 135], [0, 157.5], [0, 180], [0, 90, 180], [0, 120, 240], [0, 100.3, 200.6], [0, 90, 180, 270], [30, 150], [200, 20]];

test('motorul știe piesa, iar cea implicită are două manșoane de ax la 135° și butucul cu gaură de știft', () => {
  assert.ok(L.tipuri.includes('conectorUnghi'));
  const p = L.construieste({ tip: 'conectorUnghi' });
  assert.deepEqual(cote(p), cutie([0, 135]));
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicită');
  // amândouă manșoanele sunt de ax (crucea: gol pe braț, lemn pe diagonală), iar butucul are gaura rotundă
  for (const g of [0, 135]) {
    assert.equal(plin(p, loc(p, g, 8, 0, 0)), false, `manșonul de la ${g}°, pe axă`);
    assert.equal(plin(p, loc(p, g, 8, AXL / 2 + 0.4, AXL / 2 + 0.4)), true, `manșonul de la ${g}°, între brațele crucii`);
  }
  assert.equal(plin(p, loc(p, 0, 0, 0, 0)), false, 'gaura butucului');
  const d = (RG - 0.15) / Math.SQRT2;
  assert.equal(plin(p, dinMotor(p, [d, -d, M])), false, 'gaura butucului e rotundă (gol și pe diagonală)');
  // aceeași piesă, cerută pe nume
  assert.deepEqual(cote(unghi([[0, 'x'], [135, 'x']], 'r')), cote(p));
  assert.equal(unghi([[0, 'x'], [135, 'x']], 'r').tri.length, p.tri.length);
});

test('corpul e închis și are cutia de pe hârtie, pe toată plaja de brațe, găuri și butuci', () => {
  let n = 0;
  for (const us of PLAJA) for (const fel of ['x', 'r']) for (const butuc of ['r', 'x', 'p']) {
    const p = unghi(us.map((g, k): Brat => [g, k % 2 ? fel : 'x']), butuc), ce = `${us.join('/')} ${fel} ${butuc}`;
    inchisa(p, ce);
    // și ca STL citit de altcineva: butucul și brațele nu-și împart nicio muchie
    assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
    assert.deepEqual(cote(p), cutie(us), ce);
    assert.equal(p.avert.length, 0, ce);
    n++;
  }
  assert.ok(n >= 70);
  // cotele uzuale, pe hârtie: drept (nr. 2) e cât trei pași, cotul (nr. 6) e pătrat
  assert.deepEqual(cote(unghi([[0, 'x'], [180, 'x']])), [3 * S - 0.2, G, G]);
  assert.deepEqual(cote(unghi([[0, 'x'], [90, 'x']])), [2 * S - 0.2, 2 * S - 0.2, G]);
  assert.deepEqual(cote(unghi([[0, 'x']])), [2 * S - 0.2, G, G]);
});

test('manșonul de ax: crucea pe axa brațului, la orice unghi, oarbă, adâncă de un pas', () => {
  for (const us of PLAJA) {
    const p = unghi(us.map((g): Brat => [g, 'x']));
    for (const g of us) for (const u of [FUND + 0.3, 8, GURA - 0.3]) {
      const ce = `${us.join('/')}: brațul ${g}°, u ${u}`;
      assert.equal(plin(p, loc(p, g, u, 0, 0)), false, `${ce}: axa`);
      // brațele crucii, pe orizontală și pe verticală, până la jumătatea diametrului
      for (const s of [-1, 1]) {
        assert.equal(plin(p, loc(p, g, u, s * (AXD / 2 - 0.15), 0)), false, `${ce}: brațul orizontal`);
        assert.equal(plin(p, loc(p, g, u, 0, s * (AXD / 2 - 0.15))), false, `${ce}: brațul vertical`);
        assert.equal(plin(p, loc(p, g, u, s * (AXD / 2 + 0.15), 0)), true, `${ce}: dincolo de brațul orizontal`);
        assert.equal(plin(p, loc(p, g, u, 0, s * (AXD / 2 + 0.15))), true, `${ce}: dincolo de brațul vertical`);
        // lățimea brațelor crucii
        assert.equal(plin(p, loc(p, g, u, s * (AXL / 2 - 0.15), AXD / 2 - 0.3)), false, `${ce}: în lățimea brațului vertical`);
        assert.equal(plin(p, loc(p, g, u, s * (AXL / 2 + 0.15), AXD / 2 - 0.3)), true, `${ce}: lângă brațul vertical`);
        assert.equal(plin(p, loc(p, g, u, AXD / 2 - 0.3, s * (AXL / 2 - 0.15))), false, `${ce}: în lățimea brațului orizontal`);
        assert.equal(plin(p, loc(p, g, u, AXD / 2 - 0.3, s * (AXL / 2 + 0.15))), true, `${ce}: lângă brațul orizontal`);
      }
    }
    // manșonul e orb: între fundul lui și gaura butucului rămâne perete
    for (const g of us) {
      assert.equal(plin(p, loc(p, g, FUND - 0.2, 0, 0)), true, `${us.join('/')}: fundul manșonului de la ${g}°`);
      assert.equal(plin(p, loc(p, g, RG + 0.2, 0, 0)), true, `${us.join('/')}: peretele butucului spre ${g}°`);
      assert.equal(plin(p, loc(p, g, RG - 0.2, 0, 0)), false, `${us.join('/')}: gaura butucului spre ${g}°`);
      // brațul are secțiunea pătrată, de la masă până sus, și se termină la gură
      for (const s of [-1, 1]) {
        assert.equal(plin(p, loc(p, g, 8, s * (M - 0.15), 0)), true, `${us.join('/')}: peretele lateral al brațului ${g}°`);
        assert.equal(plin(p, loc(p, g, 8, 0, s * (M - 0.15))), true, `${us.join('/')}: peretele de sus și de jos al brațului ${g}°`);
        assert.equal(plin(p, loc(p, g, GURA - 0.15, s * (M - 0.15), s * (M - 0.15))), true, `${us.join('/')}: colțul din vârful brațului ${g}°`);
      }
      assert.equal(plin(p, loc(p, g, GURA + 0.15, M - 0.3, 0)), false, `${us.join('/')}: dincolo de vârful brațului ${g}°`);
    }
  }
});

test('manșonul de știft: gaura rotundă a grinzii, cu lamaj la gură, oarbă', () => {
  for (const us of [[0], [0, 90], [0, 135], [0, 180], [0, 120, 240], [0, 90, 180, 270], [30, 150]]) {
    const p = unghi(us.map((g): Brat => [g, 'r']));
    for (const g of us) {
      const ce = `${us.join('/')}: brațul ${g}°`;
      for (const u of [FUND + 0.3, 8, GURA - HL - 0.2]) for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const c = Math.cos(rad(a)), s = Math.sin(rad(a));
        assert.equal(plin(p, loc(p, g, u, (RG - 0.15) * c, (RG - 0.15) * s)), false, `${ce}, u ${u}, ${a}°: în gaură`);
        assert.equal(plin(p, loc(p, g, u, (RG + 0.15) * c, (RG + 0.15) * s)), true, `${ce}, u ${u}, ${a}°: în perete`);
      }
      // lamajul: doar pe ultimii 0,8 mm, la gură
      for (const a of [0, 90, 180, 270]) {
        const c = Math.cos(rad(a)), s = Math.sin(rad(a));
        assert.equal(plin(p, loc(p, g, GURA - HL / 2, (RL - 0.15) * c, (RL - 0.15) * s)), false, `${ce}, ${a}°: în lamaj`);
        assert.equal(plin(p, loc(p, g, GURA - HL / 2, (RL + 0.15) * c, (RL + 0.15) * s)), true, `${ce}, ${a}°: lângă lamaj`);
        assert.equal(plin(p, loc(p, g, GURA - HL - 0.2, (RL - 0.15) * c, (RL - 0.15) * s)), true, `${ce}, ${a}°: sub lamaj`);
      }
      assert.equal(plin(p, loc(p, g, FUND - 0.2, 0, 0)), true, `${ce}: fundul manșonului`);
    }
  }
  // felul fiecărui braț e al lui: ax la primul, știft la al doilea
  const p = unghi([[0, 'x'], [135, 'r']]), d = (RG - 0.15) / Math.SQRT2;
  assert.equal(plin(p, loc(p, 0, 8, d, d)), true, 'primul braț: cruce (lemn pe diagonală)');
  assert.equal(plin(p, loc(p, 135, 8, d, d)), false, 'al doilea braț: gaură rotundă (gol pe diagonală)');
});

test('butucul: gaura de știft cu lamaj pe ambele fețe, crucea axului sau plin; brațele nu intră în ea', () => {
  for (const us of PLAJA) {
    const r = unghi(us.map((g): Brat => [g, 'x']), 'r'), x = unghi(us.map((g): Brat => [g, 'x']), 'x'), f = unghi(us.map((g): Brat => [g, 'x']), 'p');
    const ce = us.join('/');
    for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const c = Math.cos(rad(a)), s = Math.sin(rad(a));
      const la = (p: Piesa, raza: number, z: number) => plin(p, dinMotor(p, [raza * c, raza * s, z]));
      // gaura de știft: raza grinzii la mijloc, lamajul pe primii și pe ultimii 0,8 mm
      for (const z of [HL + 0.2, M, G - HL - 0.2]) {
        assert.equal(la(r, RG - 0.15, z), false, `${ce}, ${a}°, z ${z}: în gaură`);
        assert.equal(la(r, RG + 0.15, z), true, `${ce}, ${a}°, z ${z}: în perete`);
      }
      for (const z of [HL / 2, G - HL / 2]) {
        assert.equal(la(r, RL - 0.15, z), false, `${ce}, ${a}°, z ${z}: în lamaj`);
        assert.equal(la(r, RL + 0.15, z), true, `${ce}, ${a}°, z ${z}: lângă lamaj`);
      }
      // plin: nimic în mijloc
      assert.equal(la(f, RG - 0.15, M), true, `${ce}, ${a}°: butucul plin`);
      assert.equal(la(f, 0.3, HL / 2), true, `${ce}, ${a}°: butucul plin, jos`);
    }
    // crucea axului, pe toată înălțimea, fără lamaj
    for (const z of [0.3, M, G - 0.3]) {
      const la = (xx: number, yy: number) => plin(x, dinMotor(x, [xx, yy, z]));
      assert.equal(la(0, 0), false, `${ce}, z ${z}: axa crucii`);
      assert.equal(la(AXD / 2 - 0.15, 0), false, `${ce}, z ${z}: brațul crucii pe X`);
      assert.equal(la(0, -(AXD / 2 - 0.15)), false, `${ce}, z ${z}: brațul crucii pe Y`);
      assert.equal(la(AXL / 2 + 0.3, AXL / 2 + 0.3), true, `${ce}, z ${z}: între brațele crucii`);
      assert.equal(la(-(AXL / 2 + 0.3), AXL / 2 + 0.3), true, `${ce}, z ${z}: între brațele crucii, în stânga`);
    }
    // butucul e rotund: în spatele brațelor (la peste 90° de fiecare), lemnul se termină la raza lui
    const liber = [45, 135, 225, 315, 22.5, 67.5, 247.5, 292.5, 180, 270].find((a) => us.every((g) => { const d = Math.abs(((a - g) % 360 + 540) % 360 - 180); return d > 100; }));
    if (liber !== undefined) {
      const c = Math.cos(rad(liber)), s = Math.sin(rad(liber));
      assert.equal(plin(r, dinMotor(r, [(M - 0.15) * c, (M - 0.15) * s, M])), true, `${ce}: marginea butucului la ${liber}°`);
      assert.equal(plin(r, dinMotor(r, [(M + 0.15) * c, (M + 0.15) * s, M])), false, `${ce}: dincolo de butuc la ${liber}°`);
    }
  }
});

test('o singură bucată: fiecare braț intră în peretele butucului, pe toată înălțimea', () => {
  for (const us of PLAJA) for (const butuc of ['r', 'x', 'p']) {
    const p = unghi(us.map((g): Brat => [g, 'x']), butuc);
    for (const g of us) for (const w of [-(M - 0.2), 0, M - 0.2]) {
      // de la peretele butucului până la fundul manșonului, lemnul e neîntrerupt pe axa brațului și lângă ea
      for (let u = RL + 0.1; u < FUND - 0.05; u += 0.1) for (const v of [-1.5, 0, 1.5]) {
        assert.equal(plin(p, loc(p, g, u, v, w)), true, `${us.join('/')} ${butuc}: brațul ${g}°, u ${u.toFixed(1)}, v ${v}, w ${w.toFixed(1)}`);
      }
      // brațul e lat cât butucul chiar de la plecare: laturile lui pleacă tangent din butuc, fără crestături
      for (const s of [-1, 1]) for (const u of [0.3, 1.5, 2.5, FUND - 0.1]) {
        assert.equal(plin(p, loc(p, g, u, s * (M - 0.15), w)), true, `${us.join('/')} ${butuc}: umărul brațului ${g}°, u ${u}`);
      }
    }
  }
});

test('două brațe la mai puțin de 90° nu se pot: al doilea e lăsat afară și se spune; cel mult patru brațe', () => {
  const p = unghi([[0, 'x'], [60, 'x'], [180, 'r']]);
  assert.equal(p.avert.length, 1);
  assert.match(p.avert[0]!, /90°/);
  assert.deepEqual(cote(p), cutie([0, 180]));
  assert.equal(plin(p, loc(p, 180, 8, (RG - 0.15) / Math.SQRT2, (RG - 0.15) / Math.SQRT2)), false, 'al treilea braț rămâne, cu felul lui');
  // și peste zero: 350° e la 10° de primul
  assert.deepEqual(cote(unghi([[0, 'x'], [350, 'x']])), cutie([0]));
  assert.equal(unghi([[0, 'x'], [350, 'x']]).avert.length, 1);
  assert.deepEqual(cote(unghi([[0, 'x'], [89.9, 'x']])), cutie([0]));
  // exact 90° se poate; un al cincilea braț nu mai are loc
  assert.equal(unghi([[0, 'x'], [90, 'x']]).avert.length, 0);
  const cinci = unghi([[0, 'x'], [90, 'x'], [180, 'x'], [270, 'x'], [45, 'x']]);
  assert.deepEqual(cote(cinci), cutie([0, 90, 180, 270]));
  assert.equal(cinci.avert.length, 1);
  // unghiurile se iau modulo 360; un fel necunoscut e manșon de ax, un butuc necunoscut are gaură de știft
  assert.deepEqual(cote(unghi([[-90, 'x'], [450, 'x']])), cutie([270, 90]));
  const q = unghi([[0, 'q'], [180, 'x']], 'q'), d = (RG - 0.15) / Math.SQRT2;
  assert.equal(plin(q, loc(q, 0, 8, AXL / 2 + 0.4, AXL / 2 + 0.4)), true, 'fel necunoscut: cruce');
  assert.equal(plin(q, dinMotor(q, [d, d, M])), false, 'butuc necunoscut: gaură rotundă');
  // o listă goală sau stricată dă piesa implicită
  for (const rea of [[], 'x', null, [[Number.NaN, 'x']]]) {
    const pr = L.construieste({ tip: 'conectorUnghi', mansoane: rea });
    assert.ok(pr.tri.length > 0);
    inchisa(pr, JSON.stringify(rea));
  }
  assert.deepEqual(cote(L.construieste({ tip: 'conectorUnghi', mansoane: [] })), cutie([0, 135]));
});

test('la exact 90°, manșoanele vecine rămân libere, iar brațele nu astupă gaura butucului', () => {
  const p = unghi([[0, 'x'], [90, 'x'], [180, 'r'], [270, 'r']]);
  inchisa(p, 'cruce');
  for (const g of [0, 90]) for (const u of [FUND + 0.2, FUND + 1, 8]) for (const s of [-1, 1]) {
    assert.equal(plin(p, loc(p, g, u, s * (AXD / 2 - 0.15), 0)), false, `brațul ${g}°, u ${u}: brațul crucii dinspre vecin`);
  }
  for (const g of [180, 270]) for (const u of [FUND + 0.2, 8]) for (const s of [-1, 1]) {
    assert.equal(plin(p, loc(p, g, u, s * (RG - 0.15), 0)), false, `brațul ${g}°, u ${u}: gaura dinspre vecin`);
  }
  for (const z of [HL / 2, M, G - HL / 2]) for (const a of [0, 90, 180, 270]) {
    assert.equal(plin(p, dinMotor(p, [(RG - 0.15) * Math.cos(rad(a)), (RG - 0.15) * Math.sin(rad(a)), z])), false, `gaura butucului spre ${a}°, z ${z}`);
    assert.equal(plin(p, dinMotor(p, [(RL - 0.15) * Math.cos(rad(a)), (RL - 0.15) * Math.sin(rad(a)), z === M ? HL / 2 : z])), false, `lamajul butucului spre ${a}°`);
  }
});

test('aceeași cerere dă aceeași plasă', () => {
  const a = unghi([[0, 'x'], [112.5, 'r'], [247.5, 'x']], 'x'), b = unghi([[0, 'x'], [112.5, 'r'], [247.5, 'x']], 'x');
  assert.equal(amprentaPlasei(a), amprentaPlasei(b));
  assert.deepEqual(cote(a), cote(b));
});
