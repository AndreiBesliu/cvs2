/**
 * Sesiunea unei imprimante (ADR 0190 §A.3, §E; ADR 0192 §A.1): WebSocket-ul cu cadre text, peste driverul imprimantei (azi
 * familia K1, pe 9999), starea ei și jurnalul cadrelor, publicate abonaților (fereastra). Nu e un flux GRBL: fișierul stă în
 * imprimantă și ea îl imprimă singură; sesiunea doar urmărește și duce comenzile omului.
 *
 * Singură, sesiunea trimite doar citirile driverului (la fiecare deschidere) și răspunsurile care țin legătura vie (K1: `ok` la
 * fiecare bătaie a inimii; fără el, imprimanta închide legătura); orice comandă pleacă dintr-o chemare a ferestrei, adică dintr-un
 * clic. Singura excepție (ADR 0192 §D.16, „Da, recomandările”, 3a): răcirea singură, care doar coboară țintele la 0, după o
 * preîncălzire din aplicație fără imprimare, cât fereastra e deschisă și legată. Legătura pleacă fără subprotocol, ca OrcaSlicer:
 * Chrome refuză o legătură care cere un subprotocol pe care serverul nu-l întoarce.
 *
 * O legătură căzută nu oprește imprimarea: imprimanta merge mai departe din memoria ei. Sesiunea se leagă singură din nou, cu
 * pauze tot mai lungi, cât omul nu s-a deconectat (doar citiri, ca la prima deschidere). Imediat după pornirea unui fișier,
 * K1 închide legătura: închiderea aceea e așteptată, iar legătura se reface pe loc.
 */
import { permisiuneRetea, TIMP_DESCHIDERE_MS, type AdresaRetea } from '../reteaLocala.ts';
import { CREALITY_K1 } from './creality.ts';
import {
  aplica, comandaPermisa, esteLibera, IMPRIMANTA_NECUNOSCUTA, tintaDe, type ComandaImprimanta, type DriverText, type FisierImprimanta,
  type Imprimanta, type Pas,
} from './driver.ts';

/** Ce folosim dintr-un WebSocket (probele îl înlocuiesc): doar cadre text. */
export interface WebSocketText {
  readonly readyState: number;
  send(t: string): void;
  close(code?: number): void;
  onopen: (() => void) | null;
  onmessage: ((e: { readonly data: unknown }) => void) | null;
  onclose: ((e: { readonly code: number }) => void) | null;
  onerror: (() => void) | null;
}
export type FabricaWsText = (url: string) => WebSocketText;

export type CeasImprimanta = {
  readonly setTimeout: (f: () => void, ms: number) => unknown;
  readonly clearTimeout: (id: unknown) => void;
  readonly acum: () => number;
};

export const CEAS_BROWSER: CeasImprimanta = {
  setTimeout: (f, ms) => globalThis.setTimeout(f, ms),
  clearTimeout: (id) => { globalThis.clearTimeout(id as ReturnType<typeof globalThis.setTimeout>); },
  acum: () => Date.now(),
};

const fabricaBrowser: FabricaWsText = (url) => new WebSocket(url) as unknown as WebSocketText;

export type Legatura = 'deconectat' | 'se-leaga' | 'conectat' | 'pierduta';
/** De ce n-a mers: fără răspuns, permisiunea rețelei locale refuzată, timpul trecut, sau ceva care răspunde, dar nu ca imprimanta. */
export type MotivImprimanta = 'retea-nedeschis' | 'retea-permisiune' | 'retea-timp' | 'tacut';
/** O linie a jurnalului: un cadru primit sau trimis, ori un eveniment al legăturii (`stare`: deschisă, închisă, tăcere…). */
export type LinieJurnal = { readonly dir: 'primit' | 'trimis' | 'stare'; readonly text: string; readonly la: number };

export type StareImprimanta = {
  readonly legatura: Legatura;
  readonly adresa: AdresaRetea | null;
  /** Driverul legăturii de acum (al ultimei, după deconectare). */
  readonly driver: DriverText;
  readonly imprimanta: Imprimanta;
  readonly fisiere: readonly FisierImprimanta[] | null;
  /** Motivul ultimului eșec al legăturii (null: niciunul). */
  readonly motiv: MotivImprimanta | null;
  /** Încercările de a reface legătura de la cădere încoace. */
  readonly incercari: number;
  /** Când a căzut legătura (ms), cât e pierdută. */
  readonly pierdutaLa: number | null;
  readonly jurnal: readonly LinieJurnal[];
  /** O comandă în mai mulți pași, în curs (homing-ul: X și Y, așteptarea, Z). */
  readonly secventa: ComandaImprimanta['fel'] | null;
  /** Răcirea singură: când pleacă (ms), cât e armată; când a plecat ultima dată. */
  readonly racireLa: number | null;
  readonly racitaLa: number | null;
};

