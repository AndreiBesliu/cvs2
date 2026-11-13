/**
 * Fundul doar cu freza V (ADR 0173, din ADR 0170 §4), pe oracolul potrivirii (`test/oracles/incrustatie.ts`): cazurile în V de
 * pe hârtie (`incrustatie.cazuri.ts`), fără freză dreaptă (coloana Fund plat goală). Contractul, scris aici din nou din ADR
 * (t = tan(θ/2), S = D − g):
 * - dopul se oprește tot la S, cu pereții în contact pe cel puțin 95 %;
 * - fundul locașului îl fac inelele frezei V, la g·t unul de altul: creasta cel mult g/2, deci sub dop rămân între g/2 și g;
 * - fața coborâtă a dopului, cu inelele la H·t: creasta cel mult H/2, deci între plăci rămân între H/2 și H;
 * - unde fundul e mai lat decât un inel, creasta chiar există (nu e fundul plat de altă dată);
 * - fără freză dreaptă, niciun schimb de sculă: locașul și dopul doar cu freza V.
 * Banda (ADR 0172) fără freza fundului plat: fundul benzii tot cu inelele V, decuparea cu freza ei (T3 Ø3); fără freza
 * decupării, refuzul spune ce să alegi. Peste 400 de inele într-o regiune, refuzul, cu sfatul. Un V-carve obișnuit (fără
 * incrustație) rămâne ca înainte: fundul lui nu-l fac inelele.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { traseuVcarve } from '../../src/cam/vcarve.ts';
import { masoaraPotrivirea, type MasuraPotrivire } from '../oracles/incrustatie.ts';
import { CAZURI_INCRUSTATIE, type CazIncrustatie } from '../oracles/incrustatie.cazuri.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { documentCaz } from './ajutor-incrustatie.ts';

const TOL = 0.05;
/** Cât poate coborî jocul măsurat sub creasta de pe hârtie din eșantionarea grilei și a simulării (mm). */
const TOL_CREASTA = 0.01;
const CELULA = 0.1;
const tan = (c: CazIncrustatie): number => Math.tan((c.v.unghi * Math.PI) / 360);

type Op = { fundPlat?: unknown; incrustatie?: Record<string, unknown> };
/** Documentul cazului fără freză dreaptă (coloana Fund plat goală); cu banda, la cerere. */
function faraFund(c: CazIncrustatie, banda?: Record<string, unknown>, cuIncrustatie = true): unknown {
  const d = documentCaz(c, cuIncrustatie) as { schema: number; piese: { operatii: Op[] }[] };
  const op = d.piese[0]!.operatii[0]!;
  delete op.fundPlat;
  if (banda) {
    d.schema = 22;
    op.incrustatie!['jurDop'] = 'banda';
    op.incrustatie!['banda'] = banda;
  }
  return d;
}

const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};

/** Sculele unui program: freza V la pornire (fără freză dreaptă, pornește cu ea), apoi, după `T3 M6`, freza decupării Ø3. */
function scule(text: string, c: CazIncrustatie): SculaOracol[] {
  const v: SculaOracol = { tip: 'v', diametru: c.v.diametru, unghi: c.v.unghi };
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  return [v, ...m6.map((n): SculaOracol => (n === 2 ? v : { tip: 'plata', diametru: 3 }))];
}

