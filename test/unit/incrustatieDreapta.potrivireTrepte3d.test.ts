/**
 * „Împreună (secțiunea)” pentru incrustația în trepte (ADR 0179, felia 12.1↑e-4; contractul, ADR 0175 §3–§6): potrivirea
 * măsurată de aplicație (`calculeazaPotrivirea`, cu jocul lateral exact pe mutările nucleului) e cea a oracolului independent
 * (`masoaraPotrivireaTrepte`, pe textul G-code) pe toate cazurile lui:
 * - jocul lateral pe ambele niveluri (sus, cu flanșa; deschiderea, cu tija): mediana la cel mult 0,01 de oracol, iar toate
 *   punctele în c ± 0,02, ca oracolul;
 * - niciun punct al peretelui flanșei sau al tijei în afara nivelului lui din locaș;
 * - flanșa trece de deschidere peste tot (stă pe umăr). Reazemul (cât trece peretele flanșei de deschidere) e pe hârtie cel puțin
 *   s − c, pe pereții drepți față în față; la dreptunghiuri, cel mult în colț: √2·s − c spre interior (arcul flanșei, R − c, și
 *   al deschiderii, R, cu centrele la (s, s)), (√2 − 1)·R + s − c spre exterior (arcul flanșei, s − c, în colțul desenului).
 *   Oracolul vede doar mutările din găleata de 1 mm a punctului, deci reazemul lui e o margine de sus (1e6 mai departe): minimul
 *   aplicației nu trece de al lui;
 * - umărul, fundul, tija și înălțimea dopului la cel mult 0,02 de oracol; niciun rând roșu, cu hârtia panoului;
 * - controlul negativ: dopul L-ului neoglindit (tăiat cu flanșa sus) are rânduri roșii, cu locul lor, marcat pe secțiune;
 * - controlul pe hârtie: o valoare scrisă diferit de programe face roșu doar rândul ei;
 * - secțiunile pe hârtie: pe umăr, pe fund, decupat, la gaură;
 * - dopul decupat în trepte cu gol: miezul golului flanșei cade, nu e al dopului.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { programeDopuriDrepte } from '../../src/cam/dopDrept.ts';
import { calculeazaPotrivirea } from '../../src/jobs/calculCam.ts';
import type { Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { ARC_ORAR, ARC_TRIG, STRIDE } from '../../src/sim/nucleu.ts';
import { pregatesteProgram, type ProgramSimulat } from '../../src/sim/program.ts';
import { potrivireaTrepte, type PotrivireTrepte } from '../../src/sim/potrivireTrepte.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { cutieDesen, type PunctO } from '../oracles/incrustatie.ts';
import type { MasuraTrepte } from '../oracles/incrustatieDreapta.ts';
import { CAZURI_TREPTE, type CazTrepte } from '../oracles/incrustatieDreapta.trepte.cazuri.ts';
import { documentTrepte, masoaraTrepte } from './ajutor-incrustatie.ts';

const deschis = (d: unknown): Document => {
  const r = incarca(JSON.parse(JSON.stringify(d)));
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const caz = (id: string): CazTrepte => CAZURI_TREPTE.find((x) => x.id === id)!;

async function oracol(c: CazTrepte, doc: Document): Promise<MasuraTrepte> {
  const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  return masoaraTrepte(c, r.program.text, r.dopuri[0]!.program.text);
}

function aplicatie(id: string, doc: Document): PotrivireTrepte {
  const r = calculeazaPotrivirea(doc, 0);
  if (!r.ok) assert.fail(`${id}: ${r.motiv}`);
  if (r.potrivire.fel !== 'trepte') assert.fail(`${id}: potrivirea ${r.potrivire.fel}, nu în trepte`);
  return r.potrivire;
}

const descrie = (p: PotrivireTrepte): string =>
  `sus ${JSON.stringify(p.sus)}; jos ${JSON.stringify(p.jos)}; reazem ${JSON.stringify(p.reazem)}; d ${p.umar}; D ${p.adancime}; ` +
  `tija ${p.tija}; h ${p.inaltime}; h* ${p.asezare}; ` +
  Object.entries(p.randuri).map(([k, r]) => `${k} ${r.ok ? 'ok' : `ROȘU la ${r.unde?.join(', ')}`}`).join('; ');

for (const c of CAZURI_TREPTE) {
  test(`treptele, aplicația = oracolul, ${c.id}: jocul pe ambele niveluri, dopul în locaș, flanșa pe umăr, adâncimile; niciun rând roșu`, async () => {
    const doc = deschis(documentTrepte(c));
    const p = aplicatie(c.id, doc), m = await oracol(c, doc);
    const unde = `${c.id}: aplicația ${descrie(p)} / oracolul sus ${JSON.stringify(m.sus)}, jos ${JSON.stringify(m.jos)}, reazem ` +
      `${JSON.stringify(m.reazem)}, d ${m.umar}, D ${m.adancime}, tija ${m.tija}, h ${m.inaltime}`;
    assert.deepEqual(
      [p.hartie.D, p.hartie.d, p.hartie.c, p.hartie.tija, p.hartie.h, p.hartie.H, p.hartie.g, p.hartie.sprijin, p.hartie.decupat, p.hartie.gaura],
      [c.D, c.d, c.c, c.tija, c.h, c.H, c.g, c.sprijin, c.dop === 'decupat', c.gaura === true], `hârtia: ${c.id}`,
    );
    for (const [nume, a, o] of [['sus (flanșa)', p.sus, m.sus], ['deschiderea (tija)', p.jos, m.jos]] as const) {
      assert.ok(a.joc.n > 100, `${nume}, punctele peretelui locașului: ${unde}`);
      assert.ok(Math.abs(a.joc.med - o.joc.med) <= 0.01, `${nume}, jocul, mediana: ${unde}`);
      assert.ok(a.joc.min >= c.c - 0.02 && a.joc.max <= c.c + 0.02, `${nume}, jocul c = ${c.c} ± 0,02 pe tot peretele: ${unde}`);
      assert.ok(a.dop.n > 100 && a.dop.afara === 0 && o.interferenta === 0, `${nume}, dopul în locaș: ${unde}`);
    }
    assert.ok(p.reazem.banda.n > 100 && p.reazem.nu === 0 && p.reazem.banda.min > 0, `flanșa pe umăr peste tot: ${unde}`);
    assert.ok(Math.abs(p.reazem.banda.min - (c.s - c.c)) <= 0.01, `reazemul, minimul pe hârtie s − c = ${c.s - c.c}: ${unde}`);
    assert.ok(p.reazem.banda.min <= m.reazem.min + 0.01, `reazemul, minimul cel mult al oracolului (o margine de sus): ${unde}`);
    const R = c.locas[0]!.diametru / 2;
    if (c.desen.length === 1 && c.desen[0]!.length === 4 && c.locas.length === 1) {
      const colt = c.spre === 'interior' ? Math.SQRT2 * c.s - c.c : (Math.SQRT2 - 1) * R + c.s - c.c;
      assert.ok(Math.abs(p.reazem.banda.max - colt) <= 0.01, `reazemul, în colțul dreptunghiului pe hârtie ${colt}: ${unde}`);
    }
    for (const [nume, a, o] of [['umărul', p.umar, m.umar], ['fundul', p.adancime, m.adancime], ['tija', p.tija, m.tija], ['înălțimea dopului', p.inaltime, m.inaltime]] as const) {
      assert.ok(Math.abs(a - o) <= 0.02, `${nume}: ${unde}`);
    }
    assert.ok(Object.values(p.randuri).every((r) => r.ok), `niciun rând roșu: ${unde}`);
    assert.equal(p.sectiune.marcaj, null, `fără rând roșu, secțiunea fără marcaj: ${unde}`);
  });
}

/** Programul oglindit pe X față de mijlocul semifabricatului lat de `W`: x → W − x, arcele își schimbă sensul. */
function oglindit(p: Extract<ProgramSimulat, { ok: true }>, W: number): Extract<ProgramSimulat, { ok: true }> {
  const o = (m: Float64Array): Float64Array => {
    const r = Float64Array.from(m);
    for (let q = 0; q < r.length; q += STRIDE) {
      r[q + 1] = W - r[q + 1]!;
      r[q + 4] = W - r[q + 4]!;
      r[q + 7] = W - r[q + 7]!;
      if (r[q] === ARC_ORAR) r[q] = ARC_TRIG;
      else if (r[q] === ARC_TRIG) r[q] = ARC_ORAR;
    }
    return r;
  };
  return { ...p, mutari: o(p.mutari), ...(p.apoi ? { apoi: p.apoi.map((g) => ({ ...g, mutari: o(g.mutari) })) } : {}) };
}

