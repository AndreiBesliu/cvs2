/**
 * Procedurile mașinii (ADR 0082, felia 3.7a): funcțiile pure (jog, zero, citirile, motivul refuzului, pașii palpării, cu
 * valorile calculate pe hârtie) și aceleași proceduri prin sesiune, pe mașina simulată (emulatorul GRBL 1.1h, ADR 0079), cu
 * placa de contact la Z −25: exact liniile primite de controler, poziția și decalajele de după, refuzurile cu motiv (lecțiile
 * ediției întâi: zero-ul în alarmă, WCS-ul greșit), starea modală pusă la loc și după o alarmă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deschideSimulata } from '../../src/machine/MasinaSimulata.ts';
import {
  comandaJog, comandaZero, decalajZDinParametri, modalDinGc, motivMiscare, PALPARE_IMPLICITA, pasPalpare, pornestePalpare,
  restaurarePalpare, zDinPrb, type FelMiscare, type ParametriPalpare, type StarePalpare,
} from '../../src/machine/proceduri.ts';
import { incarcaProgram } from '../../src/machine/program.ts';
import { SesiuneMasina } from '../../src/machine/sesiune.ts';
import { CeasFals, octeti, primitiFaraTimpReal } from './ajutor-sender.ts';

// ——— Funcțiile pure ———

test('jog: o singură linie pentru diagonală, incremental, în mm; nimic de mișcat, nefinit, avans ≤ 0, peste 70 de octeți → null', () => {
  assert.equal(comandaJog({ X: 10, Y: -10 }, 1000), '$J=G91 G21 X10.000 Y-10.000 F1000');
  assert.equal(comandaJog({ Z: 0.1 }, 300.4), '$J=G91 G21 Z0.100 F300');
  assert.equal(comandaJog({ X: 0, Y: 2 }, 100), '$J=G91 G21 Y2.000 F100');
  assert.equal(comandaJog({ X: 0 }, 1000), null);
  assert.equal(comandaJog({}, 1000), null);
  assert.equal(comandaJog({ X: Number.NaN }, 1000), null);
  assert.equal(comandaJog({ X: 1, Y: Number.POSITIVE_INFINITY }, 1000), null);
  assert.equal(comandaJog({ X: 1 }, 0), null);
  assert.equal(comandaJog({ X: 1 }, Number.POSITIVE_INFINITY), null);
  assert.equal(comandaJog({ X: 1e15, Y: 1e15 }, 1e13)?.length, 70);
  assert.equal(comandaJog({ X: 1e15, Y: 1e15 }, 1e14), null);
});

test('zero: G10 L20 în WCS-ul ales (P1 = G54 … P6 = G59), doar pe axele cerute', () => {
  assert.equal(comandaZero('G55', ['X', 'Y']), 'G10 L20 P2 X0 Y0');
  assert.equal(comandaZero('G59', ['Z']), 'G10 L20 P6 Z0');
  assert.equal(comandaZero('G54', ['X', 'Y', 'Z']), 'G10 L20 P1 X0 Y0 Z0');
});

test('citirile: starea modală din $G, Z-ul atins din PRB (pe N axe), G92 + TLO din $#', () => {
  assert.deepEqual(modalDinGc(['[GC:G0 G55 G17 G20 G91 G94 M5 M9 T0 F0 S0]']), { miscare: 'G0', wcs: 'G55', unitati: 'G20', distanta: 'G91' });
  assert.deepEqual(modalDinGc(['[PRB:0.000,0.000,0.000:1]', '[GC:G38.2 G59 G17 G21 G90 G94 M5 M9 T0 F25 S0]']),
    { miscare: 'G38.2', wcs: 'G59', unitati: 'G21', distanta: 'G90' });
  assert.equal(modalDinGc(['ok']), null);
  assert.equal(modalDinGc(['[GC:G0 G17 G21 G90]']), null, 'fără WCS');
  assert.equal(modalDinGc(['[GC:G0 G54 G17 G90]']), null, 'fără unități');
  assert.equal(modalDinGc(['[GC:G0 G54 G17 G21]']), null, 'fără modul distanțelor');
  assert.equal(modalDinGc(['[GC:M5 G54 G21 G90]']), null, 'primul cuvânt nu e mișcarea');

  assert.equal(zDinPrb(['[MSG:x]', '[PRB:1.000,2.000,-25.000:1]']), -25);
  assert.equal(zDinPrb(['[PRB:1.000,2.000,-25.000,4.000:1]']), -25);
  assert.equal(zDinPrb(['[PRB:1.000,2.000,-25.000:0]']), null);
  assert.equal(zDinPrb(['[PRB:1.000,2.000:1]']), null);
  assert.equal(zDinPrb([]), null);

  assert.equal(decalajZDinParametri(['[G54:0.000,0.000,0.000]', '[G92:0.000,0.000,1.500]', '[TLO:0.500]']), 2);
  assert.equal(decalajZDinParametri(['[G92:0.000,0.000,1.500]']), null, 'fără TLO');
  assert.equal(decalajZDinParametri(['[TLO:0.500]']), null, 'fără G92');
  assert.equal(decalajZDinParametri(['[G92:0.000,0.000]', '[TLO:0.500]']), null, 'G92 fără Z');
});

test('motivul refuzului: neconectat, procedura, lucrarea (la barieră doar zero-ul XY și WCS-ul), raportul, alarma, Jog doar pentru jog', () => {
  const FELURI: readonly FelMiscare[] = ['jog', 'zero-xy', 'zero-z', 'palpare', 'wcs'];
  const baza = { conectat: true, procedura: false, faza: 'pregatit', stare: 'Idle' } as const;
  const toate = (o: Parameters<typeof motivMiscare>[0]) => FELURI.map((f) => motivMiscare(o, f));
  assert.deepEqual(toate(baza), [null, null, null, null, null]);
  for (const faza of ['liber', 'terminat', 'pierdut'] as const) assert.deepEqual(toate({ ...baza, faza }), [null, null, null, null, null]);
  assert.deepEqual(toate({ ...baza, conectat: false, procedura: true }), Array(5).fill('neconectat'));
  assert.deepEqual(toate({ ...baza, procedura: true, faza: 'trimite' }), Array(5).fill('procedura'));
  for (const faza of ['trimite', 'golire', 'terminare', 'suspendat'] as const) assert.deepEqual(toate({ ...baza, faza, stare: null }), Array(5).fill('lucrare'));
  assert.deepEqual(toate({ ...baza, faza: 'bariera' }), [null, 'lucrare', null, null, 'lucrare']);
  assert.deepEqual(toate({ ...baza, stare: null }), Array(5).fill('fara-raport'));
  assert.deepEqual(toate({ ...baza, stare: 'Alarm' }), Array(5).fill('alarma'));
  assert.deepEqual(toate({ ...baza, stare: 'Jog' }), [null, 'ocupata', 'ocupata', 'ocupata', 'ocupata']);
  for (const stare of ['Run', 'Hold', 'Door', 'Home']) assert.deepEqual(toate({ ...baza, stare }), Array(5).fill('ocupata'));
});

const P: ParametriPalpare = { wcs: 'G55', ...PALPARE_IMPLICITA };
const ok = (...date: string[]) => ({ tip: 'raspuns', date, rezultat: 'ok' }) as const;

/** Palparea până la căutare (modal citit, decalaj citit), cu starea modală dată. */
function panaLaCautare(gc = '[GC:G1 G55 G17 G21 G90 G94 M5 M9 T0 F0 S0]', p: ParametriPalpare = P): StarePalpare {
  const a = pornestePalpare(p);
  const b = pasPalpare(a.stare, ok(gc));
  const c = pasPalpare(b.stare, ok('[G92:0.000,0.000,1.500]', '[TLO:0.500]'));
  assert.equal(c.comanda, `G91 G21 G38.2 Z-${p.distanta.toFixed(3)} F${p.avans}`);
  return c.stare;
}

