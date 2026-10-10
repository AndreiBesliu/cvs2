/**
 * Oracolul intrărilor cu rampă (ADR 0031): invariantele 9, 11 și 12 amendate (și 10 pe buclă) din poartă, judecate:
 * - pe hârtie: razele încercate sub rampă (πρ/2 ≥ 1), F pe elice, fundul sub intrare (formula închisă);
 * - pe scriitorul „cum cere contractul” (`intrari-rampa.cazuri.ts`: scriitorul ADR 0030 adus la §3, rampa ADR 0029 pe
 *   bucla omisă): cazurile din §6 (plus ρ > R) pe 8 montaje trec TOATĂ poarta și hârtia (A, p₀, C, ρ, Z la capetele
 *   intrării, Z liniar, F și viteza pe verticală, coborârea prin aer, ieșirea, ridicarea; urechile din p₀; bucla omisă
 *   pe perimetrul analitic; câmpul de înălțimi: nicio mișcare nu scoate mai mult decât pasul, fundul în punctele de pe
 *   hârtie, cu ρ = R, ρ < R, ρ > R și raza înjumătățită);
 * - pe martorii negativi (§6 și ai mei), transformări greșite ale programelor: fiecare înroșește poarta (cu invariantele
 *   cerute) și hârtia;
 * - echivalența: pe programele FĂRĂ combinație (doar rampă, doar intrări, niciuna; cu martorii lor), poarta amendată dă
 *   EXACT verdictele porții de dinainte de ADR 0031;
 * - lipirea („lipire:”, cere schema ≥ 7 și PICĂ, nu se sare): cazurile pe 8 montaje (poarta, hârtia, avertismentul cu
 *   razele încercate), martorii pe programele aplicației, refuzurile ADR 0031 cu motiv, corpusul 2.5b cu rampe la
 *   întâmplare (1, 2, 3, 5, 9, 10, 11, 12 și viteza pe verticală), octeții programelor fără combinație = cei ai aplicației
 *   de dinainte de ADR 0031 (amprentele 6c4d131), amprentele plăcii 1;
 * - precizarea din 10.10 (urechile buclei înseși, cu și fără rampă): gaura R20 cu 5 urechi (raza 6 → 3), gaura R8 cu 2
 *   urechi (intrarea omisă), punțile fiecărei urechi întregi pe câmpul de înălțimi (cazurile, corpusul, intrările fără
 *   rampă pe bucle cu urechi), martorul care ignoră condiția; cele 28 de programe fără rampă schimbate față de 6c4d131
 *   trec poarta (cele de dinainte, roșii pe 12, sunt măsurate în sesiunea oracolului); colțul ca intrare (A pe buclă).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Punct3 } from '../oracles/gcode.ts';
import { laDocument, poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import type { DocV7O } from '../oracles/document.ts';
import { citesteEticheta, regiuneDinDocument } from '../oracles/regiune.ts';
import { citeste } from '../oracles/gcode.ts';
import { asteptatRampa, comparaRampa, lanturile, masoaraRampa, parcurgeriHartie, type PasL } from '../oracles/rampa.ts';
import { asteptatPeHartie, comparaCuHartia, masoara, profil, zProfil, type BucataTrecere, type Trecere } from '../oracles/urechi.ts';
import {
  buclaAnalitica, comparaIntrarea, desparte, desparteCuRampa, masoaraIntrari, razele, razeleCuRampa, sfertulIncape, type Bucata,
} from '../oracles/intrari.ts';
import {
  avansElice, campul, comparaIntrareCuRampa, masoaraIntrariCuRampa, punteleUrechilor, type AsteptatIR, type MasuraIR,
} from '../oracles/intrari-rampa.ts';
import {
  CAZURI_IR, corpusIntrariRampa, documenteFaraCombinatie, FARA_URECHI_PROPRII, fundSubIntrare, laRampaPeIntrare, martorIR, P_RAMA_IR, programIR, refuzPrezis,
  type CazIR, type MartorIR,
} from '../oracles/intrari-rampa.cazuri.ts';
import { CAZURI_INTRARI, programIntrari, type AsteptatH, type MartorIntrari } from '../oracles/intrari.cazuri.ts';
import { CAZURI_URECHI, programCaz } from '../oracles/urechi.cazuri.ts';
import { CAZURI_RAMPA, programCazRampa } from '../oracles/rampa.cazuri.ts';
import { corpus, PLACA_1, programDinTrasee, type Montaj, type Stoc } from '../oracles/regiune.cazuri.ts';
import { docPlaca1, STOC_PLACA, traseeCerute } from '../oracles/sens.cazuri.ts';
import { programulAplicatiei, schemaAplicatiei } from './ajutor-lipire.ts';

import {
  AVANS_PLONJARE, SCHEMA, R, mesaje, COLTURI, montaje, descrieM, dist, ctxDe, numerele, type Hartie, hartie, programulEtichetei, puntiProgram, urechiDe, punti,
} from './ajutor-intrari-rampa.ts';

test('(o) razele sub rampă (§2): doar cele cu πρ/2 ≥ 1 mm: 3 → 3, 1,5; 1 → 1 (0,5 are 0,785); 0,6 → niciuna (0,942); 2/π intră; 1,27 → 1,27 (0,635 < 2/π); fără rampă, razele ADR 0030', () => {
  assert.deepEqual(razeleCuRampa(3), [3, 1.5]);
  assert.deepEqual(razeleCuRampa(1), [1]);
  assert.deepEqual(razele(1), [1, 0.5]);
  assert.deepEqual(razeleCuRampa(0.6), []);
  assert.ok(sfertulIncape(2 / Math.PI) && !sfertulIncape(0.636));
  assert.deepEqual(razeleCuRampa(1.27), [1.27]);
  assert.deepEqual(razeleCuRampa(1.28), [1.28, 0.64]);
  assert.ok(Math.abs((Math.PI * 0.6) / 2 - 0.942) < 0.0005 && Math.abs((Math.PI * 0.5) / 2 - 0.785) < 0.0005);
});

test('(o) F pe elice pe hârtie (ρ = 3: L₃ = √((1,5π)² + d²)): 558,6 / 381,5 / 338,6 la d = 3, 6, 9; viteza pe verticală F·d / L₃ = 300; la ρ = 20 și d = 1, F = 1000', () => {
  assert.equal(avansElice(3, 3).toFixed(1), '558.6');
  assert.equal(avansElice(3, 6).toFixed(1), '381.5');
  assert.equal(avansElice(3, 9).toFixed(1), '338.6');
  for (const d of [3, 6, 9]) assert.ok(Math.abs((avansElice(3, d) * d) / Math.hypot(1.5 * Math.PI, d) - 300) < 1e-9);
  assert.equal(avansElice(20, 1), 1000);
});

test('(o) fundul sub intrare pe hârtie (ρ = 6, R = 3): pe elice la t = 0,1 → −9·(0,1 + (4/π)·asin(1/4)) = −3,795; la t = 0,8 → −9 (t + Δt > 1); în C → 0', () => {
  const C = { x: 50, y: 41 };
  const pe = (t: number) => ({ x: 50 + 6 * Math.cos(Math.PI - t * Math.PI / 2), y: 41 + 6 * Math.sin(Math.PI - t * Math.PI / 2) });
  const z1 = fundSubIntrare(pe(0.1), C, 6, Math.PI, -1, 9, 3);
  assert.ok(Math.abs(z1 + 9 * (0.1 + (4 / Math.PI) * Math.asin(0.25))) < 1e-9 && Math.abs(z1 + 3.7955) < 0.0005, String(z1));
  assert.equal(fundSubIntrare(pe(0.8), C, 6, Math.PI, -1, 9, 3), -9);
  assert.equal(fundSubIntrare(C, C, 6, Math.PI, -1, 9, 3), 0);
});

// ── (o) Scriitorul cum cere contractul ──────────────────────────────────────────────────────────────────────────────

test('(o) scriitorul cum cere contractul: cazurile §6 (și ρ > R) pe 8 montaje trec toată poarta (1–12, viteza pe verticală) și hârtia; raza 0,6 e prinsă ca refuz', () => {
  const rele: string[] = [];
  let programe = 0;
  for (const c of CAZURI_IR) {
    for (const m of montaje(c.stoc)) {
      const text = programIR(c, m);
      programe++;
      const v = poarta(text, ctxDe(c, m));
      if (c.refuz) {
        if (!v.some((i) => i.invarianta === 12 && /trebuia refuzat \(ADR 0031 §2\)/.test(i.mesaj))) rele.push(`${c.nume} (${descrieM(m)}): refuzul razei nu e prins: ${mesaje(v.slice(0, 3))}`);
        continue;
      }
      if (v.length) rele.push(`${c.nume} (${descrieM(m)}):\n${mesaje(v.slice(0, 3))}`);
      const h = hartie(c, text, m);
      if (h.rele.length) rele.push(`${c.nume} (${descrieM(m)}): ${h.rele.slice(0, 3).join('; ')}`);
    }
  }
  assert.deepEqual(rele, []);
  assert.equal(programe, CAZURI_IR.length * 8);
});

// ── Martorii negativi ───────────────────────────────────────────────────────────────────────────────────────────────

type SursaMartor = 'transformare' | 'fara-intrari' | 'raza-jumatate' | 'urechi-proprii';
type Martor = {
  readonly nume: string; readonly martor: MartorIR | null; readonly sursa: SursaMartor; readonly cazuri: readonly number[]; readonly cere: readonly number[];
  /** Doar pe scriitor (programul greșit nu se poate obține din al aplicației printr-o transformare de text). */
  readonly doarScriitor?: boolean;
};

