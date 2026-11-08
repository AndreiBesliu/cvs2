/**
 * Biblioteca extensiilor (ADR 0230), partea gazdei: catalogul judecat câmp cu câmp, versiunile comparate pe numere, starea
 * fiecărui rând față de ce e instalat, ce cere în plus o versiune nouă, apoi drumul unei instalări din bibliotecă: descărcarea
 * oprită la mărimea din catalog, amprenta SHA-256 a octeților verificată ÎNAINTEA cititorului de pachete, manifestul potrivit
 * cu rândul, abia apoi scrierea. Pachetele de probă sunt construite aici (extensia `salut`), nu luate din build.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { impacheteaza } from '../../scripts/impacheteaza-extensie.ts';
import {
  citesteCatalog, comparaVersiuni, FORMAT_CATALOG, MAX_OCTETI_PACHET, numePachet, SCHEMA_CATALOG, type RandBiblioteca,
} from '../../shared/biblioteca.ts';
import {
  cereCatalogul, descarcaPachetul, instaleazaDinBiblioteca, judecaDinBiblioteca, permisiuniNoi, stareRand,
} from '../../src/extensii/biblioteca.ts';
import type { ExtensieInstalata } from '../../src/extensii/depozit.ts';
import { citestePachet, LIMITE_PACHET, type Manifest, type RezultatPachet } from '../../src/extensii/pachet.ts';

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const SALUT = impacheteaza('extensii/salut');
const ZIP = SALUT.octeti;

/** Rândul din catalog al pachetului de probă (ca la build: câmpurile din manifest, numele cu amprenta). */
function randSalut(peste: Partial<RandBiblioteca> = {}): RandBiblioteca {
  const m = SALUT.manifest as { id: string; nume: string; versiune: string; api: number; permisiuni: string[] };
  const h = sha(ZIP);
  return {
    id: m.id, nume: m.nume, versiune: m.versiune, api: m.api, permisiuni: m.permisiuni,
    descriere: { ro: 'Extensia de probă.', en: 'The test extension.' },
    pachet: numePachet(m.id, m.versiune, h), octeti: ZIP.length, sha256: h, ...peste,
  };
}
const catalog = (extensii: unknown[]): unknown => ({ format: FORMAT_CATALOG, schema: SCHEMA_CATALOG, extensii });

/** Un manifest instalat, doar cu ce privește starea rândului. */
const instalat = (versiune: string, permisiuni: readonly string[] = ['stocare'], id = 'salut'): Manifest =>
  ({ format: 'cvs2-extensie', api: 1, id, nume: 'Salut', versiune, intrare: 'index.js', stiluri: [], permisiuni, fisiere: {} }) as Manifest;

