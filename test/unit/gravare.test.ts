/**
 * Gravarea pe linie cu freza în V și gravarea inteligentă (ADR 0092, felia 8.3↑, documentul v16). Probele:
 * - pe linie, oracolul simulării pe octeții postului: canalul V90 la 1 mm are 2,00 mm (± 0,02) cu centrul pe vector (± 0,01),
 *   pe o linie și pe un cerc (criteriul din cercetare, cu linii în locul fontului de o linie, care vine cu textul); cu vârful
 *   plat, t + 2·d·tan(θ/2) și fundul cât vârful;
 * - refuzurile, cu motiv: freza în V pe o parte (V90 Ø6 la 1 mm pe un pătrat de 20: înainte, traseul la 3 mm de contur, piesa
 *   mai mare cu 2 mm pe fiecare parte, fără mesaj), într-un buzunar, la găurire; vârful cât diametrul; conul prea scurt;
 *   direcția pe altă latură;
 * - direcția pe linie: invers, cel mai scurt drum (o cale deschisă pornește din capătul mai apropiat);
 * - V-carve-ul cu vârful plat, pe hârtie: dreptunghiul 12 × 6, la 90° cu vârful 1, departe de capete −min(D, min(q, 3 − a));
 * - gravarea inteligentă, criteriul din cercetare: pătratul 20 × 20, D = 2, freza dreaptă Ø2 și freza de gravare cu vârful 0,25
 *   și 15° pe flanc: la suprafață colțurile au raza ≤ 0,15 mm (fără freza de gravare, 1 mm), pereții 15° ± 0,5° față de
 *   verticală, freza Ø2 nu atinge pereții finali; nimic mai adânc, nimic în afară;
 * - ușa v16 (vârful, direcția) și migrarea v15 → v16.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { traseuVcarve } from '../../src/cam/vcarve.ts';
import { conturDreptunghi } from '../../src/geom/conturBaza.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { judeca, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';

type Op = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const V = (unghi: number, diametru: number, varf?: number, numar = 1) => ({
  numar, nume: `freza V${unghi}`, diametru, forma: { tip: 'v', unghi, ...(varf !== undefined ? { varf } : {}) },
});
const PLATA = { numar: 3, nume: 'freza plata', diametru: 6 };
const op = (noduri: string[], extra: Op = {}): Op => ({
  id: `o-${noduri.join('-')}`, tip: 'profil', noduri, scula: V(90, 6), latura: 'pe-linie', sens: 'urcare', adancime: 1, pas: 1,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
type Forma = { id: string; forma: Op; e?: number; f?: number };
function doc(forme: readonly Forma[], operatii: Op[], schema = 17): unknown {
  const noduri = forme.map((c) => ({ tip: 'element', id: c.id, matrice: { ...I, e: c.e ?? 0, f: c.f ?? 0 }, forma: c.forma }));
  return {
    schema, rev: 0, piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}
const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const motivJob = (d: unknown): string => { const r = programDinDocument(deschis(d)); return r.ok ? '' : r.motiv; };
const cale = (pts: ReadonlyArray<readonly [number, number]>): Op => ({ tip: 'cale', inchis: false, varfuri: pts.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) });
const DR20: Forma = { id: 'a', forma: { tip: 'dreptunghi', latime: 20, inaltime: 20, razaColt: 0 }, e: 20, f: 20 };

/** Freza oracolului: V ascuțit, sau conul trunchiat ca sculă de profil (oracolul n-are un fel „V cu vârf”). */
function sculaOracol(unghi: number, diametru: number, varf = 0): SculaOracol {
  if (varf === 0) return { tip: 'v', diametru, unghi };
  const R = diametru / 2, a = varf / 2, cot = 1 / Math.tan((unghi * Math.PI) / 360);
  return { tip: 'profil', diametru, puncte: [[0, 0], [a, 0], [R, (R - a) * cot]] };
}

