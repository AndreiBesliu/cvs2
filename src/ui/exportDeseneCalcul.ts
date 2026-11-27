/**
 * Ce desenează fereastra exportului din valorile omului (ADR 0290, feliile 28.8↑b–c): locurile urechilor pe schiță, trecerile
 * laterale ale buzunarului și coborârea în el. Pur și fără importuri din lucrare (regula `interfata-prin-actiuni`), deci socotit
 * aici cu aceleași formule; o probă îl compară cu lucrarea (`geometrieUrechi`, `urechiPeLaturi`, `ineleBuzunar`, `intrareRampa`,
 * `intrareZigzag`, `intrareElice`), ca desenul să spună ce face programul. Lucrarea lor cere parcurgerea buclei sau motorul de
 * contururi, care stau doar în workerul CAM (urechile, aduse în fereastră, ar costa 1,3 kB pentru o schiță care nu e la scară;
 * ADR 0291, felia 28.8↑h). Din 28.8↑d, și V-carve-ul (`traseuVcarve`) și incrustațiile (`valoriIncrustatie`, `valoriBanda`,
 * `valoriIncrustatieDreapta`): ele cer o operație întreagă, pe care fereastra o face abia la Exportă (o vor primi când starea
 * ferestrei devine un hook, în 28.8↑m). Singurele valori luate de la model, prin tipurile acțiunilor: grosimea de sub fața
 * dopului, rezerva benzii și lățimea ei cea mai mică. Trecerile și ciocănirea nu mai stau aici: le dă rândul „pe hârtie”, din
 * funcțiile lucrării (ADR 0291, felia 28.8↑h).
 */
import { celuleAliniate, latimeMinimaBanda, REZERVA_BANDA, SUB_FATA_DOPULUI } from './actiuniExportTipuri.ts';

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

/**
 * Banda din jurul dopului în V (ADR 0172), ca `valoriBanda`: lățimea cea mai mică M (pereții, fundul plat cu freza lui și, cu
 * decuparea, freza ei, plus rezervele), cea folosită (scrisă sau M), tăietura decupării la e = H·t + c de desen, placa (scrisă sau
 * S + H + 1) și cea mai mică cu decuparea (S + H + grosimea punților). `fund`: Ø frezei drepte (0 fără ea); `frezaDecupare`: Ø
 * frezei decupării, dacă e alta decât a fundului. Fără incrustație bună, nimic.
 */
export function bandaDesen(adancime: number | null, unghi: number | null, joc: number | null, fierastrau: number | null, b: {
  readonly latime: number | null; readonly decupare: boolean; readonly placa: number | null; readonly puntiGrosime: number; readonly fund: number;
  readonly frezaDecupare: number | null;
}): {
  readonly S: number; readonly H: number; readonly t: number; readonly minima: number; readonly latime: number; readonly e: number;
  readonly placa: number; readonly placaMinima: number;
} | null {
  const v = incrustatieDesen(adancime, unghi, joc, fierastrau);
  if (!v) return null;
  const minima = latimeMinimaBanda(v.H, v.t, b.fund, b.decupare ? (b.frezaDecupare ?? b.fund) : b.fund);
  return {
    S: v.S, H: v.H, t: v.t, minima, latime: b.latime ?? minima, e: v.H * v.t + REZERVA_BANDA,
    placa: b.placa ?? v.S + v.H + SUB_FATA_DOPULUI, placaMinima: v.fata + b.puntiGrosime,
  };
}

/**
 * Dopul incrustației cu pereți drepți (ADR 0171, ADR 0175), ca `valoriIncrustatieDreapta`: înălțimea lui (D + H pe fund sau
 * decupat, D − g pe față; la gaură, D e grosimea foii și pe față rămâne D), grosimea semifabricatului (exactă la cel decupat,
 * cu 1 mm sub față la cel ridicat) și, cu treaptă, tija și flanșa după sprijin: pe umăr D − d − g și d + H, pe fund
 * D − d + g și d − g + H, la gaură D − d și d + H. Fără valori bune (umărul în (0, D)), nimic.
 */
export function dopDreptDesen(i: {
  readonly adancime: number | null; readonly gaura: boolean; readonly dop: 'ridicat' | 'decupat'; readonly sprijin: 'fund' | 'fata' | 'umar';
  readonly joc: number | null; readonly fierastrau: number | null; readonly treapta: { readonly d: number | null; readonly s: number | null } | null;
}): { readonly inaltime: number; readonly grosime: number; readonly treapta: { readonly tija: number; readonly flansa: number } | null } | null {
  const D = i.adancime, g = i.joc ?? 0, H = i.fierastrau ?? 0;
  if (!pozitiv(D) || g < 0 || H < 0) return null;
  let inaltime: number, treapta: { tija: number; flansa: number } | null = null;
  if (i.treapta) {
    const d = i.treapta.d;
    if (!pozitiv(d) || d >= D || !pozitiv(i.treapta.s)) return null;
    const [tija, flansa] = i.gaura ? [D - d, d + H] : i.sprijin === 'fund' ? [D - d + g, d - g + H] : [D - d - g, d + H];
    treapta = { tija, flansa };
    inaltime = tija + flansa;
  } else {
    inaltime = i.dop === 'ridicat' && i.sprijin === 'fata' ? D - (i.gaura ? 0 : g) : D + H;
  }
  return { inaltime, grosime: i.dop === 'decupat' ? inaltime : inaltime + SUB_FATA_DOPULUI, treapta };
}

/**
 * Trecerile pe Z ale finisării și ale degroșării reliefului (felia 18.1↑d-6), ca lucrarea (`reliefFinisare.ts`): pe un model care
 * coboară până la podea, n = ⌈P / pas⌉ treceri, unde P e podeaua A (la degroșare, ridicată cu adaosul: A − a); fundurile primelor
 * n − 1 la k · pas sub față (mm, pozitive), iar ultima pe model, cel mult la P. Un model mai sus face mai puține (fundurile de sub
 * el nu se taie). Fără valori bune (sau cu adaosul cât podeaua), nimic.
 */
export function treceriPodeaRelief(adancime: number, pas: number, adaos = 0): { readonly funduri: number[]; readonly n: number; readonly podea: number } {
  const P = adancime - (Number.isFinite(adaos) && adaos > 0 ? adaos : 0);
  if (!pozitiv(adancime) || !pozitiv(pas) || !pozitiv(P)) return { funduri: [], n: 0, podea: 0 };
  const n = Math.max(1, Math.ceil(P / pas - 1e-9));
  return { funduri: Array.from({ length: n - 1 }, (_, k) => (k + 1) * pas), n, podea: P };
}

/**
 * Liniile reliefului (felia 18.1↑d-6): la 0° și 90°, prin centrele celulelor, la pasul folosit de lucrare (k celule întregi,
 * `celuleAliniate`, ADR 0314); la alt unghi, nealiniate sau fără celulă, pasul cerut (lucrarea îl împarte egal pe lățimea
 * reliefului, deci liniile stau cel mult la el). Un pas care nu e bun: nimic.
 */
export function liniiReliefDesen(
  pas: number, celula: number | undefined, aliniat: boolean, unghi: number,
): { readonly aliniate: boolean; readonly pas: number; readonly celule: number | null } | null {
  if (!pozitiv(pas)) return null;
  if (!aliniat || (unghi !== 0 && unghi !== 90) || celula === undefined || !pozitiv(celula)) return { aliniate: false, pas, celule: null };
  const k = celuleAliniate(pas, celula);
  return { aliniate: true, pas: k * celula, celule: k };
}
