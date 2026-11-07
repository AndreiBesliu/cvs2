/**
 * Tăierea cu ultima formă aleasă și „Taie la intersecții” (ADR 0180 §3, §5, §6; felia 10.3↑b), pe hârtie:
 * - **cuțitul închis** (cercul R30 din (100, 50) pe pătratul 100 × 100): semidiscul de 1 413,72 mm², înăuntrul cuțitului, și
 *   restul, de 8 586,28; inelul tăiat de un dreptunghi doar pe exterior (calota de 2 500·acos 0,7 − 35·√1275 mm², gaura în partea
 *   din afară); cuțitul rămâne neschimbat;
 * - **cuțitul deschis**: o linie dreaptă (5 000 / 5 000), zigzagul (−10, 40)→(50, 60)→(110, 40) (15 500 / 3 dedesubt, 14 500 / 3
 *   deasupra), capetele chiar pe laturi, inelul (două „U”-uri de câte 2 513,27 mm²); fiecare față, forma ei; contururile
 *   netrecute rămân în piesa rămasă;
 * - **refuzurile**: un cuțit care se oprește în formă („nu-trece”, cu închidere), care se încrucișează în ea („cutit”, cu
 *   închidere), care merge pe o latură a formei pe care o taie („pe-linie”); atingerile nu taie;
 * - **„Taie la intersecții”**: dreptunghiul (0, 20)–(100, 80) și linia (−8, 95)→(108, 5), tăiate în (34/3, 80) și (266/3, 20):
 *   cinci forme; cercurile R50 din (200, 200) și (260, 200), în (230, 200 ± 40): patru arce (bulge 0,5 și 2); un T (pătratul cu un
 *   singur loc rămâne întreg); latura comună a două pătrate, tăiată la capete; cercurile tangente și bucla unei singure forme nu
 *   se taie; buzunarul scos de pe bucățile deschise; contururile netăiate ale unei piese rămân împreună.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { arieCuSemn, type Contur } from '../../src/geom/contur.ts';
import type { Document, ElementNod, FormaDoc, Nod, Operatie, Piesa, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type CerereTaiere, type Cutit, type RezultatTaiere } from '../../src/model/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaDoc =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const patrat = (id: string, x: number, y: number, latura = 100) => forma(id, { tip: 'dreptunghi', latime: latura, inaltime: latura, razaColt: 0 }, x, y);
const cercF = (id: string, x: number, y: number, r = 50) => forma(id, { tip: 'cerc', raza: r }, x, y);

const FORMA = (id: string): Cutit => ({ fel: 'forma', id });
const INTERSECTII: Cutit = { fel: 'intersectii' };
const cerere = (cutit: Cutit, alese: readonly string[], inchide = true): CerereTaiere => ({ cutit, alese, inchide });

/** Documentul după tăiere (comanda `degrupeaza`), trecut prin ușă. */
function aplica(d: Document, r: RezultatTaiere): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }).doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const taiat = (d: Document, c: CerereTaiere): { readonly dupa: Document; readonly r: Extract<RezultatTaiere, { ok: true }> } => {
  const r = taie(d, c);
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return { dupa: aplica(d, r), r };
};
const refuz = (d: Document, c: CerereTaiere): string => {
  const r = taie(d, c);
  return r.ok ? 'tăiată' : r.motiv;
};
/** Contururile în lume ale unei instanțe. */
const contururi = (d: Document, inst: string): Contur[] => elementeFoaie(d).filter((e) => e.instanta === inst).map((e) => conturElement(e));
const unul = (d: Document, inst: string): Contur => {
  const c = contururi(d, inst);
  assert.equal(c.length, 1, `instanța ${inst} are un singur contur`);
  return c[0] as Contur;
};
const piesa = (d: Document, id: string): Piesa => d.piese.find((p) => p.id === id) ?? assert.fail(`piesa ${id}`);
const puncte = (c: Contur): Array<[number, number]> => c.varfuri.map((v) => [v.p.x, v.p.y]);
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const arie = (c: Contur): number => Math.abs(arieCuSemn(c));
/** Are conturul un vârf în (x, y), la 1e-9? */
const areVarf = (c: Contur, x: number, y: number): boolean => c.varfuri.some((v) => Math.hypot(v.p.x - x, v.p.y - y) <= 1e-9);
/** Lungimea unei căi din linii și arce. */
function lungime(c: Contur): number {
  let s = 0;
  const n = c.varfuri.length, m = c.inchis ? n : n - 1;
  for (let k = 0; k < m; k++) {
    const a = c.varfuri[k] as Contur['varfuri'][number], b = c.varfuri[(k + 1) % n] as Contur['varfuri'][number];
    const coarda = Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y);
    if (a.s.tip === 'A' && Math.abs(a.s.bulge) > 1e-12) {
      const baleiaj = 4 * Math.atan(Math.abs(a.s.bulge));
      s += (coarda / (2 * Math.sin(baleiaj / 2))) * baleiaj;
    } else s += coarda;
  }
  return s;
}