test('palparea, pas cu pas (pe hârtie): $G, $#, căutarea, retragerea, atingerea fină, G10 L2 P2 Z = −25,010 − 20 − (1,5 + 0,5) = −47,010, ridicarea', () => {
  const a = pornestePalpare(P);
  assert.equal(a.comanda, '$G');
  const b = pasPalpare(a.stare, ok('[GC:G1 G55 G17 G21 G90 G94 M5 M9 T0 F0 S0]'));
  assert.equal(b.comanda, '$#');
  assert.equal(restaurarePalpare(b.stare), null, 'nimic schimbat încă');
  const c = pasPalpare(b.stare, ok('[G54:0.000,0.000,0.000]', '[G92:0.000,0.000,1.500]', '[TLO:0.500]'));
  assert.equal(c.comanda, 'G91 G21 G38.2 Z-30.000 F100');
  assert.equal(restaurarePalpare(c.stare), 'G1 G21 G90');
  const d = pasPalpare(c.stare, ok('[PRB:0.000,0.000,-25.140:1]'));
  assert.equal(d.comanda, '$J=G91 G21 Z2.000 F500');
  assert.equal(d.stare.zAtingere, -25.14);
  const e = pasPalpare(d.stare, ok());
  assert.equal(e.comanda, 'G91 G21 G38.2 Z-3.000 F25');
  const f = pasPalpare(e.stare, ok('[PRB:0.000,0.000,-25.010:1]'));
  assert.equal(f.comanda, 'G10 L2 P2 Z-47.010');
  assert.equal(f.stare.zAtingere, -25.01);
  assert.ok(Math.abs((f.stare.zScris ?? 0) + 47.01) < 1e-9);
  const g = pasPalpare(f.stare, ok());
  assert.equal(g.comanda, '$J=G91 G21 Z5.000 F500');
  const h = pasPalpare(g.stare, ok());
  assert.deepEqual([h.stare.pas, h.comanda, h.stare.motiv], ['gata', null, null]);
  assert.equal(restaurarePalpare(h.stare), 'G1 G21 G90');
  assert.deepEqual(pasPalpare(h.stare, ok()), { stare: h.stare, comanda: null }, 'după gata, nimic');
});

