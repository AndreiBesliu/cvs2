/**
 * Cadrul izolat al unei extensii (ADR 0127 §D), partea lui cvs2: iframe-ul cu sandbox (`allow-scripts`, fără origine, nimic
 * delegat), pagina lui din `shared/cadruExtensie.ts` și portul prin care trec toate mesajele. La încărcarea cadrului, cvs2
 * îi trimite o singură dată fișierele pachetului, contextul (limba, tema, contul cu permisiunea `cont`) și portul; apoi doar
 * prin port. Serviciile cerute cu `host.cere`: `stocare.*` (ADR 0128, cu permisiunea `stocare`), `descarcari.salveaza` (ADR
 * 0129, cu `descarcari`), `masina.*` (ADR 0160, cu `masina`); restul se refuză. Cu `masina`, cadrul primește și starea
 * mașinii, la fiecare schimbare. Lucrul nesalvat al extensiei (ADR 0164) stă aici, citit pe loc de × și de reîncărcare;
 * închiderea cerută (`cereInchiderea`) îi lasă întâi extensiei salvările ei, cel mult cât se dă.
 */
import type { ContextHost } from '../../extensii/api.ts';
import { paginaCadru } from '../../shared/cadruExtensie.ts';
import { masinaPentruExtensii, type MasinaPentruExtensii } from '../app/lucrare.ts';
import { servesteDescarcarile } from './descarcari.ts';
import { depozitDate, type ExtensieInstalata } from './depozit.ts';
import { FARA_MASINA, servesteMasina, type ServiciiMasina } from './masina.ts';
import { servesteStocarea, type RaspunsServiciu } from './stocare.ts';

export type EvenimentCadru =
  | { readonly tip: 'pornit' }
  | { readonly tip: 'inchide' }
  | { readonly tip: 'esuat'; readonly mesaj: string }
  | { readonly tip: 'eroare'; readonly mesaj: string; readonly stiva: string };

/**
 * Tema lui cvs2 pe care o primește o extensie (`src/app/stil.css`, rădăcina): suprafețele (`--s-panou` e fundalul unui panou;
 * `--fond` e voalul translucid de sub ferestre, nu un fundal), textul, accentul, marginile; din ADR 0164, fonturile (`--font`,
 * `--mono`) și `color-scheme`, tema aleasă în cvs2 (`light` sau `dark`), pe care cadrul o pune și ca proprietate (controalele
 * browserului din cadru o urmează).
 */
export const JETOANE_TEMA = [
  '--s-panou', '--s-peste', '--s-ales', '--t', '--t-slab', '--a', '--a-plin', '--t-pe-a', '--rosu', '--l-margine', '--l-focus',
  '--l-camp', '--fond', '--font', '--mono', 'color-scheme',
] as const;

/** Cât îi lasă cvs2 unei extensii salvările de la închidere (`host.laInchidere`), înainte să judece ce a rămas nesalvat. */
export const ASTEPTARE_INCHIDERE_MS = 5000;

/** Tema de acum, cum o vede cadrul: valorile calculate ale variabilelor de pe rădăcină. */
export function temaDeAcum(): Record<string, string> {
  const s = getComputedStyle(document.documentElement);
  return Object.fromEntries(JETOANE_TEMA.map((k) => [k, s.getPropertyValue(k).trim()]));
}

const text = (x: unknown, max: number): string => String(x).slice(0, max);

/** Ce dă carcasa senderului extensiilor (ADR 0160 §B, §E). */
export type GazdaMasina = {
  /** Senderul e deschis extensiilor (în afara instanței live). */
  readonly activ: boolean;
  /** Montează fereastra Mașina (ascunsă), dacă n-a fost deschisă: învelișul ei vine după. */
  readonly monteaza: () => void;
  readonly trimite: ServiciiMasina['trimite'];
};

/** Învelișul ferestrei Mașina; dacă nu e încă, fereastra se montează și se așteaptă, cel mult `ms`. */
function asteaptaMasina(monteaza: () => void, ms = 10_000): Promise<MasinaPentruExtensii | null> {
  const m = masinaPentruExtensii.citeste();
  if (m) return Promise.resolve(m);
  return new Promise((rezolva) => {
    const gata = (x: MasinaPentruExtensii | null): void => { clearTimeout(ceas); opreste(); rezolva(x); };
    const opreste = masinaPentruExtensii.asculta(() => { const x = masinaPentruExtensii.citeste(); if (x) gata(x); });
    const ceas = setTimeout(() => { gata(null); }, ms);
    monteaza();
  });
}

/** Descărcarea din pagina lui cvs2 (cadrul n-are voie): o legătură `blob:` cu numele fișierului, nelegată de document. */
function descarca(nume: string, date: Blob): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(date);
  a.download = nume;
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); }, 30_000);
}

/** Ce întoarce `pornesteCadru`: contextul nou, lucrul nesalvat, închiderea cerută și oprirea. */
export type CadruPornit = {
  readonly context: (c: ContextHost) => void;
  /** Extensia are acum modificări nesalvate (ultimul ei `host.nesalvat`). */
  readonly nesalvat: () => boolean;
  /**
   * Îi cere extensiei salvările de la închidere (`host.laInchidere`) și le așteaptă cel mult `ms`: true dacă a răspuns la
   * timp. Lucrul nesalvat de după (`nesalvat()`) spune dacă omul trebuie întrebat.
   */
  readonly cereInchiderea: (ms?: number) => Promise<boolean>;
  /** Cadrul scos, portul închis. */
  readonly opreste: () => void;
};

