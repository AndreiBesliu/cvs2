/**
 * Cremaliera din atelierul Easy 3Draw (ADR 0284, felia 3.Cc), pe plasele reale ale motorului:
 * - o bară lată cât un știft, cu dinți drepți deasupra (profilul de 20° al roților de aici: la linia de divizare dintele
 *   are π·m / 2 − 2 · jocul, capul m, piciorul 1,25·m), câți încap întregi, așezați pe mijlocul piesei;
 * - prinsă pe știfturi (dedesubt e o placă 1 × n) sau cu găuri de știft de-a latul (ca o grindă în picioare);
 * - linia de divizare stă la înălțimea la care axul roții pereche cade pe grilă: gaura unei cărămizi Technic ridicate cu k
 *   plăci (pe știfturi) sau al k-lea rând de găuri de deasupra (cu găuri), cu cel mai mic k la care dinții mai au lemn sub ei;
 * - **angrenarea se judecă pe plase:** roata făcută de motor, pusă cu axul unde spune montajul și rostogolită peste un pas
 *   întreg, nu intră în cremalieră; cu axul coborât, cu cremaliera mutată cu o jumătate de pas sau dincolo de jocul dintre
 *   dinți, intră (deci proba vede pătrunderea, iar jocul e cel de pe hârtie).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, type P3, type Piesa } from './ajutor-plasa-lego.ts';

type Montaj = { lung: number; m: number; z: number; prindere: string; dinti: number; k: number; divizare: number; axa: number; cursa: number; inaltime: number };
const Lm = L as typeof L & { cremalieraMontaj(d: Record<string, unknown>): Montaj };
const crem = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'cremaliera', ...d });
const E = L.efective(), P = L.parametri();
const S = P.pas!, G = P.grinda_groasa!, PLACA = P.placa!, TECH = P.technic_h!, JOC = E.jocDinti!, RG = E.gauraD! / 2, RL = E.lamajD! / 2, HL = P.lamaj_h!;
const TAN = Math.tan(20 * Math.PI / 180);
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const inchisa = (p: Piesa, ce: string) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};

/** Cotele de pe hârtie ale cremalierei. */
function hartie(lung: number, m: number, prindere: string, z: number) {
  const Lx = S * lung - 0.2, t = Math.PI * m / 2 - 2 * JOC, cap = Math.min(m, (t / 2 - 0.1) / TAN), wr = t + 2.5 * m * TAN, p = Math.PI * m;
  const baza = prindere === 'gauri' ? G / 2 : TECH, pas = prindere === 'gauri' ? S : PLACA;
  const minim = (prindere === 'gauri' ? G / 2 + RL + 0.8 : PLACA + 0.5) + 1.25 * m;
  let k = 0;
  while (baza + pas * k - m * z / 2 < minim - 1e-9) k++;
  const zp = baza + pas * k - m * z / 2, N = Math.floor((Lx - wr) / p + 1e-9) + 1;
  return { Lx, t, cap, wr, p, k, zp, zr: zp - 1.25 * m, za: zp + cap, N, centru: (i: number) => Lx / 2 + (i - (N - 1) / 2) * p };
}

