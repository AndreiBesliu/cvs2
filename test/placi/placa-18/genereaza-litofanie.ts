/**
 * Litofania plăcii 18 (felia 18.1↑i, ADR 0321, cu răspunsul 6a la ADR 0310; `docs/etape/placa-18.md`, partea a doua): trei
 * pătrate de gri tăiate într-o placă albă translucidă de 6 mm, ca o litofanie. Foaia 100 × 50, zero XY în colțul stânga-jos,
 * Z0 pe fața de sus. Litofania, de 60 × 20 (celula 0,25 mm, 240 × 80 de pixeli), stă cu colțul stânga-jos în (20, 15): pătratele
 * de 20 × 20, de la stânga la dreapta, alb, gri 128 și negru, cu grosimile rămase pe hârtie (lumina liniară, ADR 0321 §1):
 * t = 3 − L · (3 − 0,8), adică 0,8, 3 − (128 / 255) · 2,2 = 1,8957 și 3 mm.
 *
 * Totul pe drumul aplicației: harta grosimilor din griul pixelilor (`gri`, `litofanieDinGri`, ca fereastra „Litofanie”),
 * stratul (`stratDinGrila`), rolul „Relief 3D” (întâi degroșarea, apoi finisarea), cu **planul zero la grosimea plăcii** pe
 * amândouă (ADR 0321 §2: suprafața la −6 + t), ușa documentului și calculul exportului, câte un fișier pe freză (GRBL 1.1), cu
 * baza `placa-18-litofanie`. Valorile scrise peste ale rolului:
 * - degroșarea: T1, freza plată Ø3, pasul 2, pasul lateral 1,2, adaosul 0,3, liniile la 0°;
 * - finisarea: T2, bila Ø3, pasul 2, pasul lateral 0,5 (creasta pe un plan, 1,5 − √(1,5² − 0,25²) = 0,021), liniile la 0°;
 * - marginea, la amândouă: peretele rămâne (placa din jur, netăiată, e rama litofaniei).
 *
 * Rulat direct (`node test/placi/placa-18/genereaza-litofanie.ts`), rescrie fișierele de aur; `placa18.litofanie.aur.test.ts`
 * cere ca exportul de acum să fie identic, iar `placa18.litofanie.test.ts` prezice grosimile cu oracolul simulării.
 */
import { writeFileSync } from 'node:fs';
import '../../unit/limbi.ts';
import { calculeazaExportul } from '../../../src/jobs/calculCam.ts';
import type { ParametriExport } from '../../../src/jobs/protocolCam.ts';
import { documentNou, type Document, type Operatie, type Piesa, type Scula } from '../../../src/model/document.ts';
import { incarca } from '../../../src/model/incarcare.ts';
import { operatiiPentruRol } from '../../../src/model/rol.ts';
import { cuBaza } from '../../../src/post/numeFisier.ts';
import { gri } from '../../../src/relief/imagine.ts';
import { litofanieDinGri } from '../../../src/relief/litofanie.ts';
import type { ResurseRelief } from '../../../src/relief/resurse.ts';
import { stratDinGrila } from '../../../src/relief/strat.ts';

export const FOAIA_LIT = { latime: 100, inaltime: 50, grosime: 6 } as const;
export const MATERIAL_LIT = 'placă albă translucidă 6';
/** Litofania: mărimea (mm), celula și colțul stânga-jos pe foaie. */
export const LITOFANIE = { latime: 60, inaltime: 20, celula: 0.25, x: 20, y: 15 } as const;
/** Pătratele de 20 × 20, de la stânga la dreapta: griul lor (0 … 255). */
export const PATRATE = [255, 128, 0] as const;
export const GROSIMI = { tmin: 0.8, tmax: 3 } as const;
/** Grosimea rămasă a pătratului k, pe hârtie (lumina liniară). */
export const grosime = (k: number): number => GROSIMI.tmax - ((PATRATE[k] ?? 0) / 255) * (GROSIMI.tmax - GROSIMI.tmin);

export const FREZA_DEGROSARE_LIT: Scula = { numar: 1, nume: 'freza plata 3', diametru: 3 };
export const FREZA_FINISARE_LIT: Scula = { numar: 2, nume: 'freza bila 3', diametru: 3, forma: { tip: 'bila' } };
export const DEGROSARE_LIT = { pas: 2, pasLateral: 1.2, adaos: 0.3, unghi: 0 } as const;
export const FINISARE_LIT = { pas: 2, pasLateral: 0.5, unghi: 0 } as const;
export const PARAMETRI_LIT: ParametriExport = { origine: 'stanga-jos', z0: 'sus', strategieScula: 'fisiere-separate' };
export const BAZA_LIT = 'placa-18-litofanie';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as const;