/** Programul exportat (postul real), judecat pe sculă: tăiat la fiecare `T… M6`, suprafața = minimul bucăților. */
async function judecat(d: unknown, grila: GrilaOracol, scule: readonly SculaOracol[], div = 8): Promise<{ z: Float64Array; nx: number; ny: number; text: string; bucati: Float64Array[]; marja: number }> {
  const r = await calculeazaExport(deschis(d), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const piese = r.program.text.split(/^T\d+ M6$/m);
  assert.equal(piese.length, scule.length, `${piese.length} bucăți de program, ${scule.length} scule`);
  const judecate = piese.map((b, k) => judeca(b, grila, scule[k]!, { div }));
  const bucati = judecate.map((o) => Float64Array.from(o.z));
  const z = bucati.reduce((acc, b) => acc.map((v, i) => Math.min(v, b[i]!)));
  return { z, nx: judecate[0]!.nx, ny: judecate[0]!.ny, text: r.program.text, bucati, marja: Math.max(...judecate.map((o) => o.marja)) };
}
const celula = (g: GrilaOracol, nx: number, x: number, y: number): number => Math.floor((y - g.y0) / g.celula) * nx + Math.floor((x - g.x0) / g.celula);

/** Lățimea și centrul canalului pe coloana / rândul dat: celulele tăiate (sub −1e-4), pe grilă. */
function canal(z: Float64Array, g: GrilaOracol, nx: number, ny: number, coloana: number): { latime: number; centru: number } {
  let n = 0, s = 0;
  for (let j = 0; j < ny; j++) {
    if (z[j * nx + coloana]! < -1e-4) { n++; s += g.y0 + (j + 0.5) * g.celula; }
  }
  return { latime: n * g.celula, centru: s / n };
}

// ── Pe linie ─────────────────────────────────────────────────────────────────────────────────────────────────────────

test('pe linie, V90 la 1 mm: canalul are 2,00 mm (± 0,02) cu centrul pe vector (± 0,01), pe o linie și pe un cerc; fundul la −1', async () => {
  const forme: Forma[] = [{ id: 'l', forma: cale([[20, 50], [60, 50]]) }, { id: 'c', forma: { tip: 'cerc', raza: 10 }, e: 100, f: 50 }];
  const d = doc(forme, [op(['l', 'c'])]);
  const g: GrilaOracol = { x0: 39, y0: 48, latime: 2, inaltime: 4, celula: 0.005 };
  const o = await judecat(d, g, [sculaOracol(90, 6)]);
  const k = canal(o.z, g, o.nx, o.ny, 200);
  assert.ok(Math.abs(k.latime - 2) <= 0.02 && Math.abs(k.centru - 50) <= 0.01, JSON.stringify(k));
  const zMin = o.z.reduce((m, v) => Math.min(m, v), Infinity);
  // Cel mai apropiat centru de celulă e la 0,0025 mm de axă: la V90, tot atât mai sus.
  assert.ok(Math.abs(zMin + 1) <= 0.0025 + 1e-6, `fundul: ${zMin}`);
  // Cercul, pe rândul y = 50 (latura dreaptă, la x = 110): canalul de-a lungul lui X.
  const gc: GrilaOracol = { x0: 108, y0: 49.9, latime: 4, inaltime: 0.2, celula: 0.005 };
  const oc = await judecat(d, gc, [sculaOracol(90, 6)]);
  let n = 0, s = 0;
  for (let i = 0; i < oc.nx; i++) if (oc.z[20 * oc.nx + i]! < -1e-4) { n++; s += gc.x0 + (i + 0.5) * gc.celula; }
  assert.ok(Math.abs(n * gc.celula - 2) <= 0.02 && Math.abs(s / n - 110) <= 0.01, `cercul: ${n * gc.celula} mm, centrul ${s / n}`);
});

test('pe linie, freza de gravare 30° cu vârful 0,25, la 1 mm: canalul de 0,25 + 2·tan 15° = 0,786 mm, fundul lat de 0,25', async () => {
  const d = doc([{ id: 'l', forma: cale([[20, 50], [60, 50]]) }], [op(['l'], { scula: V(30, 3.175, 0.25) })]);
  const g: GrilaOracol = { x0: 39, y0: 49, latime: 2, inaltime: 2, celula: 0.005 };
  const o = await judecat(d, g, [sculaOracol(30, 3.175, 0.25)]);
  const k = canal(o.z, g, o.nx, o.ny, 200);
  assert.ok(Math.abs(k.latime - (0.25 + 2 * Math.tan(Math.PI / 12))) <= 0.02 && Math.abs(k.centru - 50) <= 0.01, JSON.stringify(k));
  let fund = 0;
  for (let j = 0; j < o.ny; j++) if (Math.abs(o.z[j * o.nx + 200]! + 1) <= 1e-6) fund++;
  assert.ok(Math.abs(fund * g.celula - 0.25) <= 0.011, `fundul: ${fund * g.celula} mm`);
  // Simularea din export (nucleul) e de acord cu oracolul pe aceeași bucată: cel mai jos Z e −1.
  assert.match(o.text, /Z-1\.000/);
});

// ── Refuzurile ───────────────────────────────────────────────────────────────────────────────────────────────────────

test('freza în V doar pe linie sau într-un V-carve: pe o parte, într-un buzunar, la găurire e refuzată cu motiv (înainte, V90 Ø6 pe un exterior ieșea la 3 mm de contur)', () => {
  for (const [latura, unde] of [['exterior', 'pe o parte'], ['interior', 'pe o parte']] as const) {
    assert.equal(motivJob(doc([DR20], [op(['a'], { latura })])), `i/a: freza în V (T1) taie pe linie sau într-un V-carve; ${unde}, peretele n-ar ieși unde e desenat`);
  }
  for (const latura of ['stanga', 'dreapta'] as const) {
    assert.match(motivJob(doc([{ id: 'l', forma: cale([[20, 50], [60, 50]]) }], [op(['l'], { latura })])), /freza în V \(T1\) taie pe linie sau într-un V-carve; pe o parte/);
  }
  assert.match(motivJob(doc([DR20], [op(['a'], { tip: 'buzunar', latura: 'interior', pasLateral: 1 })])), /freza în V \(T1\) taie pe linie sau într-un V-carve; într-un buzunar/);
  assert.match(motivJob(doc([{ id: 'c', forma: { tip: 'cerc', raza: 3 }, e: 50, f: 50 }], [op(['c'], { tip: 'gaurire', latura: 'interior' })])), /freza în V \(T1\) taie pe linie sau într-un V-carve; la o găurire/);
  // Controlul: freza plată pe același exterior trece, iar pe linie freza în V trece.
  assert.equal(motivJob(doc([DR20], [op(['a'], { latura: 'exterior', scula: PLATA })])), '');
  assert.equal(motivJob(doc([DR20], [op(['a'])])), '');
});

test('vârful cât diametrul (sau mai mare), conul prea scurt pe linie și direcția pe altă latură sunt refuzate, cu motiv', () => {
  assert.equal(motivJob(doc([DR20], [op(['a'], { scula: V(30, 3.175, 3.175) })])), 'i/a: vârful frezei în V (T1), de 3.175 mm, trebuie să fie sub diametrul ei (Ø3.175)');
  // (3,175 − 0,25) / 2 · cot 15° = 5,458 mm de con; 6 mm ar tăia coada.
  assert.equal(motivJob(doc([DR20], [op(['a'], { scula: V(30, 3.175, 0.25), adancime: 6, pas: 2 })])), 'i/a: tăietura cere 6 mm, iar conul frezei în V (Ø3.175, 30°) are 5.458 mm: ar tăia coada frezei');
  assert.equal(motivJob(doc([DR20], [op(['a'], { scula: V(30, 3.175, 0.25), adancime: 5.4, pas: 2 })])), '');
  assert.equal(motivJob(doc([DR20], [op(['a'], { latura: 'exterior', scula: PLATA, directie: 'invers' })])), 'i/a: direcția (invers, cel mai scurt drum) e doar a tăieturii pe linie');
});

// ── Direcția pe linie ────────────────────────────────────────────────────────────────────────────────────────────────

/** Unde începe fiecare tăietură (prima rapidă în plan după eticheta ei) și unde se termină (ultima tăiere înainte de urmă). */
function capete(miscari: readonly Miscare[]): Map<string, { start: [number, number]; capat: [number, number] }> {
  const rez = new Map<string, { start: [number, number]; capat: [number, number] }>();
  let cur: string | null = null;
  for (const m of miscari) {
    if (m.tip === 'eticheta') { cur = m.text.split(':')[0]!; continue; }
    if (cur === null || !('la' in m) || m.la.X === undefined || m.la.Y === undefined) continue;
    const e = rez.get(cur);
    if (!e) rez.set(cur, { start: [m.la.X, m.la.Y], capat: [m.la.X, m.la.Y] });
    else e.capat = [m.la.X, m.la.Y];
  }
  return rez;
}
const capeteJob = (d: unknown) => {
  const r = programDinDocument(deschis(d));
  if (!r.ok) assert.fail(r.motiv);
  return capete(r.program.miscari);
};

test('direcția pe linie: ca desenul, invers; cel mai scurt drum pornește o cale deschisă din capătul mai apropiat de unde a rămas freza', () => {
  // a: (20, 50) → (60, 50); b: (100, 50) → (62, 50), mai aproape de capătul lui a cu capătul ei.
  const forme: Forma[] = [{ id: 'a', forma: cale([[20, 50], [60, 50]]) }, { id: 'b', forma: cale([[100, 50], [62, 50]]) }];
  const ca = capeteJob(doc(forme, [op(['a', 'b'])]));
  assert.deepEqual([ca.get('i/a')?.start, ca.get('i/b')?.start], [[20, 50], [100, 50]]);
  const inv = capeteJob(doc(forme, [op(['a', 'b'], { directie: 'invers' })]));
  assert.deepEqual([inv.get('i/a')?.start, inv.get('i/b')?.start], [[60, 50], [62, 50]]);
  const scurt = capeteJob(doc(forme, [op(['a', 'b'], { directie: 'scurt' })]));
  // Prima pornește ca desenul (freza n-a fost încă nicăieri); a doua, din (62, 50), lângă (60, 50).
  assert.deepEqual([scurt.get('i/a')?.start, scurt.get('i/b')?.start, scurt.get('i/b')?.capat], [[20, 50], [62, 50], [100, 50]]);
  // O buclă închisă, cu cel mai scurt drum, rămâne cum e desenată; inversă, pornește tot din vârful 0, în sens opus.
  const dr = (k: Op) => capeteJob(doc([DR20], [op(['a'], k)]));
  const ord = (m: ReturnType<typeof dr>) => m.get('i/a');
  assert.deepEqual(ord(dr({ directie: 'scurt' })), ord(dr({})));
  const job = (k: Op) => { const r = programDinDocument(deschis(doc([DR20], [op(['a'], k)]))); if (!r.ok) assert.fail(r.motiv); return r.program.miscari; };
  const al2 = (ms: readonly Miscare[]) => ms.filter((m) => m.tip === 'taiere' && m.la.X !== undefined && m.la.Y !== undefined).map((m) => ('la' in m ? [m.la.X, m.la.Y] : []))[0];
  assert.notDeepEqual(al2(job({ directie: 'invers' })), al2(job({})), 'inversată, bucla pleacă spre celălalt vecin al vârfului 0');
  // Cel mai scurt drum nu întoarce o buclă închisă nici când freza a rămas lângă ultimul ei vârf: o cale deschisă se termină în
  // (19, 41), lângă vârful (20, 40) al buclei (20, 20) → (40, 20) → (40, 40) → (20, 40); bucla merge tot ca desenul.
  const bucla: Op = { tip: 'cale', inchis: true, varfuri: [[20, 20], [40, 20], [40, 40], [20, 40]].map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) };
  const doua: Forma[] = [{ id: 'l', forma: cale([[100, 60], [19, 41]]) }, { id: 'b', forma: bucla }];
  const tot = (k: Op) => { const r = programDinDocument(deschis(doc(doua, [op(['l', 'b'], k)]))); if (!r.ok) assert.fail(r.motiv); return r.program.miscari; };
  assert.deepEqual(tot({ directie: 'scurt' }), tot({}), 'cu cel mai scurt drum, la fel ca desenul');
});