/** Cât așteaptă primul cadru al imprimantei după deschidere: o altă aplicație pe port nu răspunde ca ea. */
export const TIMP_PRIMUL_CADRU_MS = 6000;
/** Pauzele dintre încercările de a reface legătura; ultima se repetă. */
export const PAUZE_RECONECTARE_MS: readonly number[] = [1000, 2000, 4000, 8000, 15000, 30000];
/** Cât de repede după o pornire o închidere e cea așteptată (K1 închide legătura după `opGcodeFile`). */
export const TIMP_INCHIDERE_DUPA_PORNIRE_MS = 5000;
/**
 * Cât poate tăcea o imprimantă legată: K1C 2025 trimite o bucată de stare la ~3 s, K1 bătăile inimii. Mai mult înseamnă o
 * legătură moartă fără să se fi închis (3.6i: imprimanta owner-ului și-a refăcut WiFi-ul la o pornire de pe ecran, cu alt IP,
 * iar fereastra a rămas pe ultima stare): se reface, ca la o legătură căzută.
 */
export const TIMP_TACERE_MS = 20_000;
export const MAX_JURNAL = 500;
/** Un cadru lung (lista fișierelor are ~150 KiB la 200 de fișiere) intră tăiat în jurnal. */
export const MAX_LINIE_JURNAL = 2000;
/** Cât de des se uită o așteptare a unei comenzi în pași la starea imprimantei (ca integrarea Home Assistant). */
export const PAS_ASTEPTARE_MS = 250;
/** Răcirea singură, implicit (ADR 0192, răspunsul 3a): pornită, la 30 de minute. */
export const RACIRE_IMPLICITA_MIN = 30;
const DESCHIS = 1;

export const STARE_INITIALA: StareImprimanta = {
  legatura: 'deconectat', adresa: null, driver: CREALITY_K1, imprimanta: IMPRIMANTA_NECUNOSCUTA, fisiere: null, motiv: null,
  incercari: 0, pierdutaLa: null, jurnal: [], secventa: null, racireLa: null, racitaLa: null,
};

export type RezultatLegatura = { readonly ok: true } | { readonly ok: false; readonly motiv: MotivImprimanta };

export class SesiuneImprimanta {
  private readonly ceas: CeasImprimanta;
  private readonly fabrica: FabricaWsText;
  private readonly permisiune: () => Promise<string | null>;
  private s: StareImprimanta = STARE_INITIALA;
  private abonati = new Set<() => void>();
  private ws: WebSocketText | null = null;
  /** Fiecare deschidere are generația ei: evenimentele unui WebSocket vechi nu mai ating starea. */
  private generatie = 0;
  private ceasuri: unknown[] = [];
  private ceasReconectare: unknown = null;
  private ceasTacere: unknown = null;
  /** Așteptarea comenzii în pași de acum (o singură odată). */
  private ceasSecventa: unknown = null;
  /** Omul vrea legătura (a apăsat Conectează și nu Deconectează). */
  private dorita = false;
  private pornitLa: number | null = null;
  /** Răcirea singură: setarea (minute; null: oprită), de când e armată, pentru ce imprimantă, dacă s-a văzut o țintă caldă. */
  private racireMinute: number | null = RACIRE_IMPLICITA_MIN;
  private racireDela: number | null = null;
  private racireNume: string | null = null;
  private racireCalda = false;
  private ceasRacire: unknown = null;

  constructor(opt: { readonly ceas?: CeasImprimanta; readonly fabrica?: FabricaWsText; readonly permisiune?: () => Promise<string | null> } = {}) {
    this.ceas = opt.ceas ?? CEAS_BROWSER;
    this.fabrica = opt.fabrica ?? fabricaBrowser;
    this.permisiune = opt.permisiune ?? permisiuneRetea;
  }

  stare(): StareImprimanta { return this.s; }

  aboneaza(f: () => void): () => void {
    this.abonati.add(f);
    return () => { this.abonati.delete(f); };
  }

