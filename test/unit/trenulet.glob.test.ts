/**
 * Globul de Crăciun din atelierul Easy 3Draw (ADR 0285, felia 3.Cl-2), pe plasele reale ale motorului:
 * - plat: discul cu căpăcel și inel, cu un model (dungi, zigzag, stele) decupat sau în relief; modelul de pe hârtie e
 *   scris aici, iar plasa e întrebată punct cu punct;
 * - în relief, modelul stă peste disc, mai înalt cu „relieful”: de la înălțimea discului în sus se poate tipări cu alt
 *   filament; nimic nu stă în aer;
 * - din două discuri îmbinate în cruce: fantele cât grosimea plus jocul, una de jos și una de sus, până peste mijloc.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, cote, amprentaPlasei, muchiiFaraPereche } from './ajutor-plasa-lego.ts';
import { type P2, type Def, RAD, r2, num, inPoli, steaPoli, INEL, inInel, caPeHartie, bucati, inchisa, plata } from './ajutor-craciun.ts';

type Cote = { diam: number; grosime: number; fel: string; model: string; desen: string; relief: number; cate: number; agatatoare: string; capac: number; fanta: number; schimb: number };
const Lg = L as typeof L & { globCote(d: Def): Cote; prinderi(d: Def): unknown[]; asezareModel(d: Def): { ax: boolean } };
const glob = (d: Def = {}) => L.construieste({ tip: 'glob', ...d });
const E = L.efective();

type GlobHartie = { R: number; h: number; capL: number; capH: number; Ri: number; model: string; relief: number; cate: number; inel: boolean; discuri: boolean };
/** Globul de pe hârtie (ADR 0285): discul, căpăcelul de sus, inelul de pe el și modelul din cercul dinăuntru. */
function globPeHartie(d: Def = {}): GlobHartie {
  const D = num(d.diam, 60), R = D / 2, discuri = d.fel === 'discuri', model = discuri ? 'fara' : typeof d.model === 'string' ? d.model : 'dungi';
  // căpăcelul: lat de 26 % din diametru (cel puțin 8 mm), înalt de 9 % (cel puțin 4); marginea dinaintea modelului: 8 % (cel puțin 2,4)
  const capL = Math.max(8, 0.26 * D), capH = Math.max(4, 0.09 * D), Ri = R - Math.max(2.4, 0.08 * D);
  const cate = num(d.cate, model === 'zigzag' ? 2 : model === 'stele' ? 5 : 3);
  return { R, h: num(d.grosime, 3), capL, capH, Ri, model, relief: d.desen === 'relief' && model !== 'fara' ? num(d.relief, 0.8) : 0, cate, inel: d.agatatoare !== 'fara', discuri };
}
/** Discul, căpăcelul (intrat 0,6 mm sub locul unde marginea lui taie discul) și inelul. */
function inBaza(q: GlobHartie, [x, y]: P2): boolean {
  if (Math.hypot(x, y) <= q.R) return true;
  if (Math.abs(x) <= q.capL / 2 && y >= Math.sqrt(q.R * q.R - q.capL * q.capL / 4) - 0.6 && y <= q.R + q.capH) return true;
  return q.inel && inInel(q.R + q.capH, [x, y]);
}
/** Modelul, în cercul dinăuntru. */
function inModel(q: GlobHartie, [x, y]: P2): boolean {
  const { Ri, cate: n } = q;
  if (q.model === 'fara' || Math.hypot(x, y) > Ri) return false;
  if (q.model === 'dungi') {
    // n dungi și n + 1 goluri, la fel de înalte, pe tot cercul dinăuntru
    const s = 2 * Ri / (2 * n + 1);
    for (let i = 0; i < n; i++) if (y >= -Ri + (2 * i + 1) * s && y <= -Ri + (2 * i + 2) * s) return true;
    return false;
  }
  if (q.model === 'zigzag') {
    // n benzi în zigzag pe 72 % din rază, în sus și în jos; dinții au pasul de jumătate de rază
    const zona = 0.72 * Ri, pas = 2 * zona / n, A = 0.22 * pas, s = 0.28 * pas, p = Ri / 2, t = x / p, unda = 4 * Math.abs(t - Math.floor(t + 0.5)) - 1;
    for (let k = 0; k < n; k++) if (Math.abs(y - (-zona + (k + 0.5) * pas + A * unda)) <= s / 2) return true;
    return false;
  }
  // stelele: una în mijloc și n pe un cerc, cu un colț spre afară
  if (inPoli(steaPoli(5, 0.34 * Ri, 0.42 * 0.34 * Ri, 90 * RAD), [x, y])) return true;
  const rk = 0.2 * Ri;
  for (let j = 0; j < n; j++) {
    const u = 90 * RAD + 2 * Math.PI * j / n, c: P2 = [0.66 * Ri * Math.cos(u), 0.66 * Ri * Math.sin(u)];
    if (inPoli(steaPoli(5, rk, 0.42 * rk, u), [x - c[0], y - c[1]])) return true;
  }
  return false;
}
const cutieGlob = (q: GlobHartie): [number, number, number, number] => [-q.R - 1, -q.R - 1, q.R + 1, q.R + q.capH + INEL.tot + 1];

