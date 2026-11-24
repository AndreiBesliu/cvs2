import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogDinSursa, FISIER_CATALOG, textCatalog } from '../../scripts/catalog-controale.ts';
import { DIN_COD, numeControl, numeDin } from '../../src/app/numeControl.ts';

/**
 * Numele controalelor în utilizarea aplicației (ADR 0262, felia A.8c): catalogul scris e cel din sursă (altfel:
 * `node scripts/catalog-controale.ts --scrie`), are numele controalelor și ale dialogurilor, nu și ce pune codul din registru;
 * un control se numește după primul atribut care dă un nume din catalog (sau din cod); un atribut cu text al omului nu trece.
 */

const el = (atribute: Record<string, string>) => ({ getAttribute: (a: string): string | null => atribute[a] ?? null });

test('catalogul scris e cel din sursă', () => {
  assert.equal(readFileSync(FISIER_CATALOG, 'utf8'), textCatalog(catalogDinSursa()), 'node scripts/catalog-controale.ts --scrie');
});

test('catalogul are controalele și dialogurile editorului, nu și adminul sau valorile calculate', () => {
  // Pe ce scoate scriptul acum (egal cu cel scris, după proba de mai sus), ca o schimbare a lui să cadă și aici.
  const catalog = new Set(catalogDinSursa());
  for (const n of ['testid.dialog-cont', 'eticheta.export-titlu', 'icona.vedere.paleta', 'camp.cont-email', 'buton.cont-intra']) {
    assert.ok(catalog.has(n), n);
  }
  for (const n of catalog) {
    assert.ok(numeDin(n.slice(0, n.indexOf('.')), n.slice(n.indexOf('.') + 1)) === n, `numele ${n} e deja normalizat`);
    assert.ok(!DIN_COD.has(n.slice(0, n.indexOf('.'))), `${n}: ce pune codul nu intră în catalog`);
  }
  // Butonul adminului (`id="set-rapid-exemple"`) nu intră; nici reperul ancorei de pe pânză (un `div` fără rol).
  assert.ok(!catalog.has('id.set-rapid-exemple'), 'adminul nu se înregistrează');
  assert.ok(!catalog.has('testid.ancora'), 'doar controalele și ferestrele');
});

test('numele unui control: primul atribut cu un nume din catalog; din registru și uneltele trec după formă', () => {
  const catalog = new Set(['testid.export-gcode', 'camp.cont-email']);
  assert.equal(numeControl(el({ 'data-actiune': 'export.gcode', 'data-testid': 'export-gcode' }), catalog), 'actiune.export.gcode');
  assert.equal(numeControl(el({ 'data-unealta': 'dreptunghi' }), catalog), 'unealta.dreptunghi');
  assert.equal(numeControl(el({ 'data-testid': 'export-gcode' }), catalog), 'testid.export-gcode');
  // Un atribut calculat (nu e în catalog) se sare; următorul care e, numește controlul.
  assert.equal(numeControl(el({ 'data-testid': 'foaie-bucatarie-2', 'data-camp': 'cont-email' }), catalog), 'camp.cont-email');
  // Textul omului (un nume de foaie, un font) nu numește nimic.
  assert.equal(numeControl(el({ 'data-testid': 'roboto-flex-bold' }), catalog), null);
  assert.equal(numeControl(el({ id: 'Proiectul lui Ion' }), catalog), null);
  assert.equal(numeControl(el({}), catalog), null);
  // Forma: literele mici, cratima în locul a ce nu e literă, cifră, cratimă sau punct; un nume care nu e un id bun, nimic.
  assert.equal(numeDin('testid', 'Export_GCode'), 'testid.export-gcode');
  assert.equal(numeDin('actiune', 'Document.Roteste'), 'actiune.document.roteste');
  assert.equal(numeDin('testid', 'a'.repeat(41)), null);
  assert.equal(numeDin('actiune', 'a.b.c.d'), null);
});
