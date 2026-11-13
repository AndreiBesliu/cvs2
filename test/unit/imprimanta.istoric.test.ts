import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CERERE_ISTORIC, CITIRI, citesteCadru, CREALITY_K1, DIR_GCODE, MAX_ISTORIC } from '../../src/machine/imprimanta/creality.ts';
import type { ImprimareIstoric } from '../../src/machine/imprimanta/driver.ts';
import {
  citesteSetariIstoric, cost, csvIstoric, cuImprimare, grame, imprimareCvs2, inregistreaza, invatat, materialDinNume, materialDupa, MAX_IMPRIMARI,
  pretKg, scrieSetariIstoric, SETARI_ISTORIC, TOLERANTA_MS, totaluriLuna, uneste, type ClipaIstoric, type DinFisier, type ImprimareCvs2, type RandIstoric,
} from '../../src/app/istoricImprimari.ts';

/*
 * Istoricul imprimărilor (felia 3.6t, ADR 0194 §B), pe hârtie: istoricul K1 citit (transcrierea K1C 2025), înregistrarea fiecărei
 * imprimări văzute de fereastră, istoricul cvs2 ținut (contopirea, plafonul), unirea celor două, gramele, costul, totalurile,
 * CSV-ul, estimarea care învață și setările.
 */

const K1C_2025 = JSON.parse(readFileSync('test/fixtures/imprimanta/k1c-2025.json', 'utf8')) as { cadre: string[] };

test('3.6t: istoricul K1 (transcrierea K1C 2025): fișierul, începutul, durata, filamentul, rezultatul; intrările stricate se sar', () => {
  const ist = K1C_2025.cadre.map(citesteCadru).find((c) => c.istoric !== null);
  assert.deepEqual(ist?.istoric, [{ fisier: '3DBenchy_PLA_19m.gcode', inceput: 1761305276000, durata: 1140, filament: 3712.4, rezultat: 'gata' }]);
  const cu = (o: unknown): readonly ImprimareIstoric[] | null => citesteCadru(JSON.stringify({ historyList: [o] })).istoric;
  const bun = { filename: `${DIR_GCODE}a.gcode`, starttime: 1761305276, usagetime: '1140', usagematerial: 10, printfinish: 0 };
  assert.deepEqual(cu(bun), [{ fisier: 'a.gcode', inceput: 1761305276000, durata: 1140, filament: 10, rezultat: 'oprita' }]);
  for (const [pf, rez] of [[2, 'eroare'], [3, 'eroare'], [1, 'gata'], [7, null], ['x', null]] as const) assert.equal(cu({ ...bun, printfinish: pf })?.[0]?.rezultat, rez, String(pf));
  assert.deepEqual([cu({ ...bun, usagetime: -5 })?.[0]?.durata, cu({ ...bun, usagematerial: 'mult' })?.[0]?.filament], [null, null]);
  const rele: unknown[] = [
    { ...bun, filename: '' }, { ...bun, filename: `${DIR_GCODE}a\u0001.gcode` }, { ...bun, filename: `${DIR_GCODE}..` }, { ...bun, starttime: 0 },
    { ...bun, starttime: 1e10 }, { ...bun, starttime: 'ieri' }, null, 'text',
  ];
  for (const rau of rele) assert.deepEqual(cu(rau), [], JSON.stringify(rau));
  // Ca text JSON în JSON; o listă goală e o listă; altceva nu e istoric; cel mult MAX_ISTORIC.
  assert.equal(citesteCadru(JSON.stringify({ historyList: JSON.stringify([bun]) })).istoric?.length, 1);
  assert.deepEqual(citesteCadru('{"historyList":[]}').istoric, []);
  assert.equal(citesteCadru('{"historyList":{"a":1}}').istoric, null);
  assert.equal(citesteCadru(JSON.stringify({ historyList: Array.from({ length: MAX_ISTORIC + 5 }, () => bun) })).istoric?.length, MAX_ISTORIC);
  // Driverul: istoricul trece în cadrul citit; cererea lui e o citire, cea pe care o trimite din nou fereastra.
  assert.deepEqual(CREALITY_K1.citeste('{"historyList":[]}').istoric, []);
  assert.ok(CITIRI.has(CERERE_ISTORIC));
  assert.equal(CREALITY_K1.cerereIstoric, CERERE_ISTORIC);
});

