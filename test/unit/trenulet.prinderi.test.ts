/**
 * Punctele de prindere ale pieselor din atelierul Easy 3Draw (ADR 0284, felia 3.Ce), pe plasele reale ale motorului.
 *
 * Fiecare piesă își spune prinderile (`construieste(def).prinderi`): felul, locul `p`, direcția `d` (unitară, spre afară)
 * și lungimea `lung`, în milimetri, în sistemul plasei întoarse. Convenția:
 * - la **tată** (știft, știft Technic, capăt de ax, bară, bilă), `p` e rădăcina: unde ajunge fața piesei pereche când
 *   prinderea e făcută până la capăt; `d` merge de la rădăcină spre vârf; `lung` e cât iese;
 * - la **mamă** (locaș, gaură de știft, de ax, de bară, clemă, cupă), `p` e mijlocul gurii, pe fața piesei; `d` iese prin
 *   gură; `lung` e adâncimea; `orb` spune că gaura nu trece prin piesă;
 * - la gaura de ax și la capătul de ax, `r` e un braț al crucii (perpendicular pe `d`);
 * - gulerul unui știft Technic intră în lamajul găurii (`guler`, `lamaj`), cât încap amândouă;
 * - două prinderi sunt făcute când `p` coincid și `d` sunt opuse (`montaj` dă mutarea).
 *
 * Proba nu crede declarația: pentru fiecare prindere, întreabă plasa, punct cu punct, dacă acolo chiar e un știft, un
 * locaș, o gaură rotundă sau în cruce, o bară liberă, o clemă cu gura ei, o bilă sau o cupă. Numerele (câte prinderi de
 * fiecare fel are o piesă) sunt cele de pe hârtie. Perechile se judecă pe plasele amândurora: montate, nu se pătrund;
 * mutate într-o parte cu 0,4 mm, se pătrund (deci proba vede pătrunderea, iar jocul e sub 0,4 mm).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plin, type P3, type Tri, type Piesa } from './ajutor-plasa-lego.ts';

type Prindere = { fel: string; p: P3; d: P3; lung: number; orb?: boolean; r?: P3; guler?: number; lamaj?: number };
type CuPrinderi = Piesa & { prinderi: Prindere[] };
type Montaj = { m: number[]; t: P3 };
type Def = Record<string, unknown>;
const Lp = L as typeof L & {
  seteaza(s?: Record<string, unknown> | null): void;
  prinderi(d: Def): Prindere[];
  feluriPrinderi: readonly string[];
  sePrind(a: string, b: string): boolean;
  montaj(a: Prindere, b: Prindere, unghi?: number): Montaj;
  rezumatPrinderi(l: readonly Prindere[]): { fel: string; cate: number }[];
  perechiFeluri(a: readonly Prindere[], b: readonly Prindere[]): [string, string][];
  axPentru(l: readonly Prindere[]): number | null;
  stiftPentru(l: readonly Prindere[]): number | null;
};
/**
 * Piesa motorului, cu prinderile copiate în tărâmul probei (tablourile motorului vin din alt tărâm, `vm`). Aceeași definiție
 * se face o singură dată (plasele mari costă); cât o probă schimbă calibrarea (`calibrat`), piesele se fac de fiecare dată.
 */
const facute = new Map<string, CuPrinderi>();
let calibrat = false;
const fa = (d: Def): CuPrinderi => {
  const cheie = JSON.stringify(d), tinuta = calibrat ? undefined : facute.get(cheie);
  if (tinuta) return tinuta;
  const p = L.construieste(d) as CuPrinderi;
  assert.ok(Array.isArray(p.prinderi), `${String(d.tip)}: piesa are lista prinderilor`);
  const r = { ...p, prinderi: Array.from(p.prinderi, (c): Prindere => ({ ...c, p: [...c.p] as P3, d: [...c.d] as P3, ...(c.r ? { r: [...c.r] as P3 } : {}) })) };
  if (!calibrat) facute.set(cheie, r);
  return r;
};
const FELURI = ['stift', 'locas', 'gauraStift', 'gauraAx', 'gauraBara', 'stiftTechnic', 'capatAx', 'bara', 'clema', 'bila', 'cupa'];
const TATA = new Set(['stift', 'stiftTechnic', 'capatAx', 'bara', 'bila']);

