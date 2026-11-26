/**
 * Z-ul sigur și parcarea de la final (ADR 0291 §3, 3a; felia 28.8↑p): două setări ale aplicației din „Mașina și fișierul”,
 * trimise exportului ca supracursa. Mișcă mașina, deci se probează pe hârtie și pe oracole, nu pe cuvântul postului:
 * - fără ele (sau cu Z-ul sigur implicit, 5 mm), programul de azi, octet cu octet, pe tot corpusul CAM;
 * - Z-ul sigur schimbă doar cuvântul Z al rapidelor de deasupra foii: fiecare rând e cel de azi, cu Z-ul vechi înlocuit, pe
 *   toate posturile, în mm și în inch, cu Z0 sus și jos;
 * - parcarea e o singură linie, `G0 X Y` în coordonatele programului, după `M5` (freza se oprește sus, apoi pleacă), înaintea
 *   liniilor de final ale controlerului; în fiecare fișier (pe freză, ale dopurilor);
 * - poarta (`test/oracles/poarta.ts`) judecă programele cu Z-ul sigur nou și cu parcarea cu verdictele de azi; martorul: o
 *   parcare coborâtă sub fața foii e prinsă;
 * - oracolul simulării (`test/oracles/simulare.ts`): aceeași suprafață tăiată, celulă cu celulă;
 * - senderul încarcă programul, iar emulatorul GRBL îl rulează fără pierderi și se oprește în punctul de parcare;
 * - marginile: Z-ul sigur între 1 și 100 mm, parcarea cel mult 10 000 mm pe fiecare axă; altfel, refuzul cu motivul.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import type { ParametriExport } from '../../src/jobs/protocolCam.ts';
import { CONTRACTE, ID_CONTRACTE } from '../../src/post/contracte/index.ts';
import { PARCARE_MAXIMA, Z_SIGUR_IMPLICIT, Z_SIGUR_MAXIM, Z_SIGUR_MINIM } from '../../src/cam/regimExport.ts';
import { incarcaProgram, montajDeclarat } from '../../src/machine/program.ts';
import { EmulatorGrbl } from '../../src/machine/emulator.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document } from '../../src/model/document.ts';
import { ruleazaFlux } from '../emulator/flux.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';
import { ctxDoc } from './ajutor-degajari.ts';
import { documentCaz } from './ajutor-incrustatie.ts';
import { poarta } from '../oracles/poarta.ts';
import { judeca } from '../oracles/simulare.ts';
import { CAZURI_INCRUSTATIE } from '../oracles/incrustatie.cazuri.ts';
import type { DocV8O } from '../oracles/document.ts';

type Rezultat = Awaited<ReturnType<typeof calculeazaExport>>;

/** Toate textele unui export: fișierele foii, apoi ale dopurilor. */
function texte(r: Rezultat): string[] {
  if (!r.ok) return [];
  return [...r.fisiere.map((f) => f.text), ...r.dopuri.flatMap((d) => d.fisiere.map((f) => f.text))];
}

/** Cuvântul Z al unei cote `z` (mm, în document) în programul cu parametrii `p`, pe hârtie: Z0 jos adaugă grosimea, inch împarte. */
function cuvantZ(z: number, p: ParametriExport, grosime: number): string {
  const k = CONTRACTE[p.post ?? 'grbl-11'], inch = p.unitati === 'inch';
  return `Z${((z + (p.z0 === 'jos' ? grosime : 0)) / (inch ? 25.4 : 1)).toFixed(inch ? k.zecimaleInch : k.zecimaleMm)}`;
}

/** Rândurile lui `text` cu fiecare cuvânt `vechi` înlocuit de `nou`, și câte au fost. */
function inlocuieste(text: string, vechi: string, nou: string): { readonly text: string; readonly n: number } {
  let n = 0;
  const linii = text.split('\n').map((l) => l.split(' ').map((w) => (w === vechi ? (n++, nou) : w)).join(' '));
  return { text: linii.join('\n'), n };
}

