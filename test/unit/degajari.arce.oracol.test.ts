/**
 * Oracolul degajărilor pe cazurile ADR 0135 (felia 3.V): colțurile cu o latură curbă, cu `test/oracles/degajari.ts` și
 * cazurile `CAZURI_DEG_0135` din `degajari.cazuri.ts`, scrise de mână:
 * - „(o) …”: oracolul singur, pe hârtie (colțurile, Q și E; colțurile fără Q; §5 cu avertismentele);
 * - „lipire: …”: programele aplicației pe 4 montaje, cu toată poarta (1, 2, 3, 5, 9–13), hârtia (cât intră într-un perete-arc,
 *   radial), avertismentele și „nimic altceva nu se schimbă”, ca la cazurile ADR 0134;
 * - „martor: …”: programul aplicației fără drumurile colțurilor cu arc (cum tăia înainte de ADR 0135) înroșește poarta (13,
 *   „lipsește drumul”) în fiecare colț, și acolo unde freza sosește pe arc; T-bone-ul cu crestătura în celălalt perete, la fel.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DocV8O } from '../oracles/document.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { avertismenteleCerute, colturiDeDegajat, comparaAvertismentele, judecaFoaia } from '../oracles/degajari.ts';
import { CAZURI_DEG_0135, martorDeg, martorScoate, type CazDeg, type CazDeg0135 } from '../oracles/degajari.cazuri.ts';
import type { Montaj } from '../oracles/regiune.cazuri.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { avertizat, colturileJudecate, COLTURI, ctxDoc, dist, faraColturi, geometria, hartieDeg, judeca, mesaje, primaDiferenta } from './ajutor-degajari.ts';

const R = 3;
const montaje = (c: CazDeg0135): Montaj[] => COLTURI.map((origine, k) => ({ foaie: c.stoc, origine, z0: k % 2 === 0 ? 'sus' : 'jos' }));
/** Ajutoarele cazurilor §8 citesc din document doar foaia și operațiile, la fel în v8 și în v9. */
const v8 = (c: CazDeg0135): DocV8O => c.doc as unknown as DocV8O;
/** Pe hârtie, un colț fără Q se judecă la fel ca unul omis: niciun drum lângă el, iar colțul rămâne netăiat. */
const caCaz = (c: CazDeg0135): CazDeg => ({ ...c, doc: v8(c), omise: [...c.omise, ...(c.faraQ ?? [])] });
const cazul = (prefix: string): CazDeg0135 => CAZURI_DEG_0135.find((c) => c.nume.startsWith(prefix))!;
const f3 = (v: number): string => v.toFixed(3);

for (const c of CAZURI_DEG_0135) {
  test(`(o) ADR 0135, colțurile de pe hârtie, Q și E, scrise de mână: ${c.nume}`, () => {
    const t = regiuneDinDocument(c.doc).taieturi.get('g/g')!;
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
    for (const V of c.faraQ ?? []) if (gasite.some((g) => dist(g.V, V) <= 1e-6)) rele.push(`colțul (${V.x}, ${V.y}) n-are Q pe hârtie, dar oracolul îi găsește unul`);
    assert.deepEqual(rele, []);
  });
}

test('(o) ADR 0135, §5 pe hârtie: pe fiecare caz, avertismentele cerute de judecata foii sunt exact cele scrise de mână, fără verdicte în bandă', () => {
  const rele: string[] = [];
  for (const c of CAZURI_DEG_0135) {
    const j = judecaFoaia(regiuneDinDocument(c.doc), R, c.stoc, new Map());
    for (const x of comparaAvertismentele(c.avertismente, avertismenteleCerute(j, R))) rele.push(`${c.nume.slice(0, 3)}: ${x}`);
    for (const lista of j.colturi.values()) for (const q of lista) if (q.verdict !== 'da') rele.push(`${c.nume.slice(0, 3)}: (${q.V.x}, ${q.V.y}) ${q.verdict}: ${q.motiv}`);
  }
  assert.deepEqual(rele, []);
});

for (const c of CAZURI_DEG_0135) {
  test(`lipire: ADR 0135, ${c.nume}: pe 4 montaje, toată poarta (1, 2, 3, 5, 9–13), hârtia, avertismentele; fără drumuri, exact geometria programului fără colturi`, async () => {
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
      for (const V of [...c.omise, ...(c.faraQ ?? [])]) if (!avertizat(r.avertismente, 'g/g', V)) rele.push(`${m.origine}: lipsește avertismentul colțului (${V.x}, ${V.y})`);
      const f = await programulAplicatiei(faraColturi(v8(c)), m);
      if (!f.ok) { rele.push(`${m.origine}: fără colturi, refuz: ${f.motiv}`); continue; }
      const dif = primaDiferenta(geometria(r.text, ctx), geometria(f.text));
      if (dif) rele.push(`${m.origine}: fără drumuri, geometria diferă de cea fără colturi: ${dif}`);
    }
    assert.deepEqual(rele, []);
  });
}

/**
 * Martorii: „D”-ul în ambele sensuri (sosirea pe arc e într-un colț, apoi în celălalt), umărul pe exterior și lentila (ambele
 * sosiri pe arc). Fără drumuri, fiecare colț cu sosire cere „lipsește drumul”.
 */
for (const nume of ['D39', 'D40', 'D42', 'D44']) {
  test(`martor: ADR 0135, ${nume}: fără drumurile colțurilor cu arc (cum tăia aplicația înainte), poarta e roșie pe 13 cu „lipsește drumul” în fiecare colț; programul aplicației e verde`, async () => {
    const c = cazul(nume);
    const m: Montaj = { foaie: c.stoc, origine: 'dreapta-sus', z0: 'jos' };
    const r = await programulAplicatiei(c.doc, m);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    if (!r.ok) return;
    const ctx = ctxDoc(v8(c), m);
    assert.deepEqual(judeca(r.text, ctx), [], 'programul aplicației');
    const rau = martorScoate(r.text, m, c.colturi);
    assert.notEqual(rau, r.text, 'martorul n-a scos niciun drum');
    const v = judeca(rau, ctx).filter((i) => i.invarianta === 13);
    const lipsa = c.colturi.filter((x) => !v.some((i) => /lipsește drumul/.test(i.mesaj) && i.mesaj.includes(`colțul (${f3(x.V.x)}, ${f3(x.V.y)})`)));
    assert.deepEqual(lipsa.map((x) => `(${x.V.x}, ${x.V.y})`), [], mesaje(v));
  });
}

test('martor: ADR 0135, D41: T-bone-ul „D”-ului cu crestătura în linie (peretele lung), nu în arc, înroșește poarta pe 13 (§3 cere E = V + (0, R))', async () => {
  const c = cazul('D41');
  const m: Montaj = { foaie: c.stoc, origine: 'stanga-jos', z0: 'sus' };
  const r = await programulAplicatiei(c.doc, m);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const rau = martorDeg(r.text, m, c.colturi, 'tbone-perete-scurt');
  assert.notEqual(rau, r.text, 'martorul n-a mutat niciun drum');
  const v = judeca(rau, ctxDoc(v8(c), m)).filter((i) => i.invarianta === 13);
  for (const x of c.colturi) assert.ok(v.some((i) => /§3 cere/.test(i.mesaj) && i.mesaj.includes(`colțul (${f3(x.V.x)}, ${f3(x.V.y)})`)), mesaje(v));
});
