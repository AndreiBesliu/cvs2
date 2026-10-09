/**
 * Urechile pe hârtie (ADR 0028), cele 6 cazuri ale ediției întâi (`scripts/test-urechi-profil.ts` de acolo), măsurate pe
 * IR-ul aplicației. Perimetrul se calculează ANALITIC din formă, decalată cu raza sculei, nu din traseu; din el și din
 * urechile cerute, pe fiecare trecere care traversează:
 *
 *     palier = n·W      flancuri = n·2ℓ      adâncime plină = P − n(W + 2ℓ)      cu S = P/n, ℓ = min(W/2, 0,45·(S − W))
 *
 * Palierele se numără ca ZONE, fiecare exact W. Oracolul independent (`test/oracles/urechi.ts`) face aceleași măsurători
 * pe textul G-code; aici e proba aplicației pe IR, plus refuzurile și rupturile exacte.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profil, type Latura } from '../../src/cam/profil.ts';
import { traseuProfil } from '../../src/cam/traseu.ts';
import { lungimeBucla, noduriProfil, type ParametriUrechi } from '../../src/cam/urechi.ts';
import { conturCerc, conturDreptunghi, type Contur } from '../../src/geom/contur.ts';
import { baleiajArc, type Miscare } from '../../src/ir/ir.ts';

const R = 3;
const REGIM = { zSigur: 5, avans: 1000, avansPlonjare: 300 };
const near = (a: number, b: number, e: number): boolean => Math.abs(a - b) <= e;

const perimDrept = (w: number, h: number, r = 0): number => 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * (r + R);
const perimCerc = (r: number): number => 2 * Math.PI * (r + R);

type Caz = { readonly nume: string; readonly contur: Contur; readonly P: number; readonly n: number; readonly W: number };
const CAZURI: readonly Caz[] = [
  { nume: 'dreptunghi 300×200, 4 urechi de 8', contur: conturDreptunghi(20, 20, 300, 200), P: perimDrept(300, 200), n: 4, W: 8 },
  { nume: 'dreptunghi 300×200, 4 urechi de 6', contur: conturDreptunghi(20, 20, 300, 200), P: perimDrept(300, 200), n: 4, W: 6 },
  { nume: 'ușă 300×200 cu colțuri R40', contur: conturDreptunghi(20, 20, 300, 200, 40), P: perimDrept(300, 200, 40), n: 4, W: 8 },
  { nume: 'cerc R100', contur: conturCerc(200, 200, 100), P: perimCerc(100), n: 4, W: 8 },
  { nume: 'raft 600×100: două urechi pe fiecare latură lungă', contur: conturDreptunghi(20, 20, 600, 100), P: perimDrept(600, 100), n: 4, W: 6 },
  { nume: 'dreptunghi 300×200, 8 urechi', contur: conturDreptunghi(20, 20, 300, 200), P: perimDrept(300, 200), n: 8, W: 6 },
];

/** Trecerile programului: de la plonjarea la −d până la ridicare; lungimile în plan, pe clase de Z. */
type Masura = {
  d: number; plin: number; flanc: number; palier: number; zone: number; celMaiLungPalier: number;
  centre: number[]; pantaRea: number; arceFlanc: number;
};

