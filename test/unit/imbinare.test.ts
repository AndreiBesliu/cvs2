/**
 * Modelele îmbinării (ADR 0181 §6; felia 10.3↑j; `src/model/imbinare.ts`), pe hârtie:
 * - **dinții pe coardă:** ⌊l / pas − 1⌋, iar restul, egal la capete (100 / 20: patru, câte 10; 100 / 40: unul, câte 30; 30 / 20:
 *   niciunul);
 * - **zigzagul** (pasul 20, înălțimea 10, pe 100): fără rază, vârfurile (10, 0), (15, 5), (25, −5) … (85, −5), (90, 0); cu raza
 *   3, fiecare colț devine un arc tangent, cu bulge-ul tan(cotitură / 4) (vârful de sus: −tan 22,5°; intrarea: tan 11,25°), iar
 *   capetele rămân pe linie;
 * - **valul** (pasul 40, înălțimea 20): arce de raza (40² / 16 + 20² / 4) / 40 = 5, cu vârful exact la ±10; cu pasul 20 și
 *   înălțimea 10, raza 2,5 nu ține o freză de 3 (`imbinare-raza`);
 * - **puzzle-ul** (pasul 40, înălțimea 24, raza 3): capul de rază 6, flancurile la √72 de mijloc, arcul capului peste o jumătate
 *   de cerc; cu înălțimea 12 (= 4 raze) capul nu e mai lat decât gâtul; cu raza 0, nici gât (`imbinare-raza`);
 * - **dinții drepți** cu înălțimea 10 și raza 3: treapta de 5 nu ține două rotunjiri de 3 (`imbinare-raza`); cu raza 2, da;
 * - **coada de rândunică:** laturile înclinate cu înălțimea / 6, dintele mai lat la vârf decât la bază;
 * - **simetria:** fiecare drum, rotit cu 180° în jurul mijlocului coardei, e tot el (ariile celor două bucăți, egale);
 * - **fără laturi de lungime zero:** cocoașele valului se ating (capătul uneia e începutul celeilalte), nodurile puzzle-ului la
 *   fel când picioarele lor stau la un sfert de pas (40 / 25 / 4), iar treapta dinților drepți de 12 cu raza 3 e cât două
 *   rotunjiri: vârful lipit se scoate;
 * - **valorile:** pasul și înălțimea pozitive, raza cel puțin 0, cel mult 1 000, modelul cunoscut.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dintiPe, drumImbinare, imbinareBuna, MODELE_IMBINARE, type Imbinare, type VarfImbinare } from '../../src/model/imbinare.ts';

const im = (model: Imbinare['model'], pas: number, inaltime: number, raza: number): Imbinare => ({ model, pas, inaltime, raza });
const drum = (l: number, i: Imbinare): VarfImbinare[] => {
  const d = drumImbinare(l, i);
  if (d === null || typeof d === 'string') assert.fail(`fără drum: ${String(d)}`);
  return d;
};
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };

/** Punctul arcului de la p la q (bulge b), la fracțiunea f din baleiaj. */
function peArc(p: VarfImbinare, q: VarfImbinare, f: number): { t: number; s: number } {
  if (p.b === 0) return { t: p.t + (q.t - p.t) * f, s: p.s + (q.s - p.s) * f };
  const th = 4 * Math.atan(p.b), c = Math.hypot(q.t - p.t, q.s - p.s), r = c / (2 * Math.sin(Math.abs(th) / 2));
  const mt = (p.t + q.t) / 2, ms = (p.s + q.s) / 2, h = r * Math.cos(Math.abs(th) / 2) * Math.sign(p.b);
  const ct = mt - ((q.s - p.s) / c) * h, cs = ms + ((q.t - p.t) / c) * h;
  const u0 = Math.atan2(p.s - cs, p.t - ct);
  return { t: ct + r * Math.cos(u0 + th * f), s: cs + r * Math.sin(u0 + th * f) };
}
/** Punctele drumului, dese (arcele prin 64 de coarde). */
function puncte(v: readonly VarfImbinare[]): Array<{ t: number; s: number }> {
  const rez: Array<{ t: number; s: number }> = [];
  for (let i = 0; i + 1 < v.length; i++) for (let k = 0; k < 64; k++) rez.push(peArc(v[i] as VarfImbinare, v[i + 1] as VarfImbinare, k / 64));
  const z = v[v.length - 1] as VarfImbinare;
  rez.push({ t: z.t, s: z.s });
  return rez;
}

