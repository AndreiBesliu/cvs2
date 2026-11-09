/**
 * Opțiunile tăierii (ADR 0181 §2, §3; felia 10.3↑h), judecate de oracolul independent (`test/oracles/taiere.ts`) pe corpusuri
 * din sămânță; după fiecare tăiere, documentul trece prin ușă:
 * - **linia la orice unghi**, cu „Păstrează” ambele, stânga sau dreapta, cu și fără închidere, pe formele corpusului (inele,
 *   căi deschise, cubice): `judecaLinia`, cu normala din stânga direcției α; un „nimic de tăiat” e verificat (forma nu trece);
 * - **prelungirea până ies din formă**: un cuțit drept cu ambele capete înăuntrul unui dreptunghi (și cu colțuri rotunjite) sau
 *   al unui cerc, deci convex, taie exact ca linia lui întreagă; fără prelungire nu atinge nimic (`nimic-taiat`);
 * - **linia întreagă**: un cuțit drept de 5 mm, oriunde, taie ca linia lui fiecare formă prin care trece ea; celelalte rămân;
 * - **cuțitul închis convex** (un patrulater rotit, tras în orice sens), cu „Păstrează” înăuntru (stânga) sau în afară
 *   (dreapta): `judecaPastrareaConvex`;
 * - **martorul**: partea greșită păstrată, o parte lipsă și altă linie sunt prinse.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, FormaDoc, VarfDoc } from '../../src/model/document.ts';
import type { FormaCale } from '../../src/model/noduri.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type Pastrare, type RezultatTaiere } from '../../src/model/taiere.ts';
import { esantioane, formeInstanta, judecaLinia, judecaPastrareaConvex, type FormaOracol } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, document, formaCorpus, intre, stoc } from './ajutor-taiere.ts';

type P = { readonly x: number; readonly y: number };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, puncte: readonly P[]): FormaCale => ({ tip: 'cale', inchis, varfuri: puncte.map((p): VarfDoc => ({ p, s: L })) });

/** Documentul după tăiere (degruparea și ștergerile), trecut prin ușă. */
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
const PASTRARI: readonly Pastrare[] = ['ambele', 'ambele', 'stanga', 'dreapta'];
const semnPastrat = (p: Pastrare): 1 | -1 | undefined => (p === 'stanga' ? 1 : p === 'dreapta' ? -1 : undefined);

test('linia la orice unghi, cu „Păstrează”: fiecare tăiere a corpusului trece de oracol, iar documentul, de ușă', () => {
  const r = aleator(0x1038);
  let taieri = 0, pastrate = 0, inchise = 0, nimic = 0;
  for (let caz = 0; caz < 150; caz++) {
    const id = `s${caz}`;
    const d = document([formaCorpus(r, id, intre(r, 200, 800), intre(r, 200, 800))]);
    const inainte = formeInstanta(d, id);
    const xs = inainte.flatMap((f) => esantioane(f, 8));
    const minX = Math.min(...xs.map((q) => q.x)), maxX = Math.max(...xs.map((q) => q.x));
    const minY = Math.min(...xs.map((q) => q.y)), maxY = Math.max(...xs.map((q) => q.y));
    const unghi = r() < 0.25 ? 15 * Math.floor(r() * 24) : intre(r, 0, 360);
    // De cele mai multe ori prin formă; uneori departe de ea (atunci nu trebuie să se taie nimic).
    const departe = r() < 0.08;
    const px = departe ? maxX + 300 : intre(r, minX + 0.2 * (maxX - minX), maxX - 0.2 * (maxX - minX));
    const py = departe ? maxY + 300 : intre(r, minY + 0.2 * (maxY - minY), maxY - 0.2 * (maxY - minY));
    const pastreaza = PASTRARI[Math.floor(r() * PASTRARI.length)] as Pastrare;
    const inchide = r() < 0.6;
    const a = (unghi * Math.PI) / 180;
    const n = { x: -Math.sin(a), y: Math.cos(a) }, v = n.x * px + n.y * py;
    const mesaj = `cazul ${caz} (prin (${px.toFixed(3)}, ${py.toFixed(3)}) la ${unghi.toFixed(3)}°, ${pastreaza}, ${inchide ? 'cu' : 'fără'} închidere)`;
    const rez = taie(d, { cutit: { fel: 'unghi', x: px, y: py, unghi }, alese: [id], inchide, pastreaza });
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      assert.ok(!trece(inainte, n, v), `${mesaj}: forma trece linia, dar n-a fost tăiată`);
      nimic++;
      continue;
    }
    const dupa = aplica(d, rez, mesaj);
    const doar = semnPastrat(pastreaza);
    const parti = rez.ids.map((pid) => formeInstanta(dupa, pid));
    assert.deepEqual(judecaLinia({ inainte, parti, n, v, inchide, doua: true, ...(doar ? { doar } : {}) }), [], mesaj);
    taieri++;
    if (doar) pastrate++;
    if (inchide) inchise++;
  }
  assert.ok(taieri >= 120, `tăieri judecate: ${taieri}`);
  assert.ok(pastrate >= 45, `cu o parte păstrată: ${pastrate}`);
  assert.ok(inchise >= 60, `cu închidere: ${inchise}`);
  assert.ok(nimic >= 5, `nimic de tăiat, verificat: ${nimic}`);
});

