import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aseazaText } from '../../src/text/asezare.ts';
import { acoperire, citesteFont, clasa, feteFont, felFisier, Octeti, type Font, type RezultatFont } from '../../src/text/font.ts';

/**
 * Cititorul de fonturi pe bucăți (ADR 0105 §1, ADR 0106 §1): glifele brute față de fontTools (componentele TrueType puse
 * pe puncte, deplasarea scalată ca la Apple, 2 × 2, scara pe X și Y, o glifă compusă din alta compusă; CFF: Inter, Source
 * Han CID, cel scris de mână cu `seac`, flex, sugestii și subrutinele cu toate decalajele; CFF2 fix), refuzurile (WOFF, WOFF2,
 * fața lipsă, tabelele lipsă, fișierul tăiat, fără H și fără `sCapHeight`), majuscula din H, colecțiile, `cmap` 12, 6 și
 * simbol, instanțele unui font variabil, crenarea fiecărei perechi (GPOS, Extension, `kern` Microsoft și Apple). Așezarea
 * întreagă e în `text.corpus.test.ts`.
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

test('glifele brute, față de fontTools: TrueType compuse (pe puncte, deplasarea scalată, 2 × 2, X și Y, compusă din compusă), CFF', () => {
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

test('fontul: familia, numele, unitățile, majuscula din H, rândul din hhea; caracterul lipsă dă glifa 0', () => {
  const f = ok(citesteFont(octeti('public/fonturi/roboto.ttf')));
  assert.deepEqual([f.familie, f.unitsPerEm, f.majuscula, f.urcare, f.coborare, f.spatiuRanduri, f.cubice, f.instante], ['Roboto', 2048, 1456, 2146, -555, 0, false, null]);
  assert.deepEqual(f.nume, { familie: 'Roboto', stil: 'Regular', complet: 'Roboto Regular', postscript: 'Roboto-Regular' });
  assert.equal(f.glifa(0x2603), 0);
  assert.ok(f.glifa(0x0219) > 0 && f.glifa(0x021b) > 0, 'ș și ț cu virgulă');
  // Crenarea „AV” e negativă (din oracol: verificată în generator), „AA” n-are pereche.
  assert.ok(f.crenare(f.glifa(0x41), f.glifa(0x56)) < 0);
  assert.equal(f.crenare(f.glifa(0x41), f.glifa(0x41)), 0);
  const s = ok(citesteFont(octeti('public/fonturi/droid-serif.ttf')));
  assert.deepEqual([s.familie, s.majuscula], ['Droid Serif', 1462]);
  const c = ok(citesteFont(octeti('test/fixtures/text/cff-sintetic.otf')));
  assert.deepEqual([c.familie, c.unitsPerEm, c.majuscula, c.cubice], ['CNCVS Sintetic', 1000, 700, true]);
});

test('majuscula (ADR 0106 §1): vârful lui H, chiar când sCapHeight minte; fără H, sCapHeight; fără niciuna, refuzul', () => {
  // sCapHeight 1300, H 1456: contează litera tăiată (77 de fețe Windows aveau sCapHeight diferit de H, ca Candara).
  assert.equal(ok(citesteFont(octeti('test/fixtures/text/roboto-majuscula-gresita.ttf'))).majuscula, 1456);
  const faraH = octeti('test/fixtures/text/roboto-fara-h.ttf');
  const f = ok(citesteFont(faraH));
  assert.deepEqual([f.glifa(0x48), f.majuscula], [0, 1400]);
  assert.deepEqual(citesteFont(faraTabel(faraH, 'OS/2')), { ok: false, cod: 'majuscula', detaliu: 'fără H și fără sCapHeight' });
});

test('refuzurile: WOFF și WOFF2 (de despachetat întâi), alt fișier, fața lipsă, tabelele lipsă, fișierul tăiat; CFF2 se citește', () => {
  // CFF2 (ADR 0113): citit, cu contururile cubice ale lui Inter (glifele brute, mai sus); unul tăiat e stricat.
  const cff2 = octeti('test/fixtures/text/inter-cff2.otf');
  assert.deepEqual([ok(citesteFont(cff2)).cubice, ok(citesteFont(cff2)).familie], [true, 'Inter']);
  const taiatCff2 = citesteFont(cff2.slice(0, 3000));
  assert.ok(!taiatCff2.ok && taiatCff2.cod === 'stricat', JSON.stringify(taiatCff2));
  assert.deepEqual(citesteFont(octeti('test/fixtures/text/roboto.woff')), { ok: false, cod: 'woff' });
  const woff2 = new Uint8Array(64);
  woff2.set([0x77, 0x4f, 0x46, 0x32]);
  assert.deepEqual(citesteFont(woff2), { ok: false, cod: 'woff2' });
  assert.deepEqual(
    [felFisier(woff2), felFisier(octeti('test/fixtures/text/roboto.woff')), felFisier(octeti('test/fixtures/text/roboto-droid.ttc')), felFisier(octeti('public/fonturi/roboto.ttf')), felFisier(new Uint8Array(3))],
    ['woff2', 'woff', 'colectie', 'font', 'necunoscut'],
  );
  assert.deepEqual(citesteFont(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')), { ok: false, cod: 'nu-e-font' });
  assert.deepEqual(citesteFont(new Uint8Array(4)), { ok: false, cod: 'nu-e-font' });
  assert.deepEqual(citesteFont(octeti('test/fixtures/text/roboto-droid.ttc'), 2), { ok: false, cod: 'fata-lipsa', detaliu: '2 din 2' });
  assert.deepEqual(citesteFont(octeti('public/fonturi/roboto.ttf'), 1), { ok: false, cod: 'fata-lipsa', detaliu: '1 din 1' });
  const roboto = octeti('public/fonturi/roboto.ttf');
  assert.deepEqual(citesteFont(faraTabel(roboto, 'loca')), { ok: false, cod: 'tabel-lipsa', detaliu: 'loca' });
  assert.deepEqual(citesteFont(faraTabel(roboto, 'cmap')), { ok: false, cod: 'fara-unicode' });
  const inter = octeti('test/fixtures/text/inter-subset.otf');
  assert.deepEqual(citesteFont(faraTabel(inter, 'hmtx')), { ok: false, cod: 'tabel-lipsa', detaliu: 'hmtx' });
  const taiat = citesteFont(roboto.slice(0, 2000));
  assert.ok(!taiat.ok && taiat.cod === 'stricat', JSON.stringify(taiat));
  const taiatCff = citesteFont(inter.slice(0, 3000));
  assert.ok(!taiatCff.ok && taiatCff.cod === 'stricat', JSON.stringify(taiatCff));
});

const STRUCTURA = JSON.parse(readFileSync(new URL('test/fixtures/text/structura.json', RAD), 'utf8')) as {
  readonly 'test/fixtures/text/roboto-droid.ttc': ReadonlyArray<{ familie: string; complet: string; postscript: string; majuscula: number }>;
  readonly 'test/fixtures/text/roboto-fvar.ttf': ReadonlyArray<{ stil: string; postscript: string | null; implicita: boolean; coordonate: Record<string, number> }>;
};

test('colecția TTC: fețele cu numele lor, fiecare citită singură (familia, majuscula, contururile ca în fontul ei)', () => {
  const ttc = octeti('test/fixtures/text/roboto-droid.ttc');
  const asteptat = STRUCTURA['test/fixtures/text/roboto-droid.ttc'];
  assert.deepEqual(feteFont(ttc)?.map((n) => [n.familie, n.complet, n.postscript]), asteptat.map((n) => [n.familie, n.complet, n.postscript]));
  assert.deepEqual(feteFont(octeti('public/fonturi/roboto.ttf'))?.map((n) => n.postscript), ['Roboto-Regular']);
  assert.equal(feteFont(new Uint8Array(64)), null);
  asteptat.forEach((n, k) => {
    const f = ok(citesteFont(ttc, k));
    assert.deepEqual([f.familie, f.majuscula], [n.familie, n.majuscula]);
    const singur = ok(citesteFont(octeti(k === 0 ? 'public/fonturi/roboto.ttf' : 'public/fonturi/droid-serif.ttf')));
    for (const ch of 'AĂș') assert.deepEqual(f.contururi(f.glifa(ch.codePointAt(0)!)), singur.contururi(singur.glifa(ch.codePointAt(0)!)), ch);
  });
});

test('`cmap`: 3/10 (formatul 12) câștigă peste un 3/1 care minte; formatul 6, un singur interval; simbolul caută la U+F000', () => {
  const r = ok(citesteFont(octeti('public/fonturi/roboto.ttf')));
  const c12 = ok(citesteFont(octeti('test/fixtures/text/roboto-cmap12.ttf')));
  for (const ch of 'ABș€') assert.equal(c12.glifa(ch.codePointAt(0)!), r.glifa(ch.codePointAt(0)!), ch);
  const c6 = ok(citesteFont(octeti('test/fixtures/text/roboto-cmap6.ttf')));
  assert.deepEqual([...' A~'].map((ch) => c6.glifa(ch.codePointAt(0)!)), [...' A~'].map((ch) => r.glifa(ch.codePointAt(0)!)));
  assert.deepEqual([c6.glifa(0x1f), c6.glifa(0x7f), c6.glifa(0x103)], [0, 0, 0]);
  const s = ok(citesteFont(octeti('test/fixtures/text/roboto-simbol.ttf')));
  assert.deepEqual([s.glifa(0x48), s.glifa(0xf048), s.glifa(0xe9), s.glifa(0x1f), s.glifa(0x100), s.majuscula], [r.glifa(0x48), r.glifa(0x48), r.glifa(0xe9), 0, 0, 1456]);
});

test('fontul variabil: instanțele numite din fvar (stilul, numele PostScript, cea implicită, coordonatele); contururile, ale instanței cerute', () => {
  const b = octeti('test/fixtures/text/roboto-fvar.ttf');
  const f = ok(citesteFont(b));
  assert.deepEqual(f.instante, STRUCTURA['test/fixtures/text/roboto-fvar.ttf']);
  assert.deepEqual(f.axe, [{ tag: 'wght', min: 100, implicit: 400, max: 900 }]);
  const r = ok(citesteFont(octeti('public/fonturi/roboto.ttf')));
  assert.deepEqual(f.contururi(f.glifa(0x41)), r.contururi(r.glifa(0x41)));
  // Fără `gvar` (doar `fvar`), instanța Bold n-are variații: contururile și avansurile implicite (ADR 0113, ca specificația).
  const bold = ok(citesteFont(b, 0, 1));
  assert.deepEqual(bold.contururi(bold.glifa(0x41)), r.contururi(r.glifa(0x41)));
  assert.equal(bold.avans(bold.glifa(0x41)), r.avans(r.glifa(0x41)));
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

test('crenarea fiecărei perechi (literele, cifrele, semnele, diacriticele), în fiecare font și variantă, față de fontTools', () => {
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
