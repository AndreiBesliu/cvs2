import type { Document, Nod } from './document.ts';

/**
 * Copiile pieselor și ale instanțelor: id-urile noi și arborii copiați. Le folosesc registrul (Ctrl+D, desenul, gruparea) și
 * piesele puse de mai multe ori (ADR 0210 §2), deci stau în model, nu în interfață.
 */

/** Primul id liber de forma `e<n>`, liber și ca piesă, și ca instanță: o formă nouă are piesa și instanța cu același id. */
export function idNou(doc: Document, ocupate: ReadonlySet<string> = new Set()): string {
  const folosite = new Set<string>(ocupate);
  for (const p of doc.piese) folosite.add(p.id);
  for (const f of doc.foi) for (const i of f.instante) folosite.add(i.id);
  let n = doc.piese.length + 1;
  while (folosite.has(`e${n}`)) n++;
  return `e${n}`;
}

/**
 * Copia arborelui unei piese pentru Ctrl+D: noduri noi, dar formele împărțite. Documentul nu se schimbă pe loc, deci o
 * formă poate sta în două piese; o cale de 50 000 de vârfuri nu se mai copiază în istoric la fiecare Ctrl+D (recenzia 2.7b).
 */
export function copieArbore(n: Nod): Nod {
  if (n.tip === 'element') {
    const { forma, ...rest } = n;
    return { ...structuredClone(rest), forma } as Nod;
  }
  const { copii, ...rest } = n;
  return { ...structuredClone(rest), copii: copii.map(copieArbore) } as Nod;
}