// ── V-carve-ul cu vârful plat ────────────────────────────────────────────────────────────────────────────────────────

test('V-carve-ul cu vârful plat, pe hârtie: dreptunghiul 12 × 6 la 90° cu vârful 1 (Ø8): departe de capete −min(q, 3 − a), nimic mai adânc decât −q', async (t) => {
  const forme: Forma[] = [{ id: 'a', forma: { tip: 'dreptunghi', latime: 12, inaltime: 6, razaColt: 0 }, e: 20, f: 20 }];
  const d = doc(forme, [op(['a'], { tip: 'vcarve', latura: 'interior', scula: V(90, 8, 1), adancime: 10, pas: 10 })]);
  const g: GrilaOracol = { x0: 19.5, y0: 19.5, latime: 13, inaltime: 7, celula: 0.05 };
  const o = await judecat(d, g, [sculaOracol(90, 8, 1)]);
  let peste = 0, afara = 0, abatere = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula, z = o.z[j * o.nx + i]!;
      const inauntru = x > 20 && x < 32 && y > 20 && y < 26;
      if (!inauntru) { afara = Math.max(afara, -z); continue; }
      const q = Math.min(x - 20, 32 - x, y - 20, 26 - y);
      peste = Math.max(peste, -q - z);
      if (x > 24 && x < 28) abatere = Math.max(abatere, Math.abs(z + Math.min(q, 3 - 0.5)));
    }
  }
  t.diagnostic(`peste ${peste.toFixed(5)}, abaterea departe de capete ${abatere.toFixed(5)}, afară ${afara}`);
  assert.ok(peste <= 0.002, `mai adânc decât −q: ${peste}`);
  assert.ok(afara <= 1e-6, `în afară: ${afara}`);
  assert.ok(abatere <= 0.015, `față de hârtie, departe de capete: ${abatere}`);
});

