/**
 * „Împreună (secțiunea)” (ADR 0179, felia 12.1↑e-2): potrivirea dopului în V, măsurată de aplicație (`src/sim/potrivire.ts`,
 * prin `calculeazaPotrivirea` din lucrătorul CAM), cu o implementare a ei (benzile după suprafețele simulate), e cea a
 * oracolului independent (`test/oracles/incrustatie.ts`, benzile după distanța la contur) pe toate cazurile lui:
 * - oprirea ± 0,01, contactul ± 0,03, medianele jocurilor ± 0,02;
 * - niciun rând roșu, iar valorile pe hârtie sunt ale panoului (`valoriIncrustatie`);
 * - și fără freză dreaptă (ADR 0173: jocurile între jumătate și întreg), și cu banda decupată (ADR 0172: tăietura și punțile
 *   nu intră);
 * - controlul negativ (dopul tăiat ca a doua cavitate) are rânduri roșii, cu locul lor;
 * - secțiunea dreptunghiului e pe hârtie: pe mijlocul lui, fundul la −D și dopul la −S; la marginea ferestrei, placa la 0 și
 *   dopul la H deasupra ei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programeDopuri } from '../../src/cam/dopV.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { calculeazaPotrivirea } from '../../src/jobs/calculCam.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document } from '../../src/model/document.ts';
import { potrivireaV, type PotrivireV } from '../../src/sim/potrivire.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { masoaraPotrivirea, type MasuraPotrivire } from '../oracles/incrustatie.ts';
import { CAZURI_INCRUSTATIE, type CazIncrustatie } from '../oracles/incrustatie.cazuri.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { documentCaz } from './ajutor-incrustatie.ts';

const CELULA = 0.1;
const tan = (c: CazIncrustatie): number => Math.tan((c.v.unghi * Math.PI) / 360);

const deschis = (d: unknown): Document => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};

type Op = { fundPlat?: unknown; incrustatie?: Record<string, unknown> };
/** Documentul cazului fără freză dreaptă (ADR 0173), sau cu banda decupată (ADR 0172). */
function varianta(c: CazIncrustatie, fel: 'faraFund' | 'banda'): Document {
  const d = documentCaz(c) as { schema: number; piese: { operatii: Op[] }[] };
  const op = d.piese[0]!.operatii[0]!;
  if (fel === 'faraFund') delete op.fundPlat;
  else {
    d.schema = 22;
    op.incrustatie!['jurDop'] = 'banda';
    op.incrustatie!['banda'] = { decupare: true, grosimePlaca: c.D - c.g + c.H + 1.5, punti: { numar: 4, latime: 4, grosime: 1 } };
  }
  return deschis(d);
}

/** Sculele unui program, pe hârtie: freza dreaptă întâi, dacă programul are o schimbare, apoi freza în V. */
function scule(text: string, c: CazIncrustatie): SculaOracol[] {
  const v: SculaOracol = { tip: 'v', diametru: c.v.diametru, unghi: c.v.unghi };
  return /^T\d+ M6$/m.test(text) ? [{ tip: 'plata', diametru: c.dreapta.diametru }, v] : [v];
}

/** Măsura oracolului pe programele exportate ale documentului (ca `incrustatie.potrivire.test.ts`). */
async function oracol(c: CazIncrustatie, doc: Document): Promise<MasuraPotrivire> {
  const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  const locas = r.program.text, dop = r.dopuri[0]!.program.text;
  return masoaraPotrivirea(
    { text: locas, scule: scule(locas, c) }, { text: dop, scule: scule(dop, c) }, c.desen,
    { D: c.D, g: c.g, H: c.H, margine: c.margine, unghi: c.v.unghi, celula: CELULA, lat: Math.min(c.margine, c.H * tan(c) + 1) },
  );
}

function aplicatie(c: CazIncrustatie, doc: Document): PotrivireV {
  const r = calculeazaPotrivirea(doc, 0);
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  return r.potrivire;
}

const randuri = (p: PotrivireV): string => Object.entries(p.randuri).map(([k, r]) => `${k} ${r.ok ? 'ok' : `ROȘU la ${r.unde?.join(', ')}`}`).join('; ');
const descrie = (p: PotrivireV): string =>
  `oprirea ${p.asezare.toFixed(4)}; contactul ${(p.contact.fractie * 100).toFixed(1)} % din ${p.contact.n}; sub ${JSON.stringify(p.sub)}; între ${JSON.stringify(p.intre)}; ${randuri(p)}`;

