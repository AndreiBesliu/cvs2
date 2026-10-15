/**
 * Ușa SVG (ADR 0035, amendată de ADR 0037 §11): octeții unui fișier → căile, închise sau deschise, în mm, cu Y în sus și
 * pagina cu colțul stânga-jos în origine, plus raportul. Inertă: `DOMParser` fără context de navigare, nimic atașat,
 * nimic încărcat, doar atribute citite; matricile și unitățile le socotește ușa.
 */
import { LINIE, type Punct, type Segment, type Varf } from '../geom/contur.ts';
import { cutieContur } from '../geom/cutie.ts';
import { arcEliptic, bucatiArcEliptic } from '../geom/elipsa.ts';
import { aplica, compune, determinantNormat, esteSimilitudine, type Matrice } from '../geom/matrice.ts';
import { normalizeaza } from '../geom/nonzero.ts';
import { REZOLUTIE, TOLERANTA_IMPORT } from '../geom/toleranta.ts';
import { PLAFON } from '../model/document.ts';
import { citesteDateCale, citesteLungime, citestePuncte, citesteStil, citesteTransform, type ComandaCale } from './svgDate.ts';

import { CODURI_AVERTISMENT, PLAFON_IMPORT, type Avertismente, type CodAvertisment, type CodEntitati, type CodRefuz } from './svgCoduri.ts';

export {
  CODURI_AVERTISMENT, CODURI_ENTITATI, PLAFON_IMPORT, type Avertismente, type CodAvertisment, type CodEntitati, type CodRefuz,
} from './svgCoduri.ts';

export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * O cale a fișierului, în mm, pe pagină. `forma` e indexul formei SVG din care vine, în ordinea documentului. `inchis` o
 * spune ușa, iar importul îl citește (ADR 0037 §2). O cale deschisă (§11) are vârfurile subcăii plus punctul final, cu
 * segmentul L: n vârfuri, n − 1 segmente.
 */
export type CaleSvg = { readonly varfuri: readonly Varf[]; readonly inchis: boolean; readonly forma: number; readonly nume?: string };

export type RezultatSvg =
  | {
    readonly ok: true;
    readonly cai: readonly CaleSvg[];
    /** Mărimea paginii în mm, sau null dacă fișierul n-o declară (ADR 0035 §2). */
    readonly pagina: { readonly latime: number; readonly inaltime: number } | null;
    /** Maparea depinde de `pxPeTol` (pagina fără mărime absolută, sau fără `viewBox`). */
    readonly px: boolean;
    /** Comentariul din fișier spune că l-a scris Illustrator. */
    readonly illustrator: boolean;
    readonly avertismente: Avertismente;
  }
  | { readonly ok: false; readonly cod: CodRefuz; readonly detaliu?: string; readonly avertismente?: Avertismente };

/** Parserul XML: `DOMParser` în browser; în teste, unul injectat (`@xmldom/xmldom`). */
export type ParserXml = { parseFromString(text: string, tip: 'image/svg+xml'): Document };

/** `limba`: limba aplicației, pentru `systemLanguage` din `switch` (implicit `en`). */
export type OptiuniSvg = { readonly pxPeTol?: 96 | 72; readonly parser?: ParserXml; readonly limba?: string };

/* ── Intrarea: octeții, arhiva, entitățile ─────────────────────────────────────────────────────────────────────────── */

/**
 * Entitățile XML, judecate pe text înaintea parserului (ADR 0035 §1): nicio entitate parametru sau externă, nicio valoare
 * cu `&` sau `<`, nicio valoare implicită în `<!ATTLIST>`, iar expansiunea (aparițiile × lungimea) cel mult cât plafonul
 * de octeți. Codul motivului (fără text din fișier), sau null.
 */