const FISIER = `${DIR_GCODE}placa_PLA_18m0s.gcode`;
const clipa = (x: Partial<ClipaIstoric> = {}): ClipaIstoric => ({
  legatura: 'vie', lucrare: 'imprima', fisier: FISIER, eroare: null, cheieEroare: null, faraFilament: null, strat: null, pauzaFisier: null,
  trecut: 60, filament: 100, progres: 10, ...x,
});
const T = 1_800_000_000_000;

test('3.6t: înregistrarea: lucrarea nouă, scrisă pe loc; ce știe cvs2 despre fișier, o dată; finalul, cu cifrele de dinaintea lui', () => {
  // Prima clipă vie a unei lucrări (după legare): începutul e acum minus timpul trecut spus de imprimantă.
  let p = inregistreaza(null, clipa({ lucrare: 'necunoscuta', legatura: 'alta', fisier: null }), clipa(), T, 'K1C-8578', null);
  const id = `${T - 60_000}|placa_PLA_18m0s.gcode`;
  assert.deepEqual(p.scrie, {
    v: 1, id, fisier: 'placa_PLA_18m0s.gcode', imprimanta: 'K1C-8578', inceput: T - 60_000, sfarsit: null, rezultat: null, durata: 60, filament: 100,
    progres: 10, estimare: null, material: null, piese: null,
  });
  assert.equal(p.cur, p.scrie);
  // Cât lucrează: cifrele cresc, fără scriere.
  p = inregistreaza(p.cur, clipa(), clipa({ trecut: 120, filament: 300, progres: 40 }), T + 60_000, 'K1C-8578', null);
  assert.equal(p.scrie, null);
  assert.deepEqual([p.cur?.durata, p.cur?.filament, p.cur?.progres], [120, 300, 40]);
  // Fișierul ținut (citit mai târziu): estimarea, materialul și piesele intră o dată, scrise.
  const din: DinFisier = { estimare: 1080, material: 'PLA', piese: ['Plăcuța A'] };
  p = inregistreaza(p.cur, clipa({ trecut: 120 }), clipa({ trecut: 125 }), T + 65_000, 'K1C-8578', din);
  assert.deepEqual([p.scrie?.estimare, p.scrie?.material, p.scrie?.piese, p.scrie?.id], [1080, 'PLA', ['Plăcuța A'], id]);
  p = inregistreaza(p.cur, clipa({ trecut: 125 }), clipa({ trecut: 130 }), T + 70_000, 'K1C-8578', din);
  assert.equal(p.scrie, null, 'o singură dată');
  // Legătura pierdută și refăcută la mijloc: aceeași lucrare, fără una nouă.
  p = inregistreaza(p.cur, clipa({ trecut: 130 }), clipa({ legatura: 'pierduta', trecut: 130 }), T + 80_000, 'K1C-8578', din);
  assert.equal(p.scrie, null);
  p = inregistreaza(p.cur, clipa({ legatura: 'pierduta', trecut: 130 }), clipa({ trecut: 400 }), T + 400_000, 'K1C-8578', din);
  assert.deepEqual([p.scrie, p.cur?.id, p.cur?.durata], [null, id, 400]);
  // Finalul (`state` 2): durata și filamentul de dinaintea lui, chiar dacă imprimanta le pune pe 0.
  p = inregistreaza(p.cur, clipa({ trecut: 1140, filament: 3712 }), clipa({ lucrare: 'gata', trecut: 0, filament: 0, progres: 100 }), T + 1_200_000, 'K1C-8578', din);
  assert.equal(p.cur, null);
  assert.deepEqual([p.scrie?.rezultat, p.scrie?.sfarsit, p.scrie?.durata, p.scrie?.filament, p.scrie?.progres, p.scrie?.id], ['gata', T + 1_200_000, 1140, 3712, 100, id]);
});

