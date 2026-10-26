/**
 * Documentația admin, generată la fiecare build (ADR 0048): citește sursele din repo (`PLAN.md` §5.3–§5.4, fișele
 * etapelor și ale plăcilor din `docs/etape/`, indexul și fișierele din `docs/adr/`, `CLAUDE.md`, `DEVLOG.md`) și scrie în
 * `dist/documentatie/`:
 * - `roadmap.json`: etapele cu starea DEDUSĂ din fișe (jurnalul feliilor, plăcile), feliile, ce așteaptă de la owner,
 *   cifrele; nimic scris de mână în altă parte (un singur adevăr);
 * - `catalog.json`: documentele, pe categorii;
 * - `doc/<calea din repo>`: textul fiecărui document (LF), cerut de fila Documentație la deschidere.
 *
 * **Poarta:** dacă un tabel așteptat (etapele din §5.4, feliile și jurnalul fiecărei fișe, indexul ADR) nu se mai poate
 * citi, generarea aruncă `EroareDocumentatie` cu fișierul și motivul, iar build-ul pică (pluginul din `vite.config.ts`):
 * documentația nu rămâne tăcut în urmă. Tabelele se citesc cu funcțiile cititorului (`src/docs/markdown.ts`), deci ce
 * vede poarta e ce vede omul.
 *
 * Determinist: fără ore, fișierele în ordinea căilor, textul cu LF (un checkout cu CRLF dă aceiași octeți).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { genereazaCodurile } from './coduri.ts';
import { EroareManual, genereazaManualul } from './manual.ts';
import { EroareTutorial, genereazaTutorialele } from './tutorial.ts';
import { CALE_DICTIONAR_EN, citesteDictionar, traduceRoadmap } from './traducere.ts';
import { join } from 'node:path';
import { ancora, citesteTabel, parseazaInline, parseazaMarkdown, textSimplu, type Bloc, type TabelBrut } from '../src/docs/markdown.ts';
import {
  FISIER_CATALOG, FISIER_ROADMAP, FISIER_ROADMAP_EN, fisierDocument,
  type AdrPeScurt, type Catalog, type Categorie, type CerereOwner, type DocumentCatalog, type Etapa, type Felie, type Prag, type Punct,
  type Roadmap, type StareAdr, type StareFelie,
} from '../shared/documentatie.ts';

export class EroareDocumentatie extends Error {
  readonly cale: string;
  constructor(cale: string, motiv: string) {
    super(`${cale}: ${motiv}`);
    this.name = 'EroareDocumentatie';
    this.cale = cale;
  }
}

// ——— Texte ———

/** Parcurge `md` la adâncimea 0: în afara codului inline și a parantezelor. `f` întoarce true ca să oprească. */
function laSuprafata(md: string, f: (i: number) => boolean): number {
  let paranteze = 0;
  for (let i = 0; i < md.length; i++) {
    const c = md[i];
    if (c === '`') {
      let n = 0;
      while (md[i + n] === '`') n++;
      const inchis = md.indexOf('`'.repeat(n), i + n);
      if (inchis > 0) {
        i = inchis + n - 1;
        continue;
      }
    }
    if (c === '(') paranteze++;
    else if (c === ')') paranteze = Math.max(0, paranteze - 1);
    else if (paranteze === 0 && f(i)) return i;
  }
  return -1;
}

/** Taie la `max` caractere, la o graniță de cuvânt, cu `…`. */
function plafon(s: string, max: number): string {
  if (s.length <= max) return s;
  const spatiu = s.lastIndexOf(' ', max);
  return `${(spatiu > max / 2 ? s.slice(0, spatiu) : s.slice(0, max)).trimEnd()}…`;
}

/** Scoate parantezele de la adâncimea 0 (`Regiunea păstrată (ADR 0026)` → `Regiunea păstrată`), în afara codului. */
function faraParanteze(md: string): string {
  let out = '';
  let adancime = 0;
  for (let i = 0; i < md.length; i++) {
    const c = md[i] ?? '';
    if (c === '`' && adancime === 0) {
      const inchis = md.indexOf('`', i + 1);
      if (inchis > 0) {
        out += md.slice(i, inchis + 1);
        i = inchis;
        continue;
      }
    }
    if (c === '(') adancime++;
    else if (c === ')' && adancime > 0) adancime--;
    else if (adancime === 0) out += c;
  }
  return out.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}

/**
 * Pură: titlul scurt al unui rând (markdown inline): `**Titlu**` de la început (fără „, adusă din etapa N” și fără `:`),
 * altfel textul până la primul `:`, `,`, `;` sau sfârșit de propoziție de la suprafață, fără paranteze; cel mult 90.
 */