test('motorul știe piesa, iar cea implicită e cremaliera 1 × 4 pe știfturi, pentru roata de 8: 10 dinți, înaltă de 6 mm', () => {
  assert.ok(L.tipuri.includes('cremaliera'));
  const p = crem(), h = hartie(4, 1, 'stifturi', 8);
  assert.deepEqual(cote(p), [31.8, 7.8, 6]);
  assert.deepEqual([h.N, h.k, r3(h.zp)], [10, 1, 5]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicită');
  assert.equal(amprentaPlasei(crem({ lung: 4, modul: 1, prindere: 'stifturi', roata: 8 })), amprentaPlasei(p));
  // dinții, numărați pe linia de divizare, la mijlocul lățimii: 10 treceri din gol în lemn
  let dinti = 0, inLemn = false;
  for (let x = 0.01; x < 31.8; x += 0.02) { const acum = plin(p, [x, 3.9, h.zp]); if (acum && !inLemn) dinti++; inLemn = acum; }
  assert.equal(dinti, 10);
});

test('corpul e închis și are cotele de pe hârtie, pe toată plaja de lungimi, module, prinderi și roți', () => {
  let n = 0;
  for (const lung of [2, 3, 4, 7, 12, 24]) for (const m of [1, 1.5, 2]) for (const prindere of ['stifturi', 'gauri']) for (const z of [8, 12, 16, 24, 40]) {
    // lungimile mari și cele impare, doar la modulul 1 și la roțile mici (plasele lor sunt mari, iar forma e aceeași)
    if ((lung === 3 || lung > 7) && (m !== 1 || z > 16)) continue;
    if (z === 12 && m !== 1) continue;
    const p = crem({ lung, modul: m, prindere, roata: z }), h = hartie(lung, m, prindere, z), ce = `1×${lung} m${m} ${prindere} z${z}`;
    // fiecare, ca STL citit de altcineva (prinde și plasa deschisă); volumele pe dos, din patru în patru (proba e grea)
    assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
    if (n % 4 === 0) inchisa(p, ce);
    assert.deepEqual(cote(p), [r3(h.Lx), G, r3(h.za)], ce);
    assert.equal(p.avert.length, 0, ce);
    n++;
  }
  assert.ok(n >= 80, String(n));
  // modulul 0,5: dinții se prind la fel, cu capul scurtat cât să nu iasă ascuțit
  const mic = crem({ lung: 4, modul: 0.5 }), hm = hartie(4, 0.5, 'stifturi', 8);
  inchisa(mic, 'modulul 0,5');
  assert.ok(hm.cap < 0.5 && hm.cap > 0.3);
  assert.deepEqual(cote(mic), [31.8, 7.8, r3(hm.za)]);
});

test('dinții: profilul de 20° pe hârtie, pe toată lățimea, cu golurile până la picior; capetele, plate', () => {
  for (const [lung, m, prindere, z] of [[4, 1, 'stifturi', 8], [5, 1, 'gauri', 16], [3, 2, 'stifturi', 12], [6, 1.5, 'gauri', 20]] as const) {
    const p = crem({ lung, modul: m, prindere, roata: z }), h = hartie(lung, m, prindere, z), ce = `1×${lung} m${m} ${prindere}`;
    for (let i = 0; i < h.N; i++) {
      const xc = h.centru(i);
      for (const y of [0.3, G / 2, G - 0.3]) {
        // jumătatea lățimii dintelui la înălțimea dz față de linia de divizare
        for (const dz of [-1.1 * m, -0.5 * m, 0, 0.5 * h.cap, h.cap - 0.06]) {
          const jum = h.t / 2 - dz * TAN;
          for (const s of [-1, 1]) {
            assert.equal(plin(p, [xc + s * (jum - 0.04), y, h.zp + dz]), true, `${ce}: dintele ${i}, dz ${dz.toFixed(2)}, y ${y}: în dinte`);
            assert.equal(plin(p, [xc + s * (jum + 0.04), y, h.zp + dz]), false, `${ce}: dintele ${i}, dz ${dz.toFixed(2)}, y ${y}: lângă dinte`);
          }
        }
        assert.equal(plin(p, [xc, y, h.za - 0.05]), true, `${ce}: dintele ${i}: sub cap`);
        assert.equal(plin(p, [xc, y, h.za + 0.05]), false, `${ce}: dintele ${i}: deasupra capului`);
      }
      // golul dintre doi dinți coboară până la picior
      if (i + 1 < h.N) {
        const xg = xc + h.p / 2;
        assert.equal(plin(p, [xg, G / 2, h.zr + 0.05]), false, `${ce}: golul ${i}: deasupra piciorului`);
        assert.equal(plin(p, [xg, G / 2, h.zr - 0.05]), true, `${ce}: golul ${i}: sub picior`);
      }
    }
    // dincolo de primul și de ultimul dinte, bara e plată, la picior; dinții încap întregi
    const st = h.centru(0) - h.wr / 2, dr = h.centru(h.N - 1) + h.wr / 2;
    assert.ok(st >= -1e-9 && dr <= h.Lx + 1e-9, `${ce}: dinții încap întregi`);
    assert.ok(st < h.p / 2 + 1e-9, `${ce}: n-ar mai fi încăput un dinte`);
    for (const x of [0.05, h.Lx - 0.05]) {
      assert.equal(plin(p, [x, G / 2, h.zr - 0.05]), true, `${ce}: capătul barei, x ${x}`);
      if (x < st - 0.05 || x > dr + 0.05) assert.equal(plin(p, [x, G / 2, h.zr + 0.05]), false, `${ce}: deasupra capătului barei, x ${x}`);
    }
  }
});

/** Punctele conturului dinților unei roți făcute de motor (fața de jos), față de axul ei. */
function conturRoata(z: number, m: number): { pt: [number, number][]; roata: Piesa; c: [number, number] } {
  const roata = L.construieste({ tip: 'rotita', dinti: z, modul: m, gaura: 'nu', grosime: 4 }), c: [number, number] = [-roata.baza[0]!, -roata.baza[1]!];
  const vazute = new Set<string>(), pt: [number, number][] = [], rf = m * z / 2 - 1.25 * m;
  for (const t of roata.tri) for (const q of t) {
    if (Math.abs(q[2]) > 1e-9) continue;
    const x = q[0] - c[0], y = q[1] - c[1], k = x.toFixed(5) + ',' + y.toFixed(5);
    if (vazute.has(k) || Math.hypot(x, y) < rf - 0.05) continue;
    vazute.add(k); pt.push([x, y]);
  }
  return { pt, roata, c };
}
/** Cât intră roata în cremalieră (și invers), cu axul la (xa, za) și roata rotită cu `fi`: numărul de puncte ale uneia găsite în cealaltă. */
function patrundere(cr: Piesa, h: ReturnType<typeof hartie>, r: ReturnType<typeof conturRoata>, m: number, xa: number, za: number, fi: number): number {
  const co = Math.cos(fi), si = Math.sin(fi);
  let n = 0;
  // punctele roții, în cremalieră (doar cele care coboară până la dinți)
  for (const [gx, gy] of r.pt) {
    const x = xa + gx * co - gy * si, z = za + gx * si + gy * co;
    if (z > h.za + 0.05) continue;
    if (plin(cr, [x, G / 2, z])) n++;
  }
  // punctele dinților cremalierei (profilul de pe hârtie, tras înăuntru cu 0,01), în roată
  for (let i = 0; i < h.N; i++) {
    const xc = h.centru(i);
    if (Math.abs(xc - xa) > 1.6 * h.p) continue;
    for (let j = 0; j <= 12; j++) for (const s of [-1, 1]) {
      const dz = -1.25 * m + (1.25 * m + h.cap) * j / 12, px = xc + s * (h.t / 2 - dz * TAN - 0.01), pz = h.zp + dz - 0.01;
      const dx = px - xa, dzz = pz - za, gx = dx * co + dzz * si, gy = -dx * si + dzz * co;
      if (plin(r.roata, [r.c[0] + gx, r.c[1] + gy, 2] as P3)) n++;
    }
  }
  return n;
}

test('angrenarea, pe plase: roata motorului, cu axul unde spune montajul, se rostogolește pe cremalieră fără să intre în ea', () => {
  for (const [m, prindere, z] of [[1, 'stifturi', 8], [1, 'gauri', 16], [1.5, 'stifturi', 12], [2, 'gauri', 20]] as const) {
    const lung = Math.max(4, Math.ceil(7 * Math.PI * m / S)), cr = crem({ lung, modul: m, prindere, roata: z }), h = hartie(lung, m, prindere, z), r = conturRoata(z, m);
    const ce = `m${m} ${prindere} z${z}`, raza = m * z / 2, za = h.zp + raza, mont = Lm.cremalieraMontaj({ lung, modul: m, prindere, roata: z });
    assert.equal(r3(mont.axa), r3(za), `${ce}: axul din montaj`);
    assert.ok(r.pt.length > 20 * z, `${ce}: conturul roții`);
    // dintele din mijlocul barei; roata cu un gol în jos (dinții ei sunt la k · 2π / z, deci golul e la jumătate de pas unghiular)
    const xt = h.centru(Math.floor(h.N / 2)), fi0 = -Math.PI / 2 - Math.PI / z, pasi = 8;
    for (let j = 0; j <= pasi; j++) {
      // rostogolire fără alunecare: roata se învârte cu d, axul ei se mută cu −raza · d
      const d = (2 * Math.PI / z) * j / pasi;
      assert.equal(patrundere(cr, h, r, m, xt - raza * d, za, fi0 + d), 0, `${ce}: pasul ${j} al rostogolirii`);
      // jocul dintre dinți e 2 · jocul de fiecare parte: înăuntrul lui nu se ating, dincolo de el se pătrund (la începutul,
      // la mijlocul și la capătul pasului)
      if (j % (pasi / 2) === 0) for (const s of [-1, 1]) {
        assert.equal(patrundere(cr, h, r, m, xt - raza * d + s * (2 * JOC - 0.06), za, fi0 + d), 0, `${ce}: pasul ${j}, în joc (${s})`);
        assert.ok(patrundere(cr, h, r, m, xt - raza * d + s * (2 * JOC + 0.12), za, fi0 + d) > 0, `${ce}: pasul ${j}, dincolo de joc (${s})`);
      }
    }
    // martorii: proba vede pătrunderea când trebuie
    assert.ok(patrundere(cr, h, r, m, xt + h.p / 2, za, fi0) > 0, `${ce}: cu o jumătate de pas alături, dinte pe dinte`);
    assert.ok(patrundere(cr, h, r, m, xt, za - 0.25 * m - 0.15, fi0) > 0, `${ce}: cu axul coborât peste jocul de la fund`);
    assert.ok(patrundere(cr, h, r, m, xt + raza * 0.3, za, fi0 + 0.3) > 0, `${ce}: rostogolită în sensul greșit`);
    assert.equal(patrundere(cr, h, r, m, xt, za + 0.5, fi0), 0, `${ce}: cu axul ridicat, liberă`);
    // jocul de la fund, pe hârtie 0,25 · m: cu axul coborât cu mai puțin, tot liberă
    assert.equal(patrundere(cr, h, r, m, xt, za - 0.25 * m + 0.08, fi0), 0, `${ce}: în jocul de la fund`);
  }
});

test('pe știfturi: dedesubt e o placă 1 × n fără știfturi, punct cu punct; dinții pornesc din ea, fără gol', () => {
  for (const lung of [2, 4, 7]) {
    const p = crem({ lung, roata: 8 }), h = hartie(lung, 1, 'stifturi', 8);
    const placa = L.construieste({ tip: 'caramida', celule: Array.from({ length: lung }, (_, i) => [i, 0]), placi: 1, stifturi: false });
    assert.deepEqual(cote(placa), [r3(h.Lx), G, PLACA]);
    let goluri = 0, lemn = 0;
    for (let x = 0.25; x < h.Lx; x += 0.5) for (const y of [0.3, 1.2, 2.4, 3.9, 5.4, 6.6, 7.5]) for (const z of [0.3, 1.1, 1.9]) {
      const a = plin(placa, [x, y, z]), b = plin(p, [x, y, z]);
      assert.equal(b, a, `1×${lung}: la (${x}, ${y}, ${z}) cremaliera e ca placa`);
      if (a) lemn++; else goluri++;
    }
    assert.ok(goluri > 20 * lung && lemn > 20 * lung, `1×${lung}: placa are și goluri, și pereți`);
    // între placă și dinți nu e niciun gol: de la tavanul plăcii până la picior, lemn pe toată lungimea
    for (let x = 0.3; x < h.Lx - 0.2; x += 0.7) for (const z of [PLACA - 0.3, PLACA + 0.01, (PLACA + h.zr) / 2, h.zr - 0.03]) {
      assert.equal(plin(p, [x, G / 2, z]), true, `1×${lung}: lemn la x ${x.toFixed(1)}, z ${z.toFixed(2)}`);
    }
  }
});

test('cu găuri: câte o gaură de știft de-a latul la fiecare pas, cu lamaj pe ambele fețe, la înălțimea găurilor unei grinzi', () => {
  for (const [lung, z] of [[3, 16], [5, 20], [4, 8]] as const) {
    const p = crem({ lung, prindere: 'gauri', roata: z }), h = hartie(lung, 1, 'gauri', z);
    for (let k = 0; k < lung; k++) {
      // în coordonatele piesei: centrul pasului k e la 8k + 3,9 (capetele sunt trase cu 0,1), gaura la jumătatea grosimii grinzii
      const cx = S * k + S / 2 - 0.1, cz = G / 2;
      for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const co = Math.cos(a * Math.PI / 180), si = Math.sin(a * Math.PI / 180);
        for (const y of [HL + 0.2, G / 2, G - HL - 0.2]) {
          assert.equal(plin(p, [cx + (RG - 0.15) * co, y, cz + (RG - 0.15) * si]), false, `1×${lung}: pasul ${k}, ${a}°, y ${y}: în gaură`);
          assert.equal(plin(p, [cx + (RG + 0.15) * co, y, cz + (RG + 0.15) * si]), true, `1×${lung}: pasul ${k}, ${a}°, y ${y}: în perete`);
        }
        for (const y of [HL / 2, G - HL / 2]) {
          assert.equal(plin(p, [cx + (RL - 0.15) * co, y, cz + (RL - 0.15) * si]), false, `1×${lung}: pasul ${k}, ${a}°, y ${y}: în lamaj`);
          assert.equal(plin(p, [cx + (RL + 0.15) * co, y, cz + (RL + 0.15) * si]), true, `1×${lung}: pasul ${k}, ${a}°, y ${y}: lângă lamaj`);
        }
      }
      // deasupra găurii rămâne lemn până la piciorul dinților (cel puțin 0,8 mm peste lamaj)
      assert.ok(h.zr - (cz + RL) >= 0.8 - 1e-9, `1×${lung}: peretele de deasupra găurii`);
      for (const zz of [cz + RL + 0.1, h.zr - 0.05]) assert.equal(plin(p, [cx, G / 2, zz]), true, `1×${lung}: pasul ${k}: lemn deasupra găurii, z ${zz.toFixed(2)}`);
      // între găuri, bara e plină până jos
      if (k + 1 < lung) for (const zz of [0.2, cz, h.zr - 0.1]) assert.equal(plin(p, [cx + S / 2, G / 2, zz]), true, `1×${lung}: între pașii ${k} și ${k + 1}`);
    }
  }
});

