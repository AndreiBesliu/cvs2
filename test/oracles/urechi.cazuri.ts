/**
 * Cazurile oracolului urechilor (ADR 0028), cu ZERO importuri din `src/`:
 * - `CAZURI_URECHI`: cazurile pe hârtie din §6 (cele 6 din ediția întâi pe foaia de 3 mm, gaura cu 3 urechi, cazul ca
 *   placa 2, supracursa), fiecare cu documentul v5, traseul analitic (din `regiune.ts`) și PERIMETRUL scris ca formulă
 *   închisă, pe hârtie (nu citit din program și nu din primitive: acelea sunt a doua cale, verificată în teste);
 * - un SCRIITOR de programe cu urechi „cum cere contractul” (`programUrechi`), cu propria lui copie a formulelor din
 *   §3 (nu cea din `urechi.ts`), plus MARTORII NEGATIVI din §6, ca mutații ale lui: Z binar pe vârfuri, vârful măsurat
 *   de la adâncimea tăieturii, centrele la k·S, palierul strâns la 0,9·S, flancul pe arc scris ca o coardă;
 * - `corpusUrechi`: corpusul 2.3a / 2.3b (geometria lui) adus la v5, cu grosimea foii, adâncimile și urechile alese de
 *   un PRNG propriu (mulberry32), toate încăpând pe hârtie (W ≤ 0,72·S pe traseul ideal).
 */
import { migreazaV4V5O, type DocV4O, type DocV5O, type LaturaO, type SensO, type UrechiO } from './document.ts';
import { contur, lungime, punctLa, startul, type FormaO, type Primitiva } from './regiune.ts';
import { aleator, cerc, corpus, drept, laMasina, simple, type CazCorpus, type Montaj, type Stoc } from './regiune.cazuri.ts';
import { orientat, trigonometric, treceri as trecerileOperatiei } from './sens.cazuri.ts';

// ---------------------------------------------------------------------------------------------------------------
// Documentele.

export type FormaUrechi = { readonly id: string; readonly forma: FormaO; readonly x: number; readonly y: number; readonly latura: LaturaO; readonly sens?: SensO };

/** Un document v5 cu o operație pe fiecare formă, toate cu aceleași urechi, adâncime și pas. */
export function docUrechi(
  stoc: Stoc, forme: readonly FormaUrechi[],
  o: { readonly diametru: number; readonly adancime: number; readonly pas: number; readonly urechi: UrechiO | null },
): DocV5O {
  const v4 = simple(stoc, forme.map((f) => ({ id: f.id, forma: f.forma, x: f.x, y: f.y, laturi: [f.latura], sensuri: [f.sens ?? 'urcare'] })), {
    diametru: o.diametru, adancime: o.adancime, pas: o.pas,
  });
  const v5 = migreazaV4V5O(v4);
  for (const p of v5.piese) for (const op of p.operatii) op.urechi = o.urechi === null ? null : { ...o.urechi };
  return v5;
}

// ---------------------------------------------------------------------------------------------------------------
// Cazurile pe hârtie (ADR 0028 §6).

export type CazUrechi = {
  readonly nume: string;
  readonly stoc: Stoc;
  readonly forma: FormaUrechi;
  readonly diametru: number;
  readonly adancime: number;
  readonly pas: number;
  readonly urechi: UrechiO;
  readonly supracursa: number;
  /** Perimetrul traseului centrului frezei, pe hârtie (formula închisă). */
  readonly P: number;
  readonly doc: DocV5O;
};

const caz = (
  nume: string, stoc: Stoc, forma: FormaUrechi, adancime: number, pas: number, urechi: UrechiO, P: number, supracursa = 0, diametru = 6,
): CazUrechi => ({ nume, stoc, forma, diametru, adancime, pas, urechi, supracursa, P, doc: docUrechi(stoc, [forma], { diametru, adancime, pas, urechi }) });

const FOAIE_3: Stoc = { latime: 700, inaltime: 300, grosime: 3 };
const u = (numar: number, latime: number, grosime: number): UrechiO => ({ numar, latime, grosime });
const PI = Math.PI;

/**
 * Pe hârtie, freza Ø6 (R = 3) pe exterior: traseul e conturul crescut cu 3, cu colțurile rotunjite cu raza colțului + 3.
 * - dreptunghi a × b, colțuri ascuțite: P = 2(a + b) + 2π·3;
 * - dreptunghi a × b cu colțurile R: P = 2(a + b) − 8R + 2π(R + 3);
 * - cercul R pe exterior: 2π(R + 3); pe interior: 2π(R − 3).
 */
