/**
 * Bazinul reliefului (ADR 0310 §3, după bazinul trasării, ADR 0220 §2): fiecare cerere are workerul ei, oprit la capăt (la
 * răspuns, la eroare, la anulare sau la termen); o cerere nouă o anulează pe cea veche prin semnal. În Node (testele, fără
 * `Worker`), același calcul rulează în proces, prin aceeași graniță (`structuredClone`, cu transferul); în codul construit
 * ramura aceea nu există (`__CNCVS2_CONSTRUIT__`).
 */
import type { CerereRelief, RaspunsRelief } from './calculRelief.ts';

/** Un calcul anulat (o previzualizare nouă, fereastra închisă): nu e o defecțiune. */
export class ReliefAnulat extends Error {
  override readonly name = 'ReliefAnulat';
  constructor() { super('calculul reliefului a fost anulat'); }
}

/** Workerul reliefului a căzut sau a tăcut peste termen: o defecțiune, de trecut în jurnal. */
export class ReliefCazut extends Error {
  override readonly name = 'ReliefCazut';
}

/** Cât așteaptă bazinul un relief: o imagine de 8192² se decodează, se cuantizează și se umbrește în câteva secunde. */
export const TERMEN_RELIEF_MS = 60_000;

type Raspuns = { readonly ok: true; readonly raspuns: RaspunsRelief } | { readonly ok: false; readonly motiv: string };

function transferabile(c: CerereRelief): ArrayBuffer[] {
  if (c.tip !== 'desen') return [];
  const t = new Set<ArrayBuffer>();
  for (const s of c.straturi) for (const o of Object.values(s.octeti)) t.add(o.buffer);
  return [...t];
}

function inWorker(cerere: CerereRelief, semnal: AbortSignal | undefined, termenMs: number, transfera: boolean): Promise<RaspunsRelief> {
  return new Promise((rezolva, respinge) => {
    let gata = false;
    const w = new Worker(new URL('./lucratorRelief.ts', import.meta.url), { type: 'module', name: 'relief' });
    const anuleaza = (): void => { cade(new ReliefAnulat()); };
    const termen = setTimeout(() => { cade(new ReliefCazut(`relieful n-a răspuns în ${Math.round(termenMs / 1000)} s`)); }, termenMs);
    function termina(): void {
      gata = true;
      clearTimeout(termen);
      semnal?.removeEventListener('abort', anuleaza);
      w.terminate();
    }
    function cade(e: Error): void {
      if (gata) return;
      termina();
      respinge(e);
    }
    semnal?.addEventListener('abort', anuleaza);
    w.onmessage = (e: MessageEvent<Raspuns>) => {
      if (gata) return;
      termina();
      if (e.data.ok) rezolva(e.data.raspuns);
      else respinge(new Error(e.data.motiv));
    };
    w.onerror = (e) => { e.preventDefault(); cade(new ReliefCazut(`workerul reliefului a căzut: ${e.message || 'fără mesaj'}`)); };
    w.onmessageerror = () => { cade(new ReliefCazut('workerul reliefului a trimis un mesaj necitibil')); };
    w.postMessage(cerere, transfera ? transferabile(cerere) : []);
  });
}

async function inProces(cerere: CerereRelief, semnal: AbortSignal | undefined): Promise<RaspunsRelief> {
  const { raspundeRelief } = await import('./calculRelief.ts');
  const primit = structuredClone(cerere);
  if (semnal?.aborted) throw new ReliefAnulat();
  const r = await raspundeRelief(primit);
  if (semnal?.aborted) throw new ReliefAnulat();
  return structuredClone(r.raspuns, { transfer: r.transfer });
}

/**
 * Un calcul al reliefului, în workerul lui (în Node, în proces). `transfera`: octeții dalelor trec în worker fără copie (cine
 * îi trimite nu-i mai folosește); altfel se copiază.
 */
export function reliefInBazin(cerere: CerereRelief, o: { readonly semnal?: AbortSignal; readonly termenMs?: number; readonly transfera?: boolean } = {}): Promise<RaspunsRelief> {
  if (o.semnal?.aborted) return Promise.reject(new ReliefAnulat());
  if (typeof __CNCVS2_CONSTRUIT__ === 'undefined' && typeof Worker === 'undefined') return inProces(cerere, o.semnal);
  return inWorker(cerere, o.semnal, o.termenMs ?? TERMEN_RELIEF_MS, o.transfera === true);
}
