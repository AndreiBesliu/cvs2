/**
 * Pachetul unei extensii (ADR 0127 §A): manifestul (forma, `api`, id-ul, căile, intrarea, stilurile, permisiunile din
 * catalog), fișierele potrivite cu amprentele lor în ambele sensuri, limitele; și pachetul extensiei de probă, cum îl scrie
 * `scripts/impacheteaza-extensie.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { caleBuna, citesteManifest, citestePachet } from '../../src/extensii/pachet.ts';

const b = (s: string): Uint8Array => new TextEncoder().encode(s);
const sha = (u: Uint8Array): string => createHash('sha256').update(u).digest('hex');
const JS = b('export function activeaza() { return { deschide() {} }; }\n');
const CSS = b('body { margin: 0; }\n');
const manifest = (extra: Record<string, unknown> = {}) => ({
  format: 'cvs2-extensie', api: 1, id: 'proba', nume: 'Proba', versiune: '1.0.0', intrare: 'index.js', stiluri: ['stil.css'],
  permisiuni: [], fisiere: { 'index.js': sha(JS), 'stil.css': sha(CSS) }, ...extra,
});
const pachet = (m: unknown, fisiere: [string, Uint8Array][] = [['index.js', JS], ['stil.css', CSS]]) =>
  scrieZip([{ nume: 'extensie.json', octeti: b(JSON.stringify(m)) }, ...fisiere.map(([nume, octeti]) => ({ nume, octeti }))]);

test('căile: relative, ASCII vizibil, fără „\\”, segmente goale, „.” sau „..”', () => {
  for (const c of ['index.js', 'lib/a.js', 'a-b_c.v2.css']) assert.equal(caleBuna(c), true, c);
  for (const c of ['', '/a.js', '../a.js', 'a/../b.js', './a.js', 'a//b.js', 'a\\b.js', 'ă.js', 'a b.js', 'a/', 'x'.repeat(201)]) {
    assert.equal(caleBuna(c), false, c);
  }
});

test('un pachet bun se citește: manifestul, fișierele, mărimea', async () => {
  const r = await citestePachet(pachet(manifest()));
  assert.ok(r.ok);
  assert.equal(r.pachet.manifest.id, 'proba');
  assert.deepEqual([...r.pachet.fisiere.keys()], ['index.js', 'stil.css']);
  assert.equal(r.pachet.octeti, JS.length + CSS.length);
  const fara = await citestePachet(pachet(manifest({ stiluri: undefined, permisiuni: undefined, fisiere: { 'index.js': sha(JS) } }), [['index.js', JS]]));
  assert.ok(fara.ok);
  assert.deepEqual([fara.pachet.manifest.stiluri, fara.pachet.manifest.permisiuni], [[], []]);
});

test('manifestul greșit e refuzat cu motivul lui', () => {
  const cazuri: [Record<string, unknown>, string][] = [
    [{ format: 'alt' }, 'manifest'], [{ api: 2 }, 'api'], [{ api: '1' }, 'api'], [{ id: 'Proba' }, 'id'], [{ id: '' }, 'id'],
    [{ id: 'a'.repeat(41) }, 'id'], [{ nume: '' }, 'manifest'], [{ versiune: 'x'.repeat(21) }, 'manifest'],
    [{ intrare: 'altul.js' }, 'intrare'], [{ intrare: 'stil.css' }, 'intrare'], [{ stiluri: ['index.js'] }, 'stil'],
    [{ stiluri: ['lipsa.css'] }, 'stil'], [{ permisiuni: ['retea'] }, 'permisiune'], [{ stiluri: 'stil.css' }, 'manifest'],
    [{ fisiere: { '../index.js': sha(JS) } }, 'cale'], [{ fisiere: { 'extensie.json': sha(JS), 'index.js': sha(JS) } }, 'cale'],
    [{ fisiere: { 'index.js': sha(JS).toUpperCase() } }, 'manifest'], [{ fisiere: [] }, 'manifest'],
  ];
  for (const [extra, motiv] of cazuri) {
    const r = citesteManifest(manifest(extra));
    assert.equal(r.ok ? 'ok' : r.motiv, motiv, JSON.stringify(extra));
  }
  assert.equal(citesteManifest(null).ok, false);
  assert.equal(citesteManifest([]).ok, false);
});

test('fișierele: lipsă, în plus, dublate, cu altă amprentă; manifestul lipsă sau nu e JSON; zip-ul stricat', async () => {
  const motiv = async (z: Uint8Array): Promise<string> => { const r = await citestePachet(z); return r.ok ? 'ok' : `${r.motiv}:${r.detaliu ?? ''}`; };
  assert.equal(await motiv(pachet(manifest(), [['index.js', JS]])), 'lipsa:stil.css');
  assert.equal(await motiv(pachet(manifest(), [['index.js', JS], ['stil.css', CSS], ['altul.js', JS]])), 'in-plus:altul.js');
  assert.equal(await motiv(pachet(manifest(), [['index.js', JS], ['stil.css', CSS], ['index.js', JS]])), 'in-plus:index.js');
  assert.equal(await motiv(pachet(manifest(), [['index.js', b('alt cod')], ['stil.css', CSS]])), 'amprenta:index.js');
  assert.equal(await motiv(scrieZip([{ nume: 'index.js', octeti: JS }])), 'fara-manifest:');
  assert.equal(await motiv(scrieZip([{ nume: 'extensie.json', octeti: b('{nu') }])), 'manifest:json');
  assert.equal(await motiv(b('nu e zip')), 'nu-e-zip:');
});

test('extensia de probă (extensii/salut), împachetată: intrarea transpilată din TypeScript, amprentele, pachetul trece', async () => {
  const { manifest: m, octeti } = impacheteaza('extensii/salut');
  assert.equal(m.id, 'salut');
  assert.equal(m.intrare, 'index.js');
  const r = await citestePachet(octeti);
  assert.ok(r.ok);
  const cod = new TextDecoder().decode(r.pachet.fisiere.get('index.js'));
  assert.match(cod, /export (async )?function activeaza/);
  assert.doesNotMatch(cod, /import type|: HostApi/);
});
