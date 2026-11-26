/**
 * Verificarea din vederea „Modelul” a atelierului Easy 3Draw (ADR 0284, partea D; felia 3.Cg), pe funcțiile pure ale
 * motorului. Pentru fiecare piesă, modelul spune dacă e prinsă, dacă plutește sau dacă intră în alta:
 * - `prinseInLume`: prinderile a două piese așezate în lume care sunt făcute (felurile se prind, direcțiile sunt opuse,
 *   axele coincid; știftul și bila stau până la capăt, iar o tijă ține cât are cel puțin 2 mm în gaură);
 * - `seCiocnesc`: două plase au lemn comun mai gros de un sfert de milimetru (judecat pe plase, cu numărul de înfășurare:
 *   corpurile unei piese se suprapun, iar o gaură rămâne gaură);
 * - `verificaModel`: pentru fiecare piesă, de cine e prinsă, în cine intră și dacă plutește; plutește o piesă care nu stă
 *   pe masă și nu e prinsă, nici prin alte piese, de una care stă.
 * Valorile sunt pe hârtie, din cotele pieselor: cărămida 2 × 4 (31,8 × 15,8 × 11,5: corpul de 9,6 și știfturile de 1,9, la
 * 3,9 + 8·i), placa 2 × 2 (15,8 × 15,8 × 5,1), grinda de 3 (23,2 × 7,2 × 7,8, cu găurile la 3,6 + 8·i), axul de 3 (23,8),
 * rotița (26 × 26 × 3,8, cu gaura de ax în mijloc). Pe grilă, o piesă stă cu 0,1 mm (grinda, 0,4) de marginea amprentei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, type Piesa, type P3, type Tri } from './ajutor-plasa-lego.ts';

type Def = Record<string, unknown> & { tip: string };
type Prindere = { fel: string; p: number[]; d: number[]; lung: number };
type Transf = { m: number[]; t: number[] };
type Asezare = { gw: number; gd: number; pivot: number[]; ax: boolean };
type Corp = Piesa & { ax: number[] | null; prinderi: Prindere[] };
type Prins = { de: string; a: number; b: number; unghi?: number; alunec?: number };
type PiesaModel = { id: string; grila: Transf; prinderi: readonly Prindere[]; prins?: Prins | null; liber?: Transf | null };
type DeVerificat = { T: Transf; tri: readonly Tri[]; prinderi: readonly Prindere[]; cheie?: string };
type Verificat = { piese: { prinsa: number[]; intra: number[]; pluteste: boolean }[]; bucati: number };
const Lm = L as unknown as {
  construieste(d: Def): Corp;
  asezareModel(d: Def, corp?: Corp): Asezare;
  transfGrila(a: Asezare, x: number, y: number, z: number, rot: number): Transf;
  compuneTransf(A: Transf, B: Transf): Transf;
  rezolvaModel(piese: readonly PiesaModel[]): { T: Transf; fel: string }[];
  prinseInLume(pa: readonly Prindere[], Ta: Transf, pb: readonly Prindere[], Tb: Transf): [number, number][];
  seCiocnesc(a: readonly Tri[], b: readonly Tri[], T: Transf): boolean;
  verificaModel(piese: readonly DeVerificat[], memo?: Map<string, boolean>): Verificat;
};
const rand = (n: number, m = 1): [number, number][] => Array.from({ length: n * m }, (_, k): [number, number] => [k % n, Math.floor(k / n)]);

const CARAMIDA: Def = { tip: 'caramida', celule: rand(4, 2) }, PLACA: Def = { tip: 'caramida', celule: rand(2, 2), placi: 1 };
const GRINDA: Def = { tip: 'grinda' }, AX: Def = { tip: 'ax', lung: 3 }, ROATA: Def = { tip: 'rotita' };
const corpuri = new Map<string, Corp>();
const fa = (d: Def): Corp => { const k = JSON.stringify(d); let c = corpuri.get(k); if (!c) { c = Lm.construieste(d); corpuri.set(k, c); } return c; };
const grila = (d: Def, x: number, y: number, z = 0, rot = 0) => Lm.transfGrila(Lm.asezareModel(d, fa(d)), x, y, z, rot);
const UNITATE = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mutare = (x: number, y: number, z: number): Transf => ({ m: [...UNITATE], t: [x, y, z] });
/** O piesă a modelului de probă: pe grilă (x, y în știfturi, z în plăci), liberă (mutată cu mm față de grilă) sau prinsă. */
type Pusa = { d: Def; x?: number; y?: number; z?: number; rot?: number; cu?: [number, number, number]; prins?: Prins };
/** Modelul, cum îl dă atelierul verificării: așezările de la `rezolvaModel`, plasa și prinderile fiecărei piese. */
function model(piese: readonly Pusa[], peste?: Transf): DeVerificat[] {
  const A = Lm.rezolvaModel(piese.map((p, i) => {
    const g = grila(p.d, p.x ?? 0, p.y ?? 0, p.z ?? 0, p.rot ?? 0);
    return { id: `p${i}`, grila: g, prinderi: fa(p.d).prinderi, prins: p.prins ?? null, liber: p.cu ? Lm.compuneTransf(mutare(...p.cu), g) : null };
  }));
  return piese.map((p, i) => ({ T: peste ? Lm.compuneTransf(peste, A[i]!.T) : A[i]!.T, tri: fa(p.d).tri, prinderi: fa(p.d).prinderi, cheie: JSON.stringify(p.d) }));
}
const verifica = (piese: readonly Pusa[], peste?: Transf) => { const v = Lm.verificaModel(model(piese, peste)); return { bucati: v.bucati, piese: v.piese.map((p) => ({ prinsa: [...p.prinsa], intra: [...p.intra], pluteste: p.pluteste })) }; };
const BINE = { prinsa: [] as number[], intra: [] as number[], pluteste: false };

