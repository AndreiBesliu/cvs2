/**
 * Ce scrie Exportă pentru incrustație (ADR 0170 §5, `operatieDinDialog`): valorile rândului peste cele din document, ÎMBINATE
 * (un câmp necunoscut al incrustației rămâne, ca la urechi și la fundul plat, ADR 0016), cu `fel: 'v'`; fără bifă, câmpul
 * pleacă; fără valori din dialog, rămâne al operației; Exportă fără nicio schimbare nu scrie o comandă (aceeași operație).
 * Găsită prin otrava E04 a feliei 12.1: niciun test nu cerea îmbinarea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Operatie } from '../../src/model/document.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const scula = { numar: 2, diametru: 6, forma: { tip: 'v' as const, unghi: 60 } };

/** Operația de incrustație din document (prin ușă), cu un câmp necunoscut în `incrustatie`. */
function operatieDinDocument(): Operatie {
  const r = incarca({
    schema: 20, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id: 'a', matrice: I, forma: { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 } },
      operatii: [{
        id: 'o', tip: 'vcarve', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5,
        scula: { numar: 2, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } },
        urechi: null, rampa: null, intrari: null, colturi: null,
        fundPlat: { scula: { numar: 1, nume: 'freza dreapta', diametru: 3 }, pasLateral: 1.2 },
        incrustatie: { fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'fata', notaAtelier: 'nuc în arțar' },
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 100, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc.piese[0]!.operatii[0]!;
}

const randul = (incrustatie: { joc: number; fierastrau: number; margine: number; jurDop: 'fata' | 'banda' } | null) => ({
  scula, latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5, urechi: null, rampa: null, intrari: null, colturi: null,
  tip: 'vcarve', fundPlat: { numar: 1, diametru: 3, pasLateral: 1.2 }, incrustatie,
} as const);

test('Exportă îmbină incrustația rândului peste cea din document: valorile noi, câmpul necunoscut rămâne, `fel` e v', () => {
  const o = operatieDinDocument();
  const scrisa = operatieDinDialog(o, randul({ joc: 0.4, fierastrau: 0.4, margine: 6, jurDop: 'fata' }), scula);
  assert.deepEqual(scrisa.incrustatie, { fel: 'v', joc: 0.4, fierastrau: 0.4, margine: 6, jurDop: 'fata', notaAtelier: 'nuc în arțar' });
});

test('fără bifă, incrustația pleacă; fără valori din dialog, rămâne; cu aceleași valori, operația e aceeași', () => {
  const o = operatieDinDocument();
  assert.ok(!Object.hasOwn(operatieDinDialog(o, randul(null), scula), 'incrustatie'));
  assert.deepEqual(operatieDinDialog(o, undefined, scula).incrustatie, o.incrustatie);
  assert.deepEqual(operatieDinDialog(o, randul({ joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'fata' }), scula), o);
});
