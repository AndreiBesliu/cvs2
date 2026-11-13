/**
 * Ce taie operațiile piesei din literele unei plăcuțe (ADR 0210 §4, §7; v23), pentru un text cu câmpuri al piesei (grupul
 * `g`). Ca la editarea unui text (ADR 0105 §4, `piesaText`): o operație care taie literele șablonului se mută pe literele
 * plăcuței de același fel, un profil pe exterior pe contururile de afară, unul pe interior pe goluri, orice altceva (un
 * buzunar, un V-carve, un profil pe linie) pe toate; o găurire (doar pe cercuri) nu mai are pe ce sta. O operație care nu
 * taie nimic din literele șablonului (rama plăcuței, găurile ei) nu taie nici din ale plăcuței.
 *
 * Fără font: felul fiecărui contur vine din imbricarea contururilor plăcuței (ca la import, ADR 0035 §8), deci operațiile se
 * pot muta din nou pe literele deja făcute când piesa își schimbă operațiile (rolul de tăiere, ADR 0112).
 */
import type { Contur } from '../geom/conturBaza.ts';
import { compune, IDENTITATE, type Matrice } from '../geom/matrice.ts';
import { noduriPiesa, type Latura, type Nod, type Operatie, type Piesa } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { laturiDinImbricare } from './imbricare.ts';
import { PLAFON_IMPORT } from './svgCoduri.ts';

/** Felul unei operații, după care se mută pe contururile noi: de afară, golurile, sau toate; null: o găurire. */
export function felOperatie(o: Operatie): 'exterior' | 'interior' | 'toate' | null {
  if (o.tip === 'gaurire') return null;
  if (o.tip === 'profil' && (o.latura === 'exterior' || o.latura === 'interior')) return o.latura;
  return 'toate';
}

/** Elementele literelor, în preordine (ordinea contururilor textului), cu conturul lor în sistemul grupului textului. */
function elementeLitere(copii: readonly Nod[]): Array<{ readonly id: string; readonly contur: Contur }> {
  const rez: Array<{ id: string; contur: Contur }> = [];
  const viziteaza = (n: Nod, m: Matrice): void => {
    const mn = compune(m, n.matrice);
    if (n.tip === 'element') rez.push({ id: n.id, contur: conturElement({ forma: n.forma, matrice: mn }) });
    else for (const c of n.copii) viziteaza(c, mn);
  };
  for (const c of copii) viziteaza(c, IDENTITATE);
  return rez;
}

/**
 * Literele plăcuței (copiii grupului `g`, în locul literelor șablonului) tăiate de fiecare operație a piesei `p`: id-ul
 * operației → elementele, în ordinea textului; o operație fără nimic de tăiat lipsește. Null: imbricarea contururilor trece
 * de plafonul ei (ca la import, `includeri`).
 */
export function operatiiPlacutei(p: Piesa, g: string, copii: readonly Nod[]): Record<string, string[]> | null {
  const grup = noduriPiesa(p.radacina).find((x) => x.nod.id === g)?.nod;
  const sablon = new Set<string>();
  if (grup?.tip === 'grup') for (const c of grup.copii) for (const { nod } of noduriPiesa(c)) if (nod.tip === 'element') sablon.add(nod.id);
  const rez: Record<string, string[]> = {};
  const taie = p.operatii.filter((o) => o.noduri.some((n) => sablon.has(n)));
  if (taie.length === 0) return rez;
  const elemente = elementeLitere(copii);
  let laturi: Latura[] | null | undefined;
  for (const o of taie) {
    const fel = felOperatie(o);
    if (fel === null) continue;
    let noduri: string[];
    if (fel === 'toate') noduri = elemente.map((e) => e.id);
    else {
      laturi ??= laturiDinImbricare(elemente.map((e) => e.contur), PLAFON_IMPORT.includeri);
      if (laturi === null) return null;
      const l = laturi;
      noduri = elemente.filter((_, k) => l[k] === fel).map((e) => e.id);
    }
    if (noduri.length > 0) rez[o.id] = noduri;
  }
  return rez;
}
