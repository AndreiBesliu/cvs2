import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cerculArcului, type Punct, type Segment } from '../../src/geom/contur.ts';
import { citesteWmf, CODURI_AVERTISMENT_WMF, type CaleWmf } from '../../src/io/wmf.ts';

/**
 * Corpusul independent al importului WMF (ADR 0117): fișierele scrise de `test/oracles-py/wmf_import_corpus.py`, redate acolo
 * de GDI (implementarea de referință, pe imprimanta „Microsoft Print to PDF”) și recitite cu PyMuPDF față de valorile lor pe
 * hârtie. Aici, ușa le citește, iar fiecare cale citită trebuie să urmeze, bucată cu bucată, o cale de pe hârtie (sub 1e-6
 * mm), și invers; plus raportul exact (restul codurilor, 0), unitățile și cadrul, sau refuzul scris, cu detaliul lui.
 */

type Pereche = readonly [number, number];
type Bucata =
  | { readonly L: Pereche }
  | { readonly A: Pereche; readonly c: Pereche; readonly dt: number }
  | { readonly E: Pereche; readonly c: Pereche; readonly rx: number; readonly ry: number; readonly t0: number; readonly dt: number };
type CaleHartie = { readonly ce: string; readonly inchis: boolean; readonly start: Pereche; readonly piese: readonly Bucata[] };
type Asteptat = {
  readonly refuz?: string;
  readonly detaliu?: string;
  readonly cai?: readonly CaleHartie[];
  readonly raport?: Readonly<Record<string, number>>;
  readonly unitati?: { readonly sursa: string; readonly inch?: number; readonly unitate?: string; readonly mm?: number };
  readonly cadru?: readonly [number, number] | null;
};

const DIR = new URL('../fixtures/wmf/', import.meta.url);
const ASTEPTAT = JSON.parse(readFileSync(new URL('asteptat.json', DIR), 'utf8')) as Readonly<Record<string, Asteptat>>;
const TOL = 1e-6;
const egal = (p: Punct, q: Pereche): boolean => Math.hypot(p.x - q[0], p.y - q[1]) <= TOL;
type Seg = { readonly a: Punct; readonly s: Segment; readonly b: Punct };

/** Segmentele căii, fiecare din vârful lui până la următorul (închisă: și ultimul până la primul). */
function segmente(c: CaleWmf): Seg[] {
  const n = c.varfuri.length;
  return Array.from({ length: c.inchis ? n : n - 1 }, (_, i) => {
    const v = c.varfuri[i] as CaleWmf['varfuri'][number];
    return { a: v.p, s: v.s, b: (c.varfuri[(i + 1) % n] as CaleWmf['varfuri'][number]).p };
  });
}

const cubica = (s: Seg, t: number): Punct => {
  if (s.s.tip !== 'C') throw new Error('nu e cubică');
  const u = 1 - t, { c1, c2 } = s.s;
  return {
    x: u * u * u * s.a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * s.b.x,
    y: u * u * u * s.a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * s.b.y,
  };
};

/**
 * Segmentele (de la `k`) urmează bucățile de pe hârtie, din startul lor: o linie e o linie până în capăt; un arc de cerc
 * e făcut din arce cu centrul lui, care adună baleiajul lui; un arc de elipsă e făcut din cubice care stau pe elipsă
 * (abaterea radială sub 1,5e-6 mm) și al căror unghi parametric merge monoton de la t0 la t0 + dt. Întoarce câte segmente
 * a consumat, sau -1.
 */
function urmeaza(segs: readonly Seg[], x: CaleHartie): number {
  let k = 0;
  let cur = x.start;
  for (const b of x.piese) {
    const primul = segs[k];
    if (!primul || !egal(primul.a, cur)) return -1;
    if ('L' in b) {
      if (primul.s.tip !== 'L' || !egal(primul.b, b.L)) return -1;
      k++;
      cur = b.L;
    } else if ('A' in b) {
      const tinta = (b.dt * Math.PI) / 180;
      let baleiaj = 0;
      while (Math.abs(baleiaj - tinta) > 1e-9) {
        const s = segs[k++];
        if (!s || s.s.tip !== 'A') return -1;
        const c = cerculArcului(s.a, s.b, s.s.bulge);
        if (Math.hypot(c.centru.x - b.c[0], c.centru.y - b.c[1]) > TOL) return -1;
        baleiaj += c.baleiaj;
        if (Math.abs(baleiaj) > Math.abs(tinta) + 1e-9) return -1;
      }
      if (!egal((segs[k - 1] as Seg).b, b.A)) return -1;
      cur = b.A;
    } else {
      const { c, rx, ry, t0, dt } = b;
      const sens = Math.sign(dt);
      let t = t0;
      while (Math.abs(t - (t0 + dt)) > 1e-6) {
        const s = segs[k++];
        if (!s || s.s.tip !== 'C') return -1;
        for (let j = 1; j <= 8; j++) {
          const q = cubica(s, j / 8);
          const u = (q.x - c[0]) / rx, v = (q.y - c[1]) / ry;
          if (Math.abs(Math.hypot(u, v) - 1) * Math.max(rx, ry) > 1.5e-6) return -1;
          let tq = Math.atan2(v, u);
          while (tq - t > Math.PI) tq -= 2 * Math.PI;
          while (tq - t < -Math.PI) tq += 2 * Math.PI;
          if ((tq - t) * sens < -1e-9) return -1;
          t = tq;
        }
        if ((t - (t0 + dt)) * sens > 1e-6) return -1;
      }
      if (!egal((segs[k - 1] as Seg).b, b.E)) return -1;
      cur = b.E;
    }
  }
  return k;
}

