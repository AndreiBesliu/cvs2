/**
 * Ușa SVG (felia 2.7c, ADR 0035) judecată de oracolul ei independent (`test/oracles/svg.ts`, scris doar din ADR), pe
 * corpusul scris de mână (`test/oracles/svg.cazuri.ts`, cu valorile pe hârtie):
 * - (0) constantele contractului; oracolul pe hârtie, pe fiecare caz (refuzul, pagina, px, tipurile, vârfurile, bulge,
 *   raportul, laturile, forma, numele);
 * - (a) aplicația față de oracol, pe fiecare caz: refuzul, pagina, px, illustrator, cele 21 de numere, căile (structura,
 *   startul, vârfurile, sensul arcelor, cubicele din fișier, segmentele nule, razele, distanța în ambele sensuri, rafinată);
 *   unde maparea nu depinde de px, același rezultat și la celălalt pxPeTol;
 * - (b) latura (§8): `laturiDinImbricare` față de imbricarea oracolului (pe geometria exactă);
 * - (c) piesa (§8): `piesaDinImport` (grupul, elementele, colțul exact, instanța, operațiile) trece de ușa documentului;
 * - (d) `problemaEntitati` și `numeDinFisier`;
 * - (e) CONTROALELE NEGATIVE: transformări greșite ale ieșirii aplicației trebuie prinse de oracol.
 * Parserul e același pentru amândoi (`parserTest`: xmldom, cu entitățile simple expandate ca în browser).
 */
