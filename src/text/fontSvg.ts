/**
 * Fonturile SVG (ADR 0140 §7, felia 7.6↑b): formatul fonturilor de gravură Hershey / EMS și al fontului SVG al lui Relief,
 * cu trăsăturile ca subcăi deschise (fără Z). Fontul e un document XML cu un element `<font>`: `<font-face>` (`units-per-em`,
 * `ascent`, `descent`, `cap-height`, familia), glifele (`<glyph unicode d horiz-adv-x glyph-name>`) și crenarea (`<hkern>`).
 *
 * - **Ușa:** garda entităților importului SVG (ADR 0035 §1), apoi `DOMParser` (inert); un document fără `<font>` nu e un
 *   font. Coordonatele glifelor sunt ale fontului, cu Y în sus.
 * - **Mărimile, după SVG 1.1:** `units-per-em` implicit 1000; `ascent` implicit cât em-ul; `descent` luat sub linie,
 *   oricum ar fi scris semnul (implicit 0); avansul glifei, altfel al fontului (`horiz-adv-x`); majuscula e vârful lui H,
 *   altfel `cap-height`, altfel refuzul `majuscula`.
 * - **Glifele:** cele cu un singur caracter în `unicode` (prima câștigă; ligaturile se sar); căile citite cu
 *   `citesteDateCale` (comenzile absolute, pătraticele ridicate exact la cubice), ca puncte în convenția CFF: o subcale cu Z
 *   își are ultimul punct în start (o buclă, ADR 0140 §2), una fără Z se oprește în capătul ei; un desen de după Z pornește
 *   din start (parserul pune acolo un M). O glifă cu un arc nu se poate da (null, ca o glifă stricată).
 * - **Crenarea:** `hkern`, cu `u1` / `u2` (caractere sau intervale U+…, cu `?`) și `g1` / `g2` (nume); prima pereche găsită
 *   câștigă; `k` micșorează spațiul, deci crenarea e −k.
 *
 * Recunoașterea fontului cu o singură linie e cea comună (`cuOLinie`); un font SVG plin (glife închise) e un font obișnuit.
 */
import { problemaEntitati } from '../io/entitatiXml.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { citesteDateCale } from '../io/svgDate.ts';
import { cuOLinie } from './linie.ts';
import type { ConturFont, NumeFont, PunctFont } from './sfnt.ts';
import type { Font, RezultatFont } from './tipFont.ts';

/** Un fișier care e un font SVG: text XML (după spații, „<”; `TextDecoder` sare BOM-ul) cu un element `<font>` în primii 64 kB. */
export function esteFontSvg(octeti: Uint8Array): boolean {
  const t = new TextDecoder('utf-8').decode(octeti.subarray(0, 65_536)).trimStart();
  return t.startsWith('<') && /<(?:[A-Za-z_][\w.-]*:)?font[\s>/]/.test(t);
}

