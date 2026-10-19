/**
 * Oracolul simulării (`test/oracles/simulare.ts`), partea care nu cere corpusul mare:
 * - cititorul G-code: dialectul postului (placa 1, cu valori pe hârtie scrise de mână), R pozitiv / negativ = același
 *   arc ca I/J, G91, G20, comentariile, liniile modale, deplasarea, poziția necunoscută, și REFUZURILE, fiecare cu
 *   numărul liniei;
 * - grila (indexul, centrul celulei, `sus`), scula (validarea, silueta față de formulele de hârtie);
 * - MARTORII COMPARATORULUI: o celulă ridicată cu 20 nm e prinsă, cu 5 nm nu; o celulă coborâtă peste marjă e prinsă,
 *   sub ea nu; oracolul cu div = 1 judecat cu marja lui div 8 iese din marjă; podeaua și celula de lângă perete nu sunt
 *   luate drept perete (treptele mici: `simulare-oracol.pereti.test.ts`); NaN;
 * - funcțiile de măsură pe câmpuri exacte;
 * - corpusul: piesele cerute, împărțirea pe fișiere, convenția de legătură (textul citit = mutările + legăturile),
 *   cele 7 otrăvuri.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  campDinFunctie, citesteGcode, compara, dimensiuni, grilaFereastra, judeca, latimeRadiala, marjaEsantionare, minim,
  sectiuneBila, silueta, unghiV, valideazaScula, verificaHartie,
  type GrilaOracol, type MutareOracol, type P3, type SculaOracol,
} from '../oracles/simulare.ts';
import { CAZURI_SIMULARE, MARTORI_GRESITI, dArc, dSeg, numar, scrieGcode, type MutareCaz } from '../oracles/simulare.cazuri.ts';
import { PIESE_FISIER_1, PIESE_FISIER_2 } from './ajutor-simulare-oracol.ts';

const FLAT6: SculaOracol = { tip: 'plata', diametru: 6 };
const V60: SculaOracol = { tip: 'v', diametru: 6, unghi: 60 };
const SQRT3 = Math.sqrt(3);
const aproape = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;
const egalP = (a: readonly number[], b: readonly number[], tol: number): boolean => a.length === b.length && a.every((v, k) => aproape(v, b[k]!, tol));

/** O poziție cunoscută (X0 Y0 Z5) înaintea liniilor de probă: liniile de probă încep la linia 4. */
const ANTET = 'G21 G90 G17\nG0 Z5\nG0 X0 Y0\n';

// ---------------------------------------------------------------------------------------------------------------
// Cititorul.

test('cititorul: placa 1 (textul postului GRBL 1.1) se citește întreg, fără refuz, cu mutările și arcele lui', () => {
  const text = readFileSync(new URL('../placi/placa-01/placa-01-A.nc', import.meta.url), 'utf8');
  const m = citesteGcode(text);
  // Primele G0 Z5 și G0 X82 Y50 pornesc din poziția necunoscută, deasupra feței: nu apar. Prima mutare e coborârea
  // de la linia 13; apoi 2 + 1 (arcele, urcarea), a doua trecere 1 + 2 + 1, insula 1 + 1 + 8 + 1.
  assert.equal(m.length, 19);
  assert.equal(m[0]!.linie, 13);
  assert.deepEqual(m[0]!.a, [82, 50, 5]);
  assert.deepEqual(m[0]!.b, [82, 50, -4]);
  const arce = m.filter((x): x is Extract<MutareOracol, { tip: 'arc' }> => x.tip === 'arc');
  assert.equal(arce.length, 8);
  assert.ok(arce.slice(0, 4).every((x) => x.sens === 'trigonometric' && egalP(x.centru, [70, 50], 1e-12)), 'arcele găurii au centrul în (70, 50)');
  assert.ok(arce.slice(4).every((x) => x.sens === 'orar'), 'colțurile insulei sunt G2');
  assert.deepEqual(arce[4]!.centru, [20, 20]);
});

test('cititorul: placa 1 judecată — valorile de hârtie scrise de mână în câteva celule', () => {
  const text = readFileSync(new URL('../placi/placa-01/placa-01-A.nc', import.meta.url), 'utf8');
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 140, inaltime: 100, celula: 0.1 };
  const o = judeca(text, g, FLAT6);
  const z = (x: number, y: number): number => o.z[Math.floor(y / 0.1) * o.nx + Math.floor(x / 0.1)]!;
  // Gaura: cercul de rază 12 din (70, 50) cu freza Ø6, a doua trecere la −8: inelul 9 ≤ ρ ≤ 15. Insula: dreptunghiul
  // 17..123 × 17..83 cu colțuri r 3, la −3: fâșia de 3 mm de o parte și de alta a laturilor.
  assert.equal(z(82.05, 50.05), -8, 'pe traseul găurii (ρ = 12,05)');
  assert.equal(z(55.05, 50.05), -8, 'ρ = 14,95, în inel');
  assert.equal(z(54.95, 50.05), 0, 'ρ = 15,05, în afara inelului și departe de insulă');
  assert.equal(z(70.05, 50.05), 0, 'miezul găurii rămâne (traseul e doar conturul)');
  assert.equal(z(17.05, 50.05), -3, 'pe latura stângă a insulei');
  assert.equal(z(14.05, 50.05), -3, 'la 2,95 de latură');
  assert.equal(z(13.95, 50.05), 0, 'la 3,05 de latură');
  assert.equal(z(70.05, 17.05), -3, 'pe latura de jos');
  assert.equal(z(17.55, 17.55), -3, 'în colțul rotunjit (la 0,47 de arcul de rază 3 din (20, 20))');
  assert.equal(minim(o.z), -8);
});