test('palparea: parametrii în afara plajei se refuză înainte de orice comandă; marginile trec', () => {
  const max = { grosime: 100, distanta: 300, avans: 2000, avansFin: 2000, retragere: 50, ridicare: 200, avansRetragere: 10000 } as const;
  for (const k of Object.keys(max) as (keyof typeof max)[]) {
    assert.equal(pornestePalpare({ ...P, [k]: max[k] }).comanda, '$G', `${k} la margine`);
    for (const v of [0, -1, max[k] + 0.001, Number.NaN]) {
      const r = pornestePalpare({ ...P, [k]: v });
      assert.deepEqual([r.comanda, r.stare.pas, r.stare.motiv], [null, 'esuat', 'parametri'], `${k} = ${v}`);
      assert.equal(restaurarePalpare(r.stare), null);
    }
  }
});

test('palparea: alarma 4 (atinsă dinainte), 5 (fără contact), alta; o eroare; răspunsul pierdut; citirile goale; fără PRB', () => {
  const s = panaLaCautare();
  const cauta4 = pasPalpare(s, { tip: 'alarma', cod: 4 }).stare;
  assert.deepEqual([cauta4.pas, cauta4.motiv, cauta4.cod], ['esuat', 'deja-atinge', 4]);
  assert.equal(restaurarePalpare(cauta4), 'G1 G21 G90', 'căutarea a plecat: modul se pune la loc');
  const fin = pasPalpare(pasPalpare(s, ok('[PRB:0.000,0.000,-25.000:1]')).stare, ok()).stare;
  assert.equal(fin.pas, 'fin');
  const fin5 = pasPalpare(fin, { tip: 'alarma', cod: 5 }).stare;
  assert.deepEqual([fin5.motiv, fin5.cod], ['fara-contact', 5]);
  const retrage = pasPalpare(s, ok('[PRB:0.000,0.000,-25.000:1]')).stare;
  assert.deepEqual([pasPalpare(retrage, { tip: 'alarma', cod: 1 }).stare.motiv, pasPalpare(retrage, { tip: 'alarma', cod: 1 }).stare.cod], ['intrerupt', 1]);
  assert.deepEqual([pasPalpare(s, { tip: 'raspuns', date: [], rezultat: 20 }).stare.motiv, pasPalpare(s, { tip: 'raspuns', date: [], rezultat: 20 }).stare.cod], ['eroare', 20]);
  assert.equal(pasPalpare(s, { tip: 'raspuns', date: [], rezultat: 'pierdut' }).stare.motiv, 'intrerupt');
  assert.equal(pasPalpare(s, ok('[PRB:0.000,0.000,-25.000:0]')).stare.motiv, 'fara-contact');
  assert.equal(pasPalpare(fin, ok()).stare.motiv, 'fara-contact');

  const modal = pornestePalpare(P).stare;
  const faraGc = pasPalpare(modal, ok()).stare;
  assert.deepEqual([faraGc.pas, faraGc.motiv], ['esuat', 'citire']);
  assert.equal(restaurarePalpare(faraGc), null);
  const offset = pasPalpare(modal, ok('[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]')).stare;
  const faraTlo = pasPalpare(offset, ok('[G92:0.000,0.000,0.000]')).stare;
  assert.deepEqual([faraTlo.pas, faraTlo.motiv], ['esuat', 'citire']);
  assert.equal(restaurarePalpare(faraTlo), null, 'nimic schimbat: căutarea n-a plecat');
  assert.equal(pasPalpare(faraTlo, ok('[PRB:0.000,0.000,-25.000:1]')).stare, faraTlo, 'după eșec, nimic');
});

