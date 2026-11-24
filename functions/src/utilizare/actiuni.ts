import { randomBytes } from 'node:crypto';
import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { COLECTIE_CONTURI } from '../../../shared/conturiPlan.ts';
import { oraFerestrei } from '../../../shared/erori.ts';
import { COLECTII_PERSONAL } from '../../../shared/personal.ts';
import { esteVersiuneVazuta } from '../../../shared/raspunsuriRapide.ts';
import {
  aceleasiSetariUtilizare, CALE_SETARI_UTILIZARE, COLECTIE_DISOCIERI, COLECTIE_LIMITE_UTILIZARE, COLECTIE_UTILIZARE, contextDin, esteSesiune, evenimentDin, expiraUtilizareLa, idLot,
  lotDin, LOTURI_PE_ORA, MARGINI_UTILIZARE, PAGINA_CRONOLOGIE, setariPublice, setariUtilizareCerute, setariUtilizareDin, type Eveniment,
  type LotCronologie, type RaspunsCronologie, type RaspunsDisociere, type RaspunsLot, type RaspunsSetariUtilizare,
} from '../../../shared/utilizare.ts';
import { scrieAudit } from '../audit.ts';
import { logServerError } from '../erori/jurnal.ts';
import { instantaDinProiect } from '../instanta.ts';
import { drepturiIn } from '../personal/drepturi.ts';

/**
 * Utilizarea aplicației (ADR 0262, felia A.8a). Lotul îl trimite editorul oricui are contul deschis (`conturi/{uid}`) sau e în
 * personal; serverul îl reface după lista albă (`lotDin`), îl scrie o singură dată (o reîncercare cade pe același document),
 * cel mult `LOTURI_PE_ORA` pe cont și pe oră, cu ștergerea singură după zilele din setări. Colectarea oprită din Setări nu
 * scrie nimic, nici un lot gol (editorul întreabă așa setările, cât colectarea e oprită). Răspunsul spune editorului setările care-i schimbă purtarea. Lotul nu e o acțiune a personalului: fără audit.
 *
 * Setările (§8): doar owner-ul, întregi și în margini, pe versiunea văzută, cu auditul în tranzacție.
 */

const obiect = (x: unknown): Record<string, unknown> => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : {});
const argument = (motiv: string): HttpsError => new HttpsError('invalid-argument', motiv);
const numar = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const ORA_MS = 3_600_000;

/** Planul ținut în contul clientului (un text scurt), sau null: personalul fără cont, un plan stricat. */
function planDin(cont: DocumentSnapshot): string | null {
  const p: unknown = cont.exists ? cont.get('plan') : null;
  return typeof p === 'string' && p !== '' && p.length <= 40 ? p : null;
}

