import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { COLECTII_PERSONAL, normalizeazaEmail } from '../../../shared/personal.ts';
import {
  COLECTIE_LIMITE_SUGESTII, COLECTIE_POZE, COLECTIE_SUGESTII, curataText, curataTitlu, DESCRIERE_MAX, esteIdSugestie, esteStare,
  esteTip, esteVersiune, esteZona, ID_POZA, NOTA_MAX, POZA_MAX_BASE64, POZA_MAX_OCTETI, RE_BASE64, SUGESTII_PE_ZI, TITLU_MAX, tipPoza,
  ziUtc, type ContinutSugestie, type RaspunsSugestie, type TipPoza,
} from '../../../shared/sugestii.ts';
import { scrieAudit } from '../audit.ts';
import { logServerError } from '../erori/jurnal.ts';
import { drepturiIn } from '../personal/drepturi.ts';

/**
 * Sugestiile personalului (ADR 0107): cine are `sugestii.scrie` scrie o sugestie și și-o editează cât n-are decizie;
 * owner-ul decide pe fiecare, cu o notă. Drepturile se citesc în tranzacția fiecărei acțiuni (ADR 0049 §3), iar fiecare
 * schimbare are rândul ei de audit în aceeași tranzacție. Editarea și decizia numesc versiunea pe care a văzut-o omul: o
 * sugestie schimbată între timp nu primește o cerere făcută pe varianta veche.
 */

/** Ce citește serverul din tokenul omului (verificat de Firebase la intrarea în callable). */
export interface TokenSugestie {
  readonly email?: unknown;
}

const obiect = (x: unknown): Record<string, unknown> => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : {});
const argument = (motiv: string): HttpsError => new HttpsError('invalid-argument', motiv);
const numar = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

const SCHIMBATA = 'sugestia s-a schimbat de când ai deschis-o; reîncarcă lista';
const FARA_SCRIERE = 'rolul tău nu scrie sugestii';

function continutDin(d: Record<string, unknown>): ContinutSugestie {
  const titlu = curataTitlu(d['titlu']);
  const descriere = curataText(d['descriere'] ?? '', DESCRIERE_MAX);
  const tip = d['tip'];
  const zona = d['zona'] ?? null;
  if (titlu === null) throw argument(`titlul are 1–${TITLU_MAX} de caractere`);
  if (descriere === null) throw argument(`descrierea are cel mult ${DESCRIERE_MAX} de caractere, fără caractere de control`);
  if (!esteTip(tip)) throw argument('tipul: idee, problemă sau îmbunătățire');
  if (zona !== null && !esteZona(zona)) throw argument('zona aplicației');
  return { titlu, descriere, tip, zona };
}

/**
 * Poza planșei din cerere (ADR 0111), opțională: base64 strict, cel mult 400 kB, o imagine JPEG, PNG sau WebP după
 * semnătura ei. Lipsa ei (sau null) = fără poză.
 */
function pozaDin(p: unknown): { readonly octeti: Buffer; readonly tip: TipPoza } | null {
  if (p === undefined || p === null) return null;
  if (typeof p !== 'string' || p.length > POZA_MAX_BASE64 || !RE_BASE64.test(p)) throw argument('poza: base64, cel mult 400 kB');
  const octeti = Buffer.from(p, 'base64');
  if (octeti.length === 0 || octeti.length > POZA_MAX_OCTETI) throw argument('poza: cel mult 400 kB');
  const tip = tipPoza(octeti);
  if (tip === null) throw argument('poza: o imagine JPEG, PNG sau WebP');
  return { octeti, tip };
}

/** Id-ul și versiunea văzută, cerute de editare și de decizie. */
function tinta(d: Record<string, unknown>): { readonly id: string; readonly versiune: number } {
  const id = d['id'];
  const versiune = d['versiune'];
  if (!esteIdSugestie(id)) throw argument('id-ul sugestiei');
  if (!esteVersiune(versiune)) throw argument('versiunea văzută a sugestiei');
  return { id, versiune };
}

async function scrie(db: Firestore, uid: string, token: TokenSugestie | null, d: Record<string, unknown>, acum: Date): Promise<RaspunsSugestie> {
  const c = continutDin(d);
  const poza = pozaDin(d['poza']);
  return db.runTransaction(async (tx) => {
    const drepturi = await drepturiIn(tx, db, uid);
    if (!drepturi.permisiuni.has('sugestii.scrie')) throw new HttpsError('permission-denied', FARA_SCRIERE);
    const staff = await tx.get(db.collection(COLECTII_PERSONAL.staff).doc(uid));
    const limita = db.collection(COLECTIE_LIMITE_SUGESTII).doc(uid);
    const l = await tx.get(limita);
    const zi = ziUtc(acum);
    const azi = l.get('zi') === zi ? numar(l.get('numar')) : 0;
    if (azi >= SUGESTII_PE_ZI) throw new HttpsError('resource-exhausted', `cel mult ${SUGESTII_PE_ZI} de sugestii pe zi; mai scrie mâine`);
    const ref = db.collection(COLECTIE_SUGESTII).doc();
    const cand = Timestamp.fromDate(acum);
    // Adresa din personal (o arată lista celorlalți); primul owner, pus din consolă, poate n-o are: atunci cea din token.
    const dinStaff: unknown = staff.get('email');
    const autorEmail = typeof dinStaff === 'string' && dinStaff !== '' ? dinStaff : normalizeazaEmail(token?.email);
    // Poza stă în documentul ei (o listă de sugestii nu aduce octeții); sugestia ține doar tipul și mărimea.
    const meta = poza ? { tip: poza.tip, marime: poza.octeti.length } : null;
    tx.set(limita, { zi, numar: azi + 1 });
    tx.create(ref, {
      schema: 1, ...c, autor: uid, autorEmail, creataLa: cand, modificataLa: cand, stare: 'noua', nota: '', decisaDe: null,
      decisaLa: null, versiune: 1, poza: meta,
    });
    if (poza && meta) tx.create(ref.collection(COLECTIE_POZE).doc(ID_POZA), { schema: 1, ...meta, octeti: poza.octeti, creataLa: cand });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: drepturi.rol, actiune: 'sugestii.scrie', tinta: `${COLECTIE_SUGESTII}/${ref.id}`, inainte: null,
      dupa: meta ? { ...c, poza: meta } : { ...c },
    });
    return { ok: true, id: ref.id, schimbat: true, versiune: 1 };
  });
}

