/**
 * Intrarea Planificatorului Trenuleț ca extensie a lui cvs2 (ADR 0129, 0161): pagina, din sursele din repo, în cadrul izolat
 * (ADR 0127). Adaptoarele îi dau, prin `HostApi`, ce avea ca pagină:
 * - `window.claude`, ca pe claude.ai: `use('db')`, documentele (`doc`, `collection().doc().id`, `orderBy().onSnapshot`), peste
 *   `host.stocare`, și `use('downloads')`, `save`, peste serviciul `descarcari.salveaza`; pagina le folosește când le are;
 * - `localStorage`, peste `host.stocare` (setările mici: modul, mașinile, frezarea), citit întreg la pornire, scris pe loc;
 * - `window.cvs2` (ADR 0161 §A): gazda, ca pagina să spună adevărul despre unde stau circuitele și să-și arate butoanele
 *   mașinii (cu `masina` doar când senderul e deschis extensiei);
 * - scripturile, în ordinea paginii, ca scripturi clasice din adrese `blob:` (aceeași semantică globală ca în pagină).
 * Cu senderul deschis extensiei (permisiunea `masina`, ADR 0160 §D), „Trimite la cvs2” trimite lucrarea prin `HostApi`, la
 * „Lucrarea primită” din fereastra Mașina, în locul filei noi pe care cadrul n-o poate deschide. Sursele n-au atribute
 * `style` (ADR 0161 §C): CSP-ul moștenit le-ar refuza.
 */
import type { HostApi, Spatiu } from '../api.ts';

const SCRIPTURI = ['cavalier.js', 'cnc.js', 'gcode.js', 'earcut.js', 'lego.js', 'profiluri.js', 'atelier.js', 'app.js'];
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

/** `window.claude`: `use('db')` și `use('downloads')`, ca pe claude.ai. */
export function claudePeste(host: HostApi): void {
  const ascultatori = new Map<string, Set<() => void>>();
  const anunta = (col: string): void => { for (const f of ascultatori.get(col) ?? []) f(); };
  const idNou = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const docRef = (cale: string) => {
    const [col = '', id = ''] = cale.split('/');
    return {
      id,
      async set(date: unknown): Promise<void> {
        await host.stocare.scrie(DB + cale, JSON.parse(JSON.stringify(date)) as unknown).catch((e: unknown) => { throw cuCod(e); });
        anunta(col);
      },
      async get(): Promise<{ readonly id: string; readonly exists: boolean; data(): unknown }> {
        const v = await host.stocare.citeste(DB + cale).catch((e: unknown) => { throw cuCod(e); });
        return { id, exists: v !== null, data: () => v };
      },
      async delete(): Promise<void> {
        await host.stocare.sterge(DB + cale).catch((e: unknown) => { throw cuCod(e); });
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
export async function localStoragePeste(host: HostApi): Promise<void> {
  const m = new Map<string, string>();
  for (const k of (await host.stocare.chei()).filter((x) => x.startsWith(LS))) {
    const v = await host.stocare.citeste(k);
    if (typeof v === 'string') m.set(k.slice(LS.length), v);
  }
  const scrie = (p: Promise<unknown>): void => { void p.catch((e: unknown) => { host.raporteaza(e); }); };
  const ls = {
    getItem: (k: string): string | null => m.get(String(k)) ?? null,
    setItem: (k: string, v: string): void => { m.set(String(k), String(v)); scrie(host.stocare.scrie(LS + String(k), String(v))); },
    removeItem: (k: string): void => { m.delete(String(k)); scrie(host.stocare.sterge(LS + String(k))); },
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
 * `window.cvs2`: pagina e în cvs2 (ADR 0161 §A). Înghețată și nescriibilă; `masina` e `host.masina` doar cu senderul deschis
 * extensiei, altfel null (pagina nu-și arată atunci butoanele mașinii).
 */
export function gazdaPeste(host: HostApi, cuMasina: boolean, w: Window = window): void {
  Object.defineProperty(w, 'cvs2', { value: Object.freeze({ gazda: 'cvs2', masina: cuMasina ? host.masina : null }), configurable: false, writable: false });
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
  claudePeste(host);
  await localStoragePeste(host);
  // Fără sender (permisiunea lipsă, instanța live), pagina spune, ca până acum, că fila nouă n-a putut fi deschisă.
  const cuMasina = await host.cere('masina.stare').then(() => true, () => false);
  gazdaPeste(host, cuMasina);
  if (cuMasina) deschiderePeste(host);
  return {
    deschide(container: HTMLElement): void {
      void (async () => {
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
