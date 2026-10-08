/**
 * Offsetul închis (felia 2.1) judecat de oracolul lui independent (`test/oracles/offset.ts`, scris doar din „Contractul
 * gărzilor offsetului”, versiunea 2, din `docs/etape/etapa-02.md`), pe corpusul determinist din
 * `test/oracles/offset.corpus.ts`:
 * - (a) fiecare caz VALID (și fiecare intrare murdară, dar validă) × fiecare distanță. Categoria `trebuie` (cercurile,
 *   dreptunghiurile, haltera, inelul cu fantă): `ok`, și ieșirea trece TOATE verificările obligatorii (`verificaIesirea`:
 *   structura, topologia pe puncte, aria netă, abaterea Hausdorff ≤ 0,002 mm în ambele sensuri, fără atingeri, insulele
 *   trigonometric și găurile orar). Categoria `corect-sau-refuz` (poligoanele oarecare, poliliniile dense, alte forme):
 *   fie aceeași ieșire corectă, fie un refuz cu motiv, numărat; niciodată o ieșire greșită;
 * - (b) fiecare caz NU_INCAPE (interior mai adânc decât raza înscrisă): refuz, cu motiv;
 * - (c) fiecare caz REFUZAT (autointersecții, inclusiv vecinele care se taie, < 2 vârfuri distincte, aria zero, contur
 *   deschis, cubică, 0 < |d| < 0,005, d sau coordonate nefinite): refuz, cu motiv, FĂRĂ excepție;
 * - (d) d = 0 (și −0): o intrare validă iese exact cum a intrat; o intrare de nedecalat e refuzată și la 0;
 * - (e) o intrare murdară, dar validă, dă aceeași clasificare ca geamăna ei curată;
 * - (f) rezumatul: refuzurile pe categorii și familii (cifra intră în fișă; nu e un eșec).
 * O excepție aruncată de `offsetInchis` e o problemă a cazului, nu o oprire a testului.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offsetInchis } from '../../src/geom/offset.ts';
import type { Contur } from '../../src/geom/contur.ts';
import { comparaIesiri, verificaIesirea, type ConturO, type Nepotrivire } from '../oracles/offset.ts';
import { MURDARE, NU_INCAPE, REFUZATE, VALIDE, type CazValid } from '../oracles/offset.corpus.ts';

/** Conturul oracolului e, structural, conturul aplicației; dacă tipurile s-ar despărți, compilatorul o spune aici. */
const caContur = (c: ConturO): Contur => c;

type Rulare = { readonly ok: true; readonly contururi: readonly Contur[] } | { readonly ok: false; readonly motiv: string } | { readonly aruncat: unknown };

function ruleaza(c: ConturO, d: number): Rulare {
  try {
    return offsetInchis(caContur(c), d);
  } catch (e) {
    return { aruncat: e };
  }
}

const textD = (d: number): string => (Object.is(d, -0) ? '−0' : String(d));
const motivBun = (m: unknown): boolean => typeof m === 'string' && m.trim() !== '';
const punct = (n: Nepotrivire | undefined): string => (n === undefined ? '—'
  : `(${n.x}, ${n.y}): așteptat ${n.asteptat ? 'înăuntru' : 'afară'}, ieșirea ${n.real ? 'înăuntru' : 'afară'}, la ${n.distanta} de intrare`);

/** Refuzurile acceptate (categoria `corect-sau-refuz`), pe familii: câte, din câte offseturi, și care. */
const refuzuri = new Map<string, { refuzate: string[]; incercate: number }>();
function numara(familie: string, refuz?: string): void {
  const r = refuzuri.get(familie) ?? { refuzate: [], incercate: 0 };
  r.incercate++;
  if (refuz !== undefined) r.refuzate.push(refuz);
  refuzuri.set(familie, r);
}

function judecaValid(caz: CazValid): string[] {
  const probleme: string[] = [];
  for (const d of caz.distante) {
    const r = ruleaza(caz.contur, d);
    if ('aruncat' in r) { probleme.push(`d = ${d}: a aruncat ${String(r.aruncat)}`); continue; }
    if (!r.ok) {
      if (!motivBun(r.motiv)) probleme.push(`d = ${d}: refuzat fără motiv`);
      else if (caz.categorie === 'trebuie') probleme.push(`d = ${d}: refuzat („${r.motiv}”), dar trebuie să reușească`);
      else numara(caz.familie, `${caz.nume}, d = ${d}: „${r.motiv}”`);
      continue;
    }
    if (caz.categorie === 'corect-sau-refuz') numara(caz.familie);
    for (const p of verificaIesirea(caz.contur, d, r.contururi)) probleme.push(`d = ${d}: ${p}`);
  }
  return probleme;
}

