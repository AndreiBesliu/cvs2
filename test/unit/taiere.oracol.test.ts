/**
 * Tăierea cu o linie dreaptă (ADR 0180, felia 10.3↑), judecată de oracolul independent (`test/oracles/taiere.ts`) pe un corpus
 * din sămânță: dreptunghiuri (și cu colțuri rotunjite), cercuri, poligoane, forme din cubice, căi deschise (linii și cubice),
 * contururi cu arce, inele (o piesă cu o gaură), la locuri și rotiri oarecare, tăiate cu linii verticale și orizontale, cu și
 * fără închidere. Fiecare tăiere: acoperirea, nimic inventat, părțile de o parte și de alta, aria fiecărei părți (cu închidere),
 * documentul de după trecut prin ușă; un „nimic de tăiat” e verificat de oracol (forma chiar nu trece linia).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, FormaDoc, Nod, Operatie, VarfDoc } from '../../src/model/document.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie } from '../../src/model/taiere.ts';
import { esantioane, formeInstanta, judecaTaierea } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';

/** Generatorul din sămânță (mulberry32): același corpus la fiecare rulare. */
function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const L = { tip: 'L' } as const;
type Gen = (r: () => number) => FormaDoc;
const intre = (r: () => number, a: number, b: number): number => a + (b - a) * r();

const GENERATORI: Record<string, Gen> = {
  dreptunghi: (r) => {
    const w = intre(r, 20, 120), h = intre(r, 20, 120);
    return { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: r() < 0.5 ? 0 : intre(r, 0, 0.4 * Math.min(w, h)) };
  },
  cerc: (r) => ({ tip: 'cerc', raza: intre(r, 10, 60) }),
  poligon: (r) => {
    const n = 5 + Math.floor(r() * 36);
    const varfuri: VarfDoc[] = [];
    for (let k = 0; k < n; k++) {
      const u = (2 * Math.PI * k) / n, rz = intre(r, 30, 60);
      varfuri.push({ p: { x: rz * Math.cos(u), y: rz * Math.sin(u) }, s: L });
    }
    return { tip: 'cale', inchis: true, varfuri };
  },
  cubice: (r) => {
    const n = 4 + Math.floor(r() * 4);
    const p = Array.from({ length: n }, (_, k) => {
      const u = (2 * Math.PI * k) / n, rz = intre(r, 30, 55);
      return { x: rz * Math.cos(u), y: rz * Math.sin(u) };
    });
    // Catmull-Rom închis, în cubice: mânerele din vecini.
    const varfuri: VarfDoc[] = p.map((q, k) => {
      const prev = p[(k - 1 + n) % n] as { x: number; y: number }, urm = p[(k + 1) % n] as { x: number; y: number }, urm2 = p[(k + 2) % n] as { x: number; y: number };
      return {
        p: { x: q.x, y: q.y },
        s: { tip: 'C', c1: { x: q.x + (urm.x - prev.x) / 6, y: q.y + (urm.y - prev.y) / 6 }, c2: { x: urm.x - (urm2.x - q.x) / 6, y: urm.y - (urm2.y - q.y) / 6 } },
      };
    });
    return { tip: 'cale', inchis: true, varfuri };
  },
  arce: (r) => {
    const n = 4 + Math.floor(r() * 5);
    const varfuri: VarfDoc[] = [];
    for (let k = 0; k < n; k++) {
      const u = (2 * Math.PI * k) / n;
      varfuri.push({ p: { x: 50 * Math.cos(u), y: 50 * Math.sin(u) }, s: { tip: 'A', bulge: (r() < 0.5 ? -1 : 1) * intre(r, 0.1, 0.5) } });
    }
    return { tip: 'cale', inchis: true, varfuri };
  },
  linii: (r) => {
    const n = 3 + Math.floor(r() * 6);
    return { tip: 'cale', inchis: false, varfuri: Array.from({ length: n }, (_, k): VarfDoc => ({ p: { x: k * intre(r, 10, 30) - 60, y: intre(r, -50, 50) }, s: L })) };
  },
  curba: (r) => {
    const n = 3 + Math.floor(r() * 3);
    const varfuri: VarfDoc[] = Array.from({ length: n }, (_, k): VarfDoc => {
      const x = k * 40 - 60, y = intre(r, -40, 40);
      return { p: { x, y }, s: { tip: 'C', c1: { x: x + 13, y: y + intre(r, -40, 40) }, c2: { x: x + 27, y: y + intre(r, -40, 40) } } };
    });
    const ultim = varfuri[n - 1] as VarfDoc;
    varfuri[n - 1] = { ...ultim, s: L };
    return { tip: 'cale', inchis: false, varfuri };
  },
};

