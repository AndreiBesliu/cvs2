import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conturFaraCubice } from '../../src/geom/biarce.ts';
import { arc, cerculArcului, inverseaza, LINIE, segment, type Contur, type Punct, type Varf } from '../../src/geom/contur.ts';
import { distantaLaContur } from '../../src/geom/distanta.ts';
import { offsetDeschis, verificaIesireDeschisa, type RezultatOffsetDeschis } from '../../src/geom/offset.ts';

/**
 * Offsetul deschis (ADR 0037 §5, felia 2.3c-4): valorile pe hârtie de la „Valorile pe hârtie”, la nivel de geometrie, și
 * refuzurile. Oracolul independent (după contract) vine separat; testele astea sunt ale autorului.
 */

const aproape = (a: number, b: number, tol: number, ce: string): void => {
  assert.ok(Math.abs(a - b) <= tol, `${ce}: ${a} față de ${b} (toleranța ${tol})`);
};
const linii = (...p: ReadonlyArray<readonly [number, number]>): Contur => ({
  inchis: false,
  varfuri: p.map(([x, y]) => ({ p: { x, y }, s: LINIE })),
});
const puncte = (c: Contur): Array<[number, number]> => c.varfuri.map((v) => [v.p.x, v.p.y]);

function bun(r: RezultatOffsetDeschis): Extract<RezultatOffsetDeschis, { ok: true }> {
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  return r;
}
function egalePuncte(c: Contur, astept: ReadonlyArray<readonly [number, number]>, tol = 1e-9): void {
  assert.equal(c.varfuri.length, astept.length, `vârfurile: ${JSON.stringify(puncte(c))}`);
  astept.forEach(([x, y], i) => {
    aproape(c.varfuri[i]?.p.x ?? NaN, x, tol, `x${i}`);
    aproape(c.varfuri[i]?.p.y ?? NaN, y, tol, `y${i}`);
  });
}

test('linia (10,50)→(110,50): stânga (d > 0) la Y53, dreapta la Y47, în sensul desenului, fără perete neatins', () => {
  const l = linii([10, 50], [110, 50]);
  const st = bun(offsetDeschis(l, 3));
  assert.equal(st.bucati.length, 1);
  egalePuncte(st.bucati[0] as Contur, [[10, 53], [110, 53]]);
  assert.equal(st.bucati[0]?.inchis, false);
  assert.deepEqual(st.neatins, []);
  const dr = bun(offsetDeschis(l, -3));
  egalePuncte(dr.bucati[0] as Contur, [[10, 47], [110, 47]]);
});

test('semicercul R50 trigonometric (50,0)→(−50,0): stânga = spre centru, R47; dreapta R53; rămâne arc', () => {
  const s: Contur = { inchis: false, varfuri: [{ p: { x: 50, y: 0 }, s: arc(1) }, { p: { x: -50, y: 0 }, s: LINIE }] };
  for (const [d, r] of [[3, 47], [-3, 53]] as const) {
    const k = bun(offsetDeschis(s, d)).bucati;
    assert.equal(k.length, 1);
    egalePuncte(k[0] as Contur, [[r, 0], [-r, 0]]);
    const seg = segment(k[0] as Contur, 0);
    assert.ok(seg.s.tip === 'A');
    aproape(cerculArcului(seg.a, seg.b, seg.s.bulge).raza, r, 1e-9, 'raza');
    aproape(seg.s.bulge, 1, 1e-12, 'bulge');
  }
});

test('L-ul (0,0)→(100,0)→(100,100): dreapta ocolește colțul convex cu arcul R3; stânga lasă colțul concav (6 mm neatinși)', () => {
  const L = linii([0, 0], [100, 0], [100, 100]);
  const dr = bun(offsetDeschis(L, -3));
  egalePuncte(dr.bucati[0] as Contur, [[0, -3], [100, -3], [103, 0], [103, 100]]);
  assert.deepEqual(dr.bucati[0]?.varfuri.map((v) => v.s.tip), ['L', 'A', 'L', 'L']);
  const s1 = dr.bucati[0]?.varfuri[1]?.s;
  assert.ok(s1?.tip === 'A');
  aproape(s1.bulge, Math.tan(Math.PI / 8), 1e-12, 'arcul de 90° trigonometric');
  assert.deepEqual(dr.neatins, []);
  const st = bun(offsetDeschis(L, 3));
  egalePuncte(st.bucati[0] as Contur, [[0, 3], [97, 3], [97, 100]]);
  // Colțul concav dinspre sculă: punctele ideale sunt invalide pe R de fiecare parte a vârfului (ADR 0037 §5, `neatins`).
  // Marginile poartă marja de validitate a contractului (|d| − 1e-5), deci se compară la 1e-4.
  assert.equal(st.neatins.length, 1);
  const n = st.neatins[0];
  assert.ok(n);
  aproape(n.de, 97, 1e-4, 'de');
  aproape(n.pana, 103, 1e-4, 'până');
  aproape(n.lungime, 6, 1e-4, 'lungimea');
  aproape(n.la.x, 100, 1e-6, 'locul x');
  aproape(n.la.y, 0, 1e-6, 'locul y');
});

