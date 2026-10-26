/**
 * Schimbarea sculei de la post la mașină (ADR 0083, felia 3.8a), prin sesiune, pe mașina simulată (emulatorul GRBL 1.1h, placa
 * de contact): programul cu două scule se oprește la `T2 M6` (care nu pleacă la controler), cu axul oprit; acolo se palpează
 * din nou Z-ul (noua sculă e mai lungă: placa „urcă” cu 3 mm), apoi Continuă rulează blocul de după și restul programului, cu
 * Z0 cel nou. Valorile pe hârtie: placa la Z −25 (al mașinii), grosimea 20, deci Z0 = −45; cu scula mai lungă, −42.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXE_XYZ, type Miscare, type Program } from '../../src/ir/ir.ts';
import { deschideSimulata } from '../../src/machine/MasinaSimulata.ts';
import { PALPARE_IMPLICITA } from '../../src/machine/proceduri.ts';
import { incarcaProgram } from '../../src/machine/program.ts';
import { SesiuneMasina } from '../../src/machine/sesiune.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza, posteazaPeScule, type OptiuniPost } from '../../src/post/post.ts';
import type { StrategieScula } from '../../src/post/contract.ts';
import { CeasFals, octeti, primitiFaraTimpReal } from './ajutor-sender.ts';

const MONTAJ = { foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus' } as const;
const MISCARI: readonly Miscare[] = [
  { tip: 'rapida', la: { X: 20, Y: 20 } },
  { tip: 'taiere', la: { Z: -3 }, avans: 300 },
  { tip: 'taiere', la: { X: 60 }, avans: 500 },
  { tip: 'rapida', la: { Z: 5 } },
  { tip: 'schimba-scula', scula: { numar: 2, nume: 'freza plata', diametru: 3 }, turatie: 16000 },
  { tip: 'rapida', la: { X: 60, Y: 40 } },
  { tip: 'taiere', la: { Z: -1 }, avans: 300 },
  { tip: 'taiere', la: { X: 80 }, avans: 500 },
];
const PROGRAM: Program = { axe: AXE_XYZ, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, turatie: 18000, zSigur: 5, miscari: MISCARI };
const OPT: OptiuniPost = { asteptareAx: 3 };

async function conectata() {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  const sim = deschideSimulata({ ceas, viteza: () => 100 });
  await s.conecteaza(sim);
  await ceas.avanseaza(400);
  return { ceas, s, emu: sim.emulator };
}
async function pana(ceas: CeasFals, f: () => boolean, maxMs = 30_000): Promise<void> {
  for (let t = 0; t < maxMs && !f(); t += 50) await ceas.avanseaza(50);
  assert.ok(f(), 'condiția n-a venit');
}
async function palpeaza(ceas: CeasFals, s: SesiuneMasina): Promise<void> {
  assert.equal(s.palpeaza({ ...PALPARE_IMPLICITA, wcs: 'G54' }), true, s.motiv('palpare') ?? '');
  await pana(ceas, () => { const p = s.stare().procedura; return p?.fel === 'palpare' && (p.stare.pas === 'gata' || p.stare.pas === 'esuat'); });
  const p = s.stare().procedura;
  assert.ok(p?.fel === 'palpare' && p.stare.pas === 'gata', JSON.stringify(p));
  await pana(ceas, () => s.stare().flux.raport?.stare === 'Idle' && s.stare().flux.coada.length === 0 && s.stare().flux.inZbor.length === 0);
  await ceas.avanseaza(400);
}
/** Ca omul de la mașină: freza sus (la Z sigur e sub fața unei plăci de 20 mm, iar palparea ar da ALARM:4), apoi placa. */
async function ridica(ceas: CeasFals, s: SesiuneMasina, emu: ReturnType<typeof deschideSimulata>['emulator']): Promise<void> {
  assert.equal(s.jog({ Z: 30 }, 500), true, s.motiv('jog') ?? '');
  await ceas.avanseaza(50);
  await pana(ceas, () => emu.stare === 'Idle' && s.stare().flux.raport?.stare === 'Idle' && s.stare().flux.inZbor.length === 0);
  await ceas.avanseaza(400);
}
async function incarca(s: SesiuneMasina, text: string): Promise<void> {
  const r = await incarcaProgram(octeti(text), { sursa: 'export' });
  assert.ok(r.ok, r.ok ? '' : `${r.cod} ${r.linie}`);
  if (r.ok) s.eveniment({ tip: 'incarca', program: r.program });
}
/** Decalajul Z al lui G54, citit direct de la controlerul simulat. */
function zG54(emu: ReturnType<typeof deschideSimulata>['emulator']): number {
  emu.citeste();
  emu.scrie('$#\n');
  const l = emu.citeste().find((x) => x.startsWith('[G54:')) ?? '';
  return Number(l.slice(1, -1).split(':')[1]?.split(',')[2]);
}

