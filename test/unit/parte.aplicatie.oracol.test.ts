/**
 * Tăieturile pe o parte pe programele APLICAȚIEI (ADR 0037 §3, §5–§7, §10, §13; felia 2.3c-5): documentele poarții
 * independente (`test/oracles/parte.cazuri.ts`) date prin ușă (`incarca`), CAM (`programDinDocument`) și post
 * (`posteaza`, cu ieșirea din foaie confirmată), apoi judecate de poarta amendată.
 * - (p) cele corecte: programul aplicației trece toată poarta (valorile de pe hârtie 1, 3, 4, 9, plus 5, 6, 7, cubica,
 *   zig-zag-ul, canelura cât freza, „G”-ul cu bucla, 10 la 10 mm, 12 lanțul convex);
 * - (r) regiunea (10, 11, 12): acordul în ambele sensuri (ADR 0026 §9): aplicația refuză cu „regiunea păstrată:” exact
 *   tăietura pe care poarta o găsește încălcată (prima, în ordinea de tăiere).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iesireDinFoaie } from '../../src/cam/iesire.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';
import type { DocV10O } from '../oracles/document.v10.ts';
import { corecteParte, ctxP, cazuriRegiune } from '../oracles/parte.cazuri.ts';
import { poarta, type Incalcare } from '../oracles/poarta.ts';

type Iesire = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly motiv: string };

function programulAplicatiei(doc: DocV10O): Iesire {
  const r = incarca(structuredClone(doc));
  if (!r.ok) return { ok: false, motiv: `ușa: ${r.motiv}` };
  const j = programDinDocument(r.doc);
  if (!j.ok) return { ok: false, motiv: j.motiv };
  const stoc = doc.foi[0]?.stoc;
  if (!stoc) return { ok: false, motiv: 'fără foaie' };
  const iesire = iesireDinFoaie(j.program, { latime: stoc.latime, inaltime: stoc.inaltime });
  const p = posteaza(j.program, { foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, {
    asteptareAx: 3, ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
  });
  return p.ok ? { ok: true, text: p.text } : { ok: false, motiv: `postul: ${p.motiv}` };
}

const arata = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n') || '(nimic)';

for (const c of corecteParte()) {
  test(`(p) ${c.nume}: programul aplicației trece poarta amendată`, () => {
    const r = programulAplicatiei(c.doc);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    if (!r.ok) return;
    const v = poarta(r.text, ctxP(c.doc));
    assert.deepEqual(v, [], arata(v));
  });
}

for (const c of cazuriRegiune()) {
  test(`(r) ${c.nume}: aplicația refuză aceeași tăietură pe care o prinde poarta`, () => {
    const r = programulAplicatiei(c.doc);
    assert.equal(r.ok, false, 'trebuia refuzat');
    if (r.ok) return;
    const prima = c.cere[0]?.eticheta.match(/^\(([^:]+):/)?.[1];
    assert.ok(prima);
    assert.match(r.motiv, new RegExp(`^regiunea păstrată: tăietura lui ${prima.replace('/', '\\/')} `), r.motiv);
    // Și poarta, pe programul ei scris pe traseul ideal, găsește încălcarea cerută.
    const v = poarta(c.text, ctxP(c.doc));
    assert.ok(v.some((i) => i.invarianta === 2), arata(v));
  });
}
