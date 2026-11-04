/**
 * Verificarea vectorilor (ADR 0124, felia 10.1↑), pe hârtie: fiecare fel de problemă pe un desen cu valoarea calculată de
 * mână (conturul cu capetele la 0,05 mm, două cercuri identice, „8”-ul și bucla de 1,5 mm² dintr-un vector de 100 mm²,
 * două noduri la 0,001 mm, capetele a două linii la 0,005 mm, pătratele care se taie, se ating sau au o latură comună,
 * cubica care se taie singură în (0, 9/7)), apoi corpusul plantat al pragului (10 duplicate, 8 perechi de noduri la
 * 0,005 mm, 6 intersecții între vectori, 5 bucle), găsit întreg, fără alarme false, cu culoarea lui (aceeași formă sau două
 * forme), și același corpus citit dintr-un DXF.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteDxf } from '../../src/io/dxf.ts';
import { piesaDinImport } from '../../src/io/piesa.ts';
import { documentNou, type Document, type FormaDoc, type VarfDoc } from '../../src/model/document.ts';
import { verificaVectorii, TOLERANTA_VERIFICARE, type OptiuniVerificare, type Problema } from '../../src/model/verificare.ts';
import { docDin, ID, lume } from './ajutor-document.ts';
import { cerc as cercDxf, inMm, linie as linieDxf, lwpolilinie } from './ajutor-dxf.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaDoc =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const patrat = (id: string, x: number, y: number, latura = 10) => forma(id, { tip: 'dreptunghi', latime: latura, inaltime: latura, razaColt: 0 }, x, y);
const cercF = (id: string, x: number, y: number, r = 10) => forma(id, { tip: 'cerc', raza: r }, x, y);

const OPT: OptiuniVerificare = { toleranta: TOLERANTA_VERIFICARE, alese: null };
function verifica(d: Document, o: Partial<OptiuniVerificare> = {}): readonly Problema[] {
  const r = verificaVectorii(d, { ...OPT, ...o });
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  assert.equal(r.oprit, false, 'verificarea nu s-a oprit');
  return r.probleme;
}
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const punct = (p: { readonly x: number; readonly y: number } | undefined, x: number, y: number, eps: number, mesaj: string): void => {
  assert.ok(p, `${mesaj}: lipsește punctul`);
  assert.ok(Math.hypot(p.x - x, p.y - y) <= eps, `${mesaj}: (${p.x}, ${p.y}) ≠ (${x}, ${y})`);
};
const felurile = (ps: readonly Problema[]): string[] => ps.map((p) => p.fel);

test('pragul toleranței: între 0,001 și 1 mm, altfel refuzată cu motiv; implicit rezoluția modelului, 0,01 mm', () => {
  assert.equal(TOLERANTA_VERIFICARE, 0.01);
  const d = docDin(stoc, patrat('a', 0, 0));
  for (const toleranta of [0, 0.0009, 1.01, Number.NaN]) assert.deepEqual(verificaVectorii(d, { ...OPT, toleranta }), { ok: false, motiv: 'toleranta' });
  for (const toleranta of [0.001, 1]) assert.ok(verificaVectorii(d, { ...OPT, toleranta }).ok);
});

test('un desen curat: zero probleme (pătrat, cerc, dreptunghi rotunjit, triunghi, o cale cu cubice netede)', () => {
  const lacrima: FormaDoc = {
    tip: 'cale', inchis: true, varfuri: [
      { p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 20, y: 0 }, c2: { x: 20, y: 20 } } },
      { p: { x: 0, y: 20 }, s: { tip: 'C', c1: { x: -10, y: 20 }, c2: { x: -10, y: 0 } } },
    ],
  };
  const d = docDin(stoc, patrat('a', 0, 0), cercF('b', 100, 100), forma('c', { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 5 }, 200, 0),
    forma('t', cale(true, [0, 0], [30, 0], [15, 20]), 300, 300), forma('l', lacrima, 500, 500));
  assert.deepEqual(verifica(d), []);
});

test('conturul deschis cu capetele la 0,05 mm: „deschis”, distanța 0,05, capetele (0, 0) și (0, 0,05); doar atât', () => {
  const d = docDin(stoc, forma('a', cale(false, [0, 0], [40, 0], [40, 30], [0, 30], [0, 0.05])));
  const ps = verifica(d);
  assert.deepEqual(felurile(ps), ['deschis']);
  const p = ps[0] as Extract<Problema, { fel: 'deschis' }>;
  assert.deepEqual(p.elemente, [lume('a')]);
  aproape(p.distanta, 0.05, 1e-15, 'golul');
  punct(p.puncte[0], 0, 0, 0, 'primul capăt');
  punct(p.puncte[1], 0, 0.05, 0, 'al doilea capăt');
  // Peste toleranță sau sub ea, golul se spune la fel: „deschis” e felul formei, nu o apropiere de noduri.
  assert.deepEqual(felurile(verifica(d, { toleranta: 0.1 })), ['deschis']);
  // O linie lungă e tot deschisă, cu golul cât ea.
  const linie = verifica(docDin(stoc, forma('l', cale(false, [0, 0], [100, 0]))));
  aproape((linie[0] as Extract<Problema, { fel: 'deschis' }>).distanta, 100, 0, 'linia');
});

test('două cercuri identice: un singur „duplicat” (rămâne primul), fără intersecții sau noduri între ele', () => {
  const ps = verifica(docDin(stoc, cercF('a', 50, 50), cercF('b', 50, 50)));
  assert.deepEqual(felurile(ps), ['duplicat']);
  assert.deepEqual(ps[0]?.elemente, [lume('a'), lume('b')]);
  punct(ps[0]?.puncte[0], 50, 50, 1e-9, 'locul duplicatului: centrul cutiei');
});

test('duplicatul în toleranță: alt start, alt sens, alt fel de formă, mutat cu 0,005 mm; la 0,02 mm nu mai e duplicat, ci două intersecții', () => {
  // Același cerc R10 din (50, 50), scris ca o cale de două semicercuri care pornește din stânga și merge orar.
  const invers: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: { x: -10, y: 0 }, s: { tip: 'A', bulge: -1 } }, { p: { x: 10, y: 0 }, s: { tip: 'A', bulge: -1 } }] };
  assert.deepEqual(felurile(verifica(docDin(stoc, cercF('a', 50, 50), forma('b', invers, 50, 50)))), ['duplicat']);
  // Pătratul ca dreptunghi și ca o cale cu alt start, orar.
  assert.deepEqual(felurile(verifica(docDin(stoc, patrat('a', 0, 0), forma('b', cale(true, [10, 10], [10, 0], [0, 0], [0, 10]))))), ['duplicat']);
  assert.deepEqual(felurile(verifica(docDin(stoc, cercF('a', 50, 50), cercF('b', 50.005, 50)))), ['duplicat']);
  // Aceleași noduri, dar o latură e un arc (săgeata 0,1 × 10 / 2 = 0,5 mm): nu e același contur, ci o suprapunere pe celelalte trei.
  const perna: FormaDoc = { tip: 'cale', inchis: true, varfuri: [
    { p: { x: 0, y: 0 }, s: { tip: 'A', bulge: -0.1 } }, { p: { x: 10, y: 0 }, s: L }, { p: { x: 10, y: 10 }, s: L }, { p: { x: 0, y: 10 }, s: L },
  ] };
  assert.ok(!felurile(verifica(docDin(stoc, patrat('a', 0, 0), forma('b', perna)))).includes('duplicat'));
  // Centrele la 0,02: cercurile se taie în x = 50,01, y = 50 ± √(100 − 0,0001).
  const ps = verifica(docDin(stoc, cercF('a', 50, 50), cercF('b', 50.02, 50)));
  assert.deepEqual(felurile(ps), ['intersectie', 'intersectie']);
  const h = Math.sqrt(100 - 0.0001);
  const ys = ps.map((p) => p.puncte[0]?.y ?? Number.NaN).sort((u, v) => u - v);
  punct(ps.find((p) => (p.puncte[0]?.y ?? 0) < 50)?.puncte[0], 50.01, 50 - h, 1e-6, 'jos');
  punct(ps.find((p) => (p.puncte[0]?.y ?? 0) > 50)?.puncte[0], 50.01, 50 + h, 1e-6, 'sus');
  assert.equal(ys.length, 2);
  // Centrele la 19,99999: punctele în x = 9,999995, y = ±0,01 (0,02 mm între ele), iar nodurile din (60, 50) și (59,99999, 50)
  // stau la 0,00001 mm, dar la peste 0,01 de puncte: două intersecții și o pereche de noduri. Cu toleranța 0,05, un singur
  // loc, iar perechea de noduri e a lui.
  const strans = docDin(stoc, cercF('a', 50, 50), cercF('b', 69.99999, 50));
  assert.deepEqual(felurile(verifica(strans)), ['intersectie', 'intersectie', 'noduri']);
  assert.deepEqual(felurile(verifica(strans, { toleranta: 0.05 })), ['intersectie']);
});

test('duplicatul între piese: aceeași piesă, două instanțe în același loc; trei copii ale unui „8”: un duplicat, o singură autointersecție', () => {
  const d0 = docDin(stoc, patrat('a', 20, 20));
  const foaie = d0.foi[0]!;
  const doua: Document = { ...d0, foi: [{ ...foaie, instante: [...foaie.instante, { id: 'a2', piesa: 'a', x: 20, y: 20, rotire: 0 }] }] };
  const ps = verifica(doua);
  assert.deepEqual(felurile(ps), ['duplicat']);
  assert.deepEqual(ps[0]?.elemente, ['a/a', 'a2/a']);
  const opt = cale(true, [0, 0], [20, 20], [20, 0], [0, 20]);
  const trei = verifica(docDin(stoc, forma('a', opt, 100, 0), forma('b', opt, 100, 0), forma('c', opt, 100, 0)));
  assert.deepEqual(felurile(trei), ['duplicat', 'autointersectie']);
  assert.deepEqual(trei[0]?.elemente, [lume('a'), lume('b'), lume('c')]);
  assert.deepEqual(trei[1]?.elemente, [lume('a')], 'doar forma care rămâne își spune problemele');
});

test('„8”-ul (fundița): o autointersecție în (10, 10), cele două bucle de câte 100 mm², deci 50 %', () => {
  const ps = verifica(docDin(stoc, forma('a', cale(true, [0, 0], [20, 20], [20, 0], [0, 20]))));
  assert.deepEqual(felurile(ps), ['autointersectie']);
  const p = ps[0] as Extract<Problema, { fel: 'autointersectie' }>;
  assert.deepEqual(p.elemente, [lume('a')]);
  punct(p.puncte[0], 10, 10, 1e-9, 'încrucișarea');
  assert.ok(p.bucla);
  aproape(p.bucla.arie, 100, 1e-9, 'bucla mică');
  aproape(p.bucla.procent ?? Number.NaN, 50, 1e-9, 'procentul');
});

test('„8”-ul care trece de două ori prin același nod: cavalier spune locul de trei ori, verificarea o dată', () => {
  const ps = verifica(docDin(stoc, forma('a', cale(true, [0, 0], [10, 10], [20, 20], [20, 0], [10, 10], [0, 20]))));
  assert.deepEqual(felurile(ps), ['autointersectie']);
  punct(ps[0]?.puncte[0], 10, 10, 1e-9, 'nodul comun');
  aproape((ps[0] as Extract<Problema, { fel: 'autointersectie' }>).bucla?.procent ?? Number.NaN, 50, 1e-9, 'procentul');
});

test('bucla de 1,5 mm² dintr-un vector de 100 mm²: aria 1,5, procentul 1,5 / 101,5 (peste 1 %, sub 2 %)', () => {
  const s = Math.sqrt(1.5);
  const ps = verifica(docDin(stoc, forma('a', cale(true, [-10, -10], [s, s], [s, -s], [-10, 10]), 300, 300)));
  assert.deepEqual(felurile(ps), ['autointersectie']);
  const p = ps[0] as Extract<Problema, { fel: 'autointersectie' }>;
  punct(p.puncte[0], 300, 300, 1e-9, 'încrucișarea');
  aproape(p.bucla?.arie ?? Number.NaN, 1.5, 1e-9, 'aria buclei');
  const procent = p.bucla?.procent ?? Number.NaN;
  aproape(procent, (1.5 / 101.5) * 100, 1e-9, 'procentul');
  assert.ok(procent > 1 && procent < 2);
});

test('cubica care se taie singură (−1, 0), (2, 3), (−2, 3), (1, 0): în (0, 9/7), bucla fără procent (calea e deschisă)', () => {
  // x(t) = (u − v)(u² − 5uv + v²), cu u = t, v = 1 − t: zero la 7t² − 7t + 1 = 0, unde uv = 1/7, deci y = 9uv = 9/7.
  const f: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: -1, y: 0 }, s: { tip: 'C', c1: { x: 2, y: 3 }, c2: { x: -2, y: 3 } } }, { p: { x: 1, y: 0 }, s: L }] };
  const ps = verifica(docDin(stoc, forma('a', f, 500, 500)));
  assert.deepEqual(felurile(ps), ['autointersectie', 'deschis']);
  const p = ps[0] as Extract<Problema, { fel: 'autointersectie' }>;
  punct(p.puncte[0], 500, 500 + 9 / 7, 0.002, 'încrucișarea (biarcele, sub 0,001 mm)');
  assert.equal(p.bucla?.procent, null);
  assert.ok((p.bucla?.arie ?? 0) > 0);
});

test('o cale întoarsă exact în start, o țeapă de 0,005 mm, praful: fiecare o singură problemă, fără autointersecția pe care o fac', () => {
  // Calea deschisă care se întoarce în (0, 0): golul 0, iar atingerea capătului cu startul e a golului.
  const intoarsa = verifica(docDin(stoc, forma('a', cale(false, [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]))));
  assert.deepEqual(felurile(intoarsa), ['deschis']);
  assert.equal((intoarsa[0] as Extract<Problema, { fel: 'deschis' }>).distanta, 0);
  // Țeapa: dus și întors pe 0,005 mm, în colțul (20, 0); suprapunerea ei e a nodurilor prea apropiate.
  const teapa = verifica(docDin(stoc, forma('a', cale(true, [0, 0], [20, 0], [20, 0.005], [20, 0], [20, 20], [0, 20]))));
  assert.deepEqual(felurile(teapa), ['noduri']);
  // Praful: un triunghi cu laturile de 0,004 mm e un singur loc.
  assert.deepEqual(felurile(verifica(docDin(stoc, forma('a', cale(true, [0, 0], [0.004, 0], [0, 0.003]), 50, 50)))), ['noduri']);
});

test('două noduri la 0,001 mm în același contur: „noduri”, distanța 0,001; pragul e inclus; la 0,002 și toleranța 0,001, nimic', () => {
  const d = docDin(stoc, forma('a', cale(true, [0, 0], [20, 0], [20, 0.001], [20, 20], [0, 20])));
  const ps = verifica(d);
  assert.deepEqual(felurile(ps), ['noduri']);
  const p = ps[0] as Extract<Problema, { fel: 'noduri' }>;
  assert.deepEqual(p.elemente, [lume('a')]);
  aproape(p.distanta, 0.001, 1e-15, 'distanța');
  punct(p.puncte[0], 20, 0, 0, 'primul nod');
  punct(p.puncte[1], 20, 0.001, 0, 'al doilea nod');
  assert.equal(p.capete, false);
  assert.deepEqual(felurile(verifica(d, { toleranta: 0.001 })), ['noduri']);
  assert.deepEqual(verifica(docDin(stoc, forma('a', cale(true, [0, 0], [20, 0], [20, 0.002], [20, 20], [0, 20]))), { toleranta: 0.001 }), []);
});

test('noduri între forme: capetele a două linii la 0,005 mm (capete), colțurile a două pătrate la 0,005 mm', () => {
  const ps = verifica(docDin(stoc, forma('a', cale(false, [0, 0], [10, 0])), forma('b', cale(false, [10.005, 0], [20, 0]))));
  assert.deepEqual(felurile(ps), ['noduri', 'deschis', 'deschis']);
  const p = ps[0] as Extract<Problema, { fel: 'noduri' }>;
  assert.deepEqual(p.elemente, [lume('a'), lume('b')]);
  assert.equal(p.capete, true);
  aproape(p.distanta, 0.005, 1e-12, 'distanța');
  // Colțul (10, 10) al primului și colțul (10,003; 10,004) al celui de-al doilea: 0,005 mm (3-4-5), fără să se atingă.
  const q = verifica(docDin(stoc, patrat('a', 0, 0), patrat('b', 10.003, 10.004)));
  assert.deepEqual(felurile(q), ['noduri']);
  assert.equal((q[0] as Extract<Problema, { fel: 'noduri' }>).capete, false);
  aproape((q[0] as Extract<Problema, { fel: 'noduri' }>).distanta, 0.005, 1e-12, 'colțurile');
  // La 0,015 mm (9-12-15) și la 0,0113 mm (8-8, fiecare axă sub toleranță), peste toleranță: nimic.
  assert.deepEqual(verifica(docDin(stoc, patrat('a', 0, 0), patrat('b', 10.009, 10.012))), []);
  assert.deepEqual(verifica(docDin(stoc, patrat('a', 0, 0), patrat('b', 10.008, 10.008))), []);
  // Două căi care se ating chiar în capete (o înlănțuire ruptă): nodurile, nu și o intersecție.
  const lant = verifica(docDin(stoc, forma('a', cale(false, [0, 0], [10, 0])), forma('b', cale(false, [10, 0], [20, 5]))));
  assert.deepEqual(felurile(lant), ['noduri', 'deschis', 'deschis']);
  assert.equal((lant[0] as Extract<Problema, { fel: 'noduri' }>).capete, true);
  assert.equal((lant[0] as Extract<Problema, { fel: 'noduri' }>).distanta, 0);
});

test('pătratele: suprapuse pe un sfert, două intersecții în (10, 5) și (5, 10); cu o latură comună, o suprapunere; colț în colț, o atingere', () => {
  const ps = verifica(docDin(stoc, patrat('a', 0, 0), patrat('b', 5, 5)));
  assert.deepEqual(felurile(ps), ['intersectie', 'intersectie']);
  for (const p of ps) assert.deepEqual(p.elemente, [lume('a'), lume('b')]);
  const dupaX = [...ps].sort((u, v) => (u.puncte[0]?.x ?? 0) - (v.puncte[0]?.x ?? 0));
  punct(dupaX[0]?.puncte[0], 5, 10, 1e-9, 'latura de sus a primului');
  punct(dupaX[1]?.puncte[0], 10, 5, 1e-9, 'latura din dreapta a primului');
  const latura = verifica(docDin(stoc, patrat('a', 0, 0), patrat('b', 10, 0)));
  assert.deepEqual(felurile(latura), ['intersectie'], 'colțurile comune nu sunt și „noduri”');
  const capete = [...(latura[0]?.puncte ?? [])].sort((u, v) => u.y - v.y);
  assert.equal(capete.length, 2, 'suprapunerea are două capete');
  punct(capete[0], 10, 0, 1e-9, 'capătul de jos');
  punct(capete[1], 10, 10, 1e-9, 'capătul de sus');
  // Un triunghi lipit pe dinăuntru de latura din dreapta (de la y 2 la 8): o singură suprapunere; punctele în care laturile
  // lui pleacă de pe latură, la capetele ei, nu se mai spun o dată.
  const lipit = verifica(docDin(stoc, patrat('a', 0, 0), forma('b', cale(true, [10, 2], [10, 8], [5, 5]))));
  assert.deepEqual(felurile(lipit), ['intersectie']);
  assert.equal(lipit[0]?.puncte.length, 2);
  // Latura comună tăiată de un nod al celei de-a doua forme: două bucăți comune, unite într-o singură suprapunere.
  const taiata = verifica(docDin(stoc, patrat('a', 0, 0), forma('b', cale(true, [10, 0], [10, 5], [10, 10], [20, 10], [20, 0]))));
  assert.deepEqual(felurile(taiata), ['intersectie']);
  const capeteT = [...(taiata[0]?.puncte ?? [])].sort((u, v) => u.y - v.y);
  assert.equal(capeteT.length, 2);
  punct(capeteT[0], 10, 0, 1e-9, 'capătul de jos');
  punct(capeteT[1], 10, 10, 1e-9, 'capătul de sus');
  const colt = verifica(docDin(stoc, patrat('a', 0, 0), patrat('b', 10, 10)));
  assert.deepEqual(felurile(colt), ['intersectie']);
  punct(colt[0]?.puncte[0], 10, 10, 1e-9, 'colțul comun');
});

test('doar formele alese (instanțele selecției): între o formă aleasă și una nealeasă nu se caută nimic', () => {
  const d = docDin(stoc, patrat('a', 0, 0), patrat('b', 5, 5), forma('c', cale(false, [100, 100], [200, 100])));
  assert.deepEqual(felurile(verifica(d, { alese: ['a'] })), []);
  assert.deepEqual(felurile(verifica(d, { alese: ['a', 'b'] })), ['intersectie', 'intersectie']);
  assert.deepEqual(felurile(verifica(d, { alese: ['c'] })), ['deschis']);
  assert.deepEqual(felurile(verifica(d, { alese: [lume('a')] })), [], 'un id în lume nu e o instanță');
});

/**
 * Corpusul plantat al pragului (`ACOPERIRE-ARTCAM-DESKPROTO.md`, rândul 24; criteriul din cercetare): fiecare problemă în
 * celula ei de 100 mm, departe de celelalte. 10 duplicate (perechi de pătrate), 8 perechi de noduri la 0,005 mm (4 în
 * aceeași formă, 4 între capetele a două linii), 6 intersecții între vectori (3 perechi de pătrate suprapuse pe un sfert),
 * 5 bucle (fundițe cu bucla mică). Toleranța 0,01.
 */
