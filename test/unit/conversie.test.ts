/**
 * Conversia vectorilor (ADR 0180 §8, §10, §11; felia 10.3↑d), pe hârtie:
 * - **În cerc, doar dacă e:** poligonul regulat cu 64 de laturi R50 devine cercul Ø100, prin noduri (răspunsul 5a), la 0,1 mm;
 *   la 0,05 mm se refuză, cu abaterea față de laturi, 50·(1 − cos(π/64)) = 0,0602 mm; un pătrat nu e cerc (50·(√2 − 1)); o
 *   cale dus-întors pe un sfert de cerc nu e cerc (nu-l ocolește: abaterea e Hausdorff, nu radială);
 * - **În cerc, cu diametrul:** 20 de contururi închise oarecare devin cercuri Ø8, în centrele cutiilor lor (±1e-9);
 * - **În dreptunghi:** dreptunghiul rotit cu 30° (patru linii) și cel cu colțurile rotunjite (r = 5) se recunosc, cu raza
 *   colțului; un cerc nu e dreptunghi, o fantă 60 × 20 da (raza 10); nici o cale dus-întors pe trei laturi; un trapez nu e
 *   dreptunghi; „cu mărimea” 40 × 20 îl pune drept, în centrul cutiei; găurirea refuză dreptunghiul;
 * - **Arce:** elipsa 100 × 60 din cubice devine doar linii și arce, sub 0,01; o polilinie de 32 de linii pe un semicerc R50
 *   devine un singur arc la 0,1 (capetele la bit) și rămâne la 0,01; poligonul închis cu 64 de laturi devine două semicercuri
 *   (niciun arc peste 180°); pe cercul R5, coarda cu întoarcerea de 40° rămâne linie (colțul); un dreptunghi nu devine cerc nici
 *   la 1 mm (lecția din ediția întâi); un zigzag fin rămâne linii;
 * - căile deschise și piesele puse de mai multe ori se sar (numărate); acțiunea `document.converteste`, un pas de anulare.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { conturDreptunghi } from '../../src/geom/conturBaza.ts';
import { cutieContur } from '../../src/geom/cutie.ts';
import type { Contur } from '../../src/geom/contur.ts';
import type { Document, ElementNod, FormaDoc, Operatie, Piesa, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { elipsa, poligonRegulat } from '../../src/model/formeParametrice.ts';
import { executa, istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { converteste, type CerereConversie, type RezultatConversie } from '../../src/model/conversie.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaDoc =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };

/** Documentul de după conversie: fiecare piesă schimbată pusă în locul ei, într-un lot, trecut prin ușă. */
function aplica(d: Document, r: RezultatConversie): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  const vechi = new Map(d.piese.map((p) => [p.id, p]));
  const dupa = executa(istoricNou(d), { tip: 'lot', comenzi: r.piese.map((p) => ({ tip: 'inlocuieste-piesa' as const, vechi: vechi.get(p.id) as Piesa, nou: p })) }).doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const convertit = (d: Document, c: CerereConversie): { readonly dupa: Document; readonly r: Extract<RezultatConversie, { ok: true }> } => {
  const r = converteste(d, c);
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return { dupa: aplica(d, r), r };
};
const elementLume = (d: Document, inst: string) => {
  const e = elementeFoaie(d).filter((x) => x.instanta === inst);
  assert.equal(e.length, 1, `instanța ${inst} are un singur element`);
  return e[0] as (typeof e)[number];
};
const conturLume = (d: Document, inst: string): Contur => conturElement(elementLume(d, inst));
const centruCutie = (c: Contur): { x: number; y: number } => {
  const k = cutieContur(c);
  return { x: (k.minX + k.maxX) / 2, y: (k.minY + k.maxY) / 2 };
};
const CERC = (alese: readonly string[], toleranta = 0.1, diametru: number | null = null): CerereConversie => ({ fel: 'cerc', alese, toleranta, diametru });
const DREPT = (alese: readonly string[], toleranta = 0.1, marime: { latime: number; inaltime: number } | null = null): CerereConversie => ({ fel: 'dreptunghi', alese, toleranta, marime });
const ARCE = (alese: readonly string[], toleranta = 0.01, linii = true): CerereConversie => ({ fel: 'arce', alese, toleranta, linii });

