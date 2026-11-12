/**
 * Felia 3.6k (ADR 0191, răspunsul 3b mai departe), pe hârtie: modelele umplerii rare și ale suprafețelor pline (direcțiile,
 * pașii, densitatea, ordinea monotonă), cusătura (locul, decalarea celor dinăuntru, golul), ștergerea la retragere (ca `Wipe`
 * din OrcaSlicer), călcarea, fusta, implicitele fiecărei calități K1C (legate de fixtura profilelor OrcaSlicer, cu moștenirile
 * rezolvate) și configurația din subsol.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { conturCerc, conturDreptunghi, type Contur } from '../../src/geom/conturBaza.ts';
import { analizeazaText, patPentru } from '../../src/machine/imprimanta/gcode3d.ts';
import { felStrat } from '../../src/cam/feliere/gcode.ts';
import { feliaza, setariImplicite, setariValide, type Cale } from '../../src/cam/feliere/index.ts';
import { inPoligoane, intervale, monoton, taiePolilinie } from '../../src/cam/feliere/linii.ts';
import { numeObiect } from '../../src/cam/feliere/piese.ts';
import { ARIE_FILAMENT, CALITATI, K1C, MODELE_PLIN, MODELE_RAR, pas, type SetariFeliere } from '../../src/cam/feliere/profil.ts';
import {
  citesteFel, cusaturaAleatoare, cusaturaApropiata, cusaturaStatica, penalizareColt, puncte,
} from '../../src/cam/feliere/straturi.ts';

const DATA = '2026-11-08 at 10:00:00';
const piesa = (contururi: Contur[], inaltime = 3, eticheta = 'Placă', k = 0) => ({ id: `i${k}`, nume: numeObiect(eticheta, k), eticheta, contururi, inaltime });
const linii = (t: string): string[] => t.split('\n');
const poligon = (pts: number[][]): Contur => ({ inchis: true, varfuri: pts.map(([x, y]) => ({ p: { x: x!, y: y! }, s: { tip: 'L' as const } })) });
const cu = (x: Partial<Record<keyof SetariFeliere, unknown>> = {}): SetariFeliere => setariValide({ ...setariImplicite(), brim: 'nu', ...x });
const SP = pas(0.45, 0.2);
/** Unghiul (0–180) și distanța de la origine (perpendiculară) a unei linii drepte cu două puncte. */
const dreapta = (c: Cale): { u: number; d: number } => {
  // Direcția, fără sens (0–180): o linie parcursă invers e aceeași dreaptă, cu aceeași distanță.
  const u = ((((Math.atan2(c.p[3]! - c.p[1]!, c.p[2]! - c.p[0]!) * 180) / Math.PI) % 180) + 180) % 180;
  const r = (u * Math.PI) / 180;
  return { u: Math.round(u) % 180, d: -c.p[0]! * Math.sin(r) + c.p[1]! * Math.cos(r) };
};
const fr = (x: number): number => x - Math.floor(x);
/** Cât se retrage pe drumul ștergerii, cel mult: viteza retragerii (40 mm/s) · drumul / viteza ștergerii. */
const maximCalc = (lung: number, vw: number): number => (40 * lung) / vw;
const v = (l: string, k: string): number | null => { const m = new RegExp(`\\b${k}(-?[\\d.]+)`).exec(l); return m ? Number(m[1]) : null; };

test('implicitele feliei 3.6k, legate de profilele OrcaSlicer K1C (fixtura, cu moștenirile rezolvate și implicitele PrintConfig)', () => {
  const o = JSON.parse(readFileSync('test/fixtures/imprimanta/orca-k1.json', 'utf8')) as {
    procese: Record<string, Record<string, string>>; imprimanta: Record<string, string>;
  };
  const legacy = (x: string): string => (x === 'zig-zag' ? 'rectilinear' : x);
  const procent = (x: string): number => Number(x.replace('%', '')) / 100;
  for (const c of CALITATI) {
    const x = Object.entries(o.procese).find(([k]) => k.startsWith(`${c.id}mm`))?.[1];
    assert.ok(x, c.id);
    const s = setariImplicite('pla', c.id);
    assert.deepEqual(
      [s.modelRar, s.modelSus, s.modelJos, s.modelPlin, s.unghiRar, s.unghiPlin, s.cusatura, s.cusaturiDecalate, s.golCusatura, s.stergereDupaRol, s.vStergere],
      [x['sparse_infill_pattern'], x['top_surface_pattern'], x['bottom_surface_pattern'], x['internal_solid_infill_pattern'], Number(x['infill_direction']),
        Number(x['solid_infill_direction']), x['seam_position'], x['staggered_inner_seams'] === '1', procent(x['seam_gap']!) * K1C.duza,
        x['role_based_wipe_speed'] === '1', procent(x['wipe_speed']!)], c.id);
    assert.deepEqual(
      [s.calcare, s.modelCalcare, s.debitCalcare, s.pasCalcare, s.vCalcare, s.margineCalcare, s.unghiCalcare],
      [({ 'no ironing': 'nu', top: 'sus', topmost: 'ultima', solid: 'plin' } as Record<string, string>)[x['ironing_type']!], legacy(x['ironing_pattern']!),
        Number(x['ironing_flow']!.replace('%', '')) / 100, Number(x['ironing_spacing']), Number(x['ironing_speed']), Number(x['ironing_inset']), Number(x['ironing_angle'])], c.id);
    assert.deepEqual(
      [s.fusta, s.distantaFusta, s.inaltimeFusta, s.vFusta, s.tipFusta, s.lungimeMinimaFusta, s.scut, s.unghiFusta, s.oBuclaDupa],
      [Number(x['skirt_loops']), Number(x['skirt_distance']), Number(x['skirt_height']), Number(x['skirt_speed']), x['skirt_type'] === 'combined' ? 'combinata' : 'piesa',
        Number(x['min_skirt_length']), x['draft_shield'] === 'enabled', Number(x['skirt_start_angle']), x['single_loop_draft_shield'] === '1'], c.id);
  }
  // Imprimanta: ștergerea pornită, 2 mm, 70 % din retragere înainte, nimic după.
  assert.deepEqual([K1C.stergere, K1C.distantaStergere, K1C.retragereInainte, K1C.retragere, K1C.vitezaRetragere],
    [o.imprimanta['wipe'] === '1', Number(o.imprimanta['wipe_distance']), procent(o.imprimanta['retract_before_wipe']!), Number(o.imprimanta['retraction_length']),
      Number(o.imprimanta['retraction_speed'])]);
  assert.equal(o.imprimanta['retract_after_wipe'], '0%');
});