test('cititorul: R pozitiv și R negativ dau centrul arcului I/J (arcul mic la G2, arcul mare la G3 cu R−15)', () => {
  const [sx, sy] = [40 + 25 * Math.cos(Math.PI / 6), 40 + 25 * Math.sin(Math.PI / 6)];
  const [ex, ey] = [40 + 25 * Math.cos((2 * Math.PI) / 3), 40 + 25 * Math.sin((2 * Math.PI) / 3)];
  const cuR = citesteGcode(`${ANTET}G0 X${numar(ex)} Y${numar(ey)}\nG1 Z-3\nG2 X${numar(sx)} Y${numar(sy)} R25\n`);
  const cuIJ = citesteGcode(`${ANTET}G0 X${numar(ex)} Y${numar(ey)}\nG1 Z-3\nG2 X${numar(sx)} Y${numar(sy)} I${numar(40 - ex)} J${numar(40 - ey)}\n`);
  const a = cuR.at(-1)!, b = cuIJ.at(-1)!;
  assert.ok(a.tip === 'arc' && b.tip === 'arc' && a.sens === 'orar');
  assert.ok(egalP(a.centru, [40, 40], 1e-8) && egalP(b.centru, [40, 40], 1e-8), `${a.centru} / ${b.centru}`);
  // G3 R−15 de la 0° la 270° în jurul lui (30, 30): coarda (45, 30) → (30, 15); R negativ = centrul de partea cealaltă.
  // Regula, independentă de formula GRBL: arcul mic are centrul la stânga coardei la G3 și la dreapta la G2; R negativ
  // îl mută de partea cealaltă. Coarda (30, 15) → (45, 30) are stânga spre (30, 30) și dreapta spre (45, 15).
  const mare = citesteGcode(`${ANTET}G0 X45 Y30\nG1 Z-3\nG3 X30 Y15 R-15\nG2 X45 Y30 R15\nG3 X30 Y15 R15\nG2 X45 Y30 R-15\n`);
  const asteptate: readonly (readonly [string, readonly [number, number]])[] = [
    ['G3 R−15 (45, 30) → (30, 15)', [30, 30]], ['G2 R15 (30, 15) → (45, 30)', [45, 15]],
    ['G3 R15 (45, 30) → (30, 15)', [45, 15]], ['G2 R−15 (30, 15) → (45, 30)', [30, 30]],
  ];
  asteptate.forEach(([nume, c], k) => {
    const m = mare.at(k - 4)!;
    assert.ok(m.tip === 'arc' && egalP(m.centru, c, 1e-12), `${nume}: ${m.tip === 'arc' ? m.centru : m.tip}`);
  });
  // Semicercul cu R = jumătate din coardă: centrul e mijlocul.
  const semi = citesteGcode(`${ANTET}G1 Z-1\nG2 X10 Y0 R5\n`).at(-1)!;
  assert.ok(semi.tip === 'arc' && egalP(semi.centru, [5, 0], 1e-12));
});

test('cititorul: G91 (relativ), G20 (inci), deplasarea și o linie scrisă urât dau aceleași mutări ca programul simplu', () => {
  const simplu = citesteGcode(`${ANTET}G1 Z-2\nG1 X10 Y5 Z-3\nG3 X20 Y5 I5 J0\nG1 X20 Y0\n`);
  const relativ = citesteGcode(`${ANTET}G91 G1 Z-7\nG1 X10 Y5 Z-1\nG3 X10 Y0 I5 J0\nG1 Y-5\nG90\n`);
  const inci = citesteGcode(`G20 G90 G17\nG0 Z${5 / 25.4}\nG0 X0 Y0\nG1 Z${-2 / 25.4}\nG1 X${10 / 25.4} Y${5 / 25.4} Z${-3 / 25.4}\nG3 X${20 / 25.4} Y${5 / 25.4} I${5 / 25.4} J0\nG1 X${20 / 25.4} Y0\n`);
  const cmp = (x: readonly MutareOracol[], nume: string, ultimaModala = false): void => {
    assert.equal(x.length, simplu.length, `${nume}: ${x.length} mutări`);
    x.forEach((m, k) => {
      const s = simplu[k]!;
      if (ultimaModala && k === x.length - 1) return;
      assert.equal(m.tip, s.tip, `${nume}, mutarea ${k}`);
      assert.ok(egalP(m.a, s.a, 1e-12) && egalP(m.b, s.b, 1e-12), `${nume}, mutarea ${k}: ${m.a} → ${m.b} în loc de ${s.a} → ${s.b}`);
      if (m.tip === 'arc' && s.tip === 'arc') assert.ok(egalP(m.centru, s.centru, 1e-12) && m.sens === s.sens, `${nume}, arcul ${k}`);
    });
  };
  cmp(relativ, 'G91');
  cmp(inci, 'G20');
  // „X20 Y0” după G3 e tot G3 (modal), dar fără I/J: se refuză.
  assert.throws(() => citesteGcode('G21 G90 G17\nG0 Z5\nG0 X0 Y0\nG1 Z-2\nG1 X10 Y5 Z-3\nG3 X20 Y5 I5 J0\nX20 Y0\n'), /linia 7: arc fără I\/J și fără R/);
  const uratBun = citesteGcode('n10 g21g90 (unitati)  g17\r\nG0Z5;sus\r\ng0 x0 y 0 ( start )\r\nG01 Z-2.\r\nG1X10Y5Z-3\r\ng3x20y5i5j0 (arc)\r\nG1 X20 Y0 ; înapoi la G1\r\n');
  cmp(uratBun, 'urât');
  const mutat = citesteGcode(`${ANTET}G1 Z-2\nG1 X10 Y5 Z-3\nG3 X20 Y5 I5 J0\nG1 X20 Y0\n`, [100, -50, 18]);
  mutat.forEach((m, k) => {
    const s = simplu[k]!;
    assert.ok(egalP(m.a, [s.a[0] + 100, s.a[1] - 50, s.a[2] + 18], 1e-12), `deplasarea, mutarea ${k}`);
  });
});

