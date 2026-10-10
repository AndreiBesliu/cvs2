/**
 * Oracolul rampei (ADR 0029), invariantele 9 și 10 amendate și invarianta 11 din poartă, judecate:
 * - pe hârtie: zonele, `scoate` și intrările cu numere scrise de mână (0, 10, 20; 0, 7π, 14π; 0, 188, 3S/2 + 8;
 *   0, S/2 + 8, S/2 + 138; 0, 75, 150), Z(σ) cerut în puncte calculate de mână (rampa care trece peste urechea 0),
 *   perimetrele analitice ale cazurilor față de a doua cale (primitivele traseului);
 * - pe scriitorul „cum cere contractul” (`rampa.cazuri.ts`, propria lui copie a formulelor): cele 8 cazuri din §6, pe
 *   toate montajele și cu alte porniri, trec TOATĂ poarta (1, 2, 3, 5, 6, 7, 9, 10, 11 și viteza pe verticală) și
 *   hârtia (intrările, cotele, lungimea coborârii, lungimea trecerilor, acoperirea la fund, nimic sub fund, nicio
 *   coborâre pe verticală, geometria în plan); controalele: fiecare trecere chiar coboară pe rampă, fiecare trecere
 *   taie cel puțin P;
 * - pe martorii negativi din §6 (rampa de la −d_k, intrările nerotite, pana, rampa fără urechi, intrarea pe flanc):
 *   fiecare înroșește oracolul, iar testul spune cine îl prinde (tabelul de la sfârșit);
 * - invarianta 11 fără rampă (forma de la §4): plonjarea, ridicarea între treceri, ordinea trecerilor, același punct de
 *   plonjare; legarea etichetei pe perechea (urechi, rampă); toleranțele la limită; intrarea ambiguă;
 * - amendamentele: pe programele fără rampă (scriitorul 2.4 pe cele 9 cazuri, placa 1 coborâtă și ridicată), verdictele
 *   invariantei 9 sunt EXACT cele de dinainte de ADR 0029, iar invarianta 10 dă aceleași încălcări cu și fără legarea
 *   rampei; pe programele cu rampă, regula veche a drumurilor deschise ar fi dat încălcări (amendamentul e necesar);
 * - lipirea cu aplicația („lipire:”, doar pe schema 6): cele 8 cazuri prin `calculeazaExport` pe 8 montaje (poarta
 *   întreagă și hârtia), corpusul 2.4 cu rampe la întâmplare (1, 2, 9, 10, 11 și viteza pe verticală pe fiecare
 *   program), octeții identici între un document v6 cu `rampa: null` și același document încărcat ca v5 (și amprentele
 *   plăcii 1).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { citeste, type Punct3 } from '../oracles/gcode.ts';
import { laDocument, poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import { migreazaV4V5O, migreazaV5V6O, type DocV6O, type OperatieV6O } from '../oracles/document.ts';
import { citesteEticheta, regiuneDinDocument, verificaEticheta, type Regiune } from '../oracles/regiune.ts';
import { buclele, verificaSensul, type EtichetaActiva } from '../oracles/sens.ts';
import { profil, verificaUrechile, zProfil } from '../oracles/urechi.ts';
import {
  asteptatRampa, comparaRampa, intrarile, lanturile, masoaraRampa, parcurgeriHartie, peDrumRampa, profilRampa, scoate, tolLant,
  verificaRampa, zCerut, zoneleUrechilor,
} from '../oracles/rampa.ts';
import { CAZURI_RAMPA, corpusRampa, docRampa, programCazRampa, programRampa, varfRampa, type CazRampa, type MartorRampa, type TraseuRampa } from '../oracles/rampa.cazuri.ts';
import { CAZURI_URECHI, drumAnalitic, drumCerut, programCaz, type FormaUrechi } from '../oracles/urechi.cazuri.ts';
import { drept, PLACA_1, programDinTrasee, type Montaj, type Stoc } from '../oracles/regiune.cazuri.ts';
import { docPlaca1, STOC_PLACA, traseeCerute } from '../oracles/sens.cazuri.ts';
import { lungime } from '../oracles/regiune.ts';
import { programulAplicatiei, schemaAplicatiei } from './ajutor-lipire.ts';

const AVANS_PLONJARE = 300;
const SCHEMA = await schemaAplicatiei();
// Felia 2.5b (sesiune independentă): poarta era `SCHEMA === 6`, deci pe aplicația v7 TOATĂ lipirea rampei (12 teste) se
// sărea în tăcere (exit 0). Acum rulează pe ≥ 6; pe o aplicație mai veche, testul de schemă de mai jos PICĂ (nu se sare).
const LIPIRE = SCHEMA >= 6 ? false : `aplicația e pe schema ${SCHEMA}; lipirea rampei cere documentul v6 (ADR 0029)`;

const egal = (a: number, b: number, mesaj = '', tol = 1e-9): void => assert.ok(Math.abs(a - b) <= tol, `${mesaj}: ${a} ≠ ${b}`);
const mesaje = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n');
const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
const montaje = (foaie: Stoc): Montaj[] => COLTURI.flatMap((origine) => (['sus', 'jos'] as const).map((z0) => ({ foaie, origine, z0 })));
const descrieM = (m: Montaj): string => `${m.origine}, Z0 ${m.z0}`;
const PI = Math.PI;
const P_DR = 1000 + 6 * PI;
const S_DR = P_DR / 4;
const DR_: FormaUrechi = { id: 'a', forma: drept(300, 200), x: 50, y: 50, latura: 'exterior' };

function ctxCaz(c: CazRampa, m: Montaj, doc: DocV6O = c.doc): ContextPoarta {
  return {
    foaie: c.stoc, origine: m.origine, z0: m.z0, diametruScula: c.diametru, pas: c.pas, supracursa: c.supracursa, asteptareAx: 3,
    regiune: regiuneDinDocument(doc), avansPlonjare: AVANS_PLONJARE,
  };
}

/** Fundul de pe hârtie: profilul urechilor (ADR 0028 §3) pe P analitic, sau −d. */
const fundHartie = (c: CazRampa) => (x: number, d: number): number => {
  const varf = varfRampa(c);
  return c.urechi !== null && d > varf ? zProfil(profil(c.P, c.urechi, varf, d)!, x) : -d;
};

