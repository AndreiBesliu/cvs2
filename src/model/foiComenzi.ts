import type { Document, Foaie } from './document.ts';
import { indexFoaieActiva, materialFoaie } from './foi.ts';
import type { CampEticheta, Comanda, PieseFoaie } from './jurnal.ts';
// Aplicarea comenzilor foilor intră în jurnal odată cu ele (ADR 0210 §1).
import './jurnalFoi.ts';

/**
 * Comenzile foilor (ADR 0210 §1, felia 11.1↑): foaia nouă, ștergerea, ordinea, eticheta și mutarea instanțelor între foi.
 * Vin cu calculul acțiunilor, la cerere, nu în pachetul de pornire; funcții pure, fiecare dă comenzi cu inversa exactă.
 */

/** Primul id liber de forma `f<n>`, de la numărul foilor + 1. */
export function idFoaieNoua(doc: Document): string {
  const folosite = new Set(doc.foi.map((f) => f.id));
  let n = doc.foi.length + 1;
  while (folosite.has(`f${n}`)) n++;
  return `f${n}`;
}

/** Piesele ale căror instanțe sunt toate pe foaia `id`: pleacă odată cu ea. Fiecare cu locul ei, în ordinea listei. */
export function pieseNumaiPe(doc: Document, id: string): PieseFoaie {
  const pe = new Set<string>();
  const altundeva = new Set<string>();
  for (const f of doc.foi) for (const i of f.instante) (f.id === id ? pe : altundeva).add(i.piesa);
  return doc.piese.flatMap((piesa, pozitie) => (pe.has(piesa.id) && !altundeva.has(piesa.id) ? [{ piesa, pozitie }] : []));
}

/**
 * O foaie nouă, goală, după foaia `dupa`, ca ea: aceeași mărime și grosime, același material, fără ghidaje (sunt ale foii lor).
 * Întoarce comanda și id-ul foii noi (devine activă).
 */
export function comandaFoaieNoua(doc: Document, dupa: string | null | undefined): { readonly comanda: Comanda; readonly id: string } {
  const k = indexFoaieActiva(doc, dupa);
  const model = doc.foi[k];
  const id = idFoaieNoua(doc);
  const material = model ? materialFoaie(model) : null;
  const foaie: Foaie = {
    id, stoc: model ? { ...model.stoc } : { latime: 300, inaltime: 200, grosime: 18 }, instante: [], ...(material !== null ? { material } : {}),
  };
  return { comanda: { tip: 'adauga-foaie', foaie, pozitie: k + 1, piese: [] }, id };
}

/** Ștergerea foii `id`, cu piesele care pleacă odată cu ea; null dacă e singura foaie sau nu există. */
export function comandaStergeFoaie(doc: Document, id: string): Comanda | null {
  if (doc.foi.length <= 1) return null;
  const k = doc.foi.findIndex((f) => f.id === id);
  const foaie = doc.foi[k];
  if (!foaie) return null;
  return { tip: 'sterge-foaie', foaie, pozitie: k, piese: pieseNumaiPe(doc, id) };
}

/** Foaia `id` mutată cu un loc mai sus (-1) sau mai jos (+1) în listă; null la capăt. */
export function comandaMutaFoaie(doc: Document, id: string, pas: -1 | 1): Comanda | null {
  const k = doc.foi.findIndex((f) => f.id === id);
  const la = k + pas;
  if (k < 0 || la < 0 || la >= doc.foi.length) return null;
  return { tip: 'muta-foaie', foaie: id, de: k, la };
}

/**
 * Numele sau materialul foii `id`, scris de om: spațiile de la capete pleacă, iar un text gol scoate eticheta (numele arătat
 * revine la „Foaia N”). Comanda ține valoarea veche exactă, chiar și una care nu e text. Null dacă nu se schimbă nimic.
 */
export function comandaEticheta(doc: Document, id: string, camp: CampEticheta, valoare: string): Comanda | null {
  const foaie = doc.foi.find((f) => f.id === id);
  if (!foaie) return null;
  const vechi = Object.hasOwn(foaie, camp) ? { valoare: foaie[camp] } : null;
  const curat = valoare.trim();
  if (vechi === null ? curat === '' : vechi.valoare === curat) return null;
  return { tip: 'eticheta-foaie', foaie: id, camp, vechi, nou: curat === '' ? null : { valoare: curat } };
}

/**
 * Mutarea instanțelor `ids` de pe foaia `din` pe foaia `spre` (ADR 0210 §1): fiecare își păstrează locul (x, y, rotirea) și
 * piesa; pe foaia nouă vin la capăt, în ordinea foii de unde pleacă. Comenzile se aplică în ordine (un singur lot); goală dacă
 * nu e nimic de mutat.
 */
export function comenziMutaPeFoaie(doc: Document, ids: ReadonlySet<string>, din: string, spre: string): Comanda[] {
  const sursa = doc.foi.find((f) => f.id === din);
  const tinta = doc.foi.find((f) => f.id === spre);
  if (!sursa || !tinta || din === spre) return [];
  const mutate = sursa.instante.filter((i) => ids.has(i.id));
  const ramase = [...sursa.instante];
  const comenzi: Comanda[] = [];
  for (const instanta of mutate) {
    const pozitie = ramase.findIndex((x) => x.id === instanta.id);
    ramase.splice(pozitie, 1);
    comenzi.push({ tip: 'sterge', foaie: din, instanta, pozitie });
  }
  mutate.forEach((instanta, k) => { comenzi.push({ tip: 'adauga', foaie: spre, instanta, pozitie: tinta.instante.length + k }); });
  return comenzi;
}
