/**
 * Unealta Cuțit (ADR 0181 §1; felia 10.3↑f), partea pură (`src/app/cutitCalcul.ts`): formele de tăiat (răspunsul 2a: cele
 * alese, sau, fără alegere, toate de pe foaie; niciodată cuțitul), urma mâinii libere (un punct nou doar la un pixel de ultimul),
 * calea cuțitului din urmă (prea scurtă: nimic), calea Pen-ului mutată pe foaie (cu mânerele) și locurile aproximative arătate
 * cât tragi (pătratul trecut de o linie oblică: două locuri, pe laturi). Felia 10.3↑i: fâșia spațiului arătată cât tragi
 * (calea mutată cu jumătate din lățime de fiecare parte) și spațiul cerut doar cu închidere. Felia 10.3↑j: îmbinarea cerută
 * doar cu închidere, pe o tăietură dreaptă și cu un model; coardele dreptei prin regiuni și dinții arătați pe ele.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adaugaLaUrma, bucataSub, caleCutit, caleDinPen, conturAproximat, corziAproximative, cuPrelungiri, cutiePuncte, dintiAproximativi, esteModCutit,
  fasieAproximativa, locuriAproximative, locuriComune, lungimeUrma, poligonSters, prelungiriAproximative, regiuniAtinse, selectieDupa, subPolilinie,
  tinteCutit, type RegiuneAproximativa,
} from '../../src/app/cutitCalcul.ts';
import { imbinareDin, intreDin, type OptiuniTaiere } from '../../src/app/optiuniTaiere.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const patrat = (id: string, x: number, y: number) => ({ id, forma: { tip: 'dreptunghi' as const, latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });

test('formele de tăiat: cele alese fără cuțit; fără alegere, toate ale foii fără cuțit (răspunsul 2a)', () => {
  const d = docDin(stoc, patrat('a', 0, 0), patrat('b', 200, 0), patrat('k', 400, 0));
  assert.deepEqual(tinteCutit(d, ['a'], []), ['a']);
  assert.deepEqual(tinteCutit(d, ['a', 'k'], ['k']), ['a'], 'cuțitul ales nu se taie');
  assert.deepEqual(tinteCutit(d, [], []), ['a', 'b', 'k'], 'fără alegere, toate');
  assert.deepEqual(tinteCutit(d, [], ['k']), ['a', 'b'], 'fără alegere, toate, fără cuțit');
  assert.deepEqual(tinteCutit(d, ['k'], ['k']), [], 'doar cuțitul ales: nimic de tăiat');
});

test('urma mâinii libere: un punct nou doar la cel puțin un pas de ultimul; lungimea ei', () => {
  let u = adaugaLaUrma([], { x: 0, y: 0 }, 1);
  u = adaugaLaUrma(u, { x: 0.5, y: 0 }, 1);
  assert.equal(u.length, 1, 'prea aproape: nu intră');
  u = adaugaLaUrma(u, { x: 3, y: 4 }, 1);
  assert.deepEqual(u, [{ x: 0, y: 0 }, { x: 3, y: 4 }]);
  assert.equal(lungimeUrma(u), 5);
});

test('calea cuțitului din urmă: linii, punctele repetate sărite; prea scurtă, nimic', () => {
  const c = caleCutit([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }], 1);
  assert.ok(c);
  assert.equal(c.inchis, false);
  assert.deepEqual(c.varfuri.map((v) => [v.p.x, v.p.y, v.s.tip]), [[0, 0, 'L'], [10, 0, 'L'], [10, 5, 'L']]);
  assert.equal(caleCutit([{ x: 0, y: 0 }, { x: 0.5, y: 0 }], 1), null, 'mai scurtă decât minimul');
  assert.equal(caleCutit([{ x: 0, y: 0 }], 0), null, 'un singur punct');
});

test('calea Pen-ului, mutată pe foaie din originea ei, cu mânerele cubicelor', () => {
  const c = caleDinPen({
    forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 5, y: 10 }, c2: { x: 15, y: 10 } } }, { p: { x: 20, y: 0 }, s: { tip: 'L' } }] },
    x: 100, y: 50,
  });
  assert.ok(c);
  assert.deepEqual(c.varfuri, [
    { p: { x: 100, y: 50 }, s: { tip: 'C', c1: { x: 105, y: 60 }, c2: { x: 115, y: 60 } } },
    { p: { x: 120, y: 50 }, s: { tip: 'L' } },
  ]);
  assert.equal(caleDinPen({ forma: { tip: 'cerc', raza: 5 }, x: 0, y: 0 }), null, 'Pen-ul dă doar căi');
});

test('locurile aproximative: o linie oblică trece pătratul pe două laturi, cu tăieturile pe ele', () => {
  const p = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  const forme = [{ puncte: p, inchis: true, cutie: cutiePuncte(p) }];
  const l = locuriAproximative([{ x: -10, y: 20 }, { x: 110, y: 60 }], forme);
  assert.equal(l.length, 2);
  const s = [...l].sort((a, b) => a.x - b.x);
  assert.ok(Math.abs((s[0]?.x ?? 1) - 0) < 1e-9 && Math.abs((s[0]?.y ?? 0) - 70 / 3) < 1e-9);
  assert.ok(Math.abs((s[1]?.x ?? 0) - 100) < 1e-9 && Math.abs((s[1]?.y ?? 0) - 170 / 3) < 1e-9);
  assert.deepEqual(locuriAproximative([{ x: 200, y: 200 }, { x: 300, y: 300 }], forme), [], 'departe: nimic');
  assert.deepEqual(locuriAproximative([{ x: -10, y: 20 }, { x: 110, y: 60 }], forme, 1).length, 1, 'cel mult cât plafonul');
});

test('felurile cuțitului: doar cele știute trec', () => {
  for (const m of ['linie', 'pen', 'liber', 'forma', 'foarfeca', 'reteaza']) assert.ok(esteModCutit(m), m);
  for (const m of ['decupare', '', null, 3]) assert.ok(!esteModCutit(m), String(m));
});

test('selecția după tăiere: nimic ales rămâne nimic; o formă aleasă tăiată, înlocuită de bucățile ei; una ștearsă iese', () => {
  const degrupate = [{ instanta: { id: 'a' }, parti: [{ instanta: { id: 'a1' } }, { instanta: { id: 'a2' } }] }];
  assert.deepEqual(selectieDupa([], degrupate, []), []);
  assert.deepEqual(selectieDupa(['a', 'b'], degrupate, []), ['a1', 'a2', 'b']);
  assert.deepEqual(selectieDupa(['b', 'c'], degrupate, ['c']), ['b']);
});

test('bucata de sub maus (Retează): între cele mai apropiate locuri comune; fără ele, tot conturul; punctele ei, pentru marcaj', () => {
  // „#”: orizontala y = 20 și verticalele x = 20, x = 80, toate de la 0 la 100.
  const h = conturAproximat([{ x: 0, y: 20 }, { x: 100, y: 20 }], false, 'd');
  const v1 = conturAproximat([{ x: 20, y: 0 }, { x: 20, y: 100 }], false, 'd');
  const v2 = conturAproximat([{ x: 80, y: 0 }, { x: 80, y: 100 }], false, 'd');
  const forme = [h, v1, v2];
  const locuri = locuriComune(forme);
  assert.ok(locuri);
  assert.deepEqual(locuri[0], [20, 80], 'pe orizontală, la x = 20 și x = 80');
  assert.deepEqual(locuri[1], [20], 'și pe verticala x = 20, la y = 20');
  const capat = bucataSub(forme, locuri, { x: 90, y: 20.5 }, 1);
  assert.deepEqual(capat, { i: 0, de: 80, pana: 100, tot: false });
  assert.deepEqual(subPolilinie(h, 80, 100), [{ x: 80, y: 20 }, { x: 100, y: 20 }]);
  assert.deepEqual(bucataSub(forme, locuri, { x: 50, y: 20 }, 1), { i: 0, de: 20, pana: 80, tot: false }, 'mijlocul');
  assert.equal(bucataSub(forme, locuri, { x: 50, y: 50 }, 1), null, 'departe de contururi');
  // Un pătrat închis trecut de o singură verticală: două locuri, bucata din dreapta trece prin colțuri, peste capăt.
  const p = conturAproximat([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], true, 'p');
  const l = conturAproximat([{ x: 50, y: -10 }, { x: 50, y: 110 }], false, 'l');
  const lp = locuriComune([p, l]);
  assert.ok(lp);
  // Latura de jos, la 50; cea de sus se parcurge de la (100, 100) spre stânga: (50, 100) e la 200 + 50.
  assert.deepEqual(lp[0], [50, 250]);
  const dreapta = bucataSub([p, l], lp, { x: 100, y: 50 }, 1);
  assert.deepEqual(dreapta, { i: 0, de: 50, pana: 250, tot: false });
  assert.deepEqual(subPolilinie(p, 50, 250), [{ x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 100 }]);
  // Înaintea primului loc (jos, la x = 20): bucata vine de la ultimul loc, peste capăt.
  assert.deepEqual(bucataSub([p, l], lp, { x: 20, y: 0 }, 1), { i: 0, de: 250, pana: 50, tot: false });
  const stanga = bucataSub([p, l], lp, { x: 0, y: 50 }, 1);
  assert.deepEqual(stanga, { i: 0, de: 250, pana: 50, tot: false });
  assert.deepEqual(subPolilinie(p, 250, 50), [{ x: 50, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }, { x: 50, y: 0 }]);
  // Fără nicio altă formă: tot pătratul.
  assert.deepEqual(bucataSub([p], [[]], { x: 100, y: 50 }, 1), { i: 0, de: 0, pana: 400, tot: true });
  // Peste plafonul perechilor cercetate: nimic de arătat.
  assert.equal(locuriComune([p, l], 1), null);
});

test('locurile comune cu partenerii (Retează cu ceva ales): fiecare contur, doar cu formele alese și cu forma lui, ca la clic', () => {
  // „a” (aleasă): y = 0; „b” (nealeasă): x = 50 și, al doilea contur al ei, y = 30; „c” (nealeasă): x = 80. Verticalele merg
  // de la y = −50 la 50, orizontalele de la x = 0 la 100.
  const a = conturAproximat([{ x: 0, y: 0 }, { x: 100, y: 0 }], false, 'a');
  const b = conturAproximat([{ x: 50, y: -50 }, { x: 50, y: 50 }], false, 'b');
  const c = conturAproximat([{ x: 80, y: -50 }, { x: 80, y: 50 }], false, 'c');
  const b2 = conturAproximat([{ x: 0, y: 30 }, { x: 100, y: 30 }], false, 'b');
  const forme = [a, b, c, b2];
  assert.deepEqual(locuriComune(forme), [[50, 80], [50, 80], [50, 80], [50, 80]], 'fără parteneri, toate cu toate');
  const l = locuriComune(forme, undefined, new Set(['a']));
  assert.ok(l);
  // „a” e partenerul tuturor, dar partenerii ei sunt doar ea: retezată, pleacă toată.
  assert.deepEqual(l[0], [], '„a”: niciun loc');
  assert.deepEqual(l[1], [50, 80], '„b”: cu „a” (y = 0) și cu al doilea contur al ei (y = 30)');
  assert.deepEqual(l[2], [50], '„c”: doar cu „a”; „b” nu e aleasă');
  assert.deepEqual(l[3], [50], 'al doilea contur al lui „b”: doar cu „b”, nu și cu „c”');
  assert.deepEqual(bucataSub(forme, l, { x: 50, y: 20 }, 1), { i: 1, de: 50, pana: 80, tot: false });
  assert.deepEqual(bucataSub(forme, l, { x: 20, y: 0 }, 1), { i: 0, de: 0, pana: 100, tot: true });
});

// ——— Opțiunile tăierii, cât tragi (felia 10.3↑h) ———

const regiune = (instanta: string, x0: number, y0: number, x1: number, y1: number): RegiuneAproximativa => {
  const puncte = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  return { instanta, contururi: [{ puncte, inchis: true, cutie: cutiePuncte(puncte) }], cutie: cutiePuncte(puncte) };
};
/** Punctul q e în poligoane (par-impar)? */
function inPoligoane(q: { x: number; y: number }, ps: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>): boolean {
  let in_ = false;
  for (const p of ps) {
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i] as { x: number; y: number }, b = p[j] as { x: number; y: number };
      if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
    }
  }
  return in_;
}
const aproapeP = (a: { x: number; y: number } | undefined, x: number, y: number, mesaj: string): void => {
  assert.ok(a && Math.hypot(a.x - x, a.y - y) <= 1e-9, `${mesaj}: (${a?.x}, ${a?.y}), nu (${x}, ${y})`);
};

