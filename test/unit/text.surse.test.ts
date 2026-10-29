import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { citesteFont, type Font, type RezultatFont } from '../../src/text/font.ts';
import { amprentaFisier, fataDupaNume, feteDinFisier, instantaNecitita, plafonDepasit } from '../../src/text/fonturiOmului.ts';
import { idFont, numeVarianta, sursaFont } from '../../src/text/iduriFont.ts';
import { desfaWoff } from '../../src/text/woff.ts';

/**
 * Fonturile omului, partea fără browser (ADR 0106 §2): id-urile din bloc (dus-întors), WOFF despachetat la fel ca TTF-ul
 * din care s-a făcut, fețele unui fișier (colecția, un font refuzat), fața după nume, instanța cerută dintr-un font
 * variabil, amprenta fișierului.
 */

const RAD = new URL('../../', import.meta.url);
const octeti = (cale: string): Uint8Array => new Uint8Array(readFileSync(new URL(cale, RAD)));
const ok = (r: RezultatFont): Font => {
  if (!r.ok) throw new Error(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
  return r.font;
};

test('id-urile fonturilor: inclus, încărcat (cu fața), Google, al sistemului; dus și întors; cele străine sunt null', () => {
  const surse = [
    { fel: 'inclus', id: 'roboto' },
    { fel: 'incarcat', amprenta: '0123456789abcdef', fata: 0 },
    { fel: 'incarcat', amprenta: '0123456789abcdef', fata: 2 },
    { fel: 'google', familie: 'Open Sans', varianta: '700i' },
    { fel: 'google', familie: 'M PLUS 1p', varianta: '400' },
    { fel: 'sistem', postscript: 'Arial-BoldMT' },
  ] as const;
  for (const s of surse) assert.deepEqual(sursaFont(idFont(s)), s, idFont(s));
  assert.deepEqual(surse.map(idFont), ['roboto', 'f:0123456789abcdef', 'f:0123456789abcdef.2', 'g:Open Sans:700i', 'g:M PLUS 1p:400', 's:Arial-BoldMT']);
  for (const strain of ['', 'arial', 'f:0123', 'f:0123456789ABCDEF', 'f:0123456789abcdef.x', 'f:0123456789abcdef.1024', 'g:Roboto', 'g::400', 'g: Roboto:400', 'g:Roboto:450', 's:', `s:${'x'.repeat(128)}`]) {
    assert.equal(sursaFont(strain), null, strain);
  }
  assert.deepEqual(['400', '400i', '700', '700i', '300i', '950', 'abc'].map(numeVarianta), ['Regular', 'Italic', 'Bold', 'Bold Italic', 'Light Italic', '950', 'abc']);
});

test('WOFF despachetat: aceleași tabele ca TTF-ul (contururile, avansurile, crenarea, numele); unul tăiat aruncă', async () => {
  const ttf = ok(citesteFont(octeti('public/fonturi/roboto.ttf')));
  const sfnt = await desfaWoff(octeti('test/fixtures/text/roboto.woff'));
  const f = ok(citesteFont(sfnt));
  assert.deepEqual([f.nume, f.majuscula, f.urcare, f.coborare], [ttf.nume, ttf.majuscula, ttf.urcare, ttf.coborare]);
  for (const ch of 'AVĂșț0') {
    const g = f.glifa(ch.codePointAt(0)!);
    assert.equal(g, ttf.glifa(ch.codePointAt(0)!), ch);
    assert.deepEqual(f.contururi(g), ttf.contururi(g), ch);
    assert.equal(f.avans(g), ttf.avans(g), ch);
  }
  assert.equal(f.crenare(f.glifa(0x41), f.glifa(0x56)), ttf.crenare(ttf.glifa(0x41), ttf.glifa(0x56)));
  // Un sfnt cum cere specificația: directorul ordonat după etichetă, fiecare tabel la un multiplu de 4.
  const v = new DataView(sfnt.buffer, sfnt.byteOffset);
  const n = v.getUint16(4);
  const etichete = Array.from({ length: n }, (_, k) => v.getUint32(12 + 16 * k));
  assert.deepEqual(etichete, [...etichete].sort((a, b) => a - b));
  for (let k = 0; k < n; k++) assert.equal(v.getUint32(12 + 16 * k + 8) % 4, 0);
  const woff = octeti('test/fixtures/text/roboto.woff');
  await assert.rejects(desfaWoff(woff.slice(0, 200)));
  await assert.rejects(desfaWoff(octeti('public/fonturi/roboto.ttf')));
  // Directorul WOFF în altă ordine (inversat): fontul despachetat are tot directorul ordonat, cu aceleași tabele.
  const inversat = new Uint8Array(woff);
  const nt = new DataView(woff.buffer, woff.byteOffset).getUint16(12);
  for (let k = 0; k < nt; k++) inversat.set(woff.subarray(44 + 20 * (nt - 1 - k), 44 + 20 * (nt - k)), 44 + 20 * k);
  const s2 = await desfaWoff(inversat);
  const v2 = new DataView(s2.buffer, s2.byteOffset);
  const et2 = Array.from({ length: v2.getUint16(4) }, (_, k) => v2.getUint32(12 + 16 * k));
  assert.deepEqual(et2, [...et2].sort((a, b) => a - b));
  assert.deepEqual(ok(citesteFont(s2)).contururi(ttf.glifa(0x41)), ttf.contururi(ttf.glifa(0x41)));
  // O lungime declarată greșit (a primului tabel): refuzat, nu un font cu tabelul tăiat.
  const stricat = new Uint8Array(woff);
  new DataView(stricat.buffer).setUint32(44 + 12, new DataView(woff.buffer, woff.byteOffset).getUint32(44 + 12) + 4);
  await assert.rejects(desfaWoff(stricat));
});

test('fețele unui fișier: o colecție dă două, un CFF2 e refuzat cu codul lui, altceva nu e font; fața după nume', () => {
  const ttc = octeti('test/fixtures/text/roboto-droid.ttc');
  const fete = feteDinFisier(ttc);
  assert.deepEqual(fete?.bune.map((f) => [f.fata, f.nume.familie]), [[0, 'Roboto'], [1, 'Droid Serif']]);
  assert.deepEqual(fete?.refuzate, []);
  const cff2 = feteDinFisier(octeti('test/fixtures/text/inter-cff2.otf'));
  assert.deepEqual([cff2?.bune.length, cff2?.refuzate.map((r) => r.cod)], [0, ['cff2']]);
  assert.equal(feteDinFisier(new TextEncoder().encode('nu e font')), null);
  assert.equal(feteDinFisier(octeti('test/fixtures/text/roboto.woff')), null);
  assert.equal(fataDupaNume(ttc, 'DroidSerif', ''), 1);
  assert.equal(fataDupaNume(ttc, 'necunoscut', 'Droid Serif'), 1);
  assert.equal(fataDupaNume(ttc, 'Roboto-Regular', 'Droid Serif'), 0);
  assert.equal(fataDupaNume(ttc, 'necunoscut', 'necunoscut'), 0);
});

test('instanța cerută dintr-un font variabil: alta decât cea implicită se refuză (după PostScript sau numele complet)', () => {
  const v = ok(citesteFont(octeti('test/fixtures/text/roboto-fvar.ttf')));
  assert.equal(instantaNecitita(v, 'Roboto-Bold', 'Roboto Bold'), 'Bold');
  assert.equal(instantaNecitita(v, 'Roboto-Thin', 'Roboto Thin'), 'Thin');
  assert.equal(instantaNecitita(v, 'Roboto-Regular', 'Roboto Regular'), null);
  // „Book” e la aceleași coordonate ca instanța implicită: se citește (alt nume, aceleași contururi).
  assert.equal(instantaNecitita(v, 'Roboto-Book', 'Roboto Book'), null);
  assert.equal(instantaNecitita(v, 'necunoscut', 'Roboto Regular'), null);
  assert.equal(instantaNecitita(v, 'necunoscut', 'necunoscut'), null);
  const r = ok(citesteFont(octeti('public/fonturi/roboto.ttf')));
  assert.equal(instantaNecitita(r, 'Roboto-Bold', 'Roboto Bold'), null);
});

test('amprenta fișierului: 16 cifre hex din SHA-256, aceeași pentru aceiași octeți', async () => {
  const a = await amprentaFisier(octeti('public/fonturi/roboto.ttf'));
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(await amprentaFisier(octeti('public/fonturi/roboto.ttf')), a);
  assert.notEqual(await amprentaFisier(octeti('public/fonturi/droid-serif.ttf')), a);
  // SHA-256 al lui „abc” (FIPS 180-2): ba7816bf8f01cfea…
  assert.equal(await amprentaFisier(new TextEncoder().encode('abc')), 'ba7816bf8f01cfea');
});

test('plafoanele Fonturilor mele: 100 de fețe, 300 MB, un fișier deja ținut nu se numără din nou', () => {
  const MB = 1024 * 1024;
  const f = (amprenta: string, marime: number) => ({ amprenta, marime });
  assert.equal(plafonDepasit([], 1, 'a', 40 * MB), false);
  assert.equal(plafonDepasit([], 0, 'a', 400 * MB), false);
  assert.equal(plafonDepasit(Array.from({ length: 99 }, (_, k) => f(`a${k}`, 1)), 1, 'nou', 1), false);
  assert.equal(plafonDepasit(Array.from({ length: 99 }, (_, k) => f(`a${k}`, 1)), 2, 'nou', 1), true);
  assert.equal(plafonDepasit([f('a', 260 * MB), f('a', 260 * MB)], 1, 'b', 40 * MB), false);
  assert.equal(plafonDepasit([f('a', 260 * MB)], 1, 'b', 41 * MB), true);
  assert.equal(plafonDepasit([f('a', 300 * MB)], 1, 'a', 300 * MB), false);
});