  /**
   * Leagă imprimanta de la adresa dată, cu driverul ei (implicit, al legăturii de dinainte); o alta, legată, se deconectează
   * întâi. Promisiunea spune cum a mers prima deschidere. Răcirea armată rămâne (IP-ul schimbat al aceleiași imprimante).
   */
  conecteaza(adresa: AdresaRetea, driver: DriverText = this.s.driver): Promise<RezultatLegatura> {
    this.opreste();
    this.dorita = true;
    this.pune({ ...STARE_INITIALA, legatura: 'se-leaga', adresa, driver, jurnal: this.s.jurnal, racireLa: this.s.racireLa, racitaLa: this.s.racitaLa });
    return new Promise((rezolva) => { this.deschide(rezolva); });
  }

  /** Închide legătura și nu mai încearcă s-o refacă; răcirea armată se oprește și ea. Imprimanta nu e atinsă. */
  deconecteaza(): void {
    this.opreste();
    this.dezarmeaza('disconnected');
    this.pune({ ...this.s, legatura: 'deconectat', motiv: null, incercari: 0, pierdutaLa: null });
  }

  /**
   * O comandă a omului (un clic): driverul o scrie în protocolul imprimantei, iar pașii pleacă pe rând. False dacă n-a plecat:
   * fără legătură, refuzată de driver (în afara intervalului, necunoscută), fără rost acum (homing-ul cât imprimă, viteza fără
   * lucrare) sau o altă comandă în pași încă în curs. O țintă caldă, cu imprimanta liberă, armează răcirea singură.
   */
  comanda(c: ComandaImprimanta): boolean {
    const d = this.s.driver;
    const lucrare = d.lucrare(this.s.imprimanta);
    if (!comandaPermisa(c, lucrare)) return false;
    const pasi = d.codifica(c, this.s.imprimanta);
    if (pasi === null || pasi.length === 0 || (pasi.length > 1 && this.s.secventa !== null)) return false;
    if (!this.ruleaza(pasi, c.fel)) return false;
    if (c.fel === 'porneste' && d.inchideDupaPornire) this.pornitLa = this.ceas.acum();
    if (c.fel === 'tinta' && c.grade > 0 && esteLibera(lucrare)) this.armeaza();
    return true;
  }

  pauza(): boolean { return this.comanda({ fel: 'pauza' }); }
  reia(): boolean { return this.comanda({ fel: 'reia' }); }
  opresteImprimarea(): boolean { return this.comanda({ fel: 'opreste' }); }
  porneste(f: FisierImprimanta): boolean { return this.comanda({ fel: 'porneste', cale: f.cale }); }

  /**
   * Răcirea singură (ADR 0192 §D.16): după câte minute fără imprimare pune țintele la 0, după o preîncălzire din aplicație; null
   * o oprește (și una armată acum). Schimbarea minutelor mută termenul unei răciri armate, de la preîncălzire.
   */
  seteazaRacire(minute: number | null): void {
    this.racireMinute = minute;
    if (this.racireDela === null) return;
    if (minute === null) this.dezarmeaza('off');
    else this.programeazaRacire();
  }

  /** Un eveniment al ferestrei în jurnal (căutarea după nume, de exemplu), ca transcrierea să-l arate. */
  noteaza(text: string): void { this.adaugaJurnal('stare', text); }

  /** Cere din nou toată starea și lista fișierelor (citirile driverului). */
  reimprospateaza(): boolean {
    return this.s.driver.citiri.every((c) => this.trimite(c));
  }

  private trimiteComanda(t: string): boolean {
    return this.s.legatura === 'conectat' && this.trimite(t);
  }

