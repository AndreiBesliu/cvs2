/**
 * Oracolul intrărilor cu rampă (ADR 0031), lipirea pe corpusul 2.5b cu rampe la întâmplare: partea 3 din 6.
 * Corpusul, judecata și împărțirea sunt în `ajutor-intrari-rampa-corpus.ts`; fișierul doar își numește partea, ca părțile să
 * ruleze în paralel (un singur fișier ținea peste 6 minute și scotea o felie a rapidului peste limita ei).
 */
import { probaPartii } from './ajutor-intrari-rampa-corpus.ts';

probaPartii(3);
