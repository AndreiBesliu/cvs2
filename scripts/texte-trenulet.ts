/**
 * Textele planificatorului Trenuleț de tradus în engleză (ADR 0165), din surse, fără browser:
 * - cheile lui `tr` (șirul, sau șablonul cu {0}, {1}… în locul valorilor);
 * - textele fixe care ajung pe pagină, unde le traduce `Limba.urmareste`: nodurile de text și atributele `title`,
 *   `aria-label`, `placeholder`, `alt` din `body.html`, șirurile cu text din surse și bucățile fără valori din șabloanele cu
 *   marcaj (normalizate ca pe pagină: spațiile adunate, fără capete);
 * - fără ce rămâne românesc cu bună știință (`PASTRATE` și regulile din `pastrat`): nume de fișiere, antete STL, G-code și
 *   comentariile lui, clase CSS, selectoare, chei comparate, nume de produse și de controlere, erorile de neajuns.
 * `permise`: orice șir din surse (un cuvânt fără diacritice, ca „Pod”, poate primi traducere, deși nu se cere).
 *
 * Sursele se citesc fără tipuri (`stripTypeScriptTypes`, care păstrează pozițiile), cu parserul pe care îl dă Vite.
 * `node scripts/texte-trenulet.ts` pune în `texte.en.json` cheile noi (cu "") și scoate cele fără folos; spune câte lipsesc.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';
import { parseAst } from 'vite';

const SURSA = 'extensii/trenulet/sursa';
export const DICTIONAR = join(SURSA, 'planificator', 'texte.en.json');
const SURSE = ['planificator/app.ts', 'planificator/atelier.ts', 'planificator/cnc.ts', 'planificator/gcode.ts', 'planificator/profiluri.ts', 'lego/lego.ts'];
const ATRIBUTE = ['title', 'aria-label', 'placeholder', 'alt'];
const DIACRITICE = /[ăâîșțĂÂÎȘȚ]/;
const MARCAJ = /<\/?[a-zA-Z][^>]*>/;

/** Româna păstrată cu bună știință (mesaje pentru noi, nu pentru om; nume; comentarii din G-code). */
const PASTRATE = new Set([
  'use strict', 'Solid line', 'GRBL 1.1', 'GRBL 1.1h', 'NcStudio (Weihong)', 'RichAuto (DSP)', 'Planificator Trenuleț', 'La comanda',
  'freza dreapta', 'freza de tesit', 'mașina', 'număr nefinit în DXF:', 'tip necunoscut:', 'controler necunoscut:',
  'un arc cere poziția XY de start', 'cu fișiere separate pe sculă, programul se scrie cu posteazaPeScule', 'scula: M6 la controler',
  'scula: M0, cu scula in comentariu', 'Trenulet - planificatorul de circuite', 'fara punti', ', pe rampa', 'punti', 'freza de rotunjit R',
]);

type Nod = { readonly type: string; readonly start: number; readonly end: number; readonly [k: string]: unknown };
const esteNod = (x: unknown): x is Nod => typeof x === 'object' && x !== null && typeof (x as { type?: unknown }).type === 'string';

