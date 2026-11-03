import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as v from 'valibot';
import { DOMParser } from '@xmldom/xmldom';
import type { Varf } from '../../src/geom/contur.ts';
import { cutieContur, uneste, type Cutie } from '../../src/geom/cutie.ts';
import { blocText, SchemaBlocText } from '../../src/model/blocText.ts';
import { documentNou, type Document, type Piesa } from '../../src/model/document.ts';
import { transforma } from '../../src/model/transformare.ts';
import { aseazaText, type GlifaAsezata, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { piesaText } from '../../src/text/piesaText.ts';

/**
 * Textul vertical (ADR 0141): literele una sub alta, rândurile în coloane.
 *
 * - **Corpusul independent** (`fonturi_verticale` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/vertical.json`):
 *   oracolul așază coloanele din nou, cu cutiile exacte ale literelor din fontTools (`calcCubicBounds`), pe Roboto, Droid
 *   Serif, Inter (CFF, cu cursiv) și Relief (cu o singură linie); aici, aceleași contururi, sub 1e-9 mm. Pe hârtie, în oracol:
 *   pasul unui em între majuscule, H centrat pe axă, axa coloanei a doua la un rând, golul dintre virgula lui Ț și căciula
 *   lui Ă, alinierile. Aldinul pe verticală e un caz al corpusului aldinului (`aldin-vertical`).
 * - **Probele țintite:** fiecare literă e chiar litera, mutată; golul dintre cutii; spațiul și caracterul lipsă; alinierea și
 *   axele coloanelor; blocul (doar `true`, nu pe curbă), scalarea uniformă.
 */

const RAD = new URL('../../', import.meta.url);
const fonturi = new Map<string, Font>();
function font(cale: string): Font {
  const gata = fonturi.get(cale);
  if (gata) return gata;
  const r = citesteFont(new Uint8Array(readFileSync(new URL(cale, RAD))));
  assert.ok(r.ok, cale);
  if (!r.ok) throw new Error(cale);
  fonturi.set(cale, r.font);
  return r.font;
}
const ROBOTO = 'public/fonturi/roboto.ttf';

type Segment = ['L', number, number] | ['C', number, number, number, number, number, number];
type Contur = { readonly inchis?: boolean; readonly start: readonly [number, number]; readonly segmente: readonly Segment[] };
type Caz = {
  readonly font: string; readonly parametri: ParametriText; readonly majuscula: number; readonly linie: boolean; readonly lipsa: number;
  readonly stricate: number; readonly glife: ReadonlyArray<{ readonly caracter: string; readonly rand: number; readonly contururi: readonly Contur[] }>;
};
const FIX = JSON.parse(readFileSync(new URL('test/fixtures/text/vertical.json', RAD), 'utf8')) as { readonly cazuri: Readonly<Record<string, Caz>> };
const TOL = 1e-9;
const egale = (x: readonly number[], y: readonly number[]): boolean => x.length === y.length && x.every((q, i) => Math.abs(q - (y[i] as number)) <= TOL);

function pasi(varfuri: readonly Varf[], inchis: boolean): Array<{ a: readonly number[]; s: readonly (string | number)[] }> {
  const n = inchis ? varfuri.length : varfuri.length - 1;
  return varfuri.slice(0, n).map((q, k) => {
    const u = varfuri[(k + 1) % varfuri.length]!.p;
    assert.notEqual(q.s.tip, 'A');
    return { a: [q.p.x, q.p.y], s: q.s.tip === 'C' ? ['C', q.s.c1.x, q.s.c1.y, q.s.c2.x, q.s.c2.y, u.x, u.y] : ['L', u.x, u.y] };
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

for (const [nume, caz] of Object.entries(FIX.cazuri)) {
  test(`corpusul textului vertical: ${nume} (${caz.font}), față de oracol`, () => {
    const f = font(caz.font);
    assert.equal(f.majuscula, caz.majuscula);
    const r = aseazaText(f, caz.parametri);
    assert.equal(r.linie, caz.linie);
    assert.equal(r.raport.lipsa, caz.lipsa);
    assert.equal(r.raport['glife-stricate'], caz.stricate);
    // Glifele corpusului nu se suprapun pe ele însele: normalizarea nu le schimbă (altfel compararea n-ar fi cu oracolul).
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
        const r0 = inchis ? p.findIndex((x) => egale(x.a, o[0]!.a)) : 0;
        assert.ok(r0 >= 0 && egale(p[r0]!.a, o[0]!.a), `${ga.caracter} ${j}: startul`);
        o.forEach((x, k) => {
          const y = p[(r0 + k) % p.length]!;
          assert.ok(egale(x.a, y.a) && x.s[0] === y.s[0] && egale(x.s.slice(1) as number[], y.s.slice(1) as number[]),
            `${ga.caracter} ${j}, segmentul ${k}: ${JSON.stringify(x)} față de ${JSON.stringify(y)}`);
        });
      });
    });
  });
}

