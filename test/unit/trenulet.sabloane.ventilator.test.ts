/**
 * Ventilatorul în „Modelul” (ADR 0341, felia 3.Cn): a cincea construcție gata a atelierului Easy 3Draw,
 * `constructieGata('ventilator', valori)`, cu trusa din 3.Cm-3 prinsă, prindere în prindere:
 * - grinda groasă de 2k + 1 găuri, pe grilă (k: urechile la 8 · k mm de axul carcasei);
 * - câte un știft Technic în prima și în ultima gaură;
 * - carcasa pe știfturi, cu urechile în găurile lor, deci cu axul peste gaura din mijloc, pe fața de sus a grinzii;
 * - axul prin gaura din mijloc (rotundă: axul se rotește), cu capătul de jos la fața de jos a grinzii;
 * - jumătatea de bucșă pe ax, pe fața de sus a grinzii; rotorul pe ax, deasupra ei, cu paletele în tub (butucul poate ieși
 *   deasupra carcasei, ca în trusa din 3.Cm-3).
 * Valorile pe hârtie: grinda groasă de 7,8, bucșa ½ de 3,8, axul de n · 8 − 0,2 mm, găurile la pasul de 8; trusa implicită
 * (Ø40) are grinda de 7 găuri, iar cea de Ø48, de 9 (ca în 3.Cm-3).
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
  ventilatorCote(d: Record<string, unknown>): { D: number; Rt: number; rh: number; Hh: number; Hc: number; k: number };
  ventilatorTrusa(d: Record<string, unknown>): { gauri: number; ax: number };
};

const GRINDA = 7.8, BUCSA = 3.8, PAS = 8;
const corpuri = new Map<string, Corp>();
const fa = (d: Def): Corp => { const k = JSON.stringify(d); let c = corpuri.get(k); if (!c) { c = Lm.construieste(d); corpuri.set(k, c); } return c; };
const memo = new Map<string, boolean>();
const aplica = (T: Transf, p: readonly number[]): P3 => [0, 1, 2].map(i => T.m[3 * i]! * p[0]! + T.m[3 * i + 1]! * p[1]! + T.m[3 * i + 2]! * p[2]! + T.t[i]!) as P3;
const roteste = (T: Transf, v: readonly number[]): P3 => [0, 1, 2].map(i => T.m[3 * i]! * v[0]! + T.m[3 * i + 1]! * v[1]! + T.m[3 * i + 2]! * v[2]!) as P3;
const aproape = (a: number, b: number, tol: number, ce: string) => assert.ok(Math.abs(a - b) <= tol, `${ce}: ${a} în loc de ${b}`);
const aproapeP = (a: readonly number[], b: readonly number[], tol: number, ce: string) => [0, 1, 2].forEach(i => aproape(a[i]!, b[i]!, tol, `${ce} [${'xyz'[i]}]`));

function asezari(g: Gata): Transf[] {
  return Lm.rezolvaModel(g.piese.map((p, i) => {
    const c = fa(p.def), q = p.prins;
    return { id: `p${i}`, grila: Lm.transfGrila(Lm.asezareModel(p.def, c), p.x, p.y, p.z, p.rot), prinderi: c.prinderi,
      prins: q ? { de: `p${q.de}`, a: q.a, b: q.b, unghi: q.unghi, alunec: q.alunec } : null, liber: null };
  })).map(a => a.T);
}
const verifica = (piese: readonly PiesaSablon[], T: Transf[]): Verificat =>
  Lm.verificaModel(piese.map((p, i) => ({ T: T[i]!, tri: fa(p.def).tri, prinderi: fa(p.def).prinderi, cheie: JSON.stringify(p.def) })), memo);
/** Vârfurile plasei unei piese, așezate. */
const varfuri = (T: Transf, tri: readonly Tri[]): P3[] => tri.flatMap(t => t.map(q => aplica(T, q)));
const zuri = (v: readonly P3[]): [number, number] => [Math.min(...v.map(q => q[2])), Math.max(...v.map(q => q[2]))];
const indice = (g: Gata, f: (p: PiesaSablon) => boolean, ce: string): number => {
  const l = g.piese.flatMap((p, i) => (f(p) ? [i] : []));
  assert.equal(l.length, 1, ce);
  return l[0]!;
};

