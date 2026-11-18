import type { Piesa } from './document.ts';

/**
 * Distanța dintre piesele puse una lângă alta (ADR 0210 §3, felia 11.3↑b): tăietura profilului exterior ocupă, în afara
 * piesei, cât freza. Minimul e deci freza: sub el, tăietura unei piese intră în vecina ei (refuz). Cu urechi, minimul nu e
 * de ajuns. Sub 2 × freza, tăieturile vecine se unesc, iar urechile dinspre vecini nu mai au lemn de care să se țină: ele
 * stau la un sfert și la trei sferturi din drum, nu față în față. Pe placa 11, la 5 mm cu Ø3,175, cad 9 din 15 plăcuțe.
 * Distanța propusă lasă `LEMN_URECHI` mm de lemn între tăieturi: 2 × freza + 3, rotunjită în sus la milimetru (10 cu
 * Ø3,175, ca pe placă). Sub ea apare avertismentul, nu refuzul. Acolo unde omul n-a scris nicio distanță («Încă…», «+1»,
 * „Mută și așază la capăt”, «Din CSV…»), distanța urcă singură până la ea.
 */

/** Lemnul lăsat între tăieturile a două piese vecine cu urechi (mm): fâșia de care se țin urechile. */
export const LEMN_URECHI = 3;

/** Cea mai mare freză a profilelor exterioare ale unei piese (mm), sau 0. */
export function frezaExterioara(p: Piesa): number {
  let d = 0;
  for (const o of p.operatii) if (o.tip === 'profil' && o.latura === 'exterior') d = Math.max(d, o.scula.diametru);
  return d;
}

/** Piesa are urechi pe un profil exterior: se decupează din foaie și stă în ea prin urechi. */
export function cuUrechi(p: Piesa): boolean {
  return p.operatii.some((o) => o.tip === 'profil' && o.latura === 'exterior' && o.urechi !== null);
}

/**
 * Distanța propusă lângă piese tăiate pe dinafară cu freza `freza` (mm): cu urechi, 2 × freza + `LEMN_URECHI`, rotunjită în
 * sus la milimetru; fără urechi, chiar freza. Suma iese întreagă doar când freza e un multiplu de 0,5 mm, deci exactă în
 * virgulă mobilă: rotunjirea n-are rest de ocolit.
 */
export function distantaCuUrechi(freza: number, urechi: boolean): number {
  return urechi ? Math.ceil(2 * freza + LEMN_URECHI) : freza;
}
