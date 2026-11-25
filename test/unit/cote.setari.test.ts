import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteSetariCote, comutaPePanza, eImplicit, formatCote, grupImplicit, GRUPURI_COTE, numeStratBun, setariCote, optiuniLipireCote, SETARI_IMPLICITE, STRATURI_REZERVATE, stilCote, textSetariCote, type SetariCote } from '../../src/app/setariCote.ts';
import { STRATURI } from '../../src/io/vectori.ts';
import { STIL_IMPLICIT } from '../../src/model/desenCota.ts';

/**
 * Setările cotelor (ADR 0330 §6), grupurile feliei a-2: implicitele din tabelul ADR-ului, citirea înapoi, fiecare câmp greșit
 * adus la implicitul lui (fără să le atingă pe celelalte), și opțiunile lipirii din setări și din taste (Alt, Ctrl).
 */

test('implicitele, din tabelul ADR 0330 §6', () => {
  assert.deepEqual(SETARI_IMPLICITE, {
    cifre: { unitate: 'mm', zecimale: null, zerouri: 'taiate', pas: null, separator: 'limba', cuUnitate: false, inaltime: 3.5, loc: 'deasupra', fractie: 16 },
    linii: { capete: 'plina', marime: 2.5, extensii: true, gol: 1, depasire: 2, distanta: 10 },
    raza: { prefixR: 'R', prefixD: 'Ø', unghiuri: 'zecimale', zecimaleUnghi: 2, linia: 'loc' },
    comportament: { legate: true, pornire: 'automata', dupa: 'ramane', pePanza: true, vecine: 'estompate', pragCifre: 6, culoare: null },
    lipire: { felurile: { varf: true, mijloc: true, centru: true, cadran: true, cutie: true, foaie: true, grila: true }, toleranta: 8, contur: 'ctrl' },
    masurare: { distanta: true, delta: true, unghi: true, cursor: true, bara: true },
    export: { cuCote: false, strat: 'COTE', culoare: '#006d8f', grosime: 0.1, dxf: 'dimension', cifre: 'trasaturi' },
    raport: { cuCote: false },
  });
  assert.deepEqual(citesteSetariCote(null), SETARI_IMPLICITE);
  assert.deepEqual(citesteSetariCote('nu e JSON'), SETARI_IMPLICITE);
  assert.deepEqual(citesteSetariCote('[1,2]'), SETARI_IMPLICITE);
});

test('citite înapoi exact, cu versiunea în text', () => {
  const s: SetariCote = {
    cifre: { unitate: 'inch', zecimale: 4, zerouri: 'pastrate', pas: 0.25, separator: 'punct', cuUnitate: true, inaltime: 5, loc: 'in-linie', fractie: 64 },
    linii: { capete: 'oblica', marime: 3, extensii: false, gol: 0, depasire: 5, distanta: 25 },
    raza: { prefixR: 'r=', prefixD: '', unghiuri: 'gms', zecimaleUnghi: 0, linia: 'afara' },
    comportament: { legate: false, pornire: 'ultimul', dupa: 'selectie', pePanza: false, vecine: 'ascunse', pragCifre: 0, culoare: '#ff8800' },
    lipire: { felurile: { varf: true, mijloc: false, centru: true, cadran: false, cutie: true, foaie: false, grila: true }, toleranta: 12.5, contur: 'mereu' },
    masurare: { distanta: true, delta: false, unghi: true, cursor: false, bara: true },
    export: { cuCote: true, strat: 'Cote-2_A', culoare: '#123abc', grosime: 0.05, dxf: 'linii', cifre: 'text' },
    raport: { cuCote: true },
  };
  const text = textSetariCote(s);
  assert.equal((JSON.parse(text) as { v: number }).v, 1);
  assert.deepEqual(citesteSetariCote(text), s);
});

