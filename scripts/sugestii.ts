/**
 * Sugestiile personalului, pentru asistent (ADR 0107 §7): la începutul unei sesiuni, cele acceptate de owner („de făcut”)
 * și cele în lucru, cu nota lui; `--toate` le arată pe toate. Doar citire, prin API-ul REST al Firestore, cu identitatea
 * `firebase login` a mașinii (IAM, nu reguli), ca `verifica-test.ts`.
 *
 *   node scripts/sugestii.ts [--instanta test|live] [--toate]
 */
import { esteInstanta, PROIECTE } from '../shared/publicare.ts';
import { clientFirebaseTools } from './firebase-api.ts';
import { citesteSugestii, textSugestii } from './sugestii-lista.ts';

const k = process.argv.indexOf('--instanta');
const instanta = k < 0 ? 'test' : process.argv[k + 1];
if (!esteInstanta(instanta)) {
  console.error(`--instanta cere test sau live, nu ${JSON.stringify(instanta)}`);
  process.exit(2);
}
const lista = await citesteSugestii(await clientFirebaseTools('https://firestore.googleapis.com'), PROIECTE[instanta]);
console.log(`Sugestiile personalului pe ${instanta}: ${lista.length} în total.`);
console.log(textSugestii(lista, process.argv.includes('--toate')));
