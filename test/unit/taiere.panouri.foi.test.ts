/**
 * Panourile pe foi (ADR 0181 §7; felia 10.3↑l), pe hârtie:
 * - **ieșirea peste linie:** fără îmbinare, 0; dinții de 20 mm, 10; cu spațiul de 0,2, 9,9; cu suprapunerea de 0,4, 10,2; o
 *   linie dreaptă cu spațiul de 3 nu iese (0, nu −1,5), cu suprapunerea de 2, 1;
 * - **locul pe foaie:** foaia de 1 200 × 900, marginile 10, freza 6: 1 180 × 880; marginile 2 cu freza 6, 1 194 × 894; cu freza
 *   12, marginea urcă la raza ei, 1 188 × 888; marginile diferite pe axe (0 și 5, fără freză): 1 200 × 890;
 * - **mărimea implicită:** locul fără ieșirea de pe ambele laturi (1 180 × 880 cu dinții de 20: 1 160 × 860); nimic rămas, null;
 * - **cel mai mare panou:** pe fiecare axă, cea mai lată fâșie cu ieșirea pe laturile ei tăiate (la margine, una; la mijloc,
 *   două; o fâșie singură, niciuna); încape cum e sau, cu rotirea, culcat;
 * - **firma de 2 400 × 1 000 pe foi de 1 200 × 900** (marginile „Așază pe foi”, 10): cu mărimea implicită, șase panouri de
 *   800 × 500 (cu dinții, 820 × 510 la mijloc), iar „Așază pe foi” le pune pe toate, câte unul pe foaie (prima, apoi cinci
 *   noi); din colț, panoul din mijloc are exact locul (1 180), și tot încape; cutiile măsurate de oracol (nu de aplicație) stau
 *   în marginile prezise, la dinții drepți exact; cu mărimea foii (implicitul de dinainte), patru panouri de 1 200 × 500, pe
 *   care verificarea blocului le spune prea mari, iar „Așază pe foi” le lasă pe loc pe toate (ambele direcții, pe firma plină).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASEZARE_IMPLICITA, distantaMinima, planAsezare } from '../../src/model/asezare.ts';
import type { Document, FormaDoc } from '../../src/model/document.ts';
import { grilaPanouri, type GrilaPanouri } from '../../src/model/grilaPanouri.ts';
import { comenziGrupuriPanouri } from '../../src/model/grupuriPanouri.ts';
import type { Imbinare } from '../../src/model/imbinare.ts';
import { executa, istoricNou, type Comanda } from '../../src/model/jurnal.ts';
import { taieInPanouri, type CererePanouri } from '../../src/model/panouri.ts';
import { celMaiMarePanou, incapePeFoaie, iesirePesteLinie, locPeFoaie, marimeImplicita, type Marime } from '../../src/model/panouriPeFoaie.ts';
import type { Intre } from '../../src/model/taiere.ts';
import { cutieForma, formeInstanta } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';

const FOAIE = { latime: 1200, inaltime: 900, grosime: 18 };
const dreptunghi = (w: number, h: number): FormaDoc => ({ tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 });
const FIRMA = { id: 'f', forma: dreptunghi(2400, 1000), matrice: { ...ID, e: 0, f: 0 } };
const CUTIE = { minX: 0, minY: 0, maxX: 2400, maxY: 1000 };
const DINTI: Imbinare = { model: 'dinti', pas: 100, inaltime: 20, raza: 3 };
const ZIGZAG: Imbinare = { model: 'zigzag', pas: 100, inaltime: 20, raza: 3 };
const SPATIU: Intre = { fel: 'spatiu', latime: 0.2 };
const M10 = { margineX: 10, margineY: 10 };
const egal = (a: number, b: number, mesaj: string): void => { assert.ok(Math.abs(a - b) < 1e-9, `${mesaj}: ${a}, nu ${b}`); };

test('ieșirea peste linie: jumătate din dinți, plus jumătate din suprapunere sau minus jumătate din spațiu; cel puțin 0', () => {
  assert.equal(iesirePesteLinie(undefined, undefined), 0);
  assert.equal(iesirePesteLinie(ZIGZAG, undefined), 10);
  egal(iesirePesteLinie(ZIGZAG, SPATIU), 9.9, 'dinții și spațiul');
  egal(iesirePesteLinie(DINTI, { fel: 'suprapunere', latime: 0.4 }), 10.2, 'dinții și suprapunerea');
  assert.equal(iesirePesteLinie(undefined, { fel: 'spatiu', latime: 3 }), 0, 'o linie dreaptă cu spațiu nu iese (0, nu −1,5)');
  assert.equal(iesirePesteLinie(undefined, { fel: 'suprapunere', latime: 2 }), 1);
});

test('locul pe foaie: foaia fără marginile așezării, fiecare cel puțin raza frezei; mărimea implicită, fără ieșirea de pe ambele laturi', () => {
  assert.deepEqual(locPeFoaie(FOAIE, M10, 6), { latime: 1180, inaltime: 880 });
  assert.deepEqual(locPeFoaie(FOAIE, { margineX: 2, margineY: 2 }, 6), { latime: 1194, inaltime: 894 });
  assert.deepEqual(locPeFoaie(FOAIE, { margineX: 2, margineY: 2 }, 12), { latime: 1188, inaltime: 888 }, 'marginea urcă la raza frezei');
  assert.deepEqual(locPeFoaie(FOAIE, { margineX: 0, margineY: 5 }, 0), { latime: 1200, inaltime: 890 });
  assert.deepEqual(marimeImplicita({ latime: 1180, inaltime: 880 }, 0), { latime: 1180, inaltime: 880 });
  assert.deepEqual(marimeImplicita({ latime: 1180, inaltime: 880 }, 10), { latime: 1160, inaltime: 860 });
  assert.equal(marimeImplicita({ latime: 1180, inaltime: 880 }, 440), null, 'nimic pe înălțime');
  assert.equal(marimeImplicita({ latime: 0, inaltime: 880 }, 0), null);
});

test('cel mai mare panou: fâșia cea mai lată cu ieșirea pe laturile tăiate; încape cum e sau culcat', () => {
  // Trei coloane de 800: la margini, o latură tăiată (810); la mijloc, două (820). Două rânduri de 500: câte una (510).
  assert.deepEqual(celMaiMarePanou(CUTIE, [800, 1600], [500], 10), { latime: 820, inaltime: 510 });
  // Din colț, 1 160, 1 160 și 80: la mijloc 1 180 (cât locul), la capăt 90; rândurile 860 + 10 și 140 + 10.
  assert.deepEqual(celMaiMarePanou(CUTIE, [1160, 2320], [860], 10), { latime: 1180, inaltime: 870 });
  // O fâșie singură nu e tăiată: fără ieșire.
  assert.deepEqual(celMaiMarePanou(CUTIE, [], [500], 10), { latime: 2400, inaltime: 510 });
  // Cutia mutată: fâșiile se măsoară de la marginea ei.
  assert.deepEqual(celMaiMarePanou({ minX: 100, minY: -50, maxX: 2500, maxY: 950 }, [1300], [450], 0), { latime: 1200, inaltime: 500 });
  const loc: Marime = { latime: 1180, inaltime: 880 };
  assert.ok(incapePeFoaie({ latime: 1180, inaltime: 880 }, loc, false), 'cât locul încape');
  assert.ok(incapePeFoaie({ latime: 1180 + 1e-10, inaltime: 880 }, loc, false), 'zgomotul calculului încape');
  assert.ok(!incapePeFoaie({ latime: 1180.001, inaltime: 880 }, loc, false));
  assert.ok(!incapePeFoaie({ latime: 820, inaltime: 1000 }, loc, false));
  assert.ok(incapePeFoaie({ latime: 820, inaltime: 1000 }, loc, true), 'culcat: 1 000 × 820');
  assert.ok(!incapePeFoaie({ latime: 1200, inaltime: 500 }, loc, true), '1 200 nu încape pe nicio axă');
});

/** Firma tăiată în panouri și grupată, ca acțiunea `document.taie`; panourile, în ordinea lor. */
function taiata(d: Document, grila: GrilaPanouri, o: Partial<CererePanouri> = {}): { readonly dupa: Document; readonly ids: readonly string[] } {
  const r = taieInPanouri(d, { alese: ['f'], grila, inchide: true, nume: 'Panoul', ...o });
  if (!r.ok) return assert.fail(`refuzată: ${r.motiv}`);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const cs: Comanda[] = r.degrupate.length > 0 ? [{ tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }] : [];
  const g = comenziGrupuriPanouri(cs.length > 0 ? executa(istoricNou(d), { tip: 'lot', comenzi: cs }).doc : d, foaie.id, r.grupuri ?? [], r.ids, d);
  assert.ok(g);
  return { dupa: executa(istoricNou(d), { tip: 'lot', comenzi: [...cs, ...g.comenzi] }).doc, ids: g.ids };
}

