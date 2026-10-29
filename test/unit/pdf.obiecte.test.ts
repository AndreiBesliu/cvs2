import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, deflateSync } from 'node:zlib';
import { citestePdf, type RezultatPdf } from '../../src/io/pdf.ts';
import {
  ascii85, asciiHex, Cititor, Flux, inflate, Lexer, lzw, Nume, PdfPestePlafon, predictor, Ref, runLength, textPdf, type Dict, type Val,
} from '../../src/io/pdfObiecte.ts';
import { B, flux, pagina, pdf } from './ajutor-pdf.ts';

/**
 * Cititorul PDF pe bucăți (ADR 0104), cu valori pe hârtie: lexerul, filtrele cu vectorii din specificație, predictorii,
 * un PDF construit aici cu xref ca flux (predictorul PNG Up, /W [1 2 1]) și obiectele într-un flux de obiecte, ciclurile
 * (arborele paginilor, Form XObject-ul care se cheamă pe sine), straturile prin OCMD și refuzurile ușii. Corpusul scris de
 * MuPDF e în `pdf.corpus.test.ts`.
 */

const text = (b: Uint8Array): string => Buffer.from(b).toString('latin1');
const valoare = (s: string): Val => new Cititor(new Lexer(B(s))).valoare() as Val;

const ok = (r: RezultatPdf): Extract<RezultatPdf, { ok: true }> => {
  if (!r.ok) throw new Error(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
  return r;
};
const puncte = (r: Extract<RezultatPdf, { ok: true }>): number[][][] => r.cai.map((c) => c.varfuri.map((v) => [v.p.x, v.p.y]));

/* ── Lexerul și valorile ───────────────────────────────────────────────────────────────────────────────────────────── */

test('lexerul: numerele (cu semnele repetate ca unul, ca în Adobe Reader), numele cu #xx, șirurile cu escape-uri și hex', () => {
  assert.deepEqual(valoare('[12 -3.5 +4 .25 -.5 4. --5 1.5.2]'), [12, -3.5, 4, 0.25, -0.5, 4, -5, 1.5, 0.2]);
  assert.deepEqual(valoare('/A#20B'), new Nume('A B'));
  assert.deepEqual(valoare('/Strat#C3#A9'), new Nume('Straté'));
  assert.equal(text(valoare('(a\\)b\\(c(d)e\\101\\\nf\\n)') as Uint8Array), 'a)b(c(d)eAf\n');
  assert.equal(text(valoare('<48 65 6C6C6F 7>') as Uint8Array), 'Hellop');
  assert.deepEqual(valoare('[1 0 R 2 3 4 0 R]'), [new Ref(1, 0), 2, 3, new Ref(4, 0)]);
  const d = valoare('<< /A 1 /B [true null false] /C << /D /E >> /F (x) >>') as Dict;
  assert.deepEqual([...d.keys()], ['A', 'B', 'C', 'F']);
  assert.deepEqual(d.get('B'), [true, null, false]);
  assert.deepEqual((d.get('C') as Dict).get('D'), new Nume('E'));
  // Textul unui șir: UTF-16BE cu BOM, altfel latin1.
  assert.equal(textPdf(Uint8Array.from([0xfe, 0xff, 0, 0x53, 0, 0x74])), 'St');
  assert.equal(textPdf(B('Decupare')), 'Decupare');
});

/* ── Filtrele ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

test('filtrele, pe vectorii din specificație: ASCIIHex, ASCII85 (și „z”), LZW (exemplul din §7.4.4.2), RunLength', () => {
  assert.equal(text(asciiHex(B('48656C 6C6F>junk'))), 'Hello');
  assert.equal(text(asciiHex(B('414>'))), 'A@');
  // Vectorii din `base64.a85encode(…, adobe=True)` (biblioteca standard Python): grupuri întregi, un grup parțial, „z”.
  assert.equal(text(ascii85(B('<~87cURD]i,"Ebo80~>'))), 'Hello World!');
  assert.equal(text(ascii85(B('<~87cURD]i,"Ebo7~>'))), 'Hello World');
  assert.equal(text(ascii85(B('<~z@:B~>'))), '\0\0\0\0ab');
  assert.equal(text(ascii85(B('<~@/~>'))), 'a');
  // §7.4.4.2: „-----A---B” → codurile 256 45 258 258 65 259 66 257 → octeții 80 0B 60 50 22 0C 0C 85 01.
  assert.equal(text(lzw(Uint8Array.from([0x80, 0x0b, 0x60, 0x50, 0x22, 0x0c, 0x0c, 0x85, 0x01]))), '-----A---B');
  // RunLength: 2 → următorii 3 octeți; 254 → următorul octet de 257 − 254 = 3 ori; 128 = sfârșit.
  assert.equal(text(runLength(Uint8Array.from([2, 0x61, 0x62, 0x63, 254, 0x78, 128, 0x7a]))), 'abcxxx');
});

test('predictorii: PNG (None, Sub, Up, Average, Paeth), socotiți pe hârtie; TIFF 2', () => {
  const dp = (o: Record<string, number>): Dict => new Map(Object.entries(o));
  // 3 coloane, 1 culoare, 8 biți. Sub [1 2 3] → [1 3 6]; Up [1 1 1] → [2 4 7]; Average [0 0 0] → ⌊(a + b) / 2⌋ = [1 2 4];
  // Paeth [0 0 0], peste [1 2 4] → [1 2 4] (b e mereu cel mai aproape); None [9 8 7].
  const in_ = Uint8Array.from([1, 1, 2, 3, 2, 1, 1, 1, 3, 0, 0, 0, 4, 0, 0, 0, 0, 9, 8, 7]);
  assert.deepEqual([...predictor(in_, dp({ Predictor: 12, Columns: 3 }))], [1, 3, 6, 2, 4, 7, 1, 2, 4, 1, 2, 4, 9, 8, 7]);
  assert.deepEqual([...predictor(Uint8Array.from([1, 1, 1, 5, 5, 5]), dp({ Predictor: 2, Columns: 3 }))], [1, 2, 3, 5, 10, 15]);
  assert.deepEqual([...predictor(Uint8Array.from([7]), dp({}))], [7]);
});

test('Flate: zlib, deflate brut, trunchiat (ce a ieșit, marcat neîntreg), stricat de tot, plafonul', async () => {
  const date = B('0 0 m 72 0 l S\n'.repeat(50));
  assert.deepEqual(await inflate(deflateSync(date)), { date: Uint8Array.from(date), intreg: true });
  assert.deepEqual(await inflate(deflateRawSync(date)), { date: Uint8Array.from(date), intreg: true });
  // Un flux puțin compresibil, tăiat la 200 de octeți: e trunchiat de-adevăratelea.
  const mult = B(Array.from({ length: 3000 }, (_, i) => `${i} ${(i * 7919) % 104729} l`).join('\n'));
  const comprimat = deflateSync(mult);
  assert.ok(comprimat.length > 1000);
  const trunchiat = await inflate(comprimat.subarray(0, 200));
  assert.equal(trunchiat.intreg, false);
  assert.ok(trunchiat.date.length > 0 && text(trunchiat.date) === text(mult).slice(0, trunchiat.date.length));
  await assert.rejects(inflate(B('nu e zlib')));
  // O bombă: 1 MiB de zerouri, cu plafonul de 64 KiB.
  await assert.rejects(inflate(deflateSync(Buffer.alloc(1 << 20)), 1 << 16), PdfPestePlafon);
});

/* ── Documentul ────────────────────────────────────────────────────────────────────────────────────────────────────── */

test('xref ca flux cu predictorul PNG Up (/W [1 2 1], ca la Acrobat) și obiectele 1–3 într-un flux de obiecte', async () => {
  const c1 = '<< /Type /Catalog /Pages 2 0 R >>', c2 = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  const c3 = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>';
  const corp = `${c1}\n${c2}\n${c3}\n`;
  const antet = `1 0 2 ${c1.length + 1} 3 ${c1.length + c2.length + 2} `;
  const parti: Buffer[] = [B('%PDF-1.7\n')];
  let pos = parti[0]!.length;
  const pune = (b: Buffer): number => {
    const o = pos;
    parti.push(b);
    pos += b.length;
    return o;
  };
  const off4 = pune(Buffer.concat([B('4 0 obj\n'), flux('', '0 0 m 72 36 l S'), B('\nendobj\n')]));
  const off6 = pune(Buffer.concat([B('6 0 obj\n'), flux(`/Type /ObjStm /N 3 /First ${antet.length} /Filter /FlateDecode`, deflateSync(B(antet + corp))), B('\nendobj\n')]));
  const off5 = pos;
  // Rândurile: tipul, offsetul (sau fluxul de obiecte) pe 2 octeți, generația (sau indicele).
  const randuri = [[0, 0, 0, 255], [2, 0, 6, 0], [2, 0, 6, 1], [2, 0, 6, 2], [1, off4 >> 8, off4 & 255, 0], [1, off5 >> 8, off5 & 255, 0], [1, off6 >> 8, off6 & 255, 0]];
  const filtrat: number[] = [];
  randuri.forEach((r, k) => {
    filtrat.push(2);
    r.forEach((v, i) => { filtrat.push((v - (k > 0 ? (randuri[k - 1] as number[])[i] as number : 0) + 256) & 255); });
  });
  pune(Buffer.concat([
    B('5 0 obj\n'),
    flux('/Type /XRef /Size 7 /W [1 2 1] /Root 1 0 R /Filter /FlateDecode /DecodeParms << /Columns 4 /Predictor 12 >>', deflateSync(Buffer.from(filtrat))),
    B('\nendobj\n'),
  ]));
  pune(B(`startxref\n${off5}\n%%EOF\n`));
  const r = ok(await citestePdf(Buffer.concat(parti)));
  // 72 pt = 25,4 mm: linia (0, 0)–(72, 36) pt ajunge (0, 0)–(25,4, 12,7) mm.
  assert.deepEqual(puncte(r), [[[0, 0], [25.4, 12.7]]]);
  assert.equal(r.avertismente['xref-reconstruit'], 0);
});

test('ciclurile: arborele paginilor care se conține, Form XObject-ul care se cheamă pe sine (sărit, numărat)', async () => {
  const ciclu = pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [2 0 R 3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>',
    flux('', '0 0 m 72 0 l S'),
  ]);
  assert.equal(ok(await citestePdf(ciclu)).pagini, 1);
  const forma = pagina('/F1 Do', '/Resources << /XObject << /F1 5 0 R >> >>', [
    flux('/Type /XObject /Subtype /Form /BBox [0 0 72 72] /Resources << /XObject << /F1 5 0 R >> >>', '/F1 Do 0 0 m 72 0 l S'),
  ]);
  const r = ok(await citestePdf(forma));
  assert.deepEqual(puncte(r), [[[0, 0], [25.4, 0]]]);
  assert.equal(r.avertismente['forme-adanci'], 1);
});

