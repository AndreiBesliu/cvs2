import type { Document, Ghidaj, Instanta, Piesa, Stoc } from './document.ts';

/**
 * Jurnalul de comenzi (T16, ADR 0016): fiecare schimbare e o comandă cu valorile vechi și cele noi, deci anularea și
 * refacerea sunt exacte și mici (~190 B pe comandă, față de o copie întreagă a documentului). Totul e pur: o funcție
 * primește starea și întoarce starea nouă.
 *
 * Pe documentul v2 (ADR 0024), comenzile lucrează pe instanțe și pe piese:
 * - `adauga` / `sterge` pun sau scot o instanță de pe o foaie, iar dacă au `piesa`, și piesa (o piesă nouă, sau ultima
 *   instanță a unei piese, cât timp nivelul doi e ascuns);
 * - `inlocuieste-instanta` / `inlocuieste-piesa` schimbă una cu valorile ei noi;
 * - `inlocuieste-stoc` schimbă materialul unei foi (lățimea, înălțimea, grosimea; ADR 0038 §4);
 * - `inlocuieste-ghidaje` schimbă lista ghidajelor unei foi (ADR 0050);
 * - `degrupeaza` / `regrupeaza` pun în locul fiecărei instanțe (și piese) vechi părțile ei, sau invers, într-o singură
 *   trecere prin liste (ADR 0103): o degrupare de mii de părți nu copiază listele o dată pe parte;
 * - `lot` e un singur pas de anulare pentru o acțiune pe mai multe lucruri.
 */
export type Comanda =
  | {
    readonly tip: 'adauga' | 'sterge';
    readonly foaie: string;
    readonly instanta: Instanta;
    readonly pozitie: number;
    readonly piesa?: { readonly piesa: Piesa; readonly pozitie: number };
  }
  | { readonly tip: 'inlocuieste-instanta'; readonly foaie: string; readonly vechi: Instanta; readonly nou: Instanta }
  | { readonly tip: 'inlocuieste-piesa'; readonly vechi: Piesa; readonly nou: Piesa }
  | { readonly tip: 'inlocuieste-stoc'; readonly foaie: string; readonly vechi: Stoc; readonly nou: Stoc }
  | { readonly tip: 'inlocuieste-ghidaje'; readonly foaie: string; readonly vechi: readonly Ghidaj[]; readonly nou: readonly Ghidaj[] }
  | { readonly tip: 'degrupeaza'; readonly foaie: string; readonly degrupate: readonly Degrupata[] }
  | { readonly tip: 'regrupeaza'; readonly foaie: string; readonly degrupate: readonly Degrupata[] }
  | { readonly tip: 'lot'; readonly comenzi: readonly Comanda[] };

/** O instanță degrupată (ADR 0103): cea veche, cu piesa ei (doar a ei), și părțile care îi iau locul, în ordine. */
export type Degrupata = {
  readonly instanta: Instanta;
  readonly piesa: Piesa;
  readonly parti: ReadonlyArray<{ readonly instanta: Instanta; readonly piesa: Piesa }>;
};

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

function indexFoaie(doc: Document, id: string): number {
  const i = doc.foi.findIndex((f) => f.id === id);
  if (i < 0) throw new Error(`foaia ${id} nu există`);
  return i;
}

/**
 * Degruparea și inversa ei (ADR 0103), într-o trecere: fiecare instanță veche își lasă locul părților (regrupat: prima parte,
 * instanței vechi; celelalte pleacă), la fel piesele. Totul trebuie să fie unde spune comanda, iar după ea fiecare instanță,
 * de pe orice foaie, trimite la o piesă care există și niciun id nu se repetă.
 */
function aplicaDegrupare(doc: Document, c: Extract<Comanda, { readonly tip: 'degrupeaza' | 'regrupeaza' }>): Document {
  const fi = indexFoaie(doc, c.foaie);
  const foaie = doc.foi[fi];
  if (!foaie) throw new Error(`foaia ${c.foaie} nu există`);
  const instante = new Map<string, readonly Instanta[]>();
  const piese = new Map<string, readonly Piesa[]>();
  for (const d of c.degrupate) {
    if (d.parti.length === 0) throw new Error(`instanța ${d.instanta.id} n-are părți`);
    if (c.tip === 'degrupeaza') {
      instante.set(d.instanta.id, d.parti.map((x) => x.instanta));
      piese.set(d.piesa.id, d.parti.map((x) => x.piesa));
    } else {
      d.parti.forEach((x, k) => {
        instante.set(x.instanta.id, k === 0 ? [d.instanta] : []);
        piese.set(x.piesa.id, k === 0 ? [d.piesa] : []);
      });
    }
  }
  let gasite = 0;
  const lista = foaie.instante.flatMap((i) => {
    const noi = instante.get(i.id);
    if (!noi) return [i];
    gasite++;
    return noi;
  });
  if (gasite !== instante.size) throw new Error(`${c.tip}: ${instante.size - gasite} instanțe lipsesc de pe foaia ${c.foaie}`);
  gasite = 0;
  const pieseNoi = doc.piese.flatMap((p) => {
    const noi = piese.get(p.id);
    if (!noi) return [p];
    gasite++;
    return noi;
  });
  if (gasite !== piese.size) throw new Error(`${c.tip}: ${piese.size - gasite} piese lipsesc din document`);
  const foi = [...doc.foi];
  foi[fi] = { ...foaie, instante: lista };
  const idPiese = new Set(pieseNoi.map((p) => p.id));
  if (idPiese.size !== pieseNoi.length) throw new Error(`${c.tip}: un id de piesă s-ar repeta`);
  const idInstante = new Set<string>();
  for (const f of foi) {
    for (const i of f.instante) {
      if (idInstante.has(i.id)) throw new Error(`${c.tip}: instanța ${i.id} s-ar repeta`);
      idInstante.add(i.id);
      if (!idPiese.has(i.piesa)) throw new Error(`${c.tip}: instanța ${i.id} ar trimite la piesa lipsă ${i.piesa}`);
    }
  }
  return { ...doc, piese: pieseNoi, foi };
}