/** Cutia unui panou, măsurată de oracol (formele lui în lume, cu arcele). */
function cutiePanou(dupa: Document, id: string): Marime {
  const k = formeInstanta(dupa, id).map(cutieForma);
  const minX = Math.min(...k.map((c) => c.minX)), maxX = Math.max(...k.map((c) => c.maxX));
  const minY = Math.min(...k.map((c) => c.minY)), maxY = Math.max(...k.map((c) => c.maxY));
  return { latime: maxX - minX, inaltime: maxY - minY };
}

/**
 * Mărimea implicită a blocului pe firmă, tăierea și „Așază pe foi” pe panouri: cel mai mare panou prezis, cel măsurat și
 * planul așezării.
 */
function laFoaie(grila: (m: Marime) => GrilaPanouri, imbinare?: Imbinare, intre?: Intre) {
  const d = docDin(FOAIE, FIRMA);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const loc = locPeFoaie(FOAIE, M10, distantaMinima(d, ['f'], foaie.id));
  const iesire = iesirePesteLinie(imbinare, intre);
  const m = marimeImplicita(loc, iesire);
  assert.ok(m);
  const g = grila(m);
  const linii = grilaPanouri(CUTIE, g);
  assert.ok(typeof linii === 'object');
  const prezis = celMaiMarePanou(CUTIE, linii.xs, linii.ys, iesire);
  const { dupa, ids } = taiata(d, g, { ...(imbinare ? { imbinare } : {}), ...(intre ? { intre } : {}) });
  const masurate = ids.map((id) => cutiePanou(dupa, id));
  // Ca dialogul: distanța pornește cel puțin de la freza profilului exterior (6 > 5).
  const d0 = distantaMinima(dupa, ids, foaie.id);
  const plan = planAsezare(dupa, ids, foaie.id, { ...ASEZARE_IMPLICITA, distantaX: Math.max(5, d0), distantaY: Math.max(5, d0) });
  assert.ok(plan.ok);
  return { loc, m, linii, prezis, masurate, plan, ids };
}

