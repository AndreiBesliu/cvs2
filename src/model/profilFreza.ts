/**
 * Profilul frezei, pentru siluetă (ADR 0302, felia 16.A↑h-4): o linie frântă (r, h) de la vârf, pe axă, până la diametru,
 * la înălțimea capătului (`inaltimeCon`): fundul plat al plății, conul V-ului și al gravării (cu vârful plat), sfertul de
 * cerc al bilei, colțul rotunjit al toroidalei, vârful rotund și flancul conicei, vârful burghiului; profilurile (16.A↑h-5):
 * sfertul de cerc al rotunjirii, S-ul ogee-ului (cu treptele ogee-ului roman), fundul plat, scobitura și teșitura panoului. Arcele, din `pasi`
 * bucăți. Peste capăt, freza urcă drept, cu diametrul ei (silueta desenează tăișul de acolo).
 */
/** Câmpurile frezei din care se fac capătul și silueta (ale lui `Freza`, fără importul ei: `freza.ts` le cere de aici). */
export type CampuriProfil = {
  readonly fel: string; readonly diametru: number; readonly unghi?: number | undefined; readonly varf?: number | undefined;
  readonly raza?: number | undefined; readonly treapta?: number | undefined;
};

export type PunctProfil = readonly [number, number];

const finit = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * Înălțimea capătului, în mm (ADR 0302, felia 16.A↑h-4), măsurată de la vârf până unde freza ajunge la diametrul ei: plata
 * 0; V-ul și gravarea (R − a)·cot(θ/2), cu a raza vârfului plat; bila R; toroidala r (raza colțului); conica
 * r(1 − sin α) + (R − r cos α) / tan α, cu α = θ/2 și r raza vârfului rotund; burghiul R / tan(θ/2); profilurile (16.A↑h-5):
 * rotunjirea r, ogee-ul 2r, ogee-ul roman 2r + t (treapta), panoul (R − a)·tan β (a raza fundului plat, β teșitura față de
 * fața plăcii), iar cu scobitura de rază r, r(1 − cos β) + (R − a − r sin β)·tan β. Tăișul nu poate fi mai scurt.
 */
export function inaltimeCon(f: CampuriProfil): number {
  const R = f.diametru / 2;
  switch (f.fel) {
    case 'plata': return 0;
    case 'bila': return R;
    case 'toroidala': case 'rotunjire': return finit(f.raza) ? f.raza : 0;
    case 'ogee': return finit(f.raza) ? 2 * f.raza : 0;
    case 'ogee-roman': return finit(f.raza) && finit(f.treapta) ? 2 * f.raza + f.treapta : 0;
    case 'panou': {
      if (!finit(f.unghi) || !finit(f.varf)) return 0;
      const b = (f.unghi * Math.PI) / 180;
      const a = f.varf / 2;
      const r = finit(f.raza) ? f.raza : 0;
      return r * (1 - Math.cos(b)) + (R - a - r * Math.sin(b)) * Math.tan(b);
    }
    case 'conica': {
      if (!finit(f.unghi) || !finit(f.raza)) return 0;
      const a = (f.unghi * Math.PI) / 360;
      return f.raza * (1 - Math.sin(a)) + (R - f.raza * Math.cos(a)) / Math.tan(a);
    }
    default: {
      if (!finit(f.unghi)) return 0;
      const a = f.fel === 'gravare' && finit(f.varf) ? f.varf / 2 : 0;
      return (R - a) / Math.tan((f.unghi * Math.PI) / 360);
    }
  }
}


/** Pașii unui arc: un număr fix, sau după raza și unghiul arcului (radiani), ca în document (`puncteProfil`). */
export type PasiArc = number | ((raza: number, unghi: number) => number);

