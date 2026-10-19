import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cazul } from '../oracles/simulare.cazuri.ts';
import { amprentaCamp, calculeazaBanda, mutariPentruBanda, previzualizarePentru, uneste, type RaspunsBanda } from '../../src/sim/banda.ts';
import { campNou, compacteaza, LATURA_DALA, valoare, type Banda, type ParametriCamp } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram, STRIDE, type DateScula } from '../../src/sim/program.ts';
import { parametriGrila, programCaz, simuleazaCaz } from './ajutor-simulare.ts';

/**
 * Rândurile de dale intercalate pe bazin (ADR 0010, ADR 0047 §4): rândul de dale r e al benzii r mod N. Rezultatul NU
 * depinde de N — aceeași amprentă, același volum, aceeași previzualizare, bit cu bit — pentru că fiecare celulă e scrisă
 * de o singură bandă și „cea mai adâncă tăietură câștigă” nu depinde de ordinea mutărilor. Amprenta Node = Edge e în
 * e2e (`test/e2e/simulare.spec.ts`).
 */

function pregatit(id: string): { readonly camp: ParametriCamp; readonly scula: DateScula; readonly mutari: Float64Array } {
  const c = cazul(id);
  const p = pregatesteProgram(programCaz(c), 0);
  if (!p.ok) throw new Error(p.motiv);
  return { camp: parametriGrila(c.grila), scula: p.scula, mutari: p.mutari };
}

function peBenzi(id: string, n: number, filtrate = true): { readonly r: ReturnType<typeof uneste>; readonly benzi: readonly RaspunsBanda[] } {
  const { camp, scula, mutari } = pregatit(id);
  const previzualizare = previzualizarePentru(camp);
  const benzi: RaspunsBanda[] = [];
  for (let w = 0; w < n; w++) {
    const banda: Banda = { n, w };
    benzi.push(calculeazaBanda({
      camp, banda, scula, fund: -18, previzualizare,
      mutari: filtrate ? mutariPentruBanda(mutari, scula, camp, banda) : mutari.slice(),
    }));
  }
  return { r: uneste(camp, previzualizare, -18, benzi), benzi };
}

const PIESE = ['sant-bila', 'sant-v60', 'arc-mare-R-neg', 'plonjare-plata', 'rampa-plata', 'tangent', 'elice', 'gravura-v60', 'rampa-v90'];

for (const id of PIESE) {
  test(`${id}: 1, 2, 3, 4 și 7 benzi dau aceeași amprentă, același volum, același Z minim și aceeași previzualizare`, () => {
    const unu = peBenzi(id, 1).r;
    assert.equal(unu.amprenta, amprentaCamp(simuleazaCaz(cazul(id))), 'amprenta unită ≠ amprenta câmpului întreg');
    for (const n of [2, 3, 4, 7]) {
      const r = peBenzi(id, n).r;
      assert.equal(r.amprenta, unu.amprenta, `${n} benzi: alta amprentă`);
      assert.ok(Object.is(r.volum, unu.volum), `${n} benzi: volumul ${r.volum} ≠ ${unu.volum}`);
      assert.ok(Object.is(r.zMin, unu.zMin), `${n} benzi: Z minim ${r.zMin} ≠ ${unu.zMin}`);
      assert.deepEqual(r.previzualizare.z, unu.previzualizare.z, `${n} benzi: altă previzualizare`);
      assert.deepEqual(r.dale, unu.dale, `${n} benzi: alte dale`);
    }
  });
}

test('placa mare (2440 × 1220 la 0,25 mm): 1 și 5 benzi, aceeași amprentă', () => {
  const a = peBenzi('mare-2440', 1).r, b = peBenzi('mare-2440', 5).r;
  assert.equal(b.amprenta, a.amprenta);
  assert.ok(Object.is(a.volum, b.volum));
  assert.ok(a.dale.atinse > 100 && a.dale.atinse < a.dale.total / 20, `dalele atinse: ${a.dale.atinse} din ${a.dale.total} (câmpul e rar)`);
});

