import { apropiereSegmente, segmenteCuCutii, type SegmentContur } from '../geom/apropiere.ts';
import { cerculArcului, type Contur, type Punct } from '../geom/contur.ts';
import { largita } from '../geom/cutie.ts';
import { EPS_ATINGERE, indexCutii } from '../geom/offset.ts';
import { REZOLUTIE } from '../geom/toleranta.ts';
import { esteCaleDeschisa } from '../model/document.ts';
import type { Taietura } from '../model/lume.ts';
import { lungimeBucla } from './parcurgere.ts';
import { discInK, MOTIV_PARTE, type Regiune } from './regiune.ts';

/**
 * Căile deschise în CAM (ADR 0037, sub-felia 2.3c-2): refuzurile de dinaintea traseului (§9, §4, marcajul pe o cale
 * închisă de la §8), judecata marcajului „despărțire” și a tăieturii deschise prin foaie care ajunge la marginea foii
 * (§8), apoi avertismentele de la §10 (tăietura pe linie prin foaie într-o piesă, bucata liberă). Programul nu se schimbă
 * din cauza unui avertisment. Pe o parte (stânga / dreapta) se refuză până la 2.3c-5.
 */

/** Cât de aproape de conturul foii ajunge capătul unei tăieturi deschise care o poate despărți, peste R (ADR 0037 §8). */
export const MARJA_MARGINE = 1;
/** Capetele unei tăieturi deschise prin foaie mai apropiate de D + atât închid o bucată (ADR 0037 §10). */
export const MARJA_BUCATA = 1;
/** Peste atâtea mm sub grosime, adâncimea e „prin foaie” (zgomotul unui număr scris în dialog). */
const EPS_GROSIME = 1e-9;

const fmt = (x: number, z = 1): string => x.toFixed(z);

/** Lucrurile operației care pe o cale deschisă vin mai târziu (§9), în ordinea dialogului. */
function ceVineMaiTarziu(t: Taietura): string | null {
  if (t.urechi) return 'urechile pe o cale deschisă vin mai târziu';
  if (t.rampa) return 'rampa pe o cale deschisă vine mai târziu';
  if (t.intrari) return 'intrările pe o cale deschisă vin mai târziu';
  if (t.colturi) return 'degajările colțurilor pe o cale deschisă vin mai târziu';
  return null;
}

/**
 * Calea deschisă e degenerată (§4): mai puțin de 2 vârfuri distincte, sau lungimea pe curbă sub rezoluție (0,01 mm). Pe
 * conturul de tăiat, în lume. Motivul, sau null.
 */
export function degenerata(c: Contur): string | null {
  const p0 = c.varfuri[0]?.p;
  const distincte = p0 !== undefined && c.varfuri.some((v) => v.p.x !== p0.x || v.p.y !== p0.y);
  const lungime = distincte ? lungimeBucla(c) : 0;
  if (lungime >= REZOLUTIE) return null;
  return `calea deschisă are ${distincte ? `lungimea ${lungime.toFixed(4)} mm, sub rezoluția de ${REZOLUTIE} mm` : 'mai puțin de 2 vârfuri distincte'}: ar fi o găurire, nu o linie`;
}

/**
 * Refuzurile de dinaintea regiunii și a traseului (ADR 0037 §9, §4 și marcajul pe o cale închisă de la §8), în ordinea
 * tăieturilor: primul motiv, sau null. `contururi`: conturul de tăiat al fiecărui element, în lume.
 */
export function refuzDeschise(taieturi: readonly Taietura[], contururi: ReadonlyMap<string, Contur>): string | null {
  // O operație a unei piese cu cel puțin un nod deschis: urechile, rampa, intrările și degajările ei se refuză (§9).
  const opDeschise = new Set<string>();
  // Elementele tăiate pe stânga și pe dreapta deodată: nu se știe ce parte se păstrează (§9).
  const parti = new Map<string, Set<string>>();
  for (const t of taieturi) {
    if (esteCaleDeschisa(t.forma)) opDeschise.add(`${t.piesa}/${t.operatie}`);
    if (t.latura === 'stanga' || t.latura === 'dreapta') parti.set(t.idLume, (parti.get(t.idLume) ?? new Set()).add(t.latura));
  }
  for (const t of taieturi) {
    const deschisa = esteCaleDeschisa(t.forma);
    if (deschisa && (t.latura === 'exterior' || t.latura === 'interior')) {
      // Nu se degradează tăcut pe linie, ca în ediția întâi (ADR 0037, „Ce am respins”).
      return `${t.idLume}: profilul ${t.latura} cere un contur închis: pe o cale deschisă alege pe linie (stânga și dreapta vin într-o felie următoare)`;
    }
    if (!deschisa && (t.latura === 'stanga' || t.latura === 'dreapta')) {
      return `${t.idLume}: stânga / dreapta cer o cale deschisă: pe un contur închis alege exterior sau interior`;
    }
    if (!deschisa && t.despartire) return `${t.idLume}: despărțirea foii se marchează doar pe o cale deschisă`;
    if ((parti.get(t.idLume)?.size ?? 0) > 1) {
      return `${t.idLume}: are operații și pe stânga, și pe dreapta: nu se știe ce parte se păstrează`;
    }
    if (t.latura === 'stanga' || t.latura === 'dreapta') return `${t.idLume}: ${MOTIV_PARTE}`;
    if (opDeschise.has(`${t.piesa}/${t.operatie}`)) {
      const ce = ceVineMaiTarziu(t);
      if (ce) return deschisa ? `${t.idLume}: ${ce}` : `${t.idLume}: operația ${t.operatie} are și căi deschise; ${ce}`;
    }
    if (deschisa) {
      const c = contururi.get(t.idLume);
      const d = c ? degenerata(c) : null;
      if (d) return `${t.idLume}: ${d}`;
    }
  }
  return null;
}

