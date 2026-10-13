/**
 * Ușa SVG (felia 2.7c, ADR 0035) judecată de oracolul ei independent (`test/oracles/svg.ts`, scris doar din ADR), pe
 * corpusul scris de mână (`test/oracles/svg.cazuri.ts`, cu valorile pe hârtie):
 * - (0) constantele contractului; oracolul pe hârtie, pe fiecare caz (refuzul, pagina, px, tipurile, vârfurile, bulge,
 *   raportul, laturile, forma, numele);
 * - (a) aplicația față de oracol, pe fiecare caz: refuzul, pagina, px, illustrator, cele 25 de numere, căile (structura,
 *   startul, vârfurile, sensul arcelor, cubicele din fișier, segmentele nule, razele, distanța în ambele sensuri, rafinată);
 *   formele nonzero normalizate (felia 2.7d, ADR 0036) cu oracolul normalizării (regiunea, geometria citirii, topologia),
 *   numerele `nonzero-*` și ce rămâne după normalizare față de hârtie; unde maparea nu depinde de px, același rezultat și
 *   la celălalt pxPeTol;
 * - (b) latura (§8): `laturiDinImbricare` față de imbricarea oracolului (pe geometria exactă);
 * - (c) piesa (§8): `piesaDinImport` (grupul, elementele, colțul exact, instanța, operațiile) trece de ușa documentului;
 * - (d) `problemaEntitati` și `numeDinFisier`;
 * - (e) CONTROALELE NEGATIVE: transformări greșite ale ieșirii aplicației trebuie prinse de oracol.
 * Parserul e același pentru amândoi (`parserTest`: xmldom, cu entitățile simple expandate ca în browser).
 *
 * Sub-felia 2.3c-1 (ADR 0037 §11): trei numere noi la coada raportului (`inchise-de-umplere`, `inchise-la-usa`,
 * `sub-rezolutie`), secțiunea U a corpusului și controalele negative ale umplerii, golului și prafului, judecate fără
 * aplicație (pe rezultatul construit din oracol), ca să prindă un oracol stricat și înainte ca aplicația să le aibă.
 * Precizarea 13.10 (praful ieșirii normalizării): cazurile U24–U26 și controalele lor negative, pe ieșirea aplicației
 * (bucla păstrată, scoasă dar nenumărată, numărată de două ori; un contur care NU e praf scos).
 *
 * Sub-felia 2.3c-3 (ADR 0037 §11, partea a doua): căile deschise se importă (`inchis: false`, vârful final cu segmentul L),
 * secțiunea L a corpusului și cazurile amendate (C11, C24, U6–U10, U16, U17, U22, U23, H7); piesa cu operația `deschise`
 * (pe linie, min(1 mm, grosimea / 2) într-o trecere), documentul v10 la ușa documentului (`schema: 10`) și grosimea foii
 * în argumentul piesei (`grosime`, ALEGERE de interfață). Controalele negative ale căilor deschise și ale piesei se judecă
 * fără aplicație (rezultatul și piesa construite din oracol / de pe hârtie), ca să prindă un oracol stricat și înainte ca
 * aplicația să aibă 2.3c-3; testele (c′) și (c″) cer piesa aplicației din căile oracolului.
 */
import { test } from 'node:test';
import { DOMParser } from '@xmldom/xmldom';
import assert from 'node:assert/strict';
import { citesteSvg, CODURI_AVERTISMENT, PLAFON_IMPORT, problemaEntitati, SVG_NS } from '../../src/io/svg.ts';
import { laturiDinImbricare } from '../../src/io/imbricare.ts';
import { numeDinFisier, piesaDinImport } from '../../src/io/piesa.ts';
import { TOLERANTA_IMPORT, TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import { REZOLUTIE } from '../../src/geom/offset.ts';
import { incarca } from '../../src/model/incarcare.ts';
import {
  CODURI_2_3C1_O, CODURI_O, CONST_O, SVG_NS_O, adancimeDeschiseO, caiFinaleO, citesteSvgO, coltExact, judecaPiesa, judecaRezultat, laturiBugetO, laturiO, numeDinFisierO, parserTest,
  prafNormalizareO, problemaEntitatiO, punctCub, type CaleO, type PiesaArg, type RezultatO, type RunO, type VarfO,
} from '../oracles/svg.ts';
import { CORPUS, ILLUSTRATOR, judecaHartia, judecaHartiaFinala, mm, octetiCaz, type CazSvg } from '../oracles/svg.cazuri.ts';

type CaleApp = { varfuri: VarfO[]; forma: number; nume?: string; inchis?: boolean };
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

test('(0) constantele: codurile raportului (25, în ordine; 2.7d: nonzero-normalizate și nonzero-refuzate în locul lui nonzero; 2.3c-1: cele trei noi la coadă), plafoanele, toleranța importului, REZOLUTIE, spațiul de nume', () => {
  assert.deepEqual([...CODURI_AVERTISMENT], [...CODURI_O]);
  assert.equal(CODURI_O.length, 25);
  assert.ok(!(CODURI_O as readonly string[]).includes('nonzero'));
  // ADR 0037 §11, „Raportul”: în ordinea scrisă acolo; locul lor nu e scris, deci la coadă (ALEGERE, antetul oracolului).
  assert.deepEqual(CODURI_O.slice(-3), [...CODURI_2_3C1_O]);
  assert.deepEqual([...CODURI_2_3C1_O], ['inchise-de-umplere', 'inchise-la-usa', 'sub-rezolutie']);
  assert.equal(REZOLUTIE, CONST_O.rezolutie);
  assert.equal(CONST_O.rezolutie, 0.01);
  assert.equal(PLAFON_IMPORT.octeti, CONST_O.octeti);
  assert.equal(PLAFON_IMPORT.entitati, CONST_O.declaratii);
  assert.equal(PLAFON_IMPORT.varfuriLucru, CONST_O.varfuriLucru);
  assert.equal((PLAFON_IMPORT as unknown as { includeri: number }).includeri, CONST_O.includeri);
  assert.equal(TOLERANTA_IMPORT, CONST_O.tolImport);
  assert.equal(TOLERANTA_IMPORT, TOLERANTA_PROIECT / 1000);
  assert.equal(SVG_NS, SVG_NS_O);
  // ADR 0037 §11 (2.3c-3): adâncimea operației `deschise`, min(1 mm, grosimea / 2).
  assert.equal(CONST_O.adancimeDeschise, 1);
  assert.deepEqual([18, 2, 1.5, 0.6].map(adancimeDeschiseO), [1, 1, 0.75, 0.3]);
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
    assert.deepEqual(judecaHartiaFinala(a, o, c.hartie), []);
    if (o.ok && !o.px) {
      // Maparea nu depinde de px: același rezultat la celălalt pxPeTol (aplicația și oracolul).
      const alt = (c.px ?? 96) === 96 ? 72 : 96;
      assert.deepEqual(judecaRezultat(app(c, alt), o), []);
      const o2 = citesteSvgO(octetiCaz(c), { pxPeTol: alt, limba: c.limba ?? 'en' });
      assert.ok(o2.ok);
      assert.deepEqual(o2.cai.map((x) => x.varfuri), o.cai.map((x) => x.varfuri));
      assert.deepEqual(o2.avertismente, o.avertismente);
    }
  });
}

