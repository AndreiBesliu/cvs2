/**
 * Cuțitul-formă și „Taie la intersecții” (ADR 0180 §3, §5, §6; felia 10.3↑b), judecate de oracolul independent
 * (`test/oracles/taiere.ts`) pe corpusuri din sămânță:
 * - **cuțitul**: formele corpusului liniei (dreptunghiuri, cercuri, poligoane, cubice, arce, căi deschise, inele), la rotiri
 *   oarecare, tăiate cu un poligon convex (părțile înăuntru și în afară, ariile tăiate de el), cu un cerc (aceleași, cu
 *   poligonul lui des) sau cu o linie frântă monotonă care trece de cutia formei (ariile fețelor se adună la aria regiunii);
 *   cu și fără închidere;
 * - **intersecțiile**: două sau trei forme ale corpusului, una peste alta: aceeași lungime în total, nimic inventat, nicio
 *   bucată nouă prin altă formă veche.
 * Un „nimic de tăiat” e verificat și el: forma chiar nu trece cuțitul (sau formele chiar nu se întâlnesc).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { FormaDoc, Instanta, Piesa, VarfDoc } from '../../src/model/document.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type Cutit } from '../../src/model/taiere.ts';
import { esantioane, formeInstanta, judecaCutitul, judecaIntersectiile, type FormaOracol } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, document, formaCorpus, intre, stoc } from './ajutor-taiere.ts';

type P = { readonly x: number; readonly y: number };
const L = { tip: 'L' } as const;

const cutie = (f: readonly FormaOracol[]): { minX: number; minY: number; maxX: number; maxY: number } => {
  const q = f.flatMap((x) => esantioane(x, 8));
  return { minX: Math.min(...q.map((p) => p.x)), minY: Math.min(...q.map((p) => p.y)), maxX: Math.max(...q.map((p) => p.x)), maxY: Math.max(...q.map((p) => p.y)) };
};

/** Se încrucișează (strict) două linii frânte dese? Martorul unui „nimic de tăiat”. */
function seTaie(a: readonly P[], b: readonly P[]): boolean {
  const o = (p: P, q: P, s: P): number => (q.x - p.x) * (s.y - p.y) - (q.y - p.y) * (s.x - p.x);
  for (let i = 0; i + 1 < a.length; i++) {
    for (let j = 0; j + 1 < b.length; j++) {
      const [p, q, s, t] = [a[i] as P, a[i + 1] as P, b[j] as P, b[j + 1] as P];
      const d1 = o(s, t, p), d2 = o(s, t, q), d3 = o(p, q, s), d4 = o(p, q, t);
      if (((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9))) return true;
    }
  }
  return false;
}
const linieFranta = (f: FormaOracol): P[] => {
  const p = esantioane(f, 64);
  return f.inchis ? [...p, p[0] as P] : p;
};

