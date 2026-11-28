/**
 * Protocolul workerului CAM (ADR 0109): o cerere, un răspuns, numai date (ADR 0015: workerul nu ține nimic între joburi).
 * Documentul pleacă copiat (e text și numere); tablourile mari (octeții programului, mutările simulării, programul IR
 * împachetat) se transferă, nu se copiază (ADR 0014).
 */
import type { IesireFoaie } from '../cam/iesire.ts';
import type { CoteRelief } from '../cam/job.ts';
import type { CerereCote } from '../cam/reliefFinisare.ts';
import type { Montaj, OrigineXY } from '../ir/montaj.ts';
import type { Document } from '../model/document.ts';
import type { ResurseRelief } from '../relief/resurse.ts';
import type { CerereReparare, OptiuniReparare } from '../model/reparare.ts';
import type { CerereConversie } from '../model/conversie.ts';
import type { CerereLegare, OptiuniLegare } from '../model/legareCai.ts';
import type { CererePanouri } from '../model/panouri.ts';
import type { CerereTaiere } from '../model/taiere.ts';
import type { OptiuniVerificare } from '../model/verificare.ts';
import type { StrategieScula, Unitati } from '../post/contract.ts';
import type { IdContract } from '../post/contracte/index.ts';
import type { SemifabricatDop } from '../cam/incrustatie.ts';
import type { FisierExportat, ProgramExportat } from '../post/export.ts';
import type { PotrivireV } from '../sim/potrivire.ts';
import type { PotrivireDreapta } from '../sim/potrivireDreapta.ts';
import type { PotrivireTrepte } from '../sim/potrivireTrepte.ts';
import type { ProgramSimulat } from '../sim/program.ts';
import type { ProgramImpachetat } from './impachetare.ts';
import type { RezumatJob } from './rezumat.ts';

/**
 * Exportul G-code, ca acțiune a registrului (capabilitatea „export-gcode”): documentul → tăieturile (operațiile pieselor,
 * ADR 0025) → profilele → IR → postul GRBL → octeții cu SHA-256. Parametrii tăierii și scula sunt în document; aici
 * rămân doar montajul (colțul de origine, Z0) și confirmarea. Interfața primește doar rezultatul, ca date.
 */
