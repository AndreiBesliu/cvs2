/**
 * Căile deschise la ușa SVG și în piesa importului (ADR 0037 §11, a doua parte; sub-felia 2.3c-3), pe valori scrise pe
 * hârtie. Pagina de test are 100 × 50 mm, cu viewBox-ul în mm (`pagina`): y_mm = 50 − y_svg.
 * - ușa: subcăile fără Z cu `fill: none` și golul peste 0,01 mm, orice `line` și polilinia neumplută care nu se închide
 *   devin căi deschise (vârfurile plus punctul final, cu L); degenerata (sub 2 vârfuri distincte sau sub 0,01 mm) se sare,
 *   numărată; plafonul căii numără vârful final; nicio cale deschisă în imbricare sau în normalizarea `nonzero`;
 *   `stroke-width` nu se citește; `gol` = nicio cale; `deschise` numără căile importate;
 * - piesa: operația `deschise` (pe linie, min(1 mm, grosimea / 2) într-o trecere, urcare, freza foii, fără urechi, rampă,
 *   intrări și degajări), împărțită peste `PLAFON.noduriOperatie`, și prin acțiunea `document.importa`;
 * - fișierul real `CNC-referinta.svg`: valul de 150 mm e O cale deschisă, în `deschise`, iar programul lui pe linie trece
 *   de poartă (cu valorile de pe hârtie ale cubicei);
 * - pânza: săgeata de sens (vârful 0 și direcția desenului) doar pe căile deschise tăiate pe o parte (nu pe linie).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Dicționarele de bază vin la cerere (`t.ts`): testele care cer texte le încarcă întâi pe amândouă.
import './limbi.ts';
import { readFileSync } from 'node:fs';
import { listaDesen, directiaDeStart } from '../../src/app/desen.ts';
import { iesireDinFoaie } from '../../src/cam/iesire.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { traduce } from '../../src/i18n/t.ts';
import type { Contur, Varf } from '../../src/geom/contur.ts';
import { laturiDinImbricare } from '../../src/io/imbricare.ts';
import { adancimeDeschise, piesaDinImport, pregateste, type CaleImport } from '../../src/io/piesa.ts';
import { documentNou, PLAFON, type Document, type Piesa } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
// Calculul importului, al operațiilor și al panoului vine la cerere, cu ferestrele lor: aici, ca în ele, la evaluare.
import '../../src/ui/actiuniDocumentCalcul.ts';
import { poarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { citeste, pagina } from './ajutor-svg.ts';
import { servesteMesajele } from './ajutor-mesaje.ts';

const puncte = (v: readonly Varf[]) => v.map((x) => [+x.p.x.toFixed(9), +x.p.y.toFixed(9), x.s.tip]);

/** Citirea, cu căile ca (închisă?, vârfuri) și numerele raportului care contează aici. */
function usa(corp: string) {
  const r = citeste(pagina(corp));
  const av = r.avertismente;
  return {
    ok: r.ok,
    cod: r.ok ? null : r.cod,
    cai: r.ok ? r.cai.map((c) => ({ inchis: c.inchis, v: puncte(c.varfuri) })) : [],
    deschise: av?.deschise ?? 0,
    degenerate: av?.degenerate ?? 0,
    preaMari: av?.['prea-mari'] ?? 0,
    subRezolutie: av?.['sub-rezolutie'] ?? 0,
  };
}

// ── Ușa ───────────────────────────────────────────────────────────────────────────────────────────────────────────