test('un câmp greșit ia implicitul lui; celelalte rămân', () => {
  const r = citesteSetariCote(JSON.stringify({
    v: 1,
    comportament: { legate: 'da', pornire: 'altceva', dupa: 'selectie' },
    lipire: { felurile: { varf: false, mijloc: 1 }, toleranta: 3, contur: 'uneori' },
    masurare: { distanta: false, cursor: null },
  }));
  assert.deepEqual(r.comportament, { legate: true, pornire: 'automata', dupa: 'selectie', pePanza: true, vecine: 'estompate', pragCifre: 6, culoare: null });
  assert.equal(r.lipire.felurile.varf, false);
  assert.equal(r.lipire.felurile.mijloc, true);
  assert.equal(r.lipire.toleranta, 8, 'sub 4 px: implicitul');
  assert.equal(citesteSetariCote(JSON.stringify({ lipire: { toleranta: 21 } })).lipire.toleranta, 8, 'peste 20 px');
  assert.equal(citesteSetariCote(JSON.stringify({ lipire: { toleranta: 20 } })).lipire.toleranta, 20, '20 e bun');
  assert.equal(r.lipire.contur, 'ctrl');
  assert.deepEqual(r.masurare, { distanta: false, delta: true, unghi: true, cursor: true, bara: true });
});

test('lipirea: butonul Lipire și Alt (inversează), Ctrl pentru conturul cel mai apropiat, toleranța în mm la scara pânzei', () => {
  const s = SETARI_IMPLICITE;
  const fara = { alt: false, ctrl: false };
  const o = optiuniLipireCote(s, fara, true, 10, 4);
  assert.ok(o);
  assert.equal(o.toleranta, 2, '8 px la 4 px/mm');
  assert.equal(o.grila, 10);
  assert.equal(o.peContur, false);
  assert.deepEqual([...o.felurile].sort(), ['cadran', 'centru', 'cutie', 'foaie', 'grila', 'mijloc', 'varf']);
  assert.equal(optiuniLipireCote(s, { alt: true, ctrl: false }, true, null, 4), null, 'Alt oprește lipirea pornită');
  assert.ok(optiuniLipireCote(s, { alt: true, ctrl: false }, false, null, 4), 'și o pornește pe cea oprită');
  assert.equal(optiuniLipireCote(s, fara, false, null, 4), null);
  assert.equal(optiuniLipireCote(s, { alt: false, ctrl: true }, true, null, 4)?.peContur, true, 'Ctrl: conturul');
  const mereu = { ...s, lipire: { ...s.lipire, contur: 'mereu' as const } };
  assert.equal(optiuniLipireCote(mereu, fara, true, null, 4)?.peContur, true);
  const niciodata = { ...s, lipire: { ...s.lipire, contur: 'niciodata' as const } };
  assert.equal(optiuniLipireCote(niciodata, { alt: false, ctrl: true }, true, null, 4)?.peContur, false);
  const faraMijloc = { ...s, lipire: { ...s.lipire, felurile: { ...s.lipire.felurile, mijloc: false } } };
  assert.ok(!optiuniLipireCote(faraMijloc, fara, true, null, 4)?.felurile.has('mijloc'));
});

