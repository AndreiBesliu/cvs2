/**
 * Felierea pieselor plate (ADR 0191, felia 3.6j), probele de după recenzia cu agenți (07.11.2026): fiecare constatare
 * confirmată are aici proba ei. Patul (brim-ul, Z-ul real, ridicarea), brim-ul comun, primul strat fără trăsături pierdute,
 * grila rară fără legături, umplerea fiecărei insule, unirea fără dependență de ordine, ventilatorul pe straturile lungi,
 * temperaturile din „Simplu”, schimbarea materialului și a calității, tabelele legate de profilele OrcaSlicer (fixtura), starea
 * retragerii și Z-ul în tot fișierul, accelerațiile, debitul pe rol, grila, încetinirea, obiectele, piesele de înălțimi
 * diferite, selecția, rezoluția arcelor, filamentul pe hârtie.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { conturCerc, conturDreptunghi, type Contur } from '../../src/geom/conturBaza.ts';
import { cuCalitate, cuMaterial, cuTemperatura } from '../../src/cam/feliere/campuri.ts';
import { feliaza, numeFisier, setariImplicite } from '../../src/cam/feliere/index.ts';
import { iesePeste } from '../../src/cam/feliere/gcode.ts';
import { numeObiect, pieseDinDocument, unesteSuprapuse } from '../../src/cam/feliere/piese.ts';
import { ARIE_FILAMENT, CALITATI, MATERIALE, sectiune, setariValide } from '../../src/cam/feliere/profil.ts';
import { arie, puncte } from '../../src/cam/feliere/straturi.ts';
import { documentNou, type Document } from '../../src/model/document.ts';

const DATA = '2026-11-07 at 22:00:00';
const piesa = (contururi: Contur[], inaltime = 3, eticheta = 'Placă', k = 0) => ({ id: `i${k}`, nume: numeObiect(eticheta, k), eticheta, contururi, inaltime });
const linii = (t: string): string[] => t.split('\n');
const poligon = (pts: number[][]): Contur => ({ inchis: true, varfuri: pts.map(([x, y]) => ({ p: { x: x!, y: y! }, s: { tip: 'L' as const } })) });
const arieContur = (c: Contur): number => Math.abs(arie(puncte(c)));
const inDreptunghi = (x: number, y: number, x0: number, y0: number, x1: number, y1: number): boolean => x > x0 + 1e-6 && x < x1 - 1e-6 && y > y0 + 1e-6 && y < y1 - 1e-6;

test('patul: brim-ul lat sau cu gol mare iese din pat, deci nu se face fișierul (avertismentul spune cât iese)', () => {
  const ingust = [conturDreptunghi(5, 106, 210, 8)];
  const r = feliaza([piesa(ingust)], setariValide({ ...setariImplicite(), latimeBrim: 15 }), { data: DATA });
  assert.equal(r.gcode, null);
  const a = r.avertismente.find((x) => x.fel === 'iese');
  assert.ok(a && a.fel === 'iese' && a.x0 < 0, JSON.stringify(r.avertismente));
  // Fără brim, aceeași piesă încape exact în marginea de 5 mm.
  assert.ok(feliaza([piesa(ingust)], setariValide({ ...setariImplicite(), brim: 'nu' }), { data: DATA }).gcode);
});

test('patul pe Z: 250 mm la 0,24 iese 250,04 (refuzat); ridicarea nu trece niciodată de 250', () => {
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)], 250)], setariImplicite('pla', '0.24'), { data: DATA });
  assert.equal(r.gcode, null);
  const a = r.avertismente.find((x) => x.fel === 'prea-inalta');
  assert.ok(a && a.fel === 'prea-inalta' && Math.abs(a.z - 250.04) < 1e-6);
  const s = setariValide({ ...setariImplicite(), ridicare: 2, brim: 'nu' });
  const sus = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)], 249.6)], s, { data: DATA });
  assert.ok(sus.gcode);
  const z = linii(sus.gcode.text).filter((l) => /^G1 Z/.test(l)).map((l) => Number(/Z(-?[\d.]+)/.exec(l)![1]));
  assert.ok(Math.max(...z) <= 250 + 1e-9, `Z maxim ${Math.max(...z)}`);
});

test('brim-ul comun: două piese apropiate, niciun punct de brim în piesa vecină; o singură buclă le ocolește pe amândouă', () => {
  const a = [conturDreptunghi(100, 100, 8, 20)], b = [conturDreptunghi(111, 100, 8, 20)];
  const r = feliaza([piesa(a, 3, 'A', 0), piesa(b, 3, 'B', 1)], setariImplicite(), { data: DATA });
  const brim = r.cai(1).filter((c) => c.rol === 'brim');
  assert.ok(brim.length > 0);
  for (const c of brim) {
    for (let i = 0; i < c.p.length; i += 2) {
      const x = c.p[i]!, y = c.p[i + 1]!;
      assert.ok(!inDreptunghi(x, y, 100, 100, 108, 120) && !inDreptunghi(x, y, 111, 100, 119, 120), `brim în piesă la ${x}, ${y}`);
    }
  }
  // Bucla cea mai depărtată (prima) le cuprinde pe amândouă: brim-urile apropiate se unesc, nu se suprapun.
  const prima = brim[0]!;
  const xs = Array.from({ length: prima.p.length / 2 }, (_, i) => prima.p[2 * i]!);
  assert.ok(Math.min(...xs) < 100 && Math.max(...xs) > 119);
  // Între buclele alăturate ale aceluiași grup, fără retragere: doar la începutul brim-ului și între grupuri (comun, A, B).
  const l = linii(r.gcode!.text);
  const z1 = l.indexOf(';Z:0.2'), obiect = l.findIndex((x, j) => j > z1 && x.startsWith('EXCLUDE_OBJECT_START'));
  assert.ok(l.slice(z1, obiect).filter((x) => x === 'G1 E-.8 F2400').length <= 3);
});

test('primul strat nu pierde trăsăturile pe care le au straturile de deasupra (un pieptene cu dinți de 0,7 mm)', () => {
  const dinti = [conturDreptunghi(100, 100, 20, 5)];
  for (let k = 0; k < 7; k++) dinti.push(conturDreptunghi(101 + k * 2.6, 104, 0.7, 10));
  const u = unesteSuprapuse(dinti);
  assert.ok(u.ok);
  const r = feliaza([piesa(u.contururi)], setariImplicite(), { data: DATA });
  assert.ok(r.gcode);
  const inDinte = (c: { p: Float64Array }): boolean => {
    for (let i = 0; i < c.p.length; i += 2) if (c.p[i + 1]! > 109.5) return true;
    return false;
  };
  assert.ok(r.cai(1).some(inDinte), 'primul strat, fără dinți');
  assert.ok(r.cai(2).some(inDinte));
});

test('grila rară nu se leagă niciodată, nici când capetele liniilor cad pe aceeași poziție (o piesă cu gol)', () => {
  const r = feliaza([piesa([conturDreptunghi(90, 90, 40, 40), conturDreptunghi(104, 104, 12, 12)])], setariImplicite(), { data: DATA });
  const rare = r.cai(8).filter((c) => c.rol === 'rar');
  assert.ok(rare.length > 4 && rare.every((c) => c.p.length === 4));
  // Nicio bucată a umplerii (capete și mijloace) în gol.
  for (const c of r.cai(8).filter((x) => x.rol === 'rar' || x.rol === 'plin')) {
    for (let i = 0; i + 3 < c.p.length; i += 2) {
      const mx = (c.p[i]! + c.p[i + 2]!) / 2, my = (c.p[i + 1]! + c.p[i + 3]!) / 2;
      assert.ok(!inDreptunghi(mx, my, 104, 104, 116, 116) && !inDreptunghi(c.p[i]!, c.p[i + 1]!, 104, 104, 116, 116));
    }
  }
});

test('umplerea fiecărei insule, de la adâncimea ei: o fâșie de 1,2 mm lângă un pătrat are umplerea ei', () => {
  const r = feliaza([piesa([conturDreptunghi(90, 100, 20, 20), conturDreptunghi(120, 100, 1.2, 20)])], setariImplicite(), { data: DATA });
  for (const k of [2, 8, 15]) {
    const inFasie = r.cai(k).filter((c) => c.rol !== 'exterior' && c.rol !== 'interior' && c.p[0]! > 119.9);
    assert.ok(inFasie.length > 0, `stratul ${k}: fâșia fără umplere`);
  }
});

test('un singur perete și suprapunerea cea mai mare: umplerea rămâne (regiunea lărgită peste perete e tot a insulei)', () => {
  const s = setariValide({ ...setariImplicite(), pereti: 1, suprapunerePlin: 0.5, suprapunereRar: 0.5, wPlin: 0.45 });
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], s, { data: DATA });
  assert.ok(r.cai(2).some((c) => c.rol === 'plin'));
  assert.ok(r.cai(8).some((c) => c.rol === 'rar'));
});

test('unirea nu depinde de ordine: fundalul desenat după chenar îl umple; latura comună nu refuză; golul acoperit dispare; forma dintr-un gol rămâne insulă', () => {
  const l1 = poligon([[0, 0], [60, 0], [60, 4], [4, 4], [4, 40], [0, 40]]);
  const l2 = poligon([[60, 40], [0, 40], [0, 36], [56, 36], [56, 0], [60, 0]]);
  const fundal = conturDreptunghi(2, 2, 56, 36);
  for (const ordine of [[l1, l2, fundal], [fundal, l1, l2], [l2, fundal, l1]]) {
    const u = unesteSuprapuse(ordine);
    assert.ok(u.ok);
    assert.equal(u.contururi.length, 1);
    assert.ok(Math.abs(arieContur(u.contururi[0]!) - 2400) < 1e-6);
  }
  const lipite = unesteSuprapuse([conturDreptunghi(100, 100, 10, 10), conturDreptunghi(110, 100, 10, 10)]);
  assert.ok(lipite.ok && lipite.contururi.length === 1 && Math.abs(arieContur(lipite.contururi[0]!) - 200) < 1e-6);
  const c1 = poligon([[0, 0], [6, 0], [6, 2], [2, 2], [2, 8], [6, 8], [6, 10], [0, 10]]);
  const c2 = poligon([[4, 0], [10, 0], [10, 10], [4, 10], [4, 8], [8, 8], [8, 2], [4, 2]]);
  const acoperit = unesteSuprapuse([c1, c2, conturDreptunghi(1, 1, 8, 8)]);
  assert.ok(acoperit.ok);
  assert.deepEqual(acoperit.contururi.map((c) => Math.round(arieContur(c))), [100]);
  const cuInsula = unesteSuprapuse([c1, c2, conturCerc(5, 5, 1)]);
  assert.ok(cuInsula.ok);
  assert.equal(cuInsula.contururi.length, 3);
});

test('ventilatorul: pe straturile mai lungi decât timpul de răcire al materialului (PETG: 30 s), oprit, ca OrcaSlicer', () => {
  const r = feliaza([piesa([conturDreptunghi(70, 70, 80, 80)], 3)], setariImplicite('petg'), { data: DATA });
  assert.ok(r.gcode);
  const l = linii(r.gcode.text);
  // 3 mm la 0,2: 15 straturi; sus 5 pline, deci primul plin de sus e al 11-lea, la Z 2,2: 80 × 80 mm plin, mult peste 30 s.
  // Comanda lui stă între `;Z:2.2` și schimbarea următoare: `M106 S0` de la sfârșit (pus oricum) nu contează.
  const sus = l.indexOf(';Z:2.2');
  assert.ok(sus > 0);
  const vent = l.slice(sus, l.indexOf(';LAYER_CHANGE', sus)).filter((x) => /^M106 S\d+$/.test(x));
  assert.deepEqual(vent, ['M106 S0'], 'ventilatorul nu se oprește pe straturile lungi');
  // Straturile rare dinainte sunt scurte: ventilatorul pornit, între minimul și maximul PETG (40 … 90 %).
  const rar = l.slice(l.indexOf(';Z:0.8'), sus).filter((x) => /^M106 S\d+$/.test(x)).map((x) => Number(x.slice(6)));
  assert.ok(rar.length > 0 && rar.every((v) => v >= Math.floor(2.555 * 40) && v <= Math.floor(2.555 * 90)), String(rar));
});

test('„Simplu”: duza și patul schimbă și primul strat (cu diferența profilului); materialul și calitatea își aduc valorile, restul rămâne', () => {
  const pla = cuTemperatura(setariImplicite('pla'), 'duza', 240);
  assert.deepEqual([pla.duza, pla.duza1], [240, 240]);
  const pc = cuTemperatura(cuTemperatura(setariImplicite('pc'), 'duza', 285), 'pat', 100);
  assert.deepEqual([pc.duza, pc.duza1, pc.pat, pc.pat1], [285, 275, 100, 100]);
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], pla, { data: DATA });
  assert.match(r.gcode!.text, /\nSTART_PRINT EXTRUDER_TEMP=240 BED_TEMP=55\n/);
  const om = setariValide({ ...setariImplicite(), pereti: 4, umplere: 0.3, brim: 'da' });
  const petg = cuMaterial(om, 'petg');
  assert.deepEqual([petg.duza, petg.pat, petg.debit, petg.volumMax, petg.pereti, petg.umplere, petg.brim], [250, 70, 0.95, 9, 4, 0.3, 'da']);
  const fin = cuCalitate(petg, '0.12');
  assert.deepEqual([fin.strat, fin.strat1, fin.pereti, fin.duza, fin.umplere], [0.12, 0.12, 3, 250, 0.3]);
});

test('tabelele, legate de profilele OrcaSlicer K1 (fixtura, cu moștenirile rezolvate)', () => {
  const o = JSON.parse(readFileSync('test/fixtures/imprimanta/orca-k1.json', 'utf8')) as {
    materiale: Record<string, Record<string, string>>; procese: Record<string, Record<string, string>>;
  };
  const nume: Record<string, string> = { 'pla-hs': 'PLA High Speed', 'pla-matte': 'PLA Matte', 'pla-silk': 'PLA Silk', 'pla-cf': 'PLA-CF', 'pa-cf': 'PA-CF' };
  for (const m of MATERIALE) {
    const x = o.materiale[nume[m.id] ?? m.nume]!;
    assert.ok(x, m.id);
    const n = (k: string): number => Number(x[k]);
    assert.deepEqual([m.duza1, m.duza, m.pat1, m.pat, m.ventMin, m.ventMax, m.ventOprit, m.ventSubTimp, m.stratMinim, m.vitezaMinima, m.debit, m.volumMax, m.densitate],
      [n('nozzle_temperature_initial_layer'), n('nozzle_temperature'), n('hot_plate_temp_initial_layer'), n('hot_plate_temp'), n('fan_min_speed'), n('fan_max_speed'),
        n('close_fan_the_first_x_layers'), n('fan_cooling_layer_time'), n('slow_down_layer_time'), n('slow_down_min_speed'), n('filament_flow_ratio'),
        n('filament_max_volumetric_speed'), n('filament_density')], m.id);
    assert.equal(m.ventAux, x['additional_cooling_fan_speed'] === undefined ? 0 : n('additional_cooling_fan_speed'), m.id);
    assert.equal(m.retragere ?? null, x['filament_retraction_length'] === 'nil' ? null : n('filament_retraction_length'), m.id);
  }
  for (const c of CALITATI) {
    const x = Object.entries(o.procese).find(([k]) => k.startsWith(`${c.id.replace(/^0\./, '0.')}mm`))?.[1];
    assert.ok(x, c.id);
    const n = (k: string): number => Number(String(x[k]).replace('%', ''));
    assert.deepEqual([c.strat, c.strat1, c.pereti, c.sus, c.susMinim, c.jos, c.vInterior, c.vRar, c.vPlin, c.vPrimInfill, c.aPereti, c.aImplicit, c.aPrim],
      [n('layer_height'), n('initial_layer_print_height'), n('wall_loops'), n('top_shell_layers'), n('top_shell_thickness'), n('bottom_shell_layers'),
        n('inner_wall_speed'), n('sparse_infill_speed'), n('internal_solid_infill_speed'), n('initial_layer_infill_speed'), n('outer_wall_acceleration'),
        n('default_acceleration'), n('initial_layer_acceleration')], c.id);
  }
});

/** Starea retragerii și Z-ul, urmărite în tot fișierul: nicio extrudare retrasă, fiecare extrudare la Z-ul stratului ei. */
function stare(text: string): { extrudariRetrase: number; extrudariAltZ: number; final: boolean } {
  let retras = false, z = 0, zStrat = 0, retrase = 0, altZ = 0;
  for (const l of linii(text)) {
    const zc = /^;Z:([\d.]+)$/.exec(l);
    if (zc) zStrat = Number(zc[1]);
    if (!l.startsWith('G1 ')) continue;
    const zm = /\bZ(-?[\d.]+)/.exec(l);
    if (zm) z = Number(zm[1]);
    const e = /\bE(-?[\d.]+)/.exec(l);
    const xy = /\b[XY]-?[\d.]+/.test(l);
    if (e && !xy) retras = Number(e[1]) < 0;
    if (e && xy && Number(e[1]) > 0) {
      if (retras) retrase++;
      if (Math.abs(z - zStrat) > 1e-9) altZ++;
    }
  }
  return { extrudariRetrase: retrase, extrudariAltZ: altZ, final: retras };
}