for (const strategieScula of ['bariera-sender', 'm0-comentariu'] as const satisfies readonly StrategieScula[]) {
  test(`${strategieScula}: oprirea la schimbare, axul oprit, palparea noii scule, Continuă, blocul de după și Z0 cel nou (−42)`, async () => {
    const { ceas, s, emu } = await conectata();
    await palpeaza(ceas, s);
    assert.ok(Math.abs(zG54(emu) + 45) < 1e-9);
    const r = posteaza(PROGRAM, MONTAJ, GRBL_11, { ...OPT, strategieScula });
    assert.ok(r.ok);
    if (!r.ok) return;
    await incarca(s, r.text);
    const inainte = primitiFaraTimpReal(emu).length;
    s.eveniment({ tip: 'start' });
    await pana(ceas, () => s.stare().flux.faza === 'bariera');
    assert.equal(s.stare().flux.bariera?.m6, strategieScula === 'bariera-sender');
    assert.equal(emu.ax, 0, 'axul e oprit la schimbare');
    assert.equal(emu.stare, 'Idle');
    // Noua sculă e cu 3 mm mai lungă: atinge placa cu 3 mm mai sus. Jog-ul și palparea merg la oprire (ADR 0082).
    emu.placa = { z: -22 };
    await ridica(ceas, s, emu);
    await palpeaza(ceas, s);
    assert.ok(Math.abs(zG54(emu) + 42) < 1e-9);
    s.eveniment({ tip: 'continua' });
    await pana(ceas, () => s.stare().flux.faza === 'terminat');
    assert.deepEqual(s.stare().flux.erori, []);
    const primite = primitiFaraTimpReal(emu).slice(inainte).split('\n');
    // Linia de schimbare nu pleacă niciodată la controler; blocul de după, da, înaintea tăierilor noii scule.
    assert.ok(!primite.some((l) => /M6|^M0$/.test(l.replace(/\([^)]*\)/g, ''))), primite.join(' | '));
    const k = primite.indexOf('M3 S16000');
    assert.deepEqual(primite.slice(k - 4, k + 4), ['G90 G17 G21 G94', 'G40 G49 G80', 'G54', 'G0 Z5.000', 'M3 S16000', 'G4 P3.000', 'G0 X60.000 Y40.000', 'G1 Z-1.000 F300.0']);
    // La capăt: Z sigur (5) față de Z0 cel nou, deci −42 + 5 = −37 al mașinii.
    await pana(ceas, () => emu.stare === 'Idle');
    assert.ok(Math.abs(emu.pozitie.z + 37) < 1e-9, `Z ${emu.pozitie.z}`);
    assert.deepEqual([emu.pozitie.x, emu.pozitie.y], [80, 40]);
  });
}

test('fișiere separate: primul fișier (T1) până la gata, palparea noii scule, al doilea (T2) până la gata, cu Z0 cel nou', async () => {
  const { ceas, s, emu } = await conectata();
  await palpeaza(ceas, s);
  const r = posteazaPeScule(PROGRAM, MONTAJ, GRBL_11, OPT);
  assert.ok(r.ok && r.fisiere.length === 2);
  if (!r.ok) return;
  for (const [k, f] of r.fisiere.entries()) {
    if (k > 0) { emu.placa = { z: -22 }; await ridica(ceas, s, emu); await palpeaza(ceas, s); }
    await incarca(s, f.text);
    s.eveniment({ tip: 'start' });
    await pana(ceas, () => s.stare().flux.faza === 'terminat');
    assert.deepEqual(s.stare().flux.erori, [], `fișierul ${k + 1}`);
    await ceas.avanseaza(400);
  }
  assert.ok(Math.abs(zG54(emu) + 42) < 1e-9);
  await pana(ceas, () => emu.stare === 'Idle');
  assert.ok(Math.abs(emu.pozitie.z + 37) < 1e-9, `Z ${emu.pozitie.z}`);
});
