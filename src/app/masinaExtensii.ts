/**
 * Senderul pentru extensii (ADR 0199 §B, §E), partea ferestrei Mașina, fără React: starea pe care o vede o extensie și ce se
 * poate face acum, din aceeași stare a sesiunii ca indicatorul lucrării (ADR 0132 §5), apoi învelișul pe care fereastra
 * (`PanouMasina.tsx`) îl dă gazdei extensiilor: verificările lui „Fișier…”, confirmarea omului la pornire și la reluare,
 * legată de programul și de starea arătate, pauza și oprirea.
 */
import { inFlux, refuzStart } from '../machine/flux.ts';
import { indicatorLucrare, lucrareInceputa } from '../machine/indicator.ts';
import { incarcaProgram } from '../machine/program.ts';
import type { SesiuneMasina, StareSesiune } from '../machine/sesiune.ts';
import type { CerereConfirmare } from './ConfirmareMasina.tsx';
import type { MasinaPentruExtensii, RezultatMasina, StareMasinaExtensie } from './lucrare.ts';

/** Starea pentru extensie: legătura, faza, indicatorul fără culoare și buton, programul cu numele dat de cine l-a încărcat. */
export function stareMasina(st: StareSesiune, nume: string | null): StareMasinaExtensie {
  const i = indicatorLucrare(st);
  const p = st.flux.program;
  return {
    conectata: st.conexiune === 'conectat',
    faza: st.flux.faza,
    indicator: i ? { fel: i.fel, procent: i.procent, linie: i.linie, cod: i.cod } : null,
    program: p ? { nume, sha256: p.sha256, linii: p.linii.length } : null,
  };
}

/** De ce nu poate porni programul acum (null: se poate întreba omul): contul (ADR 0116 §9), legătura, apoi fluxul. */
export function refuzPornire(st: StareSesiune, permis: boolean): string | null {
  if (!permis) return 'fara-capabilitate';
  if (st.conexiune !== 'conectat') return 'neconectat';
  return refuzStart(st.flux);
}

/**
 * Ce face „reia” acum: din Hold, eliberarea (ca Reia din indicator); după o eroare, reluarea de la prima linie netrimisă.
 * O barieră (M0, M1, M6) se continuă din fereastra Mașina, după pasul făcut la mașină; alarma cere deblocarea, tot acolo.
 */
export function reluarea(st: StareSesiune):
  | { readonly ok: true; readonly eveniment: 'eliberare' | 'reia' }
  | { readonly ok: false; readonly cod: 'neconectat' | 'alarma' | 'bariera' | 'nimic' } {
  if (st.conexiune !== 'conectat') return { ok: false, cod: 'neconectat' };
  const i = indicatorLucrare(st);
  if (i?.fel === 'alarma') return { ok: false, cod: 'alarma' };
  if (i?.buton === 'reia') return { ok: true, eveniment: 'eliberare' };
  if (i?.fel === 'suspendata') return { ok: true, eveniment: 'reia' };
  if (st.flux.faza === 'bariera') return { ok: false, cod: 'bariera' };
  return { ok: false, cod: 'nimic' };
}

/** De ce nu se poate pune pauză acum (null: se poate): doar cât rulează, ca Pauza din indicator. */
export function pauzaPosibila(st: StareSesiune): 'neconectat' | 'nimic' | null {
  if (st.conexiune !== 'conectat') return 'neconectat';
  return indicatorLucrare(st)?.buton === 'pauza' ? null : 'nimic';
}

/** Ce îi trebuie învelișului din sesiune. */
export type SesiuneInvelis = Pick<SesiuneMasina, 'stare' | 'aboneaza' | 'eveniment'>;
/** Ce îi trebuie din fereastra Mașina, citit la fiecare cerere, nu la montare. */
export type FereastraInvelis = {
  /** Numele programului de acum, cum îl arată fereastra. */
  readonly nume: () => string | null;
  /** Contul permite pornirea programului (ADR 0116 §9). */
  readonly permis: () => boolean;
  /** Arată confirmarea care așteaptă omul, sau o închide (null). */
  readonly confirmare: (c: CerereConfirmare | null) => void;
  /** Un program încărcat de o extensie: fereastra îl arată cu numele lui, „de la” ea. */
  readonly incarcat: (nume: string, extensie: string) => void;
  /** O pornire confirmată prin WiFi: omul a văzut avertismentul căderii legăturii. */
  readonly avertizat: () => void;
};

