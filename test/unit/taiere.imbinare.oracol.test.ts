/**
 * Îmbinarea (ADR 0181 §6; felia 10.3↑j), judecată de oracolul independent (`test/oracles/taiere.ts`) pe corpusuri din sămânță;
 * după fiecare tăiere, documentul trece prin ușă:
 * - **linia la orice unghi**, prin mijlocul formelor corpusului (dreptunghiuri, cercuri, poligoane, cubice, arce, căi deschise,
 *   inele), cu un model oarecare (pasul 8 … 30, înălțimea 4 … 12, raza 0 … 2) și, uneori, cu joc (0,05 … 0,6):
 *   `judecaImbinarea` (reuniunea bucăților e forma, distanța dintre ele e jocul, dinții se văd); un refuz, doar cu motivele
 *   îmbinării (niciun dinte întreg, raza, marginea) sau ale spațiului; „nimic de tăiat”, doar dacă linia ocolește forma;
 * - **cuțitul tras drept** (două puncte, departe de formă), la fel, cu fețele lui;
 * - **martorul:** o bucată pusă de două ori, jocul greșit și dinții lipsă sunt prinși.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, VarfDoc } from '../../src/model/document.ts';
import { MODELE_IMBINARE, type Imbinare } from '../../src/model/imbinare.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import type { FormaCale } from '../../src/model/noduri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type RezultatTaiere } from '../../src/model/taiere.ts';
import { esantioane, formeInstanta, judecaImbinarea, type FormaOracol } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, document, formaCorpus, intre, stoc } from './ajutor-taiere.ts';

type P = { readonly x: number; readonly y: number };
const L = { tip: 'L' } as const;
const cale = (puncte: readonly P[]): FormaCale => ({ tip: 'cale', inchis: false, varfuri: puncte.map((p): VarfDoc => ({ p, s: L })) });

function aplica(d: Document, r: Extract<RezultatTaiere, { ok: true }>, mesaj: string): Document {
  const foaie = d.foi[0];
  assert.ok(foaie);
  let dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }).doc;
  if (r.sterse.length > 0) {
    const sterse = new Set(r.sterse);
    dupa = { ...dupa, foi: dupa.foi.map((f) => ({ ...f, instante: f.instante.filter((i) => !sterse.has(i.id)) })) };
  }
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), `${mesaj}: documentul de după trece de ușă`);
  return dupa;
}
/** Trece linia n · q = v prin forme (puncte de ambele părți, strict)? */
function trece(forme: readonly FormaOracol[], n: P, v: number): boolean {
  const z = forme.flatMap((f) => esantioane(f, 64)).map((q) => n.x * q.x + n.y * q.y - v);
  return Math.min(...z) < -1e-7 && Math.max(...z) > 1e-7;
}
const REFUZURI = new Set(['imbinare', 'imbinare-raza', 'imbinare-margine']);

/** Un caz: forma corpusului, linia prin mijlocul ei, la un unghi oarecare, modelul și jocul. */
function caz(r: () => number, id: string) {
  const d = document([formaCorpus(r, id, intre(r, 200, 800), intre(r, 200, 800))]);
  const inainte = formeInstanta(d, id);
  const xs = inainte.flatMap((f) => esantioane(f, 8));
  const minX = Math.min(...xs.map((q) => q.x)), maxX = Math.max(...xs.map((q) => q.x));
  const minY = Math.min(...xs.map((q) => q.y)), maxY = Math.max(...xs.map((q) => q.y));
  const unghi = r() < 0.25 ? 15 * Math.floor(r() * 24) : intre(r, 0, 360);
  const P0 = { x: intre(r, minX + 0.3 * (maxX - minX), maxX - 0.3 * (maxX - minX)), y: intre(r, minY + 0.3 * (maxY - minY), maxY - 0.3 * (maxY - minY)) };
  const imbinare: Imbinare = {
    model: MODELE_IMBINARE[Math.floor(r() * MODELE_IMBINARE.length)] as Imbinare['model'],
    pas: intre(r, 8, 30), inaltime: intre(r, 4, 12), raza: [0, 0.5, 1, 2][Math.floor(r() * 4)] as number,
  };
  const joc = r() < 0.5 ? 0 : intre(r, 0.05, 0.6);
  const a = (unghi * Math.PI) / 180;
  return { d, inainte, unghi, P0, u: { x: Math.cos(a), y: Math.sin(a) }, n: { x: -Math.sin(a), y: Math.cos(a) }, imbinare, joc };
}

/** Judecata comună: refuzul, cu motivele primite, sau oracolul pe părți. */
function judeca(c: ReturnType<typeof caz>, rez: RezultatTaiere, mesaj: string): 'judecata' | 'refuzata' | 'nimic' {
  const v = c.n.x * c.P0.x + c.n.y * c.P0.y;
  if (!rez.ok) {
    if (rez.motiv === 'nimic-taiat') {
      assert.ok(!trece(c.inainte, c.n, v), `${mesaj}: forma trece linia, dar n-a fost tăiată`);
      return 'nimic';
    }
    const primit = REFUZURI.has(rez.motiv) || (c.joc > 0 && (rez.motiv === 'spatiu' || rez.motiv === 'spatiu-cutit'));
    assert.ok(primit, `${mesaj}: refuzat cu ${rez.motiv}`);
    return 'refuzata';
  }
  const dupa = aplica(c.d, rez, mesaj);
  const parti = rez.ids.map((pid) => formeInstanta(dupa, pid));
  const inchise = c.inainte.some((f) => f.inchis);
  const dinte = inchise ? { n: c.n, v, cat: 0.2 * c.imbinare.inaltime } : undefined;
  assert.deepEqual(judecaImbinarea({ inainte: c.inainte, parti, joc: c.joc, ...(dinte ? { dinte } : {}) }), [], mesaj);
  return 'judecata';
}

