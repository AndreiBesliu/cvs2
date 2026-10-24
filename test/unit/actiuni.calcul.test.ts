/**
 * Calculul acțiunilor ferestrelor și ale panoului vine la cerere (`actiuniDocument.ts`, `laCerere`; loc în pachetul de
 * pornire, 17.10). Fișierul ăsta NU importă `actiuniDocumentCalcul.ts` (nici prin altcineva): `node --test` rulează fiecare
 * fișier în procesul lui, deci aici calculul nu e înregistrat, ca în aplicație înaintea primei ferestre.
 *
 * (a) Fără datele ferestrei, fiecare acțiune dă motivul de dinainte de mutare: bara, paleta și scurtăturile nu văd nicio
 *     diferență (paritatea, cu calculul încărcat, e în `actiuni.calcul.paritate.test.ts`).
 * (b) Cu datele ferestrei și fără calcul, acțiunea aruncă: o fereastră care uită să-și importe calculul e o greșeală de
 *     cod, nu „nimic ales” (un refuz tăcut ar fi lăsat să treacă un test care verifică doar că documentul nu se schimbă).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ImportPregatit } from '../../src/io/piesa.ts';
import { documentNou } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
const LA_CERERE = ['document.importa', 'document.aplica-operatii', 'document.pozitioneaza', 'document.roteste', 'foaie.stoc'];

/** Un document cu un dreptunghi și un cerc (e1, e2), adăugate prin registru, și selecția cerută. */
function context(sel: readonly string[], doarCitire: boolean, extra: Partial<ContextDocument> = {}): ContextDocument & { h: () => Istoric } {
  let h = istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let s: readonly string[] = [];
  const baza: ContextDocument = { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => s, selecteaza: (ids) => { s = ids; } };
  ruleaza(R, 'document.adauga-dreptunghi', baza);
  ruleaza(R, 'document.adauga-cerc', baza);
  s = sel;
  return { ...baza, doarCitire: () => doarCitire, ...extra, h: () => h };
}

test('registrul păstrează cele cinci acțiuni la cerere, cu id-ul și eticheta lor, în ordinea de dinainte', () => {
  assert.deepEqual(ACTIUNI_DOCUMENT.map((a) => a.id), [
    'selectie.la-punct', 'selectie.din-lista', 'document.adauga-dreptunghi', 'document.adauga-cerc', 'document.importa',
    'document.muta-selectia', 'document.duplica-selectia', 'document.sterge-selectia', 'document.aplica-operatii',
    'document.pozitioneaza', 'document.roteste', 'foaie.stoc', 'foaie.ghidaje', 'document.muta-instantele',
    'document.deseneaza', 'document.transforma', 'document.copiaza-in-retea', 'document.forma', 'istoric.anuleaza', 'istoric.reface',
  ]);
  const eticheta = new Map(ACTIUNI_DOCUMENT.map((a) => [a.id, a.eticheta]));
  assert.deepEqual(LA_CERERE.map((id) => eticheta.get(id)), [
    'actiune.importa', 'actiune.aplica-operatii', 'actiune.pozitioneaza', 'actiune.roteste', 'actiune.foaie-stoc',
  ]);
  for (const id of LA_CERERE) assert.equal(ACTIUNI_DOCUMENT.find((a) => a.id === id)?.capabilitate, 'desen', id);
});

test('(a) fără datele ferestrei, fără calcul: fiecare acțiune dă motivul de dinainte, în orice selecție, și doar citind', () => {
  const asteptat = (id: string, n: number): string => {
    if (id === 'document.pozitioneaza') return n === 0 ? 'motiv.nicio-selectie' : 'motiv.nicio-deplasare';
    if (id === 'document.roteste') return n === 0 ? 'motiv.nicio-selectie' : n > 1 ? 'motiv.o-singura-selectie' : 'motiv.nicio-deplasare';
    return 'motiv.nimic-ales';
  };
  for (const sel of [[], ['e1'], ['e1', 'e2'], ['lipsa']]) {
    for (const doarCitire of [false, true]) {
      for (const id of LA_CERERE) {
        const ctx = context(sel, doarCitire);
        const inainte = ctx.h();
        assert.deepEqual(stare(R, id, ctx), { ok: false, motiv: asteptat(id, sel.length) }, `${id} [${sel.join(',')}] ${doarCitire}`);
        assert.deepEqual(ruleaza(R, id, ctx), { ok: false, motiv: asteptat(id, sel.length) });
        assert.equal(ctx.h(), inainte, 'documentul nu se schimbă');
      }
    }
  }
});

test('(b) cu datele ferestrei și fără calcul, acțiunea aruncă (la stare și la rulare), fără să atingă documentul', () => {
  const cazuri: Array<[string, readonly string[], Partial<ContextDocument>]> = [
    ['document.importa', [], { importNou: () => ({}) as ImportPregatit }],
    ['document.aplica-operatii', [], { operatiiNoi: () => new Map() }],
    ['document.pozitioneaza', ['e1'], { pozitieNoua: () => ({ x: 5 }) }],
    ['document.roteste', ['e1'], { rotireNoua: () => 90 }],
    ['foaie.stoc', [], { stocNou: () => ({ latime: 250 }) }],
  ];
  assert.deepEqual(cazuri.map(([id]) => id), LA_CERERE);
  for (const [id, sel, extra] of cazuri) {
    for (const doarCitire of [false, true]) {
      const ctx = context(sel, doarCitire, extra);
      const inainte = ctx.h();
      const mesaj = new RegExp(`acțiunea ${id.replace('.', '\\.')}: calculul ei nu e încărcat`);
      assert.throws(() => stare(R, id, ctx), mesaj, id);
      assert.throws(() => ruleaza(R, id, ctx), mesaj, id);
      // Direct, pe lângă registru: și `ruleaza` cere calculul (nu tace).
      assert.throws(() => { ACTIUNI_DOCUMENT.find((a) => a.id === id)?.ruleaza(ctx); }, mesaj, id);
      assert.equal(ctx.h(), inainte, 'documentul nu se schimbă');
    }
  }
});
