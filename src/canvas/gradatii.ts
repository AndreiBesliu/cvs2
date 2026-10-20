/** Gradațiile riglelor (ADR 0050 §4), pure. */

/** Pasul gradațiilor mari: 1, 2 sau 5 × 10ⁿ mm, cel mai mic care lasă cel puțin `minPx` între etichete. */
export function pasRigla(scara: number, minPx = 64): { readonly mare: number; readonly mic: number } {
  const brut = minPx / scara;
  const p = 10 ** Math.floor(Math.log10(brut));
  for (const m of [1, 2, 5, 10]) {
    if (m * p >= brut) {
      const mare = m * p;
      const diviziuni = m === 2 ? 4 : m === 5 ? 5 : 10;
      return { mare, mic: mare / diviziuni };
    }
  }
  return { mare: 10 * p, mic: p };
}
