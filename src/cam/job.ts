import type { Document } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { taieturiFoaie } from '../model/lume.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../ir/ir.ts';
import { profil } from './profil.ts';
import { regiunePastrata, verificaTaietura } from './regiune.ts';
import { apropiereContururi } from '../geom/apropiere.ts';
import { LINIE, type Contur } from '../geom/contur.ts';
import { cutieContur, depasire, largita, type Depasire } from '../geom/cutie.ts';
import { distantaLaContur } from '../geom/distanta.ts';
import { colturiDeDegajat, EPS_COLT, type Degajare } from './degajari.ts';
import { bucataBuclei, lungimeBucla } from './parcurgere.ts';
import { PRAG_REZOLUTIE } from './iesire.ts';
import {
  alegeIntrarea, lungimeSfert, MARJA_SCHELET, RAZA_INTRARE_MINIMA, RAZA_INTRARE_MINIMA_RAMPA, razeIncercate, type IntrareAleasa,
} from './intrari.ts';
import { RAMPA_MINIMA } from './rampaMinima.ts';
import { traseuProfil } from './traseu.ts';
import { EPS_VARF, geometrieUrechi, type GeometrieUrechi, type ParametriUrechi } from './urechi.ts';

/**
 * Traseul x stă la cel puțin D de coloana fiecărei urechi a buclei c, cu urechile numărate de la poziția s pe c (ADR 0031,
 * precizarea din 10.10): coloana urechii k e [c_k − h + R; c_k + h − R], unde puntea ține grosimea (ADR 0028 §2). Cu
 * W = D, coloana e un punct.
 */
function departeDeUrechi(x: Contur, c: Contur, s: number, gu: GeometrieUrechi | string | null, R: number, D: number): boolean {
  if (!gu || typeof gu === 'string') return true;
  return gu.centre.every((cc) => {
    const coloana = bucataBuclei(c, s + cc - gu.h + R, 2 * gu.h - D);
    const p = coloana.varfuri[0]?.p;
    const d = coloana.varfuri.length > 1 ? apropiereContururi(x, coloana).distanta : p ? distantaLaContur(p, x) : Infinity;
    return d >= D;
  });
}

/**
 * Lucrarea: tăieturile primei foi (`taieturiFoaie`, ADR 0025), adică operațiile pieselor pe elementele lor, în fiecare
 * instanță, în ordinea de tăiere a contractului (întâi interioarele, la urmă exterioarele), într-un singur program în IR.
 * Parametrii și scula vin din operații, nu din dialog. O singură sculă pe program până la schimbarea sculei (etapa 3).
 */
export type Regim = {
  readonly turatie: number;
  readonly avans: number;
  readonly avansPlonjare: number;
  readonly zSigur: number;
};

export const REGIM_IMPLICIT: Regim = { turatie: 18000, avans: 1000, avansPlonjare: 300, zSigur: 5 };

/** Cât poate trece o tăietură de fața de jos a foii, în masa de sacrificiu (ADR 0028 §2), în mm. */
export const SUPRACURSA_MAXIMA = 2;

/**
 * `avertismente`: ce n-a putut face lucrarea fără să fie o greșeală, spus omului la export (ADR 0030 §3: intrarea omisă pe
 * o buclă unde nu încape). Programul rămâne corect fără ele.
 */
export type RezultatJob =
  | { readonly ok: true; readonly program: Program; readonly avertismente: readonly string[] }
  | { readonly ok: false; readonly motiv: string };

/**
 * `supracursa`: cât are voie o operație sub fața de jos a foii (mm, 0 … `SUPRACURSA_MAXIMA`). Dialogul nu-l arată încă
 * (vine cu profilul mașinii), deci din interfață e 0.
 */
