import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { COLECTIE_CONTURI } from '../../../shared/conturiPlan.ts';
import { COLECTII_PERSONAL, normalizeazaEmail } from '../../../shared/personal.ts';
import { COLECTIE_POZE, ID_POZA } from '../../../shared/poza.ts';
import { esteVersiune } from '../../../shared/sugestii.ts';
import {
  COLECTIE_LIMITE_TICHETE, COLECTIE_TICHETE, curataAmprentele, curataAplicatia, curataTextTichet, esteFelTichet, esteIdTichet,
  esteStareTichet, PLAFON_RAPORTARILE_MELE, RASPUNS_MAX, RASPUNSURI_MAX, TEXT_MAX, TICHETE_PE_ZI, ziUtc, type FelTichet,
  type RaportareaMea, type RaspunsRaportarileMele, type RaspunsTichet, type StareTichet,
} from '../../../shared/tichete.ts';
import { scrieAudit } from '../audit.ts';
import { logServerError } from '../erori/jurnal.ts';
import { drepturiIn } from '../personal/drepturi.ts';
import { pozaDin } from '../poza.ts';

/**
 * Raportările clienților (tichetele, ADR 0116 §C, felia 15.B↑a). Raportează din editor oricine are contul deschis (adresa
 * confirmată: `conturi/{uid}`) sau e în personal, cel mult 10 pe zi. Personalul cu `tichete.raspunde` răspunde și schimbă
 * starea, pe versiunea văzută. Autorul își vede raportările, cu răspunsurile echipei, și și le marchează citite. Drepturile se
 * citesc în tranzacția fiecărei acțiuni; raportarea și fiecare schimbare a personalului au rândul lor de audit în aceeași
 * tranzacție, fără textul omului (auditul ține felul și mărimile).
 */

/** Ce citește serverul din tokenul omului (verificat de Firebase la intrarea în callable). */
export interface TokenTichet {
  readonly email?: unknown;
}

const obiect = (x: unknown): Record<string, unknown> => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : {});
const argument = (motiv: string): HttpsError => new HttpsError('invalid-argument', motiv);
const numar = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const ms = (x: unknown): number => (x instanceof Timestamp ? x.toMillis() : 0);
const sir = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

const SCHIMBAT = 'tichetul s-a schimbat de când l-ai deschis; reîncarcă lista';
const FARA_RASPUNS = 'rolul tău nu răspunde la tichete';
/** Câte tichete ale unui om citește serverul cel mult: ordinea și plafonul se fac aici, fără index compus. */
const PLAFON_INTEROGARE = 1000;

/** Id-ul și versiunea văzută, cerute de răspuns și de stare. */
function tinta(d: Record<string, unknown>): { readonly id: string; readonly versiune: number } {
  const id = d['id'];
  const versiune = d['versiune'];
  if (!esteIdTichet(id)) throw argument('id-ul tichetului');
  if (!esteVersiune(versiune)) throw argument('versiunea văzută a tichetului');
  return { id, versiune };
}

async function raporteaza(db: Firestore, uid: string, token: TokenTichet | null, d: Record<string, unknown>, acum: Date): Promise<RaspunsTichet> {
  const fel = d['fel'];
  if (!esteFelTichet(fel)) throw argument('felul: problemă, idee sau întrebare');
  const text = curataTextTichet(d['text']);
  if (text === null) throw argument(`textul are 1–${TEXT_MAX} de caractere, fără caractere de control`);
  const aplicatia = curataAplicatia(d['aplicatia']);
  if (aplicatia === null) throw argument('datele aplicației');
  const amprente = curataAmprentele(d['amprente'] ?? []);
  if (amprente === null) throw argument('amprentele erorilor');
  const poza = pozaDin(d['poza']);
  return db.runTransaction(async (tx) => {
    // Toate citirile tranzacției înaintea scrierilor (Firestore o cere).
    const drepturi = await drepturiIn(tx, db, uid);
    const cont = await tx.get(db.collection(COLECTIE_CONTURI).doc(uid));
    const staff = await tx.get(db.collection(COLECTII_PERSONAL.staff).doc(uid));
    if (!cont.exists && !staff.exists) throw new HttpsError('permission-denied', 'raportarea cere contul deschis, cu adresa confirmată');
    const limita = db.collection(COLECTIE_LIMITE_TICHETE).doc(uid);
    const l = await tx.get(limita);
    const zi = ziUtc(acum);
    const azi = l.get('zi') === zi ? numar(l.get('numar')) : 0;
    if (azi >= TICHETE_PE_ZI) throw new HttpsError('resource-exhausted', `cel mult ${TICHETE_PE_ZI} raportări pe zi; mai scrie mâine`);
    const ref = db.collection(COLECTIE_TICHETE).doc();
    const cand = Timestamp.fromDate(acum);
    const autorEmail = sir(cont.get('email')) ?? sir(staff.get('email')) ?? normalizeazaEmail(token?.email);
    // Poza stă în documentul ei (fila nu aduce octeții cu lista); tichetul ține doar tipul și mărimea.
    const meta = poza ? { tip: poza.tip, marime: poza.octeti.length } : null;
    tx.set(limita, { zi, numar: azi + 1 });
    tx.create(ref, {
      schema: 1, autor: uid, autorEmail, fel, text, aplicatia, amprente, poza: meta, stare: 'nou', creatLa: cand, modificatLa: cand,
      raspunsuri: [], ultimulRaspunsLa: null, necititeAutor: 0, versiune: 1,
    });
    if (poza && meta) tx.create(ref.collection(COLECTIE_POZE).doc(ID_POZA), { schema: 1, ...meta, octeti: poza.octeti, creataLa: cand });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: drepturi.rol, actiune: 'tichete.raporteaza', tinta: `${COLECTIE_TICHETE}/${ref.id}`, inainte: null,
      dupa: { fel, caractere: [...text].length, amprente: amprente.length, poza: meta },
    });
    return { ok: true, id: ref.id, schimbat: true, versiune: 1 };
  });
}

