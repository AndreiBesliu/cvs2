/**
 * Cuțitul uneltei (ADR 0181 §1; felia 10.3↑f), judecat de oracolul independent (`test/oracles/taiere.ts`) pe corpusuri din
 * sămânță:
 * - **calea trasă** (Linie, Pen): poligoane convexe și linii frânte peste formele corpusului dau aceleași bucăți ca o formă din
 *   document cu aceeași cale, iar oracolul le judecă (acoperirea, nimic inventat, părțile, ariile);
 * - **buclele libere** (felul Formă, nota owner-ului): un poligon convex pus tot înăuntrul regiunii unei forme o taie, cu
 *   închidere, în poligon și forma cu golul lui (ariile din oracol); pus într-un gol sau în afară, nu taie nimic;
 * - **mâna liberă**: o undă trasă din multe puncte, netezită la 0,05 mm, taie formele; marginea nouă stă la cel mult toleranța
 *   de urmă, iar ariile fețelor se adună.
 * Un „nimic de tăiat” e verificat și el; martorul arată că oracolul prinde o buclă liberă pierdută.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, FormaDoc, Instanta, Piesa, VarfDoc } from '../../src/model/document.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import type { FormaCale } from '../../src/model/noduri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type Cutit, type RezultatTaiere } from '../../src/model/taiere.ts';
import { distantaLaForme, esantioane, formeInstanta, judecaCutitul, type FormaOracol } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, document, formaCorpus, intre, stoc } from './ajutor-taiere.ts';

type P = { readonly x: number; readonly y: number };
const L = { tip: 'L' } as const;
const caleDin = (inchis: boolean, v: readonly P[]): FormaCale => ({ tip: 'cale', inchis, varfuri: v.map((p): VarfDoc => ({ p: { x: p.x, y: p.y }, s: L })) });

const cutie = (f: readonly FormaOracol[]): { minX: number; minY: number; maxX: number; maxY: number } => {
  const q = f.flatMap((x) => esantioane(x, 8));
  return { minX: Math.min(...q.map((p) => p.x)), minY: Math.min(...q.map((p) => p.y)), maxX: Math.max(...q.map((p) => p.x)), maxY: Math.max(...q.map((p) => p.y)) };
};

/** E punctul în regiunea par-impar a formelor închise? (Raza spre +x, prin poligoanele lor dese.) */
function inRegiune(q: P, forme: readonly FormaOracol[]): boolean {
  let in_ = false;
  for (const f of forme) {
    if (!f.inchis) continue;
    const p = esantioane(f, 64);
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i] as P, b = p[j] as P;
      if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
    }
  }
  return in_;
}

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

/** Documentul de după (degruparea), trecut prin ușă. */
function dupa(d: Document, rez: Extract<RezultatTaiere, { ok: true }>, mesaj: string): Document {
  const foaie = d.foi[0];
  assert.ok(foaie);
  const x = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(x))), `${mesaj}: documentul de după trece de ușă`);
  return x;
}

/** Un poligon convex regulat, trigonometric. */
const poligonRegulat = (c: P, R: number, n: number, u0: number): P[] =>
  Array.from({ length: n }, (_, k) => ({ x: c.x + R * Math.cos(u0 + (2 * Math.PI * k) / n), y: c.y + R * Math.sin(u0 + (2 * Math.PI * k) / n) }));

