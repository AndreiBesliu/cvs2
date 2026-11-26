/**
 * Tăieturile cât grosimea foii, cu supracursa (ADR 0177): cu bifa din fereastra exportului, o operație de profil, de buzunar
 * sau de găurire, fără incrustație, scrisă cât grosimea foii (prima), se taie ca scrisă grosime plus supracursă. Rămân cum sunt
 * scrise: V-carve-urile (adâncimea lor e limita V-ului), incrustațiile (gaura are locașul ei, ADR 0175), operațiile reliefului
 * (finisarea, ADR 0312, și degroșarea, ADR 0313: adâncimea lor e podeaua modelului) și celelalte adâncimi (mai mici, sau deja
 * peste foaie: voia din ADR 0028 §2). În document, adâncimea nu se schimbă: doar lucrarea o vede așa.
 */
import type { Document, Operatie } from '../model/document.ts';
import { esteGaura } from '../model/incrustatie.ts';

/** „Cât foaia”: adâncimea scrisă e grosimea foii (numere zecimale scrise de om, deci practic egale). */
const EPS_FOAIE = 1e-9;

/**
 * Ce privește adâncimea tăiată a unei operații: felul ei, adâncimea scrisă și incrustația (fără, alta, sau gaura incrustației
 * cu pereți drepți, ADR 0175). Fereastra exportului o scrie din rândul ei, lucrarea din operație (`adancimeScrisa`).
 */
export type AdancimeScrisa = { readonly tip: Operatie['tip']; readonly adancime: number; readonly incrustatie: 'fara' | 'alta' | 'gaura' };

export const adancimeScrisa = (o: Operatie): AdancimeScrisa => ({
  tip: o.tip, adancime: o.adancime, incrustatie: esteGaura(o) ? 'gaura' : o.incrustatie ? 'alta' : 'fara',
});

/** O tăietură cât foaia, pe care bifa o duce prin foaie cu supracursa (ADR 0177). */
export const catFoaia = (o: AdancimeScrisa, grosime: number): boolean =>
  o.tip !== 'vcarve' && o.tip !== 'finisare' && o.tip !== 'degrosare' && o.incrustatie === 'fara' && Math.abs(o.adancime - grosime) <= EPS_FOAIE;

/**
 * Adâncimea pe care o taie lucrarea (ADR 0175 §1, ADR 0177): gaura incrustației, grosimea foii plus supracursa; cu bifa, o
 * tăietură cât foaia, la fel; restul, cea scrisă. Ce fac `cuGauriPrinFoaie` și `cuTaieturiPrinFoaie` pe document, pe o singură
 * operație: fereastra exportului desenează și numără trecerile pe ea (ADR 0291, felia 28.8↑h).
 */
export function adancimeTaiata(o: AdancimeScrisa, grosime: number, supracursa: number, prinFoaie: boolean): number {
  if (o.incrustatie === 'gaura') return grosime + supracursa;
  return prinFoaie && supracursa > 0 && catFoaia(o, grosime) ? grosime + supracursa : o.adancime;
}

/** Documentul pe care îl taie lucrarea; fără supracursă sau fără nicio tăietură cât foaia, același obiect. */
export function cuTaieturiPrinFoaie(doc: Document, supracursa: number): Document {
  const foaie = doc.foi[0];
  if (!foaie || !(supracursa > 0)) return doc;
  const grosime = foaie.stoc.grosime;
  const prin = (o: Operatie): boolean => catFoaia(adancimeScrisa(o), grosime);
  if (!doc.piese.some((p) => p.operatii.some(prin))) return doc;
  const adancime = grosime + supracursa;
  return { ...doc, piese: doc.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => (prin(o) ? { ...o, adancime } : o)) })) };
}
