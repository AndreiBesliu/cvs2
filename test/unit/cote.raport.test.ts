/**
 * Cotele în raportul foilor (ADR 0330 §7, felia 10.4↑d-3): desenul unei foi din raport, pe hârtie. Fără cote cerute, aceiași
 * octeți ca până acum (SVG-ul exportului de vectori, cu foaia, liniile la a 150-a parte din latura mare); cu ele, stratul
 * COTE, cu cifrele mărite cât să se citească pe desen (cel puțin a 60-a parte din latura mare a foii), liniile cotelor la
 * jumătate din ale pieselor, iar pagina lărgită cât ies cotele din foaie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './limbi.ts';
import { CUTIE_GOALA, uneste } from '../../src/geom/cutie.ts';
import { entitatiCote } from '../../src/io/coteExport.ts';
import { laturaRaport, PARTE_CIFRE_RAPORT, PARTE_LINII_RAPORT, stilRaport, svgFoaieRaport } from '../../src/io/raportCote.ts';
import { nr, scrieSvg } from '../../src/io/svgExport.ts';
import { vectoriFoaie } from '../../src/io/vectori.ts';
import { formatImplicit, STIL_IMPLICIT } from '../../src/model/desenCota.ts';
import type { Cota, Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { cifreDinFont } from '../../src/text/cifreCote.ts';
import { citesteFont } from '../../src/text/font.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';

const r = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/relief-singleline.ttf', import.meta.url))));
if (!r.ok) throw new Error('fontul cifrelor');
const CIFRE = cifreDinFont(r.font);

const caz = CORPUS_CAM.find((c) => c.id === 'placa-01');
if (!caz) throw new Error('placa 1');
/** Orizontala liberă (20, 20) → (120, 20) a dreptunghiului plăcii 1, cu linia la d (sub ea, cu d < 0). */
const cota = (d: number, id = 'c1'): Cota => ({ id, fel: 'orizontala', puncte: [{ x: 20, y: 20 }, { x: 120, y: 20 }], linie: { d } });
function cuCote(doc: Document, cote: readonly Cota[]): Document {
  const brut = JSON.parse(JSON.stringify(doc)) as { foi: Record<string, unknown>[] };
  brut.foi = brut.foi.map((f, k) => (k === 0 ? { ...f, cote } : f));
  const u = incarca(brut);
  assert.ok(u.ok, u.ok ? '' : u.motiv);
  return u.doc;
}
/** Culoarea stratului, alta decât cea implicită (#006d8f), ca să se vadă că vine din setări. */
const OPT = { stil: STIL_IMPLICIT, format: formatImplicit(true), ca: 'trasaturi' as const, cifre: CIFRE, culoare: '#ab1234' };

test('fără cote cerute: desenul de până acum, octet cu octet (și pe o foaie cu cote)', () => {
  for (const c of CORPUS_CAM) {
    for (let k = 0; k < c.doc.foi.length; k++) {
      const azi = scrieSvg(vectoriFoaie(c.doc, k, true), laturaRaport(c.doc, k) / PARTE_LINII_RAPORT);
      assert.equal(svgFoaieRaport(c.doc, k), azi, `${c.id}, foaia ${k + 1}`);
    }
  }
  const doc = cuCote(caz.doc, [cota(-10)]);
  assert.equal(svgFoaieRaport(doc, 0), svgFoaieRaport(caz.doc, 0));
  // Cu cote cerute, dar foaia n-are: tot desenul de până acum.
  assert.equal(svgFoaieRaport(caz.doc, 0, OPT), svgFoaieRaport(caz.doc, 0));
});