// ---------------------------------------------------------------------------------------------------- ciocnirea, pe cutii
/** Cutia de la `a` la `b`, ca plasă închisă cu fețele spre afară (12 triunghiuri); `intoarsa`: cu fețele spre înăuntru (un gol). */
function cutie(a: P3, b: P3, intoarsa = false): Tri[] {
  const v = (k: number): P3 => [k & 1 ? b[0] : a[0], k & 2 ? b[1] : a[1], k & 4 ? b[2] : a[2]];
  // fețele, cu colțurile în sens trigonometric privite din afară
  const fete = [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]];
  const tri: Tri[] = [];
  for (const [p, q, r, s] of fete) { tri.push([v(p!), v(q!), v(r!)], [v(p!), v(r!), v(s!)]); }
  return intoarsa ? tri.map(([p, q, r]): Tri => [p, r, q]) : tri;
}
const PE_LOC: Transf = { m: [...UNITATE], t: [0, 0, 0] };
const ZECE = cutie([0, 0, 0], [10, 10, 10]);

test('ciocnirea, pe cutii: lemnul comun mai subțire de un sfert de milimetru nu e ciocnire; cel de peste o jumătate, da', () => {
  const lovit = (a: P3, b: P3) => Lm.seCiocnesc(ZECE, cutie(a, b), PE_LOC);
  // alături, pe x: lipite, apoi intrate cu 0,2 și cu 0,6 mm
  assert.equal(lovit([10, 0, 0], [20, 10, 10]), false, 'lipite');
  assert.equal(lovit([9.8, 0, 0], [20, 10, 10]), false, 'intrate cu 0,2 mm');
  assert.equal(lovit([9.4, 0, 0], [20, 10, 10]), true, 'intrate cu 0,6 mm');
  // la fel pe fiecare axă: o felie lată (5 × 5 mm), dar groasă de 0,2 mm, nu e ciocnire, oricare ar fi axa pe care e subțire
  for (let k = 0; k < 3; k++) {
    const a: P3 = [5, 5, 5], b: P3 = [15, 15, 15];
    a[k] = 9.8;
    assert.equal(lovit(a, b), false, `felie de 0,2 mm pe axa ${k}`);
    a[k] = 9.4;
    assert.equal(lovit(a, b), true, `felie de 0,6 mm pe axa ${k}`);
    // și de partea cealaltă a cutiei
    const c: P3 = [-5, -5, -5], d: P3 = [5, 5, 5];
    d[k] = 0.2;
    assert.equal(lovit(c, d), false, `felie de 0,2 mm pe axa ${k}, din partea cealaltă`);
    d[k] = 0.6;
    assert.equal(lovit(c, d), true, `felie de 0,6 mm pe axa ${k}, din partea cealaltă`);
  }
  // departe; una cu totul în cealaltă (fețele nu se taie, dar lemnul e comun), în amândouă sensurile; aceeași cutie de două ori
  assert.equal(lovit([30, 0, 0], [40, 10, 10]), false, 'departe');
  assert.equal(lovit([3, 3, 3], [7, 7, 7]), true, 'cea mică, în cea mare');
  assert.equal(Lm.seCiocnesc(cutie([3, 3, 3], [7, 7, 7]), ZECE, PE_LOC), true, 'cea mare, peste cea mică');
  assert.equal(Lm.seCiocnesc(ZECE, ZECE, PE_LOC), true, 'în același loc');
});

test('ciocnirea, cu cutiile mult suprapuse: o felie subțire de lemn comun tot nu e ciocnire, pe raze sau de-a latul lor', () => {
  // a doua piesă e din trei cutii: una lângă prima (sau intrată puțin în ea) și două mici, departe, în colțuri opuse, care
  // doar îi întind cutia peste toată prima. Partea comună a cutiilor e atunci cubul întreg, iar razele merg pe x
  const departe = [...cutie([-6, -6, -6], [-5, -5, -5]), ...cutie([20, 20, 20], [21, 21, 21])];
  const cuFelie = (a: P3, b: P3) => Lm.seCiocnesc(ZECE, [...cutie(a, b), ...departe], PE_LOC);
  assert.equal(Lm.seCiocnesc(ZECE, departe, PE_LOC), false, 'cutiile de departe nu ating nimic');
  // felia e subțire de-a lungul razelor (0,1 mm pe x): fiecare rază are lemn comun, dar prea scurt
  assert.equal(cuFelie([9.9, 0, 0], [20, 10, 10]), false, 'felie de 0,1 mm pe raze');
  assert.equal(cuFelie([9.4, 0, 0], [20, 10, 10]), true, 'felie de 0,6 mm pe raze');
  // felia e subțire de-a latul razelor (0,1 mm pe y sau pe z): o prinde cel mult un rând de raze, nu patru vecine
  assert.equal(cuFelie([2, 9.9, 0], [8, 19, 10]), false, 'felie de 0,1 mm pe y');
  assert.equal(cuFelie([2, 9.4, 0], [8, 19, 10]), true, 'felie de 0,6 mm pe y');
  assert.equal(cuFelie([2, 0, 9.9], [8, 10, 19]), false, 'felie de 0,1 mm pe z');
  assert.equal(cuFelie([2, 0, 9.4], [8, 10, 19]), true, 'felie de 0,6 mm pe z');
  // la fel la marginea cealaltă a primei cutii (acolo, primul rând de raze, la 0,16 mm de margine, cade în felia de 0,2 mm)
  assert.equal(cuFelie([2, -9, 0], [8, 0.2, 10]), false, 'felie de 0,2 mm pe y, la marginea de jos');
  assert.equal(cuFelie([2, -9, 0], [8, 0.6, 10]), true, 'felie de 0,6 mm pe y, la marginea de jos');
  assert.equal(cuFelie([2, 0, -9], [8, 10, 0.2]), false, 'felie de 0,2 mm pe z, la marginea de jos');
  assert.equal(cuFelie([2, 0, -9], [8, 10, 0.6]), true, 'felie de 0,6 mm pe z, la marginea de jos');
});

