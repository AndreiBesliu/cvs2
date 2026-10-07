import { useSyncExternalStore } from 'react';
import { ascultaLimba, limba } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';

/** Re-randează componenta când se schimbă limba. Instantaneul e un șir, deci stabil între randări. */
export function useLimba(): Limba {
  return useSyncExternalStore(ascultaLimba, limba, limba);
}
