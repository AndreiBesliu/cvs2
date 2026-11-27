/**
 * Elicea cu bila și cu toroidala în nucleul simulării (ADR 0303 §2, felia 16.A↑e-2): pe fiecare celulă, cel mai jos punct al
 * sculei pe toată elicea, exact (fără eșantionare). Proba e oracolul simulării (`test/oracles/simulare.ts`), care eșantionează
 * arcul adevărat cu Z-ul liniar în unghi, pe piese care acoperă și miezul (raza elicei sub raza sculei: scula atinge celula de
 * pe tot cercul, iar cel mai jos punct poate fi departe de trecerea peste ea), și inelul (raza elicei peste raza sculei), la
 * coborâre și la urcare, cu o tură, cu o bucată de tură și cu ture la rând, cu panta mică și mare. Pe fiecare piesă, nucleul nu
 * e mai sus decât oracolul cu peste 10 nm și nici mai jos peste marjă. Pe hârtie: centrul unei elice care coboară o tură
 * întreagă, cu raza elicei r sub raza sculei, ajunge la z_capăt + h(r) (bila: R − √(R² − r²); toroidala: 0 cât r ≤ R − ρ).
 * Rezultatul nu depinde de numărul de benzi (ADR 0047 §4). Pe 300 de elice la întâmplare (sămânță fixă), fiecare celulă a
 * nucleului e comparată cu o căutare densă pe toată elicea, scrisă aici, cu h din oracol: minimul nucleului e cel global, nu
 * unul local (pe toroidală, structura funcției e doar sondată, ADR 0303 §2).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXE_XYZ, type FormaScula, type Miscare, type Program } from '../../src/ir/ir.ts';
import { amprentaCamp, calculeazaBanda, mutariPentruBanda, previzualizarePentru, uneste, type RaspunsBanda } from '../../src/sim/banda.ts';
import { campNou, compacteaza, valoare, type Banda } from '../../src/sim/camp.ts';
import { ruleaza, silueta as siluetaNucleu, taieArc } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { scrieGcode, type MutareCaz } from '../oracles/simulare.cazuri.ts';
import { compara, judeca, type GrilaOracol, type P3, type SculaOracol } from '../oracles/simulare.ts';
import { densPe, parametriGrila } from './ajutor-simulare.ts';

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
  return { axe: AXE_XYZ, scula: { numar: 1, nume: 'elice', diametru, forma }, turatie: 18000, zSigur: 5, miscari: m };
}

function pregatit(mutari: readonly MutareCaz[], diametru: number, forma: FormaScula) {
  const p = pregatesteProgram(program(mutari, diametru, forma), 0);
  if (!p.ok) assert.fail(p.motiv);
  return p;
}

function nucleu(mutari: readonly MutareCaz[], grila: GrilaOracol, diametru: number, forma: FormaScula): Float64Array {
  const p = pregatit(mutari, diametru, forma);
  const F = campNou(parametriGrila(grila));
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  return densPe(F, grila);
}

const A = (sens: 'orar' | 'trigonometric', a: P3, b: P3, c: readonly [number, number]): MutareCaz => ({ tip: 'arc', sens, a, b, centru: c });
const G: GrilaOracol = { x0: 0, y0: 0, latime: 30, inaltime: 20, celula: 0.05 };

type Piesa = { readonly id: string; readonly scula: SculaOracol; readonly mutari: readonly MutareCaz[] };
const forma = (s: SculaOracol): FormaScula =>
  s.tip === 'bila' ? { tip: 'bila' } : s.tip === 'toroidala' ? { tip: 'toroidala', raza: s.raza } : { tip: 'plata' };

const PIESE: readonly Piesa[] = [
  // Miezul (r = 2 < R = 3): scula atinge centrul de pe tot cercul; cel mai jos punct e la capătul turei.
  { id: 'bila Ø6, o tură care coboară −0,5 → −1,5, raza elicei 2 (miezul)', scula: { tip: 'bila', diametru: 6 },
    mutari: [A('trigonometric', [17, 10, -0.5], [17, 10, -1.5], [15, 10])] },
  // Inelul (r = 5 > R = 3), o jumătate de tură, orar, panta mare.
  { id: 'bila Ø6, o jumătate de tură orar −0,2 → −2,2, raza elicei 5 (inelul)', scula: { tip: 'bila', diametru: 6 },
    mutari: [A('orar', [20, 10, -0.2], [10, 10, -2.2], [15, 10])] },
  // Pantă mică, miez strâmt: pe celulele apropiate de centru, g e concavă spre partea opusă (scula le atinge de peste tot).
  { id: 'bila Ø4, o tură lină −0,6 → −0,9, raza elicei 1', scula: { tip: 'bila', diametru: 4 },
    mutari: [A('orar', [16, 10, -0.6], [16, 10, -0.9], [15, 10])] },
  { id: 'toroidala Ø6 r1, o tură abruptă −0,3 → −2,3, raza elicei 2 (miezul, peste discul plat)', scula: { tip: 'toroidala', diametru: 6, raza: 1 },
    mutari: [A('trigonometric', [17, 10, -0.3], [17, 10, -2.3], [15, 10])] },
  // Urcarea: trei sferturi de tură, de la −2 la −0,5, cu raza elicei 6 (inelul).
  { id: 'toroidala Ø8 r2, trei sferturi de tură care urcă −2 → −0,5, raza elicei 6', scula: { tip: 'toroidala', diametru: 8, raza: 2 },
    mutari: [A('trigonometric', [21, 10, -2], [15, 4, -0.5], [15, 10])] },
  // Două ture la rând, lin (coborârea elicei într-un buzunar), cu raza elicei 1,5 (sub discul plat: a = 1,5).
  { id: 'toroidala Ø6 r1,5, două ture la rând −0,5 → −1 → −1,5, raza elicei 1,5', scula: { tip: 'toroidala', diametru: 6, raza: 1.5 },
    mutari: [A('trigonometric', [16.5, 10, -0.5], [16.5, 10, -1], [15, 10]), A('trigonometric', [16.5, 10, -1], [16.5, 10, -1.5], [15, 10])] },
  // Raza elicei între discul plat și raza sculei (a = 2,2 < r = 2,6 < R = 3), o bucată de tură, orar, care urcă.
  { id: 'toroidala Ø6 r0,8, un sfert de tură orar care urcă −1,4 → −0,4, raza elicei 2,6', scula: { tip: 'toroidala', diametru: 6, raza: 0.8 },
    mutari: [A('orar', [12.4, 10, -1.4], [15, 12.6, -0.4], [15, 10])] },
];

for (const c of PIESE) {
  test(`elicea: nucleul față de oracol, ${c.id}`, () => {
    const o = judeca(scrieGcode(c.mutari), G, c.scula);
    const z = nucleu(c.mutari, G, c.scula.diametru, forma(c.scula));
    const cmp = compara(z, o, c.scula);
    assert.equal(cmp.maiSus, 0, `nucleul mai sus pe ${cmp.maiSus} celule (max ${cmp.maiSusMax}, prima ${JSON.stringify(cmp.primaMaiSus)})`);
    assert.equal(cmp.maiJosPesteMarja, 0, `nucleul sub marja ${cmp.marja} pe ${cmp.maiJosPesteMarja} celule`);
    // Proba are dinți: cealaltă formă rotundă, de același diametru, pică pe aceeași piesă.
    const alta: FormaScula = c.scula.tip === 'bila' ? { tip: 'toroidala', raza: c.scula.diametru / 4 } : { tip: 'bila' };
    const alt = compara(nucleu(c.mutari, G, c.scula.diametru, alta), o, c.scula);
    assert.ok(alt.maiSus > 0 || alt.maiJosPesteMarja > 0, 'și cealaltă formă trece: piesa nu vede forma sculei');
  });
}

/** Valoarea nucleului în celula cea mai apropiată de (x, y). */
function inPunct(mutari: readonly MutareCaz[], diametru: number, f: FormaScula, x: number, y: number): number {
  const p = pregatit(mutari, diametru, f);
  const F = campNou(parametriGrila(G));
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  return valoare(F, Math.floor((x - G.x0) / G.celula), Math.floor((y - G.y0) / G.celula));
}

