/**
 * Duza Kort (ADR 0340, felia 3.Cm-7; răspunsul 4a al owner-ului): elicea de barcă într-un tub, ca la remorchere, pe plasele
 * reale. Duza e a doua piesă a elicei de barcă (`piesa: 'duza'`), făcută din aceleași câmpuri (diametrul și paletele dau
 * elicea din ea) plus jocul la vârf, lungimea și urechile:
 * - cotele, pe hârtie: interiorul Ri = R + jocul; lungimea L = max(lungimea · Ø, bucșa + butucul elicei + 1), la zecime în sus;
 *   gura dinspre barcă (jos, pe masă) rotunjită: pe zi = 0,3 · L, raza din interior crește cu f = 0,4 · zi spre masă; peretele
 *   de jos (gulerul, cât o grindă de înalt) gros de tb = 0,08 · Ø (între 1,6 și 4), apoi subțiat până la 1,2 sus; urechile pe
 *   grila axului, la k · 8 mm, cu lamajul în afara gulerului;
 * - corpul e închis, cu volumul pozitiv, pe toată plaja;
 * - elicea încape: pe toată înălțimea paletelor (de la bucșă la vârful butucului), interiorul e cel puțin Ri;
 * - se tipărește fără suport: interiorul gurii se îngustează cu cel mult 0,8 mm pe mm de înălțime (sub 45°), iar exteriorul,
 *   deasupra gulerului, doar scade;
 * - prinderile: găurile de știft ale urechilor, pe grila axului (o grindă de 2k + 1 le leagă, cu axul prin mijloc);
 * - marginile câmpurilor se spun; elicea însăși nu se schimbă (fără `piesa`, aceeași, la octet).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; baza: number[]; avert: string[]; prinderi: { fel: string; p: number[] }[]; tipar?: unknown };
type Duza = { D: number; R: number; joc: number; Ri: number; L: number; zi: number; f: number; tb: number; Rout0: number; k: number; urechi: number; gauri: number; Hh: number; sus: number; avert: string[] };
type Lego = {
  construieste(d: Record<string, unknown>): Piesa;
  eliceBarcaCote(d: Record<string, unknown>): { D: number; Hh: number };
  duzaCote(d: Record<string, unknown>): Duza;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const duza = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'eliceBarca', piesa: 'duza', ...d });
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const aproape = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
const volum = (tri: readonly Tri[]) => tri.reduce((s, [a, b, c]) => s + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
/** Vârfurile plasei față de ax (centrul cutiei pe x, y): [r, θ, z]. */
function polare(p: Piesa): [number, number, number][] {
  const c = [-p.baza[0]!, -p.baza[1]!], unice = new Map<string, P3>();
  for (const q of p.tri.flat()) unice.set(q.join(','), q);
  return [...unice.values()].map(([x, y, z]) => [Math.hypot(x - c[0]!, y - c[1]!), Math.atan2(y - c[1]!, x - c[0]!), z]);
}

test('cotele, pe hârtie: elicea de barcă implicită (Ø40) cu jocul 0,8 și lungimea 0,5', () => {
  const q = L.duzaCote({}), e = L.eliceBarcaCote({});
  // R 20, Ri 20,8; butucul elicei 11,5 → sus = 3,8 + 11,5 = 15,3; L = max(0,5 · 40 = 20; 16,3) = 20; zi 6, f 2,4; tb 0,08 · 40 = 3,2
  // → Rout0 = 20,8 + 2,4 + 3,2 = 26,4; k = ⌈(26,4 + 3,2 + 0,4) / 8⌉ = ⌈3,75⌉ = 4 (urechile la 32), grinda de 9
  assert.deepEqual([q.D, q.R, q.joc, q.Hh, q.urechi, q.k, q.gauri], [40, 20, 0.8, e.Hh, 2, 4, 9]);
  assert.ok(aproape(q.Ri, 20.8) && aproape(q.sus, 15.3) && aproape(q.L, 20) && aproape(q.zi, 6) && aproape(q.f, 2.4) && aproape(q.tb, 3.2) && aproape(q.Rout0, 26.4), JSON.stringify(q));
  // duza scurtă: lungimea cea mai mică (0,3 · 40 = 12) nu acoperă elicea, deci L = 16,3
  assert.ok(aproape(L.duzaCote({ lungime: 0.3 }).L, 16.3));
  // Ø120: tb, plafonat la 4; Ø20: cel puțin 1,6
  assert.ok(aproape(L.duzaCote({ diametru: 120 }).tb, 4) && aproape(L.duzaCote({ diametru: 20 }).tb, 1.6));
  // urechile: 2 sau 4
  assert.equal(L.duzaCote({ urechi: 4 }).urechi, 4);
});

