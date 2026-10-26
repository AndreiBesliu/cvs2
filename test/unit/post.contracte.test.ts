/**
 * Postul condus de contracte (ADR 0083, felia 3.8a): contractele familiei GRBL ca date (GRBL 1.1, grblHAL, FluidNC), inch cu
 * 5 zecimale (pe hârtie, apoi aceleași mișcări pe emulator), elicea doar unde contractul o declară, pauza în unitatea
 * controlerului și schimbarea sculei cu cele 4 strategii și blocul de după `M6` (`docs/PORTARE.md` §3.4).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profil } from '../../src/cam/profil.ts';
import { traseuProfil } from '../../src/cam/traseu.ts';
import { conturCerc, conturDreptunghi } from '../../src/geom/conturBaza.ts';
import type { Contur } from '../../src/geom/contur.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../../src/ir/ir.ts';
import type { Montaj } from '../../src/ir/montaj.ts';
import { iesireDinFoaie } from '../../src/cam/iesire.ts';
import { EmulatorGrbl } from '../../src/machine/emulator.ts';
import { fluxNou, pas } from '../../src/machine/flux.ts';
import { incarcaProgram } from '../../src/machine/program.ts';
import type { Contract } from '../../src/post/contract.ts';
import { CONTRACTE, ID_CONTRACTE, esteIdContract } from '../../src/post/contracte/index.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { GRBLHAL } from '../../src/post/contracte/grblhal.ts';
import { posteaza, posteazaPeScule, TOLERANTA_APROXIMARE } from '../../src/post/post.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { octeti, ruleaza } from './ajutor-sender.ts';

const FOAIA = { latime: 300, inaltime: 200, grosime: 18 };
const MONTAJ: Montaj = { foaie: FOAIA, origine: 'stanga-jos', z0: 'sus' };
const T1: Scula = { numar: 1, nume: 'freza plata', diametru: 6 };
const T2: Scula = { numar: 2, nume: 'freza plata', diametru: 3 };
const OPT = { asteptareAx: 3 };
const program = (miscari: readonly Miscare[], scula: Scula = T1): Program => ({ axe: AXE_XYZ, scula, turatie: 18000, zSigur: 5, miscari });

function traseu(c: Contur, latura: 'exterior' | 'interior', adancime: number, pasZ: number, d = 6): Miscare[] {
  const p = profil(c, { latura, sens: 'urcare', diametruScula: d, adancime, pas: pasZ });
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  if (!p.ok) return [];
  const t = traseuProfil(p.treceri, { zSigur: 5, avans: 1000, avansPlonjare: 300 });
  assert.ok(t.ok, t.ok ? '' : t.motiv);
  return t.ok ? [...t.miscari] : [];
}
function text(p: Program, k: Contract = GRBL_11, opt: Parameters<typeof posteaza>[3] = OPT): string {
  const r = posteaza(p, MONTAJ, k, opt);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  return r.ok ? r.text : '';
}

// ——— Contractele ca date ———

test('contractele familiei GRBL: plafonul 70, 3 / 5 zecimale, unitățile în antet, implicita acceptată, codurile scrise de post, sursele', () => {
  assert.deepEqual(ID_CONTRACTE, ['grbl-11', 'grblhal', 'fluidnc']);
  assert.ok(esteIdContract('grblhal') && !esteIdContract('mach3') && !esteIdContract('toString'));
  for (const id of ID_CONTRACTE) {
    const k: Contract = CONTRACTE[id];
    assert.equal(k.liniaMaxima, 70, id);
    assert.deepEqual([k.zecimaleMm, k.zecimaleInch, k.unitati.mm, k.unitati.inch], [3, 5, 'G21', 'G20'], id);
    assert.ok(k.antet.some((l) => l.includes('{unitati}')), id);
    assert.ok(k.scula.acceptate.includes(k.scula.implicita), id);
    assert.ok(k.scula.acceptate.includes('bariera-sender') && k.scula.acceptate.includes('fisiere-separate'), id);
    for (const g of ['G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G20', 'G21', 'G40', 'G49', 'G54', 'G80', 'G90', 'G94']) assert.ok(k.coduriG.includes(g), `${id}: ${g}`);
    for (const m of ['M3', 'M5', 'M30']) assert.ok(k.coduriM.includes(m), `${id}: ${m}`);
    if (k.scula.acceptate.includes('m0-comentariu')) assert.ok(k.coduriM.includes('M0'), `${id}: M0`);
    // M6 ajunge la controler doar cu `m6-controler`; cu bariera senderului nu pleacă niciodată.
    assert.equal(k.coduriM.includes('M6'), k.scula.acceptate.includes('m6-controler'), `${id}: M6`);
    for (const camp of ['zecimale', 'unitati', 'elice', 'comentariu', 'liniaMaxima', 'pauza', 'arc', 'antet', 'wcs', 'scula', 'coduri']) {
      assert.ok(k.surse[camp], `${id}: sursa câmpului ${camp}`);
    }
  }
  // GRBL 1.1 dă error:20 la M6: strategia „M6 la controler” nu e a lui.
  assert.ok(!GRBL_11.scula.acceptate.includes('m6-controler'));
  assert.deepEqual(GRBL_11.axe, ['X', 'Y', 'Z']);
  assert.deepEqual(GRBLHAL.axe, ['X', 'Y', 'Z', 'A']);
});

test('același program pe cele trei contracte: în v1, doar comentariul postului diferă (dialectul familiei e același)', () => {
  const p = program(traseu(conturCerc(150, 100, 20), 'interior', 6, 3));
  const [a, b, c] = ID_CONTRACTE.map((id) => text(p, CONTRACTE[id]).split('\n'));
  assert.ok(a && b && c);
  assert.equal(a[1], '(post GRBL 1.1)');
  assert.equal(b[1], '(post grblHAL)');
  assert.equal(c[1], '(post FluidNC)');
  assert.deepEqual([...b.slice(0, 1), ...b.slice(2)], [...a.slice(0, 1), ...a.slice(2)]);
  assert.deepEqual([...c.slice(0, 1), ...c.slice(2)], [...a.slice(0, 1), ...a.slice(2)]);
});

// ——— Inch ———

test('inch, pe hârtie: G20 în antet, 5 zecimale, punctul (20, 20) e X0.78740 Y0.78740, Z −3 e Z-0.11811, 1000 mm/min e F39.370', () => {
  const p = program([
    { tip: 'rapida', la: { X: 20, Y: 20 } },
    { tip: 'taiere', la: { Z: -3 }, avans: 300 },
    { tip: 'taiere', la: { X: 45.4 }, avans: 1000 },
    { tip: 'arc', la: { X: 70.8, Y: 20 }, centru: { x: 58.1, y: 20 }, sens: 'orar', avans: 1000 },
  ]);
  const t = text(p, GRBL_11, { ...OPT, unitati: 'inch' }).split('\n');
  assert.equal(t[4], 'G90 G17 G20 G94');
  assert.ok(t.includes('G0 Z0.19685'), 'Z sigur 5 mm');
  assert.ok(t.includes('G0 X0.78740 Y0.78740'));
  assert.ok(t.includes('G1 Z-0.11811 F11.811'));
  assert.ok(t.includes('G1 X1.78740 F39.370'));
  // Arcul: de la 45,4 la 70,8 (25,4 mm = 1 inch), centrul la 0,5 inch: I0.50000 J0.00000.
  assert.ok(t.includes('G2 X2.78740 Y0.78740 I0.50000 J0.00000'), t.join('\n'));
  // Comentariile antetului rămân în mm (le citește omul).
  assert.equal(t[2], '(origine stanga-jos, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm)');
  assert.equal(text(p).split('\n')[4], 'G90 G17 G21 G94');
});

/** Numerele unei linii, pe litere (`X`, `Y`, `Z`, `I`, `J`, `F`, …). */
const numere = (l: string): Map<string, number> => new Map([...l.replace(/\([^)]*\)/g, '').matchAll(/([A-Z])(-?[\d.]+)/g)].map((m) => [m[1] ?? '', Number(m[2])]));

