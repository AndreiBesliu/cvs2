import { traduce } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';

/**
 * O durată în cuvinte (ADR 0046 §5, §8), aceeași în rezumatul exportului și în cipul traseului: sub un minut cu o zecimală,
 * apoi minute și secunde, apoi ore și minute. Pragurile cad unde rotunjirea ar scrie „60,0 s” sau „60 min”. Textele sunt în
 * dicționarul traseului (`i18n/traseu.ts`), adus de amândouă.
 */
export function durata(s: number, limba: Limba): string {
  if (s < 59.95) {
    const f = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return traduce(limba, 'durata.s', { s: f.format(s) });
  }
  const sec = Math.round(s);
  if (sec < 3600) return traduce(limba, 'durata.min', { m: Math.floor(sec / 60), s: String(sec % 60).padStart(2, '0') });
  const min = Math.round(s / 60);
  return traduce(limba, 'durata.h', { h: Math.floor(min / 60), m: String(min % 60).padStart(2, '0') });
}