type Plantat = { readonly fel: Problema['fel']; readonly x: number; readonly y: number; readonly intre: boolean };
function corpus(): { readonly forme: Array<ReturnType<typeof forma>>; readonly plantate: Plantat[] } {
  const forme: Array<ReturnType<typeof forma>> = [];
  const plantate: Plantat[] = [];
  let celula = 0;
  const loc = (): readonly [number, number] => { const k = celula++; return [(k % 9) * 100 + 20, Math.floor(k / 9) * 100 + 20]; };
  for (let k = 0; k < 10; k++) {
    const [x, y] = loc();
    forme.push(patrat(`d${k}`, x, y, 20), patrat(`d${k}c`, x, y, 20));
    plantate.push({ fel: 'duplicat', x: x + 10, y: y + 10, intre: true });
  }
  for (let k = 0; k < 4; k++) {
    const [x, y] = loc();
    forme.push(forma(`n${k}`, cale(true, [0, 0], [30, 0], [30, 0.005], [30, 30], [0, 30]), x, y));
    plantate.push({ fel: 'noduri', x: x + 30, y: y + 0.0025, intre: false });
  }
  for (let k = 0; k < 4; k++) {
    const [x, y] = loc();
    forme.push(forma(`m${k}`, cale(false, [0, 0], [20, 0]), x, y), forma(`m${k}b`, cale(false, [20.003, 0.004], [40, 30]), x, y));
    plantate.push({ fel: 'noduri', x: x + 20.0015, y: y + 0.002, intre: true });
    // Locul unei căi deschise e mijlocul dintre capete.
    plantate.push({ fel: 'deschis', x: x + 10, y, intre: false }, { fel: 'deschis', x: x + 30.0015, y: y + 15.002, intre: false });
  }
  for (let k = 0; k < 3; k++) {
    const [x, y] = loc();
    forme.push(patrat(`i${k}`, x, y, 20), patrat(`i${k}b`, x + 10, y + 10, 20));
    plantate.push({ fel: 'intersectie', x: x + 20, y: y + 10, intre: true }, { fel: 'intersectie', x: x + 10, y: y + 20, intre: true });
  }
  const s = Math.sqrt(1.5);
  for (let k = 0; k < 5; k++) {
    const [x, y] = loc();
    forme.push(forma(`b${k}`, cale(true, [0, 0], [10 + s, 10 + s], [10 + s, 10 - s], [0, 20]), x, y));
    plantate.push({ fel: 'autointersectie', x: x + 10, y: y + 10, intre: false });
  }
  return { forme, plantate };
}