test('inch = mm / 25,4 pe fiecare cuvânt al unui program cu arce (cerc, dreptunghi rotunjit, două treceri), în rotunjirea fiecăruia', () => {
  const p = program([...traseu(conturCerc(150, 100, 37.3), 'interior', 8, 4), ...traseu(conturDreptunghi(20, 20, 110, 70, 9.7), 'exterior', 8, 4)]);
  const mm = text(p).split('\n'), inch = text(p, GRBL_11, { ...OPT, unitati: 'inch' }).split('\n');
  assert.equal(inch.length, mm.length);
  let cuvinte = 0;
  for (const [k, lm] of mm.entries()) {
    const li = inch[k] ?? '';
    if (lm.startsWith('(') || lm.startsWith('G90')) continue;
    const a = numere(lm), b = numere(li);
    assert.deepEqual([...b.keys()], [...a.keys()], `${lm} | ${li}`);
    for (const [litera, v] of a) {
      const w = b.get(litera) ?? Number.NaN;
      if ('XYZIJ'.includes(litera)) assert.ok(Math.abs(w * 25.4 - v) <= 25.4 * 0.5e-5 + 0.5e-3 + 1e-12, `${litera}: ${lm} | ${li}`);
      else if (litera === 'F') assert.ok(Math.abs(w * 25.4 - v) <= 25.4 * 0.5e-3 + 0.05 + 1e-9, `F: ${lm} | ${li}`);
      else assert.equal(w, v, `${litera}: ${lm} | ${li}`);
      cuvinte++;
    }
  }
  assert.ok(cuvinte > 100, `${cuvinte} cuvinte comparate`);
});

