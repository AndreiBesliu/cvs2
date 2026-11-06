/**
 * Formele între desen și extensii (ADR 0166), partea lui cvs2, fără browser:
 * - `formeSelectie`: contururile instanțelor alese, în mm ai foii, pe corpusul exportului 2D (`scripts/export2d-corpus.ts`,
 *   cu valorile pe hârtie din descrierea lui): cercul R5 al instanței rotite (centrul (580, 30)), piesa B oglindită (dreptunghiul
 *   în x 520–560, cercul R3 în (540, 380)), cutia; arcele aproximate la cel mult 0,02 mm; calea deschisă rămâne deschisă;
 *   refuzurile `nimic` și `prea-mare`;
 * - `servesteFormele`: permisiunea, metoda, numele (doar SVG și DXF), datele, plafonul importului, refuzul aplicației și
 *   fișierul dat ferestrei Importă, cu numele extensiei;
 * - acțiunea „Trimite la <extensie>”: motivele ei și rularea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { CORPUS } from '../../scripts/export2d-corpus.ts';
import { formeSelectie, puncteContur, TOLERANTA_FORME } from '../../src/extensii/formeSelectie.ts';
import { servesteFormele, type PropuneForme } from '../../src/extensii/forme.ts';
import { PLAFON_IMPORT } from '../../src/io/svgCoduri.ts';
import { conturCerc } from '../../src/geom/conturBaza.ts';
import { ACTIUNI_EXTENSII, type ContextExtensii } from '../../src/ui/actiuniExtensii.ts';
import type { ConturCvs2 } from '../../extensii/api.ts';

const corpus = () => {
  const r = incarca(structuredClone(CORPUS));
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const dist = (p: readonly [number, number], c: readonly [number, number]): number => Math.hypot(p[0] - c[0], p[1] - c[1]);

test('selecția B și C: trei contururi închise, în mm ai foii; cutia lor (520, 0)–(585, 383)', () => {
  const f = formeSelectie(corpus(), ['ib', 'ic']);
  assert.ok(f.ok);
  if (!f.ok) return;
  assert.equal(f.versiune, 1);
  assert.equal(f.unitate, 'mm');
  assert.equal(f.contururi.length, 3);
  assert.ok(f.contururi.every((c) => c.inchis));
  assert.deepEqual(f.cutie, { x0: 520, y0: 0, x1: 585, y1: 383 });
  // cercul R5 al instanței rotite 90° în (580, 20): centrul (580, 30); cercul R3 al piesei oglindite: (540, 380)
  for (const [centru, r] of [[[580, 30], 5], [[540, 380], 3]] as const) {
    const c: ConturCvs2 | undefined = f.contururi.find((x) => x.puncte.every((q) => Math.abs(dist(q, centru) - r) < 1e-3));
    assert.ok(c, `cercul R${r} din (${centru.join(', ')})`);
  }
});

test('aproximarea: fiecare punct pe cerc, fiecare coardă la cel mult 0,02 mm de arc; R5 = 36 de puncte, primul nerepetat', () => {
  const p = puncteContur(conturCerc(0, 0, 5));
  // săgeata unui pas de π/18 pe R5: 5 · (1 − cos(π / 36)) = 0,019 mm ≤ 0,02
  assert.equal(p.length, 36);
  assert.notDeepEqual(p[0], p[p.length - 1]);
  for (let i = 0; i < p.length; i++) {
    const a: readonly [number, number] = p[i]!, b: readonly [number, number] = p[(i + 1) % p.length]!;
    assert.ok(Math.abs(Math.hypot(a[0], a[1]) - 5) < 1e-3);
    const m: readonly [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    assert.ok(5 - Math.hypot(m[0], m[1]) <= TOLERANTA_FORME + 1e-9, `săgeata coardei ${i}`);
  }
});

test('piesa A: calea deschisă `s` rămâne deschisă, de la (300, 50) la (500, 50); semicercul trece prin (475, 25)', () => {
  const f = formeSelectie(corpus(), ['ia']);
  assert.ok(f.ok);
  if (!f.ok) return;
  const s = f.contururi.find((c) => !c.inchis);
  assert.ok(s);
  if (!s) return;
  assert.deepEqual(s.puncte[0], [300, 50]);
  assert.deepEqual(s.puncte[s.puncte.length - 1], [500, 50]);
  assert.ok(s.puncte.some((q) => dist(q, [475, 25]) < 1e-3), 'punctul de jos al semicercului');
  // pe semicerc (după (450, 50)), fiecare punct e la R25 de centrul (475, 50)
  assert.ok(s.puncte.filter((q) => q[0] > 450).every((q) => Math.abs(dist(q, [475, 50]) - 25) < 1e-3));
});

test('refuzurile: nimic ales (sau o instanță care nu e pe foaie) = nimic; peste plafoane = prea-mare', () => {
  assert.deepEqual(formeSelectie(corpus(), []), { versiune: 1, ok: false, motiv: 'nimic' });
  assert.deepEqual(formeSelectie(corpus(), ['nu-exista']), { versiune: 1, ok: false, motiv: 'nimic' });
  assert.deepEqual(formeSelectie(corpus(), ['ib', 'ic'], 0, { contururi: 2, puncte: 1e6 }), { versiune: 1, ok: false, motiv: 'prea-mare' });
  assert.deepEqual(formeSelectie(corpus(), ['ib', 'ic'], 0, { contururi: 100, puncte: 40 }), { versiune: 1, ok: false, motiv: 'prea-mare' });
  assert.ok(formeSelectie(corpus(), ['ib', 'ic'], 0, { contururi: 3, puncte: 1e6 }).ok);
});

test('forme.propune: permisiunea, metoda, numele (SVG, DXF), datele, plafonul importului, refuzul aplicației', () => {
  const primite: Array<[string, string, string]> = [];
  const bun: PropuneForme = (f, de) => { primite.push([f.name, f.type, de]); return null; };
  const P = ['forme'];
  assert.deepEqual(servesteFormele([], 'Salut', 'propune', ['a.svg', '<svg/>'], bun), { ok: false, eroare: 'forme:permisiune' });
  assert.deepEqual(servesteFormele(P, 'Salut', 'citeste', [], bun), { ok: false, eroare: 'forme:necunoscut' });
  for (const nume of ['a.exe', 'a.stl', 'fara-tip', '', 42]) assert.deepEqual(servesteFormele(P, 'Salut', 'propune', [nume, 'x'], bun), { ok: false, eroare: 'forme:nume' }, String(nume));
  assert.deepEqual(servesteFormele(P, 'Salut', 'propune', ['a.svg', 42], bun), { ok: false, eroare: 'forme:date' });
  assert.deepEqual(servesteFormele(P, 'Salut', 'propune', ['a.dxf', new Uint8Array(PLAFON_IMPORT.octeti + 1)], bun), { ok: false, eroare: 'forme:prea-mare' });
  assert.deepEqual(servesteFormele(P, 'Salut', 'propune', ['a.svg', '<svg/>'], () => 'ocupat'), { ok: false, eroare: 'forme:ocupat' });
  assert.deepEqual(servesteFormele(P, 'Salut', 'propune', ['a.svg', '<svg/>'], () => 'doar-citire'), { ok: false, eroare: 'forme:doar-citire' });
  assert.equal(primite.length, 0);
  assert.deepEqual(servesteFormele(P, 'Salut', 'propune', ['placi/placa_1.DXF', '0\nEOF\n'], bun), { ok: true, rezultat: 'deschis' });
  assert.deepEqual(servesteFormele(P, 'Salut', 'propune', ['cerc.svg', new Uint8Array([60, 115, 118, 103, 47, 62])], bun), { ok: true, rezultat: 'deschis' });
  // numele curățat ca la descărcări (ultima parte a căii), tipul după extensie, numele extensiei pentru „Propus de”
  assert.deepEqual(primite, [['placa_1.DXF', 'application/dxf', 'Salut'], ['cerc.svg', 'image/svg+xml', 'Salut']]);
});

test('forme.propune: fișierul dat ferestrei Importă are chiar datele trimise', async () => {
  let fisier: File | null = null;
  servesteFormele(['forme'], 'Salut', 'propune', ['f.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'], (f) => { fisier = f; return null; });
  assert.ok(fisier);
  assert.equal(await (fisier as File).text(), '<svg xmlns="http://www.w3.org/2000/svg"/>');
});

test('„Trimite la <extensie>”: fără extensie care primește forme, apoi fără selecție, motivul; altfel trimite', () => {
  const a = ACTIUNI_EXTENSII.find((x) => x.id === 'extensii.trimite-selectia');
  assert.ok(a);
  if (!a) return;
  let trimise = 0;
  const ctx = (ext: boolean, sel: readonly string[]): ContextExtensii => ({
    extensieForme: () => (ext ? { nume: 'Salut' } : null), selectie: () => sel, trimiteSelectia: () => { trimise++; },
  });
  assert.equal(a.activa(ctx(false, ['ia'])), 'motiv.fara-extensie-forme');
  assert.equal(a.activa(ctx(true, [])), 'motiv.nimic-ales');
  assert.equal(a.activa(ctx(true, ['ia'])), true);
  a.ruleaza(ctx(true, ['ia']));
  assert.equal(trimise, 1);
});
