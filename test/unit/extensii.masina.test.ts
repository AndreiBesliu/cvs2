/**
 * Serviciul `masina` al extensiilor (ADR 0199 §B), în gazdă, peste un înveliș al ferestrei Mașina imitat:
 * - permisiunea `masina`, instanța live (oprit), o metodă necunoscută: refuzate, fără să atingă senderul;
 * - starea, și fără fereastra Mașina (nicio sesiune încă);
 * - încărcarea: numele curățat, doar tipurile G-code, datele ca text, octeți sau `Blob` (copiate), plafonul, fereastra Mașina
 *   așteptată; refuzul programului, cu codul și linia;
 * - pornirea, reluarea, pauza, oprirea, cu numele extensiei; fără fereastra Mașina, nicio legătură;
 * - lucrarea trimisă spre „Lucrarea primită”: mesajul `primit`, sau refuzul unei lucrări fără forma protocolului.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MasinaPentruExtensii, RezultatMasina, StareMasinaExtensie } from '../../src/app/lucrare.ts';
import { FARA_MASINA, OCTETI_PROGRAM, servesteMasina, type ExtensieMasina, type ServiciiMasina } from '../../src/extensii/masina.ts';

const EXT: ExtensieMasina = { id: 'trenulet', nume: 'Planificator Trenuleț', permisiuni: ['stocare', 'masina'] };
const STARE: StareMasinaExtensie = { conectata: true, faza: 'pregatit', indicator: null, program: { nume: 'a.nc', sha256: 'cd'.repeat(32), linii: 3 } };

/** Un înveliș imitat: ține cererile și răspunde cu ce i se dă. */
function masina(raspuns: RezultatMasina = { ok: true, rezultat: null }) {
  const cereri: unknown[][] = [];
  const m: MasinaPentruExtensii = {
    stare: () => STARE,
    aboneaza: () => () => {},
    incarca: async (nume, octeti, extensie) => { cereri.push(['incarca', nume, [...octeti], extensie]); return raspuns; },
    porneste: async (extensie) => { cereri.push(['porneste', extensie]); return raspuns; },
    reia: async (extensie) => { cereri.push(['reia', extensie]); return raspuns; },
    pauza: () => { cereri.push(['pauza']); return raspuns; },
    opreste: () => { cereri.push(['opreste']); return raspuns; },
    anuleaza: () => {},
  };
  return { m, cereri };
}
function servicii(m: MasinaPentruExtensii | null, extra: Partial<ServiciiMasina> = {}): ServiciiMasina & { asteptate: number; trimise: unknown[] } {
  const s = {
    asteptate: 0,
    trimise: [] as unknown[],
    activ: true,
    masina: () => m,
    asteapta: async () => { s.asteptate += 1; return m; },
    trimite: async (l: unknown, e: ExtensieMasina) => { s.trimise.push([l, e.id]); return { tip: 'primit' }; },
    ...extra,
  };
  return s;
}
const cere = (metoda: string, argumente: unknown[], s: ServiciiMasina, ext: ExtensieMasina = EXT) => servesteMasina(ext, metoda, argumente, s);

test('fără permisiune, pe live sau cu o metodă necunoscută: refuzat, senderul neatins', async () => {
  const { m, cereri } = masina();
  const fara = { ...EXT, permisiuni: ['stocare'] };
  for (const metoda of ['stare', 'incarca', 'porneste', 'reia', 'pauza', 'opreste', 'trimite']) {
    assert.deepEqual(await cere(metoda, ['a.nc', 'G54\n'], servicii(m), fara), { ok: false, eroare: 'masina:permisiune' }, metoda);
    assert.deepEqual(await cere(metoda, ['a.nc', 'G54\n'], servicii(m, { activ: false })), { ok: false, eroare: 'masina:live' }, metoda);
  }
  assert.deepEqual(await cere('jog', [], servicii(m)), { ok: false, eroare: 'masina:necunoscut' });
  assert.deepEqual(cereri, []);
});

test('starea: a ferestrei Mașina; fără ea, deconectată și fără program (fereastra nu se montează pentru atât)', async () => {
  const s = servicii(null);
  assert.deepEqual(await cere('stare', [], s), { ok: true, rezultat: FARA_MASINA });
  assert.deepEqual(FARA_MASINA, { conectata: false, faza: 'liber', indicator: null, program: null });
  assert.equal(s.asteptate, 0);
  assert.deepEqual(await cere('stare', [], servicii(masina().m)), { ok: true, rezultat: STARE });
});