test('în tot fișierul: nicio extrudare cât filamentul e retras, fiecare la Z-ul stratului ei (ridicarea coboară mereu); la sfârșit, retras', () => {
  for (const [m, c] of [['pla', '0.20'], ['petg', '0.08'], ['tpu', '0.24']] as const) {
    const doua = [piesa([conturDreptunghi(80, 100, 15, 15), conturCerc(87.5, 107.5, 3)], 2, 'A', 0), piesa([conturDreptunghi(125, 100, 15, 15)], 1, 'B', 1)];
    const r = feliaza(doua, setariValide({ ...setariImplicite(m, c), brim: 'da' }), { data: DATA });
    assert.ok(r.gcode, `${m} ${c}`);
    assert.deepEqual(stare(r.gcode.text), { extrudariRetrase: 0, extrudariAltZ: 0, final: true }, `${m} ${c}`);
  }
});

test('primul strat de altă înălțime decât celelalte (0,08 mm, primul de 0,2): Z-urile 0,2; 0,28; 0,36', () => {
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)], 1)], setariImplicite('pla', '0.08'), { data: DATA });
  assert.ok(r.gcode);
  assert.equal(r.gcode.straturi, 11);
  const z = linii(r.gcode.text).filter((l) => l.startsWith(';Z:')).map((l) => Number(l.slice(3)));
  assert.deepEqual(z.slice(0, 3), [0.2, 0.28, 0.36]);
  assert.ok(r.gcode.text.includes(';HEIGHT:0.08\n'));
});

