/**
 * Buzunarul (ADR 0069): inelele pe hârtie, ordinea, legăturile, refuzurile lucrării, ușa v11 și, pe G-code-ul exportat,
 * oracolul simulării (independent, `test/oracles/simulare.ts`): materialul e scos peste tot unde ajunge discul frezei
 * (deschiderea conturului) și nicăieri în afara conturului. Poarta (fără regiune) judecă pasul pe trecere și rapidele.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EPS_LEGATURA, ineleBuzunar, legaturaInBuzunar, ordineInele, pozitiaCeaMaiApropiata, traseuBuzunar,
} from '../../src/cam/buzunar.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { regiunePastrata } from '../../src/cam/regiune.ts';
import { arc, arieCuSemn, LINIE, type Contur } from '../../src/geom/contur.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { taieturiFoaie } from '../../src/model/lume.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { judeca } from '../oracles/simulare.ts';
import { poarta } from '../oracles/poarta.ts';

const drept = (x0: number, y0: number, w: number, h: number): Contur => ({
  inchis: true,
  varfuri: [{ p: { x: x0, y: y0 }, s: LINIE }, { p: { x: x0 + w, y: y0 }, s: LINIE }, { p: { x: x0 + w, y: y0 + h }, s: LINIE }, { p: { x: x0, y: y0 + h }, s: LINIE }],
});
const cerc = (cx: number, cy: number, r: number): Contur => ({
  inchis: true, varfuri: [{ p: { x: cx + r, y: cy }, s: arc(1) }, { p: { x: cx - r, y: cy }, s: arc(1) }],
});

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 };
type Forma = Record<string, unknown>;
type Op = Record<string, unknown>;
const buzunar = (noduri: string[], extra: Op = {}): Op => ({
  id: 'b', tip: 'buzunar', pasLateral: 2.4, noduri, scula: { ...SCULA }, latura: 'interior', sens: 'urcare', adancime: 6, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
const profil = (id: string, nod: string, latura: string, extra: Op = {}): Op => ({
  id, tip: 'profil', noduri: [nod], scula: { ...SCULA }, latura, sens: 'urcare', adancime: 18, pas: 6,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
/** Un document v11 cu o piesă (elementele date, cu matricele lor) și operațiile ei, la (x, y) pe o foaie de 200 × 150 × 18. */
function doc(elemente: ReadonlyArray<{ id: string; forma: Forma; e?: number; f?: number }>, operatii: Op[], x = 0, y = 0): unknown {
  const noduri = elemente.map((el) => ({ tip: 'element', id: el.id, matrice: { ...I, e: el.e ?? 0, f: el.f ?? 0 }, forma: el.forma }));
  const radacina = noduri.length === 1 ? noduri[0] : { tip: 'grup', id: 'g', matrice: { ...I }, copii: noduri };
  return {
    schema: 11, rev: 0, piese: [{ id: 'p', radacina, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x, y, rotire: 0 }] }],
  };
}
const DREPT = { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 };
const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};

test('inelele pe hârtie: dreptunghiul 100 × 60 cu Ø6 și pasul 2,4 dă 12 inele, la 3 + 2,4·k, ultimul 41,2 × 1,2', () => {
  const r = ineleBuzunar(drept(0, 0, 100, 60), 3, 2.4);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.numar, 12);
  const o = ordineInele(r.radacini);
  // Dinăuntru în afară: un singur lanț, de la 29,4 la 3 (31,8 > 30, jumătatea lățimii: acolo freza nu mai încape).
  assert.deepEqual(o.map((x) => Number(x.d.toFixed(6))), [29.4, 27, 24.6, 22.2, 19.8, 17.4, 15, 12.6, 10.2, 7.8, 5.4, 3]);
  const xs = o[0]!.bucla.varfuri.map((v) => v.p.x), ys = o[0]!.bucla.varfuri.map((v) => v.p.y);
  assert.ok(Math.abs(Math.min(...xs) - 29.4) < 1e-9 && Math.abs(Math.max(...xs) - 70.6) < 1e-9);
  assert.ok(Math.abs(Math.min(...ys) - 29.4) < 1e-9 && Math.abs(Math.max(...ys) - 30.6) < 1e-9);
  // Peretele: dreptunghiul de 94 × 54, în sens trigonometric (materialul de scos în dreapta mersului).
  const perete = o[o.length - 1]!.bucla;
  assert.ok(Math.abs(arieCuSemn(perete) - 94 * 54) < 1e-6);
});

