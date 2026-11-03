/**
 * Adaptoarele Planificatorului Trenuleț în cadrul extensiei (ADR 0129 §C), fără browser, peste o gazdă în memorie:
 * - `window.claude.use('db')`: documentele peste `host.stocare`, cu cheile `db:<colecție>/<id>` (scrierea ca JSON, citirea,
 *   ștergerea, id-urile noi), lista ordonată și reanunțată la scriere și la ștergere, doar cea mai nouă citire, nimic după
 *   dezabonare; stocarea plină, cu codul `quota_exceeded` al paginii;
 * - `use('downloads')`: `save` cere `descarcari.salveaza`, cu numele și datele așa cum vin; o capabilitate necunoscută;
 * - `localStorage`: doar cheile `ls:`, citite la pornire; scrise și șterse pe loc; o scriere refuzată, raportată.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HostApi } from '../../extensii/api.ts';
import { claudePeste, localStoragePeste } from '../../extensii/trenulet/intrare.ts';

type Ref = { readonly id: string; set(d: unknown): Promise<void>; get(): Promise<{ exists: boolean; data(): unknown }>; delete(): Promise<void> };
type Instantaneu = { readonly docs: { readonly id: string; data(): unknown }[] };
type Db = {
  doc(cale: string): Ref;
  collection(c: string): { doc(id?: string): Ref; orderBy(camp: string, dir?: 'asc' | 'desc'): { onSnapshot(cb: (s: Instantaneu) => void): () => void } };
};
type Claude = { use(c: string): Promise<unknown> };

const pauza = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });
const cod = (c: string) => (e: unknown): boolean => (e as { code?: unknown }).code === c;

/** O gazdă în memorie: stocarea (cu plinul la cerere și întârzieri pentru `chei()`), cererile primite, erorile raportate. */
function gazda(initial: Record<string, unknown> = {}) {
  const g = {
    date: new Map<string, unknown>(Object.entries(initial)),
    cereri: [] as { serviciu: string; argumente: unknown[] }[],
    raportate: [] as unknown[],
    intarzieriChei: [] as number[],
    plin: false,
    refuz: null as string | null,
  };
  const host: HostApi = {
    api: 1,
    limba: 'ro',
    tema: {},
    laSchimbare: () => () => {},
    fisier: () => null,
    raporteaza: (e) => { g.raportate.push(e); },
    inchide: () => {},
    cere: async (serviciu, ...argumente) => {
      g.cereri.push({ serviciu, argumente });
      if (g.refuz !== null) throw new Error(g.refuz);
      return argumente[0];
    },
    stocare: {
      citeste: async (k) => (g.date.has(k) ? g.date.get(k) : null),
      scrie: async (k, v) => { if (g.plin) throw new Error('stocare:plin'); g.date.set(k, v); return null; },
      sterge: async (k) => { g.date.delete(k); return null; },
      chei: async () => { const k = [...g.date.keys()]; await pauza(g.intarzieriChei.shift() ?? 0); return k; },
    },
  };
  return { g, host };
}

Object.assign(globalThis, { window: globalThis });
const claude = (host: HostApi): Claude => { claudePeste(host); return (globalThis as unknown as { claude: Claude }).claude; };

test('db: documentele peste host.stocare, cu cheile db:<colecție>/<id>; plinul are codul paginii', async () => {
  const { g, host } = gazda();
  const db = await claude(host).use('db') as Db;
  const r = db.doc('setari/cnc');
  const lipsa = await r.get();
  assert.deepEqual([lipsa.exists, lipsa.data()], [false, null]);
  await r.set({ a: 1, b: undefined, c: [1, 2], d: new Date(Date.UTC(2026, 10, 3)) });
  assert.deepEqual(g.date.get('db:setari/cnc'), { a: 1, c: [1, 2], d: '2026-11-03T00:00:00.000Z' });
  const citit = await r.get();
  assert.deepEqual([citit.exists, citit.data()], [true, { a: 1, c: [1, 2], d: '2026-11-03T00:00:00.000Z' }]);
  await r.delete();
  assert.equal(g.date.has('db:setari/cnc'), false);
  const a = db.collection('circuite').doc(), b = db.collection('circuite').doc();
  assert.ok(a.id.length > 0 && a.id !== b.id, `${a.id} ${b.id}`);
  assert.equal(db.collection('circuite').doc('x').id, 'x');
  g.plin = true;
  await assert.rejects(db.doc('circuite/x').set({}), cod('quota_exceeded'));
  await assert.rejects(claude(host).use('altceva'), cod('unavailable'));
});