/**
 * Martorii (ADR 0031 §6, apoi ai mei), cu cazurile pe care au sens (indicii în CAZURI_IR) și invariantele care TREBUIE
 * să-i prindă pe fiecare program. `fara-intrari`: programul aceluiași document fără intrări (rampa ADR 0029 pe o buclă
 * care are intrare); `raza-jumatate`: programul fără rampă (intrarea cu ρ = 0,5, ADR 0030), adus la forma §3.
 */
const MARTORI: readonly Martor[] = [
  { nume: '§6: intrarea plată la −d_k, cu plonjarea în A', martor: 'plata', sursa: 'transformare', cazuri: [0, 1, 3, 6], cere: [11, 12] },
  { nume: '§6: intrarea care pornește de la −d_{k−1} în A (de la trecerea 2)', martor: 'de-la-dk-1', sursa: 'transformare', cazuri: [0, 1, 3, 6], cere: [11, 12] },
  { nume: '§6: intrarea care coboară doar până la −d_{k−1} (treapta în p₀, de la trecerea 2)', martor: 'treapta', sursa: 'transformare', cazuri: [0, 1, 3, 6], cere: [11, 12] },
  { nume: '§6: rampa continuă ADR 0029 pe o buclă care are intrare', martor: null, sursa: 'fara-intrari', cazuri: [0, 1, 3, 6], cere: [12] },
  { nume: '§6: raza 0,5 încercată sub rampă (raza 1)', martor: null, sursa: 'raza-jumatate', cazuri: [5], cere: [9, 12] },
  { nume: 'ieșirea care urcă în Z la −d_{k−1} (respinsă la „Limitele”; de la trecerea 2)', martor: 'iesire-urca', sursa: 'transformare', cazuri: [0, 1, 3, 6], cere: [11] },
  { nume: 'ieșirea care urcă până la fața de sus (fără ridicare pe verticală)', martor: 'iesire-la-suprafata', sursa: 'transformare', cazuri: [0, 1, 3, 6], cere: [11] },
  { nume: 'coborârea prin aer cu G0', martor: 'aer-g0', sursa: 'transformare', cazuri: [0, 1, 3, 6], cere: [11] },
  { nume: 'intrarea în linie dreaptă, cu Z', martor: 'elice-dreapta', sursa: 'transformare', cazuri: [0, 1, 6], cere: [12] },
  { nume: 'elicea frântă (−0,8·d_k la jumătatea arcului), cu F plafonat', martor: 'elice-franta', sursa: 'transformare', cazuri: [0, 1, 6], cere: [11] },
  { nume: 'elicea cu avansul de tăiere (F1000)', martor: 'avans-taiere', sursa: 'transformare', cazuri: [0, 1, 6], cere: [10] },
  { nume: 'bucla plată la −d_k pe trecerea cu urechi', martor: 'fara-urechi', sursa: 'transformare', cazuri: [3], cere: [10] },
  { nume: 'ultima trecere a fiecărei bucle lipsește', martor: 'fara-ultima-trecere', sursa: 'transformare', cazuri: [0, 1, 3, 6], cere: [11] },
  { nume: 'prima trecere repetată (fundul nu crește)', martor: 'trecere-dubla', sursa: 'transformare', cazuri: [0, 1, 3, 6], cere: [11] },
  { nume: 'buclele intercalate (trecerea k a tuturor, apoi k + 1)', martor: 'intercalate', sursa: 'transformare', cazuri: [3], cere: [11] },
  { nume: 'micro-plonjarea de 0,002 mm pe buclă (prima trecere)', martor: 'micro-plonjare', sursa: 'transformare', cazuri: [0, 1, 6], cere: [11] },
  { nume: 'precizarea din 10.10: intrarea care ignoră urechile buclei înseși', martor: null, sursa: 'urechi-proprii', cazuri: [7, 8], cere: [12], doarScriitor: true },
  { nume: 'colțul ca intrare: intrarea plată la −d_k (forma ADR 0030 sub rampă)', martor: 'plata', sursa: 'transformare', cazuri: [9], cere: [11, 12] },
];