test('accelerațiile scrise (PLA 0,20): primul strat 1 000, pereții 3 000, suprafața de sus 2 000, restul 10 000', () => {
  const r = feliaza([piesa([conturDreptunghi(80, 80, 60, 60)], 2)], setariImplicite(), { data: DATA });
  const a = new Set(linii(r.gcode!.text).filter((l) => l.startsWith('SET_VELOCITY_LIMIT')).map((l) => Number(/ACCEL=(\d+)/.exec(l)![1])));
  assert.deepEqual([...a].sort((x, y) => x - y), [1000, 2000, 3000, 10000]);
});

test('debitul pe rol, pe o piesă mare (fără încetinire): exteriorul la 200 mm/s, interiorii și grila la plafonul PLA (221 mm/s)', () => {
  const r = feliaza([piesa([conturDreptunghi(60, 60, 100, 100)], 2)], setariImplicite(), { data: DATA });
  const l = linii(r.gcode!.text);
  const z = l.indexOf(';Z:1'), z2 = l.indexOf(';Z:1.2');
  const f = new Set(l.slice(z, z2).filter((x) => /^G1 X\S+ Y\S+ E\S+ F\d+$/.test(x)).map((x) => Number(/F(\d+)$/.exec(x)![1])));
  assert.deepEqual([...f].sort((x, y) => x - y), [12000, Math.round((18 / sectiune(0.45, 0.2)) * 60)]);
});