test('corpul e închis, cu volumul pozitiv, pe toată plaja; fără `piesa`, elicea e cea de dinainte', () => {
  for (const d of [{}, { diametru: 20 }, { diametru: 120, palete: 5, pas: 1.6, latime: 150 }, { joc: 0.3, lungime: 0.8 }, { joc: 2, lungime: 0.3, urechi: 4 },
    { diametru: 56.3, pupa: 15, inclinare: 40 }, { diametru: 24, palete: 3, pas: 0.5 }] as Record<string, unknown>[]) {
    const p = duza(d);
    assert.equal(muchiiRele(p.tri), 0, JSON.stringify(d));
    assert.ok(volum(p.tri) > 0, `${JSON.stringify(d)}: volumul ${volum(p.tri)}`);
    assert.equal(p.tipar, undefined, 'duza n-are verdict de tipărire al paletelor');
  }
  assert.deepEqual(L.construieste({ tip: 'eliceBarca' }).tri, L.construieste({ tip: 'eliceBarca', piesa: 'elice' }).tri);
});

test('pe plasă: interiorul de sus Ri, gura de jos Ri + f, exteriorul gulerului Rout0, înaltă cât L', () => {
  for (const d of [{}, { diametru: 90, joc: 1.5, lungime: 0.6 }, { diametru: 24, urechi: 4 }] as Record<string, unknown>[]) {
    const q = L.duzaCote(d), p = duza(d), v = polare(p).filter(([r]) => r < q.Rout0 + 0.01);
    assert.ok(aproape(p.dim[2]!, q.L, 1e-9), `${JSON.stringify(d)}: înălțimea ${p.dim[2]} față de ${q.L}`);
    const la = (z: number) => v.filter((w) => Math.abs(w[2] - z) < 1e-9).map((w) => w[0]);
    assert.ok(aproape(Math.min(...la(q.L)), q.Ri, 1e-6), `${JSON.stringify(d)}: interiorul de sus ${Math.min(...la(q.L))}`);
    assert.ok(aproape(Math.min(...la(0)), q.Ri + q.f, 1e-6), `${JSON.stringify(d)}: gura ${Math.min(...la(0))}`);
    assert.ok(aproape(Math.max(...la(0)), q.Rout0, 1e-6), `${JSON.stringify(d)}: gulerul ${Math.max(...la(0))}`);
    // gura, pe hârtie: la z = zi · j / 6, raza din interior e Ri + f · (1 − j / 6)² (se racordează lin cu interiorul drept)
    for (let j = 0; j <= 6; j++) {
      const z = q.zi * j / 6, rin = v.filter((w) => Math.abs(w[2] - z) < 1e-6).map((w) => w[0]);
      assert.ok(aproape(Math.min(...rin), q.Ri + q.f * (1 - j / 6) ** 2, 1e-6), `${JSON.stringify(d)}: gura la z ${z}: ${Math.min(...rin)}`);
    }
    // peretele: gulerul, drept până la 7,8; sus, Ri + 1,2 (subțiat liniar între ele)
    assert.ok(aproape(Math.max(...la(7.8)), q.Rout0, 1e-6), `${JSON.stringify(d)}: gulerul sus`);
    assert.ok(aproape(Math.max(...la(q.L)), q.Ri + 1.2, 1e-6), `${JSON.stringify(d)}: peretele de sus ${Math.max(...la(q.L))}`);
  }
});

test('elicea încape: pe toată înălțimea ei (de la bucșă la vârful butucului), interiorul duzei e cel puțin Ri = R + jocul', () => {
  for (const d of [{}, { diametru: 120, palete: 5, pas: 1.6, latime: 150 }, { lungime: 0.3 }, { joc: 0.3 }] as Record<string, unknown>[]) {
    const q = L.duzaCote(d), p = duza(d), bucsa = 3.8;
    assert.ok(q.sus + 1 <= q.L + 1e-9, `${JSON.stringify(d)}: elicea până la ${q.sus}, duza ${q.L}`);
    assert.ok(aproape(q.sus, bucsa + L.eliceBarcaCote(d).Hh, 1e-9));
    // vârfurile interiorului (sub raza gulerului) dintre bucșă și vârful elicei
    const interior = polare(p).filter(([r, , z]) => r < q.Rout0 - q.tb + q.f + 1e-6 && z >= bucsa - 1e-9 && z <= q.sus + 1e-9).map((w) => w[0]);
    assert.ok(interior.length > 0 && Math.min(...interior) >= q.Ri - 1e-9, `${JSON.stringify(d)}: interiorul ${Math.min(...interior)} față de ${q.Ri}`);
    assert.ok(q.Ri >= L.eliceBarcaCote(d).D / 2 + q.joc - 1e-9, `${JSON.stringify(d)}: Ri ${q.Ri}`);
  }
});

