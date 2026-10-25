/**
 * Testul pas cu pas al owner-ului (ADR 0072), generat la fiecare build din `docs/tutorial/<id>.md` în
 * `dist/tutorial/<id>.json` (contractul: `shared/tutorial.ts`).
 *
 * Sursa: `# Titlu`, un paragraf de introducere, apoi secțiunile (`## Titlu`), iar în fiecare, pașii (`### Titlu`). Imediat
 * sub titlul pasului: `%% pas: id`, apoi `%% faci` cu textul lui și `%% vezi` cu al lui (markdown inline, pe mai multe
 * rânduri, unite cu un spațiu).
 *
 * **Poarta generatorului:** un pas fără id sau cu un id repetat ori cu alte caractere, fără „faci” sau „vezi”, un rând `%%`
 * necunoscut, un pas în afara unei secțiuni sau o secțiune fără pași opresc build-ul, cu fișierul și motivul. Determinist.
 */
import { fisierTutorial, TUTORIALE, type IdTutorial, type PasTutorial, type Tutorial } from '../shared/tutorial.ts';

/** Sursa unui test, în repo. */
export const sursaTutorial = (id: IdTutorial): string => `docs/tutorial/${id}.md`;

export class EroareTutorial extends Error {
  readonly cale: string;
  constructor(cale: string, motiv: string) {
    super(`${cale}: ${motiv}`);
    this.name = 'EroareTutorial';
    this.cale = cale;
  }
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Pură: testul `id`, citit din sursa lui (`cale`, pentru mesajele de eroare). */
export function citesteTutorial(text: string, id: IdTutorial, cale: string): Tutorial {
  const linii = text.replace(/\r\n?/g, '\n').split('\n');
  let k = 0;
  while (k < linii.length && linii[k]!.trim() === '') k++;
  const t = /^# (.+)$/.exec(linii[k] ?? '');
  if (!t) throw new EroareTutorial(cale, 'testul începe cu „# Titlu”');
  const intro: string[] = [];
  const sectiuni: Array<{ titlu: string; pasi: PasTutorial[] }> = [];
  const vazute = new Set<string>();
  let pas: { titlu: string; rand: number; id: string | null; faci: string[]; vezi: string[]; camp: 'faci' | 'vezi' | null } | null = null;
  const inchidePas = (): void => {
    if (!pas) return;
    const p = pas;
    pas = null;
    if (!p.id) throw new EroareTutorial(cale, `rândul ${p.rand}: pasul „${p.titlu}” n-are „%% pas: id” imediat sub titlu`);
    const faci = p.faci.join(' ').trim(), vezi = p.vezi.join(' ').trim();
    if (!faci || !vezi) throw new EroareTutorial(cale, `rândul ${p.rand}: pasul „${p.id}” cere „%% faci” și „%% vezi”, cu text`);
    sectiuni[sectiuni.length - 1]!.pasi.push({ id: p.id, titlu: p.titlu, faci, vezi });
  };
  for (let i = k + 1; i < linii.length; i++) {
    const l = linii[i]!, rand = i + 1;
    if (/^# /.test(l)) throw new EroareTutorial(cale, `rândul ${rand}: un singur „# ” (titlul testului)`);
    const s = /^## (.+)$/.exec(l);
    if (s) {
      inchidePas();
      if (sectiuni.length > 0 && sectiuni[sectiuni.length - 1]!.pasi.length === 0) throw new EroareTutorial(cale, `rândul ${rand}: secțiunea dinainte n-are pași`);
      sectiuni.push({ titlu: s[1]!.trim(), pasi: [] });
      continue;
    }
    const h = /^### (.+)$/.exec(l);
    if (h) {
      inchidePas();
      if (sectiuni.length === 0) throw new EroareTutorial(cale, `rândul ${rand}: pasul „${h[1]!.trim()}” stă în afara unei secțiuni („## ”)`);
      pas = { titlu: h[1]!.trim(), rand, id: null, faci: [], vezi: [], camp: null };
      continue;
    }
    const m = /^%%\s*([a-z]+)\s*(?::\s*(.*))?$/.exec(l);
    if (m) {
      if (!pas) throw new EroareTutorial(cale, `rândul ${rand}: „%%” stă doar sub un pas`);
      const [cheie, valoare = ''] = [m[1]!, (m[2] ?? '').trim()];
      if (cheie === 'pas') {
        if (pas.id !== null || pas.camp !== null) throw new EroareTutorial(cale, `rândul ${rand}: „%% pas” stă o dată, imediat sub titlu`);
        if (!ID.test(valoare)) throw new EroareTutorial(cale, `rândul ${rand}: id-ul „${valoare}” are doar litere mici, cifre și liniuțe`);
        if (vazute.has(valoare)) throw new EroareTutorial(cale, `rândul ${rand}: id-ul „${valoare}” se repetă`);
        vazute.add(valoare);
        pas.id = valoare;
      } else if (cheie === 'faci' || cheie === 'vezi') {
        if (valoare) throw new EroareTutorial(cale, `rândul ${rand}: textul lui „%% ${cheie}” stă pe rândurile de dedesubt`);
        pas.camp = cheie;
      } else {
        throw new EroareTutorial(cale, `rândul ${rand}: cheia „${cheie}” nu există (pas, faci, vezi)`);
      }
      continue;
    }
    if (l.trim() === '') continue;
    if (pas) {
      if (!pas.camp) throw new EroareTutorial(cale, `rândul ${rand}: textul pasului „${pas.titlu}” stă sub „%% faci” sau „%% vezi”`);
      pas[pas.camp].push(l.trim());
    } else if (sectiuni.length === 0) {
      intro.push(l.trim());
    } else {
      throw new EroareTutorial(cale, `rândul ${rand}: text în afara unui pas`);
    }
  }
  inchidePas();
  if (sectiuni.length === 0 || sectiuni[sectiuni.length - 1]!.pasi.length === 0) throw new EroareTutorial(cale, 'testul cere secțiuni cu pași');
  return { schema: 1, id, titlu: t[1]!.trim(), intro: intro.join(' '), sectiuni };
}

/** Fișierele testelor pentru build (`tutorial/<id>.json`), din sursele citite cu `citeste(cale)`. */
export function genereazaTutorialele(citeste: (cale: string) => string): Map<string, string> {
  return new Map(TUTORIALE.map((id) => [fisierTutorial(id), JSON.stringify(citesteTutorial(citeste(sursaTutorial(id)), id, sursaTutorial(id)))]));
}
