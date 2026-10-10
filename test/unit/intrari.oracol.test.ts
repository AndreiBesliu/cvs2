/**
 * Oracolul intrărilor și ieșirilor (ADR 0030), invariantele 9, 10, 11 amendate și invarianta 12 din poartă, judecate:
 * - pe hârtie: partea deșeului DERIVATĂ din așchie față de textul ADR-ului; geometria §2 (C, A, B, sensul arcului,
 *   viteza în p₀ = t₀); verificarea exactă §3 pe găurile circulare (încape / nu, cu formulele închise ale cercului);
 *   candidații §3 pe gaura dreptunghiulară, în ambele lecturi ale „indicelui”; alegerea oracolului = numerele de mână;
 * - pe scriitorul „cum cere contractul” (`intrari.cazuri.ts`, propria lui copie a §2): cele 8 cazuri din §8 pe 8
 *   montaje trec TOATĂ poarta (1–12 și viteza pe verticală) și hârtia (p₀, C, ρ, partea, A, unghiurile, jocul discului;
 *   urechile numărate din p₀);
 * - pe martorii negativi din §8 (și ai mei): fiecare înroșește poarta ȘI hârtia; tabelul spune cine îi prinde;
 * - amendamentele: pe programele FĂRĂ intrări (scriitorii 2.3a / 2.4 / 2.5a, cu martorii lor, placa 1), invariantele
 *   1–11 dau EXACT verdictele porții de dinainte de ADR 0030, iar 12 nu spune nimic pe programele corecte;
 * - precizarea din 10.10 (§3 b și c): rama la 7 mm de marginea foii (intrarea nu iese din foaie mai mult decât bucla) și
 *   vecina deasupra unei rame cu urechi (semicercul la cel puțin D + 1 de bucla cu urechi); lungimile egale la 1e-6 mm,
 *   indicele mai mic întâi; avertismentul fără raza / 2 când nu s-a încercat;
 * - lipirea cu aplicația („lipire:”, cere schema ≥ 7 și PICĂ, nu se sare, pe o aplicație mai veche): cele 8 cazuri pe 8
 *   montaje (poarta întreagă, hârtia, vârful 0 citit din programul fără intrări, avertismentul intrării omise),
 *   refuzurile §6 cu motiv, corpusul 2.4 cu intrări la întâmplare (1, 2, 9, 10, 11, 12, viteza pe verticală și alegerea
 *   §3 față de candidații oracolului), octeții identici între un v7 cu `intrari: null` și același document ca v6 (și
 *   amprentele plăcii 1).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { citeste, type Punct3 } from '../oracles/gcode.ts';
import { laDocument, poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import { migreazaV4V5O, migreazaV5V6O, migreazaV6V7O, type DocV6O, type DocV7O } from '../oracles/document.ts';
import { citesteEticheta, regiuneDinDocument, verificaEticheta, type Regiune } from '../oracles/regiune.ts';
import { aschia, parteaPastrataPrinAschie, type EtichetaActiva, type P2 } from '../oracles/sens.ts';
import { lanturile } from '../oracles/rampa.ts';
import { asteptatPeHartie, comparaCuHartia, masoara, type BucataTrecere, type Trecere } from '../oracles/urechi.ts';
import {
  alegerileAcceptate, buclaAnalitica, candidatii, comparaIntrarea, desparte, dinVarful0, incape, incapeTot, lumea, masoaraIntrari, mersTrigonometric,
  parteDeseu, semicercul, TOL_CANDIDAT, type Alegere,
} from '../oracles/intrari.ts';
import { CAZURI_INTRARI, corpusIntrari, P_RAMA, programIntrari, type AsteptatH, type CazIntrari, type MartorIntrari } from '../oracles/intrari.cazuri.ts';
import { CAZURI_URECHI, programCaz } from '../oracles/urechi.cazuri.ts';
import { CAZURI_RAMPA, programCazRampa } from '../oracles/rampa.cazuri.ts';
import { corpus, PLACA_1, programDinTrasee, type Montaj, type Stoc } from '../oracles/regiune.cazuri.ts';
import { docPlaca1, STOC_PLACA, traseeCerute } from '../oracles/sens.cazuri.ts';
import { programulAplicatiei, schemaAplicatiei } from './ajutor-lipire.ts';

const AVANS_PLONJARE = 300;
const SCHEMA = await schemaAplicatiei();
const mesaje = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n');
const egal = (a: number, b: number, mesaj = '', tol = 1e-9): void => assert.ok(Math.abs(a - b) <= tol, `${mesaj}: ${a} ≠ ${b}`);
const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
const montaje = (foaie: Stoc): Montaj[] => COLTURI.flatMap((origine) => (['sus', 'jos'] as const).map((z0) => ({ foaie, origine, z0 })));
const descrieM = (m: Montaj): string => `${m.origine}, Z0 ${m.z0}`;
const dist = (p: P2, q: P2): number => Math.hypot(p.x - q.x, p.y - q.y);

function ctxCaz(c: { readonly stoc: Stoc; readonly diametru: number; readonly pas: number; readonly doc: DocV7O }, m: Montaj): ContextPoarta {
  return {
    foaie: c.stoc, origine: m.origine, z0: m.z0, diametruScula: c.diametru, pas: c.pas, supracursa: 0, asteptareAx: 3,
    regiune: regiuneDinDocument(c.doc), avansPlonjare: AVANS_PLONJARE,
  };
}

function eticheteleProgramului(text: string, reg: Regiune): EtichetaActiva[] {
  return citeste(text).comentarii.flatMap((c) => {
    const et = citesteEticheta(c.text);
    if (et === null) return [];
    return [{ linia: c.linia, eticheta: et !== 'stricata' && c.singur && !verificaEticheta(reg, et) ? et : null }];
  });
}

/** Trecerile programului, cu id-ul în lume al etichetei lor, tăiate în intrare, buclă, ieșire. */
function trecerileEtichetate(text: string, reg: Regiune, laDoc: (p: Punct3) => Punct3): Array<{ readonly id: string; readonly latura: string; readonly t: ReturnType<typeof desparte> }> {
  const et = eticheteleProgramului(text, reg);
  return lanturile(citeste(text).evenimente, et.map((e) => e.linia), laDoc).flatMap((l) => {
    const e = l.eticheta >= 0 ? et[l.eticheta]?.eticheta : null;
    return e ? [{ id: e.idLume, latura: e.latura, t: desparte(l.pasi) }] : [];
  });
}