// ——— În cerc ———

test('poligonul cu 64 de laturi R50 devine cercul Ø100, prin noduri, la 0,1 mm; abaterea față de laturi, 0,0602 mm', () => {
  const d = docDin(stoc, forma('p', poligonRegulat({ x: 0, y: 0 }, 50, 64, 0), 500, 500));
  const { dupa, r } = convertit(d, CERC(['p'], 0.1));
  assert.equal(r.convertite, 1);
  const sageata = 50 * (1 - Math.cos(Math.PI / 64));
  aproape(sageata, 0.060227, 1e-6, 'pe hârtie');
  aproape(r.abatere, sageata, 1e-9, 'abaterea măsurată');
  const e = elementLume(dupa, 'p');
  assert.equal(e.forma.tip, 'cerc');
  aproape(e.forma.tip === 'cerc' ? e.forma.raza : NaN, 50, 1e-9, 'raza, prin noduri (Ø100, nu Ø99,94)');
  aproape(e.matrice.e, 500, 1e-9, 'centrul x');
  aproape(e.matrice.f, 500, 1e-9, 'centrul y');
  assert.equal((piesaDin(dupa, 'p').radacina as ElementNod).id, 'p', 'elementul își păstrează id-ul');
  assert.deepEqual(piesaDin(dupa, 'p').operatii, piesaDin(d, 'p').operatii, 'și operațiile');
});

test('la 0,05 mm poligonul nu e cerc: refuzat, cu abaterea lui; un pătrat se abate cu 50·(√2 − 1)', () => {
  const d = docDin(stoc, forma('p', poligonRegulat({ x: 0, y: 0 }, 50, 64, 0), 500, 500), forma('q', cale(true, [0, 0], [100, 0], [100, 100], [0, 100]), 100, 100));
  const r = converteste(d, CERC(['p'], 0.05));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.convertite, 0);
  assert.deepEqual(r.piese, []);
  assert.equal(r.nepotrivite, 1);
  aproape(r.abatereMinima ?? NaN, 50 * (1 - Math.cos(Math.PI / 64)), 1e-9, 'abaterea spusă');
  const q = converteste(d, CERC(['q'], 1));
  if (!q.ok) assert.fail(q.motiv);
  aproape(q.abatereMinima ?? NaN, 50 * (Math.SQRT2 - 1), 1e-9, 'pătratul');
});

test('cu diametrul 8: 20 de contururi închise oarecare devin cercuri Ø8, în centrele cutiilor lor (±1e-9)', () => {
  const forme = Array.from({ length: 20 }, (_, k) => {
    const n = 3 + (k % 7), R = 5 + k;
    const p = Array.from({ length: n }, (_, i): readonly [number, number] => {
      const u = (2 * Math.PI * i) / n + k / 3, rz = R * (0.6 + 0.4 * Math.abs(Math.sin(3 * i + k)));
      return [rz * Math.cos(u), rz * Math.sin(u)];
    });
    return forma(`s${k}`, cale(true, ...p), 50 + (k % 5) * 150, 50 + Math.floor(k / 5) * 150);
  });
  const d = docDin(stoc, ...forme);
  const inainte = forme.map((f) => centruCutie(conturLume(d, f.id)));
  const { dupa, r } = convertit(d, CERC(forme.map((f) => f.id), 0.1, 8));
  assert.equal(r.convertite, 20);
  forme.forEach((f, k) => {
    const e = elementLume(dupa, f.id);
    assert.equal(e.forma.tip, 'cerc');
    aproape(e.forma.tip === 'cerc' ? e.forma.raza : NaN, 4, 1e-12, `${f.id}: raza`);
    aproape(e.matrice.e, (inainte[k] as { x: number }).x, 1e-9, `${f.id}: centrul x`);
    aproape(e.matrice.f, (inainte[k] as { y: number }).y, 1e-9, `${f.id}: centrul y`);
  });
});

