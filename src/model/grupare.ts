/**
 * Gruparea (ADR 0130), inversul degrupării (ADR 0103): instanțele alese, fiecare cu piesa ei, devin o instanță cu o piesă
 * nouă, al cărei grup-rădăcină (fără transformare) are câte un copil pe instanță, rădăcina piesei ei, în ordinea dată (a
 * foii). Lumea rămâne la bit: cu același loc la toate, grupul îl primește și copiii rămân cum sunt; altfel grupul stă în
 * origine, iar locul fiecărei instanțe intră în rădăcina ei. Operațiile se înșiră, parte după parte, deci ordinea tăierii
 * rămâne. Id-urile care s-ar repeta în piesă primesc `_<n>`. Pură; comanda (id-ul, locurile, schema) e a acțiunii
 * `document.grupeaza`.
 */
import { cerculArcului, numarSegmente, segment, type Contur, type Punct, type Segment } from '../geom/conturBaza.ts';
import { cutieContur, largita, type Cutie } from '../geom/cutie.ts';
import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
import { compune, IDENTITATE } from '../geom/matrice.ts';
import { amprentaContururi, blocText } from './blocText.ts';
import { PLAFON, type GrupNod, type Instanta, type Nod, type Operatie, type Piesa } from './document.ts';
import { conturElement } from './forme.ts';
import { elementeInstanta, matriceInstanta, valoriVcarve } from './lume.ts';

/** De ce instanțele alese nu se grupează: mai puțin de două, sau V-carve-uri care s-ar amesteca. */
export type MotivGrupare = 'doua' | 'vcarve';

/**
 * Sub atât (mm), două regiuni V-carve se ating: pasul punctelor pe contur și pragul distanței până la celălalt. Un contur
 * care îl taie pe altul are un punct la cel mult jumătate din pas de tăietură, deci prins.
 */
const PRAG_ATINGERE = 0.05;

/** Puncte pe segment, la cel mult `h` unul de altul (pe o margine de sus a lungimii), fără capătul b. */
function puncteSegment(a: Punct, b: Punct, s: Segment, h: number): Punct[] {
  if (s.tip === 'A') {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const n = Math.max(1, Math.ceil((Math.abs(baleiaj) * raza) / h));
    return Array.from({ length: n }, (_, k) => {
      const u = start + (baleiaj * k) / n;
      return { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
    });
  }
  const lung = s.tip === 'L' ? Math.hypot(b.x - a.x, b.y - a.y)
    : Math.hypot(s.c1.x - a.x, s.c1.y - a.y) + Math.hypot(s.c2.x - s.c1.x, s.c2.y - s.c1.y) + Math.hypot(b.x - s.c2.x, b.y - s.c2.y);
  const n = Math.max(1, Math.ceil(lung / h));
  return Array.from({ length: n }, (_, k) => {
    const t = k / n, u = 1 - t;
    if (s.tip === 'L') return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const [w0, w1, w2, w3] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return { x: w0 * a.x + w1 * s.c1.x + w2 * s.c2.x + w3 * b.x, y: w0 * a.y + w1 * s.c1.y + w2 * s.c2.y + w3 * b.y };
  });
}

const seAtingCutiile = (a: Cutie, b: Cutie): boolean => a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;

/**
 * Regiunile par-impar a două grupe de contururi închise se ating sau se suprapun. Întâi atingerea: un punct al unui contur
 * din A la cel mult `PRAG_ATINGERE` de unul din B (cutiile le despart pe cele departe). Fără atingeri, fiecare contur stă
 * întreg înăuntrul regiunii celeilalte grupe sau întreg în afara ei, deci îl spune un vârf al lui: două regiuni care se
 * suprapun au o față comună, iar conturul care o mărginește pe dinafară stă, cu totul, în regiunea celeilalte.
 */
function seSuprapun(A: readonly Contur[], B: readonly Contur[]): boolean {
  const cutiiB = B.map(cutieContur);
  for (const a of A) {
    const k = largita(cutieContur(a), PRAG_ATINGERE);
    const aproape = B.filter((_, j) => seAtingCutiile(k, cutiiB[j] as Cutie));
    if (aproape.length === 0) continue;
    for (let i = 0; i < numarSegmente(a); i++) {
      const { a: p, b: q, s } = segment(a, i);
      for (const x of puncteSegment(p, q, s, PRAG_ATINGERE)) if (aproape.some((c) => distantaLaContur(x, c) <= PRAG_ATINGERE)) return true;
    }
  }
  const inCealalta = (c: Contur, alta: readonly Contur[]): boolean => {
    const p = c.varfuri[0]?.p;
    return p !== undefined && inRegiune(p, alta);
  };
  return B.some((c) => inCealalta(c, A)) || A.some((c) => inCealalta(c, B));
}

/**
 * V-carve-urile cu aceleași valori (`valoriVcarve`) din părți diferite se sapă, în grup, ca o singură regiune par-impar
 * (ADR 0112). Cât regiunile lor nu se ating și nu se suprapun, regiunea comună e chiar reuniunea lor, deci se sapă la fel
 * (două texte alăturate, un text în golul unei litere: decizia owner-ului, ADR 0130 §5). Altfel s-ar amesteca: o
 * suprapunere ar rămâne nesăpată.
 */
function vcarveSeAmesteca(parti: readonly ParteGrupata[]): boolean {
  const pe = new Map<string, Contur[][]>();
  for (const { instanta, piesa } of parti) {
    const ops = piesa.operatii.filter((o) => o.tip === 'vcarve');
    if (ops.length === 0) continue;
    const elemente = new Map(elementeInstanta(piesa.radacina, instanta, matriceInstanta(instanta)).map((e) => [e.nod, e]));
    const aici = new Map<string, Contur[]>();
    for (const o of ops) {
      const v = valoriVcarve(o);
      const l = aici.get(v) ?? [];
      for (const n of o.noduri) {
        const e = elemente.get(n);
        if (e) l.push(conturElement(e));
      }
      aici.set(v, l);
    }
    for (const [v, l] of aici) pe.set(v, [...(pe.get(v) ?? []), l.filter((c) => c.inchis)]);
  }
  for (const grupe of pe.values()) {
    for (let a = 0; a < grupe.length; a++) {
      for (let b = a + 1; b < grupe.length; b++) if (seSuprapun(grupe[a] ?? [], grupe[b] ?? [])) return true;
    }
  }
  return false;
}

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
 * - `vcarve`: două părți au V-carve-uri cu aceleași valori ale căror regiuni se ating sau se suprapun (`vcarveSeAmesteca`).
 *
 * Instanța grupului copiază câmpurile primei instanțe, cu locul comun sau originea; piesa lui ia numele comun al pieselor
 * (niciunul, dacă diferă) și câmpurile primei piese.
 */
export function grupDin(parti: readonly ParteGrupata[], id: string): { readonly instanta: Instanta; readonly piesa: Piesa } | MotivGrupare {
  const [prima] = parti;
  if (!prima || parti.length < 2) return 'doua';
  if (vcarveSeAmesteca(parti)) return 'vcarve';
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
