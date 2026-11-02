import type { Sursa } from './erori.ts';

/**
 * Cheia amprentei unei erori (ADR 0039 §3): textul din care serverul face id-ul grupului din `errorLogs` (SHA-256, primii 32
 * de caractere hex). Stă în afara contractului (`shared/erori.ts`), care e în pachetul de pornire: o folosesc doar serverul
 * și bucata raportorului, care face amprentele erorilor din sesiune pentru o raportare (ADR 0116 §11). Pur, ca și contractul.
 */

/** Mesajul normalizat din cheia amprentei. */
export const PLAFON_NORMALIZAT = 300;

/**
 * Mesajul normalizat pentru amprentă (ADR 0039 §3): adresele, fișierele cu hash de build, uuid-urile, id-urile lungi și
 * numerele se înlocuiesc; formularea rămâne, ca două defecte diferite să nu se contopească.
 */
export function normalizeazaMesaj(mesaj: string): string {
  return mesaj
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<adresa>')
    .replace(/\b[\w.-]+-[A-Za-z0-9_-]{6,}\.(?:m?js|css|wasm)\b/g, '<fisier>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<id>')
    .replace(/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}\b/gi, '<id>')
    .replace(/\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{20,}\b/g, '<id>')
    .replace(/\d+(?:[.,]\d+)?/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PLAFON_NORMALIZAT);
}

/** Textul din care serverul face amprenta (SHA-256, primii 32 de caractere hex). */
export function cheieAmprenta(sursa: Sursa, tip: string, mesaj: string): string {
  return `${sursa}|${tip}|${normalizeazaMesaj(mesaj)}`;
}
