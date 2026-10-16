import { createHash } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { cheieAmprenta, oraFerestrei, PLAFON_OAMENI, RETENTIE_ZILE, type Sursa } from '../../../shared/erori.ts';

/** Colecția jurnalului (ADR 0039 §2): un document pe grup, cu aparițiile în `aparitii`. */
export const COLECTIE = 'errorLogs';
/** Contoarele plafonului de rată, câte unul pe cheie și pe oră. */
export const COLECTIE_LIMITE = 'limiteErori';

/** O apariție, gata validată și tăiată. `context` doar la server. */
export interface Aparitie {
  readonly sursa: Sursa;
  readonly tip: string;
  readonly mesaj: string;
  readonly stiva: string;
  readonly build: string;
  readonly instanta: string;
  readonly adresa: string;
  readonly browser: string;
  readonly limba: string;
  readonly uid: string | null;
  readonly context?: string;
}

/** Un plafon de rată: cel mult `maxim` apariții pe oră pentru `cheie`. */
export interface Plafon {
  readonly cheie: string;
  readonly maxim: number;
}

export type RezultatScriere =
  | { readonly ok: true; readonly amprenta: string; readonly nou: boolean }
  | { readonly ok: false; readonly motiv: 'plafon' };

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** Id-ul grupului: primii 32 de caractere hex din SHA-256 peste cheia amprentei (ADR 0039 §3). */
export function amprenta(sursa: Sursa, tip: string, mesaj: string): string {
  return sha256(cheieAmprenta(sursa, tip, mesaj)).slice(0, 32);
}

/** Un hash scurt, pentru chei care n-au voie să păstreze valoarea în clar (IP-ul). */
export function hashScurt(text: string): string {
  return sha256(text).slice(0, 16);
}

const numar = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

/**
 * Scrie apariția într-o singură tranzacție: contoarele plafoanelor, grupul (creat, sau numărat și redeschis) și apariția.
 * Un plafon atins nu scrie nimic. Aruncă doar dacă Firestore aruncă; apelanții decid ce fac cu asta.
 */
export async function scrieEroare(db: Firestore, a: Aparitie, plafoane: readonly Plafon[], acum: Date): Promise<RezultatScriere> {
  const id = amprenta(a.sursa, a.tip, a.mesaj);
  const grup = db.collection(COLECTIE).doc(id);
  const ora = oraFerestrei(acum.getTime());
  const limite = plafoane.map((p) => ({ maxim: p.maxim, ref: db.collection(COLECTIE_LIMITE).doc(`${p.cheie}_${ora}`) }));
  const cand = Timestamp.fromDate(acum);
  const expiraLa = Timestamp.fromMillis(acum.getTime() + RETENTIE_ZILE * 86_400_000);
  const ultima = {
    cand, tip: a.tip, mesaj: a.mesaj, stiva: a.stiva, build: a.build, instanta: a.instanta, adresa: a.adresa,
    browser: a.browser, limba: a.limba, uid: a.uid, ...(a.context === undefined ? {} : { context: a.context }),
  };
  return db.runTransaction(async (tx): Promise<RezultatScriere> => {
    const [g, ...contoare] = await tx.getAll(grup, ...limite.map((l) => l.ref));
    if (!g) throw new Error('tranzacția n-a întors grupul');
    const curente = limite.map((_, i) => numar(contoare[i]?.get('numar')));
    if (limite.some((l, i) => (curente[i] ?? 0) >= l.maxim)) return { ok: false, motiv: 'plafon' };
    limite.forEach((l, i) => { tx.set(l.ref, { numar: (curente[i] ?? 0) + 1, ora, expiraLa }); });
    if (!g.exists) {
      tx.create(grup, {
        schema: 1, amprenta: id, sursa: a.sursa, tip: a.tip, mesaj: a.mesaj, numar: 1, primaData: cand, ultimaData: cand,
        rezolvat: false, oameni: a.uid ? [a.uid] : [], ultima, expiraLa,
      });
    } else {
      const vechi: unknown = g.get('oameni');
      const oameni = Array.isArray(vechi) ? vechi.filter((x): x is string => typeof x === 'string') : [];
      const noi = a.uid && !oameni.includes(a.uid) && oameni.length < PLAFON_OAMENI ? [...oameni, a.uid] : oameni;
      // Un grup rezolvat se redeschide singur la o apariție nouă (ADR 0039 §2).
      tx.update(grup, { numar: numar(g.get('numar')) + 1, ultimaData: cand, rezolvat: false, oameni: noi, ultima, expiraLa });
    }
    tx.create(grup.collection('aparitii').doc(), { ...ultima, expiraLa });
    return { ok: true, amprenta: id, nou: !g.exists };
  });
}
