import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIUNI_DOCUMENT } from '../../src/ui/actiuniDocument.ts';
import { ACTIUNI_EXPORT } from '../../src/ui/actiuniExport.ts';
import { ACTIUNI_IMPORT } from '../../src/ui/actiuniImport.ts';
import { ACTIUNI_VEDERE } from '../../src/ui/actiuniVedere.ts';
import { actiuneaTastei, TASTE, tastaActiunii, tastaApasata } from '../../src/ui/scurtaturi.ts';

const TOATE = [...ACTIUNI_DOCUMENT, ...ACTIUNI_EXPORT, ...ACTIUNI_IMPORT, ...ACTIUNI_VEDERE];

test('registrele au id-uri unice între ele: paleta le arată împreună', () => {
  const ids = TOATE.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('fiecare tastă duce la o singură acțiune, care există într-un registru', () => {
  const taste = TASTE.map(([k]) => k);
  assert.equal(new Set(taste).size, taste.length);
  const ids = new Set(TOATE.map((a) => a.id));
  for (const [k, id] of TASTE) assert.ok(ids.has(id), `${k} → ${id}: acțiunea nu există`);
});

test('tasta arătată e prima din tabel', () => {
  assert.equal(tastaActiunii('istoric.reface'), 'Ctrl+Y');
  assert.equal(tastaActiunii('vedere.paleta'), 'Ctrl+K');
  assert.equal(tastaActiunii('document.adauga-cerc'), undefined);
});

/** Martorul: tastatura de dinainte de prototip (App.tsx la ed5cd65), scrisă din nou aici, ca referință. */
function vechi(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }): string | null {
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  return e.key === 'Delete' ? 'document.sterge-selectia'
    : ctrl && k === 'z' && !e.shiftKey ? 'istoric.anuleaza'
      : ctrl && (k === 'y' || (k === 'z' && e.shiftKey)) ? 'istoric.reface'
        : ctrl && k === 'd' && !e.shiftKey ? 'document.duplica-selectia'
          : null;
}

test('tabelul face exact ce făcea tastatura de dinainte, pe acțiunile documentului; tastele noi sunt doar ale vederii', () => {
  let incercari = 0;
  for (const tasta of ['z', 'y', 'd', 'k', 'a', '1', 'Delete', 'Home', 'Backspace', ' ']) {
    for (const ctrlKey of [false, true]) {
      for (const metaKey of [false, true]) {
        for (const shiftKey of [false, true]) {
          // Cu Shift, browserul dă litera mare.
          const key = shiftKey && tasta.length === 1 ? tasta.toUpperCase() : tasta;
          const e = { key, ctrlKey, metaKey, shiftKey };
          const nou = actiuneaTastei(tastaApasata(e)) ?? null;
          const v = vechi(e);
          if (nou?.startsWith('vedere.')) assert.equal(v, null, `${JSON.stringify(e)}: tasta veche ${v} a fost luată de ${nou}`);
          else assert.equal(nou, v, JSON.stringify(e));
          incercari++;
        }
      }
    }
  }
  assert.equal(incercari, 80);
});

test('modificatorii contează doar la tastele cu un caracter', () => {
  assert.equal(tastaApasata({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false }), 'Ctrl+Z');
  assert.equal(tastaApasata({ key: 'Z', ctrlKey: false, metaKey: true, shiftKey: true }), 'Ctrl+Shift+Z');
  assert.equal(tastaApasata({ key: 'Delete', ctrlKey: true, metaKey: false, shiftKey: true }), 'Delete');
  assert.equal(actiuneaTastei(tastaApasata({ key: 'k', ctrlKey: true, metaKey: false, shiftKey: false })), 'vedere.paleta');
  assert.equal(actiuneaTastei(tastaApasata({ key: 'z', ctrlKey: false, metaKey: false, shiftKey: false })), undefined);
});
