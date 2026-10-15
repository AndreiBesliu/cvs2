/**
 * Offsetul DESCHIS (ADR 0037 §5, felia 2.3c-4) judecat de oracolul lui independent (`test/oracles/offset-deschis.ts`,
 * scris doar din ADR 0037 §5, cu precizările 2.3c-4, și din „Ce verifică oracolul”), pe cazurile din
 * `test/oracles/offset-deschis.cazuri.ts`:
 * - (a) oracolul singur, fără aplicație: valorile pe hârtie 1 și 3–9 (bucățile, `neatins`, „nu încape”, lungimea ideală
 *   a cazului 8, oglindirea), clasificarea intrărilor (corpusul e de decalat, refuzatele sunt de refuzat), martorii
 *   respinși și controalele primite;
 * - (b) aplicația pe hârtie: aceleași bucăți, vârf cu vârf, și aceleași porțiuni neatinse; refuzul „nu încape” al U-ului;
 *   cazul 8: offsetul corect (o bucată) sau „offsetul a eșuat”, niciodată „nu încape”;
 * - (c) aplicația pe tot corpusul (ambele părți, 3 raze): offsetul corect sau un refuz cu motiv, niciodată un traseu
 *   greșit și niciodată o excepție; „nu încape” doar unde oracolul n-are niciun punct ideal valid;
 * - (d) intrările de nedecalat: refuz cu motiv (la atingeri, motivul din contract), fără excepție;
 * - (e) `verificaIesireDeschisa`: respinge fiecare martor (ieșire greșită construită aici) și primește fiecare control,
 *   cu `neatins` de pe hârtie; ieșirea goală e „nu încape” doar fără puncte ideale valide;
 * - (f) rezumatul: refuzurile pe familii (cifra intră în fișă; nu e un eșec).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offsetDeschis, verificaIesireDeschisa } from '../../src/geom/offset.ts';
import type { Contur } from '../../src/geom/contur.ts';
import {
  MOTIV_ESUAT, MOTIV_NU_INCAPE, comparaNeatins, curata, idealDeschis, judeca, motivRefuzIntrare, traseuIdeal, verificaBucatile,
  type ConturD, type RezultatD,
} from '../oracles/offset-deschis.ts';
import {
  CORPUS, HARTIE, REFUZATE, TOLERANTA_HARTIE, controale, martori, type Asteptare, type VarfAsteptat,
} from '../oracles/offset-deschis.cazuri.ts';

/** Conturul oracolului e, structural, conturul aplicației; dacă tipurile s-ar despărți, compilatorul o spune aici. */
const caContur = (c: ConturD): Contur => c;

type Rulare = RezultatD | { readonly aruncat: unknown };

function ruleaza(c: ConturD, d: number): Rulare {
  try {
    return offsetDeschis(caContur(c), d);
  } catch (e) {
    return { aruncat: e };
  }
}

const fx = (n: number): string => n.toFixed(4);
const TOLERANTA_BULGE = 1e-4;

/** Bucățile primite față de cele de pe hârtie, vârf cu vârf. */
function comparaCuHartia(bucati: readonly ConturD[], asteptat: Extract<Asteptare, { fel: 'bucati' }>): string[] {
  const p: string[] = [];
  if (bucati.length !== asteptat.bucati.length) return [`${bucati.length} bucăți, pe hârtie ${asteptat.bucati.length}`];
  asteptat.bucati.forEach((vs: readonly VarfAsteptat[], b) => {
    const primit = bucati[b] as ConturD;
    if (primit.varfuri.length !== vs.length) {
      p.push(`bucata ${b}: ${primit.varfuri.length} vârfuri, pe hârtie ${vs.length}: ${primit.varfuri.map((x) => `(${fx(x.p.x)}, ${fx(x.p.y)})`).join(' ')}`);
      return;
    }
    vs.forEach((a, i) => {
      const x = primit.varfuri[i] as ConturD['varfuri'][number];
      if (Math.hypot(x.p.x - a.x, x.p.y - a.y) > TOLERANTA_HARTIE) p.push(`bucata ${b}, vârful ${i}: (${fx(x.p.x)}, ${fx(x.p.y)}), pe hârtie (${a.x}, ${a.y})`);
      if (i < vs.length - 1) {
        const bg = x.s.tip === 'A' ? x.s.bulge : x.s.tip === 'L' ? 0 : Number.NaN;
        if (!(Math.abs(bg - a.bulge) <= TOLERANTA_BULGE)) p.push(`bucata ${b}, segmentul ${i}: bulge ${bg}, pe hârtie ${a.bulge}`);
      }
    });
  });
  return p;
}

