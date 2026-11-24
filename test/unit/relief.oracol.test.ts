/**
 * Proba oracolului reliefului (ADR 0311), înaintea nucleului: oracolul dă valorile de pe hârtie, iar judecățile lui prind
 * controalele negative din ADR 0311 §8 (fiecare e o implementare greșită, scrisă aici).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amprentaO, citesteO, compuneO, cuantizeazaO, CELULE_DALA_O, COD_GOL_O, hartaGrileiO, judecaCitire, judecaCompunere,
  judecaDala, judecaReliefDinImagine, margineEroareO, octetiO, reliefDinImagineO, ulp32O, type DalaO, type ImagineO,
  type StratO,
} from '../oracles/relief.ts';
import { CAZURI_DALA, CAZURI_IMAGINE, COMPUNERE_HARTIE, HARTA_2X1, type CazImagineO } from '../oracles/relief.cazuri.ts';

const imagine = (c: CazImagineO): ImagineO => ({ latime: c.latime, inaltime: c.inaltime, rgba: Uint8Array.from(c.pixeli.flat()) });
const dalaDin = (valori: Readonly<Record<number, number>>, toate?: number): Float32Array => {
  const d = new Float32Array(CELULE_DALA_O).fill(toate ?? NaN);
  for (const [k, v] of Object.entries(valori)) d[Number(k)] = v;
  return d;
};
const straturiHartie = (): StratO[] => COMPUNERE_HARTIE.straturi.map((s) => ({ ...s, valori: Float32Array.from(s.valori) }));

test('oracolul: relieful din imagine dă valorile de pe hârtie (luminanța, canalele, alfa, orientarea, sensul, netezirea)', () => {
  for (const c of CAZURI_IMAGINE) {
    const r = reliefDinImagineO(imagine(c), c.optiuni);
    assert.equal(r.length, c.asteptat.length, c.nume);
    c.asteptat.forEach((v, k) => {
      const x = r[k] ?? NaN;
      if (Number.isNaN(v)) assert.ok(Number.isNaN(x), `${c.nume} [${k}]: gol așteptat, ${x}`);
      else assert.ok(Math.abs(x - Math.fround(v)) <= ulp32O(v), `${c.nume} [${k}]: ${v} așteptat, ${x}`);
    });
    assert.deepEqual(judecaReliefDinImagine(imagine(c), c.optiuni, r), [], c.nume);
  }
});

test('oracolul: dalele de pe hârtie (codurile, constanta, golul, citirea) și amprentele din Python', () => {
  for (const c of CAZURI_DALA) {
    const d = cuantizeazaO(dalaDin(c.valori, c.toate));
    assert.equal(d.fel, c.asteptat.fel, c.nume);
    if (c.asteptat.fel === 'constanta' && d.fel === 'constanta') assert.equal(d.m, c.asteptat.m, c.nume);
    if (c.asteptat.fel === 'coduri' && d.fel === 'coduri') {
      assert.equal(d.m, c.asteptat.m, c.nume);
      assert.equal(d.p, c.asteptat.p, c.nume);
      for (const [k, v] of Object.entries(c.asteptat.coduri)) assert.equal(d.coduri[Number(k)], v, `${c.nume}: codul [${k}]`);
      const citit = citesteO(d);
      for (const [k, v] of Object.entries(c.asteptat.citite)) {
        const x = citit[Number(k)] ?? NaN;
        if (Number.isNaN(v)) assert.ok(Number.isNaN(x), `${c.nume}: citit [${k}]`);
        else assert.equal(x, v, `${c.nume}: citit [${k}]`);
      }
      assert.equal(octetiO(d).length, 131_092);
      assert.equal(amprentaO(octetiO(d)), c.asteptat.amprenta, `${c.nume}: amprenta`);
    }
  }
});

test('oracolul: harta grilei 2 × 1 e textul canonic de pe hârtie, cu amprenta din Python', () => {
  const h = hartaGrileiO(Float32Array.from(HARTA_2X1.valori), HARTA_2X1.nx, HARTA_2X1.ny);
  assert.equal(h.text, HARTA_2X1.text);
  assert.equal(amprentaO(h.text), HARTA_2X1.amprenta);
});

test('oracolul: compunerea de pe hârtie (toate modurile, golurile, stratul ascuns, ordinea)', () => {
  assert.deepEqual([...compuneO(4, straturiHartie())], COMPUNERE_HARTIE.asteptat);
});

test('oracolul: eroarea citirii e cel mult p / 2 plus rotunjirea la Float32, pe dale întâmplătoare', () => {
  let s = 12345;
  const rnd = (): number => { s = (s * 1_103_515_245 + 12_345) % 2 ** 31; return s / 2 ** 31; };
  for (let t = 0; t < 20; t++) {
    const baza = rnd() * 100 - 50, amplitudine = 10 ** (rnd() * 4 - 2);
    const v = new Float32Array(CELULE_DALA_O);
    for (let k = 0; k < v.length; k++) v[k] = rnd() < 0.05 ? NaN : baza + rnd() * amplitudine;
    const d = cuantizeazaO(v);
    assert.equal(d.fel, 'coduri');
    if (d.fel !== 'coduri') continue;
    const c = citesteO(d);
    for (let k = 0; k < v.length; k++) {
      const a = v[k] ?? NaN, b = c[k] ?? NaN;
      if (Number.isNaN(a)) { assert.ok(Number.isNaN(b)); assert.equal(d.coduri[k], COD_GOL_O); continue; }
      assert.ok(Math.abs(a - b) <= margineEroareO(d, a), `dala ${t}, [${k}]: ${a} → ${b}`);
    }
  }
});

// ---- Controalele negative (ADR 0311 §8): fiecare implementare greșită trebuie prinsă. ----

/** O implementare a reliefului din imagine, cu un defect ales. */
function reliefGresit(img: ImagineO, o: CazImagineO['optiuni'], defect: 'rec601' | 'fara-intoarcere' | 'umple-golurile'): Float32Array {
  const nx = img.latime, ny = img.inaltime, g = new Float64Array(nx * ny);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const p = 4 * (y * nx + x), r = img.rgba[p] ?? 0, gg = img.rgba[p + 1] ?? 0, b = img.rgba[p + 2] ?? 0, a = img.rgba[p + 3] ?? 0;
      const v = a < 128 ? NaN : o.sursa === 'r' ? r / 255 : o.sursa === 'g' ? gg / 255 : o.sursa === 'b' ? b / 255
        : defect === 'rec601' ? (299 * r + 587 * gg + 114 * b) / 255_000 : (2126 * r + 7152 * gg + 722 * b) / 2_550_000;
      g[(defect === 'fara-intoarcere' ? y : ny - 1 - y) * nx + x] = v;
    }
  }
  if (defect === 'umple-golurile') for (let k = 0; k < g.length; k++) if (Number.isNaN(g[k] ?? 0)) g[k] = 0.5;
  // Fără netezire în implementarea greșită: cazurile alese pentru ea au σ = 0, iar golul umplut se vede oricum.
  const out = new Float32Array(g.length);
  for (let k = 0; k < g.length; k++) {
    const v = g[k] ?? NaN;
    out[k] = Number.isNaN(v) ? NaN : o.albSus ? o.baza + v * o.inaltime : o.baza + (1 - v) * o.inaltime;
  }
  return out;
}

