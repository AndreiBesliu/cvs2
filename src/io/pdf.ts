/**
 * Ușa PDF și AI (ADR 0104): octeții unui PDF (sau ai unui fișier Illustrator compatibil PDF, de la versiunea 9) → căile
 * unei pagini, închise sau deschise, în mm, cu Y în sus, față de colțul stânga-jos al paginii afișate (CropBox-ul, cu
 * UserUnit și cu rotirea paginii aplicate, ca la afișare), fiecare cu stratul ei (OCG), plus raportul. Cititorul obiectelor
 * e propriu (`pdfObiecte.ts`); interpretarea fluxului de conținut ține starea grafică (q / Q, cm), construiește căile (m, l,
 * c, v, y, h, re), le pictează (S, s, f, F, f*, B, B*, b, b*, n), sare decupajele (W, W*), textul (BT … ET), imaginile (Do,
 * BI … EI) și umbririle (sh), coboară în Form XObject-uri (Do, cu matricea lor) și respectă straturile oprite (BDC /OC …
 * EMC, /OC pe XObject). Liniile și cubicele trec exact prin matrice; o umplere `nonzero` se normalizează ca la SVG.
 */
import { LINIE, type Punct, type Varf } from '../geom/contur.ts';
import { aplica, compune, determinant, IDENTITATE, type Matrice } from '../geom/matrice.ts';
import { PLAFON } from '../model/document.ts';
import { incheieSubcalea, normalizeazaForma, preaDeparte, type CaleCitita } from './caleImport.ts';
import { CODURI_AVERTISMENT_PDF, PAGINI_MAXIME, type AvertismentePdf, type CodAvertismentPdf, type CodRefuzPdf } from './pdfCoduri.ts';
import {
  Cititor, Cuvant, DocumentPdf, esteDict, Flux, Lexer, latin1, Nume, numar, numeDin, PdfPestePlafon, PdfStricat, PLAFON_DECODARE, Ref, textPdf,
  type Dict, type Jeton, type Val,
} from './pdfObiecte.ts';
import { PLAFON_IMPORT } from './svgCoduri.ts';
import { scrieTiffSimplu } from './tiffScrie.ts';

export { CODURI_AVERTISMENT_PDF, type AvertismentePdf, type CodAvertismentPdf, type CodRefuzPdf } from './pdfCoduri.ts';

/** O cale a paginii, în mm. O cale deschisă are vârfurile plus punctul final (n vârfuri, n − 1 segmente). */
export type CalePdf = { readonly varfuri: readonly Varf[]; readonly inchis: boolean; readonly strat: string | null };

export type RezultatPdf =
  | {
    readonly ok: true;
    readonly cai: readonly CalePdf[];
    /** Câte pagini are fișierul și care s-a citit (de la 1). */
    readonly pagini: number;
    readonly pagina: number;
    /** Pagina afișată, în mm (cu rotirea ei). */
    readonly marime: { readonly latime: number; readonly inaltime: number };
    /** Straturile căilor importate, în ordinea în care apar. */
    readonly straturi: readonly string[];
    /** Versiunea din antet (de exemplu „1.7”). */
    readonly versiune: string;
    readonly avertismente: AvertismentePdf;
    /** Imaginile vizibile ale paginii (ADR 0270): o pagină scanată are una, cât ea, iar dialogul oferă trasarea ei. */
    readonly imagini: number;
  }
  | {
    readonly ok: false;
    readonly cod: CodRefuzPdf | 'octeti' | 'gol' | 'departe' | 'plafon';
    readonly detaliu?: string;
    readonly pagini?: number;
    readonly avertismente?: AvertismentePdf;
    /** Imaginile vizibile ale paginii, dacă s-a ajuns la interpretarea ei (o pagină „goală” de vectori poate fi o scanare). */
    readonly imagini?: number;
  };

type RefuzPdf = Extract<RezultatPdf, { ok: false }>;

/** `pagina`: pagina de citit, de la 1 (implicit prima). */
export type OptiuniPdf = { readonly pagina?: number };

type Numaratoare = Record<CodAvertismentPdf, number>;

/** Form XObject-urile imbricate: mai adânc, se sar (și unul care se cheamă pe el însuși se oprește aici). */
const ADANCIME_FORME = 16;
const MM_PE_PT = 25.4 / 72;

/* ── Antetul ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Versiunea din `%PDF-x.y` (în primii 1024 de octeți, ca la cititoarele obișnuite), sau refuzul. PostScript-ul (un EPS, un
 * AI de dinainte de Illustrator 9) nu ajunge aici din dialog: îl citește ușa EPS, aleasă după antet (ADR 0115 §1).
 */
function antet(b: Uint8Array): string | 'nu-e-pdf' {
  const m = /%PDF-(\d+\.\d+)/.exec(latin1(b.subarray(0, 1024)));
  return m ? (m[1] as string) : 'nu-e-pdf';
}

/* ── Paginile ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Pagina = { readonly dict: Dict; readonly resurse: Dict; readonly mediaBox: Val; readonly cropBox: Val; readonly rotire: number };

/** Paginile, în ordine, cu atributele moștenite din nodurile arborelui (§7.7.3.4); ciclurile și nodurile prea multe se opresc. */
async function pagini(doc: DocumentPdf, catalog: Dict): Promise<Pagina[]> {
  const rez: Pagina[] = [];
  const vazute = new Set<number>();
  type Nod = { readonly ref: Val; readonly resurse: Val; readonly mediaBox: Val; readonly cropBox: Val; readonly rotire: Val };
  const stiva: Nod[] = [{ ref: catalog.get('Pages') ?? null, resurse: null, mediaBox: null, cropBox: null, rotire: null }];
  while (stiva.length > 0 && rez.length < PAGINI_MAXIME) {
    const x = stiva.pop() as Nod;
    if (x.ref instanceof Ref) {
      if (vazute.has(x.ref.n)) continue;
      vazute.add(x.ref.n);
    }
    const d = await doc.rezolva(x.ref);
    if (!esteDict(d)) continue;
    const mostenit = (k: string, v: Val): Val => (d.has(k) ? (d.get(k) ?? null) : v);
    const nod: Nod = {
      ref: x.ref, resurse: mostenit('Resources', x.resurse), mediaBox: mostenit('MediaBox', x.mediaBox),
      cropBox: mostenit('CropBox', x.cropBox), rotire: mostenit('Rotate', x.rotire),
    };
    const kids = await doc.rezolva(d.get('Kids'));
    if (numeDin(d.get('Type')) === 'Pages' || (Array.isArray(kids) && numeDin(d.get('Type')) !== 'Page')) {
      if (!Array.isArray(kids)) continue;
      for (let k = kids.length - 1; k >= 0; k--) stiva.push({ ...nod, ref: kids[k] ?? null });
      continue;
    }
    const resurse = await doc.rezolva(nod.resurse);
    rez.push({
      dict: d, resurse: esteDict(resurse) ? resurse : new Map(), mediaBox: await doc.rezolva(nod.mediaBox),
      cropBox: await doc.rezolva(nod.cropBox), rotire: numar(await doc.rezolva(nod.rotire), 0),
    });
  }
  return rez;
}