test('pe hârtie: centrul unei elice care coboară o tură întreagă, cu raza elicei sub raza sculei, ajunge la z_capăt + h(r)', () => {
  // Centrul celulei (15,025; 10,025) e la 0,035 mm de centrul elicei: r se schimbă cu cel mult atât, iar h cu sub 0,02 mm pe
  // bilă (panta r / √(R² − r²) ≤ 0,9 la r = 2, R = 3); pe toroidala peste discul plat, deloc.
  const unu = (r: number): MutareCaz => A('trigonometric', [15 + r, 10, -0.5], [15 + r, 10, -1.5], [15, 10]);
  const bila = inPunct([unu(2)], 6, { tip: 'bila' }, 15.025, 10.025);
  assert.ok(Math.abs(bila - (-1.5 + 3 - Math.sqrt(5))) < 0.035, `bila Ø6, r = 2: ${bila} ≠ ${-1.5 + 3 - Math.sqrt(5)}`);
  // Toroidala Ø6 r1 (a = 2): cu r = 1,5 ≤ a, discul plat trece peste centru: exact z_capăt.
  const plat = inPunct([unu(1.5)], 6, { tip: 'toroidala', raza: 1 }, 15.025, 10.025);
  assert.ok(Math.abs(plat - -1.5) < 1e-9, `toroidala Ø6 r1, r = 1,5: ${plat} ≠ −1,5`);
  // Cu r = 2,5 > a: h(2,5) = 1 − √(1 − 0,25) = 0,1340; panta sfertului de cerc la e = 0,5 e 0,58, deci sub 0,021 mm.
  const colt = inPunct([unu(2.5)], 6, { tip: 'toroidala', raza: 1 }, 15.025, 10.025);
  assert.ok(Math.abs(colt - (-1.5 + 1 - Math.sqrt(0.75))) < 0.021, `toroidala Ø6 r1, r = 2,5: ${colt} ≠ ${-1.5 + 1 - Math.sqrt(0.75)}`);
  // Martor: fără „ultima tură e cea mai joasă”, centrul ar rămâne la z_start + h(r), cu 1 mm mai sus.
  assert.ok(bila < -1.5 + 3 - Math.sqrt(5) + 0.5);
});