export const CAZURI_URECHI: readonly CazUrechi[] = [
  caz('dreptunghi 300 × 200, 4 × 8', FOAIE_3, { id: 'a', forma: drept(300, 200), x: 50, y: 50, latura: 'exterior' }, 3, 1, u(4, 8, 1.5), 1000 + 6 * PI),
  caz('dreptunghi 300 × 200, 4 × 6', FOAIE_3, { id: 'a', forma: drept(300, 200), x: 50, y: 50, latura: 'exterior' }, 3, 1, u(4, 6, 1.5), 1000 + 6 * PI),
  caz('ușa 300 × 200 cu colțurile R40, 4 × 8', FOAIE_3, { id: 'a', forma: drept(300, 200, 40), x: 50, y: 50, latura: 'exterior' }, 3, 1, u(4, 8, 1.5), 1000 - 320 + 86 * PI),
  caz('cercul R100, 4 × 8', FOAIE_3, { id: 'a', forma: cerc(100), x: 200, y: 150, latura: 'exterior' }, 3, 1, u(4, 8, 1.5), 206 * PI),
  caz('raftul 600 × 100, 4 × 6', FOAIE_3, { id: 'a', forma: drept(600, 100), x: 50, y: 50, latura: 'exterior' }, 3, 1, u(4, 6, 1.5), 1400 + 6 * PI),
  caz('dreptunghi 300 × 200, 8 × 6', FOAIE_3, { id: 'a', forma: drept(300, 200), x: 50, y: 50, latura: 'exterior' }, 3, 1, u(8, 6, 1.5), 1000 + 6 * PI),
  caz('gaura R50 (interior), 3 × 8', FOAIE_3, { id: 'g', forma: cerc(50), x: 200, y: 150, latura: 'interior' }, 3, 1, u(3, 8, 1.5), 94 * PI),
  // Placa 2: 120 × 80 cu colțurile R10, MDF 12, adâncimea 12 în pași de 4, urechile implicite 4 × 8 × 2: P = 400 − 80 + 26π.
  caz('ca placa 2: 120 × 80 R10, MDF 12, 4 × 8 × 2', { latime: 200, inaltime: 150, grosime: 12 }, { id: 'p', forma: drept(120, 80, 10), x: 40, y: 35, latura: 'exterior' }, 12, 4, u(4, 8, 2), 320 + 26 * PI),
  // Supracursa 0,3 pe o foaie de 18: adâncimea 18,3, g = 2, deci vârful la 16 (puntea 2,0), nu la 16,3.
  caz('supracursa 0,3: 300 × 200 pe foaia 18, adâncimea 18,3, g = 2', { latime: 400, inaltime: 300, grosime: 18 }, { id: 'a', forma: drept(300, 200), x: 50, y: 50, latura: 'exterior' }, 18.3, 6.1, u(4, 8, 2), 1000 + 6 * PI, 0.3),
];

/** Vârful urechii (ADR 0028 §2), pe hârtie: de la fața de sus, grosimea foii minus puntea. */
export const varfHartie = (c: { readonly stoc: Stoc; readonly urechi: UrechiO }): number => c.stoc.grosime - c.urechi.grosime;

/** Traseul analitic al centrului frezei, în document (din conturul exact al formei, `regiune.ts`), trigonometric. */
export function drumAnalitic(f: FormaUrechi, diametru: number): Primitiva[] {
  const c = contur(f.forma, { a: 1, b: 0, c: 0, d: 1, e: f.x, f: f.y });
  if (f.latura === 'pe-linie') return [...c.primitive];
  const d = c.drumIdeal(diametru / 2, f.latura);
  if (!d) throw new Error(`${f.id}: scula nu încape`);
  return d;
}

// ---------------------------------------------------------------------------------------------------------------
// Scriitorul de programe cu urechi, cu propria copie a formulelor (§3), și martorii negativi (§6).

/** Martorii negativi: fiecare e o greșeală cunoscută a unui emitent. */
export type Martor = 'binar' | 'varf-din-adancime' | 'centre-k-s' | 'strangere' | 'coarda';

export type TraseuUrechi = {
  readonly eticheta: string | null;
  /** Drumul, în sensul de mers, din vârful 0 (pornirea). */
  readonly drum: readonly Primitiva[];
  readonly adancime: number;
  readonly pas: number;
  readonly grosimeFoaie: number;
  readonly urechi: UrechiO | null;
  readonly martor?: Martor;
  /** Între treceri: ridicare (implicit, ca aplicația) sau coborâre pe verticală, fără ridicare. */
  readonly intre?: 'ridica' | 'coboara';
  /** Abateri mici, pentru toleranțele porții: centrele mutate cu `centre` mm pe buclă, palierul ridicat cu `palier` mm. */
  readonly abatere?: { readonly centre?: number; readonly palier?: number };
  /** `false`: martorul de dinainte de precizarea din 09.10 (flancul care coboară, cu avansul de tăiere). */
  readonly avansFlanc?: boolean;
};