test('o cale închisă dus-întors pe un sfert de cerc nu e cerc: nu-l ocolește, deci abaterea e Hausdorff (~92 mm), nu radială', () => {
  // Dus pe R50, de la 0° la 90°, întors pe R49,8: vârfurile stau la cel mult 0,2 mm de un cerc, dar cercul nu stă lângă formă.
  const dus = Array.from({ length: 17 }, (_, k): readonly [number, number] => [50 * Math.cos((Math.PI * k) / 32), 50 * Math.sin((Math.PI * k) / 32)]);
  const intors = Array.from({ length: 15 }, (_, k): readonly [number, number] => [49.8 * Math.cos((Math.PI * (15 - k)) / 32), 49.8 * Math.sin((Math.PI * (15 - k)) / 32)]);
  const d = docDin(stoc, forma('u', cale(true, ...dus, ...intors), 500, 500));
  const r = converteste(d, CERC(['u'], 1));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.convertite, 0);
  assert.equal(r.nepotrivite, 1);
  assert.ok((r.abatereMinima ?? 0) > 90, `abaterea: ${r.abatereMinima}`);
});

test('căile deschise și piesele puse de mai multe ori se sar, numărate; nimic de convertit nu schimbă nimic', () => {
  const d0 = docDin(stoc, forma('l', cale(false, [0, 0], [100, 0], [100, 100])), forma('p', poligonRegulat({ x: 0, y: 0 }, 50, 64, 0), 500, 500));
  const foaie = d0.foi[0];
  assert.ok(foaie);
  const d: Document = { ...d0, foi: [{ ...foaie, instante: [...foaie.instante, { id: 'p2', piesa: 'p', x: 200, y: 800, rotire: 0 }] }] };
  const r = converteste(d, CERC(['l', 'p'], 0.1));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.convertite, 0);
  assert.equal(r.sarite, 2, 'calea deschisă și piesa pusă de două ori');
  assert.deepEqual(r.piese, []);
  assert.deepEqual(converteste(d, CERC([], 0.1)), { ok: false, motiv: 'nimic-ales' });
  assert.deepEqual(converteste(d, CERC(['p'], 5)), { ok: false, motiv: 'toleranta' });
  assert.deepEqual(converteste(d, CERC(['p'], 0.1, -2)), { ok: false, motiv: 'valoare' });
});

// ——— În dreptunghi ———

test('dreptunghiul 100 × 40 rotit cu 30°, din patru linii, se recunoaște: lățimea, înălțimea, colțurile în același loc', () => {
  const u = Math.PI / 6, cu = Math.cos(u), su = Math.sin(u);
  const colt = (x: number, y: number): readonly [number, number] => [x * cu - y * su, x * su + y * cu];
  const d = docDin(stoc, forma('r', cale(true, colt(0, 0), colt(100, 0), colt(100, 40), colt(0, 40)), 300, 300));
  const inainte = conturLume(d, 'r');
  const { dupa, r } = convertit(d, DREPT(['r'], 0.1));
  assert.equal(r.convertite, 1);
  const e = elementLume(dupa, 'r');
  assert.equal(e.forma.tip, 'dreptunghi');
  if (e.forma.tip !== 'dreptunghi') return;
  aproape(e.forma.latime, 100, 1e-9, 'lățimea');
  aproape(e.forma.inaltime, 40, 1e-9, 'înălțimea');
  assert.equal(e.forma.razaColt, 0);
  const dupaC = conturLume(dupa, 'r');
  for (const v of inainte.varfuri) assert.ok(dupaC.varfuri.some((w) => Math.hypot(w.p.x - v.p.x, w.p.y - v.p.y) <= 1e-9), `colțul (${v.p.x}, ${v.p.y})`);
  aproape(r.abatere, 0, 1e-9, 'abaterea');
});

