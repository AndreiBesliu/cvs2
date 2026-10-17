import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucatiDinSiruri, siruriDinProgram, siruriInBuget, varfuriGpu } from '../../src/app/traseuDesen.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { documentNou } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { textNumar } from '../../src/ui/numar.ts';

/**
 * Otrăvurile scăpate ale feliilor 2.8c / 2.8d (2.8e, sesiunea independentă, `test/otravuri/2.8.py`): câte un test țintit
 * pe fiecare gaură unitară. Fiecare trece pe codul curat și pică cu otrava lui (probat cu `otravuri.py … tinte`).
 */

test('N07 / N11: zero se scrie „0” (fără recursie), iar negativul păstrează virgula în română', () => {
  assert.equal(textNumar(0), '0');
  assert.equal(textNumar(0, true), '0');
  assert.equal(textNumar(-2.5, true), '-2,5');
  assert.equal(textNumar(-2.5), '-2.5');
});

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

/** Foaia aplicației, cu dreptunghiul (e1) și cercul (e2) implicite. */
function douaForme() {
  let h: Istoric = istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let sel: readonly string[] = [];
  const st = { pozitie: {} as { x?: number; y?: number } };
  const ctx: ContextDocument = {
    istoric: () => h, scrie: (n) => { h = n; }, selectie: () => sel, selecteaza: (i) => { sel = i; },
    pozitieNoua: () => st.pozitie, rotireNoua: () => 0,
  };
  assert.equal(ruleaza(R, 'document.adauga-dreptunghi', ctx).ok, true);
  assert.equal(ruleaza(R, 'document.adauga-cerc', ctx).ok, true);
  const instanta = (id: string) => h.doc.foi[0]?.instante.find((i) => i.id === id);
  return { ctx, st, selecteaza: (ids: readonly string[]) => { sel = ids; }, instanta, pasi: () => h.trecut.length };
}

test('A19: un Y nefinit e refuzat cu „valoare invalidă” (oglinda lui X), fără comandă', () => {
  const d = douaForme();
  d.selecteaza(['e1']);
  const n = d.pasi();
  for (const y of [Number.NaN, Number.POSITIVE_INFINITY]) {
    d.st.pozitie = { y };
    assert.deepEqual(ruleaza(R, 'document.pozitioneaza', d.ctx), { ok: false, motiv: 'motiv.valoare-invalida' }, String(y));
  }
  assert.equal(d.pasi(), n);
});

test('A22: poziționarea mută doar formele alese; cealaltă rămâne identică', () => {
  const d = douaForme();
  const e2 = structuredClone(d.instanta('e2'));
  d.selecteaza(['e1']);
  d.st.pozitie = { x: 50, y: 40 };
  assert.equal(ruleaza(R, 'document.pozitioneaza', d.ctx).ok, true);
  assert.deepEqual(d.instanta('e2'), e2);
  assert.notDeepEqual(d.instanta('e1')?.x, undefined);
});

/** Un cerc întreg de rază 10 în (0, 0), pornit din (10, 0). */
const cerc: Miscare[] = [
  { tip: 'rapida', la: { X: 10, Y: 0 } },
  { tip: 'arc', la: { X: 10, Y: 0 }, centru: { x: 0, y: 0 }, sens: 'trigonometric', avans: 1000 },
];
const coardeTaiere = (toleranta: number): number => {
  const s = siruriDinProgram(cerc, toleranta).siruri.filter((x) => !x.rapid);
  return s.reduce((n, x) => n + x.puncte.length / 2 - 1, 0);
};

test('T03 / T04: un cerc întreg are cel puțin o coardă pe sfert (un pătrat), și cu toleranța cât raza sau peste', () => {
  for (const tol of [9, 10, 25, 1e6]) assert.ok(coardeTaiere(tol) >= 4, `toleranța ${tol}: ${coardeTaiere(tol)} coarde`);
});

