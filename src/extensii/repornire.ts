/**
 * Repornirea cerută de o extensie (`host.reporneste`, ADR 0165), fără React: cel mult una la `interval` ms. Una cerută mai
 * devreme așteaptă până trece intervalul de la ultima, iar cererile de până atunci se adună în ea, cu un singur temporizator:
 * o extensie care s-ar reporni în buclă nu încarcă aplicația. Închiderea extensiei (sau alta deschisă) o oprește.
 */

/** Cele 2 s dintre două reporniri. */
export const INTERVAL_REPORNIRE_MS = 2000;

/** Ceasul și temporizatorul (în aplicație, ale browserului; în probe, unul fals). */
export type Ceas = {
  readonly acum: () => number;
  readonly dupa: (ms: number, f: () => void) => unknown;
  readonly anuleaza: (temporizator: unknown) => void;
};

const CEASUL: Ceas = {
  acum: () => Date.now(),
  dupa: (ms, f) => setTimeout(f, ms),
  anuleaza: (t) => { clearTimeout(t as ReturnType<typeof setTimeout>); },
};

export type Repornire = {
  /** O cerere a extensiei: pe loc, dacă a trecut intervalul de la ultima repornire; altfel, adunată în cea amânată. */
  readonly cere: () => void;
  /** Extensia s-a închis sau s-a schimbat: repornirea amânată nu mai are loc. */
  readonly opreste: () => void;
};

export function repornireRara(reporneste: () => void, interval = INTERVAL_REPORNIRE_MS, ceas: Ceas = CEASUL): Repornire {
  let ultima = Number.NEGATIVE_INFINITY;
  let amanata = false;
  let temporizator: unknown = null;
  const acum = (): void => {
    amanata = false;
    temporizator = null;
    ultima = ceas.acum();
    reporneste();
  };
  return {
    cere: () => {
      if (amanata) return;
      const peste = ultima + interval - ceas.acum();
      if (peste <= 0) { acum(); return; }
      amanata = true;
      temporizator = ceas.dupa(peste, acum);
    },
    opreste: () => {
      if (!amanata) return;
      ceas.anuleaza(temporizator);
      amanata = false;
      temporizator = null;
    },
  };
}
