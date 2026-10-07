import type { Document, ElementDoc } from './document.ts';

/**
 * Jurnalul de comenzi (T16, ADR 0016): fiecare schimbare e o comandă cu valorile vechi și cele noi, deci anularea și
 * refacerea sunt exacte și mici (~190 B pe comandă, față de o copie întreagă a documentului). Totul e pur: o funcție
 * primește starea și întoarce starea nouă.
 */
export type Comanda =
  | { readonly tip: 'adauga'; readonly element: ElementDoc; readonly pozitie: number }
  | { readonly tip: 'sterge'; readonly element: ElementDoc; readonly pozitie: number }
  | { readonly tip: 'inlocuieste'; readonly vechi: ElementDoc; readonly nou: ElementDoc };

export type Istoric = {
  readonly doc: Document;
  readonly trecut: readonly Comanda[];
  readonly viitor: readonly Comanda[];
};

/** Câte comenzi se țin pentru anulare; cele mai vechi pleacă primele. */
export const PLAFON_ISTORIC = 500;

export function istoricNou(doc: Document): Istoric {
  return { doc, trecut: [], viitor: [] };
}

function aplica(doc: Document, c: Comanda): Document {
  const elemente = [...doc.elemente];
  if (c.tip === 'adauga') {
    if (elemente.some((e) => e.id === c.element.id)) throw new Error(`elementul ${c.element.id} există deja`);
    elemente.splice(c.pozitie, 0, c.element);
  } else if (c.tip === 'sterge') {
    const i = elemente.findIndex((e) => e.id === c.element.id);
    if (i < 0) throw new Error(`elementul ${c.element.id} nu există`);
    elemente.splice(i, 1);
  } else {
    const i = elemente.findIndex((e) => e.id === c.vechi.id);
    if (i < 0) throw new Error(`elementul ${c.vechi.id} nu există`);
    elemente[i] = c.nou;
  }
  return { ...doc, rev: doc.rev + 1, elemente };
}

function inversa(c: Comanda): Comanda {
  if (c.tip === 'adauga') return { tip: 'sterge', element: c.element, pozitie: c.pozitie };
  if (c.tip === 'sterge') return { tip: 'adauga', element: c.element, pozitie: c.pozitie };
  return { tip: 'inlocuieste', vechi: c.nou, nou: c.vechi };
}

/** O comandă nouă: se aplică, intră în trecut, iar viitorul (refacerile posibile) se golește. */
export function executa(h: Istoric, c: Comanda): Istoric {
  return { doc: aplica(h.doc, c), trecut: [...h.trecut, c].slice(-PLAFON_ISTORIC), viitor: [] };
}

export function anuleaza(h: Istoric): Istoric {
  const c = h.trecut.at(-1);
  if (!c) return h;
  return { doc: aplica(h.doc, inversa(c)), trecut: h.trecut.slice(0, -1), viitor: [c, ...h.viitor] };
}

export function reface(h: Istoric): Istoric {
  const c = h.viitor[0];
  if (!c) return h;
  return { doc: aplica(h.doc, c), trecut: [...h.trecut, c], viitor: h.viitor.slice(1) };
}
