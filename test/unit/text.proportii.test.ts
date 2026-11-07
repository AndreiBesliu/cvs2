import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as v from 'valibot';
import type { Varf } from '../../src/geom/contur.ts';
import { cutieContur, uneste, type Cutie } from '../../src/geom/cutie.ts';
import { blocText, majusculaBloc, SchemaBlocText, type BlocText } from '../../src/model/blocText.ts';
import { documentNou, type Document, type Nod, type Piesa } from '../../src/model/document.ts';
import { transforma } from '../../src/model/transformare.ts';
import { aseazaPeCurba } from '../../src/text/peCurba.ts';
import { aseazaText, type GlifaAsezata, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { majusculaDinMarime, marimeDinMajuscula, raportMajuscula, rotunjesteMarime } from '../../src/text/marime.ts';
import { piesaText } from '../../src/text/piesaText.ts';

/**
 * Proporțiile literelor, crenarea oprită și mărimea în pt sau inch (ADR 0138, felia 7.9↑).
 *
 * - **Corpusul independent** (`fonturi_proportii` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/proportii.json`):
 *   oracolul așază textul din nou, din fontTools, pe Roboto, Droid Serif, Inter (CFF, cu cursiv) și Relief (cu o singură
 *   linie), orizontal și vertical, cu crenarea oprită; aici, aceleași contururi, sub 1e-9 mm. Pe hârtie, în oracol: fără
 *   spațiere, fiecare punct e cel de la 100 % scalat (x × lățimea, y × înălțimea; cu cursiv, x − y · tan θ); crenarea oprită
 *   dă exact suma avansurilor. Caseta, curba și aldinul cu proporții sunt cazuri ale corpusurilor lor
 *   (`caseta-proportii`, `cerc-proportii`, `aldin-proportii`).
 * - **Probele țintite:** 100 % și 100 % dau așezarea de azi, bit cu bit; crenarea; mărimea în pt și in pe hârtie; marginile
 *   blocului; mânerele (ADR 0138 §4): textul scalat neuniform e chiar textul așezat din nou cu blocul nou.
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
const DROID = 'public/fonturi/droid-serif.ttf';

type Segment = ['L', number, number] | ['C', number, number, number, number, number, number];
type Contur = { readonly inchis?: boolean; readonly start: readonly [number, number]; readonly segmente: readonly Segment[] };
type Caz = {
  readonly font: string; readonly parametri: ParametriText; readonly majuscula: number; readonly linie: boolean; readonly lipsa: number;
  readonly stricate: number; readonly glife: ReadonlyArray<{ readonly caracter: string; readonly rand: number; readonly contururi: readonly Contur[] }>;
};
const FIX = JSON.parse(readFileSync(new URL('test/fixtures/text/proportii.json', RAD), 'utf8')) as { readonly cazuri: Readonly<Record<string, Caz>> };
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

test('corpusul proporțiilor are fiecare fel: lățimea, înălțimea, amândouă, cursivul, verticalul, crenarea oprită, o singură linie', () => {
  const c = Object.values(FIX.cazuri);
  assert.ok(c.some((x) => x.parametri.proportii && x.parametri.proportii.latime !== 100 && x.parametri.proportii.inaltime === 100));
  assert.ok(c.some((x) => x.parametri.proportii && x.parametri.proportii.latime === 100 && x.parametri.proportii.inaltime !== 100));
  assert.ok(c.some((x) => x.parametri.proportii && x.parametri.proportii.latime !== 100 && x.parametri.proportii.inaltime !== 100));
  assert.ok(c.some((x) => x.parametri.proportii && x.parametri.cursiv));
  assert.ok(c.some((x) => x.parametri.proportii && x.parametri.vertical));
  assert.ok(c.some((x) => x.parametri.crenare === false && !x.parametri.proportii));
  assert.ok(c.some((x) => x.parametri.crenare === false && x.parametri.proportii));
  assert.ok(c.some((x) => x.linie && x.parametri.proportii));
});

for (const [nume, caz] of Object.entries(FIX.cazuri)) {
  test(`corpusul proporțiilor: ${nume} (${caz.font}), față de oracol`, () => {
    const f = font(caz.font);
    assert.equal(f.majuscula, caz.majuscula);
    const r = aseazaText(f, caz.parametri);
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

const baza: ParametriText = { continut: 'AVATAR To\nHog', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' };
const cutie = (g: GlifaAsezata): Cutie => g.cai.map((c) => cutieContur(c)).reduce(uneste);

test('100 % și 100 % dau așezarea de azi, bit cu bit: orizontal, vertical, cu cursiv, cu aldin, în casetă, la dreapta', () => {
  const f = font(ROBOTO);
  for (const p of [
    baza, { ...baza, spatiere: 0.7, interlinie: 1.3, aliniere: 'dreapta' as const }, { ...baza, cursiv: -8 }, { ...baza, aldin: 0.6 },
    { ...baza, vertical: true as const, aliniere: 'centru' as const }, { ...baza, caseta: { fel: 'scala' as const, latime: 80, inaltime: 40 } },
  ]) {
    const azi = aseazaText(f, p);
    assert.deepEqual(aseazaText(f, { ...p, proportii: { latime: 100, inaltime: 100 } }), azi);
    assert.equal(azi.majuscula, azi.inaltime);
  }
});

test('crenarea oprită: literele stau la avansurile fontului; textul vertical n-o folosește oricum', () => {
  const f = font(ROBOTO);
  const p: ParametriText = { ...baza, continut: 'AV' };
  const cu = aseazaText(f, p), fara = aseazaText(f, { ...p, crenare: false });
  const s = 20 / f.majuscula;
  // V începe la avansul lui A, fără perechea AV (negativă în Roboto), deci mai la dreapta decât cu crenarea.
  assert.equal(fara.glife[1]!.x, f.avans(f.glifa(0x41)) * s);
  assert.ok(Math.abs(cu.glife[1]!.x - (f.avans(f.glifa(0x41)) + f.crenare(f.glifa(0x41), f.glifa(0x56))) * s) < 1e-12);
  assert.ok(f.crenare(f.glifa(0x41), f.glifa(0x56)) < 0 && fara.linii[0]!.latime > cu.linii[0]!.latime);
  const vert: ParametriText = { ...p, vertical: true };
  assert.deepEqual(aseazaText(f, { ...vert, crenare: false }), aseazaText(f, vert));
});

test('lățimea și înălțimea, pe hârtie: „LEMN” la 50 % are majusculele de 20 mm și jumătate din lățime; H la 150 % are 30 mm', () => {
  const f = font(ROBOTO);
  const l100 = aseazaText(f, { ...baza, continut: 'LEMN' });
  const l50 = aseazaText(f, { ...baza, continut: 'LEMN', proportii: { latime: 50, inaltime: 100 } });
  assert.equal(l50.majuscula, 20);
  assert.ok(Math.abs(l50.linii[0]!.latime - l100.linii[0]!.latime / 2) < 1e-12);
  for (const g of l50.glife) assert.ok(Math.abs(cutie(g).maxY - 20) < 1e-12 && Math.abs(cutie(g).minY) < 1e-12, g.caracter);
  const h = aseazaText(f, { ...baza, continut: 'H', proportii: { latime: 100, inaltime: 150 } });
  assert.equal(h.majuscula, 30);
  const c = cutie(h.glife[0]!);
  // H: picioarele de la 169 la 1288 de unități, majuscula 1456; lățimea rămâne cea de la 20 mm.
  assert.ok(Math.abs(c.maxY - 30) < 1e-12 && Math.abs(c.minX - 169 * 20 / 1456) < 1e-12 && Math.abs(c.maxX - 1288 * 20 / 1456) < 1e-12);
  // Rândul al doilea coboară cu rândul fontului (2146 + 555 = 2701 de unități) la majuscula tăiată.
  const doua = aseazaText(f, { ...baza, continut: 'H\nH', proportii: { latime: 100, inaltime: 150 } });
  assert.ok(Math.abs(doua.metrici.rand - 2701 * 30 / 1456) < 1e-9, String(doua.metrici.rand));
});

test('mărimea în pt și in, pe hârtie: 72 pt = em-ul de 1 inch (Roboto: majusculele de 18,0578125 mm), 1 in = majuscula de 25,4 mm', () => {
  const r = raportMajuscula(font(ROBOTO));
  assert.equal(r, 1456 / 2048);
  assert.ok(Math.abs(majusculaDinMarime(72, 'pt', r) - 18.0578125) < 1e-12);
  assert.ok(Math.abs(majusculaDinMarime(72, 'pt', raportMajuscula(font(DROID))) - 25.4 * 1462 / 2048) < 1e-12);
  assert.equal(majusculaDinMarime(1, 'in', r), 25.4);
  assert.equal(majusculaDinMarime(20, 'mm', r), 20);
  // 20 mm de majusculă sunt 20 · 72 · 2048 / (25,4 · 1456) pt; înapoi, aceeași majusculă.
  assert.ok(Math.abs(marimeDinMajuscula(20, 'pt', r) - (20 * 72 * 2048) / (25.4 * 1456)) < 1e-9);
  assert.ok(Math.abs(majusculaDinMarime(marimeDinMajuscula(20, 'pt', r), 'pt', r) - 20) < 1e-12);
  assert.equal(rotunjesteMarime(marimeDinMajuscula(majusculaDinMarime(72, 'pt', r), 'pt', r), 'pt'), 72);
  assert.equal(rotunjesteMarime(marimeDinMajuscula(20, 'in', r), 'in'), 0.7874);
  assert.equal(rotunjesteMarime(marimeDinMajuscula(20, 'pt', r), 'pt'), 79.74);
  assert.equal(rotunjesteMarime(18.05781249, 'mm'), 18.0578);
});

test('blocul: proporțiile între 10 și 1 000 %, aldinul cel mult o cincime din majuscula tăiată, unitatea doar pt sau in, crenarea doar oprită', () => {
  const b = { continut: 'H', font: 'roboto', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', amprenta: 'x' };
  const bun = (x: object): boolean => v.safeParse(SchemaBlocText, { ...b, ...x }).success;
  assert.ok(bun({ proportii: { latime: 10, inaltime: 1000 } }));
  assert.ok(!bun({ proportii: { latime: 9.99, inaltime: 100 } }) && !bun({ proportii: { latime: 100, inaltime: 1000.01 } }));
  // Majuscula tăiată de 10 mm (50 %): cel mult 2 mm de aldin; de 40 mm (200 %): 6 mm trec, peste o cincime din 20.
  assert.ok(bun({ aldin: 1.9, proportii: { latime: 100, inaltime: 50 } }) && !bun({ aldin: 2.5, proportii: { latime: 100, inaltime: 50 } }));
  assert.ok(bun({ aldin: 6, proportii: { latime: 100, inaltime: 200 } }) && !bun({ aldin: 6 }));
  assert.ok(bun({ unitate: 'pt' }) && bun({ unitate: 'in' }) && !bun({ unitate: 'mm' }));
  assert.ok(bun({ crenare: false }) && !bun({ crenare: true }));
  assert.equal(majusculaBloc({ inaltime: 20, proportii: { inaltime: 150 } }), 30);
  assert.equal(majusculaBloc({ inaltime: 20 }), 20);
});

// Mânerele (ADR 0138 §4): textul scalat neuniform față de textul așezat din nou cu blocul nou.
const docCu = (p: Piesa, rotire = 0): Document => {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese: [p], foi: [{ ...d.foi[0]!, instante: [{ id: 'i1', piesa: p.id, x: 50, y: 50, rotire }] }] };
};
function piesa(p: ParametriText, extra: Partial<BlocText> = {}): Piesa {
  const asezat = aseazaText(font(ROBOTO), p);
  const rez = piesaText(asezat, { ...p, ...(p.caseta ? { inaltime: asezat.inaltime } : {}), font: 'roboto', ...extra }, 'p1');
  if (!rez.ok) throw new Error(rez.motiv);
  return rez.piesa;
}
/** Toate numerele geometriei copiilor rădăcinii (matricele și vârfurile), în ordine. */
function numere(n: Nod, out: number[] = []): number[] {
  out.push(n.matrice.a, n.matrice.b, n.matrice.c, n.matrice.d, n.matrice.e, n.matrice.f);
  if (n.tip === 'element') {
    assert.equal(n.forma.tip, 'cale');
    if (n.forma.tip === 'cale') {
      for (const q of n.forma.varfuri) {
        out.push(q.p.x, q.p.y);
        if (q.s.tip === 'C') out.push(q.s.c1.x, q.s.c1.y, q.s.c2.x, q.s.c2.y);
      }
    }
  } else for (const c of n.copii) numere(c, out);
  return out;
}
const copii = (r: Nod): readonly Nod[] => (r.tip === 'grup' ? r.copii : [r]);
/** Parametrii așezării dintr-un bloc. */
const dinBloc = (b: BlocText): ParametriText => ({
  continut: b.continut, inaltime: b.caseta?.fel === 'limita' ? b.caseta.ceruta : b.inaltime, spatiere: b.spatiere, interlinie: b.interlinie,
  aliniere: b.aliniere, cursiv: b.cursiv, vertical: b.vertical, caseta: b.caseta, proportii: b.proportii, crenare: b.crenare,
  spatieri: b.spatieri,
});
// Spațierile literelor alese (ADR 0138 §5) pe „AVATAR To↵Hog”: A | V, T | A, H | o.
const alese = [{ dupa: 0, mm: 2 }, { dupa: 3, mm: -0.5 }, { dupa: 10, mm: 1 }] as const;

for (const [nume, p, sx, sy, rotire] of [
  ['orizontal, cu cursiv și spațiere, mai lat', { ...baza, spatiere: 0.4, cursiv: 12 }, 1.5, 1, 0],
  ['cu spațierile literelor alese, mai lat', { ...baza, spatieri: alese }, 1.6, 1, 0],
  ['vertical, cu spațierile literelor alese, mai înalt', { ...baza, vertical: true, aliniere: 'centru', spatieri: alese }, 1, 1.4, 0],
  ['cu proporții, crenarea oprită, mai înalt', { ...baza, crenare: false, proportii: { latime: 80, inaltime: 110 } }, 1, 1.7, 0],
  ['vertical, cu spațiere, mai îngust', { ...baza, vertical: true, spatiere: 0.5, aliniere: 'centru' }, 0.5, 1, 0],
  ['în casetă, mai lat', { ...baza, continut: 'HHH', caseta: { fel: 'scala', latime: 100, inaltime: 50 } }, 2, 1, 0],
  ['rotit cu 90°, mai lat pe foaie (deci mai înalt în piesă)', { ...baza, spatiere: 0.3 }, 1.4, 1, 90],
] as const) {
  test(`mânerele, scalare neuniformă (${nume}): textul rămâne text și e chiar textul așezat din nou cu blocul nou`, () => {
    const s = transforma(docCu(piesa(p), rotire), 0, ['i1'], { fel: 'scalare', sx, sy, ancora: { x: 0, y: 0 } });
    assert.ok(s.ok);
    const rad = s.piese[0]!.radacina;
    const b = blocText(rad);
    assert.ok(b, 'blocul rămâne');
    // În axele piesei: la 90°, lățimea foii e înălțimea piesei.
    const [lx, ly] = rotire === 90 ? [sy, sx] : [sx, sy];
    assert.ok(Math.abs(b.inaltime - (p.caseta ? b.inaltime : p.inaltime * ly)) < 1e-12);
    assert.ok(Math.abs((b.proportii?.latime ?? 100) - (p.proportii?.latime ?? 100) * (lx / ly)) < 1e-9);
    const din = piesaText(aseazaText(font(ROBOTO), dinBloc(b)), { ...b }, 'p1');
    assert.ok(din.ok);
    const a = copii(rad).flatMap((n) => numere(n)), c = copii(din.piesa.radacina).flatMap((n) => numere(n));
    assert.equal(a.length, c.length);
    const abatere = a.reduce((m, x, i) => Math.max(m, Math.abs(x - c[i]!)), 0);
    assert.ok(abatere < 1e-9, `abaterea ${abatere}`);
  });
}

test('mânerele: un text pe o curbă și unul care ar ieși din margini (cursivul peste 45°, procentele peste 1 000) devin vectori', () => {
  const f = font(ROBOTO);
  const cerc = { inchis: true, varfuri: [{ p: { x: 40, y: 0 }, s: { tip: 'A' as const, bulge: 1 } }, { p: { x: -40, y: 0 }, s: { tip: 'A' as const, bulge: 1 } }] };
  const curba = { s: 0, pozitie: 'baza' as const, distanta: 0, invers: false, orientare: 'rotita' as const, intinsa: false };
  const p: ParametriText = { ...baza, continut: 'LEMN', aliniere: 'centru' };
  const pe = aseazaPeCurba(aseazaText(f, p), { contur: cerc, ...curba }, 20, 'centru');
  assert.ok(pe);
  const rez = piesaText(pe, { ...p, font: 'roboto', curba: { ...cerc, ...curba } }, 'p1');
  assert.ok(rez.ok && blocText(rez.piesa.radacina));
  for (const [piesaVeche, sx] of [[rez.piesa, 1.5], [piesa({ ...baza, cursiv: 40 }), 2], [piesa({ ...baza, proportii: { latime: 900, inaltime: 100 } }), 1.5]] as const) {
    const s = transforma(docCu(piesaVeche), 0, ['i1'], { fel: 'scalare', sx, sy: 1, ancora: { x: 0, y: 0 } });
    assert.ok(s.ok);
    assert.equal(Object.hasOwn(s.piese[0]!.radacina, 'text'), false);
  }
});

test('mânerele: un text oglindit (matricea rădăcinii întoarsă) rămâne text la scalarea neuniformă', () => {
  const o = transforma(docCu(piesa({ ...baza, spatiere: 0.2 })), 0, ['i1'], { fel: 'oglindire', directie: 'orizontal', centru: { x: 50, y: 50 } });
  assert.ok(o.ok);
  const d = { ...docCu(o.piese[0]!), foi: [{ ...docCu(o.piese[0]!).foi[0]!, instante: o.instante.length ? [...o.instante] : docCu(o.piese[0]!).foi[0]!.instante }] };
  const s = transforma(d, 0, ['i1'], { fel: 'scalare', sx: 1.5, sy: 1, ancora: { x: 0, y: 0 } });
  assert.ok(s.ok);
  const b = blocText(s.piese[0]!.radacina);
  assert.ok(b);
  assert.ok(Math.abs(b.proportii!.latime - 150) < 1e-9 && Math.abs(b.spatiere - 0.3) < 1e-12);
});
