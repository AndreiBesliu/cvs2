/**
 * Găurirea (ADR 0087): ciocănirea în centru pe hârtie (pașii, retragerile parțiale și ieșirile), elicea pe hârtie (raza,
 * turele, panta, cercul de la fund, sensul), refuzurile (cercul mai mic decât freza, peste două diametre, altă formă, ce e
 * al profilului), lucrarea întreagă până la G-code (fără G73 / G81–G83, pe toate contractele; pașii dintre două retrageri;
 * viteza pe Z a elicei) și gaura pe oracolul independent al simulării: diametrul cercului ± 0,02 mm.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APROPIERE, RETRAGERE_PARTIALA, TOLERANTA_GAURA, traseuGaurire, type ParametriGaurire } from '../../src/cam/gaurire.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { regiunePastrata } from '../../src/cam/regiune.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { taieturiFoaie } from '../../src/model/lume.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { judeca } from '../oracles/simulare.ts';

const P: ParametriGaurire = {
  centru: { x: 50, y: 40 }, diametru: 6, diametruScula: 6, adancime: 10, pas: 3, retragereCompleta: 1, trigonometric: true,
  avans: 1000, avansPlonjare: 300, zSigur: 5,
};
const cu = (x: Partial<ParametriGaurire>): ParametriGaurire => ({ ...P, ...x });
const miscari = (p: ParametriGaurire): readonly Miscare[] => {
  const r = traseuGaurire(p);
  if (!r.ok) assert.fail(r.motiv);
  return r.miscari;
};

test('ciocănirea pe hârtie: Ø6 cu Ø6, 10 mm în pași de cel mult 3 (4 × 2,5), ieșire după fiecare pas', () => {
  assert.deepEqual(miscari(P), [
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 50, Y: 40 } },
    { tip: 'taiere', la: { Z: -2.5 }, avans: 300 },
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { Z: -2.5 + APROPIERE } }, { tip: 'taiere', la: { Z: -5 }, avans: 300 },
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { Z: -5 + APROPIERE } }, { tip: 'taiere', la: { Z: -7.5 }, avans: 300 },
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { Z: -7.5 + APROPIERE } }, { tip: 'taiere', la: { Z: -10 }, avans: 300 },
    { tip: 'rapida', la: { Z: 5 } },
  ]);
  assert.equal(APROPIERE, 0.5);
  assert.equal(RETRAGERE_PARTIALA, 1);
});

test('ciocănirea cu ieșirea la al treilea pas: între, retragerea parțială de 1 mm (rupe așchia), fără să iasă', () => {
  assert.deepEqual(miscari(cu({ retragereCompleta: 3 })), [
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 50, Y: 40 } },
    { tip: 'taiere', la: { Z: -2.5 }, avans: 300 },
    { tip: 'rapida', la: { Z: -1.5 } }, { tip: 'taiere', la: { Z: -5 }, avans: 300 },
    { tip: 'rapida', la: { Z: -4 } }, { tip: 'taiere', la: { Z: -7.5 }, avans: 300 },
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { Z: -7 } }, { tip: 'taiere', la: { Z: -10 }, avans: 300 },
    { tip: 'rapida', la: { Z: 5 } },
  ]);
  // O gaură de un singur pas: o coborâre și ieșirea.
  assert.equal(miscari(cu({ adancime: 2, retragereCompleta: 3 })).length, 4);
});

test('cercul cât freza, cu toleranța: Ø6,02 se găurește în centru (gaura de Ø6 e cât cercul ± 0,02); Ø6,03 în elice', () => {
  assert.equal(TOLERANTA_GAURA, 0.02);
  const centru = traseuGaurire(cu({ diametru: 6.02 }));
  assert.ok(centru.ok && centru.fel === 'ciocanire');
  const mic = traseuGaurire(cu({ diametru: 5.98 }));
  assert.ok(mic.ok && mic.fel === 'ciocanire');
  const elice = traseuGaurire(cu({ diametru: 6.03 }));
  assert.ok(elice.ok && elice.fel === 'elice');
});

/** Arcele programului, cu capetele lor. */
function arce(ms: readonly Miscare[]) {
  let x = 0, y = 0, z = 0;
  const rez: Array<{ x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; cx: number; cy: number; sens: string; avans: number }> = [];
  for (const m of ms) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const x1 = m.la.X ?? x, y1 = m.la.Y ?? y, z1 = m.la.Z ?? z;
    if (m.tip === 'arc') rez.push({ x0: x, y0: y, z0: z, x1, y1, z1, cx: m.centru.x, cy: m.centru.y, sens: m.sens, avans: m.avans });
    x = x1; y = y1; z = z1;
  }
  return rez;
}

