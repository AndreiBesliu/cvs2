/**
 * Bazinul de workere al simulării (ADR 0010, ADR 0015, ADR 0047 §4): N workere, fiecare cu rândurile de dale r mod N.
 * Fără stare: fiecare cerere poartă tot ce-i trebuie (grila, scula, mutările benzii), iar workerele unui job se opresc la
 * capătul lui — la răspuns, la eroare, la anulare sau la termen. Așa memoria benzilor se eliberează imediat (recenzia
 * 19.10: ~340 MB ținuți ~60 s după un job pe toată foaia), iar un worker care tace nu mai poate fi refolosit. Mutările se
 * trimit doar pentru banda fiecăruia, ca tablouri transferate, nu prin memorie partajată (ADR 0014).
 *
 * În Node (testele, fără `Worker`), benzile rulează pe rând, prin aceeași funcție (`calculeazaBanda`). În browser,
 * calculul nu atinge niciodată firul principal.
 */
import { calculeazaBanda, mutariPentruBanda, previzualizarePentru, uneste, type CerereBanda, type RaspunsBanda, type Relief, type RezumatSimulare } from '../sim/banda.ts';
import type { ParametriCamp } from '../sim/camp.ts';
import type { DateScula, GrupSimulare } from '../sim/nucleu.ts';
import type { MesajSimulare, RaspunsSimulare } from './protocolSimulare.ts';

export type CerereSimulare = {
  readonly camp: ParametriCamp;
  readonly scula: DateScula;
  readonly mutari: Float64Array;
  /** Grupurile de după fiecare schimbare a sculei (ADR 0084). */
  readonly apoi?: readonly GrupSimulare[];
  readonly fund: number;
  /** Relieful vederii 3D (ADR 0057), dacă e cerut (`reliefPentru`). */
  readonly relief?: Relief;
};

export type RezultatBazin = RezumatSimulare & {
  /** Câte benzi (workere) au lucrat. */
  readonly fire: number;
  /** Cât a durat jobul, de la cerere la rezumat (cu pornirea workerelor), în ms. */
  readonly ms: number;
};

export type OptiuniBazin = {
  /** Anularea jobului (un export nou, dialogul închis): workerele se opresc, promisiunea e respinsă. */
  readonly semnal?: AbortSignal;
  /** Cât așteaptă bazinul tot jobul, în ms (implicit `TERMEN_JOB_MS`). */
  readonly termenMs?: number;
};

/** Plafonul firelor: peste 8, s4 a măsurat câștiguri mici (8,5× pe 16 fire, 6,4× pe 8). */
export const FIRE_MAXIME = 8;
/** Cât așteaptă bazinul un job; la plafonul grilei, pe un fir, recenzia a măsurat 9,8 s. */
export const TERMEN_JOB_MS = 120_000;

/** Câte fire pentru câte nuclee raportează browserul: unul rămâne interfeței, între 1 și 8. */
export function firePentru(nuclee: number): number {
  if (!(nuclee >= 2)) return 1;
  return Math.min(FIRE_MAXIME, Math.floor(nuclee) - 1);
}

export function fireImplicite(): number {
  return firePentru(globalThis.navigator?.hardwareConcurrency ?? 1);
}

/** Eroarea unui job anulat: nu e o defecțiune, nu se trece în jurnal. */
export class SimulareAnulata extends Error {
  override readonly name = 'SimulareAnulata';
  constructor() { super('simularea a fost anulată'); }
}

/** Benzile în workere, câte unul pe bandă, toate oprite la capătul jobului. */
function inWorkere(cereri: readonly CerereBanda[], semnal: AbortSignal | undefined, termenMs: number): Promise<RaspunsBanda[]> {
  return new Promise((rezolva, respinge) => {
    const workere: Worker[] = [];
    const raspunsuri: Array<RaspunsBanda | undefined> = cereri.map(() => undefined);
    let ramase = cereri.length, gata = false;
    let termen: ReturnType<typeof setTimeout> | undefined;
    const anuleaza = (): void => { cade(new SimulareAnulata()); };
    function termina(): void {
      gata = true;
      clearTimeout(termen);
      semnal?.removeEventListener('abort', anuleaza);
      for (const w of workere) w.terminate();
    }
    function cade(e: Error): void {
      if (gata) return;
      termina();
      respinge(e);
    }
    if (semnal?.aborted) { anuleaza(); return; }
    semnal?.addEventListener('abort', anuleaza);
    termen = setTimeout(() => { cade(new Error(`simularea n-a răspuns în ${Math.round(termenMs / 1000)} s`)); }, termenMs);
    cereri.forEach((cerere, k) => {
      if (gata) return;
      const w = new Worker(new URL('./lucratorSimulare.ts', import.meta.url), { type: 'module', name: `simulare-${k}` });
      workere.push(w);
      w.onmessage = (e: MessageEvent<RaspunsSimulare>) => {
        if (gata) return;
        if (!e.data.ok) { cade(new Error(e.data.motiv)); return; }
        raspunsuri[k] = e.data.raspuns;
        if (--ramase > 0) return;
        termina();
        rezolva(raspunsuri as RaspunsBanda[]);
      };
      w.onerror = (e) => { e.preventDefault(); cade(new Error(`workerul simulării a căzut: ${e.message || 'fără mesaj'}`)); };
      w.onmessageerror = () => { cade(new Error('workerul simulării a trimis un mesaj necitibil')); };
      const m: MesajSimulare = { id: k + 1, cerere };
      w.postMessage(m, [cerere.mutari.buffer, ...(cerere.apoi ?? []).map((g) => g.mutari.buffer)] as ArrayBuffer[]);
    });
  });
}

/** Simularea unui program pe `fire` benzi; rezultatul nu depinde de `fire` (ADR 0047 §4). */
export async function simuleazaInBazin(c: CerereSimulare, fire = fireImplicite(), o: OptiuniBazin = {}): Promise<RezultatBazin> {
  const t0 = performance.now();
  const n = Math.max(1, Math.floor(fire));
  const previzualizare = previzualizarePentru(c.camp);
  const cereri: CerereBanda[] = [];
  for (let w = 0; w < n; w++) {
    const banda = { n, w };
    cereri.push({
      camp: c.camp, banda, scula: c.scula, fund: c.fund, previzualizare, ...(c.relief ? { relief: c.relief } : {}),
      mutari: mutariPentruBanda(c.mutari, c.scula, c.camp, banda),
      ...(c.apoi ? { apoi: c.apoi.map((g) => ({ scula: g.scula, mutari: mutariPentruBanda(g.mutari, g.scula, c.camp, banda) })) } : {}),
    });
  }
  let benzi: RaspunsBanda[];
  if (typeof Worker === 'undefined') {
    benzi = [];
    for (const x of cereri) {
      if (o.semnal?.aborted) throw new SimulareAnulata();
      benzi.push(calculeazaBanda(x));
    }
  } else {
    benzi = await inWorkere(cereri, o.semnal, o.termenMs ?? TERMEN_JOB_MS);
  }
  return { ...uneste(c.camp, previzualizare, c.fund, benzi, c.relief), fire: n, ms: performance.now() - t0 };
}
