/**
 * Verificarea unui `.gcode` gata feliat, înainte să plece la imprimantă (ADR 0190 §D), fără rețea: antetul feliatorului
 * (imprimanta, duza, materialul, timpul estimat, miniatura; temperaturile, din primele comenzi de încălzire) și întinderea
 * mișcărilor (G0–G3, cu G90 / G91, G92 și G28), față de patul imprimantei. Așa un fișier feliat pentru altă imprimantă (de felul
 * avertismentului CC5000) se vede în aplicație, nu la imprimantă.
 *
 * Fișierul vine pe bucăți (un `.gcode` are zeci de MB): analiza ține doar linia neterminată, pozițiile și ce a aflat. Antetul
 * e al lui OrcaSlicer și Creality Print (`; cheie = valoare`, configurația la final), al lui PrusaSlicer și al lui Cura
 * (`;CHEIE:valoare`); miniatura, PNG în base64 între `thumbnail begin` și `thumbnail end`. Starea stă în închiderea lui
 * `analizor` (nu într-o clasă): minificatorul îi scurtează numele, în bucata ferestrei.
 */

/** Patul, în mm (X, Y, Z): K1, K1C și K1 SE au 220 × 220 × 250, K1 Max 300 × 300 × 300. */
export const patPentru = (model: string | null): readonly [number, number, number] =>
  model !== null && /max/i.test(model) ? [300, 300, 300] : [220, 220, 250];

const AXE = ['X', 'Y', 'Z'] as const;

/** Prima mișcare care iese din pat: linia (de la 1), textul ei, axa și valoarea atinsă. */
export type IesirePat = { readonly linie: number; readonly text: string; readonly axa: (typeof AXE)[number]; readonly valoare: number };

/**
 * O pauză din fișier (felia 3.6p, ADR 0193 §A): comanda (`PAUSE`, `M600`, `M601`, `M0`, `M1`, `M25`, `M226`), linia (de la 1),
 * stratul înaintea căruia vine și înălțimea imprimată până la ea (după comentariile straturilor; null: neștiute), nota scrisă
 * de cvs2 (`; pause note: …`).
 */
export type PauzaFisier = {
  readonly comanda: string; readonly linie: number; readonly strat: number | null; readonly z: number | null; readonly nota: string | null;
};

export type AnalizaGcode = {
  readonly imprimanta: string | null;
  readonly duza: number | null;
  readonly material: string | null;
  /** Prima temperatură cerută duzei și patului, în °C (M104 / M109, M140 / M190 sau `START_PRINT`). */
  readonly tDuza: number | null;
  readonly tPat: number | null;
  /** Timpul estimat de feliator, în secunde. */
  readonly timp: number | null;
  /** Cea mai mare miniatură PNG, în base64. */
  readonly miniatura: string | null;
  readonly miscari: number;
  /** Cea mai mică și cea mai mare valoare atinsă pe X, Y și Z (null: nicio poziție știută pe axa aceea). */
  readonly min: readonly (number | null)[];
  readonly max: readonly (number | null)[];
  readonly iesire: IesirePat | null;
  /** Pauzele din fișier, în ordine (cel mult `MAX_PAUZE`). */
  readonly pauze: readonly PauzaFisier[];
};

/** Câte pauze ține analiza (un fișier cu mii de `M0` nu umple memoria). */
export const MAX_PAUZE = 50;
/** Comenzile care opresc imprimarea până la o reluare: macroul Klipper, schimbarea filamentului, pauzele Marlin și Prusa. */
const RE_PAUZA = /^(PAUSE|M0|M1|M25|M226|M600|M601)(?=\s|$)/;

/** Câtă imprecizie de calcul trece drept „pe margine”, în mm. */
const EPS = 1e-6;
/** O miniatură fără sfârșit nu înghite restul fișierului. */
const MAX_LINII_MINIATURA = 20000;

/** O durată a feliatorului: secunde („2460”, Cura) sau „1d 2h 3m 4s” (PrusaSlicer, OrcaSlicer). */
export function secunde(v: string): number | null {
  if (/^\d+(?:\.\d+)?$/.test(v)) return Number(v);
  let s = 0;
  let gasit = false;
  for (const [, n, u] of v.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/g)) {
    s += Number(n) * ({ d: 86400, h: 3600, m: 60, s: 1 } as Record<string, number>)[u ?? 's']!;
    gasit = true;
  }
  return gasit ? Math.round(s) : null;
}

const pozitiv = (v: number | undefined): number | null => (v !== undefined && v > 0 ? v : null);

export type AnalizorGcode = { readonly adauga: (t: string) => void; readonly gata: () => AnalizaGcode };