/**
 * Hârtia pe un program al unui caz: o singură parcurgere (bucla, cu toate trecerile), măsurată pe P analitic față de
 * valorile cerute (`asteptatRampa` cu intrările din zonele analitice; intrările scrise de mână sunt comparate separat),
 * plus geometria în plan față de traseul analitic.
 */
function hartie(c: CazRampa, text: string, m: Montaj): { rele: string[]; masuri: ReturnType<typeof masoaraRampa> } {
  const parc = parcurgeriHartie(text, (p) => laDocument(p, m));
  const rele: string[] = [];
  if (parc.length !== 1) return { rele: [`${parc.length} parcurgeri, nu una`], masuri: [] };
  const zone = zoneleUrechilor(c.P, c.urechi)!;
  const masuri = masoaraRampa(parc[0]!, c.P, zone, fundHartie(c), c.d, c.lungime);
  rele.push(...comparaRampa(masuri, asteptatRampa(c.P, c.lungime, zone, c.d)));
  rele.push(...peDrumRampa(parc[0]!, drumAnalitic(c.forma, c.diametru)));
  return { rele, masuri };
}

// ── (o) Hârtia ───────────────────────────────────────────────────────────────────────────────────────────────────────

test('(o) intrările pe hârtie: zonele dreptunghiului cu 4 × 8 (S = P / 4, zona ±8 în jurul lui (j + ½)·S); scoate; intrările celor 8 cazuri sunt cele scrise de mână', () => {
  const zone = zoneleUrechilor(P_DR, { numar: 4, latime: 8 })!;
  egal(zone[0]!.a, S_DR / 2 - 8, 'zona 0, început');
  egal(zone[1]!.b, 1.5 * S_DR + 8, 'zona 1, capăt');
  // De mână: S = 254.7123889803847; zona 1 = [374.0685834705770, 390.0685834705770].
  egal(zone[1]!.a, 374.068583470577, 'zona 1, început (număr)', 1e-9);
  egal(scoate(376, P_DR, zone), 390.068583470577, 'flancul urechii 1 → capătul zonei', 1e-9);
  egal(scoate(130, P_DR, zone), S_DR / 2 + 8, 'palierul urechii 0 → capătul zonei');
  egal(scoate(119.356, P_DR, zone), 119.356, 'chiar înaintea zonei 0: rămâne');
  egal(scoate(S_DR / 2 + 8, P_DR, zone), S_DR / 2 + 8, 'capătul zonei: nu e strict în interior');
  egal(scoate(P_DR + 130, P_DR, zone), P_DR + S_DR / 2 + 8, 'desfășurat: modulo P');
  for (const c of CAZURI_RAMPA) {
    const Lr = Math.min(c.lungime, c.P / 2);
    const e = intrarile(c.P, Lr, zoneleUrechilor(c.P, c.urechi)!, c.intrari.length);
    e.forEach((x, k) => egal(x, c.intrari[k]!, `${c.nume}: e${k + 1}`, 1e-9));
  }
  egal(Math.min(30, 14 * PI / 2), 7 * PI, 'gaura R10: Lr = P / 2');
});

test('(o) Z(σ) pe hârtie, rampa 75 peste urechea 0 (trecerea 2 de la 75 + P): zR la 100 + P = −1 − 25/75; palierul −1,5 la centrul urechii; întâlnirile zR = zP la ≈122,309 și ≈133,608', () => {
  const c = CAZURI_RAMPA[5]!;
  const pr = profilRampa(c.P, 75, c.intrari, c.d, c.urechi, varfRampa(c))!;
  egal(zCerut(pr, P_DR + 100), -1 - 25 / 75, 'pe rampă, în afara zonei', 1e-12);
  egal(zCerut(pr, P_DR + S_DR / 2), -1.5, 'palierul (profilul e mai puțin adânc decât zR)', 1e-12);
  // Întâlnirea pe flancul care urcă: −1 − (s − 75)/75 = −2 + (s − (S/2 − 8))/8 → s = (16 + S/2 − 8 + 8·75/75·…), rezolvat pe hârtie:
  // s·(1/75 + 1/8) = 1 + 75/75 + (S/2 − 8)/8 → s = (2 + (S/2 − 8)/8) / (1/75 + 1/8).
  const s1 = (2 + (S_DR / 2 - 8) / 8) / (1 / 75 + 1 / 8);
  egal(s1, 122.3089, 'prima întâlnire', 1e-3);
  egal(zCerut(pr, P_DR + s1), -1 - (s1 - 75) / 75, 'zR = zP la prima întâlnire', 1e-9);
  // A doua, pe flancul care coboară: −s/75 = −1,5 − (s − (S/2 + 4))/8 → s = ((S/2 + 4)/8 − 1,5) / (1/8 − 1/75).
  const s2b = ((S_DR / 2 + 4) / 8 - 1.5) / (1 / 8 - 1 / 75);
  egal(s2b, 133.6077, 'a doua întâlnire', 1e-3);
  egal(zCerut(pr, P_DR + s2b), -1 - (s2b - 75) / 75, 'zR = zP la a doua întâlnire', 1e-9);
  egal(zCerut(pr, P_DR + 150), -2, 'capătul rampei: −d₂', 1e-12);
  egal(zCerut(pr, 2 * P_DR + 150 - 1e-9), -2, 'tura trecerii 2 ajunge la e₃ + P la −d₂', 1e-6);
  egal(pr.capat, 150 + 2 * P_DR + 75 + P_DR, 'tura ultimei treceri se oprește la e₃ + Lr + P (desfășurat: σ₃ + Lr + P)', 1e-9);
});