test('motorul știe globul, iar cel implicit are Ø60, gros de 3, cu trei dungi decupate, căpăcel și inel', () => {
  assert.ok(L.tipuri.includes('glob'));
  const p = glob(), q = Lg.globCote({});
  assert.deepEqual([q.diam, q.grosime, q.fel, q.model, q.desen, q.relief, q.cate, q.agatatoare], [60, 3, 'plat', 'dungi', 'decupat', 0.8, 3, 'inel']);
  // înalt: discul (60), căpăcelul (9 % din 60 = 5,4) și inelul (1,9 + 3,1)
  assert.deepEqual(cote(p).map(r2), [60, 70.4, 3]);
  assert.deepEqual(Array.from(p.baza, r2), [-30, -30, 0]);
  assert.equal(r2(q.capac), 5.4);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicit'); plata(p, 'implicit');
  assert.equal(amprentaPlasei(glob({ diam: 60, grosime: 3, fel: 'plat', model: 'dungi', desen: 'decupat', cate: 3, agatatoare: 'inel' })), amprentaPlasei(p));
  assert.deepEqual(cote(glob({ agatatoare: 'fara' })).map(r2), [60, 65.4, 3]);
  // un glob nu are prinderi și nu e piesă rotundă a modelului
  assert.equal(Array.from(Lg.prinderi({ tip: 'glob' })).length, 0);
  assert.equal(Lg.asezareModel({ tip: 'glob' }).ax, false);
});

test('globul decupat e cel de pe hârtie, punct cu punct: discul, căpăcelul, inelul și modelul (dungi, zigzag, stele)', () => {
  const cazuri: Def[] = [
    {}, { model: 'fara' }, { model: 'dungi', cate: 1 }, { model: 'dungi', cate: 5, diam: 30, grosime: 1.2 }, { model: 'zigzag' }, { model: 'zigzag', cate: 1, diam: 120 },
    { model: 'zigzag', cate: 3, diam: 30 }, { model: 'stele' }, { model: 'stele', cate: 3, diam: 100, agatatoare: 'fara' }, { model: 'stele', cate: 8, diam: 30 },
  ];
  for (const d of cazuri) {
    const p = glob(d), q = globPeHartie(d), ce = JSON.stringify(d);
    inchisa(p, ce); plata(p, ce);
    assert.equal(p.avert.length, 0, ce);
    const r = caPeHartie(p, (P) => inBaza(q, P) && !inModel(q, P), cutieGlob(q), q.h / 2, ce, 4000);
    assert.ok(r.judecate > 2500 && r.lemn > 300, `${ce}: ${r.judecate} puncte judecate, ${r.lemn} în lemn`);
    caPeHartie(p, () => false, cutieGlob(q), q.h + 0.05, `${ce}, peste piesă`, 300, 13);
    assert.deepEqual(cote(p).map(r2), [2 * q.R, r2(2 * q.R + q.capH + (q.inel ? INEL.tot : 0)), q.h], ce);
  }
});

