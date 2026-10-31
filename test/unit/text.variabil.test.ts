import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aseazaText } from '../../src/text/asezare.ts';
import { acoperire, citesteFont, Octeti, type Font, type RezultatFont } from '../../src/text/font.ts';
import { tabele } from '../../src/text/sfnt.ts';
import {
  axeFvar, delteImpachetate, factorRegiune, hartaIndici, hartiAvar, iup, magazinVariatii, normalizeaza, puncteImpachetate,
} from '../../src/text/variatii.ts';

/**
 * Instanțele fonturilor variabile (ADR 0113), față de instancer-ul lui fontTools (`test/oracles-py/text_corpus.py`, fixtura
 * `variabile.json`): Roboto Flex (13 axe, `avar`, `gvar`, `HVAR`, crenarea variabilă) la fiecare instanță numită, la
 * colțurile axelor (fiecare singură, apoi toate odată), cu `avar` (opsz între punctele hărții) și într-un amestec cu
 * regiunile intermediare pornite; variantele lui: fără `HVAR` și fără H (avansul din punctele fantomă, majuscula din `cpht`
 * al lui `MVAR`) și cu componentele altfel (una pusă pe puncte, cu delte care nu contează; una 2 × 2 cu deplasarea scalată;
 * `gvar` cu offseturi lungi). Contururile brute sub 1e-9 unități; avansurile (din HVAR, ca `VarStoreInstancer`, sau din
 * punctele fantomă, ca instancer-ul), crenarea și metricile exact; coordonatele normalizate exact.
 *
 * Apoi bucățile, pe octeți scriși de mână, cu valorile pe hârtie: punctele și deltele împachetate, factorul unei regiuni, IUP,
 * magazinul de variații, harta indicilor, normalizarea cu `avar`; și refuzurile.
 */

type Loc = {
  readonly nume: string; readonly instanta: number | null; readonly coordonate: Readonly<Record<string, number>> | null;
  readonly normalizate: readonly number[];
  readonly metrici: { readonly urcare: number; readonly coborare: number; readonly spatiuRanduri: number; readonly majuscula: number };
  readonly avansuri: Readonly<Record<string, number>>;
  readonly setCrenare: string;
  readonly crenari: Readonly<Record<string, number>>;
  readonly glife: Readonly<Record<string, number[][][]>>;
};
type FontVariabil = {
  readonly axe: readonly { readonly tag: string; readonly min: number; readonly implicit: number; readonly max: number }[];
  readonly instante: readonly { readonly stil: string; readonly postscript: string | null; readonly implicita: boolean; readonly coordonate: Readonly<Record<string, number>> }[];
  readonly locuri: readonly Loc[];
};