test('cititorul: liniile modale doar cu coordonate (G1, și G2 cu I/J pe fiecare linie); G80 din antetul postului', () => {
  const m = citesteGcode(`G90 G17 G21 G94\nG40 G49 G80\nG54\nG0 Z5\nG0 X0 Y0\nG1 Z-1 F300\nX10\nY10\nG2 X20 Y0 I10 J0\nX10 Y-10 I-10 J0\n`);
  assert.deepEqual(m.map((x) => x.tip), ['linie', 'linie', 'linie', 'arc', 'arc']);
  assert.deepEqual(m[2]!.b, [10, 10, -1]);
  const ultim = m[4]!;
  assert.ok(ultim.tip === 'arc' && ultim.sens === 'orar' && egalP(ultim.centru, [10, 0], 1e-12));
});

test('cititorul: din poziția necunoscută, mutările de deasupra feței se sar; prima mutare cu startul cunoscut apare', () => {
  const m = citesteGcode('G0 X5\nG0 Y5\nG0 Z10\nG1 Z-1\n');
  assert.equal(m.length, 1);
  assert.deepEqual(m[0]!.a, [5, 5, 10]);
  // Cu fața la Z = 20 (al treilea argument), Z10 e deja sub față: refuz.
  assert.throws(() => citesteGcode('G0 X5\nG0 Y5\nG0 Z10\n', [0, 0, 0], 20), /linia 3: coboară sub fața plăcii/);
});

