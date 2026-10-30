import { exportInBazin, simulareInBazin, timpInBazin, traseuInBazin } from '../jobs/bazinCam.ts';
import { fireImplicite, simuleazaInBazin, SimulareAnulata } from '../jobs/bazin.ts';
import { despacheteaza, impacheteaza } from '../jobs/impachetare.ts';
import type { Program } from '../ir/ir.ts';
import type { Montaj } from '../ir/montaj.ts';
import type { Document } from '../model/document.ts';
import { reliefPentru } from '../sim/banda.ts';
import { campPentruFoaie, dimensiuni, type ParametriCamp } from '../sim/camp.ts';
import type { DateScula, GrupSimulare } from '../sim/nucleu.ts';
import type { ProgramSimulat } from '../sim/program.ts';
import type { FereastraRelief, ParametriExport, ProgramSimulare, ReliefSimulat, RezultatExport, RezumatJob, SimulareExport } from './actiuniExportTipuri.ts';

// Cine cheamă calculul își recunoaște anularea (nu se arată) și workerul căzut (merge în jurnal).
export { CalculAnulat, LucratorCazut } from '../jobs/bazinCam.ts';

/**
 * Exportul propriu-zis (documentul → profilele → IR → postul ales, ADR 0083 → octeții cu SHA-256), în workerul CAM (ADR
 * 0109): firul principal primește doar octeții, rezumatul și mutările simulării, transferate. Se încarcă la cerere.
 * `semnal` anulează calculul (un export nou, un parametru schimbat, fereastra închisă): workerul se oprește.
 */
export async function calculeazaExport(doc: Document, p: ParametriExport, semnal?: AbortSignal): Promise<RezultatExport> {
  const r = await exportInBazin(doc, p, semnal ? { semnal } : {});
  if (!r.ok) return r;
  const { simulare, foaie, ...rest } = r;
  return { ...rest, simulare: (s) => simuleazaExport(simulare, foaie, s) };
}

/**
 * Simularea programului exportat (ADR 0047 §5): mutările nucleului (IR-ul, în coordonatele documentului, pregătit în
 * workerul CAM), pe toată foaia, la 0,25 mm, în bazinul de workere. Un refuz sau un worker căzut nu oprește exportul:
 * dialogul spune de ce lipsește simularea.
 */
export async function simuleazaExport(
  p: ProgramSimulat, foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number }, semnal?: AbortSignal,
): Promise<SimulareExport> {
  if (!p.ok) return { ok: false, motiv: p.motiv, eroare: false };
  const camp = campPentruFoaie(foaie), d = dimensiuni(camp.celula, camp.latime, camp.inaltime);
  try {
    const r = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, ...(p.apoi ? { apoi: p.apoi } : {}), fund: -foaie.grosime }, fireImplicite(), semnal ? { semnal } : {});
    return {
      ok: true, amprenta: r.amprenta, volum: r.volum, adancimeMax: r.adancimeMax, prinFoaie: r.prinFoaie, grosime: foaie.grosime,
      celula: camp.celula, celule: [d.nx, d.ny],
      fire: r.fire, ms: r.ms, previzualizare: { latime: r.previzualizare.latime, inaltime: r.previzualizare.inaltime, z: r.previzualizare.z },
    };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    return e instanceof SimulareAnulata ? { ok: false, motiv, eroare: false, anulata: true } : { ok: false, motiv, eroare: true };
  }
}

/** Ce ține `ProgramSimulare.date`: scula și mutările nucleului (IR-ul, în coordonatele documentului), cu grupurile de după schimbări. */
type DateSimulare = { readonly scula: DateScula; readonly mutari: Float64Array; readonly apoi?: readonly GrupSimulare[] };

/**
 * Programul documentului pentru vederea 3D (ADR 0057 §1): același CAM ca traseul și exportul (fără supracursă), apoi
 * mutările nucleului, cu fața plăcii la Z 0, în workerul CAM (ADR 0109); simularea, în bazin. `semnal` anulează calculul
 * (un document schimbat, vederea închisă): promisiunea e respinsă cu `CalculAnulat`.
 */
