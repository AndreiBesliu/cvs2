/**
 * Generatorul dicționarului codurilor controlerului (ADR 0085): tabelele `src/machine/coduri/tabel.ts` și textele lor
 * (`texte.en.ts`, `texte.ro.ts`) devin `coduri/ro.json` și `coduri/en.json`, scrise de build lângă manual și puse în precache.
 * Panoul mașinii le cere la primul cod, așa că textele nu încarcă JavaScript-ul aplicației. Un text pe care nicio intrare nu-l
 * folosește oprește generarea: ori lipsește o intrare, ori textul e în plus.
 */
import { esteDictionarCoduri, FAMILII_CODURI, fisierCoduri, LIMBI_CODURI, type DictionarCoduri, type LimbaCoduri, type TabelFamilie, type TextCod } from '../shared/coduri.ts';
import { BLOCARE, TABELE, type Intrare } from '../src/machine/coduri/tabel.ts';
import { textCoduriEn } from '../src/machine/coduri/texte.en.ts';
import { textCoduriRo } from '../src/machine/coduri/texte.ro.ts';

const TEXTE: Readonly<Record<LimbaCoduri, Readonly<Record<string, TextCod>>>> = { en: textCoduriEn, ro: textCoduriRo };

const peChei = (t: Readonly<Record<number, Intrare>>): Record<string, Intrare> =>
  Object.fromEntries(Object.entries(t).sort(([a], [b]) => Number(a) - Number(b)));

/** Dicționarul unei limbi (pur; testele îl citesc fără build, și cu alte texte, ca să probeze gărzile). */
export function dictionarCoduri(limba: LimbaCoduri, texteLimbii: Readonly<Record<string, TextCod>> = TEXTE[limba]): DictionarCoduri {
  const familii = Object.fromEntries(FAMILII_CODURI.map((f): [string, TabelFamilie] => {
    const t = TABELE[f];
    return [f, { nume: t.nume, erori: peChei(t.erori), alarme: peChei(t.alarme) }];
  })) as Record<(typeof FAMILII_CODURI)[number], TabelFamilie>;
  const folosite = new Set<string>([BLOCARE.text, ...FAMILII_CODURI.flatMap((f) => [...Object.values(TABELE[f].erori), ...Object.values(TABELE[f].alarme)].map((i) => i.text))]);
  const nefolosite = Object.keys(texteLimbii).filter((k) => !folosite.has(k));
  if (nefolosite.length > 0) throw new Error(`Dicționarul codurilor: texte pe care nicio intrare nu le folosește: ${nefolosite.join(', ')}`);
  const texte = Object.fromEntries([...folosite].sort().map((k) => [k, texteLimbii[k]]));
  const d = { schema: 1 as const, limba, texte, familii, blocare: BLOCARE };
  if (!esteDictionarCoduri(d)) throw new Error(`Dicționarul codurilor (${limba}) nu are forma citită de panou.`);
  return d;
}

/** Fișierele dicționarului, cale → conținut. */
export function genereazaCodurile(): Map<string, string> {
  return new Map(LIMBI_CODURI.map((l) => [fisierCoduri(l), JSON.stringify(dictionarCoduri(l))]));
}
