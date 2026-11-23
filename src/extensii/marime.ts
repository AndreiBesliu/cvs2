/**
 * Mărimea unui pachet sau a datelor unei extensii, pe înțeles (ADR 0231 §B.5): nimic, „sub 1 kB”, kB întregi până la 1 MB,
 * apoi MB cu o zecimală. Pură: textul (cu numărul scris în limba omului) îl face cine o arată.
 */
export type Marime =
  | { readonly fel: 'zero' }
  | { readonly fel: 'sub-kb' }
  | { readonly fel: 'kb'; readonly n: number }
  | { readonly fel: 'mb'; readonly n: number };

const KB = 1024;
const MB = 1024 * 1024;

export function marime(octeti: number): Marime {
  if (!(octeti > 0)) return { fel: 'zero' };
  if (octeti < KB) return { fel: 'sub-kb' };
  const kb = Math.round(octeti / KB);
  // De la 1023,5 kB în sus se rotunjește la 1 MB: „1024 kB” nu se scrie.
  if (kb < KB) return { fel: 'kb', n: kb };
  return { fel: 'mb', n: Math.round((octeti / MB) * 10) / 10 };
}