/** Inelul R50 / R30 din (500, 500): o piesă cu un grup, cu rolul exterior (exteriorul pe afară, gaura pe dinăuntru). */
function inel(...alte: ReturnType<typeof forma>[]): Document {
  const d = docDin(stoc, cercF('i', 500, 500), ...alte);
  const p0 = d.piese[0] as Piesa;
  const scula = (p0.operatii[0] as Operatie).scula;
  const op = (id: string, latura: 'exterior' | 'interior', noduri: string[]): Operatie => ({
    id, tip: 'profil', noduri, scula, latura, sens: 'urcare', adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null,
  });
  const radacina: Nod = {
    tip: 'grup', id: 'i', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'o', forma: { tip: 'cerc', raza: 50 }, matrice: { ...ID } },
      { tip: 'element', id: 'g', forma: { tip: 'cerc', raza: 30 }, matrice: { ...ID } },
    ],
  };
  return { ...d, piese: [{ id: 'i', radacina, operatii: [op('exterior', 'exterior', ['o']), op('interior', 'interior', ['g'])] }, ...d.piese.slice(1)] };
}

// ——— Cuțitul închis ———

test('pătratul tăiat cu cercul R30 din (100, 50), cu închidere: semidiscul de 1 413,72 mm² (înăuntru), restul de 8 586,28 (în afară)', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('k', 100, 50, 30));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['a', 'k']));
  assert.equal(r.forme, 1);
  assert.equal(r.scoase, 0);
  assert.equal(r.ids.length, 2, 'înăuntrul cuțitului, apoi în afara lui');
  const [inauntru, afara] = r.ids.map((id) => unul(dupa, id));
  const semidisc = (Math.PI * 900) / 2;
  aproape(semidisc, 1413.7166941154069, 1e-9, 'pe hârtie');
  aproape(arie(inauntru as Contur), semidisc, 1e-9, 'semidiscul');
  aproape(arie(afara as Contur), 10000 - semidisc, 1e-9, 'restul pătratului');
  for (const c of [inauntru, afara] as Contur[]) {
    assert.equal(c.inchis, true);
    assert.ok(areVarf(c, 100, 20) && areVarf(c, 100, 80), 'tăieturile, în (100, 20) și (100, 80)');
  }
  for (const [x, y] of [[0, 0], [100, 0], [100, 100], [0, 100]] as const) assert.ok(areVarf(afara as Contur, x, y), `colțul (${x}, ${y}) rămâne la bit`);
  assert.ok(areVarf(inauntru as Contur, 70, 50), 'nodul cuțitului din (70, 50) e pe coardă');
  for (const id of r.ids) assert.deepEqual(piesa(dupa, id).operatii.map((o) => [o.tip, o.latura, o.id]), [['profil', 'exterior', 'a']]);
  assert.deepEqual(piesa(dupa, 'k'), piesa(d, 'k'), 'cuțitul rămâne neschimbat');
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), [...r.ids, 'k']);
});

test('cu cercul, fără închidere: latura (100, 20)–(100, 80) înăuntru, restul în afară, căi deschise tăiate pe partea din afară', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('k', 100, 50, 30));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['a', 'k'], false));
  const [inauntru, afara] = r.ids.map((id) => unul(dupa, id));
  assert.deepEqual(puncte(inauntru as Contur), [[100, 20], [100, 80]]);
  assert.deepEqual(puncte(afara as Contur), [[100, 80], [100, 100], [0, 100], [0, 0], [100, 0], [100, 20]]);
  for (const id of r.ids) assert.deepEqual(piesa(dupa, id).operatii.map((o) => [o.tip, o.latura]), [['profil', 'dreapta']]);
});