/** Grosimea foii din documentul probei (c); adâncimea `deschise` e atunci min(1, 9) = 1 mm. */
const GROSIME = 18;

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
    // Felia 2.7d: laturile căilor finale (formele normalizate cu căile aplicației, judecate la (a)).
    assert.deepEqual(l, laturiO(caiFinaleO(a, o)));
  });
  test(`(c) piesa: ${c.nume}`, () => {
    const a = app(c) as OkApp;
    const laturi = laturiDinImbricare(a.cai);
    const scula = c.nume.startsWith('I') ? { numar: 2, nume: 'freza 3', diametru: 3 } : undefined;
    // 2.3c-3: grosimea foii (18 mm) dă adâncimea operației `deschise`; documentul e v10 (căile deschise).
    const arg = { nume: 'caz', cai: a.cai, laturi, pagina: a.pagina, grosime: GROSIME };
    const rez = scula === undefined ? piesaDinImport(arg, 'p1') : piesaDinImport(arg, 'p1', scula);
    assert.deepEqual(judecaPiesa(rez, arg, 'p1', coltExact(caiFinaleO(a, o)), 2 * CONST_O.tolImport + o.tolLC, scula), []);
    const doc = {
      schema: 10, rev: 0, piese: [rez.piesa],
      foi: [{ id: 'f1', stoc: { latime: 1000, inaltime: 1000, grosime: GROSIME }, instante: [{ id: 'i1', piesa: 'p1', x: rez.x, y: rez.y, rotire: 0 }] }],
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
  const arg = { nume: 'caz', cai: a.cai, laturi, pagina: a.pagina, grosime: GROSIME };
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
  // Felia 2.7d: G8 (o singură formă) se normalizează la o cale; G5 are trei forme imbricate, neschimbate.
  const c = caz('G5');
  const a = app(c) as OkApp;
  const fara = laturiDinImbricare(a.cai);
  assert.deepEqual(laturiDinImbricare(a.cai, 1e9), fara);
  assert.equal(laturiDinImbricare(a.cai, 2), null);
  const o = oracol(c);
  assert.ok(o.ok);
  assert.deepEqual(laturiBugetO(o.cai, 1e9), laturiO(o.cai));
  assert.equal(laturiBugetO(o.cai, 2), null);
});

// ---------------------------------------------------------------------------------------------------------------------
// (e) Felia 2.7d: controalele negative ale formelor nonzero (ADR 0036 la ușă).

controlNegativ('o formă normalizată înlocuită cu citirea 2.7c (numărată tot normalizată)', 'N1', (a) => {
  const o = oracol(caz('N1'));
  assert.ok(o.ok);
  a.cai = o.cai.map((c) => ({ varfuri: copie(c.varfuri), forma: c.forma }));
});
controlNegativ('numerele nonzero schimbate între ele (normalizată numărată refuzată)', 'N1', (a) => {
  a.avertismente['nonzero-normalizate'] = 0;
  a.avertismente['nonzero-refuzate'] = 1;
});
controlNegativ('nonzero-normalizate = 2 pentru o singură formă normalizată', 'N1', (a) => { a.avertismente['nonzero-normalizate'] = 2; });
controlNegativ('un vârf al reuniunii mutat cu 1e-5 mm', 'N1', (a) => { (cale0(a)[2] as unknown as VarfM).p.x += 1e-5; });
controlNegativ('reuniunea cercurilor: un bulge cu semnul întors', 'N9', (a) => {
  const v = cale0(a).find((x) => x.s.tip === 'A') as unknown as VarfM;
  v.s.bulge = -(v.s.bulge as number);
});
controlNegativ('numele formei pierdut pe calea normalizată', 'N9', (a) => { delete (a.cai[0] as CaleApp).nume; });
controlNegativ('o formă care trebuia să dispară (calea și inversa ei) lăsată ca în 2.7c, numărată normalizată', 'N8', (a) => {
  const o = oracol(caz('N8'));
  assert.ok(o.ok);
  a.cai = o.cai.map((c) => ({ varfuri: copie(c.varfuri), forma: c.forma, ...(c.nume !== undefined ? { nume: c.nume } : {}) }));
});
controlNegativ('reuniunea pierde dreptunghiul al doilea (doar primul contur)', 'N1', (a) => {
  const v = cale0(a);
  v.splice(0, v.length, { p: { x: 10, y: 90 }, s: { tip: 'L' } }, { p: { x: 50, y: 90 }, s: { tip: 'L' } }, { p: { x: 50, y: 60 }, s: { tip: 'L' } }, { p: { x: 10, y: 60 }, s: { tip: 'L' } });
});

/** Rezultatul așteptat construit din citirea oracolului (o formă care rămâne ca în 2.7c), fără aplicație. */
function dinOracol(c: CazSvg, dat?: RezultatO): OkApp {
  const o = dat ?? oracol(c);
  assert.ok(o.ok);
  return { ok: true, cai: o.cai.map((x) => ({ varfuri: copie(x.varfuri), forma: x.forma, inchis: x.inchis, ...(x.nume !== undefined ? { nume: x.nume } : {}) })), pagina: o.pagina, px: o.px, illustrator: o.illustrator, avertismente: { ...o.avertismente } };
}
test('(e) control negativ, fără aplicație: o formă cu fill: none (S2) normalizată totuși, sau cu un număr nonzero', () => {
  const c = caz('S2');
  const o = oracol(c);
  const bun = dinOracol(c);
  assert.deepEqual(judecaRezultat(bun, o), [], 'citirea ca atare trece');
  const unit = copie(bun);
  unit.cai = [{ varfuri: [{ p: { x: 10, y: 90 }, s: { tip: 'L' } }, { p: { x: 10, y: 60 }, s: { tip: 'L' } }, { p: { x: 30, y: 60 }, s: { tip: 'L' } }, { p: { x: 30, y: 50 }, s: { tip: 'L' } }, { p: { x: 70, y: 50 }, s: { tip: 'L' } }, { p: { x: 70, y: 80 }, s: { tip: 'L' } }, { p: { x: 50, y: 80 }, s: { tip: 'L' } }, { p: { x: 50, y: 90 }, s: { tip: 'L' } }] as VarfO[], forma: 0 }];
  unit.avertismente['nonzero-normalizate'] = 1;
  assert.ok(judecaRezultat(unit, o).length > 0, 'reuniunea unei forme fără umplere a trecut');
  const numarata = copie(bun);
  numarata.avertismente['nonzero-refuzate'] = 1;
  assert.ok(judecaRezultat(numarata, o).length > 0, 'un refuz numărat pe o formă fără umplere a trecut');
});
test('(e) §6 relaxat (amendamentul K7), fără aplicație: triunghiul subțire (C25) păstrat ca atare trece judecata (alternativa), dar nu hârtia', () => {
  const c = caz('C25');
  const o = oracol(c);
  assert.ok(!o.ok && o.cod === 'gol' && o.alternativ !== undefined && o.alternativ.ok);
  const pastrat = dinOracol({ ...c, nume: 'x', hartie: {} } as CazSvg, o.alternativ);
  assert.deepEqual(judecaRezultat(pastrat, o), [], 'forma subțire poate rămâne (ADR 0036 §6: „poate ieși”)');
  assert.ok(judecaHartiaFinala(pastrat, o, c.hartie).length > 0, 'hârtia cere refuzul gol');
});
test('(e) control negativ, §6 relaxat, fără aplicație: o formă groasă, deja evenodd, fără martor (N15, funda) „normalizată” într-o copie e prinsă', () => {
  const c = caz('N15');
  const o = oracol(c);
  assert.ok(o.ok && o.formeNonzero[0]?.martor === null && o.formeNonzero[0]?.deSchimbat === false);
  const bun = dinOracol(c);
  assert.deepEqual(judecaRezultat(bun, o), []);
  const schimbat = copie(bun);
  const v = (schimbat.cai[0] as CaleApp).varfuri;
  v.push(v.shift() as VarfO);
  schimbat.avertismente['nonzero-normalizate'] = 1;
  const pr = judecaRezultat(schimbat, o);
  assert.ok(pr.some((p) => p.includes('§6')), JSON.stringify(pr));
});

test('(e) control negativ, fără aplicație: stil numărat pe un <style> cu reguli simple (S1), sau nenumărat pe un combinator (S16)', () => {
  const b1 = dinOracol(caz('S1'));
  b1.avertismente['stil'] = 1;
  assert.ok(judecaRezultat(b1, oracol(caz('S1'))).length > 0);
  const c16 = caz('S16');
  const o16 = oracol(c16);
  assert.ok(o16.ok && o16.avertismente['stil'] === 1);
  assert.ok(judecaHartia({ ...o16, avertismente: { ...o16.avertismente, stil: 0 } }, c16.hartie).length > 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// (e) Sub-felia 2.3c-1 (ADR 0037 §11): controalele negative ale umplerii, golului sub rezoluție și prafului. Fără aplicație:
// rezultatul corect se construiește din oracol (trebuie să treacă), apoi se strică așa cum l-ar strica o ușă greșită.

/** O cale din linii, cu vârfurile date (în mm). */
const caleL = (forma: number, puncte: Array<[number, number]>): CaleApp => ({ forma, varfuri: puncte.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) as VarfO[] });
/** Căile rezultatului în ordinea documentului (după `forma`, stabil). */
const ordoneaza = (a: OkApp): void => { a.cai.sort((x, y) => x.forma - y.forma); };
const plus = (a: OkApp, cod: string, d: number): void => { a.avertismente[cod] = (a.avertismente[cod] ?? 0) + d; };

function controlNegativ23c1(nume: string, numeCaz: string, strica: (a: OkApp) => void): void {
  test(`(e) control negativ 2.3c-1, fără aplicație: ${nume} (${numeCaz})`, () => {
    const c = caz(numeCaz);
    const o = oracol(c);
    const bun = dinOracol(c);
    assert.deepEqual(judecaRezultat(copie(bun), o), [], 'rezultatul construit din oracol trebuie să treacă');
    const rau = copie(bun);
    strica(rau);
    assert.ok(judecaRezultat(rau, o).length > 0, 'stricarea a trecut neobservată');
  });
}

controlNegativ23c1('închiderea de umplere ignorată (ca în 2.7c): calea lipsă, numărată deschise', 'U21', (a) => {
  a.cai = a.cai.filter((x) => x.forma !== 1);
  plus(a, 'deschise', 1);
  plus(a, 'inchise-de-umplere', -1);
});
controlNegativ23c1('regula umplerii ignorată: și subcalea cu fill="none" moștenit se închide', 'U16', (a) => {
  a.cai.push(caleL(0, [[10, 90], [30, 90], [30, 70]]));
  ordoneaza(a);
  plus(a, 'deschise', -1);
  plus(a, 'inchise-de-umplere', 1);
});
controlNegativ23c1('regula umplerii întoarsă: subcalea umplută lăsată deschisă', 'U16', (a) => {
  a.cai = [];
  plus(a, 'deschise', 1);
  plus(a, 'inchise-de-umplere', -1);
});
controlNegativ23c1('pragul golului × 10 (0,1 mm): golul de 0,02 mm închis la ușă', 'U9', (a) => {
  a.cai.push(caleL(1, [[50, 90], [70, 90], [70, 70], [50, 70], [50, 89.98]]));
  ordoneaza(a);
  plus(a, 'deschise', -1);
  plus(a, 'inchise-la-usa', 1);
});
controlNegativ23c1('pragul golului ÷ 10 (0,001 mm): golul de 0,005 mm lăsat deschis', 'U9', (a) => {
  a.cai = a.cai.filter((x) => x.forma !== 0);
  plus(a, 'deschise', 1);
  plus(a, 'inchise-la-usa', -1);
});
controlNegativ23c1('praful păstrat: triunghiul de 1e-4 mm cu Z rămâne cale', 'U12', (a) => {
  a.cai.push(caleL(0, [[20, 80], [20.0001, 80], [20.0001, 79.9999]]));
  ordoneaza(a);
  plus(a, 'sub-rezolutie', -1);
});
controlNegativ23c1('praful umplut fără Z numărat închis de umplere, nu praf', 'U12', (a) => {
  plus(a, 'sub-rezolutie', -1);
  plus(a, 'inchise-de-umplere', 1);
});
controlNegativ23c1('pragul prafului ÷ 10 (0,001 mm): triunghiul de 0,00495 mm păstrat', 'U13', (a) => {
  a.cai.unshift(caleL(0, [[20, 80], [20.0035, 80], [20.0035, 79.9965]]));
  plus(a, 'sub-rezolutie', -1);
});
controlNegativ23c1('numerele schimbate: închise la ușă numărate închise de umplere', 'U9', (a) => {
  a.avertismente['inchise-de-umplere'] = a.avertismente['inchise-la-usa'] as number;
  a.avertismente['inchise-la-usa'] = 0;
});
controlNegativ23c1('numerele schimbate: sub-rezolutie numărate deschise', 'U12', (a) => {
  a.avertismente['deschise'] = a.avertismente['sub-rezolutie'] as number;
  a.avertismente['sub-rezolutie'] = 0;
});
controlNegativ23c1('golul sub TOLERANTA_IMPORT numărat (închiderea în tăcere numărată ca umplere și la ușă)', 'U11', (a) => {
  plus(a, 'inchise-de-umplere', 1);
  plus(a, 'inchise-la-usa', 1);
});
controlNegativ23c1('închiderea degenerată numărată degenerate, nu deschise', 'U6', (a) => {
  plus(a, 'deschise', -2);
  plus(a, 'degenerate', 2);
});
controlNegativ23c1('capătul lipit de start (un punct mutat): linia de închidere de 5e-5 mm lipsă', 'U1', (a) => {
  (a.cai[0] as CaleApp).varfuri.pop();
});
controlNegativ23c1('linia de închidere a umplerii pe alt drum: capătul mutat cu 1e-5 mm', 'U5', (a) => {
  ((a.cai[0] as CaleApp).varfuri[2] as unknown as VarfM).p.x += 1e-5;
});

// Sub-felia 2.3c-3: U7 („M L” umplută singură) nu mai e `gol`, ci o cale deschisă; închiderea ei o prinde
// `controlNegativ23c3` („calea deschisă cu inchis: true”). Aici rămâne praful singur (U14), ca în 2.3c-1.
test('(e) control negativ 2.3c-1, fără aplicație: praful singur păstrat (U14): trebuia refuzat gol', () => {
  for (const [numeCaz, cale] of [['U14', caleL(0, [[20, 80], [20.0001, 80], [20.0001, 79.9999]])]] as const) {
    const c = caz(numeCaz);
    const o = oracol(c);
    assert.ok(!o.ok && o.cod === 'gol');
    const corect = { ok: false, cod: 'gol', avertismente: { ...o.avertismente } };
    assert.deepEqual(judecaRezultat(corect, o), [], `${numeCaz}: refuzul corect trece`);
    const rau = { ok: true, cai: [cale], pagina: { latime: 100, inaltime: 100 }, px: false, illustrator: false, avertismente: { ...o.avertismente } };
    assert.ok(judecaRezultat(rau, o).length > 0, `${numeCaz}: păstrarea a trecut neobservată`);
    const numarGresit = { ...corect, avertismente: { ...o.avertismente, 'sub-rezolutie': 0, deschise: 0 } };
    assert.ok(judecaRezultat(numarGresit, o).length > 0, `${numeCaz}: raportul refuzului nejudecat`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// (e) ADR 0037 §11, praful ieșirii normalizării (precizarea 13.10): pe ieșirea aplicației (corectă pe U24 / U26), stricată.

/** Bucla de închidere a lui U24, ca în ieșirea normalizării (umplerea în stânga): S, E, X. */
const BUCLA_U24 = (): VarfO[] => {
  const E = { x: 10.00004, y: 100 - 90.00004 };
  const X = { x: 10 + ((E.x - 10) * (30 - 10)) / (30 - E.y), y: 10 };
  return [{ p: { x: 10, y: 10 }, s: { tip: 'L' } }, { p: E, s: { tip: 'L' } }, { p: X, s: { tip: 'L' } }] as VarfO[];
};
controlNegativ('praful ieșirii păstrat: bucla de 5,7e-5 mm adusă înapoi, nenumărată', 'U24', (a) => {
  a.cai.push({ forma: 0, varfuri: BUCLA_U24() });
  plus(a, 'sub-rezolutie', -1);
});
controlNegativ('praful ieșirii scos, dar nenumărat (sub-rezolutie 0)', 'U24', (a) => { plus(a, 'sub-rezolutie', -1); });
controlNegativ('praful ieșirii numărat de două ori (sub-rezolutie 2 pentru o buclă)', 'U24', (a) => { plus(a, 'sub-rezolutie', 1); });
controlNegativ('un contur care NU e praf (diagonala 0,012 mm) scos din ieșirea normalizării, numărat sub-rezolutie', 'U26', (a) => {
  const n = a.cai.length;
  a.cai = a.cai.filter((c) => !(c.varfuri as VarfO[]).every((v) => v.p.x >= 59 && v.p.x <= 61));
  assert.equal(a.cai.length, n - 1, 'pătratul mic trebuia să fie în ieșire');
  plus(a, 'sub-rezolutie', 1);
});
controlNegativ('un contur care NU e praf (diagonala 0,012 mm) scos din ieșirea normalizării, nenumărat', 'U26', (a) => {
  a.cai = a.cai.filter((c) => !(c.varfuri as VarfO[]).every((v) => v.p.x >= 59 && v.p.x <= 61));
});

test('(0) praful ieșirii, hârtia oracolului: o buclă de închidere mai subțire decât 4τ (1e-8 mm) nu e contur de praf; una de 1e-7 mm este', () => {
  // E sub prima latură cu h: bucla S, X, E are raza înscrisă ≈ h / 2; τ ≈ 4,95e-9 mm (D ≈ 49,5 mm).
  const caz = (h: string): RezultatO => citesteSvgO(new TextEncoder().encode(mm(100, 100, `<path d="M 10 90 L 30 90 L 30 70 L 10 70 L 10.00004 ${h} M 25 75 L 45 75 L 45 55 L 25 55 Z"/>`)));
  assert.equal(prafNormalizareO(caz('90.00000001')), 0);
  assert.equal(prafNormalizareO(caz('90.0000001')), 1);
  assert.equal(prafNormalizareO(caz('90.00004')), 1);
});

// ---------------------------------------------------------------------------------------------------------------------
// (e) Sub-felia 2.3c-3 (ADR 0037 §11, partea a doua): controalele negative ale căilor deschise. Fără aplicație: rezultatul
// corect se construiește din oracol (trebuie să treacă), apoi se strică așa cum l-ar strica o ușă greșită.

function controlNegativ23c3(nume: string, numeCaz: string, strica: (a: OkApp) => void): void {
  test(`(e) control negativ 2.3c-3, fără aplicație: ${nume} (${numeCaz})`, () => {
    const c = caz(numeCaz);
    const o = oracol(c);
    const bun = dinOracol(c);
    assert.deepEqual(judecaRezultat(copie(bun), o), [], 'rezultatul construit din oracol trebuie să treacă');
    const rau = copie(bun);
    strica(rau);
    assert.ok(judecaRezultat(rau, o).length > 0, 'stricarea a trecut neobservată');
  });
}
/** Calea deschisă k a rezultatului. */
const deschisa = (a: OkApp, k = 0): CaleApp => a.cai.filter((c) => c.inchis === false)[k] as CaleApp;
const ultimul = (c: CaleApp): VarfM => c.varfuri[c.varfuri.length - 1] as unknown as VarfM;

controlNegativ23c3('calea deschisă sărită (ca înainte de 2.3c-3), tot numărată deschise', 'L3', (a) => { a.cai = []; });
controlNegativ23c3('calea deschisă sărită lângă o cale închisă', 'U8', (a) => { a.cai = a.cai.filter((c) => c.inchis !== false); });
controlNegativ23c3('vârful final lipsă', 'L1', (a) => { deschisa(a).varfuri.pop(); });
controlNegativ23c3('vârful final lipsă pe o cale cu curbe (CAL → CA)', 'L4', (a) => { deschisa(a).varfuri.pop(); });
controlNegativ23c3('vârful final lipsă pe valul lui CNC-referinta (CL → C)', 'U22', (a) => { deschisa(a).varfuri.pop(); });
controlNegativ23c3('vârful final cu segmentul A (ADR 0037 §2: ultimul segment e L)', 'L1', (a) => { ultimul(deschisa(a)).s = { tip: 'A', bulge: 0.5 }; });
controlNegativ23c3('vârful final mutat cu 1e-5 mm', 'L1', (a) => { ultimul(deschisa(a)).p.x += 1e-5; });
controlNegativ23c3('vârful final dublat (un segment nul la coadă)', 'L3', (a) => { const c = deschisa(a); c.varfuri.push(copie(c.varfuri[c.varfuri.length - 1] as VarfO)); });
controlNegativ23c3('calea deschisă fără câmpul inchis (citită închisă: coarda de închidere)', 'L3', (a) => { delete deschisa(a).inchis; });
controlNegativ23c3('calea deschisă cu inchis: true (închisă, ca în ediția întâi)', 'U10', (a) => { deschisa(a).inchis = true; });
controlNegativ23c3('„M L” umplută închisă de umplere (închiderea degenerată nu se face)', 'U7', (a) => {
  const c = deschisa(a);
  c.inchis = true;
  c.varfuri.pop();
  plus(a, 'deschise', -1);
  plus(a, 'inchise-de-umplere', 1);
});
controlNegativ23c3('inchis ca text („false”)', 'L1', (a) => { (deschisa(a) as unknown as { inchis: unknown }).inchis = 'false'; });
controlNegativ23c3('calea închisă marcată deschisă', 'U8', (a) => { (a.cai[0] as CaleApp).inchis = false; });
controlNegativ23c3('sensul căii deschise întors', 'L3', (a) => { deschisa(a).varfuri.reverse(); });
controlNegativ23c3('bulge-ul semicercului deschis cu semnul întors', 'L4', (a) => { const v = deschisa(a).varfuri[1] as unknown as VarfM; v.s.bulge = -(v.s.bulge as number); });
controlNegativ23c3('oglindirea: bulge-ul căii deschise oglindite cu semnul întors', 'L12', (a) => { const v = deschisa(a).varfuri[0] as unknown as VarfM; v.s.bulge = -(v.s.bulge as number); });
controlNegativ23c3('o cale deschisă degenerată (line de 0,009 mm) importată', 'L6', (a) => {
  a.cai.unshift({ forma: 0, inchis: false, varfuri: [{ p: { x: 5, y: 95 }, s: { tip: 'L' } }, { p: { x: 5.009, y: 95 }, s: { tip: 'L' } }] as VarfO[] });
  plus(a, 'degenerate', -1);
  plus(a, 'deschise', 1);
});
controlNegativ23c3('o cale deschisă de 0,011 mm sărită ca degenerată (pragul × 1,2)', 'L6', (a) => {
  a.cai = a.cai.filter((c) => c.forma !== 1);
  plus(a, 'degenerate', 1);
  plus(a, 'deschise', -1);
});
controlNegativ23c3('deschise numără subcăile sărite, nu căile importate (0 în loc de 1)', 'L1', (a) => { plus(a, 'deschise', -1); });
controlNegativ23c3('deschise numără și degeneratele (4 în loc de 2)', 'L6', (a) => { plus(a, 'deschise', 2); });
controlNegativ23c3('ordinea subcăilor într-o formă: calea deschisă mutată înaintea celei închise', 'L11', (a) => {
  const [x, y] = [a.cai[0], a.cai[1]] as [CaleApp, CaleApp];
  a.cai[0] = y;
  a.cai[1] = x;
});
controlNegativ23c3('U-ul deschis citit închis (o cale închisă în plus, imbricarea schimbată)', 'L8', (a) => { (a.cai[0] as CaleApp).inchis = true; });
controlNegativ23c3('numele căii deschise pierdut', 'L5', (a) => { delete deschisa(a, 1).nume; });

test('(e) control negativ 2.3c-3, fără aplicație: `gol` în loc de căile deschise (L5, U7, H7, L9); doar degeneratele (L7) sunt gol', () => {
  for (const n of ['L5', 'U7', 'H7', 'L9', 'U10', 'C11']) {
    const o = oracol(caz(n));
    assert.ok(o.ok, n);
    assert.ok(judecaRezultat({ ok: false, cod: 'gol', avertismente: { ...o.avertismente } }, o).length > 0, `${n}: gol a trecut`);
  }
  const o7 = oracol(caz('L7'));
  assert.ok(!o7.ok && o7.cod === 'gol');
  assert.deepEqual(judecaRezultat({ ok: false, cod: 'gol', avertismente: { ...o7.avertismente } }, o7), []);
  const pastrata = { ok: true, cai: [caleL(1, [[30, 70], [30.006, 70]])].map((c) => ({ ...c, inchis: false })), pagina: { latime: 100, inaltime: 100 }, px: false, illustrator: false, avertismente: { ...o7.avertismente, degenerate: 1, deschise: 1 } };
  assert.ok(judecaRezultat(pastrata, o7).length > 0, 'calea de 0,006 mm păstrată a trecut');
});

test('(0) imbricarea fără căile deschise, pe hârtie: U-ul din L8 citit închis ar schimba latura pătratului mic', () => {
  const o = oracol(caz('L8'));
  assert.ok(o.ok);
  assert.deepEqual(laturiO(o.cai), ['pe-linie', 'interior', 'exterior', 'pe-linie']);
  assert.deepEqual(laturiBugetO(o.cai, 1e9), laturiO(o.cai));
  // Martorul: același U, închis cu linia (90, 90) → (10, 90), stă în pătratul mare (interior) și conține primul vârf
  // (20, 40) al pătratului mic (adâncimea 2: exterior).
  const u = o.cai[0] as CaleO;
  const fin = (u.varfuri[u.varfuri.length - 1] as VarfO).p, start = (u.varfuri[0] as VarfO).p;
  const coarda: RunO = { ex: { fel: 'L', a: fin, b: start }, piese: [{ p: fin, s: { tip: 'L' } }], clasa: 'L', raza: 0, gol: 0, tol: 0 };
  const inchis = o.cai.map((c, i) => (i === 0 ? { ...c, inchis: true, runs: [...c.runs, coarda] } : c));
  assert.deepEqual(laturiO(inchis), ['interior', 'exterior', 'exterior', 'pe-linie']);
});

// ---------------------------------------------------------------------------------------------------------------------
// (0) Piesa pe hârtie (2.3c-3, ADR 0037 §11): L5, două linii, cu operația `deschise`. Stricăturile ei trebuie prinse de
// `judecaPiesa`, fără aplicație.

type PiesaHartie = { piesa: { id: string; nume: string; radacina: { tip: string; id: string; matrice: unknown; copii: Array<Record<string, unknown> & { forma: Record<string, unknown> }> }; operatii: Array<Record<string, unknown>> }; x: number; y: number };
const ID_M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/** L5 pe hârtie: colțul (0, 50); c1 „sus” = (0, 50) → (100, 50), c2 „jos” = (0, 0) → (100, 0); instanța în colț. */
function piesaL5(adancime: number): PiesaHartie {
  const el = (id: string, nume: string, y: number): Record<string, unknown> & { forma: Record<string, unknown> } => ({
    tip: 'element', id, nume, matrice: { ...ID_M },
    forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y }, s: { tip: 'L' } }, { p: { x: 100, y }, s: { tip: 'L' } }] },
  });
  return {
    piesa: {
      id: 'p1', nume: 'caz', radacina: { tip: 'grup', id: 'g', matrice: { ...ID_M }, copii: [el('c1', 'sus', 50), el('c2', 'jos', 0)] },
      operatii: [{ id: 'deschise', tip: 'profil', noduri: ['c1', 'c2'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'pe-linie', adancime, pas: adancime, sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null }],
    },
    x: 0, y: 50,
  };
}
const argL5 = (grosime: number): PiesaArg => ({
  nume: 'caz', laturi: ['pe-linie', 'pe-linie'], pagina: { latime: 100, inaltime: 100 }, grosime,
  cai: [
    { nume: 'sus', inchis: false, varfuri: [{ p: { x: 0, y: 100 }, s: { tip: 'L' } }, { p: { x: 100, y: 100 }, s: { tip: 'L' } }] },
    { nume: 'jos', inchis: false, varfuri: [{ p: { x: 0, y: 50 }, s: { tip: 'L' } }, { p: { x: 100, y: 50 }, s: { tip: 'L' } }] },
  ],
});
const COLT_L5 = { x: 0, y: 50 };

test('(0) piesa pe hârtie (2.3c-3): L5 cu `deschise` de min(1, grosimea / 2): 1 mm pe 18 și pe 2, 0,75 pe 1,5, 0,3 pe 0,6; trece de ușa documentului v10', () => {
  const o = oracol(caz('L5'));
  assert.ok(o.ok);
  assert.deepEqual(coltExact(o.cai), COLT_L5);
  for (const [g, ad] of [[18, 1], [2, 1], [1.5, 0.75], [0.6, 0.3]] as const) {
    assert.deepEqual(judecaPiesa(piesaL5(ad), argL5(g), 'p1', COLT_L5, 1e-9), [], `grosimea ${g}`);
    const u = incarca({ schema: 10, rev: 0, piese: [piesaL5(ad).piesa], foi: [{ id: 'f1', stoc: { latime: 1000, inaltime: 1000, grosime: g }, instante: [{ id: 'i1', piesa: 'p1', x: 0, y: 50, rotire: 0 }] }] });
    assert.equal(u.ok, true, u.ok ? '' : `grosimea ${g}: ${u.motiv}`);
  }
  // `despartire: false` = lipsa (ADR 0037 §2).
  const cuFals = piesaL5(1);
  (cuFals.piesa.operatii[0] as Record<string, unknown>)['despartire'] = false;
  assert.deepEqual(judecaPiesa(cuFals, argL5(18), 'p1', COLT_L5, 1e-9), []);
});

test('(e) control negativ 2.3c-3, fără aplicație: piesa de pe hârtie stricată (adâncimea, pasul, latura, sensul, urechile, despărțirea, elementul închis, operația lipsă)', () => {
  const op = (p: PiesaHartie): Record<string, unknown> => p.piesa.operatii[0] as Record<string, unknown>;
  const stricaturi: Array<[string, number, (p: PiesaHartie) => void]> = [
    ['1 mm pe foaia de 1,5 (fără grosimea / 2)', 1.5, (p) => { op(p)['adancime'] = 1; op(p)['pas'] = 1; }],
    ['grosimea / 2 pe foaia de 18 (9 mm, fără plafonul de 1 mm)', 18, (p) => { op(p)['adancime'] = 9; op(p)['pas'] = 9; }],
    ['3 mm, implicita dreptunghiului', 18, (p) => { op(p)['adancime'] = 3; op(p)['pas'] = 3; }],
    ['adâncimea foii întregi (desparte foaia din oficiu)', 18, (p) => { op(p)['adancime'] = 18; op(p)['pas'] = 18; }],
    ['pasul 0,5 (două treceri)', 18, (p) => { op(p)['pas'] = 0.5; }],
    ['latura exterior', 18, (p) => { op(p)['latura'] = 'exterior'; }],
    ['latura stânga', 18, (p) => { op(p)['latura'] = 'stanga'; }],
    ['sensul opoziție', 18, (p) => { op(p)['sens'] = 'opozitie'; }],
    ['urechi', 18, (p) => { op(p)['urechi'] = { numar: 4, latime: 6, grosime: 1.5 }; }],
    ['rampa', 18, (p) => { op(p)['rampa'] = { lungime: 10 }; }],
    ['intrări', 18, (p) => { op(p)['intrari'] = { tip: 'arc' }; }],
    ['colțuri', 18, (p) => { op(p)['colturi'] = 'dog-bone'; }],
    ['despartire: true', 18, (p) => { op(p)['despartire'] = true; }],
    ['freza de 3 mm', 18, (p) => { (op(p)['scula'] as { diametru: number }).diametru = 3; }],
    ['id-ul exterior', 18, (p) => { op(p)['id'] = 'exterior'; }],
    ['un nod lipsă', 18, (p) => { op(p)['noduri'] = ['c1']; }],
    ['operația lipsă', 18, (p) => { p.piesa.operatii = []; }],
    ['o operație exterior în plus pe căile deschise', 18, (p) => { p.piesa.operatii.push({ ...op(p), id: 'exterior', latura: 'exterior', adancime: 3, pas: 3 }); }],
    ['elementul închis (coarda de închidere)', 18, (p) => { (p.piesa.radacina.copii[0] as { forma: Record<string, unknown> }).forma['inchis'] = true; }],
    ['elementul fără vârful final', 18, (p) => { ((p.piesa.radacina.copii[1] as { forma: Record<string, unknown> }).forma['varfuri'] as unknown[]).pop(); }],
  ];
  for (const [nume, g, strica] of stricaturi) {
    const p = piesaL5(adancimeDeschiseO(g));
    strica(p);
    assert.ok(judecaPiesa(p, argL5(g), 'p1', COLT_L5, 1e-9).length > 0, `${nume}: a trecut neobservată`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// (c′) (c″) Piesa aplicației din căile ORACOLULUI (2.3c-3): pe cazurile cu căi deschise, fără forme de normalizat (acolo
// căile finale sunt ale aplicației). Independent de cititorul aplicației: doar `piesaDinImport` și ușa documentului.

for (const c of CORPUS) {
  const o = oracol(c);
  if (!o.ok || o.cai.every((x) => x.inchis) || o.formeNonzero.some((f) => f.deSchimbat || f.gol)) continue;
  test(`(c′) piesa din căile oracolului (2.3c-3): ${c.nume}`, () => {
    const cai = o.cai.map((x) => ({ varfuri: copie(x.varfuri), inchis: x.inchis, ...(x.nume !== undefined ? { nume: x.nume } : {}) }));
    const arg = { nume: 'caz', cai, laturi: laturiO(o.cai), pagina: o.pagina, grosime: GROSIME };
    const rez = piesaDinImport(arg, 'p1');
    assert.deepEqual(judecaPiesa(rez, arg, 'p1', coltExact(o.cai), 2 * CONST_O.tolImport + o.tolLC), []);
    const u = incarca({ schema: 10, rev: 0, piese: [rez.piesa], foi: [{ id: 'f1', stoc: { latime: 1000, inaltime: 1000, grosime: GROSIME }, instante: [{ id: 'i1', piesa: 'p1', x: rez.x, y: rez.y, rotire: 0 }] }] });
    assert.equal(u.ok, true, u.ok ? '' : u.motiv);
  });
}

test('(c″) adâncimea operației `deschise` după grosimea foii (aplicația, din căile oracolului L5): 0,75 mm pe 1,5, 1 mm pe 2 și pe 18', () => {
  const o = oracol(caz('L5'));
  if (!o.ok) throw new Error('L5 trebuie acceptat de oracol');
  const cai: PiesaArg['cai'] = o.cai.map((x) => ({ varfuri: copie(x.varfuri), inchis: x.inchis, ...(x.nume !== undefined ? { nume: x.nume } : {}) }));
  for (const g of [1.5, 2, 18]) {
    const arg: PiesaArg & { laturi: ReturnType<typeof laturiO> } = { nume: 'caz', cai, laturi: laturiO(o.cai), pagina: o.pagina, grosime: g };
    // Aplicația primește grosimea foii ca al patrulea argument (`piesaDinImport(date, id, scula?, grosime?)`); oracolul o
    // ține în `arg`, pentru judecată. Doar forma apelului, adaptată la integrare (13.10).
    assert.deepEqual(judecaPiesa(piesaDinImport(arg, 'p1', undefined, g), arg, 'p1', coltExact(o.cai), 2 * CONST_O.tolImport + o.tolLC), [], `grosimea ${g}`);
  }
});
