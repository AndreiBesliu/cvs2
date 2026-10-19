/**
 * Oracolul simulării judecat pe a doua jumătate a corpusului (vezi `simulare-oracol.cazuri.test.ts`), plus piesele
 * fără hârtie: acolo, oracolul la div 8 și la div 16 trebuie să stea fiecare în marja celuilalt.
 */
import { probePiese, PIESE_FISIER_2 } from './ajutor-simulare-oracol.ts';

probePiese(PIESE_FISIER_2);