const RAD = new URL('../../', import.meta.url);
const octeti = (cale: string): Uint8Array => new Uint8Array(readFileSync(new URL(cale, RAD)));
const VARIABILE = JSON.parse(readFileSync(new URL('test/fixtures/text/variabile.json', RAD), 'utf8')) as Readonly<Record<string, FontVariabil>>;
const FLEX = 'test/fixtures/text/roboto-flex-subset.ttf';
const ok = (r: RezultatFont): Font => {
  if (!r.ok) throw new Error(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
  return r.font;
};
const cod = (ch: string): number => ch.codePointAt(0)!;

for (const [fisier, fv] of Object.entries(VARIABILE)) {
  test(`fontul variabil ${fisier}: axele și instanțele numite (cu coordonatele lor), ca fontTools`, () => {
    const f = ok(citesteFont(octeti(fisier)));
    assert.deepEqual(f.axe, fv.axe);
    assert.deepEqual(f.instante, fv.instante);
  });

  for (const loc of fv.locuri) {
    test(`fontul variabil ${fisier} la ${loc.nume}: contururile, avansurile, crenarea și metricile, ca fontTools`, () => {
      const b = octeti(fisier);
      const coordonate = loc.coordonate ?? fv.instante[loc.instanta!]!.coordonate;
      // Coordonatele normalizate (avar, apoi F2Dot14), exact.
      const o = new Octeti(b);
      const t = tabele(o, 0);
      const axe = axeFvar(o, t)!;
      assert.deepEqual(normalizeaza(axe, hartiAvar(o, t, axe.length)?.harti ?? null, coordonate), loc.normalizate);
      // O instanță numită, după indicele ei; restul, după coordonate.
      const f = ok(citesteFont(b, 0, loc.instanta ?? coordonate));
      assert.deepEqual([f.urcare, f.coborare, f.spatiuRanduri], [loc.metrici.urcare, loc.metrici.coborare, loc.metrici.spatiuRanduri]);
      assert.ok(Math.abs(f.majuscula - loc.metrici.majuscula) < 1e-9, `majuscula ${f.majuscula} față de ${loc.metrici.majuscula}`);
      for (const [ch, a] of Object.entries(loc.avansuri)) assert.equal(f.avans(f.glifa(cod(ch))), a, `avansul lui ${ch}`);
      let nenule = 0;
      for (const a of loc.setCrenare) {
        for (const c of loc.setCrenare) {
          const v = f.crenare(f.glifa(cod(a)), f.glifa(cod(c)));
          assert.equal(v, loc.crenari[a + c] ?? 0, `crenarea ${a}${c}`);
          if (v !== 0) nenule++;
        }
      }
      assert.equal(nenule, Object.keys(loc.crenari).length);
      for (const [ch, contururi] of Object.entries(loc.glife)) {
        const g = f.contururi(f.glifa(cod(ch)));
        assert.ok(g, ch);
        assert.equal(g.length, contururi.length, `${ch}: contururile`);
        contururi.forEach((c, j) => {
          assert.equal(g[j]!.length, c.length, `${ch} conturul ${j}`);
          c.forEach(([x, y, pe], k) => {
            const q = g[j]![k]!;
            assert.ok(Math.abs(q.x - x!) < 1e-9 && Math.abs(q.y - y!) < 1e-9 && q.peCurba === (pe === 1), `${ch} ${j}.${k}: ${q.x}, ${q.y} față de ${x}, ${y}`);
          });
        });
      }
    });
  }
}

test('fixtura acoperă: toate instanțele numite, colțurile fiecărei axe și al tuturor, avar, regiunile intermediare, fără HVAR', () => {
  const flex = VARIABILE[FLEX]!;
  assert.deepEqual(flex.locuri.filter((l) => l.instanta !== null).map((l) => l.instanta), flex.instante.map((_, k) => k));
  const nume = new Set(flex.locuri.map((l) => l.nume));
  for (const n of ['colt-min', 'colt-max', 'wght-min', 'wght-max', 'wdth-min', 'wdth-max', 'opsz-min', 'opsz-max', 'avar-opsz', 'amestec', 'intermediar']) {
    assert.ok(nume.has(n), n);
  }
  // La colțuri, fiecare axă stă la o margine: −1 sau 1, normalizat (0 pe o axă a cărei margine e chiar valoarea implicită).
  for (const n of ['colt-min', 'colt-max'] as const) {
    const l = flex.locuri.find((x) => x.nume === n)!;
    assert.deepEqual(l.normalizate, flex.axe.map((a) => (n === 'colt-min' ? (a.min === a.implicit ? 0 : -1) : a.max === a.implicit ? 0 : 1)));
  }
  assert.ok(!readFileSync(new URL('test/fixtures/text/roboto-flex-fantoma.ttf', RAD)).includes('HVAR'));
});

test('instanța implicită: aceleași contururi și avansuri ca fontul citit fără instanță; în afara axelor, la margini', () => {
  const b = octeti(FLEX);
  const f = ok(citesteFont(b)), implicit = ok(citesteFont(b, 0, {})), regular = ok(citesteFont(b, 0, 3));
  const max = ok(citesteFont(b, 0, { wght: 1000 })), peste = ok(citesteFont(b, 0, { wght: 5000, nimic: 7 }));
  for (const ch of 'HĂșO0') {
    const g = f.glifa(cod(ch));
    assert.deepEqual(implicit.contururi(g), f.contururi(g), ch);
    assert.deepEqual(regular.contururi(g), f.contururi(g), ch);
    assert.equal(implicit.avans(g), f.avans(g), ch);
    assert.deepEqual(peste.contururi(g), max.contururi(g), ch);
    assert.notDeepEqual(max.contururi(g), f.contururi(g), ch);
  }
});

test('o instanță numită care nu există: refuzată; un font fix n-are instanțe (coordonatele nu schimbă nimic)', () => {
  assert.deepEqual(citesteFont(octeti(FLEX), 0, 20), { ok: false, cod: 'fata-lipsa', detaliu: 'instanța 20 din 20' });
  const roboto = octeti('public/fonturi/roboto.ttf');
  assert.deepEqual(citesteFont(roboto, 0, 0), { ok: false, cod: 'fata-lipsa', detaliu: 'instanța 0 din 0' });
  const r = ok(citesteFont(roboto)), c = ok(citesteFont(roboto, 0, { wght: 700 }));
  assert.equal(c.axe, null);
  assert.deepEqual(c.contururi(c.glifa(0x41)), r.contururi(r.glifa(0x41)));
});

/** Octeții fontului cu tabelul `tag` schimbat de `schimba` (primește octeții și poziția tabelului). */
function cuTabel(b: Uint8Array, tag: string, schimba: (c: Uint8Array, pos: number) => void): Uint8Array {
  const c = new Uint8Array(b);
  const v = new DataView(c.buffer);
  for (let k = 0; k < v.getUint16(4); k++) {
    const r = 12 + 16 * k;
    if (String.fromCharCode(c[r]!, c[r + 1]!, c[r + 2]!, c[r + 3]!) === tag) schimba(c, v.getUint32(r + 8));
  }
  return c;
}

test('refuzurile instanțelor: avar 2 (variațiile hărții nu se citesc), gvar cu alt număr de axe; fontul implicit rămâne', () => {
  const b = octeti(FLEX);
  const avar2 = cuTabel(b, 'avar', (c, p) => { c[p + 1] = 2; });
  assert.deepEqual(citesteFont(avar2, 0, 6), { ok: false, cod: 'variatii', detaliu: 'avar 2' });
  assert.ok(citesteFont(avar2).ok);
  const gvar = cuTabel(b, 'gvar', (c, p) => { c[p + 5] = 12; });
  const r = citesteFont(gvar, 0, 6);
  assert.ok(!r.ok && r.cod === 'stricat' && /gvar: 12 axe/.test(r.detaliu ?? ''), JSON.stringify(r));
  assert.ok(citesteFont(gvar).ok);
});

/** Poziția în fișier a dispozitivului perechii (a, c), în primul subtabel de perechi (formatul 1) al crenării lui Roboto Flex. */
function dispozitivPereche(b: Uint8Array, a: number, c: number): number {
  const o = new Octeti(b);
  const gpos = tabele(o, 0).get('GPOS')!.pos;
  const cautari = gpos + o.u16(gpos + 8);
  const cautare = cautari + o.u16(cautari + 2);
  const st = cautare + o.u16(cautare + 6);
  assert.deepEqual([o.u16(st), o.u16(st + 4)], [1, 0x44], 'perechi anume, cu XAdvance și dispozitivul lui');
  const set = st + o.u16(st + 10 + 2 * acoperire(o, st + o.u16(st + 2), a));
  for (let i = 0; i < o.u16(set); i++) if (o.u16(set + 2 + 6 * i) === c) return set + o.u16(set + 6 + 6 * i);
  throw new Error('perechea lipsește');
}

test('crenarea: un dispozitiv de hinting (nu de variații) nu contează, perechea rămâne cu XAdvance ei', () => {
  const b = octeti(FLEX);
  const f = ok(citesteFont(b));
  const A = f.glifa(0x41), V = f.glifa(0x56);
  const p = dispozitivPereche(b, A, V);
  const hinting = new Uint8Array(b);
  hinting.set([0, 1], p + 4);
  const bold = VARIABILE[FLEX]!.locuri.find((l) => l.nume === 'Bold')!;
  assert.equal(ok(citesteFont(b, 0, 6)).crenare(A, V), bold.crenari['AV']);
  assert.notEqual(bold.crenari['AV'], f.crenare(A, V));
  assert.equal(ok(citesteFont(hinting, 0, 6)).crenare(A, V), f.crenare(A, V));
});

test('așezarea la o instanță: același text, cu crenarea și avansurile instanței (Bold e mai lat decât Thin)', () => {
  const b = octeti(FLEX);
  const p = { continut: 'AVATAR To Wa', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' } as const;
  const lat = (f: Font): number => aseazaText(f, p).linii[0]!.latime;
  const thin = ok(citesteFont(b, 0, 0)), bold = ok(citesteFont(b, 0, 6));
  assert.ok(lat(bold) > lat(thin), `${lat(bold)} față de ${lat(thin)}`);
  // Aceeași lățime ca din avansurile și crenarea instanței, adunate aici (fără spațierea în plus).
  const mm = (u: number): number => (u * 20) / bold.majuscula;
  let x = 0, ant = -1;
  for (const ch of p.continut) {
    const g = bold.glifa(cod(ch));
    if (ant >= 0) x += mm(bold.crenare(ant, g));
    x += mm(bold.avans(g));
    ant = g;
  }
  assert.ok(Math.abs(lat(bold) - x) < 1e-9);
});

// Pe octeți scriși de mână.
const u8 = (...v: number[]): Octeti => new Octeti(new Uint8Array(v));
const u16 = (...v: number[]): number[] => v.flatMap((x) => [(x >> 8) & 0xff, x & 0xff]);
const u32 = (...v: number[]): number[] => v.flatMap((x) => [(x >>> 24) & 0xff, (x >> 16) & 0xff, (x >> 8) & 0xff, x & 0xff]);
const f2 = (v: number): number => Math.round(v * 16384) & 0xffff;

test('punctele împachetate: toate (0), pe octet cu numere cumulate, numărul pe doi octeți și punctele pe cuvânt, mai multe șiruri', () => {
  assert.deepEqual(puncteImpachetate(u8(0x00, 0x7f), 0), { puncte: null, capat: 1 });
  assert.deepEqual(puncteImpachetate(u8(0x03, 0x02, 1, 2, 3), 0), { puncte: [1, 3, 6], capat: 5 });
  assert.deepEqual(puncteImpachetate(u8(0x80, 0x02, 0x81, ...u16(256, 5)), 0), { puncte: [256, 261], capat: 7 });
  // Două șiruri: 2 pe octet (4, 1), apoi 2 pe cuvânt (300, 2): numerele continuă de la un șir la altul.
  assert.deepEqual(puncteImpachetate(u8(9, 0x04, 0x01, 4, 1, 0x81, ...u16(300, 2)), 1), { puncte: [4, 5, 305, 307], capat: 10 });
});

test('deltele împachetate: zero, cuvinte, octeți și numere pe 32 de biți; un șir care trece de număr e o greșeală', () => {
  const o = u8(0x81, 0x41, ...u16(0xfffe, 256), 0x01, 5, 0xfb, 0xc0, ...u32(65536));
  assert.deepEqual(delteImpachetate(o, 0, 7), { delte: [0, 0, -2, 256, 5, -5, 65536], capat: 14 });
  assert.throws(() => delteImpachetate(u8(0x01, 5, 6), 0, 1), /2 delte în loc de 1/);
});

test('factorul unei regiuni: vârful, marginile, regiunea intermediară, axa care nu contează (vârf 0, greșită, peste zero)', () => {
  const r = (c: number, a: number, p: number, b: number): number => factorRegiune([c], [a], [p], [b]);
  assert.deepEqual([r(0.5, 0, 1, 1), r(1, 0, 1, 1), r(0, 0, 1, 1), r(-0.5, 0, 1, 1), r(-0.25, -1, -1, 0)], [0.5, 1, 0, 0, 0.25]);
  assert.deepEqual([r(0.375, 0.25, 0.5, 0.75), r(0.625, 0.25, 0.5, 0.75), r(0.75, 0.25, 0.5, 0.75), r(0.25, 0.25, 0.5, 0.75)], [0.5, 0.5, 0, 0]);
  // Vârful 0, regiunea greșită (începutul după vârf) și cea peste zero: axa nu contează (factorul 1), ca în specificație.
  assert.deepEqual([r(0.3, 0, 0, 0), r(0.3, 0.6, 0.5, 0.8), r(0.3, -0.5, 0.5, 1)], [1, 1, 1]);
  // Pe două axe: produsul.
  assert.equal(factorRegiune([0.5, 0.25], [0, 0], [1, 0.5], [1, 0.5]), 0.25);
});

test('IUP pe un contur: interpolat între vecinii cu deltă (și peste capăt), lângă ei în afară, 0 la coordonate egale cu delte diferite', () => {
  // Un pătrat cu un punct pe fiecare latură: (0,0) (50,0) (100,0) (100,100) (50,100) (0,100); delte pe 0 și 3.
  const x0 = [0, 50, 100, 100, 50, 0], y0 = [0, 0, 0, 100, 100, 100];
  const d = new Float64Array(12), are = new Uint8Array(6);
  d.set([10, 20], 0);
  d.set([30, -20], 6);
  are[0] = 1;
  are[3] = 1;
  iup(x0, y0, d, are, 0, 6);
  // x: între 0 (10) și 100 (30), liniar; y: între 0 (20) și 100 (−20); punctele 1, 2 pe y = 0: delta lui 0.
  assert.deepEqual([...d], [10, 20, 20, 20, 30, 20, 30, -20, 20, -20, 10, -20]);
  // Un singur punct cu deltă: toate o primesc. Niciunul: zero.
  const d1 = new Float64Array(6), a1 = new Uint8Array(3);
  d1.set([4, 5], 2);
  a1[1] = 1;
  iup([0, 10, 20], [0, 0, 0], d1, a1, 0, 3);
  assert.deepEqual([...d1], [4, 5, 4, 5, 4, 5]);
  // Două puncte de referință pe aceeași verticală (x egal), cu delte x diferite: punctele dintre ele primesc 0 pe x.
  const d2 = new Float64Array(6), a2 = new Uint8Array(3);
  d2.set([1, 0], 0);
  d2.set([3, 0], 4);
  a2[0] = 1;
  a2[2] = 1;
  iup([5, 7, 5], [0, 5, 10], d2, a2, 0, 3);
  assert.deepEqual([...d2], [1, 0, 0, 0, 3, 0]);
});

test('magazinul de variații: două regiuni, delte pe cuvânt și pe octet (și lungi), elementele din afara lui dau 0', () => {
  // Formatul 1; regiunile: 1 axă, (0, 1, 1) și (−1, −1, 0); datele: 2 elemente, 1 cuvânt, regiunile 0 și 1.
  const magazin = (lungi: boolean): number[] => [
    ...u16(1), ...u32(12), ...u16(1), ...u32(28),
    ...u16(1, 2, f2(0), f2(1), f2(1), f2(-1), f2(-1), f2(0)),
    ...u16(2, lungi ? 0x8001 : 1, 2, 0, 1),
    ...(lungi ? [...u32(100), ...u16(0xffec), ...u32(0xfffffed4), ...u16(7)] : [...u16(100), 0xec, ...u16(0xfed4), 7]),
  ];
  for (const lungi of [false, true]) {
    const sus = magazinVariatii(new Octeti(new Uint8Array(magazin(lungi))), 0, [0.5]);
    assert.deepEqual([sus(0, 0), sus(0, 1), sus(0, 2), sus(1, 0)], [50, -150, 0, 0], `lungi ${lungi}`);
    const jos = magazinVariatii(new Octeti(new Uint8Array(magazin(lungi))), 0, [-0.25]);
    assert.deepEqual([jos(0, 0), jos(0, 1)], [-5, 1.75], `lungi ${lungi}`);
  }
});

test('harta indicilor: formatul 0 (intrări pe doi octeți, 4 biți interiori), formatul 1, după ultima intrare, goală', () => {
  const h0 = hartaIndici(u8(0, 0x13, ...u16(3), ...u16(0x0012, 0x0035, 0x0101)), 0);
  assert.deepEqual([0, 1, 2, 9].map(h0), [[1, 2], [3, 5], [16, 1], [16, 1]]);
  const h1 = hartaIndici(u8(1, 0x00, ...u32(1), 0x03), 0);
  assert.deepEqual(h1(0), [1, 1]);
  assert.deepEqual(hartaIndici(u8(0, 0x00, ...u16(0)), 0)(70000), [1, 4464]);
});

test('normalizarea: tăiată la margini, liniară față de implicit, prin harta avar (exact, între, în afara perechilor), apoi F2Dot14', () => {
  const axe = [{ tag: 'wght', min: 100, implicit: 400, max: 900 }, { tag: 'wdth', min: 50, implicit: 100, max: 100 }];
  const harta = new Map([[-1, -1], [0, 0], [0.5, 0.8], [1, 1]]);
  const n = (c: Record<string, number>): number[] => normalizeaza(axe, [harta, new Map()], c);
  // 650 = 0,5 (pe hartă: 0,8); 525 = 0,25 (între 0 și 0,5: 0,4); 50 și 1000 se taie; wdth 75 = −0,5 (fără hartă).
  assert.deepEqual(n({ wght: 650, wdth: 75 }), [13107 / 16384, -0.5]);
  assert.deepEqual(n({ wght: 525 }), [6554 / 16384, 0]);
  assert.deepEqual(n({ wght: 50, wdth: 200 }), [-1, 0]);
  assert.deepEqual(n({ wght: 1000, wdth: 50 }), [1, -1]);
  // O hartă fără −1 și 1: dincolo de perechi, mutată cu ultima diferență (0,75 + 0,6 − 0,5 = 0,85).
  assert.deepEqual(normalizeaza(axe.slice(0, 1), [new Map([[0, 0], [0.5, 0.6]])], { wght: 775 }), [Math.floor(0.85 * 16384 + 0.5) / 16384]);
});