import { test } from 'node:test';
import { DOMParser } from '@xmldom/xmldom';
import assert from 'node:assert/strict';
import { citesteSvg, CODURI_AVERTISMENT, PLAFON_IMPORT, problemaEntitati, SVG_NS } from '../../src/io/svg.ts';
import { laturiDinImbricare } from '../../src/io/imbricare.ts';
import { numeDinFisier, piesaDinImport } from '../../src/io/piesa.ts';
import { TOLERANTA_IMPORT, TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import { incarca } from '../../src/model/incarcare.ts';
import {
  CODURI_O, CONST_O, SVG_NS_O, citesteSvgO, coltExact, judecaPiesa, judecaRezultat, laturiBugetO, laturiO, numeDinFisierO, parserTest,
  problemaEntitatiO, punctCub, type RezultatO, type VarfO,
} from '../oracles/svg.ts';
import { CORPUS, ILLUSTRATOR, judecaHartia, octetiCaz, type CazSvg } from '../oracles/svg.cazuri.ts';

type CaleApp = { varfuri: VarfO[]; forma: number; nume?: string };
type OkApp = { ok: true; cai: CaleApp[]; pagina: { latime: number; inaltime: number } | null; px: boolean; illustrator: boolean; avertismente: Record<string, number> };

const app = (c: CazSvg, px?: 96 | 72): unknown => {
  try {
    return citesteSvg(octetiCaz(c), { pxPeTol: px ?? c.px ?? 96, parser: parserTest(), limba: c.limba ?? 'en' });
  } catch (e) {
    return { aruncat: String(e) };
  }
};
const oracol = (c: CazSvg, px?: 96 | 72): RezultatO => citesteSvgO(octetiCaz(c), { pxPeTol: px ?? c.px ?? 96, limba: c.limba ?? 'en' });
const caz = (nume: string): CazSvg => {
  const c = CORPUS.find((x) => x.nume.startsWith(nume));
  if (c === undefined) throw new Error(`cazul ${nume} lipsește`);
  return c;
};
const copie = <T>(x: T): T => structuredClone(x);

// ---------------------------------------------------------------------------------------------------------------------
// (0)

test('(0) constantele: codurile raportului (21, în ordine), plafoanele, toleranța importului, spațiul de nume', () => {
  assert.deepEqual([...CODURI_AVERTISMENT], [...CODURI_O]);
  assert.equal(CODURI_O.length, 21);
  assert.equal(PLAFON_IMPORT.octeti, CONST_O.octeti);
  assert.equal(PLAFON_IMPORT.entitati, CONST_O.declaratii);
  assert.equal(PLAFON_IMPORT.varfuriLucru, CONST_O.varfuriLucru);
  assert.equal((PLAFON_IMPORT as unknown as { includeri: number }).includeri, CONST_O.includeri);
  assert.equal(TOLERANTA_IMPORT, CONST_O.tolImport);
  assert.equal(TOLERANTA_IMPORT, TOLERANTA_PROIECT / 1000);
  assert.equal(SVG_NS, SVG_NS_O);
});

test('(0) corpusul: nume unice, cel puțin 120 de cazuri', () => {
  assert.equal(new Set(CORPUS.map((c) => c.nume)).size, CORPUS.length);
  assert.ok(CORPUS.length >= 180, `${CORPUS.length}`);
});

for (const c of CORPUS) {
  test(`(0) hârtia: ${c.nume}`, () => {
    assert.deepEqual(judecaHartia(oracol(c), c.hartie), []);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (a) (b) (c)

for (const c of CORPUS) {
  test(`(a) aplicația: ${c.nume}`, () => {
    const o = oracol(c);
    const a = app(c);
    assert.deepEqual(judecaRezultat(a, o), []);
    if (o.ok && !o.px) {
      // Maparea nu depinde de px: același rezultat la celălalt pxPeTol (aplicația și oracolul).
      const alt = (c.px ?? 96) === 96 ? 72 : 96;
      assert.deepEqual(judecaRezultat(app(c, alt), o), []);
      assert.deepEqual(judecaRezultat(citesteSvgO(octetiCaz(c), { pxPeTol: alt, limba: c.limba ?? 'en' }), o), []);
    }
  });
}

for (const c of CORPUS) {
  const o = oracol(c);
  if (!o.ok) continue;
  test(`(b) latura: ${c.nume}`, () => {
    const a = app(c) as OkApp;
    assert.equal(a.ok, true);
    const l = laturiDinImbricare(a.cai);
    if (c.faraLaturi === true) {
      assert.equal(l.length, a.cai.length);
      return;
    }
    assert.deepEqual(l, laturiO(o.cai));
  });
  test(`(c) piesa: ${c.nume}`, () => {
    const a = app(c) as OkApp;
    const laturi = laturiDinImbricare(a.cai);
    const scula = c.nume.startsWith('I') ? { numar: 2, nume: 'freza 3', diametru: 3 } : undefined;
    const arg = { nume: 'caz', cai: a.cai, laturi, pagina: a.pagina };
    const rez = scula === undefined ? piesaDinImport(arg, 'p1') : piesaDinImport(arg, 'p1', scula);
    assert.deepEqual(judecaPiesa(rez, arg, 'p1', coltExact(o.cai), 2 * CONST_O.tolImport + o.tolLC, scula), []);
    const doc = {
      schema: 9, rev: 0, piese: [rez.piesa],
      foi: [{ id: 'f1', stoc: { latime: 1000, inaltime: 1000, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p1', x: rez.x, y: rez.y, rotire: 0 }] }],
    };
    const u = incarca(doc);
    assert.equal(u.ok, true, u.ok ? '' : u.motiv);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (d)

test('(d) problemaEntitati: aceleași coduri ca oracolul, pe tot corpusul și pe cazurile ei', () => {
  const texte = [...CORPUS.filter((c) => c.text !== undefined).map((c) => c.text as string), ILLUSTRATOR,
    '<!DOCTYPE svg [<!ENTITY a "x">]><svg/>', '<!DOCTYPE svg [<!ENTITY  %  p  "x">]><svg/>', "<!DOCTYPE svg [<!ENTITY a 'x&amp;'>]><svg/>",
    `<!DOCTYPE svg [<!ENTITY e "${'b'.repeat(1000)}">]><svg>${'&e;'.repeat(16_000)}</svg>`,
    `<!DOCTYPE svg [<!ENTITY e "${'b'.repeat(1000)}">]><svg>${'&e;'.repeat(17_000)}</svg>`];
  for (const t of texte) {
    const o = problemaEntitatiO(t), a = problemaEntitati(t);
    assert.equal(a, o, `${t.slice(0, 120)}: aplicația ${String(a)}, oracolul ${String(o)}`);
  }
  // Pe hârtie: 16 000 × 1 000 = 16 000 000 ≤ 16 777 216 trece; 17 000 × 1 000 nu.
  assert.equal(problemaEntitatiO(texte[texte.length - 2] as string), null);
  assert.equal(problemaEntitatiO(texte[texte.length - 1] as string), 'expansiune');
  assert.equal(problemaEntitatiO(texte[texte.length - 5] as string), null);
  assert.equal(problemaEntitatiO(texte[texte.length - 4] as string), 'parametru');
  assert.equal(problemaEntitatiO(ILLUSTRATOR), null);
});

test('(d) numeDinFisier: fără extensie, tăiat la 200', () => {
  for (const f of ['logo.svg', 'a.b.svg', 'fara', `${'x'.repeat(300)}.svg`, 'ușă mare.SVG']) assert.equal(numeDinFisier(f), numeDinFisierO(f), f);
  assert.equal(numeDinFisierO('logo.svg'), 'logo');
  assert.equal(numeDinFisierO(`${'x'.repeat(300)}.svg`).length, 200);
});

test('(d) xmldom fără expandare: Illustrator e „parsare” la ambii (faptul măsurat de coordonator)', () => {
  const x = new DOMParser({ onError: (nivel: string, mesaj: string) => { if (nivel !== 'warning') throw new Error(mesaj); } });
  const brut = { parseFromString: (t: string, tip: 'image/svg+xml'): Document => x.parseFromString(t, tip) as unknown as Document };
  const b = new TextEncoder().encode(ILLUSTRATOR);
  const a = citesteSvg(b, { pxPeTol: 72, parser: brut }) as { ok: boolean; cod?: string };
  assert.equal(a.ok, false);
  assert.equal(a.cod, 'parsare');
  const o = citesteSvgO(b, { pxPeTol: 72, parser: brut });
  assert.equal(o.ok ? 'ok' : o.cod, 'parsare');
});

// ---------------------------------------------------------------------------------------------------------------------
// (e) Controalele negative: ieșirea aplicației, stricată de mână, trebuie respinsă de oracol.

type Strica = (a: OkApp) => void;
function controlNegativ(nume: string, numeCaz: string, strica: Strica, pxApp?: 96 | 72): void {
  test(`(e) control negativ: ${nume} (${numeCaz})`, () => {
    const c = caz(numeCaz);
    const o = oracol(c);
    const a = copie(app(c, pxApp)) as OkApp;
    assert.equal(a.ok, true);
    if (pxApp === undefined) assert.deepEqual(judecaRezultat(copie(a), o), [], 'ieșirea nestricată trebuie să treacă');
    strica(a);
    const pr = judecaRezultat(a, o);
    assert.ok(pr.length > 0, 'stricarea a trecut neobservată');
  });
}
const cale0 = (a: OkApp): VarfO[] => (a.cai[0] as CaleApp).varfuri as VarfO[];
type VarfM = { p: { x: number; y: number }; s: { tip: string; bulge?: number; c1?: { x: number; y: number }; c2?: { x: number; y: number } } };

controlNegativ('un vârf scos', 'C13', (a) => { (a.cai[0] as CaleApp).varfuri.splice(1, 1); });
controlNegativ('linia de închidere lipsă', 'C13', (a) => { (a.cai[0] as CaleApp).varfuri.pop(); });
controlNegativ('o linie nulă inserată', 'C13', (a) => { const v = cale0(a); v.splice(1, 0, copie(v[0] as VarfO)); });
controlNegativ('sensul inversat', 'C13', (a) => { (a.cai[0] as CaleApp).varfuri.reverse(); });
controlNegativ('startul rotit', 'A1', (a) => { const v = cale0(a); v.push(v.shift() as VarfO); });
controlNegativ('Y neîntors (y → H − y)', 'A1', (a) => { for (const v of cale0(a) as unknown as VarfM[]) v.p.y = 50 - v.p.y; });
controlNegativ('bulge cu semnul întors', 'C6', (a) => { const v = cale0(a)[0] as unknown as VarfM; v.s.bulge = -(v.s.bulge as number); });
controlNegativ('bulge × (1 + 1e-5)', 'C6', (a) => { const v = cale0(a)[0] as unknown as VarfM; v.s.bulge = (v.s.bulge as number) * (1 + 1e-5); });
// Săgeata se mută cu (c / 2) · δb = 10 · 2e-7 = 2e-6 mm > 1e-7 · R + … = 1e-6: doar distanța o prinde (bulge-ul e la 2e-7 relativ).
controlNegativ('arcul împins cu 2 × toleranța lui (bulge × (1 + 2e-7))', 'C6', (a) => { const v = cale0(a)[1] as unknown as VarfM; v.s.bulge = (v.s.bulge as number) * (1 + 2e-7); });
controlNegativ('arcul de 270° neîmpărțit', 'E19', (a) => {
  const v = cale0(a) as unknown as VarfM[];
  v.splice(0, 2, { p: (v[0] as VarfM).p, s: { tip: 'A', bulge: -Math.tan((3 * Math.PI) / 8) } });
});
controlNegativ('punctul de control al unei cubice din fișier mutat cu 1e-6 mm', 'E8', (a) => { const v = cale0(a)[0] as unknown as VarfM; (v.s.c1 as { x: number }).x += 1e-6; });
controlNegativ('96 în loc de 72 (pxPeTol schimbat)', 'A9', () => undefined, 96);
controlNegativ('72 în loc de 96 (pxPeTol schimbat)', 'A8', () => undefined, 72);
controlNegativ('un număr din raport + 1', 'F1', (a) => { (a.avertismente as Record<string, number>)['ascunse'] = ((a.avertismente as Record<string, number>)['ascunse'] as number) + 1; });
controlNegativ('cubice-din-arce − 1', 'C8', (a) => { (a.avertismente as Record<string, number>)['cubice-din-arce'] = ((a.avertismente as Record<string, number>)['cubice-din-arce'] as number) - 1; });
controlNegativ('forma + 1', 'F1', (a) => { (a.cai[0] as CaleApp).forma += 1; });
controlNegativ('px întors', 'A1', (a) => { a.px = !a.px; });
controlNegativ('illustrator întors', 'A1', (a) => { a.illustrator = !a.illustrator; });
controlNegativ('pagina × 1,0001', 'A1', (a) => { (a.pagina as { latime: number }).latime *= 1.0001; });
controlNegativ('numele căii pierdut', 'A24', (a) => { delete (a.cai[0] as CaleApp).nume; });
controlNegativ('o cale în plus (dublată)', 'A1', (a) => { a.cai.push(copie(a.cai[0] as CaleApp)); });
// Revizia 12.10.
controlNegativ('bucla dintr-o cubică neîmpărțită (cele două jumătăți lipite înapoi)', 'E30', (a) => {
  const v = (a.cai[1] as CaleApp).varfuri as unknown as VarfM[];
  const s0 = v[0] as VarfM, s1 = v[1] as VarfM;
  // De Casteljau invers: c1 = 2·ab − a, c2 = 2·cd − b (ab, cd sunt c1 al primei și c2 al celei de-a doua jumătăți).
  const c1 = { x: 2 * (s0.s.c1 as { x: number }).x - s0.p.x, y: 2 * (s0.s.c1 as { y: number }).y - s0.p.y };
  const c2 = { x: 2 * (s1.s.c2 as { x: number }).x - s0.p.x, y: 2 * (s1.s.c2 as { y: number }).y - s0.p.y };
  v.splice(0, 2, { p: s0.p, s: { tip: 'C', c1, c2 } });
});
controlNegativ('înălțimea din viewBox în px în loc de raport', 'A16', (a) => { (a.pagina as { inaltime: number }).inaltime = 50 * 25.4 / 96; });
test('(e) control negativ: detaliul refuzului entităților schimbat (H23 attlist → valoare)', () => {
  const c = caz('H23');
  const a = copie(app(c)) as { ok: boolean; cod: string; detaliu?: string };
  assert.deepEqual(judecaRezultat(copie(a), oracol(c)), []);
  a.detaliu = 'valoare';
  assert.ok(judecaRezultat(a, oracol(c)).length > 0);
});

/** Împinge cubica eliptică j a căii 0 cu `d` mm, spre exterior (d > 0) sau spre interior, la mijlocul ei (t = ½). */
function impinge(a: OkApp, j: number, d: number, centru: { x: number; y: number }): void {
  const v = cale0(a) as unknown as VarfM[];
  const w = v[j] as VarfM, u = v[(j + 1) % v.length] as VarfM;
  const c1 = w.s.c1 as { x: number; y: number }, c2 = w.s.c2 as { x: number; y: number };
  const m = punctCub(w.p, c1, c2, u.p, 0.5);
  const tx = u.p.x + c2.x - w.p.x - c1.x, ty = u.p.y + c2.y - w.p.y - c1.y;
  let nx = -ty, ny = tx;
  const l = Math.hypot(nx, ny);
  nx /= l; ny /= l;
  if ((m.x - centru.x) * nx + (m.y - centru.y) * ny < 0) { nx = -nx; ny = -ny; }
  // Mutarea lui c1 și c2 cu δ mută mijlocul cu ¾ δ.
  const delta = (4 / 3) * d;
  c1.x += nx * delta; c1.y += ny * delta; c2.x += nx * delta; c2.y += ny * delta;
}
controlNegativ('cubica eliptică împinsă 1,01 × TOLERANTA_IMPORT spre exterior', 'C8', (a) => impinge(a, 3, 1.01 * TOLERANTA_IMPORT, { x: 50, y: 50 }));
controlNegativ('cubica eliptică împinsă 1,01 × TOLERANTA_IMPORT spre interior', 'C8', (a) => impinge(a, 12, -1.01 * TOLERANTA_IMPORT, { x: 50, y: 50 }));

test('(e) controlul pozitiv: cubica eliptică împinsă 0,5 × TOLERANTA_IMPORT spre interior încă trece (oracolul nu e prea strict)', () => {
  const c = caz('C8');
  const a = copie(app(c)) as OkApp;
  impinge(a, 3, -0.5 * TOLERANTA_IMPORT, { x: 50, y: 50 });
  assert.deepEqual(judecaRezultat(a, oracol(c)), []);
});

test('(e) controale negative pe piesă: instanța mutată, coordonatele nemutate, o operație greșită', () => {
  const c = caz('I1');
  const o = oracol(c);
  const a = app(c) as OkApp;
  const laturi = laturiDinImbricare(a.cai);
  const arg = { nume: 'caz', cai: a.cai, laturi, pagina: a.pagina };
  const tol = 2 * CONST_O.tolImport + (o.ok ? o.tolLC : 0);
  const colt = coltExact(o.ok ? o.cai : []);
  const bun = piesaDinImport(arg, 'p1');
  assert.deepEqual(judecaPiesa(bun, arg, 'p1', colt, tol), []);
  const r1 = copie(bun) as { x: number }; r1.x += 1;
  assert.ok(judecaPiesa(r1, arg, 'p1', colt, tol).length > 0);
  const r2 = copie(bun) as { piesa: { radacina: { copii: Array<{ forma: { varfuri: VarfO[] } }> } } };
  (r2.piesa.radacina.copii[0] as { forma: { varfuri: VarfO[] } }).forma.varfuri = copie((a.cai[0] as CaleApp).varfuri);
  assert.ok(judecaPiesa(r2, arg, 'p1', colt, tol).length > 0);
  const r3 = copie(bun) as { piesa: { operatii: Array<Record<string, unknown>> } };
  (r3.piesa.operatii[0] as Record<string, unknown>)['adancime'] = 4;
  assert.ok(judecaPiesa(r3, arg, 'p1', colt, tol).length > 0);
  // Laturile întoarse dau alte operații.
  const arg2 = { ...arg, laturi: laturi.map((l) => (l === 'exterior' ? 'interior' : 'exterior') as 'exterior' | 'interior') };
  assert.ok(judecaPiesa(piesaDinImport(arg2, 'p1'), arg, 'p1', colt, tol).length > 0);
});

test('(d) laturiDinImbricare cu buget: null când se termină, aceleași laturi când ajunge (§8)', () => {
  const c = caz('G8');
  const a = app(c) as OkApp;
  const fara = laturiDinImbricare(a.cai);
  assert.deepEqual(laturiDinImbricare(a.cai, 1e9), fara);
  assert.equal(laturiDinImbricare(a.cai, 2), null);
  const o = oracol(c);
  assert.ok(o.ok);
  assert.deepEqual(laturiBugetO(o.cai, 1e9), laturiO(o.cai));
  assert.equal(laturiBugetO(o.cai, 2), null);
});
