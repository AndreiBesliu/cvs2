/**
 * Stilurile ușii SVG (felia 2.7d, ADR 0035 §4 „Stilurile” și „Umplerea”, ADR 0036 §9), scrise de oracol din text, cu ZERO
 * importuri din `src/`:
 * - se citesc doar `display`, `visibility`, `fill-rule` și `fill`, din trei surse, în ordinea în care câștigă: atributul de
 *   prezentare, regulile din `<style>` (după specificitate, la egalitate ultima), declarațiile din `style` (ultima câștigă;
 *   `!important` se ignoră);
 * - din `<style>` (toate elementele `style` din spațiul de nume SVG, în ordinea documentului; comentariile se sar) se
 *   aplică doar regulile cu selectori simpli: `element`, `.clasă`, `#id`, `*` și lipiți (`path.a.b`), separați prin virgulă;
 *   specificitatea: id, apoi clase, apoi element;
 * - o regulă cu una din cele patru proprietăți al cărei selector nu e simplu (combinator, atribut, pseudo-clasă, două
 *   id-uri), o regulă `@` (oricare: textul ADR-ului nu o califică) sau un `!important` într-o regulă cu una din cele patru
 *   proprietăți dau `stil` (o dată); regula nesimplă și cea `@` nu se aplică, `!important` se aplică, ca o declarație
 *   obișnuită; o regulă obișnuită fără niciuna din cele patru proprietăți nu avertizează niciodată;
 * - peste 10 000 de reguli, `<style>` nu se citește deloc (`stil`);
 * - bugetul potrivirilor: regulile stau pe găleți (prima clasă, altfel id-ul, altfel elementul, altfel `*`); un element
 *   verifică găleata `*`, a elementului lui, a id-ului și ale claselor; fiecare regulă verificată costă 1; peste 2·10⁷ pe
 *   fișier, refuz `plafon` / `css`;
 * - `fill` efectiv `none` (moștenit; `inherit` ia părintele; implicit plin): forma nu se normalizează.
 *
 * Alegerile mele unde textul tace (în raport; corpusul le ocolește): o listă de selectori cu unul nesimplu nu se aplică
 * deloc; „regula” numărată la 10 000 e un bloc de la nivelul de sus (și cele `@`); găleata e pe selector (o listă cu doi
 * selectori stă în două găleți); o regulă `@` avertizează oricum (și `@font-face`, `@import`), iar `!important` pe orice
 * proprietate a unei reguli care atinge una din cele patru (rezumatul coordonatorului: „o regulă care nu atinge niciuna din
 * cele patru proprietăți nu avertizează”, ADR-ul: „o regulă `@` … sau un `!important`”); costul se numără pe
 * elementele SVG parcurse (rădăcina, containerele, formele, elementele sărite), nu în `defs`; o valoare nevalidă (alt
 * cuvânt la `fill-rule` / `visibility`) se sare, iar câștigă sursa următoare.
 */

export const PROPRIETATI_STIL = ['display', 'visibility', 'fill-rule', 'fill'] as const;
export type ProprietateStil = (typeof PROPRIETATI_STIL)[number];
const ESTE_PROP = new Set<string>(PROPRIETATI_STIL);

export const CONST_STIL = {
  /** Peste atâtea reguli, `<style>` nu se citește. */
  reguli: 10_000,
  /** Bugetul potrivirilor pe fișier. */
  potriviri: 2e7,
} as const;

export type SelectorO = { readonly tag: string | null; readonly id: string | null; readonly clase: readonly string[]; readonly spec: number };
export type RegulaO = { readonly decl: ReadonlyMap<ProprietateStil, string>; readonly ordine: number };
type Intrare = { r: RegulaO; s: SelectorO };
export type FoaieO = { galeti: Map<string, Intrare[]>; stil: boolean; reguli: number; ignorata: boolean };

const RE_IDENT = /^-?[_a-zA-Z -￿][_a-zA-Z0-9 -￿-]*/;