test('palparea: restaurarea pune mișcarea G0 / G1 / G80 la loc, altfel G0 (G2 sau G38.2 fără axe ar fi o eroare); unitățile și distanțele ca înainte', () => {
  const r = (gc: string) => restaurarePalpare(panaLaCautare(gc));
  assert.equal(r('[GC:G0 G54 G17 G20 G91 G94 M5 M9 T0 F0 S0]'), 'G0 G20 G91');
  assert.equal(r('[GC:G80 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]'), 'G80 G21 G90');
  assert.equal(r('[GC:G2 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]'), 'G0 G21 G90');
  assert.equal(r('[GC:G38.2 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]'), 'G0 G21 G90');
});

// ——— Prin sesiune, pe mașina simulată ———

async function conectata(placa?: { readonly z: number } | null) {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  const sim = deschideSimulata({ ceas, viteza: () => 100, ...(placa !== undefined ? { placa } : {}) });
  await s.conecteaza(sim);
  await ceas.avanseaza(400);
  return { ceas, s, sim, emu: sim.emulator };
}
async function pana(ceas: CeasFals, f: () => boolean, maxMs = 20_000): Promise<void> {
  for (let t = 0; t < maxMs && !f(); t += 50) await ceas.avanseaza(50);
  assert.ok(f(), 'condiția n-a venit');
}
const linii = (e: Parameters<typeof primitiFaraTimpReal>[0]): string[] => primitiFaraTimpReal(e).split('\n').filter((x) => x !== '');
/** Ce răspunde controlerul simulat la o citire, direct (fără sesiune). */
function citeste(e: Parameters<typeof primitiFaraTimpReal>[0], cmd: string): string[] {
  e.citeste();
  e.scrie(`${cmd}\n`);
  return e.citeste();
}
const palparea = (s: SesiuneMasina): StarePalpare | null => { const p = s.stare().procedura; return p?.fel === 'palpare' ? p.stare : null; };

test('la conectare, sesiunea își citește WCS-ul activ ($G) pe primul Idle, fără să-l scrie în jurnal', async () => {
  const { s, emu } = await conectata();
  assert.equal(s.stare().wcsActiv, 'G54');
  assert.deepEqual(linii(emu), ['$G']);
  assert.ok(!s.stare().jurnal.some((l) => l.text.startsWith('[GC:') || l.text === '$G'));
});

