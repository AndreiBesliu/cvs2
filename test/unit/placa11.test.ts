/**
 * Placa 11 pe hârtie (felia 11.7, ADR 0210; `docs/etape/placa-11.md`), pe exportul „Toate foile” de acum al documentului
 * plăcii (că e și cel comis, octet cu octet, o spune `placa11.aur.test.ts`). Criteriul din prag, cu distanța 10 și foi de
 * 300 × 220, ca urechile să țină: 25 de plăcuțe 80 × 30, marginea 10, 15 + 10, colțurile la x = 10 / 100 / 190 și
 * y = 180 / 140 / 100 / 60 / 20, foile folosite 6/11 și 4/11, numele în ordinea CSV-ului. Ramele: pe dinafară cu freza Ø3,175
 * (cutia drumului = plăcuțele ± raza), în patru treceri de 3 mm, cu două urechi de 6 × 2 pe plăcuță. Numele: V-carve cu V90,
 * cel mult 3 mm, fiecare pe plăcuța lui, centrat, cu majuscula de 8 mm de la 11 la 19. Regimul din fișă. Și fiecare plăcuță
 * ținută de foaie prin urechile ei până la capătul ramelor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { placuteCuTextIesit } from '../../src/model/placuteIesire.ts';
import { raportFoi } from '../../src/model/raportFoi.ts';
import { cazute } from '../placi/placa-11/cazute.ts';
import { DISTANTA, documentPlaca11, exportPlaca11, numele, PLACUTA } from '../placi/placa-11/genereaza.ts';

const LIMITE = { fisiere: 100, octetiFisier: 50_000_000, octetiTotal: 200_000_000 };
const NL = String.fromCharCode(10);
const numar = (r: RegExpExecArray | null): number | undefined => (r ? Number(r[1]) : undefined);
/** Pe fiecare foaie: programul numelor (T3), al ramelor (T5) și marginea de jos a plăcuțelor. */
const FOILE = [
  { numele: 'cncvs2-stanga-jos-foaia-1-1-T3.nc', ramele: 'cncvs2-stanga-jos-foaia-1-2-T5.nc', jos: 20, placute: 15 },
  { numele: 'cncvs2-stanga-jos-foaia-2-1-T3.nc', ramele: 'cncvs2-stanga-jos-foaia-2-2-T5.nc', jos: 60, placute: 10 },
] as const;

let programe: Promise<Map<string, string>> | undefined;
/** Programele exportului „Toate foile” de acum, după nume (calculate o dată). */
const programele = (): Promise<Map<string, string>> => (programe ??= (async () => {
  const r = await exportPlaca11();
  const zip = r.fisiere[0];
  assert.ok(zip);
  const z = await citesteZip(zip.octeti, LIMITE);
  assert.ok(z.ok);
  return new Map(z.intrari.map((x) => [x.nume, new TextDecoder().decode(x.octeti)]));
})());
const program = async (nume: string): Promise<string> => {
  const t = (await programele()).get(nume);
  assert.ok(t !== undefined, `${nume} lipsește din arhivă`);
  return t;
};

/** Cutia capetelor mișcărilor de tăiere (G1, G2, G3) și cea mai joasă adâncime a unui program. */
function cutie(text: string): { minX: number; maxX: number; minY: number; maxY: number; minZ: number } {
  const c = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity };
  let x = Number.NaN, y = Number.NaN;
  for (const l of text.split(NL)) {
    const mx = /X(-?\d+\.\d+)/.exec(l), my = /Y(-?\d+\.\d+)/.exec(l), mz = /Z(-?\d+\.\d+)/.exec(l);
    if (mx) x = Number(mx[1]);
    if (my) y = Number(my[1]);
    if (!/^G[123] /.test(l)) continue;
    if (mz) c.minZ = Math.min(c.minZ, Number(mz[1]));
    if (!mx && !my) continue;
    c.minX = Math.min(c.minX, x); c.maxX = Math.max(c.maxX, x); c.minY = Math.min(c.minY, y); c.maxY = Math.max(c.maxY, y);
  }
  return c;
}

/** Capetele mișcărilor de tăiere coborâte sub fața foii (Z < 0), cu adâncimea lor. */
function puncteSub(text: string): [number, number, number][] {
  const rez: [number, number, number][] = [];
  let x = Number.NaN, y = Number.NaN, z = Number.NaN;
  for (const l of text.split(NL)) {
    if (!/^G[123] /.test(l)) continue;
    x = numar(/X(-?\d+\.\d+)/.exec(l)) ?? x; y = numar(/Y(-?\d+\.\d+)/.exec(l)) ?? y; z = numar(/Z(-?\d+\.\d+)/.exec(l)) ?? z;
    if (z < 0) rez.push([x, y, z]);
  }
  return rez;
}