/** Programele simulate ale unui caz (locașul și dopul) și descriptorul dopului, ca să se măsoare cu altă hârtie sau alt dop. */
function cazSimulat(c: CazTrepte, peste: Record<string, unknown> = {}) {
  const doc = deschis(documentTrepte(c, peste));
  const job = programDinDocument(doc, REGIM_IMPLICIT, 0), d = programeDopuriDrepte(doc, REGIM_IMPLICIT);
  if (!job.ok || !d.ok) assert.fail(`programele cazului ${c.id}`);
  const locas = pregatesteProgram(job.program, 0), dop = pregatesteProgram(d.dopuri[0]!.program, 0);
  if (!locas.ok || !dop.ok) assert.fail('simularea programelor');
  const descriptor = d.dopuri[0]!.potrivire;
  if (descriptor.fel !== 'trepte') assert.fail(`dopul în trepte își spune potrivirea: ${descriptor.fel}`);
  return { locas, dop, descriptor, grosimeDop: d.dopuri[0]!.semifabricat.grosimeMinima };
}

test('controlul negativ: dopul în trepte al L-ului, neoglindit (tăiat cu flanșa sus), are rânduri roșii, cu locul lor, marcat pe secțiune', () => {
  const c = caz('L');
  const { locas, dop, descriptor, grosimeDop } = cazSimulat(c);
  const bun = potrivireaTrepte(locas, dop, { ...descriptor, grosimeDop });
  assert.ok(Object.values(bun.randuri).every((r) => r.ok), `dopul bun: ${descrie(bun)}`);
  const { x0, x1 } = cutieDesen(c.desen);
  const W = x1 - x0 + 2 * c.margine;
  const p = potrivireaTrepte(locas, oglindit(dop, W), { ...descriptor, grosimeDop });
  const unde = descrie(p);
  assert.ok(!p.randuri.dop.ok && p.sus.dop.afara + p.jos.dop.afara > 0, `dopul neoglindit trece drept potrivit: ${unde}`);
  assert.ok(p.randuri.dop.unde && Number.isFinite(p.randuri.dop.unde[0]), `rândul roșu își spune locul: ${unde}`);
  // Secțiunea trece prin locul primului rând roșu din tabel și îl marchează.
  const ordine = [p.randuri.jocSus, p.randuri.jocJos, p.randuri.dop, p.randuri.reazem, p.randuri.umar, p.randuri.adancime, p.randuri.tija, p.randuri.inaltime, p.randuri.clei, p.randuri.placi];
  const primul = ordine.find((r) => !r.ok);
  assert.ok(primul?.unde && p.sectiune.marcaj === primul.unde[0] && Math.abs(p.sectiune.y - primul.unde[1]) <= p.celula, `secțiunea prin locul diferenței: ${unde}`);
  // Oglindit de două ori, dopul se potrivește iar: controlul nu pică din cauza oglinzii.
  const iar = potrivireaTrepte(locas, oglindit(oglindit(dop, W), W), { ...descriptor, grosimeDop });
  assert.ok(Object.values(iar.randuri).every((r) => r.ok), `oglindit de două ori: ${descrie(iar)}`);
});