test('cifrele, liniile și pânza: marginile din tabel, fiecare câmp greșit la implicitul lui', () => {
  const r = (x: object): SetariCote => citesteSetariCote(JSON.stringify(x));
  assert.equal(r({ cifre: { zecimale: 6 } }).cifre.zecimale, 6);
  assert.equal(r({ cifre: { zecimale: 7 } }).cifre.zecimale, null, 'peste 6: automat');
  assert.equal(r({ cifre: { zecimale: 1.5 } }).cifre.zecimale, null, 'neîntreg');
  assert.equal(r({ cifre: { zecimale: 0 } }).cifre.zecimale, 0);
  assert.equal(r({ cifre: { pas: 0.0005 } }).cifre.pas, null, 'sub 0,001');
  assert.equal(r({ cifre: { pas: 101 } }).cifre.pas, null, 'peste 100');
  assert.equal(r({ cifre: { pas: 0.5 } }).cifre.pas, 0.5);
  assert.equal(r({ cifre: { pas: '0.5' } }).cifre.pas, null, 'un text nu e un pas');
  assert.equal(r({ cifre: { unitate: 'yard' } }).cifre.unitate, 'mm');
  assert.equal(r({ cifre: { separator: 'spatiu' } }).cifre.separator, 'limba');
  assert.equal(r({ cifre: { inaltime: 0.5 } }).cifre.inaltime, 3.5);
  assert.equal(r({ cifre: { inaltime: 20 } }).cifre.inaltime, 20);
  assert.equal(r({ cifre: { loc: 'sub' } }).cifre.loc, 'deasupra');
  assert.equal(r({ linii: { capete: 'cerc' } }).linii.capete, 'plina');
  assert.equal(r({ linii: { marime: 11 } }).linii.marime, 2.5);
  assert.equal(r({ linii: { gol: -1, depasire: 5.5 } }).linii.gol, 1);
  assert.equal(r({ linii: { depasire: 5.5 } }).linii.depasire, 2);
  assert.equal(r({ linii: { distanta: 1.9 } }).linii.distanta, 10);
  assert.equal(r({ linii: { distanta: 100 } }).linii.distanta, 100);
  assert.equal(r({ comportament: { pragCifre: 13 } }).comportament.pragCifre, 6);
  assert.equal(r({ comportament: { culoare: 'red' } }).comportament.culoare, null);
  assert.equal(r({ comportament: { culoare: '#FF8800' } }).comportament.culoare, null, 'doar litere mici, ca din alegătorul culorii');
  assert.equal(r({ comportament: { culoare: '#00aa33' } }).comportament.culoare, '#00aa33');
  assert.equal(r({ comportament: { pePanza: 0 } }).comportament.pePanza, true);
  assert.equal(r({ comportament: { vecine: 'pe jumatate' } }).comportament.vecine, 'estompate');
  assert.equal(r({ comportament: { vecine: 'ascunse' } }).comportament.vecine, 'ascunse');
});

test('raza, diametrul, unghiul și fracțiile: marginile, fiecare câmp greșit la implicitul lui', () => {
  const r = (x: object): SetariCote => citesteSetariCote(JSON.stringify(x));
  assert.equal(r({ cifre: { unitate: 'fractii' } }).cifre.unitate, 'fractii');
  for (const f of [2, 4, 8, 16, 32, 64]) assert.equal(r({ cifre: { fractie: f } }).cifre.fractie, f);
  for (const f of [3, 128, 1, 0, '16', null]) assert.equal(r({ cifre: { fractie: f } }).cifre.fractie, 16, `numitorul ${String(f)}`);
  assert.equal(r({ raza: { prefixR: '' } }).raza.prefixR, '', 'golit: fără prefix');
  assert.equal(r({ raza: { prefixR: 'RAZA=123' } }).raza.prefixR, 'RAZA=123', 'opt semne');
  assert.equal(r({ raza: { prefixR: 'RAZA=1234' } }).raza.prefixR, 'R', 'nouă: prea lung');
  assert.equal(r({ raza: { prefixD: 7 } }).raza.prefixD, 'Ø');
  assert.equal(r({ raza: { prefixD: '𝜙𝜙𝜙𝜙𝜙𝜙𝜙𝜙' } }).raza.prefixD, '𝜙𝜙𝜙𝜙𝜙𝜙𝜙𝜙', 'opt semne în afara planului de bază: semnele, nu unitățile UTF-16');
  assert.equal(r({ raza: { unghiuri: 'radiani' } }).raza.unghiuri, 'zecimale');
  assert.equal(r({ raza: { unghiuri: 'gms' } }).raza.unghiuri, 'gms');
  assert.equal(r({ raza: { zecimaleUnghi: 4 } }).raza.zecimaleUnghi, 4);
  assert.equal(r({ raza: { zecimaleUnghi: 5 } }).raza.zecimaleUnghi, 2, 'peste 4');
  assert.equal(r({ raza: { zecimaleUnghi: 1.5 } }).raza.zecimaleUnghi, 2, 'neîntreg');
  assert.equal(r({ raza: { zecimaleUnghi: null } }).raza.zecimaleUnghi, 2, 'null nu e „automat” aici');
  assert.equal(r({ raza: { linia: 'centru' } }).raza.linia, 'centru');
  assert.equal(r({ raza: { linia: 'sus' } }).raza.linia, 'loc');
  assert.deepEqual(r({ raza: 'R' }).raza, SETARI_IMPLICITE.raza, 'grupul stricat: implicitele lui');
});