test('inch pe emulator: 300 de arce aleatoare (raze 0,5–400 mm), zero error:33 după rotunjire; capătul ca al programului în mm', async () => {
  let sem = 20261026;
  const rnd = (): number => { sem = (sem * 1103515245 + 12345) % 2147483648; return sem / 2147483648; };
  const miscari: Miscare[] = [{ tip: 'rapida', la: { X: 150, Y: 100 } }, { tip: 'taiere', la: { Z: -1 }, avans: 300 }];
  let x = 150, y = 100;
  for (let k = 0; k < 300; k++) {
    const r = 0.5 + rnd() ** 3 * 400, u = rnd() * 2 * Math.PI, b = (rnd() - 0.5) * 3;
    const cx = x - r * Math.cos(u), cy = y - r * Math.sin(u);
    const nx = cx + r * Math.cos(u + b), ny = cy + r * Math.sin(u + b);
    miscari.push({ tip: 'arc', la: { X: nx, Y: ny }, centru: { x: cx, y: cy }, sens: b > 0 ? 'trigonometric' : 'orar', avans: 3000 });
    x = nx; y = ny;
  }
  const p = program(miscari);
  const capete: { x: number; y: number }[] = [];
  for (const unitati of ['mm', 'inch'] as const) {
    const t = text(p, GRBL_11, { ...OPT, unitati });
    const inc = await incarcaProgram(octeti(t), { sursa: 'export' });
    assert.ok(inc.ok);
    if (!inc.ok) return;
    const emu = new EmulatorGrbl();
    const rul = ruleaza(emu, pas(fluxNou(), { tip: 'incarca', program: inc.program }).stare, { evenimente: [{ la: 0, e: { tip: 'start' } }], tic: 200, pasMs: 20 });
    assert.equal(rul.stare.faza, 'terminat', unitati);
    assert.deepEqual(rul.stare.erori, [], unitati);
    capete.push(emu.pozitie);
  }
  const [a, b] = capete;
  assert.ok(a && b && Math.hypot(a.x - b.x, a.y - b.y) < 1e-3, JSON.stringify(capete));
});

// ——— Elicea și pauza ———