test('inelul tăiat de un dreptunghi doar pe exterior: calota înăuntru; restul inelului, cu gaura netăiată, în afară; rolul păstrat', () => {
  const d = inel(forma('k', cale(true, [535, 400], [600, 400], [600, 600], [535, 600])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['i', 'k']));
  assert.equal(r.forme, 1, 'doar exteriorul se taie');
  const [inauntru, afara] = r.ids;
  const calota = 2500 * Math.acos(0.7) - 35 * Math.sqrt(1275);
  aproape(calota, 738.7471004653601, 1e-9, 'pe hârtie');
  aproape(arie(unul(dupa, inauntru as string)), calota, 1e-9, 'calota');
  const rest = contururi(dupa, afara as string);
  assert.equal(rest.length, 2, 'fața din afară și gaura');
  const [mare, gaura] = [...rest].sort((u, w) => arie(w) - arie(u));
  aproape(arie(mare as Contur) - arie(gaura as Contur), Math.PI * 1600 - calota, 1e-9, 'restul inelului');
  aproape(arie(gaura as Contur), Math.PI * 900, 1e-9, 'gaura, întreagă');
  assert.deepEqual(piesa(dupa, inauntru as string).operatii.map((o) => [o.tip, o.latura, o.adancime]), [['profil', 'exterior', 6]]);
  assert.deepEqual(piesa(dupa, afara as string).operatii.map((o) => [o.tip, o.latura, o.adancime]).sort(), [['profil', 'exterior', 6], ['profil', 'interior', 6]]);
});

test('un pătrat-cuțit care stă în inel și intră doar în gaură: înăuntru, pătratul fără gaură; în afară, inelul fără pătrat (o margine dinăuntru)', () => {
  const d = inel(forma('k', cale(true, [515, 485], [545, 485], [545, 515], [515, 515])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['i', 'k']));
  assert.equal(r.ids.length, 2);
  // Gaura ∩ pătrat: discul R30 cu x ≥ 15 și |y| ≤ 15 (față de centru) = 2·(7,5·√675 + 450·asin ½) − 450.
  const comun = 2 * (7.5 * Math.sqrt(675) + 450 * Math.asin(0.5)) - 450;
  aproape(comun, 410.9503297414665, 1e-9, 'pe hârtie');
  const [inauntru, afara] = r.ids;
  aproape(arie(unul(dupa, inauntru as string)), 900 - comun, 1e-9, 'pătratul fără gaură');
  const rest = contururi(dupa, afara as string).sort((u, w) => arie(w) - arie(u));
  assert.equal(rest.length, 2, 'cercul exterior, netăiat, și marginea dinăuntru (gaura cu pătratul)');
  aproape(arie(rest[0] as Contur), Math.PI * 2500, 1e-9, 'exteriorul, întreg');
  aproape(arie(rest[1] as Contur), Math.PI * 900 + 900 - comun, 1e-9, 'gaura unită cu pătratul');
  assert.deepEqual(piesa(dupa, afara as string).operatii.map((o) => [o.tip, o.latura]).sort(), [['profil', 'exterior'], ['profil', 'interior']]);
});

test('un cuțit închis care trece de două ori prin pătrat: înăuntru fâșia 20 × 100; în afară cele două margini, o singură formă', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('k', cale(true, [40, -10], [60, -10], [60, 110], [40, 110])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['a', 'k']));
  assert.equal(r.ids.length, 2, 'înăuntru și în afară, nu trei');
  aproape(arie(unul(dupa, r.ids[0] as string)), 2000, 1e-9, 'fâșia');
  const margini = contururi(dupa, r.ids[1] as string);
  assert.equal(margini.length, 2);
  for (const c of margini) aproape(arie(c), 4000, 1e-9, 'o margine');
});

test('un cerc-cuțit care atinge pătratul pe dinăuntru (tangent la latura de jos) nu-l taie', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('k', 50, 25, 25));
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'])), 'nimic-taiat');
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'], false)), 'nimic-taiat');
});

test('un cuțit închis care atinge pătratul doar din afară (cercul tangent) nu-l taie', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('k', 150, 50, 50));
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'])), 'nimic-taiat');
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'], false)), 'nimic-taiat');
});

test('un cuțit care merge pe o latură a formei pe care o taie e refuzat („pe-linie”); unul care doar stă pe latură nu taie', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('k', cale(true, [60, -10], [100, -10], [100, 110], [60, 110])));
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'])), 'pe-linie');
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'], false)), 'pe-linie');
  const alaturi = docDin(stoc, patrat('a', 0, 0), forma('k', cale(true, [100, 0], [150, 0], [150, 100], [100, 100])));
  assert.equal(refuz(alaturi, cerere(FORMA('k'), ['a', 'k'])), 'nimic-taiat');
});

// ——— Cuțitul deschis ———

