/**
 * Dicționarele de bază ale ambelor limbi, pentru testele care cer texte (`traduce`, `t()`): în aplicație, pornirea aduce
 * limba activă înaintea primei randări (`main.tsx`), iar aplicația pe cealaltă în fundal (`App.tsx`), ca date
 * (`mesaje/<limbă>.json`, ADR 0095). Aici se înregistrează direct din sursă, fără rețea (drumul prin `fetch` îl probează
 * `limba.incarcare.test.ts`). Se importă pentru efect, înaintea modulelor testate; modulul care îl importă se evaluează
 * abia după ce ambele dicționare au intrat (`await` la nivelul modulului: aici, în teste, nu blochează nimic, spre deosebire
 * de pachetul aplicației).
 */
import { en } from '../../src/i18n/mesaje.en.ts';
import { ro } from '../../src/i18n/mesaje.ro.ts';
import { incarcaLimba } from '../../src/i18n/t.ts';

await Promise.all([incarcaLimba('ro', () => Promise.resolve(ro)), incarcaLimba('en', () => Promise.resolve(en))]);
