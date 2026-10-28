/**
 * Ușa DXF (ADR 0101) pe corpusul independent: DXF-uri scrise de ezdxf (`test/oracles-py/dxf_import_corpus.py`), cu valorile
 * pe hârtie din `test/fixtures/dxf/asteptat.json`, scrise cu formule și verificate acolo față de entitățile exacte ale lui
 * ezdxf. Curbele (spline) au eșantioanele evaluate de ezdxf, nu de aplicație. Fiecare valoare așteptată se potrivește cu o
 * cale diferită.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { citesteDxf, type CaleDxf } from '../../src/io/dxf.ts';
import { TOLERANTA_IMPORT } from '../../src/geom/toleranta.ts';
import { abatereElipsa, aproape, arie, cercArc, cutie, distantaLaCale, esantioane, segmente } from './ajutor-dxf.ts';

type P = readonly [number, number];
type Arc = { c: P; r: number; p0: P; p1: P; mijloc: P };
type Elipsa = { c: P; a: number; b: number; rot_grade: number; p0?: P; p1?: P; mijloc?: P };
type Asteptat = {
  mm_pe_unitate: number; fara_unitati?: boolean; straturi?: string[];
  linii?: Array<[P, P]>; arce?: Arc[]; cercuri?: Array<[P, number]>; elipse?: Elipsa[]; arce_eliptice?: Elipsa[];
  arii?: Array<{ ce: string; arie: number; cutie: [number, number, number, number] }>;
  contururi?: Array<{ ce: string; arie: number; cutie: [number, number, number, number]; segmente: number }>;
  bezier?: P[]; curbe?: Array<{ ce: string; inchis: boolean; puncte: P[] }>;
  linii_frante?: Array<{ puncte: P[]; inchis: boolean }>;
  sarite?: Record<string, number>; ascunse?: number; hartie?: number; proiectate?: number; unite?: number;
  numar_cai: { inchise: number; deschise: number };
};

const DIR = 'test/fixtures/dxf';
const ASTEPTAT = JSON.parse(readFileSync(`${DIR}/asteptat.json`, 'utf8')) as Record<string, Asteptat>;

const citit = (fisier: string) => {
  const r = citesteDxf(readFileSync(`${DIR}/${fisier}`));
  if (!r.ok) assert.fail(`${fisier}: refuzat (${r.cod}${r.detaliu ? `, ${r.detaliu}` : ''})`);
  return r;
};

/** Potrivește fiecare valoare așteptată cu o cale încă nefolosită (prima care trece), sau cade cu numele valorii. */
function potriveste<T>(cai: readonly CaleDxf[], asteptate: readonly T[], trece: (c: CaleDxf, a: T) => boolean, ce: (a: T) => string): void {
  const folosite = new Set<number>();
  for (const a of asteptate) {
    const k = cai.findIndex((c, i) => !folosite.has(i) && trece(c, a));
    assert.ok(k >= 0, `lipsește ${ce(a)}`);
    folosite.add(k);
  }
}

/** Arcul (c, r) e pe cale: toate segmentele arce pe același cerc. */
const peCerc = (c: CaleDxf, centru: P, r: number, tol = 1e-9): boolean => segmente(c).every((s) => {
  if (s.s.tip !== 'A') return false;
  const k = cercArc(s.a, s.b, s.s.bulge);
  return aproape(k.c, centru, tol * Math.max(1, r)) && Math.abs(k.r - r) <= tol * Math.max(1, r);
});

test('corpusul ezdxf: patru fișiere, toate citite', () => {
  assert.deepEqual(Object.keys(ASTEPTAT).sort(), ['in-R12.dxf', 'in-R2000-toli.dxf', 'in-R2018-atelier.dxf', 'in-R2018-mm.dxf']);
});

