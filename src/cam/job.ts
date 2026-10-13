import { esteCaleDeschisa, type Document } from '../model/document.ts';
import { conturDeTaiat } from './contur.ts';
import { judecaDeschisa, refuzDeschise } from './deschise.ts';
import { conturElement } from '../model/forme.ts';
import { taieturiFoaie, type Taietura } from '../model/lume.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../ir/ir.ts';
import { profil } from './profil.ts';
import { MOTIV_PARTE, regiunePastrata, verificaTaietura } from './regiune.ts';
import { apropiereContururi, distantaCutii } from '../geom/apropiere.ts';
import { LINIE, type Contur } from '../geom/contur.ts';
import { cutieContur, depasire, largita, type Cutie, type Depasire } from '../geom/cutie.ts';
import { curataIntrare } from '../geom/offset.ts';
import { distantaLaContur } from '../geom/distanta.ts';
import { arceSubRaza, colturiCurbe, colturiDeDegajat, cubiceSubRaza, EPS_COLT, type Degajare } from './degajari.ts';
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
    const d = coloana.varfuri.length > 1 ? apropiereContururi(x, coloana, D).distanta : p ? distantaLaContur(p, x) : Infinity;
    return d >= D;
  });
}

/**
 * Lucrarea: tăieturile primei foi (`taieturiFoaie`, ADR 0025), adică operațiile pieselor pe elementele lor, în fiecare
 * instanță, în ordinea de tăiere a contractului (întâi interioarele, apoi exterioarele, la urmă despărțirile foii marcate de
 * om, ADR 0037 §8), într-un singur program în IR.
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
  // Conturul de tăiat al fiecărui element (ADR 0034 §6): o singură dată, în lume, cu cubicele ca biarce (ADR 0033 §7).
  // Același contur îl folosesc regiunea păstrată, profilul, degajările și avertismentele.
  const contururi = new Map<string, Contur>();
  for (const t of taieturi) {
    if (contururi.has(t.idLume)) continue;
    const r = conturDeTaiat(t);
    if (!r.ok) return { ok: false, motiv: `${t.idLume}: ${r.motiv}` };
    contururi.set(t.idLume, r.contur);
  }
  const conturDe = (t: Taietura): Contur => contururi.get(t.idLume) as Contur;
  // Căile deschise (ADR 0037 §9): laturile care nu se potrivesc cu `inchis`, ce vine mai târziu pe ele și calea degenerată,
  // refuzate cu motiv înaintea regiunii (o cale deschisă n-are arie, deci nu poate fi inel) și a oricărui traseu.
  const refuz = refuzDeschise(taieturi, contururi);
  if (refuz) return { ok: false, motiv: refuz };
  // Regiunea păstrată (ADR 0026): inelele și includerea lor, înaintea oricărui traseu.
  const regiune = regiunePastrata(taieturi, contururi);
  if (!regiune.ok) return { ok: false, motiv: regiune.motiv };
  const miscari: Miscare[] = [];
  const avertismente: string[] = [];
  // Profilele tuturor tăieturilor, o dată. Un profil care nu iese se raportează mai jos, la tăietura lui. Pe o parte
  // (stânga / dreapta) nu se ajunge aici: refuzul de mai sus o oprește până la 2.3c-5.
  const profile = taieturi.map((u) => (u.latura === 'stanga' || u.latura === 'dreapta'
    ? { ok: false as const, motiv: MOTIV_PARTE }
    : profil(conturDe(u), { latura: u.latura, sens: u.sens, diametruScula: scula.diametru, adancime: u.adancime, pas: u.pas })));
  // Buclele fiecărei tăieturi: ca o degajare să nu se apropie de ele (ADR 0032 §5 a); cele cu urechi, ca o intrare să nu le
  // taie legătura (ADR 0030 §3, condiția c).
  const bucleToate: readonly (readonly Contur[])[] = profile.map((p) => (p.ok ? (p.treceri[0]?.contururi ?? []) : []));
  const bucleCuUrechi: readonly (readonly Contur[])[] = taieturi.map((u, i) => (u.urechi ? (bucleToate[i] ?? []) : []));
  const cutiiBucle: readonly (readonly Cutie[])[] = bucleToate.map((bs) => bs.map(cutieContur));
  const prag = scula.diametru + MARJA_SCHELET;
  /** Distanța de la x la bucla jb a tăieturii iu e cel puțin `prag`; cutiile sunt o margine de jos, deci o sar pe cele departe. */
  const departeDeBucla = (x: Contur, cx: Cutie, iu: number, jb: number): boolean => {
    const cb = cutiiBucle[iu]?.[jb];
    const b = bucleToate[iu]?.[jb];
    return !cb || !b || distantaCutii(cx, cb) >= prag || apropiereContururi(x, b, prag).distanta >= prag;
  };
  const R = scula.diametru / 2;
  // Degajările candidate (ADR 0032 §5 a, precizarea din 11.10): colțurile fiecărei tăieturi cu degajări, pe conturul curățat
  // ca la offset, cu Q pe o buclă și cu drumul departe de traseele celorlalte bucle. Ele se judecă apoi și între ele: două
  // candidate a două bucle diferite, mai apropiate de D + 1 mm, se omit amândouă (ordinea tăieturilor nu contează).
  type Candidat = { readonly d: Degajare; readonly j: number; readonly drum: Contur; readonly cutie: Cutie; readonly departe: boolean };
  const candidati: readonly (readonly Candidat[])[] = taieturi.map((u, iu) => {
    const bs = bucleToate[iu] ?? [];
    if (!u.colturi || (u.latura !== 'exterior' && u.latura !== 'interior') || bs.length === 0) return [];
    const curat = curataIntrare(conturDe(u));
    const rez: Candidat[] = [];
    for (const d of colturiDeDegajat(curat.ok ? curat.contur : conturDe(u), u.latura, u.sens, R, u.colturi.tip)) {
      // Decalarea a mâncat colțul (laturi prea scurte): nu există Q, deci nici degajare (§2).
      const j = bs.findIndex((c) => c.varfuri.some((x) => Math.hypot(x.p.x - d.q.x, x.p.y - d.q.y) <= EPS_COLT));
      if (j < 0) continue;
      const drum: Contur = { inchis: false, varfuri: [{ p: d.q, s: LINIE }, { p: d.e, s: LINIE }] };
      const cutie = cutieContur(drum);
      const departe = bucleToate.every((bb, ib) => bb.every((_, jb) => (ib === iu && jb === j) || departeDeBucla(drum, cutie, ib, jb)));
      rez.push({ d, j, drum, cutie, departe });
    }
    return rez;
  });
  /** Drumul candidatului (iu, j) stă la cel puțin D + 1 mm de drumurile candidate ale celorlalte bucle. */
  const departeDeDegajari = (x: Candidat, iu: number): boolean => candidati.every((cs, ib) => cs.every((y) => !y.departe
    || (ib === iu && y.j === x.j) || distantaCutii(x.cutie, y.cutie) >= prag || apropiereContururi(x.drum, y.drum, prag).distanta >= prag));
  /** Cât trece discul frezei de fiecare latură a foii, pe un traseu (măsura ieșirii din foaie). */
  const iese = (x: Contur): Depasire => depasire(largita(cutieContur(x), R), foaie.stoc.latime, foaie.stoc.inaltime, PRAG_REZOLUTIE);
  for (const [it, t] of taieturi.entries()) {
    // Pe o parte nu se ajunge aici (refuzul căilor deschise, mai sus); garda dă doar tipul laturii.
    const latura = t.latura;
    if (latura === 'stanga' || latura === 'dreapta') return { ok: false, motiv: `${t.idLume}: ${MOTIV_PARTE}` };
    // Mai adânc decât foaia înseamnă în masa de sacrificiu (sau în masa mașinii): cel mult supracursa.
    if (t.adancime > grosime + supracursa + 1e-9) {
      return {
        ok: false,
        motiv: supracursa > 0
          ? `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${grosime} mm) plus supracursa (${supracursa} mm)`
          : `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${grosime} mm)`,
      };
    }
    // Calea deschisă (ADR 0037 §8, §10): despărțirea marcată, tăietura prin foaie care ajunge la marginea foii, apoi
    // avertismentele. Pe linie, traseul e chiar calea, în lume.
    if (esteCaleDeschisa(t.forma)) {
      const j = judecaDeschisa(t, conturDe(t), regiune.regiune, foaie.stoc, scula.diametru);
      if (!j.ok) return { ok: false, motiv: j.motiv };
      for (const a of j.avertismente) avertismente.push(a);
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
    const incalcare = verificaTaietura(regiune.regiune, t.idLume, latura, pr.treceri[0]?.contururi ?? [], scula.diametru / 2);
    if (incalcare) return { ok: false, motiv: incalcare };
    // Intrările (ADR 0030): alese pe fiecare buclă, verificate exact pe regiunea păstrată; bucla pornește din p₀.
    let treceri = pr.treceri;
    let intrari: (IntrareAleasa | null)[] | undefined;
    if (t.intrari) {
      if (latura === 'pe-linie') return { ok: false, motiv: `${t.idLume}: intrările cer o parte de deșeu, iar pe linie freza taie ambii pereți` };
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
          if (verificaTaietura(regiune.regiune, t.idLume, latura, [semicerc], R) !== null) return false;
          const d = iese(semicerc);
          if (d.stanga > dBucla.stanga || d.dreapta > dBucla.dreapta || d.jos > dBucla.jos || d.sus > dBucla.sus) return false;
          if (!departeDeUrechi(semicerc, c, s, gu, R, scula.diametru)) return false;
          return bucleCuUrechi.every((bs, iu) => bs.every((b, jb) => (iu === it && jb === j)
            || apropiereContururi(semicerc, b, scula.diametru + MARJA_SCHELET).distanta >= scula.diametru + MARJA_SCHELET));
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
    // de condițiile de la §5, în ordine (a: traseele, apoi drumurile candidate ale celorlalte bucle; b: urechile buclei
    // tăiate, numărate de la pornirea ei; c: marginea foii). Altfel, avertisment cu primul motiv.
    let degajari: Degajare[][] | undefined;
    if (t.colturi) {
      if (latura === 'pe-linie') return { ok: false, motiv: `${t.idLume}: degajările cer o parte de deșeu, iar pe linie freza taie ambii pereți` };
      // Arcele sub raza frezei se socotesc pe DESEN (recenzia 2.7b): arcele biarcelor unei cubice nu sunt colțuri, iar o
      // curbă strânsă se spune o dată, nu pe fiecare arc al ei.
      const desen = conturElement(t);
      const curat = curataIntrare(desen);
      for (const r of arceSubRaza(curat.ok ? curat.contur : desen, latura, t.sens, R)) {
        avertismente.push(`${t.idLume}: colțul rotunjit cu raza ${r.toFixed(3)} mm (sub raza frezei, ${R.toFixed(3)} mm) rămâne cu raza frezei; degajarea pe arce vine cu importul SVG`);
      }
      for (const c of cubiceSubRaza(desen, latura, t.sens, R)) {
        avertismente.push(`${t.idLume}: curba de lângă (${c.p.x.toFixed(3)}, ${c.p.y.toFixed(3)}) se strânge până la raza ${c.raza.toFixed(3)} mm (sub raza frezei, ${R.toFixed(3)} mm): freza o rotunjește`);
      }
      const bucle = treceri[0]?.contururi ?? [];
      const lista: Degajare[][] = bucle.map(() => []);
      for (const x of candidati[it] ?? []) {
        const c = bucle[x.j];
        if (!c) continue;
        const gu = urechi ? geometrieUrechi(lungimeBucla(c), urechi) : null;
        // c: pe fiecare latură a foii, discul de pe drum stă la cel puțin 1 mm de ea, sau cel puțin cât bucla, dacă ea e mai
        // aproape (sau iese).
        const dc = largita(x.cutie, R), bc = largita(cutieContur(c), R);
        const W = foaie.stoc.latime, H = foaie.stoc.inaltime;
        const margine = [[dc.minX, bc.minX], [W - dc.maxX, W - bc.maxX], [dc.minY, bc.minY], [H - dc.maxY, H - bc.maxY]]
          .every(([gd, gb]) => (gd ?? 0) >= Math.min(MARJA_SCHELET, gb ?? 0) - 1e-9);
        const motiv = !x.departe ? 'prea aproape de altă buclă'
          : !departeDeDegajari(x, it) ? 'prea aproape de degajarea altei bucle'
            : !departeDeUrechi(x.drum, c, 0, gu, R, scula.diametru) ? 'ar tăia puntea unei urechi'
              : !margine ? 'prea aproape de marginea foii' : null;
        if (motiv) {
          avertismente.push(`${t.idLume}: degajarea omisă la colțul (${x.d.v.x.toFixed(3)}, ${x.d.v.y.toFixed(3)}): ${motiv}`);
          continue;
        }
        lista[x.j]?.push(x.d);
      }
      degajari = lista;
      // Colțurile desenului cu o latură curbă nu primesc degajare (ADR 0032, doar între două linii): spuse, nu omise pe
      // tăcute (recenzia 2.7b), dacă freza ajunge la ele (o buclă trece la cel mult 2·R/cos(θ/2) de colț) și dacă biarcele
      // nu le-au dat totuși două linii, deci o degajare.
      const aici = (p: { x: number; y: number }, q: { x: number; y: number }): boolean => Math.hypot(p.x - q.x, p.y - q.y) <= EPS_COLT;
      for (const c of colturiCurbe(desen, latura, t.sens, R)) {
        if ((candidati[it] ?? []).some((x) => aici(x.d.v, c.v))) continue;
        if (!bucle.some((b) => distantaLaContur(c.v, b) <= (2 * R) / c.cosJumatate)) continue;
        avertismente.push(`${t.idLume}: degajarea omisă la colțul (${c.v.x.toFixed(3)}, ${c.v.y.toFixed(3)}): o latură a colțului e curbă`);
      }
    }
    const tr = traseuProfil(treceri, regim, urechi, t.rampa ? { lungime: t.rampa.lungime } : undefined, intrari, degajari);
    if (!tr.ok) return { ok: false, motiv: `${t.idLume}: ${tr.motiv}` };
    miscari.push({ tip: 'eticheta', text: `${t.idLume}: ${t.forma.tip}, ${latura}, ${t.adancime} mm`, element: t.idLume });
    // Fără `push(...listă)`: o listă foarte lungă depășește stiva de argumente.
    for (const m of tr.miscari) miscari.push(m);
  }
  return { ok: true, program: { axe: AXE_XYZ, scula, turatie: regim.turatie, zSigur: regim.zSigur, miscari }, avertismente };
}