// ---------------------------------------------------------------------------------------------------- vectori
const plus = (p: P3, d: P3, t: number): P3 => [p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t];
const minus = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punct = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vect = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lungime = (a: P3) => Math.hypot(a[0], a[1], a[2]);
const unitar = (a: P3): P3 => { const l = lungime(a); return [a[0] / l, a[1] / l, a[2] / l]; };
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const p3 = (p: readonly number[]): P3 => [r3(p[0]!), r3(p[1]!), r3(p[2]!)];
/** Doi vectori unitari perpendiculari pe d (și între ei); cu `r`, primul e chiar r. */
function reper(d: P3, r?: P3): [P3, P3] {
  const u = r ? unitar(r) : unitar(vect(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  return [u, unitar(vect(d, u))];
}
/** n puncte pe cercul de rază `raza` din planul perpendicular pe d, în jurul lui c (primul, pe u). */
function inel(c: P3, d: P3, raza: number, n: number, r?: P3): P3[] {
  const [u, v] = reper(d, r);
  return Array.from({ length: n }, (_, k) => { const a = 2 * Math.PI * k / n; return plus(plus(c, u, raza * Math.cos(a)), v, raza * Math.sin(a)); });
}
const pline = (p: Piesa, pts: readonly P3[]) => pts.filter((q) => plin(p, q)).length;
/** De câte ori se schimbă „lemn / gol” de-a lungul unui cerc. */
function treceri(p: Piesa, pts: readonly P3[]): number {
  const s = pts.map((q) => plin(p, q));
  return s.filter((x, k) => x !== s[(k + 1) % s.length]).length;
}

// ---------------------------------------------------------------------------------------------------- ce spune plasa
/**
 * Întreabă plasa dacă prinderea declarată e acolo. `slab`: la piesa rotundă 2 × 2, știftul de dedesubt e ținut doar de
 * tubul din mijloc (cele patru împreună îl strâng), deci locașul cere un singur perete lângă știft.
 */
function peMasa(piesa: CuPrinderi, c: Prindere, ce: string, slab = false): void {
  const E = L.efective(), P = L.parametri(), { p, d, lung } = c;
  const la = (t: number) => plus(p, d, t), toate = (pts: readonly P3[], lemn: boolean, mesaj: string) => assert.equal(pline(piesa, pts), lemn ? pts.length : 0, `${ce}: ${mesaj}`);
  assert.ok(Math.abs(lungime(d) - 1) < 1e-9, `${ce}: direcția e unitară`);
  assert.ok(lung > 0, `${ce}: lungimea e pozitivă`);
  // gura unei găuri e pe fața piesei: în fața ei nu mai e perete (cel mult banda unei roți, într-o parte)
  const inFataGurii = (raza: number) => {
    const inFata = pline(piesa, inel(la(0.2), d, raza + 0.15, 8));
    assert.ok(!plin(piesa, la(0.2)) && inFata <= 2, `${ce}: gura e pe fața piesei (în fața ei, ${inFata} din 8 în lemn)`);
  };
  if (c.r) { assert.ok(Math.abs(lungime(c.r) - 1) < 1e-9, `${ce}: brațul e unitar`); assert.ok(Math.abs(punct(c.r, d)) < 1e-9, `${ce}: brațul e perpendicular pe direcție`); }
  if (c.fel === 'stift') {
    const r = E.stiftD! / 2;
    assert.ok(Math.abs(lung - P.stift_h!) < 1e-9, `${ce}: știftul are înălțimea din profilul imprimantei`);
    toate(inel(la(lung / 2), d, r - 0.1, 8), true, 'știftul e plin până la 0,1 mm de margine');
    toate(inel(la(lung / 2), d, r + 0.15, 8), false, 'în jurul știftului e loc');
    toate([la(lung + 0.3), ...inel(la(lung + 0.3), d, r - 0.3, 8)], false, 'deasupra știftului e gol');
    toate(inel(la(-0.3), d, r - 0.3, 8), true, 'știftul stă pe lemn');
  } else if (c.fel === 'locas') {
    const r = P.stift_d! / 2 + E.joc!, ad = Math.min(lung, P.stift_h!);
    toate([la(-ad / 2), ...inel(la(-ad / 2), d, r - 0.1, 8)], false, 'locașul e gol, cât știftul');
    toate([la(-0.05), la(-(lung - 0.05)), ...inel(la(-0.05), d, r - 0.4, 8), ...inel(la(-(lung - 0.05)), d, r - 0.4, 8)], false, 'locașul e gol de la gură până la fund');
    const s = inel(la(-Math.min(1, lung / 2)), d, r + 0.15, 8).map((q) => plin(piesa, q)), n = s.filter(Boolean).length;
    if (slab) assert.ok(n >= 1, `${ce}: ceva ține știftul`);
    else assert.ok(s.some((x, i) => x && [3, 4, 5].some((k) => s[(i + k) % 8])), `${ce}: știftul e ținut din două părți (${s.map(Number).join('')})`);
    toate(inel(la(-(lung + 0.3)), d, r - 0.4, 8), true, 'deasupra locașului e lemn');
    assert.equal(c.orb, true, `${ce}: locașul e orb`);
  } else if (c.fel === 'gauraStift' || c.fel === 'gauraBara') {
    const r = (c.fel === 'gauraBara' ? E.baraGauraD! : E.gauraD!) / 2;
    toate([la(-0.4), la(-lung / 2), la(-(lung - 0.4)), ...inel(la(-lung / 2), d, r - 0.1, 8)], false, 'gaura e goală, cât raza ei');
    inFataGurii(r);
    const perete = pline(piesa, inel(la(c.fel === 'gauraBara' ? -0.4 : -lung / 2), d, r + 0.15, 8));
    assert.ok(perete >= 6, `${ce}: gaura are perete de jur împrejur (${perete} din 8)`);
    // fundul unei găuri oarbe oprește știftul (poate fi și o cruce, la conectorul de ax și știft)
    if (c.orb) assert.ok(pline(piesa, inel(la(-(lung + 0.3)), d, r - 0.3, 8)) >= 4, `${ce}: gaura oarbă are fund`);
    else toate([la(-(lung + 0.3))], false, 'gaura trece prin piesă');
    // gaura de știft care trece ține până la fața cealaltă: și acolo are perete (în jurul lamajului, dacă are)
    if (c.fel === 'gauraStift' && !c.orb) {
      const capat = pline(piesa, inel(la(-(lung - 0.2)), d, (c.lamaj ? E.lamajD! / 2 : r) + 0.15, 8));
      assert.ok(capat >= 5, `${ce}: gaura ține până la fața cealaltă (${capat} din 8)`);
    }
    // lamajul de la gură: cât spune prinderea; fără el, peretele ține până la gură
    if (c.fel === 'gauraStift') {
      const rl = E.lamajD! / 2, gura = (t: number, raza: number) => pline(piesa, inel(la(t), d, raza, 8));
      if (c.lamaj) {
        assert.ok(Math.abs(c.lamaj - P.lamaj_h!) < 1e-9, `${ce}: lamajul are adâncimea din parametri`);
        assert.equal(gura(-c.lamaj / 2, rl - 0.1), 0, `${ce}: lamajul e gol, cât gulerul`);
        assert.ok(gura(-c.lamaj / 2, rl + 0.15) >= 6, `${ce}: lamajul are perete`);
        assert.ok(gura(-(c.lamaj + 0.2), rl - 0.3) >= 6, `${ce}: sub lamaj, gaura se strânge`);
      } else assert.ok(gura(-0.3, r + 0.15) >= 6, `${ce}: fără lamaj, peretele ține până la gură`);
    } else assert.equal(c.lamaj, undefined, `${ce}: doar gaura de știft are lamaj`);
  } else if (c.fel === 'gauraAx') {
    const r = E.axGauraD! / 2;
    assert.ok(c.r, `${ce}: gaura de ax își spune brațul`);
    toate([la(-0.4), la(-lung / 2), la(-(lung - 0.4))], false, 'gaura e goală pe axă');
    inFataGurii(r);
    for (const t of [-0.4, -lung / 2, -(lung - 0.4)]) {
      assert.equal(treceri(piesa, inel(la(t), d, r - 0.1, 72, c.r)), 8, `${ce}: crucea are patru brațe (la ${r3(t)})`);
      const cerc = inel(la(t), d, r - 0.1, 8, c.r);
      toate([0, 2, 4, 6].map((k) => cerc[k]!), false, `brațele crucii sunt pe r (la ${r3(t)})`);
      toate([1, 3, 5, 7].map((k) => cerc[k]!), true, `între brațe e lemn (la ${r3(t)})`);
    }
    for (const t of [-lung / 2, -(lung - 0.2)]) {
      const perete = pline(piesa, inel(la(t), d, r + 0.15, 72));
      assert.ok(perete >= 64, `${ce}: crucea are perete de jur împrejur (${perete} din 72, la ${r3(t)})`);
    }
    if (c.orb) assert.ok(pline(piesa, [la(-(lung + 0.3)), ...inel(la(-(lung + 0.3)), d, 0.7, 8)]) >= 7, `${ce}: gaura oarbă are fund`);
    else toate([la(-(lung + 0.3))], false, 'gaura trece prin piesă');
  } else if (c.fel === 'stiftTechnic') {
    const r = P.stift_technic_d! / 2;
    assert.ok(pline(piesa, inel(la(lung / 2), d, r - 0.5, 8)) >= 6, `${ce}: știftul e plin (fără fantă și fără fața de pe masă)`);
    toate(inel(la(lung / 2), d, r + 0.15, 8), false, 'în jurul știftului e loc');
    toate(inel(la(lung - 0.2), d, r + 0.15, 8), false, 'în jurul vârfului e loc');
    toate([la(lung + 0.3), ...inel(la(lung + 0.3), d, r - 0.5, 8)], false, 'după vârf e gol');
    assert.ok(pline(piesa, inel(la(lung - 0.2), d, r - 0.5, 8)) >= 6, `${ce}: știftul ține până la vârf`);
    assert.ok(pline(piesa, inel(la(-0.3), d, P.guler_d! / 2 - 0.3, 8)) >= 5, `${ce}: la rădăcină e gulerul (sau bucșa)`);
    // gulerul e gros de două ori cât intră în lamaj; dincolo de el, știftul e iar subțire
    if (c.guler) toate(inel(la(-(2 * c.guler + 0.3)), d, P.guler_d! / 2 - 0.3, 8), false, 'după guler, știftul e subțire');
    else assert.ok(pline(piesa, inel(la(-(2 * 0.8 + 0.3)), d, P.guler_d! / 2 - 0.3, 8)) >= 5, `${ce}: fără guler, rădăcina e o bucșă groasă`);
  } else if (c.fel === 'capatAx') {
    const r = P.ax_d! / 2;
    assert.ok(c.r, `${ce}: capătul de ax își spune brațul`);
    for (const t of [0.3, lung / 2, lung - 0.3]) {
      toate([la(t)], true, `axul e plin pe axă (la ${r3(t)})`);
      assert.equal(treceri(piesa, inel(la(t), d, r - 0.5, 72, c.r)), 8, `${ce}: axul e în cruce (la ${r3(t)})`);
      const cerc = inel(la(t), d, r - 0.5, 8, c.r);
      toate([0, 2, 4, 6].map((k) => cerc[k]!), true, `brațele axului sunt pe r (la ${r3(t)})`);
      toate([1, 3, 5, 7].map((k) => cerc[k]!), false, `între brațe e gol (la ${r3(t)})`);
      toate(inel(la(t), d, r + 0.15, 8, c.r), false, `în jurul axului e loc (la ${r3(t)})`);
    }
    toate([la(lung + 0.3)], false, 'după vârf e gol');
    if (c.guler) {
      assert.ok(pline(piesa, inel(la(-0.3), d, P.guler_d! / 2 - 0.3, 8)) >= 5, `${ce}: la rădăcină e gulerul`);
      toate(inel(la(-(2 * c.guler + 0.3)), d, P.guler_d! / 2 - 0.3, 8), false, 'după guler, știftul e subțire');
    }
  } else if (c.fel === 'bara') {
    const r = P.bara_d! / 2, hotar = (t: number) => !plin(piesa, la(t)) || pline(piesa, inel(la(t), d, r + 0.15, 8)) > 0;
    for (const t of [0.2, lung / 2, lung - 0.2]) {
      toate([la(t)], true, `bara e plină pe axă (la ${r3(t)})`);
      assert.ok(pline(piesa, inel(la(t), d, r - 0.3, 8)) >= 7, `${ce}: bara e plină (la ${r3(t)})`);
      toate(inel(la(t), d, r + 0.15, 8), false, `în jurul barei e loc (la ${r3(t)})`);
    }
    assert.ok(hotar(-0.3), `${ce}: la rădăcină bara se termină sau e ținută`);
    assert.ok(hotar(lung + 0.3), `${ce}: după vârf bara se termină sau e ținută`);
  } else if (c.fel === 'clema') {
    const r = E.clemaD! / 2;
    toate([la(-lung / 2), ...inel(la(-lung / 2), d, r - 0.1, 8), la(-0.2), la(-(lung - 0.2))], false, 'clema e goală, cât bara');
    for (const t of [-0.2, -lung / 2, -(lung - 0.2)]) {
      const cerc = inel(la(t), d, r + 0.3, 72);
      assert.equal(treceri(piesa, cerc), 2, `${ce}: clema are o singură gură (la ${r3(t)})`);
      assert.ok(pline(piesa, cerc) >= 45, `${ce}: clema cuprinde bara (${pline(piesa, cerc)} din 72, la ${r3(t)})`);
    }
    toate([la(-(lung + 0.3))], false, 'clema e deschisă la amândouă capetele');
    assert.ok(pline(piesa, inel(la(0.3), d, r + 0.3, 72)) === 0, `${ce}: în fața clemei e loc`);
  } else if (c.fel === 'bila') {
    const r = P.bila_d! / 2, [u, v] = reper(d), lat = [u, v, minus([0, 0, 0], u), minus([0, 0, 0], v)];
    assert.ok(Math.abs(lung - P.bila_d!) < 1e-9, `${ce}: lungimea e diametrul bilei`);
    toate([p, la(r - 0.15), la(-(r - 0.15)), ...lat.map((w) => plus(p, w, r - 0.15))], true, 'bila e plină');
    toate([la(r + 0.15), ...lat.map((w) => plus(p, w, r + 0.15))], false, 'în jurul bilei e loc');
    toate([la(-(r + 0.15))], true, 'sub bilă e gâtul');
  } else if (c.fel === 'cupa') {
    const r = E.cupaD! / 2, [u, v] = reper(d), q = Math.SQRT1_2;
    const diag = [[q, q], [-q, q], [-q, -q], [q, -q]].map(([a, b]) => unitar(plus(plus([0, 0, 0], u, a!), v, b!)));
    assert.ok(Math.abs(lung - E.cupaD!) < 1e-9, `${ce}: lungimea e diametrul cupei`);
    toate([p, la(r - 0.5), la(-(r - 0.5)), ...diag.map((w) => plus(p, w, r - 0.5))], false, 'cupa e goală');
    toate([la(-(r + 0.15)), ...diag.map((w) => plus(p, w, r + 0.15))], true, 'cupa are perete și fund');
    toate([la(r + 0.15)], false, 'gura cupei e deschisă');
  } else assert.fail(`${ce}: fel necunoscut (${c.fel})`);
}

// ---------------------------------------------------------------------------------------------------- mostrele
const rand = (n: number, m = 1): [number, number][] => Array.from({ length: n * m }, (_, k): [number, number] => [k % n, Math.floor(k / n)]);
/** Mostrele: numele, definiția și câte prinderi de fiecare fel are, pe hârtie. Fiecare tip al motorului are cel puțin una. */
const MOSTRE: readonly (readonly [string, Def, Record<string, number>, { slab?: boolean }?])[] = [
  ['cărămida 2 × 4', { tip: 'caramida', celule: rand(4, 2) }, { stift: 8, locas: 8 }],
  ['placa 2 × 2 cu locașuri', { tip: 'caramida', celule: rand(2, 2), placi: 1, fund: 'locasuri' }, { stift: 4, locas: 4 }],
  ['cărămida 1 × 4 cu știftul la mijloc', { tip: 'caramida', celule: rand(4), stifturi: 'mijloc' }, { stift: 1, locas: 4 }],
  ['placa 2 × 4 cu găuri', { tip: 'caramida', celule: rand(4, 2), placi: 1, gauri: [[1, 1, 'r'], [2, 1, 'x'], [3, 1, 'r']] }, { stift: 8, locas: 8, gauraStift: 4, gauraAx: 2 }],
  ['placa 1 × 2 cu știfturi goale', { tip: 'caramida', celule: rand(2), placi: 1, goale: true }, { stift: 2, locas: 2, gauraBara: 2 }],
  ['cărămida 2 × 2 cu știfturi goale, plină', { tip: 'caramida', celule: rand(2, 2), goale: true, fund: 'locasuri' }, { stift: 4, locas: 4, gauraBara: 4 }],
  ['cărămida 1 × 4 cu găuri laterale', { tip: 'caramida', celule: rand(4), laterale: ['r', 'x', 'p'] }, { stift: 4, locas: 4, gauraStift: 2, gauraAx: 2 }],
  ['cărămida 1 × 3 pe y, cu găuri laterale', { tip: 'caramida', celule: [[2, 1], [2, 2], [2, 3]], laterale: ['x', 'r'] }, { stift: 3, locas: 3, gauraStift: 2, gauraAx: 2 }],
  ['țigla 2 × 2 (fără știfturi)', { tip: 'caramida', celule: rand(2, 2), placi: 1, stifturi: false }, { locas: 4 }],
  ['forma în L', { tip: 'caramida', celule: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], placi: 2 }, { stift: 5, locas: 5 }],
  ['știfturi pe lateral, pe două fețe', { tip: 'lateral', lung: 2, fete: 'doua' }, { stift: 6, locas: 2 }],
  ['știfturi pe lateral', { tip: 'lateral' }, { stift: 2, locas: 1 }],
  ['panta 2 × 2', { tip: 'panta' }, { stift: 2, locas: 4 }],
  ['panta curbă 2 × 3, fără rânduri sus', { tip: 'panta', lung: 2, adanc: 3, sus: 0, profil: 'curb' }, { locas: 6 }],
  ['panta inversă 2 × 2', { tip: 'pantaInversa' }, { stift: 4, locas: 2 }],
  ['pana 4 × 2', { tip: 'pana' }, { stift: 2, locas: 2 }],
  // tăietura de la (32, 16) la (0, 32): știftul întreg cere 2,7 mm până la ea, locașul întreg 3,1; rândurile de jos au
  // câte 4, al treilea 2, ultimul niciunul
  ['pana 4 × 4 cu o gaură', { tip: 'pana', lung: 4, lat: 4, varf: 2, placi: 1, gauri: [[1, 1, 'x']] }, { stift: 10, locas: 10, gauraAx: 2 }],
  ['rotundul 1 × 1', { tip: 'rotund' }, { stift: 1, locas: 1 }],
  ['rotundul 2 × 2 cu gaură de ax', { tip: 'rotund', diam: 2, gaura: 'ax' }, { stift: 4, locas: 4, gauraAx: 2 }, { slab: true }],
  ['rotundul 2 × 2', { tip: 'rotund', diam: 2 }, { stift: 4, locas: 4 }, { slab: true }],
  ['rotundul 1 × 1 cu gaură de bară', { tip: 'rotund', gaura: 'bara' }, { stift: 1, locas: 1, gauraBara: 1 }],
  ['conul 2 × 2', { tip: 'rotund', diam: 2, forma: 'con' }, { stift: 1, locas: 4 }, { slab: true }],
  // vârful de 4 mm e prea îngust pentru gaură: ea se oprește sub con, deci se intră doar de jos
  ['conul 2 × 2 cu gaura oprită sub vârf', { tip: 'rotund', diam: 2, forma: 'con', varf_d: 4, gaura: 'stift' }, { locas: 4, gauraStift: 1 }, { slab: true }],
  ['arcul 1 × 4', { tip: 'arc' }, { stift: 4, locas: 2 }],
  ['arcul 1 × 6 × 2', { tip: 'arc', lung: 6, inalt: 2 }, { stift: 6, locas: 2 }],
  ['cadrul 1 × 4 × 3', { tip: 'cadru' }, { stift: 4, locas: 4 }],
  ['cadrul 1 × 2 × 2, cu colțurile teșite și rama groasă', { tip: 'cadru', lung: 2, inalt: 2, rama: 2.5, colturi: 'tesite' }, { stift: 2, locas: 2 }],
  // placa turnantă (3.Ck-1): baza stă pe știfturi și are pivotul (un capăt de știft Technic în sus); partea de sus e placa cu
  // gaura de știft din mijloc
  ['baza plăcii turnante', { tip: 'turnanta' }, { locas: 4, stiftTechnic: 1 }],
  ['baza plăcii turnante 4 × 4, cu jocul 0,2', { tip: 'turnanta', marime: 4, joc: 0.2 }, { locas: 16, stiftTechnic: 1 }],
  ['partea de sus a plăcii turnante 4 × 4', { tip: 'turnanta', piesa: 'sus', marime: 4 }, { stift: 16, locas: 16, gauraStift: 2 }],
  // balamaua (3.Ck-2): jumătatea cu bolțul are câte o bară liberă (în ambele sensuri) în dreptul fiecărui știft al lățimii,
  // iar cea cu clema, câte o clemă cu două guri
  ['balamaua 1 × 2, cu bolțul', { tip: 'balama' }, { stift: 2, locas: 2, bara: 2 }],
  ['balamaua 2 × 3, cu bolțul', { tip: 'balama', latime: 2, lungime: 3 }, { stift: 6, locas: 6, bara: 4 }],
  ['balamaua 1 × 2, cu clema', { tip: 'balama', piesa: 'clema' }, { stift: 2, locas: 2, clema: 2 }],
  ['balamaua 2 × 1, cu clema, cu jocul 0,2', { tip: 'balama', piesa: 'clema', latime: 2, lungime: 1, joc: 0.2 }, { stift: 2, locas: 2, clema: 4 }],
  ['grinda de 3', { tip: 'grinda' }, { gauraStift: 6 }],
  ['grinda subțire, cu o gaură de ax și un pas plin', { tip: 'grinda', gauri: ['r', 'x', 'p', 'r'], groasa: false }, { gauraStift: 4, gauraAx: 2 }],
  ['grinda desenată, în L', { tip: 'grinda', celule: [[0, 0, 'r'], [1, 0, 'r'], [1, 1, 'x']] }, { gauraStift: 4, gauraAx: 2 }],
  ['grinda îndoită 3 + 2, la 90°', { tip: 'grinda', indoita: { brate: [3, 2], unghiuri: [90] }, gauri: ['r', 'x', 'x', 'r'] }, { gauraStift: 4, gauraAx: 4 }],
  ['grinda îndoită 4 + 3, la 53°', { tip: 'grinda', indoita: { brate: [4, 3], unghiuri: [53.13] }, gauri: ['x', 'r', 'r', 'x', 'r', 'x'] }, { gauraStift: 6, gauraAx: 6 }],
  ['cărămida Technic 1 × 4', { tip: 'caramidaTechnic' }, { stift: 4, locas: 4, gauraStift: 6 }],
  ['cărămida Technic 1 × 1', { tip: 'caramidaTechnic', lung: 1 }, { stift: 1, locas: 1, gauraStift: 2 }],
  ['cărămida Technic 1 × 2 cu gaură de ax și știfturi goale', { tip: 'caramidaTechnic', lung: 2, gauri: ['x'], goale: true }, { stift: 2, locas: 2, gauraAx: 2, gauraBara: 2 }],
  ['axul de 3', { tip: 'ax', lung: 3 }, { capatAx: 2 }],
  ['axul de 4 cu opritor', { tip: 'ax', lung: 4, opritor: true }, { capatAx: 1 }],
  ['știftul', { tip: 'stiftTechnic' }, { stiftTechnic: 2 }],
  ['știftul fără fantă', { tip: 'stiftTechnic', fanta: false }, { stiftTechnic: 2 }],
  ['știftul de 3', { tip: 'stiftTechnic', lung: 3 }, { stiftTechnic: 2 }],
  ['știftul cu ax', { tip: 'stiftTechnic', capat: 'ax' }, { stiftTechnic: 1, capatAx: 1 }],
  ['știftul de 3 cu bucșă', { tip: 'stiftTechnic', lung: 3, capat: 'bucsa' }, { stiftTechnic: 1 }],
  ['bucșa', { tip: 'bucsa' }, { gauraAx: 2 }],
  ['bucșa rotundă de 2', { tip: 'bucsa', lung: 2, gaura: 'r' }, { gauraStift: 2 }],
  ['conectorul de ax și știft', { tip: 'bucsa', lung: 2, gaura: 'xr' }, { gauraAx: 1, gauraStift: 1 }],
  ['conectorul perpendicular', { tip: 'conector' }, { gauraAx: 2, gauraStift: 2 }],
  ['conectorul pe trei axe', { tip: 'conector', gauri: ['xl', 'rv', 'ro', 'rl'] }, { gauraAx: 1, gauraStift: 5 }],
  ['conectorul în unghi', { tip: 'conectorUnghi' }, { gauraStift: 2, gauraAx: 2 }],
  ['conectorul în T, cu butuc de ax și un manșon de știft', { tip: 'conectorUnghi', mansoane: [[0, 'x'], [90, 'r'], [180, 'x']], butuc: 'x' }, { gauraAx: 4, gauraStift: 1 }],
  ['conectorul cu butuc plin', { tip: 'conectorUnghi', mansoane: [[22.5, 'x'], [202.5, 'r']], butuc: 'p' }, { gauraAx: 1, gauraStift: 1 }],
  ['suportul 1 × 2', { tip: 'suport' }, { stift: 4, locas: 2 }],
  ['suportul întors 2 × 2 × 2', { tip: 'suport', lung: 2, adanc: 2, inalt: 2, invers: true }, { stift: 8, locas: 4 }],
  ['clema', { tip: 'clema' }, { stift: 1, locas: 1, clema: 2 }],
  ['clema culcată, 1 × 2', { tip: 'clema', lung: 2, axa: 'orizontala' }, { stift: 2, locas: 2, clema: 2 }],
  ['mânerul 1 × 2', { tip: 'maner', lung: 2, axa: 'orizontala' }, { stift: 2, locas: 2, bara: 2 }],
  ['mânerul 1 × 3', { tip: 'maner', lung: 3, axa: 'orizontala' }, { stift: 3, locas: 3, bara: 4 }],
  ['mânerul în picioare', { tip: 'maner', lung: 2, axa: 'verticala' }, { stift: 2, locas: 2, bara: 1 }],
  ['bara de 4', { tip: 'bara' }, { bara: 2 }],
  ['bila', { tip: 'bila' }, { locas: 1, bila: 1 }],
  ['bila pe 2 × 2', { tip: 'bila', baza: 2 }, { locas: 4, bila: 1 }],
  ['cupa', { tip: 'cupa' }, { locas: 1, cupa: 1 }],
  ['cupa pe 2 × 2', { tip: 'cupa', baza: 2 }, { locas: 4, cupa: 1 }],
  ['roata dințată de 24', { tip: 'rotita' }, { gauraAx: 2 }],
  ['roata dințată de 8 (crucea rotită)', { tip: 'rotita', dinti: 8 }, { gauraAx: 2 }],
  ['roata dințată de 16, pe știft, oblică', { tip: 'rotita', dinti: 16, gaura: 'r', fel: 'oblici', grosime: 7.8 }, { gauraStift: 2 }],
  ['roata dințată fără gaură', { tip: 'rotita', gaura: 'nu' }, {}],
  ['roata dințată în care gaura nu încape', { tip: 'rotita', dinti: 8, modul: 0.5 }, {}],
  ['cama', { tip: 'cama' }, { gauraAx: 2 }],
  ['cama melc, subțire, pe știft', { tip: 'cama', forma: 'melc', gaura: 'r', grosime: 3.8 }, { gauraStift: 2 }],
  ['cremaliera pe știfturi', { tip: 'cremaliera' }, { locas: 4 }],
  ['cremaliera cu găuri', { tip: 'cremaliera', lung: 3, prindere: 'gauri' }, { gauraStift: 6 }],
  ['roata cu anvelopă', { tip: 'roata' }, { gauraAx: 2 }],
  ['janta pe știft', { tip: 'roata', fel: 'janta', gaura: 'r' }, { gauraStift: 2 }],
  ['anvelopa', { tip: 'roata', fel: 'anvelopa' }, {}],
  // fulia de 24, ca LEGO 4185: șase găuri de știft pe cercul de 8 mm, prin față
  ['fulia', { tip: 'fulie' }, { gauraAx: 2, gauraStift: 12 }],
  ['fulia plină, pe știft', { tip: 'fulie', spite: 'disc', gaura: 'r', diam: 16 }, { gauraStift: 2 }],
  ['roata conică', { tip: 'conica' }, { gauraStift: 2 }],
  ['roata conică de 12, cu gaură de ax', { tip: 'conica', dinti: 12, pereche: 20, gaura: 'x', butuc: 'scurt' }, { gauraAx: 2 }],
  ['roata coroană', { tip: 'coroana' }, { gauraAx: 2 }],
  ['roata coroană cu butuc scurt, pe știft', { tip: 'coroana', butuc: 'scurt', gaura: 'r' }, { gauraStift: 2 }],
  ['conica dublă', { tip: 'conicaDubla' }, { gauraAx: 2 }],
  ['zala de șenilă', { tip: 'senila' }, { gauraStift: 4, bara: 2, clema: 4 }],
  ['zala fără găuri', { tip: 'senila', gauriStift: 'nu' }, { bara: 2, clema: 4 }],
  ['pinionul de șenilă', { tip: 'senila', piesa: 'pinion' }, { gauraAx: 2 }],
  ['elicea', { tip: 'elice' }, { gauraAx: 2 }],
  ['elicea cu con', { tip: 'elice', con: 'da' }, { gauraAx: 1 }],
  ['elicea pe bară', { tip: 'elice', gaura: 'b', palete: 2 }, { gauraBara: 2 }],
  ['elicea fără gaură', { tip: 'elice', gaura: 'nu' }, {}],
  ['elicea de barcă', { tip: 'eliceBarca' }, { gauraAx: 2 }],
  ['elicea de barcă cu capac, pe știft', { tip: 'eliceBarca', capac: 'da', gaura: 'r' }, { gauraStift: 1 }],
  ['rotorul ventilatorului', { tip: 'ventilator' }, { gauraAx: 2 }],
  ['carcasa ventilatorului', { tip: 'ventilator', piesa: 'carcasa' }, { gauraStift: 4 }],
  ['carcasa cu patru urechi', { tip: 'ventilator', piesa: 'carcasa', urechi: 4, diametru: 56 }, { gauraStift: 8 }],
  ['șurubul melc', { tip: 'melc' }, { gauraAx: 2 }],
  ['șurubul melc gros, de 4 știfturi', { tip: 'melc', diam: 16, lung: 4 }, { gauraAx: 2 }],
  ['roata cu palete', { tip: 'roataPalete' }, { gauraAx: 2 }],
  ['roata cu palete curbate, mică, pe știft, fără disc', { tip: 'roataPalete', diam: 32, palete: 12, forma: 'curbate', disc: 'fara', gaura: 'r', lat: 7.8 }, { gauraStift: 2 }],
  // decorațiunile de Crăciun (ADR 0285) se agață: nu au prinderi
  ['fulgul', { tip: 'fulg' }, {}],
  ['steaua în relief', { tip: 'stea', fel: 'relief', grosime: 8 }, {}],
  ['bradul în picioare', { tip: 'brad', fel: 'picioare' }, {}],
  ['globul în relief', { tip: 'glob', desen: 'relief', model: 'stele' }, {}],
  ['ornamentul cu nume', { tip: 'ornament', text: 'ANA' }, {}],
  ['etajul brăduțului LEGO', { tip: 'bradLego' }, { stift: 4, locas: 4 }],
  ['steaua de vârf', { tip: 'bradLego', piesa: 'stea' }, { bara: 1 }],
  ['forma din cvs2', { tip: 'dinCvs2', contururi: [[[0, 0], [20, 0], [20, 12], [0, 12]]] }, {}],
];
const numara = (l: readonly Prindere[]): Record<string, number> => { const n: Record<string, number> = {}; for (const c of l) n[c.fel] = (n[c.fel] ?? 0) + 1; return n; };

test('fiecare tip al motorului are o mostră, iar piesa își spune prinderile odată cu plasa', () => {
  const cuMostra = new Set(MOSTRE.map(([, d]) => d.tip));
  for (const t of L.tipuri) assert.ok(cuMostra.has(t), `tipul ${t} are o mostră`);
  assert.deepEqual([...Lp.feluriPrinderi], FELURI);
  for (const [nume, def] of MOSTRE) {
    const p = fa(def);
    assert.ok(Array.isArray(p.prinderi), `${nume}: are lista`);
    assert.deepEqual(JSON.parse(JSON.stringify(Lp.prinderi(def))), JSON.parse(JSON.stringify(p.prinderi)), `${nume}: prinderi(def) e lista piesei`);
    for (const c of p.prinderi) {
      assert.ok(FELURI.includes(c.fel), `${nume}: felul ${c.fel}`);
      // locul e pe piesă: în cutia ei (rădăcina unui tată și gura unei mame stau pe material)
      for (let k = 0; k < 3; k++) assert.ok(c.p[k]! >= -1e-6 && c.p[k]! <= p.dim[k]! + 1e-6, `${nume}: ${c.fel} la ${p3(c.p)} e în cutia piesei ${p3(p.dim)}`);
    }
  }
});

test('numerele de pe hârtie: câte știfturi, locașuri, găuri, capete, bare, cleme, bile și cupe are fiecare mostră', () => {
  for (const [nume, def, numere] of MOSTRE) assert.deepEqual(numara(fa(def).prinderi), numere, nume);
});

test('fiecare prindere declarată e pe plasă: știftul e știft, locașul îl ține, gaura e rotundă sau în cruce, bara e liberă', () => {
  let n = 0;
  for (const [nume, def, , opt] of MOSTRE) {
    const p = fa(def);
    p.prinderi.forEach((c, k) => { peMasa(p, c, `${nume}, ${c.fel} ${k} la ${p3(c.p)} spre ${p3(c.d)}`, opt?.slab); n++; });
  }
  assert.ok(n > 300, `prinderi judecate: ${n}`);
});

test('proba vede o prindere mincinoasă: mutată, întoarsă, de alt fel sau cu altă lungime, cade', () => {
  const pica = (p: CuPrinderi, c: Prindere, ce: string) => assert.throws(() => peMasa(p, c, ce), assert.AssertionError, ce);
  for (const [nume, def] of MOSTRE.filter(([n]) => ['cărămida 2 × 4', 'grinda de 3', 'bucșa', 'axul de 3', 'știftul', 'bara de 4', 'clema', 'bila', 'cupa', 'placa 1 × 2 cu știfturi goale'].includes(n))) {
    const p = fa(def);
    for (const c of p.prinderi.slice(0, 4)) {
      const [u] = reper(c.d);
      pica(p, { ...c, p: plus(c.p, u, 0.4) }, `${nume}, ${c.fel}: mutată cu 0,4 mm`);
      pica(p, { ...c, d: minus([0, 0, 0], c.d), ...(c.r ? { r: c.r } : {}) }, `${nume}, ${c.fel}: întoarsă`);
      // gaura de bară a știftului gol se deschide în golul de sub capac: lungimea ei n-are cum să se vadă pe plasă
      if (c.fel !== 'bila' && c.fel !== 'cupa' && c.fel !== 'gauraBara') pica(p, { ...c, lung: c.lung + 1.5 }, `${nume}, ${c.fel}: prea lungă`);
      if (c.r) pica(p, { ...c, r: unitar(plus(c.r, vect(c.d, c.r), 1)) }, `${nume}, ${c.fel}: brațul rotit cu 45°`);
    }
  }
  // felul greșit: gaura rotundă dată drept gaură de ax și invers; știftul dat drept locaș
  const g = fa({ tip: 'grinda' }), b = fa({ tip: 'bucsa' }), c = fa({ tip: 'caramida', celule: rand(2, 2) });
  pica(g, { ...g.prinderi[0]!, fel: 'gauraAx', r: [1, 0, 0] }, 'gaura rotundă nu e gaură de ax');
  pica(b, { ...b.prinderi[0]!, fel: 'gauraStift' }, 'gaura de ax nu e gaură rotundă');
  pica(c, { ...c.prinderi.find((x) => x.fel === 'stift')!, fel: 'locas' }, 'știftul nu e locaș');
  pica(c, { ...c.prinderi.find((x) => x.fel === 'locas')!, fel: 'stift' }, 'locașul nu e știft');
});

test('locurile de pe hârtie: cărămida, grinda, cărămida Technic, axul, știftul, bucșa, conectorii, clema, bila și cupa', () => {
  const P = L.parametri(), E = L.efective(), S = P.pas!, H = r3(3 * P.placa!), G = P.grinda_groasa!;
  const de = (def: Def, fel: string) => fa(def).prinderi.filter((c) => c.fel === fel).map((c) => [p3(c.p), p3(c.d), r3(c.lung), !!c.orb] as const);
  // cărămida 2 × 2: știfturile pe grilă, pe fața de sus; locașurile sub ele, pe masă; cărămida începe la 0,1 de grilă
  assert.deepEqual(de({ tip: 'caramida', celule: rand(2, 2) }, 'stift'), [[3.9, 3.9], [11.9, 3.9], [3.9, 11.9], [11.9, 11.9]].map(([x, y]) => [[x, y, H], [0, 0, 1], P.stift_h, false]));
  assert.deepEqual(de({ tip: 'caramida', celule: rand(2, 2) }, 'locas'), [[3.9, 3.9], [11.9, 3.9], [3.9, 11.9], [11.9, 11.9]].map(([x, y]) => [[x, y, 0], [0, 0, -1], r3(H - P.sus!), true]));
  assert.deepEqual(de({ tip: 'caramida', celule: rand(2, 2), placi: 1, fund: 'locasuri' }, 'locas').map((x) => x[2]), [2.1, 2.1, 2.1, 2.1]);
  // știftul din mijloc, la jumătate de pas
  assert.deepEqual(de({ tip: 'caramida', celule: rand(4), stifturi: 'mijloc' }, 'stift'), [[[15.9, 3.9, H], [0, 0, 1], P.stift_h, false]]);
  // grinda de 3, groasă: găurile la 8 mm, pe amândouă fețele, prin toată grosimea
  assert.deepEqual(de({ tip: 'grinda' }, 'gauraStift'), [0, 1, 2].flatMap((k) => [[[3.6 + S * k, 3.6, G], [0, 0, 1], G, false], [[3.6 + S * k, 3.6, 0], [0, 0, -1], G, false]]));
  // cărămida Technic 1 × 4: găurile între știfturi, la 5,8 mm de jos, de-a latul
  assert.deepEqual(de({ tip: 'caramidaTechnic' }, 'gauraStift'), [1, 2, 3].flatMap((k) => [[[S * k - 0.1, 0, P.technic_h], [0, -1, 0], 7.8, false], [[S * k - 0.1, 7.8, P.technic_h], [0, 1, 0], 7.8, false]]));
  // axul de 3: cele două capete, fiecare rădăcină la capătul celălalt
  assert.deepEqual(de({ tip: 'ax', lung: 3 }, 'capatAx'), [[[0, 2.375, 2.375], [1, 0, 0], 23.8, false], [[23.8, 2.375, 2.375], [-1, 0, 0], 23.8, false]]);
  // axul de 4 cu opritor: rădăcina pe fața opritorului (1 mm gros, la capăt)
  assert.deepEqual(de({ tip: 'ax', lung: 4, opritor: true }, 'capatAx'), [[[30.8, 3, 2.375], [-1, 0, 0], 30.8, false]]);
  // știftul: rădăcinile pe fețele gulerului (1,6 mm, la mijloc), câte 7,1 mm până la vârf; gulerul intră 0,8 în lamaj
  // (deci într-o grindă groasă știftul ține 7,9); axa la 2,025 de masă
  assert.deepEqual(de({ tip: 'stiftTechnic' }, 'stiftTechnic'), [[[7.1, 3, 2.025], [-1, 0, 0], 7.1, false], [[8.7, 3, 2.025], [1, 0, 0], 7.1, false]]);
  assert.deepEqual(de({ tip: 'stiftTechnic', lung: 3 }, 'stiftTechnic'), [[[15.1, 3, 2.025], [-1, 0, 0], 15.1, false], [[16.7, 3, 2.025], [1, 0, 0], 7.1, false]]);
  assert.deepEqual(de({ tip: 'stiftTechnic', capat: 'ax' }, 'capatAx'), [[[8.7, 3, 2.025], [1, 0, 0], 7.1, false]]);
  assert.deepEqual(fa({ tip: 'stiftTechnic', capat: 'ax' }).prinderi.map((c) => c.guler), [0.8, 0.8]);
  assert.deepEqual(fa({ tip: 'stiftTechnic', capat: 'bucsa' }).prinderi.map((c) => c.guler), [undefined]);
  // lamajul: la grinda groasă, la cărămida Technic și la conectori; nu la grinda subțire, la plăci și la roți
  const lamaje = (def: Def) => [...new Set(fa(def).prinderi.filter((c) => c.fel === 'gauraStift').map((c) => c.lamaj))];
  assert.deepEqual([lamaje({ tip: 'grinda' }), lamaje({ tip: 'caramidaTechnic' }), lamaje({ tip: 'conector', gauri: ['rv', 'ro', 'rl'] }), lamaje({ tip: 'conectorUnghi', mansoane: [[0, 'r']] })], [[0.8], [0.8], [0.8], [0.8]]);
  assert.deepEqual([lamaje({ tip: 'grinda', groasa: false }), lamaje({ tip: 'caramida', celule: rand(2, 2), gauri: [[1, 1, 'r']] }), lamaje({ tip: 'rotita', gaura: 'r' }), lamaje({ tip: 'bucsa', gaura: 'r' })], [[undefined], [undefined], [undefined], [undefined]]);
  // știftul cu bucșă: rădăcina pe fața bucșei
  assert.deepEqual(de({ tip: 'stiftTechnic', capat: 'bucsa' }, 'stiftTechnic'), [[[7.9, 3.6, 2.025], [-1, 0, 0], 7.9, false]]);
  // bucșa: gaura de ax, prin toată înălțimea; conectorul de ax și știft: câte o jumătate
  assert.deepEqual(de({ tip: 'bucsa' }, 'gauraAx'), [[[3.6, 3.6, 7.8], [0, 0, 1], 7.8, false], [[3.6, 3.6, 0], [0, 0, -1], 7.8, false]]);
  assert.deepEqual(de({ tip: 'bucsa', lung: 2, gaura: 'xr' }, 'gauraAx'), [[[3.6, 3.6, 0], [0, 0, -1], 7.9, false]]);
  assert.deepEqual(de({ tip: 'bucsa', lung: 2, gaura: 'xr' }, 'gauraStift'), [[[3.6, 3.6, 15.8], [0, 0, 1], 7.9, true]]);
  // conectorul perpendicular: gaura de ax în sus (pasul 0), cea de știft de-a latul (pasul 1)
  assert.deepEqual(de({ tip: 'conector' }, 'gauraAx'), [[[3.9, 3.9, G], [0, 0, 1], G, false], [[3.9, 3.9, 0], [0, 0, -1], G, false]]);
  assert.deepEqual(de({ tip: 'conector' }, 'gauraStift'), [[[11.9, 0, 3.9], [0, -1, 0], G, false], [[11.9, G, 3.9], [0, 1, 0], G, false]]);
  // gaura în lung: din capăt, adâncă de un pas, oarbă
  assert.deepEqual(de({ tip: 'conector', gauri: ['xl', 'rv', 'ro', 'rl'] }, 'gauraAx'), [[[0, 3.9, 3.9], [-1, 0, 0], 7.91, true]]);
  assert.deepEqual(de({ tip: 'conector', gauri: ['xl', 'rv', 'ro', 'rl'] }, 'gauraStift').at(-1), [[31.8, 3.9, 3.9], [1, 0, 0], 7.91, true]);
  // conectorul în unghi: manșoanele, de la gură (la un pas și jumătate de centru) spre butuc, adânci de 7,9
  const cu = fa({ tip: 'conectorUnghi', mansoane: [[0, 'x'], [90, 'r']] }), m = G / 2;
  const mans = cu.prinderi.filter((c) => c.orb).map((c) => [c.fel, p3(c.p), p3(c.d), r3(c.lung)]);
  assert.deepEqual(mans, [['gauraAx', [m + 11.9, m, m], [1, 0, 0], 7.9], ['gauraStift', [m, m + 11.9, m], [0, 1, 0], 7.9]]);
  // clema în picioare: mijlocul inelului, în fața plăcii; bara trece prin ea de sus în jos
  const ro = E.clemaD! / 2 + P.clema_perete!;
  const cl = fa({ tip: 'clema' }), yc = cl.prinderi.find((c) => c.fel === 'clema')!.p[1];
  // gura (2,5 mm) e spre în față: marginea piesei e la capetele gurii, nu la raza întreagă a inelului
  assert.ok(Math.abs(yc - Math.sqrt(ro * ro - (P.clema_gura! / 2) ** 2)) < 1e-9, `mijlocul clemei, față de capetele gurii (${yc})`);
  assert.deepEqual(de({ tip: 'clema' }, 'clema').map((x) => [x[0][0], x[0][2], x[1], x[2]]), [[3.9, P.placa, [0, 0, 1], P.placa], [3.9, 0, [0, 0, -1], P.placa]]);
  // mânerul 1 × 2: bara liberă între cele două brațe (1,6 mm fiecare)
  assert.deepEqual(de({ tip: 'maner', lung: 2, axa: 'orizontala' }, 'bara').map((x) => [x[0][0], x[1], x[2]]), [[1.6, [1, 0, 0], 12.6], [14.2, [-1, 0, 0], 12.6]]);
  // bila și cupa: centrul sferei, deasupra plăcii
  const rb = P.bila_d! / 2, zb = P.placa! + 1.5 + Math.sqrt(rb * rb - 1.6 * 1.6);
  assert.deepEqual(de({ tip: 'bila' }, 'bila'), [[[3.9, 3.9, r3(zb)], [0, 0, 1], P.bila_d, false]]);
  // cupa: bila stă pe fundul plat al găurii (la 0,7 mm peste placă), deci centrul ei e la o rază de bilă deasupra lui
  assert.deepEqual(de({ tip: 'cupa' }, 'cupa'), [[[3.9, 3.9, r3(P.placa! + 0.7 + rb)], [0, 0, 1], E.cupaD, false]]);
  // roata dințată de 24: gaura în mijloc, prin grosimea ei
  const ro24 = fa({ tip: 'rotita' });
  assert.deepEqual(ro24.prinderi.map((c) => [p3(c.p), p3(c.d), c.lung]), [[[r3(ro24.dim[0]! / 2), r3(ro24.dim[1]! / 2), 3.8], [0, 0, 1], 3.8], [[r3(ro24.dim[0]! / 2), r3(ro24.dim[1]! / 2), 0], [0, 0, -1], 3.8]]);
});

test('prinderile urmează calibrarea și înălțimile din profilul imprimantei', () => {
  try {
    calibrat = true;
    Lp.seteaza({ varianta_stift: 1, varianta_locas: 5, varianta_gaura: 5, varianta_ax: 1, varianta_bara: 5, varianta_cupa: 1, stift_h: 2.6, locas_h: 2.8 });
    const st = fa({ tip: 'caramida', celule: rand(2, 2), fund: 'locasuri' }).prinderi;
    assert.deepEqual([...new Set(st.map((c) => `${c.fel} ${c.lung}`))], ['locas 2.8', 'stift 2.6']);
    for (const nume of ['cărămida 2 × 4', 'placa 2 × 2 cu locașuri', 'placa 1 × 2 cu știfturi goale', 'grinda de 3', 'cărămida Technic 1 × 4', 'bucșa', 'conectorul pe trei axe', 'conectorul în unghi', 'clema', 'cupa', 'rotundul 1 × 1 cu gaură de bară', 'zala de șenilă']) {
      const [, def] = MOSTRE.find(([n]) => n === nume)!, p = fa(def);
      p.prinderi.forEach((c, k) => peMasa(p, c, `calibrat: ${nume}, ${c.fel} ${k}`));
    }
  } finally { Lp.seteaza(null); calibrat = false; }
});

test('ce se prinde cu ce: fiecare fel are perechea lui, iar tabela e simetrică', () => {
  const perechi = [['stift', 'locas'], ['stiftTechnic', 'gauraStift'], ['capatAx', 'gauraAx'], ['capatAx', 'gauraStift'], ['bara', 'clema'], ['bara', 'gauraBara'], ['bila', 'cupa']];
  for (const a of FELURI) for (const b of FELURI) {
    const da = perechi.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    assert.equal(Lp.sePrind(a, b), da, `${a} cu ${b}`);
  }
  for (const a of FELURI) assert.ok(FELURI.some((b) => Lp.sePrind(a, b)), `${a} are o pereche`);
  // un tată se prinde doar cu o mamă
  for (const a of FELURI) for (const b of FELURI) if (Lp.sePrind(a, b)) assert.notEqual(TATA.has(a), TATA.has(b), `${a} cu ${b}: un tată și o mamă`);
  assert.equal(Lp.sePrind('stift', 'altceva'), false);
});

// ---------------------------------------------------------------------------------------------------- perechile, montate
const aplica = (M: Montaj, q: P3): P3 => [
  M.m[0]! * q[0] + M.m[1]! * q[1] + M.m[2]! * q[2] + M.t[0], M.m[3]! * q[0] + M.m[4]! * q[1] + M.m[5]! * q[2] + M.t[1], M.m[6]! * q[0] + M.m[7]! * q[1] + M.m[8]! * q[2] + M.t[2]];
const roteste = (M: Montaj, q: P3): P3 => minus(aplica(M, q), M.t);
const mutata = (M: Montaj, tri: readonly Tri[]): Tri[] => tri.map((t) => t.map((q) => aplica(M, q)) as Tri);
function cutie(tri: readonly Tri[]): [P3, P3] {
  const a: P3 = [Infinity, Infinity, Infinity], b: P3 = [-Infinity, -Infinity, -Infinity];
  for (const t of tri) for (const q of t) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k]!, q[k]!); b[k] = Math.max(b[k]!, q[k]!); }
  return [a, b];
}
/** Punctele din lemnul unei plase, la 0,05 mm sub fiecare față (mijlocul triunghiului, tras înăuntru), care cad în cutia dată. */
function subFete(tri: readonly Tri[], [a, b]: [P3, P3]): P3[] {
  const out: P3[] = [];
  for (const [p, q, r] of tri) {
    const n = vect(minus(q, p), minus(r, p)), l = lungime(n);
    if (l < 1e-9) continue;
    const c = plus([(p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3, (p[2] + q[2] + r[2]) / 3], n, -0.05 / l);
    if (c.every((x, k) => x >= a[k]! && x <= b[k]!)) out.push(c);
  }
  return out;
}
/** Câte puncte din lemnul unei piese cad în lemnul celeilalte (în amândouă sensurile). */
function patrund(a: readonly Tri[], b: readonly Tri[]): number {
  const pa = { tri: a as Tri[] } as Piesa, pb = { tri: b as Tri[] } as Piesa;
  return subFete(b, cutie(a)).filter((q) => plin(pa, q)).length + subFete(a, cutie(b)).filter((q) => plin(pb, q)).length;
}
const cu = (M: Montaj, d: P3): Montaj => ({ m: M.m, t: plus(M.t, d, 1) });

test('montajul e o mutare rigidă: duce prinderea a doua peste prima, față în față, și se poate roti în jurul axei', () => {
  const a = fa({ tip: 'grinda' }).prinderi[0]!, b = fa({ tip: 'stiftTechnic' }).prinderi[0]!;
  for (const unghi of [0, 30, 90, 217]) {
    const M = Lp.montaj(a, b, unghi), R = M.m;
    // matricea e o rotație: coloane unitare, perpendiculare, determinantul 1
    const col = (k: number): P3 => [R[k]!, R[3 + k]!, R[6 + k]!];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) assert.ok(Math.abs(punct(col(i), col(j)) - (i === j ? 1 : 0)) < 1e-9, `rotație (${unghi}°)`);
    assert.ok(Math.abs(punct(col(0), vect(col(1), col(2))) - 1) < 1e-9, `fără oglindire (${unghi}°)`);
    // gulerul știftului (0,8) intră în lamajul grinzii groase (0,8): rădăcina ajunge pe fundul lamajului
    assert.deepEqual(p3(aplica(M, b.p)), p3(plus(a.p, a.d, -0.8)), `rădăcina știftului ajunge în lamajul găurii (${unghi}°)`);
    assert.deepEqual(p3(roteste(M, b.d)), p3(minus([0, 0, 0], a.d)), `știftul intră în gaură (${unghi}°)`);
  }
  // rotirea e în jurul axei prinderii: un punct de pe axă nu se mișcă, unul de lângă ea se rotește cu unghiul cerut
  const M0 = Lp.montaj(a, b, 0), M9 = Lp.montaj(a, b, 90), q = plus(b.p, reper(b.d)[0], 1);
  assert.deepEqual(p3(aplica(M0, plus(b.p, b.d, 3))), p3(aplica(M9, plus(b.p, b.d, 3))));
  const o = aplica(M0, b.p);
  assert.deepEqual(p3(aplica(M9, b.p)), p3(o), 'rădăcina nu se mișcă la rotire');
  assert.ok(Math.abs(punct(minus(aplica(M0, q), o), minus(aplica(M9, q), o))) < 1e-9, 'la 90°, perpendicular pe locul de dinainte');
  assert.ok(Math.abs(lungime(minus(aplica(M9, q), o)) - 1) < 1e-9, 'la aceeași distanță de axă');
  // ordinea nu contează pentru cine e tată: montaj(mamă, tată) și montaj(tată, mamă) pun aceleași fețe una pe alta
  const Mi = Lp.montaj(b, a, 0);
  assert.deepEqual(p3(aplica(Mi, a.p)), p3(plus(b.p, b.d, -0.8)));
  // fără lamaj (grinda subțire), gulerul rămâne afară: rădăcina stă chiar pe gura găurii
  const sub = fa({ tip: 'grinda', groasa: false }).prinderi[0]!;
  assert.deepEqual(p3(aplica(Lp.montaj(sub, b), b.p)), p3(sub.p));
  // crucile se potrivesc singure: brațul axului ajunge pe brațul găurii, oricum ar fi rotită gaura
  const g8 = fa({ tip: 'rotita', dinti: 8 }).prinderi[0]!, ax = fa({ tip: 'ax', lung: 3 }).prinderi[0]!, Mx = Lp.montaj(g8, ax);
  const br = roteste(Mx, ax.r!), cos = Math.abs(punct(br, g8.r!));
  assert.ok(Math.abs(cos - 1) < 1e-9 || cos < 1e-9, `brațul axului cade pe un braț al găurii (${cos})`);
  // două prinderi care nu se prind nu se montează
  assert.throws(() => Lp.montaj(a, fa({ tip: 'grinda' }).prinderi[1]!), /nu se prind/);
});

