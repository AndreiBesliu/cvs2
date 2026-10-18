/**
 * Mesajele dintre aplicație și workerul PWA (ADR 0045 §5): doar „activează-te acum”, trimis la clicul pe „Reîncarcă”
 * din anunțul actualizării. Workerul nu se activează altfel (în afară de preluarea de la aplicația veche, §6).
 */
export const MESAJ_SKIP_WAITING = { type: 'SKIP_WAITING' } as const;

export function esteSkipWaiting(m: unknown): boolean {
  return typeof m === 'object' && m !== null && (m as { type?: unknown }).type === MESAJ_SKIP_WAITING.type;
}
