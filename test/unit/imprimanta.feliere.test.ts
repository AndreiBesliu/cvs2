/**
 * Felierea pieselor plate (ADR 0191, felia 3.6j), pe hârtie: debitul și pasul liniilor (modelul OrcaSlicer), straturile și
 * rolurile lor, pereții (cu goluri și insule), umplerea, brim-ul, retragerea, ventilatoarele, plafonul de debit, încetinirea
 * pentru răcire, comenzile (doar ce scrie OrcaSlicer pentru K1C), antetul citit de verificarea de la 3.6h, piesele din
 * document (căile deschise, unirea suprapunerilor, centrarea pe pat) și numele obiectelor.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { conturCerc, conturDreptunghi, type Contur } from '../../src/geom/conturBaza.ts';
import { analizeazaText, patPentru } from '../../src/machine/imprimanta/gcode3d.ts';
import { anvelopa, felStrat, iesePeste, numarStraturi, timpBucata, timpText } from '../../src/cam/feliere/gcode.ts';
import { arie } from '../../src/cam/feliere/straturi.ts';
import { brimAutomat, feliaza, setariImplicite, type Cale } from '../../src/cam/feliere/index.ts';
import { numeObiect, pieseDinDocument, unesteSuprapuse } from '../../src/cam/feliere/piese.ts';
import { ARIE_FILAMENT, pas, sectiune, setariValide } from '../../src/cam/feliere/profil.ts';
import { documentNou, type Document } from '../../src/model/document.ts';

const DATA = '2026-11-07 at 20:00:00';
const piesa = (contururi: Contur[], inaltime = 3, eticheta = 'Placă') => ({ id: 'i1', nume: numeObiect(eticheta, 0), eticheta, contururi, inaltime });
const linii = (t: string): string[] => t.split('\n');
/** Mișcările cu extrudare (E > 0), cu punctul de plecare și F-ul curent. */
function extrudari(t: string): { x0: number; y0: number; x: number; y: number; e: number; f: number; strat: number }[] {
  let x = 0, y = 0, f = 0, strat = 0;
  const rez: { x0: number; y0: number; x: number; y: number; e: number; f: number; strat: number }[] = [];
  for (const l of linii(t)) {
    if (l === ';LAYER_CHANGE') strat++;
    if (!l.startsWith('G1 ')) continue;
    const v = (k: string): number | null => { const m = new RegExp(`\\b${k}(-?[\\d.]+)`).exec(l); return m ? Number(m[1]) : null; };
    const nx = v('X') ?? x, ny = v('Y') ?? y, e = v('E'), nf = v('F');
    if (nf !== null) f = nf;
    if (e !== null && e > 0 && (v('X') !== null || v('Y') !== null)) rez.push({ x0: x, y0: y, x: nx, y: ny, e, f, strat });
    x = nx; y = ny;
  }
  return rez;
}

test('debitul pe hârtie (modelul OrcaSlicer): secțiunea, pasul, E pe mm', () => {
  assert.ok(Math.abs(sectiune(0.42, 0.2) - 0.075416) < 1e-6);
  assert.ok(Math.abs(ARIE_FILAMENT - 2.405282) < 1e-6);
  assert.ok(Math.abs((sectiune(0.42, 0.2) / ARIE_FILAMENT) * 0.98 - 0.030727) < 1e-6);
  assert.ok(Math.abs((sectiune(0.5, 0.2) / ARIE_FILAMENT) * 0.98 - 0.037247) < 1e-6);
  assert.ok(Math.abs(pas(0.42, 0.2) - 0.377080) < 1e-6);
  // Plafonul PLA (18 mm³/s) pe umplerea rară de 0,45 × 0,2: 221 mm/s.
  assert.equal(Math.floor(18 / sectiune(0.45, 0.2)), 221);
});

test('straturile: câte, pe ce înălțime, cu ce rol (jos 3, sus 5 sau 0,8 mm, între ele umplerea rară)', () => {
  const s = setariImplicite('pla', '0.20');
  assert.equal(numarStraturi(3, s), 15);
  assert.equal(numarStraturi(0.2, s), 1);
  assert.equal(numarStraturi(20, setariImplicite('pla', '0.12')), 167);
  const f = Array.from({ length: 15 }, (_, i) => felStrat(i + 1, 15, s));
  assert.deepEqual(f, ['prim', 'plin135', 'plin45', 'rar', 'rar', 'rar', 'rar', 'rar', 'rar', 'rar', 'plin45', 'plin135', 'plin45', 'plin135', 'sus45']);
  // 0,08 mm: sus cel puțin 0,8 mm = 10 straturi (peste cele 9 ale profilului).
  const fin = setariImplicite('pla', '0.08');
  assert.equal(felStrat(40 - 9, 40, fin), 'plin45');
  assert.equal(felStrat(40 - 10, 40, fin), 'rar');
  // Umplerea 100 %: totul plin.
  assert.equal(felStrat(8, 15, setariValide({ ...s, umplere: 1 })), 'plin135');
});