/** Pornește extensia în `container`. */
export function pornesteCadru(container: HTMLElement, ext: ExtensieInstalata, context: ContextHost, laEveniment: (e: EvenimentCadru) => void,
  gazda: GazdaMasina): CadruPornit {
  let nesalvat = false, nrInchidere = 0;
  const laInchidereGata = new Map<number, () => void>();
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-scripts');
  f.className = 'cadru-extensie';
  f.title = ext.manifest.nume;
  f.dataset['extensie'] = ext.id;
  f.srcdoc = paginaCadru();
  const canal = new MessageChannel();
  const port = canal.port1;
  const cine = { id: ext.id, nume: ext.manifest.nume, permisiuni: ext.manifest.permisiuni };
  const servicii: ServiciiMasina = {
    activ: gazda.activ,
    masina: () => masinaPentruExtensii.citeste(),
    asteapta: () => asteaptaMasina(gazda.monteaza),
    trimite: gazda.trimite,
  };
  port.onmessage = (e: MessageEvent) => {
    const m = e.data as Record<string, unknown> | null;
    if (!m || typeof m !== 'object') return;
    switch (m.tip) {
      case 'cerere': {
        const id = m.id;
        const [serviciu = '', metoda = ''] = text(m.serviciu, 60).split('.');
        const argumente = Array.isArray(m.argumente) ? m.argumente as unknown[] : [];
        const raspuns: Promise<RaspunsServiciu> = serviciu === 'stocare'
          ? servesteStocarea(ext.id, ext.manifest.permisiuni, metoda, argumente, depozitDate).catch(() => ({ ok: false, eroare: 'stocare:indisponibila' }))
          : serviciu === 'masina'
          ? servesteMasina(cine, metoda, argumente, servicii).catch(() => ({ ok: false, eroare: 'masina:indisponibila' }))
          : Promise.resolve(serviciu === 'descarcari'
            ? servesteDescarcarile(ext.manifest.permisiuni, metoda, argumente, descarca)
            : { ok: false, eroare: `serviciu-necunoscut:${text(m.serviciu, 40)}` });
        void raspuns.then((r) => {
          port.postMessage(r.ok ? { tip: 'raspuns', id, ok: true, rezultat: r.rezultat } : { tip: 'raspuns', id, ok: false, eroare: r.eroare });
        });
        return;
      }
      case 'pornit':
      case 'inchide':
        laEveniment({ tip: m.tip });
        return;
      case 'esuat':
        laEveniment({ tip: 'esuat', mesaj: text(m.mesaj, 500) });
        return;
      case 'eroare':
        laEveniment({ tip: 'eroare', mesaj: text(m.mesaj, 500), stiva: text(m.stiva, 4000) });
        return;
      case 'nesalvat':
        nesalvat = m.da === true;
        return;
      case 'inchidere-gata': {
        const gata = typeof m.id === 'number' ? laInchidereGata.get(m.id) : undefined;
        if (gata) gata();
        return;
      }
    }
  };
  f.addEventListener('load', () => {
    const fisiere: Record<string, ArrayBuffer> = {};
    for (const [c, b] of Object.entries(ext.fisiere)) fisiere[c] = b.slice().buffer;
    // Originea cadrului e opacă: doar „*” ajunge. Mesajul pleacă spre fereastra cadrului, încărcată chiar acum din `srcdoc`.
    f.contentWindow?.postMessage(
      { tip: 'cvs2-extensie-porneste', intrare: ext.manifest.intrare, stiluri: ext.manifest.stiluri, fisiere, context }, '*', [canal.port2],
    );
  }, { once: true });
  container.append(f);
  // Starea mașinii, la fiecare schimbare, doar cu senderul deschis extensiei: întâi a ferestrei de acum (sau fără ea), apoi a
  // celei montate mai târziu. Trimisă doar când se schimbă ce vede extensia (sesiunea publică și jurnalul, și rapoartele).
  let opresteStarea = (): void => {};
  if (gazda.activ && ext.manifest.permisiuni.includes('masina')) {
    let ultima = '', dezabonare = (): void => {};
    const trimiteStarea = (): void => {
      const st = masinaPentruExtensii.citeste()?.stare() ?? FARA_MASINA;
      const j = JSON.stringify(st);
      if (j === ultima) return;
      ultima = j;
      port.postMessage({ tip: 'masina', stare: st });
    };
    const leaga = (): void => {
      dezabonare();
      dezabonare = masinaPentruExtensii.citeste()?.aboneaza(trimiteStarea) ?? (() => {});
      trimiteStarea();
    };
    const fara = masinaPentruExtensii.asculta(leaga);
    leaga();
    opresteStarea = () => { fara(); dezabonare(); };
  }
  return {
    context: (c) => { port.postMessage({ tip: 'context', context: c }); },
    nesalvat: () => nesalvat,
    cereInchiderea: (ms = ASTEPTARE_INCHIDERE_MS) => new Promise<boolean>((rezolva) => {
      const id = ++nrInchidere;
      const gata = (laTimp: boolean): void => { clearTimeout(ceas); laInchidereGata.delete(id); rezolva(laTimp); };
      const ceas = setTimeout(() => { gata(false); }, ms);
      laInchidereGata.set(id, () => { gata(true); });
      port.postMessage({ tip: 'inchidere', id });
    }),
    opreste: () => {
      opresteStarea();
      // O confirmare cerută de extensia oprită nu mai are cui răspunde: se închide, ca „Nu”.
      masinaPentruExtensii.citeste()?.anuleaza(ext.manifest.nume);
      port.close();
      f.remove();
    },
  };
}