test('montajul, pe hârtie: înălțimea liniei de divizare, nivelul, axul roții, cursa pe o rotație; înălțimea piesei', () => {
  // pe știfturi: axul roții în gaura unei cărămizi Technic (5,8 mm) ridicate cu k plăci (3,2 mm)
  const peStifturi: readonly (readonly [number, number, number, number])[] = [[8, 1, 5, 9], [12, 2, 6.2, 12.2], [16, 3, 7.4, 15.4], [20, 3, 5.4, 15.4], [24, 4, 6.6, 18.6], [40, 6, 5, 25]];
  for (const [z, k, zp, axa] of peStifturi) {
    const q = Lm.cremalieraMontaj({ roata: z });
    assert.deepEqual([q.z, q.k, r3(q.divizare), r3(q.axa)], [z, k, zp, axa], `pe știfturi, z ${z}`);
    assert.equal(r3(q.cursa), r3(Math.PI * z));
    assert.equal(r3(q.inaltime), r3(zp + 1));
    assert.deepEqual(cote(crem({ roata: z })), [31.8, 7.8, r3(zp + 1)]);
  }
  // cu găuri: axul roții pe al k-lea rând de găuri (8 mm) de deasupra găurilor cremalierei (la 3,9 mm)
  const cuGauri: readonly (readonly [number, number, number, number])[] = [[8, 2, 15.9, 19.9], [12, 2, 13.9, 19.9], [16, 2, 11.9, 19.9], [20, 2, 9.9, 19.9], [24, 3, 15.9, 27.9], [40, 4, 15.9, 35.9]];
  for (const [z, k, zp, axa] of cuGauri) {
    const q = Lm.cremalieraMontaj({ roata: z, prindere: 'gauri' });
    assert.deepEqual([q.k, r3(q.divizare), r3(q.axa)], [k, zp, axa], `cu găuri, z ${z}`);
    assert.deepEqual(cote(crem({ roata: z, prindere: 'gauri' })), [31.8, 7.8, r3(zp + 1)]);
  }
  // modulul schimbă raza roții: 16 dinți la modulul 1,5 au raza 12
  const q = Lm.cremalieraMontaj({ roata: 16, modul: 1.5 }), h = hartie(4, 1.5, 'stifturi', 16);
  assert.deepEqual([q.m, q.k, r3(q.divizare), r3(q.axa), q.dinti], [1.5, h.k, r3(h.zp), r3(h.zp + 12), h.N]);
  assert.equal(r3(q.cursa), r3(Math.PI * 1.5 * 16));
  assert.equal(Lm.cremalieraMontaj({}).dinti, 10);
  assert.deepEqual([Lm.cremalieraMontaj({ lung: 2 }).dinti, Lm.cremalieraMontaj({ lung: 8 }).dinti], [hartie(2, 1, 'stifturi', 8).N, hartie(8, 1, 'stifturi', 8).N]);
});

