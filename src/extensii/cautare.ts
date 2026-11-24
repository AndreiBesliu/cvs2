/**
 * Căutarea și categoriile din fereastra bibliotecii (ADR 0233), partea pură: ce înseamnă „se potrivește”, în ce ordine ies
 * cele găsite și ce rafturi are lista. Fără DOM și fără texte de interfață: numele categoriilor, în limba aplicației, vin
 * de la fereastră, printre textele în care se caută.
 *
 * Regula: textul căutat se desparte în cuvinte, comparate fără diacritice și fără majuscule. Fiecare cuvânt trebuie găsit,
 * fiecare unde poate: oriunde în numele (sau în id-ul) extensiei, ori la începutul unui cuvânt din celelalte texte
 * (descrierea, descrierea lungă, autorul, numele categoriilor ei). În nume e îngăduitoare („draw” găsește „Easy 3Draw”);
 * în descrieri, două litere din mijlocul unui cuvânt ar găsi aproape orice.
 */
import { CATEGORII_BIBLIOTECA, type CategorieBiblioteca } from '../../shared/biblioteca.ts';

/** Ce se caută într-o extensie. */
export type DeCautat = {
  readonly id: string;
  readonly nume: string;
  /** Textele în care un cuvânt căutat trebuie să înceapă un cuvânt. */
  readonly texte: readonly string[];
  /** Rafturile pe care stă (o extensie din afara bibliotecii n-are niciunul). */
  readonly categorii: readonly CategorieBiblioteca[];
};

/** Fără diacritice și fără majuscule. */
export const simplu = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const cuvinte = (s: string): string[] => simplu(s).split(/[^\p{L}\p{N}]+/u).filter((c) => c.length > 0);

/** Cuvintele textului căutat (semnele și spațiile despart). */
export const cuvinteCautate = (text: string): string[] => cuvinte(text);

/** 0: nu se potrivește; 2: toate cuvintele sunt în nume (sau în id); 1: măcar unul e doar în celelalte texte. */
function potrivire(e: DeCautat, cautate: readonly string[]): 0 | 1 | 2 {
  const nume = `${simplu(e.nume)} ${e.id}`;
  let inTexte: string[] | null = null;
  let doarNume = true;
  for (const c of cautate) {
    if (nume.includes(c)) continue;
    inTexte ??= e.texte.flatMap(cuvinte);
    if (!inTexte.some((x) => x.startsWith(c))) return 0;
    doarNume = false;
  }
  return doarNume ? 2 : 1;
}

/**
 * Ce rămâne la vedere din listă: extensiile care se potrivesc cu textul căutat și stau pe raftul ales (`null`: toate
 * rafturile). Potrivirile din nume stau înaintea celor doar din descrieri; în rest, ordinea listei. `inAlteCategorii`: câte
 * s-ar mai potrivi cu textul pe celelalte rafturi (fără text căutat, 0: raftul ales e chiar alegerea omului).
 */
export function cauta<T extends DeCautat>(elemente: readonly T[], text: string, categorie: CategorieBiblioteca | null): {
  readonly vizibile: T[]; readonly inAlteCategorii: number;
} {
  const cautate = cuvinteCautate(text);
  const gasite = elemente.map((e) => ({ e, p: cautate.length === 0 ? 2 : potrivire(e, cautate) })).filter((x) => x.p > 0);
  const peRaft = gasite.filter((x) => categorie === null || x.e.categorii.includes(categorie));
  return {
    // Sortarea e stabilă: la aceeași potrivire, ordinea listei.
    vizibile: [...peRaft].sort((a, b) => b.p - a.p).map((x) => x.e),
    inAlteCategorii: cautate.length === 0 ? 0 : gasite.length - peRaft.length,
  };
}

/** Rafturile listei: doar cele pe care stă măcar o extensie, în ordinea catalogului lor, fiecare cu numărul ei. */
export function categoriiPrezente(elemente: readonly DeCautat[]): Array<{ readonly id: CategorieBiblioteca; readonly cate: number }> {
  return CATEGORII_BIBLIOTECA
    .map((id) => ({ id, cate: elemente.filter((e) => e.categorii.includes(id)).length }))
    .filter((c) => c.cate > 0);
}
