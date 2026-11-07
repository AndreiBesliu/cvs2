import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { judecaMarcaj, JOBURI, marcajDin } from '../../shared/joburi.ts';
import { caleProiectTichet } from '../../shared/tichete.ts';
import { fisiereDin, type Fisiere } from '../src/fisiere.ts';
import { cuMarcaj } from '../src/joburi/marcaj.ts';
import { OPTIUNI_PASTRARE, pastreazaTichetele, type OptiuniPastrare } from '../src/joburi/pastrare.ts';

/**
 * Jobul de păstrare a tichetelor (ADR 0116 §16, felia 15.B↑b) pe emulatoarele Firestore și Storage: șterge tichetele rezolvate
 * de mai mult de `zilePastrareTichete` (citit la rulare), cu poza și proiectul lor, și lasă restul; mătură fișierele rămase
 * fără tichet; merge pe pagini; se oprește la plafon și la buget fără eroare; numără eșecurile și aruncă la final, ca
 * marcajul să le arate (galben la unul, roșu la două la rând).
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
if (!process.env['FIREBASE_STORAGE_EMULATOR_HOST']) throw new Error('FIREBASE_STORAGE_EMULATOR_HOST lipsește: emulatorul Storage nu e pornit');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();
const bucket = getStorage().bucket(`${PROIECT}.appspot.com`);
const fisiere = fisiereDin(bucket);

const ZI = 86_400_000;
/**
 * „Acum” al rulărilor, fix pe toată proba (tichetele și jobul îl citesc pe același): ora reală plus o zi, ca fișierele
 * emulatorului (cu data creării reală) să fie toate mai vechi de o oră.
 */
let T = new Date();
const acum = (): Date => T;
const ID = (n: number): string => `Tichet${String(n).padStart(14, '0')}`;
const DEF = JOBURI.find((j) => j.nume === 'pastrareTichete');

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  await bucket.deleteFiles({ force: true });
  T = new Date(Date.now() + ZI);
});

/** Un tichet, cu poza în documentul ei și, la cerere, proiectul în Storage. `rezolvat`: acum zile în urmă (null = nerezolvat). */
async function tichet(n: number, o: { readonly stare?: string; readonly rezolvatInUrma?: number | null; readonly proiect?: boolean; readonly poza?: boolean } = {}): Promise<string> {
  const id = ID(n);
  const rezolvat = o.rezolvatInUrma === undefined || o.rezolvatInUrma === null ? null : Timestamp.fromMillis(acum().getTime() - o.rezolvatInUrma * ZI);
  await db.doc(`tichete/${id}`).set({
    schema: 1, autor: 'ana', stare: o.stare ?? (rezolvat ? 'rezolvat' : 'deschis'), text: `T${n}`, rezolvatLa: rezolvat,
    poza: o.poza === false ? null : { tip: 'image/jpeg', marime: 3 },
    proiect: o.proiect ? { marime: 100, comprimat: 40, sha256: 'a'.repeat(64), schema: 20 } : null,
  });
  if (o.poza !== false) await db.doc(`tichete/${id}/poze/plansa`).set({ tip: 'image/jpeg', marime: 3, octeti: Buffer.from([1, 2, 3]) });
  if (o.proiect) await bucket.file(caleProiectTichet(id)).save(Buffer.from('gzip'), { contentType: 'application/gzip', resumable: false });
  return id;
}

const exista = async (cale: string): Promise<boolean> => (await db.doc(cale).get()).exists;
const fisiereLa = async (prefix: string): Promise<string[]> => (await bucket.getFiles({ prefix }))[0].map((f) => f.name).sort();
const auditul = async () => (await db.collection('audit').get()).docs.map((d) => d.data());
const fara = (d: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'limita'));