test('prelungirea până ies din formă: un cuțit drept cu capetele într-un dreptunghi sau un cerc taie ca linia lui întreagă', () => {
  const r = aleator(0x1039);
  let judecate = 0, refuzate = 0;
  for (let caz = 0; caz < 120; caz++) {
    const id = `c${caz}`;
    const cerc = r() < 0.5;
    const w = intre(r, 30, 150), h = intre(r, 30, 150);
    const forma: FormaDoc = cerc ? { tip: 'cerc', raza: w / 2 } : { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: r() < 0.3 ? intre(r, 0, 10) : 0 };
    const baza = docDin(stoc, { id, forma, matrice: { ...ID, e: intre(r, 200, 800), f: intre(r, 200, 800) } });
    const foaie = baza.foi[0];
    assert.ok(foaie);
    const rotire = [0, 90, 180, 270][Math.floor(r() * 4)] as number;
    const d: Document = { ...baza, foi: [{ ...foaie, instante: foaie.instante.map((i) => ({ ...i, rotire })) }] };
    const inainte = formeInstanta(d, id);
    const xs = inainte.flatMap((f) => esantioane(f, 16));
    const minX = Math.min(...xs.map((q) => q.x)), maxX = Math.max(...xs.map((q) => q.x));
    const minY = Math.min(...xs.map((q) => q.y)), maxY = Math.max(...xs.map((q) => q.y));
    // Capetele, în mijlocul formei (o margine de 35 % din fiecare parte: înăuntru și la cerc, și la colțurile rotunjite).
    const pct = (): P => ({ x: intre(r, minX + 0.35 * (maxX - minX), maxX - 0.35 * (maxX - minX)), y: intre(r, minY + 0.35 * (maxY - minY), maxY - 0.35 * (maxY - minY)) });
    const P = pct();
    let Q = pct();
    for (let i = 0; i < 20 && Math.hypot(Q.x - P.x, Q.y - P.y) < 2; i++) Q = pct();
    if (Math.hypot(Q.x - P.x, Q.y - P.y) < 2) continue;
    const pastreaza = PASTRARI[Math.floor(r() * PASTRARI.length)] as Pastrare;
    const inchide = r() < 0.6;
    const cutit = { fel: 'cale', cale: cale(false, [P, Q]) } as const;
    const mesaj = `cazul ${caz} (${cerc ? 'cerc' : 'dreptunghi'}, de la (${P.x.toFixed(3)}, ${P.y.toFixed(3)}) la (${Q.x.toFixed(3)}, ${Q.y.toFixed(3)}), ${pastreaza}, ${inchide ? 'cu' : 'fără'} închidere)`;
    const fara = taie(d, { cutit, alese: [id], inchide });
    // Fără prelungire, cuțitul nu atinge niciun contur (stă tot înăuntru): nimic de tăiat.
    assert.deepEqual(fara, { ok: false, motiv: 'nimic-taiat' }, `${mesaj}: fără prelungire`);
    refuzate++;
    const rez = taie(d, { cutit, alese: [id], inchide, prelungeste: 'forma', pastreaza });
    if (!rez.ok) assert.fail(`${mesaj}: refuzat cu ${rez.motiv}`);
    const dupa = aplica(d, rez, mesaj);
    const l = Math.hypot(Q.x - P.x, Q.y - P.y);
    const n = { x: -(Q.y - P.y) / l, y: (Q.x - P.x) / l }, v = n.x * P.x + n.y * P.y;
    const doar = semnPastrat(pastreaza);
    const parti = rez.ids.map((pid) => formeInstanta(dupa, pid));
    assert.deepEqual(judecaLinia({ inainte, parti, n, v, inchide, doua: false, ...(doar ? { doar } : {}) }), [], mesaj);
    judecate++;
  }
  assert.ok(judecate >= 100, `prelungiri judecate: ${judecate}`);
  assert.ok(refuzate >= 100, `fără prelungire, refuzate: ${refuzate}`);
});

