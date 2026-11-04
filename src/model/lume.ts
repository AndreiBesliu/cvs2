import { compune, rotatie, type Matrice } from '../geom/matrice.ts';
import type { Document, FormaDoc, FundPlat, Instanta, Nod, Operatie } from './document.ts';
import { jsonCanonic } from './jsonCanonic.ts';

/**
 * Elementele în lume ale unei foi (ADR 0024): singurul loc care desface piesele și instanțele în forme așezate pe foaie.
 * Pânza, CAM-ul, avertismentele și selecția citesc toate de aici, deci nu există două păreri despre unde e o formă.
 *
 * - ordinea: instanțele în ordinea foii; în fiecare piesă, elementele în preordine (grupurile nu desenează nimic);
 * - matricea: instanța ∘ grupurile de pe drum, de la rădăcină în jos ∘ elementul;
 * - id-ul în lume: `<id instanță>/<id element>`.
 */
export type ElementLume = {
  readonly idLume: string;
  readonly instanta: string;
  readonly piesa: string;
  readonly nod: string;
  readonly forma: FormaDoc;
  readonly matrice: Matrice;
};

/** Matricea instanței: întâi rotirea (exactă la multiplii de 90°), apoi translația. Scrisă direct, fără înmulțiri. */
export function matriceInstanta(i: Pick<Instanta, 'x' | 'y' | 'rotire'>): Matrice {
  return { ...rotatie(i.rotire), e: i.x, f: i.y };
}

export function idLume(instanta: string, nod: string): string {
  return `${instanta}/${nod}`;
}

/** Instanța unui id în lume: partea dinaintea lui `/` (un id de instanță n-are `/`, `schemaDocument.ts`). */
export function instantaDin(id: string): string {
  const k = id.indexOf('/');
  return k < 0 ? id : id.slice(0, k);
}

/** Elementele în lume ale unei instanțe, cu matricea ei dată (pentru o previzualizare se poate da alta). */
export function elementeInstanta(radacina: Nod, i: Pick<Instanta, 'id' | 'piesa'>, mInstanta: Matrice): ElementLume[] {
  const rez: ElementLume[] = [];
  const stiva: Array<{ readonly nod: Nod; readonly m: Matrice }> = [{ nod: radacina, m: mInstanta }];
  while (stiva.length > 0) {
    const x = stiva.pop();
    if (!x) break;
    const m = compune(x.m, x.nod.matrice);
    if (x.nod.tip === 'element') {
      rez.push({ idLume: idLume(i.id, x.nod.id), instanta: i.id, piesa: i.piesa, nod: x.nod.id, forma: x.nod.forma, matrice: m });
    } else {
      for (let k = x.nod.copii.length - 1; k >= 0; k--) {
        const c = x.nod.copii[k];
        if (c) stiva.push({ nod: c, m });
      }
    }
  }
  return rez;
}

export function elementeFoaie(doc: Document, indexFoaie = 0): ElementLume[] {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) return [];
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const rez: ElementLume[] = [];
  for (const i of foaie.instante) {
    const p = piese.get(i.piesa);
    if (!p) continue;
    for (const e of elementeInstanta(p.radacina, i, matriceInstanta(i))) rez.push(e);
  }
  return rez;
}

/**
 * O tăietură în lume: o operație a piesei, pe un element al ei, într-o instanță (ADR 0025). Id-ul în lume e al
 * elementului; o operație poate tăia un element, iar un element poate fi tăiat de mai multe operații.
 */
export type Taietura = ElementLume & {
  readonly operatie: string;
  /** Felul operației (ADR 0069): profilul conturului sau buzunarul dinăuntrul lui (pasul lateral îl citește lucrarea). */
  readonly tip: Operatie['tip'];
  readonly latura: Operatie['latura'];
  readonly sens: Operatie['sens'];
  readonly adancime: number;
  readonly pas: number;
  readonly scula: Operatie['scula'];
  readonly urechi: Operatie['urechi'];
  readonly rampa: Operatie['rampa'];
  readonly intrari: Operatie['intrari'];
  readonly colturi: Operatie['colturi'];
  /** Despărțirea foii, marcată de om (ADR 0037 §8): doar când e marcată; lipsa ei înseamnă nemarcată. */
  readonly despartire?: true;
  /** Locul operației în ordinea de mână (ADR 0133): doar când operația îl are. */
  readonly rang?: number;
};

/**
 * Valorile care fac din V-carve-urile unei piese, într-o instanță, o singură regiune (ADR 0090, ADR 0112, precizarea din
 * 5.8↑b): freza, adâncimea, pasul, sensul, fundul plat. Lucrarea le citește pe tăieturi, iar gruparea (ADR 0130) pe
 * operații: două părți cu aceleași valori s-ar săpa împreună.
 */
export function valoriVcarve(o: {
  readonly scula: Operatie['scula']; readonly adancime: number; readonly pas: number; readonly sens: Operatie['sens']; readonly fundPlat?: FundPlat | undefined;
}): string {
  return jsonCanonic({
    scula: { numar: o.scula.numar, diametru: o.scula.diametru, forma: o.scula.forma ?? null }, adancime: o.adancime, pas: o.pas, sens: o.sens,
    fundPlat: o.fundPlat ?? null,
  });
}

