import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Document } from '../../src/model/document.ts';
import { amprentaCamp } from '../../src/sim/banda.ts';
import { campNou, compacteaza, valoare } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { docDin, ID, type FormaSimpla } from './ajutor-document.ts';
import { programPlaca01 } from '../placi/placa-01/genereaza.ts';

/**
 * Simularea exportului (ADR 0047 §5): placa 1 pusă ca document (insula și gaura, pe foaia de 300 × 200 × 18), exportată;
 * simularea din rezultat e cea a nucleului pe programul plăcii 1 (aceleași mișcări: exportul lor e octet cu octet placa
 * 1 A, `export.calcul.test.ts`), cu cifrele pe hârtie: Z-ul cel mai jos −8, fără trecere prin foaie, volumul = inelul
 * găurii (9 ≤ r ≤ 15, la 8 mm) + canalul insulei (6 mm în jurul dreptunghiului 100 × 60, la 3 mm), pe celulele grilei.
 */
const insula: FormaSimpla = { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } };
const gaura: FormaSimpla = { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } };
const doc: Document = docDin({ latime: 300, inaltime: 200, grosime: 18 }, insula, gaura);

test('exportul plăcii 1: simularea e a nucleului pe același program, cu volumul și adâncimea pe hârtie', async () => {
  const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const s = await r.simulare(new AbortController().signal);
  assert.ok(s.ok, s.ok ? '' : s.motiv);
  if (!s.ok) return;
  assert.equal(s.celula, 0.25);
  assert.deepEqual(s.celule, [1200, 800]);
  assert.equal(s.grosime, 18);
  assert.equal(s.adancimeMax, 8);
  assert.equal(s.prinFoaie, false);
  // Nucleul direct, pe programul plăcii 1, pe aceeași grilă.
  const p = pregatesteProgram(programPlaca01(), 0);
  assert.ok(p.ok);
  const F = campNou({ x0: 0, y0: 0, latime: 300, inaltime: 200, celula: 0.25, sus: 0 });
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  assert.equal(s.amprenta, amprentaCamp(F));
  // Volumul pe hârtie, numărat pe centrele celulelor (pereții drepți ai frezei plate: o celulă e tăiată sau nu).
  let hartie = 0;
  for (let j = 0; j < 800; j++) for (let i = 0; i < 1200; i++) {
    const x = (i + 0.5) * 0.25, y = (j + 0.5) * 0.25, rr = Math.hypot(x - 70, y - 50);
    const dx = Math.max(20 - x, 0, x - 120), dy = Math.max(20 - y, 0, y - 80), d = Math.hypot(dx, dy);
    hartie += rr >= 9 && rr <= 15 ? 8 : d > 0 && d <= 6 ? 3 : 0;
    // Pe hârtie și în nucleu, aceeași celulă (plasa volumului e celula, nu suma).
    const v = valoare(F, i, j);
    if (Math.abs(rr - 9) > 1e-6 && Math.abs(rr - 15) > 1e-6 && Math.abs(d - 6) > 1e-6 && d > 1e-6) {
      assert.equal(v, rr >= 9 && rr <= 15 ? -8 : d > 0 && d <= 6 ? -3 : 0, `celula (${i}, ${j})`);
    }
  }
  hartie *= 0.0625;
  assert.ok(Math.abs(s.volum - hartie) <= 1e-9 * hartie, `volumul ${s.volum}, hârtia ${hartie}`);
  // Previzualizarea: 400 × 267 pixeli (blocuri de 3 celule), cel mai jos Z = −8 în inelul găurii.
  assert.deepEqual([s.previzualizare.latime, s.previzualizare.inaltime], [400, 267]);
  assert.equal(Math.min(...s.previzualizare.z), -8);
  assert.ok(s.fire >= 1 && s.ms >= 0);
});

test('gaura de 8 mm într-o foaie de 8: simularea spune că trece prin foaie; volumul se oprește la fața de jos', async () => {
  // O foaie de 6 mm nu ajunge aici: exportul refuză adâncimea peste grosime (fără supracursă, ADR 0028 §2).
  const e8 = await calculeazaExport(docDin({ latime: 300, inaltime: 200, grosime: 8 }, gaura), { origine: 'stanga-jos', z0: 'sus' });
  const e18 = await calculeazaExport(docDin({ latime: 300, inaltime: 200, grosime: 18 }, gaura), { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(e8.ok && e18.ok);
  if (!e8.ok || !e18.ok) return;
  const r = await e8.simulare(new AbortController().signal), g = await e18.simulare(new AbortController().signal);
  assert.ok(r.ok && g.ok);
  if (!r.ok || !g.ok) return;
  assert.equal(r.prinFoaie, true);
  assert.equal(g.prinFoaie, false);
  assert.equal(r.adancimeMax, 8);
  // Același program, aceeași materie scoasă (8 mm < 18 mm și = 8 mm): volumul e același, amprenta la fel.
  assert.ok(Object.is(r.volum, g.volum));
  assert.equal(r.amprenta, g.amprenta);
});

test('exportul nu așteaptă simularea: rezultatul vine cu funcția ei; anulată, ea spune „anulată”, fără eroare', async () => {
  const e = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(e.ok);
  if (!e.ok) return;
  assert.equal(typeof e.simulare, 'function');
  const ac = new AbortController();
  ac.abort();
  const s = await e.simulare(ac.signal);
  assert.deepEqual(s, { ok: false, motiv: 'simularea a fost anulată', eroare: false, anulata: true });
});

test('un program pe care simularea nu-l poate face (axa A) dă un refuz cu motiv, nu o eroare', async () => {
  const { simuleazaExport } = await import('../../src/ui/actiuniExportCalcul.ts');
  const p = programPlaca01();
  const s = await simuleazaExport(pregatesteProgram({ ...p, axe: ['X', 'Y', 'Z', 'A'] }, 0), { latime: 300, inaltime: 200, grosime: 18 });
  assert.ok(!s.ok && !s.eroare && /axa A/.test(s.motiv), JSON.stringify(s));
});