async function editeaza(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsSugestie> {
  const { id, versiune } = tinta(d);
  const c = continutDin(d);
  return db.runTransaction(async (tx) => {
    const drepturi = await drepturiIn(tx, db, uid);
    if (!drepturi.permisiuni.has('sugestii.scrie')) throw new HttpsError('permission-denied', FARA_SCRIERE);
    const ref = db.collection(COLECTIE_SUGESTII).doc(id);
    const s = await tx.get(ref);
    if (!s.exists) throw new HttpsError('not-found', 'sugestia nu există');
    if (s.get('autor') !== uid) throw new HttpsError('permission-denied', 'doar autorul își editează sugestia');
    if (s.get('stare') !== 'noua') throw new HttpsError('failed-precondition', 'sugestia are deja o decizie; nu se mai editează');
    if (s.get('versiune') !== versiune) throw new HttpsError('failed-precondition', SCHIMBATA);
    const inainte = { titlu: s.get('titlu') ?? null, descriere: s.get('descriere') ?? null, tip: s.get('tip') ?? null, zona: s.get('zona') ?? null };
    if (inainte.titlu === c.titlu && inainte.descriere === c.descriere && inainte.tip === c.tip && inainte.zona === c.zona) {
      return { ok: true, id, schimbat: false, versiune };
    }
    const cand = Timestamp.fromDate(acum);
    tx.update(ref, { ...c, modificataLa: cand, versiune: versiune + 1 });
    scrieAudit(tx, db, { cand, cine: uid, rol: drepturi.rol, actiune: 'sugestii.editeaza', tinta: `${COLECTIE_SUGESTII}/${id}`, inainte, dupa: { ...c } });
    return { ok: true, id, schimbat: true, versiune: versiune + 1 };
  });
}

async function decide(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsSugestie> {
  const { id, versiune } = tinta(d);
  const stare = d['stare'];
  const nota = curataText(d['nota'] ?? '', NOTA_MAX);
  if (!esteStare(stare)) throw argument('starea sugestiei');
  if (nota === null) throw argument(`nota are cel mult ${NOTA_MAX} de caractere, fără caractere de control`);
  return db.runTransaction(async (tx) => {
    if (!(await drepturiIn(tx, db, uid)).owner) throw new HttpsError('permission-denied', 'doar owner-ul decide pe sugestii');
    const ref = db.collection(COLECTIE_SUGESTII).doc(id);
    const s = await tx.get(ref);
    if (!s.exists) throw new HttpsError('not-found', 'sugestia nu există');
    if (s.get('versiune') !== versiune) throw new HttpsError('failed-precondition', SCHIMBATA);
    const inainte = { stare: s.get('stare') ?? null, nota: s.get('nota') ?? null };
    if (inainte.stare === stare && inainte.nota === nota) return { ok: true, id, schimbat: false, versiune };
    const cand = Timestamp.fromDate(acum);
    tx.update(ref, { stare, nota, decisaDe: uid, decisaLa: cand, versiune: versiune + 1 });
    scrieAudit(tx, db, { cand, cine: uid, rol: 'owner', actiune: 'sugestii.decide', tinta: `${COLECTIE_SUGESTII}/${id}`, inainte, dupa: { stare, nota } });
    return { ok: true, id, schimbat: true, versiune: versiune + 1 };
  });
}

/** Callable-ul `sugestii`: `{ actiune: 'scrie' | 'editeaza' | 'decide', … }`; refuzurile sunt `HttpsError`-uri cu motivul. */
export async function trateazaSugestia(
  db: Firestore, uid: string | null, token: TokenSugestie | null, data: unknown, acum: Date = new Date(),
): Promise<RaspunsSugestie> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const d = obiect(data);
  const actiune = d['actiune'];
  try {
    switch (actiune) {
      case 'scrie': return await scrie(db, uid, token, d, acum);
      case 'editeaza': return await editeaza(db, uid, d, acum);
      case 'decide': return await decide(db, uid, d, acum);
      default: throw argument('acțiunea');
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:sugestii', e, { uid, actiune: typeof actiune === 'string' ? actiune.slice(0, 40) : null }, db, acum);
    throw new HttpsError('internal', 'acțiunea n-a reușit; eroarea e în jurnal');
  }
}