/** Un `fetch` fals: răspunsul dat, cu octeții în bucăți (câte s-au cerut din flux, numărate). */
function fetchFals(r: { readonly status?: number; readonly bucati?: readonly Uint8Array[]; readonly arunca?: boolean; readonly json?: string }) {
  const cereri: string[] = [];
  let citite = 0;
  let oprit = false;
  const f = (async (adresa: string | URL | Request): Promise<Response> => {
    cereri.push(String(adresa));
    if (r.arunca) throw new TypeError('Failed to fetch');
    if (r.json !== undefined) return new Response(r.json, { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
    const bucati = [...(r.bucati ?? [])];
    const flux = new ReadableStream<Uint8Array>({
      pull(c) {
        const b = bucati.shift();
        if (b) { citite++; c.enqueue(b); } else c.close();
      },
      cancel() { oprit = true; },
    }, { highWaterMark: 0 });
    return new Response(flux, { status: r.status ?? 200 });
  }) as typeof fetch;
  return { f, cereri, citite: () => citite, oprit: () => oprit };
}

test('catalogul bun se citește; o formă greșită se refuză, câmp cu câmp, cu motivul', () => {
  const bun = citesteCatalog(catalog([randSalut()]));
  assert.ok(bun.ok);
  assert.equal(bun.ok && bun.catalog.extensii[0]?.id, 'salut');
  assert.ok(citesteCatalog(catalog([])).ok, 'o bibliotecă goală e o bibliotecă');

  const r = randSalut() as Record<string, unknown>;
  const gresite: ReadonlyArray<readonly [string, unknown]> = [
    ['nu e obiect', []],
    ['alt format', { ...(catalog([r]) as object), format: 'cvs2-extensie' }],
    ['altă schemă', { ...(catalog([r]) as object), schema: 2 }],
    ['fără listă', { format: FORMAT_CATALOG, schema: SCHEMA_CATALOG }],
    ['prea multe rânduri', catalog(Array.from({ length: 51 }, (_, i) => ({ ...r, id: `x${i}`, pachet: numePachet(`x${i}`, String(r.versiune), String(r.sha256)) })))],
    ['id greșit', catalog([{ ...r, id: 'Salut' }])],
    ['nume gol', catalog([{ ...r, nume: '' }])],
    ['nume prea lung', catalog([{ ...r, nume: 'n'.repeat(61) }])],
    ['versiune care nu e din numere', catalog([{ ...r, versiune: '1.0.0-proba' }])],
    ['api care nu e întreg', catalog([{ ...r, api: 1.5 }])],
    ['permisiuni care nu sunt listă', catalog([{ ...r, permisiuni: 'stocare' }])],
    ['o permisiune de două ori', catalog([{ ...r, permisiuni: ['stocare', 'stocare'] }])],
    ['descriere fără engleză', catalog([{ ...r, descriere: { ro: 'doar română' } }])],
    ['descriere prea lungă', catalog([{ ...r, descriere: { ro: 'd'.repeat(161), en: 'd' } }])],
    ['pachetul cu alt nume decât amprenta', catalog([{ ...r, pachet: 'salut-1.0.0.zip' }])],
    ['pachetul într-un alt dosar', catalog([{ ...r, pachet: `../${String(r.pachet)}` }])],
    ['zero octeți', catalog([{ ...r, octeti: 0 }])],
    ['peste plafonul pachetului', catalog([{ ...r, octeti: MAX_OCTETI_PACHET + 1 }])],
    ['amprentă scurtă', catalog([{ ...r, sha256: 'ab12' }])],
    ['amprentă cu majuscule', catalog([{ ...r, sha256: String(r.sha256).toUpperCase() }])],
    ['același id de două ori', catalog([r, r])],
  ];
  for (const [ce, x] of gresite) {
    const c = citesteCatalog(x);
    assert.equal(c.ok, false, ce);
    assert.ok(!c.ok && c.detaliu.length > 0, `${ce}: motivul`);
  }
});

test('plafonul unui pachet din bibliotecă e al pachetelor (ADR 0127 §A)', () => {
  assert.equal(MAX_OCTETI_PACHET, LIMITE_PACHET.octetiTotal);
});

test('versiunile se compară pe numere; una care nu e din numere nu se compară', () => {
  assert.equal(comparaVersiuni('18.10.0', '18.9.1'), 1);
  assert.equal(comparaVersiuni('18.7.1', '18.8.0'), -1);
  assert.equal(comparaVersiuni('18.7', '18.7.0'), 0);
  assert.equal(comparaVersiuni('2', '10'), -1);
  assert.equal(comparaVersiuni('18.7.1', '18.7.1'), 0);
  assert.equal(comparaVersiuni('18.8.0-proba', '18.7.1'), null);
  assert.equal(comparaVersiuni('18.7.1', 'v18.7.1'), null);
  assert.equal(comparaVersiuni('', '1'), null);
});

test('starea rândului: Instalează, Actualizează (cu ce cere în plus), Instalată, alta, Reîncarcă', () => {
  const r = randSalut({ versiune: '1.2.0', permisiuni: ['stocare', 'descarcari'] });
  assert.deepEqual(stareRand(r, undefined), { fel: 'instaleaza' });
  assert.deepEqual(stareRand(r, instalat('1.1.9')), { fel: 'actualizeaza', de: '1.1.9', permisiuniNoi: ['descarcari'] });
  assert.deepEqual(stareRand(r, instalat('1.1.9', ['descarcari', 'stocare'])), { fel: 'actualizeaza', de: '1.1.9', permisiuniNoi: [] });
  assert.deepEqual(stareRand(r, instalat('1.2.0')), { fel: 'instalata' });
  assert.deepEqual(stareRand(r, instalat('1.10.0')), { fel: 'alta', versiune: '1.10.0' }, 'biblioteca nu coboară versiunea');
  assert.deepEqual(stareRand(r, instalat('1.2.0-proba')), { fel: 'alta', versiune: '1.2.0-proba' });
  // Ce nu știe fila de acum (o permisiune nouă, alt `api`): „Reîncarcă”, chiar și peste una instalată mai veche.
  assert.deepEqual(stareRand({ ...r, permisiuni: ['stocare', 'imprimanta'] }, undefined), { fel: 'reincarca' });
  assert.deepEqual(stareRand({ ...r, permisiuni: ['stocare', 'imprimanta'] }, instalat('1.0.0')), { fel: 'reincarca' });
  assert.deepEqual(stareRand({ ...r, api: 2 }, instalat('1.0.0')), { fel: 'reincarca' });
});

test('ce cere în plus o versiune nouă: doar permisiunile noi, în ordinea lor', () => {
  assert.deepEqual(permisiuniNoi(['stocare', 'cont'], ['forme', 'stocare', 'masina', 'cont']), ['forme', 'masina']);
  assert.deepEqual(permisiuniNoi(['stocare', 'forme'], ['stocare']), []);
  assert.deepEqual(permisiuniNoi([], []), []);
});

test('amprenta greșită se refuză înaintea cititorului de pachete: cu aceeași mărime și cu alta', async () => {
  let chemari = 0;
  const citeste = async (o: Uint8Array): Promise<RezultatPachet> => { chemari++; return citestePachet(o); };
  const r = randSalut();
  const schimbat = new Uint8Array(ZIP);
  schimbat[schimbat.length - 30] = (schimbat[schimbat.length - 30] ?? 0) ^ 0xff;
  const a = await judecaDinBiblioteca(schimbat, r, citeste);
  assert.deepEqual(a.ok ? null : [a.motiv, a.defect], ['amprenta-biblioteca', true]);
  const b = await judecaDinBiblioteca(ZIP.subarray(0, ZIP.length - 1), r, citeste);
  assert.deepEqual(b.ok ? null : [b.motiv, b.defect], ['amprenta-biblioteca', true]);
  assert.equal(chemari, 0, 'cititorul n-a văzut niciun octet nepotrivit');
  const c = await judecaDinBiblioteca(ZIP, r, citeste);
  assert.ok(c.ok);
  assert.equal(chemari, 1);
});

test('un manifest care nu e al rândului din catalog se refuză (numele, versiunea, permisiunile, id-ul)', async () => {
  for (const peste of [{ nume: 'Altul' }, { versiune: '9.9.9' }, { permisiuni: ['stocare', 'cont'] }, { permisiuni: [] }, { id: 'alt-id' }] as const) {
    const j = await judecaDinBiblioteca(ZIP, randSalut(peste));
    assert.deepEqual(j.ok ? null : [j.motiv, j.defect], ['biblioteca-nepotrivita', true], JSON.stringify(peste));
  }
});

test('un pachet stricat, cu amprenta lui în catalog: motivul cititorului, ca defect al publicării', async () => {
  const stricat = new TextEncoder().encode('nu e un zip, dar amprenta din catalog e a lui');
  const j = await judecaDinBiblioteca(stricat, randSalut({ octeti: stricat.length, sha256: sha(stricat) }));
  assert.deepEqual(j.ok ? null : [j.motiv, j.defect], ['nu-e-zip', true]);
});

test('descărcarea se oprește peste mărimea din catalog, fără să citească restul fluxului', async () => {
  const bucata = new Uint8Array(1000);
  const f = fetchFals({ bucati: Array.from({ length: 10 }, () => bucata) });
  const d = await descarcaPachetul('https://cvs2.test/extensii/a.zip', 1500, f.f);
  assert.deepEqual(d.ok ? null : [d.motiv, d.defect], ['amprenta-biblioteca', true], 'octeții n-au cum fi ai pachetului din catalog');
  assert.ok(f.citite() <= 3, `a doua bucată trece de 1 500 de octeți: restul nu se mai cere (citite ${f.citite()} din 10)`);
  assert.ok(f.oprit(), 'fluxul e oprit');
  const g = fetchFals({ bucati: [bucata] });
  const e = await descarcaPachetul('https://cvs2.test/extensii/a.zip', 1000, g.f);
  assert.ok(e.ok && e.octeti.length === 1000);
});

test('descărcarea: fără rețea nu e defect; un răspuns HTTP greșit e', async () => {
  const fara = await descarcaPachetul('https://cvs2.test/extensii/a.zip', 10, fetchFals({ arunca: true }).f);
  assert.deepEqual(fara.ok ? null : [fara.motiv, fara.defect], ['retea', false]);
  const lipsa = await descarcaPachetul('https://cvs2.test/extensii/a.zip', 10, fetchFals({ status: 404 }).f);
  assert.deepEqual(lipsa.ok ? null : [lipsa.motiv, lipsa.detaliu, lipsa.defect], ['http', 'HTTP 404', true]);
});

test('instalarea din bibliotecă scrie extensia, cu sursa și amprenta ei, abia după toate verificările', async () => {
  const scrise: ExtensieInstalata[] = [];
  const scrie = async (e: ExtensieInstalata): Promise<void> => { scrise.push(e); };
  const r = randSalut();
  const bun = fetchFals({ bucati: [ZIP] });
  const i = await instaleazaDinBiblioteca(r, { adresaCatalog: 'https://cvs2.test/extensii/catalog.json', fetch: bun.f, scrie, acum: () => new Date('2026-11-07T16:00:00Z') });
  assert.ok(i.ok);
  assert.deepEqual(bun.cereri, [`https://cvs2.test/extensii/${r.pachet}`], 'pachetul vine de lângă catalog, după numele lui');
  assert.equal(scrise.length, 1);
  const e = scrise[0];
  assert.ok(e);
  assert.deepEqual(e.sursa, { fel: 'biblioteca', sha256: r.sha256 });
  assert.equal(e.id, 'salut');
  assert.equal(e.manifest.versiune, r.versiune);
  assert.equal(e.instalat, '2026-11-07T16:00:00.000Z');
  assert.deepEqual(Object.keys(e.fisiere).sort(), Object.keys(SALUT.manifest.fisiere as object).sort());

  const schimbat = new Uint8Array(ZIP);
  schimbat[100] = (schimbat[100] ?? 0) ^ 1;
  const rau = await instaleazaDinBiblioteca(r, { adresaCatalog: 'https://cvs2.test/extensii/catalog.json', fetch: fetchFals({ bucati: [schimbat] }).f, scrie });
  assert.deepEqual(rau.ok ? null : rau.motiv, 'amprenta-biblioteca');
  assert.equal(scrise.length, 1, 'nimic scris după amprenta greșită');
});

test('catalogul cerut: bun, fără rețea, un răspuns greșit, un JSON stricat, o formă greșită', async () => {
  const bun = await cereCatalogul('/extensii/catalog.json', fetchFals({ json: JSON.stringify(catalog([randSalut()])) }).f);
  assert.equal(bun.fel, 'ok');
  assert.deepEqual(await cereCatalogul('/extensii/catalog.json', fetchFals({ arunca: true }).f), { fel: 'retea' });
  assert.deepEqual(await cereCatalogul('/extensii/catalog.json', fetchFals({ status: 404, json: '' }).f), { fel: 'defect', detaliu: 'HTTP 404' });
  assert.deepEqual(await cereCatalogul('/extensii/catalog.json', fetchFals({ json: '<!doctype html>' }).f), { fel: 'defect', detaliu: 'json' });
  const forma = await cereCatalogul('/extensii/catalog.json', fetchFals({ json: '{"format":"altul"}' }).f);
  assert.equal(forma.fel, 'defect');
});
