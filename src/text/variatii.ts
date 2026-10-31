/**
 * Instanțele fonturilor variabile (ADR 0113), citite din octeții fontului, cu aritmetica instancer-ului lui fontTools (oracolul):
 * - **coordonatele** omului (în unitățile axelor din `fvar`) se normalizează: tăiate la marginile axei, aduse la −1…0…1,
 *   trecute prin harta `avar` (versiunea 1; a doua, cu variațiile hărții, nu se citește) și rotunjite la F2Dot14, o singură
 *   dată, după hartă;
 * - **contururile** primesc deltele din `gvar`: fiecare tuplu cu factorul regiunii lui (vârful și, dacă are, regiunea
 *   intermediară), pe punctele lui (toate, cele comune ale glifei sau ale lui), cu deltele împachetate; punctele fără deltă
 *   ale unui contur se interpolează din vecinii cu deltă (IUP). La o glifă compusă, „punctele” sunt deplasările componentelor
 *   (cele fără deltă rămân pe loc); după ele vin cele 4 puncte fantomă (stânga, dreapta, sus, jos);
 * - **magazinele de variații** (`ItemVariationStore`) dau avansul din `HVAR`, crenarea (dispozitivele `VariationIndex` din
 *   GPOS, magazinul din GDEF) și înălțimea majusculelor din `MVAR` (`cpht`), rotunjite ca la fontTools.
 *
 * Factorul unei axe urmează specificația (și HarfBuzz): o regiune greșită (începutul după vârf, vârful după capăt, sau peste
 * zero) nu contează pe axa aceea, pe când instancer-ul aruncă tot tuplul. Fonturile reale n-au așa ceva.
 */
import { FontStricat, type Octeti, type Tabele } from './sfnt.ts';

/** O axă din `fvar`: eticheta și marginile ei, în unitățile omului (grosimea 100–900, lățimea în procente…). */
export type AxaFont = { readonly tag: string; readonly min: number; readonly implicit: number; readonly max: number };

/** Harta `avar` a unei axe: coordonata normalizată → cea folosită (F2Dot14), în ordinea fișierului (ultima pereche câștigă). */
export type HartaAvar = ReadonlyMap<number, number>;

/** Rotunjirea OpenType (și a lui fontTools, `otRound`): .5 urcă spre +∞. */
export const rotunjeste = (v: number): number => Math.floor(v + 0.5);

/** Axele din `fvar` (null: fontul nu e variabil). */
export function axeFvar(o: Octeti, t: Tabele): AxaFont[] | null {
  const f = t.get('fvar');
  if (!f) return null;
  const axe = f.pos + o.u16(f.pos + 4), n = o.u16(f.pos + 8), marime = o.u16(f.pos + 10);
  const rez: AxaFont[] = [];
  for (let k = 0; k < n; k++) {
    const r = axe + k * marime;
    rez.push({ tag: o.tag(r), min: o.fixed(r + 4), implicit: o.fixed(r + 8), max: o.fixed(r + 12) });
  }
  return rez;
}

/** Hărțile `avar` ale axelor, în ordinea lor, și versiunea tabelului; null: fontul n-are `avar`. */
export function hartiAvar(o: Octeti, t: Tabele, nAxe: number): { readonly versiune: number; readonly harti: readonly HartaAvar[] } | null {
  const a = t.get('avar');
  if (!a) return null;
  const versiune = o.u16(a.pos);
  if (o.u16(a.pos + 6) !== nAxe) throw new FontStricat(`avar are ${o.u16(a.pos + 6)} axe, fvar ${nAxe}`);
  const harti: Map<number, number>[] = [];
  let p = a.pos + 8;
  for (let k = 0; k < nAxe; k++) {
    const n = o.u16(p);
    const h = new Map<number, number>();
    for (let i = 0; i < n; i++) h.set(o.f2dot14(p + 2 + 4 * i), o.f2dot14(p + 4 + 4 * i));
    harti.push(h);
    p += 2 + 4 * n;
  }
  return { versiune, harti };
}

/** O coordonată normalizată dusă prin harta `avar` (ca `piecewiseLinearMap`): exact pe o pereche, liniar între, mutată în afară. */
function peHarta(v: number, h: HartaAvar): number {
  const exact = h.get(v);
  if (exact !== undefined) return exact;
  let min = Infinity, max = -Infinity, jos = -Infinity, sus = Infinity;
  for (const k of h.keys()) {
    min = Math.min(min, k);
    max = Math.max(max, k);
    if (k < v) jos = Math.max(jos, k);
    if (k > v) sus = Math.min(sus, k);
  }
  if (v < min) return v + h.get(min)! - min;
  if (v > max) return v + h.get(max)! - max;
  const a = h.get(jos)!, b = h.get(sus)!;
  return a + ((b - a) * (v - jos)) / (sus - jos);
}

