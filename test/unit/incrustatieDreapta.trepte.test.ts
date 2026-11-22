/**
 * Incrustația în trepte (ADR 0175 §3–§6, felia 12.1↑f-2), pe oracolul independent al potrivirii (`masoaraPotrivireaTrepte`):
 * documentul v25 cu treapta trece prin exportul aplicației (în proces, ca în worker), iar oracolul citește textul celor două
 * programe și măsoară, pe fiecare nivel, jocul lateral c ± 0,02 pe tot peretele (și în colțuri) și interferența (nivelul de sus
 * cu flanșa, deschiderea cu tija); flanșa trece de deschidere (stă pe umăr); umărul d, fundul D, tija și înălțimea dopului
 * ± 0,05; ce rămâne după sprijin (g sub tijă pe umăr, g deasupra umărului pe fund, nimic la gaură; H peste placă); pereții pe
 * hârtie ± 0,02 (`incrustatieDreapta.trepte.cazuri.ts`). Controlul negativ: același dop neoglindit pică pe L. Refuzurile
 * lucrării și valorile pe hârtie (`valoriIncrustatieDreapta`). Supracursa (ADR 0176): flanșa decupată trece cu ea sub placa
 * dopului, cu aceeași potrivire și cu vârful punților tot la grosimea lor de fața de jos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { valoriIncrustatieDreapta } from '../../src/model/incrustatie.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { masoaraPotrivireaTrepte, type MasuraTrepte } from '../oracles/incrustatieDreapta.ts';
import { CAZURI_TREPTE, type CazTrepte } from '../oracles/incrustatieDreapta.trepte.cazuri.ts';
import type { FrezaPlataCaz } from '../oracles/incrustatieDreapta.cazuri.ts';
import { cutieDesen, type PunctO } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { zuriProgram } from './ajutor-incrustatie.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const TOL_JOC = 0.02, TOL_Z = 0.05, TOL_RAZA = 0.02;
const CELULA = 0.05;

const cale = (pol: readonly PunctO[]) => ({ tip: 'cale', inchis: true, varfuri: pol.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) });
const sculaDoc = (f: FrezaPlataCaz) => ({ numar: f.numar, nume: 'freza plata', diametru: f.diametru });

/**
 * Documentul v25 al unui caz: o piesă cu desenul și buzunarul cu incrustația în trepte, pe o foaie de 200 × 150 × 18 (la gaură,
 * groasă cât D, iar operația scrie adâncimea 3, pe care gaura o ignoră); `peste`: câmpuri ale incrustației schimbate.
 */
