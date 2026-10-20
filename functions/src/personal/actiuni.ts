import { createHash } from 'node:crypto';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  COLECTII_PERSONAL, curataNumeRol, curataPermisiuni, esteIdRol, esteRolValid, normalizeazaEmail, OWNER, ZILE_INVITATIE,
  type RaspunsInvitatie, type RaspunsPersonal,
} from '../../../shared/personal.ts';
import { scrieAudit } from '../audit.ts';
import { logServerError } from '../erori/jurnal.ts';
import { drepturiIn } from './drepturi.ts';

/**
 * Administrarea personalului (ADR 0049): rolurile custom, invitațiile pe e-mail, conturile create de owner, schimbarea
 * rolului și scoaterea din personal. Doar owner-ul, citit în tranzacția fiecărei acțiuni; fiecare schimbare are rândul
 * ei de audit în aceeași tranzacție. Personalul nu rămâne niciodată fără owner.
 */

/** Ce folosește serverul din Firebase Auth (Admin SDK), ca testele să poată numi exact ce se cere. */
export interface AuthPersonal {
  getUserByEmail(email: string): Promise<{ readonly uid: string }>;
  createUser(p: { email: string; emailVerified: boolean }): Promise<{ readonly uid: string }>;
  deleteUser(uid: string): Promise<void>;
  generatePasswordResetLink(email: string): Promise<string>;
}

/** Id-ul invitației unui e-mail: o singură invitație pe adresă, fără adresa în cale. */
export const idInvitatie = (email: string): string => createHash('sha256').update(email).digest('hex');

const RE_ID_INVITATIE = /^[0-9a-f]{64}$/;
/** Un uid de Firebase Auth: fără `/`, cel mult 128 de caractere. */
const RE_UID = /^[A-Za-z0-9_-]{1,128}$/;
const ZI_MS = 86_400_000;

const obiect = (x: unknown): Record<string, unknown> => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : {});
const argument = (motiv: string): HttpsError => new HttpsError('invalid-argument', motiv);

function codAuth(e: unknown): string {
  const c = (e as { code?: unknown } | null)?.code;
  return typeof c === 'string' ? c : '';
}

const colectie = (db: Firestore, c: keyof typeof COLECTII_PERSONAL) => db.collection(COLECTII_PERSONAL[c]);

async function cereOwner(tx: Transaction, db: Firestore, uid: string): Promise<void> {
  if (!(await drepturiIn(tx, db, uid)).owner) throw new HttpsError('permission-denied', 'doar owner-ul administrează personalul');
}

/** Rolul cerut există: `owner` sau un rol custom din `roluri`. */
async function cereRol(tx: Transaction, db: Firestore, rol: string): Promise<void> {
  if (rol === OWNER) return;
  if (!(await tx.get(colectie(db, 'roluri').doc(rol))).exists) throw new HttpsError('failed-precondition', 'rolul nu există');
}

async function owneri(tx: Transaction, db: Firestore): Promise<number> {
  return (await tx.get(colectie(db, 'staff').where('rol', '==', OWNER))).size;
}

const egale = (a: unknown, b: readonly string[]): boolean => Array.isArray(a) && a.length === b.length && a.every((x, k) => x === b[k]);

/* ── Rolurile ──────────────────────────────────────────────────────────────────────────────────────────────────── */