test('dungile se numără pe plasă: câte s-au cerut, la fel de înalte ca golurile dintre ele', () => {
  for (const [diam, cate] of [[60, 3], [30, 5], [100, 1], [80, 4]] as const) {
    const p = glob({ diam, cate, agatatoare: 'fara' }), q = globPeHartie({ diam, cate }), s = 2 * q.Ri / (2 * cate + 1), ce = `Ø${diam}, ${cate} dungi`;
    // pe axa globului, de jos până la marginea de sus a discului: cate + 1 bucăți de lemn
    const pe = bucati(p, [0, -q.R], [0, q.R - 0.05], 1);
    assert.equal(pe.length, cate + 1, `${ce}: ${pe.length - 1} dungi numărate`);
    for (let i = 0; i + 1 < pe.length; i++) assert.ok(Math.abs(pe[i + 1]![0] - pe[i]![1] - s) < 0.03, `${ce}: dunga ${i + 1} are ${pe[i + 1]![0] - pe[i]![1]} mm, pe hârtie ${s}`);
    // lemnul dintre dungi: cât dunga; cel mai subțire, la Ø30 cu 5 dungi, rămâne peste nervura de 1,2
    for (let i = 1; i + 1 < pe.length; i++) assert.ok(Math.abs(pe[i]![1] - pe[i]![0] - s) < 0.03, `${ce}: între dungi sunt ${pe[i]![1] - pe[i]![0]} mm`);
    assert.ok(s >= 1.2, ce);
  }
});

test('globul în relief: discul întreg, cu modelul peste el; de la înălțimea discului în sus se schimbă filamentul', () => {
  for (const d of [{ desen: 'relief' }, { desen: 'relief', model: 'zigzag', relief: 1.6, grosime: 2 }, { desen: 'relief', model: 'stele', cate: 6, diam: 90, relief: 0.4 }] as Def[]) {
    const p = glob(d), q = globPeHartie(d), ce = JSON.stringify(d), c = Lg.globCote(d);
    const m = plasa(p.tri);
    assert.deepEqual([m.deschise, m.negative, muchiiFaraPereche(p)], [0, 0, 0], ce);
    assert.ok(m.corpuri >= 2, `${ce}: discul și modelul`);
    assert.equal(p.avert.length, 0, ce);
    assert.deepEqual(cote(p).map(r2), [2 * q.R, r2(2 * q.R + q.capH + INEL.tot), r2(q.h + q.relief)], ce);
    // în grosimea discului: discul întreg (fără goluri); peste el: doar modelul; și mai sus, nimic
    caPeHartie(p, (P) => inBaza(q, P), cutieGlob(q), q.h / 2, `${ce}, în disc`, 3000);
    const r = caPeHartie(p, (P) => inModel(q, P), cutieGlob(q), q.h + q.relief / 2, `${ce}, în relief`, 4000);
    assert.ok(r.lemn > 200, `${ce}: ${r.lemn} puncte în relief`);
    caPeHartie(p, () => false, cutieGlob(q), q.h + q.relief + 0.05, `${ce}, peste relief`, 300, 13);
    // nimic în aer: tot relieful stă pe disc (modelul e în cercul dinăuntru); filamentul se schimbă la înălțimea discului
    assert.equal(c.schimb, q.h, ce);
    for (const [a, b, cc] of p.tri) {
      const nz = (b[0] - a[0]) * (cc[1] - a[1]) - (b[1] - a[1]) * (cc[0] - a[0]);
      assert.ok(nz > -1e-9 || Math.min(a[2], b[2], cc[2]) < q.h, `${ce}: o față de jos a reliefului nu stă pe disc`);
    }
  }
  // decupat, globul nu are înălțime de schimb; fără model, relieful nu are ce ridica
  assert.equal(Lg.globCote({}).schimb, 0);
  assert.deepEqual(cote(glob({ desen: 'relief', model: 'fara' })).map(r2), [60, 70.4, 3]);
});