test('grila rară: ambele direcții (45° și 135°), cu liniile paralele la 5,4277 mm (2 · pasul 0,45 × 0,2 / 15 %, ca OrcaSlicer)', () => {
  const r = feliaza([piesa([conturDreptunghi(80, 80, 60, 60)], 3)], setariImplicite(), { data: DATA });
  const rare = r.cai(8).filter((c) => c.rol === 'rar');
  const unghiuri = new Set(rare.map((c) => Math.round((Math.atan2(c.p[3]! - c.p[1]!, c.p[2]! - c.p[0]!) * 180) / Math.PI + 360) % 180));
  assert.deepEqual([...unghiuri].sort((a, b) => a - b), [45, 135]);
  const la45 = rare.filter((c) => Math.abs(c.p[3]! - c.p[1]! - (c.p[2]! - c.p[0]!)) < 1e-6).map((c) => (c.p[1]! - c.p[0]!) / Math.SQRT2).sort((a, b) => a - b);
  // `fill_surface_by_multilines`: spacing · 2 / densitate, cu spacing = 0,45 − 0,2 · (1 − π/4) = 0,407080 (nu lățimea liniei).
  const ls = (2 * (0.45 - 0.2 * (1 - Math.PI / 4))) / 0.15;
  assert.ok(Math.abs(ls - 5.427729) < 1e-6);
  for (let i = 1; i < la45.length; i++) assert.ok(Math.abs(la45[i]! - la45[i - 1]! - ls) < 1e-6 || Math.abs(la45[i]! - la45[i - 1]!) < 1e-6, `${la45[i]! - la45[i - 1]!}`);
});

