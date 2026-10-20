/**
 * Personalul (ADR 0049, continuă ADR 0040 §3), comun clientului și serverului: catalogul de permisiuni, rolul fix
 * `owner` și validările cererilor. Sursa rolului e una singură, `staff/{uid}.rol`: `owner` sau id-ul unui rol din
 * `roluri/{id}` (un nume + o submulțime din catalog). Regulile Firestore citesc aceleași două documente (`firestore.rules`,
 * `are`); testele pe emulator le leagă. Un rol necunoscut nu dă nimic.
 */

/**
 * Catalogul: fiecare permisiune o verifică regulile sau serverul, deci una nouă e o schimbare de cod, cu proba ei.
 * Administrarea personalului (oamenii, rolurile, invitațiile, conturile) nu e în catalog: e doar a owner-ului.
 */
export const PERMISIUNI = ['erori.citeste', 'erori.rezolva', 'diagnoza.citeste', 'audit.citeste', 'documentatie.citeste'] as const;
export type Permisiune = (typeof PERMISIUNI)[number];

/** Rolul fix: are tot, administrează personalul; personalul nu rămâne niciodată fără el. */
export const OWNER = 'owner';

/** Id-ul unui rol custom, dat de server: forma id-urilor automate ale Firestore (regulile cer aceeași formă). */
export const RE_ID_ROL = /^[A-Za-z0-9]{20}$/;

/** Colecțiile personalului (ADR 0049 §2), scrise doar de server. */
export const COLECTII_PERSONAL = { staff: 'staff', roluri: 'roluri', invitatii: 'invitatiiPersonal' } as const;

/** Cât trăiește o invitație. */
export const ZILE_INVITATIE = 7;

export const NUME_ROL_MAX = 40;

export function estePermisiune(x: unknown): x is Permisiune {
  return typeof x === 'string' && (PERMISIUNI as readonly string[]).includes(x);
}

export function esteIdRol(x: unknown): x is string {
  return typeof x === 'string' && RE_ID_ROL.test(x);
}

/** Valoarea din `staff/{uid}.rol` are forma unui rol (owner sau un id de rol custom); existența rolului e altă întrebare. */
export function esteRolValid(x: unknown): x is string {
  return x === OWNER || esteIdRol(x);
}

/**
 * Pură: permisiunile unui om din rolul lui și din permisiunile documentului rolului: owner → tot catalogul; un rol custom
 * → doar ce e în catalog din lista lui (o valoare necunoscută nu dă nimic); altfel nimic.
 */
export function permisiuniDin(rol: unknown, permisiuniRol: unknown): ReadonlySet<Permisiune> {
  if (rol === OWNER) return new Set(PERMISIUNI);
  if (!esteIdRol(rol) || !Array.isArray(permisiuniRol)) return new Set();
  return new Set(permisiuniRol.filter(estePermisiune));
}

/** Pură: lista de permisiuni a unei cereri, sortată în ordinea catalogului, fără dubluri; null dacă are altceva. */
export function curataPermisiuni(x: unknown): Permisiune[] | null {
  if (!Array.isArray(x) || x.length > 50 || !x.every(estePermisiune)) return null;
  return PERMISIUNI.filter((p) => x.includes(p));
}

/** Pură: numele unui rol: spațiile adunate, 1…40 de caractere, fără caractere de control; null altfel. */
export function curataNumeRol(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const s = x.replace(/\s+/g, ' ').trim();
  if (s === '' || [...s].length > NUME_ROL_MAX || /[\u0000-\u001f\u007f]/.test(s)) return null;
  return s;
}

/**
 * Pură: adresa de e-mail a unei cereri, cu litere mici (Firebase le compară așa): o singură `@`, fără spații, domeniul
 * cu punct, cel mult 254 de caractere; null altfel. Nu verifică că adresa există: asta o face omul, intrând.
 */
export function normalizeazaEmail(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const s = x.trim().toLowerCase();
  if (s.length > 254 || !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

/** Cererile callable-ului `administreazaPersonalul` (ADR 0049), doar ale owner-ului. */
export type CererePersonal =
  | { readonly actiune: 'salveaza-rol'; readonly id?: string; readonly nume: string; readonly permisiuni: readonly Permisiune[] }
  | { readonly actiune: 'sterge-rol'; readonly id: string }
  | { readonly actiune: 'invita'; readonly email: string; readonly rol: string }
  | { readonly actiune: 'anuleaza-invitatia'; readonly id: string }
  | { readonly actiune: 'creeaza-cont'; readonly email: string; readonly rol: string }
  | { readonly actiune: 'link-parola'; readonly uid: string }
  | { readonly actiune: 'schimba-rolul'; readonly uid: string; readonly rol: string }
  | { readonly actiune: 'scoate'; readonly uid: string };

/** Răspunsul lui `acceptaInvitatia`: rolul primit, sau „nicio invitație” (cazul obișnuit al unui om din afară, nu o eroare). */
export type RaspunsInvitatie = { readonly ok: true; readonly rol: string } | { readonly ok: false; readonly motiv: 'fara-invitatie' };

export interface RaspunsPersonal {
  readonly ok: true;
  readonly schimbat?: boolean;
  readonly id?: string;
  readonly uid?: string;
  /** Linkul de setare a parolei (valabil o oră); null dacă n-a putut fi făcut (contul există: „Link nou”). */
  readonly link?: string | null;
  readonly expiraLa?: number;
}
