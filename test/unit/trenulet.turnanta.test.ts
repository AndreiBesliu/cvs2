/**
 * Placa turnantă din atelierul Easy 3Draw (ADR 0284, felia 3.Ck-1), pe plasele reale ale motorului:
 * - două piese de câte o placă, puse una peste alta (6,4 mm împreună, ca placa turnantă LEGO), de 2 × 2 sau de 4 × 4;
 * - **baza**: o placă plină, cu locașurile ei dedesubt (stă pe știfturi), cu fața de sus netedă și, în mijloc, pivotul:
 *   un capăt de știft Technic în picioare (Ø4,75, cu fanta de 0,8 mm), înalt cât o placă fără 0,1 mm;
 * - **partea de sus**: placa cu știfturi și cu gaura de știft din mijloc, aceeași cu placa cu gaură a cărămizii;
 * - partea de sus se pune pe pivot: pivotul intră în gaura din calibrare ca un știft Technic într-o placă cu găuri, deci
 *   se rotește și ține ca el. Jocul pivotului (câți milimetri se scot din rază) se poate schimba, de la −0,1 la 0,2;
 * - un punct e judecat „în lemn” sau „în gol” după numărul de înfășurare al plasei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, type P3, type Tri, type Piesa } from './ajutor-plasa-lego.ts';

type Prindere = { fel: string; p: P3; d: P3; lung: number; orb?: boolean; r?: P3 };
type Corp = Piesa & { prinderi: Prindere[] };
type Montaj = { m: number[]; t: P3 };
type Cote = { marime: number; piesa: string; joc: number; pivotD: number; pivotH: number; gauraD: number; jocRadial: number; inaltime: number };
type Def = Record<string, unknown>;
const Lt = L as typeof L & {
  turnantaCote(d: Def): Cote;
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
const turnanta = (d: Def = {}) => fa({ tip: 'turnanta', ...d });
const P = L.parametri();
const S = P.pas!, PLACA = P.placa!, STIFT = P.stift_h!, J0 = P.joc_lateral!;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const inchisa = (p: Piesa, ce: string) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};
const la = (p: Piesa, x: number, y: number, z: number) => plin(p, [x, y, z] as P3);
/** Pe hârtie: mijlocul plăcii (în piesa mutată în origine, colțul ei e la jocul lateral), raza pivotului, înălțimea lui. */
const hartie = (marime: number, joc = 0) => ({ c: (S * marime) / 2 - J0, r: P.stift_technic_d! / 2 - joc, hp: PLACA - 0.1, latura: S * marime - 2 * J0 });
/** Forma plasei, fără ordinea triunghiurilor (aceeași placă, cu celulele înșirate altfel, are aceleași triunghiuri). */
const forma = (p: Piesa): string => JSON.stringify(p.tri.map((t) => JSON.stringify(t)).sort());
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
/** Partea de sus pusă pe pivotul bazei, rotită cu `unghi` în jurul lui. */
function puse(marime: number, unghi = 0, joc = 0) {
  const baza = turnanta({ marime, joc }), sus = turnanta({ marime, piesa: 'sus' });
  const pivot = baza.prinderi.find((c) => c.fel === 'stiftTechnic')!, gura = sus.prinderi.find((c) => c.fel === 'gauraStift' && c.d[2] < 0)!;
  return { baza, sus, pivot, gura, M: Lt.montaj(pivot, gura, unghi) };
}