test('încetinirea pentru răcire: un strat scurt ajunge la ~8 s (PLA); unul care nici așa nu ajunge merge cu viteza minimă (20 mm/s)', () => {
  const r = feliaza([piesa([conturDreptunghi(103, 103, 14, 14)], 3)], setariImplicite(), { data: DATA });
  const g = r.gcode!;
  assert.ok(Math.abs((g.timp - g.timpPrim) / 14 - 8) < 0.6, `${(g.timp - g.timpPrim) / 14} s pe strat`);
  const mica = feliaza([piesa([conturDreptunghi(108, 108, 4, 4)], 2)], setariImplicite(), { data: DATA });
  const l = linii(mica.gcode!.text);
  const f = l.slice(l.indexOf(';Z:0.4')).filter((x) => /^G1 X\S+ Y\S+ E\S+ F\d+$/.test(x)).map((x) => Number(/F(\d+)$/.exec(x)![1]));
  assert.ok(f.length > 0 && f.every((x) => x === 1200), JSON.stringify([...new Set(f)]));
});

test('obiectele: nume unice (chiar cu aceeași etichetă), fiecare START cu END-ul lui, pe fiecare strat al piesei; piesele de înălțimi diferite', () => {
  const trei = [0, 1, 2].map((k) => piesa([conturDreptunghi(70 + k * 30, 100, 15, 15)], k === 0 ? 1 : 3, 'Placă', k));
  const r = feliaza(trei, setariImplicite(), { data: DATA });
  const l = linii(r.gcode!.text);
  const nume = l.filter((x) => x.startsWith('EXCLUDE_OBJECT_DEFINE')).map((x) => /NAME=(\S+)/.exec(x)![1]);
  assert.equal(new Set(nume).size, 3);
  let deschis: string | null = null;
  const pe = new Map<string, number>();
  for (const x of l) {
    const s = /^EXCLUDE_OBJECT_START NAME=(\S+)$/.exec(x), e = /^EXCLUDE_OBJECT_END NAME=(\S+)$/.exec(x);
    if (s) { assert.equal(deschis, null); deschis = s[1]!; pe.set(s[1]!, (pe.get(s[1]!) ?? 0) + 1); }
    if (e) { assert.equal(e[1], deschis); deschis = null; }
  }
  assert.equal(deschis, null);
  assert.equal(r.gcode!.straturi, 15);
  assert.deepEqual([pe.get(nume[0]!), pe.get(nume[1]!), pe.get(nume[2]!)], [5, 15, 15]);
  // Ultimul strat al piesei joase (5) e suprafața ei de sus.
  assert.ok(r.cai(5).some((c) => c.rol === 'sus' && c.p[0]! < 90));
});

