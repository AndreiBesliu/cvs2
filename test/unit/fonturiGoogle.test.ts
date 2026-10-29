import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogGoogle, descarcaGoogle, type ApelGoogle } from '../../src/cloud/apelFonturiGoogle.ts';
import { memorieNoua, trateazaFonturiGoogle } from '../../functions/src/fonturi/google.ts';
import { familieGoogle } from '../../src/app/previzualizareFont.ts';
import { adresaCss, AGENT_TTF, catalogDinMetadate, cerereGoogle, feteDeAfisare, METADATE_GOOGLE, urlDinCss } from '../../shared/fonturiGoogle.ts';

/**
 * Google Fonts (ADR 0106 §4): contractul comun (cererea, catalogul din metadate, adresa CSS, adresa TTF din CSS), funcția
 * (memoria catalogului și a adreselor, motivele, agentul vechi) și clientul (adresa verificată, plafonul, rețeaua), cu
 * rețeaua falsă. Răspunsurile adevărate ale lui Google, măsurate pe 29.10, stau în formele de aici. Proba înainte de descărcare
 * (ADR 0108 §5): fețele WOFF2 din CSS-ul pentru browser (doar de pe gstatic, cu intervalul alfabetului) și adăugarea lor în
 * document, sub un nume al aplicației.
 */

const URL1 = 'https://fonts.gstatic.com/s/roboto/v51/KFOKCnqEu92Fr1Mu53ZEC9_Vu3r1gIhOszmOClHrs6ljXfMMLmbXiA8.ttf';
const META = `)]}'\n${JSON.stringify({
  axisRegistry: [],
  familyMetadataList: [
    { family: 'Roboto', category: 'Sans Serif', subsets: ['menu', 'latin', 'latin-ext'], fonts: { '700i': {}, 400: {}, '400i': {}, 700: {} }, popularity: 2, isOpenSource: true },
    { family: 'Lobster', category: 'Display', subsets: ['latin', 'cyrillic'], fonts: { 400: {} }, popularity: 40 },
    { family: 'Inter', category: 'Sans Serif', subsets: ['latin-ext'], fonts: { 400: {}, 950: {}, abc: {} }, popularity: 1 },
    { family: 'Brand Inchis', category: 'Serif', subsets: [], fonts: { 400: {} }, popularity: 3, isOpenSource: false },
    { family: 'Fara Categorie', category: 'Symbols', subsets: [], fonts: { 400: {} }, popularity: 4 },
    { family: 'Rau:wght@1', category: 'Serif', subsets: [], fonts: { 400: {} }, popularity: 5 },
    { family: 'Fara Variante', category: 'Serif', subsets: [], fonts: { 450: {} }, popularity: 6 },
  ],
})}`;
const CSS_TTF = `@font-face {\n  font-family: 'Roboto';\n  font-style: italic;\n  font-weight: 700;\n  src: url(${URL1}) format('truetype');\n}\n`;

test('cererea: doar catalogul sau un fișier cu familia și varianta valide, fără alte câmpuri', () => {
  assert.deepEqual(cerereGoogle({ fel: 'catalog' }), { fel: 'catalog' });
  assert.deepEqual(cerereGoogle({ fel: 'fisier', familie: 'Open Sans', varianta: '700i' }), { fel: 'fisier', familie: 'Open Sans', varianta: '700i' });
  for (const rau of [null, 'catalog', { fel: 'catalog', x: 1 }, { fel: 'fisier', familie: 'Roboto' }, { fel: 'fisier', familie: 'Roboto:wght@1', varianta: '400' },
    { fel: 'fisier', familie: 'Roboto', varianta: '450' }, { fel: 'fisier', familie: ' Roboto', varianta: '400' }, { fel: 'fisier', familie: 'x'.repeat(81), varianta: '400' },
    { fel: 'fisier', familie: 'Roboto', varianta: '400', extra: 1 }, { fel: 'altceva' }]) {
    assert.equal(cerereGoogle(rau), null, JSON.stringify(rau));
  }
});

