/**
 * Intrarea Easy 3Draw (fostul Planificator Trenuleț, ADR 0167) ca extensie a lui cvs2 (ADR 0129, 0161): pagina, din sursele din repo, în cadrul izolat
 * (ADR 0127). Adaptoarele îi dau, prin `HostApi`, ce avea ca pagină:
 * - `window.claude`, ca pe claude.ai: `use('db')`, documentele (`doc`, `collection().doc().id`, `orderBy().onSnapshot`), peste
 *   `host.stocare`, și `use('downloads')`, `save`, peste serviciul `descarcari.salveaza`; pagina le folosește când le are;
 * - `localStorage`, peste `host.stocare` (setările mici: modul, mașinile, frezarea), citit întreg la pornire, scris pe loc;
 * - `window.cvs2` (ADR 0161 §A): gazda, ca pagina să spună adevărul despre unde stau circuitele și să-și arate butoanele
 *   mașinii (cu `masina` doar când senderul e deschis extensiei); `three()` aduce three.js din pachet, la prima intrare în 3D
 *   (ADR 0163): cadrul n-are rețea, iar pe claude.ai pagina îl ia tot la cerere, de pe cdnjs; `cont()` și `laSchimbare`, contul
 *   lui cvs2 (ADR 0164 §B), și `amana`, salvările amânate ale paginii, văzute de cvs2 (ADR 0164 §C);
 * - tema lui cvs2 (ADR 0164 §A): `data-gazda` și `data-theme` pe rădăcina paginii, după tema aleasă în cvs2, pe loc;
 * - lucrul nesalvat (ADR 0164 §C): salvările amânate și scrierile adaptoarelor țin extensia „nesalvată” până se termină; la
 *   închiderea ferestrei, cvs2 le cere pe loc și le așteaptă;
 * - scripturile, în ordinea paginii, ca scripturi clasice din adrese `blob:` (aceeași semantică globală ca în pagină).
 * Cu senderul deschis extensiei (permisiunea `masina`, ADR 0160 §D), „Trimite la cvs2” trimite lucrarea prin `HostApi`, la
 * „Lucrarea primită” din fereastra Mașina, în locul filei noi pe care cadrul n-o poate deschide. Sursele n-au atribute
 * `style` (ADR 0161 §C): CSP-ul moștenit le-ar refuza.
 */
import type { HostApi, Spatiu } from '../api.ts';

const SCRIPTURI = ['limba.js', 'cavalier.js', 'cnc.js', 'gcode.js', 'earcut.js', 'lego.js', 'profiluri.js', 'atelier.js', 'app.js'];
const DB = 'db:';
const LS = 'ls:';
const PROTOCOL = 'cvs2-lucrare';

type Doc = { readonly id: string; data(): unknown };
type Instantaneu = { readonly docs: Doc[]; readonly size: number; readonly empty: boolean };

/** Refuzul gazdei, cu codul pe care îl citește pagina (`quota_exceeded` când stocarea e plină). */
function cuCod(e: unknown): Error {
  const x = e instanceof Error ? e : new Error(String(e));
  return Object.assign(x, { code: x.message === 'stocare:plin' ? 'quota_exceeded' : x.message });
}

/**
 * Lucrul paginii, cât îl vede cvs2 (ADR 0164 §C): salvările amânate ale paginii (`amana`, din `window.cvs2.amana`) și
 * scrierile adaptoarelor în stocare (`urmareste`). Cât e una programată, în zbor sau refuzată (până reușește alta la aceeași
 * cheie), extensia are modificări nesalvate (`host.nesalvat`); la închidere (`host.laInchidere`, prin `goleste`), salvările
 * amânate pornesc pe loc și se așteaptă, cu tot ce pornesc ele, și înlănțuit.
 */
export type Lucru = {
  urmareste<T>(cheie: string, scriere: () => Promise<T>): Promise<T>;
  amana(cheie: string, f: () => unknown, ms: number): void;
  goleste(): Promise<void>;
};

