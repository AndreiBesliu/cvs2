/**
 * Dicționarul roadmap-ului în engleză (ADR 0056), pus la zi după fișele de acum: păstrează traducerile folosite, adaugă
 * intrări goale (`en: ""`) pentru textele noi sau schimbate și scoate ce nu mai e folosit. Integratorul completează apoi
 * `en` pentru intrările goale, în același commit cu fișa (proba din `test/unit/traducere.test.ts` cere zero lipsuri).
 *
 *   node scripts/traduceri.ts            # scrie dicționarul la zi și spune câte lipsesc
 *   node scripts/traduceri.ts --verifica # doar spune; codul de ieșire 1 dacă lipsește ceva sau e ceva în plus
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { esteRoadmap, FISIER_ROADMAP } from '../shared/documentatie.ts';
import { genereazaDocumentatia } from './documentatie.ts';
import { CALE_DICTIONAR_EN, citesteDictionar, dictionarLaZi, textePentruTraducere, type DictionarFisier } from './traducere.ts';

const radacina = process.cwd();
const fisiere = genereazaDocumentatia(radacina);
const roadmap: unknown = JSON.parse(fisiere.get(FISIER_ROADMAP) ?? 'null');
if (!esteRoadmap(roadmap)) throw new Error('roadmap-ul generat n-are forma așteptată');
const texte = textePentruTraducere(roadmap);
const cale = join(radacina, CALE_DICTIONAR_EN);
const brut = existsSync(cale) ? readFileSync(cale, 'utf8') : null;
const vechi: DictionarFisier | null = brut === null ? null : citesteDictionar(brut);
if (brut !== null && !vechi) throw new Error(`${CALE_DICTIONAR_EN} nu are forma { schema: 1, texte: { amprentă: { ro, en } } }`);
const { dictionar, noi, scoase } = dictionarLaZi(texte, vechi);
const text = `${JSON.stringify(dictionar, null, 2)}\n`;

if (process.argv.includes('--verifica')) {
  console.log(`Roadmap-ul în engleză: ${texte.length} texte, ${noi} fără traducere, ${scoase} traduceri nefolosite.`);
  process.exit(noi > 0 || scoase > 0 ? 1 : 0);
}
mkdirSync(dirname(cale), { recursive: true });
writeFileSync(cale, text);
console.log(`${CALE_DICTIONAR_EN}: ${texte.length} texte; ${noi} de tradus (en: ""), ${scoase} scoase.`);
