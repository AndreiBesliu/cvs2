/**
 * Nucleul reliefului (`src/relief/`, felia 18.1↑a) judecat de oracolul lui (`test/oracles/relief.ts`, ADR 0311): cazurile pe
 * hârtie și cazuri întâmplătoare (imagini cu goluri și netezire, dale, hărți, compuneri).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amprentaO, cuantizeazaO, hartaGrileiO, judecaCitire, judecaCompunere, judecaDala, judecaReliefDinImagine, octetiO,
  reliefDinImagineO, type ImagineO, type ModO, type OptiuniReliefO, type StratO,
} from '../oracles/relief.ts';
import { CAZURI_DALA, CAZURI_IMAGINE, COMPUNERE_HARTIE, HARTA_2X1 } from '../oracles/relief.cazuri.ts';
import { reliefDinPixeli, ordin, ponderi, SIGMA_MAXIM } from '../../src/relief/imagine.ts';
import { citeste, cuantizeaza, dalaDinOcteti, octetiDala, valoriDala, type Dala } from '../../src/relief/dala.ts';
import { compune, MODURI } from '../../src/relief/compunere.ts';
import { daleDinHarta, grilaDinDale, stratDinGrila } from '../../src/relief/strat.ts';
import { hartaDinText, textHarta } from '../../src/relief/harta.ts';
import { CELULE_DALA, motivGrila } from '../../src/relief/grila.ts';

let s = 20_251_124;
const rnd = (): number => { s = (s * 1_103_515_245 + 12_345) % 2 ** 31; return s / 2 ** 31; };

function imagineIntamplatoare(nx: number, ny: number, goluri: number): ImagineO {
  const rgba = new Uint8Array(4 * nx * ny);
  for (let k = 0; k < nx * ny; k++) {
    rgba[4 * k] = Math.floor(rnd() * 256); rgba[4 * k + 1] = Math.floor(rnd() * 256); rgba[4 * k + 2] = Math.floor(rnd() * 256);
    rgba[4 * k + 3] = rnd() < goluri ? Math.floor(rnd() * 128) : 128 + Math.floor(rnd() * 128);
  }
  return { latime: nx, inaltime: ny, rgba };
}

test('imaginea → relief: cazurile pe hârtie ale oracolului', () => {
  for (const c of CAZURI_IMAGINE) {
    const img = { latime: c.latime, inaltime: c.inaltime, rgba: Uint8Array.from(c.pixeli.flat()) };
    assert.deepEqual(judecaReliefDinImagine(img, c.optiuni, reliefDinPixeli(img.rgba, c.latime, c.inaltime, c.optiuni)), [], c.nume);
  }
});

test('imaginea → relief: imagini întâmplătoare, cu goluri, toate sursele, ambele sensuri, netezirea până la σ maxim', () => {
  const surse = ['l', 'r', 'g', 'b'] as const;
  for (let t = 0; t < 40; t++) {
    const nx = 1 + Math.floor(rnd() * 37), ny = 1 + Math.floor(rnd() * 29);
    const img = imagineIntamplatoare(nx, ny, rnd() * 0.3);
    const o: OptiuniReliefO = {
      sursa: surse[t % 4] ?? 'l', sigma: t % 5 === 0 ? 0 : rnd() * (SIGMA_MAXIM + 1), inaltime: 0.5 + rnd() * 20,
      baza: rnd() * 3, albSus: rnd() < 0.5,
    };
    assert.deepEqual(judecaReliefDinImagine(img, o, reliefDinPixeli(img.rgba, nx, ny, o)), [], `imaginea ${t}: ${nx} × ${ny}, σ ${o.sigma}`);
  }
});

test('netezirea: ordinul și ponderile binomiale (sumă 1, simetrice, exacte); σ peste maxim se taie la 50', () => {
  assert.equal(ordin(0), 0);
  assert.equal(ordin(0.5), 2);
  assert.equal(ordin(1), 4);
  assert.equal(ordin(100), 50);
  assert.deepEqual([...ponderi(2)], [0.25, 0.5, 0.25]);
  const w = ponderi(50);
  assert.equal(w.reduce((a, b) => a + b, 0), 1);
  for (let k = 0; k <= 50; k++) assert.equal(w[k], w[50 - k]);
});

test('dala: cazurile pe hârtie (codurile, constanta, golul, p = 0), octeții și amprentele din Python', async () => {
  for (const c of CAZURI_DALA) {
    const v = new Float32Array(CELULE_DALA).fill(c.toate ?? NaN);
    for (const [k, x] of Object.entries(c.valori)) v[Number(k)] = x;
    const d = cuantizeaza(v);
    assert.deepEqual(judecaDala(v, d), [], c.nume);
    assert.deepEqual(judecaCitire(d, citeste(d)), [], c.nume);
    if (d.fel === 'coduri' && c.asteptat.fel === 'coduri') {
      const o = octetiDala(d);
      assert.equal(amprentaO(o), c.asteptat.amprenta, c.nume);
      const inapoi = dalaDinOcteti(o);
      assert.ok(inapoi);
      assert.deepEqual(judecaDala(v, inapoi), [], `${c.nume}: din octeți`);
    }
  }
});

test('dala: dale întâmplătoare (goluri, plaje mici și mari, valori negative), judecate exact, cu octeții recitiți', () => {
  for (let t = 0; t < 12; t++) {
    const baza = rnd() * 200 - 100, plaja = 10 ** (rnd() * 6 - 3), goluri = t % 3 === 0 ? 0 : rnd() * 0.5;
    const v = new Float32Array(CELULE_DALA);
    for (let k = 0; k < v.length; k++) v[k] = rnd() < goluri ? NaN : baza + rnd() * plaja;
    const d = cuantizeaza(v);
    assert.deepEqual(judecaDala(v, d), [], `dala ${t}`);
    assert.deepEqual(judecaCitire(d, citeste(d)), [], `dala ${t}`);
    if (d.fel === 'coduri') {
      const o = cuantizeazaO(v);
      assert.equal(o.fel, 'coduri');
      if (o.fel === 'coduri') assert.equal(amprentaO(octetiDala(d)), amprentaO(octetiO(o)), `dala ${t}: octeții`);
    }
  }
});

test('dala: octeți stricați (lungimea, semnătura, m sau p nefinit, p negativ) nu dau o dală', () => {
  const v = new Float32Array(CELULE_DALA).fill(NaN);
  v[0] = 1; v[1] = 2;
  const d = cuantizeaza(v);
  assert.equal(d.fel, 'coduri');
  if (d.fel !== 'coduri') return;
  const bun = octetiDala(d);
  assert.ok(dalaDinOcteti(bun));
  assert.equal(dalaDinOcteti(bun.subarray(1)), null);
  const semn = bun.slice(); semn[0] = 0x58; assert.equal(dalaDinOcteti(semn), null);
  const nefinit = bun.slice(); new DataView(nefinit.buffer).setFloat64(4, NaN, true); assert.equal(dalaDinOcteti(nefinit), null);
  const negativ = bun.slice(); new DataView(negativ.buffer).setFloat64(12, -1, true); assert.equal(dalaDinOcteti(negativ), null);
});

test('stratul: harta 2 × 1 de pe hârtie (textul și amprenta din Python), grila citită înapoi', async () => {
  const st = await stratDinGrila(Float32Array.from(HARTA_2X1.valori), HARTA_2X1.nx, HARTA_2X1.ny);
  assert.equal(st.text, HARTA_2X1.text);
  assert.equal(st.amprenta, HARTA_2X1.amprenta);
  const g = grilaDinDale(2, 1, st.dale);
  assert.equal(g[0], 1.5);
  assert.ok(Number.isNaN(g[1]));
});

test('stratul: grile întâmplătoare peste mai multe dale (margini parțiale), harta ca a oracolului, citirea ca a oracolului', async () => {
  for (const [nx, ny] of [[300, 10], [257, 513], [1, 1], [256, 256], [520, 300]] as const) {
    const v = new Float32Array(nx * ny);
    for (let k = 0; k < v.length; k++) v[k] = rnd() < 0.1 ? NaN : rnd() < 0.3 ? 2.5 : rnd() * 9;
    // Un bloc constant pe toată prima dală (dacă încape), ca o dală constantă să apară.
    if (nx >= 256 && ny >= 256) for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) v[j * nx + i] = 4;
    const st = await stratDinGrila(v, nx, ny);
    const o = hartaGrileiO(v, nx, ny);
    assert.equal(st.text, o.text, `${nx} × ${ny}`);
    assert.equal(st.amprenta, amprentaO(o.text));
    const g = grilaDinDale(nx, ny, st.dale);
    for (let tj = 0, k = 0; tj < Math.ceil(ny / 256); tj++) {
      for (let ti = 0; ti < Math.ceil(nx / 256); ti++, k++) {
        const d = st.dale[k] as Dala;
        assert.deepEqual(judecaCitire(d, valoriDala(g, nx, ny, ti, tj)), [], `${nx} × ${ny}, dala ${ti}, ${tj}`);
      }
    }
    const inapoi = hartaDinText(st.text);
    assert.ok(inapoi);
    assert.equal(textHarta(inapoi), st.text);
  }
});

test('harta: un text stricat (alt v, alt număr de dale, o amprentă proastă, o constantă care nu e Float32) nu dă o hartă', () => {
  const bun = '{"dale":[null],"nx":2,"ny":1,"v":1}';
  assert.ok(hartaDinText(bun));
  for (const rau of [
    '{"dale":[null],"nx":2,"ny":1,"v":2}', '{"dale":[null,null],"nx":2,"ny":1,"v":1}', '{"dale":["abc"],"nx":2,"ny":1,"v":1}',
    '{"dale":[0.1],"nx":2,"ny":1,"v":1}', '{"dale":[null],"nx":0,"ny":1,"v":1}', '{"dale":[null],"nx":9000,"ny":1,"v":1}', 'nu',
  ]) assert.equal(hartaDinText(rau), null, rau);
});

test('compunerea: tabelul de pe hârtie și compuneri întâmplătoare, exact ca oracolul', () => {
  const st: StratO[] = COMPUNERE_HARTIE.straturi.map((x) => ({ ...x, valori: Float32Array.from(x.valori) }));
  assert.deepEqual([...compune(4, st)], COMPUNERE_HARTIE.asteptat);
  for (let t = 0; t < 30; t++) {
    const n = 1 + Math.floor(rnd() * 500), straturi: StratO[] = [];
    for (let k = 0; k < 1 + Math.floor(rnd() * 6); k++) {
      const v = new Float32Array(n);
      for (let c = 0; c < n; c++) v[c] = rnd() < 0.3 ? NaN : rnd() * 20 - 5;
      straturi.push({ mod: MODURI[Math.floor(rnd() * MODURI.length)] as ModO, vizibil: rnd() < 0.85, valori: v });
    }
    assert.deepEqual(judecaCompunere(n, straturi, compune(n, straturi)), [], `compunerea ${t}`);
  }
});

test('grila: plafoanele (8192 pe latură, celula 0,001 … 100 mm, latura cel mult 10 m)', () => {
  assert.equal(motivGrila({ nx: 8192, ny: 1, celula: 1 }), null);
  assert.equal(motivGrila({ nx: 8193, ny: 1, celula: 1 }), 'latura');
  assert.equal(motivGrila({ nx: 1.5, ny: 1, celula: 1 }), 'latura');
  assert.equal(motivGrila({ nx: 10, ny: 10, celula: 0.0009 }), 'celula');
  assert.equal(motivGrila({ nx: 10, ny: 10, celula: 101 }), 'celula');
  assert.equal(motivGrila({ nx: 8000, ny: 10, celula: 1.26 }), 'mm');
});

test('imaginea → relief: un relief întreg trecut prin strat se citește cu eroarea contractului (judecat de oracol)', async () => {
  const img = imagineIntamplatoare(300, 260, 0.05);
  const o: OptiuniReliefO = { sursa: 'l', sigma: 1, inaltime: 12, baza: 0.5, albSus: true };
  const r = reliefDinPixeli(img.rgba, 300, 260, o);
  assert.deepEqual(judecaReliefDinImagine(img, o, r), []);
  const st = await stratDinGrila(r, 300, 260);
  const asteptat = reliefDinImagineO(img, o);
  const g = grilaDinDale(300, 260, st.dale);
  for (let k = 0; k < g.length; k++) {
    const a = asteptat[k] ?? NaN, b = g[k] ?? NaN;
    if (Number.isNaN(a)) { assert.ok(Number.isNaN(b)); continue; }
    assert.ok(Math.abs(a - b) <= 13 / 131_068 + 1e-6, `[${k}]: ${a} → ${b}`);
  }
});

test('stratul: dalele citite din hartă și din octeții lor dau aceeași grilă; octeții lipsă sau stricați sunt numiți, nu inventați', async () => {
  const nx = 512, ny = 260, v = new Float32Array(nx * ny);
  for (let k = 0; k < v.length; k++) v[k] = rnd() < 0.1 ? NaN : (k % 7) * 0.25;
  // O dală constantă (plină, deci fără goluri) și una goală, pe lângă cele cu coduri.
  for (let j = 0; j < 256; j++) for (let i = 256; i < nx; i++) v[j * nx + i] = 1.5;
  for (let j = 256; j < ny; j++) for (let i = 256; i < nx; i++) v[j * nx + i] = NaN;
  const st = await stratDinGrila(v, nx, ny);
  assert.deepEqual(st.harta.dale.map((e) => (e === null ? 'gol' : typeof e)), ['string', 'number', 'string', 'gol']);
  const r = daleDinHarta(st.harta, (h) => st.octeti.get(h));
  assert.ok(r.ok);
  assert.deepEqual([...grilaDinDale(nx, ny, r.dale)], [...grilaDinDale(nx, ny, st.dale)]);
  const prima = st.harta.dale[0] as string;
  // Aserțiunile pe câmpuri, nu pe tot rezultatul: un diff al dalelor (65 536 de coduri fiecare) umple memoria.
  const lipsa = daleDinHarta(st.harta, (h) => (h === prima ? undefined : st.octeti.get(h)));
  assert.equal(lipsa.ok, false);
  assert.deepEqual(lipsa.ok ? null : lipsa.lipsa, [prima]);
  const stricat = daleDinHarta(st.harta, (h) => (h === prima ? new Uint8Array(10) : st.octeti.get(h)));
  assert.equal(stricat.ok, false);
  assert.deepEqual(stricat.ok ? null : stricat.lipsa, [prima]);
});
