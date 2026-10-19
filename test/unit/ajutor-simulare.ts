/**
 * Ajutorul testelor NUCLEULUI de simulare (ADR 0047): piesele oracolului (`test/oracles/simulare.cazuri.ts`) trecute în
 * programul IR al aplicației, cu convenția de legătură din antetul cazurilor, apoi prin nucleu; câmpul nucleului citit
 * dens pe aceleași bucăți (toată grila, sau ferestrele plăcii mari) pe care le judecă oracolul.
 *
 * Nucleul primește IR-ul (numerele, cu arcele native); oracolul citește textul G-code al cazului. Nimic din oracol nu
 * intră în nucleu: de la el se iau doar verificările.
 */
import type { CazSimulare, MutareCaz } from '../oracles/simulare.cazuri.ts';
import {
  compara, grilaFereastra, judeca, latimeRadiala, minim, sectiuneBila, unghiV, verificaHartie,
  type GrilaOracol, type RezultatOracol,
} from '../oracles/simulare.ts';
import { AXE_XYZ, type FormaScula, type Miscare, type Program } from '../../src/ir/ir.ts';
import { campNou, compacteaza, valoare, type Banda, type Camp, type ParametriCamp } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';

/** Piesele pe care nucleul nu le simulează: scula de profil nu e o formă a sculelor aplicației (ADR 0047 §2). */
export const FARA_NUCLEU: readonly string[] = ['profil-h(r)', 'profil-rampa'];

/** Piesele corpusului, pe cele două fișiere de probe (`simulare.corpus.test.ts`, `simulare.corpus2.test.ts`), după timp. */
export const PIESE_1: readonly string[] = [
  'sant-plat', 'sant-bila', 'sant-v90', 'sant-v60', 'arc-g3', 'arc-g2-R', 'cerc-complet', 'arc-mare-R-neg', 'plonjare-plata',
  'mic-0.01', 'dublat',
];
export const PIESE_2: readonly string[] = [
  'plonjare-bila', 'rampa-plata', 'mare-2440', 'tangent', 'aproape-coincident', 'elice', 'gravura-v60', 'rampa-bila', 'rampa-v90',
];

/** Forma sculei unui caz, ca în IR; `null` pentru profil. */
export function formaCaz(c: CazSimulare): FormaScula | null {
  const s = c.scula;
  if (s.tip === 'plata') return { tip: 'plata' };
  if (s.tip === 'bila') return { tip: 'bila' };
  if (s.tip === 'v') return { tip: 'v', unghi: s.unghi };
  return null;
}

/**
 * Programul IR al cazului, cu convenția de legătură a corpusului: `Z5` la început; înaintea fiecărei mutări al cărei start
 * diferă de poziția curentă: rapida la Z5, rapida la startul în XY, coborârea (o tăiere) la Z-ul startului; la sfârșit Z5.
 */
export function programCaz(c: CazSimulare, mutari: readonly MutareCaz[] = c.mutari): Program {
  const forma = formaCaz(c);
  if (!forma) throw new Error(`${c.id}: scula de profil nu are formă în IR`);
  const m: Miscare[] = [{ tip: 'rapida', la: { Z: 5 } }];
  let poz: readonly [number, number, number] | undefined;
  for (const x of mutari) {
    const [ax, ay, az] = x.a;
    if (!poz || poz[0] !== ax || poz[1] !== ay || poz[2] !== az) {
      m.push({ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: ax, Y: ay } }, { tip: 'taiere', la: { Z: az }, avans: 300 });
    }
    const [bx, by, bz] = x.b;
    m.push(x.tip === 'linie'
      ? { tip: 'taiere', la: { X: bx, Y: by, Z: bz }, avans: 1000 }
      : { tip: 'arc', la: { X: bx, Y: by, Z: bz }, centru: { x: x.centru[0], y: x.centru[1] }, sens: x.sens, avans: 1000 });
    poz = x.b;
  }
  m.push({ tip: 'rapida', la: { Z: 5 } });
  return { axe: AXE_XYZ, scula: { numar: 1, nume: c.id, diametru: c.scula.diametru, forma }, turatie: 18000, zSigur: 5, miscari: m };
}

export function parametriGrila(g: GrilaOracol): ParametriCamp {
  return { x0: g.x0, y0: g.y0, latime: g.latime, inaltime: g.inaltime, celula: g.celula, sus: g.sus ?? 0 };
}

/** Nucleul pe un caz: câmpul întreg (sau doar banda dată), după compactare. */
export function simuleazaCaz(c: CazSimulare, banda?: Banda, mutari?: readonly MutareCaz[]): Camp {
  const p = pregatesteProgram(programCaz(c, mutari), c.grila.sus ?? 0);
  if (!p.ok) throw new Error(`${c.id}: nucleul refuză programul: ${p.motiv}`);
  const F = campNou(parametriGrila(c.grila), banda);
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  return F;
}