test('linia întreagă: un cuțit drept de 5 mm taie, ca linia lui, fiecare formă prin care trece ea; celelalte rămân', () => {
  const r = aleator(0x103a);
  let taiate = 0, ramase = 0;
  for (let caz = 0; caz < 60; caz++) {
    const forme = Array.from({ length: 1 + Math.floor(r() * 3) }, (_, i) => formaCorpus(r, `t${caz}-${i}`, intre(r, 150, 850), intre(r, 150, 850)));
    const d = document(forme);
    const ids = forme.map((f) => f.instanta.id);
    const a = intre(r, 0, 2 * Math.PI);
    // De cele mai multe ori prin mijlocul uneia dintre forme; uneori oriunde.
    const tinta = forme[Math.floor(r() * forme.length)]?.instanta;
    const P = tinta && r() < 0.85 ? { x: tinta.x + intre(r, -10, 10), y: tinta.y + intre(r, -10, 10) } : { x: intre(r, 200, 800), y: intre(r, 200, 800) };
    const Q = { x: P.x + 5 * Math.cos(a), y: P.y + 5 * Math.sin(a) };
    const pastreaza = PASTRARI[Math.floor(r() * PASTRARI.length)] as Pastrare;
    const inchide = r() < 0.6;
    const n = { x: -Math.sin(a), y: Math.cos(a) }, v = n.x * P.x + n.y * P.y;
    const mesaj = `cazul ${caz} (${ids.length} forme, de la (${P.x.toFixed(3)}, ${P.y.toFixed(3)}) la ${((a * 180) / Math.PI).toFixed(3)}°, ${pastreaza}, ${inchide ? 'cu' : 'fără'} închidere)`;
    const rez = taie(d, { cutit: { fel: 'cale', cale: cale(false, [P, Q]) }, alese: ids, inchide, prelungeste: 'intreaga', pastreaza });
    const prin = new Set(ids.filter((id) => trece(formeInstanta(d, id), n, v)));
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      assert.equal(prin.size, 0, `${mesaj}: linia trece prin ${[...prin].join(', ')}, dar nu s-a tăiat nimic`);
      continue;
    }
    const dupa = aplica(d, rez, mesaj);
    const doar = semnPastrat(pastreaza);
    const atinse = new Set([...rez.degrupate.map((g) => g.instanta.id), ...rez.sterse]);
    assert.deepEqual([...atinse].sort(), [...prin].sort(), `${mesaj}: tăiate exact formele prin care trece linia`);
    for (const g of rez.degrupate) {
      const parti = g.parti.map((p) => formeInstanta(dupa, p.instanta.id));
      assert.deepEqual(judecaLinia({ inainte: formeInstanta(d, g.instanta.id), parti, n, v, inchide, doua: false, ...(doar ? { doar } : {}) }), [], `${mesaj}, ${g.instanta.id}`);
      taiate++;
    }
    ramase += ids.length - atinse.size;
  }
  assert.ok(taiate >= 30, `forme tăiate, judecate: ${taiate}`);
  assert.ok(ramase >= 20, `forme pe lângă care trece linia, rămase: ${ramase}`);
});