/** Un tichet cum îl vede autorul: răspunsurile echipei fără cine le-a scris. */
function raportareaDin(s: DocumentSnapshot): RaportareaMea {
  const fel: unknown = s.get('fel');
  const stare: unknown = s.get('stare');
  const raspunsuri: unknown = s.get('raspunsuri');
  return {
    id: s.id,
    fel: esteFelTichet(fel) ? fel : ('problema' satisfies FelTichet),
    text: sir(s.get('text')) ?? '',
    stare: esteStareTichet(stare) ? stare : ('nou' satisfies StareTichet),
    creatLa: ms(s.get('creatLa')),
    raspunsuri: (Array.isArray(raspunsuri) ? raspunsuri : []).map((r: unknown) => ({ text: sir(obiect(r)['text']) ?? '', la: ms(obiect(r)['la']) })),
    necitite: numar(s.get('necititeAutor')),
  };
}

/** Raportările omului, cele mai noi întâi (cel mult 50), și câte au un răspuns necitit. */
async function mele(db: Firestore, uid: string): Promise<RaspunsRaportarileMele> {
  // O singură condiție (`autor`): indexul simplu ajunge.
  const q = await db.collection(COLECTIE_TICHETE).where('autor', '==', uid).limit(PLAFON_INTEROGARE).get();
  const toate = q.docs.map(raportareaDin).sort((a, b) => b.creatLa - a.creatLa);
  return { ok: true, raportari: toate.slice(0, PLAFON_RAPORTARILE_MELE), necitite: toate.filter((r) => r.necitite > 0).length };
}

/**
 * Câte raportări ale omului au un răspuns necitit: semnul din meniul contului, trimis odată cu deschiderea contului (fără
 * o cerere în plus la pornire). Doar câmpul de care e nevoie, fără index compus.
 */
export async function raportariNecitite(db: Firestore, uid: string): Promise<number> {
  const q = await db.collection(COLECTIE_TICHETE).where('autor', '==', uid).select('necititeAutor').limit(PLAFON_INTEROGARE).get();
  return q.docs.filter((s) => numar(s.get('necititeAutor')) > 0).length;
}

async function citit(db: Firestore, uid: string, d: Record<string, unknown>): Promise<RaspunsTichet> {
  const id = d['id'];
  if (!esteIdTichet(id)) throw argument('id-ul tichetului');
  return db.runTransaction(async (tx) => {
    const ref = db.collection(COLECTIE_TICHETE).doc(id);
    const t = await tx.get(ref);
    if (!t.exists) throw new HttpsError('not-found', 'tichetul nu există');
    if (t.get('autor') !== uid) throw new HttpsError('permission-denied', 'doar autorul își marchează răspunsurile citite');
    // Versiunea nu crește: citirea omului nu încurcă un răspuns al echipei pornit pe versiunea de acum.
    const versiune = numar(t.get('versiune'));
    if (numar(t.get('necititeAutor')) === 0) return { ok: true, id, schimbat: false, versiune };
    tx.update(ref, { necititeAutor: 0 });
    return { ok: true, id, schimbat: true, versiune };
  });
}

