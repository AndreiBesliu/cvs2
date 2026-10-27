/**
 * Coborârea în buzunar (ADR 0076, documentul v12): pe hârtie, pe programul în IR, cât coboară fiecare fel (rampa pe inel,
 * zigzagul, elicea) și pe ce drum; căderea elicei care nu încape pe rampa pe inel, cu avertisment; refuzurile; ușa v12 și
 * migrarea v11 → v12. Pe G-code-ul exportat, oracolul simulării (independent, `test/oracles/simulare.ts`): buzunarul iese
 * același, scos la adâncime în toată deschiderea și neatins în afara ei, iar poarta (pasul pe trecere, rapidele) e curată.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rampeZigzag } from '../../src/cam/coborare.ts';
import { centruElice } from '../../src/cam/buzunar.ts';
import { conturDreptunghi, inverseaza } from '../../src/geom/contur.ts';
import { distantaLaContur, inRegiune } from '../../src/geom/distanta.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { judeca } from '../oracles/simulare.ts';
import { poarta } from '../oracles/poarta.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 };
type Op = Record<string, unknown>;
const buzunar = (extra: Op = {}): Op => ({
  id: 'b', tip: 'buzunar', pasLateral: 2.4, noduri: ['e'], scula: { ...SCULA }, latura: 'interior', sens: 'urcare', adancime: 6, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
/** Un document v14 cu dreptunghiul `latime` × `inaltime` (buzunarul `op`) la (x, y), pe o foaie 200 × 150 × 18. */
function doc(op: Op, latime = 100, inaltime = 60, x = 40, y = 40): unknown {
  return {
    schema: 14, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', matrice: { ...I }, forma: { tip: 'dreptunghi', latime, inaltime, razaColt: 0 } }, operatii: [op] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x, y, rotire: 0 }] }],
  };
}
const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const program = (d: unknown) => {
  const j = programDinDocument(deschis(d));
  if (!j.ok) assert.fail(j.motiv);
  return j;
};
/** Panta care dă exact 0,1 mm pe mm (unghiul în grade). */
const ZECIME = (Math.atan(0.1) * 180) / Math.PI;

type Bucata = { readonly a: { x: number; y: number; z: number }; readonly b: { x: number; y: number; z: number }; readonly lung: number; readonly tip: string; readonly avans?: number };
/** Mișcările, ca bucăți cu capetele și lungimea în plan (pe arc, raza ori unghiul, pe partea cerută de sens). */
function bucati(miscari: readonly Miscare[]): Bucata[] {
  const rez: Bucata[] = [];
  let p = { x: 0, y: 0, z: 0 };
  for (const m of miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const q = { x: m.la.X ?? p.x, y: m.la.Y ?? p.y, z: m.la.Z ?? p.z };
    let lung = Math.hypot(q.x - p.x, q.y - p.y);
    if (m.tip === 'arc') {
      const r = Math.hypot(p.x - m.centru.x, p.y - m.centru.y);
      let u = Math.atan2(q.y - m.centru.y, q.x - m.centru.x) - Math.atan2(p.y - m.centru.y, p.x - m.centru.x);
      if (m.sens === 'trigonometric') { while (u <= 1e-12) u += 2 * Math.PI; } else { while (u >= -1e-12) u -= 2 * Math.PI; }
      lung = r * Math.abs(u);
    }
    rez.push({ a: p, b: q, lung, tip: m.tip, ...(m.tip === 'rapida' ? {} : { avans: m.avans }) });
    p = q;
  }
  return rez;
}
/** Coborârile fiecărei treceri: bucățile de tăiere care schimbă Z-ul și se mișcă și în plan, grupate între rapide. */
function coborari(b: readonly Bucata[]): Bucata[][] {
  const rez: Bucata[][] = [];
  let cur: Bucata[] = [];
  for (const x of b) {
    if (x.tip === 'rapida') { if (cur.length > 0) rez.push(cur); cur = []; continue; }
    if (x.b.z < x.a.z - 1e-12 && x.lung > 1e-9) cur.push(x);
  }
  if (cur.length > 0) rez.push(cur);
  return rez;
}
const aproape = (a: number, b: number, mesaj: string, eps = 1e-6): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };

test('rampa pe inel, pe hârtie: 0,1 mm pe mm, 3 mm pe trecere = 30 mm de-a lungul inelului cel mai adânc, de la 0 la −3 și de la −3 la −6', () => {
  const j = program(doc(buzunar({ coborare: { fel: 'rampa', unghi: ZECIME } })));
  const c = coborari(bucati(j.program.miscari));
  assert.equal(c.length, 2, 'o coborâre pe trecere (inelele se leagă la adâncime)');
  for (const [k, z0, z1] of [[0, 0, -3], [1, -3, -6]] as const) {
    const x = c[k]!;
    aproape(x.reduce((s, y) => s + y.lung, 0), 30, `lungimea coborârii ${k}`);
    aproape(x[0]!.a.z, z0, `pornirea ${k}`);
    aproape(x.at(-1)!.b.z, z1, `sosirea ${k}`);
    // Pe inelul cel mai adânc (41,2 × 1,2 la d = 29,4: x în [69,4; 110,6], y în [69,4; 70,6]), deci în buzunar.
    for (const y of x) for (const q of [y.a, y.b]) assert.ok(q.x >= 69.4 - 1e-9 && q.x <= 110.6 + 1e-9 && q.y >= 69.4 - 1e-9 && q.y <= 70.6 + 1e-9, JSON.stringify(q));
  }
  // Nicio coborâre verticală în material (sub −0 la prima trecere, sub −3 la a doua).
  for (const x of bucati(j.program.miscari)) if (x.tip === 'taiere' && x.lung <= 1e-9) assert.ok(x.b.z >= -3 - 1e-9 || x.b.z >= x.a.z, `plonjare la ${x.b.z}`);
});

test('zigzagul, pe hârtie: 20 mm, 0,1 mm pe mm, 3 mm pe trecere = 2 rampe de câte 1,5 mm, dus și întors pe aceeași bucată a inelului', () => {
  assert.equal(rampeZigzag(3, 20, ZECIME), 2);
  assert.equal(rampeZigzag(3, 30, ZECIME), 1);
  assert.equal(rampeZigzag(3, 10, ZECIME), 3);
  const j = program(doc(buzunar({ coborare: { fel: 'zigzag', unghi: ZECIME, lungime: 20 } })));
  const c = coborari(bucati(j.program.miscari));
  assert.equal(c.length, 2);
  const x = c[0]!;
  aproape(x.reduce((s, y) => s + y.lung, 0), 40, 'două rampe de 20');
  // Dus: de la pornire, 20 mm, la −1,5; întors: înapoi la pornire, la −3.
  const pornire = x[0]!.a;
  aproape(pornire.z, 0, 'pornirea');
  const dus = x.filter((y) => y.b.z >= -1.5 - 1e-9), intors = x.filter((y) => y.a.z <= -1.5 + 1e-9);
  aproape(dus.reduce((s, y) => s + y.lung, 0), 20, 'dusul');
  aproape(intors.reduce((s, y) => s + y.lung, 0), 20, 'întorsul');
  aproape(Math.hypot(x.at(-1)!.b.x - pornire.x, x.at(-1)!.b.y - pornire.y), 0, 'întors în pornire');
  aproape(x.at(-1)!.b.z, -3, 'la −3');
});

test('elicea, pe hârtie: centrul în mijlocul bucății cele mai adânci (90, 70), raza 3, 30 mm de elice pe trecere, apoi drept la inel', () => {
  const j = program(doc(buzunar({ coborare: { fel: 'elice', unghi: ZECIME, raza: 3 } })));
  assert.deepEqual(j.avertismente, []);
  const b = bucati(j.program.miscari);
  const c = coborari(b);
  assert.equal(c.length, 2);
  for (const [k, z1] of [[0, -3], [1, -6]] as const) {
    const x = c[k]!;
    assert.ok(x.every((y) => y.tip === 'arc'), 'elicea e din arce');
    aproape(x.reduce((s, y) => s + y.lung, 0), 30, `elicea ${k}`);
    for (const y of x) aproape(Math.hypot(y.b.x - 90, y.b.y - 70), 3, 'pe cercul de rază 3 din (90, 70)');
    aproape(x.at(-1)!.b.z, z1, `la ${z1}`);
  }
  // După cercul plin de la adâncime, legătura dreaptă pe raza spre inel: din (90, 67) în (90, 69,4), cel mai apropiat punct.
  const i = b.findIndex((y) => y === c[0]!.at(-1));
  const dupa = b.slice(i + 1).find((y) => y.tip === 'taiere' && y.lung > 1e-9 && Math.abs(y.a.x - y.b.x) < 1e-9);
  assert.ok(dupa, 'legătura');
  aproape(dupa!.a.y, 67, 'din capătul elicei');
  aproape(dupa!.b.y, 69.4, 'în inel');
});