test('fiecare celulă e a unei singure benzi: pe 3 benzi, banda r mod 3 are exact valoarea câmpului întreg, celelalte fața', () => {
  for (const id of ['sant-v60', 'elice', 'arc-mare-R-neg']) {
    const c = cazul(id), unu = simuleazaCaz(c);
    const benzi = [0, 1, 2].map((w) => simuleazaCaz(c, { n: 3, w }));
    let atinse = 0;
    for (let j = 0; j < unu.ny; j++) {
      const a = (j >> 4) % 3;
      for (let i = 0; i < unu.nx; i++) {
        const v = valoare(unu, i, j);
        if (v < unu.sus) atinse++;
        for (let w = 0; w < 3; w++) {
          const b = valoare(benzi[w]!, i, j);
          if (w === a ? !Object.is(b, v) : b !== unu.sus) assert.fail(`${id}: celula (${i}, ${j}) din banda ${w}: ${b} (câmpul întreg: ${v})`);
        }
      }
    }
    assert.ok(atinse > 1000, `${id}: doar ${atinse} celule tăiate`);
  }
  assert.equal(LATURA_DALA, 16, 'proba de mai sus presupune dale de 16 (j >> 4)');
});

test('filtrul mutărilor pe bandă e conservator: cu toate mutările, fiecare bandă dă același rezultat', () => {
  for (const id of ['gravura-v60', 'tangent', 'rampa-v90']) {
    for (const n of [2, 5]) assert.equal(peBenzi(id, n, false).r.amprenta, peBenzi(id, n, true).r.amprenta, `${id}, ${n} benzi`);
  }
});

test('filtrul chiar filtrează: pe 7 benzi, gravura trimite fiecărei benzi mai puține mutări decât are programul', () => {
  const { camp, scula, mutari } = pregatit('gravura-v60');
  const total = mutari.length / STRIDE;
  for (let w = 0; w < 7; w++) {
    const n = mutariPentruBanda(mutari, scula, camp, { n: 7, w }).length / STRIDE;
    assert.ok(n < total, `banda ${w}: ${n} din ${total}`);
  }
});

test('ordinea mutărilor nu contează: programul întors dă aceeași amprentă (cea mai adâncă tăietură câștigă)', () => {
  for (const id of ['sant-bila', 'gravura-v60', 'elice', 'rampa-v90']) {
    const { camp, scula, mutari } = pregatit(id);
    const n = mutari.length / STRIDE, intors = new Float64Array(mutari.length);
    for (let k = 0; k < n; k++) intors.set(mutari.subarray(k * STRIDE, (k + 1) * STRIDE), (n - 1 - k) * STRIDE);
    const a = campNou(camp), b = campNou(camp);
    ruleaza(a, scula, mutari);
    ruleaza(b, scula, intors);
    compacteaza(a);
    compacteaza(b);
    assert.equal(amprentaCamp(b), amprentaCamp(a), id);
  }
});

test('amprenta vede o singură celulă schimbată cu un ulp', () => {
  const F = simuleazaCaz(cazul('sant-v60'));
  const inainte = amprentaCamp(F);
  const loc = F.loc.findIndex((s) => s >= 0);
  assert.ok(loc >= 0, 'nicio dală în atlas');
  const k = (F.loc[loc]! << 8) | 37;
  const f32 = new Float32Array([F.atlas[k]!]);
  const u32 = new Uint32Array(f32.buffer);
  u32[0] = u32[0]! + 1;
  F.atlas[k] = f32[0]!;
  const dupa = amprentaCamp(F);
  // Ambele jumătăți (h1, h2) văd ulp-ul: altfel amprenta ar fi, la diferențe mici, doar pe 32 de biți (recenzia 19.10).
  assert.notEqual(dupa.slice(0, 8), inainte.slice(0, 8), 'prima jumătate n-a văzut ulp-ul');
  assert.notEqual(dupa.slice(8), inainte.slice(8), 'a doua jumătate n-a văzut ulp-ul');
});