/** Un dreptunghi PDF [x0 y0 x1 y1], cu colțurile în orice ordine, sau null. */
function dreptunghi(v: Val): [number, number, number, number] | null {
  if (!Array.isArray(v) || v.length < 4) return null;
  const [a, b, c, d] = v.map((x) => numar(x, Number.NaN)) as [number, number, number, number];
  if (![a, b, c, d].every(Number.isFinite)) return null;
  return [Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)];
}

/**
 * Harta paginii (ADR 0104 §4): din unitățile paginii în mm, față de colțul stânga-jos al CropBox-ului (intersectat cu
 * MediaBox-ul), cu UserUnit, apoi rotirea la afișare (/Rotate, în sensul acelor: 90 duce (x, y) în (y, L − x)).
 */
function hartaPaginii(p: Pagina): { readonly m: Matrice; readonly latime: number; readonly inaltime: number } {
  const media = dreptunghi(p.mediaBox) ?? [0, 0, 612, 792];
  const crop = dreptunghi(p.cropBox) ?? media;
  const x0 = Math.max(media[0], crop[0]), y0 = Math.max(media[1], crop[1]);
  const x1 = Math.min(media[2], crop[2]), y1 = Math.min(media[3], crop[3]);
  const [cx0, cy0, cx1, cy1] = x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : media;
  const unitate = numar(p.dict.get('UserUnit'), 1);
  const k = (unitate > 0 ? unitate : 1) * MM_PE_PT;
  const L = (cx1 - cx0) * k, H = (cy1 - cy0) * k;
  const baza: Matrice = { a: k, b: 0, c: 0, d: k, e: -k * cx0, f: -k * cy0 };
  const r = ((Math.round(p.rotire / 90) % 4) + 4) % 4;
  const rot: Matrice = r === 1 ? { a: 0, b: -1, c: 1, d: 0, e: 0, f: L }
    : r === 2 ? { a: -1, b: 0, c: 0, d: -1, e: L, f: H }
      : r === 3 ? { a: 0, b: 1, c: -1, d: 0, e: H, f: 0 }
        : IDENTITATE;
  return { m: compune(rot, baza), latime: r % 2 === 1 ? H : L, inaltime: r % 2 === 1 ? L : H };
}

/* ── Straturile (Optional Content) ─────────────────────────────────────────────────────────────────────────────────── */

type Straturi = { readonly oprite: ReadonlySet<number>; readonly nume: ReadonlyMap<number, string> };

/** Straturile oprite în configurația implicită (/OCProperties /D: /BaseState, /ON, /OFF) și numele fiecăruia. */
async function straturi(doc: DocumentPdf, catalog: Dict): Promise<Straturi> {
  const oprite = new Set<number>(), nume = new Map<number, string>();
  const p = await doc.rezolva(catalog.get('OCProperties'));
  if (!esteDict(p)) return { oprite, nume };
  const toate = await doc.rezolva(p.get('OCGs'));
  const refuri = Array.isArray(toate) ? toate.filter((x): x is Ref => x instanceof Ref) : [];
  for (const r of refuri) {
    const g = await doc.rezolva(r);
    if (esteDict(g)) nume.set(r.n, textPdf(g.get('Name') ?? null) ?? '');
  }
  const d = await doc.rezolva(p.get('D'));
  if (!esteDict(d)) return { oprite, nume };
  if (numeDin(d.get('BaseState')) === 'OFF') for (const r of refuri) oprite.add(r.n);
  const pornite = await doc.rezolva(d.get('ON'));
  if (Array.isArray(pornite)) for (const r of pornite) if (r instanceof Ref) oprite.delete(r.n);
  const opr = await doc.rezolva(d.get('OFF'));
  if (Array.isArray(opr)) for (const r of opr) if (r instanceof Ref) oprite.add(r.n);
  return { oprite, nume };
}

/** Un grup sau un dicționar de apartenență (OCMD) e vizibil? Plus numele stratului lui (primul grup, la OCMD). */
async function vizibilitate(doc: DocumentPdf, s: Straturi, v: Val): Promise<{ readonly vizibil: boolean; readonly strat: string | null }> {
  if (!(v instanceof Ref)) {
    const d = await doc.rezolva(v);
    if (!esteDict(d)) return { vizibil: true, strat: null };
    return ocmd(doc, s, d);
  }
  const d = await doc.rezolva(v);
  if (esteDict(d) && numeDin(d.get('Type')) === 'OCMD') return ocmd(doc, s, d);
  return { vizibil: !s.oprite.has(v.n), strat: s.nume.get(v.n) ?? (esteDict(d) ? textPdf(d.get('Name') ?? null) : null) };
}

async function ocmd(doc: DocumentPdf, s: Straturi, d: Dict): Promise<{ readonly vizibil: boolean; readonly strat: string | null }> {
  if (numeDin(d.get('Type')) !== 'OCMD') return { vizibil: true, strat: textPdf(d.get('Name') ?? null) };
  const g = await doc.rezolva(d.get('OCGs'));
  const grupuri = (Array.isArray(g) ? g : [d.get('OCGs') ?? null]).filter((x): x is Ref => x instanceof Ref);
  if (grupuri.length === 0) return { vizibil: true, strat: null };
  const pornite = grupuri.map((r) => !s.oprite.has(r.n));
  const politica = numeDin(d.get('P')) ?? 'AnyOn';
  const vizibil = politica === 'AllOn' ? pornite.every(Boolean)
    : politica === 'AnyOff' ? pornite.some((x) => !x)
      : politica === 'AllOff' ? pornite.every((x) => !x)
        : pornite.some(Boolean);
  return { vizibil, strat: s.nume.get((grupuri[0] as Ref).n) ?? null };
}