test('elicea care nu încape (buzunarul de 100 × 9, cu Ø6): coboară pe inel, cu același unghi, și spune asta', () => {
  const j = program(doc(buzunar({ coborare: { fel: 'elice', unghi: ZECIME, raza: 3 } }), 100, 9));
  assert.equal(j.avertismente.length, 1);
  assert.match(j.avertismente[0]!, /^i\/e: elicea de rază 3 mm nu încape în bucata de la 3\.000 mm de contur: acolo coboară pe inel/);
  const c = coborari(bucati(j.program.miscari));
  aproape(c[0]!.reduce((s, y) => s + y.lung, 0), 30, 'rampa pe inel, 30 mm');
});

test('refuzurile lucrării: unghiul sub 0,5°, zigzagul sub 1 mm, elicea sub 0,5 mm; plonjarea = programul de până acum', () => {
  for (const [c, motiv] of [
    [{ fel: 'rampa', unghi: 0.3 }, 'i/e: unghiul coborârii, 0.3°, e sub 0.5°'],
    [{ fel: 'zigzag', unghi: 5, lungime: 0.5 }, 'i/e: zigzagul de 0.5 mm e mai scurt de 1 mm'],
    [{ fel: 'elice', unghi: 5, raza: 0.2 }, 'i/e: elicea de rază 0.2 mm e sub 0.5 mm'],
  ] as const) {
    assert.deepEqual(programDinDocument(deschis(doc(buzunar({ coborare: c })))), { ok: false, motiv }, JSON.stringify(c));
  }
  // Plonjarea scrisă e exact programul fără coborare.
  assert.deepEqual(program(doc(buzunar({ coborare: { fel: 'plonjare' } }))), program(doc(buzunar())));
});

test('ușa v12: coborârea are felul și parametrii în margini (unghiul în (0, 45]); un v11 cu un câmp „coborare” nu e un v11 valid', () => {
  deschis(doc(buzunar({ coborare: { fel: 'elice', unghi: 45, raza: 3, extra: 1 } })));
  for (const rau of [{ fel: 'spirala', unghi: 5 }, { fel: 'rampa' }, { fel: 'rampa', unghi: 0 }, { fel: 'rampa', unghi: 45.01 }, { fel: 'zigzag', unghi: 5 },
    { fel: 'elice', unghi: 5, raza: 0 }, { fel: 'elice', unghi: '5', raza: 3 }, 'rampa', null]) {
    const r = incarca(doc(buzunar({ coborare: rau })));
    assert.ok(!r.ok, JSON.stringify(rau));
  }
  const v11 = { ...(doc(buzunar({ coborare: { fel: 'plonjare' } })) as Record<string, unknown>), schema: 11 };
  const r = incarca(v11);
  assert.ok(!r.ok && /are câmpul „coborare”, pe care v12 îl folosește: nu e un document v11 valid/.test(r.motiv));
  // Un v11 fără coborare intră ca v12, doar cu numărul (din 5.4↑, mai departe la v13).
  const fara = { ...(doc(buzunar()) as Record<string, unknown>), schema: 11 };
  const a = incarca(fara);
  assert.ok(a.ok);
  if (a.ok) assert.deepEqual(a.doc, { ...fara, schema: 14 });
});

/** Programul exportat, judecat de oracolul simulării: scos la −6 în deschiderea dreptunghiului, neatins în afară. */
async function simulat(d: unknown, x0: number, y0: number, x1: number, y1: number, insula?: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }) {
  const r = await calculeazaExport(deschis(d), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const g = { x0: x0 - 10, y0: y0 - 10, latime: x1 - x0 + 20, inaltime: y1 - y0 + 20, celula: 0.25 };
  const o = judeca(r.program.text, g, { tip: 'plata', diametru: 6 });
  const R = 3, m = 0.05;
  const inD = (x: number, y: number, mm: number): boolean => {
    if (x < x0 + mm || x > x1 - mm || y < y0 + mm || y > y1 - mm) return false;
    const cx = Math.min(Math.max(x, x0 + R), x1 - R), cy = Math.min(Math.max(y, y0 + R), y1 - R);
    return Math.hypot(x - cx, y - cy) <= R - mm;
  };
  let gresite = 0, prima = '';
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula;
      if (inD(x, y, -m) && !inD(x, y, m)) continue;
      const inI = (mm: number): boolean => !!insula && x > insula.x0 + mm && x < insula.x1 - mm && y > insula.y0 + mm && y < insula.y1 - mm;
      if (inI(-m) && !inI(m)) continue;
      const z = inI(m) ? 0 : inD(x, y, m) ? -6 : 0;
      if (Math.abs((o.z[j * o.nx + i] ?? Number.NaN) - z) > 1e-6) { gresite++; if (!prima) prima = `(${x}, ${y}): ${o.z[j * o.nx + i]} în loc de ${z}`; }
    }
  }
  return { gresite, prima, text: r.program.text };
}