test('perechile, pe plase: montate, nu se pătrund; mutate cu 0,4 mm într-o parte, se pătrund', () => {
  const primul = (def: Def, fel: string, k = 0) => { const p = fa(def); return [p, p.prinderi.filter((c) => c.fel === fel)[k]!] as const; };
  // [numele, piesa întâi și prinderea ei, a doua, în câte din cele patru direcții trebuie să se pătrundă mutate, unghiul]
  const perechi: readonly (readonly [string, readonly [CuPrinderi, Prindere], readonly [CuPrinderi, Prindere], number, number?])[] = [
    ['placa 2 × 2 pe cărămida 2 × 4', primul({ tip: 'caramida', celule: rand(4, 2) }, 'stift', 1), primul({ tip: 'caramida', celule: rand(2, 2), placi: 1 }, 'locas', 0), 4],
    ['placa cu locașuri pe cărămida 1 × 4', primul({ tip: 'caramida', celule: rand(4) }, 'stift', 2), primul({ tip: 'caramida', celule: rand(2, 2), placi: 1, fund: 'locasuri' }, 'locas', 3), 4],
    ['cărămida pe știftul lateral', primul({ tip: 'lateral', lung: 2 }, 'stift', 2), primul({ tip: 'caramida', celule: rand(2), placi: 1 }, 'locas', 0), 4],
    ['știftul în grindă', primul({ tip: 'grinda' }, 'gauraStift', 2), primul({ tip: 'stiftTechnic' }, 'stiftTechnic', 0), 3],
    // fără lamaj, gulerul rămâne afară: știftul nu intră în grinda subțire, în placă sau în roată mai mult decât până la guler
    ['știftul în grinda subțire (fără lamaj)', primul({ tip: 'grinda', groasa: false }, 'gauraStift', 1), primul({ tip: 'stiftTechnic' }, 'stiftTechnic', 1), 3],
    ['știftul în placa cu găuri', primul({ tip: 'caramida', celule: rand(4, 2), placi: 1, gauri: [[1, 1, 'r']] }, 'gauraStift', 0), primul({ tip: 'stiftTechnic', fanta: false }, 'stiftTechnic', 0), 3],
    ['știftul cu ax în grindă (gulerul în lamaj)', primul({ tip: 'grinda' }, 'gauraStift', 0), primul({ tip: 'stiftTechnic', capat: 'ax' }, 'capatAx', 0), 4],
    ['știftul de 3 prin cărămida Technic', primul({ tip: 'caramidaTechnic' }, 'gauraStift', 1), primul({ tip: 'stiftTechnic', lung: 3, fanta: false }, 'stiftTechnic', 0), 3],
    ['axul în bucșă', primul({ tip: 'bucsa' }, 'gauraAx', 0), primul({ tip: 'ax', lung: 3 }, 'capatAx', 0), 4],
    ['axul în roata de 8 (crucea rotită)', primul({ tip: 'rotita', dinti: 8 }, 'gauraAx', 1), primul({ tip: 'ax', lung: 2 }, 'capatAx', 1), 4],
    ['axul în grindă (se rotește liber)', primul({ tip: 'grinda', groasa: false }, 'gauraStift', 0), primul({ tip: 'ax', lung: 2 }, 'capatAx', 0), 4],
    ['axul în manșonul conectorului în unghi', primul({ tip: 'conectorUnghi' }, 'gauraAx', 1), primul({ tip: 'ax', lung: 4 }, 'capatAx', 0), 4],
    ['axul cu opritor în conectorul perpendicular', primul({ tip: 'conector' }, 'gauraAx', 0), primul({ tip: 'ax', lung: 3, opritor: true }, 'capatAx', 0), 4],
    ['bara în clemă', primul({ tip: 'clema' }, 'clema', 0), primul({ tip: 'bara', lung: 3 }, 'bara', 0), 4],
    // clema stă de partea cealaltă a barei față de placa mânerului: întoarsă cu o jumătate de tură în jurul barei
    ['clema pe mâner', primul({ tip: 'maner', lung: 2, axa: 'orizontala' }, 'bara', 0), primul({ tip: 'clema', axa: 'orizontala' }, 'clema', 0), 4, 180],
    ['bara în știftul gol', primul({ tip: 'caramida', celule: rand(2), placi: 1, goale: true }, 'gauraBara', 0), primul({ tip: 'bara', lung: 2 }, 'bara', 1), 4],
    ['bila în cupă', primul({ tip: 'cupa' }, 'cupa', 0), primul({ tip: 'bila' }, 'bila', 0), 4],
  ];
  for (const [nume, [pa, a], [pb, b], cate, unghi] of perechi) {
    assert.ok(a && b, `${nume}: amândouă prinderile există`);
    assert.ok(Lp.sePrind(a.fel, b.fel), `${nume}: felurile se prind`);
    const M = Lp.montaj(a, b, unghi ?? 0), [u, v] = reper(a.d);
    assert.equal(patrund(pa.tri, mutata(M, pb.tri)), 0, `${nume}: montate, nu se pătrund`);
    const lovite = [u, v, minus([0, 0, 0], u), minus([0, 0, 0], v)].filter((w) => patrund(pa.tri, mutata(cu(M, [w[0] * 0.4, w[1] * 0.4, w[2] * 0.4]), pb.tri)) > 0).length;
    assert.ok(lovite >= cate, `${nume}: mutate cu 0,4 mm, se pătrund în ${lovite} din 4 direcții (cer ${cate})`);
  }
});