test('elicea pe hârtie: Ø10 cu Ø6, 10 mm cu pasul 3 = 4 ture de 2,5 mm pe cercul de rază 2, apoi un cerc la fund; trigonometric la urcare', () => {
  const ms = miscari(cu({ diametru: 10 }));
  assert.deepEqual(ms.slice(0, 3), [{ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 52, Y: 40 } }, { tip: 'taiere', la: { Z: 0 }, avans: 300 }]);
  assert.deepEqual(ms.at(-1), { tip: 'rapida', la: { Z: 5 } });
  const a = arce(ms);
  // Fiecare arc pe cercul de rază 2 cu centrul în (50, 40), în sensul trigonometric.
  for (const x of a) {
    assert.ok(Math.abs(x.cx - 50) < 1e-9 && Math.abs(x.cy - 40) < 1e-9);
    assert.ok(Math.abs(Math.hypot(x.x1 - 50, x.y1 - 40) - 2) < 1e-9);
    assert.equal(x.sens, 'trigonometric');
  }
  // Coborârea: de la 0 la −10 pe 4 ture (2π · 2 · 4 mm), apoi o tură plină la −10.
  const tura = 2 * Math.PI * 2;
  let s = 0;
  for (const x of a) {
    const u0 = Math.atan2(x.y0 - 40, x.x0 - 50), u1 = Math.atan2(x.y1 - 40, x.x1 - 50);
    let du = u1 - u0;
    while (du <= 1e-12) du += 2 * Math.PI;
    s += 2 * du;
    const zAsteptat = -Math.min(10, (10 * s) / (4 * tura));
    assert.ok(Math.abs(x.z1 - zAsteptat) < 1e-9, `z ${x.z1} față de ${zAsteptat}`);
  }
  assert.ok(Math.abs(s - 5 * tura) < 1e-9, `drumul ${s}`);
  // Panta: viteza pe Z, F · |ΔZ| / L, cel mult avansul de plonjare; pe cercul de la fund, avansul întreg.
  for (const x of a) {
    const L = Math.hypot(2 * Math.abs(Math.atan2(x.y1 - 40, x.x1 - 50) - Math.atan2(x.y0 - 40, x.x0 - 50)) || 0, x.z1 - x.z0);
    if (x.z1 < x.z0 - 1e-12) assert.ok((x.avans * (x.z0 - x.z1)) / L <= 300 + 1e-6 || x.avans <= 300, `viteza pe Z ${(x.avans * (x.z0 - x.z1)) / L}`);
  }
  // La opoziție, orar.
  assert.ok(arce(miscari(cu({ diametru: 10, trigonometric: false }))).every((x) => x.sens === 'orar'));
});

test('elicea strânsă (Ø7 cu Ø6, raza 0,5): viteza pe Z rămâne cea a plonjării, F = avansPlonjare · L₃ / |ΔZ| pe fiecare arc care coboară', () => {
  const a = arce(miscari(cu({ diametru: 7 })));
  let coboara = 0;
  for (const x of a) {
    if (!(x.z1 < x.z0 - 1e-12)) continue;
    coboara++;
    let du = Math.atan2(x.y1 - 40, x.x1 - 50) - Math.atan2(x.y0 - 40, x.x0 - 50);
    while (du <= 1e-12) du += 2 * Math.PI;
    const L3 = Math.hypot(0.5 * du, x.z1 - x.z0);
    assert.ok(Math.abs(x.avans - Math.min(1000, (300 * L3) / (x.z0 - x.z1))) < 1e-6, `F ${x.avans}`);
    assert.ok(x.avans < 1000, 'aici limita contează (o tură de π mm coboară 2,5 mm)');
  }
  assert.ok(coboara >= 4);
});

