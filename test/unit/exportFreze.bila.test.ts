/**
 * Bila din „Frezele mele” și fereastra exportului (ADR 0312 §7, cu 16.A↑b-4): rândurile ferestrei n-au bile (finisarea are un
 * rând doar de citit), deci lista bibliotecii pentru nota „s-a schimbat în bibliotecă” și pentru recunoaștere
 * (`frezePeRanduri`) le lasă afară. Altfel, copia ferestrei, care știe doar forma în V, ar face din bila Ø6 o plată Ø6, iar un
 * rând cu o plată Ø6 scrisă de mână ar fi „recunoscut” ca bila din bibliotecă (și „Ia valorile noi” ar lucra pe ea).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frezePeRanduri, sculaDinBiblioteca } from '../../src/model/alegereFreza.ts';
import { frezaDinCopie, type CopieProiect, type Freza, type FrezaSalvata } from '../../src/model/freza.ts';
import { stareOrigine, type CopieRand, type FrezaOferita } from '../../src/ui/exportRand.ts';

const PLATA6: Freza = { nume: 'Plată Ø6', fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2, turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40 };
const salvata = (f: Freza, id: string): FrezaSalvata => ({ ...f, id, rev: 1, schimbatLa: 1_000 });
const BILA6 = salvata({ ...PLATA6, nume: 'Bilă Ø6', fel: 'bila', tais: undefined }, 'b6');
const V60 = salvata({ ...PLATA6, nume: 'V60 Ø6', fel: 'v', unghi: 60 }, 'v60');
const P3 = salvata({ ...PLATA6, nume: 'Plată Ø3', diametru: 3 }, 'p3');
const TOR = salvata({ ...PLATA6, nume: 'Toroidală', fel: 'toroidala', raza: 1, tais: undefined }, 't6');

/** Copia ferestrei, ca în aplicație (`ExportConectat`, `oferita`): numărul, diametrul, forma întreagă (din 16.A↑e-4) și originea. */
function oferita(f: FrezaSalvata): FrezaOferita {
  const s = sculaDinBiblioteca(f, f.numar);
  const forma = s.forma?.tip === 'v' ? { tip: 'v' as const, unghi: s.forma.unghi, ...(s.forma.varf !== undefined ? { varf: s.forma.varf } : {}) }
    : s.forma?.tip === 'bila' ? { tip: 'bila' as const } : s.forma?.tip === 'toroidala' ? { tip: 'toroidala' as const, raza: s.forma.raza } : undefined;
  return {
    id: f.id, nume: f.nume, pas: f.pas, pasLateral: 2.4,
    scula: {
      numar: s.numar, diametru: s.diametru, ...(forma ? { forma } : {}),
      origine: { nume: f.nume, biblioteca: { id: f.id, rev: f.rev }, regim: { turatie: f.turatie, avans: f.avans, plonjare: f.plonjare } },
    },
  };
}

test('frezele rândurilor: cele cu CAM, cu bila și toroidala din 16.A↑e-4 (rândul le poartă forma)', () => {
  assert.deepEqual(frezePeRanduri([P3, BILA6, V60, TOR]).map((f) => f.id), ['p3', 'b6', 'v60', 't6']);
});

test('o plată Ø6 scrisă de mână nu e recunoscută ca bila Ø6 din bibliotecă și nu primește nota', () => {
  const loc = { unde: 'scula', origine: null, diametru: '6' } as const;
  // Pericolul de până la 16.A↑e-4 (în copia ferestrei, bila pierdea forma și arăta ca o plată Ø6) nu mai e: copia ține forma.
  assert.equal(stareOrigine(loc, [BILA6].map(oferita)), null);
  assert.equal(stareOrigine(loc, frezePeRanduri([BILA6, P3]).map(oferita)), null);
  // Martorul: o plată Ø6 din bibliotecă e recunoscută; o bilă Ø6 scrisă de mână, ca bila.
  assert.equal(stareOrigine(loc, frezePeRanduri([BILA6, salvata(PLATA6, 'p6')]).map(oferita))?.fel, 'recunoscuta');
  const bilaMana = { ...loc, forma: { tip: 'bila' } } as const;
  assert.equal(stareOrigine(bilaMana, frezePeRanduri([salvata(PLATA6, 'p6'), BILA6]).map(oferita))?.fel === 'recunoscuta'
    ? (stareOrigine(bilaMana, frezePeRanduri([salvata(PLATA6, 'p6'), BILA6]).map(oferita)) as { freza: FrezaOferita }).freza.id : null, 'b6');
});

/**
 * „Pune-o înapoi în bibliotecă” (16.A↑b-6) și formele rotunde: din 16.A↑e-4, copia de pe un rând (`CopieRand`) și copia
 * proiectului (`CopieProiect`) țin și bila și toroidala (rândurile le poartă, ADR 0303), deci `frezaDinCopie` le dă felul lor,
 * nu o plată (paza compilatorului de până atunci a căzut, cum spunea că va cădea, și a lăsat locul acestei probe).
 */
test('copia de readus în bibliotecă ține bila și toroidala, iar freza readusă are felul lor (nu o plată)', () => {
  const r: CopieRand = { id: 'b6', rev: 1, nume: 'Bilă Ø6', numar: 2, diametru: 6, forma: { tip: 'bila' }, pas: null, pasLateral: null };
  assert.deepEqual(r.forma, { tip: 'bila' });
  const p: CopieProiect = { nume: 'Bilă Ø6', numar: 2, diametru: 6, forma: { tip: 'bila' }, pas: null, pasLateral: null };
  assert.equal(frezaDinCopie(p).fel, 'bila');
  const t: CopieProiect = { nume: 'Toroidală Ø6 r1', numar: 2, diametru: 6, forma: { tip: 'toroidala', raza: 1 }, pas: null, pasLateral: null };
  assert.deepEqual([frezaDinCopie(t).fel, frezaDinCopie(t).raza], ['toroidala', 1]);
  // Martorul: forma în V trece și rămâne V la readucere.
  const v: CopieProiect = { nume: 'V60 Ø6', numar: 3, diametru: 6, forma: { tip: 'v', unghi: 60 }, pas: 2, pasLateral: null };
  assert.equal(frezaDinCopie(v).fel, 'v');
  assert.equal(frezaDinCopie({ ...v, forma: { tip: 'v', unghi: 60, varf: 0.2 } }).fel, 'gravare');
});
