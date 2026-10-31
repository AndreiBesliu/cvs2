/**
 * Probele țintite ale ușii EPS și AI ≤ 8 (ADR 0115), pe fișiere scrise de mână: lexicul, căile și matricele, procedurile
 * simple și refuzurile (buclele, condițiile, operatorii lipsă, fișierele greșite), imaginile sărite cu datele lor, secțiunile
 * de structură (fonturile, sfârșitul, documentele incluse), operatorii AI și antetul (Illustrator vechi și nou, EPS-ul binar
 * DOS). La final, dus-întorsul: exportul EPS al aplicației (ADR 0089), recitit, dă aceleași căi.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Varf } from '../../src/geom/contur.ts';
import { drumEntitate } from '../../src/io/drumuri.ts';
import { citesteEps, type CaleEps, type RezultatEps } from '../../src/io/eps.ts';
import { scrieEps } from '../../src/io/epsExport.ts';
import { Comentariu, EroarePs, LexerPs, Nume, NumeImediat, Sir, type Jeton } from '../../src/io/psLexic.ts';
import { vectoriFoaie } from '../../src/io/vectori.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { CORPUS } from '../../scripts/export2d-corpus.ts';

const B = (s: string): Uint8Array => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
const K = 25.4 / 72;
/** Un EPS cu desenul dat (coordonatele în pt), încheiat cu `showpage`. */
const eps = (corp: string): Uint8Array => B(`%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 100 100\n%%EndComments\n${corp}\nshowpage\n%%EOF\n`);
/** Un AI ≤ 8: antetul, un prolog (sărit) cu o condiție, și corpul. */
const ai = (corp: string, creator = 'Adobe Illustrator(R) 8.0'): Uint8Array => B([
  '%!PS-Adobe-3.0', `%%Creator: ${creator}`, '%%BoundingBox: 0 0 100 100', '%%EndComments', '%%BeginProlog',
  '/x where { pop } { /x 1 def } ifelse', '%%EndProlog', '%%BeginSetup', 'Adobe_Illustrator_AI5 begin', '%%EndSetup', corp,
  '%%PageTrailer', 'gsave annotatepage grestore showpage', '%%Trailer', '%%EOF', '',
].join('\n'));

