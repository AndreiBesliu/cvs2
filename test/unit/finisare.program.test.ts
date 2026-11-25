/**
 * Finisarea reliefului prin lucrare (felia 18.1↑c-2, ADR 0312): un document v29 cu un relief făcut din dale adevărate
 * (cuantizate, ca în aplicație) și resursele lui trimise ca de pe firul principal; programul (`programDinDocument`, și prin
 * `programFoii` al workerului CAM) e judecat de oracolul 3D pe compusul citit din aceleași dale: nicio scobitură, nicio mutare
 * mai adâncă decât pasul, podeaua. Și: finisarea vine înaintea profilului, cu bila în IR; resursele lipsă, același T cu altă
 * formă, planul zero și instanța rotită.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { programFoii } from '../../src/jobs/calculCam.ts';
import { cheiePas, creastaPePlan, ordinePasi } from '../../src/model/finisare.ts';
import { ordineTaieturi } from '../../src/model/lume.ts';
import { compusDinResurse, type ResurseRelief } from '../../src/relief/resurse.ts';
import { stratDinGrila } from '../../src/relief/strat.ts';
import type { Document } from '../../src/model/document.ts';
import type { Miscare, Program } from '../../src/ir/ir.ts';
import { creastaPlan, IndexO, judecaTraseul, materialO, triunghiuriModel, type FrezaO, type PasO } from '../oracles/relief3d.ts';

type Liber = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** O calotă de rază 6 pe o grilă 40 × 40 de 0,5 mm (20 × 20 mm), cu baza la 0. */
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
  adancime: 10, pas: 2.5, pasLateral: 0.5, finisare: { unghi: 0 }, ...v,
});

function doc(amprenta: string, operatii: readonly Liber[], o: { readonly matriceRelief?: Liber; readonly rotire?: number; readonly x?: number } = {}): Document {
  const d = {
    schema: 29, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...I },
        copii: [
          { tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 30, inaltime: 30, razaColt: 0 }, matrice: { ...I, e: -5, f: -5 } },
          { tip: 'element', id: 'r', forma: { tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: amprenta }] }, matrice: o.matriceRelief ?? { ...I } },
        ],
      },
      operatii: [...operatii],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: o.x ?? 40, y: 40, rotire: o.rotire ?? 0 }] }],
  };
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

/** Pozițiile vârfului, din mișcările programului (de la prima rapidă), până la prima etichetă a altei operații. */
function pasiFinisare(p: Program): PasO[] {
  let x = 0, y = 0, z = p.zSigur, aici = false;
  const out: PasO[] = [{ x, y, z, rapida: true }];
  for (const m of p.miscari) {
    if (m.tip === 'eticheta') { if (aici && !/finisarea reliefului/.test(m.text)) break; aici = /finisarea reliefului/.test(m.text); continue; }
    if (!aici || (m.tip !== 'rapida' && m.tip !== 'taiere')) continue;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    out.push({ x, y, z, rapida: m.tip === 'rapida' });
  }
  return out;
}

/** Judecata oracolului pe finisarea programului: modelul din aceleași dale, cu fața plăcii în jur (marginea „perete”). */
function judeca(p: Program, valori: ArrayLike<number>, m: { a: number; b: number; c: number; d: number; e: number; f: number }, celula: number, dz: number, f: FrezaO, pas: number, podea: number): void {
  const z = Float64Array.from(valori, (v) => v + dz);
  const T0 = triunghiuriModel(z, 40, 40, celula), T = new Float64Array(T0.length);
  for (let k = 0; k < T0.length; k += 3) {
    const x = T0[k]!, y = T0[k + 1]!;
    T[k] = m.a * x + m.c * y + m.e; T[k + 1] = m.b * x + m.d * y + m.f; T[k + 2] = T0[k + 2]!;
  }
  const W = 40 * celula, L = f.R + 2, rama: number[] = [];
  const quad = (x0: number, y0: number, x1: number, y1: number): void => {
    const q = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [m.a * x! + m.c * y! + m.e, m.b * x! + m.d * y! + m.f, 0]);
    rama.push(...q[0]!, ...q[1]!, ...q[2]!, ...q[0]!, ...q[2]!, ...q[3]!);
  };
  quad(-L, -L, W + L, 0); quad(-L, W, W + L, W + L); quad(-L, 0, 0, W); quad(W, 0, W + L, W);
  const tot = new Float64Array(T.length + rama.length);
  tot.set(T); tot.set(rama, T.length);
  const ix = new IndexO(tot, 2);
  const pasi = pasiFinisare(p);
  assert.ok(pasi.length > 100, `finisarea are ${pasi.length} poziții`);
  const pr = judecaTraseul(ix, f, pasi, { podea, tol: 1e-6, sub: 16 });
  assert.deepEqual(pr.slice(0, 3), [], `scobituri: ${pr.length}`);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pasi) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  const mat = materialO(pasi, f, { x0: x0 - f.R - 1, y0: y0 - f.R - 1, x1: x1 + f.R + 1, y1: y1 + f.R + 1 }, 0.2, 0, 0.04);
  assert.ok(mat.taiere <= pas + 0.03, `o mutare intră ${mat.taiere} mm (pasul ${pas})`);
  assert.equal(mat.rapida, 0);
}

