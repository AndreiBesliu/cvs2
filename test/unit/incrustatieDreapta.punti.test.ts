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
 * Linia de mijloc a șanțului, toată (laturile și colțurile): dopul e [8,1; 37,9] × [8,1; 27,9] cu colțurile R2,9 (locașul
 * 30 × 20 cu colțurile R3 ale frezei, micșorat cu 0,1), iar linia e la 3 mm în afara lui: laturile de 24 și 14 mm, colțurile
 * R5,9 în jurul centrelor (11, 11), (35, 11), (35, 25), (11, 25). Lungimea ei: 2 · 24 + 2 · 14 + 2π · 5,9 ≈ 113,07 mm.
 */
const R_COLT = 5.9;
const BUCLA: ReadonlyArray<{ readonly l: number; readonly punct: (s: number) => readonly [number, number] }> = [
  { l: 24, punct: (s) => [11 + s, 5.1] },
  { l: (Math.PI / 2) * R_COLT, punct: (s) => [35 + R_COLT * Math.sin(s / R_COLT), 11 - R_COLT * Math.cos(s / R_COLT)] },
  { l: 14, punct: (s) => [40.9, 11 + s] },
  { l: (Math.PI / 2) * R_COLT, punct: (s) => [35 + R_COLT * Math.cos(s / R_COLT), 25 + R_COLT * Math.sin(s / R_COLT)] },
  { l: 24, punct: (s) => [35 - s, 30.9] },
  { l: (Math.PI / 2) * R_COLT, punct: (s) => [11 - R_COLT * Math.sin(s / R_COLT), 25 + R_COLT * Math.cos(s / R_COLT)] },
  { l: 14, punct: (s) => [5.1, 25 - s] },
  { l: (Math.PI / 2) * R_COLT, punct: (s) => [11 - R_COLT * Math.cos(s / R_COLT), 11 - R_COLT * Math.sin(s / R_COLT)] },
];
const P = BUCLA.reduce((a, b) => a + b.l, 0);

/**
 * Bucățile netăiate (lemnul punților) la înălțimea z a programului dopului, pe toată linia de mijloc a șanțului, din 0,02 în
 * 0,02 mm, în ordinea de pe buclă (pornind dintr-un loc tăiat, ca o bucată să nu fie ruptă de capătul buclei). Oracolul
 * (`functieTaiere`) ia doar mutările aflate toate sub z, deci flancurile punții (care urcă) nu taie la z.
 */
function puntiLa(program: string, z: number): number[] {
  const scule: SculaOracol[] = Array.from({ length: 1 + [...program.matchAll(/^T\d+ M6$/gm)].length }, () => ({ tip: 'plata', diametru: 6 }));
  const taiat = functieTaiere(mutariPeScule(program, scule), z);
  const pas = 0.02;
  const netaiat: boolean[] = [];
  for (const seg of BUCLA) for (let s = 0; s < seg.l - 1e-9; s += pas) netaiat.push(taiat(...seg.punct(s)) > 0);
  const start = netaiat.findIndex((x) => !x);
  if (start < 0) return [P];
  const bucati: number[] = [];
  let lungime = 0;
  for (let k = 0; k < netaiat.length; k++) {
    if (netaiat[(start + k) % netaiat.length]) lungime += pas;
    else if (lungime > 0) { bucati.push(lungime); lungime = 0; }
  }
  if (lungime > 0) bucati.push(lungime);
  return bucati;
}

/**
 * Bucata netăiată a unei punți, pe hârtie (ADR 0029, `geometrieUrechi`): palierul W = lățimea + Ø, flancul
 * ℓ = min(W / 2, 0,45 · (S − W)) cu S = P / n, iar trecerile adânci taie până la ℓ de palier, cu raza frezei în jur: W + 2ℓ − Ø.
 */
const bucataPeHartie = (n: number, latime: number, d = 6): number => {
  const W = latime + d;
  return W + 2 * Math.min(W / 2, 0.45 * (P / n - W)) - d;
};

test('punțile alese (2 pe buclă, late de 6 mm, groase de 1,5 mm): exact atâtea, cu palierul lor, cu vârful la 1,5 mm de fund', async () => {
  const r = await exporta(document({ numar: 2, latime: 6, grosime: 1.5 }));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  assert.ok(r.avertismente.includes('dopul i/a: e decupat cu 2 punți pe buclă, late de 6 mm și groase de 1.5 mm; taie-le și curăță-le la nivelul pereților înainte de lipire'),
    r.avertismente.join(' | '));
  const program = r.dopuri[0]!.program.text;
  // Placa de 5: vârful punților la 5 − 1,5 = 3,5 mm de față. Lățimea se citește chiar deasupra fundului (la −4,99), unde taie
  // doar trecerea de la −5 (un flanc peste un colț se taie în bucăți, iar cea de jos ar tăia și mai sus): 2 bucăți de
  // 12 + 2 · 6 − 6 = 18 mm (cu punțile de 4 mm, palierul 10, ar fi 14). Deasupra vârfului (la −3,25), nimic.
  assert.ok(Math.abs(bucataPeHartie(2, 6) - 18) < 1e-9 && Math.abs(bucataPeHartie(2, 4) - 14) < 1e-9);
  const sub = puntiLa(program, -4.99);
  assert.equal(sub.length, 2, `bucățile netăiate la −4,99: ${sub.map((b) => b.toFixed(2)).join(', ')}`);
  for (const b of sub) assert.ok(Math.abs(b - 18) <= 0.15, `o punte de ${b.toFixed(2)} mm pe linia șanțului, pe hârtie 18`);
  assert.deepEqual(puntiLa(program, -3.25), [], 'deasupra vârfului punților rămâne lemn');
  // Cu punțile implicite (groase de 1), la −3,75 nu mai rămâne nimic; cu cele de 1,5, da: grosimea e chiar a incrustației.
  assert.equal(puntiLa(program, -3.75).length, 2);
  const implicit = await exporta(document(undefined));
  assert.ok(implicit.ok, implicit.ok ? '' : implicit.motiv);
  assert.deepEqual(puntiLa(implicit.dopuri[0]!.program.text, -3.75), []);
  // Implicitele: 4 punți de 4 mm, palierul 10, flancul 5: bucățile de 14 mm.
  const patru = puntiLa(implicit.dopuri[0]!.program.text, -4.99);
  assert.equal(patru.length, 4, patru.map((b) => b.toFixed(2)).join(', '));
  for (const b of patru) assert.ok(Math.abs(b - bucataPeHartie(4, 4)) <= 0.15, `o punte implicită de ${b.toFixed(2)} mm, pe hârtie ${bucataPeHartie(4, 4).toFixed(2)}`);
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
  // Traseul frezei Ø6 în jurul dopului (linia de mijloc a șanțului, `BUCLA`): P ≈ 113,07 mm; palierul 200 + 6.
  const r = await exporta(document({ numar: 4, latime: 200, grosime: 1 }));
  assert.ok(!r.ok);
  assert.match(r.motiv, /^i\/a, dopul: bucla 1 a decupării, de 113\.0\d+ mm, e prea mică pentru o punte cu palierul de 206 mm \(lățimea plus freza\)$/);
  // Late de 60: palierul 66, deci încape una (⌊0,9 · 113,07 / 66⌋ = 1), cu avertismentul buclei mici.
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