test('o placă de 20 × 20 × 3 mm: 15 straturi, totul în piesă, E pe mm pe valorile de pe hârtie, antetul citit de verificarea 3.6h', () => {
  const s = setariImplicite('pla', '0.20');
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], s, { data: DATA });
  assert.ok(r.gcode);
  assert.equal(r.gcode.straturi, 15);
  assert.deepEqual(r.avertismente, []);
  const ex = extrudari(r.gcode.text);
  assert.ok(ex.length > 100);
  for (const m of ex) assert.ok(m.x >= 100 && m.x <= 120 && m.y >= 100 && m.y <= 120, `extrudare în afara piesei: ${m.x}, ${m.y}`);
  const kNormal = new Set([0.030727, 0.033172, 0.037247]);
  for (const m of ex) {
    const L = Math.hypot(m.x - m.x0, m.y - m.y0);
    if (L < 3) continue;
    const k = m.e / L;
    assert.ok([...kNormal].some((x) => Math.abs(x - k) < 2e-5), `E pe mm neașteptat: ${k} (L ${L})`);
  }
  // Primul strat: lățimea 0,5 (E/mm 0,037247), 60 mm/s.
  assert.ok(ex.filter((m) => m.strat === 1).every((m) => m.f === 3600));
  const a = analizeazaText(r.gcode.text, patPentru('K1C'));
  assert.equal(a.imprimanta, 'Creality K1C');
  assert.equal(a.duza, 0.4);
  assert.equal(a.material, 'PLA');
  assert.equal(a.tDuza, 220);
  assert.equal(a.tPat, 55);
  assert.equal(a.iesire, null);
  assert.ok(a.timp !== null && Math.abs(a.timp - Math.round(r.gcode.timp)) <= 1);
  assert.match(r.gcode.text, /^; HEADER_BLOCK_START\n; generated by CNC Vector Studio 2 on 2026-11-07 at 20:00:00\n; total layer number: 15\n/);
  assert.equal(linii(r.gcode.text).filter((l) => l === ';LAYER_CHANGE').length, 15);
  assert.ok(r.gcode.text.includes(';Z:0.2\n;HEIGHT:0.2\n') && r.gcode.text.includes(';Z:3\n'));
});

test('doar comenzile pe care OrcaSlicer le scrie pentru K1C', () => {
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20), conturCerc(110, 110, 4)])], setariImplicite('petg', '0.16'), { data: DATA });
  assert.ok(r.gcode);
  const permise = new Set(['G1', 'G90', 'G21', 'G92', 'M83', 'M104', 'M109', 'M140', 'M106', 'M204', 'T0', 'START_PRINT', 'END_PRINT',
    'SET_VELOCITY_LIMIT', 'EXCLUDE_OBJECT_DEFINE', 'EXCLUDE_OBJECT_START', 'EXCLUDE_OBJECT_END']);
  for (const l of linii(r.gcode.text)) {
    if (l === '' || l.startsWith(';')) continue;
    assert.ok(permise.has(l.split(' ')[0]!), `comandă nouă: ${l}`);
  }
  assert.match(r.gcode.text, /\nSTART_PRINT EXTRUDER_TEMP=250 BED_TEMP=70\nT0\nM204 S2000\nM109 S250\nG1 Z3 F600\nM83\nG92 E0\nG1 Z1 F600\n/);
  assert.match(r.gcode.text, /\nEND_PRINT\n; EXECUTABLE_BLOCK_END\n/);
  assert.match(r.gcode.text, /\nEXCLUDE_OBJECT_DEFINE NAME=Placa_id_0_copy_0 CENTER=110,110 POLYGON=\[\[100,100\],\[120,100\],\[120,120\],\[100,120\]\]\n/);
});

