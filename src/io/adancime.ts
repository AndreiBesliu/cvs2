/**
 * Adâncimea căilor deschise importate (ADR 0037 §11, decizia owner-ului din 13.10): min(1 mm, grosimea foii / 2), într-o
 * singură trecere. O linie uitată în fișier lasă doar o urmă și nu desparte niciodată foaia din oficiu. Fără grosime
 * (apelurile din teste, de dinaintea căilor deschise): 1 mm.
 */
export function adancimeDeschise(grosime?: number): number {
  return grosime === undefined ? 1 : Math.min(1, grosime / 2);
}