test('(o) perimetrele cazurilor, scrise pe hârtie, sunt perimetrele traseului analitic (a doua cale)', () => {
  for (const c of CAZURI_RAMPA) egal(drumAnalitic(c.forma, c.diametru).reduce((s, p) => s + lungime(p), 0), c.P, c.nume, 1e-9);
  assert.equal(CAZURI_RAMPA.length, 8);
});

// ── (o) Scriitorul „cum cere contractul”: poarta întreagă și hârtia ─────────────────────────────────────────────────

test('(o) scriitorul cum cere contractul: cele 8 cazuri pe 8 montaje și cu alte porniri trec toată poarta (cu 11 și viteza pe verticală) și hârtia; controalele: fiecare trecere coboară pe rampă și taie cel puțin P', () => {
  const rele: string[] = [];
  let programe = 0, treceri = 0;
  for (const c of CAZURI_RAMPA) {
    const ms = montaje(c.stoc);
    const variante = [...ms.map((m) => ({ m, pornire: 0 })), { m: ms[3]!, pornire: c.forma.forma.tip === 'cerc' ? 0.7 : 2 }];
    for (const { m, pornire } of variante) {
      const text = programCazRampa(c, m, { pornire });
      const unde = `${c.nume} (${descrieM(m)}, pornirea ${pornire})`;
      const v = poarta(text, ctxCaz(c, m));
      if (v.length) rele.push(`${unde}:\n${mesaje(v.slice(0, 4))}`);
      const h = hartie(c, text, m);
      if (h.rele.length) rele.push(`${unde}: ${h.rele.slice(0, 4).join('; ')}`);
      // Controalele: o coborâre pe rampă pe fiecare trecere, nicio coborâre pe verticală în material, cel puțin P pe trecere.
      if (h.masuri.length !== c.d.length) rele.push(`${unde}: ${h.masuri.length} treceri`);
      for (const x of h.masuri) {
        if (!(x.dsCoborare > 1 && x.dzCoborare > 0)) rele.push(`${unde}: trecerea ${x.k} nu coboară pe rampă`);
        if (x.lungime < c.P - 0.01) rele.push(`${unde}: trecerea ${x.k} taie ${x.lungime} < P`);
      }
      programe++;
      treceri += h.masuri.length;
    }
  }
  assert.deepEqual(rele, []);
  assert.equal(programe, 8 * 9);
  assert.equal(treceri, 8 * 9 * 3);
});

// ── (o) Martorii negativi (ADR 0029 §6) ─────────────────────────────────────────────────────────────────────────────

type Verdict = { readonly invariante: readonly number[]; readonly hartie: readonly string[] };
const judeca = (c: CazRampa, text: string, m: Montaj = montaje(c.stoc)[0]!): Verdict => {
  const v = poarta(text, ctxCaz(c, m));
  return { invariante: [...new Set(v.map((x) => x.invarianta))].sort((a, b) => a - b), hartie: hartie(c, text, m).rele };
};
const tabelMartori: string[] = [];

/**
 * Fiecare martor, pe fiecare caz unde schimbă programul: roșu în poartă (invariantele cerute) și pe hârtie, cu mărimea
 * pe care o strică (`hartieCere`: mesajul măsurii; tabelul sabotajelor a arătat că „orice mesaj al hârtiei” lăsa să
 * treacă o hârtie care nu mai compara intrarea sau acoperirea).
 */
function martor(nume: MartorRampa, cer: readonly number[], cazuri: readonly CazRampa[], minim: number, hartieCere: RegExp): void {
  let prinse = 0;
  for (const c of cazuri) {
    const m = montaje(c.stoc)[0]!;
    const rau = programCazRampa(c, m, { martor: nume });
    if (rau === programCazRampa(c, m)) { tabelMartori.push(`${nume} | ${c.nume} | același program (martorul nu schimbă nimic aici)`); continue; }
    const v = judeca(c, rau, m);
    tabelMartori.push(`${nume} | ${c.nume} | poarta [${v.invariante.join(', ')}] | hârtia ${v.hartie.length}: ${v.hartie[0] ?? ''}`);
    for (const i of cer) assert.ok(v.invariante.includes(i), `${nume}, ${c.nume}: invarianta ${i} nu-l vede (${JSON.stringify(v)})`);
    assert.ok(v.hartie.some((r) => hartieCere.test(r)), `${nume}, ${c.nume}: hârtia nu vede ${hartieCere} (${v.hartie.slice(0, 3).join('; ')})`);
    prinse++;
  }
  assert.ok(prinse >= minim, `${nume}: doar ${prinse} cazuri`);
}

test('(o) martorul „rampa care pleacă de la −d_k” (plonjare pe verticală, apoi trecerea plată): roșu pe toate cele 8 cazuri, prin 11 și prin hârtie', () => {
  martor('plonjare', [11], CAZURI_RAMPA, 8, /coboară pe 0\.000 mm în plan/);
});

test('(o) martorul „intrările nerotite” (toate la vârful 0): roșu pe toate cele 8 cazuri, prin 10 (tura nu acoperă bucla), 11 și hârtie', () => {
  martor('nerotite', [10, 11], CAZURI_RAMPA, 8, /intrarea la σ/);
});