test('jog pe diagonală: o singură linie $J=, mașina ajunge în (10, 10); un jog lung se anulează cu 0x85 și se oprește pe loc', async () => {
  const { ceas, s, emu } = await conectata();
  assert.equal(s.jog({ X: 10, Y: 10 }, 300), true);
  await ceas.avanseaza(50);
  await pana(ceas, () => emu.stare === 'Idle' && s.stare().flux.raport?.stare === 'Idle');
  assert.deepEqual(emu.pozitie, { x: 10, y: 10, z: 0 });
  assert.equal(linii(emu).at(-1), '$J=G91 G21 X10.000 Y10.000 F300');

  assert.equal(s.jog({ Z: 100 }, 300), true);
  await pana(ceas, () => s.stare().flux.raport?.stare === 'Jog');
  s.anuleazaJog();
  await pana(ceas, () => emu.stare === 'Idle');
  const z = emu.pozitie.z;
  assert.ok(z > 0 && z < 100, `Z ${z}`);
  await ceas.avanseaza(1000);
  assert.equal(emu.pozitie.z, z, 'oprit pe loc, nu reluat');
  assert.ok(emu.transcriere().some((x) => x.dir === 'in' && x.text === '\x85'));
});

test('în alarmă (lecția ediției întâi: zero-ul pleca și primea error:9 tăcut): jog, zero, WCS, palparea se refuză în jurnal, cu motivul; nimic nu pleacă', async () => {
  const { ceas, s, emu } = await conectata();
  emu.alarma(3);
  await ceas.avanseaza(400);
  const inainte = linii(emu).length;
  assert.equal(s.jog({ X: 1 }, 300), false);
  assert.equal(s.zero(['X', 'Y'], 'G54'), false);
  assert.equal(s.zero(['Z'], 'G54'), false);
  assert.equal(s.alegeWcs('G55'), false);
  assert.equal(s.palpeaza({ ...P, wcs: 'G54' }), false);
  assert.deepEqual(s.stare().jurnal.filter((l) => l.fel === 'refuz').map((l) => [l.text, l.cod, l.motiv]),
    [['jog', 'miscare', 'alarma'], ['zero-xy', 'miscare', 'alarma'], ['zero-z', 'miscare', 'alarma'], ['wcs', 'miscare', 'alarma'], ['palpare', 'miscare', 'alarma']]);
  assert.equal(linii(emu).length, inainte);
  assert.equal(s.stare().procedura, null);
  assert.equal(s.motiv('zero-z'), 'alarma');
});

test('zero XY în G55 (nu în cel activ): G10 L20 P2; apoi G55 activ; o comandă G56 a omului și WCS-ul se citește din nou', async () => {
  const { ceas, s, emu } = await conectata();
  s.jog({ X: 10, Y: 20 }, 500);
  await ceas.avanseaza(50);
  await pana(ceas, () => emu.stare === 'Idle' && s.stare().flux.raport?.stare === 'Idle');
  assert.equal(s.zero(['X', 'Y'], 'G55'), true);
  await pana(ceas, () => s.stare().procedura?.fel === 'zero' && (s.stare().procedura as { rezultat: unknown }).rezultat !== 'in-curs');
  assert.deepEqual(s.stare().procedura, { fel: 'zero', axe: ['X', 'Y'], wcs: 'G55', rezultat: 'ok' });
  assert.equal(linii(emu).at(-1), 'G10 L20 P2 X0 Y0');
  await ceas.avanseaza(400);
  const p = citeste(emu, '$#');
  assert.ok(p.includes('[G54:0.000,0.000,0.000]'));
  assert.ok(p.includes('[G55:10.000,20.000,0.000]'));
  assert.equal(s.stare().wcsActiv, 'G54', 'zero-ul nu schimbă WCS-ul activ');

  assert.equal(s.alegeWcs('G55'), true);
  await pana(ceas, () => s.stare().wcsActiv === 'G55');
  assert.deepEqual(s.stare().procedura, { fel: 'wcs', wcs: 'G55', rezultat: 'ok' });
  await ceas.avanseaza(400);
  s.eveniment({ tip: 'manual', id: 'om-1', text: 'G56' });
  await pana(ceas, () => s.stare().wcsActiv === 'G56');
  assert.equal(linii(emu).slice(-2).join(' '), 'G56 $G', 'citit din nou, nu dedus din text');
});