test('elicea: G2 / G3 cu Z unde contractul o declară; altfel segmente G1 cu Z, la cel mult 0,001 mm de elice, declarate', () => {
  const elice: Miscare[] = [
    { tip: 'rapida', la: { X: 160, Y: 100 } },
    { tip: 'taiere', la: { Z: 0 }, avans: 300 },
    { tip: 'arc', la: { X: 160, Y: 100, Z: -2 }, centru: { x: 150, y: 100 }, sens: 'trigonometric', avans: 800 },
  ];
  const cu = text(program(elice)).split('\n').filter((l) => /^G[23] /.test(l));
  assert.deepEqual(cu, ['G3 X140.000 Y100.000 Z-1.000 I-10.000 J0.000 F800.0', 'G3 X160.000 Y100.000 Z-2.000 I10.000 J0.000']);
  const fara = posteaza(program(elice), MONTAJ, { ...GRBL_11, elice: false }, OPT);
  assert.ok(fara.ok);
  if (!fara.ok) return;
  const linii = fara.text.split('\n');
  assert.ok(!linii.some((l) => /^G[23] /.test(l)));
  assert.equal(fara.aproximari, 2, 'cele două bucăți de 180°');
  let z0 = 0;
  for (const l of linii.filter((x) => /^G1 X/.test(x))) {
    const v = numere(l), px = v.get('X') ?? 0, py = v.get('Y') ?? 0, pz = v.get('Z') ?? Number.NaN;
    assert.ok(Math.abs(Math.hypot(px - 150, py - 100) - 10) <= TOLERANTA_APROXIMARE + 0.0005, l);
    assert.ok(pz < z0, `Z coboară: ${l}`);
    z0 = pz;
  }
  assert.equal(z0, -2);
  // Un arc fără Z rămâne arc și pe un contract fără elice.
  assert.ok(text(program(elice.slice(0, 2).concat([{ tip: 'arc', la: { X: 140, Y: 100 }, centru: { x: 150, y: 100 }, sens: 'trigonometric', avans: 800 }])), { ...GRBL_11, elice: false })
    .includes('G3 X140.000 Y100.000 I-10.000 J0.000'));
});

test('pauza în unitatea controlerului: G4 P3.000 în secunde (GRBL), G4 P3000 în ms (un contract în ms); și cea din program', () => {
  const p = program([{ tip: 'rapida', la: { X: 1, Y: 1 } }, { tip: 'pauza', secunde: 1.5 }]);
  assert.ok(text(p).split('\n').includes('G4 P3.000'));
  const ms = text(p, { ...GRBL_11, pauza: { cuvant: 'G4 P', unitate: 'ms' } }).split('\n');
  assert.ok(ms.includes('G4 P3000') && ms.includes('G4 P1500'), ms.join('\n'));
});

// ——— Schimbarea sculei ———

const DOUA_SCULE: readonly Miscare[] = [
  { tip: 'rapida', la: { X: 20, Y: 20 } },
  { tip: 'taiere', la: { Z: -3 }, avans: 300 },
  { tip: 'taiere', la: { X: 60 }, avans: 1000 },
  { tip: 'rapida', la: { Z: 5 } },
  { tip: 'schimba-scula', scula: T2, turatie: 16000 },
  { tip: 'rapida', la: { X: 60, Y: 20 } },
  { tip: 'taiere', la: { Z: -1 }, avans: 300 },
  { tip: 'taiere', la: { X: 80 }, avans: 1000 },
];

