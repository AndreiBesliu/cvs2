import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arieCuSemn, cerculArcului, conturCerc, conturDreptunghi, inverseaza, segment, type Contur,
} from '../../src/geom/contur.ts';
import { offsetInchis } from '../../src/geom/offset.ts';

const aproape = (a: number, b: number, tol: number, ce: string): void => {
  assert.ok(Math.abs(a - b) <= tol, `${ce}: ${a} față de ${b} (toleranța ${tol})`);
};

function singur(c: Contur, d: number): Contur {
  const r = offsetInchis(c, d);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  assert.equal(r.contururi.length, 1);
  const k = r.contururi[0];
  assert.ok(k);
  return k;
}

test('cercul decalat rămâne cerc: două arce, același centru, raza R ± d', () => {
  for (const [r, d] of [[15, 3], [15, -3], [100, 3.175], [3.175, 1.5875], [1220, 10]] as const) {
    const k = singur(conturCerc(50, 40, r), d);
    assert.equal(k.varfuri.length, 2);
    for (let i = 0; i < 2; i++) {
      const s = segment(k, i);
      assert.equal(s.s.tip, 'A');
      if (s.s.tip !== 'A') continue;
      const cerc = cerculArcului(s.a, s.b, s.s.bulge);
      aproape(cerc.raza, r + d, 1e-9 * (r + d), `R${r} cu ${d}: raza`);
      aproape(cerc.centru.x, 50, 1e-9, 'cx');
      aproape(cerc.centru.y, 40, 1e-9, 'cy');
    }
  }
});

test('dreptunghiul 100 × 60, spre exterior cu 3: patru linii, patru arce de R3 în colțuri, aria pe hârtie', () => {
  const k = singur(conturDreptunghi(20, 20, 100, 60), 3);
  assert.equal(k.varfuri.map((v) => v.s.tip).join(''), 'LALALALA');
  aproape(arieCuSemn(k), 6000 + 2 * 3 * 160 + Math.PI * 9, 1e-9, 'aria');
  const colturi = [[20, 20], [120, 20], [120, 80], [20, 80]];
  for (let i = 0; i < 8; i++) {
    const s = segment(k, i);
    if (s.s.tip !== 'A') continue;
    const cerc = cerculArcului(s.a, s.b, s.s.bulge);
    aproape(cerc.raza, 3, 1e-9, 'raza colțului');
    assert.ok(colturi.some(([x, y]) => Math.hypot(cerc.centru.x - (x ?? 0), cerc.centru.y - (y ?? 0)) < 1e-9), 'centrul e un colț');
  }
});

test('dreptunghiul 100 × 60, spre interior cu 3: 94 × 54, colțuri ascuțite, vârfurile exacte', () => {
  const k = singur(conturDreptunghi(20, 20, 100, 60), -3);
  assert.equal(k.varfuri.map((v) => v.s.tip).join(''), 'LLLL');
  assert.equal(arieCuSemn(k), 94 * 54);
  const varfuri = k.varfuri.map((v) => `${v.p.x},${v.p.y}`).sort();
  assert.deepEqual(varfuri, ['117,23', '117,77', '23,23', '23,77']);
});

test('sensul intrării nu contează: un contur orar dă același offset', () => {
  const a = singur(conturDreptunghi(0, 0, 50, 30), 3);
  const b = singur(inverseaza(conturDreptunghi(0, 0, 50, 30)), 3);
  aproape(arieCuSemn(b), arieCuSemn(a), 1e-9, 'aria');
});

test('o sculă care nu încape nu dă un traseu tăcut: dă motivul', () => {
  const r = offsetInchis(conturCerc(0, 0, 2), -3);
  assert.deepEqual(r, { ok: false, motiv: 'scula nu încape: offsetul interior dispare' });
});

test('intrările nevalide sunt refuzate cu motiv', () => {
  const deschis: Contur = { inchis: false, varfuri: conturDreptunghi(0, 0, 5, 5).varfuri };
  assert.equal(offsetInchis(deschis, 1).ok, false);
  assert.equal(offsetInchis(conturCerc(0, 0, 5), Number.NaN).ok, false);
});
