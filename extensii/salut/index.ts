/**
 * Extensia de probă „Salut” (ADR 0127, 0128): arată ce primește de la cvs2 (limba, tema, un fișier al pachetului), își
 * numără deschiderile în stocarea ei (`host.stocare`) și, la cerere, încearcă ce nu are voie din cadrul ei izolat: pagina lui
 * cvs2, stocarea browserului, rețeaua, portul serial, o valoare peste plafon. Rezultatele stau pe pagină, pentru probele e2e
 * și pentru om. Scrisă fără framework: DOM-ul cadrului, cu stilurile din `salut.css`.
 */
import type { ContextHost, HostApi, Spatiu } from '../api.ts';

const TEXTE = {
  ro: {
    titlu: 'Salut din extensie', limba: 'Limba: română', tema: 'Variabilele temei primite', fisier: 'Fișierul pachetului',
    izolare: 'Încearcă izolarea', serviciu: 'Cere senderul', eroare: 'Aruncă o eroare', inchide: 'Închide',
    refuzat: 'refuzat', permis: 'PERMIS', deschideri: 'Deschideri', preaMult: 'Scrie prea mult',
  },
  en: {
    titlu: 'Hello from the extension', limba: 'Language: English', tema: 'Theme variables received', fisier: 'The package file',
    izolare: 'Try the isolation', serviciu: 'Ask for the sender', eroare: 'Throw an error', inchide: 'Close',
    refuzat: 'refused', permis: 'ALLOWED', deschideri: 'Openings', preaMult: 'Write too much',
  },
} as const;

/** O încercare: „refuzat” dacă aruncă sau e respinsă, altfel „PERMIS” (o gaură în izolare). */
async function incearca(f: () => unknown): Promise<boolean> {
  try {
    await f();
    return true;
  } catch {
    return false;
  }
}

export function activeaza(host: HostApi): Spatiu {
  return {
    deschide(container: HTMLElement): void {
      const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', attr: Record<string, string> = {}): HTMLElementTagNameMap[K] => {
        const e = document.createElement(tag);
        e.textContent = text;
        for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
        return e;
      };
      const titlu = el('h1', '', { 'data-salut': 'titlu' });
      const limba = el('p', '', { 'data-salut': 'limba' });
      const tema = el('p', '', { 'data-salut': 'tema' });
      const fisier = el('p', '', { 'data-salut': 'fisier' });
      const deschideri = el('p', '', { 'data-salut': 'deschideri' });
      let numar: number | string = '…';
      const rezultate = el('ul', '', { 'data-salut': 'rezultate' });
      const butoane = el('div');
      const b = (id: string, f: () => void): HTMLButtonElement => {
        const x = el('button', '', { type: 'button', 'data-salut': id });
        x.addEventListener('click', f);
        butoane.append(x);
        return x;
      };
      const rand = (id: string, text: string): void => { rezultate.append(el('li', text, { 'data-proba': id })); };
      const izolare = b('izolare', () => {
        void (async () => {
          const t = TEXTE[host.limba];
          const probe: [string, () => unknown][] = [
            ['pagina', () => (window.parent as Window).document.title],
            ['localStorage', () => window.localStorage.length],
            ['indexedDB', () => new Promise((rez, resp) => { const c = indexedDB.open('cncvs2-proiecte'); c.onsuccess = rez; c.onerror = () => resp(c.error); })],
            ['retea', () => fetch('https://cncvectorstudio-test.web.app/config.json')],
            ['serial', () => (navigator as Navigator & { serial?: { getPorts(): Promise<unknown[]> } }).serial?.getPorts() ?? Promise.reject(new Error('fără'))],
          ];
          rezultate.replaceChildren();
          for (const [id, f] of probe) rand(id, `${id}: ${(await incearca(f)) ? t.permis : t.refuzat}`);
        })();
      });
      const serviciu = b('serviciu', () => {
        void host.cere('masina').then(() => { rand('serviciu', 'masina: PERMIS'); }, (e: unknown) => { rand('serviciu', `masina: ${String((e as Error).message)}`); });
      });
      const eroare = b('eroare', () => { setTimeout(() => { throw new Error('eroare de probă din extensie'); }); });
      const preaMult = b('prea-mult', () => {
        void host.stocare.scrie('mare', 'x'.repeat(4 * 1024 * 1024)).then(
          () => { rand('stocare', 'stocare: PERMIS'); },
          (e: unknown) => { rand('stocare', `stocare: ${String((e as Error).message)}`); },
        );
      });
      const inchide = b('inchide', () => { host.inchide(); });
      // Învelișul descărcărilor (ADR 0129, în încărcător din 3.Xc): cererea ajunge la cvs2, care o refuză fără permisiune.
      b('descarca', () => {
        void host.descarcari.salveaza('salut.txt', 'Salut').then(
          () => { rand('descarcari', 'descarcari: PERMIS'); },
          (e: unknown) => { rand('descarcari', `descarcari: ${String((e as Error).message)}`); },
        );
      }).textContent = 'descarcari';
      const arata = (c: ContextHost): void => {
        const t = TEXTE[c.limba];
        titlu.textContent = t.titlu;
        limba.textContent = t.limba;
        tema.textContent = `${t.tema}: ${Object.keys(c.tema).length} (--t ${c.tema['--t'] ?? '—'})`;
        izolare.textContent = t.izolare;
        serviciu.textContent = t.serviciu;
        eroare.textContent = t.eroare;
        inchide.textContent = t.inchide;
        preaMult.textContent = t.preaMult;
        deschideri.textContent = `${t.deschideri}: ${numar}`;
        void host.fisier('salut.txt')?.text().then((x) => { fisier.textContent = `${t.fisier}: ${x.trim()}`; });
      };
      arata({ limba: host.limba, tema: host.tema });
      host.laSchimbare(arata);
      // Deschiderile, numărate în stocarea extensiei: rămân peste închideri și reîncărcări; se duc odată cu extensia.
      void host.stocare.citeste('deschideri')
        .then((v) => { const n = (typeof v === 'number' ? v : 0) + 1; return host.stocare.scrie('deschideri', n).then(() => n); })
        .then((n) => { numar = n; }, (e: unknown) => { numar = String((e as Error).message); })
        .then(() => { arata({ limba: host.limba, tema: host.tema }); });
      container.append(titlu, limba, tema, fisier, deschideri, butoane, rezultate);
    },
  };
}
