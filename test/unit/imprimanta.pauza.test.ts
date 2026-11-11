/**
 * Pauza la un strat (felia 3.6p, ADR 0193 §A), pe hârtie: stratul fiecărei pauze (înălțimea ținută, la altă grosime a
 * straturilor, peste piese), locul ei în fișier (după schimbarea stratului și temperaturile celui de-al doilea, înaintea
 * oricărei piese, ca OrcaSlicer), nota (ASCII, fără rânduri noi), pauzele găsite de verificarea fișierului (cvs2, OrcaSlicer,
 * Cura) și pauzele ținute în browser pentru aceleași piese.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { conturDreptunghi } from '../../src/geom/conturBaza.ts';
import { analizeazaText, MAX_PAUZE, patPentru } from '../../src/machine/imprimanta/gcode3d.ts';
import { cuPauze, feliaza, K1C, notaInFisier, notaPauza, punePauze, setariImplicite, type Pauza } from '../../src/cam/feliere/index.ts';
import { numeObiect } from '../../src/cam/feliere/piese.ts';
import { cheiePauze, citestePauze, MAX_DESENE, scriePauze } from '../../src/app/pauzeDesen.ts';

const DATA = '2026-11-09 at 18:00:00';
const piesa = (id: string, x: number, inaltime = 3) => ({
  id, nume: numeObiect('Placa', Number(id.slice(1))), eticheta: 'Placă', contururi: [conturDreptunghi(x, 100, 20, 20)], inaltime,
});
const linii = (t: string): string[] => t.split('\n');

/** O placă de 3 mm la 0,20 (15 straturi; vârfurile 0,2 … 3,0) și textul ei. */
function placa(calitate = '0.20') {
  const r = feliaza([piesa('i0', 100)], setariImplicite('pla', calitate), { data: DATA });
  assert.ok(r.gcode);
  return r.gcode;
}

test('stratul unei pauze: înaintea primului strat care începe de la înălțimea ei; nu înaintea primului; peste piese, cade', () => {
  const g = placa();
  assert.equal(g.straturi, 15);
  const z = g.plan.map((p) => p.z);
  // Pauza „înaintea stratului 11” ține vârful stratului 10: 2,0 mm.
  assert.ok(Math.abs(z[9]! - 2) < 1e-9);
  const pus = punePauze(g.plan, [{ h: z[9]!, nota: '' }, { h: 0.2, nota: '' }, { h: 0.05, nota: '' }, { h: 2.9, nota: '' }, { h: 2.8, nota: '' }, { h: 3, nota: '' }]);
  // 0,05 mm (sub vârful primului strat): înaintea stratului 2. 2,9 mm: ultimul strat (15) începe la 2,8, deci nu ajunge la
  // înălțimea ei: pauza ar veni după ultimul strat, deci cade. 2,8 mm: înaintea ultimului strat. 3 mm: peste piesă.
  assert.deepEqual(pus.map((p) => p.k), [11, 2, 2, null, 15, null]);
  assert.ok(Math.abs(pus[0]!.z! - 2) < 1e-9 && Math.abs(pus[1]!.z! - 0.2) < 1e-9 && Math.abs(pus[4]!.z! - 2.8) < 1e-9);
  assert.equal(pus[3]!.z, null);
  // O înălțime calculată altfel (cu o eroare de rotunjire) rămâne pe același strat.
  assert.deepEqual(punePauze(g.plan, [{ h: z[9]! + 1e-9, nota: '' }, { h: z[9]! - 1e-9, nota: '' }]).map((p) => p.k), [11, 11]);
  // Nota și înălțimea rămân ale pauzei.
  assert.deepEqual(punePauze(g.plan, [{ h: 2, nota: 'x' }]).map((p) => [p.h, p.nota]), [[2, 'x']]);
  // Un plan cu un singur strat: nicio pauză.
  assert.deepEqual(punePauze(g.plan.slice(0, 1), [{ h: 0.1, nota: '' }]).map((p) => p.k), [null]);
});