export function lucruPeste(host: HostApi): Lucru {
  const programate = new Map<string, { readonly ceas: ReturnType<typeof setTimeout>; readonly f: () => unknown }>();
  const esuate = new Set<string>(), laGol: (() => void)[] = [];
  let inZbor = 0, anuntat = false, verifica: ReturnType<typeof setTimeout> | null = null;
  // O gazdă dinainte de 3.Xd nu le are: salvările amânate rămân temporizatoare, nimic nu se anunță.
  const cuGazda = typeof host.nesalvat === 'function';
  const acum = (): boolean => programate.size > 0 || inZbor > 0 || esuate.size > 0;
  const anunta = (da: boolean): void => {
    if (da === anuntat) return;
    anuntat = da;
    if (cuGazda) host.nesalvat(da);
  };
  // „Nesalvat” se spune pe loc; „salvat”, abia după un temporizator, cât timp nimic n-a mai pornit: o scriere care pleacă din
  // alta, printr-un lanț de promisiuni, nu lasă o clipă de „salvat” între ele.
  const schimbat = (): void => {
    if (acum()) { anunta(true); return; }
    if (verifica !== null) return;
    verifica = setTimeout(() => { verifica = null; if (!acum()) anunta(false); }, 0);
  };
  const gata = (): void => {
    inZbor--;
    schimbat();
    if (inZbor === 0) for (const r of laGol.splice(0)) r();
  };
  const ruleaza = (cheie: string, f: () => unknown): void => {
    inZbor++;
    schimbat();
    void Promise.resolve().then(f).then(
      () => { esuate.delete(`amanat:${cheie}`); },
      (e: unknown) => { esuate.add(`amanat:${cheie}`); host.raporteaza(e); },
    ).finally(gata);
  };
  const lucru: Lucru = {
    async urmareste<T>(cheie: string, scriere: () => Promise<T>): Promise<T> {
      inZbor++;
      schimbat();
      try {
        const r = await scriere();
        esuate.delete(cheie);
        return r;
      } catch (e) {
        esuate.add(cheie);
        throw e;
      } finally {
        gata();
      }
    },
    amana(cheie, f, ms) {
      const vechi = programate.get(cheie);
      if (vechi) clearTimeout(vechi.ceas);
      programate.set(cheie, { ceas: setTimeout(() => { programate.delete(cheie); ruleaza(cheie, f); }, ms), f });
      schimbat();
    },
    async goleste() {
      for (;;) {
        for (const [cheie, p] of [...programate]) { clearTimeout(p.ceas); programate.delete(cheie); ruleaza(cheie, p.f); }
        if (inZbor > 0) await new Promise<void>((r) => { laGol.push(r); });
        // ce pornește din salvările de acum, într-un lanț de promisiuni, pleacă abia după: încă o tură, după un temporizator
        await new Promise<void>((r) => { setTimeout(r, 0); });
        if (inZbor === 0 && programate.size === 0) break;
      }
      if (verifica !== null) { clearTimeout(verifica); verifica = null; }
      anunta(acum());
    },
  };
  if (typeof host.laInchidere === 'function') host.laInchidere(() => lucru.goleste());
  return lucru;
}

/** O scriere a adaptoarelor, urmărită când e cine s-o vadă (probele adaptoarelor le cheamă și fără). */
const scriere = <T,>(lucru: Lucru | undefined, cheie: string, s: () => Promise<T>): Promise<T> => (lucru ? lucru.urmareste(cheie, s) : s());

/**
 * Tema lui cvs2 pe pagină (ADR 0164 §A): `data-gazda="cvs2"` și `data-theme` (`light` sau `dark`, tema aleasă în cvs2) pe
 * rădăcină, schimbate pe loc; foaia paginii leagă atunci suprafețele, textul, marginile, inelul de focus și fonturile de
 * variabilele lui cvs2, puse de cadru. O gazdă dinainte de 3.Xd (fără `color-scheme`) lasă pagina cu tema ei.
 */
export function temaPeste(host: HostApi, rad: { readonly dataset: DOMStringMap } = document.documentElement): void {
  const pune = (): void => {
    const s = host.tema['color-scheme'];
    if (s !== 'light' && s !== 'dark') return;
    rad.dataset['gazda'] = 'cvs2';
    rad.dataset['theme'] = s;
  };
  pune();
  host.laSchimbare(pune);
}

