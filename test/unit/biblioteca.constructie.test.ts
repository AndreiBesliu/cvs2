/**
 * Biblioteca extensiilor (ADR 0230), construcția: din `extensii/biblioteca.json`, la fiecare build, pachetul fiecărei extensii
 * și catalogul lor, pentru `dist/extensii/`. Catalogul are amprenta și mărimea pachetului de lângă el și câmpurile manifestului
 * lui; tot ce verifică gazda la instalare trece pe ieșirea adevărată. Construcția e deterministă. Și garda versiunilor: un
 * conținut nou cere o versiune nouă, înregistrată în listă (`node scripts/biblioteca.ts --scrie`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  amprentaContinut, citesteLista, construiesteBiblioteca, judecaInregistrarea, marimeWebp, pachetDinDosar, stareNoutati,
} from '../../scripts/biblioteca.ts';
import {
  citesteCatalog, FISIER_CATALOG_BIBLIOTECA, MAX_NOUTATI, MAX_OCTETI_CAPTURA, numeFisierBiblioteca, numePachet, type ImagineBiblioteca,
} from '../../shared/biblioteca.ts';
import { motivPrecache } from '../../shared/precache.ts';
import { judecaDinBiblioteca, stareRand } from '../../src/extensii/biblioteca.ts';
import { citestePachet } from '../../src/extensii/pachet.ts';

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const CONSTRUITA = construiesteBiblioteca();

test('catalogul construit: un rând pe fiecare extensie din listă, cu amprenta și mărimea pachetului de lângă el', async () => {
  const lista = citesteLista();
  const text = CONSTRUITA.fisiere.get(FISIER_CATALOG_BIBLIOTECA);
  assert.ok(text, 'catalogul e în dist/extensii/');
  const c = citesteCatalog(JSON.parse(new TextDecoder().decode(text)));
  assert.ok(c.ok, c.ok ? '' : c.detaliu);
  assert.deepEqual(c.catalog.extensii.map((r) => r.id), lista.map((x) => JSON.parse(readFileSync(`extensii/${x.dosar}/extensie.json`, 'utf8')).id));
  assert.deepEqual(c.sarite, [], 'catalogul construit n-are date pe care aplicația de acum să le sară');
  const imagini = c.catalog.extensii.flatMap((r) => [...(r.pictograma ? [r.pictograma] : []), ...(r.capturi?.ro ?? []), ...(r.capturi?.en ?? [])]);
  assert.deepEqual(
    [...CONSTRUITA.fisiere.keys()].sort(),
    [FISIER_CATALOG_BIBLIOTECA, ...c.catalog.extensii.map((r) => `extensii/${r.pachet}`), ...imagini.map((i) => `extensii/${i.fisier}`)].sort(),
    'în dist/extensii/ doar catalogul, pachetele lui, semnele și capturile din el',
  );
  for (const r of c.catalog.extensii) {
    const zip = CONSTRUITA.fisiere.get(`extensii/${r.pachet}`);
    assert.ok(zip, r.pachet);
    assert.equal(r.sha256, sha(zip), 'amprenta din catalog e a octeților publicați');
    assert.equal(r.octeti, zip.length);
    assert.equal(r.pachet, numePachet(r.id, r.versiune, r.sha256));
    // Tot ce face gazda la instalare trece pe ieșirea adevărată: amprenta, cititorul, potrivirea cu rândul.
    const j = await judecaDinBiblioteca(zip, r);
    assert.ok(j.ok, j.ok ? '' : `${j.motiv} ${j.detaliu ?? ''}`);
    assert.deepEqual(stareRand(r, undefined), { fel: 'instaleaza' }, 'fila construită din același commit o știe');
    for (const f of CONSTRUITA.fisiere.keys()) assert.equal(motivPrecache(f), 'biblioteca', f);
  }
});

test('Easy 3Draw e în bibliotecă, cu numele, versiunea și permisiunile manifestului, și descrierea în ambele limbi', () => {
  const text = CONSTRUITA.fisiere.get(FISIER_CATALOG_BIBLIOTECA);
  const c = citesteCatalog(JSON.parse(new TextDecoder().decode(text)));
  assert.ok(c.ok);
  const r = c.catalog.extensii.find((x) => x.id === 'trenulet');
  assert.ok(r, 'trenulet');
  const sursa = JSON.parse(readFileSync('extensii/trenulet/extensie.json', 'utf8')) as { nume: string; versiune: string; permisiuni: string[] };
  assert.equal(r.nume, 'Easy 3Draw');
  assert.equal(r.versiune, sursa.versiune);
  assert.deepEqual(r.permisiuni, sursa.permisiuni);
  assert.ok(r.descriere.ro.length > 20 && r.descriere.en.length > 20);
  assert.notEqual(r.descriere.ro, r.descriere.en);
});

test('construcția e deterministă: de două ori, aceiași octeți', () => {
  const a = CONSTRUITA.fisiere;
  const b = construiesteBiblioteca().fisiere;
  assert.deepEqual([...a.keys()].sort(), [...b.keys()].sort());
  for (const [k, v] of a) assert.equal(sha(v), sha(b.get(k) ?? new Uint8Array()), k);
});

test('un conținut nou cere o versiune nouă: versiunea și amprenta conținutului înregistrate sunt ale pachetului de acum', () => {
  for (const x of citesteLista()) {
    const { manifest } = pachetDinDosar(x.dosar);
    const calc = { versiune: String(manifest.versiune), continut: amprentaContinut(manifest) };
    const stare = judecaInregistrarea(x, calc);
    assert.equal(stare, 'la-zi', {
      'continut-fara-versiune': `${x.dosar}: conținutul s-a schimbat, versiunea (${x.versiune}) nu: ridică versiunea în extensii/${x.dosar}/extensie.json, apoi node scripts/biblioteca.ts --scrie`,
      'versiune-nescrisa': `${x.dosar}: versiunea nouă (${calc.versiune}) nu e înregistrată în extensii/biblioteca.json: node scripts/biblioteca.ts --scrie`,
      'versiune-mai-mica': `${x.dosar}: versiunea (${calc.versiune}) e mai mică decât cea înregistrată (${x.versiune})`,
      'la-zi': '',
    }[stare]);
  }
});

test('judecata înregistrării: la zi, conținut fără versiune, versiune nescrisă, versiune mai mică', () => {
  const a = { versiune: '18.7.1', continut: 'a'.repeat(64) };
  assert.equal(judecaInregistrarea(a, { ...a }), 'la-zi');
  assert.equal(judecaInregistrarea(a, { versiune: '18.7.1', continut: 'b'.repeat(64) }), 'continut-fara-versiune');
  assert.equal(judecaInregistrarea(a, { versiune: '18.8.0', continut: 'b'.repeat(64) }), 'versiune-nescrisa');
  assert.equal(judecaInregistrarea(a, { versiune: '18.6.0', continut: 'b'.repeat(64) }), 'versiune-mai-mica');
});

test('amprenta conținutului se schimbă cu orice fișier al pachetului și cu manifestul', () => {
  const { manifest } = pachetDinDosar('salut');
  const baza = amprentaContinut(manifest);
  const fisiere = { ...(manifest.fisiere as Record<string, string>) };
  const primul = Object.keys(fisiere)[0] ?? '';
  assert.notEqual(amprentaContinut({ ...manifest, fisiere: { ...fisiere, [primul]: 'f'.repeat(64) } }), baza);
  assert.notEqual(amprentaContinut({ ...manifest, versiune: '9.9.9' }), baza);
  assert.equal(amprentaContinut({ ...manifest }), baza);
});

test('lista bibliotecii: dosarul fiecărei extensii există, descrierea e scurtă și în ambele limbi', () => {
  const lista = citesteLista();
  assert.ok(lista.length >= 1);
  for (const x of lista) {
    assert.ok(existsSync(`extensii/${x.dosar}/extensie.json`), x.dosar);
    for (const l of ['ro', 'en'] as const) assert.ok(x.descriere[l].length > 0 && x.descriere[l].length <= 160, `${x.dosar} ${l}`);
  }
});

/** Semnul, capturile, descrierea lungă, „ce e nou” și autorul (ADR 0231 §B.1), pe ieșirea adevărată a construcției. */
const catalogConstruit = () => {
  const c = citesteCatalog(JSON.parse(new TextDecoder().decode(CONSTRUITA.fisiere.get(FISIER_CATALOG_BIBLIOTECA))));
  assert.ok(c.ok);
  return c.catalog;
};
/** Fișierul unei imagini din catalog: lângă el, cu mărimea scrisă și cu amprenta lui în nume. */
const imaginea = (i: ImagineBiblioteca): Uint8Array => {
  const o = CONSTRUITA.fisiere.get(`extensii/${i.fisier}`);
  assert.ok(o, i.fisier);
  assert.equal(i.octeti, o.length, i.fisier);
  assert.match(i.fisier, new RegExp(`-${sha(o).slice(0, 8)}\\.(svg|webp)$`), 'numele poartă amprenta octeților');
  return o;
};