test('o linie deschisă de la (−10, 50) la (110, 50): două dreptunghiuri de 5 000 mm², fiecare forma ei, exacte', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('k', cale(false, [-10, 50], [110, 50])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['a', 'k']));
  assert.equal(r.ids.length, 2);
  const fete = r.ids.map((id) => unul(dupa, id));
  for (const c of fete) {
    assert.equal(c.inchis, true);
    aproape(arie(c), 5000, 1e-9, 'jumătatea');
    assert.ok(areVarf(c, 0, 50) && areVarf(c, 100, 50));
  }
  const jos = fete.find((c) => areVarf(c, 0, 0)), sus = fete.find((c) => areVarf(c, 0, 100));
  assert.ok(jos && sus && jos !== sus, 'una dedesubt, una deasupra');
  assert.deepEqual(piesa(dupa, 'k'), piesa(d, 'k'), 'cuțitul rămâne neschimbat');
});

test('zigzagul (−10, 40)→(50, 60)→(110, 40): 15 500 / 3 mm² dedesubt și 14 500 / 3 deasupra; vârful (50, 60) e nod al amândurora', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('k', cale(false, [-10, 40], [50, 60], [110, 40])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['a', 'k']));
  const fete = r.ids.map((id) => unul(dupa, id)).sort((u, w) => arie(w) - arie(u));
  aproape(arie(fete[0] as Contur), 15500 / 3, 1e-9, 'dedesubt');
  aproape(arie(fete[1] as Contur), 14500 / 3, 1e-9, 'deasupra');
  for (const c of fete) {
    assert.ok(areVarf(c, 50, 60), 'vârful cuțitului');
    assert.ok(areVarf(c, 0, 130 / 3) && areVarf(c, 100, 130 / 3), 'tăieturile, în (0, 130/3) și (100, 130/3)');
  }
  assert.ok(areVarf(fete[0] as Contur, 0, 0) && areVarf(fete[1] as Contur, 0, 100));
});

test('un cuțit cu capetele chiar pe laturi, (0, 50)→(100, 50), taie ca linia: două dreptunghiuri; fără închidere, două căi', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('k', cale(false, [0, 50], [100, 50])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['a', 'k']));
  assert.deepEqual(r.ids.map((id) => arie(unul(dupa, id))), [5000, 5000]);
  const { dupa: d2, r: r2 } = taiat(d, cerere(FORMA('k'), ['a', 'k'], false));
  assert.equal(r2.ids.length, 2);
  for (const id of r2.ids) assert.equal(unul(d2, id).inchis, false);
});

test('un cuțit care se oprește în pătrat: cu închidere, refuz („nu-trece”); fără, pătratul (o singură tăietură) rămâne întreg', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('k', cale(false, [-10, 50], [50, 50])));
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'])), 'nu-trece');
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'], false)), 'nimic-taiat');
});

test('un cuțit care se încrucișează în pătrat: cu închidere, refuz („cutit”); fără, cele două bucăți, fiecare forma ei', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('k', cale(false, [-10, 30], [70, 30], [70, 70], [30, 70], [30, -10])));
  assert.equal(refuz(d, cerere(FORMA('k'), ['a', 'k'])), 'cutit');
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['a', 'k'], false));
  const bucati = r.ids.map((id) => unul(dupa, id));
  assert.deepEqual(bucati.map(puncte).sort((u, w) => u.length - w.length), [
    [[0, 30], [0, 0], [30, 0]],
    [[30, 0], [100, 0], [100, 100], [0, 100], [0, 30]],
  ]);
});

test('inelul tăiat cu o linie deschisă prin centru: două „U”-uri închise de câte 2 513,27 mm², cu rolul exterior păstrat', () => {
  const d = inel(forma('k', cale(false, [440, 500], [560, 500])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['i', 'k']));
  assert.equal(r.ids.length, 2);
  for (const id of r.ids) {
    aproape(arie(unul(dupa, id)), (Math.PI * 1600) / 2, 1e-9, 'U-ul');
    assert.deepEqual(piesa(dupa, id).operatii.map((o) => [o.tip, o.latura, o.adancime]), [['profil', 'exterior', 6]]);
  }
});

