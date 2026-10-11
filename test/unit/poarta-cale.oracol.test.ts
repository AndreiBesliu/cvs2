/**
 * CAM-ul pe căi, de la document la G-code (ADR 0034 §6 și §9; felia 2.7b, sesiune independentă): corpusul din
 * `test/oracles/poarta-cale.cazuri.ts` (căi din linii, arce și cubice, pe `exterior` / `interior` / `pe-linie`, cu
 * urechi, rampă, intrări și degajări, sub similitudini și o forfecare, o gaură-cale într-o piesă-cale) dat aplicației prin
 * ușă și exportat (`calculeazaExport`, prin `ajutor-lipire.ts`), apoi judecat:
 * - TOATĂ poarta (`poarta.ts`, fără filtru: 1, 2, 3, 5, 6, 7, 9–13 și viteza pe verticală), cu regiunea din document
 *   (`regiuneDinDocument` pe v9: conturul exact al căii, măsura mea) și invarianta 2 pe căi;
 * - abaterea în ambele sensuri (`poarta-cale.ts`): fiecare punct al buclei la R ± `BUGET_CALE` de calea exactă, și
 *   fiecare punct atins al căii acoperit de buclă; pe fiecare tăietură a unei căi, cel puțin o buclă măsurată;
 * - colțurile de degajat (ADR 0032 pe o cale: doar L–L, pe partea deșeului), numărate pe hârtie în cazuri, față de cele
 *   judecate de oracol; avertismentele de degajare omisă, exact cele cerute;
 * - perechile care se ating: regiunea oracolului vede atingerea, iar exportul e refuzat cu motivul `regiunea păstrată:`
 *   (ADR 0026 §8).
 * Martorii negativi (`(m)`): transformări deliberate ale unui program al aplicației (mutat cu 0,02 mm, arcele înlocuite
 * de corzi, o mișcare lipsă, bucla interiorului dată drept exterior), fiecare prinsă de abatere sau de poartă: dovada că
 * verificările de mai sus nu trec în gol. Maximele abaterilor se raportează la sfârșit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { colturileJudecate, ctxDoc, mesaje, SCHEMA } from './ajutor-degajari.ts';
import { laDocument, poarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { avertismenteleCerute, comparaAvertismentele } from '../oracles/degajari.ts';
import { BUGET_CALE, masoaraCaile } from '../oracles/poarta-cale.ts';
import { CAZURI_POARTA_CALE } from '../oracles/poarta-cale.cazuri.ts';
import type { DocV8O } from '../oracles/document.ts';

const DOAR_V9 = SCHEMA >= 9 ? false : `aplicația e pe schema ${SCHEMA}; căile cer v9 (ADR 0034)`;
const rezumat: string[] = [];
let maxInainte = 0, maxAcoperire = 0;

for (const caz of CAZURI_POARTA_CALE) {
  test(`(c) ${caz.nume} (${caz.montaj.origine}, Z0 ${caz.montaj.z0})`, { skip: DOAR_V9 }, async () => {
    const reg = regiuneDinDocument(caz.doc);
    const r = await programulAplicatiei(caz.doc, caz.montaj);
    if (caz.atingere) {
      const vazuta = reg.probleme.some((p) => p.tip === 'atingere' && caz.atingere!.every((id) => p.elemente.includes(id)));
      assert.ok(vazuta, `oracolul nu vede atingerea ${caz.atingere.join(' – ')}: ${JSON.stringify(reg.probleme)}`);
      if (r.ok) return assert.fail('aplicația a exportat un document cu inele care se ating');
      assert.ok(r.motiv.startsWith('regiunea păstrată:'), `motivul nu e al regiunii (ADR 0026 §8): ${r.motiv}`);
      rezumat.push(`${caz.nume}: refuzat (${r.motiv.slice(0, 100)})`);
      return;
    }
    assert.deepEqual(reg.probleme, [], 'oracolul: regiunea documentului are probleme');
    if (!r.ok) return assert.fail(`exportul a refuzat: ${r.motiv}`);
    const ctx = ctxDoc(caz.doc as unknown as DocV8O, caz.montaj);
    const rele: string[] = [];
    const v = poarta(r.text, ctx);
    if (v.length) rele.push(`poarta: ${mesaje(v.slice(0, 4))}`);
    const R = caz.D / 2;
    const masuri = masoaraCaile(r.text, caz.doc, reg, R, (q) => laDocument(q, ctx));
    const cai = [...reg.taieturi].filter(([, t]) => t.tip === 'cale').flatMap(([id, t]) => [...t.laturi.keys()].map((l) => `${id}|${l}`));
    for (const k of cai) {
      const m = masuri.find((x) => `${x.idLume}|${x.latura}` === k);
      if (!m || m.bucle === 0) { rele.push(`${k}: nicio buclă închisă măsurată (${m ? `${m.faraBucla} lanțuri fără buclă` : 'nicio etichetă'})`); continue; }
      rele.push(...m.rele.map((x) => `${k}: ${x}`));
      if (m.acoperite < 50) rele.push(`${k}: doar ${m.acoperite} puncte ale căii judecate la acoperire`);
      maxInainte = Math.max(maxInainte, m.maxInainte);
      maxAcoperire = Math.max(maxAcoperire, m.maxAcoperire);
      rezumat.push(`${caz.nume} ${k}: ${m.bucle} bucle; înainte ${m.maxInainte.toFixed(5)}, acoperire ${m.maxAcoperire.toFixed(5)} (${m.acoperite} puncte, ${m.sarite} sărite)`);
    }
    const j = colturileJudecate(r.text, ctx);
    const asteptate = caz.colturi ?? {};
    for (const [id, lista] of j.pe) if (!(id in asteptate)) rele.push(`${id}: ${lista.length} colțuri judecate, hârtia nu cere niciunul`);
    for (const [id, n] of Object.entries(asteptate)) {
      const lista = j.pe.get(id) ?? [];
      if (lista.length !== n) rele.push(`${id}: ${lista.length} colțuri judecate (${lista.map((c) => `(${c.V.x.toFixed(2)}, ${c.V.y.toFixed(2)}) ${c.verdict}`).join('; ')}), hârtia cere ${n}`);
    }
    for (const x of comparaAvertismentele(r.avertismente, avertismenteleCerute(j.judecata, R))) rele.push(`avertismente: ${x}`);
    assert.deepEqual(rele, []);
  });
}

/** Un program transformat linie cu linie (null = linia scoasă). */
const muta = (text: string, f: (linie: string) => string | null): string => text.split('\n').map(f).filter((l): l is string => l !== null).join('\n');

