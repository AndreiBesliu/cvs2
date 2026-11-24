/**
 * Fișierul bibliotecii de freze (ADR 0300 §8, felia 16.A↑a). „Exportă…” scrie JSON-ul propriu
 * (`{ format: 'cncvs2-freze', v: 1, freze: [...] }`), fără id, versiune și dată (le primește fiecare bibliotecă la import),
 * cu câmpurile necunoscute ale frezelor. „Importă…” citește același JSON sau un CSV cu coloanele din manual (`COLOANE_CSV`):
 * `nume`, `fel` și `diametru` sunt necesare, celelalte au valori implicite. Separatorul se găsește singur (`;`, `,`, tab);
 * virgula zecimală merge doar când separatorul nu e virgula. Codarea: UTF-8, altfel Windows-1250 (cititorul plăcuțelor).
 * Pur: primește octeții, întoarce frezele bune și câte s-au sărit.
 */
import { citesteCsv, decodeazaCsv, PLAFON_CSV, separatorGasit } from './csv.ts';
import { frezaImportata, MARGINI_FREZA, type FelFreza, type Freza, type FrezaSalvata } from '../model/freza.ts';

export const FORMAT_FREZE = 'cncvs2-freze';
export const VERSIUNE_FISIER_FREZE = 1;

/** Coloanele CSV, în ordinea din manual. */
export const COLOANE_CSV = ['nume', 'fel', 'diametru', 'unghi', 'varf', 'numar', 'turatie', 'avans', 'plonjare', 'pas', 'pas_lateral', 'tais', 'taisuri', 'nota', 'grup'] as const;
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
};

/** Un număr dintr-o celulă; cu `virgula`, și „3,175”. Gol: `undefined`; altceva decât un număr zecimal: NaN. */
function numar(celula: string | undefined, virgula: boolean): number | undefined {
  const c = (celula ?? '').trim();
  if (c === '') return undefined;
  const t = virgula ? c.replace(',', '.') : c;
  return /^[+-]?\d+(?:\.\d+)?$/u.test(t) ? Number(t) : Number.NaN;
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
    const diametru = nr('diametru');
    if (!fel || diametru === undefined) { sarite++; continue; }
    const nota = (cel('nota') ?? '').trim();
    const grup = (cel('grup') ?? '').trim();
    const f: Record<string, unknown> = {
      nume: (cel('nume') ?? '').trim(), fel, diametru,
      unghi: nr('unghi'), varf: nr('varf'),
      numar: nr('numar') ?? 1,
      turatie: nr('turatie') ?? 18000, avans: nr('avans') ?? 1000, plonjare: nr('plonjare') ?? 300,
      pas: nr('pas') ?? (fel === 'plata' ? diametru / 2 : 1),
      pasLateral: nr('pas_lateral') ?? 40,
      tais: nr('tais'), taisuri: nr('taisuri'),
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