for (const caz of VALIDE) {
  test(`(a) ${caz.categorie === 'trebuie' ? 'trebuie' : 'corect sau refuz'}: ${caz.nume}`, () => { assert.deepEqual(judecaValid(caz), []); });
}
for (const caz of MURDARE) {
  test(`(a) murdar, ${caz.categorie === 'trebuie' ? 'trebuie' : 'corect sau refuz'}: ${caz.nume}`, () => { assert.deepEqual(judecaValid(caz), []); });
}

function judecaRefuz(c: ConturO, d: number): string | undefined {
  const r = ruleaza(c, d);
  if ('aruncat' in r) return `a aruncat ${String(r.aruncat)}`;
  if (r.ok) return `acceptat, cu ${r.contururi.length} contururi`;
  if (!motivBun(r.motiv)) return 'refuzat fără motiv';
  return undefined;
}

test('(b) scula nu încape: interiorul care dispare e refuzat, cu motiv', () => {
  const probleme = NU_INCAPE.flatMap((c) => { const p = judecaRefuz(c.contur, c.distanta); return p === undefined ? [] : [`${c.nume}: ${p}`]; });
  assert.deepEqual(probleme, []);
});

test('(c) intrările și distanțele de nedecalat: refuz cu motiv, niciodată o excepție', () => {
  const probleme = REFUZATE.flatMap((c) => { const p = judecaRefuz(c.contur, c.distanta); return p === undefined ? [] : [`${c.nume}: ${p}`]; });
  assert.deepEqual(probleme, []);
});

test('(d) d = 0 (și −0): intrarea validă iese exact cum a intrat', () => {
  const probleme: string[] = [];
  for (const caz of [...VALIDE, ...MURDARE]) {
    for (const d of [0, -0]) {
      const r = ruleaza(caz.contur, d);
      if ('aruncat' in r) { probleme.push(`${caz.nume}, d = ${textD(d)}: a aruncat ${String(r.aruncat)}`); continue; }
      if (!r.ok) {
        if (caz.categorie === 'trebuie' || !motivBun(r.motiv)) probleme.push(`${caz.nume}, d = ${textD(d)}: refuzat („${r.motiv}”)`);
        continue;
      }
      try {
        assert.deepStrictEqual(r.contururi, [caz.contur]);
      } catch {
        probleme.push(`${caz.nume}, d = ${textD(d)}: conturul s-a schimbat`);
      }
    }
  }
  assert.deepEqual(probleme, []);
});

test('(d) d = 0 (și −0): intrarea de nedecalat e refuzată și la 0', () => {
  const probleme: string[] = [];
  for (const c of REFUZATE.filter((x) => x.fel === 'contur')) {
    for (const d of [0, -0]) {
      const p = judecaRefuz(c.contur, d);
      if (p !== undefined) probleme.push(`${c.nume}, d = ${textD(d)}: ${p}`);
    }
  }
  assert.deepEqual(probleme, []);
});

test('(e) intrarea murdară se clasifică la fel ca geamăna ei curată', () => {
  const probleme: string[] = [];
  for (const caz of MURDARE) {
    const geaman = VALIDE.find((x) => x.nume === caz.geaman);
    assert.ok(geaman !== undefined, `${caz.nume}: geamăna ${String(caz.geaman)} lipsește din corpus`);
    for (const d of caz.distante) {
      const m = ruleaza(caz.contur, d), c = ruleaza(geaman.contur, d);
      if (!('ok' in m) || !('ok' in c) || !m.ok || !c.ok) {
        // Refuzurile și excepțiile sunt judecate (și numărate) în (a); aici se compară doar două ieșiri.
        continue;
      }
      const n = comparaIesiri(geaman.contur, d, m.contururi, c.contururi);
      if (n.length > 0) probleme.push(`${caz.nume}, d = ${d}: ${n.length} puncte diferă de geamănă; primul ${punct(n[0])}`);
    }
  }
  assert.deepEqual(probleme, []);
});

test('(f) rezumatul: refuzurile categoriei „corect sau refuz”, pe familii', (t) => {
  let refuzate = 0, incercate = 0;
  for (const [familie, r] of [...refuzuri].sort(([a], [b]) => a.localeCompare(b))) {
    refuzate += r.refuzate.length;
    incercate += r.incercate;
    t.diagnostic(`${familie}: ${r.refuzate.length} refuzuri din ${r.incercate} offseturi`);
    for (const x of r.refuzate) t.diagnostic(`  ${x}`);
  }
  t.diagnostic(`total „corect sau refuz”: ${refuzate} refuzuri din ${incercate} offseturi`);
  assert.ok(incercate > 0, 'rezumatul rulează după (a)');
});