test('filamentul pe hârtie: un cub plin (umplerea 100 %) de 20 × 20 × 3 mm cere ~1 200 mm³ · 0,98 / 2,405 mm² ≈ 489 mm', () => {
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], setariValide({ ...setariImplicite(), umplere: 1, brim: 'nu' }), { data: DATA });
  const asteptat = (1200 * 0.98) / ARIE_FILAMENT;
  assert.ok(Math.abs(r.gcode!.filamentMm - asteptat) / asteptat < 0.06, `${r.gcode!.filamentMm} față de ${asteptat}`);
});

test('rezoluția arcelor: un cerc de 10 mm, aplatizat cu săgeata cel mult 0,012 mm', () => {
  const p = puncte(conturCerc(0, 0, 10));
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length;
    const mx = (p[i]! + p[j]!) / 2, my = (p[i + 1]! + p[j + 1]!) / 2;
    assert.ok(10 - Math.hypot(mx, my) <= 0.012 + 1e-9);
  }
});

test('deplasările peste un gol al aceleiași piese se fac cu filamentul retras', () => {
  const r = feliaza([piesa([conturDreptunghi(80, 80, 60, 60), conturDreptunghi(95, 95, 30, 30)], 2)], setariImplicite(), { data: DATA });
  const gol = [Float64Array.from([95, 95, 125, 95, 125, 125, 95, 125])];
  let x = 0, y = 0, retras = false, peste = 0;
  for (const l of linii(r.gcode!.text)) {
    if (!l.startsWith('G1 ')) continue;
    const e = /\bE(-?[\d.]+)/.exec(l), xm = /X(-?[\d.]+)/.exec(l), ym = /Y(-?[\d.]+)/.exec(l);
    if (e && !xm && !ym) retras = Number(e[1]) < 0;
    const nx = xm ? Number(xm[1]) : x, ny = ym ? Number(ym[1]) : y;
    if (!e && (xm || ym) && iesePeste(x, y, nx, ny, gol)) { peste++; assert.ok(retras, `deplasare peste gol fără retragere: ${l}`); }
    x = nx; y = ny;
  }
  assert.ok(peste > 0);
});

