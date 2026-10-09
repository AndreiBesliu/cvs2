/**
 * Oracolul urechilor (ADR 0028), invarianta 9 amendată și invarianta 10 din poartă, judecate:
 * - pe hârtie: profilul Z(s) cu numere scrise de mână (dreptunghiul 300 × 200, 4 × 8), ℓ pe ramura 0,45·(S − W),
 *   limita W = 0,9·S, proprietățile din §3 pe profile aleatoare; perimetrele analitice ale cazurilor față de a doua cale
 *   (primitivele traseului din `regiune.ts`);
 * - pe scriitorul „cum cere contractul” (`urechi.cazuri.ts`, propria lui copie a formulelor): cele 9 cazuri pe hârtie,
 *   pe toate montajele, cu ridicare sau coborâre între treceri, trec TOATĂ poarta (1, 2, 3, 5, 6, 7, 9, 10) și hârtia
 *   (lungimile pe palier / flanc / adâncime plină, numărul palierelor, centrele față de plonjare, geometria în plan);
 * - pe martorii negativi din §6 (Z binar pe vârfuri, vârful de la adâncimea tăieturii, centrele la k·S, palierul strâns
 *   la 0,9·S, flancul pe arc scris ca o coardă): fiecare înroșește oracolul, iar testul spune cine îl prinde;
 * - invarianta 10 pe programe construite (fără urechi în document, urechi lipsă din program, trecerea d ≤ varf,
 *   legarea etichetei de a k-a operație, refuzurile de la §2, drumul deschis), cu toleranțele declarate la limită;
 * - amendamentul invariantei 9: o trecere cu urechi e o singură buclă închisă (prima redactare o rupea în drumuri
 *   deschise);
 * - precizarea din 09.10 (ADR 0028): W < D (W = D − 0,001 prins, W = D trece), avansul pe flancul care coboară (martorul
 *   cu avansul de tăiere e prins), arcul cu startul în capăt (cercul întreg al GRBL) prins de invariantele 6 și 2; plus
 *   falsul invariantei 1 de la marginea benzii (rotunjirea I / J între treceri), reparat în poartă și ținut aici;
 * - lipirea cu aplicația („lipire:”, doar pe schema 5): cele 9 cazuri prin `calculeazaExport` (supracursa 0,3 pentru
 *   ultimul; fără ea, refuz), refuzurile cu motiv (W > 0,9·S, g ≥ grosimea foii, adâncimea ≤ vârf) cu controalele lor
 *   chiar lângă limită, corpusul 2.3a / 2.3b cu urechi la întâmplare (invariantele 1, 2, 9, 10 pe fiecare program),
 *   octeții identici între un document v4 și același document v5 cu `urechi: null` (și amprentele plăcii 1).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { citeste } from '../oracles/gcode.ts';
import { laDocument, poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import { migreazaV4V5O, type DocV5O, type OperatieV5O, type UrechiO } from '../oracles/document.ts';
import { citesteEticheta, regiuneDinDocument, verificaEticheta, type Regiune } from '../oracles/regiune.ts';
import { buclele, bucleleInainteDe0028, verificaSensul, type EtichetaActiva } from '../oracles/sens.ts';
import {
  asteptatPeHartie, comparaCuHartia, masoara, peDrum, perimetruPrimitive, profil, rupturi, TOL_CUMULAT, tolS, treceri,
  urechileEtichetelor, zProfil,
} from '../oracles/urechi.ts';
import {
  CAZURI_URECHI, corpusUrechi, docUrechi, drumAnalitic, drumCerut, programCaz, programUrechi, varfHartie, type CazUrechi,
  type FormaUrechi, type TraseuUrechi,
} from '../oracles/urechi.cazuri.ts';
import { aleator, drept, PLACA_1, type Montaj, type Stoc } from '../oracles/regiune.cazuri.ts';
import { docPlaca1, STOC_PLACA } from '../oracles/sens.cazuri.ts';
import { programulAplicatiei, schemaAplicatiei } from './ajutor-lipire.ts';

/** Avansul de plonjare al regimului implicit (plonjarea e `G1 Z… F300.0`), pentru verificarea vitezei pe verticală. */
const AVANS_PLONJARE = 300;
const SCHEMA = await schemaAplicatiei();
const LIPIRE = SCHEMA === 5 ? false : `aplicația e pe schema ${SCHEMA}; lipirea urechilor cere documentul v5 (ADR 0028)`;

const egal = (a: number, b: number, mesaj = '', tol = 1e-9): void => assert.ok(Math.abs(a - b) <= tol, `${mesaj}: ${a} ≠ ${b}`);
const mesaje = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n');
const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
const montaje = (foaie: Stoc): Montaj[] => COLTURI.flatMap((origine) => (['sus', 'jos'] as const).map((z0) => ({ foaie, origine, z0 })));
const u = (numar: number, latime: number, grosime: number): UrechiO => ({ numar, latime, grosime });
const descrieM = (m: Montaj): string => `${m.origine}, Z0 ${m.z0}`;

/** Contextul porții pentru un caz (foaia, pasul, supracursa și regiunea din documentul lui). */
function ctxCaz(c: CazUrechi, m: Montaj, doc: DocV5O = c.doc): ContextPoarta {
  return {
    foaie: c.stoc, origine: m.origine, z0: m.z0, diametruScula: c.diametru, pas: c.pas, supracursa: c.supracursa, asteptareAx: 3,
    regiune: regiuneDinDocument(doc), avansPlonjare: AVANS_PLONJARE,
  };
}

/** Documentul unui caz cu alte urechi (aceeași formă, adâncime, pas). */
const cuUrechi = (c: CazUrechi, urechi: UrechiO | null): DocV5O => docUrechi(c.stoc, [c.forma], { diametru: c.diametru, adancime: c.adancime, pas: c.pas, urechi });

/**
 * Hârtia pe un program al unui caz: fiecare trecere care traversează urechile (d > varf de pe hârtie) are zonele,
 * centrele și lungimea cerute de perimetrul ANALITIC; fiecare trecere stă pe traseul analitic; o trecere sub vârf are Z
 * constant. Controale: cel puțin o trecere traversează; ultima trecere e la adâncimea operației; fiecare are lungimea P.
 */