async function raspunde(db: Firestore, uid: string, token: TokenTichet | null, d: Record<string, unknown>, acum: Date): Promise<RaspunsTichet> {
  const { id, versiune } = tinta(d);
  const text = curataTextTichet(d['text'], RASPUNS_MAX);
  if (text === null) throw argument(`răspunsul are 1–${RASPUNS_MAX} de caractere, fără caractere de control`);
  return db.runTransaction(async (tx) => {
    const drepturi = await drepturiIn(tx, db, uid);
    if (!drepturi.permisiuni.has('tichete.raspunde')) throw new HttpsError('permission-denied', FARA_RASPUNS);
    const ref = db.collection(COLECTIE_TICHETE).doc(id);
    const t = await tx.get(ref);
    const staff = await tx.get(db.collection(COLECTII_PERSONAL.staff).doc(uid));
    if (!t.exists) throw new HttpsError('not-found', 'tichetul nu există');
    if (t.get('versiune') !== versiune) throw new HttpsError('failed-precondition', SCHIMBAT);
    const vechi: unknown = t.get('raspunsuri');
    const lista: readonly unknown[] = Array.isArray(vechi) ? vechi : [];
    if (lista.length >= RASPUNSURI_MAX) throw new HttpsError('failed-precondition', `tichetul are deja ${RASPUNSURI_MAX} de răspunsuri`);
    const cand = Timestamp.fromDate(acum);
    const deEmail = sir(staff.get('email')) ?? normalizeazaEmail(token?.email);
    const inainte: unknown = t.get('stare');
    // Primul răspuns deschide tichetul; unul pe un tichet deschis sau rezolvat îi lasă starea.
    const stare: StareTichet = !esteStareTichet(inainte) || inainte === 'nou' ? 'deschis' : inainte;
    tx.update(ref, {
      raspunsuri: [...lista, { de: uid, deEmail, text, la: cand }], stare, ultimulRaspunsLa: cand,
      necititeAutor: numar(t.get('necititeAutor')) + 1, modificatLa: cand, versiune: versiune + 1,
    });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: drepturi.rol, actiune: 'tichete.raspunde', tinta: `${COLECTIE_TICHETE}/${id}`,
      inainte: { stare: inainte ?? null, raspunsuri: lista.length }, dupa: { stare, raspunsuri: lista.length + 1 },
    });
    return { ok: true, id, schimbat: true, versiune: versiune + 1 };
  });
}

async function schimbaStarea(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsTichet> {
  const { id, versiune } = tinta(d);
  const stare = d['stare'];
  if (!esteStareTichet(stare)) throw argument('starea tichetului');
  return db.runTransaction(async (tx) => {
    const drepturi = await drepturiIn(tx, db, uid);
    if (!drepturi.permisiuni.has('tichete.raspunde')) throw new HttpsError('permission-denied', FARA_RASPUNS);
    const ref = db.collection(COLECTIE_TICHETE).doc(id);
    const t = await tx.get(ref);
    if (!t.exists) throw new HttpsError('not-found', 'tichetul nu există');
    if (t.get('versiune') !== versiune) throw new HttpsError('failed-precondition', SCHIMBAT);
    const inainte: unknown = t.get('stare');
    if (inainte === stare) return { ok: true, id, schimbat: false, versiune };
    const cand = Timestamp.fromDate(acum);
    tx.update(ref, { stare, modificatLa: cand, versiune: versiune + 1 });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: drepturi.rol, actiune: 'tichete.stare', tinta: `${COLECTIE_TICHETE}/${id}`, inainte: { stare: inainte ?? null },
      dupa: { stare },
    });
    return { ok: true, id, schimbat: true, versiune: versiune + 1 };
  });
}

/**
 * Callable-ul `tichete`: `{ actiune: 'raporteaza' | 'mele' | 'citit' | 'raspunde' | 'stare', … }`; refuzurile sunt
 * `HttpsError`-uri cu motivul.
 */
export async function trateazaTichetul(
  db: Firestore, uid: string | null, token: TokenTichet | null, data: unknown, acum: Date = new Date(),
): Promise<RaspunsTichet | RaspunsRaportarileMele> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const d = obiect(data);
  const actiune = d['actiune'];
  try {
    switch (actiune) {
      case 'raporteaza': return await raporteaza(db, uid, token, d, acum);
      case 'mele': return await mele(db, uid);
      case 'citit': return await citit(db, uid, d);
      case 'raspunde': return await raspunde(db, uid, token, d, acum);
      case 'stare': return await schimbaStarea(db, uid, d, acum);
      default: throw argument('acțiunea');
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:tichete', e, { uid, actiune: typeof actiune === 'string' ? actiune.slice(0, 40) : null }, db, acum);
    throw new HttpsError('internal', 'acțiunea n-a reușit; eroarea e în jurnal');
  }
}
