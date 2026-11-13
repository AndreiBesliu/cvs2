/**
 * Câmpurile din textul unei plăcuțe (ADR 0210 §4, întrebarea 4): un câmp se scrie între acolade, `{nume}`, `Masa {nr}`;
 * numele lui e tot ce stă între ele, nevid și fără acolade (un rând nou e voie, ca în oracolul documentului: un caz fără
 * folos, dar fără excepție). Ușa (v23) și literele plăcuțelor citesc de aici: textul așezat al unei plăcuțe e textul
 * șablonului, cu fiecare câmp înlocuit de valoarea ei.
 */
const CAMP = /\{([^{}]+)\}/g;

/** Numele câmpurilor unui text, în ordinea lor (cu repetări). */
export function campuriDin(text: string): string[] {
  return [...text.matchAll(CAMP)].map((m) => m[1] ?? '');
}

/**
 * Textul cu fiecare câmp înlocuit de valoarea lui, întocmai (o valoare cu acolade nu se mai înlocuiește); null dacă un câmp
 * n-are valoare. O valoare goală e o valoare: celula goală a unui rând din CSV.
 */
export function cuValori(text: string, valori: Readonly<Record<string, string>>): string | null {
  let lipsa = false;
  const rez = text.replace(CAMP, (_, nume: string) => {
    if (!Object.hasOwn(valori, nume)) lipsa = true;
    return valori[nume] ?? '';
  });
  return lipsa ? null : rez;
}
