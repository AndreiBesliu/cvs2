/** Fila Roadmap (ADR 0048), partea pură: ce arată cronologia și panoul etapei. */
import type { Etapa, Roadmap } from '../../../shared/documentatie.ts';

export interface Progres {
  readonly gata: number;
  readonly total: number;
  /** `felii`: din fișa etapei; `puncte`: fără fișă, punctele din `PLAN.md` §5.3 atinse de felii aduse înainte. */
  readonly fel: 'felii' | 'puncte' | 'nimic';
}

/** Pură: cât din etapă e făcut, pentru umplerea barei ei. */
export function progresEtapa(e: Etapa): Progres {
  if (e.felii.length > 0 && e.fisa !== null) return { gata: e.felii.filter((f) => f.stare === 'gata').length, total: e.felii.length, fel: 'felii' };
  if (e.puncte.length > 0) return { gata: e.puncte.filter((p) => p.felii.length > 0).length, total: e.puncte.length, fel: 'puncte' };
  return { gata: 0, total: 0, fel: 'nimic' };
}

/** Pură: `16.10 21:35 → 22:20` (aceeași zi o singură dată); neterminată: `02.01 12:00 →`. */
export function interval(started: string | null, completed: string | null): string {
  if (started === null) return '';
  if (completed === null) return `${started} →`;
  if (completed === started) return started;
  const zi = (s: string): string => s.slice(0, 5);
  const ora = (s: string): string => s.slice(6);
  return zi(started) === zi(completed) && ora(completed) !== '' ? `${started} → ${ora(completed)}` : `${started} → ${completed}`;
}

/**
 * Pură: reperul unui live, adică ce spune coloana „Live” din `PLAN.md` §5.4 în afară de „da” („primul”, „pachetul la
 * ateliere”, „lansarea”); null pe un live obișnuit sau pe „nu”.
 */
export function reperLive(live: string): string | null {
  const s = live.replace(/\*/g, '').trim();
  if (/^nu\b/i.test(s)) return null;
  const rest = s.replace(/^da\b\s*[;,]?\s*/i, '').replace(/^\((.*)\)$/, '$1').trim();
  return rest === '' ? null : rest;
}

/** Pură: etapa aleasă la deschidere: cea curentă, altfel prima. */
export function etapaImplicita(r: Roadmap): string | null {
  return (r.etape.find((e) => e.curenta) ?? r.etape[0])?.id ?? null;
}