const REFUZURI: readonly (readonly [string, string, number, RegExp])[] = [
  ['planul G18', 'G18 G2 X10 Z0 I5', 4, /G18/],
  ['planul G19', 'G19', 4, /G19/],
  ['axa A', 'G1 X10 A90', 4, /axa A/],
  ['axa B', 'G0 B1', 4, /axa B/],
  ['K (arc în alt plan)', 'G2 X10 Y0 I5 K0', 4, /K: arcele/],
  ['G28', 'G28', 4, /G28/],
  ['G92', 'G92 X0 Y0', 4, /G92/],
  ['G53', 'G53 G0 X0', 4, /G53/],
  ['G55', 'G55', 4, /G55 nu e înțeles/],
  ['G41', 'G41 D1', 4, /compensarea razei/],
  ['G43.1', 'G43.1 Z1', 4, /G43\.1/],
  ['G38.2', 'G38.2 Z-5', 4, /G38\.2 nu e înțeles/],
  ['G93', 'G93', 4, /G93/],
  ['M6', 'M6', 4, /M6/],
  ['T', 'T2', 4, /T: schimbarea sculei/],
  ['M7', 'M7', 4, /M7 nu e înțeles/],
  ['arc fără I/J/R', 'G1 Z-1\nG2 X10 Y0', 5, /fără I\/J și fără R/],
  ['arc cu R și I/J', 'G2 X10 Y0 I5 R5', 4, /R și cu I\/J/],
  ['R mai mic decât jumătate din coardă', 'G2 X10 Y0 R4.999', 4, /error:33/],
  ['R cu ținta = startul', 'G2 X0 Y0 R5', 4, /ținta = startul/],
  ['ținta arcului departe de cerc', 'G2 X10 Y0 I3 J0', 4, /nu e pe cerc/],
  ['I = J = 0', 'G2 X10 Y0 I0 J0', 4, /raza zero/],
  ['arc fără X și Y', 'G2 Z-1 I5', 4, /fără X sau Y/],
  ['cuvânt dublat', 'G1 X1 X2', 4, /X apare de două ori/],
  ['două mișcări pe o linie', 'G0 G1 X1', 4, /grupul „miscare”/],
  ['două coduri M din același grup', 'M3 M5', 4, /grupul „ax”/],
  ['G4 fără P', 'G4', 4, /G4 fără P/],
  ['P fără G4', 'G1 X1 P2', 4, /P fără G4/],
  ['G4 cu axe', 'G4 P1 X1', 4, /G4 cu mișcare/],
  ['număr lipsă', 'G1 X', 4, /număr lipsă/],
  ['două puncte zecimale', 'G1 X1.2.3', 4, /se aștepta o literă/],
  ['axe sub G80', 'G80\nX1', 5, /G80/],
  ['I/J cu G1', 'G1 X1 I1', 4, /I\/J\/R cu G1/],
  ['cuvinte după M30', 'M30\nG0 X1', 5, /după sfârșitul programului/],
  ['comentariu neînchis', 'G1 X1 (fără capăt', 4, /neînchis/],
  ['paranteză închisă fără deschidere', 'G1 X1)', 4, /fără „\(”/],
  ['ștergerea de bloc', '/G1 X1', 4, /se aștepta o literă, nu „\/”/],
  ['procent', '%', 4, /se aștepta o literă, nu „%”/],
  ['comanda $', '$H', 4, /comenzile `\$`/],
  ['literă necunoscută', 'G1 X1 Q2', 4, /litera Q/],
  ['G neîntreg', 'G2.5 X1', 4, /G2\.5 nu e înțeles/],
  ['G negativ cu zecimale ciudate', 'G1.05 X1', 4, /G1\.05 nu există/],
];

for (const [nume, linii, nr, mesaj] of REFUZURI) {
  test(`cititorul refuză: ${nume} (linia ${nr})`, () => {
    assert.throws(() => citesteGcode(ANTET + linii + '\n'), (e: unknown) => {
      const m = (e as Error).message;
      assert.match(m, new RegExp(`^linia ${nr}: `), `numărul liniei: „${m}”`);
      assert.match(m, mesaj, `motivul: „${m}”`);
      return true;
    });
  });
}

test('cititorul refuză din poziția necunoscută: coborârea sub față, arcul și Z-ul relativ', () => {
  assert.throws(() => citesteGcode('G1 Z-1\n'), /^Error: linia 1: coboară sub fața plăcii/);
  assert.throws(() => citesteGcode('G0 X10 Y10\nG1 Z-1\n'), /linia 2: coboară sub fața plăcii/);
  assert.throws(() => citesteGcode('G0 Z5\nG2 X10 Y0 I5 J0\n'), /linia 2: arc dintr-o poziție necunoscută/);
  assert.throws(() => citesteGcode('G91 G0 Z-1\n'), /linia 1: Z relativ \(G91\) dintr-un Z necunoscut/);
  // X relativ dintr-un X necunoscut rămâne necunoscut: deasupra feței nu se refuză și nu se simulează; sub față, refuz.
  assert.deepEqual(citesteGcode('G0 Z5\nG91 G0 X10\nG90 G0 Y0\nG0 Z3\n'), []);
  assert.throws(() => citesteGcode('G0 Z5\nG91 G0 X10\nG90 G0 Y0\nG1 Z-1\n'), /linia 4: coboară sub fața plăcii/);
});

// ---------------------------------------------------------------------------------------------------------------
// Grila, scula, judecata.

test('grila: nx = ceil(lățime / celulă − 1e-9) și la fel ny, pe valorile corpusului', () => {
  assert.deepEqual(dimensiuni({ x0: 0, y0: 0, latime: 60, inaltime: 40, celula: 0.05 }), { nx: 1200, ny: 800 });
  assert.deepEqual(dimensiuni({ x0: 0, y0: 0, latime: 2440, inaltime: 1220, celula: 0.25 }), { nx: 9760, ny: 4880 });
  assert.deepEqual(dimensiuni({ x0: 0, y0: 0, latime: 2, inaltime: 1, celula: 0.002 }), { nx: 1000, ny: 500 });
  assert.deepEqual(dimensiuni({ x0: 0, y0: 0, latime: 1.01, inaltime: 0.99, celula: 0.05 }), { nx: 21, ny: 20 });
});

test('grila: celula (i, j) are centrul în (x0 + (i + 0,5)·c, y0 + (j + 0,5)·c) și indexul j·nx + i', () => {
  // O freză plată de Ø0,02 coborâtă exact în centrul celulei (3, 2) a unei grile cu originea în (1, 2): doar ea e tăiată.
  const g: GrilaOracol = { x0: 1, y0: 2, latime: 1, inaltime: 1, celula: 0.1 };
  const o = judeca('G0 Z1\nG0 X1.35 Y2.25\nG1 Z-0.5\nG0 Z1\n', g, { tip: 'plata', diametru: 0.02 });
  const taiate = [...o.z.keys()].filter((k) => o.z[k]! < 0);
  assert.deepEqual(taiate, [2 * o.nx + 3]);
  assert.equal(o.z[2 * o.nx + 3], -0.5);
});

test('grila: `sus` e fața plăcii (celulele netăiate) și `deplasare` mută programul pe grilă', () => {
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 10, inaltime: 10, celula: 0.1, sus: 10 };
  const o = judeca('G0 Z15\nG0 X5 Y5\nG1 Z7\nG0 Z15\n', g, FLAT6);
  assert.equal(o.z[0], 10);
  assert.equal(o.z[50 * o.nx + 50], 7);
  assert.equal(o.varf, 7);
  // Același program scris cu Z0 jos (fața la Z18) și originea în (−20, −30): deplasarea (20, 30, −18) îl aduce înapoi.
  const g0: GrilaOracol = { x0: 0, y0: 0, latime: 10, inaltime: 10, celula: 0.1 };
  const a = judeca('G0 Z5\nG0 X5 Y5\nG1 Z-3\nG1 X8 Y6\nG0 Z5\n', g0, V60);
  const b = judeca('G0 Z23\nG0 X-15 Y-25\nG1 Z15\nG1 X-12 Y-24\nG0 Z23\n', g0, V60, { deplasare: [20, 30, -18] });
  assert.ok(a.z.every((v, k) => aproape(v, b.z[k]!, 1e-12)), 'câmpul deplasat diferă');
  assert.ok(minim(a.z) < -2.9);
});

