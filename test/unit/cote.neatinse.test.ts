/**
 * Cotele nu se taie (ADR 0330 §8), proba scrisă prima: pe tot corpusul CAM (`ajutor-corpus-cam.ts`: plăcile 1 și 2 și câte un
 * document pe fiecare fel de lucrare) și pe placa 11 (mai multe foi, „Toate foile”), fiecare foaie primește cote de fiecare fel:
 * legate de forme (vârf, mijloc, centru, cadran, cutie), dezlegate (instanța lipsă), una cu un fel necunoscut (a unei versiuni
 * mai noi). Documentul trece de ușă, iar exportul, traseul, verificarea vectorilor și raportul foilor ies exact ca fără cote:
 * aceiași octeți, aceeași amprentă SHA-256, aceleași avertismente.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { numarSegmente } from '../../src/geom/conturBaza.ts';
import { calculeazaExportul, calculeazaTraseul } from '../../src/jobs/calculCam.ts';
import type { ParametriExport } from '../../src/jobs/protocolCam.ts';
import type { Document } from '../../src/model/document.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { chenarElement } from '../../src/model/forme.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { raportFoi } from '../../src/model/raportFoi.ts';
import { verificaVectorii } from '../../src/model/verificare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { documentPlaca11, PARAMETRI } from '../placi/placa-11/genereaza.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';

type Rec = Record<string, unknown>;

/** Cotele unei foi, de fiecare fel, legate de primele ei forme (dacă are), plus una dezlegată și una dintr-o versiune mai nouă. */
function coteFoaie(doc: Document, k: number): Rec[] {
  const el = elementeFoaie(doc, k);
  const leg = (i: number, loc: Rec): Rec | undefined => {
    const e = el[i % Math.max(1, el.length)];
    return e ? { instanta: e.instanta, nod: e.nod, loc, n: numarSegmente(chenarElement(e)) } : undefined;
  };
  const anc = (x: number, y: number, legatura?: Rec): Rec => (legatura ? { x, y, legatura } : { x, y });
  return [
    { id: 'c-or', fel: 'orizontala', puncte: [anc(0, 0, leg(0, { fel: 'varf', k: 0 })), anc(40, 0, leg(0, { fel: 'varf', k: 1 }))], linie: { d: 10 } },
    { id: 'c-ve', fel: 'verticala', puncte: [anc(0, 0, leg(0, { fel: 'cutie', i: 0 })), anc(0, 30, leg(0, { fel: 'cutie', i: 6 }))], linie: { d: -12 } },
    { id: 'c-al', fel: 'aliniata', puncte: [anc(1, 2, leg(1, { fel: 'mijloc', k: 0 })), anc(31, 42, leg(1, { fel: 'cutie', i: 8 }))], linie: { d: 5 }, text: '2× <>' },
    { id: 'c-ra', fel: 'raza', puncte: [anc(50, 50, leg(2, { fel: 'centru', k: 0 })), anc(60, 50, leg(2, { fel: 'cadran', k: 0, q: 1 }))], linie: { d: 8 } },
    { id: 'c-di', fel: 'diametru', puncte: [anc(50, 50), anc(60, 50)], linie: { d: -3 } },
    { id: 'c-un', fel: 'unghi', puncte: [anc(10, 10), anc(40, 10), anc(30, 40)], linie: { d: 15 } },
    { id: 'c-u4', fel: 'unghi', puncte: [anc(0, 0), anc(10, 0), anc(0, 5), anc(10, 15)], linie: { d: 6, s1: -1 } },
    { id: 'c-dz', fel: 'orizontala', puncte: [anc(5, 5, { instanta: 'disparuta', nod: 'x', loc: { fel: 'varf', k: 3 }, n: 4 }), anc(25, 5)], linie: { d: 4 } },
    { id: 'c-nou', fel: 'toleranta-din-viitor', ceva: [1, 2, 3] },
  ];
}

/** Documentul cu cote pe fiecare foaie, trecut prin ușă (ca un proiect salvat și redeschis). */
function cuCote(doc: Document): Document {
  const brut = JSON.parse(JSON.stringify(doc)) as Rec & { foi: Rec[] };
  brut.foi = brut.foi.map((f, k) => ({ ...f, cote: coteFoaie(doc, k) }));
  const r = incarca(brut);
  assert.ok(r.ok, `ușa refuză documentul cu cote: ${r.ok ? '' : r.motiv}`);
  return r.doc;
}

const octeti = (v: ArrayBufferView): string => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64');

async function exportul(doc: Document, p0: ParametriExport): Promise<unknown> {
  let p = p0;
  let r = await calculeazaExportul(doc, p);
  if (!r.ok && 'cereConfirmare' in r) {
    p = { ...p, confirmareIesire: r.cereConfirmare };
    r = await calculeazaExportul(doc, p);
  }
  if (!r.ok) return { ok: false, motiv: r.motiv };
  return {
    text: r.program.text, sha: r.program.sha256, avertismente: r.avertismente,
    fisiere: r.fisiere.map((f) => ({ nume: f.nume, sha: f.sha256, octeti: octeti(f.octeti) })),
  };
}

test('corpusul CAM: exportul, octet cu octet, cu și fără cote, pe fiecare post, unitate și strategie', async () => {
  let fisiere = 0;
  for (const c of CORPUS_CAM) {
    const d = cuCote(c.doc);
    assert.ok(d.foi.every((f) => Array.isArray(f['cote']) && (f['cote'] as unknown[]).length === 9), `${c.id}: cotele au rămas pe foi`);
    for (const p of c.parametri) {
      const fara = await exportul(c.doc, p);
      const cu = await exportul(d, p);
      assert.deepEqual(cu, fara, `${c.id} ${JSON.stringify(p)}`);
      fisiere++;
    }
  }
  assert.ok(fisiere >= CORPUS_CAM.length, 'fiecare caz a fost exportat');
});

test('corpusul CAM: traseul, verificarea vectorilor și raportul foilor, la fel cu și fără cote', () => {
  const sablon = (n: number): string => `Foaia ${n}`;
  for (const c of CORPUS_CAM) {
    const d = cuCote(c.doc);
    assert.deepEqual(calculeazaTraseul(d), calculeazaTraseul(c.doc), `${c.id}: traseul`);
    for (let k = 0; k < c.doc.foi.length; k++) {
      const o = { toleranta: 0.01, alese: null };
      assert.deepEqual(verificaVectorii(d, o, k), verificaVectorii(c.doc, o, k), `${c.id}: verificarea foii ${k}`);
    }
    for (const fel of ['taiata', 'desen'] as const) assert.deepEqual(raportFoi(d, fel, sablon), raportFoi(c.doc, fel, sablon), `${c.id}: raportul (${fel})`);
  }
});

test('placa 11 („Toate foile”, plăcuțele din CSV): arhiva exportului, octet cu octet, cu și fără cote', async () => {
  const d = documentPlaca11();
  const dc = cuCote(d);
  assert.ok(dc.foi.length > 1, 'placa are mai multe foi');
  const exp = async (doc: Document): Promise<unknown> => {
    const r = await calculeazaExport(doarFoaia(doc, doc.foi[0]?.id), { ...PARAMETRI }, undefined, doc);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    return r.ok ? r.fisiere.map((f) => ({ nume: f.nume, sha: f.sha256 })) : null;
  };
  assert.deepEqual(await exp(dc), await exp(d));
});