/** Câmpul nucleului, dens, pe grila unei bucăți (`i0`, `j0`: unde începe bucata în grila întreagă). */
export function densPe(F: Camp, g: GrilaOracol, i0 = 0, j0 = 0): Float64Array {
  const nx = Math.ceil(g.latime / g.celula - 1e-9), ny = Math.ceil(g.inaltime / g.celula - 1e-9);
  const z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = valoare(F, i0 + i, j0 + j);
  return z;
}

export type BucataNucleu = { readonly grila: GrilaOracol; readonly o: RezultatOracol; readonly z: Float64Array };

const oracole = new Map<string, ReadonlyArray<{ readonly grila: GrilaOracol; readonly i0: number; readonly j0: number; readonly o: RezultatOracol }>>();

/** Oracolul pe bucățile cazului (ținut minte în fișier). */
function judecat(c: CazSimulare) {
  const gata = oracole.get(c.id);
  if (gata) return gata;
  const bucati = (c.ferestre ? c.ferestre.map((f) => grilaFereastra(c.grila, f)) : [{ grila: c.grila, i0: 0, j0: 0 }])
    .map((b) => ({ ...b, o: judeca(c.gcode, b.grila, c.scula) }));
  oracole.set(c.id, bucati);
  return bucati;
}

/** Nucleul și oracolul pe aceleași bucăți. */
export function bucatiCaz(c: CazSimulare, F: Camp = simuleazaCaz(c)): readonly BucataNucleu[] {
  return judecat(c).map((b) => ({ grila: b.grila, o: b.o, z: densPe(F, b.grila, b.i0, b.j0) }));
}

/**
 * Ce verificări pică nucleul pe un caz: hârtia, oracolul („mai sus” cu peste 10 nm; „mai jos” peste marjă), adâncimea
 * programată, secțiunea bilei, unghiul V, lățimea radială. Un nucleu corect nu pică niciuna; o otravă trebuie să pice cel
 * puțin una (`test/otravuri/simulare.py`).
 */
export function verificariNucleu(c: CazSimulare, bucati: readonly BucataNucleu[]): string[] {
  const picate: string[] = [];
  for (const [k, b] of bucati.entries()) {
    const unde = bucati.length > 1 ? ` (fereastra ${k})` : '';
    if (c.hartie) {
      const v = verificaHartie(b.z, b.grila, c.hartie, c.muchie ? { muchie: c.muchie } : {});
      if (v.gresite > 0) picate.push(`hârtia${unde}: ${v.gresite} celule greșite (eroarea max ${v.eroareMax}, prima ${JSON.stringify(v.primaGresita)})`);
    }
    const cmp = compara(b.z, b.o, c.scula);
    if (cmp.maiSus > 0) picate.push(`oracolul${unde}: nucleul mai sus pe ${cmp.maiSus} celule (max ${cmp.maiSusMax}, prima ${JSON.stringify(cmp.primaMaiSus)})`);
    if (cmp.maiJosPesteMarja > 0) picate.push(`oracolul${unde}: nucleul sub marja ${cmp.marja} pe ${cmp.maiJosPesteMarja} celule`);
    // Pe pereții oracolului decide hârtia; fără hârtie, nici acolo nucleul nu are voie sub marjă.
    if (!c.hartie && cmp.pePerete > 0) picate.push(`oracolul${unde}: nucleul sub marjă pe ${cmp.pePerete} celule de perete (piesa n-are hârtie)`);
    const zmin = minim(b.z);
    if (!(zmin >= c.zProgramat - 1e-6)) picate.push(`adâncimea${unde}: ${zmin}, sub Z-ul programat ${c.zProgramat}`);
  }
  const b0 = bucati[0];
  if (b0 && c.sectiune) {
    const s = sectiuneBila(b0.z, b0.grila, c.sectiune.x);
    if (!(Math.abs(s.raza - c.sectiune.raza) <= 0.005 && Math.abs(s.centruZ - c.sectiune.centruZ) <= 0.005)) {
      picate.push(`secțiunea bilei: raza ${s.raza}, centrul z = ${s.centruZ}`);
    }
  }
  if (b0 && c.unghiV) {
    const u = unghiV(b0.z, b0.grila, c.unghiV.x, c.unghiV.centruY);
    if (!(Math.abs(u.grade - c.unghiV.grade) <= 0.05)) picate.push(`unghiul V: ${u.grade}° în loc de ${c.unghiV.grade}°`);
  }
  if (b0 && c.radial) {
    const r = c.radial, tol = b0.grila.celula * Math.SQRT2 + b0.grila.celula / 4;
    for (const u of r.unghiuri) {
      const w = latimeRadiala(b0.z, b0.grila, r.centru, u, r.rMin, r.rMax, r.zPrag);
      if (!(Math.abs(w - r.latime) <= tol)) picate.push(`lățimea radială la ${u}°: ${w} în loc de ${r.latime}`);
    }
  }
  return picate;
}
