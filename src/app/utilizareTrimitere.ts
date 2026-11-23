import type { Lot, RaspunsLot } from '../../shared/utilizare.ts';
import type { Inregistrator, RezultatPompa } from './utilizareLot.ts';

/**
 * Trimiterea cozii utilizării (ADR 0262, felia A.8b), partea pură: o aduce bucata contului (`trimiteUtilizarea` din
 * `PanouCont.tsx`), nu pornirea. Loturile pleacă pe rând, doar ale contului Firebase deschis acum (ale altui cont, intrat
 * înainte în același browser, se scot fără să plece); setările din răspuns ajung în înregistrator. Un lot refuzat ca greșit
 * se scoate; un cont fără drept (nu mai e deschis pe server) golește coada; fără tokenul contului sau al aplicației, coada
 * așteaptă sesiunea următoare; rețeaua, plafonul pe oră și o eroare a serverului lasă lotul pentru mai târziu.
 */

export interface DepsTrimitere {
  /** Contul Firebase deschis acum în browser, sau null. */
  readonly uid: string | null;
  readonly trimite: (lot: Lot) => Promise<RaspunsLot>;
  /** Codul unei erori (`functions/invalid-argument`…), sau gol. */
  readonly cod: (e: unknown) => string;
}

export async function trimiteCoada(ins: Pick<Inregistrator, 'loturi' | 'scoate' | 'primesteSetari' | 'golesteTot'>, d: DepsTrimitere): Promise<RezultatPompa> {
  if (!d.uid) return 'stins';
  for (const { uid, lot } of ins.loturi()) {
    if (uid !== d.uid) {
      ins.scoate(lot.sesiune, lot.nr);
      continue;
    }
    try {
      const r = await d.trimite(lot);
      ins.scoate(lot.sesiune, lot.nr);
      ins.primesteSetari(r.setari);
      if (!r.setari.colectare) return 'gata';
    } catch (e) {
      const c = d.cod(e);
      if (c === 'functions/invalid-argument') {
        ins.scoate(lot.sesiune, lot.nr);
        continue;
      }
      if (c === 'functions/permission-denied') {
        ins.golesteTot();
        return 'stins';
      }
      if (c === 'functions/unauthenticated') return 'stins';
      return 'retea';
    }
  }
  return 'gata';
}
