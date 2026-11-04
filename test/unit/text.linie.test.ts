import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { caleText } from '../../src/app/caleText.ts';
import type { Varf } from '../../src/geom/contur.ts';
import { blocText } from '../../src/model/blocText.ts';
import type { ElementNod, GrupNod, Piesa } from '../../src/model/document.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font, type PunctFont } from '../../src/text/font.ts';
import { cuOLinie, traseu } from '../../src/text/linie.ts';
import { piesaText } from '../../src/text/piesaText.ts';

/**
 * Fonturile cu o singură linie (ADR 0140): recunoașterea fontului, trăsătura fiecărui contur (dus-întors: jumătatea; păstrat
 * deschis: fără segmentul de închidere; altfel, buclă), așezarea lor ca trăsături (deschise sau bucle, fără normalizare și
 * fără aldin) și piesa lor, gravată pe linie.
 *
 * - **Corpusul independent** (`linie` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/linie.json`): fontTools citește
 *   Relief SingleLine (OFL, inclus), varianta lui dus-întors și varianta cu bucle; regulile sunt scrise din nou acolo.
 *   Fiecare trăsătură, cu starea ei (deschisă sau buclă): cele deschise din același punct, în aceeași ordine; buclele, același
 *   ciclu; sub 1e-9 mm.
 * - **Pe hârtie:** H de 20 mm din trei linii deschise; O-ul lui Relief, deschis, cu golul lui de 2 unități.
 */

const RAD = new URL('../../', import.meta.url);
const fonturi = new Map<string, Font>();
function font(cale: string): Font {
  const gata = fonturi.get(cale);
  if (gata) return gata;
  const r = citesteFont(new Uint8Array(readFileSync(new URL(cale, RAD))));
  if (!r.ok) throw new Error(`${cale}: ${r.cod}`);
  fonturi.set(cale, r.font);
  return r.font;
}
const relief = (): Font => font('public/fonturi/relief-singleline.ttf');

type Segment = ['L', number, number] | ['C', number, number, number, number, number, number];
type Trasatura = { readonly inchis: boolean; readonly start: readonly [number, number]; readonly segmente: readonly Segment[] };
type Caz = {
  readonly font: string; readonly parametri: ParametriText; readonly majuscula: number; readonly lipsa: number;
  readonly glife: ReadonlyArray<{ readonly caracter: string; readonly rand: number; readonly contururi: readonly Trasatura[] }>;
};
const FIX = JSON.parse(readFileSync(new URL('test/fixtures/text/linie.json', RAD), 'utf8')) as {
  readonly recunoastere: Readonly<Record<string, boolean>>; readonly cazuri: Readonly<Record<string, Caz>>;
};
const TOL = 1e-9;
const egale = (x: readonly number[], y: readonly number[]): boolean => x.length === y.length && x.every((v, i) => Math.abs(v - (y[i] as number)) <= TOL);

/** Pașii unei căi a aplicației: din fiecare vârf, segmentul lui (cele n − 1 ale unei căi deschise, n ale uneia închise). */
function pasi(varfuri: readonly Varf[], inchis: boolean): Array<{ a: readonly number[]; s: readonly (string | number)[] }> {
  const n = inchis ? varfuri.length : varfuri.length - 1;
  return varfuri.slice(0, n).map((v, k) => {
    const u = varfuri[(k + 1) % varfuri.length]!.p;
    assert.notEqual(v.s.tip, 'A');
    return { a: [v.p.x, v.p.y], s: v.s.tip === 'C' ? ['C', v.s.c1.x, v.s.c1.y, v.s.c2.x, v.s.c2.y, u.x, u.y] : ['L', u.x, u.y] };
  });
}
function pasiOracol(t: Trasatura): Array<{ a: readonly number[]; s: readonly (string | number)[] }> {
  let a: readonly number[] = t.start;
  return t.segmente.map((s) => {
    const p = { a, s };
    a = s.slice(-2) as number[];
    return p;
  });
}