test('V-carve-ul: o regiune mai îngustă decât vârful e refuzată, cu motiv', () => {
  const ingust: Forma = { id: 'a', forma: { tip: 'dreptunghi', latime: 10, inaltime: 0.8, razaColt: 0 }, e: 20, f: 20 };
  assert.equal(motivJob(doc([ingust], [op(['a'], { tip: 'vcarve', latura: 'interior', scula: V(90, 8, 1), adancime: 1 })])),
    'i/a: regiunea nu e nicăieri mai lată decât vârful frezei (1 mm): freza n-are unde coborî');
});

// ── Gravarea inteligentă (smart engrave) ─────────────────────────────────────────────────────────────────────────────

const GRAVARE = V(30, 3.175, 0.25);
const DREAPTA2 = { numar: 2, nume: 'freza dreapta', diametru: 2 };
const smart = (fund: boolean): unknown => doc([DR20], [op(['a'], {
  tip: 'vcarve', latura: 'interior', scula: GRAVARE, adancime: 2, pas: 1, ...(fund ? { fundPlat: { scula: DREAPTA2, pasLateral: 0.8 } } : {}),
})]);
const TAN15 = Math.tan(Math.PI / 12);
const qDr = (x: number, y: number): number | null => (x > 20 && x < 40 && y > 20 && y < 40 ? Math.min(x - 20, 40 - x, y - 20, 40 - y) : null);