const caz = (nume: string): CazImagineO => {
  const c = CAZURI_IMAGINE.find((x) => x.nume.startsWith(nume));
  assert.ok(c, nume);
  return c;
};

test('controlul negativ: coeficienții Rec. 601 în locul celor 709 sunt prinși', () => {
  const c = caz('luminanța');
  assert.ok(judecaReliefDinImagine(imagine(c), c.optiuni, reliefGresit(imagine(c), c.optiuni, 'rec601')).length > 0);
});

test('controlul negativ: pixelul pus pe rândul j = y (fără întoarcere) e prins', () => {
  const c = caz('orientarea');
  assert.ok(judecaReliefDinImagine(imagine(c), c.optiuni, reliefGresit(imagine(c), c.optiuni, 'fara-intoarcere')).length > 0);
});

test('controlul negativ: golul umplut e prins', () => {
  const c = caz('alfa');
  assert.ok(judecaReliefDinImagine(imagine(c), c.optiuni, reliefGresit(imagine(c), c.optiuni, 'umple-golurile')).length > 0);
});

test('controlul negativ: netezirea care umple golul e prinsă', () => {
  const c = caz('netezirea sare golul');
  const bun = reliefDinImagineO(imagine(c), c.optiuni);
  const gresit = Float32Array.from(bun);
  gresit[1] = 6;
  assert.ok(judecaReliefDinImagine(imagine(c), c.optiuni, gresit).length > 0);
});

test('controlul negativ: floor în locul lui round la cod și golul codat 0 sunt prinse', () => {
  const c = CAZURI_DALA[0];
  assert.ok(c);
  const v = dalaDin(c.valori);
  const bun = cuantizeazaO(v);
  assert.equal(bun.fel, 'coduri');
  if (bun.fel !== 'coduri') return;
  const cuFloor: DalaO = { ...bun, coduri: bun.coduri.map((_, k) => {
    const x = v[k] ?? NaN;
    return Number.isNaN(x) ? COD_GOL_O : Math.floor((x - bun.m) / bun.p);
  }) };
  assert.ok(judecaDala(v, cuFloor).length > 0);
  const golZero: DalaO = { ...bun, coduri: bun.coduri.map((x) => (x === COD_GOL_O ? 0 : x)) };
  assert.ok(judecaDala(v, golZero).length > 0);
  assert.ok(judecaCitire(bun, citesteO(golZero)).length > 0);
  assert.deepEqual(judecaDala(v, bun), []);
});

test('controlul negativ: compunerea de sus în jos e prinsă', () => {
  const st = straturiHartie();
  assert.ok(judecaCompunere(4, st, compuneO(4, [...st].reverse())).length > 0);
  assert.deepEqual(judecaCompunere(4, st, compuneO(4, st)), []);
});
