/**
 * Urechile la locuri alese (ADR 0211, felia 11.3↑d), pe hârtie:
 * - geometria: flancul fiecărei urechi din golul cel mai mic spre vecinele ei (ℓ_k = min(W / 2; 0,45·(g_k − W))), refuzul
 *   sub W / 0,9, pornirea în mijlocul celui mai lung gol, centrele față de pornire, zona în care bucla nu poate porni,
 *   proiecția unui punct pe buclă;
 * - lucrarea întreagă, pe exemplul ADR-ului: dreptunghiul 80 × 30 tăiat cu Ø3,175 pe foaia de 18 mm, cu urechile de 6 mm
 *   alese în (0, 15) și (80, 15), pe laturile scurte: palierele ies pe drumul frezei la x = −1,5875 și x = 81,5875, de la
 *   y = 12 la y = 18 (în coordonatele piesei), iar fiecare trecere pornește la mijlocul unei laturi lungi; aceleași locuri cu
 *   rampă, cu intrări și pe linie, cu direcția inversă; refuzurile, cu locul.
 * Programele fără mod (toate cele de până acum) rămân octet cu octet: plăcile de aur 1, 2 și 11 (`placa*.test.ts`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { lungimeBucla, punctLa } from '../../src/cam/parcurgere.ts';
import {
  centreDeLa, coloaneUrechi, geometrieUrechi, inZonaUrechii, noduriProfil, pornireInGol, proiectiePeBucla, urecheCareNuIncape, urechiPeBucla,
  zoneUrechi,
} from '../../src/cam/urechi.ts';
import { conturCerc, conturDreptunghi } from '../../src/geom/contur.ts';
import type { Document, Operatie, UrechiOperatie } from '../../src/model/document.ts';
import type { Miscare } from '../../src/ir/ir.ts';

const aproape = (a: number, b: number, e = 1e-9): boolean => Math.abs(a - b) <= e;

// ── Geometria, pe hârtie ──────────────────────────────────────────────────────────────────────

test('geometria alese: flancul fiecărei urechi din golul ei cel mai mic (P = 100, W = 10, centrele 10, 25, 70)', () => {
  // Pașii: 15, 45, 40 (de la 70, peste vârful 0, la 10); golurile: min(15, 40) = 15, min(45, 15) = 15, min(40, 45) = 40.
  const g = geometrieUrechi(100, { numar: 3, latime: 10, varf: 1, centre: [10, 25, 70] });
  assert.ok(typeof g === 'object');
  assert.deepEqual(g.centre, [10, 25, 70]);
  assert.equal(g.h, 5);
  // ℓ = min(5; 0,45·(15 − 10)) = 2,25 la primele două, min(5; 0,45·30) = 5 la a treia.
  assert.ok(aproape(g.flancuri[0] as number, 2.25) && aproape(g.flancuri[1] as number, 2.25) && g.flancuri[2] === 5, JSON.stringify(g.flancuri));
  const n = noduriProfil(100, { numar: 3, latime: 10, varf: 1, centre: [10, 25, 70] }, 2);
  assert.ok(Array.isArray(n));
  assert.deepEqual(n.map((x) => [Number(x.s.toFixed(9)), x.z]), [
    [0, -2], [2.75, -2], [5, -1], [15, -1], [17.25, -2], [17.75, -2], [20, -1], [30, -1], [32.25, -2], [60, -2], [65, -1], [75, -1], [80, -2], [100, -2],
  ]);
});

test('geometria alese: la distanțe egale, aceleași flancuri ca modul „egale”', () => {
  const P = 229.975, W = 6;
  const egale = geometrieUrechi(P, { numar: 4, latime: W, varf: 1 });
  assert.ok(typeof egale === 'object');
  const alese = geometrieUrechi(P, { numar: 4, latime: W, varf: 1, centre: egale.centre });
  assert.ok(typeof alese === 'object');
  for (const [k, l] of alese.flancuri.entries()) assert.ok(aproape(l, egale.l, 1e-12), `${k}: ${l} față de ${egale.l}`);
  assert.deepEqual(egale.flancuri, egale.centre.map(() => egale.l));
});

test('geometria alese: refuzul sub W / 0,9 între centre, și o ureche singură pe o buclă prea scurtă', () => {
  // W = 10: între centre, cel puțin 11,11 mm.
  assert.equal(urecheCareNuIncape(100, 10, [10, 20]), 0);
  assert.equal(urecheCareNuIncape(100, 10, [10, 21.2]), -1);
  assert.equal(urecheCareNuIncape(100, 10, [10, 30, 41]), 1);
  // Peste vârful 0: 95 și 5 sunt la 10 mm una de alta.
  assert.equal(urecheCareNuIncape(100, 10, [5, 50, 95]), 0);
  // Singură: bucla, cel puțin W / 0,9.
  assert.equal(urecheCareNuIncape(11, 10, [3]), 0);
  assert.equal(urecheCareNuIncape(11.2, 10, [3]), -1);
  const r = geometrieUrechi(100, { numar: 2, latime: 10, varf: 1, centre: [10, 20] });
  assert.ok(typeof r === 'string' && r.includes('prea apropiate'), String(r));
  const s = geometrieUrechi(11, { numar: 1, latime: 10, varf: 1, centre: [3] });
  assert.ok(typeof s === 'string' && s.includes('nu încape'), String(s));
});

test('zonele rampei și coloanele punților: cu flancul fiecărei urechi; coloanele alese stau pe loc', () => {
  const g = geometrieUrechi(100, { numar: 3, latime: 10, varf: 1, centre: [10, 25, 70] });
  assert.ok(typeof g === 'object');
  // Flancurile 2,25, 2,25 și 5 (proba de mai sus).
  assert.deepEqual(zoneUrechi(g).map(([a, b]) => [Number(a.toFixed(9)), Number(b.toFixed(9))]), [[2.75, 17.25], [17.75, 32.25], [60, 80]]);
  // Coloana: [c − h + R; c + h − R], lungă de 2h − D (R = 1,5, D = 3): la distanțe egale, de la pornirea s; alese, pe loc.
  assert.deepEqual(coloaneUrechi(g, 40, 1.5, 3, false), { inceputuri: [46.5, 61.5, 106.5], lungime: 7 });
  assert.deepEqual(coloaneUrechi(g, 40, 1.5, 3, true), { inceputuri: [6.5, 21.5, 66.5], lungime: 7 });
});

test('pornirea: în mijlocul celui mai lung gol, peste vârful 0 dacă e cazul; centrele, față de ea', () => {
  assert.equal(pornireInGol(100, [10, 25, 70]), 47.5);
  assert.equal(pornireInGol(100, [30]), 80);
  assert.equal(pornireInGol(100, [10, 40]), 75);
  assert.equal(pornireInGol(100, [60, 70]), 15);
  // La egalitate, primul gol.
  assert.equal(pornireInGol(100, [0, 50]), 25);
  assert.deepEqual(centreDeLa(100, [10, 25, 70], 47.5), [22.5, 62.5, 77.5]);
  assert.deepEqual(centreDeLa(100, [60, 70], 15), [45, 55]);
});

test('zona în care bucla nu poate porni: la mai puțin de h + ℓ de centrul unei urechi, de jur împrejur', () => {
  const g = geometrieUrechi(100, { numar: 2, latime: 10, varf: 1, centre: [10, 60] });
  assert.ok(typeof g === 'object');
  // h = 5, ℓ = min(5; 0,45·40) = 5: zonele (0, 20) și (50, 70).
  assert.equal(inZonaUrechii(g, 19.9, 100), true);
  assert.equal(inZonaUrechii(g, 20.1, 100), false);
  assert.equal(inZonaUrechii(g, 99.9, 100), false);
  assert.equal(inZonaUrechii(g, 0.5, 100), true);
  assert.equal(inZonaUrechii(g, 35, 100), false);
  // Peste vârful 0: centrul în 5, zona (−5, 15) cuprinde și 99,5.
  const w = geometrieUrechi(100, { numar: 2, latime: 10, varf: 1, centre: [5, 55] });
  assert.ok(typeof w === 'object');
  assert.equal(inZonaUrechii(w, 99.5, 100), true);
  assert.equal(inZonaUrechii(w, 84, 100), false);
});

test('proiecția pe buclă: cel mai apropiat punct, ca lungime de la vârful 0, pe linii și pe arce', () => {
  const p = conturDreptunghi(0, 0, 10, 10);
  assert.deepEqual(proiectiePeBucla(p, { x: 12, y: 5 }), { s: 15, d: 2 });
  assert.deepEqual(proiectiePeBucla(p, { x: 5, y: -3 }), { s: 5, d: 3 });
  // La egalitate (colțul de pornire e și capătul ultimei laturi), poziția cea mai mică: 0, nu 40.
  assert.deepEqual(proiectiePeBucla(p, { x: -1, y: -1 }), { s: 0, d: Math.SQRT2 });
  // Pe cerc, punctul de pe buclă e chiar cel spre care arată punctul dat.
  const c = conturCerc(0, 0, 10);
  const x = proiectiePeBucla(c, { x: 0, y: 20 });
  assert.ok(x && aproape(x.d, 10, 1e-9));
  const q = punctLa(c, x.s)?.p;
  assert.ok(q && aproape(q.x, 0, 1e-9) && aproape(q.y, 10, 1e-9), JSON.stringify(q));
  assert.ok(aproape(x.s, lungimeBucla(c) / 4, 1e-9));
});

test('urechile buclei j: la distanțe egale, aceleași; la locuri alese, centrele ei; fără nicio ureche, nimic', () => {
  const u = { numar: 4, latime: 6, varf: 16 };
  assert.equal(urechiPeBucla(u, 3), u);
  assert.equal(urechiPeBucla(undefined, 0), undefined);
  const a = { ...u, bucle: [[10, 50], []] };
  assert.deepEqual(urechiPeBucla(a, 0), { numar: 2, latime: 6, varf: 16, centre: [10, 50] });
  assert.equal(urechiPeBucla(a, 1), undefined);
  assert.equal(urechiPeBucla(a, 2), undefined);
});

// ── Lucrarea întreagă, pe exemplul ADR 0211 ─────────────────────────────────────────────────

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const X0 = 50, Y0 = 50;
const R = 3.175 / 2;
const urechiAlese = (locuri: Record<string, { x: number; y: number }[]>, v: Partial<UrechiOperatie> = {}): UrechiOperatie => (
  { numar: 2, latime: 6, grosime: 2, mod: 'alese', locuri, ...v }
);
const SCURTE = [{ x: 0, y: 15 }, { x: 80, y: 15 }];
function documentCu(op: Partial<Operatie>, forma: Document['piese'][number]['radacina'] = { tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { ...I } }): Document {
  return {
    schema: 32, rev: 0,
    piese: [{
      id: 'p', radacina: forma,
      operatii: [{
        id: 'x1', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'freza 1/8', diametru: 3.175 }, latura: 'exterior', sens: 'urcare',
        adancime: 18, pas: 6, urechi: urechiAlese({ e: SCURTE }), rampa: null, intrari: null, colturi: null, ...op,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p', x: X0, y: Y0, rotire: 0 }] }],
  };
}

type Palier = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly lungime: number };
/** Palierele (mișcările la Z = −vârf, în plan) și pornirile (XY-ul fiecărei plonjări de pe ultima trecere și de pe toate). */
function citeste(miscari: readonly Miscare[], varf: number): { readonly paliere: Palier[]; readonly porniri: { x: number; y: number; z: number }[] } {
  let x = 0, y = 0, z = 5;
  const paliere: Palier[] = [];
  const porniri: { x: number; y: number; z: number }[] = [];
  let curent: { x0: number; y0: number; x1: number; y1: number; lungime: number } | null = null;
  for (const m of miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const x1 = m.la.X ?? x, y1 = m.la.Y ?? y, z1 = m.la.Z ?? z;
    if (m.tip === 'taiere' && x1 === x && y1 === y && z1 < z && z1 < 0) porniri.push({ x, y, z: z1 });
    const pePalier = m.tip === 'taiere' && aproape(z, -varf) && aproape(z1, -varf) && Math.hypot(x1 - x, y1 - y) > 1e-9;
    if (pePalier) {
      const L = Math.hypot(x1 - x, y1 - y);
      if (curent && aproape(curent.x1, x) && aproape(curent.y1, y)) Object.assign(curent, { x1, y1, lungime: curent.lungime + L });
      else { curent = { x0: x, y0: y, x1, y1, lungime: L }; paliere.push(curent); }
    } else if (m.tip !== 'taiere' || !aproape(z1, -varf)) {
      curent = null;
    }
    x = x1; y = y1; z = z1;
  }
  return { paliere, porniri };
}

