/**
 * ORACOLUL POTRIVIRII INCRUSTAȚIEI ÎN V (ADR 0170): dopul întors în locaș, judecat pe lemnul simulat, nu pe structura
 * programului. ZERO importuri din `src/`; din oracole, doar cititorul și simularea (`simulare.ts`), ca oracolul buzunarului.
 * Scris din textul ADR-ului, înaintea codului: în ediția întâi, „dopul” a fost 3,5 luni o a doua cavitate, cu un test care
 * judeca structura („e oglinda?”), nu ce iese din lemn (`LECTII.md` §1).
 *
 * Ce citește: TEXTUL celor două programe exportate (locașul, din programul foii, și dopul, din fișierul lui), fiecare tăiat la
 * `T… M6` și judecat pe sculă cu oracolul simulării; suprafața unei plăci e minimul pe scule (cea mai adâncă tăietură
 * câștigă). Sculele le dă cine cheamă, de pe hârtie (din document), nu din program.
 *
 * Contractul pe care îl judecă (ADR 0170 §3, scris aici din nou, nu luat din cod):
 * - desenul e o regiune par-impar (poligoane); d = distanța exactă la conturul lui, pe hârtie;
 * - semifabricatul dopului e cutia desenului oglindit pe X, cu `margine` pe fiecare parte, cu originea în colțul lui
 *   stânga-jos și Z0 pe fața lui: un punct (x, y) al foii are perechea (x1 + margine − x, y − y0 + margine) pe dop, unde
 *   [x0, x1] × [y0, y1] e cutia desenului pe foaie;
 * - întors și coborât, dopul atinge locașul unde adâncimea scoasă din placă (F) plus cea scoasă din dop (M) e cea mai mică;
 *   oprirea e h* = min(F + M) pe toate celulele în care dopul are lemn (tot semifabricatul).
 *
 * Ce măsoară, pe celulele ferestrei (cutia desenului lărgită cu `lat`, în semifabricat):
 * - `asezare`: h*, de comparat cu S = D − g;
 * - `contact`: partea celulelor din banda pereților (în desen, 2·celula < d < S·t − 2·celula) în care jocul F + M − h* e sub
 *   `pragContact` (0,05 mm): pereții se ating;
 * - `sub`: jocul sub dop, pe fundul plat al locașului (în desen, d ≥ D·t + 2·celula), de comparat cu g;
 * - `intre`: spațiul dintre plăci, în afara desenului (d ≥ H·t + 2·celula), de comparat cu H;
 * - `umplere`: cât din volumul locașului umple dopul așezat (pe celulele desenului).
 * t = tan(θ/2), θ unghiul inclus al frezei în V. Celulele de pe margini (la cel mult 2·celula de contur sau de pragurile benzii)
 * nu intră în benzi: acolo eșantionarea grilei amestecă două pante.
 *
 * Ce NU judecă: mecanica (Z0 identic pe cele două plăci, jocul mașinii, fibra), lipiciul, fierăstrăul.
 *
 * Banda cu decupare (ADR 0172, contractul scris din nou aici): semifabricatul are aceeași oglindă, cu marginea lui (`margine` e
 * cea a contractului, adică banda, șanțul și marginea omului), iar dopul e decupat prin placa de grosime T, cu punți de grosime
 * gp de la fundul ei. Piesa păstrată e componenta conexă a celulelor netăiate până la vârful punților (adâncimea < T − gp) care
 * cuprinde desenul: tăietura și punțile o despart de rest (punțile rupte). Numai piesa păstrată are lemn la așezare și la măsuri;
 * `pastrate` spune câte celule are, iar `intindere`, cât de departe de desen ajunge (cel mai mare d al celulelor ei din afară).
 * Cere T − gp mai adânc decât fundul benzii (S + H), ca punțile să se deosebească de fund pe suprafață.
 */
import { judeca, type GrilaOracol, type SculaOracol } from './simulare.ts';

export type PunctO = readonly [number, number];
/** O regiune par-impar: poligoane închise (ultimul vârf se leagă de primul), în mm, pe foaie. */
export type DesenO = readonly (readonly PunctO[])[];

/** Distanța exactă de la (x, y) la conturul desenului și dacă punctul e în regiune (par-impar). */
export function laDesen(desen: DesenO, x: number, y: number): { readonly d: number; readonly inauntru: boolean } {
  let d = Infinity, inauntru = false;
  for (const pol of desen) {
    for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
      const [ax, ay] = pol[j]!, [bx, by] = pol[i]!;
      const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
      const s = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2)) : 0;
      d = Math.min(d, Math.hypot(x - ax - s * vx, y - ay - s * vy));
      if ((ay > y) !== (by > y) && x < ax + ((y - ay) * vx) / vy) inauntru = !inauntru;
    }
  }
  return { d, inauntru };
}