test('cât intră: un tată mai lung decât gaura oarbă se oprește în fundul ei; știftul prea înalt lasă piesa mai sus', () => {
  // axul de 4 (31,8) în manșonul de 7,9: vârful ajunge în fund, restul rămâne afară
  const [cu1, g] = [fa({ tip: 'conectorUnghi' }), fa({ tip: 'conectorUnghi' }).prinderi.find((c) => c.orb)!];
  const ax = fa({ tip: 'ax', lung: 4 }).prinderi[0]!, M = Lp.montaj(g, ax);
  assert.deepEqual(p3(aplica(M, plus(ax.p, ax.d, ax.lung))), p3(plus(g.p, g.d, -g.lung)), 'vârful axului e în fundul manșonului');
  assert.ok(cu1.prinderi.length > 0);
  // la fel, oricare ar fi prima: gaura pusă pe ax își duce fundul la vârful lui
  const Mi = Lp.montaj(ax, g);
  assert.deepEqual(p3(aplica(Mi, plus(g.p, g.d, -g.lung))), p3(plus(ax.p, ax.d, ax.lung)), 'fundul manșonului ajunge la vârful axului');
  // bara în știftul gol al cărămizii Technic (gaura ține cât știftul, 1,9): intră doar atât, în amândouă ordinile
  const gol = fa({ tip: 'caramidaTechnic', lung: 2, goale: true }).prinderi.find((c) => c.fel === 'gauraBara')!, bara = fa({ tip: 'bara', lung: 2 }).prinderi[0]!;
  assert.deepEqual([gol.orb, gol.lung, bara.lung], [true, 1.9, 15.8]);
  assert.deepEqual(p3(aplica(Lp.montaj(gol, bara), plus(bara.p, bara.d, bara.lung))), p3(plus(gol.p, gol.d, -gol.lung)), 'vârful barei e în fundul știftului gol');
  assert.deepEqual(p3(aplica(Lp.montaj(bara, gol), plus(gol.p, gol.d, -gol.lung))), p3(plus(bara.p, bara.d, bara.lung)), 'fundul știftului gol ajunge la vârful barei');
  // știftul de 2,6 într-un locaș de 2,1: piesa de deasupra rămâne cu 0,5 mm mai sus
  try {
    calibrat = true;
    Lp.seteaza({ stift_h: 2.6, locas_h: 2.1, locas_urmeaza: false });
    const jos = fa({ tip: 'caramida', celule: rand(2, 2) }), sus = fa({ tip: 'caramida', celule: rand(2, 2), placi: 1, fund: 'locasuri' });
    const a = jos.prinderi.find((c) => c.fel === 'stift')!, b = sus.prinderi.find((c) => c.fel === 'locas')!, M2 = Lp.montaj(a, b);
    assert.deepEqual([a.lung, b.lung], [2.6, 2.1]);
    assert.equal(r3(aplica(M2, b.p)[2] - a.p[2]), 0.5);
    assert.equal(patrund(jos.tri, mutata(M2, sus.tri)), 0);
  } finally { Lp.seteaza(null); calibrat = false; }
});