test('prelungirile arătate (ADR 0181 §2): până ies din pătrat, de la ambele capete (1e-3 peste); linia întreagă, dincolo de cutie; nu, nimic', () => {
  const p = regiune('a', 0, 0, 100, 100);
  const k = [{ x: 20, y: 50 }, { x: 80, y: 50 }];
  const f = prelungiriAproximative(k, 'forma', [p], p.cutie);
  assert.equal(f.length, 2);
  aproapeP(f[0]?.[1], -1e-3, 50, 'începutul, înapoi');
  aproapeP(f[1]?.[1], 100 + 1e-3, 50, 'sfârșitul');
  assert.deepEqual(cuPrelungiri(k, f).map((q) => Math.round(q.x * 1e9) / 1e9), [-1e-3, 20, 80, 100.001]);
  // Linia întreagă, cu cutia până la x = 300: sfârșitul la 300 + 1, începutul la 0 − 1.
  const i = prelungiriAproximative(k, 'intreaga', [p], { minX: 0, minY: 0, maxX: 300, maxY: 100 });
  aproapeP(i[0]?.[1], -1, 50, 'începutul, întreagă');
  aproapeP(i[1]?.[1], 301, 50, 'sfârșitul, întreagă');
  assert.deepEqual(prelungiriAproximative(k, 'nu', [p], p.cutie), []);
  // Un capăt în afara formelor rămâne; două pătrate lipite: trece prin amândouă.
  const afara = prelungiriAproximative([{ x: -10, y: 50 }, { x: 80, y: 50 }], 'forma', [p], p.cutie);
  assert.equal(afara.length, 1);
  aproapeP(afara[0]?.[1], 100 + 1e-3, 50, 'doar sfârșitul');
  const doua = prelungiriAproximative(k, 'forma', [p, regiune('c', 100, 0, 200, 100)], { minX: 0, minY: 0, maxX: 200, maxY: 100 });
  // A doua ieșire se măsoară din punctul de după prima (100,001): capătul ajunge la 200 + 1e-3.
  aproapeP(doua[1]?.[1], 200 + 1e-3, 50, 'prin al doilea pătrat');
});