test('cârligul (0,0)→(50,0)→(50,2)→(45,2), stânga: o bucată până la x = 45 − 2√2; peretele neatins 14,828 mm', () => {
  const r = bun(offsetDeschis(linii([0, 0], [50, 0], [50, 2], [45, 2]), 3));
  assert.equal(r.bucati.length, 1);
  egalePuncte(r.bucati[0] as Contur, [[0, 3], [45 - 2 * Math.SQRT2, 3]], 1e-7);
  assert.equal(r.neatins.length, 1);
  // 5 + 2√2 pe prima latură, plus 2 și 5: toată coada căii, de la x = 45 − 2√2.
  aproape(r.neatins[0]?.lungime ?? NaN, 12 + 2 * Math.SQRT2, 1e-4, 'lungimea');
  aproape(r.neatins[0]?.lungime ?? NaN, 14.828, 5e-4, 'pe hârtie');
  aproape(r.neatins[0]?.pana ?? NaN, 57, 1e-9, 'până la capătul căii');
});

test('U-ul de 5 mm: cu scula înăuntru, refuz „nu încape”; în afară, 6 vârfuri, colțurile convexe ca arce R3', () => {
  const U = linii([0, 50], [0, 0], [5, 0], [5, 50]);
  const st = offsetDeschis(U, 3);
  assert.deepEqual(st, { ok: false, motiv: 'scula nu încape pe partea cerută' });
  const dr = bun(offsetDeschis(U, -3));
  egalePuncte(dr.bucati[0] as Contur, [[-3, 50], [-3, 0], [0, -3], [5, -3], [8, 0], [8, 50]]);
  assert.deepEqual(dr.bucati[0]?.varfuri.map((v) => v.s.tip), ['L', 'A', 'L', 'A', 'L', 'L']);
});

test('canelura cât freza (U de 6 mm, scula înăuntru): traseul dus-întors pe x = 3 se acceptă (ADR 0037 §5)', () => {
  const r = bun(offsetDeschis(linii([0, 50], [0, 0], [6, 0], [6, 50]), 3));
  assert.equal(r.bucati.length, 1);
  egalePuncte(r.bucati[0] as Contur, [[3, 50], [3, 3], [3, 50]]);
  // Colțurile de jos rămân netăiate pe câte R de fiecare parte; mijlocul fundului e atins doar într-un punct.
  aproape(r.neatins.reduce((s, n) => s + n.lungime, 0), 12, 1e-3, 'neatins');
});

test('V-ul de 10°, scula înăuntru: centrul se oprește la R / sin 5° de vârf; peretele neatins 34,290 mm pe fiecare latură', () => {
  const s5 = Math.sin((5 * Math.PI) / 180), c5 = Math.cos((5 * Math.PI) / 180);
  const r = bun(offsetDeschis(linii([-100 * s5, 100 * c5], [0, 0], [100 * s5, 100 * c5]), 3));
  assert.equal(r.bucati.length, 1);
  const v = r.bucati[0]?.varfuri ?? [];
  assert.equal(v.length, 3);
  aproape(v[1]?.p.x ?? NaN, 0, 1e-9, 'pe bisectoare');
  aproape(v[1]?.p.y ?? NaN, 3 / s5, 1e-9, 'R / sin 5°');
  aproape(3 / s5, 34.421, 5e-4, 'pe hârtie');
  assert.equal(r.neatins.length, 1);
  // Marja de validitate (1e-5) se întinde pe pana îngustă: 1e-5 / sin 10° pe fiecare latură, ~1,2e-4 în total.
  aproape(r.neatins[0]?.lungime ?? NaN, (2 * 3) / Math.tan((5 * Math.PI) / 180), 2e-4, 'neatins');
  aproape((r.neatins[0]?.lungime ?? NaN) / 2, 34.290, 5e-4, 'pe fiecare latură');
  aproape(r.neatins[0]?.la.x ?? NaN, 0, 1e-6, 'în vârf');
  aproape(r.neatins[0]?.la.y ?? NaN, 0, 1e-6, 'în vârf');
});

