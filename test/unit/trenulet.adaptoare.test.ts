/**
 * Adaptoarele Planificatorului Trenuleț în cadrul extensiei (ADR 0129 §C), fără browser, peste o gazdă în memorie:
 * - `window.claude.use('db')`: documentele peste `host.stocare`, cu cheile `db:<colecție>/<id>` (scrierea ca JSON, citirea,
 *   ștergerea, id-urile noi), lista ordonată și reanunțată la scriere și la ștergere, doar cea mai nouă citire, nimic după
 *   dezabonare (nici citirea pornită înainte de ea); stocarea plină, cu codul `quota_exceeded` al paginii;
 * - `use('downloads')`: `save` cere `descarcari.salveaza`, cu numele și datele așa cum vin; o capabilitate necunoscută;
 * - `localStorage`: doar cheile `ls:`, citite la pornire; scrise și șterse pe loc; o scriere refuzată, raportată;
 * - „Trimite la cvs2” (ADR 0160 §D): `window.open` la `#primeste-lucrare` dă o fereastră imitată, care răspunde „gata” la
 *   „cauta”, trimite lucrarea prin `masina.trimite` și dă înapoi „primit”, ca mesaj de la ea, de la originea cerută;
 * - gazda (ADR 0161 §A): `window.cvs2`, înghețată, cu senderul doar când e deschis extensiei;
 * - pluginul ca parte din cvs2 (ADR 0164): tema lui cvs2 pe rădăcina paginii (`data-gazda`, `data-theme`), schimbată pe loc;
 *   contul văzut prin `window.cvs2.cont()`, anunțat la schimbare; lucrul nesalvat: salvările amânate ale paginii și scrierile
 *   în zbor (și cele refuzate, până reușesc) o țin „nesalvată”, iar la închidere salvările amânate pornesc pe loc și se
 *   așteaptă, chiar înlănțuite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ContCvs2, ContextHost, HostApi } from '../../extensii/api.ts';
import { claudePeste, deschiderePeste, gazdaPeste, localStoragePeste, lucruPeste, temaPeste } from '../../extensii/trenulet/intrare.ts';

type Ref = { readonly id: string; set(d: unknown): Promise<void>; get(): Promise<{ exists: boolean; data(): unknown }>; delete(): Promise<void> };
type Instantaneu = { readonly docs: { readonly id: string; data(): unknown }[] };
type Db = {
  doc(cale: string): Ref;
  collection(c: string): { doc(id?: string): Ref; orderBy(camp: string, dir?: 'asc' | 'desc'): { onSnapshot(cb: (s: Instantaneu) => void): () => void } };
};
type Claude = { use(c: string): Promise<unknown> };

const pauza = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });
const cod = (c: string) => (e: unknown): boolean => (e as { code?: unknown }).code === c;

/**
 * O gazdă în memorie: stocarea (cu plinul la cerere și întârzieri pentru `chei()`), cererile primite, erorile raportate;
 * contextul (tema, contul), schimbat cu `schimba`; lucrul nesalvat anunțat și închiderea, cerută cu `inchidere()` (ADR 0164).
 */
