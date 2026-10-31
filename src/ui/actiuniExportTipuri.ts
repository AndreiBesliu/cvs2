import type { IesireFoaie } from '../cam/iesire.ts';
import { RAZA_INTRARE_MINIMA, RAZA_INTRARE_MINIMA_RAMPA } from '../cam/intrariMinima.ts';
import { RAMPA_MINIMA } from '../cam/rampaMinima.ts';
import { PLAFON, type Document, type Latura, COBORARE_MINIME, UNGHI_COBORARE_MAXIM, RETRAGERE_COMPLETA_MAXIMA, UNGHI_V_MAXIM, UNGHI_V_MINIM } from '../model/document.ts';
export type { Coborare } from '../model/document.ts';
// Implicitele frezei în V și ale pasului lateral, comune ferestrei exportului și rolului din panou (ADR 0112).
export { pasLateralImplicit, UNGHI_V_IMPLICIT } from '../model/document.ts';
import type { StrategieScula } from '../post/contract.ts';
import { CONTRACTE, ID_CONTRACTE, type IdContract } from '../post/contracte/index.ts';
import type { FisierExportat, ProgramExportat } from '../post/export.ts';
export type { IdContract } from '../post/contracte/index.ts';
export type { StrategieScula, Unitati } from '../post/contract.ts';
export type { FisierExportat } from '../post/export.ts';

export type { Depasire } from '../geom/cutie.ts';
export type { IesireFoaie } from '../cam/iesire.ts';

/**
 * Marginile valorilor unei operații (schema v3, ADR 0025), pentru dialogul de export: ce scrie el în document trebuie să
 * treacă de ușă la redeschidere. Interfața le citește de aici, nu din model (regula `interfata-prin-actiuni`).
 */
export const MARGINI_OPERATIE = {
  diametru: PLAFON.diametruScula, numarScula: PLAFON.numarScula, adancime: PLAFON.adancimeOperatie, urechi: PLAFON.urechi, latimeUreche: PLAFON.latura,
  grosimeUreche: PLAFON.grosime, lungimeRampa: PLAFON.latura, lungimeRampaMinima: RAMPA_MINIMA,
  razaIntrare: PLAFON.latura, razaIntrareMinima: RAZA_INTRARE_MINIMA, razaIntrareMinimaRampa: RAZA_INTRARE_MINIMA_RAMPA,
  // Coborârea în buzunar (ADR 0076): unghiul, zigzagul și raza elicei, cu pragurile lucrării.
  unghiCoborare: UNGHI_COBORARE_MAXIM, unghiCoborareMinim: COBORARE_MINIME.unghi, lungimeZigzag: PLAFON.latura,
  lungimeZigzagMinima: COBORARE_MINIME.lungime, razaElice: PLAFON.diametruScula, razaEliceMinima: COBORARE_MINIME.raza,
  // Găurirea (ADR 0087): la al câtelea pas iese freza din gaură, un întreg 1–100.
  retragereCompleta: RETRAGERE_COMPLETA_MAXIMA,
  // Freza în V (ADR 0090): unghiul inclus, în grade.
  unghiV: UNGHI_V_MAXIM, unghiVMinim: UNGHI_V_MINIM,
} as const;

/**
 * Posturile din fereastra exportului (ADR 0083): id-ul, numele și dacă e probat pe o mașină (toate câmpurile contractului
 * „probate”); unul doar documentat poartă o notă.
 */
export const POSTURI_EXPORT: readonly {
  readonly id: IdContract; readonly nume: string; readonly probat: boolean;
  /** Strategiile schimbării sculei pe care le acceptă controlerul (ADR 0083), cu cea implicită întâi. */
  readonly strategii: readonly StrategieScula[];
}[] = ID_CONTRACTE.map((id) => {
  const k = CONTRACTE[id];
  return {
    id, nume: k.nume, probat: Object.values(k.surse).every((s) => s.stare === 'probat'),
    strategii: [k.scula.implicita, ...k.scula.acceptate.filter((x) => x !== k.scula.implicita)],
  };
});

/** Latura unei operații de profil, cum o arată dialogul (ADR 0037 §2). */
export type LaturaExport = Latura;

const LATURI_INCHISE: readonly LaturaExport[] = ['exterior', 'interior', 'pe-linie'];
const LATURI_O_CALE: readonly LaturaExport[] = ['pe-linie', 'stanga', 'dreapta'];
const LATURI_DESCHISE: readonly LaturaExport[] = ['pe-linie'];

/**
 * Laturile pe care dialogul le oferă unui rând (ADR 0037 §12): ce nu refuză exportul. Pe un rând doar cu contururi închise
 * (`deschise` = 0), exterior / interior / pe linie. Pe un rând cu o singură cale, deschisă (`noduri` = `deschise` = 1),
 * pe linie, stânga și dreapta. Pe mai multe căi deschise sau pe un rând amestecat, doar pe linie: fiecare cale și-ar avea
 * partea după sensul ei întâmplător din fișier (latura pe fiecare cale vine cu panoul, 2.8). Latura scrisă deja în
 * document rămâne în listă, ca rândul s-o arate cum e (exportul o refuză cu motiv, iar omul o poate schimba).
 */