/** Cazul R3,7 cu ρ = 0,5 (ADR 0030, fără rampă) pentru scriitor: p₀ = (100,7, 100), t₀ = (0, 1), n = (−1, 0), C = (100,2, 100). */
const H05: AsteptatH = { p0: { x: 100.7, y: 100 }, C: { x: 100.2, y: 100 }, rho: 0.5, parte: 'stanga', A: { x: 100.2, y: 99.5 }, B: { x: 100.2, y: 100.5 } };

/** Programul martorului: pe scriitor (`aplicatia` = null) sau pe programele aplicației. */
async function programMartor(x: Martor, c: CazIR, m: Montaj, aplicatia: boolean): Promise<string | null> {
  if (x.sursa === 'transformare') {
    const baza = aplicatia ? await programulAplicatiei(c.doc, m) : { ok: true as const, text: programIR(c, m) };
    return baza.ok ? martorIR(baza.text, m, x.martor!) : null;
  }
  if (x.sursa === 'fara-intrari') {
    if (!aplicatia) return programIR({ ...c, asteptat: Object.fromEntries(c.forme.map((f) => [f.id, null])), omisa: {} }, m);
    const d = structuredClone(c.doc);
    for (const p of d.piese) for (const o of p.operatii) o.intrari = null;
    const r = await programulAplicatiei(d, m);
    return r.ok ? r.text : null;
  }
  if (x.sursa === 'urechi-proprii') return programIR({ ...c, asteptat: { ...c.asteptat, c: FARA_URECHI_PROPRII[CAZURI_IR.indexOf(c)]! } }, m);
  // raza-jumatate
  if (!aplicatia) {
    const ci = { ...CAZURI_INTRARI[0]!, nume: c.nume, stoc: c.stoc, forme: c.forme, adancime: c.adancime, raza: 1, urechi: null, asteptat: { c: H05 }, doc: c.doc };
    return laRampaPeIntrare(programIntrari(ci, m), m);
  }
  const d = structuredClone(c.doc);
  for (const p of d.piese) for (const o of p.operatii) o.rampa = null;
  const r = await programulAplicatiei(d, m);
  return r.ok ? laRampaPeIntrare(r.text, m) : null;
}