test('calea trasă, pe corpusul din sămânță: aceleași bucăți ca forma din document cu aceeași cale, judecate de oracol', () => {
  const r = aleator(0x10_3f);
  let taieri = 0, convexe = 0, deschise = 0, nimic = 0;
  for (let caz = 0; caz < 90; caz++) {
    const id = `s${caz}`;
    const forma = formaCorpus(r, id, intre(r, 250, 750), intre(r, 250, 750));
    const inainte = formeInstanta(document([forma]), id);
    const c = cutie(inainte);
    const cx = (c.minX + c.maxX) / 2, cy = (c.minY + c.maxY) / 2, w = c.maxX - c.minX, h = c.maxY - c.minY;
    let v: P[], inchis: boolean, convex: P[] | null = null;
    if (r() < 0.5) {
      v = poligonRegulat({ x: cx + intre(r, -0.5, 0.5) * w, y: cy + intre(r, -0.5, 0.5) * h }, intre(r, 20, 70), 3 + Math.floor(r() * 6), intre(r, 0, 2 * Math.PI));
      inchis = true;
      convex = v;
      convexe++;
    } else {
      const n = 2 + Math.floor(r() * 4), peX = r() < 0.5;
      v = Array.from({ length: n }, (_, k) => {
        const a = (peX ? c.minX : c.minY) - 10 + (k * ((peX ? w : h) + 20)) / (n - 1);
        const b = peX ? intre(r, c.minY, c.maxY) : intre(r, c.minX, c.maxX);
        return peX ? { x: a, y: b } : { x: b, y: a };
      });
      inchis = false;
      deschise++;
    }
    const k = docDin(stoc, { id: 'k', forma: caleDin(inchis, v), matrice: { ...ID } });
    const d = document([forma, { piesa: k.piese[0] as Piesa, instanta: k.foi[0]?.instante[0] as Instanta }]);
    const inchide = r() < 0.6;
    const mesaj = `cazul ${caz} (${inchis ? 'convex' : 'deschis'}, ${inchide ? 'cu' : 'fără'} închidere)`;
    const cuCale = taie(d, { cutit: { fel: 'cale', cale: caleDin(inchis, v) }, alese: [id], inchide });
    const cuForma = taie(d, { cutit: { fel: 'forma', id: 'k' }, alese: [id, 'k'], inchide });
    assert.deepEqual(cuCale, cuForma, `${mesaj}: calea trasă taie ca forma din document`);
    const kf = formeInstanta(d, 'k');
    if (!cuCale.ok) {
      assert.equal(cuCale.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${cuCale.motiv}`);
      assert.ok(!inainte.some((f) => kf.some((g) => seTaie(linieFranta(f), linieFranta(g)))), `${mesaj}: forma trece cuțitul, dar n-a fost tăiată`);
      nimic++;
      continue;
    }
    const x = dupa(d, cuCale, mesaj);
    const parti = cuCale.ids.map((pid) => formeInstanta(x, pid));
    assert.deepEqual(judecaCutitul({ inainte, cutit: kf, parti, inchide, convex }), [], mesaj);
    taieri++;
  }
  assert.ok(taieri >= 60, `tăieri judecate: ${taieri}`);
  assert.ok(convexe >= 30 && deschise >= 30, `cuțitele: ${convexe} convexe, ${deschise} deschise`);
  assert.ok(nimic >= 2, `nimic de tăiat, verificat: ${nimic}`);
});

test('buclele libere: un poligon pus tot înăuntrul regiunii unei forme o taie în poligon și forma cu golul lui', () => {
  const r = aleator(0x10_3f_2);
  let libere = 0, inGol = 0, prinCale = 0;
  for (let caz = 0; caz < 120 && libere < 60; caz++) {
    const id = `s${caz}`;
    const forma = formaCorpus(r, id, intre(r, 250, 750), intre(r, 250, 750));
    const inainte = formeInstanta(document([forma]), id);
    if (!inainte.some((f) => f.inchis)) continue;
    const c = cutie(inainte);
    // Un centru oarecare din cutie, departe de forme: poligonul înscris în cercul de rază R < distanța nu atinge nimic.
    const q = { x: intre(r, c.minX, c.maxX), y: intre(r, c.minY, c.maxY) };
    const dist = distantaLaForme(q, inainte);
    if (dist < 3) continue;
    const v = poligonRegulat(q, Math.min(0.8 * dist, 25), 3 + Math.floor(r() * 6), intre(r, 0, 2 * Math.PI));
    const k = docDin(stoc, { id: 'k', forma: caleDin(true, v), matrice: { ...ID } });
    const d = document([forma, { piesa: k.piese[0] as Piesa, instanta: k.foi[0]?.instante[0] as Instanta }]);
    const pe = r() < 0.5;
    const cutit: Cutit = pe ? { fel: 'cale', cale: caleDin(true, v) } : { fel: 'forme', ids: ['k'] };
    const rez = taie(d, { cutit, alese: [id], inchide: true });
    const mesaj = `cazul ${caz} (${pe ? 'calea trasă' : 'forma'})`;
    if (!inRegiune(q, inainte)) {
      // În golul formei sau în afara ei: nimic de tăiat.
      assert.equal(rez.ok ? 'tăiată' : rez.motiv, 'nimic-taiat', mesaj);
      inGol++;
      continue;
    }
    if (!rez.ok) assert.fail(`${mesaj}: refuzat cu ${rez.motiv}`);
    assert.equal(rez.ids.length, 2, `${mesaj}: înăuntrul poligonului și în afara lui`);
    const x = dupa(d, rez, mesaj);
    const parti = rez.ids.map((pid) => formeInstanta(x, pid));
    assert.deepEqual(judecaCutitul({ inainte, cutit: formeInstanta(d, 'k'), parti, inchide: true, convex: v }), [], mesaj);
    if (pe) prinCale++;
    libere++;
  }
  assert.ok(libere >= 40, `bucle libere judecate: ${libere}`);
  assert.ok(prinCale >= 10 && libere - prinCale >= 10, `prin calea trasă: ${prinCale}, prin formă: ${libere - prinCale}`);
  assert.ok(inGol >= 3, `în gol sau în afară, verificat: ${inGol}`);
});

test('mâna liberă: o undă din multe puncte, netezită la 0,05 mm, taie formele; marginea nouă stă la toleranță de urmă', () => {
  const r = aleator(0x10_3f_3);
  let taieri = 0, nimic = 0;
  for (let caz = 0; caz < 40; caz++) {
    const id = `s${caz}`;
    const forma = formaCorpus(r, id, intre(r, 250, 750), intre(r, 250, 750));
    const inainte = formeInstanta(document([forma]), id);
    const c = cutie(inainte);
    // Din opt în opt, unda trece pe deasupra formei: nimic de tăiat.
    const A = intre(r, 2, 12), lambda = intre(r, 30, 90), faza = intre(r, 0, 2 * Math.PI);
    const cy = caz % 8 === 7 ? c.maxY + A + 5 : intre(r, c.minY, c.maxY);
    const urma: P[] = [];
    for (let x = c.minX - 10; x <= c.maxX + 10; x += 0.5) urma.push({ x, y: cy + A * Math.sin((2 * Math.PI * x) / lambda + faza) + intre(r, -0.01, 0.01) });
    const d = document([forma]);
    const inchide = r() < 0.6;
    const rez = taie(d, { cutit: { fel: 'cale', cale: caleDin(false, urma), netezire: 0.05 }, alese: [id], inchide });
    const mesaj = `cazul ${caz} (${inchide ? 'cu' : 'fără'} închidere)`;
    const cutit: FormaOracol[] = [{ inchis: false, seg: urma.slice(1).map((b, i) => ({ fel: 'L' as const, a: urma[i] as P, b })) }];
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      assert.ok(!inainte.some((f) => seTaie(linieFranta(f), urma)), `${mesaj}: forma trece urma, dar n-a fost tăiată`);
      nimic++;
      continue;
    }
    const x = dupa(d, rez, mesaj);
    const parti = rez.ids.map((pid) => formeInstanta(x, pid));
    assert.deepEqual(judecaCutitul({ inainte, cutit, parti, inchide, convex: null, tolCutit: 0.05 + 1e-6 }), [], mesaj);
    taieri++;
  }
  assert.ok(taieri >= 25, `tăieri judecate: ${taieri}`);
  assert.ok(nimic >= 1, `nimic de tăiat, verificat: ${nimic}`);
});

test('martorul oracolului: o buclă liberă pierdută (placa fără golul literei, sau litera lipsă) e prinsă', () => {
  const v = poligonRegulat({ x: 50, y: 30 }, 15, 6, 0);
  const d = docDin(stoc, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 } satisfies FormaDoc, matrice: { ...ID } },
    { id: 'k', forma: caleDin(true, v), matrice: { ...ID } });
  const rez = taie(d, { cutit: { fel: 'forme', ids: ['k'] }, alese: ['a'], inchide: true });
  if (!rez.ok) assert.fail(rez.motiv);
  const x = dupa(d, rez, 'martorul');
  const inainte = formeInstanta(d, 'a'), kf = formeInstanta(d, 'k');
  const [a, b] = rez.ids.map((pid) => formeInstanta(x, pid)) as [FormaOracol[], FormaOracol[]];
  assert.deepEqual(judecaCutitul({ inainte, cutit: kf, parti: [a, b], inchide: true, convex: v }), []);
  const faraGol = b.filter((f) => f.seg.length !== 6);
  assert.equal(faraGol.length, b.length - 1, 'placa are golul hexagonului');
  assert.notDeepEqual(judecaCutitul({ inainte, cutit: kf, parti: [a, faraGol], inchide: true, convex: v }), [], 'placa fără golul ei');
  assert.notDeepEqual(judecaCutitul({ inainte, cutit: kf, parti: [[], b], inchide: true, convex: v }), [], 'litera lipsă');
});
