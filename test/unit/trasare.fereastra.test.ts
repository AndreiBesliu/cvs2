import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { DICTIONARE_MODULE } from '../../scripts/mesaje.ts';
import { adaugaMesaje, schimbaLimba } from '../../src/i18n/t.ts';
import type { CaiTrasate } from '../../src/trasare/trasare.ts';
import {
  CHEIE_TINUTE, citesteTinute, cutieCai, scrieTinute, textMarime, TINUTE_IMPLICITE, TOLERANTA_MARIME,
} from '../../src/ui/fereastraTrasareCalcul.ts';

/**
 * Partea pură a ferestrei trasării refăcute (ADR 0273, felia 25.9↑): „Desenul” după limbă (§6), alegerile ținute în
 * browser (răspunsurile 1a–3a, cu variantele ca opțiuni) și cutia căilor trasate (chenarul desenului, §4), pe hârtie.
 */

adaugaMesaje(DICTIONARE_MODULE.import);

test('„Desenul”: două zecimale, virgula în română, punctul în engleză, fără separatorul miilor', () => {
  schimbaLimba('ro');
  assert.equal(textMarime(327.0649, 72.4151, 'ro'), 'Desenul: 327,06 × 72,42 mm');
  assert.equal(textMarime(1524, 80, 'ro'), 'Desenul: 1524,00 × 80,00 mm');
  schimbaLimba('en');
  assert.equal(textMarime(1524, 80, 'en'), 'Drawing: 1524.00 × 80.00 mm');
  assert.equal(textMarime(0.005, 25.4, 'en'), 'Drawing: 0.01 × 25.40 mm');
  schimbaLimba('ro');
});

/** O stocare în memorie, în locul celei a browserului (sau una care aruncă, ca într-o fereastră privată blocată). */
function cuStocare<T>(f: () => T, arunca = false): { readonly r: T; readonly scris: Map<string, string> } {
  const scris = new Map<string, string>();
  const g = globalThis as { localStorage?: unknown };
  const vechi = Object.getOwnPropertyDescriptor(g, 'localStorage');
  Object.defineProperty(g, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => { if (arunca) throw new Error('blocat'); return scris.get(k) ?? null; },
      setItem: (k: string, v: string) => { if (arunca) throw new Error('blocat'); scris.set(k, v); },
    },
  });
  try {
    return { r: f(), scris };
  } finally {
    if (vechi) Object.defineProperty(g, 'localStorage', vechi);
    else delete g.localStorage;
  }
}

test('alegerile ținute: implicitele răspunsurilor (Imaginea și Curățarea strânse, fără Simplu, mărimea desenului fixă)', () => {
  assert.deepEqual(TINUTE_IMPLICITE, {
    deschise: { imagine: false, trasare: true, curatare: false, marime: true }, simplu: false, detalii: false, marime: 'desen', fix: 'marime',
  });
  assert.deepEqual(cuStocare(() => citesteTinute()).r, TINUTE_IMPLICITE, 'fără nimic ținut');
  assert.deepEqual(cuStocare(() => citesteTinute(), true).r, TINUTE_IMPLICITE, 'cu stocarea blocată');
});

test('alegerile ținute: scrise și citite înapoi; versiunea străină, JSON-ul stricat și valorile străine iau implicitele', () => {
  const x = { deschise: { imagine: true, trasare: false, curatare: true, marime: false }, simplu: true, detalii: true, marime: 'imagine', fix: 'scara' } as const;
  const { r, scris } = cuStocare(() => { scrieTinute(x); return citesteTinute(); });
  assert.deepEqual(r, x);
  assert.deepEqual(JSON.parse(scris.get(CHEIE_TINUTE) ?? ''), { v: 1, ...x });
  const citit = (text: string) => cuStocare(() => { localStorage.setItem(CHEIE_TINUTE, text); return citesteTinute(); }).r;
  assert.deepEqual(citit(JSON.stringify({ v: 2, ...x })), TINUTE_IMPLICITE, 'altă versiune');
  assert.deepEqual(citit('{nu e json'), TINUTE_IMPLICITE, 'JSON stricat');
  assert.deepEqual(citit('null'), TINUTE_IMPLICITE);
  assert.deepEqual(citit(JSON.stringify({ v: 1, deschise: { imagine: 'da', marime: false }, simplu: 1, marime: 'altceva', fix: 'altceva' })), {
    ...TINUTE_IMPLICITE, deschise: { ...TINUTE_IMPLICITE.deschise, marime: false },
  }, 'doar valorile bune trec, fiecare pe cheia ei');
  scrieTinute(x); // fără stocare deloc (Node fără localStorage): nu aruncă
});

/** Căi trasate din vârfuri (x, y), mânere și felul segmentului care pleacă din vârf (1 = cubică). */
function cai(vf: ReadonlyArray<readonly [number, number, number, number, number, number, 0 | 1]>, deschisa = false): CaiTrasate {
  return {
    inceput: Uint32Array.from([0, vf.length]), tip: Uint8Array.from(vf.map((v) => v[6])), xy: Float64Array.from(vf.flatMap((v) => v.slice(0, 6))),
    exterior: Uint8Array.from([1]), ...(deschisa ? { deschisa: Uint8Array.from([1]) } : {}),
  };
}

test('cutia căilor: extremele cubicelor, nu mânerele (pe hârtie: 30·u·(1 − u) are vârful 7,5 la u = ½)', () => {
  // (0, 0) → cubică cu mânerele (0, 10) și (10, 10) → (10, 0) → linie înapoi: y(u) = 30·u·(1 − u), deci y1 = 7,5, nu 10.
  const c = cutieCai(cai([[0, 0, 0, 10, 10, 10, 1], [10, 0, 0, 0, 0, 0, 0]]));
  assert.ok(c);
  assert.deepEqual([c.x0, c.y0, c.x1], [0, 0, 10]);
  assert.ok(Math.abs(c.y1 - 7.5) < 1e-12, String(c.y1));
  // O cubică în S: mânerele (0, 10) și (10, −10) dau extremele y(u) = 30u(1−u)(1−2u), la u = ½ ∓ √3/6: ±10/(2√3) ≈ ±2,8868.
  const s = cutieCai(cai([[0, 0, 0, 10, 10, -10, 1], [10, 0, 0, 0, 0, 0, 0]]));
  assert.ok(s);
  const e = 10 / (2 * Math.sqrt(3));
  assert.ok(Math.abs(s.y1 - e) < 1e-12 && Math.abs(s.y0 + e) < 1e-12, `${s.y0} ${s.y1}`);
});

test('cutia căilor: pe o cale deschisă, ultimul vârf n-are segment (mânerele lui nu contează); fără căi, null', () => {
  const c = cutieCai(cai([[0, 0, 0, 0, 0, 0, 0], [10, 0, 50, 50, 60, 60, 1]], true));
  assert.deepEqual(c, { x0: 0, y0: 0, x1: 10, y1: 0 });
  assert.equal(cutieCai({ inceput: Uint32Array.from([0]), tip: new Uint8Array(0), xy: new Float64Array(0), exterior: new Uint8Array(0) }), null);
});

test('toleranța mărimii desenului e sub jumătate de sutime: „Desenul” arată exact ce ai scris', () => {
  assert.ok(TOLERANTA_MARIME < 0.005);
  schimbaLimba('ro');
  assert.equal(textMarime(300 + TOLERANTA_MARIME, 66.5, 'ro'), 'Desenul: 300,00 × 66,50 mm');
  assert.equal(textMarime(300 - TOLERANTA_MARIME, 66.5, 'ro'), 'Desenul: 300,00 × 66,50 mm');
});
