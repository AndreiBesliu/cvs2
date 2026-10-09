import { arieCuSemn, type Contur, type Punct } from '../geom/contur.ts';
import { cutieContur, largita, type Cutie } from '../geom/cutie.ts';
import { apropiereContururi, distantaCutii } from '../geom/apropiere.ts';
import { inRegiune } from '../geom/distanta.ts';
import { conturElement } from '../model/forme.ts';
import type { Taietura } from '../model/lume.ts';

/**
 * Regiunea păstrată (ADR 0026): materialul care trebuie să rămână, din tăieturile foii și din laturile declarate.
 * - Inelele: elementele cu o operație `exterior` (piesă, se păstrează dinăuntru) sau `interior` (gol, dinăuntru e deșeu).
 * - K: un punct e păstrat dacă cel mai mic inel care îl conține e piesă.
 * - Partea proprie S(C): piesa își păstrează interiorul, golul exteriorul, doar pentru propriile tăieturi.
 * - Invarianta 2: discul sculei nu intră în K ∪ S(C), cu toleranța EPS_REGIUNE.
 * Totul se măsoară exact, pe linii și arce: distanța segment–segment, includerea cu `evenodd`.
 */

/** Rotunjirea postului la 3 zecimale, plus toleranța offsetului (0,002 mm): ADR 0026 §6. */
export const EPS_REGIUNE = 0.005;
/** Sub atât, două inele se ating (aceeași toleranță ca la offset). */
export const EPS_ATINGERE_INELE = 1e-6;
/** Începutul oricărui refuz al regiunii păstrate, ca testele să-l poată recunoaște (ADR 0026 §8). */
export const PREFIX_REGIUNE = 'regiunea păstrată:';

export type Rol = 'piesa' | 'gol';

export type Inel = {
  readonly idLume: string;
  readonly rol: Rol;
  readonly contur: Contur;
  readonly cutie: Cutie;
  readonly arie: number;
  /** Indicele celui mai mic inel care îl conține, sau null. */
  readonly parinte: number | null;
};

export type Regiune = { readonly inele: readonly Inel[] };

const fmt = (x: number, z = 1): string => x.toFixed(z);

/** Inelele foii, cu includerea lor, sau refuzul (o latură dublă, două inele care se ating). */
export function regiunePastrata(taieturi: readonly Taietura[]): { readonly ok: true; readonly regiune: Regiune } | { readonly ok: false; readonly motiv: string } {
  const laturi = new Map<string, { exterior: boolean; interior: boolean; t: Taietura }>();
  for (const t of taieturi) {
    if (t.latura === 'pe-linie') continue;
    const x = laturi.get(t.idLume) ?? { exterior: false, interior: false, t };
    x[t.latura] = true;
    laturi.set(t.idLume, x);
  }
  const brute: Array<Omit<Inel, 'parinte'>> = [];
  for (const [idLume, x] of laturi) {
    if (x.exterior && x.interior) {
      return { ok: false, motiv: `${PREFIX_REGIUNE} ${idLume} are operații și pe exterior, și pe interior: nu se știe ce parte se păstrează` };
    }
    const contur = conturElement(x.t);
    brute.push({ idLume, rol: x.exterior ? 'piesa' : 'gol', contur, cutie: cutieContur(contur), arie: Math.abs(arieCuSemn(contur)) });
  }
  for (let i = 0; i < brute.length; i++) {
    for (let j = i + 1; j < brute.length; j++) {
      const a = brute[i], b = brute[j];
      if (!a || !b || distantaCutii(a.cutie, b.cutie) >= EPS_ATINGERE_INELE) continue;
      const d = apropiereContururi(a.contur, b.contur);
      if (d.distanta < EPS_ATINGERE_INELE) {
        return {
          ok: false,
          motiv: `${PREFIX_REGIUNE} ${a.idLume} și ${b.idLume} se ating sau se intersectează (lângă X ${fmt(d.p.x)}, Y ${fmt(d.p.y)}): nu se știe ce material rămâne între ele`,
        };
      }
    }
  }
  // Părintele: cel mai mic inel (după arie) care conține un punct al inelului. Inelele nu se ating, deci un punct ajunge.
  const inele: Inel[] = brute.map((x, i) => {
    let parinte: number | null = null;
    const p = x.contur.varfuri[0]?.p;
    for (let j = 0; j < brute.length; j++) {
      const y = brute[j];
      if (j === i || !y || !p || y.arie <= x.arie || !cuprinde(y.cutie, x.cutie) || !inRegiune(p, [y.contur])) continue;
      const curent = parinte === null ? undefined : brute[parinte];
      if (!curent || y.arie < curent.arie) parinte = j;
    }
    return { ...x, parinte };
  });
  return { ok: true, regiune: { inele } };
}