async function salveazaRol(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPersonal> {
  const nume = curataNumeRol(d['nume']);
  const permisiuni = curataPermisiuni(d['permisiuni']);
  const id = d['id'] ?? null;
  if (nume === null) throw argument('numele rolului are 1–40 de caractere');
  if (permisiuni === null) throw argument('permisiunile sunt din catalog');
  if (id !== null && !esteIdRol(id)) throw argument('id-ul rolului');
  return db.runTransaction(async (tx) => {
    await cereOwner(tx, db, uid);
    const toate = await tx.get(colectie(db, 'roluri'));
    const vechi = id === null ? undefined : toate.docs.find((x) => x.id === id);
    if (id !== null && !vechi) throw new HttpsError('not-found', 'rolul nu există');
    const cheie = nume.toLocaleLowerCase('ro');
    if (toate.docs.some((x) => x.id !== id && String(x.get('nume') ?? '').toLocaleLowerCase('ro') === cheie)) {
      throw new HttpsError('already-exists', 'există deja un rol cu numele ăsta');
    }
    const ref = id === null ? colectie(db, 'roluri').doc() : colectie(db, 'roluri').doc(id);
    const inainte = vechi ? { nume: vechi.get('nume') ?? null, permisiuni: vechi.get('permisiuni') ?? null } : null;
    if (inainte && inainte.nume === nume && egale(inainte.permisiuni, permisiuni)) return { ok: true, id: ref.id, schimbat: false };
    const cand = Timestamp.fromDate(acum);
    tx.set(ref, { nume, permisiuni, modificatLa: cand, modificatDe: uid, ...(vechi ? {} : { creatLa: cand, creatDe: uid }) }, { merge: true });
    scrieAudit(tx, db, { cand, cine: uid, rol: OWNER, actiune: 'personal.salveaza-rol', tinta: `roluri/${ref.id}`, inainte, dupa: { nume, permisiuni } });
    return { ok: true, id: ref.id, schimbat: true };
  });
}

async function stergeRol(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPersonal> {
  const id = d['id'];
  if (!esteIdRol(id)) throw argument('id-ul rolului');
  return db.runTransaction(async (tx) => {
    await cereOwner(tx, db, uid);
    const ref = colectie(db, 'roluri').doc(id);
    const r = await tx.get(ref);
    if (!r.exists) throw new HttpsError('not-found', 'rolul nu există');
    const folosit = await tx.get(colectie(db, 'staff').where('rol', '==', id).limit(1));
    const invitat = await tx.get(colectie(db, 'invitatii').where('rol', '==', id).limit(1));
    if (!folosit.empty || !invitat.empty) throw new HttpsError('failed-precondition', 'rolul e folosit de cineva din personal sau de o invitație');
    tx.delete(ref);
    scrieAudit(tx, db, {
      cand: Timestamp.fromDate(acum), cine: uid, rol: OWNER, actiune: 'personal.sterge-rol', tinta: `roluri/${id}`,
      inainte: { nume: r.get('nume') ?? null, permisiuni: r.get('permisiuni') ?? null }, dupa: null,
    });
    return { ok: true, schimbat: true };
  });
}

/* ── Invitațiile ───────────────────────────────────────────────────────────────────────────────────────────────── */

async function invita(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPersonal> {
  const email = normalizeazaEmail(d['email']);
  const rol = d['rol'];
  if (email === null) throw argument('adresa de e-mail');
  if (!esteRolValid(rol)) throw argument('rolul');
  return db.runTransaction(async (tx) => {
    await cereOwner(tx, db, uid);
    await cereRol(tx, db, rol);
    if (!(await tx.get(colectie(db, 'staff').where('email', '==', email).limit(1))).empty) {
      throw new HttpsError('already-exists', 'adresa e deja în personal');
    }
    const ref = colectie(db, 'invitatii').doc(idInvitatie(email));
    const vechi = await tx.get(ref);
    const cand = Timestamp.fromDate(acum);
    const expiraLa = Timestamp.fromMillis(acum.getTime() + ZILE_INVITATIE * ZI_MS);
    tx.set(ref, { email, rol, creatLa: cand, creatDe: uid, expiraLa });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: OWNER, actiune: 'personal.invita', tinta: `${COLECTII_PERSONAL.invitatii}/${ref.id}`,
      inainte: vechi.exists ? { rol: vechi.get('rol') ?? null } : null, dupa: { email, rol },
    });
    return { ok: true, id: ref.id, expiraLa: expiraLa.toMillis() };
  });
}

async function anuleazaInvitatia(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPersonal> {
  const id = d['id'];
  if (typeof id !== 'string' || !RE_ID_INVITATIE.test(id)) throw argument('id-ul invitației');
  return db.runTransaction(async (tx) => {
    await cereOwner(tx, db, uid);
    const ref = colectie(db, 'invitatii').doc(id);
    const i = await tx.get(ref);
    if (!i.exists) throw new HttpsError('not-found', 'invitația nu există');
    tx.delete(ref);
    scrieAudit(tx, db, {
      cand: Timestamp.fromDate(acum), cine: uid, rol: OWNER, actiune: 'personal.anuleaza-invitatia',
      tinta: `${COLECTII_PERSONAL.invitatii}/${id}`, inainte: { email: i.get('email') ?? null, rol: i.get('rol') ?? null }, dupa: null,
    });
    return { ok: true, schimbat: true };
  });
}

/* ── Conturile create de owner ─────────────────────────────────────────────────────────────────────────────────── */

async function creeazaCont(db: Firestore, auth: AuthPersonal, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPersonal> {
  const email = normalizeazaEmail(d['email']);
  const rol = d['rol'];
  if (email === null) throw argument('adresa de e-mail');
  if (!esteRolValid(rol)) throw argument('rolul');
  // Owner-ul și rolul întâi: altfel oricine ar putea face conturi în Auth, chiar dacă scrierea din personal cade apoi.
  await db.runTransaction(async (tx) => {
    await cereOwner(tx, db, uid);
    await cereRol(tx, db, rol);
  });
  let exista = true;
  try {
    await auth.getUserByEmail(email);
  } catch (e) {
    if (codAuth(e) !== 'auth/user-not-found') throw e;
    exista = false;
  }
  // Un cont existent poate fi unul neverificat, făcut de altcineva pe adresa asta: rolul îl primește doar prin invitație.
  if (exista) throw new HttpsError('already-exists', 'există deja un cont cu adresa asta; trimite-i o invitație');
  const nou = await auth.createUser({ email, emailVerified: false });
  try {
    await db.runTransaction(async (tx) => {
      await cereOwner(tx, db, uid);
      await cereRol(tx, db, rol);
      const ref = colectie(db, 'staff').doc(nou.uid);
      if ((await tx.get(ref)).exists) throw new HttpsError('already-exists', 'contul e deja în personal');
      const cand = Timestamp.fromDate(acum);
      tx.create(ref, { rol, email, sursa: 'cont-creat', adaugatLa: cand, adaugatDe: uid });
      scrieAudit(tx, db, { cand, cine: uid, rol: OWNER, actiune: 'personal.creeaza-cont', tinta: `staff/${nou.uid}`, inainte: null, dupa: { email, rol } });
    });
  } catch (e) {
    // Fără rândul din personal, contul din Auth n-are ce căuta: se șterge, ca o încercare nouă să nu dea „există deja”.
    await auth.deleteUser(nou.uid).catch(() => undefined);
    throw e;
  }
  let link: string | null = null;
  try {
    link = await auth.generatePasswordResetLink(email);
  } catch (e) {
    await logServerError('callable:administreazaPersonalul', e, { uid, actiune: 'creeaza-cont', pas: 'link' }, db, acum);
  }
  return { ok: true, uid: nou.uid, link };
}

async function linkParola(db: Firestore, auth: AuthPersonal, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPersonal> {
  const tinta = d['uid'];
  if (typeof tinta !== 'string' || !RE_UID.test(tinta)) throw argument('uid-ul');
  const email = await db.runTransaction(async (tx) => {
    await cereOwner(tx, db, uid);
    const s = await tx.get(colectie(db, 'staff').doc(tinta));
    if (!s.exists) throw new HttpsError('not-found', 'omul nu e în personal');
    const e = s.get('email');
    if (s.get('sursa') !== 'cont-creat' || typeof e !== 'string') throw new HttpsError('failed-precondition', 'linkul de parolă e doar pentru conturile create din admin');
    return e;
  });
  let link: string;
  try {
    link = await auth.generatePasswordResetLink(email);
  } catch (e) {
    if (codAuth(e) === 'auth/user-not-found') throw new HttpsError('not-found', 'contul nu mai există în Auth');
    throw e;
  }
  // Un link de parolă deschide contul altcuiva: rămâne scris cine l-a cerut.
  await db.runTransaction(async (tx) => {
    scrieAudit(tx, db, { cand: Timestamp.fromDate(acum), cine: uid, rol: OWNER, actiune: 'personal.link-parola', tinta: `staff/${tinta}`, inainte: null, dupa: null });
  });
  return { ok: true, link };
}

/* ── Oamenii ───────────────────────────────────────────────────────────────────────────────────────────────────── */

async function schimbaRolul(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPersonal> {
  const tinta = d['uid'];
  const rol = d['rol'];
  if (typeof tinta !== 'string' || !RE_UID.test(tinta)) throw argument('uid-ul');
  if (!esteRolValid(rol)) throw argument('rolul');
  return db.runTransaction(async (tx) => {
    await cereOwner(tx, db, uid);
    await cereRol(tx, db, rol);
    const ref = colectie(db, 'staff').doc(tinta);
    const s = await tx.get(ref);
    if (!s.exists) throw new HttpsError('not-found', 'omul nu e în personal');
    const vechi: unknown = s.get('rol');
    if (vechi === rol) return { ok: true, schimbat: false };
    if (vechi === OWNER && (await owneri(tx, db)) <= 1) throw new HttpsError('failed-precondition', 'personalul nu rămâne fără owner');
    const cand = Timestamp.fromDate(acum);
    tx.update(ref, { rol, modificatLa: cand, modificatDe: uid });
    scrieAudit(tx, db, { cand, cine: uid, rol: OWNER, actiune: 'personal.schimba-rolul', tinta: `staff/${tinta}`, inainte: { rol: vechi ?? null }, dupa: { rol } });
    return { ok: true, schimbat: true };
  });
}

async function scoate(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPersonal> {
  const tinta = d['uid'];
  if (typeof tinta !== 'string' || !RE_UID.test(tinta)) throw argument('uid-ul');
  return db.runTransaction(async (tx) => {
    await cereOwner(tx, db, uid);
    const ref = colectie(db, 'staff').doc(tinta);
    const s = await tx.get(ref);
    if (!s.exists) throw new HttpsError('not-found', 'omul nu e în personal');
    const vechi: unknown = s.get('rol');
    if (vechi === OWNER && (await owneri(tx, db)) <= 1) throw new HttpsError('failed-precondition', 'personalul nu rămâne fără owner');
    tx.delete(ref);
    scrieAudit(tx, db, {
      cand: Timestamp.fromDate(acum), cine: uid, rol: OWNER, actiune: 'personal.scoate', tinta: `staff/${tinta}`,
      inainte: { rol: vechi ?? null, email: s.get('email') ?? null }, dupa: null,
    });
    return { ok: true, schimbat: true };
  });
}

/* ── Ușile ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Callable-ul `administreazaPersonalul`: `{ actiune, … }`; refuzurile sunt `HttpsError`-uri cu motivul. */
export async function administreazaPersonalul(
  db: Firestore, auth: AuthPersonal, uid: string | null, data: unknown, acum: Date = new Date(),
): Promise<RaspunsPersonal> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const d = obiect(data);
  const actiune = d['actiune'];
  try {
    switch (actiune) {
      case 'salveaza-rol': return await salveazaRol(db, uid, d, acum);
      case 'sterge-rol': return await stergeRol(db, uid, d, acum);
      case 'invita': return await invita(db, uid, d, acum);
      case 'anuleaza-invitatia': return await anuleazaInvitatia(db, uid, d, acum);
      case 'creeaza-cont': return await creeazaCont(db, auth, uid, d, acum);
      case 'link-parola': return await linkParola(db, auth, uid, d, acum);
      case 'schimba-rolul': return await schimbaRolul(db, uid, d, acum);
      case 'scoate': return await scoate(db, uid, d, acum);
      default: throw argument('acțiunea');
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:administreazaPersonalul', e, { uid, actiune: typeof actiune === 'string' ? actiune.slice(0, 40) : null }, db, acum);
    throw new HttpsError('internal', 'acțiunea n-a reușit; eroarea e în jurnal');
  }
}

/** Ce citește invitația din tokenul omului (verificat de Firebase la intrarea în callable). */
export interface TokenInvitatie {
  readonly email?: unknown;
  readonly email_verified?: unknown;
}

/**
 * Callable-ul `acceptaInvitatia` (ADR 0049 §4): omul logat cu e-mailul invitat și VERIFICAT intră în personal cu rolul
 * invitației; invitația se șterge, cu auditul, în aceeași tranzacție. Cine e deja în personal nu-și schimbă rolul așa.
 * Fără invitație, răspunsul e `{ ok: false }`, nu o eroare: pagina întreabă la fiecare intrare a unui om din afară.
 */
export async function acceptaInvitatia(db: Firestore, uid: string | null, token: TokenInvitatie | null, acum: Date = new Date()): Promise<RaspunsInvitatie> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const email = normalizeazaEmail(token?.email);
  // Un cont cu parolă se poate face de oricine, pe orice adresă; doar verificarea arată că adresa e a lui.
  if (email === null || token?.email_verified !== true) throw new HttpsError('failed-precondition', 'adresa de e-mail a contului nu e verificată');
  try {
    return await db.runTransaction(async (tx): Promise<RaspunsInvitatie> => {
      const ref = colectie(db, 'invitatii').doc(idInvitatie(email));
      const i = await tx.get(ref);
      if (!i.exists) return { ok: false, motiv: 'fara-invitatie' };
      const expira: unknown = i.get('expiraLa');
      if (!(expira instanceof Timestamp) || expira.toMillis() <= acum.getTime()) throw new HttpsError('failed-precondition', 'invitația a expirat; cere una nouă');
      const staff = colectie(db, 'staff').doc(uid);
      if ((await tx.get(staff)).exists) throw new HttpsError('already-exists', 'contul e deja în personal');
      const rol: unknown = i.get('rol');
      if (!esteRolValid(rol)) throw new HttpsError('failed-precondition', 'rolul invitației nu mai e valid');
      await cereRol(tx, db, rol);
      const cand = Timestamp.fromDate(acum);
      const deLa: unknown = i.get('creatDe');
      tx.create(staff, { rol, email, sursa: 'invitatie', adaugatLa: cand, adaugatDe: typeof deLa === 'string' ? deLa : null });
      tx.delete(ref);
      scrieAudit(tx, db, { cand, cine: uid, rol, actiune: 'personal.accepta-invitatia', tinta: `staff/${uid}`, inainte: null, dupa: { email, rol } });
      return { ok: true, rol };
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:acceptaInvitatia', e, { uid }, db, acum);
    throw new HttpsError('internal', 'acceptarea n-a reușit; eroarea e în jurnal');
  }
}