test('db: lista ordonată, reanunțată la scriere și la ștergere, doar cea mai nouă citire, nimic după dezabonare', async () => {
  const { g, host } = gazda({
    'db:circuite/a': { nume: 'A', actualizat: '2026-11-01' },
    'db:circuite/b': { nume: 'B', actualizat: '2026-11-03' },
    'db:altele/x': { actualizat: '2026-12-01' },
    'ls:circuite/y': 'nu e document',
  });
  const db = await claude(host).use('db') as Db;
  const liste: string[][] = [];
  // Citirea de la abonare întârzie: scrierea de după ea o întrece, deci ea nu mai ajunge la pagină.
  g.intarzieriChei.push(40);
  const opreste = db.collection('circuite').orderBy('actualizat', 'desc').onSnapshot((s) => { liste.push(s.docs.map((d) => d.id)); });
  await db.doc('circuite/c').set({ nume: 'C', actualizat: '2026-11-02' });
  await pauza(80);
  assert.deepEqual(liste, [['b', 'c', 'a']]);
  await db.doc('circuite/b').delete();
  await pauza(20);
  assert.deepEqual(liste, [['b', 'c', 'a'], ['c', 'a']]);
  const cresc: string[][] = [];
  const opresteCresc = db.collection('circuite').orderBy('actualizat').onSnapshot((s) => { cresc.push(s.docs.map((d) => d.id)); });
  await pauza(20);
  assert.deepEqual(cresc, [['a', 'c']]);
  opreste();
  opresteCresc();
  await db.doc('circuite/d').set({ actualizat: '2026-11-05' });
  await pauza(20);
  assert.deepEqual([liste.length, cresc.length], [2, 1]);
});

test('downloads: save cere descarcari.salveaza cu numele și datele; refuzul, cu codul lui', async () => {
  const { g, host } = gazda();
  const dl = await claude(host).use('downloads') as { save(o: { filename: string; data: unknown }): Promise<void> };
  const blob = new Blob(['PK']);
  await dl.save({ filename: 'a.zip', data: blob });
  await dl.save({ filename: 'c.json', data: '{}' });
  assert.deepEqual(g.cereri, [
    { serviciu: 'descarcari.salveaza', argumente: ['a.zip', blob] },
    { serviciu: 'descarcari.salveaza', argumente: ['c.json', '{}'] },
  ]);
  g.refuz = 'descarcari:nume';
  await assert.rejects(dl.save({ filename: 'a.exe', data: '' }), cod('descarcari:nume'));
});

test('localStorage: doar cheile ls:, citite la pornire; scrise și șterse pe loc; o scriere refuzată, raportată', async () => {
  const { g, host } = gazda({ 'ls:trenulet.mod': '3d', 'db:setari/cnc': { a: 1 }, 'ls:numar': 5 });
  await localStoragePeste(host);
  const ls = (globalThis as unknown as { localStorage: Storage }).localStorage;
  assert.deepEqual([ls.length, ls.key(0), ls.key(1), ls.getItem('trenulet.mod'), ls.getItem('lipsa')], [1, 'trenulet.mod', null, '3d', null]);
  ls.setItem('atelier', 12 as unknown as string);
  assert.equal(ls.getItem('atelier'), '12');
  await pauza(0);
  assert.equal(g.date.get('ls:atelier'), '12');
  ls.removeItem('trenulet.mod');
  await pauza(0);
  assert.equal(g.date.has('ls:trenulet.mod'), false);
  ls.clear();
  await pauza(0);
  assert.deepEqual([ls.length, [...g.date.keys()].filter((k) => k.startsWith('ls:'))], [0, ['ls:numar']]);
  assert.equal(g.raportate.length, 0);
  g.plin = true;
  ls.setItem('x', 'y');
  await pauza(0);
  assert.equal(ls.getItem('x'), 'y');
  assert.equal(g.raportate.length, 1);
});
