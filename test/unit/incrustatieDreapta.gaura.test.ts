/**
 * Gaura incrustației cu pereți drepți (ADR 0175, felia 12.1↑f), pe oracolul independent al potrivirii
 * (`test/oracles/incrustatieDreapta.ts`): locașul trece prin foaie, cu adâncimea ei (nu cea scrisă în operație), iar dopul e
 * decupat prin placa lui de T + H, la nivel cu fața de jos, sau ridicat, cu fața pe placă, înalt de T. Jocul lateral c ± 0,02 pe
 * tot peretele (și în colțuri), nicio interferență, adâncimea și înălțimea ± 0,05. Controlul: fără gaură, adâncimea e a
 * operației; cu altă grosime a foii, gaura și dopul o urmează. Refuzurile lucrării: dopul ridicat pe fund la o gaură, sprijinul
 * pe umăr fără treaptă (treptele au proba lor, `incrustatieDreapta.trepte.test.ts`). Valorile pe hârtie
 * (`valoriIncrustatieDreapta`) din grosimea foii.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { valoriIncrustatieDreapta } from '../../src/model/incrustatie.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { masoaraPotrivireaDreapta } from '../oracles/incrustatieDreapta.ts';
import type { DesenO } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const TOL_JOC = 0.02, TOL_Z = 0.05;
/** Dreptunghiul de 30 × 20 din (20, 20), cum îl citește oracolul. */
const DESEN: DesenO = [[[20, 20], [50, 20], [50, 40], [20, 40]]];
const H = 2, C = 0.1, MARGINE = 8;

/** Buzunarul Ø6 (adâncimea scrisă 3, pe care gaura o ignoră) cu incrustația dreaptă dată, pe o foaie groasă de `T`. */
function document(incrustatie: Record<string, unknown>, T = 10): unknown {
  return {
    schema: 25, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: { ...I, e: 20, f: 20 }, forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 } },
      operatii: [{
        id: 'o', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 3, pas: 2.5, pasLateral: 2.4,
        scula: { numar: 1, nume: 'freza plata', diametru: 6 }, urechi: null, rampa: null, intrari: null, colturi: null,
        incrustatie: { fel: 'drept', jocLateral: C, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: H, margine: MARGINE, ...incrustatie },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: T }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}

async function exporta(brut: unknown, supracursa?: number) {
  const d = incarca(brut);
  if (!d.ok) assert.fail(d.motiv);
  return calculeazaExport(d.doc, { origine: 'stanga-jos', z0: 'sus', ...(supracursa === undefined ? {} : { supracursa }) });
}

/** Sculele bucăților unui program cu o singură freză (Ø6), câte bucăți are. */
const scule = (text: string): SculaOracol[] => Array.from({ length: 1 + [...text.matchAll(/^T\d+ M6$/gm)].length }, () => ({ tip: 'plata', diametru: 6 }));

async function potrivire(incrustatie: Record<string, unknown>, D: number, h: number, T = 10, supracursa?: number) {
  const r = await exporta(document(incrustatie, T), supracursa);
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.dopuri.length, 1);
  const locas = r.program.text, dop = r.dopuri[0]!.program.text;
  const m = masoaraPotrivireaDreapta({ text: locas, scule: scule(locas) }, { text: dop, scule: scule(dop) }, DESEN,
    { D, h, dop: incrustatie['dop'] === 'ridicat' ? 'ridicat' : 'decupat', margine: MARGINE, celula: 0.1 });
  return { r, m };
}

function jocBun(m: { readonly joc: { readonly n: number; readonly min: number; readonly max: number }; readonly interferenta: number }, unde: string): void {
  assert.ok(m.joc.n > 100, `${unde}: ${m.joc.n} puncte de perete`);
  assert.ok(m.joc.min >= C - TOL_JOC && m.joc.max <= C + TOL_JOC, `${unde}: jocul ${JSON.stringify(m.joc)}`);
  assert.equal(m.interferenta, 0, `${unde}: interferența`);
}

test('gaura cu dopul decupat: locașul trece prin foaia de 10 (nu 3, cât scrie operația), dopul e gros de 10 + 2, jocul 0,1', async () => {
  const { r, m } = await potrivire({ locas: 'gaura' }, 10, 12);
  jocBun(m, 'decupat');
  assert.ok(Math.abs(m.adancime - 10) <= TOL_Z, `adâncimea locașului ${m.adancime}, pe hârtie 10 (prin foaie)`);
  assert.ok(Math.abs(m.inaltime - 12) <= TOL_Z, `înălțimea dopului ${m.inaltime}, pe hârtie T + H = 12`);
  // Dopul la nivel cu fața de jos: placa lui e exact cât gaura plus H, iar H iese deasupra (h − D).
  assert.deepEqual({ grosime: r.dopuri[0]!.semifabricat.grosimeMinima, exacta: r.dopuri[0]!.semifabricat.exacta }, { grosime: 12, exacta: true });
  assert.ok(Math.abs(m.inaltime - m.adancime - H) <= 2 * TOL_Z, `iese peste placă ${m.inaltime - m.adancime}, pe hârtie H = 2`);
});