test('amprenta ține de grilă: același program pe o grilă mutată cu o celulă dă altă amprentă', () => {
  const c = cazul('sant-plat');
  const p = pregatesteProgram(programCaz(c), 0);
  if (!p.ok) throw new Error(p.motiv);
  const g = parametriGrila(c.grila);
  const a = campNou(g), b = campNou({ ...g, x0: g.x0 - g.celula, latime: g.latime + g.celula });
  ruleaza(a, p.scula, p.mutari);
  ruleaza(b, p.scula, p.mutari);
  compacteaza(a);
  compacteaza(b);
  assert.notEqual(amprentaCamp(a), amprentaCamp(b));
});

test('compactarea: dalele uniforme devin un număr, valorile și amprenta rămân; atlasul scade', () => {
  const c = cazul('plonjare-plata');
  const p = pregatesteProgram(programCaz(c), 0);
  if (!p.ok) throw new Error(p.motiv);
  const F = campNou(parametriGrila(c.grila));
  ruleaza(F, p.scula, p.mutari);
  const inainte = Float64Array.from({ length: F.nx * F.ny }, (_, k) => valoare(F, k % F.nx, Math.floor(k / F.nx)));
  const amprenta = amprentaCamp(F), locuri = F.locuri;
  compacteaza(F);
  const uniforme = F.loc.filter((s) => s === -2).length;
  assert.ok(uniforme >= 10, `doar ${uniforme} dale uniforme în gaura de Ø6 la 0,05 mm (120 de celule pe diametru)`);
  assert.ok(F.locuri <= locuri - uniforme, `atlasul: ${F.locuri} locuri după, ${locuri} înainte`);
  for (let k = 0; k < inainte.length; k++) {
    const v = valoare(F, k % F.nx, Math.floor(k / F.nx));
    if (!Object.is(v, inainte[k])) assert.fail(`celula ${k}: ${v} după compactare, ${inainte[k]} înainte`);
  }
  assert.equal(amprentaCamp(F), amprenta);
  // O a doua compactare nu schimbă nimic.
  compacteaza(F);
  assert.equal(amprentaCamp(F), amprenta);
});

test('o dală compactată (uniformă) scrisă din nou revine în atlas cu valoarea ei: aceleași celule ca fără compactare', () => {
  const c = cazul('plonjare-plata');
  const p = pregatesteProgram(programCaz(c), 0);
  if (!p.ok) throw new Error(p.motiv);
  // A doua plonjare, mai adâncă, alături: atinge și dalele devenite uniforme la −5.
  const doua = pregatesteProgram(programCaz(c, [{ tip: 'linie', a: [21.5, 20, 5], b: [21.5, 20, -7] }]), 0);
  if (!doua.ok) throw new Error(doua.motiv);
  const g = parametriGrila(c.grila);
  const a = campNou(g), b = campNou(g);
  ruleaza(a, p.scula, p.mutari);
  compacteaza(a);
  assert.ok(a.loc.some((s) => s === -2), 'nicio dală uniformă după prima plonjare');
  ruleaza(a, doua.scula, doua.mutari);
  ruleaza(b, p.scula, p.mutari);
  ruleaza(b, doua.scula, doua.mutari);
  compacteaza(a);
  compacteaza(b);
  for (let j = 0; j < a.ny; j++) for (let i = 0; i < a.nx; i++) {
    if (!Object.is(valoare(a, i, j), valoare(b, i, j))) assert.fail(`(${i}, ${j}): ${valoare(a, i, j)} cu compactare la mijloc, ${valoare(b, i, j)} fără`);
  }
  assert.equal(amprentaCamp(a), amprentaCamp(b));
});

test('detector de schimbare (nu probă de corectitudine): amprentele unor piese, înghețate la prima rulare', () => {
  const inghetate: Readonly<Record<string, string>> = {
    'sant-bila': '07f9e3c0d1de9be8',
    elice: 'b5470123384c1f4f',
    'gravura-v60': 'f76411a410c46a51',
  };
  for (const [id, a] of Object.entries(inghetate)) assert.equal(amprentaCamp(simuleazaCaz(cazul(id))), a, id);
});