test('dreptunghiul cu colțurile rotunjite (o cale din linii și arce, r = 5) se recunoaște cu raza colțului 5', () => {
  const c = conturDreptunghi(0, 0, 100, 40, 5);
  const f: FormaDoc = { tip: 'cale', inchis: true, varfuri: c.varfuri.map((v): VarfDoc => ({ p: { x: v.p.x, y: v.p.y }, s: v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : L })) };
  const d = docDin(stoc, forma('r', f, 200, 200));
  const { dupa, r } = convertit(d, DREPT(['r'], 0.1));
  assert.equal(r.convertite, 1);
  const e = elementLume(dupa, 'r');
  assert.ok(e.forma.tip === 'dreptunghi');
  if (e.forma.tip !== 'dreptunghi') return;
  aproape(e.forma.latime, 100, 1e-9, 'lățimea');
  aproape(e.forma.inaltime, 40, 1e-9, 'înălțimea');
  aproape(e.forma.razaColt, 5, 1e-9, 'raza colțului');
  aproape(e.matrice.e, 200, 1e-9, 'locul x');
  aproape(e.matrice.f, 200, 1e-9, 'locul y');
});

test('un cerc nu e dreptunghi (nici cel adevărat, nici cel din 64 de laturi), iar o fantă 60 × 20 din linii și semicercuri da, cu raza colțului 10', () => {
  const fanta: FormaDoc = { tip: 'cale', inchis: true, varfuri: [
    { p: { x: 10, y: 0 }, s: L }, { p: { x: 50, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 50, y: 20 }, s: L }, { p: { x: 10, y: 20 }, s: { tip: 'A', bulge: 1 } },
  ] };
  const d = docDin(stoc, forma('c', { tip: 'cerc', raza: 20 }, 100, 100), forma('p', poligonRegulat({ x: 0, y: 0 }, 64, 50, 0), 300, 300), forma('f', fanta, 500, 500));
  const r = converteste(d, DREPT(['c', 'p', 'f'], 1));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.nepotrivite, 2, 'cercul și poligonul');
  assert.equal(r.abatereMinima, null, 'un cerc n-are o abatere de dreptunghi de spus');
  assert.equal(r.convertite, 1, 'fanta');
  const e = elementLume(aplica(d, r), 'f');
  assert.ok(e.forma.tip === 'dreptunghi');
  if (e.forma.tip !== 'dreptunghi') return;
  aproape(e.forma.latime, 60, 1e-9, 'lățimea');
  aproape(e.forma.inaltime, 20, 1e-9, 'înălțimea');
  aproape(e.forma.razaColt, 10, 1e-9, 'raza colțului');
});

test('o cale închisă dus-întors pe trei laturi ale unui dreptunghi 100 × 40 nu e dreptunghi: nu-i acoperă latura de sus (~40 mm)', () => {
  const d = docDin(stoc, forma('u', cale(true, [0, 40], [0, 0], [100, 0], [100, 40], [99.95, 40], [99.95, 0.05], [0.05, 0.05], [0.05, 40]), 300, 300));
  const r = converteste(d, DREPT(['u'], 0.1));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.convertite, 0);
  assert.equal(r.nepotrivite, 1);
  assert.ok((r.abatereMinima ?? 0) > 39, `abaterea: ${r.abatereMinima}`);
});

test('un trapez nu e dreptunghi: refuzat, cu abaterea; „cu mărimea” 40 × 20 îl face dreptunghi drept, în centrul cutiei', () => {
  const d = docDin(stoc, forma('t', cale(true, [0, 0], [100, 0], [80, 40], [20, 40]), 400, 400));
  const r = converteste(d, DREPT(['t'], 0.5));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.nepotrivite, 1);
  assert.ok((r.abatereMinima ?? 0) > 0.5);
  const centru = centruCutie(conturLume(d, 't'));
  const { dupa } = convertit(d, DREPT(['t'], 0.1, { latime: 40, inaltime: 20 }));
  const k = cutieContur(conturLume(dupa, 't'));
  aproape(k.maxX - k.minX, 40, 1e-9, 'lățimea');
  aproape(k.maxY - k.minY, 20, 1e-9, 'înălțimea');
  aproape((k.minX + k.maxX) / 2, centru.x, 1e-9, 'centrul x');
  aproape((k.minY + k.maxY) / 2, centru.y, 1e-9, 'centrul y');
});