test('judecata: capetele mutărilor sunt eșantioane, chiar și al ultimei mutări, fără ridicare după ea', () => {
  // Altfel capătul de jos e acoperit doar de startul mutării următoare: o mutare finală sub față ar rămâne cu un pas
  // mai sus (supraviețuitorul unei mutații a oracolului, prins aici).
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 10, inaltime: 10, celula: 0.05 };
  assert.equal(minim(judeca('G0 Z5\nG0 X5 Y5\nG1 Z-1\n', g, FLAT6).z), -1, 'linia');
  assert.equal(minim(judeca('G0 Z5\nG0 X5 Y5\nG1 Z-1\nG2 X7 Y5 Z-2 I1 J0\n', g, FLAT6).z), -2, 'arcul');
});

test('grila: sub-grila unei ferestre are aceleași centre de celule ca grila mare', () => {
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 2440, inaltime: 1220, celula: 0.25 };
  const { grila, i0, j0 } = grilaFereastra(g, [700, 480, 760, 540]);
  const d = dimensiuni(grila);
  assert.deepEqual([i0, j0, d.nx, d.ny], [2800, 1920, 240, 240]);
  assert.ok(aproape(grila.x0 + 0.5 * 0.25, 0 + (i0 + 0.5) * 0.25, 1e-9) && aproape(grila.y0, 480, 1e-12));
});

test('scula: validarea refuză diametrul, unghiul și profilul fără sens', () => {
  assert.throws(() => valideazaScula({ tip: 'plata', diametru: 0 }), /diametrul/);
  assert.throws(() => valideazaScula({ tip: 'v', diametru: 6, unghi: 180 }), /unghiul/);
  assert.throws(() => valideazaScula({ tip: 'profil', diametru: 10, puncte: [[0, 0.1], [5, 3]] }), /primul punct/);
  assert.throws(() => valideazaScula({ tip: 'profil', diametru: 10, puncte: [[0, 0], [2, 1], [2, 2], [5, 3]] }), /nu crește strict/);
  assert.throws(() => valideazaScula({ tip: 'profil', diametru: 10, puncte: [[0, 0], [2, 1], [5, 0.5]] }), /h scade/);
  assert.throws(() => valideazaScula({ tip: 'profil', diametru: 10, puncte: [[0, 0], [4, 3]] }), /D\/2/);
  assert.throws(() => judeca(ANTET, { x0: 0, y0: 0, latime: 1, inaltime: 1, celula: 0.1 }, FLAT6, { div: 0 }), /div/);
});

test('scula: silueta oracolului (cos/asin, cos/sin) față de formulele de hârtie (Pitagora, √3, max)', () => {
  const bila = silueta({ tip: 'bila', diametru: 6 }), v90 = silueta({ tip: 'v', diametru: 12, unghi: 90 });
  const v60 = silueta(V60), prof = silueta({ tip: 'profil', diametru: 10, puncte: [[0, 0], [2, 0], [5, 3]] });
  for (const r of [0, 0.3, 1, 2, 2.5, 2.9, 3]) {
    assert.ok(aproape(bila.h(r), 3 - Math.sqrt(9 - r * r), 1e-12), `bila la r = ${r}`);
    assert.ok(aproape(v90.h(r), r, 1e-12), `V90 la r = ${r}`);
    assert.ok(aproape(v60.h(r), SQRT3 * r, 1e-12), `V60 la r = ${r}`);
    assert.ok(aproape(prof.h(r), Math.max(0, r - 2), 1e-12), `profilul la r = ${r}`);
  }
  assert.ok(aproape(prof.h(5), 3, 1e-12));
});

