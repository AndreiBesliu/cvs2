/**
 * Ce cere finisarea reliefului unei foi (ADR 0312; felia 18.1↑c-2): reliefurile finisate (câte o finisare pe instanță, cu
 * reliefurile ei în lume) și hărțile straturilor lor vizibile, pe care firul principal le aduce workerului CAM. Pur.
 */
import type { Document, FormaRelief, Matrice, Operatie, Scula } from './document.ts';
import { elementeFoaie, grupeazaPeScula, taieturiFoaie, type Taietura } from './lume.ts';

/** O finisare de pe foaie: operația, într-o instanță, cu reliefurile ei (în lume, în ordinea din operație). */
export type FinisareFoaie = {
  readonly piesa: string; readonly instanta: string; readonly operatie: Operatie;
  readonly reliefuri: ReadonlyArray<{ readonly nod: string; readonly idLume: string; readonly forma: FormaRelief; readonly matrice: Matrice }>;
};

/** Finisările foii `indexFoaie`, în ordinea instanțelor și a operațiilor. */
export function finisariFoaie(doc: Document, indexFoaie = 0): FinisareFoaie[] {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) return [];
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  if (!doc.piese.some((p) => p.operatii.some((o) => o.tip === 'finisare'))) return [];
  const lume = elementeFoaie(doc, indexFoaie);
  const rez: FinisareFoaie[] = [];
  for (const i of foaie.instante) {
    const p = piese.get(i.piesa);
    if (!p) continue;
    for (const o of p.operatii) {
      if (o.tip !== 'finisare') continue;
      const reliefuri: Array<FinisareFoaie['reliefuri'][number]> = [];
      for (const n of o.noduri) {
        const e = lume.find((x) => x.instanta === i.id && x.nod === n);
        if (e && e.forma.tip === 'relief') reliefuri.push({ nod: n, idLume: e.idLume, forma: e.forma, matrice: e.matrice });
      }
      rez.push({ piesa: p.id, instanta: i.id, operatie: o, reliefuri });
    }
  }
  return rez;
}

/** Un pas al programului foii: o finisare a reliefului sau o tăietură pe contur. */
export type PasProgram = { readonly fel: 'finisare'; readonly f: FinisareFoaie } | { readonly fel: 'taietura'; readonly t: Taietura };

/** Rangul unui pas în ordinea de mână (ADR 0133), dacă operația lui îl are. */
const rangPas = (p: PasProgram): number | undefined => (p.fel === 'finisare' ? p.f.operatie.rang : p.t.rang);

/**
 * Ordinea programului foii, cu finisările (ADR 0312 §7). În ordinea automată, finisările vin întâi, cât placa e încă
 * întreagă: nicio tăietură, nici exteriorul prin foaie al piesei, nu desprinde relieful înaintea lui. Urmează tăieturile în
 * ordinea lucrării (`grupeazaPeScula`). Cu ranguri (ADR 0133), toți pașii se sortează stabil după rang. O tăietură fără rang
 * vine la capăt, ca până acum. O finisare fără rang rămâne în față, la locul ei automat: nu ajunge pe tăcute după tăierea
 * de contur. Tăieturile rămân în ordinea lui `ordineTaieturi`.
 */
export function ordinePasi(doc: Document, indexFoaie = 0): PasProgram[] {
  const automata: PasProgram[] = [
    ...finisariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'finisare', f })),
    ...grupeazaPeScula(taieturiFoaie(doc, indexFoaie)).map((t): PasProgram => ({ fel: 'taietura', t })),
  ];
  if (!automata.some((p) => rangPas(p) !== undefined)) return automata;
  const loc = (p: PasProgram): number => rangPas(p) ?? (p.fel === 'finisare' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
  return automata.map((p, i) => ({ p, i })).sort((a, b) => (loc(a.p) === loc(b.p) ? a.i - b.i : loc(a.p) < loc(b.p) ? -1 : 1)).map((x) => x.p);
}

/** Cheia rândului unui pas în fereastra exportului: `<piesă>/<operație>`. */
export function cheiePas(p: PasProgram): string {
  return p.fel === 'finisare' ? `${p.f.piesa}/${p.f.operatie.id}` : `${p.t.piesa}/${p.t.operatie}`;
}

/**
 * Creasta lăsată pe un plan între două linii vecine (ADR 0310 §5), pe hârtie: bila de rază R, la pasul lateral s, lasă
 * R − √(R² − (s/2)²); V-ul de unghi θ, cu vârful plat v, lasă (s − v) / 2 / tan(θ/2) când s trece de v; freza plată, nimic.
 * Peste diametru, freza nu mai acoperă planul: `null`.
 */
export function creastaPePlan(s: Scula, pasLateral: number): number | null {
  if (!(pasLateral > 0) || pasLateral > s.diametru) return null;
  if (s.forma?.tip === 'bila') {
    const R = s.diametru / 2, h = pasLateral / 2;
    return R - Math.sqrt(Math.max(0, R * R - h * h));
  }
  if (s.forma?.tip === 'v') {
    const v = s.forma.varf ?? 0;
    return pasLateral <= v ? 0 : (pasLateral - v) / 2 / Math.tan((s.forma.unghi * Math.PI) / 360);
  }
  return 0;
}

/** Hărțile straturilor vizibile ale reliefurilor finisate pe foaie (fiecare o dată): ce trebuie adus workerului CAM. */
export function hartiFinisare(doc: Document, indexFoaie = 0): string[] {
  const rez = new Set<string>();
  for (const f of finisariFoaie(doc, indexFoaie)) for (const r of f.reliefuri) for (const s of r.forma.straturi) if (s.vizibil) rez.add(s.dale);
  return [...rez];
}

/** Ce se poate schimba din panou pe o finisare (ADR 0312 §2): `null` scoate câmpul opțional (lipsa e implicitul lui). */
export type SchimbareFinisare = {
  readonly unghi?: number;
  readonly nealiniat?: true | null;
  readonly margine?: 'trece' | null;
  readonly planZero?: number | null;
};

/** Operația cu valorile finisării schimbate (îmbinate: un câmp necunoscut rămâne); o operație de alt fel rămâne cum e. */
export function cuFinisare(o: Operatie, v: SchimbareFinisare): Operatie {
  if (o.tip !== 'finisare') return o;
  const f: Record<string, unknown> = { ...(o.finisare ?? { unghi: 0 }) };
  for (const [k, x] of Object.entries(v)) {
    if (x === undefined) continue;
    if (x === null) delete f[k];
    else f[k] = x;
  }
  return { ...o, finisare: f as NonNullable<Operatie['finisare']> };
}

/** Forma frezei unei finisări, aleasă din panou: bila (implicit), plata sau V-ul (cu unghiul implicit). */
export type FormaFinisare = 'bila' | 'plata' | 'v';

/** Felul frezei unei finisări, din documentul ei. */
export function formaFinisare(s: Scula): FormaFinisare {
  return s.forma?.tip === 'bila' ? 'bila' : s.forma?.tip === 'v' ? 'v' : 'plata';
}