/**
 * Hârtia pe un program al unui caz: fiecare trecere, măsurată (`masoaraIntrari`, cu inelul ei), față de ce cere hârtia
 * pentru forma ei; plus, în cazul cu urechi, urechile numărate din p₀ pe bucla trecerii care le traversează.
 */
function hartie(c: CazIntrari, text: string, m: Montaj): string[] {
  const reg = regiuneDinDocument(c.doc);
  const laDoc = (q: Punct3): Punct3 => laDocument(q, m);
  const rele: string[] = [];
  const treceri = trecerileEtichetate(text, reg, laDoc);
  const masuri = masoaraIntrari(text, laDoc);
  if (masuri.length !== treceri.length) return [`${masuri.length} treceri pe hârtie, ${treceri.length} cu etichetă`];
  const numar = new Map<string, number>();
  treceri.forEach(({ id }, k) => {
    numar.set(id, (numar.get(id) ?? 0) + 1);
    const i = reg.inele.findIndex((x) => x.idLume === id);
    const forma = id.split('/')[0]!;
    const asteptat: AsteptatH = c.asteptat[forma] ?? null;
    const x = masoaraIntrari(text, laDoc, reg, i, c.diametru / 2)[k]!;
    for (const r of comparaIntrarea(x, asteptat)) rele.push(`${id}, trecerea ${numar.get(id)}: ${r}`);
    if (asteptat && x.jocIntrare !== null && Math.abs(x.jocIntrare) > 0.003) rele.push(`${id}: jocul pe intrare ${x.jocIntrare.toFixed(3)}, nu 0 (tangentă în p₀)`);
  });
  if (c.urechi) {
    // Bucla trecerii de 6 mm a ramei (trece de vârful 4): urechile din p₀, ca la ADR 0028 §6, pe P de pe hârtie.
    const t = treceri.filter((x) => x.id === 'a/a').map((x) => x.t).find((x) => x.zMin < -5);
    if (!t) rele.push('trecerea cu urechi a ramei lipsește');
    else {
      let s = 0;
      const bucati: BucataTrecere[] = t.bucla.map((b) => {
        const z = t.pasi.find((q) => q.linia === b.linia)!;
        const x: BucataTrecere = {
          linia: b.linia, cod: b.c ? (b.unghi! > 0 ? 3 : 2) : 1, a: b.a, b: b.b, s0: s, s1: s + b.L, za: z.za, zb: z.zb, scrieZ: false,
          ...(b.c ? { c: b.c, r: b.r!, unghi: b.unghi! } : {}),
        };
        s += b.L;
        return x;
      });
      const tr: Trecere = { liniaPlonjarii: t.pasi[0]!.linia, d: 6, bucati, lungime: s };
      for (const r of comparaCuHartia(masoara(tr, 4), asteptatPeHartie(P_RAMA, 4, 8))) rele.push(`urechile din p₀: ${r}`);
    }
  }
  return rele;
}

// ── (o) Hârtia ───────────────────────────────────────────────────────────────────────────────────────────────────────

test('(o) partea deșeului e DERIVATĂ din așchie (urcarea: așchia groasă la intrarea dintelui) și e cea din textul ADR-ului: stânga la urcare, dreapta la opoziție (M3)', () => {
  const st = aschia('stanga'), dr = aschia('dreapta');
  assert.ok(st.intrare < st.iesire, 'peretele păstrat în stânga, M3: așchia crește = opoziție');
  assert.ok(dr.intrare > dr.iesire, 'peretele păstrat în dreapta, M3: așchia scade = urcare');
  assert.equal(parteaPastrataPrinAschie('urcare'), 'dreapta');
  assert.equal(parteDeseu('urcare'), 'stanga');
  assert.equal(parteDeseu('opozitie'), 'dreapta');
  // Sensul de mers derivat, față de tabelul ADR 0027 (exterior + urcare = orar; interior + urcare = trigonometric).
  assert.equal(mersTrigonometric('exterior', 'urcare'), false);
  assert.equal(mersTrigonometric('interior', 'urcare'), true);
  assert.equal(mersTrigonometric('exterior', 'opozitie'), true);
});

test('(o) §2 pe hârtie: C = p₀ + ρ·n; intrarea și ieșirea sunt sferturi; viteza arcului în p₀ e t₀, pe ambele părți, pentru 16 direcții', () => {
  const s = semicercul({ x: 50, y: 47 }, { x: -1, y: 0 }, 'stanga', 3);
  egal(s.C.x, 50, 'Cx'); egal(s.C.y, 44, 'Cy'); egal(s.A.x, 53, 'Ax'); egal(s.A.y, 44, 'Ay'); egal(s.B.x, 47, 'Bx'); egal(s.B.y, 44, 'By');
  for (let k = 0; k < 16; k++) {
    const u = (k * Math.PI) / 8;
    const t0 = { x: Math.cos(u), y: Math.sin(u) };
    for (const parte of ['stanga', 'dreapta'] as const) {
      const x = semicercul({ x: 1, y: 2 }, t0, parte, 2);
      egal(x.arc.du, parte === 'stanga' ? Math.PI : -Math.PI, 'semicercul are 180°, în sensul părții');
      // Viteza arcului în p₀ (la mijlocul lui): derivata lui C + ρ(cos u, sin u) după u, cu semnul lui du.
      const um = x.arc.u0 + x.arc.du / 2;
      const v = { x: -Math.sin(um) * Math.sign(x.arc.du), y: Math.cos(um) * Math.sign(x.arc.du) };
      egal(v.x, t0.x, `viteza x (${parte}, ${k})`, 1e-12); egal(v.y, t0.y, `viteza y (${parte}, ${k})`, 1e-12);
      // n e în partea cerută: produsul vectorial t₀ × n > 0 ⇔ stânga.
      egal(Math.sign(t0.x * x.n.y - t0.y * x.n.x), parte === 'stanga' ? 1 : -1, 'n e de partea deșeului');
    }
  }
});

