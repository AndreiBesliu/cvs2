/**
 * Proba urechilor (ADR 0210, felia 11.3↑c), pe hârtie, pe mutări scrise de mână: foaia 100 × 80 × 10, freza plată Ø2 (raza
 * 1). Bucla din jurul unui pătrat 20 × 20 trece la 1 mm de el, deci tăietura ocupă 2 mm în afara lui. Fără urechi, pătratul
 * se desprinde; cu o ureche (un bucat de buclă oprit la −8, puntea de 2 mm), ține; aceeași bucată coborâtă la −10 (controlul),
 * se desprinde iar. Două pătrate la distanța g: între tăieturi rămân g − 2 · 2 mm de lemn. La 3 mm se unesc, deci urechea
 * dinspre vecin nu ține, iar la 6 mm rămân 2 mm de care ține. Pe arce la fel. Și părțile probei: doar conturul închis
 * tăiat prin foaie de un profil exterior cu urechi, o dată, ca poligon cu săgeata coardelor sub toleranță.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partiCuUrechi, poligon, TOLERANTA_PARTI } from '../../src/cam/partiUrechi.ts';
import { conturCerc, conturDreptunghi } from '../../src/geom/conturBaza.ts';
import { documentNou, operatieImplicita, type Document, type Operatie, type Piesa } from '../../src/model/document.ts';
import { celulaDesprinse, partiDesprinse, PLAFON_DESPRINSE } from '../../src/sim/desprinse.ts';
import { STRIDE } from '../../src/sim/nucleu.ts';

const FOAIA = { latime: 100, inaltime: 80, grosime: 10 };
const PLATA = { forma: { tip: 'plata' as const }, diametru: 2 };

type Mutare = readonly number[];
const linie = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): Mutare => [0, ax, ay, az, bx, by, bz, 0, 0, 0];
const mutari = (m: readonly Mutare[]): Float64Array => {
  const out = new Float64Array(m.length * STRIDE);
  m.forEach((x, k) => { out.set(x, k * STRIDE); });
  return out;
};
const patrat = (x0: number, y0: number, x1: number, y1: number): Float64Array => Float64Array.from([x0, y0, x1, y0, x1, y1, x0, y1]);

/**
 * Bucla de la 1 mm în jurul pătratului [x0, x1] × [y0, y1], la Z: jos, dreapta, sus, stânga. `ureche`: pe ce latură (sus sau
 * dreapta), între ce coordonate și la ce Z se ridică.
 */
function bucla(x0: number, y0: number, x1: number, y1: number, z: number, ureche?: { latura: 'sus' | 'dreapta' | 'stanga'; a: number; b: number; z: number }): Mutare[] {
  const X0 = x0 - 1, Y0 = y0 - 1, X1 = x1 + 1, Y1 = y1 + 1;
  const m: Mutare[] = [linie(X0, Y0, z, X1, Y0, z)];
  if (ureche?.latura === 'dreapta') m.push(linie(X1, Y0, z, X1, ureche.a, z), linie(X1, ureche.a, ureche.z, X1, ureche.b, ureche.z), linie(X1, ureche.b, z, X1, Y1, z));
  else m.push(linie(X1, Y0, z, X1, Y1, z));
  if (ureche?.latura === 'sus') m.push(linie(X1, Y1, z, ureche.b, Y1, z), linie(ureche.b, Y1, ureche.z, ureche.a, Y1, ureche.z), linie(ureche.a, Y1, z, X0, Y1, z));
  else m.push(linie(X1, Y1, z, X0, Y1, z));
  if (ureche?.latura === 'stanga') m.push(linie(X0, Y1, z, X0, ureche.b, z), linie(X0, ureche.b, ureche.z, X0, ureche.a, ureche.z), linie(X0, ureche.a, z, X0, Y0, z));
  else m.push(linie(X0, Y1, z, X0, Y0, z));
  return m;
}