test('arcul R5 de 300° din coarde de 0,02 mm, decalat 1,5 mm spre exterior: corect sau „offsetul a eșuat”, niciodată „nu încape”', () => {
  const n = Math.round((5 * (5 * Math.PI) / 3) / 0.02);
  const varfuri: Varf[] = Array.from({ length: n + 1 }, (_, k) => {
    const u = ((5 * Math.PI) / 3) * (k / n);
    return { p: { x: 5 * Math.cos(u), y: 5 * Math.sin(u) }, s: LINIE };
  });
  const r = offsetDeschis({ inchis: false, varfuri }, -1.5);
  if (!r.ok) {
    assert.match(r.motiv, /^offsetul a eșuat lângă \(/);
    return;
  }
  assert.equal(r.bucati.length, 1);
  let lungime = 0;
  const b = r.bucati[0] as Contur;
  for (let i = 0; i + 1 < b.varfuri.length; i++) lungime += Math.hypot((b.varfuri[i + 1] as Varf).p.x - (b.varfuri[i] as Varf).p.x, (b.varfuri[i + 1] as Varf).p.y - (b.varfuri[i] as Varf).p.y);
  aproape(lungime, 6.5 * ((5 * Math.PI) / 3), 0.05, 'lungimea pe hârtie (34,03 mm)');
});

test('arcul de 270° (bulge tan 67,5°): se împarte, dar rămâne pe cerc; spre interior R3, spre exterior R7', () => {
  const c: Contur = { inchis: false, varfuri: [{ p: { x: 5, y: 0 }, s: arc(Math.tan((3 * Math.PI) / 8)) }, { p: { x: 0, y: -5 }, s: LINIE }] };
  for (const [d, raza] of [[2, 3], [-2, 7]] as const) {
    const k = bun(offsetDeschis(c, d)).bucati;
    assert.equal(k.length, 1);
    const b = k[0] as Contur;
    aproape(b.varfuri[0]?.p.x ?? NaN, raza, 1e-9, 'startul pe normala capătului');
    aproape(b.varfuri.at(-1)?.p.y ?? NaN, -raza, 1e-9, 'capătul pe normala lui');
    let baleiaj = 0;
    for (let i = 0; i + 1 < b.varfuri.length; i++) {
      const s = segment(b, i);
      assert.ok(s.s.tip === 'A');
      const cerc = cerculArcului(s.a, s.b, s.s.bulge);
      aproape(cerc.raza, raza, 1e-9, 'raza');
      aproape(Math.hypot(cerc.centru.x, cerc.centru.y), 0, 1e-9, 'centrul');
      baleiaj += cerc.baleiaj;
    }
    aproape(baleiaj, (3 * Math.PI) / 2, 1e-9, 'baleiajul total');
  }
});

test('o cale prin biarce (S-ul unei cubice): fără contacte false la joncțiunile tangente, ambele părți, la |d| peste tot', () => {
  const cub: Contur = { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 40, y: 0 }, c2: { x: 20, y: 40 } } }, { p: { x: 60, y: 40 }, s: LINIE }] };
  const b = conturFaraCubice(cub, 0.001);
  assert.ok(b.ok, b.ok ? '' : b.motiv);
  assert.equal(b.contur.inchis, false);
  for (const d of [2, -2, 3.175, -3.175]) {
    const r = bun(offsetDeschis(b.contur, d));
    for (const k of r.bucati) {
      for (const v of k.varfuri) aproape(distantaLaContur(v.p, b.contur), Math.abs(d), 2e-3, `d = ${d}`);
    }
  }
});