test('(o) martorul „tura care nu re-acoperă rampa” (pana sub rampa ultimei treceri): roșu pe toate cele 8 cazuri, prin 10, 11 și hârtie', () => {
  martor('pana', [10, 11], CAZURI_RAMPA, 8, /la fund lipsesc/);
});

test('(o) martorul „rampa care ignoră urechile” (doar zR): roșu unde o rampă trece printr-o zonă (rampele 188 și 75), prin 10 (sub fund), 11 și hârtie', () => {
  martor('fara-urechi', [10, 11], CAZURI_RAMPA, 2, /sub fundul trecerii/);
  assert.ok(tabelMartori.some((x) => x.startsWith('fara-urechi | dreptunghi cu urechi 4 × 8, rampa 75') && x.includes('poarta [')));
});

test('(o) martorul „intrarea lăsată pe un flanc” (ediția întâi: fără scoate, coborâre pe verticală la Z-ul cel mai puțin adânc): roșu pe rampa 188 (e₃ pe flancul urechii 1) și pe rampa 130 (e₂ pe palier), prin 11 și hârtie', () => {
  martor('flanc', [11], CAZURI_RAMPA, 2, /intrarea la σ/);
  // Pe flanc: coborârea pe verticală de la zP₂(376) = −1,5 − 0,5·(378,07 − 376)/4 la max(−2, zP₃(376)) = −2.
  const c = CAZURI_RAMPA[3]!;
  const v = poarta(programCazRampa(c, montaje(c.stoc)[0]!, { martor: 'flanc' }), ctxCaz(c, montaje(c.stoc)[0]!));
  assert.ok(v.some((i) => i.invarianta === 11 && /coboară pe verticală în material, de la -1\.759 la -2\.000/.test(i.mesaj)), mesaje(v));
});

// ── (o) Invarianta 11 fără rampă, legarea, toleranțele ────────────────────────────────────────────────────────────

const STOC_Q: Stoc = { latime: 200, inaltime: 200, grosime: 3 };
const FQ: FormaUrechi = { id: 'q', forma: drept(40, 40), x: 50, y: 50, latura: 'exterior' };
const MQ: Montaj = { foaie: STOC_Q, origine: 'stanga-jos', z0: 'sus' };
const ETQ = 'q/q: dreptunghi, exterior, 3 mm';
const docQ = (rampa: number | null, urechi = null as null | { numar: number; latime: number; grosime: number }): DocV6O =>
  docRampa(STOC_Q, [FQ], { diametru: 6, adancime: 3, pas: 1, urechi, rampa: rampa === null ? null : { lungime: rampa } });
const traseuQ = (rampa: number | null, o: Partial<TraseuRampa> = {}): TraseuRampa => ({
  eticheta: ETQ, drum: drumCerut(FQ, 6), adancime: 3, pas: 1, grosimeFoaie: 3, urechi: null, rampa, ...o,
});
const ctxQ = (doc: DocV6O): ContextPoarta => ({
  foaie: STOC_Q, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 1, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(doc), avansPlonjare: AVANS_PLONJARE,
});
const inv = (n: number, text: string, doc: DocV6O): Incalcare[] => poarta(text, ctxQ(doc)).filter((i) => i.invarianta === n);

test('(o) invarianta 11 fără rampă (§4): plonjarea în vârful 0 și ridicarea între treceri trec; coborârea pe verticală fără ridicare e prinsă (doar de 11)', () => {
  assert.deepEqual(poarta(programRampa([traseuQ(null)], MQ), ctxQ(docQ(null))), []);
  const jos = poarta(programRampa([traseuQ(null, { intre: 'coboara' })], MQ), ctxQ(docQ(null)));
  assert.ok(jos.length > 0 && jos.every((i) => i.invarianta === 11), mesaje(jos));
  assert.ok(jos.some((i) => /fără ridicare între treceri/.test(i.mesaj)), mesaje(jos));
});

test('(o) invarianta 11 fără rampă: plonjarea în alt punct al aceleiași bucle e prinsă; o buclă reluată la o adâncime mai mică după cea mai adâncă e prinsă', () => {
  const p0 = programRampa([traseuQ(null)], MQ).split('\n');
  const pr = programRampa([{ ...traseuQ(null), drum: [...drumCerut(FQ, 6).slice(2), ...drumCerut(FQ, 6).slice(0, 2)] }], MQ).split('\n');
  const r0 = p0.indexOf('G0 Z5.000', p0.indexOf(`(${ETQ})`));
  const rr = pr.indexOf('G0 Z5.000', pr.indexOf(`(${ETQ})`));
  const startR = pr.find((l) => /^G0 X/.test(l))!;
  // Trecerea 1 din vârful 0, trecerile 2 și 3 din vârful 2 (aceeași buclă, alt punct).
  const amestec = [...p0.slice(0, r0 + 1), startR, ...pr.slice(rr + 1)].join('\n');
  const v = inv(11, amestec, docQ(null));
  assert.ok(v.some((i) => /plonjează în alt punct al aceleiași bucle/.test(i.mesaj)), `${mesaje(v)}`);
  assert.deepEqual(poarta(amestec, ctxQ(docQ(null))).filter((i) => i.invarianta !== 11), [], 'restul porții nu vede nimic');
  // Trecerile 1, 2, 3, apoi din nou 1 (sub aceeași etichetă): adâncimea scade.
  const k1 = p0.indexOf('G1 Z-1.000 F300.0');
  const trecerea1 = p0.slice(k1, p0.indexOf('G0 Z5.000', k1));
  const fin = p0.lastIndexOf('G0 Z5.000');
  const reluat = [...p0.slice(0, fin + 1), ...trecerea1, ...p0.slice(fin)].join('\n');
  const o = inv(11, reluat, docQ(null));
  assert.ok(o.some((i) => /vine după una la/.test(i.mesaj)), mesaje(o));
});

