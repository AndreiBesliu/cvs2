import { faraInterogare, PLAFON_ADRESA, PLAFON_MESAJ, PLAFON_SCURT, PLAFON_STIVA, taie, type RaportClient } from '../../shared/erori.ts';
import type { ConfigCloud } from '../cloud/conexiuneBaza.ts';
import type { ModulRaportor, RezultatTrimitere, Trimitere } from '../cloud/raportor.ts';
import type { IntrareEroare, Jurnal } from './jurnalErori.ts';

/**
 * Raportorul de erori, partea din pornire (felia 3.2, ADR 0043): mică și fără Firebase. Ascultă jurnalul local, ține
 * intrările noi ale acestei sesiuni într-o coadă (și pe cele de dinaintea sosirii `config.json`) și, la prima intrare cu
 * configurația cunoscută, aduce la cerere bucata care trimite (`src/cloud/raportor.ts`). Intrările vechi din depozit nu
 * pleacă: n-au build-ul, iar retrimiterea lor ar dubla rapoartele la fiecare încărcare. Nici cele „doar locale” (condițiile
 * mediului omului, ADR 0039 §6): ele nu aduc nimic.
 *
 * Eșecurile raportorului NU intră în jurnal (o eroare de raportare ar produce un raport nou, la nesfârșit): se numără în
 * memorie (`stare()`, în antetul lui „Copiază raportul”), iar consola primește cel mult un avertisment. Tot ce e asincron
 * aici se prinde: o respingere scăpată ar ajunge în jurnal prin `unhandledrejection`.
 */

/** Câte rapoarte pleacă cel mult pe încărcarea paginii (ADR 0039 §5 lasă clientului plafonul lui pe sesiune). */
export const PLAFON_SESIUNE = 20;
/** Câte rapoarte cu aceeași cheie locală (`cheieLocala`) pleacă cel mult pe sesiune. */
export const PLAFON_PE_CHEIE = 3;
/**
 * Coada în așteptare (înaintea configurației sau în spatele unei trimiteri): plafonul pe sesiune o mărginește singur (în
 * coadă intră doar rapoarte acceptate), deci nu are verificare proprie; o a doua verificare, egală, n-ar putea fi probată.
 */
export const PLAFON_COADA = PLAFON_SESIUNE;
/** Pauza dinaintea singurei reîncercări, după o cerere care n-a ajuns. */
export const PAUZA_REINCERCARE_MS = 5_000;
/** Mesajul unui raport fără text (`throw ''`): serverul refuză un mesaj gol, deci eroarea s-ar pierde. */
export const MESAJ_GOL = 'eroare fără mesaj';

/**
 * - `fara-firebase`: configurația nu are Firebase (local) sau n-a putut fi citită;
 * - `fara-conexiune`: conexiunea refuzată (emulatoare în afara gazdei locale) sau aruncată la creare;
 * - `import`: bucata la cerere n-a venit (Edge ține eșecul până la reîncărcare, ADR 0042);
 * - `app-check`: tokenul App Check n-a venit în termenul lui (`enterprise.js` blocat, gol, sau refuzat);
 * - `neautorizat`: 401 / 403 (App Check lipsă sau refuzat; pe test, până la înregistrarea cheii);
 * - `plafon-server`: plafonul de rată al serverului.
 */
export type MotivStins = 'fara-firebase' | 'fara-conexiune' | 'import' | 'app-check' | 'neautorizat' | 'plafon-server';

export interface StareRaportor {
  readonly faza: 'asteapta-config' | 'pornit' | 'stins';
  readonly motiv: MotivStins | null;
  /** Primite de server (`{ ok: true }`). */
  readonly trimise: number;
  /** Refuzate de server: `nevalid`, `plafon`, 401 / 403. */
  readonly refuzate: number;
  /** Eșuate: rețeaua după reîncercare, termenul, o scriere eșuată pe server, un răspuns necunoscut. */
  readonly esuate: number;
  /** Oprite de plafoanele clientului (pe sesiune, pe cheie). */
  readonly pestePlafon: number;
  /** Lăsate fiindcă raportorul e stins (din coadă sau venite după). */
  readonly renuntate: number;
  /** Intrările „doar locale” (condițiile mediului), sărite. */
  readonly locale: number;
  readonly reincercari: number;
  readonly inAsteptare: number;
}

