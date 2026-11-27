/**
 * Ce cer operațiile reliefului unei foi (ADR 0312, felia 18.1↑c-2; ADR 0313, felia 18.1↑d-1): reliefurile degroșate și
 * finisate (câte o operație pe instanță, cu reliefurile ei în lume), ordinea lor în program și hărțile straturilor lor
 * vizibile, pe care firul principal le aduce workerului CAM. Pur.
 */
import type { Document, FormaRelief, Matrice, Operatie, Scula } from './document.ts';
import { elementeFoaie, grupeazaPeScula, taieturiFoaie, type Taietura } from './lume.ts';
import { inaltimeFreza } from './creasta.ts';

/**
 * O operație a reliefului de pe foaie, finisarea sau degroșarea (`operatie.tip`): operația, într-o instanță, cu reliefurile ei
 * (în lume, în ordinea din operație).
 */
export type FinisareFoaie = {
  readonly piesa: string; readonly instanta: string; readonly operatie: Operatie;
  readonly reliefuri: ReadonlyArray<{ readonly nod: string; readonly idLume: string; readonly forma: FormaRelief; readonly matrice: Matrice }>;
};

/** Finisările foii `indexFoaie`, în ordinea instanțelor și a operațiilor. */
export function finisariFoaie(doc: Document, indexFoaie = 0): FinisareFoaie[] {
  return operatiiRelief(doc, indexFoaie, 'finisare');
}

/** Degroșările foii `indexFoaie` (ADR 0313), în ordinea instanțelor și a operațiilor. */
export function degrosariFoaie(doc: Document, indexFoaie = 0): FinisareFoaie[] {
  return operatiiRelief(doc, indexFoaie, 'degrosare');
}

function operatiiRelief(doc: Document, indexFoaie: number, tip: 'finisare' | 'degrosare'): FinisareFoaie[] {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) return [];
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  if (!doc.piese.some((p) => p.operatii.some((o) => o.tip === tip))) return [];
  const lume = elementeFoaie(doc, indexFoaie);
  const rez: FinisareFoaie[] = [];
  for (const i of foaie.instante) {
    const p = piese.get(i.piesa);
    if (!p) continue;
    for (const o of p.operatii) {
      if (o.tip !== tip) continue;
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

/** Un pas al programului foii: o degroșare sau o finisare a reliefului, sau o tăietură pe contur. */
export type PasProgram =
  | { readonly fel: 'degrosare'; readonly f: FinisareFoaie }
  | { readonly fel: 'finisare'; readonly f: FinisareFoaie }
  | { readonly fel: 'taietura'; readonly t: Taietura };

/** Rangul unui pas în ordinea de mână (ADR 0133), dacă operația lui îl are. */
const rangPas = (p: PasProgram): number | undefined => (p.fel === 'taietura' ? p.t.rang : p.f.operatie.rang);

/**
 * Ordinea programului foii, cu operațiile reliefului (ADR 0312 §7, ADR 0313). În ordinea automată, degroșările vin întâi,
 * apoi finisările (aceeași freză pe toate degroșările, apoi pe toate finisările: puține schimbări), cât placa e încă
 * întreagă: nicio tăietură, nici exteriorul prin foaie al piesei, nu desprinde relieful înaintea lui. Urmează tăieturile în
 * ordinea lucrării (`grupeazaPeScula`). Cu ranguri (ADR 0133), toți pașii se sortează stabil după rang. O tăietură fără rang
 * vine la capăt, ca până acum. O operație a reliefului fără rang rămâne în față, la locul ei automat: nu ajunge pe tăcute
 * după tăierea de contur. Tăieturile rămân în ordinea lui `ordineTaieturi`.
 */
export function ordinePasi(doc: Document, indexFoaie = 0): PasProgram[] {
  const automata: PasProgram[] = [
    ...degrosariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'degrosare', f })),
    ...finisariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'finisare', f })),
    ...grupeazaPeScula(taieturiFoaie(doc, indexFoaie)).map((t): PasProgram => ({ fel: 'taietura', t })),
  ];
  if (!automata.some((p) => rangPas(p) !== undefined)) return automata;
  const loc = (p: PasProgram): number => rangPas(p) ?? (p.fel === 'taietura' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  return automata.map((p, i) => ({ p, i })).sort((a, b) => (loc(a.p) === loc(b.p) ? a.i - b.i : loc(a.p) < loc(b.p) ? -1 : 1)).map((x) => x.p);
}

/** Cheia rândului unui pas în fereastra exportului: `<piesă>/<operație>`. */
export function cheiePas(p: PasProgram): string {
  return p.fel === 'taietura' ? `${p.t.piesa}/${p.t.operatie}` : `${p.f.piesa}/${p.f.operatie.id}`;
}

/** Două operații ale reliefului din aceeași instanță care lucrează pe cel puțin un relief comun. */
const peAcelasiRelief = (a: FinisareFoaie, b: FinisareFoaie): boolean =>
  a.instanta === b.instanta && a.reliefuri.some((x) => b.reliefuri.some((y) => y.nod === x.nod));

