import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  FREZE_IN_CONT, LOT_FREZE, OCTETI_FREZA, type RaspunsListaFreze, type RaspunsScrieFreze,
} from '../../shared/freze.ts';
import { ZI_MS } from '../../shared/conturi.ts';
import { trateazaFrezele, type LimiteFreze } from '../src/freze/actiuni.ts';

/**
 * Biblioteca de freze în cont (ADR 0300 §7, felia 16.A↑c) pe emulatorul Firestore: callable-ul `freze` cere omul și contul
 * deschis; lista dă schimbările de după versiunea știută, pe pagini, cu ștergerile; scrierea și ștergerea cer versiunea
 * văzută (altfel conflict, cu ce e în cont); plafoanele (frezele vii, octeții, lotul); semnele ștergerii cele mai vechi
 * pleacă, iar un calculator rămas în urma lor primește lista întreagă; fără capabilitatea `cloud` (proba trecută, contul
 * dezactivat) lista merge, scrierea nu; cererile greșite nu scriu nimic.
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

const T0 = new Date(Date.UTC(2026, 10, 24, 10, 0));

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  await db.doc('staff/own').set({ rol: 'owner' });
  // Conturile: în probă, gratuit, cu proba trecută, dezactivat; personalul (owner-ul) cu proba trecută.
  await db.doc('conturi/ana').set({ plan: 'proba', probaPana: Timestamp.fromMillis(T0.getTime() + 10 * ZI_MS) });
  await db.doc('conturi/bob').set({ plan: 'gratuit', probaPana: Timestamp.fromMillis(T0.getTime() - 30 * ZI_MS) });
  await db.doc('conturi/exp').set({ plan: 'proba', probaPana: Timestamp.fromMillis(T0.getTime() - ZI_MS) });
  await db.doc('conturi/dez').set({ plan: 'dezactivat', probaPana: Timestamp.fromMillis(T0.getTime() + 10 * ZI_MS) });
  await db.doc('conturi/own').set({ plan: 'proba', probaPana: Timestamp.fromMillis(T0.getTime() - ZI_MS) });
});

const cod = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
    return 'fără eroare';
  } catch (e) {
    return e instanceof HttpsError ? e.code : `altceva: ${String(e)}`;
  }
};

const json = (id: string, nume = id, alte: Record<string, unknown> = {}): string => JSON.stringify({ id, nume, fel: 'plata', diametru: 6, ...alte });
const lista = (uid: string, dupa: number, limite?: LimiteFreze) =>
  trateazaFrezele(db, uid, { actiune: 'lista', dupa }, T0, limite) as Promise<RaspunsListaFreze>;
const scrie = (uid: string, freze: { id: string; vazuta: number; json?: string }[], limite?: LimiteFreze) =>
  trateazaFrezele(db, uid, { actiune: 'scrie', freze: freze.map((f) => ({ ...f, json: f.json ?? json(f.id) })) }, T0, limite) as Promise<RaspunsScrieFreze>;
const sterge = (uid: string, freze: { id: string; vazuta: number }[], limite?: LimiteFreze) =>
  trateazaFrezele(db, uid, { actiune: 'sterge', freze }, T0, limite) as Promise<RaspunsScrieFreze>;
const documente = async (uid: string) => (await db.collection(`conturi/${uid}/freze`).get()).docs.length;

test('fără om, fără cont deschis, cerere greșită: refuzat, fără nicio scriere', async () => {
  assert.equal(await cod(trateazaFrezele(db, null, { actiune: 'lista', dupa: 0 }, T0)), 'unauthenticated');
  assert.equal(await cod(trateazaFrezele(db, 'necunoscut', { actiune: 'lista', dupa: 0 }, T0)), 'failed-precondition');
  assert.equal(await cod(trateazaFrezele(db, 'necunoscut', { actiune: 'scrie', freze: [{ id: 'a', vazuta: 0, json: json('a') }] }, T0)), 'failed-precondition');
  const rele: unknown[] = [
    null, 'lista', { actiune: 'zboara' }, { actiune: 'lista' }, { actiune: 'lista', dupa: -1 }, { actiune: 'lista', dupa: 1.5 },
    { actiune: 'scrie', freze: [] },
    { actiune: 'scrie', freze: [{ id: 'a b', vazuta: 0, json: json('a b') }] },
    { actiune: 'scrie', freze: [{ id: 'a', vazuta: 0, json: json('b') }] },
    { actiune: 'scrie', freze: [{ id: 'a', vazuta: 0, json: '[1]' }] },
    { actiune: 'scrie', freze: [{ id: 'a', vazuta: 0, json: '{' }] },
    { actiune: 'scrie', freze: [{ id: 'a', vazuta: -1, json: json('a') }] },
    { actiune: 'scrie', freze: [{ id: 'a', vazuta: 0, json: json('a') }, { id: 'a', vazuta: 0, json: json('a') }] },
    { actiune: 'scrie', freze: Array.from({ length: LOT_FREZE + 1 }, (_, i) => ({ id: `f${i}`, vazuta: 0, json: json(`f${i}`) })) },
    { actiune: 'sterge', freze: [{ id: 'a' }] },
  ];
  for (const r of rele) assert.equal(await cod(trateazaFrezele(db, 'ana', r, T0)), 'invalid-argument', JSON.stringify(r)?.slice(0, 80));
  assert.equal(await documente('ana'), 0);
  assert.equal((await db.doc('conturi/ana/sincron/freze').get()).exists, false);
});

test('prima listă e goală și completă; două freze noi primesc versiunile 1 și 2; lista le dă de la versiunea știută', async () => {
  assert.deepEqual(await lista('ana', 0), { ok: true, freze: [], pana: 0, mai: false, complet: true, poateScrie: true, numar: 0 });
  const r = await scrie('ana', [{ id: 'a', vazuta: 0 }, { id: 'b', vazuta: 0, json: json('b', 'Plată Ø6 – ăîșț') }]);
  assert.deepEqual(r, { ok: true, numar: 2, rezultate: [{ id: 'a', stare: 'scrisa', versiune: 1 }, { id: 'b', stare: 'scrisa', versiune: 2 }] });
  const l = await lista('ana', 0);
  assert.deepEqual(l.freze, [{ id: 'a', versiune: 1, json: json('a') }, { id: 'b', versiune: 2, json: json('b', 'Plată Ø6 – ăîșț') }]);
  assert.equal(l.pana, 2);
  assert.equal(l.numar, 2);
  assert.deepEqual(await lista('ana', 2), { ok: true, freze: [], pana: 2, mai: false, complet: false, poateScrie: true, numar: 2 });
  assert.deepEqual((await lista('ana', 1)).freze.map((f) => f.id), ['b']);
  // Alt cont nu le vede.
  assert.deepEqual((await lista('bob', 0)).freze, []);
});

test('versiunea văzută: alta decât cea din cont dă conflict, cu ce e în cont, fără scriere; cea bună scrie versiunea următoare', async () => {
  await scrie('ana', [{ id: 'a', vazuta: 0 }]);
  // Al doilea calculator, care n-a văzut-o, o scrie ca nouă: conflict.
  const c = await scrie('ana', [{ id: 'a', vazuta: 0, json: json('a', 'alt nume') }]);
  assert.deepEqual(c.rezultate, [{ id: 'a', stare: 'conflict', versiune: 1, json: json('a') }]);
  // Cu versiunea văzută, scrie; celelalte calculatoare află de la versiunea lor.
  const s = await scrie('ana', [{ id: 'a', vazuta: 1, json: json('a', 'alt nume') }, { id: 'n', vazuta: 0 }]);
  assert.deepEqual(s.rezultate, [{ id: 'a', stare: 'scrisa', versiune: 2 }, { id: 'n', stare: 'scrisa', versiune: 3 }]);
  assert.deepEqual((await lista('ana', 1)).freze, [{ id: 'a', versiune: 2, json: json('a', 'alt nume') }, { id: 'n', versiune: 3, json: json('n') }]);
  // O versiune văzută dintr-un viitor pe care contul nu-l are: tot conflict.
  assert.deepEqual((await scrie('ana', [{ id: 'a', vazuta: 9 }])).rezultate, [{ id: 'a', stare: 'conflict', versiune: 2, json: json('a', 'alt nume') }]);
  // Una necunoscută contului, trimisă ca văzută: conflict cu „n-a fost niciodată” (versiunea 0, fără JSON).
  assert.deepEqual((await scrie('ana', [{ id: 'x', vazuta: 4 }])).rezultate, [{ id: 'x', stare: 'conflict', versiune: 0, json: null }]);
  assert.equal((await lista('ana', 0)).numar, 2);
});

test('ștergerea cere versiunea văzută, lasă un semn pe care celălalt calculator îl află, iar freza se poate scrie din nou peste el', async () => {
  await scrie('ana', [{ id: 'a', vazuta: 0 }, { id: 'b', vazuta: 0 }]);
  assert.deepEqual((await sterge('ana', [{ id: 'a', vazuta: 0 }])).rezultate, [{ id: 'a', stare: 'conflict', versiune: 1, json: json('a') }]);
  const s = await sterge('ana', [{ id: 'a', vazuta: 1 }]);
  assert.deepEqual(s, { ok: true, numar: 1, rezultate: [{ id: 'a', stare: 'scrisa', versiune: 3 }] });
  assert.deepEqual((await lista('ana', 2)).freze, [{ id: 'a', versiune: 3, json: null }]);
  // A doua ștergere, cu semnul văzut, nu schimbă nimic; una a unei freze pe care contul n-a avut-o niciodată, la fel.
  assert.deepEqual((await sterge('ana', [{ id: 'a', vazuta: 3 }, { id: 'z', vazuta: 0 }])).rezultate, [
    { id: 'a', stare: 'scrisa', versiune: 3 }, { id: 'z', stare: 'scrisa', versiune: 0 },
  ]);
  assert.equal((await lista('ana', 3)).freze.length, 0);
  // Scrisă cu semnul văzut, freza revine.
  assert.deepEqual((await scrie('ana', [{ id: 'a', vazuta: 3, json: json('a', 'înapoi') }])).rezultate, [{ id: 'a', stare: 'scrisa', versiune: 4 }]);
  const l = await lista('ana', 0);
  assert.deepEqual(l.freze, [{ id: 'b', versiune: 2, json: json('b') }, { id: 'a', versiune: 4, json: json('a', 'înapoi') }]);
  assert.equal(l.numar, 2);
});

test('octeții unei freze: 8 KB (UTF-8) trec, un octet în plus e refuzat', async () => {
  const cu = (n: number): string => {
    const baza = json('g', '', { nota: '' });
    const lipsa = n - new TextEncoder().encode(baza).length;
    // Două octeți pe „ă”, ca plafonul să fie judecat pe UTF-8, nu pe caractere.
    return json('g', '', { nota: 'ă'.repeat(Math.floor(lipsa / 2)) + 'x'.repeat(lipsa % 2) });
  };
  assert.equal(new TextEncoder().encode(cu(OCTETI_FREZA)).length, OCTETI_FREZA);
  assert.deepEqual((await scrie('ana', [{ id: 'g', vazuta: 0, json: cu(OCTETI_FREZA) }])).rezultate, [{ id: 'g', stare: 'scrisa', versiune: 1 }]);
  assert.equal(await cod(scrie('ana', [{ id: 'g', vazuta: 1, json: cu(OCTETI_FREZA + 1) }])), 'invalid-argument');
  assert.equal((await lista('ana', 0)).freze[0]?.json, cu(OCTETI_FREZA));
});

test(`plafonul de ${FREZE_IN_CONT} de freze vii: a ${FREZE_IN_CONT + 1}-a e refuzată, iar schimbările și ștergerile merg`, async () => {
  for (let k = 0; k < FREZE_IN_CONT / LOT_FREZE; k++) {
    const r = await scrie('ana', Array.from({ length: LOT_FREZE }, (_, i) => ({ id: `f${k * LOT_FREZE + i}`, vazuta: 0 })));
    assert.ok(r.rezultate.every((x) => x.stare === 'scrisa'));
  }
  assert.equal((await lista('ana', 0)).numar, FREZE_IN_CONT);
  const plina = await scrie('ana', [{ id: 'f0', vazuta: 1, json: json('f0', 'schimbată') }, { id: 'noua', vazuta: 0 }]);
  assert.deepEqual(plina.rezultate, [{ id: 'f0', stare: 'scrisa', versiune: FREZE_IN_CONT + 1 }, { id: 'noua', stare: 'plina' }]);
  assert.equal(plina.numar, FREZE_IN_CONT);
  await sterge('ana', [{ id: 'f1', vazuta: 2 }]);
  assert.deepEqual((await scrie('ana', [{ id: 'noua', vazuta: 0 }])).rezultate, [{ id: 'noua', stare: 'scrisa', versiune: FREZE_IN_CONT + 3 }]);
  // Freza ștearsă, scrisă din nou peste semnul ei, cu contul plin: refuzată.
  assert.deepEqual((await scrie('ana', [{ id: 'f1', vazuta: FREZE_IN_CONT + 2 }])).rezultate, [{ id: 'f1', stare: 'plina' }]);
});

test('paginile listei: în ordinea versiunilor, cu `mai` și `pana`, până la versiunea contului', async () => {
  const limite: LimiteFreze = { freze: 50, pagina: 4, sterse: 20 };
  await scrie('ana', Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, vazuta: 0 })), limite);
  const vazute: string[] = [];
  let dupa = 0;
  for (const asteptat of [{ n: 4, mai: true, pana: 4 }, { n: 4, mai: true, pana: 8 }, { n: 2, mai: false, pana: 10 }]) {
    const l = await lista('ana', dupa, limite);
    assert.equal(l.freze.length, asteptat.n);
    assert.equal(l.mai, asteptat.mai);
    assert.equal(l.pana, asteptat.pana);
    vazute.push(...l.freze.map((f) => f.id));
    dupa = l.pana;
  }
  assert.deepEqual(vazute, Array.from({ length: 10 }, (_, i) => `p${i}`));
});

test('semnele ștergerii peste plafon: cele mai vechi pleacă; un calculator rămas în urma lor primește lista întreagă', async () => {
  const limite: LimiteFreze = { freze: 50, pagina: 100, sterse: 3 };
  await scrie('ana', Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, vazuta: 0 })), limite);
  // Calculatorul B a văzut tot (versiunea 8).
  await sterge('ana', [1, 2, 3, 4].map((i) => ({ id: `s${i}`, vazuta: i + 1 })), limite);
  // 4 semne (9–12): peste plafon cu cel mult un lot, până la ștergerea următoare.
  assert.equal((await db.collection('conturi/ana/freze').where('stearsaLa', '>', 0).get()).size, 4);
  await sterge('ana', [{ id: 's5', vazuta: 6 }], limite);
  // Semnul nou (13) rămâne, iar cele mai vechi pleacă până la plafon: s1 și s2 (9, 10).
  const semne = (await db.collection('conturi/ana/freze').where('stearsaLa', '>', 0).get()).docs.map((d) => d.id).sort();
  assert.deepEqual(semne, ['s3', 's4', 's5']);
  // B, la versiunea 8 (înaintea semnelor plecate): lista întreagă, de la 0, marcată completă; fără s1 și s2.
  const b = await lista('ana', 8, limite);
  assert.equal(b.complet, true);
  assert.deepEqual(b.freze.map((f) => [f.id, f.json === null]), [
    ['s0', false], ['s6', false], ['s7', false], ['s3', true], ['s4', true], ['s5', true],
  ]);
  assert.equal(b.numar, 3);
  // Un calculator la zi cu semnele rămase (versiunea 10, după ultimul plecat): doar schimbările de după.
  const c = await lista('ana', 10, limite);
  assert.equal(c.complet, false);
  assert.deepEqual(c.freze.map((f) => f.id), ['s3', 's4', 's5']);
  // O versiune pe care contul n-a dat-o încă (alt cont, o bază ștearsă): tot lista întreagă.
  assert.equal((await lista('ana', 99, limite)).complet, true);
});

test('fără capabilitatea `cloud` (proba trecută, contul dezactivat): lista merge, scrierea și ștergerea nu; gratuitul și personalul scriu', async () => {
  await db.doc('conturi/exp/freze/a').set({ versiune: 1, json: json('a') });
  await db.doc('conturi/exp/sincron/freze').set({ versiune: 1, numar: 1, sterse: 0, purjatPana: 0 });
  const l = await lista('exp', 0);
  assert.equal(l.poateScrie, false);
  assert.deepEqual(l.freze, [{ id: 'a', versiune: 1, json: json('a') }]);
  for (const uid of ['exp', 'dez']) {
    assert.equal(await cod(scrie(uid, [{ id: 'b', vazuta: 0 }])), 'permission-denied');
    assert.equal(await cod(sterge(uid, [{ id: 'a', vazuta: 1 }])), 'permission-denied');
    assert.equal((await lista(uid, 0)).poateScrie, false);
  }
  assert.equal(await documente('exp'), 1);
  assert.equal(await documente('dez'), 0);
  for (const uid of ['bob', 'own']) {
    assert.equal((await lista(uid, 0)).poateScrie, true);
    assert.deepEqual((await scrie(uid, [{ id: 'b', vazuta: 0 }])).rezultate, [{ id: 'b', stare: 'scrisa', versiune: 1 }]);
  }
});
