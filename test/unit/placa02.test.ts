/**
 * Placa 2, ca fișier de aur: exportul aplicației de acum, pe documentul plăcii, trebuie să fie identic, octet cu octet, cu
 * `test/placi/placa-02/placa-02.nc`, pe care îl taie owner-ul. O schimbare care l-ar atinge pică aici; fișierul se
 * regenerează doar cu o decizie scrisă (`node test/placi/placa-02/genereaza.ts`). Trece poarta, cu regiunea păstrată a
 * documentului (nicio intrare și nicio urechie în piese), și cotele pe hârtie: dog-bone-ul, urechile, lățimile.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { poarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { documentPlaca02, FOAIA, PAS, programPlaca02, SCULA } from '../placi/placa-02/genereaza.ts';

const AUR = readFileSync(new URL('../placi/placa-02/placa-02.nc', import.meta.url));
const TEXT = AUR.toString('ascii');

/** Capetele mișcărilor de tăiere (G1, G2, G3) din fiecare secțiune a programului (după comentariul ei). */
function sectiuni(text: string): Map<string, { minX: number; maxX: number; minY: number; maxY: number }> {
  const rez = new Map<string, { minX: number; maxX: number; minY: number; maxY: number }>();
  let s = '', x = Number.NaN, y = Number.NaN;
  for (const l of text.split('\n')) {
    if (l.startsWith('(')) { s = l; continue; }
    const mx = /X(-?\d+\.\d+)/.exec(l), my = /Y(-?\d+\.\d+)/.exec(l);
    if (mx) x = Number(mx[1]);
    if (my) y = Number(my[1]);
    if (!/^G[123] /.test(l) || (!mx && !my)) continue;
    const k = rez.get(s) ?? { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    rez.set(s, { minX: Math.min(k.minX, x), maxX: Math.max(k.maxX, x), minY: Math.min(k.minY, y), maxY: Math.max(k.maxY, y) });
  }
  return rez;
}

test('exportul de acum e fișierul de aur, octet cu octet, cu același SHA-256; fișa îl poartă', async () => {
  const p = await programPlaca02();
  assert.ok(Buffer.from(p.octeti).equals(AUR), 'placa-02.nc diferă de ce exportă aplicația acum');
  const hash = createHash('sha256').update(AUR).digest('hex');
  assert.equal(p.sha256, hash);
  assert.ok(readFileSync(new URL('../../docs/etape/placa-02.md', import.meta.url), 'utf8').includes(hash), 'fișa n-are hash-ul');
});

test('poarta trece, cu regiunea păstrată a documentului: nicio intrare, urechie sau degajare nu intră într-o piesă', () => {
  assert.deepEqual(poarta(TEXT, {
    foaie: FOAIA, origine: 'stanga-jos', z0: 'sus', diametruScula: SCULA.diametru, pas: PAS, supracursa: 0,
    asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(documentPlaca02() as Parameters<typeof regiuneDinDocument>[0]),
  }), []);
});

test('ordinea: întâi interioarele (gaura, găurile logoului), apoi exterioarele (piesa, cepul, logoul)', () => {
  const titluri = TEXT.split('\n').filter((l) => /^\((piesa|cep|logo)\//.test(l));
  assert.deepEqual(titluri, [
    '(piesa/gaura: dreptunghi, interior, 12 mm)', '(logo/c2: cale, interior, 12 mm)', '(logo/c3: cale, interior, 12 mm)',
    '(piesa/contur: dreptunghi, exterior, 12 mm)', '(cep/cep: dreptunghi, exterior, 12 mm)', '(logo/c1: cale, exterior, 12 mm)',
  ]);
});

test('pe hârtie: dog-bone-ul duce centrul frezei la R din fiecare colț al găurii, pe bisectoare, la fiecare din cele 3 treceri', () => {
  // Gaura 60…100 × 45…75: centrul la 3 / √2 = 2,121 mm de colț pe fiecare axă.
  for (const [x, y] of [['62.121', '47.121'], ['97.879', '47.121'], ['97.879', '72.879'], ['62.121', '72.879']]) {
    assert.equal(TEXT.split(`\nG1 X${x} Y${y}\n`).length - 1, 3, `colțul (${x}, ${y})`);
  }
});

test('pe hârtie: urechile urcă la Z −10 (puntea de 2 mm de la fața de jos), câte una pe ureche: 4 + 2 + 2', () => {
  assert.equal(TEXT.split('Z-10.000').length - 1, 8);
  // Trecerile: 4, 8, 12 mm; niciuna mai adâncă decât grosimea.
  assert.ok(!/Z-1[3-9]\.|Z-[2-9]\d\./.test(TEXT));
});

test('pe hârtie: lățimile, pe centrul frezei la exterior (± R): logoul 80, piesa 120, cepul 40', () => {
  const s = sectiuni(TEXT);
  const lat = (titlu: string): number => {
    const k = s.get(titlu);
    assert.ok(k, titlu);
    return k.maxX - k.minX;
  };
  assert.equal(lat('(logo/c1: cale, exterior, 12 mm)'), 80 + SCULA.diametru);
  assert.equal(lat('(piesa/contur: dreptunghi, exterior, 12 mm)'), 120 + SCULA.diametru);
  assert.equal(lat('(cep/cep: dreptunghi, exterior, 12 mm)'), 40 + SCULA.diametru);
  assert.deepEqual(s.get('(piesa/gaura: dreptunghi, interior, 12 mm)'), { minX: 62.121, maxX: 97.879, minY: 47.121, maxY: 72.879 });
});
