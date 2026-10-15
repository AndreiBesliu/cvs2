/**
 * Ajutoarele oracolului intrărilor cu rampă (ADR 0031), comune celor trei fișiere de teste
 * (`intrari-rampa.oracol.test.ts`, `intrari-rampa.corpus.oracol.test.ts`, `intrari-rampa.octeti.oracol.test.ts`).
 * Mutate neschimbate din fișierul scris de sesiunea oracolului; împărțirea e doar ca fișierele să ruleze în paralel.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Punct3 } from '../oracles/gcode.ts';
import { laDocument, poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import type { DocV7O } from '../oracles/document.ts';
import { citesteEticheta, peOParte, regiuneDinDocument } from '../oracles/regiune.ts';
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

export const AVANS_PLONJARE = 300;
export const SCHEMA = await schemaAplicatiei();
export const R = 3;
export const mesaje = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n');
export const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
export const montaje = (foaie: Stoc): Montaj[] => COLTURI.flatMap((origine) => (['sus', 'jos'] as const).map((z0) => ({ foaie, origine, z0 })));
export const descrieM = (m: Montaj): string => `${m.origine}, Z0 ${m.z0}`;
export const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(p.x - q.x, p.y - q.y);

export function ctxDe(c: { readonly stoc: Stoc; readonly doc: DocV7O }, m: Montaj): ContextPoarta {
  return { foaie: c.stoc, origine: m.origine, z0: m.z0, diametruScula: 6, pas: 3, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(c.doc), avansPlonjare: AVANS_PLONJARE };
}

/** Numerele dintr-un text (cu punct sau virgulă zecimală). */
export const numerele = (s: string): number[] => [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((x) => Number(x[0].replace(',', '.')));

// ---------------------------------------------------------------------------------------------------------------
// Hârtia pe un program al unui caz.

export type Hartie = { readonly rele: string[]; readonly scos: number[] };

/**
 * Hârtia pe un program: fiecare parcurgere cu intrare e legată de forma cu p₀-ul ei (pe hârtie) și comparată cu §3;
 * trecerile unei bucle vin una după alta; bucla omisă e comparată cu rampa ADR 0029 pe perimetrul analitic; urechile
 * din p₀ (cazul cu urechi); câmpul de înălțimi în jurul fiecărui cerc al intrării.
 */
export function hartie(c: CazIR, text: string, m: Montaj): Hartie {
  const laDoc = (q: Punct3): Punct3 => laDocument(q, m);
  const rele: string[] = [];
  const scos: number[] = [];
  const masuri = masoaraIntrariCuRampa(text, laDoc);
  const parcurgeri = parcurgeriHartie(text, laDoc);
  const cu = c.forme.filter((f) => c.asteptat[f.id]);
  const omise = c.forme.filter((f) => !c.asteptat[f.id]);
  const numar = new Map<string, number>();
  const ordine: string[] = [];
  masuri.forEach((x: MasuraIR, k) => {
    if (!x.cuIntrare) {
      // Bucla omisă: rampa ADR 0029 din vârful 0, pe perimetrul analitic (o singură formă omisă pe caz).
      const f = omise[0];
      const om = f ? c.omisa?.[f.id] : undefined;
      if (!f || !om) { rele.push(`parcurgerea ${k + 1} n-are intrare, dar hârtia cere intrare pe fiecare formă`); return; }
      ordine.push(f.id);
      const u = urechiDe(c, f.id);
      const varf = u ? c.stoc.grosime - u.grosime : Infinity;
      const fund = (q: number, d: number): number => (u && d > varf ? zProfil(profil(om.P, u, varf, d)!, q) : -d);
      const mr = masoaraRampa(parcurgeri[k]!, om.P, om.zone ?? [], fund, c.d, c.rampa);
      // ALEGERE: unde rampa trece printr-o zonă de ureche chiar din vârful 0 (gaura R8: zona 0 începe la 0,385), panta
      // coborârii nu se poate măsura pe hârtie (bucățile din zone se sar); Z(σ) exact îl judecă invarianta 11.
      for (const r of comparaRampa(mr, asteptatRampa(om.P, c.rampa, om.zone ?? [], c.d))) if (!(om.zone?.length && /coboară pe/.test(r))) rele.push(`${f.id} (omisă, ADR 0029): ${r}`);
      if (mr.some((t, j) => Math.abs(t.sigma - (om.e[j]! + j * om.P)) > 0.003 + 0.0042 * t.theta)) rele.push(`${f.id}: intrările rampei nu sunt cele scrise de mână`);
      return;
    }
    const f = cu.find((q) => x.p0 && dist(x.p0, c.asteptat[q.id]!.p0) <= 0.003);
    if (!f) { rele.push(`parcurgerea ${k + 1}: p₀ ${x.p0 ? `(${x.p0.x.toFixed(3)}, ${x.p0.y.toFixed(3)})` : 'lipsă'} nu e al niciunei forme de pe hârtie`); return; }
    ordine.push(f.id);
    const j = numar.get(f.id) ?? 0;
    numar.set(f.id, j + 1);
    const h = c.asteptat[f.id]!;
    const a: AsteptatIR = { A: h.A, p0: h.p0, C: h.C, rho: h.rho, semn: h.parte === 'stanga' ? 1 : -1, d: c.d[j] ?? NaN, avans: 1000, avansPlonjare: AVANS_PLONJARE };
    for (const r of comparaIntrareCuRampa(x, a)) rele.push(`${f.id}, trecerea ${j + 1}: ${r}`);
  });
  for (const f of cu) if ((numar.get(f.id) ?? 0) !== c.d.length) rele.push(`${f.id}: ${numar.get(f.id) ?? 0} treceri cu intrare, nu ${c.d.length}`);
  // ADR 0031 §3: fiecare buclă, cu toate trecerile ei, înaintea buclei următoare.
  const grupe = ordine.filter((id, k) => k === 0 || ordine[k - 1] !== id);
  if (new Set(grupe).size !== grupe.length) rele.push(`trecerile buclelor sunt intercalate: ${ordine.join(' ')}`);
  // Precizarea din 10.10 (urechile buclei înseși): puntea fiecărei urechi rămâne întreagă (fundul ≥ −vârf) de-a lungul
  // coloanei, în secțiunea fantei; p₀ = cel de pe hârtie, sau vârful 0 (startul lanțului) pe bucla omisă.
  for (const r of punti(c, text, m, masuri.find((x) => !x.cuIntrare)?.A)) rele.push(r);
  // Urechile din p₀, pe trecerea care le traversează (ca la ADR 0030 §8): bucla ramei la d = 6.
  if (c.urechi && c.asteptat['a']) {
    const k = masuri.findIndex((x) => x.cuIntrare && x.p0 && dist(x.p0, c.asteptat['a']!.p0) <= 0.003 && x.zFund < -5);
    if (k < 0) rele.push('trecerea cu urechi a ramei lipsește');
    else {
      const t = desparteCuRampa(parcurgeri[k]!) ?? desparte(parcurgeri[k]!);
      let s = 0;
      const bucati: BucataTrecere[] = t.bucla.map((b: Bucata) => {
        const z = t.pasi.find((q: PasL) => q.linia === b.linia)!;
        const x: BucataTrecere = {
          linia: b.linia, cod: b.c ? (b.unghi! > 0 ? 3 : 2) : 1, a: b.a, b: b.b, s0: s, s1: s + b.L, za: z.za, zb: z.zb, scrieZ: false,
          ...(b.c ? { c: b.c, r: b.r!, unghi: b.unghi! } : {}),
        };
        s += b.L;
        return x;
      });
      const tr: Trecere = { liniaPlonjarii: t.pasi[0]!.linia, d: 6, bucati, lungime: s };
      for (const r of comparaCuHartia(masoara(tr, 4), asteptatPeHartie(P_RAMA_IR, 4, 8))) rele.push(`urechile din p₀: ${r}`);
    }
  }
  // Câmpul de înălțimi în jurul cercului fiecărei intrări: nicio mișcare peste pas; intrarea și ieșirea scot pasul.
  for (const f of cu) {
    const h = c.asteptat[f.id]!;
    const w = h.rho + R + 1.5;
    const fe = { x0: h.C.x - w, y0: h.C.y - w, x1: h.C.x + w, y1: h.C.y + w, celula: 0.05 };
    const camp = campul(text, laDoc, R, fe);
    for (const [linia, v] of camp.scos) {
      scos.push(v);
      if (v > c.pas + 0.002) rele.push(`${f.id}: linia ${linia} scoate ${v.toFixed(3)} mm (pasul ${c.pas})`);
    }
    // Pe fiecare trecere, intrarea scoate exact pasul (lângă p₀, înaintea buclei), iar ieșirea cât cere hârtia.
    masuri.forEach((x, k) => {
      if (!x.cuIntrare || !x.p0 || dist(x.p0, h.p0) > 0.003) return;
      const t = desparteCuRampa(parcurgeri[k]!) ?? desparte(parcurgeri[k]!);
      for (const [ce, bucati, cerut] of [['intrarea', t.intrare, c.pas], ['ieșirea', t.iesire, c.iesireScoate ?? c.pas]] as const) {
        const max = Math.max(0, ...bucati.map((b) => camp.scos.get(b.linia) ?? 0));
        if (Math.abs(max - cerut) > 0.002) rele.push(`${f.id}, linia ${bucati[0]?.linia}: ${ce} scoate cel mult ${max.toFixed(3)} mm, nu ${cerut}`);
      }
    });
    for (const q of c.puncte ?? []) {
      if (Math.hypot(q.x - h.C.x, q.y - h.C.y) > w) continue;
      const i = Math.floor((q.x - fe.x0) / fe.celula), j = Math.floor((q.y - fe.y0) / fe.celula);
      const cx = fe.x0 + (i + 0.5) * fe.celula, cy = fe.y0 + (j + 0.5) * fe.celula;
      const cerut = typeof q.z === 'number' ? q.z : q.z(cx, cy);
      const panta = c.d[c.d.length - 1]! / ((Math.PI * h.rho) / 2);
      const tol = typeof q.z === 'number' ? 0.002 : panta * (fe.celula / 3 + 0.002) + 0.002;
      const z = camp.fund(q.x, q.y);
      if (Math.abs(z - cerut) > tol) rele.push(`${f.id}: fundul în ${q.de} e ${z.toFixed(3)}, nu ${cerut.toFixed(3)} (±${tol.toFixed(3)})`);
    }
  }
  return { rele, scos };
}

/**
 * Antetul programului și blocurile unei etichete (`(<id>: …, <latura>, …)` până la eticheta următoare sau M5): doar
 * tăietura însăși (o operație pe-linie pe același element nu intră).
 */
export function programulEtichetei(text: string, id: string, latura = ''): string {
  const L = text.split('\n');
  const cap = L.findIndex((l) => /^G4 P/.test(l));
  const out = L.slice(0, cap + 1);
  let a = false;
  for (const l of L.slice(cap + 1)) {
    if (/^\(/.test(l)) { a = l.startsWith(`(${id}:`) && l.includes(`, ${latura}`); continue; }
    if (/^M5/.test(l)) break;
    if (a) out.push(l);
  }
  out.push('M5', 'M30', '');
  return out.join('\n');
}

/**
 * Punțile urechilor pe un program oarecare (corpus): pe fiecare tăietură exterior / interior cu O SINGURĂ operație, cu
 * urechi, p₀ citit din program (prima trecere a etichetei: capătul intrării, sau startul buclei fără intrare), bucla
 * analitică a inelului, programul doar al etichetei; fundul pe coloane ≥ −vârf (foaia documentului minus g).
 */
export function puntiProgram(doc: DocV7O, text: string, ctx: ContextPoarta): { readonly rele: string[]; readonly punti: number } {
  const rele: string[] = [];
  let punti = 0;
  const reg = ctx.regiune!;
  const laDoc = (q: Punct3): Punct3 => laDocument(q, ctx);
  const R2 = ctx.diametruScula / 2;
  const T = doc.foi[0]!.stoc.grosime;
  const ev = citeste(text);
  const et = ev.comentarii.flatMap((c) => { const e = citesteEticheta(c.text); return e && e !== 'stricata' && c.singur ? [{ linia: c.linia, eticheta: e }] : []; });
  const vazute = new Set<string>();
  for (const l of lanturile(ev.evenimente, et.map((e) => e.linia), laDoc)) {
    const e = l.eticheta >= 0 ? et[l.eticheta]!.eticheta : null;
    if (!e || e.latura === 'pe-linie' || peOParte(e.latura) || vazute.has(e.idLume)) continue;
    vazute.add(e.idLume);
    const tai = reg.taieturi.get(e.idLume);
    const ops = tai?.urechi?.get(e.latura) ?? [];
    const sens = tai?.sensuri.get(e.latura) ?? [];
    if (ops.length !== 1 || !ops[0] || !sens[0]) continue;
    const u = ops[0];
    const i = reg.inele.findIndex((q) => q.idLume === e.idLume);
    const bucla = i >= 0 ? buclaAnalitica(reg, i, e.latura, R2, sens[0]) : null;
    const t = desparteCuRampa(l.pasi) ?? desparte(l.pasi);
    if (!bucla || !t.p0) continue;
    for (const x of punteleUrechilor(programulEtichetei(text, e.idLume, e.latura), laDoc, bucla, t.p0, u, R2)) {
      punti++;
      if (x.zMin < -(T - u.grosime) - 0.002) rele.push(`${e.idLume}: puntea urechii ${x.k} tăiată până la ${x.zMin.toFixed(3)} (vârful −${(T - u.grosime).toFixed(3)})`);
    }
  }
  return { rele, punti };
}

/** Urechile formei (pe formă, sau ale cazului). */
export const urechiDe = (c: CazIR, id: string) => (c.urechiPe && Object.hasOwn(c.urechiPe, id) ? c.urechiPe[id] ?? null : c.urechi);

/**
 * Punțile urechilor pe un program (precizarea din 10.10 a ADR 0031): pe fiecare formă cu urechi, fundul de-a lungul
 * coloanei fiecărei urechi, pe bucla analitică pornită din p₀ (`asteptat`, `p0` dat pentru forma omisă), nu sub −vârf.
 */
export function punti(c: CazIR, text: string, m: Montaj, p0Omis?: { x: number; y: number }, asteptat: Readonly<Record<string, AsteptatH>> = c.asteptat): string[] {
  const rele: string[] = [];
  const reg = regiuneDinDocument(c.doc);
  for (const f of c.forme) {
    const u = urechiDe(c, f.id);
    if (!u) continue;
    const p0 = asteptat[f.id]?.p0 ?? p0Omis;
    const i = reg.inele.findIndex((x) => x.idLume === `${f.id}/${f.id}`);
    const bucla = i >= 0 ? buclaAnalitica(reg, i, f.latura as 'exterior' | 'interior', R, f.sens ?? 'urcare') : null;
    if (!p0 || !bucla) { rele.push(`${f.id}: fără p₀ sau buclă pentru punți`); continue; }
    const varf = c.stoc.grosime - u.grosime;
    // Doar mișcările tăieturii însăși (eticheta ei): vecinele mai apropiate de 2D pot tăia o ureche (ADR 0030, „Limitele”).
    for (const x of punteleUrechilor(programulEtichetei(text, `${f.id}/${f.id}`, f.latura), (q) => laDocument(q, m), bucla, p0, u, R)) {
      if (x.esantioane < 5) rele.push(`${f.id}: puntea urechii ${x.k} are doar ${x.esantioane} eșantioane garantate`);
      if (x.zMin < -varf - 0.002) rele.push(`${f.id}: puntea urechii ${x.k} e tăiată până la ${x.zMin.toFixed(3)} (lângă ${x.la.x.toFixed(3)}, ${x.la.y.toFixed(3)}), sub vârful −${varf}`);
    }
  }
  return rele;
}

// ── (o) Hârtia ───────────────────────────────────────────────────────────────────────────────────────────────────────
