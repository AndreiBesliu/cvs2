/**
 * Dicționarele de bază ale ambelor limbi, pentru testele care cer texte (`traduce`, `t()`): în aplicație, pornirea aduce
 * limba activă înaintea primei randări (`main.tsx`), iar aplicația pe cealaltă în fundal (`App.tsx`). Se importă pentru
 * efect, înaintea modulelor testate; modulul care îl importă se evaluează abia după ce ambele dicționare au intrat
 * (`await` la nivelul modulului: aici, în teste, nu blochează nimic, spre deosebire de pachetul aplicației).
 */
import { incarcaLimba } from '../../src/i18n/t.ts';

await Promise.all([incarcaLimba('ro'), incarcaLimba('en')]);
