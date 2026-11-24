/**
 * Relieful printre uneltele vectorilor (ADR 0310 §1, felia 18.1↑a): pe o foaie cu un relief și un dreptunghi, chenarul
 * reliefului e dreptunghiul grilei (cutia, clicul, desenul), transformările păstrează celula pătrată (scalarea uniformă
 * mărește celula, cea neuniformă și înclinarea se refuză cu motivul lor, rotirea și oglindirea schimbă doar matricea),
 * booleanul și tăierea refuză relieful cu motivul lui, verificarea vectorilor și CAM-ul 2D îl sar (nu e un contur), iar o
 * operație 2D pe relief nu trece de ușă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaDesen } from '../../src/app/desen.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { booleanSelectie } from '../../src/model/boolean.ts';
import { operatieImplicita, VERSIUNE_SCHEMA, type Document, type FormaRelief, type Matrice, type Nod } from '../../src/model/document.ts';
import { areRelief, chenarElement, cutieElement, esteContur } from '../../src/model/forme.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { taie } from '../../src/model/taiere.ts';
import { transforma } from '../../src/model/transformare.ts';
import { verificaVectorii } from '../../src/model/verificare.ts';

const H = 'c'.repeat(64);
const I: Matrice = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const RELIEF: FormaRelief = { tip: 'relief', nx: 200, ny: 100, celula: 0.2, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: H }] };
const DREPTUNGHI = { tip: 'dreptunghi', latime: 30, inaltime: 30, razaColt: 0 } as const;
const profil = (id: string, nod: string) => ({ ...operatieImplicita(id, DREPTUNGHI), noduri: [nod] });
const relief = (matrice: Matrice = I): Nod => ({ tip: 'element', id: 'r1', matrice, forma: RELIEF });

/** O foaie cu două piese: relieful (40 × 20 mm, la (10, 10)) și un dreptunghi de 30 × 30 (la (100, 10)). */
function document(matrice: Matrice = I): Document {
  return {
    schema: VERSIUNE_SCHEMA, rev: 1,
    piese: [
      { id: 'p1', nume: 'medalion', operatii: [], radacina: { tip: 'grup', id: 'g', matrice: I, copii: [relief(matrice)] } },
      {
        id: 'p2', nume: 'cadru', radacina: { tip: 'grup', id: 'g', matrice: I, copii: [{ tip: 'element', id: 'e1', matrice: I, forma: { ...DREPTUNGHI } }] },
        operatii: [profil('o1', 'e1')],
      },
    ],
    foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [
      { id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0 }, { id: 'i2', piesa: 'p2', x: 100, y: 10, rotire: 0 },
    ] }],
  };
}

test('documentul de probă trece de ușă; areRelief îl vede doar pe piesa cu relief', () => {
  const d = document();
  assert.ok(incarca(structuredClone(d)).ok);
  assert.equal(areRelief(d.piese[0]!.radacina), true);
  assert.equal(areRelief(d.piese[1]!.radacina), false);
});

test('chenarul: dreptunghiul grilei, în lume; cutia lui; desenul îl trasează ca o cale închisă; esteContur îl ține deoparte', () => {
  const [r, e] = elementeFoaie(document(), 0);
  assert.ok(r && e);
  assert.equal(esteContur(r), false);
  assert.equal(esteContur(e), true);
  const c = cutieElement(r);
  assert.deepEqual([c.minX, c.minY, c.maxX, c.maxY], [10, 10, 50, 30]);
  assert.equal(chenarElement(r).inchis, true);
  const d = listaDesen(document(), 0).find((f) => f.id === r.idLume);
  assert.ok(d);
  assert.equal(d.cale.at(-1)?.t, 'Z');
});

test('transformările: scalarea uniformă mărește celula; neuniformă și înclinarea, refuzate; rotirea și oglindirea, doar matricea', () => {
  const d = document();
  const s = transforma(d, 0, ['i1'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 10, y: 10 } });
  assert.ok(s.ok);
  const p = s.piese.find((x) => x.id === 'p1');
  const el = p?.radacina.tip === 'grup' ? p.radacina.copii[0] : undefined;
  assert.ok(el?.tip === 'element' && el.forma.tip === 'relief');
  assert.equal(el.forma.celula, 0.4);
  assert.equal(el.forma.nx, 200);
  assert.deepEqual(transforma(d, 0, ['i1'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 10, y: 10 } }), { ok: false, motiv: 'relief-neuniform' });
  assert.deepEqual(transforma(d, 0, ['i1'], { fel: 'inclinare', unghiX: 10, unghiY: 0, centru: { x: 30, y: 20 } }), { ok: false, motiv: 'relief-neuniform' });
  const r = transforma(d, 0, ['i1'], { fel: 'rotire', unghi: 90, centru: { x: 30, y: 20 } });
  assert.ok(r.ok);
  const o = transforma(d, 0, ['i1'], { fel: 'oglindire', directie: 'orizontal', centru: { x: 30, y: 20 } });
  assert.ok(o.ok);
  // O scalare care ar duce celula peste 100 mm (sau relieful peste 10 m) se refuză.
  assert.deepEqual(transforma(d, 0, ['i1'], { fel: 'scalare', sx: 600, sy: 600, ancora: { x: 10, y: 10 } }), { ok: false, motiv: 'scara-invalida' });
});

test('booleanul și tăierea refuză relieful, cu motivul lui; verificarea vectorilor îl sare', () => {
  const d = document();
  assert.equal(booleanSelectie(d, 0, ['i1', 'i2'], 'reuniune'), 'relief');
  const t = taie(d, { cutit: { fel: 'x', x: 30 }, alese: ['i1'], inchide: false }, 0);
  assert.deepEqual(t, { ok: false, motiv: 'relief' });
  const v = verificaVectorii(d, { toleranta: 0.01, alese: null }, 0);
  assert.ok(v.ok);
});

test('CAM-ul 2D taie doar conturul; o operație 2D pe relief nu trece de ușă', () => {
  const d = document();
  const p = programDinDocument(d);
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  const cuOp: Document = { ...d, piese: [{ ...d.piese[0]!, operatii: [profil('o9', 'r1')] }, d.piese[1]!] };
  const u = incarca(structuredClone(cuOp));
  assert.equal(u.ok, false);
  assert.match(String(u.ok ? '' : u.motiv), /relief/);
});