/* ── Conținutul ────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Subcale = { readonly start: Punct; cur: Punct; readonly varfuri: Varf[]; desenate: number; autor: boolean };

/** O cale pictată: subcăile ei citite (închise sau deschise, în ordine), regula de umplere și stratul. */
type FormaPdf = { readonly cai: readonly CaleCitita[]; readonly nonzero: boolean; readonly strat: string | null };

/** O imagine XObject desenată pe pagină (ADR 0270): fluxul ei și harta pătratului unitate în mm-ii paginii afișate. */
type ImagineAsezata = { readonly flux: Flux; readonly D: Matrice };

/** Ce iese din interpretare: formele pictate, imaginile vizibile și numărătorile. */
type Lucru = {
  readonly doc: DocumentPdf;
  readonly straturi: Straturi;
  readonly n: Numaratoare;
  readonly forme: FormaPdf[];
  readonly imagini: ImagineAsezata[];
  varfuri: number;
};

/** Stiva conținutului marcat: fiecare BDC / BMC pune vizibilitatea și stratul lui; ascuns dacă unul de deasupra e oprit. */
type Marcat = { readonly vizibil: boolean; readonly strat: string | null };

/** Vârfurile produse de toată citirea trec de plafon (`PLAFON_IMPORT.varfuriLucru`): citirea se oprește. */
class PestePlafon extends Error {}

/**
 * Interpretează un flux de conținut (al paginii sau al unui Form XObject), cu `pagina` = harta în mm a paginii și `ctm0` =
 * matricea lui de start (a formei, compusă cu cea a apelantului). `forme`: XObject-urile de pe drum (cicluri), adâncimea.
 */