export function profilFreza(f: CampuriProfil, pasi: PasiArc = 12): readonly PunctProfil[] {
  const R = f.diametru / 2;
  const arc = (cx: number, cy: number, r: number, de: number, pana: number): PunctProfil[] => {
    const n = typeof pasi === 'number' ? pasi : pasi(r, Math.abs(pana - de));
    return Array.from({ length: n + 1 }, (_, i) => {
      const u = de + ((pana - de) * i) / n;
      return [cx + r * Math.cos(u), cy + r * Math.sin(u)] as const;
    });
  };
  /** Arcul cu capetele scrise exact (fără zgomotul lui cos și sin la capete). */
  const exact = (p: PunctProfil[], de: PunctProfil, pana: PunctProfil): PunctProfil[] => p.map((q, i) => (i === 0 ? de : i === p.length - 1 ? pana : q));
  switch (f.fel) {
    case 'plata': return [[0, 0], [R, 0]];
    case 'bila': return arc(0, R, R, -Math.PI / 2, 0).map(([r, h], i) => (i === 0 ? [0, 0] : [r, h]));
    case 'toroidala': {
      const rc = f.raza ?? 0;
      return [[0, 0], ...arc(R - rc, rc, rc, -Math.PI / 2, 0).map(([r, h], i, t): PunctProfil => (i === 0 ? [R - rc, 0] : i === t.length - 1 ? [R, rc] : [r, h]))];
    }
    case 'conica': {
      const rv = f.raza ?? 0;
      const a = ((f.unghi ?? 0) * Math.PI) / 360;
      // Arcul vârfului, cu centrul în (0, rv), de jos până unde tangenta lui e flancul (unghiul −a față de orizontală).
      const varf = arc(0, rv, rv, -Math.PI / 2, -a).map(([r, h], i, t): PunctProfil => (i === 0 ? [0, 0] : i === t.length - 1 ? [rv * Math.cos(a), rv * (1 - Math.sin(a))] : [r, h]));
      return [...varf, [R, inaltimeCon(f)]];
    }
    case 'burghiu': return [[0, 0], [R, inaltimeCon(f)]];
    case 'rotunjire': {
      // Sfertul de cerc cu centrul în (R, 0): vertical la vârf (fundul până la R − r), orizontal sus, în (R, r).
      const r = f.raza ?? 0;
      return [[0, 0], ...exact(arc(R, 0, r, Math.PI, Math.PI / 2), [R - r, 0], [R, r])];
    }
    case 'ogee': case 'ogee-roman': {
      // Două arce de rază r, unul după altul (S-ul), cu treptele ogee-ului roman: jos în sus, sus în afară.
      const r = f.raza ?? 0;
      const t = f.fel === 'ogee-roman' ? f.treapta ?? 0 : 0;
      const p0 = R - 2 * r - t;
      const jos = exact(arc(p0 + r, t, r, Math.PI, Math.PI / 2), [p0, t], [p0 + r, t + r]);
      const sus = exact(arc(p0 + r, t + 2 * r, r, -Math.PI / 2, 0), [p0 + r, t + r], [p0 + 2 * r, t + 2 * r]);
      return t > 0 ? [[0, 0], [p0, 0], ...jos, ...sus.slice(1), [R, t + 2 * r]] : [[0, 0], ...jos, ...sus.slice(1)];
    }
    case 'panou': {
      // Fundul plat până la a, scobitura (centrul în (a, r)) până unde tangenta ei e teșitura, apoi teșitura cu panta tan β.
      const a = (f.varf ?? 0) / 2;
      const r = f.raza ?? 0;
      const b = ((f.unghi ?? 0) * Math.PI) / 180;
      const scob = r > 0 ? exact(arc(a, r, r, -Math.PI / 2, -Math.PI / 2 + b), [a, 0], [a + r * Math.sin(b), r * (1 - Math.cos(b))]) : [[a, 0] as const];
      return [[0, 0], ...scob, [R, inaltimeCon(f)]];
    }
    default: {
      const a = f.fel === 'gravare' && f.varf !== undefined ? Math.min(f.varf / 2, R) : 0;
      return a > 0 ? [[0, 0], [a, 0], [R, inaltimeCon(f)]] : [[0, 0], [R, inaltimeCon(f)]];
    }
  }
}

/** Abaterea cea mai mare a liniilor din document de la arcele siluetei, în mm (ADR 0304 §1; ca biarcele, ADR 0033). */
export const ABATERE_PROFIL = 0.001;
/** Felurile de freză care intră în document ca profil desenat (ADR 0304 §5): profilurile parametrice (ADR 0302 §1). */
export const FELURI_PROFIL = ['rotunjire', 'ogee', 'ogee-roman', 'panou'] as const;
/** Pasul pe r cu care o treaptă verticală (ogee-ul roman) devine o linie abruptă: r crește strict, sub `ABATERE_PROFIL`. */
const PAS_TREAPTA = 1e-4;
/** Cel mult atâtea puncte într-un profil (ca `PLAFON.puncteProfil`, fără importul documentului în desenul siluetei). */
const PUNCTE_MAXIM = 200;

/**
 * Silueta unui profil parametric, cum intră în document (ADR 0304 §1): linii de la (0, 0) la (Ø / 2, capătul), fiecare arc
 * împărțit cât coarda lui să stea la cel mult `ABATERE_PROFIL` de el (cu o margine de 10 %), r strict crescător (o treaptă
 * verticală primește `PAS_TREAPTA` pe r), h nedescrescător, capătul exact la raza frezei; null pentru felurile care nu sunt
 * profiluri sau peste 200 de puncte.
 */
export function puncteProfil(f: CampuriProfil): Array<[number, number]> | null {
  if (!(FELURI_PROFIL as readonly string[]).includes(f.fel)) return null;
  const tinta = ABATERE_PROFIL * 0.9;
  // Coarda unui arc de unghi φ stă la r·(1 − cos(φ / 2)) de el: φ ≤ 2·acos(1 − tinta / r).
  const pasi = (r: number, unghi: number): number => (r <= tinta ? 1 : Math.max(1, Math.ceil(unghi / (2 * Math.acos(1 - tinta / r)))));
  const p = profilFreza(f, pasi);
  const rez: Array<[number, number]> = [[0, 0]];
  for (const [r0, h0] of p.slice(1)) {
    const [rl, hl] = rez[rez.length - 1]!;
    const h = Math.max(h0, hl);
    if (Math.abs(r0 - rl) < 1e-12 && Math.abs(h - hl) < 1e-12) continue;
    if (r0 < rl - 1e-9) return null;
    rez.push([r0 > rl ? r0 : rl + PAS_TREAPTA, h]);
  }
  const R = f.diametru / 2;
  const ultim = rez[rez.length - 1]!;
  if (rez.length < 2 || ultim[0] > R + 1e-9 || rez.length > PUNCTE_MAXIM) return null;
  ultim[0] = R;
  return rez;
}