test('pereții: o gaură și o insulă în ea dau câte doi pereți fiecare; umplerea rară, doar înăuntru', () => {
  const s = setariImplicite('pla', '0.20');
  const r = feliaza([piesa([conturDreptunghi(95, 95, 30, 30), conturCerc(110, 110, 8), conturCerc(110, 110, 4)])], s, { data: DATA });
  assert.ok(r.gcode);
  const cai: readonly Cale[] = r.cai(8);
  assert.equal(cai.filter((c) => c.inchisa && (c.rol === 'exterior' || c.rol === 'interior')).length, 6);
  assert.equal(cai.filter((c) => c.rol === 'exterior').length, 3);
  // Nicio linie a umplerii nu trece prin gaură (între raza 4 și raza 8 a centrului).
  for (const c of cai.filter((x) => x.rol === 'rar')) {
    for (let i = 0; i < c.p.length; i += 2) {
      const d = Math.hypot(c.p[i]! - 110, c.p[i + 1]! - 110);
      assert.ok(d <= 4 || d >= 8, `umplere în gaură: ${d}`);
    }
  }
});

test('formele suprapuse se unesc: o cruce din două dreptunghiuri are un singur contur', () => {
  const u = unesteSuprapuse([conturDreptunghi(100, 108, 20, 4), conturDreptunghi(108, 100, 4, 20)]);
  assert.ok(u.ok);
  assert.equal(u.contururi.length, 1);
  const r = feliaza([piesa(u.contururi)], setariImplicite(), { data: DATA });
  assert.equal(r.cai(8).filter((c) => c.rol === 'exterior').length, 1);
  // O gaură apărută din unire (două „C”-uri care închid un pătrat) rămâne gol.
  const c1 = unesteSuprapuse([conturDreptunghi(0, 0, 10, 2), conturDreptunghi(0, 8, 10, 2), conturDreptunghi(0, 0, 2, 10), conturDreptunghi(8, 0, 2, 10)]);
  assert.ok(c1.ok);
  assert.equal(c1.contururi.length, 2);
});

test('ce e mai îngust decât o linie: nimic dintr-o fâșie de 0,3 mm; o punte îngustă, spusă cu aria ei', () => {
  const s = setariImplicite();
  const r = feliaza([piesa([conturDreptunghi(100, 100, 0.3, 20)], 3, 'Fâșie')], s, { data: DATA });
  assert.equal(r.gcode, null);
  assert.deepEqual(r.avertismente.map((a) => a.fel), ['nimic']);
  const u = unesteSuprapuse([conturDreptunghi(90, 100, 10, 10), conturDreptunghi(105, 100, 10, 10), conturDreptunghi(99, 104.85, 7, 0.3)]);
  assert.ok(u.ok);
  const r2 = feliaza([piesa(u.contururi, 3, 'Punte')], s, { data: DATA });
  const a = r2.avertismente.find((x) => x.fel === 'subtire');
  assert.ok(a && a.fel === 'subtire' && a.arie > 1 && a.arie < 2.5, JSON.stringify(r2.avertismente));
});

test('retragerea: între două piese, da; în aceeași piesă, pe o deplasare scurtă prin material, nu', () => {
  const s = setariImplicite();
  const doua = [
    { ...piesa([conturDreptunghi(80, 100, 15, 15)]), id: 'a', nume: 'A_id_0_copy_0' },
    { ...piesa([conturDreptunghi(125, 100, 15, 15)]), id: 'b', nume: 'B_id_1_copy_0' },
  ];
  const r = feliaza(doua, s, { data: DATA });
  assert.ok(r.gcode);
  const l = linii(r.gcode.text);
  // Stratul 2: între piese, retragerea și ridicarea (0,4 + 0,4 = Z0.8), apoi coborârea la Z0.4 la destinație.
  const z2 = l.indexOf(';Z:0.4'), z3 = l.indexOf(';Z:0.6');
  const a2 = l.slice(z2, z3);
  const i = a2.findIndex((x, j) => x.startsWith('EXCLUDE_OBJECT_START') && j > a2.findIndex((y) => y.startsWith('EXCLUDE_OBJECT_END')));
  assert.ok(i > 0);
  const dupa = a2.slice(i, i + 6);
  assert.ok(dupa.includes('G1 E-.8 F2400') && dupa.includes('G1 Z.8 F600'), JSON.stringify(dupa));
  const k = dupa.indexOf('G1 Z.8 F600');
  assert.match(dupa[k + 1]!, /^G1 X\S+ Y\S+/);
  assert.equal(dupa[k + 2], 'G1 Z.4 F600');
  // Stratul 1: prima deplasare pleacă de la Z1 (începutul imprimantei), în XY, și coboară la Z0.2 abia la destinație.
  const z1 = l.indexOf(';Z:0.2');
  const t1 = l.slice(z1).findIndex((x) => /^G1 X\S+ Y\S+ F30000$/.test(x));
  assert.ok(!l.slice(z1, z1 + t1).some((x) => /^G1 Z/.test(x)), 'coboară înaintea deplasării');
  assert.equal(l[z1 + t1 + 1], 'G1 Z.2 F600');
  // Pe un strat plin, liniile se leagă în zigzag: puține retrageri față de linii.
  const strat2 = l.slice(l.indexOf(';Z:0.4'), l.indexOf(';Z:0.6'));
  const retrageri = strat2.filter((x) => x === 'G1 E-.8 F2400').length;
  const extr = strat2.filter((x) => /^G1 X\S+ Y\S+ E/.test(x)).length;
  assert.ok(retrageri <= 6 && extr > 50, `${retrageri} retrageri, ${extr} extrudări`);
});

