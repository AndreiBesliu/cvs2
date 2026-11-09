/**
 * Placa și stratul viu (felia 3.6q, ADR 0193 §B), pe hârtie: harta unui fișier (straturile, filamentul de la începutul fiecăruia,
 * căile, piesele, pauzele; E absolut și relativ, Cura, plafonul punctelor, citirea pe bucăți), stratul ales (din filament, cu
 * numărul imprimantei luat doar aproape de el; numărătorile amestecate ale K1C; pauza fișierului), etichetele pieselor și ce
 * fișiere ținute rămân.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { conturCerc, conturDreptunghi } from '../../src/geom/conturBaza.ts';
import { cuPauze, feliaza, K1C, punePauze, setariImplicite } from '../../src/cam/feliere/index.ts';
import { numeObiect } from '../../src/cam/feliere/piese.ts';
import { hartaFisier, hartaText, PRAG_PUNCT } from '../../src/machine/imprimanta/harta.ts';
import { stratDinFilament, stratViu } from '../../src/machine/imprimanta/stratViu.ts';
import { etichetePiese, inContur, pauzaDeAcum } from '../../src/app/placaCalcul.ts';
import { cheieFisier, dePastrat, MAX_FISIERE, MAX_OCTETI } from '../../src/app/fisiereImprimanta.ts';

const piesa = (id: string, k: number, c: ReturnType<typeof conturCerc>, eticheta = 'Placă') => ({
  id, nume: numeObiect(eticheta, k), eticheta, contururi: [c], inaltime: 2,
});

/** Două piese (un dreptunghi și un cerc), 10 straturi de 0,2, cu o pauză înaintea stratului 6 („magnet”). */
function fisier() {
  const r = feliaza([piesa('a', 0, conturDreptunghi(80, 100, 20, 20)), piesa('b', 1, conturCerc(140, 110, 10), 'Șaibă')],
    setariImplicite('pla', '0.20'), { data: '2026-11-09 at 20:00:00' });
  assert.ok(r.gcode);
  return { g: r.gcode, text: cuPauze(r.gcode.text, punePauze(r.gcode.plan, [{ h: 1, nota: 'magnet' }]), K1C.pauza) };
}

test('harta unui fișier cvs2: straturile cu vârful și filamentul de la început, piesele (majuscule), pauza, cutia, filamentul', () => {
  const { g, text } = fisier();
  const h = hartaText(text);
  assert.equal(h.straturi.length, 10);
  assert.deepEqual(h.straturi.map((s) => s.z), g.plan.map((p) => Number(p.z.toFixed(3))));
  assert.equal(h.straturi[0]!.e, 0);
  for (let k = 1; k < 10; k++) assert.ok(h.straturi[k]!.e > h.straturi[k - 1]!.e, `filamentul crește la stratul ${k + 1}`);
  // Filamentul net: al fișierului, minus retragerea de la sfârșit (0,8 mm), cu E-ul scris cu 5 zecimale (rotunjirile se adună).
  assert.ok(Math.abs(h.filament - (g.filamentMm - K1C.retragere)) < 0.05, `${h.filament} față de ${g.filamentMm}`);
  assert.deepEqual(h.piese.map((p) => p.nume), ['PLACA_ID_0_COPY_0', 'SAIBA_ID_1_COPY_0']);
  assert.equal(h.piese[0]!.contur.length, 4);
  assert.deepEqual(h.pauze, [{ strat: 6, z: 1, nota: 'magnet' }]);
  assert.ok(h.cutie && h.cutie.x0 > 80 && h.cutie.x1 < 150 && h.cutie.y0 > 99 && h.cutie.y1 < 121);
  assert.equal(h.taiata, false);
  // Fiecare cale are piesa ei; amândouă piesele, pe fiecare strat.
  for (const s of h.straturi) {
    const cai = s.piese.length;
    let pauze = 0;
    for (let i = 0; i < s.puncte.length; i += 2) if (Number.isNaN(s.puncte[i]!)) pauze++;
    assert.equal(pauze, cai - 1, 'o pereche NaN între două căi');
    assert.deepEqual([...new Set(s.piese)].sort(), [0, 1]);
  }
});

