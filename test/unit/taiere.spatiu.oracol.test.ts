/**
 * Spațiul și suprapunerea dintre bucăți (ADR 0181 §2; felia 10.3↑i), judecate de oracolul independent (`test/oracles/taiere.ts`)
 * pe corpusuri din sămânță; după fiecare tăiere, documentul trece prin ușă:
 * - **linia la orice unghi**, cu spațiu sau suprapunere de 0,2 … 6 mm (uneori 10 … 40), cu „Păstrează” ambele, stânga sau
 *   dreapta: `judecaSpatiul` (părțile din regiunea tăiată cu linia mutată, distanța dintre ele, partea comună); un refuz
 *   `spatiu` doar dacă rețeaua oracolului găsește o bucată mâncată (sau una lângă prag), iar fără refuz, nicio bucată mâncată;
 * - **cuțitul tras drept** (două puncte, departe de formă): la fel, cu fețele lui (oricâte părți);
 * - **cuțitul închis convex** (un patrulater rotit, tras în orice sens): `judecaConvexMutat` (înăuntru, din el strâns sau
 *   crescut; în afară, invers), iar refuzul, cu rețeaua;
 * - **martorul**: lățimea greșită, felul greșit, tăierea fără spațiu și bucățile mâncate (sau nu) sunt prinse.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, VarfDoc } from '../../src/model/document.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import type { FormaCale } from '../../src/model/noduri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type Intre, type Pastrare, type RezultatTaiere } from '../../src/model/taiere.ts';
import { distantaConvex, esantioane, formeInstanta, judecaConvexMutat, judecaSpatiul, mancatRaster, type FormaOracol } from '../oracles/taiere.ts';
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

/** Cutia eșantioanelor formelor. */
function cutie(forme: readonly FormaOracol[]): { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } {
  const xs = forme.flatMap((f) => esantioane(f, 8));
  return {
    minX: Math.min(...xs.map((q) => q.x)), maxX: Math.max(...xs.map((q) => q.x)),
    minY: Math.min(...xs.map((q) => q.y)), maxY: Math.max(...xs.map((q) => q.y)),
  };
}

/**
 * Un caz al corpusului: forma, linia prin mijlocul ei (uneori lângă marginea ei, unde rămân fâșii subțiri, sau departe),
 * felul, lățimea și partea păstrată.
 */
function caz(r: () => number, id: string) {
  const d = document([formaCorpus(r, id, intre(r, 200, 800), intre(r, 200, 800))]);
  const inainte = formeInstanta(d, id);
  const k = cutie(inainte);
  const mod = r();
  const departe = mod < 0.05, margine = mod >= 0.05 && mod < 0.25;
  // Lângă marginea din stânga sau din dreapta, linia e aproape verticală: lasă o fâșie subțire.
  const unghi = margine ? (r() < 0.5 ? 90 : 270) + intre(r, -15, 15) : r() < 0.25 ? 15 * Math.floor(r() * 24) : intre(r, 0, 360);
  const fx = margine ? (r() < 0.5 ? intre(r, 0.01, 0.08) : intre(r, 0.92, 0.99)) : intre(r, 0.2, 0.8);
  const fy = intre(r, 0.2, 0.8);
  const P = {
    x: departe ? k.maxX + 300 : k.minX + fx * (k.maxX - k.minX),
    y: departe ? k.maxY + 300 : k.minY + fy * (k.maxY - k.minY),
  };
  // Lângă margine, lățimi care pot mânca fâșia; altfel, de obicei mici, uneori mari.
  const latime = margine ? intre(r, 2, 20) : r() < 0.15 ? intre(r, 10, 40) : intre(r, 0.2, 6);
  const intreBucati: Intre = { fel: r() < 0.6 ? 'spatiu' : 'suprapunere', latime };
  const pastreaza = PASTRARI[Math.floor(r() * PASTRARI.length)] as Pastrare;
  const a = (unghi * Math.PI) / 180;
  const u = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -Math.sin(a), y: Math.cos(a) };
  return { d, inainte, unghi, P, u, n, v: n.x * P.x + n.y * P.y, intre: intreBucati, pastreaza };
}