test('ciocnirea ține seama de așezare: a doua plasă e dusă cu transformarea ei', () => {
  // o cutie mică, făcută departe de prima și adusă cu transformarea în mijlocul ei
  assert.equal(Lm.seCiocnesc(ZECE, cutie([100, 100, 100], [103, 103, 103]), mutare(-97, -97, -97)), true, 'adusă de departe, în mijloc');
  assert.equal(Lm.seCiocnesc(ZECE, cutie([100, 100, 100], [103, 103, 103]), mutare(-87, -97, -97)), false, 'adusă de departe, alături');
  // aceeași cutie, mutată: cu 9,4 mm se mai ating pe 0,6; cu 9,8, pe 0,2; cu 10, deloc
  assert.equal(Lm.seCiocnesc(ZECE, ZECE, mutare(9.4, 0, 0)), true);
  assert.equal(Lm.seCiocnesc(ZECE, ZECE, mutare(9.8, 0, 0)), false);
  assert.equal(Lm.seCiocnesc(ZECE, ZECE, mutare(0, 0, -10)), false);
  // rotită cu 45° în jurul verticalei, cu o muchie spre fața x = 10 a primei: muchia intră cu d, deci lemnul comun e o pană
  // înaltă de d și lată de 2·d la față. Cu d = 0,2, pana nu cuprinde un sfert de milimetru; cu d = 2, cuprinde.
  // (colțul (0, 0) al cutiei rotite rămâne în origine, iar muchia ei cea mai din stânga ajunge la (−10·s, 10·s); mutarea
  // de mai jos o duce la x = 10, y = 5)
  const s = Math.SQRT1_2, rotita: Transf = { m: [s, -s, 0, s, s, 0, 0, 0, 1], t: [10 + 10 * s, 5 - 10 * s, 0] };
  assert.equal(Lm.seCiocnesc(ZECE, ZECE, { m: rotita.m, t: [rotita.t[0]! - 0.2, rotita.t[1]!, 0] }), false, 'muchia intrată cu 0,2 mm');
  assert.equal(Lm.seCiocnesc(ZECE, ZECE, { m: rotita.m, t: [rotita.t[0]! - 2, rotita.t[1]!, 0] }), true, 'muchia intrată cu 2 mm');
  assert.equal(Lm.seCiocnesc(ZECE, ZECE, { m: rotita.m, t: [rotita.t[0]! + 0.2, rotita.t[1]!, 0] }), false, 'muchia la 0,2 mm de față');
});

test('ciocnirea numără lemnul, nu fețele: corpurile suprapuse ale unei piese sunt lemn, iar golul unei piese rămâne gol', () => {
  // o piesă din două cutii care se suprapun pe x 5 … 10 (ca piesele motorului): acolo, un punct e în amândouă
  const dubla = [...ZECE, ...cutie([5, 0, 0], [15, 10, 10])];
  assert.equal(Lm.seCiocnesc(dubla, cutie([6, 3, 3], [9, 6, 6]), PE_LOC), true, 'în zona suprapusă');
  assert.equal(Lm.seCiocnesc(dubla, cutie([11, 3, 3], [14, 6, 6]), PE_LOC), true, 'în a doua cutie');
  assert.equal(Lm.seCiocnesc(dubla, cutie([16, 3, 3], [19, 6, 6]), PE_LOC), false, 'lângă ele');
  // o cutie goală pe dinăuntru (pereți de 2 mm): în gol nu e lemn; în perete, da
  const goala = [...ZECE, ...cutie([2, 2, 2], [8, 8, 8], true)];
  assert.equal(Lm.seCiocnesc(goala, cutie([4, 4, 4], [6, 6, 6]), PE_LOC), false, 'în gol');
  assert.equal(Lm.seCiocnesc(goala, cutie([2.2, 2.2, 2.2], [7.8, 7.8, 7.8]), PE_LOC), false, 'cât golul, cu 0,2 mm de joc');
  assert.equal(Lm.seCiocnesc(goala, cutie([4, 4, 4], [6, 6, 9]), PE_LOC), true, 'din gol, prin tavan');
  assert.equal(Lm.seCiocnesc(cutie([0.5, 4, 4], [1.5, 6, 6]), goala, PE_LOC), true, 'în perete');
});

