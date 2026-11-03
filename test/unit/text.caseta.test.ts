import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as v from 'valibot';
import type { Varf } from '../../src/geom/contur.ts';
import { cutieContur, uneste, type Cutie } from '../../src/geom/cutie.ts';
import { blocText, SchemaBlocText } from '../../src/model/blocText.ts';
import { documentNou, type Document, type Piesa } from '../../src/model/document.ts';
import { transforma } from '../../src/model/transformare.ts';
import { aseazaText, type ParametriText, type TextAsezat } from '../../src/text/asezare.ts';
import { aseazaPeCurba } from '../../src/text/peCurba.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { piesaText } from '../../src/text/piesaText.ts';

/**
 * Încadrarea în casetă (ADR 0142): limitat de casetă (înălțimea cerută, micșorată doar cât să încapă) sau scalat la ea (cea
 * mai mare care încape); se încadrează cutia literelor tăiate.
 *
 * - **Corpusul independent** (`fonturi_caseta` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/caseta.json`):
 *   oracolul caută înălțimea prin înjumătățire pe așezări întregi (aplicația, pe marginile afine a două așezări de măsurare);
 *   aici, aceeași înălțime (sub 1e-9, relativ) și aceleași contururi (sub 1e-9 mm). Pe hârtie, în oracol: „HHH” în 100 × 50
 *   (h = 100 · 1456 / 4039), cu spațierea, limitat (încape, se micșorează), două rânduri, vertical, cu aldin. Aldinul în
 *   casetă e un caz al corpusului aldinului (`aldin-caseta`).
 * - **Probele țintite:** cele două moduri, umplerea pe latura care leagă, cutia literei, caseta prea mică, omogenitatea
 *   (caseta, spațierea și aldinul scalate dau înălțimea scalată), blocul și scalarea lui.
 */

const RAD = new URL('../../', import.meta.url);
const fonturi = new Map<string, Font>();
function font(cale: string): Font {
  const gata = fonturi.get(cale);
  if (gata) return gata;
  const r = citesteFont(new Uint8Array(readFileSync(new URL(cale, RAD))));
  if (!r.ok) throw new Error(cale);
  fonturi.set(cale, r.font);
  return r.font;
}
const ROBOTO = 'public/fonturi/roboto.ttf';