test('șterge tichetele rezolvate de peste N zile (fila Setări), cu poza și proiectul; restul rămân neatinse', async () => {
  await db.doc('setari/conturi').set({ zileOffline: 7, zilePastrareTichete: 30 });
  const vechi = await tichet(1, { rezolvatInUrma: 31, proiect: true });
  const proaspat = await tichet(2, { rezolvatInUrma: 29, proiect: true });
  const laLimita = await tichet(3, { rezolvatInUrma: 30 });
  const deschis = await tichet(4, { stare: 'deschis' });
  // Redeschis cu data rezolvării rămasă (callable-ul o scoate; jobul judecă din nou starea în tranzacție): nu se șterge.
  const redeschis = await tichet(5, { stare: 'deschis', rezolvatInUrma: 400 });
  const faraProiect = await tichet(6, { rezolvatInUrma: 90, poza: false });
  await bucket.file('users/u1/projects/p1').save(Buffer.from('al aplicației vechi'), { resumable: false });
  const t = acum();
  const d = await pastreazaTichetele(db, fisiere, t);
  assert.deepEqual(fara(d), { zile: 30, judecate: 3, sterse: 2, sarite: 1, fisiereSterse: 1, scanate: 1, orfane: 0, necunoscute: 0, neterminat: false });
  assert.equal((d['limita'] as Timestamp).toMillis(), t.getTime() - 30 * ZI);
  for (const id of [vechi, faraProiect]) assert.deepEqual([await exista(`tichete/${id}`), await exista(`tichete/${id}/poze/plansa`)], [false, false], id);
  for (const id of [proaspat, laLimita, deschis, redeschis]) assert.equal(await exista(`tichete/${id}`), true, id);
  assert.equal(await exista(`tichete/${proaspat}/poze/plansa`), true);
  assert.deepEqual(await fisiereLa('tichete/'), [caleProiectTichet(proaspat)]);
  assert.deepEqual(await fisiereLa('users/'), ['users/u1/projects/p1'], 'în afara prefixului nu se atinge nimic');
  // Auditul: câte un rând pe tichet șters, fără conținut, cu jobul drept autor.
  const a = await auditul();
  assert.deepEqual(a.map((x) => [x['actiune'], x['cine'], x['rol'], x['tinta'], x['dupa']]).sort(), [
    ['tichete.sterge', 'job:pastrareTichete', null, `tichete/${vechi}`, null],
    ['tichete.sterge', 'job:pastrareTichete', null, `tichete/${faraProiect}`, null],
  ]);
  const inainte = a.find((x) => x['tinta'] === `tichete/${vechi}`)?.['inainte'] as Record<string, unknown>;
  assert.deepEqual({ ...inainte, rezolvatLa: (inainte['rezolvatLa'] as Timestamp).toMillis() }, {
    stare: 'rezolvat', rezolvatLa: t.getTime() - 31 * ZI, zilePastrare: 30, poza: true, proiect: { marime: 100 },
  });
});

test('păstrarea, din setare: fără setare, 365 de zile; o setare în afara marginilor = implicitul; schimbarea se aplică la rularea următoare', async () => {
  const an = await tichet(1, { rezolvatInUrma: 364 });
  const pesteAn = await tichet(2, { rezolvatInUrma: 366 });
  assert.equal((await pastreazaTichetele(db, fisiere, acum()))['zile'], 365);
  assert.deepEqual([await exista(`tichete/${an}`), await exista(`tichete/${pesteAn}`)], [true, false]);
  await db.doc('setari/conturi').set({ zileOffline: 7, zilePastrareTichete: 29 });
  assert.equal((await pastreazaTichetele(db, fisiere, acum()))['zile'], 365, 'sub marginea de 30 de zile: implicitul');
  assert.equal(await exista(`tichete/${an}`), true);
  await db.doc('setari/conturi').set({ zileOffline: 7, zilePastrareTichete: 30 });
  assert.equal((await pastreazaTichetele(db, fisiere, acum()))['zile'], 30);
  assert.equal(await exista(`tichete/${an}`), false, 'owner-ul a scurtat păstrarea: se aplică la rularea următoare');
});

