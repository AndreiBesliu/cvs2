/**
 * Bazinul de workere al simulării (ADR 0010, ADR 0015, ADR 0047 §4): N workere, fiecare cu rândurile de dale r mod N.
 * Fără stare între joburi: fiecare cerere poartă tot ce-i trebuie (grila, scula, mutările benzii), iar workerul nu ține
 * nimic după răspuns; workerele însele rămân pornite, gata pentru jobul următor. Mutările se trimit doar pentru banda
 * fiecăruia, ca tablouri transferate, nu prin memorie partajată (ADR 0014: fără izolare cross-origin).
 *
 * În Node (testele, fără `Worker`), benzile rulează pe rând, prin aceeași funcție (`calculeazaBanda`). În browser,
 * calculul nu atinge niciodată firul principal.
 */
import { calculeazaBanda, mutariPentruBanda, previzualizarePentru, uneste, type CerereBanda, type RaspunsBanda, type RezumatSimulare } from '../sim/banda.ts';
import type { ParametriCamp } from '../sim/camp.ts';
import type { DateScula } from '../sim/nucleu.ts';
import type { MesajSimulare, RaspunsSimulare } from './protocolSimulare.ts';

export type CerereSimulare = {
  readonly camp: ParametriCamp;
  readonly scula: DateScula;
  readonly mutari: Float64Array;
  readonly fund: number;
};

export type RezultatBazin = RezumatSimulare & {
  /** Câte benzi (workere) au lucrat. */
  readonly fire: number;
  /** Cât a durat jobul, de la cerere la rezumat, în ms. */
  readonly ms: number;
};

/** Plafonul firelor: peste 8, s4 a măsurat câștiguri mici (8,5× pe 16 fire, 6,4× pe 8). */
export const FIRE_MAXIME = 8;
/** Cât așteaptă bazinul o bandă înainte să o declare pierdută. */
export const TERMEN_BANDA_MS = 120_000;

/** Câte fire pentru câte nuclee raportează browserul: unul rămâne interfeței, între 1 și 8. */
export function firePentru(nuclee: number): number {
  if (!(nuclee >= 2)) return 1;
  return Math.min(FIRE_MAXIME, Math.floor(nuclee) - 1);
}

export function fireImplicite(): number {
  return firePentru(globalThis.navigator?.hardwareConcurrency ?? 1);
}

type InAsteptare = { readonly rezolva: (r: RaspunsBanda) => void; readonly respinge: (e: Error) => void; readonly termen: ReturnType<typeof setTimeout> };
type Lucrator = { readonly w: Worker; readonly asteapta: Map<number, InAsteptare> };

const lucratori: Array<Lucrator | undefined> = [];
let urmatorul = 1;

function lucratorul(k: number): Lucrator {
  const gata = lucratori[k];
  if (gata) return gata;
  const w = new Worker(new URL('./lucratorSimulare.ts', import.meta.url), { type: 'module', name: `simulare-${k}` });
  const l: Lucrator = { w, asteapta: new Map() };
  const cade = (motiv: string): void => {
    // Un worker căzut nu mai e folosit: următorul job pornește altul.
    if (lucratori[k] === l) lucratori[k] = undefined;
    w.terminate();
    for (const a of l.asteapta.values()) { clearTimeout(a.termen); a.respinge(new Error(motiv)); }
    l.asteapta.clear();
  };
  w.onmessage = (e: MessageEvent<RaspunsSimulare>) => {
    const a = l.asteapta.get(e.data.id);
    if (!a) return;
    l.asteapta.delete(e.data.id);
    clearTimeout(a.termen);
    if (e.data.ok) a.rezolva(e.data.raspuns);
    else a.respinge(new Error(e.data.motiv));
  };
  w.onerror = (e) => { e.preventDefault(); cade(`workerul simulării a căzut: ${e.message || 'fără mesaj'}`); };
  w.onmessageerror = () => cade('workerul simulării a trimis un mesaj necitibil');
  lucratori[k] = l;
  return l;
}

function trimite(k: number, cerere: CerereBanda): Promise<RaspunsBanda> {
  const l = lucratorul(k), id = urmatorul++;
  return new Promise((rezolva, respinge) => {
    const termen = setTimeout(() => {
      l.asteapta.delete(id);
      respinge(new Error(`banda ${cerere.banda.w} din ${cerere.banda.n} n-a răspuns în ${TERMEN_BANDA_MS / 1000} s`));
    }, TERMEN_BANDA_MS);
    l.asteapta.set(id, { rezolva, respinge, termen });
    const m: MesajSimulare = { id, cerere };
    l.w.postMessage(m, [cerere.mutari.buffer as ArrayBuffer]);
  });
}

/** Simularea unui program pe `fire` benzi; rezultatul nu depinde de `fire` (ADR 0047 §4). */
export async function simuleazaInBazin(c: CerereSimulare, fire = fireImplicite()): Promise<RezultatBazin> {
  const t0 = performance.now();
  const n = Math.max(1, Math.floor(fire));
  const previzualizare = previzualizarePentru(c.camp);
  const cereri: CerereBanda[] = [];
  for (let w = 0; w < n; w++) {
    const banda = { n, w };
    cereri.push({ camp: c.camp, banda, scula: c.scula, fund: c.fund, previzualizare, mutari: mutariPentruBanda(c.mutari, c.scula, c.camp, banda) });
  }
  const benzi = typeof Worker === 'undefined' ? cereri.map(calculeazaBanda) : await Promise.all(cereri.map((x, k) => trimite(k, x)));
  return { ...uneste(c.camp, previzualizare, c.fund, benzi), fire: n, ms: performance.now() - t0 };
}
