import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cerereFrezeDin, LOT_FREZE, type CerereFreze, type FrezaInCont, type RaspunsListaFreze, type RaspunsScrieFreze, type RezultatFreza,
} from '../../shared/freze.ts';
import { creeazaFrezeMele, type DepozitFreze, type FrezeMele } from '../../src/app/frezeMele.ts';
import { sincronizeaza, rezolvaConflictul } from '../../src/app/frezeSincronizare.ts';
import type { Freza } from '../../src/model/freza.ts';

/**
 * Sincronizarea cap-coadă, fără rețea (ADR 0300 §7, felia 16.A↑c): două calculatoare ale aceluiași cont, fiecare cu
 * biblioteca lui din browser, peste un server fals care urmează regulile callable-ului `freze` (versiunea contului, cea
 * văzută, conflictul, semnele ștergerii, plafonul, dreptul de scriere). Probele callable-ului adevărat stau pe emulator
 * (`functions/test/freze.emulator.test.ts`); aici, drumul clientului.
 */

class Depozit implements DepozitFreze {
  readonly date = new Map<string, unknown>();
  citeste(cheie: string): Promise<unknown> { return Promise.resolve(structuredClone(this.date.get(cheie))); }
  actualizeaza(cheie: string, schimba: (acum: unknown) => unknown): Promise<void> {
    this.date.set(cheie, structuredClone(schimba(structuredClone(this.date.get(cheie)))));
    return Promise.resolve();
  }
}

/** Serverul fals: aceleași răspunsuri ca `functions/src/freze/actiuni.ts`, fără paginile mari și fără semnele plecate. */
class Server {
  versiune = 0;
  readonly freze = new Map<string, FrezaInCont>();
  poateScrie = true;
  plafon = 500;
  pagina = 3;
  cereri: CerereFreze[] = [];
  /** Fără rețea: fiecare cerere cade ca a clientului Firebase. */
  jos = false;
  /** Ultima versiune a unui semn de ștergere plecat (peste plafonul semnelor): cine e în urma ei primește lista întreagă. */
  purjat = 0;

  /** Semnul ștergerii unei freze pleacă (ca peste plafonul semnelor, pe server). */
  purjeaza(id: string): void {
    const f = this.freze.get(id);
    if (!f || f.json !== null) throw new Error('nu e un semn');
    this.freze.delete(id);
    this.purjat = Math.max(this.purjat, f.versiune);
  }

  cheama = (x: CerereFreze): Promise<RaspunsListaFreze | RaspunsScrieFreze> => {
    if (this.jos) return Promise.reject(Object.assign(new Error('fără rețea'), { code: 'functions/unavailable' }));
    const c = cerereFrezeDin(structuredClone(x));
    if (!c) return Promise.reject(Object.assign(new Error('cererea'), { code: 'functions/invalid-argument' }));
    this.cereri.push(c);
    const vii = (): number => [...this.freze.values()].filter((f) => f.json !== null).length;
    if (c.actiune === 'lista') {
      const complet = c.dupa === 0 || c.dupa < this.purjat;
      const de = complet ? 0 : c.dupa;
      const toate = [...this.freze.values()].filter((f) => f.versiune > de).sort((a, b) => a.versiune - b.versiune);
      const mai = toate.length > this.pagina;
      const freze = toate.slice(0, this.pagina);
      return Promise.resolve({
        ok: true, freze, mai, pana: mai ? freze[freze.length - 1]!.versiune : this.versiune, complet, poateScrie: this.poateScrie, numar: vii(),
      });
    }
    if (!this.poateScrie) return Promise.reject(Object.assign(new Error('plan'), { code: 'functions/permission-denied' }));
    const rezultate: RezultatFreza[] = [];
    for (const f of c.freze) {
      const acolo = this.freze.get(f.id) ?? { id: f.id, versiune: 0, json: null };
      if (f.vazuta !== acolo.versiune) { rezultate.push({ id: f.id, stare: 'conflict', versiune: acolo.versiune, json: acolo.json }); continue; }
      const json = c.actiune === 'scrie' ? (f as { json: string }).json : null;
      if (json === null && acolo.json === null) { rezultate.push({ id: f.id, stare: 'scrisa', versiune: acolo.versiune }); continue; }
      if (json !== null && acolo.json === null && vii() >= this.plafon) { rezultate.push({ id: f.id, stare: 'plina' }); continue; }
      this.versiune++;
      this.freze.set(f.id, { id: f.id, versiune: this.versiune, json });
      rezultate.push({ id: f.id, stare: 'scrisa', versiune: this.versiune });
    }
    return Promise.resolve({ ok: true, rezultate, numar: vii() });
  };

