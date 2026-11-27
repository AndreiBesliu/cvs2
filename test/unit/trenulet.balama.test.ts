/**
 * Balamaua din atelierul Easy 3Draw (ADR 0284, felia 3.Ck-2), pe plasele reale ale motorului:
 * - două plăci de câte o placă, de 1 sau 2 știfturi lățime și 1–4 lungime, legate la capăt de o balama cu axa pe lățime;
 * - **cu bolțul**: la capătul plăcii, obrajii (pe margini și, la lățimea 2, la mijloc), iar între ei bolțul, o bară de
 *   Ø3,2 culcată, cu axa la înălțimea clemei; sub bolț, gol (acolo trece inelul clemei);
 * - **cu clema**: la capătul plăcii, câte o clemă pe fiecare știft al lățimii (inelul clemei din calibrare, cu gura în
 *   sus), legată de placă printr-un gât; inelul atinge masa, deci se tipărește culcat, fără suport;
 * - puse cap la cap, axa balamalei cade la 4 mm de capătul fiecărei plăci: știfturile celor două plăci rămân pe grila de
 *   8 mm, cu un pas liber între ele. Clema se prinde pe bolț de sus și se rotește în jurul lui;
 * - jocul clemei (−0,1 … 0,2 mm, din 0,05 în 0,05) mărește inelul pe dinăuntru; cel de afară rămâne, deci axa rămâne la
 *   aceeași înălțime pentru orice joc;
 * - un punct e judecat „în lemn” sau „în gol” după numărul de înfășurare al plasei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, type P3, type Tri, type Piesa } from './ajutor-plasa-lego.ts';

type Prindere = { fel: string; p: P3; d: P3; lung: number; orb?: boolean; r?: P3 };
type Corp = Piesa & { prinderi: Prindere[] };
type Montaj = { m: number[]; t: P3 };
type Cote = { piesa: string; latime: number; lungime: number; joc: number; boltD: number; clemaD: number; jocRadial: number; axa: number[]; falci: number[][] };
type Def = Record<string, unknown>;
const Lt = L as typeof L & {
  balamaCote(d: Def): Cote;
  balamaMontaj(d: Def, pliere: number): Montaj;
  montaj(a: Prindere, b: Prindere, unghi?: number): Montaj;
  seteaza(s?: Record<string, unknown> | null): void;
  efective(): Record<string, number>;
  verificaModel(piese: readonly { T: { m: number[]; t: number[] }; tri: readonly Tri[]; prinderi: readonly Prindere[] }[]): { piese: { prinsa: number[]; intra: number[]; pluteste: boolean }[] };
};
/** Piesa motorului, cu prinderile copiate în tărâmul probei (tablourile motorului vin din alt tărâm). */
const fa = (d: Def): Corp => {
  const p = L.construieste(d) as Corp;
  return { ...p, prinderi: Array.from(p.prinderi, (c): Prindere => ({ ...c, p: [...c.p] as P3, d: [...c.d] as P3, ...(c.r ? { r: [...c.r] as P3 } : {}) })) };
};
const balama = (d: Def = {}) => fa({ tip: 'balama', ...d });
const P = L.parametri();
const S = P.pas!, PLACA = P.placa!, STIFT = P.stift_h!, J0 = P.joc_lateral!, RB = P.bara_d! / 2;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const inchisa = (p: Piesa, ce: string) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};
const la = (p: Piesa, x: number, y: number, z: number) => plin(p, [x, y, z] as P3);
/**
 * Pe hârtie, în piesa mutată în origine (colțul plăcii, la jocul lateral, ajunge în 0): axa balamalei (x, z), mijloacele
 * clemelor pe lățime, raza dinăuntru și cea de afară a inelului, capătul plăcii.
 */
function hartie(lungime: number, latime: number, joc = 0) {
  const e = Lt.efective(), ro = e.clemaD! / 2 + P.clema_perete!;
  return {
    xa: S * lungime + S / 2 - J0, zb: ro, ro, ri: e.clemaD! / 2 + joc, capat: S * lungime - 2 * J0, lat: S * latime - 2 * J0,
    falci: Array.from({ length: latime }, (_, k) => S * k + S / 2 - J0),
  };
}
const forma = (tri: readonly Tri[]): string[] => tri.map((t) => JSON.stringify(t)).sort();
const numara = (l: readonly Prindere[]) => l.reduce<Record<string, number>>((t, c) => ({ ...t, [c.fel]: (t[c.fel] ?? 0) + 1 }), {});