test('îmbinarea cu linia la orice unghi: fiecare tăiere a corpusului trece de oracol, iar documentul, de ușă', () => {
  const r = aleator(0x103f);
  const numar = { judecata: 0, refuzata: 0, nimic: 0 };
  let cuJoc = 0;
  for (let k = 0; k < 120; k++) {
    const c = caz(r, `j${k}`);
    const mesaj = `cazul ${k} (prin (${c.P0.x.toFixed(3)}, ${c.P0.y.toFixed(3)}) la ${c.unghi.toFixed(3)}°, ${JSON.stringify(c.imbinare)}, jocul ${c.joc.toFixed(3)})`;
    const rez = taie(c.d, {
      cutit: { fel: 'unghi', x: c.P0.x, y: c.P0.y, unghi: c.unghi }, alese: [`j${k}`], inchide: true, imbinare: c.imbinare,
      ...(c.joc > 0 ? { intre: { fel: 'spatiu' as const, latime: c.joc } } : {}),
    });
    const j = judeca(c, rez, mesaj);
    numar[j]++;
    if (j === 'judecata' && c.joc > 0) cuJoc++;
  }
  assert.ok(numar.judecata >= 60, `judecate: ${numar.judecata} (refuzate ${numar.refuzata}, nimic ${numar.nimic})`);
  assert.ok(cuJoc >= 25, `cu joc: ${cuJoc}`);
  assert.ok(numar.refuzata >= 5, `refuzate: ${numar.refuzata}`);
});

test('îmbinarea cu cuțitul tras drept, departe de formă: fețele lui trec de oracol', () => {
  const r = aleator(0x1040);
  const numar = { judecata: 0, refuzata: 0, nimic: 0 };
  for (let k = 0; k < 70; k++) {
    const c = caz(r, `c${k}`);
    const A = { x: c.P0.x - 2000 * c.u.x, y: c.P0.y - 2000 * c.u.y }, B = { x: c.P0.x + 2000 * c.u.x, y: c.P0.y + 2000 * c.u.y };
    const mesaj = `cazul ${k} (prin (${c.P0.x.toFixed(3)}, ${c.P0.y.toFixed(3)}) la ${c.unghi.toFixed(3)}°, ${JSON.stringify(c.imbinare)}, jocul ${c.joc.toFixed(3)})`;
    const rez = taie(c.d, {
      cutit: { fel: 'cale', cale: cale([A, B]) }, alese: [`c${k}`], inchide: true, imbinare: c.imbinare,
      ...(c.joc > 0 ? { intre: { fel: 'spatiu' as const, latime: c.joc } } : {}),
    });
    numar[judeca(c, rez, mesaj)]++;
  }
  assert.ok(numar.judecata >= 35, `judecate: ${numar.judecata} (refuzate ${numar.refuzata}, nimic ${numar.nimic})`);
});

test('martorul oracolului: o bucată pusă de două ori, jocul greșit și dinții lipsă sunt prinși', () => {
  const d = docDin(stoc, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } });
  const inainte = formeInstanta(d, 'a');
  const parti = (o: { readonly imbinare?: Imbinare; readonly joc?: number }): FormaOracol[][] => {
    const rez = taie(d, { cutit: { fel: 'x', x: 150 }, alese: ['a'], inchide: true, ...(o.imbinare ? { imbinare: o.imbinare } : {}), ...(o.joc ? { intre: { fel: 'spatiu' as const, latime: o.joc } } : {}) });
    if (!rez.ok) assert.fail(`tăierea martorului: ${rez.motiv}`);
    const dupa = aplica(d, rez, 'martor');
    return rez.ids.map((pid) => formeInstanta(dupa, pid));
  };
  const z: Imbinare = { model: 'zigzag', pas: 20, inaltime: 10, raza: 3 };
  const dinte = { n: { x: 1, y: 0 }, v: 150, cat: 2 };
  const cuDinti = parti({ imbinare: z }), cuJoc = parti({ imbinare: z, joc: 0.2 }), drepte = parti({});
  assert.deepEqual(judecaImbinarea({ inainte, parti: cuDinti, joc: 0, dinte }), []);
  assert.deepEqual(judecaImbinarea({ inainte, parti: cuJoc, joc: 0.2, dinte }), []);
  assert.notDeepEqual(judecaImbinarea({ inainte, parti: [...cuDinti, cuDinti[0] ?? []], joc: 0, dinte }), [], 'o bucată pusă de două ori');
  assert.notDeepEqual(judecaImbinarea({ inainte, parti: cuJoc, joc: 0.5, dinte }), [], 'jocul greșit');
  assert.notDeepEqual(judecaImbinarea({ inainte, parti: cuDinti, joc: 0.2, dinte }), [], 'fără joc, judecată cu joc');
  assert.notDeepEqual(judecaImbinarea({ inainte, parti: drepte, joc: 0, dinte }), [], 'dinții lipsă');
});
