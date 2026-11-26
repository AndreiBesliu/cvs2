/**
 * Placa reliefului (placa 18; ADR 0310 §4, §13, ADR 0312, ADR 0313; `docs/etape/placa-18.md`): un relief degroșat cu freza
 * plată și finisat cu bila, pe lemn. MDF 18, foaia 140 × 100, zero XY în colțul stânga-jos, Z0 pe fața de sus. Relieful, de
 * 80 × 50 (celula 0,25 mm), stă cu colțul stânga-jos în (30, 25), cu vârful la fața plăcii; are trei trăsături, socotite pe
 * hârtie (`inaltime`):
 * - **calota**: o bucată de sferă cu raza 15, înaltă de 8, cu centrul în (22, 25) al reliefului: vârful e la fața plăcii;
 * - **rampa și platoul**: între y 12 și 38, o pantă de 0,3 (de la x 45 la 65, de la 0 la 6), apoi platoul la 6, până la x 75;
 * - **fundul**: restul, la 0, adică la 8 mm sub față.
 *
 * Totul pe drumul aplicației: stratul din grilă (`stratDinGrila`, ca un relief importat), rolul „Relief 3D” (`operatiiPentruRol`,
 * întâi degroșarea, apoi finisarea), ușa documentului (`incarca`) și calculul exportului (`calculeazaExportul`, câte un fișier pe
 * freză, GRBL 1.1), cu numele de bază `placa-18` (`cuBaza`). Valorile scrise peste ale rolului:
 * - degroșarea: T1, freza plată Ø6, pasul 3, pasul lateral 2,5 (zece celule, ~42 %), adaosul 0,5, liniile la 0°;
 * - finisarea: T2, bila Ø6, pasul 3, pasul lateral 1,5 (creasta pe un plan, 3 − √(3² − 0,75²) = 0,095), liniile la 0°;
 * - marginea, la amândouă: peretele rămâne (buzunarul are pereții drepți, de 80 × 50).
 *
 * Rulat direct (`node test/placi/placa-18/genereaza.ts`), rescrie fișierele de aur; `test/unit/placa18.aur.test.ts` cere ca
 * exportul de acum să fie identic, octet cu octet, iar `test/unit/placa18.test.ts` prezice cotele cu oracolul simulării.
 */
import { writeFileSync } from 'node:fs';
// Dicționarele de bază (rezumatul exportului; programele nu le folosesc), ca în probele unitare.
import '../../unit/limbi.ts';
import { calculeazaExportul } from '../../../src/jobs/calculCam.ts';
import type { ParametriExport } from '../../../src/jobs/protocolCam.ts';
import { documentNou, type Document, type Operatie, type Piesa, type Scula } from '../../../src/model/document.ts';
import { incarca } from '../../../src/model/incarcare.ts';
import { operatiiPentruRol } from '../../../src/model/rol.ts';
import { cuBaza } from '../../../src/post/numeFisier.ts';
import type { ResurseRelief } from '../../../src/relief/resurse.ts';
import { stratDinGrila } from '../../../src/relief/strat.ts';

export const FOAIA = { latime: 140, inaltime: 100, grosime: 18 } as const;
export const MATERIAL = 'MDF 18';
/** Relieful: mărimea (mm), celula și colțul stânga-jos pe foaie. */
export const RELIEF = { latime: 80, inaltime: 50, celula: 0.25, x: 30, y: 25 } as const;
/** Calota: centrul (în relief), raza sferei și înălțimea; z = √(R² − d²) − (R − H), cât e pozitiv. */
export const CALOTA = { cx: 22, cy: 25, raza: 15, inaltime: 8 } as const;
/** Rampa (de la x0 la x1, de la 0 la h) și platoul (de la x1 la x2, la h), între y0 și y1. */
export const RAMPA = { x0: 45, x1: 65, x2: 75, y0: 12, y1: 38, inaltime: 6 } as const;
/** Cât de jos e fundul reliefului sub fața plăcii: vârful calotei e la față. */
export const ADANCIME = CALOTA.inaltime;

export const FREZA_DEGROSARE: Scula = { numar: 1, nume: 'freza plata 6', diametru: 6 };
export const FREZA_FINISARE: Scula = { numar: 2, nume: 'freza bila 6', diametru: 6, forma: { tip: 'bila' } };
export const DEGROSARE = { pas: 3, pasLateral: 2.5, adaos: 0.5, unghi: 0 } as const;
export const FINISARE = { pas: 3, pasLateral: 1.5, unghi: 0 } as const;
/** Parametrii exportului: ca în fereastra lui, cu câte un fișier pe freză. */
export const PARAMETRI: ParametriExport = { origine: 'stanga-jos', z0: 'sus', strategieScula: 'fisiere-separate' };
export const BAZA = 'placa-18';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as const;

