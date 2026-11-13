/**
 * Protocolul workerului CAM (ADR 0109): o cerere, un răspuns, numai date (ADR 0015: workerul nu ține nimic între joburi).
 * Documentul pleacă copiat (e text și numere); tablourile mari (octeții programului, mutările simulării, programul IR
 * împachetat) se transferă, nu se copiază (ADR 0014).
 */
import type { IesireFoaie } from '../cam/iesire.ts';
import type { ColtOrigine, Montaj } from '../ir/montaj.ts';
import type { Document } from '../model/document.ts';
import type { CerereReparare, OptiuniReparare } from '../model/reparare.ts';
import type { CerereConversie } from '../model/conversie.ts';
import type { CererePanouri } from '../model/panouri.ts';
import type { CerereTaiere } from '../model/taiere.ts';
import type { OptiuniVerificare } from '../model/verificare.ts';
import type { StrategieScula, Unitati } from '../post/contract.ts';
import type { IdContract } from '../post/contracte/index.ts';
import type { SemifabricatDop } from '../cam/incrustatie.ts';
import type { FisierExportat, ProgramExportat } from '../post/export.ts';
import type { ProgramSimulat } from '../sim/program.ts';
import type { ProgramImpachetat } from './impachetare.ts';
import type { RezumatJob } from './rezumat.ts';

/**
 * Exportul G-code, ca acțiune a registrului (capabilitatea „export-gcode”): documentul → tăieturile (operațiile pieselor,
 * ADR 0025) → profilele → IR → postul GRBL → octeții cu SHA-256. Parametrii tăierii și scula sunt în document; aici
 * rămân doar montajul (colțul de origine, Z0) și confirmarea. Interfața primește doar rezultatul, ca date.
 */
export type ParametriExport = {
  readonly origine: ColtOrigine;
  readonly z0: 'sus' | 'jos';
  /** Postul (ADR 0083): implicit GRBL 1.1. */
  readonly post?: IdContract;
  /** Unitățile programului: implicit mm. */
  readonly unitati?: Unitati;
  /** Cum se schimbă scula (ADR 0084); implicit, cea a postului. */
  readonly strategieScula?: StrategieScula;
  /**
   * Ieșirea din foaie pe care omul a văzut-o și a confirmat-o, așa cum a primit-o de la export. Trece doar dacă e exact cea
   * calculată acum, pe același traseu (amprenta): altă freză, alt profil sau o formă mutată cer o confirmare nouă, chiar
   * cu aceleași numere.
   */
  readonly confirmareIesire?: IesireFoaie;
  /**
   * Cât are voie o tăietură sub fața de jos a foii, în mm (ADR 0028 §2): implicit 0. Dialogul nu-l trimite încă (vine cu
   * profilul mașinii).
   */
  readonly supracursa?: number;
  /**
   * Răspunsul mașinii la `$$`, lipit de om (ADR 0046): estimarea timpului îl pune peste implicitele GRBL 1.1h. Lipsă sau
   * gol: implicitele. Nu schimbă programul, doar rezumatul.
   */
  readonly setariMasina?: string;
  /**
   * „Toate foile” (ADR 0210 §5): câte un program pe foaie, într-o arhivă. Doar pe firul principal: calculul desparte documentul
   * pe foi și cere workerului fiecare foaie ca pe un document doar cu ea, fără steagul acesta.
   */
  readonly toateFoile?: boolean;
};

/** Foaia programului, cum o cere simularea. */
export type FoaieCam = { readonly latime: number; readonly inaltime: number; readonly grosime: number };

/**
 * Dopul unei incrustații (ADR 0170 §3): programul lui, pe semifabricatul lui (XY0 în colțul ales, Z0 pe fața lui), și fișierele
 * de descărcat (unul, sau câte unul pe sculă), cu numele `…-dop-<N>`.
 */
export type DopExportat = {
  readonly element: string; readonly program: ProgramExportat; readonly fisiere: readonly FisierExportat[]; readonly semifabricat: SemifabricatDop;
};

