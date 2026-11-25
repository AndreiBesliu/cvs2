import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lipestePunct, type FelPunct, type OptiuniPuncte, type PunctTinta, type SursaPuncte } from '../../src/geom/lipirePuncte.ts';
import { indexLume, punctAncora } from '../../src/model/cote.ts';
import { documentNou, type Document, type LegaturaCota } from '../../src/model/document.ts';
import { puncteFoaie, surseCote } from '../../src/model/puncteCote.ts';

/**
 * Lipirea pe puncte (ADR 0330 §5), pură, pe hârtie: fiecare fel de punct, toleranța, ținta cea mai apropiată, ordinea la
 * egalitate, felurile oprite, punctul de pe contur, grila, foaia și indexul cutiilor (o formă departe nu-și face punctele).
 * Un punct lipit de o formă duce legătura lui, iar cota îl citește înapoi exact în același loc (aceeași funcție, `punctLoc`).
 *
 * Documentul (ca în `cote.model.test.ts`): piesa „p”, pusă o dată (instanța „i1”) la (10, 20), rotită cu 90°, deci
 * (x, y) → (10 − y, 20 + x): „r” dreptunghiul 100 × 50 (colțurile în lume (10,20), (10,120), (−40,120), (−40,20)), „c” cercul
 * R10 cu centrul (150, 25) în piesă, deci (−15, 170) în lume, „a” calea (200,0) → (240,0), apoi semicercul până în (240,40).
 */
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
function document(): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const f = d.foi[0];
  if (!f) throw new Error('fără foaie');
  return {
    ...d,
    piese: [{
      id: 'p', operatii: [],
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
          { tip: 'element', id: 'r', matrice: { ...ID }, forma: { tip: 'dreptunghi', latime: 100, inaltime: 50, razaColt: 0 } },
          { tip: 'element', id: 'c', matrice: { ...ID, e: 150, f: 25 }, forma: { tip: 'cerc', raza: 10 } },
          {
            tip: 'element', id: 'a', matrice: { ...ID }, forma: {
              tip: 'cale', inchis: false, varfuri: [
                { p: { x: 200, y: 0 }, s: { tip: 'L' } }, { p: { x: 240, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 240, y: 40 }, s: { tip: 'L' } },
              ],
            },
          },
        ],
      },
    }],
    foi: [{ ...f, instante: [{ id: 'i1', piesa: 'p', x: 10, y: 20, rotire: 90 }] }],
  };
}

const doc = document();
const surse = surseCote(doc, 0);
const foaie = puncteFoaie(300, 200);
const TOATE: ReadonlySet<FelPunct> = new Set(['varf', 'mijloc', 'centru', 'cadran', 'cutie', 'foaie', 'grila']);
const opt = (o: Partial<OptiuniPuncte> = {}): OptiuniPuncte => ({ toleranta: 1, felurile: TOATE, grila: null, peContur: false, ...o });
const lipeste = (x: number, y: number, o: Partial<OptiuniPuncte> = {}): PunctTinta<LegaturaCota> | null => lipestePunct(surse, foaie, { x, y }, opt(o));
const aproape = (a: { x: number; y: number }, x: number, y: number, unde: string): void => {
  assert.ok(Math.abs(a.x - x) < 1e-9 && Math.abs(a.y - y) < 1e-9, `${unde}: (${a.x}, ${a.y}), nu (${x}, ${y})`);
};
/** Legătura dată de lipire, citită înapoi de cotă: același punct, starea „legată”. */
const inapoi = (r: PunctTinta<LegaturaCota> | null): void => {
  assert.ok(r?.date, 'lipit de o formă, cu legătura');
  const q = punctAncora({ x: -999, y: -999, legatura: r.date }, indexLume(doc, 0));
  assert.equal(q.stare, 'legata');
  aproape(q.p, r.p.x, r.p.y, 'legătura citită înapoi');
};

test('vârful: lipit exact, cu legătura lui (vârful 1 al dreptunghiului, (100, 0) în piesă)', () => {
  const r = lipeste(10.4, 119.7);
  assert.equal(r?.fel, 'varf');
  aproape(r?.p ?? { x: 0, y: 0 }, 10, 120, 'vârful');
  assert.deepEqual(r?.date, { instanta: 'i1', nod: 'r', loc: { fel: 'varf', k: 1 }, n: 4 });
  inapoi(r);
});

