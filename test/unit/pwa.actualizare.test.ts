/**
 * Înregistrarea workerului și actualizarea OFERITĂ (ADR 0045 §5, §7), cu un container de service worker fals: un worker
 * nou așteaptă, aplicația primește o ofertă, iar abia clicul trimite `SKIP_WAITING` și reîncarcă o singură dată, la
 * `controllerchange`. Fără clic, nimic nu se reîncarcă. Verificarea orară (`update()`, ADR 0045 §5) merge pe un ceas fals.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actualizarePermisa, inregistreaza, INTERVAL_VERIFICARE_MS, type DepsInregistrare, type ProgresActualizare } from '../../src/pwa/inregistrare.ts';
import { esteSkipWaiting, MESAJ_CERE_PROGRES, MESAJ_SKIP_WAITING, TIP_PROGRES } from '../../src/pwa/protocol.ts';

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
  verificari = 0;
  /** Ce găsește `update()` pe server: implicit nimic nou. */
  laVerificare: () => Promise<void> = async () => undefined;
  update(): Promise<void> {
    this.verificari++;
    return this.laVerificare();
  }
}

/** Ceasul fals: ora (`acum`) și intervalele (`repeta`), mutate doar de probă. */
class CeasFals {
  t = 0;
  readonly intervale: Array<{ readonly f: () => void; readonly ms: number; urmator: number }> = [];
  readonly acum = (): number => this.t;
  readonly repeta = (f: () => void, ms: number): void => {
    assert.ok(ms > 0, `interval de ${ms} ms`);
    this.intervale.push({ f, ms, urmator: this.t + ms });
  };
  /** Timpul curge: fiecare interval rulează la fiecare scadență, în ordine, ca `setInterval`. */
  avanseaza(ms: number): void {
    const tinta = this.t + ms;
    for (;;) {
      const urm = this.intervale.filter((i) => i.urmator <= tinta).sort((a, b) => a.urmator - b.urmator)[0];
      if (!urm) break;
      this.t = urm.urmator;
      urm.urmator += urm.ms;
      urm.f();
    }
    this.t = tinta;
  }
  /** Ora sare fără ca vreun interval să ruleze: fila înghețată (calculatorul a dormit, fila „adormită” de Edge). */
  sari(ms: number): void {
    this.t += ms;
    for (const i of this.intervale) i.urmator = Math.max(i.urmator, this.t + 1);
  }
}

class DocFals extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible';
  arata(s: DocumentVisibilityState): void {
    this.visibilityState = s;
    this.dispatchEvent(new Event('visibilitychange'));
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
  /** Înregistrarea existentă (`getRegistration`, fără coada de joburi a lui `register`). */
  existenta: InregistrareFalsa | undefined;
  getRegistration(): Promise<InregistrareFalsa | undefined> { return Promise.resolve(this.existenta); }
  /** De câte ori a cerut pagina mesajele workerilor (`startMessages`). */
  porniri = 0;
  startMessages(): void { this.porniri++; }
  /** Un mesaj de la un worker (`postMessage` din worker), cu workerul ca sursă. */
  mesaj(data: unknown, source: WorkerFals | null): void {
    this.dispatchEvent(Object.assign(new Event('message'), { data, source }));
  }
}

interface Banc {
  readonly sw: ContainerFals;
  readonly reg: InregistrareFalsa;
  readonly oferte: Array<(() => void) | null>;
  readonly progrese: Array<ProgresActualizare | null>;
  readonly defecte: unknown[];
  readonly locale: unknown[];
  reincarcari: number;
  permisa: boolean;
  readonly ceas: CeasFals;
  readonly doc: DocFals;
  readonly gata: Promise<void>;
}

