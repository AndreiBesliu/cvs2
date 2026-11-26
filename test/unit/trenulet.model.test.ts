/**
 * Așezarea pieselor în vederea „Modelul” a atelierului Easy 3Draw (ADR 0283, felia 3.Tu), pe funcțiile pure ale motorului:
 * - o piesă rotundă își spune axul odată cu plasa, iar axul spus e cel de pe plasă (gaura ei din mijloc, golul carcasei);
 * - **1a:** axul unei piese rotunde stă în mijlocul unui știft, oriunde e pusă și oricum e rotită: amprenta ei e impară,
 *   iar pivotul (punctul din mijlocul amprentei) e axul; rotirea se face în jurul axului;
 * - piesele care nu sunt rotunde stau exact ca până la 18.32.0 (formula v18, scrisă din nou aici);
 * - **2a:** o piesă nouă intră cu pivotul cât mai aproape de al celei alese: două rotunde, pe același ax;
 * - **3a:** rotorul și carcasa în care încape stau la același Z; pe plase, rotorul chiar încape în golul ei.
 * Valorile sunt pe hârtie: amprentele și locul axului, în milimetri, socotite din cutiile pieselor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plin, type P3, type Piesa } from './ajutor-plasa-lego.ts';

type Def = Record<string, unknown> & { tip: string };
type Asezare = { gw: number; gd: number; pivot: number[]; ax: boolean };
type Corp = Piesa & { ax: number[] | null; prinderi: { fel: string; p: number[]; d: number[] }[] };
const Lm = L as unknown as {
  tipuri: readonly string[];
  construieste(d: Def): Corp;
  asezareModel(d: Def, corp?: Corp): Asezare;
  pivotModel(a: Asezare, x: number, y: number, rot: number): number[];
  langaPivot(a: Asezare, rot: number, tinta: readonly number[]): number[];
  impreunaInModel(a: Def, b: Def): boolean;
  ventilatorCote(d: Record<string, unknown>): { Rt: number; D: number; Hc: number };
};
/** Fiecare piesă se construiește o singură dată (elicele țin câteva zecimi de secundă), iar așezarea ei se ține minte. */
const corpuri = new Map<string, Corp>(), asezari = new Map<string, Asezare>();
const tinut = <T>(m: Map<string, T>, d: Def, f: () => T): T => { const k = JSON.stringify(d); let v = m.get(k); if (v === undefined) { v = f(); m.set(k, v); } return v; };
const fa = (d: Def) => tinut(corpuri, d, () => Lm.construieste(d));
const asezarea = (d: Def) => tinut(asezari, d, () => Lm.asezareModel(d, fa(d)));
const asez = (d: Def) => { const a = asezarea(d); return { gw: a.gw, gd: a.gd, pivot: [...a.pivot], ax: a.ax }; };
const loc = (d: Def, x: number, y: number, rot = 0) => [...Lm.pivotModel(asezarea(d), x, y, rot)];
const langa = (d: Def, rot: number, tinta: readonly number[]) => [...Lm.langaPivot(asezarea(d), rot, tinta)];
const r3 = (v: number) => Math.round(v * 1000) / 1000 + 0;
const rand = (n: number, m = 1): [number, number][] => Array.from({ length: n * m }, (_, k): [number, number] => [k % n, Math.floor(k / n)]);

const CARCASA48: Def = { tip: 'ventilator', piesa: 'carcasa', diametru: 48, urechi: 2 };
const ROTOR48: Def = { tip: 'ventilator', piesa: 'rotor', diametru: 48 };
const CARCASA40: Def = { tip: 'ventilator', piesa: 'carcasa', diametru: 40, urechi: 2 };
const ROTOR40: Def = { tip: 'ventilator', piesa: 'rotor', diametru: 40 };
const CARAMIDA24: Def = { tip: 'caramida', celule: rand(4, 2) };

/**
 * Piesele rotunde, pe hârtie: amprenta (știfturi) și locul axului (mm) pentru piesa pusă la x 0, y 0, nerotită. Amprenta
 * e cea de până acum (round((mărimea + 0,2) / 8)), cu un știft în plus unde era pară; axul e la 4 · amprenta.
 */