function aplicaPas(doc: Document, c: Comanda): Document {
  if (c.tip === 'lot') return c.comenzi.reduce(aplicaPas, doc);
  if (c.tip === 'degrupeaza' || c.tip === 'regrupeaza') return aplicaDegrupare(doc, c);
  if (c.tip === 'inlocuieste-piesa') {
    const i = doc.piese.findIndex((p) => p.id === c.vechi.id);
    if (i < 0) throw new Error(`piesa ${c.vechi.id} nu există`);
    if (c.nou.id !== c.vechi.id) throw new Error('înlocuirea nu schimbă id-ul piesei');
    const piese = [...doc.piese];
    piese[i] = c.nou;
    return { ...doc, piese };
  }
  const fi = indexFoaie(doc, c.foaie);
  const foaie = doc.foi[fi];
  if (!foaie) throw new Error(`foaia ${c.foaie} nu există`);
  if (c.tip === 'inlocuieste-stoc' || c.tip === 'inlocuieste-ghidaje') {
    const foi = [...doc.foi];
    foi[fi] = c.tip === 'inlocuieste-stoc' ? { ...foaie, stoc: c.nou } : { ...foaie, ghidaje: [...c.nou] };
    return { ...doc, foi };
  }
  const instante = [...foaie.instante];
  let piese = doc.piese;
  if (c.tip === 'inlocuieste-instanta') {
    const i = instante.findIndex((x) => x.id === c.vechi.id);
    if (i < 0) throw new Error(`instanța ${c.vechi.id} nu există`);
    if (c.nou.id !== c.vechi.id) throw new Error('înlocuirea nu schimbă id-ul instanței');
    instante[i] = c.nou;
  } else if (c.tip === 'adauga') {
    if (doc.foi.some((f) => f.instante.some((x) => x.id === c.instanta.id))) throw new Error(`instanța ${c.instanta.id} există deja`);
    if (c.piesa) {
      if (doc.piese.some((p) => p.id === c.piesa?.piesa.id)) throw new Error(`piesa ${c.piesa.piesa.id} există deja`);
      piese = [...doc.piese];
      piese.splice(c.piesa.pozitie, 0, c.piesa.piesa);
    }
    if (!piese.some((p) => p.id === c.instanta.piesa)) throw new Error(`instanța ${c.instanta.id} ar trimite la piesa lipsă ${c.instanta.piesa}`);
    instante.splice(c.pozitie, 0, c.instanta);
  } else {
    const i = instante.findIndex((x) => x.id === c.instanta.id);
    if (i < 0) throw new Error(`instanța ${c.instanta.id} nu există`);
    instante.splice(i, 1);
    if (c.piesa) {
      const id = c.piesa.piesa.id;
      const ramase = doc.foi.some((f, k) => (k === fi ? instante : f.instante).some((x) => x.piesa === id));
      if (ramase) throw new Error(`piesa ${id} mai are instanțe: nu se șterge`);
      piese = doc.piese.filter((p) => p.id !== id);
    }
  }
  const foi = [...doc.foi];
  foi[fi] = { ...foaie, instante };
  return { ...doc, piese, foi };
}

function aplica(doc: Document, c: Comanda): Document {
  return { ...aplicaPas(doc, c), rev: doc.rev + 1 };
}

function inversa(c: Comanda): Comanda {
  switch (c.tip) {
    case 'lot': return { tip: 'lot', comenzi: [...c.comenzi].reverse().map(inversa) };
    case 'adauga': return { ...c, tip: 'sterge' };
    case 'sterge': return { ...c, tip: 'adauga' };
    case 'inlocuieste-instanta': return { tip: c.tip, foaie: c.foaie, vechi: c.nou, nou: c.vechi };
    case 'inlocuieste-piesa': return { tip: c.tip, vechi: c.nou, nou: c.vechi };
    case 'inlocuieste-stoc': return { tip: c.tip, foaie: c.foaie, vechi: c.nou, nou: c.vechi };
    case 'inlocuieste-ghidaje': return { tip: c.tip, foaie: c.foaie, vechi: c.nou, nou: c.vechi };
    case 'degrupeaza': return { ...c, tip: 'regrupeaza' };
    case 'regrupeaza': return { ...c, tip: 'degrupeaza' };
  }
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