test('firma pe foi de 1 200 × 900, cu mărimea implicită: șase panouri de 800 × 500, toate așezate, câte unul pe foaie', () => {
  const { loc, m, linii, prezis, masurate, plan, ids } = laFoaie((x) => ({ fel: 'marime', latime: x.latime, inaltime: x.inaltime, colt: false }));
  assert.deepEqual(loc, { latime: 1180, inaltime: 880 }, 'freza implicită (6) e sub margine (10)');
  assert.deepEqual(m, loc, 'fără îmbinare, panoul e cât locul');
  assert.deepEqual(linii, { xs: [800, 1600], ys: [500] });
  assert.deepEqual(prezis, { latime: 800, inaltime: 500 });
  assert.equal(ids.length, 6);
  for (const x of masurate) { egal(x.latime, 800, 'lățimea'); egal(x.inaltime, 500, 'înălțimea'); }
  assert.deepEqual(plan.preaMari, []);
  assert.equal(plan.locuri.length, 6);
  assert.equal(plan.foiNoi, 5, 'unul pe foaia lui, cinci pe foi noi (două nu încap alături: 800 + 5 + 800 > 1 180)');
  assert.deepEqual(plan.locuri.map((l) => l.id), ids, 'în ordinea panourilor');
});

test('cu dinții drepți (100 / 20 / 3): implicit 1 160 × 860; cutiile măsurate sunt exact cele prezise (820 × 510 la mijloc); toate se așază', () => {
  const { m, linii, prezis, masurate, plan } = laFoaie((x) => ({ fel: 'marime', latime: x.latime, inaltime: x.inaltime, colt: false }), DINTI);
  assert.deepEqual(m, { latime: 1160, inaltime: 860 });
  assert.deepEqual(linii, { xs: [800, 1600], ys: [500] });
  assert.deepEqual(prezis, { latime: 820, inaltime: 510 });
  // Rând cu rând, de jos: coloanele margine, mijloc, margine; fiecare cu un rând tăiat (510).
  const asteptate = [810, 820, 810, 810, 820, 810];
  for (const [k, x] of masurate.entries()) { egal(x.latime, asteptate[k] ?? 0, `lățimea panoului ${k + 1}`); egal(x.inaltime, 510, `înălțimea panoului ${k + 1}`); }
  assert.deepEqual(plan.preaMari, []);
  assert.equal(plan.locuri.length, 6);
});