test('(o) legarea etichetei pe (urechi, rampă): documentul cere rampă, programul n-o are (prins de 11); documentul n-o cere, programul o are (prins de 11); degroșare fără rampă și finisare cu rampă, aceeași adâncime: a k-a apariție', () => {
  const faraInProgram = inv(11, programRampa([traseuQ(null)], MQ), docQ(10));
  assert.ok(faraInProgram.length > 0, 'documentul cere rampă');
  const faraInDoc = inv(11, programRampa([traseuQ(10)], MQ), docQ(null));
  assert.ok(faraInDoc.some((i) => /nu începe cu o plonjare/.test(i.mesaj)), mesaje(faraInDoc));
  assert.deepEqual(poarta(programRampa([traseuQ(10)], MQ), ctxQ(docQ(10))), []);
  const doc = docQ(null);
  doc.piese[0]!.operatii.push({ ...structuredClone(doc.piese[0]!.operatii[0]!), id: 'op2', rampa: { lungime: 10 } } as OperatieV6O);
  assert.deepEqual(poarta(programRampa([traseuQ(null), traseuQ(10)], MQ), ctxQ(doc)), []);
  assert.ok(inv(11, programRampa([traseuQ(10), traseuQ(null)], MQ), doc).length > 0, 'invers');
  const trei = inv(11, programRampa([traseuQ(null), traseuQ(10), traseuQ(10)], MQ), doc);
  assert.ok(trei.some((i) => /urechi sau rampe diferite, iar eticheta apare de 3 ori/.test(i.mesaj)), mesaje(trei));
});

test('(o) toleranțele invariantei 11, la limită: intrările mutate cu 0,002 trec, cu 0,3 nu (pe pătratul 40 × 40, T = 0,0015 + 0,0042·Θ)', () => {
  const doc = docQ(10);
  const bun = programRampa([traseuQ(10)], MQ);
  const l = lanturile(citeste(bun).evenimente, [7], (p) => p)[0]!;
  egal(tolLant(l), 0.0015 + 0.0042 * l.theta, 'T');
  assert.ok(l.theta > 3 * 2 * PI && l.theta < 4 * 2 * PI, `Θ ${l.theta}: trei tururi de colțuri și ceva`);
  assert.deepEqual(poarta(programRampa([traseuQ(10, { abatereIntrari: 0.002 })], MQ), ctxQ(doc)), []);
  const v = poarta(programRampa([traseuQ(10, { abatereIntrari: 0.3 })], MQ), ctxQ(doc));
  assert.ok(v.some((i) => i.invarianta === 11), mesaje(v));
});

test('(o) intrarea ambiguă (e + Lr la 0,0004 după începutul zonei urechii 0): programul care o scoate și cel care o lasă trec amândouă; la 0,5 în zonă, cel care o lasă e prins', () => {
  const c = CAZURI_RAMPA[3]!;
  const m = montaje(c.stoc)[0]!;
  const L = S_DR / 2 - 8 + 0.0004;
  const cu = (lung: number): CazRampa => ({ ...c, lungime: lung, doc: docRampa(c.stoc, [c.forma], { diametru: 6, adancime: 3, pas: 1, urechi: c.urechi, rampa: { lungime: lung } }) });
  const a = cu(L);
  assert.deepEqual(poarta(programCazRampa(a, m), ctxCaz(a, m)), [], 'scoasă');
  assert.deepEqual(poarta(programCazRampa(a, m, { martor: 'flanc' }), ctxCaz(a, m)).filter((i) => i.invarianta !== 1), [], 'lăsată');
  const b = cu(S_DR / 2 - 8 + 0.5);
  assert.ok(poarta(programCazRampa(b, m, { martor: 'flanc' }), ctxCaz(b, m)).some((i) => i.invarianta === 11));
});

// ── (o) Precizarea din 10.10: rampa minimă și toleranța verticalei ─────────────────────────────────────────────────

/** Gaura cerc(r) pe interior, Ø6: traseul R = r − 3, P = 2π(r − 3); adâncimea 3, pasul 1, rampa dată. */
const docGaura = (r: number, lung: number): { doc: DocV6O; forma: FormaUrechi } => {
  const forma: FormaUrechi = { id: 'g', forma: { tip: 'cerc', raza: r }, x: 100, y: 100, latura: 'interior' };
  return { forma, doc: docRampa(STOC_Q, [forma], { diametru: 6, adancime: 3, pas: 1, urechi: null, rampa: { lungime: lung } }) };
};
const programGaura = (r: number, lung: number): string => programRampa([{
  eticheta: `g/g: cerc, interior, 3 mm`, drum: drumCerut(docGaura(r, lung).forma, 6), adancime: 3, pas: 1, grosimeFoaie: 3, urechi: null, rampa: lung,
}], MQ);

test('(o) precizarea din 10.10, rampa minimă: lungimea 0,999 e prinsă pe etichetă (exportul trebuia refuzat), 1 trece; pe o buclă cu P sub 2 mm (gaura R3,3, Ø6: P = 0,6π), Lr < 1 e prins, pe R3,35 (P = 0,7π, Lr = 0,35π) trece', () => {
  const sub = inv(11, programRampa([traseuQ(0.999)], MQ), docQ(0.999));
  assert.ok(sub.length === 1 && sub[0]!.linia === 7 && /0\.999 mm e sub minimul de 1 mm: exportul trebuia refuzat/.test(sub[0]!.mesaj), mesaje(sub));
  assert.deepEqual(poarta(programRampa([traseuQ(1)], MQ), ctxQ(docQ(1))), []);
  const mica = docGaura(3.3, 10);
  egal(0.6 * PI, 1.8849555921538759, 'P pe hârtie');
  const v = inv(11, programGaura(3.3, 10), mica.doc);
  assert.ok(v.some((i) => /rampa nu încape pe buclă, exportul trebuia refuzat/.test(i.mesaj)), mesaje(v));
  const ok = docGaura(3.35, 10);
  assert.deepEqual(poarta(programGaura(3.35, 10), ctxQ(ok.doc)), []);
});