  nume(): string[] {
    return [...this.freze.values()].filter((f) => f.json !== null).map((f) => (JSON.parse(f.json!) as { nume: string }).nume).sort();
  }
}

const PLATA6: Freza = { nume: 'Plată Ø6', fel: 'plata', diametru: 6, numar: 2, turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40 };
const V60: Freza = { ...PLATA6, nume: 'V60 Ø6', fel: 'v', unghi: 60, numar: 3, pas: 1.5 };

function calculator(nume: string): FrezeMele {
  let n = 0;
  return creeazaFrezeMele(new Depozit(), () => `${nume}${++n}`, () => 1000, 'cont:ana');
}
const nume = (b: FrezeMele): string[] => b.stare().freze.map((f) => f.nume).sort();
const id = (b: FrezeMele, n: string): string => b.stare().freze.find((f) => f.nume === n)!.id;

test('două calculatoare: ce scrie unul ajunge la celălalt, pe pagini; o ștergere ajunge și ea; a doua trecere nu trimite nimic', async () => {
  const s = new Server(), a = calculator('a'), b = calculator('b');
  await a.incarca(); await b.incarca();
  for (const f of [PLATA6, V60, { ...PLATA6, nume: 'Plată Ø3', diametru: 3 }, { ...PLATA6, nume: 'Plată Ø12', diametru: 12 }]) assert.ok((await a.salveaza(null, f)).ok);
  assert.equal(await sincronizeaza(a, s.cheama), 'la-zi');
  assert.deepEqual(s.nume(), ['Plată Ø12', 'Plată Ø3', 'Plată Ø6', 'V60 Ø6']);
  assert.equal(await sincronizeaza(b, s.cheama), 'la-zi');
  assert.deepEqual(nume(b), nume(a));
  // Două pagini (3 pe pagină), apoi nimic de trimis.
  assert.deepEqual(s.cereri.slice(-2).map((c) => c.actiune), ['lista', 'lista']);
  assert.ok((await b.sterge(id(b, 'V60 Ø6'))).ok);
  await sincronizeaza(b, s.cheama);
  await sincronizeaza(a, s.cheama);
  assert.deepEqual(nume(a), ['Plată Ø12', 'Plată Ø3', 'Plată Ø6']);
  const inainte = s.cereri.length;
  assert.equal(await sincronizeaza(a, s.cheama), 'la-zi');
  assert.deepEqual(s.cereri.slice(inainte).map((c) => c.actiune), ['lista']);
});

test('schimbată pe ambele calculatoare: câmpuri diferite se îmbină; același câmp e conflict, hotărât de om, apoi la zi pe amândouă', async () => {
  const s = new Server(), a = calculator('a'), b = calculator('b');
  await a.incarca(); await b.incarca();
  await a.salveaza(null, PLATA6);
  await sincronizeaza(a, s.cheama);
  await sincronizeaza(b, s.cheama);
  const fid = id(a, 'Plată Ø6');
  // Câmpuri diferite: avansul pe A, turația pe B.
  await a.salveaza(fid, { ...PLATA6, avans: 1200 });
  await b.salveaza(fid, { ...PLATA6, turatie: 20000 });
  await sincronizeaza(a, s.cheama);
  await sincronizeaza(b, s.cheama);
  await sincronizeaza(a, s.cheama);
  for (const x of [a, b]) assert.deepEqual([x.stare().freze[0]?.avans, x.stare().freze[0]?.turatie], [1200, 20000]);
  // Același câmp: pasul.
  await a.salveaza(fid, { ...PLATA6, avans: 1200, turatie: 20000, pas: 2 });
  await b.salveaza(fid, { ...PLATA6, avans: 1200, turatie: 20000, pas: 4 });
  await sincronizeaza(a, s.cheama);
  assert.equal(await sincronizeaza(b, s.cheama), 'la-zi');
  assert.deepEqual([...b.stare().sincron.conflicte.keys()], [fid]);
  assert.deepEqual(b.stare().sincron.conflicte.get(fid)?.campuri, ['pas']);
  assert.equal(b.stare().freze[0]?.pas, 4);
  // Omul de pe B păstrează pasul lui: pleacă peste cel din cont, iar A îl primește.
  await rezolvaConflictul(b, fid, 'mea', () => 'copie', 5000);
  await sincronizeaza(b, s.cheama);
  await sincronizeaza(a, s.cheama);
  for (const x of [a, b]) {
    assert.equal(x.stare().freze[0]?.pas, 4);
    assert.equal(x.stare().sincron.conflicte.size, 0);
  }
});

