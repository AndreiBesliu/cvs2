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
 *
 * Felia 10.4↑c-2: cifrele, la alegere, ca text (o entitate `text`: mijlocul bazei, unghiul, majuscula; scriitorii o fac MTEXT,
 * `<text>` sau Helvetica), și definiția fiecărei cote ca DIMENSION (`definitieCota`), pentru DXF-ul cu cotele ca cote.
 */
import { LINIE, type Contur, type Punct, type Segment, type Varf } from '../geom/conturBaza.ts';
import { cutieContur, CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import { felCunoscut, indexLume, punctAncora, valoareCota } from '../model/cote.ts';
import { cifraCuToleranta, desenCota, laturiUnghi, textCota, type ArcDesen, type CapatDesen, type DesenCota, type FormatCifre, type StilCota } from '../model/desenCota.ts';
import type { Cota, Document } from '../model/document.ts';
import { inHelvetica, marimeHelvetica } from './helvetica.ts';
import { bucatiContur, type DefinitieCota, type Entitate } from './vectori.ts';

/** Cifrele așezate: trăsăturile lor (centrate pe x = 0, linia de bază pe y = 0) și semnele pe care fontul nu le are. */
export type CifreAsezate = { readonly contururi: readonly Contur[]; readonly lipsa: readonly string[] };
export type OptiuniCote = {
  readonly stil: StilCota;
  readonly format: FormatCifre;
  /** Cifrele ca trăsături (așezate de `cifre`; fără ea, nedesenate, cu semnele spuse lipsă) sau ca text (felia 10.4↑c-2). */
  readonly ca: 'trasaturi' | 'text';
  readonly cifre?: (text: string, inaltime: number) => CifreAsezate;
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
  /** Fiecare cotă exportată cu o valoare, ca DIMENSION (felia 10.4↑c-2), în ordinea foii. */
  readonly definitii: readonly DefinitieCota[];
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

const sus = (unghi: number): Punct => {
  const r = (unghi * Math.PI) / 180;
  return { x: -Math.sin(r), y: Math.cos(r) };
};
const plus = (a: Punct, v: Punct, k: number): Punct => ({ x: a.x + v.x * k, y: a.y + v.y * k });

/** Cutia cifrei scrise ca text: lățimea ei în Helvetica, de la coborâre (un sfert din majusculă) la majusculă, rotită. */
function cutieText(t: DesenCota['text'], text: string): Cutie {
  const w = (inHelvetica(text).latime / 1000) * marimeHelvetica(t.inaltime), h = t.inaltime;
  const f = transformare(t.unghi, t.p);
  const colturi = [f({ x: -w / 2, y: -h / 4 }), f({ x: w / 2, y: -h / 4 }), f({ x: w / 2, y: h }), f({ x: -w / 2, y: h })];
  return { minX: Math.min(...colturi.map((p) => p.x)), minY: Math.min(...colturi.map((p) => p.y)), maxX: Math.max(...colturi.map((p) => p.x)), maxY: Math.max(...colturi.map((p) => p.y)) };
}

/**
 * Cota ca DIMENSION (ADR 0330 §7, felia 10.4↑c-2), din punctele citite, desenul și textul ei; null: fără valoare.
 * - orizontala și verticala: rotită la 0° sau 90° (felul 0), aliniata (felul 1): punctele măsurate (13, 14) și piciorul celui
 *   de-al doilea pe linia de cotă (10);
 * - raza (4): centrul (10) și punctul de pe cerc (15); diametrul (3): punctul de pe cerc (15) și cel opus lui (10); liderul
 *   (40) e cât stă mijlocul cifrei, proiectat pe linie, dincolo de cerc; cifra e pusă de om (128);
 * - unghiul, în sensul arcului (de unde pleacă, unde ajunge): din trei puncte (5), vârful (15) și câte un punct pe fiecare
 *   semidreaptă, la depărtarea punctului laturii (13, 14), plus mijlocul arcului (10); din patru (2), cele două laturi, fiecare
 *   în sensul semidreptei ei (13 → 14, 15 → 10), plus mijlocul arcului (16). Măsura, în radiani.
 * Mijlocul textului (11) e la jumătate de majusculă deasupra mijlocului bazei.
 */
export function definitieCota(c: Cota, p: readonly Punct[], dc: DesenCota, text: string, valoare: number | null): DefinitieCota | null {
  if (valoare === null || text.trim() === '') return null;
  const mijloc = plus(dc.text.p, sus(dc.text.unghi), dc.text.inaltime / 2);
  const baza = { element: c.id, steaguri: 32, text, mijloc };
  const [a, b] = p as [Punct, Punct];
  if (c.fel === 'orizontala' || c.fel === 'verticala' || c.fel === 'aliniata') {
    const puncte = { 13: a, 14: b, 10: dc.picioare[1] };
    return c.fel === 'aliniata' ? { ...baza, tip: 1, puncte, masura: valoare } : { ...baza, tip: 0, puncte, unghi: c.fel === 'orizontala' ? 0 : 90, masura: valoare };
  }
  if (c.fel === 'raza' || c.fel === 'diametru') {
    const r = Math.hypot(b.x - a.x, b.y - a.y);
    const u = { x: (b.x - a.x) / r, y: (b.y - a.y) / r };
    const lider = Math.abs((dc.text.p.x - a.x) * u.x + (dc.text.p.y - a.y) * u.y - r);
    const puncte = c.fel === 'raza' ? { 10: a, 15: b } : { 15: b, 10: { x: 2 * a.x - b.x, y: 2 * a.y - b.y } };
    return { ...baza, steaguri: 32 + 128, tip: c.fel === 'raza' ? 4 : 3, puncte, lider, masura: valoare };
  }
  const l = laturiUnghi(p);
  if (c.fel !== 'unghi' || !l || !dc.arc) return null;
  const s1 = c.linie?.s1 === -1 ? -1 : 1, s2 = c.linie?.s2 === -1 ? -1 : 1;
  const unit = (e: Punct, k: number): Punct => { const n = Math.hypot(e.x, e.y); return { x: (k * e.x) / n, y: (k * e.y) / n }; };
  const d1 = unit(l.e1, s1), d2 = unit(l.e2, s2);
  const primaD1 = d1.x * d2.y - d1.y * d2.x >= 0;
  const am = dc.arc.de + dc.arc.baleiaj / 2;
  const peArc = { x: dc.arc.centru.x + dc.arc.raza * Math.cos(am), y: dc.arc.centru.y + dc.arc.raza * Math.sin(am) };
  const masura = (valoare * Math.PI) / 180;
  if (p.length === 3) {
    const pe1 = plus(l.v, d1, Math.hypot(l.e1.x, l.e1.y)), pe2 = plus(l.v, d2, Math.hypot(l.e2.x, l.e2.y));
    const [x13, x14] = primaD1 ? [pe1, pe2] : [pe2, pe1];
    return { ...baza, tip: 5, puncte: { 15: l.v, 13: x13, 14: x14, 10: peArc }, masura };
  }
  const latura = (k: 0 | 1, s: number): readonly [Punct, Punct] => {
    const [q0, q1] = l.laturi[k] as readonly [Punct, Punct];
    return s === 1 ? [q0, q1] : [q1, q0];
  };
  const [prima, adoua] = primaD1 ? [latura(0, s1), latura(1, s2)] : [latura(1, s2), latura(0, s1)];
  return { ...baza, tip: 2, puncte: { 13: prima[0], 14: prima[1], 15: adoua[0], 10: adoua[1], 16: peArc }, masura };
}

/** Cotele foii `indexFoaie`, ca entități ale exportului (pe stratul COTE), cu cutia lor, semnele lipsă din font și definițiile. */
/** Cercul închis de rază `r` din `c`, din două semicercuri (bulge 1): un punct al cotei, ca formă. */
const cercContur = (c: Punct, r: number): Contur => ({
  inchis: true, varfuri: [{ p: { x: c.x - r, y: c.y }, s: { tip: 'A', bulge: 1 } }, { p: { x: c.x + r, y: c.y }, s: { tip: 'A', bulge: 1 } }],
});

/** Desenul unei cote ca forme (felia 10.4↑d-2): contururile, în mm ai foii, și semnele pe care fontul cifrelor nu le are. */
export type GeometrieCota = { readonly contururi: readonly Contur[]; readonly lipsa: readonly string[] };

/**
 * „Fă desen din cotă” (ADR 0330 §8, felia 10.4↑d-2), pur: desenul cotei `id` de pe foaie, același cu al pânzei și al
 * exportului, ca forme obișnuite, în ordine: liniile de extensie, linia de cotă (sau bucățile ei), arcul unghiului, trăsături
 * deschise; capetele (săgeata plină sau deschisă, un triunghi închis; punctul, un cerc închis; bara oblică, o trăsătură);
 * apoi cifrele, ca trăsăturile fontului cu o singură linie (așezate de `cifre`). Null: cota lipsă, cu un fel necunoscut sau
 * fără desen. Fără `cifre`, semnele cifrei rămân nedesenate și sunt spuse lipsă.
 */
export function geometrieCota(doc: Document, indexFoaie: number, id: string, o: Pick<OptiuniCote, 'stil' | 'format' | 'cifre'>): GeometrieCota | null {
  const c = doc.foi[indexFoaie]?.cote?.find((x) => x.id === id);
  if (!c || !felCunoscut(c.fel) || !Array.isArray(c.puncte)) return null;
  const lume = indexLume(doc, indexFoaie);
  const p = c.puncte.map((a) => punctAncora(a, lume).p);
  const valoare = valoareCota(c, p);
  const text = valoare === null ? '' : textCota(c, cifraCuToleranta(c, valoare, o.format));
  const dc = desenCota(c, p, o.stil, text);
  if (!dc) return null;
  const contururi: Contur[] = [...dc.extensii.map(([a, b]) => linie(a, b)), ...dc.bucati.map(([a, b]) => linie(a, b)), ...dc.arce.map(arcContur)];
  for (const k of dc.capete) {
    if (k.fel === 'bara') contururi.push(linie(k.bucata[0], k.bucata[1]));
    else if (k.fel === 'punct') contururi.push(cercContur(k.centru, k.raza));
    else contururi.push({ inchis: true, varfuri: k.puncte.map((q) => ({ p: q, s: LINIE })) });
  }
  const lipsa: string[] = [];
  if (text.trim() !== '') {
    if (!o.cifre) {
      for (const x of text) if (x.trim() && !lipsa.includes(x)) lipsa.push(x);
    } else {
      const t = o.cifre(textPentruFont(text), dc.text.inaltime);
      lipsa.push(...t.lipsa);
      const f = transformare(dc.text.unghi, dc.text.p);
      for (const k of t.contururi) contururi.push(mutaContur(k, f));
    }
  }
  return { contururi, lipsa };
}

export function entitatiCote(doc: Document, indexFoaie: number, o: OptiuniCote): CoteExport {
  const foaie = doc.foi[indexFoaie];
  const entitati: Entitate[] = [];
  const definitii: DefinitieCota[] = [];
  const lipsa = new Set<string>();
  let cutie = CUTIE_GOALA, cote = 0;
  if (!foaie?.cote?.length) return { entitati, cutie: null, cote, lipsa: [], definitii };
  const lume = indexLume(doc, indexFoaie);
  for (const c of foaie.cote) {
    if (!felCunoscut(c.fel) || !Array.isArray(c.puncte)) continue;
    const p = c.puncte.map((a) => punctAncora(a, lume).p);
    const valoare = valoareCota(c, p);
    const text = valoare === null ? '' : textCota(c, cifraCuToleranta(c, valoare, o.format));
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
    const def = definitieCota(c, p, dc, text, valoare);
    if (def) definitii.push(def);
    if (text.trim() === '') continue;
    if (o.ca === 'text') {
      entitati.push({ fel: 'text', strat: 'COTE', element: c.id, text, p: dc.text.p, unghi: dc.text.unghi, inaltime: dc.text.inaltime });
      cutie = uneste(cutie, cutieText(dc.text, text));
      continue;
    }
    if (!o.cifre) {
      for (const x of text) if (x.trim()) lipsa.add(x);
      continue;
    }
    const t = o.cifre(textPentruFont(text), dc.text.inaltime);
    for (const x of t.lipsa) lipsa.add(x);
    const f = transformare(dc.text.unghi, dc.text.p);
    for (const k of t.contururi) pune(mutaContur(k, f));
  }
  return { entitati, cutie: cote > 0 ? cutie : null, cote, lipsa: [...lipsa], definitii };
}