export function problemaEntitati(text: string): CodEntitati | null {
  // Valorile implicite din <!ATTLIST> se pun pe fiecare element (Edge le aplică): o amplificare pe care numărătoarea
  // entităților n-o vede (recenzia 2.7c). O declarație cu o valoare literală se refuză; #IMPLIED / #REQUIRED trec.
  for (let de = text.indexOf('<!ATTLIST'); de >= 0;) {
    const sfarsit = text.indexOf('>', de);
    if (sfarsit < 0) break;
    const declaratie = text.slice(de, sfarsit);
    if (declaratie.includes('"') || declaratie.includes("'")) return 'attlist';
    de = text.indexOf('<!ATTLIST', sfarsit);
  }
  const valori = new Map<string, string>();
  let declaratii = 0;
  let de = text.indexOf('<!ENTITY');
  while (de >= 0) {
    let i = de + '<!ENTITY'.length;
    const spatiu = (): void => { while (i < text.length && /[\t\n\r ]/.test(text[i] ?? '')) i++; };
    spatiu();
    if (text[i] === '%') return 'parametru';
    const nume = /^[^\s"'>%&;]+/.exec(text.slice(i, i + 256))?.[0];
    if (!nume) return 'fara-nume';
    i += nume.length;
    spatiu();
    const ghilimea = text[i];
    if (ghilimea !== '"' && ghilimea !== "'") return 'externa';
    const sfarsit = text.indexOf(ghilimea, i + 1);
    if (sfarsit < 0) return 'neterminata';
    const valoare = text.slice(i + 1, sfarsit);
    if (/[&<]/.test(valoare)) return 'valoare';
    // XML 1.0 §4.2 (și Edge): la o declarație dublă contează prima (recenzia 2.7c: ultima ascundea o valoare uriașă).
    if (!valori.has(nume)) valori.set(nume, valoare);
    if (++declaratii > PLAFON_IMPORT.entitati) return 'numar';
    de = text.indexOf('<!ENTITY', sfarsit);
  }
  let expandat = 0;
  for (const [nume, valoare] of valori) {
    const ref = `&${nume};`;
    let aparitii = 0;
    for (let i = text.indexOf(ref); i >= 0; i = text.indexOf(ref, i + ref.length)) aparitii++;
    expandat += aparitii * valoare.length;
    if (expandat > PLAFON_IMPORT.octeti) return 'expansiune';
  }
  return null;
}

/* ── Unitățile, pagina, stilurile ──────────────────────────────────────────────────────────────────────────────────── */

const MM: Readonly<Record<string, number>> = { mm: 1, cm: 10, q: 0.25, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6 };

/** O lungime absolută în mm (`px` și fără unitate: la `pxPeTol`), sau null pentru procente, em, ex și ce nu se citește. */
function lungimeMm(text: string | null, pxPeTol: number): number | null {
  const l = citesteLungime(text);
  if (!l) return null;
  if (l.unitate === '' || l.unitate === 'px') return (l.valoare * 25.4) / pxPeTol;
  const k = MM[l.unitate];
  return k === undefined ? null : l.valoare * k;
}

/** Un atribut de lungime al unei forme, în unități utilizator (CSS: 96 px pe țol), `undefined` dacă lipsește, null dacă nu se poate citi. */
function lungimeUtilizator(el: Element, nume: string): number | null | undefined {
  const text = el.getAttribute(nume);
  if (text === null) return undefined;
  const l = citesteLungime(text);
  if (!l) return null;
  if (l.unitate === '' || l.unitate === 'px') return l.valoare;
  const k = MM[l.unitate];
  return k === undefined ? null : (l.valoare * k * 96) / 25.4;
}

type Stil = {
  readonly display: string | null; readonly visibility: string | null; readonly fillRule: string | null; readonly fill: string | null;
};

/** Proprietățile pe care ușa le citește din stiluri (ADR 0035 §4). */
const PROPRIETATI = ['display', 'visibility', 'fill-rule', 'fill'] as const;

/** O regulă simplă din `<style>`: un selector compus fără combinatori (`element`, `.clasă`, `#id`, `*`, lipite). */
type RegulaCss = {
  readonly tag: string | null; readonly id: string | null; readonly clase: readonly string[];
  readonly specificitate: number; readonly ordine: number; readonly decl: ReadonlyMap<string, string>;
};

/** Plafonul regulilor CSS citite: peste el, stilurile nu se citesc deloc (ca în 2.7c), cu avertismentul `stil`. */
const PLAFON_REGULI_CSS = 10_000;

/**
 * Plafonul potrivirilor CSS pe tot fișierul (regulă × element verificate): peste el, fișierul se refuză (`plafon`, cu
 * detaliul `css`), nu se citește pe jumătate stilat. Un fișier Illustrator face ~1 potrivire pe element.
 */
const PLAFON_POTRIVIRI_CSS = 20_000_000;

/** Bugetul potrivirilor CSS s-a terminat: citirea se oprește, fișierul se refuză. */
class PesteCss extends Error {}

/**
 * Regulile simple din `<style>` (ADR 0035 §4, recenzia 2.7d: Illustrator pune `fill-rule: evenodd` și `fill: none` în clase,
 * iar normalizarea `nonzero` le umplea găurile). Comentariile și regulile `@` se sar; selectorii cu combinatori, atribute sau
 * pseudo-clase se ignoră. Doar `display`, `visibility`, `fill-rule` și `fill`. `ignorate`: ceva din `<style>` care putea
 * schimba aceste proprietăți nu s-a citit (avertismentul `stil`).
 */
function citesteCss(doc: Document): { readonly index: IndexCss; readonly ignorate: boolean } {
  const stiluri = doc.getElementsByTagName('style');
  let text = '';
  for (let i = 0; i < stiluri.length; i++) text += `${stiluri.item(i)?.textContent ?? ''}\n`;
  text = text.replace(/\/\*[^]*?\*\//g, ' ');
  // Regulile `@` (media, font-face, import…), cu blocul lor, se scot: adâncimea acoladelor, liniar.
  let curat = '';
  let ignorate = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '@') {
      curat += text[i];
      continue;
    }
    ignorate = true;
    let j = i;
    while (j < text.length && text[j] !== '{' && text[j] !== ';') j++;
    if (text[j] === '{') {
      let adancime = 0;
      for (; j < text.length; j++) {
        if (text[j] === '{') adancime++;
        else if (text[j] === '}' && --adancime === 0) break;
      }
    }
    i = j;
  }
  const reguli: RegulaCss[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(curat); m; m = re.exec(curat)) {
    const decl = new Map<string, string>();
    for (const [k, v] of citesteStil(m[2] ?? '')) if ((PROPRIETATI as readonly string[]).includes(k)) decl.set(k, v.trim().toLowerCase());
    if (decl.size === 0) continue;
    // `!important` ar câștiga și peste `style`: aici se citește ca o declarație obișnuită, cu avertisment.
    if (/!\s*important/i.test(m[2] ?? '')) ignorate = true;
    for (const sel of (m[1] ?? '').split(',')) {
      const t = /^\s*([a-zA-Z][\w-]*|\*)?((?:[.#][\w-]+)*)\s*$/.exec(sel);
      const parti = t?.[2]?.match(/[.#][\w-]+/g) ?? [];
      const ids = parti.filter((x) => x.startsWith('#')).map((x) => x.slice(1));
      if (!t || (!t[1] && !t[2]) || ids.length > 1) {
        ignorate = true;
        continue;
      }
      const clase = parti.filter((x) => x.startsWith('.')).map((x) => x.slice(1));
      const tag = t[1] && t[1] !== '*' ? t[1] : null;
      reguli.push({
        tag, id: ids[0] ?? null, clase, specificitate: ids.length * 10_000 + clase.length * 100 + (tag ? 1 : 0), ordine: reguli.length, decl,
      });
      if (reguli.length > PLAFON_REGULI_CSS) return { index: INDEX_GOL, ignorate: true };
    }
  }
  // Indexul: fiecare regulă stă sub prima ei clasă, altfel sub id, altfel sub element, altfel la „oricare”. Un element se
  // potrivește doar cu regulile din gălețile lui (potrivirea rămâne liniară în elemente).
  const idx: IndexCss = { clase: new Map(), id: new Map(), tag: new Map(), oricare: [] };
  const pune = (m: Map<string, RegulaCss[]>, k: string, r: RegulaCss): void => { const l = m.get(k); if (l) l.push(r); else m.set(k, [r]); };
  for (const r of reguli) {
    const c = r.clase[0];
    if (c !== undefined) pune(idx.clase, c, r);
    else if (r.id) pune(idx.id, r.id, r);
    else if (r.tag) pune(idx.tag, r.tag, r);
    else idx.oricare.push(r);
  }
  return { index: idx, ignorate };
}

type IndexCss = {
  readonly clase: Map<string, RegulaCss[]>; readonly id: Map<string, RegulaCss[]>; readonly tag: Map<string, RegulaCss[]>;
  readonly oricare: RegulaCss[];
};
const INDEX_GOL: IndexCss = { clase: new Map(), id: new Map(), tag: new Map(), oricare: [] };

/**
 * Stilul unui element: atributul de prezentare, peste el regulile CSS (după specificitate și ordine), peste ele `style`.
 * `lucru` numără potrivirile CSS ale întregului fișier (`PLAFON_POTRIVIRI_CSS`).
 */
function stilElement(el: Element, css: IndexCss, lucru: { potriviri: number }): Stil {
  const val = new Map<string, string>();
  for (const k of PROPRIETATI) {
    const a = el.getAttribute(k);
    if (a !== null) val.set(k, a.trim().toLowerCase());
  }
  const tag = el.localName;
  const id = el.getAttribute('id');
  const clase = new Set((el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
  const candidate = [...css.oricare, ...(css.tag.get(tag) ?? []), ...(id ? css.id.get(id) ?? [] : [])];
  for (const c of clase) candidate.push(...(css.clase.get(c) ?? []));
  lucru.potriviri += candidate.length;
  if (lucru.potriviri > PLAFON_POTRIVIRI_CSS) throw new PesteCss();
  if (candidate.length > 0) {
    candidate.sort((a, b) => a.specificitate - b.specificitate || a.ordine - b.ordine);
    for (const r of candidate) {
      if ((r.tag && r.tag !== tag) || (r.id && r.id !== id) || !r.clase.every((c) => clase.has(c))) continue;
      for (const [k, v] of r.decl) val.set(k, v);
    }
  }
  for (const [k, v] of citesteStil(el.getAttribute('style'))) if ((PROPRIETATI as readonly string[]).includes(k)) val.set(k, v.trim().toLowerCase());
  return { display: val.get('display') ?? null, visibility: val.get('visibility') ?? null, fillRule: val.get('fill-rule') ?? null, fill: val.get('fill') ?? null };
}

/** Maparea `viewBox` → viewport (SVG 2 §8.2), cu `preserveAspectRatio`. Viewport-ul are mărimea (w, h), în mm. */
function mapareViewBox(vb: readonly [number, number, number, number], w: number, h: number, par: string | null): Matrice {
  const [vx, vy, vw, vh] = vb;
  let sx = w / vw;
  let sy = h / vh;
  const m = /^\s*(?:defer\s+)?(none|x(Min|Mid|Max)Y(Min|Mid|Max))(?:\s+(meet|slice))?\s*$/.exec(par ?? '');
  const aliniere = m ? m[1] : 'xMidYMid';
  if (aliniere !== 'none') {
    const s = (m?.[4] ?? 'meet') === 'slice' ? Math.max(sx, sy) : Math.min(sx, sy);
    sx = s;
    sy = s;
  }
  let tx = -vx * sx;
  let ty = -vy * sy;
  const ax = m?.[2] ?? 'Mid';
  const ay = m?.[3] ?? 'Mid';
  if (aliniere !== 'none') {
    if (ax === 'Mid') tx += (w - vw * sx) / 2;
    else if (ax === 'Max') tx += w - vw * sx;
    if (ay === 'Mid') ty += (h - vh * sy) / 2;
    else if (ay === 'Max') ty += h - vh * sy;
  }
  return { a: sx, b: 0, c: 0, d: sy, e: tx, f: ty };
}

/* ── Geometria formelor, în unitățile lor ──────────────────────────────────────────────────────────────────────────── */

/** O subcale în coordonatele formei: comenzile de la M încolo, și dacă se termină cu Z. */
type SubcaleLocala = { start: Punct; comenzi: ComandaCale[]; z: boolean };

function subcai(comenzi: readonly ComandaCale[]): SubcaleLocala[] {
  const rez: SubcaleLocala[] = [];
  let cur: SubcaleLocala | null = null;
  for (const c of comenzi) {
    if (c.tip === 'M') {
      cur = { start: c.p, comenzi: [], z: false };
      rez.push(cur);
    } else if (c.tip === 'Z') {
      if (cur) cur.z = true;
      cur = null;
    } else if (cur) {
      cur.comenzi.push(c);
    }
  }
  return rez;
}


/**
 * `rx` / `ry` ca în Edge (recenzia 2.7c): un atribut necitibil (și „auto” scris ca atribut) e 0, iar unul negativ e lipsă
 * (ia valoarea celuilalt).
 */
const raza = (v: number | null | undefined): number | undefined => (v === null ? 0 : v !== undefined && v < 0 ? undefined : v);

/** Geometria unei forme ca date de cale, sau un motiv pentru care se sare: `tacut` (SVG n-o desenează), `invalid`. */
function dateForma(el: Element, tip: string): { comenzi: ComandaCale[]; eroare: boolean } | 'tacut' | 'invalid' {
  const L = (nume: string): number | null | undefined => lungimeUtilizator(el, nume);
  if (tip === 'path') {
    const d = citesteDateCale(el.getAttribute('d') ?? '');
    return { comenzi: [...d.comenzi], eroare: d.eroare };
  }
  if (tip === 'polyline' || tip === 'polygon') {
    const { puncte, eroare } = citestePuncte(el.getAttribute('points') ?? '');
    const comenzi: ComandaCale[] = puncte.map((p, i) => ({ tip: i === 0 ? 'M' : 'L', p }) as ComandaCale);
    if (tip === 'polygon' && comenzi.length > 0) comenzi.push({ tip: 'Z' });
    return { comenzi, eroare };
  }
  if (tip === 'line') {
    const [x1, y1, x2, y2] = [L('x1'), L('y1'), L('x2'), L('y2')];
    if (x1 === null || y1 === null || x2 === null || y2 === null) return 'invalid';
    return { comenzi: [{ tip: 'M', p: { x: x1 ?? 0, y: y1 ?? 0 } }, { tip: 'L', p: { x: x2 ?? 0, y: y2 ?? 0 } }], eroare: false };
  }
  if (tip === 'rect') {
    const [x, y, w, h] = [L('x'), L('y'), L('width'), L('height')];
    if (x === null || y === null || w === null || h === null) return 'invalid';
    if ((w ?? 0) < 0 || (h ?? 0) < 0) return 'invalid';
    if (!w || !h) return 'tacut';
    const x0 = x ?? 0;
    const y0 = y ?? 0;
    let [rx, ry] = [raza(L('rx')), raza(L('ry'))];
    rx ??= ry;
    ry ??= rx;
    const rxx = Math.min(rx ?? 0, w / 2);
    const ryy = Math.min(ry ?? 0, h / 2);
    if (rxx === 0 || ryy === 0) {
      return { comenzi: [
        { tip: 'M', p: { x: x0, y: y0 } }, { tip: 'L', p: { x: x0 + w, y: y0 } }, { tip: 'L', p: { x: x0 + w, y: y0 + h } },
        { tip: 'L', p: { x: x0, y: y0 + h } }, { tip: 'Z' },
      ], eroare: false };
    }
    // Colțurile, cu centrul și unghiurile știute (sferturi în sensul unghiului crescător al spațiului SVG).
    const a = (x1: number, y1: number, cx: number, cy: number, t1: number): ComandaCale => ({
      tip: 'A', rx: rxx, ry: ryy, rotire: 0, mare: false, pozitiv: true, p: { x: x1, y: y1 },
      exact: { centru: { x: cx, y: cy }, t1, baleiaj: Math.PI / 2 },
    });
    return { comenzi: [
      { tip: 'M', p: { x: x0 + rxx, y: y0 } },
      { tip: 'L', p: { x: x0 + w - rxx, y: y0 } }, a(x0 + w, y0 + ryy, x0 + w - rxx, y0 + ryy, -Math.PI / 2),
      { tip: 'L', p: { x: x0 + w, y: y0 + h - ryy } }, a(x0 + w - rxx, y0 + h, x0 + w - rxx, y0 + h - ryy, 0),
      { tip: 'L', p: { x: x0 + rxx, y: y0 + h } }, a(x0, y0 + h - ryy, x0 + rxx, y0 + h - ryy, Math.PI / 2),
      { tip: 'L', p: { x: x0, y: y0 + ryy } }, a(x0 + rxx, y0, x0 + rxx, y0 + ryy, Math.PI),
      { tip: 'Z' },
    ], eroare: false };
  }
  if (tip === 'circle' || tip === 'ellipse') {
    const [cx, cy] = [L('cx'), L('cy')];
    if (cx === null || cy === null) return 'invalid';
    let rx: number | undefined;
    let ry: number | undefined;
    if (tip === 'circle') {
      const r = L('r');
      if (r === null || (r ?? 0) < 0) return 'invalid';
      rx = r;
      ry = r;
    } else {
      [rx, ry] = [raza(L('rx')), raza(L('ry'))];
      rx ??= ry;
      ry ??= rx;
    }
    if (!rx || !ry) return 'tacut';
    const x = cx ?? 0;
    const y = cy ?? 0;
    // Două jumătăți, cu centrul știut (nu din capete: la 180°, F.6.5 amplifică rotunjirea lui cx ± rx).
    const a = (x1: number, t1: number): ComandaCale => ({
      tip: 'A', rx, ry, rotire: 0, mare: false, pozitiv: true, p: { x: x1, y }, exact: { centru: { x, y }, t1, baleiaj: Math.PI },
    });
    return { comenzi: [{ tip: 'M', p: { x: x + rx, y } }, a(x - rx, 0), a(x + rx, Math.PI), { tip: 'Z' }], eroare: false };
  }
  return 'tacut';
}

/** Centrul arcului SVG (F.6.5, F.6.6), în coordonatele formei; null = capete egale (se omite), 'linie' = o rază 0. */
function arcCentru(p1: Punct, a: Extract<ComandaCale, { tip: 'A' }>):
  null | 'linie' | { cx: number; cy: number; rx: number; ry: number; cos: number; sin: number; t1: number; dt: number } {
  const p2 = a.p;
  if (p1.x === p2.x && p1.y === p2.y) return null;
  let rx = Math.abs(a.rx);
  let ry = Math.abs(a.ry);
  if (rx === 0 || ry === 0) return 'linie';
  if (a.exact) return { cx: a.exact.centru.x, cy: a.exact.centru.y, rx, ry, cos: 1, sin: 0, t1: a.exact.t1, dt: a.exact.baleiaj };
  const phi = ((a.rotire % 360) * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p1.x - p2.x) / 2;
  const dy = (p1.y - p2.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  // Cu razele mărite (Λ ≥ 1), arcul e exact o jumătate, iar centrul e mijlocul coardei: rădăcina e 0 exact, nu zgomotul
  // de √ε al rotunjirii (oracolul 2.7c: un semicerc împărțit în două, centre mutate cu până la 8e-6 mm).
  let co = lam >= 1 ? 0 : Math.sqrt(Math.max(0, num / den));
  if (a.mare === a.pozitiv) co = -co;
  const cxp = (co * rx * y1) / ry;
  const cyp = (-co * ry * x1) / rx;
  const cx = cos * cxp - sin * cyp + (p1.x + p2.x) / 2;
  const cy = sin * cxp + cos * cyp + (p1.y + p2.y) / 2;
  const ux = (x1 - cxp) / rx;
  const uy = (y1 - cyp) / ry;
  const vx = (-x1 - cxp) / rx;
  const vy = (-y1 - cyp) / ry;
  const t1 = Math.atan2(uy, ux);
  let dt = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!a.pozitiv && dt > 0) dt -= 2 * Math.PI;
  else if (a.pozitiv && dt < 0) dt += 2 * Math.PI;
  return { cx, cy, rx, ry, cos, sin, t1, dt };
}

type Numaratoare = Record<CodAvertisment, number>;

/** Plafonul de lucru al citirii (`PLAFON_IMPORT.varfuriLucru`) a fost atins: citirea se oprește. */
class PestePlafon extends Error {}

/** O subcale citită: vârfurile ei în mm și dacă e închisă (ADR 0037 §2, §11). */
type CaleCitita = { readonly varfuri: Varf[]; readonly inchis: boolean };

/**
 * O subcale a formei, în mm (ADR 0035 §6, §7; ADR 0037 §11): calea, închisă sau deschisă, 'goala' (un M singur),
 * 'degenerata' (fără arie, sau o cale deschisă fără lungime), 'praf' (o cale închisă sub rezoluție) sau 'prea-mare' (peste
 * `PLAFON.varfuriCale`: citirea ei se oprește acolo). Liniile și cubicele trec exact prin M; arcele de cerc sub o
 * similitudine rămân arce (împărțite peste 180°), restul devin cubice sub `TOLERANTA_IMPORT`. `lucru` numără vârfurile
 * produse de toată citirea. `umplut` = 'linie' pentru elementul `line`: mereu deschis, niciodată umplut (ADR 0035 §4).
 */
function subcaleMm(
  sc: SubcaleLocala, M: Matrice, sim: boolean, semn: number, n: Numaratoare, lucru: { varfuri: number }, umplut: boolean | 'linie',
): CaleCitita | 'goala' | 'prea-mare' | 'degenerata' | 'praf' {
  const varfuri: Varf[] = [];
  let local = sc.start;
  let cur = aplica(M, sc.start);
  let desenate = 0;
  const adauga = (s: Segment, capat: Punct): void => {
    varfuri.push({ p: cur, s });
    cur = capat;
    if (++lucru.varfuri > PLAFON_IMPORT.varfuriLucru) throw new PestePlafon();
  };
  for (const c of sc.comenzi) {
    if (varfuri.length > PLAFON.varfuriCale) return 'prea-mare';
    if (c.tip === 'M' || c.tip === 'Z') continue;
    desenate++;
    if (c.tip === 'L') {
      if (c.p.x !== local.x || c.p.y !== local.y) adauga(LINIE, aplica(M, c.p));
    } else if (c.tip === 'C') {
      const nul = [c.c1, c.c2, c.p].every((q) => q.x === local.x && q.y === local.y);
      if (!nul) adauga({ tip: 'C', c1: aplica(M, c.c1), c2: aplica(M, c.c2) }, aplica(M, c.p));
    } else {
      const k = arcCentru(local, c);
      if (k === 'linie') {
        adauga(LINIE, aplica(M, c.p));
      } else if (k) {
        const capat = aplica(M, c.p);
        let cubice = !sim || k.rx !== k.ry;
        let plat = false;
        if (!cubice) {
          // Raza în mm, din centrul F.6.5 (bine condiționat), nu din coardă și bulge: aproape de 360°, coarda e minusculă și
          // tan(Δθ/4) uriaș, iar produsul lor ieșea cu altă rază (recenzia 2.7c: 58 mm în loc de 50). Marja de 0,1 % ține
          // arcul departe de plafonul ușii documentului, care îl socotește din coardă.
          const razaMm = k.rx * Math.hypot(M.a, M.b);
          if (!(razaMm <= PLAFON.latura * 0.999)) {
            cubice = true;
            plat = true;
          } else if (Math.abs(k.dt) > Math.PI) {
            // Peste 180°: două jumătăți; mijlocul arcului din centrul lui, în coordonatele formei.
            const tm = k.t1 + k.dt / 2;
            const mij = aplica(M, {
              x: k.cx + k.rx * Math.cos(tm) * k.cos - k.ry * Math.sin(tm) * k.sin,
              y: k.cy + k.rx * Math.cos(tm) * k.sin + k.ry * Math.sin(tm) * k.cos,
            });
            const jum = Math.tan(k.dt / 8) * semn;
            adauga({ tip: 'A', bulge: jum }, mij);
            adauga({ tip: 'A', bulge: jum }, capat);
          } else if (capat.x !== cur.x || capat.y !== cur.y) {
            adauga({ tip: 'A', bulge: Math.tan(k.dt / 4) * semn }, capat);
          }
          // Altfel, capetele unui arc de cel mult o jumătate s-au contopit în mm: n-are lungime, deci se omite.
        }
        if (cubice) {
          // Harta elipsei în mm: M · (centrul, rotirea φ, razele).
          const h = compune(M, { a: k.rx * k.cos, b: k.rx * k.sin, c: -k.ry * k.sin, d: k.ry * k.cos, e: k.cx, f: k.cy });
          // Cubicele se numără înainte să se facă: un arc cât un continent ar cere milioane.
          // Un vârf rămâne pentru linia de închidere (recenzia 2.7c).
          if (!(bucatiArcEliptic(h, k.dt, TOLERANTA_IMPORT) <= PLAFON.varfuriCale - varfuri.length - 1)) return 'prea-mare';
          const lant = arcEliptic(h, k.t1, k.dt, cur, capat, TOLERANTA_IMPORT);
          n[plat ? 'arce-plate' : 'arce-eliptice']++;
          n['cubice-din-arce'] += lant.length;
          for (const q of lant) adauga({ tip: 'C', c1: q.c1, c2: q.c2 }, q.b);
        }
      }
    }
    local = c.p;
  }
  // Un M singur nu e o subcale; cu Z, e una închisă, fără niciun vârf (deci degenerată).
  if (desenate === 0) return sc.z ? 'degenerata' : 'goala';
  // `line` e mereu deschisă (ADR 0037 §11: „orice line”): vârfurile ei plus punctul final, fără nicio închidere.
  if (umplut === 'linie') return deschisa(varfuri, cur);
  const start = aplica(M, sc.start);
  const gol = Math.hypot(cur.x - start.x, cur.y - start.y);
  // Cum se închide o subcale fără Z (ADR 0037 §11): o formă umplută, ca în browser (care o umple); una trasă doar cu
  // linie, doar dacă golul e sub rezoluție. Altfel rămâne deschisă: o cale deschisă, cu punctul final.
  let inchidere: 'umplere' | 'usa' | null = null;
  if (gol > TOLERANTA_IMPORT) {
    if (!sc.z) {
      if (!umplut && gol > REZOLUTIE) return deschisa(varfuri, cur);
      inchidere = umplut ? 'umplere' : 'usa';
    }
    varfuri.push({ p: cur, s: LINIE });
  } else if (gol > 0) {
    // Capătul se lipește de primul vârf; un mâner egal cu el (cubica cu mânerul retras: `s-1-1-1-1z` din Illustrator) se
    // lipește odată cu el. Altfel rămânea la 1 ulp de vârf, cu o tangentă din zgomot, iar normalizarea `nonzero` refuza
    // forma (logoul AS Roma, 13.10: 2 forme din 95).
    const ultim = varfuri[varfuri.length - 1];
    if (ultim && ultim.s.tip === 'C') {
      const lipit = (q: Punct): Punct => (q.x === cur.x && q.y === cur.y ? start : q);
      varfuri[varfuri.length - 1] = { p: ultim.p, s: { tip: 'C', c1: lipit(ultim.s.c1), c2: lipit(ultim.s.c2) } };
    }
  }
  // Plafonul se judecă după linia de închidere (recenzia 2.7c: 50 001 de vârfuri treceau de ușă și opreau tot importul).
  if (varfuri.length > PLAFON.varfuriCale) return 'prea-mare';
  const unic = varfuri[0];
  if (varfuri.length === 1 && unic && unic.s.tip === 'C') {
    const b = bucla(unic.p, unic.s.c1, unic.s.c2);
    return praf(b) ? 'praf' : { varfuri: b, inchis: true };
  }
  // O subcale pe care închiderea o face degenerată rămâne deschisă (ADR 0037 §11): nu era un contur. Vârful adăugat de
  // închidere e chiar punctul final al căii deschise (capătul, cu segmentul L), deci nu se mai adaugă o dată.
  if (varfuri.length < 2) return inchidere ? deschisa(varfuri.slice(0, -1), cur) : 'degenerata';
  // O închidere fără arie e o linie (ADR 0037 §11, precizarea 2.3c-6): închisă de ușă sau de umplere, fără linia de
  // închidere (n-a fost desenată); închisă de autor (Z, sau dus-întors până în start), cu drumul înapoi, cum e desenată.
  const linie = (): ReturnType<typeof deschisa> => (inchidere ? deschisa(varfuri.slice(0, -1), cur) : deschisa(varfuri, start));
  // (2) Doar linii, toate pe o dreaptă (exact): conturul n-are arie (nici browserul nu-l umple).
  if (varfuri.every((v) => v.s.tip === 'L') && peODreapta(varfuri)) return linie();
  // (3) Praful (ADR 0037 §11), după degenerare (un `M…Z` fără segmente rămâne degenerat, ca în 2.7c): sub rezoluție, CAM-ul
  // refuza tot exportul.
  if (praf(varfuri)) return 'praf';
  // (4) După praf: fără arce, toate punctele, cu mânerele, la cel mult REZOLUTIE / 2 de o dreaptă (o linie scrisă cu C / Q,
  // cu zgomotul rotunjirii): tot o linie (recenzia A: umplută, era închisă și dispărea la normalizare).
  if (varfuri.every((v) => v.s.tip !== 'A') && peODreapta(varfuri, REZOLUTIE / 2)) return linie();
  if (inchidere === 'umplere') n['inchise-de-umplere']++;
  else if (inchidere === 'usa') n['inchise-la-usa']++;
  return { varfuri, inchis: true };
}

/**
 * Calea deschisă a unei subcăi (ADR 0037 §11): vârfurile ei plus punctul final, cu segmentul L. Plafonul căii se judecă
 * cu vârful final inclus; e degenerată dacă are mai puțin de 2 vârfuri distincte sau lungimea pe curbă sub `REZOLUTIE`.
 * Praful nu se judecă aici: o cale lăsată deschisă cu golul peste 0,01 mm are diagonala cel puțin cât golul, iar una
 * rămasă deschisă după o închidere degenerată nu era un contur (ADR 0037 §11, „Praful”).
 */
function deschisa(varfuri: readonly Varf[], capat: Punct): CaleCitita | 'prea-mare' | 'degenerata' {
  const v = [...varfuri, { p: capat, s: LINIE }];
  if (v.length > PLAFON.varfuriCale) return 'prea-mare';
  const p0 = capat;
  if (!v.some((x) => x.p.x !== p0.x || x.p.y !== p0.y)) return 'degenerata';
  return lungimeDeschisa(v) < REZOLUTIE ? 'degenerata' : { varfuri: v, inchis: false };
}

/**
 * Lungimea pe curbă a unei căi deschise (n − 1 segmente), până la rezoluție: doar pragul contează, deci socoteala se
 * oprește odată trecută de el. Linia exact; arcul din coardă și bulge (r·θ); cubica prin `lungimeCubica`.
 */
function lungimeDeschisa(v: readonly Varf[]): number {
  let l = 0;
  for (let i = 0; i + 1 < v.length && l < REZOLUTIE; i++) {
    const a = v[i] as Varf, b = (v[i + 1] as Varf).p;
    const coarda = Math.hypot(b.x - a.p.x, b.y - a.p.y);
    if (a.s.tip === 'L') l += coarda;
    else if (a.s.tip === 'A') {
      // r·θ = coarda·(1 + β²)·atan|β| / |β|; spre β → 0, coarda.
      const k = Math.abs(a.s.bulge);
      l += k === 0 ? coarda : (coarda * (1 + k * k) * Math.atan(k)) / k;
    } else l += lungimeCubica(a.p, a.s.c1, a.s.c2, b, REZOLUTIE - l, 0);
  }
  return l;
}

/**
 * Lungimea unei cubice, prin împărțiri de Casteljau: coarda e o margine de jos, poligonul de control una de sus. O bucată
 * a cărei coardă trece de `ramas` întoarce coarda (pragul e deja depășit); altfel se împarte până când cele două margini
 * diferă cu cel mult 1e-9 mm (o eroare fără greutate față de pragul de 0,01 mm).
 */
function lungimeCubica(a: Punct, c1: Punct, c2: Punct, b: Punct, ramas: number, adancime: number): number {
  const d = (p: Punct, q: Punct): number => Math.hypot(q.x - p.x, q.y - p.y);
  const coarda = d(a, b);
  if (coarda >= ramas) return coarda;
  const poligon = d(a, c1) + d(c1, c2) + d(c2, b);
  if (poligon - coarda <= 1e-9 || adancime >= 40) return (poligon + coarda) / 2;
  const mij = (p: Punct, q: Punct): Punct => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const m01 = mij(a, c1), m12 = mij(c1, c2), m23 = mij(c2, b);
  const m012 = mij(m01, m12), m123 = mij(m12, m23);
  const m = mij(m012, m123);
  const prima = lungimeCubica(a, m01, m012, m, ramas, adancime + 1);
  return prima >= ramas ? prima : prima + lungimeCubica(m, m123, m23, b, ramas - prima, adancime + 1);
}

/** Un contur închis mai mic decât rezoluția: diagonala cutiei lui exacte (arcele cu extremele, cubicele cu ale lor). */
function praf(varfuri: readonly Varf[]): boolean {
  const c = cutieContur({ inchis: true, varfuri });
  return Math.hypot(c.maxX - c.minX, c.maxY - c.minY) < REZOLUTIE;
}

/**
 * O buclă dintr-o singură cubică (o picătură desenată dintr-un nod): două jumătăți, împărțite la t = 1/2 (de Casteljau),
 * ca o cale să aibă cel puțin două vârfuri (recenzia 2.7c: era sărită ca „degenerată”).
 */
function bucla(a: Punct, c1: Punct, c2: Punct): Varf[] {
  const mij = (p: Punct, q: Punct): Punct => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const m01 = mij(a, c1);
  const m12 = mij(c1, c2);
  const m23 = mij(c2, a);
  const m012 = mij(m01, m12);
  const m123 = mij(m12, m23);
  const m = mij(m012, m123);
  return [{ p: a, s: { tip: 'C', c1: m01, c2: m012 } }, { p: m, s: { tip: 'C', c1: m123, c2: m23 } }];
}

/** Toate vârfurile pe dreapta dintre primul și cel mai depărtat de el, până la rotunjire (1e-12 din mărime). */
/**
 * Punctele subcăii (vârfurile și mânerele cubicelor) stau pe o dreaptă: exact (la 1e-12 din mărime), sau la cel mult
 * `toleranta` mm de dreapta prin cele mai depărtate două puncte ale ei (ADR 0037 §11, precizarea 2.3c-6).
 */
function peODreapta(v: readonly Varf[], toleranta = 0): boolean {
  const puncte = v.flatMap((x) => (x.s.tip === 'C' ? [x.p, x.s.c1, x.s.c2] : [x.p]));
  const a0 = puncte[0];
  if (!a0) return true;
  // Cele mai depărtate două puncte: cel mai departe de primul, apoi cel mai departe de acela.
  const departe = (de: Punct): Punct => puncte.reduce((m, q) => (Math.hypot(q.x - de.x, q.y - de.y) > Math.hypot(m.x - de.x, m.y - de.y) ? q : m), de);
  const a = toleranta > 0 ? departe(a0) : a0;
  const b = departe(a);
  const dmax = Math.hypot(b.x - a.x, b.y - a.y);
  if (dmax === 0) return true;
  const ux = (b.x - a.x) / dmax;
  const uy = (b.y - a.y) / dmax;
  return puncte.every((x) => Math.abs((x.x - a.x) * uy - (x.y - a.y) * ux) <= Math.max(toleranta, 1e-12 * Math.max(dmax, 1)));
}

/** E similitudine relativ la scara ei (sub scara 1, toleranța absolută ar lua o elipsă minusculă drept cerc; recenzia 2.7c). */
function similitudine(m: Matrice): boolean {
  const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  return s > 0 && esteSimilitudine({ a: m.a / s, b: m.b / s, c: m.c / s, d: m.d / s, e: 0, f: 0 });
}

/** `systemLanguage` (SVG 1.1): una din limbi e limba aplicației, sau începe cu ea urmată de „-”. Fără atribut: adevărat. */
function limbaPotrivita(atribut: string | null, limba: string): boolean {
  if (atribut === null) return true;
  return atribut.split(',').map((x) => x.trim().toLowerCase()).some((x) => x !== '' && (x === limba || x.startsWith(`${limba}-`)));
}

/* ── Parcurgerea ───────────────────────────────────────────────────────────────────────────────────────────────────── */

const FORME = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const SARITE: ReadonlyMap<string, CodAvertisment> = new Map([
  ['text', 'sarit-text'], ['use', 'sarit-use'], ['image', 'sarit-image'], ['foreignObject', 'sarit-foreignObject'], ['svg', 'sarit-svg'],
]);

type Cadru = {
  readonly el: Element;
  readonly m: Matrice;
  /** `display: none` pe el sau pe un strămoș. */
  readonly ascuns: boolean;
  readonly vizibil: boolean;
  readonly umplere: string;
  /** `fill` efectiv altul decât `none`: forma e o regiune (un desen doar din contur nu se normalizează; recenzia 2.7d). */
  readonly umplut: boolean;
};

function copii(el: Element): Element[] {
  const rez: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) rez.push(n as Element);
  return rez;
}

/**
 * Citește un SVG (ADR 0035). Nu aruncă: orice eroare a fișierului e un refuz cu cod sau un avertisment numărat.
 */
export function citesteSvg(octeti: Uint8Array, optiuni: OptiuniSvg = {}): RezultatSvg {
  const pxPeTol = optiuni.pxPeTol ?? 96;
  if (octeti.length > PLAFON_IMPORT.octeti) return { ok: false, cod: 'octeti', detaliu: String(octeti.length) };
  if (octeti[0] === 0x1f && octeti[1] === 0x8b) return { ok: false, cod: 'svgz' };
  const text = new TextDecoder('utf-8').decode(octeti);
  const entitati = problemaEntitati(text);
  if (entitati) return { ok: false, cod: 'entitati', detaliu: entitati };
  let doc: Document;
  try {
    const parser = optiuni.parser ?? new DOMParser();
    doc = parser.parseFromString(text, 'image/svg+xml');
  } catch (e) {
    return { ok: false, cod: 'parsare', detaliu: e instanceof Error ? e.message : String(e) };
  }
  if (doc.getElementsByTagName('parsererror').length > 0) return { ok: false, cod: 'parsare' };
  const radacina = doc.documentElement;
  if (!radacina || radacina.localName !== 'svg') return { ok: false, cod: 'radacina' };
  const nsRadacina = radacina.namespaceURI;
  if (nsRadacina !== SVG_NS && nsRadacina !== null) return { ok: false, cod: 'radacina' };
  const alNostru = (el: Element): boolean => el.namespaceURI === SVG_NS || (nsRadacina === null && el.namespaceURI === null);

  const n = Object.fromEntries(CODURI_AVERTISMENT.map((c) => [c, 0])) as Numaratoare;
  const illustrator = /<!--[^]{0,2000}?Adobe Illustrator/.test(text.slice(0, 16_384));
  if (radacina.getAttribute('transform') !== null) n['transformare-radacina'] = 1;

  // Pagina (ADR 0035 §2).
  const vbText = radacina.getAttribute('viewBox');
  let vb: [number, number, number, number] | null = null;
  if (vbText !== null) {
    const v = vbText.trim().split(/[\s,]+/).map(Number);
    const [vx, vy, vw, vh] = v;
    if (v.length === 4 && v.every(Number.isFinite) && vx !== undefined && vy !== undefined && vw !== undefined && vh !== undefined && vw > 0 && vh > 0) {
      vb = [vx, vy, vw, vh];
    } else {
      n['viewbox-invalid'] = 1;
    }
  }
  const pozitiva = (x: number | null): number | null => (x !== null && x > 0 ? x : null);
  const wAbs = pozitiva(lungimeMm(radacina.getAttribute('width'), pxPeTol));
  const hAbs = pozitiva(lungimeMm(radacina.getAttribute('height'), pxPeTol));
  const unitateRadacina = (nume: string): string | null => citesteLungime(radacina.getAttribute(nume))?.unitate ?? null;
  const inPx = (u: string | null): boolean => u === '' || u === 'px';
  const kPx = 25.4 / pxPeTol;
  let latime: number | null = null;
  let inaltime: number | null = null;
  let px: boolean;
  if (vb) {
    // O singură latură absolută: cealaltă din raportul viewBox-ului, ca dimensionarea intrinsecă din browser (recenzia 2.7c:
    // altfel latura lipsă venea în px și scara „meet” micșora desenul de 3,78 ori).
    latime = wAbs ?? (hAbs !== null ? (hAbs * vb[2]) / vb[3] : vb[2] * kPx);
    inaltime = hAbs ?? (wAbs !== null ? (wAbs * vb[3]) / vb[2] : vb[3] * kPx);
    const date = [wAbs !== null ? unitateRadacina('width') : null, hAbs !== null ? unitateRadacina('height') : null].filter((u) => u !== null);
    px = date.length === 0 || date.some(inPx);
  } else {
    // Fără viewBox, unitatea utilizator e 1 px.
    px = true;
    if (wAbs !== null && hAbs !== null) {
      latime = wAbs;
      inaltime = hAbs;
    } else {
      n['pagina-fara-marime'] = 1;
    }
  }
  const viewport = vb && latime !== null && inaltime !== null
    ? mapareViewBox(vb, latime, inaltime, radacina.getAttribute('preserveAspectRatio'))
    : { a: kPx, b: 0, c: 0, d: kPx, e: 0, f: 0 };
  // Y în sus: y_mm = H − y_viewport (pagina fără mărime: y_mm = −y_viewport).
  const intoarce: Matrice = { a: 1, b: 0, c: 0, d: -1, e: 0, f: inaltime ?? 0 };
  const pagina0 = compune(intoarce, viewport);

  const cai: CaleSvg[] = [];
  const limba = (optiuni.limba ?? 'en').toLowerCase();
  const lucru = { varfuri: 0 };
  let primite = 0;
  let indexForma = 0;
  let departe = false;
  /** Formele citite, în ordine; normalizarea `nonzero` (ADR 0036) rulează după parcurgere și după plafonul intrării. */
  const forme: Array<{ readonly index: number; readonly nume?: string; readonly cai: CaleCitita[]; readonly nonzero: boolean }> = [];
  const stiva: Cadru[] = [];
  const { index: css, ignorate } = citesteCss(doc);
  if (ignorate) n.stil = 1;
  const potriviri = { potriviri: 0 };
  // Pe rădăcină, bugetul nu se poate termina (cel mult `PLAFON_REGULI_CSS` potriviri).
  const stilR = stilElement(radacina, css, potriviri);
  const radacinaAscunsa = stilR.display === 'none';
  const pune = (parinte: Cadru, el: Element): void => {
    const st = stilElement(el, css, potriviri);
    const vizibilitate = st.visibility && st.visibility !== 'inherit' ? st.visibility : null;
    stiva.push({
      el,
      m: parinte.m,
      ascuns: parinte.ascuns || st.display === 'none',
      vizibil: vizibilitate === null ? parinte.vizibil : vizibilitate === 'visible',
      umplere: st.fillRule && st.fillRule !== 'inherit' ? st.fillRule : parinte.umplere,
      umplut: st.fill && st.fill !== 'inherit' ? st.fill !== 'none' : parinte.umplut,
    });
  };
  const radacinaCadru: Cadru = {
    el: radacina,
    m: pagina0,
    ascuns: radacinaAscunsa,
    vizibil: !(stilR.visibility === 'hidden' || stilR.visibility === 'collapse'),
    umplere: stilR.fillRule === 'evenodd' ? 'evenodd' : 'nonzero',
    umplut: stilR.fill !== 'none',
  };

  try {
    for (const c of copii(radacina).reverse()) pune(radacinaCadru, c);
    while (stiva.length > 0) {
      const cadru = stiva.pop();
      if (!cadru) break;
      const { el } = cadru;
      if (!alNostru(el)) continue;
      const tip = el.localName ?? '';
      const containerSauForma = tip === 'g' || tip === 'a' || tip === 'switch' || FORME.has(tip);
      if (!containerSauForma) {
        const cod = SARITE.get(tip);
        // Doar `display: none` ascunde conținutul: sub `visibility: hidden`, un copil vizibil (un `tspan`) reapare, iar
      // conținutul elementelor sărite nu se citește (recenzia 2.7c). Raportul spune mai mult, nu mai puțin.
      if (cod && !cadru.ascuns) n[cod]++;
        continue;
      }
      // Transformarea elementului (pe un subarbore ascuns nu se mai judecă, doar se numără formele).
      let m = cadru.m;
      const tr = el.getAttribute('transform');
      if (tr !== null && !cadru.ascuns) {
        const t = citesteTransform(tr);
        if (!t) {
          n['transformare-invalida']++;
          continue;
        }
        m = compune(cadru.m, t);
      }
      const aici: Cadru = { ...cadru, m };
      if (tip === 'g' || tip === 'a') {
        for (const c of copii(el).reverse()) pune(aici, c);
        continue;
      }
      if (tip === 'switch') {
        // Primul copil SVG fără `requiredExtensions` (Illustrator pune înaintea desenului un `foreignObject` cu ea).
        const ales = copii(el).find((c) => alNostru(c) && !c.hasAttribute('requiredExtensions') && limbaPotrivita(c.getAttribute('systemLanguage'), limba));
        if (ales) pune(aici, ales);
        continue;
      }
      // O formă.
      const index = indexForma++;
      if (cadru.ascuns || !cadru.vizibil) {
        n.ascunse++;
        continue;
      }
      if (!(Math.abs(determinantNormat(m)) > 1e-12)) {
        n.singulara++;
        continue;
      }
      const date = dateForma(el, tip);
      if (date === 'tacut') continue;
      if (date === 'invalid') {
        n['atribut-invalid']++;
        continue;
      }
      if (date.eroare) n['eroare-date']++;
      const sim = similitudine(m);
      const semn = Math.sign(determinantNormat(m));
      const id = el.getAttribute('id');
      const nume = id ? id.slice(0, PLAFON.numeLungime) : undefined;
      const aleFormei: CaleCitita[] = [];
      // `line` e mereu deschisă (ADR 0035 §4) și devine cale deschisă (ADR 0037 §11), oricum ar fi umplută.
      const umplut = tip === 'line' ? 'linie' : cadru.umplut;
      for (const sc of subcai(date.comenzi)) {
        const v = subcaleMm(sc, m, sim, semn, n, lucru, umplut);
        if (v === 'praf') {
          n['sub-rezolutie']++;
          continue;
        }
        if (v === 'goala') continue;
        if (v === 'prea-mare') {
          n['prea-mari']++;
          continue;
        }
        if (v === 'degenerata') {
          n.degenerate++;
          continue;
        }
        aleFormei.push(v);
      }
      if (aleFormei.length > 0) {
        // Doar o regiune umplută (`fill` ≠ `none`) cu regula `nonzero` se normalizează (ADR 0036 §9), și doar căile ei
        // închise: o cale deschisă nu e o regiune (ADR 0037 §11).
        forme.push({ index, ...(nume !== undefined ? { nume } : {}), cai: aleFormei, nonzero: cadru.umplere !== 'evenodd' && cadru.umplut });
      }
    }
  } catch (e) {
    if (e instanceof PestePlafon) return { ok: false, cod: 'plafon', detaliu: String(PLAFON_IMPORT.varfuriLucru), avertismente: n };
    if (e instanceof PesteCss) return { ok: false, cod: 'plafon', detaliu: 'css', avertismente: n };
    throw e;
  }
  // Plafonul total, întâi pe intrare (căile deschise, cu vârful final): un fișier refuzat oricum nu mai plătește
  // normalizarea (recenzia 2.7d).
  const intrare = forme.reduce((s, f) => s + f.cai.reduce((t, c) => t + c.varfuri.length, 0), 0);
  if (intrare > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(intrare), avertismente: n };
  // ADR 0036: o formă `nonzero` trece o dată, cu toate subcăile ei ÎNCHISE, prin aranjamentul exact, cu bugetul ÎNTREGULUI
  // fișier. Neschimbată, rămâne același obiect, cu căile în ordinea subcăilor (documentul ca în 2.7c); la refuz (și cu
  // bugetul terminat), ca în 2.7c, numărată. Schimbată, ieșirea normalizării vine întâi, apoi căile deschise, în ordine.
  const buget = { ramas: PLAFON_IMPORT.normalizare };
  for (const f of forme) {
    let finale: readonly CaleCitita[] = f.cai;
    const inchise = f.cai.filter((c) => c.inchis).map((c) => c.varfuri);
    if (f.nonzero && inchise.length > 0) {
      const r = normalizeaza(inchise, { buget });
      if (!r.ok || r.cai.some((v) => v.length > PLAFON.varfuriCale)) {
        // O reuniune peste plafonul căii nu scoate forma: o citește ca în 2.7c (recenzia 2.7d).
        n['nonzero-refuzate']++;
      } else if (!r.info.neschimbat) {
        // Și o formă care iese goală (regiunea vidă, sau toată mai subțire decât τ: ADR 0036 §6, oracolul 2.7d, K7).
        n['nonzero-normalizate']++;
        // Praful și pe ieșire (ADR 0037 §11): o buclă de închidere sub rezoluție (logoul VfB: 2 de ~6e-5 mm) ar face
        // CAM-ul să refuze tot exportul.
        const iesire = r.cai.filter((v) => {
          if (!praf(v)) return true;
          n['sub-rezolutie']++;
          return false;
        });
        // Golită de tot (regiunea vidă): sărită, numărată și la `degenerate` (ADR 0037 §11, precizarea 2.3c-6).
        if (r.cai.length === 0) n.degenerate++;
        finale = [...iesire.map((varfuri) => ({ varfuri, inchis: true })), ...f.cai.filter((c) => !c.inchis)];
      }
    }
    for (const c of finale) {
      if (!c.varfuri.every((x) => inMargini(x))) departe = true;
      primite += c.varfuri.length;
      // `deschise` numără căile deschise importate (ADR 0037 §11), nu pe cele sărite.
      if (!c.inchis) n.deschise++;
      cai.push({ varfuri: c.varfuri, inchis: c.inchis, forma: f.index, ...(f.nume !== undefined ? { nume: f.nume } : {}) });
    }
  }
  if (primite > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(primite), avertismente: n };
  // Piesa păstrează pagina minus colțul cutiei exacte (`piesaDinImport`): și acolo, fiecare punct, cu mânerele, rămâne în
  // plafonul translației (recenzia A: o linie de la −9e6 la 9e6 trecea de ușă și cădea la ușa documentului fără motiv).
  if (!departe && cai.length > 0) {
    let minX = Infinity, minY = Infinity;
    for (const c of cai) {
      const k = cutieContur({ inchis: c.inchis, varfuri: c.varfuri });
      minX = Math.min(minX, k.minX);
      minY = Math.min(minY, k.minY);
    }
    departe = cai.some((c) => c.varfuri.some((v) => [v.p, ...(v.s.tip === 'C' ? [v.s.c1, v.s.c2] : [])]
      .some((q) => !(Math.abs(q.x - minX) <= PLAFON.translatie && Math.abs(q.y - minY) <= PLAFON.translatie))));
  }
  if (departe) return { ok: false, cod: 'departe', avertismente: n };
  // `gol` = nicio cale, închisă sau deschisă (ADR 0037 §11): un fișier făcut doar din linii se importă.
  if (cai.length === 0) return { ok: false, cod: 'gol', avertismente: n };
  return {
    ok: true,
    cai,
    pagina: latime !== null && inaltime !== null ? { latime, inaltime } : null,
    px,
    illustrator,
    avertismente: n,
  };
}

const finitInMargini = (x: number): boolean => Number.isFinite(x) && Math.abs(x) <= PLAFON.translatie;
function inMargini(v: Varf): boolean {
  const pct = [v.p, ...(v.s.tip === 'C' ? [v.s.c1, v.s.c2] : [])];
  return pct.every((q) => finitInMargini(q.x) && finitInMargini(q.y)) && (v.s.tip !== 'A' || Number.isFinite(v.s.bulge));
}
