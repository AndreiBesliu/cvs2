import type { Firestore } from 'firebase-admin/firestore';
import { ipApelant, PLAFON_RATA, valideazaRaport } from '../../../shared/erori.ts';
import { instantaDinProiect } from '../instanta.ts';
import { hashScurt, scrieEroare } from './scrie.ts';

/** Răspunsul lui `logClientError` (ADR 0039 §5). Funcția nu aruncă spre client. */
export type RaspunsClient = { readonly ok: true } | { readonly ok: false; readonly motiv: 'nevalid' | 'plafon' | 'scriere' };

export interface CerereClient {
  readonly uid: string | null;
  readonly xff: string | undefined;
  readonly ip: string | undefined;
}

/**
 * Raportul unui client: validat, numărat pe IP (hash, nu în clar) și pe tot proiectul, apoi scris. Instanța o pune
 * serverul, din proiect.
 */
export async function trateazaRaportClient(db: Firestore, data: unknown, cerere: CerereClient, acum: Date = new Date()): Promise<RaspunsClient> {
  const v = valideazaRaport(data);
  if (!v.ok) return { ok: false, motiv: 'nevalid' };
  try {
    const r = await scrieEroare(db, { sursa: 'client', ...v.raport, instanta: instantaDinProiect(), uid: cerere.uid }, [
      { cheie: `ip_${hashScurt(ipApelant(cerere.xff, cerere.ip))}`, maxim: PLAFON_RATA.peIp },
      { cheie: 'client', maxim: PLAFON_RATA.globalClient },
    ], acum);
    return r.ok ? { ok: true } : { ok: false, motiv: 'plafon' };
  } catch (e) {
    console.error('logClientError: scrierea a eșuat', e);
    return { ok: false, motiv: 'scriere' };
  }
}
