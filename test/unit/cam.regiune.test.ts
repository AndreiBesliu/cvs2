/**
 * Regiunea păstrată și invarianta 2 în aplicație (ADR 0026), cu valori pe hârtie, freza Ø6 (R3). Două piese la
 * distanța g: traseul exterior al uneia stă la g − 3 de cealaltă, deci trece doar dacă g − 3 ≥ 3 − ε (ε = 0,005).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { inK, PREFIX_REGIUNE, regiunePastrata } from '../../src/cam/regiune.ts';
import type { Document, Operatie } from '../../src/model/document.ts';
import { taieturiFoaie } from '../../src/model/lume.ts';
import { cuOperatie, docDin, ID, type FormaSimpla } from './ajutor-document.ts';

const FOAIA = { latime: 300, inaltime: 200, grosime: 18 };
const dr = (id: string, x: number, y: number, w = 20, h = 20): FormaSimpla =>
  ({ id, forma: { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });
const cerc = (id: string, x: number, y: number, raza: number): FormaSimpla => ({ id, forma: { tip: 'cerc', raza }, matrice: { ...ID, e: x, f: y } });
const doc = (...f: FormaSimpla[]): Document => docDin(FOAIA, ...f);
/** Rezultatul exportului: 'ok', sau motivul refuzului. */
const export_ = (d: Document): string => {
  const j = programDinDocument(d);
  return j.ok ? 'ok' : j.motiv;
};
const refuzat = (d: Document): string => {
  const m = export_(d);
  assert.ok(m.startsWith(PREFIX_REGIUNE), `trebuia refuzat de regiune, a dat: ${m}`);
  return m;
};

test('placa 1: dreptunghiul exterior cu gaura înăuntru trece; K e dreptunghiul fără disc', () => {
  const d = doc(dr('e1', 20, 20, 100, 60), cerc('e2', 70, 50, 15));
  assert.equal(export_(d), 'ok');
  const r = regiunePastrata(taieturiFoaie(d, 0));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.regiune.inele.map((x) => [x.idLume, x.rol, x.parinte === null ? null : r.regiune.inele[x.parinte]?.idLume]),
    [['e2/e2', 'gol', 'e1/e1'], ['e1/e1', 'piesa', null]]);
  assert.equal(inK(r.regiune, { x: 25, y: 25 }), true, 'în piesă');
  assert.equal(inK(r.regiune, { x: 70, y: 50 }), false, 'în gaură');
  assert.equal(inK(r.regiune, { x: 10, y: 10 }), false, 'în schelet');
});

test('două piese la distanța g, cu Ø6: trec peste g = 5,995 (ε = 0,005), sub ea sunt refuzate', () => {
  const pereche = (g: number): Document => doc(dr('e1', 10, 10), dr('e2', 30 + g, 10));
  assert.equal(export_(pereche(6)), 'ok');
  assert.equal(export_(pereche(5.996)), 'ok', 'în ε');
  const m = refuzat(pereche(5.994));
  assert.match(m, /tăietura lui e\d\/e\d intră în piesa e\d\/e\d cu 0\.00[56] mm/);
  assert.match(refuzat(pereche(2)), /intră în piesa/);
});

test('o piesă desenată în altă piesă, fără gol între ele: tăietura ei stă în piesa mare', () => {
  assert.match(refuzat(doc(dr('mare', 20, 20, 100, 60), dr('mica', 50, 40, 10, 10))), /tăietura lui mica\/mica stă în piesa mare\/mare/);
});

test('o gaură pusă singură (în schelet) lângă o piesă: trece, ca în testul owner-ului din 09.10', () => {
  assert.equal(export_(doc(dr('e1', 20, 20, 100, 60), cerc('e2', 161.238, 55.007, 15))), 'ok');
  // Și o gaură singură, fără nicio piesă: scheletul nu e păstrat, deci nimic de apărat în afara ei.
  assert.equal(export_(doc(cerc('e1', 70, 50, 15))), 'ok');
});

test('o gaură din schelet la 2 mm de o piesă: traseul piesei trece prin gaură (deșeu lângă deșeu) și nu e refuzat', () => {
  // Piesa 20…120; gaura R10 cu centrul la X 132 are marginea la 122. Traseul exterior al piesei, la X 123, intră în gaură
  // (1 mm de inelul ei), dar de ambele părți ale inelului găurii e deșeu: inelul nu e o margine a lui K.
  assert.equal(export_(doc(dr('e1', 20, 20, 100, 60), cerc('e2', 132, 50, 10))), 'ok');
  // Aceeași gaură, mutată în piesă (centrul la X 108, marginea la 118): inelul ei e acum margine (afară e piesa), iar
  // peretele de 2 mm rămâne: traseele stau la 5 mm de inelul celălalt.
  assert.equal(export_(doc(dr('e1', 20, 20, 100, 60), cerc('e2', 108, 50, 10))), 'ok');
});

test('inele care se ating, se taie sau coincid: refuzate cu motiv, cu locul', () => {
  assert.match(refuzat(doc(dr('e1', 20, 20), dr('e2', 20, 20))), /e1\/e1 și e2\/e2 se ating sau se intersectează/);
  assert.match(refuzat(doc(dr('e1', 20, 20), dr('e2', 40, 25))), /se ating/, 'lipite pe latură');
  // Gaura care trece de marginea piesei.
  assert.match(refuzat(doc(dr('e1', 20, 20, 100, 60), cerc('e2', 30, 50, 15))), /se ating sau se intersectează/);
});