/** Înălțimea modelului în punctul (u, v) al reliefului (mm deasupra fundului). */
export function inaltime(u: number, v: number): number {
  const d2 = (u - CALOTA.cx) ** 2 + (v - CALOTA.cy) ** 2;
  const calota = Math.max(0, Math.sqrt(Math.max(0, CALOTA.raza ** 2 - d2)) - (CALOTA.raza - CALOTA.inaltime));
  const r = RAMPA;
  const rampa = v >= r.y0 && v <= r.y1 && u >= r.x0 && u <= r.x2 ? r.inaltime * Math.min(1, (u - r.x0) / (r.x1 - r.x0)) : 0;
  return Math.max(calota, rampa);
}

/** Grila reliefului: înălțimea în centrul fiecărei celule (j în sus). */
export function grila(): { readonly valori: Float64Array; readonly nx: number; readonly ny: number } {
  const nx = Math.round(RELIEF.latime / RELIEF.celula), ny = Math.round(RELIEF.inaltime / RELIEF.celula);
  const valori = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) valori[j * nx + i] = inaltime((i + 0.5) * RELIEF.celula, (j + 0.5) * RELIEF.celula);
  return { valori, nx, ny };
}

/** Documentul plăcii și dalele reliefului (ce ar sta în baza `cncvs2-relief` a browserului). */
export async function documentPlaca18(): Promise<{ readonly doc: Document; readonly resurse: ResurseRelief }> {
  const { valori, nx, ny } = grila();
  const s = await stratDinGrila(valori, nx, ny);
  const resurse: ResurseRelief = { [s.amprenta]: { text: s.text, octeti: Object.fromEntries(s.octeti) } };
  const d0 = documentNou({ ...FOAIA });
  const foaie = d0.foi[0];
  if (!foaie) throw new Error('documentul nou n-are foaie');
  const fara: Piesa = {
    id: 'relief', nume: 'Relieful plăcii 18',
    radacina: {
      tip: 'grup', id: 'g', matrice: { ...I }, copii: [{
        tip: 'element', id: 'r', matrice: { ...I },
        forma: { tip: 'relief', nx, ny, celula: RELIEF.celula, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: s.amprenta }] },
      }],
    },
    operatii: [],
  };
  const doc0: Document = { ...d0, piese: [fara], foi: [{ ...foaie, material: MATERIAL, instante: [{ id: 'i', piesa: fara.id, x: RELIEF.x, y: RELIEF.y, rotire: 0 }] }] };
  const ops = operatiiPentruRol(doc0, fara, 'relief3d');
  if (!ops || ops.length !== 2) throw new Error('rolul „Relief 3D”');
  const [deg, fin] = ops as [Operatie, Operatie];
  const operatii: Operatie[] = [
    { ...deg, scula: { ...FREZA_DEGROSARE }, pas: DEGROSARE.pas, pasLateral: DEGROSARE.pasLateral, degrosare: { adaos: DEGROSARE.adaos, unghi: DEGROSARE.unghi } },
    { ...fin, scula: { ...FREZA_FINISARE }, pas: FINISARE.pas, pasLateral: FINISARE.pasLateral, finisare: { unghi: FINISARE.unghi } },
  ];
  const u = incarca(JSON.parse(JSON.stringify({ ...doc0, piese: [{ ...fara, operatii }] })));
  if (!u.ok) throw new Error(`documentul plăcii 18 nu trece de ușă: ${u.motiv}`);
  return { doc: u.doc, resurse };
}

/** Fișierele plăcii: numele (cu baza `placa-18`) și textul, în ordinea programului. */
export async function fisierePlaca18(): Promise<{ readonly nume: string; readonly text: string; readonly secunde: number | null }[]> {
  const { doc, resurse } = await documentPlaca18();
  const r = await calculeazaExportul(doc, PARAMETRI, resurse);
  if (!r.ok) throw new Error(`placa 18: ${r.motiv}`);
  return r.fisiere.map((f) => ({ nume: cuBaza(f.nume, PARAMETRI.origine, BAZA), text: f.text, secunde: null }));
}

if (import.meta.main) {
  for (const f of await fisierePlaca18()) {
    writeFileSync(new URL(f.nume, import.meta.url), f.text);
    console.log(`${f.nume}  ${f.text.split('\n').length} linii`);
  }
}