async function potrivire(c: CazIncrustatie): Promise<{ readonly m: MasuraPotrivire; readonly locas: string; readonly dop: string; readonly av: readonly string[] }> {
  const r = await calculeazaExport(deschis(faraFund(c)), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  assert.equal(r.dopuri.length, 1, `${c.id}: un singur dop`);
  const locas = r.program.text, dop = r.dopuri[0]!.program.text;
  const m = masoaraPotrivirea(
    { text: locas, scule: scule(locas, c) }, { text: dop, scule: scule(dop, c) }, c.desen,
    { D: c.D, g: c.g, H: c.H, margine: c.margine, unghi: c.v.unghi, celula: CELULA, lat: Math.min(c.margine, c.H * tan(c) + 1) },
  );
  return { m, locas, dop, av: r.avertismente };
}

/** Cazurile cu fundul mai lat decât un inel al locașului (pe hârtie): acolo creasta trebuie să existe. */
const CU_CREASTA = new Set(['dreptunghi', 'deskproto-cerc', 'L']);

for (const c of CAZURI_INCRUSTATIE) {
  test(`fundul doar cu freza V, ${c.id}: oprirea la S, contactul, sub dop între g/2 și g, între plăci între H/2 și H, doar freza V`, async () => {
    const { m, locas, dop } = await potrivire(c);
    const S = c.D - c.g;
    const unde = `${c.id}: oprirea ${m.asezare.toFixed(4)}; contactul ${(m.contact * 100).toFixed(1)} % din ${m.nContact}; sub ${JSON.stringify(m.sub)}; între ${JSON.stringify(m.intre)}`;
    assert.ok(Math.abs(m.asezare - S) <= TOL, `oprirea la S = ${S}: ${unde}`);
    assert.ok(m.nContact > 0 && m.contact >= 0.95, `pereții în contact pe cel puțin 95 %: ${unde}`);
    if (c.fundPlat) {
      assert.ok(m.sub.n > 0, `fundul are celule: ${unde}`);
      assert.ok(m.sub.min >= c.g / 2 - TOL_CREASTA && m.sub.max <= c.g + TOL, `sub dop între g/2 = ${c.g / 2} și g = ${c.g}: ${unde}`);
      if (CU_CREASTA.has(c.id)) assert.ok(m.sub.min < c.g - TOL, `fundul lat are creasta inelelor (nu e plat): ${unde}`);
    } else {
      assert.equal(m.sub.n, 0, `fără fund: ${unde}`);
    }
    assert.ok(m.intre.n > 0 && m.intre.min >= c.H / 2 - TOL_CREASTA && m.intre.max <= c.H + TOL, `între plăci între H/2 = ${c.H / 2} și H = ${c.H}: ${unde}`);
    assert.ok(m.intre.min < c.H - TOL, `fața coborâtă are creasta inelelor (nu e plată): ${unde}`);
    assert.doesNotMatch(locas, /^T\d+ M6$/m, `${c.id}: locașul, doar cu freza V`);
    assert.doesNotMatch(dop, /^T\d+ M6$/m, `${c.id}: dopul, doar cu freza V`);
  });
}

test('fundul doar cu freza V, pe hârtie: dreptunghiul 12 × 6 are 4 inele în locaș, la g·t = 0,289 mm, iar fața dopului inelele la H·t = 1,155 mm', async () => {
  const c = CAZURI_INCRUSTATIE.find((x) => x.id === 'dreptunghi')!;
  const { av } = await potrivire(c);
  // wD = D·t = 1,7321, r = 3: inelele la 2,0207, 2,3094, 2,5981, 2,8868 (al cincilea, la 3,1754, nu mai există).
  assert.ok(av.some((a) => /fundul îl fac 4 inele ale frezei în V, la 0\.289 mm unul de altul \(creasta cel mult 0\.25 mm\)/.test(a)), av.join(' | '));
  assert.ok(av.some((a) => /dopul .*fundul îl fac (\d+ (de )?inele|un inel) ale frezei în V, la 1\.155 mm unul de altul \(creasta cel mult 1 mm\)/.test(a)), av.join(' | '));
  // Fără freză dreaptă, regiunea feței se lărgește doar cu e = H·t + 1 = 2,155, plus raza V-ului (3): 5,155, arătat 5,2.
  assert.ok(av.some((a) => /freza trece cu până la 5\.2 mm dincolo de marginile semifabricatului/.test(a)), av.join(' | '));
});

test('fundul doar cu freza V: o creastă nulă sau negativă e refuzată de V-carve, cu motivul', () => {
  const patrat = { inchis: true, varfuri: [[0, 0], [10, 0], [10, 10], [0, 10]].map(([x, y]) => ({ p: { x: x!, y: y! }, s: { tip: 'L' as const } })) };
  for (const creasta of [0, -0.1, Number.NaN]) {
    const r = traseuVcarve({
      contururi: [patrat], unghi: 60, diametruScula: 6, adancime: 2, pas: 1, avans: 1000, avansPlonjare: 300, zSigur: 5, fundV: { creasta },
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.motiv, /creasta fundului cu freza V trebuie să fie pozitivă/);
  }
});

test('banda fără freza fundului plat: fundul benzii cu inelele V, decuparea cu freza ei (T3 Ø3), piesa păstrată se potrivește', async () => {
  const c = CAZURI_INCRUSTATIE.find((x) => x.id === 'dreptunghi')!;
  const placa = c.D - c.g + c.H + 1 + 0.5;
  const r = await calculeazaExport(deschis(faraFund(c, {
    decupare: true, grosimePlaca: placa, punti: { numar: 4, latime: 4, grosime: 1 }, freza: { numar: 3, nume: 'freza decupare', diametru: 3 },
  })), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const locas = r.program.text, dop = r.dopuri[0]!.program.text;
  assert.deepEqual([...dop.matchAll(/^T(\d+) M6$/gm)].map((x) => x[1]), ['3'], 'dopul: freza V, apoi doar freza decupării');
  const t = tan(c);
  // Banda cea mai îngustă fără freza fundului: 2·H·t + Ø decupării + 2c = 2,309 + 3 + 1 = 6,309; semifabricatul, cu M + S·t + marginea.
  const M = 2 * c.H * t + 3 + 1;
  const m = masoaraPotrivirea(
    { text: locas, scule: scule(locas, c) }, { text: dop, scule: scule(dop, c) }, c.desen,
    { D: c.D, g: c.g, H: c.H, margine: M + (c.D - c.g) * t + c.margine, unghi: c.v.unghi, celula: CELULA, lat: M + 1, decupare: { grosimePlaca: placa, grosimePunte: 1 } },
  );
  const unde = `oprirea ${m.asezare.toFixed(4)}; contactul ${(m.contact * 100).toFixed(1)} %; sub ${JSON.stringify(m.sub)}; între ${JSON.stringify(m.intre)}; păstrate ${m.pastrate}`;
  assert.ok(Math.abs(m.asezare - (c.D - c.g)) <= TOL, `oprirea la S: ${unde}`);
  assert.ok(m.contact >= 0.95, `contactul: ${unde}`);
  assert.ok(m.sub.min >= c.g / 2 - TOL_CREASTA && m.sub.max <= c.g + TOL, `sub dop: ${unde}`);
  assert.ok(m.intre.n > 0 && m.intre.min >= c.H / 2 - TOL_CREASTA && m.intre.max <= c.H + TOL, `fundul benzii, între plăci: ${unde}`);
});

test('banda fără freza fundului plat și fără freza decupării: refuzul spune să alegi „Altă freză pentru decupare” (sau fără decupare)', async () => {
  const c = CAZURI_INCRUSTATIE.find((x) => x.id === 'dreptunghi')!;
  const r = await calculeazaExport(deschis(faraFund(c, { decupare: true, grosimePlaca: 6, punti: { numar: 4, latime: 4, grosime: 1 } })), { origine: 'stanga-jos', z0: 'sus' });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.motiv, /fără freză dreaptă, decuparea dopului cere freza ei/);
  assert.match(r.motiv, /Altă freză pentru decupare/);
  // Fără decupare, banda se taie (doar cu freza V), cu placa „cel puțin”.
  const fara = await calculeazaExport(deschis(faraFund(c, { decupare: false, grosimePlaca: 6, punti: { numar: 4, latime: 4, grosime: 1 } })), { origine: 'stanga-jos', z0: 'sus' });
  if (!fara.ok) assert.fail(fara.motiv);
  assert.doesNotMatch(fara.dopuri[0]!.program.text, /^T\d+ M6$/m);
});

test('peste 400 de inele într-o regiune: refuzul, cu sfatul (o freză dreaptă sau un joc mai mare)', async () => {
  // Un cerc R30 cu jocul 0,1 (V60, D 3): sv = 0,1·t = 0,0577, (30 − 1,732) / 0,0577 = 489,6, deci 490 de inele.
  const c: CazIncrustatie = {
    ...CAZURI_INCRUSTATIE[0]!, id: 'mare', cerc: { cx: 100, cy: 70, r: 30 }, desen: [], g: 0.1,
  };
  const r = await calculeazaExport(deschis(faraFund(c)), { origine: 'stanga-jos', z0: 'sus' });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.motiv, /fundul doar cu freza V ar cere 490 de inele \(cel mult 400\)/);
  assert.match(r.motiv, /alege o freză dreaptă în coloana Fund plat sau un joc mai mare/);
});

test('un V-carve obișnuit fără freză dreaptă rămâne ca înainte: fundul lui nu-l fac inelele, iar avertismentul o spune', async () => {
  const c = CAZURI_INCRUSTATIE.find((x) => x.id === 'dreptunghi')!;
  const r = await calculeazaExport(deschis(faraFund(c, undefined, false)), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  assert.ok(r.avertismente.some((a) => /fundul plat dintre ei rămâne pentru freza dreaptă/.test(a)), r.avertismente.join(' | '));
  assert.ok(!r.avertismente.some((a) => /inele ale frezei în V/.test(a)), r.avertismente.join(' | '));
});