/** Ce se cere ventilatorului gata, cu valorile `d` (și k, dacă e știut pe hârtie). */
function bun(d: Record<string, unknown>, ce: string, kHartie?: number): void {
  const g = Lm.constructieGata('ventilator', d), q = Lm.ventilatorCote(d), t = Lm.ventilatorTrusa(d), k = kHartie ?? q.k;
  if (kHartie !== undefined) assert.equal(q.k, kHartie, `${ce}: k pe hârtie`);
  assert.deepEqual([...g.avert], [], `${ce}: fără avertismente`);
  assert.equal(g.nume, 'Ventilator', ce);
  // piesele: grinda, două știfturi, carcasa, axul, bucșa, rotorul
  const tipuri = Array.from(g.piese, p => (p.def.tip === 'ventilator' ? `ventilator:${p.def.piesa}` : p.def.tip)).sort();
  assert.deepEqual(tipuri, ['ax', 'bucsa', 'grinda', 'stiftTechnic', 'stiftTechnic', 'ventilator:carcasa', 'ventilator:rotor'], ce);
  // prima piesă, grinda, pe grilă; celelalte, prinse de una de dinaintea lor
  assert.equal(g.piese[0]!.def.tip, 'grinda', ce);
  assert.equal(g.piese[0]!.prins, undefined, ce);
  g.piese.slice(1).forEach((p, j) => assert.ok(p.prins && p.prins.de >= 0 && p.prins.de <= j, `${ce}: piesa ${j + 1} e prinsă de una de dinaintea ei`));
  assert.equal((g.piese[0]!.def.celule as unknown[]).length, 2 * k + 1, `${ce}: grinda de 2k + 1 găuri`);
  assert.equal(t.gauri, 2 * k + 1, ce);
  const T = asezari(g), v = verifica(g.piese, T);
  v.piese.forEach((p, i) => {
    const cine = `${ce}: piesa ${i} (${g.piese[i]!.def.tip})`;
    assert.ok(p.prinsa.length > 0, `${cine} nu e prinsă de nimic`);
    assert.deepEqual([...p.intra], [], `${cine} intră în alte piese`);
    assert.equal(p.pluteste, false, `${cine} plutește`);
  });
  assert.equal(v.bucati, 1, `${ce}: un singur grup`);
  // grinda culcată: gaura i are gura de jos B(i) și pe cea de sus H(i) = B(i) + (0, 0, 7,8)
  // (găurile, din prinderile grinzii: gura de sus a fiecăreia, de la stânga la dreapta, la pasul de 8)
  const Tg = T[0]!, guri = fa(g.piese[0]!.def).prinderi.filter(c => c.fel === 'gauraStift' && c.d[2]! > 0).map(c => aplica(Tg, c.p)).sort((a, b) => a[0] - b[0]);
  assert.equal(guri.length, 2 * k + 1, `${ce}: găurile grinzii`);
  guri.forEach((u, i) => { aproape(u[0] - guri[0]![0], PAS * i, 1e-6, `${ce}: gaura ${i}, la pasul de 8`); aproape(u[1], guri[0]![1], 1e-9, ce); });
  const H = (i: number) => guri[i]!, B = (i: number): P3 => [guri[i]![0], guri[i]![1], guri[i]![2] - GRINDA];
  aproapeP(roteste(Tg, [0, 0, 1]), [0, 0, 1], 1e-9, `${ce}: grinda culcată`);
  aproape(zuri(varfuri(Tg, fa(g.piese[0]!.def).tri))[0], B(0)[2], 1e-6, `${ce}: grinda, groasă de 7,8`);
  // știfturile ies 0,1 mm sub grindă (lungi de 2 · 8 − 0,2 = 15,8, cu gulerul la fața de sus): ele ating masa, deci grinda
  // stă ridicată cu o placă (pe grilă, înălțimile merg din placă în placă), la 3,2, iar știfturile la 3,1
  const jos = Math.min(...g.piese.map((p, i) => zuri(varfuri(T[i]!, fa(p.def).tri))[0])), zb = B(0)[2];
  assert.ok(jos >= -1e-9 && jos < 3.2, `${ce}: cea mai de jos piesă e la ${jos} mm de masă`);
  aproape(zb - jos, 0.1, 1e-6, `${ce}: știfturile, cu 0,1 mm sub grindă`);
  const axul = H(k);
  // carcasa: axul ei peste gaura din mijloc, pe fața de sus a grinzii, dreaptă; urechile peste găurile 0 și 2k
  const ic = indice(g, p => p.def.piesa === 'carcasa', ce), Tc = T[ic]!, cc = fa(g.piese[ic]!.def), cax = cc.ax!;
  aproapeP(aplica(Tc, [cax[0]!, cax[1]!, 0]), axul, 1e-6, `${ce}: carcasa, cu axul peste gaura din mijloc`);
  aproapeP(roteste(Tc, [0, 0, 1]), [0, 0, 1], 1e-9, `${ce}: carcasa dreaptă`);
  // urechile de pe x (față de axul carcasei): la 8 · k mm de el, de o parte și de alta
  const urechi = [aplica(Tc, [cax[0]! + PAS * k, cax[1]!, 0]), aplica(Tc, [cax[0]! - PAS * k, cax[1]!, 0])].sort((a, b) => a[0] - b[0]);
  for (const u of urechi) assert.ok(cc.prinderi.some(c => c.fel === 'gauraStift' && c.d[2]! < 0 && Math.hypot(...[0, 1, 2].map(j => aplica(Tc, c.p)[j]! - u[j]!)) < 1e-6), `${ce}: o ureche a carcasei, la 8 · k de ax`);
  aproapeP(urechi[0]!, H(0), 1e-6, `${ce}: o ureche peste prima gaură`);
  aproapeP(urechi[1]!, H(2 * k), 1e-6, `${ce}: cealaltă, peste ultima`);
  // știfturile: câte unul în prima și în ultima gaură, jumătate în grindă, jumătate în ureche
  for (const i of g.piese.flatMap((p, j) => (p.def.tip === 'stiftTechnic' ? [j] : []))) {
    const [z0, z1] = zuri(varfuri(T[i]!, fa(g.piese[i]!.def).tri));
    aproape((z0 + z1) / 2, zb + GRINDA, 1e-6, `${ce}: știftul, cu gulerul la fața de sus a grinzii`);
  }
  // axul: prin gaura din mijloc, de la fața de jos a grinzii, lung de n · 8 − 0,2
  const ia = indice(g, p => p.def.tip === 'ax', ce), va = varfuri(T[ia]!, fa(g.piese[ia]!.def).tri), [a0, a1] = zuri(va);
  assert.equal(g.piese[ia]!.def.lung, t.ax, ce);
  aproape(a0, zb, 1e-6, `${ce}: axul, de la fața de jos a grinzii`);
  aproape(a1 - zb, PAS * t.ax - 0.2, 1e-6, `${ce}: axul, lung de n · 8 − 0,2`);
  const mx = (Math.min(...va.map(p => p[0])) + Math.max(...va.map(p => p[0]))) / 2, my = (Math.min(...va.map(p => p[1])) + Math.max(...va.map(p => p[1]))) / 2;
  aproape(mx, axul[0], 1e-6, `${ce}: axul, pe axa carcasei (x)`);
  aproape(my, axul[1], 1e-6, `${ce}: axul, pe axa carcasei (y)`);
  // bucșa ½: pe fața de sus a grinzii
  const ib = indice(g, p => p.def.tip === 'bucsa', ce), [b0, b1] = zuri(varfuri(T[ib]!, fa(g.piese[ib]!.def).tri));
  aproape(b0, zb + GRINDA, 1e-6, `${ce}: bucșa, pe grindă`);
  aproape(b1, zb + GRINDA + BUCSA, 1e-6, `${ce}: bucșa, de 3,8`);
  // rotorul: pe același ax, deasupra bucșei, drept; paletele în tub (raza lor sub raza dinăuntru a carcasei, între fețele ei)
  const ir = indice(g, p => p.def.piesa === 'rotor', ce), Tr = T[ir]!, rax = fa(g.piese[ir]!.def).ax!;
  aproapeP(aplica(Tr, [rax[0]!, rax[1]!, 0]), [axul[0], axul[1], zb + GRINDA + BUCSA], 1e-6, `${ce}: rotorul, pe ax, deasupra bucșei`);
  aproapeP(roteste(Tr, [0, 0, 1]), [0, 0, 1], 1e-9, `${ce}: rotorul drept`);
  const vr = varfuri(Tr, fa(g.piese[ir]!.def).tri), raza = Math.max(...vr.map(p => Math.hypot(p[0] - axul[0], p[1] - axul[1])));
  assert.ok(raza <= q.Rt + 1e-3 && raza < q.D / 2, `${ce}: rotorul, în tub (raza ${raza}, tubul ${q.D / 2})`);
  // paletele (punctele din afara butucului) stau între fețele carcasei; butucul poate ieși deasupra (ca în trusă, 3.Cm-3)
  const palete = vr.filter(p => Math.hypot(p[0] - axul[0], p[1] - axul[1]) > q.rh + 0.5), [r0, r1] = zuri(palete);
  assert.ok(palete.length > 100, `${ce}: paletele rotorului`);
  assert.ok(r0 >= zb + GRINDA - 1e-6 && r1 <= zb + GRINDA + q.Hc + 1e-6, `${ce}: paletele, între fețele carcasei (${r0}…${r1}, carcasa ${zb + GRINDA}…${zb + GRINDA + q.Hc})`);
  assert.ok(a1 - zb >= GRINDA + BUCSA + q.Hh - 0.2 - 1e-6, `${ce}: axul trece prin tot butucul rotorului`);
}