/** Judecata comună a liniei și a cuțitului tras drept: refuzul cu rețeaua, altfel `judecaSpatiul`. */
function judeca(c: ReturnType<typeof caz>, rez: RezultatTaiere, doua: boolean, mesaj: string): 'judecata' | 'refuzata' | 'nimic' {
  const doar = semnPastrat(c.pastreaza);
  const laturi: ReadonlyArray<1 | -1> = doar !== undefined ? [doar] : [1, -1];
  const mancat = (s: 1 | -1): 'da' | 'nu' | 'nehotarat' => mancatRaster(c.inainte, (q) => s * (c.n.x * q.x + c.n.y * q.y - c.v), c.intre.latime);
  if (!rez.ok) {
    if (rez.motiv === 'nimic-taiat') {
      assert.ok(!trece(c.inainte, c.n, c.v), `${mesaj}: forma trece linia, dar n-a fost tăiată`);
      return 'nimic';
    }
    assert.equal(rez.motiv, 'spatiu', `${mesaj}: refuzat cu ${rez.motiv}`);
    assert.equal(c.intre.fel, 'spatiu', `${mesaj}: suprapunerea nu mănâncă nimic`);
    assert.ok(laturi.some((s) => mancat(s) !== 'nu'), `${mesaj}: refuzat, dar oracolul nu găsește nicio bucată mâncată`);
    return 'refuzata';
  }
  if (c.intre.fel === 'spatiu') for (const s of laturi) assert.notEqual(mancat(s), 'da', `${mesaj}: o bucată de partea ${s} e mâncată, fără refuz`);
  const dupa = aplica(c.d, rez, mesaj);
  const parti = rez.ids.map((pid) => formeInstanta(dupa, pid));
  assert.deepEqual(judecaSpatiul({ inainte: c.inainte, parti, n: c.n, v: c.v, fel: c.intre.fel, latime: c.intre.latime, doua, ...(doar ? { doar } : {}) }), [], mesaj);
  return 'judecata';
}

test('spațiul și suprapunerea cu linia la orice unghi: fiecare tăiere a corpusului trece de oracol, iar documentul, de ușă', () => {
  const r = aleator(0x103c);
  const numar = { judecata: 0, refuzata: 0, nimic: 0 };
  let suprapuse = 0, pastrate = 0;
  for (let k = 0; k < 120; k++) {
    const c = caz(r, `s${k}`);
    const mesaj = `cazul ${k} (prin (${c.P.x.toFixed(3)}, ${c.P.y.toFixed(3)}) la ${c.unghi.toFixed(3)}°, ${c.intre.fel} ${c.intre.latime.toFixed(3)}, ${c.pastreaza})`;
    const rez = taie(c.d, { cutit: { fel: 'unghi', x: c.P.x, y: c.P.y, unghi: c.unghi }, alese: [`s${k}`], inchide: true, pastreaza: c.pastreaza, intre: c.intre });
    const j = judeca(c, rez, true, mesaj);
    numar[j]++;
    if (j === 'judecata' && c.intre.fel === 'suprapunere') suprapuse++;
    if (j === 'judecata' && c.pastreaza !== 'ambele') pastrate++;
  }
  assert.ok(numar.judecata >= 80, `judecate: ${numar.judecata}`);
  assert.ok(numar.refuzata >= 3, `refuzate (bucăți mâncate): ${numar.refuzata}`);
  assert.ok(numar.nimic >= 2, `nimic de tăiat: ${numar.nimic}`);
  assert.ok(suprapuse >= 30, `cu suprapunere: ${suprapuse}`);
  assert.ok(pastrate >= 25, `cu o parte păstrată: ${pastrate}`);
});