test('controlul pe hârtie: o valoare scrisă diferit de programe face roșu doar rândul ei, cu locul lui', () => {
  for (const id of ['dreptunghi-umar', 'dreptunghi-fund']) {
    const c = caz(id);
    const { locas, dop, descriptor, grosimeDop } = cazSimulat(c);
    const masoara = (hartie: Partial<PotrivireTrepte['hartie']>): PotrivireTrepte =>
      potrivireaTrepte(locas, dop, { ...descriptor, hartie: { ...descriptor.hartie, ...hartie }, grosimeDop });
    const bun = masoara({});
    assert.ok(Object.values(bun.randuri).every((r) => r.ok), `${id}, hârtia programelor, niciun rând roșu: ${descrie(bun)}`);
    const schimbari = [
      [{ c: c.c + 0.05 }, ['jocSus', 'jocJos']], [{ d: c.d + 0.1 }, ['umar']], [{ D: c.D + 0.1 }, ['adancime']], [{ tija: c.tija + 0.1 }, ['tija']],
      [{ h: c.h + 0.1 }, ['inaltime']], [{ g: c.g + 0.1 }, ['clei']], [{ H: c.H + 0.1 }, ['placi']],
    ] as const;
    for (const [schimbare, randuri] of schimbari) {
      const p = masoara(schimbare);
      const rosii = Object.entries(p.randuri).filter(([, r]) => !r.ok).map(([k]) => k);
      assert.deepEqual(rosii, [...randuri], `${id}, ${JSON.stringify(schimbare)}: ${descrie(p)}`);
      for (const r of randuri) {
        const u = p.randuri[r].unde;
        assert.ok(u && Number.isFinite(u[0]) && Number.isFinite(u[1]), `${id}, rândul ${r} își spune locul: ${descrie(p)}`);
      }
    }
  }
});

