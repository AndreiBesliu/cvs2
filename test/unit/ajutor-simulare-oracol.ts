/**
 * Ajutorul testelor oracolului simulării (`test/oracles/simulare.ts`): judecata unei piese (cu ferestrele plăcii mari)
 * și probele comune ale celor două fișiere de cazuri. Fiecare fișier își declară piesele; împreună trebuie să le
 * acopere pe toate (proba e în `simulare-oracol.cititor.test.ts`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  campDinFunctie, compara, grilaFereastra, judeca, latimeRadiala, minim, sectiuneBila, unghiV, verificaHartie,
  type GrilaOracol, type RezultatOracol,
} from '../oracles/simulare.ts';
import { cazul, MARTORI_GRESITI, type CazSimulare, type MartorGresit, type Verificare } from '../oracles/simulare.cazuri.ts';

/** Piesele fiecărui fișier de cazuri (împărțite ca timpul să fie apropiat). */
export const PIESE_FISIER_1: readonly string[] = [
  'sant-plat', 'sant-bila', 'sant-v90', 'sant-v60', 'arc-g3', 'arc-g2-R', 'cerc-complet', 'arc-mare-R-neg', 'plonjare-plata',
  'mic-0.01', 'dublat',
];
export const PIESE_FISIER_2: readonly string[] = [
  'plonjare-bila', 'rampa-plata', 'profil-h(r)', 'mare-2440', 'tangent', 'aproape-coincident', 'elice', 'gravura-v60',
  'rampa-bila', 'rampa-v90', 'profil-rampa',
];

/**
 * Fâșia de lângă un perete vertical în care oracolul poate rata celule (`marjaEsantionare`, „unde nu are sens”):
 * săgeata cercului sculei pe un pas întreg, R − √(R² − pas²) (de 4 ori fâșia de pe o jumătate de pas, ca să acopere
 * și arcele, unde eșantioanele de pe peretele exterior se rar cu factorul 1 + R/r).
 */
export function bandaPerete(pas: number, raza: number): number {
  return raza - Math.sqrt(raza * raza - pas * pas);
}

/**
 * Jocul textului: `scrieGcode` rotunjește la 1e-9 mm, deci traseul citit de oracol stă la cel mult 0,5 nm pe axă de
 * cel exact al hârtiei; pe o pantă L, suprafața se mută cu cel mult 0,5e-9·(1 + √2·L) < 1e-8 mm pentru L ≤ 13 (bila
 * îngropată, L = 15,5, apare doar la plonjarea verticală, în coordonate întregi). Măsurat: −1,06e-9 pe gravura V60.
 */
export const JOC_TEXT = 1e-8;

/** O bucată judecată: grila ei și rezultatul oracolului (o singură bucată, sau câte una pe fereastră). */
export type Bucata = { readonly grila: GrilaOracol; readonly o: RezultatOracol };

const cache = new Map<string, readonly Bucata[]>();

/** Oracolul pe piesă (cu `div` dat), pe toată grila sau pe ferestrele ei; ținut minte în fișier. */
export function judecaCaz(c: CazSimulare, div = 8): readonly Bucata[] {
  const cheie = `${c.id}/${div}`;
  const gata = cache.get(cheie);
  if (gata) return gata;
  const grile = c.ferestre ? c.ferestre.map((f) => grilaFereastra(c.grila, f).grila) : [c.grila];
  const rez = grile.map((grila) => ({ grila, o: judeca(c.gcode, grila, c.scula, { div }) }));
  cache.set(cheie, rez);
  return rez;
}

/** Valoarea pe hârtie a piesei, densă pe bucată. */
function campHartie(c: CazSimulare, b: Bucata): Float64Array {
  const h = c.hartie;
  if (!h) throw new Error(`${c.id} n-are hârtie`);
  return campDinFunctie(b.grila, (x, y) => h(x, y));
}