/** Fiecare problemă găsită trebuie să fie exact una plantată (același fel, locul la cel mult 0,01, aceeași culoare), și invers. */
function potrivesteCorpusul(ps: readonly Problema[], plantate: readonly Plantat[], eps: number): void {
  const libere = [...plantate];
  for (const p of ps) {
    const x = p.puncte.reduce((s, q) => s + q.x, 0) / p.puncte.length, y = p.puncte.reduce((s, q) => s + q.y, 0) / p.puncte.length;
    const k = libere.findIndex((q) => q.fel === p.fel && Math.hypot(q.x - x, q.y - y) <= eps);
    assert.ok(k >= 0, `alarmă falsă: ${p.fel} în (${x}, ${y})`);
    assert.equal(p.elemente.length > 1, libere[k]?.intre, `culoarea problemei ${p.fel} din (${x}, ${y})`);
    libere.splice(k, 1);
  }
  assert.deepEqual(libere, [], 'ratări');
}

test('corpusul plantat al pragului: 10 duplicate, 8 perechi de noduri, 6 intersecții, 5 bucle, găsite toate, fără alarme false', () => {
  const { forme, plantate } = corpus();
  const ps = verifica(docDin(stoc, ...forme));
  const numar = (fel: Problema['fel']): number => ps.filter((p) => p.fel === fel).length;
  assert.deepEqual([numar('duplicat'), numar('noduri'), numar('intersectie'), numar('autointersectie'), numar('deschis')], [10, 8, 6, 5, 8]);
  potrivesteCorpusul(ps, plantate, 0.01);
  // La duplicate rămâne exact un exemplar din fiecare: primul din pereche.
  for (const p of ps.filter((q) => q.fel === 'duplicat')) assert.ok(p.elemente[0]?.startsWith('d') && !p.elemente[0].includes('c/'));
  // Fiecare buclă: 1,5 mm² din 101,5.
  for (const p of ps) if (p.fel === 'autointersectie') aproape(p.bucla?.arie ?? 0, 1.5, 1e-9, 'bucla plantată');
});

