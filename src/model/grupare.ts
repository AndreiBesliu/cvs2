/**
 * Gruparea (ADR 0130), inversul degrupării (ADR 0103): instanțele alese, fiecare cu piesa ei, devin o instanță cu o piesă
 * nouă, al cărei grup-rădăcină (fără transformare) are câte un copil pe instanță, rădăcina piesei ei, în ordinea dată (a
 * foii). Lumea rămâne la bit: cu același loc la toate, grupul îl primește și copiii rămân cum sunt; altfel grupul stă în
 * origine, iar locul fiecărei instanțe intră în rădăcina ei. Operațiile se înșiră, parte după parte, deci ordinea tăierii
 * rămâne. Id-urile care s-ar repeta în piesă primesc `_<n>`. Pură; comanda (id-ul, locurile, schema) e a acțiunii
 * `document.grupeaza`.
 */
import { compune, IDENTITATE } from '../geom/matrice.ts';
import { amprentaContururi, blocText } from './blocText.ts';
import { PLAFON, type GrupNod, type Instanta, type Nod, type Operatie, type Piesa } from './document.ts';
import { matriceInstanta, valoriVcarve } from './lume.ts';

/** De ce instanțele alese nu se grupează: mai puțin de două, sau V-carve-uri care s-ar săpa împreună. */
export type MotivGrupare = 'doua' | 'vcarve';

export type ParteGrupata = { readonly instanta: Instanta; readonly piesa: Piesa };

/** Id-ul, dacă e liber, altfel `<id>_<n>` cu primul n liber de la 2 (tăiat cât să încapă în plafonul id-urilor); ținut ca folosit. */
function idLiber(id: string, folosite: Set<string>): string {
  let nou = id;
  for (let n = 2; folosite.has(nou); n++) {
    const sufix = `_${n}`;
    nou = `${id.slice(0, PLAFON.idLungime - sufix.length)}${sufix}`;
  }
  folosite.add(nou);
  return nou;
}

/**
 * Arborele cu id-urile care s-ar repeta schimbate (`redenumite`: vechi → nou, pentru operațiile părții). Un nod neatins
 * rămâne același obiect. Blocul unui text (ADR 0105 §4) e legat de contururi prin amprenta lor, cu id-uri cu tot: cu
 * id-urile noi, primește amprenta lor, deci textul se editează din nou după degrupare.
 */
function cuIdLiber(n: Nod, folosite: Set<string>, redenumite: Map<string, string>): Nod {
  const id = idLiber(n.id, folosite);
  if (id !== n.id) redenumite.set(n.id, id);
  if (n.tip === 'element') return id === n.id ? n : { ...n, id };
  const copii = n.copii.map((c) => cuIdLiber(c, folosite, redenumite));
  if (id === n.id && copii.every((c, k) => c === n.copii[k])) return n;
  const nou: GrupNod = { ...n, id, copii };
  return blocText(n) ? { ...nou, text: { ...(n['text'] as Record<string, unknown>), amprenta: amprentaContururi(copii) } } : nou;
}

const inOrigine = (i: Instanta): boolean => i.x === 0 && i.y === 0 && i.rotire === 0;

/**
 * Instanța și piesa grupului (cu id-ul dat), sau motivul:
 * - `doua`: mai puțin de două părți;
 * - `vcarve`: două părți au câte un V-carve cu aceleași valori (`valoriVcarve`): o piesă își sapă V-carve-urile cu aceleași
 *   valori ca o singură regiune, par-impar, deci grupate s-ar săpa împreună, alt traseu.
 *
 * Instanța grupului copiază câmpurile primei instanțe, cu locul comun sau originea; piesa lui ia numele comun al pieselor
 * (niciunul, dacă diferă) și câmpurile primei piese.
 */
export function grupDin(parti: readonly ParteGrupata[], id: string): { readonly instanta: Instanta; readonly piesa: Piesa } | MotivGrupare {
  const [prima] = parti;
  if (!prima || parti.length < 2) return 'doua';
  const vcarve = new Map<string, number>();
  for (const [k, x] of parti.entries()) {
    for (const o of x.piesa.operatii) {
      if (o.tip !== 'vcarve') continue;
      const v = valoriVcarve(o);
      const alta = vcarve.get(v);
      if (alta !== undefined && alta !== k) return 'vcarve';
      vcarve.set(v, k);
    }
  }
  const p0 = prima.instanta;
  const acelasiLoc = parti.every(({ instanta: i }) => i.x === p0.x && i.y === p0.y && i.rotire === p0.rotire);
  const noduri = new Set<string>();
  const idOperatii = new Set<string>();
  const copii: Nod[] = [];
  const operatii: Operatie[] = [];
  for (const { instanta, piesa } of parti) {
    // Documentul nu se schimbă pe loc (ADR 0024), deci nodurile neatinse rămân aceleași obiecte, în piesa veche și în grup.
    const r = piesa.radacina;
    // Locul instanței intră în rădăcină doar când grupul stă în origine; una din origine n-are ce aduce.
    const radacina = acelasiLoc || inOrigine(instanta) ? r : { ...r, matrice: compune(matriceInstanta(instanta), r.matrice) };
    const redenumite = new Map<string, string>();
    copii.push(cuIdLiber(radacina, noduri, redenumite));
    for (const o of structuredClone(piesa.operatii)) operatii.push({ ...o, id: idLiber(o.id, idOperatii), noduri: o.noduri.map((n) => redenumite.get(n) ?? n) });
  }
  const loc = acelasiLoc ? { x: p0.x, y: p0.y, rotire: p0.rotire } : { x: 0, y: 0, rotire: 0 };
  const { id: _id, nume, radacina: _radacina, operatii: _operatii, ...rest } = prima.piesa;
  const comun = parti.every((x) => x.piesa.nume === nume) ? nume : undefined;
  return {
    instanta: { ...structuredClone(p0), id, piesa: id, ...loc },
    piesa: {
      ...structuredClone(rest), id, ...(comun === undefined ? {} : { nume: comun }),
      radacina: { tip: 'grup', id: idLiber('g', noduri), matrice: { ...IDENTITATE }, copii }, operatii,
    },
  };
}
