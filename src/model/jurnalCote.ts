/**
 * Dezlegarea cotelor după o comandă (ADR 0330 §3), înregistrată în jurnal când modulul vine (cu judecata cotelor, deci cu
 * orice document care are cote, și cu unealta Cote). Pe fiecare foaie cu cote legate a cărei lume s-ar fi putut schimba
 * (instanțele foii sau piesele), un capăt legat înainte și dezlegat după își scrie punctul de dinainte: ultimul punct văzut.
 * Legătura rămâne, ca panoul să spună de ce s-a dezlegat. Un capăt deja dezlegat nu se mai atinge.
 */
import { felCunoscut, indexLume, punctAncora } from './cote.ts';
import type { AncoraCota, Cota, Document } from './document.ts';
import { inregistreazaCotele, type Comanda } from './jurnal.ts';

export function dezleagaDupa(inainte: Document, dupa: Document): Comanda[] {
  const rez: Comanda[] = [];
  for (const [fi, f] of dupa.foi.entries()) {
    const cote = f.cote;
    if (!Array.isArray(cote) || cote.length === 0) continue;
    const vi = inainte.foi.findIndex((x) => x.id === f.id);
    const vechea = inainte.foi[vi];
    // O foaie nouă (o copie) n-are un „înainte”; una cu aceleași instanțe și aceleași piese n-are ce dezlega.
    if (!vechea || (vechea.instante === f.instante && inainte.piese === dupa.piese)) continue;
    if (!cote.some((c) => felCunoscut(c.fel) && Array.isArray(c.puncte) && c.puncte.some((a) => a.legatura))) continue;
    const lumeV = indexLume(inainte, vi), lumeN = indexLume(dupa, fi);
    let schimbat = false;
    const noi = cote.map((c): Cota => {
      if (!felCunoscut(c.fel) || !Array.isArray(c.puncte)) return c;
      let ale = false;
      const puncte = c.puncte.map((a): AncoraCota => {
        if (!a.legatura) return a;
        const v = punctAncora(a, lumeV);
        if (v.stare !== 'legata' || punctAncora(a, lumeN).stare === 'legata') return a;
        ale = true;
        return { ...a, x: v.p.x, y: v.p.y };
      });
      if (!ale) return c;
      schimbat = true;
      return { ...c, puncte };
    });
    if (schimbat) rez.push({ tip: 'inlocuieste-cote', foaie: f.id, vechi: cote, nou: noi });
  }
  return rez;
}

inregistreazaCotele(dezleagaDupa);