function hartie(c: CazUrechi, text: string, m: Montaj, urechi: UrechiO = c.urechi): { rele: string[]; traverseaza: number; treceri: number } {
  const varf = varfHartie(c);
  const drum = drumAnalitic(c.forma, c.diametru);
  const tr = treceri(text, (p) => laDocument(p, m));
  const rele: string[] = [];
  let traverseaza = 0;
  for (const t of tr) {
    const unde = `trecerea de la linia ${t.liniaPlonjarii} (d ${t.d})`;
    if (Math.abs(t.lungime - c.P) > TOL_CUMULAT) rele.push(`${unde}: lungimea ${t.lungime.toFixed(4)} ≠ P ${c.P.toFixed(4)}`);
    for (const r of peDrum(t, drum)) rele.push(`${unde}: ${r}`);
    if (t.d > varf + 1e-9) {
      traverseaza++;
      for (const r of comparaCuHartia(masoara(t, varf), asteptatPeHartie(c.P, urechi.numar, urechi.latime))) rele.push(`${unde}: ${r}`);
    } else {
      const z = new Set(t.bucati.flatMap((x) => [x.za, x.zb]));
      if (z.size !== 1) rele.push(`${unde}: trecere sub vârf cu Z variabil (${[...z].join(', ')})`);
    }
  }
  if (tr.length === 0) rele.push('nicio trecere');
  else if (Math.abs(tr[tr.length - 1]!.d - c.adancime) > 0.0005) rele.push(`ultima trecere la ${tr[tr.length - 1]!.d}, nu la ${c.adancime}`);
  if (traverseaza === 0) rele.push('nicio trecere nu traversează urechile (fixtura n-ar proba nimic)');
  return { rele, traverseaza, treceri: tr.length };
}

/** Etichetele programului, ca în poartă: valide (ale unei tăieturi din document, singure pe linie) sau null. */
function eticheteleProgramului(text: string, reg: Regiune): EtichetaActiva[] {
  return citeste(text).comentarii.flatMap((c) => {
    const et = citesteEticheta(c.text);
    if (et === null) return [];
    return [{ linia: c.linia, eticheta: et !== 'stricata' && c.singur && !verificaEticheta(reg, et) ? et : null }];
  });
}

// ── (o) Profilul pe hârtie ──────────────────────────────────────────────────────────────────────────────────────────

test('(o) profilul pe hârtie: dreptunghiul 300 × 200, Ø6, 4 × 8: P = 1000 + 6π, S = P / 4, centrele la (k + ½)·S, h = ℓ = 4', () => {
  // P = 2·(306 + 206) − 8·3 + 2π·3 = 1000 + 18.84955592153876 = 1018.8495559215388; S = 254.7123889803847.
  const pr = profil(1018.8495559215388, { numar: 4, latime: 8 }, 1.5, 3)!;
  egal(pr.S, 254.7123889803847, 'S');
  egal(pr.h, 4, 'h');
  egal(pr.l, 4, 'ℓ = min(4; 0,45·246,71)');
  [127.35619449019235, 382.06858347057704, 636.7809724509617, 891.4933614313464].forEach((c, k) => egal(pr.centre[k]!, c, `c${k}`, 1e-9));
  egal(zProfil(pr, 0), -3, 'Z(0): plonjarea, la adâncime plină');
  egal(zProfil(pr, 127.35619449019235), -1.5, 'Z(c0)');
  egal(zProfil(pr, 127.35619449019235 + 4), -1.5, 'Z(c0 + h): capătul palierului');
  egal(zProfil(pr, 127.35619449019235 - 6), -2.25, 'Z(c0 − h − ℓ/2): mijlocul flancului');
  egal(zProfil(pr, 127.35619449019235 + 8), -3, 'Z(c0 + h + ℓ)');
  egal(zProfil(pr, 254.7123889803847), -3, 'Z(S): între urechi');
  // Rupturile primei urechi: c0 − 8, c0 − 4, c0 + 4, c0 + 8.
  [119.35619449019235, 123.35619449019235, 131.35619449019235, 135.35619449019235].forEach((q, k) => egal(rupturi(pr)[k]!, q, `ruptura ${k}`, 1e-9));
});

test('(o) profilul: ℓ = 0,45·(S − W) când urechile sunt dese; W = 0,9·S încape (ℓ = 0,045·S), peste e refuz', () => {
  const a = profil(100, { numar: 10, latime: 8 }, 1, 2)!;
  egal(a.S, 10, 'S');
  egal(a.l, 0.9, 'ℓ = 0,45·(10 − 8)');
  const b = profil(100, { numar: 10, latime: 9 }, 1, 2)!;
  egal(b.l, 0.45, 'ℓ la W = 0,9·S');
  assert.equal(profil(100, { numar: 10, latime: 9 + 1e-9 }, 1, 2), null, 'W > 0,9·S');
  assert.equal(profil(1018.8495559215388, { numar: 100, latime: 10 }, 1.5, 3), null, '100 × 10 pe dreptunghiul 300 × 200 (0,9·S = 9,17)');
});

test('(o) proprietățile §3 pe 3000 de profile aleatoare și pe toate cazurile: h + ℓ ≤ 0,495·S; Z(0) = −d; rupturile în (0, P), crescătoare; 10 % din S rămâne la adâncime plină', () => {
  const r = aleator(0x24e1);
  const profile = CAZURI_URECHI.map((c) => profil(c.P, c.urechi, varfHartie(c), c.adancime)!);
  for (let k = 0; k < 3000; k++) {
    const P = 1 + r() * 5000, n = 1 + Math.floor(r() * 100);
    const W = (P / n) * 0.9 * (k % 7 === 0 ? 1 : r());
    if (!(W > 0)) continue;
    profile.push(profil(P, { numar: n, latime: W }, 1, 2)!);
  }
  for (const pr of profile) {
    assert.ok(pr, 'încape');
    assert.ok(pr.h + pr.l <= 0.495 * pr.S * (1 + 1e-12), `h + ℓ = ${pr.h + pr.l}, S = ${pr.S}`);
    assert.equal(zProfil(pr, 0), -pr.d);
    const q = rupturi(pr);
    assert.ok(q[0]! > 0 && q[q.length - 1]! < pr.P, `rupturile ${q[0]} … ${q[q.length - 1]} în (0, ${pr.P})`);
    for (let i = 1; i < q.length; i++) assert.ok(q[i]! >= q[i - 1]!, 'crescătoare');
    for (let i = 0; i + 1 < pr.centre.length; i++) assert.ok(pr.centre[i + 1]! - pr.centre[i]! - 2 * (pr.h + pr.l) >= 0.01 * pr.S - 1e-9);
  }
  assert.ok(profile.length > 2500);
});