const cutie = (g: GlifaAsezata): Cutie => g.cai.map((c) => cutieContur(c)).reduce(uneste);
const baza: ParametriText = { continut: '', inaltime: 15, spatiere: 0, interlinie: 1, aliniere: 'stanga' };

test('fiecare literă a textului vertical e chiar litera, mutată: aceleași contururi ca singură pe un rând (și cu aldin, cursiv, o singură linie)', () => {
  const cazuri: ReadonlyArray<readonly [string, Partial<ParametriText>]> = [
    [ROBOTO, {}], [ROBOTO, { aldin: 0.6, cursiv: 12 }], ['public/fonturi/relief-singleline.ttf', { cursiv: -8 }], ['test/fixtures/text/inter-subset.otf', {}],
  ];
  for (const [cale, extra] of cazuri) {
    const f = font(cale);
    const p: ParametriText = { ...baza, continut: 'HOȘ\nAĂg', spatiere: 0.7, interlinie: 1.1, aliniere: 'centru', ...extra };
    const vert = aseazaText(f, { ...p, vertical: true });
    assert.equal(vert.glife.length, 6, cale);
    for (const g of vert.glife) {
      const singura = aseazaText(f, { ...p, continut: g.caracter, aliniere: 'stanga' }).glife[0]!;
      const dx = g.cai[0]!.varfuri[0]!.p.x - singura.cai[0]!.varfuri[0]!.p.x, dy = g.cai[0]!.varfuri[0]!.p.y - singura.cai[0]!.varfuri[0]!.p.y;
      const aproape = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => Math.abs(a.x - b.x - dx) <= TOL && Math.abs(a.y - b.y - dy) <= TOL;
      assert.equal(g.cai.length, singura.cai.length, `${cale} ${g.caracter}`);
      g.cai.forEach((c, j) => {
        const s = singura.cai[j]!;
        assert.equal(c.inchis, s.inchis);
        assert.equal(c.varfuri.length, s.varfuri.length);
        c.varfuri.forEach((q, k) => {
          const w = s.varfuri[k]!;
          assert.ok(aproape(q.p, w.p) && q.s.tip === w.s.tip, `${cale} ${g.caracter} ${j}.${k}`);
          if (q.s.tip === 'C' && w.s.tip === 'C') assert.ok(aproape(q.s.c1, w.s.c1) && aproape(q.s.c2, w.s.c2));
          if (q.s.tip === 'A' && w.s.tip === 'A') assert.equal(q.s.bulge, w.s.bulge);
        });
      });
    }
  }
});

test('literele una sub alta: între cutiile a două litere vecine rămâne golul (em − majuscula + spațierea); între două majuscule, pasul e un em', () => {
  const f = font(ROBOTO);
  const h = 12, em = (f.unitsPerEm * h) / f.majuscula;
  for (const spatiere of [0, 2, -3]) {
    const r = aseazaText(f, { ...baza, continut: 'HOȘĂgH', inaltime: h, spatiere, vertical: true });
    const c = r.glife.map(cutie);
    for (let k = 0; k + 1 < c.length; k++) assert.ok(Math.abs(c[k]!.minY - c[k + 1]!.maxY - (em - h + spatiere)) <= TOL, `${spatiere} ${k}`);
    // H de sus are vârful în ancoră (alinierea sus); între două H-uri vecine, pasul e un em plus spațierea.
    assert.ok(Math.abs(c[0]!.maxY) <= TOL);
    const hh = aseazaText(f, { ...baza, continut: 'HH', inaltime: h, spatiere, vertical: true }).glife.map(cutie);
    assert.ok(Math.abs(hh[0]!.maxY - hh[1]!.maxY - (em + spatiere)) <= TOL);
  }
});

test('un font al cărui em nu trece de majusculă: golul nu e negativ (literele se ating), plus spațierea', () => {
  // Un font SVG de mână: em-ul de 500 de unități, majuscula (bara lui H) de 700.
  (globalThis as { DOMParser?: unknown }).DOMParser = DOMParser;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><defs><font horiz-adv-x="600"><font-face units-per-em="500"/>'
    + '<glyph unicode="H" d="M100 0H200V700H100Z"/></font></defs></svg>';
  const r = citesteFont(new TextEncoder().encode(svg));
  if (!r.ok) throw new Error(r.cod);
  assert.ok(r.font.majuscula === 700 && r.font.unitsPerEm === 500);
  for (const spatiere of [0, 1.5]) {
    const c: Cutie[] = aseazaText(r.font, { ...baza, continut: 'HH', inaltime: 14, spatiere, vertical: true }).glife.map(cutie);
    assert.ok(Math.abs(c[0]!.minY - c[1]!.maxY - spatiere) <= TOL, String(spatiere));
  }
});