async function interpreteaza(
  w: Lucru, continut: Uint8Array, resurse: Dict, pagina: Matrice, ctm0: Matrice, marcat0: readonly Marcat[], forme: ReadonlySet<number>,
): Promise<void> {
  const doc = w.doc, n = w.n;
  const stiva: Matrice[] = [];
  let ctm = ctm0;
  let D = compune(pagina, ctm);
  const marcat: Marcat[] = [...marcat0];
  const ascuns = (): boolean => marcat.some((x) => !x.vizibil);
  const strat = (): string | null => {
    for (let i = marcat.length - 1; i >= 0; i--) {
      const s = (marcat[i] as Marcat).strat;
      if (s !== null) return s;
    }
    return null;
  };
  let subcai: Subcale[] = [];
  let curenta: Subcale | null = null;
  let decupaj = false;
  let inText = false;
  const operanzi: Val[] = [];
  const c = new Cititor(new Lexer(continut), false);
  const nr = (k: number): number => numar(operanzi[operanzi.length - k], 0);
  const pct = (x: number, y: number): Punct => aplica(D, { x, y });
  const muta = (p: Punct): void => {
    curenta = { start: p, cur: p, varfuri: [], desenate: 0, autor: false };
    subcai.push(curenta);
  };
  const segment = (s: Varf['s'], capat: Punct): void => {
    if (!curenta) muta(capat);
    const sc = curenta as Subcale;
    sc.desenate++;
    if (s.tip === 'L' && capat.x === sc.cur.x && capat.y === sc.cur.y) return;
    if (s.tip === 'C' && [s.c1, s.c2, capat].every((q) => q.x === sc.cur.x && q.y === sc.cur.y)) return;
    sc.varfuri.push({ p: sc.cur, s });
    sc.cur = capat;
    if (++w.varfuri > PLAFON_IMPORT.varfuriLucru) throw new PestePlafon();
  };
  const inchide = (): void => {
    if (!curenta) return;
    curenta.autor = true;
    // După h, punctul curent e startul: un segment nou pornește o subcale nouă de acolo.
    const start = curenta.start;
    curenta = null;
    subcai.push({ start, cur: start, varfuri: [], desenate: 0, autor: false });
    curenta = subcai[subcai.length - 1] as Subcale;
  };
  const picteaza = (umplut: boolean, parImpar: boolean): void => {
    const toate = subcai.filter((s) => s.desenate > 0);
    subcai = [];
    curenta = null;
    if (decupaj) n.decupaje++;
    decupaj = false;
    if (toate.length === 0) return;
    if (ascuns()) {
      n.ascunse++;
      return;
    }
    const cai: CaleCitita[] = [];
    for (const sc of toate) {
      const r = incheieSubcalea(sc.varfuri, sc.cur, sc.start, sc.autor, umplut);
      if (r === 'prea-mare') { n['prea-mari']++; continue; }
      if (r === 'degenerata') { n.degenerate++; continue; }
      if (r === 'praf') { n['sub-rezolutie']++; continue; }
      if (r.inchidere === 'umplere') n['inchise-de-umplere']++;
      else if (r.inchidere === 'usa') n['inchise-la-usa']++;
      cai.push(r.cale);
    }
    // Regula de umplere: nonzero (f, F, B, b) se normalizează după citire (ADR 0036), ca la ușa SVG; par-impar (f*, B*, b*)
    // și conturul tras rămân cum sunt.
    if (cai.length > 0) w.forme.push({ cai, nonzero: umplut && !parImpar, strat: strat() });
  };
  const xobject = async (nume: string): Promise<void> => {
    const xo = await doc.rezolva(resurse.get('XObject'));
    if (!esteDict(xo)) return;
    const ref = xo.get(nume) ?? null;
    const f = await doc.rezolva(ref);
    if (!(f instanceof Flux)) return;
    const sub = numeDin(f.dict.get('Subtype'));
    if (sub !== 'Form' && sub !== 'Image') return;
    if (ascuns()) {
      n.ascunse++;
      return;
    }
    if (f.dict.has('OC')) {
      const v = await vizibilitate(doc, w.straturi, f.dict.get('OC') ?? null);
      if (!v.vizibil) {
        n.ascunse++;
        return;
      }
    }
    // O imagine se sare la vectori, dar se ține minte unde e: imaginea paginii (ADR 0270) e cea mai mare dintre ele.
    if (sub === 'Image') {
      n['sarit-imagine']++;
      w.imagini.push({ flux: f, D });
      return;
    }
    const id = ref instanceof Ref ? ref.n : -1;
    if (forme.size >= ADANCIME_FORME || forme.has(id)) {
      n['forme-adanci']++;
      return;
    }
    let date: Uint8Array;
    try {
      date = await doc.decodeaza(f);
    } catch (e) {
      if (e instanceof PdfPestePlafon) throw e;
      n['fluxuri-stricate']++;
      return;
    }
    const m = f.dict.get('Matrix');
    const fm: Matrice = Array.isArray(m) && m.length >= 6
      ? { a: numar(m[0], 1), b: numar(m[1], 0), c: numar(m[2], 0), d: numar(m[3], 1), e: numar(m[4], 0), f: numar(m[5], 0) }
      : IDENTITATE;
    const r = await doc.rezolva(f.dict.get('Resources'));
    await interpreteaza(w, date, esteDict(r) ? r : resurse, pagina, compune(ctm, fm), marcat, new Set([...forme, id]));
  };
  const marcheaza = async (eticheta: string, props: Val): Promise<void> => {
    if (eticheta !== 'OC') {
      marcat.push({ vizibil: true, strat: null });
      return;
    }
    let p: Val = props;
    if (props instanceof Nume) {
      const pr = await doc.rezolva(resurse.get('Properties'));
      p = esteDict(pr) ? (pr.get(props.v) ?? null) : null;
    }
    marcat.push(await vizibilitate(doc, w.straturi, p));
  };

  for (let t: Jeton = c.jeton(); t !== null; t = c.jeton()) {
    if (!(t instanceof Cuvant)) {
      const v = c.valoare(t);
      if (!(v instanceof Cuvant) && typeof v !== 'string') operanzi.push(v);
      continue;
    }
    const op = t.v;
    if (inText) {
      if (op === 'ET') inText = false;
      operanzi.length = 0;
      continue;
    }
    switch (op) {
      case 'q': stiva.push(ctm); break;
      case 'Q': {
        const m = stiva.pop();
        if (m) {
          ctm = m;
          D = compune(pagina, ctm);
        }
        break;
      }
      case 'cm':
        if (operanzi.length >= 6) {
          ctm = compune(ctm, { a: nr(6), b: nr(5), c: nr(4), d: nr(3), e: nr(2), f: nr(1) });
          D = compune(pagina, ctm);
        }
        break;
      case 'm': if (operanzi.length >= 2) muta(pct(nr(2), nr(1))); break;
      case 'l': if (operanzi.length >= 2) segment(LINIE, pct(nr(2), nr(1))); break;
      case 'c':
        if (operanzi.length >= 6) segment({ tip: 'C', c1: pct(nr(6), nr(5)), c2: pct(nr(4), nr(3)) }, pct(nr(2), nr(1)));
        break;
      case 'v':
        if (operanzi.length >= 4 && curenta) segment({ tip: 'C', c1: (curenta as Subcale).cur, c2: pct(nr(4), nr(3)) }, pct(nr(2), nr(1)));
        break;
      case 'y':
        if (operanzi.length >= 4) {
          const capat = pct(nr(2), nr(1));
          segment({ tip: 'C', c1: pct(nr(4), nr(3)), c2: capat }, capat);
        }
        break;
      case 'h': inchide(); break;
      case 're':
        if (operanzi.length >= 4) {
          const x = nr(4), y = nr(3), l = nr(2), h = nr(1);
          muta(pct(x, y));
          segment(LINIE, pct(x + l, y));
          segment(LINIE, pct(x + l, y + h));
          segment(LINIE, pct(x, y + h));
          inchide();
        }
        break;
      case 'S': picteaza(false, false); break;
      case 's': inchide(); picteaza(false, false); break;
      case 'f': case 'F': case 'B': picteaza(true, false); break;
      case 'f*': case 'B*': picteaza(true, true); break;
      case 'b': inchide(); picteaza(true, false); break;
      case 'b*': inchide(); picteaza(true, true); break;
      case 'n': {
        const aveaCale = subcai.some((s) => s.desenate > 0);
        const eraDecupaj = decupaj;
        subcai = [];
        curenta = null;
        decupaj = false;
        if (eraDecupaj) n.decupaje++;
        else if (aveaCale) n.nepictate++;
        break;
      }
      case 'W': case 'W*': decupaj = true; break;
      case 'BT':
        if (!ascuns()) n['sarit-text']++;
        inText = true;
        break;
      case 'Do': {
        const nume = operanzi[operanzi.length - 1];
        if (nume instanceof Nume) await xobject(nume.v);
        break;
      }
      case 'BI':
        sareImagineaInline(c);
        if (!ascuns()) n['sarit-imagine']++;
        break;
      case 'sh': if (!ascuns()) n['sarit-umbrire']++; break;
      case 'BMC': marcat.push({ vizibil: true, strat: null }); break;
      case 'BDC': {
        const eticheta = operanzi[operanzi.length - 2];
        await marcheaza(eticheta instanceof Nume ? eticheta.v : '', operanzi[operanzi.length - 1] ?? null);
        break;
      }
      case 'EMC': if (marcat.length > marcat0.length) marcat.pop(); break;
      default: break;
    }
    operanzi.length = 0;
  }
}

/**
 * O imagine inline (BI … ID date EI), sărită întreagă: fără filtru, lungimea datelor din /W, /H, /BPC și culori (datele
 * pot conține „EI”); cu filtru, până la primul „EI” între spații albe.
 */