// ---------------------------------------------------------------------------------------------------- ciocnirea, pe piese
test('ciocnirea, pe piesele motorului: perechile montate nu se ciocnesc (jocurile lor sunt zecimi); mutate cu 1 mm într-o parte, se ciocnesc', () => {
  type Montaj = (a: Prindere, b: Prindere, unghi?: number) => Transf;
  const montaj = (L as unknown as { montaj: Montaj }).montaj;
  const primul = (def: Def, fel: string, k = 0) => { const p = fa(def); return [p, p.prinderi.filter((c) => c.fel === fel)[k]!] as const; };
  // [numele, piesa întâi și prinderea ei, a doua și prinderea ei, în câte din cele patru direcții se ciocnesc mutate, unghiul]
  const perechi: readonly (readonly [string, readonly [Corp, Prindere], readonly [Corp, Prindere], number, number?])[] = [
    ['placa 2 × 2 pe cărămida 2 × 4', primul(CARAMIDA, 'stift', 1), primul(PLACA, 'locas', 0), 4],
    ['cărămida pe știftul lateral', primul({ tip: 'lateral', lung: 2 }, 'stift', 2), primul({ tip: 'caramida', celule: rand(2), placi: 1 }, 'locas', 0), 4],
    ['știftul în grindă', primul(GRINDA, 'gauraStift', 2), primul({ tip: 'stiftTechnic' }, 'stiftTechnic', 0), 4],
    ['știftul cu ax în grindă (gulerul în lamaj)', primul(GRINDA, 'gauraStift', 0), primul({ tip: 'stiftTechnic', capat: 'ax' }, 'capatAx', 0), 4],
    ['axul în bucșă', primul({ tip: 'bucsa' }, 'gauraAx', 0), primul(AX, 'capatAx', 0), 4],
    ['axul în rotiță', primul(ROATA, 'gauraAx', 1), primul(AX, 'capatAx', 1), 4],
    ['axul în grindă (se rotește liber)', primul(GRINDA, 'gauraStift', 0), primul(AX, 'capatAx', 0), 4],
    ['axul în manșonul conectorului în unghi', primul({ tip: 'conectorUnghi' }, 'gauraAx', 1), primul({ tip: 'ax', lung: 4 }, 'capatAx', 0), 4],
    ['bara în clemă', primul({ tip: 'clema' }, 'clema', 0), primul({ tip: 'bara', lung: 3 }, 'bara', 0), 4],
    // clema e deschisă într-o parte: pe acolo, bara mânerului iese din ea fără să o atingă
    ['clema pe mâner', primul({ tip: 'maner', lung: 2, axa: 'orizontala' }, 'bara', 0), primul({ tip: 'clema', axa: 'orizontala' }, 'clema', 0), 3, 180],
    ['bara în știftul gol', primul({ tip: 'caramida', celule: rand(2), placi: 1, goale: true }, 'gauraBara', 0), primul({ tip: 'bara', lung: 2 }, 'bara', 1), 4],
    ['bila în cupă', primul({ tip: 'cupa' }, 'cupa', 0), primul({ tip: 'bila' }, 'bila', 0), 4],
  ];
  const vect = (p: readonly number[], q: readonly number[]): number[] => [p[1]! * q[2]! - p[2]! * q[1]!, p[2]! * q[0]! - p[0]! * q[2]!, p[0]! * q[1]! - p[1]! * q[0]!];
  for (const [nume, [pa, a], [pb, b], cate, unghi] of perechi) {
    assert.ok(a && b, `${nume}: amândouă prinderile există`);
    const M = montaj(a, b, unghi ?? 0);
    assert.equal(Lm.seCiocnesc(pa.tri, pb.tri, M), false, `${nume}: montate, nu se ciocnesc`);
    // la fel, judecat din coordonatele celeilalte piese (cu montajul întors)
    assert.equal(Lm.seCiocnesc(pb.tri, pa.tri, montaj(b, a, unghi ?? 0)), false, `${nume}: montate, nu se ciocnesc (din partea cealaltă)`);
    // cele două direcții perpendiculare pe prindere, în amândouă sensurile
    const u = vect(a.d, Math.abs(a.d[2]!) < 0.9 ? [0, 0, 1] : [1, 0, 0]), lu = Math.hypot(...u), v = vect(a.d, u.map((x) => x / lu));
    const lovite = [u.map((x) => x / lu), v, u.map((x) => -x / lu), v.map((x) => -x)].filter((w) => Lm.seCiocnesc(pa.tri, pb.tri, { m: M.m, t: M.t.map((x, k) => x + w[k]!) })).length;
    assert.ok(lovite >= cate, `${nume}: mutate cu 1 mm, se ciocnesc în ${lovite} din 4 direcții (cer ${cate})`);
  }
});

// ---------------------------------------------------------------------------------------------------- prinderile făcute
test('prinderile făcute: placa 2 × 2 pusă pe grilă peste cărămida 2 × 4 stă pe patru știfturi', () => {
  const [jos, sus] = model([{ d: CARAMIDA }, { d: PLACA, x: 1, z: 3 }]);
  // știfturile cărămizii sunt prinderile 8 … 15 (la 3,9 + 8·i, pe două rânduri); placa, de la x = 8, cade pe al doilea și al treilea
  // (tablourile motorului vin din alt tărâm: se copiază în al probei)
  const perechi = (l: [number, number][]) => Array.from(l, ([i, j]) => [i, j]);
  assert.deepEqual(perechi(Lm.prinseInLume(jos!.prinderi, jos!.T, sus!.prinderi, sus!.T)), [[9, 0], [10, 1], [13, 2], [14, 3]]);
  // și invers, cu perechile întoarse
  assert.deepEqual(perechi(Lm.prinseInLume(sus!.prinderi, sus!.T, jos!.prinderi, jos!.T)), [[0, 9], [1, 10], [2, 13], [3, 14]]);
});

