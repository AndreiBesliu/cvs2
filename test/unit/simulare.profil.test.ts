/**
 * Nucleul simulării cu profilul desenat (ADR 0304 §2, felia 16.A↑f-1): silueta e o linie frântă (r, h), de la (0, 0) la
 * (Ø / 2, h_max), cu r strict crescător și h nedescrescător. Proba e oracolul simulării (`test/oracles/simulare.ts`, felul
 * `profil`, interpolare liniară scrisă altfel decât nucleul), pe plonjări, linii orizontale și înclinate (în ambele sensuri,
 * cu panta mai mică și mai mare decât a bucăților), linii oblice în XY și arce la Z constant, pe profiluri date (o rotunjire,
 * un S, trepte) și pe profiluri la întâmplare: pe fiecare piesă, nucleul nu e mai sus decât oracolul cu peste 10 nm și nici
 * mai jos peste marjă. Pe hârtie: un profil de două puncte e V-ul (sau plata), unul cu un fund plat e V-ul cu vârf plat, celulă
 * cu celulă; secțiunea canelurii e silueta; un profil fără sens și elicea cu profilul se refuză, cu motiv.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXE_XYZ, type FormaScula, type Miscare, type Program } from '../../src/ir/ir.ts';
import { campNou, compacteaza } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { scrieGcode, type MutareCaz } from '../oracles/simulare.cazuri.ts';
import { compara, judeca, type GrilaOracol, type P3, type SculaOracol } from '../oracles/simulare.ts';
import { densPe, parametriGrila } from './ajutor-simulare.ts';

type Pct = readonly [number, number];

/** Programul IR al mutărilor, cu legătura corpusului (Z5, rapida la start, coborârea), ca `programCaz`. */
function program(mutari: readonly MutareCaz[], diametru: number, forma: FormaScula): Program {
  const m: Miscare[] = [{ tip: 'rapida', la: { Z: 5 } }];
  let poz: P3 | undefined;
  for (const x of mutari) {
    const [ax, ay, az] = x.a;
    if (!poz || poz[0] !== ax || poz[1] !== ay || poz[2] !== az) {
      m.push({ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: ax, Y: ay } }, { tip: 'taiere', la: { Z: az }, avans: 300 });
    }
    const [bx, by, bz] = x.b;
    m.push(x.tip === 'linie'
      ? { tip: 'taiere', la: { X: bx, Y: by, Z: bz }, avans: 1000 }
      : { tip: 'arc', la: { X: bx, Y: by, Z: bz }, centru: { x: x.centru[0], y: x.centru[1] }, sens: x.sens, avans: 1000 });
    poz = x.b;
  }
  m.push({ tip: 'rapida', la: { Z: 5 } });
  return { axe: AXE_XYZ, scula: { numar: 1, nume: 'profil', diametru, forma }, turatie: 18000, zSigur: 5, miscari: m };
}

function nucleu(mutari: readonly MutareCaz[], grila: GrilaOracol, diametru: number, forma: FormaScula): Float64Array {
  const p = pregatesteProgram(program(mutari, diametru, forma), 0);
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  if (!p.ok) return new Float64Array();
  const F = campNou(parametriGrila(grila));
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  return densPe(F, grila);
}

const L = (a: P3, b: P3): MutareCaz => ({ tip: 'linie', a, b });
const A = (sens: 'orar' | 'trigonometric', a: P3, b: P3, c: readonly [number, number]): MutareCaz => ({ tip: 'arc', sens, a, b, centru: c });
const G: GrilaOracol = { x0: 0, y0: 0, latime: 30, inaltime: 20, celula: 0.05 };
const P = (puncte: readonly Pct[]): FormaScula => ({ tip: 'profil', puncte });

/** O rotunjire (fundul plat, apoi o curbă care se înalță tot mai abrupt), un S (abrupt la mijloc) și trepte (bucăți orizontale). */
const RUND: readonly Pct[] = [[0, 0], [1.5, 0], [2.2, 0.3], [3, 0.9], [3.6, 1.8], [4, 3]];
const S_URI: readonly Pct[] = [[0, 0], [1, 0.2], [2, 0.4], [2.5, 1.2], [3, 2.6], [3.5, 3], [4, 3.1]];
const TREPTE: readonly Pct[] = [[0, 0], [1, 0], [1.2, 1], [2.5, 1], [2.7, 2], [4, 2]];