  /**
   * Pașii unei comenzi: textele pleacă pe rând; o așteptare se uită la stare după `minMs`, apoi la `PAS_ASTEPTARE_MS`, până e
   * gata sau trec `maxMs`. O legătură căzută sau refăcută între pași oprește restul (homing-ul: Z nu mai pleacă), cu o linie în
   * jurnal. False dacă primul pas n-a plecat.
   */
  private ruleaza(pasi: readonly Pas[], fel: ComandaImprimanta['fel']): boolean {
    const gen = this.generatie;
    const de = (k: number): boolean => {
      for (; k < pasi.length; k++) {
        const p = pasi[k];
        if (p === undefined) break;
        if ('trimite' in p) {
          if (gen !== this.generatie || !this.trimiteComanda(p.trimite)) {
            if (k > 0) this.opresteSecventa();
            return false;
          }
          continue;
        }
        const t0 = this.ceas.acum();
        const urm = k + 1;
        const verifica = (): void => {
          this.ceasSecventa = null;
          if (gen !== this.generatie || this.s.legatura !== 'conectat') { this.opresteSecventa(); return; }
          if (this.ceas.acum() - t0 >= p.maxMs || p.gata(this.s.imprimanta)) { de(urm); return; }
          this.ceasSecventa = this.ceas.setTimeout(verifica, PAS_ASTEPTARE_MS);
        };
        if (this.s.secventa !== fel) this.pune({ ...this.s, secventa: fel });
        this.ceasSecventa = this.ceas.setTimeout(verifica, p.minMs);
        return true;
      }
      if (this.s.secventa !== null) this.pune({ ...this.s, secventa: null });
      return true;
    };
    return de(0);
  }

  /** Oprește comanda în pași de acum (dacă e una), cu o linie în jurnal. */
  private opresteSecventa(): void {
    if (this.ceasSecventa !== null) { this.ceas.clearTimeout(this.ceasSecventa); this.ceasSecventa = null; }
    if (this.s.secventa === null) return;
    this.adaugaJurnal('stare', `${this.s.secventa} stopped`);
    this.pune({ ...this.s, secventa: null });
  }

  /** O preîncălzire din aplicație: răcirea singură pornește de acum, pentru imprimanta asta. */
  private armeaza(): void {
    this.racireDela = this.ceas.acum();
    this.racireNume = this.s.imprimanta.nume;
    this.racireCalda = false;
    this.programeazaRacire();
  }

  private programeazaRacire(): void {
    if (this.ceasRacire !== null) { this.ceas.clearTimeout(this.ceasRacire); this.ceasRacire = null; }
    if (this.racireDela === null || this.racireMinute === null) { this.dezarmeaza(null); return; }
    const la = this.racireDela + this.racireMinute * 60_000;
    this.ceasRacire = this.ceas.setTimeout(() => { this.ceasRacire = null; this.verificaRacire(); }, Math.max(0, la - this.ceas.acum()));
    if (this.s.racireLa !== la) this.pune({ ...this.s, racireLa: la });
  }

  private dezarmeaza(motiv: string | null): void {
    if (this.ceasRacire !== null) { this.ceas.clearTimeout(this.ceasRacire); this.ceasRacire = null; }
    const eraArmata = this.racireDela !== null;
    this.racireDela = null;
    this.racireNume = null;
    this.racireCalda = false;
    if (eraArmata && motiv !== null) this.adaugaJurnal('stare', `auto-cool off: ${motiv}`);
    if (this.s.racireLa !== null) this.pune({ ...this.s, racireLa: null });
  }

  /**
   * La fiecare stare nouă și la termen: o imprimare pornită (sau țintele văzute calde, apoi la 0) oprește răcirea; la termen, cu
   * legătura făcută și aceeași imprimantă, liberă, țintele calde coboară la 0.
   */
  private verificaRacire(): void {
    if (this.racireDela === null || this.racireMinute === null) return;
    const d = this.s.driver;
    const i = this.s.imprimanta;
    const lucrare = d.lucrare(i);
    if (lucrare !== 'necunoscuta' && !esteLibera(lucrare)) { this.dezarmeaza('print'); return; }
    // Țintele încă nespuse (imediat după o legare din nou) nu înseamnă „răcită”.
    const tinte = d.capabilitati(i).tinte.map((t) => ({ t, v: tintaDe(i, t.incalzitor) }));
    const calde = tinte.filter((x) => (x.v ?? 0) > 0).map((x) => x.t);
    if (calde.length > 0) this.racireCalda = true;
    else if (this.racireCalda && tinte.some((x) => x.v !== null)) { this.dezarmeaza('cooled'); return; }
    if (this.ceas.acum() < this.racireDela + this.racireMinute * 60_000 || this.s.legatura !== 'conectat' || lucrare === 'necunoscuta') return;
    if (this.racireNume !== null && i.nume !== null && i.nume !== this.racireNume) { this.dezarmeaza('other printer'); return; }
    const minute = this.racireMinute;
    for (const t of calde) {
      for (const p of d.codifica({ fel: 'tinta', incalzitor: t.incalzitor, grade: 0 }, i) ?? []) {
        if ('trimite' in p) this.trimiteComanda(p.trimite);
      }
    }
    this.dezarmeaza(null);
    if (calde.length > 0) {
      this.adaugaJurnal('stare', `auto-cool after ${minute} min`);
      this.pune({ ...this.s, racitaLa: this.ceas.acum() });
    }
  }