test('modelele rare din linii: direcțiile, pașii (sp · familii / densitate) și fazele (triunghiurile prin aceleași noduri)', () => {
  const placa = [conturDreptunghi(80, 90, 60, 40)];
  const fam = (s: SetariFeliere, k: number): Map<number, number[]> => {
    const r = feliaza([piesa(placa, 4)], s, { data: DATA });
    const m = new Map<number, number[]>();
    for (const c of r.cai(k).filter((x) => x.rol === 'rar' && x.p.length === 4)) { const { u, d } = dreapta(c); m.set(u, [...(m.get(u) ?? []), d]); }
    return m;
  };
  const pasul = (d: number[]): number => { const s = [...new Set(d.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b); return Math.min(...s.slice(1).map((x, i) => x - s[i]!)); };
  // Dreptunghiular: o familie pe strat, la sp / d, întoarsă cu 90° de la un strat la altul; aliniat: aceeași direcție.
  const r9 = fam(cu({ modelRar: 'rectilinear' }), 9), r10 = fam(cu({ modelRar: 'rectilinear' }), 10);
  assert.deepEqual([[...r9.keys()], [...r10.keys()]], [[45], [135]]);
  assert.ok(Math.abs(pasul(r9.get(45)!) - SP / 0.15) < 1e-5, `${pasul(r9.get(45)!)}`);
  assert.deepEqual([[...fam(cu({ modelRar: 'alignedrectilinear' }), 9).keys()], [...fam(cu({ modelRar: 'alignedrectilinear' }), 10).keys()]], [[45], [45]]);
  // Liniile oscilante: jumătate paralele la 45°, jumătate înclinate (pasul − sp pe toată înălțimea piesei).
  const lo = feliaza([piesa(placa, 4)], cu({ modelRar: 'line' }), { data: DATA }).cai(9).filter((x) => x.rol === 'rar');
  const unghiLo = (c: Cale): number => (((Math.atan2(c.p[c.p.length - 1]! - c.p[1]!, c.p[c.p.length - 2]! - c.p[0]!) * 180) / Math.PI) % 180 + 180) % 180;
  const drepte = lo.filter((c) => Math.abs(unghiLo(c) - 45) < 1e-6).length, inclinate = lo.filter((c) => Math.abs(unghiLo(c) - 45) > 0.5).length;
  assert.ok(drepte > 5 && inclinate > 5, `${drepte} drepte, ${inclinate} înclinate`);
  // Fagurele: hexagoane regulate, deci trei direcții la 60° una de alta; în reperul modelului 90°, 30° și 150°, rotite cu
  // −(u + 90°) pe stratul 9: 135°, 75° și 15°.
  const fag = feliaza([piesa(placa, 4)], cu({ modelRar: 'honeycomb' }), { data: DATA }).cai(9).filter((x) => x.rol === 'rar');
  const dirFag = new Set<number>();
  for (const c of fag) for (let i = 2; i < c.p.length; i += 2) {
    const L = Math.hypot(c.p[i]! - c.p[i - 2]!, c.p[i + 1]! - c.p[i - 1]!);
    if (L > 0.5) dirFag.add(Math.round(((((Math.atan2(c.p[i + 1]! - c.p[i - 1]!, c.p[i]! - c.p[i - 2]!) * 180) / Math.PI) % 180) + 180) % 180) % 180);
  }
  assert.deepEqual([...dirFag].sort((a, b) => a - b), [15, 75, 135]);
  // Triunghiurile: trei familii la 60°, la 3 · sp / d, toate prin originea patului (faza 0): se întâlnesc în aceleași noduri.
  const tr = fam(cu({ modelRar: 'triangles' }), 9), ls = (3 * SP) / 0.15;
  assert.deepEqual([...tr.keys()].sort((a, b) => a - b), [45, 105, 165]);
  for (const d of tr.values()) { assert.ok(Math.abs(pasul(d) - ls) < 1e-5, `${pasul(d)}`); for (const x of d) assert.ok(Math.abs(fr(x / ls + 1e-6) - 1e-6) < 1e-5, `${x / ls}`); }
  // Tri-hexagonul: a treia familie, la jumătate de pas (triunghiuri și hexagoane).
  const th = fam(cu({ modelRar: 'tri-hexagon' }), 9);
  for (const x of th.get(165)!) assert.ok(Math.abs(fr(x / ls) - 0.5) < 1e-6, `${x / ls}`);
  for (const x of th.get(45)!) assert.ok(Math.abs(fr(x / ls + 1e-6) - 1e-6) < 1e-5, `${x / ls}`);
  // Cubicul: familiile se mută cu Z (√0,5 · z), în sensuri alternate: un cub în spațiu.
  const c9 = fam(cu({ modelRar: 'cubic' }), 9), c10 = fam(cu({ modelRar: 'cubic' }), 10);
  const muta = (a: number[], b: number[]): number => fr((Math.min(...b.map((x) => fr(x / ls))) - Math.min(...a.map((x) => fr(x / ls)))) + 1);
  const dz = (Math.SQRT1_2 * 0.2) / ls;
  assert.ok(Math.abs(muta(c9.get(45)!, c10.get(45)!) - fr(dz)) < 1e-5 || Math.abs(muta(c9.get(45)!, c10.get(45)!) - fr(-dz)) < 1e-5, `${muta(c9.get(45)!, c10.get(45)!)} față de ${fr(dz)}`);
  assert.ok(Math.abs(muta(c9.get(45)!, c10.get(45)!) - muta(c9.get(105)!, c10.get(105)!)) > 1e-3, 'familiile cubicului nu se mută în sensuri diferite');
});

test('densitatea fiecărui model rar: lungimea extrudată față de aria · d / sp (ca în OrcaSlicer)', () => {
  const r0 = (m: string, d: number): number => {
    const r = feliaza([piesa([conturDreptunghi(60, 60, 100, 100)], 4)], cu({ modelRar: m, umplere: d }), { data: DATA });
    let L = 0;
    for (const c of r.cai(9).filter((x) => x.rol === 'rar')) {
      for (let i = 2; i < c.p.length; i += 2) L += Math.hypot(c.p[i]! - c.p[i - 2]!, c.p[i + 1]! - c.p[i - 1]!);
      if (c.inchisa) L += Math.hypot(c.p[0]! - c.p[c.p.length - 2]!, c.p[1]! - c.p[c.p.length - 1]!);
    }
    // Regiunea: dinăuntrul celor doi pereți (adâncimea 0,8308), lărgită cu suprapunerea (0,3 · 0,45).
    return L / (((100 - 2 * (0.8308 - 0.135)) ** 2 * d) / SP);
  };
  // Liniile și curbele: exact (până la capetele tăiate); hașura în cruce cu pasul ei · 1,08; giroidul cu factorul lui (2,44);
  // fagurele lui OrcaSlicer pune ceva mai mult; concentricul, buclele întregi.
  const benzi: Record<string, [number, number]> = {
    'crosshatch 0.15': [0.9, 0.95], 'crosshatch 0.4': [1.04, 1.1], 'gyroid 0.15': [0.88, 0.93], 'gyroid 0.4': [0.9, 0.95],
    'honeycomb 0.15': [1.25, 1.32], 'honeycomb 0.4': [1.17, 1.23], 'concentric 0.15': [1.0, 1.08], 'concentric 0.4': [0.98, 1.06],
  };
  for (const m of MODELE_RAR) {
    for (const d of [0.15, 0.4]) {
      const [lo, hi] = benzi[`${m} ${d}`] ?? [0.99, 1.01];
      const x = r0(m, d);
      assert.ok(x >= lo && x <= hi, `${m} la ${d}: ${x.toFixed(3)}`);
    }
  }
});

test('modelele 3D (cubic, hașura în cruce, giroid) se schimbă cu Z; celelalte țin același șablon pe straturile rare', () => {
  for (const m of MODELE_RAR) {
    const s = cu({ modelRar: m });
    const a = citesteFel(felStrat(9, 20, s)), b = citesteFel(felStrat(11, 20, s));
    const z = m === 'cubic' || m === 'crosshatch' || m === 'gyroid';
    assert.equal(a.z !== null, z, m);
    if (!z) assert.equal(felStrat(9, 20, s), felStrat(11, 20, s), m);
  }
  for (const m of ['cubic', 'crosshatch', 'gyroid', 'grid', 'honeycomb'] as const) {
    const r = feliaza([piesa([conturDreptunghi(80, 90, 60, 40)], 8)], cu({ modelRar: m }), { data: DATA });
    const sir = (k: number): string => r.cai(k).filter((x) => x.rol === 'rar').map((x) => Array.from(x.p.slice(0, 4), (n) => n.toFixed(3)).join(',')).join(';');
    const distincte = new Set(Array.from({ length: 30 }, (_, i) => sir(4 + i))).size;
    // Fagurele alternează direcția (două șabloane); grila, unul; modelele 3D, mai multe.
    assert.ok(m === 'grid' ? distincte === 1 : m === 'honeycomb' ? distincte === 2 : distincte > 3, `${m}: ${distincte}`);
  }
});

test('umplerea monotonă: o linie se imprimă mereu după vecina ei de dinainte; „monotonic line” fără legături, „monotonic” cu legături scurte', () => {
  // Un U: în dreptul golului, fiecare linie are două intervale (zigzag-ul simplu ar sări înainte și înapoi).
  // Liniile, orizontale (unghiul 0): sub y = 6, o linie întreagă; deasupra, două (brațele U-ului), deci regiunile se despart;
  // la U-ul întors, se unesc.
  const forme = [
    poligon([[0, 0], [30, 0], [30, 20], [20, 20], [20, 6], [10, 6], [10, 20], [0, 20]]),
    poligon([[0, 0], [10, 0], [10, 14], [20, 14], [20, 0], [30, 0], [30, 20], [0, 20]]),
  ];
  for (const forma of forme) for (const legaturi of [true, false]) {
    const u = [Float64Array.from(puncte(forma))];
    const iv = intervale(u, 0, 0.4);
    assert.ok([...iv.values()].some((l) => l.length === 2));
    const cai = monoton(iv, 0, 0.4, legaturi, 0.4, 'sus', 0.42);
    // Fiecare segment de linie: indexul căii în care e imprimat, linia (k) și intervalul ei.
    const seg: { ord: number; k: number; a: number; b: number }[] = [];
    let ord = 0;
    for (const c of cai) {
      for (let i = 0; i + 3 < c.p.length; i += 2) {
        const x0 = c.p[i]!, x1 = c.p[i + 2]!, y0 = c.p[i + 1]!, y1 = c.p[i + 3]!;
        // Liniile la 0°: orizontale; o legătură e verticală (de-a lungul liniilor, cel mult un pas).
        if (Math.abs(y0 - y1) < 1e-9) seg.push({ ord: ord++, k: Math.round(y0 / 0.4 - 0.5), a: Math.min(x0, x1), b: Math.max(x0, x1) });
        else assert.ok(legaturi && Math.abs(x0 - x1) <= 0.4 + 1e-9, 'legătură nepermisă');
      }
      if (!legaturi) assert.equal(c.p.length, 4);
    }
    assert.equal(seg.length, [...iv.values()].reduce((a, l) => a + l.length, 0));
    for (const s of seg) for (const t of seg) if (t.k === s.k + 1 && t.a < s.b && s.a < t.b) assert.ok(s.ord < t.ord, `linia ${t.k} înaintea vecinei ${s.k}`);
  }
});

test('cusătura: aliniată în colțul concav, în spate cea mai din spate, aliniată în spate fuge de față, cea mai apropiată de duză, aleatoare după strat', () => {
  assert.ok(penalizareColt(-Math.PI / 2) < penalizareColt(Math.PI / 2) && penalizareColt(Math.PI / 2) < penalizareColt(0));
  assert.ok(Math.abs(penalizareColt(0) - (1 + 1 / 3)) < 1e-12);
  // Un L (în sensul trigonometric): colțul concav e (10, 10), al patrulea vârf.
  const L = Float64Array.from([0, 0, 20, 0, 20, 10, 10, 10, 10, 20, 0, 20]);
  assert.equal(cusaturaStatica(L, false, 'aligned'), 3);
  assert.equal(cusaturaStatica(L, false, 'aligned_back'), 3);
  // În spate: y cel mai mare (10, 20) și (0, 20), apoi x cel mai mic.
  assert.equal(cusaturaStatica(L, false, 'back'), 5);
  // Un dreptunghi: toate colțurile la fel, deci cel din spate-stânga (ca la 3.6j).
  const D = Float64Array.from([0, 0, 20, 0, 20, 10, 0, 10]);
  assert.equal(cusaturaStatica(D, false, 'aligned'), 3);
  // Același dreptunghi ca gol (materialul în afară): colțurile lui sunt concave pentru material, tot spate-stânga.
  assert.equal(cusaturaStatica(D, true, 'aligned'), 3);
  // L-ul ca gol: colțul lui concav e convex pentru material, deci nu e ales; cele cinci concave (pentru material), spate-stânga.
  assert.equal(cusaturaStatica(L, true, 'aligned'), 5);
  // Un U deschis în față: aliniată alege un colț concav al deschiderii (în față); aliniată în spate, colțul din spate-stânga.
  const U = Float64Array.from([0, 0, 8, 0, 8, 10, 12, 10, 12, 0, 20, 0, 20, 20, 0, 20]);
  assert.ok([2, 3].includes(cusaturaStatica(U, false, 'aligned')), String(cusaturaStatica(U, false, 'aligned')));
  assert.equal(cusaturaStatica(U, false, 'aligned_back'), 7);
  // Cea mai apropiată: duza lângă colțul din față-dreapta.
  assert.equal(cusaturaApropiata(D, false, 21, -1), 1);
  assert.equal(cusaturaApropiata(D, false, -1, 11), 3);
  // Aleatoare: aceeași intrare, același punct, pe buclă; alt strat, alt punct.
  const a = cusaturaAleatoare(D, 0.4), b = cusaturaAleatoare(D, 0.4), c = cusaturaAleatoare(D, 0.6);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(inPoligoane(a.x, a.y, [Float64Array.from([-1e-6, -1e-6, 20 + 1e-6, -1e-6, 20 + 1e-6, 10 + 1e-6, -1e-6, 10 + 1e-6])]));
});

test('cusăturile pereților dinăuntru: din proiecția celei exterioare, decalate înainte cu adâncimea lor (sau nu)', () => {
  const placa = [conturDreptunghi(100, 100, 20, 20)];
  const d1 = (pas(0.42, 0.2) + pas(0.45, 0.2)) / 2;
  for (const decalate of [true, false]) {
    const r = feliaza([piesa(placa)], cu({ pereti: 3, cusaturiDecalate: decalate }), { data: DATA });
    const bucle = r.cai(8).filter((c) => c.inchisa && (c.rol === 'exterior' || c.rol === 'interior'));
    const ext = bucle.find((c) => c.adancime === 0)!, int1 = bucle.find((c) => c.adancime === 1)!;
    // Exteriorul: din colțul din spate-stânga, la w/2 de margine.
    assert.ok(Math.abs(ext.p[0]! - 100.21) < 1e-6 && Math.abs(ext.p[1]! - 119.79) < 1e-6, `${ext.p[0]}, ${ext.p[1]}`);
    // Primul perete dinăuntru: colțul lui e la d1 mai înăuntru; decalat, pornește la √2 · d1 de el, pe una din laturi.
    const cx = 100.21 + d1, cy = 119.79 - d1;
    const dist = Math.hypot(int1.p[0]! - cx, int1.p[1]! - cy);
    if (decalate) {
      assert.ok(Math.abs(dist - Math.SQRT2 * d1) < 1e-6, `${dist}`);
      assert.ok(Math.abs(int1.p[0]! - cx) < 1e-6 || Math.abs(int1.p[1]! - cy) < 1e-6, 'nu stă pe o latură a colțului');
    } else assert.ok(dist < 1e-6, `${dist}`);
  }
});

test('golul cusăturii: bucla se oprește cu `golCusatura` înaintea începutului ei (0 = se închide)', () => {
  for (const gol of [0.1, 0]) {
    const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], cu({ golCusatura: gol, stergere: false }), { data: DATA });
    const l = linii(r.gcode!.text);
    const z = l.indexOf(';Z:1.6'), d = l.indexOf('G1 E.8 F2400', z);
    const start = l.slice(z, d).reverse().find((x) => /^G1 X\S+ Y\S+/.test(x))!;
    let k = d + 1;
    while (/^G1 X\S+ Y\S+ E/.test(l[k + 1] ?? '')) k++;
    const dist = Math.hypot(v(l[k]!, 'X')! - v(start, 'X')!, v(l[k]!, 'Y')! - v(start, 'Y')!);
    assert.ok(Math.abs(dist - gol) < 2e-3, `${gol}: ${dist}`);
  }
});

