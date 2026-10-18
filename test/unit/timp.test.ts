import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProfilMasina } from '../../src/ir/masina.ts';
import { PROFIL_GRBL_11H } from '../../src/ir/masini/grbl11h.ts';
import { estimeazaTimp, type EstimareTimp } from '../../src/sim/timp.ts';

/**
 * Estimarea timpului (ADR 0046): valori calculate PE HÂRTIE, din formulele închise ale planificatorului GRBL 1.1h, scrise
 * înaintea modelului. Notații: v = avansul în mm/s, a = accelerația blocului în mm/s², L = lungimea blocului.
 * - profilul unui bloc din repaus în repaus, cu croazieră: t = L / v + v / a;
 * - fără croazieră (triunghi): t = 2 · √(L / a);
 * - în general: d_acc = (v² − v₀²) / 2a, d_dec = (v² − v₁²) / 2a; dacă d_acc + d_dec ≤ L, t = (v − v₀)/a + (v − v₁)/a +
 *   (L − d_acc − d_dec)/v; altfel vârful e v_p² = (2aL + v₀² + v₁²) / 2 și t = (v_p − v₀)/a + (v_p − v₁)/a.
 */

type Optiuni = {
  readonly v?: readonly [number, number, number];
  readonly a?: readonly [number, number, number];
  readonly pasi?: number;
  readonly dj?: number;
  readonly tol?: number;
  readonly blocuri?: number;
};

/** Un profil de probă: pașii la 1000 / mm țin exact coordonatele cu 3 zecimale, deci cuantizarea nu mută nimic. */
function profil(o: Optiuni = {}): ProfilMasina {
  const v = o.v ?? [10000, 10000, 10000];
  const a = o.a ?? [100, 100, 100];
  const pasi = o.pasi ?? 1000;
  const axa = (i: 0 | 1 | 2) => ({ pasiPeMm: pasi, vitezaMaxima: v[i], acceleratie: a[i] });
  return {
    ...PROFIL_GRBL_11H,
    axe: { X: axa(0), Y: axa(1), Z: axa(2) },
    deviatieJonctiune: o.dj ?? 0.01,
    toleranteArc: o.tol ?? 0.002,
    firmware: { ...PROFIL_GRBL_11H.firmware, blocuriPlanificator: o.blocuri ?? PROFIL_GRBL_11H.firmware.blocuriPlanificator },
  };
}

function ok(r: EstimareTimp): Extract<EstimareTimp, { ok: true }> {
  assert.ok(r.ok, r.ok ? '' : `linia ${r.linie}: ${r.motiv}`);
  return r as Extract<EstimareTimp, { ok: true }>;
}

function aproape(real: number, asteptat: number, tol: number, ce: string): void {
  assert.ok(Math.abs(real - asteptat) <= tol, `${ce}: ${real} față de ${asteptat} (±${tol})`);
}

const linii = (...l: string[]): string => `${l.join('\n')}\n`;

test('implicitele GRBL 1.1h (defaults.h, DEFAULTS_GENERIC; planner.h; config.h): profilul de date', () => {
  for (const axa of ['X', 'Y', 'Z'] as const) {
    assert.deepEqual(PROFIL_GRBL_11H.axe[axa], { pasiPeMm: 250, vitezaMaxima: 500, acceleratie: 10 });
  }
  assert.equal(PROFIL_GRBL_11H.axe.A, undefined);
  assert.equal(PROFIL_GRBL_11H.deviatieJonctiune, 0.01);
  assert.equal(PROFIL_GRBL_11H.toleranteArc, 0.002);
  // BLOCK_BUFFER_SIZE 16: inelul ține cel mult 15 blocuri (capul nu ajunge la coadă), cu cel care se execută.
  assert.deepEqual(PROFIL_GRBL_11H.firmware, { blocuriPlanificator: 15, pasPauza: 0.05, vitezaMinimaJonctiune: 0, avansMinim: 1 });
  assert.equal(PROFIL_GRBL_11H.sursa, 'implicit');
});

