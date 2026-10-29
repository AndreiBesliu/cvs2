/**
 * Așezarea textului (ADR 0105 §2): caracterele, pe rânduri, în glifele fontului, puse una după alta, în mm, cu Y în sus.
 *
 * - **Mărimea** (ADR 0019): `inaltime` e înălțimea majusculei, deci o unitate a fontului face `inaltime / majuscula` mm.
 *   Coordonatele se înmulțesc întâi și se împart la urmă, ca „20 mm” să iasă 20 mm exact pe litera H sau N.
 * - **Locul:** linia de bază a primului rând trece prin y = 0; un rând începe în x = 0 (aliniat la stânga), are mijlocul în
 *   x = 0 (centrat) sau se termină în x = 0 (la dreapta). Rândurile coboară cu `interlinie` × înălțimea rândului fontului
 *   (urcarea − coborârea + spațiul dintre rânduri, din `hhea`).
 * - **Între litere:** avansul glifei, crenarea perechii (`GPOS`, ADR 0105 §1) și `spatiere` mm, numai între două litere ale
 *   aceluiași rând.
 * - **Contururile:** cuadraticele TrueType devin cubice exact (ADR 0001: c1 = p0 + 2/3 (q − p0), c2 = p2 + 2/3 (q − p2)),
 *   punctele de pe curbă subînțelese (între două puncte de control) se pun la mijloc; regulile căii sunt cele ale ușilor
 *   importului (`incheieSubcalea`), iar fiecare glifă se normalizează din `nonzero` (ADR 0036, T3), o dată, aici.
 *
 * Un caracter pe care fontul nu-l are nu se desenează (o cutie `.notdef` s-ar tăia): se numără în `lipsa`.
 */
import { LINIE, type Punct, type Varf } from '../geom/contur.ts';
import type { BugetImport } from '../geom/nonzero.ts';
import { incheieSubcalea, normalizeazaForma, type CaleCitita, type NumaratoareNormalizare } from '../io/caleImport.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import type { ConturFont, Font } from './font.ts';

export type AliniereText = 'stanga' | 'centru' | 'dreapta';

/** Ce cere omul (ADR 0105 §3): textul (rândurile despărțite de `\n`), înălțimea majusculei, spațierea, rândurile, alinierea. */
export type ParametriText = {
  readonly continut: string;
  /** Înălțimea majusculei, în mm. */
  readonly inaltime: number;
  /** Spațiul adăugat între două litere, în mm (negativ: mai strâns). */
  readonly spatiere: number;
  /** Distanța dintre rânduri, ca multiplu al înălțimii rândului fontului. */
  readonly interlinie: number;
  readonly aliniere: AliniereText;
};

/** O glifă așezată: caracterul, rândul (de la 0) și contururile ei, în mm, normalizate. */
export type GlifaAsezata = { readonly caracter: string; readonly rand: number; readonly cai: readonly CaleCitita[] };

export type RaportText = NumaratoareNormalizare & {
  /** Caracterele pe care fontul nu le are (nedesenate). */
  lipsa: number;
  /** Glifele pe care fontul nu le poate da (date stricate, o glifă compusă care se conține pe sine): sărite. */
  'glife-stricate': number;
  'prea-mari': number;
};

export type TextAsezat = { readonly glife: readonly GlifaAsezata[]; readonly raport: RaportText; readonly caractereLipsa: readonly string[] };

type P = { readonly x: number; readonly y: number };

/**
 * Vârfurile unui contur TrueType în mm (`harta` duce unitățile fontului în mm): pornește dintr-un punct de pe curbă (sau,
 * dacă n-are niciunul, din mijlocul dintre ultimul și primul punct de control), pune mijloacele subînțelese și ridică fiecare
 * pătratică la cubică. Segmentele de lungime zero se sar.
 */
