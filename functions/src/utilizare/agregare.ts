import { Timestamp, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { CALE_SETARI_UTILIZARE, COLECTIE_UTILIZARE, setariUtilizareDin } from '../../../shared/utilizare.ts';
import {
  adaugaZile, COLECTIE_UTILIZARE_ZI, inceputulZilei, SumatorZi, ZILE_RECALCULATE, ziuaLocala, type LotZi,
} from '../../../shared/utilizareZi.ts';

/**
 * Jobul de noapte al utilizării aplicației (ADR 0262 §5, felia A.9a): adună loturile fiecăreia dintre ultimele
 * `ZILE_RECALCULATE` zile (după ora primirii, în fusul României) în `utilizareZi/{zi}`, scris din nou întreg (o rulare repetată
 * dă aceleași sume, iar o noapte căzută se acoperă la următoarea). Sumele se șterg singure după `zileSume` din setări (TTL),
 * citite la fiecare rulare. Loturile se citesc pe pagini, fără să stea toate în memorie. Fără conturi în sume.
 */

export const NUME_JOB_AGREGARE = 'agregaUtilizarea';
/** Câte loturi pe pagină. */
export const PAGINA_LOTURI = 500;

const ZI_MS = 86_400_000;

/** Lotul scris de callable, citit pentru sume; un lot fără forma lui (altă schemă) se sare, numărat. */
function lotZi(d: QueryDocumentSnapshot): LotZi | null {
  const x = d.data();
  const { uid, sesiune, personal, evenimente, aruncate } = x;
  if (typeof uid !== 'string' || typeof sesiune !== 'string' || typeof personal !== 'boolean' || !Array.isArray(evenimente)) return null;
  return { uid, sesiune, personal, evenimente, aruncate: typeof aruncate === 'number' && Number.isSafeInteger(aruncate) && aruncate >= 0 ? aruncate : 0 };
}

/** Sumele unei zile: loturile primite în ea, pe pagini, apoi documentul zilei, cu ștergerea lui singură. */
export async function agregaZiua(db: Firestore, zi: string, zileSume: number, acum: Date): Promise<{ readonly loturi: number; readonly sarite: number }> {
  const de = Timestamp.fromMillis(inceputulZilei(zi));
  const pana = Timestamp.fromMillis(inceputulZilei(adaugaZile(zi, 1)));
  const s = new SumatorZi(zi);
  let loturi = 0;
  let sarite = 0;
  let dupa: QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = db.collection(COLECTIE_UTILIZARE).where('primit', '>=', de).where('primit', '<', pana).orderBy('primit').limit(PAGINA_LOTURI);
    if (dupa) q = q.startAfter(dupa);
    const pagina = await q.get();
    for (const d of pagina.docs) {
      const l = lotZi(d);
      if (l) {
        s.adauga(l);
        loturi++;
      } else sarite++;
    }
    if (pagina.size < PAGINA_LOTURI) break;
    dupa = pagina.docs[pagina.docs.length - 1] ?? null;
  }
  await db.collection(COLECTIE_UTILIZARE_ZI).doc(zi).set({
    ...s.rezultat(), loturi, sarite, calculatLa: Timestamp.fromDate(acum), expiraLa: Timestamp.fromMillis(pana.toMillis() + zileSume * ZI_MS),
  });
  return { loturi, sarite };
}

/** Jobul: zilele de dinaintea celei de azi (în fusul României), cu păstrarea sumelor din setările de acum. */
export async function agregaUtilizarea(db: Firestore, acum: Date): Promise<Readonly<Record<string, unknown>>> {
  const s = await db.collection(CALE_SETARI_UTILIZARE.colectie).doc(CALE_SETARI_UTILIZARE.id).get();
  const { zileSume } = setariUtilizareDin(s.exists ? s.data() : undefined).setari;
  const azi = ziuaLocala(acum.getTime());
  const zile: Record<string, { readonly loturi: number; readonly sarite: number }> = {};
  for (let k = ZILE_RECALCULATE; k >= 1; k--) {
    const zi = adaugaZile(azi, -k);
    zile[zi] = await agregaZiua(db, zi, zileSume, acum);
  }
  return { zile, zileSume };
}
