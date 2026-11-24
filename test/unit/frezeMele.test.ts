/**
 * Biblioteca de freze din browser (ADR 0300 §7, felia 16.A↑a), peste un depozit fals: drumul dus-întors, frezele pe care
 * versiunea de azi nu le citește (păstrate neatinse la scriere), lista unei versiuni mai noi (doar citită), depozitul care
 * aruncă (biblioteca ține cât fila, iar starea o spune), două file peste același depozit (nicio schimbare pierdută) și starea
 * care rămâne aceeași referință până la o schimbare.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEIE_LOCALA, cheieCont, creeazaFrezeMele, VERSIUNE_FREZE, type DepozitFreze } from '../../src/app/frezeMele.ts';
import { FREZE_PORNIRE, type Freza } from '../../src/model/freza.ts';
import { SINCRON_GOL } from '../../src/model/frezeSincron.ts';

const PLATA6: Freza = {
  nume: 'Plată Ø6', fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2,
  turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40,
};
const V60: Freza = { ...PLATA6, nume: 'V60 Ø6', fel: 'v', unghi: 60, numar: 3, pas: 1.5, tais: undefined };

/** Un IndexedDB fals: o valoare pe cheie, copiată ca la `structuredClone`, care poate arunca la citire sau la scriere. */
class Depozit implements DepozitFreze {
  readonly date = new Map<string, unknown>();
  aruncaCitire = false;
  aruncaScriere = false;
  scrieri = 0;
  citeste(cheie: string): Promise<unknown> {
    if (this.aruncaCitire) return Promise.reject(new Error('blocat'));
    return Promise.resolve(structuredClone(this.date.get(cheie)));
  }
  actualizeaza(cheie: string, schimba: (acum: unknown) => unknown): Promise<void> {
    if (this.aruncaCitire || this.aruncaScriere) return Promise.reject(new Error('blocat'));
    const nou = schimba(structuredClone(this.date.get(cheie)));
    this.date.set(cheie, structuredClone(nou));
    this.scrieri++;
    return Promise.resolve();
  }
}

function ids(): () => string {
  let n = 0;
  return () => `id${++n}`;
}

test('dus-întors: adăugarea, schimbarea, ștergerea ajung în depozit; altă bibliotecă peste el le citește', async () => {
  const d = new Depozit();
  const b = creeazaFrezeMele(d, ids(), () => 1000);
  await b.incarca();
  assert.deepEqual(b.stare(), { incarcata: true, freze: [], pastrate: true, scriere: true, necitite: 0, sincron: SINCRON_GOL });
  const a = await b.salveaza(null, PLATA6);
  assert.deepEqual(a, { ok: true, id: 'id1' });
  const v = await b.salveaza(null, V60);
  assert.ok(v.ok);
  assert.deepEqual(await b.salveaza('id1', { ...PLATA6, avans: 1200 }), { ok: true, id: 'id1' });
  const dinDepozit = d.date.get(CHEIE_LOCALA) as { v: number; freze: unknown[] };
  assert.equal(dinDepozit.v, VERSIUNE_FREZE);
  assert.equal(dinDepozit.freze.length, 2);
  const alta = creeazaFrezeMele(d, ids(), () => 2000);
  await alta.incarca();
  assert.deepEqual(alta.stare().freze.map((f) => [f.id, f.nume, f.avans, f.rev]), [['id1', 'Plată Ø6', 1200, 2], ['id2', 'V60 Ø6', 1000, 1]]);
  assert.deepEqual(await b.sterge('id2'), { ok: true });
  await alta.reincarca();
  assert.deepEqual(alta.stare().freze.map((f) => f.id), ['id1']);
  // Refuzurile listei vin înapoi, fără scriere.
  const inainte = d.scrieri;
  assert.deepEqual(await b.salveaza(null, { ...V60, nume: 'plată ø6' }), { ok: false, probleme: { nume: 'nume-folosit' } });
  assert.deepEqual(await b.sterge('nu-e'), { ok: false, probleme: { id: 'lipsa' } });
  assert.equal(d.scrieri, inainte);
});