test('ștergerea la retragere (ca `Wipe` din OrcaSlicer): 70 % înainte, apoi 2 mm pe ultimul drum cu restul, la viteza ultimei extrudări', () => {
  const doua = [piesa([conturDreptunghi(70, 100, 15, 15)], 1, 'A', 0), piesa([conturDreptunghi(135, 100, 15, 15)], 1, 'B', 1)];
  const r = feliaza(doua, cu(), { data: DATA });
  const totiStergerile = (text: string, dupaRol = true): { verificate: number; lungi: number; mici: number } => {
  const l = linii(text);
  let verificate = 0, lungi = 0, mici = 0;
  for (let i = 0; i < l.length; i++) {
    if (l[i] !== ';WIPE_START') continue;
    // Înainte: retragerea „înainte”; după: viteza (F-ul ultimei extrudări, cel puțin 10 mm/s), apoi bucățile cu E negativ.
    const inainte = -v(l[i - 1]!, 'E')!;
    assert.match(l[i - 1]!, /^G1 E-\S+ F2400$/);
    const ultima = l.slice(0, i - 1).reverse().find((x) => /^G1 X\S+ Y\S+ E\d/.test(x) || /^G1 X\S+ Y\S+ E\./.test(x))!;
    const fUltim = [...l.slice(0, i - 1)].reverse().find((x) => /^G1 .*F\d+/.test(x) && / E[^-]/.test(x) || /^G1 F\d+$/.test(x))!;
    const vw = v(l[i + 1]!, 'F')! / 60;
    assert.ok(vw >= 10);
    assert.equal(dupaRol ? v(fUltim, 'F') : 24000, v(l[i + 1]!, 'F'), 'viteza ștergerii nu e a ultimei extrudări (sau 80 % din deplasare)');
    let lung = 0, inTimp = 0, x = v(ultima, 'X')!, y = v(ultima, 'Y')!, j = i + 2;
    for (; l[j] !== ';WIPE_END'; j++) {
      const nx = v(l[j]!, 'X')!, ny = v(l[j]!, 'Y')!;
      lung += Math.hypot(nx - x, ny - y); x = nx; y = ny;
      inTimp += -(v(l[j]!, 'E') ?? 0);
    }
    const dupa = l[j + 1]!.startsWith('G1 E-') ? -v(l[j + 1]!, 'E')! : 0;
    // Cel mult 2 mm de drum (mai puțin, dacă ultima cale e mai scurtă); cât se retrage pe el: viteza retragerii · drumul /
    // viteza ștergerii, cel mult cât a rămas după 70 %.
    assert.ok(lung > 0 && lung < 2 + 2e-3, `drum ${lung}`);
    if (lung > 1.999) lungi++;
    if (maximCalc(lung, vw) < 0.24 - 1e-6) mici++;
    const maxim = (40 * lung) / vw, rest = 0.8 * 0.3;
    const asteptat = Math.min(rest, maxim);
    // Din fișier, cu coordonatele la 3 zecimale și F întreg: 1 % toleranță; suma, la rotunjirea lui E (5 zecimale).
    assert.ok(Math.abs(inTimp - asteptat) <= 0.01 * asteptat + 1e-5, `${inTimp} față de ${asteptat}`);
    assert.ok(Math.abs(inainte + inTimp + dupa - 0.8) < 1e-4, `${inainte} + ${inTimp} + ${dupa}`);
    verificate++;
  }
  return { verificate, lungi, mici };
  };
  const a = totiStergerile(r.gcode!.text);
  assert.ok(a.verificate >= 2 && a.lungi >= 1, JSON.stringify(a));
  // Fișierul tot trece verificarea de la 3.6h.
  assert.equal(analizeazaText(r.gcode!.text, patPentru('K1C')).iesire, null);
  // Fără viteza după rol: 80 % din viteza deplasării (400 mm/s); fără ștergere: retragerea întreagă, dintr-o dată.
  const fixaText = feliaza(doua, cu({ stergereDupaRol: false }), { data: DATA }).gcode!.text, fixa = linii(fixaText);
  assert.ok(fixa.some((x, i) => x === 'G1 F24000' && fixa[i - 1] === ';WIPE_START'));
  // La 400 mm/s, 2 mm de drum retrag doar 40 · 2 / 400 = 0,2 mm: restul (0,04) se face înainte.
  const b = totiStergerile(fixaText, false);
  assert.ok(b.verificate >= 2 && b.mici >= 1, JSON.stringify(b));
  const fara = feliaza(doua, cu({ stergere: false }), { data: DATA }).gcode!.text;
  assert.ok(!fara.includes(';WIPE_START') && fara.includes('\nG1 E-.8 F2400\n'));
});