test('același corpus, citit dintr-un DXF (LWPOLYLINE, LINE, CIRCLE pe straturi): aceleași probleme, în aceleași locuri', () => {
  const { forme, plantate } = corpus();
  const entitati = forme.map((f, k) => {
    const strat = { strat: `S${k}` };
    const { e: x, f: y } = f.matrice;
    if (f.forma.tip === 'dreptunghi') {
      const { latime: w, inaltime: h } = f.forma;
      return lwpolilinie([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, strat);
    }
    if (f.forma.tip !== 'cale') throw new Error('corpusul are doar pătrate și căi');
    const v = f.forma.varfuri.map((q): readonly [number, number] => [q.p.x + x, q.p.y + y]);
    if (!f.forma.inchis && v.length === 2) return linieDxf(v[0]![0], v[0]![1], v[1]![0], v[1]![1], strat);
    return lwpolilinie(v, f.forma.inchis, strat);
  }).join('') + cercDxf(950, 950, 10, { strat: 'CERC' });
  const r = citesteDxf(inMm(entitati));
  if (!r.ok) assert.fail(`DXF refuzat: ${r.cod}`);
  const { piesa, x, y } = piesaDinImport({ nume: 'corpus', cai: r.cai.map((c) => ({ varfuri: c.varfuri, inchis: c.inchis, nume: c.strat })), laturi: r.cai.map(() => 'pe-linie'), pagina: null, pozitie: 'fisier' }, 'corpus');
  const d0 = documentNou(stoc);
  const d: Document = { ...d0, piese: [piesa], foi: [{ ...d0.foi[0]!, instante: [{ id: 'imp', piesa: piesa.id, x, y, rotire: 0 }] }] };
  const ps = verifica(d);
  potrivesteCorpusul(ps, plantate, 0.01);
});