function sareImagineaInline(c: Cititor): void {
  const d = new Map<string, Val>();
  for (;;) {
    const k = c.jeton();
    if (k === null) return;
    if (k instanceof Cuvant && k.v === 'ID') break;
    if (!(k instanceof Nume)) continue;
    const v = c.valoare();
    if (v instanceof Cuvant) {
      if (v.v === 'ID') break;
      continue;
    }
    if (typeof v !== 'string') d.set(k.v, v);
  }
  const lex = c.lex, b = lex.b;
  // Un singur alb după ID, apoi datele.
  lex.pos++;
  const filtru = d.get('F') ?? d.get('Filter');
  const latime = numar(d.get('W') ?? d.get('Width'), 0), inaltime = numar(d.get('H') ?? d.get('Height'), 0);
  const masca = d.get('IM') === true || d.get('ImageMask') === true;
  const bpc = masca ? 1 : numar(d.get('BPC') ?? d.get('BitsPerComponent'), 8);
  const cs = d.get('CS') ?? d.get('ColorSpace');
  const csNume = numeDin(cs);
  const culori = masca ? 1 : csNume === 'RGB' || csNume === 'DeviceRGB' ? 3 : csNume === 'CMYK' || csNume === 'DeviceCMYK' ? 4 : 1;
  const alb = (x: number | undefined): boolean => x === undefined || x === 0 || x === 9 || x === 10 || x === 12 || x === 13 || x === 32;
  if ((filtru === undefined || filtru === null) && latime > 0 && inaltime > 0) {
    const lungime = inaltime * Math.ceil((latime * bpc * culori) / 8);
    let p = lex.pos + lungime;
    while (p < b.length && alb(b[p])) p++;
    if (b[p] === 0x45 && b[p + 1] === 0x49 && alb(b[p + 2])) {
      lex.pos = p + 2;
      return;
    }
  }
  for (let p = lex.pos; p + 1 < b.length; p++) {
    if (b[p] === 0x45 && b[p + 1] === 0x49 && alb(b[p - 1]) && alb(b[p + 2])) {
      lex.pos = p + 2;
      return;
    }
  }
  lex.pos = b.length;
}

/* ── Ușa ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const numaratoareGoala = (): Numaratoare => Object.fromEntries(CODURI_AVERTISMENT_PDF.map((k) => [k, 0])) as Numaratoare;

/** Conținutul paginii: fluxul sau tablourile de fluxuri, decodate și lipite cu un alb între ele (§7.8.2). */
async function continutPagina(doc: DocumentPdf, p: Pagina, n: Numaratoare): Promise<Uint8Array> {
  const c = await doc.rezolva(p.dict.get('Contents'));
  const lista = Array.isArray(c) ? c : [c];
  const bucati: Uint8Array[] = [];
  for (const x of lista) {
    const f = await doc.rezolva(x);
    if (!(f instanceof Flux)) continue;
    try {
      bucati.push(await doc.decodeaza(f));
    } catch (e) {
      if (e instanceof PdfPestePlafon) throw e;
      n['fluxuri-stricate']++;
    }
  }
  const total = bucati.reduce((s, x) => s + x.length + 1, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const x of bucati) {
    out.set(x, pos);
    pos += x.length;
    out[pos++] = 10;
  }
  return out;
}

/** Pagina interpretată: documentul, formele și imaginile ei, harta și numerele paginii. */
type PaginaCitita = {
  readonly ok: true; readonly doc: DocumentPdf; readonly w: Lucru; readonly harta: ReturnType<typeof hartaPaginii>;
  readonly pagini: number; readonly pagina: number; readonly versiune: string;
};

/**
 * Deschide fișierul și interpretează pagina `optiuni.pagina` (de la 1), cu numărătorile în `n`; sau refuzul, cu numărul
 * paginilor de îndată ce lista lor e citită (dialogul oferă alta).
 */
async function paginaInterpretata(octeti: Uint8Array, optiuni: OptiuniPdf, n: Numaratoare): Promise<PaginaCitita | RefuzPdf> {
  if (octeti.length > PLAFON_IMPORT.octeti) return { ok: false, cod: 'octeti', detaliu: String(octeti.length) };
  const versiune = antet(octeti);
  if (versiune === 'nu-e-pdf') return { ok: false, cod: versiune };
  let doc: DocumentPdf;
  try {
    doc = await DocumentPdf.deschide(octeti);
  } catch (e) {
    if (e instanceof PdfPestePlafon) return { ok: false, cod: 'plafon', detaliu: 'decodare' };
    // Un fișier criptat cu obiectele în fluxuri de obiecte nu se poate citi deloc: refuzul spune de ce.
    if (latin1(octeti).includes('/Encrypt')) return { ok: false, cod: 'criptat' };
    return { ok: false, cod: 'pdf', detaliu: e instanceof Error ? e.message : String(e) };
  }
  if (doc.trailer.has('Encrypt')) return { ok: false, cod: 'criptat' };
  // Câte pagini are fișierul, de îndată ce lista lor e citită: orice refuz de acolo încolo îl spune (dialogul oferă alta).
  let pag: { pagini?: number } = {};
  try {
    const catalog = await doc.rezolva(doc.trailer.get('Root'));
    if (!esteDict(catalog)) return { ok: false, cod: 'pdf', detaliu: '/Root' };
    const lista = await pagini(doc, catalog);
    if (lista.length === 0) return { ok: false, cod: 'pdf', detaliu: 'nicio pagină' };
    pag = { pagini: lista.length };
    const nr = optiuni.pagina ?? 1;
    const p = lista[nr - 1];
    if (!p || !Number.isInteger(nr)) return { ok: false, cod: 'pagina', ...pag };
    const harta = hartaPaginii(p);
    const w: Lucru = { doc, straturi: await straturi(doc, catalog), n, forme: [], imagini: [], varfuri: 0 };
    const continut = await continutPagina(doc, p, n);
    try {
      await interpreteaza(w, continut, p.resurse, harta.m, IDENTITATE, [], new Set());
    } catch (e) {
      if (e instanceof PestePlafon) return { ok: false, cod: 'plafon', detaliu: 'varfuri', ...pag, avertismente: n };
      throw e;
    }
    if (doc.reconstruit) n['xref-reconstruit'] = 1;
    n['fluxuri-stricate'] += doc.fluxuriStricate;
    return { ok: true, doc, w, harta, pagini: lista.length, pagina: nr, versiune };
  } catch (e) {
    if (e instanceof PdfPestePlafon) return { ok: false, cod: 'plafon', detaliu: 'decodare', ...pag, avertismente: n };
    if (e instanceof PdfStricat) return { ok: false, cod: 'pdf', detaliu: e.message, ...pag, avertismente: n };
    throw e;
  }
}