test('o pauză ține înălțimea: la altă grosime a straturilor, rămâne la marginea de sus a aceluiași loc din piesă', () => {
  const g20 = placa('0.20');
  const g12 = placa('0.12');
  const h = g20.plan[9]!.z; // 2,0 mm, ținut de pauza „înaintea stratului 11” la 0,20
  const [p12] = punePauze(g12.plan, [{ h, nota: '' }]);
  assert.ok(p12 && p12.k !== null && p12.z !== null);
  // La 0,12 (primul strat 0,2), vârfurile: 0,2 + 0,12·(k − 1); primul care ajunge la 2,0: 2,0 (k − 1 = 15, deci stratul 16).
  assert.ok(p12.z >= h - 1e-6, `pauza a coborât sub înălțimea ei: ${p12.z}`);
  assert.ok(g12.plan[p12.k - 3]!.z < h - 1e-6, 'pauza nu e la primul strat care ajunge la înălțimea ei');
});

test('pauza în fișier: după schimbarea stratului (și temperaturile celui de-al doilea), înaintea oricărei piese, ca OrcaSlicer', () => {
  const g = placa();
  const pus = punePauze(g.plan, [{ h: g.plan[9]!.z, nota: 'filament negru' }]);
  const t = cuPauze(g.text, pus, K1C.pauza);
  const l = linii(t);
  const i = l.indexOf(';PAUSE_PRINT');
  assert.ok(i > 0);
  // Stratul 11: a 11-a schimbare de strat, Z-ul lui (2,2), apoi pauza, cu nota și comanda imprimantei.
  assert.equal(l.slice(0, i).filter((x) => x === ';LAYER_CHANGE').length, 11);
  assert.deepEqual(l.slice(i - 2, i + 3), [';AFTER_LAYER_CHANGE', ';2.2', ';PAUSE_PRINT', '; pause note: filament negru', 'PAUSE']);
  // Înaintea oricărei piese a stratului: niciun EXCLUDE_OBJECT_START între schimbarea stratului 11 și pauză.
  const schimbare = l.lastIndexOf(';LAYER_CHANGE', i);
  assert.ok(!l.slice(schimbare, i).some((x) => x.startsWith('EXCLUDE_OBJECT_START')));
  assert.ok(l.slice(i).some((x) => x.startsWith('EXCLUDE_OBJECT_START')));
  // Restul fișierului e neschimbat: aceleași linii, fără cele trei ale pauzei.
  assert.deepEqual([...l.slice(0, i), ...l.slice(i + 3)], linii(g.text));
  // Doar o comandă nouă, `PAUSE`, o singură dată.
  assert.deepEqual(l.filter((x) => x === 'PAUSE'), ['PAUSE']);
});

test('pauza înaintea stratului 2: după temperaturile celui de-al doilea strat (M104), ca OrcaSlicer', () => {
  // PC 0,20: duza 270 pe primul strat, 280 apoi (patul 110 / 110, deci fără M140).
  const r = feliaza([piesa('i0', 100)], setariImplicite('pc', '0.20'), { data: DATA });
  assert.ok(r.gcode);
  const t = cuPauze(r.gcode.text, punePauze(r.gcode.plan, [{ h: 0.2, nota: '' }]), 'PAUSE');
  const l = linii(t);
  const i = l.indexOf(';PAUSE_PRINT');
  // Fără notă: doar semnul și comanda, înaintea primei piese a stratului.
  assert.deepEqual(l.slice(i - 3, i + 4), [';AFTER_LAYER_CHANGE', ';0.4', 'M104 S280', ';PAUSE_PRINT', 'PAUSE', '; printing object Placa_id_0_copy_0',
    'EXCLUDE_OBJECT_START NAME=Placa_id_0_copy_0']);
});

