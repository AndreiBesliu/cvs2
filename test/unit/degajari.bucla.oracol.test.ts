/**
 * Oracolul degajărilor pe cazurile ADR 0134 (felia 3.U): pereții piesei (d) și degajările aceleiași bucle (e), cu
 * `test/oracles/degajari.ts` și cazurile `CAZURI_DEG_0134` din `degajari.cazuri.ts`, scrise de mână:
 * - „(o) …”: oracolul singur, pe hârtie (colțurile, Q și E; §5 cu avertismentele);
 * - „lipire: …”: programele aplicației pe 4 montaje, cu toată poarta (1, 2, 3, 5, 9–13), hârtia, avertismentele și „nimic
 *   altceva nu se schimbă”, ca la cazurile §8 (`degajari.oracol.test.ts`);
 * - „martor: …”: programul aplicației cu drumurile puse înapoi în colțurile omise (cum tăia înainte de ADR 0134) înroșește
 *   poarta (13), cu motivul d sau e.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DocV8O } from '../oracles/document.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { avertismenteleCerute, colturiDeDegajat, comparaAvertismentele, judecaFoaia } from '../oracles/degajari.ts';
import { CAZURI_DEG, CAZURI_DEG_0134, corpusDegajari, martorAdauga, type CazDeg, type CazDeg0134, type ColtHartie } from '../oracles/degajari.cazuri.ts';
import type { Montaj } from '../oracles/regiune.cazuri.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import {
  avertizat, colturileJudecate, COLTURI, ctxDoc, dist, faraColturi, geometria, hartieDeg, judeca, mesaje, primaDiferenta, sha,
} from './ajutor-degajari.ts';

const R = 3;
const montaje = (c: CazDeg0134): Montaj[] => COLTURI.map((origine, k) => ({ foaie: c.stoc, origine, z0: k % 2 === 0 ? 'sus' : 'jos' }));
/** Ajutoarele cazurilor §8 citesc din document doar foaia și operațiile, la fel în v8 și în v9. */
const v8 = (c: CazDeg0134): DocV8O => c.doc as unknown as DocV8O;
const caCaz = (c: CazDeg0134): CazDeg => ({ ...c, doc: v8(c) });
const cazul = (prefix: string): CazDeg0134 => CAZURI_DEG_0134.find((c) => c.nume.startsWith(prefix))!;

for (const c of CAZURI_DEG_0134) {
  test(`(o) ADR 0134, colțurile de pe hârtie, Q și E, scrise de mână: ${c.nume}`, () => {
    const reg = regiuneDinDocument(c.doc);
    const t = reg.taieturi.get('g/g')!;
    const op = c.doc.piese[0]!.operatii[0]!;
    assert.ok(op.latura === 'exterior' || op.latura === 'interior');
    if (op.latura !== 'exterior' && op.latura !== 'interior') return;
    const gasite = colturiDeDegajat(t.contur!, op.latura, op.sens, R, op.colturi!.tip);
    const rele: string[] = [];
    if (gasite.length !== c.colturi.length + c.omise.length) rele.push(`${gasite.length} colțuri, nu ${c.colturi.length + c.omise.length}`);
    for (const x of c.colturi) {
      const g = gasite.find((q) => dist(q.V, x.V) <= 1e-9);
      if (!g) { rele.push(`lipsește colțul (${x.V.x}, ${x.V.y})`); continue; }
      if (dist(g.Q, x.Q) > 1e-9) rele.push(`(${x.V.x}, ${x.V.y}): Q (${g.Q.x}, ${g.Q.y}), nu (${x.Q.x}, ${x.Q.y})`);
      if (dist(g.E, x.E) > 1e-9) rele.push(`(${x.V.x}, ${x.V.y}): E (${g.E.x}, ${g.E.y}), nu (${x.E.x}, ${x.E.y})`);
    }
    for (const V of c.omise) if (!gasite.some((g) => dist(g.V, V) <= 1e-9)) rele.push(`colțul omis (${V.x}, ${V.y}) nu e colț de degajat`);
    assert.deepEqual(rele, []);
  });
}