test('T2 (placa 3): linia de 200 mm la F1000, trapez: 200 / 16,667 + 16,667 / 100 = 12,1667 s (cronometrul: 12,0 ±0,5)', () => {
  const r = ok(estimeazaTimp(linii('G21 G90 G94', 'G1 X200 F1000'), profil()));
  aproape(r.total.secunde, 12.166666667, 1e-6, 'timpul');
  aproape(r.total.taiere, 200, 1e-9, 'tăierea');
  assert.equal(r.total.rapide, 0);
  assert.equal(r.blocuri, 1);
  assert.equal(r.liniiLimitate, 0);
});

test('aceeași linie pe implicitele GRBL ($110 = 500): avansul tăiat la 500 mm/min, 200 / 8,333 + 8,333 / 10 = 24,8333 s', () => {
  const r = ok(estimeazaTimp(linii('G1 X200 F1000'), PROFIL_GRBL_11H));
  aproape(r.total.secunde, 24.833333333, 1e-6, 'timpul');
  assert.equal(r.liniiLimitate, 1);
});

test('triunghi: 10 mm la F6000 cu a = 100 nu ajung la 100 mm/s (vârful √(aL) = 31,6): t = 2·√(10/100) = 0,63246 s', () => {
  const r = ok(estimeazaTimp(linii('G1 X10 F6000'), profil()));
  aproape(r.total.secunde, 0.632455532, 1e-6, 'timpul');
});

test('G0 în diagonală, limitat pe axe: u = (0,6; 0,8), viteza min(6000/0,6, 3000/0,8) = 3750 mm/min, a = min(1000/0,6, 1000/0,8) = 1250', () => {
  const r = ok(estimeazaTimp(linii('G0 X300 Y400'), profil({ v: [6000, 3000, 3000], a: [1000, 1000, 1000] })));
  // 500 / 62,5 + 62,5 / 1250 = 8 + 0,05.
  aproape(r.total.secunde, 8.05, 1e-6, 'timpul');
  aproape(r.total.rapide, 500, 1e-9, 'rapidele');
  assert.equal(r.total.taiere, 0);
});

test('colțul de 90° cu $11 = 0,01: v_j² = (a/sin 45°) · δ · s / (1 − s), s = √0,5, deci √2 + 2 = 3,4142 (v_j = 1,8478 mm/s)', () => {
  // Fiecare latură: 0 → 20 mm/s → v_j, L = 100, a = 100: 0,2 + (20 − v_j)/100 + (100 − 2 − (400 − v_j²)/200)/20 = 5,182376.
  const r = ok(estimeazaTimp(linii('G1 X100 F1200', 'G1 Y100'), profil()));
  aproape(r.total.secunde, 10.364751925, 1e-6, 'timpul');
  aproape(r.total.taiere, 200, 1e-9, 'tăierea');
});

test('întoarcerea la 180°: joncțiunea cu viteza minimă (0), deci două blocuri din repaus în repaus: 2 · (2,5 + 0,2) = 5,4 s', () => {
  const r = ok(estimeazaTimp(linii('G1 X50 F1200', 'G1 X0'), profil()));
  aproape(r.total.secunde, 5.4, 1e-6, 'timpul');
});

test('fereastra planificatorului (15 blocuri): 100 de segmente coliniare de 1 mm la F6000 nu trec de √(2·a·14) = 52,9 mm/s', () => {
  // Ieșirea blocului k: e(k)² = min(200·k, 2800, 200·(100 − k)). Urcarea și coborârea (14 blocuri fiecare) se
  // telescopează în √2800 / 100; cele 72 din mijloc urcă la √2900 și coboară: 2·(√2900 − √2800)/100 fiecare.
  const prog = ['G1 X1 F6000', ...Array.from({ length: 99 }, (_, i) => `G1 X${i + 2}`)];
  const r = ok(estimeazaTimp(linii(...prog), profil()));
  aproape(r.total.secunde, 2.407035989, 1e-6, 'timpul');
  assert.equal(r.blocuri, 100);
  // Cu o fereastră de 16, palierul ar fi √3000: 2,362988 s. Proba deosebește fereastra.
  const r16 = ok(estimeazaTimp(linii(...prog), profil({ blocuri: 16 })));
  aproape(r16.total.secunde, 2.362988144, 1e-6, 'fereastra 16');
});