test('inelele pe hârtie: cercul R20 cu Ø6 și pasul 3 dă cercurile de raze 17, 14, 11, 8, 5, 2', () => {
  const r = ineleBuzunar(cerc(0, 0, 20), 3, 3);
  assert.ok(r.ok);
  if (!r.ok) return;
  const raze = ordineInele(r.radacini).map((x) => Math.hypot(x.bucla.varfuri[0]!.p.x, x.bucla.varfuri[0]!.p.y));
  assert.deepEqual(raze.map((x) => Number(x.toFixed(6))), [2, 5, 8, 11, 14, 17]);
});

test('refuzurile inelelor: freza care nu încape, pasul peste rază, calea deschisă', () => {
  assert.deepEqual(ineleBuzunar(drept(0, 0, 5, 40), 3, 2.4), { ok: false, motiv: 'freza (Ø6) nu încape în buzunar' });
  const peste = ineleBuzunar(drept(0, 0, 50, 50), 3, 3.01);
  assert.ok(!peste.ok && /pasul lateral de 3.01 mm trebuie să fie în \(0, 3\]/.test(peste.motiv));
  const linie: Contur = { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: LINIE }, { p: { x: 10, y: 0 }, s: LINIE }] };
  assert.deepEqual(ineleBuzunar(linie, 3, 2), { ok: false, motiv: 'un buzunar cere un contur închis' });
});

test('gantera cu gâtul mai îngust decât freza: două rădăcini, ridicare între ele; cu gâtul lat, o rădăcină care se desparte', () => {
  // Două pătrate de 40 legate printr-un gât de 30 × w, la mijloc.
  const gantera = (w: number): Contur => {
    const y0 = 20 - w / 2, y1 = 20 + w / 2;
    const v = [[0, 0], [40, 0], [40, y0], [70, y0], [70, 0], [110, 0], [110, 40], [70, 40], [70, y1], [40, y1], [40, 40], [0, 40]];
    return { inchis: true, varfuri: v.map(([x, y]) => ({ p: { x: x!, y: y! }, s: LINIE })) };
  };
  const ingust = ineleBuzunar(gantera(4), 3, 2.4);
  assert.ok(ingust.ok && ingust.radacini.length === 2);
  const lat = ineleBuzunar(gantera(10), 3, 2.4);
  // Gâtul de 10 mm: la 3 mm de contur, centrul frezei trece pe 4 mm; la 5,4 mm, gâtul dispare și inelul se desparte în două.
  assert.ok(lat.ok && lat.radacini.length === 1 && lat.radacini[0]!.copii.length === 2);
  if (!ingust.ok || !lat.ok) return;
  const p = { zSigur: 5, avans: 1000, avansPlonjare: 300, sens: 'urcare' as const, raza: 3, adancimi: [3] };
  const plonjari = (m: readonly Miscare[]) => m.filter((x) => x.tip === 'taiere' && x.la.Z !== undefined && x.la.X === undefined).length;
  const a = traseuBuzunar(gantera(4), ordineInele(ingust.radacini), p);
  assert.ok(a.ok && plonjari(a.miscari) === 2, 'o coborâre în fiecare pătrat');
  // Fiecare legătură la adâncime rămâne în buzunar (discul la cel puțin R − ε de perete).
  for (const [c, r] of [[gantera(4), a], [gantera(10), traseuBuzunar(gantera(10), ordineInele(lat.radacini), p)]] as const) {
    assert.ok(r.ok);
    if (!r.ok) continue;
    let la: { x: number; y: number } | null = null;
    for (let k = 0; k < r.miscari.length; k++) {
      const m: Miscare = r.miscari[k]!;
      if (m.tip === 'rapida') { if (m.la.X !== undefined) la = { x: m.la.X, y: m.la.Y! }; continue; }
      if ((m.tip === 'taiere' || m.tip === 'arc') && m.la.X !== undefined && la) {
        if (m.tip === 'taiere') assert.ok(legaturaInBuzunar(la, { x: m.la.X, y: m.la.Y! }, c, 3), `mișcarea ${k} iese din buzunar`);
        la = { x: m.la.X, y: m.la.Y! };
      }
    }
  }
});