test('cuțitul-formă, pe corpusul din sămânță: fiecare tăiere trece de oracol (acoperirea, nimic inventat, părțile, ariile)', () => {
  const r = aleator(0x10_3b);
  let taieri = 0, convexe = 0, cercuri = 0, deschise = 0, inchise = 0, nimic = 0;
  for (let caz = 0; caz < 120; caz++) {
    const id = `s${caz}`;
    const forma = formaCorpus(r, id, intre(r, 250, 750), intre(r, 250, 750));
    const fara = document([forma]);
    const inainte = formeInstanta(fara, id);
    const c = cutie(inainte);
    const cx = (c.minX + c.maxX) / 2, cy = (c.minY + c.maxY) / 2, w = c.maxX - c.minX, h = c.maxY - c.minY;
    const fel = r();
    let cutit: FormaDoc;
    let convex: P[] | null = null;
    let cerc: { readonly c: P; readonly r: number } | null = null;
    let kx = 0, ky = 0;
    if (fel < 0.45) {
      // Un poligon convex regulat, rotit, cu centrul lângă marginea formei.
      const n = 3 + Math.floor(r() * 6), R = intre(r, 20, 70), u0 = intre(r, 0, 2 * Math.PI);
      kx = cx + intre(r, -0.5, 0.5) * w;
      ky = cy + intre(r, -0.5, 0.5) * h;
      const v = Array.from({ length: n }, (_, k) => ({ x: R * Math.cos(u0 + (2 * Math.PI * k) / n), y: R * Math.sin(u0 + (2 * Math.PI * k) / n) }));
      cutit = { tip: 'cale', inchis: true, varfuri: v.map((p): VarfDoc => ({ p, s: L })) };
      convex = v.map((p) => ({ x: p.x + kx, y: p.y + ky }));
      convexe++;
    } else if (fel < 0.6) {
      const R = intre(r, 15, 60);
      kx = cx + intre(r, -0.5, 0.5) * w;
      ky = cy + intre(r, -0.5, 0.5) * h;
      cutit = { tip: 'cerc', raza: R };
      convex = Array.from({ length: 1440 }, (_, k) => ({ x: kx + R * Math.cos((2 * Math.PI * k) / 1440), y: ky + R * Math.sin((2 * Math.PI * k) / 1440) }));
      cerc = { c: { x: kx, y: ky }, r: R };
      cercuri++;
    } else {
      // O linie frântă monotonă (pe x sau pe y), de la o margine a cutiei la cealaltă: nu se taie singură, nu se oprește în formă.
      const n = 2 + Math.floor(r() * 4);
      const peX = r() < 0.5;
      const v: P[] = Array.from({ length: n }, (_, k) => {
        const a = (peX ? c.minX : c.minY) - 10 + (k * ((peX ? w : h) + 20)) / (n - 1);
        const b = peX ? intre(r, c.minY, c.maxY) : intre(r, c.minX, c.maxX);
        return peX ? { x: a, y: b } : { x: b, y: a };
      });
      cutit = { tip: 'cale', inchis: false, varfuri: v.map((p): VarfDoc => ({ p, s: L })) };
      deschise++;
    }
    const k = docDin(stoc, { id: 'k', forma: cutit, matrice: { ...ID, e: kx, f: ky } });
    const d = document([forma, { piesa: k.piese[0] as Piesa, instanta: k.foi[0]?.instante[0] as Instanta }]);
    const inchide = r() < 0.6;
    const rez = taie(d, { cutit: { fel: 'forma', id: 'k' }, alese: [id, 'k'], inchide });
    const mesaj = `cazul ${caz} (${convex ? (cutit.tip === 'cerc' ? 'cerc' : 'convex') : 'deschis'}, ${inchide ? 'cu' : 'fără'} închidere)`;
    const kf = formeInstanta(d, 'k');
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      assert.ok(!inainte.some((f) => kf.some((g) => seTaie(linieFranta(f), linieFranta(g)))), `${mesaj}: forma trece cuțitul, dar n-a fost tăiată`);
      nimic++;
      continue;
    }
    const foaie = d.foi[0];
    assert.ok(foaie);
    const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
    assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), `${mesaj}: documentul de după trece de ușă`);
    assert.deepEqual(formeInstanta(dupa, 'k'), kf, `${mesaj}: cuțitul rămâne neschimbat`);
    const parti = rez.ids.map((pid) => formeInstanta(dupa, pid));
    assert.deepEqual(judecaCutitul({ inainte, cutit: kf, parti, inchide, convex, cerc }), [], mesaj);
    taieri++;
    if (inchide) inchise++;
  }
  assert.ok(taieri >= 80, `tăieri judecate: ${taieri}`);
  assert.ok(inchise >= 40, `cu închidere: ${inchise}`);
  assert.ok(convexe >= 40 && cercuri >= 10 && deschise >= 30, `cuțitele: ${convexe} convexe, ${cercuri} cercuri, ${deschise} deschise`);
  assert.ok(nimic >= 3, `nimic de tăiat, verificat: ${nimic}`);
});