test('gravarea inteligentă, criteriul din cercetare (pătratul 20 × 20, D = 2, Ø2 + vârful 0,25 la 15°): nimic mai adânc, nimic în afară; Ø2 nu atinge pereții', async (t) => {
  const g: GrilaOracol = { x0: 19.5, y0: 19.5, latime: 11, inaltime: 6, celula: 0.02 };
  const o = await judecat(smart(true), g, [{ tip: 'plata', diametru: 2 }, sculaOracol(30, 3.175, 0.25)]);
  assert.equal(o.text.match(/^T\d+ M6$/gm)?.join(), 'T1 M6', 'întâi freza dreaptă, apoi freza de gravare');
  let peste = 0, afara = 0, laPerete = Infinity;
  const fund = o.bucati[0]!;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula, k = j * o.nx + i, q = qDr(x, y);
      if (q === null) { afara = Math.max(afara, -o.z[k]!); continue; }
      const ideal = -Math.min(2, q / TAN15);
      peste = Math.max(peste, ideal - o.z[k]!);
      // Pe pereți (q < D·tan 15°), freza dreaptă rămâne deasupra peretelui final cu marja lui (0,002·cot 15° = 0,0075).
      if (q < 2 * TAN15 && fund[k]! < 0) laPerete = Math.min(laPerete, fund[k]! - ideal);
    }
  }
  t.diagnostic(`peste ${peste.toFixed(5)}, afară ${afara}, freza dreaptă deasupra pereților cu ${laPerete.toFixed(5)}`);
  assert.ok(peste <= 0.002, `mai adânc: ${peste}`);
  assert.ok(afara <= 1e-6, `în afară: ${afara}`);
  assert.ok(laPerete >= 0.005, `freza dreaptă atinge pereții: ${laPerete}`);
});

test('gravarea inteligentă: pereții la 15° ± 0,5° față de verticală, pe mijlocul laturii (z = −0,5 și −1,5, interpolat)', async (t) => {
  const g: GrilaOracol = { x0: 29.9, y0: 19.9, latime: 0.2, inaltime: 1.2, celula: 0.005 };
  const o = await judecat(smart(true), g, [{ tip: 'plata', diametru: 2 }, sculaOracol(30, 3.175, 0.25)]);
  const i = 20;
  const yLa = (nivel: number): number => {
    for (let j = 1; j < o.ny; j++) {
      const a = o.z[(j - 1) * o.nx + i]!, b = o.z[j * o.nx + i]!;
      if (a > nivel && b <= nivel) return g.y0 + (j - 0.5 + (a - nivel) / (a - b)) * g.celula;
    }
    return Number.NaN;
  };
  const unghi = (Math.atan((yLa(-1.5) - yLa(-0.5)) / 1) * 180) / Math.PI;
  t.diagnostic(`peretele: ${unghi.toFixed(4)}°`);
  assert.ok(Math.abs(unghi - 15) <= 0.5, `peretele: ${unghi}°`);
});