const MUTARI: ReadonlyArray<readonly [string, readonly MutareCaz[]]> = [
  ['linie la −0,5 (sub fundul profilului)', [L([5, 10, -0.5], [25, 10, -0.5])]],
  ['linie la −2,5 (prin mijlocul profilului)', [L([5, 10, -2.5], [25, 10, -2.5])]],
  ['linie oblică în XY la −1,2', [L([4, 4, -1.2], [26, 15, -1.2])]],
  // Pantă mică (|m| = 0,075): punctul staționar pe bucățile line; pantă mare (|m| = 2): capetele sau bucățile abrupte.
  ['rampă lină 0 → −1,5', [L([4, 10, 0], [24, 10, -1.5])]],
  ['rampă lină oblică, care urcă −2,8 → −0,4', [L([5, 5, -2.8], [25, 13, -0.4])]],
  ['coborâre abruptă și ieșirea lină', [L([10, 10, -0.2], [11, 10, -2.2]), L([11, 10, -2.2], [20, 10, -0.5])]],
  ['arc la −0,8 și cercul întreg la −2,5', [A('trigonometric', [20, 10, -0.8], [10, 10, -0.8], [15, 10]), A('orar', [7, 4, -2.5], [7, 4, -2.5], [7, 7])]],
  ['plonjări: −1 și −3', [L([8, 8, 0], [8, 8, -1]), L([20, 12, 0], [20, 12, -3])]],
];

function verifica(nume: string, mutari: readonly MutareCaz[], puncte: readonly Pct[], diametru: number, grila: GrilaOracol = G): void {
  const s: SculaOracol = { tip: 'profil', diametru, puncte };
  const o = judeca(scrieGcode(mutari), grila, s);
  const z = nucleu(mutari, grila, diametru, P(puncte));
  const cmp = compara(z, o, s);
  assert.equal(cmp.maiSus, 0, `${nume}: nucleul mai sus pe ${cmp.maiSus} celule (max ${cmp.maiSusMax}, prima ${JSON.stringify(cmp.primaMaiSus)})`);
  assert.equal(cmp.maiJosPesteMarja, 0, `${nume}: nucleul sub marja ${cmp.marja} pe ${cmp.maiJosPesteMarja} celule`);
}

for (const [numeP, puncte] of [['rotunjirea', RUND], ['S-ul', S_URI], ['treptele', TREPTE]] as const) {
  for (const [numeM, mutari] of MUTARI) {
    test(`profilul: nucleul față de oracol, ${numeP}, ${numeM}`, () => {
      verifica(`${numeP}, ${numeM}`, mutari, puncte, 8);
      // Proba are dinți: V-ul de același diametru și aceeași înălțime pică pe aceeași piesă.
      const s: SculaOracol = { tip: 'profil', diametru: 8, puncte };
      const o = judeca(scrieGcode(mutari), G, s);
      const hmax = puncte[puncte.length - 1]![1];
      const alt = compara(nucleu(mutari, G, 8, P([[0, 0], [4, hmax]])), o, s);
      assert.ok(alt.maiSus > 0 || alt.maiJosPesteMarja > 0, 'conul trece și el: piesa nu vede silueta');
    });
  }
}