const citit = (b: Uint8Array): Extract<RezultatEps, { ok: true }> => {
  const r = citesteEps(b);
  if (!r.ok) assert.fail(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
  return r;
};
const refuz = (b: Uint8Array): readonly [string, string | undefined] => {
  const r = citesteEps(b);
  if (r.ok) assert.fail('citit, nu refuzat');
  return [r.cod, r.detaliu];
};
/** Vârfurile căii, în pt (rotunjite la 1e-9), pentru comparații pe hârtie. */
const puncte = (c: CaleEps): number[][] => c.varfuri.map((v) => [v.p.x / K, v.p.y / K].map((x) => Math.round(x * 1e9) / 1e9));

/* ── Lexicul ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

test('lexicul: numerele (și cu bază), numele, șirurile cu escape-uri, hex și ASCII85, acoladele, comentariile de structură', () => {
  const l = new LexerPs(B('1 -2 +3 .5 -.5 1. 1e2 1E-2 16#FF 8#17 2#101 --5 1a /lit //imm [ ] << >> { } (a(b)c\\)\\n\\101) <41 4 2 4> <~87cURD]i,"Ebo80~> % fără\n%%BoundingBox: 0\n  %%nu\n%AI5_BeginLayer\n'));
  const toate: Jeton[] = [];
  for (let t = l.jeton(); t !== null; t = l.jeton()) toate.push(t);
  const numere = toate.slice(0, 11);
  assert.deepEqual(numere, [1, -2, 3, 0.5, -0.5, 1, 100, 0.01, 255, 15, 5]);
  assert.ok(toate[11] instanceof Nume && toate[11].v === '--5' && !toate[11].literal, 'un nume, nu un număr');
  assert.ok(toate[12] instanceof Nume && toate[12].v === '1a');
  assert.ok(toate[13] instanceof Nume && toate[13].v === 'lit' && toate[13].literal);
  assert.ok(toate[14] instanceof NumeImediat && toate[14].v === 'imm');
  assert.deepEqual(toate.slice(15, 21).map((t) => (t instanceof Nume ? t.v : t)), ['[', ']', '<<', '>>', '{', '}']);
  assert.ok(toate[21] instanceof Sir && new TextDecoder().decode(toate[21].b) === 'a(b)c)\nA');
  assert.ok(toate[22] instanceof Sir && [...toate[22].b].join() === '65,66,64');
  assert.ok(toate[23] instanceof Sir);
  // Doar comentariile de structură de la început de rând ajung la interpretor.
  assert.deepEqual(toate.slice(24).map((t) => (t instanceof Comentariu ? t.v : t)), ['%%BoundingBox: 0', '%AI5_BeginLayer']);
  for (const gresit of [')', '(neîncheiat', '<41', '> 1', '<4G>']) assert.throws(() => { const x = new LexerPs(B(gresit)); while (x.jeton() !== null); }, EroarePs, gresit);
});

/* ── Căile, pictarea, matricele ────────────────────────────────────────────────────────────────────────────────────── */

test('rectfill nu atinge calea curentă (trasă apoi), un tablou de dreptunghiuri dă mai multe; rectclip golește calea, numărat', () => {
  const r = citit(eps('0 0 moveto 10 0 lineto 20 20 10 10 rectfill stroke [40 40 10 10 60 60 10 10] rectfill'));
  assert.deepEqual(r.cai.map((c) => [c.inchis, puncte(c)]), [
    [true, [[20, 20], [30, 20], [30, 30], [20, 30]]],
    [false, [[0, 0], [10, 0]]],
    [true, [[40, 40], [50, 40], [50, 50], [40, 50]]],
    [true, [[60, 60], [70, 60], [70, 70], [60, 70]]],
  ]);
  const c = citit(eps('0 0 moveto 10 0 lineto 0 0 50 50 rectclip 5 5 moveto 15 5 lineto stroke'));
  assert.deepEqual([c.cai.length, c.avertismente.decupaje, c.avertismente.nepictate], [1, 1, 0]);
});

test('o cale umplută și trasă e o singură formă (gsave … grestore, save … restore); schimbată după grestore, e alta', () => {
  assert.equal(citit(eps('0 0 moveto 10 0 lineto 10 10 lineto closepath gsave fill grestore stroke')).cai.length, 1);
  assert.equal(citit(eps('0 0 moveto 10 0 lineto 10 10 lineto closepath /s save def fill s restore stroke')).cai.length, 1);
  const r = citit(eps('0 0 moveto 10 0 lineto gsave stroke grestore 10 10 lineto stroke'));
  assert.deepEqual(r.cai.map(puncte), [[[0, 0], [10, 0]], [[0, 0], [10, 0], [10, 10]]]);
  // După umplere, newpath nu mai numără calea ca nepictată.
  assert.equal(citit(eps('0 0 moveto 10 0 lineto 10 10 lineto gsave fill grestore newpath')).avertismente.nepictate, 0);
  // gsave ține o copie a căii: ce se adaugă după el dispare la grestore.
  assert.deepEqual(citit(eps('0 0 moveto 10 0 lineto gsave 10 10 lineto grestore stroke')).cai.map(puncte), [[[0, 0], [10, 0]]]);
});

test('closepath, apoi lineto: o subcale nouă din start; relativele; currentpoint și itransform prin matrice', () => {
  const r = citit(eps('0 0 moveto 10 0 lineto 10 10 lineto closepath 20 0 lineto stroke'));
  assert.deepEqual(r.cai.map((c) => [c.inchis, puncte(c)]), [[true, [[0, 0], [10, 0], [10, 10]]], [false, [[0, 0], [20, 0]]]]);
  // currentpoint întoarce punctul în coordonatele utilizatorului (scara 2): (10, 20) → linia până la (15, 20), adică 30, 40 pt.
  const c = citit(eps('2 2 scale 10 20 moveto currentpoint exch 5 add exch lineto stroke'));
  assert.deepEqual(puncte(c.cai[0] as CaleEps), [[20, 40], [30, 40]]);
  const t = citit(eps('3 3 scale 10 10 transform itransform moveto 1 0 dtransform idtransform rlineto stroke'));
  assert.deepEqual(puncte(t.cai[0] as CaleEps), [[30, 30], [33, 30]]);
});

test('setmatrix, currentmatrix, matricea de deasupra (rotate cu matrice nu schimbă desenul), concat', () => {
  const r = citit(eps('matrix currentmatrix 3 3 scale 0 0 moveto 10 0 lineto setmatrix 20 0 lineto stroke'));
  assert.deepEqual(puncte(r.cai[0] as CaleEps), [[0, 0], [30, 0], [20, 0]]);
  const m = citit(eps('90 matrix rotate pop 0 0 moveto 10 0 lineto [0 1 -1 0 50 50] concat 10 0 lineto stroke'));
  assert.deepEqual(puncte(m.cai[0] as CaleEps), [[0, 0], [10, 0], [50, 60]]);
});

test('fără punct curent, lineto e o greșeală; după un text, punctul curent nu se cunoaște (moveto îl reface)', () => {
  assert.deepEqual(refuz(eps('10 10 lineto stroke')), ['ps', 'nocurrentpoint: lineto']);
  assert.deepEqual(refuz(eps('5 5 rmoveto')), ['ps', 'nocurrentpoint: rmoveto']);
  assert.equal(refuz(eps('/Helvetica findfont 12 scalefont setfont 0 0 moveto (abc) show 10 0 lineto stroke'))[0], 'ps');
  const r = citit(eps('/Helvetica findfont 12 scalefont setfont 0 0 moveto (abc) show 0 0 moveto 10 0 lineto stroke'));
  assert.deepEqual([r.cai.length, r.avertismente['sarit-text']], [1, 1]);
});

/* ── Procedurile și refuzurile ─────────────────────────────────────────────────────────────────────────────────────── */

test('buclele și condițiile sunt refuzate cu operatorul, și când le cheamă o procedură; definite, dar nechemate, nu', () => {
  for (const [corp, op] of [
    ['true { 0 0 moveto } if', 'if'], ['true {} {} ifelse', 'ifelse'], ['3 { } repeat', 'repeat'], ['{ exit } loop', 'loop'],
    ['[1 2] { pop } forall', 'forall'], ['0 1 2 { pop } for', 'for'], ['{ } stopped', 'stopped'], ['/p { 2 { } repeat } def p', 'repeat'],
  ] as const) assert.deepEqual(refuz(eps(corp)), ['control', op], corp);
  assert.equal(citit(eps('/p { 2 { } repeat } def 0 0 moveto 1 0 lineto stroke')).cai.length, 1);
  // Codul scris la rulare (un șir făcut executabil) cere un interpretor adevărat.
  assert.deepEqual(refuz(eps('(0 0 moveto) cvx exec')), ['control', 'exec']);
});

test('operatorii pe care cititorul nu-i are și numele nedefinite: refuzate cu numele; greșelile fișierului: `ps`, cu locul', () => {
  for (const op of ['arc', 'arcn', 'stringwidth', 'clippath', 'strokepath', 'eexec', 'rand', 'necunoscut']) {
    assert.deepEqual(refuz(eps(`0 0 10 0 360 ${op}`)), ['operator', op], op);
  }
  assert.deepEqual(refuz(eps('lineto')), ['ps', 'stackunderflow: lineto']);
  assert.deepEqual(refuz(eps('(a) 1 add')), ['ps', 'typecheck: add cere un număr']);
  assert.deepEqual(refuz(eps('/r { r } def r')), ['ps', 'recursivitate: procedurile se cheamă prea adânc']);
  assert.deepEqual(refuz(eps('0 0 moveto { 1 0 lineto')), ['ps', 'sintaxa: procedură neîncheiată']);
  // Fiecare procedură o cheamă de două ori pe cea de dedesubt: 2^25 de operații trec de plafon.
  const niveluri = Array.from({ length: 25 }, (_, k) => `/p${k + 1} { p${k} p${k} } def`).join('\n');
  assert.deepEqual(refuz(eps(`/p0 { } def\n${niveluri}\np25`)), ['plafon', 'operatii']);
  // Stiva dublată de `count copy`, fără bucle: plafonul memoriei.
  assert.deepEqual(refuz(eps(`1 ${'count copy '.repeat(25)}`)), ['ps', 'limitcheck: stiva']);
});

test('bind leagă operatorii la definire (o redefinire de după nu-i mai schimbă); //x ia valoarea de la citire', () => {
  assert.equal(citit(eps('/m { moveto } bind def /moveto { pop pop } def 0 0 m 10 0 lineto stroke')).cai.length, 1);
  assert.deepEqual(refuz(eps('/m { moveto } def /moveto { pop pop } def 0 0 m 10 0 lineto stroke')), ['ps', 'nocurrentpoint: lineto']);
  const r = citit(eps('/x 10 def /p { //x 0 moveto } def /x 50 def p 20 0 lineto stroke'));
  assert.deepEqual(puncte(r.cai[0] as CaleEps), [[10, 0], [20, 0]]);
});

test('stiva, aritmetica, dicționarele și tablourile: cât cer prologurile simple', () => {
  const r = citit(eps([
    '3 4 add 2 mul 9 1 index exch pop pop', // 14 (index: 14 9 14; exch, pop, pop)
    '/d 2 dict def d begin /y 5 def end d /y get', // 14 5
    '<< /a 7 >> /a get add', // 14 12
    '[1 2 3] aload pop pop pop add', // 14 13
    'moveto', // (14, 13)
    '5 6 2 array astore aload pop exch sub 1 2 3 3 1 roll sub sub mul', // (6 − 5) · (3 − (1 − 2)) = 4
    '30 sqrt 30 sqrt mul round mul 0 rlineto stroke', // 4 · 30 = 120
  ].join('\n')));
  assert.deepEqual(puncte(r.cai[0] as CaleEps), [[14, 13], [134, 13]]);
  // cos 90 + sin 90 + cos 180 + sin 270 = −1, exact (multiplii de 90°); atan(1, 0) = 90.
  const s = citit(eps('0 0 moveto 90 cos 90 sin 180 cos 270 sin add add add 10 mul 0 rlineto 1 0 atan 0 rlineto stroke'));
  assert.deepEqual(puncte(s.cai[0] as CaleEps), [[0, 0], [-10, 0], [80, 0]]);
});

/* ── Imaginile (sărite, cu datele lor) ─────────────────────────────────────────────────────────────────────────────── */

test('imaginile se sar cu datele lor: dicționarul cu ASCII85, binarul citit cu readstring, colorimage cu trei surse hex, imagemask', () => {
  const desen = '0 0 moveto 10 0 lineto stroke';
  const cazuri = [
    // Nivelul 2: datele ASCII85 (al căror alfabet are și „>”), până la ~>.
    `<< /ImageType 1 /Width 2 /Height 2 /BitsPerComponent 8 /Decode [0 1] /ImageMatrix [2 0 0 -2 0 2] /DataSource currentfile /ASCII85Decode filter >> image\n!!*>!~>\n${desen}`,
    // Binare, citite cu readstring: patru paranteze deschise, care ar strica lexicul dacă nu s-ar sări.
    `2 2 8 [2 0 0 -2 0 2] { currentfile 4 string readstring pop } bind image\n(((( ${desen}`,
    // La fel, după CR LF (un singur alb, ca în PostScript).
    `2 2 8 [2 0 0 -2 0 2] { currentfile 4 string readstring pop } image\r\n(((( ${desen}`,
    // Trei surse, câte 2 octeți (hex), deci 12 cifre.
    `2 1 8 [2 0 0 -1 0 1] { currentfile 2 string readhexstring pop } dup dup true 3 colorimage\n0A0B 0C0D\n0E0F ${desen}`,
    // Masca: 1 bit, rândul de 2 pixeli într-un octet, 2 rânduri.
    `2 2 true [2 0 0 -2 0 2] { currentfile 1 string readhexstring pop } imagemask\nC0C0\n${desen}`,
    // Fișierul cu filtru, pus deoparte cu def: ASCIIHex până la >.
    `/f currentfile /ASCIIHexDecode filter def 2 1 8 [2 0 0 -1 0 1] { f 2 string readstring pop } image\n0A1B>\n${desen}`,
    // Sursa e un șir: nimic de sărit din fișier.
    `2 1 8 [2 0 0 -1 0 1] (ab) image ${desen}`,
  ];
  for (const c of cazuri) {
    const r = citit(eps(c));
    assert.deepEqual([r.cai.length, r.avertismente['sarit-imagine']], [1, 1], c.slice(0, 40));
  }
  // Datele binare comprimate (DCT direct din fișier) nu se pot sări; nici datele hex prea scurte (vine desenul în locul lor).
  assert.deepEqual(refuz(eps('<< /ImageType 1 /Width 2 /Height 2 /BitsPerComponent 8 /Decode [0 1] /ImageMatrix [2 0 0 -2 0 2] /DataSource currentfile /DCTDecode filter >> image\n\xff\xd8')), ['imagine', 'image']);
  assert.deepEqual(refuz(eps(`2 2 8 [2 0 0 -2 0 2] { currentfile 4 string readhexstring pop } image\n0A1B ${desen}`)), ['imagine', 'image']);
  // Umbririle (shfill) se sar, numărate.
  assert.equal(citit(eps(`<< /ShadingType 2 >> shfill ${desen}`)).avertismente['sarit-umbrire'], 1);
});

/* ── Secțiunile de structură ───────────────────────────────────────────────────────────────────────────────────────── */

test('fonturile incluse se sar (cu date binare); desenul se încheie la %%Trailer sau la showpage; un document inclus nu-l încheie', () => {
  const r = citit(eps('%%BeginResource: font Proba\n/x 1 def currentfile eexec\n((((\x00\xff\n%%EndResource\n0 0 moveto 10 0 lineto stroke'));
  assert.equal(r.cai.length, 1);
  const t = citit(B('%!PS-Adobe-3.0 EPSF-3.0\n0 0 moveto 10 0 lineto stroke\n%%Trailer\n0 0 moveto 20 20 lineto stroke\n'));
  assert.equal(t.cai.length, 1);
  assert.equal(citit(eps('0 0 moveto 10 0 lineto stroke showpage 0 0 moveto 20 20 lineto stroke')).cai.length, 1);
  const d = citit(eps('%%BeginDocument: inclus.eps\n0 0 moveto 10 0 lineto stroke\nshowpage\n%%EOF\n%%EndDocument\n0 10 moveto 10 10 lineto stroke'));
  assert.equal(d.cai.length, 2);
});

/* ── Illustrator ≤ 8 ───────────────────────────────────────────────────────────────────────────────────────────────── */

test('AI: prologul (cu o condiție) și setup-ul se sar; operatorii necunoscuți se sar cu operanzii lor; v fără punct curent, ignorat', () => {
  const r = citit(ai('0 0 0 1 k\n1 0 0 Xa\n800 Ar\n10 20 v\n0 0 m\n100 0 L\n100 100 L\nS\n(x) 1 2 Xq'));
  assert.deepEqual([r.illustrator, r.cai.length, r.cai[0]?.inchis], [true, 1, false]);
});

test('AI: un document plasat (%%BeginDocument) se sare, numărat; textul unui strat oprit nu se numără', () => {
  const r = citit(ai('%%BeginDocument: plasat.eps\n0 0 moveto 50 50 lineto stroke\n%%EndDocument\n0 0 m\n100 0 L\nS'));
  assert.deepEqual([r.cai.length, r.avertismente['sarit-incluse']], [1, 1]);
  // Un operator necunoscut cu operanzi chiar înaintea lui Lb: se sare cu ei, deci primul operand al lui Lb rămâne al lui.
  const t = citit(ai('1 1 1 1 Xq\n0 1 1 1 0 0 0 0 0 0 0 50 Lb\n(Ascuns) Ln\n0 To\n(text) Tx\nTO\n0 0 m 10 0 L S\nLB\n0 0 m\n100 0 L\nS'));
  assert.deepEqual([t.cai.length, t.avertismente['sarit-text'], t.avertismente.ascunse], [1, 0, 1]);
});

test('AI: un fișier cu capetele de rând Mac (CR), ca pe Macintosh-urile vechi, se citește la fel (secțiunile, straturile, raportul)', () => {
  const lf = new Uint8Array(readFileSync(new URL('../fixtures/eps/ai8.ai', import.meta.url)));
  const a = citit(lf), b = citit(lf.map((x) => (x === 10 ? 13 : x)));
  assert.deepEqual([b.cai.length, b.straturi, b.avertismente], [a.cai.length, a.straturi, a.avertismente]);
  assert.deepEqual(b.cai.map(puncte), a.cai.map(puncte));
});

test('AI: calea compusă se pictează o dată, cu toate subcăile: nonzero cu golul în același sens îl umple (redesenată)', () => {
  const patrate = '0 0 m 100 0 L 100 100 L 0 100 L 0 0 L f\n25 25 m 75 25 L 75 75 L 25 75 L 25 25 L f';
  const nz = citit(ai(`0 XR\n*u\n${patrate}\n*U`));
  assert.deepEqual([nz.cai.length, nz.avertismente['nonzero-normalizate']], [1, 1]);
  const pi = citit(ai(`1 XR\n*u\n${patrate}\n*U`));
  assert.deepEqual([pi.cai.length, pi.avertismente['nonzero-normalizate']], [2, 0]);
});

test('antetul: Illustrator 9 și mai nou (versiunea, CS, AI8_CreatorVersion) refuzat; Illustrator 88 și formatul AI fără Illustrator, citite ca AI', () => {
  for (const creator of ['Adobe Illustrator(R) 9.0', 'Adobe Illustrator(R) 13.0', 'Adobe Illustrator CS6', 'Adobe Illustrator(R) 24.1']) {
    assert.equal(refuz(ai('0 0 m 10 0 L S', creator))[0], 'ai-nou', creator);
  }
  assert.equal(refuz(B('%!PS-Adobe-3.0\n%%Creator: Adobe Illustrator(R) 8.0\n%%AI8_CreatorVersion: 13.0.0\n%%EndComments\n'))[0], 'ai-nou');
  assert.equal(citit(ai('0 0 m 10 0 L S', 'Adobe Illustrator 88(TM) 1.9.3')).illustrator, true);
  const f = citit(B('%!PS-Adobe-2.0 EPSF-1.2\n%%Creator: alt program\n%AI5_FileFormat 2.0\n%%EndComments\n%%EndProlog\n0 0 m\n10 0 L\nS\n%%Trailer\n'));
  assert.equal(f.illustrator, true);
});

test('EPS-ul binar DOS: secțiunea PostScript din antet; pozițiile greșite, refuzate; un ^D de la început se sare', () => {
  const ps = B('%!PS-Adobe-3.0 EPSF-3.0\n0 0 moveto 10 0 lineto stroke\n');
  const antet = (poz: number, lung: number): Uint8Array => {
    const b = new Uint8Array(30);
    const dv = new DataView(b.buffer);
    [0xc5, 0xd0, 0xd3, 0xc6].forEach((x, i) => { b[i] = x; });
    dv.setUint32(4, poz, true);
    dv.setUint32(8, lung, true);
    return b;
  };
  const lipit = (a: Uint8Array, b: Uint8Array): Uint8Array => { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r; };
  assert.equal(citit(lipit(antet(30, ps.length), ps)).cai.length, 1);
  assert.deepEqual(refuz(lipit(antet(30, ps.length + 1), ps)), ['nu-e-ps', undefined]);
  assert.deepEqual(refuz(lipit(antet(10, ps.length), ps)), ['nu-e-ps', undefined]);
  assert.equal(citit(lipit(B('\x04'), ps)).cai.length, 1);
});

/* ── Dus-întorsul cu exportul EPS al aplicației ────────────────────────────────────────────────────────────────────── */

test('exportul EPS al aplicației (ADR 0089), recitit: fiecare entitate e o cale trasă, cu aceleași puncte (sub 1e-6 mm)', () => {
  const r0 = incarca(structuredClone(CORPUS));
  if (!r0.ok) assert.fail(r0.motiv);
  const v = vectoriFoaie(r0.doc, 0, false);
  const r = citit(B(scrieEps(v, 'corpus')));
  assert.equal(r.cai.length, v.entitati.length);
  const lista = (c: CaleEps): number[][] => c.varfuri.flatMap((x: Varf) => (x.s.tip === 'C' ? [x.p, x.s.c1, x.s.c2] : [x.p]).map((q) => [q.x, q.y]));
  for (const e of v.entitati) {
    const d = drumEntitate(e);
    let pct = d.flatMap((c) => (c.op === 'c' ? [[c.x1, c.y1], [c.x2, c.y2], [c.x, c.y]] : c.op === 'h' ? [] : [[c.x, c.y]]));
    // Închisă: cu `closepath`, sau întoarsă exact în start (regula comună ușilor, ADR 0037 §11: ovalul buzunarului, o spline
    // fără `closepath`); punctul final, egal cu startul, nu mai e un vârf.
    const p0 = pct[0] as number[], pn = pct[pct.length - 1] as number[];
    const inapoi = Math.hypot((pn[0] as number) - (p0[0] as number), (pn[1] as number) - (p0[1] as number)) < 1e-9;
    const inchis = d.some((c) => c.op === 'h') || inapoi;
    if (inapoi) pct = pct.slice(0, -1);
    const gasita = r.cai.some((c) => {
      const l = lista(c);
      return c.inchis === inchis && l.length === pct.length && l.every((q, i) => Math.hypot((q[0] as number) - (pct[i]?.[0] ?? NaN), (q[1] as number) - (pct[i]?.[1] ?? NaN)) <= 1e-6);
    });
    assert.ok(gasita, `${e.strat} ${e.fel}`);
  }
});