test('un spațiu ține locul unei majuscule; un caracter pe care fontul nu-l are nu ține loc', () => {
  const f = font(ROBOTO);
  const h = 10, gol = (f.unitsPerEm * h) / f.majuscula - h;
  const cu = aseazaText(f, { ...baza, continut: 'H H', inaltime: h, vertical: true }).glife.map(cutie);
  const fara = aseazaText(f, { ...baza, continut: 'HH', inaltime: h, vertical: true }).glife.map(cutie);
  assert.ok(Math.abs(fara[1]!.maxY - cu[1]!.maxY - (h + gol)) <= TOL);
  const lipsa = aseazaText(f, { ...baza, continut: 'H日H', inaltime: h, vertical: true });
  assert.equal(lipsa.raport.lipsa, 1);
  assert.deepEqual(lipsa.glife.map(cutie), fara);
});

test('alinierea coloanelor față de ancoră: sus (vârful în 0), la mijloc, jos (baza în 0); fiecare literă pe axa coloanei ei, la distanța rândurilor', () => {
  const f = font(ROBOTO);
  for (const aliniere of ['stanga', 'centru', 'dreapta'] as const) {
    const r = aseazaText(f, { ...baza, continut: 'HOTEL\n\nAB', interlinie: 1.3, aliniere, vertical: true });
    // Rândul gol e o coloană goală: AB stă pe a treia axă.
    assert.deepEqual(r.linii.map((l) => l.caractere), [5, 0, 2]);
    for (const col of [0, 2]) {
      const g = r.glife.filter((x) => x.rand === col);
      const sus = cutie(g[0]!).maxY, jos = cutie(g.at(-1)!).minY;
      const l = r.linii[col]!;
      assert.ok(Math.abs(l.latime - (sus - jos)) <= TOL);
      if (aliniere === 'stanga') assert.ok(Math.abs(sus) <= TOL && l.dx === 0);
      if (aliniere === 'dreapta') assert.ok(Math.abs(jos) <= TOL && Math.abs(l.dx - l.latime) <= TOL);
      if (aliniere === 'centru') assert.ok(Math.abs(sus + jos) <= TOL && Math.abs(l.dx - l.latime / 2) <= TOL);
      for (const x of g) {
        const c = cutie(x);
        assert.ok(Math.abs((c.minX + c.maxX) / 2 - col * r.metrici.rand) <= TOL, `${aliniere} ${x.caracter}`);
      }
    }
  }
});

const docCu = (p: Piesa): Document => {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese: [p], foi: [{ ...d.foi[0]!, instante: [{ id: 'i1', piesa: p.id, x: 50, y: 50, rotire: 0 }] }] };
};

test('blocul ține textul vertical (doar „true”), nu și pe o curbă; scalarea uniformă îl păstrează, iar așezarea crește cu ea', () => {
  const tip = { continut: 'A', font: 'roboto', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', amprenta: 'x' };
  const bun = (b: object): boolean => v.safeParse(SchemaBlocText, { ...tip, ...b }).success;
  const curba = { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }], s: 0, pozitie: 'baza', distanta: 0, invers: false, orientare: 'rotita', intinsa: false };
  assert.ok(bun({}) && bun({ vertical: true }) && bun({ curba }));
  assert.ok(!bun({ vertical: false }) && !bun({ vertical: 1 }) && !bun({ vertical: true, curba }));
  const p: ParametriText = { ...baza, continut: 'HI\nT', inaltime: 20, spatiere: 1, aliniere: 'centru', vertical: true };
  const rez = piesaText(aseazaText(font(ROBOTO), p), { ...p, font: 'roboto' }, 'p1');
  assert.ok(rez.ok);
  if (!rez.ok) return;
  assert.equal(blocText(rez.piesa.radacina)?.vertical, true);
  const mare = transforma(docCu(rez.piesa), 0, ['i1'], { fel: 'scalare', sx: 1.5, sy: 1.5, ancora: { x: 0, y: 0 } });
  assert.ok(mare.ok);
  const bm = blocText(mare.piese[0]!.radacina);
  assert.ok(bm && bm.vertical === true && Math.abs(bm.inaltime - 30) <= 1e-12 && Math.abs(bm.spatiere - 1.5) <= 1e-12);
  // Așezarea verticală crește întocmai cu textul: la 30 mm, fiecare vârf e cel de la 20 mm înmulțit cu 1,5.
  const mic = aseazaText(font(ROBOTO), p), larg = aseazaText(font(ROBOTO), { ...p, inaltime: 30, spatiere: 1.5 });
  mic.glife.forEach((g, i) => g.cai.forEach((c, j) => c.varfuri.forEach((q, k) => {
    const w = larg.glife[i]!.cai[j]!.varfuri[k]!.p;
    assert.ok(Math.abs(w.x - 1.5 * q.p.x) <= 1e-9 && Math.abs(w.y - 1.5 * q.p.y) <= 1e-9);
  })));
});