test('fără rețea, cu planul fără scriere și cu contul plin: biblioteca de aici rămâne, iar starea o spune', async () => {
  const s = new Server(), a = calculator('a');
  await a.incarca();
  await a.salveaza(null, PLATA6);
  s.jos = true;
  assert.equal(await sincronizeaza(a, s.cheama), 'fara-retea');
  assert.deepEqual(nume(a), ['Plată Ø6']);
  s.jos = false;
  s.poateScrie = false;
  assert.equal(await sincronizeaza(a, s.cheama), 'citire');
  assert.equal(s.freze.size, 0);
  s.poateScrie = true;
  s.plafon = 1;
  await a.salveaza(null, V60);
  assert.equal(await sincronizeaza(a, s.cheama), 'la-zi');
  assert.equal(s.freze.size, 1);
  assert.equal(a.stare().sincron.plina.length, 1);
  // Contul plin: a doua trecere nu mai trimite freza refuzată decât o dată.
  const inainte = s.cereri.length;
  await sincronizeaza(a, s.cheama);
  assert.deepEqual(s.cereri.slice(inainte).map((c) => c.actiune), ['lista', 'scrie']);
});

test(`loturile: cel mult ${LOT_FREZE} de freze pe cerere`, async () => {
  const s = new Server(), a = calculator('a');
  await a.incarca();
  assert.ok((await a.adaugaToate(Array.from({ length: LOT_FREZE + 7 }, (_, i) => ({ ...PLATA6, nume: `F${i}`, diametru: 1 + i / 10 })))).ok);
  await sincronizeaza(a, s.cheama);
  const scrieri = s.cereri.filter((c): c is Extract<CerereFreze, { actiune: 'scrie' }> => c.actiune === 'scrie');
  assert.deepEqual(scrieri.map((c) => c.freze.length), [LOT_FREZE, 7]);
  assert.equal(s.freze.size, LOT_FREZE + 7);
});

test('rămas în urma semnelor ștergerii plecate din cont: lista întreagă; o freză știută care lipsește pleacă, una schimbată aici e conflict', async () => {
  const s = new Server(), a = calculator('a'), b = calculator('b');
  await a.incarca(); await b.incarca();
  for (const f of [PLATA6, V60, { ...PLATA6, nume: 'Plată Ø3', diametru: 3 }]) await a.salveaza(null, f);
  await sincronizeaza(a, s.cheama);
  await sincronizeaza(b, s.cheama);
  // B șterge două; semnele lor pleacă din cont înainte ca A să afle de ele. A a schimbat între timp una dintre ele.
  await b.sterge(id(b, 'V60 Ø6'));
  await b.sterge(id(b, 'Plată Ø3'));
  await sincronizeaza(b, s.cheama);
  s.purjeaza(id(a, 'V60 Ø6'));
  s.purjeaza(id(a, 'Plată Ø3'));
  await a.salveaza(id(a, 'Plată Ø3'), { ...PLATA6, nume: 'Plată Ø3', diametru: 3, avans: 900 });
  await sincronizeaza(a, s.cheama);
  assert.deepEqual(nume(a), ['Plată Ø3', 'Plată Ø6']);
  assert.deepEqual([...a.stare().sincron.conflicte.values()].map((c) => c.campuri), [['*']]);
});
