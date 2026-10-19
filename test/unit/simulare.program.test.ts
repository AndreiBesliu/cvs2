import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compara, judeca, verificaHartie, type GrilaOracol } from '../oracles/simulare.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../../src/ir/ir.ts';
import { amprentaCamp } from '../../src/sim/banda.ts';
import { campNou, compacteaza, valoare } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram, STRIDE } from '../../src/sim/program.ts';
import { FOAIA, programPlaca01 } from '../placi/placa-01/genereaza.ts';
import { densPe, parametriGrila } from './ajutor-simulare.ts';

/**
 * Programul IR al aplicației trecut în mutările nucleului (ADR 0047 §3): poziția urmărită de la o pornire necunoscută,
 * arcele native (cu elicea), rapidele simulate ca tăieri, refuzurile cu motiv. Apoi un program adevărat — placa 1, din
 * CAM-ul aplicației — judecat de oracol pe octeții exportați de post.
 */

const PLATA6: Scula = { numar: 1, nume: 'freza plata', diametru: 6 };
const program = (miscari: readonly Miscare[], scula: Scula = PLATA6, axe = AXE_XYZ): Program => ({ axe, scula, turatie: 18000, zSigur: 5, miscari });

test('pornirea e necunoscută: mutările prin aer se sar, coborârea în material dintr-un XY necunoscut e refuzată', () => {
  const sus = pregatesteProgram(program([{ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 10, Y: 10 } }, { tip: 'taiere', la: { Z: -1 }, avans: 300 }]), 0);
  assert.ok(sus.ok);
  // Z5 dintr-o poziție necunoscută și XY la Z5: prin aer, fără mutare; coborârea e prima mutare.
  assert.equal(sus.mutari.length / STRIDE, 1);
  assert.deepEqual([...sus.mutari.subarray(0, 7)], [0, 10, 10, 5, 10, 10, -1]);
  const r = pregatesteProgram(program([{ tip: 'taiere', la: { Z: -1 }, avans: 300 }]), 0);
  assert.ok(!r.ok && r.miscare === 0 && /necunoscut/.test(r.motiv), JSON.stringify(r));
  const x = pregatesteProgram(program([{ tip: 'rapida', la: { Z: 5 } }, { tip: 'taiere', la: { X: 1, Z: -1 }, avans: 300 }]), 0);
  assert.ok(!x.ok && x.miscare === 1, JSON.stringify(x));
});

test('un arc dintr-o poziție necunoscută e refuzat (centrul nu spune de unde pornește)', () => {
  const r = pregatesteProgram(program([{ tip: 'arc', la: { X: 10, Y: 0 }, centru: { x: 5, y: 0 }, sens: 'orar', avans: 1000 }]), 0);
  assert.ok(!r.ok && r.miscare === 0, JSON.stringify(r));
});

test('axa A e refuzată explicit (T22: simularea pe XYZ în v1), și în lista de axe, și într-o mutare', () => {
  const a = pregatesteProgram(program([{ tip: 'rapida', la: { Z: 5 } }], PLATA6, ['X', 'Y', 'Z', 'A']), 0);
  assert.ok(!a.ok && /axa A/.test(a.motiv), JSON.stringify(a));
  const b = pregatesteProgram(program([{ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 0, Y: 0, A: 90 } }]), 0);
  assert.ok(!b.ok && b.miscare === 1 && /axa A/.test(b.motiv), JSON.stringify(b));
});

test('elicea cu bilă sau cu V e refuzată (nesimulată exact încă); cu freza plată trece', () => {
  const elice: Miscare[] = [
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 30, Y: 20 } }, { tip: 'taiere', la: { Z: 0 }, avans: 300 },
    { tip: 'arc', la: { X: 30, Y: 20, Z: -2 }, centru: { x: 20, y: 20 }, sens: 'trigonometric', avans: 1000 },
  ];
  assert.ok(pregatesteProgram(program(elice), 0).ok);
  for (const forma of [{ tip: 'bila' }, { tip: 'v', unghi: 60 }] as const) {
    const r = pregatesteProgram(program(elice, { ...PLATA6, forma }), 0);
    assert.ok(!r.ok && r.miscare === 3 && /elice/.test(r.motiv), JSON.stringify(r));
  }
  // Același arc la Z constant, cu bila: trece (exact pe celulă pentru orice formă).
  const plan: Miscare[] = [...elice.slice(0, 3), { tip: 'arc', la: { X: 30, Y: 20 }, centru: { x: 20, y: 20 }, sens: 'trigonometric', avans: 1000 }];
  assert.ok(pregatesteProgram(program(plan, { ...PLATA6, forma: { tip: 'bila' } }), 0).ok);
});

