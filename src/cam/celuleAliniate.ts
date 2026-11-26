/**
 * Câte celule ale reliefului (de latură `c`) are pasul lateral `s` pe liniile aliniate (ADR 0314, felia 18.1↑d-3): cel mai mare
 * număr întreg care nu trece de pas, cel puțin unul. Pe hârtie, un pas care e un număr întreg de celule rămâne întreg și când
 * împărțirea în virgulă mobilă iese puțin sub el (0,3 / 0,1 = 2,9999999999999996). Într-un modul al lui, fără restul
 * CAM-ului: îl citesc lucrarea (`linii`, `src/cam/reliefFinisare.ts`) și fereastra exportului (pasul folosit, felia 18.1↑d-4).
 */
export function celuleAliniate(s: number, c: number): number {
  return Math.max(1, Math.floor(s / c + 1e-9));
}
