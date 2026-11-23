import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Varf } from '../../src/geom/contur.ts';
import { pregateste, type ImportPregatit } from '../../src/io/piesa.ts';
import { tipOriginal } from '../../src/jobs/calculTrasare.ts';
import { documentNou, PLAFON, type ImagineFoaie } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { executa, istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, cuImagineaNoua, idImagineNoua, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { asezareInPagina, caiDinTrasare } from '../../src/ui/actiuniImportCalcul.ts';

/**
 * Imaginea pusă pe foaie la import (ADR 0272, felia 25.8↑a): locul ei în pagina importului (un pixel al imaginii cade în
 * același punct ca vârful trasat din el, cu zonă și fără), importul cu imaginea (vectorii și imaginea într-un singur pas,
 * imaginea mutată cu desenul), plafonul imaginilor, id-ul unei imagini noi, „Doar imaginea” și tipurile păstrate cum sunt.
 */

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
const SURSA = 'cd'.repeat(32);

function context(extra: Partial<ContextDocument> = {}, h0?: Istoric): ContextDocument & { h: () => Istoric } {
  let h = h0 ?? istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let sel: readonly string[] = [];
  return {
    istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false,
    ...extra, h: () => h,
  };
}

const patrat = (x: number, y: number, l: number): Varf[] => [
  { p: { x, y }, s: { tip: 'L' } }, { p: { x: x + l, y }, s: { tip: 'L' } },
  { p: { x: x + l, y: y + l }, s: { tip: 'L' } }, { p: { x, y: y + l }, s: { tip: 'L' } },
];
/** Un desen pe o pagină de 200 × 150 mm: cutia lui e (20, 30)–(100, 110). */
const DESEN: ImportPregatit = pregateste({
  nume: 'poza', cai: [{ varfuri: patrat(20, 30, 80) }, { varfuri: patrat(40, 50, 20) }], laturi: ['exterior', 'interior'],
  pagina: { latime: 200, inaltime: 150 },
});
/** Imaginea paginii (toată pagina): centrul în (100, 75). */
const IMAGINE: ImagineFoaie = {
  id: 'im1', sursa: SURSA, nume: 'poza.jpg', x: 100, y: 75, latime: 200, inaltime: 150, rotire: 0, opacitate: 0.4, vizibila: true, fixata: true,
};

test('locul imaginii în pagină: un pixel al imaginii cade în același punct ca vârful trasat din el, cu zonă și fără', () => {
  const W = 400, H = 300, m = 0.25;
  for (const zona of [null, { x: 40, y: 30, w: 200, h: 100 }, { x: 0, y: 290, w: 400, h: 10 }]) {
    const p = asezareInPagina(W, H, m, zona);
    assert.deepEqual([p.latime, p.inaltime], [W * m, H * m]);
    const stanga = p.x - p.latime / 2, sus = p.y + p.inaltime / 2;
    const zx = zona?.x ?? 0, zy = zona?.y ?? 0, zh = zona?.h ?? H;
    // Un pătrat trasat în zonă (px ai zonei, Y în jos), pus în mm cum îl pune importul.
    const u = [10, 50], v = [5, 9];
    const c = {
      inceput: Uint32Array.from([0, 4]), tip: new Uint8Array(4), exterior: Uint8Array.from([1]),
      xy: Float64Array.from([u[0], v[0], 0, 0, 0, 0, u[1], v[0], 0, 0, 0, 0, u[1], v[1], 0, 0, 0, 0, u[0], v[1], 0, 0, 0, 0].map(Number)),
    };
    const [cale] = caiDinTrasare(c, m, zh).cai;
    assert.ok(cale, JSON.stringify(zona));
    const pixeli = [[u[0], v[0]], [u[1], v[0]], [u[1], v[1]], [u[0], v[1]]] as const;
    cale.varfuri.forEach((vf, k) => {
      const [a = 0, b = 0] = pixeli[k] ?? [];
      // Pixelul (zx + a, zy + b) al imaginii întregi, pe foaie, cu imaginea așezată în pagină.
      const x = stanga + (zx + a) * m, y = sus - (zy + b) * m;
      assert.ok(Math.abs(vf.p.x - x) < 1e-9 && Math.abs(vf.p.y - y) < 1e-9, `${JSON.stringify(zona)} ${k}: ${vf.p.x},${vf.p.y} ≠ ${x},${y}`);
    });
  }
  // Fără zonă, pagina e imaginea: colțul ei stânga-jos în originea paginii.
  assert.deepEqual(asezareInPagina(400, 300, 0.5, null), { latime: 200, inaltime: 150, x: 100, y: 75 });
});

test('importul cu imaginea: vectorii și imaginea într-un singur pas, imaginea mutată cu desenul; Ctrl+Z le scoate împreună', () => {
  const c = context({ importNou: () => DESEN, imagineImport: () => IMAGINE });
  // Ca în fereastră: starea butonului se cere fără imagine (la fiecare randare), apoi importul pleacă cu ea. Comanda ținută
  // pentru (document, import, loc, foaie) nu e și a importului cu imagine.
  const { imagineImport: _faraImagine, ...stareaButonului } = c;
  assert.deepEqual(stare(R, 'document.importa', stareaButonului), { ok: true });
  assert.deepEqual(stare(R, 'document.importa', c), { ok: true });
  ruleaza(R, 'document.importa', c);
  assert.equal(c.h().trecut.length, 1, 'un singur pas');
  const f = c.h().doc.foi[0];
  assert.deepEqual(f?.instante.map((i) => [i.x, i.y]), [[20, 30]]);
  assert.deepEqual(f?.imagini, [{ ...IMAGINE, id: 'im1' }], 'fără punct lăsat: unde e în pagină');
  assert.ok(incarca(JSON.parse(JSON.stringify(c.h().doc))).ok, 'ce scrie importul se redeschide');
  // O a doua imagine primește următorul id.
  ruleaza(R, 'document.importa', c);
  assert.deepEqual(c.h().doc.foi[0]?.imagini?.map((i) => i.id), ['im1', 'im2']);
  ruleaza(R, 'istoric.anuleaza', c);
  ruleaza(R, 'istoric.anuleaza', c);
  assert.deepEqual(c.h().doc.foi[0]?.imagini ?? [], []);
  assert.deepEqual(c.h().doc.foi[0]?.instante, []);
  // Lăsat pe planșă: centrul cutiei desenului (60, 70) cade în (150, 100), iar imaginea se mută la fel (+90, +30).
  const l = context({ importNou: () => DESEN, imagineImport: () => IMAGINE, locImport: () => ({ x: 150, y: 100 }) });
  ruleaza(R, 'document.importa', l);
  assert.deepEqual(l.h().doc.foi[0]?.instante.map((i) => [i.x, i.y]), [[110, 60]]);
  assert.deepEqual(l.h().doc.foi[0]?.imagini?.map((i) => [i.x, i.y]), [[190, 105]]);
  // Fără imagine, importul rămâne cum era.
  const s = context({ importNou: () => DESEN });
  ruleaza(R, 'document.importa', s);
  assert.equal(s.h().doc.foi[0]?.imagini, undefined);
});

test('importul cu imaginea peste plafonul foii e refuzat întreg, cu motivul; fără imagine trece', () => {
  const pline = Array.from({ length: PLAFON.imagini }, (_, k) => ({ ...IMAGINE, id: `im${k + 1}` }));
  const h = executa(istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 })), { tip: 'inlocuieste-imagini', foaie: 'f1', vechi: [], nou: pline });
  const c = context({ importNou: () => DESEN, imagineImport: () => IMAGINE }, h);
  assert.deepEqual(stare(R, 'document.importa', c), { ok: false, motiv: 'motiv.import-refuzat' });
  ruleaza(R, 'document.importa', c);
  assert.equal(c.h().doc.foi[0]?.instante.length, 0, 'nici vectorii');
  assert.deepEqual(stare(R, 'document.importa', context({ importNou: () => DESEN }, h)), { ok: true });
  // O imagine prea mare (peste plafonul laturii) e refuzată la fel.
  const mare = context({ importNou: () => DESEN, imagineImport: () => ({ ...IMAGINE, latime: PLAFON.latura * 2 }) });
  assert.deepEqual(stare(R, 'document.importa', mare), { ok: false, motiv: 'motiv.import-refuzat' });
});