test('o calotă din dale, finisată cu bila Ø4 înaintea profilului: oracolul pe compusul din aceleași dale; bila în IR', async () => {
  const v = calota();
  const { amprenta, resurse } = await strat(v, 40, 40);
  const d = doc(amprenta, [op({}), finisare()]);
  const r = programDinDocument(d, REGIM_IMPLICIT, 0, false, undefined, resurse);
  if (!r.ok) assert.fail(r.motiv);
  const etichete = r.program.miscari.filter((m): m is Extract<Miscare, { tip: 'eticheta' }> => m.tip === 'eticheta').map((m) => m.text);
  assert.match(etichete[0]!, /finisarea reliefului/);
  assert.ok(etichete.some((t) => /dreptunghi/.test(t)));
  // Scula programului e prima montată: bila, cu forma ei în IR; apoi schimbarea pe T1.
  assert.deepEqual(r.program.scula.forma, { tip: 'bila' });
  assert.ok(r.program.miscari.some((m) => m.tip === 'schimba-scula' && m.scula.numar === 1));
  // Compusul pe care l-a tăiat lucrarea: cel din dale (cuantizat), cu vârful la fața plăcii.
  const c = compusDinResurse({ tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: amprenta }] }, resurse);
  assert.ok(c.ok);
  const max = Math.max(...c.valori);
  judeca(r.program, c.valori, { ...I, e: 40, f: 40 }, 0.5, -max, { fel: 'bila', R: 2 }, 2.5, -10);
  // La fel prin programul foii (exportul, traseul și vederea 3D trec pe aici).
  const f = programFoii(d, REGIM_IMPLICIT, 0, false, resurse);
  assert.ok(f.ok);
  assert.deepEqual(f.program.miscari, r.program.miscari);
});

test('relieful rotit cu instanța și scalat de matricea lui; planul zero la 3 mm; V-ul la 45°', async () => {
  const v = calota();
  const { amprenta, resurse } = await strat(v, 40, 40);
  const s = 1.5, t = Math.PI / 6;
  const mr = { a: s * Math.cos(t), b: s * Math.sin(t), c: -s * Math.sin(t), d: s * Math.cos(t), e: 2, f: 3 };
  const d = doc(amprenta, [finisare({ scula: { numar: 3, nume: 'freza V90', diametru: 6, forma: { tip: 'v', unghi: 90 } }, finisare: { unghi: 45, planZero: 3 } })], { matriceRelief: mr, rotire: 90, x: 80 });
  const r = programDinDocument(d, REGIM_IMPLICIT, 0, false, undefined, resurse);
  if (!r.ok) assert.fail(r.motiv);
  const c = compusDinResurse({ tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: amprenta }] }, resurse);
  assert.ok(c.ok);
  // În lume: instanța rotită cu 90° la (80, 40), după matricea reliefului; celula 0,75 mm, transformarea rigidă rămasă.
  const w = { a: mr.a, b: mr.b, c: mr.c, d: mr.d, e: mr.e, f: mr.f };
  const lume = { a: -w.b, b: w.a, c: -w.d, d: w.c, e: -w.f + 80, f: w.e + 40 };
  const rig = { a: lume.a / s, b: lume.b / s, c: lume.c / s, d: lume.d / s, e: lume.e, f: lume.f };
  judeca(r.program, c.valori, rig, 0.5 * s, -3, { fel: 'v', R: 3, alfa: Math.PI / 4 }, 2.5, -10);
  // Partea de deasupra feței (calota are 6 mm, planul zero la 3 mm) se spune.
  assert.ok(r.avertismente.some((a) => /deasupra feței/.test(a)));
});