/** Clasele ordinii (ADR 0025, amendat de ADR 0037 §8); despărțirile marcate formează clasa 3, la urmă. */
const ORDINE_LATURA: Readonly<Record<Operatie['latura'], number>> = { interior: 0, 'pe-linie': 1, stanga: 1, dreapta: 1, exterior: 2 };
const CLASA_DESPARTIRE = 3;

/**
 * Clasa 3 ține doar tăieturile DESCHISE marcate (ADR 0037 §8): un nod închis dintr-o operație marcată rămâne în clasa
 * laturii lui (exportul îl refuză oricum; ordinea urmează contractul, oracolul 2.3c-2).
 */
const clasa = (t: Taietura): number =>
  (t.despartire && t.forma.tip === 'cale' && !t.forma.inchis ? CLASA_DESPARTIRE : ORDINE_LATURA[t.latura]);

/**
 * Tăieturile unei foi, în ordinea de tăiere a contractului (ADR 0037 §8): întâi interioarele; apoi cele pe linie (închise
 * și deschise) și tăieturile deschise nemarcate (o fantă în piesă se taie cât piesa e încă prinsă); apoi exterioarele
 * (piesa nu se mișcă sub sculă); la urmă, despărțirile foii marcate de om. În aceeași clasă, instanțele în ordinea foii,
 * operațiile în ordinea piesei, nodurile în ordinea operației. Elementele fără operație nu se taie.
 */
export function taieturiFoaie(doc: Document, indexFoaie = 0): Taietura[] {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) return [];
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const rez: Taietura[] = [];
  for (const i of foaie.instante) {
    const p = piese.get(i.piesa);
    if (!p || p.operatii.length === 0) continue;
    const elemente = new Map(elementeInstanta(p.radacina, i, matriceInstanta(i)).map((e) => [e.nod, e]));
    for (const o of p.operatii) {
      for (const n of o.noduri) {
        const e = elemente.get(n);
        if (!e) continue;
        rez.push({
          ...e, operatie: o.id, tip: o.tip, latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas, scula: o.scula, urechi: o.urechi,
          rampa: o.rampa, intrari: o.intrari, colturi: o.colturi, ...(o.despartire === true ? { despartire: true } : {}),
          ...(o.rang !== undefined ? { rang: o.rang } : {}),
        });
      }
    }
  }
  // Sortarea e stabilă: în aceeași clasă rămâne ordinea de mai sus.
  return rez.sort((a, b) => clasa(a) - clasa(b));
}

/**
 * Ordinea programului cu mai multe freze (ADR 0084): tăieturile contractului (`taieturiFoaie`), cu fiecare clasă grupată pe
 * sculă, ca schimbările să fie cât mai puține: întâi scula montată la capătul clasei de dinainte, apoi celelalte în ordinea
 * în care apar; în fiecare grup, ordinea contractului. Clasele rămân în ordinea lor (interioarele tot întâi). Cu o singură
 * sculă, chiar ordinea contractului.
 */
export function grupeazaPeScula(taieturi: readonly Taietura[]): Taietura[] {
  const cheie = (x: Taietura): string => `${x.scula.numar}/${x.scula.diametru}`;
  const ordonate: Taietura[] = [];
  let montata: string | null = null;
  for (let i = 0; i < taieturi.length;) {
    let j = i;
    while (j < taieturi.length && clasa(taieturi[j] as Taietura) === clasa(taieturi[i] as Taietura)) j++;
    const grupuri = new Map<string, Taietura[]>();
    for (const x of taieturi.slice(i, j)) grupuri.set(cheie(x), [...(grupuri.get(cheie(x)) ?? []), x]);
    const chei = [...grupuri.keys()];
    if (montata !== null && grupuri.has(montata)) chei.sort((a, b) => Number(b === montata) - Number(a === montata));
    for (const k of chei) ordonate.push(...(grupuri.get(k) ?? []));
    montata = chei.at(-1) ?? montata;
    i = j;
  }
  return ordonate;
}

/**
 * Ordinea programului (ADR 0133 §2): cea automată (`grupeazaPeScula` peste `taieturiFoaie`), sau, când o operație a foii are
 * rang, aceeași listă sortată stabil după rang. O operație fără rang vine după toate cele cu rang; pe ranguri egale și între
 * cele fără rang rămâne ordinea automată.
 */
export function ordineTaieturi(doc: Document, indexFoaie = 0): Taietura[] {
  const automata = grupeazaPeScula(taieturiFoaie(doc, indexFoaie));
  if (!automata.some((t) => t.rang !== undefined)) return automata;
  const loc = (t: Taietura): number => t.rang ?? Number.POSITIVE_INFINITY;
  return automata.map((t, i) => ({ t, i })).sort((a, b) => (loc(a.t) === loc(b.t) ? a.i - b.i : loc(a.t) < loc(b.t) ? -1 : 1)).map((x) => x.t);
}
