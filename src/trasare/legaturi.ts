/**
 * Legăturile culorilor (ADR 0221 §3): pentru fiecare culoare, prima din lanțul ei de legături (culoarea în care se trasează).
 * Un ciclu are ca primă culoarea cu indicele cel mai mic din el, aceeași pentru toate culorile care ajung în el. Una singură,
 * pentru nucleu (`culori.ts`) și pentru pastilele ferestrei (care arată legătura chiar la tragere, înaintea trasării noi).
 */
export function primele(legaturi: readonly number[], K: number): Int16Array {
  const prima = Int16Array.from({ length: K }, (_, k) => k);
  for (let k = 0; k < K; k++) {
    let j = k;
    const drum = [k];
    for (;;) {
      const l = legaturi[j] ?? -1;
      if (!(l >= 0 && l < K)) break;
      const i = drum.indexOf(l);
      if (i >= 0) { j = Math.min(...drum.slice(i)); break; }
      drum.push(l); j = l;
    }
    prima[k] = j;
  }
  return prima;
}
