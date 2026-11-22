/**
 * Tăieturile cât grosimea foii, cu supracursa, la alegere (ADR 0177, felia 12.1↑f-4). Oracolul e echivalența cu ce ar scrie
 * omul de mână: cu bifa (`prinFoaie`), exportul unei foi de 6 mm cu supracursa 0,5 e, octet cu octet, exportul aceleiași foi în
 * care tăieturile scrise cât foaia (profilul cu urechi, buzunarul, găurirea) sunt scrise 6,5. Cele care nu sunt cât foaia
 * (profilul de 3 și cel de 6,3, deja peste foaie, cu voia din ADR 0028 §2), V-carve-ul cât foaia și incrustația cât foaia rămân
 * cum sunt scrise. Fără bifă, sau fără supracursă,
 * exportul e cel de dinainte. Pe hârtie, pe profilul cu urechi singur: fundul la −6,5, iar vârful urechilor (groase de 1,5) tot
 * la −4,5, de la fața de jos a foii (ADR 0028 §2), nu la −5.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { zuriProgram } from './ajutor-incrustatie.ts';

type Rec = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const T = 6, S = 0.5;
const F6 = { numar: 1, nume: 'freza 6', diametru: 6 };
const V60 = { numar: 2, nume: 'freza V60', diametru: 12, forma: { tip: 'v', unghi: 60 } };

const DR = (latime: number, inaltime: number): Rec => ({ tip: 'dreptunghi', latime, inaltime, razaColt: 0 });
const CERC = (raza: number): Rec => ({ tip: 'cerc', raza });
/** O piesă cu o singură formă, la (x, y), și o operație pe ea (profil exterior Ø6, pasul 2, peste care vine `extra`). */
const piesa = (id: string, forma: Rec, x: number, y: number, extra: Rec): Rec => ({
  id,
  radacina: { tip: 'element', id: `${id}-a`, matrice: { ...I, e: x, f: y }, forma },
  operatii: [{
    id: 'o', tip: 'profil', noduri: [`${id}-a`], scula: F6, latura: 'exterior', sens: 'urcare', adancime: T, pas: 2,
    urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
  }],
});

/** Profilul cu urechi (4 × 8 × 1,5) al dreptunghiului de 40 × 30, cu adâncimea dată. */
const profil = (adancime: number): Rec => piesa('profil', DR(40, 30), 20, 20, { adancime, urechi: { numar: 4, latime: 8, grosime: 1.5 } });

/**
 * Foaia de 200 × 150 × 6: tăieturile prin foaie (profilul cu urechi, buzunarul rotund Ø20, găurirea Ø10) cu adâncimea `prin`;
 * profilul de 3; profilul de 6,3 (peste foaie, cu voia supracursei); V-carve-ul cât foaia (dreptunghiul de 30 × 20 cere mai
 * mult de 6 cu V60, deci adâncimea chiar îl oprește); incrustația cu pereți drepți cât foaia.
 */
function document(prin: number, varianta?: 'profil' | 'fara-voie'): unknown {
  const piese = varianta === 'profil' ? [profil(prin)] : [
    profil(prin),
    piesa('buzunar', CERC(10), 100, 35, { tip: 'buzunar', latura: 'interior', pasLateral: 2.4, adancime: prin }),
    piesa('gauri', CERC(5), 150, 35, { tip: 'gaurire', latura: 'interior', adancime: prin, retragereCompleta: 1 }),
    piesa('mic', DR(20, 20), 20, 90, { adancime: 3, pas: 3 }),
    ...(varianta === 'fara-voie' ? [] : [piesa('voie', DR(20, 15), 20, 120, { adancime: 6.3 })]),
    piesa('v', DR(30, 20), 70, 90, { tip: 'vcarve', latura: 'interior', scula: V60 }),
    piesa('inc', DR(30, 20), 130, 90, {
      tip: 'buzunar', latura: 'interior', pasLateral: 2.4,
      incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 8 },
    }),
  ];
  return {
    schema: 26, rev: 0, piese,
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: T }, instante: piese.map((p) => ({ id: `i-${String(p['id'])}`, piesa: p['id'], x: 0, y: 0, rotire: 0 })) }],
  };
}

async function exporta(brut: unknown, p: Rec) {
  const d = incarca(brut);
  if (!d.ok) assert.fail(d.motiv);
  const r = await calculeazaExport(d.doc, { origine: 'stanga-jos', z0: 'sus', ...p });
  if (!r.ok) assert.fail(r.motiv);
  return r;
}

test('cu bifa, tăieturile cât foaia trec cu supracursa, octet cu octet ca scrise 6 + 0,5; profilele de 3 și 6,3, V-carve-ul și incrustația, cum sunt scrise', async () => {
  const cuBifa = await exporta(document(T), { supracursa: S, prinFoaie: true });
  const deMana = await exporta(document(T + S), { supracursa: S });
  assert.equal(cuBifa.program.text, deMana.program.text);
  assert.deepEqual(cuBifa.dopuri.map((d) => d.program.text), deMana.dopuri.map((d) => d.program.text));
  assert.equal(Math.min(...zuriProgram(cuBifa.program.text)), -(T + S));
  // Controlul: fără bifă, aceeași foaie are alt program: tăieturile prin foaie se opresc la 6, iar cel mai adânc e profilul de
  // 6,3 (voia).
  const faraBifa = await exporta(document(T), { supracursa: S });
  assert.notEqual(faraBifa.program.text, cuBifa.program.text);
  const z = zuriProgram(faraBifa.program.text);
  assert.ok(Math.min(...z) === -6.3 && !z.has(-(T + S)), `fără bifă: ${[...z].filter((x) => x < -5.9).sort((a, b) => a - b).join(', ')}`);
});

test('fără bifă sau fără supracursă, exportul e cel de dinainte', async () => {
  const inainte = await exporta(document(T), { supracursa: S });
  assert.equal((await exporta(document(T), { supracursa: S, prinFoaie: false })).program.text, inainte.program.text);
  // Fără supracursă, profilul de 6,3 ar fi refuzat (voia lipsește): foaia fără el.
  const zero = await exporta(document(T, 'fara-voie'), {});
  assert.equal((await exporta(document(T, 'fara-voie'), { prinFoaie: true })).program.text, zero.program.text);
  assert.equal((await exporta(document(T, 'fara-voie'), { supracursa: 0, prinFoaie: true })).program.text, zero.program.text);
});

test('pe hârtie, profilul cu urechi singur: fundul la −6,5, vârful urechilor tot la 6 − 1,5 = 4,5 de față, nu la 5', async () => {
  const r = await exporta(document(T, 'profil'), { supracursa: S, prinFoaie: true });
  const z = zuriProgram(r.program.text);
  assert.equal(Math.min(...z), -6.5);
  assert.ok(z.has(-4.5) && !z.has(-5), `Z-urile: ${[...z].filter((x) => x < 0).sort((a, b) => a - b).join(', ')}`);
});
