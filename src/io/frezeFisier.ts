/**
 * Fișierul bibliotecii de freze (ADR 0300 §8, felia 16.A↑a). „Exportă…” scrie JSON-ul propriu
 * (`{ format: 'cncvs2-freze', v: 1, freze: [...] }`), fără id, versiune și dată (le primește fiecare bibliotecă la import),
 * cu câmpurile necunoscute ale frezelor. „Importă…” citește același JSON sau un CSV cu coloanele din manual (`COLOANE_CSV`):
 * `nume`, `fel` și `diametru` sunt necesare, celelalte au valori implicite. Silueta desenată (16.A↑f-5) își are punctele în
 * coloana `puncte` („0 0 | 2 0 | 3 1,5 | 6 4”: perechile despărțite de „|”, r și h de spații), iar diametrul ei, lipsă, vine
 * din ultimul punct. Separatorul se găsește singur (`;`, `,`, tab);
 * virgula zecimală merge doar când separatorul nu e virgula. Codarea: UTF-8, altfel Windows-1250 (cititorul plăcuțelor).
 * Pur: primește octeții, întoarce frezele bune și câte s-au sărit.
 */
import { citesteCsv, decodeazaCsv, PLAFON_CSV, separatorGasit } from './csv.ts';
import { frezaImportata, MARGINI_FREZA, type FelFreza, type Freza, type FrezaSalvata } from '../model/freza.ts';

export const FORMAT_FREZE = 'cncvs2-freze';
export const VERSIUNE_FISIER_FREZE = 1;

/** Coloanele CSV, în ordinea din manual. */
export const COLOANE_CSV = ['nume', 'fel', 'diametru', 'unghi', 'varf', 'numar', 'turatie', 'avans', 'plonjare', 'pas', 'pas_lateral', 'tais', 'taisuri', 'nota', 'grup', 'raza', 'treapta', 'puncte'] as const;
type ColoanaCsv = (typeof COLOANE_CSV)[number];

export type MotivFisierFreze = 'gol' | 'json' | 'format' | 'versiune' | 'coloane' | 'prea-mare' | 'prea-multe';
export type CitireFreze =
  | { readonly ok: true; readonly fel: 'json' | 'csv'; readonly freze: readonly Freza[]; readonly sarite: number }
  | { readonly ok: false; readonly motiv: MotivFisierFreze };

/** Textul fișierului: frezele fără id, versiune și dată, cu restul câmpurilor (și cele necunoscute), indentat. */
export function textFisierFreze(freze: readonly FrezaSalvata[]): string {
  const curate = freze.map((f) => {
    const { id: _i, rev: _r, schimbatLa: _s, ...rest } = f;
    void _i; void _r; void _s;
    return rest;
  });
  return `${JSON.stringify({ format: FORMAT_FREZE, v: VERSIUNE_FISIER_FREZE, freze: curate }, null, 2)}\n`;
}

const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function dinJson(text: string): CitireFreze {
  let x: unknown;
  try {
    x = JSON.parse(text);
  } catch {
    return { ok: false, motiv: 'json' };
  }
  if (!obiect(x) || x['format'] !== FORMAT_FREZE || typeof x['v'] !== 'number') return { ok: false, motiv: 'format' };
  if (x['v'] !== VERSIUNE_FISIER_FREZE) return { ok: false, motiv: x['v'] > VERSIUNE_FISIER_FREZE ? 'versiune' : 'format' };
  const lista = x['freze'];
  if (!Array.isArray(lista)) return { ok: false, motiv: 'format' };
  if (lista.length > MARGINI_FREZA.freze) return { ok: false, motiv: 'prea-multe' };
  const freze: Freza[] = [];
  let sarite = 0;
  for (const f of lista) {
    const b = frezaImportata(f);
    if (b) freze.push(b);
    else sarite++;
  }
  return { ok: true, fel: 'json', freze, sarite };
}

/** Antetul unei coloane, fără majuscule, spații și liniuțe: „Pas lateral”, „pas_lateral” și „pasLateral” sunt aceeași. */
const cheieAntet = (s: string): string => s.normalize('NFC').trim().toLocaleLowerCase('ro').replace(/[\s_-]+/gu, '');
const ANTETE: ReadonlyMap<string, ColoanaCsv> = new Map(COLOANE_CSV.map((c) => [cheieAntet(c), c]));

const FELURI: Readonly<Record<string, FelFreza>> = {
  plata: 'plata', 'plată': 'plata', flat: 'plata', v: 'v', gravare: 'gravare', engraving: 'gravare',
  bila: 'bila', 'bilă': 'bila', ball: 'bila', toroidala: 'toroidala', 'toroidală': 'toroidala', bullnose: 'toroidala',
  conica: 'conica', 'conică': 'conica', tapered: 'conica', burghiu: 'burghiu', drill: 'burghiu',
  rotunjire: 'rotunjire', roundover: 'rotunjire', ogee: 'ogee', 'ogee-roman': 'ogee-roman', 'ogee roman': 'ogee-roman',
  'roman ogee': 'ogee-roman', panou: 'panou', 'panou ridicat': 'panou', 'raised panel': 'panou',
  desenata: 'desenata', 'desenată': 'desenata', 'profil desenat': 'desenata', drawn: 'desenata', 'drawn profile': 'desenata',
};