test('(o) precizarea din 10.10, toleranța verticalei: rampa care se termină la 0,0004 după un vârf (Δd 18, Lr = 1,5π + 0,0004) scrie o coborâre cu X / Y neschimbate, sub (d_k − d_{k−1})·0,001 / Lr + 0,0005, și trece; aceeași coborâre mărită la 0,010 e prinsă', () => {
  const stoc: Stoc = { latime: 400, inaltime: 300, grosime: 18 };
  const L = 1.5 * PI + 0.0004;
  const doc = docRampa(stoc, [DR_], { diametru: 6, adancime: 18, pas: 18, urechi: null, rampa: { lungime: L } });
  const m: Montaj = { foaie: stoc, origine: 'stanga-jos', z0: 'sus' };
  const ctx: ContextPoarta = { foaie: stoc, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 18, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(doc), avansPlonjare: AVANS_PLONJARE };
  const text = programRampa([{ eticheta: 'a/a: dreptunghi, exterior, 18 mm', drum: drumCerut(DR_, 6), adancime: 18, pas: 18, grosimeFoaie: 18, urechi: null, rampa: L }], m);
  const l = lanturile(citeste(text).evenimente, [7], (p) => p)[0]!;
  const vert = l.pasi.filter((p) => p.vertical && p.zb < p.za - 1e-9);
  assert.equal(vert.length, 1, 'controlul: programul chiar are coborârea cu X / Y neschimbate');
  const dz = vert[0]!.za - vert[0]!.zb;
  assert.ok(dz > 0 && dz <= 18 * 0.001 / L + 0.0005, `coborârea ${dz}`);
  assert.deepEqual(poarta(text, ctx), []);
  // Capătul arcului de dinainte ridicat cu 0,010: coborârea pe verticală trece de toleranță (0,0043).
  const linii = text.split('\n');
  const k = vert[0]!.linia - 2;
  linii[k] = linii[k]!.replace(/Z(-?\d+\.\d{3})/, (_, z: string) => `Z${(Number(z) + 0.01).toFixed(3)}`);
  const v = poarta(linii.join('\n'), ctx).filter((i) => i.invarianta === 11);
  assert.ok(v.some((i) => /coboară pe verticală în material/.test(i.mesaj)), `${mesaje(v)}\n${linii.slice(k - 1, k + 3).join('\n')}`);
});

// ── (o) Amendamentele: fără rampă, aceleași verdicte ────────────────────────────────────────────────────────────────

function eticheteleProgramului(text: string, reg: Regiune): EtichetaActiva[] {
  return citeste(text).comentarii.flatMap((c) => {
    const et = citesteEticheta(c.text);
    if (et === null) return [];
    return [{ linia: c.linia, eticheta: et !== 'stricata' && c.singur && !verificaEticheta(reg, et) ? et : null }];
  });
}

/** Verdictele 9 (amendată 0029 și dinainte) și 10 (cu și fără legarea rampei) pe un program. */
function verdicte(text: string, reg: Regiune, laDoc: (p: Punct3) => Punct3, grosime: number, D: number): { readonly n9: string[]; readonly v9: string[]; readonly n10: string[]; readonly v10: string[] } {
  const { evenimente } = citeste(text);
  const et = eticheteleProgramului(text, reg);
  const r = verificaRampa(evenimente, et, reg, laDoc, grosime);
  const f = (x: readonly { linia: number; mesaj: string }[]): string[] => x.map((i) => `${i.linia}: ${i.mesaj}`);
  return {
    n9: f(verificaSensul(evenimente, et, reg, laDoc)),
    v9: f(verificaSensul(evenimente, et, reg, laDoc, buclele, false)),
    n10: [...f(verificaUrechile(evenimente, et, reg, laDoc, grosime, D, r.cuRampa)), ...f(r.incalcari.filter((i) => i.invarianta === 10))],
    v10: f(verificaUrechile(evenimente, et, reg, laDoc, grosime, D)),
  };
}