function masoara(miscari: readonly Miscare[], varf: number, l: number): Masura[] {
  const rez: Masura[] = [];
  let x = 0, y = 0, z = 5;
  let m: Masura | undefined;
  let s = 0, inceputPalier = 0, pePalier = false;
  const inchidePalier = (): void => {
    if (!m || !pePalier) return;
    const lung = s - inceputPalier;
    m.celMaiLungPalier = Math.max(m.celMaiLungPalier, lung);
    m.centre.push((inceputPalier + s) / 2);
    pePalier = false;
  };
  for (const mv of miscari) {
    if (mv.tip === 'rapida') {
      inchidePalier();
      if (mv.la.Z !== undefined && mv.la.Z > 0) m = undefined;
      x = mv.la.X ?? x; y = mv.la.Y ?? y; z = mv.la.Z ?? z;
      continue;
    }
    if (mv.tip !== 'taiere' && mv.tip !== 'arc') continue;
    const x1 = mv.la.X ?? x, y1 = mv.la.Y ?? y, z1 = mv.la.Z ?? z;
    let L: number;
    if (mv.tip === 'arc') {
      const raza = Math.hypot(x - mv.centru.x, y - mv.centru.y);
      L = raza * Math.abs(baleiajArc({ x, y }, { x: x1, y: y1 }, mv.centru, mv.sens === 'trigonometric'));
    } else {
      L = Math.hypot(x1 - x, y1 - y);
    }
    if (L < 1e-12) {
      // Plonjarea: începe o trecere.
      if (z1 < z) {
        m = { d: -z1, plin: 0, flanc: 0, palier: 0, zone: 0, celMaiLungPalier: 0, centre: [], pantaRea: 0, arceFlanc: 0 };
        rez.push(m);
        s = 0;
      }
      x = x1; y = y1; z = z1;
      continue;
    }
    if (!m) throw new Error('tăiere în afara unei treceri');
    if (z === -m.d && z1 === -m.d) {
      inchidePalier();
      m.plin += L;
    } else if (z === -varf && z1 === -varf) {
      if (!pePalier) { m.zone++; inceputPalier = s; pePalier = true; }
      m.palier += L;
    } else {
      inchidePalier();
      m.flanc += L;
      // Flancul e liniar, cu panta (d − vârf) / ℓ, între −vârf și −d.
      const panta = Math.abs(z1 - z) / L;
      m.pantaRea = Math.max(m.pantaRea, Math.abs(panta - (m.d - varf) / l));
      if (Math.min(z, z1) < -m.d - 1e-12 || Math.max(z, z1) > -varf + 1e-12) m.pantaRea = Infinity;
      if (mv.tip === 'arc') m.arceFlanc++;
    }
    s += L;
    x = x1; y = y1; z = z1;
  }
  return rez;
}

const VARF = 1.5;

for (const c of CAZURI) {
  test(`urechile pe hârtie: ${c.nume}`, () => {
    const pr = profil(c.contur, { latura: 'exterior', sens: 'urcare', diametruScula: 2 * R, adancime: 3, pas: 1 });
    assert.ok(pr.ok, pr.ok ? '' : pr.motiv);
    if (!pr.ok) return;
    const u: ParametriUrechi = { numar: c.n, latime: c.W, varf: VARF };
    const tr = traseuProfil(pr.treceri, REGIM, u);
    assert.ok(tr.ok, tr.ok ? '' : tr.motiv);
    if (!tr.ok) return;
    const S = c.P / c.n, h = c.W / 2, l = Math.min(c.W / 2, 0.45 * (S - c.W));
    const vrea = { palier: c.n * c.W, flanc: c.n * 2 * l, plin: c.P - c.n * (c.W + 2 * l) };
    const treceri = masoara(tr.miscari, VARF, l);
    assert.deepEqual(treceri.map((t) => t.d), [1, 2, 3], 'trecerile');
    // Controlul: perimetrul măsurat pe traseu e cel de pe hârtie.
    const contur = pr.treceri[0]?.contururi[0];
    assert.ok(contur && near(lungimeBucla(contur), c.P, 1e-9), `perimetrul ${contur ? lungimeBucla(contur) : '?'} față de ${c.P}`);
    const [t1, ...jos] = treceri;
    assert.ok(t1 && t1.palier === 0 && t1.flanc === 0 && near(t1.plin, c.P, 1e-9), 'trecerea de deasupra vârfului e plină, fără urechi');
    assert.equal(jos.length, 2, 'fixtura chiar are treceri sub vârful urechii');
    for (const t of jos) {
      const et = `trecerea la −${t.d}`;
      assert.ok(near(t.plin + t.flanc + t.palier, c.P, 1e-9), `${et}: totalul ${t.plin + t.flanc + t.palier} = perimetrul ${c.P}`);
      assert.ok(near(t.palier, vrea.palier, 1e-9), `${et}: palier ${t.palier} față de ${vrea.palier}`);
      assert.ok(near(t.flanc, vrea.flanc, 1e-9), `${et}: flancuri ${t.flanc} față de ${vrea.flanc}`);
      assert.ok(near(t.plin, vrea.plin, 1e-9), `${et}: plin ${t.plin} față de ${vrea.plin}`);
      assert.equal(t.zone, c.n, `${et}: ${t.zone} paliere`);
      assert.ok(t.celMaiLungPalier <= c.W + 1e-9, `${et}: un palier de ${t.celMaiLungPalier}`);
      assert.ok(t.pantaRea < 1e-9, `${et}: flancul se abate de la panta (d − vârf)/ℓ cu ${t.pantaRea}`);
      t.centre.forEach((cc, k) => assert.ok(near(cc, (k + 0.5) * S, 1e-9), `${et}: centrul ${k} la ${cc}, nu la ${(k + 0.5) * S}`));
      assert.ok(h + l < S / 2, 'flancurile vecine nu se ating');
    }
  });
}