const tabelMartori: string[] = [];

async function judecaMartor(x: Martor, aplicatia: boolean): Promise<string[]> {
  const scapa: string[] = [];
  const prinde = new Set<number>();
  let hartiaPrinde = 0, judecate = 0;
  for (const ci of x.cazuri) {
    const c = CAZURI_IR[ci]!;
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[5]!]) {
      const text = await programMartor(x, c, m, aplicatia);
      if (text === null) { scapa.push(`${c.nume}: programul de bază lipsește`); continue; }
      judecate++;
      const v = poarta(text, ctxDe(c, m));
      for (const i of v) prinde.add(i.invarianta);
      if (v.length === 0) scapa.push(`poarta: ${c.nume} (${descrieM(m)})`);
      for (const n of x.cere) if (!v.some((i) => i.invarianta === n)) scapa.push(`poarta, invarianta ${n}: ${c.nume} (${descrieM(m)}): ${mesaje(v.slice(0, 3))}`);
      if (hartie(c, text, m).rele.length) hartiaPrinde++;
      else scapa.push(`hârtia: ${c.nume} (${descrieM(m)})`);
    }
  }
  tabelMartori.push(`${aplicatia ? 'aplicația' : 'scriitorul'} | ${x.nume} | ${x.cazuri.length} cazuri × 2 montaje | poarta: ${[...prinde].sort((a, b) => a - b).join(', ')} | hârtia: ${hartiaPrinde}/${judecate}`);
  return scapa;
}

for (const x of MARTORI) {
  test(`(o) martorul „${x.nume}” pe scriitor înroșește poarta (${x.cere.join(', ')}) și hârtia`, async () => {
    assert.deepEqual(await judecaMartor(x, false), []);
  });
}

// ── (o) Amendamentele ───────────────────────────────────────────────────────────────────────────────────────────────

