/**
 * Cititorul de markdown (ADR 0048 §4), partea pură: textul devine un arbore de blocuri și de noduri inline, fără HTML și
 * fără React. Îl randează `Markdown.tsx` (fila Documentație din `/admin` și, în felia următoare, documentația live), iar
 * generatorul documentației (`scripts/documentatie.ts`) citește tabelele fișelor cu aceleași funcții (`citesteTabel`,
 * `celule`): ce vede poarta e exact ce vede omul.
 *
 * Subsetul e cel al documentelor proiectului (ca în ediția întâi, `DocsView.renderMarkdown`, unde lista a crescut pe
 * documentele reale): titlurile `#`–`######`, paragrafele (rândul nou cu două spații, `\` sau `<br>`), listele
 * neordonate / ordonate, imbricate pe indentare, cu bife (`- [ ]`, `- [x]`), citatele, tabelele GFM (cu alinierea),
 * blocurile de cod cu liniile EXACTE (citite linie cu linie, nu pe blocuri despărțite de rânduri goale: un bloc de cod cu
 * un rând gol rămâne întreg), regula `---`, codul inline, accentul (`**`, `*`, `_`), linkurile și `<https://…>`.
 *
 * Siguranța: HTML-ul brut rămâne text (arborele n-are noduri HTML; doar `<br>` are sens, ca rând nou). Un link e extern
 * doar pe `http(s)`, intern doar relativ (sau `#ancoră`); orice altă schemă (`javascript:`, `data:`, `//gazdă`) pierde
 * linkul și păstrează eticheta ca text.
 */

export type Inline =
  | { readonly tip: 'text'; readonly text: string }
  | { readonly tip: 'cod'; readonly text: string }
  | { readonly tip: 'tare'; readonly continut: readonly Inline[] }
  | { readonly tip: 'cursiv'; readonly continut: readonly Inline[] }
  | { readonly tip: 'legatura'; readonly href: string; readonly fel: 'externa' | 'interna'; readonly continut: readonly Inline[] }
  | { readonly tip: 'rand-nou' };

export type Aliniere = 'stanga' | 'dreapta' | 'centru' | null;

export interface ElementLista {
  /** `null` = element obișnuit; `true` / `false` = bifă (`- [x]` / `- [ ]`). */
  readonly bifa: boolean | null;
  readonly blocuri: readonly Bloc[];
}

export type Bloc =
  | { readonly tip: 'titlu'; readonly nivel: number; readonly continut: readonly Inline[]; readonly ancora: string }
  /** `brut`: textul sursei (rândurile unite cu `\n`, fără indentare), pentru cine vrea markdown-ul, nu arborele. */
  | { readonly tip: 'paragraf'; readonly continut: readonly Inline[]; readonly brut: string }
  | { readonly tip: 'lista'; readonly ordonata: boolean; readonly start: number; readonly elemente: readonly ElementLista[] }
  | { readonly tip: 'citat'; readonly blocuri: readonly Bloc[] }
  | { readonly tip: 'tabel'; readonly antet: readonly (readonly Inline[])[]; readonly aliniere: readonly Aliniere[]; readonly randuri: readonly (readonly (readonly Inline[])[])[] }
  | { readonly tip: 'cod'; readonly limbaj: string; readonly linii: readonly string[] }
  | { readonly tip: 'regula' };

/** Un tabel, cu celulele ca text (markdown inline), cum îl citește și poarta documentației. */
export interface TabelBrut {
  readonly antet: readonly string[];
  readonly aliniere: readonly Aliniere[];
  readonly randuri: readonly (readonly string[])[];
  /** Indicele primei linii de după tabel. */
  readonly sfarsit: number;
}

// ——— Linkurile ———

/** Pură: ce fel de link e `href`. Extern doar `http(s)://`; intern doar o cale relativă sau `#ancoră`; restul, interzis. */
export function felLegatura(href: string): 'externa' | 'interna' | 'interzisa' {
  const h = href.trim();
  if (h === '' || /[\u0000- \u007f\\]/.test(h)) return 'interzisa';
  if (/^https?:\/\/[^/]/i.test(h)) return 'externa';
  if (h.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith('/')) return 'interzisa';
  return 'interna';
}

/**
 * Pură: calea din repo spre care duce un link relativ `href`, scris în documentul `din` (`docs/adr/README.md` +
 * `0001-a.md` → `docs/adr/0001-a.md`), cu `#ancora` păstrată. `null` dacă iese din rădăcină sau e absolut.
 */
