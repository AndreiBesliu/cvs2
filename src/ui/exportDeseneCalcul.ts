/**
 * Ce desenează fereastra exportului din valorile omului (ADR 0290, feliile 28.8↑b–c): trecerile pe adâncime, locurile urechilor,
 * trecerile laterale ale buzunarului, coborârea în el și ciocănirea găuririi. Pur și fără importuri din lucrare (regula
 * `interfata-prin-actiuni`), deci socotit aici cu aceleași formule; o probă îl compară cu lucrarea (`adancimiTreceri`,
 * `geometrieUrechi`, `urechiPeLaturi`, `ineleBuzunar`, `intrareRampa`, `intrareZigzag`, `intrareElice`, `traseuGaurire`), ca
 * desenul să spună ce face programul. Din 28.8↑d, și V-carve-ul (`traseuVcarve`) și incrustația în V (`valoriIncrustatie`); singura
 * valoare luată de la model e grosimea de sub fața dopului (`SUB_FATA_DOPULUI`), prin tipurile acțiunilor.
 */
import { SUB_FATA_DOPULUI } from './actiuniExportTipuri.ts';

/** Trecerile pe adâncime, egale (ca `adancimiTreceri`): n = ⌈A / p⌉, fiecare de A / n; fără valori bune sau peste 1 000, nimic. */
export function treceriEgale(adancime: number | null, pas: number | null): { readonly n: number; readonly d: number } | null {
  if (adancime === null || pas === null || !(adancime > 0) || !(pas > 0) || !Number.isFinite(adancime) || !Number.isFinite(pas)) return null;
  const n = Math.max(1, Math.ceil(adancime / pas - 1e-9));
  return n > 1000 ? null : { n, d: adancime / n };
}

/** Locurile urechilor pe care le desenează fereastra; „alese” și „unde ține” nu se pot ști fără desen, deci au locuri schițate. */
export type LocuriUrechiDesen = 'egale' | 'lungi' | 'scurte' | 'mijloc';

/**
 * Centrele urechilor pe o buclă din laturi drepte (lungimile, de la vârful 0, în ordinea drumului), ca lucrarea: la distanțe
 * egale (k + ½) · P / n (`geometrieUrechi`); după regulă, numărul împărțit pe laturile cele mai lungi sau cele mai scurte (cu 1 %
 * toleranță), ⌊n / k⌋ pe fiecare și restul răspândit pe ⌊j · k / e⌋, la (j + ½) · L / m pe latură; la mijloc, câte una pe latură
 * (`urechiPeLaturi`). Fără proba încăperii: desenul arată unde ar sta, iar exportul spune dacă nu încap.
 */
export function centreUrechiDesen(mod: LocuriUrechiDesen, n: number, laturi: readonly number[]): number[] {
  const P = laturi.reduce((s, l) => s + l, 0);
  if (!(n >= 1) || !(P > 0)) return [];
  if (mod === 'egale') return Array.from({ length: n }, (_, k) => ((k + 0.5) * P) / n);
  const s0 = laturi.map((_, i) => laturi.slice(0, i).reduce((s, l) => s + l, 0));
  const max = Math.max(...laturi), min = Math.min(...laturi);
  const alese = laturi.map((l, i) => [l, s0[i] ?? 0] as const)
    .filter(([l]) => mod === 'mijloc' || (mod === 'lungi' ? l >= max * 0.99 : l <= min * 1.01));
  const k = alese.length, baza = Math.floor(n / k), rest = n - baza * k;
  const cate = alese.map(() => (mod === 'mijloc' ? 1 : baza));
  if (mod !== 'mijloc') for (let j = 0; j < rest; j++) { const i = Math.floor((j * k) / rest); cate[i] = (cate[i] ?? 0) + 1; }
  return alese.flatMap(([l, s], i) => Array.from({ length: cate[i] ?? 0 }, (_, j) => s + ((j + 0.5) * l) / (cate[i] ?? 1)));
}

const pozitiv = (x: number | null): x is number => x !== null && Number.isFinite(x) && x > 0;

/**
 * Pasul lateral al buzunarului (ADR 0069): centrele primelor trei treceri față de perete, ca inelele lucrării (R, R + s, R + 2s),
 * și cât se suprapun două vecine (D − s, în mm și în procente din freză). Fără valori bune (0 < s ≤ D / 2, ca fereastra), nimic.
 */
export function treceriLaterale(diametru: number | null, pas: number | null): { readonly centre: number[]; readonly suprapunere: number; readonly procent: number } | null {
  if (!pozitiv(diametru) || !pozitiv(pas) || pas > diametru / 2) return null;
  const R = diametru / 2;
  return { centre: [R, R + pas, R + 2 * pas], suprapunere: diametru - pas, procent: ((diametru - pas) / diametru) * 100 };
}

export type FelCoborare = 'plonjare' | 'rampa' | 'zigzag' | 'elice';
export type CoborareDesen =
  | { readonly fel: 'plonjare' }
  | { readonly fel: 'rampa'; readonly lungime: number }
  | { readonly fel: 'zigzag'; readonly rampe: number; readonly lungime: number }
  | { readonly fel: 'elice'; readonly lungime: number; readonly ture: number };