const ROTUNDE: readonly (readonly [string, Def, [number, number], [number, number]])[] = [
  ['roata dințată de 24 (26 mm)', { tip: 'rotita' }, [3, 3], [12, 12]],
  ['roata dințată de 8 (10 mm)', { tip: 'rotita', dinti: 8 }, [1, 1], [4, 4]],
  ['roata dințată de 12 (14 mm: era 2 × 2)', { tip: 'rotita', dinti: 12 }, [3, 3], [12, 12]],
  ['roata dințată de 16 (18 mm: era 2 × 2)', { tip: 'rotita', dinti: 16 }, [3, 3], [12, 12]],
  ['roata dințată de 40 (42 mm)', { tip: 'rotita', dinti: 40 }, [5, 5], [20, 20]],
  ['roata dințată fără gaură', { tip: 'rotita', gaura: 'nu' }, [3, 3], [12, 12]],
  ['roata cu anvelopă (30,4 mm: era 4 × 4)', { tip: 'roata' }, [5, 5], [20, 20]],
  ['fulia (24 mm)', { tip: 'fulie' }, [3, 3], [12, 12]],
  ['conica (21,4 mm)', { tip: 'conica' }, [3, 3], [12, 12]],
  ['coroana (25,8 mm)', { tip: 'coroana' }, [3, 3], [12, 12]],
  ['conica dublă de 12 (14 mm: era 2 × 2)', { tip: 'conicaDubla' }, [3, 3], [12, 12]],
  ['pinionul șenilei (40,7 mm)', { tip: 'senila', piesa: 'pinion' }, [5, 5], [20, 20]],
  ['șurubul melc Ø8 (10 mm)', { tip: 'melc' }, [1, 1], [4, 4]],
  ['șurubul melc Ø16 (18 mm: era 2 × 2)', { tip: 'melc', diam: 16 }, [3, 3], [12, 12]],
  ['cama excentrică (24 × 24, axul la 8 mm de margine)', { tip: 'cama' }, [3, 3], [12, 12]],
  ['cama pară (24 × 16: era 3 × 2)', { tip: 'cama', forma: 'para' }, [3, 3], [12, 12]],
  ['cama melc (28,1 × 24,1: era 4 × 3)', { tip: 'cama', forma: 'melc' }, [5, 3], [20, 12]],
  ['elicea cu 3 palete (55,3 × 63,4: era 7 × 8)', { tip: 'elice' }, [7, 9], [28, 36]],
  ['elicea cu 2 palete (72 × 10,4)', { tip: 'elice', palete: 2 }, [9, 1], [36, 4]],
  ['elicea cu 4 palete (72 × 72)', { tip: 'elice', palete: 4 }, [9, 9], [36, 36]],
  ['elicea de barcă (36,3 × 36,4)', { tip: 'eliceBarca' }, [5, 5], [20, 20]],
  ['rotorul Ø48 (45,8 × 46,4: era 6 × 6)', ROTOR48, [7, 7], [28, 28]],
  ['carcasa Ø48 cu 2 urechi (71,2 × 52)', CARCASA48, [9, 7], [36, 28]],
  ['carcasa Ø48 cu 4 urechi (71,2 × 71,2)', { ...CARCASA48, urechi: 4 }, [9, 9], [36, 36]],
  ['rotorul Ø40 (37,9 × 38,4)', ROTOR40, [5, 5], [20, 20]],
  ['carcasa Ø40 cu 2 urechi (55,2 × 44: era 7 × 6)', CARCASA40, [7, 7], [28, 28]],
  ['roata cu palete (64 mm: era 8 × 8)', { tip: 'roataPalete' }, [9, 9], [36, 36]],
];
/** Tipurile motorului ale căror piese sunt rotunde (șenila, doar pinionul). */
const TIPURI_ROTUNDE = ['rotita', 'cama', 'melc', 'roata', 'fulie', 'conica', 'coroana', 'conicaDubla', 'elice', 'eliceBarca', 'ventilator', 'roataPalete'];

