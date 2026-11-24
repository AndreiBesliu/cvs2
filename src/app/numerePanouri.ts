import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import type { Contur } from '../geom/contur.ts';
import type { Document, Instanta, Piesa } from '../model/document.ts';
import { conturElement, cutieElement, esteContur } from '../model/forme.ts';
import { elementeInstanta, matriceInstanta } from '../model/lume.ts';
import { jocNumar, locNumar } from '../model/numarPanou.ts';
import type { RezultatTaiere } from '../model/taiere.ts';
import { sculaFoii, type NumarPanouCalculat } from '../ui/actiuniDocument.ts';

/**
 * Numerele panourilor tăiate (ADR 0181, felia 10.3↑n), pe firul principal, după calculul workerului: fiecare panou primește
 * cifrele lui („3”) ca un text adevărat, cu fontul inclus cu o singură linie (Relief SingleLine, ADR 0140), gravat pe linie
 * (piesa textului, ca un text nou: freza foii când are una singură, adâncimea liniilor deschise), pus unde încape pe panou
 * (`locNumar`, pe contururile bucăților lui). Modulul textului și fontul vin la cerere. Acțiunea `document.taie` dă pieselor
 * id-uri noi și le pune în grupurile panourilor.
 */

/** Fontul cifrelor: cel inclus, cu o singură linie (de gravat). */
export const FONT_NUMAR = 'relief-singleline';

type Bucata = { readonly instanta: Instanta; readonly piesa: Piesa };
type Ok = Extract<RezultatTaiere, { ok: true }>;

/** Contururile unei bucăți, în lume (o formă care nu se poate citi nu dă nimic: locul se caută pe celelalte). */
function contururi(b: Bucata): Contur[] {
  try {
    return elementeInstanta(b.piesa.radacina, b.instanta, matriceInstanta(b.instanta)).filter(esteContur).map((e) => conturElement(e));
  } catch {
    return [];
  }
}

/** Cutia piesei puse în origine (cifrele, față de originea textului). */
function cutiePiesei(p: Piesa): Cutie {
  let k = CUTIE_GOALA;
  for (const e of elementeInstanta(p.radacina, { id: 'n', piesa: p.id }, matriceInstanta({ x: 0, y: 0, rotire: 0 }))) k = uneste(k, cutieElement(e));
  return k;
}

/**
 * Numerele panourilor din rezultatul `rez` al tăierii în panouri (pe documentul `doc`, de la clic, și foaia `indexFoaie`), cu
 * cifrele de înălțimea `inaltime`: cele care au încăput și câte panouri au rămas fără număr; `font`: fontul nu s-a încărcat.
 */
export async function numerePanouri(doc: Document, indexFoaie: number, rez: Ok, nume: string, inaltime: number): Promise<
  { readonly numere: NumarPanouCalculat[]; readonly fara: number } | 'font'
> {
  const m = await import('../text/calcul.ts');
  const f = await m.incarcaFont(FONT_NUMAR);
  if (!f.ok) return 'font';
  const foaie = doc.foi[indexFoaie];
  if (!foaie || !rez.perPanou) return { numere: [], fara: rez.panouri ?? 0 };
  // Bucățile de după tăiere: cele noi, din degrupare; cele netăiate, de pe foaie.
  const bucati = new Map<string, Bucata>();
  for (const d of rez.degrupate) for (const x of d.parti) bucati.set(x.instanta.id, x);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  for (const i of foaie.instante) {
    const p = piese.get(i.piesa);
    if (!bucati.has(i.id) && p) bucati.set(i.id, { instanta: i, piesa: p });
  }
  const scula = sculaFoii(doc, foaie.id);
  const numere: NumarPanouCalculat[] = [];
  let fara = 0;
  rez.perPanou.forEach((ids, k) => {
    const continut = String(k + 1);
    const bloc = { continut, font: FONT_NUMAR, inaltime, spatiere: 0, interlinie: 1, aliniere: 'stanga' as const };
    const t = m.piesaText(m.aseazaText(f.font, bloc), bloc, `numar${k + 1}`, scula, undefined, foaie.stoc.grosime);
    const loc = t.ok ? locNumar(ids.flatMap((id) => { const b = bucati.get(id); return b ? contururi(b) : []; }), cutiePiesei(t.piesa), jocNumar(inaltime)) : null;
    if (!t.ok || !loc) {
      fara++;
      return;
    }
    numere.push({ nume: `${nume} ${continut}`, ids, piesa: t.piesa, x: loc.x, y: loc.y });
  });
  return { numere, fara };
}