test('găurirea: o formă găurită nu devine dreptunghi (refuzată, numărată), dar devine cerc', () => {
  const d0 = docDin(stoc, forma('g', poligonRegulat({ x: 0, y: 0 }, 4, 8, 0), 100, 100));
  const p0 = d0.piese[0] as Piesa;
  const d: Document = { ...d0, piese: [{ ...p0, operatii: [{ ...(p0.operatii[0] as Operatie), tip: 'gaurire', latura: 'interior' }] }] };
  const r = converteste(d, DREPT(['g'], 0.1, { latime: 8, inaltime: 8 }));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.operatie, 1);
  assert.equal(r.convertite, 0);
  assert.equal(convertit(d, CERC(['g'], 0.1, 8)).r.convertite, 1);
});

// ——— Arce ———

test('elipsa 100 × 60 din cubice devine doar linii și arce, la 0,01 mm, cu abaterea măsurată sub toleranță', () => {
  const d = docDin(stoc, forma('e', elipsa({ x: 0, y: 0 }, 50, 30), 500, 500));
  const { dupa, r } = convertit(d, ARCE(['e'], 0.01));
  assert.equal(r.convertite, 1);
  assert.ok(r.curbe >= 4, `curbele: ${r.curbe}`);
  assert.ok(r.arce > 0);
  assert.ok(r.abatere > 0 && r.abatere <= 0.01, `abaterea: ${r.abatere}`);
  const c = conturLume(dupa, 'e');
  assert.ok(c.varfuri.every((v) => v.s.tip !== 'C'), 'nicio cubică');
});

test('o polilinie de 32 de linii pe semicercul R50: la 0,1, un singur arc de 180°, cu capetele la bit; la 0,01, neschimbată', () => {
  const p = Array.from({ length: 33 }, (_, k): readonly [number, number] => [50 * Math.cos((Math.PI * k) / 32), 50 * Math.sin((Math.PI * k) / 32)]);
  const d = docDin(stoc, forma('s', cale(false, ...p), 500, 500));
  const { dupa, r } = convertit(d, ARCE(['s'], 0.1));
  assert.equal(r.arce, 1);
  assert.equal(r.linii, 0);
  const f = (piesaDin(dupa, 's').radacina as ElementNod).forma;
  assert.ok(f.tip === 'cale');
  if (f.tip !== 'cale') return;
  assert.equal(f.varfuri.length, 2);
  assert.deepEqual(f.varfuri.map((v) => [v.p.x, v.p.y]), [p[0], p[32]].map((q) => [q?.[0], q?.[1]]), 'capetele la bit');
  const s = f.varfuri[0]?.s;
  aproape(s?.tip === 'A' ? s.bulge : NaN, 1, 1e-9, 'bulge 1: 180°');
  aproape(r.abatere, 50 * (1 - Math.cos(Math.PI / 64)), 1e-6, 'abaterea: săgeata coardelor');
  const nimic = converteste(d, ARCE(['s'], 0.01));
  assert.ok(nimic.ok && nimic.piese.length === 0 && nimic.convertite === 0, 'la 0,01 nu încape');
});

test('poligonul închis cu 64 de laturi R50, la 0,1 mm: două semicercuri (bulge 1), nu un arc de peste 180°', () => {
  const d = docDin(stoc, forma('p', poligonRegulat({ x: 0, y: 0 }, 50, 64, 0), 500, 500));
  const { dupa, r } = convertit(d, ARCE(['p'], 0.1));
  assert.equal(r.arce, 2);
  const f = (piesaDin(dupa, 'p').radacina as ElementNod).forma;
  assert.ok(f.tip === 'cale' && f.inchis);
  if (f.tip !== 'cale') return;
  assert.equal(f.varfuri.length, 2);
  for (const v of f.varfuri) aproape(v.s.tip === 'A' ? v.s.bulge : NaN, 1, 1e-9, 'bulge 1: 180°');
});