export function analizor(pat: readonly [number, number, number]): AnalizorGcode {
  let rest = '';
  let n = 0;
  let abs = true;
  /** Poziția reală pe X, Y, Z (null: neștiută, de exemplu după G28) și deplasarea pusă de G92 (reală = scrisă + deplasare). */
  const p: (number | null)[] = [null, null, null];
  const o: (number | null)[] = [0, 0, 0];
  const mn: (number | null)[] = [null, null, null];
  const mx: (number | null)[] = [null, null, null];
  let iesire: IesirePat | null = null;
  let miscari = 0;
  let mini: string[] | null = null;
  // Straturile, după primul fel de comentariu găsit (ca Klipper-ul Creality): `;LAYER_CHANGE` (OrcaSlicer, Creality Print,
  // cvs2) sau `;LAYER:n` (Cura, de la 0); înălțimea, din `;Z:`; nota unei pauze, din comentariul scris de cvs2 înaintea ei.
  let felStrat: 'schimbare' | 'cura' | null = null;
  let strat = 0;
  let zAcum: number | null = null, zAnterior: number | null = null;
  let nota: string | null = null;
  const pauze: PauzaFisier[] = [];
  const a: { -readonly [K in 'imprimanta' | 'duza' | 'material' | 'tDuza' | 'tPat' | 'timp' | 'miniatura']: AnalizaGcode[K] } = {
    imprimanta: null, duza: null, material: null, tDuza: null, tPat: null, timp: null, miniatura: null,
  };

  const punct = (i: number, v: number | null, text: string): void => {
    if (v === null) return;
    const jos = mn[i] ?? null;
    const sus = mx[i] ?? null;
    if (jos === null || v < jos) mn[i] = v;
    if (sus === null || v > sus) mx[i] = v;
    if (iesire === null && (v < -EPS || v > (pat[i] ?? 0) + EPS)) iesire = { linie: n, text, axa: AXE[i] ?? 'X', valoare: v };
  };

  /** O mișcare: capătul ei și, la un arc (G2 orar, G3 trigonometric, cu centrul din I și J), punctele lui extreme. */
  const misca = (g: number, par: Readonly<Record<string, number>>, text: string): void => {
    const [x0, y0] = p;
    let atins = false;
    AXE.forEach((x, i) => {
      const v = par[x];
      if (v === undefined) return;
      atins = true;
      const pi = p[i] ?? null;
      const oi = o[i] ?? null;
      p[i] = abs ? (oi === null ? null : v + oi) : pi === null ? null : pi + v;
    });
    // `G1 E… F…` doar împinge filamentul; un arc fără capăt e un cerc întreg.
    if (!atins && g < 2) return;
    miscari++;
    AXE.forEach((_, i) => { punct(i, p[i] ?? null, text); });
    const [x1, y1] = p;
    if (g < 2 || x0 == null || y0 == null || x1 == null || y1 == null || (par['I'] === undefined && par['J'] === undefined)) return;
    const cx = x0 + (par['I'] ?? 0);
    const cy = y0 + (par['J'] ?? 0);
    const r = Math.hypot(x0 - cx, y0 - cy);
    const a0 = Math.atan2(y0 - cy, x0 - cx);
    const cerc = 2 * Math.PI;
    let d = g === 3 ? Math.atan2(y1 - cy, x1 - cx) - a0 : a0 - Math.atan2(y1 - cy, x1 - cx);
    while (d <= 1e-9) d += cerc;
    for (let q = 0; q < 4; q++) {
      const u = (q * Math.PI) / 2;
      if (((((g === 3 ? u - a0 : a0 - u) % cerc) + cerc) % cerc) < d) {
        punct(0, cx + r * Math.cos(u), text);
        punct(1, cy + r * Math.sin(u), text);
      }
    }
  };

  const comentariu = (c: string): void => {
    if (mini !== null) {
      if (/^(?:thumbnail(?:_png)?|png) end/i.test(c)) {
        const b = mini.join('');
        if (b.startsWith('iVBORw0KGgo') && b.length > (a.miniatura?.length ?? 0)) a.miniatura = b;
        mini = null;
      } else if (mini.push(c) > MAX_LINII_MINIATURA) mini = null;
      return;
    }
    if (/^(?:thumbnail(?:_png)?|png) begin/i.test(c)) { mini = []; return; }
    // „; model printing time: 41m 5s; total estimated time: 45m 12s” (OrcaSlicer): mai multe perechi pe o linie.
    for (const bucata of c.split(';')) {
      const m = /^([\w. ()]+?)\s*[=:]\s*(.+)$/.exec(bucata.trim());
      if (!m) continue;
      const cheie = (m[1] ?? '').toLowerCase();
      const v = (m[2] ?? '').trim();
      if (cheie === 'printer_model' || cheie === 'target_machine.name' || cheie === 'printer_settings_id') a.imprimanta ??= v;
      else if (cheie === 'nozzle_diameter' || cheie === 'extruder_train.0.nozzle.diameter') a.duza ??= pozitiv(parseFloat(v));
      else if (cheie === 'filament_type') a.material ??= v;
      else if (cheie === 'time' || cheie === 'total estimated time' || cheie === 'estimated printing time (normal mode)') a.timp ??= secunde(v);
    }
  };

  const linie = (brut: string): void => {
    n++;
    const l = brut.trim();
    const k = l.indexOf(';');
    if (k === 0 && mini === null) {
      const c = l.slice(1).trim();
      let m: RegExpExecArray | null;
      if (c === 'LAYER_CHANGE') {
        if (felStrat !== 'cura') { felStrat = 'schimbare'; strat++; nota = null; }
      } else if ((m = /^LAYER:(-?\d+)$/.exec(c)) !== null) {
        if (felStrat !== 'schimbare') { felStrat = 'cura'; strat = Number(m[1]) + 1; nota = null; }
      } else if ((m = /^Z:\s*(-?\d+(?:\.\d+)?)$/.exec(c)) !== null) {
        zAnterior = zAcum; zAcum = Number(m[1]);
      } else if ((m = /^pause note:\s*(.*)$/i.exec(c)) !== null) {
        nota = (m[1] ?? '').trim().slice(0, 80) || null;
      }
    }
    if (k >= 0) comentariu(l.slice(k + 1).trim());
    const cod = (k < 0 ? l : l.slice(0, k)).trim().toUpperCase();
    if (cod === '') return;
    if (/^(?:START_PRINT|PRINT_START)\b/.test(cod)) {
      a.tDuza ??= pozitiv(Number(/EXTRUDER_TEMP=(\d+(?:\.\d+)?)/.exec(cod)?.[1]));
      a.tPat ??= pozitiv(Number(/BED_TEMP=(\d+(?:\.\d+)?)/.exec(cod)?.[1]));
      return;
    }
    const pz = RE_PAUZA.exec(cod);
    if (pz !== null) {
      if (pauze.length < MAX_PAUZE) {
        pauze.push({ comanda: pz[1]!, linie: n, strat: felStrat === null ? null : strat, z: felStrat === 'schimbare' ? zAnterior : null, nota });
      }
      nota = null;
      return;
    }
    // „G1X10” (fără spații) e tot G1.
    const m = /^([GM])(\d+)(.*)$/.exec(cod);
    if (!m) return;
    const nr = Number(m[2]);
    const g = m[1] === 'G';
    if (g && nr === 90) { abs = true; return; }
    if (g && nr === 91) { abs = false; return; }
    const ok = g ? nr <= 3 || nr === 28 || nr === 92 : nr === 104 || nr === 109 || nr === 140 || nr === 190;
    if (!ok) return;
    const par: Record<string, number> = {};
    for (const [, lit, v] of (m[3] ?? '').matchAll(/([A-Z])\s*(-?(?:\d+\.?\d*|\.\d+))/g)) par[lit!] ??= Number(v);
    if (!g) {
      if (nr === 104 || nr === 109) a.tDuza ??= pozitiv(par['S']);
      else a.tPat ??= pozitiv(par['S']);
      return;
    }
    if (nr === 92) {
      AXE.forEach((x, i) => { const v = par[x]; if (v !== undefined) { const pi = p[i] ?? null; o[i] = pi === null ? null : pi - v; } });
      return;
    }
    if (nr === 28) {
      const toate = AXE.every((x) => par[x] === undefined);
      AXE.forEach((x, i) => { if (toate || par[x] !== undefined) { p[i] = null; o[i] = 0; } });
      return;
    }
    misca(nr, par, l.length > 80 ? `${l.slice(0, 80)}…` : l);
  };

  return {
    adauga: (t) => {
      const linii = (rest + t).split('\n');
      rest = linii.pop() ?? '';
      for (const l of linii) linie(l);
    },
    gata: () => {
      if (rest !== '') linie(rest);
      rest = '';
      return { ...a, miscari, min: [...mn], max: [...mx], iesire, pauze: [...pauze] };
    },
  };
}

export function analizeazaText(t: string, pat: readonly [number, number, number]): AnalizaGcode {
  const a = analizor(pat);
  a.adauga(t);
  return a.gata();
}

/** Cât citește odată dintr-un fișier: printre bucăți, pagina rămâne vie. */
const BUCATA = 1 << 20;

/** Analiza unui fișier ales de om, citit pe bucăți (UTF-8, fără să taie un caracter între două bucăți). */
export async function analizeazaFisier(f: Blob, pat: readonly [number, number, number], semnal?: AbortSignal): Promise<AnalizaGcode> {
  const a = analizor(pat);
  const dec = new TextDecoder();
  for (let i = 0; i < f.size; i += BUCATA) {
    semnal?.throwIfAborted();
    a.adauga(dec.decode(new Uint8Array(await f.slice(i, i + BUCATA).arrayBuffer()), { stream: true }));
  }
  a.adauga(dec.decode());
  return a.gata();
}
