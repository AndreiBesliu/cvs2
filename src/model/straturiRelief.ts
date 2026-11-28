/**
 * Straturile unui relief (ADR 0310 §1, §7; ADR 0320, felia 18.1↑j): editarea listei, pură. În document, straturile stau de
 * jos în sus (compusul pornește de la primul); „sus” mută un strat spre capătul listei, deasupra în compus. Fiecare schimbare
 * dă o formă nouă, cu forma veche neatinsă (jurnalul o pune la loc, cu hărțile ei: dalele rămân în bază după amprentă), sau
 * null când nu e nimic de făcut ori nu se poate (un strat care nu există, ultimul strat, plafonul de straturi).
 */
import { PLAFON, STRATURI_RELIEF_MAXIM, type Document, type Foaie, type FormaRelief, type ModRelief, type Nod, type StratRelief } from './document.ts';

/** Ce se schimbă la un strat: ochiul, numele (gol = fără nume, arătat după id) și modul. */
export type SchimbareStrat = { readonly vizibil?: boolean; readonly nume?: string; readonly mod?: ModRelief };

/** Numele curățat: fără spațiile de la capete, tăiat la plafonul numelor; gol = fără nume. */
function numeCurat(nume: string): string | undefined {
  const n = nume.trim().slice(0, PLAFON.numeLungime);
  return n === '' ? undefined : n;
}

/** Stratul cu numele dat (sau fără nume), cu restul câmpurilor lui (și cele necunoscute) neatinse. */
function cuNume(s: StratRelief, nume: string | undefined): StratRelief {
  const { nume: _vechi, ...rest } = s;
  return nume === undefined ? rest : { ...rest, nume };
}

/** Stratul `id` cu schimbarea dată, sau null (nu există, ori nimic nu se schimbă). */
export function cuStrat(f: FormaRelief, id: string, sch: SchimbareStrat): FormaRelief | null {
  const k = f.straturi.findIndex((s) => s.id === id);
  const s = f.straturi[k];
  if (!s) return null;
  let nou: StratRelief = s;
  if (sch.vizibil !== undefined && sch.vizibil !== s.vizibil) nou = { ...nou, vizibil: sch.vizibil };
  if (sch.mod !== undefined && sch.mod !== s.mod) nou = { ...nou, mod: sch.mod };
  if (sch.nume !== undefined) {
    const n = numeCurat(sch.nume);
    if (n !== s.nume) nou = cuNume(nou, n);
  }
  if (nou === s) return null;
  return { ...f, straturi: f.straturi.map((x, i) => (i === k ? nou : x)) };
}

/** Stratul `id` mutat cu o poziție: `sus` deasupra celui de după el, `jos` sub cel dinainte; la margine, null. */
export function mutaStrat(f: FormaRelief, id: string, directie: 'sus' | 'jos'): FormaRelief | null {
  const k = f.straturi.findIndex((s) => s.id === id);
  if (k < 0) return null;
  const j = directie === 'sus' ? k + 1 : k - 1;
  if (j < 0 || j >= f.straturi.length) return null;
  const straturi = [...f.straturi];
  [straturi[k], straturi[j]] = [straturi[j]!, straturi[k]!];
  return { ...f, straturi };
}

/** Fără stratul `id`; ultimul strat nu pleacă (un relief are cel puțin unul): null. */
export function stergeStrat(f: FormaRelief, id: string): FormaRelief | null {
  if (f.straturi.length <= 1 || !f.straturi.some((s) => s.id === id)) return null;
  return { ...f, straturi: f.straturi.filter((s) => s.id !== id) };
}

/** Cel mai mic id liber de forma `sN` (N de la 1). */
export function idStratNou(f: FormaRelief): string {
  const folosite = new Set(f.straturi.map((s) => s.id));
  let n = 1;
  while (folosite.has(`s${n}`)) n++;
  return `s${n}`;
}

/** Un strat nou, deasupra tuturor: harta lui (amprenta), numele și modul (implicit „adună”), vizibil; peste plafon, null. */
export function cuStratNou(f: FormaRelief, nou: { readonly dale: string; readonly nume: string; readonly mod?: ModRelief }): FormaRelief | null {
  if (f.straturi.length >= STRATURI_RELIEF_MAXIM) return null;
  const n = numeCurat(nou.nume);
  const s: StratRelief = { id: idStratNou(f), ...(n !== undefined ? { nume: n } : {}), mod: nou.mod ?? 'aduna', vizibil: true, dale: nou.dale };
  return { ...f, straturi: [...f.straturi, s] };
}

/** Câte straturi sunt ascunse: nu intră în compus, deci nici în ce se taie (ADR 0310 §1). */
export function straturiAscunse(f: FormaRelief): number {
  return f.straturi.reduce((n, s) => n + (s.vizibil ? 0 : 1), 0);
}

/**
 * Relieful ales (ADR 0320): elementul-relief al singurei instanțe alese pe foaie, dacă piesa ei are exact unul (altfel nu se
 * știe pe care se pune un strat nou), cu numele lui (al elementului, apoi al piesei, apoi id-ul elementului).
 */
export function reliefAles(doc: Document, alese: readonly string[], foaie: Foaie | undefined): { readonly nod: string; readonly forma: FormaRelief; readonly nume: string } | null {
  if (alese.length !== 1 || !foaie) return null;
  const i = foaie.instante.find((x) => x.id === alese[0]);
  const p = i ? doc.piese.find((x) => x.id === i.piesa) : undefined;
  if (!p) return null;
  const gasite: Array<{ readonly id: string; readonly nume: string | undefined; readonly forma: FormaRelief }> = [];
  const cauta = (n: Nod): void => {
    if (n.tip === 'grup') for (const c of n.copii) cauta(c);
    else if (n.forma.tip === 'relief') gasite.push({ id: n.id, nume: n.nume, forma: n.forma });
  };
  cauta(p.radacina);
  const g = gasite.length === 1 ? gasite[0] : undefined;
  return g ? { nod: g.id, forma: g.forma, nume: g.nume ?? p.nume ?? g.id } : null;
}