test('arcul cu capătul pe alt cerc (peste 1 nm) sau cu raza zero e refuzat; sub 1 nm trece (rotunjirea CAM-ului)', () => {
  const pornire: Miscare[] = [{ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 30, Y: 20 } }, { tip: 'taiere', la: { Z: -1 }, avans: 300 }];
  const arc = (x: number, cx: number): Miscare => ({ tip: 'arc', la: { X: x, Y: 20 }, centru: { x: cx, y: 20 }, sens: 'orar', avans: 1000 });
  // Startul la r = 10 de centru; capătul la 10,01, apoi la 10 + 2 nm: alt cerc (nucleul desenează unul singur).
  for (const x of [9.99, 10 - 2e-9]) {
    const r = pregatesteProgram(program([...pornire, arc(x, 20)]), 0);
    assert.ok(!r.ok && r.miscare === 3 && /raze diferite/.test(r.motiv), `${x}: ${JSON.stringify(r)}`);
  }
  assert.ok(pregatesteProgram(program([...pornire, arc(10 - 5e-10, 20)]), 0).ok, 'jumătate de nanometru: rotunjire, nu alt cerc');
  const z = pregatesteProgram(program([...pornire, arc(10, 30)]), 0);
  assert.ok(!z.ok && z.miscare === 3 && /raza zero/.test(z.motiv), JSON.stringify(z));
});

test('arcul cu capetele aproape în același punct (sub 1e-9 rad, dar nu în el) e refuzat: punct sau cerc întreg, ambiguu', () => {
  const pornire: Miscare[] = [{ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 30, Y: 20 } }, { tip: 'taiere', la: { Z: -1 }, avans: 300 }];
  const r = 10, u = 1e-10;
  for (const sens of ['orar', 'trigonometric'] as const) {
    const a = pregatesteProgram(program([...pornire, { tip: 'arc', la: { X: 20 + r * Math.cos(u), Y: 20 + r * Math.sin(u) }, centru: { x: 20, y: 20 }, sens, avans: 1000 }]), 0);
    assert.ok(!a.ok && a.miscare === 3 && /aproape în același punct/.test(a.motiv), `${sens}: ${JSON.stringify(a)}`);
    // La 1e-6 rad: un arc mic (trigonometric) sau aproape întreg (orar), fără ambiguitate.
    const b = pregatesteProgram(program([...pornire, { tip: 'arc', la: { X: 20 + r * Math.cos(1e-6), Y: 20 + r * Math.sin(1e-6) }, centru: { x: 20, y: 20 }, sens, avans: 1000 }]), 0);
    assert.ok(b.ok, sens);
    const S = b.mutari[b.mutari.length - 1]!;
    assert.ok(sens === 'trigonometric' ? Math.abs(S - 1e-6) < 1e-12 : Math.abs(S - (2 * Math.PI - 1e-6)) < 1e-12, `${sens}: baleiajul ${S}`);
  }
});

test('elicea cu bilă sau cu V prin aer (deasupra feței) nu e refuzată: nu taie nimic', () => {
  const m: Miscare[] = [
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 30, Y: 20 } },
    { tip: 'arc', la: { X: 30, Y: 20, Z: 1 }, centru: { x: 20, y: 20 }, sens: 'trigonometric', avans: 1000 },
  ];
  const r = pregatesteProgram(program(m, { ...PLATA6, forma: { tip: 'bila' } }), 0);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.mutari.length, 0);
});

test('scula și numerele invalide sunt refuzate, cu motiv', () => {
  const m: Miscare[] = [{ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 0, Y: 0 } }];
  for (const s of [{ ...PLATA6, diametru: 0 }, { ...PLATA6, diametru: Number.NaN }, { ...PLATA6, diametru: 2000 },
    { ...PLATA6, forma: { tip: 'v', unghi: 180 } }, { ...PLATA6, forma: { tip: 'v', unghi: 0 } }] as const) {
    const r = pregatesteProgram(program(m, s), 0);
    assert.ok(!r.ok && /scula/.test(r.motiv), JSON.stringify(s));
  }
  const r = pregatesteProgram(program([...m, { tip: 'taiere', la: { X: Number.POSITIVE_INFINITY }, avans: 1000 }]), 0);
  assert.ok(!r.ok && r.miscare === 2, JSON.stringify(r));
});

test('rapida prin material taie (o rapidă greșită se vede pe simulare); eticheta, axul și pauza nu mișcă nimic', () => {
  const m: Miscare[] = [
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 10, Y: 10 } }, { tip: 'eticheta', text: 'x' },
    { tip: 'ax-pornit', turatie: 18000 }, { tip: 'pauza', secunde: 3 }, { tip: 'rapida', la: { Z: -2 } },
    { tip: 'rapida', la: { X: 30 } }, { tip: 'ax-oprit' },
  ];
  const p = pregatesteProgram(program(m), 0);
  assert.ok(p.ok);
  assert.equal(p.mutari.length / STRIDE, 2);
  const F = campNou({ x0: 0, y0: 0, latime: 40, inaltime: 20, celula: 0.25, sus: 0 });
  ruleaza(F, p.scula, p.mutari);
  assert.equal(valoare(F, 80, 40), -2, 'rapida orizontală la −2 a scos materialul');
});

