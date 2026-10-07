// CAPCANĂ: încalcă intenționat regula „fara-cicluri”, împreună cu b.ts. Vezi .dependency-cruiser.cjs.
import { b } from './b.ts';
export const a = (): number => b() + 1;