test('un cuțit care intră în inel din afară și se oprește în gaură îl despică: un „C” de π·1 600 mm²; fără închidere, nimic', () => {
  const d = inel(forma('k', cale(false, [420, 500], [500, 500])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['i', 'k']));
  assert.equal(r.forme, 2, 'exteriorul și gaura, deschise fiecare într-un loc');
  assert.equal(r.ids.length, 1);
  const c = unul(dupa, r.ids[0] as string);
  assert.equal(c.inchis, true);
  aproape(arie(c), Math.PI * 1600, 1e-9, 'inelul întreg, despicat');
  assert.ok(areVarf(c, 450, 500) && areVarf(c, 470, 500), 'despicătura, de la exterior la gaură');
  assert.equal(refuz(d, cerere(FORMA('k'), ['i', 'k'], false)), 'nimic-taiat');
});

test('un cuțit în U, cu capetele în gaura inelului: fața din U și restul inelului (exteriorul cu marginea dinăuntru)', () => {
  const d = inel(forma('k', cale(false, [515, 485], [545, 485], [545, 515], [515, 515])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['i', 'k']));
  assert.equal(r.ids.length, 2, 'fața și restul, nu trei');
  const comun = 2 * (7.5 * Math.sqrt(675) + 450 * Math.asin(0.5)) - 450;
  aproape(arie(unul(dupa, r.ids[0] as string)), 900 - comun, 1e-9, 'fața din U');
  const rest = contururi(dupa, r.ids[1] as string).sort((u, w) => arie(w) - arie(u));
  assert.equal(rest.length, 2);
  aproape(arie(rest[0] as Contur), Math.PI * 2500, 1e-9, 'exteriorul');
  aproape(arie(rest[1] as Contur), Math.PI * 900 + 900 - comun, 1e-9, 'marginea dinăuntru');
});

test('cuțitul trece prin două forme și le taie pe amândouă; a treia, pe lângă, rămâne la locul ei', () => {
  const d = docDin(stoc, patrat('a', 0, 0), patrat('b', 200, 0), patrat('c', 0, 300), forma('k', cale(false, [-10, 50], [310, 50])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['a', 'b', 'c', 'k']));
  assert.equal(r.forme, 2);
  assert.equal(r.ids.length, 4);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), [...r.ids, 'c', 'k']);
  for (const id of r.ids) aproape(arie(unul(dupa, id)), 5000, 1e-9, id);
});

test('o piesă cu două pătrate, cuțitul trece doar prin unul: fețele lui sunt forme noi, la locul lui; celălalt rămâne în piesa rămasă', () => {
  const d0 = docDin(stoc, patrat('g', 0, 0), forma('k', cale(false, [-10, 50], [130, 50])));
  const p0 = d0.piese[0] as Piesa;
  const radacina: Nod = {
    tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'p', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 20, f: 10 } },
      { tip: 'element', id: 'q', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 200 } },
    ],
  };
  const d: Document = { ...d0, piese: [{ ...p0, radacina, operatii: [{ ...(p0.operatii[0] as Operatie), noduri: ['p', 'q'] }] }, ...d0.piese.slice(1)] };
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['g', 'k']));
  assert.equal(r.forme, 1);
  assert.equal(r.ids.length, 3, 'două fețe și piesa rămasă');
  const rest = r.ids[2] as string;
  const radRest = piesa(dupa, rest).radacina as ElementNod;
  assert.equal(radRest.tip, 'element');
  assert.equal(radRest.id, 'q', 'pătratul netăiat își păstrează id-ul');
  assert.deepEqual(piesa(dupa, rest).operatii.map((o) => [o.tip, o.latura, o.noduri]), [['profil', 'exterior', ['q']]]);
  const fete = r.ids.slice(0, 2).map((id) => unul(dupa, id)).sort((u, w) => arie(u) - arie(w));
  aproape(arie(fete[0] as Contur), 4000, 1e-9, 'dedesubt');
  aproape(arie(fete[1] as Contur), 6000, 1e-9, 'deasupra');
  for (const c of fete) assert.ok(areVarf(c, 20, 50) && areVarf(c, 120, 50), 'tăieturile, la locul pătratului (20…120)');
  assert.ok(areVarf(fete[0] as Contur, 20, 10) && areVarf(fete[1] as Contur, 120, 110));
});

test('o cale deschisă: trecută de cuțit, două bucăți (fiecare forma ei); atinsă doar (un V cu vârful pe cuțit), netăiată', () => {
  const d = docDin(stoc, forma('l', cale(false, [0, 0], [100, 0], [100, 100])), forma('k', cale(false, [50, -10], [50, 10])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['l', 'k']));
  assert.deepEqual(r.ids.map((id) => puncte(unul(dupa, id))), [[[0, 0], [50, 0]], [[50, 0], [100, 0], [100, 100]]]);
  const v = docDin(stoc, forma('v', cale(false, [0, 10], [50, 0], [100, 10])), forma('k', cale(false, [-10, 0], [110, 0])));
  assert.equal(refuz(v, cerere(FORMA('k'), ['v', 'k'])), 'nimic-taiat');
});