test('gaura cu dopul ridicat pe față: dopul e înalt cât foaia (10), la nivel cu fața de jos; semifabricatul cel puțin 11', async () => {
  const { r, m } = await potrivire({ locas: 'gaura', dop: 'ridicat', sprijin: 'fata' }, 10, 10);
  jocBun(m, 'ridicat');
  assert.ok(Math.abs(m.adancime - 10) <= TOL_Z, `adâncimea locașului ${m.adancime}`);
  assert.ok(Math.abs(m.inaltime - 10) <= TOL_Z, `înălțimea dopului ${m.inaltime}, pe hârtie T = 10 (sub el nu rămâne joc)`);
  assert.equal(r.dopuri[0]!.semifabricat.grosimeMinima, 11);
});

test('controlul: fără gaură, locașul are adâncimea operației (3); cu foaia de 12, gaura și dopul o urmează', async () => {
  const { m } = await potrivire({}, 3, 5);
  assert.ok(Math.abs(m.adancime - 3) <= TOL_Z, `buzunarul ${m.adancime}, pe hârtie 3`);
  const doisprezece = await potrivire({ locas: 'gaura' }, 12, 14, 12);
  jocBun(doisprezece.m, 'foaia de 12');
  assert.ok(Math.abs(doisprezece.m.adancime - 12) <= TOL_Z && Math.abs(doisprezece.m.inaltime - 14) <= TOL_Z,
    `foaia de 12: adâncimea ${doisprezece.m.adancime}, dopul ${doisprezece.m.inaltime}`);
});

test('supracursa: gaura trece cu ea în masa de sacrificiu (10 + 0,3), dopul rămâne cât placa plus H (12)', async () => {
  const { m } = await potrivire({ locas: 'gaura' }, 10.3, 12, 10, 0.3);
  jocBun(m, 'cu supracursa');
  assert.ok(Math.abs(m.adancime - 10.3) <= TOL_Z, `adâncimea locașului ${m.adancime}, pe hârtie 10 + 0,3`);
  assert.ok(Math.abs(m.inaltime - 12) <= TOL_Z, `înălțimea dopului ${m.inaltime}, pe hârtie 12 (fără supracursa)`);
});

test('refuzurile lucrării, cu motivul: dopul ridicat pe fund la o gaură; sprijinul pe umăr fără treaptă', async () => {
  const fund = await exporta(document({ locas: 'gaura', dop: 'ridicat', sprijin: 'fund' }));
  assert.ok(!fund.ok && /gaura n-are fund: dopul ridicat se sprijină pe fața plăcii/.test(fund.motiv), fund.ok ? 'primit' : fund.motiv);
  const umar = await exporta(document({ locas: 'gaura', dop: 'ridicat', sprijin: 'umar' }));
  assert.ok(!umar.ok && /sprijinul pe umăr cere treapta/.test(umar.motiv), umar.ok ? 'primit' : umar.motiv);
  // Jocul de sub dop nu se aplică la gaură: un joc oricât de mic (sub 0,1) nu refuză dopul ridicat pe față.
  const joc = await exporta(document({ locas: 'gaura', dop: 'ridicat', sprijin: 'fata', joc: 0.05 }));
  assert.ok(joc.ok, joc.ok ? '' : joc.motiv);
});

test('valorile pe hârtie: la gaură, din grosimea foii (decupat T + H, ridicat pe față T); fără grosime, ale operației', () => {
  const op = (inc: Record<string, unknown>) => ({
    adancime: 3, scula: { numar: 1, nume: 'f', diametru: 6 },
    incrustatie: { fel: 'drept' as const, jocLateral: C, dop: 'decupat' as const, sprijin: 'fund' as const, joc: 0.5, fierastrau: H, margine: MARGINE, ...inc },
  });
  const decupat = valoriIncrustatieDreapta(op({ locas: 'gaura' }), 18)!;
  assert.deepEqual([decupat.inaltime, decupat.grosime], [20, 20]);
  const ridicat = valoriIncrustatieDreapta(op({ locas: 'gaura', dop: 'ridicat', sprijin: 'fata' }), 18)!;
  assert.deepEqual([ridicat.inaltime, ridicat.grosime], [18, 19]);
  // Fără grosimea foii (sau fără gaură), adâncimea e a operației: 3 + 2 la decupat, 3 − 0,5 pe față.
  assert.deepEqual([valoriIncrustatieDreapta(op({ locas: 'gaura' }))!.inaltime, valoriIncrustatieDreapta(op({}), 18)!.inaltime], [5, 5]);
  assert.equal(valoriIncrustatieDreapta(op({ dop: 'ridicat', sprijin: 'fata' }), 18)!.inaltime, 2.5);
});