test('(o) echivalența: pe programele FĂRĂ combinație (scriitorii 2.4, 2.5a, 2.5b cu martorii lor, placa 1, corpusul 2.3a), poarta amendată dă EXACT verdictele porții de dinainte de ADR 0031', () => {
  const rele: string[] = [];
  let programe = 0, cuIncalcari = 0;
  const judeca = (text: string, ctx: ContextPoarta, unde: string): void => {
    const nou = poarta(text, ctx), vechi = poarta(text, ctx, { inainteDe0031: true });
    if (JSON.stringify(nou) !== JSON.stringify(vechi)) rele.push(`${unde}: nou ${mesaje(nou.slice(0, 2))} / vechi ${mesaje(vechi.slice(0, 2))}`);
    programe++;
    if (vechi.length) cuIncalcari++;
  };
  const ctxD = (c: { stoc: Stoc; diametru: number; pas: number; doc: Parameters<typeof regiuneDinDocument>[0] }, m: Montaj): ContextPoarta => ({
    foaie: c.stoc, origine: m.origine, z0: m.z0, diametruScula: c.diametru, pas: c.pas, supracursa: 0, asteptareAx: 3,
    regiune: regiuneDinDocument(c.doc), avansPlonjare: AVANS_PLONJARE,
  });
  for (const c of CAZURI_URECHI) {
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[5]!]) {
      for (const o of [{}, { intre: 'coboara' as const }, { martor: 'binar' as const }, { martor: 'centre-k-s' as const }]) judeca(programCaz(c, m, o), { ...ctxD(c, m), supracursa: c.supracursa }, `${c.nume} ${JSON.stringify(o)}`);
    }
  }
  for (const c of CAZURI_RAMPA) {
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[3]!]) {
      for (const o of [{}, { martor: 'plonjare' as const }, { martor: 'nerotite' as const }, { martor: 'pana' as const }, { martor: 'flanc' as const }, { rampa: null }]) {
        judeca(programCazRampa(c, m, o), { ...ctxD(c, m), supracursa: c.supracursa }, `${c.nume} ${JSON.stringify(o)}`);
      }
    }
  }
  const martori0030: Array<MartorIntrari | undefined> = [undefined, 'parte-pastrata', 'varf0', 'omisa', 'iesire-opusa', 'pe-bucla', 'raza-gresita', 'sfert-scurt', 'amestecate', 'netangenta'];
  for (const c of CAZURI_INTRARI) {
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[6]!]) {
      for (const martor of martori0030) judeca(programIntrari(c, m, martor ? { martor } : {}), ctxD(c, m), `${c.nume} ${martor ?? ''}`);
    }
  }
  for (const m of montaje(STOC_PLACA)) {
    for (const intre of ['coboara', 'ridica'] as const) {
      const doc = PLACA_1(6);
      const mm = { ...m, foaie: { latime: 300, inaltime: 200, grosime: 18 } };
      judeca(programDinTrasee(traseeCerute(doc, 6, { intre }), mm), ctxD({ stoc: mm.foaie, diametru: 6, pas: 18, doc }, mm), `placa 1 ${intre}`);
      const d1 = docPlaca1();
      judeca(programDinTrasee(traseeCerute(d1, 6, { intre }), m), ctxD({ stoc: STOC_PLACA, diametru: 6, pas: 18, doc: d1 }, m), `placa 1 (140) ${intre}`);
    }
  }
  for (const c of corpus().slice(0, 40)) {
    const m: Montaj = { foaie: c.doc.foi[0]!.stoc, origine: c.origine, z0: c.z0 };
    judeca(programDinTrasee(traseeCerute(c.doc, c.diametru, { intre: 'ridica' }), m), ctxD({ stoc: m.foaie, diametru: c.diametru, pas: 18, doc: c.doc }, m), `corpus 2.3a ${c.nume}`);
  }
  console.log(`echivalența ADR 0031: ${programe} programe, ${cuIncalcari} cu încălcări (aceleași)`);
  assert.deepEqual(rele, []);
  assert.ok(programe >= 300 && cuIncalcari >= 80, `${programe} programe, ${cuIncalcari} cu încălcări`);
});

test('(o) amendamentele sunt necesare: pe programele scriitorului cu rampa pe intrare, poarta de dinainte de ADR 0031 dă 11 și 12 (refuzul „intrări și rampă”), cea amendată nu', () => {
  for (const c of [CAZURI_IR[0]!, CAZURI_IR[1]!]) {
    const m = montaje(c.stoc)[0]!;
    const text = programIR(c, m);
    const vechi = poarta(text, ctxDe(c, m), { inainteDe0031: true });
    assert.ok(vechi.some((i) => i.invarianta === 11) && vechi.some((i) => i.invarianta === 12 && /intrări și rampă/.test(i.mesaj)), mesaje(vechi));
    assert.deepEqual(poarta(text, ctxDe(c, m)), []);
  }
});