export function titluScurt(md: string): string {
  const s = md.trim();
  const tare = /^\*\*(.+?)\*\*/.exec(s);
  if (tare && (tare[1] ?? '').trim() !== '') {
    const t = (tare[1] ?? '').trim();
    const dupa = s.slice(tare[0].length);
    // `**Titlu:** …` sau `**Titlu** (…)`: titlul e partea tare. `**Început** și restul`: titlul e propoziția întreagă.
    if (t.endsWith(':') || /^\s*(?:[(:,.;]|$)/.test(dupa)) {
      return plafon(t.replace(/[:.]$/, '').replace(/,\s*adusă din etapa \d+$/, '').trim(), 90);
    }
    return titluScurt(`${t}${dupa}`);
  }
  const taie = laSuprafata(s, (i) => /[:;]/.test(s[i] ?? '') || (s[i] === '.' && /\s/.test(s[i + 1] ?? '')));
  let cap = taie < 0 ? s : s.slice(0, taie);
  // O enumerare se taie la prima virgulă care lasă cel puțin trei cuvinte („Jog, zero XY / Z, …” → „Jog, zero XY / Z”).
  const virgula = laSuprafata(cap, (i) => cap[i] === ',' && faraParanteze(cap.slice(0, i)).split(' ').length >= 3);
  if (virgula >= 0) cap = cap.slice(0, virgula);
  return plafon((faraParanteze(cap) || cap.trim()).replace(/\.$/, ''), 90);
}

/** Pură: prima propoziție a unei note (la suprafață, în afara codului și a parantezelor), cel mult 240 de caractere. */
export function primaPropozitie(md: string): string {
  const s = md.trim();
  const capat = laSuprafata(s, (i) => /[.!?]/.test(s[i] ?? '') && (i + 1 >= s.length || /\s/.test(s[i + 1] ?? '')));
  return plafon(capat < 0 ? s : s.slice(0, capat + 1), 240);
}

/** Numerele ADR pomenite (`ADR 0047`), unice, în ordinea apariției. */
function adrDin(...texte: readonly string[]): string[] {
  return [...new Set(texte.flatMap((t) => [...t.matchAll(/ADR (\d{4})\b/g)].map((m) => m[1] ?? '')))];
}

// ——— Secțiuni și tabele ———

const liniiDin = (text: string): string[] => text.replace(/\r\n?/g, '\n').split('\n');

interface Sectiune {
  readonly linii: readonly string[];
  /** Textul titlului (markdown inline). */
  readonly titlu: string;
  /** Numărul (de la 1) liniei titlului. */
  readonly linie: number;
}

/** Secțiunea al cărei titlu de nivel `nivel` se potrivește cu `titlu`, până la următorul titlu de nivel ≤ `nivel`. */
function sectiune(text: string, nivel: number, titlu: RegExp): Sectiune | null {
  const linii = liniiDin(text);
  let inCod = false;
  let start = -1;
  let gasit = '';
  for (let i = 0; i < linii.length; i++) {
    const l = linii[i] ?? '';
    if (/^ {0,3}(`{3,}|~{3,})/.test(l)) inCod = !inCod;
    if (inCod) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(l);
    if (!m) continue;
    const n = (m[1] ?? '').length;
    if (start >= 0 && n <= nivel) return { linii: linii.slice(start + 1, i), titlu: gasit, linie: start + 1 };
    if (start < 0 && n === nivel && titlu.test((m[2] ?? '').trim())) {
      start = i;
      gasit = (m[2] ?? '').trim();
    }
  }
  return start < 0 ? null : { linii: linii.slice(start + 1), titlu: gasit, linie: start + 1 };
}

interface TabelCitit extends TabelBrut {
  /** Numărul (de la 1, în fișier) al fiecărui rând de date. */
  readonly linii: readonly number[];
}

/**
 * Tabelele unei secțiuni, citite ca de cititor, cu forma cerută de poartă: fiecare rând începe și se termină cu `|`, iar
 * niciun rând cu `|` nu stă în afara unui tabel (un rând gol în mijloc ar face din restul un paragraf).
 */
function tabele(cale: string, s: Sectiune, ce: string): TabelCitit[] {
  const out: TabelCitit[] = [];
  let inCod = false;
  for (let i = 0; i < s.linii.length; i++) {
    const l = s.linii[i] ?? '';
    if (/^ {0,3}(`{3,}|~{3,})/.test(l)) inCod = !inCod;
    if (inCod || !/^ {0,3}\|/.test(l)) continue;
    const nr = (k: number): number => s.linie + 1 + k;
    const t = citesteTabel(s.linii, i);
    if (!t) throw new EroareDocumentatie(cale, `„${ce}”: rând de tabel în afara unui tabel, la linia ${nr(i)} (un rând gol în tabel, sau antetul fără separator): „${l.slice(0, 60)}”`);
    const linii: number[] = [];
    for (let k = i + 2; k < t.sfarsit; k++) {
      const r = (s.linii[k] ?? '').trim();
      if (!r.startsWith('|') || !r.endsWith('|') || r.endsWith('\\|')) {
        throw new EroareDocumentatie(cale, `„${ce}”: rândul de la linia ${nr(k)} nu începe și nu se termină cu „|” (un rând rupt): „${r.slice(0, 60)}”`);
      }
      linii.push(nr(k));
    }
    out.push({ ...t, linii });
    i = t.sfarsit - 1;
  }
  return out;
}

/** Primul tabel al secțiunii, cu antetul cerut (exact, sau prin `potriveste`). */
function tabelCu(cale: string, s: Sectiune, ce: string, antet: readonly string[], potriveste?: (a: readonly string[]) => boolean): TabelCitit {
  const t = tabele(cale, s, ce)[0];
  const bun = t !== undefined && (potriveste ? potriveste(t.antet) : t.antet.length === antet.length && t.antet.every((c, k) => c === antet[k]));
  if (!t || !bun) {
    throw new EroareDocumentatie(cale, `„${ce}”: primul tabel trebuie să aibă antetul | ${antet.join(' | ')} |; găsit: ${t ? `| ${t.antet.join(' | ')} |` : 'niciun tabel'}`);
  }
  return t;
}

function celuleExacte(cale: string, t: TabelCitit, k: number, ce: string): readonly string[] {
  const r = t.randuri[k] ?? [];
  if (r.length !== t.antet.length) {
    throw new EroareDocumentatie(cale, `„${ce}”: rândul de la linia ${t.linii[k] ?? '?'} („${r[0] ?? ''}”) are ${r.length} celule, antetul ${t.antet.length}`);
  }
  return r;
}

// ——— PLAN.md ———

export interface EtapaPlan {
  readonly id: string;
  readonly numar: number | null;
  readonly saptamana: number;
  readonly tinta: string;
  readonly inchide: string;
  readonly placa: string;
  readonly live: string;
  readonly areLive: boolean;
}

const PLAN = 'PLAN.md';

/** Pură: tabelul etapelor din `PLAN.md` §5.4 („Săpt. | Etapa | Ținta | Închide… | Placa probează | Live”). */
export function citesteEtapele(plan: string): EtapaPlan[] {
  const s = sectiune(plan, 3, /^5\.4 Etapele\b/);
  if (!s) throw new EroareDocumentatie(PLAN, 'lipsește secțiunea „### 5.4 Etapele” (tabelul etapelor)');
  const ce = '§5.4 Etapele';
  const t = tabelCu(PLAN, s, ce, ['Săpt.', 'Etapa', 'Ținta', 'Închide…', 'Placa probează', 'Live'], (a) => a.length === 6
    && (a[0] ?? '').startsWith('Săpt') && a[1] === 'Etapa' && a[2] === 'Ținta' && (a[3] ?? '').startsWith('Închide')
    && (a[4] ?? '').startsWith('Placa') && a[5] === 'Live');
  const etape = t.randuri.map((_, k): EtapaPlan => {
    const [sapt = '', id = '', tinta = '', inchide = '', placa = '', live = ''] = celuleExacte(PLAN, t, k, ce);
    if (!/^\d+$/.test(sapt)) throw new EroareDocumentatie(PLAN, `${ce}: săptămâna „${sapt}” (linia ${t.linii[k] ?? '?'}) nu e un număr`);
    if (!/^(\d+|T\d+)$/.test(id)) throw new EroareDocumentatie(PLAN, `${ce}: etapa „${id}” (linia ${t.linii[k] ?? '?'}) nu e un număr sau un tampon (T1…)`);
    const viu = live.replace(/\*/g, '').trim().toLowerCase();
    return {
      id, numar: id.startsWith('T') ? null : Number(id), saptamana: Number(sapt), tinta, inchide, placa, live,
      areLive: viu.startsWith('da') || viu.startsWith('lansarea'),
    };
  });
  const numere = etape.flatMap((e) => (e.numar === null ? [] : [e.numar]));
  numere.forEach((n, k) => {
    if (n !== k + 1) throw new EroareDocumentatie(PLAN, `${ce}: etapele numerotate trebuie să fie 1, 2, 3…, în ordine; în locul ${k + 1} e ${n}`);
  });
  const tampoane = etape.filter((e) => e.numar === null).map((e) => e.id);
  tampoane.forEach((id, k) => {
    if (id !== `T${k + 1}`) throw new EroareDocumentatie(PLAN, `${ce}: tampoanele trebuie să fie T1, T2…, în ordine; în locul ${k + 1} e ${id}`);
  });
  etape.forEach((e, k) => {
    if (e.saptamana !== k + 1) throw new EroareDocumentatie(PLAN, `${ce}: săptămânile trebuie să fie 1, 2, 3…, câte una pe rând; rândul ${k + 1} (etapa ${e.id}) are ${e.saptamana}`);
  });
  if (numere.length === 0) throw new EroareDocumentatie(PLAN, `${ce}: nicio etapă numerotată`);
  return etape;
}

export interface PunctPlan {
  readonly numar: number;
  readonly titlu: string;
  readonly descriere: string;
}

/** Pură: punctele etapelor descrise în detaliu în `PLAN.md` §5.3 (`**Etapa N — …**` urmat de lista numerotată). */
export function citesteDetaliile(plan: string): Map<number, PunctPlan[]> {
  const s = sectiune(plan, 3, /^5\.3 Primele\b/);
  if (!s) throw new EroareDocumentatie(PLAN, 'lipsește secțiunea „### 5.3 Primele … etape, în detaliu”');
  const out = new Map<number, PunctPlan[]>();
  let etapa: number | null = null;
  for (const b of parseazaMarkdown(s.linii.join('\n'))) {
    if (b.tip === 'paragraf') {
      const m = /^\*\*Etapa (\d+) — /.exec(b.brut);
      if (m) etapa = Number(m[1]);
      continue;
    }
    if (b.tip !== 'lista' || !b.ordonata || etapa === null) continue;
    if (out.has(etapa)) throw new EroareDocumentatie(PLAN, `§5.3: etapa ${etapa} are două liste de puncte`);
    out.set(etapa, b.elemente.map((e, k) => {
      const p = e.blocuri.find((x): x is Extract<Bloc, { tip: 'paragraf' }> => x.tip === 'paragraf');
      const brut = (p?.brut ?? '').replace(/\n/g, ' ');
      return { numar: b.start + k, titlu: titluScurt(brut), descriere: brut };
    }));
    etapa = null;
  }
  if (out.size === 0) throw new EroareDocumentatie(PLAN, '§5.3: nicio etapă descrisă („**Etapa N — …**” urmat de lista numerotată)');
  return out;
}

// ——— Fișele etapelor și ale plăcilor ———

/** `3.4b`, `4.2↑`, `4.7↑b`, `2.8-0`, `2.3c-4`, `3.P`. */
const RE_ID = /^(\d+)\.(\d+|[A-Z])(↑?)([a-z]?)(?:-(\d+))?$/;

export interface RandFelie {
  readonly id: string;
  readonly descriere: string;
}

export interface RandJurnal {
  readonly id: string;
  readonly started: string | null;
  readonly completed: string | null;
  readonly treceri: number | null;
  readonly nota: string;
}

export interface Fisa {
  readonly cale: string;
  readonly numar: number;
  readonly titlu: string;
  readonly pornita: string | null;
  readonly felii: readonly RandFelie[];
  readonly jurnal: readonly RandJurnal[];
  readonly owner: readonly { readonly ce: string; readonly pentru: string; readonly termen: string }[];
  /** Ancora secțiunii „Ce îi trebuie owner-ului” în documentul randat (null: fișa n-o are). */
  readonly ancoraOwner: string | null;
}

const gol = (s: string): boolean => s === '' || s === '—' || s === '-';

function primulTitlu(text: string): string {
  return /^# (.+)$/m.exec(text.replace(/\r\n?/g, '\n'))?.[1]?.trim() ?? '';
}

/** Pură: fișa unei etape (`docs/etape/etapa-NN.md`): titlul, „Feliile”, „Jurnalul feliilor”, „Ce îi trebuie owner-ului”. */
export function citesteFisa(cale: string, text: string): Fisa {
  const numar = Number(/etapa-(\d+)\.md$/.exec(cale)?.[1] ?? Number.NaN);
  const titlu = primulTitlu(text);
  const m = /^Etapa (\d+) — (.+)$/.exec(titlu);
  if (!m || Number(m[1]) !== numar) throw new EroareDocumentatie(cale, `titlul trebuie să fie „# Etapa ${numar} — …”; găsit „# ${titlu}”`);

  const sf = sectiune(text, 2, /^Feliile\b/);
  if (!sf) throw new EroareDocumentatie(cale, 'lipsește secțiunea „## Feliile”');
  const tf = tabelCu(cale, sf, 'Feliile', ['#', 'Felia', '…'], (a) => a[0] === '#' && a[1] === 'Felia');
  const felii = tf.randuri.map((_, k): RandFelie => {
    const [id = '', descriere = ''] = celuleExacte(cale, tf, k, 'Feliile');
    const p = RE_ID.exec(id);
    if (!p || Number(p[1]) !== numar || p[3] !== '') {
      throw new EroareDocumentatie(cale, `„Feliile”: id-ul „${id}” (linia ${tf.linii[k] ?? '?'}) nu e o felie a etapei ${numar} (${numar}.1, ${numar}.4b, ${numar}.8-0)`);
    }
    return { id, descriere };
  });
  const dubluri = felii.map((f) => f.id).filter((id, k, a) => a.indexOf(id) !== k);
  if (dubluri.length) throw new EroareDocumentatie(cale, `„Feliile”: id-ul ${dubluri[0] ?? ''} apare de două ori`);

  const sj = sectiune(text, 2, /^Jurnalul feliilor\b/);
  if (!sj) throw new EroareDocumentatie(cale, 'lipsește secțiunea „## Jurnalul feliilor”');
  const tj = tabelCu(cale, sj, 'Jurnalul feliilor', ['#', 'Started', 'Completed', 'Treceri', 'Nota']);
  const vazute = new Set<string>();
  const jurnal = tj.randuri.map((_, k): RandJurnal => {
    const [id = '', started = '', completed = '', treceri = '', nota = ''] = celuleExacte(cale, tj, k, 'Jurnalul feliilor');
    const unde = `„Jurnalul feliilor”, rândul ${id} (linia ${tj.linii[k] ?? '?'})`;
    const p = RE_ID.exec(id);
    if (!p) throw new EroareDocumentatie(cale, `${unde}: id-ul nu are forma unei felii (3.1, 3.4b, 4.2↑)`);
    const etapa = Number(p[1]);
    if (p[3] === '' ? etapa !== numar : etapa <= numar) {
      throw new EroareDocumentatie(cale, `${unde}: în fișa etapei ${numar} stau feliile ei și cele aduse înainte din etape următoare, cu „↑” (${numar + 1}.2↑)`);
    }
    if (vazute.has(id)) throw new EroareDocumentatie(cale, `${unde}: id-ul ${id} apare de două ori în jurnal`);
    vazute.add(id);
    if (gol(started)) throw new EroareDocumentatie(cale, `${unde}: lipsește „Started”`);
    if (!gol(treceri) && !/^\d+$/.test(treceri)) throw new EroareDocumentatie(cale, `${unde}: „Treceri” e „${treceri}”, nu un număr (sau —)`);
    return { id, started, completed: gol(completed) ? null : completed, treceri: gol(treceri) ? null : Number(treceri), nota };
  });

  const so = sectiune(text, 2, /^Ce îi trebuie owner-ului\b/);
  const owner = so === null ? [] : (() => {
    const t = tabelCu(cale, so, 'Ce îi trebuie owner-ului', ['Ce', 'Pentru', 'Termen']);
    return t.randuri.map((_, k) => {
      const [ce = '', pentru = '', termen = ''] = celuleExacte(cale, t, k, 'Ce îi trebuie owner-ului');
      return { ce, pentru, termen };
    });
  })();

  const pornita = /\*\*Starea:\*\*[^\n]*?pornită pe (\d{2}\.\d{2}\.\d{4})/.exec(text)?.[1] ?? null;
  return { cale, numar, titlu, pornita, felii, jurnal, owner, ancoraOwner: so === null ? null : ancora(so.titlu) };
}

export interface Placa {
  readonly cale: string;
  readonly numar: number;
  readonly titlu: string;
  readonly taiata: string | null;
}

/** Pură: fișa unei plăci (`docs/etape/placa-NN.md`); tăiată = un rând `**Tăiată:** zz.ll.aaaa` (scris când vin cotele). */
export function citestePlaca(cale: string, text: string): Placa {
  const numar = Number(/placa-(\d+)\.md$/.exec(cale)?.[1] ?? Number.NaN);
  const titlu = primulTitlu(text);
  const m = /^Fișa plăcii (\d+)$/.exec(titlu);
  if (!m || Number(m[1]) !== numar) throw new EroareDocumentatie(cale, `titlul trebuie să fie „# Fișa plăcii ${numar}”; găsit „# ${titlu}”`);
  const t = /\*\*Tăiată:\*\*(.*)$/m.exec(text);
  const data = t ? /^\s*(\d{2}\.\d{2}\.\d{4})\b/.exec(t[1] ?? '')?.[1] : undefined;
  if (t && !data) throw new EroareDocumentatie(cale, `„**Tăiată:**” cere data (zz.ll.aaaa): „${(t[1] ?? '').trim()}”`);
  return { cale, numar, titlu, taiata: data ?? null };
}

// ——— ADR ———

const INDEX_ADR = 'docs/adr/README.md';
const ACOPERIRE = 'ACOPERIRE-ARTCAM-DESKPROTO.md';
const ANTET_PRAG = ['Capabilitate', 'Sursă', 'Etapă', 'Stare', 'Commit'] as const;

export interface RandPrag {
  readonly capabilitate: string;
  readonly stare: 'facut' | 'in-lucru' | 'de-facut';
}

/**
 * Pură: rândurile pragului, din toate tabelele cu antetul | Capabilitate | Sursă | Etapă | Stare | Commit | (grupele); starea
 * începe cu „făcut”, „în lucru” sau „de făcut” (CLAUDE.md, „Surse”), altfel poarta oprește build-ul.
 */
export function citesteAcoperirea(text: string): RandPrag[] {
  const s: Sectiune = { linii: liniiDin(text), titlu: '', linie: 0 };
  const out: RandPrag[] = [];
  for (const t of tabele(ACOPERIRE, s, 'pragul')) {
    if (t.antet.length !== ANTET_PRAG.length || !t.antet.every((c, k) => c === ANTET_PRAG[k])) continue;
    for (const [k] of t.randuri.entries()) {
      const [capabilitate = '', , , stare = ''] = celuleExacte(ACOPERIRE, t, k, 'pragul');
      const fel = /^făcut\b/.test(stare) ? 'facut' : /^în lucru\b/.test(stare) ? 'in-lucru' : /^de făcut\b/.test(stare) ? 'de-facut' : null;
      if (!fel) throw new EroareDocumentatie(ACOPERIRE, `rândul de la linia ${t.linii[k] ?? '?'} („${capabilitate.slice(0, 40)}”): starea începe cu „făcut”, „în lucru” sau „de făcut”, nu „${stare.slice(0, 30)}”`);
      out.push({ capabilitate, stare: fel });
    }
  }
  if (out.length === 0) throw new EroareDocumentatie(ACOPERIRE, `niciun tabel cu antetul | ${ANTET_PRAG.join(' | ')} |`);
  return out;
}

const GOALE = new Set(['și', 'cu', 'de', 'pe', 'a', 'al', 'un', 'o', 'în', 'din', 'la', 'fără', 'sau']);
const normal = (s: string): string => s.replace(/[*`]/g, '').trim().toLowerCase();
const cuvinte = (s: string): Set<string> => new Set([...normal(s).matchAll(/[\p{L}\p{N}²]+/gu)].map((m) => m[0]).filter((w) => w.length > 1 && !GOALE.has(w)));

/**
 * Pură: rândul de prag al unui punct din coloana „Închide”: cel al cărui nume începe cu punctul (`Găurire`, `Animația
 * traseului`), altfel singurul care îi conține toate cuvintele (`Buzunar cu mai multe freze`); mai multe sau niciunul: null.
 */
export function randulPragului(punct: string, randuri: readonly RandPrag[]): RandPrag | null {
  const p = normal(punct);
  const prefix = randuri.filter((r) => normal(r.capabilitate).startsWith(p));
  if (prefix.length === 1) return prefix[0] ?? null;
  const w = cuvinte(punct);
  if (w.size === 0) return null;
  const toate = randuri.filter((r) => { const c = cuvinte(r.capabilitate); return [...w].every((x) => c.has(x)); });
  return toate.length === 1 ? toate[0] ?? null : null;
}

/** Pură: cât din rândurile de prag ale coloanei „Închide” e făcut (punctele despărțite cu „;”). */
export function pragEtapei(inchide: string, randuri: readonly RandPrag[]): Prag {
  let facut = 0, inLucru = 0, deFacut = 0, fara = 0;
  for (const punct of inchide.split(';').map((x) => x.trim()).filter((x) => x !== '' && x !== '—')) {
    const r = randulPragului(punct, randuri);
    if (!r) fara++;
    else if (r.stare === 'facut') facut++;
    else if (r.stare === 'in-lucru') inLucru++;
    else deFacut++;
  }
  return { facut, inLucru, deFacut, fara };
}

export interface RandIndexAdr {
  readonly numar: string;
  readonly fisier: string;
  readonly decizia: string;
}

/** Pură: tabelul indexului ADR (`docs/adr/README.md`: „ADR | Rândul | Decizia | Intră în”), cu linkul spre fișier. */
export function citesteIndexAdr(text: string): RandIndexAdr[] {
  const s: Sectiune = { linii: liniiDin(text), titlu: '', linie: 0 };
  const t = tabelCu(INDEX_ADR, s, 'indexul ADR', ['ADR', 'Rândul', 'Decizia', 'Intră în']);
  return t.randuri.map((_, k) => {
    const [legatura = '', , decizia = ''] = celuleExacte(INDEX_ADR, t, k, 'indexul ADR');
    const m = /^\[(\d{4})\]\(((\d{4})-[^)/]+\.md)\)$/.exec(legatura);
    if (!m || m[1] !== m[3]) throw new EroareDocumentatie(INDEX_ADR, `rândul de la linia ${t.linii[k] ?? '?'} („${legatura}”) nu e un link [NNNN](NNNN-….md)`);
    return { numar: m[1] ?? '', fisier: m[2] ?? '', decizia };
  });
}

export interface Adr {
  readonly cale: string;
  readonly numar: string;
  readonly titlu: string;
  readonly titluScurt: string;
  readonly stare: StareAdr;
}

/** Pură: un ADR (`docs/adr/NNNN-….md`): titlul `# ADR NNNN — …` (sau `:`) cu numărul fișierului, rândul `**Starea:**`. */
export function citesteAdr(cale: string, text: string): Adr {
  const numar = /(\d{4})-[^/]+\.md$/.exec(cale)?.[1] ?? '';
  const titlu = primulTitlu(text);
  const m = /^ADR (\d{4})\s*[—:]\s*(.+)$/.exec(titlu);
  if (!m || m[1] !== numar) throw new EroareDocumentatie(cale, `titlul trebuie să fie „# ADR ${numar} — …”; găsit „# ${titlu}”`);
  const s = /^\*\*Starea:\*\*\s*(.*)$/m.exec(text);
  if (!s) throw new EroareDocumentatie(cale, 'lipsește rândul „**Starea:** …”');
  const st = (s[1] ?? '').trim().toLowerCase();
  const stare: StareAdr = st.startsWith('acceptat') ? 'acceptat' : st.startsWith('propus') ? 'propus' : st.startsWith('înlocuit') ? 'inlocuit' : 'altul';
  const rest = (m[2] ?? '').trim();
  return { cale, numar, titlu: rest, titluScurt: titluScurt(rest), stare };
}

// ——— Roadmap-ul ———

export interface SurseRoadmap {
  readonly plan: string;
  /** `ACOPERIRE-ARTCAM-DESKPROTO.md`: starea rândurilor de prag. */
  readonly acoperire: string;
  readonly fise: readonly { readonly cale: string; readonly text: string }[];
  readonly placi: readonly { readonly cale: string; readonly text: string }[];
  readonly indexAdr: string;
  readonly adr: readonly { readonly cale: string; readonly text: string }[];
}

/** Sub-felie: `2.7a`, `2.8-0` și `4.7↑b` sunt ale lui `2.7`, `2.8`, `4.7↑`; `1.10` nu e a lui `1.1`. */
const esteSub = (copil: string, parinte: string): boolean => copil.length > parinte.length && copil.startsWith(parinte) && /[a-z-]/.test(copil[parinte.length] ?? '');

interface Rand {
  readonly id: string;
  readonly descriere: string | null;
  readonly jurnal: RandJurnal | null;
  readonly fisa: string | null;
  readonly adusa: boolean;
}

function felii(randuri: readonly Rand[]): Felie[] {
  const stari = new Map<string, StareFelie>();
  const stare = (r: Rand): StareFelie => {
    const veche = stari.get(r.id);
    if (veche) return veche;
    let s: StareFelie;
    if (r.jurnal) s = r.jurnal.completed === null ? 'in-lucru' : 'gata';
    else {
      const copii = randuri.filter((c) => esteSub(c.id, r.id)).map(stare);
      if (copii.length === 0) s = 'de-facut';
      else if (copii.every((c) => c === 'gata')) s = 'gata';
      else s = copii.some((c) => c !== 'de-facut') ? 'in-lucru' : 'de-facut';
    }
    stari.set(r.id, s);
    return s;
  };
  return randuri.map((r): Felie => {
    const nota = r.jurnal?.nota ?? '';
    const descriere = r.descriere ?? nota;
    const parinti = randuri.filter((p) => esteSub(r.id, p.id)).map((p) => p.id).sort((a, b) => b.length - a.length);
    return {
      id: r.id,
      titlu: titluScurt(descriere),
      descriere,
      stare: stare(r),
      started: r.jurnal?.started ?? null,
      completed: r.jurnal?.completed ?? null,
      treceri: r.jurnal?.treceri ?? null,
      nota: nota === '' ? '' : primaPropozitie(nota),
      notaIntreaga: nota,
      adr: adrDin(descriere, r.descriere === null ? '' : nota),
      adusa: r.adusa,
      parinte: parinti[0] ?? null,
      jurnal: r.fisa,
      dinSubfelii: r.jurnal === null && randuri.some((c) => esteSub(c.id, r.id)),
    };
  });
}

/** Pură: roadmap-ul dedus din surse (stările din fișe, nimic scris de mână în altă parte), cu poarta pe fiecare tabel. */
export function construiesteRoadmap(surse: SurseRoadmap): Roadmap {
  const planul = citesteEtapele(surse.plan);
  const prag = citesteAcoperirea(surse.acoperire);
  const detalii = citesteDetaliile(surse.plan);
  const numere = new Set(planul.flatMap((e) => (e.numar === null ? [] : [e.numar])));
  for (const n of detalii.keys()) {
    if (!numere.has(n)) throw new EroareDocumentatie(PLAN, `§5.3 descrie etapa ${n}, care nu e în tabelul din §5.4`);
  }
  const fise = surse.fise.map((f) => citesteFisa(f.cale, f.text)).sort((a, b) => a.numar - b.numar);
  for (const f of fise) if (!numere.has(f.numar)) throw new EroareDocumentatie(f.cale, `etapa ${f.numar} nu e în tabelul din PLAN.md §5.4`);
  const placi = surse.placi.map((p) => citestePlaca(p.cale, p.text));

  const index = citesteIndexAdr(surse.indexAdr);
  const adrFisiere = surse.adr.map((a) => citesteAdr(a.cale, a.text)).sort((a, b) => a.numar.localeCompare(b.numar));
  const numeFisier = (cale: string): string => cale.split('/').at(-1) ?? '';
  for (const r of index) {
    if (!adrFisiere.some((a) => numeFisier(a.cale) === r.fisier)) throw new EroareDocumentatie(INDEX_ADR, `rândul ${r.numar} trimite la ${r.fisier}, care nu există`);
  }
  for (const a of adrFisiere) {
    if (!index.some((r) => r.fisier === numeFisier(a.cale))) throw new EroareDocumentatie(INDEX_ADR, `${a.cale} (ADR ${a.numar}) nu e în index: fiecare ADR are rândul lui`);
  }
  const dubluAdr = index.map((r) => r.numar).find((n, k, l) => l.indexOf(n) !== k);
  if (dubluAdr) throw new EroareDocumentatie(INDEX_ADR, `ADR ${dubluAdr} apare de două ori în index`);

  // Feliile fiecărei etape: rândurile tabelului, apoi cele doar din jurnal; cele aduse (↑) la etapa lor.
  const randuri = new Map<number, Rand[]>();
  const adauga = (n: number, r: Rand): void => {
    const l = randuri.get(n) ?? [];
    l.push(r);
    randuri.set(n, l);
  };
  for (const f of fise) {
    const proprii = new Map(f.jurnal.filter((j) => !j.id.includes('↑')).map((j) => [j.id, j]));
    for (const r of f.felii) adauga(f.numar, { id: r.id, descriere: r.descriere, jurnal: proprii.get(r.id) ?? null, fisa: proprii.has(r.id) ? f.cale : null, adusa: false });
    for (const j of f.jurnal) {
      if (j.id.includes('↑')) {
        const tinta = Number(RE_ID.exec(j.id)?.[1]);
        if (!numere.has(tinta)) throw new EroareDocumentatie(f.cale, `felia ${j.id} e adusă din etapa ${tinta}, care nu e în PLAN.md §5.4`);
        // Aceeași felie adusă în jurnalele a două fișe: două rânduri cu același id la etapa ei (care stare e adevărată?).
        const deja = randuri.get(tinta)?.find((r) => r.id === j.id);
        if (deja) throw new EroareDocumentatie(f.cale, `felia ${j.id} e deja în jurnalul din ${deja.fisa ?? '?'}: o felie adusă are un singur rând`);
        adauga(tinta, { id: j.id, descriere: null, jurnal: j, fisa: f.cale, adusa: true });
      } else if (!f.felii.some((r) => r.id === j.id)) adauga(f.numar, { id: j.id, descriere: null, jurnal: j, fisa: f.cale, adusa: false });
    }
  }

  // Feliile aduse, după feliile proprii, în ordinea în care s-au început: jurnalul unei fișe le ține în ordinea în care au
  // fost scrise rândurile, nu a timpului. `Started` n-are anul (zz.ll hh:mm), deci ordinea e cea a zilelor din an.
  const inceput = (r: Rand): number => {
    const m = /^(\d{2})\.(\d{2})(?: (\d{2}):(\d{2}))?/.exec(r.jurnal?.started ?? '');
    return m ? ((Number(m[2]) * 31 + Number(m[1])) * 24 + Number(m[3] ?? 0)) * 60 + Number(m[4] ?? 0) : Number.POSITIVE_INFINITY;
  };
  for (const [n, l] of randuri) randuri.set(n, [...l.filter((r) => !r.adusa), ...l.filter((r) => r.adusa).sort((a, b) => inceput(a) - inceput(b))]);

  const curenta = fise.at(-1)?.numar ?? null;
  const pozCurenta = planul.findIndex((e) => e.numar === curenta);
  const etape = planul.map((e, poz): Etapa => {
    const fisa = e.numar === null ? undefined : fise.find((f) => f.numar === e.numar);
    const placa = e.numar === null ? undefined : placi.find((p) => p.numar === e.numar);
    const lista = felii(e.numar === null ? [] : randuri.get(e.numar) ?? []);
    const toateGata = lista.length > 0 && lista.every((f) => f.stare === 'gata');
    const taiata = placa?.taiata ?? null;
    let stare: Etapa['stare'];
    if (fisa) stare = toateGata && taiata !== null ? 'gata' : 'in-lucru';
    else stare = poz === pozCurenta + 1 ? 'urmatoare' : 'viitoare';
    const puncte: Punct[] = fisa || e.numar === null ? [] : (detalii.get(e.numar) ?? []).map((p) => ({
      ...p,
      felii: lista.filter((f) => f.adusa && Number(RE_ID.exec(f.id)?.[2]) === p.numar).map((f) => f.id),
    }));
    return {
      id: e.id, numar: e.numar, saptamana: e.saptamana, tinta: e.tinta, inchide: e.inchide, placa: e.placa, live: e.live,
      areLive: e.areLive, stare, curenta: e.numar !== null && e.numar === curenta, asteaptaPlaca: fisa !== undefined && toateGata && taiata === null,
      fisa: fisa?.cale ?? null, pornita: fisa?.pornita ?? null, fisaPlacii: placa?.cale ?? null, placaTaiata: taiata, felii: lista, puncte,
      prag: pragEtapei(e.inchide, prag),
    };
  });

  const owner: CerereOwner[] = fise.flatMap((f) => {
    const e = etape.find((x) => x.numar === f.numar);
    return e?.stare === 'gata' ? [] : f.owner.map((o) => ({ ...o, etapa: String(f.numar), fisa: f.cale, ancora: f.ancoraOwner }));
  });
  const adr: Record<string, AdrPeScurt> = {};
  for (const a of adrFisiere) adr[a.numar] = { cale: a.cale, titlu: a.titluScurt, stare: a.stare };

  const toate = etape.flatMap((e) => e.felii);
  const cate = (s: StareFelie): number => toate.filter((f) => f.stare === s).length;
  const adrCu = (s: StareAdr): number => adrFisiere.filter((a) => a.stare === s).length;
  return {
    schema: 1,
    limba: 'ro',
    netraduse: 0,
    etape,
    owner,
    adr,
    cifre: {
      saptamani: planul.length,
      etape: numere.size,
      tampoane: planul.length - numere.size,
      etapeGata: etape.filter((e) => e.stare === 'gata').length,
      etapaCurenta: curenta === null ? null : String(curenta),
      felii: { gata: cate('gata'), inLucru: cate('in-lucru'), deFacut: cate('de-facut'), aduse: toate.filter((f) => f.adusa && f.stare === 'gata').length },
      adr: { total: adrFisiere.length, acceptate: adrCu('acceptat'), propuse: adrCu('propus'), inlocuite: adrCu('inlocuit'), altele: adrCu('altul') },
      placi: { fise: placi.length, taiate: placi.filter((p) => p.taiata !== null).length },
    },
  };
}

// ——— Generarea ———

const textSimpluMd = (md: string): string => textSimplu(parseazaInline(md));

/** Fișierele generate, din arborele de la `radacina`: căile din `dist/`, în ordine, cu conținutul lor. */
export function genereazaDocumentatia(radacina: string): Map<string, string> {
  const citeste = (cale: string): string => readFileSync(join(radacina, cale), 'utf8').replace(/\r\n?/g, '\n');
  const md = (dir: string): string[] => readdirSync(join(radacina, dir)).filter((f) => f.endsWith('.md')).sort();

  const fise: { cale: string; text: string }[] = [];
  const placi: { cale: string; text: string }[] = [];
  for (const f of md('docs/etape')) {
    const cale = `docs/etape/${f}`;
    if (/^etapa-\d{2}\.md$/.test(f)) fise.push({ cale, text: citeste(cale) });
    else if (/^placa-\d{2}\.md$/.test(f)) placi.push({ cale, text: citeste(cale) });
    else throw new EroareDocumentatie(cale, 'în docs/etape/ stau doar fișele etapelor (etapa-NN.md) și ale plăcilor (placa-NN.md)');
  }
  const adr: { cale: string; text: string }[] = [];
  for (const f of md('docs/adr')) {
    if (f === 'README.md') continue;
    const cale = `docs/adr/${f}`;
    if (!/^\d{4}-[a-z0-9-]+\.md$/.test(f)) throw new EroareDocumentatie(cale, 'un ADR se numește NNNN-cuvinte-cu-cratima.md');
    adr.push({ cale, text: citeste(cale) });
  }
  const plan = citeste('PLAN.md');
  const indexAdr = citeste(INDEX_ADR);
  const roadmap = construiesteRoadmap({ plan, acoperire: citeste(ACOPERIRE), fise, placi, indexAdr, adr });
  // Roadmap-ul în engleză (ADR 0056): din dicționarul din repo; un text fără traducere rămâne în română (numărat).
  const caleDictionar = join(radacina, CALE_DICTIONAR_EN);
  const dictionar = existsSync(caleDictionar) ? citesteDictionar(readFileSync(caleDictionar, 'utf8')) : null;
  if (existsSync(caleDictionar) && !dictionar) throw new EroareDocumentatie(CALE_DICTIONAR_EN, 'dicționarul nu are forma { schema: 1, texte: { amprentă: { ro, en } } }');
  const roadmapEn = traduceRoadmap(roadmap, dictionar, primaPropozitie).roadmap;

  const documente: DocumentCatalog[] = [];
  const texte = new Map<string, string>();
  const pune = (cale: string, categorie: Categorie, text: string, eticheta?: string, a?: Adr): void => {
    const titlu = primulTitlu(text);
    texte.set(cale, text);
    documente.push({
      cale, categorie, titlu, eticheta: eticheta ?? textSimpluMd(titlu), adr: a?.numar ?? null, stare: a?.stare ?? null,
      octeti: Buffer.byteLength(text, 'utf8'),
    });
  };
  pune('CLAUDE.md', 'stare', citeste('CLAUDE.md'));
  pune('DEVLOG.md', 'stare', citeste('DEVLOG.md'));
  pune('PLAN.md', 'plan', plan);
  for (const f of fise) pune(f.cale, 'etape', f.text);
  for (const p of placi) pune(p.cale, 'placi', p.text);
  pune(INDEX_ADR, 'adr', indexAdr);
  for (const a of adr) {
    const x = citesteAdr(a.cale, a.text);
    pune(a.cale, 'adr', a.text, `${x.numar} · ${textSimpluMd(x.titluScurt)}`, x);
  }
  const catalog: Catalog = { schema: 1, documente };
  // Manualul utilizatorului (ADR 0058): aceeași generare, aceeași poartă (o sursă care nu se poate citi oprește build-ul).
  let manual: Map<string, string>;
  try {
    // Și testul pas cu pas al owner-ului (ADR 0072), din `docs/tutorial/`, cu poarta lui.
    manual = new Map([...genereazaManualul(citeste), ...genereazaTutorialele(citeste)]);
  } catch (e) {
    if (e instanceof EroareManual || e instanceof EroareTutorial) throw new EroareDocumentatie(e.cale, e.message.slice(e.cale.length + 2));
    throw e;
  }

  const out: [string, string][] = [
    ...manual,
    // Dicționarul codurilor controlerului (ADR 0085): date pentru panoul mașinii, în precache, ca manualul.
    ...genereazaCodurile(),
    [FISIER_ROADMAP, JSON.stringify(roadmap)],
    [FISIER_ROADMAP_EN, JSON.stringify(roadmapEn)],
    [FISIER_CATALOG, JSON.stringify(catalog)],
    ...[...texte].map(([cale, text]): [string, string] => [fisierDocument(cale), text]),
  ];
  return new Map(out.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
