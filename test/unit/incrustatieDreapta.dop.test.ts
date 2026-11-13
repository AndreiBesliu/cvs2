/**
 * Dopul decupat (ADR 0171, răspunsul 1b): se taie prin toată placa lui (D + H), cu punți, ca să nu cadă din placă; o punte
 * lasă lemn lat de 4 mm și gros de 1 mm de la fața de jos. Pe traseul frezei, palierul punții e deci cât freza plus 4 mm
 * (ADR 0031: coloana punții e palierul minus diametrul). Cu freza implicită Ø6 a locașului (fără freze proprii ale dopului),
 * exportul iese, iar pe programul dopului, la 0,5 mm deasupra fundului, rămâne lemn pe linia de mijloc a șanțului doar în
 * dreptul punților: 4 bucăți pe buclă, fiecare lată de cel puțin 4 mm. Găsită prin otrava P06 (dopul fără punți trecea).
 * O parte mică a desenului (cercul R2, cu Ø1) primește câte punți încap pe bucla ei (2), cu avertismentul, în loc ca tot
 * exportul să fie refuzat (găsită înaintea unirii lui 12.1↑c).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { functieTaiere, mutariPeScule } from '../oracles/incrustatieDreapta.ts';
import type { SculaOracol } from '../oracles/simulare.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Dreptunghiul de 30 × 20 din (20, 20), buzunar Ø6 adânc de 3, cu dopul decupat (H 2: placa de 5), marginea 8. */
function documentDecupat(): unknown {
  return {
    schema: 21, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: { ...I, e: 20, f: 20 }, forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 } },
      operatii: [{
        id: 'o', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5, pasLateral: 2.4,
        scula: { numar: 1, nume: 'freza plata', diametru: 6 }, urechi: null, rampa: null, intrari: null, colturi: null,
        incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 8 },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}

test('dopul decupat cu freza Ø6 a locașului iese, cu 4 punți pe buclă, late de cel puțin 4 mm, la fundul plăcii', async () => {
  const d = incarca(documentDecupat());
  if (!d.ok) assert.fail(d.motiv);
  const r = await calculeazaExport(d.doc, { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const dop = r.dopuri[0];
  assert.ok(dop);
  assert.equal(dop.semifabricat.grosimeMinima, 5);
  const scule: SculaOracol[] = Array.from({ length: 1 + [...dop.program.text.matchAll(/^T\d+ M6$/gm)].length }, () => ({ tip: 'plata', diametru: 6 }));
  const taiat = functieTaiere(mutariPeScule(dop.program.text, scule), -4.5);
  // Dopul, pe placa lui (neoglindit, cu marginea 8): conturul tăiat al locașului (30 × 20, colțurile R3) micșorat cu 0,1, deci
  // [8,1; 37,9] × [8,1; 27,9]; linia de mijloc a șanțului e la 3 mm în afara lui. Pe laturile drepte, din 0,1 în 0,1 mm.
  const x0 = 8.1 - 3, x1 = 37.9 + 3, y0 = 8.1 - 3, y1 = 27.9 + 3;
  const puncte: Array<readonly [number, number]> = [];
  for (let x = 8.1; x <= 37.9 + 1e-9; x += 0.1) puncte.push([x, y0]);
  for (let y = 8.1; y <= 27.9 + 1e-9; y += 0.1) puncte.push([x1, y]);
  for (let x = 37.9; x >= 8.1 - 1e-9; x -= 0.1) puncte.push([x, y1]);
  for (let y = 27.9; y >= 8.1 - 1e-9; y -= 0.1) puncte.push([x0, y]);
  // Bucățile netăiate (lemnul punților), în ordinea de pe buclă, cu lungimea lor.
  const bucati: number[] = [];
  let lungime = 0;
  for (const [x, y] of puncte) {
    if (taiat(x, y) > 0) lungime += 0.1;
    else if (lungime > 0) { bucati.push(lungime); lungime = 0; }
  }
  if (lungime > 0) bucati.push(lungime);
  assert.equal(bucati.length, 4, `bucățile netăiate la −4,5: ${bucati.map((b) => b.toFixed(1)).join(', ')}`);
  for (const b of bucati) assert.ok(b >= 3.9, `o punte lată de ${b.toFixed(1)} mm, sub 4`);
});

test('dopul decupat al unei părți mici (cercul R2, freza Ø1): câte punți încap pe buclă (2 din 4), cu avertismentul, nu refuzul', async () => {
  // Pe hârtie: dopul e cercul tăiat R2 micșorat cu 0,1 (R1,9); traseul frezei Ø1, la 0,5 în afara lui (R2,4), are 2π·2,4 =
  // 15,08 mm, iar palierul punții e 4 + 1 = 5 mm: încap ⌊0,9·15,08 / 5⌋ = 2. Înainte, lucrarea refuza tot exportul.
  const d = incarca({
    schema: 23, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: { ...I, e: 30, f: 30 }, forma: { tip: 'cerc', raza: 2 } },
      operatii: [{
        id: 'o', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 4, pas: 2, pasLateral: 0.4,
        scula: { numar: 1, nume: 'freza plata', diametru: 1 }, urechi: null, rampa: null, intrari: null, colturi: null,
        incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5 },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 100, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!d.ok) assert.fail(d.motiv);
  const r = await calculeazaExport(d.doc, { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  assert.ok(r.avertismente.includes('dopul i/a: pe o buclă mică încap mai puține punți decât cele 4 cerute (cel puțin 2 pe buclă)'), r.avertismente.join(' | '));
  const dop = r.dopuri[0]!;
  // Pe placa dopului (neoglindit, marginea 5): centrul la (7, 7); linia de mijloc a șanțului, cercul R2,4. La 0,5 mm deasupra
  // fundului plăcii (6 = 4 + 2), lemnul rămâne doar în dreptul punților: 2 bucăți, fiecare de cel puțin ~4 mm pe cerc.
  const scule: SculaOracol[] = Array.from({ length: 1 + [...dop.program.text.matchAll(/^T\d+ M6$/gm)].length }, () => ({ tip: 'plata', diametru: 1 }));
  const taiat = functieTaiere(mutariPeScule(dop.program.text, scule), -5.5);
  const pasi = 720, bucati: number[] = [];
  let lungime = 0;
  const pePunte = (k: number): boolean => taiat(7 + 2.4 * Math.cos((2 * Math.PI * k) / pasi), 7 + 2.4 * Math.sin((2 * Math.PI * k) / pasi)) > 0;
  // Pornește dintr-un loc tăiat, ca o punte să nu fie ruptă în două de capătul cercului.
  const start = Array.from({ length: pasi }, (_, k) => k).find((k) => !pePunte(k)) ?? 0;
  for (let j = 0; j < pasi; j++) {
    if (pePunte((start + j) % pasi)) lungime += (2 * Math.PI * 2.4) / pasi;
    else if (lungime > 0) { bucati.push(lungime); lungime = 0; }
  }
  if (lungime > 0) bucati.push(lungime);
  assert.equal(bucati.length, 2, `bucățile netăiate pe cercul R2,4: ${bucati.map((b) => b.toFixed(2)).join(', ')}`);
  for (const b of bucati) assert.ok(b >= 3.5, `o punte de ${b.toFixed(2)} mm pe cerc`);
});
