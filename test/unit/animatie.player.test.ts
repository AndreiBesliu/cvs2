/**
 * Playerul animației traseului (ADR 0099, `src/ui/actiuniAnimatie.ts`): rulează, se oprește, sare, merge pas cu pas, cu
 * viteza aleasă, pe un ceas fals (cadrele și ora le dă proba). La final se oprește singur; „Rulează” de la final o ia de
 * la capăt. Viteza implicită face toată animația cam într-un minut.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creeazaAnimatie, VITEZE, vitezaPentru } from '../../src/ui/actiuniAnimatie.ts';
import { cronologie } from '../../src/sim/animatie.ts';
import type { Program } from '../../src/ir/ir.ts';

const PROGRAM: Program = {
  axe: ['X', 'Y', 'Z'], scula: { numar: 1, nume: 'F6', diametru: 6 }, turatie: 18000, zSigur: 5,
  miscari: [{ tip: 'rapida', la: { X: 10, Y: 0 } }, { tip: 'taiere', la: { X: 20 }, avans: 600 }, { tip: 'taiere', la: { X: 30 }, avans: 600 }],
};
/** 100 s în total: pregătirea 10, mișcările 20 + 30 + 30, finalul 10. */
const C = cronologie(PROGRAM, { pregatire: 10, miscari: [20, 30, 30], final: 10 });

class Ceas {
  ms = 0;
  private urmatorul = 1;
  readonly cadre = new Map<number, () => void>();
  readonly acum = (): number => this.ms;
  readonly cadru = (f: () => void): number => { const id = this.urmatorul++; this.cadre.set(id, f); return id; };
  readonly anuleaza = (id: number): void => { this.cadre.delete(id); };
  /** Timpul curge cu `ms`, în cadre de câte 16 ms, ca un browser. */
  avanseaza(ms: number): void {
    const tinta = this.ms + ms;
    while (this.ms < tinta) {
      this.ms = Math.min(tinta, this.ms + 16);
      const f = [...this.cadre.entries()];
      this.cadre.clear();
      for (const [, g] of f) g();
    }
  }
}

function banc() {
  const ceas = new Ceas();
  const a = creeazaAnimatie({ acum: ceas.acum, cadru: ceas.cadru, anuleaza: ceas.anuleaza });
  let notificari = 0;
  a.asculta(() => { notificari++; });
  return { ceas, a, notificari: () => notificari };
}

test('viteza implicită: cea mai mică din listă cu care toată animația ține cel mult un minut', () => {
  assert.deepEqual(VITEZE, [1, 2, 5, 10, 20, 50, 100, 200, 500]);
  assert.equal(vitezaPentru(30), 1);
  assert.equal(vitezaPentru(100), 2);
  assert.equal(vitezaPentru(600), 10);
  assert.equal(vitezaPentru(601), 20);
  assert.equal(vitezaPentru(1e9), 500);
});

test('încărcată: activă, oprită la început, cu viteza implicită; închisă: inactivă', () => {
  const { a } = banc();
  assert.equal(a.citeste().activa, false);
  a.incarca(C);
  const s = a.citeste();
  assert.deepEqual({ activa: s.activa, ruleaza: s.ruleaza, t: s.t, durata: s.durata, viteza: s.viteza }, { activa: true, ruleaza: false, t: 0, durata: 100, viteza: 2 });
  a.inchide();
  assert.equal(a.citeste().activa, false);
});

test('rulează: timpul animației = timpul ceasului × viteza; oprită, stă', () => {
  const { a, ceas } = banc();
  a.incarca(C);
  a.viteza(10);
  a.reda();
  ceas.avanseaza(1000);
  assert.ok(Math.abs(a.citeste().t - 10) < 1e-9, String(a.citeste().t));
  a.pauza();
  ceas.avanseaza(1000);
  assert.ok(Math.abs(a.citeste().t - 10) < 1e-9);
  assert.equal(a.citeste().ruleaza, false);
});

test('viteza schimbată din mers nu sare: doar ritmul de acum înainte', () => {
  const { a, ceas } = banc();
  a.incarca(C);
  a.viteza(10);
  a.reda();
  ceas.avanseaza(1000);
  // Între două cadre: jumătatea de secundă de până la schimbare merge cu viteza veche.
  ceas.ms += 500;
  a.viteza(20);
  ceas.avanseaza(1000);
  assert.ok(Math.abs(a.citeste().t - 35) < 1e-9, String(a.citeste().t));
});

test('la final se oprește exact la durată; „Rulează” de acolo o ia de la capăt', () => {
  const { a, ceas } = banc();
  a.incarca(C);
  a.viteza(100);
  a.reda();
  ceas.avanseaza(5000);
  assert.equal(a.citeste().t, 100);
  assert.equal(a.citeste().ruleaza, false);
  assert.equal(ceas.cadre.size, 0, 'niciun cadru cerut după final');
  a.reda();
  assert.equal(a.citeste().t, 0);
  assert.equal(a.citeste().ruleaza, true);
});

test('sare în interval; pas cu pas se oprește și merge la capetele pașilor', () => {
  const { a } = banc();
  a.incarca(C);
  a.sari(-5);
  assert.equal(a.citeste().t, 0);
  a.sari(1e9);
  assert.equal(a.citeste().t, 100);
  a.sari(15);
  a.reda();
  a.inainte();
  assert.equal(a.citeste().ruleaza, false);
  assert.equal(a.citeste().t, 30);
  a.inainte();
  assert.equal(a.citeste().t, 60);
  a.inapoi();
  assert.equal(a.citeste().t, 30);
});

test('ascultătorii află de fiecare schimbare; starea citită e aceeași până la o schimbare (useSyncExternalStore)', () => {
  const { a, notificari } = banc();
  a.incarca(C);
  const n = notificari();
  const s = a.citeste();
  assert.equal(a.citeste(), s);
  a.sari(50);
  assert.ok(notificari() > n);
  assert.notEqual(a.citeste(), s);
});

test('închisă din mers: nicio cerere de cadru rămasă; o încărcare nouă pornește de la zero', () => {
  const { a, ceas } = banc();
  a.incarca(C);
  a.reda();
  ceas.avanseaza(100);
  a.inchide();
  assert.equal(ceas.cadre.size, 0);
  a.incarca(C);
  assert.equal(a.citeste().t, 0);
  assert.equal(a.citeste().ruleaza, false);
});

test('încărcată din program: cu timpii mașinii (aceiași ca timpul jobului); fără ei (un $$ necitit), nimic încărcat', () => {
  const { a } = banc();
  const foaie = { latime: 300, inaltime: 200, grosime: 18 };
  assert.equal(a.incarcaProgram(PROGRAM, foaie, undefined), true);
  const s = a.citeste();
  assert.equal(s.activa, true);
  assert.ok(s.durata > 0);
  assert.equal(s.cronologie?.pasi.length, 4, 'trei mișcări și finalul');
  assert.equal(a.incarcaProgram(PROGRAM, foaie, '$110=abc\n'), false);
  assert.equal(a.citeste().activa, false);
});

test('freza la momentul animației vine cu starea: poziția, pasul, felul', () => {
  const { a } = banc();
  a.incarca(C);
  assert.equal(a.citeste().acum?.tip, 'pregatire');
  a.sari(45);
  const acum = a.citeste().acum;
  assert.equal(acum?.pas, 2);
  assert.equal(acum?.tip, 'taiere');
  assert.ok(Math.abs((acum?.x ?? NaN) - 15) < 1e-9, String(acum?.x));
});