test('două pauze pe același strat: una singură, cu notele alăturate; cele căzute și o listă goală nu schimbă nimic', () => {
  const g = placa();
  const pus = punePauze(g.plan, [{ h: 1.0, nota: 'a' }, { h: 0.95, nota: 'b' }, { h: 1.0, nota: 'a' }, { h: 99, nota: 'peste' }]);
  assert.deepEqual(pus.map((p) => p.k), [6, 6, 6, null]);
  const t = cuPauze(g.text, pus, 'PAUSE');
  assert.equal(linii(t).filter((x) => x === 'PAUSE').length, 1);
  assert.ok(t.includes('\n; pause note: a / b\nPAUSE\n'));
  assert.ok(!t.includes('peste'));
  assert.equal(cuPauze(g.text, [], 'PAUSE'), g.text);
  assert.equal(cuPauze(g.text, punePauze(g.plan, [{ h: 99, nota: 'x' }]), 'PAUSE'), g.text);
});

test('nota: fără caractere de control, cel mult 40; în fișier doar ASCII (diacriticele scoase), deci tot fișierul rămâne ASCII', () => {
  assert.equal(notaPauza('  magnet\n6 × 3\t '), 'magnet 6 × 3');
  assert.equal(notaPauza('x'.repeat(60)).length, 40);
  assert.equal(notaInFisier('filament roșu, ținut'), 'filament rosu, tinut');
  assert.equal(notaInFisier('magnet 6 × 3 ✓'), 'magnet 6 3');
  assert.equal(notaInFisier('\r\nPAUSE\nG28'), 'PAUSE G28');
  const g = placa();
  const t = cuPauze(g.text, punePauze(g.plan, [{ h: 2, nota: 'roșu\nG28 ştiut' }]), 'PAUSE');
  assert.ok(t.includes('\n; pause note: rosu G28 stiut\nPAUSE\n'));
  for (let i = 0; i < t.length; i++) assert.ok(t.charCodeAt(i) < 128, `caracter în afara ASCII la ${i}: ${t[i]}`);
});

test('verificarea fișierului găsește pauzele: cvs2 (stratul, înălțimea, nota), OrcaSlicer, Cura; M1 nu e M104', () => {
  const g = placa();
  const t = cuPauze(g.text, punePauze(g.plan, [{ h: 2, nota: 'filament negru' }, { h: 1, nota: '' }]), 'PAUSE');
  const a = analizeazaText(t, patPentru('K1C'));
  assert.equal(a.pauze.length, 2);
  assert.deepEqual(a.pauze.map((p) => [p.comanda, p.strat, p.z, p.nota]), [['PAUSE', 6, 1, null], ['PAUSE', 11, 2, 'filament negru']]);
  assert.ok(linii(t)[a.pauze[1]!.linie - 1] === 'PAUSE');
  // OrcaSlicer (Creality Print): `;PAUSE_PRINT` și `PAUSE` după schimbarea stratului; o schimbare de filament (`M600`).
  const orca = [';LAYER_CHANGE', ';Z:0.2', 'G1 X1 Y1 E1', ';LAYER_CHANGE', ';Z:0.4', ';PAUSE_PRINT', 'PAUSE', 'G1 X2 Y2 E1', ';LAYER_CHANGE',
    ';Z:0.6', 'M600 ; filament change', 'M104 S200', 'M1', 'M106 S255'].join('\n');
  assert.deepEqual(analizeazaText(orca, patPentru('K1C')).pauze.map((p) => [p.comanda, p.strat, p.z]), [['PAUSE', 2, 0.2], ['M600', 3, 0.4], ['M1', 3, 0.4]]);
  // Cura: straturile de la 0, fără `;Z:`; `M0` cu un comentariu.
  const cura = [';LAYER:0', 'G1 X1 Y1 E1', ';LAYER:1', 'G1 X1 Y2 E1', ';LAYER:2', 'M0 ; Pause at height', 'G1 X3 Y3 E1'].join('\n');
  assert.deepEqual(analizeazaText(cura, patPentru('K1C')).pauze.map((p) => [p.comanda, p.strat, p.z]), [['M0', 3, null]]);
  // Nota scrisă de cvs2 ține doar de pauza de după ea.
  const doua = [';LAYER_CHANGE', ';Z:0.2', '; pause note: x', 'PAUSE', 'M600'].join('\n');
  assert.deepEqual(analizeazaText(doua, patPentru('K1C')).pauze.map((p) => [p.comanda, p.nota]), [['PAUSE', 'x'], ['M600', null]]);
  // Fără straturi știute: doar comanda și linia.
  assert.deepEqual(analizeazaText('G28\nM25\n', patPentru('K1C')).pauze, [{ comanda: 'M25', linie: 2, strat: null, z: null, nota: null }]);
  // Un fișier fără pauze, și unul cu mii: cel mult MAX_PAUZE.
  assert.deepEqual(analizeazaText(g.text, patPentru('K1C')).pauze, []);
  assert.equal(analizeazaText(Array.from({ length: 300 }, () => 'M0').join('\n'), patPentru('K1C')).pauze.length, MAX_PAUZE);
});