/** Celula secțiunii sub abscisa x. */
const coloana = (s: PotrivireTrepte['sectiune'], x: number): number => Math.floor((x - s.x0) / s.celula);

test('secțiunile pe hârtie: tija, umărul și fața coborâtă, pe umăr, pe fund, decupat și la gaură', () => {
  const TOL = 0.05;
  // Dreptunghiul 40 × 30 din (30, 30), d 3, s 5 spre interior, D 8, H 2, g 0,5: secțiunea prin mijloc (y 45). Tija la x 50,
  // umărul la x 67,5 (între deschiderea de la 65 și peretele de la 70), marginea semifabricatului la x 26 (fereastra de la 25).
  const cazuri = [
    { id: 'dreptunghi-umar', x: [50, 67.5, 26], placa: [-8, -3, 0], dop: [-7.5, -3, 2], sus: 10.5 - 7.5 },
    { id: 'dreptunghi-fund', x: [50, 67.5, 26], placa: [-8, -3, 0], dop: [-8, -2.5, 2], sus: 11 - 8 },
    { id: 'dreptunghi-decupat', x: [50, 67.5, 26], placa: [-8, -3, 0], dop: [-7.5, -3, Number.NaN], sus: 9.5 - 7.5 },
    // Gaura în trepte prin foaia de 10: 30 × 20 din (30, 30), d 3, s 4; tija la nivel cu fața de jos, umărul între 56 și 60.
    { id: 'gaura', x: [45, 58, 26], placa: [-10, -3, 0], dop: [-10, -3, 2], sus: 13 - 10 },
  ] as const;
  for (const e of cazuri) {
    const c = caz(e.id);
    const p = aplicatie(e.id, deschis(documentTrepte(c)));
    const s = p.sectiune, unde = `${e.id}: ${descrie(p)}`;
    const { y0, y1 } = cutieDesen(c.desen);
    assert.ok(Math.abs(s.y - (y0 + y1) / 2) <= p.celula, `secțiunea prin mijloc: ${s.y}; ${unde}`);
    e.x.forEach((x, i) => {
      const k = coloana(s, x), pl = s.placa[k]!, dp = s.dop[k]!;
      assert.ok(Math.abs(pl - e.placa[i]!) <= TOL, `${e.id}, placa la x ${x}: ${pl}, nu ${e.placa[i]}`);
      assert.ok(Number.isNaN(e.dop[i]!) ? !Number.isFinite(dp) : Math.abs(dp - e.dop[i]!) <= TOL, `${e.id}, dopul la x ${x}: ${dp}, nu ${e.dop[i]}`);
    });
    // Fața de sus a dopului, după întoarcere: grosimea semifabricatului minus h*.
    assert.ok(Math.abs(s.grosimeDop - p.asezare - e.sus) <= TOL, `${e.id}, fața de sus a dopului: ${s.grosimeDop} − ${p.asezare}`);
  }
});

test('dopul decupat în trepte cu gol: miezul golului flanșei (lemnul care cade) nu e al dopului; niciun rând roșu', () => {
  // 40 × 30 din (30, 30) cu golul 16 × 10 din (42, 40), Ø3, umărul spre interior d 3, s 3, D 8, decupat, pe umăr.
  const c: CazTrepte = {
    ...caz('dreptunghi-decupat'), id: 'gol-decupat',
    desen: [[[30, 30], [70, 30], [70, 60], [30, 60]], [[42, 40], [58, 40], [58, 50], [42, 50]]],
    s: 3, margine: 5, locas: [{ numar: 1, diametru: 3, pasLateral: 1.2 }],
  };
  const p = aplicatie(c.id, deschis(documentTrepte(c)));
  const unde = descrie(p);
  assert.ok(Object.values(p.randuri).every((r) => r.ok), `niciun rând roșu: ${unde}`);
  assert.ok(Math.abs(p.asezare - (c.D - c.g)) <= 0.05, `flanșa pe umăr, h* = D − g: ${unde}`);
  // Peste insula locașului (x 50, golul desenului), placa e la fața ei, iar dopul n-are lemn acolo (miezul a căzut).
  const s = p.sectiune, k = coloana(s, 50);
  assert.ok(Math.abs(s.placa[k]!) <= 0.05 && !Number.isFinite(s.dop[k]!), `peste insulă: placa ${s.placa[k]}, dopul ${s.dop[k]}`);
});
