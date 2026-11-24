/**
 * Freza din biblioteca omului (ADR 0300 §2, felia 16.A↑a), pe hârtie: marginile (aceleași ca ale ușii documentului, ca o freză
 * bună în bibliotecă să treacă și de schema operației), conul frezei în V și al celei de gravare, numele unice fără deosebire
 * de majuscule, câmpurile care nu țin de fel scoase la salvare, câmpurile necunoscute păstrate, frezele de pornire și lista
 * (adăugarea, schimbarea cu versiunea crescută, ștergerea, numele liber la import).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cheieNume, cuFreza, cuFreze, cuGrupRedenumit, cuImport, cuStandard, faraFreza, FREZE_PORNIRE, ID_PORNIRE, frezaDinDate, frezaImportata, grupurileListei,
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
    { ...s, fel: 'bila' }, { ...s, diametru: 0 }, { ...s, nume: 3 }, { ...s, nota: 4 }]) {
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

