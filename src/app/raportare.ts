import { dreptLaZi, type Drept } from '../../shared/conturi.ts';
import { AMPRENTE_MAX, BROWSER_MAX, type AplicatiaTichet } from '../../shared/tichete.ts';
import type { Limba } from '../i18n/tipuri.ts';
import type { IntrareEroare } from './jurnalErori.ts';

/**
 * Raportarea din editor (ADR 0116 §11), partea pură: datele aplicației puse lângă ea și amprentele erorilor din sesiune.
 * Amprentele pleacă fără conținutul erorilor, iar echipa le găsește grupurile în `errorLogs`. Ca la raportor (ADR 0043):
 * doar intrările acestei sesiuni (cele din depozit au alt build) și fără cele „doar locale”, care nu pleacă spre server.
 * Amprenta o face bucata raportorului, adusă doar când sesiunea are erori.
 */

/**
 * Pură: datele aplicației de pus lângă o raportare: versiunea, instanța, limba, browserul (fără caractere de control, tăiat
 * la plafonul serverului, altfel toată raportarea ar fi refuzată; gol, „necunoscut”) și planul de azi (după zilele offline),
 * sau niciunul, fără drept.
 */
export function aplicatiaTichet(
  x: { readonly versiune: string; readonly instanta: string; readonly limba: Limba; readonly browser: string; readonly drept: Drept | null },
  acum: number,
): AplicatiaTichet {
  const browser = x.browser.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    versiune: x.versiune,
    instanta: x.instanta,
    limba: x.limba,
    browser: [...(browser || 'necunoscut')].slice(0, BROWSER_MAX).join('').trim(),
    plan: x.drept ? dreptLaZi(x.drept, acum).plan : null,
  };
}

/** Pură: intrările jurnalului din sesiunea care a pornit la `inceput` (ms), fără cele doar locale. */
export function intrariSesiunii(intrari: readonly IntrareEroare[], inceput: number): readonly IntrareEroare[] {
  return intrari.filter((i) => !i.doarLocala && Date.parse(i.cand) >= inceput);
}

/** Cum se face amprenta unei intrări: implicit, ca serverul, în bucata raportorului (o probă îi dă alta). */
export type Amprenta = (i: IntrareEroare) => Promise<string>;

const amprentaRaportorului: Amprenta = async (i) => (await import('../cloud/raportor.ts')).amprentaRaportului(i);

/**
 * Amprentele, fără repetiții, cele mai noi la urmă, cel mult `AMPRENTE_MAX`. Aceeași eroare repetată se amprentează o dată,
 * iar doar ultimele `AMPRENTE_MAX` erori diferite: normalizarea serverului e scumpă pe un mesaj lung (ADR 0043 §4).
 */
export async function amprenteleSesiunii(intrari: readonly IntrareEroare[], inceput: number, amprenta: Amprenta = amprentaRaportorului): Promise<readonly string[]> {
  const ultimele = new Map<string, IntrareEroare>();
  for (const i of intrariSesiunii(intrari, inceput)) {
    const cheie = `${i.tip}|${i.mesaj}`;
    ultimele.delete(cheie);
    ultimele.set(cheie, i);
  }
  const alese = [...ultimele.values()].slice(-AMPRENTE_MAX);
  return [...new Set(await Promise.all(alese.map(amprenta)))];
}
