import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lipestePunct, type FelPunct, type OptiuniPuncte, type PunctTinta } from '../../src/geom/lipirePuncte.ts';
import { documentNou, type Document } from '../../src/model/document.ts';
import { SPATIU_FOI } from '../../src/model/foi.ts';
import { puncteFoaie, surseCote, surseFoiVecine, type PunctVecin } from '../../src/model/puncteCote.ts';

/**
 * Măsoară între foi (ADR 0330, întrebarea 13a, felia 10.4↑f), pur, pe hârtie: cu „Toate foile pe pânză”, punctele celorlalte foi
 * (elementele lor și cele nouă puncte ale foii), mutate cu locul foii pe rândul pânzei față de foaia activă, fără legătură:
 * fiecare punct poartă doar foaia lui.
 *
 * Documentul: foaia „A” 300 × 200 (prima pe rând, X 0) și foaia „B” 400 × 250 (a doua, X 300 + 100 = 400), cu piesa „q” pusă pe
 * „B” la (20, 10): dreptunghiul 50 × 30, deci colțurile (20, 10), (70, 10), (70, 40), (20, 40) în foaia lui și cercul R5 cu
 * centrul (100, 60). Din „A”, „B” stă la X + 400; din „B”, „A” stă la X − 400.
 */
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
function document(): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const f = d.foi[0];
  if (!f) throw new Error('fără foaie');
  return {
    ...d,
    piese: [{
      id: 'q', operatii: [],
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
          { tip: 'element', id: 'r', matrice: { ...ID }, forma: { tip: 'dreptunghi', latime: 50, inaltime: 30, razaColt: 0 } },
          { tip: 'element', id: 'c', matrice: { ...ID, e: 80, f: 50 }, forma: { tip: 'cerc', raza: 5 } },
        ],
      },
    }],
    foi: [
      { ...f, id: 'A' },
      { ...f, id: 'B', stoc: { latime: 400, inaltime: 250, grosime: 18 }, instante: [{ id: 'i1', piesa: 'q', x: 20, y: 10, rotire: 0 }] },
    ],
  };
}

const doc = document();
const TOATE: ReadonlySet<FelPunct> = new Set(['varf', 'mijloc', 'centru', 'cadran', 'cutie', 'foaie', 'grila']);
const opt = (o: Partial<OptiuniPuncte> = {}): OptiuniPuncte => ({ toleranta: 1, felurile: TOATE, grila: null, peContur: false, ...o });
const din = (foaie: number) => (x: number, y: number, o: Partial<OptiuniPuncte> = {}): PunctTinta<PunctVecin> | null =>
  lipestePunct(surseFoiVecine(doc, foaie), [], { x, y }, opt(o));
const aproape = (a: { x: number; y: number } | undefined, x: number, y: number, unde: string): void => {
  assert.ok(a && Math.abs(a.x - x) < 1e-9 && Math.abs(a.y - y) < 1e-9, `${unde}: (${a?.x}, ${a?.y}), nu (${x}, ${y})`);
};

test('din foaia A: vârful, mijlocul, centrul cercului și punctele foii B, mutate cu 400 pe X, fără legătură', () => {
  const lipeste = din(0);
  assert.equal(SPATIU_FOI, 100);
  const v = lipeste(420.4, 9.7);
  assert.equal(v?.fel, 'varf');
  aproape(v?.p, 420, 10, 'colțul stânga-jos al dreptunghiului');
  assert.deepEqual(v?.date, { foaie: 'B' }, 'doar foaia lui, nu o legătură: o măsură nu se leagă de altă foaie');
  const m = lipeste(445.3, 40.2);
  assert.equal(m?.fel, 'mijloc');
  aproape(m?.p, 445, 40, 'mijlocul laturii de sus');
  const c = lipeste(500.2, 60.3);
  assert.equal(c?.fel, 'centru');
  aproape(c?.p, 500, 60, 'centrul cercului');
  const q = lipeste(505.3, 60.2);
  assert.equal(q?.fel, 'cadran');
  aproape(q?.p, 505, 60, 'cadranul din dreapta');
  for (const [x, y] of [[400, 0], [600, 0], [800, 0], [400, 125], [600, 125], [800, 125], [400, 250], [600, 250], [800, 250]] as const) {
    const f = lipeste(x + 0.3, y - 0.2);
    assert.equal(f?.fel, 'foaie', `punctul foii (${x}, ${y})`);
    aproape(f?.p, x, y, 'punctul foii B');
    assert.deepEqual(f?.date, { foaie: 'B' });
  }
});

test('din foaia B: foaia A, la X − 400; foaia activă nu e printre vecine', () => {
  const lipeste = din(1);
  for (const [x, y] of [[-400, 0], [-250, 100], [-100, 200]] as const) {
    const r = lipeste(x + 0.2, y + 0.2);
    aproape(r?.p, x, y, 'punctul foii A');
    assert.deepEqual(r?.date, { foaie: 'A' });
  }
  // Dreptunghiul stă pe foaia activă (B): nu e o sursă vecină.
  assert.equal(lipeste(20.2, 10.2), null);
  assert.deepEqual(surseFoiVecine(doc, 1).length, 1, 'doar foaia A, fără elemente');
});

test('conturul, cu Ctrl: punctul cel mai apropiat de pe latura de jos a dreptunghiului mutat', () => {
  const r = din(0)(437.2, 10.6, { peContur: true, felurile: new Set<FelPunct>() });
  assert.equal(r?.fel, 'contur');
  aproape(r?.p, 437.2, 10, 'pe latura de jos');
});

test('distanța pe hârtie: colțul dreapta-jos al foii A și colțul stânga-jos al foii B sunt la SPATIU_FOI', () => {
  const a = lipestePunct(surseCote(doc, 0), puncteFoaie(300, 200), { x: 300.2, y: 0.1 }, opt());
  const b = din(0)(399.8, 0.2);
  aproape(a?.p, 300, 0, 'colțul foii A');
  aproape(b?.p, 400, 0, 'colțul foii B');
  assert.equal(Math.hypot((b?.p.x ?? 0) - (a?.p.x ?? 0), (b?.p.y ?? 0) - (a?.p.y ?? 0)), 100);
});

test('o singură foaie: nicio sursă vecină; departe de foaia B, niciun punct (indexul cutiilor)', () => {
  const unul = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  assert.deepEqual(surseFoiVecine(unul, 0), []);
  assert.equal(din(0)(350, 100), null);
  let cerute = 0;
  const numarate = surseFoiVecine(doc, 0).map((s) => ({ ...s, puncte: () => { cerute++; return s.puncte(); } }));
  lipestePunct(numarate, [], { x: 150, y: 100 }, opt());
  assert.equal(cerute, 0, 'cu cursorul pe foaia A, punctele foii B nu se fac');
});