test('poziția cea mai apropiată, pe linii și pe arce; legătura care trece prin perete nu rămâne la adâncime', () => {
  const d = drept(0, 0, 10, 10);
  assert.equal(pozitiaCeaMaiApropiata(d, { x: 4, y: -3 }), 4);
  assert.equal(pozitiaCeaMaiApropiata(d, { x: 13, y: 7 }), 17);
  const c = cerc(0, 0, 5);
  // Pe cerc, la 90° de vârful 0: un sfert din 10π.
  assert.ok(Math.abs(pozitiaCeaMaiApropiata(c, { x: 0, y: 9 }) - (Math.PI * 5) / 2) < 1e-9);
  const L: Contur = { inchis: true, varfuri: [[0, 0], [60, 0], [60, 20], [20, 20], [20, 60], [0, 60]].map(([x, y]) => ({ p: { x: x!, y: y! }, s: LINIE })) };
  assert.equal(legaturaInBuzunar({ x: 10, y: 10 }, { x: 50, y: 10 }, L, 3), true);
  assert.equal(legaturaInBuzunar({ x: 50, y: 10 }, { x: 10, y: 50 }, L, 3), false, 'taie colțul interior');
  assert.equal(legaturaInBuzunar({ x: 10, y: 3 }, { x: 50, y: 3 + EPS_LEGATURA / 2 }, L, 3), true, 'la R − ε/2 de perete');
  assert.equal(legaturaInBuzunar({ x: 10, y: 2.99 }, { x: 50, y: 2.99 }, L, 3), false, 'la R − 0,01 de perete');
});

test('pragul de topologie: dreptunghiul 40 × 30 cu pasul 2,4 are inelul 6 exact la 15 mm (o linie): îl ia la 14,999 mm', () => {
  const r = ineleBuzunar(drept(0, 0, 40, 30), 3, 2.4);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const o = ordineInele(r.radacini);
  assert.deepEqual(o.map((x) => Number(x.d.toFixed(6))), [14.999, 12.6, 10.2, 7.8, 5.4, 3]);
  const ys = o[0]!.bucla.varfuri.map((v) => v.p.y);
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 0.002) < 1e-9, 'inelul degenerat are 0,002 mm');
});

