import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import type { Varf } from '../../src/geom/contur.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, felFisier } from '../../src/text/font.ts';
import { feteDinFisier } from '../../src/text/fonturiOmului.ts';

/**
 * Fonturile SVG (ADR 0140 §7, felia 7.6↑b): fonturile de gravură în formatul SVG (Hershey / EMS, fontul SVG al lui Relief),
 * citite de cititorul aplicației prin aceeași ușă ca TTF / OTF (`citesteFont`), cu trăsăturile deschise ale căilor fără Z.
 *
 * - **Corpusul independent** (`fonturi_svg` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/svg.json`): oracolul
 *   citește fontul cu `xml.etree` și căile cu `parse_path` din fontTools, așază literele cu aceleași reguli; aici, aceleași
 *   trăsături (deschise din același punct, buclele ca ciclu), sub 1e-9 mm, plus caracterele lipsă și glifele sărite (arcele).
 * - **Refuzurile**, cu codurile cititorului; **fețele** pentru „Fonturile mele”.
 *
 * În Node nu există DOMParser: îl dă xmldom, cu erorile aruncate, cum îl folosește ușa în browser.
 */
class ParserXmldom {
  parseFromString(t: string, tip: string): unknown {
    return new DOMParser({ onError: (n: string, m: string) => { if (n !== 'warning') throw new Error(m); } }).parseFromString(t, tip);
  }
}
const g = globalThis as { DOMParser?: unknown };
g.DOMParser = ParserXmldom;

/** `fn` cu alt `DOMParser` (sau fără niciunul), apoi cel din xmldom la loc. */
function cuParser<T>(parser: unknown, fn: () => T): T {
  g.DOMParser = parser;
  try {
    return fn();
  } finally {
    g.DOMParser = ParserXmldom;
  }
}

const RAD = new URL('../../', import.meta.url);
const octeti = (cale: string): Uint8Array => new Uint8Array(readFileSync(new URL(cale, RAD)));
const text = (s: string): Uint8Array => new TextEncoder().encode(s);

type Segment = ['L', number, number] | ['C', number, number, number, number, number, number];
type Contur = { readonly inchis?: boolean; readonly start: readonly [number, number]; readonly segmente: readonly Segment[] };
type Caz = {
  readonly font: string; readonly parametri: ParametriText; readonly majuscula: number; readonly lipsa: number; readonly stricate: number;
  readonly linie: boolean;
  readonly glife: ReadonlyArray<{ readonly caracter: string; readonly rand: number; readonly contururi: readonly Contur[] }>;
};
const FIX = JSON.parse(readFileSync(new URL('test/fixtures/text/svg.json', RAD), 'utf8')) as {
  readonly recunoastere: Readonly<Record<string, boolean>>; readonly cazuri: Readonly<Record<string, Caz>>;
};
const TOL = 1e-9;
const egale = (x: readonly number[], y: readonly number[]): boolean => x.length === y.length && x.every((v, i) => Math.abs(v - (y[i] as number)) <= TOL);

function pasi(varfuri: readonly Varf[], inchis: boolean): Array<{ a: readonly number[]; s: readonly (string | number)[] }> {
  const n = inchis ? varfuri.length : varfuri.length - 1;
  return varfuri.slice(0, n).map((v, k) => {
    const u = varfuri[(k + 1) % varfuri.length]!.p;
    assert.notEqual(v.s.tip, 'A');
    return { a: [v.p.x, v.p.y], s: v.s.tip === 'C' ? ['C', v.s.c1.x, v.s.c1.y, v.s.c2.x, v.s.c2.y, u.x, u.y] : ['L', u.x, u.y] };
  });
}
function pasiOracol(t: Contur): Array<{ a: readonly number[]; s: readonly (string | number)[] }> {
  let a: readonly number[] = t.start;
  return t.segmente.map((s) => {
    const p = { a, s };
    a = s.slice(-2) as number[];
    return p;
  });
}

test('un font SVG se recunoaște după conținut și trece prin aceeași ușă; cu o singură linie: Relief și cel de probă, nu cel plin', () => {
  for (const [cale, linie] of Object.entries(FIX.recunoastere)) {
    const b = octeti(cale);
    assert.equal(felFisier(b), 'svg', cale);
    const r = citesteFont(b);
    assert.ok(r.ok, r.ok ? '' : `${cale}: ${r.cod} ${r.detaliu ?? ''}`);
    if (r.ok) assert.equal(r.font.linie, linie, cale);
  }
  // Un TTF rămâne TTF.
  assert.equal(felFisier(octeti('public/fonturi/relief-singleline.ttf')), 'font');
});