/** Mostrele care nu sunt rotunde: fiecare tip, cu definiția de bază, plus câteva cu placa pe grilă și ceva ieșit din ea. */
const DREPTE: readonly Def[] = [
  CARAMIDA24, { tip: 'caramida', celule: rand(2, 2), placi: 1 }, { tip: 'caramida', celule: rand(2) },
  { tip: 'caramida', celule: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], placi: 2 },
  { tip: 'lateral' }, { tip: 'lateral', lung: 2, fete: 'doua' }, { tip: 'panta' }, { tip: 'pantaInversa' }, { tip: 'pana' },
  { tip: 'rotund' }, { tip: 'rotund', diam: 2 }, { tip: 'arc' }, { tip: 'cadru' }, { tip: 'turnanta' }, { tip: 'turnanta', piesa: 'sus', marime: 4 }, { tip: 'grinda' }, { tip: 'caramidaTechnic' },
  { tip: 'ax', lung: 3 }, { tip: 'stiftTechnic' }, { tip: 'bucsa' }, { tip: 'conector' }, { tip: 'conectorUnghi' },
  { tip: 'suport' }, { tip: 'suport', lung: 2, adanc: 2, inalt: 2, invers: true }, { tip: 'clema' }, { tip: 'clema', lung: 2, axa: 'orizontala' },
  { tip: 'maner', lung: 2, axa: 'orizontala' }, { tip: 'maner', lung: 3, axa: 'orizontala' }, { tip: 'bara' },
  { tip: 'bila' }, { tip: 'bila', baza: 2 }, { tip: 'cupa' }, { tip: 'cupa', baza: 2 }, { tip: 'cremaliera' }, { tip: 'senila' },
  { tip: 'fulg' }, { tip: 'stea' }, { tip: 'brad' }, { tip: 'glob' }, { tip: 'ornament', text: 'ANA' }, { tip: 'bradLego' }, { tip: 'bradLego', piesa: 'stea' },
  { tip: 'dinCvs2', contururi: [[[0, 0], [20, 0], [20, 10], [0, 10]]] },
];
/** Așezarea de până la 18.32.0 (`corpModel` din sursele v18): mijlocul cutiei, sau placa piesei, în mijlocul amprentei. */
function v18(def: Def, p: Corp): Asezare {
  const st = (v: number) => Math.max(1, Math.round((v + 0.2) / 8));
  const placa = ({ lateral: [def.lung, 1], suport: [def.lung, def.adanc], clema: [def.lung, 1], maner: [def.lung, 1], bila: [def.baza, def.baza], cupa: [1, 1] } as Record<string, unknown[] | undefined>)[def.tip];
  if (placa) {
    const [gw, gd] = placa.map((v) => Math.max(1, Math.round(Number(v) || 1))) as [number, number];
    return { gw, gd, pivot: [gw * 4 - p.baza[0]!, gd * 4 - p.baza[1]!], ax: false };
  }
  return { gw: st(p.dim[0]!), gd: st(p.dim[1]!), pivot: [p.dim[0]! / 2, p.dim[1]! / 2], ax: false };
}

test('o piesă rotundă își spune axul odată cu plasa; celelalte nu au ax', () => {
  for (const [nume, def] of ROTUNDE) {
    const p = fa(def);
    assert.ok(p.ax, `${nume}: își spune axul`);
    // axul e originea piesei din motor: colțul cutiei (baza) e dat față de el
    assert.deepEqual([...p.ax].map(r3), [r3(-p.baza[0]!), r3(-p.baza[1]!)], `${nume}: axul e originea piesei`);
    assert.ok(p.ax[0]! > 0 && p.ax[0]! < p.dim[0]! && p.ax[1]! > 0 && p.ax[1]! < p.dim[1]!, `${nume}: axul e în cutia piesei`);
  }
  for (const def of DREPTE) assert.equal(fa(def).ax, null, `${def.tip}: nu are ax`);
  // fiecare tip al motorului e judecat aici: rotund (în tabelul de pe hârtie) sau nu (în mostrele drepte)
  for (const t of Lm.tipuri) {
    const rotund = ROTUNDE.some(([, d]) => d.tip === t), drept = DREPTE.some((d) => d.tip === t);
    assert.ok(rotund || drept, `tipul ${t} are o mostră aici`);
    if (t !== 'senila') assert.equal(rotund, TIPURI_ROTUNDE.includes(t), `tipul ${t}: rotund sau nu`);
  }
});