async function lot(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsLot> {
  const primit = lotDin(d['lot']);
  if (!primit) throw argument('lotul: sesiunea, numărul, ceasul sesiunii, contextul și cel mult 200 de evenimente');
  const { lot: l, aruncate } = primit;
  const ora = oraFerestrei(acum.getTime());
  const refSetari = db.collection(CALE_SETARI_UTILIZARE.colectie).doc(CALE_SETARI_UTILIZARE.id);
  const refCont = db.collection(COLECTIE_CONTURI).doc(uid);
  const refStaff = db.collection(COLECTII_PERSONAL.staff).doc(uid);
  const refLimita = db.collection(COLECTIE_LIMITE_UTILIZARE).doc(`${uid}_${ora}`);
  const refLot = db.collection(COLECTIE_UTILIZARE).doc(idLot(l.sesiune, l.nr));
  const refDisociat = db.collection(COLECTIE_DISOCIERI).doc(uid);
  return db.runTransaction(async (tx): Promise<RaspunsLot> => {
    const [s, cont, staff, limita, existent, disociat] = await tx.getAll(refSetari, refCont, refStaff, refLimita, refLot, refDisociat);
    if (!s || !cont || !staff || !limita || !existent || !disociat) throw new Error('getAll a întors mai puține documente decât a cerut');
    if (!cont.exists && !staff.exists) throw new HttpsError('permission-denied', 'utilizarea vine doar cu contul deschis');
    const setari = setariUtilizareDin(s.exists ? s.data() : undefined).setari;
    const raspuns = { ok: true as const, setari: setariPublice(setari) };
    // Un lot gol e doar întrebarea editorului după setări (cât colectarea e oprită); unul cu evenimente aruncate se scrie.
    if (!setari.colectare || existent.exists || (l.evenimente.length === 0 && aruncate === 0)) return { ...raspuns, scris: false };
    const pana = numar(limita.get('numar'));
    if (pana >= LOTURI_PE_ORA) throw new HttpsError('resource-exhausted', `cel mult ${LOTURI_PE_ORA} loturi pe oră`);
    // Contorul orei se șterge singur a doua zi (TTL, ca al jurnalului de erori).
    tx.set(refLimita, { numar: pana + 1, ora, expiraLa: Timestamp.fromMillis((ora + 1) * ORA_MS + 86_400_000) });
    // Un cont despărțit (A.11e): lotul se scrie sub pseudonimul lui, nu sub cont.
    const pseudonim: unknown = disociat.exists ? disociat.get('pseudonim') : null;
    tx.create(refLot, {
      schema: 1, uid: typeof pseudonim === 'string' && pseudonim !== '' ? pseudonim : uid, sesiune: l.sesiune, nr: l.nr, instanta: instantaDinProiect(), plan: planDin(cont), personal: staff.exists,
      primit: Timestamp.fromDate(acum), inceput: Timestamp.fromMillis(acum.getTime() - l.acum), context: l.context,
      evenimente: l.evenimente, aruncate, expiraLa: Timestamp.fromMillis(expiraUtilizareLa(acum.getTime(), setari.zileEvenimente)),
    });
    return { ...raspuns, scris: true };
  });
}

const MARGINI_TEXT = Object.entries(MARGINI_UTILIZARE).map(([k, [min, max]]) => `${k} ${min}–${max}`).join(', ');

async function setari(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsSetariUtilizare> {
  const cerute = setariUtilizareCerute(d['setari']);
  if (!cerute) throw argument(`setările: colectare și clicuri (da / nu), ${MARGINI_TEXT}, numere întregi, nimic în plus`);
  const vazuta = d['versiune'];
  if (!esteVersiuneVazuta(vazuta)) throw argument('versiunea văzută a setărilor');
  return db.runTransaction(async (tx) => {
    if (!(await drepturiIn(tx, db, uid)).owner) throw new HttpsError('permission-denied', 'doar owner-ul schimbă setările utilizării');
    const ref = db.collection(CALE_SETARI_UTILIZARE.colectie).doc(CALE_SETARI_UTILIZARE.id);
    const s = await tx.get(ref);
    const acolo = setariUtilizareDin(s.exists ? s.data() : undefined);
    if (acolo.versiune !== vazuta) throw new HttpsError('failed-precondition', 'setările s-au schimbat de când le-ai deschis; reîncarcă fila');
    // Fără document, în vigoare sunt implicitele: aceleași valori nu scriu nimic.
    if (aceleasiSetariUtilizare(acolo.setari, cerute)) return { ok: true, schimbat: false, versiune: acolo.versiune };
    const cand = Timestamp.fromDate(acum);
    tx.set(ref, { schema: 1, ...cerute, versiune: acolo.versiune + 1, modificatLa: cand, modificatDe: uid });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: 'owner', actiune: 'setari.utilizare', tinta: `${CALE_SETARI_UTILIZARE.colectie}/${CALE_SETARI_UTILIZARE.id}`,
      inainte: s.exists ? acolo.setari : null, dupa: cerute,
    });
    return { ok: true, schimbat: true, versiune: acolo.versiune + 1 };
  });
}

/** Forma unui uid de Firebase Auth (cel mult 128 de caractere, fără separatori de cale). */
const RE_UID = /^[A-Za-z0-9_-]{1,128}$/;
const clipa = (x: unknown): number => (x instanceof Timestamp ? x.toMillis() : 0);

/** Un lot citit, pentru cronologie: evenimentele trec încă o dată prin lista albă de azi (o schemă veche le sare). */
function lotCronologieDin(id: string, d: Record<string, unknown>): LotCronologie | null {
  const sesiune = d['sesiune'];
  const nr = d['nr'];
  if (typeof sesiune !== 'string' || typeof nr !== 'number') return null;
  const ev = Array.isArray(d['evenimente']) ? d['evenimente'] : [];
  const evenimente = ev.map((e) => evenimentDin(e, Number.MAX_SAFE_INTEGER)).filter((e): e is Eveniment => e !== null);
  return {
    id, sesiune, nr, primit: clipa(d['primit']), inceput: clipa(d['inceput']), context: contextDin(d['context']), evenimente,
    aruncate: numar(d['aruncate']) + (ev.length - evenimente.length),
  };
}

/**
 * Cronologia unui om (ADR 0262 §6, felia A.11c): loturile contului, cele mai noi întâi, câte o pagină; doar cu „Utilizare:
 * sesiuni” (date despre o persoană). Fiecare citire intră în audit, cu cine a citit și câte loturi.
 */
