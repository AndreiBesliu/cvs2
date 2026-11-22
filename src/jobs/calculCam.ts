/**
 * Calculul CAM al aplicației (ADR 0109): documentul → profilele → IR → postul ales (ADR 0083) → octeții cu SHA-256, plus
 * rezumatul jobului și mutările simulării. Rulează în workerul CAM (`lucratorCam.ts`), nu pe firul principal; în Node
 * (testele), în proces, prin aceeași graniță (`bazinCam.ts`). E calculul de dinainte, mutat din
 * `src/ui/actiuniExportCalcul.ts` neschimbat: același program, aceiași octeți.
 */
import { iesireDinFoaie, type IesireFoaie } from '../cam/iesire.ts';
import { partiCuUrechi } from '../cam/partiUrechi.ts';
import { programeDopuri } from '../cam/dopV.ts';
import { programeDopuriDrepte } from '../cam/dopDrept.ts';
import type { DopCalculat } from '../cam/incrustatie.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../cam/job.ts';
import { PLAFON, type Document } from '../model/document.ts';
import { repara, verificaPentruPanou, type RezultatReparare, type VerificarePanou } from '../model/reparare.ts';
import { converteste, type RezultatConversie } from '../model/conversie.ts';
import { leagaCaile, type RezultatLegare } from '../model/legareCai.ts';
import { taieInPanouri } from '../model/panouri.ts';
import { taie, type RezultatTaiere } from '../model/taiere.ts';
import { CONTRACTE } from '../post/contracte/index.ts';
import { exporta } from '../post/export.ts';
import { partiDesprinse } from '../sim/desprinse.ts';
import { pregatesteProgram, type ProgramSimulat } from '../sim/program.ts';
import { despacheteaza, impacheteaza, transferabileProgram } from './impachetare.ts';
import {
  deTransferat, vederiSimulare, type CerereCam, type DopExportat, type ParametriExport, type ParteDesprinsa, type RaspunsExport, type RaspunsSimulare,
  type RaspunsTraseu,
} from './protocolCam.ts';
import { ASTEPTARE_AX, rezumatJob, rezumatTraseu, sculeProgram, unesteRezumate, type RezumatJob } from './rezumat.ts';

/** Aceeași ieșire, pe același traseu: confirmarea omului acoperă exact ce a văzut, nu o ieșire calculată după aceea. */
function aceeasiIesire(a: IesireFoaie | undefined, b: IesireFoaie): boolean {
  if (!a || a.amprenta !== b.amprenta) return false;
  const egal = (u: number, v: number): boolean => Math.abs(u - v) <= 1e-9;
  const [x, y] = [a.depasire, b.depasire];
  return egal(x.stanga, y.stanga) && egal(x.dreapta, y.dreapta) && egal(x.jos, y.jos) && egal(x.sus, y.sus);
}

/**
 * Numele fișierului unui dop (ADR 0170 §3): al programului foii, cu `-dop-<N>` după origine (`cncvs2-stanga-jos-dop-1.nc`,
 * pe sculă `cncvs2-stanga-jos-dop-1-2-T2.nc`); pe un controler cu nume scurte (FAT, 8 caractere), `DOP<N>` sau `D<N>…`.
 */
export function numeFisierDop(nume: string, k: number, scurt: boolean): string {
  if (scurt) return nume.startsWith('CNCVS2.') ? `DOP${k + 1}${nume.slice('CNCVS2'.length)}` : `D${k + 1}${nume.slice(2)}`;
  // `cncvs2-<origine>` (originea are și ea o liniuță: `stanga-jos`), apoi extensia sau `-<ordinea>-T<n>.<ext>`.
  const m = /^(cncvs2-[a-z]+-[a-z]+)(.*)$/.exec(nume);
  return m ? `${m[1]}-dop-${k + 1}${m[2]}` : `dop-${k + 1}-${nume}`;
}

/**
 * Proba urechilor (ADR 0210, felia 11.3↑c): părțile foii tăiate prin ea de un profil exterior cu urechi, judecate pe programul
 * exportat (mutările simulării, înainte să plece spre firul principal). Fără astfel de părți, nimic de calculat; un program pe
 * care simularea îl refuză (o spune ea) nu se judecă.
 */
function desprinseFoii(doc: Document, simulare: ProgramSimulat): ParteDesprinsa[] {
  const foaie = doc.foi[0];
  if (!foaie || !simulare.ok) return [];
  const parti = partiCuUrechi(doc);
  if (parti.length === 0) return [];
  const r = partiDesprinse({
    foaie: foaie.stoc, grupuri: [{ scula: simulare.scula, mutari: simulare.mutari }, ...(simulare.apoi ?? [])], parti: parti.map((x) => x.poligon),
  });
  return r.desprinse.flatMap((k) => {
    const x = parti[k];
    return x ? [{ instanta: x.instanta, element: x.element, x: x.x, y: x.y }] : [];
  });
}

