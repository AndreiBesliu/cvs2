import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desenSectiune, type DateDesen } from '../../src/app/sectiuneDesen.ts';

/**
 * Desenul secțiunii „Împreună” (ADR 0179 §5 și felia 12.1↑e-3, punctul 6), pe hârtie, pe secțiuni scrise de mână.
 *
 * Dopul în V rămâne desenat prin centrele celulelor (pereții lui sunt înclinați). La pereții drepți, fiecare celulă e o
 * treaptă cât ea, deci pereții ies verticali. Cleiul e doar în locaș: de la suprafața plăcii până la fața de jos a dopului,
 * cel mult până la fața plăcii (deasupra ei e spațiul dintre plăci, nu clei); la dopul decupat, și unde în locaș nu e dop.
 * La gaura prin foaie, placa e groasă cât foaia, fără fund sub gaură și fără contact pe el.
 *
 * Celulele (de 0,1 mm, de la X 15): două în afara locașului, una în jocul lateral, două sub dop, una în jocul lateral, două
 * în afară. Y-ul desenului e −Z.
 */
const f32 = (v: readonly number[]): Float32Array => Float32Array.from(v);
const N = Number.NaN;
const sectiune = (placa: readonly number[], dop: readonly number[], grosimeDop: number, marcaj: number | null = null) =>
  ({ y: 30.05, x0: 15, celula: 0.1, placa: f32(placa), dop: f32(dop), marcaj, grosimeDop });
const LOCAS = [0, 0, -3, -3, -3, -3, 0, 0];

/** Dopul ridicat, sprijinit pe fund: D 3, h 5 (H 2); fața coborâtă a dopului, la 2 peste placă. */
const peFund: DateDesen = {
  fel: 'drept', hartie: { D: 3, decupat: false, gaura: false }, asezare: 3, adancime: 3, inaltime: 5,
  sectiune: sectiune(LOCAS, [2, 2, 2, -3, -3, 2, 2, 2], 6),
};

test('pereții drepți, dopul ridicat pe fund: treptele verticale, cleiul doar în jocul lateral, până la fața plăcii', () => {
  const g = desenSectiune(peFund);
  assert.equal(g.cutie, '15 -3 0.8 7.5');
  assert.equal(g.placa, 'M15 4.5 L15 0 L15.2 0 L15.2 3 L15.6 3 L15.6 0 L15.8 0 L15.8 4.5Z');
  assert.equal(g.dop, 'M15 -3 L15.8 -3 L15.8 -2 L15.5 -2 L15.5 3 L15.3 3 L15.3 -2 L15 -2Z');
  // Jocul lateral, o celulă de fiecare parte: de la fundul locașului (Y 3) până la fața plăcii (Y 0), nu până la fața
  // coborâtă a dopului (Y −2), care e la H peste placă.
  assert.equal(g.clei, 'M15.2 0 L15.3 0 L15.3 3 L15.2 3Z M15.5 0 L15.6 0 L15.6 3 L15.5 3Z');
  assert.deepEqual(g.contact, ['15.3,3 15.5,3']);
  assert.deepEqual(g.taiere, { fel: 'fierastrau', y: '-1' });
  assert.deepEqual([g.x0, g.x1, g.ySus, g.yJos, g.marcaj], ['15', '15.8', '-3', '4.5', null]);
});

test('pereții drepți, jocul lateral de trei celule: cleiul rămâne sub fața plăcii pe toată lățimea lui', () => {
  const g = desenSectiune({
    ...peFund, sectiune: sectiune([0, -3, -3, -3, -3, -3, -3, 0], [2, 2, 2, 2, -3, -3, 2, 2], 6),
  });
  assert.equal(g.clei, 'M15.1 0 L15.4 0 L15.4 3 L15.1 3Z M15.6 0 L15.7 0 L15.7 3 L15.6 3Z');
  assert.deepEqual(g.contact, ['15.4,3 15.6,3']);
});