/**
 * Dicționarul englez al paginii (ADR 0165): în engleză, `texte.en.json` din pachet, ca `window.TexteEN`, înghețat, înaintea
 * scripturilor (`limba.js` îl citește la pornire). În română sau fără fișier, nimic: pagina rămâne românească.
 */
export async function dictionarPeste(host: HostApi, w: Window = window): Promise<void> {
  if (host.limba !== 'en') return;
  const f = host.fisier('texte.en.json');
  if (!f) return;
  const texte = JSON.parse(await f.text()) as Record<string, string>;
  Object.defineProperty(w, 'TexteEN', { value: Object.freeze(texte), configurable: false, writable: false });
}

/**
 * O limbă nouă în cvs2 (ADR 0165): pagina își are limba fixă de la pornire, deci întâi pleacă salvările ei, apoi cere
 * repornirea, o singură dată. O gazdă fără `reporneste` lasă pagina în limba de la pornire.
 */
export function limbaPeste(host: HostApi, lucru: Lucru): void {
  if (typeof host.reporneste !== 'function') return;
  const laPornire = host.limba;
  let ceruta = false;
  host.laSchimbare((c) => {
    if (ceruta || c.limba === laPornire) return;
    ceruta = true;
    void lucru.goleste().then(() => { host.reporneste(); });
  });
}

/** `window.claude`: `use('db')` și `use('downloads')`, ca pe claude.ai. */
export function claudePeste(host: HostApi, lucru?: Lucru): void {
  const ascultatori = new Map<string, Set<() => void>>();
  const anunta = (col: string): void => { for (const f of ascultatori.get(col) ?? []) f(); };
  const idNou = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const docRef = (cale: string) => {
    const [col = '', id = ''] = cale.split('/');
    return {
      id,
      async set(date: unknown): Promise<void> {
        await scriere(lucru, DB + cale, () => host.stocare.scrie(DB + cale, JSON.parse(JSON.stringify(date)) as unknown))
          .catch((e: unknown) => { throw cuCod(e); });
        anunta(col);
      },
      async get(): Promise<{ readonly id: string; readonly exists: boolean; data(): unknown }> {
        const v = await host.stocare.citeste(DB + cale).catch((e: unknown) => { throw cuCod(e); });
        return { id, exists: v !== null, data: () => v };
      },
      async delete(): Promise<void> {
        await scriere(lucru, DB + cale, () => host.stocare.sterge(DB + cale)).catch((e: unknown) => { throw cuCod(e); });
        anunta(col);
      },
    };
  };
  const db = {
    doc: docRef,
    collection: (col: string) => ({
      doc: (id?: string) => docRef(`${col}/${id ?? idNou()}`),
      orderBy: (camp: string, dir: 'asc' | 'desc' = 'asc') => ({
        /** Lista, la abonare și după fiecare scriere în colecție; doar cea mai nouă citire ajunge la pagină. */
        onSnapshot(cb: (s: Instantaneu) => void, eroare?: (e: unknown) => void): () => void {
          let ultima = 0, activ = true;
          const emite = async (): Promise<void> => {
            const nr = ++ultima;
            try {
              const prefix = `${DB}${col}/`;
              const chei = (await host.stocare.chei()).filter((k) => k.startsWith(prefix));
              const docs: Doc[] = await Promise.all(chei.map(async (k) => {
                const v = await host.stocare.citeste(k);
                return { id: k.slice(prefix.length), data: () => v };
              }));
              const val = (d: Doc): string => String((d.data() as Record<string, unknown> | null)?.[camp] ?? '');
              docs.sort((a, b) => (val(a) === val(b) ? 0 : (val(a) < val(b) ? -1 : 1) * (dir === 'desc' ? -1 : 1)));
              if (activ && nr === ultima) cb({ docs, size: docs.length, empty: docs.length === 0 });
            } catch (e) {
              if (activ && nr === ultima) eroare?.(cuCod(e));
            }
          };
          const set = ascultatori.get(col) ?? new Set<() => void>();
          const f = (): void => { void emite(); };
          set.add(f);
          ascultatori.set(col, set);
          f();
          return () => { activ = false; set.delete(f); };
        },
      }),
    }),
  };
  const downloads = {
    async save({ filename, data }: { readonly filename: string; readonly data: unknown }): Promise<void> {
      await host.cere('descarcari.salveaza', filename, data).catch((e: unknown) => { throw cuCod(e); });
    },
  };
  const use = async (c: string): Promise<unknown> => {
    if (c === 'db') return db;
    if (c === 'downloads') return downloads;
    throw Object.assign(new Error(`capabilitatea „${c}” nu există în cvs2`), { code: 'unavailable' });
  };
  Object.defineProperty(window, 'claude', { value: Object.freeze({ use }), configurable: true });
}