test('axul spus e cel de pe plasă: gaura din mijloc e pe el, iar golul carcasei e rotund în jurul lui', () => {
  let cuGaura = 0;
  for (const [nume, def] of ROTUNDE) {
    const p = fa(def), [ax, ay] = p.ax as [number, number];
    const peAx = p.prinderi.filter((c) => (c.fel === 'gauraAx' || c.fel === 'gauraStift') && Math.abs(c.d[2]!) > 0.99 && Math.hypot(c.p[0]! - ax, c.p[1]! - ay) < 1e-6);
    if (def.piesa === 'carcasa') {
      // carcasa n-are gaură pe ax: golul ei (Ø / 2) e gol până la 0,3 mm de perete, iar peretele e plin la 0,4 mm în el
      const q = Lm.ventilatorCote(def), Ri = q.D / 2;
      for (let k = 0; k < 24; k++) {
        const f = 2 * Math.PI * (k + 0.37) / 24, la = (r: number, z: number): P3 => [ax + r * Math.cos(f), ay + r * Math.sin(f), z];
        for (const z of [1, q.Hc - 1]) {
          assert.equal(plin(p, la(Ri - 0.3, z)), false, `${nume}: gol la ${r3(Ri - 0.3)} mm de ax, unghiul ${k}, z ${z}`);
          assert.equal(plin(p, la(Ri + 0.4, z)), true, `${nume}: perete la ${r3(Ri + 0.4)} mm de ax, unghiul ${k}, z ${z}`);
        }
      }
    } else if (def.gaura === 'nu') {
      // fără gaură: mijlocul e plin, iar piesa e rotundă în jurul axului (la 3 mm de el, plin de jur împrejur)
      for (let k = 0; k < 12; k++) assert.equal(plin(p, [ax + 3 * Math.cos(k), ay + 3 * Math.sin(k), p.dim[2]! / 2]), true, `${nume}: plin lângă ax`);
    } else {
      assert.equal(peAx.length, 2, `${nume}: gaura din mijloc, cu cele două guri, e pe ax`);
      // și pe plasă: în ax e gol (gaura), la orice înălțime
      for (const z of [0.5, p.dim[2]! / 2, p.dim[2]! - 0.5]) assert.equal(plin(p, [ax, ay, z]), false, `${nume}: gol în ax, la z ${z}`);
      cuGaura++;
    }
  }
  assert.ok(cuGaura >= 20, `piese cu gaura pe ax: ${cuGaura}`);
});

test('1a: axul unei piese rotunde stă în mijlocul unui știft, oriunde e pusă și oricum e rotită', () => {
  for (const [nume, def, amprenta, axul] of ROTUNDE) {
    const a = asez(def), p = fa(def);
    assert.deepEqual([a.gw, a.gd], amprenta, `${nume}: amprenta`);
    assert.equal(a.ax, true, `${nume}: e rotundă`);
    assert.equal(a.gw % 2, 1, `${nume}: amprenta impară pe x`); assert.equal(a.gd % 2, 1, `${nume}: amprenta impară pe y`);
    assert.deepEqual(a.pivot.map(r3), [...p.ax!].map(r3), `${nume}: pivotul e axul`);
    assert.deepEqual(loc(def, 0, 0), axul, `${nume}: axul, la x 0, y 0`);
    for (const x of [-3, 0, 5]) for (const y of [-2, 0, 7]) for (let rot = 0; rot < 4; rot++) {
      const [X, Y] = loc(def, x, y, rot) as [number, number];
      const [w, d] = rot % 2 ? [amprenta[1], amprenta[0]] : amprenta;
      assert.deepEqual([X, Y], [x * 8 + w * 4, y * 8 + d * 4], `${nume}: la ${x}, ${y}, rotită ${rot}`);
      assert.equal((((X - 4) % 8) + 8) % 8, 0, `${nume}: axul pe centrul unui știft, pe x`);
      assert.equal((((Y - 4) % 8) + 8) % 8, 0, `${nume}: axul pe centrul unui știft, pe y`);
    }
  }
});