test('refuzurile lucrării: dalele lipsă, același T cu altă formă, podeaua sub placă, urechi pe finisare', async () => {
  const v = calota();
  const { amprenta, resurse } = await strat(v, 40, 40);
  const motiv = (d: Document, x: ResurseRelief | null = resurse): string => { const r = programDinDocument(d, REGIM_IMPLICIT, 0, false, undefined, x ?? undefined); return r.ok ? '' : r.motiv; };
  assert.match(motiv(doc(amprenta, [finisare()]), null), /dalele reliefului nu sunt în acest browser/);
  assert.match(motiv(doc(amprenta, [finisare()]), {}), /dalele reliefului nu sunt în acest browser/);
  // T2 bilă la finisare și T2 plată la profil: două freze sub același număr.
  assert.match(motiv(doc(amprenta, [op({ scula: { numar: 2, nume: 'freza plata', diametru: 4 } }), finisare()])), /T2 are două freze de Ø4 \(bilă și plată\)/);
  assert.match(motiv(doc(amprenta, [finisare({ adancime: 18.5 })])), /trece de grosimea plăcii/);
  assert.match(motiv(doc(amprenta, [finisare({ urechi: { numar: 2, latime: 4, grosime: 1 } })])), /nu are urechi/);
  assert.match(motiv(doc(amprenta, [finisare({ coborare: { fel: 'plonjare' } })])), /coborare e al altor operații/);
  // Fără probleme, trece.
  assert.equal(motiv(doc(amprenta, [finisare()])), '');
});

test('bifa „prin foaie” nu atinge finisarea (podeaua cât placa rămâne); un strat ascuns nu intră în compus', async () => {
  const v = calota();
  const { amprenta, resurse } = await strat(v, 40, 40);
  const prin = programDinDocument(doc(amprenta, [finisare({ adancime: 18 })]), REGIM_IMPLICIT, 0.5, true, undefined, resurse);
  assert.ok(prin.ok, prin.ok ? '' : prin.motiv);
  // Un con de 20 mm pe placa de 18: podeaua (cât placa) oprește freza la −18, cu bifa și cu supracursa de 0,5 mm.
  const con = new Float64Array(40 * 40);
  for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) con[j * 40 + i] = Math.max(0, 20 - 3 * Math.hypot((i + 0.5) * 0.5 - 10, (j + 0.5) * 0.5 - 10));
  const adanc = await strat(con, 40, 40);
  const jos = (r: ReturnType<typeof programDinDocument>): number => {
    if (!r.ok) assert.fail(r.motiv);
    let z = Infinity;
    for (const m of r.program.miscari) if (m.tip === 'taiere' && m.la.Z !== undefined) z = Math.min(z, m.la.Z);
    return z;
  };
  const dAdanc = doc(adanc.amprenta, [finisare({ adancime: 18 })]);
  assert.equal(jos(programDinDocument(dAdanc, REGIM_IMPLICIT, 0.5, false, undefined, adanc.resurse)), -18);
  assert.equal(jos(programDinDocument(dAdanc, REGIM_IMPLICIT, 0.5, true, undefined, adanc.resurse)), -18);
  // Un strat ascuns, cu o cocoașă de 10 mm: programul e același ca fără el.
  const bump = new Float64Array(40 * 40);
  for (let k = 0; k < bump.length; k++) bump[k] = k % 40 > 15 && k % 40 < 25 ? 10 : 0;
  const ascuns = await strat(bump, 40, 40);
  const cu = { ...resurse, ...ascuns.resurse };
  const d1 = doc(amprenta, [finisare()]);
  const d2 = structuredClone(d1) as unknown as { piese: Array<{ radacina: { copii: Array<{ forma: { straturi: unknown[] } }> } }> };
  d2.piese[0]!.radacina.copii[1]!.forma.straturi.push({ id: 's2', mod: 'aduna', vizibil: false, dale: ascuns.amprenta });
  const a = programDinDocument(d1, REGIM_IMPLICIT, 0, false, undefined, cu);
  const b = programDinDocument(incarcaDoc(d2), REGIM_IMPLICIT, 0, false, undefined, cu);
  assert.ok(a.ok && b.ok);
  assert.deepEqual(b.program.miscari, a.program.miscari);
});