test('bucățile ies ordonate de-a lungul căii, fiecare în sensul desenului; camera închisă de strangulare e o buclă', () => {
  // Un canal de 10 mm cu o strangulare de 4 mm la mijloc, scula înăuntru: freza nu trece pe sub strangulare. În camera din
  // dreapta, freza ocolește tot și se întoarce în start (precizarea 2.3c-4 a ADR 0037 §5): o bucată cu capătul în start.
  const c = linii([0, 0], [100, 0], [100, 10], [52, 10], [52, 4], [48, 4], [48, 10], [0, 10]);
  const r = bun(offsetDeschis(c, 3));
  assert.equal(r.bucati.length, 2);
  const bucla = r.bucati[1] as Contur;
  egalePuncte({ inchis: false, varfuri: [bucla.varfuri[0] as Varf] }, [[55 - 0.17157287525381, 3]], 1e-9);
  aproape(Math.hypot((bucla.varfuri.at(-1) as Varf).p.x - (bucla.varfuri[0] as Varf).p.x, (bucla.varfuri.at(-1) as Varf).p.y - (bucla.varfuri[0] as Varf).p.y), 0, 1e-9, 'capătul în start');
  const pozitie = (p: Punct): number => {
    // Poziția pe cale a celui mai apropiat punct (doar linii aici).
    let best = Infinity, s0 = 0, rez = 0;
    for (let i = 0; i + 1 < c.varfuri.length; i++) {
      const a = (c.varfuri[i] as Varf).p, b = (c.varfuri[i + 1] as Varf).p;
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (l * l)));
      const d = Math.hypot(p.x - a.x - t * (b.x - a.x), p.y - a.y - t * (b.y - a.y));
      if (d < best - 1e-9) { best = d; rez = s0 + t * l; }
      s0 += l;
    }
    return rez;
  };
  let ultima = -Infinity;
  for (const k of r.bucati) {
    const a = pozitie((k.varfuri[0] as Varf).p), b = pozitie((k.varfuri.at(-1) as Varf).p);
    assert.ok(a <= b + 1e-6, `bucata merge invers: ${a} → ${b}`);
    assert.ok(a >= ultima - 1e-6, 'bucățile nu sunt în ordinea căii');
    ultima = a;
  }
});

test('refuzurile intrării: închis, distanța sub rezoluție, cubica, degenerata, scurtă, încrucișarea și capetele în același punct', () => {
  const motiv = (r: RezultatOffsetDeschis): string => (r.ok ? 'ok' : r.motiv);
  assert.equal(motiv(offsetDeschis({ ...linii([0, 0], [10, 0], [10, 10]), inchis: true }, 3)), 'offsetul deschis cere o cale deschisă');
  assert.match(motiv(offsetDeschis(linii([0, 0], [10, 0]), 0.004)), /sub rezoluția declarată/);
  assert.match(motiv(offsetDeschis(linii([0, 0], [10, 0]), 0)), /sub rezoluția declarată/);
  assert.match(motiv(offsetDeschis(linii([0, 0], [10, 0]), Number.NaN)), /nu e un număr finit/);
  assert.match(motiv(offsetDeschis({ inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 1, y: 1 }, c2: { x: 2, y: 1 } } }, { p: { x: 3, y: 0 }, s: LINIE }] }, 1)), /cubică/);
  assert.match(motiv(offsetDeschis(linii([0, 0], [0, 0]), 1)), /mai puțin de două vârfuri distincte/);
  assert.match(motiv(offsetDeschis(linii([0, 0], [0.005, 0]), 1)), /mai scurtă decât rezoluția/);
  const alege = /după încrucișare partea nu mai e definită: alege pe linie/;
  assert.match(motiv(offsetDeschis(linii([0, 0], [10, 10], [10, 0], [0, 10]), 1)), alege);
  assert.match(motiv(offsetDeschis(linii([0, 0], [50, 0], [50, 50], [0, 0]), 3)), alege);
  // Capătul pe altă parte a căii (un T): tot încrucișare.
  assert.match(motiv(offsetDeschis(linii([0, 0], [100, 0], [100, 10], [50, 10], [50, 0]), 3)), alege);
});