test('elicea cu bila și cu toroidala nu mai e refuzată; cea cu V-ul, da (ADR 0303: doar formele rotunde)', () => {
  const elice = [A('trigonometric', [20, 10, -0.5], [20, 10, -1.5], [15, 10])];
  for (const f of [{ tip: 'bila' }, { tip: 'toroidala', raza: 1 }, { tip: 'plata' }] as const) {
    const p = pregatesteProgram(program(elice, 6, f), 0);
    assert.ok(p.ok, `${f.tip}: ${p.ok ? '' : p.motiv}`);
  }
  const v = pregatesteProgram(program(elice, 6, { tip: 'v', unghi: 60 }), 0);
  assert.ok(!v.ok && /elicea cu V-ul/.test(v.motiv), v.ok ? 'acceptat' : v.motiv);
});

test('elicea cu bila și cu toroidala: 1, 2, 3 și 5 benzi dau aceeași amprentă și același volum', () => {
  for (const c of [PIESE[0]!, PIESE[3]!, PIESE[4]!]) {
    const p = pregatit(c.mutari, c.scula.diametru, forma(c.scula));
    const camp = { ...parametriGrila(G), sus: 0 };
    const previzualizare = previzualizarePentru(camp);
    const peBenzi = (n: number) => {
      const benzi: RaspunsBanda[] = [];
      for (let w = 0; w < n; w++) {
        const banda: Banda = { n, w };
        benzi.push(calculeazaBanda({ camp, banda, scula: p.scula, fund: -18, previzualizare, mutari: mutariPentruBanda(p.mutari, p.scula, camp, banda) }));
      }
      return uneste(camp, previzualizare, -18, benzi);
    };
    const unu = peBenzi(1);
    const F = campNou(camp);
    ruleaza(F, p.scula, p.mutari);
    compacteaza(F);
    assert.equal(unu.amprenta, amprentaCamp(F), `${c.id}: amprenta unită ≠ amprenta câmpului întreg`);
    for (const n of [2, 3, 5]) {
      const r = peBenzi(n);
      assert.equal(r.amprenta, unu.amprenta, `${c.id}, ${n} benzi: alta amprentă`);
      assert.ok(Object.is(r.volum, unu.volum), `${c.id}, ${n} benzi: alt volum`);
    }
  }
});

/** Generator determinist (mulberry32), ca sămânța să fie aceeași la fiecare rulare. */
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

