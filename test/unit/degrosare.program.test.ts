/**
 * Degroșarea reliefului prin lucrare (felia 18.1↑d-1, ADR 0313): un document v30 cu o calotă făcută din dale adevărate, o
 * degroșare cu freza plată și o finisare cu bila; programul (`programDinDocument`, și prin `programFoii`) e judecat de
 * oracolul 3D pe compusul citit din aceleași dale:
 * - ordinea: automat, degroșarea, apoi finisarea, apoi tăieturile; cu ranguri, unde le-a pus omul; o degroșare fără rang rămâne
 *   în față; finisarea pusă înaintea degroșării aceluiași relief e un avertisment, iar programul rămâne bun (degroșarea nu
 *   coboară sub model plus adaos și nu intră mai adânc decât pasul ei, nici după finisare);
 * - adaosul, pasul pe material și rapidele, pe degroșare; pe tot programul, cu frezele la rând: pasul fiecărei operații;
 * - refuzurile: o freză care nu e plată, câmpul `degrosare` pe alt fel, urechile, podeaua sub placă, planul zero sau marginea
 *   altfel decât la finisarea aceluiași relief, același T cu altă formă;
 * - originea în centrul foii (28.8↑o): G-code-ul, citit din centru, e cel din colț mutat cu jumătatea foii și trece oracolul.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { calculeazaExportul, programFoii } from '../../src/jobs/calculCam.ts';
import { cheiePas, ordinePasi } from '../../src/model/finisare.ts';
import { compusDinResurse, type ResurseRelief } from '../../src/relief/resurse.ts';
import { stratDinGrila } from '../../src/relief/strat.ts';
import type { Document } from '../../src/model/document.ts';
import type { Miscare, Program } from '../../src/ir/ir.ts';
import { IndexO, judecaDegrosarea, materialSecventaO, triunghiuriModel, type FrezaO, type PasO } from '../oracles/relief3d.ts';

type Liber = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function calota(nx = 40, ny = 40, c = 0.5, Rs = 6): Float64Array {
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const d2 = ((i + 0.5) * c - 10) ** 2 + ((j + 0.5) * c - 10) ** 2;
      v[j * nx + i] = d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0;
    }
  }
  return v;
}

async function strat(v: Float64Array, nx: number, ny: number): Promise<{ readonly amprenta: string; readonly resurse: ResurseRelief }> {
  const s = await stratDinGrila(v, nx, ny);
  return { amprenta: s.amprenta, resurse: { [s.amprenta]: { text: s.text, octeti: Object.fromEntries(s.octeti) } } };
}

const op = (v: Liber): Liber => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', sens: 'urcare',
  adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
const finisare = (v: Liber = {}): Liber => op({
  id: 'f', tip: 'finisare', noduri: ['r'], scula: { numar: 2, nume: 'freza bila', diametru: 4, forma: { tip: 'bila' } }, latura: 'pe-linie',
  adancime: 10, pas: 6, pasLateral: 0.5, finisare: { unghi: 0 }, ...v,
});
/** Degroșarea calotei: freza plată Ø4 (T3), adaosul 0,5 mm, 1,6 mm între linii, 2,5 mm pe trecere, podeaua la 10 mm. */
const degrosare = (v: Liber = {}): Liber => op({
  id: 'd', tip: 'degrosare', noduri: ['r'], scula: { numar: 3, nume: 'freza plata', diametru: 4 }, latura: 'pe-linie',
  adancime: 10, pas: 2.5, pasLateral: 1.6, degrosare: { adaos: 0.5, unghi: 0 }, ...v,
});

function doc(amprenta: string, operatii: readonly Liber[]): Document {
  const d = {
    schema: 30, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...I },
        copii: [
          { tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 30, inaltime: 30, razaColt: 0 }, matrice: { ...I, e: -5, f: -5 } },
          { tip: 'element', id: 'r', forma: { tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: amprenta }] }, matrice: { ...I } },
        ],
      },
      operatii: [...operatii],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 40, y: 40, rotire: 0 }] }],
  };
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

const etichete = (p: Program): string[] => p.miscari.filter((m): m is Extract<Miscare, { tip: 'eticheta' }> => m.tip === 'eticheta').map((m) => m.text);
const fel = (t: string): string => (/degroșarea reliefului/.test(t) ? 'D' : /finisarea reliefului/.test(t) ? 'F' : 'P');