export function rezolvaRelativ(din: string, href: string): string | null {
  if (href.startsWith('/')) return null;
  const diez = href.indexOf('#');
  let cale = diez < 0 ? href : href.slice(0, diez);
  const fragment = diez < 0 ? null : href.slice(diez + 1);
  try {
    cale = decodeURIComponent(cale);
  } catch {
    return null;
  }
  const coada = fragment === null ? '' : `#${fragment}`;
  if (cale === '') return `${din}${coada}`;
  const parti = din.split('/').slice(0, -1);
  for (const p of cale.split('/')) {
    if (p === '' || p === '.') continue;
    if (p === '..') {
      if (parti.length === 0) return null;
      parti.pop();
    } else parti.push(p);
  }
  return `${parti.join('/')}${coada}`;
}

// ——— Inline ———

const PUNCTUATIE = /[!-/:-@[-`{-~]/;
const LITERA = /[\p{L}\p{N}]/u;
const ALB = /\s/;

/** Lungimea șirului de caractere `c` care începe la `i`. */
function sir(s: string, i: number, c: string): number {
  let n = 0;
  while (s[i + n] === c) n++;
  return n;
}

/** Sfârșitul codului inline care începe la `i` (după backtick-urile de închidere), sau -1 dacă nu se închide. */
function sfarsitCod(s: string, i: number): number {
  const n = sir(s, i, '`');
  for (let j = i + n; j < s.length;) {
    if (s[j] === '`') {
      const m = sir(s, j, '`');
      if (m === n) return j + m;
      j += m;
    } else j++;
  }
  return -1;
}

/** Indicele `]`-ului care închide `[`-ul de la `i` (cu imbricare, peste cod și escape-uri), sau -1. */
function inchidereParanteza(s: string, i: number): number {
  let adancime = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') j++;
    else if (c === '`') {
      const f = sfarsitCod(s, j);
      if (f > 0) j = f - 1;
      else j += sir(s, j, '`') - 1;
    } else if (c === '[') adancime++;
    else if (c === ']' && --adancime === 0) return j;
  }
  return -1;
}

/** `[eticheta](destinatie "titlu")` de la `i`: nodurile și sfârșitul, sau null dacă nu e link. */
function legatura(s: string, i: number): { readonly noduri: readonly Inline[]; readonly sfarsit: number } | null {
  const inchis = inchidereParanteza(s, i);
  if (inchis < 0 || s[inchis + 1] !== '(') return null;
  let j = inchis + 2;
  while (s[j] === ' ') j++;
  let href = '';
  if (s[j] === '<') {
    const f = s.indexOf('>', j);
    if (f < 0) return null;
    href = s.slice(j + 1, f);
    j = f + 1;
  } else {
    let paranteze = 0;
    const start = j;
    for (; j < s.length; j++) {
      const c = s[j] ?? '';
      if (ALB.test(c)) break;
      if (c === '(') paranteze++;
      else if (c === ')') {
        if (paranteze === 0) break;
        paranteze--;
      }
    }
    href = s.slice(start, j);
  }
  while (s[j] === ' ') j++;
  const ghilimea = s[j];
  if (ghilimea === '"' || ghilimea === "'") {
    const f = s.indexOf(ghilimea, j + 1);
    if (f < 0) return null;
    j = f + 1;
    while (s[j] === ' ') j++;
  }
  if (s[j] !== ')') return null;
  const continut = parseazaInline(s.slice(i + 1, inchis));
  const fel = felLegatura(href);
  return { noduri: fel === 'interzisa' ? continut : [{ tip: 'legatura', href: href.trim(), fel, continut }], sfarsit: j + 1 };
}

/** Accentul de la `i` (`**`, `*`, `_`): nodul și sfârșitul, sau null (delimitatorul rămâne text). */
function accent(s: string, i: number): { readonly nod: Inline; readonly sfarsit: number } | null {
  const c = s[i] ?? '';
  const n = sir(s, i, c);
  const lungime = n >= 2 ? 2 : 1;
  const inainte = s[i - 1] ?? ' ';
  const dupa = s[i + lungime] ?? ' ';
  if (ALB.test(dupa)) return null;
  if (c === '_' && LITERA.test(inainte)) return null;
  for (let j = i + lungime; j < s.length; j++) {
    const x = s[j];
    if (x === '\\') {
      j++;
      continue;
    }
    if (x === '`') {
      const f = sfarsitCod(s, j);
      if (f > 0) j = f - 1;
      continue;
    }
    if (x !== c) continue;
    const m = sir(s, j, c);
    const potrivit = lungime === 2 ? m >= 2 : m === 1;
    const urmator = s[j + lungime] ?? ' ';
    if (potrivit && j > i + lungime && !ALB.test(s[j - 1] ?? ' ') && !(c === '_' && LITERA.test(urmator))) {
      const continut = parseazaInline(s.slice(i + lungime, j));
      return { nod: { tip: lungime === 2 ? 'tare' : 'cursiv', continut }, sfarsit: j + lungime };
    }
    j += m - 1;
  }
  return null;
}