test('ventilatoarele: oprit pe primul strat, 100 % și auxiliarul 70 % de la al doilea (PLA); PETG între 40 și 90 %', () => {
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], setariImplicite('pla'), { data: DATA });
  assert.ok(r.gcode);
  const l = linii(r.gcode.text);
  const s2 = l.indexOf(';Z:0.4');
  assert.ok(l.slice(0, s2).includes('M106 S0') && !l.slice(0, s2).includes('M106 S255'));
  assert.ok(l.slice(s2, s2 + 20).includes('M106 S255') && l.slice(s2, s2 + 20).includes('M106 P2 S178'));
  const p = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], setariImplicite('petg'), { data: DATA });
  assert.ok(p.gcode);
  const v = linii(p.gcode.text).filter((x) => /^M106 S\d+$/.test(x)).map((x) => Number(x.slice(6)));
  assert.ok(v.slice(1, -1).every((x) => x >= 102 && x <= 230), JSON.stringify(v));
});

test('plafonul de debit și încetinirea pentru răcire', () => {
  const pla = feliaza([piesa([conturDreptunghi(80, 80, 60, 60)], 2)], setariImplicite('pla'), { data: DATA });
  assert.ok(pla.gcode);
  const fmax = Math.max(...extrudari(pla.gcode.text).map((m) => m.f));
  assert.ok(fmax <= Math.ceil((18 / sectiune(0.42, 0.2)) * 60), `F ${fmax}`);
  const petg = feliaza([piesa([conturDreptunghi(80, 80, 60, 60)], 2)], setariImplicite('petg'), { data: DATA });
  assert.ok(petg.gcode);
  assert.ok(Math.max(...extrudari(petg.gcode.text).map((m) => m.f)) <= Math.ceil((9 / sectiune(0.42, 0.2)) * 60));
  // O piesă mică: fiecare strat durează cel puțin ~8 s (PLA), deci timpul total crește.
  const s = setariImplicite('pla');
  const mica = feliaza([piesa([conturDreptunghi(108, 108, 4, 4)], 2)], s, { data: DATA });
  const faraRacire = feliaza([piesa([conturDreptunghi(108, 108, 4, 4)], 2)], setariValide({ ...s, stratMinim: 0 }), { data: DATA });
  assert.ok(mica.gcode && faraRacire.gcode);
  assert.ok(mica.gcode.timp > faraRacire.gcode.timp * 1.5, `${mica.gcode.timp} față de ${faraRacire.gcode.timp}`);
});

test('brim-ul: cerut, 11 bucle pe primul strat (5 mm la pasul de 0,457); automat pentru o piesă îngustă sau înaltă', () => {
  const s = setariValide({ ...setariImplicite(), brim: 'da' });
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], s, { data: DATA });
  assert.equal(r.cai(1).filter((c) => c.rol === 'brim').length, 11);
  assert.equal(r.cai(2).filter((c) => c.rol === 'brim').length, 0);
  assert.equal(brimAutomat(piesa([conturDreptunghi(0, 0, 20, 20)], 3)), false);
  assert.equal(brimAutomat(piesa([conturDreptunghi(0, 0, 20, 8)], 3)), true);
  assert.equal(brimAutomat(piesa([conturDreptunghi(0, 0, 20, 20)], 40)), true);
});