test('sensul: urcarea taie inelele trigonometric, opoziția orar', () => {
  const r = ineleBuzunar(drept(0, 0, 40, 30), 3, 2.4);
  assert.ok(r.ok);
  if (!r.ok) return;
  const o = ordineInele(r.radacini);
  for (const sens of ['urcare', 'opozitie'] as const) {
    const t = traseuBuzunar(drept(0, 0, 40, 30), o, { zSigur: 5, avans: 1000, avansPlonjare: 300, sens, raza: 3, adancimi: [3] });
    assert.ok(t.ok);
    if (!t.ok) continue;
    // Ultimul inel (peretele): cele 4 colțuri, după ultima legătură.
    const colturi = t.miscari.filter((m) => m.tip === 'taiere' && m.la.X !== undefined).slice(-4).map((m) => (m.tip === 'taiere' ? { x: m.la.X!, y: m.la.Y! } : { x: 0, y: 0 }));
    const arie = colturi.reduce((s, p, i) => { const q = colturi[(i + 1) % colturi.length]!; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
    assert.ok(sens === 'urcare' ? arie > 0 : arie < 0, `${sens}: aria ${arie}`);
  }
});

test('ușa v11 judecă felul și pasul lateral (un număr în (0, 50]); potrivirea buzunarului o refuză lucrarea, cu motiv', () => {
  deschis(doc([{ id: 'e', forma: DREPT }], [buzunar(['e'])]));
  assert.equal(operatieInMargini(buzunar(['e'])), true);
  for (const rau of [{ pasLateral: 0 }, { pasLateral: -1 }, { pasLateral: 50.01 }, { pasLateral: '2' }, { pasLateral: Number.NaN }, { tip: 'gaurire' }]) {
    assert.equal(operatieInMargini(buzunar(['e'], rau)), false, JSON.stringify(rau));
  }
  // ADR 0069 §1 (ca latura unei căi deschise, ADR 0037 §2): proiectul se deschide, exportul spune ce nu se potrivește.
  const IMPOTRIVA = 'i/e: un buzunar stă înăuntrul conturului, fără urechi, rampă, intrări, degajări sau despărțire';
  for (const nepotrivit of [
    { latura: 'exterior' }, { urechi: { numar: 2, latime: 8, grosime: 2 } }, { rampa: { lungime: 10 } }, { intrari: { raza: 3 } },
    { colturi: { tip: 'dog-bone' } }, { despartire: true },
  ]) {
    assert.equal(operatieInMargini(buzunar(['e'], nepotrivit)), true, JSON.stringify(nepotrivit));
    assert.deepEqual(programDinDocument(deschis(doc([{ id: 'e', forma: DREPT }], [buzunar(['e'], nepotrivit)]))), { ok: false, motiv: IMPOTRIVA }, JSON.stringify(nepotrivit));
  }
  const pesteRaza = programDinDocument(deschis(doc([{ id: 'e', forma: DREPT }], [buzunar(['e'], { pasLateral: 3.01 })])));
  assert.ok(!pesteRaza.ok && /^i\/e: pasul lateral de 3.01 mm trebuie să fie în \(0, 3\]/.test(pesteRaza.motiv));
  const { pasLateral: _, ...fara } = buzunar(['e']);
  void _;
  assert.deepEqual(programDinDocument(deschis(doc([{ id: 'e', forma: DREPT }], [fara]))), { ok: false, motiv: 'i/e: buzunarul n-are pasul lateral' });
  // Pe un profil, pasul lateral nu schimbă nimic: programul e cel de fără el.
  const cu = programDinDocument(deschis(doc([{ id: 'e', forma: DREPT }], [profil('o', 'e', 'exterior', { pasLateral: 2 })])));
  const faraPas = programDinDocument(deschis(doc([{ id: 'e', forma: DREPT }], [profil('o', 'e', 'exterior')])));
  assert.deepEqual(cu, faraPas);
  assert.equal(operatieInMargini(buzunar(['e'], { despartire: false })), true);
});

test('migrarea v10 → v11 schimbă doar numărul; un v10 cu un buzunar sau cu pasLateral nu e un v10 valid', () => {
  const v10 = { ...(doc([{ id: 'e', forma: DREPT }], [profil('o', 'e', 'exterior')]) as Record<string, unknown>), schema: 10, extra: 1 };
  const r = incarca(v10);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.doc, { ...v10, schema: 11 });
  const cuBuzunar = { ...(doc([{ id: 'e', forma: DREPT }], [buzunar(['e'])]) as Record<string, unknown>), schema: 10 };
  const a = incarca(cuBuzunar);
  assert.ok(!a.ok && /operația v10 b din piesa p are tipul „buzunar”, pe care v10 nu-l cunoaște: nu e un document v10 valid/.test(a.motiv));
  const cuPas = { ...(doc([{ id: 'e', forma: DREPT }], [profil('o', 'e', 'exterior', { pasLateral: 2 })]) as Record<string, unknown>), schema: 10 };
  const b = incarca(cuPas);
  assert.ok(!b.ok && /are câmpul „pasLateral”, pe care v11 îl folosește: nu e un document v10 valid/.test(b.motiv));
  // Un v11 cu schema peste a aplicației e refuzat cu motivul versiunii.
  const c = incarca({ ...(doc([{ id: 'e', forma: DREPT }], []) as Record<string, unknown>), schema: 12 });
  assert.ok(!c.ok && /versiune mai nouă \(schema 12, aici 11\)/.test(c.motiv));
});

test('lucrarea: buzunarul nu e inel al regiunii păstrate, se taie înaintea exteriorului piesei și stă înăuntrul ei', () => {
  // Piesa 160 × 110, decupată pe exterior, cu un buzunar de 100 × 60 înăuntru.
  const d = deschis(doc([
    { id: 'contur', forma: { tip: 'dreptunghi', latime: 160, inaltime: 110, razaColt: 0 } },
    { id: 'buz', forma: DREPT, e: 30, f: 25 },
  ], [profil('o', 'contur', 'exterior'), buzunar(['buz'])], 20, 20));
  const t = taieturiFoaie(d, 0);
  assert.deepEqual(t.map((x) => [x.nod, x.tip]), [['buz', 'buzunar'], ['contur', 'profil']]);
  const reg = regiunePastrata(t);
  assert.ok(reg.ok && reg.regiune.inele.length === 1 && reg.regiune.inele[0]!.idLume === 'i/contur');
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (!j.ok) return;
  const etichete = j.program.miscari.filter((m) => m.tip === 'eticheta').map((m) => (m.tip === 'eticheta' ? m.text : ''));
  assert.deepEqual(etichete, ['i/buz: dreptunghi, buzunar, 6 mm', 'i/contur: dreptunghi, exterior, 18 mm']);
});

test('lucrarea refuză buzunarul pe o cale deschisă și contururile aceluiași buzunar care se ating sau stau unul în altul', () => {
  const linie = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 10, y: 10 }, s: { tip: 'L' } }, { p: { x: 60, y: 10 }, s: { tip: 'L' } }] };
  const a = programDinDocument(deschis(doc([{ id: 'l', forma: linie }], [buzunar(['l'])])));
  assert.deepEqual(a, { ok: false, motiv: 'i/l: un buzunar cere un contur închis, iar calea e deschisă' });
  const mare = { tip: 'dreptunghi', latime: 80, inaltime: 80, razaColt: 0 }, mic = { tip: 'cerc', raza: 10 };
  const insula = programDinDocument(deschis(doc([{ id: 'm', forma: mare, e: 10, f: 10 }, { id: 'n', forma: mic, e: 50, f: 50 }], [buzunar(['m', 'n'])])));
  assert.deepEqual(insula, { ok: false, motiv: 'i/m și i/n: un contur al buzunarului stă în celălalt; buzunarul cu insule vine mai târziu' });
  const ating = programDinDocument(deschis(doc([{ id: 'm', forma: mare, e: 10, f: 10 }, { id: 'n', forma: mic, e: 90, f: 50 }], [buzunar(['m', 'n'])])));
  assert.ok(!ating.ok && /se ating sau se intersectează; unește-le întâi/.test(ating.motiv));
  // Două contururi disjuncte: două buzunare, fiecare cu eticheta lui.
  const doua = programDinDocument(deschis(doc([{ id: 'm', forma: mare, e: 10, f: 10 }, { id: 'n', forma: mic, e: 150, f: 50 }], [buzunar(['m', 'n'])])));
  assert.ok(doua.ok);
  if (doua.ok) assert.equal(doua.program.miscari.filter((m) => m.tip === 'eticheta').length, 2);
  // Prea îngust pentru freză: refuzul inelelor, cu elementul.
  const ingust = programDinDocument(deschis(doc([{ id: 'e', forma: { tip: 'dreptunghi', latime: 5, inaltime: 40, razaColt: 0 } }], [buzunar(['e'])])));
  assert.deepEqual(ingust, { ok: false, motiv: 'i/e: freza (Ø6) nu încape în buzunar' });
});