export function programDinDocument(doc: Document, regim: Regim = REGIM_IMPLICIT, supracursa = 0): RezultatJob {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  if (!(supracursa >= 0 && supracursa <= SUPRACURSA_MAXIMA)) {
    return { ok: false, motiv: `supracursa trebuie să fie între 0 și ${SUPRACURSA_MAXIMA} mm (${supracursa})` };
  }
  const grosime = foaie.stoc.grosime;
  const taieturi = taieturiFoaie(doc, 0);
  if (taieturi.length === 0) return { ok: false, motiv: 'nicio formă n-are o operație de tăiere' };
  const prima = taieturi[0];
  if (!prima) return { ok: false, motiv: 'nicio formă n-are o operație de tăiere' };
  const scula: Scula = { numar: prima.scula.numar, nume: prima.scula.nume, diametru: prima.scula.diametru };
  const alta = taieturi.find((t) => t.scula.numar !== scula.numar || t.scula.diametru !== scula.diametru);
  if (alta) {
    return { ok: false, motiv: `${alta.idLume}: altă sculă (T${alta.scula.numar}, Ø${alta.scula.diametru}) decât T${scula.numar}, Ø${scula.diametru}; schimbarea sculei vine în etapa 3` };
  }
  // Regiunea păstrată (ADR 0026): inelele și includerea lor, înaintea oricărui traseu.
  const regiune = regiunePastrata(taieturi);
  if (!regiune.ok) return { ok: false, motiv: regiune.motiv };
  const miscari: Miscare[] = [];
  const avertismente: string[] = [];
  // Profilele tuturor tăieturilor, o dată. Un profil care nu iese se raportează mai jos, la tăietura lui.
  const profile = taieturi.map((u) => profil(conturElement(u), { latura: u.latura, sens: u.sens, diametruScula: scula.diametru, adancime: u.adancime, pas: u.pas }));
  // Buclele fiecărei tăieturi: ca o degajare să nu se apropie de ele (ADR 0032 §5 a); cele cu urechi, ca o intrare să nu le
  // taie legătura (ADR 0030 §3, condiția c).
  const bucleToate: readonly (readonly Contur[])[] = profile.map((p) => (p.ok ? (p.treceri[0]?.contururi ?? []) : []));
  const bucleCuUrechi: readonly (readonly Contur[])[] = taieturi.map((u, i) => (u.urechi ? (bucleToate[i] ?? []) : []));
  const R = scula.diametru / 2;
  /** Cât trece discul frezei de fiecare latură a foii, pe un traseu (măsura ieșirii din foaie). */
  const iese = (x: Contur): Depasire => depasire(largita(cutieContur(x), R), foaie.stoc.latime, foaie.stoc.inaltime, PRAG_REZOLUTIE);
  for (const [it, t] of taieturi.entries()) {
    // Mai adânc decât foaia înseamnă în masa de sacrificiu (sau în masa mașinii): cel mult supracursa.
    if (t.adancime > grosime + supracursa + 1e-9) {
      return {
        ok: false,
        motiv: supracursa > 0
          ? `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${grosime} mm) plus supracursa (${supracursa} mm)`
          : `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${grosime} mm)`,
      };
    }
    // Urechile (ADR 0028 §2): vârful lor se măsoară de la fața de jos a foii, deci puntea are grosimea cerută oricât de
    // adânc merge tăietura.
    let urechi: ParametriUrechi | undefined;
    if (t.urechi) {
      const g = t.urechi.grosime;
      if (g >= grosime - EPS_VARF) {
        return { ok: false, motiv: `${t.idLume}: urechile de ${g} mm nu încap în foaia de ${grosime} mm` };
      }
      const varf = grosime - g;
      if (t.adancime <= varf + EPS_VARF) {
        return { ok: false, motiv: `${t.idLume}: tăietura de ${t.adancime} mm nu ajunge la vârful urechilor (la ${varf} mm de fața de sus), deci urechile n-ar exista` };
      }
      // Pe axa tăieturii, puntea ține grosimea doar pe W − D (ADR 0028, precizarea din 09.10): mai îngustă decât freza,
      // ar fi mai subțire sau n-ar exista.
      if (t.urechi.latime < scula.diametru - EPS_VARF) {
        return { ok: false, motiv: `${t.idLume}: urechile de ${t.urechi.latime} mm sunt mai scurte decât diametrul frezei (Ø${scula.diametru}), deci puntea de peste tăietură ar fi mai subțire de ${g} mm sau n-ar exista` };
      }
      urechi = { numar: t.urechi.numar, latime: t.urechi.latime, varf };
    }
    const pr = profile[it];
    if (!pr) return { ok: false, motiv: `${t.idLume}: profilul lipsește` };
    if (!pr.ok) return { ok: false, motiv: `${t.idLume}: ${pr.motiv}` };
    // Invarianta 2: trecerile au același traseu în plan, deci se judecă o dată, pe prima.
    const incalcare = verificaTaietura(regiune.regiune, t.idLume, t.latura, pr.treceri[0]?.contururi ?? [], scula.diametru / 2);
    if (incalcare) return { ok: false, motiv: incalcare };
    // Intrările (ADR 0030): alese pe fiecare buclă, verificate exact pe regiunea păstrată; bucla pornește din p₀.
    let treceri = pr.treceri;
    let intrari: (IntrareAleasa | null)[] | undefined;
    if (t.intrari) {
      if (t.latura === 'pe-linie') return { ok: false, motiv: `${t.idLume}: intrările cer o parte de deșeu, iar pe linie freza taie ambii pereți` };
      if (!(t.intrari.raza >= RAZA_INTRARE_MINIMA)) {
        return { ok: false, motiv: `${t.idLume}: raza intrării de ${t.intrari.raza} mm e sub ${RAZA_INTRARE_MINIMA} mm` };
      }
      // ADR 0031 §2: sub rampă, freza coboară pe sfertul intrării, deci el are cel puțin rampa minimă.
      const cuRampa = t.rampa !== null;
      if (cuRampa && !(t.intrari.raza >= RAZA_INTRARE_MINIMA_RAMPA)) {
        return {
          ok: false,
          motiv: `${t.idLume}: raza intrării de ${t.intrari.raza} mm e prea mică pentru rampă: sfertul ei de cerc are ${lungimeSfert(t.intrari.raza).toFixed(3)} mm, sub ${RAMPA_MINIMA} mm`,
        };
      }
      const bucle = pr.treceri[0]?.contururi ?? [];
      const raza = t.intrari.raza;
      intrari = bucle.map((c, j) => {
        const dBucla = iese(c);
        // Urechile buclei înseși (ADR 0031, precizarea din 10.10, la ADR 0030 §3 c): coloana punții fiecărei urechi, pe
        // traseu, e [c_k − h + R; c_k + h − R] numărat de la p₀ (ADR 0028 §2: puntea ține grosimea pe W − D).
        const gu = urechi ? geometrieUrechi(lungimeBucla(c), urechi) : null;
        // ADR 0030 §3: încape dacă (a) ține discul în afara regiunii păstrate, (b) nu iese din foaie mai mult decât bucla,
        // pe nicio latură, și (c) lasă cel puțin 1 mm de material lângă orice altă buclă cu urechi, iar puntea fiecărei
        // urechi a buclei înseși rămâne întreagă (traseul la cel puțin D de coloana ei).
        const incape = (semicerc: Contur, s: number): boolean => {
          if (verificaTaietura(regiune.regiune, t.idLume, t.latura, [semicerc], R) !== null) return false;
          const d = iese(semicerc);
          if (d.stanga > dBucla.stanga || d.dreapta > dBucla.dreapta || d.jos > dBucla.jos || d.sus > dBucla.sus) return false;
          if (!departeDeUrechi(semicerc, c, s, gu, R, scula.diametru)) return false;
          return bucleCuUrechi.every((bs, iu) => bs.every((b, jb) => (iu === it && jb === j)
            || apropiereContururi(semicerc, b).distanta >= scula.diametru + MARJA_SCHELET));
        };
        const ales = alegeIntrarea(c, t.sens, raza, incape, cuRampa);
        if (!ales) {
          const raze = razeIncercate(raza, cuRampa).map((r) => `${r} mm`).join(', ');
          avertismente.push(`${t.idLume}: intrarea omisă pe bucla ${j + 1} (nu încape nicăieri cu raza de ${raze})`);
        }
        return ales;
      });
      const pornite = bucle.map((c, j) => intrari?.[j]?.bucla ?? c);
      treceri = pr.treceri.map((x) => ({ adancime: x.adancime, contururi: pornite }));
    }
    // Degajările (ADR 0032): colțurile concave pentru K, socotite pe desen; fiecare pe bucla care are vârful Q, dacă trece
    // de condițiile de la §5. Altfel, avertisment.
    let degajari: Degajare[][] | undefined;
    if (t.colturi) {
      if (t.latura === 'pe-linie') return { ok: false, motiv: `${t.idLume}: degajările cer o parte de deșeu, iar pe linie freza taie ambii pereți` };
      const bucle = treceri[0]?.contururi ?? [];
      const lista: Degajare[][] = bucle.map(() => []);
      for (const d of colturiDeDegajat(conturElement(t), t.latura, t.sens, R, t.colturi.tip)) {
        const j = bucle.findIndex((c) => c.varfuri.some((x) => Math.hypot(x.p.x - d.q.x, x.p.y - d.q.y) <= EPS_COLT));
        const c = bucle[j];
        // Decalarea a mâncat colțul (laturi prea scurte): nu există Q, deci nici degajare (§2).
        if (!c) continue;
        const drum: Contur = { inchis: false, varfuri: [{ p: d.q, s: LINIE }, { p: d.e, s: LINIE }] };
        const vecine = bucleToate.every((bs, iu) => bs.every((b, jb) => (iu === it && jb === j)
          || apropiereContururi(drum, b).distanta >= scula.diametru + MARJA_SCHELET));
        const gu = urechi ? geometrieUrechi(lungimeBucla(c), urechi) : null;
        const motiv = !vecine ? 'prea aproape de altă buclă' : !departeDeUrechi(drum, c, 0, gu, R, scula.diametru) ? 'ar tăia puntea unei urechi' : null;
        if (motiv) {
          avertismente.push(`${t.idLume}: degajarea omisă la colțul (${d.v.x.toFixed(3)}, ${d.v.y.toFixed(3)}): ${motiv}`);
          continue;
        }
        lista[j]?.push(d);
      }
      degajari = lista;
    }
    const tr = traseuProfil(treceri, regim, urechi, t.rampa ? { lungime: t.rampa.lungime } : undefined, intrari, degajari);
    if (!tr.ok) return { ok: false, motiv: `${t.idLume}: ${tr.motiv}` };
    miscari.push({ tip: 'eticheta', text: `${t.idLume}: ${t.forma.tip}, ${t.latura}, ${t.adancime} mm`, element: t.idLume });
    // Fără `push(...listă)`: o listă foarte lungă depășește stiva de argumente.
    for (const m of tr.miscari) miscari.push(m);
  }
  return { ok: true, program: { axe: AXE_XYZ, scula, turatie: regim.turatie, zSigur: regim.zSigur, miscari }, avertismente };
}
