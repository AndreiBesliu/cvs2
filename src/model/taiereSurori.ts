import { idNou } from './copii.ts';
import type { Document, Instanta, Piesa } from './document.ts';
import { executa, istoricNou, type Comanda, type Degrupata } from './jurnal.ts';
import { comenziDesprinde, folosiri } from './pieseLegate.ts';

/**
 * Tăierea și conversia unei piese puse de mai multe ori (felia 10.3↑m, ADR 0180, „Se redeschide dacă”: opțiuni, nu doar
 * refuzul). Pe firul principal: comenzile, din calculul workerului.
 *
 * - **«Desprinde și taie» / «Desprinde și convertește»:** calculul se face pe documentul cu instanțele alese desprinse
 *   (`desprinse`: fiecare cu piesa ei, ca la «Desprinde», ADR 0210 §2; o plăcuță, coaptă), iar comanda desprinde doar
 *   instanțele pe care operația chiar le-a schimbat; celelalte rămân legate de surorile lor.
 * - **«Taie piesa»:** bucățile instanței tăiate (ale primei, dacă sunt mai multe: workerul a verificat că sunt la fel) iau locul
 *   fiecărei instanțe a piesei, de pe orice foaie, puse și ele de atâtea ori.
 * - **«Convertește piesa»:** piesa se schimbă în locul ei (workerul), deci toate instanțele ei; aici nu e nimic de făcut.
 */
export type AlegereSurori = 'desprinde' | 'piesa';

/**
 * O tăiere calculată cu surori, pentru comandă: «Desprinde și taie» (pe documentul desprins; `ids`, instanțele de desprins
 * acum) sau «Taie piesa».
 */
export type SuroriTaiere = { readonly mod: 'desprinde'; readonly ids: readonly string[] } | { readonly mod: 'piesa' };

/**
 * O conversie calculată cu surori: «Desprinde și convertește» (pe documentul `desprins`, cu instanțele `alese` cu surori ale
 * foii `foaie` desprinse) sau «Convertește piesa» (piesa, în locul ei: nimic în plus de făcut).
 */
export type SuroriConversie =
  | { readonly mod: 'desprinde'; readonly desprins: Document; readonly alese: readonly string[]; readonly foaie: string }
  | { readonly mod: 'piesa' };

/** Instanțele alese ale foii `idFoaie`, în ordinea foii, ale căror piese sunt puse de mai multe ori (pe orice foaie). */
export function aleseCuSurori(doc: Document, idFoaie: string, alese: readonly string[]): string[] {
  const n = folosiri(doc);
  const a = new Set(alese);
  return (doc.foi.find((f) => f.id === idFoaie)?.instante ?? []).filter((i) => a.has(i.id) && (n.get(i.piesa) ?? 0) > 1).map((i) => i.id);
}

/** De câte ori e pusă cea mai folosită dintre piesele instanțelor `ids` ale foii (pentru întrebare); 0 fără ele. */
export function catePuse(doc: Document, idFoaie: string, ids: readonly string[]): number {
  const n = folosiri(doc);
  const a = new Set(ids);
  let m = 0;
  for (const i of doc.foi.find((f) => f.id === idFoaie)?.instante ?? []) if (a.has(i.id)) m = Math.max(m, n.get(i.piesa) ?? 0);
  return m;
}

/** Comenzile desprinderii instanțelor `ids` ale foii și documentul de după (același document, dacă n-are ce desprinde). */
function desprinde(doc: Document, idFoaie: string, ids: readonly string[]): { readonly comenzi: Comanda[]; readonly doc: Document } {
  const comenzi = comenziDesprinde(doc, new Set(ids), idFoaie);
  return { comenzi, doc: comenzi.length === 0 ? doc : executa(istoricNou(doc), { tip: 'lot', comenzi }).doc };
}

/** Documentul de calcul pentru «Desprinde și …»: instanțele `ids` ale foii, desprinse (fiecare cu piesa ei). */
export function desprinse(doc: Document, idFoaie: string, ids: readonly string[]): Document {
  return desprinde(doc, idFoaie, ids).doc;
}

/**
 * «Desprinde și taie», în comanda tăierii: pe `doc` se desprind doar instanțele `ids` (cele tăiate), iar degruparea,
 * calculată pe documentul cu toate cele alese desprinse, arată apoi spre instanțele și piesele desprinse acum (bucățile rămân
 * cum le-a calculat workerul: id-urile lor ocolesc toate id-urile documentului desprins).
 */
export function desprindeSiTaie(doc: Document, idFoaie: string, ids: readonly string[], degrupate: readonly Degrupata[]): {
  readonly comenzi: Comanda[]; readonly doc: Document; readonly degrupate: Degrupata[];
} {
  const d = desprinde(doc, idFoaie, ids);
  const instante = new Map((d.doc.foi.find((f) => f.id === idFoaie)?.instante ?? []).map((i) => [i.id, i]));
  const piese = new Map(d.doc.piese.map((p) => [p.id, p]));
  const de = new Set(ids);
  return {
    comenzi: d.comenzi,
    doc: d.doc,
    degrupate: degrupate.map((x) => {
      const i = de.has(x.instanta.id) ? instante.get(x.instanta.id) : undefined;
      const p = i ? piese.get(i.piesa) : undefined;
      return i && p ? { ...x, instanta: i, piesa: p } : x;
    }),
  };
}

/**
 * «Desprinde și convertește», în comanda conversiei: piesele convertite pe documentul desprins (`desprins`, cu toate cele alese
 * desprinse) care sunt ale unor instanțe cu surori în `doc` trec pe piesele desprinderii de acum, care desprinde doar
 * instanțele lor; restul pieselor rămân. Instanțele desprinse își păstrează id-urile, deci se găsesc după ele.
 */
