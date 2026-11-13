/**
 * Tăierea în panouri (ADR 0181 §7, felia 10.3↑k), pură, în worker. Formele alese (instanțele date, pe foaia de lucru) se taie pe
 * grila lor (`grilaPanouri`, peste cutia lor exactă), linie cu linie, cu tăierea dreaptă (`taie`, cu închiderea, spațiul și
 * îmbinarea cererii, și cu `desparte`: o formă cu contururi de ambele părți ale unei linii care nu le trece se desparte), întâi
 * verticalele, apoi orizontalele. Fiecare bucată ține coloanele și rândurile între care poate fi, iar o linie taie doar bucățile
 * care o încalecă: o tăietură dă partea A (stânga, dedesubt), apoi B; o bucată netăiată e de partea mijlocului cutiei ei. La
 * capăt, fiecare bucată e într-o celulă; celulele cu bucăți, rând cu rând de jos și de la stânga, sunt „Panoul 1”, „Panoul 2” …:
 * mai multe bucăți devin un grup (`grupDin`) cu numele panoului, una singură își ia numele. Bucățile stau unde erau; o celulă
 * goală nu primește număr. Pe foaie (și în programul mașinii), bucățile unei forme vin în ordinea panourilor.
 *
 * Rezultatul e al tăierii (`RezultatTaiere`), un singur pas de anulare: degruparea compusă (fiecare formă schimbată, cu bucățile
 * ei de la capăt, cu id-uri nefolosite în document; o formă întreagă, singură în panoul ei, rămâne cu id-ul ei și piesa
 * redenumită) și grupurile panourilor (`grupuri`: comanda `regrupeaza`, cu locurile părților în documentul de după degrupare).
 * V-carve-urile care s-ar amesteca într-un grup (ADR 0130) lasă panoul negrupat, cu numele lui pe fiecare bucată.
 *
 * Refuzurile: `nimic-ales`, `impartita` (o piesă pusă de mai multe ori), ale grilei (`valoare`, `panouri`), `nimic-taiat` (un
 * singur panou) și ale tăierii, de la prima linie care le dă.
 */
import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import type { Document, Instanta, Piesa } from './document.ts';
import { cutieElement } from './forme.ts';
import { grilaPanouri, type GrilaPanouri } from './grilaPanouri.ts';
import { grupDin } from './grupare.ts';
import type { Imbinare } from './imbinare.ts';
import { executa, istoricNou, type Degrupata } from './jurnal.ts';
import { elementeInstanta, matriceInstanta } from './lume.ts';
import { taie, type Intre, type MotivTaiere, type RezultatTaiere } from './taiere.ts';

export type CererePanouri = {
  /** Instanțele de tăiat, pe foaia de lucru (fără alegere, interfața le dă pe toate ale foii). */
  readonly alese: readonly string[];
  readonly grila: GrilaPanouri;
  readonly inchide: boolean;
  readonly intre?: Intre;
  readonly imbinare?: Imbinare;
  /** Numele panourilor, fără număr („Panoul”): al n-lea e „Panoul n”. */
  readonly nume: string;
};

/** O bucată: forma din care vine (`orig`), coloanele și rândurile între care poate fi, și dacă e nouă (tăiată sau despărțită). */
type Bucata = {
  readonly orig: string;
  readonly instanta: Instanta;
  readonly piesa: Piesa;
  readonly c: readonly [number, number];
  readonly r: readonly [number, number];
  readonly noua: boolean;
};

const refuz = (motiv: MotivTaiere): RezultatTaiere => ({ ok: false, motiv });
const cutieInstanta = (i: Instanta, p: Piesa): Cutie => elementeInstanta(p.radacina, i, matriceInstanta(i)).reduce((k, e) => uneste(k, cutieElement(e)), CUTIE_GOALA);

