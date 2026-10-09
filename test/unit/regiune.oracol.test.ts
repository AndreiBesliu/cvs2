/**
 * Oracolul regiunii păstrate (ADR 0026) și invarianta 2 din poartă, judecate:
 * - pe hârtie: distanțele dintre primitive, contururile (rotite, oglindite, scalate, forfecate), pădurea, K, traseele
 *   ideale, predicția pe documente (placa 1, piese prea apropiate, piesa în piesă, gaura din schelet, insula, atingerile,
 *   ambele laturi, `pe-linie`) și poarta pe programe scrise de mână (etichetele, Z, G0, toleranța ε, cele 4 colțuri);
 * - pe a doua metodă: distanța exactă față de eșantionarea pe ambele primitive; predicția (exactă) față de poartă
 *   (eșantionată), pe programele traseelor ideale;
 * - lipirea cu aplicația (testele „lipire:”), în ambele sensuri din ADR 0026 §9, pe corpusul determinist.
 *
 * Felia 2.3b (ADR 0027): documentele sunt v4 (corpusul are un sens ales la întâmplare pe fiecare operație); aplicația
 * le primește prin ușă (`incarca`), ca interfața. Invarianta 9 (sensul) se judecă în `sens.oracol.test.ts`; aici,
 * „restul porții” înseamnă exact invariantele 1, 3, 5, 6, 7 și 8.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import { verificaV4, type DocV4O } from '../oracles/document.ts';
import { pentruAplicatie } from './ajutor-lipire.ts';
import {
  arc, capeteArc, cercP, contur, celMaiMic, distantaExacta, distantaListe, dPunctLista, EPS_REGIUNE, inK,
  lungime, prag, prezice, pt, punct, punctLa, regiuneDinDocument, segment, startul, verificaMutarea,
  type Primitiva, type Regiune,
} from '../oracles/regiune.ts';
import {
  aleator, cerc, corpus, documentRegiune, drept, ID, oglinda, PLACA_1, programDinTrasee, simple, STOC, tr,
  type CazCorpus, type Montaj, type Traseu,
} from '../oracles/regiune.cazuri.ts';

const aproape = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol;
const egal = (a: number, b: number, mesaj = '', tol = 1e-9): void => assert.ok(aproape(a, b, tol), `${mesaj}: ${a} ≠ ${b}`);

const MONTAJE: readonly Montaj[] = (['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const)
  .flatMap((origine) => (['sus', 'jos'] as const).map((z0) => ({ foaie: STOC, origine, z0 })));

function ctxDe(reg: Regiune, D: number, m: Montaj = MONTAJE[0]!): ContextPoarta {
  return { foaie: m.foaie, origine: m.origine, z0: m.z0, diametruScula: D, pas: 1000, supracursa: 0, asteptareAx: 3, regiune: reg };
}
const inv2 = (text: string, ctx: ContextPoarta): Incalcare[] => poarta(text, ctx).filter((i) => i.invarianta === 2);
/** Id-urile tăieturilor prinse („tăietura lui X intră în Y”), cu adâncimea cea mai mare. */
function prinse(v: readonly Incalcare[]): Map<string, { in: string; cu: number }> {
  const rez = new Map<string, { in: string; cu: number }>();
  for (const i of v) {
    const m = /tăietura lui (\S+) intră în (\S+) \(cu ([\d.]+) mm/.exec(i.mesaj);
    if (!m) continue;
    const cu = Number(m[3]);
    if (!rez.has(m[1]!) || rez.get(m[1]!)!.cu < cu) rez.set(m[1]!, { in: m[2]!, cu });
  }
  return rez;
}

/** Traseele ideale ale tuturor inelelor, cu etichetele contractului (§7). */
function traseeIdeale(reg: Regiune, D: number, peste: Partial<Record<string, readonly Primitiva[]>> = {}): Traseu[] {
  return reg.inele.flatMap((inel) => {
    const latura = inel.rol === 'piesa' ? 'exterior' : 'interior';
    const t = reg.taieturi.get(inel.idLume)!;
    const adancime = t.laturi.get(latura)![0]!;
    const drum = peste[inel.idLume] ?? inel.contur.drumIdeal(D / 2, latura);
    return drum ? [{ eticheta: `${inel.idLume}: ${t.tip}, ${latura}, ${adancime} mm`, primitive: drum, adancime }] : [];
  });
}
const programIdeal = (doc: DocV4O, D: number, m: Montaj = MONTAJE[0]!): string => programDinTrasee(traseeIdeale(regiuneDinDocument(doc), D), m);
/** Pădurea, după id: rolul, părintele și dacă inelul mărginește K (ordinea inelelor e a tăieturilor, deci nu contează). */
function padure(reg: Regiune): Record<string, [string, string | null, boolean]> {
  return Object.fromEntries(reg.inele.map((x, i) => [x.idLume, [x.rol, reg.parinte[i]! >= 0 ? reg.inele[reg.parinte[i]!]!.idLume : null, reg.margineK[i]!]]));
}

// ── Distanțele, pe hârtie ─────────────────────────────────────────────────────────────────────────────────────────

test('distanțe pe hârtie: segment–segment, segment–arc, arc–arc, punct', () => {
  const S = (ax: number, ay: number, bx: number, by: number) => segment(pt(ax, ay), pt(bx, by));
  egal(distantaExacta(S(0, 0, 10, 0), S(5, 3, 5, 10)), 3, 'T');
  egal(distantaExacta(S(0, 0, 10, 10), S(0, 10, 10, 0)), 0, 'X');
  egal(distantaExacta(S(0, 0, 1, 0), S(3, 0, 4, 0)), 2, 'coliniare');
  egal(distantaExacta(S(0, 0, 10, 0), S(2, 4, 8, 4)), 4, 'paralele');
  // Dreapta y = 20 (x de la −10 la 10) și cercul de rază 15 din origine: 5; semicercul de sus tot 5; cel de jos e
  // departe: capătul (15, 0) până la (10, 20) = √425.
  egal(distantaExacta(S(-10, 20, 10, 20), cercP(pt(0, 0), 15)), 5, 'cerc');
  egal(distantaExacta(S(-10, 20, 10, 20), arc(pt(0, 0), 15, 0, Math.PI)), 5, 'semicercul de sus');
  egal(distantaExacta(S(-10, 20, 10, 20), arc(pt(0, 0), 15, Math.PI, Math.PI)), Math.sqrt(425), 'semicercul de jos');
  // Dreapta prin centru (y = 0) și arcul de rază 5 de la 30° la 150°: capătul (4.330, 2.5) e la 2.5 de ea.
  egal(distantaExacta(S(-20, 0, 20, 0), arc(pt(0, 0), 5, Math.PI / 6, (2 * Math.PI) / 3)), 2.5, 'prin centru');
  // Același arc parcurs invers (du < 0): aceeași mulțime de puncte.
  egal(distantaExacta(S(-20, 0, 20, 0), arc(pt(0, 0), 5, (5 * Math.PI) / 6, -(2 * Math.PI) / 3)), 2.5, 'invers');
  // Cercuri: (0, 0) R10 și (30, 0) R5 → 15; concentrice R10 / R7 → 3.
  egal(distantaExacta(cercP(pt(0, 0), 10), cercP(pt(30, 0), 5)), 15, 'cercuri');
  egal(distantaExacta(cercP(pt(0, 0), 10), cercP(pt(0, 0), 7)), 3, 'concentrice');
  // Concentrice fără unghi comun: sfertul I (R10) și sfertul III (R7): capetele, √(10² + 7²).
  egal(distantaExacta(arc(pt(0, 0), 10, 0, Math.PI / 2), arc(pt(0, 0), 7, Math.PI, Math.PI / 2)), Math.sqrt(149), 'sferturi');
  // Cercuri care se taie (centrele la 15, R10 și R10): 0; jumătățile care nu se ating (stânga a primului, dreapta a
  // celui de-al doilea): capetele (0, ±10) și (15, ±10), deci 15.
  egal(distantaExacta(cercP(pt(0, 0), 10), cercP(pt(15, 0), 10)), 0, 'se taie');
  egal(distantaExacta(arc(pt(0, 0), 10, Math.PI / 2, Math.PI), arc(pt(15, 0), 10, -Math.PI / 2, Math.PI)), 15, 'jumătăți');
  // Punctul: la segment, la arc (în afara unghiului → capetele), la cerc din centru (= raza).
  egal(distantaExacta(punct(pt(5, 5)), S(0, 0, 10, 0)), 5, 'punct–segment');
  egal(distantaExacta(punct(pt(0, -20)), arc(pt(0, 0), 15, 0, Math.PI)), 25, 'punct–arc, capetele');
  egal(distantaExacta(punct(pt(0, 0)), arc(pt(0, 0), 15, 0, 1)), 15, 'punct în centru');
});

test('a doua metodă: distanța exactă față de eșantionarea pe ambele primitive (1 200 de perechi, cu tangențe și concentrice)', () => {
  const r = aleator(0xd157);
  const u = (a: number, b: number): number => a + (b - a) * r();
  const prim = (c: { x: number; y: number }): Primitiva => {
    const k = r();
    if (k < 0.4) return segment(pt(c.x + u(-20, 20), c.y + u(-20, 20)), pt(c.x + u(-20, 20), c.y + u(-20, 20)));
    if (k < 0.9) return arc(pt(c.x + u(-10, 10), c.y + u(-10, 10)), u(0.5, 15), u(-Math.PI, Math.PI), u(-2 * Math.PI, 2 * Math.PI));
    return punct(pt(c.x + u(-15, 15), c.y + u(-15, 15)));
  };
  const n = 260;
  const puncte = (p: Primitiva): { x: number; y: number }[] =>
    p.tip === 'punct' ? [p.p] : Array.from({ length: n + 1 }, (_, i) => punctLa(p, (lungime(p) * i) / n));
  let cazuri = 0;
  for (let i = 0; i < 1200; i++) {
    const p = prim(pt(0, 0));
    let q = prim(pt(u(-25, 25), u(-25, 25)));
    // Cazuri speciale: concentric, tangent (din exterior / interior), dreapta prin centru.
    const fel = i % 6;
    if (fel === 1 && p.tip === 'arc') q = arc(p.c, u(0.5, 20), u(-3, 3), u(-6, 6));
    if (fel === 2 && p.tip === 'arc') q = arc(pt(p.c.x + p.r + 4, p.c.y), 4, u(-3, 3), u(-6, 6));
    if (fel === 3 && p.tip === 'arc') q = segment(pt(p.c.x - 30, p.c.y + u(-0.5, 0.5)), pt(p.c.x + 30, p.c.y + u(-0.5, 0.5)));
    const exact = distantaExacta(p, q);
    const A = puncte(p), B = puncte(q);
    let bruta = Infinity;
    for (const a of A) for (const b of B) bruta = Math.min(bruta, Math.hypot(a.x - b.x, a.y - b.y));
    const h = (lungime(p) + lungime(q)) / n / 2;
    assert.ok(exact <= bruta + 1e-9, `#${i}: exact ${exact} > eșantionat ${bruta} (${JSON.stringify([p, q])})`);
    assert.ok(exact >= bruta - h - 1e-9, `#${i}: exact ${exact} < eșantionat ${bruta} − ${h} (${JSON.stringify([p, q])})`);
    assert.ok(aproape(distantaExacta(q, p), exact, 1e-9), `#${i}: nesimetric`);
    cazuri++;
  }
  assert.equal(cazuri, 1200);
});

// ── Contururile, pe hârtie ────────────────────────────────────────────────────────────────────────────────────────

test('contururi pe hârtie: dreptunghiul (ascuțit, rotunjit), cercul scalat, rotirea cu 90°, oglindirea, forfecarea', () => {
  const d = contur(drept(100, 60) as never, tr(20, 20));
  assert.ok(d.contine(pt(25, 25)) && !d.contine(pt(19, 25)) && !d.contine(pt(20, 30)), 'ascuțit; marginea nu e înăuntru');
  egal(d.arie, 6000, 'aria');
  const rot = contur(drept(100, 60, 10) as never, tr(20, 20));
  // Colțul rotunjit cu raza 10: local (1, 1) e la √162 > 10 de centrul (10, 10), deci afară; (3, 3) la √98 < 10, înăuntru.
  assert.ok(!rot.contine(pt(21, 21)) && rot.contine(pt(23, 23)));
  egal(rot.arie, 6000 - (4 - Math.PI) * 100, 'aria rotunjită');
  // Cercul R5 sub scalarea 2: raza 10.
  const c = contur(cerc(5) as never, { a: 2, b: 0, c: 0, d: 2, e: 50, f: 50 });
  assert.ok(c.contine(pt(59.9, 50)) && !c.contine(pt(60.1, 50)));
  // Rotirea cu 90° în (150, 20): (x, y) → (150 − y, 20 + x), deci 90…150 × 20…120.
  const r90 = contur(drept(100, 60) as never, { a: 0, b: 1, c: -1, d: 0, e: 150, f: 20 });
  assert.deepEqual(r90.cutie, { minX: 90, maxX: 150, minY: 20, maxY: 120 });
  // Oglindirea x′ = 100 − x (cu colțuri rotunjite): același contur, arcele parcurse invers; Hausdorff 0 în ambele sensuri.
  const og = contur(drept(100, 60, 8) as never, { ...oglinda(100), e: 120, f: 20 });
  const dr = contur(drept(100, 60, 8) as never, tr(20, 20));
  assert.ok(og.primitive.some((p) => p.tip === 'arc' && p.du < 0), 'arcele oglindite au du < 0');
  for (const [x, y] of [[og, dr], [dr, og]] as const) {
    for (const p of x.primitive) for (let k = 0; k <= 20; k++) egal(dPunctLista(punctLa(p, (lungime(p) * k) / 20), y.primitive), 0, 'Hausdorff', 1e-9);
  }
  // Scalarea neuniformă (2 × 1) a unui dreptunghi ascuțit 50 × 60: același 100 × 60, același offset exterior.
  const sc = contur(drept(50, 60) as never, { a: 2, b: 0, c: 0, d: 1, e: 20, f: 20 });
  const ext = sc.drumIdeal(3, 'exterior')!;
  egal(distantaListe(ext, d.primitive), 3, 'exteriorul scalat la 3');
  assert.deepEqual(roteste(sc.drumIdeal(3, 'exterior')!), roteste(d.drumIdeal(3, 'exterior')!));
  // Oglindită și scalată (x′ = 120 − 2x): tot 20…120 × 20…80; exteriorul în afară, interiorul înăuntru, ca la cel drept.
  const og2 = contur(drept(50, 60) as never, { a: -2, b: 0, c: 0, d: 1, e: 120, f: 20 });
  assert.deepEqual(roteste(og2.drumIdeal(3, 'exterior')!), roteste(d.drumIdeal(3, 'exterior')!));
  assert.deepEqual(roteste(og2.drumIdeal(3, 'interior')!), roteste(d.drumIdeal(3, 'interior')!));
  assert.ok(og2.contine(pt(25, 25)) && !og2.contine(pt(15, 25)));
  // Forfecarea x′ = x + y a pătratului 10 × 10: paralelogramul (0,0) (10,0) (20,10) (10,10). Interiorul cu R = 1:
  // laturile y = 1, y = 9, x − y = √2, x − y = 10 − √2, deci vârfurile (1 + √2, 1), (11 − √2, 1), (19 − √2, 9), (9 + √2, 9).
  const pf = contur(drept(10, 10) as never, { a: 1, b: 0, c: 1, d: 1, e: 0, f: 0 });
  const inter = pf.drumIdeal(1, 'interior')!;
  const s2 = Math.SQRT2;
  const varfuri = inter.map(startul).map((p) => [p.x, p.y]);
  const asteptat = [[1 + s2, 1], [11 - s2, 1], [19 - s2, 9], [9 + s2, 9]];
  for (const v of asteptat) assert.ok(varfuri.some((w) => aproape(w[0]!, v[0]!, 1e-12) && aproape(w[1]!, v[1]!, 1e-12)), `vârful ${v}`);
  // Laturile mai înguste decât 2R: scula nu încape (înălțimea pe latura oblică e 10/√2 = 7.07).
  assert.equal(pf.drumIdeal(3.6, 'interior'), null);
  assert.notEqual(pf.drumIdeal(3.5, 'interior'), null);
});

/** Cutia fiecărei primitive, rotunjită (compararea a două trasee construite pe drumuri diferite). */
function roteste(ps: readonly Primitiva[]): string[] {
  const f = (v: number): string => (Math.round(v * 1e6) / 1e6).toFixed(6);
  return ps.map((p) => (p.tip === 'segment' ? [p.a, p.b] : p.tip === 'arc' ? [...capeteArc(p), p.c] : [p.p])
    .map((q) => `${f(q.x)},${f(q.y)}`).sort().join(' ')).sort();
}

test('traseele ideale pe hârtie: dreptunghiul crescut / micșorat cu R, cercul cu raza ± R; scula care nu încape', () => {
  const d = contur(drept(100, 60) as never, tr(20, 20));
  const cut = (ps: readonly Primitiva[]) => {
    const xs = ps.flatMap((p) => (p.tip === 'segment' ? [p.a.x, p.b.x] : []));
    const ys = ps.flatMap((p) => (p.tip === 'segment' ? [p.a.y, p.b.y] : []));
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  };
  // Exterior R3: laturile pe 17 și 123 (x), 17 și 83 (y), cu sferturi de cerc de rază 3 în colțuri.
  assert.deepEqual(cut(d.drumIdeal(3, 'exterior')!), [17, 123, 17, 83]);
  assert.ok(d.drumIdeal(3, 'exterior')!.filter((p) => p.tip === 'arc').every((p) => p.tip === 'arc' && p.r === 3));
  // Interior R3: 23…117 × 23…77, colțuri ascuțite.
  assert.deepEqual(cut(d.drumIdeal(3, 'interior')!), [23, 117, 23, 77]);
  assert.ok(d.drumIdeal(3, 'interior')!.every((p) => p.tip === 'segment'));
  // Dreptunghiul rotunjit cu 10, interior R3: colțurile au raza 7, aceleași centre.
  const rr = contur(drept(100, 60, 10) as never, tr(20, 20));
  const arce = rr.drumIdeal(3, 'interior')!.flatMap((p) => (p.tip === 'arc' ? [p] : []));
  assert.equal(arce.length, 4);
  assert.ok(arce.every((a) => a.r === 7));
  const c = contur(cerc(15) as never, tr(70, 50));
  const [ext] = c.drumIdeal(3, 'exterior')!;
  const [int] = c.drumIdeal(3, 'interior')!;
  assert.ok(ext?.tip === 'arc' && ext.r === 18 && int?.tip === 'arc' && int.r === 12);
  // Cercul R3 cu R3: plonjare (un punct); R2.9: nu încape.
  assert.deepEqual(contur(cerc(3) as never, tr(70, 50)).drumIdeal(3, 'interior'), [punct(pt(70, 50))]);
  assert.equal(contur(cerc(2.9) as never, tr(70, 50)).drumIdeal(3, 'interior'), null);
  assert.equal(d.drumIdeal(30.5, 'interior'), null, 'înălțimea 60 < 2 × 30.5');
});

// ── Regiunea și predicția, pe documente ───────────────────────────────────────────────────────────────────────────

test('placa 1 (dreptunghi exterior + cerc interior, Ø6): pădurea, K pe hârtie, predicția curată, poarta trece pe toate montajele', () => {
  const doc = PLACA_1();
  const reg = regiuneDinDocument(doc);
  assert.deepEqual(padure(reg), { 'e1/e1': ['piesa', null, true], 'e2/e2': ['gol', 'e1/e1', true] });
  // K = dreptunghiul fără disc: centrul găurii nu; (25, 25) da; (10, 10) în schelet nu; (70, 66) la 16 de centru da;
  // (70, 64) la 14 de centru, în gaură, nu.
  assert.deepEqual([[70, 50], [25, 25], [10, 10], [70, 66], [70, 64]].map(([x, y]) => inK(reg, pt(x!, y!))), [false, true, false, true, false]);
  const p = prezice(reg, 6);
  assert.deepEqual(p, { probleme: [], nuIncape: [], patrunderi: [], verdict: 'curat' });
  for (const m of MONTAJE) assert.deepEqual(inv2(programIdeal(doc, 6, m), ctxDe(reg, 6, m)), [], `${m.origine} ${m.z0}`);
});

/** A 50 × 40 la (20, 20) și B 50 × 40 la (20 + 50 + g, 20), piese; freza Ø6. */
const pereche = (g: number, D = 6): DocV4O => simple(STOC, [
  { id: 'a', forma: drept(50, 40), x: 20, y: 20, laturi: ['exterior'] },
  { id: 'b', forma: drept(50, 40), x: 70 + g, y: 20, laturi: ['exterior'] },
], { diametru: D });

test('două piese mai apropiate decât freza: distanța 5 cu Ø6 dă 1.000 mm în fiecare (3 − (5 − 3)), refuz; la 6, curat', () => {
  const reg = regiuneDinDocument(pereche(5));
  const p = prezice(reg, 6);
  assert.equal(p.verdict, 'refuz');
  assert.deepEqual(p.patrunderi.map((x) => [x.idLume, x.in]), [['a/a', 'b/b'], ['b/b', 'a/a']]);
  for (const x of p.patrunderi) egal(x.patrundere, 1, x.idLume);
  // Poarta, pe programul traseelor ideale: ambele tăieturi sunt prinse, cu 1.000 mm, lângă x = 73 și x = 72.
  const v = inv2(programIdeal(pereche(5), 6), ctxDe(reg, 6));
  assert.deepEqual([...prinse(v)].map(([k, x]) => [k, x.in, x.cu]), [['a/a', 'b/b', 1], ['b/b', 'a/a', 1]]);
  assert.ok(v.some((i) => /lângă X 73\.000/.test(i.mesaj)) && v.some((i) => /lângă X 72\.000/.test(i.mesaj)), JSON.stringify(v));
  // Controlul: distanța 6 = D, discul e tangent la piesa vecină.
  const curat = regiuneDinDocument(pereche(6));
  assert.equal(prezice(curat, 6).verdict, 'curat');
  assert.deepEqual(inv2(programIdeal(pereche(6), 6), ctxDe(curat, 6)), []);
  // Cu Ø3.175 aceeași distanță de 5 trece.
  assert.equal(prezice(regiuneDinDocument(pereche(5, 3.175)), 3.175).verdict, 'curat');
});

test('pragul exact la predicție (§6 amendat): R − ε pe offsetul ideal; 6 − 0.006 refuz, 6 − 0.005 la limită, 6 − 0.004 curat', () => {
  const v = (g: number, D = 6) => prezice(regiuneDinDocument(pereche(g, D)), D);
  assert.equal(v(5.994).verdict, 'refuz');
  egal(v(5.994).patrunderi[0]!.patrundere, 0.006, 'pătrunderea', 1e-9);
  // La egalitate (distanța 2.995 = R − ε) aplicația poate cădea de oricare parte; la 0.004, NU are voie să refuze.
  assert.equal(v(5.995).verdict, 'banda');
  assert.equal(v(5.996).verdict, 'curat');
  assert.deepEqual(v(5.996).patrunderi.map((x) => x.stare), ['ok', 'ok']);
  assert.equal(v(6 - 2e-6).verdict, 'curat');
});

test('pragul nu coboară sub 1e-6 (§6 amendat): freza Ø0.01 (R = ε): traversarea e refuzată, o trecere la 0.001 nu', () => {
  // R = 0.005, pragul exact max(0, 1e-6) = 1e-6. Traseul lui a stă la 0.005 de a; b la distanța g: traseul e la g − 0.005.
  const v = (g: number) => prezice(regiuneDinDocument(pereche(g, 0.01)), 0.01);
  assert.equal(v(0.004).verdict, 'refuz', 'traseul trece prin b (distanța 0)');
  assert.equal(v(0.005 + 5e-7).verdict, 'refuz', 'la 5e-7 de b, sub pragul de 1e-6');
  assert.equal(v(0.005 + 2e-6).verdict, 'curat', 'la 2e-6 de b');
  assert.equal(v(0.006).verdict, 'curat');
  // Poarta pe o mișcare (direct, fără câmpul de înălțimi al porții întregi, care la Ø0.01 ar avea 10¹² celule): pragul
  // pe G-code e tot 1e-6; mișcarea care traversează b e prinsă, cea la 0.001 de b nu.
  const reg = regiuneDinDocument(pereche(0.5, 0.01));
  const i = reg.inele.findIndex((x) => x.idLume === 'a/a');
  const T = prag(0.005, 0.002);
  assert.equal(T, 1e-6);
  assert.ok(verificaMutarea(reg, i, segment(pt(70.6, 25), pt(70.6, 55)), 0.005, T) !== null, 'traversează b (70.5…)');
  assert.ok(verificaMutarea(reg, i, segment(pt(70.499, 25), pt(70.499, 55)), 0.005, T) === null, 'la 0.001 de b');
  assert.ok(verificaMutarea(reg, i, segment(pt(70.4, 5), pt(70.6, 70)), 0.005, T) !== null, 'oblic, prin latura lui b');
});

test('pragul pe G-code (§6 amendat): R − ε − 0.002; R − 0.006 trece, R − 0.008 e prins; la fel spre propriul gol și propria piesă', () => {
  // A 20…70, B 76…126 (distanța 6, curată). O singură trecere a lui A pe x = 73.006 (2.994 de B) sau 73.008 (2.992);
  // pragul pe G-code e 3 − 0.005 − 0.002 = 2.993.
  const doc = pereche(6);
  const reg = regiuneDinDocument(doc);
  const linie = (x: number): string => programDinTrasee([{ eticheta: 'a/a: dreptunghi, exterior, 3 mm', primitive: [segment(pt(x, 25), pt(x, 55))], adancime: 3 }], MONTAJE[0]!);
  assert.deepEqual(inv2(linie(73.006), ctxDe(reg, 6)), []);
  const prins = inv2(linie(73.008), ctxDe(reg, 6));
  assert.deepEqual([...prinse(prins)].map(([k, x]) => [k, x.in, x.cu]), [['a/a', 'b/b', 0.008]]);
  // Golul R10 cu traseul cercului de rază 7.006 (2.994 de propriul inel): trece; 7.008 (2.992): intră în S(C).
  const gol = simple(STOC, [{ id: 'g', forma: cerc(10), x: 100, y: 100, laturi: ['interior'] }], { diametru: 6 });
  const rg = regiuneDinDocument(gol);
  const cercul = (r: number): string => programDinTrasee([{ eticheta: 'g/g: cerc, interior, 3 mm', primitive: [cercP(pt(100, 100), r)], adancime: 3 }], MONTAJE[0]!);
  assert.deepEqual(inv2(cercul(7.006), ctxDe(rg, 6)), []);
  assert.deepEqual([...prinse(inv2(cercul(7.008), ctxDe(rg, 6)))].map(([k, x]) => [k, x.in, x.cu]), [['g/g', 'g/g', 0.008]]);
  // Piesa: traseul exterior la 2.992 de propriul contur intră în propria parte (S(C) = interiorul).
  const piesa = simple(STOC, [{ id: 'p', forma: cerc(10), x: 100, y: 100, laturi: ['exterior'] }], { diametru: 6 });
  const rp = regiuneDinDocument(piesa);
  const ext = (r: number): string => programDinTrasee([{ eticheta: 'p/p: cerc, exterior, 3 mm', primitive: [cercP(pt(100, 100), r)], adancime: 3 }], MONTAJE[0]!);
  assert.deepEqual(inv2(ext(12.994), ctxDe(rp, 6)), []);
  assert.deepEqual([...prinse(inv2(ext(12.992), ctxDe(rp, 6)))].map(([k, x]) => [k, x.in, x.cu]), [['p/p', 'p/p', 0.008]]);
});

test('eșantionarea porții: o apropiere scurtă (fereastra de încălcare de ~0.19 mm pe o mișcare de 180 mm) e prinsă', () => {
  // Piesa c (cerc R1.5) cu centrul în (100, 4.492): cea mai mică distanță până la dreapta y = 0 e 2.992 = R − 0.008.
  // Fereastra în care distanța e sub pragul pe G-code (2.993): |x − 100| < √((2.993 + 1.5)² − 4.492²) = √0.0090 ≈ 0.095.
  const doc = (cy: number) => simple(STOC, [
    { id: 'a', forma: drept(50, 40), x: 20, y: 120, laturi: ['exterior'] },
    { id: 'c', forma: cerc(1.5), x: 100, y: cy, laturi: ['exterior'] },
  ], { diametru: 6 });
  const mutare = programDinTrasee([{ eticheta: 'a/a: dreptunghi, exterior, 3 mm', primitive: [segment(pt(10.0003, 0), pt(190.0007, 0))], adancime: 3 }], MONTAJE[0]!);
  const v = prinse(inv2(mutare, ctxDe(regiuneDinDocument(doc(4.492)), 6)));
  assert.deepEqual([...v].map(([k, x]) => [k, x.in, x.cu]), [['a/a', 'c/c', 0.008]]);
  assert.deepEqual(inv2(mutare, ctxDe(regiuneDinDocument(doc(4.494)), 6)), []);
});

test('piesa desenată în altă piesă, fără gol: tăietura ei e în K, refuz (pătrunderea ≥ R)', () => {
  const doc = simple(STOC, [
    { id: 'a', forma: drept(100, 60), x: 20, y: 20, laturi: ['exterior'] },
    { id: 'b', forma: cerc(10), x: 70, y: 50, laturi: ['exterior'] },
  ], { diametru: 6 });
  const reg = regiuneDinDocument(doc);
  assert.deepEqual(reg.parinte, [-1, 0]);
  const p = prezice(reg, 6);
  assert.equal(p.verdict, 'refuz');
  assert.deepEqual(p.patrunderi.map((x) => [x.idLume, x.in, x.patrundere]), [['b/b', 'a/a', 3]]);
  // Poarta: doar tăietura lui b e prinsă (cercul de rază 13 stă în a), cu cel puțin R.
  const v = prinse(inv2(programIdeal(doc, 6), ctxDe(reg, 6)));
  assert.deepEqual([...v.keys()], ['b/b']);
  assert.ok(v.get('b/b')!.cu >= 3 && v.get('b/b')!.in === 'a/a');
});

test('gaura pusă singură (în schelet), cu o piesă alături: curat; tăietura piesei poate trece prin gaură; ca piesă, refuz', () => {
  const doc = (latura: 'interior' | 'exterior', x = 126) => simple(STOC, [
    { id: 'a', forma: drept(100, 60), x: 20, y: 20, laturi: ['exterior'] },
    { id: 'h', forma: cerc(5), x, y: 50, laturi: [latura] },
  ], { diametru: 6 });
  // Gaura 121…131 pe x: traseul piesei (x = 123) trece prin ea, dar gaura din schelet nu mărginește K.
  const reg = regiuneDinDocument(doc('interior'));
  assert.deepEqual(padure(reg), { 'a/a': ['piesa', null, true], 'h/h': ['gol', null, false] });
  assert.equal(prezice(reg, 6).verdict, 'curat');
  assert.deepEqual(inv2(programIdeal(doc('interior'), 6), ctxDe(reg, 6)), []);
  // Departe (200, 100): tot curat, iar K e gol în jurul ei.
  const departe = regiuneDinDocument(doc('interior', 200));
  assert.equal(prezice(departe, 6).verdict, 'curat');
  assert.ok(!inK(departe, pt(200, 100)) && !inK(departe, pt(200, 110)));
  // Același cerc ca piesă: traseul lui a îl taie (distanța inelelor 1 < 2R), pătrundere R.
  const piesa = prezice(regiuneDinDocument(doc('exterior')), 6);
  assert.equal(piesa.verdict, 'refuz');
  assert.ok(piesa.patrunderi.some((x) => x.idLume === 'a/a' && x.in === 'h/h' && x.patrundere === 3));
});

test('inelele care se ating, se taie sau coincid sunt refuzate; la 5e-7 se ating, la 2e-6 nu (două găuri în schelet)', () => {
  const doua = (a: [number, number, number], b: [number, number, number], la: 'interior' | 'exterior' = 'exterior') => simple(STOC, [
    { id: 'a', forma: cerc(a[2]), x: a[0], y: a[1], laturi: [la] },
    { id: 'b', forma: cerc(b[2]), x: b[0], y: b[1], laturi: [la] },
  ], { diametru: 6 });
  const tip = (d: DocV4O) => prezice(regiuneDinDocument(d), 6);
  // Tangente din exterior, se taie, coincid, tangente din interior.
  for (const [nume, d] of [
    ['tangente', doua([80, 100, 20], [110, 100, 10])],
    ['se taie', doua([80, 100, 20], [100, 100, 10])],
    ['coincid', doua([80, 100, 20], [80, 100, 20])],
    ['tangente pe dinăuntru', doua([80, 100, 20], [90, 100, 10])],
  ] as const) {
    const p = tip(d);
    assert.equal(p.verdict, 'refuz', nume);
    assert.deepEqual(p.probleme.map((x) => [x.tip, ...x.elemente]), [['atingere', 'a/a', 'b/b']], nume);
  }
  // Două găuri în schelet: la 5e-7 se ating (refuz); la 2e-6 nu, și nimic altceva nu le leagă (curat).
  assert.equal(tip(doua([100, 100, 12], [121 + 5e-7, 100, 9], 'interior')).verdict, 'refuz');
  assert.equal(tip(doua([100, 100, 12], [121 + 2e-6, 100, 9], 'interior')).verdict, 'curat');
  // Aceeași piesă pusă de două ori în același loc (două instanțe): inelele coincid.
  const p2 = documentRegiune(STOC, [{ id: 'p', elemente: [{ id: 'e', forma: drept(50, 30, 4), laturi: ['exterior'] }] }],
    [{ id: 'i1', piesa: 'p', x: 50, y: 50 }, { id: 'i2', piesa: 'p', x: 50, y: 50 }], { diametru: 6 });
  assert.deepEqual(tip(p2).probleme.map((x) => x.elemente), [['i1/e', 'i2/e']]);
  // Poarta raportează problema documentului (linia 0), oricât de curat ar fi programul.
  const reg = regiuneDinDocument(doua([80, 100, 20], [110, 100, 10]));
  const v = inv2(programIdeal(doua([80, 100, 20], [110, 100, 10]), 6), ctxDe(reg, 6));
  assert.ok(v.some((i) => i.linia === 0 && /inelele a\/a și b\/b se ating/.test(i.mesaj)));
});

test('elementul cu ambele laturi e refuzat și nu e inel; două operații pe aceeași latură dau un singur inel', () => {
  const ambele = regiuneDinDocument(simple(STOC, [{ id: 'a', forma: drept(80, 50), x: 40, y: 40, laturi: ['exterior', 'interior'] }], { diametru: 6 }));
  assert.deepEqual(ambele.inele, []);
  assert.deepEqual(ambele.probleme.map((p) => [p.tip, ...p.elemente]), [['ambele-laturi', 'a/a']]);
  assert.equal(prezice(ambele, 6).verdict, 'refuz');
  const dublu = regiuneDinDocument(simple(STOC, [
    { id: 'a', forma: drept(80, 50, 6), x: 40, y: 40, laturi: ['exterior', 'exterior', 'pe-linie'] },
  ], { diametru: 6 }));
  assert.deepEqual(dublu.inele.map((i) => i.idLume), ['a/a']);
  assert.deepEqual(dublu.probleme, []);
  // `pe-linie` singur nu e inel.
  assert.deepEqual(regiuneDinDocument(simple(STOC, [{ id: 'a', forma: drept(80, 50), x: 40, y: 40, laturi: ['pe-linie'] }], { diametru: 6 })).inele, []);
});

test('insula (piesă în gol, în piesă) e păstrată; distanța gol–insulă sub 2R e refuzată cu 2R − distanța în fiecare', () => {
  // A 200 × 160 la (50, 20); gaura R40 în (150, 100); insula R20 (distanța 20) sau R35 (distanța 5).
  const doc = (ri: number, cuPiesa = true) => simple(STOC, [
    ...(cuPiesa ? [{ id: 'a', forma: drept(200, 160), x: 50, y: 20, laturi: ['exterior'] as const }] : []),
    { id: 'h', forma: cerc(40), x: 150, y: 100, laturi: ['interior'] },
    { id: 'i', forma: cerc(ri), x: 150, y: 100, laturi: ['exterior'] },
  ], { diametru: 6 });
  const reg = regiuneDinDocument(doc(20));
  assert.deepEqual(padure(reg), { 'a/a': ['piesa', null, true], 'h/h': ['gol', 'a/a', true], 'i/i': ['piesa', 'h/h', true] });
  // Centrul (insula): K; la 30 de centru (în gaură): deșeu; la 45 (în piesă): K; în afara piesei: deșeu.
  assert.deepEqual([[150, 100], [150, 130], [150, 145], [10, 10]].map(([x, y]) => inK(reg, pt(x!, y!))), [true, false, true, false]);
  assert.equal(reg.inele[celMaiMic(reg, pt(150, 100))]!.idLume, 'i/i');
  assert.equal(prezice(reg, 6).verdict, 'curat');
  assert.deepEqual(inv2(programIdeal(doc(20), 6), ctxDe(reg, 6)), []);
  // Insula R35: traseul golului (R37) la 2 de insulă, al insulei (R38) la 2 de gol: 1.000 în fiecare.
  const strans = prezice(regiuneDinDocument(doc(35)), 6);
  assert.equal(strans.verdict, 'refuz');
  assert.deepEqual(strans.patrunderi.map((x) => [x.idLume, x.in]), [['h/h', 'i/i'], ['i/i', 'h/h']]);
  for (const x of strans.patrunderi) egal(x.patrundere, 1, x.idLume);
  // Insula în gaura din schelet (fără piesa mare): aceleași cifre, gaura mărginește K prin insulă.
  const schelet = regiuneDinDocument(doc(35, false));
  assert.deepEqual(padure(schelet), { 'h/h': ['gol', null, false], 'i/i': ['piesa', 'h/h', true] });
  assert.deepEqual(prezice(schelet, 6).patrunderi.map((x) => [x.idLume, x.patrundere]), [['h/h', 1]]);
  // Fără piesă mare, traseul insulei nu e judecat față de gaură: doar gaura o mușcă.
});

test('instanțe rotite și oglindite: gaura oglindită ajunge pe hârtie unde trebuie; două instanțe rotite la 5 mm, Ø6 → 1.000', () => {
  const piesa = (grup = oglinda(100)) => ({
    id: 'p', grup,
    elemente: [
      { id: 'rama', forma: drept(100, 60, 8), laturi: ['exterior'] as const },
      { id: 'gaura', forma: cerc(10), matrice: tr(20, 30), laturi: ['interior'] as const },
    ],
  });
  // Oglindită, nerotită, în (20, 20): gaura din (20, 30) ajunge în (80, 30), adică (100, 50) în lume.
  const d0 = documentRegiune(STOC, [piesa()], [{ id: 'i1', piesa: 'p', x: 20, y: 20 }], { diametru: 6 });
  const r0 = regiuneDinDocument(d0);
  assert.deepEqual([[100, 50], [40, 50], [100, 61]].map(([x, y]) => inK(r0, pt(x!, y!))), [false, true, true]);
  assert.equal(prezice(r0, 6).verdict, 'curat');
  // Rotită cu 90° în (150, 20): (80, 30) → (−30, 80) → (120, 100).
  const d1 = documentRegiune(STOC, [piesa()], [{ id: 'i1', piesa: 'p', x: 150, y: 20, rotire: 90 }], { diametru: 6 });
  const r1 = regiuneDinDocument(d1);
  assert.ok(!inK(r1, pt(120, 100)) && inK(r1, pt(120, 112)));
  const g = r1.inele.find((i) => i.idLume === 'i1/gaura')!.contur.primitive[0]!;
  assert.ok(g.tip === 'arc' && aproape(g.c.x, 120) && aproape(g.c.y, 100) && g.r === 10);
  // Două instanțe rotite cu 90°: 90…150 și 155…215 pe x (distanța 5): 1.000 în fiecare ramă; programul prins.
  const d2 = documentRegiune(STOC, [piesa()], [
    { id: 'i1', piesa: 'p', x: 150, y: 20, rotire: 90 }, { id: 'i2', piesa: 'p', x: 215, y: 20, rotire: 90 },
  ], { diametru: 6 });
  const r2 = regiuneDinDocument(d2);
  const p2 = prezice(r2, 6);
  assert.deepEqual(p2.patrunderi.map((x) => [x.idLume, x.in]), [['i1/rama', 'i2/rama'], ['i2/rama', 'i1/rama']]);
  for (const x of p2.patrunderi) egal(x.patrundere, 1, x.idLume);
  assert.deepEqual([...prinse(inv2(programIdeal(d2, 6), ctxDe(r2, 6))).keys()].sort(), ['i1/rama', 'i2/rama']);
  // Aceleași cifre fără oglindire (grupul identitate): oglindirea nu schimbă nimic din ce se vede.
  const d3 = documentRegiune(STOC, [piesa(ID)], [
    { id: 'i1', piesa: 'p', x: 150, y: 20, rotire: 90 }, { id: 'i2', piesa: 'p', x: 215, y: 20, rotire: 90 },
  ], { diametru: 6 });
  assert.deepEqual(prezice(regiuneDinDocument(d3), 6).patrunderi.map((x) => Math.round(x.patrundere * 1e9)), [1e9, 1e9]);
});

test('`pe-linie` nu se judecă: gravura care trece prin piesă trece; aceleași mișcări sub o etichetă exterior falsă sunt prinse', () => {
  const doc = simple(STOC, [
    { id: 'p', forma: drept(100, 60, 5), x: 40, y: 40, laturi: ['exterior'] },
    { id: 'grav', forma: cerc(25), x: 90, y: 70, laturi: ['pe-linie'], adancime: 1 },
  ], { diametru: 6 });
  const reg = regiuneDinDocument(doc);
  assert.deepEqual(reg.inele.map((i) => i.idLume), ['p/p']);
  assert.equal(prezice(reg, 6).verdict, 'curat');
  const grav: Traseu = { eticheta: 'grav/grav: cerc, pe-linie, 1 mm', primitive: [cercP(pt(90, 70), 25)], adancime: 1 };
  const text = programDinTrasee([grav, ...traseeIdeale(reg, 6)], MONTAJE[0]!);
  assert.deepEqual(inv2(text, ctxDe(reg, 6)), []);
  // Eticheta minte (exterior pe un element care e doar pe-linie): eticheta e prinsă, mișcările nu se mai judecă.
  const fals = programDinTrasee([{ ...grav, eticheta: 'grav/grav: cerc, exterior, 1 mm' }], MONTAJE[0]!);
  assert.ok(inv2(fals, ctxDe(reg, 6)).some((i) => /eticheta nu e a unei tăieturi din document: grav\/grav n-are operații exterior/.test(i.mesaj)));
  // Gravura sub eticheta piesei p: prinsă (cercul de rază 25 trece prin interiorul piesei).
  const subP = programDinTrasee([{ ...grav, eticheta: 'p/p: dreptunghi, exterior, 3 mm' }], MONTAJE[0]!);
  assert.ok(prinse(inv2(subP, ctxDe(reg, 6))).has('p/p'));
  // Un element care e și inel (exterior) și are o operație pe-linie: mișcările pe-linie, chiar pe contur, nu se judecă.
  const ambele = simple(STOC, [{ id: 'q', forma: drept(80, 50), x: 40, y: 40, laturi: ['exterior', 'pe-linie'], adancime: 2 }], { diametru: 6 });
  const rq = regiuneDinDocument(ambele);
  const peContur: Traseu = { eticheta: 'q/q: dreptunghi, pe-linie, 2 mm', primitive: rq.inele[0]!.contur.primitive, adancime: 2 };
  assert.deepEqual(inv2(programDinTrasee([peContur, ...traseeIdeale(rq, 6)], MONTAJE[0]!), ctxDe(rq, 6)), []);
});

test('Z și rapidele: G0 și G1 deasupra feței de sus peste piesă trec; G1 la Z-0.5 e prins; rampa se judecă doar sub fața de sus', () => {
  const doc = simple(STOC, [{ id: 'a', forma: drept(100, 60), x: 20, y: 20, laturi: ['exterior'] }], { diametru: 6 });
  const reg = regiuneDinDocument(doc);
  const cu = (...linii: string[]): string => programDinTrasee(traseeIdeale(reg, 6), MONTAJE[0]!)
    .replace('M5\n', `(a/a: dreptunghi, exterior, 3 mm)\n${linii.join('\n')}\nG0 Z5.000\nM5\n`);
  // Peste piesă (20…120 × 20…80): rapidă la Z5, rapidă la Z-2 (invarianta 3, nu 2), G1 la Z+1.
  assert.deepEqual(inv2(cu('G0 X10.000 Y50.000', 'G0 X130.000 Y50.000'), ctxDe(reg, 6)), []);
  assert.deepEqual(inv2(cu('G0 X10.000 Y50.000', 'G1 Z1.000 F300.0', 'G1 X130.000 F1000.0'), ctxDe(reg, 6)), []);
  assert.deepEqual(inv2(cu('G0 X10.000 Y50.000', 'G0 Z-2.000', 'G0 X130.000'), ctxDe(reg, 6)), []);
  assert.ok(prinse(inv2(cu('G0 X10.000 Y50.000', 'G1 Z-0.500 F300.0', 'G1 X130.000 F1000.0'), ctxDe(reg, 6))).has('a/a'));
  // Rampa din (60, 10, +1) în (60, 30, −1): sub fața de sus de la y = 20 (marginea piesei) în sus: prinsă.
  assert.ok(prinse(inv2(cu('G0 X60.000 Y10.000', 'G1 Z1.000 F300.0', 'G1 X60.000 Y30.000 Z-1.000 F1000.0'), ctxDe(reg, 6))).has('a/a'));
  // Rampa din (60, 0, −1) în (60, 30, +1): sub fața de sus doar până la y = 15, la 5 de piesă; partea din aer trece
  // peste piesă și nu se judecă.
  assert.deepEqual(inv2(cu('G0 X60.000 Y0.000', 'G1 Z-1.000 F300.0', 'G1 X60.000 Y30.000 Z1.000 F1000.0'), ctxDe(reg, 6)), []);
  // Controlul rampei: până la y = 18 sub fața de sus (din (60, 0, −1) în (60, 36, +1)): 2 de piesă, prinsă cu 1.000.
  const r = prinse(inv2(cu('G0 X60.000 Y0.000', 'G1 Z-1.000 F300.0', 'G1 X60.000 Y36.000 Z1.000 F1000.0'), ctxDe(reg, 6)));
  assert.ok(r.has('a/a') && aproape(r.get('a/a')!.cu, 1, 0.001), JSON.stringify([...r]));
  // Plonjarea pe verticală se judecă în punctul ei: în piesă, prinsă (cel puțin R).
  const pl = prinse(inv2(cu('G0 X60.000 Y50.000', 'G1 Z-1.000 F300.0'), ctxDe(reg, 6)));
  assert.ok(pl.has('a/a') && pl.get('a/a')!.cu >= 3);
});

test('etichetele: tăierea dinaintea primei etichete, eticheta stricată, nesingură, străină sau cu alt tip / altă adâncime sunt prinse', () => {
  const doc = PLACA_1();
  const reg = regiuneDinDocument(doc);
  const curat = programIdeal(doc, 6);
  assert.deepEqual(inv2(curat, ctxDe(reg, 6)), []);
  // O tăiere în schelet (departe de tot) înaintea primei etichete: prinsă; la Z+1, nu e tăiere.
  const inainte = programDinTrasee(traseeIdeale(reg, 6), MONTAJE[0]!, ['G0 X200.000 Y150.000', 'G1 Z-1.000 F300.0', 'G1 X210.000 F1000.0']);
  assert.deepEqual(inv2(inainte, ctxDe(reg, 6)).map((i) => i.mesaj), ['mișcare de tăiere înaintea primei etichete', 'mișcare de tăiere înaintea primei etichete']);
  const sus = programDinTrasee(traseeIdeale(reg, 6), MONTAJE[0]!, ['G0 X200.000 Y150.000', 'G1 Z1.000 F300.0', 'G1 X210.000 F1000.0']);
  assert.deepEqual(inv2(sus, ctxDe(reg, 6)), []);
  const schimba = (din: string, in_: string): Incalcare[] => inv2(curat.replace(din, in_), ctxDe(reg, 6));
  const mesaje = (v: Incalcare[]): string => v.map((i) => i.mesaj).join(' | ');
  assert.match(mesaje(schimba('(e2/e2: cerc, interior, 8 mm)', '(e2/e2: cerc, interior, 8mm)')), /etichetă de nerecunoscut/);
  assert.match(mesaje(schimba('(e2/e2: cerc, interior, 8 mm)', '(e2/e2 cerc interior 8 mm)')), /etichetă de nerecunoscut/);
  assert.match(mesaje(schimba('(e2/e2: cerc, interior, 8 mm)\n', '(e2/e2: cerc, interior, 8 mm) G0 Z5.000\n')), /nu e singură pe linie/);
  assert.match(mesaje(schimba('(e2/e2: cerc, interior, 8 mm)', '(e9/e9: cerc, interior, 8 mm)')), /e9\/e9 nu are tăieturi pe foaia 0/);
  assert.match(mesaje(schimba('(e2/e2: cerc, interior, 8 mm)', '(e2/e2: dreptunghi, interior, 8 mm)')), /e2\/e2 e cerc, nu dreptunghi/);
  assert.match(mesaje(schimba('(e2/e2: cerc, interior, 8 mm)', '(e2/e2: cerc, interior, 9 mm)')), /n-are o operație interior de 9 mm/);
  // Adâncimea scrisă cu virgulă sau cu zecimale rotunjite (8.0004) trece.
  assert.deepEqual(schimba('(e2/e2: cerc, interior, 8 mm)', '(e2/e2: cerc, interior, 8,0004 mm)'), []);
  // Etichetele inversate: mișcările găurii judecate ca piesă (intră în S(e1) = interiorul dreptunghiului) și invers.
  const inv = curat.replace('(e2/e2: cerc, interior, 8 mm)', '(X)').replace('(e1/e1: dreptunghi, exterior, 3 mm)', '(e2/e2: cerc, interior, 8 mm)').replace('(X)', '(e1/e1: dreptunghi, exterior, 3 mm)');
  assert.ok(inv2(inv, ctxDe(reg, 6)).length > 0);
});

test('montajul: același program în document, scris pe cele 4 colțuri și cu Z0 sus/jos, dă aceleași prinderi; citit cu alt colț, altele', () => {
  const doc = pereche(5);
  const reg = regiuneDinDocument(doc);
  const ref = prinse(inv2(programIdeal(doc, 6), ctxDe(reg, 6)));
  for (const m of MONTAJE) {
    const v = inv2(programIdeal(doc, 6, m), ctxDe(reg, 6, m));
    assert.deepEqual([...prinse(v)], [...ref], `${m.origine} ${m.z0}`);
    // Mesajele au coordonatele documentului, oricare ar fi colțul.
    assert.ok(v.some((i) => /lângă X 73\.000/.test(i.mesaj)), `${m.origine} ${m.z0}`);
  }
  // Placa 1 scrisă pentru dreapta-sus, citită ca dreapta-jos: traseele coboară cu 200 mm, iar tăietura găurii ajunge în
  // partea ei proprie (în afara găurii): prinsă. Pe colțul corect, nimic.
  const p1 = PLACA_1();
  const r1 = regiuneDinDocument(p1);
  const scris = programIdeal(p1, 6, { foaie: STOC, origine: 'dreapta-sus', z0: 'sus' });
  assert.deepEqual(inv2(scris, ctxDe(r1, 6, { foaie: STOC, origine: 'dreapta-sus', z0: 'sus' })), []);
  assert.deepEqual([...prinse(inv2(scris, ctxDe(r1, 6, { foaie: STOC, origine: 'dreapta-jos', z0: 'sus' }))).keys()], ['e2/e2']);
  // Z0: perechea prea apropiată, scrisă cu Z0 jos și citită cu Z0 sus, e toată în aer (Z ≥ 15): nimic de judecat aici
  // (adâncimea e treaba invariantei 5); citită corect, prinsă.
  const jos = programIdeal(doc, 6, { foaie: STOC, origine: 'stanga-jos', z0: 'jos' });
  assert.equal(prinse(inv2(jos, ctxDe(reg, 6, { foaie: STOC, origine: 'stanga-jos', z0: 'jos' }))).size, 2);
  assert.deepEqual(inv2(jos, ctxDe(reg, 6, { foaie: STOC, origine: 'stanga-jos', z0: 'sus' })), []);
});

test('doar foaia 0: instanțele suprapuse de pe foaia a doua nu fac inele', () => {
  const d = documentRegiune(STOC, [{ id: 'p', elemente: [{ id: 'e', forma: drept(50, 30), laturi: ['exterior'] }] }],
    [{ id: 'i1', piesa: 'p', x: 50, y: 50 }], { diametru: 6, foaie2: [{ id: 'j1', piesa: 'p', x: 50, y: 50 }, { id: 'j2', piesa: 'p', x: 60, y: 50 }] });
  const reg = regiuneDinDocument(d);
  assert.deepEqual(reg.inele.map((i) => i.idLume), ['i1/e']);
  assert.equal(prezice(reg, 6).verdict, 'curat');
});

// ── A doua metodă pe documente: predicția exactă față de poarta eșantionată ───────────────────────────────────────

test('a doua metodă: pe 160 de așezări aleatoare, poarta (eșantionată) pe traseele ideale prinde exact tăieturile prezise', () => {
  const r = aleator(0x51a7);
  let prinseN = 0, curateN = 0;
  for (let n = 0; n < 160; n++) {
    const D = [3.175, 6, 8][n % 3]!;
    const R = D / 2;
    const unghi = [0, 30, 90, 137][Math.floor(r() * 4)]!;
    const g = 0.2 + r() * 3 * D;
    const rot = (x: number, y: number): [number, number] => {
      const c = Math.cos((unghi * Math.PI) / 180), s = Math.sin((unghi * Math.PI) / 180);
      return [c * x - s * y, s * x + c * y];
    };
    const fel = n % 4;
    let doc: DocV4O;
    if (fel === 0 || fel === 1) {
      const [dx, dy] = rot(60 + g, 5);
      doc = documentRegiune(STOC, [
        { id: 'a', elemente: [{ id: 'e', forma: drept(60, 40, fel === 0 ? 0 : 6), laturi: ['exterior'] }] },
        { id: 'b', elemente: [{ id: 'e', forma: fel === 0 ? drept(30, 30, 3) : cerc(15), matrice: fel === 0 ? ID : tr(15, 15), laturi: ['exterior'] }] },
      ], [{ id: 'A', piesa: 'a', x: 120, y: 60, rotire: unghi }, { id: 'B', piesa: 'b', x: 120 + dx, y: 60 + dy, rotire: unghi }], { diametru: D });
    } else {
      const rg = 25 + r() * 15;
      doc = simple(STOC, [
        { id: 'a', forma: drept(220, 160, 10), x: 40, y: 20, laturi: ['exterior'] },
        { id: 'h', forma: cerc(rg), x: 150, y: 100, laturi: ['interior'] },
        { id: 'i', forma: fel === 2 ? cerc(rg - g) : drept(rg, rg * 0.8), x: fel === 2 ? 150 : 150 - rg / 2, y: fel === 2 ? 100 : 100 - rg * 0.4, laturi: ['exterior'] },
      ], { diametru: D });
    }
    const reg = regiuneDinDocument(doc);
    if (reg.probleme.length) continue;
    const p = prezice(reg, D);
    const m = MONTAJE[n % MONTAJE.length]!;
    const v = prinse(inv2(programIdeal(doc, D, m), ctxDe(reg, D, m)));
    for (const inel of reg.inele) {
      const x = p.patrunderi.find((y) => y.idLume === inel.idLume);
      const pen = x?.patrundere ?? 0;
      // Scriitorul rotunjește la 3 zecimale (capetele ±0.0007, centrul arcului din startul rotunjit ±0.0007): traseul se
      // mută cu cel mult ~0.0014 < 0.002, deci curat pe traseul exact ⇒ curat pe G-code (§6 amendat); prins pe G-code
      // e sigur doar peste ε + 0.002 + 0.0015. Între ele nu se compară.
      if (pen > EPS_REGIUNE + 0.002 + 0.0015) {
        assert.ok(v.has(inel.idLume), `#${n} ${inel.idLume}: prezis ${pen}, poarta n-a prins (${JSON.stringify([...v])})`);
        if (pen < R) egal(v.get(inel.idLume)!.cu, pen, `#${n} ${inel.idLume}`, 0.006);
        prinseN++;
      } else if ((x?.stare ?? 'ok') === 'ok') {
        assert.ok(!v.has(inel.idLume), `#${n} ${inel.idLume}: prezis curat, poarta a prins ${JSON.stringify(v.get(inel.idLume))}`);
        curateN++;
      }
    }
  }
  assert.ok(prinseN > 40 && curateN > 100, `prinse ${prinseN}, curate ${curateN}`);
});

test('corpusul: fiecare document e un v4 valid după oracolul documentului, iar predicția are toate cele trei verdicte', () => {
  const c = corpus();
  const verdicte = new Map<string, number>();
  for (const caz of c) {
    assert.deepEqual(verificaV4(caz.doc), [], caz.nume);
    const v = prezice(regiuneDinDocument(caz.doc), caz.diametru).verdict;
    verdicte.set(v, (verdicte.get(v) ?? 0) + 1);
  }
  assert.ok(c.length >= 150, `${c.length} documente`);
  assert.ok((verdicte.get('refuz') ?? 0) >= 50 && (verdicte.get('curat') ?? 0) >= 50, JSON.stringify([...verdicte]));
});

// ── Lipirea cu aplicația (ADR 0026 §9), în ambele sensuri ─────────────────────────────────────────────────────────

const PREFIX = 'regiunea păstrată:';

type Rezultat = {
  readonly caz: CazCorpus;
  readonly verdict: 'refuz' | 'curat' | 'banda';
  readonly vinovati: readonly string[];
  /** program: textul; refuz: motivul; alt: motivul altui refuz. */
  readonly iesire: { readonly fel: 'program'; readonly text: string } | { readonly fel: 'refuz' | 'alt'; readonly motiv: string };
};

let lipire: Promise<Rezultat[]> | null = null;

/** Rulează aplicația o singură dată pe tot corpusul (plus placa 1 pe toate montajele), cu confirmarea ieșirii din foaie. */
function ruleazaLipirea(): Promise<Rezultat[]> {
  lipire ??= (async () => {
    const { calculeazaExport } = await import('../../src/ui/actiuniExportCalcul.ts');
    type DocApp = Parameters<typeof calculeazaExport>[0];
    const cazuri: CazCorpus[] = [
      ...MONTAJE.map((m) => ({ nume: `placa 1 ${m.origine} ${m.z0}`, familie: 'placa', doc: PLACA_1(), diametru: 6, origine: m.origine, z0: m.z0 })),
      ...corpus(),
    ];
    const rez: Rezultat[] = [];
    for (const caz of cazuri) {
      const p = prezice(regiuneDinDocument(caz.doc), caz.diametru);
      const vinovati = [...p.probleme.flatMap((x) => x.elemente), ...p.patrunderi.filter((x) => x.stare !== 'ok').flatMap((x) => [x.idLume, x.in])];
      const doc = await pentruAplicatie<DocApp>(caz.doc);
      const montaj = { origine: caz.origine, z0: caz.z0 };
      let r = await calculeazaExport(doc, montaj);
      if (!r.ok && 'cereConfirmare' in r && r.cereConfirmare) r = await calculeazaExport(doc, { ...montaj, confirmareIesire: r.cereConfirmare });
      const iesire = r.ok
        ? { fel: 'program' as const, text: r.program.text }
        : { fel: r.motiv.startsWith(PREFIX) ? 'refuz' as const : 'alt' as const, motiv: r.motiv };
      rez.push({ caz, verdict: p.verdict, vinovati, iesire });
    }
    return rez;
  })();
  return lipire;
}

const descrie = (x: Rezultat): string => `[${x.caz.familie}] ${x.caz.nume} (${x.caz.origine}, Z0 ${x.caz.z0}, Ø${x.caz.diametru})`;

/** Poarta întreagă pe programele aplicației, o singură dată: încălcările, pe program. */
let poartaLipirii: Promise<Array<{ readonly x: Rezultat; readonly v: readonly Incalcare[] }>> | null = null;
function poartaPeProgrameleAplicatiei(): Promise<Array<{ readonly x: Rezultat; readonly v: readonly Incalcare[] }>> {
  poartaLipirii ??= ruleazaLipirea().then((rez) => rez.flatMap((x) => {
    if (x.iesire.fel !== 'program') return [];
    const ctx: ContextPoarta = {
      foaie: STOC, origine: x.caz.origine, z0: x.caz.z0, diametruScula: x.caz.diametru, pas: 4, supracursa: 0, asteptareAx: 3,
      regiune: regiuneDinDocument(x.caz.doc),
    };
    return [{ x, v: poarta(x.iesire.text, ctx) }];
  }));
  return poartaLipirii;
}
const raport = (x: Rezultat, v: readonly Incalcare[]): string => `${descrie(x)}: ${v.slice(0, 3).map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('; ')}`;

test('lipire: orice program scris de aplicație trece invarianta 2', async () => {
  const p = await poartaPeProgrameleAplicatiei();
  assert.ok(p.length >= 40, `doar ${p.length} programe`);
  assert.deepEqual(p.flatMap(({ x, v }) => {
    const v2 = v.filter((i) => i.invarianta === 2);
    return v2.length ? [raport(x, v2)] : [];
  }), []);
});

test('lipire: aceleași programe trec și restul porții (1, 3, 5, 6, 7, 8)', async () => {
  const p = await poartaPeProgrameleAplicatiei();
  assert.deepEqual(p.flatMap(({ x, v }) => {
    const alte = v.filter((i) => i.invarianta !== 2 && i.invarianta !== 9);
    return alte.length ? [raport(x, alte)] : [];
  }), []);
});

test('lipire: orice document prezis în încălcare (pătrundere > ε pe offsetul ideal, inele care se ating, ambele laturi) e refuzat cu „regiunea păstrată:”', async () => {
  const rez = await ruleazaLipirea();
  const rele = rez.filter((x) => x.verdict === 'refuz' && x.iesire.fel === 'program').map(descrie);
  assert.deepEqual(rele, []);
});

test('lipire: orice refuz „regiunea păstrată:” are încălcarea găsită de oracol și numește un element vinovat', async () => {
  const rez = await ruleazaLipirea();
  const rele: string[] = [];
  for (const x of rez) {
    if (x.iesire.fel !== 'refuz') continue;
    if (x.verdict === 'curat') rele.push(`${descrie(x)}: refuz fără încălcare: ${x.iesire.motiv}`);
    else if (!x.vinovati.some((id) => x.iesire.fel === 'refuz' && x.iesire.motiv.includes(id))) {
      rele.push(`${descrie(x)}: motivul nu numește ${[...new Set(x.vinovati)].join(', ')}: ${x.iesire.motiv}`);
    }
  }
  assert.deepEqual(rele, []);
});

test('lipire: celelalte refuzuri (scula nu încape etc.) sunt rare și nu ascund nimic; corpusul are ambele feluri de rezultate', async () => {
  const rez = await ruleazaLipirea();
  const alte = rez.filter((x) => x.iesire.fel === 'alt');
  assert.ok(alte.length <= rez.length / 10, alte.map((x) => `${descrie(x)}: ${x.iesire.fel === 'alt' ? x.iesire.motiv : ''}`).join('\n'));
  const refuzuri = rez.filter((x) => x.iesire.fel === 'refuz').length;
  const programe = rez.filter((x) => x.iesire.fel === 'program').length;
  const banda = rez.filter((x) => x.verdict === 'banda').map((x) => `${x.iesire.fel}`);
  assert.ok(refuzuri >= 50 && programe >= 50, `refuzuri ${refuzuri}, programe ${programe}`);
  // Banda (1e-6, ε]: aplicația poate face oricare; raportul o spune.
  console.log(`lipire: ${rez.length} cazuri, ${programe} programe, ${refuzuri} refuzuri „${PREFIX}”, ${alte.length} alte refuzuri; `
    + `în bandă: ${banda.filter((f) => f === 'program').length} programe, ${banda.filter((f) => f === 'refuz').length} refuzuri`);
});
