/**
 * Litofania tăiată (ADR 0321 §2): relieful e harta grosimilor, iar finisarea cu planul zero la grosimea plăcii (T = 6) pune
 * suprafața la −T + t. Pe hârtie: trei pătrate de 10 × 10 mm (alb, gri 128, negru), pe o placă de 6 mm, cu grosimile 0,8,
 * 3 − (128 / 255) · 2,2 = 1,89569 și 3 mm; cu bila pe un plan, vârful coboară pe suprafață, deci în mijlocul fiecărui pătrat
 * Z-ul cel mai jos e −6 + t, iar sub el rămân exact t mm. Nicăieri nu coboară sub −6 + 0,8.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { gri } from '../../src/relief/imagine.ts';
import { litofanieDinGri } from '../../src/relief/litofanie.ts';
import { stratDinGrila } from '../../src/relief/strat.ts';
import type { Document } from '../../src/model/document.ts';
import type { Program } from '../../src/ir/ir.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const T = 6, TMIN = 0.8, TMAX = 3;
const GRI = [255, 128, 0];

test('trei pătrate de gri, tăiate cu planul zero la grosimea plăcii: sub fiecare rămâne grosimea lui', async () => {
  const nx = 30, ny = 10, rgba = new Uint8Array(nx * ny * 4);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) rgba.set([GRI[Math.floor(x / 10)]!, GRI[Math.floor(x / 10)]!, GRI[Math.floor(x / 10)]!, 255], 4 * (y * nx + x));
  const lit = litofanieDinGri(gri(rgba, nx, ny, 'l'), nx, ny, { tmin: TMIN, tmax: TMAX, rama: 0, spate: false });
  const st = await stratDinGrila(lit.valori, nx, ny);
  const resurse = { [st.amprenta]: { text: st.text, octeti: Object.fromEntries(st.octeti) } };
  const d = {
    schema: 32, rev: 0,
    piese: [{
      id: 'p',
      radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: [
        { tip: 'element', id: 'r', forma: { tip: 'relief', nx, ny, celula: 1, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: st.amprenta }] }, matrice: { ...I } },
      ] },
      operatii: [{
        id: 'f', tip: 'finisare', noduri: ['r'], scula: { numar: 1, nume: 'bila', diametru: 2, forma: { tip: 'bila' } }, latura: 'pe-linie',
        sens: 'urcare', adancime: T, pas: T, pasLateral: 0.5, finisare: { unghi: 0, planZero: T }, urechi: null, rampa: null, intrari: null, colturi: null,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: T }, instante: [{ id: 'i', piesa: 'p', x: 40, y: 40, rotire: 0 }] }],
  };
  const u = incarca(d);
  if (!u.ok) assert.fail(u.motiv);
  const r = programDinDocument(u.doc as Document, REGIM_IMPLICIT, 0, false, undefined, resurse);
  if (!r.ok) assert.fail(r.motiv);
  const p: Program = r.program;
  let x = 0, y = 0, z = p.zSigur, jos = Infinity;
  const minim = [Infinity, Infinity, Infinity];
  for (const m of p.miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
    const x0 = x, z0 = z;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    if (m.tip !== 'taiere') continue;
    jos = Math.min(jos, z);
    // Pe un pătrat plat, o linie e o singură mutare lungă: fiecare segment (pe un rând din mijloc) care trece prin mijlocul
    // unui pătrat (la peste raza frezei de trepte) îi dă Z-ul.
    if (y <= 42 || y >= 48) continue;
    for (let k = 0; k < 3; k++) {
      const a = 40 + 10 * k + 2, b = 40 + 10 * k + 8;
      if (Math.max(x0, x) > a && Math.min(x0, x) < b) minim[k] = Math.min(minim[k]!, Math.min(z0, z));
    }
  }
  const t = [TMIN, TMAX - (128 / 255) * (TMAX - TMIN), TMAX];
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(minim[k]! - (-T + t[k]!)) < 1e-3, `pătratul ${k}: ${minim[k]} față de ${-T + t[k]!}`);
  assert.ok(jos >= -T + TMIN - 1e-3, `cel mai jos: ${jos}`);
});
