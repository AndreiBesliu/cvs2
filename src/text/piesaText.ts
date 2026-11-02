/**
 * Piesa unui text (ADR 0105 §4): textul așezat (`asezare.ts`) devine o piesă cu câte un grup pe literă (litera cu golurile
 * ei rămâne întreagă la degrupare, ADR 0103), contururile ei ca forme „cale” închise, blocul de text pe rădăcină (cu
 * amprenta contururilor) și operațiile.
 *
 * Originea piesei e ancora textului: începutul liniei de bază a primului rând (aliniat la stânga), mijlocul ei (centrat)
 * sau capătul (la dreapta). Instanța stă în punctul ales pe foaie, iar rotirea ei se face în jurul ancorei.
 *
 * Operațiile unui text nou sunt ale unui import (ADR 0035 §8): din imbricarea tuturor contururilor, profilul pe exterior
 * pentru contururile de afară și pe interior pentru goluri. La editarea textului, fiecare operație veche se mută pe
 * contururile noi de același fel: un profil pe exterior pe cele de afară, unul pe interior pe goluri, orice altceva (un
 * buzunar, un V-carve, un profil pe linie) pe toate; o găurire (doar pe cercuri) nu mai are pe ce sta și se scoate.
 *
 * Un text cu un font cu o singură linie (ADR 0140) dă trăsături: forme „cale” deschise (buclele, închise), gravate pe linie
 * ca liniile deschise ale unui import (ADR 0037 §11: adâncimea `adancimeDeschise(grosime)`, într-o trecere). La editare, din
 * operațiile vechi rămân doar profilele care merg pe o linie (pe linie, la stânga, la dreapta), mutate pe toate trăsăturile;
 * dacă nu rămâne niciuna, gravura implicită.
 */
import { IDENTITATE } from '../geom/matrice.ts';
import type { Varf } from '../geom/contur.ts';
import { adancimeDeschise } from '../io/adancime.ts';
import { laturiDinImbricare } from '../io/imbricare.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { amprentaContururi, type BlocText } from '../model/blocText.ts';
import { operatieImplicita, PLAFON, type ElementNod, type GrupNod, type Latura, type Operatie, type Piesa, type VarfDoc } from '../model/document.ts';
import type { TextAsezat } from './asezare.ts';

export type RezultatPiesaText =
  | { readonly ok: true; readonly piesa: Piesa }
  /** `gol`: niciun contur (doar spații, sau caractere pe care fontul nu le are); `includeri`: imbricarea peste plafonul ei. */
  | { readonly ok: false; readonly motiv: 'gol' | 'includeri' | 'plafon' };

const varfDoc = (v: Varf): VarfDoc => ({
  p: { x: v.p.x, y: v.p.y },
  s: v.s.tip === 'C' ? { tip: 'C', c1: { x: v.s.c1.x, y: v.s.c1.y }, c2: { x: v.s.c2.x, y: v.s.c2.y } } : v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : { tip: 'L' },
});

/** Felul unei operații vechi, după care se mută pe contururile noi: de afară, golurile, sau toate. */
function felOperatie(o: Operatie): 'exterior' | 'interior' | 'toate' | null {
  if (o.tip === 'gaurire') return null;
  if (o.tip === 'profil' && (o.latura === 'exterior' || o.latura === 'interior')) return o.latura;
  return 'toate';
}

/** Un profil care merge pe o linie deschisă (pe linie, la stânga, la dreapta): rămâne pe trăsăturile unui text cu o linie. */
const peTrasatura = (o: Operatie): boolean => o.tip === 'profil' && o.latura !== 'exterior' && o.latura !== 'interior';

/**
 * Piesa textului `asezat` cu blocul `bloc` (fără amprentă: o pune constructorul) și id-ul `id`. `vechi`: piesa textului
 * editat, a cărei matrice a rădăcinii (oglindirea) și ale cărei operații se păstrează; lipsă: un text nou, cu operațiile
 * implicite, tăiate cu `scula` (freza foii, dacă are una singură). `grosime`: a foii, pentru adâncimea gravurii unui text cu
 * o singură linie.
 */
export function piesaText(
  asezat: TextAsezat, bloc: Omit<BlocText, 'amprenta'>, id: string, scula?: Operatie['scula'], vechi?: Piesa, grosime?: number,
): RezultatPiesaText {
  const grupuri: GrupNod[] = [];
  const cai: { varfuri: readonly Varf[]; inchis: boolean }[] = [];
  const iduri: string[] = [];
  asezat.glife.forEach((g, k) => {
    const copii: ElementNod[] = [];
    for (const c of g.cai) {
      const idElement = `c${cai.length + 1}`;
      cai.push({ varfuri: c.varfuri, inchis: c.inchis });
      iduri.push(idElement);
      copii.push({ tip: 'element', id: idElement, forma: { tip: 'cale', inchis: c.inchis, varfuri: c.varfuri.map(varfDoc) }, matrice: { ...IDENTITATE } });
    }
    grupuri.push({ tip: 'grup', id: `l${k + 1}`, nume: g.caracter, matrice: { ...IDENTITATE }, copii });
  });
  if (cai.length === 0) return { ok: false, motiv: 'gol' };
  const prima = grupuri.find((g) => g.copii.length > 0)!.copii[0] as ElementNod;
  const matrice = vechi && vechi.radacina.tip === 'grup' ? { ...vechi.radacina.matrice } : { ...IDENTITATE };
  const nume = (bloc.continut.split('\n').find((r) => r.trim() !== '') ?? bloc.continut).trim().slice(0, PLAFON.numeLungime);
  const piesa = (operatii: Operatie[]): RezultatPiesaText => ({
    ok: true,
    piesa: { id, nume, radacina: { tip: 'grup', id: 'g', matrice, copii: grupuri, text: { ...bloc, amprenta: amprentaContururi(grupuri) } }, operatii },
  });
  if (asezat.linie) {
    if (iduri.length > PLAFON.noduriOperatie) return { ok: false, motiv: 'plafon' };
    const pastrate = (vechi?.operatii ?? []).filter(peTrasatura).map((o) => ({ ...o, noduri: [...iduri] }));
    const adancime = adancimeDeschise(grosime);
    return piesa(pastrate.length > 0 ? pastrate : [{ ...operatieImplicita('deschise', prima.forma, scula), noduri: [...iduri], latura: 'pe-linie', adancime, pas: adancime }]);
  }
  const laturi = laturiDinImbricare(cai, PLAFON_IMPORT.includeri);
  if (!laturi) return { ok: false, motiv: 'includeri' };
  const pe = (l: Latura): string[] => iduri.filter((_, k) => laturi[k] === l);
  const noduri = { exterior: pe('exterior'), interior: pe('interior'), toate: iduri };
  if (Object.values(noduri).some((n) => n.length > PLAFON.noduriOperatie)) return { ok: false, motiv: 'plafon' };
  const operatii: Operatie[] = [];
  if (vechi) {
    for (const o of vechi.operatii) {
      const fel = felOperatie(o);
      if (fel !== null && noduri[fel].length > 0) operatii.push({ ...o, noduri: [...noduri[fel]] });
    }
  } else {
    for (const latura of ['exterior', 'interior'] as const) {
      if (noduri[latura].length > 0) operatii.push({ ...operatieImplicita(latura, prima.forma, scula), noduri: [...noduri[latura]], latura });
    }
  }
  return piesa(operatii);
}