test('din colț, cu dinții drepți: panoul din mijloc are exact locul (1 180 × 870) și tot încape', () => {
  const { linii, prezis, masurate, plan } = laFoaie((x) => ({ fel: 'marime', latime: x.latime, inaltime: x.inaltime, colt: true }), DINTI);
  assert.deepEqual(linii, { xs: [1160, 2320], ys: [860] });
  assert.deepEqual(prezis, { latime: 1180, inaltime: 870 });
  egal(Math.max(...masurate.map((x) => x.latime)), 1180, 'cel mai lat, măsurat');
  egal(Math.max(...masurate.map((x) => x.inaltime)), 870, 'cel mai înalt, măsurat');
  assert.deepEqual(plan.preaMari, [], 'cât locul, cu zgomotul calculului, încape');
});

test('cu zigzag și spațiul de 0,2: cutiile măsurate stau în marginile prezise; toate se așază', () => {
  const { m, prezis, masurate, plan } = laFoaie((x) => ({ fel: 'marime', latime: x.latime, inaltime: x.inaltime, colt: false }), ZIGZAG, SPATIU);
  assert.ok(m);
  egal(m.latime, 1160.2, 'lățimea implicită');
  for (const x of masurate) {
    assert.ok(x.latime <= prezis.latime + 1e-9 && x.inaltime <= prezis.inaltime + 1e-9, `${x.latime} × ${x.inaltime} peste ${prezis.latime} × ${prezis.inaltime}`);
  }
  // Marginea nu e largă degeaba: vârfurile rotunjite ale zigzagului pierd sub 1 mm.
  assert.ok(Math.max(...masurate.map((x) => x.latime)) > prezis.latime - 1, 'lățimea măsurată, aproape de cea prezisă');
  assert.deepEqual(plan.preaMari, []);
});

test('cu mărimea foii (implicitul de dinainte): patru panouri de 1 200 × 500; blocul le spune prea mari, „Așază pe foi” le lasă pe loc', () => {
  const { loc, prezis, plan, ids } = laFoaie(() => ({ fel: 'marime', latime: FOAIE.latime, inaltime: FOAIE.inaltime, colt: false }));
  assert.equal(ids.length, 4);
  assert.deepEqual(prezis, { latime: 1200, inaltime: 500 });
  assert.ok(!incapePeFoaie(prezis, loc, false) && !incapePeFoaie(prezis, loc, true), 'verificarea blocului: nu încape');
  assert.deepEqual([...plan.preaMari].sort(), [...ids].sort(), 'așezarea: toate rămân pe loc');
  assert.equal(plan.locuri.length, 0);
});
