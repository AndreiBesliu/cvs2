/**
 * Construcțiile gata ale atelierului Easy 3Draw (ADR 0284, partea E; felia 3.Ci), pe funcția pură a motorului
 * `constructieGata(fel, valori)`: piesele unei construcții făcute din parametri, gata de pus în vederea „Modelul”. Prima
 * piesă stă pe grilă; celelalte sunt prinse, prindere în prindere, de una de dinaintea lor, deci construcția întreagă își
 * urmează baza. Cinci șabloane (al cincilea, ventilatorul, are proba lui: `trenulet.sabloane.ventilator.test.ts`):
 * - **șasiul cu patru roți**: placa L × W, două cărămizi Technic 1 × L sub marginile ei, două axe prin prima și ultima gaură,
 *   câte o roată la fiecare capăt de ax și câte o bucșă ½ lângă fiecare cărămidă (axul nu alunecă);
 * - **cutia de angrenaje**: placa, doi pereți (cărămizi 1 × L și deasupra o cărămidă Technic), axele cu bucșe pe fețele de
 *   afară și roțile dințate ale raportului ales, una sau două trepte, cu dinții îmbucați;
 * - **brațul de macara**: placa 4 × 4, stâlpul (cărămizi 1 × 2, sus o cărămidă Technic 1 × 2), știftul, grinda (brațul) la
 *   unghiul ales și, în vârf, axul cu fulia și bucșa;
 * - **barca cu elice**: corpul (o placă cu prora ascuțită), cabina 2 × 2, blocul motorului (o cărămidă Technic 1 × 2, cu
 *   gaura de-a lungul bărcii), axul cu bucșa și elicea de barcă în spatele pupei.
 * Valorile sunt pe hârtie, din cotele pieselor: pasul de 8, placa de 3,2, cărămida de 9,6, gaura Technic la 5,8 de jos,
 * jocul lateral de 0,1, roata (Ø30,4, lată de 13,6), bucșa ½ (3,8), roata dințată de modul 1 (raza de divizare z / 2).
 * Ce se cere fiecărei construcții: nicio piesă nu plutește, nu intră în alta și nu e neprinsă (verificarea din 3.Cg), cea
 * mai de jos atinge masa (0 ≤ z < 3,2), iar mecanismul e cel de pe hârtie (distanțele dintre axe, dinții îmbucați,
 * unghiul brațului, elicea în spatele bărcii).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, type Piesa, type Tri } from './ajutor-plasa-lego.ts';

type P3 = [number, number, number];
type Def = Record<string, unknown> & { tip: string };
type Prindere = { fel: string; p: number[]; d: number[]; lung: number };
type Transf = { m: number[]; t: number[] };
type Asezare = { gw: number; gd: number; pivot: number[]; ax: boolean };
type Corp = Piesa & { ax: number[] | null; prinderi: Prindere[] };
type PiesaSablon = { def: Def; x: number; y: number; z: number; rot: number; culoare: string; prins?: { de: number; a: number; b: number; unghi: number; alunec: number } };
type Gata = { fel: string; nume: string; piese: PiesaSablon[]; avert: string[]; cote: Record<string, number> };
type Verificat = { piese: { prinsa: number[]; intra: number[]; pluteste: boolean }[]; bucati: number };
const Lm = L as unknown as {
  SABLOANE: readonly string[];
  constructieGata(fel: string, d?: Record<string, unknown>): Gata;
  construieste(d: Def): Corp;
  asezareModel(d: Def, corp?: Corp): Asezare;
  transfGrila(a: Asezare, x: number, y: number, z: number, rot: number): Transf;
  rezolvaModel(piese: readonly { id: string; grila: Transf; prinderi: readonly Prindere[]; prins?: { de: string; a: number; b: number; unghi?: number; alunec?: number } | null; liber?: Transf | null }[]): { T: Transf; fel: string }[];
  verificaModel(piese: readonly { T: Transf; tri: readonly Tri[]; prinderi: readonly Prindere[]; cheie?: string }[], memo?: Map<string, boolean>): Verificat;
  cutieTransf(T: Transf, dim: readonly number[]): [P3, P3];
};

const corpuri = new Map<string, Corp>();
const fa = (d: Def): Corp => { const k = JSON.stringify(d); let c = corpuri.get(k); if (!c) { c = Lm.construieste(d); corpuri.set(k, c); } return c; };
const memo = new Map<string, boolean>();
const aplica = (T: Transf, p: readonly number[]): P3 => [0, 1, 2].map(i => T.m[3 * i]! * p[0]! + T.m[3 * i + 1]! * p[1]! + T.m[3 * i + 2]! * p[2]! + T.t[i]!) as P3;
const roteste = (T: Transf, v: readonly number[]): P3 => [0, 1, 2].map(i => T.m[3 * i]! * v[0]! + T.m[3 * i + 1]! * v[1]! + T.m[3 * i + 2]! * v[2]!) as P3;
const scalar = (a: readonly number[], b: readonly number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const minus = (a: readonly number[], b: readonly number[]): P3 => [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
const lung = (a: readonly number[]) => Math.hypot(a[0]!, a[1]!, a[2]!);
const aproape = (a: number, b: number, tol: number, ce: string) => assert.ok(Math.abs(a - b) <= tol, `${ce}: ${a} în loc de ${b}`);

/** Așezările pieselor unei construcții gata (prima pe grilă, restul prinse), cum le face atelierul. `rotiri`: unghiuri în
 *  plus pe prinderile unor piese (probele de control). */