test('semnul din catalog e chiar fișierul din pachet, pus lângă catalog cu amprenta lui în nume', async () => {
  for (const r of catalogConstruit().extensii) {
    const zip = CONSTRUITA.fisiere.get(`extensii/${r.pachet}`);
    assert.ok(zip);
    const p = await citestePachet(zip);
    assert.ok(p.ok);
    const cale = p.pachet.manifest.pictograma;
    if (cale === undefined) { assert.equal(r.pictograma, undefined, `${r.id}: fără semn în pachet, fără semn în catalog`); continue; }
    assert.ok(r.pictograma, `${r.id}: semnul din pachet e și în catalog`);
    assert.deepEqual(imaginea(r.pictograma), p.pachet.fisiere.get(cale));
    assert.equal(r.pictograma.fisier, numeFisierBiblioteca(r.id, 'pictograma', sha(imaginea(r.pictograma)), 'svg'));
  }
});

test('Easy 3Draw are în bibliotecă semnul, trei capturi pe limbă, descrierea lungă, autorul și „ce e nou” pentru versiunea de acum', () => {
  const r = catalogConstruit().extensii.find((x) => x.id === 'trenulet');
  assert.ok(r);
  assert.ok(r.pictograma, 'semnul');
  assert.ok(r.capturi, 'capturile');
  for (const l of ['ro', 'en'] as const) {
    assert.equal(r.capturi[l].length, 3, `capturile (${l})`);
    for (const c of r.capturi[l]) {
      const o = imaginea(c);
      assert.ok(o.length <= MAX_OCTETI_CAPTURA, c.fisier);
      assert.deepEqual(marimeWebp(o), { lat: c.lat, inalt: c.inalt }, c.fisier);
      // Cadrul extensiei la 1280 × 800, micșorat la 960 px lățime (scriptul capturilor).
      assert.deepEqual([c.lat, c.inalt], [960, 600], c.fisier);
      assert.ok(c.alt.length > 3, 'textul alternativ');
    }
    assert.ok(r.capturi[l].every((c) => c.fisier.includes(`-${l}-`)), `capturile limbii ${l}`);
  }
  assert.notDeepEqual(r.capturi.ro.map((c) => c.alt), r.capturi.en.map((c) => c.alt), 'textele alternative, traduse');
  assert.ok(r.despre && r.despre.ro.length > r.descriere.ro.length && r.despre.en.length > r.descriere.en.length, 'descrierea lungă');
  assert.equal(r.autor, 'CNC Vector Studio');
  assert.equal(r.noutati?.[0]?.versiune, r.versiune, '„ce e nou” începe cu versiunea publicată');
  assert.ok((r.noutati?.length ?? 0) >= 3, 'și ultimele versiuni dinainte');
});

