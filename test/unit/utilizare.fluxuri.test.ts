import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimeaza, P_OAMENI, PASI_PALNIE, pasPalnie, schitaDin, schitaNoua, SECVENTE_PE_LUNGIME, intraInSecventa, SumatorZi, type LotZi,
} from '../../shared/utilizareZi.ts';

/**
 * Fluxurile (ADR 0262 §6, felia A.10), în sumele zilei, pe hârtie: secvențele de 3 și 4 acțiuni reușite ale fiecărei sesiuni
 * (repetările lipite, selecția și navigarea lăsate deoparte, ordinea după timp și peste loturi), numărate în sesiuni și de
 * câte ori, cele mai dese păstrate; pâlnia drumului principal, după pasul cel mai departe atins de fiecare sesiune.
 */

const lot = (uid: string, sesiune: string, evenimente: Record<string, unknown>[], personal = false): LotZi =>
  ({ uid, sesiune, personal, aruncate: 0, evenimente });
const A = (t: number, id: string, rez = 'ok', n?: number) => ({ fel: 'actiune', t, id, de: 'bara', rez, ...(n ? { n } : {}) });
const zi = (loturi: LotZi[]) => {
  const s = new SumatorZi('2026-11-23');
  for (const l of loturi) s.adauga(l);
  return s.rezultat().segmente;
};

test('secvențele: acțiunile reușite ale sesiunii, în ordinea timpului (și peste loturi), cu repetările lipite; selecția și navigarea deoparte', () => {
  const s = zi([
    // Al doilea lot al sesiunii vine înaintea primului (ordinea primirii nu contează: timpul da).
    lot('ana', 'sesiunea-ana-0001', [A(5_000, 'document.rol'), A(6_000, 'export.gcode')]),
    lot('ana', 'sesiunea-ana-0001', [
      A(1_000, 'document.importa'), A(1_500, 'selectie.la-punct'), A(2_000, 'document.roteste', 'ok', 3), A(2_500, 'document.roteste'),
      A(3_000, 'vedere.potriveste'), A(3_500, 'document.taie', 'motiv.nimic-ales'), A(4_000, 'document.transforma'),
    ]),
    lot('ion', 'sesiunea-ion-0001', [A(1_000, 'document.importa'), A(2_000, 'document.roteste'), A(3_000, 'document.transforma')]),
  ]).clienti;
  // Ana: importă → rotește (lipit) → transformă → rol → export; Ion: importă → rotește → transformă.
  assert.deepEqual(s.secvente['document.importa>document.roteste>document.transforma'], { n: 2, s: 2 });
  assert.deepEqual(s.secvente['document.roteste>document.transforma>document.rol'], { n: 1, s: 1 });
  assert.deepEqual(s.secvente['document.transforma>document.rol>export.gcode'], { n: 1, s: 1 });
  assert.deepEqual(s.secvente['document.importa>document.roteste>document.transforma>document.rol'], { n: 1, s: 1 });
  assert.equal(Object.keys(s.secvente).length, 5, Object.keys(s.secvente).join(' | '));
  for (const k of Object.keys(s.secvente)) assert.ok(!/selectie\.|vedere\.potriveste|document\.taie/.test(k), k);
});