test('dinții pe coardă: ⌊l / pas − 1⌋, iar restul, egal la capete; niciunul, dacă nu încape întreg', () => {
  assert.deepEqual(dintiPe(100, 20), { n: 4, margine: 10 });
  assert.deepEqual(dintiPe(100, 40), { n: 1, margine: 30 });
  assert.deepEqual(dintiPe(30, 20), { n: 0, margine: 15 });
  assert.deepEqual(dintiPe(40, 20), { n: 1, margine: 10 });
  assert.equal(drumImbinare(30, im('zigzag', 20, 10, 0)), null);
});

test('zigzagul fără rază, pe 100 cu pasul 20 și înălțimea 10: (10, 0), (15, 5), (25, −5) … (85, −5), (90, 0), cu capetele pe linie', () => {
  const v = drum(100, im('zigzag', 20, 10, 0));
  assert.deepEqual(v.map((x) => [x.t, x.s]), [[0, 0], [10, 0], [15, 5], [25, -5], [35, 5], [45, -5], [55, 5], [65, -5], [75, 5], [85, -5], [90, 0], [100, 0]]);
  assert.ok(v.every((x) => x.b === 0));
});

test('zigzagul cu raza 3: colțurile devin arce tangente (vârful de sus −tan 22,5°, intrarea tan 11,25°), capetele rămân', () => {
  const v = drum(100, im('zigzag', 20, 10, 3));
  assert.deepEqual([v[0], v[v.length - 1]].map((x) => x && [x.t, x.s]), [[0, 0], [100, 0]]);
  // Intrarea: la (10, 0), cotitura de 45° spre stânga, arcul de la (10 − 3 tan 22,5°, 0).
  const intrare = v[1] as VarfImbinare;
  aproape(intrare.t, 10 - 3 * Math.tan(Math.PI / 8), 1e-12, 'începutul arcului de intrare');
  aproape(intrare.b, Math.tan(Math.PI / 16), 1e-12, 'bulge-ul intrării');
  // Primul vârf de sus, (15, 5): cotitura de 90° spre dreapta, tangentele la 3 de el.
  const sus = v.find((x) => x.b < 0) as VarfImbinare;
  aproape(sus.b, -Math.tan(Math.PI / 8), 1e-12, 'bulge-ul vârfului');
  aproape(Math.hypot(sus.t - 15, sus.s - 5), 3, 1e-12, 'tangenta la 3 de vârf');
  // Arcul vârfului ajunge la 3(√2 − 1) sub el: dintele are 5 − 1,243 deasupra liniei.
  const max = Math.max(...puncte(v).map((q) => q.s));
  aproape(max, 5 - 3 * (Math.SQRT2 - 1), 1e-3, 'vârful rotunjit');
});

test('simetria: fiecare drum, rotit cu 180° în jurul mijlocului coardei, e tot el', () => {
  const cazuri: Imbinare[] = [im('zigzag', 20, 10, 3), im('dinti', 20, 10, 2), im('coada', 40, 20, 3), im('val', 40, 20, 3), im('puzzle', 40, 24, 3)];
  for (const i of cazuri) {
    const p = puncte(drum(100, i));
    for (const q of p.filter((_, k) => k % 7 === 0)) {
      const d = Math.min(...p.map((x) => Math.hypot(x.t - (100 - q.t), x.s + q.s)));
      assert.ok(d < 0.05, `${i.model}: (${q.t.toFixed(3)}, ${q.s.toFixed(3)}) rotit nu e pe drum (${d})`);
    }
  }
});

test('valul (pasul 40, înălțimea 20): arce de raza 5, vârful exact la ±10; cu pasul 20 și înălțimea 10, raza 2,5 nu ține freza de 3', () => {
  const v = drum(100, im('val', 40, 20, 3));
  const p = puncte(v);
  aproape(Math.max(...p.map((q) => q.s)), 10, 1e-6, 'sus');
  aproape(Math.min(...p.map((q) => q.s)), -10, 1e-6, 'jos');
  // Fiecare arc are raza 5.
  for (let i = 0; i + 1 < v.length; i++) {
    const a = v[i] as VarfImbinare, b = v[i + 1] as VarfImbinare;
    if (a.b === 0) continue;
    const r = Math.hypot(b.t - a.t, b.s - a.s) / (2 * Math.sin(Math.abs(4 * Math.atan(a.b)) / 2));
    aproape(r, 5, 1e-9, `raza arcului ${i}`);
  }
  assert.equal(drumImbinare(100, im('val', 20, 10, 3)), 'imbinare-raza');
  assert.ok(Array.isArray(drumImbinare(100, im('val', 20, 10, 2.5))), 'raza 2,5 ajunge');
});