test('catalogul din metadate: familiile libere, cu categoria și variantele valide, după popularitate; diacriticele românești', () => {
  const c = catalogDinMetadate(META, '2026-10-29T00:00:00.000Z');
  assert.deepEqual(c, {
    generat: '2026-10-29T00:00:00.000Z',
    familii: [
      { familie: 'Inter', categorie: 'Sans Serif', variante: ['400'], romana: true, rang: 1 },
      { familie: 'Roboto', categorie: 'Sans Serif', variante: ['400', '400i', '700', '700i'], romana: true, rang: 2 },
      { familie: 'Lobster', categorie: 'Display', variante: ['400'], romana: false, rang: 40 },
    ],
  });
  assert.equal(catalogDinMetadate('nu e JSON', 'x'), null);
  assert.equal(catalogDinMetadate(JSON.stringify({ altceva: [] }), 'x'), null);
  assert.equal(catalogDinMetadate(JSON.stringify({ familyMetadataList: [] }), 'x'), null);
  // Fără prefixul XSSI merge la fel.
  assert.deepEqual(catalogDinMetadate(META.slice(META.indexOf('\n') + 1), 'x')?.familii.length, 3);
});

test('adresa CSS (axa ital și grosimea, spațiile ca +) și adresa TTF din CSS (exact una, pe gstatic)', () => {
  assert.equal(adresaCss('Open Sans', '300'), 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300');
  assert.equal(adresaCss('Roboto', '700i'), 'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@1,700');
  assert.equal(adresaCss('M PLUS 1p', '1000'), 'https://fonts.googleapis.com/css2?family=M+PLUS+1p:ital,wght@0,1000');
  assert.equal(urlDinCss(CSS_TTF), URL1);
  assert.equal(urlDinCss(CSS_TTF + CSS_TTF), null);
  assert.equal(urlDinCss(CSS_TTF.replace('fonts.gstatic.com', 'evil.example')), null);
  assert.equal(urlDinCss(CSS_TTF.replace(".ttf) format('truetype')", ".woff2) format('woff2')")), null);
  assert.equal(urlDinCss(''), null);
});

/** O rețea falsă: răspunsul fiecărei adrese, cu cererile numărate și agentul văzut. */
function retea(raspunsuri: Record<string, () => Response>): { cere: typeof fetch; cereri: string[]; agenti: (string | null)[] } {
  const cereri: string[] = [], agenti: (string | null)[] = [];
  const cere = (async (adresa: string | URL | Request, init?: RequestInit) => {
    const a = String(adresa);
    cereri.push(a);
    agenti.push(new Headers(init?.headers).get('User-Agent'));
    const r = raspunsuri[a];
    if (!r) throw new Error(`rețea: ${a}`);
    return r();
  }) as typeof fetch;
  return { cere, cereri, agenti };
}

test('funcția: catalogul ținut 6 ore, apoi cerut din nou; un fișier din catalog, cerut cu agentul vechi, apoi ținut', async () => {
  let acum = 0;
  const r = retea({
    [METADATE_GOOGLE]: () => new Response(META),
    [adresaCss('Roboto', '700i')]: () => new Response(CSS_TTF),
  });
  const m = memorieNoua();
  const d = { cere: r.cere, acum: () => acum };
  const c1 = await trateazaFonturiGoogle({ fel: 'catalog' }, d, m);
  assert.ok(c1.ok && 'catalog' in c1 && c1.catalog.familii.length === 3);
  await trateazaFonturiGoogle({ fel: 'catalog' }, d, m);
  assert.equal(r.cereri.length, 1);
  acum = 6 * 3600_000;
  await trateazaFonturiGoogle({ fel: 'catalog' }, d, m);
  assert.equal(r.cereri.length, 2);
  assert.deepEqual(await trateazaFonturiGoogle({ fel: 'fisier', familie: 'Roboto', varianta: '700i' }, d, m), { ok: true, url: URL1 });
  assert.deepEqual([r.cereri.at(-1), r.agenti.at(-1)], [adresaCss('Roboto', '700i'), AGENT_TTF]);
  await trateazaFonturiGoogle({ fel: 'fisier', familie: 'Roboto', varianta: '700i' }, d, m);
  assert.equal(r.cereri.length, 3);
  assert.deepEqual(await trateazaFonturiGoogle({ fel: 'fisier', familie: 'Nimeni', varianta: '400' }, d, m), { ok: false, motiv: 'familie-necunoscuta' });
  assert.deepEqual(await trateazaFonturiGoogle({ fel: 'fisier', familie: 'Roboto', varianta: '300' }, d, m), { ok: false, motiv: 'varianta-necunoscuta' });
  assert.deepEqual(await trateazaFonturiGoogle({ fel: 'fisier', familie: 'Roboto' }, d, m), { ok: false, motiv: 'nevalid' });
  assert.equal(r.cereri.length, 3);
});

test('funcția: Google care nu răspunde, metadate cu altă formă, CSS fără TTF; un catalog vechi rămâne folosit', async () => {
  const consola = console.error;
  console.error = () => {};
  try {
    let stare = 200;
    const r = retea({
      [METADATE_GOOGLE]: () => new Response(stare === 200 ? META : 'altă formă', { status: stare === 500 ? 500 : 200 }),
      [adresaCss('Lobster', '400')]: () => new Response("src: url(https://fonts.gstatic.com/s/lobster/v32/x.woff2) format('woff2')"),
    });
    let acum = 0;
    const m = memorieNoua();
    const d = { cere: r.cere, acum: () => acum };
    const gol = memorieNoua();
    stare = 500;
    assert.deepEqual(await trateazaFonturiGoogle({ fel: 'catalog' }, d, gol), { ok: false, motiv: 'google-indisponibil' });
    stare = 201;
    assert.deepEqual(await trateazaFonturiGoogle({ fel: 'catalog' }, d, gol), { ok: false, motiv: 'google-indisponibil' });
    stare = 200;
    assert.ok((await trateazaFonturiGoogle({ fel: 'catalog' }, d, m)).ok);
    acum = 7 * 3600_000;
    stare = 500;
    const vechi = await trateazaFonturiGoogle({ fel: 'catalog' }, d, m);
    assert.ok(vechi.ok && 'catalog' in vechi && vechi.catalog.familii.length === 3);
    assert.deepEqual(await trateazaFonturiGoogle({ fel: 'fisier', familie: 'Lobster', varianta: '400' }, d, m), { ok: false, motiv: 'google-indisponibil' });
    const arunca = { cere: (async () => { throw new Error('fără rețea'); }) as typeof fetch, acum: () => 0 };
    assert.deepEqual(await trateazaFonturiGoogle({ fel: 'catalog' }, arunca, memorieNoua()), { ok: false, motiv: 'google-indisponibil' });
  } finally {
    console.error = consola;
  }
});

test('clientul: catalogul și motivele; fișierul doar de pe gstatic, cu plafonul de 40 MB; rețeaua căzută', async () => {
  const cat = { generat: 'x', familii: [] };
  assert.deepEqual(await catalogGoogle(async () => ({ ok: true, catalog: cat })), { ok: true, catalog: cat });
  assert.deepEqual(await catalogGoogle(async () => ({ ok: false, motiv: 'google-indisponibil' })), { ok: false, motiv: 'google-indisponibil' });
  assert.deepEqual(await catalogGoogle(async () => ({ ok: true, url: URL1 })), { ok: false, motiv: 'nevalid' });
  assert.deepEqual(await catalogGoogle(async () => { throw new Error('x'); }), { ok: false, motiv: 'retea' });

  const apel = (url: string): ApelGoogle => async () => ({ ok: true, url });
  const octeti = new Uint8Array([0, 1, 0, 0, 9]);
  const r = retea({ [URL1]: () => new Response(octeti) });
  assert.deepEqual(await descarcaGoogle(apel(URL1), 'Roboto', '700i', r.cere), { ok: true, octeti });
  assert.deepEqual(await descarcaGoogle(apel('https://evil.example/x.ttf'), 'Roboto', '700i', r.cere), { ok: false, motiv: 'nevalid' });
  assert.deepEqual(await descarcaGoogle(async () => ({ ok: true, catalog: cat }), 'Roboto', '700i', r.cere), { ok: false, motiv: 'nevalid' });
  assert.deepEqual(await descarcaGoogle(async () => ({ ok: false, motiv: 'familie-necunoscuta' }), 'X', '400', r.cere), { ok: false, motiv: 'familie-necunoscuta' });
  assert.deepEqual(await descarcaGoogle(async () => { throw new Error('x'); }, 'X', '400', r.cere), { ok: false, motiv: 'retea' });
  const mare = retea({ [URL1]: () => new Response(octeti, { headers: { 'content-length': String(40 * 1024 * 1024 + 1) } }) });
  assert.deepEqual(await descarcaGoogle(apel(URL1), 'Roboto', '700i', mare.cere), { ok: false, motiv: 'prea-mare' });
  const lipsa = retea({ [URL1]: () => new Response('nu', { status: 404 }) });
  assert.deepEqual(await descarcaGoogle(apel(URL1), 'Roboto', '700i', lipsa.cere), { ok: false, motiv: 'google-indisponibil' });
  assert.deepEqual(await descarcaGoogle(apel(URL1), 'Roboto', '700i', retea({}).cere), { ok: false, motiv: 'retea' });
});

/** CSS-ul pentru un browser nou, cum îl dă CSS API v2 (măsurat pe 29.10, pe Lobster): câte o față WOFF2 pe alfabet. */
const WOFF2 = (alfabet: string): string => `https://fonts.gstatic.com/s/lobster/v32/neILzCirqoswsqX9zo-${alfabet}.woff2`;
const CSS_WOFF2 = [
  `/* cyrillic */\n@font-face {\n  font-family: 'Lobster';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(${WOFF2('mL')}) format('woff2');\n  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;\n}`,
  `/* latin-ext */\n@font-face {\n  font-family: 'Lobster';\n  src: url(${WOFF2('Xe')}) format('woff2');\n  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+1E00-1E9F, U+2C60-2C7F, U+A720-A7FF;\n}`,
  // O față de pe altă gazdă, un format vechi și un interval care ar ieși din regula CSS: sărite.
  `@font-face {\n  src: url(https://evil.example/s/lobster/v32/x.woff2) format('woff2');\n  unicode-range: U+0000-00FF;\n}`,
  `@font-face {\n  src: url(${URL1}) format('truetype');\n}`,
  `@font-face {\n  src: url(${WOFF2('rau')}) format('woff2');\n  unicode-range: U+0000-00FF} body { color: red;\n}`,
  // Fără interval: tot fontul.
  `@font-face {\n  src: url(${WOFF2('tot')}) format('woff2');\n}`,
].join('\n');

test('fețele de afișare din CSS: WOFF2 doar de pe gstatic, cu intervalul fiecăruia (lipsă: tot), restul sărite', () => {
  assert.deepEqual(feteDeAfisare(CSS_WOFF2), [
    { url: WOFF2('mL'), interval: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116' },
    { url: WOFF2('Xe'), interval: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+1E00-1E9F, U+2C60-2C7F, U+A720-A7FF' },
    { url: WOFF2('tot'), interval: 'U+0-10FFFF' },
  ]);
  assert.deepEqual(feteDeAfisare(CSS_TTF), [], 'CSS-ul pentru agentul vechi n-are WOFF2');
  assert.deepEqual(feteDeAfisare('<html>eroare</html>'), []);
});

test('proba Google: CSS-ul cerut fără acreditări, fețele adăugate sub un nume al aplicației, ținute; o cerere căzută se reia', async () => {
  const g = globalThis as unknown as Record<string, unknown>;
  const vechi = { fetch: g['fetch'], FontFace: g['FontFace'], document: g['document'] };
  const cereri: Array<{ url: string; credentials: string | undefined }> = [];
  const adaugate: Array<{ familie: string; sursa: string; interval: string | undefined }> = [];
  const incarcate: Array<[string, string]> = [];
  let raspuns = (): Response => new Response('', { status: 503 });
  g['fetch'] = async (url: string, o?: RequestInit) => { cereri.push({ url, credentials: o?.credentials }); return raspuns(); };
  g['FontFace'] = class {
    readonly familie: string; readonly sursa: string; readonly d: { unicodeRange?: string };
    constructor(familie: string, sursa: string, d: { unicodeRange?: string }) { this.familie = familie; this.sursa = sursa; this.d = d; }
  };
  g['document'] = {
    fonts: {
      add: (f: { familie: string; sursa: string; d: { unicodeRange?: string } }) => { adaugate.push({ familie: f.familie, sursa: f.sursa, interval: f.d.unicodeRange }); },
      load: async (font: string, text: string) => { incarcate.push([font, text]); return []; },
    },
  };
  try {
    assert.equal(await familieGoogle('Lobster', '400', 'Ușă'), null, 'Google nu răspunde');
    assert.equal(adaugate.length, 0);
    raspuns = () => new Response(CSS_WOFF2);
    const alias = await familieGoogle('Lobster', '400', 'Ușă');
    assert.match(alias ?? '', /^cncvs2-proba-\d+$/);
    assert.deepEqual(cereri, [
      { url: 'https://fonts.googleapis.com/css2?family=Lobster:ital,wght@0,400', credentials: 'omit' },
      { url: 'https://fonts.googleapis.com/css2?family=Lobster:ital,wght@0,400', credentials: 'omit' },
    ], 'textul omului nu intră în adresă; a doua oară, cererea se reia');
    assert.deepEqual(adaugate.map((f) => [f.familie, f.interval]), [
      [alias, 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'],
      [alias, 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+1E00-1E9F, U+2C60-2C7F, U+A720-A7FF'],
      [alias, 'U+0-10FFFF'],
    ]);
    assert.equal(adaugate[0]!.sursa, `url(${WOFF2('mL')}) format('woff2')`);
    // Aceeași variantă, alt text: fețele sunt ținute (nicio cerere nouă); browserul aduce alfabetele textului nou.
    assert.equal(await familieGoogle('Lobster', '400', 'Lemn'), alias);
    assert.equal(cereri.length, 2);
    assert.deepEqual(incarcate.at(-1), [`16px "${alias}"`, 'Lemn']);
    // Altă variantă: alt nume, altă cerere.
    const italic = await familieGoogle('Lobster', '400i', 'Lemn');
    assert.notEqual(italic, alias);
    assert.equal(cereri.at(-1)!.url, 'https://fonts.googleapis.com/css2?family=Lobster:ital,wght@1,400');
    // Un CSS fără fețe WOFF2 (altă formă a răspunsului): fără probă, cerut din nou data viitoare.
    raspuns = () => new Response(CSS_TTF);
    assert.equal(await familieGoogle('Roboto', '700i', 'A'), null);
    assert.equal(await familieGoogle('Roboto', '700i', 'A'), null);
    assert.equal(cereri.filter((c) => c.url.includes('Roboto')).length, 2);
  } finally {
    g['fetch'] = vechi.fetch;
    g['FontFace'] = vechi.FontFace;
    g['document'] = vechi.document;
  }
});