test('marja: pe o rampă cu V, marja rulării e s_z + L·s_xy/2, sub marginea de sus pas·(1 + L/2)', () => {
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 20, inaltime: 10, celula: 0.05 };
  const o = judeca(`${ANTET}G0 X2 Y5\nG1 Z0\nG1 X18 Y5 Z-1\n`, g, V60);
  // n = ceil(16 / 0,00625) = 2560; s_z = 1/2560, s_xy = 16/2560; L = √3.
  assert.ok(aproape(o.marja, 1 / 2560 + (SQRT3 * 16) / 2560 / 2, 1e-15), `${o.marja}`);
  assert.ok(o.marja < marjaEsantionare(V60, o.pas, 1));
  assert.equal(marjaEsantionare({ tip: 'plata', diametru: 6 }, 0.00625), 0.00625);
});

// ---------------------------------------------------------------------------------------------------------------
// Martorii comparatorului, pe o piesă mică: V60 la −1 pe o linie oblică (centrele celulelor nu cad pe eșantioane).

const G_MIC: GrilaOracol = { x0: 0, y0: 0, latime: 20, inaltime: 10, celula: 0.05 };
const T_MIC = `${ANTET}G0 X2 Y3\nG1 Z-1\nG1 X18 Y7.3\nG0 Z5\n`;
const H_MIC = (x: number, y: number): number => Math.min(0, -1 + SQRT3 * dSeg(x, y, 2, 3, 18, 7.3));
const O_MIC = judeca(T_MIC, G_MIC, V60);
const P_MIC = campDinFunctie(G_MIC, H_MIC);
/** O celulă pe peretele V-ului, departe de capete: (10,025; 5,175) e la ~0,11 mm de traseu. */
const K_MIC = Math.floor(5.175 / 0.05) * O_MIC.nx + Math.floor(10.025 / 0.05);

test('compara: oracolul față de el însuși și hârtia față de oracol — 0 peste tot (controlul pozitiv al martorilor)', () => {
  assert.ok(O_MIC.z[K_MIC]! < -0.5, `celula aleasă nu e tăiată adânc: ${O_MIC.z[K_MIC]}`);
  const a = compara(O_MIC.z, O_MIC, V60), b = compara(P_MIC, O_MIC, V60);
  assert.deepEqual([a.maiSus, a.maiJosPesteMarja, a.pePerete, a.difMax], [0, 0, 0, 0]);
  assert.deepEqual([b.maiSus, b.maiJosPesteMarja, b.pePerete], [0, 0, 0]);
  assert.ok(b.difMax > 0.3 * O_MIC.marja, `hârtia nu se abate deloc de la oracol (${b.difMax}): piesa nu probează marja`);
});

test('martorul comparatorului „ridicat cu 20 nm”: o singură celulă peste oracol cu 2e-5 mm e prinsă, cu poziția ei', () => {
  const n = Float64Array.from(O_MIC.z);
  n[K_MIC] = n[K_MIC]! + 2e-5;
  const c = compara(n, O_MIC, V60);
  assert.equal(c.maiSus, 1);
  assert.deepEqual(c.primaMaiSus, [K_MIC % O_MIC.nx, Math.floor(K_MIC / O_MIC.nx)]);
  assert.ok(aproape(c.maiSusMax, 2e-5, 1e-12));
  // Cu un prag mai larg (1 µm), aceeași celulă trece: pragul chiar e cel care decide.
  assert.equal(compara(n, O_MIC, V60, 1e-3).maiSus, 0);
});

test('martorul comparatorului „ridicat cu 5 nm”: sub pragul de 10 nm, nu e prins', () => {
  const n = Float64Array.from(O_MIC.z);
  n[K_MIC] = n[K_MIC]! + 5e-6;
  assert.equal(compara(n, O_MIC, V60).maiSus, 0);
});

test('martorul comparatorului „coborât peste marjă”: prins cu marja + 10 nm + 1 µm, nu și cu jumătate din marjă', () => {
  const peste = Float64Array.from(O_MIC.z), sub = Float64Array.from(O_MIC.z);
  peste[K_MIC] = peste[K_MIC]! - (O_MIC.marja + 1e-5 + 1e-6);
  sub[K_MIC] = sub[K_MIC]! - O_MIC.marja / 2;
  const a = compara(peste, O_MIC, V60), b = compara(sub, O_MIC, V60);
  assert.deepEqual([a.maiJosPesteMarja, a.pePerete, a.maiSus], [1, 0, 0]);
  assert.deepEqual([b.maiJosPesteMarja, b.pePerete], [0, 0]);
});

test('martorul marjei „div 1 cu marja lui div 8”: oracolul de 8 ori mai rar iese din marjă față de hârtie; cu marja lui, nu', () => {
  const o1 = judeca(T_MIC, G_MIC, V60, { div: 1 });
  const strict = compara(P_MIC, { ...o1, pas: O_MIC.pas, marja: O_MIC.marja }, V60);
  assert.ok(strict.maiJosPesteMarja > 100, `doar ${strict.maiJosPesteMarja} celule peste marja ${O_MIC.marja} (dif max ${strict.difMax}): marja nu are dinți`);
  const propriu = compara(P_MIC, o1, V60);
  assert.equal(propriu.maiJosPesteMarja, 0, `oracolul div 1 iese din propria marjă (${o1.marja}) pe ${propriu.maiJosPesteMarja} celule: derivarea e greșită`);
  assert.equal(propriu.maiSus, 0);
});

