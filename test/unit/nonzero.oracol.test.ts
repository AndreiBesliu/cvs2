/**
 * Normalizarea `nonzero` (felia 2.7d, ADR 0036) judecată de oracolul ei independent (`test/oracles/nonzero.ts`, scris doar
 * din ADR, fără importuri din `src/`), pe corpusul scris de mână (`test/oracles/nonzero.cazuri.ts`, cu hârtia):
 * - (0) hârtia: oracolul confirmă singur fiecare „neschimbat” (regiunea sub regulă e cea evenodd, nicio muchie coincidentă)
 *   și fiecare „schimbat” (regiunile diferă sau există muchii coincidente); codurile refuzului;
 * - (a) aplicația pe fiecare caz, la 0, la 2 440 și la 10⁶ mm: regiunea, umplerea în stânga, geometria sursei, vârfurile,
 *   distanțele în ambele sensuri, topologia, info; hârtia (câte contururi, aria); intrarea nemodificată; determinismul;
 * - (b) independența de poziție: același fel de rezultat și același număr de contururi la cele trei poziții;
 * - (c) grupurile (§3): o formă mică lângă una mare își păstrează precizia; τ pe grup;
 * - (d) refuzurile (§8): intrările invalide dau `intrare`, nimic nu aruncă, bugetul refuză cu `plafon`;
 * - (e) forme aleatoare (cu sămânță) pe o grilă rară, la trei poziții: corecte sau refuzate cu motiv;
 * - (f) supa de glife (sute de contururi suprapuse), la trei poziții;
 * - (g) CONTROALELE NEGATIVE: ieșiri stricate de mână (un vârf mutat cu 1e-9, un punct de control mutat, un bulge întors,
 *   un contur lipsă, o gaură păstrată, o muchie coincidentă în plus, …) trebuie prinse.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeaza } from '../../src/geom/nonzero.ts';
import {
  CODURI_MOTIV, codMotiv, judecaNormalizarea, martorTau, muchiiCoincidente, problemaIntrare, regiuneaDifera, grupuri, toatePrimitivele,
  type CaleN, type OptiuniN, type VarfN,
} from '../oracles/nonzero.ts';
import {
  constatariNonzero, corpusNonzero, cerc, drept, formaAleatoare, intrariInvalide, inv, judecaHartiaN, L, muta, POZITII, rng, roteste, supa, type CazN,
} from '../oracles/nonzero.cazuri.ts';

type Rez = { ok: true; cai: VarfN[][]; info: Record<string, unknown> } | { ok: false; motiv: string };

/** Aplicația, cu excepțiile prinse (o excepție e o greșeală: §1, „nu aruncă”). */
function app(cai: unknown, regula: 'nonzero' | 'evenodd' = 'nonzero'): Rez | { aruncat: string } {
  try {
    return normalizeaza(cai as Parameters<typeof normalizeaza>[0], { regula }) as unknown as Rez;
  } catch (e) {
    return { aruncat: String(e) };
  }
}

const optiuni = (c: CazN, extra: OptiuniN = {}): OptiuniN => ({
  ...(c.hartie.rezultat === 'oricare' || c.hartie.rezultat === 'liber' ? { refuzPermis: true } : { asteptat: c.hartie.rezultat === 'refuz' ? 'refuz' : c.hartie.rezultat }),
  ...(c.hartie.cod !== undefined ? { cod: c.hartie.cod } : {}),
  densitate: c.densitate ?? 1,
  ...extra,
});

const CORPUS = corpusNonzero();
const caz = (nume: string): CazN => {
  const c = CORPUS.find((x) => x.nume.startsWith(nume));
  if (c === undefined) throw new Error(`cazul ${nume} lipsește`);
  return c;
};

// ---------------------------------------------------------------------------------------------------------------------
// (0)

test('(0) constantele: cele zece coduri ale refuzului; corpusul are nume unice și cel puțin 100 de cazuri', () => {
  assert.deepEqual([...CODURI_MOTIV], ['intrare', 'toleranta', 'plafon', 'nedecis', 'autoverificare', 'inchidere', 'control', 'sfert', 'topologie', 'interna']);
  assert.equal(codMotiv('plafon: prea mult'), 'plafon');
  assert.equal(codMotiv('plafonul'), null);
  assert.equal(codMotiv(undefined), null);
  assert.equal(new Set(CORPUS.map((c) => c.nume)).size, CORPUS.length);
  assert.ok(CORPUS.length >= 100, `${CORPUS.length}`);
  for (const f of ['baza', 'evenodd', 'glife', 'adversar', 'grup', 'neschimbat'] as const) assert.ok(CORPUS.some((c) => c.familie === f), f);
});