test('(o) refuzurile pe etichetă: sub rampă, raza 0,6 (sfertul 0,942) e prinsă de 12, 2/π + 0,001 nu; lungimea rampei 0,999 e prinsă de 11 chiar cu toate buclele cu intrare; pe-linie cu intrări e prinsă de 12', () => {
  const c = CAZURI_IR[0]!;
  const m = montaje(c.stoc)[0]!;
  const text = programIR(c, m);
  const cu = (f: (d: DocV7O) => void): DocV7O => { const d = structuredClone(c.doc); f(d); return d; };
  const judeca = (d: DocV7O): Incalcare[] => poarta(text, { ...ctxDe(c, m), regiune: regiuneDinDocument(d) });
  assert.ok(judeca(cu((d) => { d.piese[0]!.operatii[0]!.intrari = { raza: 0.6 }; })).some((i) => i.invarianta === 12 && /ADR 0031 §2/.test(i.mesaj)));
  assert.ok(!judeca(cu((d) => { d.piese[0]!.operatii[0]!.intrari = { raza: 2 / Math.PI + 0.001 }; })).some((i) => /ADR 0031 §2/.test(i.mesaj)));
  assert.ok(judeca(cu((d) => { d.piese[0]!.operatii[0]!.rampa = { lungime: 0.999 }; })).some((i) => i.invarianta === 11 && /sub minimul/.test(i.mesaj)));
  assert.deepEqual(judeca(cu((d) => { d.piese[0]!.operatii[0]!.rampa = { lungime: 1 }; })), [], 'lungimea 1: nefolosită pe bucla cu intrare, dar admisă');
  const peLinie = cu((d) => { d.piese[0]!.operatii[0]!.latura = 'pe-linie'; });
  const t2 = text.replace('a/a: dreptunghi, exterior, 9 mm', 'a/a: dreptunghi, pe-linie, 9 mm');
  assert.ok(poarta(t2, { ...ctxDe(c, m), regiune: regiuneDinDocument(peLinie) }).some((i) => i.invarianta === 12 && /pe-linie/.test(i.mesaj)));
});

test('(o) 9 amendată: elicea împărțită în două mișcări (prima de la fața de sus, a doua sub ea) e o porțiune deschisă de 45°, tangentă în p₀, cu raza permisă: trece; cu raza / 2 = 0,5 sub raza 1 (neîncercată) e prinsă', () => {
  const c = CAZURI_IR[0]!;
  const m = montaje(c.stoc)[0]!;
  const L = programIR(c, m).split('\n');
  // Prima elice (de la A = (53, 44) la p₀ = (50, 47), Z 0 → −3, I −3): în două sferturi de sfert, prin (50 + 3·cos 45°, 44 + 3·sin 45°).
  const k = L.findIndex((l) => /^G3 X50\.000 Y47\.000 Z-3\.000 I-3\.000 J0\.000/.test(l));
  assert.ok(k > 0);
  const q = { x: 50 + 3 * Math.SQRT1_2, y: 44 + 3 * Math.SQRT1_2 };
  const F = L[k]!.replace(/.* F/, 'F');
  L.splice(k, 1, `G3 X${q.x.toFixed(3)} Y${q.y.toFixed(3)} Z-1.500 I-3.000 J0.000 ${F}`, `G3 X50.000 Y47.000 Z-3.000 I${(50 - q.x).toFixed(3)} J${(44 - q.y).toFixed(3)}`);
  assert.deepEqual(poarta(L.join('\n'), ctxDe(c, m)), []);
});

// ── Lipirea cu aplicația ────────────────────────────────────────────────────────────────────────────────────────────

test('lipire: aplicația e pe schema ≥ 7 (ADR 0031 nu schimbă documentul); pe una mai veche testele de lipire PICĂ, nu se sar', () => {
  assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
});

for (const c of CAZURI_IR) {
  test(`lipire: ${c.nume}: programul aplicației, pe 8 montaje, ${c.refuz ? 'e refuzat cu motiv' : 'trece toată poarta și hârtia; avertismentul pomenește doar razele încercate'}`, async () => {
    assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
    const rele: string[] = [];
    for (const m of montaje(c.stoc)) {
      const r = await programulAplicatiei(c.doc, m);
      if (c.refuz) {
        if (r.ok) rele.push(`${descrieM(m)}: aplicația nu refuză`);
        else if (!r.motiv.trim()) rele.push(`${descrieM(m)}: refuz fără motiv`);
        continue;
      }
      if (!r.ok) { rele.push(`${descrieM(m)}: aplicația refuză: ${r.motiv}`); continue; }
      const v = poarta(r.text, ctxDe(c, m));
      if (v.length) rele.push(`${descrieM(m)}:\n${mesaje(v.slice(0, 4))}`);
      const h = hartie(c, r.text, m);
      if (h.rele.length) rele.push(`${descrieM(m)}: ${h.rele.slice(0, 4).join('; ')}`);
      // ADR 0031 §2–§3: avertismentul intrării omise, cu razele încercate (și doar cu ele).
      const omise = c.forme.filter((f) => !c.asteptat[f.id]).map((f) => `${f.id}/${f.id}`);
      if (r.avertismente === null) { rele.push(`${descrieM(m)}: exportul n-are câmpul avertismente`); continue; }
      if (r.avertismente.length !== omise.length) rele.push(`${descrieM(m)}: ${r.avertismente.length} avertismente, ${omise.length} intrări omise: ${JSON.stringify(r.avertismente)}`);
      for (const id of omise) {
        const a = r.avertismente.find((x) => x.includes(id) && /intrarea omis/.test(x));
        if (!a) { rele.push(`${descrieM(m)}: lipsește avertismentul pentru ${id}: ${JSON.stringify(r.avertismente)}`); continue; }
        const n = numerele(a.slice(a.indexOf(id) + id.length));
        for (const x of c.incercate ?? []) if (!n.includes(x)) rele.push(`${descrieM(m)}: avertismentul nu pomenește raza încercată ${x}: ${a}`);
        for (const x of c.neincercate ?? []) if (n.includes(x)) rele.push(`${descrieM(m)}: avertismentul pomenește raza neîncercată ${x}: ${a}`);
      }
    }
    assert.deepEqual(rele, []);
  });
}

