/**
 * Alegerea aranjamentului și a densității (ADR 0250 §4, §5, felia 28.1↑a). E ținută pe dispozitiv, ca tema: tableta din
 * atelier și calculatorul din birou vor de obicei aranjamente diferite. Stă în `localStorage`, la cheia
 * `cncvs2.aranjament`, ca JSON `{ v: 1, aranjament, densitate }`.
 *
 * Se citește înaintea primei randări (`main.tsx`), deci aranjamentul nu se schimbă pe ecran după pornire. O valoare
 * necunoscută sau stricată dă Insule (`modern`) cu densitatea normală. Fiecare câmp se judecă singur: un aranjament
 * necunoscut nu strică o densitate bună. Un aranjament pe care build-ul ăsta nu-l are încă (o felie viitoare, sau o
 * versiune mai veche după o publicare întoarsă) dă tot Insule, iar alegerea ținută rămâne neatinsă: citirea nu scrie.
 *
 * Doar proprietățile proprii ale obiectului contează (`Object.hasOwn`): un `__proto__` din text nu aduce valori.
 */

export const CHEIE_ARANJAMENT = 'cncvs2.aranjament';
const VERSIUNE = 1;

/** Id-urile aranjamentelor (ADR 0250 §1): Insule, Clasic, Atelier, Pas cu pas. `modern` rămâne id-ul Insulelor. */
export const IDURI_ARANJAMENT = ['modern', 'clasic', 'atelier', 'pasi'] as const;
export type IdAranjament = (typeof IDURI_ARANJAMENT)[number];

/** Densitatea (ADR 0250 §2, §5), cu orice aranjament: `normala` = ținte de 36 px (44 la atingere), `mare` = 48 (56). */
export const DENSITATI = ['normala', 'mare'] as const;
export type Densitate = (typeof DENSITATI)[number];

export type Alegere = { readonly aranjament: IdAranjament; readonly densitate: Densitate };

export const ALEGERE_IMPLICITA: Alegere = { aranjament: 'modern', densitate: 'normala' };

const propriu = (o: object, k: string): unknown => (Object.hasOwn(o, k) ? (o as Record<string, unknown>)[k] : undefined);
const din = <T extends string>(lista: readonly T[], x: unknown): x is T => typeof x === 'string' && (lista as readonly string[]).includes(x);

/** Alegerea din textul ținut; `disponibile` sunt aranjamentele pe care build-ul le are (celelalte dau Insule). */
export function citesteAlegerea(text: string | null, disponibile: readonly IdAranjament[]): Alegere {
  if (text === null) return ALEGERE_IMPLICITA;
  let x: unknown;
  try {
    x = JSON.parse(text);
  } catch {
    return ALEGERE_IMPLICITA;
  }
  if (typeof x !== 'object' || x === null || Array.isArray(x) || propriu(x, 'v') !== VERSIUNE) return ALEGERE_IMPLICITA;
  const aranjament = propriu(x, 'aranjament');
  const densitate = propriu(x, 'densitate');
  return {
    aranjament: din(IDURI_ARANJAMENT, aranjament) && disponibile.includes(aranjament) ? aranjament : ALEGERE_IMPLICITA.aranjament,
    densitate: din(DENSITATI, densitate) ? densitate : ALEGERE_IMPLICITA.densitate,
  };
}

/** Textul de ținut pentru o alegere (fereastra Aspectul îl scrie, felia 28.1↑b). */
export function scrieAlegerea(a: Alegere): string {
  return JSON.stringify({ v: VERSIUNE, aranjament: a.aranjament, densitate: a.densitate });
}