test('ce se curăță la intrare: vârful repetat, vârful pe latură și arcul plat nu schimbă traseul; capetele nu se mută', () => {
  const curata = bun(offsetDeschis(linii([0, 0], [50, 0], [100, 0]), 3));
  egalePuncte(curata.bucati[0] as Contur, [[0, 3], [100, 3]]);
  // Segmentele sub 1e-6 mm se unesc fără să mute capetele: rămâne linia (0,0)→(100, 1e-8), înclinată cu 1e-10 rad.
  const repetat = bun(offsetDeschis(linii([0, 0], [1e-8, 0], [100, 0], [100, 1e-8]), 3));
  const k = repetat.bucati[0] as Contur;
  assert.equal(k.varfuri.length, 2);
  aproape(Math.hypot(k.varfuri[0]?.p.x ?? NaN, k.varfuri[0]?.p.y ?? NaN), 3, 1e-12, 'startul pe normala capătului (0,0)');
  aproape(Math.hypot((k.varfuri.at(-1)?.p.x ?? NaN) - 100, (k.varfuri.at(-1)?.p.y ?? NaN) - 1e-8), 3, 1e-12, 'capătul pe normala lui');
  const plat: Contur = { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: arc(1e-9) }, { p: { x: 100, y: 0 }, s: LINIE }] };
  egalePuncte(bun(offsetDeschis(plat, -3)).bucati[0] as Contur, [[0, -3], [100, -3]]);
});

test('verificarea ieșirii prinde, fiecare singură: partea greșită, atingerile, acoperirea lipsă, ieșirea goală falsă', () => {
  const l = linii([10, 50], [110, 50]);
  const problema = (b: Contur[]): string | null => verificaIesireDeschisa(l, 3, b).problema;
  assert.equal(problema([linii([10, 53], [110, 53])]), null);
  // O bucată în plus pe partea cealaltă, cu picioarele în interiorul segmentului: distanța și acoperirea sunt bune; doar
  // regula interiorului o prinde.
  assert.match(problema([linii([10, 53], [110, 53]), linii([30, 47], [90, 47])]) ?? '', /partea greșită/);
  // Două bucăți suprapuse pe aceeași parte; apoi o bucată care se suprapune pe ea însăși în același sens.
  assert.match(problema([linii([10, 53], [110, 53]), linii([50, 53], [60, 53])]) ?? '', /se ating/);
  // Întoarsă pe drum, o bucată merge în sens invers (verificarea sensului, recenzia B).
  assert.match(problema([linii([10, 53], [70, 53], [40, 53], [110, 53])]) ?? '', /sens invers/);
  // Bucla camerei (canalul cu strangulare) prelungită înainte peste propriul start: totul merge înainte, la |d|, pe partea
  // cerută, dar bucata se suprapune pe ea însăși; doar verificarea atingerilor o prinde.
  const canal = linii([0, 0], [100, 0], [100, 10], [52, 10], [52, 4], [48, 4], [48, 10], [0, 10]);
  const rc = bun(offsetDeschis(canal, 3));
  const bucla = rc.bucati[1] as Contur;
  const prelungita: Contur = { inchis: false, varfuri: [...bucla.varfuri, { p: { x: 56, y: 3 }, s: LINIE }] };
  assert.equal(verificaIesireDeschisa(canal, 3, [rc.bucati[0] as Contur, bucla]).problema, null);
  assert.match(verificaIesireDeschisa(canal, 3, [rc.bucati[0] as Contur, prelungita]).problema ?? '', /se atinge singură/);
  // Jumătate de traseu: acoperirea lipsește chiar după capătul bucății.
  assert.match(problema([linii([10, 53], [60, 53])]) ?? '', /^offsetul a eșuat lângă \(60\.0\d\d, 50\.000\)$/);
  // Ieșirea goală, cu puncte ideale valide: nu e „nu încape”.
  assert.match(problema([]) ?? '', /^offsetul a eșuat lângă \(10\.000, 50\.000\)$/);
  assert.equal(verificaIesireDeschisa(linii([0, 50], [0, 0], [5, 0], [5, 50]), 3, []).problema, 'scula nu încape pe partea cerută');
  // Traseul care ocolește capătul: un arc la R în jurul startului, din capac până pe normală. Distanța e 3 peste tot,
  // partea față de tangentă e bună; doar capacul îl prinde.
  const ocol: Contur = {
    inchis: false,
    varfuri: [
      { p: { x: 10 - 3 / Math.SQRT2, y: 50 + 3 / Math.SQRT2 }, s: arc(-Math.tan(Math.PI / 16)) },
      { p: { x: 10, y: 53 }, s: LINIE }, { p: { x: 110, y: 53 }, s: LINIE },
    ],
  };
  assert.match(problema([ocol]) ?? '', /partea greșită/);
  // L-ul cu scula înăuntru (stânga) și o bucată în plus pe evantaiul colțului convex, care e în dreapta: picioarele cad
  // toate în vârful (100, 0); doar regula vârfului o prinde.
  const L = linii([0, 0], [100, 0], [100, 100]);
  const evantai: Contur = { inchis: false, varfuri: [{ p: { x: 100, y: -3 }, s: arc(Math.tan(Math.PI / 8)) }, { p: { x: 103, y: 0 }, s: LINIE }] };
  assert.equal(verificaIesireDeschisa(L, 3, [linii([0, 3], [97, 3], [97, 100])]).problema, null);
  assert.match(verificaIesireDeschisa(L, 3, [linii([0, 3], [97, 3], [97, 100]), evantai]).problema ?? '', /partea greșită/);
});

