/**
 * Sesiunea mașinii (ADR 0081): un transport (portul Web Serial sau mașina simulată), fluxul senderului (ADR 0080) și ceasul de
 * rapoarte. Octeții primiți se taie în linii (`\n`, cu `\r`-ul scos) și intră în flux ca evenimente `primit`; acțiunile `scrie`
 * pleacă la transport în ordine, printr-o coadă de promisiuni; ce vede omul (conexiunea, faza, raportul, jurnalul) se publică
 * abonaților, cel mult o dată la `PERIOADA_PUBLICARE_MS` (un program de 100 000 de linii nu redesenează panoul la fiecare `ok`).
 * Timpul vine din afară (`Ceas`), ca sesiunea să se probeze în Node, cu un ceas fals.
 *
 * Procedurile (ADR 0082): jog-ul, zero-ul, WCS-ul și palparea Z pleacă tot ca comenzi manuale ale fluxului, cu id-uri care încep
 * cu `#`; sesiunea le înaintează pe răspunsuri (`proceduri.ts`). Una singură odată; cât ține, alta (și pornirea programului) se
 * refuză. Comenzile G-code ale procedurii pleacă doar pe un Idle proaspăt: `ok`-ul unui jog vine la planificare, iar GRBL 1.1
 * refuză G-code-ul cât ține jog-ul (`error:9`). Sesiunea își citește singură WCS-ul activ (`$G`, fără să-l scrie în jurnal) la conectare, după o repornire a
 * controlerului, după un program și după o comandă G-code a omului, pe un Idle proaspăt; după palpare pune la loc starea modală
 * (`G91 G21 G38.2` → ce era), tot pe un Idle (după o alarmă, abia după `$X`).
 */
import { fluxNou, pas, type Actiune, type CodRefuzFlux, type Eveniment, type Faza, type StareFlux } from './flux.ts';
import { linieCurata } from './program.ts';
import {
  comandaJog, comandaZero, modalDinGc, motivMiscare, pasPalpare, pornestePalpare, restaurarePalpare,
  type AxaJog, type FelMiscare, type MotivMiscare, type ParametriPalpare, type RaspunsProcedura, type StarePalpare, type Wcs,
} from './proceduri.ts';
import { citesteRaspuns } from './raspunsuri.ts';

export interface Transport {
  readonly fel: 'serial' | 'simulat';
  scrie(octeti: Uint8Array): Promise<void>;
  /** Pornește citirea: `primit` la fiecare bucată de octeți, `inchis` o singură dată (null: închis de noi). */
  porneste(primit: (octeti: Uint8Array) => void, inchis: (motiv: string | null) => void): void;
  inchide(): Promise<void>;
}

export type Ceas = {
  readonly setInterval: (f: () => void, ms: number) => unknown;
  readonly clearInterval: (id: unknown) => void;
  readonly setTimeout: (f: () => void, ms: number) => unknown;
};

export type FelJurnal = 'trimis' | 'primit' | 'raspuns' | 'alarma' | 'refuz' | 'mesaj' | 'sesiune';
/** Ce spune sesiunea însăși (nu controlerul), ca un cod: textul îl dă panoul, în limba omului. */
export type CodJurnal = 'conectat-serial' | 'conectat-simulat' | 'deconectat' | 'port-inchis' | 'neconectat' | 'miscare' | CodRefuzFlux;
/**
 * O linie a jurnalului: textul controlerului (sau comanda trimisă), ori codul sesiunii (cu evenimentul refuzat în `text`); la
 * `port-inchis`, `motiv` e motivul portului, la `miscare`, codul `MotivMiscare`.
 */
export type LinieJurnal = { readonly fel: FelJurnal; readonly text: string; readonly cod?: CodJurnal; readonly motiv?: string };

/** Rezultatul unei comenzi a procedurii: încă fără răspuns, `ok`, pierdut (alarmă, repornire, port) sau `error:N`. */
export type RezultatComanda = 'in-curs' | 'ok' | 'pierdut' | number;
export type Procedura =
  | { readonly fel: 'zero'; readonly axe: readonly AxaJog[]; readonly wcs: Wcs; readonly rezultat: RezultatComanda }
  | { readonly fel: 'wcs'; readonly wcs: Wcs; readonly rezultat: RezultatComanda }
  | { readonly fel: 'palpare'; readonly stare: StarePalpare };
