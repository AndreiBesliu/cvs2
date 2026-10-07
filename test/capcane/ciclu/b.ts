// CAPCANĂ: încalcă intenționat regula „fara-cicluri”, împreună cu a.ts.
import { a } from './a.ts';
export const b = (): number => (Math.random() > 2 ? a() : 0);