test('ștergerea merge pe ultimul drum: după o buclă, peste începutul ei; după o linie, înapoi pe ea', () => {
  // Un inel de 0,9 mm cu un singur perete (fără loc de umplere), apoi o placă: după inel, ultima cale e o buclă.
  const inel = piesa([conturCerc(80, 110, 5), conturCerc(80, 110, 4.1)], 0.2, 'Inel', 0);
  const ri = feliaza([inel, piesa([conturDreptunghi(120, 100, 20, 20)], 0.2, 'Placă', 1)], cu({ pereti: 1 }), { data: DATA });
  const li = linii(ri.gcode!.text);
  const iw = li.indexOf(';WIPE_START');
  const rulaj: [number, number][] = [];
  let qx = 0, qy = 0;
  for (const x of li.slice(0, iw)) {
    if (!x.startsWith('G1 ') || v(x, 'X') === null) { if (/^G1 E[\d.]/.test(x)) rulaj.length = 0; continue; }
    const p: [number, number] = [v(x, 'X')!, v(x, 'Y')!];
    if (/ E[\d.]/.test(x)) { if (rulaj.length === 0) rulaj.push([qx, qy]); rulaj.push(p); } else rulaj.length = 0;
    [qx, qy] = p;
  }
  // Bucla se închide (capătul, la golul cusăturii de început); ștergerea pleacă spre al doilea ei punct.
  assert.ok(Math.hypot(rulaj[0]![0] - rulaj[rulaj.length - 1]![0], rulaj[0]![1] - rulaj[rulaj.length - 1]![1]) < 0.1, 'ultima cale nu e o buclă');
  assert.deepEqual([v(li[iw + 2]!, 'X'), v(li[iw + 2]!, 'Y')], rulaj[1]);
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)], 0.4)], cu({ stergere: true }), { data: DATA });
  const l = linii(r.gcode!.text);
  // Ultima ștergere, la sfârșitul fișierului: după ultima extrudare a stratului 2 (o linie a plinului de sus).
  const i = l.lastIndexOf(';WIPE_START');
  const pct = (x: string): [number, number] => [v(x, 'X')!, v(x, 'Y')!];
  let px = 0, py = 0, ax = 0, ay = 0, bx = 0, by = 0;
  for (const x of l.slice(0, i)) {
    if (!x.startsWith('G1 ') || v(x, 'X') === null) continue;
    if (/ E[\d.]/.test(x)) { [ax, ay] = [px, py]; [bx, by] = pct(x); }
    [px, py] = pct(x);
  }
  const [wx, wy] = pct(l[i + 2]!);
  // Primul punct al ștergerii stă pe ultima bucată extrudată (de la capăt spre începutul ei).
  const cross = (bx - ax) * (wy - ay) - (by - ay) * (wx - ax);
  assert.ok(Math.abs(cross) / Math.hypot(bx - ax, by - ay) < 1e-3, 'ștergerea nu e pe ultima linie');
});