/** Nicio pereche de vârfuri vecine la sub 1e-6 mm (un loc chiar într-un nod nu lasă un nod dublat, ADR 0124 §5). */
function faraDubluri(c: Contur, mesaj: string): void {
  const n = c.varfuri.length;
  for (let k = 0; k < (c.inchis ? n : n - 1); k++) {
    const a = c.varfuri[k]?.p, b = c.varfuri[(k + 1) % n]?.p;
    assert.ok(a && b && Math.hypot(a.x - b.x, a.y - b.y) > 1e-6, `${mesaj}: vârfurile ${k} și ${(k + 1) % n} sunt unul peste altul`);
  }
}

test('un loc chiar într-un nod nu lasă noduri dublate: rombul prin vârfuri, dreptunghiul rotunjit prin capetele arcelor, pătratul prin colțuri', () => {
  const romb = docDin(stoc, forma('r', cale(true, [0, 50], [50, 0], [100, 50], [50, 100])), forma('k', cale(false, [-10, 50], [110, 50])));
  for (const inchide of [true, false]) {
    const { dupa, r } = taiat(romb, cerere(FORMA('k'), ['r', 'k'], inchide));
    for (const id of r.ids) {
      const c = unul(dupa, id);
      faraDubluri(c, `rombul, ${inchide ? 'cu' : 'fără'} închidere`);
      assert.equal(c.varfuri.length, 3, 'un triunghi (sau două laturi), fără noduri noi');
    }
  }
  // Dreptunghiul 100 × 60 cu colțurile R10, tăiat la y = 10: chiar prin capetele arcelor de jos, (0, 10) și (100, 10).
  const d = docDin(stoc, forma('d', { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 10 }), forma('k', cale(false, [-10, 10], [110, 10])));
  const { dupa, r } = taiat(d, cerere(FORMA('k'), ['d', 'k']));
  const fete = r.ids.map((id) => unul(dupa, id)).sort((u, w) => u.varfuri.length - w.varfuri.length);
  const colt = 100 - 25 * Math.PI;
  aproape(arie(fete[0] as Contur), 1000 - 2 * colt, 1e-9, 'dedesubt: 100 × 10 fără două colțuri');
  aproape(arie(fete[1] as Contur), 6000 - 4 * colt - (1000 - 2 * colt), 1e-9, 'deasupra');
  assert.deepEqual(fete.map((c) => c.varfuri.length), [4, 6]);
  for (const c of fete) faraDubluri(c, 'dreptunghiul rotunjit');
  // La intersecții: diagonala prin două colțuri ale pătratului.
  const p = docDin(stoc, patrat('a', 0, 0), forma('l', cale(false, [-50, -50], [150, 150])));
  const x = taiat(p, cerere(INTERSECTII, ['a', 'l']));
  assert.equal(x.r.ids.length, 5);
  for (const id of x.r.ids) faraDubluri(unul(x.dupa, id), 'pătratul și diagonala');
});

test('refuzurile cuțitului: doar cuțitul ales („nimic-ales”), cuțitul lipsă de pe foaie, o piesă pusă de două ori', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('k', cale(false, [-10, 50], [110, 50])));
  assert.equal(refuz(d, cerere(FORMA('k'), ['k'])), 'nimic-ales');
  assert.equal(refuz(d, cerere(FORMA('lipsa'), ['a'])), 'nimic-ales');
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dublu: Document = { ...d, foi: [{ ...foaie, instante: [...foaie.instante, { id: 'a2', piesa: 'a', x: 0, y: 500, rotire: 0 }] }] };
  assert.equal(refuz(dublu, cerere(FORMA('k'), ['a', 'k'])), 'impartita');
});

// ——— Taie la intersecții ———

