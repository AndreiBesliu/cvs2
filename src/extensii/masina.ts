/**
 * Senderul extensiilor (ADR 0199 §B), partea gazdei: serviciul `masina.*` al lui `HostApi`, cu permisiunea `masina`, oprit pe
 * instanța live. Argumentele se judecă aici (numele unui program, datele, plafonul); restul îl face fereastra Mașina, prin
 * învelișul ei (`MasinaPentruExtensii`): verificările lui „Fișier…”, confirmarea omului la pornire și la reluare, pauza,
 * oprirea. Lucrarea trimisă (`masina.trimite`) trece prin dialogul primirii (ADR 0126), spre „Lucrarea primită”.
 */
import type { MasinaPentruExtensii, RezultatMasina, StareMasinaExtensie } from '../app/lucrare.ts';
import { caBlob, numeDescarcare } from './descarcari.ts';
import type { RaspunsServiciu } from './stocare.ts';

/** Cât poate avea un program încărcat de o extensie: ca un fișier al unei lucrări primite (ADR 0126). */
export const OCTETI_PROGRAM = 32 * 1024 * 1024;
/** Tipurile pe care le alege și „Fișier…” din fereastra Mașina. */
const TIPURI_PROGRAM: readonly string[] = ['nc', 'gcode', 'ngc', 'tap', 'txt'];
/** Starea fără fereastra Mașina: nicio sesiune încă, deci nici legătură (conectarea se face doar acolo). */
export const FARA_MASINA: StareMasinaExtensie = { conectata: false, faza: 'liber', indicator: null, program: null };

export type ExtensieMasina = { readonly id: string; readonly nume: string; readonly permisiuni: readonly string[] };
export type ServiciiMasina = {
  /** Senderul e deschis extensiilor: în afara instanței live (ADR 0199 §B, ca primirea, ADR 0126 §D). */
  readonly activ: boolean;
  /** Învelișul ferestrei Mașina, dacă e montată. */
  readonly masina: () => MasinaPentruExtensii | null;
  /** Același, după ce fereastra Mașina se montează (ascunsă), dacă n-a fost deschisă; null dacă nu vine. */
  readonly asteapta: () => Promise<MasinaPentruExtensii | null>;
  /** Lucrarea, prin dialogul primirii: mesajul `primit` (și „renuntat”), sau null pentru o lucrare fără forma protocolului. */
  readonly trimite: (lucrare: unknown, ext: ExtensieMasina) => Promise<unknown>;
};

const refuz = (cod: string): RaspunsServiciu => ({ ok: false, eroare: `masina:${cod}` });
const din = (r: RezultatMasina): RaspunsServiciu => (r.ok ? { ok: true, rezultat: r.rezultat } : refuz(r.cod));

/** Numele unui program: curățat ca la descărcări, cu un tip G-code; altfel null. */
function numeProgram(x: unknown): string | null {
  const n = numeDescarcare(x);
  const tip = n === null ? undefined : /\.([a-z0-9]+)$/i.exec(n)?.[1]?.toLowerCase();
  return tip !== undefined && TIPURI_PROGRAM.includes(tip) ? n : null;
}

/** O cerere `masina.<metoda>` a extensiei `ext`. */
export async function servesteMasina(ext: ExtensieMasina, metoda: string, argumente: readonly unknown[], s: ServiciiMasina): Promise<RaspunsServiciu> {
  if (!ext.permisiuni.includes('masina')) return refuz('permisiune');
  if (!s.activ) return refuz('live');
  switch (metoda) {
    case 'stare':
      return { ok: true, rezultat: s.masina()?.stare() ?? FARA_MASINA };
    case 'incarca': {
      const nume = numeProgram(argumente[0]);
      if (nume === null) return refuz('nume');
      const date = caBlob(argumente[1]);
      if (date === null) return refuz('date');
      if (date.size > OCTETI_PROGRAM) return refuz('prea-mare');
      const octeti = new Uint8Array(await date.arrayBuffer());
      const m = await s.asteapta();
      return m ? din(await m.incarca(nume, octeti, ext.nume)) : refuz('indisponibila');
    }
    case 'porneste':
    case 'reia': {
      // Fără fereastra Mașina nu există sesiune, deci nici legătură: nimic de pornit sau de reluat.
      const m = s.masina();
      return m ? din(await m[metoda](ext.nume)) : refuz('neconectat');
    }
    case 'pauza':
    case 'opreste': {
      const m = s.masina();
      return m ? din(m[metoda]()) : refuz('neconectat');
    }
    case 'trimite': {
      const r = await s.trimite(argumente[0], ext);
      return r === null ? refuz('lucrare') : { ok: true, rezultat: r };
    }
    default:
      return refuz('necunoscut');
  }
}
