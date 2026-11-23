/**
 * Generatorul dicționarului codurilor imprimantelor (felia 3.6v, ADR 0195): tabelul fiecărei familii (`src/machine/imprimanta/
 * coduri/k1.ts`) și textele lui (`k1.ro.ts`, `k1.en.ts`) devin `coduri/<familie>.<limba>.json`, scrise de build lângă
 * dicționarul controlerelor (ADR 0085) și puse în precache. Fereastra Imprimanta le cere la prima eroare, deci textele nu
 * încarcă JavaScript-ul aplicației. O cheie fără text într-o limbă sau un text fără cheie oprește generarea.
 */
import { LIMBI_CODURI, type LimbaCoduri } from '../shared/coduri.ts';
import {
  esteDictionarImprimanta, FAMILII_IMPRIMANTA, fisierCoduriImprimanta, type DictionarImprimanta, type FamilieImprimanta,
  type IntrareCodImprimanta, type TextCodImprimanta,
} from '../shared/coduriImprimanta.ts';
import { CODURI_K1, LISTA_K1, type IntrareK1 } from '../src/machine/imprimanta/coduri/k1.ts';
import { textK1En } from '../src/machine/imprimanta/coduri/k1.en.ts';
import { textK1Ro } from '../src/machine/imprimanta/coduri/k1.ro.ts';

type Texte = Readonly<Record<number, TextCodImprimanta>>;
type Sursa = {
  readonly nume: string;
  readonly lista: string;
  readonly coduri: Readonly<Record<number, IntrareK1>>;
  readonly texte: Readonly<Record<LimbaCoduri, Texte>>;
};

const SURSE: Readonly<Record<FamilieImprimanta, Sursa>> = {
  'creality-k1': { nume: 'Creality K1', lista: LISTA_K1, coduri: CODURI_K1, texte: { ro: textK1Ro, en: textK1En } },
};

/** Dicționarul unei familii, într-o limbă (pur; testele îl citesc fără build, și cu alte texte, ca să probeze gărzile). */
export function dictionarImprimanta(familie: FamilieImprimanta, limba: LimbaCoduri, texte: Texte = SURSE[familie].texte[limba]): DictionarImprimanta {
  const s = SURSE[familie];
  const chei = Object.keys(s.coduri).map(Number).sort((a, b) => a - b);
  const faraText = chei.filter((k) => !Object.hasOwn(texte, k));
  const faraCheie = Object.keys(texte).filter((k) => !Object.hasOwn(s.coduri, k));
  if (faraText.length > 0 || faraCheie.length > 0) {
    throw new Error(`Codurile ${familie} (${limba}): ${[
      faraText.length > 0 ? `chei fără text: ${faraText.join(', ')}` : '',
      faraCheie.length > 0 ? `texte fără cheie: ${faraCheie.join(', ')}` : '',
    ].filter((x) => x !== '').join('; ')}`);
  }
  const erori = Object.fromEntries(chei.map((k): [string, IntrareCodImprimanta] => {
    const c = s.coduri[k] as IntrareK1;
    const t = texte[k] as TextCodImprimanta;
    return [String(k), { cod: c.cod, grava: c.grava, titlu: t.titlu, faci: t.faci, ...(c.wiki === undefined ? {} : { wiki: c.wiki }) }];
  }));
  const d = { schema: 1 as const, familie, limba, nume: s.nume, lista: s.lista, erori };
  if (!esteDictionarImprimanta(d, familie, limba)) throw new Error(`Codurile ${familie} (${limba}) nu au forma citită de fereastră.`);
  return d;
}

/** Fișierele dicționarului, cale → conținut. */
export function genereazaCoduriImprimanta(): Map<string, string> {
  return new Map(FAMILII_IMPRIMANTA.flatMap((f) => LIMBI_CODURI.map((l): [string, string] => [fisierCoduriImprimanta(f, l), JSON.stringify(dictionarImprimanta(f, l))])));
}
