/**
 * Bazinul CAM (ADR 0109, ADR 0015): fiecare calcul (exportul, traseul, simularea 3D, timpul) are workerul lui, oprit la
 * capăt: la răspuns, la eroare, la anulare sau la termen. Un calcul nou al aceluiași lucru îl anulează pe cel vechi prin
 * semnal (un document schimbat, un export nou, fereastra închisă): workerul vechi se oprește din mijlocul calculului.
 * Cererea pleacă copiată, răspunsul vine cu tablourile transferate (ADR 0014).
 *
 * În Node (testele, fără `Worker`), același calcul rulează în proces, prin aceeași graniță: cererea și răspunsul trec prin
 * `structuredClone`, cu transferul lor, ca între fire. În codul construit ramura aceea nu există (`__CNCVS2_CONSTRUIT__`,
 * din `vite.config.ts`): CAM-ul stă doar în worker, nu și pe firul principal (poarta din `scripts/build-determinist.ts`).
 */
import type { Montaj } from '../ir/montaj.ts';
import { numara, type Document } from '../model/document.ts';
import type { ResurseRelief } from '../relief/resurse.ts';
import type { CerereReparare, OptiuniReparare, RezultatReparare, VerificarePanou } from '../model/reparare.ts';
import type { CerereLegare, OptiuniLegare, RezultatLegare } from '../model/legareCai.ts';
import type { CerereConversie, RezultatConversie } from '../model/conversie.ts';
import type { CererePanouri } from '../model/panouri.ts';
import type { CerereTaiere, RezultatTaiere } from '../model/taiere.ts';
import type { OptiuniVerificare } from '../model/verificare.ts';
import type { RaspunsCalcul } from './calculCam.ts';
import type { ProgramImpachetat } from './impachetare.ts';
import { transferabileProgram } from './impachetare.ts';
import type { CerereCam, MesajCam, ParametriExport, RaspunsExport, RaspunsMesajCam, RaspunsPotrivire, RaspunsSimulare, RaspunsTraseu } from './protocolCam.ts';
import { spuneCalculul } from './observatorCalcul.ts';
import type { RezumatJob } from './rezumat.ts';

/** Cât așteaptă bazinul un calcul CAM (bun-simț: pe 2 304 de forme, exportul întreg ține ~1,5 s pe firul principal). */
export const TERMEN_CAM_MS = 180_000;

export type OptiuniCam = {
  /** Anularea calculului: workerul se oprește, promisiunea e respinsă cu `CalculAnulat`. */
  readonly semnal?: AbortSignal;
  /** Cât așteaptă bazinul, în ms (implicit `TERMEN_CAM_MS`). */
  readonly termenMs?: number;
};

/** Un calcul anulat: nu e o defecțiune, nu se trece în jurnal. */
export class CalculAnulat extends Error {
  override readonly name = 'CalculAnulat';
  constructor() { super('calculul a fost anulat'); }
}

/** Workerul CAM a căzut, a tăcut peste termen sau a trimis ceva necitibil: o defecțiune, de trecut în jurnal. */
export class LucratorCazut extends Error {
  override readonly name = 'LucratorCazut';
}