test('prinderile făcute: știftul ține doar până la capăt, pe axa lui și față în față', () => {
  const prinse = (sus: Pusa) => { const [a, b] = model([{ d: CARAMIDA }, sus]); return Lm.prinseInLume(a!.prinderi, a!.T, b!.prinderi, b!.T).length; };
  assert.equal(prinse({ d: PLACA, x: 1, z: 3 }), 4);
  // o jumătate de placă mai sus (1,6 mm): știfturile mai sunt în locașuri cu 0,3 mm, dar nu mai țin
  assert.equal(prinse({ d: PLACA, x: 1, z: 3, cu: [0, 0, 1.6] }), 0, 'o jumătate de placă mai sus');
  // la 0,03 mm e tot acolo (jocul socotelii); la 0,2, nu
  assert.equal(prinse({ d: PLACA, x: 1, z: 3, cu: [0, 0, 0.03] }), 4);
  assert.equal(prinse({ d: PLACA, x: 1, z: 3, cu: [0, 0, 0.2] }), 0);
  // alături de axă: la 0,03 mm ține, la 0,2 nu; o jumătate de știft (4 mm) e între știfturi
  assert.equal(prinse({ d: PLACA, x: 1, z: 3, cu: [0.03, 0, 0] }), 4);
  assert.equal(prinse({ d: PLACA, x: 1, z: 3, cu: [0.2, 0, 0] }), 0);
  assert.equal(prinse({ d: PLACA, x: 1, z: 3, cu: [4, 0, 0] }), 0);
  // rotită un sfert de tură, placa pătrată stă tot pe patru știfturi; alături de cărămidă, pe niciunul
  assert.equal(prinse({ d: PLACA, x: 1, z: 3, rot: 1 }), 4);
  assert.equal(prinse({ d: PLACA, x: 4, z: 3 }), 0);
  // două cărămizi una lângă alta (știft lângă știft, locaș lângă locaș): nimic nu se prinde
  assert.equal(prinse({ d: CARAMIDA, x: 4 }), 0);
});

test('prinderile făcute: o piesă înclinată nu mai stă față în față (peste 1°)', () => {
  const [jos, sus] = model([{ d: CARAMIDA }, { d: PLACA, x: 1, z: 3 }]);
  // placa, înclinată în jurul rândului ei din față (dreapta prin locașurile 1 și 2, la y = 4, z = 9,6)
  const inclinata = (grade: number) => {
    const u = grade * Math.PI / 180, c = Math.cos(u), s = Math.sin(u), R: Transf = { m: [1, 0, 0, 0, c, -s, 0, s, c], t: [0, 4 - 4 * c + 9.6 * s, 9.6 - 4 * s - 9.6 * c] };
    return Array.from(Lm.prinseInLume(jos!.prinderi, jos!.T, sus!.prinderi, Lm.compuneTransf(R, sus!.T)), ([i, j]) => [i, j]);
  };
  assert.deepEqual(inclinata(0), [[9, 0], [10, 1], [13, 2], [14, 3]]);
  // cu 0,5°, locașurile de pe dreaptă mai țin; cele din spate s-au ridicat cu 8 · sin 0,5° = 0,07 mm
  assert.deepEqual(inclinata(0.5), [[9, 0], [10, 1]]);
  assert.deepEqual(inclinata(3), []);
  assert.deepEqual(inclinata(180), []);
});

test('prinderile făcute: o gaură mai scurtă de 2 mm ține cât e ea; știftul mai înalt decât locașul ține unde îl lasă montajul', () => {
  type Montaj = (a: Prindere, b: Prindere, unghi?: number) => Transf;
  const Lp = L as unknown as { montaj: Montaj; seteaza(p: Record<string, unknown> | null): void };
  // bara în știftul gol al cărămizii Technic (gaura ține cât știftul, 1,9 mm): montată, e prinsă
  const gol = fa({ tip: 'caramidaTechnic', lung: 2, goale: true }), bara = fa({ tip: 'bara', lung: 2 });
  const a = gol.prinderi.findIndex((c) => c.fel === 'gauraBara'), b = bara.prinderi.findIndex((c) => c.fel === 'bara');
  assert.equal(gol.prinderi[a]!.lung, 1.9);
  const M = Lp.montaj(gol.prinderi[a]!, bara.prinderi[b]!);
  assert.ok(Lm.prinseInLume(gol.prinderi, PE_LOC, bara.prinderi, M).some(([i, j]) => i === a && j === b), 'bara în știftul gol');
  // ridicată cu 1 mm, mai are 0,9 mm în gaură: nu ține
  assert.equal(Lm.prinseInLume(gol.prinderi, PE_LOC, bara.prinderi, { m: M.m, t: M.t.map((x, k) => x + gol.prinderi[a]!.d[k]!) }).length, 0);
  // știftul de 2,6 într-un locaș de 2,1: piesa de deasupra rămâne cu 0,5 mm mai sus, și acolo e prinsă (nu cu fețele lipite)
  try {
    Lp.seteaza({ stift_h: 2.6, locas_h: 2.1, locas_urmeaza: false });
    const jos = Lm.construieste({ tip: 'caramida', celule: rand(2, 2) }), sus = Lm.construieste({ tip: 'caramida', celule: rand(2, 2), placi: 1, fund: 'locasuri' });
    const st = jos.prinderi.findIndex((c) => c.fel === 'stift'), lo = sus.prinderi.findIndex((c) => c.fel === 'locas');
    assert.deepEqual([jos.prinderi[st]!.lung, sus.prinderi[lo]!.lung], [2.6, 2.1]);
    const N = Lp.montaj(jos.prinderi[st]!, sus.prinderi[lo]!);
    assert.equal(Lm.prinseInLume(jos.prinderi, PE_LOC, sus.prinderi, N).length, 4, 'la 0,5 mm deasupra');
    assert.equal(Lm.prinseInLume(jos.prinderi, PE_LOC, sus.prinderi, { m: N.m, t: [N.t[0]!, N.t[1]!, N.t[2]! - 0.5] }).length, 0, 'cu fețele lipite (știftul ar trece prin fundul locașului)');
  } finally { Lp.seteaza(null); }
});