async function cronologie(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsCronologie> {
  const tinta = d['uid'];
  if (typeof tinta !== 'string' || !RE_UID.test(tinta)) throw argument('contul');
  const pana = d['pana'];
  if (pana !== undefined && (typeof pana !== 'number' || !Number.isSafeInteger(pana) || pana <= 0)) throw argument('clipa paginii');
  const sesiune = d['sesiune'];
  if (sesiune !== undefined && !esteSesiune(sesiune)) throw argument('sesiunea');
  return db.runTransaction(async (tx): Promise<RaspunsCronologie> => {
    const drepturi = await drepturiIn(tx, db, uid);
    if (!drepturi.permisiuni.has('utilizare.sesiuni')) throw new HttpsError('permission-denied', 'cronologia cere „Utilizare: sesiuni”');
    let q = db.collection(COLECTIE_UTILIZARE).where('uid', '==', tinta);
    if (sesiune !== undefined) q = q.where('sesiune', '==', sesiune);
    if (pana !== undefined) q = q.where('primit', '<', Timestamp.fromMillis(pana));
    const s = await tx.get(q.orderBy('primit', 'desc').limit(PAGINA_CRONOLOGIE + 1));
    const loturi = s.docs.slice(0, PAGINA_CRONOLOGIE).map((x) => lotCronologieDin(x.id, x.data())).filter((l): l is LotCronologie => l !== null);
    scrieAudit(tx, db, {
      cand: Timestamp.fromDate(acum), cine: uid, rol: drepturi.rol, actiune: 'utilizare.cronologie', tinta: `${COLECTIE_UTILIZARE}/${tinta}`,
      inainte: null, dupa: { loturi: loturi.length, ...(pana === undefined ? {} : { pana }), ...(sesiune === undefined ? {} : { sesiune }) },
    });
    return { ok: true, loturi, maiVechi: s.size > PAGINA_CRONOLOGIE };
  });
}

/** Câte loturi primesc pseudonimul într-o scriere. */
const PAGINA_DISOCIERE = 400;

/**
 * Disocierea unui cont (ADR 0262 §3, felia A.11e), la cererea omului (printr-un tichet), de cine administrează conturile:
 * un pseudonim aleator, ținut doar pe server (`utilizareDisociate/{uid}`), pentru loturile de până acum (rescrise, pe
 * pagini) și pentru cele care vin (`lot` îl pune). Contul primește doar data; auditul, doar că s-a făcut. A doua oară nu
 * schimbă nimic. Nu se poate desface din aplicație.
 */
async function disociaza(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsDisociere> {
  const tinta = d['uid'];
  if (typeof tinta !== 'string' || !RE_UID.test(tinta)) throw argument('contul');
  const refCont = db.collection(COLECTIE_CONTURI).doc(tinta);
  const refDisociat = db.collection(COLECTIE_DISOCIERI).doc(tinta);
  const pseudonim = await db.runTransaction(async (tx): Promise<string | null> => {
    const drepturi = await drepturiIn(tx, db, uid);
    if (!drepturi.permisiuni.has('conturi.administreaza')) throw new HttpsError('permission-denied', 'disocierea cere „Conturi: administrează”');
    const [cont, disociat] = await tx.getAll(refCont, refDisociat);
    if (!cont || !disociat) throw new Error('getAll a întors mai puține documente decât a cerut');
    if (!cont.exists) throw new HttpsError('not-found', 'contul nu există');
    if (disociat.exists) return null;
    const p = `p${randomBytes(16).toString('hex')}`;
    const cand = Timestamp.fromDate(acum);
    tx.create(refDisociat, { schema: 1, pseudonim: p, la: cand });
    tx.update(refCont, { disociatLa: cand });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: drepturi.rol, actiune: 'utilizare.disociaza', tinta: `${COLECTIE_CONTURI}/${tinta}`, inainte: null, dupa: { disociat: true },
    });
    return p;
  });
  if (pseudonim === null) return { ok: true, schimbat: false, loturi: 0 };
  // Loturile de până acum (și cele scrise cât rula disocierea, înaintea marcajului), până nu mai rămâne niciunul.
  let loturi = 0;
  for (;;) {
    const s = await db.collection(COLECTIE_UTILIZARE).where('uid', '==', tinta).limit(PAGINA_DISOCIERE).get();
    if (s.empty) break;
    const b = db.batch();
    for (const x of s.docs) b.update(x.ref, { uid: pseudonim });
    await b.commit();
    loturi += s.size;
  }
  return { ok: true, schimbat: true, loturi };
}

/** Callable-ul `utilizare`: `{ actiune: 'lot' | 'setari' | 'cronologie' | 'disociaza', … }`; refuzurile sunt `HttpsError`-uri cu motivul. */
export async function trateazaUtilizarea(
  db: Firestore, uid: string | null, data: unknown, acum: Date = new Date(),
): Promise<RaspunsLot | RaspunsSetariUtilizare | RaspunsCronologie | RaspunsDisociere> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const d = obiect(data);
  const actiune = d['actiune'];
  try {
    switch (actiune) {
      case 'lot': return await lot(db, uid, d, acum);
      case 'setari': return await setari(db, uid, d, acum);
      case 'cronologie': return await cronologie(db, uid, d, acum);
      case 'disociaza': return await disociaza(db, uid, d, acum);
      default: throw argument('acțiunea');
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:utilizare', e, { uid, actiune: typeof actiune === 'string' ? actiune.slice(0, 40) : null }, db, acum);
    throw new HttpsError('internal', 'acțiunea n-a reușit; eroarea e în jurnal');
  }
}