/** Un generator determinist (mulberry32): aceleași profiluri și mutări la fiecare rulare. */
function aleator(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('profilul: nucleul față de oracol, pe 12 profiluri la întâmplare, fiecare cu trei mutări la întâmplare', () => {
  const rnd = aleator(0x16af1);
  for (let caz = 0; caz < 12; caz++) {
    const D = 4 + rnd() * 8, R = D / 2, n = 2 + Math.floor(rnd() * 7);
    const r = [0, ...Array.from({ length: n - 1 }, () => rnd()).sort((x, y) => x - y)].map((u) => u * R);
    r[r.length - 1] = R;
    // r strict crescător: puncte prea apropiate se depărtează.
    for (let k = 1; k < r.length; k++) if (!(r[k]! > r[k - 1]! + 0.02)) r[k] = r[k - 1]! + 0.02;
    r[r.length - 1] = Math.max(R, r[r.length - 2]! + 0.02);
    const Dc = 2 * r[r.length - 1]!;
    let h = 0;
    const puncte: Pct[] = r.map((ri, k) => {
      if (k > 0) h += rnd() < 0.25 ? 0 : rnd() * 1.5;
      return [ri, k === 0 ? 0 : h] as const;
    });
    const z = (): number => -(0.2 + rnd() * 3);
    const p3 = (): P3 => [3 + rnd() * 24, 3 + rnd() * 14, z()];
    const mutari: MutareCaz[] = [L(p3(), p3())];
    const a = p3();
    mutari.push(L(a, [a[0] + (rnd() - 0.5) * 6, a[1] + (rnd() - 0.5) * 6, z()]));
    const c: P3 = [8 + rnd() * 14, 6 + rnd() * 8, z()], rc = 1 + rnd() * 3;
    mutari.push(A(rnd() < 0.5 ? 'orar' : 'trigonometric', [c[0] + rc, c[1], c[2]], [c[0] - rc, c[1], c[2]], [c[0], c[1]]));
    verifica(`cazul ${caz} (Ø${Dc.toFixed(2)}, ${puncte.length} puncte)`, mutari, puncte, Dc);
  }
});

test('pe hârtie: profilul de două puncte e V-ul (sau plata), iar cel cu fund plat e V-ul cu vârf plat, celulă cu celulă', () => {
  const k = 1 / Math.tan((60 * Math.PI) / 360);
  for (const [numeM, mutari] of MUTARI) {
    const v = nucleu(mutari, G, 8, { tip: 'v', unghi: 60 });
    const pv = nucleu(mutari, G, 8, P([[0, 0], [4, 4 * k]]));
    const vf = nucleu(mutari, G, 8, { tip: 'v', unghi: 60, varf: 1 });
    const pvf = nucleu(mutari, G, 8, P([[0, 0], [0.5, 0], [4, 3.5 * k]]));
    const pl = nucleu(mutari, G, 8, { tip: 'plata' });
    const ppl = nucleu(mutari, G, 8, P([[0, 0], [4, 0]]));
    for (let i = 0; i < v.length; i++) {
      // Câmpul ține Z-ul pe 32 de biți (`camp.ts`); aceeași geometrie, scrisă altfel: cel mult 1e-6 mm.
      assert.ok(Math.abs(v[i]! - pv[i]!) <= 1e-6, `${numeM}: V față de profil la celula ${i}: ${v[i]} / ${pv[i]}`);
      assert.ok(Math.abs(vf[i]! - pvf[i]!) <= 1e-6, `${numeM}: V cu vârf plat față de profil la celula ${i}: ${vf[i]} / ${pvf[i]}`);
      assert.ok(Math.abs(pl[i]! - ppl[i]!) <= 1e-6, `${numeM}: plata față de profil la celula ${i}: ${pl[i]} / ${ppl[i]}`);
    }
  }
});

test('pe hârtie: secțiunea canelurii la −2,5 cu rotunjirea Ø8 e silueta, h interpolat liniar între puncte', () => {
  const g: GrilaOracol = { x0: 10, y0: 5.9, latime: 2, inaltime: 8.2, celula: 0.005 };
  const z = nucleu([L([5, 10, -2.5], [25, 10, -2.5])], g, 8, P(RUND));
  const nx = 400, i = 200, ny = 1640;
  const h = (q: number): number => {
    for (let k = 0; k + 1 < RUND.length; k++) {
      const [r0, h0] = RUND[k]!, [r1, h1] = RUND[k + 1]!;
      if (q <= r1) return h0 + ((q - r0) * (h1 - h0)) / (r1 - r0);
    }
    return Infinity;
  };
  for (let j = 0; j < ny; j++) {
    const y = g.y0 + (j + 0.5) * g.celula, q = Math.abs(y - 10);
    const ideal = q <= 4 ? Math.min(0, -2.5 + h(q)) : 0;
    assert.ok(Math.abs(z[j * nx + i]! - ideal) <= 1e-6, `y = ${y}: ${z[j * nx + i]} în loc de ${ideal}`);
  }
});

test('un profil fără sens e refuzat de simulare, cu motiv; elicea cu profilul, la fel', () => {
  const linie = [L([5, 10, -1], [25, 10, -1])];
  const rele: ReadonlyArray<readonly [string, readonly Pct[]]> = [
    ['un singur punct', [[0, 0]]],
    ['primul punct nu e (0, 0)', [[0.1, 0], [3, 1]]],
    ['r nu crește strict', [[0, 0], [1, 0.5], [1, 0.8], [3, 1]]],
    ['h scade', [[0, 0], [1, 0.8], [2, 0.5], [3, 1]]],
    ['ultimul r nu e Ø / 2', [[0, 0], [2.5, 1]]],
    ['un punct nefinit', [[0, 0], [1, Number.NaN], [3, 1]]],
    ['peste 200 de puncte', Array.from({ length: 202 }, (_, k): Pct => [(3 * k) / 201, k / 201])],
  ];
  for (const [nume, puncte] of rele) {
    const p = pregatesteProgram(program(linie, 6, P(puncte)), 0);
    assert.ok(!p.ok && /profil/.test(p.motiv), `${nume}: ${p.ok ? 'acceptat' : p.motiv}`);
  }
  const elice = [A('trigonometric', [20, 10, -0.5], [20, 10, -1.5], [15, 10])];
  const pe = pregatesteProgram(program(elice, 8, P(RUND)), 0);
  assert.ok(!pe.ok && /elicea cu profilul/.test(pe.motiv), pe.ok ? 'acceptată' : pe.motiv);
  // Arcul la Z constant cu profilul și elicea cu bila, ca până acum.
  assert.ok(pregatesteProgram(program([A('orar', [7, 4, -1], [7, 4, -1], [7, 7])], 8, P(RUND)), 0).ok);
  assert.ok(pregatesteProgram(program(elice, 6, { tip: 'bila' }), 0).ok);
});
