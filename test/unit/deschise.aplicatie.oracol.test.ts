/**
 * Căile deschise pe programele APLICAȚIEI (ADR 0037 §4, §7, §8, §9, §13; felia 2.3c-2, sesiune independentă): documentele
 * v10 de pe hârtie (`test/oracles/deschise.cazuri.ts`) date prin ușă (`incarca`), CAM (`programDinDocument`) și post
 * (`posteaza`, cu confirmarea ieșirii din foaie când o cere `iesireDinFoaie`), apoi judecate de poarta amendată.
 * - (p) documentele corecte: programul trece toată poarta, cu etichetele căilor deschise judecate; valorile de pe hârtie
 *   (D1: plonjarea în (10, 50) la −3, capătul în (110, 50); D2: ambele treceri din (20, 50); D6: din (150, 50) în (50, 50));
 *   D5: tăieturile în ordinea de la §8 (o judecă 14 (iii));
 * - (r) documentele pe care exportul trebuie să le refuze (§4, §8, §9): un refuz cu motiv; dacă aplicația dă totuși un
 *   program, poarta trebuie să-l prindă (iar testul pică). Felia 2.3c-2, la integrare: linia nemarcată prin foaie care ajunge la
 *   marginea foii (§8, textul acceptat) e refuzată cu motivul ei, iar la pragul R + 1 (3,5 mm și 4,5 mm de margine)
 *   aplicația refuză dacă și numai dacă poarta găsește refuzul în document.
 * Aplicația pe o schemă sub 10 (ușa refuză documentul v10) sare tot fișierul, cu motivul; un refuz al CAM-ului care spune
 * că o cale deschisă „nu e încă implementată” sare cazul, cu motivul (felia 2.3c-2 e scrisă în paralel).
 */
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { iesireDinFoaie } from '../../src/cam/iesire.ts';
import { posteaza } from '../../src/post/post.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { laDocument, poarta, type Incalcare } from '../oracles/poarta.ts';
import { citeste } from '../oracles/gcode.ts';
import { citesteEticheta } from '../oracles/regiune.ts';
import { lanturile } from '../oracles/rampa.ts';
import { etichetaDeschisa } from '../oracles/deschise.ts';
import type { DocV10O } from '../oracles/document.v10.ts';
import { corecte, ctxD, D1, D5, docV10, deschisa, vL, martoriDeschise, programD5 } from '../oracles/deschise.cazuri.ts';

const SCHEMA_APP = VERSIUNE_SCHEMA as number;
const DOAR_V10 = SCHEMA_APP >= 10 ? false : `aplicația e încă pe schema ${SCHEMA_APP}; căile deschise (documentul v10, ADR 0037) vin cu felia 2.3c-2`;
/** Un refuz care spune că o cale deschisă nu e încă tăiată (sărit, nu picat). */
const NEIMPLEMENTAT = /(nu (e|este|sunt) (încă )?implementat|neimplementat|not implemented|nu e încă (suportat|tăiat)|vin(e)? (mai târziu|cu 2\.3c)|not (yet )?supported)/i;

type Iesire = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly unde: 'usa' | 'cam' | 'post' | 'exceptie'; readonly motiv: string };

