/**
 * Istoricul filei Setări (ADR 0260 §9, felia A.6), partea pură: din rândurile de audit ale unei setări (egalitate pe `tinta`,
 * ordinea în pagină), ce s-a schimbat la fiecare salvare. Setările conturilor: zilele offline și păstrarea tichetelor, de la
 * cât la cât (fără document înainte, de la implicite). Răspunsurile rapide: ce s-a adăugat, scos sau schimbat, după
 * etichetă; altfel, doar ordinea.
 */
import type { SetariConturi } from '../../../shared/conturi.ts';
import { SETARI_IMPLICITE, setariDin } from '../../../shared/conturiPlan.ts';
import { rapideDin, type RaspunsRapid } from '../../../shared/raspunsuriRapide.ts';
import { intamplareDin, type Intamplare } from '../carcasa/date.ts';

export type Schimbare =
  | { readonly fel: 'offline' | 'tichete'; readonly inainte: number; readonly dupa: number }
  | { readonly fel: 'adaugat' | 'scos' | 'schimbat'; readonly eticheta: string }
  | { readonly fel: 'ordinea' | 'implicite' };

export interface PasSetari {
  readonly id: string;
  readonly cand: Date | null;
  readonly cine: Intamplare['cine'];
  /** Ce s-a schimbat; gol doar la un rând fără nimic de spus (o acțiune necunoscută nu ajunge aici). */
  readonly schimbari: readonly Schimbare[];
}

const CAMPURI: readonly [keyof SetariConturi, 'offline' | 'tichete'][] = [['zileOffline', 'offline'], ['zilePastrareTichete', 'tichete']];

/** Setările conturilor, de la cât la cât; prima salvare pornește de la implicite (și, dacă le păstrează, o spune). */
export function schimbariConturi(inainte: unknown, dupa: unknown): Schimbare[] {
  const a = inainte === null || inainte === undefined ? SETARI_IMPLICITE : setariDin(inainte);
  const b = setariDin(dupa);
  const s: Schimbare[] = CAMPURI.filter(([k]) => a[k] !== b[k]).map(([k, fel]) => ({ fel, inainte: a[k], dupa: b[k] }));
  return s.length === 0 && (inainte === null || inainte === undefined) ? [{ fel: 'implicite' }] : s;
}

const lista = (x: unknown): readonly RaspunsRapid[] => rapideDin({ lista: x }).lista;
const acelasi = (a: RaspunsRapid, b: RaspunsRapid): boolean => a.ro === b.ro && a.en === b.en;

/** Răspunsurile rapide, după etichetă: adăugate, scoase, schimbate (în ordinea listei); fără nimic din ele, ordinea. */
export function schimbariRapide(inainte: unknown, dupa: unknown): Schimbare[] {
  const a = lista(inainte);
  const b = lista(dupa);
  const vechi = new Map(a.map((r) => [r.eticheta, r]));
  const noi = new Set(b.map((r) => r.eticheta));
  const s: Schimbare[] = [
    ...b.flatMap((r): Schimbare[] => {
      const v = vechi.get(r.eticheta);
      return v === undefined ? [{ fel: 'adaugat', eticheta: r.eticheta }] : acelasi(v, r) ? [] : [{ fel: 'schimbat', eticheta: r.eticheta }];
    }),
    ...a.filter((r) => !noi.has(r.eticheta)).map((r): Schimbare => ({ fel: 'scos', eticheta: r.eticheta })),
  ];
  return s.length === 0 && a.map((r) => r.eticheta).join('\n') !== b.map((r) => r.eticheta).join('\n') ? [{ fel: 'ordinea' }] : s;
}

const DESCRIE: ReadonlyMap<string, (inainte: unknown, dupa: unknown) => Schimbare[]> = new Map([
  ['setari.conturi', schimbariConturi],
  ['setari.raspunsuriRapide', schimbariRapide],
]);

/** Istoricul din rândurile de audit ale unei setări: doar acțiunile ei cunoscute, cea mai nouă întâi (fără dată, la urmă). */
export function istoricSetari(randuri: readonly { readonly id: string; readonly d: Readonly<Record<string, unknown>> }[], eu: string): PasSetari[] {
  const t = (p: PasSetari): number => p.cand?.getTime() ?? -Infinity;
  return randuri.flatMap(({ id, d }): PasSetari[] => {
    const descrie = DESCRIE.get(typeof d['actiune'] === 'string' ? d['actiune'] : '');
    if (!descrie) return [];
    const i = intamplareDin(id, d, eu);
    return [{ id, cand: i.cand, cine: i.cine, schimbari: descrie(d['inainte'], d['dupa']) }];
  }).sort((a, b) => t(b) - t(a));
}