const desprinse = (m: readonly Mutare[], parti: readonly Float64Array[]): readonly number[] =>
  partiDesprinse({ foaie: FOAIA, grupuri: [{ scula: PLATA, mutari: mutari(m) }], parti }).desprinse;

test('un pătrat tăiat de jur împrejur se desprinde; cu o ureche de 2 mm, ține; urechea coborâtă la fund (controlul), iar se desprinde', () => {
  const p = [patrat(40, 30, 60, 50)];
  // Trecerile de deasupra fundului (−3, −6) nu desprind nimic: proba nu le vede.
  const sus = [...bucla(40, 30, 60, 50, -3), ...bucla(40, 30, 60, 50, -6)];
  assert.deepEqual(desprinse([...sus, ...bucla(40, 30, 60, 50, -10)], p), [0]);
  assert.deepEqual(desprinse([...sus, ...bucla(40, 30, 60, 50, -10, { latura: 'sus', a: 45, b: 55, z: -8 })], p), []);
  assert.deepEqual(desprinse([...sus, ...bucla(40, 30, 60, 50, -10, { latura: 'sus', a: 45, b: 55, z: -10 })], p), [0]);
  // Doar trecerile de deasupra: nimic tăiat prin foaie, nimic desprins.
  assert.deepEqual(desprinse(sus, p), []);
});

test('pragul fundului: o buclă oprită la 0,01 mm deasupra feței de jos lasă lemn (ține); una la 0,0005 mm, nu', () => {
  const p = [patrat(40, 30, 60, 50)];
  assert.deepEqual(desprinse(bucla(40, 30, 60, 50, -9.99), p), []);
  assert.deepEqual(desprinse(bucla(40, 30, 60, 50, -9.9995), p), [0]);
});

test('două pătrate vecine, cu urechea primului spre al doilea: la 3 mm tăieturile se unesc și primul cade; la 6 mm rămân 2 mm de lemn și ține', () => {
  for (const [g, asteptat] of [[3, [0]], [6, []]] as const) {
    // A: 20 … 40; B: 40 + g … 60 + g. Urechea lui A pe dreapta (spre B); a lui B tot pe dreapta, spre foaia liberă.
    const a = bucla(20, 30, 40, 50, -10, { latura: 'dreapta', a: 35, b: 45, z: -8 });
    const b = bucla(40 + g, 30, 60 + g, 50, -10, { latura: 'dreapta', a: 35, b: 45, z: -8 });
    assert.deepEqual(desprinse([...a, ...b], [patrat(20, 30, 40, 50), patrat(40 + g, 30, 60 + g, 50)]), asteptat, `g = ${g}`);
  }
});

test('pe arce: un cerc de rază 10, tăiat pe cercul de 11, cade; cu 20° ridicați la −8, ține', () => {
  const c = Float64Array.from(Array.from({ length: 128 }, (_, k) => [50 + 10 * Math.cos((2 * Math.PI * k) / 128), 40 + 10 * Math.sin((2 * Math.PI * k) / 128)]).flat());
  const pe = (u: number): [number, number] => [50 + 11 * Math.cos((u * Math.PI) / 180), 40 + 11 * Math.sin((u * Math.PI) / 180)];
  // Arcul trigonometric (felul 3): [fel, ax, ay, az, bx, by, bz, cx, cy, baleiaj].
  const arc = (u0: number, u1: number, z: number): Mutare => [3, ...pe(u0), z, ...pe(u1), z, 50, 40, ((u1 - u0) * Math.PI) / 180];
  assert.deepEqual(desprinse([[3, ...pe(0), -10, ...pe(0), -10, 50, 40, 2 * Math.PI]], [c]), [0]);
  assert.deepEqual(desprinse([arc(0, 340, -10), arc(340, 360, -8)], [c]), []);
});