test('id-ul unei imagini noi e primul liber; „Doar imaginea” o adaugă la capătul foii active, într-un pas', () => {
  const im = (id: string): ImagineFoaie => ({ ...IMAGINE, id });
  assert.equal(idImagineNoua([]), 'im1');
  assert.equal(idImagineNoua([im('im1'), im('im3')]), 'im2');
  assert.equal(idImagineNoua([im('a'), im('im1'), im('im2')]), 'im3');
  const c = context();
  ruleaza(R, 'foaie.imagini', { ...c, imaginiNoi: () => cuImagineaNoua(c, { ...IMAGINE, id: 'oricare', x: 5 }) });
  ruleaza(R, 'foaie.imagini', { ...c, imaginiNoi: () => cuImagineaNoua(c, { ...IMAGINE, id: 'oricare', x: 7 }) });
  assert.deepEqual(c.h().doc.foi[0]?.imagini?.map((i) => [i.id, i.x]), [['im1', 5], ['im2', 7]]);
  assert.equal(c.h().trecut.length, 2);
});

test('tipurile păstrate cum sunt, după antet: JPEG, PNG și WebP; TIFF, GIF, BMP și octeții prea puțini, nu', () => {
  const o = (...b: number[]): Uint8Array => Uint8Array.from(b);
  const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
  assert.equal(tipOriginal(o(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
  assert.equal(tipOriginal(o(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png');
  assert.equal(tipOriginal(o(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP'))), 'image/webp');
  assert.equal(tipOriginal(o(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE'))), null);
  assert.equal(tipOriginal(o(0x49, 0x49, 42, 0)), null);
  assert.equal(tipOriginal(o(...ascii('GIF89a'))), null);
  assert.equal(tipOriginal(o(...ascii('BM'), 0, 0)), null);
  assert.equal(tipOriginal(o(0xff, 0xd8)), null);
});
