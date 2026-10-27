/**
 * Oracolul degajărilor colțurilor (ADR 0032, felia 2.6; sesiune independentă): `test/oracles/degajari.ts` (poarta:
 * invarianta 13, 2 și 9–12 amendate; hârtia: Q, E, lungimea, restul în colț, cât intră în pereți, câmpul de înălțimi)
 * și `degajari.cazuri.ts` (cazurile §8 cu numerele scrise de mână, scriitorul de pe hârtie, martorii negativi).
 * - „(o) …”: oracolul singur, pe hârtie (fără aplicație);
 * - „lipire: …”: programele aplicației pe cazurile §8, pe 4 montaje: toată poarta (1, 2, 3, 5, 9–13, viteza pe
 *   verticală), hârtia, avertismentele, refuzul pe-linie și „nimic altceva nu se schimbă” (programul fără drumuri are
 *   exact geometria programului fără `colturi`);
 * - „martor: …”: transformări greșite, deliberate, ale programelor aplicației (§8 și ale mele), care trebuie să
 *   înroșească poarta (13 sau 2 / 9) și hârtia.
 * Corpusul de lipire e în `degajari.corpus.oracol.test.ts`, octeții de dinainte (bb65461) și echivalența porții de
 * dinainte de ADR 0032 în `degajari.octeti.oracol.test.ts`; ajutoarele în `ajutor-degajari.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DocV4O, DocV8O } from '../oracles/document.ts';
import { citeste } from '../oracles/gcode.ts';
import { laDocument } from '../oracles/poarta.ts';
import { contur, dPunctLista, regiuneDinDocument, type FormaO } from '../oracles/regiune.ts';
import {
  avertismenteleCerute, colturiDeDegajat, comparaAvertismentele, drumuriDusIntors, judecaFoaia, REST_MINIM, type ColtDegajat,
} from '../oracles/degajari.ts';
import {
  CAZURI_DEG, cuDrumuri, docDeg, dog, dogBone, G40, martorAdauga, martorConvex, martorDeg, tee, teeOrizontal, teeVertical,
  type CazDeg, type ColtHartie, type FelMartor,
} from '../oracles/degajari.cazuri.ts';
import { aleator, drept, programDinTrasee, type Montaj } from '../oracles/regiune.cazuri.ts';
import { traseeCerute } from '../oracles/sens.cazuri.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import {
  avertizat, colturileJudecate, COLTURI, ctxDoc, dist, faraColturi, geometria, hartieDeg, judeca, mesaje, primaDiferenta, SCHEMA,
} from './ajutor-degajari.ts';

const R = 3;
const montaje = (c: CazDeg): Montaj[] => COLTURI.map((origine, k) => ({ foaie: c.stoc, origine, z0: k % 2 === 0 ? 'sus' : 'jos' }));
const cazul = (prefix: string): CazDeg => CAZURI_DEG.find((c) => c.nume.startsWith(prefix))!;
/** Elementul (în lume) pe al cărui contur stă colțul V. */
const elementulColtului = (doc: DocV8O, V: { x: number; y: number }): string =>
  [...regiuneDinDocument(doc).taieturi].find(([, t]) => t.contur && dPunctLista(V, t.contur.primitive) <= 1e-9)?.[0] ?? '?';

// ── (o) Hârtia: colțurile, Q și E ───────────────────────────────────────────────────────────────────────────────────

/** Colțurile de pe hârtie ale formei `id` dintr-un caz, după oracol (pe operația ei). */
function colturileOracolului(c: CazDeg, id: string): ColtDegajat[] {
  const reg = regiuneDinDocument(c.doc);
  const t = reg.taieturi.get(`${id}/${id}`)!;
  const op = c.doc.piese.find((p) => p.id === id)!.operatii[0]!;
  if (op.latura === 'pe-linie' || !op.colturi) return [];
  return colturiDeDegajat(t.contur!, op.latura, op.sens, R, op.colturi.tip);
}

