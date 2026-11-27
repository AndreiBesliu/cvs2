/**
 * Freza din biblioteca omului (ADR 0300 §2, felia 16.A↑a), pe hârtie: marginile (aceleași ca ale ușii documentului, ca o freză
 * bună în bibliotecă să treacă și de schema operației), conul frezei în V și al celei de gravare, numele unice fără deosebire
 * de majuscule, câmpurile care nu țin de fel scoase la salvare, câmpurile necunoscute păstrate, frezele de pornire și lista
 * (adăugarea, schimbarea cu versiunea crescută, ștergerea, numele liber la import).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cheieNume, cuFreza, cuFreze, cuGrupRedenumit, cuImport, cuStandard, faraFreza, FELURI_CU_CAM, FELURI_FREZA, FREZE_PORNIRE, ID_PORNIRE, frezaDinDate,
  frezaImportata, grupurileListei,
  inaltimeCon, MARGINI_FREZA, numeLiber,
  problemeFreza, sculaDinFreza, type Freza, type FrezaSalvata,
} from '../../src/model/freza.ts';
import { operatieImplicita, PLAFON, UNGHI_V_MAXIM, UNGHI_V_MINIM, type FormaDoc } from '../../src/model/document.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';
import { esteIdFreza } from '../../shared/freze.ts';

const PLATA6: Freza = {
  nume: 'Plată Ø6', fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2,
  turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40,
};
const V60: Freza = { ...PLATA6, nume: 'V60 Ø6', fel: 'v', unghi: 60, numar: 3, pas: 1.5 };
const GRAVARE: Freza = { ...PLATA6, nume: 'Gravare 30°', fel: 'gravare', diametru: 3.175, unghi: 30, varf: 0.2, numar: 5, pas: 1 };

const salvata = (f: Freza, id: string): FrezaSalvata => ({ ...f, id, rev: 1, schimbatLa: 1_000 });

test('o freză bună n-are probleme: plata, V-ul, gravarea', () => {
  for (const f of [PLATA6, V60, GRAVARE]) assert.deepEqual(problemeFreza(f), {}, f.nume);
});

test('marginile diametrului, ale numărului T și ale valorilor de lucru (ca ale ușii documentului)', () => {
  assert.equal(MARGINI_FREZA.diametru, PLAFON.diametruScula);
  assert.equal(MARGINI_FREZA.numar, PLAFON.numarScula);
  assert.deepEqual(problemeFreza({ ...PLATA6, diametru: 0 }), { diametru: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, diametru: -1 }), { diametru: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, diametru: 100, tais: undefined }), {});
  assert.deepEqual(problemeFreza({ ...PLATA6, diametru: 100.0001 }), { diametru: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, diametru: Number.NaN }), { diametru: 'lipsa' });
  assert.deepEqual(problemeFreza({ ...PLATA6, numar: 0 }), { numar: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, numar: 1000 }), { numar: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, numar: 1.5 }), { numar: 'intreg' });
  assert.deepEqual(problemeFreza({ ...PLATA6, numar: 999 }), {});
  assert.deepEqual(problemeFreza({ ...PLATA6, turatie: 0 }), { turatie: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, turatie: 18000.5 }), { turatie: 'intreg' });
  assert.deepEqual(problemeFreza({ ...PLATA6, turatie: MARGINI_FREZA.turatie + 1 }), { turatie: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, avans: 0, plonjare: -3 }), { avans: 'margini', plonjare: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, pas: 0 }), { pas: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, pas: PLAFON.adancimeOperatie + 1 }), { pas: 'margini' });
  // Pasul lateral e în procente din diametru, cel mult jumătate (buzunarul cere pasul cel mult D / 2, ADR 0069).
  assert.deepEqual(problemeFreza({ ...PLATA6, pasLateral: 50 }), {});
  assert.deepEqual(problemeFreza({ ...PLATA6, pasLateral: 50.5 }), { pasLateral: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, pasLateral: 0 }), { pasLateral: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, taisuri: 0 }), { taisuri: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, taisuri: 2.5 }), { taisuri: 'intreg' });
  assert.deepEqual(problemeFreza({ ...PLATA6, tais: 0 }), { tais: 'margini' });
  assert.deepEqual(problemeFreza({ ...PLATA6, nota: 'x'.repeat(MARGINI_FREZA.nota + 1) }), { nota: 'nota-lunga' });
});

test('unghiul și vârful: ale V-ului și ale gravării, cu marginile ușii', () => {
  assert.deepEqual(problemeFreza({ ...V60, unghi: UNGHI_V_MINIM, tais: undefined }), {});
  assert.deepEqual(problemeFreza({ ...V60, unghi: UNGHI_V_MAXIM, tais: undefined }), {});
  assert.deepEqual(problemeFreza({ ...V60, unghi: 0.5, tais: undefined }), { unghi: 'margini' });
  assert.deepEqual(problemeFreza({ ...V60, unghi: 180, tais: undefined }), { unghi: 'margini' });
  assert.deepEqual(problemeFreza({ ...V60, unghi: undefined, tais: undefined }), { unghi: 'lipsa' });
  // Gravarea cere vârful plat, sub diametru; V-ul e ascuțit (vârful lui nu se citește).
  assert.deepEqual(problemeFreza({ ...GRAVARE, varf: undefined, tais: undefined }), { varf: 'lipsa' });
  assert.deepEqual(problemeFreza({ ...GRAVARE, varf: 0, tais: undefined }), { varf: 'margini' });
  assert.deepEqual(problemeFreza({ ...GRAVARE, varf: 3.175, tais: undefined }), { varf: 'varf' });
  assert.deepEqual(problemeFreza({ ...V60, varf: 99, tais: undefined }), {});
  // La freza plată, unghiul și vârful nu se citesc.
  assert.deepEqual(problemeFreza({ ...PLATA6, unghi: 500, varf: -1 }), {});
});

test('conul, pe hârtie: (R − a)·cot(θ/2); tăișul nu poate fi mai scurt decât el', () => {
  assert.equal(inaltimeCon(PLATA6), 0);
  // V90 Ø12: 6 · cot 45° = 6.
  assert.ok(Math.abs(inaltimeCon({ ...V60, unghi: 90, diametru: 12 }) - 6) < 1e-12);
  // V60 Ø6: 3 · cot 30° = 3·√3 = 5,196152…
  assert.ok(Math.abs(inaltimeCon(V60) - 3 * Math.sqrt(3)) < 1e-12);
  // Gravarea 30° Ø3,175 cu vârful 0,2: (1,5875 − 0,1) · cot 15° = 1,4875 · (2 + √3) = 5,551426…
  assert.ok(Math.abs(inaltimeCon(GRAVARE) - 1.4875 * (2 + Math.sqrt(3))) < 1e-12);
  assert.deepEqual(problemeFreza({ ...V60, tais: 5.19 }), { tais: 'con' });
  assert.deepEqual(problemeFreza({ ...V60, tais: 5.2 }), {});
  assert.deepEqual(problemeFreza({ ...GRAVARE, tais: 5.55 }), { tais: 'con' });
  assert.deepEqual(problemeFreza({ ...GRAVARE, tais: 5.56 }), {});
});

test('numele: gol, prea lung, cu caractere de control, folosit (fără deosebire de majuscule; nu și de propria freză)', () => {
  assert.deepEqual(problemeFreza({ ...PLATA6, nume: '   ' }), { nume: 'nume-gol' });
  assert.deepEqual(problemeFreza({ ...PLATA6, nume: 'ă'.repeat(MARGINI_FREZA.nume) }), {});
  assert.deepEqual(problemeFreza({ ...PLATA6, nume: 'ă'.repeat(MARGINI_FREZA.nume + 1) }), { nume: 'nume-lung' });
  assert.deepEqual(problemeFreza({ ...PLATA6, nume: 'Plată\u0007Ø6' }), { nume: 'nume-caractere' });
  const alte = [salvata(PLATA6, 'a'), salvata(V60, 'b')];
  assert.deepEqual(problemeFreza({ ...GRAVARE, nume: '  PLATĂ ø6 ' }, alte), { nume: 'nume-folosit' });
  assert.deepEqual(problemeFreza({ ...PLATA6, nume: 'plată Ø6' }, alte, 'a'), {});
  assert.equal(cheieNume('  Plată  Ø6 '), cheieNume('PLATĂ Ø6'));
  // Litera compusă (ă din a + breve) e aceeași cu cea precompusă.
  assert.equal(cheieNume('Plată'), cheieNume('Plată'));
});

test('copia pentru document: T-ul, numele, diametrul, forma; trece de schema operației (ușa documentului)', () => {
  assert.deepEqual(sculaDinFreza(PLATA6), { numar: 2, nume: 'Plată Ø6', diametru: 6 });
  assert.deepEqual(sculaDinFreza(V60, 7), { numar: 7, nume: 'V60 Ø6', diametru: 6, forma: { tip: 'v', unghi: 60 } });
  assert.deepEqual(sculaDinFreza(GRAVARE), { numar: 5, nume: 'Gravare 30°', diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.2 } });
  const forma: FormaDoc = { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 };
  for (const f of [PLATA6, V60, GRAVARE, ...FREZE_PORNIRE.map((p, i) => ({ ...p, nume: `F${i}` }))]) {
    assert.ok(operatieInMargini({ ...operatieImplicita('e', forma), scula: sculaDinFreza(f) }), f.nume);
  }
  // Și la marginile frezei: Ø100, T999, unghiul 1° și 179°, numele de 40 de caractere.
  for (const f of [{ ...PLATA6, diametru: 100, numar: 999, nume: 'x'.repeat(40) }, { ...V60, unghi: 1, tais: undefined }, { ...V60, unghi: 179 }]) {
    assert.deepEqual(problemeFreza(f), {});
    assert.ok(operatieInMargini({ ...operatieImplicita('e', forma), scula: sculaDinFreza(f) }), JSON.stringify(f));
  }
});

test('frezele de pornire: șase, cu T 1–6, felurile cerute de ADR, fiecare bună cu orice nume', () => {
  assert.equal(FREZE_PORNIRE.length, 6);
  assert.deepEqual(FREZE_PORNIRE.map((f) => f.numar), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(FREZE_PORNIRE.map((f) => [f.fel, f.diametru, f.unghi ?? null, f.varf ?? null]), [
    ['plata', 3.175, null, null], ['plata', 6, null, null], ['v', 6, 60, null], ['v', 12, 90, null],
    ['gravare', 3.175, 30, 0.2], ['plata', 12, null, null],
  ]);
  for (const f of FREZE_PORNIRE) {
    assert.deepEqual(problemeFreza({ ...f, nume: 'x' }), {});
    // Valorile de lucru de azi ale aplicației (`REGIM_IMPLICIT`), nu dintr-un catalog.
    assert.deepEqual([f.turatie, f.avans, f.plonjare], [18000, 1000, 300]);
  }
});

test('frezele standard: id-uri fixe, unice, bune pentru cont; puse doar cele care lipsesc, cu nume libere, cât încap', () => {
  assert.equal(ID_PORNIRE.length, FREZE_PORNIRE.length);
  assert.equal(new Set(ID_PORNIRE).size, ID_PORNIRE.length);
  for (const id of ID_PORNIRE) assert.ok(esteIdFreza(id), id);
  const standard = FREZE_PORNIRE.map((f, k) => ({ ...f, id: ID_PORNIRE[k]!, nume: `S${k}` }));
  const tot = cuStandard([], standard, 77);
  assert.equal(tot.adaugate, 6);
  assert.deepEqual(tot.lista.map((f) => [f.id, f.nume, f.rev, f.schimbatLa]), ID_PORNIRE.map((id, k) => [id, `S${k}`, 1, 77]));
  // Una e deja (aceeași id, chiar schimbată): rămâne cum e; numele „S2” e al altei freze: cea standard primește „S2 (2)”.
  const schimbata = { ...tot.lista[0]!, avans: 1500, rev: 4 };
  const alta = { ...salvata(PLATA6, 'x'), nume: 'S2' };
  const r = cuStandard([schimbata, alta], standard, 88);
  assert.equal(r.adaugate, 5);
  assert.deepEqual(r.lista[0], schimbata);
  assert.equal(r.lista.find((f) => f.id === ID_PORNIRE[2])?.nume, 'S2 (2)');
  // Peste plafon: câte încap.
  const plina = Array.from({ length: MARGINI_FREZA.freze - 2 }, (_, k) => ({ ...salvata(PLATA6, `p${k}`), nume: `P${k}` }));
  assert.equal(cuStandard(plina, standard, 1).adaugate, 2);
});

test('datele ținute: o freză salvată se citește înapoi, cu câmpurile necunoscute păstrate; una stricată, deloc', () => {
  const s = { ...salvata(V60, 'b'), regimuriPeMaterial: [{ material: 'MDF', avans: 1500 }] };
  const citita = frezaDinDate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(citita, s);
  for (const rau of [null, 1, 'x', [], { ...s, id: '' }, { ...s, rev: 0 }, { ...s, rev: 1.5 }, { ...s, schimbatLa: 'ieri' },
    { ...s, fel: 'necunoscut' }, { ...s, diametru: 0 }, { ...s, nume: 3 }, { ...s, nota: 4 }]) {
    assert.equal(frezaDinDate(rau), null, JSON.stringify(rau));
  }
  // Din fișier vine fără id și fără versiune; un id adus din alt browser nu se ia.
  const f = frezaImportata({ ...V60, id: 'altul', rev: 9, schimbatLa: 5, extra: true });
  assert.deepEqual(f, { ...V60, extra: true });
  assert.equal(frezaImportata({ ...V60, unghi: 0 }), null);
});

test('lista: adăugarea, schimbarea (versiunea crește, câmpurile felului curățate), ștergerea, refuzurile', () => {
  let n = 0;
  const idNou = (): string => `id${++n}`;
  const a = cuFreza([], null, PLATA6, idNou, 100);
  assert.ok(a.ok);
  assert.deepEqual(a.lista, [{ ...PLATA6, id: 'id1', rev: 1, schimbatLa: 100 }]);
  assert.equal(a.id, 'id1');
  // O freză plată nu ține unghiul și vârful, iar V-ul nu ține vârful: se scot la salvare.
  const b = cuFreza(a.lista, null, { ...V60, varf: 0.3 }, idNou, 200);
  assert.ok(b.ok);
  assert.equal('varf' in (b.lista[1] ?? {}), false);
  const c = cuFreza(b.lista, 'id2', { ...V60, fel: 'plata', unghi: 60, nume: 'Plată Ø6 nouă' }, idNou, 300);
  assert.ok(c.ok);
  assert.deepEqual(c.lista[1], { ...PLATA6, nume: 'Plată Ø6 nouă', numar: 3, pas: 1.5, id: 'id2', rev: 2, schimbatLa: 300 });
  // Câmpurile necunoscute ale frezei vechi rămân la schimbare.
  const cuExtra = cuFreza([{ ...salvata(PLATA6, 'x'), extra: 7 }], 'x', { ...PLATA6, avans: 1200 }, idNou, 400);
  assert.ok(cuExtra.ok);
  assert.equal(cuExtra.lista[0]?.['extra'], 7);
  assert.equal(cuExtra.lista[0]?.avans, 1200);
  // Refuzurile: numele folosit, o valoare greșită, o freză care nu mai e, plafonul listei.
  const d = cuFreza(c.lista, null, { ...GRAVARE, nume: 'plată ø6' }, idNou, 500);
  assert.deepEqual(d, { ok: false, probleme: { nume: 'nume-folosit' } });
  assert.deepEqual(cuFreza(c.lista, null, { ...GRAVARE, diametru: 0 }, idNou, 500), { ok: false, probleme: { diametru: 'margini' } });
  assert.deepEqual(cuFreza(c.lista, 'nu-e', GRAVARE, idNou, 500), { ok: false, probleme: { id: 'lipsa' } });
  const plina = Array.from({ length: MARGINI_FREZA.freze }, (_, i) => salvata({ ...PLATA6, nume: `F${i}` }, `f${i}`));
  assert.deepEqual(cuFreza(plina, null, GRAVARE, idNou, 500), { ok: false, probleme: { lista: 'plina' } });
  assert.deepEqual(faraFreza(c.lista, 'id1'), { ok: true, lista: [c.lista[1]] });
  assert.deepEqual(faraFreza(c.lista, 'nu-e'), { ok: false });
});

test('mai multe deodată (pornirea, importul): numele luat primește „(2)”, „(3)”; peste plafon, nimic', () => {
  assert.equal(numeLiber('Plată Ø6', [salvata(PLATA6, 'a')]), 'Plată Ø6 (2)');
  assert.equal(numeLiber('Plată Ø6', [salvata(PLATA6, 'a'), salvata({ ...PLATA6, nume: 'plată ø6 (2)' }, 'b')]), 'Plată Ø6 (3)');
  assert.equal(numeLiber('V60 Ø6', [salvata(PLATA6, 'a')]), 'V60 Ø6');
  // Un nume de 40 de caractere se scurtează ca sufixul să încapă.
  const lung = 'x'.repeat(40);
  const liber = numeLiber(lung, [salvata({ ...PLATA6, nume: lung }, 'a')]);
  assert.equal(liber, `${'x'.repeat(36)} (2)`);
  let n = 0;
  const r = cuFreze([salvata(PLATA6, 'a')], [PLATA6, V60, { ...V60, diametru: 0 }], () => `n${++n}`, 9);
  assert.ok(r.ok);
  assert.deepEqual(r.lista.map((f) => f.nume), ['Plată Ø6', 'Plată Ø6 (2)', 'V60 Ø6']);
  assert.equal(r.adaugate, 2);
  assert.equal(r.sarite, 1);
  const plina = Array.from({ length: MARGINI_FREZA.freze - 1 }, (_, i) => salvata({ ...PLATA6, nume: `F${i}` }, `f${i}`));
  assert.deepEqual(cuFreze(plina, [V60, GRAVARE], () => 'z', 9), { ok: false, probleme: { lista: 'plina' } });
});

test('importul, cu numele care există deja: înlocuiește (id-ul rămâne, versiunea crește), amândouă sau sari', () => {
  const lista = [salvata(PLATA6, 'a'), salvata(V60, 'b')];
  const noi: Freza[] = [{ ...PLATA6, nume: 'plată ø6', avans: 1400 }, GRAVARE, { ...V60, diametru: 0 }];
  let n = 0;
  const idNou = (): string => `n${++n}`;
  const inloc = cuImport(lista, noi, 'inlocuieste', idNou, 50);
  assert.ok(inloc.ok);
  assert.deepEqual(inloc.lista.map((f) => [f.id, f.nume, f.avans, f.rev]), [
    ['a', 'plată ø6', 1400, 2], ['b', 'V60 Ø6', 1000, 1], ['n1', 'Gravare 30°', 1000, 1],
  ]);
  assert.deepEqual([inloc.adaugate, inloc.inlocuite, inloc.sarite], [1, 1, 1]);
  const ambele = cuImport(lista, noi, 'amandoua', idNou, 50);
  assert.ok(ambele.ok);
  assert.deepEqual(ambele.lista.map((f) => f.nume), ['Plată Ø6', 'V60 Ø6', 'plată ø6 (2)', 'Gravare 30°']);
  assert.deepEqual([ambele.adaugate, ambele.inlocuite, ambele.sarite], [2, 0, 1]);
  const sari = cuImport(lista, noi, 'sari', idNou, 50);
  assert.ok(sari.ok);
  assert.deepEqual(sari.lista.map((f) => f.nume), ['Plată Ø6', 'V60 Ø6', 'Gravare 30°']);
  assert.deepEqual([sari.adaugate, sari.inlocuite, sari.sarite], [1, 0, 2]);
  // Două freze cu același nume în fișier: a doua e ca una care există deja.
  const dublu = cuImport([], [GRAVARE, { ...GRAVARE, avans: 900 }], 'inlocuieste', idNou, 50);
  assert.ok(dublu.ok);
  assert.deepEqual(dublu.lista.map((f) => [f.nume, f.avans, f.rev]), [['Gravare 30°', 900, 2]]);
  const plina = Array.from({ length: MARGINI_FREZA.freze }, (_, i) => salvata({ ...PLATA6, nume: `F${i}` }, `f${i}`));
  assert.deepEqual(cuImport(plina, [GRAVARE], 'amandoua', idNou, 50), { ok: false, probleme: { lista: 'plina' } });
  // Înlocuirea nu crește lista: merge și într-o bibliotecă plină.
  assert.ok(cuImport(plina, [{ ...PLATA6, nume: 'F3', avans: 2000 }], 'inlocuieste', idNou, 50).ok);
});

test('importul peste numele unei freze necitite (a unei versiuni mai noi): „sari” o sare; celelalte o ocolesc cu „(2)”', () => {
  const rezervate = ['Bilă Ø6'];
  const bila: Freza = { ...PLATA6, nume: 'bilă ø6' };
  const idNou = (): string => 'n';
  const sari = cuImport([], [bila], 'sari', idNou, 1, rezervate);
  assert.ok(sari.ok);
  assert.deepEqual([sari.lista.length, sari.adaugate, sari.sarite], [0, 0, 1]);
  for (const politica of ['amandoua', 'inlocuieste'] as const) {
    const r = cuImport([], [bila], politica, idNou, 1, rezervate);
    assert.ok(r.ok);
    assert.deepEqual(r.lista.map((f) => f.nume), ['bilă ø6 (2)'], politica);
    assert.deepEqual([r.adaugate, r.inlocuite], [1, 0]);
  }
  // Și o freză nouă, salvată de mână, nu poate lua numele.
  assert.deepEqual(cuFreza([], null, bila, idNou, 1, rezervate), { ok: false, probleme: { nume: 'nume-folosit' } });
});

test('grupul (ADR 0302 §4): opțional, cel mult 40 de caractere, fără caractere de control; gol pleacă la salvare; ținut la citire', () => {
  assert.deepEqual(problemeFreza({ ...PLATA6, grup: 'Lemn' }), {});
  assert.deepEqual(problemeFreza({ ...PLATA6, grup: '   ' }), {});
  assert.deepEqual(problemeFreza({ ...PLATA6, grup: 'ă'.repeat(MARGINI_FREZA.grup) }), {});
  assert.deepEqual(problemeFreza({ ...PLATA6, grup: 'ă'.repeat(MARGINI_FREZA.grup + 1) }), { grup: 'grup-lung' });
  assert.deepEqual(problemeFreza({ ...PLATA6, grup: 'Le\u0007mn' }), { grup: 'grup-caractere' });
  // Salvat: curățat la capete; gol, câmpul pleacă (freza stă pe felul ei).
  const r = cuFreza([], null, { ...PLATA6, grup: '  Lemn moale ' }, () => 'a', 5);
  assert.ok(r.ok);
  assert.equal(r.lista[0]!.grup, 'Lemn moale');
  const g = cuFreza([], null, { ...PLATA6, grup: '   ' }, () => 'a', 5);
  assert.ok(g.ok);
  assert.equal('grup' in g.lista[0]!, false);
  // Schimbată fără grup: grupul de dinainte pleacă.
  const fara = cuFreza(r.lista, 'a', { ...PLATA6, grup: undefined }, () => 'x', 6);
  assert.ok(fara.ok);
  assert.equal('grup' in fara.lista[0]!, false);
  // Citit: un grup care nu e text strică freza; unul bun rămâne.
  assert.equal(frezaDinDate({ ...salvata(PLATA6, 'a'), grup: 3 }), null);
  assert.equal(frezaDinDate({ ...salvata(PLATA6, 'a'), grup: 'Lemn' })?.grup, 'Lemn');
  assert.equal(frezaImportata({ ...PLATA6, grup: 'Lemn' })?.grup, 'Lemn');
});

test('grupurile listei: întâi ale omului (după nume, fără deosebire de majuscule), apoi felurile, pentru frezele fără grup', () => {
  const l = [
    salvata(PLATA6, 'a'), salvata({ ...V60, grup: 'Lemn' }, 'b'), salvata({ ...GRAVARE, grup: 'aluminiu' }, 'c'),
    salvata({ ...PLATA6, nume: 'Plată Ø3', grup: 'LEMN' }, 'd'), salvata({ ...V60, nume: 'V90' }, 'e'),
  ];
  assert.deepEqual(grupurileListei(l).map((x) => [x.grup, x.fel, x.freze.map((f) => f.id)]), [
    ['aluminiu', null, ['c']],
    ['Lemn', null, ['b', 'd']],
    [null, 'plata', ['a']],
    [null, 'v', ['e']],
  ]);
  // Fără grupuri ale omului, ca înainte: doar felurile, în ordinea lor.
  assert.deepEqual(grupurileListei([salvata(GRAVARE, 'g'), salvata(PLATA6, 'p')]).map((x) => x.fel), ['plata', 'gravare']);
  assert.deepEqual(grupurileListei([]), []);
});

test('redenumirea unui grup: toate frezele lui, cu versiunea crescută; spre un grup existent, se unesc; gol, înapoi pe feluri', () => {
  const l = [salvata({ ...V60, grup: 'Lemn' }, 'b'), salvata({ ...PLATA6, grup: 'LEMN' }, 'd'), salvata({ ...GRAVARE, grup: 'Alu' }, 'c')];
  const r = cuGrupRedenumit(l, 'lemn', '  Esență tare ', 9);
  assert.ok(r.ok);
  assert.deepEqual(r.lista.map((f) => [f.id, f.grup, f.rev, f.schimbatLa]), [['b', 'Esență tare', 2, 9], ['d', 'Esență tare', 2, 9], ['c', 'Alu', 1, 1_000]]);
  // Spre un grup care există: frezele intră în el, cu numele lui de acum.
  const u = cuGrupRedenumit(l, 'Lemn', 'alu', 9);
  assert.ok(u.ok);
  assert.deepEqual(u.lista.map((f) => f.grup), ['Alu', 'Alu', 'Alu']);
  // Gol: frezele lui se întorc pe felurile lor.
  const f = cuGrupRedenumit(l, 'lemn', '  ', 9);
  assert.ok(f.ok);
  assert.deepEqual(f.lista.map((x) => 'grup' in x), [false, false, true]);
  // Refuzurile: numele greșit, grupul care nu e.
  assert.deepEqual(cuGrupRedenumit(l, 'lemn', 'x'.repeat(MARGINI_FREZA.grup + 1), 9), { ok: false, motiv: 'grup-lung' });
  assert.deepEqual(cuGrupRedenumit(l, 'lemn', 'a\u0001', 9), { ok: false, motiv: 'grup-caractere' });
  assert.deepEqual(cuGrupRedenumit(l, 'nimic', 'X', 9), { ok: false, motiv: 'lipsa' });
});

test('felurile noi (ADR 0302 §2, felia 16.A↑h-4): bila, toroidala, conica cu vârf rotund, burghiul; în bibliotecă; bila cu CAM din v29', () => {
  assert.deepEqual(FELURI_FREZA.slice(0, 7), ['plata', 'v', 'gravare', 'bila', 'toroidala', 'conica', 'burghiu']);
  // Toroidala, din 16.A↑e-4 (ADR 0303); profilurile parametrice, din 16.A↑f-3 (ADR 0304).
  assert.deepEqual(FELURI_CU_CAM, ['plata', 'v', 'gravare', 'bila', 'toroidala', 'rotunjire', 'ogee', 'ogee-roman', 'panou']);
  const BILA: Freza = { ...PLATA6, nume: 'Bilă Ø6', fel: 'bila', tais: undefined };
  const TOR: Freza = { ...PLATA6, nume: 'Toroidală', fel: 'toroidala', raza: 1, tais: undefined };
  const CON: Freza = { ...PLATA6, nume: 'Conică', fel: 'conica', unghi: 15, raza: 0.5, tais: undefined };
  const BUR: Freza = { ...PLATA6, nume: 'Burghiu Ø6', fel: 'burghiu', unghi: 118, tais: undefined };
  for (const f of [BILA, TOR, CON, BUR]) assert.deepEqual(problemeFreza(f), {}, f.nume);
  // Raza: a colțului la toroidală, a vârfului la conică; peste 0 și sub jumătatea diametrului (la Ø / 2 ar fi o bilă).
  assert.deepEqual(problemeFreza({ ...TOR, raza: undefined }), { raza: 'lipsa' });
  assert.deepEqual(problemeFreza({ ...TOR, raza: 0 }), { raza: 'margini' });
  assert.deepEqual(problemeFreza({ ...TOR, raza: 3 }), { raza: 'margini' });
  assert.deepEqual(problemeFreza({ ...CON, raza: 3 }), { raza: 'margini' });
  // Unghiul: al conicei și al vârfului burghiului, ca la V.
  assert.deepEqual(problemeFreza({ ...CON, unghi: undefined }), { unghi: 'lipsa' });
  assert.deepEqual(problemeFreza({ ...BUR, unghi: 180 }), { unghi: 'margini' });
  // Capătul, pe hârtie: bila R; toroidala r; conica r(1 − sin α) + (R − r cos α) / tan α, cu α jumătatea unghiului;
  // burghiul R / tan(θ / 2).
  const aproape = (a: number, b: number): void => { assert.ok(Math.abs(a - b) < 1e-9, `${a} față de ${b}`); };
  aproape(inaltimeCon(BILA), 3);
  aproape(inaltimeCon(TOR), 1);
  const a = (7.5 * Math.PI) / 180;
  aproape(inaltimeCon(CON), 0.5 * (1 - Math.sin(a)) + (3 - 0.5 * Math.cos(a)) / Math.tan(a));
  aproape(inaltimeCon(BUR), 3 / Math.tan((59 * Math.PI) / 180));
  // Tăișul cel puțin cât capătul.
  assert.deepEqual(problemeFreza({ ...BILA, tais: 2.9 }), { tais: 'con' });
  assert.deepEqual(problemeFreza({ ...BILA, tais: 3 }), {});
  // Salvată: doar câmpurile felului (raza la toroidală și conică, unghiul la V, gravare, conică, burghiu, vârful la gravare).
  const b = cuFreza([], null, { ...BILA, unghi: 60, raza: 1, varf: 0.2 }, () => 'a', 5);
  assert.ok(b.ok);
  assert.deepEqual(['unghi', 'raza', 'varf'].map((k) => k in b.lista[0]!), [false, false, false]);
  const t = cuFreza([], null, { ...TOR, unghi: 60 }, () => 'a', 5);
  assert.ok(t.ok);
  assert.deepEqual([('unghi' in t.lista[0]!), t.lista[0]!.raza], [false, 1]);
  const c = cuFreza([], null, CON, () => 'a', 5);
  assert.ok(c.ok);
  assert.deepEqual([c.lista[0]!.unghi, c.lista[0]!.raza], [15, 0.5]);
  // Citită: o rază care nu e număr strică freza.
  assert.equal(frezaDinDate({ ...salvata(TOR, 'a'), raza: 'x' }), null);
  assert.equal(frezaDinDate(salvata(TOR, 'a'))?.raza, 1);
  // Copia pentru document: doar felurile pe care CAM-ul le taie. Bila, din documentul v29 (ADR 0312): doar forma ei; toroidala,
  // din documentul v31 și cu CAM-ul canelurii (ADR 0303, felia 16.A↑e-4): forma, cu raza colțului.
  assert.deepEqual(sculaDinFreza(BILA, 4), { numar: 4, nume: 'Bilă Ø6', diametru: 6, forma: { tip: 'bila' } });
  assert.deepEqual(sculaDinFreza(TOR, 5), { numar: 5, nume: 'Toroidală', diametru: 6, forma: { tip: 'toroidala', raza: 1 } });
  // Raza copiei e a frezei, nu una implicită (otrava F15 din 16.A↑e-4: copia cu raza 1).
  assert.deepEqual(sculaDinFreza({ ...TOR, raza: 1.5 }, 5).forma, { tip: 'toroidala', raza: 1.5 });
  for (const f of [CON, BUR]) assert.throws(() => sculaDinFreza(f), /CAM/u, f.nume);
});

test('profilurile parametrice (ADR 0302 §1, felia 16.A↑h-5): rotunjirea, ogee-ul, ogee-ul roman, panoul ridicat; cu CAM din 16.A↑f-3', () => {
  assert.deepEqual(FELURI_FREZA, ['plata', 'v', 'gravare', 'bila', 'toroidala', 'conica', 'burghiu', 'rotunjire', 'ogee', 'ogee-roman', 'panou']);
  assert.deepEqual(FELURI_CU_CAM, ['plata', 'v', 'gravare', 'bila', 'toroidala', 'rotunjire', 'ogee', 'ogee-roman', 'panou']);
  const ROT: Freza = { ...PLATA6, nume: 'Rotunjire R3', fel: 'rotunjire', diametru: 12, raza: 3, tais: undefined };
  const OG: Freza = { ...PLATA6, nume: 'Ogee R3', fel: 'ogee', diametru: 18, raza: 3, tais: undefined };
  const OGR: Freza = { ...PLATA6, nume: 'Ogee roman R3', fel: 'ogee-roman', diametru: 21, raza: 3, treapta: 1.5, tais: undefined };
  const PAN: Freza = { ...PLATA6, nume: 'Panou 12°', fel: 'panou', diametru: 50.8, unghi: 12, varf: 6.35, tais: undefined };
  const PANR: Freza = { ...PAN, nume: 'Panou 12° R6,35', raza: 6.35 };
  for (const f of [ROT, OG, OGR, PAN, PANR]) assert.deepEqual(problemeFreza(f), {}, f.nume);
  // Raza: la rotunjire sub Ø / 2 (vârful rămâne); la ogee, două arce, deci sub Ø / 4.
  assert.deepEqual(problemeFreza({ ...ROT, raza: undefined }), { raza: 'lipsa' });
  assert.deepEqual(problemeFreza({ ...ROT, raza: 6 }), { raza: 'margini' });
  assert.deepEqual(problemeFreza({ ...ROT, raza: 5.99 }), {});
  assert.deepEqual(problemeFreza({ ...OG, raza: 4.5 }), { raza: 'margini' });
  assert.deepEqual(problemeFreza({ ...OG, raza: 4.49 }), {});
  // Ogee-ul roman: treapta (jos și sus) e obligatorie, peste 0, iar 2r + t sub raza frezei.
  assert.deepEqual(problemeFreza({ ...OGR, treapta: undefined }), { treapta: 'lipsa' });
  assert.deepEqual(problemeFreza({ ...OGR, treapta: 0 }), { treapta: 'margini' });
  assert.deepEqual(problemeFreza({ ...OGR, treapta: 4.5 }), { treapta: 'margini' });
  assert.deepEqual(problemeFreza({ ...OGR, treapta: 4.49 }), {});
  // Panoul: fundul plat (vârful) sub diametru, unghiul teșiturii față de fața plăcii, sub 90°; scobitura opțională, care
  // încape între fundul plat și diametru (a + r·sin β < R).
  assert.deepEqual(problemeFreza({ ...PAN, varf: undefined }), { varf: 'lipsa' });
  assert.deepEqual(problemeFreza({ ...PAN, varf: 50.8 }), { varf: 'varf' });
  assert.deepEqual(problemeFreza({ ...PAN, unghi: 90 }), { unghi: 'margini' });
  assert.deepEqual(problemeFreza({ ...PAN, unghi: 89 }), {});
  assert.deepEqual(problemeFreza({ ...PANR, raza: 0 }), { raza: 'margini' });
  const rMax = (25.4 - 3.175) / Math.sin((12 * Math.PI) / 180);
  assert.deepEqual(problemeFreza({ ...PANR, raza: rMax + 0.01 }), { raza: 'margini' });
  assert.deepEqual(problemeFreza({ ...PANR, raza: rMax - 0.01 }), {});
  // Capătul, pe hârtie: rotunjirea r; ogee-ul 2r; ogee-ul roman 2r + t; panoul (R − a)·tan β, iar cu scobitura
  // r(1 − cos β) + (R − a − r sin β)·tan β.
  const aproape = (a: number, b: number): void => { assert.ok(Math.abs(a - b) < 1e-9, `${a} față de ${b}`); };
  aproape(inaltimeCon(ROT), 3);
  aproape(inaltimeCon(OG), 6);
  aproape(inaltimeCon(OGR), 7.5);
  const b = (12 * Math.PI) / 180;
  aproape(inaltimeCon(PAN), (25.4 - 3.175) * Math.tan(b));
  aproape(inaltimeCon(PANR), 6.35 * (1 - Math.cos(b)) + (25.4 - 3.175 - 6.35 * Math.sin(b)) * Math.tan(b));
  assert.deepEqual(problemeFreza({ ...OG, tais: 5.9 }), { tais: 'con' });
  assert.deepEqual(problemeFreza({ ...OG, tais: 6 }), {});
  // Salvată: doar câmpurile felului (treapta doar la ogee-ul roman; vârful și unghiul la panou; raza la profiluri).
  const r = cuFreza([], null, { ...ROT, unghi: 60, varf: 1, treapta: 1 }, () => 'a', 5);
  assert.ok(r.ok);
  assert.deepEqual(['unghi', 'varf', 'treapta'].map((k) => k in r.lista[0]!), [false, false, false]);
  assert.equal(r.lista[0]!.raza, 3);
  const o = cuFreza([], null, OGR, () => 'a', 5);
  assert.ok(o.ok);
  assert.deepEqual([o.lista[0]!.raza, o.lista[0]!.treapta], [3, 1.5]);
  const p = cuFreza([], null, { ...PAN, treapta: 1 }, () => 'a', 5);
  assert.ok(p.ok);
  assert.deepEqual([p.lista[0]!.unghi, p.lista[0]!.varf, 'treapta' in p.lista[0]!, 'raza' in p.lista[0]!], [12, 6.35, false, false]);
  // Citită: o treaptă care nu e număr strică freza, și pe un fel care n-o judecă (forma, nu marginile).
  assert.equal(frezaDinDate({ ...salvata(OGR, 'a'), treapta: 'x' }), null);
  assert.equal(frezaDinDate({ ...salvata(ROT, 'a'), treapta: 'x' }), null);
  assert.equal(frezaDinDate(salvata(OGR, 'a'))?.treapta, 1.5);
  // Copia pentru document (ADR 0304, 16.A↑f-3): silueta ca linii, cu punctele lui `puncteProfil` (`profil.document.test.ts`).
  for (const f of [ROT, OG, OGR, PAN]) assert.equal(sculaDinFreza(f).forma?.tip, 'profil', f.nume);
});