test('martorul pereților „podeaua nu e perete”: un bloc 3×3 coborât cu 0,5 mm pe fundul unui șanț plat e numărat', () => {
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 20, inaltime: 10, celula: 0.05 };
  const o = judeca(`${ANTET}G0 X2 Y5\nG1 Z-1\nG1 X18 Y5\nG0 Z5\n`, g, FLAT6);
  assert.equal(o.marja, 0, 'freza plată la Z constant: marja e 0');
  const n = Float64Array.from(o.z);
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) n[(100 + dj) * o.nx + 200 + di] = -1.5;
  assert.deepEqual([compara(n, o, FLAT6).maiJosPesteMarja, compara(n, o, FLAT6).pePerete], [9, 0]);
  // Celula de chiar lângă peretele oracolului (y = 8,025, la 3,025 de traseu, deci la peste R + pas/2 de orice eșantion)
  // coborâtă cu 1 mm: nucleul a tăiat unde exactul nu taie. Regula veche cu saltul dintre vecini o punea în `pePerete`
  // (unghiul mort); pereții din `judeca` stau doar pe inelul de lângă margine, deci e prinsă.
  const m = Float64Array.from(o.z);
  m[Math.floor(8.025 / 0.05) * o.nx + 200] = -1;
  assert.deepEqual([compara(m, o, FLAT6).maiJosPesteMarja, compara(m, o, FLAT6).pePerete], [1, 0]);
});

test('martorul comparatorului „NaN”: o valoare care nu e număr e numărată la maiSus, iar mărimile greșite aruncă', () => {
  const n = Float64Array.from(O_MIC.z);
  n[K_MIC] = Number.NaN;
  const c = compara(n, O_MIC, V60);
  assert.equal(c.maiSus, 1);
  assert.equal(c.difMax, Infinity);
  assert.throws(() => compara(new Float64Array(3), O_MIC, V60), /celule/);
});

// ---------------------------------------------------------------------------------------------------------------
// Funcțiile de măsură, pe câmpuri exacte.

test('măsura: secțiunea bilei, unghiul V și lățimea radială dau valorile de hârtie pe câmpurile exacte', () => {
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 60, inaltime: 40, celula: 0.05 };
  const bila = campDinFunctie(g, (x, y) => { const d = dSeg(x, y, 10, 20, 50, 20); return d <= 3 ? Math.min(0, 1 - Math.sqrt(9 - d * d)) : 0; });
  const s = sectiuneBila(bila, g, 30);
  assert.ok(aproape(s.raza, 3, 1e-9) && aproape(s.centruY, 20, 1e-9) && aproape(s.centruZ, 1, 1e-9), JSON.stringify(s));
  const v = campDinFunctie(g, (x, y) => Math.min(0, -1.5 + SQRT3 * dSeg(x, y, 10, 20, 50, 20)));
  const u = unghiV(v, g, 30, 20);
  assert.ok(aproape(u.grade, 60, 1e-9) && aproape(u.pante[0], -SQRT3, 1e-9), JSON.stringify(u));
  const ga: GrilaOracol = { x0: 0, y0: 0, latime: 80, inaltime: 80, celula: 0.05 };
  const arcF = campDinFunctie(ga, (x, y) => (dArc(x, y, 40, 40, 25, 30, 120) <= 3 ? -3 : 0));
  for (const a of [30, 60, 90, 120]) {
    const w = latimeRadiala(arcF, ga, [40, 40], a, 15, 35, -2.999);
    assert.ok(Math.abs(w - 6) <= 0.05 * Math.SQRT2 + 0.0125, `la ${a}°: ${w}`);
  }
});

test('măsura: verificaHartie numără ferestrele, sare muchia, e asimetrică la cerere și prinde NaN', () => {
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 1, inaltime: 1, celula: 0.1 };
  const z = campDinFunctie(g, (x) => (x < 0.5 ? -1 : 0));
  const h = (x: number): number => (x < 0.5 ? -1 : 0);
  assert.deepEqual(verificaHartie(z, g, h, { ferestre: [[0, 0, 0.3, 1]] }).celule, 30);
  assert.equal(verificaHartie(z, g, h, { muchie: (x) => Math.abs(x - 0.55), pragMuchie: 0.01 }).peMuchie, 10);
  const jos = Float64Array.from(z);
  jos[0] = -1.001;
  assert.equal(verificaHartie(jos, g, h).maiJos, 1);
  assert.equal(verificaHartie(jos, g, h, { sub: 0.01 }).gresite, 0);
  jos[1] = Number.NaN;
  const v = verificaHartie(jos, g, h, { sub: 0.01 });
  assert.equal(v.gresite, 1);
  assert.deepEqual(v.primaGresita, [1, 0]);
});

// ---------------------------------------------------------------------------------------------------------------
// Corpusul.

const CU_HARTIE = [
  'sant-plat', 'sant-bila', 'sant-v90', 'sant-v60', 'arc-g3', 'arc-g2-R', 'cerc-complet', 'arc-mare-R-neg', 'plonjare-plata',
  'plonjare-bila', 'rampa-plata', 'profil-h(r)', 'mic-0.01', 'mare-2440', 'tangent', 'aproape-coincident',
];