test('o parte fără lemn înăuntru (scoasă toată de o freză Ø30 coborâtă prin foaie) nu se judecă', () => {
  const groasa = { forma: { tip: 'plata' as const }, diametru: 30 };
  const m = mutari([linie(50, 40, 0, 50, 40, -10)]);
  assert.deepEqual(partiDesprinse({ foaie: FOAIA, grupuri: [{ scula: groasa, mutari: m }], parti: [patrat(42, 32, 58, 48)] }).desprinse, []);
});

test('celula probei: 0,25 mm până la 4 194 304 de celule; 1 000 × 1 000 la 0,5 mm; o placă de 2 440 × 1 220 la 1 mm', () => {
  assert.equal(PLAFON_DESPRINSE, 4_194_304);
  assert.equal(celulaDesprinse(300, 220), 0.25);
  assert.equal(celulaDesprinse(1000, 1000), 0.5);
  assert.equal(celulaDesprinse(2440, 1220), 1);
});

/** O piesă dreptunghi 20 × 20 cu operația dată (profilul implicit, schimbat). */
function piesa(id: string, o: Partial<Operatie>): Piesa {
  const forma = { tip: 'dreptunghi', latime: 20, inaltime: 20, razaColt: 0 } as const;
  const baza = operatieImplicita(id, forma);
  return { id, radacina: { tip: 'element', id, forma, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [{ ...baza, ...o }] };
}

test('părțile probei: doar conturul tăiat prin foaie de un profil exterior cu urechi, o dată, cu mijlocul cutiei lui', () => {
  const U = { numar: 2, latime: 6, grosime: 2 };
  const piese = [
    piesa('ext', { latura: 'exterior', adancime: 10, urechi: U }),
    piesa('int', { latura: 'interior', adancime: 10, urechi: U }),
    piesa('fara', { latura: 'exterior', adancime: 10, urechi: null }),
    piesa('mica', { latura: 'exterior', adancime: 9, urechi: U }),
  ];
  // A doua operație exterioară cu urechi pe același element: tot o parte.
  const dubla = piese[0]!;
  const p0: Piesa = { ...dubla, operatii: [...dubla.operatii, { ...dubla.operatii[0]!, id: 'a2' }] };
  const d0 = documentNou(FOAIA);
  const doc: Document = {
    ...d0, piese: [p0, ...piese.slice(1)],
    foi: [{ ...d0.foi[0]!, instante: piese.map((p, k) => ({ id: `i${k}`, piesa: p.id, x: 5 + 22 * k, y: 10, rotire: 0 })) }],
  };
  const parti = partiCuUrechi(doc);
  assert.deepEqual(parti.map((x) => [x.instanta, x.element, x.x, x.y]), [['i0', 'i0/ext', 15, 20]]);
  assert.deepEqual([...parti[0]!.poligon], [5, 10, 25, 10, 25, 30, 5, 30]);
});

test('poligonul unui cerc: vârfurile pe cerc, iar săgeata fiecărei coarde cel mult toleranța', () => {
  const r = 10;
  const p = poligon(conturCerc(0, 0, r), TOLERANTA_PARTI);
  const n = p.length / 2;
  for (let k = 0; k < n; k++) assert.ok(Math.abs(Math.hypot(p[2 * k]!, p[2 * k + 1]!) - r) < 1e-9, `vârful ${k}`);
  // Coarda de unghi φ are săgeata r · (1 − cos(φ / 2)); aici, toate coardele sunt egale pe fiecare arc al cercului.
  for (let k = 0; k < n; k++) {
    const q = (k + 1) % n, mx = (p[2 * k]! + p[2 * q]!) / 2, my = (p[2 * k + 1]! + p[2 * q + 1]!) / 2;
    assert.ok(r - Math.hypot(mx, my) <= TOLERANTA_PARTI + 1e-12, `coarda ${k}`);
  }
  // Dreptunghiul rămâne cu cele patru colțuri.
  assert.deepEqual([...poligon(conturDreptunghi(1, 2, 3, 4), TOLERANTA_PARTI)], [1, 2, 4, 2, 4, 6, 1, 6]);
});