test('(o) perimetrele cazurilor, scrise pe hârtie, sunt perimetrele traseului analitic (a doua cale: primitivele din regiune.ts)', () => {
  for (const c of CAZURI_URECHI) egal(perimetruPrimitive(drumAnalitic(c.forma, c.diametru)), c.P, c.nume, 1e-9);
  // De mână: 1000 + 6π, 680 + 86π (ușa), 206π (cercul), 1400 + 6π (raftul), 94π (gaura), 320 + 26π (placa 2).
  const P = CAZURI_URECHI.map((c) => c.P);
  [1018.8495559215388, 1018.8495559215388, 950.1769682087222, 647.1680866394973, 1418.8495559215387, 1018.8495559215388,
    295.3097094374406, 401.6814089933346, 1018.8495559215388].forEach((v, k) => egal(P[k]!, v, CAZURI_URECHI[k]!.nume, 1e-9));
  assert.equal(CAZURI_URECHI.length, 9);
});

// ── (o) Scriitorul „cum cere contractul”: poarta întreagă și hârtia ─────────────────────────────────────────────────

test('(o) scriitorul cum cere contractul: cele 9 cazuri pe 8 montaje (ridicare), pe 2 (coborâre) și cu alte porniri trec toată poarta și hârtia', () => {
  let programe = 0, traverseaza = 0, treceriTot = 0;
  const rele: string[] = [];
  for (const c of CAZURI_URECHI) {
    const ms = montaje(c.stoc);
    const variante: Array<{ m: Montaj; intre: 'ridica' | 'coboara'; pornire: number }> = [
      ...ms.map((m) => ({ m, intre: 'ridica' as const, pornire: 0 })),
      { m: ms[0]!, intre: 'coboara', pornire: 0 }, { m: ms[5]!, intre: 'coboara', pornire: 0 },
      { m: ms[2]!, intre: 'ridica', pornire: 3 },
    ];
    for (const { m, intre, pornire } of variante) {
      const text = programCaz(c, m, { intre, pornire });
      const unde = `${c.nume} (${descrieM(m)}, ${intre}, pornirea ${pornire})`;
      const v = poarta(text, ctxCaz(c, m));
      if (v.length) rele.push(`${unde}:\n${mesaje(v.slice(0, 4))}`);
      const h = hartie(c, text, m);
      if (h.rele.length) rele.push(`${unde}: ${h.rele.slice(0, 4).join('; ')}`);
      programe++;
      traverseaza += h.traverseaza;
      treceriTot += h.treceri;
    }
  }
  assert.deepEqual(rele, []);
  assert.equal(programe, 99);
  // Pe 3 mm (pasul 1, vârful 1,5): trecerile 2 și 3 traversează; la placa 2 și la supracursă, doar ultima.
  assert.equal(traverseaza, 11 * (7 * 2 + 2 * 1));
  assert.equal(treceriTot, 99 * 3);
});

// ── (o) Martorii negativi (ADR 0028 §6) ─────────────────────────────────────────────────────────────────────────────

type Verdict = { readonly invariante: readonly number[]; readonly hartie: number };

/** Poarta (cu documentul dat) și hârtia (cu urechile date) pe un program al unui caz, pe montajul stânga-jos, Z0 sus. */
function judeca(c: CazUrechi, text: string, doc: DocV5O, urechi: UrechiO, m: Montaj = montaje(c.stoc)[0]!): Verdict {
  const v = poarta(text, ctxCaz(c, m, doc));
  return { invariante: [...new Set(v.map((x) => x.invarianta))].sort((a, b) => a - b), hartie: hartie(c, text, m, urechi).rele.length };
}
const rosu = (v: Verdict): boolean => v.invariante.length > 0 || v.hartie > 0;
/** Tabelul martorilor, scris la sfârșitul fișierului (raportul). */
const tabelMartori: string[] = [];

test('(o) martorul „Z binar pe vârfuri” (forma de dinainte de 24.09): roșu pe toate cele 9 cazuri, prin invarianta 10 și prin hârtie', () => {
  for (const c of CAZURI_URECHI) {
    const v = judeca(c, programCaz(c, montaje(c.stoc)[0]!, { martor: 'binar' }), c.doc, c.urechi);
    tabelMartori.push(`binar | ${c.nume} | poarta [${v.invariante.join(', ')}] | hârtia ${v.hartie}`);
    assert.ok(v.invariante.includes(10) && v.hartie > 0, `${c.nume}: ${JSON.stringify(v)}`);
  }
});

test('(o) martorul „vârful de la adâncimea tăieturii”: roșu unde adâncimea ≠ grosimea foii (supracursa; 17 pe foaia 18); unde sunt egale, programul e chiar cel bun', () => {
  const peFoaie18 = { ...CAZURI_URECHI[8]!, nume: 'adâncimea 17 pe foaia 18, g = 2 (vârful 16, nu 15)', adancime: 17, pas: 5.7, supracursa: 0 };
  const caz17: CazUrechi = { ...peFoaie18, doc: cuUrechi(peFoaie18 as CazUrechi, peFoaie18.urechi) };
  for (const c of [...CAZURI_URECHI, caz17]) {
    const m = montaje(c.stoc)[0]!;
    const rau = programCaz(c, m, { martor: 'varf-din-adancime' });
    if (c.adancime === c.stoc.grosime) {
      assert.equal(rau, programCaz(c, m), `${c.nume}: același vârf, același program`);
      continue;
    }
    const v = judeca(c, rau, c.doc, c.urechi);
    tabelMartori.push(`varf-din-adancime | ${c.nume} | poarta [${v.invariante.join(', ')}] | hârtia ${v.hartie}`);
    assert.ok(v.invariante.includes(10) && v.hartie > 0, `${c.nume}: ${JSON.stringify(v)}`);
  }
  assert.ok(tabelMartori.some((x) => x.startsWith('varf-din-adancime | supracursa')));
});

test('(o) martorul „centrele la k·S” (o ureche pe plonjare): roșu pe toate cele 9 cazuri, prin invarianta 10 și prin hârtie', () => {
  for (const c of CAZURI_URECHI) {
    const v = judeca(c, programCaz(c, montaje(c.stoc)[0]!, { martor: 'centre-k-s' }), c.doc, c.urechi);
    tabelMartori.push(`centre-k-s | ${c.nume} | poarta [${v.invariante.join(', ')}] | hârtia ${v.hartie}`);
    assert.ok(v.invariante.includes(10) && v.hartie > 0, `${c.nume}: ${JSON.stringify(v)}`);
  }
});