test('un element cu operații și pe exterior, și pe interior: nu se știe ce parte se păstrează', () => {
  const d = doc(dr('e1', 20, 20, 100, 60));
  const p = d.piese[0];
  assert.ok(p);
  const op = p.operatii[0];
  assert.ok(op);
  const ambele: Document = { ...d, piese: [{ ...p, operatii: [op, { ...op, id: 'b', latura: 'interior' }] }] };
  assert.match(refuzat(ambele), /e1\/e1 are operații și pe exterior, și pe interior/);
});

test('peretele subțire rămâne: o gaură la 2 mm de marginea piesei trece (traseele stau la 5 mm de inelul celălalt)', () => {
  assert.equal(export_(doc(dr('e1', 20, 20, 100, 60), cerc('e2', 37, 50, 15))), 'ok');
});

test('insula dintr-o gaură e păstrată: departe de marginea găurii trece, la 2 mm de ea e refuzată', () => {
  const cuInsula = (razaInsula: number): Document => cuOperatie(
    doc(dr('e1', 20, 20, 100, 60), cerc('gaura', 70, 50, 20), cerc('insula', 70, 50, razaInsula)), 'insula', { latura: 'exterior' },
  );
  assert.equal(export_(cuInsula(5)), 'ok');
  const r = regiunePastrata(taieturiFoaie(cuInsula(5), 0));
  assert.ok(r.ok && inK(r.regiune, { x: 70, y: 50 }), 'centrul insulei e păstrat');
  assert.ok(r.ok && !inK(r.regiune, { x: 70, y: 62 }), 'între insulă și marginea găurii e deșeu');
  // Insula R18 în gaura R20: între ele 2 mm, mai puțin decât o freză de 6.
  refuzat(cuInsula(18));
});

test('pe-linie nu e inel și nu se judecă: o linie gravată peste marginea piesei trece', () => {
  const d = cuOperatie(doc(dr('e1', 20, 20, 100, 60), cerc('e2', 20, 20, 10)), 'e2', { latura: 'pe-linie', adancime: 1, pas: 1 });
  assert.equal(export_(d), 'ok');
});

test('instanțele rotite și două instanțe ale aceleiași piese: inelele în lume, fiecare cu id-ul lui', () => {
  const M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const op = (id: string, latura: Operatie['latura']): Operatie =>
    ({ id, tip: 'profil', noduri: [id], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura, sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null });
  const baza = doc();
  const cu = (x2: number): Document => ({
    ...baza,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: M, copii: [
          { tip: 'element', id: 'contur', forma: { tip: 'dreptunghi', latime: 40, inaltime: 30, razaColt: 0 }, matrice: M },
          { tip: 'element', id: 'gaura', forma: { tip: 'cerc', raza: 5 }, matrice: { ...M, e: 20, f: 15 } },
        ],
      },
      operatii: [op('contur', 'exterior'), op('gaura', 'interior')],
    }],
    foi: [{ ...baza.foi[0]!, instante: [{ id: 'i1', piesa: 'p', x: 100, y: 20, rotire: 90 }, { id: 'i2', piesa: 'p', x: x2, y: 100, rotire: 0 }] }],
  });
  // i1 rotită cu 90°: X 70…100, Y 20…60. i2 la X 120: departe; la X 102, lângă: 2 mm, deci refuzată.
  assert.equal(export_(cu(120)), 'ok');
  assert.match(refuzat({ ...cu(102), foi: [{ ...cu(102).foi[0]!, instante: [{ id: 'i1', piesa: 'p', x: 100, y: 20, rotire: 90 }, { id: 'i2', piesa: 'p', x: 102, y: 30, rotire: 0 }] }] }), /i[12]\/contur/);
});

test('recenzia 2.3a: freza Ø0,01 (R = ε) tot vede traversarea; motivul spune marginea cea mai apropiată, nu prima găsită', () => {
  const cuFreza = (d: Document, diametru: number): Document =>
    ({ ...d, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => ({ ...o, scula: { ...o.scula, diametru }, adancime: 0.01, pas: 0.01 })) })) });
  // Două piese la 0,001 mm: cu Ø0,01, traseul fiecăreia trece 0,004 mm în cealaltă.
  assert.match(refuzat(cuFreza(doc(dr('e1', 10, 10), dr('e2', 30.001, 10)), 0.01)), /intră în piesa e\d\/e\d cu cel puțin 0\.005 mm/);
  // Același lucru la Ø0,012 (R − ε > 0), refuzat și înainte.
  refuzat(cuFreza(doc(dr('e1', 10, 10), dr('e2', 30.001, 10)), 0.012));
  // e2 (pusă prima pe foaie, deci judecată prima) la 3,5 mm de e1, care are o gaură R4 la 1,5 mm de marginea ei. Traseul
  // lui e2 (X 60,5) stă la 0,5 de e1 (intră 2,5 mm în piesă) și la 2 de gaură (intră 1 mm în deșeul găurii, dar gaura e
  // margine a lui K). Se spune cea mai apropiată margine: e1, cu 2,5 mm; înainte se spunea gaura, cu 1 mm.
  const m = refuzat(doc(dr('e2', 63.5, 10, 20, 50), dr('e1', 10, 10, 50, 50), cerc('g', 54.5, 35, 4)));
  assert.match(m, /tăietura lui e2\/e2 intră în piesa e1\/e1 cu 2\.500 mm/);
});