/** `localStorage`, cu cheile `ls:` ale stocării, citite la pornire. */
export async function localStoragePeste(host: HostApi, lucru?: Lucru): Promise<void> {
  const m = new Map<string, string>();
  for (const k of (await host.stocare.chei()).filter((x) => x.startsWith(LS))) {
    const v = await host.stocare.citeste(k);
    if (typeof v === 'string') m.set(k.slice(LS.length), v);
  }
  const scrie = (p: Promise<unknown>): void => { void p.catch((e: unknown) => { host.raporteaza(e); }); };
  const ls = {
    getItem: (k: string): string | null => m.get(String(k)) ?? null,
    setItem: (k: string, v: string): void => {
      m.set(String(k), String(v));
      scrie(scriere(lucru, LS + String(k), () => host.stocare.scrie(LS + String(k), String(v))));
    },
    removeItem: (k: string): void => { m.delete(String(k)); scrie(scriere(lucru, LS + String(k), () => host.stocare.sterge(LS + String(k)))); },
    clear: (): void => { for (const k of [...m.keys()]) ls.removeItem(k); },
    key: (i: number): string | null => [...m.keys()][i] ?? null,
    get length(): number { return m.size; },
  };
  Object.defineProperty(window, 'localStorage', { value: ls, configurable: true });
}

/**
 * „Trimite la cvs2” (protocolul „cvs2-lucrare” v1, ADR 0126): pagina deschide cvs2 la `#primeste-lucrare` și vorbește cu fila
 * deschisă. Aici `window.open` întoarce o fereastră imitată: un `MessagePort` (singura sursă pe care o primește un
 * `MessageEvent` făcut în pagină), cu `postMessage` și `closed` proprii. La „cauta” răspunde „gata”; lucrarea pleacă prin
 * `masina.trimite`, iar „primit” vine înapoi ca mesaj de la fereastra imitată, de la originea adresei. Un refuz o „închide”
 * (pagina spune că fila s-a închis) și ajunge în jurnal. Altă adresă: null, ca o filă refuzată de browser.
 */
export function deschiderePeste(host: HostApi, w: Window = window): void {
  const deschide = (url?: string | URL): Window | null => {
    const adresa = String(url ?? '');
    if (!adresa.endsWith('#primeste-lucrare')) return null;
    let origine = 'null';
    try {
      origine = new URL(adresa).origin;
    } catch {
      // O adresă stricată: pagina n-ar fi ajuns aici (o judecă înainte), iar originea rămâne „null”.
    }
    const imitata = new MessageChannel().port1;
    let inchisa = false;
    const raspunde = (data: unknown): void => { w.dispatchEvent(new MessageEvent('message', { data, origin: origine, source: imitata })); };
    Object.defineProperty(imitata, 'closed', { get: () => inchisa });
    Object.defineProperty(imitata, 'postMessage', {
      value: (m: unknown): void => {
        const d = m as { readonly protocol?: unknown; readonly tip?: unknown } | null;
        if (inchisa || !d || typeof d !== 'object' || d.protocol !== PROTOCOL) return;
        if (d.tip === 'cauta') setTimeout(() => { raspunde({ protocol: PROTOCOL, versiune: 1, tip: 'gata', aplicatie: 'CNC Vector Studio 2' }); }, 0);
        else if (d.tip === 'lucrare') {
          host.cere('masina.trimite', m).then(raspunde, (e: unknown) => {
            inchisa = true;
            host.raporteaza(new Error(`Trimite la cvs2: ${e instanceof Error ? e.message : String(e)}`));
          });
        }
      },
    });
    return imitata as unknown as Window;
  };
  Object.defineProperty(w, 'open', { value: deschide, configurable: true, writable: true });
}