/**
 * Dopurile incrustațiilor foii (ADR 0170, ADR 0171), câte unul pe regiune: întâi cele în V, apoi cele cu pereți drepți; numerele
 * fișierelor exportului și „Dopul N” din vederea 3D (ADR 0178) le urmează. Decupările lor trec de placă cu `supracursa`
 * (ADR 0176). O singură funcție, a exportului și a vederii 3D; sau motivul primului dop care nu se poate tăia.
 */
export function dopurileFoii(doc: Document, supracursa: number): { readonly ok: true; readonly dopuri: readonly DopCalculat[] } | { readonly ok: false; readonly motiv: string } {
  const inV = programeDopuri(doc, REGIM_IMPLICIT, supracursa);
  if (!inV.ok) return inV;
  const drepte = programeDopuriDrepte(doc, REGIM_IMPLICIT, supracursa);
  if (!drepte.ok) return drepte;
  return { ok: true, dopuri: [...inV.dopuri, ...drepte.dopuri] };
}

/** Exportul propriu-zis: documentul → profilele → IR → postul ales (ADR 0083) → octeții cu SHA-256. */
export async function calculeazaExportul(doc: Document, p: ParametriExport): Promise<RaspunsExport> {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  const job = programDinDocument(doc, REGIM_IMPLICIT, p.supracursa ?? 0, p.prinFoaie === true);
  if (!job.ok) return job;
  const iesire = iesireDinFoaie(job.program, foaie.stoc);
  if (iesire) {
    const { stanga, dreapta, jos, sus } = iesire.depasire;
    // Plafonul pe artefact (T23): o ieșire cât încă o foaie maximă e o greșeală de poziție, nu o intenție.
    if (Math.max(stanga, dreapta, jos, sus) > PLAFON.latura) {
      return { ok: false, motiv: `freza iese din foaie cu peste ${PLAFON.latura} mm` };
    }
    if (!aceeasiIesire(p.confirmareIesire, iesire)) {
      return { ok: false, motiv: 'freza iese din foaie: exportul cere confirmarea ta', cereConfirmare: iesire };
    }
  }
  const contract = CONTRACTE[p.post ?? 'grbl-11'];
  const e = await exporta(job.program, { foaie: foaie.stoc, origine: p.origine, z0: p.z0 }, contract, {
    asteptareAx: ASTEPTARE_AX, unitati: p.unitati ?? 'mm', ...(p.strategieScula ? { strategieScula: p.strategieScula } : {}),
    ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
  });
  if (!e.ok) return e;
  // Dopurile incrustațiilor (ADR 0170 §3): câte un program pe semifabricatul lui, cu originea în colțul ales și Z0 mereu pe fața
  // lui. Fața se coboară până dincolo de marginea semifabricatului (în aer), deci ieșirea e a construcției, scrisă în program.
  // Decupările lor trec de placă cu aceeași supracursă ca foaia (ADR 0176).
  const calculate = dopurileFoii(doc, p.supracursa ?? 0);
  if (!calculate.ok) return calculate;
  const dopuri: DopExportat[] = [];
  for (const [k, d] of calculate.dopuri.entries()) {
    const semifabricat = { latime: d.semifabricat.latime, inaltime: d.semifabricat.inaltime, grosime: d.semifabricat.grosimeMinima };
    const iesireDop = iesireDinFoaie(d.program, semifabricat);
    const ed = await exporta(d.program, { foaie: semifabricat, origine: p.origine, z0: 'sus' }, contract, {
      asteptareAx: ASTEPTARE_AX, unitati: p.unitati ?? 'mm', ...(p.strategieScula ? { strategieScula: p.strategieScula } : {}),
      ...(iesireDop ? { iesireConfirmata: iesireDop.depasire } : {}),
    });
    if (!ed.ok) return { ok: false, motiv: `dopul ${k + 1} (${d.element}): ${ed.motiv}` };
    const fisiere = ed.fisiere.map((f) => ({ ...f, nume: numeFisierDop(f.nume, k, contract.numeScurt === true) }));
    dopuri.push({ element: d.element, program: ed.exportat, fisiere, semifabricat: d.semifabricat });
  }
  const { latime, inaltime, grosime } = foaie.stoc;
  const simulare = pregatesteProgram(job.program, 0);
  return {
    ok: true, program: e.exportat, fisiere: e.fisiere, dopuri, sender: contract.senderAplicatie,
    avertismente: [...job.avertismente, ...calculate.dopuri.flatMap((d) => d.avertismente)],
    // Cu fișiere separate, fiecare are scula lui; altfel, sculele programului, în ordinea în care se montează.
    rezumat: e.fisiere.length > 1
      ? unesteRezumate(e.fisiere.map((f) => rezumatJob(f, f.scula ? [f.scula] : sculeProgram(job.program), p.setariMasina)))
      : rezumatJob(e.exportat, sculeProgram(job.program), p.setariMasina),
    // Simularea (ADR 0047 §5) pornește pe firul principal după descărcare; mutările ei, de aici: IR-ul rămâne în worker.
    simulare, foaie: { latime, inaltime, grosime }, desprinse: desprinseFoii(doc, simulare),
  };
}