test('latura și stilul raportului: cifrele cel puțin a 60-a parte din latura mare; o foaie mică le lasă cum sunt', () => {
  const stoc = caz.doc.foi[0]!.stoc;
  assert.equal(laturaRaport(caz.doc, 0), Math.max(stoc.latime, stoc.inaltime));
  assert.equal(PARTE_CIFRE_RAPORT, 60);
  assert.equal(PARTE_LINII_RAPORT, 150);
  // Pe 600 mm: cifrele de 10 (nu 3,5); capătul, golul și depășirea cresc la fel (× 10 / 3,5); restul rămâne.
  const m = 10 / 3.5;
  const s = stilRaport(STIL_IMPLICIT, 600);
  assert.equal(s.inaltime, 10);
  assert.ok(Math.abs(s.capat - 2.5 * m) < 1e-12 && Math.abs(s.gol - 1 * m) < 1e-12 && Math.abs(s.depasire - 2 * m) < 1e-12);
  assert.deepEqual({ ...s, inaltime: 0, capat: 0, gol: 0, depasire: 0 }, { ...STIL_IMPLICIT, inaltime: 0, capat: 0, gol: 0, depasire: 0 });
  // Pe 150 mm (a 60-a parte: 2,5 < 3,5) și la egalitate (210 mm: 3,5), stilul rămâne exact cel dat.
  assert.equal(stilRaport(STIL_IMPLICIT, 150), STIL_IMPLICIT);
  assert.equal(stilRaport(STIL_IMPLICIT, 210), STIL_IMPLICIT);
});

test('cu cotele: stratul COTE, cu culoarea și liniile la a 300-a parte din latura mare; cifrele la înălțimea raportului', () => {
  const doc = cuCote(caz.doc, [cota(-10)]);
  const latura = laturaRaport(doc, 0);
  const inaltimi: number[] = [];
  const svg = svgFoaieRaport(doc, 0, { ...OPT, cifre: (t, h) => { inaltimi.push(h); return CIFRE(t, h); } });
  assert.ok(svg.includes(`<g id="COTE" inkscape:groupmode="layer" inkscape:label="COTE" fill="none" stroke="#ab1234" stroke-width="${nr(latura / (2 * PARTE_LINII_RAPORT))}">`), 'stratul COTE');
  assert.deepEqual(inaltimi, [stilRaport(STIL_IMPLICIT, latura).inaltime]);
  // Restul desenului (foaia, piesele) e cel de până acum: același început, aceleași straturi înaintea cotelor.
  const fara = svgFoaieRaport(caz.doc, 0);
  assert.ok(svg.startsWith(fara.slice(0, fara.indexOf('\n<g'))), 'antetul');
  for (const g of fara.split('\n').filter((x) => x.startsWith('<g '))) assert.ok(svg.includes(g), g);
  // Linia de cotă: y = 20 − 10 = 10 pe foaie, deci H − 10 în SVG, de la x = 20 la 120 (aceeași cotă, la mărimea raportului).
  const H = doc.foi[0]!.stoc.inaltime;
  assert.ok(svg.includes(`M20 ${H - 10}L120 ${H - 10}`), 'linia cotei');
  // Cifrele ca text: un <text>, cu mărimea fontului din înălțimea raportului (Helvetica: majuscula e 0,718 din mărime).
  const { cifre: _c, ...faraCifre } = OPT;
  const ca = svgFoaieRaport(doc, 0, { ...faraCifre, ca: 'text' });
  assert.match(ca, /<text [^>]*fill="#ab1234"[^>]*>100<\/text>/);
});

test('o cotă care iese din foaie lărgește pagina desenului, ca să nu se taie; cea dinăuntru o lasă cât foaia', () => {
  const H = caz.doc.foi[0]!.stoc.inaltime, L = caz.doc.foi[0]!.stoc.latime;
  const inauntru = svgFoaieRaport(cuCote(caz.doc, [cota(-10)]), 0, OPT);
  assert.match(inauntru, new RegExp(`width="${L}mm" height="${H}mm" viewBox="0 0 ${L} ${H}"`));
  // Linia la y = 20 − 60 = −40: sub foaie; pagina coboară până la extensii (depășirea lor, mărită) și la cifre.
  const doc = cuCote(caz.doc, [cota(-60)]);
  const afara = svgFoaieRaport(doc, 0, OPT);
  const ec = entitatiCote(doc, 0, { ...OPT, stil: stilRaport(STIL_IMPLICIT, laturaRaport(doc, 0)) });
  assert.ok(ec.cutie);
  const p = uneste(uneste(CUTIE_GOALA, { minX: 0, minY: 0, maxX: L, maxY: H }), ec.cutie);
  assert.ok(p.minY < -40);
  assert.match(afara, new RegExp(`width="${nr(p.maxX - p.minX)}mm" height="${nr(p.maxY - p.minY)}mm" viewBox="${nr(p.minX)} ${nr(H - p.maxY)} ${nr(p.maxX - p.minX)} ${nr(p.maxY - p.minY)}"`));
});