test('un colț rămâne colț: pe cercul R5, coarda de 70° (întoarcerea de 40°) rămâne linie la 1 mm, deși săgeata ei (0,904) ar încăpea', () => {
  const p = [0, 10, 20, 90, 100, 110].map((g): readonly [number, number] => [5 * Math.cos((g * Math.PI) / 180), 5 * Math.sin((g * Math.PI) / 180)]);
  const d = docDin(stoc, forma('k', cale(false, ...p), 500, 500));
  const { dupa, r } = convertit(d, ARCE(['k'], 1));
  assert.equal(r.arce, 2);
  const f = (piesaDin(dupa, 'k').radacina as ElementNod).forma;
  assert.ok(f.tip === 'cale');
  if (f.tip !== 'cale') return;
  // Arcul 0°…20°, coarda 20°…90° (linie), arcul 90°…110°: vârfurile 0, 2, 3, 5 ale poliliniei, la bit.
  assert.deepEqual(f.varfuri.map((v) => [v.p.x, v.p.y]), [p[0], p[2], p[3], p[5]].map((q) => [q?.[0], q?.[1]]));
  assert.deepEqual(f.varfuri.map((v) => v.s.tip), ['A', 'L', 'A', 'L']);
  for (const k of [0, 2]) { const s = f.varfuri[k]?.s; aproape(s?.tip === 'A' ? s.bulge : NaN, Math.tan((5 * Math.PI) / 180), 1e-9, `arcul ${k}: 20°`); }
});

test('un dreptunghi nu devine cerc nici la 1 mm (colțurile și laturile rămân); un zigzag fin rămâne linii', () => {
  const d = docDin(stoc, forma('r', cale(true, [0, 0], [100, 0], [100, 40], [0, 40]), 100, 100),
    forma('z', cale(false, ...Array.from({ length: 41 }, (_, k): readonly [number, number] => [k * 2, k % 2 === 0 ? 0 : 1])), 300, 300));
  const r = converteste(d, ARCE(['r', 'z'], 1));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.convertite, 0);
  assert.deepEqual(r.piese, []);
});

test('cu „și liniile scurte” debifat, polilinia rămâne; cercurile și dreptunghiurile (formele lor) rămân cum sunt', () => {
  const p = Array.from({ length: 33 }, (_, k): readonly [number, number] => [50 * Math.cos((Math.PI * k) / 32), 50 * Math.sin((Math.PI * k) / 32)]);
  const d = docDin(stoc, forma('s', cale(false, ...p), 500, 500), forma('c', { tip: 'cerc', raza: 10 }, 100, 100),
    forma('d', { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 4 }, 200, 100));
  const r = converteste(d, ARCE(['s', 'c', 'd'], 0.1, false));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.convertite, 0);
});

const piesaDin = (d: Document, id: string): Piesa => d.piese.find((p) => p.id === id) ?? assert.fail(`piesa ${id}`);

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
function context(d: Document, selectie: readonly string[]): ContextDocument & { readonly h: () => Istoric; readonly s: () => readonly string[] } {
  let h = istoricNou(d);
  let sel: readonly string[] = selectie;
  return { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false, h: () => h, s: () => sel };
}

test('document.converteste: un singur pas de anulare, aceleași forme alese; un desen schimbat între timp e refuzat', () => {
  const d = docDin(stoc, forma('p', poligonRegulat({ x: 0, y: 0 }, 50, 64, 0), 500, 500), forma('q', poligonRegulat({ x: 0, y: 0 }, 20, 64, 0), 200, 200));
  const r = converteste(d, CERC(['p', 'q'], 0.1));
  if (!r.ok) assert.fail(r.motiv);
  const ctx = context(d, ['p', 'q']);
  assert.deepEqual(ruleaza(R, 'document.converteste', { ...ctx, conversie: () => ({ doc: d, piese: r.piese }) }), { ok: true });
  assert.equal(ctx.h().trecut.length, 1);
  assert.deepEqual(ctx.s(), ['p', 'q']);
  assert.ok(ctx.h().doc.piese.every((p) => (p.radacina as ElementNod).forma.tip === 'cerc'));
  ruleaza(R, 'istoric.anuleaza', ctx);
  assert.deepEqual({ ...ctx.h().doc, rev: d.rev }, d);
  const vechi = context({ ...d, rev: d.rev + 1 }, ['p']);
  assert.deepEqual(ruleaza(R, 'document.converteste', { ...vechi, conversie: () => ({ doc: d, piese: r.piese }) }), { ok: false, motiv: 'editare.conversie.motiv.veche' });
});