const cuprinde = (a: Cutie, b: Cutie): boolean => a.minX <= b.minX && a.minY <= b.minY && a.maxX >= b.maxX && a.maxY >= b.maxY;

/** Cel mai mic inel care conține punctul (care nu stă pe niciun inel), sau null. */
function celMaiMicInel(r: Regiune, p: Punct): number | null {
  let cel: number | null = null;
  r.inele.forEach((x, i) => {
    if (p.x < x.cutie.minX || p.x > x.cutie.maxX || p.y < x.cutie.minY || p.y > x.cutie.maxY) return;
    if (!inRegiune(p, [x.contur])) return;
    const c = cel === null ? undefined : r.inele[cel];
    if (!c || x.arie < c.arie) cel = i;
  });
  return cel;
}

/** Punctul e în regiunea păstrată K? */
export function inK(r: Regiune, p: Punct): boolean {
  const i = celMaiMicInel(r, p);
  return i !== null && r.inele[i]?.rol === 'piesa';
}

/** Inelul e o margine a lui K: de o parte e păstrat, de cealaltă nu. */
function margineK(r: Regiune, x: Inel): boolean {
  const inauntru = x.rol === 'piesa';
  const afara = x.parinte !== null && r.inele[x.parinte]?.rol === 'piesa';
  return inauntru !== afara;
}

/** A cui e materialul păstrat de lângă inelul x: al lui, dacă e piesă; altfel al piesei din jurul golului. */
function stapan(r: Regiune, x: Inel): string {
  if (x.rol === 'piesa' || x.parinte === null) return x.idLume;
  return r.inele[x.parinte]?.idLume ?? x.idLume;
}

/**
 * Invarianta 2 pe traseele unei tăieturi (contururile centrului sculei, la orice trecere): null, sau motivul. Pentru o
 * tăietură `pe-linie`, sau a unui element care nu e inel, nu se judecă nimic (ADR 0026 §6).
 * Traseul e în afara lui K ∪ S(C) dacă un punct al lui e afară și niciun punct nu vine mai aproape de R − ε de marginea
 * lui K ∪ S(C), care e făcută din marginile lui K și din C.
 */
export function verificaTaietura(r: Regiune, idLume: string, latura: Taietura['latura'], trasee: readonly Contur[], raza: number): string | null {
  if (latura === 'pe-linie') return null;
  const c = r.inele.find((x) => x.idLume === idLume);
  if (!c) return null;
  const inS = (p: Punct): boolean => (c.rol === 'piesa' ? inRegiune(p, [c.contur]) : !inRegiune(p, [c.contur]));
  const margini = r.inele.filter((x) => x === c || margineK(r, x));
  for (const traseu of trasee) {
    const p0 = traseu.varfuri[0]?.p;
    if (!p0) continue;
    if (inS(p0)) {
      return `${PREFIX_REGIUNE} tăietura lui ${idLume} trece pe partea păstrată a propriului contur (lângă X ${fmt(p0.x)}, Y ${fmt(p0.y)})`;
    }
    if (inK(r, p0)) {
      const i = celMaiMicInel(r, p0);
      const cui = i === null ? '?' : (r.inele[i]?.idLume ?? '?');
      return `${PREFIX_REGIUNE} tăietura lui ${idLume} stă în piesa ${cui} (lângă X ${fmt(p0.x)}, Y ${fmt(p0.y)})`;
    }
    // Cutia traseului lărgită cu R: un inel a cărui cutie n-o atinge stă la mai mult de R de traseu.
    const cutie = largita(cutieContur(traseu), raza);
    for (const d of margini) {
      if (!seAtingCutiile(cutie, d.cutie)) continue;
      const a = apropiereContururi(traseu, d.contur);
      if (a.distanta < raza - EPS_REGIUNE) {
        const cui = d === c ? `propria parte păstrată a lui ${idLume}` : `piesa ${stapan(r, d)}`;
        return `${PREFIX_REGIUNE} tăietura lui ${idLume} intră în ${cui} cu ${fmt(raza - a.distanta, 3)} mm (lângă X ${fmt(a.q.x)}, Y ${fmt(a.q.y)})`;
      }
    }
  }
  return null;
}

const seAtingCutiile = (a: Cutie, b: Cutie): boolean => a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
