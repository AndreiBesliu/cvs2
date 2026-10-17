/**
 * Paritatea gărzilor (loc în pachetul de pornire, 17.10): acțiunea din registru (garda ieftină, apoi calculul la cerere)
 * dă exact ce dă calculul singur, adică `activa` de dinainte de mutare, mutată neschimbată în `actiuniDocumentCalcul.ts`.
 * Pe o matrice de contexte: cu și fără datele ferestrei, valori bune și greșite, selecții de 0, 1, 2 și o instanță lipsă,
 * fila care scrie și cea care doar citește.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Varf } from '../../src/geom/contur.ts';
import { pregateste } from '../../src/io/piesa.ts';
import { documentNou, type Operatie } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { CALCUL_DOCUMENT } from '../../src/ui/actiuniDocumentCalcul.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
const LA_CERERE = ['document.importa', 'document.aplica-operatii', 'document.pozitioneaza', 'document.roteste', 'foaie.stoc'];

function document(): Istoric {
  let h = istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let s: readonly string[] = [];
  const c: ContextDocument = { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => s, selecteaza: (ids) => { s = ids; } };
  ruleaza(R, 'document.adauga-dreptunghi', c);
  ruleaza(R, 'document.adauga-cerc', c);
  return h;
}

const patrat: Varf[] = [
  { p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } },
  { p: { x: 10, y: 10 }, s: { tip: 'L' } }, { p: { x: 0, y: 10 }, s: { tip: 'L' } },
];
const IMPORT = pregateste({ nume: 'p', cai: [{ varfuri: patrat }], laturi: ['exterior'], pagina: null });

test('cu calculul încărcat, garda + calculul = calculul singur, pe toată matricea de contexte', () => {
  const h = document();
  const ops = (f: (o: Operatie) => Operatie): ReadonlyMap<string, readonly Operatie[]> => new Map(h.doc.piese.map((p) => [p.id, p.operatii.map(f)]));
  const extra: Array<Partial<ContextDocument>> = [
    {},
    { importNou: () => IMPORT },
    { importNou: () => IMPORT, locImport: () => ({ x: 150, y: 100 }) },
    { importNou: () => IMPORT, locImport: () => ({ x: 1e12, y: 0 }) },
    { operatiiNoi: () => ops((o) => o) },
    { operatiiNoi: () => ops((o) => ({ ...o, adancime: 5 })) },
    { operatiiNoi: () => ops((o) => ({ ...o, adancime: -1 })) },
    { operatiiNoi: () => ops((o) => ({ ...o, id: 'altul' })) },
    { pozitieNoua: () => ({ x: 5 }) },
    { pozitieNoua: () => ({ y: Number.NaN }) },
    { pozitieNoua: () => ({ x: 20, y: 20 }) },
    { pozitieNoua: () => ({ x: 1e12 }) },
    { rotireNoua: () => 90 },
    { rotireNoua: () => Number.POSITIVE_INFINITY },
    { rotireNoua: () => -450 },
    { stocNou: () => ({ latime: 250 }) },
    { stocNou: () => ({ grosime: 0 }) },
    { stocNou: () => ({}) },
  ];
  let comparate = 0;
  const motive = new Set<string>();
  for (const sel of [[], ['e1'], ['e1', 'e2'], ['lipsa']]) {
    for (const doarCitire of [false, true]) {
      for (const x of extra) {
        const ctx: ContextDocument = {
          istoric: () => h, scrie: () => { throw new Error('activa nu scrie'); }, selectie: () => sel, selecteaza: () => undefined,
          doarCitire: () => doarCitire, ...x,
        };
        for (const id of LA_CERERE) {
          const a = ACTIUNI_DOCUMENT.find((y) => y.id === id);
          const c = CALCUL_DOCUMENT[id];
          assert.ok(a && c, id);
          const v = c.activa(ctx);
          assert.deepEqual(a.activa(ctx), v, `${id} [${sel.join(',')}] ${doarCitire} ${Object.keys(x).join('+')}`);
          motive.add(String(v));
          comparate++;
        }
      }
    }
  }
  assert.equal(comparate, 4 * 2 * extra.length * LA_CERERE.length);
  // Matricea atinge și ramurile de după gardă: altfel paritatea ar fi doar pe motivele gărzii.
  for (const m of ['true', 'motiv.doar-citire', 'motiv.prea-departe', 'motiv.valoare-invalida', 'motiv.operatie-invalida', 'motiv.foaie-invalida']) {
    assert.ok(motive.has(m), m);
  }
});

test('calculul înregistrat acoperă exact cele cinci acțiuni la cerere', () => {
  assert.deepEqual(Object.keys(CALCUL_DOCUMENT).sort(), [...LA_CERERE].sort());
});