test('„ce e nou” e cerut la fiecare versiune (ADR 0231, răspunsul 3a): primul rând al fiecărei extensii e al versiunii pachetului de acum', () => {
  for (const x of citesteLista()) {
    const versiune = String(pachetDinDosar(x.dosar).manifest.versiune);
    assert.equal(stareNoutati(x.noutati, versiune), 'la-zi',
      `${x.dosar}: scrie în extensii/biblioteca.json, primul în „noutati”, rândul versiunii ${versiune}: { "versiune": "${versiune}", "ro": "…", "en": "…" } (cel mult 240 de caractere)`);
  }
});

test('starea lui „ce e nou”: la zi doar când primul rând e al versiunii de acum', () => {
  const n = [{ versiune: '1.2.0', ro: 'nou', en: 'new' }, { versiune: '1.1.0', ro: 'vechi', en: 'old' }];
  assert.equal(stareNoutati(n, '1.2.0'), 'la-zi');
  assert.equal(stareNoutati(n, '1.3.0'), 'lipsesc', 'versiunea nouă n-are rândul ei');
  assert.equal(stareNoutati(n, '1.1.0'), 'lipsesc', 'rândul ei nu e primul');
  assert.equal(stareNoutati([], '1.0.0'), 'lipsesc');
  assert.equal(stareNoutati(undefined, '1.0.0'), 'lipsesc');
});