/** Pură: un text markdown inline (un paragraf, o celulă de tabel, un titlu) ca noduri. */
export function parseazaInline(s: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const pune = (nod: Inline): void => {
    if (text !== '') out.push({ tip: 'text', text });
    text = '';
    out.push(nod);
  };
  for (let i = 0; i < s.length;) {
    const c = s[i] ?? '';
    if (c === '\\') {
      const n = s[i + 1];
      if (n === '\n') {
        pune({ tip: 'rand-nou' });
        i += 2;
        while (s[i] === ' ') i++;
      } else if (n !== undefined && PUNCTUATIE.test(n)) {
        text += n;
        i += 2;
      } else {
        text += c;
        i++;
      }
      continue;
    }
    if (c === '\n') {
      if (/ {2,}$/.test(text)) {
        text = text.replace(/ +$/, '');
        pune({ tip: 'rand-nou' });
      } else text = `${text.replace(/ +$/, '')} `;
      i++;
      while (s[i] === ' ') i++;
      continue;
    }
    if (c === '`') {
      const f = sfarsitCod(s, i);
      const n = sir(s, i, '`');
      if (f < 0) {
        text += '`'.repeat(n);
        i += n;
        continue;
      }
      let cod = s.slice(i + n, f - n).replace(/\n/g, ' ');
      if (cod.length >= 2 && cod.startsWith(' ') && cod.endsWith(' ') && cod.trim() !== '') cod = cod.slice(1, -1);
      pune({ tip: 'cod', text: cod });
      i = f;
      continue;
    }
    if (c === '<') {
      const rest = s.slice(i);
      const br = /^<br\s*\/?>/i.exec(rest);
      if (br) {
        pune({ tip: 'rand-nou' });
        i += br[0].length;
        continue;
      }
      const auto = /^<(https?:\/\/[^\s<>]+)>/i.exec(rest);
      if (auto && felLegatura(auto[1] ?? '') === 'externa') {
        const href = auto[1] ?? '';
        pune({ tip: 'legatura', href, fel: 'externa', continut: [{ tip: 'text', text: href }] });
        i += auto[0].length;
        continue;
      }
    }
    if (c === '[') {
      const l = legatura(s, i);
      if (l) {
        for (const nod of l.noduri) {
          if (nod.tip === 'text') text += nod.text;
          else pune(nod);
        }
        i = l.sfarsit;
        continue;
      }
    }
    if (c === '*' || c === '_') {
      const a = accent(s, i);
      if (a) {
        pune(a.nod);
        i = a.sfarsit;
        continue;
      }
      const n = sir(s, i, c);
      text += c.repeat(n);
      i += n;
      continue;
    }
    text += c;
    i++;
  }
  if (text !== '') out.push({ tip: 'text', text });
  return out;
}

/** Pură: textul simplu al nodurilor (fără accent, cod sau linkuri; rândul nou = spațiu). */
export function textSimplu(noduri: readonly Inline[]): string {
  return noduri.map((n) => {
    switch (n.tip) {
      case 'text':
      case 'cod': return n.text;
      case 'rand-nou': return ' ';
      default: return textSimplu(n.continut);
    }
  }).join('');
}

/** Pură: ancora unui titlu (markdown inline): litere mici, diacriticele păstrate, punctuația scoasă, spațiile → `-`. */
export function ancora(md: string): string {
  return textSimplu(parseazaInline(md)).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
}

// ——— Blocuri ———