test('încărcarea: numele curățat, tipurile G-code, datele copiate, plafonul; fereastra Mașina așteptată; refuzul cu linia', async () => {
  const { m, cereri } = masina({ ok: true, rezultat: { nume: 'x', sha256: '0', linii: 1 } });
  const s = servicii(m);
  assert.deepEqual(await cere('incarca', ['gcode/placa_1_T1.nc', 'G54\n'], s), { ok: true, rezultat: { nume: 'x', sha256: '0', linii: 1 } });
  const octeti = new Uint8Array([71, 53, 52, 10]);
  await cere('incarca', ['b.GCODE', octeti], s);
  octeti[0] = 0;
  await cere('incarca', ['c‮gnp.ngc', octeti.buffer], s);
  await cere('incarca', ['d.tap', new Blob(['M3\n'])], s);
  assert.deepEqual(cereri, [
    ['incarca', 'placa_1_T1.nc', [71, 53, 52, 10], 'Planificator Trenuleț'],
    ['incarca', 'b.GCODE', [71, 53, 52, 10], 'Planificator Trenuleț'],
    ['incarca', 'cgnp.ngc', [0, 53, 52, 10], 'Planificator Trenuleț'],
    ['incarca', 'd.tap', [77, 51, 10], 'Planificator Trenuleț'],
  ]);
  assert.equal(s.asteptate, 4);
  for (const nume of ['a.exe', 'a.svg', '', 12, null, '...', 'x'.repeat(130) + '.nc']) {
    assert.deepEqual(await cere('incarca', [nume, 'G54\n'], s), { ok: false, eroare: 'masina:nume' }, String(nume));
  }
  for (const date of [12, null, {}, [71]]) assert.deepEqual(await cere('incarca', ['a.nc', date], s), { ok: false, eroare: 'masina:date' }, String(date));
  assert.deepEqual(await cere('incarca', ['a.nc', new Uint8Array(OCTETI_PROGRAM + 1)], s), { ok: false, eroare: 'masina:prea-mare' });
  assert.equal(cereri.length, 4);
  assert.deepEqual(await cere('incarca', ['a.nc', 'G54\n'], servicii(null)), { ok: false, eroare: 'masina:indisponibila' });
  const rau = masina({ ok: false, cod: 'program:fara-wcs:3' });
  assert.deepEqual(await cere('incarca', ['a.nc', 'G0 X1\n'], servicii(rau.m)), { ok: false, eroare: 'masina:program:fara-wcs:3' });
});

test('pornirea, reluarea, pauza și oprirea trec la fereastra Mașina, cu numele extensiei; fără ea, nicio legătură', async () => {
  const { m, cereri } = masina();
  for (const metoda of ['porneste', 'reia', 'pauza', 'opreste']) assert.deepEqual(await cere(metoda, [], servicii(m)), { ok: true, rezultat: null });
  assert.deepEqual(cereri, [['porneste', 'Planificator Trenuleț'], ['reia', 'Planificator Trenuleț'], ['pauza'], ['opreste']]);
  const refuz = masina({ ok: false, cod: 'renuntat' });
  assert.deepEqual(await cere('porneste', [], servicii(refuz.m)), { ok: false, eroare: 'masina:renuntat' });
  for (const metoda of ['porneste', 'reia', 'pauza', 'opreste']) {
    assert.deepEqual(await cere(metoda, [], servicii(null)), { ok: false, eroare: 'masina:neconectat' }, metoda);
  }
});

test('lucrarea spre „Lucrarea primită”: răspunsul dialogului; una fără forma protocolului, refuzată', async () => {
  const s = servicii(null);
  const l = { protocol: 'cvs2-lucrare', tip: 'lucrare' };
  assert.deepEqual(await cere('trimite', [l], s), { ok: true, rezultat: { tip: 'primit' } });
  assert.deepEqual(s.trimise, [[l, 'trenulet']]);
  assert.deepEqual(await cere('trimite', [l], servicii(null, { trimite: async () => null })), { ok: false, eroare: 'masina:lucrare' });
});
