import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  adresaFilmK1, CERERE_FILME, CITIRI, citesteCadru, CREALITY_K1, DIR_GCODE, MAX_FILME, NUME_FILM,
} from '../../src/machine/imprimanta/creality.ts';
import type { FilmImprimanta, ImprimareIstoric } from '../../src/machine/imprimanta/driver.ts';
import { filmePe, TOLERANTA_MS, uneste, type ImprimareCvs2 } from '../../src/app/istoricImprimari.ts';

/*
 * Filmele timelapse (felia 3.6u, ADR 0194 §C), pe hârtie: lista K1 citită (`elapseVideoList`, transcrierea K1C 2025 și
 * integrarea Home Assistant), numele nesigure refuzate, adresa filmului (doar gazda legăturii și un nume din cifre) și filmul
 * fiecărei imprimări din istoric.
 */

const K1C_2025 = JSON.parse(readFileSync('test/fixtures/imprimanta/k1c-2025.json', 'utf8')) as { cadre: string[] };
const I = 1_761_305_276;
const cu = (o: unknown): readonly FilmImprimanta[] | null => citesteCadru(JSON.stringify({ elapseVideoList: [o] })).filme;
const bun = { id: I, videoname: `${I}.mp4`, gcodename: `${DIR_GCODE}3DBenchy_PLA_19m.gcode` };

test('3.6u: lista filmelor K1: numele, începutul (s → ms), fișierul; transcrierea K1C 2025 (goală) e o listă', () => {
  assert.deepEqual(K1C_2025.cadre.map(citesteCadru).find((c) => c.filme !== null)?.filme, []);
  assert.deepEqual(cu(bun), [{ nume: `${I}.mp4`, inceput: I * 1000, fisier: '3DBenchy_PLA_19m.gcode' }]);
  // Începutul ca text (Home Assistant îl citește cu `int()`); fără fișier, filmul rămâne, dar fără nume de fișier.
  assert.deepEqual(cu({ ...bun, id: String(I) })?.[0]?.inceput, I * 1000);
  assert.deepEqual(cu({ id: I, videoname: `${I}.mp4` })?.[0]?.fisier, null);
  assert.deepEqual(cu({ ...bun, gcodename: `${DIR_GCODE}..` })?.[0]?.fisier, null, 'un fișier nesigur nu se ține');
  // Ca text JSON în JSON; altceva nu e o listă; cel mult MAX_FILME.
  assert.equal(citesteCadru(JSON.stringify({ elapseVideoList: JSON.stringify([bun]) })).filme?.length, 1);
  assert.equal(citesteCadru('{"elapseVideoList":{"a":1}}').filme, null);
  assert.equal(citesteCadru('{"state":1}').filme, null, 'un cadru fără listă nu spune nimic despre filme');
  assert.equal(citesteCadru(JSON.stringify({ elapseVideoList: Array.from({ length: MAX_FILME + 5 }, () => bun) })).filme?.length, MAX_FILME);
  // Driverul: filmele trec în cadrul citit; cererea lor e o citire, cea pe care o trimite din nou fereastra.
  assert.deepEqual(CREALITY_K1.citeste('{"elapseVideoList":[]}').filme, []);
  assert.ok(CITIRI.has(CERERE_FILME));
  assert.equal(CREALITY_K1.cerereFilme, CERERE_FILME);
  assert.equal(CERERE_FILME, '{"method":"get","params":{"reqElapseVideoList":1}}');
});

test('3.6u: numele nesigure și începuturile absurde se sar: în adresă ajung doar cifre și `.mp4`', () => {
  const nume = ['../1.mp4', '1.mp4/../x', '1.MP4', 'a1.mp4', '1.mp4 ', ' 1.mp4', '1.mp4?x=1', '1.mp4#x', '%2e%2e.mp4', `${'1'.repeat(21)}.mp4`, '.mp4', '', 1, null];
  for (const n of nume) assert.deepEqual(cu({ ...bun, videoname: n }), [], JSON.stringify(n));
  for (const id of [0, -5, 1e10, 'ieri', '007', null]) assert.deepEqual(cu({ ...bun, id }), [], JSON.stringify(id));
  for (const rau of [null, 'text', 5, []]) assert.deepEqual(cu(rau), [], JSON.stringify(rau));
  assert.ok(NUME_FILM.test(`${'9'.repeat(20)}.mp4`));
});