/**
 * Programul documentului pentru traseu (ADR 0038 §2): CAM-ul cu regimul implicit și fără supracursă, împachetat pentru
 * firul principal. Timpul jobului de lângă traseu (ADR 0046 §8) e o cerere separată (`timp`): traseul nu-l așteaptă.
 */
export function calculeazaTraseul(doc: Document): RaspunsTraseu {
  const r = programDinDocument(doc);
  return r.ok ? { ok: true, program: impacheteaza(r.program) } : { ok: false, motiv: r.motiv };
}

/**
 * Programul pentru vederea 3D (ADR 0057 §1): același CAM ca traseul și exportul (fără supracursă), apoi mutările nucleului,
 * cu fața la Z 0. Fără `dop`, al foii; cu el, al dopului cu acel număr (de la 0), pe semifabricatul lui, cu fundul la grosimea
 * lui cea mai mică (ADR 0178). Oricum, lista dopurilor foii (elementul și semifabricatul fiecăruia), sau de ce nu se pot tăia:
 * un dop refuzat nu oprește foaia.
 */
export function calculeazaSimularea(doc: Document, dop?: number): RaspunsSimulare {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  const d = dopurileFoii(doc, 0);
  const cuDopuri = d.ok
    ? { dopuri: d.dopuri.map((x) => ({ element: x.element, semifabricat: x.semifabricat })) }
    : { dopuri: [], motivDopuri: d.motiv };
  if (dop === undefined) {
    const job = programDinDocument(doc, REGIM_IMPLICIT, 0);
    if (!job.ok) return { ok: false, motiv: job.motiv };
    const p = pregatesteProgram(job.program, 0);
    if (!p.ok) return { ok: false, motiv: p.motiv };
    return { ok: true, foaie: { latime: foaie.stoc.latime, inaltime: foaie.stoc.inaltime, grosime: foaie.stoc.grosime }, simulare: p, ...cuDopuri };
  }
  if (!d.ok) return { ok: false, motiv: d.motiv };
  const x = d.dopuri[dop];
  if (!x) return { ok: false, motiv: `dopul ${dop + 1} nu mai e în document` };
  const p = pregatesteProgram(x.program, 0);
  if (!p.ok) return { ok: false, motiv: `dopul ${dop + 1}: ${p.motiv}` };
  const s = x.semifabricat;
  return { ok: true, foaie: { latime: s.latime, inaltime: s.inaltime, grosime: s.grosimeMinima }, simulare: p, ...cuDopuri };
}

/** Răspunsul unei cereri, cu tablourile lui de transferat (ADR 0014). */
export type RaspunsCalcul = {
  readonly raspuns: RaspunsExport | RaspunsTraseu | RaspunsSimulare | RezumatJob | VerificarePanou | RezultatReparare | RezultatTaiere | RezultatConversie | RezultatLegare;
  readonly transfer: ArrayBuffer[];
};

export async function raspunde(c: CerereCam): Promise<RaspunsCalcul> {
  switch (c.fel) {
    case 'export': {
      const r = await calculeazaExportul(c.document, c.parametri);
      return { raspuns: r, transfer: r.ok ? deTransferat([r.program.octeti, ...r.fisiere.map((f) => f.octeti), ...r.dopuri.flatMap((d) => [d.program.octeti, ...d.fisiere.map((f) => f.octeti)]), ...vederiSimulare(r.simulare)]) : [] };
    }
    case 'traseu': {
      const r = calculeazaTraseul(c.document);
      return { raspuns: r, transfer: r.ok ? transferabileProgram(r.program) : [] };
    }
    case 'simulare': {
      const r = calculeazaSimularea(c.document, c.dop);
      return { raspuns: r, transfer: r.ok ? deTransferat(vederiSimulare(r.simulare)) : [] };
    }
    case 'timp':
      return { raspuns: rezumatTraseu(despacheteaza(c.program), c.foaie, c.setari), transfer: [] };
    case 'verificare':
      return { raspuns: verificaPentruPanou(c.document, c.optiuni, c.indexFoaie ?? 0), transfer: [] };
    case 'reparare':
      return { raspuns: repara(c.document, c.cerere, c.optiuni, c.indexFoaie ?? 0), transfer: [] };
    case 'taiere':
      return { raspuns: taie(c.document, c.cerere, c.indexFoaie ?? 0), transfer: [] };
    case 'panouri':
      return { raspuns: taieInPanouri(c.document, c.cerere, c.indexFoaie ?? 0), transfer: [] };
    case 'conversie':
      return { raspuns: converteste(c.document, c.cerere, c.indexFoaie ?? 0), transfer: [] };
    case 'legare':
      return { raspuns: leagaCaile(c.document, c.cerere, c.optiuni, c.indexFoaie ?? 0), transfer: [] };
  }
}