/** Pozițiile vârfului pe blocul de după eticheta care se potrivește, până la eticheta următoare. */
function bloc(p: Program, re: RegExp): PasO[] {
  let x = 0, y = 0, z = p.zSigur, aici = false;
  const out: PasO[] = [];
  for (const m of p.miscari) {
    if (m.tip === 'eticheta') { if (aici) break; aici = re.test(m.text); if (aici) out.push({ x, y, z: p.zSigur, rapida: true }); continue; }
    if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    if (aici) out.push({ x, y, z, rapida: m.tip === 'rapida' });
  }
  return out;
}

/** Modelul exact al compusului (mutat cu dz, în lume la (40, 40)), cu fața plăcii în jur (marginea „perete”). */
function indexModel(valori: ArrayLike<number>, dz: number, l: number, dx = 40, dy = 40): IndexO {
  const z = Float64Array.from(valori, (v) => v + dz);
  const T0 = triunghiuriModel(z, 40, 40, 0.5), rama: number[] = [];
  for (let k = 0; k < T0.length; k += 3) { T0[k] = T0[k]! + dx; T0[k + 1] = T0[k + 1]! + dy; }
  const quad = (x0: number, y0: number, x1: number, y1: number): void => {
    rama.push(x0 + dx, y0 + dy, 0, x1 + dx, y0 + dy, 0, x1 + dx, y1 + dy, 0, x0 + dx, y0 + dy, 0, x1 + dx, y1 + dy, 0, x0 + dx, y1 + dy, 0);
  };
  quad(-l, -l, 20 + l, 0); quad(-l, 20, 20 + l, 20 + l); quad(-l, 0, 0, 20); quad(20, 0, 20 + l, 20);
  const tot = new Float64Array(T0.length + rama.length);
  tot.set(T0); tot.set(rama, T0.length);
  return new IndexO(tot, 2);
}

const ZONA = { x0: 25, y0: 25, x1: 75, y1: 75 };

/** Degroșarea programului, judecată de oracol: adaosul, podeaua, pasul pe material, rapidele. */
function judecaD(p: Program, ix: IndexO, R: number, a: number, pas: number, podea: number, tol = 1e-6): PasO[] {
  const d = bloc(p, /degro[sș]area reliefului/);
  assert.ok(d.length > 50, `degroșarea are ${d.length} poziții`);
  const pr = judecaDegrosarea(ix, R, a, d, { podea, pas, zona: ZONA, pasGrila: 0.2, tol });
  assert.deepEqual(pr.slice(0, 3), [], `${pr.length} probleme`);
  return d;
}

test('automat: degroșarea, apoi finisarea, apoi profilul; adaosul, pasul și rapidele; pe tot programul, pasul fiecărei freze', async () => {
  const { amprenta, resurse } = await strat(calota(), 40, 40);
  const d = doc(amprenta, [op({}), finisare(), degrosare()]);
  const r = programDinDocument(d, REGIM_IMPLICIT, 0, false, undefined, resurse);
  if (!r.ok) assert.fail(r.motiv);
  assert.deepEqual(etichete(r.program).map(fel), ['D', 'F', 'P']);
  assert.deepEqual(ordinePasi(d, 0).map((x) => `${x.fel}:${cheiePas(x)}`), ['degrosare:p/d', 'finisare:p/f', 'taietura:p/o']);
  // Prima freză montată e a degroșării (plată, fără formă în IR), apoi bila, apoi T1.
  assert.equal(r.program.scula.numar, 3);
  assert.equal(r.program.scula.forma, undefined);
  const c = compusDinResurse({ tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: amprenta }] }, resurse);
  assert.ok(c.ok);
  const dz = -Math.max(...c.valori), ix = indexModel(c.valori, dz, 5);
  const pd = judecaD(r.program, ix, 2, 0.5, 2.5, -10);
  const pf = bloc(r.program, /finisarea reliefului/);
  const sec = materialSecventaO([{ pasi: pd, f: { fel: 'plata', R: 2 } }, { pasi: pf, f: { fel: 'bila', R: 2 } }], ZONA, 0.2, 0, 0.04);
  assert.ok(sec.blocuri[0]!.taiere <= 2.5 + 0.05, `degroșarea: ${sec.blocuri[0]!.taiere}`);
  // Finisarea (pasul ei de 6 mm) după degroșare.
  assert.ok(sec.blocuri[1]!.taiere <= 6 + 0.05, `finisarea: ${sec.blocuri[1]!.taiere}`);
  assert.ok(sec.blocuri.every((b) => b.rapida === 0));
  // Prin programul foii, același program.
  const f = programFoii(d, REGIM_IMPLICIT, 0, false, resurse);
  assert.ok(f.ok);
  assert.deepEqual(f.program.miscari, r.program.miscari);
  assert.ok(!r.avertismente.some((a) => /înaintea degroșării/.test(a)));
});