/** Harta grosimilor, ca din fereastra „Litofanie”: pixelii pătratelor, griul, apoi grosimile (fără ramă, din față). */
export function grilaLitofanie(): { readonly valori: Float32Array; readonly nx: number; readonly ny: number } {
  const nx = Math.round(LITOFANIE.latime / LITOFANIE.celula), ny = Math.round(LITOFANIE.inaltime / LITOFANIE.celula);
  const rgba = new Uint8Array(nx * ny * 4), pe = nx / PATRATE.length;
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) { const v = PATRATE[Math.floor(x / pe)] ?? 0; rgba.set([v, v, v, 255], 4 * (y * nx + x)); }
  }
  const l = litofanieDinGri(gri(rgba, nx, ny, 'l'), nx, ny, { tmin: GROSIMI.tmin, tmax: GROSIMI.tmax, rama: 0, spate: false });
  return { valori: l.valori, nx: l.nx, ny: l.ny };
}

/** Documentul plăcii și dalele litofaniei. */
export async function documentLitofanie(): Promise<{ readonly doc: Document; readonly resurse: ResurseRelief }> {
  const { valori, nx, ny } = grilaLitofanie();
  const s = await stratDinGrila(valori, nx, ny);
  const resurse: ResurseRelief = { [s.amprenta]: { text: s.text, octeti: Object.fromEntries(s.octeti) } };
  const d0 = documentNou({ ...FOAIA_LIT });
  const foaie = d0.foi[0];
  if (!foaie) throw new Error('documentul nou n-are foaie');
  const fara: Piesa = {
    id: 'litofanie', nume: 'Litofania plăcii 18',
    radacina: {
      tip: 'grup', id: 'g', matrice: { ...I }, copii: [{
        tip: 'element', id: 'r', matrice: { ...I },
        forma: { tip: 'relief', nx, ny, celula: LITOFANIE.celula, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: s.amprenta }] },
      }],
    },
    operatii: [],
  };
  const doc0: Document = { ...d0, piese: [fara], foi: [{ ...foaie, material: MATERIAL_LIT, instante: [{ id: 'i', piesa: fara.id, x: LITOFANIE.x, y: LITOFANIE.y, rotire: 0 }] }] };
  const ops = operatiiPentruRol(doc0, fara, 'relief3d');
  if (!ops || ops.length !== 2) throw new Error('rolul „Relief 3D”');
  const [deg, fin] = ops as [Operatie, Operatie];
  const T = FOAIA_LIT.grosime;
  const operatii: Operatie[] = [
    { ...deg, scula: { ...FREZA_DEGROSARE_LIT }, pas: DEGROSARE_LIT.pas, pasLateral: DEGROSARE_LIT.pasLateral, degrosare: { adaos: DEGROSARE_LIT.adaos, unghi: DEGROSARE_LIT.unghi, planZero: T } },
    { ...fin, scula: { ...FREZA_FINISARE_LIT }, pas: FINISARE_LIT.pas, pasLateral: FINISARE_LIT.pasLateral, finisare: { unghi: FINISARE_LIT.unghi, planZero: T } },
  ];
  const u = incarca(JSON.parse(JSON.stringify({ ...doc0, piese: [{ ...fara, operatii }] })));
  if (!u.ok) throw new Error(`documentul litofaniei nu trece de ușă: ${u.motiv}`);
  return { doc: u.doc, resurse };
}

/** Fișierele litofaniei: numele (cu baza `placa-18-litofanie`) și textul, în ordinea programului. */
export async function fisiereLitofanie(): Promise<{ readonly nume: string; readonly text: string }[]> {
  const { doc, resurse } = await documentLitofanie();
  const r = await calculeazaExportul(doc, PARAMETRI_LIT, resurse);
  if (!r.ok) throw new Error(`litofania plăcii 18: ${r.motiv}`);
  return r.fisiere.map((f) => ({ nume: cuBaza(f.nume, PARAMETRI_LIT.origine, BAZA_LIT), text: f.text }));
}

if (import.meta.main) {
  for (const f of await fisiereLitofanie()) {
    writeFileSync(new URL(f.nume, import.meta.url), f.text);
    console.log(`${f.nume}  ${f.text.split('\n').length} linii`);
  }
}