// ---------------------------------------------------------------------------------------------------- montajul, pe plase
const aplica = (M: Montaj, q: P3): P3 => [
  M.m[0]! * q[0] + M.m[1]! * q[1] + M.m[2]! * q[2] + M.t[0], M.m[3]! * q[0] + M.m[4]! * q[1] + M.m[5]! * q[2] + M.t[1], M.m[6]! * q[0] + M.m[7]! * q[1] + M.m[8]! * q[2] + M.t[2]];
const mutata = (M: Montaj, tri: readonly Tri[]): Tri[] => tri.map((t) => t.map((q) => aplica(M, q)) as Tri);
const cu = (M: Montaj, d: P3): Montaj => ({ m: M.m, t: [M.t[0] + d[0], M.t[1] + d[1], M.t[2] + d[2]] });
function cutie(tri: readonly Tri[]): [P3, P3] {
  const a: P3 = [Infinity, Infinity, Infinity], b: P3 = [-Infinity, -Infinity, -Infinity];
  for (const t of tri) for (const q of t) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k]!, q[k]!); b[k] = Math.max(b[k]!, q[k]!); }
  return [a, b];
}
/** Punctele din lemnul unei plase, la 0,05 mm sub fiecare față (mijlocul triunghiului, tras înăuntru), din cutia dată. */
function subFete(tri: readonly Tri[], [a, b]: [P3, P3]): P3[] {
  const out: P3[] = [];
  for (const [p, q, r] of tri) {
    const u: P3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v: P3 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const n: P3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n);
    if (l < 1e-9) continue;
    const c: P3 = [(p[0] + q[0] + r[0]) / 3 - (n[0] * 0.05) / l, (p[1] + q[1] + r[1]) / 3 - (n[1] * 0.05) / l, (p[2] + q[2] + r[2]) / 3 - (n[2] * 0.05) / l];
    if (c.every((x, k) => x >= a[k]! && x <= b[k]!)) out.push(c);
  }
  return out;
}
/** Câte puncte din lemnul unei piese cad în lemnul celeilalte (în amândouă sensurile). */
function patrund(a: readonly Tri[], b: readonly Tri[]): number {
  const pa = { tri: a as Tri[] } as Piesa, pb = { tri: b as Tri[] } as Piesa;
  return subFete(b, cutie(a)).filter((q) => plin(pa, q)).length + subFete(a, cutie(b)).filter((q) => plin(pb, q)).length;
}
/**
 * Pe hârtie: jumătatea cu clema, pusă pe bolț. Întâi cap la cap, întoarsă pe loc (o jumătate de tură în jurul verticalei,
 * în jurul axei balamalei și al mijlocului lățimii), apoi pliată cu `pliere` grade în jurul axei: capătul ei depărtat urcă.
 */
function peHartie(h: ReturnType<typeof hartie>, pliere: number, q: P3): P3 {
  const x = 2 * h.xa - q[0], y = h.lat - q[1], dx = x - h.xa, dz = q[2] - h.zb, u = (pliere * Math.PI) / 180;
  return [h.xa + dx * Math.cos(u) - dz * Math.sin(u), y, h.zb + dx * Math.sin(u) + dz * Math.cos(u)];
}

test('motorul știe piesa, iar cea implicită e jumătatea cu bolțul, de 1 × 2: placa, apoi la capăt bolțul de Ø3,2 între obraji', () => {
  assert.ok(L.tipuri.includes('balama'));
  const p = balama(), h = hartie(2, 1);
  inchisa(p, 'implicit');
  assert.equal(p.avert.length, 0);
  // de la colțul plăcii până la fața obrajilor de după axă (axa + raza bolțului + 1); înaltă cât placa cu știfturile
  assert.deepEqual(cote(p), [r3(h.xa + RB + 1), r3(h.lat), r3(PLACA + STIFT)]);
  assert.equal(amprentaPlasei(balama({ piesa: 'bolt', latime: 1, lungime: 2, joc: 0 })), amprentaPlasei(p));
  const q = Lt.balamaCote({}), e = Lt.efective();
  assert.deepEqual([q.piesa, q.latime, q.lungime, q.joc, r3(q.boltD), r3(q.clemaD), r3(q.jocRadial)],
    ['bolt', 1, 2, 0, 3.2, r3(e.clemaD!), r3((e.clemaD! - 3.2) / 2)]);
  // pe hârtie, la calibrarea de pornire: clema de 3,3, deci 0,05 mm de jur împrejurul bolțului; axa la 20 de la colțul
  // plăcii (în motor), adică la 4 de capătul ei, și la 2,75 deasupra mesei (raza de afară a inelului)
  assert.equal(r3(q.jocRadial), 0.05);
  assert.deepEqual(Array.from(q.axa, r3), [20, 2.75]);
  assert.deepEqual(Array.from(q.falci, (f) => Array.from(f, r3)), [[2.1, 5.9]]);
});