test('3.6t: înregistrarea: oprirea ține procentul; nimic fără o lucrare; alt fișier e altă lucrare', () => {
  let p = inregistreaza(null, null, clipa({ progres: 38, trecut: 600 }), T, null, null);
  assert.ok(p.scrie !== null);
  p = inregistreaza(p.cur, clipa({ progres: 38, trecut: 600 }), clipa({ lucrare: 'oprita', progres: 0, trecut: 0 }), T + 1000, null, null);
  assert.deepEqual([p.scrie?.rezultat, p.scrie?.progres, p.scrie?.durata, p.cur], ['oprita', 38, 600, null]);
  // O imprimantă liberă sau o legătură care nu e vie nu pornesc nimic.
  for (const b of [clipa({ lucrare: 'libera' }), clipa({ legatura: 'alta' }), clipa({ fisier: null })]) assert.deepEqual(inregistreaza(null, null, b, T, null, null), { cur: null, scrie: null });
  // Alt fișier: o înregistrare nouă (cea veche rămâne cum a fost scrisă).
  const a = inregistreaza(null, null, clipa(), T, null, null).cur;
  const b = inregistreaza(a, clipa(), clipa({ fisier: `${DIR_GCODE}cub.gcode`, trecut: 5 }), T + 10_000, null, null);
  assert.deepEqual([b.scrie?.fisier, b.scrie?.inceput], ['cub.gcode', T + 5000]);
  // Finalul altui fișier nu încheie lucrarea urmărită.
  const c = inregistreaza(a, clipa({ fisier: `${DIR_GCODE}cub.gcode` }), clipa({ fisier: `${DIR_GCODE}cub.gcode`, lucrare: 'gata' }), T + 20_000, null, null);
  assert.equal(c.scrie, null);
});

const rec = (x: Partial<ImprimareCvs2>): ImprimareCvs2 => ({
  v: 1, id: 'a', fisier: 'a.gcode', imprimanta: 'K1C-8578', inceput: 1_000_000, sfarsit: null, rezultat: null, durata: null, filament: null, progres: null,
  estimare: null, material: null, piese: null, ...x,
});