/** Cutia desenului. */
export function cutieDesen(desen: DesenO): { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pol of desen) for (const [x, y] of pol) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

/**
 * Suprafața unei plăci după program: textul tăiat la fiecare `T… M6`, bucata k judecată cu `scule[k]`, apoi minimul pe celule.
 * Câte scule, atâtea bucăți: altfel aruncă (o schimbare de sculă nedeclarată ar judeca o tăietură cu altă freză).
 */
export function suprafataPeScule(text: string, grila: GrilaOracol, scule: readonly SculaOracol[]): { readonly z: Float64Array; readonly nx: number; readonly ny: number } {
  const bucati = text.split(/^T\d+ M6$/m);
  if (bucati.length !== scule.length) throw new Error(`programul are ${bucati.length} bucăți între schimbări de sculă, iar sculele date sunt ${scule.length}`);
  let z: Float64Array | null = null, nx = 0, ny = 0;
  for (const [k, bucata] of bucati.entries()) {
    // O bucată de după `T… M6` pornește cu poziția necunoscută; cititorul o cere cunoscută înainte de a coborî.
    const r = judeca(k === 0 ? bucata : `G90 G21\n${bucata}`, grila, scule[k]!);
    if (z === null) { z = Float64Array.from(r.z); nx = r.nx; ny = r.ny; continue; }
    for (let i = 0; i < z.length; i++) z[i] = Math.min(z[i]!, r.z[i]!);
  }
  if (z === null) throw new Error('niciun program');
  return { z, nx, ny };
}

export type ParametriPotrivire = {
  /** Adâncimea locașului, jocul pentru clei, spațiul pentru fierăstrău (mm). */
  readonly D: number; readonly g: number; readonly H: number;
  /** Marginea semifabricatului în jurul cutiei desenului (mm). */
  readonly margine: number;
  /** Unghiul inclus al frezei în V (grade). */
  readonly unghi: number;
  /** Latura celulei grilei (mm). */
  readonly celula: number;
  /** Cât se lărgește fereastra în jurul cutiei desenului (mm); cel mult marginea, ca fereastra să rămână în semifabricat. */
  readonly lat: number;
  /** Sub cât jocul înseamnă contact (mm). */
  readonly pragContact?: number;
  /** Dopul decupat (ADR 0172): grosimea plăcii lui și a punților, mm; piesa păstrată e cea din tăietură (vezi antetul). */
  readonly decupare?: { readonly grosimePlaca: number; readonly grosimePunte: number };
};

export type Banda = { readonly n: number; readonly min: number; readonly med: number; readonly max: number };

export type MasuraPotrivire = {
  readonly asezare: number;
  readonly contact: number; readonly nContact: number;
  readonly sub: Banda; readonly intre: Banda;
  readonly umplere: number;
  /** Unde s-a oprit dopul (celula cu F + M minim), pe foaie. */
  readonly oprire: PunctO;
  /** Cu decupare: câte celule are piesa păstrată și cât de departe de desen ajunge (mm); fără ea, NaN. */
  readonly pastrate: number; readonly intindere: number;
};

const banda = (v: number[]): Banda => {
  if (v.length === 0) return { n: 0, min: NaN, med: NaN, max: NaN };
  v.sort((a, b) => a - b);
  return { n: v.length, min: v[0]!, med: v[Math.floor((v.length - 1) / 2)]!, max: v[v.length - 1]! };
};

/**
 * Potrivirea: locașul (pe foaie) și dopul (pe semifabricatul lui), fiecare cu sculele lui, judecate pe grile care își
 * corespund celulă cu celulă prin oglinda din contract: celula i a locașului e celula nx − 1 − i a dopului, pe X; pe Y, aceeași.
 */