test('jumătatea cu bolțul, pe plasă: placa întreagă, obrajii, bolțul în dreptul fiecărui știft, gol sub el și lângă placă', () => {
  for (const [lungime, latime] of [[2, 1], [1, 1], [3, 2], [4, 2]] as const) {
    const p = balama({ lungime, latime }), h = hartie(lungime, latime), ce = `bolțul ${latime} × ${lungime}`;
    inchisa(p, ce);
    assert.deepEqual(cote(p), [r3(h.xa + RB + 1), r3(h.lat), r3(PLACA + STIFT)], ce);
    // placa e chiar placa motorului: toate triunghiurile ei sunt în piesă
    const placa = fa({ tip: 'caramida', celule: Array.from({ length: lungime * latime }, (_, k) => [Math.floor(k / latime), k % latime]), placi: 1 });
    const toate = new Set(forma(p.tri));
    assert.ok(forma(placa.tri).every((t) => toate.has(t)), `${ce}: placa e întreagă`);
    for (const y of h.falci) {
      // bolțul: lemn până la rază, gol după ea, de jur împrejur
      for (let g = 0; g < 360; g += 15) {
        const u = (g * Math.PI) / 180;
        assert.equal(la(p, h.xa + (RB - 0.05) * Math.cos(u), y, h.zb + (RB - 0.05) * Math.sin(u)), true, `${ce}: bolțul, la ${g}°`);
        assert.equal(la(p, h.xa + (RB + 0.1) * Math.cos(u), y, h.zb + (RB + 0.1) * Math.sin(u)), false, `${ce}: după bolț, gol, la ${g}°`);
      }
      // dedesubt și între capătul plăcii și bolț: gol (acolo intră inelul clemei); bolțul e același pe toată lățimea clemei
      assert.equal(la(p, h.xa, y, 0.3), false, `${ce}: sub bolț, gol`);
      assert.equal(la(p, h.capat + 0.6, y, 1.5), false, `${ce}: între placă și bolț, gol`);
      for (const dy of [-2.2, 2.2]) assert.equal(la(p, h.xa, y + dy, h.zb), true, `${ce}: bolțul trece și la ${dy} de mijloc`);
      assert.equal(la(p, h.xa, y - 2.2, 0.3), false, `${ce}: la marginea clemei, tot gol sub bolț`);
    }
    // obrajii: pe margini și între clemele vecine, de la placă până la 1 mm după bolț, înalți până la bolț + 0,6
    const obraji = [0.8, h.lat - 0.8, ...h.falci.slice(1).map((y) => y - S / 2)];
    for (const y of obraji) {
      for (const x of [h.capat + 0.3, h.xa, h.xa + RB + 0.9]) assert.equal(la(p, x, y, 0.3), true, `${ce}: obrazul, la x ${r3(x)}, y ${r3(y)}`);
      assert.equal(la(p, h.xa + RB + 1.1, y, 0.3), false, `${ce}: după obraz, gol, la y ${r3(y)}`);
      assert.equal(la(p, h.xa, y, h.zb + RB + 0.55), true, `${ce}: obrazul urcă peste bolț, la y ${r3(y)}`);
      assert.equal(la(p, h.xa, y, h.zb + RB + 0.65), false, `${ce}: deasupra obrazului, gol, la y ${r3(y)}`);
    }
  }
});