test('arcul: semicercul de r = 10 cu $12 = 0,002 are floor(0,5·π·10 / √(0,002·(20 − 0,002))) = 78 de segmente', () => {
  // Coarda: 20·sin(π/156); suma: 31,413803 mm. Cu a = 10⁶ mm/s², rampele cer v/a = 10⁻⁵ s; joncțiunile (v_j > 70 mm/s) și
  // fereastra (oprirea în 5·10⁻⁵ mm) nu țin viteza de 10 mm/s.
  const r = ok(estimeazaTimp(linii('G2 X20 Y0 I10 J0 F600'), profil({ a: [1e6, 1e6, 1e6], pasi: 1e5 })));
  assert.equal(r.blocuri, 78);
  aproape(r.total.taiere, 31.413803094, 1e-4, 'coardele');
  aproape(r.total.secunde, 3.141390309, 1e-4, 'timpul');
  // G3 pe același cerc, de la (20, 0) la (0, 0): tot un semicerc.
  const r3 = ok(estimeazaTimp(linii('G0 X20', 'G3 X0 Y0 I-10 J0 F600'), profil({ a: [1e6, 1e6, 1e6], pasi: 1e5 })));
  assert.equal(r3.blocuri, 79);
});

test('arcul mic, cercul întreg (start = capăt: 2π) și arcul cu 2r ≤ $12, refuzat', () => {
  // r = 0,01: 0,5·π·0,01 / √(0,002·0,018) = 2,6 → 2 segmente.
  const mic = ok(estimeazaTimp(linii('G2 X0.02 Y0 I0.01 J0 F600'), profil({ pasi: 1e5 })));
  assert.equal(mic.blocuri, 2);
  // Sub un segment (floor = 0), mc_arc trimite o singură linie la capăt: sfertul de cerc cu r = $12 = 0,002 dă
  // 0,5·(π/2)·0,002 / √(0,002·0,002) = π/4 = 0,785 → 0, deci un bloc.
  assert.equal(ok(estimeazaTimp(linii('G2 X0.002 Y0.002 I0.002 J0 F600'), profil({ pasi: 1e5 }))).blocuri, 1);
  const cerc = ok(estimeazaTimp(linii('G0 X10', 'G3 X10 Y0 I-10 J0 F600'), profil({ a: [1e6, 1e6, 1e6], pasi: 1e5 })));
  // 2π·10 / √(0,002·19,998) = 314,16 → 314 de segmente, plus G0.
  assert.equal(cerc.blocuri, 1 + Math.floor(Math.PI * 10 / Math.sqrt(0.002 * (20 - 0.002))));
  // Și în sens orar (G2): atan2 dă 0, iar `≥ −ε` îl face −2π: același cerc, nu un arc de 0.
  const orar = ok(estimeazaTimp(linii('G0 X10', 'G2 X10 Y0 I-10 J0 F600'), profil({ a: [1e6, 1e6, 1e6], pasi: 1e5 })));
  assert.equal(orar.blocuri, cerc.blocuri);
  assert.ok(Math.abs(orar.total.taiere - cerc.total.taiere) < 1e-6, 'aceeași lungime');
  // Unde contează „− $12” din rădăcină: cercul întreg cu r = 0,003 are floor(π·0,003 / √(0,002·0,004)) = floor(3,33) = 3
  // segmente; fără el, floor(π·0,003 / √(0,002·0,006)) = 2.
  assert.equal(ok(estimeazaTimp(linii('G0 X0.003', 'G3 X0.003 Y0 I-0.003 J0 F600'), profil({ pasi: 1e5 }))).blocuri, 1 + 3);
  // Peste 65 535 de segmente (contorul uint16 din mc_arc): cercul de r = 1000 cu $12 = 0,000001 ar avea
  // floor(π·1000 / √(10⁻⁶·1999,999999)) = 70 248. Refuzat; cu $12 = 0,002 are 1 570.
  assert.equal(estimeazaTimp(linii('G0 X1000', 'G3 X1000 Y0 I-1000 J0 F600'), profil({ tol: 0.000001 })).ok, false);
  assert.equal(ok(estimeazaTimp(linii('G0 X1000', 'G3 X1000 Y0 I-1000 J0 F600'), profil())).blocuri, 1 + 1570);
  // 2r ≤ $12: în mc_arc rădăcina e dintr-un număr ≤ 0, iar conversia rezultatului în uint16 e nedefinită în C. Refuzat.
  const sub = estimeazaTimp(linii('G2 X0.002 Y0 I0.001 J0 F600'), profil({ pasi: 1e5 }));
  assert.equal(sub.ok, false);
  // Cu motivul lui, nu cu cel al contorului (rădăcina din 0 ar da și ea „Infinity de segmente”).
  if (!sub.ok) assert.match(sub.motiv, /sub jumătate din toleranța arcului/);
});