for (const [nume, caz] of Object.entries(FIX.cazuri)) {
  test(`corpusul fonturilor SVG: ${nume} (${caz.font}), față de oracol`, () => {
    const r0 = citesteFont(octeti(caz.font));
    assert.ok(r0.ok);
    if (!r0.ok) return;
    assert.equal(r0.font.majuscula, caz.majuscula);
    const r = aseazaText(r0.font, caz.parametri);
    assert.equal(r.linie, caz.linie);
    assert.equal(r.raport.lipsa, caz.lipsa);
    assert.equal(r.raport['glife-stricate'], caz.stricate);
    // Glifele fontului plin nu se suprapun pe ele însele: normalizarea nu le schimbă (altfel compararea n-ar fi cu oracolul).
    assert.equal(r.raport['nonzero-normalizate'], 0);
    assert.deepEqual(r.glife.map((g) => [g.caracter, g.rand]), caz.glife.map((g) => [g.caracter, g.rand]));
    caz.glife.forEach((ga, i) => {
      const gb = r.glife[i]!;
      assert.equal(gb.cai.length, ga.contururi.length, `${ga.caracter}: contururile`);
      ga.contururi.forEach((t, j) => {
        const c = gb.cai[j]!;
        const inchis = t.inchis ?? true;
        assert.equal(c.inchis, inchis, `${ga.caracter} ${j}: deschisă / buclă`);
        const o = pasiOracol(t), p = pasi(c.varfuri, c.inchis);
        assert.equal(p.length, o.length, `${ga.caracter} ${j}: segmentele`);
        const r0i = inchis ? p.findIndex((x) => egale(x.a, o[0]!.a)) : 0;
        assert.ok(r0i >= 0 && egale(p[r0i]!.a, o[0]!.a), `${ga.caracter} ${j}: startul`);
        o.forEach((x, k) => {
          const y = p[(r0i + k) % p.length]!;
          assert.ok(egale(x.a, y.a) && x.s[0] === y.s[0] && egale(x.s.slice(1) as number[], y.s.slice(1) as number[]),
            `${ga.caracter} ${j}, segmentul ${k}: ${JSON.stringify(x)} față de ${JSON.stringify(y)}`);
        });
      });
    });
  });
}

const font = (corp: string, fata = '<font-face units-per-em="1000" cap-height="700"/>'): Uint8Array =>
  text(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><defs><font horiz-adv-x="500">${fata}${corp}</font></defs></svg>`);

test('refuzurile, cu codurile cititorului: fără <font>, fără caractere, fără H și fără cap-height, XML stricat, entitățile, fața a doua', () => {
  const cod = (b: Uint8Array, fata = 0): string => { const r = citesteFont(b, fata); return r.ok ? 'ok' : r.cod; };
  // Un SVG fără <font> (un desen) nu e un font: nici ușa nu-l ia drept unul.
  const desen = text('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10"/></svg>');
  assert.equal(felFisier(desen), 'necunoscut');
  assert.equal(cod(desen), 'nu-e-font');
  assert.equal(cod(font('<glyph glyph-name="x" d="M0 0h10"/>')), 'fara-unicode');
  assert.equal(cod(font('<glyph unicode="I" d="M0 0V700"/>', '<font-face units-per-em="1000"/>')), 'majuscula');
  // Fără H, cu cap-height: majuscula e cea scrisă.
  const r = citesteFont(font('<glyph unicode="I" d="M0 0V700"/>'));
  assert.ok(r.ok && r.font.majuscula === 700);
  assert.equal(cod(text('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><defs><font><glyph unicode="H"></defs></svg>')), 'stricat');
  // Bomba de entități: refuzată de gardă, înaintea parserului (pe care nu-l mai cheamă).
  const bomba = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "${'x'.repeat(1000)}">]><svg xmlns="http://www.w3.org/2000/svg"><defs><font><font-face/>${'<glyph unicode="H" glyph-name="&a;"/>'.repeat(20_000)}</font></defs></svg>`;
  let chemat = 0;
  assert.equal(cuParser(class { parseFromString(): never { chemat++; throw new Error('parserul'); } }, () => cod(text(bomba))), 'stricat');
  assert.equal(chemat, 0);
  // În browser, DOMParser nu aruncă: un XML stricat dă documentul citit până la greșeală, cu un <parsererror>.
  const partial = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg"><parsererror xmlns="http://www.w3.org/1999/xhtml">rândul 1</parsererror>'
    + '<defs><font horiz-adv-x="500"><font-face units-per-em="1000" cap-height="700"/><glyph unicode="H" d="M0 0V700"/></font></defs></svg>', 'image/svg+xml');
  assert.equal(cuParser(class { parseFromString(): unknown { return partial; } }, () => cod(font('<glyph unicode="H" d="M0 0V700"/>'))), 'stricat');
  assert.equal(cuParser(undefined, () => cod(font('<glyph unicode="H" d="M0 0V700"/>'))), 'stricat');
  // units-per-em în afara intervalului TTF-ului (16…16384): stricat, ca la cititorul sfnt.
  assert.equal(cod(font('<glyph unicode="H" d="M0 0V700"/>', '<font-face units-per-em="0" cap-height="700"/>')), 'stricat');
  assert.equal(cod(font('<glyph unicode="H" d="M0 0V700"/>'), 1), 'fata-lipsa');
});