/**
 * Coordonatele normalizate, în ordinea axelor (ADR 0113 §1): o axă lipsă din `coordonate` stă la valoarea ei implicită, una
 * în afara marginilor se taie la ele; apoi −1…0…1 (față de implicit), harta `avar` și F2Dot14.
 */
export function normalizeaza(axe: readonly AxaFont[], harti: readonly HartaAvar[] | null, coordonate: Readonly<Record<string, number>>): number[] {
  return axe.map((a, k) => {
    const dat = coordonate[a.tag];
    const v = dat === undefined || !Number.isFinite(dat) ? a.implicit : Math.min(Math.max(dat, a.min), a.max);
    let n = v === a.implicit || a.min === a.max ? 0 : v < a.implicit ? (v - a.implicit) / (a.implicit - a.min) : (v - a.implicit) / (a.max - a.implicit);
    const h = harti?.[k];
    if (h && h.size > 0) n = peHarta(n, h);
    return rotunjeste(n * 16384) / 16384;
  });
}

/**
 * Factorul unei regiuni la coordonatele `c`: produsul factorilor axelor ei. Pe o axă cu vârful 0, cu regiunea greșită sau
 * peste zero, factorul e 1 (axa nu contează); în afara regiunii, 0; altfel, liniar spre margini.
 */
export function factorRegiune(c: readonly number[], inceput: ArrayLike<number>, varf: ArrayLike<number>, capat: ArrayLike<number>): number {
  let s = 1;
  for (let i = 0; i < varf.length; i++) {
    const p = varf[i]!, a = inceput[i]!, b = capat[i]!;
    if (p === 0 || a > p || p > b || (a < 0 && b > 0)) continue;
    const v = c[i] ?? 0;
    if (v === p) continue;
    if (v <= a || b <= v) return 0;
    s *= v < p ? (v - a) / (p - a) : (v - b) / (p - b);
  }
  return s;
}

/** Numerele punctelor împachetate de la `p` (ADR 0113 §2): null = toate punctele glifei; și unde se termină. */
export function puncteImpachetate(o: Octeti, p: number): { readonly puncte: number[] | null; readonly capat: number } {
  let n = o.u8(p++);
  if (n & 0x80) n = ((n & 0x7f) << 8) | o.u8(p++);
  if (n === 0) return { puncte: null, capat: p };
  const puncte: number[] = [];
  let curent = 0;
  while (puncte.length < n) {
    const h = o.u8(p++);
    for (let k = (h & 0x7f) + 1; k > 0; k--) {
      if (h & 0x80) {
        curent += o.u16(p);
        p += 2;
      } else curent += o.u8(p++);
      puncte.push(curent);
    }
  }
  return { puncte, capat: p };
}

/** `n` delte împachetate de la `p`: șiruri de zero, de octeți, de cuvinte sau de numere pe 32 de biți; și unde se termină. */
export function delteImpachetate(o: Octeti, p: number, n: number): { readonly delte: number[]; readonly capat: number } {
  const delte: number[] = [];
  while (delte.length < n) {
    const h = o.u8(p++);
    const fel = h & 0xc0;
    for (let k = (h & 0x3f) + 1; k > 0; k--) {
      if (fel === 0x80) delte.push(0);
      else if (fel === 0x40) {
        delte.push(o.i16(p));
        p += 2;
      } else if (fel === 0xc0) {
        delte.push(o.i32(p));
        p += 4;
      } else delte.push(o.i8(p++));
    }
  }
  if (delte.length !== n) throw new FontStricat(`${delte.length} delte în loc de ${n}`);
  return { delte, capat: p };
}

/** Delta unui punct fără deltă între două puncte de referință, pe o axă (ca `iup_segment` din fontTools). */
function interpoleaza(x: number, x1: number, d1: number, x2: number, d2: number): number {
  if (x1 === x2) return d1 === d2 ? d1 : 0;
  if (x1 > x2) [x1, x2, d1, d2] = [x2, x1, d2, d1];
  if (x <= x1) return d1;
  if (x >= x2) return d2;
  const scara = (d2 - d1) / (x2 - x1);
  return d1 + (x - x1) * scara;
}

