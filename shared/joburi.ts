/**
 * Joburile programate și judecata marcajului lor de rulare (ADR 0041 §2–§4), comune serverului (care scrie marcajul) și
 * Diagnozei (care îl judecă). Pure: timpii sunt milisecunde de la epocă.
 */

export interface DefinitieJob {
  readonly nume: string;
  /** Programarea cron, în fusul `fus`. */
  readonly programare: string;
  readonly fus: string;
  readonly intervalOre: number;
  readonly timeoutSecunde: number;
}

/** Joburile așteptate: Diagnoza le judecă pe toate, deci și pe cel care n-a scris niciodată un marcaj. */
export const JOBURI = [
  { nume: 'backupZilnic', programare: '0 3 * * *', fus: 'Europe/Bucharest', intervalOre: 24, timeoutSecunde: 300 },
  { nume: 'verificaBackup', programare: '0 5 * * *', fus: 'Europe/Bucharest', intervalOre: 24, timeoutSecunde: 120 },
] as const satisfies readonly DefinitieJob[];

export type NumeJob = (typeof JOBURI)[number]['nume'];

export const COLECTIE_MARCAJE = 'marcaje';

/** Marcajul citit (timpii în ms); `null` = câmp lipsă. */
export interface Marcaj {
  readonly ultimaPornire: number | null;
  readonly ultimulFinal: number | null;
  readonly ultimulSucces: number | null;
  readonly esecuriLaRand: number;
  readonly ultimaEroare: string | null;
}

export type MotivJudecata =
  | 'niciodata' | 'ruleaza' | 'fara-final' | 'esecuri' | 'fara-succes' | 'vechi' | 'un-esec' | 'bine' | 'nevalid';

export interface Judecata {
  readonly stare: 'bine' | 'atentie' | 'esec';
  readonly motiv: MotivJudecata;
  /** Orele de la ultimul succes, rotunjite la o zecimală; `null` fără succes. */
  readonly oreDeLaSucces: number | null;
}

const ORA = 3_600_000;

/** Pragul de vechime al ultimului succes: 1,1 × intervalul + 2 h (o zi lungă de vară, o întârziere a programatorului). */
export function limitaOre(d: DefinitieJob): number {
  // Rotunjită la o zecimală, ca orele cu care se compară (1,1 × 24 + 2 dă 28,400000000000002 în double).
  return Math.round((d.intervalOre * 1.1 + 2) * 10) / 10;
}

/**
 * Judecata unui marcaj (ADR 0041 §3), în ordinea din contract. `'nevalid'`: documentul există, dar un câmp de timp nu e un
 * moment (citit de `marcajDin`).
 */
export function judecaMarcaj(m: Marcaj | null | 'nevalid', d: DefinitieJob, acum: number): Judecata {
  if (m === 'nevalid') return { stare: 'esec', motiv: 'nevalid', oreDeLaSucces: null };
  if (m === null) return { stare: 'atentie', motiv: 'niciodata', oreDeLaSucces: null };
  const ore = m.ultimulSucces === null ? null : Math.round(((acum - m.ultimulSucces) / ORA) * 10) / 10;
  const neterminat = m.ultimaPornire !== null && (m.ultimulFinal === null || m.ultimulFinal < m.ultimaPornire);
  if (neterminat && m.ultimaPornire !== null) {
    if (acum - m.ultimaPornire > d.timeoutSecunde * 1000 + 60_000) return { stare: 'esec', motiv: 'fara-final', oreDeLaSucces: ore };
    return { stare: 'bine', motiv: 'ruleaza', oreDeLaSucces: ore };
  }
  if (m.esecuriLaRand >= 2) return { stare: 'esec', motiv: 'esecuri', oreDeLaSucces: ore };
  if (m.ultimulSucces === null || ore === null) return { stare: 'esec', motiv: 'fara-succes', oreDeLaSucces: null };
  if (ore > limitaOre(d)) return { stare: 'esec', motiv: 'vechi', oreDeLaSucces: ore };
  if (m.esecuriLaRand === 1) return { stare: 'atentie', motiv: 'un-esec', oreDeLaSucces: ore };
  return { stare: 'bine', motiv: 'bine', oreDeLaSucces: ore };
}

/**
 * Marcajul dintr-un document: timpii sunt momente (orice are `toMillis()`, ca `Timestamp`-ul Firestore) sau lipsesc.
 * Un câmp de timp de alt tip (un șir, un număr) face marcajul nevalid: „un tip în câmpul de timp” nu trece drept lipsă.
 */
export function marcajDin(d: Readonly<Record<string, unknown>>): Marcaj | 'nevalid' {
  const moment = (x: unknown): number | null | 'nevalid' => {
    if (x === undefined || x === null) return null;
    if (typeof x === 'object' && typeof (x as { toMillis?: unknown }).toMillis === 'function') {
      const ms = (x as { toMillis(): unknown }).toMillis();
      return typeof ms === 'number' && Number.isFinite(ms) ? ms : 'nevalid';
    }
    return 'nevalid';
  };
  const p = moment(d['ultimaPornire']);
  const f = moment(d['ultimulFinal']);
  const s = moment(d['ultimulSucces']);
  if (p === 'nevalid' || f === 'nevalid' || s === 'nevalid') return 'nevalid';
  const e = d['esecuriLaRand'];
  const esecuri = typeof e === 'number' && Number.isInteger(e) && e >= 0 ? e : e === undefined ? 0 : -1;
  if (esecuri < 0) return 'nevalid';
  return { ultimaPornire: p, ultimulFinal: f, ultimulSucces: s, esecuriLaRand: esecuri, ultimaEroare: typeof d['ultimaEroare'] === 'string' ? d['ultimaEroare'] : null };
}

/** Un cont de serviciu Google: `<nume>@<proiect>.iam.gserviceaccount.com`. */
const CONT_SERVICIU = /^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/;

/**
 * Contul de serviciu al joburilor de backup (ADR 0044; ADR 0041 §1 promitea unul dedicat, cu doar drepturile exportului):
 * `SA_BACKUP` din `functions/.env.<proiect>`, când există; altfel contul implicit al funcțiilor. Funcțiile îl iau ca parametru
 * (`defineString`, rezolvat la publicare); aici se judecă forma, iar testul o cere fiecărei linii `SA_BACKUP` din repo, ca
 * unul strâmb să pice în nivelul rapid, nu la publicare sau la 03:00.
 */
export function optiuniContBackup(sa: string | undefined): { readonly serviceAccount?: string } {
  if (sa === undefined || sa === '') return {};
  if (!CONT_SERVICIU.test(sa)) throw new Error(`SA_BACKUP nu e un cont de serviciu: ${JSON.stringify(sa)}`);
  return { serviceAccount: sa };
}