function asezari(g: Gata, rotiri: Map<number, number> = new Map()): Transf[] {
  return Lm.rezolvaModel(g.piese.map((p, i) => {
    const c = fa(p.def), q = p.prins;
    return { id: `p${i}`, grila: Lm.transfGrila(Lm.asezareModel(p.def, c), p.x, p.y, p.z, p.rot), prinderi: c.prinderi,
      prins: q ? { de: `p${q.de}`, a: q.a, b: q.b, unghi: q.unghi + (rotiri.get(i) ?? 0), alunec: q.alunec } : null, liber: null };
  })).map(a => a.T);
}
function verifica(g: Gata, T: Transf[] = asezari(g)): Verificat {
  return Lm.verificaModel(g.piese.map((p, i) => ({ T: T[i]!, tri: fa(p.def).tri, prinderi: fa(p.def).prinderi, cheie: JSON.stringify(p.def) })), memo);
}
/** Ce se cere oricărei construcții gata: prima piesă pe grilă, celelalte prinse de una de dinaintea lor; după verificare,
 *  fiecare piesă prinsă de alta, niciuna nu intră în alta, niciuna nu plutește, un singur grup; cea mai de jos atinge masa. */
function buna(g: Gata, ce: string): Transf[] {
  assert.ok(g.piese.length > 1, ce);
  assert.equal(g.piese[0]!.prins, undefined, `${ce}: prima piesă stă pe grilă`);
  g.piese.slice(1).forEach((p, k) => {
    assert.ok(p.prins, `${ce}: piesa ${k + 1} e prinsă`);
    assert.ok(Number.isInteger(p.prins!.de) && p.prins!.de >= 0 && p.prins!.de <= k, `${ce}: piesa ${k + 1} e prinsă de una de dinaintea ei`);
  });
  const T = asezari(g), v = verifica(g, T);
  v.piese.forEach((p, i) => {
    const t = `${ce}: piesa ${i} (${g.piese[i]!.def.tip})`;
    assert.ok(p.prinsa.length > 0, `${t} nu e prinsă de nimic`);
    assert.deepEqual([...p.intra], [], `${t} intră în alte piese`);
    assert.equal(p.pluteste, false, `${t} plutește`);
  });
  assert.equal(v.bucati, 1, `${ce}: un singur grup`);
  const jos = Math.min(...g.piese.map((p, i) => josPlasa(T[i]!, fa(p.def).tri)));
  assert.ok(jos >= -1e-9 && jos < 3.2, `${ce}: cea mai de jos piesă e la ${jos} mm de masă`);
  return T;
}
// (motorul rulează în alt context, vm: șirurile lui se copiază în al probei înaintea lui deepEqual)
/** Cel mai de jos punct al unei plase așezate (pe vârfurile ei: cutia unei piese rotite e mai mare decât piesa). */
function josPlasa(T: Transf, tri: readonly Tri[]): number { let jos = Infinity; for (const t of tri) for (const q of t) jos = Math.min(jos, aplica(T, q)[2]); return jos; }
const indici = (g: Gata, tip: string) => [...g.piese.flatMap((p, i) => (p.def.tip === tip ? [i] : []))];
/** Centrul unei piese rotunde (axul ei, la jumătatea grosimii) și axa ei, în lume. */
function centru(g: Gata, T: Transf[], i: number): { c: P3; n: P3 } {
  const c = fa(g.piese[i]!.def);
  return { c: aplica(T[i]!, [c.ax![0]!, c.ax![1]!, c.dim[2]! / 2]), n: roteste(T[i]!, [0, 0, 1]) };
}