test('refuzuri: cercul mai mic decât freza, peste două diametre ale ei, retragerea care nu e un întreg pozitiv, pasul greșit', () => {
  const motiv = (p: ParametriGaurire): string => { const r = traseuGaurire(p); return r.ok ? '' : r.motiv; };
  assert.match(motiv(cu({ diametru: 5.97 })), /cercul de Ø5\.97 e mai mic decât freza \(Ø6\)/);
  assert.match(motiv(cu({ diametru: 12.01 })), /trece de două diametre ale frezei \(Ø6\): în centru ar rămâne un miez, deci e un buzunar/);
  assert.ok(traseuGaurire(cu({ diametru: 12 })).ok, 'cât două diametre: discul acoperă încă centrul');
  assert.match(motiv(cu({ retragereCompleta: 0 })), /retragerea completă/);
  assert.match(motiv(cu({ retragereCompleta: 1.5 })), /retragerea completă/);
  assert.match(motiv(cu({ pas: 0 })), /pasul/);
});

// ── Lucrarea întreagă ────────────────────────────────────────────────────────────────────────────────────────────────

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
type Op = Record<string, unknown>;
const gaurire = (noduri: string[], extra: Op = {}): Op => ({
  id: 'g', tip: 'gaurire', noduri, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', sens: 'urcare', adancime: 10, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
/** O piesă cu cercurile date (raza, centrul în piesă) și operațiile ei, la (x, y) pe o foaie de 200 × 150 × 18. */
function doc(cercuri: ReadonlyArray<{ id: string; raza: number; e: number; f: number; forma?: Op }>, operatii: Op[], x = 0, y = 0): unknown {
  const noduri = cercuri.map((c) => ({ tip: 'element', id: c.id, matrice: { ...I, e: c.e, f: c.f }, forma: c.forma ?? { tip: 'cerc', raza: c.raza } }));
  return {
    schema: 13, rev: 0, piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x, y, rotire: 0 }] }],
  };
}
const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const motivJob = (d: unknown): string => { const r = programDinDocument(deschis(d)); return r.ok ? '' : r.motiv; };

test('lucrarea: două găuri (în centru și în elice), cu etichetele lor; nu sunt inele ale regiunii păstrate; clasa interioarelor', () => {
  const d = deschis(doc([{ id: 'a', raza: 3, e: 20, f: 20 }, { id: 'b', raza: 5, e: 60, f: 20 }], [gaurire(['a', 'b'])], 10, 10));
  const r = programDinDocument(d);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const et = r.program.miscari.flatMap((m) => (m.tip === 'eticheta' ? [m.text] : []));
  assert.deepEqual(et, ['i/a: cerc, găurire, 10 mm', 'i/b: cerc, găurire în elice, 10 mm']);
  // Centrul primei găuri, în lume: (10 + 20, 10 + 20).
  assert.ok(r.program.miscari.some((m) => m.tip === 'rapida' && m.la.X === 30 && m.la.Y === 30));
  // A doua, în elice: centrul (70, 30), începutul la raza 2 spre dreapta, trigonometric la urcare și orar la opoziție.
  assert.ok(r.program.miscari.some((m) => m.tip === 'rapida' && m.la.X === 72 && m.la.Y === 30));
  const sensuri = (sens: string) => {
    const j = programDinDocument(deschis(doc([{ id: 'b', raza: 5, e: 60, f: 20 }], [gaurire(['b'], { sens })], 10, 10)));
    if (!j.ok) assert.fail(j.motiv);
    return [...new Set(j.program.miscari.flatMap((m) => (m.tip === 'arc' ? [m.sens] : [])))];
  };
  assert.deepEqual(sensuri('urcare'), ['trigonometric']);
  assert.deepEqual(sensuri('opozitie'), ['orar']);
  const reg = regiunePastrata(taieturiFoaie(d));
  assert.ok(reg.ok && reg.regiune.inele.length === 0, 'nicio gaură nu e inel');
  // Un cerc mic între ele, tăiat ca profil exterior, vine după găuri: găurirea e în clasa interioarelor.
  const d2 = deschis(doc([{ id: 'a', raza: 3, e: 20, f: 20 }, { id: 'c', raza: 4, e: 100, f: 60 }], [
    { ...gaurire(['c']), id: 'x', tip: 'profil', latura: 'exterior' }, gaurire(['a']),
  ]));
  assert.deepEqual(taieturiFoaie(d2).map((t) => t.idLume), ['i/a', 'i/c']);
});