test('(o) §3 exact pe găurile circulare: bucla r = R_gaură − 3; ρ încape ⇔ ρ(ρ − r) ≤ r·ε (formula închisă a cercului în cerc); R5,5: 3 nu, 1,5 da; R4: niciuna; la limită', () => {
  const docGaura = (Rg: number): DocV7O => {
    const d = structuredClone(CAZURI_INTRARI[3]!.doc);
    (d.piese[0]!.radacina as unknown as { copii: Array<{ forma: { raza: number } }> }).copii[0]!.forma.raza = Rg;
    return d;
  };
  const verdict = (Rg: number, rho: number): string => {
    const reg = regiuneDinDocument(docGaura(Rg));
    const r = Rg - 3;
    return incape(reg, 0, semicercul({ x: 100 + r, y: 100 }, { x: 0, y: 1 }, 'stanga', rho).arc, 3);
  };
  assert.equal(verdict(5.5, 3), 'nu');
  assert.equal(verdict(5.5, 1.5), 'da');
  assert.equal(verdict(4, 3), 'nu');
  assert.equal(verdict(4, 1.5), 'nu');
  // Pe hârtie: punctul cel mai depărtat de centru e la √((r − ρ)² + ρ²) pentru ρ > r; distanța la perete = R + r − el.
  // r = 2,5: ρ = 2,5 dă exact r (atinge doar bucla): încape; ρ = 2,505: √(0,005² + 2,505²) = 2,505005 → prag 2,995 cu
  // distanța 2,994995: în bandă; ρ = 2,52: 2,52008 → 2,97992 < 2,995 − 0,002: nu.
  assert.equal(verdict(5.5, 2.5), 'da');
  assert.equal(verdict(5.5, 2.505), 'banda');
  assert.equal(verdict(5.5, 2.52), 'nu');
});

test('(o) candidații §3 pe gaura 60 × 40: vârful 0 (103, 103), apoi mijloacele (jos 54, sus 54, dreapta 34, stânga 34); în lectura inversă a indicelui, sus înaintea lui jos', () => {
  const c = CAZURI_INTRARI[2]!;
  const reg = regiuneDinDocument(c.doc);
  const b = buclaAnalitica(reg, 0, 'interior', 3, 'urcare')!;
  const { bucla, laJonctiune } = dinVarful0(b, { x: 103, y: 103 });
  assert.ok(laJonctiune);
  const pe = (o: 'mers' | 'invers'): string => candidatii(bucla, o).map((x) => `${x.p.x},${x.p.y}`).join(' ');
  assert.equal(pe('mers'), '103,103 130,103 130,137 157,120 103,120');
  assert.equal(pe('invers'), '103,103 130,137 130,103 103,120 157,120');
});

test('(o) vârful 0 în afara joncțiunilor (5 mm pe latura de jos a găurii): bucla se taie acolo, nu se lipește de colțul cel mai apropiat', () => {
  const c = CAZURI_INTRARI[2]!;
  const reg = regiuneDinDocument(c.doc);
  const b = buclaAnalitica(reg, 0, 'interior', 3, 'urcare')!;
  const { bucla, laJonctiune } = dinVarful0(b, { x: 108, y: 103 });
  assert.equal(laJonctiune, false);
  const v0 = candidatii(bucla)[0]!;
  assert.deepEqual([v0.p.x, v0.p.y], [108, 103]);
  assert.equal(bucla.length, 5, 'latura de jos tăiată în două');
});

test('(o) alegerea oracolului (§3) pe fiecare caz e cea scrisă de mână (p₀, ρ), cu vârful 0 = startul traseului de pe hârtie', () => {
  for (const c of CAZURI_INTRARI) {
    const reg = regiuneDinDocument(c.doc);
    for (const f of c.forme) {
      const i = reg.inele.findIndex((x) => x.idLume === `${f.id}/${f.id}`);
      const latura = f.latura as 'exterior' | 'interior';
      const b = buclaAnalitica(reg, i, latura, 3, f.sens ?? 'urcare')!;
      // Vârful 0 de pe hârtie: startul traseului orientat (ca în `drumCerut`), citit din bucla analitică.
      const start = b[0]!.tip === 'segment' ? b[0]!.a : (() => { const a = b[0]! as { c: P2; r: number; u0: number }; return { x: a.c.x + a.r * Math.cos(a.u0), y: a.c.y + a.r * Math.sin(a.u0) }; })();
      const lume = lumea(reg, c.stoc, c.diametru);
      const judeca = (a: Parameters<typeof incape>[2]) => incapeTot(reg, i, a, 3, lume, b, `${f.id}/${f.id}`, latura, (c.urechiPe && Object.hasOwn(c.urechiPe, f.id) ? c.urechiPe[f.id] ?? null : c.urechi) !== null).verdict;
      const alegeri = alegerileAcceptate(judeca, c.raza, parteDeseu(f.sens ?? 'urcare'), candidatii(dinVarful0(b, start).bucla));
      const asteptat = c.asteptat[f.id] ?? null;
      assert.equal(alegeri.length, 1, `${c.nume}/${f.id}: o singură alegere, fără bandă`);
      const a = alegeri[0]!;
      if (asteptat === null) { assert.equal(a, null, `${c.nume}/${f.id}: omisă`); continue; }
      assert.ok(a && dist(a.p0, asteptat.p0) < 1e-9 && a.rho === asteptat.rho, `${c.nume}/${f.id}: ${JSON.stringify(a)}`);
    }
  }
});

// ── (o) Scriitorul cum cere contractul ──────────────────────────────────────────────────────────────────────────────

test('(o) scriitorul cum cere contractul: cele 8 cazuri pe 8 montaje trec toată poarta (1–12, viteza pe verticală) și hârtia (p₀, C, ρ, partea, A, unghiurile, jocul; urechile din p₀)', () => {
  const rele: string[] = [];
  let programe = 0;
  for (const c of CAZURI_INTRARI) {
    for (const m of montaje(c.stoc)) {
      const text = programIntrari(c, m);
      programe++;
      const v = poarta(text, ctxCaz(c, m));
      if (v.length) rele.push(`${c.nume} (${descrieM(m)}):\n${mesaje(v.slice(0, 3))}`);
      const h = hartie(c, text, m);
      if (h.length) rele.push(`${c.nume} (${descrieM(m)}): ${h.slice(0, 3).join('; ')}`);
    }
  }
  assert.deepEqual(rele, []);
  assert.equal(programe, CAZURI_INTRARI.length * 8);
});

// ── (o) Martorii negativi ───────────────────────────────────────────────────────────────────────────────────────────

const tabelMartori: string[] = [];

