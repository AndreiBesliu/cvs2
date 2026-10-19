/**
 * Oracolul simulării (`test/oracles/simulare.ts`) judecat el însuși, înaintea nucleului, pe prima jumătate a
 * corpusului (`simulare.cazuri.ts`; împărțirea e în `ajutor-simulare-oracol.ts`):
 * - pe fiecare piesă cu hârtie: oracolul nu e niciodată sub exact și e deasupra lui cel mult cu marja derivată;
 *   hârtia trecută prin `compara` iese curată;
 * - secțiunea bilei, unghiul V, lățimea radială pe arc, piesele care trebuie să dea aceeași materie;
 * - martorii greșiți (otrăvurile din s4) ai acestor piese: fiecare e prins de verificările lui, iar hârtia curată nu.
 */
import { probePiese, PIESE_FISIER_1 } from './ajutor-simulare-oracol.ts';

probePiese(PIESE_FISIER_1);