test('partea care pleacă (ADR 0181 §2): cuțitul spre dreapta, „Păstrează stânga” estompează dedesubtul; la cel închis, înăuntrul sau afara', () => {
  const k = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
  const st = poligonSters(k, false, 'stanga', 1000);
  assert.ok(st && inPoligoane({ x: 5, y: -1 }, st) && !inPoligoane({ x: 5, y: 1 }, st), 'stânga păstrată: pleacă dedesubtul');
  const dr = poligonSters(k, false, 'dreapta', 1000);
  assert.ok(dr && inPoligoane({ x: 5, y: 1 }, dr) && !inPoligoane({ x: 5, y: -1 }, dr), 'dreapta păstrată: pleacă deasupra');
  // Și dincolo de capete (prelungirea dusă departe), tot dedesubt.
  assert.ok(st && inPoligoane({ x: 500, y: -1 }, st) && inPoligoane({ x: -500, y: -1 }, st));
  const patrat = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const inauntru = poligonSters(patrat, true, 'dreapta', 1000);
  assert.ok(inauntru && inPoligoane({ x: 5, y: 5 }, inauntru) && !inPoligoane({ x: 50, y: 50 }, inauntru), 'în afară păstrat: pleacă înăuntrul');
  const afara = poligonSters(patrat, true, 'stanga', 1000);
  assert.ok(afara && !inPoligoane({ x: 5, y: 5 }, afara) && inPoligoane({ x: 50, y: 50 }, afara), 'înăuntru păstrat: pleacă afara');
});

