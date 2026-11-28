/**
 * Simularea salvată ca strat (ADR 0322 §5.4, felia 18.1↑g-3), adusă la primul clic din secțiunea Relieful a panoului: programul
 * foii active simulat (ca în vederea 3D, `programSimulare`) pe fereastra reliefului de pe foaie, la celula lui pe foaie, cu
 * colțul ferestrei în colțul cutiei lui (la un relief drept, centrele pixelilor cad pe centrele celulelor); apoi, în workerul
 * reliefului, suprafața tăiată pe grila reliefului, în Z-ul lui (dz ca la lucrare), păstrată în baza reliefurilor. Rezultatul e
 * forma nouă, cu un strat ascuns („înlocuiește”): nu schimbă ce se taie până nu-l arată omul.
 */
import { reliefInBazin } from '../jobs/bazinRelief.ts';
import type { Document, FormaRelief } from '../model/document.ts';
import { degrosariFoaie, finisariFoaie } from '../model/finisare.ts';
import { doarFoaia } from '../model/foi.ts';
import { elementeFoaie } from '../model/lume.ts';
import { cuStratNou } from '../model/straturiRelief.ts';
import { citesteStrat, pastreazaStrat } from './reliefStocare.ts';

export type StratSimulat =
  | { readonly ok: true; readonly forma: FormaRelief }
  | { readonly ok: false; readonly fel: 'lipsa' | 'plin' | 'afara' | 'refuz' | 'eroare'; readonly motiv?: string };

/** Cea mai mică celulă a simulării (cea a ferestrei fine a vederii 3D e 0,1 mm): sub ea, un relief fin se citește cel mai aproape. */
export const CELULA_SIMULARE_MINIMA = 0.05;

/**
 * Stratul din simularea foii `idFoaie` (lipsă: prima) pentru elementul-relief `nod` al instanței `instanta`, cu numele dat;
 * sau de ce nu se poate: un strat vizibil lipsă din browser, relieful plin de straturi, relieful în afara foii, simularea refuzată.
 */
export async function stratDinSimulare(doc: Document, idFoaie: string | null | undefined, instanta: string, nod: string, nume: string): Promise<StratSimulat> {
  const d = doarFoaia(doc, idFoaie), foaie = d.foi[0];
  const el = elementeFoaie(d, 0).find((e) => e.instanta === instanta && e.nod === nod);
  if (!foaie || !el || el.forma.tip !== 'relief') return { ok: false, fel: 'eroare', motiv: `${instanta}/${nod} nu e un relief pe foaie` };
  const f = el.forma, m = el.matrice;
  if (!cuStratNou(f, { dale: '', nume })) return { ok: false, fel: 'plin' };
  // Planul zero, ca la lucrare: al finisării (sau al degroșării) care taie acest relief; lipsă: vârful la fața plăcii.
  const op = [...finisariFoaie(d, 0), ...degrosariFoaie(d, 0)].find((x) => x.instanta === instanta && x.reliefuri.some((r) => r.nod === nod))?.operatie;
  const planZero = (op?.tip === 'degrosare' ? op.degrosare : op?.finisare)?.planZero;
  // Straturile vizibile (pentru vârful compusului, fără plan zero).
  const straturi = [];
  for (const s of f.straturi) {
    if (!s.vizibil) continue;
    const st = await citesteStrat(s.dale);
    if (!st) return { ok: false, fel: 'lipsa' };
    straturi.push({ mod: s.mod, vizibil: true, harta: st.text, octeti: st.octeti });
  }
  // Fereastra: cutia reliefului pe foaie, tăiată la foaie, la celula lui pe foaie.
  const L = f.nx * f.celula, H = f.ny * f.celula, xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[0, 0], [L, 0], [0, H], [L, H]] as const) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
  const x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys));
  const x1 = Math.min(foaie.stoc.latime, Math.max(...xs)), y1 = Math.min(foaie.stoc.inaltime, Math.max(...ys));
  if (!(x1 > x0 && y1 > y0)) return { ok: false, fel: 'afara' };
  const celula = Math.max(CELULA_SIMULARE_MINIMA, f.celula * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)));
  const calc = await import('../ui/actiuniExportCalcul.ts');
  const p = await calc.programSimulare(d);
  if (!p.ok) return { ok: false, fel: 'refuz', motiv: p.motiv };
  const r = await calc.simuleazaRelief(p, { x0, y0, latime: x1 - x0, inaltime: y1 - y0, celula });
  if (!r.ok) return { ok: false, fel: r.eroare ? 'eroare' : 'refuz', motiv: r.motiv };
  const s = await reliefInBazin({
    tip: 'din-simulare', nx: f.nx, ny: f.ny, celula: f.celula, matrice: m, straturi,
    simulare: { x0, y0, celula, bloc: r.bloc, latime: r.latime, inaltime: r.inaltime, z: r.z }, ...(planZero !== undefined ? { planZero } : {}),
  }, { transfera: true });
  if (!s.ok) return s.cod === 'dale-lipsa' ? { ok: false, fel: 'lipsa' } : { ok: false, fel: s.cod === 'gol' ? 'afara' : 'eroare', motiv: s.cod };
  if (s.tip !== 'din-imagine') return { ok: false, fel: 'eroare', motiv: s.tip };
  await pastreazaStrat({ text: s.harta, amprenta: s.amprenta }, s.octeti);
  const nou = cuStratNou(f, { dale: s.amprenta, nume, mod: 'inlocuieste', vizibil: false });
  return nou ? { ok: true, forma: nou } : { ok: false, fel: 'plin' };
}