test('(o) martorul „palierul strâns la 0,9·S în loc de refuz” (100 de urechi cu W = 0,9·S + 0,5): roșu pe toate cele 9 cazuri (invarianta 10: nu încap)', () => {
  for (const c of CAZURI_URECHI) {
    const prea: UrechiO = u(100, Math.round((0.9 * c.P / 100 + 0.5) * 1000) / 1000, c.urechi.grosime);
    assert.throws(() => programCaz(c, montaje(c.stoc)[0]!, { urechi: prea }), /nu încap/, 'scriitorul bun refuză');
    const text = programCaz(c, montaje(c.stoc)[0]!, { martor: 'strangere', urechi: prea });
    const v = judeca(c, text, cuUrechi(c, prea), prea);
    const n = poarta(text, ctxCaz(c, montaje(c.stoc)[0]!, cuUrechi(c, prea))).filter((x) => x.invarianta === 10 && /nu încap/.test(x.mesaj)).length;
    tabelMartori.push(`strangere | ${c.nume} | poarta [${v.invariante.join(', ')}] (${n} bucle „nu încap”) | hârtia ${v.hartie}`);
    assert.ok(n > 0 && v.hartie > 0, `${c.nume}: ${JSON.stringify(v)}`);
  }
});

test('(o) martorul „flancul pe arc scris ca o coardă”: pe fiecare caz cu un flanc pe arc (la o pornire care îl pune acolo: cercul, gaura, ușa), roșu prin hârtie; pe exterior și prin invarianta 2', () => {
  const muscate: string[] = [];
  for (const c of CAZURI_URECHI) {
    const m = montaje(c.stoc)[0]!;
    const n = drumCerut(c.forma, c.diametru).length;
    const porniri = n === 1 ? [0, 0.7] : Array.from({ length: n }, (_, k) => k);
    const p = porniri.find((x) => programCaz(c, m, { martor: 'coarda', pornire: x }) !== programCaz(c, m, { pornire: x }));
    if (p === undefined) { tabelMartori.push(`coarda | ${c.nume} | niciun flanc pe arc la nicio pornire (doar drepte)`); continue; }
    const v = judeca(c, programCaz(c, m, { martor: 'coarda', pornire: p }), c.doc, c.urechi);
    tabelMartori.push(`coarda | ${c.nume} (pornirea ${p}) | poarta [${v.invariante.join(', ')}] | hârtia ${v.hartie}`);
    assert.ok(v.hartie > 0, `${c.nume}: hârtia nu vede coarda`);
    if (c.forma.latura === 'exterior') assert.ok(v.invariante.includes(2), `${c.nume}: invarianta 2 nu vede coarda pe exterior`);
    muscate.push(c.nume);
  }
  // Pe dreptunghiuri (colțurile R3), pe raft și pe placa 2, nicio pornire dintr-un vârf nu pune un flanc pe arc.
  assert.ok(['cercul R100', 'gaura R50', 'ușa'].every((n) => muscate.some((x) => x.startsWith(n))), muscate.join('; '));
});

// ── (o) Invarianta 10 pe programe construite ────────────────────────────────────────────────────────────────────────

/** Pătratul 40 × 40 la (50, 50), exterior, pe foaia de 3 mm; freza Ø6, adâncimea 3, pasul 1; P = 160 + 6π. */
const STOC_Q: Stoc = { latime: 200, inaltime: 200, grosime: 3 };
const FQ: FormaUrechi = { id: 'q', forma: drept(40, 40), x: 50, y: 50, latura: 'exterior' };
const MQ: Montaj = { foaie: STOC_Q, origine: 'stanga-jos', z0: 'sus' };
const ETQ = 'q/q: dreptunghi, exterior, 3 mm';
const docQ = (urechi: UrechiO | null, adancime = 3, stoc: Stoc = STOC_Q): DocV5O => docUrechi(stoc, [FQ], { diametru: 6, adancime, pas: 1, urechi });
const traseuQ = (urechi: UrechiO | null, o: Partial<TraseuUrechi> = {}): TraseuUrechi => ({
  eticheta: ETQ, drum: drumCerut(FQ, 6), adancime: 3, pas: 1, grosimeFoaie: 3, urechi, ...o,
});
const ctxQ = (doc: DocV5O, stoc: Stoc = STOC_Q): ContextPoarta => ({
  foaie: stoc, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 1, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(doc),
  avansPlonjare: AVANS_PLONJARE,
});
const inv10 = (text: string, doc: DocV5O, stoc: Stoc = STOC_Q): Incalcare[] => poarta(text, ctxQ(doc, stoc)).filter((i) => i.invarianta === 10);
const U2 = u(2, 6, 1.5);

test('(o) invarianta 10: programul cerut trece toată poarta; fără urechi în document, urechile din program sunt prinse; cu urechi în document, lipsa lor e prinsă', () => {
  const bun = programUrechi([traseuQ(U2)], MQ);
  assert.deepEqual(poarta(bun, ctxQ(docQ(U2))), []);
  const faraInDoc = inv10(bun, docQ(null));
  assert.ok(faraInDoc.length === 2 && faraInDoc.every((i) => /fără urechi.*Z variabil/.test(i.mesaj)), mesaje(faraInDoc));
  const faraInProgram = inv10(programUrechi([traseuQ(null)], MQ), docQ(U2));
  // Trecerile 2 și 3 (d > 1,5) trebuiau să urce pe palier.
  assert.ok(faraInProgram.length === 2 && faraInProgram.every((i) => /profilul cere -1\.50\d…-1\.50\d/.test(i.mesaj)), mesaje(faraInProgram));
  assert.deepEqual(poarta(programUrechi([traseuQ(null)], MQ), ctxQ(docQ(null))), []);
});

test('(o) invarianta 10: pe o trecere cu d ≤ varf, Z constant (urechile scrise cu vârful din foaia de 2 mm, pe foaia de 3, urcă și trecerea 1)', () => {
  const v = inv10(programUrechi([traseuQ(U2, { grosimeFoaie: 2 })], MQ), docQ(U2));
  assert.ok(v.some((i) => /trecerea de 1\.000 mm nu ajunge la vârful urechii \(1\.500 mm\).*Z variabil/.test(i.mesaj)), mesaje(v));
  // Pe aceeași foaie cu vârful de 0,5 (g = 2,5), trecerea 1 urcă pe drept: același program trece.
  assert.deepEqual(inv10(programUrechi([traseuQ(u(2, 6, 2.5))], MQ), docQ(u(2, 6, 2.5))), []);
});

