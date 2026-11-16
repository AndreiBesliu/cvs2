/**
 * Ce scrie Exportă pentru incrustația cu pereți drepți (ADR 0171 §5, `operatieDinDialog`): valorile rândului peste cele din
 * document, ÎMBINATE (un câmp necunoscut rămâne, ca la incrustația în V), cu `fel: 'drept'`; frezele dopului peste ale ei, pe
 * poziție (fără ele, câmpul pleacă); fără rol, câmpul pleacă; fără valori din dialog, rămâne al operației; Exportă fără nicio
 * schimbare nu scrie o comandă (aceeași operație). Cheia rândului (`incrustatieDreapta`) nu ajunge în document.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Operatie } from '../../src/model/document.ts';
import type { IncrustatieDreaptaOperatie } from '../../src/ui/DialogExport.tsx';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const scula = { numar: 1, diametru: 3 };

/** Buzunarul din document (prin ușă), cu incrustația dată. */
function operatieDinDocument(incrustatie: unknown = {
  fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5, notaAtelier: 'nuc în arțar',
}): Operatie {
  const r = incarca({
    schema: 21, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: I, forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 } },
      operatii: [{
        id: 'o', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 6, pas: 3, pasLateral: 1.2,
        scula: { numar: 1, nume: 'freza plata', diametru: 3 }, urechi: null, rampa: null, intrari: null, colturi: null, incrustatie,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 100, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc.piese[0]!.operatii[0]!;
}

const randul = (incrustatieDreapta: IncrustatieDreaptaOperatie | null) => ({
  scula, latura: 'interior', sens: 'urcare', adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null,
  tip: 'buzunar', pasLateral: 1.2, rest: [], incrustatieDreapta,
} as const);
const BAZA = { jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5 } as const;

test('Exportă îmbină incrustația rândului peste cea din document: valorile noi, câmpul necunoscut rămâne, `fel` e drept', () => {
  const scrisa = operatieDinDialog(operatieDinDocument(), randul({ ...BAZA, jocLateral: 0.2, dop: 'decupat', fierastrau: 3, margine: 6 }), scula);
  assert.deepEqual(scrisa.incrustatie, {
    fel: 'drept', jocLateral: 0.2, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 3, margine: 6, notaAtelier: 'nuc în arțar',
  });
  assert.ok(!Object.hasOwn(scrisa, 'incrustatieDreapta'));
});

test('frezele dopului: cu ele se scriu plate (o freză nouă se cheamă „freza plata”), peste cele vechi pe poziție; fără ele, câmpul pleacă', () => {
  const cuFreze = operatieDinDialog(operatieDinDocument(), randul({ ...BAZA, frezeDop: [{ numar: 2, diametru: 2, pasLateral: 0.8 }, { numar: 3, diametru: 1, pasLateral: 0.4 }] }), scula);
  assert.deepEqual(cuFreze.incrustatie?.fel === 'drept' ? cuFreze.incrustatie.frezeDop : null, [
    { scula: { numar: 2, nume: 'freza plata', diametru: 2 }, pasLateral: 0.8 },
    { scula: { numar: 3, nume: 'freza plata', diametru: 1 }, pasLateral: 0.4 },
  ]);
  // Peste o freză a dopului cu nume și un câmp necunoscut: rămân, iar forma în V pleacă (frezele dopului sunt plate).
  const vechi = operatieDinDocument({
    ...BAZA, fel: 'drept', frezeDop: [{ scula: { numar: 2, nume: 'freza de 2', diametru: 2, forma: { tip: 'v', unghi: 90 } }, pasLateral: 0.8, nota: 'x' }],
  });
  const peste = operatieDinDialog(vechi, randul({ ...BAZA, frezeDop: [{ numar: 2, diametru: 1.5, pasLateral: 0.6 }] }), scula);
  assert.deepEqual(peste.incrustatie?.fel === 'drept' ? peste.incrustatie.frezeDop : null, [
    { scula: { numar: 2, nume: 'freza de 2', diametru: 1.5 }, pasLateral: 0.6, nota: 'x' },
  ]);
  const fara = operatieDinDialog(vechi, randul({ ...BAZA }), scula);
  assert.ok(fara.incrustatie?.fel === 'drept' && !Object.hasOwn(fara.incrustatie, 'frezeDop'));
});

test('fără rol, incrustația pleacă; fără valori din dialog, rămâne; cu aceleași valori, operația e aceeași', () => {
  const o = operatieDinDocument();
  assert.ok(!Object.hasOwn(operatieDinDialog(o, randul(null), scula), 'incrustatie'));
  assert.deepEqual(operatieDinDialog(o, undefined, scula).incrustatie, o.incrustatie);
  assert.deepEqual(operatieDinDialog(o, randul({ ...BAZA }), scula), o);
});

test('o incrustație în V rămasă pe un buzunar nu-și lasă câmpurile în cea cu pereți drepți', () => {
  const o = operatieDinDocument({ fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'fata' });
  assert.deepEqual(operatieDinDialog(o, randul({ ...BAZA }), scula).incrustatie, { fel: 'drept', ...BAZA });
});

// ── Punțile dopului decupat (ADR 0174, felia 12.1↑b-2) ──────────────────────────────────────────────────────────────

const DECUPAT = { ...BAZA, dop: 'decupat' } as const;
const PUNTI_IMPLICITE = { numar: 4, latime: 4, grosime: 1 } as const;
/** Buzunarul unui document v24, cu dopul decupat și punțile date (ori fără ele). */
const decupatV24 = (punti?: unknown): Operatie => {
  const r = incarca({
    schema: 24, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: I, forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 } },
      operatii: [{
        id: 'o', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 6, pas: 3, pasLateral: 1.2,
        scula: { numar: 1, nume: 'freza plata', diametru: 3 }, urechi: null, rampa: null, intrari: null, colturi: null,
        incrustatie: { fel: 'drept', ...DECUPAT, ...(punti === undefined ? {} : { punti }) },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 100, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc.piese[0]!.operatii[0]!;
};
const puntiScrise = (o: Operatie): unknown => (o.incrustatie?.fel === 'drept' ? o.incrustatie.punti : null);

test('punțile alese se scriu pe dopul decupat; cele implicite, peste un dop fără ele, nu (Exportă fără schimbare = aceeași operație)', () => {
  const fara = decupatV24();
  assert.deepEqual(puntiScrise(operatieDinDialog(fara, randul({ ...DECUPAT, punti: { numar: 2, latime: 6, grosime: 1.5 } }), scula)), { numar: 2, latime: 6, grosime: 1.5 });
  // Un singur câmp schimbat (oricare): tot se scriu, toate trei.
  for (const schimbat of [{ numar: 3 }, { latime: 5 }, { grosime: 2 }]) {
    const p = { ...PUNTI_IMPLICITE, ...schimbat };
    assert.deepEqual(puntiScrise(operatieDinDialog(fara, randul({ ...DECUPAT, punti: p }), scula)), p, JSON.stringify(schimbat));
  }
  const neschimbat = operatieDinDialog(fara, randul({ ...DECUPAT, punti: { ...PUNTI_IMPLICITE } }), scula);
  assert.deepEqual(neschimbat, fara);
  assert.ok(neschimbat.incrustatie?.fel === 'drept' && !Object.hasOwn(neschimbat.incrustatie, 'punti'));
});

test('punțile din document se îmbină (un câmp necunoscut rămâne) și rămân scrise când revin la cele implicite', () => {
  const cu = decupatV24({ numar: 2, latime: 6, grosime: 1.5, nota: 'x' });
  assert.deepEqual(puntiScrise(operatieDinDialog(cu, randul({ ...DECUPAT, punti: { numar: 3, latime: 6, grosime: 1.5 } }), scula)), { numar: 3, latime: 6, grosime: 1.5, nota: 'x' });
  assert.deepEqual(puntiScrise(operatieDinDialog(cu, randul({ ...DECUPAT, punti: { ...PUNTI_IMPLICITE } }), scula)), { ...PUNTI_IMPLICITE, nota: 'x' });
  // Aceleași valori: aceeași operație.
  assert.deepEqual(operatieDinDialog(cu, randul({ ...DECUPAT, punti: { numar: 2, latime: 6, grosime: 1.5 } }), scula), cu);
});

test('pe dopul ridicat (fără punți din fereastră), câmpul pleacă; fără valori din dialog, rămâne', () => {
  const cu = decupatV24({ numar: 2, latime: 6, grosime: 1.5 });
  const ridicat = operatieDinDialog(cu, randul({ ...BAZA }), scula);
  assert.ok(ridicat.incrustatie?.fel === 'drept' && ridicat.incrustatie.dop === 'ridicat' && !Object.hasOwn(ridicat.incrustatie, 'punti'));
  // Decupat, dar fără punți în valorile rândului (un apelant vechi): câmpul pleacă la fel, dopul ia cele implicite.
  const faraValori = operatieDinDialog(cu, randul({ ...DECUPAT }), scula);
  assert.ok(faraValori.incrustatie?.fel === 'drept' && !Object.hasOwn(faraValori.incrustatie, 'punti'));
  assert.deepEqual(operatieDinDialog(cu, undefined, scula).incrustatie, cu.incrustatie);
});