export function masoaraPotrivirea(
  locas: { readonly text: string; readonly scule: readonly SculaOracol[] },
  dop: { readonly text: string; readonly scule: readonly SculaOracol[] },
  desen: DesenO,
  p: ParametriPotrivire,
): MasuraPotrivire {
  if (!(p.lat <= p.margine)) throw new Error(`fereastra (${p.lat} mm în jurul desenului) trebuie să stea în semifabricat (marginea ${p.margine} mm)`);
  const { x0, y0, x1, y1 } = cutieDesen(desen);
  const c = p.celula;
  const nx = Math.ceil((x1 - x0 + 2 * p.lat) / c), ny = Math.ceil((y1 - y0 + 2 * p.lat) / c);
  const gx0 = x0 - p.lat, gy0 = y0 - p.lat;
  const grilaLocas: GrilaOracol = { x0: gx0, y0: gy0, latime: nx * c, inaltime: ny * c, celula: c };
  // Perechea pe dop a celulei (i, j): x' = x1 + m − x, y' = y − y0 + m; centrul celulei i, gx0 + (i + ½)c, ajunge la centrul celulei
  // nx − 1 − i a grilei dopului dacă originea ei e x1 + m − gx0 − nx·c.
  const grilaDop: GrilaOracol = { x0: x1 + p.margine - gx0 - nx * c, y0: gy0 - y0 + p.margine, latime: nx * c, inaltime: ny * c, celula: c };
  const L = suprafataPeScule(locas.text, grilaLocas, locas.scule);
  const M = suprafataPeScule(dop.text, grilaDop, dop.scule);
  if (L.nx !== nx || L.ny !== ny || M.nx !== nx || M.ny !== ny) throw new Error('grilele nu au aceleași dimensiuni');
  const F = (i: number, j: number): number => -L.z[j * nx + i]!;
  const Mz = (i: number, j: number): number => -M.z[j * nx + (nx - 1 - i)]!;
  const t = Math.tan((p.unghi * Math.PI) / 360);
  const S = p.D - p.g, prag = p.pragContact ?? 0.05;
  // Piesa păstrată (ADR 0172): fără decupare, tot semifabricatul; cu ea, umplerea de la desen pe celulele netăiate până la
  // vârful punților. Atinge marginea ferestrei: tăietura nu e în fereastră (sau lipsește), deci piesa nu se poate judeca.
  const pastrata = new Uint8Array(nx * ny).fill(p.decupare ? 0 : 1);
  let pastrate = Number.NaN, intindere = Number.NaN;
  if (p.decupare) {
    const varfPunte = p.decupare.grosimePlaca - p.decupare.grosimePunte;
    if (!(varfPunte > S + p.H + 0.05)) {
      throw new Error(`vârful punților (${varfPunte} mm) trebuie să fie sub fundul benzii (${S + p.H} mm), ca să se deosebească de el`);
    }
    const coada: number[] = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (laDesen(desen, gx0 + (i + 0.5) * c, gy0 + (j + 0.5) * c).inauntru && Mz(i, j) < varfPunte - 0.05) { pastrata[j * nx + i] = 1; coada.push(j * nx + i); }
    }
    while (coada.length > 0) {
      const k = coada.pop()!, i = k % nx, j = (k - i) / nx;
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) throw new Error('piesa păstrată atinge marginea ferestrei: tăietura lipsește sau nu e în fereastră');
      for (const [ii, jj] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]] as const) {
        const kk = jj * nx + ii;
        if (!pastrata[kk] && Mz(ii, jj) < varfPunte - 0.05) { pastrata[kk] = 1; coada.push(kk); }
      }
    }
    pastrate = 0;
    intindere = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (!pastrata[j * nx + i]) continue;
      pastrate++;
      const { d, inauntru } = laDesen(desen, gx0 + (i + 0.5) * c, gy0 + (j + 0.5) * c);
      if (!inauntru) intindere = Math.max(intindere, d);
    }
  }
  let asezare = Infinity, oprire: PunctO = [NaN, NaN];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!pastrata[j * nx + i]) continue;
    const s = F(i, j) + Mz(i, j);
    if (s < asezare) { asezare = s; oprire = [gx0 + (i + 0.5) * c, gy0 + (j + 0.5) * c]; }
  }
  const pereti: number[] = [], sub: number[] = [], intre: number[] = [];
  let volum = 0, umplut = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = gx0 + (i + 0.5) * c, y = gy0 + (j + 0.5) * c;
    const { d, inauntru } = laDesen(desen, x, y);
    const f = F(i, j), m = Mz(i, j), joc = f + m - asezare;
    if (inauntru) {
      volum += f;
      umplut += Math.min(f, Math.max(0, asezare - m));
      if (d > 2 * c && d < S * t - 2 * c) pereti.push(joc);
      if (d >= p.D * t + 2 * c) sub.push(joc);
    } else if (d >= p.H * t + 2 * c && pastrata[j * nx + i]) {
      intre.push(joc);
    }
  }
  return {
    asezare, oprire,
    contact: pereti.length > 0 ? pereti.filter((x) => x < prag).length / pereti.length : NaN, nContact: pereti.length,
    sub: banda(sub), intre: banda(intre),
    umplere: volum > 0 ? umplut / volum : NaN,
    pastrate, intindere,
  };
}
