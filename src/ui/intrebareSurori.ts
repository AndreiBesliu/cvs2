/** «Desprinde și taie» sau «Taie piesa» (aceeași uniune ca în `taiereSurori.ts`, fără importul modelului: interfața ajunge la
 * domeniu doar prin acțiuni). */
export type AlegereSurori = 'desprinde' | 'piesa';

/**
 * Întrebarea tăierii și a conversiei unei piese puse de mai multe ori (felia 10.3↑m, ADR 0180): «Desprinde și taie» (principal)
 * sau «Taie piesa» (toate cele N), cu „Ține minte alegerea”. Calculul o cere (`cereAlegerea`) doar când operația chiar ar
 * schimba o asemenea piesă; banda din capul pânzei (`Editare`) o arată și răspunde. Alegerea ținută stă în browser (și se vede,
 * se schimbă sau se uită în rândul „Piesele puse de mai multe ori” al opțiunilor tăierii); „Taie piesa” ținută, la o operație
 * unde nu are sens (decuparea, intersecțiile, retezatul, panourile), întreabă. O stocare care aruncă (navigarea privată)
 * înseamnă „întreabă”.
 */
export const CHEIE_SURORI = 'cncvs2.taiere-surori';

/** Ce se întreabă: de câte ori e pusă piesa, dacă „Taie piesa” are sens și ce operație e (textele benzii). */
export type IntrebareSurori = { readonly n: number; readonly piesa: boolean; readonly fel: 'taie' | 'converteste' };

type Stocare = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function stocareBrowser(): Stocare | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

const ascultatori = new Set<() => void>();
let curenta: { readonly intrebare: IntrebareSurori; readonly raspunde: (a: AlegereSurori | null) => void } | null = null;

const anunta = (): void => { for (const f of ascultatori) f(); };

/** Ascultă întrebarea și alegerea ținută (pentru `useSyncExternalStore`). */
export function ascultaSurori(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

/** Întrebarea de acum, sau null. */
export function intrebareaSurori(): IntrebareSurori | null {
  return curenta?.intrebare ?? null;
}

/** Alegerea ținută, sau null (întreabă). */
export function alegereTinuta(stocare: Stocare | null = stocareBrowser()): AlegereSurori | null {
  try {
    const v = stocare?.getItem(CHEIE_SURORI) ?? null;
    return v === 'desprinde' || v === 'piesa' ? v : null;
  } catch {
    return null;
  }
}

/** Ține minte alegerea (null: o uită, deci aplicația întreabă din nou). */
export function tineAlegerea(a: AlegereSurori | null, stocare: Stocare | null = stocareBrowser()): void {
  try {
    if (a === null) stocare?.removeItem(CHEIE_SURORI);
    else stocare?.setItem(CHEIE_SURORI, a);
  } catch {
    // Fără stocare: doar cât e deschisă fila.
  }
  anunta();
}

/**
 * Alegerea pentru o operație: cea ținută, dacă are sens aici; altfel întrebarea (o întrebare de dinainte, încă deschisă, se
 * închide: răspunsul ei e null). `semnal` anulat (o altă tăiere, panoul închis) închide întrebarea. Null: omul a renunțat.
 */
export function cereAlegerea(i: IntrebareSurori, semnal?: AbortSignal): Promise<AlegereSurori | null> {
  const t = alegereTinuta();
  if (t === 'desprinde' || (t === 'piesa' && i.piesa)) return Promise.resolve(t);
  curenta?.raspunde(null);
  return new Promise((gata) => {
    const aceasta = {
      intrebare: i,
      raspunde: (a: AlegereSurori | null): void => {
        if (curenta !== aceasta) return;
        curenta = null;
        semnal?.removeEventListener('abort', renunta);
        anunta();
        gata(a);
      },
    };
    const renunta = (): void => { aceasta.raspunde(null); };
    curenta = aceasta;
    if (semnal?.aborted) {
      renunta();
      return;
    }
    semnal?.addEventListener('abort', renunta);
    anunta();
  });
}

/** Răspunsul benzii: alegerea (cu „Ține minte alegerea”, și ținută) sau null (Renunță, altă alegere a formelor). */
export function raspundeSurori(a: AlegereSurori | null, tine = false): void {
  if (!curenta) return;
  if (a !== null && tine) tineAlegerea(a);
  curenta.raspunde(a);
}