test('secvențele: o buclă se numără de câte ori apare, dar o singură dată pe sesiune; doar cele mai dese se păstrează', () => {
  const bucla = [1, 2, 3, 4, 5, 6, 7].map((i) => A(i * 1_000, i % 2 ? 'document.roteste' : 'istoric.anuleaza'));
  const s = zi([lot('ana', 'sesiunea-ana-0002', bucla)]).clienti;
  assert.deepEqual(s.secvente['document.roteste>istoric.anuleaza>document.roteste'], { n: 3, s: 1 });
  assert.deepEqual(s.secvente['istoric.anuleaza>document.roteste>istoric.anuleaza'], { n: 2, s: 1 });
  // Multe secvențe diferite (fiecare sesiune a ei): pe fiecare lungime, cel mult SECVENTE_PE_LUNGIME.
  const multe: LotZi[] = [];
  for (let i = 0; i < SECVENTE_PE_LUNGIME + 40; i++) {
    multe.push(lot(`om${i}`, `sesiunea-multe-${String(i).padStart(4, '0')}`, [A(1, `document.a${i}`), A(2, `document.b${i}`), A(3, `document.c${i}`)]));
  }
  // O secvență în 3 sesiuni rămâne sigur.
  for (let i = 0; i < 3; i++) multe.push(lot(`x${i}`, `sesiunea-x-${String(i).padStart(9, '0')}`, [A(1, 'document.rol'), A(2, 'export.gcode'), A(3, 'vedere.masina')]));
  const m = zi(multe).clienti;
  assert.equal(Object.keys(m.secvente).filter((k) => k.split('>').length === 3).length, SECVENTE_PE_LUNGIME);
  assert.deepEqual(m.secvente['document.rol>export.gcode>vedere.masina'], { n: 3, s: 3 });
  assert.equal(intraInSecventa('selectie.din-lista'), false);
  assert.equal(intraInSecventa('vedere.paleta'), false);
  assert.equal(intraInSecventa('vedere.traseu'), true);
  assert.equal(intraInSecventa('document.rol'), true);
});

test('pâlnia: fiecare sesiune ajunge până la pasul cel mai departe atins; personalul deoparte; oamenii pe pas', () => {
  const s = zi([
    // Doar deschide.
    lot('a', 'sesiunea-a-000001', [{ fel: 'fereastra', t: 1, id: 'proiectare' }]),
    // Desenează, apoi un rol refuzat: rămâne la conținut.
    lot('b', 'sesiunea-b-000001', [A(1, 'document.deseneaza'), A(2, 'document.rol', 'motiv.nimic-ales')]),
    // Importă și pune rolul.
    lot('c', 'sesiunea-c-000001', [A(1, 'document.importa'), A(2, 'document.rol')]),
    // Proiect salvat: exportă direct (fără desen sau rol în sesiune), apoi pornește lucrarea.
    lot('d', 'sesiunea-d-000001', [{ fel: 'calcul', t: 1, id: 'export', ms: 1_000, rez: 'ok', forme: 10 }, { fel: 'masina', t: 2, id: 'pornita' }]),
    // Un export căzut nu e un export.
    lot('e', 'sesiunea-e-000001', [A(1, 'document.text'), { fel: 'calcul', t: 2, id: 'export', ms: 1_000, rez: 'eroare', forme: 10 }]),
    // A doua sesiune a lui c, doar deschisă: c rămâne un singur om la rol.
    lot('c', 'sesiunea-c-000002', [A(1, 'vedere.tema')]),
    lot('owner', 'sesiunea-o-000001', [A(1, 'document.importa')], true),
  ]);
  assert.deepEqual(PASI_PALNIE, ['deschidere', 'continut', 'rol', 'export', 'masina']);
  const sesiuni = PASI_PALNIE.map((p) => s.clienti.palnie[p].sesiuni);
  assert.deepEqual(sesiuni, [6, 4, 2, 1, 1]);
  const oameni = PASI_PALNIE.map((p) => Math.round(estimeaza(schitaDin(s.clienti.palnie[p].oameni, P_OAMENI) ?? schitaNoua(P_OAMENI))));
  assert.deepEqual(oameni, [5, 4, 2, 1, 1]);
  assert.deepEqual(PASI_PALNIE.map((p) => s.personal.palnie[p].sesiuni), [1, 1, 0, 0, 0]);
  // Pașii, din evenimente.
  assert.equal(pasPalnie({ fel: 'actiune', t: 1, id: 'document.adauga-cerc', de: 'bara', rez: 'ok' }), 1);
  assert.equal(pasPalnie({ fel: 'actiune', t: 1, id: 'document.aplica-operatii', de: 'bara', rez: 'ok' }), 2);
  assert.equal(pasPalnie({ fel: 'actiune', t: 1, id: 'export.gcode', de: 'bara', rez: 'ok' }), 0, 'butonul deschide doar fereastra');
  assert.equal(pasPalnie({ fel: 'masina', t: 1, id: 'legata' }), 0);
});