test('lista bibliotecii judecă datele de prezentare: descrierea lungă, autorul, „ce e nou” în ordine, capturile', () => {
  const baza = { dosar: 'salut', descriere: { ro: 'Proba.', en: 'The test.' }, versiune: '1.0.0', continut: 'a'.repeat(64) };
  const dir = mkdtempSync(join(tmpdir(), 'cncvs2-lista-'));
  const cu = (extra: Record<string, unknown>) => {
    const cale = join(dir, 'lista.json');
    writeFileSync(cale, JSON.stringify({ extensii: [{ ...baza, ...extra }] }));
    return () => citesteLista(cale);
  };
  const buna = cu({
    despre: { ro: 'Pe larg.', en: 'At length.' }, autor: 'CNC Vector Studio',
    noutati: [{ versiune: '1.0.0', ro: 'Prima.', en: 'First.', data: '2026-11-23' }, { versiune: '0.9.0', ro: 'Proba.', en: 'Trial.' }],
    capturi: [{ nume: '1-fereastra', alt: { ro: 'Fereastra', en: 'The window' } }],
  })()[0];
  assert.equal(buna?.autor, 'CNC Vector Studio');
  assert.equal(buna?.noutati?.length, 2);
  // Data versiunii, la alegere (ADR 0232 §C.15): rândul cu ea o păstrează, cel fără ea rămâne fără.
  assert.deepEqual(buna?.noutati, [{ versiune: '1.0.0', ro: 'Prima.', en: 'First.', data: '2026-11-23' }, { versiune: '0.9.0', ro: 'Proba.', en: 'Trial.' }]);
  assert.deepEqual(buna?.capturi, [{ nume: '1-fereastra', alt: { ro: 'Fereastra', en: 'The window' } }]);
  assert.equal(cu({})()[0]?.noutati, undefined, 'fără ele, lista rămâne bună (proba lui „ce e nou” le cere)');
  const gresite: ReadonlyArray<readonly [string, Record<string, unknown>, RegExp]> = [
    ['descrierea lungă fără engleză', { despre: { ro: 'doar' } }, /despre/],
    ['descrierea lungă peste 600', { despre: { ro: 'd'.repeat(601), en: 'd' } }, /despre/],
    ['autorul gol', { autor: '' }, /autor/],
    ['un rând de „ce e nou” peste 240', { noutati: [{ versiune: '1.0.0', ro: 'n'.repeat(241), en: 'n' }] }, /noutati/],
    ['un rând fără engleză', { noutati: [{ versiune: '1.0.0', ro: 'doar' }] }, /noutati/],
    ['o versiune care nu e din numere', { noutati: [{ versiune: 'ieri', ro: 'a', en: 'a' }] }, /noutati/],
    ['o dată care nu e an-lună-zi', { noutati: [{ versiune: '1.0.0', ro: 'a', en: 'a', data: '23.11.2026' }] }, /noutati.*dat/],
    ['o zi care nu există', { noutati: [{ versiune: '1.0.0', ro: 'a', en: 'a', data: '2026-02-30' }] }, /noutati.*dat/],
    ['versiunile în altă ordine', { noutati: [{ versiune: '0.9.0', ro: 'a', en: 'a' }, { versiune: '1.0.0', ro: 'b', en: 'b' }] }, /noutati/],
    ['aceeași versiune de două ori', { noutati: [{ versiune: '1.0.0', ro: 'a', en: 'a' }, { versiune: '1.0.0', ro: 'b', en: 'b' }] }, /noutati/],
    ['o captură cu un nume cu majuscule', { capturi: [{ nume: 'Fereastra', alt: { ro: 'a', en: 'a' } }] }, /capturi/],
    ['o captură fără text alternativ în engleză', { capturi: [{ nume: '1', alt: { ro: 'a' } }] }, /capturi/],
    ['cinci capturi', { capturi: Array.from({ length: 5 }, (_, i) => ({ nume: `c${i}`, alt: { ro: 'a', en: 'a' } })) }, /capturi/],
    ['aceeași captură de două ori', { capturi: [{ nume: '1', alt: { ro: 'a', en: 'a' } }, { nume: '1', alt: { ro: 'b', en: 'b' } }] }, /capturi/],
  ];
  for (const [ce, extra, motiv] of gresite) assert.throws(cu(extra), motiv, ce);
});