const inCurs = (p: Procedura | null): boolean =>
  p !== null && (p.fel === 'palpare' ? p.stare.pas !== 'gata' && p.stare.pas !== 'esuat' : p.rezultat === 'in-curs');

export type StareSesiune = {
  readonly conexiune: 'deconectat' | 'conectat';
  readonly transport: Transport['fel'] | null;
  readonly flux: StareFlux;
  readonly jurnal: readonly LinieJurnal[];
  /** Ultima problemă a portului (scrierea sau citirea căzută), arătată omului. */
  readonly eroare: string | null;
  /** WCS-ul activ al controlerului, citit (`$G`); null: necitit încă sau poate schimbat. */
  readonly wcsActiv: Wcs | null;
  /** Procedura de acum sau ultima (cu rezultatul ei). */
  readonly procedura: Procedura | null;
};

export const PERIOADA_RAPORT_MS = 200;
export const PERIOADA_PUBLICARE_MS = 100;
const JURNAL_MAXIM = 300;
/** Evenimentele care scriu la controler: fără port, se refuză. */
const CER_PORT: ReadonlySet<Eveniment['tip']> = new Set(['start', 'reia', 'continua', 'opreste', 'hold', 'eliberare', 'manual', 'anuleaza-jog']);
/** Fazele unei lucrări care rulează: sesiunea nu-și trimite citirile și restaurările. */
const IN_LUCRARE: ReadonlySet<Faza> = new Set(['trimite', 'golire', 'terminare', 'suspendat']);

export class SesiuneMasina {
  private readonly ceas: Ceas;
  private transport: Transport | null = null;
  private ticker: unknown = null;
  private rest = '';
  private scrieri: Promise<void> = Promise.resolve();
  private abonati = new Set<() => void>();
  private publicarePlanificata = false;
  private s: StareSesiune = { conexiune: 'deconectat', transport: null, flux: fluxNou(), jurnal: [], eroare: null, wcsActiv: null, procedura: null };
  private ids = 0;
  /** Id-ul comenzii procedurii care așteaptă răspuns. */
  private idProcedura: string | null = null;
  /** Comenzile G-code ale omului încă fără răspuns: după `ok`, WCS-ul se citește din nou. */
  private manualeGcode = new Set<string>();
  private citesteWcs = false;
  private restaurare: string | null = null;
  /** Comanda G-code a procedurii care așteaptă un Idle proaspăt. */
  private amanata: string | null = null;

  constructor(ceas: Ceas, capacitate = 128) {
    this.ceas = ceas;
    this.s = { ...this.s, flux: fluxNou(capacitate) };
  }

  stare(): StareSesiune { return this.s; }

  /** Abonarea panoului; întoarce dezabonarea. */
  aboneaza(f: () => void): () => void {
    this.abonati.add(f);
    return () => { this.abonati.delete(f); };
  }

  /** Un transport nou (cel vechi se închide întâi); bannerul controlerului vine pe el. */
  async conecteaza(t: Transport): Promise<void> {
    if (this.transport) await this.deconecteaza();
    this.transport = t;
    this.rest = '';
    this.s = { ...this.s, conexiune: 'conectat', transport: t.fel, eroare: null, wcsActiv: null };
    this.citesteWcs = true;
    this.jurnalizeaza('sesiune', '', { cod: t.fel === 'serial' ? 'conectat-serial' : 'conectat-simulat' });
    t.porneste((o) => { if (this.transport === t) this.primit(o); }, (motiv) => { if (this.transport === t) this.inchis(motiv); });
    this.ticker = this.ceas.setInterval(() => { this.eveniment({ tip: 'tic' }); }, PERIOADA_RAPORT_MS);
    this.publica(true);
  }

  async deconecteaza(): Promise<void> {
    const t = this.transport;
    if (!t) return;
    this.inchis(null);
    await t.inchide().catch(() => undefined);
  }