for (const c of CAZURI_INCRUSTATIE) {
  test(`potrivirea aplicației = a oracolului, ${c.id}: oprirea, contactul, jocurile; niciun rând roșu; hârtia panoului`, async () => {
    const doc = deschis(documentCaz(c));
    const p = aplicatie(c, doc), m = await oracol(c, doc);
    const unde = `${c.id}: aplicația ${descrie(p)} / oracolul ${m.asezare.toFixed(4)}, ${(m.contact * 100).toFixed(1)} %, sub ${m.sub.med}, între ${m.intre.med}`;
    const S = c.D - c.g;
    assert.deepEqual(
      [p.hartie.D, p.hartie.g, p.hartie.H, p.hartie.S, Number(p.hartie.t.toFixed(12)), p.hartie.creastaLocas, p.hartie.creastaDop],
      [c.D, c.g, c.H, S, Number(tan(c).toFixed(12)), 0, 0], `hârtia: ${c.id}`,
    );
    assert.equal(p.celula, CELULA);
    assert.ok(Math.abs(p.asezare - m.asezare) <= 0.01, `oprirea: ${unde}`);
    assert.ok(p.contact.n > 0 && Math.abs(p.contact.fractie - m.contact) <= 0.03, `contactul: ${unde}`);
    if (c.fundPlat) assert.ok(p.sub.n > 0 && Math.abs(p.sub.med - m.sub.med) <= 0.02, `sub dop: ${unde}`);
    else assert.equal(p.sub.n, 0, `fără fund plat, fără celule sub dop: ${unde}`);
    assert.ok(p.intre.n > 0 && Math.abs(p.intre.med - m.intre.med) <= 0.02, `între plăci: ${unde}`);
    assert.ok(Object.values(p.randuri).every((r) => r.ok), `niciun rând roșu: ${unde}`);
    assert.equal(p.sectiune.marcaj, null, `fără rând roșu, secțiunea fără marcaj: ${unde}`);
  });
}

for (const c of [CAZURI_INCRUSTATIE[0]!, CAZURI_INCRUSTATIE[1]!]) {
  test(`fără freză dreaptă (ADR 0173), ${c.id}: aplicația = oracolul, jocurile între jumătate și întreg, niciun rând roșu`, async () => {
    const doc = varianta(c, 'faraFund');
    const p = aplicatie(c, doc), m = await oracol(c, doc);
    const unde = `${c.id}: aplicația ${descrie(p)} / oracolul ${m.asezare.toFixed(4)}, sub ${JSON.stringify(m.sub)}, între ${JSON.stringify(m.intre)}`;
    assert.deepEqual([p.hartie.creastaLocas, p.hartie.creastaDop], [c.g / 2, c.H / 2], `crestele pe hârtie: ${unde}`);
    assert.ok(Math.abs(p.asezare - m.asezare) <= 0.01, `oprirea: ${unde}`);
    assert.ok(p.sub.n > 0 && p.sub.min >= c.g / 2 - 0.05 && p.sub.max <= c.g + 0.05, `sub dop, între g/2 și g: ${unde}`);
    assert.ok(p.intre.n > 0 && p.intre.min >= c.H / 2 - 0.05 && p.intre.max <= c.H + 0.05, `între plăci, între H/2 și H: ${unde}`);
    assert.ok(Object.values(p.randuri).every((r) => r.ok), `niciun rând roșu: ${unde}`);
  });
}

test('banda decupată (ADR 0172), dreptunghiul: tăietura și punțile nu intră; niciun rând roșu', () => {
  const c = CAZURI_INCRUSTATIE[0]!;
  const p = aplicatie(c, varianta(c, 'banda'));
  const unde = `${c.id}, banda: ${descrie(p)}`;
  assert.ok(Math.abs(p.asezare - (c.D - c.g)) <= 0.05, `oprirea la S: ${unde}`);
  assert.ok(Object.values(p.randuri).every((r) => r.ok), `niciun rând roșu: ${unde}`);
});