test('fără Z sigur și parcare, sau cu Z-ul sigur implicit (5 mm), programul de azi, octet cu octet', async () => {
  assert.equal(Z_SIGUR_IMPLICIT, 5);
  let fisiere = 0;
  for (const caz of CORPUS_CAM) {
    for (const [k, p] of caz.parametri.entries()) {
      const a = await calculeazaExport(caz.doc, p), b = await calculeazaExport(caz.doc, { ...p, zSigur: Z_SIGUR_IMPLICIT });
      assert.equal(b.ok, a.ok, `${caz.id}[${k}]`);
      assert.deepEqual(texte(b), texte(a), `${caz.id}[${k}]: Z-ul sigur implicit schimbă programul`);
      fisiere += texte(a).length;
    }
  }
  assert.ok(fisiere >= 15, `doar ${fisiere} fișiere`);
});

test('Z-ul sigur schimbă doar cuvântul Z al rapidelor de deasupra foii, pe tot corpusul și pe toate posturile', async () => {
  const placa = CORPUS_CAM.find((c) => c.id === 'placa-01')!;
  // Corpusul cu parametrii lui, plus placa 1 pe fiecare post, în mm și în inch (unde postul îl are), cu Z0 sus și jos.
  const cazuri: Array<{ readonly id: string; readonly doc: Document; readonly p: ParametriExport }> = [
    ...CORPUS_CAM.flatMap((c) => c.parametri.map((p, k) => ({ id: `${c.id}[${k}]`, doc: c.doc, p }))),
    ...ID_CONTRACTE.flatMap((post) => (['mm', 'inch'] as const).filter((u) => u === 'mm' || CONTRACTE[post].unitati.inch !== null)
      .flatMap((unitati) => (['sus', 'jos'] as const).map((z0) => ({
        id: `placa-01/${post}/${unitati}/${z0}`, doc: placa.doc, p: { origine: 'stanga-jos' as const, z0, post, unitati },
      })))),
  ];
  let inlocuiri = 0, judecate = 0;
  for (const { id, doc, p } of cazuri) {
    const grosime = doc.foi[0]!.stoc.grosime;
    const azi = await calculeazaExport(doc, p);
    for (const zs of [Z_SIGUR_MINIM, 12.5, 20, Z_SIGUR_MAXIM]) {
      const r = await calculeazaExport(doc, { ...p, zSigur: zs });
      assert.equal(r.ok, azi.ok, `${id}, Z sigur ${zs}`);
      if (!azi.ok || !r.ok) continue;
      const a = texte(azi), b = texte(r);
      assert.equal(b.length, a.length, `${id}, Z sigur ${zs}: alt număr de fișiere`);
      a.forEach((t, i) => {
        const x = inlocuieste(t, cuvantZ(Z_SIGUR_IMPLICIT, p, grosime), cuvantZ(zs, p, grosime));
        assert.ok(x.n >= 1, `${id}, fișierul ${i + 1}: niciun Z sigur de înlocuit`);
        assert.equal(b[i], x.text, `${id}, Z sigur ${zs}, fișierul ${i + 1}: diferă și în afara cuvântului Z sigur`);
        inlocuiri += x.n;
      });
      judecate++;
    }
  }
  assert.ok(judecate >= 60 && inlocuiri >= 1_000, `doar ${judecate} programe, ${inlocuiri} cuvinte Z înlocuite`);
});