  /** Un eveniment al omului (sau al ceasului): trece prin flux; cele care scriu cer portul. */
  eveniment(e: Eveniment): void {
    if (CER_PORT.has(e.tip) && !this.transport) {
      this.jurnalizeaza('refuz', e.tip, { cod: 'neconectat' });
      this.publica();
      return;
    }
    if (e.tip === 'start' && inCurs(this.s.procedura)) {
      this.jurnalizeaza('refuz', e.tip, { cod: 'miscare', motiv: 'procedura' });
      this.publica();
      return;
    }
    if (e.tip === 'manual') {
      this.jurnalizeaza('trimis', e.text);
      if (!e.id.startsWith('#') && !linieCurata(e.text).startsWith('$')) this.manualeGcode.add(e.id);
    }
    this.aplica(pas(this.s.flux, e));
  }

  /** De ce nu se poate face acum `fel` (null: se poate); panoul dezactivează butonul și arată motivul. */
  motiv(fel: FelMiscare): MotivMiscare | null {
    const f = this.s.flux;
    return motivMiscare({ conectat: this.transport !== null, procedura: inCurs(this.s.procedura), faza: f.faza, stare: f.raport?.stare ?? null }, fel);
  }

  /** Un pas de jog (`$J=`), pe una sau mai multe axe deodată. Refuzat (în jurnal, cu motivul): false. */
  jog(deplasare: Partial<Record<AxaJog, number>>, avans: number): boolean {
    if (this.refuza('jog')) return false;
    const c = comandaJog(deplasare, avans);
    if (c === null) { this.jurnalizeaza('refuz', 'jog', { cod: 'manual-invalid' }); this.publica(); return false; }
    this.eveniment({ tip: 'manual', id: this.idNou('J'), text: c });
    return true;
  }

  /** Oprește jog-ul (0x85): pentru mișcările lungi, un pas de 100 mm pornit greșit. */
  anuleazaJog(): void { this.eveniment({ tip: 'anuleaza-jog' }); }

  /** Zero-ul pe axele date, scris în WCS-ul dat (`G10 L20`). */
  zero(axe: readonly AxaJog[], wcs: Wcs): boolean {
    if (this.refuza(axe.includes('X') || axe.includes('Y') ? 'zero-xy' : 'zero-z')) return false;
    this.s = { ...this.s, procedura: { fel: 'zero', axe, wcs, rezultat: 'in-curs' } };
    this.trimiteProcedurii(comandaZero(wcs, axe));
    return true;
  }

  /** WCS-ul activ al controlerului (`G54`…`G59`): poziția de lucru se arată în el. */
  alegeWcs(wcs: Wcs): boolean {
    if (this.refuza('wcs')) return false;
    this.s = { ...this.s, procedura: { fel: 'wcs', wcs, rezultat: 'in-curs' } };
    this.trimiteProcedurii(wcs);
    return true;
  }

  /** Palparea Z cu placa de contact; Z0 se scrie în WCS-ul din parametri. */
  palpeaza(p: ParametriPalpare): boolean {
    if (this.refuza('palpare')) return false;
    const { stare, comanda } = pornestePalpare(p);
    this.s = { ...this.s, procedura: { fel: 'palpare', stare } };
    if (comanda !== null) this.trimiteProcedurii(comanda);
    else this.publica();
    return true;
  }

  // ——— interne ———