for (const c of CAZURI_DEG) {
  test(`(o) colțurile de pe hârtie, Q și E (§2–§3), scrise de mână: ${c.nume}`, () => {
    const forme = [...new Set([...c.colturi.map((x) => x.forma), ...c.doc.piese.map((p) => p.id)])];
    const rele: string[] = [];
    for (const id of forme) {
      const gasite = colturileOracolului(c, id);
      const pe = c.colturi.filter((x) => x.forma === id);
      const omise = c.omise.filter((V) => gasite.some((g) => dist(g.V, V) <= 1e-9));
      if (c.faraDrumuri && gasite.length) rele.push(`${id}: ${gasite.length} colțuri; hârtia cere niciunul`);
      if (!c.faraDrumuri && gasite.length !== pe.length + omise.length) rele.push(`${id}: ${gasite.length} colțuri, nu ${pe.length + omise.length}`);
      for (const x of pe) {
        const g = gasite.find((q) => dist(q.V, x.V) <= 1e-9);
        if (!g) { rele.push(`${id}: lipsește colțul (${x.V.x}, ${x.V.y})`); continue; }
        if (dist(g.Q, x.Q) > 1e-9) rele.push(`${id} (${x.V.x}, ${x.V.y}): Q (${g.Q.x}, ${g.Q.y}), nu (${x.Q.x}, ${x.Q.y})`);
        if (dist(g.E, x.E) > 1e-9) rele.push(`${id} (${x.V.x}, ${x.V.y}): E (${g.E.x}, ${g.E.y}), nu (${x.E.x}, ${x.E.y})`);
        // Cât intră în fiecare perete: peretele orizontal e cel cu normala (0, ±1).
        for (const [w, k] of [[g.pereti[0], 0], [g.pereti[1], 1]] as const) {
          const cerut = Math.abs(w.n.y) > 0.5 ? x.inOrizontal : x.inVertical;
          if (Math.abs(g.intrare[k] - cerut) > 1e-9) rele.push(`${id} (${x.V.x}, ${x.V.y}): intră ${g.intrare[k]} în peretele ${k}, nu ${cerut}`);
        }
      }
    }
    assert.deepEqual(rele, []);
  });
}

test('(o) §5 pe hârtie (cu precizarea din 11.10): pe fiecare caz, avertismentele cerute de judecata foii (a: traseele și candidații; b cu vârful 0 în (63, 48); c: foaia; arcele sub R) sunt exact cele scrise de mână', () => {
  const rele: string[] = [];
  for (const c of CAZURI_DEG) {
    const reg = regiuneDinDocument(c.doc);
    const pornire = new Map(c.doc.piese.map((pz) => [`${pz.id}/${pz.id}|${pz.operatii[0]!.latura}|0`, { x: 63, y: 48 }]));
    const j = judecaFoaia(reg, R, c.stoc, pornire);
    const cerute = avertismenteleCerute(j, R);
    // Obligatoriile, toate scrise de mână; cele scrise de mână, toate printre cele cerute (la limită: neobligatorii).
    for (const x of comparaAvertismentele(c.avertismente, cerute)) rele.push(`${c.nume.slice(0, 4)}: ${x}`);
    for (const lista of j.colturi.values()) for (const q of lista) if (q.verdict === 'banda' && !['D20', 'D24'].some((k) => c.nume.startsWith(k))) rele.push(`${c.nume.slice(0, 4)}: (${q.V.x}, ${q.V.y}) la limită: ${q.motiv}`);
  }
  assert.deepEqual(rele, []);
  // Cele două cazuri la egalitate exactă (D20: 7 = D + 1; D24: golul 0,5 = al buclei) sunt chiar în bandă.
  for (const pref of ['D20', 'D24']) {
    const c = cazul(pref);
    const j = judecaFoaia(regiuneDinDocument(c.doc), R, c.stoc, new Map());
    assert.ok([...j.colturi.values()].flat().some((q) => q.verdict === 'banda'), `${pref}: niciun colț la limită`);
  }
});