type Segment = ['L', number, number] | ['C', number, number, number, number, number, number];
type Contur = { readonly inchis?: boolean; readonly start: readonly [number, number]; readonly segmente: readonly Segment[] };
type Caz = {
  readonly font: string; readonly parametri: ParametriText; readonly majuscula: number; readonly linie: boolean; readonly inaltime: number;
  readonly lipsa: number; readonly stricate: number;
  readonly glife: ReadonlyArray<{ readonly caracter: string; readonly rand: number; readonly contururi: readonly Contur[] }>;
};
const FIX = JSON.parse(readFileSync(new URL('test/fixtures/text/caseta.json', RAD), 'utf8')) as { readonly cazuri: Readonly<Record<string, Caz>> };
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
  test(`corpusul casetei: ${nume} (${caz.font}), față de oracol`, () => {
    const f = font(caz.font);
    assert.equal(f.majuscula, caz.majuscula);
    const r = aseazaText(f, caz.parametri);
    assert.ok(Math.abs(r.inaltime - caz.inaltime) <= TOL * caz.inaltime, `${r.inaltime} față de ${caz.inaltime}`);
    assert.equal(r.raport['caseta-prea-mica'], 0);
    assert.equal(r.linie, caz.linie);
    assert.equal(r.raport.lipsa, caz.lipsa);
    assert.equal(r.raport['glife-stricate'], caz.stricate);
    assert.equal(r.raport['nonzero-normalizate'], 0);
    assert.deepEqual(r.glife.map((g) => [g.caracter, g.rand]), caz.glife.map((g) => [g.caracter, g.rand]));
    caz.glife.forEach((ga, i) => {
      const gb = r.glife[i]!;
      assert.equal(gb.cai.length, ga.contururi.length, `${ga.caracter}: contururile`);
      ga.contururi.forEach((t, j) => {
        const c = gb.cai[j]!;
        const inchis = t.inchis ?? true;
        assert.equal(c.inchis, inchis);
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

/** Cutia textului tăiat: reuniunea cutiilor literelor. */
const cutieText = (a: TextAsezat): Cutie => a.glife.map((g) => g.cutie).reduce(uneste);
const baza: ParametriText = { continut: 'HHH', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' };

test('limitat de casetă: înălțimea cerută când încape; altfel, micșorată exact cât scalarea la casetă', () => {
  const f = font(ROBOTO);
  const incape = aseazaText(f, { ...baza, caseta: { fel: 'limita', latime: 100, inaltime: 50, ceruta: 20 } });
  assert.equal(incape.inaltime, 20);
  const mare = aseazaText(f, { ...baza, inaltime: 50, caseta: { fel: 'limita', latime: 100, inaltime: 50, ceruta: 50 } });
  const scala = aseazaText(f, { ...baza, caseta: { fel: 'scala', latime: 100, inaltime: 50 } });
  assert.ok(mare.inaltime < 50 && Math.abs(mare.inaltime - scala.inaltime) <= TOL * scala.inaltime);
});

test('scalat la casetă: cutia textului tăiat încape și umple latura care leagă (orizontal, vertical, aldin, cursiv, o singură linie)', () => {
  const cazuri: ReadonlyArray<readonly [string, Partial<ParametriText>, number, number]> = [
    [ROBOTO, { continut: 'Ușă de\nstejar', aliniere: 'centru', spatiere: 0.5 }, 120, 30],
    [ROBOTO, { continut: 'Ușă de\nstejar', aliniere: 'centru', aldin: 0.4, cursiv: 10 }, 40, 300],
    [ROBOTO, { continut: 'PIAȚĂ\nBAR', vertical: true, aliniere: 'dreapta', spatiere: 1 }, 50, 120],
    ['public/fonturi/relief-singleline.ttf', { continut: 'HOTEL 2026', cursiv: -8 }, 90, 12],
    ['test/fixtures/text/inter-subset.otf', { continut: 'AVATAR\nHog', interlinie: 1.4 }, 70, 70],
  ];
  for (const [cale, extra, W, H] of cazuri) {
    const r = aseazaText(font(cale), { ...baza, ...extra, caseta: { fel: 'scala', latime: W, inaltime: H } });
    const c = cutieText(r);
    const l = c.maxX - c.minX, i = c.maxY - c.minY;
    assert.equal(r.raport['caseta-prea-mica'], 0);
    assert.ok(l <= W + 1e-9 && i <= H + 1e-9, `${cale} ${JSON.stringify(extra)}: ${l} × ${i}`);
    assert.ok(Math.abs(l - W) <= 1e-9 || Math.abs(i - H) <= 1e-9, `${cale} ${JSON.stringify(extra)}: ${l} × ${i}`);
  }
});

test('cutia unei litere e a ce se taie: a contururilor ei; la aldin, a figurii exacte (biarcele, la cel mult toleranța lor)', () => {
  const f = font(ROBOTO);
  const drepte = aseazaText(f, { ...baza, continut: 'Ușă Bg', cursiv: 12 });
  for (const g of drepte.glife) assert.deepEqual(g.cutie, g.cai.map(cutieContur).reduce(uneste));
  const aldine = aseazaText(f, { ...baza, continut: 'Ușă Bg', aldin: 0.6 });
  for (const g of aldine.glife) {
    const d = g.cai.map(cutieContur).reduce(uneste);
    for (const k of ['minX', 'minY', 'maxX', 'maxY'] as const) assert.ok(Math.abs(g.cutie[k] - d[k]) <= 2e-3, `${g.caracter} ${k}`);
  }
});

test('caseta prea mică: raportul o spune, iar textul rămâne la înălțimea cerută', () => {
  const r = aseazaText(font(ROBOTO), { ...baza, continut: 'HHHHHHHHHH', spatiere: 20, caseta: { fel: 'scala', latime: 100, inaltime: 50 } });
  assert.equal(r.raport['caseta-prea-mica'], 1);
  assert.equal(r.inaltime, 20);
  // Aldinul cere cel puțin de cinci ori grosimea lui: 4 mm de aldin nu încap într-o casetă de 15 mm înălțime.
  const g = aseazaText(font(ROBOTO), { ...baza, aldin: 4, caseta: { fel: 'scala', latime: 500, inaltime: 15 } });
  assert.equal(g.raport['caseta-prea-mica'], 1);
});

test('caseta, spațierea și aldinul înmulțite cu k dau înălțimea înmulțită cu k (blocul scalat rămâne al geometriei)', () => {
  const f = font(ROBOTO);
  const p: ParametriText = { ...baza, continut: 'Ușă\nde stejar', spatiere: 0.7, aldin: 0.5, aliniere: 'centru', caseta: { fel: 'scala', latime: 80, inaltime: 40 } };
  const h = aseazaText(f, p).inaltime;
  for (const k of [0.5, 1.5, 3]) {
    const hk = aseazaText(f, { ...p, spatiere: 0.7 * k, aldin: 0.5 * k, caseta: { fel: 'scala', latime: 80 * k, inaltime: 40 * k } }).inaltime;
    assert.ok(Math.abs(hk - k * h) <= 1e-9 * k * h, `${k}: ${hk} față de ${k * h}`);
  }
});

const docCu = (p: Piesa): Document => {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese: [p], foi: [{ ...d.foi[0]!, instante: [{ id: 'i1', piesa: p.id, x: 50, y: 50, rotire: 0 }] }] };
};

test('blocul ține caseta (limitat, cu înălțimea cerută; scalat), nu și pe o curbă; scalarea uniformă o crește', () => {
  const tip = { continut: 'A', font: 'roboto', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', amprenta: 'x' };
  const bun = (b: object): boolean => v.safeParse(SchemaBlocText, { ...tip, ...b }).success;
  const curba = { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }], s: 0, pozitie: 'baza', distanta: 0, invers: false, orientare: 'rotita', intinsa: false };
  assert.ok(bun({ caseta: { fel: 'scala', latime: 100, inaltime: 50 } }) && bun({ caseta: { fel: 'limita', latime: 100, inaltime: 50, ceruta: 30 } }));
  assert.ok(bun({ caseta: { fel: 'scala', latime: 100, inaltime: 50 }, vertical: true }));
  assert.ok(!bun({ caseta: { fel: 'limita', latime: 100, inaltime: 50 } }) && !bun({ caseta: { fel: 'umple', latime: 100, inaltime: 50 } }));
  assert.ok(!bun({ caseta: { fel: 'scala', latime: 0.05, inaltime: 50 } }) && !bun({ caseta: { fel: 'scala', latime: 100, inaltime: 10_001 } }));
  assert.ok(!bun({ caseta: { fel: 'scala', latime: 100, inaltime: 50 }, curba }));
  const p: ParametriText = { ...baza, caseta: { fel: 'limita', latime: 100, inaltime: 50, ceruta: 50 } };
  const a = aseazaText(font(ROBOTO), p);
  const rez = piesaText(a, { ...p, inaltime: a.inaltime, font: 'roboto' }, 'p1');
  assert.ok(rez.ok);
  if (!rez.ok) return;
  assert.deepEqual(blocText(rez.piesa.radacina)?.caseta, { fel: 'limita', latime: 100, inaltime: 50, ceruta: 50 });
  const mare = transforma(docCu(rez.piesa), 0, ['i1'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } });
  assert.ok(mare.ok);
  const bm = blocText(mare.piese[0]!.radacina);
  assert.ok(bm);
  assert.deepEqual(bm.caseta, { fel: 'limita', latime: 200, inaltime: 100, ceruta: 100 });
  // Blocul scalat dă din nou geometria scalată: înălțimea din casetă e dublă.
  assert.ok(Math.abs(aseazaText(font(ROBOTO), { ...bm, inaltime: bm.inaltime }).inaltime - 2 * a.inaltime) <= 1e-9 * a.inaltime);
  // O casetă scalată peste 10 000 mm nu mai e a unui bloc: piesa rămâne doar vectori.
  const q: ParametriText = { ...baza, caseta: { fel: 'limita', latime: 9_000, inaltime: 50, ceruta: 10 } };
  const lata = piesaText(aseazaText(font(ROBOTO), q), { ...q, font: 'roboto' }, 'p2');
  assert.ok(lata.ok);
  if (!lata.ok) return;
  assert.ok(blocText(lata.piesa.radacina));
  const dubla = transforma(docCu(lata.piesa), 0, ['i1'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } });
  assert.ok(dubla.ok);
  assert.equal(Object.hasOwn(dubla.piese[0]!.radacina, 'text'), false);
});

test('pe o curbă, cutia fiecărei litere e a contururilor ei mutate', () => {
  const a = aseazaText(font(ROBOTO), { ...baza, continut: 'LEMN', inaltime: 10 });
  const cerc = { inchis: true, varfuri: [{ p: { x: 50, y: 0 }, s: { tip: 'A' as const, bulge: 1 } }, { p: { x: -50, y: 0 }, s: { tip: 'A' as const, bulge: 1 } }] };
  const c = aseazaPeCurba(a, { contur: cerc, s: 25 * Math.PI, pozitie: 'baza', distanta: 0, invers: false, orientare: 'rotita', intinsa: false }, 10, 'centru');
  if (!c) throw new Error('curba');
  assert.equal(c.glife.length, 4);
  for (const g of c.glife) assert.deepEqual(g.cutie, g.cai.map(cutieContur).reduce(uneste));
});
