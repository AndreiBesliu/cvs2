/**
 * Mesajele dintre aplicație și workerul PWA: „activează-te acum” (ADR 0045 §5), trimis la clicul pe „Reîncarcă” din
 * anunțul actualizării (workerul nu se activează altfel, în afară de preluarea de la aplicația veche, §6), și progresul
 * instalării (ADR 0097): trimis de worker filelor deschise, după fiecare fișier, și cerut de o filă care începe să asculte
 * în mijlocul instalării.
 */
export const MESAJ_SKIP_WAITING = { type: 'SKIP_WAITING' } as const;

export function esteSkipWaiting(m: unknown): boolean {
  return typeof m === 'object' && m !== null && (m as { type?: unknown }).type === MESAJ_SKIP_WAITING.type;
}

/**
 * Progresul instalării (ADR 0097): câți octeți din precache-ul workerului care se instalează sunt gata (`gata`, aduși sau
 * găsiți deja în cache) din câți are (`total`), după mărimile scrise în manifest la build.
 */
export const TIP_PROGRES = 'PROGRES_INSTALARE';
/** Cererea filei care începe să asculte cât workerul se instalează deja: workerul răspunde cu progresul de până acum. */
export const MESAJ_CERE_PROGRES = { type: 'CERE_PROGRES' } as const;

export function esteCerereProgres(m: unknown): boolean {
  return typeof m === 'object' && m !== null && (m as { type?: unknown }).type === MESAJ_CERE_PROGRES.type;
}

export interface MesajProgres {
  readonly type: typeof TIP_PROGRES;
  readonly gata: number;
  readonly total: number;
}

const numar = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

export function esteProgres(m: unknown): m is MesajProgres {
  if (typeof m !== 'object' || m === null) return false;
  const p = m as Record<string, unknown>;
  return p['type'] === TIP_PROGRES && numar(p['gata']) && numar(p['total']) && p['total'] > 0 && p['gata'] <= p['total'];
}

/** Procentul întreg, rotunjit în jos: 100 doar când e gata tot precache-ul. */
export const procentDin = (m: Pick<MesajProgres, 'gata' | 'total'>): number => Math.floor((m.gata * 100) / m.total);