export async function programSimulare(doc: Document, semnal?: AbortSignal): Promise<ProgramSimulare> {
  const r = await simulareInBazin(doc, semnal ? { semnal } : {});
  if (!r.ok) return r;
  const { scula, mutari, apoi } = r.simulare;
  const date: DateSimulare = { scula, mutari, ...(apoi ? { apoi } : {}) };
  return { ok: true, foaie: r.foaie, date };
}

/** Fereastra plăcii întregi, la celula implicită (sau dublată, peste plafonul celulelor: ADR 0047 §1). */
export function fereastraFoii(foaie: { readonly latime: number; readonly inaltime: number }): FereastraRelief {
  const c = campPentruFoaie(foaie);
  return { x0: c.x0, y0: c.y0, latime: c.latime, inaltime: c.inaltime, celula: c.celula };
}

/**
 * Relieful unei ferestre (ADR 0057 §2, §4): placa întreagă, sau o parte a ei la 0,1 mm; în bazinul de workere, cu
 * anularea vederii (un document schimbat, o fereastră nouă, vederea închisă). Ca la simularea exportului, `eroare` = s-a
 * stricat ceva (merge în jurnal); un refuz sau o anulare nu.
 */
export async function simuleazaRelief(
  program: Extract<ProgramSimulare, { ok: true }>, fereastra: FereastraRelief, semnal?: AbortSignal,
): Promise<ReliefSimulat> {
  const { scula, mutari, apoi } = program.date as DateSimulare;
  const camp: ParametriCamp = { ...fereastra, sus: 0 };
  const relief = reliefPentru(camp);
  if (!relief) return { ok: false, motiv: `fereastra de ${fereastra.latime} × ${fereastra.inaltime} mm nu încape în relief la ${fereastra.celula} mm`, eroare: false };
  try {
    const r = await simuleazaInBazin({ camp, scula, mutari, ...(apoi ? { apoi } : {}), fund: -program.foaie.grosime, relief }, fireImplicite(), semnal ? { semnal } : {});
    if (!r.relief) return { ok: false, motiv: 'simularea n-a întors relieful', eroare: true };
    return {
      ok: true, fereastra, latime: r.relief.latime, inaltime: r.relief.inaltime, bloc: r.relief.bloc, z: r.relief.z, sus: r.sus,
      fund: r.fund, adancimeMax: r.adancimeMax, prinFoaie: r.prinFoaie, fire: r.fire, ms: r.ms,
    };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    return e instanceof SimulareAnulata ? { ok: false, motiv, eroare: false, anulata: true } : { ok: false, motiv, eroare: true };
  }
}

/**
 * Programul documentului pentru traseu (ADR 0038 §2), în workerul CAM (ADR 0109), despachetat pe firul principal pentru
 * stratul traseului și animație. `semnal` anulează calculul (un document schimbat, un „Arată traseul” nou): promisiunea e
 * respinsă cu `CalculAnulat`.
 */
export async function programTraseu(doc: Document, semnal?: AbortSignal): Promise<{ readonly ok: true; readonly program: Program } | { readonly ok: false; readonly motiv: string }> {
  const r = await traseuInBazin(doc, semnal ? { semnal } : {});
  return r.ok ? { ok: true, program: despacheteaza(r.program) } : r;
}

/**
 * Timpul jobului de lângă traseu (ADR 0046 §8), în workerul CAM: programul traseului prin același post și același contract
 * ca exportul, cu montajul stânga-jos și Z0 sus, apoi rezumatul (`timpProgram` din `src/jobs/rezumat.ts`). Programul și
 * mașina lui vin cu rezumatul: animația traseului (ADR 0099) pornește din cipul timpului.
 */
export async function timpTraseu(program: Program, foaie: Montaj['foaie'], setari: string | undefined, semnal?: AbortSignal): Promise<RezumatJob> {
  const r = await timpInBazin(impacheteaza(program), foaie, setari, semnal ? { semnal } : {});
  return r.ok ? { ...r, traseu: { program, foaie, setari } } : r;
}