test('fețele unui font SVG pentru „Fonturile mele”: una singură, cu familia și stilul din font-face', () => {
  const f = feteDinFisier(octeti('test/fixtures/text/relief-singleline.svg'));
  assert.ok(f);
  assert.deepEqual(f.bune.map((x) => [x.fata, x.nume.familie, x.nume.stil, x.nume.complet]), [[0, 'Relief SingleLine SVG', 'Regular', 'Relief SingleLine SVG Regular']]);
  assert.deepEqual(f.refuzate, []);
  const plin = feteDinFisier(octeti('test/fixtures/text/svg-plin.svg'));
  assert.deepEqual(plin?.bune.map((x) => x.nume.postscript), ['ProbaPlin']);
  // Numele PostScript e `id`-ul fontului, nu familia fără spații.
  assert.deepEqual(f.bune.map((x) => x.nume.postscript), ['ReliefSingleLineSVG-Regular']);
});

test('mărimile implicite (SVG 1.1), dublurile (prima câștigă) și intervalele U+ cu „?”', () => {
  const b = font('<glyph unicode="H" glyph-name="H" d="M0 0V700"/><glyph unicode="H" glyph-name="H" horiz-adv-x="900" d="M0 0V900"/>'
    + '<glyph unicode="A" glyph-name="H" d="M0 0L250 700L500 0"/><glyph unicode="Z" d="M0 700H500L0 0H500"/>'
    + '<hkern g1="H" u2="U+005?" k="30"/>', '<font-face units-per-em="2048"/>');
  const r = citesteFont(b);
  assert.ok(r.ok);
  if (!r.ok) return;
  const gl = (c: string): number => r.font.glifa(c.codePointAt(0)!);
  // Fără ascent: em-ul; fără descent: 0 (pozitiv, ca o valoare citită); majuscula, vârful primului H.
  assert.equal(r.font.urcare, 2048);
  assert.ok(Object.is(r.font.coborare, 0));
  assert.equal(r.font.majuscula, 700);
  assert.equal(r.font.avans(gl('H')), 500);
  // Numele „H” e al primei glife: perechea H–Z (U+005A, prinsă de U+005?), nu A–Z.
  assert.equal(r.font.crenare(gl('H'), gl('Z')), -30);
  assert.equal(r.font.crenare(gl('A'), gl('Z')), 0);
  // descent scris pozitiv: tot sub linie.
  const d = citesteFont(font('<glyph unicode="H" d="M0 0V700"/>', '<font-face units-per-em="1000" ascent="900" descent="300"/>'));
  assert.ok(d.ok && d.font.urcare === 900 && d.font.coborare === -300);
});

test('o glifă cu un arc nu se poate da (sărită, numărată), restul fontului da; crenarea pe nume, caractere și intervale', () => {
  const b = font('<glyph unicode="H" horiz-adv-x="800" d="M100 0V700M100 350H700M700 0V700"/><glyph unicode="W" d="M0 0A10 10 0 0 0 20 0"/>'
    + '<glyph unicode="A" glyph-name="A" d="M0 0L250 700L500 0"/><glyph unicode="V" d="M0 700L250 0L500 700"/>'
    + '<hkern g1="A" u2="U+0050-0059" k="40"/><hkern u1="H" u2="A,V" k="-10"/><hkern g1="A" g2="A" u1="A" u2="V" k="99"/>');
  const r = citesteFont(b);
  assert.ok(r.ok);
  if (!r.ok) return;
  const g = (c: string): number => r.font.glifa(c.codePointAt(0)!);
  assert.equal(r.font.contururi(g('W')), null);
  assert.ok(r.font.contururi(g('H')));
  // A–V: prima pereche care le prinde e intervalul U+0050–0059 (k = 40), nu cea de după (99); H–A: −(−10) = 10.
  assert.equal(r.font.crenare(g('A'), g('V')), -40);
  assert.equal(r.font.crenare(g('H'), g('A')), 10);
  assert.equal(r.font.crenare(g('V'), g('A')), 0);
  // Avansul: al glifei, altfel al fontului.
  assert.equal(r.font.avans(g('H')), 800);
  assert.equal(r.font.avans(g('A')), 500);
});