function banc(pregateste: (reg: InregistrareFalsa, sw: ContainerFals) => void = () => undefined, raspuns?: () => Promise<InregistrareFalsa | undefined>): Banc {
  const reg = new InregistrareFalsa();
  const sw = new ContainerFals(raspuns ?? (async () => reg));
  sw.existenta = reg;
  pregateste(reg, sw);
  const b = { sw, reg, oferte: [], progrese: [], defecte: [], locale: [], reincarcari: 0, permisa: true, ceas: new CeasFals(), doc: new DocFals() } as unknown as Banc & { gata: Promise<void> };
  const deps: DepsInregistrare = {
    sw: sw as unknown as NonNullable<DepsInregistrare['sw']>,
    ceas: b.ceas,
    doc: b.doc as unknown as NonNullable<DepsInregistrare['doc']>,
    oferta: (f) => { b.oferte.push(f); },
    progres: (p) => { b.progrese.push(p); },
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

const ORA = 3_600_000;
/** O versiune nouă pe server: `update()` o găsește, iar ea se instalează și așteaptă. */
const publicata = (b: Banc): WorkerFals => {
  const w = new WorkerFals('installing');
  b.reg.laVerificare = async () => { b.reg.gasit(w); b.reg.instalat(w); };
  return w;
};

test('verificarea orară: un singur interval, de 3 600 000 ms, armat după înregistrare, fără verificare la pornire', async () => {
  assert.equal(INTERVAL_VERIFICARE_MS, ORA);
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  assert.deepEqual(b.ceas.intervale.map((i) => i.ms), [ORA]);
  assert.equal(b.reg.verificari, 0, 'navigarea tocmai a verificat: încă o verificare la pornire e de prisos');
});

test('update() la o oră, nu mai devreme, apoi la fiecare oră', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  b.ceas.avanseaza(ORA - 1);
  assert.equal(b.reg.verificari, 0);
  b.ceas.avanseaza(1);
  assert.equal(b.reg.verificari, 1);
  b.ceas.avanseaza(ORA);
  assert.equal(b.reg.verificari, 2);
  b.ceas.avanseaza(5 * ORA);
  assert.equal(b.reg.verificari, 7);
});

test('o versiune nouă găsită de verificarea orară: oferită o singură dată, fără mesaj și fără reîncărcare', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = publicata(b);
  b.ceas.avanseaza(ORA);
  await asteapta();
  assert.equal(b.oferte.length, 1);
  assert.equal(typeof ultima(b), 'function');
  // Verificările următoare nu găsesc nimic nou (workerul care așteaptă e chiar versiunea de pe server): nicio ofertă în plus.
  b.reg.laVerificare = async () => undefined;
  b.ceas.avanseaza(3 * ORA);
  b.doc.arata('hidden');
  b.ceas.sari(2 * ORA);
  b.doc.arata('visible');
  await asteapta();
  assert.equal(b.reg.verificari, 5);
  assert.equal(b.oferte.length, 1);
  assert.deepEqual(w.mesaje, []);
  assert.equal(b.reincarcari, 0);
});

test('verificarea eșuată (offline, server căzut): nimic în jurnal, nicio ofertă, fără reîncercare până la ora următoare', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  b.reg.laVerificare = async () => { throw new TypeError('Failed to update a ServiceWorker for scope (\'/\'): An unknown error occurred when fetching the script.'); };
  b.ceas.avanseaza(ORA);
  await asteapta();
  assert.equal(b.reg.verificari, 1);
  // Fila ascunsă și arătată de mai multe ori, sub o oră după eșec: nicio verificare nouă (fără buclă).
  for (let i = 0; i < 5; i++) {
    b.doc.arata('hidden');
    b.ceas.avanseaza(60_000);
    b.doc.arata('visible');
  }
  await asteapta();
  assert.equal(b.reg.verificari, 1);
  b.ceas.avanseaza(ORA - 5 * 60_000);
  await asteapta();
  assert.equal(b.reg.verificari, 2);
  assert.deepEqual([b.defecte, b.locale, b.oferte], [[], [], []]);
});