test('mărimea unei imagini WebP se citește din antetul ei: cu pierderi (VP8), fără (VP8L), extins (VP8X)', () => {
  const riff = (bucata: string, date: number[]): Uint8Array => {
    const corp = [...Buffer.from(bucata, 'latin1'), date.length & 255, (date.length >> 8) & 255, 0, 0, ...date];
    const n = 4 + corp.length;
    return new Uint8Array([...Buffer.from('RIFF', 'latin1'), n & 255, (n >> 8) & 255, 0, 0, ...Buffer.from('WEBP', 'latin1'), ...corp]);
  };
  // VP8: eticheta cadrului (3 octeți), semnul 9d 01 2a, apoi lățimea și înălțimea pe 14 biți: 960 = 0x03c0, 600 = 0x0258.
  assert.deepEqual(marimeWebp(riff('VP8 ', [0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a, 0xc0, 0x03, 0x58, 0x02])), { lat: 960, inalt: 600 });
  // Cei doi biți de sus ai fiecărei mărimi sunt scara, nu mărimea: 0x43c0 și 0x8258 sunt tot 960 și 600.
  assert.deepEqual(marimeWebp(riff('VP8 ', [0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a, 0xc0, 0x43, 0x58, 0x82])), { lat: 960, inalt: 600 });
  // VP8L: semnul 0x2f, apoi 14 biți lățimea − 1 (959 = 0x3bf) și 14 biți înălțimea − 1 (599 = 0x257): bf c3 95 00.
  assert.deepEqual(marimeWebp(riff('VP8L', [0x2f, 0xbf, 0xc3, 0x95, 0x00])), { lat: 960, inalt: 600 });
  // VP8X: steagurile (1 octet), 3 rezervați, lățimea − 1 și înălțimea − 1 pe câte 3 octeți.
  assert.deepEqual(marimeWebp(riff('VP8X', [0x10, 0, 0, 0, 0xbf, 0x03, 0x00, 0x57, 0x02, 0x00])), { lat: 960, inalt: 600 });
  // Trei octeți, nu doi: 70 000 − 1 = 0x01116f și 66 000 − 1 = 0x0101cf.
  assert.deepEqual(marimeWebp(riff('VP8X', [0x10, 0, 0, 0, 0x6f, 0x11, 0x01, 0xcf, 0x01, 0x01])), { lat: 70_000, inalt: 66_000 });
  assert.equal(marimeWebp(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), null, 'un PNG nu e WebP');
  assert.equal(marimeWebp(riff('VP8 ', [0, 0, 0, 0, 0, 0, 0xc0, 0x03, 0x58, 0x02])), null, 'fără semnul cadrului');
  assert.equal(marimeWebp(new Uint8Array(8)), null);
});

test('catalogul ține doar ultimele rânduri de „ce e nou”: lista poate păstra toată istoria', () => {
  const m = pachetDinDosar('salut').manifest;
  const versiune = String(m.versiune);
  // Șapte rânduri, de la versiunea de acum în jos (0.9.6 … 0.9.1).
  const noutati = [{ versiune, ro: 'Acum.', en: 'Now.' }, ...Array.from({ length: 6 }, (_, i) => ({ versiune: `0.9.${6 - i}`, ro: `Veche ${6 - i}.`, en: `Old ${6 - i}.` }))];
  const dir = mkdtempSync(join(tmpdir(), 'cncvs2-noutati-'));
  const cale = join(dir, 'lista.json');
  writeFileSync(cale, JSON.stringify({ extensii: [{ dosar: 'salut', descriere: { ro: 'Proba.', en: 'The test.' }, versiune, continut: amprentaContinut(m), noutati }] }));
  const construita = construiesteBiblioteca(cale);
  const c = citesteCatalog(JSON.parse(new TextDecoder().decode(construita.fisiere.get(FISIER_CATALOG_BIBLIOTECA))));
  assert.ok(c.ok);
  assert.deepEqual(c.sarite, [], 'aplicația citește „ce e nou” din catalog');
  assert.deepEqual(c.catalog.extensii[0]?.noutati, noutati.slice(0, MAX_NOUTATI));
});