// ---------------------------------------------------------------------------------------------------- pentru panoul „Se prinde cu”
test('rezumatul: gaura care trece se numără o dată, ca axul și bara; știfturile și locașurile, fiecare', () => {
  const rez = (def: Def) => Object.fromEntries(Array.from(Lp.rezumatPrinderi(fa(def).prinderi), (x) => [x.fel, x.cate]));
  assert.deepEqual(rez({ tip: 'caramida', celule: rand(4, 2) }), { stift: 8, locas: 8 });
  assert.deepEqual(rez({ tip: 'grinda' }), { gauraStift: 3 });
  assert.deepEqual(rez({ tip: 'caramida', celule: rand(4, 2), placi: 1, gauri: [[1, 1, 'r'], [2, 1, 'x'], [3, 1, 'r']] }), { stift: 8, locas: 8, gauraStift: 2, gauraAx: 1 });
  assert.deepEqual(rez({ tip: 'ax', lung: 3 }), { capatAx: 1 });
  assert.deepEqual(rez({ tip: 'stiftTechnic' }), { stiftTechnic: 1 });
  assert.deepEqual(rez({ tip: 'stiftTechnic', capat: 'ax' }), { stiftTechnic: 1, capatAx: 1 });
  assert.deepEqual(rez({ tip: 'bara' }), { bara: 1 });
  // mânerul 1 × 3 are o singură bară, ținută în trei locuri
  assert.deepEqual(rez({ tip: 'maner', lung: 3, axa: 'orizontala' }), { stift: 3, locas: 3, bara: 1 });
  assert.deepEqual(rez({ tip: 'clema' }), { stift: 1, locas: 1, clema: 1 });
  // două găuri oarbe pe aceeași dreaptă (capetele conectorului) rămân două; conectorul de ax și știft are câte una
  assert.deepEqual(rez({ tip: 'conector', gauri: ['rl', 'pv', 'rl'] }), { gauraStift: 2 });
  assert.deepEqual(rez({ tip: 'bucsa', lung: 2, gaura: 'xr' }), { gauraStift: 1, gauraAx: 1 });
  assert.deepEqual(rez({ tip: 'conectorUnghi' }), { gauraStift: 1, gauraAx: 2 });
  // știfturile laterale de pe două fețe stau pe aceeași dreaptă, dar sunt două
  assert.deepEqual(rez({ tip: 'lateral', lung: 1, fete: 'doua' }), { stift: 3, locas: 1 });
  assert.deepEqual(rez({ tip: 'caramida', celule: rand(2), placi: 1, goale: true }), { stift: 2, locas: 2, gauraBara: 2 });
  assert.deepEqual(rez({ tip: 'senila' }), { gauraStift: 2, bara: 1, clema: 2 });
  assert.deepEqual(rez({ tip: 'rotita', gaura: 'nu' }), {});
  // ordinea e a felurilor, nu a piesei
  assert.deepEqual(Array.from(Lp.rezumatPrinderi(fa({ tip: 'caramida', celule: rand(2, 2), placi: 1, gauri: [[1, 1, 'x']] }).prinderi), (x) => x.fel), ['stift', 'locas', 'gauraAx']);
});