test('palparea pe placa simulată (Z −25, grosimea 20) din Z 0: exact liniile, G54 Z = −45, mașina la Z −20 (lucru +25), starea modală la loc', async () => {
  const { ceas, s, emu } = await conectata();
  const start = linii(emu).length;
  assert.equal(s.palpeaza({ ...PALPARE_IMPLICITA, wcs: 'G54' }), true);
  assert.equal(s.motiv('jog'), 'procedura');
  await pana(ceas, () => palparea(s)?.pas === 'gata');
  await pana(ceas, () => linii(emu).at(-1) === 'G0 G21 G90');
  assert.deepEqual(linii(emu).slice(start), [
    '$G', '$#', 'G91 G21 G38.2 Z-30.000 F100', '$J=G91 G21 Z2.000 F500', 'G91 G21 G38.2 Z-3.000 F25', 'G10 L2 P1 Z-45.000',
    '$J=G91 G21 Z5.000 F500', 'G0 G21 G90',
  ]);
  const st = palparea(s);
  assert.deepEqual([st?.zAtingere, st?.zScris, st?.motiv], [-25, -45, null]);
  await pana(ceas, () => emu.stare === 'Idle');
  assert.ok(Math.abs(emu.pozitie.z + 20) < 1e-9);
  await ceas.avanseaza(400);
  assert.ok(citeste(emu, '$#').includes('[G54:0.000,0.000,-45.000]'));
  assert.ok(citeste(emu, '$G')[0]?.startsWith('[GC:G0 G54 G17 G21 G90 '));
  // Jurnalul arată ce a plecat la mașină, cu răspunsurile (și atingerile).
  const j = s.stare().jurnal.map((l) => l.text);
  assert.ok(j.includes('G91 G21 G38.2 Z-30.000 F100') && j.includes('[PRB:0.000,0.000,-25.000:1]') && j.includes('G0 G21 G90'));
});

test('palparea cu G92 Z10 activ și G20 G91 lăsate de om: Z0 tot pe material (lucru +25 la capăt), modul de dinainte la loc', async () => {
  const { ceas, s, emu } = await conectata();
  s.eveniment({ tip: 'manual', id: 'om-1', text: 'G92 Z10' });
  await ceas.avanseaza(400);
  s.eveniment({ tip: 'manual', id: 'om-2', text: 'G20 G91' });
  await ceas.avanseaza(400);
  assert.equal(s.palpeaza({ ...PALPARE_IMPLICITA, wcs: 'G54' }), true);
  await pana(ceas, () => palparea(s)?.pas === 'gata');
  await pana(ceas, () => linii(emu).at(-1) === 'G0 G20 G91');
  await pana(ceas, () => emu.stare === 'Idle');
  await ceas.avanseaza(400);
  // G92: −10 (Z 0 al mașinii era Z 10); G54 = −25 − 20 − (−10) = −35; WCO = −45; lucru = −20 − (−45) = 25.
  const p = citeste(emu, '$#');
  assert.ok(p.includes('[G54:0.000,0.000,-35.000]') && p.includes('[G92:0.000,0.000,-10.000]'), p.join(' '));
  assert.ok(Math.abs(emu.pozitie.z + 20) < 1e-9);
  const gc = citeste(emu, '$G')[0] ?? '';
  assert.ok(gc.includes(' G20 G91 '), gc);
});

test('palparea fără placă: ALARM:5, eșuată „fără contact”; modul se pune la loc abia după $X, pe Idle', async () => {
  const { ceas, s, emu } = await conectata(null);
  s.palpeaza({ ...PALPARE_IMPLICITA, wcs: 'G54' });
  await pana(ceas, () => palparea(s)?.pas === 'esuat');
  assert.deepEqual([palparea(s)?.motiv, palparea(s)?.cod], ['fara-contact', 5]);
  assert.ok(s.stare().jurnal.some((l) => l.fel === 'alarma' && l.text === 'ALARM:5'));
  await ceas.avanseaza(1000);
  assert.equal(emu.stare, 'Alarm');
  assert.notEqual(linii(emu).at(-1), 'G0 G21 G90', 'în alarmă, restaurarea așteaptă');
  s.eveniment({ tip: 'manual', id: 'om-1', text: '$X' });
  await pana(ceas, () => linii(emu).at(-1) === 'G0 G21 G90');
  assert.equal(linii(emu).at(-2), '$X');
  await ceas.avanseaza(400);
  assert.ok((citeste(emu, '$G')[0] ?? '').includes(' G21 G90 '));
});