/**
 * Programul exportat al unui document, judecat de oracolul simulării pe o grilă de 0,25 mm: `asteptat(x, y)` dă Z-ul cerut
 * în centrul celulei, sau null unde punctul stă la mai puțin de 0,05 mm de o margine (acolo, celula e jumătate tăiată).
 */
async function simulat(d: unknown, grila: { x0: number; y0: number; latime: number; inaltime: number }, asteptat: (x: number, y: number) => number | null) {
  const r = await calculeazaExport(deschis(d), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const text = r.program.text;
  const celula = 0.25;
  const g = { ...grila, celula };
  const o = judeca(text, g, { tip: 'plata', diametru: 6 });
  let gresite = 0, prima = '';
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * celula, y = g.y0 + (j + 0.5) * celula;
      const z = asteptat(x, y);
      if (z === null) continue;
      if (Math.abs((o.z[j * o.nx + i] ?? Number.NaN) - z) > 1e-6) {
        gresite++;
        if (!prima) prima = `(${x}, ${y}): ${o.z[j * o.nx + i]} în loc de ${z}`;
      }
    }
  }
  return { gresite, prima, text };
}

/** Deschiderea dreptunghiului [x0, x1] × [y0, y1] cu discul de rază R (fără colțurile de la care discul nu ajunge), cu marja m. */
function inDeschidere(x: number, y: number, x0: number, y0: number, x1: number, y1: number, R: number, m: number): boolean {
  if (x < x0 + m || x > x1 - m || y < y0 + m || y > y1 - m) return false;
  const cx = Math.min(Math.max(x, x0 + R), x1 - R), cy = Math.min(Math.max(y, y0 + R), y1 - R);
  return Math.hypot(x - cx, y - cy) <= R - m;
}
const langa = (x: number, y: number, x0: number, y0: number, x1: number, y1: number, R: number, m: number): boolean =>
  !inDeschidere(x, y, x0, y0, x1, y1, R, -m) || inDeschidere(x, y, x0, y0, x1, y1, R, m) ? false : true;

