/**
 * Oracolul degajărilor (ADR 0135, felia 3.V), lipirea pe corpusul colțurilor cu o latură curbă, din sămânță
 * (`corpusDegajariArce`): „D”-uri, umeri și scobituri, lentile și semiluni, poligoane cu laturi curbe și „D”-uri cu o
 * cubică, pe interior și pe exterior, rotite și oglindite, ambele sensuri, cu intrări, rampă sau urechi uneori, freze
 * Ø3,175 / Ø6 / Ø8. Pe fiecare program: toată poarta (1, 2, 3, 5, 9–13, viteza pe verticală); avertismentele = exact cele
 * cerute de judecata foii (motivele de la §5 și plasa „freza nu ajunge în colț”); un refuz are motiv și nu vine din degajări;
 * fără drumuri, programul are exact geometria celui fără `colturi`.
 *
 * PREEXISTENTE (ALEGERE, ca la corpusul 2.6): o încălcare care apare identic pe programul aceluiași document fără `colturi`
 * nu e a feliei: se numără și se spune, fără să pice testul.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citeste, type Punct3 } from '../oracles/gcode.ts';
import { laDocument, type Incalcare } from '../oracles/poarta.ts';
import type { DocV8O } from '../oracles/document.ts';
import { corpusDegajariArce } from '../oracles/degajari.cazuri.ts';
import { avertismenteleCerute, comparaAvertismentele, drumuriDusIntors } from '../oracles/degajari.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { colturileJudecate, ctxDoc, faraColturi, geometria, judeca, mesaje, primaDiferenta } from './ajutor-degajari.ts';

const cheie = (i: Incalcare): string => `${i.invarianta}|${i.mesaj}`;

test('lipire: ADR 0135, corpusul colțurilor cu arce (din sămânță): orice program trece toată poarta; avertismentele sunt exact cele cerute; refuzurile au motiv și nu vin din degajări; fără drumuri, geometria e a programului fără colturi', async () => {
  const rele: string[] = [];
  let programe = 0, refuzuri = 0, drumuri = 0, curbe = 0, curbePastrate = 0, curbeOmise = 0, plase = 0, sosiriArc = 0, tee = 0, dogb = 0, banda = 0;
  const preexistente: string[] = [];
  const familii = new Map<string, number>();
  const motive: string[] = [];
  const motiveCurbe = new Map<string, number>();
  for (const caz of corpusDegajariArce(0x3500, 120)) {
    const m = { origine: caz.origine, z0: caz.z0 };
    const doc8 = caz.doc as unknown as DocV8O;
    const r = await programulAplicatiei(caz.doc, m);
    const f = await programulAplicatiei(faraColturi(doc8), m);
    if (!r.ok) {
      refuzuri++;
      motive.push(`${caz.nume}: ${r.motiv.slice(0, 90)}`);
      if (!r.motiv.trim()) rele.push(`${caz.nume}: refuz fără motiv`);
      if (f.ok) rele.push(`${caz.nume}: refuzat doar cu degajări: ${r.motiv}`);
      continue;
    }
    programe++;
    familii.set(caz.familie, (familii.get(caz.familie) ?? 0) + 1);
    if (!f.ok) { rele.push(`${caz.nume}: fără colturi e refuzat (${f.motiv}), cu colturi nu`); continue; }
    const ctx = ctxDoc(doc8, m);
    const stiute = new Set(judeca(f.text, ctxDoc(faraColturi(doc8), m)).map(cheie));
    const v = judeca(r.text, ctx).filter((i) => {
      if (!stiute.has(cheie(i))) return true;
      preexistente.push(`${caz.nume}: [${i.invarianta}] ${i.mesaj.slice(0, 120)}`);
      return false;
    });
    if (v.length) rele.push(`${caz.nume} (${m.origine}, ${m.z0}): ${mesaje(v.slice(0, 3))}`);
    const dif = primaDiferenta(geometria(r.text, ctx), geometria(f.text));
    if (dif) rele.push(`${caz.nume}: fără drumuri, geometria diferă de cea fără colturi: ${dif}`);
    const j = colturileJudecate(r.text, ctx);
    drumuri += j.drumuri;
    for (const lista of j.pe.values()) {
      for (const c of lista) {
        if (c.tip === 't-bone') tee++; else dogb++;
        if (c.verdict === 'banda') banda++;
        if (!c.peretiIntrare) continue;
        curbe++;
        if (c.verdict === 'da') curbePastrate++;
        else if (c.verdict === 'nu') { curbeOmise++; motiveCurbe.set(c.rezultate[0]!, (motiveCurbe.get(c.rezultate[0]!) ?? 0) + 1); }
      }
    }
    for (const x of comparaAvertismentele(r.avertismente, avertismenteleCerute(j.judecata, caz.D / 2))) rele.push(`${caz.nume}: ${x}`);
    plase += (r.avertismente ?? []).filter((a) => /freza nu ajunge în colț/.test(a)).length;
    // Sosirile pe arc: mișcarea de dinaintea unui drum e G2 / G3.
    const { evenimente } = citeste(r.text);
    for (const d of drumuriDusIntors(evenimente, (q: Punct3) => laDocument(q, ctx))) {
      for (let k = d.ev[0] - 1; k >= 0; k--) {
        const e = evenimente[k]!;
        if (e.tip !== 'mutare') continue;
        if (e.m.cod === 2 || e.m.cod === 3) sosiriArc++;
        break;
      }
    }
  }
  console.log(`corpusul ADR 0135: ${programe} programe, ${refuzuri} refuzuri, ${drumuri} drumuri; colțuri curbe ${curbe} (${curbePastrate} păstrate, ${curbeOmise} omise), ${plase} plase, ${sosiriArc} sosiri pe arc; ${tee} T-bone, ${dogb} dog-bone, ${banda} în bandă; familii ${[...familii].map(([k, n]) => `${k} ${n}`).join(', ')}`);
  console.log(`colțurile curbe omise: ${[...motiveCurbe].map(([k, n]) => `${k} ${n}`).join(', ') || 'niciunul'}`);
  if (motive.length) console.log(`refuzuri: ${motive.join(' | ')}`);
  if (preexistente.length) console.log(`preexistente (${preexistente.length}): ${preexistente.slice(0, 6).join(' | ')}`);
  assert.deepEqual(rele, []);
  // Corpusul chiar acoperă ce judecă (altfel o poartă verde n-ar spune nimic).
  assert.ok(programe >= 36 && curbePastrate >= 40 && curbeOmise + plase >= 4 && sosiriArc >= 20 && tee >= 20 && dogb >= 20, `${programe} programe, ${curbePastrate} / ${curbeOmise} / ${plase}, ${sosiriArc} sosiri pe arc, ${tee} / ${dogb}`);
  assert.ok([...familii.values()].length === 6, `familiile: ${[...familii.keys()].join(', ')}`);
});