test('frezele pe care versiunea de azi nu le citește rămân neatinse în depozit; lista unei versiuni mai noi doar se citește', async () => {
  const d = new Depozit();
  const bila = { id: 'x', rev: 1, schimbatLa: 5, nume: 'Bilă Ø6', fel: 'bila', diametru: 6 };
  d.date.set(CHEIE_LOCALA, { v: 1, freze: [{ ...PLATA6, id: 'a', rev: 1, schimbatLa: 5 }, bila] });
  const b = creeazaFrezeMele(d, ids(), () => 9);
  await b.incarca();
  assert.deepEqual(b.stare().freze.map((f) => f.id), ['a']);
  assert.equal(b.stare().necitite, 1);
  assert.ok((await b.salveaza(null, V60)).ok);
  const dupa = d.date.get(CHEIE_LOCALA) as { freze: { id: string }[] };
  assert.deepEqual(dupa.freze.map((f) => f.id), ['a', 'id1', 'x']);
  assert.deepEqual(dupa.freze[2], bila);
  // Numele unei freze necitite e tot luat (ar ieși două cu același nume).
  assert.deepEqual(await b.salveaza(null, { ...V60, nume: 'bilă ø6' }), { ok: false, probleme: { nume: 'nume-folosit' } });
  // O listă scrisă de o versiune mai nouă: se citește ce se poate, nu se scrie.
  d.date.set(CHEIE_LOCALA, { v: VERSIUNE_FREZE + 1, freze: [{ ...PLATA6, id: 'a', rev: 1, schimbatLa: 5 }] });
  await b.reincarca();
  assert.equal(b.stare().scriere, false);
  assert.deepEqual(b.stare().freze.map((f) => f.id), ['a']);
  const scrieri = d.scrieri;
  assert.deepEqual(await b.salveaza(null, V60), { ok: false, probleme: { lista: 'versiune' } });
  assert.equal(d.scrieri, scrieri);
});

test('un depozit stricat sau care aruncă: biblioteca ține cât fila, iar starea o spune', async () => {
  const d = new Depozit();
  d.date.set(CHEIE_LOCALA, 'stricat');
  const b = creeazaFrezeMele(d, ids(), () => 9);
  await b.incarca();
  assert.deepEqual(b.stare(), { incarcata: true, freze: [], pastrate: true, scriere: true, necitite: 0, sincron: SINCRON_GOL });
  d.aruncaScriere = true;
  assert.deepEqual(await b.salveaza(null, PLATA6), { ok: true, id: 'id1' });
  assert.equal(b.stare().pastrate, false);
  assert.deepEqual(b.stare().freze.map((f) => f.nume), ['Plată Ø6']);
  // Lista din memorie nu se recitește (ar pierde ce n-a încăput în depozit) și se schimbă mai departe.
  await b.reincarca();
  assert.ok((await b.salveaza(null, V60)).ok);
  assert.deepEqual(b.stare().freze.map((f) => f.nume), ['Plată Ø6', 'V60 Ø6']);
  // Fără depozit deloc (fereastră privată): la fel, din prima.
  const fara = creeazaFrezeMele(null, ids(), () => 9);
  await fara.incarca();
  assert.deepEqual(fara.stare(), { incarcata: true, freze: [], pastrate: false, scriere: true, necitite: 0, sincron: SINCRON_GOL });
  const blocat = new Depozit();
  blocat.aruncaCitire = true;
  const c = creeazaFrezeMele(blocat, ids(), () => 9);
  await c.incarca();
  assert.equal(c.stare().pastrate, false);
});

test('două file peste același depozit: fiecare schimbare citește întâi ce e acolo, deci nimic nu se pierde', async () => {
  const d = new Depozit();
  const a = creeazaFrezeMele(d, () => 'a1', () => 1);
  const b = creeazaFrezeMele(d, () => 'b1', () => 2);
  await a.incarca();
  await b.incarca();
  assert.ok((await a.salveaza(null, PLATA6)).ok);
  // Fila b n-a recitit încă, dar adăugarea ei vede freza din fila a.
  assert.ok((await b.salveaza(null, V60)).ok);
  assert.deepEqual(b.stare().freze.map((f) => f.id), ['a1', 'b1']);
  // Și numele unic se judecă pe ce e în depozit, nu pe ce văzuse fila.
  assert.deepEqual(await a.salveaza(null, { ...PLATA6, nume: 'v60 ø6' }), { ok: false, probleme: { nume: 'nume-folosit' } });
});