test('1a: rotirea unei piese rotunde se face în jurul axului (colțul amprentei se mută cu el)', () => {
  // carcasa Ø48 cu 2 urechi (9 × 7), la 0, 0: axul la (36, 28); rotită, amprenta e 7 × 9, deci colțul trece la 1, −1
  assert.deepEqual(langa(CARCASA48, 1, loc(CARCASA48, 0, 0, 0)), [1, -1]);
  assert.deepEqual(loc(CARCASA48, 1, -1, 1), [36, 28]);
  // elicea cu 3 palete (7 × 9), la 2, 3: axul la (44, 60); rotită (9 × 7): colțul la 1, 4
  assert.deepEqual(langa({ tip: 'elice' }, 1, loc({ tip: 'elice' }, 2, 3, 0)), [1, 4]);
  for (const [nume, def] of ROTUNDE) for (let rot = 0; rot < 4; rot++) {
    const inainte = loc(def, 5, -2, rot), [x, y] = langa(def, rot + 1, inainte) as [number, number];
    assert.ok(Number.isInteger(x) && Number.isInteger(y), `${nume}: colțul rămâne pe știfturi`);
    assert.deepEqual(loc(def, x, y, rot + 1), inainte, `${nume}: axul rămâne pe loc la rotirea ${rot} → ${rot + 1}`);
  }
});

test('piesele care nu sunt rotunde stau ca până acum: mijlocul cutiei, sau placa, în mijlocul amprentei', () => {
  for (const def of DREPTE) {
    const p = fa(def), a = asez(def), v = v18(def, p), ce = JSON.stringify(def);
    assert.deepEqual({ ...a, pivot: a.pivot.map(r3) }, { ...v, pivot: v.pivot.map(r3) }, ce);
    for (let rot = 0; rot < 4; rot++) {
      const [w, d] = rot % 2 ? [v.gd, v.gw] : [v.gw, v.gd];
      assert.deepEqual(loc(def, 3, -1, rot), [3 * 8 + w * 4, -8 + d * 4], `${ce}, rotită ${rot}`);
    }
  }
  // pe hârtie: cărămida 2 × 4 (31,8 × 15,8) are amprenta 4 × 2 și mijlocul la (15,9, 7,9); pusă la 1, 2, mijlocul e la (24, 24)
  assert.deepEqual({ ...asez(CARAMIDA24), pivot: asez(CARAMIDA24).pivot.map(r3) }, { gw: 4, gd: 2, pivot: [15.9, 7.9], ax: false });
  assert.deepEqual(loc(CARAMIDA24, 1, 2), [24, 24]);
  assert.deepEqual(loc(CARAMIDA24, 1, 2, 1), [16, 32]);
  // fără corpul dat, așezarea își construiește singură piesa: aceeași
  for (const def of [CARAMIDA24, CARCASA48, { tip: 'lateral' } as Def]) {
    const a = Lm.asezareModel(def);
    assert.deepEqual({ gw: a.gw, gd: a.gd, pivot: [...a.pivot], ax: a.ax }, asez(def), JSON.stringify(def));
  }
  // piesele cu ceva ce iese din placă stau după placă: știfturile pe lateral, de 2 (placa 2 × 1), cupa (placa 1 × 1)
  assert.deepEqual([asez({ tip: 'lateral', lung: 2 }).gw, asez({ tip: 'lateral', lung: 2 }).gd], [2, 1]);
  assert.deepEqual([asez({ tip: 'cupa', baza: 2 }).gw, asez({ tip: 'cupa', baza: 2 }).gd], [1, 1]);
});