test('regiunile atinse: cuțitul care trece pătratul de tot, da; cel care se oprește în el, nu; cel închis, tot înăuntru, da', () => {
  const p = regiune('a', 0, 0, 100, 100), q = regiune('b', 200, 0, 300, 100);
  assert.deepEqual(regiuniAtinse([{ x: -10, y: 50 }, { x: 110, y: 50 }], false, [p, q]).map((r) => r.instanta), ['a']);
  assert.deepEqual(regiuniAtinse([{ x: -10, y: 50 }, { x: 50, y: 50 }], false, [p, q]), []);
  const inel = [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 40, y: 60 }];
  assert.deepEqual(regiuniAtinse(inel, true, [p, q]).map((r) => r.instanta), ['a']);
  assert.deepEqual(regiuniAtinse(inel, false, [p, q]), [], 'aceeași cale, deschisă: nu trece nimic');
});

test('fâșia arătată cât tragi (ADR 0181 §2): linia mutată cu 2 de fiecare parte; la un colț drept, pe bisectoare; nimic fără lungime', () => {
  assert.deepEqual(fasieAproximativa([{ x: 0, y: 0 }, { x: 10, y: 0 }], 4), [[{ x: 0, y: 2 }, { x: 10, y: 2 }], [{ x: 0, y: -2 }, { x: 10, y: -2 }]]);
  const colt = fasieAproximativa([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 2);
  assert.ok(colt);
  const [st, dr] = colt;
  const h = Math.SQRT1_2;
  assert.ok(Math.hypot((st[1]?.x ?? 0) - (10 - h), (st[1]?.y ?? 0) - h) < 1e-12, 'stânga, înăuntrul colțului');
  assert.ok(Math.hypot((dr[1]?.x ?? 0) - (10 + h), (dr[1]?.y ?? 0) + h) < 1e-12, 'dreapta, în afara lui');
  assert.deepEqual(st[2], { x: 9, y: 10 });
  // Întoarcerea pe loc ia normala laturii de după; punctele repetate nu contează.
  assert.deepEqual(fasieAproximativa([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }], 2)?.[0][1], { x: 10, y: -1 });
  assert.equal(fasieAproximativa([{ x: 1, y: 1 }, { x: 1, y: 1 }], 4), null);
  assert.equal(fasieAproximativa([{ x: 0, y: 0 }, { x: 10, y: 0 }], 0), null);
});