test('(o) amendamentele 9 și 10 (§5): pe programele fără rampă (scriitorul 2.4 pe cele 9 cazuri, cu martorii lui, coborâte și ridicate; placa 1 coborâtă și ridicată), verdictele sunt EXACT cele de dinainte de ADR 0029', () => {
  let programe = 0, cuIncalcari = 0;
  const rele: string[] = [];
  const judecaUnul = (text: string, reg: Regiune, m: Montaj, grosime: number, D: number, unde: string): void => {
    const x = verdicte(text, reg, (p) => laDocument(p, m), grosime, D);
    if (JSON.stringify(x.n9) !== JSON.stringify(x.v9)) rele.push(`${unde}: 9 nou ${JSON.stringify(x.n9.slice(0, 2))}, vechi ${JSON.stringify(x.v9.slice(0, 2))}`);
    if (JSON.stringify(x.n10) !== JSON.stringify(x.v10)) rele.push(`${unde}: 10 nou ${JSON.stringify(x.n10.slice(0, 2))}, vechi ${JSON.stringify(x.v10.slice(0, 2))}`);
    programe++;
    if (x.v9.length || x.v10.length) cuIncalcari++;
  };
  for (const c of CAZURI_URECHI) {
    const reg = regiuneDinDocument(c.doc);
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[5]!]) {
      for (const o of [{}, { intre: 'coboara' as const }, { martor: 'binar' as const }, { martor: 'centre-k-s' as const }, { martor: 'coarda' as const, pornire: 1 }]) {
        judecaUnul(programCaz(c, m, o), reg, m, c.stoc.grosime, c.diametru, `${c.nume} ${JSON.stringify(o)}`);
      }
    }
  }
  for (const m of montaje(STOC_PLACA)) {
    for (const intre of ['coboara', 'ridica'] as const) {
      const doc = PLACA_1(6);
      judecaUnul(programDinTrasee(traseeCerute(doc, 6, { intre }), { ...m, foaie: { latime: 300, inaltime: 200, grosime: 18 } }), regiuneDinDocument(doc), { ...m, foaie: { latime: 300, inaltime: 200, grosime: 18 } }, 18, 6, `placa 1 ${intre}`);
      const d1 = docPlaca1();
      judecaUnul(programDinTrasee(traseeCerute(d1, 6, { intre, intoarse: new Set(['e1/e1']) }), m), regiuneDinDocument(d1), m, 18, 6, `placa 1 (140 × 100) întoarsă ${intre}`);
    }
  }
  assert.deepEqual(rele, []);
  assert.ok(programe >= 100 && cuIncalcari >= 30, `${programe} programe, ${cuIncalcari} cu încălcări`);
});

test('(o) amendamentul 9 e necesar: pe programele cu rampă, regula de dinainte de ADR 0029 dă încălcări (porțiunile deschise de la capete), cea amendată nu', () => {
  let cuVechi = 0;
  for (const c of CAZURI_RAMPA) {
    const m = montaje(c.stoc)[0]!;
    const x = verdicte(programCazRampa(c, m), regiuneDinDocument(c.doc), (p) => laDocument(p, m), c.stoc.grosime, c.diametru);
    assert.deepEqual(x.n9, [], c.nume);
    if (x.v9.some((s) => /nu se închide/.test(s))) cuVechi++;
  }
  assert.equal(cuVechi, CAZURI_RAMPA.length);
});

test('(o) amendamentul 9 cere același sens: după tura cu rampă, o întoarcere pe ultima latură (pe buclă, dar în sens invers) e prinsă', () => {
  const doc = docQ(10);
  const text = programRampa([traseuQ(10)], MQ);
  const linii = text.split('\n');
  const k = linii.lastIndexOf('G0 Z5.000');
  // Freza se întoarce pe ultima latură până la mijlocul ei, la aceeași adâncime (până la capătul ei ar fi un dus-întors
  // închis, cu aria 0, pe care regula din 2.3b nu-l judecă).
  const ev = citeste(text).evenimente.flatMap((e) => (e.tip === 'mutare' && e.m.linia === k ? [e.m] : []))[0]!;
  linii.splice(k, 0, `G1 X${((ev.a[0] + ev.b[0]) / 2).toFixed(3)} Y${((ev.a[1] + ev.b[1]) / 2).toFixed(3)}`);
  const v = poarta(linii.join('\n'), ctxQ(doc)).filter((i) => i.invarianta === 9);
  assert.ok(v.some((i) => /nu se închide/.test(i.mesaj)), `${mesaje(v)}\n${linii.slice(k - 2, k + 2).join('\n')}`);
});

test('(o) amendamentul 9 nu lasă să treacă o porțiune deschisă care NU stă pe buclă: o legătură la adâncime spre alt punct, după tura cu rampă, e încă prinsă', () => {
  const doc = docQ(10);
  const linii = programRampa([traseuQ(10)], MQ).split('\n');
  const k = linii.lastIndexOf('G0 Z5.000');
  linii.splice(k, 0, 'G1 X60.000 Y60.000');
  const v = poarta(linii.join('\n'), ctxQ(doc)).filter((i) => i.invarianta === 9);
  assert.ok(v.some((i) => /nu se închide/.test(i.mesaj)), mesaje(v));
});

// ── Lipirea cu aplicația ────────────────────────────────────────────────────────────────────────────────────────────

test('lipire: aplicația e pe schema ≥ 6 (ușa primește un v6); pe una mai veche testul PICĂ', () => {
  assert.ok(SCHEMA >= 6, `schema ${SCHEMA}`);
});

for (const c of CAZURI_RAMPA) {
  test(`lipire: ${c.nume}: programul aplicației, pe 8 montaje, trece toată poarta și hârtia`, { skip: LIPIRE }, async () => {
    const rele: string[] = [];
    for (const m of montaje(c.stoc)) {
      const r = await programulAplicatiei(c.doc, m, c.supracursa ? { supracursa: c.supracursa } : {});
      if (!r.ok) { rele.push(`${descrieM(m)}: aplicația refuză: ${r.motiv}`); continue; }
      const v = poarta(r.text, ctxCaz(c, m));
      if (v.length) rele.push(`${descrieM(m)}:\n${mesaje(v.slice(0, 4))}`);
      const h = hartie(c, r.text, m);
      if (h.rele.length) rele.push(`${descrieM(m)}: ${h.rele.slice(0, 4).join('; ')}`);
      else if (h.masuri.some((x, k) => Math.abs(x.sigma - (c.intrari[k]! + k * c.P)) > 0.003 + 0.0042 * x.theta)) rele.push(`${descrieM(m)}: intrările nu sunt cele scrise de mână`);
    }
    assert.deepEqual(rele, []);
  });
}