test('orfanii: fișierele fără tichet, mai vechi de o oră, se șterg; unul tânăr, al unui tichet sau cu nume străin rămâne', async () => {
  const cuTichet = await tichet(1, { proiect: true });
  const orfan = caleProiectTichet(ID(2));
  for (const cale of [orfan, `tichete/${ID(3)}/altceva.txt`, 'tichete/scurt/proiect.json.gz', 'users/u1/projects/p1']) {
    await bucket.file(cale).save(Buffer.from('x'), { resumable: false });
  }
  // La ora reală, toate fișierele au sub o oră: unul fără tichet poate fi al unei raportări în lucru.
  const d0 = await pastreazaTichetele(db, fisiere, new Date());
  assert.deepEqual([d0['scanate'], d0['orfane'], d0['necunoscute']], [4, 0, 2]);
  const d = await pastreazaTichetele(db, fisiere, acum());
  assert.deepEqual([d['scanate'], d['orfane'], d['necunoscute']], [4, 1, 2]);
  assert.deepEqual(await fisiereLa(''), [
    `tichete/${ID(3)}/altceva.txt`, caleProiectTichet(cuTichet), 'tichete/scurt/proiect.json.gz', 'users/u1/projects/p1',
  ].sort());
});

test('paginile: cu două tichete și două nume pe pagină, toate se văd (cursorul și cheia paginii)', async () => {
  for (let n = 1; n <= 5; n++) await tichet(n, { rezolvatInUrma: 400 + n, proiect: true });
  for (let n = 6; n <= 10; n++) await bucket.file(caleProiectTichet(ID(n))).save(Buffer.from('orfan'), { resumable: false });
  await tichet(11, { rezolvatInUrma: 10, proiect: true });
  const o: OptiuniPastrare = { ...OPTIUNI_PASTRARE, pagina: 2, paginaFisiere: 2 };
  const d = await pastreazaTichetele(db, fisiere, acum(), o);
  assert.deepEqual([d['sterse'], d['fisiereSterse'], d['orfane'], d['neterminat']], [5, 5, 5, false]);
  assert.deepEqual(await fisiereLa('tichete/'), [caleProiectTichet(ID(11))]);
  assert.equal((await db.collection('tichete').get()).size, 1);
});

test('cursorul: tichetele sărite (redeschise) nu se mai judecă din nou; paginile merg mai departe de ele', async () => {
  // Pe pagini de câte unul, un tichet sărit rămâne în interogare: fără cursor, aceeași pagină s-ar judeca până la plafon.
  const sarit = await tichet(1, { stare: 'deschis', rezolvatInUrma: 500 });
  for (let n = 2; n <= 3; n++) await tichet(n, { rezolvatInUrma: 400 });
  const d = await pastreazaTichetele(db, fisiere, acum(), { ...OPTIUNI_PASTRARE, pagina: 1, plafon: 20 });
  assert.deepEqual([d['judecate'], d['sterse'], d['sarite'], d['neterminat']], [3, 2, 1, false]);
  assert.deepEqual((await db.collection('tichete').get()).docs.map((x) => x.id), [sarit]);
});

test('plafonul și bugetul: restul rămâne pentru rularea următoare (neterminat), fără eroare; a doua rulare continuă', async () => {
  for (let n = 1; n <= 5; n++) await tichet(n, { rezolvatInUrma: 400 + n });
  const d1 = await pastreazaTichetele(db, fisiere, acum(), { ...OPTIUNI_PASTRARE, plafon: 2 });
  assert.deepEqual([d1['judecate'], d1['sterse'], d1['neterminat']], [2, 2, true]);
  // Cele mai vechi întâi: au plecat 5 și 4 (rezolvate acum 405 și 404 zile).
  assert.deepEqual((await db.collection('tichete').get()).docs.map((x) => x.id).sort(), [ID(1), ID(2), ID(3)]);
  // Bugetul: un ceas care sare după prima ștergere.
  let pas = 0;
  const d2 = await pastreazaTichetele(db, fisiere, acum(), { ...OPTIUNI_PASTRARE, ceas: () => (pas++ < 2 ? 0 : 10 * OPTIUNI_PASTRARE.bugetMs) });
  assert.deepEqual([d2['sterse'], d2['neterminat']], [1, true]);
  const d3 = await pastreazaTichetele(db, fisiere, acum());
  assert.deepEqual([d3['sterse'], d3['neterminat']], [2, false]);
  assert.equal((await db.collection('tichete').get()).size, 0);
});