const f3 = (v: number): string => {
  const s = v.toFixed(3);
  return s === '-0.000' ? '0.000' : s;
};

/** Profilul scriitorului: Z(s) pe o trecere de adâncime d, cu urechile date (a doua copie a formulelor din §3). */
function profilScriitor(
  P: number, u: UrechiO, varf0: number, d: number, martor?: Martor, abatere: { readonly centre?: number; readonly palier?: number } = {},
): { z: (s: number) => number; rupturi: number[] } | null {
  const varf = varf0 - (abatere.palier ?? 0);
  const n = u.numar;
  const S = P / n;
  let W = u.latime;
  if (W > 0.9 * S) {
    if (martor !== 'strangere') return null;
    W = 0.9 * S;
  }
  const h = W / 2;
  const l = Math.min(h, 0.45 * (S - W));
  const c = Array.from({ length: n }, (_, k) => (martor === 'centre-k-s' ? k * S : (k + 0.5) * S) + (abatere.centre ?? 0));
  // Distanța pe buclă (cu trecerea peste pornire, ca martorul cu o ureche pe plonjare să fie scris întreg).
  const dist = (s: number, ck: number): number => {
    const a = Math.abs(s - ck);
    return Math.min(a, P - a);
  };
  if (martor === 'binar') {
    const z = (s: number): number => (c.some((ck) => dist(s, ck) <= h + 1e-9) ? -varf : -d);
    const rupturi = c.flatMap((ck) => [ck - h, ck + h]).map((q) => ((q % P) + P) % P);
    return { z, rupturi };
  }
  const z = (s: number): number => {
    for (const ck of c) {
      const x = dist(s, ck);
      if (x <= h) return -varf;
      if (x < h + l) return -varf - ((d - varf) * (x - h)) / l;
    }
    return -d;
  };
  const rupturi = c.flatMap((ck) => [ck - h - l, ck - h, ck + h, ck + h + l]).map((q) => ((q % P) + P) % P);
  return { z, rupturi };
}

/**
 * Programul complet (antetul ca al aplicației), cu fiecare traseu: eticheta, rapida deasupra pornirii, apoi trecerile.
 * Pe fiecare trecere: plonjarea la −d, apoi primitivele tăiate în rupturile profilului și (arcele) în bucăți de cel
 * mult 90°, cu Z-ul de la capătul fiecărei bucăți scris doar când se schimbă (§4); pe o bucată care coboară, avansul
 * F = min(1000, 300·L₃ / |ΔZ|) (precizarea din 09.10), iar F1000.0 se scrie din nou pe bucata de după. Între treceri: ridicare la Z sigur
 * și plonjare (ca aplicația) sau coborâre pe verticală. Martorul `binar` taie doar la marginile palierului și dă
 * fiecărui vârf Z-ul lui (urcarea pe toată latura dinainte); `coarda` scrie bucățile de flanc de pe arce ca G1.
 */