for (const [fisier, a] of Object.entries(ASTEPTAT)) {
  test(`${fisier}: unitățile, straturile și numărul căilor`, () => {
    const r = citit(fisier);
    assert.equal(r.unitati.mmPeUnitate, a.mm_pe_unitate);
    assert.equal(r.unitati.declarate, !a.fara_unitati);
    assert.equal(r.avertismente['unitati-nedeclarate'], a.fara_unitati ? 1 : 0);
    if (a.straturi) assert.deepEqual([...new Set(r.cai.map((c) => c.strat))].sort(), [...a.straturi].sort());
    assert.deepEqual({ inchise: r.cai.filter((c) => c.inchis).length, deschise: r.cai.filter((c) => !c.inchis).length }, a.numar_cai);
    assert.equal(r.avertismente.deschise, a.numar_cai.deschise);
  });

  if (a.linii) {
    test(`${fisier}: liniile (${a.linii.length}), cu capetele exacte`, () => {
      const r = citit(fisier);
      potriveste(r.cai, a.linii ?? [], (c, [p, q]) => !c.inchis && c.varfuri.length === 2 && c.varfuri[0]?.s.tip === 'L'
        && ((aproape(c.varfuri[0].p, p) && aproape((c.varfuri[1] ?? c.varfuri[0]).p, q)) || (aproape(c.varfuri[0].p, q) && aproape((c.varfuri[1] ?? c.varfuri[0]).p, p))),
      ([p, q]) => `linia ${JSON.stringify(p)}–${JSON.stringify(q)}`);
    });
  }

  if (a.cercuri) {
    test(`${fisier}: cercurile (${a.cercuri.length}), ca două semicercuri trigonometrice din punctul cel mai din dreapta`, () => {
      const r = citit(fisier);
      potriveste(r.cai, a.cercuri ?? [], (c, [centru, raza]) => {
        const [v0, v1] = c.varfuri;
        return c.inchis && c.varfuri.length === 2 && v0 !== undefined && v1 !== undefined
          && v0.s.tip === 'A' && v0.s.bulge === 1 && v1.s.tip === 'A' && v1.s.bulge === 1
          && aproape(v0.p, [centru[0] + raza, centru[1]]) && aproape(v1.p, [centru[0] - raza, centru[1]]);
      }, ([centru, raza]) => `cercul ${JSON.stringify(centru)} R${raza}`);
    });
  }

  if (a.arce) {
    test(`${fisier}: arcele (${a.arce.length}), în sensul din fișier, prin mijlocul lor`, () => {
      const r = citit(fisier);
      potriveste(r.cai, a.arce ?? [], (c, arc) => !c.inchis && c.varfuri.length >= 2 && aproape((c.varfuri[0] as CaleDxf['varfuri'][number]).p, arc.p0)
        && aproape((c.varfuri[c.varfuri.length - 1] as CaleDxf['varfuri'][number]).p, arc.p1) && peCerc(c, arc.c, arc.r)
        && distantaLaCale({ x: arc.mijloc[0], y: arc.mijloc[1] }, c) <= 1e-9 * Math.max(1, arc.r), (arc) => `arcul ${JSON.stringify(arc)}`);
    });
  }

  if (a.elipse) {
    test(`${fisier}: elipsele (${a.elipse.length}), cubice sub toleranța importului, cu aria πab`, () => {
      const r = citit(fisier);
      potriveste(r.cai, a.elipse ?? [], (c, e) => c.inchis && segmente(c).every((s) => s.s.tip === 'C')
        && esantioane(c).every((p) => abatereElipsa(p, e) * e.b <= TOLERANTA_IMPORT * 1.01)
        && Math.abs(Math.abs(arie(c)) - Math.PI * e.a * e.b) <= 1e-5 * Math.PI * e.a * e.b, (e) => `elipsa ${JSON.stringify(e)}`);
    });
  }

  if (a.arce_eliptice) {
    test(`${fisier}: arcele eliptice (${a.arce_eliptice.length}), de la p0 la p1 prin mijlocul lor, pe elipsă`, () => {
      const r = citit(fisier);
      // Mijlocul parametric (scris de generator, verificat față de ezdxf) spune pe care parte a elipsei merge arcul.
      potriveste(r.cai, a.arce_eliptice ?? [], (c, e) => !c.inchis && aproape((c.varfuri[0] as CaleDxf['varfuri'][number]).p, e.p0 ?? [0, 0])
        && aproape((c.varfuri[c.varfuri.length - 1] as CaleDxf['varfuri'][number]).p, e.p1 ?? [0, 0])
        && segmente(c).every((s) => s.s.tip === 'C') && esantioane(c).every((p) => abatereElipsa(p, e) * e.b <= TOLERANTA_IMPORT * 1.01)
        && distantaLaCale({ x: e.mijloc?.[0] ?? 0, y: e.mijloc?.[1] ?? 0 }, c) <= TOLERANTA_IMPORT * 1.01, (e) => `arcul eliptic ${JSON.stringify(e)}`);
    });
  }

  if (a.arii) {
    test(`${fisier}: ariile și cutiile (${a.arii.length})`, () => {
      const r = citit(fisier);
      potriveste(r.cai, a.arii ?? [], (c, x) => {
        const k = cutie(c);
        return c.inchis && Math.abs(Math.abs(arie(c)) - x.arie) <= 1e-9 * x.arie
          && [k.minX, k.minY, k.maxX, k.maxY].every((v, i) => Math.abs(v - (x.cutie[i] as number)) <= 1e-9);
      }, (x) => x.ce);
    });
  }

  if (a.contururi) {
    test(`${fisier}: contururile legate din bucăți (${a.contururi.length}): închise, cu aria, cutia și segmentele lor`, () => {
      const r = citit(fisier);
      potriveste(r.cai, a.contururi ?? [], (c, x) => {
        const k = cutie(c);
        return c.inchis && segmente(c).length === x.segmente && Math.abs(Math.abs(arie(c)) - x.arie) <= 1e-9 * x.arie
          && [k.minX, k.minY, k.maxX, k.maxY].every((v, i) => Math.abs(v - (x.cutie[i] as number)) <= 1e-9);
      }, (x) => x.ce);
    });
  }

  if (a.bezier) {
    test(`${fisier}: Bézier-ul, o singură cubică cu punctele de control din fișier`, () => {
      const r = citit(fisier);
      const [p0, p1, p2, p3] = a.bezier ?? [];
      potriveste(r.cai, [0], (c) => {
        const [v0, v1] = c.varfuri;
        return !c.inchis && c.varfuri.length === 2 && v0 !== undefined && v1 !== undefined && v0.s.tip === 'C' && p0 !== undefined && p1 !== undefined
          && p2 !== undefined && p3 !== undefined && aproape(v0.p, p0, 1e-12) && aproape(v0.s.c1, p1, 1e-12) && aproape(v0.s.c2, p2, 1e-12) && aproape(v1.p, p3, 1e-12);
      }, () => 'Bézier-ul');
    });
  }

  for (const curba of a.curbe ?? []) {
    test(`${fisier}: ${curba.ce}, prin toate cele ${curba.puncte.length} puncte evaluate de ezdxf (sub 1e-9 mm)`, () => {
      const r = citit(fisier);
      const p0 = curba.puncte[0] as P, pn = curba.puncte[curba.puncte.length - 1] as P;
      const c = r.cai.find((x) => x.inchis === curba.inchis && curba.puncte.every((q) => distantaLaCale({ x: q[0], y: q[1] }, x) <= 1e-9));
      assert.ok(c, `nicio cale ${curba.inchis ? 'închisă' : 'deschisă'} prin punctele lui ezdxf`);
      // Exactă: doar cubice (descompunerea în Bézier, fără aproximare).
      assert.ok(segmente(c).every((s) => s.s.tip === 'C'));
      if (!curba.inchis) {
        assert.ok(aproape((c.varfuri[0] as CaleDxf['varfuri'][number]).p, p0, 1e-12));
        assert.ok(aproape((c.varfuri[c.varfuri.length - 1] as CaleDxf['varfuri'][number]).p, pn, 1e-9));
      }
    });
  }

  if (a.linii_frante) {
    test(`${fisier}: poliliniile frânte (${a.linii_frante.length}), vârf cu vârf`, () => {
      const r = citit(fisier);
      potriveste(r.cai, a.linii_frante ?? [], (c, x) => c.inchis === x.inchis && c.varfuri.length === x.puncte.length
        && c.varfuri.every((v, i) => v.s.tip === 'L' && aproape(v.p, x.puncte[i] as P)), (x) => JSON.stringify(x.puncte));
    });
  }

  test(`${fisier}: raportul (sărite, ascunse, spațiul hârtiei, proiectate, unite)`, () => {
    const r = citit(fisier);
    const sarite = a.sarite ?? {};
    const cod: Record<string, keyof typeof r.avertismente> = { TEXT: 'sarit-text', MTEXT: 'sarit-text', HATCH: 'sarit-hasura', POINT: 'sarit-punct', '3DFACE': 'sarit-3d' };
    const asteptate = new Map<string, number>();
    for (const [tip, n] of Object.entries(sarite)) {
      const k = cod[tip];
      assert.ok(k, `tipul ${tip} n-are cod în probă`);
      asteptate.set(k, (asteptate.get(k) ?? 0) + n);
    }
    for (const k of ['sarit-text', 'sarit-hasura', 'sarit-punct', 'sarit-3d', 'sarit-cota', 'sarit-imagine', 'sarit-altele'] as const) {
      assert.equal(r.avertismente[k], asteptate.get(k) ?? 0, k);
    }
    assert.equal(r.avertismente.ascunse, a.ascunse ?? 0);
    assert.equal(r.avertismente.hartie, a.hartie ?? 0);
    assert.equal(r.avertismente.proiectate, a.proiectate ?? 0);
    assert.equal(r.avertismente.unite, a.unite ?? 0);
    for (const k of ['degenerate', 'sub-rezolutie', 'prea-mari', 'blocuri-lipsa', 'blocuri-adanci', 'eroare-date', 'spline-invalide', 'spline-fara-control', 'goluri'] as const) {
      assert.equal(r.avertismente[k], 0, k);
    }
  });
}