test('lucrarea refuză, cu motiv: altă formă, un cerc deformat (de ușă), cercul prea mic sau prea mare, ce e al profilului pe o găurire', () => {
  assert.match(motivJob(doc([{ id: 'a', raza: 3, e: 20, f: 20, forma: { tip: 'dreptunghi', latime: 6, inaltime: 6, razaColt: 0 } }], [gaurire(['a'])])), /i\/a: găurirea cere un cerc \(forma e dreptunghi\)/);
  assert.match(motivJob(doc([{ id: 'a', raza: 2, e: 20, f: 20 }], [gaurire(['a'])])), /i\/a: cercul de Ø4 e mai mic decât freza \(Ø6\)/);
  assert.match(motivJob(doc([{ id: 'a', raza: 7, e: 20, f: 20 }], [gaurire(['a'])])), /i\/a: cercul de Ø14 trece de două diametre/);
  for (const extra of [{ latura: 'exterior' }, { urechi: { numar: 2, latime: 8, grosime: 2 } }, { rampa: { lungime: 10 } }, { intrari: { raza: 3 } }, { colturi: { tip: 'dog-bone' } }]) {
    assert.match(motivJob(doc([{ id: 'a', raza: 3, e: 20, f: 20 }], [gaurire(['a'], extra)])), /o găurire stă înăuntrul cercului, fără urechi, rampă, intrări, degajări sau despărțire/, JSON.stringify(extra));
  }
  // Un cerc deformat (scalat neuniform, sau forfecat cu coloanele de aceeași lungime) e o elipsă: ușa îl refuză, deci lucrarea
  // primește doar cercuri sub o asemănare.
  for (const m of [{ a: 2, b: 0, c: 0, d: 1 }, { a: 1, b: 0, c: 0.6, d: 0.8 }]) {
    const d = doc([{ id: 'a', raza: 3, e: 20, f: 20 }], [gaurire(['a'])]) as { piese: Array<{ radacina: { copii: Array<{ matrice: Op }> } }> };
    Object.assign(d.piese[0]!.radacina.copii[0]!.matrice, m);
    const r = incarca(d);
    assert.ok(!r.ok && /are arce sub o matrice neuniformă/.test(r.motiv), JSON.stringify(m));
  }
  // Un cerc de rază 1,5 sub o scară 2 (și rotit cu 30°) e un cerc de Ø6: găurit în centru, cu freza Ø6.
  const c = Math.cos(Math.PI / 6) * 2, si = Math.sin(Math.PI / 6) * 2;
  const scalat = doc([{ id: 'a', raza: 1.5, e: 20, f: 20 }], [gaurire(['a'])]) as { piese: Array<{ radacina: { copii: Array<{ matrice: Op }> } }> };
  Object.assign(scalat.piese[0]!.radacina.copii[0]!.matrice, { a: c, b: si, c: -si, d: c });
  const js = programDinDocument(deschis(scalat));
  assert.ok(js.ok, js.ok ? '' : js.motiv);
  if (js.ok) assert.deepEqual(js.program.miscari.flatMap((m) => (m.tip === 'eticheta' ? [m.text] : [])), ['i/a: cerc, găurire, 10 mm']);
  // Despărțirea pe un contur închis o refuză garda ei, înaintea găuririi (ADR 0037 §8).
  assert.match(motivJob(doc([{ id: 'a', raza: 3, e: 20, f: 20 }], [gaurire(['a'], { despartire: true })])), /despărțirea foii se marchează doar pe o cale deschisă/);
  // Mai adânc decât foaia: ca orice tăietură.
  assert.match(motivJob(doc([{ id: 'a', raza: 3, e: 20, f: 20 }], [gaurire(['a'], { adancime: 19 })])), /trece de grosimea foii/);
  // Retragerea completă din document, citită: 3 pași până la ieșire.
  const d = deschis(doc([{ id: 'a', raza: 3, e: 20, f: 20 }], [gaurire(['a'], { retragereCompleta: 3 })]));
  const r = programDinDocument(d);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.program.miscari.filter((m) => m.tip === 'rapida' && m.la.Z === 5).length, 1 + 1 + 1, 'Z sigur la început, o ieșire, la sfârșit');
});

