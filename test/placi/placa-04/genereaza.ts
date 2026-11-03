import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../../../src/ir/ir.ts';
import type { Montaj } from '../../../src/ir/montaj.ts';
import { GRBL_11 } from '../../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../../src/post/post.ts';

/**
 * Placa 4 (`PLAN.md` §5.3, etapa 4; `docs/etape/placa-04.md`): șanțurile de calibrare din sonda s4 (§5.13), pe MDF, câte
 * un fișier pe freză, cu Z0 pe fața de sus și zero XY în colțul stânga-jos:
 * - T1, freza plată Ø6: șanțul la Z −3 (lățimea 6,00, adâncimea 3,00), canalul cercului cu raza 25 în G3 (Ø56,00 / Ø44,00)
 *   și plonjarea la 5 mm (Ø6,00, 5,00);
 * - T2, bila Ø6 cu vârful la Z −2: lățimea la suprafață 2·√(3² − 1²) = 5,657;
 * - T3, V90 la Z −2: lățimea 2·2·tan 45° = 4,000; T4, V60: 2·2·tan 30° = 2,309.
 * Placa măsoară sculele reale (diametrul efectiv, vârful teșit al V-ului, bătaia) pentru calibrarea pe lemn (§4.6, punctul
 * 6). Bila nu e încă în document (forma frezei din document e plată sau V), deci programele se scriu din IR, cu postul
 * aplicației, ca pachetul de atelier (ADR 0131).
 *
 * Rulat direct (`node test/placi/placa-04/genereaza.ts`), rescrie fișierele de aur. Testul `test/unit/placa04.test.ts` cere
 * ca programele generate acum să fie identice cu cele scrise și ca oracolul simulării să prezică fiecare cotă.
 */

export const FOAIA = { latime: 200, inaltime: 120, grosime: 18 } as const;
export const MONTAJ: Montaj = { foaie: FOAIA, origine: 'stanga-jos', z0: 'sus' };
export const REGIM = { turatie: 18000, avans: 1000, avansPlonjare: 300, zSigur: 5, asteptareAx: 3 } as const;

export const PLATA: Scula = { numar: 1, nume: 'freza plata', diametru: 6 };
export const BILA: Scula = { numar: 2, nume: 'freza bila', diametru: 6, forma: { tip: 'bila' } };
export const V90: Scula = { numar: 3, nume: 'freza V90', diametru: 6, forma: { tip: 'v', unghi: 90 } };
export const V60: Scula = { numar: 4, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } };

/** Șanțurile drepte, de-a lungul lui X, de la x 20 la 80: y-ul și adâncimea fiecăruia. */
export const SANTURI = {
  plata: { y: 100, z: -3 }, bila: { y: 80, z: -2 }, v90: { y: 60, z: -2 }, v60: { y: 40, z: -2 },
} as const;
export const SANT_X = [20, 80] as const;
/** Canalul cercului (G3, cu freza plată): centrul, raza drumului și adâncimea. */
export const CERC = { centru: { x: 140, y: 70 }, raza: 25, z: -1 } as const;
/** Plonjarea dreaptă, cu freza plată. */
export const PLONJARE = { x: 20, y: 15, z: -5 } as const;

const program = (scula: Scula, miscari: readonly Miscare[]): Program => ({
  axe: AXE_XYZ, scula, turatie: REGIM.turatie, zSigur: REGIM.zSigur, miscari,
});
const sus: Miscare = { tip: 'rapida', la: { Z: REGIM.zSigur } };
const sant = (eticheta: string, y: number, z: number): Miscare[] => [
  { tip: 'eticheta', text: eticheta },
  { tip: 'rapida', la: { X: SANT_X[0], Y: y } },
  { tip: 'taiere', la: { Z: z }, avans: REGIM.avansPlonjare },
  { tip: 'taiere', la: { X: SANT_X[1] }, avans: REGIM.avans },
  sus,
];

export function programe(): { readonly nume: string; readonly scula: Scula; readonly program: Program }[] {
  const { centru: c, raza: r, z } = CERC;
  return [
    {
      nume: 'placa-04-T1.nc', scula: PLATA,
      program: program(PLATA, [
        ...sant('santul plat D6 la Z-3', SANTURI.plata.y, SANTURI.plata.z),
        { tip: 'eticheta', text: 'canalul cercului R25 in G3' },
        { tip: 'rapida', la: { X: c.x + r, Y: c.y } },
        { tip: 'taiere', la: { Z: z }, avans: REGIM.avansPlonjare },
        { tip: 'arc', la: { X: c.x + r, Y: c.y }, centru: c, sens: 'trigonometric', avans: REGIM.avans },
        sus,
        { tip: 'eticheta', text: 'plonjarea D6 la 5 mm' },
        { tip: 'rapida', la: { X: PLONJARE.x, Y: PLONJARE.y } },
        { tip: 'taiere', la: { Z: PLONJARE.z }, avans: REGIM.avansPlonjare },
        sus,
      ]),
    },
    { nume: 'placa-04-T2.nc', scula: BILA, program: program(BILA, sant('santul cu bila D6, varful la Z-2', SANTURI.bila.y, SANTURI.bila.z)) },
    { nume: 'placa-04-T3.nc', scula: V90, program: program(V90, sant('santul V90 la Z-2', SANTURI.v90.y, SANTURI.v90.z)) },
    { nume: 'placa-04-T4.nc', scula: V60, program: program(V60, sant('santul V60 la Z-2', SANTURI.v60.y, SANTURI.v60.z)) },
  ];
}

/** Fișierele plăcii: textul fiecărui program, scris de postul aplicației cu contractul GRBL 1.1. */
export function fisiere(): { readonly nume: string; readonly scula: Scula; readonly text: string }[] {
  return programe().map(({ nume, scula, program: p }) => {
    const r = posteaza(p, MONTAJ, GRBL_11, { asteptareAx: REGIM.asteptareAx });
    if (!r.ok) throw new Error(`${nume}: ${r.motiv}`);
    return { nume, scula, text: r.text };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = dirname(fileURLToPath(import.meta.url));
  for (const f of fisiere()) writeFileSync(join(dir, f.nume), f.text);
  console.log('placa 4: fișierele scrise');
}