/**
 * Deltele implicite ale unui contur, [s, e), din punctele lui cu deltă (`are`), pe fiecare axă din coordonatele implicite
 * (IUP): fără niciun punct cu deltă, zero; altfel, fiecare șir de puncte fără deltă dintre doi vecini cu deltă (și cel care
 * trece de capătul conturului) se interpolează din ei.
 */
export function iup(x0: ArrayLike<number>, y0: ArrayLike<number>, d: Float64Array, are: Uint8Array, s: number, e: number): void {
  const ref: number[] = [];
  for (let i = s; i < e; i++) if (are[i]) ref.push(i);
  if (ref.length === 0 || ref.length === e - s) return;
  const sir = (i1: number, i2: number, r1: number, r2: number): void => {
    for (let i = i1; i < i2; i++) {
      d[2 * i] = interpoleaza(x0[i]!, x0[r1]!, d[2 * r1]!, x0[r2]!, d[2 * r2]!);
      d[2 * i + 1] = interpoleaza(y0[i]!, y0[r1]!, d[2 * r1 + 1]!, y0[r2]!, d[2 * r2 + 1]!);
    }
  };
  const prim = ref[0]!, ultim = ref[ref.length - 1]!;
  if (prim !== s) sir(s, prim, prim, ultim);
  for (let k = 1; k < ref.length; k++) if (ref[k]! - ref[k - 1]! > 1) sir(ref[k - 1]! + 1, ref[k]!, ref[k - 1]!, ref[k]!);
  if (ultim !== e - 1) sir(ultim + 1, e, ultim, prim);
}

/** Un magazin de variații: delta elementului (exterior, interior) la coordonatele lui, nerotunjită; 0 în afara lui. */
export type Magazin = (exterior: number, interior: number) => number;

/** Magazinul de variații (`ItemVariationStore`) de la `pos`, evaluat la coordonatele `c` (factorii regiunilor, ținuți). */
export function magazinVariatii(o: Octeti, pos: number, c: readonly number[]): Magazin {
  if (o.u16(pos) !== 1) throw new FontStricat(`magazinul variațiilor are formatul ${o.u16(pos)}`);
  const regiuni = pos + o.u32(pos + 2), nDate = o.u16(pos + 6);
  const nAxe = o.u16(regiuni), nRegiuni = o.u16(regiuni + 2);
  const factori = new Map<number, number>();
  const factor = (r: number): number => {
    const gata = factori.get(r);
    if (gata !== undefined) return gata;
    if (r >= nRegiuni) throw new FontStricat(`regiunea ${r} din ${nRegiuni}`);
    const a = new Float64Array(nAxe), p = new Float64Array(nAxe), b = new Float64Array(nAxe);
    for (let i = 0; i < nAxe; i++) {
      const q = regiuni + 4 + 6 * (r * nAxe + i);
      a[i] = o.f2dot14(q);
      p[i] = o.f2dot14(q + 2);
      b[i] = o.f2dot14(q + 4);
    }
    const f = factorRegiune(c, a, p, b);
    factori.set(r, f);
    return f;
  };
  return (exterior, interior) => {
    if (exterior >= nDate) return 0;
    const d = pos + o.u32(pos + 8 + 4 * exterior);
    const n = o.u16(d), cuvinte = o.u16(d + 2), nr = o.u16(d + 4);
    if (interior >= n) return 0;
    const lungi = (cuvinte & 0x8000) !== 0, w = cuvinte & 0x7fff;
    if (w > nr) throw new FontStricat(`${w} delte lungi din ${nr}`);
    let q = d + 6 + 2 * nr + interior * ((lungi ? 4 : 2) * w + (lungi ? 2 : 1) * (nr - w));
    let s = 0;
    for (let k = 0; k < nr; k++) {
      let delta: number;
      if (k < w) {
        delta = lungi ? o.i32(q) : o.i16(q);
        q += lungi ? 4 : 2;
      } else {
        delta = lungi ? o.i16(q) : o.i8(q);
        q += lungi ? 2 : 1;
      }
      const f = factor(o.u16(d + 6 + 2 * k));
      if (f !== 0) s += delta * f;
    }
    return s;
  };
}

/**
 * Harta indicilor (`DeltaSetIndexMap`, formatele 0 și 1) de la `pos`: indicele unei glife → (exterior, interior). O glifă
 * după ultima intrare o ia pe ultima; o hartă goală dă indicele însuși.
 */
