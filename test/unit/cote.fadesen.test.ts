/**
 * „Fă desen din cotă” (ADR 0330 §8, felia 10.4↑d-2): desenul unei cote, ca forme obișnuite pe foaie, pe hârtie; comanda (o
 * piesă nouă, fără operații, unde era cota; cota rămâne sau pleacă, în același pas); și proba programului: cota nu ajunge
 * niciodată în program, desenul fără rol nici el, iar desenul cu un rol se taie, exact pe liniile cotei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './limbi.ts';
import type { Contur } from '../../src/geom/conturBaza.ts';
import { geometrieCota } from '../../src/io/coteExport.ts';
import { calculeazaExportul } from '../../src/jobs/calculCam.ts';
import type { ParametriExport } from '../../src/jobs/protocolCam.ts';
import { formatImplicit, STIL_IMPLICIT } from '../../src/model/desenCota.ts';
import { operatieImplicita, type Cota, type Document, type FormaDoc } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou } from '../../src/model/jurnal.ts';
import { cifreDinFont } from '../../src/text/cifreCote.ts';
import { citesteFont } from '../../src/text/font.ts';
import { comandaDesenCota } from '../../src/ui/actiuniDocumentCalcul.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';

const r = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/relief-singleline.ttf', import.meta.url))));
if (!r.ok) throw new Error('fontul cifrelor');
const CIFRE = cifreDinFont(r.font);
const OPT = { stil: STIL_IMPLICIT, format: formatImplicit(true), cifre: CIFRE };

/** Placa 1 a corpusului CAM (dreptunghiul 100 × 60 din (20, 20) și cercul R15), cu o orizontală liberă (20, 20) → (120, 20), d = −10. */
const caz = CORPUS_CAM.find((c) => c.id === 'placa-01');
if (!caz) throw new Error('placa 1');
const COTA: Cota = { id: 'c1', fel: 'orizontala', puncte: [{ x: 20, y: 20 }, { x: 120, y: 20 }], linie: { d: -10 } };
function cuCota(doc: Document, cota: Cota = COTA): Document {
  const brut = JSON.parse(JSON.stringify(doc)) as { foi: Record<string, unknown>[] };
  brut.foi = brut.foi.map((f, k) => (k === 0 ? { ...f, cote: [cota] } : f));
  const u = incarca(brut);
  assert.ok(u.ok, u.ok ? '' : u.motiv);
  return u.doc;
}
const rot = (v: number): number => Math.round(v * 1e6) / 1e6;
const varfuri = (k: Contur): { x: number; y: number }[] => k.varfuri.map((v) => ({ x: rot(v.p.x), y: rot(v.p.y) }));
const forme = (g: { readonly contururi: readonly Contur[] }): FormaDoc[] =>
  g.contururi.map((k) => ({ tip: 'cale', inchis: k.inchis, varfuri: k.varfuri.map((v) => structuredClone(v)) }));

test('desenul orizontalei (20, 20) → (120, 20), d = −10, stilul implicit: extensiile, linia, săgețile, apoi cifrele „100”', () => {
  const g = geometrieCota(cuCota(caz.doc), 0, 'c1', OPT);
  assert.ok(g);
  const [e1, e2, l, s1, s2, ...cifre] = g.contururi as [Contur, Contur, Contur, Contur, Contur, ...Contur[]];
  // Linia la y = 20 − 10 = 10; extensiile de la golul 1 (y = 19) până la 2 dincolo de linie (y = 8).
  assert.deepEqual([e1, e2, l].map((k) => [k.inchis, varfuri(k)]), [
    [false, [{ x: 20, y: 19 }, { x: 20, y: 8 }]],
    [false, [{ x: 120, y: 19 }, { x: 120, y: 8 }]],
    [false, [{ x: 20, y: 10 }, { x: 120, y: 10 }]],
  ]);
  // Săgețile pline, înăuntru, lungi de 2,5 și late de 2,5 / 3: triunghiuri închise.
  const w = rot(2.5 / 6);
  assert.deepEqual([s1, s2].map((k) => [k.inchis, varfuri(k)]), [
    [true, [{ x: 20, y: 10 }, { x: 22.5, y: rot(10 + w) }, { x: 22.5, y: rot(10 - w) }]],
    [true, [{ x: 120, y: 10 }, { x: 117.5, y: rot(10 - w) }, { x: 117.5, y: rot(10 + w) }]],
  ]);
  // Cifrele: trăsăturile lui „100”, deasupra liniei (y între 10 și 10 + 3,5 + o margine), în jurul mijlocului (x ≈ 70).
  assert.ok(cifre.length >= 3, `trăsăturile cifrelor: ${cifre.length}`);
  for (const k of cifre) for (const p of varfuri(k)) {
    assert.ok(p.y > 10 && p.y < 10 + 3.5 + 1.5, `y ${p.y}`);
    assert.ok(Math.abs(p.x - 70) < 6, `x ${p.x}`);
  }
  assert.deepEqual(g.lipsa, []);
  // Fără fontul cifrelor: doar liniile și capetele, cu semnele spuse lipsă.
  const fara = geometrieCota(cuCota(caz.doc), 0, 'c1', { stil: STIL_IMPLICIT, format: formatImplicit(true) });
  assert.equal(fara?.contururi.length, 5);
  assert.deepEqual(fara?.lipsa, ['1', '0']);
  // O cotă lipsă sau cu un fel necunoscut: nimic.
  assert.equal(geometrieCota(cuCota(caz.doc), 0, 'c9', OPT), null);
});

