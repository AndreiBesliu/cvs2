/**
 * Tăierea în panouri (ADR 0181 §7; felia 10.3↑k), judecată de oracolul independent (`test/oracles/taiere.ts`) pe corpusuri din
 * sămânță; după fiecare tăiere, documentul trece prin ușă, iar anularea îl pune exact:
 * - **formele corpusului** (dreptunghiuri, cercuri, poligoane, cubice, arce, căi deschise, inele), câte una în fiecare loc al unei
 *   rețele de 3 × 3 (fără suprapuneri), rotite, tăiate drept pe o grilă oarecare (după mărime, egale sau din colț, ori după număr;
 *   1 … 4 panouri pe axă, nu 1 × 1);
 * - **o placă** (un dreptunghi oarecare, cu colțurile rotunjite sau nu), cu un model de îmbinare oarecare și, uneori, cu joc; un
 *   refuz, doar cu motivele îmbinării sau ale spațiului.
 *
 * Grila o socotește testul, din cutia exactă a oracolului (nu din `grilaPanouri`). Judecata: fiecare panou stă într-o celulă (toate
 * eșantioanele lui, cu dinții și jocul de peste linie), celulele panourilor sunt crescătoare (rând cu rând, de jos, de la stânga),
 * numele sunt „Panoul 1” … în ordine; `judecaPanourile` (nimic în afara formelor vechi; fără joc, ariile fac aria lor).
 * **Martorul:** un panou mutat cu 10 mm iese din celula lui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, Instanta, Piesa } from '../../src/model/document.ts';
import { MODELE_IMBINARE, type Imbinare } from '../../src/model/imbinare.ts';
import { anuleaza, executa, istoricNou, type Comanda } from '../../src/model/jurnal.ts';
import { comenziGrupuriPanouri } from '../../src/model/grupuriPanouri.ts';
import { taieInPanouri, type CererePanouri } from '../../src/model/panouri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import type { GrilaPanouri } from '../../src/model/grilaPanouri.ts';
import type { RezultatTaiere } from '../../src/model/taiere.ts';
import { cutieForma, esantioane, formeInstanta, judecaPanourile, type FormaOracol } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, document, formaCorpus, intre, stoc } from './ajutor-taiere.ts';

type Cutie = { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
const MARE = 1e9;

/** Liniile unei axe [a, a + w], pe hârtie: egale (k · w / n), din colț (k · l, cât rămâne ceva) sau după număr. */
function linii(a: number, w: number, g: { readonly l: number; readonly colt: boolean } | { readonly n: number }): number[] {
  if ('n' in g) return Array.from({ length: g.n - 1 }, (_, k) => a + (w * (k + 1)) / g.n);
  const n = Math.max(1, Math.ceil((w - 1e-6) / g.l));
  return Array.from({ length: n - 1 }, (_, k) => a + (g.colt ? g.l * (k + 1) : (w * (k + 1)) / n));
}
/** Celulele grilei, rând cu rând de jos, de la stânga; cele de margine, deschise spre afară. */
function celule(xs: readonly number[], ys: readonly number[]): Cutie[] {
  const X = [-MARE, ...xs, MARE], Y = [-MARE, ...ys, MARE];
  return Y.slice(1).flatMap((y1, r) => X.slice(1).map((x1, c) => ({ minX: X[c] as number, minY: Y[r] as number, maxX: x1, maxY: y1 })));
}

/** Comanda rezultatului, ca acțiunea `document.taie` (degruparea, apoi grupurile panourilor), și panourile, în ordinea lor. */
function comanda(d: Document, r: Extract<RezultatTaiere, { ok: true }>): { readonly comanda: Comanda; readonly ids: readonly string[] } {
  const id = d.foi[0]?.id as string;
  const cs: Comanda[] = r.degrupate.length > 0 ? [{ tip: 'degrupeaza', foaie: id, degrupate: r.degrupate }] : [];
  const g = comenziGrupuriPanouri(cs.length > 0 ? executa(istoricNou(d), { tip: 'lot', comenzi: cs }).doc : d, id, r.grupuri ?? [], r.ids);
  assert.ok(g);
  return { comanda: { tip: 'lot', comenzi: [...cs, ...g.comenzi] }, ids: g.ids };
}