test('straturile prin OCMD: /AnyOn (implicit) vizibil cu un strat pornit, /AllOn ascuns cu unul oprit; numele, al primului grup', async () => {
  const cu = (p: string): Buffer => pdf([
    '<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [5 0 R 6 0 R] /D << /OFF [6 0 R] >> >> >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R /Resources << /Properties << /M1 7 0 R >> >> >>',
    flux('', '/OC /M1 BDC 0 0 m 72 0 l S EMC 0 36 m 72 36 l S'),
    '<< /Type /OCG /Name (Taiere) >>',
    '<< /Type /OCG /Name (Gravare) >>',
    `<< /Type /OCMD /OCGs [5 0 R 6 0 R] ${p} >>`,
  ]);
  const vizibil = ok(await citestePdf(cu('')));
  assert.deepEqual(vizibil.cai.map((c) => c.strat), ['Taiere', null]);
  assert.deepEqual(vizibil.straturi, ['Taiere']);
  const ascuns = ok(await citestePdf(cu('/P /AllOn')));
  assert.deepEqual(puncte(ascuns), [[[0, 12.7], [25.4, 12.7]]]);
  assert.equal(ascuns.avertismente.ascunse, 1);
});

test('imaginea inline cu filtru (până la „EI” între spații) și textul se sar; linia de după ele rămâne', async () => {
  const r = ok(await citestePdf(pagina('BI /W 2 /H 1 /CS /G /BPC 8 /F /AHx ID 4142> EI BT /F1 9 Tf (EI) Tj ET 0 0 m 72 0 l S')));
  assert.deepEqual(puncte(r), [[[0, 0], [25.4, 0]]]);
  assert.equal(r.avertismente['sarit-imagine'], 1);
  assert.equal(r.avertismente['sarit-text'], 1);
});