test('pauza G4: delay_sec numără pași de 50 ms, rotunjit în sus: P2 = 2,0 s, P2.001 = 2,05 s, P0.01 = 0,05 s', () => {
  const p = (s: string): number => ok(estimeazaTimp(linii(`G4 P${s}`), profil())).total.secunde;
  aproape(p('2'), 2, 1e-12, 'P2');
  aproape(p('2.000'), 2, 1e-12, 'P2.000');
  aproape(p('2.001'), 2.05, 1e-9, 'P2.001');
  aproape(p('0.01'), 0.05, 1e-9, 'P0.01');
  const r = ok(estimeazaTimp(linii('M3 S18000', 'G4 P2.000', 'M5'), profil()));
  aproape(r.total.pauze, 2, 1e-12, 'pauza după M3 (T2: 2,0 ±0,3)');
  aproape(r.total.secunde, 2, 1e-12, 'M3 și M5 nu costă timp, doar opresc mișcarea');
});

test('M3 / M5 și S cu axul pornit golesc bufferul: două linii coliniare de 100 mm devin două opriri (10,4 s, nu 10,2)', () => {
  aproape(ok(estimeazaTimp(linii('G1 X100 F1200', 'G1 X200'), profil())).total.secunde, 10.2, 1e-6, 'fără oprire');
  aproape(ok(estimeazaTimp(linii('G1 X100 F1200', 'M3 S1000', 'G1 X200'), profil())).total.secunde, 10.4, 1e-6, 'M3');
  aproape(ok(estimeazaTimp(linii('M3 S1000', 'G1 X100 F1200', 'M5', 'G1 X200'), profil())).total.secunde, 10.4, 1e-6, 'M5');
  aproape(ok(estimeazaTimp(linii('M3 S1000', 'G1 X100 F1200', 'S2000', 'G1 X200'), profil())).total.secunde, 10.4, 1e-6, 'S nou');
  // Aceeași turație nu schimbă nimic; S cu axul oprit nici atât.
  aproape(ok(estimeazaTimp(linii('M3 S1000', 'G1 X100 F1200', 'S1000', 'G1 X200'), profil())).total.secunde, 10.2, 1e-6, 'S egal');
  aproape(ok(estimeazaTimp(linii('G1 X100 F1200', 'S2000', 'G1 X200'), profil())).total.secunde, 10.2, 1e-6, 'S cu axul oprit');
  aproape(ok(estimeazaTimp(linii('G1 X100 F1200', 'G4 P0', 'G1 X200'), profil())).total.secunde, 10.4, 1e-6, 'G4 P0');
  aproape(ok(estimeazaTimp(linii('G1 X100 F1200', 'M8', 'G1 X200', 'M9'), profil())).total.secunde, 10.4, 1e-6, 'răcirea (M8)');
  // M3 și M4 sunt stări diferite ale axului (SPINDLE_ENABLE_CW / CCW): trecerea golește bufferul (recenzia din 18.10).
  aproape(ok(estimeazaTimp(linii('M3 S1000', 'G1 X100 F1200', 'M4', 'G1 X200'), profil())).total.secunde, 10.4, 1e-6, 'M3 → M4');
  aproape(ok(estimeazaTimp(linii('M3 S1000', 'G1 X100 F1200', 'M3', 'G1 X200'), profil())).total.secunde, 10.2, 1e-6, 'M3 → M3');
});