  private trimite(t: string): boolean {
    const ws = this.ws;
    if (ws === null || ws.readyState !== DESCHIS) return false;
    ws.send(t);
    this.adaugaJurnal('trimis', t);
    return true;
  }

  private adaugaJurnal(dir: LinieJurnal['dir'], text: string): void {
    const t = text.length > MAX_LINIE_JURNAL ? `${text.slice(0, MAX_LINIE_JURNAL)}… (+${text.length - MAX_LINIE_JURNAL})` : text;
    const jurnal = [...this.s.jurnal, { dir, text: t, la: this.ceas.acum() }];
    this.pune({ ...this.s, jurnal: jurnal.length > MAX_JURNAL ? jurnal.slice(jurnal.length - MAX_JURNAL) : jurnal });
  }

  private pune(s: StareImprimanta): void {
    this.s = s;
    for (const f of this.abonati) f();
  }

  private ceasNou(f: () => void, ms: number): unknown {
    const id = this.ceas.setTimeout(f, ms);
    this.ceasuri.push(id);
    return id;
  }

  private opresteCeasurile(): void {
    for (const id of this.ceasuri) this.ceas.clearTimeout(id);
    this.ceasuri = [];
    if (this.ceasReconectare !== null) this.ceas.clearTimeout(this.ceasReconectare);
    this.ceasReconectare = null;
    if (this.ceasTacere !== null) this.ceas.clearTimeout(this.ceasTacere);
    this.ceasTacere = null;
    this.opresteSecventa();
  }

  /** Paza de tăcere, pornită din nou la fiecare cadru al unei legături care a răspuns (`TIMP_TACERE_MS`). */
  private pazeste(ws: WebSocketText): void {
    if (this.ceasTacere !== null) this.ceas.clearTimeout(this.ceasTacere);
    this.ceasTacere = this.ceas.setTimeout(() => {
      this.ceasTacere = null;
      if (this.ws !== ws) return;
      ws.onopen = null; ws.onmessage = null; ws.onclose = null; ws.onerror = null;
      ws.close(1000);
      this.ws = null;
      this.adaugaJurnal('stare', `silence ${TIMP_TACERE_MS / 1000} s`);
      this.pune({ ...this.s, legatura: 'pierduta', pierdutaLa: this.ceas.acum(), incercari: 0 });
      this.planifica();
    }, TIMP_TACERE_MS);
  }

