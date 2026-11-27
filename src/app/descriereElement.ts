/**
 * Numele unui element în lume, cum îl citește omul: forma, mărimea și locul pe foaie. Același în bara de jos, în
 * avertismente, în fereastra exportului și pe titlul dopului din vederea 3D (ADR 0178, precizarea din 21.11): o singură
 * funcție, ca un element să se numească peste tot la fel. Numerele, în formatul limbii de acum: în română cu virgula
 * zecimală (constatarea 14 a auditului exportului, felia 3.Av), fără gruparea miilor.
 */
import { limba, t } from '../i18n/t.ts';
import { cutieElement } from '../model/forme.ts';
import type { ElementLume } from '../model/lume.ts';

const doua = (x: number): string => x.toFixed(2);
/** Un număr scris cu punct (`toFixed`), în formatul limbii de acum. */
const inLimba = (s: string): string => (limba() === 'ro' ? s.replace('.', ',') : s);
/** Un număr din numele unui element: două zecimale, în formatul limbii de acum (și al rândului din lista exportului, 28.8↑s). */
export const numarDescriere = (x: number): string => inLimba(doua(x));
const nr = numarDescriere;

/** Un element în lume, în cuvinte: forma și unde stă pe foaie. Calea, prin cutia ei exactă în lume (ADR 0034 §8). */
export function descriere(e: Pick<ElementLume, 'forma' | 'matrice'>): string {
  const { e: x, f: y } = e.matrice;
  if (e.forma.tip === 'dreptunghi') {
    return t('forma.dreptunghi', { latime: nr(e.forma.latime), inaltime: nr(e.forma.inaltime), x: nr(x), y: nr(y) });
  }
  if (e.forma.tip === 'cerc') return t('forma.cerc', { raza: nr(e.forma.raza), x: nr(x), y: nr(y) });
  const c = cutieElement(e);
  if (e.forma.tip === 'relief') {
    const s = Math.hypot(e.matrice.a, e.matrice.b), f = e.forma;
    return t('forma.relief', { latime: nr(f.nx * f.celula * s), inaltime: nr(f.ny * f.celula * s), celula: inLimba((f.celula * s).toFixed(3)), x: nr(c.minX), y: nr(c.minY) });
  }
  // O cale deschisă are n − 1 segmente și se spune „cale deschisă” (ADR 0037 §2, §12).
  const n = e.forma.varfuri.length - (e.forma.inchis ? 0 : 1);
  return t(e.forma.inchis ? 'forma.cale' : 'forma.cale-deschisa', { latime: nr(c.maxX - c.minX), inaltime: nr(c.maxY - c.minY), n, x: nr(c.minX), y: nr(c.minY) });
}