test('gravarea inteligentă: colțurile la suprafață au raza ≤ 0,15 mm; martorul, un buzunar doar cu Ø2, are 1 mm', async (t) => {
  const g: GrilaOracol = { x0: 19.95, y0: 19.95, latime: 0.6, inaltime: 0.6, celula: 0.005 };
  const o = await judecat(smart(true), g, [{ tip: 'plata', diametru: 2 }, sculaOracol(30, 3.175, 0.25)]);
  /** Cea mai mare rază ρ pentru care fiecare celulă netăiată (z > −0,005) din pătrat e în afara cercului de rază ρ tangent la colț. */
  const raza = (z: Float64Array): number => {
    let s = 0;
    for (let j = 0; j < o.ny; j++) {
      for (let i = 0; i < o.nx; i++) {
        const x = g.x0 + (i + 0.5) * g.celula - 20, y = g.y0 + (j + 0.5) * g.celula - 20;
        if (x > 0 && y > 0 && z[j * o.nx + i]! > -0.005) s = Math.max(s, Math.min(x, y));
      }
    }
    // Celula netăiată cea mai adâncă în colț, pe bisectoare: s = ρ(1 − 1/√2), deci ρ = s / (1 − 1/√2).
    return s / (1 - Math.SQRT1_2);
  };
  const cu = raza(o.z);
  assert.ok(cu <= 0.15, `raza colțului: ${cu}`);
  // Martorul măsurii: buzunarul pătratului doar cu Ø2 lasă colțul cu raza frezei, 1 mm (pe hârtie).
  const buzunar = await judecat(doc([DR20], [op(['a'], { tip: 'buzunar', latura: 'interior', scula: DREAPTA2, adancime: 2, pas: 1, pasLateral: 0.8 })]), g, [{ tip: 'plata', diametru: 2 }]);
  const fara = raza(buzunar.z);
  t.diagnostic(`raza colțului: ${cu.toFixed(4)} mm; doar Ø2: ${fara.toFixed(4)} mm`);
  assert.ok(Math.abs(fara - 1) <= 0.03, `doar Ø2: ${fara}`);
  // Și bucata frezei drepte a gravării, singură, lasă colțul cel puțin atât (stă departe de pereți).
  assert.ok(raza(o.bucati[0]!) >= 1, `bucata frezei drepte: ${raza(o.bucati[0]!)}`);
});

test('gravarea inteligentă: în colț, materialul lăsat față de anvelopa frezei de gravare (pe hârtie, din toate pozițiile ei) e cel mult creasta c', async (t) => {
  const g: GrilaOracol = { x0: 20, y0: 20, latime: 1.6, inaltime: 1.6, celula: 0.05 };
  const o = await judecat(smart(true), g, [{ tip: 'plata', diametru: 2 }, sculaOracol(30, 3.175, 0.25)], 16);
  // Anvelopa, pe hârtie, fără nimic din CAM: în p, cea mai mare adâncime a frezei de gravare din orice centru c al pătratului
  // (rețea de 0,0025 mm): min(D, (r(c) − a)·cot 15°) − max(0, |p − c| − a)·cot 15°, cu r(c) distanța la laturi. Rețeaua o face
  // doar mai puțin adâncă, deci materialul măsurat față de ea e cel mult cel față de anvelopa adevărată.
  const a = 0.125, cot = 1 / TAN15, raza = a + 2 * TAN15, h = 0.0025;
  let lasat = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const px = g.x0 + (i + 0.5) * g.celula, py = g.y0 + (j + 0.5) * g.celula;
      let adanc = 0;
      for (let cy = Math.max(20, py - raza); cy <= py + raza; cy += h) {
        for (let cx = Math.max(20, px - raza); cx <= px + raza; cx += h) {
          const r = Math.min(cx - 20, cy - 20);
          if (r <= a) continue;
          const d = Math.hypot(px - cx, py - cy);
          if (d >= raza) continue;
          adanc = Math.max(adanc, Math.min(2, (r - a) * cot) - Math.max(0, d - a) * cot);
        }
      }
      lasat = Math.max(lasat, o.z[j * o.nx + i]! + adanc);
    }
  }
  t.diagnostic(`materialul lăsat în colț, față de anvelopă: ${lasat.toFixed(5)} (marja oracolului ${o.marja.toFixed(5)})`);
  assert.ok(lasat <= 0.05 + o.marja + 0.002, `în colț: ${lasat}`);
});