test('recunoașterea fontului cu o singură linie: Relief și variantele lui, da; Roboto, Droid Serif, Inter, nu', () => {
  for (const [cale, linie] of Object.entries(FIX.recunoastere)) assert.equal(font(cale).linie, linie, cale);
});

for (const [nume, caz] of Object.entries(FIX.cazuri)) {
  test(`corpusul liniilor simple: ${nume} (${caz.font}), față de oracol`, () => {
    const f = font(caz.font);
    assert.equal(f.majuscula, caz.majuscula);
    const r = aseazaText(f, caz.parametri);
    assert.equal(r.linie, true);
    assert.equal(r.raport.lipsa, caz.lipsa);
    assert.deepEqual(r.glife.map((g) => [g.caracter, g.rand]), caz.glife.map((g) => [g.caracter, g.rand]));
    caz.glife.forEach((ga, i) => {
      const gb = r.glife[i]!;
      assert.equal(gb.cai.length, ga.contururi.length, `${ga.caracter}: trăsăturile`);
      ga.contururi.forEach((t, j) => {
        const c = gb.cai[j]!;
        assert.equal(c.inchis, t.inchis, `${ga.caracter} ${j}: deschisă / buclă`);
        const o = pasiOracol(t), p = pasi(c.varfuri, c.inchis);
        assert.equal(p.length, o.length, `${ga.caracter} ${j}: segmentele`);
        // Deschisă: din același punct; buclă: același ciclu, din oricare vârf al lui.
        const r0 = t.inchis ? p.findIndex((x) => egale(x.a, o[0]!.a)) : 0;
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

const P = (x: number, y: number, peCurba = true): PunctFont => ({ x, y, peCurba });

test('trăsătura, pe contururi scrise de mână: dus-întors, păstrată deschisă, buclă închisă, buclă cu ultimul punct în afara curbei', () => {
  const A = P(0, 0), B = P(10, 0), C = P(10, 10);
  // O linie de două puncte e chiar dus-întors: [A, B].
  assert.deepEqual(traseu([A, B]), { puncte: [A, B], inchis: false });
  // Dus-întors cu pătratice: A c1 B c2 C, apoi c2 B c1 înapoi; întoarcerile în A și în C.
  const c1 = P(5, -5, false), c2 = P(15, 5, false);
  assert.deepEqual(traseu([A, c1, B, c2, C, c2, B, c1]), { puncte: [A, c1, B, c2, C], inchis: false });
  // Același, scris din altă întoarcere: jumătatea pornește din primul punct de întoarcere găsit.
  assert.deepEqual(traseu([C, c2, B, c1, A, c1, B, c2]), { puncte: [C, c2, B, c1, A], inchis: false });
  // Păstrată deschisă: din primul până în ultimul, fără segmentul de închidere.
  assert.deepEqual(traseu([A, B, C]), { puncte: [A, B, C], inchis: false });
  // Ultimul chiar primul: o buclă, cu punctul repetat păstrat (o cubică CFF / SVG care se termină în start are nevoie de el;
  // segmentul de lungime zero de după el se sare la așezare).
  assert.deepEqual(traseu([A, B, C, P(0, 0)]), { puncte: [A, B, C, P(0, 0)], inchis: true });
  // Ultimul punct în afara curbei: segmentul de închidere e o curbă a desenului.
  const d = [A, B, P(10, 10, false)];
  assert.deepEqual(traseu(d), { puncte: d, inchis: true });
  // Un contur cu arie nu e dus-întors: cu ultimul punct pe curbă, e o trăsătură deschisă (fără latura de închidere).
  assert.deepEqual(traseu([A, B, C, P(0, 10)]), { puncte: [A, B, C, P(0, 10)], inchis: false });
});

test('pe hârtie (ADR 0140): H de 20 mm din Relief, trei linii deschise; O-ul, deschis, cu golul lui de 2 unități', () => {
  const s = 20 / 680;
  const r = aseazaText(relief(), { continut: 'HO', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' });
  const linii = r.glife[0]!.cai.map((c) => [c.inchis, ...c.varfuri.map((v) => [v.p.x, v.p.y])]);
  assert.equal(linii.length, 3);
  const asteptat = [[[140, 680], [140, 0]], [[140, 365], [566, 365]], [[566, 0], [566, 680]]];
  linii.forEach((l, k) => {
    assert.equal(l[0], false);
    assert.ok((l.slice(1) as number[][]).every((q, i) => egale(q, asteptat[k]![i]!.map((u) => u * s))), JSON.stringify(l));
  });
  const o = r.glife[1]!.cai;
  assert.equal(o.length, 1);
  assert.equal(o[0]!.inchis, false);
  const x0 = r.glife[1]!.x, v = o[0]!.varfuri;
  assert.ok(egale([v[0]!.p.x, v[0]!.p.y], [x0 + 357 * s, 20]) && egale([v[v.length - 1]!.p.x, v[v.length - 1]!.p.y], [x0 + 359 * s, 20]));
  assert.ok(Math.abs(x0 - 706 * s) <= 1e-12);
});

test('o buclă care trece de două ori pe același loc rămâne cum e desenată: trăsăturile nu se normalizează ca figuri', () => {
  // Un font de probă cu o singură literă: pătratul (0, 0) → (400, 0) → (400, 400) → (0, 400), ocolit de două ori și
  // întors în (0, 0), cu majuscula 680. Ca figură `nonzero` (înfășurarea 2), normalizarea l-ar face un singur pătrat, iar
  // freza ar trece o dată în loc de două ori.
  const ocol = [P(0, 0), P(400, 0), P(400, 400), P(0, 400)];
  const contur: PunctFont[] = [...ocol, ...ocol, P(0, 0)];
  const dublu: Font = {
    ...relief(), linie: true, glifa: (cod) => (cod === 0x38 ? 1 : 0), avans: () => 500, crenare: () => 0, contururi: () => [contur],
  };
  const r = aseazaText(dublu, { continut: '8', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' });
  assert.equal(r.raport['nonzero-normalizate'], 0);
  const c = r.glife[0]!.cai;
  assert.equal(c.length, 1);
  assert.equal(c[0]!.inchis, true);
  const s = 20 / 680;
  const pe = c[0]!.varfuri.map((v) => [v.p.x / s, v.p.y / s].map((u) => Math.round(u * 1e6) / 1e6));
  assert.deepEqual(pe, [[0, 0], [400, 0], [400, 400], [0, 400], [0, 0], [400, 0], [400, 400], [0, 400]]);
});

test('un font cu o singură linie nu se îngroașă: aldinul e ignorat (n-are figură), cursivul se aplică', () => {
  const p: ParametriText = { continut: 'Ușă', inaltime: 15, spatiere: 0, interlinie: 1, aliniere: 'stanga' };
  assert.deepEqual(aseazaText(relief(), { ...p, aldin: 0.5 }), aseazaText(relief(), p));
  assert.notDeepEqual(aseazaText(relief(), { ...p, cursiv: 12 }).glife, aseazaText(relief(), p).glife);
});

const grup = (n: Piesa['radacina']): GrupNod => {
  assert.equal(n.tip, 'grup');
  return n as GrupNod;
};

test('piesa unui text cu o singură linie: trăsăturile ca forme deschise (buclele închise), gravate pe linie, adâncimea căilor deschise', () => {
  const p: ParametriText = { continut: 'HI', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' };
  const rez = piesaText(aseazaText(relief(), p), { ...p, font: 'relief-singleline' }, 'p1', undefined, undefined, 18);
  assert.ok(rez.ok, rez.ok ? '' : rez.motiv);
  if (!rez.ok) return;
  const rad = grup(rez.piesa.radacina);
  // I-ul lui Relief are, lângă linia lui, o trăsătură de 2 unități în vârf, (141, 680)–(139, 680): păstrată, cum e desenată.
  assert.deepEqual(rad.copii.map((g) => [g.nume, grup(g).copii.length]), [['H', 3], ['I', 2]]);
  for (const g of rad.copii) for (const e of grup(g).copii) assert.equal((e as ElementNod).forma['inchis'], false);
  assert.deepEqual(rez.piesa.operatii.map((o) => [o.id, o.tip, o.latura, o.adancime, o.pas, o.noduri.length]), [['deschise', 'profil', 'pe-linie', 1, 1, 5]]);
  assert.ok(blocText(rad));
  // Pe o foaie de 1,2 mm, gravura are jumătate din grosime, ca la căile deschise importate.
  const subtire = piesaText(aseazaText(relief(), p), { ...p, font: 'relief-singleline' }, 'p1', undefined, undefined, 1.2);
  assert.ok(subtire.ok && subtire.piesa.operatii[0]!.adancime === 0.6);
  // Buclele variantei rămân închise, tot pe linie.
  const b = piesaText(aseazaText(font('test/fixtures/text/relief-bucle.ttf'), { ...p, continut: 'Oo' }), { ...p, continut: 'Oo', font: 'x' }, 'p2');
  assert.ok(b.ok);
  if (b.ok) {
    for (const g of grup(b.piesa.radacina).copii) for (const e of grup(g).copii) assert.equal((e as ElementNod).forma['inchis'], true);
    assert.deepEqual(b.piesa.operatii.map((o) => o.latura), ['pe-linie']);
  }
});

test('editarea: un text obișnuit trecut pe o singură linie își pierde profilele de contur; înapoi, gravura pe linie trece pe toate contururile', () => {
  const p: ParametriText = { continut: 'OB', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' };
  const roboto = font('public/fonturi/roboto.ttf');
  const obisnuit = piesaText(aseazaText(roboto, p), { ...p, font: 'roboto' }, 'p1');
  assert.ok(obisnuit.ok);
  if (!obisnuit.ok) return;
  assert.deepEqual(obisnuit.piesa.operatii.map((o) => o.latura), ['exterior', 'interior']);
  const linie = piesaText(aseazaText(relief(), p), { ...p, font: 'relief-singleline' }, 'p1', undefined, obisnuit.piesa, 18);
  assert.ok(linie.ok);
  if (!linie.ok) return;
  assert.deepEqual(linie.piesa.operatii.map((o) => [o.latura, o.noduri.length]), [['pe-linie', grup(linie.piesa.radacina).copii.flatMap((g) => grup(g).copii).length]]);
  const inapoi = piesaText(aseazaText(roboto, p), { ...p, font: 'roboto' }, 'p1', undefined, linie.piesa);
  assert.ok(inapoi.ok);
  if (inapoi.ok) assert.deepEqual(inapoi.piesa.operatii.map((o) => [o.latura, o.noduri.length]), [['pe-linie', 5]]);
});

test('previzualizarea unui text cu o singură linie: trăsăturile desenate cu linia, fără umplere, deschise fără Z', () => {
  const r = caleText(aseazaText(relief(), { continut: 'HO', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' }))!;
  assert.equal(r.d, '');
  assert.ok(r.linii.startsWith('M') && !r.linii.includes('Z'), r.linii.slice(0, 80));
  assert.equal((r.linii.match(/M/g) ?? []).length, 4);
  // Pe hârtie, H de 20 mm (Y în jos, la miime): x = 140 · 20 / 680 = 4,118 și 566 · 20 / 680 = 16,647, bara la 10,735;
  // fiecare trăsătură, un singur segment (fără drumul înapoi spre start).
  const h = caleText(aseazaText(relief(), { continut: 'H', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' }))!;
  assert.equal(h.linii, 'M4.118 -20L4.118 0M4.118 -10.735L16.647 -10.735M16.647 0L16.647 -20');
  // Buclele unui font cu o singură linie se desenează tot cu linia (închise, cu Z), nu umplute.
  const b = caleText(aseazaText(font('test/fixtures/text/relief-bucle.ttf'), { continut: 'Oo', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' }))!;
  assert.equal(b.d, '');
  assert.equal((b.linii.match(/Z/g) ?? []).length, 2);
  // Un text obișnuit: totul umplut, nimic desenat cu linia.
  const o = caleText(aseazaText(font('public/fonturi/roboto.ttf'), { continut: 'HO', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' }))!;
  assert.ok(o.d.includes('Z') && o.linii === '');
});
