/**
 * Pachetul unei extensii (ADR 0127 §A): manifestul (forma, `api`, id-ul, căile, intrarea, stilurile, permisiunile din
 * catalog), fișierele potrivite cu amprentele lor în ambele sensuri, limitele; și pachetul extensiei de probă, cum îl scrie
 * `scripts/impacheteaza-extensie.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pachetTrenulet } from '../../scripts/construieste-trenulet.ts';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { caleBuna, citesteManifest, citestePachet, LIMITE_PACHET } from '../../src/extensii/pachet.ts';

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

/** Semnul extensiei (ADR 0231 §B.2): câmpul opțional `pictograma`, un SVG mic din fișierele pachetului. */
const SVG = b('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f6e2c9"/></svg>\n');
const cuSemn = (semn: Uint8Array, extra: Record<string, unknown> = {}, nume = 'semn.svg') =>
  pachet(manifest({ pictograma: nume, fisiere: { 'index.js': sha(JS), 'stil.css': sha(CSS), [nume]: sha(semn) }, ...extra }), [['index.js', JS], ['stil.css', CSS], [nume, semn]]);

test('semnul extensiei: un SVG din fișierele pachetului se citește, cu amprenta lui; fără el, manifestul nu are câmpul', async () => {
  const r = await citestePachet(cuSemn(SVG));
  assert.ok(r.ok, r.ok ? '' : `${r.motiv} ${r.detaliu ?? ''}`);
  assert.equal(r.pachet.manifest.pictograma, 'semn.svg');
  assert.deepEqual(r.pachet.fisiere.get('semn.svg'), SVG);
  const cuDeclaratie = await citestePachet(cuSemn(b(`<?xml version="1.0" encoding="UTF-8"?>\n${new TextDecoder().decode(SVG)}`)));
  assert.ok(cuDeclaratie.ok, 'declarația XML dinaintea lui <svg> e a unui SVG');
  const fara = await citestePachet(pachet(manifest()));
  assert.ok(fara.ok);
  assert.equal('pictograma' in fara.pachet.manifest, false, 'un pachet fără semn rămâne cum era');
});

test('semnul extensiei greșit se refuză cu motivul lui: în afara listei, alt fel de fișier, prea mare, alt conținut', async () => {
  const motiv = async (z: Uint8Array): Promise<string> => { const r = await citestePachet(z); return r.ok ? 'ok' : `${r.motiv}:${r.detaliu ?? ''}`; };
  // Manifestul: un nume care nu e text, un fișier care nu e în listă, unul care nu e .svg.
  for (const p of [5, '', 'lipsa.svg', 'index.js', 'stil.css']) {
    const r = citesteManifest(manifest({ pictograma: p }));
    assert.equal(r.ok ? 'ok' : r.motiv, 'pictograma', JSON.stringify(p));
  }
  // Octeții: exact la plafon trece, un octet peste nu; un fișier care nu e SVG (nici text) nu.
  const cap = '<svg xmlns="http://www.w3.org/2000/svg">', coada = '</svg>';
  const deMarime = (n: number): Uint8Array => b(`${cap}${' '.repeat(n - cap.length - coada.length)}${coada}`);
  assert.equal(await motiv(cuSemn(deMarime(LIMITE_PACHET.octetiPictograma))), 'ok');
  assert.equal(await motiv(cuSemn(deMarime(LIMITE_PACHET.octetiPictograma + 1))), 'pictograma:prea-mare');
  assert.equal(await motiv(cuSemn(b('<html><svg></svg></html>'))), 'pictograma:semn.svg');
  assert.equal(await motiv(cuSemn(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe]))), 'pictograma:semn.svg');
});

test('împachetatorul pune în pachet semnul numit de manifest, iar pachetul trece prin cititor', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cncvs2-semn-'));
  writeFileSync(join(dir, 'extensie.json'), JSON.stringify({ format: 'cvs2-extensie', api: 1, id: 'cu-semn', nume: 'Cu semn', versiune: '1.0.0', intrare: 'index.js', permisiuni: [], pictograma: 'semn.svg' }));
  writeFileSync(join(dir, 'index.js'), JS);
  writeFileSync(join(dir, 'semn.svg'), SVG);
  const { manifest: m, octeti } = impacheteaza(dir);
  assert.equal(m.pictograma, 'semn.svg');
  assert.equal((m.fisiere as Record<string, string>)['semn.svg'], sha(SVG));
  const r = await citestePachet(octeti);
  assert.ok(r.ok, r.ok ? '' : `${r.motiv} ${r.detaliu ?? ''}`);
  assert.deepEqual(r.pachet.fisiere.get('semn.svg'), SVG);
});

test('Easy 3Draw își poartă semnul în pachet: un SVG mic, numit în manifest, același cu cel din dosarul lui', async () => {
  const { manifest: m, octeti } = pachetTrenulet();
  assert.equal(m.pictograma, 'pictograma.svg');
  const r = await citestePachet(octeti);
  assert.ok(r.ok, r.ok ? '' : `${r.motiv} ${r.detaliu ?? ''}`);
  const semn = r.pachet.fisiere.get('pictograma.svg');
  assert.ok(semn);
  assert.deepEqual(semn, new Uint8Array(readFileSync('extensii/trenulet/pictograma.svg')));
  assert.ok(semn.length <= LIMITE_PACHET.octetiPictograma);
  const text = new TextDecoder().decode(semn);
  // Doar desen: fără scripturi, fără legături în afară, fără text (se vede și la 20 px).
  assert.doesNotMatch(text, /<script|href=|<text|<image|<foreignObject|style=/i);
  assert.match(text, /viewBox="0 0 64 64"/);
});