test('harta: E absolut (M82, G92 E0) și relativ dau același filament; Cura (`;LAYER:n`); punctele prea apropiate nu se țin', () => {
  const rel = ['M83', ';LAYER_CHANGE', ';Z:0.2', 'G1 X0 Y0 F600', 'G1 X10 Y0 E1', 'G1 X10 Y10 E1', 'G1 E-0.5', 'G1 X20 Y20', 'G1 E0.5',
    'G1 X25 Y20 E0.5', ';LAYER_CHANGE', ';Z:0.4', 'G1 X20 Y30 E2'].join('\n');
  const abs = ['M82', ';LAYER_CHANGE', ';Z:0.2', 'G92 E0', 'G1 X0 Y0 F600', 'G1 X10 Y0 E1', 'G1 X10 Y10 E2', 'G1 E1.5', 'G1 X20 Y20', 'G1 E2',
    'G1 X25 Y20 E2.5', ';LAYER_CHANGE', ';Z:0.4', 'G92 E0', 'G1 X20 Y30 E2'].join('\n');
  const a = hartaText(rel), b = hartaText(abs);
  assert.deepEqual(a.straturi.map((s) => s.e), [0, 2.5]);
  assert.deepEqual(b.straturi.map((s) => s.e), [0, 2.5]);
  assert.equal(a.filament, 4.5);
  assert.equal(b.filament, 4.5);
  // O retragere, o deplasare și o revenire: o cale nouă (NaN, NaN între ele), fiecare cu piesa ei (aici, niciuna).
  assert.deepEqual([...a.straturi[0]!.puncte], [0, 0, 10, 0, 10, 10, Number.NaN, Number.NaN, 20, 20, 25, 20]);
  assert.deepEqual([...a.straturi[0]!.piese], [-1, -1]);
  // Stratul 2 începe de unde a rămas duza (25, 20).
  assert.deepEqual([...a.straturi[1]!.puncte], [25, 20, 20, 30]);
  // Cura: straturile de la 0, fără `;Z:`.
  const cura = hartaText([';LAYER:0', 'G1 X0 Y0', 'G1 X5 Y0 E1', ';LAYER:1', 'G1 X5 Y5 E1'].join('\n'));
  assert.deepEqual(cura.straturi.map((s) => [s.z, s.e]), [[null, 0], [null, 1]]);
  // Un punct la mai puțin de PRAG_PUNCT de cel ținut nu se ține.
  const des = hartaText([';LAYER_CHANGE', 'M83', 'G1 X0 Y0', `G1 X${PRAG_PUNCT / 2} Y0 E0.01`, 'G1 X1 Y0 E0.1'].join('\n'));
  assert.deepEqual([...des.straturi[0]!.puncte], [0, 0, 1, 0]);
});

test('harta: plafonul punctelor (căile se opresc, straturile rămân cu filamentul lor); citită pe bucăți, la fel', async () => {
  const { text } = fisier();
  const intreaga = hartaText(text);
  const taiata = hartaText(text, { maxPuncte: 300 });
  assert.equal(taiata.taiata, true);
  assert.equal(taiata.straturi.length, 10);
  assert.deepEqual(taiata.straturi.map((s) => s.e), intreaga.straturi.map((s) => s.e));
  assert.ok(taiata.straturi.at(-1)!.puncte.length === 0);
  // Pe bucăți de 1 MiB (aici, tot fișierul într-una), cu diacritice în comentarii: aceeași hartă.
  const pe = await hartaFisier(new Blob([`; cvs2 ăîșț\n${text}`]));
  assert.deepEqual(pe.straturi.map((s) => [s.z, s.e, s.puncte.length]), intreaga.straturi.map((s) => [s.z, s.e, s.puncte.length]));
  assert.deepEqual(pe.pauze, intreaga.pauze);
});

test('stratul din filament: ultimul strat care începe la cel mult filamentul dat; înainte de primul, tot primul', () => {
  const h = hartaText(fisier().text);
  assert.equal(stratDinFilament(h, -5), 1);
  assert.equal(stratDinFilament(h, 0), 1);
  assert.equal(stratDinFilament(h, h.straturi[5]!.e), 6);
  assert.equal(stratDinFilament(h, h.straturi[5]!.e - 0.01), 5);
  assert.equal(stratDinFilament(h, h.filament + 100), 10);
  assert.equal(stratDinFilament(hartaText(''), 3), null);
});