test('jumătatea cu clema, pe plasă: placa întreagă și, la capăt, inelul din calibrare cu gura în sus, legat printr-un gât', () => {
  for (const [lungime, latime, joc] of [[2, 1, 0], [1, 1, 0.1], [3, 2, 0], [2, 2, -0.1], [4, 1, 0.2]] as const) {
    const p = balama({ piesa: 'clema', lungime, latime, joc }), h = hartie(lungime, latime, joc), ce = `clema ${latime} × ${lungime}, jocul ${joc}`;
    inchisa(p, ce);
    const [a, b] = cutie(p.tri);
    // inelul atinge masa (axa la raza de afară, oricare ar fi jocul) și trece de axă cât raza de afară, pe partea dinspre bolț
    assert.equal(r3(a[2]), 0, ce);
    assert.ok(Math.abs(b[0] - (h.xa + h.ro)) < 0.02, `${ce}: până la axă + raza de afară (${r3(b[0])})`);
    // sus, gura de 2,5: inelul se oprește la √(ro² − 1,25²) deasupra axei
    assert.equal(r3(b[2]), r3(h.zb + Math.sqrt(h.ro ** 2 - 1.25 ** 2)), ce);
    const placa = fa({ tip: 'caramida', celule: Array.from({ length: lungime * latime }, (_, k) => [Math.floor(k / latime), k % latime]), placi: 1 });
    const toate = new Set(forma(p.tri));
    assert.ok(forma(placa.tri).every((t) => toate.has(t)), `${ce}: placa e întreagă`);
    for (const y of h.falci) {
      for (let g = 0; g < 360; g += 10) {
        // gura: un șanț de 2,5 mm, cu pereții drepți, în sus
        const u = (g * Math.PI) / 180, mij = (h.ri + h.ro) / 2, gura = Math.sin(u) > 0 && Math.abs(mij * Math.cos(u)) < 1.25;
        assert.equal(la(p, h.xa + mij * Math.cos(u), y, h.zb + mij * Math.sin(u)), !gura, `${ce}: inelul ${gura ? 'are gura' : 'e plin'} la ${g}°`);
        assert.equal(la(p, h.xa + (h.ri - 0.05) * Math.cos(u), y, h.zb + (h.ri - 0.05) * Math.sin(u)), false, `${ce}: în inel, gol, la ${g}°`);
      }
      // gâtul: lemn între placă și inel, pe lățimea clemei (3,8); alături de clemă, gol
      for (const x of [h.capat + 0.3, h.xa - h.ri - 0.5]) assert.equal(la(p, x, y, 1.5), true, `${ce}: gâtul, la x ${r3(x)}`);
      const mij = (h.ri + h.ro) / 2;
      for (const dy of [-1.85, 1.85]) assert.equal(la(p, h.xa - mij, y + dy, h.zb), true, `${ce}: clema, la ${dy} de mijloc`);
      for (const dy of [-2.0, 2.0]) assert.equal(la(p, h.xa - mij, y + dy, h.zb), false, `${ce}: alături de clemă, gol, la ${dy}`);
    }
    // jocul mărește inelul doar pe dinăuntru: aceeași cutie pentru orice joc
    assert.deepEqual(cote(p), cote(balama({ piesa: 'clema', lungime, latime })), `${ce}: aceleași cote ca la jocul 0`);
  }
});

test('prinderile: bolțul, câte o bară pe fiecare loc de clemă (în ambele sensuri); clema, câte o clemă cu două guri', () => {
  for (const [lungime, latime] of [[2, 1], [3, 2]] as const) {
    const bolt = balama({ lungime, latime }), clema = balama({ piesa: 'clema', lungime, latime }), h = hartie(lungime, latime), n = lungime * latime;
    assert.deepEqual(numara(bolt.prinderi), { stift: n, locas: n, bara: 2 * latime });
    assert.deepEqual(numara(clema.prinderi), { stift: n, locas: n, clema: 2 * latime });
    const bare = bolt.prinderi.filter((c) => c.fel === 'bara'), cleme = clema.prinderi.filter((c) => c.fel === 'clema');
    h.falci.forEach((y, k) => {
      assert.deepEqual([bare[2 * k]!.p.map(r3), bare[2 * k]!.d, r3(bare[2 * k]!.lung)], [[r3(h.xa), r3(y - 2.3), r3(h.zb)], [0, 1, 0], 4.6]);
      assert.deepEqual([bare[2 * k + 1]!.p.map(r3), bare[2 * k + 1]!.d.map((v) => v + 0), r3(bare[2 * k + 1]!.lung)], [[r3(h.xa), r3(y + 2.3), r3(h.zb)], [0, -1, 0], 4.6]);
      assert.deepEqual([cleme[2 * k]!.p.map(r3), cleme[2 * k]!.d.map((v) => v + 0), r3(cleme[2 * k]!.lung)], [[r3(h.xa), r3(y - 1.9), r3(h.zb)], [0, -1, 0], 3.8]);
      assert.deepEqual([cleme[2 * k + 1]!.p.map(r3), cleme[2 * k + 1]!.d.map((v) => v + 0), r3(cleme[2 * k + 1]!.lung)], [[r3(h.xa), r3(y + 1.9), r3(h.zb)], [0, 1, 0], 3.8]);
    });
  }
});