/**
 * Coborârea pe o trecere de `trecere` mm (cea egală a lucrării, nu pasul scris), ca `coborare.ts` (ADR 0076): rampa și elicea
 * merg trecere / tan(unghi) în plan; zigzagul face ⌈trecere / (lungime · tan(unghi))⌉ rampe dus-întors (pe o buclă mai scurtă
 * decât lungimea, lucrarea face mai multe, pe bucla întreagă); elicea, atâtea ture pe cercul ei. Fără valori bune, nimic.
 */
export function coborareDesen(fel: FelCoborare, trecere: number | null, unghi: number | null, lungime: number | null, raza: number | null): CoborareDesen | null {
  if (fel === 'plonjare') return { fel };
  if (!pozitiv(trecere) || !pozitiv(unghi) || unghi >= 90) return null;
  const tan = Math.tan((unghi * Math.PI) / 180), L = trecere / tan;
  if (fel === 'rampa') return { fel, lungime: L };
  if (fel === 'zigzag') return pozitiv(lungime) ? { fel, rampe: Math.max(1, Math.ceil(trecere / (lungime * tan) - 1e-9)), lungime } : null;
  return pozitiv(raza) ? { fel, lungime: L, ture: L / (2 * Math.PI * raza) } : null;
}

/** Cât se ridică freza între doi pași fără ieșire și cât deasupra fundului coboară rapid după o ieșire (`gaurire.ts`), mm. */
export const RIDICARE_CIOCANIRE = 1, APROPIERE_CIOCANIRE = 0.5;
/** O mișcare pe Z a ciocănirii: până la z (sau sus, la Z-ul sigur), tăind sau rapid. */
export type PasCiocanire = { readonly z: number | 'sus'; readonly taie: boolean };

/**
 * Ciocănirea găuririi (ADR 0087), ca `traseuGaurire` pe un cerc cât freza: trecerile egale, fiecare tăiată în jos; între ele,
 * freza se ridică 1 mm, iar după fiecare al N-lea pas iese sus și coboară rapid la 0,5 mm deasupra fundului. Fără ieșirea de la
 * capăt. Fără valori bune (N întreg, cel puțin 1), nimic.
 */
export function ciocanire(adancime: number | null, pas: number | null, retragere: number | null): PasCiocanire[] | null {
  const tr = treceriEgale(adancime, pas);
  if (!tr || retragere === null || !Number.isInteger(retragere) || retragere < 1) return null;
  const z = (i: number): number => (i + 1 === tr.n ? -(adancime ?? 0) : -((i + 1) * (adancime ?? 0)) / tr.n);
  const m: PasCiocanire[] = [];
  for (let k = 0; k < tr.n; k++) {
    if (k > 0) {
      const fund = z(k - 1);
      if (k % retragere === 0) m.push({ z: 'sus', taie: false }, { z: fund + APROPIERE_CIOCANIRE, taie: false });
      else m.push({ z: fund + RIDICARE_CIOCANIRE, taie: false });
    }
    m.push({ z: z(k), taie: true });
  }
  return m;
}

/**
 * V-carve-ul cu adâncimea maximă D (ADR 0090, ADR 0091): t = tan(θ/2); peretele de la −D stă la D·t de contur (inelul regiunii
 * decalate), deci fundul e plat unde trăsătura e mai lată de 2·D·t. Fără valori bune (D > 0, θ în (0, 180)), nimic.
 */
export function vcarveDesen(adancime: number | null, unghi: number | null): { readonly t: number; readonly perete: number; readonly prag: number } | null {
  if (!pozitiv(adancime) || !pozitiv(unghi) || unghi >= 180) return null;
  const t = Math.tan((unghi * Math.PI) / 360);
  return { t, perete: adancime * t, prag: 2 * adancime * t };
}

/**
 * Incrustația în V (ADR 0170), ca `valoriIncrustatie`: S = D − g (cât intră dopul), fața coborâtă a dopului S + H, contactul S·t
 * (pereții se ating pe atât de la contur), placa cel puțin S + H + 1; fundul plat al locașului de la D·t de contur. Fără valori
 * bune (0 < g < D, H ≥ 0), nimic.
 */
export function incrustatieDesen(adancime: number | null, unghi: number | null, joc: number | null, fierastrau: number | null): {
  readonly S: number; readonly H: number; readonly t: number; readonly fata: number; readonly contact: number; readonly grosimeMinima: number;
  readonly perete: number;
} | null {
  const v = vcarveDesen(adancime, unghi);
  if (!v || adancime === null || !pozitiv(joc) || joc >= adancime || fierastrau === null || !Number.isFinite(fierastrau) || fierastrau < 0) return null;
  const S = adancime - joc, H = fierastrau;
  return { S, H, t: v.t, fata: S + H, contact: S * v.t, grosimeMinima: S + H + SUB_FATA_DOPULUI, perete: v.perete };
}