test('ce feluri se potrivesc între două piese, și în ce sens', () => {
  const intre = (a: Def, b: Def) => Array.from(Lp.perechiFeluri(fa(a).prinderi, fa(b).prinderi), ([x, y]) => `${x}>${y}`);
  assert.deepEqual(intre({ tip: 'caramida', celule: rand(2, 2) }, { tip: 'panta' }), ['stift>locas', 'locas>stift']);
  assert.deepEqual(intre({ tip: 'caramida', celule: rand(2, 2) }, { tip: 'bila' }), ['stift>locas']);
  assert.deepEqual(intre({ tip: 'grinda' }, { tip: 'stiftTechnic' }), ['gauraStift>stiftTechnic']);
  assert.deepEqual(intre({ tip: 'grinda' }, { tip: 'ax' }), ['gauraStift>capatAx']);
  assert.deepEqual(intre({ tip: 'rotita' }, { tip: 'ax' }), ['gauraAx>capatAx']);
  assert.deepEqual(intre({ tip: 'rotita' }, { tip: 'stiftTechnic' }), []);
  assert.deepEqual(intre({ tip: 'rotita' }, { tip: 'stiftTechnic', capat: 'ax' }), ['gauraAx>capatAx']);
  assert.deepEqual(intre({ tip: 'ax' }, { tip: 'conectorUnghi' }), ['capatAx>gauraStift', 'capatAx>gauraAx']);
  assert.deepEqual(intre({ tip: 'bara' }, { tip: 'clema' }), ['bara>clema']);
  assert.deepEqual(intre({ tip: 'clema' }, { tip: 'maner' }), ['stift>locas', 'locas>stift', 'clema>bara']);
  assert.deepEqual(intre({ tip: 'bila' }, { tip: 'cupa' }), ['bila>cupa']);
  assert.deepEqual(intre({ tip: 'bila' }, { tip: 'ax' }), []);
  assert.deepEqual(intre({ tip: 'bara' }, { tip: 'caramida', celule: rand(2), placi: 1, goale: true }), ['bara>gauraBara']);
  assert.deepEqual(intre({ tip: 'rotita', gaura: 'nu' }, { tip: 'ax' }), []);
});

