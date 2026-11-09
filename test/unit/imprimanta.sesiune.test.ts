import assert from 'node:assert/strict';
import test from 'node:test';
import { adresaRetea, TIMP_DESCHIDERE_MS, type AdresaRetea } from '../../src/machine/reteaLocala.ts';
import {
  CERERE_FISIERE, CERERE_STARE, COMANDA_PAUZA, DIR_GCODE, HOMING_MAX_MS, HOMING_MIN_MS, RASPUNS_INIMA,
} from '../../src/machine/imprimanta/creality.ts';
import {
  MAX_JURNAL, MAX_LINIE_JURNAL, PAS_ASTEPTARE_MS, PAUZE_RECONECTARE_MS, RACIRE_IMPLICITA_MIN, SesiuneImprimanta, TIMP_PRIMUL_CADRU_MS,
  TIMP_TACERE_MS, type CeasImprimanta, type WebSocketText,
} from '../../src/machine/imprimanta/sesiune.ts';

/*
 * Sesiunea imprimantei (ADR 0190 §A.3, §E), pe un WebSocket fals și un ceas fals: ce pleacă singur (doar citirile și `ok`),
 * ce pleacă la clic, motivele unui eșec, legătura căzută (imprimanta merge mai departe; sesiunea se leagă din nou, cu pauze
 * tot mai lungi) și închiderea de după o pornire (K1 închide legătura după `opGcodeFile`).
 */