test('(o) invarianta 10: legarea etichetei de a k-a operație (degroșare fără urechi, apoi finisare cu urechi, aceeași adâncime); invers e prins', () => {
  const doc = docQ(null);
  const op0 = doc.piese[0]!.operatii[0]!;
  doc.piese[0]!.operatii.push({ ...structuredClone(op0), id: 'op2', urechi: U2 } as OperatieV5O);
  const drept_ = programUrechi([traseuQ(null), traseuQ(U2)], MQ);
  assert.deepEqual(poarta(drept_, ctxQ(doc)).filter((i) => i.invarianta === 10 || i.invarianta === 9 || i.invarianta === 2), []);
  const invers = inv10(programUrechi([traseuQ(U2), traseuQ(null)], MQ), doc);
  assert.equal(invers.length, 4, mesaje(invers));
  // A treia apariție a etichetei nu mai are operație: e ambiguă.
  const trei = inv10(programUrechi([traseuQ(null), traseuQ(U2), traseuQ(U2)], MQ), doc);
  assert.ok(trei.some((i) => /urechi diferite, iar eticheta apare de 3 ori/.test(i.mesaj)), mesaje(trei));
  // Legarea, citită direct: null, apoi urechile.
  const et = eticheteleProgramului(drept_, regiuneDinDocument(doc));
  assert.deepEqual(urechileEtichetelor(et, regiuneDinDocument(doc)).map((x) => (x && 'urechi' in x ? x.urechi : x)), [null, U2]);
});

test('(o) invarianta 10: refuzurile §2 pe eticheta tăieturii: puntea ≥ grosimea foii; adâncimea ≤ vârf', () => {
  const g3 = inv10(programUrechi([traseuQ(null)], MQ), docQ(u(2, 6, 3)));
  assert.ok(g3.some((i) => i.linia === 7 && /puntea de 3 mm nu e sub grosimea foii \(3 mm\): exportul trebuia refuzat/.test(i.mesaj)), mesaje(g3));
  const g35 = inv10(programUrechi([traseuQ(null)], MQ), docQ(u(2, 6, 3.5)));
  assert.ok(g35.some((i) => /puntea de 3\.5 mm/.test(i.mesaj)), mesaje(g35));
  const adanc = inv10(programUrechi([traseuQ(null, { adancime: 2 })], MQ).replace(ETQ, 'q/q: dreptunghi, exterior, 2 mm'), docQ(u(2, 6, 1), 2));
  assert.ok(adanc.some((i) => /adâncimea 2 mm nu trece de vârful urechii \(2\.000 mm\)/.test(i.mesaj)), mesaje(adanc));
  // Controlul, chiar lângă limită: adâncimea 2,1 cu vârful 2 trece (o singură trecere traversează, flancul de 0,1).
  const ok = programUrechi([traseuQ(u(2, 6, 1), { adancime: 2.1, pas: 0.7 })], MQ).replace(ETQ, 'q/q: dreptunghi, exterior, 2.1 mm');
  const d21 = docUrechi(STOC_Q, [FQ], { diametru: 6, adancime: 2.1, pas: 0.7, urechi: u(2, 6, 1) });
  assert.deepEqual(poarta(ok, { ...ctxQ(d21), pas: 0.7 }), []);
});

test('(o) invarianta 10: un drum deschis cu Z variabil e prins; urechile care nu încap (W > 0,9·S) sunt prinse', () => {
  const linii = programUrechi([traseuQ(U2)], MQ).split('\n');
  // Ultima mișcare a trecerii 3 (înaintea ridicării finale) scoasă: bucla nu se mai închide.
  const k = linii.lastIndexOf('G0 Z5.000');
  linii.splice(k - 1, 1);
  const v = inv10(linii.join('\n'), docQ(U2));
  assert.ok(v.some((i) => /drumul deschis.*Z variabil/.test(i.mesaj)), mesaje(v));
  // P = 160 + 6π = 178.85; 8 urechi: S = 22.36, 0,9·S = 20.12. W = 20 încape, W = 21 nu.
  assert.deepEqual(inv10(programUrechi([traseuQ(u(8, 20, 1.5))], MQ), docQ(u(8, 20, 1.5))), []);
  const prea = inv10(programUrechi([traseuQ(u(8, 21, 1.5), { martor: 'strangere' })], MQ), docQ(u(8, 21, 1.5)));
  assert.ok(prea.length === 2 && prea.every((i) => /nu încap.*W 21 > 0,9·S/.test(i.mesaj)), mesaje(prea));
});

test('(o) toleranțele invariantei 10, la limită: Z ±0,002; centrele mutate cu 0,02 pe o buclă cu un tur de arce (tolS = 0,028) trec, cu 0,06 nu; fără arce (tolS = 0,0015), 0,005 trece, 0,02 nu', () => {
  const doc = docQ(U2);
  const T = tolS(buclele(citeste(programUrechi([traseuQ(U2)], MQ)).evenimente, [7], (p) => p).find((b) => b.zMin < -1.9)!);
  egal(T, 0.0015 + 0.0042 * 2 * Math.PI, 'tolS pe pătratul cu colțuri R3', 1e-9);
  assert.deepEqual(inv10(programUrechi([traseuQ(U2, { abatere: { palier: 0.001 } })], MQ), doc), [], 'palierul cu 0,001 mai sus');
  assert.equal(inv10(programUrechi([traseuQ(U2, { abatere: { palier: 0.004 } })], MQ), doc).length, 2, 'palierul cu 0,004 mai sus');
  assert.deepEqual(inv10(programUrechi([traseuQ(U2, { abatere: { centre: 0.02 } })], MQ), doc), [], 'centrele cu 0,02');
  assert.equal(inv10(programUrechi([traseuQ(U2, { abatere: { centre: 0.06 } })], MQ), doc).length, 2, 'centrele cu 0,06');
  // Pe-linie pe un dreptunghi cu colțuri ascuțite: bucla n-are arce.
  const FL: FormaUrechi = { id: 'l', forma: drept(40, 40), x: 50, y: 50, latura: 'pe-linie' };
  const docL = docUrechi(STOC_Q, [FL], { diametru: 6, adancime: 3, pas: 1, urechi: U2 });
  const progL = (centre: number): string => programUrechi([{
    eticheta: 'l/l: dreptunghi, pe-linie, 3 mm', drum: drumCerut(FL, 6), adancime: 3, pas: 1, grosimeFoaie: 3, urechi: U2, abatere: { centre },
  }], MQ);
  assert.deepEqual(poarta(progL(0), ctxQ(docL)), []);
  // Rezoluția efectivă pe s e tolS + TOL_Z / pantă (panta flancului: (d − varf) / ℓ = 0,5 la trecerea 3): 0,0015 + 0,004.
  assert.deepEqual(inv10(progL(0.001), docL), [], 'pe-linie, centrele cu 0,001');
  assert.deepEqual(inv10(progL(0.005), docL), [], 'pe-linie, centrele cu 0,005 (sub rezoluția 0,0055)');
  assert.equal(inv10(progL(0.02), docL).length, 2, 'pe-linie, centrele cu 0,02');
});