/** Un selector simplu (`tag`, `*`, urmat de `.clasă` / `#id`, cel mult un id), sau null. */
export function selectorSimplu(text: string): SelectorO | null {
  const t = text.trim();
  if (t === '') return null;
  let i = 0;
  let tag: string | null = null, id: string | null = null;
  const clase: string[] = [];
  if (t[0] === '*') i = 1;
  else {
    const m = RE_IDENT.exec(t);
    if (m !== null) { tag = m[0]; i = m[0].length; }
  }
  while (i < t.length) {
    const c = t[i];
    if (c !== '.' && c !== '#') return null;
    const m = RE_IDENT.exec(t.slice(i + 1));
    if (m === null) return null;
    if (c === '.') clase.push(m[0]);
    else { if (id !== null) return null; id = m[0]; }
    i += 1 + m[0].length;
  }
  if (tag === null && id === null && clase.length === 0 && t !== '*') return null;
  return { tag, id, clase, spec: (id === null ? 0 : 1) * 1e6 + clase.length * 1e3 + (tag === null ? 0 : 1) };
}

/** Declarațiile unui bloc: doar cele patru proprietăți (ultima câștigă), cu `!important` tăiat. */
export function declaratii(corp: string): { decl: Map<ProprietateStil, string>; important: boolean } {
  const decl = new Map<ProprietateStil, string>();
  let important = false;
  for (const d of corp.split(';')) {
    const k = d.indexOf(':');
    if (k < 0) continue;
    const nume = d.slice(0, k).trim().toLowerCase();
    let v = d.slice(k + 1).trim();
    const imp = /!\s*important\s*$/i.exec(v);
    if (imp !== null) { important = true; v = v.slice(0, imp.index).trim(); }
    if (!ESTE_PROP.has(nume)) continue;
    decl.set(nume as ProprietateStil, v.toLowerCase());
  }
  return { decl, important };
}

/** Indexul blocului `}` care închide `{` de la `a` (echilibrat), sau −1. */
function inchide(text: string, a: number): number {
  let n = 0;
  for (let i = a; i < text.length; i++) {
    if (text[i] === '{') n++;
    else if (text[i] === '}') { n--; if (n === 0) return i; }
  }
  return -1;
}

