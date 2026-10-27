/**
 * Nucleul simulării cu freza în V cu vârf plat (ADR 0092: freza de gravare, conul trunchiat). Proba e oracolul simulării
 * (`test/oracles/simulare.ts`), care n-are un fel „V cu vârf”: freza i se dă ca sculă de PROFIL, punctele (0, 0), (a, 0),
 * (R, (R − a)·cot(θ/2)), deci cu altă formulă decât a nucleului (minimul conului pe segment, cu discul vârfului). Pe fiecare
 * piesă, nucleul nu e mai sus decât oracolul cu peste 10 nm și nici mai jos peste marjă; pe hârtie, canalul unei linii
 * orizontale are lățimea t + 2·d·tan(θ/2) la suprafață și fundul lat cât vârful.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXE_XYZ, type Miscare, type Program } from '../../src/ir/ir.ts';
import { campNou, compacteaza } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { scrieGcode, type MutareCaz } from '../oracles/simulare.cazuri.ts';
import { compara, judeca, type GrilaOracol, type P3, type SculaOracol } from '../oracles/simulare.ts';
import { densPe, parametriGrila } from './ajutor-simulare.ts';

/** Freza de gravare a oracolului: profilul conului trunchiat, pe hârtie. */
function profil(diametru: number, unghi: number, varf: number): SculaOracol {
  const R = diametru / 2, a = varf / 2, cot = 1 / Math.tan((unghi * Math.PI) / 360);
  return { tip: 'profil', diametru, puncte: [[0, 0], [a, 0], [R, (R - a) * cot]] };
}

/** Programul IR al mutărilor, cu legătura corpusului (Z5, rapida la start, coborârea), ca `programCaz`. */
function program(mutari: readonly MutareCaz[], diametru: number, unghi: number, varf: number): Program {
  const m: Miscare[] = [{ tip: 'rapida', la: { Z: 5 } }];
  let poz: P3 | undefined;
  for (const x of mutari) {
    const [ax, ay, az] = x.a;
    if (!poz || poz[0] !== ax || poz[1] !== ay || poz[2] !== az) {
      m.push({ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: ax, Y: ay } }, { tip: 'taiere', la: { Z: az }, avans: 300 });
    }
    const [bx, by, bz] = x.b;
    m.push(x.tip === 'linie'
      ? { tip: 'taiere', la: { X: bx, Y: by, Z: bz }, avans: 1000 }
      : { tip: 'arc', la: { X: bx, Y: by, Z: bz }, centru: { x: x.centru[0], y: x.centru[1] }, sens: x.sens, avans: 1000 });
    poz = x.b;
  }
  m.push({ tip: 'rapida', la: { Z: 5 } });
  return { axe: AXE_XYZ, scula: { numar: 1, nume: 'gravare', diametru, forma: { tip: 'v', unghi, varf } }, turatie: 18000, zSigur: 5, miscari: m };
}

function nucleu(mutari: readonly MutareCaz[], grila: GrilaOracol, diametru: number, unghi: number, varf: number): Float64Array {
  const p = pregatesteProgram(program(mutari, diametru, unghi, varf), 0);
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  if (!p.ok) return new Float64Array();
  const F = campNou(parametriGrila(grila));
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  return densPe(F, grila);
}

const L = (a: P3, b: P3): MutareCaz => ({ tip: 'linie', a, b });
const A = (sens: 'orar' | 'trigonometric', a: P3, b: P3, c: readonly [number, number]): MutareCaz => ({ tip: 'arc', sens, a, b, centru: c });
const G: GrilaOracol = { x0: 0, y0: 0, latime: 30, inaltime: 20, celula: 0.05 };