/** Un depozit în memorie, ca `localStorage`. */
function depozit(): Pick<Storage, 'getItem' | 'setItem'> & { readonly date: Map<string, string> } {
  const date = new Map<string, string>();
  return { date, getItem: (k) => date.get(k) ?? null, setItem: (k, v) => { date.set(k, v); } };
}

test('pauzele ținute în browser pentru aceleași piese: cheia nu depinde de ordine; citite înapoi ordonate; lista goală scoate desenul', () => {
  const d = depozit();
  assert.equal(cheiePauze(['b', 'a']), cheiePauze(['a', 'b']));
  const p: Pauza[] = [{ h: 2, nota: 'negru' }, { h: 1, nota: '' }];
  scriePauze('a,b', p, d, 1);
  assert.deepEqual(citestePauze('a,b', d), [{ h: 1, nota: '' }, { h: 2, nota: 'negru' }]);
  assert.deepEqual(citestePauze('a', d), []);
  scriePauze('a,b', [], d, 2);
  assert.deepEqual(citestePauze('a,b', d), []);
  assert.deepEqual(JSON.parse(d.date.get('cvs2.imprimanta.felie.pauze')!), { v: 1, desene: {} });
  // Fără depozit sau fără piese: nimic, fără erori.
  assert.deepEqual(citestePauze('a', null), []);
  scriePauze('', p, d, 3);
  assert.deepEqual(citestePauze('', d), []);
});

test('pauzele ținute: valorile stricate se sar; cel mult MAX_DESENE desene, cele mai vechi ies; un depozit care aruncă nu oprește nimic', () => {
  const d = depozit();
  d.setItem('cvs2.imprimanta.felie.pauze', JSON.stringify({
    v: 1, desene: { x: { pauze: [{ h: 1, nota: 'bun' }, { h: -1 }, { h: 'a' }, null, { h: 2, nota: 5 }], la: 1 }, y: 'stricat' },
  }));
  assert.deepEqual(citestePauze('x', d), [{ h: 1, nota: 'bun' }, { h: 2, nota: '' }]);
  assert.deepEqual(citestePauze('y', d), []);
  d.setItem('cvs2.imprimanta.felie.pauze', '{nu e json');
  assert.deepEqual(citestePauze('x', d), []);
  d.setItem('cvs2.imprimanta.felie.pauze', JSON.stringify({ v: 2, desene: { x: { pauze: [{ h: 1, nota: '' }], la: 1 } } }));
  assert.deepEqual(citestePauze('x', d), []);
  const e = depozit();
  for (let i = 0; i < MAX_DESENE + 5; i++) scriePauze(`d${i}`, [{ h: 1, nota: String(i) }], e, i);
  const tinute = Object.keys((JSON.parse(e.date.get('cvs2.imprimanta.felie.pauze')!) as { desene: object }).desene);
  assert.equal(tinute.length, MAX_DESENE);
  assert.ok(!tinute.includes('d0') && tinute.includes(`d${MAX_DESENE + 4}`));
  const arunca = { getItem: () => { throw new Error('blocat'); }, setItem: () => { throw new Error('plin'); } };
  assert.deepEqual(citestePauze('x', arunca), []);
  assert.doesNotThrow(() => { scriePauze('x', [{ h: 1, nota: '' }], arunca, 1); });
});
