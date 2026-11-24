/**
 * Profilul frezei, pentru siluetă (ADR 0302, felia 16.A↑h-4): o linie frântă (r, h) de la vârf, pe axă, până la diametru,
 * la înălțimea capătului (`inaltimeCon`): fundul plat al plății, conul V-ului și al gravării (cu vârful plat), sfertul de
 * cerc al bilei, colțul rotunjit al toroidalei, vârful rotund și flancul conicei, vârful burghiului. Arcele, din `pasi`
 * bucăți. Peste capăt, freza urcă drept, cu diametrul ei (silueta desenează tăișul de acolo).
 */
import { inaltimeCon, type Freza } from './freza.ts';

export type PunctProfil = readonly [number, number];

export function profilFreza(f: Pick<Freza, 'fel' | 'diametru' | 'unghi' | 'varf' | 'raza'>, pasi = 12): readonly PunctProfil[] {
  const R = f.diametru / 2;
  const arc = (cx: number, cy: number, r: number, de: number, pana: number): PunctProfil[] =>
    Array.from({ length: pasi + 1 }, (_, i) => {
      const u = de + ((pana - de) * i) / pasi;
      return [cx + r * Math.cos(u), cy + r * Math.sin(u)] as const;
    });
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
    default: {
      const a = f.fel === 'gravare' && f.varf !== undefined ? Math.min(f.varf / 2, R) : 0;
      return a > 0 ? [[0, 0], [a, 0], [R, inaltimeCon(f)]] : [[0, 0], [R, inaltimeCon(f)]];
    }
  }
}