  private primit(o: Uint8Array): void {
    let text = this.rest;
    for (const b of o) text += String.fromCharCode(b);
    const linii = text.split('\n');
    this.rest = linii.pop() ?? '';
    for (const brut of linii) {
      const linie = brut.endsWith('\r') ? brut.slice(0, -1) : brut;
      const r = citesteRaspuns(linie);
      // În jurnal: bannerul, mesajele libere, erorile programului, ce nu se înțelege; nu `ok`-urile și rapoartele (ar fi mii),
      // nici alarma (vine ca acțiune), nici ce ține de o comandă manuală (vine cu răspunsul ei, legat de ea).
      const cap = this.s.flux.inZbor[0];
      const alManualei = cap?.sursa.tip === 'manual' && (r.tip === 'ok' || r.tip === 'eroare' || r.tip === 'date' || r.tip === 'mesaj');
      if (!alManualei && r.tip !== 'ok' && r.tip !== 'raport' && r.tip !== 'alarma' && linie.trim() !== '') this.jurnalizeaza('primit', linie);
      // Repornit, controlerul e iar în G54 (starea modală din fabrică); se citește, nu se presupune.
      if (r.tip === 'banner') {
        this.s = { ...this.s, wcsActiv: null };
        this.citesteWcs = true;
        if (inCurs(this.s.procedura)) this.inainteaza({ tip: 'raspuns', date: [], rezultat: 'pierdut' });
      }
      this.aplica(pas(this.s.flux, { tip: 'primit', linie }));
    }
  }

  private inchis(motiv: string | null): void {
    if (this.ticker !== null) { this.ceas.clearInterval(this.ticker); this.ticker = null; }
    this.transport = null;
    this.aplica(pas(this.s.flux, { tip: 'deconectat' }));
    if (inCurs(this.s.procedura)) this.inainteaza({ tip: 'raspuns', date: [], rezultat: 'pierdut' });
    // Altă conexiune e alt controler (la deschiderea portului, GRBL repornește): nimic de citit sau de pus la loc pe el.
    this.citesteWcs = false;
    this.restaurare = null;
    this.manualeGcode.clear();
    this.s = { ...this.s, conexiune: 'deconectat', transport: null, eroare: motiv, wcsActiv: null };
    this.jurnalizeaza('sesiune', '', motiv === null ? { cod: 'deconectat' } : { cod: 'port-inchis', motiv });
    this.publica(true);
  }

  private aplica(r: { readonly stare: StareFlux; readonly actiuni: readonly Actiune[] }): void {
    const inainte = this.s.flux.faza;
    this.s = { ...this.s, flux: r.stare };
    // După un program (terminat sau întrerupt), WCS-ul poate fi altul (`M2` / `M30` îl readuc la G54).
    if ((IN_LUCRARE.has(inainte) || inainte === 'bariera') && (r.stare.faza === 'terminat' || r.stare.faza === 'pierdut')) this.citesteWcs = true;
    for (const a of r.actiuni) {
      switch (a.tip) {
        case 'scrie': this.scrie(a.octeti); break;
        case 'raspuns': this.raspuns(a); break;
        case 'refuz': this.jurnalizeaza('refuz', a.eveniment, { cod: a.cod }); break;
        case 'alarma':
          this.jurnalizeaza('alarma', `ALARM:${a.cod}`);
          if (inCurs(this.s.procedura)) this.inainteaza({ tip: 'alarma', cod: a.cod });
          break;
        case 'mesaj': break;
      }
    }
    this.trimiteInterne();
    this.publica();
  }

  private raspuns(a: Extract<Actiune, { tip: 'raspuns' }>): void {
    if (a.id.startsWith('#G')) {
      const m = a.rezultat === 'ok' ? modalDinGc(a.date) : null;
      if (m) this.s = { ...this.s, wcsActiv: m.wcs };
      return;
    }
    for (const d of a.date) this.jurnalizeaza('raspuns', d);
    this.jurnalizeaza('raspuns', a.rezultat === 'ok' ? 'ok' : a.rezultat === 'pierdut' ? 'pierdut' : `error:${a.rezultat}`);
    // Un `$G` cerut de om spune și el WCS-ul; o comandă G-code a omului îl poate schimba.
    const m = a.rezultat === 'ok' ? modalDinGc(a.date) : null;
    if (m) this.s = { ...this.s, wcsActiv: m.wcs };
    if (this.manualeGcode.delete(a.id) && a.rezultat === 'ok') { this.s = { ...this.s, wcsActiv: null }; this.citesteWcs = true; }
    if (a.id === this.idProcedura) this.inainteaza({ tip: 'raspuns', date: a.date, rezultat: a.rezultat });
  }