test('dreptunghiul (0, 20)–(100, 80) și linia (−8, 95)→(108, 5): tăiați în (34/3, 80) și (266/3, 20), cinci forme noi', () => {
  const d = docDin(stoc, forma('r', { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, 0, 20), forma('l', cale(false, [-8, 95], [108, 5])));
  const { dupa, r } = taiat(d, cerere(INTERSECTII, ['r', 'l']));
  assert.equal(r.forme, 2);
  assert.equal(r.ids.length, 5);
  const bucati = r.ids.map((id) => unul(dupa, id));
  for (const c of bucati) assert.equal(c.inchis, false, 'fiecare bucată, o cale deschisă');
  const dreptunghi = bucati.filter((c) => !areVarf(c, -8, 95) && !areVarf(c, 108, 5) && c.varfuri.length > 2);
  assert.equal(dreptunghi.length, 2, 'cele două bucăți ale dreptunghiului');
  aproape(dreptunghi.reduce((s, c) => s + lungime(c), 0), 320, 1e-9, 'perimetrul, întreg');
  for (const c of dreptunghi) assert.ok(areVarf(c, 34 / 3, 80) && areVarf(c, 266 / 3, 20), 'capetele, în tăieturi');
  const linia = bucati.filter((c) => !dreptunghi.includes(c));
  assert.equal(linia.length, 3, 'cele trei bucăți ale liniei');
  aproape(linia.reduce((s, c) => s + lungime(c), 0), Math.hypot(116, 90), 1e-9, 'linia, întreagă');
  const mijloc = linia.find((c) => areVarf(c, 34 / 3, 80) && areVarf(c, 266 / 3, 20));
  assert.ok(mijloc, 'bucata din mijloc a liniei, de la o tăietură la cealaltă');
});

test('o linie care trece prin latura de sus a pătratului se taie acolo; pătratul, cu un singur loc, rămâne întreg', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('l', cale(false, [50, 50], [50, 150])));
  const { dupa, r } = taiat(d, cerere(INTERSECTII, ['a', 'l']));
  assert.equal(r.forme, 1);
  assert.deepEqual(r.ids.map((id) => puncte(unul(dupa, id))), [[[50, 50], [50, 100]], [[50, 100], [50, 150]]]);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), ['a', ...r.ids]);
});

test('un T (capătul liniei pe latura pătratului): capătul nu se taie, pătratul are un singur loc; nimic de tăiat', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('l', cale(false, [50, 100], [50, 150])));
  assert.equal(refuz(d, cerere(INTERSECTII, ['a', 'l'])), 'nimic-taiat');
});

test('cercurile R50 din (200, 200) și (260, 200), tăiate în (230, 160) și (230, 240): patru arce, fiecare forma lui', () => {
  const d = docDin(stoc, cercF('a', 200, 200), cercF('b', 260, 200));
  const { dupa, r } = taiat(d, cerere(INTERSECTII, ['a', 'b']));
  assert.equal(r.forme, 2);
  assert.equal(r.ids.length, 4);
  const arce = r.ids.map((id) => unul(dupa, id));
  const bulge: number[] = [];
  for (const c of arce) {
    assert.equal(c.inchis, false);
    assert.equal(c.varfuri.length, 2, 'un singur arc');
    const s = c.varfuri[0]?.s;
    assert.equal(s?.tip, 'A');
    bulge.push(s?.tip === 'A' ? s.bulge : NaN);
    assert.ok(areVarf(c, 230, 160) && areVarf(c, 230, 240), 'capetele, în intersecții');
  }
  const sortat = [...bulge].sort((u, w) => u - w);
  for (const [k, b] of [0.5, 0.5, 2, 2].entries()) aproape(sortat[k] as number, b, 1e-12, `bulge ${k}`);
});

test('latura comună a două pătrate se taie la capete: patru bucăți (cele două laturi comune și cele două „U”-uri)', () => {
  const d = docDin(stoc, patrat('a', 0, 0), patrat('b', 100, 0));
  const { dupa, r } = taiat(d, cerere(INTERSECTII, ['a', 'b']));
  assert.equal(r.ids.length, 4);
  const p = r.ids.map((id) => puncte(unul(dupa, id)));
  assert.deepEqual(p, [
    [[100, 0], [100, 100]],
    [[100, 100], [0, 100], [0, 0], [100, 0]],
    [[100, 0], [200, 0], [200, 100], [100, 100]],
    [[100, 100], [100, 0]],
  ]);
});

test('latura comună, cu un nod la mijloc pe una dintre forme: tot doar la capetele ei (nu și în nodul de la mijloc)', () => {
  const d = docDin(stoc, patrat('a', 0, 0), forma('b', cale(true, [100, 0], [200, 0], [200, 100], [100, 100], [100, 50])));
  const { dupa, r } = taiat(d, cerere(INTERSECTII, ['a', 'b']));
  assert.deepEqual(r.ids.map((id) => puncte(unul(dupa, id))), [
    [[100, 0], [100, 100]],
    [[100, 100], [0, 100], [0, 0], [100, 0]],
    [[100, 0], [200, 0], [200, 100], [100, 100]],
    [[100, 100], [100, 50], [100, 0]],
  ]);
});