const numar = (el: Element | null, nume: string): number | null => {
  const v = el?.getAttribute(nume);
  if (v === null || v === undefined || v.trim() === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

/** Primul element cu numele dat, sub `el`, sau null. */
const primul = (el: Document | Element, nume: string): Element | null => el.getElementsByTagName(nume).item(0);

/**
 * Contururile unei căi a unei glife, în convenția CFF (punctele de control câte două); null: are un arc. Un desen de după Z
 * fără M îl pornește parserul, cu un M în startul subcăii închise (SVG 1.1, 8.3.3).
 */
function contururiCale(d: string): ConturFont[] | null {
  const rez: PunctFont[][] = [];
  let cur: PunctFont[] | null = null;
  for (const c of citesteDateCale(d).comenzi) {
    if (c.tip === 'A') return null;
    if (c.tip === 'M') rez.push((cur = [{ x: c.p.x, y: c.p.y, peCurba: true }]));
    else if (!cur) continue;
    else if (c.tip === 'Z') {
      const start = cur[0]!, u = cur[cur.length - 1]!;
      if (u.x !== start.x || u.y !== start.y) cur.push({ ...start });
    } else if (c.tip === 'L') cur.push({ x: c.p.x, y: c.p.y, peCurba: true });
    else cur.push({ x: c.c1.x, y: c.c1.y, peCurba: false }, { x: c.c2.x, y: c.c2.y, peCurba: false }, { x: c.p.x, y: c.p.y, peCurba: true });
  }
  return rez;
}

/** Stilul din `font-weight` și `font-style` (gol sau normal: Regular). */
function stil(ff: Element | null): string {
  const w = ff?.getAttribute('font-weight')?.trim() ?? '', s = ff?.getAttribute('font-style')?.trim() ?? '';
  const greutate = w === '' || /^(normal|400)$/i.test(w) ? '' : /^(bold|700)$/i.test(w) ? 'Bold' : w;
  const inclinare = s === '' || /^normal$/i.test(s) ? '' : /^italic$/i.test(s) ? 'Italic' : s;
  return [greutate, inclinare].filter((x) => x !== '').join(' ') || 'Regular';
}

/** Fontul SVG din octeți (o singură față), ca orice font citit de aplicație, sau refuzul cu codul cititorului. */
export function citesteFontSvg(octeti: Uint8Array): RezultatFont {
  if (octeti.length > PLAFON_IMPORT.octeti) return { ok: false, cod: 'stricat', detaliu: 'prea mare' };
  const text = new TextDecoder('utf-8').decode(octeti);
  const entitati = problemaEntitati(text);
  if (entitati) return { ok: false, cod: 'stricat', detaliu: `entități: ${entitati}` };
  if (typeof DOMParser === 'undefined') return { ok: false, cod: 'stricat', detaliu: 'fără parser XML' };
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  } catch (e) {
    return { ok: false, cod: 'stricat', detaliu: e instanceof Error ? e.message : String(e) };
  }
  if (doc.getElementsByTagName('parsererror').length > 0) return { ok: false, cod: 'stricat', detaliu: 'XML' };
  const font = primul(doc, 'font');
  if (!font) return { ok: false, cod: 'nu-e-font' };
  const ff = primul(font, 'font-face');
  const unitsPerEm = numar(ff, 'units-per-em') ?? 1000;
  if (!(unitsPerEm >= 16 && unitsPerEm <= 16384)) return { ok: false, cod: 'stricat', detaliu: `units-per-em ${unitsPerEm}` };
  const avansFont = numar(font, 'horiz-adv-x') ?? 0;
  // Glifa 0 e cea lipsă: `glifa()` o întoarce pentru un caracter pe care fontul nu-l are.
  const cai: string[] = [''];
  const avansuri: number[] = [avansFont];
  const harta = new Map<number, number>();
  const nume = new Map<string, number>();
  const glife = font.getElementsByTagName('glyph');
  if (glife.length > 65_535) return { ok: false, cod: 'stricat', detaliu: 'prea multe glife' };
  for (let k = 0; k < glife.length; k++) {
    const g = glife.item(k)!;
    const i = cai.length;
    cai.push(g.getAttribute('d') ?? '');
    avansuri.push(numar(g, 'horiz-adv-x') ?? avansFont);
    const u = g.getAttribute('unicode');
    const coduri = u === null ? [] : [...u];
    if (coduri.length === 1 && !harta.has(coduri[0]!.codePointAt(0)!)) harta.set(coduri[0]!.codePointAt(0)!, i);
    const n = g.getAttribute('glyph-name');
    if (n !== null && n !== '' && !nume.has(n)) nume.set(n, i);
  }
  if (harta.size === 0) return { ok: false, cod: 'fara-unicode' };
  const memorie = new Map<number, readonly ConturFont[] | null>();
  const contururi = (g: number): readonly ConturFont[] | null => {
    if (!memorie.has(g)) memorie.set(g, g > 0 && g < cai.length ? contururiCale(cai[g]!) : []);
    return memorie.get(g)!;
  };
  // Crenarea: prima pereche `hkern` care prinde două glife câștigă.
  const crenari = new Map<number, number>();
  const multime = (el: Element, u: string, g: string): number[] => {
    const rez = new Set<number>();
    for (const x of (el.getAttribute(u) ?? '').split(',')) {
      const s = x.trim();
      const m = /^U\+([0-9A-F?]{1,6})(?:-([0-9A-F]{1,6}))?$/i.exec(s);
      if (m) {
        const lo = parseInt(m[1]!.replace(/\?/g, '0'), 16), hi = m[2] ? parseInt(m[2], 16) : parseInt(m[1]!.replace(/\?/g, 'F'), 16);
        for (const [cod, i] of harta) if (cod >= lo && cod <= hi) rez.add(i);
      } else if ([...s].length === 1) {
        const i = harta.get(s.codePointAt(0)!);
        if (i !== undefined) rez.add(i);
      }
    }
    for (const x of (el.getAttribute(g) ?? '').split(',')) {
      const i = nume.get(x.trim());
      if (i !== undefined) rez.add(i);
    }
    return [...rez];
  };
  const hkern = font.getElementsByTagName('hkern');
  for (let k = 0; k < hkern.length; k++) {
    const el = hkern.item(k)!;
    const valoare = numar(el, 'k') ?? 0;
    const b = multime(el, 'u2', 'g2');
    // −k, cu zero pozitiv (0 − 0), ca orice crenare fără pereche.
    for (const a of multime(el, 'u1', 'g1')) for (const j of b) if (!crenari.has(a * 0x10000 + j)) crenari.set(a * 0x10000 + j, 0 - valoare);
  }
  // Majuscula: vârful lui H, altfel cap-height.
  const h = harta.get(0x48);
  const puncteH = h === undefined ? [] : (contururi(h) ?? []).flat();
  const varfH = puncteH.length > 0 ? Math.max(...puncteH.map((q) => q.y)) : 0;
  const majuscula = varfH > 0 ? varfH : numar(ff, 'cap-height') ?? 0;
  if (!(majuscula > 0)) return { ok: false, cod: 'majuscula' };
  const familie = ff?.getAttribute('font-family')?.trim() || font.getAttribute('id')?.trim() || 'Font SVG';
  const s = stil(ff);
  const numeFont: NumeFont = { familie, stil: s, complet: `${familie} ${s}`, postscript: font.getAttribute('id')?.trim() || familie.replace(/\s+/g, '') };
  const baza: Omit<Font, 'linie'> = {
    familie,
    nume: numeFont,
    unitsPerEm,
    majuscula,
    urcare: numar(ff, 'ascent') ?? unitsPerEm,
    coborare: 0 - Math.abs(numar(ff, 'descent') ?? 0),
    spatiuRanduri: 0,
    numarGlife: cai.length,
    cubice: true,
    axe: null,
    instante: null,
    glifa: (cod) => harta.get(cod) ?? 0,
    avans: (g) => avansuri[g] ?? avansFont,
    crenare: (a, b) => crenari.get(a * 0x10000 + b) ?? 0,
    contururi,
  };
  return { ok: true, font: { ...baza, linie: cuOLinie(baza) } };
}
