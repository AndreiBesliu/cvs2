/**
 * Înălțimile pieselor LEGO din profilul imprimantei (ADR 0168): știftul (`stift_h`, implicit 1,9 mm) și locașul de sub o piesă
 * plină (`locas_h`, implicit 2,1 mm), alese de owner („Defaults 1.9 / 2.1”). Pe hârtie, pe o placă 1 × 1 (H = 3,2 mm):
 * - știftul e un cilindru de la H − 0,01 la H + stift_h, deci vârful piesei e la 3,2 + stift_h;
 * - fundul plin are inelul din jurul locașului de la 0 la ad = min(locas_h, H − 0,8) și capacul de la ad − 0,01 (corpurile se
 *   suprapun cu 0,01, ca feliatorul să le unească), deci ad și ad − 0,01 sunt printre înălțimile vârfurilor;
 * - locașul nu mai urmează știftul în motor: legătura „urmează știftul (+ 0,2)” e a profilului, în `Lego.inaltimi`.
 * Referințele v18 (`trenulet.referinte.test.ts`) rulează cu înălțimile lui v18 (1,8 / 2,0), deci apără restul geometriei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Def = Record<string, unknown>;
type Lego = {
  IMPLICIT: Record<string, unknown>;
  seteaza(s?: Record<string, unknown> | null): void;
  construieste(d: Def): { tri: Tri[] };
  calibrare(): { nume: string; titlu: string; tri: Tri[] }[];
  inaltimi(v: Record<string, unknown> | null | undefined): { stift_h: number; locas_h: number };
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();

const zuri = (tri: readonly Tri[]): Set<number> => new Set(tri.flatMap((t) => t.map((p) => Math.round(p[2] * 1e6) / 1e6)));
const varf = (tri: readonly Tri[]): number => Math.max(...tri.flatMap((t) => t.map((p) => p[2])));
const aproape = (a: number, b: number, mesaj: string): void => { assert.ok(Math.abs(a - b) < 1e-9, `${mesaj}: ${a} ≠ ${b}`); };
const placa = (fund: string): Tri[] => L.construieste({ tip: 'caramida', celule: [[0, 0]], placi: 1, fund }).tri;
// obiectele motorului vin din contextul lui vm (alt tărâm): comparate după conținut
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const cu = <T>(s: Record<string, unknown>, f: () => T): T => { L.seteaza(s); try { return f(); } finally { L.seteaza({}); } };

test('implicitele motorului: știftul 1,9 mm, locașul 2,1 mm (ADR 0168)', () => {
  assert.equal(L.IMPLICIT['stift_h'], 1.9);
  assert.equal(L.IMPLICIT['locas_h'], 2.1);
});

test('atelierul pornește cu aceleași înălțimi ca motorul (SETARI_IMPLICIT, lângă variante), cu locașul după știft', () => {
  // atelierul e un script clasic al paginii: implicitele lui se citesc din sursă (o singură valoare, în două locuri)
  const sursa = readFileSync('extensii/trenulet/sursa/planificator/atelier.ts', 'utf8');
  const m = /const SETARI_IMPLICIT = \{[^}]*\bstift_h: ([\d.]+), locas_h: ([\d.]+), locas_urmeaza: (true|false)/.exec(sursa);
  assert.ok(m, 'SETARI_IMPLICIT cu înălțimile');
  assert.equal(Number(m[1]), L.IMPLICIT['stift_h']);
  assert.equal(Number(m[2]), L.IMPLICIT['locas_h']);
  assert.equal(m[3], 'true');
  // și profilul imprimantei le ține pe toate trei
  assert.match(sursa, /const CHEI_IMPRIMANTA[^\n]*"stift_h", "locas_h", "locas_urmeaza"\]/);
});

test('știftul: vârful piesei la H + stift_h, pe fundul cu tuburi și pe cel plin', () => {
  for (const fund of ['tuburi', 'locasuri']) {
    aproape(cu({}, () => varf(placa(fund))), 5.1, `${fund}, implicit`);
    aproape(cu({ stift_h: 2.3 }, () => varf(placa(fund))), 5.5, `${fund}, 2,3`);
    aproape(cu({ stift_h: 1 }, () => varf(placa(fund))), 4.2, `${fund}, 1,0`);
  }
});

test('locașul fundului plin: de la 0 la locas_h, capacul cu 0,01 mai jos; cel mult H − 0,8; nu urmează știftul', () => {
  const z = cu({}, () => zuri(placa('locasuri')));
  assert.ok(z.has(2.1) && z.has(2.09), [...z].join(' '));
  const z15 = cu({ locas_h: 1.5 }, () => zuri(placa('locasuri')));
  assert.ok(z15.has(1.5) && z15.has(1.49) && !z15.has(2.1), [...z15].join(' '));
  // pe o placă (H = 3,2), locașul se oprește la 2,4: rămâne 0,8 mm de capac
  const z30 = cu({ locas_h: 3 }, () => zuri(placa('locasuri')));
  assert.ok(z30.has(2.4) && !z30.has(3), [...z30].join(' '));
  // știftul mai înalt nu adâncește locașul (legătura e a profilului)
  const zs = cu({ stift_h: 2.5 }, () => zuri(placa('locasuri')));
  assert.ok(zs.has(2.1) && !zs.has(2.7), [...zs].join(' '));
});

test('locașul vine din locas_h la toate piesele cu fund plin: cărămida, panta, panta inversă, pana, piesa rotundă, Technic', () => {
  const piese: Def[] = [
    { tip: 'caramida', celule: [[0, 0], [1, 0]], placi: 3, fund: 'locasuri' },
    { tip: 'panta', lung: 2, adanc: 3, sus: 1, placi: 3, buza: 1.6, profil: 'drept' },
    { tip: 'pantaInversa', lung: 2, adanc: 2, sus: 1, placi: 3 },
    { tip: 'pana', lung: 4, lat: 2, varf: 1, inceput: 0, parte: 'stanga', placi: 3, stifturi: true },
    { tip: 'rotund', diam: 2, placi: 3, forma: 'cilindru', varf_d: 5.4, stifturi: 'toate' },
    { tip: 'caramidaTechnic', lung: 2 },
  ];
  for (const d of piese) {
    const z15 = cu({ locas_h: 1.5 }, () => zuri(L.construieste(d).tri));
    const z17 = cu({ locas_h: 1.7 }, () => zuri(L.construieste(d).tri));
    assert.ok(z15.has(1.5) && !z15.has(1.7), `${d['tip']}: ${[...z15].join(' ')}`);
    assert.ok(z17.has(1.7) && !z17.has(1.5), `${d['tip']}: ${[...z17].join(' ')}`);
    // același locaș, oricât de înalt e știftul
    const a = cu({ locas_h: 1.5, stift_h: 1.8 }, () => zuri(L.construieste(d).tri));
    const b = cu({ locas_h: 1.5, stift_h: 2.4 }, () => zuri(L.construieste(d).tri));
    assert.ok(a.has(1.5) && b.has(1.5), d['tip'] as string);
  }
});

test('înălțimile din profil (Lego.inaltimi): zecimile, marginile, „urmează știftul”, profilul vechi', () => {
  // un profil de dinainte de 18.8.0, fără înălțimi: implicitele, cu locașul după știft
  assert.deepEqual(simplu(L.inaltimi({})), { stift_h: 1.9, locas_h: 2.1 });
  assert.deepEqual(simplu(L.inaltimi(null)), { stift_h: 1.9, locas_h: 2.1 });
  // la zecimi; „urmează știftul” e pornită dacă lipsește
  assert.deepEqual(simplu(L.inaltimi({ stift_h: 2.04 })), { stift_h: 2, locas_h: 2.2 });
  assert.deepEqual(simplu(L.inaltimi({ stift_h: 1.96, locas_urmeaza: true, locas_h: 3 })), { stift_h: 2, locas_h: 2.2 });
  assert.deepEqual(simplu(L.inaltimi({ stift_h: '1,8', locas_urmeaza: true })), { stift_h: 1.8, locas_h: 2 });
  // oprită: locașul e al lui
  assert.deepEqual(simplu(L.inaltimi({ stift_h: 1.9, locas_h: 2.54, locas_urmeaza: false })), { stift_h: 1.9, locas_h: 2.5 });
  // marginile: știftul 1,0–3,0, locașul 1,0–4,0 (și când urmează)
  assert.deepEqual(simplu(L.inaltimi({ stift_h: 0.2, locas_h: 9, locas_urmeaza: false })), { stift_h: 1, locas_h: 4 });
  assert.deepEqual(simplu(L.inaltimi({ stift_h: 7, locas_urmeaza: true })), { stift_h: 3, locas_h: 3.2 });
  // ce nu e număr: implicitul
  assert.deepEqual(simplu(L.inaltimi({ stift_h: 'x', locas_h: null, locas_urmeaza: false })), { stift_h: 1.9, locas_h: 2.1 });
  assert.deepEqual(simplu(L.inaltimi({ stift_h: Number.NaN, locas_h: '', locas_urmeaza: false })), { stift_h: 1.9, locas_h: 2.1 });
});

test('placa de calibrare a înălțimilor: cinci plăci 2 × 2, știfturi de 1,7–2,1 mm, locașurile cu 0,2 mai adânci', () => {
  const c = cu({}, () => L.calibrare()).filter((x) => x.nume.startsWith('calibrare_inaltime_'));
  assert.deepEqual(simplu(c.map((x) => x.nume)), [1, 2, 3, 4, 5].map((v) => `calibrare_inaltime_${v}`));
  c.forEach((x, k) => {
    const h = [1.7, 1.8, 1.9, 2, 2.1][k]!;
    aproape(varf(x.tri), 3.2 + h, x.nume);
    const z = zuri(x.tri), ad = Math.round((h + 0.2) * 10) / 10;
    assert.ok(z.has(ad) && z.has(Math.round((ad - 0.01) * 1e6) / 1e6), `${x.nume}: ${[...z].join(' ')}`);
    assert.match(x.titlu, new RegExp(`${k + 1}`));
  });
  // cu înălțimile alese în profil, placa de calibrare rămâne aceeași (variantele ei sunt absolute)
  const alt = cu({ stift_h: 2.6, locas_h: 1.2 }, () => L.calibrare()).filter((x) => x.nume.startsWith('calibrare_inaltime_'));
  alt.forEach((x, k) => { aproape(varf(x.tri), 3.2 + [1.7, 1.8, 1.9, 2, 2.1][k]!, x.nume); });
});