/** Un worker pe calcul, oprit la capătul lui. */
function inWorker(cerere: CerereCam, transfer: Transferable[], semnal: AbortSignal | undefined, termenMs: number): Promise<unknown> {
  return new Promise((rezolva, respinge) => {
    let gata = false;
    const w = new Worker(new URL('./lucratorCam.ts', import.meta.url), { type: 'module', name: `cam-${cerere.fel}` });
    const anuleaza = (): void => { cade(new CalculAnulat()); };
    const termen = setTimeout(() => { cade(new LucratorCazut(`calculul CAM n-a răspuns în ${Math.round(termenMs / 1000)} s`)); }, termenMs);
    function termina(): void {
      gata = true;
      clearTimeout(termen);
      semnal?.removeEventListener('abort', anuleaza);
      w.terminate();
    }
    function cade(e: Error): void {
      if (gata) return;
      termina();
      respinge(e);
    }
    semnal?.addEventListener('abort', anuleaza);
    w.onmessage = (e: MessageEvent<RaspunsMesajCam>) => {
      if (gata) return;
      termina();
      if (e.data.ok) rezolva(e.data.raspuns);
      else respinge(new Error(e.data.motiv));
    };
    w.onerror = (e) => { e.preventDefault(); cade(new LucratorCazut(`workerul CAM a căzut: ${e.message || 'fără mesaj'}`)); };
    w.onmessageerror = () => { cade(new LucratorCazut('workerul CAM a trimis un mesaj necitibil')); };
    const m: MesajCam = { id: 1, cerere };
    w.postMessage(m, transfer);
  });
}

/** În Node, fără `Worker`: același calcul, în proces, cu cererea și răspunsul trecute prin granița unui mesaj. */
async function inProces(cerere: CerereCam, transfer: Transferable[], semnal: AbortSignal | undefined): Promise<unknown> {
  const { raspunde } = await import('./calculCam.ts');
  const primit = structuredClone(cerere, { transfer });
  if (semnal?.aborted) throw new CalculAnulat();
  let r: RaspunsCalcul;
  try {
    r = await raspunde(primit);
  } catch (e) {
    // Ca workerul: o excepție a calculului ajunge doar ca motiv.
    throw new Error(e instanceof Error ? e.message : String(e));
  }
  if (semnal?.aborted) throw new CalculAnulat();
  return structuredClone(r.raspuns, { transfer: r.transfer });
}

/** Formele documentului, pentru utilizarea aplicației; un document stricat nu le are (calculul îl refuză el, cu motivul lui). */
function formele(d: Document): number | undefined {
  try {
    return numara(d).elementeLume;
  } catch {
    return undefined;
  }
}

async function calculeaza(cerere: CerereCam, transfer: Transferable[], o: OptiuniCam): Promise<unknown> {
  if (o.semnal?.aborted) throw new CalculAnulat();
  // Utilizarea aplicației (ADR 0262, A.8d): durata, rezultatul și formele documentului, numărate înainte de plecarea cererii.
  const pornit = performance.now();
  const forme = 'document' in cerere ? formele(cerere.document) : undefined;
  const spune = (rez: 'ok' | 'eroare' | 'anulat'): void => {
    spuneCalculul({ fel: cerere.fel, ms: performance.now() - pornit, rez, ...(forme === undefined ? {} : { forme }) });
  };
  try {
    const r = typeof __CNCVS2_CONSTRUIT__ === 'undefined' && typeof Worker === 'undefined'
      ? await inProces(cerere, transfer, o.semnal)
      : await inWorker(cerere, transfer, o.semnal, o.termenMs ?? TERMEN_CAM_MS);
    spune('ok');
    return r;
  } catch (e) {
    spune(e instanceof CalculAnulat ? 'anulat' : 'eroare');
    throw e;
  }
}

/** Exportul (fereastra exportului): programul, fișierele, rezumatul și mutările simulării. */
export function exportInBazin(document: Document, parametri: ParametriExport, o: OptiuniCam = {}, reliefuri?: ResurseRelief): Promise<RaspunsExport> {
  return calculeaza({ fel: 'export', document, parametri, ...(reliefuri ? { reliefuri } : {}) }, [], o) as Promise<RaspunsExport>;
}

/** Programul traseului, împachetat. */
export function traseuInBazin(document: Document, o: OptiuniCam = {}, reliefuri?: ResurseRelief): Promise<RaspunsTraseu> {
  return calculeaza({ fel: 'traseu', document, ...(reliefuri ? { reliefuri } : {}) }, [], o) as Promise<RaspunsTraseu>;
}