/** Un document cu două instanțe ale unei piese fără nume. */
function documentDoua(): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  return {
    ...d,
    piese: [{ id: 'p1', operatii: [], radacina: { tip: 'element', id: 'e1', forma: { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 }, matrice: I } }],
    foi: [{ ...d.foi[0]!, instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0 }, { id: 'i2', piesa: 'p1', x: 50, y: 10, rotire: 0 }] }],
  };
}

test('selecția și o singură piesă; eticheta unei piese fără nume e numărul ei pe foaie, în ambele', () => {
  const doc = documentDoua();
  assert.equal(pieseDinDocument(doc, { fel: 'foaie' }, 3, [220, 220]).piese.length, 2);
  const sel = pieseDinDocument(doc, { fel: 'selectie', ids: ['i2'] }, 3, [220, 220]);
  assert.deepEqual(sel.piese.map((p) => [p.id, p.eticheta]), [['i2', '#2']]);
  const una = pieseDinDocument(doc, { fel: 'piesa', id: 'i2' }, 3, [220, 220]);
  assert.deepEqual(una.piese.map((p) => [p.id, p.eticheta]), [['i2', '#2']]);
  assert.equal(numeFisier('Placă de probă', 'PLA', '3m 36s'), 'Placa_de_proba_PLA_3m36s.gcode');
});