/** Palierul vertical de la x, de la y = Y0 + 12 la Y0 + 18 (oricare sens), lung de 6 mm. */
const palierLa = (p: Palier, x: number): boolean => aproape(p.x0, x, 1e-6) && aproape(p.x1, x, 1e-6)
  && aproape(Math.min(p.y0, p.y1), Y0 + 12, 1e-6) && aproape(Math.max(p.y0, p.y1), Y0 + 18, 1e-6) && aproape(p.lungime, 6, 1e-6);

test('lucrarea: urechile alese în (0, 15) și (80, 15) ies pe drumul frezei la x = −1,5875 și 81,5875, palierul de 6 mm pe verticală', () => {
  const r = programDinDocument(documentCu({}));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const { paliere, porniri } = citeste(r.program.miscari, 16);
  assert.equal(paliere.length, 2, JSON.stringify(paliere));
  assert.ok(paliere.some((p) => palierLa(p, X0 - R)), JSON.stringify(paliere));
  assert.ok(paliere.some((p) => palierLa(p, X0 + 80 + R)), JSON.stringify(paliere));
  // Trei treceri (6, 12, 18); fiecare pornește la mijlocul unei laturi lungi, departe de urechi.
  assert.equal(porniri.length, 3);
  for (const s of porniri) {
    assert.ok(aproape(s.x, X0 + 40, 1e-6) && (aproape(s.y, Y0 - R, 1e-6) || aproape(s.y, Y0 + 30 + R, 1e-6)), JSON.stringify(s));
  }
});