/** Un inel: exteriorul (cerc sau dreptunghi) și o gaură, cu rolul exterior (golul pe interior). */
function inel(r: () => number, id: string, scula: Operatie['scula']): { readonly radacina: Nod; readonly operatii: Operatie[] } {
  const R = intre(r, 40, 60), g = intre(r, 8, R - 15);
  const exterior: FormaDoc = r() < 0.5 ? { tip: 'cerc', raza: R } : { tip: 'dreptunghi', latime: 2 * R, inaltime: 2 * R, razaColt: 0 };
  const mExt = exterior.tip === 'cerc' ? { ...ID } : { ...ID, e: -R, f: -R };
  const op = (oid: string, latura: 'exterior' | 'interior', noduri: string[]): Operatie => ({
    id: oid, tip: 'profil', noduri, scula, latura, sens: 'urcare', adancime: 5, pas: 2.5, urechi: null, rampa: null, intrari: null, colturi: null,
  });
  return {
    radacina: {
      tip: 'grup', id, matrice: { ...ID }, copii: [
        { tip: 'element', id: `${id}o`, forma: exterior, matrice: mExt },
        { tip: 'element', id: `${id}g`, forma: { tip: 'cerc', raza: g }, matrice: { ...ID, e: intre(r, -3, 3), f: intre(r, -3, 3) } },
      ],
    },
    operatii: [op('exterior', 'exterior', [`${id}o`]), op('interior', 'interior', [`${id}g`])],
  };
}

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const NUME = Object.keys(GENERATORI);

test('corpusul din sămânță: fiecare tăiere trece de oracol (acoperirea, nimic inventat, părțile, aria), iar documentul, de ușă', () => {
  const r = aleator(0x10_3);
  let taieri = 0, inchise = 0, nimic = 0;
  for (let caz = 0; caz < 160; caz++) {
    const fel = r() < 0.15 ? 'inel' : (NUME[Math.floor(r() * NUME.length)] as string);
    const id = `s${caz}`;
    const x = intre(r, 150, 850), y = intre(r, 150, 850);
    const baza = docDin(stoc, { id, forma: fel === 'inel' ? { tip: 'cerc', raza: 1 } : (GENERATORI[fel] as Gen)(r), matrice: { ...ID, e: x, f: y } });
    let d: Document = baza;
    const foaie = baza.foi[0];
    assert.ok(foaie);
    const rotire = [0, 90, 180, 270][Math.floor(r() * 4)] as number;
    d = { ...d, foi: [{ ...foaie, instante: foaie.instante.map((i) => ({ ...i, rotire })) }] };
    if (fel === 'inel') {
      const p0 = d.piese[0];
      assert.ok(p0);
      d = { ...d, piese: [{ ...p0, ...inel(r, id, (p0.operatii[0] as Operatie).scula) }] };
    }
    const inainte = formeInstanta(d, id);
    const xs = inainte.flatMap((f) => esantioane(f, 8));
    const axa: 'x' | 'y' = r() < 0.5 ? 'x' : 'y';
    const lo = Math.min(...xs.map((q) => (axa === 'x' ? q.x : q.y))), hi = Math.max(...xs.map((q) => (axa === 'x' ? q.x : q.y)));
    // De cele mai multe ori prin formă; uneori pe lângă ea (atunci trebuie să nu se taie nimic).
    const v = r() < 0.9 ? intre(r, lo + 0.05 * (hi - lo), hi - 0.05 * (hi - lo)) : hi + intre(r, 1, 20);
    const inchide = r() < 0.6;
    const rez = taie(d, { cutit: axa === 'x' ? { fel: 'x', x: v } : { fel: 'y', y: v }, alese: [id], inchide });
    const mesaj = `cazul ${caz} (${fel}, rotire ${rotire}, ${axa} = ${v}, ${inchide ? 'cu' : 'fără'} închidere)`;
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      const fete = inainte.flatMap((f) => esantioane(f, 32)).map((q) => (axa === 'x' ? q.x : q.y) - v);
      assert.ok(!(Math.min(...fete) < -1e-7 && Math.max(...fete) > 1e-7), `${mesaj}: forma trece linia, dar n-a fost tăiată`);
      nimic++;
      continue;
    }
    const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
    assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), `${mesaj}: documentul de după trece de ușă`);
    const parti = rez.ids.map((pid) => formeInstanta(dupa, pid));
    const rau = judecaTaierea({ inainte, parti, axa, v, inchide });
    assert.deepEqual(rau, [], mesaj);
    taieri++;
    if (inchide) inchise++;
  }
  assert.ok(taieri >= 120, `tăieri judecate: ${taieri}`);
  assert.ok(inchise >= 60, `cu închidere: ${inchise}`);
  assert.ok(nimic >= 5, `nimic de tăiat, verificat: ${nimic}`);
});

test('martorul oracolului: o tăiere stricată (o bucată lipsă, o parte mutată peste linie) e prinsă', () => {
  const d = docDin(stoc, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } });
  const rez = taie(d, { cutit: { fel: 'x', x: 150 }, alese: ['a'], inchide: true });
  if (!rez.ok) assert.fail(rez.motiv);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
  const inainte = formeInstanta(d, 'a');
  const [a, b] = rez.ids.map((pid) => formeInstanta(dupa, pid));
  assert.deepEqual(judecaTaierea({ inainte, parti: [a ?? [], b ?? []], axa: 'x', v: 150, inchide: true }), []);
  assert.notDeepEqual(judecaTaierea({ inainte, parti: [a ?? [], []], axa: 'x', v: 150, inchide: true }), [], 'o parte lipsă');
  assert.notDeepEqual(judecaTaierea({ inainte, parti: [b ?? [], a ?? []], axa: 'x', v: 150, inchide: true }), [], 'părțile inversate');
  assert.notDeepEqual(judecaTaierea({ inainte, parti: [a ?? [], b ?? []], axa: 'x', v: 140, inchide: true }), [], 'altă linie');
});