/** O polilinie de `n` segmente scurte (1 mm), într-un singur șir: `1 + n` vârfuri în GPU. */
function polilinie(n: number): Miscare[] {
  const m: Miscare[] = [{ tip: 'rapida', la: { X: 0, Y: 0 } }];
  for (let i = 1; i <= n; i++) m.push({ tip: 'taiere', la: { X: i % 2, Y: i }, avans: 1000 });
  return m;
}

test('T11: un program exact la buget nu se rărește, iar toleranța rămâne cea cerută', () => {
  const m = [...polilinie(40), ...cerc];
  const exact = varfuriGpu(siruriDinProgram(m, 0.001).siruri);
  const r = siruriInBuget(m, 0.001, exact);
  assert.deepEqual([r.rarit, r.pesteBuget, r.toleranta], [false, false, 0.001]);
  assert.equal(siruriInBuget(m, 0.001, exact - 1).rarit, true, 'un vârf sub buget: rărit');
});

test('T12: când rărește, toleranța întoarsă e cea mai fină care încape (la jumătatea ei, bugetul se depășește)', () => {
  const cercuri: Miscare[] = [];
  for (let i = 1; i <= 100; i++) cercuri.push({ tip: 'rapida', la: { X: 100 + i, Y: 0 } }, { tip: 'arc', la: { X: 100 + i, Y: 0 }, centru: { x: 100, y: 0 }, sens: 'trigonometric', avans: 1000 });
  const buget = 2000;
  // Două porniri, la un factor 2: una cere un număr impar de dublări, deci un salt mai mare decât ×2 trece de cea mai fină.
  for (const start of [1e-5, 2e-5]) {
    const r = siruriInBuget(cercuri, start, buget);
    assert.equal(r.rarit, true);
    assert.ok(varfuriGpu(r.siruri) <= buget);
    // Șirurile întoarse sunt chiar cele ale toleranței întoarse (nu mai grosiere decât spune ea).
    assert.equal(r.segmente, siruriDinProgram(cercuri, r.toleranta).segmente, `pornit de la ${start}`);
    assert.ok(varfuriGpu(siruriDinProgram(cercuri, r.toleranta / 2).siruri) > buget, `pornit de la ${start}: la ${r.toleranta / 2} încăpea încă`);
  }
});

test('T17: un șir de peste 65 536 de vârfuri într-un pătrat de 1 mm se împarte în bucăți de cel mult 65 536, legate', () => {
  const puncte: number[] = [];
  for (let i = 0; i < 70_000; i++) puncte.push((i % 7) * 0.1, (i % 11) * 0.05);
  const b = bucatiDinSiruri([{ rapid: false, puncte }]);
  assert.ok(b.length >= 2, `${b.length} bucăți`);
  for (const x of b) assert.ok(x.varfuri.length / 2 <= 65_536, `${x.varfuri.length / 2} vârfuri`);
  for (let i = 1; i < b.length; i++) {
    const a = b[i - 1];
    const c = b[i];
    assert.ok(a && c);
    const n = a.varfuri.length;
    // Ultimul vârf al bucății dinainte e primul vârf al celei de acum (în lume): șirul nu are gol.
    assert.ok(Math.abs((a.origine.x + (a.varfuri[n - 2] ?? 0)) - (c.origine.x + (c.varfuri[0] ?? 0))) < 1e-6);
    assert.ok(Math.abs((a.origine.y + (a.varfuri[n - 1] ?? 0)) - (c.origine.y + (c.varfuri[1] ?? 0))) < 1e-6);
  }
});

test('T20: cutia unei bucăți e în coordonatele foii, nu relativă la originea ei', () => {
  const [b] = bucatiDinSiruri([{ rapid: false, puncte: [1000, 500, 1010, 505] }]);
  assert.ok(b);
  assert.deepEqual(b.cutie, { minX: 1000, minY: 500, maxX: 1010, maxY: 505 });
});