test('stilul desenului și scrierea cifrelor, din setări; „după limbă” urmează limba aplicației', () => {
  assert.deepEqual(stilCote(SETARI_IMPLICITE), STIL_IMPLICIT, 'implicitele setărilor sunt chiar stilul implicit al desenului');
  const s: SetariCote = { ...SETARI_IMPLICITE, cifre: { ...SETARI_IMPLICITE.cifre, inaltime: 5, loc: 'orizontala' }, linii: { ...SETARI_IMPLICITE.linii, capete: 'punct', marime: 4, extensii: false, gol: 0.5, depasire: 3 } };
  assert.deepEqual(stilCote(s), { gol: 0.5, depasire: 3, capat: 4, inaltime: 5, capete: 'punct', extensii: false, loc: 'orizontala', raza: 'loc' });
  assert.deepEqual(formatCote(SETARI_IMPLICITE, true), {
    unitate: 'mm', zecimale: 2, zerouri: 'taiate', pas: null, virgula: true, cuUnitate: false, fractie: 16, prefixR: 'R', prefixD: 'Ø', unghi: 'zecimale', zecimaleUnghi: 2,
  });
  const raza = { ...SETARI_IMPLICITE, cifre: { ...SETARI_IMPLICITE.cifre, unitate: 'fractii' as const, fractie: 32 }, raza: { prefixR: 'r', prefixD: 'D', unghiuri: 'gms' as const, zecimaleUnghi: 3, linia: 'centru' as const } };
  assert.equal(stilCote(raza).raza, 'centru', 'linia razei, în stil');
  assert.deepEqual(formatCote(raza, true), { ...formatCote(SETARI_IMPLICITE, true), unitate: 'fractii', fractie: 32, prefixR: 'r', prefixD: 'D', unghi: 'gms', zecimaleUnghi: 3 });
  assert.equal(formatCote(SETARI_IMPLICITE, false).virgula, false, 'în engleză, punctul');
  const inch = { ...SETARI_IMPLICITE, cifre: { ...SETARI_IMPLICITE.cifre, unitate: 'inch' as const } };
  assert.equal(formatCote(inch, true).zecimale, 3, 'automat, în inch: 3');
  assert.equal(formatCote({ ...inch, cifre: { ...inch.cifre, zecimale: 1 } }, true).zecimale, 1, 'alese: cele alese');
  const virgula = { ...SETARI_IMPLICITE, cifre: { ...SETARI_IMPLICITE.cifre, separator: 'virgula' as const } };
  assert.equal(formatCote(virgula, false).virgula, true, 'virgula aleasă, și în engleză');
  const punct = { ...SETARI_IMPLICITE, cifre: { ...SETARI_IMPLICITE.cifre, separator: 'punct' as const } };
  assert.equal(formatCote(punct, true).virgula, false, 'punctul ales, și în română');
});

test('„Înapoi la implicit” pe un grup lasă celelalte neatinse', () => {
  const s = citesteSetariCote(JSON.stringify({
    cifre: { unitate: 'cm' }, linii: { capete: 'fara' }, raza: { prefixD: 'D' },
    comportament: { legate: false }, lipire: { toleranta: 12 }, masurare: { unghi: false }, export: { grosime: 0.2 },
    raport: { cuCote: true },
  }));
  assert.deepEqual(GRUPURI_COTE, ['cifre', 'linii', 'raza', 'comportament', 'lipire', 'masurare', 'export', 'raport']);
  for (const g of GRUPURI_COTE) {
    assert.equal(eImplicit(s, g), false, g);
    const r = grupImplicit(s, g);
    assert.deepEqual(r[g], SETARI_IMPLICITE[g], g);
    assert.ok(eImplicit(r, g));
    for (const alt of GRUPURI_COTE) if (alt !== g) assert.deepEqual(r[alt], s[alt], `${g} lasă ${alt}`);
  }
});