export interface DepsRaportor {
  readonly jurnal: Pick<Jurnal, 'asculta'>;
  /** Bucata care trimite, la cerere (`import('../cloud/raportor.ts')`); cerută cel mult o dată. */
  readonly adu: () => Promise<ModulRaportor>;
  readonly build: string;
  /** Implicit `navigator.userAgent`. */
  readonly browser?: string;
  readonly limba: () => string;
  readonly amana?: (f: () => void, ms: number) => void;
  readonly avertizeaza?: (mesaj: string) => void;
}

export interface Raportor {
  /** Configurația citită (`null`: nevalidă). Doar primul apel contează (fără dublă pornire). */
  porneste(config: ConfigCloud | null): void;
  stare(): StareRaportor;
}

/**
 * Textul trimis, curățat (apărare în adâncime; jurnalul local rămâne neatins): query-ul și fragmentul adreselor http(s)
 * devin „?…”, adresele de e-mail devin `<email>`. Regexurile sunt liniare: adresa se ia întreagă dintr-o trecere și se
 * taie în funcție; e-mailul începe doar la marginea unui cuvânt (privirea înapoi), deci un șir lung nu se rescanează.
 */
export function curataText(s: string): string {
  return s
    .replace(/https?:\/\/[^\s"'`<>()[\]{}]*/g, (a) => {
      const k = a.search(/[?#]/);
      return k < 0 ? a : `${a.slice(0, k)}?…`;
    })
    .replace(/(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '<email>');
}

/** Raportul (`RaportClient`, ADR 0039 §5): doar câmpurile contractului, curățate și tăiate la plafoanele lui. */
export function raportDin(i: IntrareEroare, build: string, browser: string, limba: string): RaportClient {
  const mesaj = curataText(i.mesaj);
  return {
    tip: i.tip,
    mesaj: taie(mesaj.trim() ? mesaj : MESAJ_GOL, PLAFON_MESAJ),
    stiva: taie(curataText(i.stiva), PLAFON_STIVA),
    adresa: taie(faraInterogare(i.adresa), PLAFON_ADRESA),
    build: taie(build, PLAFON_SCURT),
    browser: taie(browser, PLAFON_SCURT),
    limba: taie(limba, PLAFON_SCURT),
  };
}

/**
 * Cheia plafonului pe cheie: tipul și începutul mesajului, cu cifrele înlocuite (un singur regex liniar). Nu e amprenta
 * serverului (`cheieAmprenta`, cu regexurile normalizării, ~90 ms pe un mesaj lung cu cratime: recenzia 17.10); gruparea
 * adevărată rămâne pe server.
 */
export function cheieLocala(tip: string, mesaj: string): string {
  return `${tip}|${mesaj.slice(0, 300).replace(/\d+/g, '0')}`;
}

/** Starea, pe o linie (antetul raportului jurnalului): faza, motivul stingerii, contoarele. */
export function descrieStare({ faza, motiv, ...n }: StareRaportor): string {
  return `${faza}${motiv ? ` (${motiv})` : ''}; ${Object.entries(n).map(([k, v]) => `${k} ${v}`).join(', ')}`;
}

export function creeazaRaportor(deps: DepsRaportor): Raportor {
  const amana = deps.amana ?? ((f: () => void, ms: number) => { setTimeout(f, ms); });
  const avertizeaza = deps.avertizeaza ?? ((m: string) => { console.warn(m); });
  const browser = deps.browser ?? navigator.userAgent;
  let faza: StareRaportor['faza'] = 'asteapta-config';
  let motiv: MotivStins | null = null;
  let config: ConfigCloud | null = null;
  let pornit = false;
  let inLucru = false;
  let avertizat = false;
  let trimitere: Promise<Trimitere | null> | null = null;
  const coada: RaportClient[] = [];
  const peCheie = new Map<string, number>();
  let acceptate = 0;
  const n = { trimise: 0, refuzate: 0, esuate: 0, pestePlafon: 0, renuntate: 0, locale: 0, reincercari: 0 };

  /** Cel mult un avertisment pe sesiune; erorile rămân oricum în jurnalul local. */
  const avertizeazaO = (m: string): void => {
    if (!avertizat) avertizeaza(`raportorul de erori: ${m}`);
    avertizat = true;
  };

  const stinge = (m: MotivStins): void => {
    if (faza === 'stins') return;
    faza = 'stins';
    motiv = m;
    n.renuntate += coada.length;
    coada.length = 0;
    if (m !== 'fara-firebase') avertizeazaO(`stins (${m})`);
  };

  /** Ascultătorul: întâi ce e ieftin (marcajul, starea, plafonul pe sesiune), abia apoi cheia. */
  const primeste = (i: IntrareEroare): void => {
    if (i.doarLocala) {
      n.locale++;
      return;
    }
    if (faza === 'stins') {
      n.renuntate++;
      return;
    }
    if (acceptate >= PLAFON_SESIUNE) {
      n.pestePlafon++;
      return;
    }
    const cheie = cheieLocala(i.tip, i.mesaj);
    const vazute = peCheie.get(cheie) ?? 0;
    if (vazute >= PLAFON_PE_CHEIE) {
      n.pestePlafon++;
      return;
    }
    acceptate++;
    peCheie.set(cheie, vazute + 1);
    coada.push(raportDin(i, deps.build, browser, deps.limba()));
    if (faza === 'pornit') void pompa();
  };

  /** Bucata, conexiunea și tokenul App Check, o singură dată pe sesiune; orice eșec stinge, cu motivul lui. */
  const aduTrimitere = (c: ConfigCloud): Promise<Trimitere | null> => {
    trimitere ??= (async () => {
      let m: ModulRaportor;
      try {
        m = await deps.adu();
      } catch {
        stinge('import');
        return null;
      }
      let t: Trimitere | null = null;
      try {
        t = m.creeazaTrimitere(c);
      } catch {
        t = null;
      }
      if (!t) {
        stinge('fara-conexiune');
        return null;
      }
      if (!(await t.pregateste().catch(() => false))) {
        stinge('app-check');
        return null;
      }
      return t;
    })();
    return trimitere;
  };

  const incearca = async (t: Trimitere, r: RaportClient): Promise<RezultatTrimitere> => {
    try {
      return await t.trimite(r);
    } catch {
      return 'altul';
    }
  };

  const trateaza = (rez: RezultatTrimitere): void => {
    if (rez === 'trimis') {
      n.trimise++;
    } else if (rez === 'nevalid') {
      n.refuzate++;
    } else if (rez === 'plafon') {
      n.refuzate++;
      stinge('plafon-server');
    } else if (rez === 'neautorizat') {
      n.refuzate++;
      stinge('neautorizat');
    } else {
      n.esuate++;
      avertizeazaO(`eșuat (${rez})`);
    }
  };

  /**
   * Trimiterile, pe rând: un răspuns care stinge raportorul oprește și restul cozii. Doar o cerere care n-a ajuns
   * (`retea`) se reîncearcă, o dată; `termen` nu (serverul poate fi scris deja: dublura văzută pe emulator).
   */
  async function pompa(): Promise<void> {
    if (inLucru || faza !== 'pornit' || coada.length === 0 || !config) return;
    inLucru = true;
    try {
      const t = await aduTrimitere(config);
      while (t && faza === 'pornit' && coada.length > 0) {
        const r = coada[0];
        if (!r) break;
        let rez = await incearca(t, r);
        if (rez === 'retea' && faza === 'pornit') {
          n.reincercari++;
          await new Promise<void>((ok) => { amana(ok, PAUZA_REINCERCARE_MS); });
          if (faza !== 'pornit') break;
          rez = await incearca(t, r);
        }
        coada.shift();
        trateaza(rez);
      }
    } catch {
      // Nimic de aici nu aruncă intenționat; o surpriză nu trebuie să ajungă în jurnal.
    } finally {
      inLucru = false;
    }
  }

  deps.jurnal.asculta((noua) => {
    if (noua) primeste(noua);
  });

  return {
    porneste(c) {
      if (pornit) return;
      pornit = true;
      if (!c?.firebase) {
        stinge('fara-firebase');
        return;
      }
      config = c;
      faza = 'pornit';
      void pompa();
    },
    stare: () => ({ faza, motiv, ...n, inAsteptare: coada.length }),
  };
}