/**
 * Citește pagina `optiuni.pagina` (de la 1) a unui PDF sau AI (ADR 0104), cu numărul imaginilor ei (ADR 0270). Nu aruncă:
 * orice eroare a fișierului e un refuz cu cod sau un avertisment numărat.
 */
export async function citestePdf(octeti: Uint8Array, optiuni: OptiuniPdf = {}): Promise<RezultatPdf> {
  const n = numaratoareGoala();
  const p = await paginaInterpretata(octeti, optiuni, n);
  if (!p.ok) return p;
  const { w, harta } = p, rest = { pagini: p.pagini, avertismente: n, imagini: w.imagini.length };
  // Ca la ușa SVG: plafonul pe intrare (un fișier refuzat oricum nu mai plătește normalizarea), apoi fiecare formă nonzero
  // prin aranjamentul exact, cu bugetul întregului fișier, apoi plafonul pe ieșire și marginile.
  const intrare = w.forme.reduce((s, f) => s + f.cai.reduce((t, c) => t + c.varfuri.length, 0), 0);
  if (intrare > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(intrare), ...rest };
  const buget = { ramas: PLAFON_IMPORT.normalizare };
  const cai: CalePdf[] = [];
  for (const f of w.forme) {
    for (const c of normalizeazaForma(f.cai, f.nonzero, buget, n)) {
      if (!c.inchis) n.deschise++;
      cai.push({ varfuri: c.varfuri, inchis: c.inchis, strat: f.strat });
    }
  }
  const primite = cai.reduce((s, c) => s + c.varfuri.length, 0);
  if (primite > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(primite), ...rest };
  if (preaDeparte(cai)) return { ok: false, cod: 'departe', ...rest };
  if (cai.length === 0) return { ok: false, cod: 'gol', ...rest };
  const straturiFolosite = [...new Set(cai.map((c) => c.strat).filter((s): s is string => s !== null))];
  return {
    ok: true, cai, pagina: p.pagina, marime: { latime: harta.latime, inaltime: harta.inaltime }, straturi: straturiFolosite,
    versiune: p.versiune, ...rest,
  };
}

/* ── Imaginea paginii (ADR 0270) ───────────────────────────────────────────────────────────────────────────────────── */

/** Imaginea unei pagini scanate, ca fișier pentru workerul trasării, cu așezarea ei; sau refuzul. */
export type ImaginePdf =
  | {
    readonly ok: true;
    /** JPEG-ul cum e (fără orientarea Exif), sau un TIFF de o pagină: fluxul CCITT împachetat, ori eșantioanele. */
    readonly fisier: { readonly tip: 'jpeg' | 'tiff'; readonly octeti: Uint8Array };
    /** Eșantioanele, ca în fișier (înaintea orientării). */
    readonly latimePx: number; readonly inaltimePx: number;
    /** Cum se întoarce imaginea ca să stea ca pe pagina afișată: 1–8, ca eticheta Orientation din TIFF și Exif. */
    readonly orientare: number;
    /** Mărimea ei pe pagina afișată (mm) și DPI-ul care rezultă pe lățimea ei. */
    readonly latimeMm: number; readonly inaltimeMm: number; readonly dpi: number;
    readonly pagini: number; readonly pagina: number;
  }
  | {
    readonly ok: false;
    /** Ale cititorului PDF, sau: pagina n-are imagine, imaginea cere ce nu se citește încă (cu numele), e stricată. */
    readonly cod: RefuzPdf['cod'] | 'fara-imagine' | 'nesprijinit' | 'stricat';
    readonly detaliu?: string;
    readonly pagini?: number;
  };

type FisierImagine =
  | { readonly ok: true; readonly tip: 'jpeg' | 'tiff'; readonly octeti: Uint8Array; readonly latime: number; readonly inaltime: number }
  | { readonly ok: false; readonly cod: 'nesprijinit' | 'stricat'; readonly detaliu: string };

/** Spațiul culorilor unei imagini: gri, RGB, CMYK sau o paletă (Indexed) peste unul dintre ele. */
type Spatiu =
  | { readonly fel: 'gri' | 'rgb' | 'cmyk' }
  | { readonly fel: 'paleta'; readonly baza: 'gri' | 'rgb' | 'cmyk'; readonly hival: number; readonly tabel: Uint8Array };

const COMPONENTE = { gri: 1, rgb: 3, cmyk: 4 } as const;
const NUME_SPATIU = { gri: 'DeviceGray', rgb: 'DeviceRGB', cmyk: 'DeviceCMYK', paleta: 'Indexed' } as const;
const BITI = [1, 2, 4, 8, 16] as const;

/** Spațiul culorilor (§8.6), sau numele celui pe care ușa nu-l citește (Separation, DeviceN, Lab, Pattern). */
async function spatiul(doc: DocumentPdf, v: Val, adanc = 0): Promise<Spatiu | string> {
  const x = await doc.rezolva(v);
  const nume = numeDin(x) ?? (Array.isArray(x) ? numeDin(x[0]) : null);
  switch (nume) {
    case 'DeviceGray': case 'G': case 'CalGray': return { fel: 'gri' };
    case 'DeviceRGB': case 'RGB': case 'CalRGB': return { fel: 'rgb' };
    case 'DeviceCMYK': case 'CMYK': return { fel: 'cmyk' };
    case 'ICCBased': {
      // Profilul nu se aplică: contează doar câte componente are (/N); fără ele, spațiul de rezervă (/Alternate).
      const s = Array.isArray(x) ? await doc.rezolva(x[1]) : null;
      const n = s instanceof Flux ? numar(await doc.rezolva(s.dict.get('N')), 0) : 0;
      if (n === 1 || n === 3 || n === 4) return { fel: n === 1 ? 'gri' : n === 3 ? 'rgb' : 'cmyk' };
      const alt = s instanceof Flux ? s.dict.get('Alternate') : undefined;
      return alt !== undefined && adanc < 4 ? spatiul(doc, alt, adanc + 1) : `ICCBased /N ${n}`;
    }
    case 'Indexed': case 'I': {
      const baza = Array.isArray(x) && adanc === 0 ? await spatiul(doc, x[1] ?? null, adanc + 1) : 'Indexed';
      if (typeof baza === 'string' || baza.fel === 'paleta') return `Indexed (${typeof baza === 'string' ? baza : 'Indexed'})`;
      const hival = numar(await doc.rezolva((x as Val[])[2]), -1);
      const t = await doc.rezolva((x as Val[])[3]);
      const tabel = t instanceof Uint8Array ? t : t instanceof Flux ? await doc.decodeaza(t) : null;
      if (!(Number.isInteger(hival) && hival >= 0 && hival <= 255) || !tabel) throw new PdfStricat('paleta (Indexed) e stricată');
      return { fel: 'paleta', baza: baza.fel, hival, tabel };
    }
    default: return nume ?? '?';
  }
}

