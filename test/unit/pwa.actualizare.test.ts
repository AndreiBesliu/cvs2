/**
 * Înregistrarea workerului și actualizarea OFERITĂ (ADR 0045 §5, §7), cu un container de service worker fals: un worker
 * nou așteaptă, aplicația primește o ofertă, iar abia clicul trimite `SKIP_WAITING` și reîncarcă o singură dată, la
 * `controllerchange`. Fără clic, nimic nu se reîncarcă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actualizarePermisa, inregistreaza, type DepsInregistrare } from '../../src/pwa/inregistrare.ts';
import { esteSkipWaiting, MESAJ_SKIP_WAITING } from '../../src/pwa/protocol.ts';

class WorkerFals extends EventTarget {
  readonly mesaje: unknown[] = [];
  state: ServiceWorkerState;
  constructor(state: ServiceWorkerState) {
    super();
    this.state = state;
  }
  postMessage(m: unknown): void { this.mesaje.push(m); }
  treci(s: ServiceWorkerState): void {
    this.state = s;
    this.dispatchEvent(new Event('statechange'));
  }
}

class InregistrareFalsa extends EventTarget {
  active: WorkerFals | null = null;
  waiting: WorkerFals | null = null;
  installing: WorkerFals | null = null;
  /** Un worker nou începe instalarea (`updatefound`). */
  gasit(w: WorkerFals): void {
    this.installing = w;
    this.dispatchEvent(new Event('updatefound'));
  }
  /** Workerul nou a terminat instalarea: așteaptă, dacă există unul activ (altfel se activează singur). */
  instalat(w: WorkerFals): void {
    this.installing = null;
    if (this.active) this.waiting = w;
    w.treci('installed');
  }
}

class ContainerFals extends EventTarget {
  controller: WorkerFals | null = null;
  readonly cereri: Array<[string, RegistrationOptions | undefined]> = [];
  private readonly raspuns: () => Promise<InregistrareFalsa | undefined>;
  constructor(raspuns: () => Promise<InregistrareFalsa | undefined>) {
    super();
    this.raspuns = raspuns;
  }
  register(url: string, optiuni?: RegistrationOptions): Promise<InregistrareFalsa | undefined> {
    this.cereri.push([url, optiuni]);
    return this.raspuns();
  }
}

interface Banc {
  readonly sw: ContainerFals;
  readonly reg: InregistrareFalsa;
  readonly oferte: Array<(() => void) | null>;
  readonly defecte: unknown[];
  readonly locale: unknown[];
  reincarcari: number;
  permisa: boolean;
  readonly gata: Promise<void>;
}

function banc(pregateste: (reg: InregistrareFalsa, sw: ContainerFals) => void = () => undefined, raspuns?: () => Promise<InregistrareFalsa | undefined>): Banc {
  const reg = new InregistrareFalsa();
  const sw = new ContainerFals(raspuns ?? (async () => reg));
  pregateste(reg, sw);
  const b = { sw, reg, oferte: [], defecte: [], locale: [], reincarcari: 0, permisa: true } as unknown as Banc & { gata: Promise<void> };
  const deps: DepsInregistrare = {
    sw: sw as unknown as NonNullable<DepsInregistrare['sw']>,
    oferta: (f) => { b.oferte.push(f); },
    jurnal: {
      adauga: (tip, e) => { assert.equal(tip, 'promisiune'); b.defecte.push(e); },
      adaugaLocala: (tip, e) => { assert.equal(tip, 'promisiune'); b.locale.push(e); },
    },
    reincarca: () => { b.reincarcari++; },
    permisa: () => b.permisa,
  };
  (b as { gata: Promise<void> }).gata = inregistreaza(deps);
  return b;
}

const ultima = (b: Banc): (() => void) | null | undefined => b.oferte.at(-1);
const asteapta = (): Promise<void> => new Promise((ok) => { setImmediate(ok); });

test('înregistrează /sw.js pe tot site-ul, o singură dată', async () => {
  const b = banc();
  await b.gata;
  assert.deepEqual(b.sw.cereri, [['/sw.js', { scope: '/' }]]);
});

test('prima instalare (niciun worker activ) nu oferă nimic', async () => {
  const b = banc();
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.reg.instalat(w);
  w.treci('activating');
  w.treci('activated');
  assert.deepEqual(b.oferte, []);
  assert.equal(b.reincarcari, 0);
});

test('un worker nou care așteaptă: oferta apare, fără mesaj și fără reîncărcare până la clic', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  assert.deepEqual(b.oferte, [], 'oferta a venit înainte de sfârșitul instalării');
  b.reg.instalat(w);
  assert.equal(typeof ultima(b), 'function');
  assert.deepEqual(w.mesaje, []);
  // Altă filă a acceptat între timp: controlorul se schimbă, dar fila asta nu se reîncarcă singură.
  b.sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(b.reincarcari, 0);
});