test('puzzle-ul (pasul 40, înălțimea 24, raza 3): capul de rază 6, mai lat decât gâtul, arcul lui peste o jumătate de cerc', () => {
  const v = drum(100, im('puzzle', 40, 24, 3));
  const cap = v.filter((x) => Math.abs(x.b) > 1);
  assert.equal(cap.length, 2, 'două capete (unul sus, unul jos), fiecare peste 180°');
  const p = puncte(v);
  aproape(Math.max(...p.map((q) => q.s)), 12, 1e-6, 'vârful nodului de sus');
  // Gâtul: la înălțimea razei, flancurile stau la √72 − 3 de mijloc; capul are raza 6, deci e mai lat.
  const gat = Math.sqrt(72) - 3;
  assert.ok(6 > gat, `capul (6) mai lat decât gâtul (${gat})`);
  // Pe orizontala centrului capului (s = 6), drumul trece de ±6 față de mijlocul nodului (40).
  const peCap = p.filter((q) => Math.abs(q.s - 6) < 0.3 && q.t > 25 && q.t < 55);
  assert.ok(Math.min(...peCap.map((q) => q.t)) < 34.2 && Math.max(...peCap.map((q) => q.t)) > 45.8, 'capul trece de gât în ambele părți');
  assert.equal(drumImbinare(100, im('puzzle', 40, 12, 3)), 'imbinare-raza', 'înălțimea de 4 raze: fără prindere');
  assert.equal(drumImbinare(100, im('puzzle', 40, 24, 0)), 'imbinare-raza', 'fără rază, fără gât');
  assert.equal(drumImbinare(100, im('puzzle', 20, 24, 3)), 'imbinare-raza', 'nodul nu încape în jumătatea lui de pas');
});

test('dinții drepți cu înălțimea 10: raza 3 nu încape pe treapta de 5; raza 2 da, cu dinții la ±5', () => {
  assert.equal(drumImbinare(100, im('dinti', 20, 10, 3)), 'imbinare-raza');
  const v = drum(100, im('dinti', 20, 10, 2));
  const p = puncte(v);
  aproape(Math.max(...p.map((q) => q.s)), 5, 1e-12, 'sus');
  aproape(Math.min(...p.map((q) => q.s)), -5, 1e-12, 'jos');
  const fara = drum(100, im('dinti', 20, 10, 0));
  assert.deepEqual(fara.slice(0, 6).map((x) => [x.t, x.s]), [[0, 0], [10, 0], [10, 5], [20, 5], [20, -5], [30, -5]]);
});

test('coada de rândunică (pasul 40, înălțimea 24, fără rază): laturile înclinate cu 4 (înălțimea / 6), dintele mai lat la vârf', () => {
  const v = drum(100, im('coada', 40, 24, 0));
  // Intrarea în (30, 0), apoi latura până la (30 − 2, 12): dintele de sus are la vârf 20 + 4 = 24, la bază (pe linie) 20.
  assert.deepEqual(v.slice(0, 6).map((x) => [x.t, x.s]), [[0, 0], [30, 0], [28, 12], [52, 12], [48, -12], [72, -12]]);
});

test('valorile: pasul și înălțimea pozitive, raza cel puțin 0, cel mult 1 000, modelul cunoscut', () => {
  assert.deepEqual([...MODELE_IMBINARE], ['zigzag', 'val', 'dinti', 'coada', 'puzzle']);
  assert.ok(imbinareBuna(im('zigzag', 20, 10, 0)));
  assert.ok(imbinareBuna(im('puzzle', 1000, 1000, 1000)));
  for (const i of [im('zigzag', 0, 10, 3), im('zigzag', 20, 0, 3), im('zigzag', 20, 10, -1), im('zigzag', Number.NaN, 10, 3), im('zigzag', 20, Infinity, 3), im('zigzag', 1000.5, 10, 3)]) {
    assert.ok(!imbinareBuna(i), JSON.stringify(i));
  }
  assert.ok(!imbinareBuna({ model: 'altul' as Imbinare['model'], pas: 20, inaltime: 10, raza: 3 }));
});

test('fără laturi de lungime zero: cocoașele lipite ale valului, nodurile puzzle-ului care se ating, treapta dinților cât două rotunjiri', () => {
  for (const i of [im('val', 40, 20, 3), im('puzzle', 40, 25, 4), im('dinti', 40, 12, 3), im('zigzag', 20, 10, 0), im('coada', 40, 24, 2)]) {
    const v = drum(100, i);
    for (let k = 0; k + 1 < v.length; k++) {
      const a = v[k] as VarfImbinare, b = v[k + 1] as VarfImbinare;
      assert.ok(Math.hypot(b.t - a.t, b.s - a.s) > 1e-9, `${JSON.stringify(i)}: vârfurile ${k} și ${k + 1} sunt lipite`);
    }
  }
});