/** Programul aplicației: ușa, CAM-ul, postul GRBL 1.1 (stânga-jos, Z0 sus), cu ieșirea din foaie confirmată. */
function programulAplicatiei(doc: DocV10O): Iesire {
  try {
    const r = incarca(structuredClone(doc));
    if (!r.ok) return { ok: false, unde: 'usa', motiv: String(r.motiv) };
    const j = programDinDocument(r.doc);
    if (!j.ok) return { ok: false, unde: 'cam', motiv: j.motiv };
    const stoc = doc.foi[0]!.stoc;
    const iesire = iesireDinFoaie(j.program, { latime: stoc.latime, inaltime: stoc.inaltime });
    const p = posteaza(j.program, { foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, {
      asteptareAx: 3, ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
    });
    if (!p.ok) return { ok: false, unde: 'post', motiv: p.motiv };
    return { ok: true, text: p.text };
  } catch (x) {
    return { ok: false, unde: 'exceptie', motiv: String(x) };
  }
}

const arata = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n') || '(nimic)';

/** Primul lanț de sub eticheta căii `idLume`: plonjarea, adâncimea și capătul (în document). */
function primeleTreceri(text: string, doc: DocV10O, idLume: string): Array<{ x0: number; y0: number; z: number; x1: number; y1: number }> {
  const ctx = ctxD(doc);
  const { evenimente, comentarii } = citeste(text);
  const etichete = comentarii.flatMap((c) => { const e = citesteEticheta(c.text); return e === null || e === 'stricata' ? [] : [{ linia: c.linia, eticheta: e }]; });
  return lanturile(evenimente, etichete.map((e) => e.linia), (p) => laDocument(p, ctx))
    .filter((l) => l.eticheta >= 0 && etichete[l.eticheta]!.eticheta.idLume === idLume)
    .map((l) => ({ x0: l.pasi[0]!.a.x, y0: l.pasi[0]!.a.y, z: l.pasi[0]!.zb, x1: l.pasi.at(-1)!.b.x, y1: l.pasi.at(-1)!.b.y }));
}

const aproape = (a: number, b: number): boolean => Math.abs(a - b) <= 0.002;

// ── (p) Documentele corecte ─────────────────────────────────────────────────────────────────────────────────────────

for (const c of corecte()) {
  test(`(p) ${c.nume}: programul aplicației trece toată poarta amendată`, { skip: DOAR_V10 }, (t: TestContext) => {
    const r = programulAplicatiei(c.doc);
    if (!r.ok) {
      if (r.unde !== 'exceptie' && NEIMPLEMENTAT.test(r.motiv)) { t.skip(`aplicația nu taie încă: ${r.motiv}`); return; }
      return assert.fail(`refuzat la ${r.unde}: ${r.motiv}`);
    }
    const ctx = ctxD(c.doc);
    const v = poarta(r.text, ctx);
    assert.deepEqual(v, [], arata(v));
    const deschise = citeste(r.text).comentarii.filter((x) => { const e = citesteEticheta(x.text); return e !== null && e !== 'stricata' && etichetaDeschisa(e, ctx.regiune!); });
    assert.ok(deschise.length >= 1, 'nicio etichetă de cale deschisă în programul aplicației');
  });
}

test('(p) valorile de pe hârtie în programele aplicației: D1 (10, 50) → (110, 50) la −3; D2 ambele treceri din (20, 50); D6 din (150, 50) în (50, 50)', { skip: DOAR_V10 }, (t: TestContext) => {
  const [d1, d2, , , , , d6] = corecte();
  for (const [c, id, asteptat] of [
    [d1!, 'a/l', [{ x0: 10, y0: 50, z: -3, x1: 110, y1: 50 }]],
    [d2!, 'b/l', [{ x0: 20, y0: 50, z: -3, x1: 120, y1: 50 }, { x0: 20, y0: 50, z: -6, x1: 120, y1: 50 }]],
    [d6!, 'm/l', [{ x0: 150, y0: 50, z: -3, x1: 50, y1: 50 }]],
  ] as const) {
    const r = programulAplicatiei(c.doc);
    if (!r.ok) {
      if (r.unde !== 'exceptie' && NEIMPLEMENTAT.test(r.motiv)) { t.skip(`aplicația nu taie încă: ${r.motiv}`); return; }
      return assert.fail(`${c.nume}: refuzat la ${r.unde}: ${r.motiv}`);
    }
    const tr = primeleTreceri(r.text, c.doc, id);
    assert.equal(tr.length, asteptat.length, `${c.nume}: ${JSON.stringify(tr)}`);
    tr.forEach((x, k) => {
      const a = asteptat[k]!;
      assert.ok(aproape(x.x0, a.x0) && aproape(x.y0, a.y0) && aproape(x.z, a.z) && aproape(x.x1, a.x1) && aproape(x.y1, a.y1), `${c.nume}, trecerea ${k + 1}: ${JSON.stringify(x)} în loc de ${JSON.stringify(a)}`);
    });
  }
});

// ── (r) Documentele pe care exportul trebuie să le refuze ───────────────────────────────────────────────────────────

const deRefuzat: Array<{ readonly nume: string; readonly doc: DocV10O }> = [
  ...martoriDeschise().filter((m) => m.cere.some((c) => c.linia === 0 && !c.tipar.source.includes('lipsește'))).map((m) => ({ nume: m.nume, doc: m.doc })),
  { nume: 'calea deschisă cu un singur vârf distinct (două vârfuri identice)', doc: docV10([{ id: 'u', x: 0, y: 0, elemente: [{ id: 'l', forma: deschisa([vL(40, 40), vL(40, 40)]), latura: 'pe-linie', adancime: 3 }] }]) },
  { nume: 'interiorul pe o cale deschisă', doc: D1({ latura: 'interior' }) },
  { nume: 'despărțirea marcată pe exteriorul unei piese (contur închis)', doc: D5({ peste: { r: { despartire: true } } }) },
];

test('(r) §8, textul acceptat: linia de la margine la margine, prin foaie, nemarcată, e refuzată cu motivul „… tăietura deschisă prin foaie ajunge la marginea foii”', { skip: DOAR_V10 }, (t: TestContext) => {
  const r = programulAplicatiei(D5({ marcata: false, laMargine: true }));
  if (!r.ok) {
    if (r.unde === 'usa' && /schem|versiune/i.test(r.motiv)) { t.skip(`ușa refuză documentul v10: ${r.motiv}`); return; }
    assert.equal(r.unde, 'cam', r.motiv);
    assert.ok(r.motiv.includes('d/l: tăietura deschisă prin foaie ajunge la marginea foii'), r.motiv);
    return;
  }
  assert.fail('exportul a dat un program pentru o tăietură nemarcată prin foaie care ajunge la marginea foii');
});

/**
 * Acordul în ambele sensuri, la pragul de la §8 (un capăt la cel mult R + 1 = 4 mm de conturul foii): linia nemarcată
 * prin foaie pornește la 3,5 mm (refuz) și la 4,5 mm (primită) de marginea stângă; aplicația refuză dacă și numai dacă
 * poarta găsește refuzul în document, iar programul primit trece poarta.
 */
for (const x0 of [3.5, 4.5]) {
  test(`(r) §8, pragul R + 1: linia nemarcată prin foaie de la ${x0} mm de margine; aplicația și poarta sunt de acord`, { skip: DOAR_V10 }, (t: TestContext) => {
    const doc = D5({ marcata: false, peste: { l: { forma: deschisa([vL(x0, 0), vL(290, 0)]) } } });
    const ctx = ctxD(doc);
    const r = programulAplicatiei(doc);
    if (!r.ok && r.unde === 'usa' && /schem|versiune/i.test(r.motiv)) { t.skip(`ușa refuză documentul v10: ${r.motiv}`); return; }
    const refuzPoarta = poarta(programD5(doc, 'gkflr'), ctx).some((i) => i.linia === 0 && /ajunge la marginea foii/.test(i.mesaj));
    assert.equal(refuzPoarta, x0 < 4, 'poarta, pe hârtie');
    assert.equal(!r.ok, refuzPoarta, r.ok ? 'aplicația a primit-o' : `aplicația a refuzat-o: ${r.motiv}`);
    if (r.ok) assert.deepEqual(poarta(r.text, ctx), [], arata(poarta(r.text, ctx)));
    else assert.ok(r.motiv.includes('tăietura deschisă prin foaie ajunge la marginea foii'), r.motiv);
  });
}

for (const c of deRefuzat) {
  test(`(r) exportul refuză, cu motiv: ${c.nume}`, { skip: DOAR_V10 }, (t: TestContext) => {
    const r = programulAplicatiei(c.doc);
    if (!r.ok) {
      if (r.unde === 'usa' && /schem|versiune/i.test(r.motiv)) { t.skip(`ușa refuză documentul v10: ${r.motiv}`); return; }
      assert.notEqual(r.unde, 'exceptie', r.motiv);
      assert.ok(r.motiv.trim().length > 0, 'refuz fără motiv');
      return;
    }
    const v = poarta(r.text, ctxD(c.doc));
    assert.ok(v.length > 0, 'poarta nu prinde programul unui document care trebuia refuzat');
    assert.fail(`exportul a dat un program; poarta îl prinde:\n${arata(v)}`);
  });
}