/** ColorMap-ul TIFF al unei palete: întâi roșii, apoi verzii, apoi albaștrii, pe 16 biți, câte 2^biti; după hival, negru. */
function hartaPaletei(p: Extract<Spatiu, { fel: 'paleta' }>, biti: number): number[] {
  const n = 2 ** biti, nc = COMPONENTE[p.baza], h = new Array<number>(3 * n).fill(0);
  for (let k = 0; k <= Math.min(p.hival, n - 1); k++) {
    const v = (i: number): number => p.tabel[k * nc + i] ?? 0;
    // CMYK, ca la cititorul TIFF (ADR 0229): fiecare culoare, cu negrul ei.
    const rgb = nc === 1 ? [v(0), v(0), v(0)] : nc === 3 ? [v(0), v(1), v(2)] : [0, 1, 2].map((i) => Math.round(((255 - v(i)) * (255 - v(3))) / 255));
    rgb.forEach((c, i) => { h[i * n + k] = (c ?? 0) * 257; });
  }
  return h;
}

/**
 * Un JPEG fără segmentele APP1 Exif: un cititor PDF nu aplică orientarea din Exif (o spune așezarea pe pagină), dar
 * browserul ar aplica-o la decodare. Același tablou, dacă nu are niciunul.
 */
function faraExif(j: Uint8Array): Uint8Array {
  if (j[0] !== 0xff || j[1] !== 0xd8) return j;
  const scoase: Array<readonly [number, number]> = [];
  for (let p = 2; p + 4 <= j.length;) {
    if (j[p] !== 0xff) break;
    const m = j[p + 1] ?? 0;
    if (m === 0xff) { p++; continue; }
    // Fără lungime: RSTn și TEM; SOS începe datele comprimate, EOI e sfârșitul.
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) { p += 2; continue; }
    if (m === 0xda || m === 0xd9) break;
    const z = Math.min(j.length, p + 2 + (((j[p + 2] ?? 0) << 8) | (j[p + 3] ?? 0)));
    if (m === 0xe1 && latin1(j.subarray(p + 4, p + 10)) === 'Exif\x00\x00') scoase.push([p, z]);
    p = z;
  }
  if (scoase.length === 0) return j;
  const o = new Uint8Array(j.length - scoase.reduce((s, [a, z]) => s + z - a, 0));
  let q = 0, de = 0;
  for (const [a, z] of scoase) {
    o.set(j.subarray(de, a), q);
    q += a - de;
    de = z;
  }
  o.set(j.subarray(de), q);
  return o;
}

/**
 * Fluxul CCITT, împachetat într-un TIFF (ADR 0270 §2): G4 (K < 0) cu compresia 4, G3 cu 3 (2D dacă K > 0), iar G3 1D cu
 * rândurile pe octeți și fără EOL, cu 2. Fără BlackIs1, negrul faxului e eșantionul 0 (cerneala, la gri și la mască);
 * în TIFF-ul WhiteIsZero e 1: desenul rămâne desen dacă BlackIs1 și Decode-ul inversat sunt la fel.
 */
async function ccitt(doc: DocumentPdf, dp: Dict, date: Uint8Array, W: number, H: number, inv: boolean): Promise<FisierImagine> {
  const nr = async (k: string, implicit: number): Promise<number> => numar(await doc.rezolva(dp.get(k)), implicit);
  const da = async (k: string): Promise<boolean> => (await doc.rezolva(dp.get(k))) === true;
  const K = await nr('K', 0), coloane = await nr('Columns', 1728), aliniat = await da('EncodedByteAlign'), eol = await da('EndOfLine');
  if (coloane !== W) return { ok: false, cod: 'nesprijinit', detaliu: `CCITTFaxDecode /Columns ${coloane} ≠ /Width ${W}` };
  if (aliniat && (K < 0 || (K > 0 && !eol))) return { ok: false, cod: 'nesprijinit', detaliu: `CCITTFaxDecode /K ${K} /EncodedByteAlign true` };
  const foto = (await da('BlackIs1')) === inv ? 0 : 1;
  const compresie = K < 0 ? 4 : K === 0 && aliniat && !eol ? 2 : 3;
  return {
    ok: true, tip: 'tiff', latime: W, inaltime: H,
    octeti: scrieTiffSimplu({ latime: W, inaltime: H, biti: 1, esantioane: 1, foto, compresie, ...(compresie === 3 ? { t4: K > 0 ? 1 : 0 } : {}), date }),
  };
}

