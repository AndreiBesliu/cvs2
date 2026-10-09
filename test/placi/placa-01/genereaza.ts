/**
 * Placa 1 (`PLAN.md` §5.3, `docs/etape/placa-01.md`): insula 100 × 60 cu gaura Ø30 în centru, pe MDF 18, cu freza Ø6.
 * - Fișierul A: zero XY în colțul stânga-jos al bucății. Fișierul B: în colțul dreapta-sus. Z0 pe fața de sus.
 * - Gaura: profil interior, 8 mm, în două treceri de 4. Insula: profil exterior, 3 mm, o trecere.
 * - Sensul: urcare pe amândouă (ADR 0027, decizia owner-ului din 09.10): gaura trigonometric (G3), insula orar (G2).
 *
 * Insula stă la 20 mm de marginile colțului de origine. În document (foaia 140 × 100), asta înseamnă (20, 20)…(120, 80)
 * pentru ambele fișiere: la B, cotele de mașină ies față de colțul dreapta-sus, deci nu depind de mărimea bucății.
 *
 * Rulat direct (`node test/placi/placa-01/genereaza.ts`), rescrie fișierele de aur. Testul `test/unit/placa01.test.ts`
 * cere ca programele generate acum să fie identice, octet cu octet, cu cele scrise.
 */
import { writeFileSync } from 'node:fs';
import { profil } from '../../../src/cam/profil.ts';
import { traseuProfil } from '../../../src/cam/traseu.ts';
import { conturCerc, conturDreptunghi } from '../../../src/geom/contur.ts';
import { AXE_XYZ, type Miscare, type Program } from '../../../src/ir/ir.ts';
import type { ColtOrigine, Montaj } from '../../../src/ir/montaj.ts';
import { GRBL_11 } from '../../../src/post/contracte/grbl11.ts';
import { exporta, type ProgramExportat } from '../../../src/post/export.ts';

export const FOAIA = { latime: 140, inaltime: 100, grosime: 18 } as const;
export const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 } as const;
export const REGIM = { turatie: 18000, avans: 1000, avansPlonjare: 300, zSigur: 5, asteptareAx: 3 } as const;

function miscari(): Miscare[] {
  const rez: Miscare[] = [];
  const parti: ReadonlyArray<readonly [string, ReturnType<typeof profil>]> = [
    ['gaura D30, 8 mm in doua treceri', profil(conturCerc(70, 50, 15), { latura: 'interior', sens: 'urcare', diametruScula: SCULA.diametru, adancime: 8, pas: 4 })],
    ['insula 100 x 60, 3 mm', profil(conturDreptunghi(20, 20, 100, 60), { latura: 'exterior', sens: 'urcare', diametruScula: SCULA.diametru, adancime: 3, pas: 3 })],
  ];
  for (const [eticheta, p] of parti) {
    if (!p.ok) throw new Error(`${eticheta}: ${p.motiv}`);
    const t = traseuProfil(p.treceri, REGIM);
    if (!t.ok) throw new Error(`${eticheta}: ${t.motiv}`);
    rez.push({ tip: 'eticheta', text: eticheta }, ...t.miscari);
  }
  return rez;
}

export function programPlaca01(): Program {
  return { axe: AXE_XYZ, scula: SCULA, turatie: REGIM.turatie, zSigur: REGIM.zSigur, miscari: miscari() };
}

export function montajPlaca01(origine: ColtOrigine): Montaj {
  return { foaie: FOAIA, origine, z0: 'sus' };
}

export async function programePlaca01(): Promise<{ readonly A: ProgramExportat; readonly B: ProgramExportat }> {
  const rez: Partial<Record<'A' | 'B', ProgramExportat>> = {};
  for (const [nume, origine] of [['A', 'stanga-jos'], ['B', 'dreapta-sus']] as const) {
    const e = await exporta(programPlaca01(), montajPlaca01(origine), GRBL_11, { asteptareAx: REGIM.asteptareAx });
    if (!e.ok) throw new Error(`placa 1, fișierul ${nume}: ${e.motiv}`);
    rez[nume] = e.exportat;
  }
  if (!rez.A || !rez.B) throw new Error('placa 1: lipsește un fișier');
  return { A: rez.A, B: rez.B };
}

if (import.meta.main) {
  const { A, B } = await programePlaca01();
  const dir = new URL('./', import.meta.url);
  writeFileSync(new URL('placa-01-A.nc', dir), A.octeti);
  writeFileSync(new URL('placa-01-B.nc', dir), B.octeti);
  console.log(`placa-01-A.nc  ${A.linii} linii  sha256 ${A.sha256}`);
  console.log(`placa-01-B.nc  ${B.linii} linii  sha256 ${B.sha256}`);
}