/** Mutările simulării programului documentului, sau ale dopului cu numărul `dop` (ADR 0178), pentru vederea 3D. */
export function simulareInBazin(document: Document, o: OptiuniCam = {}, dop?: number, reliefuri?: ResurseRelief): Promise<RaspunsSimulare> {
  return calculeaza({ fel: 'simulare', document, ...(dop !== undefined ? { dop } : {}), ...(reliefuri ? { reliefuri } : {}) }, [], o) as Promise<RaspunsSimulare>;
}

/** „Împreună (secțiunea)” (ADR 0179): potrivirea dopului cu numărul `dop` (de la 0), în V sau drept; secțiunea vine transferată. */
export function potrivireInBazin(document: Document, dop: number, o: OptiuniCam = {}, reliefuri?: ResurseRelief): Promise<RaspunsPotrivire> {
  return calculeaza({ fel: 'potrivire', document, dop, ...(reliefuri ? { reliefuri } : {}) }, [], o) as Promise<RaspunsPotrivire>;
}

/** Timpul unui program deja calculat; programul împachetat se transferă (cel dat nu mai e folosibil după apel). */
export function timpInBazin(program: ProgramImpachetat, foaie: Montaj['foaie'], setari: string | undefined, o: OptiuniCam = {}): Promise<RezumatJob> {
  return calculeaza({ fel: 'timp', program, foaie, setari }, transferabileProgram(program), o) as Promise<RezumatJob>;
}

/** Verificarea vectorilor (ADR 0124): problemele contururilor foii (sau ale formelor alese), cu ce se poate repara din ele. */
export function verificareInBazin(document: Document, optiuni: OptiuniVerificare, o: OptiuniCam = {}, indexFoaie = 0): Promise<VerificarePanou> {
  return calculeaza({ fel: 'verificare', document, optiuni, indexFoaie }, [], o) as Promise<VerificarePanou>;
}

/** O reparație a verificării (ADR 0124 §10), pe documentul dat. */
export function reparareInBazin(document: Document, cerere: CerereReparare, optiuni: OptiuniReparare, o: OptiuniCam = {}, indexFoaie = 0): Promise<RezultatReparare> {
  return calculeaza({ fel: 'reparare', document, cerere, optiuni, indexFoaie }, [], o) as Promise<RezultatReparare>;
}

/** Tăierea cu o linie dreaptă (ADR 0180, felia 10.3↑), pe documentul dat: instanțele tăiate și părțile lor. */
export function taiereInBazin(document: Document, cerere: CerereTaiere, o: OptiuniCam = {}, indexFoaie = 0): Promise<RezultatTaiere> {
  return calculeaza({ fel: 'taiere', document, cerere, indexFoaie }, [], o) as Promise<RezultatTaiere>;
}

/** Tăierea în panouri (ADR 0181 §7, felia 10.3↑k), pe foaia dată a documentului: degruparea și panourile de grupat. */
export function panouriInBazin(document: Document, cerere: CererePanouri, o: OptiuniCam = {}, indexFoaie = 0): Promise<RezultatTaiere> {
  return calculeaza({ fel: 'panouri', document, cerere, indexFoaie }, [], o) as Promise<RezultatTaiere>;
}

/** Conversia vectorilor (ADR 0180, felia 10.3↑d), pe documentul dat: piesele schimbate. */
export function conversieInBazin(document: Document, cerere: CerereConversie, o: OptiuniCam = {}, indexFoaie = 0): Promise<RezultatConversie> {
  return calculeaza({ fel: 'conversie', document, cerere, indexFoaie }, [], o) as Promise<RezultatConversie>;
}

/** Legarea căilor (ADR 0182, felia 10.3↑o), pe documentul dat: piesele schimbate și instanțele de șters. */
export function legareInBazin(document: Document, cerere: CerereLegare, optiuni: OptiuniLegare, o: OptiuniCam = {}, indexFoaie = 0): Promise<RezultatLegare> {
  return calculeaza({ fel: 'legare', document, cerere, optiuni, indexFoaie }, [], o) as Promise<RezultatLegare>;
}