  /** Procedura înaintează pe răspunsul (sau alarma) comenzii ei. */
  private inainteaza(e: RaspunsProcedura): void {
    const p = this.s.procedura;
    this.idProcedura = null;
    this.amanata = null;
    if (!p) return;
    if (p.fel !== 'palpare') {
      const rezultat: RezultatComanda = e.tip === 'alarma' ? 'pierdut' : e.rezultat;
      this.s = { ...this.s, procedura: { ...p, rezultat }, ...(p.fel === 'wcs' && rezultat === 'ok' ? { wcsActiv: p.wcs } : {}) };
      return;
    }
    const { stare, comanda } = pasPalpare(p.stare, e);
    this.s = { ...this.s, procedura: { fel: 'palpare', stare } };
    if (comanda !== null) { this.trimiteProcedurii(comanda); return; }
    this.restaurare = restaurarePalpare(stare);
  }

  /**
   * O comandă a procedurii, pe canalul manual (G-code-ul doar pe un Idle proaspăt). Fluxul n-o refuză: procedurile pornesc doar
   * în afara unei lucrări (`motivMiscare`), iar pornirea lucrării se refuză cât ține o procedură.
   */
  private trimiteProcedurii(text: string): void {
    if (!text.startsWith('$') && !this.idleProaspat()) { this.amanata = text; this.publica(); return; }
    this.idProcedura = this.idNou('P');
    this.eveniment({ tip: 'manual', id: this.idProcedura, text });
  }

  /** Un raport Idle venit după ultimul răspuns, cu nimic în zbor. */
  private idleProaspat(): boolean {
    const f = this.s.flux;
    return f.proaspat && f.raport?.stare === 'Idle' && f.inZbor.length === 0;
  }

  /** Comanda amânată a procedurii, citirea WCS-ului, restaurarea de după palpare: doar pe un Idle proaspăt, cu nimic în drum. */
  private trimiteInterne(): void {
    const f = this.s.flux;
    if (!this.transport || f.coada.length > 0 || !this.idleProaspat()) return;
    if (this.amanata !== null) {
      const text = this.amanata;
      this.amanata = null;
      this.trimiteProcedurii(text);
      return;
    }
    if (IN_LUCRARE.has(f.faza)) return;
    if (this.restaurare !== null) {
      const text = this.restaurare;
      this.restaurare = null;
      this.eveniment({ tip: 'manual', id: this.idNou('R'), text });
      return;
    }
    if (this.citesteWcs) {
      this.citesteWcs = false;
      this.aplica(pas(f, { tip: 'manual', id: this.idNou('G'), text: '$G' }));
    }
  }

  private refuza(fel: FelMiscare): boolean {
    const motiv = this.motiv(fel);
    if (motiv === null) return false;
    this.jurnalizeaza('refuz', fel, { cod: 'miscare', motiv });
    this.publica();
    return true;
  }

  private idNou(fel: 'J' | 'P' | 'R' | 'G'): string { return `#${fel}${++this.ids}`; }

  private scrie(o: Uint8Array): void {
    const t = this.transport;
    if (!t) return;
    this.scrieri = this.scrieri.then(() => t.scrie(o)).catch((e: unknown) => {
      if (this.transport === t) { this.inchis(e instanceof Error ? e.message : String(e)); void t.inchide().catch(() => undefined); }
    });
  }

  private jurnalizeaza(fel: FelJurnal, text: string, extra: { readonly cod?: CodJurnal; readonly motiv?: string } = {}): void {
    const j = this.s.jurnal.length >= JURNAL_MAXIM ? this.s.jurnal.slice(-(JURNAL_MAXIM - 1)) : this.s.jurnal;
    this.s = { ...this.s, jurnal: [...j, { fel, text, ...extra }] };
  }

  private publica(acum = false): void {
    const anunta = (): void => { for (const f of this.abonati) f(); };
    if (acum) { anunta(); return; }
    if (this.publicarePlanificata) return;
    this.publicarePlanificata = true;
    this.ceas.setTimeout(() => { this.publicarePlanificata = false; anunta(); }, PERIOADA_PUBLICARE_MS);
  }
}