test('fila redevenită vizibilă verifică doar dacă a trecut cel puțin o oră de la ultima verificare', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  b.doc.arata('hidden');
  b.ceas.avanseaza(30 * 60_000);
  b.doc.arata('visible');
  assert.equal(b.reg.verificari, 0, 'la 30 de minute');
  // Fila înghețată peste noapte (intervalul n-a rulat): la întoarcere, verificarea vine imediat, nu peste încă o oră.
  b.doc.arata('hidden');
  b.ceas.sari(8 * ORA);
  assert.equal(b.reg.verificari, 0);
  b.doc.arata('visible');
  assert.equal(b.reg.verificari, 1);
  // Ascunsă și arătată din nou, sub o oră: nimic; ascunderea însăși nu verifică.
  b.doc.arata('hidden');
  b.ceas.sari(ORA - 1);
  b.doc.arata('visible');
  assert.equal(b.reg.verificari, 1);
  b.ceas.sari(1);
  b.doc.arata('hidden');
  assert.equal(b.reg.verificari, 1, 'ascunderea a verificat');
  b.doc.arata('visible');
  assert.equal(b.reg.verificari, 2);
});

test('fără înregistrare (refuzată sau oprită de banc): niciun interval, nicio verificare la vizibilitate', async () => {
  for (const raspuns of [async () => { throw new TypeError('404'); }, async () => undefined]) {
    const b = banc(undefined, raspuns);
    await b.gata;
    b.doc.arata('hidden');
    b.ceas.sari(2 * ORA);
    b.doc.arata('visible');
    assert.deepEqual(b.ceas.intervale, []);
    assert.equal(b.reg.verificari, 0);
  }
});

test('protocolul: doar mesajul SKIP_WAITING trece', () => {
  assert.equal(esteSkipWaiting(MESAJ_SKIP_WAITING), true);
  assert.equal(esteSkipWaiting({ type: 'SKIP_WAITING' }), true);
  for (const m of [null, undefined, 'SKIP_WAITING', { type: 'altceva' }, {}, 1]) assert.equal(esteSkipWaiting(m), false);
});

/* ── Progresul instalării (ADR 0097): doar de la workerul care se instalează încă. ─────────────────────────────────── */

const progres = (gata: number, total = 1000): unknown => ({ type: TIP_PROGRES, gata, total });

test('progresul: pagina cere mesajele workerilor o dată, după ce le ascultă', async () => {
  const b = banc();
  await b.gata;
  assert.equal(b.sw.porniri, 1);
});

test('prima instalare: procentul, „prima” (niciun worker activ), apoi nimic la sfârșitul instalării', async () => {
  const b = banc();
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.sw.mesaj(progres(250), w);
  b.sw.mesaj(progres(999), w);
  assert.deepEqual(b.progrese, [{ procent: 25, prima: true }, { procent: 99, prima: true }]);
  b.reg.instalat(w);
  assert.deepEqual(b.progrese.at(-1), null);
  w.treci('activating');
  w.treci('activated');
  assert.equal(b.progrese.filter((p) => p === null).length, 1, 'golit o singură dată, la ieșirea din instalare');
  assert.deepEqual(b.oferte, []);
});

test('o actualizare: procentul fără „prima”, apoi oferta, după ce progresul s-a golit', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.sw.mesaj(progres(400), w);
  assert.deepEqual(b.progrese, [{ procent: 40, prima: false }]);
  assert.deepEqual(b.oferte, []);
  b.reg.instalat(w);
  assert.deepEqual(b.progrese, [{ procent: 40, prima: false }, null]);
  assert.equal(typeof ultima(b), 'function');
});

test('instalarea căzută (redundant): progresul se golește, nicio ofertă', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.sw.mesaj(progres(500), w);
  b.reg.installing = null;
  w.treci('redundant');
  assert.deepEqual(b.progrese, [{ procent: 50, prima: false }, null]);
  assert.deepEqual(b.oferte, []);
});