test('axul și știftul potrivit: axul trece prin gaura cea mai adâncă și mai iese un pas; știftul de 3, doar prin două grosimi', () => {
  const ax = (def: Def) => Lp.axPentru(fa(def).prinderi), st = (def: Def) => Lp.stiftPentru(fa(def).prinderi);
  // roata de 3,8: axul de 2 (15,8); grinda de 7,8: tot 2 (iese 8); bucșa de 2 (15,8): axul de 3; butucul elicei (8): 3
  assert.deepEqual([ax({ tip: 'rotita' }), ax({ tip: 'grinda' }), ax({ tip: 'bucsa', lung: 2 }), ax({ tip: 'elice' }), ax({ tip: 'bucsa', lung: 3 })], [2, 2, 3, 3, 4]);
  // manșonul orb de 7,9 al conectorului în unghi: axul intră 7,9 și mai iese un pas; cu butucul găurit (7,8), tot după
  // gaura cea mai adâncă
  assert.equal(ax({ tip: 'conectorUnghi', butuc: 'p' }), 3);
  assert.equal(ax({ tip: 'conectorUnghi' }), 3);
  // lățimea cărămizii Technic e 7,9 − 0,1 (în virgulă mobilă, cu un fir peste 7,8): tot axul de 2
  assert.deepEqual([ax({ tip: 'caramidaTechnic' }), ax({ tip: 'cremaliera', prindere: 'gauri' }), ax({ tip: 'conector' })], [2, 2, 2]);
  // fără găuri pentru ax: nimic
  assert.deepEqual([ax({ tip: 'caramida', celule: rand(2, 2) }), ax({ tip: 'bara' }), ax({ tip: 'rotita', gaura: 'nu' })], [null, null, null]);
  // știftul: de 2 prin grindă, cărămida Technic sau roată; de 3 doar unde gaura trece de un pas (bucșa rotundă de 2)
  assert.deepEqual([st({ tip: 'grinda' }), st({ tip: 'caramidaTechnic' }), st({ tip: 'rotita', gaura: 'r' }), st({ tip: 'bucsa', lung: 2, gaura: 'r' })], [2, 2, 2, 3]);
  assert.deepEqual([st({ tip: 'rotita' }), st({ tip: 'caramida', celule: rand(2, 2) })], [null, null]);
});