test('lipire: precizarea din 10.10: rampa de 0,999 mm e refuzată cu motiv, cea de 1 mm trece poarta; bucla cu P sub 2 mm (gaura R3,3, Ø6) e refuzată cu motiv, cea de R3,35 trece poarta', { skip: LIPIRE }, async () => {
  const rele: string[] = [];
  const cazuri: Array<{ nume: string; doc: DocV6O; ok: boolean }> = [
    { nume: 'rampa 0,999', doc: docQ(0.999), ok: false },
    { nume: 'rampa 1 (control)', doc: docQ(1), ok: true },
    { nume: 'gaura R3,3: P = 1,885, Lr = 0,942', doc: docGaura(3.3, 10).doc, ok: false },
    { nume: 'gaura R3,35: P = 2,199, Lr = 1,100 (control)', doc: docGaura(3.35, 10).doc, ok: true },
  ];
  for (const x of cazuri) {
    const r = await programulAplicatiei(x.doc, { origine: 'stanga-jos', z0: 'sus' });
    if (r.ok !== x.ok) rele.push(`${x.nume}: ${r.ok ? 'trece' : `refuzat (${r.motiv})`}`);
    if (!r.ok) { assert.ok(r.motiv.length > 0, `${x.nume}: refuz fără motiv`); console.log(`  ${x.nume}: ${r.motiv}`); }
    if (r.ok) {
      const v = poarta(r.text, ctxQ(x.doc));
      if (v.length) rele.push(`${x.nume}: ${mesaje(v.slice(0, 3))}`);
    }
  }
  assert.deepEqual(rele, []);
});

type LipitR ={ readonly caz: ReturnType<typeof corpusRampa>[number]; readonly text: string | null; readonly motiv: string | null };
let corpusLipit: Promise<LipitR[]> | null = null;
/** Corpusul 2.4 întreg (pasCaz = 1); se poate rări pentru buget. */
const PAS_CORPUS = 1;
const programeCorpus = (): Promise<LipitR[]> => (corpusLipit ??= (async () => {
  const rez: LipitR[] = [];
  for (const caz of corpusRampa(0x25a0, PAS_CORPUS)) {
    const r = await programulAplicatiei(caz.doc, { origine: caz.origine, z0: caz.z0 });
    rez.push({ caz, text: r.ok ? r.text : null, motiv: r.ok ? null : r.motiv });
  }
  return rez;
})());

test('lipire: corpusul 2.4 cu rampe la întâmplare (foi de 3–18 mm, toate colțurile, ambele Z0, toate laturile, ambele sensuri, urechi): orice program al aplicației trece 1, 2, 9, 10, 11 și viteza pe verticală', { skip: LIPIRE }, async () => {
  const rez = await programeCorpus();
  const rele: string[] = [];
  let programe = 0, lanturiRampa = 0;
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
    const v = poarta(x.text, ctx).filter((i) => [1, 2, 9, 10, 11].includes(i.invarianta));
    if (v.length) rele.push(`[${x.caz.familie}] ${x.caz.nume} (${x.caz.origine}, ${x.caz.z0}, T ${stoc.grosime}): ${mesaje(v.slice(0, 3))}`);
    const reg = ctx.regiune!;
    const et = eticheteleProgramului(x.text, reg);
    const r = verificaRampa(citeste(x.text).evenimente, et, reg, (p) => laDocument(p, ctx), stoc.grosime);
    for (const l of lanturile(citeste(x.text).evenimente, et.map((e) => e.linia), (p) => laDocument(p, ctx))) {
      if (!r.cuRampa.has(l.eticheta)) continue;
      lanturiRampa++;
      laturi.add(et[l.eticheta]!.eticheta!.latura);
    }
  }
  const refuzate = rez.filter((x) => x.text === null);
  console.log(`lipire 11: ${rez.length} cazuri, ${programe} programe, ${lanturiRampa} bucle cu rampă judecate (${[...laturi].join(', ')}), ${refuzate.length} refuzuri`);
  if (refuzate.length) console.log(`  motive: ${[...new Set(refuzate.map((x) => x.motiv))].slice(0, 5).join(' | ')}`);
  assert.deepEqual(rele, []);
  assert.ok(programe >= 60 && lanturiRampa >= 100 && laturi.size === 3, `${programe} programe, ${lanturiRampa} bucle cu rampă, laturile ${[...laturi].join(', ')}`);
});

test('lipire: un document v6 cu rampa null dă, octet cu octet, programul aceluiași document încărcat ca v5 (corpusul, placa 1 pe 8 montaje); amprentele plăcii 1 rămân', { skip: LIPIRE }, async () => {
  const rele: string[] = [];
  let comparate = 0;
  const perechi = [
    ...corpusRampa(0x25a0, PAS_CORPUS).map((c) => ({ nume: `[${c.familie}] ${c.nume}`, v5: c.v5, m: { origine: c.origine, z0: c.z0 } })),
    ...montaje(STOC_PLACA).flatMap((m) => [
      { nume: `placa 1 (140 × 100) ${descrieM(m)}`, v5: migreazaV4V5O(docPlaca1()), m },
      { nume: `placa 1 (300 × 200) ${descrieM(m)}`, v5: migreazaV4V5O(PLACA_1(6)), m },
    ]),
  ];
  for (const p of perechi) {
    const a = await programulAplicatiei(p.v5, p.m);
    const b = await programulAplicatiei(migreazaV5V6O(p.v5), p.m);
    if (a.ok !== b.ok || (a.ok && b.ok && a.text !== b.text) || (!a.ok && !b.ok && a.motiv !== b.motiv)) rele.push(p.nume);
    if (a.ok) comparate++;
  }
  assert.deepEqual(rele, []);
  assert.ok(comparate >= 60, `${comparate} programe comparate`);
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