function comparaNeatinsCuHartia(neatins: readonly { de: number; pana: number; lungime: number }[], asteptat: Extract<Asteptare, { fel: 'bucati' }>): string[] {
  if (neatins.length !== asteptat.neatins.length) return [`${neatins.length} porțiuni neatinse, pe hârtie ${asteptat.neatins.length}: ${neatins.map((x) => `[${fx(x.de)}, ${fx(x.pana)}]`).join(' ')}`];
  const p: string[] = [];
  asteptat.neatins.forEach((a, i) => {
    const x = neatins[i] as { de: number; pana: number; lungime: number };
    if (Math.abs(x.de - a.de) > TOLERANTA_HARTIE || Math.abs(x.pana - a.pana) > TOLERANTA_HARTIE) p.push(`neatins[${i}] = [${fx(x.de)}, ${fx(x.pana)}], pe hârtie [${a.de}, ${a.pana}]`);
    if (Math.abs(x.lungime - (a.pana - a.de)) > 2 * TOLERANTA_HARTIE) p.push(`neatins[${i}]: lungimea ${fx(x.lungime)}, pe hârtie ${fx(a.pana - a.de)}`);
  });
  return p;
}

// ---------------------------------------------------------------------------------------------------------------------
// (a) Oracolul singur.
// ---------------------------------------------------------------------------------------------------------------------

for (const h of HARTIE) {
  test(`(a) oracolul pe hârtie: ${h.nume}`, () => {
    assert.equal(motivRefuzIntrare(h.cale, h.d), null, 'intrarea de pe hârtie e de decalat');
    const ideal = idealDeschis(h.cale, h.d);
    const a = h.asteptat;
    if (a.fel === 'refuz') {
      assert.equal(ideal.lungimeValida, 0, `oracolul are ${ideal.lungimeValida} mm de puncte ideale valide`);
      assert.deepEqual(traseuIdeal(h.cale, h.d), []);
      return;
    }
    if (a.fel === 'corect-sau-esuat') {
      assert.ok(Math.abs(ideal.lungimeValida - a.lungimeIdeala) <= 0.01, `lungimea ideală ${ideal.lungimeValida}, pe hârtie ${a.lungimeIdeala}`);
      assert.equal(traseuIdeal(h.cale, h.d).length, a.bucati);
      return;
    }
    const hartie: ConturD[] = a.bucati.map((vs) => ({
      inchis: false,
      varfuri: vs.map((x, i) => ({ p: { x: x.x, y: x.y }, s: x.bulge !== 0 && i < vs.length - 1 ? { tip: 'A', bulge: x.bulge } : { tip: 'L' } })),
    }));
    // Bucățile de pe hârtie (rotunjite la 3 zecimale) sunt o ieșire corectă pentru oracol, iar traseul lui ideal are
    // același număr de bucăți și aceleași porțiuni neatinse.
    assert.deepEqual(verificaBucatile(ideal, hartie), []);
    assert.equal(traseuIdeal(h.cale, h.d).length, a.bucati.length);
    assert.deepEqual(comparaNeatinsCuHartia(ideal.neatins, a), []);
  });
}

test('(a) oracolul pe hârtie: oglindirea inversează partea (stânga XOR det < 0 = dreapta)', () => {
  const h = HARTIE.find((x) => x.nume.startsWith('9.'));
  assert.ok(h);
  assert.equal(h.d, -3);
  assert.deepEqual(h.cale.varfuri.map((x) => x.p), [{ x: 150, y: 50 }, { x: 50, y: 50 }]);
});

test('(a) oracolul: corpusul e de decalat, refuzatele sunt de refuzat', () => {
  const probleme: string[] = [];
  for (const c of CORPUS) {
    for (const d of c.distante) {
      const m = motivRefuzIntrare(c.cale, d);
      if (m !== null) probleme.push(`${c.nume}, d = ${d}: oracolul ar refuza („${m}”)`);
    }
  }
  for (const r of REFUZATE) if (motivRefuzIntrare(r.cale, r.d) === null) probleme.push(`${r.nume}: oracolul n-ar refuza`);
  assert.deepEqual(probleme, []);
});

