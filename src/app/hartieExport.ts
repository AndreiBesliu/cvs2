/**
 * Fereastra exportului „pe hârtie” (ADR 0291, felia 28.8↑h): ce face lucrarea cu valorile scrise într-un rând, socotit cu
 * funcțiile lucrării, nu cu copii în interfață. Fișa doar arată ce primește de aici:
 * - adâncimea tăiată (`adancimeTaiata`): cu bifa „și tăieturile cât foaia”, o tăietură cât foaia trece cu supracursa, iar gaura
 *   incrustației (ADR 0175) e mereu grosimea foii plus supracursa;
 * - trecerile pe ea (`adancimiTreceri`), pentru desenul adâncimii, notă, rampă și coborâre;
 * - felul găuririi fiecărui cerc (`felGaurire`) și pașii ciocănirii (`pasiCiocanire`), cu cercul care nu se poate găuri spus ca
 *   greșeală înainte de clic.
 * Locurile urechilor pe schiță rămân ale ferestrei (`exportDeseneCalcul.ts`, cu proba lor): lucrarea lor ar aduce aici parcurgerea
 * buclei, 1,3 kB, pentru un desen care nu e la scară.
 *
 * Doar module mici ale lucrării, fără parcurgere, offset sau degajări: CAM-ul greu rămâne în workerul lui (ADR 0109).
 */
import { felGaurire, pasiCiocanire, RETRAGERE_PARTIALA } from '../cam/gaurireFel.ts';
import { adancimeTaiata } from '../cam/prinFoaie.ts';
import { adancimiTreceri } from '../cam/treceri.ts';
import { creastaBuzunar, peretePeOParte } from '../model/creasta.ts';
import type { HartieRand, IntrareHartie } from '../ui/exportRand.ts';

export function hartieRand(i: IntrareHartie): HartieRand {
  let adancime: number | null;
  if (i.incrustatie === 'gaura') adancime = i.grosime === undefined ? null : adancimeTaiata({ tip: i.tip, adancime: i.grosime, incrustatie: 'gaura' }, i.grosime, i.supracursa, i.prinFoaie);
  else if (i.adancime === null) adancime = null;
  else adancime = i.grosime === undefined ? i.adancime : adancimeTaiata({ tip: i.tip, adancime: i.adancime, incrustatie: i.incrustatie }, i.grosime, i.supracursa, i.prinFoaie);
  const t = adancime !== null && i.pas !== null ? adancimiTreceri(adancime, i.pas) : null;
  const treceri = t === null || typeof t === 'string' ? null : t;
  if (i.tip === 'buzunar') {
    // Creasta de pe fund (ADR 0303 §4, felia 16.A↑e-5): doar cu bila sau cu toroidala și cu freza și pasul citite.
    const f = i.forma, D = i.diametruScula, s = i.pasLateral ?? null;
    const rotunda = f?.tip === 'bila' || f?.tip === 'toroidala';
    const creasta = rotunda && D !== null && s !== null ? creastaBuzunar({ numar: 0, nume: '', diametru: D, forma: f }, s) : null;
    return { adancime, treceri, gaurire: null, creasta };
  }
  if (i.tip === 'profil') {
    // Peretele pe o parte cu bila sau cu toroidala (ADR 0303 §4, felia 16.A↑e-6): la adâncimea tăiată, cu freza citită.
    const f = i.forma, D = i.diametruScula;
    const rotunda = f?.tip === 'bila' || f?.tip === 'toroidala';
    const perete = rotunda && i.peOParte === true && D !== null && adancime !== null
      ? peretePeOParte({ numar: 0, nume: '', diametru: D, forma: f }, adancime, i.grosime) : null;
    return { adancime, treceri, gaurire: null, perete };
  }
  if (i.tip !== 'gaurire') return { adancime, treceri, gaurire: null };
  const D = i.diametruScula;
  const cercuri = i.diametre.map((d) => ({ diametru: d, fel: D === null ? 'gresit' as const : felGaurire(d, D) }));
  const r = i.retragere;
  const ciocanire = treceri && r !== null && Number.isInteger(r) && r >= 1 && cercuri.some((c) => c.fel === 'ciocanire') ? pasiCiocanire(treceri, r) : null;
  return { adancime, treceri, gaurire: { cercuri, ciocanire, ridicare: RETRAGERE_PARTIALA } };
}