test('cuțitul închis convex, cu „Păstrează” înăuntru (stânga) sau în afară (dreapta): ce rămâne trece de oracol', () => {
  const r = aleator(0x103b);
  let judecate = 0;
  for (let caz = 0; caz < 90; caz++) {
    const id = `k${caz}`;
    const d = document([formaCorpus(r, id, 500, 500)]);
    const inainte = formeInstanta(d, id);
    // Un patrulater convex: dreptunghiul cu semilaturile a și b, rotit cu u, mutat lângă mijlocul formei.
    const c = { x: 500 + intre(r, -50, 50), y: 500 + intre(r, -50, 50) };
    const ah = intre(r, 10, 70), bh = intre(r, 10, 70), u = intre(r, 0, Math.PI);
    const k: P[] = [[-ah, -bh], [ah, -bh], [ah, bh], [-ah, bh]].map(([x, y]) => ({
      x: c.x + (x as number) * Math.cos(u) - (y as number) * Math.sin(u), y: c.y + (x as number) * Math.sin(u) + (y as number) * Math.cos(u),
    }));
    const invers = r() < 0.5;
    const pastreaza: Pastrare = r() < 0.5 ? 'stanga' : 'dreapta';
    const inchide = r() < 0.6;
    const mesaj = `cazul ${caz} (patrulaterul din (${c.x.toFixed(3)}, ${c.y.toFixed(3)}), ${invers ? 'tras invers' : 'trigonometric'}, ${pastreaza}, ${inchide ? 'cu' : 'fără'} închidere)`;
    const rez = taie(d, { cutit: { fel: 'cale', cale: cale(true, invers ? [...k].reverse() : k) }, alese: [id], inchide, pastreaza });
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      continue;
    }
    const dupa = aplica(d, rez, mesaj);
    const ramase = rez.sterse.includes(id) ? [] : rez.ids.flatMap((pid) => formeInstanta(dupa, pid));
    assert.deepEqual(judecaPastrareaConvex({ inainte, ramase, k, inauntru: pastreaza === 'stanga', inchide }), [], mesaj);
    judecate++;
  }
  assert.ok(judecate >= 60, `judecate: ${judecate}`);
});

test('martorul oracolului: partea greșită păstrată, o parte lipsă și altă linie sunt prinse', () => {
  const d = docDin(stoc, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } });
  const n = { x: -0.5, y: Math.sqrt(3) / 2 }, v = n.x * 120 + n.y * 150;
  const inainte = formeInstanta(d, 'a');
  const ambele = taie(d, { cutit: { fel: 'unghi', x: 120, y: 150, unghi: 30 }, alese: ['a'], inchide: true });
  const stanga = taie(d, { cutit: { fel: 'unghi', x: 120, y: 150, unghi: 30 }, alese: ['a'], inchide: true, pastreaza: 'stanga' });
  const dreapta = taie(d, { cutit: { fel: 'unghi', x: 120, y: 150, unghi: 30 }, alese: ['a'], inchide: true, pastreaza: 'dreapta' });
  if (!ambele.ok || !stanga.ok || !dreapta.ok) assert.fail('tăierile martorului');
  const [a, b] = ambele.ids.map((pid) => formeInstanta(aplica(d, ambele, 'martor'), pid));
  const s = stanga.ids.map((pid) => formeInstanta(aplica(d, stanga, 'martor'), pid));
  const dr = dreapta.ids.map((pid) => formeInstanta(aplica(d, dreapta, 'martor'), pid));
  assert.deepEqual(judecaLinia({ inainte, parti: [a ?? [], b ?? []], n, v, inchide: true, doua: true }), []);
  assert.deepEqual(judecaLinia({ inainte, parti: s, n, v, inchide: true, doua: true, doar: 1 }), []);
  assert.notDeepEqual(judecaLinia({ inainte, parti: dr, n, v, inchide: true, doua: true, doar: 1 }), [], 'partea greșită');
  assert.notDeepEqual(judecaLinia({ inainte, parti: [a ?? []], n, v, inchide: true, doua: true }), [], 'o parte lipsă');
  assert.notDeepEqual(judecaLinia({ inainte, parti: [a ?? [], b ?? []], n, v: v + 5, inchide: true, doua: true }), [], 'altă linie');
  const k = [{ x: 80, y: 80 }, { x: 140, y: 80 }, { x: 140, y: 140 }, { x: 80, y: 140 }];
  const inK = taie(d, { cutit: { fel: 'cale', cale: cale(true, k) }, alese: ['a'], inchide: true, pastreaza: 'stanga' });
  if (!inK.ok) assert.fail('cuțitul închis al martorului');
  const ramase = inK.ids.flatMap((pid) => formeInstanta(aplica(d, inK, 'martor'), pid));
  assert.deepEqual(judecaPastrareaConvex({ inainte, ramase, k, inauntru: true, inchide: true }), []);
  assert.notDeepEqual(judecaPastrareaConvex({ inainte, ramase, k, inauntru: false, inchide: true }), [], 'partea greșită a cuțitului închis');
});