test('M2 / M30 resetează modurile (gcode.c, PROGRAM_FLOW_COMPLETED): G1, G90, axul și răcirea oprite; F rămâne', () => {
  // G91, apoi M30: X10 de după e absolut, deci același loc (bloc gol): doar primii 10 mm, 1 + 0,1 s.
  aproape(ok(estimeazaTimp(linii('G91', 'G1 X10 F600', 'M30', 'G1 X10'), profil())).total.secunde, 1.1, 1e-6, 'G90 după M30');
  // Axul oprit după M30: S nou nu mai golește bufferul.
  aproape(ok(estimeazaTimp(linii('M3 S1000', 'M30', 'G1 X100 F1200', 'S2000', 'G1 X200'), profil())).total.secunde, 10.2, 1e-6, 'axul');
  // Răcirea oprită după M30: M9 nu mai e o schimbare.
  aproape(ok(estimeazaTimp(linii('M8', 'M30', 'G1 X100 F1200', 'M9', 'G1 X200'), profil())).total.secunde, 10.2, 1e-6, 'răcirea');
  // Modul trece pe G1: o axă fără F, după un program numai cu G0, e error:22.
  const g1 = estimeazaTimp(linii('G0 X1', 'M30', 'X2'), profil());
  assert.equal(g1.ok, false);
  if (!g1.ok) assert.equal(g1.linie, 3);
  // F rămâne: același X2 cu F dat înainte de M30 trece.
  assert.equal(estimeazaTimp(linii('G1 X1 F600', 'G0 X2', 'M30', 'X3'), profil()).ok, true);
});

test('cititorul ca protocol.c: `/` ignorat, paranteza neînchisă ține până la capăt, cel mult 79 de caractere utile', () => {
  const baza = ok(estimeazaTimp(linii('G1 X10 F600', 'G1 Y10'), profil())).total.secunde;
  aproape(ok(estimeazaTimp(linii('/G1 X10 F600', 'G1 Y10'), profil())).total.secunde, baza, 1e-12, '/');
  aproape(ok(estimeazaTimp(linii('G1 X10 F600 (fără capăt Y999', 'G1 Y10'), profil())).total.secunde, baza, 1e-12, 'paranteza');
  const utile = (n: number): string => `G1X${'0'.repeat(n - 4)}1`;
  assert.equal(utile(79).length, 79);
  assert.equal(estimeazaTimp(linii('G1 F100', utile(79)), profil()).ok, true);
  const lunga = estimeazaTimp(linii('G1 F100', utile(80)), profil());
  assert.equal(lunga.ok, false);
  if (!lunga.ok) assert.equal(lunga.linie, 2);
  // Spațiile și comentariile nu se numără (protocol.c le scoate înainte de buffer).
  assert.equal(estimeazaTimp(linii('G1 F100', `${utile(79)} (${'x'.repeat(40)})`), profil()).ok, true);
});

test('plafonul blocurilor (T23): peste el, estimarea refuză, cu linia; sub el, nimic nu se schimbă', () => {
  const prog = linii('G1 X1 F600', 'G1 X2', 'G1 X3', 'G1 X4');
  assert.equal(ok(estimeazaTimp(prog, profil(), [], 4)).blocuri, 4);
  const peste = estimeazaTimp(prog, profil(), [], 3);
  assert.equal(peste.ok, false);
  if (!peste.ok) assert.equal(peste.linie, 4);
});

test('tăierea, apoi rapida coliniară mai rapidă: intrarea rapidei e limitată de viteza nominală a tăierii (10 mm/s): 10,05 + 1,905', () => {
  const r = ok(estimeazaTimp(linii('G1 X100 F600', 'G0 X200'), profil({ v: [6000, 6000, 6000] })));
  aproape(r.total.secunde, 11.955, 1e-6, 'timpul');
});

test('avansul minim (MINIMUM_FEED_RATE = 1 mm/min): F0.5 merge cu 1 mm/min, 1 mm în 60 + (1/60)/100 s', () => {
  aproape(ok(estimeazaTimp(linii('G1 X1 F0.5'), profil())).total.secunde, 60.000166667, 1e-6, 'timpul');
});

test('plonjarea: F300 pe Z cu $112 = 200 și $122 = 50: 10 / 3,333 + 3,333 / 50 = 3,0667 s, un bloc limitat', () => {
  const r = ok(estimeazaTimp(linii('G1 Z-10 F300'), profil({ v: [10000, 10000, 200], a: [100, 100, 50] })));
  aproape(r.total.secunde, 3.066666667, 1e-6, 'timpul');
  assert.equal(r.liniiLimitate, 1);
});

