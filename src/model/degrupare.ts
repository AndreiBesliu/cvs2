/**
 * Degruparea (ADR 0103): o piesă al cărei arbore e un grup cu cel puțin doi copii (un import SVG / DXF, o formă cu găuri) se
 * desface, un singur nivel, în câte o piesă pe fiecare copil. Fiecare parte își ia operațiile piesei pe nodurile ei (aceeași
 * latură, adâncime, sculă) și stă în lume exact unde stătea: matricea grupului intră în rădăcina ei. Pură; comanda (id-urile,
 * locul în liste, schema) e a acțiunii `document.degrupeaza`.
 */
import { compune } from '../geom/matrice.ts';
import type { Matrice, Nod, Operatie, Piesa } from './document.ts';

/** De ce o piesă nu se desface. */
export type MotivDegrupare = 'o-singura-forma' | 'vcarve';

/** O parte a piesei: rădăcina (un copil al grupului, cu matricea grupului compusă) și operațiile ei, în ordinea piesei. */
export type ParteDegrupata = { readonly radacina: Nod; readonly operatii: readonly Operatie[] };

const eIdentitate = (m: Matrice): boolean => m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0;

/** Al câtelea copil al grupului poartă fiecare element (oricât de adânc), fără recursie. */
function copilulElementelor(copii: readonly Nod[]): Map<string, number> {
  const al = new Map<string, number>();
  copii.forEach((c, k) => {
    const stiva: Nod[] = [c];
    for (let x = stiva.pop(); x; x = stiva.pop()) {
      if (x.tip === 'element') al.set(x.id, k);
      else for (const y of x.copii) stiva.push(y);
    }
  });
  return al;
}

/**
 * Părțile piesei, în ordinea copiilor grupului, sau motivul pentru care nu se desface:
 * - `o-singura-forma`: rădăcina e un element, sau un grup cu un singur copil (n-ar avea ce desface);
 * - `vcarve`: un V-carve își citește contururile împreună, par-impar (literele cu golurile lor, ADR 0090): despărțite în
 *   piese, golurile s-ar săpa și ele.
 *
 * Restul rămâne cum se taia: profilul, linia și găurirea sunt ale fiecărui contur, regiunea păstrată se socotește pe toată
 * foaia (ADR 0026), iar buzunarele de aceeași adâncime se citesc împreună pe toată foaia (ADR 0073). O operație pe noduri
 * din mai mulți copii se împarte: fiecare parte o primește pe nodurile ei, cu același id.
 */
export function partiDegrupare(piesa: Piesa): readonly ParteDegrupata[] | MotivDegrupare {
  const g = piesa.radacina;
  if (g.tip !== 'grup' || g.copii.length < 2) return 'o-singura-forma';
  const al = copilulElementelor(g.copii);
  for (const o of piesa.operatii) {
    if (o.tip !== 'vcarve') continue;
    const copii = new Set(o.noduri.map((n) => al.get(n)).filter((k) => k !== undefined));
    if (copii.size > 1) return 'vcarve';
  }
  // Cu grupul fără transformare (importul, desenul), rădăcina fiecărei părți e chiar copilul: lumea rămâne la bit.
  const fara = eIdentitate(g.matrice);
  return g.copii.map((c, k) => ({
    radacina: fara ? c : { ...c, matrice: compune(g.matrice, c.matrice) },
    operatii: piesa.operatii.flatMap((o) => {
      const noduri = o.noduri.filter((n) => al.get(n) === k);
      return noduri.length > 0 ? [{ ...o, noduri }] : [];
    }),
  }));
}
