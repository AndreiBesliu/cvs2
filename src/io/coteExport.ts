/**
 * Cotele foii în exportul 2D (ADR 0330 §7, felia 10.4↑c-1), pure: desenul fiecărei cote (`desenCota`, același cu al pânzei)
 * ca entități ale exportului, pe stratul COTE, în mm ai foii:
 * - liniile de cotă și de extensie, bucăți de polilinie; arcul unghiului, o polilinie cu bulge (exact);
 * - capetele: săgeata plină, un triunghi umplut (`plin`); cea deschisă, conturul lui; bara oblică, o bucată; punctul, un disc
 *   (polilinia închisă din două semicercuri de rază r / 2, cu lățimea r: umplută și în DXF, unde e „donut”-ul obișnuit);
 * - cifrele, ca trăsături: apelantul le așază (`OptiuniCote.cifre`, în aplicație fontul cu o singură linie inclus, Relief
 *   SingleLine, ADR 0140, prin `cifreDinFont`), centrate pe x = 0, cu linia de bază pe y = 0, la înălțimea din setări; aici
 *   se rotesc cu unghiul cifrei și se mută la baza ei: aceleași în fiecare format, fără fonturi în fișier. Semnele pe care
 *   fontul nu le are (minutul ′ și secunda ″) se scriu cu apostroful și ghilimelele drepte.
 * Ancorele se citesc din lume ca pe pânză: o cotă legată e unde e forma, una dezlegată în ultimul loc văzut. O cotă cu un fel
 * necunoscut, sau fără desen, nu se exportă. Nimic de aici nu ajunge în program (regula `cam-fara-cote`).
 */
