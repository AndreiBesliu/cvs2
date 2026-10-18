import type { Axa } from './ir.ts';

/**
 * Profilul mașinii (ADR 0046): ce știe controlerul despre mecanică, ca DATE, în unitățile lui `$$`, ca senderul să-l
 * poată citi direct de la mașină (etapa 3). Îl folosesc estimarea timpului (`src/sim/timp.ts`) și, mai târziu, postul și
 * senderul; stă în `ir` fiindcă e singurul strat pe care îl pot importa toți trei (`PLAN.md` §3.3).
 */
export type AxaMasina = {
  /** `$100`–`$103`: pași pe milimetru. */
  readonly pasiPeMm: number;
  /** `$110`–`$113`: viteza maximă a axei, în mm/min. */
  readonly vitezaMaxima: number;
  /** `$120`–`$123`: accelerația axei, în mm/s² (GRBL o ține intern în mm/min²). */
  readonly acceleratie: number;
};

export type ProfilMasina = {
  readonly nume: string;
  /** `implicit`: datele profilului, neschimbate; `setari`: cu valorile citite din răspunsul mașinii la `$$`. */
  readonly sursa: 'implicit' | 'setari';
  /** Axele pe care le are mașina (T22): v1 cere X, Y și Z; A doar dacă există. */
  readonly axe: { readonly [K in Axa]?: AxaMasina };
  /** `$11`: devierea la joncțiune, în mm (0 = oprire în fiecare colț). */
  readonly deviatieJonctiune: number;
  /** `$12`: toleranța arcului, în mm: săgeata maximă a segmentelor în care controlerul taie un G2 / G3. */
  readonly toleranteArc: number;
  /** Constantele compilate în firmware (nu apar în `$$`): se schimbă doar cu alt profil. */
  readonly firmware: {
    /** Câte blocuri de mișcare ține planificatorul cel mult, cu cel care se execută (fereastra lookahead-ului). */
    readonly blocuriPlanificator: number;
    /** Pasul pauzei G4, în secunde: pauza se rotunjește în sus la un multiplu al lui. */
    readonly pasPauza: number;
    /** Viteza minimă la joncțiune, în mm/min. */
    readonly vitezaMinimaJonctiune: number;
    /** Avansul minim al unui bloc, în mm/min. */
    readonly avansMinim: number;
  };
};

export type RezultatSetari =
  /** `citite`: câte setări ale profilului a găsit în text. */
  | { readonly ok: true; readonly profil: ProfilMasina; readonly citite: number }
  /** `linie`: linia textului (de la 1), sau 0 când greșeala e a textului întreg. */
  | { readonly ok: false; readonly motiv: string; readonly linie: number };

type CampAxa = keyof AxaMasina;

/** Setările din `$$` pe care le citește profilul: numărul, unde ajung, și dacă 0 e o valoare validă. */
const SETARI_AXE: ReadonlyArray<readonly [number, CampAxa]> = [[100, 'pasiPeMm'], [110, 'vitezaMaxima'], [120, 'acceleratie']];
const AXE_SETARI: readonly Axa[] = ['X', 'Y', 'Z', 'A'];

/**
 * Răspunsul mașinii la `$$` peste un profil de bază: liniile `$N=valoare` (formatul 1.1; și cel vechi, cu comentariul în
 * paranteze) înlocuiesc câmpurile profilului; restul liniilor (`ok`, mesajele, setările care nu privesc mișcarea) se
 * ignoră. O valoare care nu e un număr finit pozitiv (`$11` poate fi și 0) sau o setare scrisă de două ori refuză tot
 * textul, cu linia: un profil pe jumătate greșit ar strica estimarea fără să se vadă. Axa A intră doar întreagă.
 */
export function profilDinSetari(text: string, baza: ProfilMasina): RezultatSetari {
  const valori = new Map<number, number>();
  const linii = text.split(/\r?\n/);
  for (const [i, brut] of linii.entries()) {
    const m = /^\s*\$(\d+)\s*=\s*([^\s(]*)\s*(\(.*\))?\s*$/.exec(brut);
    if (!m) continue;
    const numarSetare = Number(m[1]);
    if (!esteSetareProfil(numarSetare)) continue;
    const textValoare = m[2] ?? '';
    const v = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(textValoare) ? Number(textValoare) : Number.NaN;
    const zeroValid = numarSetare === 11;
    if (!Number.isFinite(v) || v < 0 || (v === 0 && !zeroValid)) {
      return { ok: false, motiv: `$${numarSetare} = „${textValoare}”: ${zeroValid ? 'trebuie să fie un număr ≥ 0' : 'trebuie să fie un număr pozitiv'}`, linie: i + 1 };
    }
    if (valori.has(numarSetare)) return { ok: false, motiv: `$${numarSetare} e scris de două ori`, linie: i + 1 };
    valori.set(numarSetare, v);
  }
  if (valori.size === 0) {
    return { ok: false, motiv: 'textul nu conține nicio setare de mișcare ($11, $12, $100–$123): e răspunsul la `$$`?', linie: 0 };
  }
  const axe: { [K in Axa]?: AxaMasina } = { ...baza.axe };
  for (const [k, axa] of AXE_SETARI.entries()) {
    const existenta = baza.axe[axa];
    const scrise = SETARI_AXE.map(([n]) => valori.has(n + k));
    if (!existenta && scrise.some(Boolean) && !scrise.every(Boolean)) {
      const lipsa = SETARI_AXE.filter(([n]) => !valori.has(n + k)).map(([n]) => `$${n + k}`).join(', ');
      const prima = linii.findIndex((l) => SETARI_AXE.some(([n]) => new RegExp(`^\\s*\\$${n + k}\\s*=`).test(l)));
      return { ok: false, motiv: `axa ${axa} e scrisă doar pe jumătate (lipsesc ${lipsa})`, linie: prima + 1 };
    }
    if (!existenta && !scrise.some(Boolean)) continue;
    const noua: { -readonly [C in CampAxa]: number } = existenta ? { ...existenta } : { pasiPeMm: 0, vitezaMaxima: 0, acceleratie: 0 };
    for (const [n, camp] of SETARI_AXE) {
      const v = valori.get(n + k);
      if (v !== undefined) noua[camp] = v;
    }
    axe[axa] = noua;
  }
  return {
    ok: true,
    citite: valori.size,
    profil: {
      ...baza,
      sursa: 'setari',
      axe,
      deviatieJonctiune: valori.get(11) ?? baza.deviatieJonctiune,
      toleranteArc: valori.get(12) ?? baza.toleranteArc,
    },
  };
}

function esteSetareProfil(n: number): boolean {
  return n === 11 || n === 12 || SETARI_AXE.some(([baza]) => n >= baza && n < baza + AXE_SETARI.length);
}