test('spațiul cerut din opțiuni: doar cu închidere și fără „nimic”, cu lățimea lor', () => {
  const o: OptiuniTaiere = { inchide: true, prelungeste: 'nu', pastreaza: 'ambele', stergeCutitul: false, intre: 'spatiu', latime: 3, imbinare: 'dreapta', pas: 40, inaltime: 20, raza: 3 };
  assert.deepEqual(intreDin(o), { fel: 'spatiu', latime: 3 });
  assert.deepEqual(intreDin({ ...o, intre: 'suprapunere', latime: 0.5 }), { fel: 'suprapunere', latime: 0.5 });
  assert.equal(intreDin({ ...o, intre: 'nimic' }), undefined);
  assert.equal(intreDin({ ...o, inchide: false }), undefined, 'fără închidere, nimic');
});

test('îmbinarea cerută din opțiuni (ADR 0181 §6): doar cu închidere, pe o tăietură dreaptă și cu un model, cu mărimile lor', () => {
  const o: OptiuniTaiere = { inchide: true, prelungeste: 'nu', pastreaza: 'ambele', stergeCutitul: false, intre: 'nimic', latime: 3, imbinare: 'zigzag', pas: 40, inaltime: 20, raza: 3 };
  assert.deepEqual(imbinareDin(o, true), { model: 'zigzag', pas: 40, inaltime: 20, raza: 3 });
  assert.deepEqual(imbinareDin({ ...o, imbinare: 'puzzle', pas: 30, inaltime: 12, raza: 0.5 }, true), { model: 'puzzle', pas: 30, inaltime: 12, raza: 0.5 });
  assert.equal(imbinareDin(o, false), undefined, 'tăietura nu e dreaptă');
  assert.equal(imbinareDin({ ...o, inchide: false }, true), undefined, 'fără închidere');
  assert.equal(imbinareDin({ ...o, imbinare: 'dreapta' }, true), undefined, 'marginea dreaptă');
});