test('spațiul și suprapunerea cu cuțitul tras drept, departe de formă: fețele lui trec de oracol, fiecare de partea ei', () => {
  const r = aleator(0x103d);
  const numar = { judecata: 0, refuzata: 0, nimic: 0 };
  for (let k = 0; k < 80; k++) {
    const c = caz(r, `c${k}`);
    const A = { x: c.P.x - 2000 * c.u.x, y: c.P.y - 2000 * c.u.y }, B = { x: c.P.x + 2000 * c.u.x, y: c.P.y + 2000 * c.u.y };
    const mesaj = `cazul ${k} (prin (${c.P.x.toFixed(3)}, ${c.P.y.toFixed(3)}) la ${c.unghi.toFixed(3)}°, ${c.intre.fel} ${c.intre.latime.toFixed(3)}, ${c.pastreaza})`;
    const rez = taie(c.d, { cutit: { fel: 'cale', cale: cale(false, [A, B]) }, alese: [`c${k}`], inchide: true, pastreaza: c.pastreaza, intre: c.intre });
    numar[judeca(c, rez, false, mesaj)]++;
  }
  assert.ok(numar.judecata >= 55, `judecate: ${numar.judecata}`);
  assert.ok(numar.refuzata >= 2, `refuzate: ${numar.refuzata}`);
});

test('spațiul și suprapunerea cu cuțitul închis convex: înăuntru, din el strâns sau crescut cu w / 2; în afară, invers', () => {
  const r = aleator(0x103e);
  let judecate = 0, refuzate = 0;
  for (let k = 0; k < 70; k++) {
    const id = `k${k}`;
    const d = document([formaCorpus(r, id, 500, 500)]);
    const inainte = formeInstanta(d, id);
    // Un patrulater convex: dreptunghiul cu semilaturile a și b, rotit cu u, mutat lângă mijlocul formei.
    const c = { x: 500 + intre(r, -50, 50), y: 500 + intre(r, -50, 50) };
    const ah = intre(r, 10, 70), bh = intre(r, 10, 70), u = intre(r, 0, Math.PI);
    const poli: P[] = [[-ah, -bh], [ah, -bh], [ah, bh], [-ah, bh]].map(([x, y]) => ({
      x: c.x + (x as number) * Math.cos(u) - (y as number) * Math.sin(u), y: c.y + (x as number) * Math.sin(u) + (y as number) * Math.cos(u),
    }));
    const invers = r() < 0.5;
    const intreBucati: Intre = { fel: r() < 0.6 ? 'spatiu' : 'suprapunere', latime: r() < 0.15 ? intre(r, 10, 30) : intre(r, 0.2, 6) };
    const pastreaza = PASTRARI[Math.floor(r() * PASTRARI.length)] as Pastrare;
    const mesaj = `cazul ${k} (patrulaterul din (${c.x.toFixed(3)}, ${c.y.toFixed(3)}), ${invers ? 'tras invers' : 'trigonometric'}, ${intreBucati.fel} ${intreBucati.latime.toFixed(3)}, ${pastreaza})`;
    const rez = taie(d, { cutit: { fel: 'cale', cale: cale(true, invers ? [...poli].reverse() : poli) }, alese: [id], inchide: true, pastreaza, intre: intreBucati });
    const laturi: ReadonlyArray<1 | -1> = pastreaza === 'ambele' ? [1, -1] : [pastreaza === 'stanga' ? 1 : -1];
    const mancat = (s: 1 | -1): 'da' | 'nu' | 'nehotarat' => mancatRaster(inainte, (q) => s * distantaConvex(q, poli), intreBucati.latime);
    if (!rez.ok) {
      if (rez.motiv === 'nimic-taiat') continue;
      assert.equal(rez.motiv, 'spatiu', `${mesaj}: refuzat cu ${rez.motiv}`);
      assert.equal(intreBucati.fel, 'spatiu', `${mesaj}: suprapunerea nu mănâncă nimic`);
      assert.ok(laturi.some((s) => mancat(s) !== 'nu'), `${mesaj}: refuzat, dar oracolul nu găsește nicio bucată mâncată`);
      refuzate++;
      continue;
    }
    if (intreBucati.fel === 'spatiu') for (const s of laturi) assert.notEqual(mancat(s), 'da', `${mesaj}: o bucată de partea ${s} e mâncată, fără refuz`);
    const dupa = aplica(d, rez, mesaj);
    const forme = rez.ids.map((pid) => formeInstanta(dupa, pid));
    assert.equal(forme.length, laturi.length, `${mesaj}: câte o parte de fiecare latură păstrată`);
    const inauntru = pastreaza === 'dreapta' ? null : (forme[0] as FormaOracol[]);
    const afara = pastreaza === 'stanga' ? null : (forme[forme.length - 1] as FormaOracol[]);
    assert.deepEqual(judecaConvexMutat({ inainte, inauntru, afara, k: poli, fel: intreBucati.fel, latime: intreBucati.latime }), [], mesaj);
    judecate++;
  }
  assert.ok(judecate >= 40, `judecate: ${judecate}`);
  assert.ok(refuzate >= 1, `refuzate: ${refuzate}`);
});