test('(o) precizarea din 09.10, W < D: W = D − 0,001 e prins pe eticheta tăieturii, W = D trece (freza Ø6)', () => {
  const sub = inv10(programUrechi([traseuQ(u(2, 5.999, 1.5))], MQ), docQ(u(2, 5.999, 1.5)));
  assert.ok(sub.length === 1 && sub[0]!.linia === 7 && /W 5\.999 mm e sub diametrul frezei \(6 mm\)/.test(sub[0]!.mesaj), mesaje(sub));
  assert.deepEqual(poarta(programUrechi([traseuQ(u(2, 6, 1.5))], MQ), ctxQ(docQ(u(2, 6, 1.5)))), []);
});

test('(o) precizarea din 09.10, avansul: flancul care coboară cu avansul de tăiere (martorul de dinainte) e prins; cu F = min(1000, 300·L₃ / |ΔZ|) trece; o plonjare la F1000 e prinsă', () => {
  const bun = programUrechi([traseuQ(U2)], MQ);
  assert.ok(bun.split('\n').some((l) => / Z-3\.000 F(?!1000\.0)\d+\.\d$/.test(l)), 'scriitorul pune avansul pe flancul care coboară');
  assert.deepEqual(inv10(bun, docQ(U2)), []);
  const rapid = inv10(programUrechi([traseuQ(U2, { avansFlanc: false })], MQ), docQ(U2));
  // Pe hârtie: flancul de 3 mm cu ΔZ 0,5 (trecerea 2) sau 1,5 (trecerea 3), la F1000: 1000·0,5 / √(9 + 0,25) = 164,4 (sub 300),
  // 1000·1,5 / √(9 + 2,25) = 447,2 (peste): doar trecerea 3, câte un flanc pe ureche, 2 urechi.
  // Flancul care trece peste colț e tăiat în două bucăți (dreapta + arcul R3): aceeași pantă, deci aceeași viteză.
  assert.ok(rapid.length >= 2, mesaje(rapid));
  assert.ok(rapid.every((i) => /coboară cu 447\.[12] mm\/min pe verticală/.test(i.mesaj)), mesaje(rapid));
  const plonjare = inv10(bun.replace('G1 Z-1.000 F300.0', 'G1 Z-1.000 F1000.0'), docQ(U2));
  assert.ok(plonjare.length === 1 && /coboară cu 1000\.0/.test(plonjare[0]!.mesaj), mesaje(plonjare));
  // Fără avansPlonjare în context, verificarea nu rulează (testele vechi ale porții n-o cer).
  const { avansPlonjare: _, ...faraAvans } = ctxQ(docQ(U2));
  assert.deepEqual(poarta(programUrechi([traseuQ(U2, { avansFlanc: false })], MQ), faraAvans).filter((i) => i.invarianta === 10), []);
});

test('(o) precizarea din 09.10, bucățile sub 1e-6: un arc cu startul în capăt (GRBL îl citește ca cercul întreg) e prins de poartă (6, 2) și de hârtie', () => {
  const c = CAZURI_URECHI[2]!;
  const m = montaje(c.stoc)[0]!;
  const text = programCaz(c, m);
  const arc = citeste(text).evenimente.flatMap((e) => (e.tip === 'mutare' && e.m.cod === 2 && e.m.a[2] < -2.5 ? [e.m] : []))[0]!;
  const cx = arc.a[0] + arc.i!, cy = arc.a[1] + arc.j!;
  const f = (v: number): string => v.toFixed(3);
  const linii = text.split('\n');
  linii.splice(arc.linia, 0, `G2 X${f(arc.b[0])} Y${f(arc.b[1])} I${f(cx - arc.b[0])} J${f(cy - arc.b[1])}`);
  const rau = linii.join('\n');
  const v = poarta(rau, ctxCaz(c, m));
  assert.ok(v.some((i) => i.invarianta === 6 && /arc de 360\.0°/.test(i.mesaj)) && v.some((i) => i.invarianta === 2), mesaje(v));
  assert.ok(hartie(c, rau, m).rele.length > 0);
});

test('(o) hârtia vede un cuvânt Z care nu schimbă Z-ul (§4: o mișcare poartă Z doar dacă se schimbă); poarta nu (aceeași mișcare)', () => {
  const c = CAZURI_URECHI[0]!;
  const m = montaje(c.stoc)[0]!;
  const linii = programCaz(c, m).split('\n');
  const k = linii.findIndex((l, i) => i > 0 && linii[i - 1]!.endsWith('Z-1.500') && /^G1 X[-\d.]+ Y[-\d.]+$/.test(l));
  assert.ok(k > 0);
  linii[k] = `${linii[k]} Z-1.500`;
  const text = linii.join('\n');
  assert.deepEqual(poarta(text, ctxCaz(c, m)), []);
  assert.ok(hartie(c, text, m).rele.some((r) => /cuvânt Z fără schimbare de Z/.test(r)));
});

