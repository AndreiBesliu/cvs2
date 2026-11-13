/**
 * Punțile dopului decupat, alese în fereastră (ADR 0174, felia 12.1↑b-2): dopul folosește `punti` din incrustație (câte pe
 * buclă, lățimea, grosimea de la fața de jos), nu cele implicite; palierul pe traseu e lățimea plus freza. Pe programul dopului
 * (dreptunghiul de 30 × 20, freza Ø6, placa de 3 + 2 = 5 mm), sub vârful punților rămâne lemn pe linia de mijloc a șanțului doar
 * în dreptul lor, iar deasupra vârfului nimic. Ce nu se poate tăia îl refuză lucrarea, cu motiv: punți cel puțin cât placa,
 * o buclă pe care nu încape nicio punte. Pe dopul ridicat, câmpul nu schimbă nimic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { functieTaiere, mutariPeScule } from '../oracles/incrustatieDreapta.ts';
import type { SculaOracol } from '../oracles/simulare.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Dreptunghiul de 30 × 20 din (20, 20), buzunar Ø6 adânc de 3, cu dopul dat (H 2: placa de 5), marginea 8, și punțile date. */
function document(punti: unknown, dop: 'decupat' | 'ridicat' = 'decupat'): unknown {
  return {
    schema: 24, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: { ...I, e: 20, f: 20 }, forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 } },
      operatii: [{
        id: 'o', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5, pasLateral: 2.4,
        scula: { numar: 1, nume: 'freza plata', diametru: 6 }, urechi: null, rampa: null, intrari: null, colturi: null,
        incrustatie: {
          fel: 'drept', jocLateral: 0.1, dop, sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 8, ...(punti === undefined ? {} : { punti }),
        },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}

async function exporta(brut: unknown) {
  const d = incarca(brut);
  if (!d.ok) assert.fail(d.motiv);
  return calculeazaExport(d.doc, { origine: 'stanga-jos', z0: 'sus' });
}

/**
 * Bucățile netăiate (lemnul punților) la înălțimea z a programului dopului, pe linia de mijloc a șanțului (3 mm în afara
 * dopului [8,1; 37,9] × [8,1; 27,9]), pe laturile drepte, din 0,1 în 0,1 mm, în ordinea de pe buclă.
 */
function puntiLa(program: string, z: number): number[] {
  const scule: SculaOracol[] = Array.from({ length: 1 + [...program.matchAll(/^T\d+ M6$/gm)].length }, () => ({ tip: 'plata', diametru: 6 }));
  const taiat = functieTaiere(mutariPeScule(program, scule), z);
  const x0 = 8.1 - 3, x1 = 37.9 + 3, y0 = 8.1 - 3, y1 = 27.9 + 3;
  const puncte: Array<readonly [number, number]> = [];
  for (let x = 8.1; x <= 37.9 + 1e-9; x += 0.1) puncte.push([x, y0]);
  for (let y = 8.1; y <= 27.9 + 1e-9; y += 0.1) puncte.push([x1, y]);
  for (let x = 37.9; x >= 8.1 - 1e-9; x -= 0.1) puncte.push([x, y1]);
  for (let y = 27.9; y >= 8.1 - 1e-9; y -= 0.1) puncte.push([x0, y]);
  const bucati: number[] = [];
  let lungime = 0;
  for (const [x, y] of puncte) {
    if (taiat(x, y) > 0) lungime += 0.1;
    else if (lungime > 0) { bucati.push(lungime); lungime = 0; }
  }
  if (lungime > 0) bucati.push(lungime);
  return bucati;
}

test('punțile alese (2 pe buclă, late de 6 mm, groase de 1,5 mm): exact atâtea, cel puțin atât de late, cu vârful la 1,5 mm de fund', async () => {
  const r = await exporta(document({ numar: 2, latime: 6, grosime: 1.5 }));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  assert.ok(r.avertismente.includes('dopul i/a: e decupat cu 2 punți pe buclă, late de 6 mm și groase de 1.5 mm; taie-le și curăță-le la nivelul pereților înainte de lipire'),
    r.avertismente.join(' | '));
  const program = r.dopuri[0]!.program.text;
  // Placa de 5: vârful punților la 5 − 1,5 = 3,5 mm de față. Sub el (la −4,25), lemnul punților; deasupra (la −3,25), nimic.
  const sub = puntiLa(program, -4.25);
  assert.equal(sub.length, 2, `bucățile netăiate la −4,25: ${sub.map((b) => b.toFixed(1)).join(', ')}`);
  for (const b of sub) assert.ok(b >= 5.9, `o punte lată de ${b.toFixed(1)} mm, sub 6`);
  assert.deepEqual(puntiLa(program, -3.25), [], 'deasupra vârfului punților rămâne lemn');
  // Cu punțile implicite (groase de 1), la −3,75 nu mai rămâne nimic; cu cele de 1,5, da: grosimea e chiar a incrustației.
  assert.equal(puntiLa(program, -3.75).length, 2);
  const implicit = await exporta(document(undefined));
  assert.ok(implicit.ok, implicit.ok ? '' : implicit.motiv);
  assert.deepEqual(puntiLa(implicit.dopuri[0]!.program.text, -3.75), []);
  assert.equal(puntiLa(implicit.dopuri[0]!.program.text, -4.5).length, 4);
});

test('punțile cu un câmp necunoscut trec; aceleași valori ca implicitele dau același program ca fără câmp', async () => {
  const fara = await exporta(document(undefined));
  const cu = await exporta(document({ numar: 4, latime: 4, grosime: 1, nota: 'x' }));
  assert.ok(fara.ok && cu.ok);
  assert.equal(cu.dopuri[0]!.program.text, fara.dopuri[0]!.program.text);
});

test('punțile cel puțin cât placa dopului: refuzul lucrării, cu motivul (ca la urechile unei operații)', async () => {
  const r = await exporta(document({ numar: 4, latime: 4, grosime: 5 }));
  assert.ok(!r.ok);
  assert.match(r.motiv, /^i\/a, dopul: .*urechile de 5 mm nu încap în foaia de 5 mm/);
});

test('o buclă pe care nu încape nicio punte (lățimea plus freza peste lungimea ei): refuzul, cu bucla și palierul', async () => {
  // Traseul frezei Ø6 în jurul dopului de 29,8 × 19,8 (colțurile R3,1): 2·(29,8 + 19,8) + 2π·3,1 ≈ 118,7 mm; palierul 200 + 6.
  const r = await exporta(document({ numar: 4, latime: 200, grosime: 1 }));
  assert.ok(!r.ok);
  assert.match(r.motiv, /^i\/a, dopul: bucla 1 a decupării, de 11\d(\.\d+)? mm, e prea mică pentru o punte cu palierul de 206 mm \(lățimea plus freza\)$/);
  // Late de 60: palierul 66, deci încape una (⌊0,9 · 118,7 / 66⌋ = 1), cu avertismentul buclei mici.
  const una = await exporta(document({ numar: 4, latime: 60, grosime: 1 }));
  assert.ok(una.ok, una.ok ? '' : una.motiv);
  assert.ok(una.avertismente.includes('dopul i/a: pe o buclă mică încap mai puține punți decât cele 4 cerute (cel puțin 1 pe buclă)'), una.avertismente.join(' | '));
});

test('pe dopul ridicat, punțile nu schimbă nimic (dopul n-are punți)', async () => {
  const fara = await exporta(document(undefined, 'ridicat'));
  const cu = await exporta(document({ numar: 2, latime: 6, grosime: 1.5 }, 'ridicat'));
  assert.ok(fara.ok && cu.ok);
  assert.equal(cu.dopuri[0]!.program.text, fara.dopuri[0]!.program.text);
  assert.deepEqual(cu.avertismente, fara.avertismente);
});