function varfuriDinContur(c: ConturFont, harta: (q: P) => Punct): { varfuri: Varf[]; start: Punct } | null {
  const n = c.length;
  if (n < 2) return null;
  // Punctele de pe curbă subînțelese: mijlocul dintre două puncte de control consecutive.
  const extinse: { x: number; y: number; peCurba: boolean }[] = [];
  for (let k = 0; k < n; k++) {
    const a = c[k]!, b = c[(k + 1) % n]!;
    extinse.push(a);
    if (!a.peCurba && !b.peCurba) extinse.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, peCurba: true });
  }
  const s = extinse.findIndex((q) => q.peCurba);
  if (s < 0) return null;
  const m = extinse.length;
  const pct = (k: number) => extinse[(s + k) % m]!;
  const start = pct(0);
  const varfuri: Varf[] = [];
  let cur = start;
  for (let k = 1; k <= m;) {
    const q = pct(k);
    if (q.peCurba) {
      if (q.x !== cur.x || q.y !== cur.y) varfuri.push({ p: harta(cur), s: LINIE });
      cur = q;
      k += 1;
    } else {
      const capat = pct(k + 1);
      // Pătratica (cur, q, capat) ridicată exact la cubică.
      const c1 = { x: cur.x + (2 * (q.x - cur.x)) / 3, y: cur.y + (2 * (q.y - cur.y)) / 3 };
      const c2 = { x: capat.x + (2 * (q.x - capat.x)) / 3, y: capat.y + (2 * (q.y - capat.y)) / 3 };
      if (!(cur.x === capat.x && cur.y === capat.y && q.x === cur.x && q.y === cur.y)) {
        varfuri.push({ p: harta(cur), s: { tip: 'C', c1: harta(c1), c2: harta(c2) } });
      }
      cur = capat;
      k += 2;
    }
  }
  return { varfuri, start: harta(start) };
}

/** Așază textul (ADR 0105 §2): pură, determinată de font și de parametri. */
export function aseazaText(font: Font, p: ParametriText): TextAsezat {
  const raport: RaportText = { lipsa: 0, 'glife-stricate': 0, 'prea-mari': 0, 'nonzero-normalizate': 0, 'nonzero-refuzate': 0, 'sub-rezolutie': 0, degenerate: 0 };
  const caractereLipsa: string[] = [];
  const inMm = (u: number): number => (u * p.inaltime) / font.majuscula;
  const inaltimeRand = inMm(font.urcare - font.coborare + font.spatiuRanduri) * p.interlinie;
  const randuri = p.continut.replace(/\r/g, '').split('\n');
  const glife: GlifaAsezata[] = [];
  const buget: BugetImport = { ramas: PLAFON_IMPORT.normalizare };
  randuri.forEach((rand, r) => {
    // Glifele rândului și locul fiecăreia (în unitățile fontului, plus spațierea în mm), apoi lățimea rândului.
    const litere: { caracter: string; glifa: number; x: number }[] = [];
    let x = 0;
    let anterioara = -1;
    for (const caracter of rand) {
      const cod = caracter.codePointAt(0) ?? 0;
      if (cod < 0x20 && caracter !== '\t') continue;
      const glifa = font.glifa(caracter === '\t' ? 0x20 : cod);
      if (glifa === 0) {
        raport.lipsa++;
        if (!caractereLipsa.includes(caracter)) caractereLipsa.push(caracter);
        continue;
      }
      if (anterioara >= 0) x += inMm(font.crenare(anterioara, glifa)) + p.spatiere;
      litere.push({ caracter, glifa, x });
      x += inMm(font.avans(glifa));
      anterioara = glifa;
    }
    const latime = x;
    const dx = p.aliniere === 'stanga' ? 0 : p.aliniere === 'centru' ? -latime / 2 : -latime;
    const baza = -r * inaltimeRand;
    for (const l of litere) {
      const x0 = l.x + dx;
      const harta = (q: P): Punct => ({ x: x0 + inMm(q.x), y: baza + inMm(q.y) });
      const contururi = font.contururi(l.glifa);
      if (contururi === null) {
        raport['glife-stricate']++;
        continue;
      }
      const cai: CaleCitita[] = [];
      for (const c of contururi) {
        const v = varfuriDinContur(c, harta);
        if (!v || v.varfuri.length === 0) {
          raport.degenerate++;
          continue;
        }
        const inchisa = incheieSubcalea(v.varfuri, v.start, v.start, true, true);
        if (inchisa === 'prea-mare') raport['prea-mari']++;
        else if (inchisa === 'degenerata') raport.degenerate++;
        else if (inchisa === 'praf') raport['sub-rezolutie']++;
        // Un contur care, închis, n-are arie (pe o dreaptă) iese deschis: o literă n-are linii de tăiat.
        else if (!inchisa.cale.inchis) raport.degenerate++;
        else cai.push(inchisa.cale);
      }
      // Spațiul și celelalte glife fără contur nu lasă nimic de tăiat.
      if (cai.length === 0) continue;
      glife.push({ caracter: l.caracter, rand: r, cai: normalizeazaForma(cai, true, buget, raport) });
    }
  });
  return { glife, raport, caractereLipsa };
}
