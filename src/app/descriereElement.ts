/**
 * Numele unui element în lume, cum îl citește omul: forma, mărimea și locul pe foaie. Același în bara de jos, în
 * avertismente, în fereastra exportului și pe titlul dopului din vederea 3D (ADR 0178, precizarea din 21.11): o singură
 * funcție, ca un element să se numească peste tot la fel.
 */
import { t } from '../i18n/t.ts';
import { cutieElement } from '../model/forme.ts';
import type { ElementLume } from '../model/lume.ts';

const doua = (x: number): string => x.toFixed(2);

/** Un element în lume, în cuvinte: forma și unde stă pe foaie. Calea, prin cutia ei exactă în lume (ADR 0034 §8). */
export function descriere(e: Pick<ElementLume, 'forma' | 'matrice'>): string {
  const { e: x, f: y } = e.matrice;
  if (e.forma.tip === 'dreptunghi') {
    return t('forma.dreptunghi', { latime: doua(e.forma.latime), inaltime: doua(e.forma.inaltime), x: doua(x), y: doua(y) });
  }
  if (e.forma.tip === 'cerc') return t('forma.cerc', { raza: doua(e.forma.raza), x: doua(x), y: doua(y) });
  const c = cutieElement(e);
  // O cale deschisă are n − 1 segmente și se spune „cale deschisă” (ADR 0037 §2, §12).
  const n = e.forma.varfuri.length - (e.forma.inchis ? 0 : 1);
  return t(e.forma.inchis ? 'forma.cale' : 'forma.cale-deschisa', { latime: doua(c.maxX - c.minX), inaltime: doua(c.maxY - c.minY), n, x: doua(c.minX), y: doua(c.minY) });
}
