/**
 * Modelul reliefului pentru vederea 3D (ADR 0310 §4, §7; felia 18.1↑b), scris înaintea lui: compusul calculat dală cu dală
 * în workerul reliefului (cererea `model`) e exact compusul întreg, redus cu k ca desenul de pe planșă (media pe blocuri k ×
 * k): la k = 1, chiar celulele care se taie. Cheile dalelor spun ce dale s-au schimbat: încărcarea din nou cere și urcă doar
 * acelea (o dală goală a unui strat nu atinge compusul, deci nici cheia), iar baza e citită doar pentru octeții lor. Factorul
 * ține textura în latura și în pixelii ei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reliefInBazin } from '../../src/jobs/bazinRelief.ts';
import type { RaspunsRelief } from '../../src/jobs/calculRelief.ts';
import { cheiModel, deUrcat, factorModel, incarcaModel, PIXELI_MODEL, type ModelIncarcat, type StocareModel } from '../../src/app/modelRelief.ts';
import type { FormaRelief, ModRelief } from '../../src/model/document.ts';
import { compune } from '../../src/relief/compunere.ts';
import { hartaDinText } from '../../src/relief/harta.ts';
import { grilaDinDale, stratDinGrila, type StratConstruit } from '../../src/relief/strat.ts';
import { intervalZ, reduce } from '../../src/relief/umbrire.ts';

const NX = 600, NY = 300, TX = 3, TY = 2;

/** Patru straturi pe o grilă de 3 × 2 dale (ultima coloană de 88 de celule, rândul de sus de 44): coduri, goluri, constante. */
const VALORI: ReadonlyArray<{ readonly mod: ModRelief; readonly vizibil: boolean; readonly f: (i: number, j: number) => number }> = [
  { mod: 'aduna', vizibil: true, f: (i, j) => 2 + 3 * Math.sin(i * 0.05) * Math.cos(j * 0.07) },
  // Doar pe jumătatea din dreapta: dalele din stânga sunt goale (intrarea null din hartă).
  { mod: 'inalt', vizibil: true, f: (i) => (i < 300 ? NaN : 4 + i * 0.001) },
  // Ascuns: nu atinge nici compusul, nici cheile.
  { mod: 'scade', vizibil: false, f: () => 100 },
  // Un factor constant: dalele întregi sunt o constantă în hartă, cele de pe margine coduri.
  { mod: 'inmulteste', vizibil: true, f: () => 0.5 },
];

function grila(f: (i: number, j: number) => number): Float32Array {
  const v = new Float32Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) v[j * NX + i] = f(i, j);
  return v;
}

type Strat = { readonly mod: ModRelief; readonly vizibil: boolean; readonly st: StratConstruit };

async function straturi(schimba?: (i: number, j: number, v: number) => number): Promise<Strat[]> {
  const r: Strat[] = [];
  for (const [k, s] of VALORI.entries()) {
    const g = grila(s.f);
    if (k === 0 && schimba) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) g[j * NX + i] = schimba(i, j, g[j * NX + i] ?? 0);
    r.push({ mod: s.mod, vizibil: s.vizibil, st: await stratDinGrila(g, NX, NY) });
  }
  return r;
}

/** Compusul întreg, din dalele cuantizate (ce se vede, ce se salvează, ce se taie). */
function compusIntreg(ss: readonly Strat[]): Float32Array {
  return compune(NX * NY, ss.map((s) => ({ mod: s.mod, vizibil: s.vizibil, valori: grilaDinDale(NX, NY, s.st.dale) })));
}

const octeti = (s: StratConstruit): Record<string, Uint8Array<ArrayBuffer>> => Object.fromEntries(s.octeti);

function model(r: RaspunsRelief): Extract<RaspunsRelief, { tip: 'model' }> {
  if (!r.ok || r.tip !== 'model') assert.fail(JSON.stringify(r.ok ? r.tip : r));
  return r;
}

/** Dalele modelului puse la locul lor, într-o grilă ⌈NX / k⌉ × ⌈NY / k⌉ (NaN unde n-a venit nicio dală). */
function asamblat(k: number, dale: ReadonlyArray<{ readonly index: number; readonly latime: number; readonly inaltime: number; readonly z: Float32Array }>): Float32Array {
  const w = Math.ceil(NX / k), h = Math.ceil(NY / k), out = new Float32Array(w * h).fill(NaN), pe = 256 / k;
  for (const d of dale) {
    const ti = d.index % TX, tj = (d.index - ti) / TX;
    for (let b = 0; b < d.inaltime; b++) out.set(d.z.subarray(b * d.latime, (b + 1) * d.latime), (tj * pe + b) * w + ti * pe);
  }
  return out;
}