test('pereții drepți, dopul ridicat pe față: cleiul de sub dop (g) și din jocul lateral, o singură bucată; tăietura la fața plăcii', () => {
  const g = desenSectiune({
    fel: 'drept', hartie: { D: 3, decupat: false, gaura: false }, asezare: 2.5, adancime: 3, inaltime: 2.5,
    sectiune: sectiune(LOCAS, [0, 0, 0, -2.5, -2.5, 0, 0, 0], 3.5),
  });
  assert.equal(g.cutie, '15 -1 0.8 5.5');
  assert.equal(g.dop, 'M15 -1 L15.8 -1 L15.8 0 L15.5 0 L15.5 2.5 L15.3 2.5 L15.3 0 L15 0Z');
  assert.equal(g.clei, 'M15.2 0 L15.3 0 L15.3 2.5 L15.5 2.5 L15.5 0 L15.6 0 L15.6 3 L15.2 3Z');
  assert.deepEqual(g.contact, []);
  assert.deepEqual(g.taiere, { fel: 'fierastrau', y: '0' });
});

test('pereții drepți, pragul contactului: sub 0,05 mm e contact (verde), de la 0,05 e clei', () => {
  const cu = (dop: number) => desenSectiune({
    fel: 'drept', hartie: { D: 3, decupat: false, gaura: false }, asezare: -dop, adancime: 3, inaltime: -dop,
    sectiune: sectiune(LOCAS, [0, 0, 0, dop, dop, 0, 0, 0], 3.5),
  });
  const strans = cu(-2.96), larg = cu(-2.94);
  assert.deepEqual(strans.contact, ['15.3,3 15.5,3']);
  assert.equal(strans.clei, 'M15.2 0 L15.3 0 L15.3 3 L15.2 3Z M15.5 0 L15.6 0 L15.6 3 L15.5 3Z');
  assert.deepEqual(larg.contact, []);
  assert.equal(larg.clei, 'M15.2 0 L15.3 0 L15.3 2.94 L15.5 2.94 L15.5 0 L15.6 0 L15.6 3 L15.2 3Z');
});

/** Dopul decupat: neîntors, pe fundul locașului; în afara lui, nimic (NaN). Placa lui e groasă de exact h = 5. */
const decupat: DateDesen = {
  fel: 'drept', hartie: { D: 3, decupat: true, gaura: false }, asezare: 3, adancime: 3, inaltime: 5,
  sectiune: sectiune(LOCAS, [N, N, N, -3, -3, N, N, N], 5),
};

test('pereții drepți, dopul decupat: doar dopul, cu pereții verticali; jocul lateral e clei, până la fața plăcii; rindeaua la fața ei', () => {
  const g = desenSectiune(decupat);
  assert.equal(g.cutie, '15 -2 0.8 6.5');
  assert.equal(g.dop, 'M15.3 -2 L15.5 -2 L15.5 3 L15.3 3Z');
  assert.equal(g.clei, 'M15.2 0 L15.3 0 L15.3 3 L15.2 3Z M15.5 0 L15.6 0 L15.6 3 L15.5 3Z');
  assert.deepEqual(g.contact, ['15.3,3 15.5,3']);
  assert.deepEqual(g.taiere, { fel: 'rindea', y: '0' });
});

test('dopul ridicat fără lemn deasupra unei celule din locaș (NaN) nu primește clei acolo: doar la cel decupat locașul gol e joc', () => {
  const g = desenSectiune({ ...peFund, sectiune: sectiune(LOCAS, [2, 2, N, -3, -3, 2, 2, 2], 6) });
  assert.equal(g.clei, 'M15.5 0 L15.6 0 L15.6 3 L15.5 3Z');
  assert.equal(g.dop, 'M15 -3 L15.2 -3 L15.2 -2 L15 -2Z M15.3 -3 L15.8 -3 L15.8 -2 L15.5 -2 L15.5 3 L15.3 3Z');
});

