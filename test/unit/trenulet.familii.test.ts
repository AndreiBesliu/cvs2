/**
 * Piesele atelierului Easy 3Draw pe familii (ADR 0281, felia 3.Tp): o singură tabelă, `FAMILII` din `atelier.ts`, din care se
 * fac filele de sus și galeriile de sub ele. Atelierul e un script clasic al paginii: tabela (doar date) se citește din sursă
 * și se judecă față de motor (`Lego.tipuri`, tipurile pe care le știe `construieste`):
 * - fiecare tip al motorului stă o singură dată în tabelă, afară de „dinCvs2”, care are fila lui: un tip nou fără familie pică
 *   aici, nu ajunge nevăzut în pagină;
 * - în tabelă stau doar tipuri ale motorului și formele gata ale lor („placaTechnic”, o placă cu găuri, deschisă în editorul
 *   cărămizii), fiecare în familia tipului ei (fila nu sare la alegerea ei);
 * - familiile au id-uri unice, nume și piese; id-ul unei familii nu e un tip, nici o filă proprie (clicul pe filă alege după el);
 * - în marcaj stau doar filele proprii, la capăt („Din cvs2”, „Calibrare”): filele familiilor le pune scriptul, din tabelă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

type Familie = readonly [id: string, nume: string, piese: readonly (readonly [tip: string, nume: string])[]];

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: { tipuri: readonly string[] } } };
// obiectele motorului și ale tabelei vin din alt tărâm (vm): copiate în al probei, ca să se compare după conținut
const TIPURI: readonly string[] = [...motoare().L.tipuri];
const PLANIFICATOR = 'extensii/trenulet/sursa/planificator/';
const FILE_PROPRII = ['dinCvs2', 'calibrare'];
/** Formele gata din galerii: nu sunt tipuri ale motorului, ci se deschid în editorul unui tip. */
const FORME_GATA: ReadonlyMap<string, string> = new Map([['placaTechnic', 'caramida']]);

/** Tabela din sursa atelierului: literalul lui `FAMILII`, evaluat singur (doar șiruri și liste). */
function familii(): readonly Familie[] {
  const s = readFileSync(PLANIFICATOR + 'atelier.ts', 'utf8').replace(/\r\n/g, '\n');
  const m = /\n {2}const FAMILII: readonly Familie\[\] = (\[\n[\s\S]*?\n {2}\]);\n/.exec(s);
  assert.ok(m, 'tabela FAMILII în atelier.ts');
  return JSON.parse(JSON.stringify(runInNewContext(`(${m[1]!})`))) as readonly Familie[];
}
const piese = (t: readonly Familie[]): string[] => t.flatMap(([, , p]) => p.map(([k]) => k));

test('motorul își spune tipurile: cele 24 de până la 3.Tn, printre ele cărămida, roțile și forma din cvs2', () => {
  assert.ok(TIPURI.length >= 24, TIPURI.join(', '));
  for (const t of ['caramida', 'grinda', 'stiftTechnic', 'rotita', 'conicaDubla', 'dinCvs2']) assert.ok(TIPURI.includes(t), t);
});

test('fiecare tip al motorului stă o singură dată în tabelă; „dinCvs2” are fila lui, nu o familie', () => {
  const inTabel = piese(familii());
  const gresite = TIPURI.map((t) => [t, inTabel.filter((k) => k === t).length] as const)
    .filter(([t, n]) => n !== (FILE_PROPRII.includes(t) ? 0 : 1)).map(([t, n]) => `${t}: de ${n} ori`);
  assert.deepEqual(gresite, []);
});

test('în tabelă stau doar tipuri ale motorului și formele gata, fiecare o dată, forma în familia tipului ei', () => {
  const tabel = familii(), inTabel = piese(tabel);
  assert.deepEqual(inTabel.filter((k) => !TIPURI.includes(k) && !FORME_GATA.has(k)), []);
  assert.equal(new Set(inTabel).size, inTabel.length, `o piesă în două locuri: ${inTabel.join(', ')}`);
  const familia = (k: string): string | undefined => tabel.find(([, , p]) => p.some(([x]) => x === k))?.[0];
  for (const [forma, tip] of FORME_GATA) {
    assert.ok(TIPURI.includes(tip), `${forma} → ${tip}`);
    assert.equal(familia(forma), familia(tip), `${forma} stă lângă ${tip}`);
  }
});

test('familiile: id-uri unice, cu nume și cu piese numite; id-ul nu e un tip, nici o filă proprie, nici o formă gata', () => {
  const tabel = familii(), ids = tabel.map(([f]) => f);
  assert.ok(tabel.length >= 2, ids.join(', '));
  assert.equal(new Set(ids).size, ids.length, ids.join(', '));
  for (const [f, nume, p] of tabel) {
    assert.ok(nume.trim(), f);
    assert.ok(p.length > 0, f);
    assert.ok(!TIPURI.includes(f) && !FILE_PROPRII.includes(f) && !FORME_GATA.has(f), f);
    for (const [k, n] of p) assert.ok(n.trim(), k);
  }
});

test('marcajul are doar filele proprii, la capăt („Din cvs2”, „Calibrare”); pe cele ale familiilor le pune scriptul', () => {
  const corp = readFileSync(PLANIFICATOR + 'body.html', 'utf8');
  const nav = /<nav class="at-tipuri" id="at-tipuri"[^>]*>([\s\S]*?)<\/nav>/.exec(corp);
  assert.ok(nav, 'filele de sus în body.html');
  assert.deepEqual([...nav[1]!.matchAll(/data-fila="([^"]+)"/g)].map((m) => m[1]), FILE_PROPRII);
});
