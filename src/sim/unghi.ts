/**
 * Trigonometria nucleului de simulare (ADR 0047 §6), doar cu + − × ÷ și √. IEEE 754 cere ca acestea să fie rotunjite
 * corect, deci dau același rezultat pe orice motor JavaScript; `Math.sin`, `Math.atan2` sau `Math.hypot` nu sunt obligate
 * să o facă (ECMAScript le lasă „aproximarea dependentă de implementare”). Sonda s4 cerea elicea fără `acos` / `atan2` pe
 * celulă (§5.2): aici ele există, dar sunt ale noastre, deci deterministe prin construcție. Precizia: câteva ulp-uri
 * față de `Math` (probat în `test/unit/simulare.unghi.test.ts`), adică sub 10⁻¹⁵ rad, departe de toleranța de 10 nm.
 */

const PI = 3.141592653589793;
const PI_2 = 1.5707963267948966;

/** Coeficienții seriei arctangentei, (−1)ᵏ / (2k + 1), k = 0…12. */
const ATAN: readonly number[] = Array.from({ length: 13 }, (_, k) => (k % 2 === 0 ? 1 : -1) / (2 * k + 1));

/** atan(x) pentru x în [0, 1]: două înjumătățiri ale unghiului (|t| ≤ tan(π/16) ≈ 0,199), apoi seria până la t²⁵. */
function atan01(x: number): number {
  let t = x / (1 + Math.sqrt(1 + x * x));
  t = t / (1 + Math.sqrt(1 + t * t));
  const t2 = t * t;
  let p = ATAN[12]!;
  for (let k = 11; k >= 0; k--) p = ATAN[k]! + t2 * p;
  return 4 * (t * p);
}

/** Ca `Math.atan2(y, x)`: unghiul în (−π, π], cu −0 tratat ca `Math` (atan2(−0, −1) = −π). */
export function atan2D(y: number, x: number): number {
  if (x === 0 && y === 0) return 0;
  const ax = x < 0 ? -x : x, ay = y < 0 ? -y : y;
  let a = ay <= ax ? atan01(ay / ax) : PI_2 - atan01(ax / ay);
  if (x < 0 || (x === 0 && 1 / x < 0)) a = PI - a;
  return y < 0 || (y === 0 && 1 / y < 0) ? -a : a;
}

/** Ca `Math.acos(c)`, pe [−1, 1] (în afară: capetele). */
export function acosD(c: number): number {
  if (c >= 1) return 0;
  if (c <= -1) return PI;
  return atan2D(Math.sqrt((1 - c) * (1 + c)), c);
}

/** π/2 în două bucăți (fdlibm, `pio2_1` și `pio2_1t`): n·HI e exact pentru |n| < 2²⁰. */
const PIO2_HI = 1.5707963267341256;
const PIO2_LO = 6.077100506506192e-11;
const DOI_PE_PI = 0.6366197723675814;

/** Coeficienții seriilor: (−1)ᵏ / (2k + 1)! pentru sinus, (−1)ᵏ / (2k)! pentru cosinus, k = 0…10. */
const SIN: number[] = [], COS: number[] = [];
{
  let f = 1;
  for (let n = 0; n <= 21; n++) {
    if (n > 0) f *= n;
    const semn = Math.floor(n / 2) % 2 === 0 ? 1 : -1;
    if (n % 2 === 1) SIN.push(semn / f);
    else COS.push(semn / f);
  }
}

function sinMic(r: number): number {
  const r2 = r * r;
  let p = SIN[10]!;
  for (let k = 9; k >= 0; k--) p = SIN[k]! + r2 * p;
  return r * p;
}

function cosMic(r: number): number {
  const r2 = r * r;
  let p = COS[10]!;
  for (let k = 9; k >= 0; k--) p = COS[k]! + r2 * p;
  return p;
}

/** sin și cos ale lui x (unghiuri de mărimea celor din nucleu: |x| sub ~10⁵ rad). */
export function sinCosD(x: number): readonly [number, number] {
  const n = Math.round(x * DOI_PE_PI);
  const r = (x - n * PIO2_HI) - n * PIO2_LO;
  const s = sinMic(r), c = cosMic(r);
  switch (((n % 4) + 4) % 4) {
    case 0: return [s, c];
    case 1: return [c, -s];
    case 2: return [-s, -c];
    default: return [-c, s];
  }
}

export const sinD = (x: number): number => sinCosD(x)[0];
export const cosD = (x: number): number => sinCosD(x)[1];
export function tanD(x: number): number {
  const [s, c] = sinCosD(x);
  return s / c;
}