test('nu se taie: cercurile tangente (un singur loc pe fiecare), o formă singură care se taie singură (bucla e a verificării)', () => {
  assert.equal(refuz(docDin(stoc, cercF('a', 200, 200), cercF('b', 300, 200)), cerere(INTERSECTII, ['a', 'b'])), 'nimic-taiat');
  assert.equal(refuz(docDin(stoc, forma('o', cale(true, [0, 0], [100, 100], [100, 0], [0, 100]), 100, 100)), cerere(INTERSECTII, ['o'])), 'nimic-taiat');
  // Steaua cu cinci colțuri se taie singură de cinci ori: tot a verificării, nu a tăierii.
  const stea = Array.from({ length: 5 }, (_, k): readonly [number, number] => {
    const u = Math.PI / 2 + (4 * Math.PI * k) / 5;
    return [50 * Math.cos(u), 50 * Math.sin(u)];
  });
  assert.equal(refuz(docDin(stoc, forma('s', cale(true, ...stea), 300, 300)), cerere(INTERSECTII, ['s'])), 'nimic-taiat');
  assert.equal(refuz(docDin(stoc, patrat('a', 0, 0)), cerere(INTERSECTII, [])), 'nimic-ales');
});

test('operațiile: bucățile deschise ale cercului cu buzunar îl pierd (numărate); profilul pe interior trece în stânga', () => {
  const d = docDin(stoc, cercF('a', 200, 200), cercF('b', 260, 200));
  const cuBuzunar: Document = {
    ...d, piese: d.piese.map((p) => (p.id === 'a' ? { ...p, operatii: [{ ...(p.operatii[0] as Operatie), tip: 'buzunar', latura: 'interior', pasLateral: 2.4 }] } : p)),
  };
  const { dupa, r } = taiat(cuBuzunar, cerere(INTERSECTII, ['a', 'b']));
  assert.equal(r.scoase, 2, 'buzunarul, de pe cele două arce ale lui a');
  const [a1, a2, b1, b2] = r.ids;
  for (const id of [a1, a2]) assert.deepEqual(piesa(dupa, id as string).operatii, []);
  for (const id of [b1, b2]) assert.deepEqual(piesa(dupa, id as string).operatii.map((o) => [o.tip, o.latura]), [['profil', 'stanga']]);
});

test('o piesă cu două linii încrucișate și un cerc: liniile se taie între ele (patru forme), cercul rămâne în piesa rămasă', () => {
  const d0 = docDin(stoc, patrat('g', 0, 0));
  const p0 = d0.piese[0] as Piesa;
  const radacina: Nod = {
    tip: 'grup', id: 'g', nume: 'Import', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'l1', forma: cale(false, [0, 0], [100, 100]), matrice: { ...ID } },
      { tip: 'element', id: 'l2', forma: cale(false, [0, 100], [100, 0]), matrice: { ...ID } },
      { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID, e: 300, f: 300 } },
    ],
  };
  const d: Document = { ...d0, piese: [{ ...p0, radacina, operatii: [{ ...(p0.operatii[0] as Operatie), latura: 'pe-linie', noduri: ['l1', 'l2', 'c'] }] }] };
  const { dupa, r } = taiat(d, cerere(INTERSECTII, ['g']));
  assert.equal(r.forme, 2);
  assert.equal(r.ids.length, 5);
  for (const id of r.ids.slice(0, 4)) {
    const c = unul(dupa, id);
    assert.ok(areVarf(c, 50, 50), 'fiecare bucată pleacă din încrucișare');
    aproape(lungime(c), Math.SQRT2 * 50, 1e-9, 'jumătatea liniei');
  }
  const rest = piesa(dupa, r.ids[4] as string);
  assert.equal(rest.radacina.tip, 'element');
  assert.equal(rest.radacina.id, 'c');
  assert.deepEqual(rest.operatii.map((o) => [o.latura, o.noduri]), [['pe-linie', ['c']]]);
});

test('refuzurile intersecțiilor: o piesă pusă de două ori, dacă s-ar tăia', () => {
  const d = docDin(stoc, cercF('a', 200, 200), cercF('b', 260, 200));
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dublu: Document = { ...d, foi: [{ ...foaie, instante: [...foaie.instante, { id: 'a2', piesa: 'a', x: 700, y: 700, rotire: 0 }] }] };
  assert.equal(refuz(dublu, cerere(INTERSECTII, ['a', 'b'])), 'impartita');
});
