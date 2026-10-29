import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aseazaText } from '../../src/text/asezare.ts';
import { acoperire, citesteFont, clasa, Octeti, type Font, type RezultatFont } from '../../src/text/font.ts';

/**
 * Cititorul de fonturi pe bucăți (ADR 0105 §1): glifele compuse, brute, față de fontTools (componentele puse pe puncte,
 * deplasarea scalată ca la Apple, 2 × 2, scara pe X și Y, o glifă compusă din alta compusă), refuzurile (CFF, majuscula
 * mincinoasă, tabelele lipsă, fișierul tăiat), glifa care se conține pe sine (sărită, numărată), crenarea și avansurile pe
 * valorile citite din font. Așezarea întreagă e în `text.corpus.test.ts`.
 */

const RAD = new URL('../../', import.meta.url);
const octeti = (cale: string): Uint8Array => new Uint8Array(readFileSync(new URL(cale, RAD)));
const GLIFE = JSON.parse(readFileSync(new URL('test/fixtures/text/glife.json', RAD), 'utf8')) as Readonly<Record<string, number[][][]>>;
const ok = (r: RezultatFont): Font => {
  if (!r.ok) throw new Error(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
  return r.font;
};
const PARAM = { inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' } as const;

/** Octeții fontului cu eticheta unui tabel din director schimbată (tabelul „dispare”). */
function faraTabel(b: Uint8Array, tag: string): Uint8Array {
  const c = new Uint8Array(b);
  const v = new DataView(c.buffer);
  const n = v.getUint16(4);
  for (let k = 0; k < n; k++) {
    const r = 12 + 16 * k;
    if (String.fromCharCode(c[r]!, c[r + 1]!, c[r + 2]!, c[r + 3]!) === tag) c.set([0x78, 0x78, 0x78, 0x78], r);
  }
  return c;
}

test('glifele compuse, brute, față de fontTools: pe puncte, deplasarea scalată, 2 × 2, scara pe X și Y, compusă din compusă', () => {
  const fonturi = new Map<string, Font>();
  for (const [cheie, contururi] of Object.entries(GLIFE)) {
    const [fisier, ch] = cheie.split(':') as [string, string];
    const f = fonturi.get(fisier) ?? ok(citesteFont(octeti(fisier)));
    fonturi.set(fisier, f);
    const g = f.contururi(f.glifa(ch.codePointAt(0)!));
    assert.ok(g, cheie);
    assert.equal(g.length, contururi.length, `${cheie}: contururile`);
    contururi.forEach((c, j) => {
      assert.equal(g[j]!.length, c.length, `${cheie} conturul ${j}`);
      c.forEach(([x, y, pe], k) => {
        const q = g[j]![k]!;
        assert.ok(Math.abs(q.x - x!) < 1e-9 && Math.abs(q.y - y!) < 1e-9 && q.peCurba === (pe === 1), `${cheie} ${j}.${k}: ${q.x}, ${q.y} față de ${x}, ${y}`);
      });
    });
  }
});

test('fontul: familia, unitățile, majuscula verificată pe H, rândul din hhea; caracterul lipsă dă glifa 0', () => {
  const f = ok(citesteFont(octeti('public/fonturi/roboto.ttf')));
  assert.deepEqual([f.familie, f.unitsPerEm, f.majuscula, f.urcare, f.coborare, f.spatiuRanduri], ['Roboto', 2048, 1456, 2146, -555, 0]);
  assert.equal(f.glifa(0x2603), 0);
  assert.ok(f.glifa(0x0219) > 0 && f.glifa(0x021b) > 0, 'ș și ț cu virgulă');
  // Crenarea „AV” e negativă (din oracol: verificată în generator), „AA” n-are pereche.
  assert.ok(f.crenare(f.glifa(0x41), f.glifa(0x56)) < 0);
  assert.equal(f.crenare(f.glifa(0x41), f.glifa(0x41)), 0);
  const s = ok(citesteFont(octeti('public/fonturi/droid-serif.ttf')));
  assert.deepEqual([s.familie, s.majuscula], ['Droid Serif', 1462]);
});

test('refuzurile: CFF (OpenType cu contururi PostScript), alt fișier, majuscula mincinoasă, tabelele lipsă, fișierul tăiat', () => {
  assert.deepEqual(citesteFont(octeti('test/fixtures/text/inter-cff.otf')), { ok: false, cod: 'cff' });
  assert.deepEqual(citesteFont(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')), { ok: false, cod: 'nu-e-font' });
  assert.deepEqual(citesteFont(new Uint8Array(4)), { ok: false, cod: 'nu-e-font' });
  const m = citesteFont(octeti('test/fixtures/text/roboto-majuscula-gresita.ttf'));
  assert.ok(!m.ok && m.cod === 'majuscula' && m.detaliu === 'sCapHeight 1300, H 1456', JSON.stringify(m));
  const roboto = octeti('public/fonturi/roboto.ttf');
  assert.deepEqual(citesteFont(faraTabel(roboto, 'loca')), { ok: false, cod: 'tabel-lipsa', detaliu: 'loca' });
  assert.deepEqual(citesteFont(faraTabel(roboto, 'cmap')), { ok: false, cod: 'fara-unicode' });
  const taiat = citesteFont(roboto.slice(0, 2000));
  assert.ok(!taiat.ok && taiat.cod === 'stricat', JSON.stringify(taiat));
});

test('o glifă compusă care se conține pe sine e sărită și numărată; celelalte litere rămân', () => {
  const f = ok(citesteFont(octeti('test/fixtures/text/roboto-ciclu.ttf')));
  assert.equal(f.contururi(f.glifa(0x0102)), null);
  const r = aseazaText(f, { ...PARAM, continut: 'AĂB' });
  assert.equal(r.raport['glife-stricate'], 1);
  assert.deepEqual(r.glife.map((g) => g.caracter), ['A', 'B']);
});

test('așezarea: spațiul n-are contur dar are avans, tab-ul e spațiu, caracterele de control se sar, lipsa se spune o dată', () => {
  const f = ok(citesteFont(octeti('public/fonturi/roboto.ttf')));
  const fara = aseazaText(f, { ...PARAM, continut: 'AB' });
  const cu = aseazaText(f, { ...PARAM, continut: 'A B' });
  const tab = aseazaText(f, { ...PARAM, continut: 'A\tB' });
  const ctrl = aseazaText(f, { ...PARAM, continut: 'A\u0007B' });
  const x0 = (r: typeof fara): number => r.glife[1]!.cai[0]!.varfuri[0]!.p.x;
  // Spațiul adaugă exact avansul lui (din font) și crenarea pierdută între A și B (aici nicio pereche).
  const mm = (u: number): number => (u * 20) / f.majuscula;
  assert.ok(Math.abs(x0(cu) - x0(fara) - mm(f.avans(f.glifa(0x20)))) < 1e-9);
  assert.equal(x0(tab), x0(cu));
  assert.equal(x0(ctrl), x0(fara));
  const l = aseazaText(f, { ...PARAM, continut: '☃A☃' });
  assert.equal(l.raport.lipsa, 2);
  assert.deepEqual(l.caractereLipsa, ['☃']);
});

test('glifele care se suprapun pe ele însele (accentele variantei, peste literă) se normalizează din nonzero, o dată, la așezare', () => {
  const f = ok(citesteFont(octeti('test/fixtures/text/roboto-compuse.ttf')));
  const r = aseazaText(f, { ...PARAM, continut: 'ĂÂÃÄÅ' });
  // Patru dintre ele își pun accentul peste A (Ä, cu accentul turtit, rămâne deasupra lui).
  assert.equal(r.raport['nonzero-normalizate'], 4);
  assert.equal(r.raport['nonzero-refuzate'], 0);
});

test('crenarea fiecărei perechi (literele, cifrele, semnele, diacriticele), în ambele fonturi, față de fontTools', () => {
  const asteptat = JSON.parse(readFileSync(new URL('test/fixtures/text/crenari.json', RAD), 'utf8')) as Record<string, { set: string; perechi: Record<string, number> }>;
  for (const [fisier, { set, perechi }] of Object.entries(asteptat)) {
    const f = ok(citesteFont(octeti(fisier)));
    const litere = [...set];
    let nenule = 0;
    for (const a of litere) {
      for (const b of litere) {
        const v = f.crenare(f.glifa(a.codePointAt(0)!), f.glifa(b.codePointAt(0)!));
        assert.equal(v, perechi[a + b] ?? 0, `${fisier}: ${a}${b}`);
        if (v !== 0) nenule++;
      }
    }
    assert.equal(nenule, Object.keys(perechi).length);
  }
});

test('acoperirea și clasele OpenType, pe octeți scriși de mână: listele și intervalele (cu indexul de start al fiecăruia)', () => {
  const u16 = (...v: number[]): Octeti => new Octeti(new Uint8Array(v.flatMap((x) => [x >> 8, x & 0xff])));
  // Formatul 1: glifele 4, 7, 9 (indicii 0, 1, 2).
  const lista = u16(1, 3, 4, 7, 9);
  assert.deepEqual([4, 7, 9, 8, 3, 10].map((g) => acoperire(lista, 0, g)), [0, 1, 2, -1, -1, -1]);
  // Formatul 2: 10–14 de la indicele 0, 20–22 de la indicele 5.
  const intervale = u16(2, 2, 10, 14, 0, 20, 22, 5);
  assert.deepEqual([10, 12, 14, 20, 21, 22, 15, 9, 23].map((g) => acoperire(intervale, 0, g)), [0, 2, 4, 5, 6, 7, -1, -1, -1]);
  // Clasele: formatul 1 (de la glifa 5: 1, 0, 2), formatul 2 (30–32 în clasa 3); restul, clasa 0.
  const c1 = u16(1, 5, 3, 1, 0, 2);
  assert.deepEqual([5, 6, 7, 8, 4].map((g) => clasa(c1, 0, g)), [1, 0, 2, 0, 0]);
  const c2 = u16(2, 1, 30, 32, 3);
  assert.deepEqual([29, 30, 31, 32, 33].map((g) => clasa(c2, 0, g)), [0, 3, 3, 3, 0]);
});