/** Foaia de stil a documentului, din textele elementelor `style` în ordinea documentului. */
export function foaieDin(texte: readonly string[]): FoaieO {
  const f: FoaieO = { galeti: new Map(), stil: false, reguli: 0, ignorata: false };
  const toate: Array<{ sel: SelectorO[]; decl: Map<ProprietateStil, string> }> = [];
  for (const brut of texte) {
    const text = brut.replace(/\/\*[\s\S]*?\*\//g, ' ');
    let i = 0;
    while (i < text.length) {
      while (i < text.length && /\s/.test(text[i] as string)) i++;
      if (i >= text.length) break;
      if (text[i] === '@') {
        const pv = text.indexOf(';', i), ac = text.indexOf('{', i);
        f.stil = true;
        if (ac < 0 || (pv >= 0 && pv < ac)) { f.reguli++; i = pv < 0 ? text.length : pv + 1; continue; }
        const z = inchide(text, ac);
        f.reguli++;
        i = z < 0 ? text.length : z + 1;
        continue;
      }
      const a = text.indexOf('{', i);
      if (a < 0) break;
      const z = inchide(text, a);
      const sel = text.slice(i, a), corp = text.slice(a + 1, z < 0 ? text.length : z);
      i = z < 0 ? text.length : z + 1;
      f.reguli++;
      const { decl, important } = declaratii(corp);
      if (decl.size === 0) continue;
      if (important) f.stil = true;
      const sels = sel.split(',').map(selectorSimplu);
      if (sels.some((s) => s === null)) { f.stil = true; continue; }
      toate.push({ sel: sels as SelectorO[], decl });
    }
  }
  if (f.reguli > CONST_STIL.reguli) { f.stil = true; f.ignorata = true; return f; }
  toate.forEach((x, ordine) => {
    const r: RegulaO = { decl: x.decl, ordine };
    for (const s of x.sel) {
      const cheie = s.clase.length > 0 ? `.${s.clase[0] as string}` : s.id !== null ? `#${s.id}` : s.tag !== null ? s.tag : '*';
      const l = f.galeti.get(cheie) ?? [];
      l.push({ r, s });
      f.galeti.set(cheie, l);
    }
  });
  return f;
}

/** Valorile din `<style>` pentru un element și costul verificărilor (găleata `*`, a elementului, a id-ului, a claselor). */
export function potriviri(f: FoaieO, tag: string, id: string | null, clase: readonly string[]): { val: Map<ProprietateStil, string>; cost: number } {
  const val = new Map<ProprietateStil, string>();
  const best = new Map<ProprietateStil, { spec: number; ordine: number }>();
  let cost = 0;
  const cl = new Set(clase);
  const chei = ['*', tag, ...(id !== null ? [`#${id}`] : []), ...[...cl].map((c) => `.${c}`)];
  for (const k of new Set(chei)) {
    const l = f.galeti.get(k);
    if (l === undefined) continue;
    cost += l.length;
    for (const { r, s } of l) {
      if (s.tag !== null && s.tag !== tag) continue;
      if (s.id !== null && s.id !== id) continue;
      if (!s.clase.every((c) => cl.has(c))) continue;
      for (const [p, v] of r.decl) {
        const b = best.get(p);
        if (b === undefined || s.spec > b.spec || (s.spec === b.spec && r.ordine > b.ordine)) { best.set(p, { spec: s.spec, ordine: r.ordine }); val.set(p, v); }
      }
    }
  }
  return { val, cost };
}

/** Declarațiile atributului `style` (ultima câștigă; `!important` se taie, fără avertisment). */
export function stilAtribut(s: string | null): Map<ProprietateStil, string> {
  return s === null ? new Map() : declaratii(s).decl;
}

export type StilCalculat = { readonly ascuns: boolean; readonly visibility: 'visible' | 'hidden' | 'collapse'; readonly regula: 'nonzero' | 'evenodd'; readonly umplut: boolean };
export const STIL_RADACINA_PARINTE: StilCalculat = { ascuns: false, visibility: 'visible', regula: 'nonzero', umplut: true };

/**
 * Stilul calculat al unui element: pentru fiecare proprietate, prima valoare validă din `style`, `<style>`, atribut;
 * `inherit` ia părintele; fără valoare, cele moștenite (visibility, fill-rule, fill) iau părintele.
 */
export function stilCalculat(el: Element, parinte: StilCalculat, f: FoaieO | null, cost: { n: number }): StilCalculat {
  const st = stilAtribut(el.getAttribute('style'));
  const clase = (el.getAttribute('class') ?? '').split(/[ \t\r\n]+/).filter((x) => x !== '');
  const css = f === null || f.ignorata ? new Map<ProprietateStil, string>() : (() => {
    const p = potriviri(f, el.localName, el.getAttribute('id'), clase);
    cost.n += p.cost;
    return p.val;
  })();
  const surse = (p: ProprietateStil, valid: (v: string) => boolean): string | undefined => {
    for (const v of [st.get(p), css.get(p), el.getAttribute(p)?.trim().toLowerCase()]) if (v !== undefined && v !== '' && valid(v)) return v;
    return undefined;
  };
  const d = surse('display', () => true);
  const ascuns = d === 'none' || (d === 'inherit' && parinte.ascuns);
  const v = surse('visibility', (x) => ['visible', 'hidden', 'collapse', 'inherit'].includes(x));
  const visibility = v === undefined || v === 'inherit' ? parinte.visibility : (v as StilCalculat['visibility']);
  const r = surse('fill-rule', (x) => ['nonzero', 'evenodd', 'inherit'].includes(x));
  const regula = r === undefined || r === 'inherit' ? parinte.regula : (r as StilCalculat['regula']);
  const u = surse('fill', () => true);
  const umplut = u === undefined || u === 'inherit' ? parinte.umplut : u !== 'none';
  return { ascuns, visibility, regula, umplut };
}