test('un mesaj întârziat, de la un worker care nu se mai instalează, nu mai pune procentul pe ecran', async () => {
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  b.reg.instalat(w);
  b.sw.mesaj(progres(1000), w);
  b.sw.mesaj(progres(1000), b.reg.active);
  b.sw.mesaj(progres(1000), null);
  assert.deepEqual(b.progrese, []);
});

test('alte mesaje (SKIP_WAITING, forme greșite) nu sunt progres', async () => {
  const b = banc();
  await b.gata;
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  for (const m of [MESAJ_SKIP_WAITING, null, 'PROGRES_INSTALARE', progres(11, 10), progres(1, 0)]) b.sw.mesaj(m, w);
  assert.deepEqual(b.progrese, []);
});

test('o instalare în curs la înregistrare: workerul e întrebat de progres, iar progresul se golește la sfârșit', async () => {
  const w = new WorkerFals('installing');
  const b = banc((reg) => { reg.installing = w; });
  await b.gata;
  await asteapta();
  assert.deepEqual(w.mesaje, [MESAJ_CERE_PROGRES]);
  b.sw.mesaj(progres(10), w);
  b.reg.instalat(w);
  assert.deepEqual(b.progrese, [{ procent: 1, prima: true }, null]);
});

test('workerul care aștepta, activat de altă filă cât unul mai nou se instalează, nu golește progresul celui nou', async () => {
  const vechi = new WorkerFals('installing');
  const b = banc((reg, sw) => { reg.active = new WorkerFals('activated'); sw.controller = reg.active; });
  await b.gata;
  b.reg.gasit(vechi);
  b.sw.mesaj(progres(900), vechi);
  b.reg.instalat(vechi);
  const nou = new WorkerFals('installing');
  b.reg.gasit(nou);
  b.sw.mesaj(progres(300), nou);
  vechi.treci('activating');
  vechi.treci('activated');
  assert.deepEqual(b.progrese, [{ procent: 90, prima: false }, null, { procent: 30, prima: false }]);
});

test('fără instalare în curs la înregistrare, nimeni nu e întrebat; un worker găsit mai târziu își trimite singur progresul', async () => {
  const activ = new WorkerFals('activated');
  const b = banc((reg, sw) => { reg.active = activ; sw.controller = activ; });
  await b.gata;
  await asteapta();
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  assert.deepEqual(activ.mesaje, []);
  assert.deepEqual(w.mesaje, []);
});

test('o actualizare găsită de navigare: register() așteaptă sfârșitul instalării, dar progresul se vede cât ține', async () => {
  const activ = new WorkerFals('activated');
  const w = new WorkerFals('installing');
  let intoarce: ((r: InregistrareFalsa) => void) | undefined;
  const b = banc((reg, sw) => { reg.active = activ; reg.installing = w; sw.controller = activ; },
    () => new Promise((ok) => { intoarce = ok; }));
  await asteapta();
  assert.deepEqual(w.mesaje, [MESAJ_CERE_PROGRES], 'întrebat înainte ca register() să se întoarcă');
  b.sw.mesaj(progres(600), w);
  assert.deepEqual(b.progrese, [{ procent: 60, prima: false }]);
  b.reg.instalat(w);
  assert.deepEqual(b.progrese, [{ procent: 60, prima: false }, null]);
  assert.ok(intoarce);
  intoarce(b.reg);
  await b.gata;
  assert.equal(typeof ultima(b), 'function', 'oferta vine cu workerul care așteaptă, la întoarcerea lui register()');
});

test('prima instalare, cu register() pornind-o: fără înregistrare existentă, nimeni de întrebat, procentul „prima”', async () => {
  const b = banc((_reg, sw) => { sw.existenta = undefined; });
  await b.gata;
  await asteapta();
  const w = new WorkerFals('installing');
  b.reg.gasit(w);
  assert.deepEqual(w.mesaje, []);
  b.sw.mesaj(progres(70), w);
  assert.deepEqual(b.progrese, [{ procent: 7, prima: true }]);
});