test('timpul: bucata dreaptă pe hârtie (100 mm, 100 mm/s, 1000 mm/s²: 1,1 s), formatul OrcaSlicer', () => {
  assert.ok(Math.abs(timpBucata(100, 100, 1000, 0, 0) - 1.1) < 1e-9);
  assert.ok(Math.abs(timpBucata(2, 100, 1000, 0, 0) - 2 * Math.sqrt(2 / 1000)) < 1e-9);
  assert.equal(timpText(45), '45s');
  assert.equal(timpText(216), '3m 36s');
  assert.equal(timpText(3725), '1h 2m 5s');
  assert.deepEqual(anvelopa([[0, 0, 2, 0, 2, 2, 1, 1, 0, 2]]), [[0, 0], [2, 0], [2, 2], [0, 2]]);
});

test('aceeași intrare, același fișier (fără ceas în motor)', () => {
  const c = [conturDreptunghi(100, 100, 20, 10, 2), conturCerc(106, 105, 2)];
  const a = feliaza([piesa(c)], setariImplicite('asa', '0.24'), { data: DATA });
  const b = feliaza([piesa(c)], setariImplicite('asa', '0.24'), { data: DATA });
  assert.equal(a.gcode?.text, b.gcode?.text);
});

/** Un document cu o piesă: un dreptunghi și o cale deschisă (o linie), într-o instanță așezată la (x, y). */
function documentCu(x: number, y: number): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  return {
    ...d,
    piese: [{
      id: 'p1', nume: 'Placă de probă', operatii: [],
      radacina: { tip: 'grup', id: 'g', matrice: I, copii: [
        { tip: 'element', id: 'e1', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: I },
        { tip: 'element', id: 'e2', forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 30 }, s: { tip: 'L' } }, { p: { x: 10, y: 30 }, s: { tip: 'L' } }] }, matrice: I },
      ] },
    }],
    foi: [{ ...d.foi[0]!, instante: [{ id: 'i1', piesa: 'p1', x, y, rotire: 0 }] }],
  };
}

test('piesele din document: căile deschise numărate, grupul centrat pe pat, ce nu încape spus', () => {
  const a = pieseDinDocument(documentCu(50, 60), { fel: 'foaie' }, 3, [220, 220]);
  assert.equal(a.deschise, 1);
  assert.equal(a.piese.length, 1);
  assert.ok(a.incape);
  assert.equal(a.piese[0]!.nume, 'Placa_de_proba_id_0_copy_0');
  // Diacriticele din mijlocul cuvântului (unde înlocuirea caracterelor rămase le-ar face „_”).
  assert.equal(numeObiect('Ștanță', 2), 'Stanta_id_2_copy_0');
  assert.equal(numeObiect('', 3), 'piesa_id_3_copy_0');
  const p = a.piese[0]!.contururi[0]!.varfuri.map((v) => v.p);
  assert.deepEqual([Math.min(...p.map((q) => q.x)), Math.max(...p.map((q) => q.x)), Math.min(...p.map((q) => q.y)), Math.max(...p.map((q) => q.y))], [90, 130, 100, 120]);
  assert.equal(pieseDinDocument(documentCu(0, 0), { fel: 'selectie', ids: [] }, 3, [220, 220]).piese.length, 0);
  assert.equal(pieseDinDocument(documentCu(0, 0), { fel: 'piesa', id: 'i1' }, 3, [220, 220]).piese.length, 1);
  assert.equal(pieseDinDocument(documentCu(0, 0), { fel: 'foaie' }, 3, [40, 40]).incape, false);
});

const minX = (c: Cale): number => { let m = Infinity; for (let i = 0; i < c.p.length; i += 2) m = Math.min(m, c.p[i]!); return m; };

