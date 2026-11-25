/**
 * Modelul reliefului pentru vederea 3D (ADR 0310 §7, felia 18.1↑b): factorul texturii, cheile dalelor și încărcarea doar a
 * dalelor schimbate. Cheia unei dale e ce o compune (modul și intrarea hărții fiecărui strat vizibil care are date acolo):
 * aceeași cheie, același compus, deci aceeași textură; o dală goală a unui strat nu atinge compusul (ADR 0311 §7), deci nici
 * cheia. Baza se citește doar pentru octeții dalelor de calculat, iar compunerea e a workerului reliefului.
 */
import { reliefInBazin } from '../jobs/bazinRelief.ts';
import type { DalaModel } from '../jobs/calculRelief.ts';
import type { FormaRelief, ModRelief } from '../model/document.ts';
import { dale as numarDale } from '../relief/grila.ts';
import { hartaDinText, type Harta } from '../relief/harta.ts';

export type { DalaModel } from '../jobs/calculRelief.ts';

/** Cel mult atâția pixeli într-o textură a modelului (16 MB, ca relieful simulării, ADR 0057 §2). */
export const PIXELI_MODEL = 4_194_304;
/** Latura cea mai mare a unei texturi, dacă placa video nu spune alta mai mică. */
export const LATURA_MODEL = 4096;

/** Cel mai mic k (putere a lui 2, cel mult 256) cu textura ⌈nx / k⌉ × ⌈ny / k⌉ în latura `maxim` și în `PIXELI_MODEL`. */
export function factorModel(nx: number, ny: number, maxim = LATURA_MODEL): number {
  const lim = Math.min(maxim, LATURA_MODEL);
  let k = 1;
  while (k < 256) {
    const w = Math.ceil(nx / k), h = Math.ceil(ny / k);
    if (w <= lim && h <= lim && w * h <= PIXELI_MODEL) break;
    k *= 2;
  }
  return k;
}

/** Cheile celor `n` dale, din straturile vizibile (în ordine, de jos în sus). */
export function cheiModel(straturi: ReadonlyArray<{ readonly mod: ModRelief; readonly harta: Harta }>, n: number): string[] {
  const chei: string[] = [];
  for (let t = 0; t < n; t++) {
    const parti: Array<readonly [ModRelief, string | number]> = [];
    for (const s of straturi) {
      const e = s.harta.dale[t] ?? null;
      if (e !== null) parti.push([s.mod, e]);
    }
    chei.push(JSON.stringify(parti));
  }
  return chei;
}

/** Dalele de urcat: toate, fără chei vechi (ori cu alt număr de dale); altfel cele cu alta cheie. */
export function deUrcat(vechi: readonly string[] | null, noi: readonly string[]): number[] {
  const r: number[] = [];
  for (let t = 0; t < noi.length; t++) if (!vechi || vechi.length !== noi.length || vechi[t] !== noi[t]) r.push(t);
  return r;
}

/** De unde vin hărțile și dalele (baza `cncvs2-relief`; în probe, o bază în memorie). */
export type StocareModel = {
  readonly harta: (amprenta: string) => Promise<string | null>;
  readonly dale: (amprente: readonly string[]) => Promise<Record<string, Uint8Array<ArrayBuffer>>>;
};

/** Un model încărcat: factorul, cheile tuturor dalelor, dacă s-a refăcut tot (altă textură) și dalele calculate acum. */
export type ModelIncarcat = { readonly k: number; readonly chei: readonly string[]; readonly tot: boolean; readonly dale: readonly DalaModel[] };

/**
 * Modelul formei `f`, față de cel încărcat înainte (`vechi`: factorul și cheile lui), cu textura cel mult `maxim` pe latură:
 * doar dalele cu altă cheie se citesc din bază și se compun. „lipsa”: o hartă sau o dală nu e în browser.
 */
export async function incarcaModel(
  f: FormaRelief, vechi: { readonly k: number; readonly chei: readonly string[] } | null, maxim: number, st: StocareModel, semnal?: AbortSignal,
): Promise<ModelIncarcat | 'lipsa'> {
  const straturi: Array<{ readonly mod: ModRelief; readonly text: string; readonly harta: Harta }> = [];
  for (const s of f.straturi) {
    if (!s.vizibil) continue;
    const text = await st.harta(s.dale), harta = text === null ? null : hartaDinText(text);
    if (text === null || !harta || harta.nx !== f.nx || harta.ny !== f.ny) return 'lipsa';
    straturi.push({ mod: s.mod, text, harta });
  }
  const { tx, ty } = numarDale(f.nx, f.ny), k = factorModel(f.nx, f.ny, maxim), chei = cheiModel(straturi, tx * ty);
  const tot = !vechi || vechi.k !== k || vechi.chei.length !== chei.length;
  const dale = deUrcat(tot ? null : vechi.chei, chei);
  if (dale.length === 0) return { k, chei, tot, dale: [] };
  const amprente = new Set<string>();
  for (const s of straturi) for (const t of dale) { const e = s.harta.dale[t]; if (typeof e === 'string') amprente.add(e); }
  const octeti = await st.dale([...amprente]);
  if ([...amprente].some((a) => !octeti[a])) return 'lipsa';
  const r = await reliefInBazin({
    tip: 'model', nx: f.nx, ny: f.ny, k, dale,
    straturi: straturi.map((s) => ({
      mod: s.mod, vizibil: true, harta: s.text,
      octeti: Object.fromEntries(s.harta.dale.flatMap((e) => (typeof e === 'string' && octeti[e] ? [[e, octeti[e]]] : []))),
    })),
  }, { transfera: true, ...(semnal ? { semnal } : {}) });
  if (!r.ok) {
    if (r.cod === 'dale-lipsa') return 'lipsa';
    throw new Error(`modelul reliefului: ${r.cod}${r.detaliu ? ` (${r.detaliu})` : ''}`);
  }
  if (r.tip !== 'model') throw new Error('modelul reliefului: alt răspuns');
  return { k, chei, tot, dale: r.dale };
}
