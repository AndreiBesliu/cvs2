/**
 * Bila din „Frezele mele” și fereastra exportului (ADR 0312 §7, cu 16.A↑b-4): rândurile ferestrei n-au bile (finisarea are un
 * rând doar de citit), deci lista bibliotecii pentru nota „s-a schimbat în bibliotecă” și pentru recunoaștere
 * (`frezePeRanduri`) le lasă afară. Altfel, copia ferestrei, care știe doar forma în V, ar face din bila Ø6 o plată Ø6, iar un
 * rând cu o plată Ø6 scrisă de mână ar fi „recunoscut” ca bila din bibliotecă (și „Ia valorile noi” ar lucra pe ea).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frezePeRanduri, sculaDinBiblioteca } from '../../src/model/alegereFreza.ts';
import type { Freza, FrezaSalvata } from '../../src/model/freza.ts';
import { stareOrigine, type FrezaOferita } from '../../src/ui/exportRand.ts';

const PLATA6: Freza = { nume: 'Plată Ø6', fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2, turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40 };
const salvata = (f: Freza, id: string): FrezaSalvata => ({ ...f, id, rev: 1, schimbatLa: 1_000 });
const BILA6 = salvata({ ...PLATA6, nume: 'Bilă Ø6', fel: 'bila', tais: undefined }, 'b6');
const V60 = salvata({ ...PLATA6, nume: 'V60 Ø6', fel: 'v', unghi: 60 }, 'v60');
const P3 = salvata({ ...PLATA6, nume: 'Plată Ø3', diametru: 3 }, 'p3');
const TOR = salvata({ ...PLATA6, nume: 'Toroidală', fel: 'toroidala', raza: 1, tais: undefined }, 't6');

/** Copia ferestrei, ca în aplicație (`ExportConectat`, `oferita`): numărul, diametrul, forma în V și originea. */
function oferita(f: FrezaSalvata): FrezaOferita {
  const s = sculaDinBiblioteca(f, f.numar);
  return {
    id: f.id, nume: f.nume, pas: f.pas, pasLateral: 2.4,
    scula: {
      numar: s.numar, diametru: s.diametru,
      ...(s.forma?.tip === 'v' ? { forma: { tip: 'v' as const, unghi: s.forma.unghi, ...(s.forma.varf !== undefined ? { varf: s.forma.varf } : {}) } } : {}),
      origine: { nume: f.nume, biblioteca: { id: f.id, rev: f.rev }, regim: { turatie: f.turatie, avans: f.avans, plonjare: f.plonjare } },
    },
  };
}

test('frezele rândurilor: cele cu CAM, fără bilă (doar a finisării) și fără felurile fără CAM încă', () => {
  assert.deepEqual(frezePeRanduri([P3, BILA6, V60, TOR]).map((f) => f.id), ['p3', 'v60']);
});

test('o plată Ø6 scrisă de mână nu e recunoscută ca bila Ø6 din bibliotecă și nu primește nota', () => {
  const loc = { unde: 'scula', origine: null, diametru: '6' } as const;
  // Pericolul: în copia ferestrei, bila pierde forma și arată ca o plată Ø6.
  assert.equal(stareOrigine(loc, [BILA6].map(oferita))?.fel, 'recunoscuta');
  // Cu lista rândurilor, nu.
  assert.equal(stareOrigine(loc, frezePeRanduri([BILA6, P3]).map(oferita)), null);
  // Martorul: o plată Ø6 din bibliotecă e recunoscută.
  assert.equal(stareOrigine(loc, frezePeRanduri([BILA6, salvata(PLATA6, 'p6')]).map(oferita))?.fel, 'recunoscuta');
});