/** Ce verificări pică un câmp pe piesa dată (pentru martori și pentru controlul lor pozitiv). */
export function verificariPicate(c: CazSimulare, campuri: readonly Float64Array[]): ReadonlySet<Verificare> {
  const picate = new Set<Verificare>();
  const bucati = judecaCaz(c);
  bucati.forEach((b, k) => {
    const z = campuri[k]!;
    if (c.hartie) {
      const v = verificaHartie(z, b.grila, c.hartie, c.muchie ? { muchie: c.muchie } : {});
      if (v.gresite > 0) picate.add('hartie');
    }
    const cmp = compara(z, b.o, c.scula);
    if (cmp.maiSus > 0) picate.add('maiSus');
    if (cmp.maiJosPesteMarja > 0) picate.add('maiJos');
    if (c.sectiune) {
      const s = sectiuneBila(z, b.grila, c.sectiune.x);
      if (!(Math.abs(s.raza - c.sectiune.raza) <= 0.005)) picate.add('sectiune');
    }
    if (c.unghiV) {
      const u = unghiV(z, b.grila, c.unghiV.x, c.unghiV.centruY);
      if (!(Math.abs(u.grade - c.unghiV.grade) <= 0.05)) picate.add('unghiV');
    }
  });
  return picate;
}

/** Înregistrează toate probele oracolului pe piesele date. */
export function probePiese(ids: readonly string[]): void {
  for (const id of ids) {
    const c = cazul(id);

    test(`${id}: invarianta — nicio celulă sub Z-ul programat (${c.zProgramat}) și nimic deasupra feței`, () => {
      for (const b of judecaCaz(c)) {
        const zmin = minim(b.o.z);
        assert.ok(zmin >= c.zProgramat - 1e-9, `oracolul coboară la ${zmin}, sub ${c.zProgramat}`);
        assert.ok(b.o.z.every((v) => v <= b.o.sus), 'o celulă e deasupra feței');
        assert.ok(b.o.mutariTaiate > 0, 'nicio mutare n-a tăiat: cititorul a pierdut programul?');
      }
      // Piesa chiar taie ceva până jos (altfel invarianta e vidă).
      assert.ok(Math.min(...judecaCaz(c).map((b) => minim(b.o.z))) < c.zProgramat / 2, 'piesa n-a ajuns nici la jumătatea adâncimii');
    });

    if (c.hartie) {
      const h = c.hartie;
      test(`${id}: hârtie — oracolul nu e niciodată sub exact (jocul textului, 1e-8) și e deasupra lui cel mult cu marja de eșantionare`, () => {
        for (const b of judecaCaz(c)) {
          const marja = b.o.marja + JOC_TEXT;
          const banda = bandaPerete(b.o.pas, c.scula.diametru / 2);
          const v = verificaHartie(b.o.z, b.grila, h, { sub: JOC_TEXT, peste: marja, ...(c.muchie ? { muchie: c.muchie, pragMuchie: banda } : {}) });
          assert.ok(v.celule > 0.99 * b.o.z.length, `doar ${v.celule} celule comparate din ${b.o.z.length} (${v.peMuchie} pe muchie)`);
          assert.equal(v.maiJos, 0, `oracolul e sub hârtie pe ${v.maiJos} celule (prima ${JSON.stringify(v.primaGresita)}): ar fi mai adânc decât exactul`);
          assert.equal(v.maiSus, 0, `oracolul e peste hârtie cu mai mult de marja ${marja} pe ${v.maiSus} celule (prima ${JSON.stringify(v.primaGresita)}, eroarea max ${v.eroareMax})`);
          assert.equal(v.peMuchie, 0, `${v.peMuchie} celule în fâșia de ${banda} mm a pereților: corpusul nu mai e „rotund”`);
        }
      });

      test(`${id}: hârtia trecută prin compara — 0 celule mai sus, 0 sub marjă, 0 pe pereți`, () => {
        for (const b of judecaCaz(c)) {
          const cmp = compara(campHartie(c, b), b.o, c.scula);
          assert.equal(cmp.maiSus, 0, `hârtia e peste oracol pe ${cmp.maiSus} celule (max ${cmp.maiSusMax}, prima ${JSON.stringify(cmp.primaMaiSus)})`);
          assert.equal(cmp.maiJosPesteMarja, 0, `hârtia e sub oracol peste marja ${cmp.marja} pe ${cmp.maiJosPesteMarja} celule`);
          assert.equal(cmp.pePerete, 0, `hârtia e sub oracol pe ${cmp.pePerete} celule de perete`);
        }
      });
    }

    if (c.sectiune) {
      const s0 = c.sectiune;
      test(`${id}: secțiunea bilei a oracolului e cercul de rază ${s0.raza} cu centrul la z = ${s0.centruZ}`, () => {
        const b = judecaCaz(c)[0]!;
        const s = sectiuneBila(b.o.z, b.grila, s0.x);
        assert.ok(s.puncte > 50, `doar ${s.puncte} puncte`);
        assert.ok(Math.abs(s.raza - s0.raza) <= 0.005, `raza ajustată ${s.raza}`);
        assert.ok(Math.abs(s.centruY - s0.centruY) <= 0.005 && Math.abs(s.centruZ - s0.centruZ) <= 0.005, `centrul (${s.centruY}, ${s.centruZ})`);
      });
    }

    if (c.unghiV) {
      const u0 = c.unghiV;
      test(`${id}: unghiul V al oracolului, din pantele pereților, e ${u0.grade}°`, () => {
        const b = judecaCaz(c)[0]!;
        const u = unghiV(b.o.z, b.grila, u0.x, u0.centruY);
        assert.ok(u.puncte[0] > 10 && u.puncte[1] > 10, `puncte ${u.puncte.join(' / ')}`);
        assert.ok(Math.abs(u.grade - u0.grade) <= 0.05, `${u.grade}° (pante ${u.pante.join(', ')})`);
      });
    }

    if (c.radial) {
      const r0 = c.radial;
      test(`${id}: lățimea radială a șanțului pe arc e ${r0.latime} mm pe fiecare rază măsurată`, () => {
        const b = judecaCaz(c)[0]!;
        const tol = b.grila.celula * Math.SQRT2 + b.grila.celula / 4;
        for (const u of r0.unghiuri) {
          const w = latimeRadiala(b.o.z, b.grila, r0.centru, u, r0.rMin, r0.rMax, r0.zPrag);
          assert.ok(Math.abs(w - r0.latime) <= tol, `la ${u}°: ${w} mm (toleranța ${tol})`);
        }
      });
    }

    if (c.identicCu) {
      const altul = cazul(c.identicCu);
      test(`${id}: aceeași materie ca ${altul.id} (alt program)`, () => {
        const a = judecaCaz(c), b = judecaCaz(altul);
        a.forEach((x, k) => {
          const y = b[k]!;
          let dif = 0;
          for (let i = 0; i < x.o.z.length; i++) if (Math.abs(x.o.z[i]! - y.o.z[i]!) > 1e-9) dif++;
          assert.equal(dif, 0, `${dif} celule diferă`);
        });
      });
    }

    if (!c.hartie && !c.identicCu) {
      test(`${id}: fără hârtie — oracolul la div 8 și la div 16 stau fiecare în marja celuilalt`, () => {
        for (const [k, b8] of judecaCaz(c).entries()) {
          const b16 = judecaCaz(c, 16)[k]!;
          // Amândouă sunt ≥ exactul; O8 − E ≤ marja(8) și O16 ≥ E dau O8 − O16 ≤ marja(8), și invers.
          const a = compara(b16.o.z, b8.o, c.scula), d = compara(b8.o.z, b16.o, c.scula);
          assert.equal(a.maiJosPesteMarja + a.pePerete, 0, `div 16 sub div 8 peste marja ${a.marja}: ${a.maiJosPesteMarja} (+${a.pePerete} pe pereți), dif max ${a.difMax}`);
          assert.equal(d.maiJosPesteMarja + d.pePerete, 0, `div 8 sub div 16 peste marja ${d.marja}: ${d.maiJosPesteMarja} (+${d.pePerete} pe pereți)`);
        }
      });
    }
  }

  for (const m of MARTORI_GRESITI.filter((k) => ids.includes(k.caz))) probaMartor(m);
}

function probaMartor(m: MartorGresit): void {
  const c = cazul(m.caz);
  test(`martor greșit „${m.nume}” pe ${m.caz}: ${m.explicatie} — îl prind ${m.prinsDe.join(', ')}`, () => {
    const campuri = judecaCaz(c).map((b) => campDinFunctie(b.grila, m.valoare));
    const picate = verificariPicate(c, campuri);
    for (const v of m.prinsDe) assert.ok(picate.has(v), `verificarea „${v}” n-a prins martorul (au picat doar: ${[...picate].join(', ') || 'niciuna'})`);
    // Controlul pozitiv: aceleași verificări trec pe valoarea corectă, deci martorul e prins de defect, nu de probă.
    if (c.hartie) {
      const h = c.hartie;
      const curate = verificariPicate(c, judecaCaz(c).map((b) => campDinFunctie(b.grila, (x, y) => h(x, y))));
      assert.deepEqual([...curate], [], `hârtia curată pică ${[...curate].join(', ')}`);
    }
  });
}