export function desprindeSiConverteste(doc: Document, desprins: Document, idFoaie: string, alese: readonly string[], piese: readonly Piesa[]): {
  readonly comenzi: Comanda[]; readonly doc: Document; readonly piese: Piesa[];
} {
  const cuSurori = new Set(aleseCuSurori(doc, idFoaie, alese));
  const aPiesei = new Map<string, string>();
  for (const i of desprins.foi.find((f) => f.id === idFoaie)?.instante ?? []) if (cuSurori.has(i.id)) aPiesei.set(i.piesa, i.id);
  const ids = piese.flatMap((p) => { const i = aPiesei.get(p.id); return i === undefined ? [] : [i]; });
  const d = desprinde(doc, idFoaie, ids);
  const instante = new Map((d.doc.foi.find((f) => f.id === idFoaie)?.instante ?? []).map((i) => [i.id, i]));
  return {
    comenzi: d.comenzi,
    doc: d.doc,
    piese: piese.map((p) => {
      const i = aPiesei.get(p.id);
      const nou = i === undefined ? undefined : instante.get(i)?.piesa;
      return nou === undefined ? p : { ...p, id: nou };
    }),
  };
}

/**
 * «Taie piesa», în comanda tăierii: degruparea foii `idFoaie`, cu bucățile instanțelor tăiate ale fiecărei piese puse de mai
 * multe ori puse în locul fiecărei instanțe a ei, de pe orice foaie (piesele bucăților primei ei instanțe tăiate, deci puse și
 * ele de atâtea ori). Ordinea, ca documentul să fie bun după fiecare pas: pleacă întâi instanțele piesei de pe celelalte foi
 * (de la capătul fiecărei foi), apoi degruparea foii de lucru (cu toate instanțele piesei de acolo și cu celelalte forme
 * tăiate), apoi bucățile, pe celelalte foi, în locul instanțelor plecate. Fără piese puse de mai multe ori, doar degruparea.
 */
export function comenziTaiePiesa(doc: Document, idFoaie: string, degrupate: readonly Degrupata[]): Comanda[] {
  const n = folosiri(doc);
  // Piesele bucăților, pentru fiecare piesă cu surori tăiată: ale primei ei instanțe tăiate.
  const bucati = new Map<string, readonly Piesa[]>();
  for (const d of degrupate) if ((n.get(d.piesa.id) ?? 0) > 1 && !bucati.has(d.piesa.id)) bucati.set(d.piesa.id, d.parti.map((x) => x.piesa));
  if (bucati.size === 0) return degrupate.length === 0 ? [] : [{ tip: 'degrupeaza', foaie: idFoaie, degrupate }];
  const ocupate = new Set<string>();
  for (const d of degrupate) for (const x of d.parti) { ocupate.add(x.instanta.id); ocupate.add(x.piesa.id); }
  const idLiber = (): string => {
    const id = idNou(doc, ocupate);
    ocupate.add(id);
    return id;
  };
  const parti = (i: Instanta, piese: readonly Piesa[]): Array<{ readonly instanta: Instanta; readonly piesa: Piesa }> =>
    piese.map((piesa) => ({ instanta: { ...structuredClone(i), id: idLiber(), piesa: piesa.id }, piesa }));
  const comenzi: Comanda[] = [];
  // 1. Instanțele piesei de pe celelalte foi pleacă, de la capătul fiecărei foi (locurile celor dinainte rămân).
  const plecate: Array<{ readonly foaie: string; readonly k: number; readonly instanta: Instanta; readonly piese: readonly Piesa[] }> = [];
  for (const f of doc.foi) {
    if (f.id === idFoaie) continue;
    for (let k = f.instante.length - 1; k >= 0; k--) {
      const i = f.instante[k] as Instanta;
      const piese = bucati.get(i.piesa);
      if (!piese) continue;
      comenzi.push({ tip: 'sterge', foaie: f.id, instanta: i, pozitie: k });
      plecate.push({ foaie: f.id, k, instanta: i, piese });
    }
  }
  // 2. Degruparea foii de lucru: instanțele tăiate (cele cu surori, pe piesele comune), apoi surorile netăiate de aici.
  const taiate = new Map(degrupate.map((d) => [d.instanta.id, d]));
  const toate: Degrupata[] = [];
  for (const i of doc.foi.find((f) => f.id === idFoaie)?.instante ?? []) {
    const d = taiate.get(i.id);
    const piese = bucati.get(i.piesa);
    if (d && !piese) toate.push(d);
    else if (d && piese) toate.push({ ...d, parti: d.parti.map((x, k) => ({ instanta: { ...x.instanta, piesa: (piese[k] as Piesa).id }, piesa: piese[k] as Piesa })) });
    else if (piese) toate.push({ instanta: i, piesa: d?.piesa ?? (doc.piese.find((p) => p.id === i.piesa) as Piesa), parti: parti(i, piese) });
  }
  comenzi.push({ tip: 'degrupeaza', foaie: idFoaie, degrupate: toate });
  // 3. Bucățile, pe celelalte foi, în locul instanțelor plecate (de la începutul fiecărei foi: fiecare plecată mută locurile
  // celor de după cu numărul bucăților ei, minus ea).
  const mutare = new Map<string, number>();
  for (const x of [...plecate].reverse()) {
    const m = mutare.get(x.foaie) ?? 0;
    parti(x.instanta, x.piese).forEach((p, j) => { comenzi.push({ tip: 'adauga', foaie: x.foaie, instanta: p.instanta, pozitie: x.k + m + j }); });
    mutare.set(x.foaie, m + x.piese.length - 1);
  }
  return comenzi;
}