/** Martorii, cu cazurile pe care au sens (indicele cazului, forma). */
/**
 * Martorii, cu cazurile pe care au sens (indicele cazului, forma) și invariantele care TREBUIE să-i prindă pe fiecare
 * program (`cere`; măcar una dintre ele trebuie să fie 12 sau 2, ca martorul să nu treacă doar printr-un efect lateral).
 */
const MARTORI: ReadonlyArray<{ readonly martor: MartorIntrari; readonly cazuri: ReadonlyArray<readonly [number, string]>; readonly nume: string; readonly cere: readonly number[] }> = [
  { martor: 'parte-pastrata', nume: '§8: intrarea pe partea păstrată (latura ghicită)', cazuri: [[0, 'a'], [1, 'a'], [2, 'h'], [3, 'c'], [6, 'g'], [7, 'a']], cere: [2, 9, 12] },
  { martor: 'varf0', nume: '§8: intrarea lăsată în vârful 0 când mușcă', cazuri: [[2, 'h'], [5, 'a'], [7, 'a']], cere: [2] },
  { martor: 'omisa', nume: '§8: intrarea omisă deși una încape', cazuri: [[0, 'a'], [1, 'a'], [2, 'h'], [3, 'c'], [5, 'a'], [6, 'g'], [7, 'a']], cere: [12] },
  { martor: 'iesire-opusa', nume: '§8: ieșirea pe cealaltă parte', cazuri: [[0, 'a'], [1, 'a'], [2, 'h'], [3, 'c'], [6, 'g'], [7, 'a']], cere: [12] },
  { martor: 'pe-bucla', nume: '§8: plonjarea pe buclă în loc de A', cazuri: [[0, 'a'], [2, 'h'], [3, 'c'], [5, 'a'], [7, 'a']], cere: [11, 12] },
  { martor: 'raza-gresita', nume: 'raza 0,8·ρ (nici raza, nici raza/2)', cazuri: [[0, 'a'], [2, 'h'], [3, 'c']], cere: [9, 12] },
  { martor: 'necandidat', nume: 'p₀ la o treime din latură (nu e candidat)', cazuri: [[0, 'a'], [2, 'h'], [5, 'a']], cere: [12] },
  { martor: 'sfert-scurt', nume: 'intrarea și ieșirea de 60°', cazuri: [[0, 'a'], [3, 'c'], [6, 'g']], cere: [12] },
  { martor: 'treceri-diferite', nume: 'a doua trecere cu ρ/2 (alt A)', cazuri: [[0, 'a'], [2, 'h'], [6, 'g']], cere: [11, 12] },
  { martor: 'intrare-dreapta', nume: 'intrarea în linie dreaptă', cazuri: [[0, 'a'], [3, 'c']], cere: [9, 12] },
  { martor: 'fara-iesire', nume: 'intrarea fără ieșire', cazuri: [[0, 'a'], [2, 'h']], cere: [12] },
  { martor: 'centru-opus', nume: 'sensul corect, centrul pe partea păstrată (intrarea sosește invers)', cazuri: [[0, 'a'], [2, 'h'], [3, 'c'], [6, 'g']], cere: [12] },
  { martor: 'netangenta', nume: 'sensul corect, centrul rotit cu 45° (intrarea netangentă)', cazuri: [[0, 'a'], [2, 'h'], [3, 'c'], [6, 'g']], cere: [12] },
  { martor: 'amestecate', nume: 'prima trecere fără intrări, a doua cu ele', cazuri: [[0, 'a'], [2, 'h'], [6, 'g']], cere: [12] },
  { martor: 'netangenta-mica', nume: 'centrul rotit cu 0,02 rad (semicercul încape, dar intrarea nu e tangentă)', cazuri: [[0, 'a'], [2, 'h'], [6, 'g']], cere: [12] },
  // Precizarea din 10.10.
  { martor: 'varf0', nume: '10.10 b: intrarea lăsată în vârful 0 când iese din foaie', cazuri: [[8, 'a']], cere: [5, 12] },
  { martor: 'varf0', nume: '10.10 c: intrarea lăsată în vârful 0 lângă bucla cu urechi a vecinei', cazuri: [[9, 'n']], cere: [12] },
  { martor: 'omisa', nume: '10.10: intrarea omisă deși încape pe foaie și departe de urechi', cazuri: [[8, 'a'], [9, 'n']], cere: [12] },
];

for (const x of MARTORI) {
  test(`(o) martorul „${x.nume}” înroșește poarta și hârtia, pe fiecare caz și pe 2 montaje`, () => {
    const scapa: string[] = [];
    const prinde = new Set<number>();
    let hartiaPrinde = 0, judecate = 0;
    for (const [ci, pentru] of x.cazuri) {
      const c = CAZURI_INTRARI[ci]!;
      for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[5]!]) {
        const text = programIntrari(c, m, { martor: x.martor, pentru });
        judecate++;
        const v = poarta(text, ctxCaz(c, m));
        for (const i of v) prinde.add(i.invarianta);
        if (v.length === 0) scapa.push(`poarta: ${c.nume} (${descrieM(m)})`);
        for (const n of x.cere) if (!v.some((i) => i.invarianta === n)) scapa.push(`poarta, invarianta ${n}: ${c.nume} (${descrieM(m)})`);
        if (hartie(c, text, m).length) hartiaPrinde++;
        else scapa.push(`hârtia: ${c.nume} (${descrieM(m)})`);
      }
    }
    tabelMartori.push(`${x.martor} | ${x.cazuri.length} cazuri × 2 montaje | poarta: ${[...prinde].sort((a, b) => a - b).join(', ')} | hârtia: ${hartiaPrinde}/${judecate}`);
    assert.deepEqual(scapa, []);
  });
}

// ── (o) Amendamentele: programele fără intrări ──────────────────────────────────────────────────────────────────────