const RE_GARD = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const RE_TITLU = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RE_REGULA = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const RE_CITAT = /^ {0,3}> ?/;
const RE_MARCAJ = /^( {0,3})([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/;
const RE_BIFA = /^\[([ xX])\][ \t]+/;

const gol = (l: string): boolean => l.trim() === '';
const indentare = (l: string): number => l.length - l.trimStart().length;

function esteGard(l: string): boolean {
  const m = RE_GARD.exec(l);
  return m !== null && !((m[2] ?? '').startsWith('`') && (m[3] ?? '').includes('`'));
}

/** Pură: celulele unui rând de tabel (`| a | b |`), ca text, cu `\|` ca bară în celulă. */
export function celule(linie: string): string[] {
  let s = linie.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out: string[] = [];
  let curenta = '';
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '\\' && s[k + 1] === '|') {
      curenta += '|';
      k++;
    } else if (c === '|') {
      out.push(curenta.trim());
      curenta = '';
    } else curenta += c;
  }
  out.push(curenta.trim());
  return out;
}

/** Un rând care începe alt bloc (și oprește un tabel sau un paragraf). */
function incepeBloc(l: string): boolean {
  return esteGard(l) || RE_TITLU.test(l) || RE_REGULA.test(l) || RE_CITAT.test(l) || RE_MARCAJ.test(l);
}

/**
 * Pură: tabelul GFM care începe la linia `i` (antetul cu `|` la început, separatorul cu același număr de coloane), sau
 * null. Ca în GFM, rândurile merg până la un rând gol sau până la începutul altui bloc; un rând de text lipit de tabel e
 * un rând al lui (cu o celulă). Celulele rămân text.
 */
export function citesteTabel(linii: readonly string[], i: number): TabelBrut | null {
  const cap = linii[i];
  const sep = linii[i + 1];
  if (cap === undefined || sep === undefined || !/^ {0,3}\|/.test(cap)) return null;
  const antet = celule(cap);
  const linie = celule(sep);
  if (linie.length !== antet.length || !linie.every((c) => /^:?-+:?$/.test(c))) return null;
  const aliniere = linie.map((c): Aliniere => {
    if (c.startsWith(':') && c.endsWith(':')) return 'centru';
    if (c.endsWith(':')) return 'dreapta';
    return c.startsWith(':') ? 'stanga' : null;
  });
  const randuri: string[][] = [];
  let j = i + 2;
  for (; j < linii.length; j++) {
    const l = linii[j] ?? '';
    if (gol(l) || incepeBloc(l)) break;
    randuri.push(celule(l));
  }
  return { antet, aliniere, randuri, sfarsit: j };
}

function intrerupeParagraf(linii: readonly string[], i: number): boolean {
  const l = linii[i] ?? '';
  if (esteGard(l) || RE_TITLU.test(l) || RE_REGULA.test(l) || RE_CITAT.test(l) || citesteTabel(linii, i) !== null) return true;
  const m = RE_MARCAJ.exec(l);
  // Ca în GFM: o listă ordonată întrerupe un paragraf doar de la 1, iar un element gol nu-l întrerupe.
  return m !== null && m[4] !== undefined && m[4].trim() !== '' && (!/\d/.test(m[2] ?? '') || Number.parseInt(m[2] ?? '', 10) === 1);
}

interface Context {
  readonly ancore: Map<string, number>;
}

function ancoraUnica(ctx: Context, a: string): string {
  const n = ctx.ancore.get(a) ?? 0;
  ctx.ancore.set(a, n + 1);
  return n === 0 ? a : `${a}-${n}`;
}

function lista(linii: readonly string[], inceput: number, ctx: Context): { readonly bloc: Bloc; readonly sfarsit: number } {
  const m0 = RE_MARCAJ.exec(linii[inceput] ?? '');
  const marcaj0 = m0?.[2] ?? '-';
  const ordonata = /\d/.test(marcaj0);
  const delimitator = ordonata ? marcaj0.slice(-1) : marcaj0;
  const start = ordonata ? Number.parseInt(marcaj0, 10) : 1;
  const elemente: ElementLista[] = [];
  let i = inceput;
  while (i < linii.length) {
    const m = RE_MARCAJ.exec(linii[i] ?? '');
    if (!m) break;
    const marcaj = m[2] ?? '';
    if (/\d/.test(marcaj) !== ordonata || (ordonata ? marcaj.slice(-1) : marcaj) !== delimitator) break;
    const spatii = (m[3] ?? '').length;
    const rest = m[4];
    const indentContinut = (m[1] ?? '').length + marcaj.length + (rest === undefined || spatii > 4 ? 1 : spatii);
    const continut: string[] = [rest === undefined ? '' : (spatii > 4 ? ' '.repeat(spatii - 1) : '') + rest];
    i++;
    while (i < linii.length) {
      const x = linii[i] ?? '';
      if (gol(x)) {
        continut.push('');
        i++;
      } else if (indentare(x) >= indentContinut) {
        continut.push(x.slice(indentContinut));
        i++;
      } else if (continut.at(-1) !== '' && !incepeBloc(x) && citesteTabel(linii, i) === null) {
        // Continuarea leneșă a paragrafului din element.
        continut.push(x.trimStart());
        i++;
      } else break;
    }
    while (continut.length > 1 && continut.at(-1) === '') continut.pop();
    const bifa = RE_BIFA.exec(continut[0] ?? '');
    if (bifa) continut[0] = (continut[0] ?? '').slice(bifa[0].length);
    elemente.push({ bifa: bifa ? (bifa[1] ?? ' ') !== ' ' : null, blocuri: blocuri(continut, ctx) });
    // Rândurile goale dintre elemente nu opresc lista; altceva decât un element nou, da.
    let j = i;
    while (j < linii.length && gol(linii[j] ?? '')) j++;
    if (j > i && !RE_MARCAJ.test(linii[j] ?? '')) break;
    i = j;
  }
  return { bloc: { tip: 'lista', ordonata, start, elemente }, sfarsit: i };
}

