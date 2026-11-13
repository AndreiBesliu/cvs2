/**
 * Plăcuțele (ADR 0210 §4, §7; v23), partea fără font: textele cu câmpuri ale unei piese (șablonul), câmpurile ei, valorile
 * unei plăcuțe și „coacerea” unei plăcuțe într-o piesă a ei («Desprinde», gruparea): literele plăcuței intră în arbore în
 * locul literelor șablonului, cu un bloc de text obișnuit (textul ei, scris), iar operațiile le taie ca în lume.
 */
import * as v from 'valibot';
import { amprentaContururi } from './amprentaBloc.ts';
import { blocText, SchemaBlocText, type BlocText } from './blocText.ts';
import { campuriDin } from './campuriText.ts';
import { copieArbore } from './copii.ts';
import { PLAFON, type GrupNod, type Instanta, type Nod, type Piesa } from './document.ts';
import { noduriInInstanta } from './lume.ts';

/** Un text cu câmpuri al unei piese: grupul cu blocul lui valid și numele câmpurilor (în ordine, fără repetări). */
export type TextCuCampuri = { readonly grup: GrupNod; readonly bloc: BlocText; readonly campuri: readonly string[] };

/**
 * Textele cu câmpuri ale piesei, în ordinea arborelui: grupurile cu un bloc de text valid (ADR 0105 §4) în care apare măcar
 * un câmp (`{nume}`). Sub un asemenea grup nu se mai caută (literele lui nu poartă blocuri): un text al plăcuței nu stă sub
 * altul (ușa îl refuză).
 */
export function textePiesei(p: Piesa): TextCuCampuri[] {
  return blocuriPiesei(p).filter((t) => t.campuri.length > 0);
}

/**
 * Textele piesei, cu câmpuri sau fără, în ordinea arborelui: grupurile cu un bloc de text valid (ADR 0105 §4); sub unul nu
 * se mai caută. Din ele, «Din CSV…» face un șablon („Fă din textul ales câmpul”, răspunsul 4b).
 */
export function blocuriPiesei(p: Piesa): TextCuCampuri[] {
  const rez: TextCuCampuri[] = [];
  const stiva: Nod[] = [p.radacina];
  while (stiva.length > 0) {
    const n = stiva.pop();
    if (!n || n.tip !== 'grup') continue;
    const bloc = blocText(n);
    if (bloc) {
      rez.push({ grup: n, bloc, campuri: [...new Set(campuriDin(bloc.continut))] });
      continue;
    }
    for (let k = n.copii.length - 1; k >= 0; k--) {
      const c = n.copii[k];
      if (c) stiva.push(c);
    }
  }
  return rez;
}

/** Câmpurile piesei: ale tuturor textelor ei, în ordinea în care apar, fiecare o dată. */
export function campuriPiesei(p: Piesa): string[] {
  return [...new Set(textePiesei(p).flatMap((t) => t.campuri))];
}

/**
 * Valorile unei plăcuțe a piesei: cele date, plus un text gol pentru fiecare câmp al piesei fără valoare (celula goală a
 * unui rând): textul plăcuței are atunci toate câmpurile înlocuite. Valorile altor câmpuri (ale unei versiuni de șablon mai
 * vechi, ale CSV-ului) rămân.
 */
export function valoriPlacutei(p: Piesa, valori: Readonly<Record<string, string>>): Record<string, string> {
  const rez: Record<string, string> = { ...valori };
  // Ca proprietate proprie: un câmp se poate numi și `__proto__` (ADR 0024 §9: cheile sunt date), iar o atribuire nu l-ar crea.
  for (const c of campuriPiesei(p)) if (!Object.hasOwn(rez, c)) Object.defineProperty(rez, c, { value: '', enumerable: true, writable: true, configurable: true });
  return rez;
}

/**
 * Blocul unui text copt: textul plăcuței, scris (fără câmpuri de înlocuit, dacă valorile n-au acolade), cu amprenta
 * literelor ei. Spațierile literelor alese (ADR 0138 §5) țin de caracterele șablonului, deci nu trec. Un text gol sau care
 * iese din marginile blocului (prea lung) nu mai are bloc: literele rămân doar vectori.
 */
function blocCopt(bloc: BlocText, continut: string, copii: readonly Nod[]): BlocText | null {
  const { spatieri: _spatieri, ...rest } = bloc;
  const nou = { ...rest, continut, amprenta: amprentaContururi(copii) };
  return v.safeParse(SchemaBlocText, nou).success ? nou : null;
}

/**
 * Piesa unei plăcuțe, coaptă (ADR 0210 §4, «Desprinde»): arborele piesei `p` cu literele plăcuței `i` în locul literelor
 * șablonului, fiecare text cu blocul lui obișnuit, și operațiile care taie ce taie în lume (rama, apoi literele plăcuței);
 * o operație rămasă fără nimic de tăiat pleacă. Id-ul piesei e `id`; instanța nu mai ține literele (doar valorile).
 */
export function placutaCoapta(p: Piesa, i: Instanta, id: string): { readonly piesa: Piesa; readonly instanta: Instanta } {
  const { texte, ...fara } = i;
  const { radacina, operatii: vechi, ...rest } = p;
  const instanta = { ...structuredClone(fara), piesa: id };
  if (!texte) return { piesa: { ...structuredClone(rest), id, radacina: copieArbore(radacina), operatii: structuredClone(vechi) }, instanta };
  const coace = (n: Nod): Nod => {
    if (n.tip !== 'grup') return n;
    const t = Object.hasOwn(texte, n.id) ? texte[n.id] : undefined;
    if (!t) {
      const copii = n.copii.map(coace);
      return copii.every((c, k) => c === n.copii[k]) ? n : { ...n, copii };
    }
    const { text: _text, ...grup } = n as GrupNod & { text?: unknown };
    const vechi = blocText(n);
    const bloc = vechi ? blocCopt(vechi, t.continut, t.copii) : null;
    return { ...grup, copii: t.copii, ...(bloc ? { text: bloc } : {}) };
  };
  const noduri = noduriInInstanta(radacina, texte);
  const operatii = vechi.flatMap((o) => {
    const n = noduri(o);
    return n.length > 0 ? [{ ...structuredClone(o), noduri: [...n] }] : [];
  });
  // Un text pe rădăcină dă numele piesei, ca piesa unui text (primul rând nevid): al plăcuței, nu „Masa {nr}”.
  const peRadacina = Object.hasOwn(texte, radacina.id) ? texte[radacina.id] : undefined;
  const { nume: _nume, ...faraNume } = rest;
  const nume = peRadacina ? (peRadacina.continut.split('\n').find((r) => r.trim() !== '') ?? '').trim().slice(0, PLAFON.numeLungime) : rest.nume;
  // Noduri noi (formele împărțite, ca la Ctrl+D): piesa coaptă nu ține obiectele șablonului sau ale plăcuței.
  return { piesa: { ...structuredClone(faraNume), ...(nume ? { nume } : {}), id, radacina: copieArbore(coace(radacina)), operatii }, instanta };
}