test('punctul ca capăt devine un cerc închis; bara oblică, o trăsătură', () => {
  const punct = geometrieCota(cuCota(caz.doc), 0, 'c1', { ...OPT, stil: { ...STIL_IMPLICIT, capete: 'punct' } });
  const cerc = punct?.contururi[3];
  assert.ok(cerc?.inchis);
  assert.deepEqual(cerc.varfuri.map((v) => v.s), [{ tip: 'A', bulge: 1 }, { tip: 'A', bulge: 1 }]);
  // Punctul din piciorul stâng (20, 10), cu raza un sfert din capăt (2,5 / 4): vârfurile cercului la 20 ∓ 0,625.
  assert.deepEqual(varfuri(cerc), [{ x: 19.375, y: 10 }, { x: 20.625, y: 10 }]);
  const bara = geometrieCota(cuCota(caz.doc), 0, 'c1', { ...OPT, stil: { ...STIL_IMPLICIT, capete: 'oblica' } });
  assert.equal(bara?.contururi[3]?.inchis, false);
});

test('comanda: o piesă nouă, fără operații, în colțul foii; cota rămâne, sau pleacă în același pas („Șterge cota”)', () => {
  const doc = cuCota(caz.doc);
  const g = geometrieCota(doc, 0, 'c1', OPT);
  assert.ok(g);
  const f = forme(g);
  const r1 = comandaDesenCota(doc, f, null, doc.foi[0]?.id);
  assert.ok(r1.ok);
  const h = executa(istoricNou(doc), r1.comanda);
  const p = h.doc.piese.find((x) => x.id === r1.id);
  assert.ok(p);
  assert.deepEqual(p.operatii, []);
  assert.equal(p.radacina.tip, 'grup');
  assert.equal(p.radacina.tip === 'grup' ? p.radacina.copii.length : 0, f.length);
  assert.deepEqual(h.doc.foi[0]?.instante.at(-1), { id: r1.id, piesa: r1.id, x: 0, y: 0, rotire: 0 });
  assert.equal(h.doc.foi[0]?.cote?.length, 1);
  // Cu „Șterge cota”: cota pleacă, în același pas; o anulare le întoarce pe amândouă.
  const r2 = comandaDesenCota(doc, f, [], doc.foi[0]?.id);
  assert.ok(r2.ok);
  const h2 = executa(istoricNou(doc), r2.comanda);
  assert.equal(h2.doc.foi[0]?.cote, undefined);
  assert.equal(h2.doc.piese.length, doc.piese.length + 1);
  // (Revizia crește la fiecare pas, și la anulare: restul documentului e cel de dinainte.)
  const inapoi = anuleaza(h2).doc;
  assert.deepEqual({ piese: inapoi.piese, foi: inapoi.foi }, { piese: doc.piese, foi: doc.foi });
  // Nicio formă: refuzată.
  assert.deepEqual(comandaDesenCota(doc, [], null), { ok: false, motiv: 'motiv.nimic-ales' });
});

const octeti = (v: ArrayBufferView): string => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64');
async function exportul(doc: Document, p: ParametriExport): Promise<{ readonly text: string; readonly fisiere: readonly string[] }> {
  const e = await calculeazaExportul(doc, p);
  assert.ok(e.ok, e.ok ? '' : JSON.stringify(e));
  return { text: e.program.text, fisiere: e.fisiere.map((x) => `${x.nume} ${x.sha256} ${octeti(x.octeti)}`) };
}

test('programul: cota nu se taie, desenul ei fără rol nici el; cu rolul „pe linie”, se taie, exact pe linia cotei (Y10, X20 → X120)', async () => {
  const p = caz.parametri[0]!;
  const fara = await exportul(caz.doc, p);
  const doc = cuCota(caz.doc);
  assert.deepEqual(await exportul(doc, p), fara, 'cota');
  const g = geometrieCota(doc, 0, 'c1', OPT);
  assert.ok(g);
  const r1 = comandaDesenCota(doc, forme(g), null, doc.foi[0]?.id);
  assert.ok(r1.ok);
  const desen = executa(istoricNou(doc), r1.comanda).doc;
  assert.deepEqual(await exportul(desen, p), fara, 'desenul fără rol');
  // Cu o operație pe linie pe toate elementele desenului, ca rolul „gravură pe linie” din panou.
  const piesa = desen.piese.find((x) => x.id === r1.id)!;
  const noduri = piesa.radacina.tip === 'grup' ? piesa.radacina.copii.map((c) => c.id) : [piesa.radacina.id];
  const op = { ...operatieImplicita('gravura', forme(g)[0]!), noduri, latura: 'pe-linie' as const, adancime: 0.5, pas: 0.5 };
  const cuRol = { ...desen, piese: desen.piese.map((x) => (x.id === r1.id ? { ...x, operatii: [op] } : x)) };
  const u = incarca(JSON.parse(JSON.stringify(cuRol)));
  assert.ok(u.ok, u.ok ? '' : u.motiv);
  const taiat = await exportul(u.doc, p);
  assert.notDeepEqual(taiat, fara);
  // Linia de cotă, tăiată: o mișcare de lucru pe Y = 10, de la X = 20 la X = 120 (sau invers).
  const linii = taiat.text.split('\n');
  const peLinie = linii.filter((x) => /^G1\b/.test(x) && /Y10(\.0+)?\b/.test(x) && (/X120(\.0+)?\b/.test(x) || /X20(\.0+)?\b/.test(x)));
  assert.ok(peLinie.length >= 1, 'o mișcare pe linia cotei');
});
