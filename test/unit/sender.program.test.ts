/**
 * Încărcarea programului și citirea răspunsurilor (ADR 0080, felia 3.6a): programele plăcilor se încarcă exact (amprenta din
 * fișe), refuzurile au linia lor, barierele se recunosc și se grupează; rapoartele GRBL se citesc pe N axe (T22), cu Hold:0 ≠
 * Hold:1, iar o poziție necunoscută rămâne necunoscută.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bariereLinie, grupBariere, incarcaProgram, linieCurata, montajDeclarat } from '../../src/machine/program.ts';
import { citesteRaspuns, pozitieDeLucru, type Raport } from '../../src/machine/raspunsuri.ts';
import { octeti } from './ajutor-sender.ts';

const ANTET = 'G90 G17 G21 G94\nG54\n';

test('programele plăcilor 1 și 2: încărcate exact, cu amprenta din fișă, fără bariere, pe G54', async () => {
  for (const f of ['test/placi/placa-01/placa-01-A.nc', 'test/placi/placa-01/placa-01-B.nc', 'test/placi/placa-02/placa-02.nc']) {
    const b = new Uint8Array(readFileSync(f));
    const sha = createHash('sha256').update(b).digest('hex');
    const r = await incarcaProgram(b, { sursa: 'export', sha256: sha });
    assert.ok(r.ok, r.ok ? '' : `${f}: ${r.cod} la linia ${r.linie}`);
    if (!r.ok) continue;
    assert.equal(r.program.sha256, sha);
    assert.equal(r.program.wcs, 'G54');
    assert.equal(r.program.linii.map((l) => `${l.text}\n`).join(''), Buffer.from(b).toString('ascii'), 'liniile refac octeții');
    assert.ok(r.program.linii.every((l) => l.bariera === null && l.cost === l.text.length + 1));
  }
});

test('refuzurile, cu linia: gol, octet peste 0x7F, \\r, peste 70 de octeți, fără WCS, M6 străin, fără \\n final, altă amprentă', async () => {
  const refuz = async (text: string | Uint8Array, sursa: 'export' | 'fisier' = 'fisier', sha256?: string) => {
    const r = await incarcaProgram(typeof text === 'string' ? octeti(text) : text, { sursa, ...(sha256 ? { sha256 } : {}) });
    return r.ok ? 'ok' : `${r.cod}@${r.linie}`;
  };
  assert.equal(await refuz(''), 'gol@null');
  assert.equal(await refuz(new Uint8Array([...octeti(ANTET), ...new TextEncoder().encode('(gaură)\n')])), 'non-ascii@2');
  assert.equal(await refuz(`${ANTET}G0 X1\r\n`), 'cr@2');
  assert.equal(await refuz(`${ANTET}G0 X${'1'.repeat(67)}\n`), 'linie-lunga@2', '71 de octeți');
  assert.equal(await refuz(`${ANTET}G0 X${'1'.repeat(66)}\n`), 'ok', '70 de octeți trec');
  assert.equal(await refuz('G90\nG0 X1\nG54\n'), 'fara-wcs@1');
  assert.equal(await refuz('G90\nM3 S1000\n'), 'fara-wcs@null');
  assert.equal(await refuz(`${ANTET}T2 M6\n`), 'm6-strain@2');
  assert.equal(await refuz(`${ANTET}T2 M6\n`, 'export'), 'ok', 'din export, M6 e o barieră');
  assert.equal(await refuz(`${ANTET}G0 X1`), 'fara-final@2');
  assert.equal(await refuz(`${ANTET}G0 X1\n`, 'export', '0'.repeat(64)), 'hash@null');
});

test('montajul declarat de antetul postului (ADR 0082): originea și Z0 din comentariu; un program străin nu-l are', async () => {
  const placa = await incarcaProgram(new Uint8Array(readFileSync('test/placi/placa-01/placa-01-A.nc')), { sursa: 'export' });
  assert.ok(placa.ok);
  if (placa.ok) assert.deepEqual(montajDeclarat(placa.program), { origine: 'stanga-jos', z0: 'sus' });
  const jos = await incarcaProgram(octeti(`(CNC Vector Studio)\n(origine dreapta-sus, Z0 jos, foaia 1 x 1 x 1 mm)\n${ANTET}G0 X1\n`), { sursa: 'fisier' });
  assert.ok(jos.ok);
  if (jos.ok) assert.deepEqual(montajDeclarat(jos.program), { origine: 'dreapta-sus', z0: 'jos' });
  const strain = await incarcaProgram(octeti(`${ANTET}(origine undeva, Z0 sus, foaia)\nG0 X1\n`), { sursa: 'fisier' });
  assert.ok(strain.ok);
  if (strain.ok) assert.equal(montajDeclarat(strain.program), null);
});

test('barierele: M0, M00, M1, M01, M6, M06, T5 M6; nu M3, M30, M60, M10, nici în comentarii; grupul: „M0, T5 M6” e o oprire, cu sculă', () => {
  const b = (l: string): string => bariereLinie(linieCurata(l)).join(',');
  assert.deepEqual(['M0', 'M00', 'm1', 'M01 (pauza)', 'M6', 'M06', 'T5 M6', 'M3 S1000', 'M30', 'M60', 'M10', '(M6)', 'G0 X1 ; M0'].map(b),
    ['M0', 'M0', 'M1', 'M1', 'M6', 'M6', 'M6', '', '', '', '', '', '']);
  const linii = ['G0 Z5', 'M0', '(scula 5)', '', 'T5 M6', 'M3 S1000', 'M0'].map((text, index) => {
    const c = bariereLinie(linieCurata(text));
    return { index, text, cost: text.length + 1, bariera: c.length > 0 ? c : null };
  });
  assert.deepEqual(grupBariere(linii, 1), { ultima: 4, m6: true });
  assert.deepEqual(grupBariere(linii, 6), { ultima: 6, m6: false });
});

const raport = (l: string): Raport => {
  const r = citesteRaspuns(l);
  assert.equal(r.tip, 'raport', l);
  return r.tip === 'raport' ? r.raport : (undefined as never);
};

test('răspunsurile: ok, error, ALARM, bannerul, mesajele, datele, necunoscutul', () => {
  assert.deepEqual(['ok', 'error:20', 'ALARM:3', "Grbl 1.1h ['$' for help]", '[MSG:Caution: Unlocked]', '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]', '$110=500.000', '[G54:0.000,0.000,0.000]', 'altceva']
    .map((l) => citesteRaspuns(l).tip), ['ok', 'eroare', 'alarma', 'banner', 'mesaj', 'date', 'date', 'date', 'necunoscut']);
  assert.deepEqual(citesteRaspuns('error:20'), { tip: 'eroare', cod: 20 });
  assert.deepEqual(citesteRaspuns('ALARM:3'), { tip: 'alarma', cod: 3 });
});

test('rapoartele pe N axe (T22): MPos cu 3 și cu 4 valori, WCO, Bf, FS, Ov; Hold:0 ≠ Hold:1; Door:2; cele stricate sunt necunoscute', () => {
  const r = raport('<Idle|MPos:1.000,2.000,-3.500|FS:0,0>');
  assert.deepEqual(r.pozitie, { cadru: 'masina', valori: [1, 2, -3.5] });
  assert.equal(r.stare, 'Idle');
  const a = raport('<Run|MPos:1,2,3,90.5|WCO:0.5,1,0,0|Bf:15,128|FS:500,8000|Ov:100,50,110|Pn:Z>');
  assert.deepEqual([a.pozitie?.valori, a.wco, a.buffer, a.avans, a.turatie, a.override], [[1, 2, 3, 90.5], [0.5, 1, 0, 0], { planificator: 15, rx: 128 }, 500, 8000, { avans: 100, rapid: 50, ax: 110 }]);
  assert.deepEqual([raport('<Hold:0|MPos:0,0,0>').sub, raport('<Hold:1|MPos:0,0,0>').sub, raport('<Door:2|WPos:0,0,0>').sub, raport('<Idle|WPos:0,0,0>').sub], [0, 1, 2, null]);
  for (const l of ['<Foo|MPos:0,0,0>', '<Idle|MPos:1,a,3>', '<Idle|Bf:15>', '<Hold:x|MPos:0,0,0>', '<Idle|MPos>']) assert.equal(citesteRaspuns(l).tip, 'necunoscut', l);
});

test('poziția de lucru: din WPos; din MPos − WCO (al raportului sau ultimul cunoscut); necunoscută fără WCO sau cu alt număr de axe', () => {
  assert.deepEqual(pozitieDeLucru(raport('<Idle|WPos:1,2,3>'), null), { cadru: 'lucru', valori: [1, 2, 3] });
  assert.deepEqual(pozitieDeLucru(raport('<Idle|MPos:10,20,3|WCO:7,16,0>'), null), { cadru: 'lucru', valori: [3, 4, 3] });
  assert.deepEqual(pozitieDeLucru(raport('<Idle|MPos:10,20,3>'), [10, 20, 0]), { cadru: 'lucru', valori: [0, 0, 3] });
  assert.equal(pozitieDeLucru(raport('<Idle|MPos:10,20,3>'), null), null);
  assert.equal(pozitieDeLucru(raport('<Idle|MPos:10,20,3>'), [1, 2, 3, 4]), null);
  assert.equal(pozitieDeLucru(raport('<Idle|FS:0,0>'), [0, 0, 0]), null);
});
