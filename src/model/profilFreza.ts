/**
 * Profilul frezei, pentru siluetă (ADR 0302, felia 16.A↑h-4): o linie frântă (r, h) de la vârf, pe axă, până la diametru,
 * la înălțimea capătului (`inaltimeCon`): fundul plat al plății, conul V-ului și al gravării (cu vârful plat), sfertul de
 * cerc al bilei, colțul rotunjit al toroidalei, vârful rotund și flancul conicei, vârful burghiului; profilurile (16.A↑h-5):
 * sfertul de cerc al rotunjirii, S-ul ogee-ului (cu treptele ogee-ului roman), fundul plat, scobitura și teșitura panoului. Arcele, din `pasi`
 * bucăți. Peste capăt, freza urcă drept, cu diametrul ei (silueta desenează tăișul de acolo).
 */
import { inaltimeCon, type Freza } from './freza.ts';

export type PunctProfil = readonly [number, number];

export function profilFreza(f: Pick<Freza, 'fel' | 'diametru' | 'unghi' | 'varf' | 'raza' | 'treapta'>, pasi = 12): readonly PunctProfil[] {
  const R = f.diametru / 2;
  const arc = (cx: number, cy: number, r: number, de: number, pana: number): PunctProfil[] =>
    Array.from({ length: pasi + 1 }, (_, i) => {
      const u = de + ((pana - de) * i) / pasi;
      return [cx + r * Math.cos(u), cy + r * Math.sin(u)] as const;
    });
  /** Arcul cu capetele scrise exact (fără zgomotul lui cos și sin la capete). */
  const exact = (p: PunctProfil[], de: PunctProfil, pana: PunctProfil): PunctProfil[] => p.map((q, i) => (i === 0 ? de : i === pasi ? pana : q));
  switch (f.fel) {
    case 'plata': return [[0, 0], [R, 0]];
    case 'bila': return arc(0, R, R, -Math.PI / 2, 0).map(([r, h], i) => (i === 0 ? [0, 0] : [r, h]));
    case 'toroidala': {
      const rc = f.raza ?? 0;
      return [[0, 0], ...arc(R - rc, rc, rc, -Math.PI / 2, 0).map(([r, h], i): PunctProfil => (i === 0 ? [R - rc, 0] : i === pasi ? [R, rc] : [r, h]))];
    }
    case 'conica': {
      const rv = f.raza ?? 0;
      const a = ((f.unghi ?? 0) * Math.PI) / 360;
      // Arcul vârfului, cu centrul în (0, rv), de jos până unde tangenta lui e flancul (unghiul −a față de orizontală).
      const varf = arc(0, rv, rv, -Math.PI / 2, -a).map(([r, h], i): PunctProfil => (i === 0 ? [0, 0] : i === pasi ? [rv * Math.cos(a), rv * (1 - Math.sin(a))] : [r, h]));
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