test('(o) amendamentele 9, 11 și invarianta 12: pe programele FĂRĂ intrări (scriitorii 2.3a, 2.4, 2.5a cu martorii lor, placa 1 coborâtă și ridicată), invariantele 1–11 dau EXACT verdictele porții de dinainte de ADR 0030; 12 tace pe cele corecte', () => {
  const rele: string[] = [];
  let programe = 0, cuIncalcari = 0, cu12 = 0;
  const judeca = (text: string, ctx: ContextPoarta, unde: string, corect: boolean): void => {
    const nou = poarta(text, ctx), vechi = poarta(text, ctx, { inainteDe0030: true });
    const fara12 = nou.filter((i) => i.invarianta !== 12);
    if (JSON.stringify(fara12) !== JSON.stringify(vechi)) rele.push(`${unde}: nou ${mesaje(fara12.slice(0, 2))} / vechi ${mesaje(vechi.slice(0, 2))}`);
    const doar12 = nou.filter((i) => i.invarianta === 12);
    if (doar12.length) { cu12++; if (corect || vechi.length === 0) rele.push(`${unde}: 12 pe un program ${corect ? 'corect' : 'altfel verde'}: ${mesaje(doar12.slice(0, 2))}`); }
    programe++;
    if (vechi.length) cuIncalcari++;
  };
  const ctxDe = (c: { stoc: Stoc; diametru: number; pas: number; doc: Parameters<typeof regiuneDinDocument>[0] }, m: Montaj): ContextPoarta => ({
    foaie: c.stoc, origine: m.origine, z0: m.z0, diametruScula: c.diametru, pas: c.pas, supracursa: 0, asteptareAx: 3,
    regiune: regiuneDinDocument(c.doc), avansPlonjare: AVANS_PLONJARE,
  });
  for (const c of CAZURI_URECHI) {
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[5]!]) {
      const ctx = { ...ctxDe(c, m), supracursa: c.supracursa };
      for (const o of [{}, { intre: 'coboara' as const }, { martor: 'binar' as const }, { martor: 'centre-k-s' as const }, { martor: 'coarda' as const, pornire: 1 }]) {
        judeca(programCaz(c, m, o), ctx, `${c.nume} ${JSON.stringify(o)}`, Object.keys(o).length === 0);
      }
    }
  }
  for (const c of CAZURI_RAMPA) {
    for (const m of [montaje(c.stoc)[0]!, montaje(c.stoc)[3]!]) {
      const ctx = { ...ctxDe(c, m), supracursa: c.supracursa };
      for (const o of [{}, { martor: 'plonjare' as const }, { martor: 'nerotite' as const }, { martor: 'pana' as const }, { martor: 'flanc' as const }, { rampa: null }]) {
        judeca(programCazRampa(c, m, o), ctx, `${c.nume} ${JSON.stringify(o)}`, Object.keys(o).length === 0);
      }
    }
  }
  for (const m of montaje(STOC_PLACA)) {
    for (const intre of ['coboara', 'ridica'] as const) {
      const doc = PLACA_1(6);
      const mm = { ...m, foaie: { latime: 300, inaltime: 200, grosime: 18 } };
      judeca(programDinTrasee(traseeCerute(doc, 6, { intre }), mm), ctxDe({ stoc: mm.foaie, diametru: 6, pas: 18, doc }, mm), `placa 1 ${intre}`, intre === 'ridica');
      const d1 = docPlaca1();
      judeca(programDinTrasee(traseeCerute(d1, 6, { intre, intoarse: new Set(['e1/e1']) }), m), ctxDe({ stoc: STOC_PLACA, diametru: 6, pas: 18, doc: d1 }, m), `placa 1 întoarsă ${intre}`, false);
    }
  }
  for (const c of corpus().slice(0, 40)) {
    const m: Montaj = { foaie: c.doc.foi[0]!.stoc, origine: c.origine, z0: c.z0 };
    judeca(programDinTrasee(traseeCerute(c.doc, c.diametru, { intre: 'ridica' }), m), ctxDe({ stoc: m.foaie, diametru: c.diametru, pas: 18, doc: c.doc }, m), `corpus 2.3a ${c.nume}`, false);
  }
  console.log(`amendamente: ${programe} programe, ${cuIncalcari} cu încălcări vechi, ${cu12} cu 12 (toate deja roșii)`);
  assert.deepEqual(rele, []);
  assert.ok(programe >= 200 && cuIncalcari >= 40, `${programe} programe, ${cuIncalcari} cu încălcări`);
});

test('(o) amendamentul 9 e necesar: pe programele scriitorului CU intrări, poarta de dinainte de ADR 0030 dă încălcări (9 și 11), cea amendată nu', () => {
  const c = CAZURI_INTRARI[0]!;
  const m = montaje(c.stoc)[0]!;
  const text = programIntrari(c, m);
  const vechi = poarta(text, ctxCaz(c, m), { inainteDe0030: true });
  assert.ok(vechi.some((i) => i.invarianta === 9) && vechi.some((i) => i.invarianta === 11), mesaje(vechi));
  assert.deepEqual(poarta(text, ctxCaz(c, m)), []);
});

test('(o) refuzurile §6 pe etichetă: un program sub o operație cu intrări pe pe-linie, cu intrări și rampă, sau cu raza 0,4 e o încălcare a lui 12 („exportul trebuia refuzat”); raza 0,5 nu', () => {
  const c = CAZURI_INTRARI[0]!;
  const m = montaje(c.stoc)[0]!;
  const text = programIntrari(c, m);
  const cu = (f: (d: DocV7O) => void): DocV7O => { const d = structuredClone(c.doc); f(d); return d; };
  const refuz = (d: DocV7O): boolean => poarta(text, { ...ctxCaz(c, m), regiune: regiuneDinDocument(d) }).some((i) => i.invarianta === 12 && /trebuia refuzat/.test(i.mesaj));
  assert.ok(refuz(cu((d) => { d.piese[0]!.operatii[0]!.rampa = { lungime: 10 }; })), 'intrări și rampă');
  assert.ok(refuz(cu((d) => { d.piese[0]!.operatii[0]!.intrari = { raza: 0.4 }; })), 'raza 0,4');
  assert.ok(!refuz(cu((d) => { d.piese[0]!.operatii[0]!.intrari = { raza: 0.5 }; })), 'raza 0,5 (control)');
  const peLinie = cu((d) => { d.piese[0]!.operatii[0]!.latura = 'pe-linie'; });
  const t2 = text.replace('a/a: dreptunghi, exterior, 6 mm', 'a/a: dreptunghi, pe-linie, 6 mm');
  assert.ok(poarta(t2, { ...ctxCaz(c, m), regiune: regiuneDinDocument(peLinie) }).some((i) => i.invarianta === 12 && /pe-linie/.test(i.mesaj)), 'pe-linie');
});

