/**
 * Foarfeca și Retează (ADR 0181 §4, §5; felia 10.3↑g), judecate de oracolul independent (`test/oracles/taiere.ts`) pe
 * corpusuri din sămânță: formele corpusului liniei (dreptunghiuri, cercuri, poligoane, cubice, arce, căi deschise, inele), la
 * rotiri oarecare, cu clicul într-un punct oarecare al unui contur:
 * - **foarfeca**: formele de după acoperă exact formele de dinainte, cu aceeași lungime; tăietura stă la clic; un contur închis
 *   devine o cale, unul deschis două;
 * - **retezatul**, cu una sau două linii care trec forma: nimic inventat, punctul de sub clic scos, bucata scoasă nu trece de
 *   niciun loc comun, iar capetele noi stau chiar în locurile comune.
 * Martorul arată că oracolul prinde o bucată scoasă prea lungă și una prea scurtă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, FormaDoc, Instanta, Piesa, VarfDoc } from '../../src/model/document.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type RezultatTaiere } from '../../src/model/taiere.ts';
import { esantioane, formeInstanta, judecaFoarfeca, judecaRetezarea, type FormaOracol } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, document, formaCorpus, intre, stoc } from './ajutor-taiere.ts';

type P = { readonly x: number; readonly y: number };
const L = { tip: 'L' } as const;
const linie = (id: string, a: P, b: P) => {
  const d = docDin(stoc, { id, forma: { tip: 'cale', inchis: false, varfuri: [a, b].map((p): VarfDoc => ({ p: { x: p.x, y: p.y }, s: L })) } satisfies FormaDoc, matrice: { ...ID } });
  return { piesa: d.piese[0] as Piesa, instanta: d.foi[0]?.instante[0] as Instanta };
};

function dupa(d: Document, r: Extract<RezultatTaiere, { ok: true }>, mesaj: string): Document {
  const foaie = d.foi[0];
  assert.ok(foaie);
  let x = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }).doc;
  if (r.sterse.length > 0) {
    const s = new Set(r.sterse);
    x = { ...x, foi: x.foi.map((f) => ({ ...f, instante: f.instante.filter((i) => !s.has(i.id)) })) };
  }
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(x))), `${mesaj}: documentul de după trece de ușă`);
  return x;
}

/** Un punct oarecare de pe conturul ales (eșantioanele, fără capetele unei căi deschise). */
function punctPe(r: () => number, f: FormaOracol): P {
  const q = esantioane(f, 8);
  const interior = f.inchis ? q : q.slice(2, -2);
  return interior[Math.floor(r() * interior.length)] as P;
}

test('foarfeca, pe corpusul din sămânță: acoperirea exactă, aceeași lungime, tăietura la clic, o cale sau două', () => {
  const r = aleator(0x10_3a_1);
  let taieri = 0, inchise = 0, deschise = 0;
  for (let caz = 0; caz < 80; caz++) {
    const id = `s${caz}`;
    const forma = formaCorpus(r, id, intre(r, 250, 750), intre(r, 250, 750));
    const d = document([forma]);
    const inainte = formeInstanta(d, id);
    const f = inainte[Math.floor(r() * inainte.length)] as FormaOracol;
    if (!f.inchis && f.seg.length === 0) continue;
    const q = punctPe(r, f);
    const rez = taie(d, { cutit: { fel: 'foarfeca', id, punct: q, toleranta: 0.5 }, alese: [id], inchide: false });
    const mesaj = `cazul ${caz} (${f.inchis ? 'închis' : 'deschis'})`;
    if (!rez.ok) assert.fail(`${mesaj}: refuzat cu ${rez.motiv}`);
    const x = dupa(d, rez, mesaj);
    const noi = rez.ids.flatMap((pid) => formeInstanta(x, pid));
    assert.deepEqual(judecaFoarfeca({ inainte, dupa: noi, punct: q, tol: 0.5 }), [], mesaj);
    taieri++;
    if (f.inchis) inchise++;
    else deschise++;
  }
  assert.ok(taieri >= 70 && inchise >= 40 && deschise >= 5, `tăieri: ${taieri} (${inchise} închise, ${deschise} deschise)`);
});