test('(0) hârtia: fiecare „neschimbat” e confirmat de oracol, fiecare „schimbat” are un motiv (regiunea sau o coincidență)', () => {
  const pr: string[] = [];
  for (const c of CORPUS) {
    const regula = c.regula ?? 'nonzero';
    if (c.hartie.rezultat !== 'neschimbat' && c.hartie.rezultat !== 'schimbat') continue;
    const dif = regiuneaDifera(c.cai, regula).dezacorduri;
    const gr = grupuri(c.cai);
    const segs = toatePrimitivele(c.cai);
    const co = muchiiCoincidente(segs, () => Math.max(...gr.map((g) => g.eps), 0)).length;
    if (c.hartie.rezultat === 'neschimbat' && (dif > 0 || co > 0)) pr.push(`${c.nume}: neschimbat pe hârtie, dar ${dif} sonde diferă, ${co} coincidențe`);
    // §6 (amendamentul K7): „neschimbat” pe hârtie cere și lipsa martorului de proximitate la τ.
    if (c.hartie.rezultat === 'neschimbat' && martorTau(c.cai) !== null) pr.push(`${c.nume}: neschimbat pe hârtie, dar are un martor la τ: ${martorTau(c.cai)}`);
    if (c.hartie.rezultat === 'schimbat' && dif === 0 && co === 0) pr.push(`${c.nume}: schimbat pe hârtie, fără niciun motiv găsit`);
  }
  assert.deepEqual(pr, []);
});

test('(0) intrările invalide: oracolul le recunoaște pe toate', () => {
  for (const x of intrariInvalide()) assert.notEqual(problemaIntrare(x.cai), null, x.nume);
  for (const c of CORPUS) assert.equal(problemaIntrare(c.cai), null, c.nume);
});

// ---------------------------------------------------------------------------------------------------------------------
// (a) și (b): corpusul, la trei poziții.

