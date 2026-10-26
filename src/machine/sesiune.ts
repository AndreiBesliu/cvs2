/**
 * Sesiunea mașinii (ADR 0081): un transport (portul Web Serial sau mașina simulată), fluxul senderului (ADR 0080) și ceasul de
 * rapoarte. Octeții primiți se taie în linii (`\n`, cu `\r`-ul scos) și intră în flux ca evenimente `primit`; acțiunile `scrie`
 * pleacă la transport în ordine, printr-o coadă de promisiuni; ce vede omul (conexiunea, faza, raportul, jurnalul) se publică
 * abonaților, cel mult o dată la `PERIOADA_PUBLICARE_MS` (un program de 100 000 de linii nu redesenează panoul la fiecare `ok`).
 * Timpul vine din afară (`Ceas`), ca sesiunea să se probeze în Node, cu un ceas fals.
 */
import { fluxNou, pas, type Actiune, type CodRefuzFlux, type Eveniment, type StareFlux } from './flux.ts';
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
export type CodJurnal = 'conectat-serial' | 'conectat-simulat' | 'deconectat' | 'port-inchis' | 'neconectat' | CodRefuzFlux;
/** O linie a jurnalului: textul controlerului (sau comanda trimisă), ori codul sesiunii (cu evenimentul refuzat în `text`). */
export type LinieJurnal = { readonly fel: FelJurnal; readonly text: string; readonly cod?: CodJurnal; readonly motiv?: string };

export type StareSesiune = {
  readonly conexiune: 'deconectat' | 'conectat';
  readonly transport: Transport['fel'] | null;
  readonly flux: StareFlux;
  readonly jurnal: readonly LinieJurnal[];
  /** Ultima problemă a portului (scrierea sau citirea căzută), arătată omului. */
  readonly eroare: string | null;
};

export const PERIOADA_RAPORT_MS = 200;
export const PERIOADA_PUBLICARE_MS = 100;
const JURNAL_MAXIM = 300;
/** Evenimentele care scriu la controler: fără port, se refuză. */
const CER_PORT: ReadonlySet<Eveniment['tip']> = new Set(['start', 'reia', 'continua', 'opreste', 'hold', 'eliberare', 'manual']);

export class SesiuneMasina {
  private readonly ceas: Ceas;
  private transport: Transport | null = null;
  private ticker: unknown = null;
  private rest = '';
  private scrieri: Promise<void> = Promise.resolve();
  private abonati = new Set<() => void>();
  private publicarePlanificata = false;
  private s: StareSesiune = { conexiune: 'deconectat', transport: null, flux: fluxNou(), jurnal: [], eroare: null };

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
    this.s = { ...this.s, conexiune: 'conectat', transport: t.fel, eroare: null };
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
    if (e.tip === 'manual') this.jurnalizeaza('trimis', e.text);
    this.aplica(pas(this.s.flux, e));
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
      this.aplica(pas(this.s.flux, { tip: 'primit', linie }));
    }
  }

  private inchis(motiv: string | null): void {
    if (this.ticker !== null) { this.ceas.clearInterval(this.ticker); this.ticker = null; }
    this.transport = null;
    this.aplica(pas(this.s.flux, { tip: 'deconectat' }));
    this.s = { ...this.s, conexiune: 'deconectat', transport: null, eroare: motiv };
    this.jurnalizeaza('sesiune', '', motiv === null ? { cod: 'deconectat' } : { cod: 'port-inchis', motiv });
    this.publica(true);
  }

  private aplica(r: { readonly stare: StareFlux; readonly actiuni: readonly Actiune[] }): void {
    this.s = { ...this.s, flux: r.stare };
    for (const a of r.actiuni) {
      switch (a.tip) {
        case 'scrie': this.scrie(a.octeti); break;
        case 'raspuns':
          for (const d of a.date) this.jurnalizeaza('raspuns', d);
          this.jurnalizeaza('raspuns', a.rezultat === 'ok' ? 'ok' : a.rezultat === 'pierdut' ? 'pierdut' : `error:${a.rezultat}`);
          break;
        case 'refuz': this.jurnalizeaza('refuz', a.eveniment, { cod: a.cod }); break;
        case 'alarma': this.jurnalizeaza('alarma', `ALARM:${a.cod}`); break;
        case 'mesaj': break;
      }
    }
    this.publica();
  }

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