test('motorul știe piesa, iar cea implicită e baza de 2 × 2: o placă de 15,8 cu pivotul de Ø4,75 × 3,1 în mijloc', () => {
  assert.ok(L.tipuri.includes('turnanta'));
  const p = turnanta(), h = hartie(2);
  assert.deepEqual(cote(p), [15.8, 15.8, r3(PLACA + h.hp)]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicit');
  assert.equal(amprentaPlasei(turnanta({ marime: 2, piesa: 'baza', joc: 0 })), amprentaPlasei(p));
  const q = Lt.turnantaCote({}), e = Lt.efective();
  assert.deepEqual([q.marime, q.piesa, q.joc, r3(q.pivotD), r3(q.pivotH), r3(q.gauraD), r3(q.jocRadial), r3(q.inaltime)],
    [2, 'baza', 0, 4.75, 3.1, r3(e.gauraD!), r3((e.gauraD! - 4.75) / 2), 6.4]);
  // pe hârtie, la calibrarea de pornire: gaura de 5,0, deci 0,125 mm de jur împrejurul pivotului
  assert.equal(r3(q.jocRadial), 0.125);
});

test('baza, pe plasă: fața de sus netedă (fără știfturi), plină dedesubt între locașuri, locașurile goale', () => {
  for (const marime of [2, 4]) {
    const p = turnanta({ marime }), h = hartie(marime), ce = `baza ${marime} × ${marime}`;
    inchisa(p, ce);
    assert.deepEqual(cote(p), [r3(h.latura), r3(h.latura), r3(PLACA + h.hp)], ce);
    for (let i = 0; i < marime; i++) for (let j = 0; j < marime; j++) {
      const x = S * i + S / 2 - J0, y = S * j + S / 2 - J0;
      // unde ar fi un știft, deasupra e gol; locașul de dedesubt e gol, iar placa, plină deasupra lui
      assert.equal(la(p, x, y, PLACA + STIFT / 2), false, `${ce}: fără știft la (${i}, ${j})`);
      assert.equal(la(p, x, y, 1), false, `${ce}: locașul (${i}, ${j}) e gol`);
      assert.equal(la(p, x, y, PLACA - 0.3), true, `${ce}: placa e plină peste locașul (${i}, ${j})`);
    }
    // fața de sus: lemn sub ea, gol deasupra, peste tot afară de pivot
    for (const [x, y] of [[0.5, 0.5], [h.latura - 0.5, 0.5], [h.c - 4, h.c + 4], [h.c + 3.6, h.c]]) {
      assert.equal(la(p, x!, y!, PLACA - 0.15), true, `${ce}: lemn sub fața de sus, la (${x}, ${y})`);
      assert.equal(la(p, x!, y!, PLACA + 0.15), false, `${ce}: deasupra feței e gol, la (${x}, ${y})`);
    }
    // sub pivot, placa e plină de jos până sus (pivotul stă pe lemn, nu pe un tub gol)
    for (const z of [0.3, 1.5, PLACA - 0.3]) assert.equal(la(p, h.c, h.c + 1.2, z), true, `${ce}: lemn sub pivot, la z ${z}`);
  }
});

test('pivotul, pe plasă: un cilindru de Ø4,75 cu fanta de 0,8 mm, de la fața bazei până la 0,1 mm sub fața părții de sus', () => {
  for (const [marime, joc] of [[2, 0], [4, 0], [2, 0.1], [2, -0.1], [4, 0.2]] as const) {
    const p = turnanta({ marime, joc }), h = hartie(marime, joc), ce = `${marime} × ${marime}, jocul ${joc}`, e = 0.12;
    for (const z of [PLACA + 0.3, PLACA + h.hp / 2, PLACA + h.hp - 0.3]) {
      // de o parte și de alta a fantei, lemn până la rază; în afara ei, gol
      for (const s of [-1, 1]) {
        assert.equal(la(p, h.c + s * 1.2, h.c, z), true, `${ce}: braț, la z ${z}`);
        assert.equal(la(p, h.c + s * (h.r - e), h.c, z), true, `${ce}: brațul ține până la rază, la z ${z}`);
        assert.equal(la(p, h.c + s * (h.r + e), h.c, z), false, `${ce}: în afara razei e gol, la z ${z}`);
        assert.equal(la(p, h.c + s * 0.9, h.c + s * (h.r * 0.75), z), true, `${ce}: brațul e rotund, la z ${z}`);
        assert.equal(la(p, h.c + s * (h.r - e) * Math.SQRT1_2, h.c + (h.r - e) * Math.SQRT1_2, z), true, `${ce}: la 45°, lemn până la rază`);
        assert.equal(la(p, h.c + s * (h.r + e) * Math.SQRT1_2, h.c + (h.r + e) * Math.SQRT1_2, z), false, `${ce}: la 45°, gol după rază`);
      }
      // fanta: goală pe toată lățimea pivotului, de 0,8 mm (gol la 0,3 de mijloc, lemn la 0,5)
      for (const y of [h.c - h.r + 0.3, h.c, h.c + h.r - 0.3]) {
        assert.equal(la(p, h.c, y, z), false, `${ce}: fanta e goală, la y ${r3(y)}, z ${z}`);
        assert.equal(la(p, h.c + 0.3, y, z), false, `${ce}: fanta are 0,8 mm, la y ${r3(y)}`);
        if (Math.abs(y - h.c) < h.r - 0.6) assert.equal(la(p, h.c + 0.5, y, z), true, `${ce}: lângă fantă e lemn, la y ${r3(y)}`);
      }
    }
    // vârful: lemn sub el, gol deasupra; rădăcina: în fața bazei
    assert.equal(la(p, h.c + 1.2, h.c, PLACA + h.hp - 0.1), true, `${ce}: vârful`);
    assert.equal(la(p, h.c + 1.2, h.c, PLACA + h.hp + 0.1), false, `${ce}: după vârf, gol`);
    const q = Lt.turnantaCote({ marime, joc });
    assert.deepEqual([r3(q.pivotD), r3(q.jocRadial)], [r3(2 * h.r), r3((Lt.efective().gauraD! - 2 * h.r) / 2)], ce);
  }
});

test('partea de sus e placa cu gaura de știft din mijloc, aceeași cu cea a cărămizii, de 2 × 2 și de 4 × 4', () => {
  const rand = (n: number): [number, number][] => Array.from({ length: n * n }, (_, k): [number, number] => [k % n, Math.floor(k / n)]);
  for (const marime of [2, 4]) {
    const p = turnanta({ marime, piesa: 'sus' }), ce = `sus ${marime} × ${marime}`;
    inchisa(p, ce);
    const placa = fa({ tip: 'caramida', celule: rand(marime), placi: 1, gauri: [[marime / 2, marime / 2, 'r']] });
    assert.equal(forma(p), forma(placa), ce);
    assert.deepEqual(cote(p), cote(placa), ce);
    // jocul e al pivotului: partea de sus nu se schimbă cu el
    assert.equal(amprentaPlasei(turnanta({ marime, piesa: 'sus', joc: 0.2 })), amprentaPlasei(p), `${ce}: jocul nu o schimbă`);
  }
});

test('prinderile: baza are locașurile și pivotul (un capăt de știft Technic în sus); partea de sus, ale plăcii cu gaură', () => {
  for (const marime of [2, 4]) {
    const baza = turnanta({ marime }), sus = turnanta({ marime, piesa: 'sus' }), h = hartie(marime), n = marime * marime;
    assert.deepEqual(numara(baza.prinderi), { locas: n, stiftTechnic: 1 });
    assert.deepEqual(numara(sus.prinderi), { stift: n, locas: n, gauraStift: 2 });
    const pv = baza.prinderi.find((c) => c.fel === 'stiftTechnic')!;
    assert.deepEqual([...pv.p.map(r3), ...pv.d, r3(pv.lung)], [r3(h.c), r3(h.c), r3(PLACA), 0, 0, 1, r3(h.hp)]);
    const gauri = sus.prinderi.filter((c) => c.fel === 'gauraStift');
    assert.deepEqual(gauri.map((c) => [...c.p.map(r3), c.d[2], r3(c.lung)]), [[r3(h.c), r3(h.c), r3(PLACA), 1, r3(PLACA)], [r3(h.c), r3(h.c), 0, -1, r3(PLACA)]]);
  }
});

test('puse una peste alta: partea de sus stă pe fața bazei, în jurul pivotului, și se rotește fără să atingă nimic', () => {
  for (const marime of [2, 4]) {
    const { baza, sus, pivot, gura, M } = puse(marime), ce = `${marime} × ${marime}`;
    const [a, b] = cutie(mutata(M, sus.tri));
    assert.deepEqual([r3(a[0]) + 0, r3(a[1]) + 0, r3(a[2])], [0, 0, r3(PLACA)], `${ce}: partea de sus stă exact peste bază`);
    assert.equal(r3(b[2]), r3(2 * PLACA + STIFT), `${ce}: împreună, două plăci (6,4) și știfturile`);
    // vârful pivotului rămâne cu 0,1 mm sub fața de sus (ce se pune pe știfturi nu dă de el)
    assert.equal(r3(cutie(baza.tri)[1][2]), r3(2 * PLACA - 0.1), ce);
    for (const unghi of [0, 17, 45, 90, 203]) assert.equal(patrund(baza.tri, mutata(Lt.montaj(pivot, gura, unghi), sus.tri)), 0, `${ce}: rotită cu ${unghi}°, nu atinge baza`);
    // martorii: mutată cu 0,4 mm într-o parte, dă de pivot; lăsată cu 0,2 mm mai jos, intră în bază
    for (const d of [[0.4, 0, 0], [0, 0.4, 0], [-0.4, 0, 0], [0, -0.4, 0], [0, 0, -0.2]] as P3[]) assert.ok(patrund(baza.tri, mutata(cu(M, d), sus.tri)) > 0, `${ce}: mutată cu (${d}), se pătrund`);
  }
});

test('pivotul cu joc mai mare se rotește mai larg; cu joc negativ, mai strâns; partea de sus urmează calibrarea găurii', () => {
  // cu jocul 0,2, pivotul are Ø4,35: mutată cu 0,2 mm, partea de sus încă nu atinge pivotul; cu jocul 0, da
  const larg = puse(2, 0, 0.2), strans = puse(2, 0, 0);
  assert.equal(patrund(larg.baza.tri, mutata(cu(larg.M, [0.2, 0, 0]), larg.sus.tri)), 0, 'cu jocul 0,2, încape și mutată cu 0,2');
  assert.ok(patrund(strans.baza.tri, mutata(cu(strans.M, [0.2, 0, 0]), strans.sus.tri)) > 0, 'cu jocul 0, mutată cu 0,2 dă de pivot');
  // gaura părții de sus vine din calibrare (varianta găurii); pivotul rămâne al știftului Technic
  try {
    Lt.seteaza({ varianta_gaura: 5 });
    const q = Lt.turnantaCote({});
    assert.deepEqual([r3(q.pivotD), r3(q.gauraD), r3(q.jocRadial)], [4.75, 5.2, 0.225]);
    assert.equal(r3(cote(turnanta())[2]!), r3(PLACA + PLACA - 0.1), 'baza are aceleași cote');
  } finally { Lt.seteaza(null); }
});

test('modelul o vede prinsă: partea de sus e prinsă de bază prin pivot, nu intră în ea și nu plutește', () => {
  for (const unghi of [0, 30]) {
    const { baza, sus, M } = puse(2, unghi);
    const v = Lt.verificaModel([
      { T: { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }, tri: baza.tri, prinderi: baza.prinderi },
      { T: { m: M.m, t: M.t }, tri: sus.tri, prinderi: sus.prinderi },
    ]);
    assert.deepEqual(v.piese.map((p) => ({ prinsa: [...p.prinsa], intra: [...p.intra], pluteste: p.pluteste })),
      [{ prinsa: [1], intra: [], pluteste: false }, { prinsa: [0], intra: [], pluteste: false }], `rotită cu ${unghi}°`);
  }
});

test('valorile din afara marginilor: mărimea e 2 sau 4, jocul între −0,1 și 0,2 (din 0,05 în 0,05), cu mesajul lor', () => {
  const q = (d: Def) => Lt.turnantaCote(d);
  assert.equal(q({ marime: 3 }).marime, 4);
  assert.equal(q({ marime: 1 }).marime, 2);
  assert.equal(q({ marime: 6 }).marime, 4);
  assert.equal(q({ marime: '4' }).marime, 4);
  assert.match(turnanta({ marime: 3 }).avert.join(' '), /2 × 2 sau 4 × 4/);
  assert.equal(turnanta({ marime: 4 }).avert.length, 0);
  assert.equal(q({ joc: 0.5 }).joc, 0.2);
  assert.equal(q({ joc: -1 }).joc, -0.1);
  assert.equal(q({ joc: 0.07 }).joc, 0.05);
  assert.equal(q({ joc: '0,15' }).joc, 0.15);
  assert.equal(q({ joc: 'x' }).joc, 0);
  assert.match(turnanta({ joc: 0.5 }).avert.join(' '), /jocul pivotului/i);
  assert.equal(turnanta({ joc: 0.15 }).avert.length, 0);
  // partea de sus nu are pivot: jocul greșit nu-i dă mesaj
  assert.equal(turnanta({ piesa: 'sus', joc: 0.5 }).avert.length, 0);
  assert.equal(q({ piesa: 'altceva' }).piesa, 'baza');
  assert.equal(q({ piesa: 'sus' }).piesa, 'sus');
});