test('puse cap la cap, clema pe bolț: montajul e cel de pe hârtie, iar plăcile rămân pe grila de 8 mm, cu un pas liber între ele', () => {
  for (const [lungime, latime] of [[2, 1], [1, 2], [3, 2]] as const) {
    const h = hartie(lungime, latime), clema = balama({ piesa: 'clema', lungime, latime }), ce = `${latime} × ${lungime}`;
    for (const pliere of [0, 30, 90, 135]) {
      const M = Lt.balamaMontaj({ lungime, latime }, pliere);
      const probe: P3[] = [...clema.prinderi.map((c) => c.p), [0, 0, 0], [h.capat, h.lat, PLACA]];
      for (const q of probe) {
        const a = aplica(M, q), b = peHartie(h, pliere, q);
        assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-9, `${ce}, pliată ${pliere}°: punctul (${q.map(r3)})`);
      }
    }
    // cap la cap: cele mai apropiate știfturi ale celor două plăci (ultimul fiecăreia) la doi pași (un pas liber, cât
    // balamaua), iar celelalte pe aceeași grilă
    const M = Lt.balamaMontaj({ lungime, latime }, 0), ultim = S * lungime - S / 2 - J0;
    for (let i = 0; i < lungime; i++) assert.equal(r3(aplica(M, [S * i + S / 2 - J0, S / 2 - J0, PLACA])[0] - ultim), S * (lungime - i + 1), `${ce}: știftul ${i}`);
  }
});

test('clema se rotește pe bolț fără să atingă nimic, de la 110° în jos până la 130° în sus; mai departe, plăcile se ating', () => {
  // (cu jocul negativ, clema strânge bolțul: e mai mică decât el, deci se ating anume)
  for (const [lungime, latime, joc] of [[2, 1, 0], [1, 1, 0], [3, 2, 0], [2, 1, 0.1]] as const) {
    const bolt = balama({ lungime, latime }), clema = balama({ piesa: 'clema', lungime, latime, joc }), ce = `${latime} × ${lungime}, jocul ${joc}`;
    for (const pliere of [-110, -90, -60, -30, 0, 15, 30, 45, 60, 75, 90, 110, 130]) assert.equal(patrund(bolt.tri, mutata(Lt.balamaMontaj({ lungime, latime, joc }, pliere), clema.tri)), 0, `${ce}: pliată ${pliere}°, nu atinge`);
    // martorii: pliată 140° în sus, 120° în jos sau pe jumătate de tură, plăcile se ating; mutată 0,5 mm pe lățime, clema dă
    // de obraz; lăsată 0,5 mm mai jos, inelul dă de bolț
    for (const pliere of [140, -120, 180]) assert.ok(patrund(bolt.tri, mutata(Lt.balamaMontaj({ lungime, latime, joc }, pliere), clema.tri)) > 0, `${ce}: pliată ${pliere}°, se pătrund`);
    const M = Lt.balamaMontaj({ lungime, latime, joc }, 0);
    for (const d of [[0, 0.5, 0], [0, -0.5, 0], [0, 0, -0.5]] as P3[]) assert.ok(patrund(bolt.tri, mutata(cu(M, d), clema.tri)) > 0, `${ce}: mutată cu (${d}), se pătrund`);
  }
});

