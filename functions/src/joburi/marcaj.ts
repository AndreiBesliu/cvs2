import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { descrieAruncat, PLAFON_MESAJ, taie } from '../../../shared/erori.ts';
import { COLECTIE_MARCAJE } from '../../../shared/joburi.ts';
import { logServerError } from '../erori/jurnal.ts';

/**
 * Marcajul de rulare (ADR 0041 §2) în jurul unui job: pornirea înainte de lucru, apoi reușita (cu `detaliu`) sau eșecul
 * (contorul la rând, eroarea, rândul din `errorLogs`). Nu aruncă: un job programat care aruncă doar se reîncearcă sau
 * tace în Cloud Logging; aici eșecul e în marcaj și în fila Erori. Un job oprit la timeout nu ajunge la final: pornirea
 * fără final se vede din marcaj.
 */
export async function cuMarcaj(
  db: Firestore, nume: string, lucru: () => Promise<Readonly<Record<string, unknown>>>, ceas: () => Date = () => new Date(),
): Promise<boolean> {
  const ref = db.collection(COLECTIE_MARCAJE).doc(nume);
  try {
    await ref.set({ schema: 1, job: nume, ultimaPornire: Timestamp.fromDate(ceas()) }, { merge: true });
  } catch (e) {
    // Fără marcajul de pornire nu se lucrează: un job fără urmă e exact ce marcajul trebuie să împiedice.
    await logServerError(`job:${nume}`, e, { uid: null, etapa: 'marcajul de pornire' }, db, ceas());
    return false;
  }
  try {
    const detaliu = await lucru();
    const t = Timestamp.fromDate(ceas());
    await ref.update({ ultimulFinal: t, ultimulSucces: t, esecuriLaRand: 0, ultimaEroare: null, detaliu });
    return true;
  } catch (e) {
    const t = Timestamp.fromDate(ceas());
    try {
      await ref.update({ ultimulFinal: t, esecuriLaRand: FieldValue.increment(1), ultimaEroare: taie(descrieAruncat(e).mesaj, PLAFON_MESAJ) });
    } catch (e2) {
      console.error(`marcajul jobului ${nume} nu s-a putut scrie după eșec`, e2);
    }
    await logServerError(`job:${nume}`, e, { uid: null }, db, ceas());
    return false;
  }
}