/** Fișierul imaginii pentru workerul trasării (ADR 0270 §2, §3): JPEG-ul, sau un TIFF; ori de ce nu se poate. */
async function fisierImagine(doc: DocumentPdf, f: Flux): Promise<FisierImagine> {
  const val = async (...chei: string[]): Promise<Val> => {
    for (const k of chei) if (f.dict.has(k)) return doc.rezolva(f.dict.get(k));
    return null;
  };
  const W = numar(await val('Width', 'W'), 0), H = numar(await val('Height', 'H'), 0);
  if (!(Number.isInteger(W) && Number.isInteger(H) && W > 0 && H > 0)) return { ok: false, cod: 'stricat', detaliu: `/Width ${W} /Height ${H}` };
  const masca = (await val('ImageMask', 'IM')) === true;
  const dec = await val('Decode', 'D');
  const inv = Array.isArray(dec) && dec.length >= 2 && numar(dec[0], 0) > numar(dec[1], 1);
  const { date, codec, parametri } = await doc.decodeazaImagine(f);
  if (codec === 'JBIG2Decode') return { ok: false, cod: 'nesprijinit', detaliu: 'JBIG2Decode (JBIG2)' };
  if (codec === 'JPXDecode') return { ok: false, cod: 'nesprijinit', detaliu: 'JPXDecode (JPEG 2000)' };
  // Masca n-are culori (cerneala și hârtia); o imagine fără /ColorSpace (greșit), gri.
  const cs = masca ? null : await val('ColorSpace', 'CS');
  const sp: Spatiu | string | null = masca ? null : cs === null ? { fel: 'gri' } : await spatiul(doc, cs);
  if (typeof sp === 'string') return { ok: false, cod: 'nesprijinit', detaliu: `ColorSpace ${sp}` };
  const sfel = sp === null ? null : sp.fel;
  if (codec === 'DCTDecode') {
    if (sfel === null || sfel === 'paleta') return { ok: false, cod: 'nesprijinit', detaliu: `DCTDecode cu ${sfel === null ? 'ImageMask' : 'Indexed'}` };
    return { ok: true, tip: 'jpeg', octeti: faraExif(date), latime: W, inaltime: H };
  }
  if (codec === 'CCITTFaxDecode') {
    if (sfel !== null && sfel !== 'gri') return { ok: false, cod: 'nesprijinit', detaliu: `CCITTFaxDecode cu ${NUME_SPATIU[sfel]}` };
    return ccitt(doc, parametri, date, W, H, inv);
  }
  // Eșantioanele brute (Flate, LZW, RunLength, ASCIIHex, ASCII85, cu predictorii deja desfăcuți), rând cu rând, pe octeți.
  const bpc = masca ? 1 : numar(await val('BitsPerComponent', 'BPC'), 8);
  const biti = BITI.find((b) => b === bpc && !(b === 16 && sfel === 'paleta'));
  if (biti === undefined) return { ok: false, cod: 'nesprijinit', detaliu: `BitsPerComponent ${bpc}` };
  const n = sp === null || sp.fel === 'paleta' ? 1 : COMPONENTE[sp.fel];
  const total = Math.ceil((W * n * biti) / 8) * H;
  if (total > PLAFON_DECODARE.flux) return { ok: false, cod: 'nesprijinit', detaliu: `${W} × ${H} pixeli` };
  // Gri și masca: 0 e negru (cerneala); cu Decode inversat, alb. RGB, CMYK, paleta: ca în fișier (Decode-ul lor nu se
  // aplică).
  const foto = sfel === null || sfel === 'gri' ? (inv ? 0 : 1) : sfel === 'rgb' ? 2 : sfel === 'cmyk' ? 5 : 3;
  // Datele scurte (un flux tăiat) se completează cu hârtia fiecărui fel; cele lungi se taie.
  let e = date.subarray(0, total);
  if (e.length < total) {
    const o = new Uint8Array(total).fill(foto === 1 || foto === 2 ? 0xff : 0);
    o.set(e);
    e = o;
  }
  return {
    ok: true, tip: 'tiff', latime: W, inaltime: H,
    octeti: scrieTiffSimplu({ latime: W, inaltime: H, biti, esantioane: n, foto, compresie: 1, ...(sp?.fel === 'paleta' ? { harta: hartaPaletei(sp, biti) } : {}), date: e }),
  };
}

/**
 * Orientarea unei așezări (1–8, ca la TIFF): unde ajung pe pagina afișată rândul 0 (latura v = 1 a pătratului unitate) și
 * coloana 0 (latura u = 0). Cu u orizontal, rândul 0 e sus dacă d > 0, iar coloana 0 la stânga dacă a > 0; cu u vertical,
 * rândul 0 e la dreapta dacă c > 0, iar coloana 0 sus dacă b < 0. O așezare strâmbă ia cazul cel mai apropiat.
 */
function orientare(m: Matrice): number {
  const { a, b, c, d } = m;
  if (Math.abs(a) + Math.abs(d) >= Math.abs(b) + Math.abs(c)) return d >= 0 ? (a >= 0 ? 1 : 2) : a >= 0 ? 4 : 3;
  return c >= 0 ? (b <= 0 ? 6 : 7) : b <= 0 ? 5 : 8;
}

/**
 * Imaginea paginii `optiuni.pagina` (ADR 0270 §1): cea mai mare imagine XObject vizibilă, după aria așezată, ca fișier pentru
 * workerul trasării, cu orientarea și mărimea așezării ei (§4). Nu aruncă: un fișier greșit e un refuz cu cod.
 */
export async function imagineaPaginiiPdf(octeti: Uint8Array, optiuni: OptiuniPdf = {}): Promise<ImaginePdf> {
  const p = await paginaInterpretata(octeti, optiuni, numaratoareGoala());
  if (!p.ok) return { ok: false, cod: p.cod, ...(p.detaliu !== undefined ? { detaliu: p.detaliu } : {}), ...(p.pagini !== undefined ? { pagini: p.pagini } : {}) };
  const pag = { pagini: p.pagini };
  let im: ImagineAsezata | null = null, arie = 0;
  for (const x of p.w.imagini) {
    const a = Math.abs(determinant(x.D));
    if (a > arie) { im = x; arie = a; }
  }
  if (!im) return { ok: false, cod: 'fara-imagine', ...pag };
  let f: FisierImagine;
  try {
    f = await fisierImagine(p.doc, im.flux);
  } catch (e) {
    if (e instanceof PdfPestePlafon) return { ok: false, cod: 'plafon', detaliu: 'decodare', ...pag };
    if (e instanceof PdfStricat) return { ok: false, cod: 'stricat', detaliu: e.message, ...pag };
    throw e;
  }
  if (!f.ok) return { ...f, ...pag };
  const o = orientare(im.D), t = o >= 5, lu = Math.hypot(im.D.a, im.D.b), lv = Math.hypot(im.D.c, im.D.d);
  const latimeMm = t ? lv : lu, inaltimeMm = t ? lu : lv;
  return {
    ok: true, fisier: { tip: f.tip, octeti: f.octeti }, latimePx: f.latime, inaltimePx: f.inaltime, orientare: o, latimeMm, inaltimeMm,
    dpi: ((t ? f.inaltime : f.latime) * 25.4) / latimeMm, pagini: p.pagini, pagina: p.pagina,
  };
}