function documentTrepte(c: CazTrepte, peste: Record<string, unknown> = {}, operatie: Record<string, unknown> = {}): unknown {
  const noduri = c.desen.map((pol, k) => ({ tip: 'element', id: `a${k}`, matrice: { ...I }, forma: cale(pol) }));
  const [prima, ...rest] = c.locas;
  const incrustatie: Record<string, unknown> = {
    fel: 'drept', jocLateral: c.c, dop: c.dop, sprijin: c.sprijin, joc: c.g, fierastrau: c.H, margine: c.margine,
    treapta: { adancime: c.d, latime: c.s, ...(c.spre === 'exterior' ? { spre: 'exterior' } : {}) },
    ...(c.gaura ? { locas: 'gaura' } : {}),
  };
  // Un câmp dat `undefined` pleacă (documentul nu-l are).
  for (const [k, v] of Object.entries(peste)) {
    if (v === undefined) delete incrustatie[k];
    else incrustatie[k] = v;
  }
  return {
    schema: 26, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri },
      operatii: [{
        id: 'inc', tip: 'buzunar', noduri: noduri.map((n) => n.id), latura: 'interior', sens: 'urcare', adancime: c.gaura ? 3 : c.D, pas: c.pas,
        scula: sculaDoc(prima!), pasLateral: prima!.pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
        ...(rest.length > 0 ? { rest: rest.map((r) => ({ scula: sculaDoc(r), pasLateral: r.pasLateral })) } : {}),
        incrustatie,
        ...operatie,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: c.gaura ? c.D : 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}

async function exporta(brut: unknown, supracursa?: number) {
  const d = incarca(brut);
  if (!d.ok) assert.fail(d.motiv);
  return calculeazaExport(d.doc, { origine: 'stanga-jos', z0: 'sus', ...(supracursa === undefined ? {} : { supracursa }) });
}

/** Sculele bucăților unui program, în ordine: cea de la pornire, apoi fiecare `T… M6`, după numărul lor. */
function scule(text: string, freze: readonly FrezaPlataCaz[]): SculaOracol[] {
  const dupaNumar = new Map(freze.map((f) => [f.numar, f.diametru]));
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  const ramase = freze.map((f) => f.numar).filter((n) => n !== m6[0]);
  const pornire = m6.length === 0 ? freze[0]!.numar : (ramase[0] ?? freze[0]!.numar);
  return [pornire, ...m6].map((n) => ({ tip: 'plata', diametru: dupaNumar.get(n) ?? NaN }));
}

const masoara = (c: CazTrepte, locas: string, dop: string): MasuraTrepte => masoaraPotrivireaTrepte(
  { text: locas, scule: scule(locas, c.locas) }, { text: dop, scule: scule(dop, c.locas) }, c.desen,
  {
    d: c.d, D: c.D, tija: c.tija, h: c.h, dop: c.dop, margine: c.margine, latire: c.spre === 'exterior' ? c.s : 0,
    // Celula grilei grosiere: 0,1 mm la Ø6 (desene mari), 0,05 la frezele mici; bisecția face punctele pereților exacte.
    celula: c.locas[0]!.diametru >= 6 ? 2 * CELULA : CELULA,
  },
);

async function potrivire(c: CazTrepte, supracursa?: number): Promise<{
  readonly m: MasuraTrepte; readonly locas: string; readonly dop: string; readonly grosime: number; readonly exacta: boolean;
  readonly avertismente: readonly string[];
}> {
  const r = await exporta(documentTrepte(c), supracursa);
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  assert.equal(r.dopuri.length, 1, `${c.id}: un singur dop`);
  const locas = r.program.text, dop = r.dopuri[0]!.program.text;
  return {
    m: masoara(c, locas, dop), locas, dop, grosime: r.dopuri[0]!.semifabricat.grosimeMinima, exacta: r.dopuri[0]!.semifabricat.exacta === true,
    // Avertismentele dopului vin în lista exportului, cu „dopul …” în față.
    avertismente: r.avertismente,
  };
}

for (const c of CAZURI_TREPTE) {
  test(`treptele pe oracol, ${c.id}: jocul ${c.c} pe ambele niveluri, flanșa pe umăr, oprirea și pereții pe hârtie (${c.hartie})`, async () => {
    const { m, grosime, exacta, avertismente } = await potrivire(c);
    const unde = `${c.id}: sus ${JSON.stringify(m.sus)}, jos ${JSON.stringify(m.jos)}, reazem ${JSON.stringify(m.reazem)}, d ${m.umar}, D ${m.adancime}, tija ${m.tija}, h ${m.inaltime}`;
    for (const [nume, n] of [['nivelul de sus (cu flanșa)', m.sus], ['deschiderea (cu tija)', m.jos]] as const) {
      assert.ok(n.joc.n > 100, `${nume}, punctele peretelui locașului: ${unde}`);
      assert.ok(n.joc.min >= c.c - TOL_JOC && n.joc.max <= c.c + TOL_JOC, `${nume}, jocul lateral c = ${c.c} ± ${TOL_JOC}: ${unde}`);
      assert.ok(n.nDop > 100, `${nume}, punctele peretelui dopului: ${unde}`);
      assert.equal(n.interferenta, 0, `${nume}, niciun punct al dopului în afara locașului: ${unde}`);
    }
    assert.ok(m.reazem.n > 100 && m.reazem.min > 0, `flanșa trece de deschidere peste tot (stă pe umăr): ${unde}`);
    assert.ok(Math.abs(m.umar - c.d) <= TOL_Z, `umărul la d = ${c.d}: ${unde}`);
    assert.ok(Math.abs(m.adancime - c.D) <= TOL_Z, `fundul la D = ${c.D}: ${unde}`);
    assert.ok(Math.abs(m.tija - c.tija) <= TOL_Z, `tija de ${c.tija}: ${unde}`);
    assert.ok(Math.abs(m.inaltime - c.h) <= TOL_Z, `dopul înalt de ${c.h}: ${unde}`);
    // Sprijinul: pe umăr, flanșa stă pe el (sub tijă rămâne g; la gaură, tija iese la nivel cu fața de jos); pe fund, tija stă
    // pe fund (deasupra umărului rămâne g). Peste placă rămâne H.
    if (c.sprijin === 'umar') {
      const sub = c.gaura ? 0 : c.g;
      assert.ok(Math.abs(m.adancime - m.umar - m.tija - sub) <= 2 * TOL_Z, `sub tijă rămân ${sub}: ${unde}`);
      assert.ok(Math.abs(m.inaltime - m.tija - m.umar - c.H) <= 2 * TOL_Z, `peste placă rămâne H = ${c.H}: ${unde}`);
    } else {
      assert.ok(Math.abs(m.tija - (m.adancime - m.umar) - c.g) <= 2 * TOL_Z, `deasupra umărului rămâne g = ${c.g}: ${unde}`);
      assert.ok(Math.abs(m.inaltime - m.adancime - c.H) <= 2 * TOL_Z, `peste placă rămâne H = ${c.H}: ${unde}`);
    }
    // Semifabricatul: cel ridicat, cel puțin h + 1; cel decupat, exact h (și se spune că se întoarce, spre deosebire de dopul
    // decupat fără treaptă).
    assert.deepEqual({ grosime, exacta }, c.dop === 'decupat' ? { grosime: c.h, exacta: true } : { grosime: c.h + 1, exacta: false }, unde);
    if (c.dop === 'decupat') assert.ok(avertismente.some((a) => /e în trepte, oglindit, cu tija în sus: după decupare, întoarce-l în locaș/.test(a)), avertismente.join(' | '));
    for (const q of c.raze) {
      const t = m.margineaPeRaza(q.nivel, q.p, q.d, q.lungime);
      assert.ok(Math.abs(t - q.asteptat) <= TOL_RAZA, `${c.id}, ${q.nivel}, ${q.ce}: ${t.toFixed(4)} față de ${q.asteptat.toFixed(4)} pe hârtie`);
    }
  });
}

test('supracursa 0,5 (ADR 0176), dreptunghi-decupat: flanșa decupată prin placa de 9,5 plus 0,5, potrivirea neschimbată, vârful punților tot la 8,5', async () => {
  const c = CAZURI_TREPTE.find((x) => x.id === 'dreptunghi-decupat')!;
  const cu = await potrivire(c, 0.5), fara = await potrivire(c);
  const unde = `sus ${JSON.stringify(cu.m.sus)}, jos ${JSON.stringify(cu.m.jos)}, h ${cu.m.inaltime}, tija ${cu.m.tija}`;
  for (const n of [cu.m.sus, cu.m.jos]) {
    assert.ok(n.joc.n > 100 && n.joc.min >= c.c - TOL_JOC && n.joc.max <= c.c + TOL_JOC, `jocul lateral cu supracursa: ${unde}`);
    assert.equal(n.interferenta, 0, `interferența cu supracursa: ${unde}`);
  }
  // Oracolul dă șanțul decupării cel mai adânc (9,5 + 0,5); dopul e placa, exactă, de 9,5, cu tija neschimbată.
  assert.ok(Math.abs(cu.m.inaltime - (c.h + 0.5)) <= TOL_Z && Math.abs(cu.m.tija - c.tija) <= TOL_Z, `șanțul de ${c.h} + 0,5, tija de ${c.tija}: ${unde}`);
  assert.deepEqual({ grosime: cu.grosime, exacta: cu.exacta }, { grosime: c.h, exacta: true });
  // Locașul nu trece prin foaie, deci nu se schimbă. Dopul: fundul decupării la 9,5 + 0,5, iar vârful punților implicite (groase
  // de 1) tot la 9,5 − 1 = 8,5 de față, nu la 10 − 1 = 9 (ADR 0028 §2: puntea se măsoară de la fața de jos a plăcii).
  assert.equal(cu.locas, fara.locas);
  const z = zuriProgram(cu.dop), z0 = zuriProgram(fara.dop);
  assert.deepEqual([Math.min(...z), Math.min(...z0)], [-10, -9.5]);
  assert.ok(z.has(-8.5) && !z.has(-9), `vârful punților la −8,5: ${[...z].filter((x) => x < 0).sort((a, b) => a - b).join(', ')}`);
  assert.ok(z0.has(-8.5), 'fără supracursă, același vârf');
});

/**
 * Programul oglindit pe X față de mijlocul semifabricatului lat de `W`: X → W − X, I → −I, G2 ↔ G3 (comentariile rămân). Un dop
 * tăiat oglindit devine neoglindit.
 */
function oglindesteX(text: string, W: number): string {
  const n = (x: number): string => String(Math.round(x * 1000) / 1000);
  return text.split('\n').map((linie) => {
    if (linie.startsWith('(') || linie.startsWith(';')) return linie;
    return linie
      .replace(/X(-?\d*\.?\d+)/g, (_, x: string) => `X${n(W - Number(x))}`)
      .replace(/I(-?\d*\.?\d+)/g, (_, i: string) => `I${n(-Number(i))}`)
      .replace(/\bG2\b/g, 'G#').replace(/\bG3\b/g, 'G2').replace(/G#/g, 'G3');
  }).join('\n');
}

test('controlul negativ: dopul în trepte al L-ului, neoglindit (tăiat cu flanșa sus), nu se potrivește', async () => {
  const c = CAZURI_TREPTE.find((x) => x.id === 'L')!;
  const { locas, dop, m } = await potrivire(c);
  assert.equal(m.sus.interferenta + m.jos.interferenta, 0, 'dopul bun se potrivește');
  const { x0, x1 } = cutieDesen(c.desen);
  const W = x1 - x0 + 2 * c.margine;
  const rau = masoara(c, locas, oglindesteX(dop, W));
  const pica = rau.sus.interferenta > 0 || rau.jos.interferenta > 0 || rau.sus.joc.max > c.c + TOL_JOC || rau.jos.joc.max > c.c + TOL_JOC;
  assert.ok(pica, `dopul neoglindit trece drept potrivit: sus ${JSON.stringify(rau.sus)}, jos ${JSON.stringify(rau.jos)}`);
  // Oglinda programului e corectă: de două ori, dopul se potrivește iar (controlul nu pică din cauza transformării).
  const iar = masoara(c, locas, oglindesteX(oglindesteX(dop, W), W));
  assert.equal(iar.sus.interferenta + iar.jos.interferenta, 0, `oglindit de două ori: sus ${JSON.stringify(iar.sus)}, jos ${JSON.stringify(iar.jos)}`);
  assert.ok(iar.jos.joc.min >= c.c - TOL_JOC && iar.jos.joc.max <= c.c + TOL_JOC, `oglindit de două ori, jocul: ${JSON.stringify(iar.jos.joc)}`);
});

test('refuzurile treptei, cu motivul: umărul, adâncimea lui, sprijinul, jocurile, deschiderea care dispare, marginea dopului decupat', async () => {
  const c = CAZURI_TREPTE.find((x) => x.id === 'dreptunghi-umar')!;
  const g = CAZURI_TREPTE.find((x) => x.id === 'gaura')!;
  const refuz = async (brut: unknown, re: RegExp): Promise<void> => {
    const r = await exporta(brut);
    assert.ok(!r.ok && re.test(r.motiv), r.ok ? `primit, aștepta ${re}` : `${r.motiv} (aștepta ${re})`);
  };
  await refuz(documentTrepte(c, { treapta: { adancime: 3, latime: 0.1 } }), /umărul, lat de 0\.1 mm, trebuie să fie mai lat decât jocul lateral \(0\.1 mm\)/);
  await refuz(documentTrepte(c, { treapta: { adancime: 8, latime: 5 } }), /umărul, la 8 mm, trebuie să fie mai sus decât fundul locașului \(8 mm\)/);
  await refuz(documentTrepte(g, { treapta: { adancime: 10, latime: 4 } }), /umărul, la 10 mm, trebuie să fie mai sus decât fața de jos a foii \(10 mm\)/);
  await refuz(documentTrepte(c, { sprijin: 'fata' }), /cu treaptă, dopul stă pe umăr sau pe fund/);
  await refuz(documentTrepte(c, { treapta: undefined }), /sprijinul pe umăr cere treapta/);
  await refuz(documentTrepte(g, { sprijin: 'fund' }), /gaura n-are fund: dopul în trepte stă pe umăr/);
  await refuz(documentTrepte(c, { treapta: { adancime: 3, latime: 13 } }), /deschiderea de sub umăr: o parte e mai îngustă decât freza locașului \(Ø6\)/);
  await refuz(documentTrepte(c, { treapta: { adancime: 3, latime: 16 } }), /deschiderea de sub umăr dispare/);
  // Doar într-o parte a desenului: lângă dreptunghiul de 40 × 30, o fâșie de 8 × 30 n-are deschidere sub umărul de 5 (8 − 2·5 < 0).
  const doua: CazTrepte = { ...c, desen: [...c.desen, [[80, 30], [88, 30], [88, 60], [80, 60]]] };
  await refuz(documentTrepte(doua), /deschiderea de sub umăr dispare într-o parte a desenului: umărul \(5 mm pe fiecare parte\)/);
  // Flanșa dopului decupat cel mult cât punțile de groasă: punțile i-ar ține tija, nu flanșa.
  await refuz(documentTrepte(c, { dop: 'decupat', margine: 8, fierastrau: 0.5, treapta: { adancime: 0.5, latime: 5 } }),
    /flanșa dopului decupat în trepte, groasă de 1 mm, trebuie să fie mai groasă decât punțile \(1 mm\)/);
  await refuz(documentTrepte(c, { joc: 5 }), /jocul de sub tijă, de 5 mm, trebuie să fie sub D − d = 5 mm/);
  await refuz(documentTrepte(c, { sprijin: 'fund', joc: 3 }), /jocul de deasupra umărului, de 3 mm, trebuie să fie sub adâncimea umărului \(3 mm\)/);
  await refuz(documentTrepte(c, { joc: 0.05 }), /jocul de sub tijă, de 0\.05 mm, trebuie să fie cel puțin 0\.1 mm/);
  // Dopul decupat în trepte: tija se ocolește cu prima freză a dopului (Ø10) până la 10,5 mm dincolo de flanșă, deci marginea 5
  // nu ajunge (cea mai mică freză, Ø3, încape în ea).
  await refuz(documentTrepte(c, {
    dop: 'decupat', margine: 5, frezeDop: [{ scula: { numar: 2, nume: 'f', diametru: 10 }, pasLateral: 4 }, { scula: { numar: 3, nume: 'f', diametru: 3 }, pasLateral: 1.2 }],
  }), /marginea dopului decupat în trepte \(5 mm\) trebuie să fie cel puțin 10\.5 mm/);
  // La gaură, jocul nu se aplică (tija iese la nivel cu fața de jos): oricât de mic, nu refuză.
  const r = await exporta(documentTrepte(g, { joc: 0.05 }));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
});

test('valorile pe hârtie ale treptei: tija și flanșa după sprijin, înălțimea dopului și semifabricatul', () => {
  const op = (inc: Record<string, unknown>, adancime = 8) => ({
    adancime, scula: { numar: 1, nume: 'f', diametru: 6 },
    incrustatie: {
      fel: 'drept' as const, jocLateral: 0.1, dop: 'ridicat' as const, sprijin: 'umar' as const, joc: 0.5, fierastrau: 2, margine: 5,
      treapta: { adancime: 3, latime: 5 }, ...inc,
    },
  });
  const t = (v: ReturnType<typeof valoriIncrustatieDreapta>) => [v!.treapta?.tija, v!.treapta?.flansa, v!.inaltime, v!.grosime];
  assert.deepEqual(t(valoriIncrustatieDreapta(op({}))), [4.5, 5, 9.5, 10.5]);
  assert.deepEqual(t(valoriIncrustatieDreapta(op({ sprijin: 'fund' }))), [5.5, 4.5, 10, 11]);
  assert.deepEqual(t(valoriIncrustatieDreapta(op({ dop: 'decupat' }))), [4.5, 5, 9.5, 9.5]);
  // La gaură, din grosimea foii: tija T − d = 15, flanșa d + H = 5.
  assert.deepEqual(t(valoriIncrustatieDreapta(op({ locas: 'gaura' }, 3), 18)), [15, 5, 20, 21]);
  // Încotro: spre exterior, cum e scris; lipsă, spre interior.
  assert.deepEqual([valoriIncrustatieDreapta(op({ treapta: { adancime: 3, latime: 5, spre: 'exterior' } }))!.treapta?.spre, valoriIncrustatieDreapta(op({}))!.treapta?.spre],
    ['exterior', 'interior']);
  // Fără treaptă, nimic nou: dopul pe fund, D + H.
  const fara = valoriIncrustatieDreapta(op({ treapta: undefined, sprijin: 'fund' }))!;
  assert.deepEqual([fara.treapta, fara.inaltime], [null, 10]);
});

test('avertismentele colțurilor sunt ale nivelului care urmează desenul: sus spre interior, deschiderea spre exterior', async () => {
  // Colțul drept, cu Ø6, se retrage 3(√2 − 1) = 1,243 mm față de desen; spre exterior, nivelul de sus (desenul lărgit cu 4,
  // colțurile R4) nu se retrage, dar deschiderea (chiar desenul) da.
  for (const id of ['dreptunghi-umar', 'exterior']) {
    const c = CAZURI_TREPTE.find((x) => x.id === id)!;
    const r = await exporta(documentTrepte(c));
    if (!r.ok) assert.fail(`${id}: ${r.motiv}`);
    assert.ok(r.avertismente.some((a) => /cel mai ascuțit vârf se retrage 1\.243 mm față de desen/.test(a)), `${id}: ${r.avertismente.join(' | ')}`);
  }
});
