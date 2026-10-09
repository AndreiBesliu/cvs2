import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/contur.ts';
import type { Miscare } from '../ir/ir.ts';

/**
 * Urechile (ADR 0028): profilul Z(s) al ediției întâi, portat cu formulele lui, ca modificator peste trecerea L / A.
 *
 *     S = P / n, centrele la (k + ½)·S       palierul |s − c| ≤ h, h = W / 2                Z = −vârf
 *     flancul h < |s − c| < h + ℓ            ℓ = min(W / 2; 0,45·(S − W))                    Z liniar, −vârf → −d
 *     în rest                                                                                Z = −d
 *
 * h + ℓ ≤ 0,495·S, deci flancurile vecine nu se ating, pornirea (s = 0) e la adâncime plină și toate rupturile sunt în
 * (0, P). Spre deosebire de ediția întâi, o lățime care nu încape (W > 0,9·S) e refuzată, nu strânsă pe ascuns.
 */
export type ParametriUrechi = {
  readonly numar: number;
  /** Lungimea palierului, pe traseul centrului frezei (mm). */
  readonly latime: number;
  /** Adâncimea vârfului urechii, de la fața de sus (mm, pozitivă): grosimea foii minus grosimea punții. */
  readonly varf: number;
};

/** O ruptură a profilului: poziția pe buclă și Z-ul de acolo, pe o trecere dată. */
type Nod = { readonly s: number; readonly z: number };

/** O ruptură mai aproape de atât de un vârf e chiar vârful (ADR 0028 §4). */
const EPS_RUPTURA = 1e-6;
/** O trecere traversează urechile doar dacă e mai adâncă decât vârful lor cu mai mult de atât. */
export const EPS_VARF = 1e-9;

/** Lungimea exactă a unui segment: linia, sau arcul ca r·|θ|. */
function lungimeSegment(a: Punct, b: Punct, s: { readonly tip: string; readonly bulge?: number }): number {
  if (s.tip === 'A' && s.bulge !== undefined) {
    const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
    return raza * Math.abs(baleiaj);
  }
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Lungimea exactă a unei bucle închise. */
export function lungimeBucla(c: Contur): number {
  let p = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    p += lungimeSegment(a, b, s);
  }
  return p;
}

/**
 * Rupturile profilului pe o buclă de lungime P, la o trecere de adâncime d > vârf, cu capetele (0, −d) și (P, −d). Între
 * două rupturi, Z e liniar. Întoarce motivul dacă urechile nu încap.
 */
export function noduriProfil(lungime: number, u: ParametriUrechi, d: number): readonly Nod[] | string {
  const S = lungime / u.numar;
  if (u.latime > 0.9 * S) {
    return `urechile nu încap: ${u.numar} urechi de ${u.latime} mm pe o buclă de ${lungime.toFixed(2)} mm (cel mult ${(0.9 * S).toFixed(2)} mm fiecare)`;
  }
  const h = u.latime / 2;
  const l = Math.min(u.latime / 2, 0.45 * (S - u.latime));
  const noduri: Nod[] = [{ s: 0, z: -d }];
  for (let k = 0; k < u.numar; k++) {
    const c = (k + 0.5) * S;
    noduri.push({ s: c - h - l, z: -d }, { s: c - h, z: -u.varf }, { s: c + h, z: -u.varf }, { s: c + h + l, z: -d });
  }
  noduri.push({ s: lungime, z: -d });
  return noduri;
}

/** Z la poziția s, liniar între rupturi. Pe o porțiune plată, exact cota ei. */
function zLa(noduri: readonly Nod[], s: number): number {
  for (let i = 1; i < noduri.length; i++) {
    const a = noduri[i - 1] as Nod, b = noduri[i] as Nod;
    if (s <= b.s) {
      if (a.z === b.z || b.s - a.s <= 0) return b.z;
      const t = Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s)));
      return a.z + (b.z - a.z) * t;
    }
  }
  return (noduri[noduri.length - 1] as Nod).z;
}

/**
 * Mișcările unei bucle pe o trecere care traversează urechile, de la vârful 0 (unde scula e deja la −d) înapoi la el.
 * Fiecare segment se taie exact în rupturile din interiorul lui; o bucată de arc rămâne arc pe același cerc (elice pe
 * flanc). O mișcare poartă Z doar dacă Z-ul se schimbă pe ea.
 */
export function bucataCuUrechi(
  c: Contur, noduri: readonly Nod[], d: number, avans: number,
): { readonly ok: true; readonly miscari: readonly Miscare[] } | { readonly ok: false; readonly motiv: string } {
  const m: Miscare[] = [];
  let zCur = -d;
  let s0 = 0;
  let urm = 1; // prima ruptură încă neemisă
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'C') return { ok: false, motiv: 'cubicele ajung la post doar ca biarce (T6, etapa 2)' };
    const L = lungimeSegment(a, b, s);
    const s1 = s0 + L;
    const cerc = s.tip === 'A' ? cerculArcului(a, b, s.bulge) : undefined;
    // Rupturile din interiorul segmentului, apoi capătul lui. Una lângă capăt (sub EPS) e capătul, cu cota ei.
    const tinte: { s: number; z: number; capat: boolean }[] = [];
    while (urm < noduri.length - 1 && (noduri[urm] as Nod).s < s1 - EPS_RUPTURA) {
      const n = noduri[urm] as Nod;
      if (n.s > s0 + EPS_RUPTURA) tinte.push({ s: n.s, z: n.z, capat: false });
      urm++;
    }
    let zCapat = zLa(noduri, s1);
    while (urm < noduri.length - 1 && (noduri[urm] as Nod).s <= s1 + EPS_RUPTURA) {
      zCapat = (noduri[urm] as Nod).z;
      urm++;
    }
    tinte.push({ s: s1, z: zCapat, capat: true });
    for (const t of tinte) {
      const p = t.capat ? b : punctPeSegment(a, b, cerc, (t.s - s0) / L);
      const la = t.z === zCur ? { X: p.x, Y: p.y } : { X: p.x, Y: p.y, Z: t.z };
      if (cerc) {
        m.push({ tip: 'arc', la, centru: cerc.centru, sens: cerc.baleiaj > 0 ? 'trigonometric' : 'orar', avans });
      } else {
        m.push({ tip: 'taiere', la, avans });
      }
      zCur = t.z;
    }
    s0 = s1;
  }
  return { ok: true, miscari: m };
}

/** Punctul la fracțiunea f din lungimea segmentului: pe linie liniar, pe arc în unghi. */
function punctPeSegment(a: Punct, b: Punct, cerc: ReturnType<typeof cerculArcului> | undefined, f: number): Punct {
  if (!cerc) return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  const u = cerc.start + cerc.baleiaj * f;
  return { x: cerc.centru.x + cerc.raza * Math.cos(u), y: cerc.centru.y + cerc.raza * Math.sin(u) };
}