test('călcarea: pe fața de sus (sau pe toate straturile pline), cu debitul, viteza și marginea ei, pe direcția de sus + 90°', () => {
  const placa = [conturDreptunghi(100, 100, 20, 20)];
  const r = feliaza([piesa(placa)], cu({ calcare: 'sus' }), { data: DATA });
  const sus = r.cai(15).filter((c) => c.rol === 'calcare');
  assert.ok(sus.length > 0);
  assert.equal(r.cai(14).filter((c) => c.rol === 'calcare').length, 0);
  // Marginea: jumătate de duză (0,2 mm) de contur.
  for (const c of sus) for (let i = 0; i < c.p.length; i += 2) assert.ok(c.p[i]! >= 100.2 - 1e-6 && c.p[i]! <= 119.8 + 1e-6 && c.p[i + 1]! >= 100.2 - 1e-6 && c.p[i + 1]! <= 119.8 + 1e-6);
  // Direcția: ultimul strat (al 15-lea) are plinul la 45°, deci călcarea la 135°; liniile, la 0,15 mm.
  const dir = new Set(sus.flatMap((c) => { const r2: number[] = []; for (let i = 2; i < c.p.length; i += 2) { const L = Math.hypot(c.p[i]! - c.p[i - 2]!, c.p[i + 1]! - c.p[i - 1]!); if (L > 1) r2.push(Math.round(((Math.atan2(c.p[i + 1]! - c.p[i - 1]!, c.p[i]! - c.p[i - 2]!) * 180) / Math.PI + 360) % 180)); } return r2; }));
  assert.deepEqual([...dir], [135]);
  // În fișier: după fața de sus, la 30 mm/s (F1800), cu E pe mm = strat · 10 % · pas / aria filamentului · debit.
  const l = linii(r.gcode!.text), z = l.indexOf(';Z:3');
  const k = (0.2 * 0.1 * 0.15 * 0.98) / ARIE_FILAMENT;
  let x0 = 0, y0 = 0, fc = 0, gasit = 0;
  for (const x of l.slice(z)) {
    if (!x.startsWith('G1 ')) continue;
    const nx = v(x, 'X') ?? x0, ny = v(x, 'Y') ?? y0, e = v(x, 'E');
    fc = v(x, 'F') ?? fc;
    if (e !== null && e > 0 && v(x, 'X') !== null) { const L = Math.hypot(nx - x0, ny - y0); if (L > 2 && Math.abs(e / L - k) < 2e-6 && fc === 1800) gasit++; }
    x0 = nx; y0 = ny;
  }
  assert.ok(gasit > 10, `${gasit} linii cu E pe mm ${k}`);
  // Toate straturile pline: și primul, și plinul de jos și de sus; nu cele rare.
  const p = feliaza([piesa(placa)], cu({ calcare: 'plin' }), { data: DATA });
  assert.deepEqual([1, 2, 8, 14, 15].map((n) => p.cai(n).some((c) => c.rol === 'calcare')), [true, true, false, true, true]);
  // Concentric: bucle închise, la 0,15 mm una de alta.
  const c = feliaza([piesa(placa)], cu({ calcare: 'sus', modelCalcare: 'concentric' }), { data: DATA }).cai(15).filter((x) => x.rol === 'calcare');
  assert.ok(c.length > 10 && c.every((x) => x.inchisa));
  const minx = c.map((x) => Math.min(...Array.from(x.p).filter((_, i) => i % 2 === 0))).sort((a, b) => a - b);
  assert.ok(Math.abs(minx[1]! - minx[0]! - 0.15) < 1e-6 && Math.abs(minx[0]! - 100.2) < 1e-6, JSON.stringify(minx.slice(0, 3)));
  // 0,12: călcarea la 100 mm/s, pe direcția de sus (unghiul 0).
  const f = setariImplicite('pla', '0.12');
  assert.deepEqual([f.vCalcare, f.unghiCalcare, setariImplicite('pla', '0.08').debitCalcare], [100, 0, 0.08]);
});