import { LINIE, type Contur, type Punct, type Segment, type Varf } from '../geom/conturBaza.ts';
import { cutieContur, CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import { felCunoscut, indexLume, punctAncora, valoareCota } from '../model/cote.ts';
import { cifraCota, desenCota, textCota, type ArcDesen, type CapatDesen, type FormatCifre, type StilCota } from '../model/desenCota.ts';
import type { Document } from '../model/document.ts';
import { bucatiContur, type Entitate } from './vectori.ts';

/** Cifrele așezate: trăsăturile lor (centrate pe x = 0, linia de bază pe y = 0) și semnele pe care fontul nu le are. */
export type CifreAsezate = { readonly contururi: readonly Contur[]; readonly lipsa: readonly string[] };
export type OptiuniCote = {
  readonly stil: StilCota;
  readonly format: FormatCifre;
  readonly cifre: (text: string, inaltime: number) => CifreAsezate;
};

/** Semnele pe care fontul cifrelor nu le are, cu înlocuitorul lor. */
const INLOCUITE: Readonly<Record<string, string>> = { '′': "'", '″': '"' };
export const textPentruFont = (text: string): string => [...text].map((c) => INLOCUITE[c] ?? c).join('');

export type CoteExport = {
  readonly entitati: readonly Entitate[];
  /** Cutia exactă a cotelor exportate, sau null fără nicio cotă. */
  readonly cutie: Cutie | null;
  /** Câte cote s-au exportat; semnele pe care fontul nu le are (nedesenate). */
  readonly cote: number;
  readonly lipsa: readonly string[];
};

const linie = (a: Punct, b: Punct): Contur => ({ inchis: false, varfuri: [{ p: a, s: LINIE }, { p: b, s: LINIE }] });
const peArc = (a: ArcDesen, t: number): Punct => ({ x: a.centru.x + a.raza * Math.cos(t), y: a.centru.y + a.raza * Math.sin(t) });
/** Arcul cotei, ca o bucată de polilinie: de la capătul de start, cu bulge tan(baleiaj / 4) (pozitiv: trigonometric). */
const arcContur = (a: ArcDesen): Contur => ({
  inchis: false, varfuri: [{ p: peArc(a, a.de), s: { tip: 'A', bulge: Math.tan(a.baleiaj / 4) } }, { p: peArc(a, a.de + a.baleiaj), s: LINIE }],
});

/** Rotirea cu `unghi` grade în jurul originii, apoi mutarea în `o`. */
function transformare(unghi: number, o: Punct): (p: Punct) => Punct {
  const r = (unghi * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return (p) => ({ x: o.x + c * p.x - s * p.y, y: o.y + s * p.x + c * p.y });
}
function mutaContur(k: Contur, f: (p: Punct) => Punct): Contur {
  return {
    inchis: k.inchis,
    varfuri: k.varfuri.map((v): Varf => {
      const s: Segment = v.s.tip === 'C' ? { tip: 'C', c1: f(v.s.c1), c2: f(v.s.c2) } : v.s;
      return { p: f(v.p), s };
    }),
  };
}

/** Capătul liniei de cotă: entitățile lui și cutia lor. */
function capat(c: CapatDesen, id: string): { readonly e: Entitate[]; readonly cutie: Cutie } {
  if (c.fel === 'bara') {
    const k = linie(c.bucata[0], c.bucata[1]);
    return { e: bucatiContur(k, 'COTE', id), cutie: cutieContur(k) };
  }
  if (c.fel === 'punct') {
    const { x, y } = c.centru, r = c.raza;
    return {
      e: [{ fel: 'polilinie', strat: 'COTE', element: id, inchis: true, latime: r, varfuri: [{ x: x - r / 2, y, bulge: 1 }, { x: x + r / 2, y, bulge: 1 }] }],
      cutie: { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r },
    };
  }
  const [a, b, d] = c.puncte;
  const cutie = { minX: Math.min(a.x, b.x, d.x), minY: Math.min(a.y, b.y, d.y), maxX: Math.max(a.x, b.x, d.x), maxY: Math.max(a.y, b.y, d.y) };
  if (c.plina) return { e: [{ fel: 'plin', strat: 'COTE', element: id, puncte: [a, b, d] }], cutie };
  return { e: [{ fel: 'polilinie', strat: 'COTE', element: id, inchis: true, varfuri: [a, b, d].map((p) => ({ x: p.x, y: p.y, bulge: 0 })) }], cutie };
}

/** Cotele foii `indexFoaie`, ca entități ale exportului (pe stratul COTE), cu cutia lor și semnele lipsă din font. */
export function entitatiCote(doc: Document, indexFoaie: number, o: OptiuniCote): CoteExport {
  const foaie = doc.foi[indexFoaie];
  const entitati: Entitate[] = [];
  const lipsa = new Set<string>();
  let cutie = CUTIE_GOALA, cote = 0;
  if (!foaie?.cote?.length) return { entitati, cutie: null, cote, lipsa: [] };
  const lume = indexLume(doc, indexFoaie);
  for (const c of foaie.cote) {
    if (!felCunoscut(c.fel) || !Array.isArray(c.puncte)) continue;
    const p = c.puncte.map((a) => punctAncora(a, lume).p);
    const valoare = valoareCota(c, p);
    const text = valoare === null ? '' : textCota(c, cifraCota(c.fel, valoare, o.format));
    const dc = desenCota(c, p, o.stil, text);
    if (!dc) continue;
    cote++;
    const pune = (k: Contur): void => {
      entitati.push(...bucatiContur(k, 'COTE', c.id));
      cutie = uneste(cutie, cutieContur(k));
    };
    for (const [a, b] of dc.extensii) pune(linie(a, b));
    for (const [a, b] of dc.bucati) pune(linie(a, b));
    for (const a of dc.arce) pune(arcContur(a));
    for (const k of dc.capete) {
      const x = capat(k, c.id);
      entitati.push(...x.e);
      cutie = uneste(cutie, x.cutie);
    }
    if (text.trim() === '') continue;
    const t = o.cifre(textPentruFont(text), dc.text.inaltime);
    for (const x of t.lipsa) lipsa.add(x);
    const f = transformare(dc.text.unghi, dc.text.p);
    for (const k of t.contururi) pune(mutaContur(k, f));
  }
  return { entitati, cutie: cote > 0 ? cutie : null, cote, lipsa: [...lipsa] };
}