const PIESE: ReadonlyArray<{ readonly id: string; readonly diametru: number; readonly unghi: number; readonly varf: number; readonly mutari: readonly MutareCaz[] }> = [
  { id: 'linie la −1, 30° cu vârful 0,25', diametru: 3.175, unghi: 30, varf: 0.25, mutari: [L([5, 10, -1], [25, 10, -1])] },
  { id: 'linie oblică în XY, 90° cu vârful 1', diametru: 6, unghi: 90, varf: 1, mutari: [L([4, 4, -1.2], [26, 15, -1.2])] },
  // Pantă mai mică decât a conului (|m| < k): punctul staționar, pe con sau mutat pe marginea discului vârfului.
  { id: 'rampă lină 0 → −1,5, 60° cu vârful 0,5', diametru: 6, unghi: 60, varf: 0.5, mutari: [L([4, 10, 0], [26, 11, -1.5])] },
  // Pantă mai mare decât a conului (|m| > k): capătul segmentului.
  { id: 'coborâre abruptă, 90° cu vârful 0,4', diametru: 4, unghi: 90, varf: 0.4, mutari: [L([10, 10, -0.2], [11, 10, -2.2]), L([11, 10, -2.2], [20, 10, -0.5])] },
  { id: 'arc la −0,8 și cercul întreg la −0,5, 30° cu vârful 0,25', diametru: 3.175, unghi: 30, varf: 0.25, mutari: [
    A('trigonometric', [20, 10, -0.8], [10, 10, -0.8], [15, 10]), A('orar', [8, 4, -0.5], [8, 4, -0.5], [8, 7]),
  ] },
  { id: 'plonjări: −1 și −0,3, 90° cu vârful 2', diametru: 8, unghi: 90, varf: 2, mutari: [L([8, 8, 0], [8, 8, -1]), L([20, 12, 0], [20, 12, -0.3])] },
];

for (const c of PIESE) {
  test(`vârful plat: nucleul față de oracolul cu sculă de profil, ${c.id}`, () => {
    const s = profil(c.diametru, c.unghi, c.varf);
    const o = judeca(scrieGcode(c.mutari), G, s);
    const z = nucleu(c.mutari, G, c.diametru, c.unghi, c.varf);
    const cmp = compara(z, o, s);
    assert.equal(cmp.maiSus, 0, `nucleul mai sus pe ${cmp.maiSus} celule (max ${cmp.maiSusMax}, prima ${JSON.stringify(cmp.primaMaiSus)})`);
    assert.equal(cmp.maiJosPesteMarja, 0, `nucleul sub marja ${cmp.marja} pe ${cmp.maiJosPesteMarja} celule`);
    // Proba are dinți: vârful lipsă (nucleul cu V ascuțit) pică pe aceeași piesă.
    const ascutit = nucleu(c.mutari, G, c.diametru, c.unghi, 0);
    const alt = compara(ascutit, o, s);
    assert.ok(alt.maiSus > 0 || alt.maiJosPesteMarja > 0, 'nucleul cu vârful ascuțit trece și el: piesa nu vede vârful');
  });
}

test('vârful plat pe hârtie: linia orizontală la −1, 30° cu vârful 0,25: canalul de t + 2·d·tan 15° = 0,786 mm, fundul cât vârful', () => {
  const g: GrilaOracol = { x0: 10, y0: 9, latime: 2, inaltime: 2, celula: 0.005 };
  const z = nucleu([L([5, 10, -1], [25, 10, -1])], g, 3.175, 30, 0.25);
  const nx = 400, i = 200; // coloana x = 11,0025, departe de capete
  const tan = Math.tan((15 * Math.PI) / 180);
  for (let j = 0; j < 400; j++) {
    const y = g.y0 + (j + 0.5) * g.celula, q = Math.abs(y - 10);
    // Pe hârtie: −1 pe vârf (|y − 10| ≤ 0,125), apoi conul până la suprafață.
    const ideal = q <= 0.125 ? -1 : Math.min(0, -1 + (q - 0.125) / tan);
    // Câmpul ține Z-ul pe 32 de biți (`camp.ts`): 1e-7 mm.
    assert.ok(Math.abs(z[j * nx + i]! - ideal) <= 1e-7, `y = ${y}: ${z[j * nx + i]} în loc de ${ideal}`);
  }
  const latime = 0.25 + 2 * 1 * tan;
  assert.ok(Math.abs(latime - 0.7859) < 1e-4);
});

test('vârful plat nevalid e refuzat de simulare, cu motiv: negativ, cât diametrul sau mai mare', () => {
  for (const varf of [-0.1, 3.175, 4, Number.NaN]) {
    const p = pregatesteProgram(program([L([5, 10, -1], [25, 10, -1])], 3.175, 30, varf), 0);
    assert.ok(!p.ok && /vârful/.test(p.motiv), `${varf}: ${p.ok ? 'acceptat' : p.motiv}`);
  }
});