test('parcarea: o singură linie G0 X Y în coordonatele programului, după M5, înaintea finalului, în fiecare fișier', async () => {
  const parcari = [{ x: -20, y: 250 }, { x: 0, y: 0 }, { x: 150.25, y: -12.5 }, { x: PARCARE_MAXIMA, y: -PARCARE_MAXIMA }];
  let fisiere = 0;
  for (const caz of CORPUS_CAM) {
    for (const [k, p] of caz.parametri.entries()) {
      const azi = await calculeazaExport(caz.doc, p);
      if (!azi.ok) continue;
      const kz = CONTRACTE[p.post ?? 'grbl-11'], inch = p.unitati === 'inch', zec = inch ? kz.zecimaleInch : kz.zecimaleMm;
      for (const q of parcari) {
        const r = await calculeazaExport(caz.doc, { ...p, parcare: q });
        assert.ok(r.ok, `${caz.id}[${k}]: ${r.ok ? '' : r.motiv}`);
        if (!r.ok) continue;
        const a = texte(azi), b = texte(r);
        assert.equal(b.length, a.length);
        const linie = `G0 X${(q.x / (inch ? 25.4 : 1)).toFixed(zec)} Y${(q.y / (inch ? 25.4 : 1)).toFixed(zec)}`;
        a.forEach((t, i) => {
          const la = t.split('\n'), lb = b[i]!.split('\n');
          const m5 = la.lastIndexOf('M5');
          assert.ok(m5 > 0, `${caz.id}[${k}], fișierul ${i + 1}: fără M5 la final`);
          // Cea de azi, cu parcarea pusă imediat după ultimul M5: freza e deja sus, la Z-ul sigur, cu axul oprit.
          assert.deepEqual(lb, [...la.slice(0, m5 + 1), linie, ...la.slice(m5 + 1)], `${caz.id}[${k}], fișierul ${i + 1}, parcarea ${q.x}, ${q.y}`);
          assert.match(la[m5 - 1]!, /^G0 Z/, `${caz.id}[${k}]: înaintea lui M5, freza urcă la Z-ul sigur`);
          fisiere++;
        });
      }
    }
  }
  assert.ok(fisiere >= 60, `doar ${fisiere} fișiere`);
});

test('dopurile incrustațiilor primesc același Z sigur și aceeași parcare', async () => {
  const doc = incarca(documentCaz(CAZURI_INCRUSTATIE[0]!));
  assert.ok(doc.ok, doc.ok ? '' : doc.motiv);
  if (!doc.ok) return;
  const p: ParametriExport = { origine: 'stanga-jos', z0: 'sus' };
  const azi = await calculeazaExport(doc.doc, p), r = await calculeazaExport(doc.doc, { ...p, zSigur: 20, parcare: { x: -30, y: 0 } });
  assert.ok(azi.ok && r.ok);
  if (!azi.ok || !r.ok) return;
  assert.ok(r.dopuri.length >= 1, 'fără dop');
  r.dopuri.forEach((d, k) => d.fisiere.forEach((f, i) => {
    const vechi = azi.dopuri[k]!.fisiere[i]!.text;
    const x = inlocuieste(vechi, 'Z5.000', 'Z20.000');
    const la = x.text.split('\n'), m5 = la.lastIndexOf('M5');
    assert.ok(x.n >= 1);
    assert.equal(f.text, [...la.slice(0, m5 + 1), 'G0 X-30.000 Y0.000', ...la.slice(m5 + 1)].join('\n'), `dopul ${k + 1}, fișierul ${i + 1}`);
  }));
});