/** Judecata unui caz tăiat: documentul, celulele panourilor, numele și oracolul. Întoarce panourile (formele lor). */
function judeca(d: Document, r: Extract<RezultatTaiere, { ok: true }>, inainte: readonly FormaOracol[], xs: readonly number[], ys: readonly number[], toleranta: number, joc: number, mesaj: string): void {
  const { comanda: k, ids } = comanda(d, r);
  const h = executa(istoricNou(d), k);
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(h.doc))), `${mesaj}: documentul de după trece de ușă`);
  assert.deepEqual({ ...anuleaza(h).doc, rev: d.rev }, d, `${mesaj}: anularea pune documentul exact`);
  const toate = celule(xs, ys);
  const t = toleranta + 1e-6;
  let inainteDe = -1;
  const panouri = ids.map((id, k) => {
    const i = h.doc.foi[0]?.instante.find((x) => x.id === id);
    assert.ok(i, `${mesaj}: panoul ${id}`);
    assert.equal(h.doc.piese.find((p) => p.id === i.piesa)?.nume, `Panoul ${k + 1}`, `${mesaj}: numele panoului ${k + 1}`);
    const forme = formeInstanta(h.doc, id);
    const probe = forme.flatMap((f) => esantioane(f, 32));
    const c = toate.findIndex((x) => probe.every((q) => q.x >= x.minX - t && q.x <= x.maxX + t && q.y >= x.minY - t && q.y <= x.maxY + t));
    assert.ok(c >= 0, `${mesaj}: panoul ${k + 1} nu stă într-o singură celulă`);
    assert.ok(c > inainteDe, `${mesaj}: panoul ${k + 1} (celula ${c}) nu vine după celula ${inainteDe}`);
    inainteDe = c;
    return { celula: toate[c] as Cutie, forme };
  });
  assert.deepEqual(judecaPanourile({ inainte, panouri, toleranta, joc }), [], mesaj);
  // Nimic pierdut: pe foaie, doar panourile.
  assert.equal(h.doc.foi[0]?.instante.length, ids.length, `${mesaj}: pe foaie, doar panourile`);
}

const cutieTuturor = (forme: readonly FormaOracol[]): Cutie => forme.map(cutieForma).reduce((a, b) => ({
  minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
}));
/** O grilă oarecare, cu 1 … 4 panouri pe axă (nu 1 × 1): cererea și liniile ei, pe hârtie. */
function grila(r: () => number, k: Cutie): { readonly g: GrilaPanouri; readonly xs: number[]; readonly ys: number[] } {
  const W = k.maxX - k.minX, H = k.maxY - k.minY;
  for (;;) {
    let g: GrilaPanouri, xs: number[], ys: number[];
    if (r() < 0.3) {
      const n = 1 + Math.floor(r() * 4), m = 1 + Math.floor(r() * 4);
      g = { fel: 'numar', coloane: n, randuri: m };
      xs = linii(k.minX, W, { n }); ys = linii(k.minY, H, { n: m });
    } else {
      const colt = r() < 0.5, l = W / intre(r, 0.8, 3.9), i = H / intre(r, 0.8, 3.9);
      g = { fel: 'marime', latime: l, inaltime: i, colt };
      xs = linii(k.minX, W, { l, colt }); ys = linii(k.minY, H, { l: i, colt });
    }
    if (xs.length + ys.length > 0) return { g, xs, ys };
  }
}

