/**
 * Textul unei mărimi (`marime.ts`), în limba omului: „sub 1 kB”, „457 kB”, „1,6 MB”.
 */
import { t } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { marime } from './marime.ts';

export function textMarime(octeti: number, limba: Limba): string {
  const m = marime(octeti);
  if (m.fel === 'zero' || m.fel === 'sub-kb') return t(`extensii.marime.${m.fel}`);
  return t(`extensii.marime.${m.fel}`, { n: new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 1 }).format(m.n) });
}