test('3.6t: istoricul cvs2 ținut: aceeași cheie se înlocuiește; aceeași lucrare văzută din nou se contopește; cel mult 500, cele mai noi', () => {
  const a = rec({ durata: 100, estimare: 900, material: 'PLA', piese: ['A'] });
  let { lista, nou } = cuImprimare([], a);
  assert.deepEqual([lista, nou], [[a], a]);
  ({ lista } = cuImprimare(lista, { ...a, durata: 200 }));
  assert.deepEqual(lista.map((x) => x.durata), [200]);
  // Aceeași lucrare, altă cheie (fereastra redeschisă la mijloc): cheia și începutul vechi, cifrele cele mai mari, ce știa cvs2 rămâne.
  ({ lista, nou } = cuImprimare(lista, rec({ id: 'b', inceput: 1_120_000, durata: 150, filament: 50, sfarsit: 2_000_000, rezultat: 'gata' })));
  assert.equal(lista.length, 1);
  assert.deepEqual([nou.id, nou.inceput, nou.durata, nou.filament, nou.rezultat, nou.sfarsit, nou.estimare, nou.material, nou.piese], ['a', 1_000_000, 200, 50, 'gata', 2_000_000, 900, 'PLA', ['A']]);
  // Una încheiată nu se mai contopește; alt fișier, altă imprimantă sau un început departe sunt altele.
  ({ lista } = cuImprimare(lista, rec({ id: 'c', inceput: 1_060_000 })));
  assert.equal(lista.length, 2);
  for (const x of [rec({ id: 'd', fisier: 'b.gcode', inceput: 1_060_000 }), rec({ id: 'e', imprimanta: 'K1C-0001', inceput: 1_060_000 }), rec({ id: 'f', inceput: 1_060_000 + TOLERANTA_MS + 1 })]) {
    ({ lista } = cuImprimare(lista, x));
  }
  assert.deepEqual(lista.map((x) => x.id), ['f', 'c', 'd', 'e', 'a']);
  // Plafonul: cele mai noi 500; una mai veche decât toate nu intră.
  const multe = Array.from({ length: MAX_IMPRIMARI }, (_, k) => rec({ id: `m${k}`, fisier: `m${k}.gcode`, inceput: 10_000_000 + k, sfarsit: 1 }));
  const plin = cuImprimare(multe, rec({ id: 'nou', fisier: 'n.gcode', inceput: 20_000_000 })).lista;
  assert.deepEqual([plin.length, plin[0]?.id, plin.some((x) => x.id === 'm0')], [MAX_IMPRIMARI, 'nou', false]);
  assert.equal(cuImprimare(multe, rec({ id: 'vechi', fisier: 'v.gcode', inceput: 1 })).lista.some((x) => x.id === 'vechi'), false);
  // O înregistrare citită: doar cu forma bună.
  assert.deepEqual(imprimareCvs2(a), a);
  const rele: unknown[] = [
    null, 'a', { ...a, v: 2 }, { ...a, id: 1 }, { ...a, inceput: Number.NaN }, { ...a, rezultat: 'altceva' }, { ...a, piese: ['A', 1] }, { ...a, durata: '5' },
    { ...a, imprimanta: 3 }, { ...a, material: false },
  ];
  for (const x of rele) assert.equal(imprimareCvs2(x), null, JSON.stringify(x));
});

