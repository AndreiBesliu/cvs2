/**
 * Valorile frezei pe material (ADR 0305 §1–§2, felia 16.A↑g-1): câmpul `materiale` (cel mult 16 seturi, fiecare cu numele
 * materialului și cele cinci valori de lucru, în marginile de azi), judecat set cu set și câmp cu câmp; potrivirea cu eticheta
 * foii pe cuvinte (fără majuscule și diacritice, toate cuvintele setului în etichetă, cel mai lung câștigă, la egalitate
 * primul); JSON-ul le poartă dus-întors, iar un import fără ele (CSV-ul) peste o freză cu seturi le păstrează pe ale ei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cuFreza, cuImport, cuvinteMaterial, frezaDinDate, frezaImportata, MARGINI_FREZA, problemaMateriale, problemeFreza, setPentru,
  valoriPeMaterial, type Freza, type FrezaSalvata, type SetMaterial,
} from '../../src/model/freza.ts';
import { PLAFON } from '../../src/model/document.ts';
import { imbina, jsonCanonic } from '../../src/model/frezeSincron.ts';
import { citesteFisierFreze, textFisierFreze } from '../../src/io/frezeFisier.ts';
import { OCTETI_FREZA } from '../../shared/freze.ts';

const LUCRU = { turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40 } as const;
const MDF: SetMaterial = { material: 'MDF', turatie: 20000, avans: 2500, plonjare: 600, pas: 4, pasLateral: 45 };
const ACRIL: SetMaterial = { material: 'Acril', turatie: 16000, avans: 900, plonjare: 250, pas: 1, pasLateral: 30 };
const PLATA: Freza = { nume: 'Plată Ø6', fel: 'plata', diametru: 6, numar: 2, ...LUCRU, materiale: [MDF, ACRIL] };
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const salvata = (f: Freza, id: string): FrezaSalvata => ({ ...f, id, rev: 1, schimbatLa: 1_000 });

test('cuvintele unui material: fără majuscule și diacritice, despărțite de orice nu e literă sau cifră', () => {
  assert.deepEqual(cuvinteMaterial('MDF alb 18'), ['mdf', 'alb', '18']);
  assert.deepEqual(cuvinteMaterial('  Plăcaj-Mesteacăn  '), ['placaj', 'mesteacan']);
  assert.deepEqual(cuvinteMaterial('Ștejar/țară'), ['stejar', 'tara']);
  assert.deepEqual(cuvinteMaterial('—  .'), []);
  assert.deepEqual(cuvinteMaterial('ACRIL3mm'), ['acril3mm']);
});

test('o freză cu seturi bune n-are probleme; fără seturi, ca azi', () => {
  assert.deepEqual(problemeFreza(PLATA), {});
  assert.equal(problemaMateriale(PLATA.materiale), null);
  const { materiale: _m, ...fara } = PLATA;
  void _m;
  assert.deepEqual(problemeFreza(fara), {});
  // Exact la margini: 16 seturi, numele de 40 de caractere, valorile la plafon.
  const multe: SetMaterial[] = Array.from({ length: MARGINI_FREZA.materiale }, (_, i) => ({ ...MDF, material: `m${i}` }));
  assert.equal(MARGINI_FREZA.materiale, 16);
  assert.equal(problemaMateriale(multe), null);
  const lung: SetMaterial = { material: 'ă'.repeat(MARGINI_FREZA.material), turatie: PLAFON.regimFreza, avans: PLAFON.regimFreza, plonjare: PLAFON.regimFreza, pas: PLAFON.adancimeOperatie, pasLateral: 50 };
  assert.equal(problemaMateriale([lung]), null);
});

test('fiecare greșeală a seturilor are motivul ei, setul și câmpul la care e', () => {
  assert.deepEqual(problemaMateriale('MDF'), { motiv: 'lipsa', set: null, camp: null });
  assert.deepEqual(problemaMateriale(Array.from({ length: 17 }, (_, i) => ({ ...MDF, material: `m${i}` }))), { motiv: 'materiale-multe', set: null, camp: null });
  assert.deepEqual(problemaMateriale([MDF, 'acril']), { motiv: 'lipsa', set: 1, camp: null });
  assert.deepEqual(problemaMateriale([{ ...MDF, material: 3 }]), { motiv: 'material-gol', set: 0, camp: 'material' });
  assert.deepEqual(problemaMateriale([{ ...MDF, material: ' — ' }]), { motiv: 'material-gol', set: 0, camp: 'material' });
  assert.deepEqual(problemaMateriale([{ ...MDF, material: 'x'.repeat(41) }]), { motiv: 'material-lung', set: 0, camp: 'material' });
  assert.deepEqual(problemaMateriale([{ ...MDF, material: 'MDF\u0007' }]), { motiv: 'material-caractere', set: 0, camp: 'material' });
  // Același set fără majuscule, diacritice și ordinea cuvintelor: „alb mdf” e „MDF alb” (se potrivesc cu aceleași foi).
  assert.deepEqual(problemaMateriale([{ ...MDF, material: 'MDF alb' }, ACRIL, { ...MDF, material: 'alb  MDF' }]), { motiv: 'material-folosit', set: 2, camp: 'material' });
  assert.deepEqual(problemaMateriale([{ ...ACRIL, material: 'Plăcaj' }, { ...ACRIL, material: 'PLACAJ' }]), { motiv: 'material-folosit', set: 1, camp: 'material' });
  assert.deepEqual(problemaMateriale([{ ...MDF, turatie: 0 }]), { motiv: 'margini', set: 0, camp: 'turatie' });
  assert.deepEqual(problemaMateriale([{ ...MDF, turatie: 1000.5 }]), { motiv: 'intreg', set: 0, camp: 'turatie' });
  assert.deepEqual(problemaMateriale([ACRIL, { ...MDF, avans: PLAFON.regimFreza + 1 }]), { motiv: 'margini', set: 1, camp: 'avans' });
  assert.deepEqual(problemaMateriale([{ ...MDF, plonjare: Number.NaN }]), { motiv: 'lipsa', set: 0, camp: 'plonjare' });
  assert.deepEqual(problemaMateriale([{ ...MDF, pas: -1 }]), { motiv: 'margini', set: 0, camp: 'pas' });
  assert.deepEqual(problemaMateriale([{ ...MDF, pasLateral: 51 }]), { motiv: 'margini', set: 0, camp: 'pasLateral' });
  const { avans: _a, ...faraAvans } = MDF;
  void _a;
  assert.deepEqual(problemaMateriale([faraAvans]), { motiv: 'lipsa', set: 0, camp: 'avans' });
  // În freză, câmpul `materiale` primește motivul primei greșeli.
  assert.deepEqual(problemeFreza({ ...PLATA, materiale: [{ ...MDF, pas: 0 }] }), { materiale: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA, materiale: [MDF, { ...MDF }] }), { materiale: 'material-folosit' });
});

test('potrivirea cu eticheta foii: toate cuvintele setului în etichetă, cel mai lung câștigă, la egalitate primul', () => {
  const f: Freza = {
    ...PLATA,
    materiale: [MDF, { ...MDF, material: 'MDF alb', turatie: 21000 }, { ...ACRIL, material: 'Lemn tare' }, { ...ACRIL, material: 'Alb', turatie: 15000 }],
  };
  assert.equal(setPentru(f, null), null);
  assert.equal(setPentru(f, '   '), null);
  assert.equal(setPentru(f, 'Placaj 18'), null);
  assert.equal(setPentru(f, 'mdf 16')?.material, 'MDF');
  assert.equal(setPentru(f, 'MDF alb 18')?.material, 'MDF alb');
  assert.equal(setPentru(f, 'alb, MDF')?.material, 'MDF alb');
  // „Lemn tare” cere ambele cuvinte; „lemn moale” n-are „tare”.
  assert.equal(setPentru(f, 'Lemn tare stejar')?.material, 'Lemn tare');
  assert.equal(setPentru(f, 'lemn moale'), null);
  // Cuvinte întregi: „MDFX” nu e „MDF”.
  assert.equal(setPentru(f, 'MDFX alb')?.material, 'Alb');
  // La egalitate (un cuvânt fiecare), primul din listă.
  const g: Freza = { ...PLATA, materiale: [{ ...ACRIL, material: 'Alb' }, MDF] };
  assert.equal(setPentru(g, 'MDF alb')?.material, 'Alb');
  // Fără seturi, nimic.
  assert.equal(setPentru({ ...PLATA, materiale: undefined }, 'MDF'), null);
  // Diacriticele și majusculele nu contează, nici pe set, nici pe etichetă.
  const h: Freza = { ...PLATA, materiale: [{ ...ACRIL, material: 'Plăcaj' }] };
  assert.equal(setPentru(h, 'PLACAJ mesteacăn')?.material, 'Plăcaj');
});

test('valorile frezei pe material: setul potrivit înlocuiește cele cinci valori; altfel freza rămâne', () => {
  const r = valoriPeMaterial(PLATA, 'MDF alb 18');
  assert.equal(r.set, 'MDF');
  assert.deepEqual(
    { turatie: r.freza.turatie, avans: r.freza.avans, plonjare: r.freza.plonjare, pas: r.freza.pas, pasLateral: r.freza.pasLateral },
    { turatie: 20000, avans: 2500, plonjare: 600, pas: 4, pasLateral: 45 },
  );
  // Restul frezei rămâne (numele, diametrul, T-ul, seturile).
  assert.equal(r.freza.nume, 'Plată Ø6');
  assert.equal(r.freza.numar, 2);
  assert.deepEqual(r.freza.materiale, PLATA.materiale);
  const s = valoriPeMaterial(PLATA, null);
  assert.equal(s.set, null);
  assert.equal(s.freza, PLATA);
  assert.equal(valoriPeMaterial(PLATA, 'Placaj').freza, PLATA);
  // O freză salvată rămâne salvată (id-ul și versiunea trec).
  const salv = salvata(PLATA, 'f1');
  assert.equal(valoriPeMaterial(salv, 'acril').freza.id, 'f1');
  assert.equal(valoriPeMaterial(salv, 'acril').freza.turatie, 16000);
});

test('salvarea: numele seturilor curățate la capete, lista goală pleacă, câmpurile necunoscute ale unui set rămân', () => {
  const r = cuFreza([], null, { ...PLATA, materiale: [{ ...MDF, material: '  MDF   alb  ', fz: 0.05 } as SetMaterial, ACRIL] }, () => 'f1', 5);
  assert.ok(r.ok);
  const s = r.lista[0]!;
  assert.equal(s.materiale![0]!.material, 'MDF alb');
  assert.equal((s.materiale![0] as unknown as Record<string, unknown>)['fz'], 0.05);
  assert.equal(frezaDinDate(s)?.id, 'f1');
  const goala = cuFreza(r.lista, 'f1', { ...s, materiale: [] }, () => 'x', 6);
  assert.ok(goala.ok);
  assert.equal('materiale' in goala.lista[0]!, false);
  // O freză cu un set greșit nu se salvează.
  const rea = cuFreza([], null, { ...PLATA, materiale: [{ ...MDF, pas: 0 }] }, () => 'f2', 5);
  assert.equal(rea.ok, false);
});

test('fișierul: JSON-ul poartă seturile dus-întors; un set greșit sare freza; CSV-ul nu le are', () => {
  const text = textFisierFreze([salvata(PLATA, 'f1')]);
  const c = citesteFisierFreze(enc(text));
  assert.ok(c.ok && c.fel === 'json');
  assert.deepEqual(c.freze[0]!.materiale, PLATA.materiale);
  assert.equal(frezaImportata({ ...PLATA, materiale: [{ ...MDF, avans: 'mult' }] }), null);
  assert.equal(frezaImportata({ ...PLATA, materiale: 'MDF' }), null);
  const csv = citesteFisierFreze(enc('nume;fel;diametru;numar;turatie;avans;plonjare;pas;pas_lateral\nPlată Ø6;plata;6;2;17000;1200;300;3;40\n'));
  assert.ok(csv.ok && csv.fel === 'csv');
  assert.equal('materiale' in csv.freze[0]!, false);
});

test('importul: peste o freză cu seturi, un fișier fără ele (CSV-ul) le păstrează; unul cu ele le înlocuiește', () => {
  const lista = [salvata(PLATA, 'f1')];
  const dinCsv: Freza = { nume: 'Plată Ø6', fel: 'plata', diametru: 6, numar: 2, turatie: 17000, avans: 1200, plonjare: 300, pas: 3, pasLateral: 40 };
  const r = cuImport(lista, [dinCsv], 'inlocuieste', () => 'x', 7);
  assert.ok(r.ok);
  assert.equal(r.lista[0]!.id, 'f1');
  assert.equal(r.lista[0]!.turatie, 17000);
  assert.deepEqual(r.lista[0]!.materiale, PLATA.materiale);
  // Un JSON cu seturile lui le pune pe ale lui.
  const j = cuImport(lista, [{ ...dinCsv, materiale: [ACRIL] }], 'inlocuieste', () => 'x', 7);
  assert.ok(j.ok);
  assert.deepEqual(j.lista[0]!.materiale, [ACRIL]);
  // O freză nouă n-are de unde păstra nimic.
  const nou = cuImport(lista, [{ ...dinCsv, nume: 'Plată Ø8', diametru: 8 }], 'inlocuieste', () => 'f2', 7);
  assert.ok(nou.ok);
  assert.equal('materiale' in nou.lista[1]!, false);
});

test('contul: seturile sunt un câmp ca oricare; schimbate pe un calculator, se îmbină cu turația schimbată pe celălalt', () => {
  const baza = { ...salvata(PLATA, 'f1') };
  const mea = { ...baza, rev: 2, materiale: [MDF] };
  const cont = { ...baza, rev: 2, turatie: 17000 };
  const r = imbina(baza, mea, cont);
  assert.ok(r.ok);
  assert.deepEqual((r.rezultat as Freza).materiale, [MDF]);
  assert.equal((r.rezultat as Freza).turatie, 17000);
  // Lista schimbată pe ambele întreabă o dată, pentru tot câmpul.
  const r2 = imbina(baza, mea, { ...baza, rev: 2, materiale: [ACRIL] });
  assert.equal(r2.ok, false);
  assert.deepEqual(r2.ok ? null : r2.campuri, ['materiale']);
});

test('cea mai mare freză desenată, cu 16 seturi la margine, încape în cont (`OCTETI_FREZA`)', () => {
  const n = PLAFON.puncteProfil;
  const puncte: Array<[number, number]> = Array.from({ length: n }, (_, i) => [i === n - 1 ? 50 : 49.9999 * (i / (n - 1)) + 0.0000123, i === 0 ? 0 : 999.9999 - (n - 1 - i) * 0.00011]);
  puncte[0] = [0, 0];
  const seturi: SetMaterial[] = Array.from({ length: MARGINI_FREZA.materiale }, (_, i) => ({
    material: `${'ș'.repeat(MARGINI_FREZA.material - 3)}${String(i).padStart(3, '0')}`,
    turatie: 99999, avans: 99999.99, plonjare: 99999.99, pas: 999.99, pasLateral: 49.99,
  }));
  const f: Freza = {
    nume: 'x'.repeat(MARGINI_FREZA.nume), fel: 'desenata', nota: 'ă'.repeat(MARGINI_FREZA.nota), grup: 'ș'.repeat(MARGINI_FREZA.grup),
    diametru: 100, puncte, tais: 1000, taisuri: 12, numar: 999, turatie: 99999, avans: 99999.99, plonjare: 99999.99, pas: 999.99, pasLateral: 49.99,
    materiale: seturi,
  };
  const r = cuFreza([], null, f, () => 'id-de-64-' + 'z'.repeat(55), Date.UTC(2099, 0, 1));
  assert.ok(r.ok, JSON.stringify(r.ok ? null : r.probleme));
  const octeti = new TextEncoder().encode(jsonCanonic(r.lista[0])).length;
  assert.ok(octeti <= OCTETI_FREZA, `${octeti} > ${OCTETI_FREZA}`);
});