test('gravarea inteligentă pe hârtie: inelele colțurilor stau la t + 2c·tan 15° = 0,277 mm, deci pe pătrat nu trebuie niciunul (cu vârful ascuțit, da)', () => {
  // Inelul j = 1 e la w(D) + s_v = 0,661 + 0,277 de laturi; colțul lui e la √2·(1,538 − 0,938) = 0,849 de colțul zonei frezei
  // drepte (decalată cu D·tan 15° + m + R_f = 1,538), sub R_f − s_v/2 = 0,862: atins, deci nicio bucată. Cu vârful ascuțit,
  // s_v = 0,027: inelul j = 1 la 0,563, colțul la √2·0,975 = 1,379 de zonă, peste 1 − 0,013: păstrat.
  const P = (varf: number) => traseuVcarve({
    contururi: [conturDreptunghi(20, 20, 20, 20, 0)], unghi: 30, varf, diametruScula: 3.175, adancime: 2, pas: 1,
    avans: 1000, avansPlonjare: 300, zSigur: 5, fundPlat: { diametru: 2, pasLateral: 0.8, sens: 'urcare' },
  });
  const cu = P(0.25), fara = P(0);
  if (!cu.ok || !fara.ok) assert.fail(cu.ok ? (fara.ok ? '' : fara.motiv) : cu.motiv);
  assert.equal(cu.statistici.ineleColturi, 0);
  assert.ok(fara.statistici.ineleColturi > 0, `cu vârful ascuțit: ${fara.statistici.ineleColturi}`);
});

test('V-carve-ul își judecă singur vârful (și chemat fără lucrare): în afara [0, Ø) e refuzat, cu motiv', () => {
  const P = (varf: number) => traseuVcarve({
    contururi: [conturDreptunghi(20, 20, 20, 20, 0)], unghi: 90, varf, diametruScula: 4, adancime: 1, pas: 1, avans: 1000, avansPlonjare: 300, zSigur: 5,
  });
  for (const varf of [4, 5, -0.1, Number.NaN]) {
    const r = P(varf);
    assert.ok(!r.ok && r.motiv === `vârful frezei în V, de ${varf} mm, trebuie să fie în [0, Ø4)`, `${varf}: ${r.ok ? 'acceptat' : r.motiv}`);
  }
  assert.ok(P(1).ok && P(0).ok);
});

test('V-carve-ul cu vârful: conul e ((Ø − t) / 2)·cot(θ/2): V90 Ø4 cu vârful 1 are 1,5 mm, deci 1,8 mm e refuzat (Ø / 2 ar da 2)', () => {
  assert.match(motivJob(doc([DR20], [op(['a'], { tip: 'vcarve', latura: 'interior', scula: V(90, 4, 1), adancime: 1.8, pas: 1 })])),
    /regiunea cere 1\.800 mm, iar conul frezei în V \(Ø4, 90°\) are 1\.500 mm/);
  assert.equal(motivJob(doc([DR20], [op(['a'], { tip: 'vcarve', latura: 'interior', scula: V(90, 4, 1), adancime: 1.5, pas: 1 })])), '');
});

test('programul poartă vârful frezei (IR), ca simularea exportului să taie cu conul trunchiat', () => {
  const r = programDinDocument(deschis(doc([DR20], [op(['a'], { scula: V(30, 3.175, 0.25) })])));
  if (!r.ok) assert.fail(r.motiv);
  assert.deepEqual(r.program.scula.forma, { tip: 'v', unghi: 30, varf: 0.25 });
  const ascutit = programDinDocument(deschis(doc([DR20], [op(['a'], { scula: V(30, 3.175) })])));
  if (!ascutit.ok) assert.fail(ascutit.motiv);
  assert.deepEqual(ascutit.program.scula.forma, { tip: 'v', unghi: 30 });
});

// ── Ușa v16 ──────────────────────────────────────────────────────────────────────────────────────────────────────────

