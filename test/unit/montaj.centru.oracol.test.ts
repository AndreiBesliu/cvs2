/**
 * Centrul foii ca origine XY0 (ADR 0291 §6, felia 28.8↑o). A cincea alegere, lângă cele patru colțuri: tot o translație, cu
 * jumătatea foii pe fiecare axă (ADR 0008: o singură transformare, aplicată doar de post). Se probează pe hârtie și pe
 * oracole, nu pe cuvântul montajului:
 * - transformarea, pe hârtie, și colțurile de azi neschimbate;
 * - corpusul CAM: programul cu centrul e, rând cu rând, cel al colțului mutat cu (−L/2, −H/2) față de document, cu Z,
 *   avansurile și comentariile neatinse (afară de antet, care spune „origine centru”); I / J vin din startul deja rotunjit
 *   (strategia B a postului), deci pot diferi cu o unitate a ultimei zecimale: arcul văzut de GRBL îl judecă poarta;
 * - poarta (`test/oracles/poarta.ts`) și oracolul buzunarului judecă programele cu centrul citite din centru, cu aceleași
 *   verdicte ca pe colțul cazului; martorul: același program citit ca din stânga-jos e prins;
 * - antetul citit de sender (`montajDeclarat`), numele fișierelor (și al dopului) și rejucarea pe emulatorul GRBL.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORIGINI, transformareMontaj } from '../../src/ir/montaj.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import type { ParametriExport } from '../../src/jobs/protocolCam.ts';
import { numeFisierDop } from '../../src/jobs/calculCam.ts';
import { incarcaProgram, montajDeclarat } from '../../src/machine/program.ts';
import { EmulatorGrbl } from '../../src/machine/emulator.ts';
import { ruleazaFlux } from '../emulator/flux.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { ctxDoc } from './ajutor-degajari.ts';
import { laDocument, poarta } from '../oracles/poarta.ts';
import { masoaraCaile } from '../oracles/poarta-cale.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { CAZURI_POARTA_CALE } from '../oracles/poarta-cale.cazuri.ts';
import { citesteBuzunarele, judecaBuzunarele, type DocumentOracol } from '../oracles/buzunar.ts';
import type { DocV8O } from '../oracles/document.ts';
import type { Document } from '../../src/model/document.ts';

test('pe hârtie: centrul mută XY0 la jumătatea foii; colțurile rămân cum erau; lista are colțurile, apoi centrul', () => {
  const foaie = { latime: 600, inaltime: 400, grosime: 18 };
  assert.deepEqual(ORIGINI, ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus', 'centru']);
  assert.deepEqual(transformareMontaj({ foaie, origine: 'centru', z0: 'sus' }), { a: 1, b: 0, c: 0, d: 1, e: -300, f: -200, dz: 0 });
  assert.deepEqual(transformareMontaj({ foaie, origine: 'centru', z0: 'jos' }), { a: 1, b: 0, c: 0, d: 1, e: -300, f: -200, dz: 18 });
  const colt = (o: 'stanga-jos' | 'dreapta-jos' | 'dreapta-sus' | 'stanga-sus'): [number, number] => {
    const t = transformareMontaj({ foaie, origine: o, z0: 'sus' });
    return [t.e, t.f];
  };
  assert.deepEqual([colt('stanga-jos'), colt('dreapta-jos'), colt('dreapta-sus'), colt('stanga-sus')], [[0, 0], [-600, 0], [-600, -400], [0, -400]]);
  // O foaie cu zecimi: jumătatea e exactă în zecimalele programului.
  const t = transformareMontaj({ foaie: { latime: 1220.5, inaltime: 2440.3, grosime: 18 }, origine: 'centru', z0: 'sus' });
  assert.equal(t.e, -610.25);
  assert.ok(Math.abs(t.f + 1220.15) < 1e-9, String(t.f));
});

/** Unde stă XY0 în document, pe hârtie, pentru originea `o` a foii L × H. */
function xy0(o: ParametriExport['origine'], L: number, H: number): [number, number] {
  if (o === 'centru') return [L / 2, H / 2];
  return [o === 'dreapta-jos' || o === 'dreapta-sus' ? L : 0, o === 'dreapta-sus' || o === 'stanga-sus' ? H : 0];
}

const CUVANT = /([XYIJ])(-?\d+(?:\.\d+)?)/g;

/**
 * Compară rând cu rând programul cu centrul cu cel al originii `p`: fără cuvintele X / Y, rândurile sunt egale (afară de
 * antet), iar X / Y din centru = X / Y din `p` + XY0(p) − XY0(centru), în unitățile programului, la o unitate a ultimei
 * zecimale (ambele sunt rotunjite separat); I / J, la fel de aproape de cele din `p`. Întoarce câte cuvinte X / Y s-au comparat.
 */
