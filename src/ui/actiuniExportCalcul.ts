import { iesireDinFoaie, type IesireFoaie } from '../cam/iesire.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../cam/job.ts';
import type { Scula } from '../ir/ir.ts';
import { profilDinSetari, type ProfilMasina } from '../ir/masina.ts';
import { PROFIL_GRBL_11H } from '../ir/masini/grbl11h.ts';
import { PLAFON, type Document } from '../model/document.ts';
import { GRBL_11 } from '../post/contracte/grbl11.ts';
import { exporta, type ProgramExportat } from '../post/export.ts';
import { estimeazaTimp, type Portiune } from '../sim/timp.ts';
import type { ParametriExport, RezultatExport, RezumatJob } from './actiuniExportTipuri.ts';

/** Așteptarea axului după pornire: un parametru al mașinii; profilul mașinii vine în etapa 3. */
const ASTEPTARE_AX = 3;

/** Aceeași ieșire, pe același traseu: confirmarea omului acoperă exact ce a văzut, nu o ieșire calculată după aceea. */
function aceeasiIesire(a: IesireFoaie | undefined, b: IesireFoaie): boolean {
  if (!a || a.amprenta !== b.amprenta) return false;
  const egal = (u: number, v: number): boolean => Math.abs(u - v) <= 1e-9;
  const [x, y] = [a.depasire, b.depasire];
  return egal(x.stanga, y.stanga) && egal(x.dreapta, y.dreapta) && egal(x.jos, y.jos) && egal(x.sus, y.sus);
}

/** Exportul propriu-zis: documentul → profilele → IR → postul GRBL → octeții cu SHA-256. Se încarcă la cerere. */
export async function calculeazaExport(doc: Document, p: ParametriExport): Promise<RezultatExport> {
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
  const e = await exporta(job.program, { foaie: foaie.stoc, origine: p.origine, z0: p.z0 }, GRBL_11, {
    asteptareAx: ASTEPTARE_AX,
    ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
  });
  return e.ok ? { ok: true, program: e.exportat, avertismente: job.avertismente, rezumat: rezumatJob(e.exportat, job.program.scula, p.setariMasina) } : e;
}

const zero = (): { secunde: number; pauze: number; taiere: number; rapide: number } => ({ secunde: 0, pauze: 0, taiere: 0, rapide: 0 });

/**
 * Rezumatul jobului (ADR 0046): estimarea pe octeții exportați, cu profilul mașinii (implicitele GRBL 1.1h, sau peste ele
 * răspunsul la `$$` lipit de om), împărțită pe secțiunile postului: fiecare operație adună secțiunile ei (o operație pe
 * mai multe elemente sau instanțe are mai multe), iar pornirea și finalul merg la „restul”.
 */
export function rezumatJob(program: ProgramExportat, scula: Scula, setari: string | undefined): RezumatJob {
  let profil: ProfilMasina = PROFIL_GRBL_11H;
  if (setari !== undefined && setari.trim() !== '') {
    const s = profilDinSetari(setari, PROFIL_GRBL_11H);
    if (!s.ok) return { ok: false, motiv: s.linie > 0 ? `setările mașinii, linia ${s.linie}: ${s.motiv}` : `setările mașinii: ${s.motiv}` };
    profil = s.profil;
  }
  const e = estimeazaTimp(program.text, profil, program.sectiuni.map((s) => s.linie));
  if (!e.ok) return { ok: false, motiv: e.linie > 0 ? `linia ${e.linie} a programului: ${e.motiv}` : e.motiv };
  const adauga = (la: ReturnType<typeof zero>, p: Portiune | undefined): void => {
    if (!p) return;
    la.secunde += p.secunde;
    la.pauze += p.pauze;
    la.taiere += p.taiere;
    la.rapide += p.rapide;
  };
  const restul = zero();
  adauga(restul, e.portiuni[0]);
  const peOperatie = new Map<string, ReturnType<typeof zero>>();
  for (const [k, s] of program.sectiuni.entries()) {
    const p = e.portiuni[k + 1];
    if (s.operatie === undefined) {
      adauga(restul, p);
      continue;
    }
    let la = peOperatie.get(s.operatie);
    if (!la) {
      la = zero();
      peOperatie.set(s.operatie, la);
    }
    adauga(la, p);
  }
  const axa = (a: 'X' | 'Y' | 'Z') => profil.axe[a] ?? { vitezaMaxima: Number.NaN, acceleratie: Number.NaN };
  return {
    ok: true,
    total: e.total,
    peOperatie: [...peOperatie].map(([operatie, p]) => ({ operatie, ...p })),
    restul,
    // O singură sculă pe program până la schimbarea sculei (etapa 3): scula are tot jobul.
    peScula: [{ numar: scula.numar, nume: scula.nume, diametru: scula.diametru, ...e.total }],
    masina: {
      nume: profil.nume, sursa: profil.sursa,
      vitezaMaxima: [axa('X').vitezaMaxima, axa('Y').vitezaMaxima, axa('Z').vitezaMaxima],
      acceleratie: [axa('X').acceleratie, axa('Y').acceleratie, axa('Z').acceleratie],
    },
    blocuriLimitate: e.blocuriLimitate,
  };
}