test('decupajul pictat (W … S): calea lui intră ca orice cale trasă, iar decupajul se numără, neaplicat', async () => {
  // Triunghiul e și decupaj, și contur tras; linia de după el iese din triunghi, dar intră întreagă (decupajul nu se aplică).
  const r = ok(await citestePdf(pagina('0 0 m 36 0 l 36 36 l h W S 18 18 m 72 18 l S')));
  assert.deepEqual(puncte(r), [[[0, 0], [12.7, 0], [12.7, 12.7]], [[6.35, 6.35], [25.4, 6.35]]]);
  assert.deepEqual(r.cai.map((c) => c.inchis), [true, false]);
  assert.equal(r.avertismente.decupaje, 1);
  assert.equal(r.avertismente.nepictate, 0);
});

test('refuzurile: PostScript (AI vechi, EPS, și EPS-ul binar), alt fișier, pagina lipsă (cu numărul paginilor), doar text', async () => {
  assert.deepEqual(await citestePdf(B('%!PS-Adobe-3.0\n%%Creator: Adobe Illustrator(TM) 8.0\n')), { ok: false, cod: 'ai-vechi' });
  assert.deepEqual(await citestePdf(Uint8Array.from([0xc5, 0xd0, 0xd3, 0xc6, 0, 0])), { ok: false, cod: 'ai-vechi' });
  assert.deepEqual(await citestePdf(B('<svg/>')), { ok: false, cod: 'nu-e-pdf' });
  const unu = pagina('0 0 m 72 0 l S');
  assert.deepEqual(await citestePdf(unu, { pagina: 2 }), { ok: false, cod: 'pagina', pagini: 1 });
  const gol = await citestePdf(pagina('BT /F1 12 Tf (doar text) Tj ET'));
  assert.ok(!gol.ok && gol.cod === 'gol' && gol.avertismente?.['sarit-text'] === 1);
  // Un PDF fără obiecte citibile (nici după reconstruire): refuzat ca PDF stricat, nu aruncat.
  assert.equal((await citestePdf(B('%PDF-1.4\nnimic aici\n%%EOF'))).ok, false);
});

test('fluxul de conținut ca tablou de fluxuri, lipite cu un alb; un flux stricat se sare, numărat, restul se citește', async () => {
  const r = ok(await citestePdf(pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents [4 0 R 5 0 R 6 0 R] >>',
    flux('', '0 0 m'),
    flux('/Filter /FlateDecode', 'nu e zlib'),
    flux('', '72 0 l S'),
  ])));
  assert.deepEqual(puncte(r), [[[0, 0], [25.4, 0]]]);
  assert.equal(r.avertismente['fluxuri-stricate'], 1);
});

test('un flux fără /Length bun se citește până la endstream', async () => {
  const strica = (b: Buffer): Buffer => B(text(b).replace('/Length 14', '/Length 999'));
  const r = ok(await citestePdf(strica(pagina('0 0 m 72 0 l S'))));
  assert.deepEqual(puncte(r), [[[0, 0], [25.4, 0]]]);
  assert.ok(new Flux(new Map(), new Uint8Array()) instanceof Flux);
});
