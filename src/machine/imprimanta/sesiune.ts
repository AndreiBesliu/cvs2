/**
 * Sesiunea unei imprimante Creality (ADR 0190 §A.3, §E): WebSocket-ul de pe 9999, starea ei și jurnalul cadrelor, publicate
 * abonaților (panoul). Nu e un flux GRBL: fișierul stă în imprimantă și ea îl imprimă singură; sesiunea doar urmărește și duce
 * comenzile omului.
 *
 * Singură, sesiunea trimite doar citiri (`CITIRI`: toată starea și lista fișierelor, la fiecare deschidere) și `ok` la fiecare
 * bătaie a inimii (fără el, imprimanta închide legătura); orice comandă `set` pleacă dintr-o chemare a panoului, adică dintr-un
 * clic. Legătura pleacă fără subprotocol, ca OrcaSlicer: Chrome refuză o legătură care cere un subprotocol pe care serverul nu-l
 * întoarce.
 *
 * O legătură căzută nu oprește imprimarea: imprimanta merge mai departe din memoria ei. Sesiunea se leagă singură din nou, cu
 * pauze tot mai lungi, cât omul nu s-a deconectat (doar citiri, ca la prima deschidere). Imediat după pornirea unui fișier,
 * K1 închide legătura: închiderea aceea e așteptată, iar legătura se reface pe loc.
 */
import { permisiuneRetea, TIMP_DESCHIDERE_MS, type AdresaRetea } from '../reteaLocala.ts';
import {
  aplica, CERERE_FISIERE, CERERE_STARE, citesteCadru, COMANDA_OPRESTE, COMANDA_PAUZA, COMANDA_REIA, comandaPornire, esteCreality,
  IMPRIMANTA_NECUNOSCUTA, RASPUNS_INIMA, type FisierImprimanta, type Imprimanta,
} from './creality.ts';

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
export type LinieJurnal = { readonly dir: 'primit' | 'trimis'; readonly text: string; readonly la: number };

export type StareImprimanta = {
  readonly legatura: Legatura;
  readonly adresa: AdresaRetea | null;
  readonly imprimanta: Imprimanta;
  readonly fisiere: readonly FisierImprimanta[] | null;
  /** Motivul ultimului eșec al legăturii (null: niciunul). */
  readonly motiv: MotivImprimanta | null;
  /** Încercările de a reface legătura de la cădere încoace. */
  readonly incercari: number;
  /** Când a căzut legătura (ms), cât e pierdută. */
  readonly pierdutaLa: number | null;
  readonly jurnal: readonly LinieJurnal[];
};

/** Cât așteaptă primul cadru al imprimantei după deschidere: o altă aplicație pe port nu răspunde ca ea. */
export const TIMP_PRIMUL_CADRU_MS = 6000;
/** Pauzele dintre încercările de a reface legătura; ultima se repetă. */
export const PAUZE_RECONECTARE_MS: readonly number[] = [1000, 2000, 4000, 8000, 15000, 30000];
/** Cât de repede după o pornire o închidere e cea așteptată (K1 închide legătura după `opGcodeFile`). */
export const TIMP_INCHIDERE_DUPA_PORNIRE_MS = 5000;
export const MAX_JURNAL = 500;
/** Un cadru lung (lista fișierelor are ~150 KiB la 200 de fișiere) intră tăiat în jurnal. */
export const MAX_LINIE_JURNAL = 2000;
const DESCHIS = 1;

export const STARE_INITIALA: StareImprimanta = {
  legatura: 'deconectat', adresa: null, imprimanta: IMPRIMANTA_NECUNOSCUTA, fisiere: null, motiv: null, incercari: 0,
  pierdutaLa: null, jurnal: [],
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
  /** Omul vrea legătura (a apăsat Conectează și nu Deconectează). */
  private dorita = false;
  private pornitLa: number | null = null;

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

  /** Leagă imprimanta de la adresa dată (o alta, legată, se deconectează întâi); promisiunea spune cum a mers prima deschidere. */
  conecteaza(adresa: AdresaRetea): Promise<RezultatLegatura> {
    this.opreste();
    this.dorita = true;
    this.pune({ ...STARE_INITIALA, legatura: 'se-leaga', adresa, jurnal: this.s.jurnal });
    return new Promise((rezolva) => { this.deschide(rezolva); });
  }

  /** Închide legătura și nu mai încearcă s-o refacă. Imprimanta nu e atinsă. */
  deconecteaza(): void {
    this.opreste();
    this.pune({ ...this.s, legatura: 'deconectat', motiv: null, incercari: 0, pierdutaLa: null });
  }

  /** Comenzile omului: pleacă doar cu legătura deschisă (false altfel). */
  pauza(): boolean { return this.comanda(COMANDA_PAUZA); }
  reia(): boolean { return this.comanda(COMANDA_REIA); }
  opresteImprimarea(): boolean { return this.comanda(COMANDA_OPRESTE); }

  porneste(f: FisierImprimanta): boolean {
    const c = comandaPornire(f.cale);
    if (c === null || !this.comanda(c)) return false;
    this.pornitLa = this.ceas.acum();
    return true;
  }

  /** Cere din nou toată starea și lista fișierelor. */
  reimprospateaza(): boolean {
    return this.trimite(CERERE_STARE) && this.trimite(CERERE_FISIERE);
  }

  private comanda(t: string): boolean {
    return this.s.legatura === 'conectat' && this.trimite(t);
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
      this.trimite(CERERE_STARE);
      this.trimite(CERERE_FISIERE);
      this.ceasNou(() => { if (!raspunde) esec('tacut'); }, TIMP_PRIMUL_CADRU_MS);
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      this.adaugaJurnal('primit', e.data);
      const c = citesteCadru(e.data);
      if (c.inima) this.trimite(RASPUNS_INIMA);
      const schimbari = Object.keys(c.stare).length > 0;
      if (!raspunde && esteCreality(c)) {
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
    };
    ws.onclose = () => {
      if (!raspunde) {
        if (!deschis) esecDeschidere();
        else esec('tacut');
        return;
      }
      // După ce a răspuns: legătura a căzut (WiFi-ul, imprimanta oprită) sau a închis-o imprimanta după o pornire.
      if (this.ws === ws) this.ws = null;
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