/** Egalitatea exactă a două grile, cu primul loc diferit în mesaj (fără un diff de 180 000 de valori). */
function egale(a: Float32Array, b: Float32Array, ce: string): void {
  assert.equal(a.length, b.length, `${ce}: lungimea`);
  for (let k = 0; k < a.length; k++) if (!Object.is(a[k], b[k])) assert.fail(`${ce}: la ${k}, ${a[k]} ≠ ${b[k]}`);
}

test('cererea `model`: dalele compuse una câte una sunt compusul întreg, redus cu k ca desenul de pe planșă (k = 1: celulele tăiate)', async () => {
  const ss = await straturi(), compus = compusIntreg(ss);
  const cerere = ss.map((s) => ({ mod: s.mod, vizibil: s.vizibil, harta: s.st.text, octeti: octeti(s.st) }));
  for (const k of [1, 2, 4, 8]) {
    const r = model(await reliefInBazin({ tip: 'model', nx: NX, ny: NY, k, straturi: cerere, dale: [0, 1, 2, 3, 4, 5] }));
    assert.equal(r.k, k);
    assert.deepEqual(r.dale.map((d) => [d.index, d.latime, d.inaltime]), [0, 1, 2, 3, 4, 5].map((t) => {
      const la = t % TX === 2 ? 88 : 256, lb = t >= TX ? 44 : 256;
      return [t, Math.ceil(la / k), Math.ceil(lb / k)];
    }));
    egale(asamblat(k, r.dale), reduce(compus, NX, NY, k).valori, `k = ${k}`);
    // Z-ul fiecărei dale, pe celulele ei întregi (nu pe cele reduse): de aici vine vârful reliefului.
    for (const d of r.dale) {
      const ti = d.index % TX, tj = (d.index - ti) / TX, z: number[] = [];
      for (let j = tj * 256; j < Math.min(NY, tj * 256 + 256); j++) for (let i = ti * 256; i < Math.min(NX, ti * 256 + 256); i++) z.push(compus[j * NX + i] ?? NaN);
      assert.deepEqual([d.min, d.max], [Math.min(...z), Math.max(...z)], `Z-ul dalei ${d.index}`);
    }
    const tot = intervalZ(compus);
    assert.deepEqual([Math.min(...r.dale.map((d) => d.min)), Math.max(...r.dale.map((d) => d.max))], [tot?.min, tot?.max]);
  }
});

test('cererea `model`: doar dalele cerute; octeții lipsă și harta altei grile, refuzate cu motivul', async () => {
  const ss = await straturi();
  const cerere = ss.map((s) => ({ mod: s.mod, vizibil: s.vizibil, harta: s.st.text, octeti: octeti(s.st) }));
  const r = model(await reliefInBazin({ tip: 'model', nx: NX, ny: NY, k: 2, straturi: cerere, dale: [4] }));
  assert.deepEqual(r.dale.map((d) => d.index), [4]);
  const lipsa = await reliefInBazin({ tip: 'model', nx: NX, ny: NY, k: 1, straturi: [{ ...cerere[0]!, octeti: {} }], dale: [0] });
  assert.equal(lipsa.ok ? 'ok' : lipsa.cod, 'dale-lipsa');
  const alta = await reliefInBazin({ tip: 'model', nx: NX + 1, ny: NY, k: 1, straturi: cerere, dale: [0] });
  assert.equal(alta.ok ? 'ok' : alta.cod, 'harta');
  await assert.rejects(reliefInBazin({ tip: 'model', nx: NX, ny: NY, k: 3, straturi: cerere, dale: [0] }));
  await assert.rejects(reliefInBazin({ tip: 'model', nx: NX, ny: NY, k: 1, straturi: cerere, dale: [6] }));
});

test('factorul modelului: cel mai mic k (putere a lui 2) cu textura în latura și în pixelii ei', () => {
  assert.equal(factorModel(1000, 1000), 1);
  assert.equal(factorModel(4096, 1024), 1);
  assert.equal(4096 * 1024, PIXELI_MODEL);
  assert.equal(factorModel(4097, 10), 2);
  assert.equal(factorModel(2049, 2049), 2);
  assert.equal(factorModel(8192, 8192), 4);
  assert.equal(factorModel(3000, 10, 2048), 2);
  assert.equal(factorModel(8192, 8192, 64), 128);
});

/** O bază în memorie, cu citirile numărate (ce amprente de dale s-au cerut). */
function baza(ss: readonly Strat[]): StocareModel & { readonly cerute: string[][] } {
  const harti = new Map<string, string>(), dale = new Map<string, Uint8Array<ArrayBuffer>>(), cerute: string[][] = [];
  const pune = (s: StratConstruit): void => { harti.set(s.amprenta, s.text); for (const [h, o] of s.octeti) dale.set(h, o); };
  ss.forEach((s) => { pune(s.st); });
  return {
    cerute,
    adauga: pune,
    harta: async (a: string) => harti.get(a) ?? null,
    dale: async (a: readonly string[]) => {
      cerute.push([...a].sort());
      return Object.fromEntries(a.flatMap((h) => { const o = dale.get(h); return o ? [[h, o.slice()]] : []; }));
    },
  } as StocareModel & { readonly cerute: string[][]; readonly adauga: (s: StratConstruit) => void };
}