test('poarta: cu Z-ul sigur nou și cu parcarea, verdictele de azi; o parcare coborâtă sub fața foii e prinsă', async () => {
  let judecate = 0, martori = 0;
  for (const caz of CORPUS_CAM) {
    for (const p of caz.parametri) {
      // Poarta citește un singur program, cu o singură freză, în mm, pe un colț.
      if (p.unitati === 'inch' || p.strategieScula !== undefined || p.post !== undefined || p.origine === 'centru') continue;
      const ctx = ctxDoc(caz.doc as unknown as DocV8O, { origine: p.origine, z0: p.z0 });
      const verdict = (text: string): string[] => poarta(text, ctx).map((i) => `[${i.invarianta}] ${i.mesaj}`);
      const azi = await calculeazaExport(caz.doc, p);
      if (!azi.ok || azi.fisiere.length !== 1) continue;
      const { latime: L, inaltime: H } = caz.doc.foi[0]!.stoc;
      for (const [zs, q] of [[Z_SIGUR_MINIM, { x: L / 2, y: H / 2 }], [20, { x: -40, y: H + 40 }], [Z_SIGUR_MAXIM, { x: 0, y: 0 }]] as const) {
        const r = await calculeazaExport(caz.doc, { ...p, zSigur: zs, parcare: q });
        assert.ok(r.ok);
        if (!r.ok) continue;
        assert.deepEqual(verdict(r.fisiere[0]!.text), verdict(azi.fisiere[0]!.text), `${caz.id}: Z sigur ${zs}, parcarea ${q.x}, ${q.y}`);
        judecate++;
      }
      // Martorul: parcarea prin mijlocul foii, cu freza coborâtă la 1 mm sub fața ei, e o rapidă prin material.
      const r = await calculeazaExport(caz.doc, { ...p, parcare: { x: L / 2, y: H / 2 } });
      if (!r.ok) continue;
      const jos = r.fisiere[0]!.text.replace(/\nM5\nG0 X/, `\nM5\nG0 ${cuvantZ(-1, p, caz.doc.foi[0]!.stoc.grosime)}\nG0 X`);
      assert.notEqual(jos, r.fisiere[0]!.text);
      if (verdict(jos).some((v) => v.startsWith('[3]') || v.startsWith('[5]'))) martori++;
    }
  }
  assert.ok(judecate >= 20, `doar ${judecate} programe judecate`);
  assert.ok(martori >= 7, `doar ${martori} martori prinși`);
});

test('simularea: Z-ul sigur și parcarea nu schimbă nicio celulă tăiată', async () => {
  let comparate = 0;
  for (const caz of CORPUS_CAM) {
    const p = caz.parametri[0]!;
    const ops = caz.doc.piese.flatMap((x) => x.operatii);
    const s = ops[0]?.scula;
    // Oracolul simulării ia o singură freză: doar documentele cu o freză plată.
    if (!s || s.forma || ops.some((o) => o.scula.numar !== s.numar || o.scula.diametru !== s.diametru || o.scula.forma)) continue;
    if (p.origine !== 'stanga-jos' || p.z0 !== 'sus' || p.unitati === 'inch') continue;
    const azi = await calculeazaExport(caz.doc, p);
    if (!azi.ok || azi.fisiere.length !== 1) continue;
    // Și fără freze în plus (de rest, fundul plat): niciun `T…` în afara comentariilor, deci nicio schimbare a frezei.
    if (/\bT\d+/.test(azi.fisiere[0]!.text.replace(/\([^)]*\)/g, ''))) continue;
    const { latime, inaltime, grosime } = caz.doc.foi[0]!.stoc;
    const grila = { x0: 0, y0: 0, latime, inaltime, celula: 1 };
    const scula = { tip: 'plata' as const, diametru: s.diametru };
    const z0 = judeca(azi.fisiere[0]!.text, grila, scula, { div: 4 });
    assert.ok(z0.mutariTaiate > 0, `${caz.id}: nimic tăiat`);
    for (const [zs, q] of [[Z_SIGUR_MINIM, { x: latime / 2, y: inaltime / 2 }], [Z_SIGUR_MAXIM, { x: -50, y: inaltime + 50 }]] as const) {
      const r = await calculeazaExport(caz.doc, { ...p, zSigur: zs, parcare: q });
      assert.ok(r.ok);
      if (!r.ok) continue;
      const z = judeca(r.fisiere[0]!.text, grila, scula, { div: 4 });
      assert.equal(z.mutariTaiate, z0.mutariTaiate, `${caz.id}: alte mutări tăiate`);
      assert.ok(z.z.every((v, i) => v === z0.z[i]), `${caz.id}, Z sigur ${zs}: altă suprafață tăiată`);
      assert.ok(z0.varf >= -grosime - 1e-9);
      comparate++;
    }
  }
  assert.ok(comparate >= 8, `doar ${comparate} programe comparate`);
});