test('mijlocul unei laturi, centrul și cadranele cercului, mijlocul și centrul unui arc din cale', () => {
  const m = lipeste(10.3, 70.2);
  assert.equal(m?.fel, 'mijloc');
  aproape(m?.p ?? { x: 0, y: 0 }, 10, 70, 'mijlocul laturii de jos');
  assert.deepEqual(m?.date?.loc, { fel: 'mijloc', k: 0 });
  inapoi(m);
  const c = lipeste(-14.6, 170.3);
  assert.equal(c?.fel, 'centru');
  aproape(c?.p ?? { x: 0, y: 0 }, -15, 170, 'centrul cercului');
  inapoi(c);
  for (const [x, y] of [[-15, 180], [-25, 170], [-15, 160], [-5, 170]] as const) {
    const q = lipeste(x + 0.3, y - 0.2);
    assert.equal(q?.fel, 'cadran', `cadranul (${x}, ${y})`);
    aproape(q?.p ?? { x: 0, y: 0 }, x, y, 'cadranul');
    inapoi(q);
  }
  // Mijlocul semicercului din cale, (260, 20) în piesă, e și cadranul lui (și mijlocul de sus al cutiei căii): la egalitate,
  // cadranul; fără cadrane, mijlocul (care bate cutia).
  assert.equal(lipeste(-10.5, 279.6)?.fel, 'cadran');
  const am = lipeste(-10.5, 279.6, { felurile: new Set([...TOATE].filter((f) => f !== 'cadran')) });
  assert.equal(am?.fel, 'mijloc');
  aproape(am?.p ?? { x: 0, y: 0 }, -10, 280, 'mijlocul arcului (260, 20) în piesă');
  inapoi(am);
  const ac = lipeste(-10.2, 259.5);
  assert.equal(ac?.fel, 'centru');
  aproape(ac?.p ?? { x: 0, y: 0 }, -10, 260, 'centrul arcului (240, 20) în piesă');
  inapoi(ac);
});

test('cadranele unui arc: doar cele de pe arc (semicercul din cale n-are cadranul din partea goală)', () => {
  // Semicercul din cale: centrul (240, 20) în piesă, de la (240, 0) la (240, 40) prin (260, 20). Cadranul spre −x în piesă,
  // (220, 20), nu e pe arc: în lume (−10, 240), unde nu e niciun alt punct.
  assert.equal(lipeste(-10.2, 240.1), null);
});

test('cutia: centrul ei; un colț al cutiei care e și vârf rămâne vârf (la egalitate: centrul, cadranul, vârful, mijlocul, cutia, foaia, grila)', () => {
  const k = lipeste(-15.3, 70.4);
  assert.equal(k?.fel, 'cutie');
  aproape(k?.p ?? { x: 0, y: 0 }, -15, 70, 'centrul cutiei');
  assert.deepEqual(k?.date, { instanta: 'i1', nod: 'r', loc: { fel: 'cutie', i: 4 }, n: 4 });
  inapoi(k);
  const v = lipeste(-39.8, 20.2);
  assert.equal(v?.fel, 'varf', 'colțul (−40, 20) e vârful (0, 50) al dreptunghiului');
  assert.deepEqual(v?.date?.loc, { fel: 'varf', k: 3 });
});

test('toleranța și ținta cea mai apropiată', () => {
  assert.equal(lipeste(11.01, 120)?.fel, undefined, 'la 1,01 mm de vârf, cu toleranța 1 mm: nimic');
  assert.equal(lipeste(10.99, 120)?.fel, 'varf');
  // În cutia lărgită a formei (deci judecat), dar la 1,13 mm de vârf: nimic.
  assert.equal(lipeste(10.8, 120.8), null);
  // Între vârful (10, 120) și mijlocul (10, 70): la (10, 96) mijlocul e la 26, vârful la 24. Mijlocul laturii din stânga a
  // foii, (0, 100), e la 10,8: fără foaie, deci.
  assert.equal(lipeste(10, 96, { toleranta: 30 })?.fel, 'foaie');
  const r = lipeste(10, 96, { toleranta: 30, felurile: new Set([...TOATE].filter((f) => f !== 'foaie')) });
  assert.equal(r?.fel, 'varf');
  aproape(r?.p ?? { x: 0, y: 0 }, 10, 120, 'cel mai apropiat');
});