test('(o) ADR 0134, §5 pe hârtie: pe fiecare caz, avertismentele cerute de judecata foii (cu d și e) sunt exact cele scrise de mână, fără verdicte în bandă', () => {
  const rele: string[] = [];
  for (const c of CAZURI_DEG_0134) {
    const j = judecaFoaia(regiuneDinDocument(c.doc), R, c.stoc, new Map());
    for (const x of comparaAvertismentele(c.avertismente, avertismenteleCerute(j, R))) rele.push(`${c.nume.slice(0, 3)}: ${x}`);
    for (const lista of j.colturi.values()) for (const q of lista) if (q.verdict === 'banda') rele.push(`${c.nume.slice(0, 3)}: (${q.V.x}, ${q.V.y}) la limită: ${q.motiv}`);
  }
  assert.deepEqual(rele, []);
});

for (const c of CAZURI_DEG_0134) {
  test(`lipire: ADR 0134, ${c.nume}: pe 4 montaje, toată poarta (1, 2, 3, 5, 9–13), hârtia, avertismentele; fără drumuri, exact geometria programului fără colturi`, async () => {
    const rele: string[] = [];
    for (const [k, m] of montaje(c).entries()) {
      const r = await programulAplicatiei(c.doc, m);
      if (!r.ok) { rele.push(`${m.origine}: refuz: ${r.motiv}`); continue; }
      const ctx = ctxDoc(v8(c), m);
      const v = judeca(r.text, ctx);
      if (v.length) rele.push(`${m.origine} ${m.z0}: ${mesaje(v.slice(0, 3))}`);
      for (const h of hartieDeg(caCaz(c), r.text, m, k === 0)) rele.push(`${m.origine} ${m.z0} (hârtia): ${h}`);
      const av = (r.avertismente ?? []).filter((a) => /degajarea omisă|colțul rotunjit/.test(a));
      if (JSON.stringify([...av].sort()) !== JSON.stringify([...c.avertismente].sort())) rele.push(`${m.origine}: avertismentele ${JSON.stringify(av)}, nu ${JSON.stringify(c.avertismente)}`);
      for (const x of comparaAvertismentele(r.avertismente, avertismenteleCerute(colturileJudecate(r.text, ctx).judecata, R))) rele.push(`${m.origine} (oracolul): ${x}`);
      for (const V of c.omise) if (!avertizat(r.avertismente, 'g/g', V)) rele.push(`${m.origine}: lipsește avertismentul colțului omis (${V.x}, ${V.y})`);
      const f = await programulAplicatiei(faraColturi(v8(c)), m);
      if (!f.ok) { rele.push(`${m.origine}: fără colturi, refuz: ${f.motiv}`); continue; }
      const dif = primaDiferenta(geometria(r.text, ctx), geometria(f.text));
      if (dif) rele.push(`${m.origine}: fără drumuri, geometria diferă de cea fără colturi: ${dif}`);
    }
    assert.deepEqual(rele, []);
  });
}

/**
 * ADR 0134 §1: unde nu pică nici d, nici e, programul și avertismentele rămân aceleași, octet cu octet. Amprentele
 * programelor CU degajări (textul, apoi avertismentele) pe corpusul 2.6 și pe cazurile §8, pe 4 montaje, socotite pe
 * `46abd2a` (de dinainte de ADR 0134), într-o clonă curată: familia → [câte programe, sha256 al șirului de sha256].
 */
const AMPRENTE_0134: Readonly<Record<'corpus' | 'cazuri', readonly [number, string]>> = {
  corpus: [110, '499f3487694116aab6a2f2f7b878ae25ce635afcdb506eef85585414607dde61'],
  cazuri: [104, '5140484e6de93562b9c6f62e5f62734b8e0de9a44aed19f730a1518f5162de00'],
};

