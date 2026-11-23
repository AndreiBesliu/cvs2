/**
 * „Împreună (secțiunea)” pentru incrustația cu pereți drepți (ADR 0179, felia 12.1↑e-3): potrivirea măsurată de aplicație
 * (`calculeazaPotrivirea`, cu jocul lateral exact pe mutările nucleului, `src/sim/taiereExacta.ts`) e cea a oracolului
 * independent (`test/oracles/incrustatieDreapta.ts`, pe textul G-code) pe toate cazurile lui:
 * - jocul lateral: mediana ± 0,01 față de oracol, iar toate punctele în c ± 0,02, ca oracolul;
 * - niciun punct al peretelui dopului în afara locașului; adâncimea locașului și înălțimea dopului ± 0,02 față de oracol;
 * - niciun rând roșu, iar valorile pe hârtie sunt ale panoului (`valoriIncrustatieDreapta`);
 * - controlul negativ (dopul cu vârfuri ascuțite, ca în `incrustatieDreapta.potrivire.test.ts`): rândul „Dopul în locaș” e
 *   roșu, cu locul lui, marcat pe secțiune;
 * - controlul pe hârtie: o valoare scrisă diferit de programe (c cu 0,05, D, h, H cu 0,1) face roșu doar rândul ei;
 * - gaura prin foaie (ADR 0175): D e grosimea foii; dopul decupat iese H peste placă, cel ridicat pe față e cât foaia, fără joc
 *   sub el;
 * - dopul în trepte e refuzat, cu motivul (felia 12.1↑e-4), iar în lista vederii n-are secțiunea;
 * - secțiunile pe hârtie, pe câte un caz al fiecărui sprijin: pe față, fundul la −D, dopul la −(D − g), între plăci 0 (fața
 *   coborâtă pe fața plăcii); pe fund, fundul și dopul la −D, fața coborâtă a dopului la H peste placă; decupat, dopul neîntors
 *   pe fundul locașului, fără nimic în jurul lui, cu fața lui de sus la H peste placă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desenSectiune } from '../../src/app/sectiuneDesen.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { programeDopuriDrepte } from '../../src/cam/dopDrept.ts';
import { calculeazaPotrivirea } from '../../src/jobs/calculCam.ts';
import type { Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { potrivireaDreapta, type PotrivireDreapta } from '../../src/sim/potrivireDreapta.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { calculeazaExport, programSimulare } from '../../src/ui/actiuniExportCalcul.ts';
import { cutieDesen, type PunctO } from '../oracles/incrustatie.ts';
import { masoaraPotrivireaDreapta, type MasuraDreapta } from '../oracles/incrustatieDreapta.ts';
import { CAZURI_DREAPTA, type CazDreapta, type FrezaPlataCaz } from '../oracles/incrustatieDreapta.cazuri.ts';
import { CAZURI_TREPTE } from '../oracles/incrustatieDreapta.trepte.cazuri.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { documentDrept } from './ajutor-incrustatie.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const CELULA = 0.05;

const deschis = (d: unknown): Document => {
  const r = incarca(JSON.parse(JSON.stringify(d)));
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const cale = (pol: readonly PunctO[]) => ({ tip: 'cale', inchis: true, varfuri: pol.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) });
const sculaDoc = (f: FrezaPlataCaz) => ({ numar: f.numar, nume: 'freza plata', diametru: f.diametru });
const inaltimeDop = (c: CazDreapta): number => (c.dop === 'decupat' || c.sprijin === 'fund' ? c.D + c.H : c.D - c.g);

/** Sculele bucăților unui program, în ordine (ca `incrustatieDreapta.potrivire.test.ts`). */
function scule(text: string, freze: readonly FrezaPlataCaz[]): SculaOracol[] {
  const dupaNumar = new Map(freze.map((f) => [f.numar, f.diametru]));
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  const ramase = freze.map((f) => f.numar).filter((n) => n !== m6[0]);
  const pornire = m6.length === 0 ? freze[0]!.numar : (ramase[0] ?? freze[0]!.numar);
  return [pornire, ...m6].map((n) => ({ tip: 'plata', diametru: dupaNumar.get(n) ?? NaN }));
}
const frezeDopului = (c: CazDreapta): readonly FrezaPlataCaz[] => {
  const freze = c.frezeDop ?? c.locas;
  return c.dop === 'decupat' ? [[...freze].sort((a, b) => a.diametru - b.diametru)[0]!] : freze;
};