test('felurile oprite nu lipesc; fără vârfuri, colțul cutiei ia locul vârfului', () => {
  const fara = new Set<FelPunct>([...TOATE].filter((f) => f !== 'varf'));
  const r = lipeste(-39.8, 20.2, { felurile: fara });
  assert.equal(r?.fel, 'cutie');
  assert.deepEqual(r?.date?.loc, { fel: 'cutie', i: 0 });
  assert.equal(lipeste(10.4, 119.7, { felurile: new Set(['mijloc']) }), null);
});

test('punctul cel mai apropiat de pe contur (Ctrl): doar când nu e un punct numit aproape, și fără legătură', () => {
  assert.equal(lipeste(10.4, 95), null, 'fără Ctrl, mijlocul laturii nu lipește nimic');
  const r = lipeste(10.4, 95, { peContur: true });
  assert.equal(r?.fel, 'contur');
  aproape(r?.p ?? { x: 0, y: 0 }, 10, 95, 'proiecția pe latura de jos');
  assert.equal(r?.date, null, 'un punct oarecare de pe contur e liber');
  assert.equal(lipeste(10.4, 119.7, { peContur: true })?.fel, 'varf', 'un punct numit bate conturul');
  // Pe arcul din cale: proiecția radială pe cerc (centrul (−10, 260), R20), la 45°.
  const s = Math.SQRT1_2 * 20;
  const a = lipeste(-10 - s - 0.3, 260 + s + 0.3, { peContur: true });
  assert.equal(a?.fel, 'contur');
  aproape(a?.p ?? { x: 0, y: 0 }, -10 - s, 260 + s, 'pe arc');
});

test('grila și foaia: grila doar pornită și doar unde nu e nimic altceva; colțurile, mijloacele și centrul foii', () => {
  assert.equal(lipeste(201, 99.5), null);
  const g = lipeste(201, 99.5, { grila: 10, toleranta: 2 });
  assert.equal(g?.fel, 'grila');
  aproape(g?.p ?? { x: 0, y: 0 }, 200, 100, 'nodul grilei');
  assert.equal(g?.date, null);
  const fg = new Set<FelPunct>([...TOATE].filter((f) => f !== 'grila'));
  assert.equal(lipeste(201, 99.5, { grila: 10, toleranta: 2, felurile: fg }), null, 'grila debifată');
  const f = lipeste(299.4, 199.5);
  assert.equal(f?.fel, 'foaie');
  aproape(f?.p ?? { x: 0, y: 0 }, 300, 200, 'colțul foii');
  aproape(lipeste(150.3, 0.4)?.p ?? { x: 0, y: 0 }, 150, 0, 'mijlocul laturii de jos a foii');
  aproape(lipeste(150.3, 100.4)?.p ?? { x: 0, y: 0 }, 150, 100, 'centrul foii');
  // Foaia bate grila la egalitate: colțul (300, 200) e și nod al grilei.
  assert.equal(lipeste(299.4, 199.5, { grila: 10, toleranta: 2 })?.fel, 'foaie');
});

test('indexul cutiilor: o formă departe de cursor nu-și face punctele', () => {
  let cerute = 0;
  const departe: SursaPuncte<null> = {
    cutie: { minX: 1000, minY: 1000, maxX: 1100, maxY: 1100 },
    puncte: () => { cerute += 1; return [{ p: { x: 1000, y: 1000 }, fel: 'varf', date: null }]; },
  };
  const langa: SursaPuncte<null> = {
    cutie: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    puncte: () => [{ p: { x: 10, y: 10 }, fel: 'varf', date: null }],
  };
  const r = lipestePunct([departe, langa], [], { x: 10.5, y: 10.5 }, opt());
  assert.equal(r?.fel, 'varf');
  assert.equal(cerute, 0);
  // La marginea cutiei lărgite cu toleranța: punctele se cer.
  lipestePunct([departe], [], { x: 999.2, y: 999.2 }, opt());
  assert.equal(cerute, 1);
});