/** Un număr dintr-o celulă; cu `virgula`, și „3,175”. Gol: `undefined`; altceva decât un număr zecimal: NaN. */
function numar(celula: string | undefined, virgula: boolean): number | undefined {
  const c = (celula ?? '').trim();
  if (c === '') return undefined;
  const t = virgula ? c.replace(',', '.') : c;
  return /^[+-]?\d+(?:\.\d+)?$/u.test(t) ? Number(t) : Number.NaN;
}

/**
 * Punctele unei siluete desenate dintr-o celulă: perechi despărțite de „|”, fiecare cu r și h despărțite de spații. Goală:
 * `undefined`; o pereche greșită dă un punct NaN (îl spune judecata frezei).
 */
function puncte(celula: string | undefined, virgula: boolean): Array<[number, number]> | undefined {
  const c = (celula ?? '').trim();
  if (c === '') return undefined;
  return c.split('|').map((p): [number, number] => {
    const n = p.trim().split(/\s+/u);
    return n.length === 2 ? [numar(n[0], virgula) ?? Number.NaN, numar(n[1], virgula) ?? Number.NaN] : [Number.NaN, Number.NaN];
  });
}

function dinCsv(text: string): CitireFreze {
  const sep = separatorGasit(text);
  const { randuri } = citesteCsv(text, sep);
  const antet = randuri[0];
  if (!antet) return { ok: false, motiv: 'gol' };
  const loc = new Map<ColoanaCsv, number>();
  antet.forEach((h, i) => {
    const c = ANTETE.get(cheieAntet(h));
    if (c && !loc.has(c)) loc.set(c, i);
  });
  if (!loc.has('nume') || !loc.has('fel') || !loc.has('diametru')) return { ok: false, motiv: 'coloane' };
  if (randuri.length - 1 > MARGINI_FREZA.freze) return { ok: false, motiv: 'prea-multe' };
  const virgula = sep !== ',';
  const freze: Freza[] = [];
  let sarite = 0;
  for (const r of randuri.slice(1)) {
    const cel = (c: ColoanaCsv): string | undefined => { const i = loc.get(c); return i === undefined ? undefined : r[i]; };
    const nr = (c: ColoanaCsv): number | undefined => numar(cel(c), virgula);
    const fel = FELURI[(cel('fel') ?? '').trim().toLocaleLowerCase('ro')];
    const pct = fel === 'desenata' ? puncte(cel('puncte'), virgula) : undefined;
    // Diametrul siluetei desenate, nescris, e de două ori raza ultimului ei punct.
    const diametru = nr('diametru') ?? (pct ? 2 * pct[pct.length - 1]![0] : undefined);
    if (!fel || diametru === undefined) { sarite++; continue; }
    const nota = (cel('nota') ?? '').trim();
    const grup = (cel('grup') ?? '').trim();
    const f: Record<string, unknown> = {
      nume: (cel('nume') ?? '').trim(), fel, diametru,
      unghi: nr('unghi'), varf: nr('varf'), raza: nr('raza'), treapta: nr('treapta'),
      numar: nr('numar') ?? 1,
      turatie: nr('turatie') ?? 18000, avans: nr('avans') ?? 1000, plonjare: nr('plonjare') ?? 300,
      pas: nr('pas') ?? (fel === 'plata' ? diametru / 2 : 1),
      pasLateral: nr('pas_lateral') ?? 40,
      tais: nr('tais'), taisuri: nr('taisuri'), puncte: pct,
      ...(nota === '' ? {} : { nota }),
      ...(grup === '' ? {} : { grup }),
    };
    for (const k of Object.keys(f)) if (f[k] === undefined) delete f[k];
    const b = frezaImportata(f);
    if (b) freze.push(b);
    else sarite++;
  }
  return { ok: true, fel: 'csv', freze, sarite };
}

/** Frezele unui fișier ales de om: JSON-ul propriu (începe cu „{”) sau un CSV. */
export function citesteFisierFreze(octeti: Uint8Array): CitireFreze {
  if (octeti.length > PLAFON_CSV.octeti) return { ok: false, motiv: 'prea-mare' };
  const { text } = decodeazaCsv(octeti);
  const t = text.replace(/^﻿/u, '').trim();
  if (t === '') return { ok: false, motiv: 'gol' };
  return t.startsWith('{') ? dinJson(t) : dinCsv(t);
}
