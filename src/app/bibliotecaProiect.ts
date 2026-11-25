/**
 * Biblioteca de freze din care se aleg frezele proiectului (ADR 0300 §4): a contului deschis, citită din browser (fără
 * sincronizare: aceea e a ferestrei „Frezele mele”), dacă are freze sau a primit setul standard; altfel cea fără cont, care
 * primește frezele standard o dată (ADR 0300 §3, precizarea din 24.11). O folosesc secțiunea Tăierea (16.A↑b-2) și fereastra
 * exportului (16.A↑b-3).
 */
import { useEffect } from 'react';
import { useContTinut } from './dreptCont.ts';
import { CHEIE_LOCALA, cheieBibliotecii, frezeMele, useFrezeMele, type StareFreze } from './frezeMele.ts';
import { cuFrezeleStandard } from './frezeStandard.ts';

export function useBibliotecaProiect(): StareFreze {
  return useBibliotecaProiectCuCheie().stare;
}

/**
 * Biblioteca proiectului și cheia ei (`cont:<uid>` sau cea fără cont): „Pune-o înapoi în bibliotecă” (ADR 0300 §5, felia
 * 16.A↑b-6) scrie în biblioteca din care s-a ales freza.
 */
export function useBibliotecaProiectCuCheie(): { readonly stare: StareFreze; readonly cheie: string } {
  const cheieCont = cheieBibliotecii(useContTinut());
  const dinCont = useFrezeMele(cheieCont);
  const faraCont = useFrezeMele(CHEIE_LOCALA);
  useEffect(() => {
    const b = frezeMele(cheieCont);
    if (!b.stare().incarcata) void b.incarca();
    void cuFrezeleStandard();
  }, [cheieCont]);
  const contului = cheieCont !== CHEIE_LOCALA && (dinCont.standard || dinCont.freze.length > 0);
  return { stare: contului ? dinCont : faraCont, cheie: contului ? cheieCont : CHEIE_LOCALA };
}