/** Z-ul liniilor G-code ale programului (ultimul scris), cu felul mișcării. */
function linii(text: string): Array<{ g: number; z: number; f: number }> {
  let g = 0, z = Number.NaN, f = 0;
  const rez: Array<{ g: number; z: number; f: number }> = [];
  for (const l of text.split('\n')) {
    const gm = /\bG0?([0-3])\b/.exec(l);
    if (gm) g = Number(gm[1]);
    const zm = /Z(-?[\d.]+)/.exec(l), fm = /F([\d.]+)/.exec(l);
    if (fm) f = Number(fm[1]);
    if (zm) { z = Number(zm[1]); rez.push({ g, z, f }); }
  }
  return rez;
}

test('G-code-ul, pe toate contractele: fără G73 / G81–G89 (antetul scrie G80, care le anulează); între două retrageri, freza coboară în material cel mult pasul', async () => {
  const d = deschis(doc([{ id: 'a', raza: 3, e: 20, f: 20 }, { id: 'b', raza: 5, e: 60, f: 20 }], [gaurire(['a', 'b'], { retragereCompleta: 2 })], 10, 10));
  for (const post of ['grbl-11', 'grblhal', 'fluidnc'] as const) {
    const r = await calculeazaExport(d, { origine: 'stanga-jos', z0: 'sus', post });
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    if (!r.ok) return;
    assert.doesNotMatch(r.program.text, /\bG(73|8[1-9])\b/, post);
    // Gaura în centru: fiecare G1 pe Z coboară cel mult 3 mm sub fundul de dinainte (pasul).
    let fund = 0;
    for (const x of linii(r.program.text.slice(0, r.program.text.indexOf('i/b')))) {
      if (x.g === 1 && x.z < 0) {
        assert.ok(-x.z - fund <= 3 + 1e-9, `${post}: pas de ${-x.z - fund} mm`);
        fund = Math.max(fund, -x.z);
      }
    }
    assert.equal(fund, 10);
  }
});

/** Simularea programului exportat (oracolul independent), pe o grilă în jurul unei găuri: diametrul cercului ± 0,02 mm. */
async function gauraSimulata(raza: number, adancime: number): Promise<{ gresite: number; prima: string }> {
  const d = deschis(doc([{ id: 'a', raza, e: 30, f: 30 }], [gaurire(['a'], { adancime })]));
  const r = await calculeazaExport(d, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const celula = 0.05, latura = 2 * raza + 2;
  const g = { x0: 30 - latura / 2, y0: 30 - latura / 2, latime: latura, inaltime: latura, celula };
  const o = judeca(r.program.text, g, { tip: 'plata', diametru: 6 });
  let gresite = 0, prima = '';
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * celula, y = g.y0 + (j + 0.5) * celula;
      const q = Math.hypot(x - 30, y - 30);
      const asteptat = q <= raza - TOLERANTA_GAURA ? -adancime : q >= raza + TOLERANTA_GAURA ? 0 : null;
      if (asteptat === null) continue;
      const z = o.z[j * o.nx + i] ?? Number.NaN;
      if (Math.abs(z - asteptat) > 1e-6) {
        gresite++;
        if (!prima) prima = `(${x.toFixed(3)}, ${y.toFixed(3)}), la ${q.toFixed(3)} de centru: ${z} în loc de ${asteptat}`;
      }
    }
  }
  return { gresite, prima };
}

test('oracolul simulării: gaura Ø6 în centru, 10 mm: scoasă până la fund în cerc, neatinsă în afară (± 0,02 mm)', async () => {
  const r = await gauraSimulata(3, 10);
  assert.equal(r.gresite, 0, r.prima);
});

test('oracolul simulării: gaura Ø10 în elice și Ø12 (cât două diametre), 8 mm: fundul întreg, peretele la raza cercului (± 0,02 mm)', async () => {
  for (const raza of [5, 6]) {
    const r = await gauraSimulata(raza, 8);
    assert.equal(r.gresite, 0, `Ø${2 * raza}: ${r.prima}`);
  }
});

// ── Documentul v13 și ce scrie Exportă ───────────────────────────────────────────────────────────────────────────────

