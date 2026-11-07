import { Timestamp, type DocumentReference, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { ZI_MS } from '../../../shared/conturi.ts';
import { CALE_SETARI, setariDin } from '../../../shared/conturiPlan.ts';
import { descrieAruncat } from '../../../shared/erori.ts';
import { COLECTIE_POZE, ID_POZA } from '../../../shared/poza.ts';
import { caleProiectTichet, COLECTIE_TICHETE, idDinCaleProiect, metaProiectDin, PREFIX_FISIERE_TICHETE } from '../../../shared/tichete.ts';
import { scrieAudit } from '../audit.ts';
import type { Fisiere } from '../fisiere.ts';

/**
 * Păstrarea tichetelor (ADR 0116 §16, felia 15.B↑b): jobul zilnic care șterge tichetele rezolvate de mai mult de
 * `zilePastrareTichete` (fila Setări, citită la fiecare rulare: o valoare schimbată din admin se aplică de a doua zi), cu poza
 * și proiectul lor. Nu TTL-ul: el nu șterge fișierele din Storage și nu urmează o valoare schimbată.
 *
 * - **Tichetele:** `rezolvatLa < azi − zile`, cele mai vechi întâi (un singur câmp, fără index compus), pe pagini cu cursor.
 *   Fiecare se judecă din nou în tranzacția care îl șterge (între interogare și ștergere se putea redeschide), cu poza lui și
 *   rândul de audit (`tichete.sterge`, fără conținut); fișierul proiectului se șterge după, din afara tranzacției.
 * - **Orfanii:** fișierele de sub `tichete/` al căror tichet nu mai există (o ștergere de fișier căzută aici, o raportare
 *   oprită între Storage și tranzacție), mai vechi de o oră (unul tânăr poate fi al unei raportări în lucru). Un nume
 *   necunoscut sau o dată lipsă nu se ating; se numără.
 * - **Plafoanele:** cel mult `plafon` tichete și `bugetMs` pe rulare; restul rămâne pentru ziua următoare (`neterminat`).
 * - **Eșecurile** pe element se numără, iar la final jobul aruncă: marcajul îl arată (galben la unul, roșu la două la rând).
 */

export const NUME_JOB_PASTRARE = 'pastrareTichete';

export interface OptiuniPastrare {
  /** Tichete pe pagină. */
  readonly pagina: number;
  /** Câte tichete judecă o rulare, cel mult. */
  readonly plafon: number;
  /** Nume de fișiere pe pagina unei listări (GCS dă cel mult 1000). */
  readonly paginaFisiere: number;
  /** Cât lucrează o rulare înainte să se oprească (sub timeout-ul jobului, 300 s). */
  readonly bugetMs: number;
  /** De la ce vârstă un fișier fără tichet e orfan. */
  readonly orfanDupaMs: number;
  /** Timpul real, pentru buget (o probă dă unul care sare). */
  readonly ceas: () => number;
}

export const OPTIUNI_PASTRARE: OptiuniPastrare = {
  pagina: 100, plafon: 500, paginaFisiere: 1000, bugetMs: 200_000, orfanDupaMs: 3_600_000, ceas: Date.now,
};

const ESECURI_IN_MESAJ = 3;

/**
 * Șterge un tichet rezolvat înainte de `limita`, cu poza lui, în tranzacție, cu rândul de audit. `sarit`: între timp s-a
 * redeschis, s-a rezolvat din nou mai târziu sau nu mai există.
 */
async function stergeTichetul(db: Firestore, ref: DocumentReference, limita: number, zile: number, cand: Timestamp): Promise<'sarit' | { readonly proiect: boolean }> {
  return db.runTransaction(async (tx) => {
    const t = await tx.get(ref);
    const rezolvatLa: unknown = t.get('rezolvatLa');
    if (!t.exists || t.get('stare') !== 'rezolvat' || !(rezolvatLa instanceof Timestamp) || rezolvatLa.toMillis() >= limita) return 'sarit';
    const proiect = metaProiectDin(t.get('proiect'));
    tx.delete(ref.collection(COLECTIE_POZE).doc(ID_POZA));
    tx.delete(ref);
    scrieAudit(tx, db, {
      cand, cine: `job:${NUME_JOB_PASTRARE}`, rol: null, actiune: 'tichete.sterge', tinta: `${COLECTIE_TICHETE}/${ref.id}`,
      inainte: { stare: 'rezolvat', rezolvatLa, zilePastrare: zile, poza: t.get('poza') != null, proiect: proiect ? { marime: proiect.marime } : null },
      dupa: null,
    });
    return { proiect: proiect !== null };
  });
}

export async function pastreazaTichetele(
  db: Firestore, fisiere: Fisiere, acum: Date, o: OptiuniPastrare = OPTIUNI_PASTRARE,
): Promise<Record<string, unknown>> {
  const start = o.ceas();
  const peste = (): boolean => o.ceas() - start > o.bugetMs;
  const s = await db.collection(CALE_SETARI.colectie).doc(CALE_SETARI.id).get();
  const zile = setariDin(s.exists ? s.data() : undefined).zilePastrareTichete;
  const limita = acum.getTime() - zile * ZI_MS;
  const cand = Timestamp.fromDate(acum);
  // Pe cale: o ștergere căzută la tichete și reușită apoi la orfani nu mai e un eșec (fișierul a plecat).
  const esecuri = new Map<string, string>();
  const n ={ judecate: 0, sterse: 0, sarite: 0, fisiereSterse: 0, scanate: 0, orfane: 0, necunoscute: 0 };
  let neterminat = false;

  // 1. Tichetele rezolvate înainte de limită.
  let dupa: QueryDocumentSnapshot | null = null;
  pagini: for (;;) {
    let q = db.collection(COLECTIE_TICHETE).where('rezolvatLa', '<', Timestamp.fromMillis(limita)).orderBy('rezolvatLa').limit(o.pagina);
    if (dupa) q = q.startAfter(dupa);
    const pag = await q.get();
    for (const doc of pag.docs) {
      if (n.judecate >= o.plafon || peste()) {
        neterminat = true;
        break pagini;
      }
      n.judecate++;
      const r = await stergeTichetul(db, doc.ref, limita, zile, cand);
      if (r === 'sarit') {
        n.sarite++;
        continue;
      }
      n.sterse++;
      if (!r.proiect) continue;
      const cale = caleProiectTichet(doc.id);
      try {
        await fisiere.sterge(cale);
        n.fisiereSterse++;
      } catch (e) {
        // Tichetul e șters; fișierul rămâne orfan și îl ia măturarea (azi, dacă reușește, sau mâine).
        esecuri.set(cale, descrieAruncat(e).mesaj);
      }
    }
    if (pag.docs.length < o.pagina) break;
    dupa = pag.docs[pag.docs.length - 1] ?? null;
  }

  // 2. Orfanii: fișierele de sub `tichete/` fără tichet.
  let token: string | null = null;
  do {
    if (peste()) {
      neterminat = true;
      break;
    }
    const p = await fisiere.pagina(PREFIX_FISIERE_TICHETE, o.paginaFisiere, token);
    n.scanate += p.fisiere.length;
    const cuId = p.fisiere.map((f) => ({ f, id: idDinCaleProiect(f.nume) }));
    const ids = [...new Set(cuId.flatMap((x) => (x.id === null ? [] : [x.id])))];
    const exista = new Set<string>();
    for (let i = 0; i < ids.length; i += 100) {
      const refs = ids.slice(i, i + 100).map((id) => db.collection(COLECTIE_TICHETE).doc(id));
      for (const d of await db.getAll(...refs)) if (d.exists) exista.add(d.id);
    }
    for (const { f, id } of cuId) {
      if (id === null || !Number.isFinite(f.creatLa)) {
        n.necunoscute++;
        continue;
      }
      if (exista.has(id) || acum.getTime() - f.creatLa < o.orfanDupaMs) continue;
      try {
        await fisiere.sterge(f.nume);
        n.orfane++;
        esecuri.delete(f.nume);
      } catch (e) {
        esecuri.set(f.nume, descrieAruncat(e).mesaj);
      }
    }
    token = p.urmatoarea;
  } while (token !== null);

  const detaliu = { zile, limita: Timestamp.fromMillis(limita), ...n, neterminat };
  if (esecuri.size > 0) {
    const primele = [...esecuri].slice(0, ESECURI_IN_MESAJ).map(([cale, m]) => `${cale}: ${m}`).join('; ');
    throw new Error(`fișiere neșterse: ${esecuri.size} (${primele}${esecuri.size > ESECURI_IN_MESAJ ? '; …' : ''}); ${JSON.stringify({ ...n, neterminat })}`);
  }
  return detaliu;
}