test('(o) §2–§3 derivate, pe 400 de paralelograme (rotite, oglindite, forfecate, ambele sensuri, ambele tipuri): Q la R de ambele laturi, restul R/sin(α/2) − R; dog-bone E pe bisectoare, la R de V; T-bone E pe dreapta traseului paralelă cu latura scurtă, la R/tan(α/2) de Q, crestătura de R·(1 + cos α) în peretele lung (R la 90°) și 0 în cel scurt; exteriorul n-are colțuri', () => {
  const r = aleator(0x3232);
  const rele: string[] = [];
  let colturi = 0, ascutite = 0, obtuze = 0;
  const distDreapta = (p: { x: number; y: number }, a: { x: number; y: number }, d: { x: number; y: number }): number => Math.abs((p.x - a.x) * d.y - (p.y - a.y) * d.x);
  for (let k = 0; k < 400; k++) {
    const w = 10 + 60 * r(), h = 10 + 60 * r(), kf = (r() - 0.5) * 1.6, u = r() * 2 * Math.PI, ogl = r() < 0.5 ? -1 : 1;
    const c = Math.cos(u), s = Math.sin(u);
    const m = { a: c * ogl, b: s * ogl, c: c * kf - s, d: s * kf + c, e: 100 * r(), f: 100 * r() };
    const ct = contur({ tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 } as FormaO, m);
    const sens = r() < 0.5 ? 'urcare' as const : 'opozitie' as const;
    const tip = r() < 0.5 ? 'dog-bone' as const : 't-bone' as const;
    if (colturiDeDegajat(ct, 'exterior', sens, R, tip).length) rele.push(`${k}: exteriorul are colțuri`);
    const lista = colturiDeDegajat(ct, 'interior', sens, R, tip);
    // Q există doar dacă fiecare înălțime încape 2R.
    if (lista.length !== 0 && lista.length !== 4) rele.push(`${k}: ${lista.length} colțuri`);
    let suma = 0;
    for (const g of lista) {
      colturi++;
      suma += g.alfa;
      if (g.alfa < Math.PI / 2 - 1e-9) ascutite++; else if (g.alfa > Math.PI / 2 + 1e-9) obtuze++;
      const [p0, p1] = g.pereti;
      if (Math.abs(distDreapta(g.Q, g.V, p0.dir) - R) > 1e-9 || Math.abs(distDreapta(g.Q, g.V, p1.dir) - R) > 1e-9) rele.push(`${k}: Q nu e la R de ambele laturi`);
      if (Math.abs(g.rest - (R / Math.sin(g.alfa / 2) - R)) > 1e-9 || g.rest < REST_MINIM) rele.push(`${k}: restul ${g.rest}`);
      if (Math.abs(dist(g.E, g.V) - R) > 1e-9) rele.push(`${k}: E nu e la R de V`);
      if (tip === 'dog-bone') {
        if (Math.abs((g.E.x - g.V.x) * g.u.y - (g.E.y - g.V.y) * g.u.x) > 1e-9) rele.push(`${k}: E nu e pe bisectoare`);
        for (const x of g.intrare) if (Math.abs(x - (R - R * Math.sin(g.alfa / 2))) > 1e-9) rele.push(`${k}: dog-bone intră ${x}`);
      } else {
        const scurt = g.lung === 0 ? p1 : p0, lung = g.lung === 0 ? p0 : p1;
        if (lung.L < scurt.L - 1e-6) rele.push(`${k}: peretele lung e mai scurt`);
        // E pe dreapta traseului paralelă cu latura scurtă (la R de ea), la R/tan(α/2) de Q.
        if (Math.abs(distDreapta(g.E, g.V, scurt.dir) - R) > 1e-9) rele.push(`${k}: E nu e pe paralela la latura scurtă`);
        if (Math.abs(dist(g.E, g.Q) - R / Math.tan(g.alfa / 2)) > 1e-9) rele.push(`${k}: |QE| = ${dist(g.E, g.Q)}, nu R/tan(α/2)`);
        if (Math.abs(g.intrare[g.lung === 0 ? 1 : 0]) > 1e-9) rele.push(`${k}: T-bone intră în peretele scurt`);
        if (Math.abs(g.intrare[g.lung!] - R * (1 + Math.cos(g.alfa))) > 1e-9) rele.push(`${k}: T-bone intră ${g.intrare[g.lung!]} în peretele lung`);
      }
    }
    if (lista.length === 4 && Math.abs(suma - 2 * Math.PI) > 1e-9) rele.push(`${k}: unghiurile nu dau 360°`);
  }
  assert.deepEqual(rele.slice(0, 10), []);
  assert.ok(colturi >= 1000 && ascutite >= 200 && obtuze >= 200, `${colturi} colțuri, ${ascutite} ascuțite, ${obtuze} obtuze`);
});