test('(m) martorii negativi: abaterea prinde programul mutat, corzile și bucla de pe partea greșită; mișcarea lipsă e prinsă de poartă sau de abatere', { skip: DOAR_V9 }, async () => {
  const caz = CAZURI_POARTA_CALE.find((c) => c.nume.startsWith('C01'))!;
  const r = await programulAplicatiei(caz.doc, caz.montaj);
  if (!r.ok) return assert.fail(r.motiv);
  const reg = regiuneDinDocument(caz.doc);
  const ctx = ctxDoc(caz.doc as unknown as DocV8O, caz.montaj);
  const R = caz.D / 2;
  const judecat = (text: string): { readonly poarta: number[]; readonly abatere: string[] } => ({
    poarta: [...new Set(poarta(text, ctx).map((i) => i.invarianta))],
    abatere: masoaraCaile(text, caz.doc, reg, R, (q) => laDocument(q, ctx)).flatMap((m) => (m.bucle === 0 ? ['nicio buclă'] : m.rele)),
  });
  const curat = judecat(r.text);
  assert.deepEqual(curat, { poarta: [], abatere: [] }, 'programul aplicației, netransformat');
  // Bucla interiorului aceleiași căi, cu etichetele rescrise „exterior”: la R de cale, dar pe partea piesei.
  const interior = structuredClone(caz.doc);
  for (const pz of interior.piese) for (const o of pz.operatii) o.latura = 'interior';
  const ri = await programulAplicatiei(interior, caz.montaj);
  if (!ri.ok) return assert.fail(ri.motiv);
  let n = 0;
  const martori: ReadonlyArray<{ readonly nume: string; readonly text: string; readonly abatere: boolean }> = [
    { nume: 'M1 mutat cu 0,02 mm pe X', abatere: true, text: muta(r.text, (l) => (/^G[0-3] .*X-?\d/.test(l) ? l.replace(/X(-?\d+\.\d+)/, (_, x: string) => `X${(Number(x) + 0.02).toFixed(3)}`) : l)) },
    { nume: 'M2 arcele înlocuite de corzi', abatere: true, text: muta(r.text, (l) => (/^G[23] /.test(l) ? l.replace(/^G[23] /, 'G1 ').replace(/ I-?\d+\.\d+/, '').replace(/ J-?\d+\.\d+/, '') : l)) },
    { nume: 'M3 a 12-a mișcare în arc lipsește', abatere: false, text: muta(r.text, (l) => (/^G[23] /.test(l) && ++n === 12 ? null : l)) },
    { nume: 'M4 bucla interiorului, etichetată exterior', abatere: true, text: ri.text.replaceAll(', interior, ', ', exterior, ') },
  ];
  const rele: string[] = [];
  for (const m of martori) {
    assert.notEqual(m.text, r.text, `${m.nume}: transformarea n-a schimbat nimic`);
    const j = judecat(m.text);
    rezumat.push(`${m.nume}: poarta [${j.poarta.join(', ')}], abaterea ${j.abatere.length ? `prinde (${j.abatere[0]!.slice(0, 90)})` : 'nu prinde'}`);
    if (m.abatere && j.abatere.length === 0) rele.push(`${m.nume}: abaterea nu-l prinde`);
    if (j.abatere.length === 0 && j.poarta.length === 0) rele.push(`${m.nume}: nici poarta, nici abaterea nu-l prind`);
  }
  assert.deepEqual(rele, []);
});

test('raport: abaterile pe căi (bugetul §6 și maximele măsurate)', { skip: DOAR_V9 }, () => {
  console.log(`buget ${BUGET_CALE.toFixed(5)} mm; maxim înainte ${maxInainte.toFixed(5)}, acoperire ${maxAcoperire.toFixed(5)}`);
  for (const l of rezumat) console.log(`  ${l}`);
});