/** Textul normalizat ca pe pagină. */
export const normalizat = (s: string): string => s.replace(/\s+/g, ' ').trim();
const omenesc = (s: string): boolean => {
  const t = normalizat(s);
  if (!/[A-Za-zĂÂÎȘȚăâîșț]/.test(t)) return false;
  if (DIACRITICE.test(t)) return true;
  if (/^[#.[]/.test(t)) return false;
  return /\s/.test(t) && /[a-zA-Z]{2,}/.test(t);
};
const numeApel = (n: Nod): string => {
  const c = n['callee'] as Nod;
  if (c.type === 'Identifier') return c['name'] as string;
  if (c.type === 'MemberExpression' && !c['computed']) return ((c['property'] as Nod)['name'] as string) ?? '';
  return '';
};
function pastrat(t: string, f: string, parinte: Nod | null): boolean {
  const n = normalizat(t);
  if (PASTRATE.has(n)) return true;
  if (/^(placi|piese|gcode|limbi|printate|calibrare)\//.test(n) || /^[\w*<>/-]+\.(dxf|stl|svg|zip|json|txt|nc)$/.test(n)) return true;
  if (/^(placa_|stalp_|limba_|tren_|rampa_|lc_|cale:)/.test(n) || n.startsWith('trenulet: ') || n.startsWith('atelier de caramizi')) return true;
  if (/^(G\d|M\d)/.test(n) || n.includes('{unitati}')) return true;
  if (/^(mic|chip|btn|avert|at-|fila|bifa)( |$)/.test(n) || /^[a-z]+(-[a-z0-9]+)+( [a-z-]+)*$/.test(n)) return true;
  if (n.includes('[data-') || n.startsWith('input[')) return true;
  if (/^[a-z-]+="/.test(n)) return true;
  if (!parinte) return false;
  if (f === 'planificator/gcode.ts' && parinte.type === 'Property' && (parinte['key'] as Nod)['name'] === 'text') return true;
  if (parinte.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(parinte['operator'] as string)) return true;
  if (parinte.type === 'CallExpression' && ['comentariu', 'stlBinar', 'includes', 'startsWith', 'endsWith', 'test', 'querySelector',
    'querySelectorAll', 'closest', 'matches', '$', 'getItem', 'setItem'].includes(numeApel(parinte))) return true;
  if (parinte.type === 'MemberExpression' && parinte['computed']) return true;
  return false;
}

/** Bucățile unui șablon cu marcaj: textele dintre etichete și valorile atributelor (cu interpolările ca `${…}`). */
function bucatiMarcaj(s: string): { text: string[]; atribute: string[] } {
  const text: string[] = [], atribute: string[] = [];
  let i = 0, start = 0;
  const peste = (j: number): number => {
    let a = 1; j += 2;
    while (j < s.length && a > 0) { if (s[j] === '{') a++; else if (s[j] === '}') a--; j++; }
    return j;
  };
  while (i < s.length) {
    if (s[i] === '$' && s[i + 1] === '{') { i = peste(i); continue; }
    if (s[i] === '<' && /[a-zA-Z/!]/.test(s[i + 1] ?? '')) {
      text.push(s.slice(start, i));
      let j = i + 1;
      while (j < s.length && s[j] !== '>') {
        if (s[j] === '$' && s[j + 1] === '{') { j = peste(j); continue; }
        const m = /^([a-zA-Z-]+)="/.exec(s.slice(j));
        if (m) {
          let k = j + m[0].length;
          while (k < s.length && s[k] !== '"') { if (s[k] === '$' && s[k + 1] === '{') { k = peste(k); continue; } k++; }
          if (ATRIBUTE.includes(m[1]!)) atribute.push(s.slice(j + m[0].length, k));
          j = k + 1;
          continue;
        }
        j++;
      }
      i = j + 1;
      start = i;
      continue;
    }
    i++;
  }
  text.push(s.slice(start));
  return { text, atribute };
}

const entitati = (s: string): string => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');

export type Texte = { readonly cerute: ReadonlyMap<string, readonly string[]>; readonly permise: ReadonlySet<string> };

export function textePlanificator(): Texte {
  const cerute = new Map<string, string[]>(), permise = new Set<string>();
  const cere = (k: string, unde: string): void => {
    if (!k) return;
    const l = cerute.get(k) ?? [];
    l.push(unde);
    cerute.set(k, l);
  };
  const dinMarcaj = (s: string, unde: string, f: string, p: Nod | null): void => {
    const m = bucatiMarcaj(s);
    for (const t of [...m.text, ...m.atribute]) if (!t.includes('${') && omenesc(t) && !pastrat(t, f, p)) cere(normalizat(entitati(t)), unde);
  };
  // marcajul
  const corp = readFileSync(join(SURSA, 'planificator', 'body.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const b = bucatiMarcaj(corp);
  for (const t of [...b.text, ...b.atribute]) {
    const k = normalizat(entitati(t));
    if (omenesc(k) || /^[A-ZĂÂÎȘȚ][a-zăâîșț]+$/.test(k)) cere(k, 'body.html');
  }
  // sursele, fără tipuri (pozițiile rămân)
  for (const f of SURSE) {
    const js = stripTypeScriptTypes(readFileSync(join(SURSA, f), 'utf8'), { mode: 'strip' });
    const linii: number[] = [0];
    for (let i = 0; i < js.length; i++) if (js[i] === '\n') linii.push(i + 1);
    const unde = (n: Nod): string => {
      let a = 0, b2 = linii.length - 1;
      while (a < b2) { const m = (a + b2 + 1) >> 1; if (linii[m]! <= n.start) a = m; else b2 = m - 1; }
      return `${f}:${a + 1}`;
    };
    const esteTr = (n: unknown): boolean => esteNod(n) && n.type === 'Identifier' && n['name'] === 'tr';
    const vezi = (n: Nod, p: Nod | null): void => {
      if (n.type === 'TaggedTemplateExpression' && esteTr(n['tag'])) {
        const q = (n['quasi'] as Nod)['quasis'] as Nod[];
        cere(q.map((x, i) => (i ? `{${i - 1}}` : '') + ((x['value'] as { cooked: string }).cooked)).join(''), unde(n));
      } else if (n.type === 'CallExpression' && esteTr(n['callee'])) {
        const [a, c] = n['arguments'] as Nod[];
        const ctx = c && c.type === 'Literal' && typeof c['value'] === 'string' ? `@${c['value'] as string}` : '';
        if (a && a.type === 'Literal' && typeof a['value'] === 'string') cere(`${a['value'] as string}${ctx}`, unde(n));
      } else if (n.type === 'Literal' && typeof n['value'] === 'string') {
        const v = n['value'] as string;
        permise.add(normalizat(v));
        const cheie = p && p.type === 'Property' && p['key'] === n;
        const caz = p && p.type === 'SwitchCase';
        if (!cheie && !caz && !(p && p.type === 'CallExpression' && esteTr(p['callee']))) {
          if (MARCAJ.test(v)) dinMarcaj(v, unde(n), f, p);
          else if (omenesc(v) && !pastrat(v, f, p)) cere(normalizat(v), unde(n));
        }
      } else if (n.type === 'TemplateLiteral' && !(p && p.type === 'TaggedTemplateExpression' && esteTr(p['tag']))) {
        const brut = js.slice(n.start + 1, n.end - 1);
        const fix = ((n['quasis'] as Nod[]).map((x) => (x['value'] as { cooked: string }).cooked)).join('');
        for (const x of n['quasis'] as Nod[]) permise.add(normalizat((x['value'] as { cooked: string }).cooked));
        if (MARCAJ.test(brut)) dinMarcaj(brut, unde(n), f, p);
        else if ((n['expressions'] as Nod[]).length === 0 && omenesc(fix) && !pastrat(fix, f, p)) cere(normalizat(fix), unde(n));
      }
      for (const k in n) {
        if (k === 'type' || k === 'start' || k === 'end') continue;
        const v = n[k];
        if (Array.isArray(v)) { for (const x of v) if (esteNod(x)) vezi(x, n); } else if (esteNod(v)) vezi(v, n);
      }
    };
    vezi(parseAst(js) as unknown as Nod, null);
  }
  for (const k of cerute.keys()) permise.add(k);
  return { cerute, permise };
}

export function citesteDictionar(): Record<string, string> {
  return JSON.parse(readFileSync(DICTIONAR, 'utf8')) as Record<string, string>;
}

if (import.meta.main) {
  const { cerute, permise } = textePlanificator();
  const d = citesteDictionar();
  const nou: Record<string, string> = {};
  let noi = 0, scoase = 0;
  for (const k of [...cerute.keys()].sort((a, b) => a.localeCompare(b, 'ro'))) { nou[k] = d[k] ?? ''; if (!(k in d)) noi++; }
  // o traducere necerută rămâne doar dacă textul e în surse și are traducere (un cuvânt fără diacritice, ca „Pod”)
  for (const [k, v] of Object.entries(d)) if (!cerute.has(k)) { if (permise.has(k.replace(/@[^@]*$/, '')) && v) nou[k] = v; else scoase++; }
  writeFileSync(DICTIONAR, `${JSON.stringify(nou, null, 1)}\n`);
  const lipsa = Object.values(nou).filter((v) => v === '').length;
  console.log(`${DICTIONAR}: ${Object.keys(nou).length} texte; ${noi} noi, ${scoase} scoase, ${lipsa} fără traducere.`);
}