test('oracolul: formele corpusului, câte una în fiecare loc al unei rețele de 3 × 3, tăiate drept pe o grilă oarecare', () => {
  const r = aleator(1031);
  let judecate = 0;
  for (let caz = 0; caz < 14; caz++) {
    const forme: Array<{ readonly piesa: Piesa; readonly instanta: Instanta }> = [];
    for (let k = 0; k < 9; k++) if (r() < 0.7) forme.push(formaCorpus(r, `e${caz}x${k}`, 200 + 300 * (k % 3) + intre(r, -20, 20), 200 + 300 * Math.floor(k / 3) + intre(r, -20, 20)));
    if (forme.length < 2) continue;
    const d = document(forme);
    const ids = forme.map((f) => f.instanta.id);
    const inainte = ids.flatMap((id) => formeInstanta(d, id));
    const { g, xs, ys } = grila(r, cutieTuturor(inainte));
    const cerere: CererePanouri = { alese: ids, grila: g, inchide: true, nume: 'Panoul' };
    const rez = taieInPanouri(d, cerere);
    const mesaj = `cazul ${caz} (${JSON.stringify(g)})`;
    if (!rez.ok) assert.fail(`${mesaj}: refuzat cu ${rez.motiv}`);
    judeca(d, rez, inainte, xs, ys, 0, 0, mesaj);
    judecate++;
  }
  assert.ok(judecate >= 12, `judecate: ${judecate}`);
});

test('oracolul: o placă oarecare, cu îmbinare și, uneori, cu joc, pe o grilă oarecare', () => {
  const r = aleator(2207);
  const PRIMITE = new Set(['imbinare', 'imbinare-raza', 'imbinare-margine', 'spatiu', 'spatiu-cutit']);
  let judecate = 0;
  for (let caz = 0; caz < 8; caz++) {
    const w = intre(r, 400, 900), h = intre(r, 300, 900);
    const d = docDin(stoc, { id: 'p', forma: { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: r() < 0.5 ? 0 : intre(r, 5, 60) }, matrice: { ...ID, e: intre(r, 0, 1000 - w), f: intre(r, 0, 1000 - h) } });
    const inainte = formeInstanta(d, 'p');
    const { g, xs, ys } = grila(r, cutieTuturor(inainte));
    const imbinare: Imbinare = {
      model: MODELE_IMBINARE[Math.floor(r() * MODELE_IMBINARE.length)] as Imbinare['model'],
      pas: intre(r, 30, 60), inaltime: intre(r, 4, 8), raza: [0, 0.5, 1, 2][Math.floor(r() * 4)] as number,
    };
    const joc = r() < 0.5 ? 0 : intre(r, 0.05, 0.6);
    const rez = taieInPanouri(d, { alese: ['p'], grila: g, inchide: true, nume: 'Panoul', imbinare, ...(joc > 0 ? { intre: { fel: 'spatiu', latime: joc } } : {}) });
    const mesaj = `placa ${caz} (${JSON.stringify(g)}, ${JSON.stringify(imbinare)}, jocul ${joc})`;
    if (!rez.ok) {
      assert.ok(PRIMITE.has(rez.motiv), `${mesaj}: refuzată cu ${rez.motiv}`);
      continue;
    }
    judeca(d, rez, inainte, xs, ys, imbinare.inaltime / 2 + joc / 2, joc, mesaj);
    judecate++;
  }
  assert.ok(judecate >= 4, `judecate: ${judecate}`);
});

test('martorul: un panou mutat cu 10 mm iese din celula lui', () => {
  const d = docDin(stoc, { id: 'p', forma: { tip: 'dreptunghi', latime: 800, inaltime: 400, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } });
  const inainte = formeInstanta(d, 'p');
  const rez = taieInPanouri(d, { alese: ['p'], grila: { fel: 'numar', coloane: 2, randuri: 1 }, inchide: true, nume: 'Panoul' });
  if (!rez.ok) return assert.fail(rez.motiv);
  const { comanda: k, ids } = comanda(d, rez);
  const dupa = executa(istoricNou(d), k).doc;
  const [a, b] = ids.map((id) => formeInstanta(dupa, id));
  const muta = (f: readonly FormaOracol[]): FormaOracol[] => f.map((x) => ({ ...x, seg: x.seg.map((s) => ({ ...s, a: { x: s.a.x + 10, y: s.a.y }, b: { x: s.b.x + 10, y: s.b.y } })) }));
  const panouri = [{ celula: { minX: -MARE, minY: -MARE, maxX: 500, maxY: MARE }, forme: muta(a as FormaOracol[]) }, { celula: { minX: 500, minY: -MARE, maxX: MARE, maxY: MARE }, forme: b as FormaOracol[] }];
  assert.ok(judecaPanourile({ inainte, panouri, toleranta: 0, joc: 0 }).some((x) => x.includes('iese din celula lui')));
});