test('ușa v13: `retragereCompleta` e un întreg 1–100; tipul „gaurire” și câmpul lui într-un v12 nu fac un v12 valid; un v12 curat intră ca v13', () => {
  const cerc = [{ id: 'a', raza: 3, e: 20, f: 20 }];
  for (const bun of [1, 7, 100]) deschis(doc(cerc, [gaurire(['a'], { retragereCompleta: bun })]));
  deschis(doc(cerc, [gaurire(['a'])]));
  for (const rau of [0, -1, 2.5, 101, '3', null, Number.NaN]) {
    assert.ok(!incarca(doc(cerc, [gaurire(['a'], { retragereCompleta: rau })])).ok, String(rau));
  }
  const v12 = (op: Op) => ({ ...(doc(cerc, [op]) as Record<string, unknown>), schema: 12 });
  const a = incarca(v12(gaurire(['a'])));
  assert.ok(!a.ok && /are tipul „gaurire”, pe care v12 nu-l cunoaște: nu e un document v12 valid/.test(a.motiv));
  const b = incarca(v12({ ...gaurire(['a'], { retragereCompleta: 2 }), tip: 'profil' }));
  assert.ok(!b.ok && /are câmpul „retragereCompleta”, pe care v13 îl folosește: nu e un document v12 valid/.test(b.motiv));
  const curat = v12({ ...gaurire(['a']), tip: 'profil' });
  const c = incarca(curat);
  assert.ok(c.ok);
  if (c.ok) assert.deepEqual(c.doc, { ...curat, schema: 13 }, 'doar numărul');
});

test('ce scrie Exportă (ADR 0087 §1): găurirea rândului cu latura interior și nimic din profil; implicitul 1 nu se scrie pe o operație care nu-l avea', () => {
  const scula = { numar: 1, diametru: 6 };
  const profil = deschis(doc([{ id: 'a', raza: 3, e: 20, f: 20 }], [{ ...gaurire(['a']), tip: 'profil', latura: 'exterior', urechi: { numar: 2, latime: 8, grosime: 2 } }])).piese[0]!.operatii[0]!;
  const v = { latura: 'interior', sens: 'urcare', adancime: 10, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'gaurire' } as const;
  const g = operatieDinDialog(profil, { ...v, retragereCompleta: 1 }, scula);
  assert.equal(g.tip, 'gaurire');
  assert.equal(g.latura, 'interior');
  assert.equal(g.urechi, null);
  assert.ok(!Object.hasOwn(g, 'retragereCompleta'), 'implicitul nu se scrie');
  assert.equal(operatieDinDialog(profil, { ...v, retragereCompleta: 4 }, scula).retragereCompleta, 4);
  // Pe o găurire care avea câmpul, rămâne scris și la 1 (Exportă fără schimbare nu scrie o comandă).
  const cu3 = deschis(doc([{ id: 'a', raza: 3, e: 20, f: 20 }], [gaurire(['a'], { retragereCompleta: 3 })])).piese[0]!.operatii[0]!;
  assert.equal(operatieDinDialog(cu3, { ...v, retragereCompleta: 1 }, scula).retragereCompleta, 1);
  assert.deepEqual(operatieDinDialog(cu3, { ...v, retragereCompleta: 3 }, scula), cu3);
  assert.deepEqual(operatieDinDialog(cu3, undefined, scula), cu3, 'rândul pe care dialogul nu-l are rămâne');
  // Rândul de găurire care mai poartă valori de profil (latura, urechi): ce scrie Exportă e tot o găurire curată.
  const murdar = operatieDinDialog(profil, { ...v, latura: 'exterior', urechi: { numar: 2, latime: 8, grosime: 2 }, colturi: { tip: 'dog-bone' }, retragereCompleta: 2 }, scula);
  assert.equal(murdar.latura, 'interior');
  assert.equal(murdar.urechi, null);
  assert.equal(murdar.colturi, null);
  // Înapoi la profil sau la buzunar: câmpul pleacă.
  assert.ok(!Object.hasOwn(operatieDinDialog(cu3, { ...v, tip: 'profil', latura: 'exterior' }, scula), 'retragereCompleta'));
  assert.ok(!Object.hasOwn(operatieDinDialog(cu3, { ...v, tip: 'buzunar', pasLateral: 2.4 }, scula), 'retragereCompleta'));
  // Scrisă, operația trece de ușă.
  const d = deschis(doc([{ id: 'a', raza: 3, e: 20, f: 20 }], [gaurire(['a'])]));
  const dupa = { ...d, piese: [{ ...d.piese[0]!, operatii: [operatieDinDialog(profil, { ...v, retragereCompleta: 4 }, scula)] }] };
  deschis(dupa);
});