test('jocul clemei: cu 0,2 încape și mutată cu 0,2 pe orice parte; cu 0 nu; inelul urmează calibrarea barei', () => {
  const bolt = balama(), larg = balama({ piesa: 'clema', joc: 0.2 }), strans = balama({ piesa: 'clema' });
  const ML = Lt.balamaMontaj({ joc: 0.2 }, 0), MS = Lt.balamaMontaj({}, 0);
  for (const d of [[0.2, 0, 0], [-0.2, 0, 0], [0, 0, 0.2]] as P3[]) {
    assert.equal(patrund(bolt.tri, mutata(cu(ML, d), larg.tri)), 0, `cu jocul 0,2, încape și mutată cu (${d})`);
    assert.ok(patrund(bolt.tri, mutata(cu(MS, d), strans.tri)) > 0, `cu jocul 0, mutată cu (${d}) dă de bolț`);
  }
  try {
    Lt.seteaza({ varianta_bara: 5 });
    const q = Lt.balamaCote({});
    assert.deepEqual([r3(q.boltD), r3(q.clemaD), r3(q.jocRadial), r3(q.axa[1]!)], [3.2, 3.5, 0.15, 2.85]);
  } finally { Lt.seteaza(null); }
});

test('modelul o vede prinsă: clema e prinsă de bolț, nu intră în el și nu plutește, oricât ar fi pliată', () => {
  for (const pliere of [0, 60]) {
    const bolt = balama(), clema = balama({ piesa: 'clema' }), M = Lt.balamaMontaj({}, pliere);
    const v = Lt.verificaModel([
      { T: { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }, tri: bolt.tri, prinderi: bolt.prinderi },
      { T: { m: M.m, t: M.t }, tri: clema.tri, prinderi: clema.prinderi },
    ]);
    assert.deepEqual(v.piese.map((p) => ({ prinsa: [...p.prinsa], intra: [...p.intra], pluteste: p.pluteste })),
      [{ prinsa: [1], intra: [], pluteste: false }, { prinsa: [0], intra: [], pluteste: false }], `pliată ${pliere}°`);
  }
});

test('valorile din afara marginilor: lățimea 1 sau 2, lungimea 1–4, jocul între −0,1 și 0,2 (din 0,05 în 0,05), cu mesajul lor', () => {
  const q = (d: Def) => Lt.balamaCote(d);
  assert.equal(q({ latime: 3 }).latime, 2);
  assert.equal(q({ latime: 0 }).latime, 1);
  assert.equal(q({ latime: '2' }).latime, 2);
  // o lățime între cele două se rotunjește la cea mai apropiată, cu mesaj: 1,5 e deja de 2, 1,4 încă de 1
  assert.equal(q({ latime: 1.5 }).latime, 2);
  assert.equal(q({ latime: 1.4 }).latime, 1);
  assert.match(balama({ latime: 1.5 }).avert.join(' '), /am făcut-o de 2/);
  assert.equal(q({ lungime: 7 }).lungime, 4);
  assert.equal(q({ lungime: 0 }).lungime, 1);
  assert.equal(q({ lungime: 2.6 }).lungime, 3);
  assert.equal(q({ lungime: 'x' }).lungime, 2);
  assert.match(balama({ latime: 3 }).avert.join(' '), /1 sau 2 știfturi/);
  assert.match(balama({ lungime: 7 }).avert.join(' '), /1 și 4 știfturi/);
  // o lungime rotunjită își spune rotunjirea, ca una din afara marginilor
  assert.match(balama({ lungime: 2.4 }).avert.join(' '), /am făcut-o de 2/);
  assert.match(balama({ piesa: 'clema', latime: 3 }).avert.join(' '), /1 sau 2 știfturi/);
  assert.equal(balama({ latime: 2, lungime: 4 }).avert.length, 0);
  assert.equal(q({ joc: 0.5 }).joc, 0.2);
  assert.equal(q({ joc: -1 }).joc, -0.1);
  assert.equal(q({ joc: 0.07 }).joc, 0.05);
  assert.equal(q({ joc: '0,15' }).joc, 0.15);
  assert.equal(q({ joc: 'x' }).joc, 0);
  assert.match(balama({ piesa: 'clema', joc: 0.5 }).avert.join(' '), /jocul clemei/i);
  assert.equal(balama({ piesa: 'clema', joc: 0.15 }).avert.length, 0);
  // jumătatea cu bolțul n-are clemă: jocul greșit nu-i dă mesaj și n-o schimbă
  assert.equal(balama({ joc: 0.5 }).avert.length, 0);
  assert.equal(amprentaPlasei(balama({ joc: 0.2 })), amprentaPlasei(balama()));
  assert.equal(q({ piesa: 'altceva' }).piesa, 'bolt');
  assert.equal(q({ piesa: 'clema' }).piesa, 'clema');
});