export function hartaIndici(o: Octeti, pos: number): (i: number) => readonly [number, number] {
  const format = o.u8(pos), intrare = o.u8(pos + 1);
  if (format > 1) throw new FontStricat(`harta indicilor are formatul ${format}`);
  const n = format === 0 ? o.u16(pos + 2) : o.u32(pos + 2);
  const date = pos + (format === 0 ? 4 : 6);
  const marime = ((intrare & 0x30) >> 4) + 1, putere = 2 ** ((intrare & 0x0f) + 1);
  return (i) => {
    if (n === 0) return [Math.floor(i / 65536), i % 65536];
    const k = Math.min(i, n - 1);
    let v = 0;
    for (let b = 0; b < marime; b++) v = v * 256 + o.u8(date + k * marime + b);
    return [Math.floor(v / putere), v % putere];
  };
}

/** Variațiile fontului la o instanță: ce cer contururile, avansurile, crenarea și majuscula. */
export type Variatii = {
  /** Coordonatele normalizate, în ordinea axelor din `fvar`. */
  readonly normalizate: readonly number[];
  /**
   * Deltele glifei `g` (x și y alternate) pentru `total` puncte (ale glifei, apoi cele 4 fantomă), sau null: glifa nu se
   * mișcă aici. `x0`, `y0`: punctele implicite și `capete`: capetele contururilor unei glife simple (IUP); null la o glifă
   * compusă (ori când contează doar punctele fantomă): un punct fără deltă rămâne pe loc.
   */
  delte(g: number, total: number, x0: ArrayLike<number> | null, y0: ArrayLike<number> | null, capete: readonly number[] | null): Float64Array | null;
  /** Avansul din `HVAR` (cel implicit plus delta, rotunjit), sau null: fontul n-are `HVAR` (avansul vine din punctele fantomă). */
  readonly avansHvar: ((g: number, avans: number) => number) | null;
  /** Delta rotunjită a unui dispozitiv din GPOS (un tabel `VariationIndex` la `pos`; altul, de hinting, dă 0). */
  dispozitiv(pos: number): number;
  /** Delta rotunjită a înălțimii majusculelor (`cpht` din `MVAR`). */
  readonly cpht: number;
};

/**
 * Variațiile fontului la coordonatele omului (ADR 0113): null dacă instanța e chiar cea implicită (nimic nu se mișcă), un
 * motiv dacă instanța nu se poate calcula (`avar` 2). Aruncă `FontStricat` pentru tabelele stricate.
 */