/**
 * Finisările puse (de mână) înaintea unei degroșări a aceluiași relief (ADR 0313 §4): programul rămâne bun (degroșarea nu
 * coboară sub model plus adaos și nu intră mai adânc decât pasul ei), dar finisarea scoate cu freza ei tot lemnul, iar
 * degroșarea taie aproape doar aer. Lucrarea le spune ca avertisment.
 */
export function finisariInainteaDegrosarii(pasi: readonly PasProgram[]): Array<{ readonly finisare: FinisareFoaie; readonly degrosare: FinisareFoaie }> {
  const rez: Array<{ readonly finisare: FinisareFoaie; readonly degrosare: FinisareFoaie }> = [];
  pasi.forEach((p, i) => {
    if (p.fel !== 'finisare') return;
    for (const q of pasi.slice(i + 1)) if (q.fel === 'degrosare' && peAcelasiRelief(p.f, q.f)) rez.push({ finisare: p.f, degrosare: q.f });
  });
  return rez;
}

/**
 * De ce o degroșare nu se potrivește cu o finisare a aceluiași relief (ADR 0313 §5), sau null: alt plan zero (degroșarea ar
 * lăsa adaosul deasupra altui model, deci ar putea tăia sub cel finisat) sau o degroșare care trece de margine, când finisarea
 * păstrează peretele (degroșarea l-ar scoate). Pe foaia `indexFoaie`.
 */
export function nepotrivireDegrosare(doc: Document, indexFoaie = 0): string | null {
  const fin = finisariFoaie(doc, indexFoaie);
  for (const d of degrosariFoaie(doc, indexFoaie)) {
    const vd = d.operatie.degrosare;
    for (const f of fin) {
      if (!peAcelasiRelief(d, f)) continue;
      const vf = f.operatie.finisare;
      const unde = `${d.piesa}/${d.operatie.id}`, cu = `${f.piesa}/${f.operatie.id}`;
      const pz = (x: number | undefined): string => (x === undefined ? 'vârful la față' : `${x} mm`);
      if (vd?.planZero !== vf?.planZero) {
        return `${unde}: degroșarea are planul zero (${pz(vd?.planZero)}) altfel decât finisarea ${cu} a aceluiași relief (${pz(vf?.planZero)}): adaosul ar sta deasupra altui model`;
      }
      if (vd?.margine === 'trece' && vf?.margine !== 'trece') {
        return `${unde}: degroșarea trece de marginea reliefului, iar finisarea ${cu} păstrează peretele: degroșarea l-ar scoate`;
      }
    }
  }
  return null;
}

/**
 * Creasta lăsată pe un plan între două linii vecine (ADR 0310 §5), pe hârtie: mijlocul e la s / 2 de amândouă, deci silueta
 * frezei acolo (`inaltimeFreza`): bila de rază R lasă R − √(R² − (s/2)²); toroidala (ADR 0303), ρ − √(ρ² − (s/2 − a)²)
 * dincolo de discul ei plat a; V-ul de unghi θ, cu vârful plat v, (s − v) / 2 / tan(θ/2) când s trece de v; freza plată,
 * nimic. Peste diametru, freza nu mai acoperă planul: `null`.
 */
export function creastaPePlan(s: Scula, pasLateral: number): number | null {
  if (!(pasLateral > 0) || pasLateral > s.diametru) return null;
  return inaltimeFreza(s, pasLateral / 2);
}

/**
 * Hărțile straturilor vizibile ale reliefurilor degroșate și finisate pe foaie (fiecare o dată): ce trebuie adus workerului
 * CAM.
 */
export function hartiFinisare(doc: Document, indexFoaie = 0): string[] {
  const rez = new Set<string>();
  for (const f of [...degrosariFoaie(doc, indexFoaie), ...finisariFoaie(doc, indexFoaie)]) for (const r of f.reliefuri) for (const s of r.forma.straturi) if (s.vizibil) rez.add(s.dale);
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

/** Ce se poate schimba din panou pe o degroșare (ADR 0313 §2): `null` scoate câmpul opțional (lipsa e implicitul lui). */
export type SchimbareDegrosare = {
  readonly adaos?: number;
  readonly unghi?: number;
  readonly margine?: 'trece' | null;
  readonly planZero?: number | null;
};

/** Operația cu valorile degroșării schimbate (îmbinate: un câmp necunoscut rămâne); o operație de alt fel rămâne cum e. */
export function cuDegrosare(o: Operatie, v: SchimbareDegrosare): Operatie {
  if (o.tip !== 'degrosare') return o;
  const d: Record<string, unknown> = { ...(o.degrosare ?? { adaos: 0, unghi: 0 }) };
  for (const [k, x] of Object.entries(v)) {
    if (x === undefined) continue;
    if (x === null) delete d[k];
    else d[k] = x;
  }
  return { ...o, degrosare: d as NonNullable<Operatie['degrosare']> };
}

/** Forma frezei unei finisări, aleasă din panou: bila (implicit), plata sau V-ul (cu unghiul implicit). */
export type FormaFinisare = 'bila' | 'plata' | 'v';

/** Felul frezei unei finisări, din documentul ei. */
export function formaFinisare(s: Scula): FormaFinisare {
  return s.forma?.tip === 'bila' ? 'bila' : s.forma?.tip === 'v' ? 'v' : 'plata';
}