test('fusta: buclele la distanța lor, cea mai depărtată întâi, prima la −135°; pe primul strat (sau pe toate, cu scutul); lungimea minimă; câte una pe piesă', () => {
  const placa = [conturDreptunghi(100, 100, 20, 20)];
  const sp = pas(0.5, 0.2);
  const r = feliaza([piesa(placa)], cu({ fusta: 2 }), { data: DATA });
  const f = r.cai(1).filter((c) => c.rol === 'fusta');
  assert.equal(f.length, 2);
  // Pe latura dreaptă (dreaptă, nu rotunjită): bucla dinăuntru la 2 + sp/2, cea de afară la 2 + 1,5 · sp.
  const maxX = (c: Cale): number => Math.max(...Array.from(c.p).filter((_, i) => i % 2 === 0));
  assert.ok(Math.abs(maxX(f[0]!) - 120 - (2 + 1.5 * sp)) < 1e-6 && Math.abs(maxX(f[1]!) - 120 - (2 + 0.5 * sp)) < 1e-6, `${maxX(f[0]!)} ${maxX(f[1]!)}`);
  // Prima pornește la −135° față de centrul piesei (110, 110): în colțul din față-stânga.
  const u = (Math.atan2(f[0]!.p[1]! - 110, f[0]!.p[0]! - 110) * 180) / Math.PI;
  assert.ok(Math.abs(u + 135) < 2, `${u}`);
  assert.equal(r.cai(2).filter((c) => c.rol === 'fusta').length, 0);
  // În fișier, fusta vine prima pe stratul 1 (înaintea piesei).
  const l = linii(r.gcode!.text), z1 = l.indexOf(';Z:0.2');
  const prima = l.slice(z1).find((x) => /^G1 X\S+ Y\S+ E[\d.]/.test(x))!;
  assert.ok(v(prima, 'X')! < 99 || v(prima, 'Y')! < 99, prima);
  // Scutul: pe toate straturile; după primul, cu o singură buclă (cea dinăuntru).
  const s = feliaza([piesa(placa)], cu({ fusta: 3, scut: true, oBuclaDupa: true }), { data: DATA });
  assert.deepEqual([1, 2, 15].map((n) => s.cai(n).filter((c) => c.rol === 'fusta').length), [3, 1, 1]);
  assert.ok(Math.abs(maxX(s.cai(15).find((c) => c.rol === 'fusta')!) - 120 - (2 + 0.5 * sp)) < 1e-6);
  const ls = linii(s.gcode!.text), z15 = ls.indexOf(';Z:3'), ob = ls.findIndex((x, j) => j > z15 && x.startsWith('EXCLUDE_OBJECT_START'));
  const xs15 = ls.slice(z15, ob).filter((x) => /^G1 X\S+ Y\S+ E[\d.]/.test(x)).map((x) => v(x, 'X')!);
  assert.ok(xs15.length > 4 && Math.abs(Math.max(...xs15) - 120 - (2 + 0.5 * sp)) < 2e-3, `${Math.max(...xs15)}`);
  // Lungimea minimă: buclele se adaugă până când filamentul ajunge la ea.
  const e = (0.2 * (0.5 - 0.2 * (1 - Math.PI / 4)) / ARIE_FILAMENT) * 0.98;
  const m = feliaza([piesa(placa)], cu({ fusta: 1, lungimeMinimaFusta: 30 }), { data: DATA }).cai(1).filter((c) => c.rol === 'fusta');
  const fil = m.map((c) => { let L = 0; for (let i = 2; i < c.p.length; i += 2) L += Math.hypot(c.p[i]! - c.p[i - 2]!, c.p[i + 1]! - c.p[i - 1]!); return (L + Math.hypot(c.p[0]! - c.p[c.p.length - 2]!, c.p[1]! - c.p[c.p.length - 1]!)) * e; });
  const total = fil.reduce((a, b) => a + b, 0);
  assert.ok(m.length > 1 && total >= 30 && total - fil[0]! < 30, `${m.length} bucle, ${total} mm`);
  // Câte una pe piesă: două piese depărtate, două fuste; combinată, una.
  const doua = [piesa(placa, 3, 'A', 0), piesa([conturDreptunghi(150, 100, 20, 20)], 3, 'B', 1)];
  assert.equal(feliaza(doua, cu({ fusta: 1, tipFusta: 'piesa' }), { data: DATA }).cai(1).filter((c) => c.rol === 'fusta').length, 2);
  assert.equal(feliaza(doua, cu({ fusta: 1 }), { data: DATA }).cai(1).filter((c) => c.rol === 'fusta').length, 1);
  // Fusta intră în verificarea patului.
  assert.ok(feliaza([piesa([conturDreptunghi(6, 6, 208, 208)])], cu(), { data: DATA }).gcode);
  const mare = feliaza([piesa([conturDreptunghi(6, 6, 208, 208)])], cu({ fusta: 1 }), { data: DATA });
  assert.equal(mare.gcode, null);
  assert.ok(mare.avertismente.some((a) => a.fel === 'iese'));
});