test('coardele arătate (ADR 0181 §6): dreapta prin pătrat, de la A; prin inel, două; doar cele toate între capete; în orice sens', () => {
  const p = regiune('a', 0, 0, 100, 100);
  assert.deepEqual(corziAproximative({ x: -10, y: 50 }, { x: 1, y: 0 }, 0, 1e9, [p]), [[10, 110]]);
  assert.deepEqual(corziAproximative({ x: 110, y: 50 }, { x: -1, y: 0 }, 0, 1e9, [p]), [[10, 110]], 'în sens invers, tot de la A');
  assert.deepEqual(corziAproximative({ x: 30, y: -20 }, { x: 0, y: 1 }, 0, 1e9, [p]), [[20, 120]], 'verticala');
  assert.deepEqual(corziAproximative({ x: -10, y: 50 }, { x: 1, y: 0 }, 20, 1e9, [p]), [], 'coarda începe înaintea capătului');
  assert.deepEqual(corziAproximative({ x: -10, y: 50 }, { x: 1, y: 0 }, 0, 100, [p]), [], 'coarda trece de capăt');
  assert.deepEqual(corziAproximative({ x: -10, y: 150 }, { x: 1, y: 0 }, 0, 1e9, [p]), [], 'dreapta ocolește pătratul');
  const gaura = [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 40, y: 60 }];
  const inel: RegiuneAproximativa = { ...p, contururi: [...p.contururi, { puncte: gaura, inchis: true, cutie: cutiePuncte(gaura) }] };
  assert.deepEqual(corziAproximative({ x: -10, y: 50 }, { x: 1, y: 0 }, 0, 1e9, [inel]), [[10, 50], [70, 110]]);
  assert.deepEqual(corziAproximative({ x: -10, y: 50 }, { x: 1, y: 0 }, 0, 1e9, [p, regiune('b', 200, 0, 300, 100)]), [[10, 110], [210, 310]], 'două forme');
});

test('dinții arătați (ADR 0181 §6): zigzagul pe coardă, în lume; rotunjirile, prin arce cu vârful la r(√2 − 1) sub colț; fără dinte, nimic', () => {
  const A = { x: -10, y: 50 }, u = { x: 1, y: 0 };
  const aproape = (a: readonly { x: number; y: number }[], b: readonly { x: number; y: number }[]): boolean =>
    a.length === b.length && a.every((q, i) => Math.hypot(q.x - (b[i]?.x ?? Number.NaN), q.y - (b[i]?.y ?? Number.NaN)) < 1e-9);
  // Pasul 40 pe 100: un dinte, cu câte 30 drepți la capete; fără rază, colțurile ascuțite.
  const [z, ...rest] = dintiAproximativi(A, u, [[10, 110]], { model: 'zigzag', pas: 40, inaltime: 20, raza: 0 });
  assert.equal(rest.length, 0);
  assert.ok(z && aproape(z, [{ x: 0, y: 50 }, { x: 30, y: 50 }, { x: 40, y: 60 }, { x: 60, y: 40 }, { x: 70, y: 50 }, { x: 100, y: 50 }]), JSON.stringify(z));
  // Cu raza 3: patru colțuri, fiecare cu două vârfuri și 11 puncte pe arc; vârful de sus, coborât cu 3(√2 − 1).
  const [r] = dintiAproximativi(A, u, [[10, 110]], { model: 'zigzag', pas: 40, inaltime: 20, raza: 3 });
  assert.ok(r);
  assert.equal(r.length, 10 + 4 * 11);
  assert.ok(aproape([r[0] as { x: number; y: number }, r[r.length - 1] as { x: number; y: number }], [{ x: 0, y: 50 }, { x: 100, y: 50 }]));
  const sus = Math.max(...r.map((q) => q.y)), jos = Math.min(...r.map((q) => q.y));
  assert.ok(Math.abs(sus - (60 - 3 * (Math.SQRT2 - 1))) < 1e-9, `sus: ${sus}`);
  assert.ok(Math.abs(jos - (40 + 3 * (Math.SQRT2 - 1))) < 1e-9, `jos: ${jos}`);
  // Pe direcția verticală, dinții merg spre stânga ei (−x).
  const [v] = dintiAproximativi({ x: 50, y: -10 }, { x: 0, y: 1 }, [[10, 110]], { model: 'zigzag', pas: 40, inaltime: 20, raza: 0 });
  assert.ok(v && aproape(v.slice(2, 4), [{ x: 40, y: 40 }, { x: 60, y: 60 }]), JSON.stringify(v));
  // Fără dinte întreg (pasul 40 pe 40) sau cu raza care nu încape (dinții drepți de 10 cu raza 3): nimic de arătat.
  assert.deepEqual(dintiAproximativi(A, u, [[10, 50]], { model: 'zigzag', pas: 40, inaltime: 20, raza: 0 }), []);
  assert.deepEqual(dintiAproximativi(A, u, [[10, 110]], { model: 'dinti', pas: 20, inaltime: 10, raza: 3 }), []);
  assert.equal(dintiAproximativi(A, u, [[10, 110], [210, 310]], { model: 'val', pas: 40, inaltime: 20, raza: 3 }).length, 2, 'o polilinie pe coardă');
});