const forma = (ss: readonly Strat[]): FormaRelief => ({
  tip: 'relief', nx: NX, ny: NY, celula: 0.5, straturi: ss.map((s, k) => ({ id: `s${k}`, mod: s.mod, vizibil: s.vizibil, dale: s.st.amprenta })),
});

function incarcat(r: ModelIncarcat | 'lipsa'): ModelIncarcat {
  if (r === 'lipsa') assert.fail('lipsa');
  return r;
}

test('încărcarea: întâi toate dalele; apoi, fără schimbări, niciuna; o dală schimbată a unui strat: doar ea, cerută și compusă', async () => {
  const ss = await straturi(), b = baza(ss), f = forma(ss);
  const unu = incarcat(await incarcaModel(f, null, 4096, b));
  assert.equal(unu.tot, true);
  assert.deepEqual(unu.dale.map((d) => d.index), [0, 1, 2, 3, 4, 5]);
  egale(asamblat(1, unu.dale), compusIntreg(ss), 'prima încărcare');

  const doi = incarcat(await incarcaModel(f, { k: unu.k, chei: unu.chei }, 4096, b));
  assert.equal(doi.tot, false);
  assert.deepEqual(doi.dale, []);
  assert.deepEqual(doi.chei, unu.chei);

  // O celulă schimbată în dala (1, 0) a primului strat: o hartă nouă, cu o singură intrare diferită.
  const ss2 = await straturi((i, j, v) => (i === 300 && j === 100 ? v + 1 : v));
  (b as unknown as { adauga: (s: StratConstruit) => void }).adauga(ss2[0]!.st);
  b.cerute.length = 0;
  const trei = incarcat(await incarcaModel(forma(ss2), { k: unu.k, chei: unu.chei }, 4096, b));
  assert.equal(trei.tot, false);
  assert.deepEqual(trei.dale.map((d) => d.index), [1]);
  assert.deepEqual(deUrcat(unu.chei, trei.chei), [1]);
  // Baza: doar octeții dalei 1 (ai primului strat și ai celui din dreapta, care are date acolo).
  const h1 = [ss2[0]!.st.harta.dale[1], ss2[1]!.st.harta.dale[1], ss2[3]!.st.harta.dale[1]].filter((e): e is string => typeof e === 'string').sort();
  assert.deepEqual(b.cerute, [h1]);
  // Dalele vechi, cu cea nouă pusă peste, sunt modelul încărcat din nou întreg.
  const peste = new Map(unu.dale.map((d) => [d.index, d]));
  for (const d of trei.dale) peste.set(d.index, d);
  egale(asamblat(1, [...peste.values()]), compusIntreg(ss2), 'dala schimbată');
});

test('cheile: un strat ascuns schimbă doar dalele în care are date; altă grilă sau alt k reface tot', async () => {
  const ss = await straturi(), h = ss.map((s) => hartaDinText(s.st.text)!);
  const vizibile = (ascuns: number) => ss.flatMap((s, k) => (s.vizibil && k !== ascuns ? [{ mod: s.mod, harta: h[k]! }] : []));
  const toate = cheiModel(vizibile(-1), TX * TY);
  // Al doilea strat („inalt”) are date doar în dalele din dreapta jumătății: 1, 2, 4, 5 (dalele 0 și 3 sunt goale).
  assert.deepEqual(deUrcat(toate, cheiModel(vizibile(1), TX * TY)), [1, 2, 4, 5]);
  assert.deepEqual(deUrcat(null, toate), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(deUrcat(toate.slice(0, 5), toate), [0, 1, 2, 3, 4, 5]);
  const b = baza(ss), f = forma(ss);
  const unu = incarcat(await incarcaModel(f, null, 4096, b));
  const mic = incarcat(await incarcaModel(f, { k: unu.k, chei: unu.chei }, 256, b));
  assert.equal(mic.k, 4);
  assert.equal(mic.tot, true);
  assert.equal(mic.dale.length, 6);
});

test('încărcarea: un strat sau o dală care lipsește din browser dă „lipsa”, nu un model inventat', async () => {
  const ss = await straturi(), b = baza(ss), f = forma(ss);
  assert.equal(await incarcaModel({ ...f, straturi: [{ ...f.straturi[0]!, dale: 'f'.repeat(64) }] }, null, 4096, b), 'lipsa');
  const golita: StocareModel = { harta: b.harta, dale: async () => ({}) };
  assert.equal(await incarcaModel(f, null, 4096, golita), 'lipsa');
});