/** Grinda pe masă, axul de 3 înfipt de sus în gaura din mijloc și glisat în sus cu `ax` mm, rotița pe ax la `roata` mm de rădăcină. */
const montat = (ax: number, roata?: number, unghi = 0): Pusa[] => [{ d: GRINDA },
  { d: AX, prins: { de: 'p0', a: 2, b: 0, alunec: ax } }, ...(roata === undefined ? [] : [{ d: ROATA, prins: { de: 'p1', a: 0, b: 1, alunec: roata, unghi } }])];

test('prinderile făcute: o tijă ține cât are cel puțin 2 mm în gaură', () => {
  const prinse = (ax: number) => { const [g, a] = model(montat(ax)); return Lm.prinseInLume(g!.prinderi, g!.T, a!.prinderi, a!.T).length > 0; };
  // axul (23,8) intră de sus în gaura grinzii (7,8): neglisat, rădăcina e la gură și axul trece cu 16 mm pe dedesubt
  assert.equal(prinse(0), true);
  assert.equal(prinse(8), true);
  // glisat cu 20,8, mai are 3 mm în gaură; cu 22,8, doar 1 mm; cu 30, e deasupra grinzii
  assert.equal(prinse(20.8), true, '3 mm în gaură');
  assert.equal(prinse(22.8), false, '1 mm în gaură');
  assert.equal(prinse(30), false, 'ieșit din gaură');
  // împins în jos peste rădăcină: cu 10 mm, axul a trecut cu totul de gaură (rădăcina e la 2,2 sub fața de jos)
  assert.equal(prinse(-5), true, 'rădăcina la 5 mm sub gură, 2,8 mm în gaură');
  assert.equal(prinse(-10), false, 'trecut prin gaură');
});

test('prinderile făcute: crucea axului ține doar braț pe braț', () => {
  const prinse = (unghi: number) => { const [, a, r] = model(montat(8, 0, unghi)); return Lm.prinseInLume(a!.prinderi, a!.T, r!.prinderi, r!.T).length > 0; };
  assert.equal(prinse(0), true);
  assert.equal(prinse(90), true);
  assert.equal(prinse(45), false);
  assert.equal(prinse(10), false);
});

// ---------------------------------------------------------------------------------------------------- modelul
test('verificarea: placa pe cărămidă e prinsă; o placă mai sus plutește; două plăci mai jos intră în cărămidă', () => {
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: PLACA, x: 1, z: 3 }]), { bucati: 1, piese: [{ prinsa: [1], intra: [], pluteste: false }, { prinsa: [0], intra: [], pluteste: false }] });
  // cu o placă mai sus (3,2 mm), e în aer: nu atinge nimic și nu stă pe masă
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: PLACA, x: 1, z: 4 }]), { bucati: 2, piese: [BINE, { prinsa: [], intra: [], pluteste: true }] });
  // cu o placă mai jos, corpul ei (6,4 … 9,6) e în pereții cărămizii: intră în ea (și e în aer, neprinsă)
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: PLACA, x: 1, z: 2 }]), { bucati: 2, piese: [{ prinsa: [], intra: [1], pluteste: false }, { prinsa: [], intra: [0], pluteste: true }] });
  // la o jumătate de știft într-o parte, deasupra: știfturile cărămizii dau în pereții plăcii
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: PLACA, x: 1, z: 3, cu: [4, 0, 0] }]).piese.map((p) => p.intra), [[1], [0]]);
});

test('verificarea: pe masă, una lângă alta, piesele nu plutesc și nu se ciocnesc; în același loc, se ciocnesc', () => {
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: CARAMIDA, x: 4 }, { d: PLACA, y: 2 }]), { bucati: 3, piese: [BINE, BINE, BINE] });
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: CARAMIDA }]).piese, [{ prinsa: [], intra: [1], pluteste: false }, { prinsa: [], intra: [0], pluteste: false }]);
  // „Dublează” pune copia cu un știft mai la dreapta: intră în original
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: CARAMIDA, x: 1 }]).piese.map((p) => p.intra), [[1], [0]]);
  // un model gol și unul cu o singură piesă
  assert.deepEqual(verifica([]), { bucati: 0, piese: [] });
  assert.deepEqual(verifica([{ d: CARAMIDA }]), { bucati: 1, piese: [BINE] });
});

