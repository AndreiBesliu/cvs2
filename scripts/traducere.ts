/**
 * Roadmap-ul în engleză (ADR 0056), pur: fișele rămân singurul adevăr, în română; traducerea stă într-un dicționar din repo
 * (`docs/traduceri/roadmap.en.json`), cu cheia = amprenta textului român și româna lângă engleză, ca să se poată revizui.
 * Un text schimbat în fișă își schimbă amprenta: până primește traducerea, apare în română și se numără la `netraduse`.
 * „Nota” scurtă a unei felii nu se traduce separat: se ia din nota întreagă tradusă, cu aceeași funcție ca în română.
 */
import { createHash } from 'node:crypto';
import type { Roadmap } from '../shared/documentatie.ts';

export const CALE_DICTIONAR_EN = 'docs/traduceri/roadmap.en.json';

/** Dicționarul, cum stă în repo: amprenta → textul român și traducerea lui. */
export interface DictionarFisier {
  readonly schema: 1;
  readonly texte: Readonly<Record<string, { readonly ro: string; readonly en: string }>>;
}

/** Pură: amprenta unui text român (sha256, primii 16 hex). */
export function amprenta(ro: string): string {
  return createHash('sha256').update(ro, 'utf8').digest('hex').slice(0, 16);
}

/** Un text se traduce dacă are conținut (nu e gol și nu e doar o liniuță). */
const deTradus = (s: string): boolean => s.trim() !== '' && s.trim() !== '—' && s.trim() !== '-';

/** Pură: textele de tradus ale roadmap-ului, unice, în ordinea apariției (nota scurtă se derivează, deci lipsește). */
export function textePentruTraducere(r: Roadmap): string[] {
  const vazute = new Set<string>();
  const rez: string[] = [];
  const pune = (s: string): void => {
    if (deTradus(s) && !vazute.has(s)) {
      vazute.add(s);
      rez.push(s);
    }
  };
  for (const e of r.etape) {
    for (const s of [e.tinta, e.inchide, e.placa, e.live]) pune(s);
    for (const f of e.felii) for (const s of [f.titlu, f.descriere, f.notaIntreaga]) pune(s);
    for (const p of e.puncte) for (const s of [p.titlu, p.descriere]) pune(s);
  }
  for (const o of r.owner) for (const s of [o.ce, o.pentru, o.termen]) pune(s);
  for (const k of Object.keys(r.adr).sort()) pune(r.adr[k]?.titlu ?? '');
  return rez;
}

/**
 * Pură: roadmap-ul în engleză. Fiecare text cu traducere în dicționar o primește; unul fără rămâne în română și intră în
 * `lipsa` (o dată, în ordinea apariției). `nota` se ia din `notaIntreaga` tradusă, cu `primaPropozitie`.
 */
export function traduceRoadmap(
  r: Roadmap, dictionar: DictionarFisier | null, primaPropozitie: (md: string) => string,
): { readonly roadmap: Roadmap; readonly lipsa: readonly string[] } {
  const lipsa = new Set<string>();
  const tr = (s: string): string => {
    if (!deTradus(s)) return s;
    const en = dictionar?.texte[amprenta(s)];
    if (en && en.ro === s) return en.en;
    lipsa.add(s);
    return s;
  };
  const etape = r.etape.map((e) => ({
    ...e,
    tinta: tr(e.tinta), inchide: tr(e.inchide), placa: tr(e.placa), live: tr(e.live),
    felii: e.felii.map((f) => {
      const notaIntreaga = tr(f.notaIntreaga);
      return { ...f, titlu: tr(f.titlu), descriere: tr(f.descriere), notaIntreaga, nota: notaIntreaga === '' ? '' : primaPropozitie(notaIntreaga) };
    }),
    puncte: e.puncte.map((p) => ({ ...p, titlu: tr(p.titlu), descriere: tr(p.descriere) })),
  }));
  const owner = r.owner.map((o) => ({ ...o, ce: tr(o.ce), pentru: tr(o.pentru), termen: tr(o.termen) }));
  const adr: Record<string, Roadmap['adr'][string]> = {};
  for (const k of Object.keys(r.adr).sort()) {
    const a = r.adr[k];
    if (a) adr[k] = { ...a, titlu: tr(a.titlu) };
  }
  return { roadmap: { ...r, limba: 'en', netraduse: lipsa.size, etape, owner, adr }, lipsa: [...lipsa] };
}

/**
 * Pură: dicționarul la zi pentru textele de acum: păstrează traducerile folosite, adaugă intrări goale (`en: ''`) pentru cele
 * lipsă și scoate pe cele care nu mai sunt folosite. Cheile, sortate (fișierul e determinist).
 */
export function dictionarLaZi(texte: readonly string[], vechi: DictionarFisier | null): { readonly dictionar: DictionarFisier; readonly noi: number; readonly scoase: number } {
  const folosite = new Map(texte.map((s) => [amprenta(s), s]));
  const rez: Record<string, { ro: string; en: string }> = {};
  let noi = 0;
  for (const k of [...folosite.keys()].sort()) {
    const ro = folosite.get(k) ?? '';
    const v = vechi?.texte[k];
    if (v && v.ro === ro) rez[k] = { ro, en: v.en };
    else {
      rez[k] = { ro, en: '' };
      noi++;
    }
  }
  const scoase = Object.keys(vechi?.texte ?? {}).filter((k) => !folosite.has(k)).length;
  return { dictionar: { schema: 1, texte: rez }, noi, scoase };
}

/** Pură: dicționarul citit din JSON, sau null dacă n-are forma (o intrare cu `en` gol se consideră netradusă). */
export function citesteDictionar(text: string): DictionarFisier | null {
  let x: unknown;
  try {
    x = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof x !== 'object' || x === null || (x as { schema?: unknown }).schema !== 1) return null;
  const texte = (x as { texte?: unknown }).texte;
  if (typeof texte !== 'object' || texte === null) return null;
  const rez: Record<string, { ro: string; en: string }> = {};
  for (const [k, v] of Object.entries(texte as Record<string, unknown>)) {
    if (typeof v !== 'object' || v === null) return null;
    const { ro, en } = v as { ro?: unknown; en?: unknown };
    if (typeof ro !== 'string' || typeof en !== 'string') return null;
    if (en !== '') rez[k] = { ro, en };
  }
  return { schema: 1, texte: rez };
}