test('zig-zag-ul sub sculă: bucata pornește unde cercul startului taie cercul primului vârf (două picioare la egalitate)', () => {
  // Pasul 0,5, amplitudinea 1, scula sub el (dreapta) cu R3: offsetul e făcut din arce în jurul vârfurilor de jos. Primul
  // punct al bucății e la 3 mm și de start, și de vârful (1, 0): pe granița lor, deci corect (precizarea 2.3c-4).
  const z = linii(...Array.from({ length: 41 }, (_, k) => [k * 0.5, k % 2 ? 1 : 0] as const));
  const r = bun(offsetDeschis(z, -3));
  assert.equal(r.bucati.length, 1);
  const p0 = (r.bucati[0] as Contur).varfuri[0] as Varf;
  aproape(p0.p.x, 0.5, 1e-9, 'x');
  aproape(p0.p.y, -Math.sqrt(9 - 0.25), 1e-9, 'y');
  // Egalitatea are o toleranță (1e-6 mm): startul bucății mutat pe cercul startului, cât să fie cu ~δ mai departe de
  // vârful (1, 0) decât de start. La δ = 1e-9 sunt încă la egalitate (corect); la δ = 1e-3 piciorul e doar startul, iar
  // punctul cade în capacul lui (refuz).
  const mutat = (delta: number): Contur => {
    const b = r.bucati[0] as Contur;
    const u = Math.atan2(p0.p.y, p0.p.x) - delta / 0.986;
    return { inchis: false, varfuri: [{ p: { x: 3 * Math.cos(u), y: 3 * Math.sin(u) }, s: p0.s }, ...b.varfuri.slice(1)] };
  };
  const dist = (c: Contur, x: number): number => Math.hypot((c.varfuri[0] as Varf).p.x - x, (c.varfuri[0] as Varf).p.y);
  const aproapeEgal = mutat(1e-9);
  assert.ok(dist(aproapeEgal, 1) - dist(aproapeEgal, 0) > 5e-10, 'mai aproape de start');
  assert.equal(verificaIesireDeschisa(z, -3, [aproapeEgal]).problema, null);
  assert.match(verificaIesireDeschisa(z, -3, [mutat(1e-3)]).problema ?? '', /partea greșită/);
});

// ── Recenzia B (15.10): constatările confirmate, fiecare cu cazul ei ─────────────────────────────────────────────────

test('recenzia B, 1: o frângere de zgomot la joncțiunea tangentă (δ până la 1e-10 rad) e mers drept, pe ambele părți', () => {
  for (const delta of [0, 1e-13, 2e-12, 1e-11, -1e-10, 5e-8]) {
    const capat = { x: 50 + 20 * Math.cos(delta) - 20 * Math.sin(delta), y: 20 * Math.sin(delta) + 20 * Math.cos(delta) };
    const c: Contur = { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: LINIE }, { p: { x: 50, y: 0 }, s: arc(Math.tan(Math.PI / 8)) }, { p: capat, s: LINIE }] };
    for (const d of [3, -3]) assert.ok(offsetDeschis(c, d).ok, `δ = ${delta}, d = ${d}: ${JSON.stringify(offsetDeschis(c, d))}`);
  }
});