test('pereții pe hârtie: la w/2 de margine, apoi după (pasul exterior + pasul interior) / 2; primul strat, cu 0,15 mai înăuntru; cusătura la spate; umplerea plină, peste pereți cu 25 %', () => {
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], setariImplicite(), { data: DATA });
  assert.ok(r.gcode);
  const p8 = r.cai(8).filter((c) => c.inchisa).map(minX).sort((a, b) => a - b);
  assert.ok(Math.abs(p8[0]! - 100.21) < 1e-3 && Math.abs(p8[1]! - (100.21 + (pas(0.42, 0.2) + pas(0.45, 0.2)) / 2)) < 1e-3, JSON.stringify(p8));
  const p1 = r.cai(1).filter((c) => c.inchisa).map(minX).sort((a, b) => a - b);
  assert.ok(Math.abs(p1[0]! - 100.4) < 1e-3 && Math.abs(p1[1]! - (100.4 + pas(0.5, 0.2))) < 1e-3, JSON.stringify(p1));
  for (const c of r.cai(8).filter((x) => x.inchisa)) {
    let yMax = -Infinity;
    for (let i = 1; i < c.p.length; i += 2) yMax = Math.max(yMax, c.p[i]!);
    assert.ok(Math.abs(c.p[1]! - yMax) < 1e-9, 'bucla nu începe la spate');
  }
  const asteptat = 100 + 0.21 + (pas(0.42, 0.2) + pas(0.45, 0.2)) / 2 + 0.45 / 2 - 0.25 * 0.42;
  const m = Math.min(...r.cai(2).filter((c) => c.rol === 'plin').map(minX));
  assert.ok(Math.abs(m - asteptat) < 1e-3, `${m} față de ${asteptat}`);
  // Grila rară: fiecare linie, o singură bucată (nicio legătură de 6 mm extrudată).
  const rare = r.cai(8).filter((x) => x.rol === 'rar');
  assert.ok(rare.length > 0 && rare.every((c) => c.p.length === 4));
  // Golul cusăturii: prima buclă a stratului 8 se oprește la 0,04 mm de începutul ei.
  const l = linii(r.gcode.text);
  const z = l.indexOf(';Z:1.6'), d = l.indexOf('G1 E.8 F2400', z);
  const start = l.slice(z, d).reverse().find((x) => /^G1 X\S+ Y\S+/.test(x))!;
  const pct = (x: string): [number, number] => [Number(/X(-?[\d.]+)/.exec(x)![1]), Number(/Y(-?[\d.]+)/.exec(x)![1])];
  let k = d + 1;
  while (/^G1 X\S+ Y\S+ E/.test(l[k + 1] ?? '')) k++;
  const [x0, y0] = pct(start), [x1, y1] = pct(l[k]!);
  assert.ok(Math.abs(Math.hypot(x1 - x0, y1 - y0) - 0.04) < 2e-3, `${x0},${y0} → ${x1},${y1}`);
});

test('deplasările: una care iese din conturul piesei (sau trece peste un gol) cere retragere, una prin material nu', () => {
  const p = Float64Array.from([0, 0, 10, 0, 10, 10, 0, 10]);
  assert.equal(iesePeste(2, 2, 8, 8, [p]), false);
  assert.equal(iesePeste(2, 2, 12, 5, [p]), true);
  assert.equal(iesePeste(2, 5, 8, 5, [p, Float64Array.from([4, 4, 6, 4, 6, 6, 4, 6])]), true);
});

test('temperaturile primului strat (PC: 270 °C, apoi 280; patul 110): în START_PRINT, apoi M104 la al doilea strat', () => {
  const r = feliaza([piesa([conturDreptunghi(100, 100, 20, 20)])], setariImplicite('pc'), { data: DATA });
  assert.ok(r.gcode);
  assert.match(r.gcode.text, /\nSTART_PRINT EXTRUDER_TEMP=270 BED_TEMP=110\n/);
  const l = linii(r.gcode.text), s2 = l.indexOf(';Z:0.4');
  assert.ok(l.slice(s2, s2 + 12).includes('M104 S280'));
  assert.ok(!l.slice(0, s2).includes('M104 S280'));
});

test('o formă care intră într-un gol apărut din unire îl micșorează (nu devine ea gol)', () => {
  const poligon = (pts: number[][]): Contur => ({ inchis: true, varfuri: pts.map(([x, y]) => ({ p: { x: x!, y: y! }, s: { tip: 'L' as const } })) });
  const c1 = poligon([[0, 0], [6, 0], [6, 2], [2, 2], [2, 8], [6, 8], [6, 10], [0, 10]]);
  const c2 = poligon([[4, 0], [10, 0], [10, 10], [4, 10], [4, 8], [8, 8], [8, 2], [4, 2]]);
  const u = unesteSuprapuse([c1, c2, conturDreptunghi(1, 4, 3, 2)]);
  assert.ok(u.ok);
  assert.deepEqual(u.contururi.map((c) => Math.round(Math.abs(arie(Array.from({ length: c.varfuri.length * 2 }, (_, i) => (i % 2 === 0 ? c.varfuri[i / 2]!.p.x : c.varfuri[(i - 1) / 2]!.p.y)))))).sort((a, b) => a - b), [32, 100]);
});