test('pe arc, flancul e elice: bucata rămâne arc pe același cerc, cu Z (cercul R100)', () => {
  const pr = profil(conturCerc(200, 200, 100), { latura: 'exterior', sens: 'urcare', diametruScula: 6, adancime: 3, pas: 1 });
  assert.ok(pr.ok);
  if (!pr.ok) return;
  const tr = traseuProfil(pr.treceri, REGIM, { numar: 4, latime: 8, varf: VARF });
  assert.ok(tr.ok);
  if (!tr.ok) return;
  const arce = tr.miscari.filter((m): m is Extract<Miscare, { tip: 'arc' }> => m.tip === 'arc');
  assert.ok(arce.length > 0 && arce.every((a) => near(a.centru.x, 200, 1e-9) && near(a.centru.y, 200, 1e-9)), 'arcele au centrul cercului');
  assert.ok(arce.some((a) => a.la.Z !== undefined), 'flancurile sunt arce cu Z (elice)');
  assert.equal(tr.miscari.filter((m) => m.tip === 'taiere' && (m.la.X !== undefined)).length, 0, 'nicio coardă');
});

test('trecerile de deasupra vârfului sunt exact cele fără urechi; o tăietură fără urechi nu se schimbă', () => {
  const pr = profil(conturDreptunghi(20, 20, 100, 60, 5), { latura: 'exterior', sens: 'urcare', diametruScula: 6, adancime: 12, pas: 4 });
  assert.ok(pr.ok);
  if (!pr.ok) return;
  const fara = traseuProfil(pr.treceri, REGIM);
  const cu = traseuProfil(pr.treceri, REGIM, { numar: 4, latime: 8, varf: 10 });
  assert.ok(fara.ok && cu.ok);
  if (!fara.ok || !cu.ok) return;
  // Trecerile la 4 și 8 sunt deasupra vârfului (10): aceleași mișcări, până la plonjarea trecerii la 12.
  const plonjare12 = (m: readonly Miscare[]): number => m.findIndex((x) => x.tip === 'taiere' && x.la.Z === -12);
  const k = plonjare12(fara.miscari);
  assert.ok(k > 0 && plonjare12(cu.miscari) === k);
  assert.deepEqual(cu.miscari.slice(0, k + 1), fara.miscari.slice(0, k + 1));
  assert.notDeepEqual(cu.miscari, fara.miscari);
});

test('pornirea e la adâncime plină, iar toate rupturile sunt în (0, P), cu flancurile despărțite', () => {
  for (const [P, n, W] of [[100, 1, 89.9], [100, 4, 22.5], [1018.85, 4, 8], [50, 100, 0.45], [10, 3, 0.001]] as const) {
    const noduri = noduriProfil(P, { numar: n, latime: W, varf: 1 }, 2);
    assert.ok(Array.isArray(noduri), String(noduri));
    if (!Array.isArray(noduri)) continue;
    assert.deepEqual(noduri[0], { s: 0, z: -2 });
    assert.deepEqual(noduri.at(-1), { s: P, z: -2 });
    for (let i = 1; i < noduri.length; i++) assert.ok(noduri[i]!.s > noduri[i - 1]!.s, `${P}/${n}/${W}: rupturile cresc strict`);
    // Între două urechi rămâne o porțiune la −d de cel puțin 10 % din spațiul dintre paliere.
    const S = P / n;
    for (let k = 0; k + 1 < n; k++) {
      const plin: number = noduri[4 * k + 5]!.s - noduri[4 * k + 4]!.s;
      assert.ok(plin >= 0.1 * (S - W) - 1e-9, `${P}/${n}/${W}: între urechile ${k} și ${k + 1} doar ${plin}`);
    }
  }
});

