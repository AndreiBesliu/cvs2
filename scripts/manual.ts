/**
 * Manualul utilizatorului (documentația live, ADR 0058), generat la fiecare build din `docs/manual/ro.md` și `en.md` în
 * `dist/manual/ro.json` și `en.json` (contractul: `shared/manual.ts`).
 *
 * Sursa: un `# Titlu` al manualului, apoi capitolele, fiecare de la un `## Titlu`. Imediat sub titlul capitolului stau
 * rândurile de metadate, care nu ajung la om:
 * - `%% capitol: id` (obligatoriu): id-ul capitolului, același în ambele limbi (ținta linkurilor `#id` și a ajutorului F1);
 * - `%% acopera: usa, usa` (opțional, se poate repeta): ușile interfeței pe care le descrie capitolul (acțiunile
 *   registrului, uneltele și controalele editării). Poarta de acoperire (`test/unit/manual.test.ts`) cere ca fiecare ușă
 *   să fie descrisă, cu eticheta ei din interfață, în capitolul care o acoperă.
 *
 * **Poarta generatorului:** un capitol fără id, un id repetat sau cu alte caractere, un rând `%%` în afara locului lui sau o
 * cheie necunoscută, capitolele diferite între limbi (alte id-uri sau altă ordine) sau un link `#id` spre un capitol care
 * nu există opresc build-ul, cu fișierul și motivul (`EroareDocumentatie`). Determinist: textul cu LF.
 */
import { LIMBI_MANUAL, fisierManual, type CapitolManual, type LimbaManual, type Manual } from '../shared/manual.ts';

/** Sursa manualului într-o limbă, în repo. */
export const sursaManual = (limba: LimbaManual): string => `docs/manual/${limba}.md`;