test('corpusul: cele 16 piese cu hârtie din s4 (plus elicea și gravura), piesele doar cu oracol, câte o sculă pe caz', () => {
  const ids = CAZURI_SIMULARE.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'id-uri dublate');
  for (const id of CU_HARTIE) assert.ok(CAZURI_SIMULARE.find((c) => c.id === id)?.hartie, `${id} lipsește sau n-are hârtie`);
  for (const id of ['elice', 'gravura-v60']) assert.ok(CAZURI_SIMULARE.find((c) => c.id === id)?.hartie, id);
  for (const id of ['rampa-bila', 'rampa-v90', 'profil-rampa', 'dublat']) assert.ok(CAZURI_SIMULARE.find((c) => c.id === id && !c.hartie), id);
  const grav = CAZURI_SIMULARE.find((c) => c.id === 'gravura-v60')!;
  assert.ok(grav.mutari.length > 1500 && grav.scula.tip === 'v' && grav.scula.unghi === 60, 'gravura: polilinia lungă V60');
  for (const c of CAZURI_SIMULARE) {
    valideazaScula(c.scula);
    const zmin = Math.min(...c.mutari.flatMap((m) => [m.a[2], m.b[2]]));
    assert.equal(zmin, c.zProgramat, `${c.id}: zProgramat ${c.zProgramat}, dar mutările coboară la ${zmin}`);
  }
});

test('corpusul: fiecare piesă e judecată în exact unul dintre cele două fișiere de cazuri', () => {
  const toate = [...PIESE_FISIER_1, ...PIESE_FISIER_2];
  assert.equal(new Set(toate).size, toate.length, 'o piesă e în ambele fișiere');
  assert.deepEqual([...toate].sort(), CAZURI_SIMULARE.map((c) => c.id).sort());
});

/** Mutările pe care convenția de legătură le pune în jurul lui `mutari`, cum le vede cititorul. */
function cuLegaturi(mutari: readonly MutareCaz[]): MutareCaz[] {
  const L: MutareCaz[] = [];
  const lin = (a: P3, b: P3): MutareCaz => ({ tip: 'linie', a, b });
  let poz: P3 | undefined;
  for (const m of mutari) {
    if (!poz || poz[0] !== m.a[0] || poz[1] !== m.a[1] || poz[2] !== m.a[2]) {
      if (poz) {
        L.push(lin(poz, [poz[0], poz[1], 5]));
        L.push(lin([poz[0], poz[1], 5], [m.a[0], m.a[1], 5]));
      }
      // La prima mutare, cititorul n-a văzut încă X și Y: urcarea și rapida pornesc din poziția necunoscută.
      L.push(lin([m.a[0], m.a[1], 5], m.a));
    }
    L.push(m);
    poz = m.b;
  }
  if (poz) L.push(lin(poz, [poz[0], poz[1], 5]));
  return L;
}

test('corpusul: convenția de legătură — textul citit de oracol e exact mutările cazului plus legăturile (±1e-8 mm)', () => {
  for (const c of CAZURI_SIMULARE) {
    assert.ok(c.gcode.startsWith('G21 G90 G17\nG0 Z5\n') && c.gcode.trimEnd().endsWith('G0 Z5'), `${c.id}: antetul sau finalul`);
    if (!c.gcode.includes(' R')) assert.equal(c.gcode, scrieGcode(c.mutari), `${c.id}: textul nu e cel al scriitorului`);
    const citit = citesteGcode(c.gcode), asteptat = cuLegaturi(c.mutari);
    assert.equal(citit.length, asteptat.length, `${c.id}: ${citit.length} mutări citite, ${asteptat.length} așteptate`);
    citit.forEach((m, k) => {
      const e = asteptat[k]!;
      const unde = `${c.id}, mutarea ${k} (linia ${m.linie})`;
      assert.equal(m.tip, e.tip, unde);
      assert.ok(egalP(m.a, e.a, 1e-8) && egalP(m.b, e.b, 1e-8), `${unde}: ${m.a} → ${m.b} în loc de ${e.a} → ${e.b}`);
      if (m.tip === 'arc' && e.tip === 'arc') assert.ok(m.sens === e.sens && egalP(m.centru, e.centru, 1e-8), `${unde}: arcul`);
    });
  }
});

test('corpusul: martorii greșiți acoperă cele 7 otrăvuri din s4, fiecare cu explicație și verificări care trebuie să pice', () => {
  const nume = new Set(MARTORI_GRESITI.map((m) => m.nume));
  assert.deepEqual([...nume].sort(), [
    'arc-baleiaj-sau', 'bila-fara-patrat', 'centrul-celulei', 'elice-z-invers', 'rampa-capat-gresit', 'span-fara-ax', 'v-tan-in-loc-de-cot',
  ]);
  for (const m of MARTORI_GRESITI) {
    assert.ok(m.explicatie.length > 20 && m.prinsDe.length > 0, m.nume);
    assert.ok(CAZURI_SIMULARE.some((c) => c.id === m.caz), `${m.nume}: cazul ${m.caz}`);
  }
});