export type CerereCam =
  /** Exportul (fereastra exportului): programul, fișierele, rezumatul, mutările simulării. */
  | { readonly fel: 'export'; readonly document: Document; readonly parametri: ParametriExport }
  /** „Arată traseul” (ADR 0038 §2): programul, împachetat. */
  | { readonly fel: 'traseu'; readonly document: Document }
  /** Vederea 3D (ADR 0057 §1): mutările simulării ale programului documentului. */
  | { readonly fel: 'simulare'; readonly document: Document }
  /** Timpul jobului de lângă traseu (ADR 0046 §8) pentru un program deja calculat, fără CAM. */
  | { readonly fel: 'timp'; readonly program: ProgramImpachetat; readonly foaie: Montaj['foaie']; readonly setari: string | undefined }
  /** Verificarea vectorilor (ADR 0124): problemele contururilor foii, cu ce se poate repara din ele, fără să schimbe documentul. */
  | { readonly fel: 'verificare'; readonly document: Document; readonly optiuni: OptiuniVerificare; readonly indexFoaie?: number }
  /** O reparație a verificării (ADR 0124 §10): piesele schimbate și instanțele de șters, pe documentul cererii. */
  | { readonly fel: 'reparare'; readonly document: Document; readonly cerere: CerereReparare; readonly optiuni: OptiuniReparare; readonly indexFoaie?: number }
  /** Tăierea cu o linie dreaptă (ADR 0180, felia 10.3↑): instanțele tăiate și părțile lor, pe documentul cererii. */
  | { readonly fel: 'taiere'; readonly document: Document; readonly cerere: CerereTaiere; readonly indexFoaie?: number }
  /** Tăierea în panouri (ADR 0181 §7, felia 10.3↑k): degruparea și grupurile panourilor, pe foaia dată a documentului cererii. */
  | { readonly fel: 'panouri'; readonly document: Document; readonly cerere: CererePanouri; readonly indexFoaie?: number }
  /** Conversia vectorilor (ADR 0180, felia 10.3↑d): piesele schimbate (arce, cercuri, dreptunghiuri), pe documentul cererii. */
  | { readonly fel: 'conversie'; readonly document: Document; readonly cerere: CerereConversie; readonly indexFoaie?: number };

export type RaspunsExport =
  | {
    readonly ok: true; readonly program: ProgramExportat; readonly fisiere: readonly FisierExportat[];
    readonly avertismente: readonly string[]; readonly rezumat: RezumatJob;
    /** Dopurile incrustațiilor foii (ADR 0170), câte unul pe regiune, în ordinea tăierii; gol fără incrustații. */
    readonly dopuri: readonly DopExportat[];
    /** Senderul aplicației vorbește controlerului postului (familia GRBL): exportul ajunge și în panoul mașinii (ADR 0125). */
    readonly sender: boolean;
    /** Mutările nucleului simulării (ADR 0047 §3) pentru programul exportat, sau de ce nu se poate simula. */
    readonly simulare: ProgramSimulat; readonly foaie: FoaieCam;
  }
  | { readonly ok: false; readonly motiv: string }
  /** Freza iese din foaie și omul n-a confirmat încă exact ieșirea asta: nu se scrie nimic. */
  | { readonly ok: false; readonly motiv: string; readonly cereConfirmare: IesireFoaie };

export type RaspunsTraseu = { readonly ok: true; readonly program: ProgramImpachetat } | { readonly ok: false; readonly motiv: string };

export type RaspunsSimulare =
  | { readonly ok: true; readonly foaie: FoaieCam; readonly simulare: Extract<ProgramSimulat, { ok: true }> }
  | { readonly ok: false; readonly motiv: string };

export type MesajCam = { readonly id: number; readonly cerere: CerereCam };

export type RaspunsMesajCam =
  | { readonly id: number; readonly ok: true; readonly raspuns: unknown }
  /** Calculul a aruncat (un defect, nu un refuz: refuzurile sunt `ok: false` în răspuns). */
  | { readonly id: number; readonly ok: false; readonly motiv: string };

/**
 * Tablourile de transferat: fiecare o singură dată (același tablou de două ori oprește mesajul) și doar cele care își țin
 * tot bufferul (unul împărțit cu alte date s-ar goli și pentru ele: acela se copiază).
 */
export function deTransferat(vederi: ReadonlyArray<ArrayBufferView | undefined>): ArrayBuffer[] {
  const rez = new Set<ArrayBuffer>();
  for (const v of vederi) {
    if (!v || !(v.buffer instanceof ArrayBuffer) || v.byteOffset !== 0 || v.byteLength !== v.buffer.byteLength) continue;
    rez.add(v.buffer);
  }
  return [...rez];
}

/** Vederile mutărilor unei simulări pregătite (grupul întâi, apoi cele de după schimbări). */
export function vederiSimulare(s: ProgramSimulat): Float64Array[] {
  return s.ok ? [s.mutari, ...(s.apoi ?? []).map((g) => g.mutari)] : [];
}