export class EroareManual extends Error {
  readonly cale: string;
  constructor(cale: string, motiv: string) {
    super(`${cale}: ${motiv}`);
    this.name = 'EroareManual';
    this.cale = cale;
  }
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const USA = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

/** Pură: manualul dintr-o limbă, citit din sursa lui (`cale`, pentru mesajele de eroare). */
export function citesteManual(text: string, limba: LimbaManual, cale: string): Manual {
  const linii = text.replace(/\r\n?/g, '\n').split('\n');
  let k = 0;
  while (k < linii.length && linii[k]!.trim() === '') k++;
  const t = /^# (.+)$/.exec(linii[k] ?? '');
  if (!t) throw new EroareManual(cale, 'manualul începe cu „# Titlu”');
  const titlu = t[1]!.trim();
  const capitole: CapitolManual[] = [];
  const vazute = new Set<string>();
  let curent: { titlu: string; rand: number; id: string | null; acopera: string[]; text: string[]; inMetadate: boolean } | null = null;
  let inCod = false;
  const inchide = (): void => {
    if (!curent) return;
    if (!curent.id) throw new EroareManual(cale, `rândul ${curent.rand}: capitolul „${curent.titlu}” n-are „%% capitol: id” imediat sub titlu`);
    capitole.push({ id: curent.id, titlu: curent.titlu, text: curent.text.join('\n').trim(), acopera: curent.acopera });
  };
  for (let i = k + 1; i < linii.length; i++) {
    const l = linii[i]!, rand = i + 1;
    if (/^\s*(```|~~~)/.test(l)) inCod = !inCod;
    if (!inCod && /^# /.test(l)) throw new EroareManual(cale, `rândul ${rand}: un singur „# ” (titlul manualului); capitolele încep cu „## ”`);
    const h = inCod ? null : /^## (.+)$/.exec(l);
    if (h) {
      inchide();
      curent = { titlu: h[1]!.trim(), rand, id: null, acopera: [], text: [], inMetadate: true };
      continue;
    }
    const m = inCod ? null : /^%%\s*([a-z]+)\s*:\s*(.*)$/.exec(l);
    if (!inCod && l.startsWith('%%')) {
      if (!curent || !curent.inMetadate || !m) throw new EroareManual(cale, `rândul ${rand}: metadatele („%% cheie: valoare”) stau doar imediat sub titlul unui capitol`);
      const [, cheie, valoare = ''] = m;
      if (cheie === 'capitol') {
        const id = valoare.trim();
        if (curent.id) throw new EroareManual(cale, `rândul ${rand}: capitolul „${curent.titlu}” are două id-uri`);
        if (!ID.test(id)) throw new EroareManual(cale, `rândul ${rand}: id-ul „${id}” are doar litere mici, cifre și cratime`);
        if (vazute.has(id)) throw new EroareManual(cale, `rândul ${rand}: id-ul „${id}” e deja al altui capitol`);
        vazute.add(id);
        curent.id = id;
      } else if (cheie === 'acopera') {
        for (const u of valoare.split(',').map((x) => x.trim()).filter((x) => x !== '')) {
          if (!USA.test(u)) throw new EroareManual(cale, `rândul ${rand}: ușa „${u}” se scrie ca id-urile acțiunilor (grup.nume)`);
          if (curent.acopera.includes(u)) throw new EroareManual(cale, `rândul ${rand}: ușa „${u}” e de două ori în capitol`);
          curent.acopera.push(u);
        }
      } else {
        throw new EroareManual(cale, `rândul ${rand}: cheie necunoscută „${cheie}” (doar capitol și acopera)`);
      }
      continue;
    }
    if (!curent) {
      if (l.trim() !== '') throw new EroareManual(cale, `rândul ${rand}: între titlul manualului și primul capitol nu stă text`);
      continue;
    }
    curent.inMetadate = false;
    curent.text.push(l);
  }
  inchide();
  if (capitole.length === 0) throw new EroareManual(cale, 'manualul n-are niciun capitol („## Titlu”)');
  return { schema: 1, limba, titlu, capitole };
}

/** Pură: ambele limbi au aceleași capitole, în aceeași ordine (altfel F1 și linkurile ar duce în altă parte). */
export function verificaLimbile(manuale: readonly Manual[]): void {
  const [prima, ...restul] = manuale;
  if (!prima) return;
  const ids = prima.capitole.map((c) => c.id).join(', ');
  for (const m of restul) {
    const altele = m.capitole.map((c) => c.id).join(', ');
    if (altele !== ids) throw new EroareManual(sursaManual(m.limba), `capitolele (${altele}) nu sunt cele din ${sursaManual(prima.limba)} (${ids}), în aceeași ordine`);
  }
}

/** Pură: fiecare link `[…](#id)` al unui capitol duce la un capitol care există (altfel ar rămâne text mort). */
export function verificaLegaturi(m: Manual): void {
  const ids = new Set(m.capitole.map((c) => c.id));
  for (const c of m.capitole) {
    // Fără codul inline (un exemplu de sintaxă nu e un link).
    const fara = `${c.titlu}\n${c.text}`.replace(/`[^`\n]*`/g, '');
    for (const x of fara.matchAll(/\]\(#([^)\s]*)\)/g)) {
      if (!ids.has(x[1]!)) throw new EroareManual(sursaManual(m.limba), `capitolul „${c.id}” are un link spre „#${x[1]}”, care nu e un capitol`);
    }
  }
}

/** Fișierele manualului pentru build (`manual/ro.json`, `manual/en.json`), din sursele citite cu `citeste(cale)`. */
export function genereazaManualul(citeste: (cale: string) => string): Map<string, string> {
  const manuale = LIMBI_MANUAL.map((l) => citesteManual(citeste(sursaManual(l)), l, sursaManual(l)));
  verificaLimbile(manuale);
  for (const m of manuale) verificaLegaturi(m);
  return new Map(manuale.map((m) => [fisierManual(m.limba), JSON.stringify(m)]));
}