test('ușa v16: vârful în (0, 100] și direcția invers / scurt (câmpurile necunoscute rămân); un v15 cu ele nu e valid; un v15 curat urcă (prin v16) la v17', () => {
  const d = deschis(doc([DR20], [op(['a'], { scula: { ...V(30, 3.175, 0.25), forma: { tip: 'v', unghi: 30, varf: 0.25, cod: 'X' } }, directie: 'scurt' })]));
  const o = d.piese[0]!.operatii[0]!;
  assert.equal(o.scula.forma?.varf, 0.25);
  assert.equal((o.scula.forma as Record<string, unknown>)['cod'], 'X');
  assert.equal(o.directie, 'scurt');
  for (const varf of [0, -1, 101, '0.2', null, Number.NaN]) {
    assert.ok(!incarca(doc([DR20], [op(['a'], { scula: { ...V(30, 3.175), forma: { tip: 'v', unghi: 30, varf } } })])).ok, String(varf));
  }
  for (const directie of ['', 'original', 'INVERS', 1, null]) assert.ok(!incarca(doc([DR20], [op(['a'], { directie })])).ok, String(directie));
  const a = incarca(doc([DR20], [op(['a'], { directie: 'invers' })], 15));
  assert.ok(!a.ok && /are câmpul „directie”, pe care v16 îl folosește: nu e un document v15 valid/.test(a.motiv), a.ok ? '' : a.motiv);
  const b = incarca(doc([DR20], [op(['a'], { scula: V(30, 3.175, 0.25) })], 15));
  assert.ok(!b.ok && /are câmpul „varf” în forma frezei, pe care v16 îl folosește/.test(b.motiv), b.ok ? '' : b.motiv);
  const fp = incarca(doc([DR20], [op(['a'], { tip: 'vcarve', latura: 'interior', fundPlat: { scula: { ...DREAPTA2, forma: { tip: 'v', unghi: 90, varf: 1 } }, pasLateral: 0.8 } })], 15));
  assert.ok(!fp.ok && /„varf” în forma frezei/.test(fp.motiv), fp.ok ? '' : fp.motiv);
  const curat = doc([DR20], [op(['a'])], 15);
  const c = incarca(curat);
  assert.ok(c.ok);
  if (c.ok) assert.deepEqual(c.doc, { ...(curat as Record<string, unknown>), schema: 17 }, 'doar numărul');
});

// ── Ce scrie Exportă ─────────────────────────────────────────────────────────────────────────────────────────────────

test('ce scrie Exportă (ADR 0092): vârful peste 0 în forma frezei (numele după el), 0 îl scoate; direcția doar pe linie, „ca desenul” n-o scrie', () => {
  const o = deschis(doc([DR20], [op(['a'])])).piese[0]!.operatii[0]!;
  const v = { latura: 'pe-linie', sens: 'urcare', adancime: 1, pas: 1, urechi: null, rampa: null, intrari: null, colturi: null } as const;
  const cuVarf = operatieDinDialog(o, v, { numar: 1, diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.25 } });
  assert.deepEqual(cuVarf.scula, { numar: 1, nume: 'freza V30 varf 0.25', diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.25 } });
  // Vârful 0 (ascuțit) nu se scrie; un câmp necunoscut al formei rămâne.
  const cuCod = { ...cuVarf, scula: { ...cuVarf.scula, forma: { ...cuVarf.scula.forma!, cod: 'X' } } };
  assert.deepEqual(operatieDinDialog(cuCod, v, { numar: 1, diametru: 3.175, forma: { tip: 'v', unghi: 30 } }).scula,
    { numar: 1, nume: 'freza V30', diametru: 3.175, forma: { tip: 'v', unghi: 30, cod: 'X' } });
  // Fără schimbare, aceeași operație (nicio comandă).
  assert.deepEqual(operatieDinDialog(cuVarf, v, { numar: 1, diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.25 } }), cuVarf);
  // Direcția: pe linie, scrisă; ca desenul (lipsă), câmpul pleacă; pe altă latură, pleacă.
  const s = { numar: 1, diametru: 6, forma: { tip: 'v', unghi: 90 } } as const;
  const inv = operatieDinDialog(o, { ...v, directie: 'invers' }, s);
  assert.equal(inv.directie, 'invers');
  assert.equal(Object.hasOwn(operatieDinDialog(inv, v, s), 'directie'), false);
  assert.equal(Object.hasOwn(operatieDinDialog(inv, { ...v, latura: 'exterior', directie: 'scurt' }, { numar: 3, diametru: 6 }), 'directie'), false);
  assert.equal(operatieDinDialog(inv, undefined, s).directie, 'invers', 'fără valori din dialog, a operației');
});