test('stratul viu, pe un fișier știut: numărul imprimantei, doar la cel mult un strat de cel din filament; altfel, filamentul', () => {
  const h = hartaText(fisier().text);
  const f6 = h.straturi[5]!.e + 3;
  // Numărătoarea adevărată (6) și cea cu 5 în plus a K1C (11, peste cele 10 straturi; sau 8 când e sub ele).
  assert.deepEqual(stratViu({ harta: h, straturi: 10, progres: 50, filament: f6, recente: [6, 11] }), { strat: 6, sursa: 'imprimanta' });
  assert.deepEqual(stratViu({ harta: h, straturi: 10, progres: 50, filament: f6, recente: [11, 6] }), { strat: 6, sursa: 'imprimanta' });
  assert.deepEqual(stratViu({ harta: h, straturi: 10, progres: 30, filament: h.straturi[2]!.e + 1, recente: [3, 8] }), { strat: 3, sursa: 'imprimanta' });
  // Doar valori departe de filament: filamentul.
  assert.deepEqual(stratViu({ harta: h, straturi: 10, progres: 50, filament: f6, recente: [9, 2] }), { strat: 6, sursa: 'filament' });
  assert.deepEqual(stratViu({ harta: h, straturi: 10, progres: 50, filament: f6, recente: [] }), { strat: 6, sursa: 'filament' });
  // Fără filament: ca un fișier străin.
  assert.deepEqual(stratViu({ harta: h, straturi: 10, progres: 50, filament: null, recente: [5] }), { strat: 5, sursa: 'imprimanta' });
});

test('stratul viu, în pauza fișierului: chiar stratul pauzei, chiar dacă ultima valoare bună a imprimantei a rămas pe cel dinainte', () => {
  const h = hartaText(fisier().text);
  const laPauza = h.straturi[5]!.e + 12;
  // K1C a trimis 5, apoi 11 (cu 5 în plus): fără pauză, 5 (aproape de filament); în pauză, 6 (pauza fișierului e înaintea lui 6).
  assert.deepEqual(stratViu({ harta: h, straturi: 10, progres: 41, filament: laPauza, recente: [5, 11] }).strat, 5);
  assert.deepEqual(stratViu({ harta: h, straturi: 10, progres: 41, filament: laPauza, recente: [5, 11], inPauza: true }), { strat: 6, sursa: 'imprimanta' });
  // O pauză departe de strat (alt loc al fișierului) nu schimbă nimic.
  assert.equal(stratViu({ harta: h, straturi: 10, progres: 20, filament: h.straturi[1]!.e + 1, recente: [2], inPauza: true }).strat, 2);
});

test('stratul viu, pe alt fișier: dintre ultimele două valori, cea apropiată de progres (transcrierea din 07.11); niciuna: null', () => {
  // Transcrierea owner-ului: 61 de straturi; 6 % la „3” / „8”, 10 % la „10” / „5”.
  assert.deepEqual(stratViu({ harta: null, straturi: 61, progres: 6, filament: 92, recente: [3, 8] }), { strat: 3, sursa: 'imprimanta' });
  assert.deepEqual(stratViu({ harta: null, straturi: 61, progres: 6, filament: 92, recente: [8, 3] }), { strat: 3, sursa: 'imprimanta' });
  assert.deepEqual(stratViu({ harta: null, straturi: 61, progres: 10, filament: 111, recente: [4, 10, 5] }), { strat: 5, sursa: 'imprimanta' });
  // Fără progres sau fără total: cea mai nouă. Fără valori, sau doar în afara straturilor: null.
  assert.equal(stratViu({ harta: null, straturi: 61, progres: null, filament: null, recente: [3, 8] }).strat, 8);
  assert.equal(stratViu({ harta: null, straturi: null, progres: 10, filament: null, recente: [3, 8] }).strat, 8);
  assert.deepEqual(stratViu({ harta: null, straturi: 61, progres: 10, filament: null, recente: [] }), { strat: null, sursa: null });
  assert.deepEqual(stratViu({ harta: null, straturi: 10, progres: 10, filament: null, recente: [0, 11, 2.5] }), { strat: null, sursa: null });
});