test('arcul: G2 de la A la B și G3 de la B la A taie aceeași materie, bit cu bit; cercul întreg (start = capăt)', () => {
  const g = { x0: 0, y0: 0, latime: 60, inaltime: 60, celula: 0.1, sus: 0 };
  const pornire = (x: number, y: number): Miscare[] => [{ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: x, Y: y } }, { tip: 'taiere', la: { Z: -3 }, avans: 300 }];
  const orar = pregatesteProgram(program([...pornire(45, 30), { tip: 'arc', la: { X: 30, Y: 15 }, centru: { x: 30, y: 30 }, sens: 'orar', avans: 1000 }]), 0);
  const trig = pregatesteProgram(program([...pornire(30, 15), { tip: 'arc', la: { X: 45, Y: 30 }, centru: { x: 30, y: 30 }, sens: 'trigonometric', avans: 1000 }]), 0);
  assert.ok(orar.ok && trig.ok);
  const a = campNou(g), b = campNou(g);
  ruleaza(a, orar.scula, orar.mutari);
  ruleaza(b, trig.scula, trig.mutari);
  compacteaza(a);
  compacteaza(b);
  assert.equal(amprentaCamp(a), amprentaCamp(b));
  // Cercul întreg: inelul dintre 12 și 18 tăiat peste tot (pe hârtie, celulele departe de pereți).
  const cerc = pregatesteProgram(program([...pornire(45, 30), { tip: 'arc', la: { X: 45, Y: 30 }, centru: { x: 30, y: 30 }, sens: 'orar', avans: 1000 }]), 0);
  assert.ok(cerc.ok);
  const F = campNou(g);
  ruleaza(F, cerc.scula, cerc.mutari);
  for (let u = 0; u < 360; u += 7.5) {
    const x = 30 + 15 * Math.cos((u * Math.PI) / 180), y = 30 + 15 * Math.sin((u * Math.PI) / 180);
    assert.equal(valoare(F, Math.floor(x / 0.1), Math.floor(y / 0.1)), -3, `la ${u}°`);
  }
  assert.equal(valoare(F, 300, 300), 0, 'centrul cercului rămâne');
});

test('un program adevărat: placa 1 din CAM-ul aplicației, simulată din IR și judecată de oracol pe octeții exportați (A și B)', () => {
  const p = pregatesteProgram(programPlaca01(), 0);
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  const grila: GrilaOracol = { x0: 0, y0: 0, latime: FOAIA.latime, inaltime: FOAIA.inaltime, celula: 0.1 };
  const F = campNou(parametriGrila(grila));
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  const z = densPe(F, grila);
  const scula = { tip: 'plata', diametru: 6 } as const;
  // A: originea în colțul stânga-jos (programul = documentul); B: în dreapta-sus (documentul = programul + foaia).
  for (const [fisier, deplasare] of [['placa-01-A.nc', [0, 0, 0]], ['placa-01-B.nc', [FOAIA.latime, FOAIA.inaltime, 0]]] as const) {
    const text = readFileSync(new URL(`../placi/placa-01/${fisier}`, import.meta.url), 'utf8');
    const o = judeca(text, grila, scula, { deplasare });
    const cmp = compara(z, o, scula);
    assert.equal(cmp.maiSus, 0, `${fisier}: nucleul mai sus pe ${cmp.maiSus} celule (max ${cmp.maiSusMax}, prima ${JSON.stringify(cmp.primaMaiSus)})`);
    assert.equal(cmp.maiJosPesteMarja, 0, `${fisier}: nucleul sub marjă pe ${cmp.maiJosPesteMarja} celule`);
  }
  // Pe hârtie: gaura Ø30 profilată pe interior cu Ø6 (traseul pe r = 12) scoate inelul 9 ≤ r ≤ 15 la −8 (miezul rămâne:
  // 8 mm din 18 nu trec prin foaie); insula 100 × 60 rămâne la 0, canalul ei (exterior, traseul la 3 mm) e banda de 6 mm
  // din jurul dreptunghiului, la −3.
  const hartie = (x: number, y: number): number => {
    const r = Math.hypot(x - 70, y - 50);
    if (r >= 9 && r <= 15) return -8;
    const dx = Math.max(20 - x, 0, x - 120), dy = Math.max(20 - y, 0, y - 80);
    const d = Math.hypot(dx, dy);
    return d > 0 && d <= 6 ? -3 : 0;
  };
  const muchie = (x: number, y: number): number => {
    const dx = Math.max(20 - x, 0, x - 120), dy = Math.max(20 - y, 0, y - 80), d = Math.hypot(dx, dy);
    const r = Math.hypot(x - 70, y - 50);
    return Math.min(Math.abs(r - 15), Math.abs(r - 9), d === 0 ? Math.min(x - 20, 120 - x, y - 20, 80 - y) : Math.abs(d - 6));
  };
  const v = verificaHartie(z, grila, hartie, { muchie, pragMuchie: 1e-6 });
  assert.equal(v.gresite, 0, `placa 1 pe hârtie: ${v.gresite} celule greșite (prima ${JSON.stringify(v.primaGresita)}, eroarea ${v.eroareMax})`);
  assert.ok(v.celule > 0.99 * z.length);
});