test('2a: o piesă nouă intră cu pivotul cât mai aproape de al celei alese; două rotunde, pe același ax', () => {
  // rotorul Ø48 pe carcasa Ø48 de la 0, 0 (axul la (36, 28)): colțul lui la 1, 0, cu axul tot la (36, 28)
  assert.deepEqual(langa(ROTOR48, 0, loc(CARCASA48, 0, 0)), [1, 0]);
  assert.deepEqual(loc(ROTOR48, 1, 0), loc(CARCASA48, 0, 0));
  // pe roata de 24 de la 2, 3 (axul la (28, 36)): roata de 16 la 2, 3; roata cu anvelopă (5 × 5) la 1, 2; roata de 8 la 3, 4
  const tinta = loc({ tip: 'rotita' }, 2, 3);
  assert.deepEqual(tinta, [28, 36]);
  assert.deepEqual(langa({ tip: 'rotita', dinti: 16 }, 0, tinta), [2, 3]);
  assert.deepEqual(langa({ tip: 'roata' }, 0, tinta), [1, 2]);
  assert.deepEqual(langa({ tip: 'rotita', dinti: 8 }, 0, tinta), [3, 4]);
  // orice două rotunde, oriunde și oricum ar fi rotită cea aleasă: exact același ax
  for (const [n1, ales] of ROTUNDE) for (const [n2, nou] of ROTUNDE) for (const rot of [0, 1]) {
    const t = loc(ales, -4, 6, rot), [x, y] = langa(nou, rot, t) as [number, number];
    assert.deepEqual(loc(nou, x, y, rot), t, `${n2} pe ${n1}, rotite ${rot}: același ax`);
  }
  // cărămizile: pe cărămida 2 × 4 de la 0, 0 (mijlocul la (16, 8)), alta la fel intră din același colț; placa 2 × 2, la
  // mijloc (1, 0); cărămida 1 × 2 are mijlocul pe altă paritate pe y: la egalitate, locul cu numărul mai mic
  const mijloc = loc(CARAMIDA24, 0, 0);
  assert.deepEqual(mijloc, [16, 8]);
  assert.deepEqual(langa(CARAMIDA24, 0, mijloc), [0, 0]);
  assert.deepEqual(langa({ tip: 'caramida', celule: rand(2, 2), placi: 1 }, 0, mijloc), [1, 0]);
  assert.deepEqual(langa({ tip: 'caramida', celule: rand(2) }, 0, mijloc), [1, 0]);
  // rotite amândouă (cea aleasă e 2 lată și 4 adâncă, cu mijlocul la (8, 16)): cărămida 1 × 2, la 0, 1
  assert.deepEqual(loc(CARAMIDA24, 0, 0, 1), [8, 16]);
  assert.deepEqual(langa(CARAMIDA24, 1, loc(CARAMIDA24, 0, 0, 1)), [0, 0]);
  assert.deepEqual(langa({ tip: 'caramida', celule: rand(2) }, 1, loc(CARAMIDA24, 0, 0, 1)), [0, 1]);
  // o roată pe o cărămidă: pe știftul cel mai apropiat de mijlocul ei (la egalitate, cel cu numărul mai mic): axul la (12, 4)
  assert.deepEqual(langa({ tip: 'rotita' }, 0, mijloc), [0, -1]);
  assert.deepEqual(loc({ tip: 'rotita' }, 0, -1), [12, 4]);
  // o cărămidă pe o roată (axul la (12, 12)): mijlocul ei la (8, 12)... cu o jumătate de știft spre colț pe x
  assert.deepEqual(langa(CARAMIDA24, 0, [12, 12]), [-1, 0]);
  // o țintă cu zgomot de virgulă mobilă nu schimbă locul, nici la egalitate (cărămida 1 × 2 pe mijlocul (16, 8))
  assert.deepEqual(langa(ROTOR48, 0, [36 + 1e-10, 28 - 1e-10]), [1, 0]);
  assert.deepEqual(langa({ tip: 'caramida', celule: rand(2) }, 0, [16 + 1e-10, 8 + 1e-10]), [1, 0]);
  assert.deepEqual(langa({ tip: 'caramida', celule: rand(2) }, 0, [16 - 1e-10, 8 - 1e-10]), [1, 0]);
});