test('pornirea și importul trec prin aceeași listă; starea e aceeași referință până la o schimbare; ascultătorii aud', async () => {
  const d = new Depozit();
  const b = creeazaFrezeMele(d, ids(), () => 1);
  let auzite = 0;
  const opreste = b.aboneaza(() => { auzite++; });
  await b.incarca();
  const s0 = b.stare();
  assert.equal(b.stare(), s0);
  const p = await b.adaugaToate(FREZE_PORNIRE.map((f, i) => ({ ...f, nume: `F${i}` })));
  assert.deepEqual(p, { ok: true, adaugate: 6, inlocuite: 0, sarite: 0 });
  assert.notEqual(b.stare(), s0);
  const i = await b.importa([{ ...PLATA6, nume: 'F1', avans: 2000 }, V60], 'inlocuieste');
  assert.deepEqual(i, { ok: true, adaugate: 1, inlocuite: 1, sarite: 0 });
  assert.equal(b.stare().freze.find((f) => f.nume === 'F1')?.avans, 2000);
  assert.ok(auzite >= 3);
  opreste();
  const inainte = auzite;
  await b.sterge(b.stare().freze[0]!.id);
  assert.equal(auzite, inainte);
});

test('biblioteca unui cont (felia 16.A↑c): sincronizarea își scrie starea lângă freze; schimbările omului o păstrează', async () => {
  const d = new Depozit();
  const b = creeazaFrezeMele(d, ids(), () => 1000, cheieCont('ana'));
  await b.incarca();
  const r = await b.salveaza(null, PLATA6);
  assert.ok(r.ok);
  const salvata = b.stare().freze[0]!;
  // Sincronizarea: baza frezei, versiunea contului, plus o freză brută venită din cont.
  const bruta = { id: 'x', rev: 1, schimbatLa: 1, nume: 'Bilă', fel: 'bila', diametru: 6 };
  assert.equal(await b.schimbaCont((c) => ({
    freze: c.freze, brute: [bruta], sincron: { ...c.sincron, dupa: 4, baze: new Map([[salvata.id, { versiune: 3, json: '{}' }]]) },
  })), true);
  assert.equal(b.stare().sincron.dupa, 4);
  assert.equal(b.stare().necitite, 1);
  // O schimbare a omului nu atinge starea sincronizării.
  assert.ok((await b.salveaza(salvata.id, { ...PLATA6, avans: 1500 })).ok);
  const brut = d.date.get(cheieCont('ana')) as { sincron: { dupa: number; baze: unknown[] }; freze: unknown[] };
  assert.equal(brut.sincron.dupa, 4);
  assert.deepEqual(brut.sincron.baze, [{ id: salvata.id, versiune: 3, json: '{}' }]);
  assert.equal(brut.freze.length, 2);
  // Altă bibliotecă peste același depozit vede starea; cea fără cont rămâne separată.
  const alta = creeazaFrezeMele(d, ids(), () => 2000, cheieCont('ana'));
  await alta.incarca();
  assert.equal(alta.stare().sincron.baze.get(salvata.id)?.versiune, 3);
  const locala = creeazaFrezeMele(d, ids(), () => 2000);
  await locala.incarca();
  assert.deepEqual(locala.stare().freze, []);
  // Nimic de schimbat: nu scrie; o listă a unei versiuni mai noi: refuzată.
  const scrieri = d.scrieri;
  assert.equal(await b.schimbaCont(() => null), false);
  assert.equal(d.scrieri, scrieri);
  d.date.set(cheieCont('ana'), { v: VERSIUNE_FREZE + 1, freze: [] });
  assert.equal(await b.schimbaCont((c) => c), false);
});