for (const [nume, c] of [
  ['rampa pe inel', { fel: 'rampa', unghi: 3 }],
  ['zigzagul', { fel: 'zigzag', unghi: 3, lungime: 15 }],
  ['elicea', { fel: 'elice', unghi: 3, raza: 2.5 }],
] as const) {
  test(`oracolul simulării: cu ${nume}, dreptunghiul 100 × 60 e scos la 6 mm în toată deschiderea, iar în afară nimic; poarta e curată`, async () => {
    const r = await simulat(doc(buzunar({ coborare: c })), 40, 40, 140, 100);
    assert.equal(r.gresite, 0, r.prima);
    assert.deepEqual(poarta(r.text, {
      foaie: { latime: 200, inaltime: 150, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 3, supracursa: 0,
      asteptareAx: 3, avansPlonjare: 300, cadru: { minX: 43, maxX: 137, minY: 43, maxY: 97 },
    }), []);
  });
}

test('oracolul simulării: cu o insulă 20 × 20 la mijloc și elicea de rază 4 (în bucățile din stânga și dreapta insulei), insula rămâne, restul e scos', async () => {
  const d = doc(buzunar({ noduri: ['e', 'i'], coborare: { fel: 'elice', unghi: 3, raza: 4 } }));
  const piesa = (d as { piese: Array<{ radacina: unknown }> }).piese[0]!;
  piesa.radacina = {
    tip: 'grup', id: 'g', matrice: { ...I }, copii: [
      { tip: 'element', id: 'e', matrice: { ...I }, forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 } },
      { tip: 'element', id: 'i', matrice: { ...I, e: 40, f: 20 }, forma: { tip: 'dreptunghi', latime: 20, inaltime: 20, razaColt: 0 } },
    ],
  };
  const j = program(d);
  // Bucățile din jurul insulei se leagă la adâncime din cele mai adânci (stânga, dreapta, cu loc), deci elicea încape.
  assert.deepEqual(j.avertismente, []);
  assert.equal(coborari(bucati(j.program.miscari)).length >= 4, true, 'câte o elice în fiecare ramură, pe trecere');
  const r = await simulat(d, 40, 40, 140, 100, { x0: 80, y0: 60, x1: 100, y1: 80 });
  assert.equal(r.gresite, 0, r.prima);
});

/** Unde se întoarce freza după tura plină de la adâncime: la `P` mm după capătul coborârii, în același punct. */
function turaPlina(b: readonly Bucata[], dupa: Bucata, P: number): void {
  const i = b.indexOf(dupa);
  let s = 0;
  for (const x of b.slice(i + 1)) {
    if (x.tip === 'rapida' || Math.abs(x.b.z - dupa.b.z) > 1e-9) break;
    s += x.lung;
    if (Math.abs(s - P) < 1e-6) {
      aproape(Math.hypot(x.b.x - dupa.b.x, x.b.y - dupa.b.y), 0, 'tura plină se închide în capătul coborârii');
      return;
    }
  }
  assert.fail(`nicio tură de ${P} mm la adâncime după coborâre (${s} mm)`);
}

test('tura plină de la adâncime, pe hârtie: după rampă, după zigzagul cu număr impar de rampe (10 mm = 3) și după elice (cercul de 2π · 3)', () => {
  // Inelul cel mai adânc, 41,2 × 1,2: P = 84,8.
  for (const c of [{ fel: 'rampa', unghi: ZECIME }, { fel: 'zigzag', unghi: ZECIME, lungime: 10 }] as const) {
    const b = bucati(program(doc(buzunar({ coborare: c }))).program.miscari);
    for (const x of coborari(b)) turaPlina(b, x.at(-1)!, 84.8);
  }
  const b = bucati(program(doc(buzunar({ coborare: { fel: 'elice', unghi: ZECIME, raza: 3 } }))).program.miscari);
  for (const x of coborari(b)) turaPlina(b, x.at(-1)!, 2 * Math.PI * 3);
});