test('controlul negativ: dopul tăiat ca a doua cavitate are rânduri roșii, cu locul lor, marcat pe secțiune', () => {
  const c = CAZURI_INCRUSTATIE[0]!;
  const doc = deschis(documentCaz(c));
  // Același desen, oglindit și pus pe semifabricat după contract (x′ = x1 + m − x, y′ = y − y0 + m), cu un V-carve fără
  // incrustație: exact „masculul” din ediția întâi (ca în `incrustatie.potrivire.test.ts`).
  const [x1, y0] = [32, 20];
  const oglindit = c.desen.map((pol) => pol.map(([x, y]) => [x1 + c.margine - x, y - y0 + c.margine] as const));
  const cavitate = deschis(documentCaz({ ...c, desen: oglindit }, false));
  const job = programDinDocument(doc, REGIM_IMPLICIT, 0), jobCav = programDinDocument(cavitate, REGIM_IMPLICIT, 0);
  if (!job.ok || !jobCav.ok) assert.fail('programele cazului');
  const locas = pregatesteProgram(job.program, 0), dopRau = pregatesteProgram(jobCav.program, 0);
  if (!locas.ok || !dopRau.ok) assert.fail('simularea programelor');
  const d = programeDopuri(doc, REGIM_IMPLICIT);
  if (!d.ok) assert.fail(d.motiv);
  const descriptor = d.dopuri[0]!.potrivire;
  assert.ok(descriptor, 'dopul în V își spune potrivirea');
  const p = potrivireaV(locas, dopRau, { ...descriptor, celula: CELULA, grosimeDop: d.dopuri[0]!.semifabricat.grosimeMinima });
  const unde = descrie(p);
  // A doua cavitate: dopul nu intră deloc (h* = 0), pereții nu se ating, sub el e cât locașul, între plăci nimic; fiecare
  // rând e roșu de unul singur, cu locul lui.
  assert.ok(Object.values(p.randuri).every((r) => !r.ok), `a doua cavitate, toate rândurile roșii: ${unde}`);
  for (const r of Object.values(p.randuri)) {
    assert.ok(r.unde && Number.isFinite(r.unde[0]) && Number.isFinite(r.unde[1]), `rândul roșu își spune locul: ${unde}`);
  }
  const rosu = p.randuri.intra;
  assert.ok(p.sectiune.marcaj !== null, `secțiunea trece prin locul diferenței și îl marchează: ${unde}`);
  assert.ok(Math.abs(p.sectiune.y - rosu.unde![1]) <= CELULA, `secțiunea, pe rândul locului: y ${p.sectiune.y} / ${rosu.unde![1]}`);
});

test('secțiunea dreptunghiului, pe hârtie: pe mijloc, fundul la −D și dopul la −S; la margine, placa la 0 și dopul la H deasupra', () => {
  const c = CAZURI_INCRUSTATIE[0]!;
  const p = aplicatie(c, deschis(documentCaz(c)));
  const s = p.sectiune;
  // Desenul: 12 × 6 din (20, 20); secțiunea pe orizontală prin mijloc, y = 23 (cât o celulă). Pe hârtie, cu toleranța
  // tabelului (0,05): fundul de 2,5 mm lățime nu-l încape freza dreaptă Ø3, deci îl lasă freza V la −2,97.
  assert.ok(Math.abs(s.y - 23) <= CELULA, `secțiunea la y = 23: ${s.y}`);
  assert.equal(s.placa.length, s.dop.length);
  const la = (x: number): number => Math.floor((x - s.x0) / s.celula);
  const mijloc = la(26), margine = 0;
  const S = c.D - c.g, TOL = 0.05;
  assert.ok(Math.abs(s.placa[mijloc]! + c.D) <= TOL, `fundul la −D: ${s.placa[mijloc]}`);
  assert.ok(Math.abs(s.dop[mijloc]! + S) <= TOL, `dopul la −S: ${s.dop[mijloc]}`);
  assert.ok(Math.abs(s.placa[margine]!) <= TOL, `placa la 0 pe margine: ${s.placa[margine]}`);
  assert.ok(Math.abs(s.dop[margine]! - c.H) <= TOL, `dopul la H deasupra plăcii: ${s.dop[margine]}`);
  assert.ok(Math.abs(s.grosimeDop - (S + c.H + 1)) <= 1e-9, `grosimea dopului, S + H + 1: ${s.grosimeDop}`);
});
