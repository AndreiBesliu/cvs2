/**
 * Calculul CAM al aplicației (ADR 0109): documentul → profilele → IR → postul ales (ADR 0083) → octeții cu SHA-256, plus
 * rezumatul jobului și mutările simulării. Rulează în workerul CAM (`lucratorCam.ts`), nu pe firul principal; în Node
 * (testele), în proces, prin aceeași graniță (`bazinCam.ts`). E calculul de dinainte, mutat din
 * `src/ui/actiuniExportCalcul.ts` neschimbat: același program, aceiași octeți.
 */
import { iesireDinFoaie, type IesireFoaie } from '../cam/iesire.ts';
import { programeDopuri } from '../cam/dopV.ts';
import { programeDopuriDrepte } from '../cam/dopDrept.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../cam/job.ts';
import { PLAFON, type Document } from '../model/document.ts';
import { repara, verificaPentruPanou, type RezultatReparare, type VerificarePanou } from '../model/reparare.ts';
import { taie, type RezultatTaiere } from '../model/taiere.ts';
import { CONTRACTE } from '../post/contracte/index.ts';
import { exporta } from '../post/export.ts';
import { pregatesteProgram } from '../sim/program.ts';
import { despacheteaza, impacheteaza, transferabileProgram } from './impachetare.ts';
import {
  deTransferat, vederiSimulare, type CerereCam, type DopExportat, type ParametriExport, type RaspunsExport, type RaspunsSimulare, type RaspunsTraseu,
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

/** Exportul propriu-zis: documentul → profilele → IR → postul ales (ADR 0083) → octeții cu SHA-256. */
export async function calculeazaExportul(doc: Document, p: ParametriExport): Promise<RaspunsExport> {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  const job = programDinDocument(doc, REGIM_IMPLICIT, p.supracursa ?? 0);
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
  // Dopurile (ADR 0170, ADR 0171): întâi cele în V, apoi cele cu pereți drepți; numerele fișierelor le urmează.
  const inV = programeDopuri(doc, REGIM_IMPLICIT);
  if (!inV.ok) return inV;
  const drepte = programeDopuriDrepte(doc, REGIM_IMPLICIT);
  if (!drepte.ok) return drepte;
  const calculate = { dopuri: [...inV.dopuri, ...drepte.dopuri] };
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
  return {
    ok: true, program: e.exportat, fisiere: e.fisiere, dopuri, sender: contract.senderAplicatie,
    avertismente: [...job.avertismente, ...calculate.dopuri.flatMap((d) => d.avertismente)],
    // Cu fișiere separate, fiecare are scula lui; altfel, sculele programului, în ordinea în care se montează.
    rezumat: e.fisiere.length > 1
      ? unesteRezumate(e.fisiere.map((f) => rezumatJob(f, f.scula ? [f.scula] : sculeProgram(job.program), p.setariMasina)))
      : rezumatJob(e.exportat, sculeProgram(job.program), p.setariMasina),
    // Simularea (ADR 0047 §5) pornește pe firul principal după descărcare; mutările ei, de aici: IR-ul rămâne în worker.
    simulare: pregatesteProgram(job.program, 0), foaie: { latime, inaltime, grosime },
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
 * Programul documentului pentru vederea 3D (ADR 0057 §1): același CAM ca traseul și exportul (fără supracursă), apoi
 * mutările nucleului, cu fața plăcii la Z 0.
 */
export function calculeazaSimularea(doc: Document): RaspunsSimulare {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  const job = programDinDocument(doc, REGIM_IMPLICIT, 0);
  if (!job.ok) return { ok: false, motiv: job.motiv };
  const p = pregatesteProgram(job.program, 0);
  if (!p.ok) return { ok: false, motiv: p.motiv };
  return { ok: true, foaie: { latime: foaie.stoc.latime, inaltime: foaie.stoc.inaltime, grosime: foaie.stoc.grosime }, simulare: p };
}

/** Răspunsul unei cereri, cu tablourile lui de transferat (ADR 0014). */
export type RaspunsCalcul = {
  readonly raspuns: RaspunsExport | RaspunsTraseu | RaspunsSimulare | RezumatJob | VerificarePanou | RezultatReparare | RezultatTaiere;
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
      const r = calculeazaSimularea(c.document);
      return { raspuns: r, transfer: r.ok ? deTransferat(vederiSimulare(r.simulare)) : [] };
    }
    case 'timp':
      return { raspuns: rezumatTraseu(despacheteaza(c.program), c.foaie, c.setari), transfer: [] };
    case 'verificare':
      return { raspuns: verificaPentruPanou(c.document, c.optiuni), transfer: [] };
    case 'reparare':
      return { raspuns: repara(c.document, c.cerere, c.optiuni), transfer: [] };
    case 'taiere':
      return { raspuns: taie(c.document, c.cerere), transfer: [] };
  }
}