test('ce scrie Exportă (ADR 0076 §5): coborârea rândului pe buzunar, îmbinată pe același fel (câmpul necunoscut rămâne); plonjarea și profilul n-o scriu', () => {
  const scula = { numar: 1, diametru: 6 };
  const o = deschis(doc(buzunar({ coborare: { fel: 'elice', unghi: 4, raza: 3, extra: 'x' } }))).piese[0]!.operatii[0]!;
  const v = { latura: 'interior', sens: 'urcare', adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'buzunar', pasLateral: 2.4 } as const;
  assert.deepEqual(operatieDinDialog(o, { ...v, coborare: { fel: 'elice', unghi: 5, raza: 2 } }, scula).coborare, { fel: 'elice', unghi: 5, raza: 2, extra: 'x' });
  assert.deepEqual(operatieDinDialog(o, { ...v, coborare: { fel: 'rampa', unghi: 5 } }, scula).coborare, { fel: 'rampa', unghi: 5 });
  assert.ok(!Object.hasOwn(operatieDinDialog(o, v, scula), 'coborare'), 'plonjarea nu se scrie');
  assert.ok(!Object.hasOwn(operatieDinDialog(o, { ...v, tip: 'profil', latura: 'exterior', coborare: { fel: 'rampa', unghi: 5 } }, scula), 'coborare'), 'profilul n-o are');
  assert.deepEqual(operatieDinDialog(o, undefined, scula).coborare, o.coborare, 'rândul pe care dialogul nu-l are rămâne');
});

test('zigzagul mai lung decât bucla: se face pe toată bucla (84,8 mm), o singură rampă, apoi tura plină', () => {
  const b = bucati(program(doc(buzunar({ coborare: { fel: 'zigzag', unghi: ZECIME, lungime: 200 } }))).program.miscari);
  for (const x of coborari(b)) {
    aproape(x.reduce((s, y) => s + y.lung, 0), 84.8, 'o rampă pe toată bucla');
    turaPlina(b, x.at(-1)!, 84.8);
  }
});

test('centrul elicei (ADR 0076 §3): în bucată, la cel puțin raza ei de toate buclele (și de insulă); null unde nu încape', () => {
  const R = 3;
  // Coroana dintre 100 × 100 și insula 60 × 60 de la mijloc, la d = R: lățimea 20, locul cel mai mare 10.
  const coroana = { d: R, bucle: [conturDreptunghi(0, 0, 100, 100), inverseaza(conturDreptunghi(20, 20, 60, 60))], copii: [] };
  const c = centruElice(coroana, R, 5);
  assert.ok(c, 'încape');
  assert.ok(inRegiune(c!, coroana.bucle), `în coroană: ${JSON.stringify(c)}`);
  for (const b of coroana.bucle) assert.ok(distantaLaContur(c!, b) >= 5 - 1e-9, `la ${distantaLaContur(c!, b)} de o buclă`);
  // Insula mare (80 × 80, coroana de 10): în insulă ar fi 40 de loc, în coroană 5; centrul rămâne în coroană.
  const ingusta = { d: R, bucle: [conturDreptunghi(0, 0, 100, 100), inverseaza(conturDreptunghi(10, 10, 80, 80))], copii: [] };
  const i = centruElice(ingusta, R, 4);
  assert.ok(i && inRegiune(i, ingusta.bucle), `în coroana îngustă: ${JSON.stringify(i)}`);
  assert.equal(centruElice(ingusta, R, 6), null, 'raza 6 nu încape în coroana de 10');
  // Buzunarul de 100 × 9 cu Ø6: bucata de la 3 e 94 × 3, cu 1,5 de loc.
  assert.equal(centruElice({ d: R, bucle: [conturDreptunghi(3, 3, 94, 3)], copii: [] }, R, 3), null);
  // Bucata de la d > R are în plus d − R: o buclă de 2 × 2 la d = 10 are loc 1 + 7.
  assert.ok(centruElice({ d: 10, bucle: [conturDreptunghi(0, 0, 2, 2)], copii: [] }, R, 8));
  assert.equal(centruElice({ d: 10, bucle: [conturDreptunghi(0, 0, 2, 2)], copii: [] }, R, 8.01), null);
});

test('după elice, bucla pornește din punctul în care a ajuns legătura și se închide acolo, după 84,8 mm', () => {
  const b = bucati(program(doc(buzunar({ coborare: { fel: 'elice', unghi: ZECIME, raza: 3 } }))).program.miscari);
  for (const x of coborari(b)) {
    const i = b.indexOf(x.at(-1)!);
    const legatura = b.slice(i + 1).find((y) => y.tip === 'taiere' && y.lung > 1e-9 && Math.abs(y.a.x - y.b.x) < 1e-9 && y.b.y > y.a.y);
    assert.ok(legatura, 'legătura');
    turaPlina(b, legatura!, 84.8);
  }
});
