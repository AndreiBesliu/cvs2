/**
 * Oracolul degajărilor (ADR 0032): „programul unui document fără degajări e același, octet cu octet” (§1) și „pe o
 * operație fără `colturi`, verdictele porții nu se schimbă”.
 * - amprentele programelor documentelor fără `colturi` (corpusul 2.6 și cazurile §8 cu `colturi: null`, placa 1 pe 8
 *   montaje), măsurate în sesiunea oracolului pe un instantaneu al aplicației de DINAINTE de ADR 0032 (bb65461), trebuie
 *   să fie exact cele de acum; fișierele de aur ale plăcii 1 își păstrează sha256;
 * - pe programele scrise de mână ale oracolelor de dinainte (urechi, rampă, intrări, intrări cu rampă, sens; corecte și
 *   martorii lor negativi, deci și programe cu încălcări), poarta de acum și cea de dinainte de ADR 0032
 *   (`inainteDe0032`) dau EXACT aceleași încălcări (aceleași invariante, linii și mesaje).
 * Ajutoarele în `ajutor-degajari.ts`. A doua probă (echivalența porții, 2–3 minute într-un singur test) stă din 24.11.2026
 * în fișierele ei, `degajari.poarta.<n>.oracol.test.ts`, pe părți (`ajutor-degajari-poarta.ts`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CAZURI_DEG, corpusDegajari } from '../oracles/degajari.cazuri.ts';
import { docPlaca1 } from '../oracles/sens.cazuri.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { COLTURI, faraColturi, SCHEMA, sha } from './ajutor-degajari.ts';

/**
 * Amprentele aplicației de dinainte de ADR 0032 (bb65461), pe documentele fără `colturi`: familia → [câte programe,
 * câte au trecut (nu refuzuri), sha256 al șirului de sha256 ale programelor, unul pe rând]. Aceleași și la 98a22bf.
 */
const AMPRENTE_INAINTE: Readonly<Record<string, readonly [number, number, string]>> = {
  corpus: [110, 110, 'b89942dcdd6fce32dfd98ce00e6b5b92ff8359da5e411fb9f2c0db3e6cdf8efe'],
  cazuri: [104, 104, 'a1d223bb4f0fe0cc7675c06c8ae1233ad302ea19ece5dc26c11833b3eecd0c1d'],
  placa: [8, 8, 'f155588b22f87b4941455e2598380415ccc7fc1f5a0c4a9f13d47a84c28c56e8'],
};

test('lipire: programele documentelor fără colturi (corpusul 2.6, cazurile §8, placa 1 pe 8 montaje) sunt, octet cu octet, cele ale aplicației de dinainte de ADR 0032 (bb65461); fișierele plăcii 1 își păstrează amprentele', async () => {
  // Felia 2.3c-2: v10 (ADR 0037) adaugă căile deschise; documentele fără ele se taie la fel (ADR 0037 §2, §13), deci și pe 10.
  // Felia 5.1↑ (ADR 0069): v11 adaugă buzunarul; documentele fără el se taie la fel (doar numărul), deci și pe 11.
  assert.ok(SCHEMA >= 8 && SCHEMA <= 31, `schema ${SCHEMA}`);
  const fam: Record<string, { h: string[]; ok: number }> = { corpus: { h: [], ok: 0 }, cazuri: { h: [], ok: 0 }, placa: { h: [], ok: 0 } };
  const pune = (f: string, r: Awaited<ReturnType<typeof programulAplicatiei>>): void => {
    fam[f]!.h.push(sha(r.ok ? r.text : `REFUZ: ${r.motiv}`));
    if (r.ok) fam[f]!.ok++;
  };
  for (const c of corpusDegajari(0x2600, 110)) pune('corpus', await programulAplicatiei(faraColturi(c.doc), { origine: c.origine, z0: c.z0 }));
  for (const c of CAZURI_DEG) for (const [k, origine] of COLTURI.entries()) pune('cazuri', await programulAplicatiei(faraColturi(c.doc), { origine, z0: k % 2 ? 'jos' : 'sus' }));
  for (const origine of COLTURI) for (const z0 of ['sus', 'jos'] as const) pune('placa', await programulAplicatiei(docPlaca1(), { origine, z0 }));
  const rele: string[] = [];
  for (const [f, [n, ok, h]] of Object.entries(AMPRENTE_INAINTE)) {
    const x = fam[f]!;
    const acum = sha(x.h.join('\n'));
    if (x.h.length !== n || x.ok !== ok || acum !== h) rele.push(`${f}: ${x.h.length} programe, ${x.ok} trecute, amprenta ${acum}; înainte ${n}, ${ok}, ${h}`);
  }
  assert.deepEqual(rele, []);
  const AMPRENTE = {
    A: '03d6cf5376faadb728cbd8bc1a6ea408af543b5b40548200b707a8fe6b697ac9',
    B: 'a65c7e8a71481dd14de400be08d70139775efc74a858bee0cd660eaad39e1105',
  } as const;
  for (const f of ['A', 'B'] as const) {
    const octeti = readFileSync(new URL(`../placi/placa-01/placa-01-${f}.nc`, import.meta.url));
    assert.equal(createHash('sha256').update(octeti).digest('hex'), AMPRENTE[f], `placa-01-${f}.nc`);
  }
});