test('3.6t: cele două istorice unite: perechile după fișier, imprimantă și început (cele mai apropiate, câte una); imprimanta înaintea ferestrei', () => {
  const I = 1_761_305_276_000;
  const imp: ImprimareIstoric[] = [
    { fisier: '3DBenchy_PLA_19m.gcode', inceput: I, durata: 1140, filament: 3712.4, rezultat: 'gata' },
    { fisier: 'placa_PLA_18m0s.gcode', inceput: I + 3_600_000, durata: 1100, filament: 3000, rezultat: 'gata' },
    { fisier: 'placa_PLA_18m0s.gcode', inceput: I + 7_200_000, durata: 600, filament: 1500, rezultat: 'oprita' },
  ];
  const placa = { fisier: 'placa_PLA_18m0s.gcode', estimare: 1080, material: 'PLA', piese: ['Plăcuța A'] };
  const cvs2 = [
    rec({ id: 'x', ...placa, inceput: I + 7_230_000, durata: 590, filament: 1490, progres: 38, rezultat: 'oprita' }),
    rec({ id: 'y', ...placa, inceput: I + 3_580_000 }),
    rec({ id: 'z', fisier: 'cub_PETG_14m0s.gcode', inceput: I + 9_000_000, durata: 840, filament: 2900, rezultat: 'gata', estimare: 800, material: 'PETG', piese: ['Cub'] }),
  ];
  const lista = [{ nume: '3DBenchy_PLA_19m.gcode', cale: '', timp: 1140, material: null, marime: 1 }];
  const r = uneste(imp, cvs2, 'K1C-8578', lista);
  assert.deepEqual(r.map((x) => [x.fisier, x.inceput, x.rezultat, x.durata, x.filament, x.estimare, x.material, x.dinCvs2, x.progres, x.piese, x.imprimanta]), [
    ['cub_PETG_14m0s.gcode', I + 9_000_000, 'gata', 840, 2900, 800, 'PETG', true, null, ['Cub'], 'K1C-8578'],
    ['placa_PLA_18m0s.gcode', I + 7_230_000, 'oprita', 600, 1500, 1080, 'PLA', true, 38, ['Plăcuța A'], 'K1C-8578'],
    ['placa_PLA_18m0s.gcode', I + 3_580_000, 'gata', 1100, 3000, 1080, 'PLA', true, null, ['Plăcuța A'], 'K1C-8578'],
    ['3DBenchy_PLA_19m.gcode', I, 'gata', 1140, 3712.4, 1140, 'PLA', false, null, null, 'K1C-8578'],
  ]);
  // Fără istoricul imprimantei: doar cel al cvs2.
  assert.deepEqual(uneste(null, cvs2, null, null).map((x) => x.inceput), [I + 9_000_000, I + 7_230_000, I + 3_580_000]);
  // Cea mai apropiată, câte una: două ale cvs2 lângă una a imprimantei; a doua rămâne singură.
  const doua = uneste([imp[1]!], [rec({ id: 'p', ...placa, inceput: I + 3_660_000 }), rec({ id: 'q', ...placa, inceput: I + 3_590_000 })], 'K1C-8578', null);
  assert.deepEqual(doua.map((x) => [x.inceput, x.durata]), [[I + 3_660_000, null], [I + 3_590_000, 1100]]);
  // Altă imprimantă sau un început departe: fără pereche.
  for (const y of [rec({ ...placa, imprimanta: 'K1C-0001', inceput: I + 3_600_000 }), rec({ ...placa, inceput: I + 3_600_000 + TOLERANTA_MS + 1 })]) {
    assert.equal(uneste([imp[1]!], [y], 'K1C-8578', null).length, 2);
  }
  // O înregistrare fără imprimantă se potrivește cu oricare.
  assert.equal(uneste([imp[1]!], [rec({ ...placa, imprimanta: null, inceput: I + 3_600_000 })], 'K1C-8578', null).length, 1);
  // Văzută de fereastră, dar nefeliată în cvs2 (fără estimare): nu e „din cvs2” și nu învață.
  assert.equal(uneste(null, [rec({})], null, null)[0]?.dinCvs2, false);
});

test('3.6t: gramele (densitatea din lista felierului) și materialul: după nume, după fel sau din numele fișierului', () => {
  assert.ok(Math.abs((grame(3712.4, 'PLA') ?? 0) - 11.07) < 0.01, 'Benchy-ul owner-ului');
  assert.ok(Math.abs((grame(1000, 'PETG') ?? 0) - 3.054) < 0.001);
  assert.deepEqual([grame(3712.4, null), grame(null, 'PLA'), grame(1000, 'nailon')], [null, null, null]);
  assert.deepEqual([materialDupa('pla high speed')?.id, materialDupa(' PETG ')?.id, materialDupa('pla')?.id, materialDupa(null)], ['pla-hs', 'petg', 'pla', null]);
  assert.equal(materialDinNume('3DBenchy_PLA_19m.gcode')?.tip, 'PLA');
  assert.equal(materialDinNume('Delta filament barrel base_Hyper PLA_49m.gcode')?.tip, 'PLA');
  assert.equal(materialDinNume('Suport_PC_PETG_1h2m0s.gcode')?.tip, 'PETG', 'cel de lângă timp');
  assert.deepEqual([materialDinNume('PLA.gcode'), materialDinNume('PLA_10m.gcode'), materialDinNume('fara_material_10m.gcode')], [null, null, null]);
});