test('SABLOANE: ventilatorul e a cincea construcție gata', () => {
  assert.deepEqual([...Lm.SABLOANE], ['sasiu', 'angrenaje', 'macara', 'barca', 'ventilator']);
});

test('ventilatorul implicit (Ø40, 7 palete, 2 urechi): grinda de 7, carcasa și rotorul pe același ax, totul prins', () => {
  bun({}, 'implicit', 3);
});

test('ventilatorul Ø48 (grinda de 9) și cu valorile editorului: 4 urechi, jocul, inelul, sensul, gaura rotundă', () => {
  bun({ diametru: 48 }, 'Ø48', 4);
  bun({ diametru: 60, palete: 5, urechi: 4, joc: 1.2, inel: 'da', sens: 'stanga', gaura: 'r', pas: 1.2, latime: 50 }, 'Ø60, 4 urechi, inel');
  bun({ diametru: 24, palete: 3 }, 'Ø24');
  bun({ diametru: 120, palete: 9, joc: 2 }, 'Ø120');
});

test('ventilatorul: valorile din afara plajei ies în margini, cu avertismentul motorului; un rotor fără gaură de ax primește una', () => {
  const g = Lm.constructieGata('ventilator', { diametru: 200 });
  assert.ok(g.avert.some(a => a.includes('120')), `diametrul: ${g.avert.join(' | ')}`);
  assert.equal(g.piese.find(p => p.def.piesa === 'carcasa')!.def.diametru, 120);
  for (const gaura of ['nu', 'b']) {
    const h = Lm.constructieGata('ventilator', { gaura });
    assert.equal(h.piese.find(p => p.def.piesa === 'rotor')!.def.gaura, 'x', gaura);
    assert.ok(h.avert.some(a => /ax/.test(a)), `gaura ${gaura}: ${h.avert.join(' | ')}`);
  }
  const u = Lm.constructieGata('ventilator', { urechi: 3 });
  assert.ok(u.avert.some(a => a.includes('2')), `urechile: ${u.avert.join(' | ')}`);
});

test('ventilatorul, proba de control: cu o carcasă mai strâmtă decât rotorul, verificarea spune că rotorul intră în ea', () => {
  const g = Lm.constructieGata('ventilator', { diametru: 48 }), ic = g.piese.findIndex(p => p.def.piesa === 'carcasa');
  const piese = g.piese.map((p, i) => (i === ic ? { ...p, def: { ...p.def, diametru: 36 } } : p));
  const strans = { ...g, piese }, v = verifica(piese, asezari(strans)), ir = g.piese.findIndex(p => p.def.piesa === 'rotor');
  assert.ok(v.piese[ir]!.intra.includes(ic), 'rotorul intră în carcasa strâmtă');
});