test('lucrarea: un element fără niciun loc ales n-are urechi, oricât ar cere numărul', () => {
  const r = programDinDocument(documentCu({ urechi: urechiAlese({}) }));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  assert.equal(citeste(r.program.miscari, 16).paliere.length, 0);
  // Nici refuzul urechilor groase cât foaia: fără urechi, nu se judecă.
  const g = programDinDocument(documentCu({ urechi: urechiAlese({}, { grosime: 20 }) }));
  assert.ok(g.ok, g.ok ? '' : g.motiv);
});

test('lucrarea: o ureche aleasă departe de contur cade pe cel mai apropiat punct al drumului', () => {
  // (−20, 15) e la stânga laturii scurte: tot pe ea, la x = −1,5875.
  const r = programDinDocument(documentCu({ urechi: urechiAlese({ e: [{ x: -20, y: 15 }] }) }));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const { paliere } = citeste(r.program.miscari, 16);
  assert.equal(paliere.length, 1);
  assert.ok(palierLa(paliere[0] as Palier, X0 - R), JSON.stringify(paliere));
});

test('lucrarea: aceleași locuri cu rampă, cu intrări și pe linie cu direcția inversă', () => {
  const cuRampa = programDinDocument(documentCu({ rampa: { lungime: 20 } }));
  assert.ok(cuRampa.ok, cuRampa.ok ? '' : cuRampa.motiv);
  const pr = citeste(cuRampa.program.miscari, 16).paliere;
  assert.ok(pr.some((p) => palierLa(p, X0 - R)) && pr.some((p) => palierLa(p, X0 + 80 + R)), JSON.stringify(pr));
  const cuIntrari = programDinDocument(documentCu({ intrari: { raza: 3 } }));
  assert.ok(cuIntrari.ok, cuIntrari.ok ? '' : cuIntrari.motiv);
  const pi = citeste(cuIntrari.program.miscari, 16).paliere;
  assert.ok(pi.some((p) => palierLa(p, X0 - R)) && pi.some((p) => palierLa(p, X0 + 80 + R)), JSON.stringify(pi));
  // Pe linie (drumul e chiar conturul), cu direcția inversă: urechile rămân pe laturile scurte.
  const inversa = programDinDocument(documentCu({ latura: 'pe-linie', directie: 'invers' }));
  assert.ok(inversa.ok, inversa.ok ? '' : inversa.motiv);
  const pl = citeste(inversa.program.miscari, 16).paliere;
  assert.ok(pl.some((p) => palierLa(p, X0)) && pl.some((p) => palierLa(p, X0 + 80)), JSON.stringify(pl));
  // Trei urechi pe latura de jos, la x = 10, 20 și 40 (goluri inegale: cu una sau două, bucla pornită în mijlocul celui mai
  // lung gol e simetrică față de ele, iar oglindirea nu schimbă nimic). Inversată, fiecare rămâne la locul ei.
  for (const directie of ['invers', undefined] as const) {
    const r = programDinDocument(documentCu({ latura: 'pe-linie', ...(directie ? { directie } : {}), urechi: urechiAlese({ e: [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }] }) }));
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    const ps = citeste(r.program.miscari, 16).paliere.map((q) => [Number(Math.min(q.x0, q.x1).toFixed(6)), Number(Math.max(q.x0, q.x1).toFixed(6)), Number(q.y0.toFixed(6))]);
    assert.deepEqual(ps.sort((a, b) => (a[0] as number) - (b[0] as number)), [[X0 + 7, X0 + 13, Y0], [X0 + 17, X0 + 23, Y0], [X0 + 37, X0 + 43, Y0]], `${directie ?? 'desen'}`);
  }
  // Asimetric: o singură ureche, pe latura de jos, la x = 20. Inversată, bucla pornește tot din vârful ei 0, deci poziția s
  // devine P − s: urechea rămâne în (20, 0), palierul orizontal de la x = 17 la x = 23, în ambele sensuri.
  for (const directie of ['invers', undefined] as const) {
    const r = programDinDocument(documentCu({ latura: 'pe-linie', ...(directie ? { directie } : {}), urechi: urechiAlese({ e: [{ x: 20, y: 0 }] }) }));
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    const ps = citeste(r.program.miscari, 16).paliere;
    assert.equal(ps.length, 1, `${directie ?? "desen"}: ${JSON.stringify(ps)}`);
    const p = ps[0] as Palier;
    assert.ok(aproape(p.y0, Y0, 1e-6) && aproape(p.y1, Y0, 1e-6) && aproape(Math.min(p.x0, p.x1), X0 + 17, 1e-6) && aproape(Math.max(p.x0, p.x1), X0 + 23, 1e-6), `${directie ?? "desen"}: ${JSON.stringify(p)}`);
  }
});