async function oracol(c: CazDreapta, doc: Document): Promise<MasuraDreapta> {
  const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  const locas = r.program.text, dop = r.dopuri[0]!.program.text;
  return masoaraPotrivireaDreapta(
    { text: locas, scule: scule(locas, c.locas) }, { text: dop, scule: scule(dop, frezeDopului(c)) }, c.desen,
    { D: c.D, h: inaltimeDop(c), dop: c.dop, margine: c.margine, celula: CELULA },
  );
}

function aplicatie(c: CazDreapta, doc: Document): PotrivireDreapta {
  const r = calculeazaPotrivirea(doc, 0);
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  if (r.potrivire.fel !== 'drept') assert.fail(`${c.id}: potrivirea în V, nu dreaptă`);
  return r.potrivire;
}

const descrie = (p: PotrivireDreapta): string =>
  `jocul ${JSON.stringify(p.joc)}; dopul ${p.dop.afara} afară din ${p.dop.n}; D ${p.adancime}; h ${p.inaltime}; ` +
  Object.entries(p.randuri).map(([k, r]) => `${k} ${r.ok ? 'ok' : `ROȘU la ${r.unde?.join(', ')}`}`).join('; ');

for (const c of CAZURI_DREAPTA) {
  test(`pereții drepți, aplicația = oracolul, ${c.id}: jocul lateral, dopul în locaș, adâncimea, înălțimea; niciun rând roșu`, async () => {
    const doc = deschis(documentDrept(c));
    const p = aplicatie(c, doc), m = await oracol(c, doc);
    const unde = `${c.id}: aplicația ${descrie(p)} / oracolul jocul ${JSON.stringify(m.joc)}, ${m.interferenta} din ${m.nDop}, D ${m.adancime}, h ${m.inaltime}`;
    const h = inaltimeDop(c);
    assert.deepEqual(
      [p.hartie.D, p.hartie.c, p.hartie.h, p.hartie.H, p.hartie.g, p.hartie.sprijin, p.hartie.decupat, p.hartie.gaura],
      [c.D, c.c, h, c.H, c.g, c.sprijin, c.dop === 'decupat', false], `hârtia: ${c.id}`,
    );
    assert.ok(p.joc.n > 100, `punctele peretelui locașului: ${unde}`);
    assert.ok(Math.abs(p.joc.med - m.joc.med) <= 0.01, `jocul, mediana: ${unde}`);
    assert.ok(p.joc.min >= c.c - 0.02 && p.joc.max <= c.c + 0.02, `jocul c = ${c.c} ± 0,02 pe tot peretele: ${unde}`);
    assert.ok(p.dop.n > 100 && p.dop.afara === 0 && m.interferenta === 0, `dopul în locaș: ${unde}`);
    assert.ok(Math.abs(p.adancime - m.adancime) <= 0.02, `adâncimea locașului: ${unde}`);
    assert.ok(Math.abs(p.inaltime - m.inaltime) <= 0.02, `înălțimea dopului: ${unde}`);
    assert.ok(Object.values(p.randuri).every((r) => r.ok), `niciun rând roșu: ${unde}`);
    assert.equal(p.sectiune.marcaj, null, `fără rând roșu, secțiunea fără marcaj: ${unde}`);
  });
}

