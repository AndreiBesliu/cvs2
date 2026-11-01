/**
 * Lista rolurilor personalizate peste un depozit (ADR 0114 §3): drumul dus-întors, depozitul care aruncă la citire sau la
 * scriere (rolurile țin în memorie, iar starea o spune), lista unei versiuni mai noi (nu se rescrie), două file peste același
 * depozit (nicio scriere pierdută, recitirea) și starea care rămâne aceeași referință până la o schimbare.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEIE_ROLURI, creeazaRoluriMele, type DepozitRoluri } from '../../src/app/roluriMele.ts';
import { operatieImplicita, type FormaDoc, type Piesa } from '../../src/model/document.ts';
import { sablonDinPiese, VERSIUNE_ROLURI, type SablonRol } from '../../src/model/rolPersonal.ts';

const DR: FormaDoc = { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 };

/** Rolul salvat dintr-un dreptunghi pe exterior, cu adâncimea dată. */
function sablon(adancime: number): SablonRol {
  const p: Piesa = {
    id: 'p', radacina: { tip: 'element', id: 'e', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, forma: DR },
    operatii: [{ ...operatieImplicita('e', DR), adancime, pas: Math.min(3, adancime) }],
  };
  const s = sablonDinPiese([p]);
  assert.ok(s.ok);
  return s.sablon;
}

/** Un `localStorage` fals, care poate arunca la citire sau la scriere. */
class Depozit implements DepozitRoluri {
  readonly date = new Map<string, string>();
  aruncaCitire = false;
  aruncaScriere = false;
  getItem(cheie: string): string | null {
    if (this.aruncaCitire) throw new Error('SecurityError');
    return this.date.get(cheie) ?? null;
  }
  setItem(cheie: string, valoare: string): void {
    if (this.aruncaScriere) throw new Error('QuotaExceededError');
    this.date.set(cheie, valoare);
  }
}

const ids = (): (() => string) => {
  let n = 0;
  return () => `r${++n}`;
};
const nume = (s: { readonly roluri: readonly { readonly nume: string }[] }): string[] => s.roluri.map((r) => r.nume);

test('dus-întors: rolul adăugat, redenumit și șters ajunge în depozit, iar o listă nouă îl citește', () => {
  const d = new Depozit();
  const a = creeazaRoluriMele(d, ids());
  assert.deepEqual(a.stare(), { roluri: [], pastrate: true, scriere: true });
  assert.deepEqual(a.adauga('Decupare', sablon(6)), { ok: true });
  assert.deepEqual(nume(creeazaRoluriMele(d, ids()).stare()), ['Decupare']);
  assert.deepEqual(a.redenumeste('r1', 'Decupare 18'), { ok: true });
  assert.deepEqual(nume(creeazaRoluriMele(d, ids()).stare()), ['Decupare 18']);
  // Un refuz nu scrie nimic.
  assert.deepEqual(a.adauga('decupare 18', sablon(2)), { ok: false, motiv: 'nume-folosit' });
  assert.deepEqual(a.sterge('r1'), { ok: true });
  assert.deepEqual(creeazaRoluriMele(d, ids()).stare().roluri, []);
  assert.equal(JSON.parse(d.date.get(CHEIE_ROLURI)!).v, VERSIUNE_ROLURI);
});

test('starea e aceeași referință până la o schimbare, iar ascultătorii o află', () => {
  const a = creeazaRoluriMele(new Depozit(), ids());
  const s0 = a.stare();
  assert.equal(a.stare(), s0);
  let anuntari = 0;
  const opreste = a.aboneaza(() => { anuntari++; });
  a.adauga('Decupare', sablon(6));
  assert.notEqual(a.stare(), s0);
  assert.equal(a.stare(), a.stare());
  assert.equal(anuntari, 1);
  // Un refuz nu schimbă starea; după oprire, ascultătorul nu mai e anunțat.
  a.adauga('Decupare', sablon(2));
  assert.equal(anuntari, 1);
  opreste();
  a.sterge('r1');
  assert.equal(anuntari, 1);
});

test('depozitul care aruncă la scriere: rolurile țin în memorie, fără să se piardă, până când scrierea merge din nou', () => {
  const d = new Depozit();
  const a = creeazaRoluriMele(d, ids());
  d.aruncaScriere = true;
  assert.deepEqual(a.adauga('Unu', sablon(6)), { ok: true });
  assert.equal(a.stare().pastrate, false);
  assert.deepEqual(a.adauga('Doi', sablon(2)), { ok: true });
  assert.deepEqual(nume(a.stare()), ['Unu', 'Doi']);
  assert.equal(d.date.size, 0);
  d.aruncaScriere = false;
  assert.deepEqual(a.adauga('Trei', sablon(1)), { ok: true });
  assert.equal(a.stare().pastrate, true);
  assert.deepEqual(nume(creeazaRoluriMele(d, ids()).stare()), ['Unu', 'Doi', 'Trei']);
});

test('fără depozit, sau unul care aruncă la citire: lista ține cât fila', () => {
  const fara = creeazaRoluriMele(null, ids());
  assert.deepEqual(fara.stare(), { roluri: [], pastrate: false, scriere: true });
  assert.deepEqual(fara.adauga('Unu', sablon(6)), { ok: true });
  assert.deepEqual([nume(fara.stare()), fara.stare().pastrate], [['Unu'], false]);
  const d = new Depozit();
  d.aruncaCitire = true;
  const b = creeazaRoluriMele(d, ids());
  assert.equal(b.stare().pastrate, false);
  assert.deepEqual(b.adauga('Unu', sablon(6)), { ok: true });
  assert.deepEqual(nume(b.stare()), ['Unu']);
});

test('lista unei versiuni mai noi: nu se citește, nu se rescrie, iar o schimbare e refuzată cu motivul ei', () => {
  const d = new Depozit();
  const text = JSON.stringify({ v: VERSIUNE_ROLURI + 1, roluri: [{ ceva: 'nou' }] });
  d.date.set(CHEIE_ROLURI, text);
  const a = creeazaRoluriMele(d, ids());
  assert.deepEqual(a.stare(), { roluri: [], pastrate: true, scriere: false });
  assert.deepEqual(a.adauga('Unu', sablon(6)), { ok: false, motiv: 'versiune' });
  assert.equal(d.date.get(CHEIE_ROLURI), text);
});

test('două file peste același depozit: fiecare schimbare recitește lista, iar recitirea aduce schimbarea celeilalte', () => {
  const d = new Depozit();
  const a = creeazaRoluriMele(d, () => 'a1');
  const b = creeazaRoluriMele(d, () => 'b1');
  assert.deepEqual(a.adauga('Din A', sablon(6)), { ok: true });
  // Fila B n-a recitit încă, dar adăugarea ei pornește de la lista din depozit: rolul din A rămâne.
  assert.deepEqual(b.adauga('Din B', sablon(2)), { ok: true });
  assert.deepEqual(nume(b.stare()), ['Din A', 'Din B']);
  assert.deepEqual(nume(a.stare()), ['Din A']);
  a.reincarca();
  assert.deepEqual(nume(a.stare()), ['Din A', 'Din B']);
  // Ștergerea din B a unui rol pe care A îl redenumește apoi: A află că nu mai e.
  assert.deepEqual(b.sterge('a1'), { ok: true });
  assert.deepEqual(a.redenumeste('a1', 'Nou'), { ok: false, motiv: 'disparut' });
});