test('verificarea: plutește tot grupul care nu ajunge la masă; fără nimic pe masă, piesele de jos țin loc de masă', () => {
  // o cărămidă pe masă; departe de ea, la 6 plăci în sus, o cărămidă cu o placă pe ea: prinse una de alta, dar în aer amândouă
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: CARAMIDA, x: 6, z: 6 }, { d: PLACA, x: 7, z: 9 }]),
    { bucati: 2, piese: [BINE, { prinsa: [2], intra: [], pluteste: true }, { prinsa: [1], intra: [], pluteste: true }] });
  // aceleași două, singure: nimic nu e mai jos, deci cărămida ține loc de masă
  assert.deepEqual(verifica([{ d: CARAMIDA, x: 6, z: 6 }, { d: PLACA, x: 7, z: 9 }]),
    { bucati: 1, piese: [{ prinsa: [1], intra: [], pluteste: false }, { prinsa: [0], intra: [], pluteste: false }] });
  // un turn de trei: cea de sus ajunge la masă prin celelalte două
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: CARAMIDA, z: 3 }, { d: PLACA, x: 1, z: 6 }]).piese,
    [{ prinsa: [1], intra: [], pluteste: false }, { prinsa: [0, 2], intra: [], pluteste: false }, { prinsa: [1], intra: [], pluteste: false }]);
  // la o jumătate de placă (1,6 mm) deasupra mesei, o cărămidă plutește; la 0,03 mm (jocul socotelii), stă
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: CARAMIDA, x: 6, cu: [0, 0, 1.6] }]).piese, [BINE, { prinsa: [], intra: [], pluteste: true }]);
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: CARAMIDA, x: 6, cu: [0, 0, 0.03] }]).piese, [BINE, BINE]);
  // o cărămidă cu două plăci pe ea: amândouă ajung la masă prin ea (un singur grup, oricare ar fi ordinea perechilor)
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: PLACA, z: 3 }, { d: PLACA, x: 2, z: 3 }]),
    { bucati: 1, piese: [{ prinsa: [1, 2], intra: [], pluteste: false }, { prinsa: [0], intra: [], pluteste: false }, { prinsa: [0], intra: [], pluteste: false }] });
  assert.deepEqual(verifica([{ d: PLACA, z: 3 }, { d: PLACA, x: 2, z: 3 }, { d: CARAMIDA }]).piese.map((p) => p.pluteste), [false, false, false]);
  // scos mijlocul: placa de sus rămâne în aer
  assert.deepEqual(verifica([{ d: CARAMIDA }, { d: PLACA, x: 1, z: 6 }]).piese, [BINE, { prinsa: [], intra: [], pluteste: true }]);
});

test('verificarea, pe o tijă: axul în grindă și rotița pe ax sunt prinse; rotița împinsă în grindă se ciocnește cu ea', () => {
  // axul, glisat cu 8 mm: rădăcina la z 15,8, vârful la −8 (sub masă); rotița la rădăcină ține z 12 … 15,8, deasupra grinzii (7,8)
  const prinse = [{ prinsa: [1], intra: [], pluteste: false }, { prinsa: [0, 2], intra: [], pluteste: false }, { prinsa: [1], intra: [], pluteste: false }];
  assert.deepEqual(verifica(montat(8, 0)), { bucati: 1, piese: prinse });
  // glisată cu 6 mm pe ax, rotița ține z 6 … 9,8: intră în grindă cu 1,8 mm
  assert.deepEqual(verifica(montat(8, 6)).piese, [{ prinsa: [1], intra: [2], pluteste: false }, prinse[1], { prinsa: [1], intra: [0], pluteste: false }]);
  // glisată cu 16,2, e sub grindă (z −4,2 … −0,4), la 0,4 mm de ea
  assert.deepEqual(verifica(montat(8, 16.2)).piese, prinse);
  // întoarsă cu 45° pe ax, crucea nu mai intră în gaura ei: nu e prinsă și intră în ax
  assert.deepEqual(verifica(montat(8, 0, 45)).piese, [{ prinsa: [1], intra: [], pluteste: false }, { prinsa: [0], intra: [2], pluteste: false }, { prinsa: [], intra: [1], pluteste: true }]);
  // axul scos aproape de tot (1 mm în gaură): legat în model, dar neținut; plutește, cu rotița de pe el
  assert.deepEqual(verifica(montat(22.8, 0)), { bucati: 2, piese: [BINE, { prinsa: [2], intra: [], pluteste: true }, { prinsa: [1], intra: [], pluteste: true }] });
  // o piesă sub masă nu plutește: axul neglisat atârnă cu 16 mm sub grindă, iar o cărămidă de alături stă pe masă
  assert.deepEqual(verifica([...montat(0), { d: CARAMIDA, y: 3 }]), { bucati: 2, piese: [{ prinsa: [1], intra: [], pluteste: false }, { prinsa: [0], intra: [], pluteste: false }, BINE] });
});

test('verificarea nu ține de locul modelului: mutat și rotit cu totul în jurul verticalei, spune la fel', () => {
  const c = Math.cos(0.65), s = Math.sin(0.65), peste: Transf = { m: [c, -s, 0, s, c, 0, 0, 0, 1], t: [37.3, -12.9, 0] };
  for (const piese of [montat(8, 6), montat(8, 16.2), [{ d: CARAMIDA }, { d: PLACA, x: 1, z: 3 }, { d: PLACA, x: 1, z: 2 }, { d: CARAMIDA, x: 6, z: 6 }]] as Pusa[][]) {
    assert.deepEqual(verifica(piese, peste), verifica(piese));
  }
});