test('„Taie la intersecții”, pe corpusul din sămânță: aceeași lungime, nimic inventat, nicio bucată nouă prin altă formă', () => {
  const r = aleator(0x10_3c);
  let taieri = 0, nimic = 0;
  for (let caz = 0; caz < 60; caz++) {
    const x = intre(r, 300, 700), y = intre(r, 300, 700);
    const n = 2 + Math.floor(r() * 2);
    const forme = Array.from({ length: n }, (_, k) => formaCorpus(r, `s${caz}_${k}`, x + intre(r, -45, 45), y + intre(r, -45, 45)));
    const d = document(forme);
    const ids = forme.map((f) => f.instanta.id);
    const inainte = ids.flatMap((id) => formeInstanta(d, id));
    const rez = taie(d, { cutit: { fel: 'intersectii' } satisfies Cutit, alese: ids, inchide: false });
    const mesaj = `cazul ${caz} (${n} forme)`;
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      const pe = ids.map((id) => formeInstanta(d, id));
      for (let i = 0; i < pe.length; i++) {
        for (let j = i + 1; j < pe.length; j++) {
          const a = pe[i] as FormaOracol[], b = pe[j] as FormaOracol[];
          assert.ok(!a.some((f) => b.some((g) => seTaie(linieFranta(f), linieFranta(g)))), `${mesaj}: formele se taie, dar n-au fost tăiate`);
        }
      }
      nimic++;
      continue;
    }
    const foaie = d.foi[0];
    assert.ok(foaie);
    const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
    assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), `${mesaj}: documentul de după trece de ușă`);
    const toate = (dupa.foi[0]?.instante ?? []).flatMap((i) => formeInstanta(dupa, i.id));
    assert.deepEqual(judecaIntersectiile({ inainte, dupa: toate }), [], mesaj);
    taieri++;
  }
  assert.ok(taieri >= 40, `tăieri judecate: ${taieri}`);
  assert.ok(nimic >= 1, `nimic de tăiat, verificat: ${nimic}`);
});

test('martorul oracolului: o tăiere cu cuțitul stricată (o față lipsă, părțile inversate, o bucată dublată) e prinsă', () => {
  const d = docDin(stoc, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } },
    { id: 'k', forma: { tip: 'cale', inchis: true, varfuri: [[150, 50], [250, 50], [250, 250], [150, 250]].map(([x, y]): VarfDoc => ({ p: { x: x as number, y: y as number }, s: L })) }, matrice: { ...ID } });
  const rez = taie(d, { cutit: { fel: 'forma', id: 'k' }, alese: ['a', 'k'], inchide: true });
  if (!rez.ok) assert.fail(rez.motiv);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
  const inainte = formeInstanta(d, 'a'), kf = formeInstanta(d, 'k');
  const [a, b] = rez.ids.map((pid) => formeInstanta(dupa, pid));
  const convex = [{ x: 150, y: 50 }, { x: 250, y: 50 }, { x: 250, y: 250 }, { x: 150, y: 250 }];
  assert.deepEqual(judecaCutitul({ inainte, cutit: kf, parti: [a ?? [], b ?? []], inchide: true, convex }), []);
  assert.notDeepEqual(judecaCutitul({ inainte, cutit: kf, parti: [a ?? [], []], inchide: true, convex }), [], 'o față lipsă');
  assert.notDeepEqual(judecaCutitul({ inainte, cutit: kf, parti: [b ?? [], a ?? []], inchide: true, convex }), [], 'părțile inversate');
  assert.notDeepEqual(judecaCutitul({ inainte, cutit: kf, parti: [a ?? [], b ?? []], inchide: false, convex: null }).length, 1, 'fără închidere, fețele închise trec');
  const p = inainte;
  assert.deepEqual(judecaIntersectiile({ inainte: p, dupa: p }), []);
  assert.notDeepEqual(judecaIntersectiile({ inainte: p, dupa: [...p, ...p] }), [], 'o formă dublată');
});