function comparaCuCentrul(textP: string, textC: string, p: ParametriExport, L: number, H: number, cine: string): number {
  const inch = p.unitati === 'inch', s = inch ? 1 / 25.4 : 1, tol = inch ? 1.1e-5 : 1.1e-3;
  const [px, py] = xy0(p.origine, L, H), [cx, cy] = xy0('centru', L, H);
  const dx = (px - cx) * s, dy = (py - cy) * s;
  const a = textP.split('\n'), b = textC.split('\n');
  assert.equal(b.length, a.length, `${cine}: alt număr de rânduri`);
  let n = 0, antet = 0;
  for (let i = 0; i < a.length; i++) {
    const la = a[i]!, lb = b[i]!;
    if (la.includes(`(origine ${p.origine}, Z0 `)) {
      antet++;
      assert.equal(lb, la.replace(`(origine ${p.origine}, `, '(origine centru, '), `${cine}: antetul`);
      continue;
    }
    assert.equal(lb.replace(CUVANT, '$1'), la.replace(CUVANT, '$1'), `${cine}: rândul ${i + 1} diferă și în afara lui X / Y`);
    const wa = [...la.matchAll(CUVANT)], wb = [...lb.matchAll(CUVANT)];
    wa.forEach((m, k) => {
      const ax = m[1]!, va = Number(m[2]), vb = Number(wb[k]![2]);
      if (ax === 'I' || ax === 'J') { assert.ok(Math.abs(vb - va) <= tol, `${cine}: ${ax} pe rândul ${i + 1}: ${vb}, în colț ${va}`); return; }
      const asteptat = va + (ax === 'X' ? dx : dy);
      assert.ok(Math.abs(vb - asteptat) <= tol, `${cine}: ${ax} pe rândul ${i + 1}: ${vb}, pe hârtie ${asteptat}`);
      n++;
    });
  }
  assert.equal(antet, 1, `${cine}: antetul cu originea, o dată`);
  return n;
}

test('corpusul CAM: cu centrul, fiecare fișier e cel al colțului mutat cu jumătatea foii; I / J, Z și restul, neatinse', async () => {
  let cuvinte = 0, fisiere = 0;
  for (const caz of CORPUS_CAM) {
    const { latime: L, inaltime: H } = caz.doc.foi[0]!.stoc;
    for (const [k, p] of caz.parametri.entries()) {
      const cine = `${caz.id}[${k}]`;
      const rp = await calculeazaExport(caz.doc, p), rc = await calculeazaExport(caz.doc, { ...p, origine: 'centru' });
      assert.equal(rc.ok, rp.ok, `${cine}: centrul ${rc.ok ? 'exportă' : 'refuză'}, colțul nu`);
      if (!rp.ok || !rc.ok) continue;
      assert.equal(rc.fisiere.length, rp.fisiere.length, `${cine}: alt număr de fișiere`);
      rp.fisiere.forEach((f, i) => {
        const g = rc.fisiere[i]!;
        assert.equal(g.nume, f.nume.replace(`cncvs2-${p.origine}`, 'cncvs2-centru'), `${cine}: numele fișierului ${i + 1}`);
        cuvinte += comparaCuCentrul(f.text, g.text, p, L, H, `${cine}/${f.nume}`);
        fisiere++;
      });
    }
  }
  assert.ok(fisiere >= 15 && cuvinte >= 10_000, `doar ${fisiere} fișiere, ${cuvinte} cuvinte X / Y comparate`);
});