class WsFals implements WebSocketText {
  readyState = 0;
  readonly trimise: string[] = [];
  inchis: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onclose: ((e: { readonly code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly url: string;
  constructor(url: string) { this.url = url; }
  send(t: string): void { if (this.readyState !== 1) throw new Error('trimis pe un WebSocket închis'); this.trimise.push(t); }
  close(code = 1000): void { this.inchis = code; this.readyState = 3; }
  deschide(): void { this.readyState = 1; this.onopen?.(); }
  primeste(t: string): void { this.onmessage?.({ data: t }); }
  cade(code = 1006): void { this.readyState = 3; this.onclose?.({ code }); }
  eroare(): void { this.onerror?.(); }
}

class CeasFals implements CeasImprimanta {
  t = 0;
  private urm = 1;
  private readonly ceasuri = new Map<number, { readonly la: number; readonly f: () => void }>();
  setTimeout = (f: () => void, ms: number): unknown => { const id = this.urm++; this.ceasuri.set(id, { la: this.t + ms, f }); return id; };
  clearTimeout = (id: unknown): void => { this.ceasuri.delete(id as number); };
  acum = (): number => this.t;
  /** Trece timpul, cu ceasurile ajunse la termen, în ordinea lor. */
  trece(ms: number): void {
    const tinta = this.t + ms;
    for (;;) {
      let primul: [number, { readonly la: number; readonly f: () => void }] | null = null;
      for (const e of this.ceasuri) if (e[1].la <= tinta && (primul === null || e[1].la < primul[1].la)) primul = e;
      if (primul === null) break;
      this.ceasuri.delete(primul[0]);
      this.t = primul[1].la;
      primul[1].f();
    }
    this.t = tinta;
  }
}

const ADRESA: AdresaRetea = (() => { const a = adresaRetea('192.168.1.12', 9999); if (!a.ok) throw new Error('adresa'); return a.adresa; })();
const STARE = JSON.stringify({ state: 1, printProgress: 26, printFileName: `${DIR_GCODE}a.gcode`, nozzleTemp: '220.000000', model: 'K1C', hostname: 'K1C-8578' });
const INIMA = '{"ModeCode":"heart_beat","msg":"t"}';

function sesiune(permisiune: string | null = 'granted') {
  const ceas = new CeasFals();
  const ws: WsFals[] = [];
  const s = new SesiuneImprimanta({ ceas, fabrica: (url) => { const w = new WsFals(url); ws.push(w); return w; }, permisiune: () => Promise.resolve(permisiune) });
  const ultimul = (): WsFals => { const w = ws.at(-1); if (!w) throw new Error('niciun WebSocket'); return w; };
  return { ceas, ws, s, ultimul };
}
const asteapta = (): Promise<void> => new Promise((r) => { setImmediate(r); });

test('legarea: la deschidere pleacă doar citirile; primul cadru al imprimantei o leagă; la bătaia inimii, `ok`', async () => {
  const { s, ultimul } = sesiune();
  const r = s.conecteaza(ADRESA);
  assert.equal(s.stare().legatura, 'se-leaga');
  const w = ultimul();
  assert.equal(w.url, 'ws://192.168.1.12:9999/');
  w.deschide();
  assert.deepEqual(w.trimise, [CERERE_STARE, CERERE_FISIERE]);
  w.primeste(STARE);
  assert.deepEqual(await r, { ok: true });
  assert.equal(s.stare().legatura, 'conectat');
  assert.equal(s.stare().imprimanta.model, 'K1C');
  assert.equal(s.stare().imprimanta.duza, 220);
  w.primeste(INIMA);
  w.primeste('{"printProgress":27}');
  w.primeste(INIMA);
  assert.deepEqual(w.trimise, [CERERE_STARE, CERERE_FISIERE, RASPUNS_INIMA, RASPUNS_INIMA]);
  assert.equal(s.stare().imprimanta.progres, 27);
  // Jurnalul: deschiderea (cu adresa), ce a plecat și ce a venit, în ordine.
  assert.deepEqual(s.stare().jurnal.map((l) => `${l.dir} ${l.text}`), [
    'stare open ws://192.168.1.12:9999/', `trimis ${CERERE_STARE}`, `trimis ${CERERE_FISIERE}`, `primit ${STARE}`, `primit ${INIMA}`,
    `trimis ok`, 'primit {"printProgress":27}', `primit ${INIMA}`, 'trimis ok',
  ]);
});

test('paza de tăcere (3.6i): o legătură care tace 20 s e pierdută și se reface; fiecare cadru o amână; în jurnal, motivul', async () => {
  const { s, ceas, ws, ultimul } = sesiune();
  const r = s.conecteaza(ADRESA);
  const w = ultimul();
  w.deschide();
  w.primeste(STARE);
  assert.deepEqual(await r, { ok: true });
  // K1C 2025: fără bătăi ale inimii, o bucată de stare la ~3 s; fiecare amână paza.
  for (let k = 0; k < 10; k++) { ceas.trece(3000); w.primeste('{"maxBedTemp":115}'); }
  ceas.trece(TIMP_TACERE_MS - 1);
  assert.equal(s.stare().legatura, 'conectat');
  // Apoi tăcere: legătura moartă, fără închidere (imprimanta și-a refăcut WiFi-ul).
  ceas.trece(1);
  assert.equal(s.stare().legatura, 'pierduta');
  assert.equal(w.inchis, 1000);
  assert.equal(w.onmessage, null);
  assert.equal(s.stare().jurnal.at(-1)?.text, `silence ${TIMP_TACERE_MS / 1000} s`);
  // Prima reîncercare, după 1 s, cu citirile; legată din nou la primul cadru.
  ceas.trece(PAUZE_RECONECTARE_MS[0] ?? 1000);
  assert.equal(ws.length, 2);
  ultimul().deschide();
  ultimul().primeste(STARE);
  assert.equal(s.stare().legatura, 'conectat');
  // O închidere și o încercare căzută intră și ele în jurnal, cu codul și motivul.
  ultimul().cade(1006);
  assert.equal(s.stare().jurnal.at(-1)?.text, 'closed 1006');
  ceas.trece(PAUZE_RECONECTARE_MS[0] ?? 1000);
  ultimul().cade(1006);
  await asteapta();
  assert.deepEqual(s.stare().jurnal.slice(-2).map((l) => `${l.dir} ${l.text}`), ['stare closed 1006', 'stare failed retea-nedeschis']);
  // Deconectarea oprește și paza.
  s.deconecteaza();
  ceas.trece(TIMP_TACERE_MS * 2);
  assert.equal(s.stare().legatura, 'deconectat');
});

test('bătaia inimii ca prim cadru o leagă și ea', async () => {
  const { s, ultimul } = sesiune();
  const r = s.conecteaza(ADRESA);
  ultimul().deschide();
  ultimul().primeste(INIMA);
  assert.deepEqual(await r, { ok: true });
  assert.deepEqual(ultimul().trimise, [CERERE_STARE, CERERE_FISIERE, RASPUNS_INIMA]);
});

test('comenzile pleacă doar cu legătura făcută, fiecare la chemarea ei', async () => {
  const { s, ultimul } = sesiune();
  const r = s.conecteaza(ADRESA);
  assert.equal(s.pauza(), false);
  ultimul().deschide();
  assert.equal(s.pauza(), false, 'deschis, dar încă fără niciun cadru de la imprimantă');
  ultimul().primeste(STARE);
  await r;
  assert.equal(s.pauza(), true);
  assert.equal(s.reia(), true);
  assert.equal(s.opresteImprimarea(), true);
  assert.deepEqual(ultimul().trimise.slice(2), [COMANDA_PAUZA, '{"method":"set","params":{"pause":0}}', '{"method":"set","params":{"stop":1}}']);
  // O cale în afara directorului G-code nu pleacă.
  assert.equal(s.porneste({ nume: 'x', cale: '/etc/passwd', timp: null, material: null, marime: null }), false);
  assert.equal(ultimul().trimise.length, 5);
});

test('eșecurile primei legări: timpul, ceva care tace, permisiunea refuzată, fără răspuns; fără reîncercări', async () => {
  {
    const { s, ceas, ws } = sesiune();
    const r = s.conecteaza(ADRESA);
    ceas.trece(TIMP_DESCHIDERE_MS);
    assert.deepEqual(await r, { ok: false, motiv: 'retea-timp' });
    assert.equal(s.stare().legatura, 'deconectat');
    assert.equal(ws[0]?.inchis, 1000);
    ceas.trece(120_000);
    assert.equal(ws.length, 1, 'nicio reîncercare după prima legare căzută');
  }
  {
    const { s, ceas, ultimul } = sesiune();
    const r = s.conecteaza(ADRESA);
    ultimul().deschide();
    ultimul().primeste('ok');
    ultimul().primeste('{"altceva":1}');
    ceas.trece(TIMP_PRIMUL_CADRU_MS);
    assert.deepEqual(await r, { ok: false, motiv: 'tacut' });
    assert.equal(ultimul().inchis, 1000);
  }
  {
    const { s, ultimul } = sesiune('denied');
    const r = s.conecteaza(ADRESA);
    ultimul().eroare();
    assert.deepEqual(await r, { ok: false, motiv: 'retea-permisiune' });
  }
  {
    const { s, ultimul } = sesiune('granted');
    const r = s.conecteaza(ADRESA);
    ultimul().eroare();
    ultimul().cade();
    assert.deepEqual(await r, { ok: false, motiv: 'retea-nedeschis' });
    assert.equal(s.stare().motiv, 'retea-nedeschis');
  }
});

test('legătura căzută: „pierdută”, apoi se leagă singură din nou, cu pauze tot mai lungi, doar cu citiri', async () => {
  const { s, ceas, ws, ultimul } = sesiune();
  const r = s.conecteaza(ADRESA);
  ultimul().deschide();
  ultimul().primeste(STARE);
  await r;
  ceas.trece(5000);
  ultimul().cade(1006);
  assert.equal(s.stare().legatura, 'pierduta');
  assert.equal(s.stare().pierdutaLa, 5000);
  assert.equal(s.pauza(), false, 'fără legătură, nicio comandă');
  // Încercările: după 1 s, apoi (fiecare căzută) după 2 s, 4 s.
  const pauze: number[] = [];
  for (let k = 0; k < 3; k++) {
    const n = ws.length;
    let dt = 0;
    while (ws.length === n) { ceas.trece(100); dt += 100; }
    pauze.push(dt);
    await asteapta();
    ultimul().eroare();
    await asteapta();
    assert.equal(s.stare().legatura, 'pierduta');
    assert.equal(s.stare().incercari, k + 1);
  }
  assert.deepEqual(pauze, PAUZE_RECONECTARE_MS.slice(0, 3));
  // A patra reușește: legată din nou, cu citirile, fără nicio comandă.
  while (ws.length === 4) ceas.trece(100);
  const w = ultimul();
  w.deschide();
  w.primeste(STARE);
  assert.equal(s.stare().legatura, 'conectat');
  assert.equal(s.stare().incercari, 0);
  assert.equal(s.stare().pierdutaLa, null);
  assert.deepEqual(w.trimise, [CERERE_STARE, CERERE_FISIERE]);
  for (const x of ws) for (const t of x.trimise) assert.doesNotMatch(t, /"method":"set"/);
});

test('o reîncercare căzută nu judecă permisiunea: legătura a mers deja, deci încearcă mai departe', async () => {
  // Browserul aplicației spune permisiunea refuzată și pentru o adresă la care nici n-o cere (pagina pe localhost, imprimanta
  // pe 127.0.0.1): găsit pe 07.11, când o reîncercare a renunțat la legătură.
  const { s, ceas, ws, ultimul } = sesiune('denied');
  const r = s.conecteaza(ADRESA);
  ultimul().deschide();
  ultimul().primeste(STARE);
  await r;
  ultimul().cade(1006);
  ceas.trece(PAUZE_RECONECTARE_MS[0] ?? 0);
  assert.equal(ws.length, 2);
  ultimul().eroare();
  ultimul().cade(1006);
  await asteapta();
  assert.equal(s.stare().legatura, 'pierduta');
  assert.equal(s.stare().motiv, 'retea-nedeschis');
  assert.equal(s.stare().incercari, 1);
  ceas.trece(PAUZE_RECONECTARE_MS[1] ?? 0);
  assert.equal(ws.length, 3, 'încă o încercare');
});

test('după pornire, K1 închide legătura: închiderea e așteptată, iar legătura se reface pe loc', async () => {
  const { s, ceas, ws, ultimul } = sesiune();
  const r = s.conecteaza(ADRESA);
  ultimul().deschide();
  ultimul().primeste(JSON.stringify({ state: 0, printFileName: '' }));
  await r;
  assert.equal(s.porneste({ nume: 'a.gcode', cale: `${DIR_GCODE}a.gcode`, timp: null, material: null, marime: null }), true);
  assert.equal(ultimul().trimise.at(-1), '{"method":"set","params":{"opGcodeFile":"printprt:/usr/data/printer_data/gcodes/a.gcode"}}');
  ceas.trece(200);
  ultimul().cade(1000);
  assert.equal(s.stare().legatura, 'se-leaga', 'nu „pierdută”: închiderea era așteptată');
  ceas.trece(300);
  assert.equal(ws.length, 2);
  ultimul().deschide();
  ultimul().primeste(STARE);
  assert.equal(s.stare().legatura, 'conectat');
  // O cădere mult după pornire e una adevărată.
  ceas.trece(60_000);
  ultimul().cade(1006);
  assert.equal(s.stare().legatura, 'pierduta');
});

test('Deconectează: închide legătura și nu mai încearcă nimic; imprimanta nu primește nicio comandă', async () => {
  const { s, ceas, ws, ultimul } = sesiune();
  const r = s.conecteaza(ADRESA);
  ultimul().deschide();
  ultimul().primeste(STARE);
  await r;
  s.deconecteaza();
  assert.equal(s.stare().legatura, 'deconectat');
  assert.equal(ultimul().inchis, 1000);
  ceas.trece(120_000);
  assert.equal(ws.length, 1);
  assert.deepEqual(ultimul().trimise, [CERERE_STARE, CERERE_FISIERE]);
});

test('un WebSocket vechi nu mai atinge starea după o legare nouă', async () => {
  const { s, ultimul } = sesiune();
  void s.conecteaza(ADRESA);
  const vechi = ultimul();
  const r = s.conecteaza(ADRESA);
  const nou = ultimul();
  assert.notEqual(vechi, nou);
  vechi.primeste(STARE);
  assert.equal(s.stare().legatura, 'se-leaga');
  nou.deschide();
  nou.primeste('{"model":"K1C"}');
  assert.deepEqual(await r, { ok: true });
  assert.equal(s.stare().imprimanta.progres, null, 'starea vechiului WebSocket n-a intrat');
});

test('jurnalul: cel mult 500 de rânduri, un cadru lung tăiat', async () => {
  const { s, ultimul } = sesiune();
  const r = s.conecteaza(ADRESA);
  ultimul().deschide();
  ultimul().primeste(STARE);
  await r;
  const lung = JSON.stringify({ retGcodeFileInfo2: Array.from({ length: 400 }, (_, k) => ({ name: `f${k}.gcode`, path: `${DIR_GCODE}f${k}.gcode` })) });
  ultimul().primeste(lung);
  const linie = s.stare().jurnal.at(-1)?.text ?? '';
  assert.equal(linie.length, MAX_LINIE_JURNAL + ` … (+${lung.length - MAX_LINIE_JURNAL})`.length - 1);
  assert.ok(linie.endsWith(`… (+${lung.length - MAX_LINIE_JURNAL})`));
  assert.equal(s.stare().fisiere?.length, 400, 'lista întreagă, chiar dacă jurnalul o taie');
  for (let k = 0; k < 600; k++) ultimul().primeste(INIMA);
  assert.equal(s.stare().jurnal.length, MAX_JURNAL);
});

/*
 * Felia 3.6o (ADR 0192): comenzile din timpul imprimării, prin driver, cu pașii lor (homing-ul) și răcirea singură.
 */
const LIBERA = JSON.stringify({
  state: 0, printFileName: '', model: 'K1C', hostname: 'K1C-8578', targetNozzleTemp: 0, targetBedTemp0: 0, maxNozzleTemp: 320, maxBedTemp: 115,
  lightSw: 1, modelFanPct: 0, caseFanPct: 0, auxiliaryFanPct: 0, curFeedratePct: 100, curFlowratePct: 100, deviceState: 0, autohome: 'X:0 Y:0 Z:0',
});
const IMPRIMA = JSON.stringify({ state: 1, printFileName: `${DIR_GCODE}a.gcode`, printProgress: 5, printLeftTime: 600 });
const XY = '{"method":"set","params":{"autohome":"X Y"}}';
const Z = '{"method":"set","params":{"autohome":"Z"}}';
const RACESTE = ['{"method":"set","params":{"nozzleTempControl":0}}', '{"method":"set","params":{"bedTempControl":{"num":0,"val":0}}}'];
const setTrimise = (w: WsFals): readonly string[] => w.trimise.filter((t) => t.includes('"method":"set"'));

async function legata(prima = LIBERA) {
  const x = sesiune();
  const r = x.s.conecteaza(ADRESA);
  x.ultimul().deschide();
  x.ultimul().primeste(prima);
  assert.deepEqual(await r, { ok: true });
  return x;
}

/** Trece timpul cu legătura vie: o bucată de stare la 10 s (paza de tăcere e la 20 s). */
function treceViu(x: { readonly ceas: CeasFals; readonly ultimul: () => WsFals }, ms: number): void {
  for (let rest = ms; rest > 0; rest -= 10_000) {
    x.ceas.trece(Math.min(10_000, rest));
    x.ultimul().primeste('{"maxBedTemp":115}');
  }
}

test('comenzile din timpul imprimării: doar cu legătura făcută, scrise de driver; un refuz sau o comandă fără rost nu trimite nimic', async () => {
  const { s, ultimul } = sesiune();
  assert.equal(s.comanda({ fel: 'lumina', aprinsa: false }), false);
  const r = s.conecteaza(ADRESA);
  ultimul().deschide();
  assert.equal(s.comanda({ fel: 'lumina', aprinsa: false }), false, 'deschis, dar încă fără niciun cadru de la imprimantă');
  ultimul().primeste(LIBERA);
  await r;
  assert.equal(s.stare().driver.id, 'creality-k1');
  assert.equal(s.comanda({ fel: 'lumina', aprinsa: false }), true);
  assert.equal(s.comanda({ fel: 'ventilator', id: 'piesa', procent: 101 }), false);
  assert.equal(s.comanda({ fel: 'tinta', incalzitor: 'duza', grade: 321 }), false);
  assert.equal(s.comanda({ fel: 'viteza', procent: 120 }), false, 'fără lucrare, viteza n-are rost');
  assert.equal(s.comanda({ fel: 'ventilator', id: 'carcasa', procent: 40 }), true);
  assert.deepEqual(setTrimise(ultimul()), ['{"method":"set","params":{"lightSw":0}}', '{"method":"set","params":{"gcodeCmd":"M106 P1 S102"}}']);
  // Cât imprimă: viteza și debitul da; homing-ul nu.
  ultimul().primeste(IMPRIMA);
  assert.equal(s.comanda({ fel: 'viteza', procent: 120 }), true);
  assert.equal(s.comanda({ fel: 'debit', procent: 95 }), true);
  assert.equal(s.comanda({ fel: 'homing' }), false);
  assert.deepEqual(setTrimise(ultimul()).slice(2), ['{"method":"set","params":{"setFeedratePct":120}}', '{"method":"set","params":{"setFlowratePct":95}}']);
});

test('homing-ul: X și Y, apoi, după cel puțin o secundă și cât imprimanta e ocupată, Z; unul singur odată', async () => {
  const x = await legata();
  const { s, ceas, ultimul } = x;
  const w = ultimul();
  assert.equal(s.comanda({ fel: 'homing' }), true);
  assert.deepEqual(setTrimise(w), [XY]);
  assert.equal(s.stare().secventa, 'homing');
  assert.equal(s.comanda({ fel: 'homing' }), false, 'un homing în curs');
  assert.equal(s.comanda({ fel: 'lumina', aprinsa: false }), true, 'o comandă de un pas pleacă și între pașii homing-ului');
  w.primeste('{"deviceState":7}');
  ceas.trece(HOMING_MIN_MS - 1);
  assert.deepEqual(setTrimise(w), [XY, '{"method":"set","params":{"lightSw":0}}']);
  ceas.trece(3000);
  w.primeste('{"deviceState":7}');
  assert.equal(setTrimise(w).includes(Z), false, 'încă ocupată');
  w.primeste('{"deviceState":0,"autohome":"X:1 Y:1 Z:0"}');
  ceas.trece(PAS_ASTEPTARE_MS);
  assert.deepEqual(setTrimise(w).filter((t) => t.includes('autohome')), [XY, Z]);
  assert.equal(s.stare().secventa, null);
  assert.equal(s.stare().imprimanta.axe, 'XY');
  // Fără `deviceState` 7 deloc: Z pleacă la prima privire, după secunda întâi.
  assert.equal(s.comanda({ fel: 'homing' }), true);
  ceas.trece(HOMING_MIN_MS - 1);
  assert.equal(setTrimise(w).filter((t) => t === Z).length, 1);
  ceas.trece(1);
  assert.equal(setTrimise(w).filter((t) => t === Z).length, 2);
});

test('homing-ul: o imprimantă ocupată mereu primește Z după 15 s; o legătură căzută între pași oprește Z, cu o linie în jurnal', async () => {
  {
    const { s, ceas, ultimul } = await legata();
    s.comanda({ fel: 'homing' });
    for (let t = 0; t < HOMING_MAX_MS - 1000; t += 1000) { ultimul().primeste('{"deviceState":7}'); ceas.trece(1000); }
    ultimul().primeste('{"deviceState":7}');
    ceas.trece(999);
    assert.equal(setTrimise(ultimul()).includes(Z), false);
    ceas.trece(1);
    assert.deepEqual(setTrimise(ultimul()), [XY, Z]);
  }
  {
    const { s, ceas, ultimul, ws } = await legata();
    s.comanda({ fel: 'homing' });
    ultimul().primeste('{"deviceState":7}');
    ceas.trece(500);
    ultimul().cade(1006);
    ceas.trece(HOMING_MIN_MS);
    assert.equal(s.stare().secventa, null);
    assert.ok(s.stare().jurnal.some((l) => l.text === 'homing stopped'), 'oprit, în jurnal');
    // Legătura revine, liberă: Z nu mai pleacă niciodată.
    while (ws.length === 1) ceas.trece(100);
    ultimul().deschide();
    ultimul().primeste(LIBERA);
    treceViu({ ceas, ultimul }, 30_000);
    for (const w of ws) assert.equal(w.trimise.includes(Z), false);
  }
  {
    // O legare din nou cerută de om (alt IP) între pași: la fel.
    const { s, ceas, ws } = await legata();
    s.comanda({ fel: 'homing' });
    void s.conecteaza(ADRESA);
    assert.equal(s.stare().secventa, null);
    ceas.trece(HOMING_MAX_MS * 2);
    for (const w of ws) assert.equal(w.trimise.includes(Z), false);
  }
});

test('răcirea singură: după o preîncălzire fără imprimare, țintele calde coboară la 0 după 30 de minute, cu o linie în jurnal', async () => {
  const x = await legata();
  const { s, ceas, ultimul } = x;
  assert.equal(RACIRE_IMPLICITA_MIN, 30);
  assert.equal(s.stare().racireLa, null);
  const t0 = ceas.acum();
  assert.equal(s.comanda({ fel: 'tinta', incalzitor: 'duza', grade: 220 }), true);
  assert.equal(s.comanda({ fel: 'tinta', incalzitor: 'pat', grade: 55 }), true);
  assert.equal(s.stare().racireLa, t0 + 30 * 60_000);
  ultimul().primeste('{"targetNozzleTemp":"220.000000","targetBedTemp0":"55.000000"}');
  treceViu(x, 30 * 60_000 - 10_000);
  assert.deepEqual(setTrimise(ultimul()).slice(2), [], 'încă nu');
  treceViu(x, 10_000);
  assert.deepEqual(setTrimise(ultimul()).slice(2), RACESTE);
  assert.equal(s.stare().racireLa, null);
  assert.equal(s.stare().racitaLa, t0 + 30 * 60_000);
  assert.ok(s.stare().jurnal.some((l) => l.text === 'auto-cool after 30 min'));
  // O dată: nimic mai departe.
  treceViu(x, 60 * 60_000);
  assert.equal(setTrimise(ultimul()).length, 4);
});

test('răcirea singură: o imprimare pornită, țintele răcite de om, deconectarea sau altă imprimantă o opresc; doar o țintă caldă cu imprimanta liberă o pornește', async () => {
  const caz = async (dupa: (x: Awaited<ReturnType<typeof legata>>) => void, motiv: string | null) => {
    const x = await legata();
    x.s.comanda({ fel: 'tinta', incalzitor: 'duza', grade: 220 });
    x.ultimul().primeste('{"targetNozzleTemp":"220.000000"}');
    assert.notEqual(x.s.stare().racireLa, null);
    dupa(x);
    if (x.s.stare().legatura === 'conectat') treceViu(x, 31 * 60_000);
    else x.ceas.trece(31 * 60_000);
    assert.equal(x.s.stare().racireLa, null);
    assert.equal(x.s.stare().racitaLa, null, motiv ?? '');
    for (const w of x.ws) for (const t of RACESTE) assert.equal(w.trimise.includes(t), false, motiv ?? '');
    if (motiv !== null) assert.ok(x.s.stare().jurnal.some((l) => l.text === `auto-cool off: ${motiv}`), motiv);
  };
  await caz((x) => { x.ultimul().primeste(IMPRIMA); }, 'print');
  await caz((x) => { x.ultimul().primeste('{"targetNozzleTemp":0}'); }, 'cooled');
  await caz((x) => { x.s.deconecteaza(); }, 'disconnected');
  await caz((x) => { x.ultimul().primeste('{"hostname":"K1-1234"}'); }, 'other printer');
  await caz((x) => { x.s.seteazaRacire(null); }, 'off');
  // Ținta 0, sau o țintă cât imprimă, nu o pornesc.
  {
    const x = await legata();
    x.s.comanda({ fel: 'tinta', incalzitor: 'duza', grade: 0 });
    assert.equal(x.s.stare().racireLa, null);
    x.ultimul().primeste(IMPRIMA);
    x.s.comanda({ fel: 'tinta', incalzitor: 'duza', grade: 215 });
    assert.equal(x.s.stare().racireLa, null);
  }
});

test('răcirea singură: setarea (oprită, minutele schimbate) și legătura căzută la termen', async () => {
  {
    // Oprită: o preîncălzire nu o mai pornește.
    const x = await legata();
    x.s.seteazaRacire(null);
    x.s.comanda({ fel: 'tinta', incalzitor: 'duza', grade: 220 });
    assert.equal(x.s.stare().racireLa, null);
    x.s.seteazaRacire(30);
    assert.equal(x.s.stare().racireLa, null, 'pornirea setării nu armează o preîncălzire de dinainte');
  }
  {
    // Minutele schimbate mută termenul, de la preîncălzire.
    const x = await legata();
    const t0 = x.ceas.acum();
    x.s.comanda({ fel: 'tinta', incalzitor: 'pat', grade: 60 });
    x.ultimul().primeste('{"targetBedTemp0":"60.000000"}');
    treceViu(x, 5 * 60_000);
    x.s.seteazaRacire(10);
    assert.equal(x.s.stare().racireLa, t0 + 10 * 60_000);
    treceViu(x, 5 * 60_000);
    assert.deepEqual(setTrimise(x.ultimul()).slice(1), ['{"method":"set","params":{"bedTempControl":{"num":0,"val":0}}}']);
  }
  {
    // IP-ul schimbat (3.6i): legată din nou de om (sau de căutarea după nume) la aceeași imprimantă, răcirea rămâne armată, iar
    // o primă bucată fără ținte (încă nespuse) nu înseamnă „răcită”.
    const x = await legata();
    const t0 = x.ceas.acum();
    x.s.comanda({ fel: 'tinta', incalzitor: 'duza', grade: 220 });
    x.ultimul().primeste('{"targetNozzleTemp":"220.000000"}');
    void x.s.conecteaza(ADRESA);
    assert.equal(x.s.stare().racireLa, t0 + 30 * 60_000);
    x.ultimul().deschide();
    x.ultimul().primeste('{"maxBedTemp":115}');
    assert.equal(x.s.stare().racireLa, t0 + 30 * 60_000, 'încă armată');
    x.ultimul().primeste(JSON.stringify({ ...JSON.parse(LIBERA), targetNozzleTemp: '220.000000' }));
    treceViu(x, 30 * 60_000);
    assert.deepEqual(setTrimise(x.ultimul()), [RACESTE[0]]);
  }
  {
    // La termen, legătura e căzută: țintele coboară la primul cadru de după legarea din nou.
    const x = await legata();
    x.s.comanda({ fel: 'tinta', incalzitor: 'duza', grade: 220 });
    x.ultimul().primeste('{"targetNozzleTemp":"220.000000"}');
    treceViu(x, 29 * 60_000);
    x.ultimul().cade(1006);
    // Imprimanta nu răspunde până după termen (încercările cad, cu pauze tot mai lungi).
    while (x.ceas.acum() < 31 * 60_000) {
      const n = x.ws.length;
      x.ceas.trece(500);
      if (x.ws.length > n) { await asteapta(); x.ultimul().eroare(); await asteapta(); }
    }
    assert.notEqual(x.s.stare().racireLa, null, 'încă armată');
    while (x.s.stare().legatura !== 'se-leaga' && x.s.stare().legatura !== 'conectat') {
      const n = x.ws.length;
      x.ceas.trece(500);
      if (x.ws.length > n) break;
    }
    x.ultimul().deschide();
    x.ultimul().primeste(JSON.stringify({ ...JSON.parse(LIBERA), targetNozzleTemp: '220.000000' }));
    assert.deepEqual(setTrimise(x.ultimul()), [RACESTE[0]]);
    assert.equal(x.s.stare().racireLa, null);
  }
});