test('(o) invarianta 1 cu urechi: fâșia de la marginea benzii (rotunjirea I / J mută cercul cu 0,001 între treceri) nu mai e un fals; o trecere mai adâncă decât pasul e prinsă', () => {
  // Cercul Ø3,175 cu urechi din corpus (stânga-jos): semicercurile trecerii 1 au raza 22,588; bucata de arc a trecerii
  // cu urechi, cu I / J rotunjite din alt start, are raza 22,587. O celulă la r = 20,99976 era „scoasă” de la 0.
  const cap = ['G90 G17 G21 G94', 'G54', 'G0 Z5.000', 'M3 S18000', 'G4 P3.000'];
  const ctx: ContextPoarta = { foaie: { latime: 300, inaltime: 200, grosime: 12 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 3.175, pas: 2, supracursa: 0, asteptareAx: 3 };
  const program = (adancimeArc: string): string => `${[...cap, 'G0 X142.588 Y100.000', 'G1 Z-1.887 F300.0', 'G2 X97.412 Y100.000 I-22.588 J0.000 F1000.0',
    'G2 X142.588 Y100.000 I22.588 J0.000', 'G0 Z5.000', 'G0 X106.399 Y81.967', `G1 Z${adancimeArc} F300.0`, 'G2 X98.646 Y92.637 I13.601 J18.033 F1000.0',
    'G0 Z5.000', 'M5', 'M30'].join('\n')}\n`;
  assert.deepEqual(poarta(program('-3.773'), ctx), []);
  const adanc = poarta(program('-4.500'), ctx).filter((i) => i.invarianta === 1);
  assert.ok(adanc.length >= 1 && adanc.every((i) => /scoate 2\.61\d mm/.test(i.mesaj)), mesaje(adanc));
});

// ── (o) Amendamentul invariantei 9 ──────────────────────────────────────────────────────────────────────────────────

test('(o) amendamentul 9 (ADR 0028 §5): fiecare trecere cu urechi e o buclă închisă cu aria cerută; prima redactare o rupea în drumuri deschise (încălcări)', () => {
  let bucleUrechi = 0;
  for (const c of CAZURI_URECHI) {
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[7]!]) {
      const text = programCaz(c, m);
      const reg = regiuneDinDocument(c.doc);
      const { evenimente } = citeste(text);
      const et = eticheteleProgramului(text, reg);
      const laDoc = (p: readonly [number, number, number]) => laDocument(p, { foaie: c.stoc, origine: m.origine, z0: m.z0 });
      assert.deepEqual(verificaSensul(evenimente, et, reg, laDoc), [], c.nume);
      const b = buclele(evenimente, et.map((e) => e.linia), laDoc);
      assert.equal(b.length, 3, `${c.nume}: o buclă pe trecere`);
      assert.ok(b.every((x) => x.inchisa), c.nume);
      bucleUrechi += b.filter((x) => x.zMax > x.zMin).length;
      const vechi = verificaSensul(evenimente, et, reg, laDoc, bucleleInainteDe0028);
      assert.ok(vechi.length > 0 && vechi.every((x) => /nu se închide/.test(x.mesaj)), `${c.nume}: prima redactare`);
    }
  }
  assert.equal(bucleUrechi, 2 * (7 * 2 + 2));
});

// ── Lipirea cu aplicația ────────────────────────────────────────────────────────────────────────────────────────────

test('lipire: aplicația e pe schema 5 (ușa primește un v5)', { skip: LIPIRE }, () => {
  assert.equal(SCHEMA, 5);
});

for (const c of CAZURI_URECHI) {
  test(`lipire: ${c.nume}: programul aplicației, pe 8 montaje, trece toată poarta și hârtia`, { skip: LIPIRE }, async () => {
    const rele: string[] = [];
    let traverseaza = 0;
    for (const m of montaje(c.stoc)) {
      const r = await programulAplicatiei(c.doc, m, c.supracursa ? { supracursa: c.supracursa } : {});
      if (!r.ok) { rele.push(`${descrieM(m)}: aplicația refuză: ${r.motiv}`); continue; }
      const v = poarta(r.text, ctxCaz(c, m));
      if (v.length) rele.push(`${descrieM(m)}:\n${mesaje(v.slice(0, 4))}`);
      const h = hartie(c, r.text, m);
      if (h.rele.length) rele.push(`${descrieM(m)}: ${h.rele.slice(0, 4).join('; ')}`);
      traverseaza += h.traverseaza;
    }
    assert.deepEqual(rele, []);
    assert.equal(traverseaza, 8 * (c.stoc.grosime === 3 ? 2 : 1));
  });
}

test('lipire: supracursa (§2): fără parametru, 18,3 pe foaia 18 e refuzată (și cu 0,2, și cu 2,5); cu 0,3, palierul e la −16 (puntea 2,0), nu la −16,3', { skip: LIPIRE }, async () => {
  const c = CAZURI_URECHI[8]!;
  const m = montaje(c.stoc)[0]!;
  for (const o of [{}, { supracursa: 0.2 }, { supracursa: 2.5 }]) {
    const r = await programulAplicatiei(c.doc, m, o);
    assert.equal(r.ok, false, JSON.stringify(o));
    if (!r.ok) assert.ok(r.motiv.length > 0, 'refuzul n-are motiv');
  }
  const r = await programulAplicatiei(c.doc, m, { supracursa: 0.3 });
  assert.ok(r.ok);
  assert.ok(r.text.includes(' Z-16.000') && !r.text.includes('Z-16.300'), 'palierul');
  // Z0 jos: palierul e la 2,0 deasupra mesei (puntea).
  const j = await programulAplicatiei(c.doc, montaje(c.stoc)[1]!, { supracursa: 0.3 });
  assert.ok(j.ok && j.text.includes(' Z2.000') && j.text.includes('Z-0.300'), 'Z0 jos: palierul la +2, fundul la −0,3');
});

test('lipire: refuzurile §2–§3 au motiv, iar controalele chiar lângă limită trec (W față de 0,9·S; g față de foaie; adâncimea față de vârf)', { skip: LIPIRE }, async () => {
  const c = CAZURI_URECHI[0]!;
  const m = montaje(c.stoc)[0]!;
  const doc = (urechi: UrechiO, adancime = 3): DocV5O => docUrechi(c.stoc, [c.forma], { diametru: 6, adancime, pas: 1, urechi });
  // 100 de urechi pe P = 1018,85: S = 10,188, 0,9·S = 9,169.
  const cazuri: Array<{ nume: string; doc: DocV5O; ok: boolean }> = [
    { nume: 'W 9,2 > 0,9·S', doc: doc(u(100, 9.2, 1.5)), ok: false },
    { nume: 'W 9,1 ≤ 0,9·S (control)', doc: doc(u(100, 9.1, 1.5)), ok: true },
    { nume: 'g 3 = grosimea foii', doc: doc(u(4, 8, 3)), ok: false },
    { nume: 'g 3,5 > grosimea foii', doc: doc(u(4, 8, 3.5)), ok: false },
    { nume: 'g 2,9 < grosimea foii (control; vârful 0,1)', doc: doc(u(4, 8, 2.9)), ok: true },
    { nume: 'adâncimea 2 = vârful (g 1)', doc: doc(u(4, 8, 1), 2), ok: false },
    { nume: 'adâncimea 1,9 < vârful (g 1)', doc: doc(u(4, 8, 1), 1.9), ok: false },
    { nume: 'adâncimea 2,1 > vârful (control)', doc: doc(u(4, 8, 1), 2.1), ok: true },
    // Precizarea din 09.10: W < D refuzat, W = D trece (freza Ø6).
    { nume: 'W 5,999 < D 6', doc: doc(u(4, 5.999, 1.5)), ok: false },
    { nume: 'W 3 = D / 2', doc: doc(u(4, 3, 1.5)), ok: false },
    { nume: 'W 6 = D (control)', doc: doc(u(4, 6, 1.5)), ok: true },
  ];
  const rele: string[] = [];
  const motive = new Set<string>();
  for (const x of cazuri) {
    const r = await programulAplicatiei(x.doc, m);
    if (r.ok !== x.ok) rele.push(`${x.nume}: ${r.ok ? 'trece' : `refuzat (${r.motiv})`}`);
    if (!r.ok) { assert.ok(r.motiv.length > 0, `${x.nume}: refuz fără motiv`); motive.add(r.motiv); }
    if (r.ok) {
      const ctx = { ...ctxCaz(c, m, x.doc) };
      const v = poarta(r.text, ctx);
      if (v.length) rele.push(`${x.nume}: ${mesaje(v.slice(0, 3))}`);
    }
  }
  assert.deepEqual(rele, []);
  console.log(`refuzurile aplicației (motive distincte: ${motive.size}):\n  ${[...motive].join('\n  ')}`);
});