test('ușa (§11): subcalea fără Z, cu fill none și golul de 53,85 mm, e o cale deschisă: vârfurile plus punctul final, cu L', () => {
  // (10,10)→(60,10)→(60,30) pe pagină = (10,40)→(60,40)→(60,20) în mm; golul (60,20)–(10,40) = √(50² + 20²) = 53,85 mm.
  const r = usa('<path fill="none" d="M10 10 L60 10 L60 30"/>');
  assert.equal(r.ok, true);
  assert.deepEqual(r.cai, [{ inchis: false, v: [[10, 40, 'L'], [60, 40, 'L'], [60, 20, 'L']] }]);
  assert.equal(r.deschise, 1);
  // Cu un arc (semicercul R10, trigonometric pe pagină → orar în mm, bulge −1) și o cubică: segmentele rămân, plus capătul.
  const a = usa('<path fill="none" d="M10 20 A10 10 0 0 1 30 20 C40 20 40 40 50 40"/>');
  assert.deepEqual(a.cai.map((c) => c.v.map((x) => x[2])), [['A', 'C', 'L']]);
  assert.deepEqual(a.cai[0]?.v.at(-1), [50, 10, 'L']);
});

test('ușa (§11): orice `line` e o cale deschisă (și umplută); polilinia neumplută care nu se închide, la fel; umplută, se închide', () => {
  const r = usa('<line x1="10" y1="10" x2="90" y2="10"/><line fill="red" x1="10" y1="20" x2="10" y2="45"/>');
  assert.deepEqual(r.cai, [
    { inchis: false, v: [[10, 40, 'L'], [90, 40, 'L']] },
    { inchis: false, v: [[10, 30, 'L'], [10, 5, 'L']] },
  ]);
  assert.equal(r.deschise, 2);
  const p = usa('<polyline fill="none" points="10,10 20,10 20,20"/><polyline points="30,10 40,10 40,20"/>');
  assert.deepEqual(p.cai.map((c) => [c.inchis, c.v.length]), [[false, 3], [true, 3]]);
  assert.equal(p.deschise, 1);
  // Polilinia neumplută care se închide singură (capătul în start) rămâne închisă.
  assert.deepEqual(usa('<polyline fill="none" points="10,10 20,10 20,20 10,10"/>').cai.map((c) => c.inchis), [true]);
});

test('ușa (§11): degenerata (sub 2 vârfuri distincte sau sub 0,01 mm pe curbă) se sare, numărată la `degenerate`', () => {
  // `line` de 0,009 mm: degenerată; de 0,011 mm: cale deschisă. Lungime 0: degenerată.
  const scurte = usa('<line x1="5" y1="5" x2="5.009" y2="5"/><line x1="5" y1="15" x2="5.011" y2="15"/><line x1="5" y1="25" x2="5" y2="25"/>');
  assert.deepEqual(scurte.cai.map((c) => c.v), [[[5, 35, 'L'], [5.011, 35, 'L']]]);
  assert.deepEqual([scurte.deschise, scurte.degenerate], [1, 2]);
  // O linie umplută fără Z: închiderea ar fi un dus-întors fără arie, deci rămâne deschisă; aceeași regulă a lungimii.
  const umplute = usa('<path d="M5 5 L5.009 5"/><path d="M5 15 L5.011 15"/>');
  assert.deepEqual(umplute.cai.map((c) => c.v), [[[5, 35, 'L'], [5.011, 35, 'L']]]);
  assert.deepEqual([umplute.deschise, umplute.degenerate], [1, 1]);
  // Pe curbă, nu pe coardă: un dus-întors coliniar umplut, cu golul 0,005 mm (sub prag), are 0,015 mm de lungime.
  const dusIntors = usa('<path d="M5 5 L5.01 5 L5.005 5"/>');
  assert.deepEqual([dusIntors.deschise, dusIntors.degenerate, dusIntors.cai.length], [1, 0, 1]);
});

test('ușa (§11): plafonul căii deschise numără vârful final (50 000 trec, 50 001 sunt prea multe)', () => {
  const zigzag = (n: number): string => Array.from({ length: n }, (_, i) => `${(i * 0.001).toFixed(3)},${i % 2}`).join(' ');
  // n puncte = n − 1 segmente desenate + vârful final = n vârfuri.
  const bun = usa(`<polyline fill="none" points="${zigzag(PLAFON.varfuriCale)}"/>`);
  assert.deepEqual([bun.cai.length, bun.cai[0]?.v.length, bun.cai[0]?.inchis, bun.preaMari], [1, PLAFON.varfuriCale, false, 0]);
  const mare = usa(`<polyline fill="none" points="${zigzag(PLAFON.varfuriCale + 1)}"/><line x1="0" y1="0" x2="1" y2="0"/>`);
  assert.deepEqual([mare.cai.length, mare.preaMari, mare.deschise], [1, 1, 1]);
});