test('(o) legarea etichetei de operație pe tuplul cu intrări: degroșarea fără intrări și finisarea cu intrări, aceeași adâncime, aceeași etichetă; a doua apariție e a doua operație', () => {
  const c = CAZURI_INTRARI[0]!;
  const m = montaje(c.stoc)[0]!;
  const doc = structuredClone(c.doc);
  const op = doc.piese[0]!.operatii[0]!;
  doc.piese[0]!.operatii = [{ ...op, id: 'deg', intrari: null }, { ...op, id: 'fin', intrari: { raza: 3 } }];
  const fara = programIntrari(c, m, { martor: 'omisa' }).split('\n');
  const cu = programIntrari(c, m).split('\n');
  const text = [...fara.slice(0, fara.indexOf('M5')), ...cu.slice(6)].join('\n');
  assert.deepEqual(poarta(text, { ...ctxCaz(c, m), regiune: regiuneDinDocument(doc) }), []);
  // Invers (întâi cu intrări, apoi fără): prima apariție e legată de degroșare, care n-are intrări.
  const invers = [...cu.slice(0, cu.indexOf('M5')), ...fara.slice(6)].join('\n');
  assert.ok(poarta(invers, { ...ctxCaz(c, m), regiune: regiuneDinDocument(doc) }).some((i) => i.invarianta === 12));
});

test('(o) toleranța închiderii: capătul buclei scris cu 0,001 mm alături de p₀ (rotunjirea postului) e tot o buclă închisă, cu intrare și ieșire', () => {
  const c = CAZURI_INTRARI[2]!;
  const m = montaje(c.stoc)[0]!;
  const L = programIntrari(c, m).split('\n');
  // Ultima mișcare a buclei din prima trecere (înaintea ieșirii, un G3 după bucla G1 a găurii): capătul mutat cu 0,001.
  const k = L.findIndex((l, i) => i > 0 && /^G3 /.test(l) && /^G1 X/.test(L[i - 1]!));
  assert.ok(k > 0);
  L[k - 1] = L[k - 1]!.replace(/X(-?[\d.]+)/, (_, x: string) => `X${(Number(x) + 0.001).toFixed(3)}`);
  const v = poarta(L.join('\n'), ctxCaz(c, m));
  assert.deepEqual(v.filter((i) => i.invarianta === 11 || i.invarianta === 12), [], mesaje(v));
});

test('(o) 12 pe o operație fără intrări: programul scriitorului cu intrări, judecat pe documentul cu intrari: null, e prins (12, și 9 / 11)', () => {
  const c = CAZURI_INTRARI[0]!;
  const m = montaje(c.stoc)[0]!;
  const fara = structuredClone(c.doc);
  for (const p of fara.piese) for (const o of p.operatii) o.intrari = null;
  const v = poarta(programIntrari(c, m), { ...ctxCaz(c, m), regiune: regiuneDinDocument(fara) });
  assert.ok(v.some((i) => i.invarianta === 12 && /n-are intrări/.test(i.mesaj)), mesaje(v));
});

// ── Lipirea cu aplicația ────────────────────────────────────────────────────────────────────────────────────────────

test('lipire: aplicația e pe schema ≥ 7 (ușa primește un v7); pe una mai veche testele de lipire PICĂ, nu se sar', () => {
  assert.ok(SCHEMA >= 7, `schema ${SCHEMA}: lipirea intrărilor cere documentul v7 (ADR 0030)`);
});

/** Primul punct de plonjare al fiecărei tăieturi, pe programul aplicației fără intrări: vârful 0. */
async function varfurile0(doc: DocV7O, m: Montaj): Promise<Map<string, P2>> {
  const fara = structuredClone(doc);
  for (const p of fara.piese) for (const o of p.operatii) o.intrari = null;
  const r = await programulAplicatiei(fara, m);
  if (!r.ok) throw new Error(`fără intrări, aplicația refuză: ${r.motiv}`);
  const reg = regiuneDinDocument(fara);
  const rez = new Map<string, P2>();
  for (const { id, t } of trecerileEtichetate(r.text, reg, (q) => laDocument(q, m))) if (!rez.has(id) && t.p0) rez.set(id, t.p0);
  return rez;
}

for (const c of CAZURI_INTRARI) {
  test(`lipire: ${c.nume}: programul aplicației, pe 8 montaje, trece toată poarta și hârtia; vârful 0 al aplicației e cel de pe hârtie`, async () => {
    assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
    const rele: string[] = [];
    for (const m of montaje(c.stoc)) {
      const r = await programulAplicatiei(c.doc, m);
      if (!r.ok) { rele.push(`${descrieM(m)}: aplicația refuză: ${r.motiv}`); continue; }
      const v = poarta(r.text, ctxCaz(c, m));
      if (v.length) rele.push(`${descrieM(m)}:\n${mesaje(v.slice(0, 4))}`);
      const h = hartie(c, r.text, m);
      if (h.length) rele.push(`${descrieM(m)}: ${h.slice(0, 4).join('; ')}`);
      // ADR 0030 §3: avertismentul intrării omise, pe exact formele omise.
      const omise = c.forme.filter((f) => (c.asteptat[f.id] ?? null) === null).map((f) => `${f.id}/${f.id}`);
      if (r.avertismente === null) rele.push(`${descrieM(m)}: exportul n-are câmpul avertismente (ADR 0030 §3)`);
      else {
        for (const id of omise) if (!r.avertismente.some((a) => a.includes(id) && /intrarea omis/.test(a) && /bucla \d/.test(a))) rele.push(`${descrieM(m)}: lipsește avertismentul pentru ${id}: ${JSON.stringify(r.avertismente)}`);
        // Precizarea din 10.10: raza / 2 se pomenește doar dacă s-a încercat (≥ 0,5).
        const jum = c.raza / 2;
        if (jum < 0.5) {
          const forme = [String(jum), jum.toFixed(1), jum.toFixed(2), jum.toFixed(3)].flatMap((t) => [t, t.replace('.', ',')]);
          for (const a of r.avertismente) if (forme.some((t) => a.includes(t))) rele.push(`${descrieM(m)}: avertismentul pomenește raza / 2 = ${jum}, neîncercată: ${a}`);
        }
        if (r.avertismente.length !== omise.length) rele.push(`${descrieM(m)}: ${r.avertismente.length} avertismente, ${omise.length} intrări omise: ${JSON.stringify(r.avertismente)}`);
      }
      const v0 = await varfurile0(c.doc, m);
      for (const f of c.forme) {
        const asteptat = c.asteptat[f.id];
        if (!asteptat) continue;
        // Vârful 0 de pe hârtie = startul traseului orientat. Pe cazurile cu p₀ = vârful 0, același punct.
        const x = v0.get(`${f.id}/${f.id}`);
        if (!x) rele.push(`${descrieM(m)}: fără vârful 0 pentru ${f.id}`);
      }
    }
    assert.deepEqual(rele, []);
  });
}