test('lucrarea: refuzurile spun locul (două urechi prea apropiate, una pe o buclă prea scurtă); regulile se taie, „unde ține” cere fundul foii', () => {
  const aproapeUna = programDinDocument(documentCu({ urechi: urechiAlese({ e: [{ x: 0, y: 14 }, { x: 0, y: 16 }] }) }));
  assert.ok(!aproapeUna.ok && aproapeUna.motiv.includes('prea apropiate') && aproapeUna.motiv.includes('lângă X'), aproapeUna.ok ? '' : aproapeUna.motiv);
  const cerc = { tip: 'element' as const, id: 'e', forma: { tip: 'cerc' as const, raza: 1 }, matrice: { ...I } };
  // Drumul are raza 1 + 1,5875: P = 16,26 mm; o ureche de 15 mm cere 16,67.
  const mica = programDinDocument(documentCu({ urechi: urechiAlese({ e: [{ x: 1, y: 0 }] }, { latime: 15 }) }, cerc));
  assert.ok(!mica.ok && mica.motiv.includes('nu încape') && mica.motiv.includes('lângă X'), mica.ok ? '' : mica.motiv);
  // Regulile pe laturi (11.3↑f) se taie și ele de acum (`urechi.laturi.test.ts`): niciun mod nu mai e refuzat ca „felie următoare”.
  for (const mod of ['lungi', 'scurte', 'mijloc'] as const) {
    const r = programDinDocument(documentCu({ urechi: { numar: 2, latime: 6, grosime: 2, mod } }));
    assert.ok(r.ok, r.ok ? mod : r.motiv);
  }
  // „Unde ține” (11.3↑e) se taie de acum, dar doar cu fundul foii (`programFoii`): direct, refuz, nu o tăietură fără urechi.
  const lemn = programDinDocument(documentCu({ urechi: { numar: 2, latime: 6, grosime: 2, mod: 'lemn' } }));
  assert.ok(!lemn.ok && lemn.motiv.includes('se socotesc pe fundul foii'), lemn.ok ? 'lemn' : lemn.motiv);
  // „egale” scris dă exact programul fără mod.
  const egale = programDinDocument(documentCu({ urechi: { numar: 2, latime: 6, grosime: 2, mod: 'egale' } }));
  const fara = programDinDocument(documentCu({ urechi: { numar: 2, latime: 6, grosime: 2 } }));
  assert.ok(egale.ok && fara.ok);
  assert.deepEqual(egale.program, fara.program);
});

