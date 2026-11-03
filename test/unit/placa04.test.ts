/**
 * Placa 4 (`PLAN.md` §5.3, etapa 4; `docs/etape/placa-04.md`): programele de aur ale șanțurilor de calibrare, apoi fiecare
 * cotă a plăcii prezisă de oracolul independent al simulării (`test/oracles/simulare.ts`), față de valoarea pe hârtie și
 * toleranța din plan (§4.6: „oracolul prezice fiecare cotă”):
 * - plat Ø6 la Z −3: lățimea 6,00 ±0,1, adâncimea 3,00 ±0,1;
 * - bilă Ø6 cu vârful la Z −2: lățimea la suprafață 2·√(3² − 1²) = 5,657 ±0,15;
 * - V90 la Z −2: 2·2·tan 45° = 4,000 ±0,15; V60: 2·2·tan 30° = 2,309 ±0,15;
 * - arcul G3 cu raza 25 și Ø6: canalul Ø56,00 / Ø44,00 ±0,2;
 * - plonjarea Ø6 la 5 mm: Ø6,00 și 5,00 ±0,1.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFIL_GRBL_11H } from '../../src/ir/masini/grbl11h.ts';
import { estimeazaTimp } from '../../src/sim/timp.ts';
import { dimensiuni, judeca, minim, sectiuneBila, unghiV, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';
import { fisiere } from '../placi/placa-04/genereaza.ts';

const text = (nume: string): string => {
  const f = fisiere().find((x) => x.nume === nume);
  assert.ok(f, nume);
  return f?.text ?? '';
};
const PLATA: SculaOracol = { tip: 'plata', diametru: 6 };

/** Lățimea tăiată pe coloana care conține x (celulele sub față cu peste `prag`), în mm. */
function latimeY(z: ArrayLike<number>, g: GrilaOracol, x: number, prag = 0.005): number {
  const { nx, ny } = dimensiuni(g);
  const i = Math.floor((x - g.x0) / g.celula);
  let n = 0;
  for (let j = 0; j < ny; j++) if (Number(z[j * nx + i]) < -prag) n++;
  return n * g.celula;
}
/** Lățimea tăiată pe rândul care conține y, în mm. */
function latimeX(z: ArrayLike<number>, g: GrilaOracol, y: number, prag = 0.005): number {
  const { nx } = dimensiuni(g);
  const j = Math.floor((y - g.y0) / g.celula);
  let n = 0;
  for (let i = 0; i < nx; i++) if (Number(z[j * nx + i]) < -prag) n++;
  return n * g.celula;
}

test('T1, freza plată Ø6: șanțul la Z −3 are 6,00 lățime și 3,00 adâncime (±0,1), după oracol', () => {
  const g: GrilaOracol = { x0: 40, y0: 95, latime: 20, inaltime: 10, celula: 0.05 };
  const r = judeca(text('placa-04-T1.nc'), g, PLATA);
  assert.ok(Math.abs(latimeY(r.z, g, 50) - 6) <= 0.1, `lățimea ${latimeY(r.z, g, 50)}`);
  assert.ok(Math.abs(minim(r.z) + 3) <= 0.1, `adâncimea ${minim(r.z)}`);
});

test('T1: canalul cercului cu raza 25 e tăiat în G3, iar după oracol are Ø44,00 înăuntru și Ø56,00 afară (±0,2)', () => {
  // Sensul cerut de plan (arcul G3): oracolul vede doar canalul, deci sensul se citește din text.
  const arce = text('placa-04-T1.nc').split('\n').filter((l) => /^G[23] /.test(l));
  assert.deepEqual(arce.map((l) => l.slice(0, 2)), ['G3', 'G3']);
  const g: GrilaOracol = { x0: 108, y0: 38, latime: 64, inaltime: 64, celula: 0.1 };
  const r = judeca(text('placa-04-T1.nc'), g, PLATA);
  // Pe orizontala centrului: tăiat de la 112 la 118 și de la 162 la 168 (12 mm în total), nimic între ele.
  const { nx } = dimensiuni(g);
  const j = Math.floor((70 - g.y0) / g.celula);
  const taiate: number[] = [];
  for (let i = 0; i < nx; i++) if (Number(r.z[j * nx + i]) < -0.005) taiate.push(g.x0 + (i + 0.5) * g.celula);
  const stanga = taiate.filter((x) => x < 140), dreapta = taiate.filter((x) => x > 140);
  const exterior = Math.max(...dreapta) - Math.min(...stanga) + g.celula;
  const interior = Math.min(...dreapta) - Math.max(...stanga) - g.celula;
  assert.ok(Math.abs(exterior - 56) <= 0.2, `exterior ${exterior}`);
  assert.ok(Math.abs(interior - 44) <= 0.2, `interior ${interior}`);
  assert.ok(Math.abs(latimeX(r.z, g, 70) - 12) <= 0.2, `cele două tăieturi: ${latimeX(r.z, g, 70)}`);
});

