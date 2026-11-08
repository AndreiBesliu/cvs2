import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conturCerc, conturDreptunghi, inverseaza } from '../../src/geom/contur.ts';
import { distantaLaContur, inRegiune } from '../../src/geom/distanta.ts';

const aproape = (a: number, b: number, tol = 1e-12): void => assert.ok(Math.abs(a - b) <= tol, `${a} față de ${b}`);

test('distanța la cerc, pe hârtie: |d − R| pe toate direcțiile, înăuntru și afară', () => {
  const c = conturCerc(70, 50, 15);
  for (let k = 0; k < 24; k++) {
    const u = (k * Math.PI) / 12;
    aproape(distantaLaContur({ x: 70 + 20 * Math.cos(u), y: 50 + 20 * Math.sin(u) }, c), 5, 1e-9);
    aproape(distantaLaContur({ x: 70 + 6 * Math.cos(u), y: 50 + 6 * Math.sin(u) }, c), 9, 1e-9);
  }
  aproape(distantaLaContur({ x: 70, y: 50 }, c), 15, 1e-12);
});

test('distanța la dreptunghi: la latură, la colț (pe diagonală) și dinăuntru', () => {
  const d = conturDreptunghi(20, 20, 100, 60);
  aproape(distantaLaContur({ x: 70, y: 10 }, d), 10);
  aproape(distantaLaContur({ x: 17, y: 17 }, d), Math.SQRT2 * 3, 1e-12);
  aproape(distantaLaContur({ x: 30, y: 50 }, d), 10);
});

test('evenodd: înăuntrul cercului și al dreptunghiului, nu afară, oricare ar fi sensul conturului', () => {
  const c = conturCerc(70, 50, 15);
  const d = conturDreptunghi(20, 20, 100, 60);
  for (const forma of [c, inverseaza(c)]) {
    assert.equal(inRegiune({ x: 70, y: 50 }, [forma]), true);
    assert.equal(inRegiune({ x: 70, y: 64.9 }, [forma]), true);
    assert.equal(inRegiune({ x: 70, y: 65.1 }, [forma]), false);
    // exact la înălțimea vârfurilor cercului (y = 50): raza ridicată cu ε nu dublează traversarea
    assert.equal(inRegiune({ x: 56, y: 50 }, [forma]), true);
    assert.equal(inRegiune({ x: 54, y: 50 }, [forma]), false);
  }
  assert.equal(inRegiune({ x: 21, y: 21 }, [d]), true);
  assert.equal(inRegiune({ x: 19, y: 21 }, [d]), false);
  assert.equal(inRegiune({ x: 30, y: 20 }, [d]), true, 'pe latura de jos, ridicat cu ε');
});

test('evenodd pe arce de 90°: lângă mijlocul arcului fiecărui colț rotunjit, înăuntru și afară (arcul, nu oglinda lui față de coardă)', () => {
  // Cercul din două semicercuri nu deosebește arcul de oglinda lui față de coardă (oglindit, fiecare semicerc devine celălalt);
  // un colț de 90° da: oglinda lui trece la 4,14 de centru, arcul la 10, coarda la 7,07. La 9 de centru, punctul e înăuntru.
  const d = conturDreptunghi(20, 20, 100, 60, 10);
  const colturi = [[30, 30, -1, -1], [110, 30, 1, -1], [110, 70, 1, 1], [30, 70, -1, 1]] as const;
  for (const forma of [d, inverseaza(d)]) {
    for (const [cx, cy, sx, sy] of colturi) {
      const pe = (r: number) => ({ x: cx + sx * r * Math.SQRT1_2, y: cy + sy * r * Math.SQRT1_2 });
      assert.equal(inRegiune(pe(9), [forma]), true, `colțul (${cx}, ${cy}), la 9 de centrul arcului`);
      assert.equal(inRegiune(pe(11), [forma]), false, `colțul (${cx}, ${cy}), la 11 de centrul arcului`);
    }
  }
});

test('evenodd cu gaură: dreptunghiul cu cercul în el are gaura goală', () => {
  const regiune = [conturDreptunghi(20, 20, 100, 60), conturCerc(70, 50, 15)];
  assert.equal(inRegiune({ x: 70, y: 50 }, regiune), false, 'în gaură');
  assert.equal(inRegiune({ x: 30, y: 30 }, regiune), true, 'în material');
  // Gaura orientată ca exteriorul rămâne gaură (s6 §4.6: nonzero ar fi umplut-o).
  assert.equal(inRegiune({ x: 70, y: 50 }, [conturDreptunghi(20, 20, 100, 60), inverseaza(conturCerc(70, 50, 15))]), false);
});
