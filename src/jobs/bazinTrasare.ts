/**
 * Bazinul trasării (ADR 0220 §2, după bazinul CAM, ADR 0109): fiecare previzualizare are workerul ei, oprit la capăt (la
 * răspuns, la eroare, la anulare sau la termen). O previzualizare nouă o anulează pe cea veche prin semnal: workerul vechi se
 * oprește din mijlocul calculului. În Node (testele, fără `Worker`), același calcul rulează în proces, prin aceeași graniță
 * (`structuredClone`, cu transferul); în codul construit ramura aceea nu există (`__CNCVS2_CONSTRUIT__`).
 */
import type { CerereTrasare, RaspunsTrasare } from './calculTrasare.ts';

/**
 * O trasare anulată (o previzualizare nouă, fereastra închisă): nu e o defecțiune. Clasele sunt ale bazinului trasării, nu
 * cele ale bazinului CAM: importul lor din `bazinCam.ts` ar fi scos o bucată comună cu exportul (ADR 0100).
 */
export class TrasareAnulata extends Error {
  override readonly name = 'TrasareAnulata';
  constructor() { super('trasarea a fost anulată'); }
}

/** Workerul trasării a căzut sau a tăcut peste termen: o defecțiune, de trecut în jurnal. */
export class TrasareCazuta extends Error {
  override readonly name = 'TrasareCazuta';
}

/** Cât așteaptă bazinul o trasare (ADR 0220 §9): o poză de 12 Mpx se trasează în câteva secunde pe un laptop de atelier. */
export const TERMEN_TRASARE_MS = 30_000;

type Raspuns = { readonly ok: true; readonly raspuns: RaspunsTrasare } | { readonly ok: false; readonly motiv: string };

function inWorker(cerere: CerereTrasare, semnal: AbortSignal | undefined, termenMs: number): Promise<RaspunsTrasare> {
  return new Promise((rezolva, respinge) => {
    let gata = false;
    const w = new Worker(new URL('./lucratorTrasare.ts', import.meta.url), { type: 'module', name: 'trasare' });
    const anuleaza = (): void => { cade(new TrasareAnulata()); };
    const termen = setTimeout(() => { cade(new TrasareCazuta(`trasarea n-a răspuns în ${Math.round(termenMs / 1000)} s`)); }, termenMs);
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
    w.onerror = (e) => { e.preventDefault(); cade(new TrasareCazuta(`workerul trasării a căzut: ${e.message || 'fără mesaj'}`)); };
    w.onmessageerror = () => { cade(new TrasareCazuta('workerul trasării a trimis un mesaj necitibil')); };
    w.postMessage(cerere);
  });
}

async function inProces(cerere: CerereTrasare, semnal: AbortSignal | undefined): Promise<RaspunsTrasare> {
  const { raspundeTrasare } = await import('./calculTrasare.ts');
  const primit = structuredClone(cerere);
  if (semnal?.aborted) throw new TrasareAnulata();
  const r = await raspundeTrasare(primit);
  if (semnal?.aborted) throw new TrasareAnulata();
  return structuredClone(r.raspuns, { transfer: r.transfer });
}

/** O trasare, în workerul ei (în Node, în proces). */
export function trasareInBazin(cerere: CerereTrasare, o: { readonly semnal?: AbortSignal; readonly termenMs?: number } = {}): Promise<RaspunsTrasare> {
  if (o.semnal?.aborted) return Promise.reject(new TrasareAnulata());
  if (typeof __CNCVS2_CONSTRUIT__ === 'undefined' && typeof Worker === 'undefined') return inProces(cerere, o.semnal);
  return inWorker(cerere, o.semnal, o.termenMs ?? TERMEN_TRASARE_MS);
}