type LipitU = { readonly caz: ReturnType<typeof corpusUrechi>[number]; readonly text: string | null; readonly motiv: string | null };
let corpusLipit: Promise<LipitU[]> | null = null;
const programeCorpus = (): Promise<LipitU[]> => (corpusLipit ??= (async () => {
  const rez: LipitU[] = [];
  for (const caz of corpusUrechi()) {
    const r = await programulAplicatiei(caz.doc, { origine: caz.origine, z0: caz.z0 });
    rez.push({ caz, text: r.ok ? r.text : null, motiv: r.ok ? null : r.motiv });
  }
  return rez;
})());

test('lipire: corpusul 2.3a / 2.3b cu urechi la întâmplare (foi de 3–18 mm, toate colțurile, ambele Z0, toate laturile, ambele sensuri): orice program al aplicației trece invariantele 1, 2, 9 și 10', { skip: LIPIRE }, async () => {
  const rez = await programeCorpus();
  const rele: string[] = [];
  let programe = 0, bucleUrechi = 0;
  const laturi = new Set<string>();
  for (const x of rez) {
    if (x.text === null) continue;
    programe++;
    const stoc = x.caz.doc.foi[0]!.stoc;
    const pas = Math.max(...x.caz.doc.piese.flatMap((p) => p.operatii.map((o) => o.pas)));
    const ctx: ContextPoarta = {
      foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: x.caz.origine, z0: x.caz.z0,
      diametruScula: x.caz.diametru, pas, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(x.caz.doc), avansPlonjare: AVANS_PLONJARE,
    };
    const v = poarta(x.text, ctx).filter((i) => [1, 2, 9, 10].includes(i.invarianta));
    if (v.length) rele.push(`[${x.caz.familie}] ${x.caz.nume} (${x.caz.origine}, ${x.caz.z0}, T ${stoc.grosime}): ${mesaje(v.slice(0, 3))}`);
    // Buclele cu urechi judecate pe profil (Z variabil sub o etichetă cu urechi).
    const reg = ctx.regiune!;
    const et = eticheteleProgramului(x.text, reg);
    const ur = urechileEtichetelor(et, reg);
    const laDoc = (p: readonly [number, number, number]) => laDocument(p, ctx);
    for (const b of buclele(citeste(x.text).evenimente, et.map((e) => e.linia), laDoc)) {
      const e = ur[b.eticheta];
      if (b.inchisa && e && 'urechi' in e && e.urechi && b.zMax - b.zMin > 1e-3) {
        bucleUrechi++;
        laturi.add(`${et[b.eticheta]!.eticheta!.latura}`);
      }
    }
  }
  assert.deepEqual(rele, []);
  const refuzate = rez.filter((x) => x.text === null);
  console.log(`lipire 10: ${rez.length} cazuri, ${programe} programe, ${bucleUrechi} bucle cu urechi judecate pe profil (${[...laturi].join(', ')}), ${refuzate.length} refuzuri`);
  assert.ok(programe >= 120 && bucleUrechi >= 300 && laturi.size === 3, `${programe} programe, ${bucleUrechi} bucle cu urechi, laturile ${[...laturi].join(', ')}`);
});

test('lipire: un document v5 cu urechi null dă, octet cu octet, programul aceluiași document încărcat ca v4 (corpusul, placa 1 pe 8 montaje); amprentele plăcii 1 rămân', { skip: LIPIRE }, async () => {
  const rele: string[] = [];
  let comparate = 0;
  const perechi = [
    ...corpusUrechi().map((c) => ({ nume: `[${c.familie}] ${c.nume}`, v4: c.v4, m: { origine: c.origine, z0: c.z0 } })),
    ...montaje(STOC_PLACA).flatMap((m) => [
      { nume: `placa 1 (140 × 100) ${descrieM(m)}`, v4: docPlaca1(), m },
      { nume: `placa 1 (300 × 200) ${descrieM(m)}`, v4: PLACA_1(6), m },
    ]),
  ];
  for (const p of perechi) {
    const a = await programulAplicatiei(p.v4, p.m);
    const b = await programulAplicatiei(migreazaV4V5O(p.v4), p.m);
    if (a.ok !== b.ok || (a.ok && b.ok && a.text !== b.text) || (!a.ok && !b.ok && a.motiv !== b.motiv)) rele.push(p.nume);
    if (a.ok) comparate++;
  }
  assert.deepEqual(rele, []);
  assert.ok(comparate >= 130, `${comparate} programe comparate`);
  const AMPRENTE = {
    A: '03d6cf5376faadb728cbd8bc1a6ea408af543b5b40548200b707a8fe6b697ac9',
    B: 'a65c7e8a71481dd14de400be08d70139775efc74a858bee0cd660eaad39e1105',
  } as const;
  for (const f of ['A', 'B'] as const) {
    const octeti = readFileSync(new URL(`../placi/placa-01/placa-01-${f}.nc`, import.meta.url));
    assert.equal(createHash('sha256').update(octeti).digest('hex'), AMPRENTE[f], `placa-01-${f}.nc`);
  }
});

test('raport: tabelul martorilor negativi', () => {
  console.log(`martorii (martor | caz | poarta | hârtia):\n  ${tabelMartori.join('\n  ')}`);
  assert.ok(tabelMartori.length >= 30);
});