test('oracolul simulării: dreptunghiul 100 × 60 e scos la 6 mm peste tot unde ajunge freza, iar în afară nimic nu se atinge', async () => {
  const [x0, y0, x1, y1] = [40, 40, 140, 100];
  const d = doc([{ id: 'e', forma: DREPT }], [buzunar(['e'])], x0, y0);
  const m = 0.05;
  const r = await simulat(d, { x0: 30, y0: 30, latime: 120, inaltime: 80 }, (x, y) => {
    if (langa(x, y, x0, y0, x1, y1, 3, m)) return null;
    return inDeschidere(x, y, x0, y0, x1, y1, 3, m) ? -6 : 0;
  });
  assert.equal(r.gresite, 0, r.prima);
  // Poarta, fără regiune: pasul pe trecere, rapidele deasupra materialului, cutia centrului (43…137 × 43…97, pe hârtie).
  assert.deepEqual(poarta(r.text, {
    foaie: { latime: 200, inaltime: 150, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 3, supracursa: 0,
    asteptareAx: 3, avansPlonjare: 300, cadru: { minX: 43, maxX: 137, minY: 43, maxY: 97 },
  }), []);
});

test('oracolul simulării: L-ul cu pasul maxim (R), în opoziție, scos întreg, cu colțul interior cu tot', async () => {
  const L = { tip: 'cale', inchis: true, varfuri: [[0, 0], [60, 0], [60, 20], [20, 20], [20, 60], [0, 60]].map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) };
  const d = doc([{ id: 'e', forma: L }], [buzunar(['e'], { pasLateral: 3, sens: 'opozitie' })], 30, 30);
  const m = 0.05;
  const r = await simulat(d, { x0: 25, y0: 25, latime: 70, inaltime: 70 }, (x, y) => {
    const a = [30, 30, 90, 50] as const, b = [30, 30, 50, 90] as const;
    if (langa(x, y, ...a, 3, m) || langa(x, y, ...b, 3, m)) return null;
    return inDeschidere(x, y, ...a, 3, m) || inDeschidere(x, y, ...b, 3, m) ? -6 : 0;
  });
  assert.equal(r.gresite, 0, r.prima);
});

test('oracolul simulării: cercul R20, scos întreg, cu arcele', async () => {
  const d = doc([{ id: 'e', forma: { tip: 'cerc', raza: 20 } }], [buzunar(['e'], { pasLateral: 3 })], 60, 60);
  const r = await simulat(d, { x0: 30, y0: 30, latime: 60, inaltime: 60 }, (x, y) => {
    const q = Math.hypot(x - 60, y - 60);
    return Math.abs(q - 20) < 0.05 ? null : q < 20 ? -6 : 0;
  });
  assert.equal(r.gresite, 0, r.prima);
  assert.ok(/G[23] /.test(r.text), 'inelele rămân arce');
});