function blocuri(linii: readonly string[], ctx: Context): Bloc[] {
  const out: Bloc[] = [];
  let i = 0;
  while (i < linii.length) {
    const l = linii[i] ?? '';
    if (gol(l)) {
      i++;
      continue;
    }
    const gard = RE_GARD.exec(l);
    if (gard && esteGard(l)) {
      const indent = (gard[1] ?? '').length;
      const semn = gard[2] ?? '```';
      const inchidere = new RegExp(`^ {0,3}${semn[0] === '`' ? '`' : '~'}{${semn.length},}[ \\t]*$`);
      const cod: string[] = [];
      i++;
      while (i < linii.length) {
        const x = linii[i] ?? '';
        i++;
        if (inchidere.test(x)) break;
        // Indentarea gardului se scoate din fiecare rând (cât are), restul rămâne exact.
        cod.push(x.slice(Math.min(indent, indentare(x))));
      }
      out.push({ tip: 'cod', limbaj: (gard[3] ?? '').trim().split(/\s+/)[0] ?? '', linii: cod });
      continue;
    }
    const titlu = RE_TITLU.exec(l);
    if (titlu) {
      const md = (titlu[2] ?? '').trim();
      out.push({ tip: 'titlu', nivel: (titlu[1] ?? '#').length, continut: parseazaInline(md), ancora: ancoraUnica(ctx, ancora(md)) });
      i++;
      continue;
    }
    if (RE_REGULA.test(l)) {
      out.push({ tip: 'regula' });
      i++;
      continue;
    }
    const tabel = citesteTabel(linii, i);
    if (tabel) {
      const n = tabel.antet.length;
      out.push({
        tip: 'tabel',
        antet: tabel.antet.map(parseazaInline),
        aliniere: tabel.aliniere,
        randuri: tabel.randuri.map((r) => Array.from({ length: n }, (_, k) => parseazaInline(r[k] ?? ''))),
      });
      i = tabel.sfarsit;
      continue;
    }
    if (RE_CITAT.test(l)) {
      const interior: string[] = [];
      while (i < linii.length && RE_CITAT.test(linii[i] ?? '')) {
        interior.push((linii[i] ?? '').replace(RE_CITAT, ''));
        i++;
      }
      out.push({ tip: 'citat', blocuri: blocuri(interior, ctx) });
      continue;
    }
    if (RE_MARCAJ.test(l)) {
      const r = lista(linii, i, ctx);
      out.push(r.bloc);
      i = r.sfarsit;
      continue;
    }
    const rand: string[] = [l.trimStart()];
    i++;
    while (i < linii.length && !gol(linii[i] ?? '') && !intrerupeParagraf(linii, i)) {
      rand.push((linii[i] ?? '').trimStart());
      i++;
    }
    const brut = rand.join('\n').trimEnd();
    out.push({ tip: 'paragraf', continut: parseazaInline(brut), brut });
  }
  return out;
}

/** Pură: un document markdown ca blocuri (ancorele titlurilor unice în tot documentul). */
export function parseazaMarkdown(text: string): Bloc[] {
  const linii = text.replace(/\r\n?/g, '\n').split('\n');
  if (linii.at(-1) === '') linii.pop();
  return blocuri(linii, { ancore: new Map() });
}