test('ușa (§11): căile deschise nu intră în imbricare (U-ul din jurul pătratului nu-l face gaură) și nici în normalizarea nonzero', () => {
  const r = citeste(pagina('<path fill="none" d="M10 10 L10 40 L40 40 L40 10"/><rect x="20" y="20" width="10" height="10"/>'));
  assert.ok(r.ok);
  assert.deepEqual(laturiDinImbricare(r.cai), ['pe-linie', 'exterior']);
  // O formă umplută nonzero: două pătrate în același sens (se normalizează la exterior) și o linie fără arie (deschisă).
  const n = citeste(pagina('<path d="M0 0 H40 V40 H0 Z M10 10 H30 V30 H10 Z M50 5 L90 5"/>'));
  assert.ok(n.ok);
  assert.equal(n.avertismente['nonzero-normalizate'], 1);
  assert.deepEqual(n.cai.map((c) => c.inchis), [true, false]);
  assert.deepEqual(puncte(n.cai[1]?.varfuri ?? []), [[50, 45, 'L'], [90, 45, 'L']]);
  assert.equal(n.avertismente.deschise, 1);
  // O linie deschisă care trece prin pătrate nu le atinge normalizarea: pătratul ieșit are tot 4 vârfuri (citită ca o buclă
  // fără arie, i-ar tăia laturile în punctele de încrucișare). O `line` umplută, singură, nu se normalizează deloc.
  const x = citeste(pagina('<path d="M0 0 H40 V40 H0 Z M10 10 H30 V30 H10 Z M-10 20 L50 20"/><line x1="60" y1="5" x2="90" y2="5"/>'));
  assert.ok(x.ok);
  assert.deepEqual(x.cai.map((c) => [c.inchis, c.varfuri.length]), [[true, 4], [false, 2], [false, 2]]);
  assert.deepEqual(puncte(x.cai[0]?.varfuri ?? []).map((q) => [q[0], q[1]]).sort(), [[0, 10], [0, 50], [40, 10], [40, 50]]);
  assert.deepEqual([x.avertismente['nonzero-normalizate'], x.avertismente['nonzero-refuzate'], x.avertismente.deschise], [1, 0, 2]);
  // Fără normalizare (evenodd), ordinea subcăilor rămâne cea din fișier.
  const e = citeste(pagina('<path fill-rule="evenodd" d="M50 5 L90 5 M0 0 H40 V40 H0 Z"/>'));
  assert.ok(e.ok);
  assert.deepEqual(e.cai.map((c) => c.inchis), [false, true]);
});

test('ușa (§11): `stroke-width` nu se citește; refuzul `gol` înseamnă „nicio cale”: un fișier doar din linii se importă', () => {
  const subtire = citeste(pagina('<path fill="none" stroke-width="0.2" d="M10 10 L60 10"/>'));
  const gros = citeste(pagina('<path fill="none" style="stroke-width: 8" d="M10 10 L60 10"/>'));
  assert.ok(subtire.ok && gros.ok);
  assert.deepEqual(gros.cai, subtire.cai);
  assert.deepEqual(gros.avertismente, subtire.avertismente);
  const linii = usa('<line x1="0" y1="0" x2="10" y2="0"/><line x1="0" y1="5" x2="10" y2="5"/>');
  assert.deepEqual([linii.ok, linii.cai.length, linii.deschise], [true, 2, 2]);
  const nimic = usa('<line x1="0" y1="0" x2="0" y2="0"/>');
  assert.deepEqual([nimic.ok, nimic.cod, nimic.deschise, nimic.degenerate], [false, 'gol', 0, 1]);
});