test('bariera senderului (implicit): sus, M5, scula numită, `T2 M6`, apoi blocul de după: modalul, WCS-ul, Z sigur, axul cu turația noii scule și pauza; XY și F scrise din nou', () => {
  const t = text(program(DOUA_SCULE)).split('\n');
  assert.equal(t[4], '(scula: oprire in senderul CNC Vector Studio, M6 nu pleaca)');
  const i = t.indexOf('T2 M6');
  assert.deepEqual(t.slice(i - 2, i + 12), [
    'M5', '(scula T2 freza plata D3.000)', 'T2 M6',
    'G90 G17 G21 G94', 'G40 G49 G80', 'G54', 'G0 Z5.000', 'M3 S16000', 'G4 P3.000',
    // Aceeași poziție XY ca înainte de schimbare se scrie totuși: omul a mutat freza.
    'G0 X60.000 Y20.000', 'G1 Z-1.000 F300.0', 'G1 X80.000 F1000.0', 'G0 Z5.000', 'M5',
  ]);
  // Z sigur l-a scris deja programul (ridicarea dinaintea schimbării): nu se scrie de două ori.
  assert.deepEqual(t.slice(i - 4, i - 2), ['G1 X60.000 F1000.0', 'G0 Z5.000']);
  // Fără ridicarea din program, postul urcă singur înainte de M5.
  const fara = text(program(DOUA_SCULE.filter((_, k) => k !== 3))).split('\n');
  const j = fara.indexOf('T2 M6');
  assert.deepEqual(fara.slice(j - 4, j), ['G1 X60.000 F1000.0', 'G0 Z5.000', 'M5', '(scula T2 freza plata D3.000)']);
  // F se scrie din nou după schimbare chiar dacă e același ca înainte (PORTARE §3.4, pasul 5): omul putea să-l schimbe.
  const acelasiF = text(program([...DOUA_SCULE.slice(0, 6), { tip: 'taiere', la: { Z: -1 }, avans: 1000 }])).split('\n');
  assert.equal(acelasiF[acelasiF.indexOf('G0 X60.000 Y20.000') + 1], 'G1 Z-1.000 F1000.0');
  // Un program cu o singură sculă nu primește comentariul strategiei.
  assert.ok(!text(program(DOUA_SCULE.slice(0, 4))).includes('oprire in senderul'));
});

test('M0 cu comentariu: scula în comentariu, apoi M0; M6 la controler: refuzat pe GRBL 1.1 (error:20), `T2 M6` pe grblHAL', () => {
  const m0 = text(program(DOUA_SCULE), GRBL_11, { ...OPT, strategieScula: 'm0-comentariu' }).split('\n');
  const i = m0.indexOf('M0');
  assert.deepEqual(m0.slice(i - 2, i + 2), ['M5', '(SCHIMBA SCULA: T2 freza plata D3.000, apoi zero Z)', 'M0', 'G90 G17 G21 G94']);
  assert.ok(!m0.some((l) => /M6/.test(l)));
  assert.equal(m0[4], '(scula: M0, cu scula in comentariu)');
  const r = posteaza(program(DOUA_SCULE), MONTAJ, GRBL_11, { ...OPT, strategieScula: 'm6-controler' });
  assert.deepEqual(r, { ok: false, motiv: 'GRBL 1.1 nu acceptă schimbarea sculei „m6-controler”' });
  const hal = text(program(DOUA_SCULE), GRBLHAL, { ...OPT, strategieScula: 'm6-controler' }).split('\n');
  assert.ok(hal.includes('T2 M6'));
  assert.equal(hal[4], '(scula: M6 la controler)');
});