function gazda(initial: Record<string, unknown> = {}) {
  const ascultatori = new Set<(c: ContextHost) => void>(), laInchidere = new Set<() => unknown>();
  const g = {
    date: new Map<string, unknown>(Object.entries(initial)),
    cereri: [] as { serviciu: string; argumente: unknown[] }[],
    raportate: [] as unknown[],
    intarzieriChei: [] as number[],
    plin: false,
    refuz: null as string | null,
    context: { limba: 'ro', tema: {} } as ContextHost,
    nesalvat: [] as boolean[],
    schimba(c: Partial<ContextHost>): void {
      g.context = { ...g.context, ...c };
      for (const f of [...ascultatori]) f(g.context);
    },
    async inchidere(): Promise<void> { await Promise.allSettled([...laInchidere].map(async (f) => f())); },
    laInchidere,
  };
  const host: HostApi = {
    api: 1,
    get limba() { return g.context.limba; },
    get tema() { return g.context.tema; },
    get cont() { return g.context.cont ?? null; },
    laSchimbare: (f) => { ascultatori.add(f); return () => { ascultatori.delete(f); }; },
    fisier: () => null,
    raporteaza: (e) => { g.raportate.push(e); },
    inchide: () => {},
    nesalvat: (da) => { g.nesalvat.push(da); },
    laInchidere: (f) => { laInchidere.add(f); return () => { laInchidere.delete(f); }; },
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
    // Adaptoarele cer serviciile prin `host.cere`; învelișurile nu sunt folosite aici.
    descarcari: { salveaza: async () => { throw new Error('nefolosit'); } },
    masina: {
      stare: async () => { throw new Error('nefolosit'); }, laStare: () => () => {}, incarca: async () => { throw new Error('nefolosit'); },
      porneste: async () => null, reia: async () => null, pauza: async () => null, opreste: async () => null, trimite: async () => null,
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
  // O citire pornită înainte de dezabonare nu mai ajunge la pagină după ea.
  const tarzii: string[][] = [];
  g.intarzieriChei.push(30);
  db.collection('circuite').orderBy('actualizat').onSnapshot((s) => { tarzii.push(s.docs.map((d) => d.id)); })();
  await pauza(50);
  assert.deepEqual(tarzii, []);
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
  const { g, host } = gazda({ 'ls:trenulet.mod': '3d', 'db:setari/cnc': { a: 1 }, 'db:note/a': 'un document text', 'ls:numar': 5 });
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

test('„Trimite la cvs2”: o fereastră imitată pentru #primeste-lucrare; „gata” la „cauta”, lucrarea prin masina.trimite, „primit” înapoi', async () => {
  const { g, host } = gazda();
  const primit = { protocol: 'cvs2-lucrare', versiune: 1, tip: 'primit', id: 'l1', acceptate: ['a.nc'], refuzate: [] };
  let refuz: string | null = null;
  const h: HostApi = {
    ...host,
    cere: async (serviciu, ...argumente) => {
      g.cereri.push({ serviciu, argumente });
      if (refuz !== null) throw new Error(refuz);
      return primit;
    },
  };
  const w = new EventTarget() as EventTarget & { open: (url?: string, nume?: string) => unknown };
  deschiderePeste(h, w as unknown as Window);
  // Altă adresă: ca o filă refuzată de browser.
  assert.equal(w.open('https://cvs2.test/'), null);
  type Imitata = { postMessage(m: unknown, origine: string): void; readonly closed: boolean };
  const f = w.open('https://cvs2.test/app/?x=1#primeste-lucrare', 'cvs2') as Imitata;
  assert.equal(f.closed, false);
  const mesaje: [unknown, string, boolean][] = [];
  w.addEventListener('message', (e) => { const m = e as MessageEvent; mesaje.push([m.data, m.origin, m.source === (f as unknown)]); });

  f.postMessage({ protocol: 'cvs2-lucrare', versiune: 1, tip: 'cauta' }, 'https://cvs2.test');
  f.postMessage({ protocol: 'alt', tip: 'cauta' }, 'https://cvs2.test');
  await pauza(5);
  assert.deepEqual(mesaje, [[{ protocol: 'cvs2-lucrare', versiune: 1, tip: 'gata', aplicatie: 'CNC Vector Studio 2' }, 'https://cvs2.test', true]]);
  assert.deepEqual(g.cereri, []);

  const lucrare = { protocol: 'cvs2-lucrare', versiune: 1, tip: 'lucrare', id: 'l1', fisiere: [] };
  f.postMessage(lucrare, 'https://cvs2.test');
  await pauza(5);
  assert.deepEqual(g.cereri, [{ serviciu: 'masina.trimite', argumente: [lucrare] }]);
  assert.deepEqual(mesaje[1], [primit, 'https://cvs2.test', true]);
  assert.equal(f.closed, false);

  // Un refuz (lucrarea fără forma protocolului): fereastra imitată „se închide”, iar refuzul ajunge în jurnal.
  refuz = 'masina:lucrare';
  f.postMessage(lucrare, 'https://cvs2.test');
  await pauza(5);
  assert.equal(f.closed, true);
  assert.equal(mesaje.length, 2);
  assert.match(String((g.raportate[0] as Error).message), /masina:lucrare/);
});

test('gazda: window.cvs2 spune paginii că e în cvs2, înghețată; senderul doar când e deschis extensiei', () => {
  const { host } = gazda();
  const w = {} as Window & { cvs2?: { readonly gazda: string; readonly masina: unknown } };
  gazdaPeste(host, true, w);
  assert.deepEqual([w.cvs2?.gazda, w.cvs2?.masina === host.masina, Object.isFrozen(w.cvs2)], ['cvs2', true, true]);
  assert.throws(() => { (w as unknown as { cvs2: unknown }).cvs2 = null; });
  const fara = {} as typeof w;
  gazdaPeste(host, false, fara);
  assert.deepEqual([fara.cvs2?.gazda, fara.cvs2?.masina], ['cvs2', null]);
});

test('gazda: window.cvs2.three() cere three.js din pachet o singură dată (ADR 0163); fără fișier, null', async () => {
  const { host } = gazda();
  const cerute: string[] = [];
  const h: HostApi = { ...host, fisier: (c) => { cerute.push(c); return null; } };
  const w = {} as Window & { cvs2?: { readonly three: () => Promise<unknown> } };
  gazdaPeste(h, false, w);
  assert.equal(typeof w.cvs2?.three, 'function');
  assert.deepEqual([await w.cvs2?.three(), await w.cvs2?.three()], [null, null]);
  assert.deepEqual(cerute, ['js/three.js']);
});

test('lucrul (ADR 0164): o salvare amânată ține pagina „nesalvată” până se termină; alta sub aceeași cheie o înlocuiește', async () => {
  const { g, host } = gazda();
  const l = lucruPeste(host);
  const rulate: string[] = [];
  l.amana('circuit', () => { rulate.push('întâi'); }, 20);
  l.amana('circuit', async () => { await pauza(10); rulate.push('a doua'); }, 20);
  assert.deepEqual(g.nesalvat, [true]);
  await pauza(15);
  assert.deepEqual([rulate, g.nesalvat], [[], [true]]);
  await pauza(60);
  assert.deepEqual([rulate, g.nesalvat], [['a doua'], [true, false]]);
});

test('lucrul: la închidere, salvările amânate pornesc pe loc; se așteaptă scrierile lor, și cele înlănțuite după ele', async () => {
  const { g, host } = gazda();
  const l = lucruPeste(host);
  let lant: Promise<unknown> = Promise.resolve();
  // ca salvarea circuitelor: o scriere pleacă abia după cea dinainte, într-un lanț de promisiuni
  const salveaza = (v: number): Promise<unknown> => (lant = lant.then(() => l.urmareste('db:circuite/a', () => host.stocare.scrie('db:circuite/a', v))));
  void salveaza(1);
  l.amana('circuit', () => salveaza(2), 60_000);
  l.amana('setari', async () => { await pauza(5); await l.urmareste('db:setari/cnc', () => host.stocare.scrie('db:setari/cnc', { a: 1 })); }, 60_000);
  // o scriere pornită dintr-o salvare amânată, fără să i se întoarcă promisiunea, abia după un temporizator
  l.amana('atelier', () => { setTimeout(() => { void l.urmareste('db:atelier/curent', () => host.stocare.scrie('db:atelier/curent', 3)); }, 0); }, 60_000);
  assert.equal(g.laInchidere.size, 1);
  await g.inchidere();
  assert.deepEqual([g.date.get('db:circuite/a'), g.date.get('db:setari/cnc'), g.date.get('db:atelier/curent'), g.nesalvat.at(-1)], [2, { a: 1 }, 3, false]);
});

test('lucrul: două scrieri înlănțuite nu lasă o clipă de „salvat” între ele', async () => {
  const { g, host } = gazda();
  const l = lucruPeste(host);
  await l.urmareste('db:a', () => host.stocare.scrie('db:a', 1)).then(() => l.urmareste('db:b', () => host.stocare.scrie('db:b', 2)));
  await pauza(5);
  assert.deepEqual([g.nesalvat, g.date.get('db:b')], [[true, false], 2]);
});

test('lucrul: o scriere refuzată ține pagina „nesalvată” până reușește una la aceeași cheie; închiderea n-o ascunde', async () => {
  const { g, host } = gazda();
  const l = lucruPeste(host);
  g.plin = true;
  await assert.rejects(l.urmareste('db:circuite/a', () => host.stocare.scrie('db:circuite/a', 1)), /stocare:plin/);
  await pauza(5);
  assert.equal(g.nesalvat.at(-1), true);
  await g.inchidere();
  assert.equal(g.nesalvat.at(-1), true);
  g.plin = false;
  await l.urmareste('db:circuite/b', () => host.stocare.scrie('db:circuite/b', 1));
  await pauza(5);
  assert.equal(g.nesalvat.at(-1), true);
  await l.urmareste('db:circuite/a', () => host.stocare.scrie('db:circuite/a', 2));
  await pauza(5);
  assert.equal(g.nesalvat.at(-1), false);
});

test('lucrul: scrierile adaptoarelor, documentele (db) și localStorage, sunt urmărite', async () => {
  const { g, host } = gazda();
  const l = lucruPeste(host);
  claudePeste(host, l);
  const db = await (globalThis as unknown as { claude: Claude }).claude.use('db') as Db;
  const p = db.doc('circuite/a').set({ nume: 'x' });
  assert.deepEqual(g.nesalvat, [true]);
  await p;
  await pauza(5);
  assert.deepEqual(g.nesalvat, [true, false]);
  await localStoragePeste(host, l);
  (globalThis as unknown as { localStorage: Storage }).localStorage.setItem('k', 'v');
  assert.deepEqual(g.nesalvat, [true, false, true]);
  await pauza(5);
  assert.deepEqual([g.nesalvat, g.date.get('ls:k')], [[true, false, true, false], 'v']);
});

test('lucrul: o gazdă dinainte de 3.Xd, fără nesalvat și laInchidere: salvările amânate merg ca temporizatoare', async () => {
  const { host } = gazda();
  const vechi = { ...host, nesalvat: undefined, laInchidere: undefined } as unknown as HostApi;
  const l = lucruPeste(vechi);
  let rulat = 0;
  l.amana('circuit', () => { rulat++; }, 5);
  await pauza(30);
  assert.equal(rulat, 1);
});

test('tema (ADR 0164): data-gazda și data-theme după tema lui cvs2, schimbate pe loc; fără color-scheme, pagina își ține tema', () => {
  const { g, host } = gazda();
  const rad = { dataset: {} as DOMStringMap };
  g.schimba({ tema: { '--t': '#1d232b', 'color-scheme': 'light' } });
  temaPeste(host, rad);
  assert.deepEqual({ ...rad.dataset }, { gazda: 'cvs2', theme: 'light' });
  g.schimba({ tema: { '--t': '#e8e4dc', 'color-scheme': 'dark' } });
  assert.deepEqual({ ...rad.dataset }, { gazda: 'cvs2', theme: 'dark' });
  const vechi = gazda();
  const rad2 = { dataset: {} as DOMStringMap };
  vechi.g.schimba({ tema: { '--t': '#1d232b' } });
  temaPeste(vechi.host, rad2);
  assert.deepEqual({ ...rad2.dataset }, {});
});

test('gazda: window.cvs2.cont() e contul de acum (null fără permisiune), anunțat la schimbare; amana e a lucrului', async () => {
  const { g, host } = gazda();
  type Cvs2 = { cont(): ContCvs2 | null; laSchimbare(f: () => void): () => void; amana(c: string, f: () => unknown, ms: number): void };
  const w = {} as Window & { cvs2?: Cvs2 };
  gazdaPeste(host, false, w, lucruPeste(host));
  assert.equal(w.cvs2?.cont(), null);
  let anuntat = 0;
  const gata = w.cvs2!.laSchimbare(() => { anuntat++; });
  g.schimba({ cont: { conectat: true, nume: 'Andrei', plan: 'personal' } });
  assert.deepEqual([anuntat, w.cvs2?.cont()], [1, { conectat: true, nume: 'Andrei', plan: 'personal' }]);
  gata();
  g.schimba({ cont: { conectat: false } });
  assert.deepEqual([anuntat, w.cvs2?.cont()], [1, { conectat: false }]);
  w.cvs2!.amana('x', () => {}, 60_000);
  assert.deepEqual(g.nesalvat, [true]);
  await g.inchidere();
  assert.deepEqual(g.nesalvat, [true, false]);
});
