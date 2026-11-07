/**
 * Netezirea (ADR 0180 §9, §11; felia 10.3↑e), judecată de oracolul independent (`test/oracles/taiere.ts`, `judecaConversia`
 * cu `judecaNetezirea`) pe un corpus din sămânță, cu documentul de după trecut prin ușă: poligoane regulate fine și elipse
 * (închise), sinusuri (deschise), treptele unei trasări la toleranța pasului, V-uri cu ramuri curbe și colțul între 70° și
 * 150°, căi mixte (șiruri scurte, o linie lungă, un arc, o cubică) și litere cu gaură, sub matrici de element oarecare
 * (rotite, scalate, oglindite, întinse neuniform) și instanțe rotite. Fiecare formă schimbată stă la cel mult toleranța de
 * cea veche (Hausdorff măsurat din nou), păstrează arcele, curbele, liniile lungi și colțurile ascuțite, n-are frânturi
 * ascuțite noi; un poligon fin (săgeata sub jumătate din toleranță) se netezește sigur.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { converteste } from '../../src/model/conversie.ts';
import type { Document, FormaDoc, Instanta, Nod, Operatie, Piesa, VarfDoc } from '../../src/model/document.ts';
import { executa, istoricNou, type Comanda } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { formeInstanta, judecaConversia, judecaNetezirea, type FormaOracol } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, document, intre, stoc } from './ajutor-taiere.ts';

type Mat = { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
type Cale = Extract<FormaDoc, { tip: 'cale' }>;
const L = { tip: 'L' } as const;
const rotiri = [0, 90, 180, 270] as const;
const cale = (inchis: boolean, p: ReadonlyArray<readonly [number, number]>): Cale => ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });

function matrice(r: () => number, neuniform: boolean): Mat {
  const u = intre(r, 0, 2 * Math.PI), s = intre(r, 0.5, 2.5), o = r() < 0.25 ? -1 : 1, sy = neuniform ? s * intre(r, 1.3, 2) : s;
  return { a: s * Math.cos(u), b: s * Math.sin(u), c: -sy * o * Math.sin(u), d: sy * o * Math.cos(u), e: 0, f: 0 };
}

function piesa(id: string, radacina: Nod | FormaDoc, m: Mat, x: number, y: number, rotire: number): { readonly piesa: Piesa; readonly instanta: Instanta } {
  const d = docDin(stoc, { id, forma: 'tip' in radacina && radacina.tip !== 'grup' && radacina.tip !== 'element' ? radacina as FormaDoc : cale(true, [[0, 0], [1, 0], [0, 1]]), matrice: { ...m, e: x, f: y } });
  let p = d.piese[0] as Piesa;
  if ('tip' in radacina && (radacina.tip === 'grup')) {
    const op = (oid: string, latura: 'exterior' | 'interior', nod: string): Operatie => ({ ...(p.operatii[0] as Operatie), id: oid, latura, noduri: [nod] });
    const copii = (radacina as Extract<Nod, { tip: 'grup' }>).copii;
    p = { ...p, radacina: { ...radacina, matrice: { ...m, e: 0, f: 0 } } as Nod, operatii: [op(`${id}e`, 'exterior', copii[0]?.id ?? ''), op(`${id}i`, 'interior', copii[1]?.id ?? '')] };
  }
  return { piesa: p, instanta: { ...(d.foi[0]?.instante[0] as Instanta), rotire } };
}

const regulat = (n: number, R: number, u0 = 0): Array<readonly [number, number]> =>
  Array.from({ length: n }, (_, k) => [R * Math.cos(u0 + (2 * Math.PI * k) / n), R * Math.sin(u0 + (2 * Math.PI * k) / n)] as const);

function aplica(d: Document, piese: readonly Piesa[], mesaj: string): Document {
  const vechi = new Map(d.piese.map((p) => [p.id, p]));
  const comenzi: Comanda[] = piese.map((p) => ({ tip: 'inlocuieste-piesa', vechi: vechi.get(p.id) as Piesa, nou: p }));
  const dupa = executa(istoricNou(d), { tip: 'lot', comenzi }).doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), `${mesaj}: documentul de după trece de ușă`);
  return dupa;
}

test('netezirea, pe corpusul din sămânță: la cel mult toleranța, cu arcele, curbele, liniile lungi și colțurile păstrate, fără frânturi noi', () => {
  const r = aleator(0x10_3e_01);
  const n: Record<string, number> = { cerc: 0, cercSigur: 0, elipsa: 0, sinus: 0, trepte: 0, colt: 0, mixt: 0, litera: 0, neuniform: 0, schimbate: 0 };
  for (let caz = 0; caz < 56; caz++) {
    const id = `n${caz}`;
    const fel = ['cerc', 'elipsa', 'sinus', 'trepte', 'colt', 'mixt', 'litera'][caz % 7] as string;
    // Oracolul scrie arcul în lume ca arc de cerc: familiile cu arce (mixt, jumătate din cercuri) primesc doar similitudini.
    const cuArc = fel === 'mixt' || (fel === 'cerc' && r() < 0.5);
    const neuniform = !cuArc && r() < 0.25;
    const m = matrice(r, neuniform);
    const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    let tol = Math.exp(intre(r, Math.log(0.005), Math.log(0.2)));
    const pastreaza = intre(r, 1, 10);
    let radacina: Nod | FormaDoc;
    let sigur = false;
    if (fel === 'cerc') {
      const k = 96 + Math.floor(r() * 96), R = intre(r, 5, 30);
      const c = cale(true, regulat(k, R, intre(r, 0, 1)));
      // Jumătate din cercuri au un arc păstrat la mijloc: vârful 0 cade atunci în mijlocul unui șir și trebuie să rămână vârf.
      radacina = !cuArc ? c : { ...c, varfuri: c.varfuri.map((x, j): VarfDoc => (j === k >> 1 ? { ...x, s: { tip: 'A', bulge: Math.tan(Math.PI / (2 * k)) } } : x)) };
      // Un poligon fin: săgeata (în lume, cu scara cea mai mare) sub jumătate din toleranță și laturile scurte.
      const smax = neuniform ? s * 2 : s;
      sigur = smax * R * (1 - Math.cos(Math.PI / k)) <= tol / 2 && smax * 2 * R * Math.sin(Math.PI / k) <= pastreaza;
    } else if (fel === 'elipsa') {
      const k = 96 + Math.floor(r() * 96), A = intre(r, 10, 40), B = intre(r, 5, 25);
      radacina = cale(true, Array.from({ length: k }, (_, j) => [A * Math.cos((2 * Math.PI * j) / k), B * Math.sin((2 * Math.PI * j) / k)] as const));
    } else if (fel === 'sinus') {
      const h = intre(r, 0.4, 2), A = intre(r, 3, 15), lam = intre(r, 4, 12);
      radacina = cale(false, Array.from({ length: Math.floor(60 / h) + 1 }, (_, j) => [j * h, A * Math.sin((j * h) / lam)] as const));
    } else if (fel === 'trepte') {
      const p = intre(r, 0.3, 1);
      tol = Math.min(1, p * intre(r, 0.6, 1.2));
      const y = (x: number): number => Math.round((10 * Math.sin(x / 10)) / p) * p;
      const pts: Array<readonly [number, number]> = [[0, y(0)]];
      for (let k = 1; k * p <= 31; k++) {
        const x = k * p, u = pts[pts.length - 1] as readonly [number, number];
        pts.push([x, u[1]]);
        if (y(x) !== u[1]) pts.push([x, y(x)]);
      }
      radacina = cale(false, pts);
    } else if (fel === 'colt') {
      // Două ramuri curbe din (0, 0), la unghiurile ±(întoarcerea / 2) față de axa x, din 0,5 în 0,5 mm.
      const turn = intre(r, (70 * Math.PI) / 180, (150 * Math.PI) / 180), h = 0.5, k = 40;
      const ramura = (u: number, semn: number): Array<readonly [number, number]> => Array.from({ length: k }, (_, j) => {
        const t = (k - j) * h, c = Math.cos(u), si = Math.sin(u);
        return [semn * (t * c - 0.01 * t * t * si), t * si + 0.01 * t * t * c] as const;
      });
      const stanga = ramura(Math.PI / 2 - turn / 2, -1);
      const dreapta = ramura(Math.PI / 2 - turn / 2, 1).reverse();
      radacina = cale(false, [...stanga, [0, 0], ...dreapta]);
    } else if (fel === 'mixt') {
      // Șir scurt pe un arc de cerc, o linie lungă, un arc, o cubică, un șir scurt pe un sinus.
      const v: VarfDoc[] = [];
      for (let j = 0; j < 30; j++) v.push({ p: { x: -20 + 20 * Math.cos(Math.PI - (j * Math.PI) / 60), y: 20 * Math.sin(Math.PI - (j * Math.PI) / 60) }, s: L });
      v.push({ p: { x: -20 + 20 * Math.cos(Math.PI / 2), y: 20 }, s: L });
      v.push({ p: { x: -20 + 20 * Math.cos(Math.PI / 2) + pastreaza + 5, y: 20 }, s: { tip: 'A', bulge: -0.3 } });
      const z = { x: pastreaza + 20, y: 12 };
      v.push({ p: z, s: { tip: 'C', c1: { x: z.x + 6, y: z.y - 2 }, c2: { x: z.x + 10, y: z.y - 8 } } });
      for (let j = 0; j <= 30; j++) v.push({ p: { x: z.x + 12 + j * 0.8, y: z.y - 10 + 3 * Math.sin(j / 4) }, s: L });
      radacina = { tip: 'cale', inchis: false, varfuri: v };
    } else {
      radacina = {
        tip: 'grup', id, matrice: { ...ID }, copii: [
          { tip: 'element', id: `${id}x`, forma: cale(true, regulat(160, 30)), matrice: { ...ID } },
          { tip: 'element', id: `${id}y`, forma: cale(true, regulat(128, 18, 0.3)), matrice: { ...ID, e: intre(r, -3, 3), f: intre(r, -3, 3) } },
        ],
      };
    }
    const f = piesa(id, radacina, m, intre(r, 300, 700), intre(r, 300, 700), rotiri[Math.floor(r() * 4)] as number);
    const d = document([f]);
    const mesaj = `cazul ${caz} (${fel}, toleranța ${tol.toFixed(4)}, „Păstrează” ${pastreaza.toFixed(2)}, scara ${s.toFixed(3)}${neuniform ? ', neuniform' : ''})`;
    const rez = converteste(d, { fel: 'netezire', alese: [id], toleranta: tol, pastreaza });
    assert.ok(rez.ok, `${mesaj}: refuzat`);
    if (!rez.ok) continue;
    const inainte = formeInstanta(d, id);
    const dupa = rez.piese.length > 0 ? formeInstanta(aplica(d, rez.piese, mesaj), id) : inainte;
    const j = judecaConversia({ inainte, dupa, fel: 'netezire', toleranta: tol, pastreaza });
    assert.deepEqual(j.rau, [], mesaj);
    assert.equal(j.schimbate, rez.convertite, `${mesaj}: formele schimbate, numărate`);
    assert.ok(j.abatere <= rez.abatere + 1e-6, `${mesaj}: abaterea măsurată ${j.abatere}, spusă ${rez.abatere}`);
    assert.ok(rez.abatere <= tol + 1e-9, `${mesaj}: abaterea spusă ${rez.abatere}`);
    if (sigur) { assert.equal(j.schimbate, 1, `${mesaj}: un poligon fin se netezește`); n.cercSigur = (n.cercSigur ?? 0) + 1; }
    n[fel] = (n[fel] ?? 0) + 1;
    if (neuniform) n.neuniform = (n.neuniform ?? 0) + 1;
    if (j.schimbate > 0) n.schimbate = (n.schimbate ?? 0) + 1;
  }
  assert.ok(Object.entries(n).every(([k, v]) => v >= (k === 'cercSigur' ? 2 : 4)), JSON.stringify(n));
});

test('martorul oracolului netezirii: un colț rotunjit, o linie lungă schimbată, o cubică nouă între puncte noi, un arc pierdut sunt prinse', () => {
  const unghi = (x: number, y: number): FormaOracol => ({ inchis: false, seg: [{ fel: 'L', a: { x: -10, y: 0 }, b: { x: 0, y: 0 } }, { fel: 'L', a: { x: 0, y: 0 }, b: { x: 0, y: 10 } }].map((s) => ({ ...s, a: { x: s.a.x + x, y: s.a.y + y }, b: { x: s.b.x + x, y: s.b.y + y } })) as FormaOracol['seg'] });
  // Un colț de 90° din linii de 1 mm: rotunjit (o cubică peste el), prins; păstrat, nu.
  const scurte: FormaOracol = { inchis: false, seg: [] };
  const pts = [...Array.from({ length: 10 }, (_, k) => ({ x: k - 10, y: 0 })), { x: 0, y: 0 }, ...Array.from({ length: 10 }, (_, k) => ({ x: 0, y: k + 1 }))];
  const segs = pts.slice(0, -1).map((p, k) => ({ fel: 'L' as const, a: p, b: pts[k + 1] as { x: number; y: number } }));
  const cuSeg = (s: FormaOracol['seg']): FormaOracol => ({ inchis: false, seg: s });
  Object.assign(scurte, cuSeg(segs));
  const rotunjit = cuSeg([...segs.slice(0, 8), { fel: 'C', a: { x: -2, y: 0 }, c1: { x: -1, y: 0 }, c2: { x: 0, y: 1 }, b: { x: 0, y: 2 } }, ...segs.slice(12)]);
  assert.notDeepEqual(judecaNetezirea(scurte, rotunjit, 0.5, 5), [], 'colțul rotunjit');
  assert.deepEqual(judecaNetezirea(scurte, scurte, 0.5, 5), [], 'neschimbat');
  // O linie lungă (10 mm, „Păstrează” 5) schimbată într-o cubică: prinsă.
  const lunga = unghi(0, 0);
  const schimbata = cuSeg([{ fel: 'C', a: { x: -10, y: 0 }, c1: { x: -6, y: 0 }, c2: { x: -3, y: 0 }, b: { x: 0, y: 0 } }, lunga.seg[1] as FormaOracol['seg'][number]]);
  assert.notDeepEqual(judecaNetezirea(lunga, schimbata, 0.01, 5), [], 'linia lungă schimbată');
  // O cubică nouă care pleacă dintr-un punct care nu era vârf: prinsă.
  const mutata = cuSeg([...segs.slice(0, 5), { fel: 'C', a: { x: -5, y: 0 }, c1: { x: -4, y: 0.001 }, c2: { x: -3, y: 0.001 }, b: { x: -2.5, y: 0 } }, { fel: 'L', a: { x: -2.5, y: 0 }, b: { x: -2, y: 0 } }, ...segs.slice(8)]);
  assert.notDeepEqual(judecaNetezirea(scurte, mutata, 0.01, 5), [], 'o cubică între puncte noi');
  // Un arc pierdut (devenit linie): prins.
  const cuArc: FormaOracol = { inchis: false, seg: [{ fel: 'A', a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, c: { x: 5, y: 0 }, r: 5, u0: Math.PI, du: -Math.PI }] };
  assert.notDeepEqual(judecaNetezirea(cuArc, cuSeg([{ fel: 'L', a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }]), 1, 5), [], 'arcul pierdut');
});