test('ordinea de mână: cu ranguri, unde le-a pus omul; o degroșare fără rang rămâne în față; finisarea înaintea degroșării e un avertisment, iar programul rămâne bun', async () => {
  const { amprenta, resurse } = await strat(calota(), 40, 40);
  const prog = (ops: readonly Liber[]) => {
    const r = programDinDocument(doc(amprenta, ops), REGIM_IMPLICIT, 0, false, undefined, resurse);
    if (!r.ok) assert.fail(r.motiv);
    return r;
  };
  // Profilul întâi, apoi degroșarea, apoi finisarea (bifa riscului e a ferestrei; lucrarea taie unde i s-a spus).
  assert.deepEqual(etichete(prog([op({ rang: 0 }), degrosare({ rang: 1 }), finisare({ rang: 2 })]).program).map(fel), ['P', 'D', 'F']);
  // Degroșarea fără rang: în față, ca o finisare fără rang.
  assert.deepEqual(etichete(prog([op({ rang: 0 }), finisare({ rang: 1 }), degrosare()]).program).map(fel), ['D', 'P', 'F']);
  // Finisarea înaintea degroșării aceluiași relief.
  const r = prog([finisare({ rang: 0 }), degrosare({ rang: 1 }), op({ rang: 2 })]);
  assert.deepEqual(etichete(r.program).map(fel), ['F', 'D', 'P']);
  assert.ok(r.avertismente.some((a) => /p\/f.*înaintea degroșării.*p\/d/.test(a)), r.avertismente.join(' | '));
  const c = compusDinResurse({ tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: amprenta }] }, resurse);
  assert.ok(c.ok);
  const ix = indexModel(c.valori, -Math.max(...c.valori), 5);
  const pd = judecaD(r.program, ix, 2, 0.5, 2.5, -10);
  const pf = bloc(r.program, /finisarea reliefului/);
  const sec = materialSecventaO([{ pasi: pf, f: { fel: 'bila', R: 2 } }, { pasi: pd, f: { fel: 'plata', R: 2 } }], ZONA, 0.2, 0, 0.04);
  assert.ok(sec.blocuri[0]!.taiere <= 6 + 0.05 && sec.blocuri[1]!.taiere <= 2.5 + 0.05, `adâncimi ${sec.blocuri.map((b) => b.taiere)}`);
  assert.ok(sec.blocuri.every((b) => b.rapida === 0));
});

test('refuzurile lucrării: freza nu e plată, câmpul pe alt fel, urechile, podeaua, planul zero și marginea altfel decât la finisare, același T', async () => {
  const { amprenta, resurse } = await strat(calota(), 40, 40);
  const motiv = (ops: readonly Liber[]): string => {
    const r = programDinDocument(doc(amprenta, ops), REGIM_IMPLICIT, 0, false, undefined, resurse);
    return r.ok ? '' : r.motiv;
  };
  assert.match(motiv([degrosare({ scula: { numar: 5, nume: 'bila', diametru: 4, forma: { tip: 'bila' } } })]), /degroșarea reliefului se face cu o freză plată.*bilă/);
  assert.match(motiv([degrosare({ scula: { numar: 5, nume: 'V90', diametru: 6, forma: { tip: 'v', unghi: 90 } } })]), /degroșarea reliefului se face cu o freză plată.*în V/);
  assert.match(motiv([op({ degrosare: { adaos: 0.5, unghi: 0 } })]), /valorile degroșării sunt doar ale unei degroșări/);
  assert.match(motiv([finisare({ degrosare: { adaos: 0.5, unghi: 0 } })]), /valorile degroșării sunt doar ale unei degroșări/);
  assert.match(motiv([degrosare({ finisare: { unghi: 0 } })]), /valorile finisării sunt doar ale unei finisări/);
  assert.match(motiv([degrosare({ urechi: { numar: 2, latime: 4, grosime: 1 } })]), /degroșare a reliefului nu are urechi/);
  assert.match(motiv([degrosare({ coborare: { fel: 'plonjare' } })]), /coborare e al altor operații/);
  assert.match(motiv([degrosare({ adancime: 18.5 })]), /podeaua degroșării.*trece de grosimea plăcii/);
  // Planul zero: degroșarea ar tăia la alt model decât finisarea aceluiași relief.
  assert.match(motiv([degrosare({ degrosare: { adaos: 0.5, unghi: 0, planZero: 3 } }), finisare()]), /planul zero.*finisarea p\/f/);
  assert.match(motiv([degrosare(), finisare({ finisare: { unghi: 0, planZero: 2 } })]), /planul zero/);
  // Marginea: degroșarea care trece de margine ar scoate peretele pe care finisarea îl păstrează.
  assert.match(motiv([degrosare({ degrosare: { adaos: 0.5, unghi: 0, margine: 'trece' } }), finisare()]), /trece de marginea reliefului.*peretele/);
  // Invers (degroșarea păstrează peretele, finisarea trece), merge.
  assert.equal(motiv([degrosare(), finisare({ finisare: { unghi: 0, margine: 'trece' } })]), '');
  // Același T cu altă formă: T2 plată la degroșare, T2 bilă la finisare.
  assert.match(motiv([degrosare({ scula: { numar: 2, nume: 'freza plata', diametru: 4 } }), finisare()]), /T2 are două freze de Ø4/);
  // Un adaos peste ce coboară relieful: nimic de tăiat, cu avertisment, nu refuz.
  const nimic = programDinDocument(doc(amprenta, [degrosare({ degrosare: { adaos: 8, unghi: 0 } }), op({})]), REGIM_IMPLICIT, 0, false, undefined, resurse);
  assert.ok(nimic.ok && nimic.avertismente.some((a) => /degroșarea n-are ce tăia/.test(a)));
  assert.equal(motiv([degrosare(), finisare()]), '');
});