test('3.6t: costul: doar cu prețul pe kg al materialului (după fel); curentul doar cu puterea și prețul kWh', () => {
  const r = { durata: 3600, filament: 3712.4, material: 'PLA High Speed' };
  const g = grame(3712.4, 'PLA') ?? 0;
  assert.equal(cost(r, SETARI_ISTORIC), null, 'fără preț, nimic ghicit');
  const s = { ...SETARI_ISTORIC, preturi: { PLA: 110 } };
  assert.ok(Math.abs((cost(r, s) ?? 0) - (g / 1000) * 110) < 1e-9);
  assert.ok(Math.abs((cost(r, { ...s, putere: 150 }) ?? 0) - (g / 1000) * 110) < 1e-9, 'fără prețul kWh, fără curent');
  assert.ok(Math.abs((cost(r, { ...s, putere: 150, kwh: 1.2 }) ?? 0) - ((g / 1000) * 110 + 0.15 * 1.2)) < 1e-9);
  assert.deepEqual([cost({ ...r, material: 'PETG' }, s), cost({ ...r, filament: null }, s), cost({ ...r, material: null }, s)], [null, null, null]);
  assert.deepEqual([pretKg(s, 'pla'), pretKg(s, 'PLA Silk'), pretKg(s, 'PETG'), pretKg(s, null)], [110, 110, null, null]);
});

const rand = (x: Partial<RandIstoric>): RandIstoric => ({
  inceput: T, fisier: 'a.gcode', imprimanta: 'K1C-8578', piese: null, rezultat: 'gata', durata: 600, progres: null, estimare: null, filament: 1000,
  material: 'PLA', dinCvs2: false, ...x,
});

test('3.6t: totalurile lunii: imprimările lunii (ceasul local), timpul, gramele și costul știute', () => {
  const acum = new Date(2026, 10, 13, 18, 0);
  const azi = acum.getTime();
  const r = [rand({ inceput: azi }), rand({ inceput: azi, material: null }), rand({ inceput: new Date(2026, 9, 31, 23, 59).getTime() }), rand({ inceput: azi, durata: null, filament: null })];
  const g = grame(1000, 'PLA') ?? 0;
  const t = totaluriLuna(r, { ...SETARI_ISTORIC, preturi: { PLA: 100 } }, acum);
  assert.deepEqual([t.n, t.secunde], [3, 1200]);
  assert.ok(Math.abs(t.grame - g) < 1e-9);
  assert.ok(Math.abs((t.cost ?? 0) - g / 10) < 1e-9);
  assert.equal(totaluriLuna(r, SETARI_ISTORIC, acum).cost, null);
  assert.deepEqual(totaluriLuna([], SETARI_ISTORIC, acum), { n: 0, secunde: 0, grame: 0, cost: null });
});

test('3.6t: CSV-ul: antetul, separatorul și virgula zecimală ale limbii, ghilimelele, fără formule', () => {
  const r = [rand({
    inceput: new Date(2026, 10, 11, 18, 2).getTime(), fisier: '=HYPERLINK("x");a.gcode', piese: ['Plăcuța "A"', 'B'], durata: 1140, estimare: 1080, filament: 3712.4, dinCvs2: true,
  }), rand({ inceput: new Date(2026, 10, 10, 9, 5).getTime(), fisier: 'b.gcode', imprimanta: null, rezultat: null, durata: null, filament: null, material: null })];
  const s = { ...SETARI_ISTORIC, preturi: { PLA: 110 } };
  const antet = ['Data', 'Fișierul', 'Piesele', 'Imprimanta', 'Rezultatul', 'Durata', 'Estimarea', 'Filamentul', 'Grame', 'Materialul', 'Costul'];
  const ro = csvIstoric(r, s, { antet, sep: ';', zecimala: ',', rezultat: (x) => `r:${x}` }).split('\r\n');
  assert.deepEqual(ro, [
    antet.join(';'),
    `2026-11-11 18:02;"'=HYPERLINK(""x"");a.gcode";"Plăcuța ""A"", B";K1C-8578;r:gata;19,0;18,0;3,71;11,1;PLA;1,22`,
    '2026-11-10 09:05;b.gcode;;;;;;;;;',
    '',
  ]);
  const en = csvIstoric(r.slice(0, 1), s, { antet: ['a,b', '+c'], sep: ',', zecimala: '.', rezultat: (x) => x }).split('\r\n');
  assert.deepEqual(en, ['"a,b",\'+c', `2026-11-11 18:02,"'=HYPERLINK(""x"");a.gcode","Plăcuța ""A"", B",K1C-8578,gata,19.0,18.0,3.71,11.1,PLA,1.22`, '']);
});