for (const c of CORPUS) {
  test(`(a) ${c.familie}: ${c.nume}`, () => {
    const pr: string[] = [];
    const semn: string[] = [];
    for (const [dx, dy] of c.pozitii === true ? POZITII : [[0, 0] as const]) {
      const cai: CaleN[] = dx === 0 && dy === 0 ? (c.cai as CaleN[]) : muta(c.cai, dx, dy);
      const inainte = JSON.stringify(cai);
      const r = app(cai, c.regula ?? 'nonzero');
      if ('aruncat' in r) { pr.push(`@${dx}: a aruncat ${r.aruncat}`); continue; }
      if (JSON.stringify(cai) !== inainte) pr.push(`@${dx}: intrarea a fost modificată`);
      for (const p of judecaNormalizarea(cai, c.regula ?? 'nonzero', r, optiuni(c, { samanta: 1 + dx })).probleme) pr.push(`@${dx}: ${p}`);
      for (const p of judecaHartiaN({ cai, hartie: c.hartie }, r)) pr.push(`@${dx}: ${p}`);
      // Determinismul: același rezultat la a doua rulare.
      const r2 = app(cai, c.regula ?? 'nonzero');
      if (JSON.stringify(r2) !== JSON.stringify(r)) pr.push(`@${dx}: a doua rulare diferă`);
      semn.push(!r.ok ? 'refuz' : r.cai === cai ? 'neschimbat' : `schimbat, ${r.cai.length} contururi`);
    }
    // (b) Independența de poziție (felul rezultatului și numărul contururilor; refuzul doar pe cazurile prost condiționate).
    if (c.hartie.rezultat !== 'oricare' && c.hartie.rezultat !== 'liber' && new Set(semn).size > 1) pr.push(`pozițiile dau rezultate diferite: ${semn.join(' / ')}`);
    assert.deepEqual(pr, []);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (c) Grupurile și τ.

test('(c) neschimbat întoarce chiar intrarea (același obiect), cu info.neschimbat; altfel un obiect nou', () => {
  const a = [drept(0, 0, 10, 10)];
  const r = app(a) as Rez;
  assert.ok(r.ok && r.cai === a && r.info['neschimbat'] === true);
  const gol: CaleN[] = [];
  const r0 = app(gol) as Rez;
  assert.ok(r0.ok && r0.cai === gol && r0.info['neschimbat'] === true);
  const b = [drept(0, 0, 10, 10), drept(5, 5, 10, 10)];
  const rb = app(b) as Rez;
  assert.ok(rb.ok && rb.cai !== b && rb.info['neschimbat'] === false);
});

test('(c) τ (§4): 1e-10 · diagonala + 64 · ulp, același la 0, la 2 440 și la 10⁶ mm (cel mult cu termenul ulp), ≤ TOLERANTA_IMPORT', () => {
  const t: number[] = [];
  for (const [dx, dy] of POZITII) {
    const r = app(muta([drept(0, 0, 30, 40), drept(10, 10, 30, 40)], dx, dy)) as Rez;
    assert.ok(r.ok);
    t.push(r.info['tau'] as number);
  }
  // Cutia [0, 40] × [0, 50] mutată: D = √(40² + 50²) = 64,03 mm; M = max(dx + 40, dy + 50).
  const D = Math.hypot(40, 50);
  for (const [i, [dx, dy]] of POZITII.entries()) {
    const M = Math.max(dx + 40, dy + 50);
    const e = Math.floor(Math.log2(M));
    const ulp = 2 ** (e - 52);
    assert.ok(Math.abs((t[i] as number) - (1e-10 * D + 64 * ulp)) <= 1e-12 * (t[i] as number), `${t[i]} la ${dx}`);
    assert.ok((t[i] as number) <= 1e-6);
  }
});

test('(c) grupurile (§3): două forme mici departe una de alta, plus o foaie: trei grupuri, fiecare cu τ-ul lui', () => {
  const cai = [drept(0, 0, 2400, 1200), drept(2500, 0, 1e-3, 1e-3), drept(2500 + 5e-4, 5e-4, 1e-3, 1e-3), drept(3000, 0, 1e-3, 1e-3), drept(3000 + 5e-4, 5e-4, 1e-3, 1e-3)];
  const r = app(cai) as Rez;
  assert.ok(r.ok);
  assert.equal(r.info['grupuri'], 3);
  assert.equal(r.cai.length, 3);
  assert.deepEqual(judecaNormalizarea(cai, 'nonzero', r, { asteptat: 'schimbat' }).probleme, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (d) Refuzurile.

test('(d) intrările invalide: refuz `intrare`, fără excepție', () => {
  const pr: string[] = [];
  for (const x of intrariInvalide()) {
    const r = app(x.cai);
    if ('aruncat' in r) { pr.push(`${x.nume}: a aruncat ${r.aruncat}`); continue; }
    if (r.ok) { pr.push(`${x.nume}: acceptată (ok, ${r.cai.length} contururi)`); continue; }
    if (codMotiv(r.motiv) !== 'intrare') pr.push(`${x.nume}: refuzată cu ${String(r.motiv)}`);
  }
  assert.deepEqual(pr, []);
});

test('(d) nimic nu aruncă: 400 de intrări stricate la întâmplare (numere uriașe, NaN, tipuri amestecate, structuri greșite)', () => {
  const r = rng(4242);
  const valori: unknown[] = [0, -0, 1e300, -1e300, 1e-300, Number.NaN, Infinity, 'x', null, undefined, {}, [], true, 5, -7.5];
  const alege = <T>(l: readonly T[]): T => l[Math.floor(r() * l.length)] as T;
  const pr: string[] = [];
  for (let k = 0; k < 400; k++) {
    const cai: unknown[] = [];
    for (let i = 0; i < 1 + Math.floor(r() * 3); i++) {
      const v: unknown[] = [];
      // 0 sau 2…5 vârfuri (calea cu un singur vârf e constatarea K1, judecată separat).
      const nv = r() < 0.15 ? 0 : 2 + Math.floor(r() * 4);
      for (let j = 0; j < nv; j++) {
        const f = r();
        const num = (): unknown => (r() < 0.8 ? Math.floor(r() * 20) : alege(valori));
        v.push(f < 0.1 ? alege(valori) : { p: r() < 0.9 ? { x: num(), y: num() } : alege(valori), s: r() < 0.4 ? { tip: 'L' } : r() < 0.6 ? { tip: 'A', bulge: r() < 0.8 ? 0.5 : alege(valori) } : r() < 0.9 ? { tip: 'C', c1: { x: num(), y: num() }, c2: { x: num(), y: num() } } : { tip: alege(['Q', 'Z', 1, null]) } });
      }
      cai.push(r() < 0.95 ? v : alege(valori));
    }
    const intrare = r() < 0.97 ? cai : alege(valori);
    const x = app(intrare);
    const inv = problemaIntrare(intrare);
    if ('aruncat' in x) pr.push(`${k}: ${x.aruncat}`);
    else if (!x.ok && codMotiv(x.motiv) === null) pr.push(`${k}: refuz fără cod (${String(x.motiv)})`);
    else if (!x.ok && inv !== null && codMotiv(x.motiv) !== 'intrare') pr.push(`${k}: invalidă, refuzată cu ${String(x.motiv)}`);
    else if (x.ok && inv !== null) pr.push(`${k}: invalidă (${inv}), dar ok`);
    else if (x.ok && x.cai !== intrare && problemaIntrare(x.cai) !== null) pr.push(`${k}: ieșirea invalidă: ${String(problemaIntrare(x.cai))}`);
  }
  assert.deepEqual(pr.slice(0, 10), []);
});

test('(d) bugetul (§8, §10): un poligon aleator de 1 000 de vârfuri (sute de mii de intersecții): refuz `plafon`, repede, fără excepție', () => {
  for (const n of [1000, 4000]) {
    const r = rng(n), v: VarfN[] = [];
    for (let i = 0; i < n; i++) v.push(L(100 * r(), 100 * r()));
    const t0 = performance.now();
    const x = app([v]);
    const t = performance.now() - t0;
    assert.ok(!('aruncat' in x), `a aruncat`);
    assert.ok(!x.ok, `${n}: acceptat`);
    assert.equal(codMotiv(x.motiv), 'plafon', String(x.motiv));
    assert.ok(t < 10_000, `${n}: ${t.toFixed(0)} ms`);
  }
});

test('(d) refuzurile cazurilor prost condiționate poartă un cod (din cele zece) și un loc', () => {
  for (const c of CORPUS.filter((x) => x.familie === 'adversar')) {
    const r = app(c.cai);
    assert.ok(!('aruncat' in r), c.nume);
    if (!r.ok) {
      assert.notEqual(codMotiv(r.motiv), null, `${c.nume}: ${r.motiv}`);
      assert.ok(r.motiv.length > codMotiv(r.motiv)!.length + 2, `${c.nume}: motivul fără loc: ${r.motiv}`);
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// (e) Forme aleatoare (cu sămânță).

for (let start = 1; start <= 240; start += 60) {
  test(`(e) forme aleatoare: semințele ${start}…${start + 59} (la 0, 2 440 și 10⁶ mm)`, () => {
    const pr: string[] = [];
    let refuzuri = 0;
    for (let s = start; s < start + 60; s++) {
      const [dx, dy] = POZITII[s % 3] as readonly [number, number];
      const cai = muta(formaAleatoare(s), dx, dy);
      const r = app(cai);
      if ('aruncat' in r) { pr.push(`${s}: a aruncat ${r.aruncat}`); continue; }
      if (!r.ok) refuzuri++;
      for (const p of judecaNormalizarea(cai, 'nonzero', r, { refuzPermis: true, samanta: s }).probleme) pr.push(`${s} @${dx}: ${p}`);
    }
    // Refuzurile sunt permise (grila rară face cazuri prost condiționate), dar rare.
    assert.ok(refuzuri <= 6, `${refuzuri} refuzuri din 60`);
    assert.deepEqual(pr.slice(0, 12), []);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (f) Supa de glife.

for (const [dx, dy] of POZITII) {
  test(`(f) supa de glife Open Sans suprapuse (sute de contururi), la ${dx} mm`, () => {
    const cai = muta(supa(), dx, dy);
    assert.ok(cai.length >= 250 && cai.reduce((s, c) => s + c.length, 0) >= 4000);
    const t0 = performance.now();
    const r = app(cai);
    const t = performance.now() - t0;
    assert.ok(!('aruncat' in r) && r.ok, JSON.stringify(r).slice(0, 200));
    assert.deepEqual(judecaNormalizarea(cai, 'nonzero', r, { asteptat: 'schimbat', densitate: 0.3, samanta: 7 }).probleme, []);
    // §10: ~1 s pentru 10 212 vârfuri; supa are ~4 900.
    assert.ok(t < 5000, `${t.toFixed(0)} ms`);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (g) Controalele negative.

type VarfM = { p: { x: number; y: number }; s: { tip: string; bulge?: number; c1?: { x: number; y: number }; c2?: { x: number; y: number } } };
const copie = <T>(x: T): T => structuredClone(x);

function controlNegativ(nume: string, numeCaz: string, strica: (r: { cai: VarfM[][]; info: Record<string, unknown> }, intrare: CaleN[]) => void, la: readonly [number, number] = [0, 0], doarJudecata = false): void {
  test(`(g) control negativ: ${nume} (${numeCaz})`, () => {
    const c = caz(numeCaz);
    const cai = muta(c.cai, la[0], la[1]);
    const r = app(cai, c.regula ?? 'nonzero') as Rez;
    assert.ok(r.ok);
    const opt = optiuni(c);
    assert.deepEqual(judecaNormalizarea(cai, c.regula ?? 'nonzero', r, opt).probleme, [], 'ieșirea nestricată trebuie să treacă');
    // Cazul de control nu are atingeri declarate: o abatere de 1e-9 nu se poate ascunde sub τ.
    if (r.cai !== cai) assert.equal(Number(r.info['tangente']) + Number(r.info['noduriContopite']), 0, 'cazul de control are atingeri');
    const s = r.cai === cai ? { cai: copie(cai) as unknown as VarfM[][], info: { ...r.info } } : { cai: copie(r.cai) as unknown as VarfM[][], info: { ...r.info } };
    strica(s, cai);
    const st = { ok: true, cai: s.cai, info: s.info };
    // `doarJudecata`: fără hârtie (aria, numărul contururilor), ca o singură verificare a oracolului să poarte controlul.
    const pr = [...judecaNormalizarea(cai, c.regula ?? 'nonzero', st, opt).probleme, ...(doarJudecata ? [] : judecaHartiaN({ cai, hartie: c.hartie }, st))];
    assert.ok(pr.length > 0, 'stricarea a trecut neobservată');
  });
}
/** Primul vârf al ieșirii care nu e vârf-sursă (o intersecție). */
function intersectie(r: { cai: VarfM[][] }, intrare: CaleN[]): VarfM {
  const sursa = new Set(intrare.flatMap((c) => c.map((v) => `${v.p.x},${v.p.y}`)));
  for (const c of r.cai) for (const v of c) if (!sursa.has(`${v.p.x},${v.p.y}`)) return v;
  throw new Error('nicio intersecție');
}
function primul(r: { cai: VarfM[][] }, tip: string): VarfM {
  for (const c of r.cai) for (const v of c) if (v.s.tip === tip) return v;
  throw new Error(`niciun ${tip}`);
}

controlNegativ('un vârf de intersecție mutat cu 1e-9 mm', 'pătrate suprapuse în colț', (r, i) => { intersectie(r, i).p.x += 1e-9; });
controlNegativ('un vârf de intersecție mutat cu 1e-8 mm', 'pentagrama: centrul', (r, i) => { intersectie(r, i).p.y += 1e-8; });
controlNegativ('un vârf-sursă mutat cu 1e-9 mm de-a lungul laturii lui', 'pătrate suprapuse în colț', (r) => { const v = (r.cai[0] as VarfM[]).find((x) => x.p.x === 0 && x.p.y === 0) as VarfM; v.p.x += 1e-9; });
controlNegativ('un vârf de intersecție a două arce mutat cu 1e-9 mm', 'cercuri suprapuse (același sens)', (r, i) => { intersectie(r, i).p.y -= 1e-9; });
controlNegativ('un punct de control al unei cubice mutat cu 1e-9 mm', 'bloburi aleatoare (8)', (r) => { (primul(r, 'C').s.c1 as { x: number }).x += 1e-9; });
controlNegativ('un punct de control mutat cu 1e-9 mm, la 2 440 mm', 'bloburi aleatoare (8)', (r) => { (primul(r, 'C').s.c2 as { y: number }).y -= 1e-9; }, [2440, 1220]);
controlNegativ('c1 și c2 schimbate între ele pe o cubică', 'bloburi aleatoare (8)', (r) => { const v = primul(r, 'C'); const t = v.s.c1 as { x: number; y: number }; v.s.c1 = v.s.c2 as { x: number; y: number }; v.s.c2 = t; });
controlNegativ('bulge cu semnul întors', 'cercuri suprapuse (același sens)', (r) => { const v = primul(r, 'A'); v.s.bulge = -(v.s.bulge as number); });
controlNegativ('bulge × (1 + 1e-10)', 'cercuri suprapuse (același sens)', (r) => { const v = primul(r, 'A'); v.s.bulge = (v.s.bulge as number) * (1 + 1e-10); });
controlNegativ('arcul complementar pe același cerc (bulge → −1/bulge)', 'trei cercuri suprapuse în lanț', (r) => { const v = primul(r, 'A'); v.s.bulge = -1 / (v.s.bulge as number); });
controlNegativ('un contur lipsă', 'două perechi de pătrate', (r) => { r.cai.pop(); });
controlNegativ('o gaură păstrată unde nonzero umple (cercul mic, întors)', 'cercuri concentrice în același sens', (r) => { r.cai.push(inv(cerc(0, 0, 12)) as unknown as VarfM[]); r.info['contururiIesire'] = r.cai.length; });
controlNegativ('o muchie coincidentă în plus (o țepușă dus-întors pe o latură)', 'pătrate suprapuse în colț', (r) => {
  const c = r.cai[0] as VarfM[];
  const k = c.findIndex((x) => x.p.x === 0 && x.p.y === 0);
  c.splice(k + 1, 0, { p: { x: 4, y: 0 }, s: { tip: 'L' } }, { p: { x: 0, y: 0 }, s: { tip: 'L' } });
});
controlNegativ('un contur dublat', 'pentagrama: centrul', (r) => { r.cai.push(copie(r.cai[0] as VarfM[])); r.info['contururiIesire'] = r.cai.length; });
controlNegativ('un contur întors (umplerea în dreapta)', 'două perechi de pătrate', (r) => { r.cai[0] = inv(r.cai[0] as unknown as VarfN[]) as unknown as VarfM[]; });
controlNegativ('un segment nul (vârf dublat)', 'pentagrama: centrul', (r) => { const c = r.cai[0] as VarfM[]; c.splice(1, 0, copie(c[1] as VarfM)); });
controlNegativ('o linie scrisă ca o cubică dreaptă', 'pătrate suprapuse în colț', (r) => {
  const c = r.cai[0] as VarfM[];
  const a = c[0] as VarfM, b = c[1] as VarfM;
  a.s = { tip: 'C', c1: { x: a.p.x + (b.p.x - a.p.x) / 3, y: a.p.y + (b.p.y - a.p.y) / 3 }, c2: { x: a.p.x + (2 * (b.p.x - a.p.x)) / 3, y: a.p.y + (2 * (b.p.y - a.p.y)) / 3 } };
});
controlNegativ('toată ieșirea mutată cu 1e-9 mm', 'pentagrama: centrul', (r) => { for (const c of r.cai) for (const v of c) v.p.x += 1e-9; });
controlNegativ('un contur cu un singur vârf adăugat', 'pătrate suprapuse în colț', (r) => { r.cai.push([{ p: { x: 3, y: 3 }, s: { tip: 'L' } }]); r.info['contururiIesire'] = r.cai.length; });
controlNegativ('info.grupuri greșit', 'două perechi de pătrate', (r) => { r.info['grupuri'] = 1; });
controlNegativ('info.tau de 10 ori mai mare', 'pătrate suprapuse în colț', (r) => { r.info['tau'] = (r.info['tau'] as number) * 10; });
controlNegativ('info.neschimbat mințit', 'pătrate suprapuse în colț', (r) => { r.info['neschimbat'] = true; });
controlNegativ('o copie în loc de același obiect (neschimbat)', 'un singur pătrat', () => undefined);
controlNegativ('ieșirea vidă în loc de reuniune', 'cercuri suprapuse (același sens)', (r) => { r.cai.length = 0; r.info['contururiIesire'] = 0; });
controlNegativ('o atingere nedeclarată: un vârf-sursă mutat cu 1e-9 mm, la 2 440 mm', 'pentagrama: centrul', (r) => { (r.cai[0] as VarfM[])[0]!.p.y += 1e-9; }, [2440, 1220]);

// Controalele care poartă câte o singură verificare (tabelul sabotajelor): fără hârtie, doar regiunea / orientarea /
// baleiajul / numărul vârfurilor le pot prinde.
controlNegativ('fără hârtie: o gaură păstrată unde nonzero umple (doar regiunea)', 'cercuri concentrice în același sens', (r) => { r.cai.push(inv(cerc(0, 0, 12)) as unknown as VarfM[]); r.info['contururiIesire'] = r.cai.length; }, [0, 0], true);
controlNegativ('fără hârtie: un contur întors (doar umplerea în stânga)', 'bloburi aleatoare (8)', (r) => { r.cai[0] = inv(r.cai[0] as unknown as VarfN[]) as unknown as VarfM[]; }, [0, 0], true);
// Arcul (r = 30, coarda ~44): bulge + 1e-11 mută punctele arcului cu ~3e-10 mm (sub 4εv ≈ 4,7e-10), dar baleiajul cu
// ~8e-10 mm × r: îl prinde doar verificarea unghiurilor sursei.
controlNegativ('fără hârtie: bulge + 1e-11 (doar baleiajul față de unghiurile sursei)', 'cercuri suprapuse (același sens)', (r) => { const v = primul(r, 'A'); v.s.bulge = (v.s.bulge as number) + 1e-11; }, [0, 0], true);
controlNegativ('fără hârtie: un contur fără vârfuri (doar „cel puțin 2 vârfuri”)', 'pătrate suprapuse în colț', (r) => { r.cai.push([]); r.info['contururiIesire'] = r.cai.length; }, [0, 0], true);

test('(g) hârtia prinde o arie greșită și un număr greșit de contururi (fără judecata oracolului)', () => {
  const c = caz('pătrate suprapuse în colț');
  const r = app(c.cai) as Rez;
  assert.ok(r.ok);
  assert.deepEqual(judecaHartiaN({ cai: c.cai, hartie: c.hartie }, r), []);
  assert.ok(judecaHartiaN({ cai: c.cai, hartie: { ...c.hartie, arie: 176 } }, r).length > 0);
  assert.ok(judecaHartiaN({ cai: c.cai, hartie: { ...c.hartie, contururi: 2 } }, r).length > 0);
});

// §6 relaxat (amendamentul K7): o schimbare a unei intrări deja evenodd trece doar cu un martor la τ.
test('(g) control negativ, §6 relaxat: o intrare groasă, deja evenodd, fără martor, „schimbată” într-o copie (startul rotit) e prinsă', () => {
  for (const cai of [[drept(0, 0, 10, 10)], [cerc(0, 0, 30), inv(cerc(0, 0, 12))], [[L(0, 0), L(20, 10), L(20, 0), L(0, 10)]]] as VarfN[][][]) {
    assert.equal(martorTau(cai), null);
    const copieSchimbata = cai.map((c) => [...c.slice(1), c[0] as VarfN]);
    const r = { ok: true, cai: copieSchimbata, info: { neschimbat: false, contururiIntrare: cai.length, contururiIesire: cai.length, grupuri: 1, tau: grupuri(cai)[0]?.tau ?? 0, intersectii: 0, tangente: 0, noduriContopite: 0, muchiiScoase: 0, suprapuneri: 0, lucru: 0 } };
    const pr = judecaNormalizarea(cai, 'nonzero', r, {}).probleme;
    assert.ok(pr.some((p) => p.startsWith('§6')), JSON.stringify(pr));
  }
});
test('(g) control negativ, §7: un contur care trece de două ori prin același vârf (două pătrate care se ating, legate) e prins', () => {
  // Intrarea cere o schimbare (pătratul A dublat: muchii coincidente); ieșirea corectă: două contururi care se ating în (10, 10).
  const cai = [drept(0, 0, 10, 10), drept(10, 10, 10, 10), drept(0, 0, 10, 10)];
  const r = app(cai) as Rez;
  assert.ok(r.ok);
  assert.deepEqual(judecaNormalizarea(cai, 'nonzero', r, {}).probleme, [], 'ieșirea aplicației trece');
  const legat = [[L(0, 0), L(10, 0), L(10, 10), L(20, 10), L(20, 20), L(10, 20), L(10, 10), L(0, 10)]];
  const st = { ok: true, cai: legat, info: { ...r.info, contururiIesire: 1 } };
  const pr = judecaNormalizarea(cai, 'nonzero', st, {}).probleme;
  assert.ok(pr.some((p) => p.includes('de două ori')), JSON.stringify(pr));
});

test('(g) controlul pozitiv, §6 relaxat: triunghiul K7 (martor la τ) poate ieși gol', () => {
  const cai = [[L(0, 0), L(10, 0), L(20, -1e-9)]];
  assert.notEqual(martorTau(cai), null);
  const r = { ok: true, cai: [], info: { neschimbat: false, contururiIntrare: 1, contururiIesire: 0, grupuri: 1, tau: (grupuri(cai)[0] as { tau: number }).tau, intersectii: 0, tangente: 0, noduriContopite: 0, muchiiScoase: 3, suprapuneri: 0, lucru: 0 } };
  assert.deepEqual(judecaNormalizarea(cai, 'nonzero', r, {}).probleme, []);
});
test('(g) martorul la τ: vârf lângă un segment străin, segmente apropiate fără să se taie; nu și încrucișările, nici vârfurile comune', () => {
  assert.notEqual(martorTau([[L(0, 0), L(10, 0), L(20, -1e-9)]]), null);
  const a = roteste(cerc(0, 0, 10), 0, 0, Math.PI / 4), b = roteste(cerc(20 + 1e-9, 0, 10), 20 + 1e-9, 0, Math.PI / 4);
  assert.match(String(martorTau([a, b])), /segmentele/);
  assert.equal(martorTau([a, roteste(cerc(20 + 1e-6, 0, 10), 20 + 1e-6, 0, Math.PI / 4)]), null);
  assert.equal(martorTau([a, roteste(cerc(20 - 1e-3, 0, 10), 20 - 1e-3, 0, Math.PI / 4)]), null);
  assert.equal(martorTau([drept(0, 0, 10, 10), drept(10, 10, 10, 10)]), null);
  assert.equal(martorTau([cerc(0, 0, 20), cerc(40, 0, 20)]), null);
});

test('(g) controale negative pe refuz: un refuz fără cod, un refuz unde hârtia cere o ieșire, ok pe o intrare invalidă', () => {
  const c = caz('pătrate suprapuse în colț');
  assert.ok(judecaNormalizarea(c.cai, 'nonzero', { ok: false, motiv: 'ceva' }, { asteptat: 'schimbat' }).probleme.length > 0);
  assert.ok(judecaNormalizarea(c.cai, 'nonzero', { ok: false, motiv: 'plafon: x' }, { asteptat: 'schimbat' }).probleme.length > 0);
  assert.equal(judecaNormalizarea(c.cai, 'nonzero', { ok: false, motiv: 'plafon: x' }, { refuzPermis: true }).probleme.length, 0);
  const invalid = [[L(0, 0)]];
  assert.ok(judecaNormalizarea(invalid, 'nonzero', { ok: true, cai: invalid, info: {} }, {}).probleme.length > 0);
  assert.ok(judecaNormalizarea(invalid, 'nonzero', { ok: false, motiv: 'plafon: x' }, {}).probleme.length > 0);
  assert.equal(judecaNormalizarea(invalid, 'nonzero', { ok: false, motiv: 'intrare: x' }, {}).probleme.length, 0);
});

test('(g) controlul pozitiv: un vârf de intersecție mutat cu 1e-12 mm încă trece (oracolul nu e prea strict)', () => {
  const c = caz('pătrate suprapuse în colț');
  const r = app(c.cai) as Rez;
  assert.ok(r.ok);
  const s = copie(r) as unknown as { cai: VarfM[][]; info: Record<string, unknown> };
  intersectie(s, c.cai as CaleN[]).p.x += 1e-12;
  assert.deepEqual(judecaNormalizarea(c.cai, 'nonzero', { ok: true, ...s }, optiuni(c)).probleme, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (K) CONSTATĂRILE: pică până se repară aplicația sau până când ADR-ul spune altfel (motivul lângă fiecare, în cazuri).

test('(K) constatările deschise ale normalizării (12.10: K1 reparată; lista rămâne pentru cele noi)', () => {
  assert.deepEqual(constatariNonzero().map((k) => k.nume), []);
});
for (const k of constatariNonzero()) {
  test(`(K) CONSTATARE: ${k.nume}`, () => {
    assert.notEqual(problemaIntrare(k.cai), null, 'oracolul o vede invalidă');
    const r = app(k.cai);
    assert.ok(!('aruncat' in r), 'a aruncat');
    assert.equal(r.ok ? `ok (${r.cai.length} contururi, neschimbat ${String(r.info['neschimbat'])})` : codMotiv(r.motiv), k.cod, k.motiv);
  });
}