export function taieInPanouri(doc: Document, cerere: CererePanouri, indexFoaie = 0): RezultatTaiere {
  const foaie = doc.foi[indexFoaie];
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const alese = new Set(cerere.alese);
  const initiale = (foaie?.instante ?? []).filter((i) => alese.has(i.id) && piese.has(i.piesa));
  if (!foaie || initiale.length === 0) return refuz('nimic-ales');
  const folosiri = new Map<string, number>();
  const ocupate = new Set(piese.keys());
  for (const f of doc.foi) {
    for (const i of f.instante) {
      folosiri.set(i.piesa, (folosiri.get(i.piesa) ?? 0) + 1);
      ocupate.add(i.id);
    }
  }
  if (initiale.some((i) => (folosiri.get(i.piesa) ?? 0) > 1)) return refuz('impartita');
  const piesa = (i: Instanta): Piesa => piese.get(i.piesa) as Piesa;
  const grila = grilaPanouri(initiale.reduce((k, i) => uneste(k, cutieInstanta(i, piesa(i))), CUTIE_GOALA), cerere.grila);
  if (typeof grila === 'string') return refuz(grila);
  const nx = grila.xs.length + 1, ny = grila.ys.length + 1;
  if (nx * ny === 1) return refuz('nimic-taiat');

  let d = doc;
  let vii: Bucata[] = initiale.map((i) => ({ orig: i.id, instanta: i, piesa: piesa(i), c: [0, nx - 1], r: [0, ny - 1], noua: false }));
  let forme = 0, scoase = 0;
  const linii = [...grila.xs.map((v, k) => ({ x: true, v, k: k + 1 })), ...grila.ys.map((v, k) => ({ x: false, v, k: k + 1 }))];
  for (const { x, v, k } of linii) {
    // Linia k desparte coloana (rândul) k − 1 de k.
    const peste = (b: Bucata): boolean => (x ? b.c : b.r)[0] < k && k <= (x ? b.c : b.r)[1];
    const tinte = vii.filter(peste);
    if (tinte.length === 0) continue;
    const r = taie(d, {
      cutit: x ? { fel: 'x', x: v } : { fel: 'y', y: v }, alese: tinte.map((b) => b.instanta.id), inchide: cerere.inchide, desparte: true,
      ...(cerere.intre ? { intre: cerere.intre } : {}), ...(cerere.imbinare ? { imbinare: cerere.imbinare } : {}),
    }, indexFoaie);
    if (!r.ok && r.motiv !== 'nimic-taiat') return r;
    const taiate = new Map(r.ok ? r.degrupate.map((g) => [g.instanta.id, g.parti]) : []);
    vii = vii.flatMap((b) => {
      if (!peste(b)) return [b];
      const parti = taiate.get(b.instanta.id);
      return (parti ?? [b]).map((p, n) => {
        // Partea A, apoi B; o bucată netăiată (sau, neașteptat, alt număr de părți), după mijlocul cutiei ei.
        let s = n;
        if (parti?.length !== 2) {
          const q = cutieInstanta(p.instanta, p.piesa);
          s = (x ? q.minX + q.maxX : q.minY + q.maxY) / 2 < v ? 0 : 1;
        }
        const lim = (a: readonly [number, number]): readonly [number, number] => (s === 0 ? [a[0], k - 1] : [k, a[1]]);
        return { ...b, instanta: p.instanta, piesa: p.piesa, noua: b.noua || parti !== undefined, c: x ? lim(b.c) : b.c, r: x ? b.r : lim(b.r) };
      });
    });
    if (r.ok) {
      forme += r.forme;
      scoase += r.scoase;
      d = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }).doc;
    }
  }

  // Id-uri nefolosite în documentul vechi, pentru bucățile noi și pentru grupuri.
  let n = 1;
  const idNou = (): string => {
    while (ocupate.has(`e${n}`)) n++;
    ocupate.add(`e${n}`);
    return `e${n}`;
  };
  const fin = vii.map((b) => {
    if (!b.noua) return b;
    const id = idNou();
    return { ...b, instanta: { ...b.instanta, id, piesa: id }, piesa: { ...b.piesa, id } };
  });
  // Pe foaie, bucățile unei forme vin în ordinea panourilor (deci și în programul mașinii), iar formele, în ordinea lor. Bucățile
  // stau deja în ordinea formelor (fiecare tăietură le pune în locul celei tăiate), deci în celula lui, fiecare panou le are în
  // ordinea în care vor sta, iar grupul ia locul primei.
  const pe = new Map<number, number[]>();
  fin.forEach((b, i) => {
    const k = b.r[0] * nx + b.c[0];
    pe.set(k, [...(pe.get(k) ?? []), i]);
  });
  const celule = [...pe.keys()].sort((a, b) => a - b);
  const panou = new Map(celule.map((k, t) => [k, t]));
  const nrPanou = (i: number): number => panou.get((fin[i] as Bucata).r[0] * nx + (fin[i] as Bucata).c[0]) ?? 0;
  const numite = new Map<number, string>();
  const grupate: Array<{ readonly g: { readonly instanta: Instanta; readonly piesa: Piesa }; readonly parti: Array<{ readonly instanta: Instanta; readonly piesa: Piesa }> }> = [];
  const ids: string[] = [];
  for (const [t, k] of celule.entries()) {
    const nume = `${cerere.nume} ${t + 1}`;
    const xs = pe.get(k) as number[];
    if (xs.length > 1) {
      const parti = xs.map((i) => ({ instanta: (fin[i] as Bucata).instanta, piesa: (fin[i] as Bucata).piesa }));
      const id = idNou();
      const g = grupDin(parti, id);
      if (typeof g !== 'string') {
        grupate.push({ g: { instanta: g.instanta, piesa: { ...g.piesa, nume } }, parti });
        ids.push(id);
        continue;
      }
    }
    for (const i of xs) {
      numite.set(i, nume);
      ids.push((fin[i] as Bucata).instanta.id);
    }
  }
  // Degruparea compusă: fiecare formă schimbată, cu bucățile ei în ordinea panourilor (cele numite, cu numele panoului).
  const peForma = new Map<string, number[]>();
  fin.forEach((b, i) => { peForma.set(b.orig, [...(peForma.get(b.orig) ?? []), i]); });
  const degrupate: Degrupata[] = [];
  for (const i of initiale) {
    const parti = (peForma.get(i.id) ?? []).sort((a, b) => nrPanou(a) - nrPanou(b) || a - b).map((k) => {
      const b = fin[k] as Bucata, nume = numite.get(k);
      return { instanta: b.instanta, piesa: nume === undefined ? b.piesa : { ...b.piesa, nume } };
    });
    const [p0] = parti;
    if (parti.length === 1 && p0?.instanta === i && p0.piesa === piesa(i)) continue;
    degrupate.push({ instanta: i, piesa: piesa(i), parti });
  }
  // Locurile părților grupurilor, în documentul de după degrupare.
  const dupa = degrupate.length > 0 ? executa(istoricNou(doc), { tip: 'degrupeaza', foaie: foaie.id, degrupate }).doc : doc;
  const locI = new Map((dupa.foi[indexFoaie]?.instante ?? []).map((x, k) => [x.id, k]));
  const locP = new Map(dupa.piese.map((x, k) => [x.id, k]));
  const grupuri: Degrupata[] = grupate.map(({ g, parti }) => ({
    ...g, parti, locuri: { instante: parti.map((x) => locI.get(x.instanta.id) ?? -1), piese: parti.map((x) => locP.get(x.piesa.id) ?? -1) },
  }));
  return { ok: true, degrupate, ids, forme, scoase, sterse: [], grupuri, panouri: celule.length };
}