for (const x of MARTORI.filter((q) => !q.doarScriitor)) {
  test(`lipire: martorul „${x.nume}” pe programele aplicației înroșește poarta (${x.cere.join(', ')}) și hârtia`, async () => {
    assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
    assert.deepEqual(await judecaMartor(x, true), []);
  });
}

test('lipire: refuzurile ADR 0031 au motiv (raza 0,6 cu rampă; lungimea 0,999 cu toate buclele cu intrare; pe-linie cu intrări și rampă), iar controalele trec poarta (2/π + 0,001; lungimea 1; pe-linie doar cu rampă; raza 0,6 fără rampă)', async () => {
  assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
  const baza = CAZURI_IR[0]!;
  const m = montaje(baza.stoc)[0]!;
  const cu = (f: (d: DocV7O) => void): DocV7O => { const d = structuredClone(baza.doc); f(d); return d; };
  const op = (d: DocV7O) => d.piese[0]!.operatii[0]!;
  const cazuri: Array<{ nume: string; doc: DocV7O; ok: boolean }> = [
    { nume: 'raza 0,6 cu rampă', doc: cu((d) => { op(d).intrari = { raza: 0.6 }; }), ok: false },
    { nume: 'raza 0,636 cu rampă', doc: cu((d) => { op(d).intrari = { raza: 0.636 }; }), ok: false },
    { nume: 'raza 2/π + 0,001 cu rampă (control)', doc: cu((d) => { op(d).intrari = { raza: Math.round((2 / Math.PI + 0.001) * 1000) / 1000 }; }), ok: true },
    { nume: 'raza 0,6 fără rampă (control, ADR 0030)', doc: cu((d) => { op(d).intrari = { raza: 0.6 }; op(d).rampa = null; }), ok: true },
    { nume: 'lungimea 0,999, bucla cu intrare', doc: cu((d) => { op(d).rampa = { lungime: 0.999 }; }), ok: false },
    { nume: 'lungimea 1, bucla cu intrare (control)', doc: cu((d) => { op(d).rampa = { lungime: 1 }; }), ok: true },
    { nume: 'pe-linie cu intrări și rampă', doc: cu((d) => { op(d).latura = 'pe-linie'; }), ok: false },
    { nume: 'pe-linie doar cu rampă (control)', doc: cu((d) => { op(d).latura = 'pe-linie'; op(d).intrari = null; }), ok: true },
  ];
  const rele: string[] = [];
  for (const x of cazuri) {
    const r = await programulAplicatiei(x.doc, m);
    if (r.ok !== x.ok) rele.push(`${x.nume}: ${r.ok ? 'trece' : `refuzat (${r.motiv})`}`);
    if (!r.ok) { if (!r.motiv.trim()) rele.push(`${x.nume}: refuz fără motiv`); console.log(`  ${x.nume}: ${r.motiv}`); }
    else {
      const v = poarta(r.text, ctxDe({ ...baza, doc: x.doc }, m));
      if (v.length) rele.push(`${x.nume}: ${mesaje(v.slice(0, 3))}`);
      // Poarta prezice refuzul acolo unde trebuia (controlul ei, pe programul care există).
      if (refuzPrezis(x.doc)) rele.push(`${x.nume}: oracolul prezice refuz`);
    }
  }
  assert.deepEqual(rele, []);
});

