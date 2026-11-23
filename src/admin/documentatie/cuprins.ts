/**
 * Fila Documentație (ADR 0260 §8, felia A.6), partea pură: cuprinsul documentului (titlurile lui, cu ancorele cititorului),
 * secțiunea de acum, titlul unui ADR despărțit de restul (ca starea să stea sub el) și data din rândul „**Starea:**”.
 */
import { parseazaMarkdown, textSimplu } from '../../docs/markdown.ts';

export interface IntrareCuprins {
  readonly ancora: string;
  readonly text: string;
  readonly nivel: 2 | 3;
}

/**
 * Titlurile de nivel 2 și 3 de la rădăcina documentului (cele din liste sau citate nu sunt titluri), cu ancorele pe care le
 * dă cititorul aceluiași text: id-ul unui titlu de pe pagină e `md-` + ancora.
 */
export function cuprins(text: string): IntrareCuprins[] {
  return parseazaMarkdown(text).flatMap((b): IntrareCuprins[] => (
    b.tip === 'titlu' && (b.nivel === 2 || b.nivel === 3) ? [{ ancora: b.ancora, text: textSimplu(b.continut), nivel: b.nivel }] : []
  ));
}

/**
 * Secțiunea de acum: ultimul titlu ajuns la `prag` de sus (pozițiile lor pe ecran, în ordinea documentului); la capătul
 * paginii, ultimul (o secțiune scurtă de la capăt nu mai urcă până la prag). -1: niciunul încă (începutul documentului).
 */
export function sectiuneaDeAcum(sus: readonly number[], prag: number, laCapat: boolean): number {
  if (laCapat && sus.length > 0) return sus.length - 1;
  let k = -1;
  sus.forEach((y, i) => { if (y <= prag) k = i; });
  return k;
}

const RE_TITLU_1 = /^ {0,3}#[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;

/** Titlul de nivel 1 de la începutul documentului (markdown inline) și restul textului; fără el, tot textul rămâne. */
export function desparteTitlul(text: string): { readonly titlu: string | null; readonly rest: string } {
  const linii = text.replace(/\r\n?/g, '\n').split('\n');
  const k = linii.findIndex((l) => l.trim() !== '');
  const m = k < 0 ? null : RE_TITLU_1.exec(linii[k] ?? '');
  return m ? { titlu: (m[1] ?? '').trim(), rest: linii.slice(k + 1).join('\n') } : { titlu: null, rest: text };
}

/** Prima dată (`zz.ll.aaaa`) din rândul „**Starea:**” al unui ADR: ziua în care a primit starea; fără rând sau dată, nimic. */
export function dataStarii(text: string): string | null {
  const s = /^\*\*Starea:\*\*(.*)$/m.exec(text)?.[1] ?? '';
  return /\b\d{2}\.\d{2}\.\d{4}\b/.exec(s)?.[0] ?? null;
}