test('SABLOANE: cele cinci construcții gata, în ordinea din atelier; un fel necunoscut e refuzat', () => {
  assert.deepEqual([...Lm.SABLOANE], ['sasiu', 'angrenaje', 'macara', 'barca', 'ventilator']);
  assert.throws(() => Lm.constructieGata('pod'));
  for (const fel of Lm.SABLOANE) {
    const g = Lm.constructieGata(fel);
    assert.equal(g.fel, fel);
    assert.ok(typeof g.nume === 'string' && g.nume.length > 3, fel);
    assert.deepEqual([...g.avert], [], `${fel}: valorile implicite nu au avertismente`);
    for (const p of g.piese) assert.match(p.culoare, /^#[0-9a-f]{6}$/, `${fel}: culoarea pieselor`);
  }
  assert.equal(Lm.constructieGata('sasiu').nume, 'Șasiu cu patru roți');
  assert.equal(Lm.constructieGata('angrenaje').nume, 'Cutie de angrenaje');
  assert.equal(Lm.constructieGata('macara').nume, 'Braț de macara');
  assert.equal(Lm.constructieGata('barca').nume, 'Barcă cu elice');
  assert.equal(Lm.constructieGata('ventilator').nume, 'Ventilator');
});

// ---------------------------------------------------------------------------------------------------- șasiul
test('șasiul: placa, două șine Technic, două axe, patru roți, patru bucșe; ampatamentul și ecartamentul pe hârtie', () => {
  for (const [lung, lat, roata] of [[8, 6, 30.4], [6, 4, 30.4], [12, 10, 43.2], [16, 8, 56]] as const) {
    const ce = `șasiul ${lung} × ${lat}, Ø${roata}`, g = Lm.constructieGata('sasiu', { lung, lat, roata });
    assert.deepEqual([...g.avert], [], ce);
    const T = buna(g, ce);
    // placa L × W (o placă), pe grilă la x = y = 0
    const placa = g.piese[0]!;
    assert.equal(placa.def.tip, 'caramida');
    assert.equal(placa.def.placi, 1);
    assert.equal((placa.def.celule as unknown[]).length, lung * lat, ce);
    assert.deepEqual([placa.x, placa.y, placa.rot], [0, 0, 0], ce);
    assert.deepEqual(indici(g, 'caramidaTechnic').map(i => g.piese[i]!.def.lung), [lung, lung], ce);
    // axele: W + 5 știfturi (ies câte 20 mm de fiecare parte, cât roata, golul și bucșa)
    const axe = indici(g, 'ax');
    assert.deepEqual(axe.map(i => g.piese[i]!.def.lung), [lat + 5, lat + 5], ce);
    const roti = indici(g, 'roata');
    assert.equal(roti.length, 4, ce);
    for (const i of roti) assert.equal(g.piese[i]!.def.diam, roata, ce);
    assert.equal(indici(g, 'bucsa').length, 4, ce);
    // centrele roților: pe două axe paralele cu y, la x = 8 și 8 · (L − 1) (prima și ultima gaură a șinelor), la aceeași
    // înălțime; pe fiecare ax, cele două roți stau la 8 · W + 26,2 mm una de alta (capetele axului, minus o jumătate de roată)
    const c = roti.map(i => centru(g, T, i));
    for (const { n } of c) aproape(Math.abs(n[1]), 1, 1e-9, `${ce}: roțile, pe axe paralele cu y`);
    const xs = [...new Set(c.map(q => Math.round(q.c[0] * 1000) / 1000))].sort((a, b) => a - b);
    assert.deepEqual(xs, [8, 8 * (lung - 1)], `${ce}: axele, la prima și la ultima gaură`);
    for (const x of xs) {
      const ys = c.filter(q => Math.abs(q.c[0] - x) < 1e-6).map(q => q.c[1]).sort((a, b) => a - b);
      aproape(ys[1]! - ys[0]!, 8 * lat + 26.2, 1e-6, `${ce}: ecartamentul`);
      aproape((ys[0]! + ys[1]!) / 2, 4 * lat, 1e-6, `${ce}: roțile, de o parte și de alta a plăcii`);
    }
    aproape(Math.max(...c.map(q => q.c[2])) - Math.min(...c.map(q => q.c[2])), 0, 1e-9, `${ce}: roțile, la aceeași înălțime`);
    aproape(g.cote.ampatament!, 8 * (lung - 2), 1e-9, `${ce}: ampatamentul`);
    aproape(g.cote.ecartament!, 8 * lat + 26.2, 1e-9, `${ce}: ecartamentul`);
    // roțile ating masa (cea mai de jos piesă), iar placa e cât mai jos: cu o placă mai jos, roțile ar intra sub masă
    const jos = Math.min(...roti.map(i => josPlasa(T[i]!, fa(g.piese[i]!.def).tri)));
    assert.ok(jos >= -1e-9 && jos < 3.2, `${ce}: roțile, pe masă (${jos})`);
  }
});

test('șasiul: lungimea, lățimea și roata ies în margini, cu un avertisment; un șasiu prea scurt pentru roți e lungit', () => {
  const g = Lm.constructieGata('sasiu', { lung: 3, lat: 20, roata: 31 });
  assert.equal((g.piese[0]!.def.celule as unknown[]).length, 6 * 10);
  assert.equal(g.avert.length, 3);
  // roțile de Ø56 cer cel puțin 10 știfturi (între axe, 8 · (L − 2) ≥ 57, cât două raze și un milimetru)
  const s = Lm.constructieGata('sasiu', { lung: 8, lat: 6, roata: 56 });
  assert.equal(s.cote.ampatament, 64);
  assert.equal((s.piese[0]!.def.celule as unknown[]).length, 10 * 6);
  assert.equal(s.avert.length, 1);
  assert.match(s.avert[0]!, /10/);
  // un număr cu zecimale se rotunjește, cu avertismentul (7,6 → 8)
  const z = Lm.constructieGata('sasiu', { lung: 7.6 });
  assert.equal(z.cote.ampatament, 48);
  assert.equal(z.avert.length, 1);
  assert.match(z.avert[0]!, /de 8\./);
  // Ø43,2 cere 8: la 8 nu se lungește
  assert.deepEqual([...Lm.constructieGata('sasiu', { lung: 8, lat: 6, roata: 43.2 }).avert], []);
  assert.equal(Lm.constructieGata('sasiu', { lung: 7, lat: 6, roata: 43.2 }).cote.ampatament, 48);
});

// ---------------------------------------------------------------------------------------------------- cutia de angrenaje
/** Cât de bine se îmbucă două roți dințate (A și B, cu axele paralele): unghiul dintelui 0 al fiecăreia, măsurat în același
 *  sens în jurul axei lui A, de la linia centrelor (A spre B, respectiv B spre A). Se îmbucă când θA · zA / 2π + θB · zB / 2π
 *  are partea fracționară ½: în fața unui dinte al uneia stă un gol al celeilalte. Întoarce partea fracționară. */
function imbucare(g: Gata, T: Transf[], ia: number, ib: number): number {
  const A = centru(g, T, ia), B = centru(g, T, ib), v = A.n, ab = minus(B.c, A.c), u0 = minus(ab, v.map(x => x * scalar(ab, v)) as P3);
  const u = u0.map(x => x / lung(u0)) as P3, w: P3 = [v[1] * u[2] - v[2] * u[1], v[2] * u[0] - v[0] * u[2], v[0] * u[1] - v[1] * u[0]];
  const dinte = (i: number) => roteste(T[i]!, [1, 0, 0]);
  const tA = Math.atan2(scalar(dinte(ia), w), scalar(dinte(ia), u)), tB = Math.atan2(-scalar(dinte(ib), w), -scalar(dinte(ib), u));
  const za = g.piese[ia]!.def.dinti as number, zb = g.piese[ib]!.def.dinti as number, f = (tA * za + tB * zb) / (2 * Math.PI);
  return f - Math.floor(f);
}
const RAPOARTE: [string, [number, number][]][] = [['1:1', [[24, 24]]], ['1:3', [[8, 24]]], ['1:5', [[8, 40]]], ['1:9', [[8, 24], [8, 24]]], ['1:15', [[8, 24], [8, 40]]], ['1:25', [[8, 40], [8, 40]]]];

test('cutia de angrenaje: fiecare raport, cu roțile lui pe axe la (z1 + z2) / 2 mm, dinții îmbucați, raportul pe hârtie', () => {
  for (const [raport, trepte] of RAPOARTE) {
    const ce = `cutia ${raport}`, g = Lm.constructieGata('angrenaje', { raport });
    assert.deepEqual([...g.avert], [], ce);
    const T = buna(g, ce);
    // roțile, în ordinea treptelor: conducătoarea, apoi condusa
    const roti = indici(g, 'rotita');
    assert.deepEqual(roti.map(i => g.piese[i]!.def.dinti), trepte.flat(), ce);
    const axe = indici(g, 'ax');
    assert.equal(axe.length, trepte.length + 1, `${ce}: un ax mai mult decât treptele`);
    assert.equal(indici(g, 'bucsa').length, 2 * axe.length, `${ce}: câte două bucșe pe ax`);
    trepte.forEach(([z1, z2], s) => {
      const ia = roti[2 * s]!, ib = roti[2 * s + 1]!, A = centru(g, T, ia), B = centru(g, T, ib);
      aproape(Math.abs(scalar(A.n, B.n)), 1, 1e-9, `${ce}, treapta ${s + 1}: axele paralele`);
      // în același plan (aceeași fâșie de pe ax) și la distanța de divizare
      aproape(scalar(minus(B.c, A.c), A.n), 0, 1e-9, `${ce}, treapta ${s + 1}: în același plan`);
      aproape(lung(minus(B.c, A.c)), (z1 + z2) / 2, 1e-9, `${ce}, treapta ${s + 1}: distanța dintre axe`);
      aproape(imbucare(g, T, ia, ib), 0.5, 1e-6, `${ce}, treapta ${s + 1}: dinții îmbucați`);
    });
    // treptele a doua: roata ei conducătoare e pe axul roții conduse a primei
    if (trepte.length === 2) aproape(lung(minus(centru(g, T, roti[1]!).c, centru(g, T, roti[2]!).c)), 4.3, 1e-9, `${ce}: roțile axului din mijloc, alături`);
    aproape(g.cote.raport!, trepte.reduce((r, [a, b]) => r * b / a, 1), 1e-12, `${ce}: raportul`);
    // pereții sunt cât trebuie de înalți: roata cea mai mare trece cu cel puțin 0,4 mm peste știfturile plăcii (5,1 mm), dar
    // nu cu o cărămidă întreagă mai mult (cu un perete mai jos, ar atinge placa)
    const jos = Math.min(...roti.map(i => josPlasa(T[i]!, fa(g.piese[i]!.def).tri)));
    assert.ok(jos >= 5.1 + 0.4 - 1e-6 && jos < 5.1 + 0.4 + 9.6, `${ce}: roțile deasupra plăcii (${jos})`);
  }
});

test('cutia de angrenaje, proba de control: cu roata condusă întoarsă cu o jumătate de dinte, roțile intră una în alta', () => {
  const g = Lm.constructieGata('angrenaje', { raport: '1:3' }), roti = indici(g, 'rotita'), axe = indici(g, 'ax');
  // axul roții conduse (prins de perete printr-o gaură rotundă) se rotește cu 7,5° (o jumătate de dinte la 24)
  const axCondus = axe.find(i => g.piese[roti[1]!]!.prins!.de === i)!;
  const T = asezari(g, new Map([[axCondus, 7.5]])), v = verifica(g, T);
  assert.ok(Math.abs(imbucare(g, T, roti[0]!, roti[1]!) - 0.5) > 0.4, 'întoarsă, nu se mai îmbucă');
  assert.ok(v.piese[roti[0]!]!.intra.includes(roti[1]!), 'verificarea vede roțile una în alta');
});

test('cutia de angrenaje: fără raport, 1 : 3; un raport necunoscut (și unul scris ca număr) dă 1 : 3, cu un avertisment', () => {
  const implicita = Lm.constructieGata('angrenaje');
  assert.equal(implicita.cote.raport, 3);
  assert.deepEqual([...implicita.avert], []);
  for (const raport of ['2:7', 9]) {
    const g = Lm.constructieGata('angrenaje', { raport });
    assert.equal(g.cote.raport, 3, String(raport));
    assert.equal(g.avert.length, 1, String(raport));
  }
  // cu spații, se citește
  assert.equal(Lm.constructieGata('angrenaje', { raport: '1 : 9' }).cote.raport, 9);
});

// ---------------------------------------------------------------------------------------------------- brațul de macara
test('brațul de macara: stâlpul de H cărămizi, pivotul la 3,2 + 9,6 · (H − 1) + 5,8, brațul la unghiul cerut, fulia în vârf', () => {
  for (const [inalt, brat, unghi] of [[4, 9, 45], [2, 5, 0], [8, 15, 80], [5, 11, 30]] as const) {
    const ce = `macaraua ${inalt} / ${brat} / ${unghi}°`, g = Lm.constructieGata('macara', { inalt, brat, unghi });
    assert.deepEqual([...g.avert], [], ce);
    const T = buna(g, ce);
    // stâlpul: H − 1 cărămizi 1 × 2 și o cărămidă Technic 1 × 2
    assert.equal(indici(g, 'caramida').length, 1 + inalt - 1, `${ce}: placa și cărămizile stâlpului`);
    assert.deepEqual(indici(g, 'caramidaTechnic').map(i => g.piese[i]!.def.lung), [2], ce);
    const ig = indici(g, 'grinda')[0]!, celule = g.piese[ig]!.def.celule as unknown[];
    assert.equal(celule.length, brat, `${ce}: brațul are ${brat} găuri`);
    // găurile brațului: prima pe axa pivotului, ultima la 8 · (n − 1) de ea, pe direcția (cos u, 0, sin u)
    const c = fa(g.piese[ig]!.def), gura = (k: number) => c.prinderi.filter(p => p.fel === 'gauraStift')[2 * k]!;
    const prima = aplica(T[ig]!, gura(0).p), ultima = aplica(T[ig]!, gura(brat - 1).p), axa = roteste(T[ig]!, gura(0).d);
    const dir = minus(ultima, prima), u = unghi * Math.PI / 180;
    aproape(lung(dir), 8 * (brat - 1), 1e-9, `${ce}: lungimea brațului`);
    aproape(dir[0] / lung(dir), Math.cos(u), 1e-9, `${ce}: brațul spre +x`);
    aproape(dir[1], 0, 1e-9, `${ce}: brațul, în planul xz`);
    aproape(dir[2] / lung(dir), Math.sin(u), 1e-9, `${ce}: unghiul brațului`);
    aproape(Math.abs(axa[1]), 1, 1e-9, `${ce}: pivotul, pe y`);
    // pivotul: înălțimea pe hârtie (placa, cărămizile, gaura Technic)
    // (gura găurii stă pe axa ei, deci are înălțimea pivotului)
    aproape(prima[2], 3.2 + 9.6 * (inalt - 1) + 5.8, 1e-9, `${ce}: înălțimea pivotului`);
    aproape(g.cote.pivot!, 3.2 + 9.6 * (inalt - 1) + 5.8, 1e-9, ce);
    aproape(g.cote.raza!, 8 * (brat - 1) * Math.cos(u), 1e-9, `${ce}: raza`);
    aproape(g.cote.varf!, 3.2 + 9.6 * (inalt - 1) + 5.8 + 8 * (brat - 1) * Math.sin(u), 1e-9, `${ce}: înălțimea vârfului`);
    // fulia: în vârf, pe axul din ultima gaură
    const f = centru(g, T, indici(g, 'fulie')[0]!);
    aproape(Math.hypot(f.c[0] - ultima[0], f.c[2] - ultima[2]), 0, 1e-9, `${ce}: fulia, pe axa ultimei găuri`);
    aproape(Math.abs(f.n[1]), 1, 1e-9, `${ce}: fulia, paralelă cu brațul`);
  }
});

test('brațul de macara: înălțimea, lungimea și unghiul ies în margini, cu un avertisment fiecare', () => {
  const g = Lm.constructieGata('macara', { inalt: 1, brat: 30, unghi: 95 });
  assert.equal(g.avert.length, 3);
  assert.equal((g.piese[indici(g, 'grinda')[0]!]!.def.celule as unknown[]).length, 15);
  assert.equal(g.cote.pivot, 3.2 + 9.6 + 5.8);
  aproape(g.cote.raza!, 8 * 14 * Math.cos(80 * Math.PI / 180), 1e-9, 'unghiul, la 80°');
});

// ---------------------------------------------------------------------------------------------------- barca cu elice
test('barca: corpul cu prora ascuțită, cabina, blocul motorului, axul și elicea în spatele pupei, pe axa bărcii', () => {
  for (const [lung, lat, diametru, palete] of [[10, 6, 32, 3], [8, 4, 24, 3], [16, 8, 48, 5], [12, 6, 40, 4]] as const) {
    const ce = `barca ${lung} × ${lat}, Ø${diametru}`, g = Lm.constructieGata('barca', { lung, lat, diametru, palete });
    assert.deepEqual([...g.avert], [], ce);
    const T = buna(g, ce);
    // corpul: dreptunghi, cu ultimele t = W / 2 − 1 coloane mai înguste cu câte o celulă de fiecare parte
    const t = lat / 2 - 1, celule = (g.piese[0]!.def.celule as [number, number][]).map(c => `${c[0]},${c[1]}`), dorite: string[] = [];
    for (let i = 0; i < lung; i++) { const j0 = Math.max(0, i - (lung - 1 - t)); for (let j = j0; j < lat - j0; j++) dorite.push(`${i},${j}`); }
    assert.deepEqual([...celule].sort(), [...dorite].sort(), `${ce}: forma corpului`);
    assert.equal(celule.length, lung * lat - t * (t + 1), ce);
    const ie = indici(g, 'eliceBarca')[0]!;
    assert.deepEqual([g.piese[ie]!.def.diametru, g.piese[ie]!.def.palete], [diametru, palete], ce);
    // elicea: toată în spatele pupei (x < 0,1, fața corpului), cu axa pe x, la mijlocul lățimii, cu fața dinspre barcă (z = 0
    // a piesei) spre barcă
    const [, hi] = Lm.cutieTransf(T[ie]!, fa(g.piese[ie]!.def).dim);
    assert.ok(hi[0] < 0.1 - 1, `${ce}: elicea, în spatele pupei (${hi[0]})`);
    const e = centru(g, T, ie);
    aproape(e.n[0], -1, 1e-9, `${ce}: elicea, cu spatele spre barcă`);
    aproape(e.c[1], 4 * lat, 1e-9, `${ce}: elicea, la mijlocul lățimii`);
    const jos = josPlasa(T[ie]!, fa(g.piese[ie]!.def).tri);
    assert.ok(jos >= -1e-9 && jos < 3.2, `${ce}: elicea atinge masa (${jos})`);
    // cabina 2 × 2, pe corp, la mijloc
    assert.ok(indici(g, 'caramida').some(i => i > 0 && (g.piese[i]!.def.celule as unknown[]).length === 4), `${ce}: cabina`);
  }
});

test('barca: lungimea, lățimea (pară), diametrul și paletele ies în margini, cu un avertisment fiecare', () => {
  const g = Lm.constructieGata('barca', { lung: 30, lat: 5, diametru: 100, palete: 9 });
  assert.equal(g.avert.length, 4);
  const ie = indici(g, 'eliceBarca')[0]!;
  assert.deepEqual([g.piese[ie]!.def.diametru, g.piese[ie]!.def.palete], [48, 5]);
  assert.equal(Math.max(...(g.piese[0]!.def.celule as [number, number][]).map(c => c[1])) + 1, 6);
  assert.equal(Math.max(...(g.piese[0]!.def.celule as [number, number][]).map(c => c[0])) + 1, 16);
});