/** Programul unui fișier G-code (GRBL, mm, absolut, fără arce), în coordonatele foii: XY0 mutat înapoi cu (dx, dy). */
function dinGcode(text: string, dx: number, dy: number): Program {
  const miscari: Miscare[] = [];
  let g = 0;
  for (const l of text.split('\n')) {
    const com = /^\((.*)\)$/.exec(l.trim());
    if (com) { miscari.push({ tip: 'eticheta', text: com[1]!, element: '', operatie: '' }); continue; }
    const gm = /\bG([01])\b/.exec(l);
    if (gm) g = Number(gm[1]);
    const v = (ax: string): number | undefined => { const m = new RegExp(`\\b${ax}(-?\\d+(?:\\.\\d+)?)`).exec(l); return m ? Number(m[1]) : undefined; };
    const X = v('X'), Y = v('Y'), Z = v('Z');
    if (X === undefined && Y === undefined && Z === undefined) continue;
    const la = { ...(X !== undefined ? { X: X + dx } : {}), ...(Y !== undefined ? { Y: Y + dy } : {}), ...(Z !== undefined ? { Z } : {}) };
    miscari.push(g === 0 ? { tip: 'rapida', la } : { tip: 'taiere', la, avans: 1000 });
  }
  return { axe: ['X', 'Y', 'Z'], scula: { numar: 3, nume: '', diametru: 4 }, turatie: 0, zSigur: 5, miscari } as unknown as Program;
}

test('originea în centrul foii (28.8↑o): G-code-ul degroșării, citit din centru, e cel din colț mutat cu jumătatea foii și trece oracolul', async () => {
  const { amprenta, resurse } = await strat(calota(), 40, 40);
  const d = doc(amprenta, [degrosare()]);
  const p = { origine: 'stanga-jos', z0: 'sus' } as const;
  const [ec, ej] = [await calculeazaExportul(d, { ...p, origine: 'centru' }, resurse), await calculeazaExportul(d, p, resurse)];
  if (!ec.ok || !ej.ok) assert.fail(`${ec.ok ? '' : ec.motiv} ${ej.ok ? '' : ej.motiv}`);
  const tc = ec.fisiere[0]!.text, tj = ej.fisiere[0]!.text;
  assert.match(tc, /origine centru/);
  const c = dinGcode(tc, 100, 75), j = dinGcode(tj, 0, 0);
  const poz = (q: Program): number[][] => q.miscari.flatMap((m) => (m.tip === 'rapida' || m.tip === 'taiere' ? [[m.la.X ?? NaN, m.la.Y ?? NaN, m.la.Z ?? NaN]] : []));
  const pc = poz(c), pj = poz(j);
  assert.equal(pc.length, pj.length);
  pc.forEach((q, i) => q.forEach((x, k) => {
    const y = pj[i]![k]!;
    assert.ok((Number.isNaN(x) && Number.isNaN(y)) || Math.abs(x - y) < 1.5e-3, `poziția ${i}, axa ${k}: ${x} față de ${y}`);
  }));
  const comp = compusDinResurse({ tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: amprenta }] }, resurse);
  assert.ok(comp.ok);
  judecaD(c, indexModel(comp.valori, -Math.max(...comp.valori), 5), 2, 0.5, 2.5, -10, 6e-4);
  // Freza montată la începutul fișierului din centru: tot T3 (antetul și blocul de pornire, neschimbate de origine).
  const f: FrezaO = { fel: 'plata', R: 2 };
  assert.equal(f.R, 2);
});