const FARA_RAMPA = [7, 8] as const;
const faraRampa = (c: CazIR): CazIR => {
  const doc = structuredClone(c.doc);
  for (const p of doc.piese) for (const o of p.operatii) o.rampa = null;
  return { ...c, doc };
};
/** Cazul ADR 0030 echivalent (scriitorul `programIntrari`), cu lead-ul dat. */
const caz0030 = (c: CazIR, a: AsteptatH) => ({ ...CAZURI_INTRARI[0]!, nume: c.nume, stoc: c.stoc, forme: c.forme, adancime: c.adancime, raza: c.raza, urechi: c.urechi, asteptat: { c: a }, doc: faraRampa(c).doc });
let MARTORI_FARA_RAMPA = 0;

/** Hârtia fără rampă: p₀, C, ρ (ADR 0030, `comparaIntrarea`) pe trecerile cu intrare, plus punțile urechilor. */
function hartieFaraRampa(c: CazIR, text: string, m: Montaj): string[] {
  const rele: string[] = [];
  const a = c.asteptat['c'] ?? null;
  const masuri = masoaraIntrari(text, (q) => laDocument(q, m));
  for (const x of masuri) for (const r of comparaIntrarea(x, a ? { p0: a.p0, C: a.C, rho: a.rho, parte: a.parte, A: a.A, B: a.B } : null)) rele.push(r);
  const v0 = a ? undefined : masuri[0]?.p0 ?? undefined;
  rele.push(...punti(c, text, m, v0 ?? undefined));
  return rele;
}

test('(o) precizarea din 10.10, fără rampă: scriitorul ADR 0030 cu alegerea precizată trece poarta și hârtia (punțile întregi); intrarea care ignoră urechile buclei înseși e prinsă de 12 și de punți', () => {
  const rele: string[] = [];
  for (const ci of FARA_RAMPA) {
    const c = CAZURI_IR[ci]!;
    const f = faraRampa(c);
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[5]!]) {
      const bun = c.asteptat['c'] ? programIntrari(caz0030(c, c.asteptat['c']!), m) : programIntrari({ ...caz0030(c, null as unknown as AsteptatH), asteptat: { c: null } }, m);
      const v = poarta(bun, ctxDe(f, m));
      if (v.length) rele.push(`${c.nume} (${descrieM(m)}): ${mesaje(v.slice(0, 3))}`);
      for (const r of hartieFaraRampa(f, bun, m)) rele.push(`${c.nume} (${descrieM(m)}): ${r}`);
      const rau = programIntrari(caz0030(c, FARA_URECHI_PROPRII[ci]!), m);
      const vr = poarta(rau, ctxDe(f, m));
      if (!vr.some((i) => i.invarianta === 12 && /urechile proprii/.test(i.mesaj))) rele.push(`${c.nume}: martorul fără condiție nu e prins de 12: ${mesaje(vr.slice(0, 3))}`);
      if (!punti(f, rau, m, c.asteptat['c'] ? undefined : FARA_URECHI_PROPRII[ci]!.p0).length) rele.push(`${c.nume}: martorul fără condiție lasă punțile întregi`);
    }
  }
  tabelMartori.push(`scriitorul | precizarea din 10.10, fără rampă: intrarea care ignoră urechile buclei înseși | 2 cazuri × 2 montaje | poarta: 12 | punțile: tăiate`);
  MARTORI_FARA_RAMPA++;
  assert.deepEqual(rele, []);
});

for (const ci of FARA_RAMPA) {
  const c = CAZURI_IR[ci]!;
  test(`lipire: fără rampă, ${c.nume}: programul aplicației, pe 8 montaje, trece poarta, p₀ / ρ sau omisiunea sunt cele de pe hârtie, iar punțile urechilor rămân întregi`, async () => {
    assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
    const f = faraRampa(c);
    const rele: string[] = [];
    for (const m of montaje(c.stoc)) {
      const r = await programulAplicatiei(f.doc, m);
      if (!r.ok) { rele.push(`${descrieM(m)}: refuz: ${r.motiv}`); continue; }
      const v = poarta(r.text, ctxDe(f, m));
      if (v.length) rele.push(`${descrieM(m)}: ${mesaje(v.slice(0, 3))}`);
      for (const x of hartieFaraRampa(f, r.text, m)) rele.push(`${descrieM(m)}: ${x}`);
      const omise = c.asteptat['c'] ? 0 : 1;
      if ((r.avertismente ?? []).length !== omise) rele.push(`${descrieM(m)}: avertismentele ${JSON.stringify(r.avertismente)}`);
    }
    assert.deepEqual(rele, []);
  });
}

test('raport: tabelul martorilor negativi', () => {
  console.log(`martorii (sursa | martor | cazuri | poarta | hârtia):\n  ${tabelMartori.join('\n  ')}`);
  assert.equal(tabelMartori.length, 2 * MARTORI.length - MARTORI.filter((q) => q.doarScriitor).length + MARTORI_FARA_RAMPA);
});