test('lipire: refuzurile §6 au motiv (intrări pe pe-linie; intrări și rampă; raza 0,4), iar controalele trec poarta (raza 0,5; aceleași fără intrări)', async () => {
  assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
  const baza = CAZURI_INTRARI[0]!;
  const m = montaje(baza.stoc)[0]!;
  const cu = (f: (d: DocV7O) => void): DocV7O => { const d = structuredClone(baza.doc); f(d); return d; };
  const cazuri: Array<{ nume: string; doc: DocV7O; ok: boolean }> = [
    { nume: 'pe-linie cu intrări', doc: cu((d) => { d.piese[0]!.operatii[0]!.latura = 'pe-linie'; }), ok: false },
    { nume: 'pe-linie fără intrări (control)', doc: cu((d) => { d.piese[0]!.operatii[0]!.latura = 'pe-linie'; d.piese[0]!.operatii[0]!.intrari = null; }), ok: true },
    { nume: 'intrări și rampă', doc: cu((d) => { d.piese[0]!.operatii[0]!.rampa = { lungime: 10 }; }), ok: false },
    { nume: 'rampă fără intrări (control)', doc: cu((d) => { d.piese[0]!.operatii[0]!.rampa = { lungime: 10 }; d.piese[0]!.operatii[0]!.intrari = null; }), ok: true },
    { nume: 'raza 0,4', doc: cu((d) => { d.piese[0]!.operatii[0]!.intrari = { raza: 0.4 }; }), ok: false },
    { nume: 'raza 0,499', doc: cu((d) => { d.piese[0]!.operatii[0]!.intrari = { raza: 0.499 }; }), ok: false },
    { nume: 'raza 0,5 (control)', doc: cu((d) => { d.piese[0]!.operatii[0]!.intrari = { raza: 0.5 }; }), ok: true },
  ];
  const rele: string[] = [];
  for (const x of cazuri) {
    const r = await programulAplicatiei(x.doc, m);
    if (r.ok !== x.ok) rele.push(`${x.nume}: ${r.ok ? 'trece' : `refuzat (${r.motiv})`}`);
    if (!r.ok) { if (!r.motiv.trim()) rele.push(`${x.nume}: refuz fără motiv`); console.log(`  ${x.nume}: ${r.motiv}`); }
    else {
      const v = poarta(r.text, ctxCaz({ ...baza, doc: x.doc }, m));
      if (v.length) rele.push(`${x.nume}: ${mesaje(v.slice(0, 3))}`);
    }
  }
  assert.deepEqual(rele, []);
});

type LipitI = { readonly caz: ReturnType<typeof corpusIntrari>[number]; readonly text: string | null; readonly motiv: string | null; readonly fara: string | null };
let corpusLipit: Promise<LipitI[]> | null = null;
const programeCorpus = (): Promise<LipitI[]> => (corpusLipit ??= (async () => {
  const rez: LipitI[] = [];
  for (const caz of corpusIntrari()) {
    const m = { origine: caz.origine, z0: caz.z0 };
    const r = await programulAplicatiei(caz.doc, m);
    const f = await programulAplicatiei(migreazaV6V7O(caz.v6), m);
    rez.push({ caz, text: r.ok ? r.text : null, motiv: r.ok ? null : r.motiv, fara: f.ok ? f.text : null });
  }
  return rez;
})());

