import { dreptLaZi, type Drept } from '../../shared/conturi.ts';
import { AMPRENTE_MAX, BROWSER_MAX, PROIECT_GZ_MAX_OCTETI, PROIECT_MAX_OCTETI, type AplicatiaTichet } from '../../shared/tichete.ts';
import type { Limba } from '../i18n/tipuri.ts';
import type { Document } from '../model/document.ts';
import { jsonCanonic } from '../model/jsonCanonic.ts';
import type { IntrareEroare } from './jurnalErori.ts';

export { marimeCitita } from '../../shared/tichete.ts';

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

/**
 * Proiectul de atașat (ADR 0116 §12, felia 15.B↑b): documentul deschis, ca JSON canonic, adică aceiași octeți pe care îi
 * salvează browserul (`proiectLocal.ts`) și pe care ușa unui proiect salvat îi deschide.
 */
export function octetiProiect(doc: Document): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(jsonCanonic(doc));
}

/**
 * Octeții în base64, ca `baza64` din `shared/poza.ts` (proba de paritate e în `test/unit/raportare.test.ts`). Nu se importă de
 * acolo: bucata contului ar aduce contractul pozei, pe care îl împart deja `/admin` și sugestia din editor, iar bundlerul l-ar
 * scoate într-o bucată nouă (`poza`), doar online și în afara listelor porții (prins de build-ul determinist, 07.11).
 */
export function inBase64(o: Uint8Array): string {
  let s = '';
  for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Proiectul trece de plafonul atașării (10 MB): fereastra îl spune lângă bifă și nu trimite. */
export const proiectPreaMare = (octeti: number): boolean => octeti > PROIECT_MAX_OCTETI;

/**
 * Proiectul, cum pleacă în cererea raportării: comprimat (gzip, din browser, fără cod în pachet) și în base64. Peste plafon
 * (JSON-ul sau, oricât de puțin probabil, gzip-ul) aruncă: fereastra nu trimite ce serverul ar refuza.
 */
export async function proiectPentruRaportare(octeti: Uint8Array<ArrayBuffer>): Promise<string> {
  if (proiectPreaMare(octeti.length)) throw new RangeError(`proiectul are ${octeti.length} octeți, peste ${PROIECT_MAX_OCTETI}`);
  const flux = new Blob([octeti]).stream().pipeThrough(new CompressionStream('gzip'));
  const gz = new Uint8Array(await new Response(flux).arrayBuffer());
  if (gz.length > PROIECT_GZ_MAX_OCTETI) throw new RangeError(`proiectul comprimat are ${gz.length} octeți, peste ${PROIECT_GZ_MAX_OCTETI}`);
  return inBase64(gz);
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