export type ParametriExport = {
  readonly origine: OrigineXY;
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
   * Cât are voie o tăietură sub fața de jos a foii, în mm (ADR 0028 §2): implicit 0. Îl trimite fereastra exportului (ADR 0176):
   * gaura incrustației și decupările dopurilor trec cu atât sub plăcile lor, iar o adâncime scrisă poate trece de foaie cu atât.
   */
  readonly supracursa?: number;
  /**
   * Z-ul sigur, mm deasupra feței de sus a foii (ADR 0291 §3, felia 28.8↑p): înălțimea rapidelor, în foaie și în dopuri.
   * Lipsă: 5 mm, programul de dinainte, octet cu octet. Marginile: `src/cam/regimExport.ts`.
   */
  readonly zSigur?: number;
  /**
   * Parcarea de la final (ADR 0291 §3, felia 28.8↑p): un punct în coordonatele programului (față de XY0), mm. Postul îl scrie
   * ca `G0 X Y` după `M5`, în fiecare fișier. Lipsă: freza rămâne deasupra ultimei tăieturi, ca până acum.
   */
  readonly parcare?: { readonly x: number; readonly y: number };
  /**
   * Baza numelor fișierelor aleasă de om (ADR 0291 §5): pusă în locul lui `cncvs2-<colț>` pe firul principal, după calcul
   * (`cuBaza`, `src/post/numeFisier.ts`); workerul n-o folosește. Lipsă = numele de azi.
   */
  readonly numeFisier?: string;
  /**
   * Bifa de lângă supracursă (ADR 0177): și tăieturile scrise cât grosimea foii (profil, buzunar, găurire, fără incrustație)
   * trec cu supracursa, ca scrise grosime plus supracursă. Lipsă: nu (exporturile de dinainte rămân aceleași).
   */
  readonly prinFoaie?: boolean;
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

/**
 * Un dop al foii, cum îl alege vederea 3D (ADR 0178): elementul primei tăieturi a regiunii lui și semifabricatul lui. Orice dop
 * are „Împreună (secțiunea)” (ADR 0179: în V, cu pereți drepți și, din felia 12.1↑e-4, în trepte).
 */
export type DopSimulat = { readonly element: string; readonly semifabricat: SemifabricatDop };

/**
 * O parte desprinsă (ADR 0210, felia 11.3↑c): un contur tăiat prin foaie de un profil exterior cu urechi, la care, la capătul
 * programului, nu mai ajunge niciun pic de lemn legat de marginea foii. Instanța, elementul în lume și mijlocul cutiei lui.
 */
/** O piesă desprinsă (ADR 0210, 11.3↑c): instanța, elementul în lume, operația care o taie (`piesă/operație`) și locul spus omului. */
export type ParteDesprinsa = { readonly instanta: string; readonly element: string; readonly operatie: string; readonly x: number; readonly y: number };

/**
 * Cererile cu un program (exportul, traseul, simularea) aduc și `reliefuri`: hărțile straturilor vizibile ale reliefurilor
 * finisate pe foaie și octeții dalelor lor (ADR 0310 §3, ADR 0312), citite de firul principal din baza lor; workerul face
 * compusul. Fără ele, o finisare se refuză cu motivul ei. Cu `cote` (felia 18.1↑h-8), cotele liniilor reliefului vin făcute de
 * bazinul cotelor (cererile `cote-plan` și `cote`), după cheia operației.
 */
export type CerereCam =
  /** Exportul (fereastra exportului): programul, fișierele, rezumatul, mutările simulării. */
  | { readonly fel: 'export'; readonly document: Document; readonly parametri: ParametriExport; readonly reliefuri?: ResurseRelief; readonly cote?: CoteRelief }
  /** „Arată traseul” (ADR 0038 §2): programul, împachetat. */
  | { readonly fel: 'traseu'; readonly document: Document; readonly reliefuri?: ResurseRelief; readonly cote?: CoteRelief }
  /** Vederea 3D (ADR 0057 §1): mutările simulării ale programului documentului, sau ale dopului cu numărul `dop` (ADR 0178). */
  | { readonly fel: 'simulare'; readonly document: Document; readonly dop?: number; readonly reliefuri?: ResurseRelief; readonly cote?: CoteRelief }
  /** „Împreună (secțiunea)” (ADR 0179): dopul cu numărul `dop` (în V, drept sau în trepte) în locașul lui, cu potrivirea măsurată. */
  | { readonly fel: 'potrivire'; readonly document: Document; readonly dop: number; readonly reliefuri?: ResurseRelief; readonly cote?: CoteRelief }
  /** Planul cotelor (felia 18.1↑h-8): loturile operațiilor reliefului de pe foaie, în cel mult `fire` pe relief. */
  | { readonly fel: 'cote-plan'; readonly document: Document; readonly fire: number; readonly reliefuri?: ResurseRelief }
  /** Cotele unui lot (felia 18.1↑h-8), fără document: cererea lotului e de sine stătătoare. */
  | { readonly fel: 'cote'; readonly cerere: CerereCote }
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
  | { readonly fel: 'conversie'; readonly document: Document; readonly cerere: CerereConversie; readonly indexFoaie?: number }
  /** Legarea căilor (ADR 0182, felia 10.3↑o): piesele schimbate și instanțele de șters, pe documentul cererii. */
  | { readonly fel: 'legare'; readonly document: Document; readonly cerere: CerereLegare; readonly optiuni: OptiuniLegare; readonly indexFoaie?: number };

/** Planul cotelor: loturile fiecărei operații a reliefului, după cheia ei (`cheieRelief`). */
export type RaspunsCotePlan = { readonly loturi: readonly { readonly cheie: string; readonly cereri: readonly CerereCote[] }[] };

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
    /** Proba urechilor (felia 11.3↑c): părțile cu urechi care se desprind de foaie; gol fără ele, sau fără simulare. */
    readonly desprinse: readonly ParteDesprinsa[];
  }
  | { readonly ok: false; readonly motiv: string }
  /** Freza iese din foaie și omul n-a confirmat încă exact ieșirea asta: nu se scrie nimic. */
  | { readonly ok: false; readonly motiv: string; readonly cereConfirmare: IesireFoaie };

/** Traseul (ADR 0038 §2), cu centrele urechilor „unde ține” (ADR 0211, b), în lume: semnele lor de pe pânză. */
export type RaspunsTraseu =
  | { readonly ok: true; readonly program: ProgramImpachetat; readonly urechiLemn?: readonly { readonly x: number; readonly y: number }[] }
  | { readonly ok: false; readonly motiv: string };

export type RaspunsSimulare =
  | {
    readonly ok: true; readonly foaie: FoaieCam; readonly simulare: Extract<ProgramSimulat, { ok: true }>;
    /** Dopurile foii, în ordinea exportului (ADR 0178); gol fără incrustații, sau cu `motivDopuri`: de ce nu se pot tăia. */
    readonly dopuri: readonly DopSimulat[]; readonly motivDopuri?: string;
  }
  | { readonly ok: false; readonly motiv: string };

/** Potrivirea simulată a unui dop (ADR 0179: în V, cu pereți drepți sau în trepte), sau de ce nu se poate măsura. */
export type RaspunsPotrivire = { readonly ok: true; readonly potrivire: PotrivireV | PotrivireDreapta | PotrivireTrepte } | { readonly ok: false; readonly motiv: string };

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