test('recenzia B, 1: curba S din biarce, departe de origine (X 2500, Y 1200), pe ambele părți', () => {
  const cub: Contur = { inchis: false, varfuri: [{ p: { x: 2510, y: 1210 }, s: { tip: 'C', c1: { x: 2540, y: 1185 }, c2: { x: 2540, y: 1250 } } }, { p: { x: 2570, y: 1225 }, s: LINIE }] };
  const b = conturFaraCubice(cub, 0.001);
  assert.ok(b.ok);
  if (b.ok) for (const d of [3, -3]) assert.ok(offsetDeschis(b.contur, d).ok, `d = ${d}`);
});

test('recenzia B, 2: o codiță de 1e-6 … 1e-5 mm la un capăt (rotunjirea unui SVG) nu mai dă refuz fals', () => {
  for (const e of [1.2e-6, 2e-6, 3e-6, 8e-6]) {
    for (const u of [30, -70, 120]) {
      const r = (u * Math.PI) / 180;
      const laCapat = linii([0, 0], [50, 0], [50 + e * Math.cos(r), e * Math.sin(r)]);
      const laStart = linii([-e * Math.cos(r), -e * Math.sin(r)], [0, 0], [50, 0]);
      for (const c of [laCapat, laStart]) for (const d of [3, -3]) assert.ok(offsetDeschis(c, d).ok, `e = ${e}, ${u}°, d = ${d}`);
    }
  }
});

test('recenzia B, 3: pe un arc mic cu freză mare, acoperirea se eșantionează pe ideal: golul de 46°–89° e prins', () => {
  const c: Contur = { inchis: false, varfuri: [{ p: { x: 0.05, y: 0 }, s: arc(1) }, { p: { x: -0.05, y: 0 }, s: LINIE }] };
  const R = 12.55;
  const pe = (u: number): Punct => ({ x: R * Math.cos((u * Math.PI) / 180), y: R * Math.sin((u * Math.PI) / 180) });
  const bucata = (u0: number, u1: number): Contur => ({ inchis: false, varfuri: [{ p: pe(u0), s: arc(Math.tan(((u1 - u0) * Math.PI) / 720)) }, { p: pe(u1), s: LINIE }] });
  assert.equal(verificaIesireDeschisa(c, -12.5, [bucata(0, 180)]).problema, null);
  assert.match(verificaIesireDeschisa(c, -12.5, [bucata(0, 46), bucata(89, 180)]).problema ?? '', /^offsetul a eșuat lângă/);
});

test('recenzia B, 4: o bucată întoarsă (în sensul opus desenului) e refuzată, nu tăiată în sensul greșit', () => {
  const L = linii([0, 0], [60, 0], [60, 40]);
  const r = bun(offsetDeschis(L, -3));
  assert.equal(verificaIesireDeschisa(L, -3, r.bucati).problema, null);
  assert.match(verificaIesireDeschisa(L, -3, r.bucati.map(inverseaza)).problema ?? '', /sens invers/);
});

test('recenzia B, 5: polilinia fină (arcul R15 de 270° din coarde de 0,015 mm) nu mai e refuzată cu „se atinge singură”', () => {
  const n = Math.round((15 * 1.5 * Math.PI) / 0.015);
  const c: Contur = { inchis: false, varfuri: Array.from({ length: n + 1 }, (_, k) => ({ p: { x: 15 * Math.cos((1.5 * Math.PI * k) / n), y: 15 * Math.sin((1.5 * Math.PI * k) / n) }, s: LINIE })) };
  for (const d of [0.5, -1.5]) {
    const r = offsetDeschis(c, d);
    // Corect, sau defectul cunoscut al lui cavalier pe poliliniile fine („offsetul a eșuat”, ADR 0037 „Limitele”).
    if (!r.ok) assert.match(r.motiv, /^offsetul a eșuat/, `d = ${d}`);
  }
});

test('recenzia B, 6: o cale foarte lungă (semicercul R100 m) e refuzată repede, cu motiv, nu blochează firul principal', () => {
  const c: Contur = { inchis: false, varfuri: [{ p: { x: 1e5, y: 0 }, s: arc(1) }, { p: { x: -1e5, y: 0 }, s: LINIE }] };
  const t0 = performance.now();
  const r = offsetDeschis(c, 3);
  assert.ok(performance.now() - t0 < 2000);
  assert.ok(!r.ok && /prea lungă pentru verificarea offsetului/.test(r.motiv), JSON.stringify(r));
});
