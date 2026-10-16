import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { descrieAruncat, PLAFON_CONTEXT, PLAFON_MESAJ, PLAFON_RATA, PLAFON_SCURT, PLAFON_STIVA, taie } from '../../../shared/erori.ts';
import { instantaDinProiect } from '../instanta.ts';
import { scrieEroare } from './scrie.ts';

/**
 * Contextul unei erori de server. `uid` e obligatoriu (poate fi `null`, cu motivul în restul contextului): în ediția
 * întâi, apelurile din `catch` îl uitau, iar panoul arăta „0 oameni” (ADR 0039 §4).
 */
export interface ContextServer {
  readonly uid: string | null;
  readonly [cheie: string]: unknown;
}

/**
 * Scrie o eroare de server în `errorLogs`. **Nu aruncă niciodată**: întoarce `true` dacă s-a scris, `false` dacă nu (plafon
 * atins, Firestore indisponibil, context care nu se poate scrie); motivul ajunge în Cloud Logging.
 */
export async function logServerError(
  sursa: string, eroare: unknown, context: ContextServer, db?: Firestore, acum: Date = new Date(),
): Promise<boolean> {
  try {
    const { mesaj, stiva } = descrieAruncat(eroare);
    const { uid, ...rest } = context;
    let ctx: string;
    try {
      ctx = JSON.stringify(rest) ?? '';
    } catch {
      ctx = '(contextul nu se poate scrie ca JSON)';
    }
    const r = await scrieEroare(db ?? getFirestore(), {
      sursa: 'server', tip: taie(sursa, PLAFON_SCURT), mesaj: taie(mesaj, PLAFON_MESAJ), stiva: taie(stiva, PLAFON_STIVA),
      build: taie(process.env['K_REVISION'] ?? '', PLAFON_SCURT), instanta: instantaDinProiect(), adresa: '', browser: '',
      limba: '', uid: typeof uid === 'string' ? uid : null, context: taie(ctx, PLAFON_CONTEXT),
    }, [{ cheie: 'server', maxim: PLAFON_RATA.globalServer }], acum);
    if (!r.ok) console.error(`logServerError: plafonul de rată atins, eroarea din ${sursa} nu s-a scris`, mesaj);
    return r.ok;
  } catch (e) {
    console.error(`logServerError: scrierea a eșuat pentru ${sursa}`, e, eroare);
    return false;
  }
}
