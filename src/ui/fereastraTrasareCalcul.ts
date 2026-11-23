import { t } from '../i18n/t.ts';
import type { CaiTrasate } from '../trasare/trasare.ts';

/**
 * Partea pură a ferestrei trasării, refăcută în ADR 0273 (felia 25.9↑): ce ține minte fereastra în browser, toleranța
 * mărimii desenului, textul „Desenul” și cutia căilor trasate (chenarul de pe previzualizare). Stă aici, nu în
 * `FereastraTrasare.tsx`, ca probele unitare s-o poată încărca fără JSX.
 */

/** Grupurile setărilor (ADR 0273 §2), în ordinea lucrului. */
export type Grup = 'imagine' | 'trasare' | 'curatare' | 'marime';
export const GRUPURI: readonly Grup[] = ['imagine', 'trasare', 'curatare', 'marime'];

/**
 * Ce ține minte fereastra, în browser (ADR 0273, răspunsurile 1a–3a, cu celelalte variante ca opțiuni): grupurile deschise
 * (Imaginea și Curățarea strânse la prima deschidere), Simplu (oprit; pornit, ascunde de tot Imaginea și Curățarea, ca la
 * „Din desen…”), Detaliile raportului, ce mărime scrii (a desenului; sau a imaginii, ca până la 25.9↑) și ce rămâne fix după
 * ce ai scris mărimea desenului (mărimea scrisă; sau scara din clipa scrierii).
 */
export type Tinute = {
  readonly deschise: Readonly<Record<Grup, boolean>>; readonly simplu: boolean; readonly detalii: boolean;
  readonly marime: 'desen' | 'imagine'; readonly fix: 'marime' | 'scara';
};
export const CHEIE_TINUTE = 'cncvs2.trasare.fereastra';
export const TINUTE_IMPLICITE: Tinute = {
  deschise: { imagine: false, trasare: true, curatare: false, marime: true }, simplu: false, detalii: false, marime: 'desen', fix: 'marime',
};

/** Alegerile ținute (`{ v: 1, … }`); orice lipsă sau valoare străină ia implicitul, iar o stocare blocată dă implicitele. */
export function citesteTinute(): Tinute {
  try {
    const x: unknown = JSON.parse(localStorage.getItem(CHEIE_TINUTE) ?? 'null');
    if (typeof x !== 'object' || x === null || (x as { readonly v?: unknown }).v !== 1) return TINUTE_IMPLICITE;
    const o = x as Readonly<Record<string, unknown>>;
    const d = typeof o.deschise === 'object' && o.deschise !== null ? o.deschise as Readonly<Record<string, unknown>> : {};
    const deschise = { ...TINUTE_IMPLICITE.deschise };
    for (const g of GRUPURI) { const v = d[g]; if (typeof v === 'boolean') deschise[g] = v; }
    return { deschise, simplu: o.simplu === true, detalii: o.detalii === true, marime: o.marime === 'imagine' ? 'imagine' : 'desen', fix: o.fix === 'scara' ? 'scara' : 'marime' };
  } catch {
    return TINUTE_IMPLICITE;
  }
}

export function scrieTinute(x: Tinute): void {
  try { localStorage.setItem(CHEIE_TINUTE, JSON.stringify({ v: 1, ...x })); } catch { /* fără stocare: alegerile țin cât fereastra */ }
}

/**
 * Mărimea desenului (ADR 0273 §4, răspunsul 3a): după o trasare, desenul e „cât ai scris” dacă latura scrisă diferă cu cel
 * mult atât (sub jumătate de sutime: „Desenul” are două zecimale). Altfel, încă o trasare cu scara potrivită, de cel mult
 * `CORECTII_MAXIME` ori la rând (de obicei una: petele și golurile sunt în mm, deci pot schimba cutia doar cu ce scot).
 */
export const TOLERANTA_MARIME = 0.0005;
export const CORECTII_MAXIME = 3;

/** „Desenul: L × Î mm” (ADR 0273 §6): două zecimale, după limbă (virgula în română), fără separatorul miilor. */
export function textMarime(latime: number, inaltime: number, limba: string): string {
  const f = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  return t('import.marime', { latime: f.format(latime), inaltime: f.format(inaltime) });
}

/** Parametrii extremelor unei cubice pe o axă (rădăcinile derivatei; cei din afara lui (0, 1) îi sare apelantul), adăugați la `t0`. */
function extremeCubica(a: number, b: number, c: number, d: number, t0: number[]): void {
  const A = -a + 3 * b - 3 * c + d, B = 2 * (a - 2 * b + c), C = b - a;
  if (Math.abs(A) < 1e-12) { if (Math.abs(B) > 1e-12) t0.push(-C / B); return; }
  const D = B * B - 4 * A * C;
  if (D < 0) return;
  const r = Math.sqrt(D);
  t0.push((-B + r) / (2 * A), (-B - r) / (2 * A));
}

/** Cutia căilor trasate (pixelii imaginii trasate), cu extremele cubicelor, nu cu mânerele lor; null fără căi. */
export function cutieCai(c: CaiTrasate): { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const x = c.xy;
  const pune = (px: number, py: number): void => { x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); };
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0, deschisa = c.deschisa?.[k] === 1;
    for (let v = a; v < b; v++) {
      pune(x[6 * v] ?? 0, x[6 * v + 1] ?? 0);
      if (c.tip[v] !== 1 || (deschisa && v === b - 1)) continue;
      const w = v + 1 < b ? v + 1 : a;
      const P = [x[6 * v] ?? 0, x[6 * v + 1] ?? 0, x[6 * v + 2] ?? 0, x[6 * v + 3] ?? 0, x[6 * v + 4] ?? 0, x[6 * v + 5] ?? 0, x[6 * w] ?? 0, x[6 * w + 1] ?? 0];
      const ts: number[] = [];
      extremeCubica(P[0] ?? 0, P[2] ?? 0, P[4] ?? 0, P[6] ?? 0, ts);
      extremeCubica(P[1] ?? 0, P[3] ?? 0, P[5] ?? 0, P[7] ?? 0, ts);
      for (const u of ts) {
        if (!(u > 0 && u < 1)) continue;
        const m = 1 - u, k0 = m * m * m, k1 = 3 * m * m * u, k2 = 3 * m * u * u, k3 = u * u * u;
        pune(k0 * (P[0] ?? 0) + k1 * (P[2] ?? 0) + k2 * (P[4] ?? 0) + k3 * (P[6] ?? 0), k0 * (P[1] ?? 0) + k1 * (P[3] ?? 0) + k2 * (P[5] ?? 0) + k3 * (P[7] ?? 0));
      }
    }
  }
  return x0 <= x1 && y0 <= y1 ? { x0, y0, x1, y1 } : null;
}