test('textele noi (en + ro): numărul căilor deschise importate, sumarul, nota grosimii liniei, „gol”, descrierea din listă', async () => {
  const f = servesteMesajele();
  await import('../../src/i18n/import.ts').then((m) => m.gata).finally(() => { f.restaureaza(); });
  assert.equal(traduce('ro', 'import.deschise', { n: 1 }), '1 cale deschisă, tăiată pe linie: un canal de cel mult 1 mm (jumătate din foaie, dacă e mai subțire), într-o trecere');
  assert.equal(traduce('en', 'import.deschise', { n: 3 }), '3 open paths, cut on the line: a groove at most 1 mm deep (half the sheet, if thinner), in one pass');
  assert.equal(traduce('ro', 'import.grosime-linie'), 'Grosimea liniei din fișier nu contează: canalul are diametrul frezei.');
  assert.equal(traduce('en', 'import.grosime-linie'), 'The line width in the file does not count: the groove is as wide as the cutter.');
  assert.equal(traduce('ro', 'import.refuz.gol'), 'Fișierul n-are nicio cale de importat.');
  assert.equal(traduce('ro', 'import.av.deschise', { n: 1 }), '1 cale deschisă (fără Z de închidere, neumplută) importată ca linie, de tăiat pe linie');
  assert.equal(traduce('ro', 'forma.cale-deschisa', { n: 1, latime: '150.00', inaltime: '34.64', x: '160.00', y: '42.68' }), 'cale deschisă 150.00 × 34.64, 1 segment, la X 160.00, Y 42.68');
  assert.equal(traduce('en', 'forma.cale-deschisa', { n: 2, latime: '1.00', inaltime: '2.00', x: '0.00', y: '0.00' }), 'open path 1.00 × 2.00, 2 segments, at X 0.00, Y 0.00');
});

// ── Piesa ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const L = { tip: 'L' } as const;
const P = (x: number, y: number) => ({ x, y });
const patrat: CaleImport = { varfuri: [P(0, 0), P(10, 0), P(10, 10), P(0, 10)].map((p) => ({ p, s: L })) };
const linie = (y: number): CaleImport => ({ varfuri: [{ p: P(20, y), s: L }, { p: P(60, y), s: L }], inchis: false });

test('piesa (§11): operația `deschise` — pe linie, min(1, grosimea / 2) într-o trecere, urcare, freza foii, fără urechi / rampă / intrări / colțuri', () => {
  const date = { nume: 'p', cai: [patrat, linie(5), linie(8)], laturi: laturiDinImbricare([patrat, linie(5), linie(8)]), pagina: { latime: 100, inaltime: 100 } };
  const { piesa } = piesaDinImport(date, 'e1', undefined, 18);
  const [ext, desc] = piesa.operatii;
  assert.equal(piesa.operatii.length, 2);
  assert.deepEqual([ext?.id, ext?.latura, ext?.noduri, ext?.adancime, ext?.pas], ['exterior', 'exterior', ['c1'], 3, 3]);
  assert.deepEqual(desc, {
    id: 'deschise', tip: 'profil', noduri: ['c2', 'c3'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'pe-linie',
    sens: 'urcare', adancime: 1, pas: 1, urechi: null, rampa: null, intrari: null, colturi: null,
  });
  // Grosimea: 18 → 1 mm; 2 → 1 mm; 1,5 → 0,75 mm; fără grosime → 1 mm.
  assert.deepEqual([18, 2, 1.5].map(adancimeDeschise), [1, 1, 0.75]);
  assert.equal(adancimeDeschise(), 1);
  const subtire = piesaDinImport(date, 'e1', { numar: 2, nume: 'v', diametru: 3.175 }, 1.5).piesa.operatii[1];
  assert.deepEqual([subtire?.adancime, subtire?.pas, subtire?.scula.diametru, subtire?.scula.numar], [0.75, 0.75, 3.175, 2]);
  // Doar căi deschise: o singură operație, `deschise`. Piesa trece de ușa documentului.
  const doarLinii = piesaDinImport({ nume: 'l', cai: [linie(5)], laturi: ['pe-linie'], pagina: null }, 'e1', undefined, 18);
  assert.deepEqual(doarLinii.piesa.operatii.map((o) => o.id), ['deschise']);
  const u = incarca({ schema: 10, rev: 0, piese: [doarLinii.piesa], foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'e1', piesa: 'e1', x: 0, y: 0, rotire: 0 }] }] });
  assert.ok(u.ok, u.ok ? '' : u.motiv);
});

