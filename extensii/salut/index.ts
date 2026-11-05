/**
 * Extensia de probă „Salut” (ADR 0127, 0128): arată ce primește de la cvs2 (limba, tema, un fișier al pachetului), își
 * numără deschiderile în stocarea ei (`host.stocare`) și, la cerere, încearcă ce nu are voie din cadrul ei izolat: pagina lui
 * cvs2, stocarea browserului, rețeaua, portul serial, o valoare peste plafon. Din 3.Xd (ADR 0164): contul văzut (cu
 * permisiunea `cont`, altfel „—”), `color-scheme`-ul temei și lucrul nesalvat: „Modifică” o lasă cu modificări nesalvate,
 * „Salvează la închidere” îi dă cvs2-ului o salvare de făcut înainte de ×. Din 3.Xe (ADR 0166): formele primite din desen
 * (câte contururi și cutia lor, sau refuzul) și „Propune o formă”, un dreptunghi SVG de 30 × 20 mm pentru desen. Rezultatele
 * stau pe pagină, pentru probele e2e
 * și pentru om. Scrisă fără framework: DOM-ul cadrului, cu stilurile din `salut.css`.
 */
import type { ContCvs2, ContextHost, FormeCvs2, HostApi, Spatiu } from '../api.ts';

const TEXTE = {
  ro: {
    titlu: 'Salut din extensie', limba: 'Limba: română', tema: 'Variabilele temei primite', fisier: 'Fișierul pachetului',
    izolare: 'Încearcă izolarea', serviciu: 'Cere senderul', eroare: 'Aruncă o eroare', inchide: 'Închide',
    refuzat: 'refuzat', permis: 'PERMIS', deschideri: 'Deschideri', preaMult: 'Scrie prea mult',
    cont: 'Contul', neconectat: 'neconectat', neconfirmat: 'adresa neconfirmată', modifica: 'Modifică (nesalvat)',
    laInchidere: 'Salvează la închidere', lucru: 'Lucrul', salvat: 'salvat', nesalvat: 'nesalvat', reporneste: 'Repornește',
    forme: 'Formele primite', propune: 'Propune o formă',
  },
  en: {
    titlu: 'Hello from the extension', limba: 'Language: English', tema: 'Theme variables received', fisier: 'The package file',
    izolare: 'Try the isolation', serviciu: 'Ask for the sender', eroare: 'Throw an error', inchide: 'Close',
    refuzat: 'refused', permis: 'ALLOWED', deschideri: 'Openings', preaMult: 'Write too much',
    cont: 'The account', neconectat: 'signed out', neconfirmat: 'email not confirmed', modifica: 'Change (unsaved)',
    laInchidere: 'Save on close', lucru: 'The work', salvat: 'saved', nesalvat: 'unsaved', reporneste: 'Restart',
    forme: 'Shapes received', propune: 'Propose a shape',
  },
} as const;

/** Dreptunghiul propus pentru desen: 30 × 20 mm. */
const DREPTUNGHI = '<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="20mm" viewBox="0 0 30 20"><rect width="30" height="20"/></svg>';

/** Formele primite, pe scurt: câte contururi, câte închise și mărimea cutiei, în mm; sau refuzul. */
function descrieForme(f: FormeCvs2 | null): string {
  if (!f) return '—';
  if (!f.ok) return f.motiv;
  const r = (v: number): string => String(Math.round(v * 100) / 100);
  return `${f.contururi.length} (${f.contururi.filter((c) => c.inchis).length}), ${r(f.cutie.x1 - f.cutie.x0)} × ${r(f.cutie.y1 - f.cutie.y0)} mm`;
}

/** Contul, cum îl arată extensia: „—” fără permisiune, apoi neconectat, adresa neconfirmată sau numele cu planul. */
function descrieCont(c: ContCvs2 | null, t: (typeof TEXTE)['ro' | 'en']): string {
  if (!c) return '—';
  if (!c.conectat) return t.neconectat;
  return c.plan === null ? t.neconfirmat : `${c.nume} (${c.plan})`;
}

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
      // Lucrul nesalvat (ADR 0164): „Modifică” îl anunță; „Salvează la închidere” îl scrie în stocare când cvs2 o cere (la ×).
      let nesalvat = false, salvari = 0, cuSalvare = false;
      const modifica = b('modifica', () => { nesalvat = true; host.nesalvat(true); arata(context()); });
      const laInchidere = b('la-inchidere', () => {
        if (cuSalvare) return;
        cuSalvare = true;
        host.laInchidere(async () => {
          salvari += 1;
          await host.stocare.scrie('lucru', salvari);
          nesalvat = false;
          host.nesalvat(false);
        });
      });
      // Formele (ADR 0166): cele primite din desen, și o propunere pentru desen (fără permisiune, refuzul vine de la cvs2).
      let primite: FormeCvs2 | null = null;
      const propune = b('propune', () => {
        void host.forme.propune('salut.svg', DREPTUNGHI).then(
          (r) => { rand('forme', `forme: ${String(r)}`); },
          (e: unknown) => { rand('forme', `forme: ${String((e as Error).message)}`); },
        );
      });
      // Repornirea cerută de extensie (ADR 0165): cvs2 îi reface cadrul; deschiderile cresc cu una.
      const reporneste = b('reporneste', () => { host.reporneste(); });
      const context = (): ContextHost => ({ limba: host.limba, tema: host.tema });
      const arata = (c: ContextHost): void => {
        const t = TEXTE[c.limba];
        titlu.textContent = t.titlu;
        limba.textContent = t.limba;
        tema.textContent = `${t.tema}: ${Object.keys(c.tema).length} (--t ${c.tema['--t'] ?? '—'})`;
        schema.textContent = `color-scheme: ${c.tema['color-scheme'] ?? '—'}`;
        contul.textContent = `${t.cont}: ${descrieCont(host.cont, t)}`;
        lucru.textContent = `${t.lucru}: ${nesalvat ? t.nesalvat : t.salvat}`;
        izolare.textContent = t.izolare;
        serviciu.textContent = t.serviciu;
        eroare.textContent = t.eroare;
        inchide.textContent = t.inchide;
        preaMult.textContent = t.preaMult;
        modifica.textContent = t.modifica;
        laInchidere.textContent = t.laInchidere;
        reporneste.textContent = t.reporneste;
        propune.textContent = t.propune;
        forme.textContent = `${t.forme}: ${descrieForme(primite)}`;
        deschideri.textContent = `${t.deschideri}: ${numar}`;
        void host.fisier('salut.txt')?.text().then((x) => { fisier.textContent = `${t.fisier}: ${x.trim()}`; });
      };
      const schema = el('p', '', { 'data-salut': 'schema' });
      const contul = el('p', '', { 'data-salut': 'cont' });
      const lucru = el('p', '', { 'data-salut': 'lucru' });
      const forme = el('p', '', { 'data-salut': 'forme' });
      arata(context());
      host.laSchimbare(arata);
      host.forme.laPrimire((f) => { primite = f; arata(context()); });
      // Deschiderile, numărate în stocarea extensiei: rămân peste închideri și reîncărcări; se duc odată cu extensia.
      void host.stocare.citeste('deschideri')
        .then((v) => { const n = (typeof v === 'number' ? v : 0) + 1; return host.stocare.scrie('deschideri', n).then(() => n); })
        .then((n) => { numar = n; }, (e: unknown) => { numar = String((e as Error).message); })
        .then(() => { arata(context()); });
      container.append(titlu, limba, tema, schema, contul, fisier, deschideri, lucru, forme, butoane, rezultate);
    },
  };
}