test('un worker care aștepta deja la înregistrare: oferta vine imediat', async () => {
  const b = banc((reg, sw) => {
    reg.active = new WorkerFals('activated');
    reg.waiting = new WorkerFals('installed');
    sw.controller = reg.active;
  });
  await b.gata;
  assert.equal(typeof ultima(b), 'function');
});

test('o instalare în curs la înregistrare e urmărită și ea', async () => {
  const w = new WorkerFals('installing');
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); reg.installing = w; sw.controller = reg.active; });
  await b.gata;
  b.reg.instalat(w);
  assert.equal(typeof ultima(b), 'function');
});

test('clicul (pagina controlată): SKIP_WAITING o dată, reîncărcarea o dată, la controllerchange', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.reg.instalat(w);
  const aplica = ultima(b);
  assert.ok(aplica);
  aplica();
  assert.deepEqual(w.mesaje, [MESAJ_SKIP_WAITING]);
  assert.equal(b.reincarcari, 0, 'reîncărcat înainte ca workerul nou să preia pagina');
  aplica();
  assert.deepEqual(w.mesaje, [MESAJ_SKIP_WAITING], 'al doilea clic a trimis din nou');
  b.sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(b.reincarcari, 1);
  b.sw.dispatchEvent(new Event('controllerchange'));
  w.treci('activated');
  assert.equal(b.reincarcari, 1, 'a doua reîncărcare');
});

test('clicul pe o pagină necontrolată (prima încărcare): reîncărcarea vine la activarea workerului nou', async () => {
  const b = banc((reg) => { reg.active = new WorkerFals('activated'); });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.reg.instalat(w);
  ultima(b)?.();
  assert.deepEqual(w.mesaje, [MESAJ_SKIP_WAITING]);
  w.treci('activating');
  assert.equal(b.reincarcari, 0);
  w.treci('activated');
  assert.equal(b.reincarcari, 1);
});

test('workerul oferit a fost activat între timp de altă filă: clicul doar reîncarcă', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.reg.instalat(w);
  w.treci('activating');
  w.treci('activated');
  ultima(b)?.();
  assert.deepEqual(w.mesaje, []);
  assert.equal(b.reincarcari, 1);
});

test('un worker oferit care devine inutil (înlocuit, instalare eșuată) își retrage oferta', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.reg.instalat(w);
  w.treci('redundant');
  assert.equal(ultima(b), null);
});

test('actualizarea nepermisă (un job rulează, de la sender): clicul nu trimite nimic și nu reîncarcă', async () => {
  assert.equal(actualizarePermisa(), true, 'azi nu rulează niciun job: actualizarea e mereu permisă');
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.reg.instalat(w);
  b.permisa = false;
  ultima(b)?.();
  b.sw.dispatchEvent(new Event('controllerchange'));
  assert.deepEqual(w.mesaje, []);
  assert.equal(b.reincarcari, 0);
  // Jobul s-a terminat: același buton merge.
  b.permisa = true;
  ultima(b)?.();
  assert.deepEqual(w.mesaje, [MESAJ_SKIP_WAITING]);
});

test('înregistrarea eșuată: în jurnal o dată (defect), fără reîncercare; datele site-ului blocate = doar local', async () => {
  const defect = banc(undefined, async () => { throw new TypeError('Failed to register a ServiceWorker: bad HTTP response code (404)'); });
  await defect.gata;
  await asteapta();
  assert.equal(defect.defecte.length, 1);
  assert.equal(defect.locale.length, 0);
  assert.equal(defect.sw.cereri.length, 1);

  const blocat = banc(undefined, async () => { throw new DOMException('The user denied permission to use Service Worker.', 'SecurityError'); });
  await blocat.gata;
  assert.equal(blocat.defecte.length, 0);
  assert.equal(blocat.locale.length, 1);
});

test('înregistrarea oprită de banc (Playwright `serviceWorkers: block` întoarce nimic): nimic în jurnal, nicio ofertă', async () => {
  const b = banc(undefined, async () => undefined);
  await b.gata;
  assert.deepEqual([b.defecte, b.locale, b.oferte], [[], [], []]);
});

test('protocolul: doar mesajul SKIP_WAITING trece', () => {
  assert.equal(esteSkipWaiting(MESAJ_SKIP_WAITING), true);
  assert.equal(esteSkipWaiting({ type: 'SKIP_WAITING' }), true);
  for (const m of [null, undefined, 'SKIP_WAITING', { type: 'altceva' }, {}, 1]) assert.equal(esteSkipWaiting(m), false);
});
