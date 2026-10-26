/**
 * Partea pură a explicației codurilor în panoul mașinii (ADR 0085), fără React: explicația unui cod din dicționar, titlul lui
 * pentru listă și jurnal, și dacă deblocarea cere confirmarea. Cardul e în `PanouCod.tsx`.
 */
import { explicaCod, type DictionarCoduri, type IntrareCod, type TextCod } from '../../shared/coduri.ts';
import type { CodControler, StareSesiune } from '../machine/sesiune.ts';

/** Dicționarul limbii de acum: încă pe drum, sau nevenit (fără rețea, înainte de precache). */
export type StareDictionar = DictionarCoduri | 'incarca' | 'lipsa';

/** Starea sesiunii de care are nevoie explicația. */
type Context = Pick<StareSesiune, 'familie' | 'alarma'>;

export type Explicat = { readonly intrare: IntrareCod | null; readonly text: TextCod | null; readonly nume: string; readonly presupus: boolean };

export function explica(d: DictionarCoduri, st: Context, c: Pick<CodControler, 'fel' | 'cod'>): Explicat {
  if (c.fel === 'blocare') {
    const nume = d.familii[st.familie ?? 'grbl-11'].nume;
    return { intrare: d.blocare, text: d.texte[d.blocare.text] ?? null, nume, presupus: st.familie === null };
  }
  const e = explicaCod(d, st.familie, c.fel, c.cod);
  return { intrare: e.intrare, text: e.text, nume: d.familii[e.familie].nume, presupus: e.presupus };
}

/** Linia controlerului (`error:9`, `ALARM:1`). */
export const linieCod = (c: Pick<CodControler, 'fel' | 'cod'>): string => (c.fel === 'eroare' ? `error:${c.cod}` : c.fel === 'alarma' ? `ALARM:${c.cod}` : 'Alarm');

/** Titlul scurt al unui cod, pentru lista erorilor și jurnal; null fără dicționar sau pentru un cod necunoscut. */
export function titluCod(d: StareDictionar, st: Context, fel: 'eroare' | 'alarma', cod: number): string | null {
  return typeof d === 'object' ? explicaCod(d, st.familie, fel, cod).text?.titlu ?? null : null;
}

/** Linia unui cod din jurnal (`error:N` / `ALARM:N`), cu titlul lui; altfel textul neschimbat. */
export function cuTitlu(text: string, d: StareDictionar, st: Context): string {
  const m = /^(error|ALARM):(\d+)$/.exec(text);
  if (!m) return text;
  const titlu = titluCod(d, st, m[1] === 'error' ? 'eroare' : 'alarma', Number(m[2]));
  return titlu === null ? text : `${text} — ${titlu}`;
}

/**
 * Deblocarea cere confirmarea: alarma care ține mașina pierde poziția (sau nu se știe, fără dicționar ori cu un cod
 * necunoscut, deci tot da).
 */
export function deblocareCuConfirmare(d: StareDictionar, st: Context): boolean {
  const a = st.alarma;
  if (a === null) return false;
  if (typeof d !== 'object') return true;
  const i = explica(d, st, a).intrare;
  return i === null || i.pozitiePierduta === true;
}

