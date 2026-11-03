/**
 * Pachetele de atelier comise (ADR 0131): exact cele generate, octet cu octet (fișierele, fișa, arhiva), fără nimic în plus.
 * Un pachet trimis unui atelier rămâne cel din repo: rezultatele lui se leagă de amprentele din fișă. Valorile pe hârtie ale
 * pachetelor le probează `ateliere.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { ID_CONTRACTE } from '../../src/post/contracte/index.ts';
import { pachet } from '../ateliere/pachet.ts';

const DIR = new URL('../ateliere/', import.meta.url);

test('pachetele comise sunt exact cele generate, octet cu octet (fișierele, fișa, arhiva), fără nimic în plus', () => {
  for (const id of ID_CONTRACTE) {
    const p = pachet(id);
    for (const [cale, octeti] of p) assert.ok(Buffer.from(octeti).equals(readFileSync(new URL(cale, DIR))), `${cale}: diferit; rulează node test/ateliere/genereaza.ts`);
    const peDisc = readdirSync(new URL(`${id}/`, DIR)).map((n) => `${id}/${n}`).sort();
    assert.deepEqual(peDisc, [...p.keys()].filter((c) => c.startsWith(`${id}/`)).sort(), id);
  }
  const radacina = readdirSync(DIR).filter((n) => n.endsWith('.zip')).sort();
  assert.deepEqual(radacina, ID_CONTRACTE.map((id) => `${id}.zip`).sort());
});