test('criteriul din prag pe hârtie: 15 + 10 plăcuțe 80 × 30, la colțurile lor, în ordinea CSV-ului; folosite 6/11 și 4/11', () => {
  const d = documentPlaca11();
  const nume = numele();
  assert.equal(nume.length, 25);
  assert.deepEqual([nume[0], nume[9], nume[17], nume[24]], ['Ana', 'Ionuț', 'Ștefan', 'Diana'], 'diacriticele trec prin CSV');
  // 3 · 80 + 2 · 10 = 260 ≤ 300 − 2 · 10 (a patra coloană: 350); 5 · 30 + 4 · 10 = 190 ≤ 220 − 2 · 10 (al șaselea rând: 230).
  assert.equal(DISTANTA, 10);
  const locuri = [180, 140, 100, 60, 20].flatMap((y) => [10, 100, 190].map((x) => [x, y]));
  assert.deepEqual(d.foi.map((f) => [f.material, f.stoc]), [['MDF 12', { latime: 300, inaltime: 220, grosime: 12 }], ['MDF 12', { latime: 300, inaltime: 220, grosime: 12 }]]);
  assert.deepEqual(d.foi[0]?.instante.map((i) => [i.x, i.y, i.rotire]), locuri.map(([x, y]) => [x, y, 0]));
  assert.deepEqual(d.foi[1]?.instante.map((i) => [i.x, i.y, i.rotire]), locuri.slice(0, 10).map(([x, y]) => [x, y, 0]));
  assert.deepEqual(d.foi.flatMap((f) => f.instante.map((i) => i.campuri?.['Nume'])), nume);
  assert.deepEqual(d.foi.flatMap((f) => f.instante.map((i) => Object.values(i.texte ?? {})[0]?.continut)), nume, 'fiecare plăcuță, literele numelui ei');
  assert.equal(placuteCuTextIesit(d).length, 0, 'niciun text nu iese din plăcuță');
  // 15 · 80 · 30 / (300 · 220) = 6/11 și 10 · 80 · 30 / (300 · 220) = 4/11, la 6 zecimale.
  const r = raportFoi(d, 'taiata', (n) => `Foaia ${n}`);
  assert.deepEqual(r.foi.map((f) => [f.folosita, f.piese.map((p) => [p.cate, p.latime, p.inaltime, p.din])]), [[54.545455, [[15, 80, 30, 'taiata']]], [36.363636, [[10, 80, 30, 'taiata']]]]);
  assert.deepEqual(r.materiale, [{ material: 'MDF 12', latime: 300, inaltime: 220, grosime: 12, foi: 2 }]);
});

test('ramele pe hârtie: pe dinafară cu raza frezei, prin toată grosimea în patru treceri de 3 mm, cu două urechi de 6 × 2 pe plăcuță', async () => {
  const raza = 3.175 / 2;
  for (const f of FOILE) {
    const text = await program(f.ramele);
    assert.ok(text.includes(`(scula T5 freza plata 3.175 D3.175)${NL}`), `${f.ramele}: freza`);
    // Foaia 1: plăcuțele ocupă x 10…270 și y 20…210; foaia 2, x 10…270 și y 60…210.
    // Cu rezoluția postului (0,001 mm): 10 − 1,5875 se scrie 8,412 sau 8,413, după reprezentarea numărului.
    const c = cutie(text);
    const asteptat = [10 - raza, 270 + raza, f.jos - raza, 210 + raza];
    [c.minX, c.maxX, c.minY, c.maxY].forEach((v, k) => { assert.ok(Math.abs(v - asteptat[k]!) <= 0.001, `${f.ramele}: ${v} față de ${asteptat[k]}`); });
    assert.equal(c.minZ, -12, `${f.ramele}: prin toată grosimea`);
    // Trecerile: fiecare plăcuță coboară, cu avansul de plonjare, la 3, 6, 9 și 12 mm.
    const plonjari = text.split(NL).flatMap((l) => { const m = /^G1 Z(-\d+\.\d+) F300\.0$/.exec(l); return m ? [Number(m[1])] : []; });
    assert.deepEqual(plonjari, Array.from({ length: f.placute }, () => [-3, -6, -9, -12]).flat(), `${f.ramele}: trecerile`);
    // Urechile: urcarea la Z −10 (12 − 2 mm de lemn), apoi 6 mm la acea înălțime; două pe plăcuță.
    const linii = text.split(NL);
    const urechi = linii.flatMap((l, k) => {
      const sus = /^G1 X(-?\d+\.\d+) Y(-?\d+\.\d+) Z-10\.000$/.exec(l);
      const plat = /^G1 X(-?\d+\.\d+) Y(-?\d+\.\d+)$/.exec(linii[k + 1] ?? '');
      return sus ? [plat ? Math.hypot(Number(plat[1]) - Number(sus[1]), Number(plat[2]) - Number(sus[2])) : Number.NaN] : [];
    });
    assert.equal(urechi.length, 2 * f.placute, `${f.ramele}: câte urechi`);
    urechi.forEach((u) => { assert.ok(Math.abs(u - 6) <= 0.001, `${f.ramele}: urechea de ${u} mm`); });
  }
});