/**
 * Calea citită e cea de pe hârtie. Deschisă: din start, în ordinea bucăților. Închisă: din vârful care e startul (calea
 * închisă n-are un început al ei); una doar din linii (un poligon, o formă nonzero redesenată) poate fi și parcursă invers.
 */
function potrivita(c: CaleWmf, x: CaleHartie): boolean {
  if (c.inchis !== x.inchis) return false;
  const segs = segmente(c);
  if (!c.inchis) return urmeaza(segs, x) === segs.length;
  const linii = x.piese.every((b) => 'L' in b);
  const variante = [segs];
  if (linii) {
    const n = c.varfuri.length;
    variante.push(segmente({ inchis: true, varfuri: Array.from({ length: n }, (_, i) => c.varfuri[(n - i) % n] as CaleWmf['varfuri'][number]) }));
  }
  return variante.some((v) => v.some((s, i) => egal(s.a, x.start) && urmeaza([...v.slice(i), ...v.slice(0, i)], x) === v.length));
}

for (const [fisier, a] of Object.entries(ASTEPTAT)) {
  test(`corpusul WMF: ${fisier}`, () => {
    const r = citesteWmf(new Uint8Array(readFileSync(new URL(fisier, DIR))));
    if (a.refuz) {
      assert.equal(r.ok ? 'citit' : r.cod, a.refuz);
      if (!r.ok && a.detaliu !== undefined) assert.equal(r.detaliu, a.detaliu);
      if (!r.ok && a.raport) for (const k of CODURI_AVERTISMENT_WMF) assert.equal(r.avertismente?.[k] ?? 0, a.raport[k] ?? 0, `${fisier}: ${k}`);
      return;
    }
    if (!r.ok) throw new Error(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
    // Fiecare cale de pe hârtie are o cale citită a ei, și nicio cale citită nu rămâne fără una de pe hârtie.
    const cai = a.cai ?? [];
    const libere = new Set(r.cai.map((_, i) => i));
    for (const x of cai) {
      const i: number | undefined = [...libere].find((j) => potrivita(r.cai[j] as CaleWmf, x));
      assert.ok(i !== undefined, `${fisier}: lipsește „${x.ce}”`);
      libere.delete(i);
    }
    assert.equal(libere.size, 0, `${fisier}: ${libere.size} căi citite în plus`);
    const raport = a.raport ?? {};
    for (const k of CODURI_AVERTISMENT_WMF) assert.equal(r.avertismente[k], raport[k] ?? 0, `${fisier}: ${k}`);
    const u = a.unitati;
    assert.ok(u);
    assert.equal(r.unitati.sursa, u.sursa);
    if (u.sursa === 'antet') assert.deepEqual([r.unitati.inch, r.unitati.mmPeUnitate], [u.inch, 25.4 / (u.inch ?? 1)]);
    if (u.sursa === 'aleasa') assert.equal(r.unitati.unitate, u.unitate);
    if (u.sursa === 'mapare') assert.equal(r.unitati.mmPeUnitateMapare, u.mm);
    if (a.cadru) assert.ok(r.cadru && Math.abs(r.cadru.latime - a.cadru[0]) <= 1e-9 && Math.abs(r.cadru.inaltime - a.cadru[1]) <= 1e-9, JSON.stringify(r.cadru));
    else assert.equal(r.cadru, null);
  });
}

test('corpusul WMF are toate fișierele generatorului (cele 10), fiecare cu un fișier pe disc', () => {
  assert.equal(Object.keys(ASTEPTAT).length, 10);
  for (const f of Object.keys(ASTEPTAT)) assert.ok(readFileSync(new URL(f, DIR)).length > 0, f);
});
