/**
 * Tăieturile cât grosimea foii, cu supracursa (ADR 0177): cu bifa din fereastra exportului, o operație de profil, de buzunar
 * sau de găurire, fără incrustație, scrisă cât grosimea foii (prima), se taie ca scrisă grosime plus supracursă. Rămân cum sunt
 * scrise: V-carve-urile (adâncimea lor e limita V-ului), incrustațiile (gaura are locașul ei, ADR 0175) și celelalte adâncimi
 * (mai mici, sau deja peste foaie: voia din ADR 0028 §2). În document, adâncimea nu se schimbă: doar lucrarea o vede așa.
 */
import type { Document, Operatie } from '../model/document.ts';

/** „Cât foaia”: adâncimea scrisă e grosimea foii (numere zecimale scrise de om, deci practic egale). */
const EPS_FOAIE = 1e-9;

/** Documentul pe care îl taie lucrarea; fără supracursă sau fără nicio tăietură cât foaia, același obiect. */
export function cuTaieturiPrinFoaie(doc: Document, supracursa: number): Document {
  const foaie = doc.foi[0];
  if (!foaie || !(supracursa > 0)) return doc;
  const grosime = foaie.stoc.grosime;
  const prin = (o: Operatie): boolean => o.tip !== 'vcarve' && !o.incrustatie && Math.abs(o.adancime - grosime) <= EPS_FOAIE;
  if (!doc.piese.some((p) => p.operatii.some(prin))) return doc;
  const adancime = grosime + supracursa;
  return { ...doc, piese: doc.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => (prin(o) ? { ...o, adancime } : o)) })) };
}