test('gaura prin foaia de 18: placa e groasă cât foaia, fără lemn sub gaură și fără contact pe un fund care nu e; cleiul, pe toată grosimea', () => {
  const prin = [0, 0, -18, -18, -18, -18, 0, 0], dop = [N, N, N, -18, -18, N, N, N];
  const g = desenSectiune({
    fel: 'drept', hartie: { D: 18, decupat: true, gaura: true }, asezare: 18, adancime: 18, inaltime: 20, sectiune: sectiune(prin, dop, 20),
  });
  assert.equal(g.cutie, '15 -2 0.8 20');
  assert.equal(g.placa, 'M15 18 L15 0 L15.2 0 L15.2 18 L15.6 18 L15.6 0 L15.8 0 L15.8 18Z');
  assert.equal(g.dop, 'M15.3 -2 L15.5 -2 L15.5 18 L15.3 18Z');
  assert.equal(g.clei, 'M15.2 0 L15.3 0 L15.3 18 L15.2 18Z M15.5 0 L15.6 0 L15.6 18 L15.5 18Z');
  assert.deepEqual(g.contact, []);
  assert.equal(g.yJos, '18');
  // Martorul: același locaș de 18, dar buzunar într-o placă mai groasă, are fund (1,5 mm sub el) și contact pe el.
  const buzunar = desenSectiune({
    fel: 'drept', hartie: { D: 18, decupat: true, gaura: false }, asezare: 18, adancime: 18, inaltime: 20, sectiune: sectiune(prin, dop, 20),
  });
  assert.equal(buzunar.cutie, '15 -2 0.8 21.5');
  assert.deepEqual(buzunar.contact, ['15.3,18 15.5,18']);
  // La gaură, o treaptă rămasă în ea (un buzunar mai puțin adânc lângă) are fund și contact.
  const cuTreapta = desenSectiune({
    fel: 'drept', hartie: { D: 18, decupat: true, gaura: true }, asezare: 10, adancime: 18, inaltime: 20,
    sectiune: sectiune([0, 0, -18, -10, -18, -18, 0, 0], [N, N, N, -10, -10, N, N, N], 20),
  });
  assert.deepEqual(cuTreapta.contact, ['15.3,10 15.4,10']);
});

test('locul diferenței: marcajul trece neschimbat, pe toată înălțimea desenului', () => {
  const g = desenSectiune({ ...peFund, sectiune: sectiune(LOCAS, [2, 2, 2, -3, -3, 2, 2, 2], 6, 15.25) });
  assert.equal(g.marcaj, '15.25');
});

test('dopul în V rămâne desenat prin centrele celulelor: pereții înclinați, cleiul de sub dop, contactul pe pereți', () => {
  // Celula de 0,5 mm de la X 10: fața plăcii, peretele (contact), fundul cu jocul g = 0,5 (două celule), peretele, fața.
  const g = desenSectiune({
    fel: 'v', hartie: { D: 3, H: 2 }, asezare: 2.5, intre: { med: 2 },
    sectiune: { y: 20, x0: 10, celula: 0.5, placa: f32([0, -1, -3, -3, -1, 0]), dop: f32([2, -1, -2.5, -2.5, -1, 2]), marcaj: null, grosimeDop: 5.5 },
  });
  assert.equal(g.cutie, '10 -3 3 7.5');
  assert.equal(g.placa, 'M10 4.5 L10.25 0 L10.75 1 L11.25 3 L11.75 3 L12.25 1 L12.75 0 L13 4.5Z');
  assert.equal(g.dop, 'M10 -3 L13 -3 L12.75 -2 L12.25 1 L11.75 2.5 L11.25 2.5 L10.75 1 L10.25 -2Z');
  assert.equal(g.clei, 'M11.25 2.5 L11.75 2.5 L11.75 3 L11.25 3Z');
  assert.deepEqual(g.contact, ['10.75,1', '12.25,1']);
  assert.deepEqual(g.taiere, { fel: 'fierastrau', y: '-1' });
  // Fără mediana simulată a spațiului dintre plăci (nicio celulă în bandă), tăietura e la H / 2 de pe hârtie.
  const fara = desenSectiune({
    fel: 'v', hartie: { D: 3, H: 3 }, asezare: 2.5, intre: { med: Number.NaN },
    sectiune: { y: 20, x0: 10, celula: 0.5, placa: f32([0, -1, -3, -3, -1, 0]), dop: f32([2, -1, -2.5, -2.5, -1, 2]), marcaj: null, grosimeDop: 5.5 },
  });
  assert.deepEqual(fara.taiere, { fel: 'fierastrau', y: '-1.5' });
});