test('3a: rotorul și carcasa în care încape stau la același Z; pe plase, rotorul chiar încape în golul ei', () => {
  const impreuna = (a: Def, b: Def) => Lm.impreunaInModel(a, b);
  assert.equal(impreuna(ROTOR48, CARCASA48), true, 'rotorul Ø48 în carcasa Ø48');
  assert.equal(impreuna(CARCASA48, ROTOR48), true, 'și invers: carcasa în jurul rotorului ei');
  assert.equal(impreuna(ROTOR40, CARCASA48), true, 'un rotor mai mic încape și el');
  assert.equal(impreuna(ROTOR48, CARCASA40), false, 'rotorul Ø48 nu încape în carcasa Ø40');
  assert.equal(impreuna({ tip: 'ventilator' }, { tip: 'ventilator', piesa: 'carcasa' }), true, 'ventilatorul de bază (Ø40), cu carcasa lui');
  assert.equal(impreuna({ ...ROTOR48, inel: 'da' }, CARCASA48), true, 'rotorul cu inel are același contur');
  assert.equal(impreuna(ROTOR48, ROTOR48), false, 'două rotoare');
  assert.equal(impreuna(CARCASA48, CARCASA48), false, 'două carcase');
  assert.equal(impreuna({ tip: 'rotita' }, CARCASA48), false, 'o roată dințată nu e rotorul carcasei');
  assert.equal(impreuna({ tip: 'elice' }, CARCASA48), false, 'nici o elice');
  assert.equal(impreuna(CARAMIDA24, CARAMIDA24), false, 'două cărămizi');
  // pe plase: vârful paletelor e la Ø / 2 − jocul (23,2 mm), golul carcasei la Ø / 2 (24 mm)
  for (const rotor of [ROTOR48, { ...ROTOR48, inel: 'da' }, { ...ROTOR48, palete: 4 }]) {
    const p = fa(rotor), [ax, ay] = p.ax as [number, number];
    let raza = 0;
    for (const t of p.tri) for (const v of t) raza = Math.max(raza, Math.hypot(v[0] - ax, v[1] - ay));
    // (cu inel, paletele intrate în el ies cu o zecime de micron din poligonul lui)
    assert.ok(raza < 23.2 + 0.001 && raza > 23.2 - 0.05, `rotorul ${JSON.stringify(rotor)} ajunge la ${r3(raza)} mm de ax`);
    assert.ok(24 - raza > 0.79, `rotorul ${JSON.stringify(rotor)} are jocul de 0,8 mm până la carcasă`);
    assert.ok(p.dim[2]! <= fa(CARCASA48).dim[2]!, 'rotorul nu e mai înalt decât carcasa');
  }
  assert.equal(Lm.ventilatorCote(ROTOR48).Rt, 23.2);
  assert.equal(Lm.ventilatorCote(CARCASA48).D / 2, 24);
});

test('o roată înlocuită cu alta își ține axul', () => {
  // roata de 24 de la 2, 3 (axul la (28, 36)) schimbată cu una de 40 (5 × 5): colțul trece la 1, 2, axul rămâne
  const ax = loc({ tip: 'rotita' }, 2, 3);
  assert.deepEqual(langa({ tip: 'rotita', dinti: 40 }, 0, ax), [1, 2]);
  assert.deepEqual(loc({ tip: 'rotita', dinti: 40 }, 1, 2), ax);
  // și rotită: carcasa Ø48 cu 2 urechi, rotită o dată, schimbată cu cea de Ø40 (7 × 7)
  const axc = loc(CARCASA48, 1, -1, 1);
  assert.deepEqual(langa(CARCASA40, 1, axc), [1, 0]);
  assert.deepEqual(loc(CARCASA40, 1, 0, 1), axc);
});