test('urechile care nu încap (W > 0,9·S) sunt refuzate cu motiv, nu strânse', () => {
  const r = noduriProfil(100, { numar: 4, latime: 22.6, varf: 1 }, 2);
  assert.equal(typeof r, 'string');
  assert.match(String(r), /urechile nu încap: 4 urechi de 22.6 mm pe o buclă de 100.00 mm/);
  assert.ok(Array.isArray(noduriProfil(100, { numar: 4, latime: 22.5, varf: 1 }, 2)), 'exact 0,9·S încape');
  // Prin traseu: o gaură mică cu urechi lungi.
  const pr = profil(conturCerc(50, 50, 10), { latura: 'interior', sens: 'urcare', diametruScula: 6, adancime: 3, pas: 3 });
  assert.ok(pr.ok);
  if (!pr.ok) return;
  const tr = traseuProfil(pr.treceri, REGIM, { numar: 4, latime: 10, varf: 1 });
  assert.equal(tr.ok, false);
  if (!tr.ok) assert.match(tr.motiv, /urechile nu încap/);
});

test('o ruptură lângă un vârf (sub 1e-6) e chiar vârful: nicio bucată degenerată, cota rupturii pe vârf', () => {
  // Dreptunghiul 98×102 pe linie: vârfurile la s = 0, 98, 200, 298, 400. O ureche (S = 400, centrul la 200) cu W = 98:
  // h = ℓ = 49, deci rupturile la 102, 151, 249 și 298, ultima exact pe vârful (0, 102). Cu W = 98 ± 1e-7, ea cade la
  // 1e-7 de vârf, deci tot pe el: flancul se termină pe vârf, la −d, iar latura de după rămâne la −d, fără Z.
  const pr = profil(conturDreptunghi(0, 0, 98, 102), { latura: 'pe-linie', sens: 'urcare', diametruScula: 6, adancime: 2, pas: 2 });
  assert.ok(pr.ok);
  if (!pr.ok) return;
  for (const W of [98, 98 + 1e-7, 98 - 1e-7]) {
    const tr = traseuProfil(pr.treceri, REGIM, { numar: 1, latime: W, varf: 1 });
    assert.ok(tr.ok);
    if (!tr.ok) continue;
    const taieri = tr.miscari.filter((m): m is Extract<Miscare, { tip: 'taiere' }> => m.tip === 'taiere' && m.la.X !== undefined);
    let x = 0, y = 0;
    for (const m of taieri) {
      assert.ok(Math.hypot((m.la.X ?? x) - x, (m.la.Y ?? y) - y) > 1e-6, `W = ${W}: o bucată degenerată`);
      x = m.la.X ?? x; y = m.la.Y ?? y;
    }
    const k = taieri.findIndex((m) => m.la.X === 0 && m.la.Y === 102);
    assert.ok(k > 0, `W = ${W}: vârful (0, 102) e capătul unei mișcări`);
    assert.equal(taieri[k]?.la.Z, -2, `W = ${W}: flancul se termină pe vârf, la −d`);
    assert.equal(taieri.length, k + 2, `W = ${W}: după vârf, o singură latură până la pornire`);
    assert.equal(taieri[k + 1]?.la.Z, undefined, `W = ${W}: latura de după vârf rămâne la −d, fără Z`);
  }
});

test('urechile pe toate laturile: exterior, interior, pe linie; și în ambele sensuri', () => {
  const laturi: readonly Latura[] = ['exterior', 'interior', 'pe-linie'];
  for (const latura of laturi) {
    for (const sens of ['urcare', 'opozitie'] as const) {
      const pr = profil(conturCerc(100, 100, 50), { latura, sens, diametruScula: 6, adancime: 3, pas: 1 });
      assert.ok(pr.ok);
      if (!pr.ok) continue;
      const P = lungimeBucla(pr.treceri[0]!.contururi[0]!);
      const tr = traseuProfil(pr.treceri, REGIM, { numar: 3, latime: 8, varf: VARF });
      assert.ok(tr.ok, tr.ok ? '' : tr.motiv);
      if (!tr.ok) continue;
      const S = P / 3, l = Math.min(4, 0.45 * (S - 8));
      const t = masoara(tr.miscari, VARF, l).filter((x) => x.d > VARF);
      assert.equal(t.length, 2);
      for (const x of t) {
        assert.ok(near(x.palier, 24, 1e-9) && x.zone === 3, `${latura}/${sens}: palier ${x.palier}, ${x.zone} zone`);
        assert.ok(near(x.flanc, 6 * l, 1e-9), `${latura}/${sens}: flanc ${x.flanc}`);
      }
    }
  }
});