test('fiecare model (rar, de sus, de jos, plinul) și fiecare cusătură: fișierul trece verificarea 3.6h, doar cu comenzile OrcaSlicer', () => {
  const placa = [conturDreptunghi(90, 95, 40, 30, 2), conturCerc(102, 110, 5)];
  const permise = new Set(['G1', 'G90', 'G21', 'G92', 'M83', 'M104', 'M109', 'M140', 'M106', 'M204', 'T0', 'START_PRINT', 'END_PRINT',
    'SET_VELOCITY_LIMIT', 'EXCLUDE_OBJECT_DEFINE', 'EXCLUDE_OBJECT_START', 'EXCLUDE_OBJECT_END']);
  const variante: Partial<Record<keyof SetariFeliere, unknown>>[] = [
    ...MODELE_RAR.map((m) => ({ modelRar: m })),
    ...MODELE_PLIN.map((m) => ({ modelSus: m, modelJos: m, modelPlin: m })),
    ...(['aligned', 'aligned_back', 'back', 'nearest', 'random'] as const).map((c) => ({ cusatura: c })),
    { calcare: 'plin', modelCalcare: 'concentric' }, { fusta: 2, scut: true, brim: 'da' },
  ];
  for (const x of variante) {
    const r = feliaza([piesa(placa, 2)], cu(x), { data: DATA });
    assert.ok(r.gcode, JSON.stringify(x));
    assert.equal(analizeazaText(r.gcode.text, patPentru('K1C')).iesire, null, JSON.stringify(x));
    for (const l of linii(r.gcode.text)) if (l !== '' && !l.startsWith(';')) assert.ok(permise.has(l.split(' ')[0]!), `${JSON.stringify(x)}: ${l}`);
  }
});