test('eșecurile: o ștergere de fișier căzută se numără, jobul aruncă la final, marcajul o arată; rularea următoare o repară', async () => {
  const id = await tichet(1, { rezolvatInUrma: 400, proiect: true });
  await tichet(2, { rezolvatInUrma: 400 });
  const caza: Fisiere = { ...fisiere, async sterge() { throw new Error('Storage indisponibil'); } };
  const ok1 = await cuMarcaj(db, 'pastrareTichete', () => pastreazaTichetele(db, caza, acum()));
  assert.equal(ok1, false);
  // Tichetele sunt șterse (cu auditul lor); fișierul a rămas orfan, iar eroarea e în marcaj și în jurnal.
  assert.equal((await db.collection('tichete').get()).size, 0);
  assert.deepEqual(await fisiereLa('tichete/'), [caleProiectTichet(id)]);
  const m1 = (await db.doc('marcaje/pastrareTichete').get()).data() ?? {};
  assert.equal(m1['esecuriLaRand'], 1);
  assert.match(String(m1['ultimaEroare']), new RegExp(`^Error: fișiere neșterse: 1 \\(tichete/${id}/proiect\\.json\\.gz: Error: Storage indisponibil\\)`));
  const jurnal = (await db.collection('errorLogs').get()).docs.map((x) => [x.get('sursa'), x.get('tip'), String(x.get('mesaj')).slice(0, 27)]);
  assert.deepEqual(jurnal, [['server', 'job:pastrareTichete', 'Error: fișiere neșterse: 1 ']]);
  if (!DEF) throw new Error('pastrareTichete lipsește din JOBURI');
  const judecata = (m: Record<string, unknown>) => {
    const x = marcajDin(m);
    return judecaMarcaj(x, DEF, Date.now()).stare;
  };
  assert.equal(judecata(m1), 'esec', 'fără niciun succes încă: eșec');
  // A doua rulare, cu Storage-ul înapoi: orfanul pleacă, marcajul e verde.
  assert.equal(await cuMarcaj(db, 'pastrareTichete', () => pastreazaTichetele(db, fisiere, acum())), true);
  assert.deepEqual(await fisiereLa('tichete/'), []);
  const m2 = (await db.doc('marcaje/pastrareTichete').get()).data() ?? {};
  assert.deepEqual([m2['esecuriLaRand'], m2['ultimaEroare'], (m2['detaliu'] as Record<string, unknown>)['orfane']], [0, null, 1]);
  assert.equal(judecata(m2), 'bine');
  // Două eșecuri la rând: roșu (ADR 0041 §3), chiar dacă a existat un succes.
  await tichet(3, { rezolvatInUrma: 400, proiect: true });
  await cuMarcaj(db, 'pastrareTichete', () => pastreazaTichetele(db, caza, acum()));
  assert.equal(judecata((await db.doc('marcaje/pastrareTichete').get()).data() ?? {}), 'atentie', 'un eșec după succes: galben');
  await cuMarcaj(db, 'pastrareTichete', () => pastreazaTichetele(db, caza, acum()));
  assert.equal(judecata((await db.doc('marcaje/pastrareTichete').get()).data() ?? {}), 'esec', 'al doilea la rând: roșu');
});

test('o ștergere căzută la tichete și reușită la orfani, în aceeași rulare, nu mai e eșec', async () => {
  const id = await tichet(1, { rezolvatInUrma: 400, proiect: true });
  const incercari = new Map<string, number>();
  const oData: Fisiere = {
    ...fisiere,
    async sterge(cale) {
      const n = (incercari.get(cale) ?? 0) + 1;
      incercari.set(cale, n);
      if (n === 1) throw new Error('o sughiță a Storage-ului');
      await fisiere.sterge(cale);
    },
  };
  const d = await pastreazaTichetele(db, oData, acum());
  assert.deepEqual([d['sterse'], d['fisiereSterse'], d['orfane']], [1, 0, 1]);
  assert.deepEqual([...incercari], [[caleProiectTichet(id), 2]]);
  assert.deepEqual(await fisiereLa('tichete/'), []);
});