export function laturiOferite(deschise: number, noduri: number, curenta: LaturaExport): readonly LaturaExport[] {
  const l = deschise === 0 ? LATURI_INCHISE : deschise === 1 && noduri === 1 ? LATURI_O_CALE : LATURI_DESCHISE;
  return l.includes(curenta) ? l : [...l, curenta];
}

/**
 * Parametrii exportului și rezumatul jobului: definiți lângă calculul lor, în workerul CAM (ADR 0109,
 * `src/jobs/protocolCam.ts`, `src/jobs/rezumat.ts`); interfața le citește de aici, ca tipuri.
 */
import type { ParametriExport } from '../jobs/protocolCam.ts';
import type { RezumatJob } from '../jobs/rezumat.ts';
export type { ParametriExport } from '../jobs/protocolCam.ts';
export type { RezumatJob, TimpPortiune } from '../jobs/rezumat.ts';

/**
 * Simularea programului exportat (ADR 0047 §5): nucleul pe CPU, în bazinul de workere, pe toată foaia. Interfața primește
 * doar rezumatul: previzualizarea (cel mai jos Z pe bloc de celule, rândul 0 jos), volumul, adâncimea, amprenta. Ca la
 * timp, `ok: false` nu oprește exportul, doar spune de ce lipsește simularea: `eroare` = s-a stricat ceva (un worker
 * căzut, termenul; merge în jurnal), altfel programul nu se poate simula încă (un refuz cu motiv) sau jobul a fost anulat.
 */
export type SimulareExport =
  | {
    readonly ok: true;
    /** Amprenta câmpului (16 cifre hexa): aceeași în Node și în orice browser, pe oricâte fire. */
    readonly amprenta: string;
    /** Volumul scos din foaie, în mm³. */
    readonly volum: number;
    /** Cât a coborât scula sub fața plăcii, în mm (poate trece de grosime: prin foaie). */
    readonly adancimeMax: number;
    readonly prinFoaie: boolean;
    readonly grosime: number;
    readonly celula: number;
    /** Celulele grilei, pe X și pe Y. */
    readonly celule: readonly [number, number];
    readonly fire: number;
    readonly ms: number;
    /** Previzualizarea: `latime` × `inaltime` pixeli, `z` pe pixel (rândul 0 = marginea de jos a foii). */
    readonly previzualizare: { readonly latime: number; readonly inaltime: number; readonly z: Float32Array };
  }
  | { readonly ok: false; readonly motiv: string; readonly eroare: boolean; readonly anulata?: true };

/** Fereastra unui relief, în mm, cu celula ei (ADR 0057 §4): placa întreagă la celula implicită, sau o parte la 0,1 mm. */
export type FereastraRelief = {
  readonly x0: number; readonly y0: number; readonly latime: number; readonly inaltime: number; readonly celula: number;
};

/**
 * Programul documentului, pregătit pentru vederea 3D (ADR 0057 §1): CAM-ul și mutările nucleului, o dată; fiecare relief
 * (placa, apoi ferestrele fine) le refolosește. Mutările sunt opace pentru interfață: le citește doar calculul.
 */
export type ProgramSimulare =
  | { readonly ok: true; readonly foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number }; readonly date: unknown }
  | { readonly ok: false; readonly motiv: string };

/**
 * Un relief simulat (ADR 0057 §2): `z` pe pixel, rândul 0 jos; pixelul (i, j) acoperă celulele [i·bloc, (i+1)·bloc) ×
 * [j·bloc, (j+1)·bloc) ale ferestrei. La `bloc` 1, pixelii sunt celulele nucleului.
 */
export type ReliefSimulat =
  | {
    readonly ok: true; readonly fereastra: FereastraRelief; readonly latime: number; readonly inaltime: number; readonly bloc: number;
    readonly z: Float32Array; readonly sus: number; readonly fund: number; readonly adancimeMax: number; readonly prinFoaie: boolean;
    readonly fire: number; readonly ms: number;
  }
  | { readonly ok: false; readonly motiv: string; readonly eroare: boolean; readonly anulata?: true };

export type RezultatExport =
  /** `avertismente`: ce s-a făcut altfel decât s-a cerut, fără să fie o greșeală (intrarea omisă, ADR 0030 §3). */
  | {
    readonly ok: true; readonly program: ProgramExportat; readonly avertismente: readonly string[]; readonly rezumat: RezumatJob;
    /** Fișierele de descărcat: unul, sau câte unul pe sculă (ADR 0084); `program` e primul. */
    readonly fisiere: readonly FisierExportat[];
    /**
     * Simularea, pornită de aplicație DUPĂ descărcare (recenzia 19.10: descărcarea aștepta simularea, până la 10 s pe o
     * foaie mare și un fir); semnalul o anulează (un export nou, un parametru schimbat, dialogul închis).
     */
    readonly simulare: (semnal: AbortSignal) => Promise<SimulareExport>;
  }
  | { readonly ok: false; readonly motiv: string }
  /** Freza iese din foaie și omul n-a confirmat încă exact ieșirea asta: nu se scrie nimic. */
  | { readonly ok: false; readonly motiv: string; readonly cereConfirmare: IesireFoaie };

export type ContextExport = {
  readonly document: () => Document;
  readonly parametri: () => ParametriExport;
  /** Anularea calculului (ADR 0109): workerul CAM se oprește din mijlocul lui. */
  readonly semnal?: () => AbortSignal;
  readonly rezultat: (r: RezultatExport) => void;
};