test('subsolul (CONFIG_BLOCK): modelele, cusătura, ștergerea, călcarea și fusta, cu numele OrcaSlicer', () => {
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], cu({ modelRar: 'gyroid', calcare: 'ultima', fusta: 2, tipFusta: 'piesa', scut: true }), { data: DATA });
  const t = r.gcode!.text;
  for (const x of ['; sparse_infill_pattern = gyroid', '; top_surface_pattern = monotonicline', '; bottom_surface_pattern = monotonic',
    '; internal_solid_infill_pattern = monotonic', '; seam_position = aligned', '; staggered_inner_seams = 1', '; seam_gap = 0.04', '; wipe = 1',
    '; wipe_distance = 2', '; retract_before_wipe = 70%', '; ironing_type = topmost', '; ironing_flow = 10%', '; skirt_loops = 2',
    '; skirt_type = perobject', '; draft_shield = enabled', '; skirt_start_angle = -135']) assert.ok(t.includes(`\n${x}\n`), x);
});

test('setările citite: alegerile necunoscute și bifele greșite se înlocuiesc cu implicitele; numerele, în limite', () => {
  const s = setariValide({ modelRar: 'lightning', modelSus: 'hilbertcurve', cusatura: 'x', calcare: 'top', stergere: 'da', scut: true, fusta: 3.6, unghiFusta: 500, pasCalcare: 0 });
  assert.deepEqual([s.modelRar, s.modelSus, s.cusatura, s.calcare, s.stergere, s.scut, s.fusta, s.unghiFusta, s.pasCalcare],
    ['grid', 'hilbertcurve', 'aligned', 'nu', true, true, 4, 180, 0.05]);
});

test('tăierea unei polilinii de o regiune cu gol: bucățile dinăuntru, cu capetele pe margini', () => {
  const ext = Float64Array.from([0, 0, 10, 0, 10, 10, 0, 10]), gol = Float64Array.from([4, 4, 6, 4, 6, 6, 4, 6]);
  const b = taiePolilinie([-1, 5, 11, 5], [ext, gol]);
  assert.deepEqual(b.map((q) => q.map((x) => Math.round(x * 1e9) / 1e9)), [[0, 5, 4, 5], [6, 5, 10, 5]]);
  // O linie care doar atinge un colț nu dă nicio bucată de lungime zero.
  assert.deepEqual(taiePolilinie([-1, 11, 1, 9], [ext]).map((q) => q.length), [4]);
  assert.deepEqual(taiePolilinie([-1, -1, -0.5, -0.5], [ext]), []);
});