test('se tipărește fără suport: gura se îngustează cu cel mult 0,8 mm pe mm, exteriorul de deasupra gulerului doar scade', () => {
  for (const d of [{}, { diametru: 120, lungime: 0.8 }, { diametru: 20, lungime: 0.3 }] as Record<string, unknown>[]) {
    const q = L.duzaCote(d), v = polare(duza(d));
    // interiorul: vârfurile lui (până la Ri + f), pe fiecare înălțime a profilului, raza cea mai mică; exteriorul, deasupra
    // gulerului (z > 7,8): cea mai mare
    const vi = v.filter((w) => w[0] <= q.Ri + q.f + 1e-6);
    const zs = [...new Set(vi.map((w) => w[2].toFixed(6)))].map(Number).sort((a, b) => a - b);
    const rin = zs.map((z) => Math.min(...vi.filter((w) => Math.abs(w[2] - z) < 1e-9).map((w) => w[0])));
    for (let i = 1; i < zs.length; i++) {
      const panta = (rin[i - 1]! - rin[i]!) / (zs[i]! - zs[i - 1]!);
      assert.ok(panta <= 0.8 + 1e-9 && rin[i]! <= rin[i - 1]! + 1e-9, `${JSON.stringify(d)}: interiorul, la z ${zs[i]}, panta ${panta}`);
    }
    const zt = [...new Set(v.map((w) => w[2].toFixed(6)))].map(Number).sort((a, b) => a - b);
    const sus = zt.filter((z) => z > 7.8 + 1e-9), rout = sus.map((z) => Math.max(...v.filter((w) => Math.abs(w[2] - z) < 1e-9 && w[0] < q.Rout0 + 1e-6).map((w) => w[0])));
    for (let i = 1; i < rout.length; i++) assert.ok(rout[i]! <= rout[i - 1]! + 1e-9, `${JSON.stringify(d)}: exteriorul crește la z ${sus[i]}`);
  }
});

test('urechile: găurile de știft pe grila axului (k · 8), prin toată grosimea grinzii; lamajul în afara gulerului', () => {
  for (const [d, n] of [[{}, 2], [{ urechi: 4 }, 4], [{ diametru: 120 }, 2]] as const) {
    const q = L.duzaCote(d), p = duza(d), c = [-p.baza[0]!, -p.baza[1]!];
    // fiecare gaură are prinderea la amândouă capetele: locurile distincte pe x, y sunt urechile
    const g = p.prinderi.filter((x) => x.fel === 'gauraStift'), locuri = new Set(g.map((x) => `${x.p[0]!.toFixed(4)},${x.p[1]!.toFixed(4)}`));
    assert.equal(locuri.size, n, `${JSON.stringify(d)}: ${locuri.size} găuri`);
    for (const x of g) assert.ok(aproape(Math.hypot(x.p[0]! - c[0]!, x.p[1]! - c[1]!), 8 * q.k, 1e-6), `${JSON.stringify(d)}: gaura la ${JSON.stringify(x.p)}`);
    // prin toată grosimea urechii: de la z 0 la 7,8
    assert.deepEqual([...new Set(g.map((x) => +x.p[2]!.toFixed(6)))].sort((a, b) => a - b), [0, 7.8]);
    assert.ok(8 * q.k - 3.2 >= q.Rout0 + 0.4 - 1e-9, `${JSON.stringify(d)}: lamajul atinge gulerul`);
    assert.equal(q.gauri, 2 * q.k + 1);
    // la distanțe egale pe cerc: unghiurile găurilor, din 360 / n în 360 / n grade
    const unghiuri = [...new Set(g.map((x) => Math.round(((Math.atan2(x.p[1]! - c[1]!, x.p[0]! - c[0]!) * 180 / Math.PI) + 360) % 360)))].sort((a, b) => a - b);
    assert.deepEqual(unghiuri, Array.from({ length: n }, (_, i) => Math.round(360 * i / n) % 360).sort((a, b) => a - b), JSON.stringify(d));
  }
  // pe toată plaja diametrelor și a jocurilor: urechile, pe cea mai apropiată gaură a grilei la care lamajul nu atinge gulerul
  for (let D = 20; D <= 120; D += 0.7) for (const joc of [0.3, 0.8, 2]) {
    const q = L.duzaCote({ diametru: Math.round(D * 10) / 10, joc });
    assert.ok(8 * q.k - 3.2 >= q.Rout0 + 0.4 - 1e-9 && 8 * (q.k - 1) - 3.2 < q.Rout0 + 0.4 - 1e-9, `Ø${D.toFixed(1)}, jocul ${joc}: k ${q.k}, gulerul ${q.Rout0}`);
  }
});

test('marginile: jocul, lungimea și urechile din afara plajei se aduc la margine și se spun', () => {
  assert.deepEqual(simplu(duza({ joc: 3 }).avert), ['Jocul de la vârful paletelor e între 0,3 și 2 mm: l-am făcut de 2 mm.']);
  assert.deepEqual(simplu(duza({ lungime: 1 }).avert), ['Lungimea unei duze Kort e între 0,3 și 0,8 × diametrul: am făcut-o de 0,8.']);
  assert.deepEqual(simplu(duza({ urechi: 3 }).avert), ['O duză Kort are 2 sau 4 urechi: am făcut-o cu 2.']);
  for (const urechi of [2, 4, '4', 'x', '']) assert.deepEqual(simplu(duza({ urechi }).avert), [], `urechi ${JSON.stringify(urechi)}`);
  assert.deepEqual(simplu(duza().avert), []);
  // ce e al elicei se spune și la duză (diametrul dă elicea din ea)
  assert.deepEqual(simplu(duza({ diametru: 150 }).avert), ['Diametrul unei elice de barcă e între 20 și 120 mm: am făcut-o de 120 mm.']);
});