test('ce nu se poate se îndreaptă și se spune: lungimea, modulul, roata; o prindere necunoscută e pe știfturi', () => {
  const lung = crem({ lung: 40 });
  assert.deepEqual(cote(lung), [S * 24 - 0.2, 7.8, 6]);
  assert.equal(lung.avert.length, 1);
  assert.match(lung.avert[0]!, /24/);
  const scurt = crem({ lung: 1 });
  assert.deepEqual(cote(scurt), [15.8, 7.8, 6]);
  assert.equal(scurt.avert.length, 1);
  const roata = crem({ roata: 5 });
  assert.equal(amprentaPlasei(roata), amprentaPlasei(crem({ roata: 8 })));
  assert.equal(roata.avert.length, 1);
  assert.match(roata.avert[0]!, /8/);
  assert.equal(crem({ roata: 200 }).avert.length, 1);
  assert.equal(Lm.cremalieraMontaj({ roata: 200 }).z, 80);
  // modulul, la zecimi, între 0,5 și 3
  assert.equal(Lm.cremalieraMontaj({ modul: 1.26 }).m, 1.3);
  assert.equal(Lm.cremalieraMontaj({ modul: 9 }).m, 3);
  assert.equal(Lm.cremalieraMontaj({ modul: 0.1 }).m, 0.5);
  assert.equal(Lm.cremalieraMontaj({ modul: 'x' }).m, 1);
  // prinderea
  assert.equal(amprentaPlasei(crem({ prindere: 'altceva' })), amprentaPlasei(crem({ prindere: 'stifturi' })));
  assert.notEqual(amprentaPlasei(crem({ prindere: 'gauri' })), amprentaPlasei(crem({ prindere: 'stifturi' })));
  assert.equal(Lm.cremalieraMontaj({ prindere: 'altceva' }).prindere, 'stifturi');
  // numerele scrise ca text se citesc; ce nu e număr dă implicitul, fără avertisment
  assert.equal(amprentaPlasei(crem({ lung: '4', roata: '8', modul: '1' })), amprentaPlasei(crem()));
  assert.equal(crem({ lung: 'x', roata: null }).avert.length, 0);
  assert.equal(amprentaPlasei(crem({ lung: 'x', roata: null })), amprentaPlasei(crem()));
});

test('aceeași cerere dă aceeași plasă', () => {
  const a = crem({ lung: 6, modul: 1.5, prindere: 'gauri', roata: 20 }), b = crem({ lung: 6, modul: 1.5, prindere: 'gauri', roata: 20 });
  assert.equal(amprentaPlasei(a), amprentaPlasei(b));
  assert.deepEqual(cote(a), cote(b));
});