test('(o) T-bone, egalitatea: la |L₁ − L₂| < 1e-6 peretele de după V; la 1e-6 + 1e-9 peretele lung; la 1e-6 exact (banda ±1e-9) ambele E', () => {
  const lat = (w: number, h: number) => colturiDeDegajat(contur(drept(w, h), { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), 'interior', 'urcare', R, 't-bone');
  // Pătratul, urcare (trigonometric): în (0, 0) latura de după e cea de jos (orizontală): E = (3, 0).
  const p = lat(30, 30).find((g) => g.V.x === 0 && g.V.y === 0)!;
  assert.deepEqual([p.E.x, p.E.y, p.lung, p.EAlt], [3, 0, 1, null]);
  // 30 + 5e-7 lat: sub 1e-6 (egalitate); 30 + 2e-6: peretele lung e cel de jos tot (lățimea), deci același E; 30 + 2e-6
  // înalt: peretele lung e cel din stânga (latura de dinainte): E = (0, 3).
  assert.deepEqual([lat(30 + 5e-7, 30).find((g) => g.V.x === 0 && g.V.y === 0)!.E], [{ x: 3, y: 0 }]);
  const inalt = lat(30, 30 + 2e-6).find((g) => g.V.x === 0 && g.V.y === 0)!;
  assert.deepEqual([inalt.E.x, inalt.E.y, inalt.lung], [0, 3, 0]);
  const laLimita = lat(30, 30 + 1e-6).find((g) => g.V.x === 0 && g.V.y === 0)!;
  assert.ok(laLimita.EAlt !== null, 'la 1e-6 exact, ambele E');
});

// ── (o) Scriitorul de pe hârtie prin poartă ─────────────────────────────────────────────────────────────────────────

/** Programul cerut de contract, de mână: traseele ADR 0026 / 0027 cu drumurile din `colturi` (ridicarea între treceri). */
function programHartie(c: CazDeg, m: Montaj, colturi: readonly ColtHartie[] = c.colturi, doc: DocV8O = c.doc): string {
  return programDinTrasee(cuDrumuri(traseeCerute(doc as unknown as DocV4O, c.D, { intre: 'ridica' }), colturi), m);
}

const SIMPLE = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D14', 'D15', 'D16'];

test('(o) scriitorul de pe hârtie (traseele cerute, cu drumul Q → E → Q după fiecare sosire), pe 4 montaje: trece toată poarta (cu 13); poarta de dinainte de ADR 0032 îl înroșește (2: discul intră în K; 9: buclele se rup)', () => {
  const rele: string[] = [];
  for (const pref of SIMPLE) {
    const c = cazul(pref);
    for (const m of montaje(c)) {
      const text = programHartie(c, m);
      const ctx = ctxDoc(c.doc, m);
      const v = judeca(text, ctx);
      if (v.length) rele.push(`${pref} ${m.origine}: ${mesaje(v.slice(0, 3))}`);
      const vechi = new Set(judeca(text, ctx, { inainteDe0032: true }).map((i) => i.invarianta));
      if (!vechi.has(2) || !vechi.has(9)) rele.push(`${pref} ${m.origine}: poarta de dinainte dă ${[...vechi].join(', ')}, nu 2 și 9`);
      const h = hartieDeg(c, text, m);
      if (h.length) rele.push(`${pref} ${m.origine} (hârtia): ${h.slice(0, 3).join('; ')}`);
    }
  }
  assert.deepEqual(rele, []);
});

test('(o) scriitorul de pe hârtie, greșit: fără drumuri, drumul la colțurile omise (D14, D16), drumuri pe o operație fără colturi; fiecare e roșu pe 13', () => {
  const m: Montaj = { foaie: cazul('D01').stoc, origine: 'stanga-jos', z0: 'sus' };
  const rosu = (text: string, c: CazDeg, doc: DocV8O = c.doc): number[] => [...new Set(judeca(text, ctxDoc(doc, m)).map((i) => i.invarianta))];
  const d01 = cazul('D01');
  assert.ok(rosu(programHartie(d01, m, []), d01).includes(13), 'fără drumuri');
  const d14 = cazul('D14');
  const toate14 = [...teeVertical('s', { st: 20, dr: 50, jos: 40, sus: 80 }), ...teeVertical('d', { st: 53, dr: 83, jos: 40, sus: 80 })];
  assert.deepEqual(rosu(programHartie(d14, m, toate14), d14), [13], 'D14 cu toate drumurile (doar 13: discul atinge vecina la exact R)');
  const d16 = cazul('D16');
  const toate16 = [...dogBone('s', { st: 20, dr: 50, jos: 40, sus: 80 }), ...dogBone('d', { st: 51, dr: 81, jos: 40, sus: 80 })];
  assert.ok(rosu(programHartie(d16, m, toate16), d16).includes(13), 'D16 cu toate drumurile');
  const fara = faraColturi(d01.doc);
  const v = rosu(programHartie(d01, m, d01.colturi, fara), d01, fara);
  assert.ok(v.includes(13) && v.includes(2), `drumuri pe o operație fără colturi: ${v.join(', ')}`);
});

test('(o) drumurile dus-întors: o fantă cât freza (A → B → A, cu sau fără treceri lipite) nu e drum; două drumuri lipite nu sunt drumuri; drumul după plonjare e drum (și roșu pe 13)', () => {
  const ant = ['G90 G17 G21 G94', 'G54', 'G0 Z5.000', 'M3 S18000', 'G4 P3.000'];
  const nr = (linii: string[]) => drumuriDusIntors(citeste([...ant, ...linii, 'G0 Z5.000', 'M5', 'M30', ''].join('\n')).evenimente, (q) => q).length;
  // Fanta: plonjare, dus, întors; cu rampa: dus-întors repetat.
  assert.equal(nr(['G0 X10.000 Y10.000', 'G1 Z-3.000 F300.0', 'G1 X40.000 Y10.000 F1000.0', 'G1 X10.000 Y10.000']), 0);
  assert.equal(nr(['G0 X10.000 Y10.000', 'G1 Z0.000 F300.0', 'G1 X40.000 Y10.000 Z-1.000 F1000.0', 'G1 X10.000 Y10.000 Z-2.000', 'G1 X40.000 Y10.000 Z-3.000', 'G1 X10.000 Y10.000']), 0);
  // O buclă cu un drum: unul; cu drumul dublat: niciunul (lanțul se inversează).
  const bucla = ['G0 X10.000 Y10.000', 'G1 Z-3.000 F300.0', 'G1 X40.000 Y10.000 F1000.0', 'G1 X41.000 Y9.000', 'G1 X40.000 Y10.000', 'G1 X40.000 Y30.000', 'G1 X10.000 Y30.000', 'G1 X10.000 Y10.000'];
  assert.equal(nr(bucla), 1);
  assert.equal(nr([...bucla.slice(0, 5), 'G1 X41.000 Y9.000', 'G1 X40.000 Y10.000', ...bucla.slice(5)]), 0);
  // Drumul imediat după plonjare (pornirea în Q): e drum.
  assert.equal(nr(['G0 X10.000 Y10.000', 'G1 Z-3.000 F300.0', 'G1 X9.000 Y9.000 F1000.0', 'G1 X10.000 Y10.000', ...bucla.slice(2)]), 2);
});

// ── Lipirea: programele aplicației pe cazurile §8 ───────────────────────────────────────────────────────────────────

// Felia 2.7b: v9 adaugă doar forma „cale”; degajările (ADR 0032) nu se schimbă, deci lipirea rulează pe 8–9. Sub 8 sau
// peste 9 testul PICĂ (o versiune nouă se judecă din nou, nu se sare).
// Felia 2.3c-2: v10 (ADR 0037) adaugă căile deschise; documentele fără ele se taie la fel (ADR 0037 §2, §13), deci și pe 10.
// Felia 5.1↑ (ADR 0069): v11 adaugă buzunarul; documentele fără el se taie la fel (doar numărul), deci și pe 11.
test('lipire: aplicația e pe schema 8–11 (ADR 0032; v9 = forma cale, ADR 0034; v10 = căile deschise, ADR 0037; v11 = buzunarul, ADR 0069); pe alta testul PICĂ, nu se sare', () => {
  assert.ok(SCHEMA >= 8 && SCHEMA <= 15, `schema ${SCHEMA}`);
});

for (const c of CAZURI_DEG) {
  test(`lipire: ${c.nume}: pe 4 montaje, toată poarta (1, 2, 3, 5, 9–13, viteza pe verticală), hârtia, avertismentele; fără drumuri, exact geometria programului fără colturi`, async () => {
    const rele: string[] = [];
    for (const [k, m] of montaje(c).entries()) {
      const r = await programulAplicatiei(c.doc, m);
      if (!r.ok) { rele.push(`${m.origine}: refuz: ${r.motiv}`); continue; }
      const ctx = ctxDoc(c.doc, m);
      const v = judeca(r.text, ctx);
      if (v.length) rele.push(`${m.origine} ${m.z0}: ${mesaje(v.slice(0, 3))}`);
      for (const h of hartieDeg(c, r.text, m, k === 0)) rele.push(`${m.origine} ${m.z0} (hârtia): ${h}`);
      // Avertismentele (precizarea din 11.10): exact textele scrise de mână, și exact cele cerute de judecata oracolului.
      const av = (r.avertismente ?? []).filter((a) => /degajarea omisă|colțul rotunjit/.test(a));
      if (JSON.stringify([...av].sort()) !== JSON.stringify([...c.avertismente].sort())) rele.push(`${m.origine}: avertismentele ${JSON.stringify(av)}, nu ${JSON.stringify(c.avertismente)}`);
      for (const x of comparaAvertismentele(r.avertismente, avertismenteleCerute(colturileJudecate(r.text, ctx).judecata, R))) rele.push(`${m.origine} (oracolul): ${x}`);
      for (const V of c.omise) if (!avertizat(r.avertismente, elementulColtului(c.doc, V), V)) rele.push(`${m.origine}: lipsește avertismentul colțului omis (${V.x}, ${V.y})`);
      // Nimic altceva nu se schimbă (pozițiile s nu numără drumurile: urechile, rampa, intrările rămân).
      const f = await programulAplicatiei(faraColturi(c.doc), m);
      if (!f.ok) { rele.push(`${m.origine}: fără colturi, refuz: ${f.motiv}`); continue; }
      if (c.faraDrumuri && f.text !== r.text) rele.push(`${m.origine}: fără drumuri, dar programul diferă de cel fără colturi`);
      const dif = primaDiferenta(geometria(r.text, ctx), geometria(f.text));
      if (dif) rele.push(`${m.origine}: fără drumuri, geometria diferă de cea fără colturi: ${dif}`);
    }
    assert.deepEqual(rele, []);
  });
}

test('lipire: degajări pe o operație pe-linie (§6): exportul e refuzat, cu motiv; aceeași operație fără colturi trece, iar programul ei, judecat cu documentul cu colturi, e roșu pe 13 (exportul trebuia refuzat)', async () => {
  const stoc = { latime: 160, inaltime: 120, grosime: 12 };
  for (const tip of [dog(), tee()]) {
    const doc = docDeg(stoc, [{ id: 'l', forma: drept(40, 30), x: 60, y: 45, latura: 'pe-linie', adancime: 1, colturi: tip }], { diametru: 6, pas: 1 });
    const r = await programulAplicatiei(doc, { origine: 'stanga-jos', z0: 'sus' });
    assert.equal(r.ok, false, `${tip.tip} pe pe-linie a trecut`);
    if (!r.ok) assert.ok(r.motiv.trim().length > 0, 'refuz fără motiv');
    const f = await programulAplicatiei(faraColturi(doc), { origine: 'stanga-jos', z0: 'sus' });
    assert.equal(f.ok, true);
    if (!f.ok) continue;
    const v = judeca(f.text, ctxDoc(doc, { origine: 'stanga-jos', z0: 'sus' }));
    assert.ok(v.some((i) => i.invarianta === 13 && /pe-linie/.test(i.mesaj)), mesaje(v));
  }
});

// ── Martorii negativi: programele aplicației, stricate deliberat ────────────────────────────────────────────────────

const M0: Montaj = { foaie: cazul('D01').stoc, origine: 'dreapta-sus', z0: 'jos' };

/** Programul aplicației pentru un caz (montajul M0). */
async function programul(c: CazDeg, doc: DocV8O = c.doc): Promise<string> {
  const r = await programulAplicatiei(doc, { origine: M0.origine, z0: M0.z0 });
  if (!r.ok) throw new Error(`refuz: ${r.motiv}`);
  return r.text;
}

const MARTORI: ReadonlyArray<{ readonly nume: string; readonly caz: string; readonly fel: FelMartor; readonly invariante: readonly number[] }> = [
  { nume: 'E pus la r dincolo de V (cercul ediției întâi, §8)', caz: 'D01', fel: 'E-dincolo-de-V', invariante: [2, 13] },
  { nume: 'E scurt: drumul se oprește înainte, colțul rămâne netăiat (§8)', caz: 'D01', fel: 'E-scurt', invariante: [2, 13] },
  { nume: 'drumul doar la prima trecere (§8)', caz: 'D01', fel: 'doar-prima-trecere', invariante: [13] },
  { nume: 'T-bone în peretele scurt (§8)', caz: 'D03', fel: 'tbone-perete-scurt', invariante: [2, 13] },
  { nume: 'drumul la Z-ul trecerii de dinainte (al meu)', caz: 'D01', fel: 'Z-trecerea-de-dinainte', invariante: [13] },
  { nume: 'întoarcerea nu ajunge în Q (al meu): nu mai e drum dus-întors', caz: 'D02', fel: 'fara-intoarcere', invariante: [2, 9, 13] },
  { nume: 'drumul cu avansul de plonjare, nu cu cel de tăiere (al meu)', caz: 'D03', fel: 'avans-plonjare', invariante: [13] },
];

for (const w of MARTORI) {
  test(`martor: ${w.nume}: poarta (${w.invariante.join(', ')}) și hârtia sunt roșii; programul nestricat e verde`, async () => {
    const c = cazul(w.caz);
    const text = await programul(c);
    const ctx = ctxDoc(c.doc, M0);
    assert.deepEqual(judeca(text, ctx), [], 'programul aplicației');
    assert.deepEqual(hartieDeg(c, text, M0), [], 'hârtia, pe programul aplicației');
    const rau = martorDeg(text, M0, c.colturi, w.fel);
    assert.notEqual(rau, text, 'martorul n-a schimbat nimic');
    const v = new Set<number>(judeca(rau, ctx).map((i) => i.invarianta));
    for (const i of w.invariante) assert.ok(v.has(i), `poarta nu vede ${i} (vede ${[...v].join(', ')})`);
    assert.ok(hartieDeg(c, rau, M0).length > 0, 'hârtia nu vede martorul');
  });
}

test('martor: degajarea pe colțul unei piese tăiate exterior (convex pentru K, §8): poarta (2, 13) și hârtia sunt roșii', async () => {
  const c = cazul('D08');
  const text = await programul(c);
  const ctx = ctxDoc(c.doc, M0);
  const varfuri = [{ x: 20, y: 20 }, { x: 70, y: 20 }, { x: 70, y: 50 }, { x: 20, y: 50 }, { x: 90, y: 70 }, { x: 140, y: 70 }, { x: 140, y: 100 }, { x: 90, y: 100 }];
  const rau = martorConvex(text, M0, varfuri);
  assert.notEqual(rau, text);
  const v = new Set(judeca(rau, ctx).map((i) => i.invarianta));
  assert.ok(v.has(2) && v.has(13), `poarta vede ${[...v].join(', ')}`);
  assert.ok(hartieDeg(c, rau, M0).length > 0);
});

test('martor: degajarea păstrată deși se apropie de bucla vecină (D14, T-bone la 3 mm, §8): doar 13 o vede (discul atinge vecina la exact R), hârtia o vede', async () => {
  const c = cazul('D14');
  const text = await programul(c);
  const ctx = ctxDoc(c.doc, M0);
  const omise = [...teeVertical('s', { st: 20, dr: 50, jos: 40, sus: 80 }), ...teeVertical('d', { st: 53, dr: 83, jos: 40, sus: 80 })]
    .filter((x) => c.omise.some((V) => dist(V, x.V) === 0));
  const rau = martorAdauga(text, M0, omise);
  assert.notEqual(rau, text);
  const v = judeca(rau, ctx);
  assert.deepEqual([...new Set(v.map((i) => i.invarianta))], [13], mesaje(v.slice(0, 3)));
  assert.ok(v.every((i) => /trebuia omis/.test(i.mesaj)), mesaje(v.slice(0, 3)));
  assert.ok(hartieDeg(c, rau, M0).length > 0);
});

// Precizarea din 11.10: aceeași păstrare deliberată, pe candidații față în față (D19) și pe marginea foii (D21).
for (const [pref, cs, invariante] of [
  ['D19', [...teeOrizontal('j', { st: 60, dr: 100, jos: 20, sus: 50 }), ...teeOrizontal('s', { st: 60, dr: 100, jos: 55, sus: 85 })], [13]],
  ['D21', teeVertical('g', { st: 2, dr: 32, jos: 40, sus: 80 }), [5, 13]],
] as const) {
  test(`martor: degajările omise ale lui ${pref} păstrate (aplicația care nu judecă ${pref === 'D19' ? 'candidații' : 'marginea foii'}): poarta (${invariante.join(', ')}) și hârtia sunt roșii`, async () => {
    const c = cazul(pref);
    const text = await programul(c);
    const ctx = ctxDoc(c.doc, M0);
    const rau = martorAdauga(text, M0, cs.filter((x) => c.omise.some((V) => dist(V, x.V) === 0)));
    assert.notEqual(rau, text);
    const v = judeca(rau, ctx);
    assert.deepEqual([...new Set(v.map((i) => i.invarianta))].sort((a, b) => a - b), [...invariante], mesaje(v.slice(0, 3)));
    assert.ok(v.filter((i) => i.invarianta === 13).every((i) => /trebuia omis/.test(i.mesaj)), mesaje(v.slice(0, 3)));
    assert.ok(hartieDeg(c, rau, M0).length > 0);
  });
}

test('martor: drumuri pe o operație fără colturi (aplicația care nu citește câmpul): poarta (2, 13) și hârtia sunt roșii', async () => {
  const c = cazul('D01');
  const fara = faraColturi(c.doc);
  const text = await programul(c, fara);
  const ctx = ctxDoc(fara, M0);
  const rau = martorAdauga(text, M0, c.colturi);
  assert.notEqual(rau, text);
  const v = new Set(judeca(rau, ctx).map((i) => i.invarianta));
  assert.ok(v.has(2) && v.has(13), `poarta vede ${[...v].join(', ')}`);
  assert.ok(hartieDeg({ ...c, colturi: [], omise: c.colturi.map((x) => x.V), faraDrumuri: true }, rau, M0).length > 0);
});

test('martor: drumul și la pornirea buclei (după plonjare, în vârful 0), pe lângă cel de la sosire: poarta (13) e roșie', async () => {
  const c = cazul('D01');
  const text = await programul(c);
  const ctx = ctxDoc(c.doc, M0);
  const L = text.split('\n');
  const k = L.findIndex((l) => /^G1 Z-?\d+\.\d+ F300\.0$/.test(l));
  // Vârful 0: rapida de dinaintea plonjării; drumul lui, din colțurile de pe hârtie (în mașină).
  const v0 = /^G0 X(-?\d+\.\d+) Y(-?\d+\.\d+)/.exec(L[k - 1]!)!;
  const q = laDocument([Number(v0[1]), Number(v0[2]), 0], M0);
  const x = c.colturi.find((y) => dist(y.Q, { x: q[0], y: q[1] }) <= 0.003)!;
  const e = laDocument([0, 0, 0], M0);
  const E = [x.E.x - e[0], x.E.y - e[1]];
  const rau = [...L.slice(0, k + 1), `G1 X${E[0]!.toFixed(3)} Y${E[1]!.toFixed(3)} F1000.0`, `G1 X${v0[1]} Y${v0[2]}`, ...L.slice(k + 1)].join('\n');
  const v = judeca(rau, ctx);
  assert.ok(v.some((i) => i.invarianta === 13 && /nu urmează unei sosiri/.test(i.mesaj)), mesaje(v.slice(0, 3)));
  // Hârtia: drumul de după plonjare n-are o sosire în Q (plonjarea e pe verticală).
  assert.ok(hartieDeg(c, rau, M0).some((x) => /nu urmează unei sosiri în Q/.test(x)), 'hârtia nu vede drumul fără sosire');
});

test('martor: G0 în locul drumului (prin material) și drumul ca un singur G1 dus (fără întoarcere; bucla tot se închide): poarta e roșie (3, 13 / 2, 13)', async () => {
  const c = cazul('D01');
  const text = await programul(c);
  const ctx = ctxDoc(c.doc, M0);
  const L = text.split('\n');
  const d = drumuriDusIntors(citeste(text).evenimente, (q) => laDocument(q, M0))[0]!;
  const rapid = L.map((l, k) => (k + 1 === d.linii[0] ? l.replace(/^G1/, 'G0') : k + 1 === d.linii[1] ? `G1 ${l.slice(3)} F1000.0` : l)).join('\n');
  const v1 = new Set(judeca(rapid, ctx).map((i) => i.invarianta));
  assert.ok(v1.has(3) && v1.has(13), `G0: ${[...v1].join(', ')}`);
  const dus = L.filter((_, k) => k + 1 !== d.linii[1]).join('\n');
  const v2 = new Set(judeca(dus, ctx).map((i) => i.invarianta));
  assert.ok(v2.has(13) && v2.has(2), `doar dus: ${[...v2].join(', ')}`);
});

test('martori: raport', () => {
  console.log(`martori ADR 0032: ${MARTORI.length + 5} transformări ale programelor aplicației (cazurile ${[...new Set(MARTORI.map((w) => w.caz))].join(', ')}, D08, D14), plus 3 ale scriitorului de pe hârtie; colțuri G40 = ${JSON.stringify(G40)}; teeOrizontal pe D03 = ${teeOrizontal('g', G40).length} colțuri`);
});