export function programUrechi(trasee: readonly TraseuUrechi[], montaj: Montaj): string {
  const M = laMasina(montaj);
  const zSus = M(0, 0, 5)[2];
  const L: string[] = ['(CNC Vector Studio)', 'G90 G17 G21 G94', 'G54', `G0 Z${f3(zSus)}`, 'M3 S18000', 'G4 P3.000'];
  for (const t of trasee) {
    if (t.eticheta !== null) L.push(`(${t.eticheta})`);
    const s0 = startul(t.drum[0]!);
    const P = t.drum.reduce((s, p) => s + lungime(p), 0);
    const varf = t.urechi === null ? Infinity : (t.martor === 'varf-din-adancime' ? t.adancime : t.grosimeFoaie) - t.urechi.grosime;
    trecerileOperatiei(t.adancime, t.pas).forEach((d, k) => {
      const [x0, y0, zj] = M(s0.x, s0.y, -d);
      if (k === 0) L.push(`G0 X${f3(x0)} Y${f3(y0)}`);
      else if ((t.intre ?? 'ridica') === 'ridica') L.push(`G0 Z${f3(zSus)}`);
      L.push(`G1 Z${f3(zj)} F300.0`);
      const pr = t.urechi !== null && d > varf ? profilScriitor(P, t.urechi, varf, d, t.martor, t.abatere) : null;
      if (t.urechi !== null && d > varf && pr === null) throw new Error('urechile nu încap: scriitorul refuză, ca exportul');
      const zDe = (s: number): number => (pr ? pr.z(s) : -d);
      let zScris = f3(zj);
      let fScris = '300.0';
      let sCur = 0;
      for (const p of t.drum) {
        if (p.tip === 'punct') continue;
        const Lp = lungime(p);
        const taieturi = new Set<number>();
        for (const q of pr?.rupturi ?? []) if (q > sCur + 1e-6 && q < sCur + Lp - 1e-6) taieturi.add(q - sCur);
        if (p.tip === 'arc') {
          const bucati = Math.max(1, Math.ceil(Math.abs(p.du) / (PI / 2) - 1e-9));
          for (let j = 1; j < bucati; j++) taieturi.add((Lp * j) / bucati);
        }
        const capete = [...taieturi].sort((a, b) => a - b).concat([Lp]);
        let prec = 0;
        for (const e of capete) {
          const a = punctLa(p, prec), b = punctLa(p, e);
          const zA = zDe(sCur + prec), zB = zDe(sCur + e);
          const [xb, yb, zb] = M(b.x, b.y, zB);
          const zTxt = f3(zb) === zScris ? '' : ` Z${f3(zb)}`;
          zScris = f3(zb);
          // §4, precizarea din 09.10: pe o bucată care coboară, viteza pe verticală ≤ avansul de plonjare (300).
          const L3 = Math.hypot(e - prec, zA - zB);
          const fVrut = zB < zA - 1e-12 && t.avansFlanc !== false ? Math.min(1000, (300 * L3) / (zA - zB)) : 1000;
          const fTxt = fVrut.toFixed(1);
          const f = fTxt === fScris ? '' : ` F${fTxt}`;
          fScris = fTxt;
          const coarda = t.martor === 'coarda' && Math.abs(zA - zB) > 1e-9;
          if (p.tip === 'segment' || coarda) {
            L.push(`G1 X${f3(xb)} Y${f3(yb)}${zTxt}${f}`);
          } else {
            const [xa, ya] = M(a.x, a.y, 0);
            const [cx, cy] = M(p.c.x, p.c.y, 0);
            const i = cx - Number(f3(xa)), j = cy - Number(f3(ya));
            L.push(`${p.du > 0 ? 'G3' : 'G2'} X${f3(xb)} Y${f3(yb)}${zTxt} I${f3(i)} J${f3(j)}${f}`);
          }
          prec = e;
        }
        sCur += Lp;
      }
    });
    L.push(`G0 Z${f3(zSus)}`);
  }
  L.push('M5', 'M30');
  return `${L.join('\n')}\n`;
}

/**
 * Drumul cerut pentru o formă (traseul analitic, orientat după latură și sens: ADR 0027 §1, scris în `sens.cazuri.ts`),
 * pornit din vârful `pornire` (indicele primitivei; pe un cerc, unghiul pornirii în radiani).
 */
export function drumCerut(f: FormaUrechi, diametru: number, pornire = 0): Primitiva[] {
  const ideal = drumAnalitic(f, diametru);
  const trig = f.latura === 'pe-linie' ? true : trigonometric(f.latura, f.sens ?? 'urcare');
  const o = orientat(ideal, trig);
  if (o.length === 1 && o[0]!.tip === 'arc') {
    const a = o[0]!;
    return [{ ...a, u0: a.u0 + pornire }];
  }
  const k = ((pornire % o.length) + o.length) % o.length;
  return [...o.slice(k), ...o.slice(0, k)];
}

/** Programul unui caz de hârtie, scris de scriitorul de mai sus (cu un martor, dacă e dat). */
export function programCaz(
  c: CazUrechi, montaj: Montaj,
  o: {
    readonly martor?: Martor; readonly pornire?: number; readonly intre?: 'ridica' | 'coboara'; readonly urechi?: UrechiO | null;
    readonly abatere?: TraseuUrechi['abatere']; readonly avansFlanc?: boolean;
  } = {},
): string {
  return programUrechi([{
    eticheta: `${c.forma.id}/${c.forma.id}: ${c.forma.forma.tip}, ${c.forma.latura}, ${c.adancime} mm`,
    drum: drumCerut(c.forma, c.diametru, o.pornire ?? 0),
    adancime: c.adancime, pas: c.pas, grosimeFoaie: c.stoc.grosime, urechi: o.urechi === undefined ? c.urechi : o.urechi,
    ...(o.martor ? { martor: o.martor } : {}), ...(o.intre ? { intre: o.intre } : {}), ...(o.abatere ? { abatere: o.abatere } : {}),
    ...(o.avansFlanc === undefined ? {} : { avansFlanc: o.avansFlanc }),
  }], montaj);
}