test('T1: plonjarea Ø6 la 5 mm dă Ø6,00 și 5,00 (±0,1), după oracol', () => {
  const g: GrilaOracol = { x0: 15, y0: 10, latime: 10, inaltime: 10, celula: 0.05 };
  const r = judeca(text('placa-04-T1.nc'), g, PLATA);
  assert.ok(Math.abs(latimeX(r.z, g, 15) - 6) <= 0.1, `diametrul ${latimeX(r.z, g, 15)}`);
  assert.ok(Math.abs(minim(r.z) + 5) <= 0.1, `adâncimea ${minim(r.z)}`);
});

test('T2, bila Ø6 cu vârful la Z −2: secțiunea e un cerc cu raza 3 și centrul la +1, lățimea la suprafață 5,657 (±0,15)', () => {
  const hartie = 2 * Math.sqrt(3 ** 2 - 1 ** 2);
  assert.ok(Math.abs(hartie - 5.657) < 5e-4);
  const g: GrilaOracol = { x0: 45, y0: 75, latime: 10, inaltime: 10, celula: 0.05 };
  const r = judeca(text('placa-04-T2.nc'), g, { tip: 'bila', diametru: 6 });
  const s = sectiuneBila(r.z, g, 50);
  assert.ok(Math.abs(s.raza - 3) <= 0.05 && Math.abs(s.centruZ - 1) <= 0.05, JSON.stringify(s));
  assert.ok(Math.abs(latimeY(r.z, g, 50) - hartie) <= 0.15, `lățimea ${latimeY(r.z, g, 50)}`);
  assert.ok(Math.abs(minim(r.z) + 2) <= 0.05, `adâncimea ${minim(r.z)}`);
});

test('T3 și T4, V90 și V60 la Z −2: unghiul pereților și lățimea la suprafață 4,000 și 2,309 (±0,15)', () => {
  for (const [nume, unghi, y] of [['placa-04-T3.nc', 90, 60], ['placa-04-T4.nc', 60, 40]] as const) {
    const hartie = 2 * 2 * Math.tan(((unghi / 2) * Math.PI) / 180);
    const g: GrilaOracol = { x0: 45, y0: y - 5, latime: 10, inaltime: 10, celula: 0.05 };
    const r = judeca(text(nume), g, { tip: 'v', diametru: 6, unghi });
    assert.ok(Math.abs(unghiV(r.z, g, 50, y).grade - unghi) <= 1, `${nume}: ${unghiV(r.z, g, 50, y).grade}°`);
    assert.ok(Math.abs(latimeY(r.z, g, 50) - hartie) <= 0.15, `${nume}: lățimea ${latimeY(r.z, g, 50)}, pe hârtie ${hartie}`);
    assert.ok(Math.abs(minim(r.z) + 2) <= 0.05, `${nume}: adâncimea ${minim(r.z)}`);
  }
  assert.ok(Math.abs(2 * 2 * Math.tan(Math.PI / 6) - 2.309) < 5e-4);
});

test('timpul fiecărui fișier, estimat pe GRBL 1.1h din fabrică: îl compară cronometrul (±10 %)', () => {
  for (const f of fisiere()) {
    const e = estimeazaTimp(f.text, PROFIL_GRBL_11H);
    assert.ok(e.ok && e.total.secunde > 3, `${f.nume}: ${JSON.stringify(e)}`);
  }
});