test('„Arată cotele” comută „Cotele pe pânză” din setări, fără să atingă restul', () => {
  const inainte = setariCote();
  comutaPePanza();
  assert.equal(setariCote().comportament.pePanza, !inainte.comportament.pePanza);
  assert.deepEqual({ ...setariCote(), comportament: { ...setariCote().comportament, pePanza: inainte.comportament.pePanza } }, inainte);
  comutaPePanza();
  assert.deepEqual(setariCote(), inainte);
});

test('exportul (c-1): numele stratului, culoarea, grosimea; fiecare greșeală la implicitul ei', () => {
  const r = (x: object): SetariCote['export'] => citesteSetariCote(JSON.stringify({ export: x })).export;
  assert.deepEqual(r({ cuCote: 'da', strat: 'EXTERIOR', culoare: 'red', grosime: 0.04, dxf: 'DIMENSION', cifre: 'litere' }), SETARI_IMPLICITE.export);
  // Felul cotelor în DXF și al cifrelor (c-2): implicit cotele ca DIMENSION, cifrele ca trăsături; o setare din c-1, fără ele, le ia.
  assert.equal(SETARI_IMPLICITE.export.dxf, 'dimension');
  assert.equal(SETARI_IMPLICITE.export.cifre, 'trasaturi');
  assert.deepEqual(r({ cuCote: true, strat: 'X', culoare: '#000000', grosime: 0.2 }), { cuCote: true, strat: 'X', culoare: '#000000', grosime: 0.2, dxf: 'dimension', cifre: 'trasaturi' });
  assert.equal(r({ grosime: 1 }).grosime, 1);
  assert.equal(r({ grosime: 1.01 }).grosime, 0.1, 'peste 1 mm');
  assert.equal(r({ grosime: 0.05 }).grosime, 0.05);
  assert.equal(r({ culoare: '#ABCDEF' }).culoare, '#006d8f', 'culoarea se ține cu litere mici, ca din <input type="color">');
  assert.equal(r({ strat: 'a'.repeat(31) }).strat, 'a'.repeat(31));
  assert.equal(r({ strat: 'a'.repeat(32) }).strat, 'COTE', 'peste 31 de semne');
  for (const n of ['', 'cu spațiu', 'Coté', 'A/B', '0', 'foaie', 'Pe_Linie', 'exterior']) assert.equal(numeStratBun(n), false, n);
  for (const n of ['COTE', 'cote', 'Dim-1', 'X_2']) assert.equal(numeStratBun(n), true, n);
});

test('raportul foilor (d-3): implicitul bifei „Cu cotele”, oprit; o valoare greșită, la implicit; o setare de dinainte îl ia', () => {
  const r = (x: unknown): SetariCote['raport'] => citesteSetariCote(JSON.stringify({ raport: x })).raport;
  assert.deepEqual(SETARI_IMPLICITE.raport, { cuCote: false });
  assert.deepEqual(r({ cuCote: true }), { cuCote: true });
  assert.deepEqual(r({ cuCote: 'da' }), { cuCote: false });
  assert.deepEqual(r(null), { cuCote: false });
  // Setările ținute înainte de d-3 n-au grupul: raportul pornește fără cote, iar restul rămâne cum era.
  const vechi = citesteSetariCote(JSON.stringify({ v: 1, export: { cuCote: true } }));
  assert.deepEqual(vechi.raport, { cuCote: false });
  assert.equal(vechi.export.cuCote, true);
});

test('straturile rezervate sunt chiar ale exportului (fără COTE), plus stratul 0 al DXF-ului', () => {
  assert.deepEqual([...STRATURI_REZERVATE].sort(), ['0', ...STRATURI.filter((s) => s !== 'COTE')].sort());
  assert.ok(STRATURI.includes('COTE'));
});