test('senderul încarcă programul, iar emulatorul GRBL îl rulează și se oprește la Z-ul sigur, în punctul de parcare', async () => {
  const caz = CORPUS_CAM.find((c) => c.id === 'placa-01')!;
  for (const p of [
    { origine: 'stanga-jos', z0: 'sus' }, { origine: 'centru', z0: 'jos' }, { origine: 'stanga-jos', z0: 'sus', unitati: 'inch' },
  ] as const satisfies readonly ParametriExport[]) {
    const r = await calculeazaExport(caz.doc, { ...p, zSigur: 25, parcare: { x: -10, y: 230 } });
    assert.ok(r.ok);
    if (!r.ok) continue;
    const f = r.fisiere[0]!;
    const inc = await incarcaProgram(new TextEncoder().encode(f.text), { sursa: 'export' });
    assert.ok(inc.ok, inc.ok ? '' : `${inc.cod} pe linia ${inc.linie}`);
    if (!inc.ok) continue;
    assert.deepEqual(montajDeclarat(inc.program), { origine: p.origine, z0: p.z0 });
    const l = f.text.slice(0, -1).split('\n');
    const e = new EmulatorGrbl();
    const flux = ruleazaFlux(l, e, { pasMs: 5 });
    assert.equal(flux.blocat, false);
    assert.deepEqual(flux.erori, []);
    assert.equal(flux.ok, l.length);
    assert.equal(e.contoare.pierduti, 0);
    // Coordonatele programului (WCS-ul emulatorului e zero): parcarea, la Z-ul sigur față de Z0 (cu Z0 jos, plus grosimea).
    const poz = e.pozitie, zSus = 25 + (p.z0 === 'jos' ? 18 : 0);
    assert.ok(Math.abs(poz.x + 10) < 1e-3 && Math.abs(poz.y - 230) < 1e-3 && Math.abs(poz.z - zSus) < 1e-3, `${JSON.stringify(p)}: ${JSON.stringify(poz)}`);
  }
});

test('marginile: Z-ul sigur între 1 și 100 mm, parcarea cel mult 10 000 mm pe fiecare axă; altfel refuzul, cu motivul', async () => {
  assert.deepEqual([Z_SIGUR_MINIM, Z_SIGUR_MAXIM, PARCARE_MAXIMA], [1, 100, 10_000]);
  const caz = CORPUS_CAM.find((c) => c.id === 'placa-01')!;
  const p: ParametriExport = { origine: 'stanga-jos', z0: 'sus' };
  for (const zSigur of [Z_SIGUR_MINIM, Z_SIGUR_MAXIM, 3.25]) assert.ok((await calculeazaExport(caz.doc, { ...p, zSigur })).ok, String(zSigur));
  for (const zSigur of [0.999, 0, -5, 100.001, Number.NaN, Number.POSITIVE_INFINITY]) {
    const r = await calculeazaExport(caz.doc, { ...p, zSigur });
    assert.ok(!r.ok && /Z-ul sigur trebuie să fie între 1 și 100 mm/.test(r.motiv), `${zSigur}: ${r.ok ? 'primit' : r.motiv}`);
  }
  for (const parcare of [{ x: PARCARE_MAXIMA, y: -PARCARE_MAXIMA }, { x: -0.001, y: 0 }]) assert.ok((await calculeazaExport(caz.doc, { ...p, parcare })).ok);
  for (const parcare of [{ x: 10_000.001, y: 0 }, { x: 0, y: -10_000.5 }, { x: Number.NaN, y: 0 }, { x: 0, y: Number.NEGATIVE_INFINITY }]) {
    const r = await calculeazaExport(caz.doc, { ...p, parcare });
    assert.ok(!r.ok && /parcarea trebuie să fie cel mult 10000 mm/.test(r.motiv), `${JSON.stringify(parcare)}: ${r.ok ? 'primit' : r.motiv}`);
  }
});