test('palparea cu freza deja pe placă: ALARM:4, „atinsă dinainte”', async () => {
  const { ceas, s } = await conectata({ z: 0 });
  s.palpeaza({ ...PALPARE_IMPLICITA, wcs: 'G54' });
  await pana(ceas, () => palparea(s)?.pas === 'esuat');
  assert.deepEqual([palparea(s)?.motiv, palparea(s)?.cod], ['deja-atinge', 4]);
});

test('un zero care așteaptă Idle-ul (după un jog) și o repornire (Ctrl-X) între timp: zero-ul nu mai pleacă, e „pierdut”', async () => {
  const { ceas, s, emu } = await conectata();
  s.jog({ Z: 0.1 }, 1000);
  await ceas.avanseaza(10);
  assert.equal(emu.stare, 'Idle', 'jog-ul s-a terminat');
  assert.equal(s.stare().flux.proaspat, false, 'niciun raport după ok-ul jog-ului');
  assert.equal(s.zero(['Z'], 'G54'), true);
  assert.equal(linii(emu).at(-1), '$J=G91 G21 Z0.100 F1000', 'zero-ul așteaptă');
  s.eveniment({ tip: 'opreste' });
  await ceas.avanseaza(1000);
  assert.deepEqual(s.stare().procedura, { fel: 'zero', axe: ['Z'], wcs: 'G54', rezultat: 'pierdut' });
  assert.ok(!linii(emu).some((l) => l.startsWith('G10')), linii(emu).join(' | '));
});

test('cât ține palparea: pornirea programului se refuză; deconectarea o încheie „întreruptă”', async () => {
  const { ceas, s } = await conectata();
  const p = await incarcaProgram(octeti('G54\nG0 X1\n'), { sursa: 'fisier' });
  assert.ok(p.ok);
  if (!p.ok) return;
  s.eveniment({ tip: 'incarca', program: p.program });
  s.palpeaza({ ...PALPARE_IMPLICITA, wcs: 'G54' });
  await pana(ceas, () => palparea(s)?.pas === 'cauta');
  s.eveniment({ tip: 'start' });
  assert.equal(s.stare().flux.faza, 'pregatit');
  assert.deepEqual(s.stare().jurnal.at(-1), { fel: 'refuz', text: 'start', cod: 'miscare', motiv: 'procedura' });
  await s.deconecteaza();
  assert.deepEqual([palparea(s)?.pas, palparea(s)?.motiv], ['esuat', 'intrerupt']);
  assert.equal(s.stare().wcsActiv, null);
  assert.equal(s.motiv('palpare'), 'neconectat');
});

test('după un program în G55, WCS-ul activ se citește din nou (G55); după o repornire (Ctrl-X), iar (G54)', async () => {
  const { ceas, s } = await conectata();
  const p = await incarcaProgram(octeti('G90 G21\nG55\nG0 X1\n'), { sursa: 'fisier' });
  assert.ok(p.ok);
  if (!p.ok) return;
  s.eveniment({ tip: 'incarca', program: p.program });
  s.eveniment({ tip: 'start' });
  await pana(ceas, () => s.stare().flux.faza === 'terminat');
  await pana(ceas, () => s.stare().wcsActiv === 'G55');
  s.eveniment({ tip: 'opreste' });
  await ceas.avanseaza(50);
  assert.equal(s.stare().wcsActiv, null);
  await pana(ceas, () => s.stare().wcsActiv !== null);
  assert.equal(s.stare().wcsActiv, 'G54');
});