function incarcaDoc(d: unknown): Document {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

test('ordinea (ADR 0312 §7): automat, finisarea întâi; cu ranguri, unde a pus-o omul; fără rang, tot în față', async () => {
  const v = calota();
  const { amprenta, resurse } = await strat(v, 40, 40);
  const etichete = (d: Document): string[] => {
    const r = programDinDocument(d, REGIM_IMPLICIT, 0, false, undefined, resurse);
    if (!r.ok) assert.fail(r.motiv);
    return r.program.miscari.filter((m): m is Extract<Miscare, { tip: 'eticheta' }> => m.tip === 'eticheta')
      .map((m) => (/finisarea reliefului/.test(m.text) ? 'F' : 'P'));
  };
  const ordine = (d: Document): string[] => ordinePasi(d, 0).map((p) => `${p.fel === 'finisare' ? 'F' : 'P'}:${cheiePas(p)}`);
  // Automat: finisarea înaintea exteriorului piesei.
  const auto = doc(amprenta, [op({}), finisare()]);
  assert.deepEqual(ordine(auto), ['F:p/f', 'P:p/o']);
  assert.deepEqual(etichete(auto), ['F', 'P']);
  // Ordinea omului: exteriorul (rangul 0) înaintea finisării (rangul 1).
  const aMea = doc(amprenta, [op({ rang: 0 }), finisare({ rang: 1 })]);
  assert.deepEqual(ordine(aMea), ['P:p/o', 'F:p/f']);
  assert.deepEqual(etichete(aMea), ['P', 'F']);
  // O finisare fără rang, cu exteriorul cu rang: rămâne în față, nu ajunge pe tăcute după tăierea de contur.
  const faraRang = doc(amprenta, [op({ rang: 0 }), finisare()]);
  assert.deepEqual(ordine(faraRang), ['F:p/f', 'P:p/o']);
  assert.deepEqual(etichete(faraRang), ['F', 'P']);
  // Doar finisarea are rang: tăieturile rămân după ea, în ordinea lor.
  assert.deepEqual(etichete(doc(amprenta, [op({}), finisare({ rang: 3 })])), ['F', 'P']);
  // Tăieturile din `ordinePasi` sunt exact cele din `ordineTaieturi`, în aceeași ordine (lucrarea le indexează).
  for (const d of [auto, aMea, faraRang]) {
    assert.deepEqual(ordinePasi(d, 0).flatMap((p) => (p.fel === 'taietura' ? [p.t] : [])), ordineTaieturi(d, 0));
  }
});

test('creasta pe plan, pe hârtie: bila, V-ul cu și fără vârf plat, plata, peste diametru', () => {
  // Bila Ø6 (R = 3), s = 0,6: 3 − √(9 − 0,09) = 0,015037…
  assert.ok(Math.abs(creastaPePlan({ numar: 1, nume: '', diametru: 6, forma: { tip: 'bila' } }, 0.6)! - (3 - Math.sqrt(8.91))) < 1e-12);
  assert.ok(Math.abs(creastaPePlan({ numar: 1, nume: '', diametru: 6, forma: { tip: 'bila' } }, 6)! - 3) < 1e-12);
  // Și față de oracolul 3D (creasta pe plan, θ = 0), pe câteva perechi.
  for (const [D, s] of [[6, 0.6], [3.175, 0.3], [1.5, 1], [12, 2.4]] as const) {
    assert.ok(Math.abs(creastaPePlan({ numar: 1, nume: '', diametru: D, forma: { tip: 'bila' } }, s)! - creastaPlan(D / 2, s)) < 1e-12);
  }
  // V90 (tan 45° = 1), s = 1: 0,5; cu vârful plat de 0,4: 0,3; cu s sub vârf: 0.
  assert.ok(Math.abs(creastaPePlan({ numar: 1, nume: '', diametru: 6, forma: { tip: 'v', unghi: 90 } }, 1)! - 0.5) < 1e-12);
  assert.ok(Math.abs(creastaPePlan({ numar: 1, nume: '', diametru: 6, forma: { tip: 'v', unghi: 90, varf: 0.4 } }, 1)! - 0.3) < 1e-12);
  assert.equal(creastaPePlan({ numar: 1, nume: '', diametru: 6, forma: { tip: 'v', unghi: 90, varf: 0.4 } }, 0.3), 0);
  assert.equal(creastaPePlan({ numar: 1, nume: '', diametru: 6 }, 2), 0);
  assert.equal(creastaPePlan({ numar: 1, nume: '', diametru: 6, forma: { tip: 'bila' } }, 7), null);
  assert.equal(creastaPePlan({ numar: 1, nume: '', diametru: 6, forma: { tip: 'bila' } }, 0), null);
});
