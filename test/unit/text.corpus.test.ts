import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Varf } from '../../src/geom/contur.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';

/**
 * Corpusul independent al textului (ADR 0105): ce scrie fontTools (`test/oracles-py/text_corpus.py`) din fonturile livrate și
 * din variantele lor, față de ce citește și așază aplicația. Fiecare glifă, în ordine, cu fiecare contur: aceleași vârfuri și
 * aceleași segmente (liniile și cubicele ridicate din pătratice), sub 1e-9 mm, pornind de unde pornește fontTools (conturul e
 * același ciclu, startul poate diferi). Plus caracterele lipsă și înălțimea majusculei.
 */

type Segment = ['L', number, number] | ['C', number, number, number, number, number, number];
type Asteptat = {
  readonly font: string;
  readonly parametri: ParametriText;
  readonly majuscula: number;
  readonly lipsa: number;
  readonly glife: ReadonlyArray<{ readonly caracter: string; readonly rand: number; readonly contururi: ReadonlyArray<{ readonly start: readonly [number, number]; readonly segmente: readonly Segment[] }> }>;
};

const RAD = new URL('../../', import.meta.url);
const ASTEPTAT = JSON.parse(readFileSync(new URL('test/fixtures/text/asteptat.json', RAD), 'utf8')) as Readonly<Record<string, Asteptat>>;
const TOL = 1e-9;
const fonturi = new Map<string, Font>();
function font(cale: string): Font {
  const gata = fonturi.get(cale);
  if (gata) return gata;
  const r = citesteFont(new Uint8Array(readFileSync(new URL(cale, RAD))));
  if (!r.ok) throw new Error(`${cale}: ${r.cod} ${r.detaliu ?? ''}`);
  fonturi.set(cale, r.font);
  return r.font;
}

/** Segmentele unui contur închis, fiecare din vârful lui: [x0, y0, tip, ...]. */
type Pas = { readonly a: readonly [number, number]; readonly s: Segment };
function pasiAplicatie(varfuri: readonly Varf[]): Pas[] {
  return varfuri.map((v, k) => {
    const urm = varfuri[(k + 1) % varfuri.length]!.p;
    const s: Segment = v.s.tip === 'C' ? ['C', v.s.c1.x, v.s.c1.y, v.s.c2.x, v.s.c2.y, urm.x, urm.y] : ['L', urm.x, urm.y];
    assert.notEqual(v.s.tip, 'A', 'un font n-are arce');
    return { a: [v.p.x, v.p.y], s };
  });
}
function pasiOracol(c: Asteptat['glife'][number]['contururi'][number]): Pas[] {
  let a: readonly [number, number] = c.start;
  return c.segmente.map((s) => {
    const p: Pas = { a, s };
    a = [s[s.length - 2] as number, s[s.length - 1] as number];
    return p;
  });
}
const egale = (x: readonly number[], y: readonly number[]): boolean => x.length === y.length && x.every((v, i) => Math.abs(v - (y[i] as number)) <= TOL);

for (const [nume, a] of Object.entries(ASTEPTAT)) {
  test(`corpusul textului: ${nume} (${a.font}), față de fontTools`, () => {
    const f = font(a.font);
    assert.equal(f.majuscula, a.majuscula);
    const r = aseazaText(f, a.parametri);
    assert.equal(r.raport.lipsa, a.lipsa);
    // Glifele corpusului nu se suprapun pe ele însele: normalizarea nu le schimbă (altfel compararea n-ar fi cu fontTools).
    assert.equal(r.raport['nonzero-normalizate'], 0);
    assert.equal(r.raport['nonzero-refuzate'], 0);
    assert.deepEqual(r.glife.map((g) => [g.caracter, g.rand]), a.glife.map((g) => [g.caracter, g.rand]));
    a.glife.forEach((ga, i) => {
      const gb = r.glife[i]!;
      assert.equal(gb.cai.length, ga.contururi.length, `${ga.caracter}: numărul contururilor`);
      ga.contururi.forEach((ca, j) => {
        const cb = gb.cai[j]!;
        assert.ok(cb.inchis);
        const o = pasiOracol(ca), p = pasiAplicatie(cb.varfuri);
        assert.equal(p.length, o.length, `${ga.caracter} conturul ${j}: segmentele`);
        // Același ciclu: startul oracolului e un vârf al conturului aplicației.
        const r0 = p.findIndex((x) => egale(x.a, o[0]!.a));
        assert.ok(r0 >= 0, `${ga.caracter} conturul ${j}: startul ${o[0]!.a.join(', ')} nu e un vârf`);
        o.forEach((x, k) => {
          const y = p[(r0 + k) % p.length]!;
          assert.ok(egale(x.a, y.a) && x.s[0] === y.s[0] && egale(x.s.slice(1) as number[], y.s.slice(1) as number[]),
            `${ga.caracter} conturul ${j}, segmentul ${k}: ${JSON.stringify(x)} față de ${JSON.stringify(y)}`);
        });
      });
    });
  });
}

test('pe hârtie (ADR 0019, criteriul din cercetare): „LEMN” de 20 mm are fiecare majusculă de la 0 la exact 20 mm', () => {
  const r = aseazaText(font('public/fonturi/roboto.ttf'), { continut: 'LEMN', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' });
  for (const g of r.glife) {
    const ys = g.cai.flatMap((c) => c.varfuri.flatMap((v) => (v.s.tip === 'C' ? [v.p.y, v.s.c1.y, v.s.c2.y] : [v.p.y])));
    assert.equal(Math.min(...ys), 0, g.caracter);
    assert.equal(Math.max(...ys), 20, g.caracter);
  }
});