test('numele pe hârtie: V-carve cu V90, cel mult 3 mm, fiecare pe plăcuța lui, centrat; „Ana”, de la 11 la 19 (majuscula de 8)', async () => {
  const d = documentPlaca11();
  for (const [k, f] of FOILE.entries()) {
    const text = await program(f.numele);
    assert.ok(text.includes(`(scula T3 freza V90 D6.000)${NL}`), `${f.numele}: freza`);
    const instante = d.foi[k]?.instante ?? [];
    assert.equal(instante.length, f.placute);
    const pePlacuta: [number, number][][] = instante.map(() => []);
    for (const [x, y, z] of puncteSub(text)) {
      assert.ok(z >= -3, `${f.numele}: adâncimea ${z}`);
      const n = instante.findIndex((i) => x >= i.x && x <= i.x + PLACUTA.latime && y >= i.y && y <= i.y + PLACUTA.inaltime);
      assert.ok(n >= 0, `${f.numele}: (${x}, ${y}) în afara plăcuțelor`);
      pePlacuta[n]!.push([x - instante[n]!.x, y - instante[n]!.y]);
    }
    pePlacuta.forEach((p, n) => {
      const nume = instante[n]?.campuri?.['Nume'];
      const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
      assert.ok(p.length > 0, `${nume}: fără litere`);
      // Centrat pe lățime (mijlocul cutiei la cel mult 1 mm de 40; cel mai departe, Valentin, la 0,56); pe înălțime, între
      // virgula de sub ț / Ș (8,18) și urcările literelor (19,44); fiecare nume are litere pe linia de bază, la 11.
      assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - PLACUTA.latime / 2) <= 1, `${nume}: centrarea`);
      assert.ok(Math.min(...ys) >= 8 && Math.min(...ys) <= 11.0005 && Math.max(...ys) <= 19.5, `${nume}: înălțimea ${Math.min(...ys)}…${Math.max(...ys)}`);
      if (nume === 'Ana') assert.deepEqual([Math.min(...ys), Math.max(...ys)], [11, 19], 'Ana: majuscula de 8 mm, de la 11 la 19');
    });
  }
});

test('regimul din fișă, în fiecare program: Z sigur la 5, axul la 18 000 cu 3 s de pauză, avansul 1 000, plonjarea 300', async () => {
  for (const f of FOILE) {
    for (const nume of [f.numele, f.ramele]) {
      const linii = (await program(nume)).split(NL);
      for (const l of ['G0 Z5.000', 'M3 S18000', 'G4 P3.000', 'M5', 'M30']) assert.ok(linii.includes(l), `${nume}: ${l}`);
      assert.ok(linii.some((l) => / F1000\.0$/.test(l)) && linii.some((l) => / F300\.0$/.test(l)), `${nume}: avansurile`);
    }
  }
});

test('urechile țin: la capătul ramelor, fiecare plăcuță e legată de marginea foii prin lemnul de pe fund; fără urechi, toate cad', async () => {
  const d = documentPlaca11();
  for (const [k, f] of FOILE.entries()) {
    const text = await program(f.ramele);
    const m = (d.foi[k]?.instante ?? []).map((i) => [i.x + PLACUTA.latime / 2, i.y + PLACUTA.inaltime / 2] as const);
    assert.equal(m.length, f.placute);
    assert.deepEqual(cazute(text, m), [], `${f.ramele}: plăcuțe căzute`);
    // Controlul: aceeași probă, cu urechile tăiate și ele, vede fiecare plăcuță căzută.
    assert.equal(cazute(text, m, true).length, m.length, `${f.ramele}: controlul`);
  }
});