test('verificarea ține minte perechile judecate: a doua oară nu mai socotește ciocnirile, iar o piesă mutată schimbă doar perechile ei', () => {
  const memo = new Map<string, boolean>(), piese = model(montat(8, 6));
  const v1 = Lm.verificaModel(piese, memo), cate = memo.size;
  // trei piese, cu cutiile suprapuse două câte două: grinda cu axul, axul cu rotița, grinda cu rotița
  assert.equal(cate, 3);
  assert.deepEqual([...memo.values()].filter(Boolean).length, 1, 'o singură pereche se ciocnește');
  // a doua oară, din ținere de minte: o ținere de minte cu răspunsurile întoarse întoarce și verificarea
  const v2 = Lm.verificaModel(piese, memo);
  assert.deepEqual(v2, v1);
  assert.equal(memo.size, cate);
  for (const k of [...memo.keys()]) memo.set(k, !memo.get(k));
  assert.deepEqual(Lm.verificaModel(piese, memo).piese.map((p) => [...p.intra]), [[1], [0, 2], [1]]);
  // rotița mutată cu 1 mm pe ax: o pereche nouă cu grinda și una cu axul; grinda cu axul rămâne
  const memo2 = new Map<string, boolean>();
  Lm.verificaModel(piese, memo2);
  Lm.verificaModel(model(montat(8, 7)), memo2);
  assert.equal(memo2.size, 5);
  // dusă sub grindă (cutiile lor nu se mai ating), perechea cu grinda nici nu mai e judecată
  Lm.verificaModel(model(montat(8, 16.2)), memo2);
  assert.equal(memo2.size, 6);
  // cheia ține amândouă piesele: în golul cărămizii (între tuburile ei, la 11,9, 7,9), un cub mic nu atinge nimic; o tijă
  // înaltă, pusă în același loc, iese prin tavanul ei (8,6 … 9,6). Aceeași așezare, altă piesă: alt răspuns
  const memo4 = new Map<string, boolean>(), caramida = { T: PE_LOC, tri: fa(CARAMIDA).tri, prinderi: [], cheie: 'cărămida' }, loc = mutare(11.65, 7.65, 3);
  const cuPiesa = (tri: Tri[], cheie: string) => [...Lm.verificaModel([caramida, { T: loc, tri, prinderi: [], cheie }], memo4).piese[0]!.intra];
  assert.deepEqual(cuPiesa(cutie([0, 0, 0], [0.5, 0.5, 9]), 'tija'), [1]);
  assert.deepEqual(cuPiesa(cutie([0, 0, 0], [0.5, 0.5, 0.5]), 'cubul'), []);
  assert.deepEqual(cuPiesa(cutie([0, 0, 0], [0.5, 0.5, 9]), 'tija'), [1]);
  assert.equal(memo4.size, 2);
  // și prima piesă: același cub, la fel așezat, în plin (o cutie plină în locul cărămizii)
  assert.deepEqual([...Lm.verificaModel([{ T: PE_LOC, tri: cutie([0, 0, 0], [31.8, 15.8, 11.5]), prinderi: [], cheie: 'plina' }, { T: loc, tri: cutie([0, 0, 0], [0.5, 0.5, 0.5]), prinderi: [], cheie: 'cubul' }], memo4).piese[0]!.intra], [1]);
  assert.equal(memo4.size, 3);
  // fără cheia piesei, nu se ține minte nimic
  const memo3 = new Map<string, boolean>();
  Lm.verificaModel(piese.map(({ cheie: _c, ...p }) => p), memo3);
  assert.equal(memo3.size, 0);
});

test('verificarea nu se împiedică de un model stricat: o piesă fără plasă sau cu o așezare stricată nu e judecată', () => {
  const [a, b] = model([{ d: CARAMIDA }, { d: PLACA, x: 1, z: 3 }]);
  const stricata = { T: { m: [1, 0, 0], t: [0, 0, Number.NaN] }, tri: b!.tri, prinderi: b!.prinderi };
  // nici funcțiile ei: o așezare stricată nu prinde nimic și nu se ciocnește cu nimic (și nu aruncă)
  for (const T of [stricata.T, { m: [...UNITATE], t: [0, 0, Number.NaN] }, { m: [...UNITATE].map(() => Number.NaN), t: [0, 0, 0] }]) {
    assert.equal(Lm.prinseInLume(a!.prinderi, a!.T, b!.prinderi, T).length, 0);
    assert.equal(Lm.prinseInLume(b!.prinderi, T, a!.prinderi, a!.T).length, 0);
    assert.equal(Lm.seCiocnesc(ZECE, ZECE, T), false);
  }
  assert.equal(Lm.seCiocnesc(ZECE, [], PE_LOC), false);
  assert.equal(Lm.seCiocnesc([], ZECE, PE_LOC), false);
  const v = Lm.verificaModel([a!, stricata]);
  assert.deepEqual(v.piese.map((p) => ({ prinsa: [...p.prinsa], intra: [...p.intra], pluteste: p.pluteste })), [BINE, BINE]);
  // piesa stricată nu e nici măcar o bucată a modelului
  assert.equal(v.bucati, 1);
  assert.equal(Lm.verificaModel([a!, { T: b!.T, tri: [], prinderi: [] }]).bucati, 1);
  assert.deepEqual(Lm.verificaModel([a!, { T: b!.T, tri: [], prinderi: [] }]).piese.map((p) => p.pluteste), [false, false]);
});