test('3.6u: adresa filmului: http, pe 80, la gazda legăturii; nimic altceva nu intră', () => {
  assert.equal(adresaFilmK1('192.168.1.10', `${I}.mp4`), `http://192.168.1.10/downloads/video/${I}.mp4`);
  assert.equal(adresaFilmK1('k1c-8578.local', '7.mp4'), 'http://k1c-8578.local/downloads/video/7.mp4');
  assert.equal(adresaFilmK1('[fe80::1]', '7.mp4'), 'http://[fe80::1]/downloads/video/7.mp4');
  assert.equal(CREALITY_K1.adresaFilm('10.0.0.7', '7.mp4'), 'http://10.0.0.7/downloads/video/7.mp4');
  for (const g of ['', 'a/b', 'a@b', 'a b', 'a?b', 'a#b', '10.0.0.7:8080', 'a..b', '.a', '[fe80::1', 'fe80::1']) {
    assert.equal(adresaFilmK1(g, '7.mp4'), null, g);
  }
  for (const n of ['../7.mp4', '7.mp4?x', 'x.mp4', '7.avi']) assert.equal(adresaFilmK1('10.0.0.7', n), null, n);
});

test('3.6u: filmul fiecărei imprimări: același fișier, începutul la cel mult 10 min, cele mai apropiate întâi, câte unul', () => {
  const T = I * 1000;
  const film = (nume: string, inceput: number, fisier: string | null = 'a.gcode'): FilmImprimanta => ({ nume, inceput, fisier });
  const imp = [{ fisier: 'a.gcode', inceput: T }, { fisier: 'a.gcode', inceput: T + 3_600_000 }, { fisier: 'b.gcode', inceput: T + 7_200_000 }];
  // Fiecare la el; ordinea filmelor nu contează.
  assert.deepEqual(filmePe(imp, [film('2.mp4', T + 3_600_000 + 4000), film('1.mp4', T + 2000), film('3.mp4', T + 7_200_000, 'b.gcode')]), ['1.mp4', '2.mp4', '3.mp4']);
  // Alt fișier sau prea departe: fără film. Un film care nu-și spune fișierul se potrivește după timp.
  assert.deepEqual(filmePe(imp, [film('1.mp4', T, 'c.gcode'), film('2.mp4', T + 3_600_000 + TOLERANTA_MS + 1)]), [null, null, null]);
  assert.deepEqual(filmePe(imp, [film('3.mp4', T + 7_200_000 + TOLERANTA_MS, null)]), [null, null, '3.mp4']);
  // Două imprimări lângă un film: îl ia cea mai apropiată; două filme lângă o imprimare: cel mai apropiat.
  const doua = [{ fisier: 'a.gcode', inceput: T }, { fisier: 'a.gcode', inceput: T + 60_000 }];
  assert.deepEqual(filmePe(doua, [film('1.mp4', T + 50_000)]), [null, '1.mp4']);
  assert.deepEqual(filmePe([{ fisier: 'a.gcode', inceput: T }], [film('1.mp4', T + 50_000), film('2.mp4', T - 20_000)]), ['2.mp4']);
  assert.deepEqual(filmePe(imp, null), [null, null, null]);
  assert.deepEqual(filmePe([], [film('1.mp4', T)]), []);
});

test('3.6u: istoricul unit cu filmele: după începutul spus de imprimantă (același ceas cu filmul), altfel cel al ferestrei', () => {
  const T = I * 1000;
  const imp: ImprimareIstoric[] = [{ fisier: 'placa_PLA_18m0s.gcode', inceput: T, durata: 1100, filament: 3000, rezultat: 'gata' }];
  const rec = (x: Partial<ImprimareCvs2>): ImprimareCvs2 => ({
    v: 1, id: 'r', fisier: 'placa_PLA_18m0s.gcode', imprimanta: 'K1C-8578', inceput: T, sfarsit: null, rezultat: null, durata: null, filament: null,
    progres: null, estimare: 1080, material: 'PLA', piese: ['Plăcuța A'], ...x,
  });
  // Ceasul ferestrei e cu 9 min înaintea imprimantei: perechea se leagă (sub 10 min), iar filmul e al începutului imprimantei,
  // chiar dacă rândul arată începutul ferestrei. Un film mai aproape de începutul ferestrei (~7,7 min), dar la ~16,7 min de
  // cel al imprimantei, nu e al ei.
  const cvs2 = [rec({ inceput: T + 540_000 })];
  const filme = [{ nume: '9.mp4', inceput: T + 1_000_000, fisier: 'placa_PLA_18m0s.gcode' }, { nume: '1.mp4', inceput: T + 1000, fisier: 'placa_PLA_18m0s.gcode' }];
  const r = uneste(imp, cvs2, 'K1C-8578', null, filme);
  assert.deepEqual(r.map((x) => [x.inceput, x.durata, x.film]), [[T + 540_000, 1100, '1.mp4']]);
  // Doar în cvs2 (imprimanta nu și-a trimis istoricul): după începutul ferestrei.
  assert.deepEqual(uneste(null, [rec({ inceput: T })], null, null, [{ nume: '5.mp4', inceput: T + 5000, fisier: null }]).map((x) => x.film), ['5.mp4']);
  // Fără filme: niciun rând n-are film (și apelul de dinainte de 3.6u merge la fel).
  assert.deepEqual(uneste(imp, cvs2, 'K1C-8578', null).map((x) => x.film), [null]);
});