test('fișiere separate: câte un program întreg pe sculă, fiecare cu turația și finalul lui; prin `posteaza`, refuzat; o parte fără tăieri nu devine fișier', () => {
  const r = posteazaPeScule(program(DOUA_SCULE), MONTAJ, GRBL_11, OPT);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.fisiere.map((f) => f.scula.numar), [1, 2]);
  const [a, b] = r.fisiere.map((f) => f.text.split('\n'));
  assert.ok(a && b);
  assert.equal(a[3], '(scula T1 freza plata D6.000)');
  assert.equal(b[3], '(scula T2 freza plata D3.000)');
  assert.ok(a.includes('M3 S18000') && b.includes('M3 S16000') && !b.includes('M3 S18000'));
  for (const f of [a, b]) {
    assert.ok(!f.some((l) => /M6|M0\b/.test(l)));
    assert.deepEqual(f.slice(-3), ['M5', 'M30', '']);
  }
  assert.deepEqual(posteaza(program(DOUA_SCULE), MONTAJ, GRBL_11, { ...OPT, strategieScula: 'fisiere-separate' }),
    { ok: false, motiv: 'cu fișiere separate pe sculă, programul se scrie cu posteazaPeScule' });
  // Schimbarea chiar la început: scula de antet n-are tăieri, deci un singur fișier, al lui T2.
  const laInceput = posteazaPeScule(program(DOUA_SCULE.slice(4)), MONTAJ, GRBL_11, OPT);
  assert.ok(laInceput.ok && laInceput.fisiere.length === 1 && laInceput.fisiere[0]?.scula.numar === 2);
  assert.deepEqual(posteazaPeScule(program([{ tip: 'rapida', la: { X: 1, Y: 1 } }]), MONTAJ, GRBL_11, OPT), { ok: false, motiv: 'programul n-are nicio tăiere' });
  assert.deepEqual(posteazaPeScule(program(DOUA_SCULE), MONTAJ, { ...GRBL_11, scula: { implicita: 'bariera-sender', acceptate: ['bariera-sender'] } }, OPT),
    { ok: false, motiv: 'GRBL 1.1 nu acceptă fișiere separate pe sculă' });
  const gresit = posteazaPeScule(program(DOUA_SCULE.map((m) => (m.tip === 'schimba-scula' ? { ...m, turatie: 0 } : m))), MONTAJ, GRBL_11, OPT);
  assert.deepEqual(gresit, { ok: false, motiv: 'T2: turație nevalidă: 0' });
});

test('numărul sculei: un întreg între 0 și 255 (GRBL: error:38 peste); turația noii scule, un întreg pozitiv', () => {
  const cu = (s: Partial<Scula>, turatie = 16000) => posteaza(program(DOUA_SCULE.map((m) => (m.tip === 'schimba-scula' ? { ...m, scula: { ...T2, ...s }, turatie } : m))), MONTAJ, GRBL_11, OPT);
  assert.ok(cu({ numar: 255 }).ok && cu({ numar: 0 }).ok);
  assert.deepEqual(cu({ numar: 256 }), { ok: false, motiv: 'numărul sculei T256 nu e între 0 și 255' });
  assert.deepEqual(cu({ numar: -1 }), { ok: false, motiv: 'numărul sculei T-1 nu e între 0 și 255' });
  assert.deepEqual(cu({ numar: 1.5 }), { ok: false, motiv: 'numărul sculei T1.5 nu e între 0 și 255' });
  assert.deepEqual(cu({}, 1.5), { ok: false, motiv: 'turație nevalidă: 1.5' });
});

test('după o schimbare: ieșirea din foaie se măsoară cu discul noii scule; simularea o refuză, cu motiv (o singură sculă, până la 3.8b)', () => {
  // T2 cu Ø20 taie la 5 mm de marginea stângă: discul iese cu 5 mm; cu Ø6 n-ar ieși.
  const mare: Scula = { numar: 2, nume: 'freza mare', diametru: 20 };
  const p = program([
    { tip: 'rapida', la: { X: 50, Y: 50 } }, { tip: 'taiere', la: { Z: -1 }, avans: 300 }, { tip: 'taiere', la: { X: 60 }, avans: 1000 },
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'schimba-scula', scula: mare, turatie: 12000 },
    { tip: 'rapida', la: { X: 5, Y: 50 } }, { tip: 'taiere', la: { Z: -1 }, avans: 300 }, { tip: 'taiere', la: { Y: 60 }, avans: 1000 },
  ]);
  const ies = iesireDinFoaie(p, FOAIA);
  assert.ok(ies && Math.abs(ies.depasire.stanga - 5) < 1e-9, JSON.stringify(ies?.depasire));
  assert.equal(iesireDinFoaie({ ...p, miscari: p.miscari.filter((m) => m.tip !== 'schimba-scula') }, FOAIA), null);
  const s = pregatesteProgram({ ...p, miscari: [{ tip: 'rapida', la: { Z: 5 } }, ...p.miscari] }, 0);
  assert.deepEqual(s.ok ? null : s.motiv, 'schimbarea sculei nu se simulează încă (o singură sculă pe program)');
});