test('urechi foarte înguste: bucățile sub 1e-6 mm sunt linii, nu arce citite ca cercul întreg (recenzia 2.4)', () => {
  // Colțurile R10 ale plăcii 2, decalate cu R3 (R13): la W = 1e-11, rupturile cad la 1e-11 una de alta pe arc.
  for (const [contur, n] of [[conturDreptunghi(50, 50, 120, 80, 10), 2], [conturDreptunghi(50, 50, 120, 80, 10), 6], [conturCerc(200, 200, 100), 4]] as const) {
    const pr = profil(contur, { latura: 'exterior', sens: 'urcare', diametruScula: 6, adancime: 12, pas: 4 });
    assert.ok(pr.ok);
    if (!pr.ok) continue;
    const P = lungimeBucla(pr.treceri[0]!.contururi[0]!);
    for (const W of [1e-11, 1e-10, 2e-10, 1e-8]) {
      const tr = traseuProfil(pr.treceri, REGIM, { numar: n, latime: W, varf: 10 });
      assert.ok(tr.ok, tr.ok ? '' : tr.motiv);
      if (!tr.ok) continue;
      const S = P / n, l = Math.min(W / 2, 0.45 * (S - W));
      for (const t of masoara(tr.miscari, 10, l)) {
        assert.ok(near(t.plin + t.flanc + t.palier, P, 1e-6), `n = ${n}, W = ${W}, trecerea la −${t.d}: ${t.plin + t.flanc + t.palier} față de ${P}`);
      }
    }
  }
});

test('flancul care coboară: pe verticală, cel mult avansul de plonjare; restul buclei, cu avansul de tăiere (recenzia 2.4)', () => {
  const cazuri: ReadonlyArray<readonly [Contur, Latura, number, number]> = [
    [conturDreptunghi(50, 50, 120, 80, 10), 'exterior', 8, 2], [conturDreptunghi(50, 50, 120, 80, 10), 'exterior', 6, 6],
    [conturCerc(100, 100, 20), 'interior', 24, 2], [conturCerc(200, 200, 100), 'exterior', 8, 2],
  ];
  for (const [contur, latura, W, g] of cazuri) {
    const pr = profil(contur, { latura, sens: 'urcare', diametruScula: 6, adancime: 12, pas: 4 });
    assert.ok(pr.ok);
    if (!pr.ok) continue;
    const tr = traseuProfil(pr.treceri, REGIM, { numar: 4, latime: W, varf: 12 - g });
    assert.ok(tr.ok, tr.ok ? '' : tr.motiv);
    if (!tr.ok) continue;
    let x = 0, y = 0, z = 5, coborari = 0;
    for (const m of tr.miscari) {
      if (m.tip === 'rapida') { x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z; continue; }
      if (m.tip !== 'taiere' && m.tip !== 'arc') continue;
      const x1 = m.la.X ?? x, y1 = m.la.Y ?? y, z1 = m.la.Z ?? z;
      const L = m.tip === 'arc'
        ? Math.hypot(x - m.centru.x, y - m.centru.y) * Math.abs(baleiajArc({ x, y }, { x: x1, y: y1 }, m.centru, m.sens === 'trigonometric'))
        : Math.hypot(x1 - x, y1 - y);
      const et = `${latura} W ${W} g ${g}`;
      if (L > 1e-12 && z1 < z) {
        // Flancul care coboară: viteza pe verticală = F·|ΔZ| / L₃.
        coborari++;
        const vert = (m.avans * (z - z1)) / Math.hypot(L, z1 - z);
        assert.ok(vert <= REGIM.avansPlonjare + 1e-9, `${et}: ${vert} mm/min pe verticală`);
        assert.ok(m.avans <= REGIM.avans);
      } else if (L > 1e-12) {
        assert.equal(m.avans, REGIM.avans, `${et}: o mișcare care nu coboară merge cu avansul de tăiere`);
      }
      x = x1; y = y1; z = z1;
    }
    const traverseaza = pr.treceri.filter((t) => t.adancime > 12 - g).length;
    assert.equal(coborari, 4 * traverseaza, `${latura} W ${W} g ${g}: un flanc care coboară pe ureche, pe fiecare trecere care traversează`);
  }
});