test('lipire: corpusul 2.4 cu intrări la întâmplare (raza 0,5–20; foi de 3–18 mm, toate colțurile, ambele Z0, toate laturile, ambele sensuri, urechi): orice program trece 1, 2, 9, 10, 11, 12 și viteza pe verticală; alegerea §3 e una acceptată de oracol', async () => {
  assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
  const rez = await programeCorpus();
  const rele: string[] = [];
  let programe = 0, cuIntrari = 0, omise = 0, mijloace = 0, raze2 = 0, doarInvers = 0, doarMers = 0, cercuri = 0, egalitati = 0;
  const laturi = new Set<string>();
  for (const x of rez) {
    if (x.text === null) continue;
    programe++;
    const stoc = x.caz.doc.foi[0]!.stoc;
    const pas = Math.max(...x.caz.doc.piese.flatMap((p) => p.operatii.map((o) => o.pas)));
    const m: Montaj = { foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: x.caz.origine, z0: x.caz.z0 };
    const ctx: ContextPoarta = {
      foaie: m.foaie, origine: m.origine, z0: m.z0, diametruScula: x.caz.diametru, pas, supracursa: 0, asteptareAx: 3,
      regiune: regiuneDinDocument(x.caz.doc), avansPlonjare: AVANS_PLONJARE,
    };
    const v = poarta(x.text, ctx).filter((i) => [1, 2, 9, 10, 11, 12].includes(i.invarianta));
    if (v.length) rele.push(`[${x.caz.familie}] ${x.caz.nume} (${x.caz.origine}, ${x.caz.z0}): ${mesaje(v.slice(0, 3))}`);
    // §3: alegerea aplicației față de candidații oracolului, cu vârful 0 din programul fără intrări.
    if (x.fara === null) { rele.push(`${x.caz.nume}: fără intrări, aplicația refuză`); continue; }
    const reg = ctx.regiune!;
    const laDoc = (q: Punct3): Punct3 => laDocument(q, ctx);
    const v0 = new Map<string, P2>();
    for (const { id, latura, t } of trecerileEtichetate(x.fara, reg, laDoc)) if (!v0.has(`${id}|${latura}`) && t.p0) v0.set(`${id}|${latura}`, t.p0);
    const vazute = new Set<string>();
    for (const { id, latura: lt, t } of trecerileEtichetate(x.text, reg, laDoc)) {
      if (lt === 'pe-linie' || vazute.has(id)) continue;
      vazute.add(id);
      const i = reg.inele.findIndex((q) => q.idLume === id);
      if (i < 0) continue;
      const tai = reg.taieturi.get(id)!;
      const latura = reg.inele[i]!.rol === 'piesa' ? 'exterior' : 'interior';
      const intr = tai.intrari?.get(latura) ?? [];
      const sens = tai.sensuri.get(latura) ?? [];
      if (intr.length !== 1 || intr[0] === null) continue; // fără intrări, sau mai multe operații pe același inel
      cuIntrari++;
      laturi.add(latura);
      const b = buclaAnalitica(reg, i, latura, x.caz.diametru / 2, sens[0]!);
      const varf = v0.get(`${id}|${latura}`);
      if (!b || !varf) { rele.push(`${id}: fără buclă analitică sau vârf 0`); continue; }
      const { bucla, laJonctiune } = dinVarful0(b, varf);
      if (!laJonctiune) rele.push(`${x.caz.nume} ${id}: vârful 0 al aplicației (${varf.x.toFixed(3)}, ${varf.y.toFixed(3)}) nu e o joncțiune a buclei analitice`);
      const parte = parteDeseu(sens[0]!);
      const aplicatia = t.intrare.length ? { p0: t.p0!, rho: Math.hypot(t.intrare[0]!.c!.x - t.p0!.x, t.intrare[0]!.c!.y - t.p0!.y) } : null;
      // Pe un cerc închis, oracolul știe doar vârful 0 (antetul din `intrari.ts`): p₀ al aplicației intră ca al doilea
      // candidat (acceptat doar dacă vârful 0 nu încape la o rază mai mare sau egală, și dacă el însuși încape).
      const cercul = bucla.length === 1 && bucla[0]!.tip === 'arc' && Math.abs(bucla[0]!.du) >= 2 * Math.PI - 1e-9 ? bucla[0]! : null;
      const extra = cercul && cercul.tip === 'arc' && aplicatia ? (() => {
        const rad = { x: (aplicatia.p0.x - cercul.c.x) / cercul.r, y: (aplicatia.p0.y - cercul.c.y) / cercul.r };
        return [{ p: aplicatia.p0, t: cercul.du > 0 ? { x: -rad.y, y: rad.x } : { x: rad.y, y: -rad.x }, fel: 'mijloc' as const, indice: -1, lungime: 0 }];
      })() : [];
      if (cercul) cercuri++;
      const lume = lumea(reg, stoc, x.caz.diametru);
      const judeca = (a: Parameters<typeof incape>[2]) => incapeTot(reg, i, a, x.caz.diametru / 2, lume, b, id, latura, (tai.urechi?.get(latura)?.[0] ?? null) !== null).verdict;
      const acc = (o: 'mers' | 'invers'): Alegere[] => alegerileAcceptate(judeca, intr[0]!.raza, parte, [...candidatii(bucla, o), ...extra]);
      const potriveste = (a: Alegere): boolean => (a === null ? aplicatia === null
        : aplicatia !== null && dist(a.p0, aplicatia.p0) <= TOL_CANDIDAT && Math.abs(a.rho - aplicatia.rho) <= 0.003);
      const mers = acc('mers').some(potriveste), invers = acc('invers').some(potriveste);
      const grup = alegerileAcceptate(judeca, intr[0]!.raza, parte, [...candidatii(bucla, 'mers'), ...extra], true).some(potriveste);
      if (!mers && !invers && grup) egalitati++;
      // Precizarea din 10.10: lungimile egale la 1e-6 mm, indicele mai mic (în mers) întâi: doar lectura „mers” e cea cerută.
      if (!mers) {
        rele.push(`${x.caz.nume} ${id}: aplicația alege ${aplicatia ? `p₀ (${aplicatia.p0.x.toFixed(3)}, ${aplicatia.p0.y.toFixed(3)}), ρ ${aplicatia.rho.toFixed(3)}` : 'fără intrări'}; oracolul acceptă ${JSON.stringify(acc('mers').map((a) => (a ? [a.p0, a.rho] : null)))}`);
      }
      if (mers && !invers) doarMers++;
      if (invers && !mers) doarInvers++;
      if (aplicatia === null) omise++;
      else {
        if (aplicatia.rho < intr[0]!.raza - 0.003) raze2++;
        if (dist(aplicatia.p0, varf) > TOL_CANDIDAT) mijloace++;
      }
    }
  }
  const refuzate = rez.filter((x) => x.text === null);
  console.log(`lipire 12: ${rez.length} cazuri, ${programe} programe, ${cuIntrari} bucle cu intrări cerute (${[...laturi].join(', ')}): ${mijloace} pe un mijloc, ${raze2} cu raza/2, ${omise} omise; ${cercuri} pe cercuri (doar vârful 0 știut); ordinea la egalitate: ${doarMers} doar „mers”, ${doarInvers} doar „invers”, ${egalitati} altă ordine în grupul egal; ${refuzate.length} refuzuri`);
  if (refuzate.length) console.log(`  motive: ${[...new Set(refuzate.map((x) => x.motiv))].slice(0, 5).join(' | ')}`);
  assert.deepEqual(rele, []);
  assert.ok(programe >= 60 && cuIntrari >= 100 && laturi.size === 2, `${programe} programe, ${cuIntrari} bucle cu intrări, laturile ${[...laturi].join(', ')}`);
});

test('lipire: un document v7 cu intrari null dă, octet cu octet, programul aceluiași document încărcat ca v6 (corpusul, placa 1 pe 8 montaje); amprentele plăcii 1 rămân', async () => {
  assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
  const rele: string[] = [];
  let comparate = 0;
  const perechi: Array<{ nume: string; v6: DocV6O; m: { origine: Montaj['origine']; z0: Montaj['z0'] } }> = [
    ...corpusIntrari().map((c) => ({ nume: `[${c.familie}] ${c.nume}`, v6: c.v6, m: { origine: c.origine, z0: c.z0 } })),
    ...montaje(STOC_PLACA).flatMap((m) => [
      { nume: `placa 1 (140 × 100) ${descrieM(m)}`, v6: migreazaV5V6O(migreazaV4V5O(docPlaca1())), m },
      { nume: `placa 1 (300 × 200) ${descrieM(m)}`, v6: migreazaV5V6O(migreazaV4V5O(PLACA_1(6))), m },
    ]),
  ];
  for (const p of perechi) {
    const a = await programulAplicatiei(p.v6, p.m);
    const b = await programulAplicatiei(migreazaV6V7O(p.v6), p.m);
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
  console.log(`martorii (martor | cazuri | poarta | hârtia):\n  ${tabelMartori.join('\n  ')}`);
  assert.equal(tabelMartori.length, MARTORI.length);
});