test('retezatul, pe corpusul din sămânță, cu una sau două linii peste formă: bucata dintre locurile comune, și doar ea', () => {
  const r = aleator(0x10_3a_2);
  let taieri = 0, plecate = 0, cuLocuri = 0;
  for (let caz = 0; caz < 80; caz++) {
    const id = `s${caz}`;
    const cx = intre(r, 250, 750), cy = intre(r, 250, 750);
    const forma = formaCorpus(r, id, cx, cy);
    const alte = Array.from({ length: 1 + Math.floor(r() * 2) }, (_, k) => {
      const u = intre(r, 0, Math.PI), o = intre(r, -40, 40);
      const n = { x: -Math.sin(u), y: Math.cos(u) }, t = { x: Math.cos(u), y: Math.sin(u) };
      const m = { x: cx + n.x * o, y: cy + n.y * o };
      return linie(`l${caz}_${k}`, { x: m.x - 150 * t.x, y: m.y - 150 * t.y }, { x: m.x + 150 * t.x, y: m.y + 150 * t.y });
    });
    const d = document([forma, ...alte]);
    const ids = [id, ...alte.map((x) => x.instanta.id)];
    const inainte = formeInstanta(d, id);
    const f = inainte[Math.floor(r() * inainte.length)] as FormaOracol;
    if (!f.inchis && f.seg.length === 0) continue;
    const q = punctPe(r, f);
    const rez = taie(d, { cutit: { fel: 'reteaza', id, punct: q, toleranta: 0.5 }, alese: ids, inchide: false });
    const mesaj = `cazul ${caz} (${f.inchis ? 'închis' : 'deschis'}, ${alte.length} linii)`;
    if (!rez.ok) assert.fail(`${mesaj}: refuzat cu ${rez.motiv}`);
    const x = dupa(d, rez, mesaj);
    const ramase = rez.ids.flatMap((pid) => formeInstanta(x, pid));
    const alteForme = alte.flatMap((a) => formeInstanta(d, a.instanta.id));
    // Celelalte contururi ale aceleiași piese (gaura unui inel) taie și ele.
    const surori = inainte.filter((g) => g !== f);
    assert.deepEqual(judecaRetezarea({ inainte, dupa: ramase, alte: [...alteForme, ...surori], punct: q }), [], mesaj);
    for (const a of alte) assert.deepEqual(formeInstanta(x, a.instanta.id), formeInstanta(d, a.instanta.id), `${mesaj}: liniile rămân`);
    taieri++;
    if (rez.sterse.length > 0) plecate++;
    else cuLocuri++;
  }
  assert.ok(taieri >= 70 && cuLocuri >= 40 && plecate >= 1, `retezări: ${taieri} (${cuLocuri} între locuri comune, ${plecate} plecate de tot)`);
});

test('martorul oracolului: o bucată scoasă prea lungă (trece de un loc comun) sau prea scurtă (capătul în aer) e prinsă', () => {
  // Linia (0, 0)–(100, 0) cu verticalele x = 40 și x = 80; clicul în (60, 0): se scoate (40, 0)–(80, 0).
  const d = document([linie('h', { x: 0, y: 0 }, { x: 100, y: 0 }), linie('a', { x: 40, y: -20 }, { x: 40, y: 20 }), linie('b', { x: 80, y: -20 }, { x: 80, y: 20 })]);
  const rez = taie(d, { cutit: { fel: 'reteaza', id: 'h', punct: { x: 60, y: 0 }, toleranta: 0.5 }, alese: ['h', 'a', 'b'], inchide: false });
  if (!rez.ok) assert.fail(rez.motiv);
  const x = dupa(d, rez, 'martorul');
  const inainte = formeInstanta(d, 'h'), alte = [...formeInstanta(d, 'a'), ...formeInstanta(d, 'b')];
  const bune = rez.ids.flatMap((pid) => formeInstanta(x, pid));
  assert.equal(bune.length, 2, 'două bucăți rămase: (0, 0)–(40, 0) și (80, 0)–(100, 0)');
  assert.deepEqual(judecaRetezarea({ inainte, dupa: bune, alte, punct: { x: 60, y: 0 } }), []);
  const seg = (a: P, b: P): FormaOracol => ({ inchis: false, seg: [{ fel: 'L', a, b }] });
  const preaLunga = [seg({ x: 0, y: 0 }, { x: 20, y: 0 }), seg({ x: 80, y: 0 }, { x: 100, y: 0 })];
  assert.notDeepEqual(judecaRetezarea({ inainte, dupa: preaLunga, alte, punct: { x: 60, y: 0 } }), [], 'trece de locul comun din x = 40');
  const preaScurta = [seg({ x: 0, y: 0 }, { x: 50, y: 0 }), seg({ x: 80, y: 0 }, { x: 100, y: 0 })];
  assert.notDeepEqual(judecaRetezarea({ inainte, dupa: preaScurta, alte, punct: { x: 60, y: 0 } }), [], 'capătul în aer, în x = 50');
  assert.notDeepEqual(judecaFoarfeca({ inainte, dupa: inainte, punct: { x: 60, y: 0 }, tol: 0.5 }), [], 'nimic tăiat');
});