test('cuantizarea pe pași (250 / mm): X0.001 e un bloc gol, X0.003 e un pas (0,004 mm): 2·√(0,004/10) = 0,04 s', () => {
  const gol = ok(estimeazaTimp(linii('G1 X0.001 F600'), PROFIL_GRBL_11H));
  assert.equal(gol.blocuri, 0);
  assert.equal(gol.total.secunde, 0);
  const pas = ok(estimeazaTimp(linii('G1 X0.003 F600'), PROFIL_GRBL_11H));
  assert.equal(pas.blocuri, 1);
  aproape(pas.total.secunde, 0.04, 1e-9, 'un pas');
  aproape(pas.total.taiere, 0.004, 1e-12, 'lungimea din pași');
});

test('rapida, apoi tăierea coliniară mai lentă: intrarea limitată de viteza nominală mai mică (10 mm/s): 1,905 + 10,05 = 11,955 s', () => {
  const r = ok(estimeazaTimp(linii('G0 X100', 'G1 X200 F600'), profil({ v: [6000, 6000, 6000] })));
  aproape(r.total.secunde, 11.955, 1e-6, 'timpul');
  aproape(r.total.rapide, 100, 1e-9, 'rapidele');
  aproape(r.total.taiere, 100, 1e-9, 'tăierea');
});

test('unitățile și modul: G20 (1 in la 10 in/min) și G91 (două pași de 10 mm, coliniari)', () => {
  const r = ok(estimeazaTimp(linii('G20 G1 X1 F10'), profil()));
  aproape(r.total.secunde, 6.042333333, 1e-6, 'G20');
  aproape(r.total.taiere, 25.4, 1e-9, 'G20, lungimea');
  aproape(ok(estimeazaTimp(linii('G91 G1 X10 F600', 'X10'), profil())).total.secunde, 20 / 10 + 10 / 100, 1e-6, 'G91');
});

test('porțiunile: fiecare linie în porțiunea ei, suma lor e totalul; pauza la linia ei', () => {
  const text = linii('(antet)', 'G0 Z5', 'M3 S1000', 'G4 P1', '(op 1)', 'G1 X100 F1200', '(op 2)', 'G1 Y100', '(final)', 'G0 Z10', 'M5');
  const r = ok(estimeazaTimp(text, profil(), [4, 6, 8]));
  assert.equal(r.portiuni.length, 4);
  const [p0, p1, p2, p3] = r.portiuni;
  assert.ok(p0 && p1 && p2 && p3);
  aproape(p0.pauze, 1, 1e-12, 'pauza e a pornirii');
  aproape(p0.rapide, 5, 1e-9, 'G0 Z5 e al pornirii');
  aproape(p1.taiere, 100, 1e-9, 'op 1');
  aproape(p2.taiere, 100, 1e-9, 'op 2');
  aproape(p3.rapide, 5, 1e-9, 'retragerea e a finalului');
  const suma = r.portiuni.reduce((s, p) => s + p.secunde, 0);
  aproape(suma, r.total.secunde, 1e-9, 'suma porțiunilor');
  // Colțul dintre op 1 și op 2 e în timpul blocurilor, nu se pierde: același total ca fără porțiuni.
  aproape(ok(estimeazaTimp(text, profil())).total.secunde, r.total.secunde, 1e-12, 'porțiunile nu schimbă totalul');
});

test('ce nu se poate estima e refuzat cu linia: planul G18, arcul cu R, M0 (timpul omului), M6, G93, un cuvânt necunoscut', () => {
  for (const [text, linie] of [
    [linii('G21', 'G18'), 2], [linii('G2 X10 R5 F600'), 1], [linii('G1 X1 F100', 'M0'), 2], [linii('M6 T2'), 1],
    [linii('G93 G1 X1 F1'), 1], [linii('G1 X1 F100 Q3'), 1], [linii('G1 X1'), 1], [linii('G2 X10 F100'), 1],
    [linii('G1 X1 Y F100'), 1], [linii('G1 XX1 F100'), 1], [linii('G4'), 1], [linii('G1 X1 F0'), 1],
    // error:4: valorile negative la F, S, P, T, N.
    [linii('G1 X1 F-100'), 1], [linii('S-100'), 1], [linii('T-1'), 1],
    // error:33: startul la 4 mm de centru, capătul la 6 mm.
    [linii('G21', 'G2 X10 Y0 I4 J0 F600'), 2],
  ] as const) {
    const r = estimeazaTimp(text, profil());
    assert.equal(r.ok, false, text);
    if (!r.ok) assert.equal(r.linie, linie, `${text}: ${r.motiv}`);
  }
});