test('martorul oracolului: lățimea greșită, felul greșit, tăierea fără spațiu și bucățile mâncate (sau nu) sunt prinse', () => {
  const d = docDin(stoc, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } });
  const inainte = formeInstanta(d, 'a');
  const n = { x: 1, y: 0 }, v = 150;
  const parti = (i?: Intre): FormaOracol[][] => {
    const rez = taie(d, { cutit: { fel: 'x', x: 150 }, alese: ['a'], inchide: true, ...(i ? { intre: i } : {}) });
    if (!rez.ok) assert.fail(`tăierea martorului: ${rez.motiv}`);
    const dupa = aplica(d, rez, 'martor');
    return rez.ids.map((pid) => formeInstanta(dupa, pid));
  };
  const sp = parti({ fel: 'spatiu', latime: 6 }), su = parti({ fel: 'suprapunere', latime: 6 }), fara = parti();
  assert.deepEqual(judecaSpatiul({ inainte, parti: sp, n, v, fel: 'spatiu', latime: 6, doua: true }), []);
  assert.deepEqual(judecaSpatiul({ inainte, parti: su, n, v, fel: 'suprapunere', latime: 6, doua: true }), []);
  assert.notDeepEqual(judecaSpatiul({ inainte, parti: sp, n, v, fel: 'spatiu', latime: 4, doua: true }), [], 'lățimea greșită');
  assert.notDeepEqual(judecaSpatiul({ inainte, parti: sp, n, v, fel: 'suprapunere', latime: 6, doua: true }), [], 'felul greșit');
  assert.notDeepEqual(judecaSpatiul({ inainte, parti: fara, n, v, fel: 'spatiu', latime: 6, doua: true }), [], 'fără spațiu');
  assert.notDeepEqual(judecaSpatiul({ inainte, parti: [sp[0] ?? []], n, v, fel: 'spatiu', latime: 6, doua: true }), [], 'o parte lipsă');
  // Rețeaua: fâșia de 2 mm dincolo de x = 198 e mâncată de spațiul 6; cea de 3 mm (exact jumătatea) e lângă prag; jumătatea, nu.
  assert.equal(mancatRaster(inainte, (q) => q.x - 198, 6), 'da');
  assert.equal(mancatRaster(inainte, (q) => q.x - 197, 6), 'nehotarat');
  assert.equal(mancatRaster(inainte, (q) => q.x - 150, 6), 'nu');
  // Cuțitul închis: pătratul de la (80, 80) la (140, 140), spațiul 4; lățimea greșită și partea inversată sunt prinse.
  const k = [{ x: 80, y: 80 }, { x: 140, y: 80 }, { x: 140, y: 140 }, { x: 80, y: 140 }];
  const rez = taie(d, { cutit: { fel: 'cale', cale: cale(true, k) }, alese: ['a'], inchide: true, intre: { fel: 'spatiu', latime: 4 } });
  if (!rez.ok) assert.fail(`cuțitul închis al martorului: ${rez.motiv}`);
  const dupa = aplica(d, rez, 'martor');
  const [inK, afara] = rez.ids.map((pid) => formeInstanta(dupa, pid)) as [FormaOracol[], FormaOracol[]];
  assert.deepEqual(judecaConvexMutat({ inainte, inauntru: inK, afara, k, fel: 'spatiu', latime: 4 }), []);
  assert.notDeepEqual(judecaConvexMutat({ inainte, inauntru: inK, afara, k, fel: 'spatiu', latime: 6 }), [], 'lățimea greșită');
  assert.notDeepEqual(judecaConvexMutat({ inainte, inauntru: afara, afara: inK, k, fel: 'spatiu', latime: 4 }), [], 'părțile inversate');
  assert.notDeepEqual(judecaConvexMutat({ inainte, inauntru: inK, afara, k, fel: 'suprapunere', latime: 4 }), [], 'felul greșit');
});