test('(a) oracolul respinge fiecare martor negativ', () => {
  const trecuti = martori().filter((m) => judeca(m.cale, m.d, m.rezultat).probleme.length === 0).map((m) => m.nume);
  assert.deepEqual(trecuti, []);
});

test('(a) oracolul primește fiecare control (ieșire corectă)', () => {
  const probleme: string[] = [];
  for (const c of controale()) {
    const ideal = idealDeschis(c.cale, c.d);
    for (const p of judeca(c.cale, c.d, { ok: true, bucati: c.bucati, neatins: ideal.neatins }).probleme) probleme.push(`${c.nume}: ${p}`);
  }
  assert.deepEqual(probleme, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (b) Aplicația pe hârtie.
// ---------------------------------------------------------------------------------------------------------------------

for (const h of HARTIE) {
  test(`(b) aplicația pe hârtie: ${h.nume}`, () => {
    const r = ruleaza(h.cale, h.d);
    assert.ok(!('aruncat' in r), `a aruncat: ${'aruncat' in r ? String(r.aruncat) : ''}`);
    const a = h.asteptat;
    if (a.fel === 'refuz') {
      assert.equal(r.ok, false, 'trebuia refuzat');
      if (!r.ok) assert.ok(r.motiv.includes(a.motiv), `motivul „${r.motiv}”, nu „${a.motiv}”`);
      return;
    }
    if (a.fel === 'corect-sau-esuat') {
      if (r.ok) {
        assert.equal(r.bucati.length, a.bucati, 'o singură bucată');
        assert.deepEqual(judeca(h.cale, h.d, r).probleme, []);
      } else {
        assert.ok(r.motiv.startsWith(MOTIV_ESUAT) && !r.motiv.includes('nu încape'), `refuzul trebuie să fie „${MOTIV_ESUAT} …”, nu „${r.motiv}”`);
      }
      return;
    }
    assert.ok(r.ok, `refuzat: „${r.ok ? '' : r.motiv}”`);
    if (!r.ok) return;
    assert.deepEqual(comparaCuHartia(r.bucati, a), []);
    assert.deepEqual(comparaNeatinsCuHartia(r.neatins, a), []);
    assert.deepEqual(judeca(h.cale, h.d, r).probleme, []);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (c) Aplicația pe corpus.
// ---------------------------------------------------------------------------------------------------------------------

type Numarare = { incercate: number; refuzate: string[]; nuIncape: number; laReincercare: string[] };
const familii = new Map<string, Numarare>();
const numarare = (f: string): Numarare => {
  let n = familii.get(f);
  if (!n) {
    n = { incercate: 0, refuzate: [], nuIncape: 0, laReincercare: [] };
    familii.set(f, n);
  }
  return n;
};

for (const c of CORPUS) {
  test(`(c) corpus, ${c.familie}: ${c.nume}`, () => {
    const probleme: string[] = [];
    const n = numarare(c.familie);
    for (const d of c.distante) {
      n.incercate++;
      const r = ruleaza(c.cale, d);
      if ('aruncat' in r) {
        probleme.push(`d = ${d}: a aruncat ${String(r.aruncat)}`);
        continue;
      }
      const j = judeca(c.cale, d, r);
      for (const p of j.probleme) probleme.push(`d = ${d}: ${p}`);
      if (j.probleme.length === 0 && j.doarLaReincercare) n.laReincercare.push(`${c.nume}, d = ${d}: ${r.ok ? `traseu cu ${r.bucati.length} bucăți` : `„${r.motiv}”`}`);
      if (!r.ok && j.probleme.length === 0) {
        if (r.motiv.includes('nu încape')) n.nuIncape++;
        else n.refuzate.push(`${c.nume}, d = ${d}: „${r.motiv}”`);
      }
    }
    assert.deepEqual(probleme, []);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (d) Intrările de nedecalat.
// ---------------------------------------------------------------------------------------------------------------------

test('(d) intrările de nedecalat: refuz cu motiv, niciodată o excepție', () => {
  const probleme: string[] = [];
  for (const x of REFUZATE) {
    const r = ruleaza(x.cale, x.d);
    if ('aruncat' in r) probleme.push(`${x.nume}: a aruncat ${String(r.aruncat)}`);
    else if (r.ok) probleme.push(`${x.nume}: acceptat, cu ${r.bucati.length} bucăți`);
    else if (r.motiv.trim() === '') probleme.push(`${x.nume}: refuzat fără motiv`);
    else if (x.motivContine !== undefined && !r.motiv.includes(x.motivContine)) probleme.push(`${x.nume}: motivul „${r.motiv}” nu e cel din contract („${x.motivContine}”)`);
  }
  assert.deepEqual(probleme, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (e) Verificarea aplicației pe ieșiri construite aici.
// ---------------------------------------------------------------------------------------------------------------------

type Verificare = ReturnType<typeof verificaIesireDeschisa>;
function verifica(c: ConturD, d: number, bucati: readonly ConturD[]): Verificare | { readonly aruncat: unknown } {
  try {
    return verificaIesireDeschisa(caContur(curata(c)), d, bucati.map(caContur));
  } catch (e) {
    return { aruncat: e };
  }
}

test('(e) verificaIesireDeschisa respinge fiecare martor negativ', () => {
  const trecuti: string[] = [];
  for (const m of martori()) {
    if (!m.laVerificare) continue;
    const v = verifica(m.cale, m.d, m.rezultat.ok ? m.rezultat.bucati : []);
    if ('aruncat' in v) trecuti.push(`${m.nume}: a aruncat ${String(v.aruncat)}`);
    else if (v.problema === null) trecuti.push(`${m.nume}: primit`);
    else if (!m.rezultat.ok && v.problema.includes('nu încape')) trecuti.push(`${m.nume}: ieșirea goală e „${v.problema}”, deși există puncte ideale valide`);
  }
  assert.deepEqual(trecuti, []);
});

test('(e) verificaIesireDeschisa primește fiecare control, cu `neatins` de pe hârtie', () => {
  const probleme: string[] = [];
  for (const c of controale()) {
    const v = verifica(c.cale, c.d, c.bucati);
    if ('aruncat' in v) probleme.push(`${c.nume}: a aruncat ${String(v.aruncat)}`);
    else if (v.problema !== null) probleme.push(`${c.nume}: „${v.problema}”`);
    else for (const p of comparaNeatins(idealDeschis(c.cale, c.d), v.neatins)) probleme.push(`${c.nume}: ${p}`);
  }
  assert.deepEqual(probleme, []);
});

test('(e) verificaIesireDeschisa: ieșirea goală e „nu încape” doar fără puncte ideale valide', () => {
  const u5 = HARTIE.find((x) => x.asteptat.fel === 'refuz');
  assert.ok(u5);
  const v = verifica(u5.cale, u5.d, []);
  assert.ok(!('aruncat' in v) && v.problema !== null && v.problema.includes(MOTIV_NU_INCAPE), `U-ul de 5: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------------------------------------------------------------
// (f) Rezumatul.
// ---------------------------------------------------------------------------------------------------------------------

test('(f) rezumatul: refuzurile aplicației pe familii', (t) => {
  let incercate = 0;
  let refuzate = 0;
  let nuIncape = 0;
  for (const [f, n] of [...familii].sort(([a], [b]) => a.localeCompare(b))) {
    incercate += n.incercate;
    refuzate += n.refuzate.length;
    nuIncape += n.nuIncape;
    t.diagnostic(`${f}: ${n.incercate} offseturi, ${n.nuIncape} „nu încape” (justificate de oracol), ${n.refuzate.length} alte refuzuri`);
    for (const x of n.refuzate) t.diagnostic(`  refuz: ${x}`);
    for (const x of n.laReincercare) t.diagnostic(`  corect doar judecat la |d| + 1e-4 (reîncercarea): ${x}`);
  }
  t.diagnostic(`total: ${incercate} offseturi, ${nuIncape} „nu încape”, ${refuzate} alte refuzuri, ${incercate - nuIncape - refuzate} trasee judecate corecte`);
  assert.ok(incercate > 0, 'rezumatul rulează după (c)');
});