/**
 * three.js din pachet (ADR 0163), la prima cerere: un script clasic, ca scripturile paginii, o singură dată. Fără fișier sau
 * dacă scriptul nu se încarcă, null (cu eroarea raportată): atelierul arată atunci de ce lipsește vederea 3D.
 */
function threePeste(host: HostApi, w: Window): () => Promise<unknown> {
  let gata: Promise<unknown> | null = null;
  return () => (gata ??= (async () => {
    const f = host.fisier('js/three.js');
    if (!f) return null;
    await scriptClasic(f, 'three.js');
    return (w as Window & { THREE?: unknown }).THREE ?? null;
  })().catch((e: unknown) => { host.raporteaza(e); return null; }));
}

/**
 * `window.cvs2`: pagina e în cvs2 (ADR 0161 §A). Înghețată și nescriibilă; `masina` e `host.masina` doar cu senderul deschis
 * extensiei, altfel null (pagina nu-și arată atunci butoanele mașinii); `three` aduce three.js din pachet (ADR 0163). Din ADR
 * 0164: `cont()`, contul lui cvs2 (null fără permisiunea `cont`), `laSchimbare(f)`, la o temă, limbă sau cont nou, și
 * `amana(cheie, f, ms)`, salvarea amânată a paginii, pe care cvs2 o vede și o pornește pe loc la închidere.
 */
export function gazdaPeste(host: HostApi, cuMasina: boolean, w: Window = window, lucru: Lucru = lucruPeste(host)): void {
  const cvs2 = {
    gazda: 'cvs2',
    // limba de la pornire, fixă (ADR 0165): la una nouă, pagina repornește (`limbaPeste`)
    limba: host.limba,
    masina: cuMasina ? host.masina : null,
    three: threePeste(host, w),
    cont: () => host.cont ?? null,
    laSchimbare: (f: () => void) => host.laSchimbare(() => { f(); }),
    amana: (cheie: string, f: () => unknown, ms: number): void => { lucru.amana(String(cheie), f, ms); },
    // formele dintre desen și pagină (ADR 0166); o gazdă dinainte de 3.Xe nu le are
    forme: typeof host.forme === 'object' && host.forme !== null ? Object.freeze({
      propune: (nume: string, date: string | Uint8Array) => host.forme.propune(nume, date),
      laPrimire: (f: Parameters<HostApi['forme']['laPrimire']>[0]) => host.forme.laPrimire(f),
    }) : null,
  };
  Object.defineProperty(w, 'cvs2', { value: Object.freeze(cvs2), configurable: false, writable: false });
}

function scriptClasic(b: Blob, nume: string): Promise<void> {
  return new Promise((ok, nu) => {
    const s = document.createElement('script');
    s.src = URL.createObjectURL(new Blob([b], { type: 'text/javascript' }));
    s.onload = () => { URL.revokeObjectURL(s.src); ok(); };
    s.onerror = () => { URL.revokeObjectURL(s.src); nu(new Error(`scriptul ${nume} nu s-a încărcat`)); };
    document.head.append(s);
  });
}

export async function activeaza(host: HostApi): Promise<Spatiu> {
  const lucru = lucruPeste(host);
  claudePeste(host, lucru);
  await localStoragePeste(host, lucru);
  // Fără sender (permisiunea lipsă, instanța live), pagina spune, ca până acum, că fila nouă n-a putut fi deschisă.
  const cuMasina = await host.cere('masina.stare').then(() => true, () => false);
  gazdaPeste(host, cuMasina, window, lucru);
  temaPeste(host);
  await dictionarPeste(host);
  limbaPeste(host, lucru);
  if (cuMasina) deschiderePeste(host);
  return {
    // Promisiunea paginii puse și a scripturilor încărcate: gazda spune „pornit” abia după ea (ADR 0139).
    deschide(container: HTMLElement): Promise<void> {
      return (async () => {
        const corp = host.fisier('body.html');
        if (!corp) throw new Error('lipsește body.html');
        container.innerHTML = await corp.text();
        for (const nume of SCRIPTURI) {
          const f = host.fisier(`js/${nume}`);
          if (!f) throw new Error(`lipsește js/${nume}`);
          await scriptClasic(f, nume);
        }
      })().catch((e: unknown) => { host.raporteaza(e); });
    },
  };
}