// ---------------------------------------------------------------------------------------------------------------
// Corpusul pentru lipire: geometria corpusului 2.3a / 2.3b, adusă la v5, cu urechi care încap.

export type CazCorpusUrechi = Omit<CazCorpus, 'doc'> & { readonly doc: DocV5O; readonly v4: DocV4O; readonly cuUrechi: number };

/** Perimetrul ideal al fiecărei tăieturi a foii 0 (pentru a alege urechi care încap), pe element și latură. */
function perimetreIdeale(doc: DocV4O, D: number): Map<string, number> {
  const rez = new Map<string, number>();
  const v5 = migreazaV4V5O(doc);
  for (const p of v5.piese) {
    for (const op of p.operatii) {
      for (const inst of v5.foi[0]!.instante.filter((i) => i.piesa === p.id)) {
        // Perimetrul nu depinde de așezare (similitudini de scară 1 în corpus), deci elementul local ajunge.
        const el = (function cauta(n: unknown): { forma: FormaO; matrice: { a: number; b: number; c: number; d: number; e: number; f: number } } | null {
          const x = n as { tip: string; id: string; forma?: FormaO; matrice: { a: number; b: number; c: number; d: number; e: number; f: number }; copii?: unknown[] };
          if (x.tip === 'element') return x.id === op.noduri[0] ? { forma: x.forma!, matrice: x.matrice } : null;
          for (const c of x.copii ?? []) { const r = cauta(c); if (r) return r; }
          return null;
        })(p.radacina);
        if (!el) continue;
        let P = Infinity;
        try {
          const c = contur(el.forma, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
          const drum = op.latura === 'pe-linie' ? c.primitive : c.drumIdeal(D / 2, op.latura);
          if (drum) P = drum.reduce((s, q) => s + lungime(q), 0);
        } catch { /* formă pe care conturul n-o face: fără urechi */ }
        const cheie = `${inst.id}/${op.id}`;
        rez.set(cheie, Math.min(rez.get(cheie) ?? Infinity, P));
      }
    }
  }
  return rez;
}

/**
 * Corpusul 2.3a / 2.3b (`corpus()`, cu sensurile lui) adus la v5. Pe fiecare caz: grosimea foii aleasă din 3, 6, 12, 18
 * mm; pe fiecare operație, adâncimea (prin foaie sau mai puțin, dar peste vârf), pasul și urechile (în 3 din 4 cazuri),
 * cu D ≤ W ≤ 0,72·S pe cel mai scurt traseu ideal al operației (încap cu marjă; W < D e refuzat, precizarea din
 * 09.10). `v4` e același document fără urechi.
 */
export function corpusUrechi(samanta = 0x24ec): CazCorpusUrechi[] {
  const r = aleator(samanta);
  const alege = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
  return corpus().map((c) => {
    const T = alege([3, 6, 12, 18] as const);
    const v4 = structuredClone(c.doc);
    for (const f of v4.foi) f.stoc.grosime = T;
    const P = perimetreIdeale(v4, c.diametru);
    const v5 = migreazaV4V5O(v4);
    let cuUrechi = 0;
    v5.piese.forEach((p, ip) => {
      p.operatii.forEach((op, k) => {
        const g = Math.round((0.5 + r() * (T * 0.6)) * 10) / 10;
        const varf = T - g;
        const adancime = r() < 0.6 ? T : Math.round((varf + 0.2 + r() * (T - varf - 0.2)) * 100) / 100;
        const pas = alege([1, 2, 3, 4, 6] as const);
        op.adancime = adancime;
        op.pas = pas;
        const op4 = v4.piese[ip]!.operatii[k]!;
        op4.adancime = adancime;
        op4.pas = pas;
        if (r() < 0.25) return;
        const Pmin = Math.min(...[...P].filter(([cheie]) => cheie.endsWith(`/${op.id}`)).map(([, v]) => v));
        if (!Number.isFinite(Pmin) || Pmin < 1) return;
        const n = 1 + Math.floor(r() * 6);
        const Wmax = 0.72 * (Pmin / n);
        const D = c.diametru;
        const W = Math.round(Math.min(Math.max(12, D), Math.max(D, Wmax * (0.2 + 0.8 * r()))) * 1000) / 1000;
        if (W > Wmax || W < D) return;
        op.urechi = { numar: n, latime: W, grosime: g };
        cuUrechi++;
      });
    });
    return { ...c, doc: v5, v4, cuUrechi };
  });
}