/** Lungimea pe curbă a unui segment (linie sau arc). */
function lungime(s: SegmentContur): number {
  if (s.s.tip !== 'A') return Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
  const { raza, baleiaj } = cerculArcului(s.a, s.b, s.s.bulge);
  return raza * Math.abs(baleiaj);
}

/**
 * Calea deschisă se taie singură (§10, bucata liberă): două segmente nevecine se ating, la sub 1e-6 mm. Segmentele de
 * lungime practic zero (un vârf repetat) nu se numără: altfel vecinii lor ar părea nevecini care se ating. Cu un index pe
 * cutiile segmentelor: doar perechile apropiate se măsoară exact.
 */
export function seTaieSingura(c: Contur): boolean {
  const s = segmenteCuCutii(c).filter((x) => lungime(x.s) >= EPS_ATINGERE);
  const index = indexCutii(s.map((x) => x.cutie));
  for (let i = 0; i < s.length; i++) {
    const x = s[i];
    if (!x) continue;
    let gasit = false;
    index.vizita(largita(x.cutie, EPS_ATINGERE), (j) => {
      const y = s[j];
      if (gasit || j <= i + 1 || !y) return;
      if (apropiereSegmente(x.s, y.s).distanta < EPS_ATINGERE) gasit = true;
    });
    if (gasit) return true;
  }
  return false;
}

/** Cât de aproape stă punctul de conturul foii [0, W] × [0, H]: negativ în afara ei. */
function laMarginea(p: Punct, latime: number, inaltime: number): number {
  return Math.min(p.x, latime - p.x, p.y, inaltime - p.y);
}

export type JudecataDeschisa = { readonly ok: true; readonly avertismente: readonly string[] } | { readonly ok: false; readonly motiv: string };

/**
 * Judecata unei tăieturi pe o cale deschisă, după regiune (ADR 0037 §8, §10): marcajul „despărțire” (prin toată foaia,
 * cu discul frezei în afara pieselor), tăietura deschisă nemarcată prin foaie care ajunge la marginea foii (refuz: omul
 * hotărăște, aplicația doar îi cere să hotărască), apoi avertismentele. `traseu`: drumul centrului frezei (pe linie, chiar
 * calea, în lume).
 */
export function judecaDeschisa(
  t: Taietura, traseu: Contur, regiune: Regiune, foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number }, D: number,
): JudecataDeschisa {
  const R = D / 2;
  const prinFoaie = t.adancime >= foaie.grosime - EPS_GROSIME;
  if (t.despartire) {
    if (!prinFoaie) {
      return { ok: false, motiv: `${t.idLume}: o despărțire taie prin toată foaia, iar adâncimea de ${t.adancime} mm e sub grosimea foii (${foaie.grosime} mm)` };
    }
    const k = discInK(regiune, traseu, R);
    if (k) return { ok: false, motiv: `${t.idLume}: despărțirea intră în piesa ${k.piesa} (${k.unde}): o despărțire trece doar prin schelet, în afara pieselor` };
  }
  const p0 = traseu.varfuri[0]?.p;
  const pn = traseu.varfuri[traseu.varfuri.length - 1]?.p;
  if (!p0 || !pn) return { ok: true, avertismente: [] };
  if (prinFoaie && !t.despartire
    && Math.min(laMarginea(p0, foaie.latime, foaie.inaltime), laMarginea(pn, foaie.latime, foaie.inaltime)) <= R + MARJA_MARGINE) {
    return {
      ok: false,
      motiv: `${t.idLume}: tăietura deschisă prin foaie ajunge la marginea foii și o poate despărți; marcheaz-o «despărțire» (se taie la urmă) sau micșorează adâncimea`,
    };
  }
  const avertismente: string[] = [];
  if (prinFoaie && t.latura === 'pe-linie') {
    const k = t.despartire ? null : discInK(regiune, traseu, R);
    if (k) {
      avertismente.push(`${t.idLume}: tăietura pe linie trece prin toată grosimea piesei ${k.piesa} (${k.unde}): o despică sau o crestează; bucățile care se desprind n-au urechi`);
    }
  }
  if (prinFoaie) {
    const capete = Math.hypot(pn.x - p0.x, pn.y - p0.y);
    const cum = capete < D + MARJA_BUCATA ? `capetele la ${fmt(capete, 3)} mm unul de altul`
      : t.latura === 'pe-linie' && seTaieSingura(traseu) ? 'calea se taie singură' : null;
    if (cum) avertismente.push(`${t.idLume}: bucata închisă de tăietură iese liberă, fără urechi (${cum})`);
  }
  return { ok: true, avertismente };
}
