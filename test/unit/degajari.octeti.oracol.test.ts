/**
 * Oracolul degajărilor (ADR 0032): „programul unui document fără degajări e același, octet cu octet” (§1) și „pe o
 * operație fără `colturi`, verdictele porții nu se schimbă”.
 * - amprentele programelor documentelor fără `colturi` (corpusul 2.6 și cazurile §8 cu `colturi: null`, placa 1 pe 8
 *   montaje), măsurate în sesiunea oracolului pe un instantaneu al aplicației de DINAINTE de ADR 0032 (bb65461), trebuie
 *   să fie exact cele de acum; fișierele de aur ale plăcii 1 își păstrează sha256;
 * - pe programele scrise de mână ale oracolelor de dinainte (urechi, rampă, intrări, intrări cu rampă, sens; corecte și
 *   martorii lor negativi, deci și programe cu încălcări), poarta de acum și cea de dinainte de ADR 0032
 *   (`inainteDe0032`) dau EXACT aceleași încălcări (aceleași invariante, linii și mesaje).
 * Ajutoarele în `ajutor-degajari.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { CAZURI_DEG, corpusDegajari } from '../oracles/degajari.cazuri.ts';
import { CAZURI_URECHI, programCaz, type Martor } from '../oracles/urechi.cazuri.ts';
import { CAZURI_RAMPA, programCazRampa, type MartorRampa } from '../oracles/rampa.cazuri.ts';
import { CAZURI_INTRARI, programIntrari, type MartorIntrari } from '../oracles/intrari.cazuri.ts';
import { CAZURI_IR, martorIR, programIR, type MartorIR } from '../oracles/intrari-rampa.cazuri.ts';
import { docPlaca1, PLACA_1_INTOARSA, PLACA_1_NOUA, PLACA_1_VECHE, STOC_PLACA } from '../oracles/sens.cazuri.ts';
import type { Montaj, Stoc } from '../oracles/regiune.cazuri.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { COLTURI, faraColturi, mesaje, SCHEMA, sha } from './ajutor-degajari.ts';

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
  assert.ok(SCHEMA >= 8 && SCHEMA <= 10, `schema ${SCHEMA}`);
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

// ── Aceleași verdicte fără colturi: programele scrise de mână ale oracolelor de dinainte, corecte și martorii lor ─────

type Program = { readonly nume: string; readonly text: string; readonly ctx: ContextPoarta };

const ctxDin = (c: { readonly stoc: Stoc; readonly diametru: number; readonly pas: number; readonly doc: Parameters<typeof regiuneDinDocument>[0] }, m: Montaj): ContextPoarta => ({
  foaie: c.stoc, origine: m.origine, z0: m.z0, diametruScula: c.diametru, pas: c.pas, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(c.doc), avansPlonjare: 300,
});

/** Programele: fiecare caz pe hârtie, pe 2 montaje, fără martor și cu fiecare martor (cele care nu se aplică se sar). */
function programele(): Program[] {
  const rez: Program[] = [];
  const incearca = (nume: string, f: () => string, ctx: ContextPoarta): void => {
    try { rez.push({ nume, text: f(), ctx }); } catch { /* martorul nu se aplică pe acest caz */ }
  };
  const mont = (stoc: Stoc): Montaj[] => [{ foaie: stoc, origine: 'stanga-jos', z0: 'sus' }, { foaie: stoc, origine: 'dreapta-sus', z0: 'jos' }];
  const MU: readonly (Martor | undefined)[] = [undefined, 'binar', 'varf-din-adancime', 'centre-k-s', 'strangere', 'coarda'];
  for (const c of CAZURI_URECHI) for (const m of mont(c.stoc)) for (const x of MU) incearca(`urechi ${c.nume} ${x ?? ''}`, () => programCaz(c, m, x ? { martor: x } : {}), ctxDin(c, m));
  const MR: readonly (MartorRampa | undefined)[] = [undefined, 'plonjare', 'nerotite', 'pana', 'fara-urechi', 'flanc'];
  for (const c of CAZURI_RAMPA) for (const m of mont(c.stoc)) for (const x of MR) incearca(`rampa ${c.nume} ${x ?? ''}`, () => programCazRampa(c, m, x ? { martor: x } : {}), ctxDin(c, m));
  const MI: readonly (MartorIntrari | undefined)[] = [
    undefined, 'parte-pastrata', 'varf0', 'omisa', 'iesire-opusa', 'pe-bucla', 'raza-gresita', 'necandidat', 'sfert-scurt', 'treceri-diferite', 'intrare-dreapta', 'fara-iesire', 'centru-opus',
  ];
  for (const c of CAZURI_INTRARI) for (const m of mont(c.stoc).slice(0, 1)) for (const x of MI) incearca(`intrări ${c.nume} ${x ?? ''}`, () => programIntrari(c, m, x ? { martor: x } : {}), ctxDin(c, m));
  const MIR: readonly MartorIR[] = ['plata', 'de-la-dk-1', 'treapta', 'iesire-urca', 'iesire-la-suprafata', 'aer-g0', 'elice-dreapta', 'elice-franta', 'avans-taiere', 'fara-urechi', 'fara-ultima-trecere'];
  for (const c of CAZURI_IR.filter((q) => !q.refuz)) {
    for (const m of mont(c.stoc).slice(0, 1)) {
      incearca(`intrări cu rampă ${c.nume}`, () => programIR(c, m), ctxDin(c, m));
      for (const x of MIR) incearca(`intrări cu rampă ${c.nume} ${x}`, () => martorIR(programIR(c, m), m, x), ctxDin(c, m));
    }
  }
  const placa = { stoc: STOC_PLACA, diametru: 6, pas: 4, doc: docPlaca1() };
  for (const [nume, p] of [['veche', PLACA_1_VECHE], ['întoarsă', PLACA_1_INTOARSA], ['nouă', PLACA_1_NOUA]] as const) {
    rez.push({ nume: `placa 1 ${nume} A`, text: p.A, ctx: ctxDin(placa, { foaie: STOC_PLACA, origine: 'stanga-jos', z0: 'sus' }) });
    rez.push({ nume: `placa 1 ${nume} B`, text: p.B, ctx: ctxDin(placa, { foaie: STOC_PLACA, origine: 'dreapta-sus', z0: 'sus' }) });
  }
  return rez;
}

test('(o) poarta de acum și cea de dinainte de ADR 0032 dau EXACT aceleași încălcări pe programele scrise de mână ale oracolelor 2.4–2.5c (corecte și martorii lor negativi) și pe placa 1 (veche, întoarsă, nouă): pe programe fără degajări, nimic nu se schimbă', () => {
  const rele: string[] = [];
  let programe = 0, cuIncalcari = 0;
  for (const p of programele()) {
    programe++;
    const nou = poarta(p.text, p.ctx), vechi = poarta(p.text, p.ctx, { inainteDe0032: true });
    if (vechi.length) cuIncalcari++;
    if (JSON.stringify(nou) !== JSON.stringify(vechi)) rele.push(`${p.nume}: ${mesaje(nou.slice(0, 2))} / dinainte: ${mesaje(vechi.slice(0, 2))}`);
  }
  console.log(`echivalența fără colturi: ${programe} programe scrise de mână, ${cuIncalcari} cu încălcări (martorii), verdicte identice`);
  assert.deepEqual(rele, []);
  assert.ok(programe >= 300 && cuIncalcari >= 100, `${programe} programe, ${cuIncalcari} cu încălcări`);
});