test('globul din două discuri îmbinate: fantele cât grosimea plus jocul, una de jos și una de sus, până peste mijloc', () => {
  for (const d of [{ fel: 'discuri' }, { fel: 'discuri', diam: 40, grosime: 2 }, { fel: 'discuri', diam: 100, grosime: 4, agatatoare: 'fara' }] as Def[]) {
    const p = glob(d), q = globPeHartie(d), ce = JSON.stringify(d), c = Lg.globCote(d), s = q.h + 2 * (E.joc! + 0.1), D = 2 * q.R;
    inchisa(p, ce, 2); plata(p, ce);
    assert.equal(p.avert.length, 0, ce);
    assert.equal(r2(c.fanta), r2(s), ce);
    assert.equal(c.model, 'fara', ce);
    // două discuri alăturate, la 3 mm; primul are căpăcelul și inelul
    assert.deepEqual(cote(p).map(r2), [2 * D + 3, r2(D + q.capH + (q.inel ? INEL.tot : 0)), q.h], ce);
    const pe = (P: P2): boolean => {
      if (inBaza(q, P)) return !(Math.abs(P[0]) < s / 2 && P[1] < 0.2);
      const Q: P2 = [P[0] - (D + 3), P[1]];
      return Math.hypot(Q[0], Q[1]) <= q.R && !(Math.abs(Q[0]) < s / 2 && Q[1] > -0.2);
    };
    const r = caPeHartie(p, pe, [-q.R - 1, -q.R - 1, 3 * q.R + 4, q.R + q.capH + INEL.tot + 1], q.h / 2, ce, 5000);
    assert.ok(r.judecate > 3500 && r.lemn > 500, ce);
    // fanta primului disc, măsurată la un sfert din rază sub mijloc; capetele fantelor, pe axe
    const jos = bucati(p, [-q.R - 1, -q.R / 4], [q.R + 1, -q.R / 4], q.h / 2);
    assert.equal(jos.length, 2, ce);
    assert.ok(Math.abs(jos[1]![0] - jos[0]![1] - s) < 0.03, `${ce}: fanta de jos are ${jos[1]![0] - jos[0]![1]} mm`);
    const A = bucati(p, [0, -q.R], [0, q.R], q.h / 2), B = bucati(p, [D + 3, -q.R], [D + 3, q.R], q.h / 2);
    assert.ok(A.length === 1 && Math.abs(A[0]![0] - (q.R + 0.2)) < 0.02, `${ce}: fanta de jos urcă până la ${A[0]![0] - q.R} peste mijloc`);
    assert.ok(B.length === 1 && Math.abs(B[0]![1] - (q.R - 0.2)) < 0.02, `${ce}: fanta de sus coboară până la ${q.R - B[0]![1]} sub mijloc`);
  }
});

test('marginile globului: ce iese din ele e adus înapoi, cu un mesaj; câte dungi, zigzaguri sau stele, după model', () => {
  const q = Lg.globCote({ diam: 300, grosime: 0.5, model: 'altul', desen: 'altfel', relief: 9, cate: 40, agatatoare: 'carlig', fel: 'altfel' });
  assert.deepEqual([q.diam, q.grosime, q.fel, q.model, q.desen, q.relief, q.cate, q.agatatoare], [120, 1.2, 'plat', 'dungi', 'decupat', 3, 5, 'inel']);
  assert.equal(glob({ diam: 300 }).avert.length, 1);
  assert.match(glob({ diam: 300 }).avert[0]!, /între 30 și 120 mm: l-am făcut de 120 mm\.$/);
  assert.match(glob({ grosime: 0.5 }).avert[0]!, /de 1,2 mm\.$/);
  // câte: dungi 1–5 (3), zigzaguri 1–3 (2), stele 3–8 (5); fără număr, cel obișnuit al modelului
  assert.deepEqual(['dungi', 'zigzag', 'stele'].map((model) => Lg.globCote({ model }).cate), [3, 2, 5]);
  assert.deepEqual(['dungi', 'zigzag', 'stele'].map((model) => Lg.globCote({ model, cate: 40 }).cate), [5, 3, 8]);
  assert.deepEqual(['dungi', 'zigzag', 'stele'].map((model) => Lg.globCote({ model, cate: 0 }).cate), [1, 1, 3]);
  assert.match(glob({ model: 'stele', cate: 40 }).avert[0]!, /între 3 și 8 stele: am făcut 8\.$/);
  assert.match(glob({ model: 'zigzag', cate: 9 }).avert[0]!, /între 1 și 3 zigzaguri: am făcut 3\.$/);
  assert.match(glob({ cate: 9 }).avert[0]!, /între 1 și 5 dungi: am făcut 5\.$/);
  // relieful din afara marginilor se spune doar la globul în relief
  assert.equal(glob({ relief: 9 }).avert.length, 0);
  assert.match(glob({ desen: 'relief', relief: 9 }).avert[0]!, /între 0,4 și 3 mm: l-am făcut de 3 mm\.$/);
  // zecimile și întregii; numerele scrise ca text
  const z = Lg.globCote({ diam: '60.04', cate: 2.5 });
  assert.deepEqual([z.diam, z.cate], [60, 3]);
  // discurile îmbinate n-au model, deci nici relief
  const dd = Lg.globCote({ fel: 'discuri', model: 'stele', desen: 'relief' });
  assert.deepEqual([dd.model, dd.cate, dd.schimb], ['fara', 0, 0]);
});