/** Poligonul micșorat cu d (laturile mutate spre interior, vârfurile la intersecții), pentru un poligon trigonometric. */
function micsorat(pol: readonly PunctO[], d: number): PunctO[] {
  const n = pol.length;
  const linii = pol.map((a, k) => {
    const b = pol[(k + 1) % n]!;
    const lx = b[0] - a[0], ly = b[1] - a[1], l = Math.hypot(lx, ly);
    return { p: [a[0] - (ly / l) * d, a[1] + (lx / l) * d] as const, u: [lx / l, ly / l] as const };
  });
  return linii.map((L1, k) => {
    const L0 = linii[(k - 1 + n) % n]!;
    const den = L0.u[0] * L1.u[1] - L0.u[1] * L1.u[0];
    const t = ((L1.p[0] - L0.p[0]) * L1.u[1] - (L1.p[1] - L0.p[1]) * L1.u[0]) / den;
    return [L0.p[0] + t * L0.u[0], L0.p[1] + t * L0.u[1]] as const;
  });
}

test('controlul negativ: dopul cu vârfuri ascuțite (desenul micșorat cu c, colțurile nepotrivite) are „Dopul în locaș” roșu', () => {
  const c = CAZURI_DREAPTA[0]!;
  const { x0: X0, y0: Y0, x1: X1, y1: Y1 } = cutieDesen(c.desen);
  const m = c.margine, h = inaltimeDop(c);
  const W = X1 - X0 + 2 * m, Hs = Y1 - Y0 + 2 * m;
  const oglindit = micsorat(c.desen[0]!, c.c).map(([x, y]) => [X1 + m - x, y - Y0 + m] as const).reverse();
  const rau = deschis({
    schema: 21, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'r', matrice: { ...I }, copii: [
          { tip: 'element', id: 'rama', matrice: { ...I }, forma: cale([[0, 0], [W, 0], [W, Hs], [0, Hs]]) },
          { tip: 'element', id: 'dop', matrice: { ...I }, forma: cale(oglindit) },
        ],
      },
      operatii: [{
        id: 'b', tip: 'buzunar', noduri: ['rama', 'dop'], latura: 'interior', sens: 'urcare', adancime: h, pas: c.pas,
        scula: sculaDoc(c.locas[0]!), pasLateral: c.locas[0]!.pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  const doc = deschis(documentDrept(c));
  const job = programDinDocument(doc, REGIM_IMPLICIT, 0), jobRau = programDinDocument(rau, REGIM_IMPLICIT, 0);
  if (!job.ok || !jobRau.ok) assert.fail('programele cazului');
  const locas = pregatesteProgram(job.program, 0), dopRau = pregatesteProgram(jobRau.program, 0);
  if (!locas.ok || !dopRau.ok) assert.fail('simularea programelor');
  const d = programeDopuriDrepte(doc, REGIM_IMPLICIT);
  if (!d.ok) assert.fail(d.motiv);
  const descriptor = d.dopuri[0]!.potrivire;
  assert.ok(descriptor && descriptor.fel === 'drept', 'dopul drept își spune potrivirea');
  const p = potrivireaDreapta(locas, dopRau, { ...descriptor, grosimeDop: d.dopuri[0]!.semifabricat.grosimeMinima });
  const unde = descrie(p);
  assert.ok(p.dop.afara > 0 && !p.randuri.dop.ok, `dopul cu vârfuri ascuțite trece drept potrivit: ${unde}`);
  assert.ok(p.randuri.dop.unde && Number.isFinite(p.randuri.dop.unde[0]), `rândul roșu își spune locul: ${unde}`);
  // Vârfurile ascuțite ale dopului intră și în peretele locașului: jocul e negativ acolo, deci și rândul lui e roșu.
  assert.ok(!p.randuri.joc.ok && p.joc.min < 0, `jocul negativ la vârfuri: ${unde}`);
  // Secțiunea trece prin locul primului rând roșu din tabel (ADR 0179, felia 12.1↑e-3 §5) și îl marchează.
  const primul = [p.randuri.joc, p.randuri.dop, p.randuri.adancime, p.randuri.inaltime, p.randuri.sprijin].find((r) => !r.ok);
  assert.ok(primul?.unde && p.sectiune.marcaj === primul.unde[0] && Math.abs(p.sectiune.y - primul.unde[1]) <= p.celula, `secțiunea prin locul diferenței: ${unde}`);
});

test('dopul în trepte e refuzat, cu motivul (felia 12.1↑e-4); în lista vederii, fără secțiune', async () => {
  const c = CAZURI_TREPTE[0]!;
  const noduri = c.desen.map((pol, k) => ({ tip: 'element', id: `a${k}`, matrice: { ...I }, forma: cale(pol) }));
  const [prima, ...rest] = c.locas;
  const doc = deschis({
    schema: 26, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri },
      operatii: [{
        id: 'inc', tip: 'buzunar', noduri: noduri.map((n) => n.id), latura: 'interior', sens: 'urcare', adancime: c.gaura ? 3 : c.D, pas: c.pas,
        scula: sculaDoc(prima!), pasLateral: prima!.pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
        ...(rest.length > 0 ? { rest: rest.map((r) => ({ scula: sculaDoc(r), pasLateral: r.pasLateral })) } : {}),
        incrustatie: {
          fel: 'drept', jocLateral: c.c, dop: c.dop, sprijin: c.sprijin, joc: c.g, fierastrau: c.H, margine: c.margine,
          treapta: { adancime: c.d, latime: c.s, ...(c.spre === 'exterior' ? { spre: 'exterior' } : {}) }, ...(c.gaura ? { locas: 'gaura' } : {}),
        },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: c.gaura ? c.D : 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  assert.deepEqual(calculeazaPotrivirea(doc, 0), { ok: false, motiv: 'dopul 1: potrivirea simulată a dopului în trepte nu e încă' });
  const d = programeDopuriDrepte(doc, REGIM_IMPLICIT);
  if (!d.ok) assert.fail(d.motiv);
  assert.equal(d.dopuri[0]!.potrivire, undefined, 'dopul în trepte n-are încă potrivirea simulată');
  const s = await programSimulare(doc);
  if (!s.ok) assert.fail(s.motiv);
  assert.deepEqual(s.dopuri.map((x) => x.sectiune), [false], 'în lista vederii, dopul în trepte n-are „Împreună (secțiunea)”');
});

test('secțiunea dopului pe față, pe hârtie: pe mijloc, fundul la −D, dopul la −(D − g); la margine, fața coborâtă pe placă', () => {
  const c = CAZURI_DREAPTA.find((x) => x.id === 'dreptunghi-fata')!;
  const p = aplicatie(c, deschis(documentDrept(c)));
  const s = p.sectiune;
  // Desenul: 20 × 12 din (20, 60); secțiunea pe orizontală prin mijloc, y = 66 (cât o celulă).
  const { y0, y1 } = cutieDesen(c.desen);
  assert.ok(Math.abs(s.y - (y0 + y1) / 2) <= p.celula, `secțiunea prin mijloc: ${s.y}`);
  const la = (x: number): number => Math.floor((x - s.x0) / s.celula);
  const mijloc = la(30), margine = 0, TOL = 0.05;
  assert.ok(Math.abs(s.placa[mijloc]! + c.D) <= TOL, `fundul la −D: ${s.placa[mijloc]}`);
  assert.ok(Math.abs(s.dop[mijloc]! + (c.D - c.g)) <= TOL, `dopul la −(D − g): ${s.dop[mijloc]}`);
  assert.ok(Math.abs(s.placa[margine]!) <= TOL && Math.abs(s.dop[margine]!) <= TOL, `fața coborâtă a dopului pe fața plăcii: ${s.placa[margine]} / ${s.dop[margine]}`);
});

/** Celula secțiunii sub abscisa x. */
const coloana = (s: PotrivireDreapta['sectiune'], x: number): number => Math.floor((x - s.x0) / s.celula);

test('secțiunea dopului ridicat pe fund, pe hârtie: pe bara L-ului, fundul și dopul la −D; la margine, fața coborâtă la H peste placă', () => {
  const c = CAZURI_DREAPTA.find((x) => x.id === 'L')!;
  const p = aplicatie(c, deschis(documentDrept(c)));
  const s = p.sectiune, TOL = 0.05;
  // L-ul: 16 × 20 din (60, 80); secțiunea pe orizontală prin mijloc, y = 90, taie doar bara lui verticală (x de la 60 la 66).
  assert.ok(Math.abs(s.y - 90) <= p.celula, `secțiunea prin mijloc: ${s.y}`);
  const bara = coloana(s, 63);
  assert.ok(Math.abs(s.placa[bara]! + c.D) <= TOL && Math.abs(s.dop[bara]! + c.D) <= TOL, `dopul pe fund, la −D: ${s.placa[bara]} / ${s.dop[bara]}`);
  assert.ok(Math.abs(s.placa[0]!) <= TOL && Math.abs(s.dop[0]! - c.H) <= TOL, `fața coborâtă a dopului la H peste placă: ${s.placa[0]} / ${s.dop[0]}`);
  assert.ok(Math.abs(s.grosimeDop - (c.D + c.H + 1)) <= 1e-9, `grosimea dopului, D + H + 1: ${s.grosimeDop}`);
});

test('secțiunea dopului decupat: neîntors, pe fundul locașului, fără nimic în jurul lui; fața lui de sus la H peste placă', () => {
  const c = CAZURI_DREAPTA.find((x) => x.id === 'decupat')!;
  const p = aplicatie(c, deschis(documentDrept(c)));
  const s = p.sectiune, TOL = 0.05;
  assert.ok(Math.abs(s.y - 90) <= p.celula, `secțiunea prin mijloc: ${s.y}`);
  const bara = coloana(s, 63);
  assert.ok(Math.abs(s.placa[bara]! + c.D) <= TOL && Math.abs(s.dop[bara]! + c.D) <= TOL, `dopul pe fund, la −D: ${s.placa[bara]} / ${s.dop[bara]}`);
  // Dincolo de bară (x 67), în locaș nu e nimic: L-ul are acolo lemnul plăcii, iar dopul decupat n-are ramă.
  for (const x of [s.x0 + s.celula / 2, 67]) {
    const k = coloana(s, x);
    assert.ok(!Number.isFinite(s.dop[k]!), `fără dop la x ${x}: ${s.dop[k]}`);
  }
  assert.ok(Math.abs(s.grosimeDop - p.asezare - c.H) <= TOL, `fața de sus a dopului la H peste placă: ${s.grosimeDop} − ${p.asezare}`);
});

test('controlul pe hârtie: o valoare scrisă diferit de programe face roșu doar rândul ei, cu locul lui', () => {
  const c = CAZURI_DREAPTA.find((x) => x.id === 'L')!;
  const doc = deschis(documentDrept(c));
  const job = programDinDocument(doc, REGIM_IMPLICIT, 0), d = programeDopuriDrepte(doc, REGIM_IMPLICIT);
  if (!job.ok || !d.ok) assert.fail('programele cazului');
  const locas = pregatesteProgram(job.program, 0), dop = pregatesteProgram(d.dopuri[0]!.program, 0);
  if (!locas.ok || !dop.ok) assert.fail('simularea programelor');
  const descriptor = d.dopuri[0]!.potrivire;
  if (descriptor?.fel !== 'drept') assert.fail('dopul drept își spune potrivirea');
  const grosimeDop = d.dopuri[0]!.semifabricat.grosimeMinima;
  const masoara = (hartie: Partial<PotrivireDreapta['hartie']>): PotrivireDreapta =>
    potrivireaDreapta(locas, dop, { ...descriptor, hartie: { ...descriptor.hartie, ...hartie }, grosimeDop });
  const bun = masoara({});
  assert.ok(Object.values(bun.randuri).every((r) => r.ok), `hârtia programelor, niciun rând roșu: ${descrie(bun)}`);
  const schimbari = [[{ c: c.c + 0.05 }, 'joc'], [{ D: c.D + 0.1 }, 'adancime'], [{ h: inaltimeDop(c) + 0.1 }, 'inaltime'], [{ H: c.H + 0.1 }, 'sprijin']] as const;
  for (const [schimbare, rand] of schimbari) {
    const p = masoara(schimbare);
    const rosii = Object.entries(p.randuri).filter(([, r]) => !r.ok).map(([k]) => k);
    assert.deepEqual(rosii, [rand], `${JSON.stringify(schimbare)}: ${descrie(p)}`);
    const unde = p.randuri[rand].unde;
    assert.ok(unde && Number.isFinite(unde[0]) && Number.isFinite(unde[1]), `rândul roșu își spune locul: ${descrie(p)}`);
  }
});

/** Dreptunghiul de 30 × 20 din (20, 20), Ø6, cu gaura prin foaia de 10 (ca `incrustatieDreapta.gaura.test.ts`). */
function documentGaura(incrustatie: Record<string, unknown>): Document {
  return deschis({
    schema: 26, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: { ...I, e: 20, f: 20 }, forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 } },
      operatii: [{
        id: 'o', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 3, pas: 2.5, pasLateral: 2.4,
        scula: { numar: 1, nume: 'freza plata', diametru: 6 }, urechi: null, rampa: null, intrari: null, colturi: null,
        incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 8, locas: 'gaura', ...incrustatie },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 10 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
}

test('gaura prin foaia de 10: pe hârtie D e grosimea foii; decupat, iese H peste placă; ridicat pe față, cât foaia, fără joc sub el', () => {
  const cazuri = [[{}, 12, 'decupat'], [{ dop: 'ridicat', sprijin: 'fata' }, 10, 'ridicat pe față']] as const;
  for (const [incrustatie, h, ce] of cazuri) {
    const r = calculeazaPotrivirea(documentGaura(incrustatie), 0);
    if (!r.ok) assert.fail(`${ce}: ${r.motiv}`);
    if (r.potrivire.fel !== 'drept') assert.fail(`${ce}: potrivirea în V, nu dreaptă`);
    const p = r.potrivire, unde = `${ce}: ${descrie(p)}`;
    assert.deepEqual([p.hartie.D, p.hartie.h, p.hartie.c, p.hartie.gaura], [10, h, 0.1, true], `hârtia: ${unde}`);
    assert.ok(Math.abs(p.adancime - 10) <= 0.05 && Math.abs(p.inaltime - h) <= 0.05, `adâncimea și înălțimea: ${unde}`);
    assert.ok(Object.values(p.randuri).every((x) => x.ok), `niciun rând roșu: ${unde}`);
    // Desenul secțiunii: placa groasă cât foaia (10), fără lemn sub gaură și fără contact pe un fund care nu e; cleiul e
    // jocul lateral, de o parte și de alta, pe toată grosimea foii.
    const g = desenSectiune(p);
    assert.equal(g.yJos, '10', `fundul desenului e fața de jos a foii: ${unde}`);
    assert.deepEqual(g.contact, [], `fără contact sub gaură: ${unde}`);
    assert.match(g.clei, /^M[\d.]+ 0 L[\d.]+ 0 L[\d.]+ 10 L[\d.]+ 10Z M[\d.]+ 0 L[\d.]+ 0 L[\d.]+ 10 L[\d.]+ 10Z$/, `cleiul, în jocul lateral: ${unde}`);
  }
});