test('lipire: ADR 0134 §1: programele cu degajări ale corpusului 2.6 și ale cazurilor §8 (cu avertismentele lor, 53 de programe cu colțuri omise) sunt, octet cu octet, cele de pe 46abd2a', async () => {
  type R = Awaited<ReturnType<typeof programulAplicatiei>>;
  // ADR 0135 §6 a schimbat doar textul avertismentului arcelor sub rază; amprenta îl citește în forma de pe 46abd2a.
  const caPe46abd2a = (a: string): string => a.replace('; o degajare cere un colț ascuțit în desen', '; degajarea pe arce vine cu importul SVG');
  const amprenta = (r: R): string => sha(r.ok ? `${r.text}\n--\n${(r.avertismente ?? []).map(caPe46abd2a).join('\n')}` : `REFUZ: ${r.motiv}`);
  const corpus: string[] = [], cazuri: string[] = [];
  for (const c of corpusDegajari(0x2600, 110)) corpus.push(amprenta(await programulAplicatiei(c.doc, { origine: c.origine, z0: c.z0 })));
  for (const c of CAZURI_DEG) for (const [k, origine] of COLTURI.entries()) cazuri.push(amprenta(await programulAplicatiei(c.doc, { origine, z0: k % 2 ? 'jos' : 'sus' })));
  assert.deepEqual({ corpus: [corpus.length, sha(corpus.join('\n'))], cazuri: [cazuri.length, sha(cazuri.join('\n'))] }, AMPRENTE_0134);
});

/** Colțurile omise ale cazurilor, cu drumul pe care l-ar fi tăiat înainte de ADR 0134 (Q și E pe hârtie). */
const INAINTE: ReadonlyArray<{ readonly caz: string; readonly motiv: RegExp; readonly colturi: readonly ColtHartie[] }> = [
  {
    caz: 'D27', motiv: /d \(drumul e la 2\.000 mm de peretele/, colturi: [
      { forma: 'g', V: { x: 78, y: 35 }, Q: { x: 75, y: 38 }, E: { x: 78, y: 38 }, inOrizontal: 0, inVertical: 3, nOrizontal: { x: 0, y: 1 }, nVertical: { x: -1, y: 0 } },
      { forma: 'g', V: { x: 80, y: 35 }, Q: { x: 83, y: 38 }, E: { x: 80, y: 38 }, inOrizontal: 0, inVertical: 3, nOrizontal: { x: 0, y: 1 }, nVertical: { x: 1, y: 0 } },
    ],
  },
  {
    caz: 'D28', motiv: /e \(drumul e la 6\.000 mm de drumul colțului/, colturi: [
      { forma: 'g', V: { x: 78, y: 35 }, Q: { x: 75, y: 38 }, E: { x: 78, y: 38 }, inOrizontal: 0, inVertical: 3, nOrizontal: { x: 0, y: 1 }, nVertical: { x: -1, y: 0 } },
      { forma: 'g', V: { x: 84, y: 35 }, Q: { x: 87, y: 38 }, E: { x: 84, y: 38 }, inOrizontal: 0, inVertical: 3, nOrizontal: { x: 0, y: 1 }, nVertical: { x: 1, y: 0 } },
    ],
  },
];

for (const w of INAINTE) {
  test(`martor: ADR 0134, ${w.caz}: drumurile puse înapoi în colțurile de la baza limbii (cum tăia aplicația înainte) înroșesc poarta pe 13, cu motivul ${w.caz === 'D27' ? 'd' : 'e'}; programul aplicației e verde`, async () => {
    const c = cazul(w.caz);
    const m: Montaj = { foaie: c.stoc, origine: 'dreapta-sus', z0: 'jos' };
    const r = await programulAplicatiei(c.doc, m);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    if (!r.ok) return;
    const ctx = ctxDoc(v8(c), m);
    assert.deepEqual(judeca(r.text, ctx), [], 'programul aplicației');
    const rau = martorAdauga(r.text, m, w.colturi);
    assert.notEqual(rau, r.text, 'martorul n-a adăugat niciun drum');
    const v = judeca(rau, ctx).filter((i) => i.invarianta === 13);
    assert.ok(v.some((i) => /trebuia omis/.test(i.mesaj) && w.motiv.test(i.mesaj)), mesaje(v));
  });
}