  /** Închide WebSocket-ul de acum fără să mai asculte de el. */
  private opreste(): void {
    this.dorita = false;
    this.generatie++;
    this.opresteCeasurile();
    const ws = this.ws;
    this.ws = null;
    if (ws !== null) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close(1000);
    }
  }

  /**
   * O deschidere: întâi WebSocket-ul (cel mult `TIMP_DESCHIDERE_MS`), apoi primul cadru al imprimantei (cel mult
   * `TIMP_PRIMUL_CADRU_MS`), cerut prin citiri. `gata` află cum a mers (doar prima dată, la conectarea cerută de om).
   */
  private deschide(gata: ((r: RezultatLegatura) => void) | null): void {
    const adresa = this.s.adresa;
    if (adresa === null) return;
    const gen = ++this.generatie;
    this.opresteCeasurile();
    const ws = this.fabrica(adresa.url);
    this.ws = ws;
    let deschis = false;
    let raspunde = false;
    let incheiat = false;
    // Generația păzește doar ce vine asincron (ceasurile, răspunsul permisiunii): un WebSocket vechi nu mai trimite evenimente,
    // fiindcă la oprire își pierde ascultătorii (`opreste`, `esec`), iar după o cădere e deja închis.
    const aMea = (): boolean => gen === this.generatie;
    const esec = (motiv: MotivImprimanta): void => {
      if (incheiat || !aMea()) return;
      incheiat = true;
      this.adaugaJurnal('stare', `failed ${motiv}`);
      ws.onopen = null; ws.onmessage = null; ws.onclose = null; ws.onerror = null;
      ws.close(1000);
      if (this.ws === ws) this.ws = null;
      this.opresteCeasurile();
      if (gata) {
        // Prima deschidere, cerută de om: fără reîncercări; panoul spune motivul și pașii.
        this.dorita = false;
        this.pune({ ...this.s, legatura: 'deconectat', motiv });
        gata({ ok: false, motiv });
        return;
      }
      this.reincearca(motiv);
    };
    const esecDeschidere = (): void => {
      if (incheiat || !aMea()) return;
      // La o reîncercare, legătura a mers deja, deci permisiunea (dată o dată pe site) nu e motivul: imprimanta încă nu răspunde.
      // Starea permisiunii nu e o dovadă: un browser o poate spune refuzată și pentru o adresă la care nici n-o cere.
      if (gata === null) { esec('retea-nedeschis'); return; }
      // Un refuz al permisiunii arată ca o imprimantă care nu răspunde; starea permisiunii le desparte.
      this.permisiune().then(
        (p) => { esec(p === 'denied' ? 'retea-permisiune' : 'retea-nedeschis'); },
        () => { esec('retea-nedeschis'); },
      );
    };
    this.ceasNou(() => { if (!deschis) esec('retea-timp'); }, TIMP_DESCHIDERE_MS);
    ws.onerror = () => { if (!deschis) esecDeschidere(); };
    ws.onopen = () => {
      deschis = true;
      this.adaugaJurnal('stare', `open ${adresa.url}`);
      for (const c of this.s.driver.citiri) this.trimite(c);
      this.ceasNou(() => { if (!raspunde) esec('tacut'); }, TIMP_PRIMUL_CADRU_MS);
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      this.adaugaJurnal('primit', e.data);
      const c = this.s.driver.citeste(e.data);
      if (c.raspuns !== null) this.trimite(c.raspuns);
      const schimbari = Object.keys(c.stare).length > 0;
      if (!raspunde && c.recunoscut) {
        raspunde = true;
        incheiat = true;
        this.opresteCeasurile();
        this.pune({ ...this.s, legatura: 'conectat', motiv: null, incercari: 0, pierdutaLa: null });
        if (gata) gata({ ok: true });
      }
      if (schimbari || c.fisiere !== null) {
        this.pune({
          ...this.s,
          imprimanta: schimbari ? aplica(this.s.imprimanta, c.stare) : this.s.imprimanta,
          fisiere: c.fisiere ?? this.s.fisiere,
        });
      }
      if (schimbari) this.verificaRacire();
      if (raspunde) this.pazeste(ws);
    };
    ws.onclose = (e) => {
      this.adaugaJurnal('stare', `closed ${e.code}`);
      if (!raspunde) {
        if (!deschis) esecDeschidere();
        else esec('tacut');
        return;
      }
      // După ce a răspuns: legătura a căzut (WiFi-ul, imprimanta oprită) sau a închis-o imprimanta după o pornire.
      if (this.ws === ws) this.ws = null;
      if (this.ceasTacere !== null) { this.ceas.clearTimeout(this.ceasTacere); this.ceasTacere = null; }
      if (!this.dorita) return;
      const dupaPornire = this.pornitLa !== null && this.ceas.acum() - this.pornitLa <= TIMP_INCHIDERE_DUPA_PORNIRE_MS;
      this.pornitLa = null;
      if (dupaPornire) {
        this.pune({ ...this.s, legatura: 'se-leaga' });
        this.ceasReconectare = this.ceas.setTimeout(() => { this.ceasReconectare = null; this.deschide(null); }, 300);
        return;
      }
      this.pune({ ...this.s, legatura: 'pierduta', pierdutaLa: this.ceas.acum(), incercari: 0 });
      this.planifica();
    };
  }

  /** O încercare de a reface legătura a căzut: alta, după o pauză, cât omul nu s-a deconectat. */
  private reincearca(motiv: MotivImprimanta): void {
    if (!this.dorita) return;
    this.pune({ ...this.s, legatura: 'pierduta', motiv, pierdutaLa: this.s.pierdutaLa ?? this.ceas.acum(), incercari: this.s.incercari + 1 });
    this.planifica();
  }

  private planifica(): void {
    const pauze = PAUZE_RECONECTARE_MS;
    const ms = pauze[Math.min(this.s.incercari, pauze.length - 1)] ?? 30000;
    this.ceasReconectare = this.ceas.setTimeout(() => {
      this.ceasReconectare = null;
      if (this.dorita) this.deschide(null);
    }, ms);
  }
}
