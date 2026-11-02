/**
 * Pachetele de atelier (ADR 0131): `node test/ateliere/genereaza.ts` le scrie în `test/ateliere/` (pe controler: fișierele
 * de probă, `FISA.md` și arhiva `<controler>.zip`), iar `--verifica` le compară, octet cu octet, cu cele comise. Un pachet
 * trimis unui atelier rămâne exact cel din repo: rezultatele lui se leagă de amprentele din fișă.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ID_CONTRACTE } from '../../src/post/contracte/index.ts';
import { pachet } from './pachet.ts';

const DIR = dirname(fileURLToPath(import.meta.url));
const verifica = process.argv.includes('--verifica');
let diferite = 0;
let fisiere = 0;
for (const id of ID_CONTRACTE) {
  for (const [cale, octeti] of pachet(id)) {
    const tinta = join(DIR, cale);
    fisiere++;
    if (verifica) {
      let vechi: Buffer | null = null;
      try { vechi = readFileSync(tinta); } catch { vechi = null; }
      if (!vechi || !vechi.equals(octeti)) { diferite++; console.log(`diferit: ${cale}`); }
    } else {
      mkdirSync(dirname(tinta), { recursive: true });
      writeFileSync(tinta, octeti);
    }
  }
}
console.log(verifica ? `${fisiere} fișiere, ${diferite} diferite` : `${fisiere} fișiere scrise în ${DIR}`);
if (verifica && diferite > 0) process.exit(1);