export function variatii(o: Octeti, t: Tabele, axe: readonly AxaFont[], coordonate: Readonly<Record<string, number>>, numarGlife: number): Variatii | null | string {
  for (const a of axe) if (!(a.min <= a.implicit && a.implicit <= a.max)) throw new FontStricat(`axa ${a.tag}: ${a.min}, ${a.implicit}, ${a.max}`);
  const avar = hartiAvar(o, t, axe.length);
  if (avar && avar.versiune !== 1) return `avar ${avar.versiune}`;
  const c = normalizeaza(axe, avar?.harti ?? null, coordonate);
  if (c.every((v) => v === 0)) return null;

  const gvar = t.get('gvar');
  let delte: Variatii['delte'] = () => null;
  if (gvar) {
    const p = gvar.pos;
    if (o.u16(p) !== 1) throw new FontStricat(`gvar ${o.u16(p)}.${o.u16(p + 2)}`);
    const nAxe = o.u16(p + 4), nComune = o.u16(p + 6), pComune = p + o.u32(p + 8), nGlife = o.u16(p + 12);
    const lungi = (o.u16(p + 14) & 1) !== 0, date = p + o.u32(p + 16);
    if (nAxe !== axe.length || nGlife !== numarGlife) throw new FontStricat(`gvar: ${nAxe} axe, ${nGlife} glife`);
    if (20 + (nGlife + 1) * (lungi ? 4 : 2) > gvar.lungime) throw new FontStricat('gvar e prea scurt');
    const loc = (g: number): number => date + (lungi ? o.u32(p + 20 + 4 * g) : 2 * o.u16(p + 20 + 2 * g));
    const varf = (q: number): Float64Array => {
      const v = new Float64Array(nAxe);
      for (let i = 0; i < nAxe; i++) v[i] = o.f2dot14(q + 2 * i);
      return v;
    };
    delte = (g, total, x0, y0, capete) => {
      if (g < 0 || g >= nGlife) return null;
      const a = loc(g), b = loc(g + 1);
      if (b < a || b > p + gvar.lungime) throw new FontStricat(`variațiile glifei ${g} ies din gvar`);
      if (a === b) return null;
      const n = o.u16(a);
      let h = a + 4, d = a + o.u16(a + 2);
      const tupluri: { readonly marime: number; readonly factor: number; readonly proprii: boolean }[] = [];
      for (let k = 0; k < (n & 0x0fff); k++) {
        const marime = o.u16(h), idx = o.u16(h + 2);
        h += 4;
        let v: Float64Array;
        if (idx & 0x8000) {
          v = varf(h);
          h += 2 * nAxe;
        } else {
          if ((idx & 0x0fff) >= nComune) throw new FontStricat(`tuplul comun ${idx & 0x0fff} din ${nComune}`);
          v = varf(pComune + 2 * nAxe * (idx & 0x0fff));
        }
        let inc: Float64Array, cap: Float64Array;
        if (idx & 0x4000) {
          inc = varf(h);
          cap = varf(h + 2 * nAxe);
          h += 4 * nAxe;
        } else {
          inc = v.map((x) => Math.min(x, 0));
          cap = v.map((x) => Math.max(x, 0));
        }
        tupluri.push({ marime, factor: factorRegiune(c, inc, v, cap), proprii: (idx & 0x2000) !== 0 });
      }
      let comune: number[] | null = null;
      if (n & 0x8000) ({ puncte: comune, capat: d } = puncteImpachetate(o, d));
      const rez = new Float64Array(2 * total);
      let miscat = false;
      for (const tu of tupluri) {
        const capatTuplu = d + tu.marime;
        if (tu.factor !== 0) {
          let q = d, puncte = comune;
          if (tu.proprii) ({ puncte, capat: q } = puncteImpachetate(o, q));
          const m = puncte === null ? total : puncte.length;
          const xs = delteImpachetate(o, q, m);
          const ys = delteImpachetate(o, xs.capat, m);
          if (ys.capat > capatTuplu) throw new FontStricat(`tuplul glifei ${g} trece de mărimea lui`);
          const f = tu.factor;
          if (puncte === null) {
            for (let i = 0; i < total; i++) {
              rez[2 * i] = rez[2 * i]! + xs.delte[i]! * f;
              rez[2 * i + 1] = rez[2 * i + 1]! + ys.delte[i]! * f;
            }
          } else {
            const dt = new Float64Array(2 * total), are = new Uint8Array(total);
            puncte.forEach((pt, j) => {
              if (pt >= total) return;
              dt[2 * pt] = xs.delte[j]! * f;
              dt[2 * pt + 1] = ys.delte[j]! * f;
              are[pt] = 1;
            });
            if (capete && x0 && y0) {
              // Contururile glifei; fiecare punct fantomă e un contur singur, deci fără deltă rămâne pe loc.
              let s = 0;
              for (const e of capete) {
                iup(x0, y0, dt, are, s, e + 1);
                s = e + 1;
              }
            }
            for (let i = 0; i < 2 * total; i++) rez[i] = rez[i]! + dt[i]!;
          }
          miscat = true;
        }
        d = capatTuplu;
      }
      return miscat ? rez : null;
    };
  }

  const hvar = t.get('HVAR');
  let avansHvar: Variatii['avansHvar'] = null;
  if (hvar) {
    const magazin = magazinVariatii(o, hvar.pos + o.u32(hvar.pos + 4), c);
    const offHarta = o.u32(hvar.pos + 8);
    const harta = offHarta ? hartaIndici(o, hvar.pos + offHarta) : null;
    avansHvar = (g, avans) => {
      const [e, i] = harta ? harta(g) : [0, g];
      return Math.max(0, rotunjeste(avans + magazin(e, i)));
    };
  }

  const gdef = t.get('GDEF');
  const offGdef = gdef && o.u16(gdef.pos) === 1 && o.u16(gdef.pos + 2) >= 3 ? o.u32(gdef.pos + 14) : 0;
  const crenare = offGdef ? magazinVariatii(o, gdef!.pos + offGdef, c) : null;
  const dispozitiv = (q: number): number => (crenare && o.u16(q + 4) === 0x8000 ? rotunjeste(crenare(o.u16(q), o.u16(q + 2))) : 0);

  let cpht = 0;
  const mvar = t.get('MVAR');
  if (mvar) {
    const marime = o.u16(mvar.pos + 6), n = o.u16(mvar.pos + 8), off = o.u16(mvar.pos + 10);
    if (off && marime >= 8) {
      for (let k = 0; k < n; k++) {
        const r = mvar.pos + 12 + k * marime;
        if (o.tag(r) === 'cpht') cpht = rotunjeste(magazinVariatii(o, mvar.pos + off, c)(o.u16(r + 4), o.u16(r + 6)));
      }
    }
  }

  return { normalizate: c, delte, avansHvar, dispozitiv, cpht };
}