test('poarta: programele căilor cu centrul, citite din centru, au verdictele colțului; citite din stânga-jos, sunt prinse', async () => {
  let judecate = 0, martori = 0;
  for (const caz of CAZURI_POARTA_CALE) {
    if (caz.atingere || caz.departe) continue;
    const centru = { origine: 'centru' as const, z0: caz.montaj.z0 };
    const [rp, rc] = [await programulAplicatiei(caz.doc, caz.montaj), await programulAplicatiei(caz.doc, centru)];
    if (!rp.ok || !rc.ok) { assert.equal(rc.ok, rp.ok, `${caz.nume}: centrul și colțul nu decid la fel`); continue; }
    const doc = caz.doc as unknown as DocV8O, cp = ctxDoc(doc, caz.montaj), cc = ctxDoc(doc, centru);
    const verdict = (text: string, ctx: typeof cp): string[] => poarta(text, ctx).map((i) => `[${i.invarianta}] ${i.linia}`);
    assert.deepEqual(verdict(rc.text, cc), verdict(rp.text, cp), `${caz.nume}: poarta judecă altfel programul cu centrul`);
    const reg = regiuneDinDocument(caz.doc), R = caz.D / 2;
    const rele = (text: string, ctx: typeof cp): string[] => masoaraCaile(text, caz.doc, reg, R, (q) => laDocument(q, ctx)).flatMap((m) => m.rele);
    assert.deepEqual(rele(rc.text, cc), rele(rp.text, cp), `${caz.nume}: abaterea căilor, altfel cu centrul`);
    judecate++;
    // Martorul: același program, citit ca și cum XY0 ar fi în stânga-jos, iese din piesă.
    if (poarta(rc.text, ctxDoc(doc, { origine: 'stanga-jos', z0: caz.montaj.z0 })).length > 0) martori++;
  }
  assert.ok(judecate >= 10, `doar ${judecate} cazuri judecate`);
  assert.equal(martori, judecate, 'un program cu centrul, citit din stânga-jos, a trecut poarta');
});

test('buzunarele: oracolul, cu montajul centrului, nu găsește nimic; citit din stânga-jos, găsește', async () => {
  const oracol = (d: Document): DocumentOracol => d as unknown as DocumentOracol;
  let judecate = 0;
  for (const caz of CORPUS_CAM) {
    if (citesteBuzunarele(oracol(caz.doc)).bucati.length === 0) continue;
    const p = caz.parametri[0]!;
    const r = await calculeazaExport(caz.doc, { ...p, origine: 'centru' });
    if (!r.ok) continue;
    const program = r.fisiere.map((f) => f.text);
    const v = judecaBuzunarele({ document: oracol(caz.doc), program, montaj: { origine: 'centru', z0: p.z0 } });
    assert.deepEqual(v.refuz, [], `${caz.id}: oracolul refuză`);
    assert.deepEqual(v.probleme.map((x) => `${x.fel} ${x.buzunar}: ${x.mesaj}`), [], `${caz.id}: problemele oracolului`);
    const martor = judecaBuzunarele({ document: oracol(caz.doc), program, montaj: { origine: 'stanga-jos', z0: p.z0 } });
    assert.ok(martor.probleme.length > 0, `${caz.id}: citit din stânga-jos, programul cu centrul a trecut`);
    judecate++;
  }
  assert.ok(judecate >= 4, `doar ${judecate} documente cu buzunare judecate`);
});

test('antetul spune „origine centru”, senderul îl citește, numele fișierelor și ale dopului îl poartă, emulatorul îl rulează', async () => {
  const caz = CORPUS_CAM.find((c) => c.id === 'placa-01')!;
  const r = await calculeazaExport(caz.doc, { origine: 'centru', z0: 'sus' });
  assert.ok(r.ok);
  if (!r.ok) return;
  const f = r.fisiere[0]!;
  assert.equal(f.nume, 'cncvs2-centru.nc');
  assert.match(f.text, /^\(origine centru, Z0 sus, foaia 300\.000 x 200\.000 x 18\.000 mm\)$/m);
  const inc = await incarcaProgram(new TextEncoder().encode(f.text), { sursa: 'export' });
  assert.ok(inc.ok);
  if (!inc.ok) return;
  assert.deepEqual(montajDeclarat(inc.program), { origine: 'centru', z0: 'sus' });
  // Dopurile pornesc de la același nume, cu `-dop-<N>` după centru (pe sculă, înaintea ordinii).
  assert.equal(numeFisierDop('cncvs2-centru.nc', 0, false), 'cncvs2-centru-dop-1.nc');
  assert.equal(numeFisierDop('cncvs2-centru-2-T3.nc', 1, false), 'cncvs2-centru-dop-2-2-T3.nc');
  assert.equal(numeFisierDop('cncvs2-stanga-jos-2-T3.nc', 0, false), 'cncvs2-stanga-jos-dop-1-2-T3.nc');
  // Coordonatele negative (jumătatea din stânga și cea de jos) trec prin sender și prin GRBL ca oricare altele.
  assert.match(f.text, /X-\d/);
  assert.match(f.text, /Y-\d/);
  const l = f.text.slice(0, -1).split('\n');
  const e = new EmulatorGrbl();
  const flux = ruleazaFlux(l, e, { pasMs: 5 });
  assert.equal(flux.blocat, false);
  assert.deepEqual(flux.erori, []);
  assert.equal(flux.ok, l.length);
  assert.equal(e.contoare.pierduti, 0);
});
