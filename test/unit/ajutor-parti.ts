/**
 * Împărțirea unei probe lungi pe părți ale corpusului ei, câte un fișier de probă pe parte, ca părțile să ruleze în paralel
 * și niciun fișier să nu țină singur o felie a rapidului (24.11.2026: oracolul rampelor, căile netede din multe cubice,
 * echivalența porții de dinainte de ADR 0032). Judecata fiecărui caz rămâne a probei întregi; aici stau doar împărțirea și
 * paza ei: cazul k merge în partea (k mod parti) + 1.
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

/** Cazurile unei părți (1 … parti): cele de pe pozițiile k cu k mod parti = parte − 1. */
export function cazurilePartii<T>(corpus: readonly T[], parte: number, parti: number): T[] {
  if (!Number.isInteger(parte) || parte < 1 || parte > parti) throw new Error(`partea ${parte} din ${parti}`);
  return corpus.filter((_, k) => k % parti === parte - 1);
}

/**
 * Paza împărțirii: în dosar stă exact câte un fișier pe parte, cu numele cerut, iar părțile acoperă corpusul întreg,
 * fiecare caz o dată (`corpus`: câte un nume pe caz, diferite între ele).
 */
export function cereImpartirea(dosar: string, tipar: RegExp, nume: (parte: number) => string, parti: number, corpus: readonly string[]): void {
  const fisiere = readdirSync(dosar).filter((f) => tipar.test(f)).sort();
  assert.deepEqual(fisiere, Array.from({ length: parti }, (_, k) => nume(k + 1)).sort());
  const pe = Array.from({ length: parti }, (_, k) => cazurilePartii(corpus, k + 1, parti));
  assert.equal(pe.reduce((s, p) => s + p.length, 0), corpus.length);
  assert.deepEqual(pe.flat().sort(), [...corpus].sort());
  assert.equal(new Set(pe.flat()).size, corpus.length);
  assert.throws(() => cazurilePartii(corpus, 0, parti));
  assert.throws(() => cazurilePartii(corpus, parti + 1, parti));
}

/** Pragurile probei întregi, cerute pe părți: suma minimelor părților nu coboară sub ele. */
export function cereMinimele<K extends string>(praguri: Readonly<Record<K, number>>, minime: readonly Readonly<Record<K, number>>[], parti: number): void {
  assert.equal(minime.length, parti);
  for (const prag of Object.keys(praguri) as K[]) {
    const suma = minime.reduce((s, m) => s + m[prag], 0);
    assert.ok(suma >= praguri[prag], `${prag}: suma minimelor ${suma} sub pragul ${praguri[prag]}`);
  }
}
