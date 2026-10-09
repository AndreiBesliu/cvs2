import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adancimiTreceri, profil } from '../../src/cam/profil.ts';
import { arieCuSemn, cerculArcului, conturCerc, conturDreptunghi, segment } from '../../src/geom/contur.ts';

test('trecerile: 8 mm cu pasul 4 dau două de 4; 3 mm cu pasul 3, una (placa 1)', () => {
  assert.deepEqual(adancimiTreceri(8, 4), [4, 8]);
  assert.deepEqual(adancimiTreceri(3, 3), [3]);
});

test('trecerile egale: niciuna nu scoate mai mult decât pasul, iar ultima e exact adâncimea (invarianta 1)', () => {
  for (const [d, p] of [[10, 4], [18.3, 6], [0.5, 4], [7, 0.3], [12, 4]] as const) {
    const a = adancimiTreceri(d, p);
    assert.ok(Array.isArray(a), String(a));
    if (!Array.isArray(a)) continue;
    assert.equal(a.at(-1), d);
    let sus = 0;
    for (const z of a) {
      assert.ok(z - sus <= p + 1e-12, `${d}/${p}: o trecere scoate ${z - sus}`);
      sus = z;
    }
  }
});

test('adâncimea sau pasul nevalide dau un motiv, nu o listă', () => {
  for (const [d, p] of [[0, 4], [8, 0], [-1, 4], [Number.NaN, 4], [8, Number.POSITIVE_INFINITY]] as const) {
    assert.equal(typeof adancimiTreceri(d, p), 'string', `${d}/${p}`);
  }
});

test('profilul exterior al cercului Ø30 cu freza Ø6: raza 18, pe trecerile [4, 8]', () => {
  const r = profil(conturCerc(0, 0, 15), { latura: 'exterior', sens: 'urcare', diametruScula: 6, adancime: 8, pas: 4 });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.deepEqual(r.treceri.map((t) => t.adancime), [4, 8]);
  const s = segment(r.treceri[0]?.contururi[0] ?? conturCerc(0, 0, 1), 0);
  assert.equal(s.s.tip, 'A');
  if (s.s.tip === 'A') assert.ok(Math.abs(cerculArcului(s.a, s.b, s.s.bulge).raza - 18) < 1e-9);
});

test('profilul interior: gaura Ø30 cu freza Ø6 dă raza 12; o sculă prea mare dă motivul', () => {
  const r = profil(conturCerc(0, 0, 15), { latura: 'interior', sens: 'urcare', diametruScula: 6, adancime: 3, pas: 3 });
  assert.ok(r.ok);
  const prea = profil(conturCerc(0, 0, 2), { latura: 'interior', sens: 'urcare', diametruScula: 6, adancime: 3, pas: 3 });
  assert.deepEqual(prea, { ok: false, motiv: 'scula nu încape: offsetul interior dispare' });
});

test('profilul pe linie păstrează conturul neschimbat', () => {
  const c = conturDreptunghi(0, 0, 100, 60);
  const r = profil(c, { latura: 'pe-linie', sens: 'urcare', diametruScula: 6, adancime: 1, pas: 1 });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.treceri[0]?.contururi[0], c);
});

test('sensul (ADR 0027): exteriorul în urcare și gaura în opoziție merg orar; celelalte două, trigonometric; pornirea nu se mută', () => {
  const cazuri = [
    [conturDreptunghi(20, 20, 100, 60, 5), 'exterior', 'urcare', -1], [conturDreptunghi(20, 20, 100, 60, 5), 'exterior', 'opozitie', 1],
    [conturCerc(70, 50, 15), 'interior', 'urcare', 1], [conturCerc(70, 50, 15), 'interior', 'opozitie', -1],
  ] as const;
  for (const [c, latura, sens, semn] of cazuri) {
    const r = profil(c, { latura, sens, diametruScula: 6, adancime: 3, pas: 3 });
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    if (!r.ok) continue;
    for (const b of r.treceri[0]?.contururi ?? []) assert.equal(Math.sign(arieCuSemn(b)), semn, `${latura} ${sens}`);
    const u = profil(c, { latura, sens: 'urcare', diametruScula: 6, adancime: 3, pas: 3 });
    assert.ok(u.ok);
    if (u.ok) assert.deepEqual(r.treceri[0]?.contururi[0]?.varfuri[0]?.p, u.treceri[0]?.contururi[0]?.varfuri[0]?.p, 'aceeași pornire');
  }
});

test('pe linie, sensul nu schimbă nimic: traseul e conturul cum e desenat, în ambele sensuri', () => {
  const c = conturDreptunghi(10, 10, 40, 30);
  const u = profil(c, { latura: 'pe-linie', sens: 'urcare', diametruScula: 6, adancime: 1, pas: 1 });
  const o = profil(c, { latura: 'pe-linie', sens: 'opozitie', diametruScula: 6, adancime: 1, pas: 1 });
  assert.ok(u.ok && o.ok);
  if (u.ok && o.ok) assert.deepEqual(o.treceri, u.treceri);
});
