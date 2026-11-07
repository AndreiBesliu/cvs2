/**
 * Biblioteca extensiilor (ADR 0230), construcția: din `extensii/biblioteca.json`, la fiecare build, pachetul fiecărei extensii
 * și catalogul lor, pentru `dist/extensii/`. Catalogul are amprenta și mărimea pachetului de lângă el și câmpurile manifestului
 * lui; tot ce verifică gazda la instalare trece pe ieșirea adevărată. Construcția e deterministă. Și garda versiunilor: un
 * conținut nou cere o versiune nouă, înregistrată în listă (`node scripts/biblioteca.ts --scrie`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { amprentaContinut, citesteLista, construiesteBiblioteca, judecaInregistrarea, pachetDinDosar } from '../../scripts/biblioteca.ts';
import { citesteCatalog, FISIER_CATALOG_BIBLIOTECA, numePachet } from '../../shared/biblioteca.ts';
import { motivPrecache } from '../../shared/precache.ts';
import { judecaDinBiblioteca, stareRand } from '../../src/extensii/biblioteca.ts';

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const CONSTRUITA = construiesteBiblioteca();

test('catalogul construit: un rând pe fiecare extensie din listă, cu amprenta și mărimea pachetului de lângă el', async () => {
  const lista = citesteLista();
  const text = CONSTRUITA.fisiere.get(FISIER_CATALOG_BIBLIOTECA);
  assert.ok(text, 'catalogul e în dist/extensii/');
  const c = citesteCatalog(JSON.parse(new TextDecoder().decode(text)));
  assert.ok(c.ok, c.ok ? '' : c.detaliu);
  assert.deepEqual(c.catalog.extensii.map((r) => r.id), lista.map((x) => JSON.parse(readFileSync(`extensii/${x.dosar}/extensie.json`, 'utf8')).id));
  assert.equal(CONSTRUITA.fisiere.size, 1 + c.catalog.extensii.length, 'în dist/extensii/ doar catalogul și pachetele lui');
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