/** Capătul primului arc de intrare (p₀, unde bucla pornește), din programul unei treceri cu intrări. */
function pornireaIntrarii(miscari: readonly Miscare[]): { x: number; y: number } {
  for (const m of miscari) if (m.tip === 'arc' && m.la.X !== undefined && m.la.Y !== undefined) return { x: m.la.X, y: m.la.Y };
  throw new Error('fără arc de intrare');
}

test('lucrarea: cu intrări, bucla nu pornește în zona unei urechi alese (în flancul ei, Z-ul n-ar fi adâncimea plină)', () => {
  // Urechile de 12 mm cu Ø3,175: palierul ±6, flancul 6, deci zona ±12; coloana punții, ±(6 − 1,5875), pe care intrarea o
  // ocolește oricum. Fără urechi, intrarea pornește din p₀; o ureche aleasă la 10 mm de el, pe latura lui, îl pune în flanc.
  const fara = programDinDocument(documentCu({ intrari: { raza: 3 }, urechi: urechiAlese({}, { latime: 12 }) }));
  assert.ok(fara.ok, fara.ok ? '' : fara.motiv);
  const p0 = pornireaIntrarii(fara.program.miscari);
  const peOrizontala = aproape(p0.y, Y0 - R, 1e-6) || aproape(p0.y, Y0 + 30 + R, 1e-6);
  const ureche = peOrizontala ? { x: p0.x + 10, y: p0.y } : { x: p0.x, y: p0.y + 10 };
  const cu = programDinDocument(documentCu({ intrari: { raza: 3 }, urechi: urechiAlese({ e: [{ x: ureche.x - X0, y: ureche.y - Y0 }] }, { latime: 12 }) }));
  assert.ok(cu.ok, cu.ok ? '' : cu.motiv);
  const q0 = pornireaIntrarii(cu.program.miscari);
  assert.ok(Math.hypot(q0.x - ureche.x, q0.y - ureche.y) >= 12 - 1e-6, `p₀ ${JSON.stringify(q0)}, urechea ${JSON.stringify(ureche)}`);
  // Palierul urechii e chiar acolo, lung de 12 mm.
  const { paliere } = citeste(cu.program.miscari, 16);
  assert.equal(paliere.length, 1, JSON.stringify(paliere));
  assert.ok(aproape((paliere[0] as Palier).lungime, 12, 1e-6), JSON.stringify(paliere));
});