/** Numărul ultimei confirmări: fiecare își are fereastra ei (și întârzierea butonului). */
let nrConfirmare = 0;

/** Învelișul senderului pentru extensii: o singură confirmare așteaptă odată. */
export function invelisMasina(s: SesiuneInvelis, f: FereastraInvelis): MasinaPentruExtensii {
  let cerere: CerereConfirmare | null = null;
  const intreaba = (fel: CerereConfirmare['fel'], extensie: string): Promise<RezultatMasina> => new Promise((rezolva) => {
    if (cerere) { rezolva({ ok: false, cod: 'ocupat' }); return; }
    const st0 = s.stare();
    let eveniment: CerereConfirmare['eveniment'] = 'start';
    if (fel === 'porneste') {
      const cod = refuzPornire(st0, f.permis());
      if (cod) { rezolva({ ok: false, cod }); return; }
    } else {
      const r = reluarea(st0);
      if (!r.ok) { rezolva({ ok: false, cod: r.cod }); return; }
      eveniment = r.eveniment;
    }
    const program = st0.flux.program;
    if (!program) { rezolva({ ok: false, cod: 'fara-program' }); return; }
    const c: CerereConfirmare = {
      nr: ++nrConfirmare, fel, extensie, program, nume: f.nume(), eveniment, linie: st0.flux.urm + 1, wifi: st0.transport === 'retea',
      raspunde: (da) => {
        if (cerere !== c) return;
        cerere = null;
        f.confirmare(null);
        if (!da) { rezolva({ ok: false, cod: 'renuntat' }); return; }
        // Confirmarea e a programului și a stării arătate: un alt program sau altă reluare între timp n-o folosesc.
        const acum = s.stare();
        if (acum.flux.program !== program) { rezolva({ ok: false, cod: 'schimbat' }); return; }
        if (fel === 'porneste') {
          const cod = refuzPornire(acum, f.permis());
          if (cod) { rezolva({ ok: false, cod }); return; }
          if (acum.transport === 'retea') f.avertizat();
          s.eveniment({ tip: 'start' });
          rezolva(inFlux(s.stare().flux.faza) ? { ok: true, rezultat: null } : { ok: false, cod: 'faza' });
          return;
        }
        const r = reluarea(acum);
        if (!r.ok) { rezolva({ ok: false, cod: r.cod }); return; }
        if (r.eveniment !== eveniment) { rezolva({ ok: false, cod: 'schimbat' }); return; }
        s.eveniment({ tip: r.eveniment });
        rezolva({ ok: true, rezultat: null });
      },
    };
    cerere = c;
    f.confirmare(c);
  });
  // Cât așteaptă o confirmare, programul arătat omului rămâne cel încărcat; cât e pornită o lucrare, la fel.
  const ocupat = (): RezultatMasina | null => (cerere
    ? { ok: false, cod: 'ocupat' }
    : lucrareInceputa(s.stare().flux.faza) ? { ok: false, cod: 'in-lucru' } : null);
  return {
    stare: () => stareMasina(s.stare(), f.nume()),
    aboneaza: (g) => s.aboneaza(g),
    incarca: async (nume, octeti, extensie) => {
      const inainte = ocupat();
      if (inainte) return inainte;
      const rez = await incarcaProgram(octeti, { sursa: 'fisier' });
      if (!rez.ok) return { ok: false, cod: `program:${rez.cod}${rez.linie === null ? '' : `:${rez.linie + 1}`}` };
      const dupa = ocupat();
      if (dupa) return dupa;
      s.eveniment({ tip: 'incarca', program: rez.program });
      if (s.stare().flux.program !== rez.program) return { ok: false, cod: 'faza' };
      f.incarcat(nume, extensie);
      return { ok: true, rezultat: { nume, sha256: rez.program.sha256, linii: rez.program.linii.length } };
    },
    porneste: (extensie) => intreaba('porneste', extensie),
    reia: (extensie) => intreaba('reia', extensie),
    pauza: () => {
      const cod = pauzaPosibila(s.stare());
      if (cod) return { ok: false, cod };
      s.eveniment({ tip: 'hold' });
      return { ok: true, rezultat: null };
    },
    opreste: () => {
      if (s.stare().conexiune !== 'conectat') return { ok: false, cod: 'neconectat' };
      s.eveniment({ tip: 'opreste' });
      return { ok: true, rezultat: null };
    },
    anuleaza: (extensie) => { if (cerere && (extensie === undefined || cerere.extensie === extensie)) cerere.raspunde(false); },
  };
}