test('piesa (§11): `deschise` se împarte la plafonul nodurilor unei operații (10 000), ca exteriorul: `deschise-2`', () => {
  const cai = Array.from({ length: PLAFON.noduriOperatie + 1 }, (_, i) => linie(i * 0.1));
  const { piesa } = piesaDinImport({ nume: 'm', cai, laturi: cai.map(() => 'pe-linie' as const), pagina: null }, 'e1', undefined, 18);
  assert.deepEqual(piesa.operatii.map((o) => [o.id, o.noduri.length, o.noduri[0]]), [['deschise', 10_000, 'c1'], ['deschise-2', 1, 'c10001']]);
});

test('acțiunea `document.importa`: piesa o face constructorul adus cu importul, cu grosimea și freza foii de atunci', () => {
  const registru = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const importa = (doc: Document): Piesa => {
    let h: Istoric = istoricNou(doc);
    const ctx: ContextDocument = {
      istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => [], selecteaza: () => undefined,
      importNou: () => pregateste({ nume: 'x', cai: [patrat, linie(5)], laturi: ['exterior', 'pe-linie'], pagina: null }),
    };
    ruleaza(registru, 'document.importa', ctx);
    const p = h.doc.piese.at(-1);
    assert.ok(p);
    return p;
  };
  const gros = importa(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  assert.deepEqual(gros.operatii.map((o) => [o.id, o.latura, o.adancime, o.pas]), [['exterior', 'exterior', 3, 3], ['deschise', 'pe-linie', 1, 1]]);
  const subtire = importa(documentNou({ latime: 300, inaltime: 200, grosime: 1.2 }));
  assert.deepEqual(subtire.operatii.map((o) => [o.id, o.adancime, o.pas]), [['exterior', 3, 3], ['deschise', 0.6, 0.6]]);
  // Freza foii: o piesă deja tăiată cu Ø3,175 o dă și operației căilor deschise.
  const cuFreza = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const scula = { numar: 3, nume: 'v', diametru: 3.175 };
  const alta: Piesa = {
    id: 'e1', radacina: { tip: 'element', id: 'e1', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
    operatii: [{ id: 'e1', tip: 'profil', noduri: ['e1'], scula, latura: 'interior', sens: 'urcare', adancime: 8, pas: 4, urechi: null, rampa: null, intrari: null, colturi: null }],
  };
  const doc: Document = { ...cuFreza, piese: [alta], foi: cuFreza.foi.map((f) => ({ ...f, instante: [{ id: 'e1', piesa: 'e1', x: 50, y: 50, rotire: 0 }] })) };
  assert.deepEqual(importa(doc).operatii.map((o) => [o.id, o.scula.diametru, o.scula.numar]), [['exterior', 3.175, 3], ['deschise', 3.175, 3]]);
});

// ── Fișierul real: valul din CNC-referinta.svg ───────────────────────────────────────────────────────────────────────

const REFERINTA = readFileSync('docs/faza2/sonde/s2-export-import/pachet-owner/CNC-referinta.svg', 'utf8');

/** Importul fișierului real, ca acțiunea: piesa `e1` pe o foaie de W × H × 18, cu instanța în colțul desenului. */
function documentReferinta(W: number, H: number, operatii?: (p: Piesa) => Piesa['operatii']): Document {
  const r = citeste(REFERINTA);
  assert.ok(r.ok, r.ok ? '' : r.cod);
  const { piesa, x, y } = piesaDinImport({ nume: 'CNC-referinta', cai: r.cai, laturi: laturiDinImbricare(r.cai), pagina: r.pagina }, 'e1', undefined, 18);
  const p = operatii ? { ...piesa, operatii: operatii(piesa) } : piesa;
  const u = incarca(JSON.parse(JSON.stringify({ schema: 10, rev: 0, piese: [p], foi: [{ id: 'f1', stoc: { latime: W, inaltime: H, grosime: 18 }, instante: [{ id: 'e1', piesa: 'e1', x, y, rotire: 0 }] }] })));
  assert.ok(u.ok, u.ok ? '' : u.motiv);
  return u.doc;
}

/**
 * Programul aplicației (CAM + post GRBL 1.1, stânga-jos, Z0 sus, cu ieșirea din foaie confirmată, ca în dialog) și
 * verdictul porții, cu regiunea din document.
 */
function programSiPoarta(doc: Document, pas: number): { text: string; incalcari: ReturnType<typeof poarta>; miscari: ReturnType<typeof programDinDocument> } {
  const j = programDinDocument(doc);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  const stoc = doc.foi[0]?.stoc ?? { latime: 0, inaltime: 0, grosime: 0 };
  const iesire = iesireDinFoaie(j.program, { latime: stoc.latime, inaltime: stoc.inaltime });
  const p = posteaza(j.program, { foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, {
    asteptareAx: 3, ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
  });
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  const incalcari = poarta(p.text, {
    foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as unknown as Parameters<typeof regiuneDinDocument>[0]),
  });
  return { text: p.text, incalcari, miscari: j };
}

test('CNC-referinta.svg: valul de 150 mm (stratul GRAVARE, fill none) e O cale deschisă: (160,60) C (210,120) (260,0) → (310,60), în `deschise`', () => {
  const r = citeste(REFERINTA);
  assert.ok(r.ok);
  const deschise = r.cai.filter((c) => !c.inchis);
  assert.equal(deschise.length, 1);
  assert.equal(r.avertismente.deschise, 1);
  // Pe pagină: M160,240 C210,180 260,300 310,240, cu y_mm = 300 − y.
  assert.deepEqual(deschise[0]?.varfuri, [
    { p: { x: 160, y: 60 }, s: { tip: 'C', c1: { x: 210, y: 120 }, c2: { x: 260, y: 0 } } },
    { p: { x: 310, y: 60 }, s: { tip: 'L' } },
  ]);
  const laturi = laturiDinImbricare(r.cai);
  const { piesa } = piesaDinImport({ nume: 'CNC-referinta', cai: r.cai, laturi, pagina: r.pagina }, 'e1', undefined, 18);
  const k = r.cai.findIndex((c) => !c.inchis);
  const op = piesa.operatii.find((o) => o.id === 'deschise');
  assert.deepEqual([op?.noduri, op?.latura, op?.adancime, op?.pas], [[`c${k + 1}`], 'pe-linie', 1, 1]);
  // Celelalte 11 căi sunt închise și rămân în exterior / interior.
  assert.deepEqual(piesa.operatii.map((o) => [o.id, o.noduri.length]), [['exterior', 10], ['interior', 1], ['deschise', 1]]);
});

test('CNC-referinta.svg, exportul valului pe linie: plonjarea în (160, 60) la −1, o trecere, capătul în (310, 60); poarta trece', () => {
  const doc = documentReferinta(400, 300, (p) => p.operatii.filter((o) => o.id === 'deschise'));
  const { text, incalcari, miscari } = programSiPoarta(doc, 1);
  assert.deepEqual(incalcari, []);
  assert.ok(miscari.ok);
  const m = miscari.program.miscari;
  const i = m.findIndex((x) => x.tip === 'eticheta' && x.element?.endsWith('/c4'));
  assert.ok(i >= 0);
  assert.match(text, /\(e1\/c4: cale, pe-linie, 1 mm\)\nG0 X160\.000 Y60\.000\nG1 Z-1\.000 F300\.0\n/);
  // O singură plonjare (o trecere de 1 mm) și ultimul punct de tăiere chiar capătul valului.
  const taieri = m.slice(i + 1).filter((x) => x.tip === 'taiere' || x.tip === 'arc');
  assert.equal(taieri.filter((x) => x.la.Z !== undefined).length, 1);
  const ultima = taieri.at(-1);
  assert.ok(Math.abs((ultima?.la.X ?? 0) - 310) <= 1e-9 && Math.abs((ultima?.la.Y ?? 0) - 60) <= 1e-9, JSON.stringify(ultima));
  assert.match(text, /X310\.000 Y60\.000[^\n]*\nG0 Z5\.000\n/);
  // Hârtia cubicei: x(t) = 160 + 150 t (mânerele la pași egali); y'(t) = 0 la t = 1/2 ∓ √3/6, deci creasta (191,699; 77,321)
  // și valea (278,301; 42,679), adică y = 60 ± 10√3. Traseul (arcele biarcelor, eșantionate) le atinge la 0,002 mm.
  let pozitie = { x: 160, y: 60 };
  let sus = { x: 0, y: -Infinity }, jos = { x: 0, y: Infinity };
  for (const x of taieri) {
    const tinta = { x: x.la.X ?? pozitie.x, y: x.la.Y ?? pozitie.y };
    const pct: Array<{ x: number; y: number }> = [tinta];
    if (x.tip === 'arc') {
      const r = Math.hypot(pozitie.x - x.centru.x, pozitie.y - x.centru.y);
      const a0 = Math.atan2(pozitie.y - x.centru.y, pozitie.x - x.centru.x);
      let da = Math.atan2(tinta.y - x.centru.y, tinta.x - x.centru.x) - a0;
      if (x.sens === 'trigonometric' && da < 0) da += 2 * Math.PI;
      if (x.sens !== 'trigonometric' && da > 0) da -= 2 * Math.PI;
      for (let k = 1; k < 200; k++) pct.push({ x: x.centru.x + r * Math.cos(a0 + (da * k) / 200), y: x.centru.y + r * Math.sin(a0 + (da * k) / 200) });
    }
    for (const q of pct) {
      if (q.y > sus.y) sus = q;
      if (q.y < jos.y) jos = q;
    }
    pozitie = tinta;
  }
  const creasta = 60 + 10 * Math.sqrt(3), vale = 60 - 10 * Math.sqrt(3);
  assert.ok(Math.abs(sus.y - creasta) <= 0.002 && Math.abs(sus.x - (160 + 150 * (0.5 - Math.sqrt(3) / 6))) <= 0.5, JSON.stringify(sus));
  assert.ok(Math.abs(jos.y - vale) <= 0.002 && Math.abs(jos.x - (160 + 150 * (0.5 + Math.sqrt(3) / 6))) <= 0.5, JSON.stringify(jos));
});

test('CNC-referinta.svg, tot fișierul cu exterioarele și interioarele trecute pe linie (ca în e2e): programul trece de poartă', () => {
  // Pe exterior, literele stau prea aproape pentru Ø6 (regiunea refuză, cu motiv): de aceea e2e-ul le trece pe linie.
  const exterior = documentReferinta(400, 300);
  const j = programDinDocument(exterior);
  assert.ok(!j.ok && j.motiv.startsWith('regiunea păstrată:'), j.ok ? 'trebuia refuzat' : j.motiv);
  // Pe foaia paginii (400 × 300) și pe foaia implicită a aplicației (300 × 200, cu ieșirea din foaie confirmată).
  for (const [W, H] of [[400, 300], [300, 200]] as const) {
    const doc = documentReferinta(W, H, (p) => p.operatii.map((o) => ({ ...o, latura: 'pe-linie' })));
    const { incalcari, text } = programSiPoarta(doc, 3);
    assert.deepEqual(incalcari, [], `${W} × ${H}`);
    assert.ok(text.includes('\n(e1/c4: cale, pe-linie, 1 mm)\nG0 X160.000 Y60.000\nG1 Z-1.000 F300.0\n'), `${W} × ${H}`);
  }
});

// ── Pânza: săgeata de sens ───────────────────────────────────────────────────────────────────────────────────────

test('pânza (§12): săgeata stă în vârful 0, în sensul desenului — linia, arcul, cubica; doar pe căile deschise tăiate pe o parte', () => {
  const c = (varfuri: Varf[]): Contur => ({ inchis: false, varfuri });
  const aproape = (d: { ux: number; uy: number } | null, ux: number, uy: number): void => {
    assert.ok(d && Math.abs(d.ux - ux) < 1e-12 && Math.abs(d.uy - uy) < 1e-12, JSON.stringify(d));
  };
  aproape(directiaDeStart(c([{ p: P(10, 50), s: L }, { p: P(110, 50), s: L }])), 1, 0);
  // Semicercul R50 trigonometric (50,0)→(−50,0), bulge 1: tangenta în start e +y; orar (bulge −1), −y.
  aproape(directiaDeStart(c([{ p: P(50, 0), s: { tip: 'A', bulge: 1 } }, { p: P(-50, 0), s: L }])), 0, 1);
  aproape(directiaDeStart(c([{ p: P(50, 0), s: { tip: 'A', bulge: -1 } }, { p: P(-50, 0), s: L }])), 0, -1);
  // Valul: primul mâner (210,120) − (160,60) = (50, 60), deci (5, 6)/√61; cu mânerul retras în start, al doilea.
  aproape(directiaDeStart(c([{ p: P(160, 60), s: { tip: 'C', c1: P(210, 120), c2: P(260, 0) } }, { p: P(310, 60), s: L }])), 5 / Math.sqrt(61), 6 / Math.sqrt(61));
  aproape(directiaDeStart(c([{ p: P(0, 0), s: { tip: 'C', c1: P(0, 0), c2: P(0, 10) } }, { p: P(10, 10), s: L }])), 0, 1);
  assert.equal(directiaDeStart(c([{ p: P(0, 0), s: L }])), null);
  // Pe linie (operația implicită a liniilor importate), săgeata nu apare: sensul nu schimbă tăietura (decizia owner-ului,
  // 13.10).
  const doc = documentReferinta(400, 300);
  assert.equal(listaDesen(doc).filter((f) => f.sageata).length, 0);
  // Pe o parte (stânga): săgeata apare doar pe calea deschisă, în lume (cu instanța).
  const peParte = {
    ...doc,
    piese: doc.piese.map((q) => ({ ...q, operatii: q.operatii.map((o) => (o.id === 'deschise' ? { ...o, latura: 'stanga' as const } : o)) })),
  };
  const forme = listaDesen(peParte);
  const cuSageata = forme.filter((f) => f.sageata);
  assert.equal(cuSageata.length, 1);
  assert.equal(cuSageata[0]?.id, 'e1/c4');
  const s = cuSageata[0]?.sageata;
  assert.ok(s && Math.abs(s.x - 160) < 1e-9 && Math.abs(s.y - 60) < 1e-9 && Math.abs(s.ux - 5 / Math.sqrt(61)) < 1e-12);
  // Calea deschisă se desenează fără Z (fără linia de închidere).
  assert.ok(!cuSageata[0]?.cale.some((k) => k.t === 'Z'));
  // Liniuța: partea frezei pe foaie, față de săgeată (recenzia B, ADR 0037 §12): stânga = 1, dreapta = −1; sub o oglindire
  // a grupului, partea pe foaie se inversează, cu aceeași funcție ca în CAM.
  assert.equal(s?.parte, 1);
  const cuLatura = (latura: 'stanga' | 'dreapta', a: number) => ({
    ...doc,
    piese: doc.piese.map((q) => ({
      ...q,
      radacina: { ...q.radacina, matrice: { ...q.radacina.matrice, a } },
      operatii: q.operatii.map((o) => (o.id === 'deschise' ? { ...o, latura } : o)),
    })),
  });
  const parte = (latura: 'stanga' | 'dreapta', a: number) => listaDesen(cuLatura(latura, a)).find((f) => f.sageata)?.sageata?.parte;
  assert.deepEqual([parte('stanga', 1), parte('dreapta', 1), parte('stanga', -1), parte('dreapta', -1)], [1, -1, -1, 1]);
});