test('3.6t: estimarea care învață: mediana ultimelor (cel mult 10) imprimări duse la capăt, feliate în cvs2, pe aceeași imprimantă și material; cel puțin 3', () => {
  const ok = (k: number, durata: number, x: Partial<RandIstoric> = {}): RandIstoric => rand({ inceput: k * 1000, durata, estimare: 1000, dinCvs2: true, ...x });
  const r = [ok(1, 1100), ok(2, 1200)];
  assert.equal(invatat(r, 'K1C-8578', 'PLA'), null, 'sub 3');
  r.push(ok(3, 1150));
  assert.deepEqual(invatat(r, 'K1C-8578', 'PLA'), { raport: 1.15, n: 3 });
  // Nu intră: oprită, alt material, altă imprimantă, nefeliată în cvs2, fără estimare, un raport absurd.
  const altele = [
    ok(4, 3000, { rezultat: 'oprita' }), ok(5, 3000, { material: 'PETG' }), ok(6, 3000, { imprimanta: 'K1C-0001' }), ok(7, 3000, { dinCvs2: false }),
    ok(8, 3000, { estimare: null }), ok(9, 6000), ok(10, 100),
  ];
  assert.deepEqual(invatat([...r, ...altele], 'K1C-8578', 'PLA'), { raport: 1.15, n: 3 });
  // Cu patru, media celor două din mijloc.
  const patru = invatat([...r, ok(11, 1300)], 'K1C-8578', 'PLA');
  assert.ok(patru !== null && Math.abs(patru.raport - 1.175) < 1e-12 && patru.n === 4);
  // Doar ultimele 10, după început.
  const multe = [...Array.from({ length: 10 }, (_, k) => ok(100 + k, 2000)), ...Array.from({ length: 5 }, (_, k) => ok(k, 1000))];
  assert.deepEqual(invatat(multe, 'K1C-8578', 'PLA'), { raport: 2, n: 10 });
  assert.equal(invatat(r, null, 'PLA'), null, 'fără imprimantă');
});

test('3.6t: setările istoricului: implicitul (fără prețuri, corectarea pornită); valorile stricate și materialele necunoscute se sar', () => {
  const dep = (text: string | null): { getItem: () => string | null; setItem: () => void } => ({ getItem: () => text, setItem: () => undefined });
  assert.deepEqual(SETARI_ISTORIC, { preturi: {}, putere: null, kwh: null, corecteaza: true });
  assert.deepEqual(citesteSetariIstoric(dep(null)), SETARI_ISTORIC);
  assert.deepEqual(citesteSetariIstoric(dep('{"v":2,"corecteaza":false}')), SETARI_ISTORIC);
  assert.deepEqual(citesteSetariIstoric(dep('nu e json')), SETARI_ISTORIC);
  assert.deepEqual(
    citesteSetariIstoric(dep('{"v":1,"preturi":{"PLA":110,"PETG":-1,"Lemn":50,"ABS":"90","__proto__":5,"TPU":100001},"putere":150,"kwh":1e9,"corecteaza":false}')),
    { preturi: { PLA: 110 }, putere: 150, kwh: null, corecteaza: false },
  );
  let tinut: string | null = null;
  const d = { getItem: () => tinut, setItem: (_: string, v: string) => { tinut = v; } };
  const s = { preturi: { PETG: 95.5 }, putere: null, kwh: 1.2, corecteaza: true };
  scrieSetariIstoric(s, d);
  assert.deepEqual(citesteSetariIstoric(d), s);
});