test('pe 300 de elice la întâmplare (bila și toroidala): fiecare celulă e minimul global al căutării dense pe elice', () => {
  const rnd = aleator(20261127);
  let celule = 0, atinse = 0, miez = 0;
  for (let caz = 0; caz < 300; caz++) {
    const D = 2 + rnd() * 10, R = D / 2;
    const bila = rnd() < 0.35, rho = bila ? R : R * (0.05 + 0.9 * rnd()), a = R - rho;
    // h din oracol (ADR 0303 §3), scris altfel decât nucleul.
    const h = (d: number): number => (d <= a ? 0 : rho * (1 - Math.cos(Math.asin(Math.min(1, (d - a) / rho)))));
    const r = rnd() * 2.2 * R, trig = rnd() < 0.5, S = (0.1 + rnd() * 0.9) * 2 * Math.PI;
    const za = -0.2 - rnd() * 2, zb = za + (rnd() < 0.5 ? -1 : 1) * (0.01 + rnd() * 3);
    const th0 = rnd() * 2 * Math.PI, cx = 0, cy = 0;
    const ax = cx + r * Math.cos(th0), ay = cy + r * Math.sin(th0);
    const dir = trig ? 1 : -1, th1 = th0 + dir * S, bx = cx + r * Math.cos(th1), by = cy + r * Math.sin(th1);
    // Fereastra de 8 × 8 celule: în miez (lângă centru) sau pe inel, la un unghi oarecare.
    const pc = rnd() < 0.4 ? rnd() * Math.max(0, R - r) : r + (rnd() * 2 - 1) * R, fc = rnd() * 2 * Math.PI;
    const celula = 0.13, gx = cx + pc * Math.cos(fc) - 4 * celula, gy = cy + pc * Math.sin(fc) - 4 * celula;
    const F = campNou({ x0: gx, y0: gy, latime: 8 * celula, inaltime: 8 * celula, celula, sus: 0 });
    const T = siluetaNucleu({ forma: bila ? { tip: 'bila' } : { tip: 'toroidala', raza: rho }, diametru: D });
    taieArc(F, T, ax, ay, za, bx, by, zb, cx, cy, trig, S);
    compacteaza(F);
    const N = 6000;
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        const px = gx + (i + 0.5) * celula, py = gy + (j + 0.5) * celula;
        const f = (u: number): number => {
          const t = th0 + dir * u, dx = px - (cx + r * Math.cos(t)), dy = py - (cy + r * Math.sin(t)), dd = Math.hypot(dx, dy);
          return dd <= R ? za + ((zb - za) * u) / S + h(dd) : Infinity;
        };
        // Căutarea densă, apoi strângerea în jurul celor mai bune eșantioane (cu capetele).
        const val: number[] = [];
        for (let k = 0; k <= N; k++) val.push(f((S * k) / N));
        let best = Math.min(...val, 0);
        const ordine = val.map((z, k) => [z, k] as const).filter(([z]) => z < Infinity).sort((x, y) => x[0] - y[0]).slice(0, 6);
        for (const [, k] of ordine) {
          let lo = (S * Math.max(0, k - 1)) / N, hi = (S * Math.min(N, k + 1)) / N;
          for (let it = 0; it < 80; it++) {
            const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
            if (f(m1) <= f(m2)) hi = m2; else lo = m1;
          }
          best = Math.min(best, f((lo + hi) / 2));
        }
        // Câmpul ține Float32: un ulp la |z|, cel mult |z|·2⁻²³.
        const z = valoare(F, i, j), ulp = Math.abs(best) * 1.2e-7 + 1e-9;
        celule++;
        if (best < 0) atinse++;
        if (pc < R - r) miez++;
        assert.ok(z <= best + ulp, `cazul ${caz} (${bila ? 'bila' : `toroidala ρ ${rho.toFixed(3)}`}, Ø${D.toFixed(3)}, r ${r.toFixed(3)}, S ${S.toFixed(3)}, ${za.toFixed(3)} → ${zb.toFixed(3)}), celula ${i},${j}: nucleul ${z} peste căutare ${best}`);
        assert.ok(z >= best - 1e-6, `cazul ${caz}, celula ${i},${j}: nucleul ${z} sub căutare ${best}`);
      }
    }
  }
  assert.ok(atinse > celule / 3 && miez > 2000, `prea puține celule atinse (${atinse} din ${celule}) sau în miez (${miez})`);
});