test('surseCote: punctele unei forme se fac o singură dată (un import mare rămâne repede)', () => {
  const s = surseCote(doc, 0);
  const r = s.find((x) => x.cutie.minX === -40 && x.cutie.maxY === 120);
  assert.ok(r);
  assert.equal(r.puncte(), r.puncte(), 'aceeași listă, ținută');
});

test('o formă cu 20 000 de vârfuri: punctele ei se fac într-o clipă, iar o mișcare a mausului după aceea, încă mai repede', () => {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const f = d.foi[0];
  assert.ok(f);
  const varfuri = Array.from({ length: 20_000 }, (_, k) => ({ p: { x: k * 0.01, y: (k % 2) * 0.5 }, s: k % 3 === 0 ? { tip: 'A' as const, bulge: 0.2 } : { tip: 'L' as const } }));
  const mare: Document = {
    ...d,
    piese: [{ id: 'p', operatii: [], radacina: { tip: 'element', id: 'e', matrice: { ...ID }, forma: { tip: 'cale', inchis: false, varfuri } } }],
    foi: [{ ...f, instante: [{ id: 'i1', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
  const s = surseCote(mare, 0);
  const t0 = performance.now();
  const r = lipestePunct(s, [], { x: 100.004, y: 0.001 }, opt({ toleranta: 0.01 }));
  const t1 = performance.now();
  lipestePunct(s, [], { x: 50.004, y: 0.001 }, opt({ toleranta: 0.01, peContur: true }));
  const t2 = performance.now();
  assert.equal(r?.fel, 'varf');
  assert.ok(t1 - t0 < 1500, `prima: ${(t1 - t0).toFixed(0)} ms`);
  assert.ok(t2 - t1 < 500, `a doua, cu conturul: ${(t2 - t1).toFixed(0)} ms`);
});

test('un relief (ADR 0310 §1): lipirea pe chenarul grilei (colțurile, mijloacele laturilor, centrul cutiei), citită înapoi la fel', () => {
  // 200 × 100 de celule de 0,5 mm (100 × 50 mm), puse la (20, 30) fără rotire: chenarul are colțurile (20, 30) și (120, 80).
  const d0 = documentNou({ latime: 300, inaltime: 200, grosime: 18 }), f = d0.foi[0];
  if (!f) throw new Error('fără foaie');
  const d: Document = {
    ...d0,
    piese: [{
      id: 'q', operatii: [], radacina: {
        tip: 'grup', id: 'g', matrice: { ...ID }, copii: [{
          tip: 'element', id: 'r1', matrice: { ...ID },
          forma: { tip: 'relief', nx: 200, ny: 100, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: 'c'.repeat(64) }] },
        }],
      },
    }],
    foi: [{ ...f, instante: [{ id: 'j1', piesa: 'q', x: 20, y: 30, rotire: 0 }] }],
  };
  const s = surseCote(d, 0), idx = indexLume(d, 0);
  const lipit = (x: number, y: number): PunctTinta<LegaturaCota> | null => lipestePunct(s, foaie, { x, y }, opt());
  for (const [x, y, fel, px, py] of [
    [119.6, 80.3, 'varf', 120, 80], [20.2, 29.7, 'varf', 20, 30], [70.3, 30.2, 'mijloc', 70, 30], [119.8, 55.4, 'mijloc', 120, 55], [70.4, 55.3, 'cutie', 70, 55],
  ] as const) {
    const r = lipit(x, y);
    assert.equal(r?.fel, fel, `(${x}, ${y})`);
    aproape(r?.p ?? { x: 0, y: 0 }, px, py, `${fel} la (${px}, ${py})`);
    assert.equal(r?.date?.nod, 'r1');
    const q = punctAncora({ x: -999, y: -999, legatura: r!.date! }, idx);
    assert.equal(q.stare, 'legata');
    aproape(q.p, px, py, 'citit înapoi');
  }
  // Înăuntrul reliefului, departe de chenar și de centru: nimic de lipit (relieful n-are alt contur).
  assert.equal(lipit(45, 42), null);
});