test('etichetele pieselor: numele din cvs2 după numele cu majuscule; altfel fără sufixul OrcaSlicer; cele la fel, numerotate', () => {
  assert.deepEqual(etichetePiese(['PLACA_ID_0_COPY_0', 'SAIBA_ID_1_COPY_0'], { PLACA_ID_0_COPY_0: 'Placă', SAIBA_ID_1_COPY_0: 'Șaibă' }), ['Placă', 'Șaibă']);
  assert.deepEqual(etichetePiese(['Placa_id_0_copy_0'], { PLACA_ID_0_COPY_0: 'Placă' }), ['Placă']);
  assert.deepEqual(etichetePiese(['PAT_1.STL_ID_0_COPY_0', 'CUB_A.STL_ID_1_COPY_0'], null), ['PAT 1.STL', 'CUB A.STL']);
  assert.deepEqual(etichetePiese(['A_ID_0_COPY_0', 'A_ID_1_COPY_0', 'B'], null), ['A 1', 'A 2', 'B']);
  assert.deepEqual(etichetePiese(['_ID_0_COPY_0'], null), ['_ID_0_COPY_0']);
});

test('pauza de acum: cea mai apropiată de strat, la cel mult unul; niciuna altfel', () => {
  const p = [{ strat: 6, z: 1, nota: 'a' }, { strat: 9, z: 1.6, nota: null }];
  assert.deepEqual(pauzaDeAcum(p, 6), p[0]);
  assert.deepEqual(pauzaDeAcum(p, 5), p[0]);
  assert.deepEqual(pauzaDeAcum(p, 8), p[1]);
  assert.equal(pauzaDeAcum(p, 3), null);
  assert.equal(pauzaDeAcum(p, null), null);
});

test('fișierele ținute: cele mai noi, cel mult 5 și cel mult 100 MB; cel mai nou rămâne oricum', () => {
  const x = (k: number, mb: number) => ({ cheie: cheieFisier(`f${k}.gcode`, mb), marime: mb * 1024 * 1024, la: k });
  assert.equal(cheieFisier('a.gcode', 12), 'a.gcode|12');
  assert.deepEqual(dePastrat([x(1, 1), x(2, 1), x(3, 1), x(4, 1), x(5, 1), x(6, 1), x(7, 1)]), [7, 6, 5, 4, 3].map((k) => cheieFisier(`f${k}.gcode`, 1)));
  assert.equal(MAX_FISIERE, 5);
  assert.deepEqual(dePastrat([x(1, 40), x(2, 40), x(3, 40)]), [cheieFisier('f3.gcode', 40), cheieFisier('f2.gcode', 40)]);
  assert.equal(MAX_OCTETI, 100 * 1024 * 1024);
  assert.deepEqual(dePastrat([x(1, 10), x(2, 150)]), [cheieFisier('f2.gcode', 150)]);
  assert.deepEqual(dePastrat([]), []);
});

test('3.6r: clicul pe placă găsește piesa: punctul în contur (și într-unul concav), nu lângă el', () => {
  const patrat = [[120, 100], [140, 100], [140, 120], [120, 120]] as const;
  assert.equal(inContur(patrat, 130, 110), true);
  assert.equal(inContur(patrat, 120.5, 119.5), true);
  for (const [x, y] of [[119.5, 110], [140.5, 110], [130, 99.5], [130, 120.5], [90, 110]] as const) assert.equal(inContur(patrat, x, y), false, `${x}, ${y}`);
  // Un L: colțul tăiat (sus-dreapta) nu e al piesei.
  const l = [[0, 0], [20, 0], [20, 10], [10, 10], [10, 20], [0, 20]] as const;
  assert.equal(inContur(l, 5, 15), true);
  assert.equal(inContur(l, 15, 5), true);
  assert.equal(inContur(l, 15, 15), false);
  assert.equal(inContur([], 0, 0), false);
});
