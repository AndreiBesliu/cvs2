import { esteCaleDeschisa, type Document, type FrezaRest } from '../model/document.ts';
import { oglindeste } from '../model/parte.ts';
import { conturDeTaiat } from './contur.ts';
import { judecaDeschisa, NEATINS_PESTE_D, refuzDeschise } from './deschise.ts';
import { conturElement } from '../model/forme.ts';
import { felFrezei, frezeleOperatiei, motivFormaPeOperatie } from '../model/formaFrezei.ts';
import { razaColtului } from '../model/creasta.ts';
import { ordineTaieturi, valoriVcarve, type Taietura } from '../model/lume.ts';
import { degrosariFoaie, finisariFoaie, finisariInainteaDegrosarii, nepotrivireDegrosare, ordinePasi, type FinisareFoaie } from '../model/finisare.ts';
import { compusDinResurse, type ResurseRelief } from '../relief/resurse.ts';
import { degrosareRelief, finisareRelief, type FrezaFinisare, type ReliefCam } from './reliefFinisare.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../ir/ir.ts';
import { ineleBuzunar, ordineInele, traseuBuzunar } from './buzunar.ts';
import { traseuParalel } from './paralel.ts';
import { bucatiRestInLant, taieBucati } from './rest.ts';
import { traseuGaurire } from './gaurire.ts';
import { diametruCerc } from './gaurireFel.ts';
import { refuzIncrustatie } from './incrustatie.ts';
import { cuGauriPrinFoaie, valoriIncrustatie } from '../model/incrustatie.ts';
import { figuraDreapta, valoriBuzunarDrept } from './incrustatieDreapta.ts';
import { traseuVcarve } from './vcarve.ts';
import { adancimiTreceri, profil } from './profil.ts';
import { perete, regiunePastrata, verificaTaietura, type Perete } from './regiune.ts';
import { apropiereContururi, distantaCutii, segmenteCuCutii } from '../geom/apropiere.ts';
import { arieCuSemn, inverseaza, LINIE, type Contur, type Punct } from '../geom/contur.ts';
import { aplica } from '../geom/matrice.ts';
import { cutieContur, depasire, largita, type Cutie, type Depasire } from '../geom/cutie.ts';
import { curataIntrare } from '../geom/offset.ts';
import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
import {
  arceSubRaza, colturiCurbe, colturiDeDegajat, cubiceSubRaza, departeDePereti, EPS_COLT, materialIntre, type Degajare,
} from './degajari.ts';
import { bucataBuclei, incepeLa, lungimeBucla, punctLa } from './parcurgere.ts';
import { PRAG_REZOLUTIE } from './iesire.ts';
import {
  alegeIntrarea, lungimeSfert, MARJA_SCHELET, RAZA_INTRARE_MINIMA, RAZA_INTRARE_MINIMA_RAMPA, razeIncercate, type IntrareAleasa,
} from './intrari.ts';
import { RAMPA_MINIMA } from './rampaMinima.ts';
import { cuTaieturiPrinFoaie } from './prinFoaie.ts';
import { SUPRACURSA_MAXIMA } from './supracursaMaxima.ts';
import { traseuProfil } from './traseu.ts';
import { refuzTais, regimFrezei } from './regimFreza.ts';
import { AVANS_IMPLICIT, PLONJARE_IMPLICITA, TURATIE_IMPLICITA, Z_SIGUR_IMPLICIT } from './regimExport.ts';
import {
  centreDeLa, coloaneUrechi, EPS_VARF, geometrieUrechi, inZonaUrechii, pornireInGol, proiectiePeBucla, urecheCareNuIncape, urechiPeBucla, type GeometrieUrechi,
  type ParametriUrechi,
} from './urechi.ts';
import { centrePeLaturi } from './urechiLaturi.ts';
import { urechiLemnBucla, type FundLemn, type LaturaLemn } from './urechiLemn.ts';

/** Scula din operație, în IR: numărul, numele și diametrul (câmpurile necunoscute ale documentului rămân acolo). */
// Forma frezei (ADR 0090) trece în IR: simularea și postul o citesc de acolo.
// Bila (ADR 0312 §1) trece și ea, ca simularea s-o taie cu capătul ei; toroidala (ADR 0303 §4), cu raza colțului.
const sculaIR = (s: Taietura['scula']): Scula => ({
  numar: s.numar, nume: s.nume, diametru: s.diametru,
  ...(s.forma?.tip === 'v' ? { forma: { tip: 'v' as const, unghi: s.forma.unghi, ...(s.forma.varf !== undefined ? { varf: s.forma.varf } : {}) } } : {}),
  ...(s.forma?.tip === 'bila' ? { forma: { tip: 'bila' as const } } : {}),
  ...(s.forma?.tip === 'toroidala' ? { forma: { tip: 'toroidala' as const, raza: s.forma.raza } } : {}),
});

/**
 * ADR 0312, ADR 0313, ADR 0303: ce refuză lucrarea din documentele v29–v31, pe piesele foii: bila și toroidala în afara
 * canelurii (profilul pe linie, 16.A↑e-3) și a buzunarului fără freze de rest și fără incrustație cu pereți drepți (16.A↑e-5),
 * bila și la finisarea reliefului (`motivFormaPeOperatie`; pe frezele de rest, ale fundului plat și ale dopului, oricum), o freză care nu e plată pe o
 * degroșare, câmpul `finisare` pe alt fel de operație decât finisarea și `degrosare` pe alt fel decât degroșarea, iar pe o
 * operație a reliefului ce e al altor operații (urechi, rampă, intrări, degajări, despărțire, câmpurile altor feluri) și o
 * podea sub placă.
 */
function refuzFinisareSiBila(doc: Document): string | null {
  const pePlaca = new Set((doc.foi[0]?.instante ?? []).map((i) => i.piesa));
  for (const p of doc.piese) {
    if (!pePlaca.has(p.id)) continue;
    for (const o of p.operatii) {
      const unde = `${p.id}/${o.id}`;
      // Bila și toroidala (ADR 0303 §4): ca freză a operației, pe linie (canelura, 16.A↑e-3), în buzunar (16.A↑e-5), pe o parte,
      // cu adâncimea cel puțin raza colțului (16.A↑e-6), și la finisarea reliefului (bila, ADR 0312; toroidala, 18.1↑e, ADR 0319).
      // Pe orice freză în plus și pe celelalte operații, refuzate.
      const rotunda = (s: { readonly forma?: { readonly tip: string } | undefined }): boolean => s.forma?.tip === 'bila' || s.forma?.tip === 'toroidala';
      const motivRotunda = motivFormaPeOperatie(o.tip, o.latura, o.scula.forma, o, o.scula.diametru);
      if (rotunda(o.scula) && motivRotunda === 'rotunda-adancime') {
        return `${unde}: pe o parte, freza ${felFrezei(o.scula.forma)} (T${o.scula.numar}) cere o adâncime de cel puțin raza colțului, `
          + `${razaColtului(o.scula.forma, o.scula.diametru)} mm (e ${o.adancime} mm): mai puțin adânc, peretele n-ar ajunge la desen`;
      }
      if (rotunda(o.scula) && motivRotunda === 'rotunda-rest') {
        return `${unde}: buzunarul cu freza ${felFrezei(o.scula.forma)} (T${o.scula.numar}) se taie fără freze de rest: geometria lor e a frezei plate`;
      }
      if (rotunda(o.scula) && motivRotunda === 'rotunda-incrustatie') {
        return `${unde}: incrustația cu pereți drepți se taie cu o freză plată (T${o.scula.numar} e ${felFrezei(o.scula.forma)}): pereții și fundul dopului cer fundul plat`;
      }
      for (const { cale, scula } of frezeleOperatiei(o)) {
        if (scula.forma?.tip === 'toroidala' && !(cale === 'scula' && motivRotunda === null)) {
          return `${unde}: freza toroidală (T${scula.numar}, ${cale}) nu se taie aici: taie doar pe linie (canelura), în buzunar, pe o parte și la finisarea reliefului, ca freză a operației`;
        }
      }
      if (o.finisare !== undefined && o.tip !== 'finisare') return `${unde}: valorile finisării sunt doar ale unei finisări a reliefului`;
      if (o.degrosare !== undefined && o.tip !== 'degrosare') return `${unde}: valorile degroșării sunt doar ale unei degroșări a reliefului`;
      if (o.tip === 'degrosare' && motivFormaPeOperatie(o.tip, o.latura, o.scula.forma) === 'degrosare') {
        return `${unde}: degroșarea reliefului se face cu o freză plată (T${o.scula.numar} e ${felFrezei(o.scula.forma)})`;
      }
      if (o.tip !== 'finisare' && o.tip !== 'degrosare') {
        for (const { cale, scula } of frezeleOperatiei(o)) {
          if (scula.forma?.tip === 'bila' && !(cale === 'scula' && motivRotunda === null)) {
            return `${unde}: freza bilă (T${scula.numar}, ${cale}) taie doar pe linie (canelura), în buzunar, pe o parte și la finisarea reliefului, ca freză a operației`;
          }
        }
        continue;
      }
      const felul = o.tip === 'finisare' ? 'finisare' : 'degroșare', alFelului = o.tip === 'finisare' ? 'finisării' : 'degroșării';
      if (o.urechi || o.rampa || o.intrari || o.colturi || o.despartire) {
        return `${unde}: o ${felul} a reliefului nu are urechi, rampă, intrări, degajări sau despărțire`;
      }
      const straine = (['coborare', 'retragereCompleta', 'fundPlat', 'directie', 'rest', 'strategie', 'incrustatie'] as const).filter((k) => o[k] !== undefined);
      if (straine.length > 0) return `${unde}: ${straine.join(', ')} ${straine.length === 1 ? 'e al' : 'sunt ale'} altor operații, nu ale ${alFelului} reliefului`;
      if (o.adancime > (doc.foi[0]?.stoc.grosime ?? Infinity)) {
        return `${unde}: podeaua ${alFelului}, la ${o.adancime} mm, trece de grosimea plăcii (${doc.foi[0]?.stoc.grosime} mm)`;
      }
    }
  }
  return null;
}

/**
 * O operație a reliefului de pe foaie (ADR 0310 §4–§6; finisarea, ADR 0312; degroșarea, ADR 0313): compusul fiecărui relief
 * din resurse (dalele lui, aduse de firul principal), mutat pe Z (planul zero sub față, sau vârful compusului la față), în
 * lume, cu celula scalată; apoi `finisareRelief` sau `degrosareRelief`.
 */
function programRelief(
  f: FinisareFoaie, resurse: ResurseRelief | undefined, regim: Regim,
): ReturnType<typeof finisareRelief> {
  const o = f.operatie, fin = o.tip === 'degrosare' ? o.degrosare : o.finisare;
  const felul = o.tip === 'degrosare' ? 'degroșarea' : 'finisarea';
  if (!fin) return { ok: false, motiv: `${f.piesa}/${o.id}: ${felul} n-are valorile ei` };
  if (o.pasLateral === undefined) return { ok: false, motiv: `${f.piesa}/${o.id}: ${felul} n-are pasul lateral` };
  const reliefuri: ReliefCam[] = [];
  for (const r of f.reliefuri) {
    const c = compusDinResurse(r.forma, resurse ?? {});
    if (!c.ok) {
      return { ok: false, motiv: `${r.idLume}: dalele reliefului nu sunt în acest browser (${c.lipsa.length} ${c.lipsa.length === 1 ? 'hartă sau dală lipsă' : 'hărți sau dale lipsă'}): deschide proiectul unde a fost făcut relieful` };
    }
    let max = -Infinity;
    for (const v of c.valori) if (v > max) max = v;
    const dz = fin.planZero !== undefined ? -fin.planZero : -(Number.isFinite(max) ? max : 0);
    const m = r.matrice, s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    const z = new Float64Array(c.valori.length);
    for (let k = 0; k < z.length; k++) z[k] = c.valori[k]! + dz;
    reliefuri.push({
      nx: r.forma.nx, ny: r.forma.ny, celula: r.forma.celula * s, z,
      m: { a: m.a / s, b: m.b / s, c: m.c / s, d: m.d / s, e: m.e, f: m.f },
    });
  }
  const D = o.scula.diametru, fs = o.scula.forma;
  const rv = regimFrezei(o.scula, regim);
  const comune = {
    reliefuri, unghi: fin.unghi, margine: fin.margine === 'trece' ? 'trece' as const : 'perete' as const,
    pasLateral: o.pasLateral, pas: o.pas, adancime: o.adancime, zSigur: regim.zSigur, avans: rv.avans, avansPlonjare: rv.avansPlonjare,
  };
  if (o.tip === 'degrosare') {
    // Freza plată (judecată de `refuzFinisareSiBila`, prin `motivFormaPeOperatie`); adaosul, din document.
    const r = degrosareRelief({ ...comune, raza: D / 2, adaos: o.degrosare?.adaos ?? 0 });
    return r.ok ? r : { ok: false, motiv: `${f.reliefuri[0]?.idLume ?? `${f.piesa}/${o.id}`}: ${r.motiv}` };
  }
  const freza: FrezaFinisare = fs?.tip === 'bila' ? { fel: 'bila', raza: D / 2 }
    : fs?.tip === 'v' ? { fel: 'v', raza: D / 2, unghi: fs.unghi, varf: fs.varf ?? 0 }
      : fs?.tip === 'toroidala' ? { fel: 'toroidala', raza: D / 2, colt: fs.raza } : { fel: 'plata', raza: D / 2 };
  const r = finisareRelief({ ...comune, freza, nealiniat: o.finisare?.nealiniat === true });
  return r.ok ? r : { ok: false, motiv: `${f.reliefuri[0]?.idLume ?? `${f.piesa}/${o.id}`}: ${r.motiv}` };
}

/** Ultima poziție în plan a frezei, din mișcările de până acum; null înainte de prima. */
function ultimaPozitie(miscari: readonly Miscare[]): { readonly x: number; readonly y: number } | null {
  let x: number | undefined, y: number | undefined;
  for (let i = miscari.length - 1; i >= 0 && (x === undefined || y === undefined); i--) {
    const m = miscari[i]!;
    if (!('la' in m)) continue;
    if (x === undefined && m.la.X !== undefined) x = m.la.X;
    if (y === undefined && m.la.Y !== undefined) y = m.la.Y;
  }
  return x === undefined || y === undefined ? null : { x, y };
}

/**
 * Traseul x stă la cel puțin D de coloana fiecărei urechi a buclei c, cu urechile numărate de la poziția s pe c (ADR 0031,
 * precizarea din 10.10): coloana urechii k e [c_k − h + R; c_k + h − R], unde puntea ține grosimea (ADR 0028 §2). Cu
 * W = D, coloana e un punct. Urechile alese (ADR 0211, `fixe`) stau pe loc pe buclă, oriunde ar porni ea.
 */
function departeDeUrechi(x: Contur, c: Contur, s: number, gu: GeometrieUrechi | string | null, R: number, D: number, fixe = false): boolean {
  if (!gu || typeof gu === 'string') return true;
  const { inceputuri, lungime } = coloaneUrechi(gu, s, R, D, fixe);
  return inceputuri.every((inceput) => {
    const coloana = bucataBuclei(c, inceput, lungime);
    const p = coloana.varfuri[0]?.p;
    const d = coloana.varfuri.length > 1 ? apropiereContururi(x, coloana, D).distanta : p ? distantaLaContur(p, x) : Infinity;
    return d >= D;
  });
}

/**
 * Punctele alese ale urechilor tăieturii t, în lume (ADR 0211): locurile elementului ei (în coordonatele formei), trecute prin
 * matricea lui în lume. Null dacă urechile nu sunt la locuri alese; o listă goală dacă elementul n-are niciun loc ales (atunci
 * nu are urechi).
 */
function puncteAlese(t: Taietura): readonly Punct[] | null {
  const u = t.urechi;
  if (!u || u.mod !== 'alese') return null;
  const l = u.locuri;
  const lista = l && Object.hasOwn(l, t.nod) ? (l[t.nod] ?? []) : [];
  return lista.map((q) => aplica(t.matrice, { x: q.x, y: q.y }));
}

/**
 * Urechile alese pe buclele unei tăieturi (ADR 0211, „CAM-ul”): fiecare punct trece pe cel mai apropiat punct al celei mai
 * apropiate bucle; pe fiecare buclă, centrele crescătoare, ca lungime de la vârful ei 0. Refuzul spune locul: două urechi
 * mai apropiate de W / 0,9 între centre, sau una singură pe o buclă mai scurtă de W / 0,9.
 */
function centrePeBucle(bucle: readonly Contur[], puncte: readonly Punct[], W: number): number[][] | string {
  const centre = bucle.map((): number[] => []);
  for (const q of puncte) {
    let j0 = -1, s0 = 0, d0 = Infinity;
    for (const [j, c] of bucle.entries()) {
      const x = proiectiePeBucla(c, q);
      if (x && x.d < d0) { j0 = j; s0 = x.s; d0 = x.d; }
    }
    if (j0 < 0) continue;
    const P = lungimeBucla(bucle[j0] as Contur);
    centre[j0]?.push(s0 >= P ? s0 - P : s0);
  }
  for (const [j, c] of bucle.entries()) {
    const cs = (centre[j] ?? []).sort((a, b) => a - b);
    if (cs.length === 0) continue;
    const P = lungimeBucla(c);
    const k = urecheCareNuIncape(P, W, cs);
    if (k < 0) continue;
    const p = punctLa(c, cs[k] as number)?.p;
    const unde = p ? ` de lângă X ${p.x.toFixed(3)}, Y ${p.y.toFixed(3)}` : '';
    return cs.length === 1
      ? `urechea aleasă${unde} nu încape pe bucla de ${P.toFixed(2)} mm a frezei: o ureche de ${W} mm cere cel puțin ${(W / 0.9).toFixed(2)} mm de buclă`
      : `urechile alese${unde} sunt prea apropiate: între centrele a două urechi, pe drumul frezei, trebuie cel puțin ${(W / 0.9).toFixed(2)} mm`;
  }
  return centre;
}

/**
 * Cercul unei găuriri, în lume (ADR 0087 §1): centrul și diametrul, din forma `cerc` și matricea elementului, care pe un cerc
 * e o asemănare (rotire, oglindire, scară uniformă): ușa refuză arcele sub o matrice neuniformă, iar conturul tăieturii,
 * calculat înainte, n-ar trece de `transformaContur`. Altă formă, refuzată.
 */
function cercInLume(t: Taietura): { readonly centru: { readonly x: number; readonly y: number }; readonly diametru: number } | string {
  if (t.forma.tip !== 'cerc') return `${t.idLume}: găurirea cere un cerc (forma e ${t.forma.tip})`;
  const m = t.matrice;
  return { centru: { x: m.e, y: m.f }, diametru: diametruCerc(t.forma.raza, m) };
}

/**
 * Buzunarele lucrării (ADR 0069 §1, §6; ADR 0073 §1): pentru fiecare buzunar care se taie (indexul tăieturii), insulele lui
 * (indecșii); o insulă nu e în listă. Buzunarele de pe foaie cu aceeași adâncime sunt unul singur, citit par-impar: un
 * contur strict în altul e o insulă, unul strict într-o insulă e iar buzunar (cu insulele lui), oricare ar fi instanța sau
 * operația lor. Cu altă adâncime, fiecare se taie întreg (o treaptă). Refuzate, cu motiv: unul care poartă ce e al
 * profilului (latura alta decât interior, urechi, rampă, intrări, degajări, despărțire: ușa nu le judecă, ca latura unei
 * căi deschise, ADR 0037 §2); pe o cale deschisă (n-are interior); două contururi de aceeași adâncime care se ating sau se
 * intersectează (par-impar n-ar mai spune ce e buzunar). Pasul lateral îl judecă inelele (`ineleBuzunar`).
 */
function buzunareSiInsule(
  taieturi: readonly Taietura[], conturDe: (t: Taietura) => Contur, aparte: (t: Taietura) => boolean = () => false,
): Map<number, number[]> | string {
  const grupuri = new Map<number, number[]>();
  for (const [i, t] of taieturi.entries()) {
    // Un buzunar cu incrustație cu pereți drepți (ADR 0171) e regiunea lui, cu figura lui: nu intră în buzunarele foii.
    if (t.tip !== 'buzunar' || aparte(t)) continue;
    if (t.latura !== 'interior' || t.urechi || t.rampa || t.intrari || t.colturi || t.despartire) {
      return `${t.idLume}: un buzunar stă înăuntrul conturului, fără urechi, rampă, intrări, degajări sau despărțire`;
    }
    if (esteCaleDeschisa(t.forma)) return `${t.idLume}: un buzunar cere un contur închis, iar calea e deschisă`;
    grupuri.set(t.adancime, [...(grupuri.get(t.adancime) ?? []), i]);
  }
  const rez = new Map<number, number[]>();
  for (const [adancime, g] of grupuri) {
    const x = g.map((i) => {
      const c = conturDe(taieturi[i] as Taietura);
      return { i, id: (taieturi[i] as Taietura).idLume, c, cutie: cutieContur(c), arie: Math.abs(arieCuSemn(c)) };
    });
    // Părintele fiecărui contur: cel mai mic care îl cuprinde strict. Contururile nu se ating, deci includerea e un arbore.
    const parinte: number[] = x.map(() => -1);
    const ia = (mic: number, mare: number): void => {
      const p = parinte[mic] ?? -1;
      if (p < 0 || (x[mare]?.arie ?? 0) < (x[p]?.arie ?? 0)) parinte[mic] = mare;
    };
    for (let a = 0; a < x.length; a++) {
      for (let b = a + 1; b < x.length; b++) {
        const A = x[a] as (typeof x)[number], B = x[b] as (typeof x)[number];
        if (distantaCutii(A.cutie, B.cutie) > 0) continue;
        if (A.id === B.id) return `${A.id}: același contur e de două ori în buzunarele de ${adancime} mm`;
        if (apropiereContururi(A.c, B.c, 1e-6).distanta < 1e-6) {
          return `${A.id} și ${B.id}: contururile buzunarelor de ${adancime} mm se ating sau se intersectează; unește-le întâi (booleanul) sau dă-le adâncimi diferite`;
        }
        const pa = A.c.varfuri[0]?.p, pb = B.c.varfuri[0]?.p;
        if (pa && inRegiune(pa, [B.c])) ia(a, b);
        else if (pb && inRegiune(pb, [A.c])) ia(b, a);
      }
    }
    // Adâncimea de includere pară = buzunar; insulele lui sunt copiii (adâncimea impară), în ordinea tăieturilor.
    const adancimeIn = (k: number): number => {
      let n = 0;
      for (let p = parinte[k] ?? -1; p >= 0; p = parinte[p] ?? -1) n++;
      return n;
    };
    for (const [k, y] of x.entries()) {
      if (adancimeIn(k) % 2 === 0) rez.set(y.i, x.filter((_, j) => parinte[j] === k).map((z) => z.i));
    }
  }
  return rez;
}

/**
 * Lucrarea: tăieturile primei foi (`taieturiFoaie`, ADR 0025), adică operațiile pieselor pe elementele lor, în fiecare
 * instanță, în ordinea de tăiere a contractului (întâi interioarele, apoi exterioarele, la urmă despărțirile foii marcate de
 * om, ADR 0037 §8), într-un singur program în IR.
 * Parametrii și scula vin din operații, nu din dialog. Fiecare tăietură se socotește cu diametrul sculei ei; între două
 * tăieturi cu scule diferite, programul are o schimbare (`schimba-scula`, ADR 0084), cu turația regimului. Din v27 (ADR 0300
 * §5), o freză cu valorile ei (`scula.regim`) taie cu turația, avansul și plonjarea ei (`regimFrezei`); fără ele, cu regimul
 * lucrării, octet cu octet ca până atunci.
 */
export type Regim = {
  readonly turatie: number;
  readonly avans: number;
  readonly avansPlonjare: number;
  readonly zSigur: number;
};

export const REGIM_IMPLICIT: Regim = { turatie: TURATIE_IMPLICITA, avans: AVANS_IMPLICIT, avansPlonjare: PLONJARE_IMPLICITA, zSigur: Z_SIGUR_IMPLICIT };

/**
 * `avertismente`: ce n-a putut face lucrarea fără să fie o greșeală, spus omului la export (ADR 0030 §3: intrarea omisă pe
 * o buclă unde nu încape). Programul rămâne corect fără ele.
 */
export type RezultatJob =
  | {
    readonly ok: true; readonly program: Program; readonly avertismente: readonly string[];
    /**
     * Centrele urechilor puse de lucrare („unde ține”, ADR 0211, b, și regulile pe laturi, c), pe drumul frezei, în lume:
     * semnele de lângă traseu.
     */
    readonly urechiLemn?: readonly Punct[];
  }
  | { readonly ok: false; readonly motiv: string };

/** Câte bucle numește avertismentul urechilor „unde ține” prea puține; celelalte se numără. */
const BUCLE_NUMITE = 5;

/** O buclă cu urechi „unde ține” mai puține decât numărul: tăietura, bucla (din câte are tăietura), câte au încăput, câte se cer. */
type BuclaPutine = { readonly id: string; readonly j: number; readonly bucle: number; readonly k: number; readonly n: number };

/**
 * Avertismentul urechilor „unde ține” (ADR 0211, b: „dacă nu găsește destule, le pune pe cele găsite”): nimic nu se micșorează
 * pe tăcute (ADR 0028). O piesă fără nicio ureche apare aici și, desprinsă, în proba urechilor.
 */
function avertismentLemn(putine: readonly BuclaPutine[]): string {
  const numite = putine.slice(0, BUCLE_NUMITE).map((x) => `${x.id}${x.bucle > 1 ? ` (bucla ${x.j + 1})` : ''}: ${x.k} din ${x.n}`);
  const rest = putine.length - numite.length;
  const cate = putine.length === 1 ? 'o buclă are' : `${putine.length} bucle au`;
  return `urechile „unde ține”: ${cate} mai puține urechi decât cere numărul, fiindcă în jurul lor nu e destul lemn de care să țină: ${numite.join('; ')}${rest > 0 ? `; și încă ${rest}` : ''}`;
}

/**
 * Avertismentul urechilor pe laturile lungi sau scurte (ADR 0211, c): pe laturile regulii încap mai puține decât cere numărul.
 * Ca la „unde ține”, cu primele bucle numite: nimic nu se micșorează pe tăcute (ADR 0028).
 */
function avertismentLaturi(regula: 'lungi' | 'scurte', putine: readonly BuclaPutine[]): string {
  const numite = putine.slice(0, BUCLE_NUMITE).map((x) => `${x.id}${x.bucle > 1 ? ` (bucla ${x.j + 1})` : ''}: ${x.k} din ${x.n}`);
  const rest = putine.length - numite.length;
  const cate = putine.length === 1 ? 'o buclă are' : `${putine.length} bucle au`;
  return `urechile pe laturile ${regula}: ${cate} mai puține urechi decât cere numărul, fiindcă pe laturile ei nu încap mai multe: ${numite.join('; ')}${rest > 0 ? `; și încă ${rest}` : ''}`;
}

/**
 * `supracursa`: cât are voie o operație sub fața de jos a foii (mm, 0 … `SUPRACURSA_MAXIMA`), din fereastra exportului
 * (ADR 0176); traseul și vederea 3D calculează fără ea (0). `prinFoaie` (bifa de lângă ea, ADR 0177): și tăieturile scrise cât
 * foaia trec cu supracursa, ca scrise grosime plus supracursă. `lemn` (ADR 0211, b): pentru urechile „unde ține”, `'fara'` în
 * prima trecere (tăiate fără urechi), apoi fundul foii de la capătul ei (`jobs/calculCam.ts`, `programFoii`); lipsă, ele se
 * refuză, ca nicio tăietură să nu treacă pe tăcute fără urechi.
 */
export function programDinDocument(
  doc: Document, regim: Regim = REGIM_IMPLICIT, supracursa = 0, prinFoaie = false, lemn?: FundLemn | 'fara', reliefuri?: ResurseRelief,
): RezultatJob {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  if (!(supracursa >= 0 && supracursa <= SUPRACURSA_MAXIMA)) {
    return { ok: false, motiv: `supracursa trebuie să fie între 0 și ${SUPRACURSA_MAXIMA} mm (${supracursa})` };
  }
  const grosime = foaie.stoc.grosime;
  // Finisarea reliefului și freza bilă (ADR 0312, documentul v29): judecate înaintea tăieturilor, care sunt doar ale contururilor.
  const v29 = refuzFinisareSiBila(doc);
  if (v29) return { ok: false, motiv: v29 };
  // Degroșarea și finisarea aceluiași relief (ADR 0313 §5): același plan zero; degroșarea nu scoate peretele finisării.
  const nepotrivire = nepotrivireDegrosare(doc, 0);
  if (nepotrivire) return { ok: false, motiv: nepotrivire };
  // Găurile (ADR 0175): locașul prin foaie, cu adâncimea ei plus supracursa, nu cea scrisă în operație.
  doc = cuGauriPrinFoaie(doc, supracursa);
  // Cu bifa (ADR 0177): tăieturile scrise cât foaia, ca scrise grosime plus supracursă.
  if (prinFoaie) doc = cuTaieturiPrinFoaie(doc, supracursa);
  // Ordinea contractului, grupată pe sculă în fiecare clasă (ADR 0084), sau ordinea de mână a omului (ADR 0133).
  const taieturi = ordineTaieturi(doc, 0);
  // Operațiile reliefului (degroșarea, ADR 0313; finisarea, ADR 0312) și locul lor în ordinea foii (`ordinePasi`, §7):
  // automat întâi, cât placa e întreagă, degroșarea înaintea finisării; cu ranguri, unde le-a pus omul. `finisariLa[k]` se fac
  // înaintea tăieturii k (la capăt, k = numărul tăieturilor).
  const finisari = [...degrosariFoaie(doc, 0), ...finisariFoaie(doc, 0)];
  const pasi = ordinePasi(doc, 0);
  const finisariLa = new Map<number, FinisareFoaie[]>();
  let inainte = 0;
  for (const p of pasi) {
    if (p.fel === 'taietura') inainte++;
    else finisariLa.set(inainte, [...(finisariLa.get(inainte) ?? []), p.f]);
  }
  const pas0 = pasi[0];
  const primaScula = pas0 === undefined ? undefined : pas0.fel === 'taietura' ? pas0.t.scula : pas0.f.operatie.scula;
  if (!primaScula) return { ok: false, motiv: 'nicio formă n-are o operație de tăiere' };
  const operatieDe = (t: Taietura) => doc.piese.find((p) => p.id === t.piesa)?.operatii.find((o) => o.id === t.operatie);
  // Fundul plat (ADR 0091): doar pe un V-carve, cu o freză dreaptă (plată).
  for (const t of taieturi) {
    const fp = operatieDe(t)?.fundPlat;
    if (!fp) continue;
    if (t.tip !== 'vcarve') return { ok: false, motiv: `${t.idLume}: fundul plat cu freza dreaptă e doar al unui V-carve` };
    if (fp.scula.forma) return { ok: false, motiv: `${t.idLume}: freza fundului plat (T${fp.scula.numar}) trebuie să fie dreaptă, nu ${felFrezei(fp.scula.forma)}` };
  }
  // Incrustația (ADR 0170 §4): locașul de aici și dopul (`incrustatie.ts`) cer aceleași lucruri, judecate înaintea traseului.
  for (const t of taieturi) {
    const op = operatieDe(t);
    const r = op ? refuzIncrustatie(op, t.idLume, grosime) : null;
    if (r) return { ok: false, motiv: r };
  }
  // Frezele de rest (ADR 0093): doar pe un buzunar (și pe fundul plat al unui V-carve, ADR 0091); fiecare plată, mai mică
  // decât freza dinainte, cu pasul lateral cel mult raza ei.
  for (const t of taieturi) {
    const op = operatieDe(t);
    if (op?.rest && t.tip !== 'buzunar') return { ok: false, motiv: `${t.idLume}: frezele de rest sunt doar ale unui buzunar (pe un V-carve, ale fundului plat)` };
    // Strategia (ADR 0094): doar a unui buzunar.
    if (op?.strategie && t.tip !== 'buzunar') return { ok: false, motiv: `${t.idLume}: strategia paralelă e doar a unui buzunar` };
    const liste: ReadonlyArray<readonly [Taietura['scula'], readonly FrezaRest[]]> = [
      ...(op?.rest ? [[t.scula, op.rest] as const] : []), ...(op?.fundPlat?.rest ? [[op.fundPlat.scula, op.fundPlat.rest] as const] : []),
    ];
    for (const [prima, lista] of liste) {
      let dinainte = prima.diametru;
      for (const r of lista) {
        if (r.scula.forma) return { ok: false, motiv: `${t.idLume}: freza de rest T${r.scula.numar} trebuie să fie plată, nu ${felFrezei(r.scula.forma)}` };
        if (!(r.scula.diametru < dinainte)) {
          return { ok: false, motiv: `${t.idLume}: freza de rest T${r.scula.numar} (Ø${r.scula.diametru}) trebuie să fie mai mică decât cea dinainte (Ø${dinainte})` };
        }
        if (!(r.pasLateral <= r.scula.diametru / 2)) {
          return { ok: false, motiv: `${t.idLume}: pasul lateral al frezei de rest T${r.scula.numar}, de ${r.pasLateral} mm, trebuie să fie cel mult raza ei (${r.scula.diametru / 2} mm): altfel rămâne material între inele` };
        }
        dinainte = r.scula.diametru;
      }
    }
  }
  // Freza în V (ADR 0092 §3): pe linie (centrul pe vector) sau într-un V-carve. Pe o parte, într-un buzunar sau la găurire,
  // lucrarea ar decala-o cu Ø/2, ca pe una plată, iar peretele n-ar ieși unde e desenat. Vârful plat e sub diametru.
  // Direcția (§4) e doar a tăieturii pe linie.
  for (const t of taieturi) {
    const f = t.scula.forma, peLinie = t.tip === 'profil' && t.latura === 'pe-linie';
    const motivForma = motivFormaPeOperatie(t.tip, t.latura, f);
    if (f?.tip === 'v') {
      if (f.varf !== undefined && !(f.varf < t.scula.diametru)) {
        return { ok: false, motiv: `${t.idLume}: vârful frezei în V (T${t.scula.numar}), de ${f.varf} mm, trebuie să fie sub diametrul ei (Ø${t.scula.diametru})` };
      }
      if (motivForma === 'v-pe-linie') {
        const unde = t.tip === 'buzunar' ? 'într-un buzunar' : t.tip === 'gaurire' ? 'la o găurire' : 'pe o parte';
        return { ok: false, motiv: `${t.idLume}: freza în V (T${t.scula.numar}) taie pe linie sau într-un V-carve; ${unde}, peretele n-ar ieși unde e desenat` };
      }
    }
    if (operatieDe(t)?.directie !== undefined && !peLinie) {
      return { ok: false, motiv: `${t.idLume}: direcția (invers, cel mai scurt drum) e doar a tăieturii pe linie` };
    }
  }
  // Aceeași sculă = același număr, același diametru și aceeași formă (ADR 0025, precizarea 1; ADR 0090). Un număr cu două
  // diametre sau două forme ar fi două freze sub același T, iar omul de la mașină ar monta una singură (ADR 0084). Și freza
  // fundului plat (ADR 0091).
  const forma = (s: Taietura['scula']): string => (s.forma?.tip === 'v'
    ? `în V de ${s.forma.unghi}°${s.forma.varf ? ` cu vârful de ${s.forma.varf} mm` : ''}`
    : s.forma?.tip === 'toroidala' ? `toroidală cu raza colțului ${s.forma.raza} mm` : felFrezei(s.forma));
  const freze = new Map<number, Taietura['scula']>();
  // Frezele finisărilor (ADR 0312) intră și ele: același T, aceeași freză, ca la tăieturi.
  const deJudecat: ReadonlyArray<{ readonly idLume: string; readonly scule: readonly Taietura['scula'][] }> = [
    ...finisari.map((f) => ({ idLume: f.reliefuri[0]?.idLume ?? `${f.instanta}/${f.operatie.id}`, scule: [f.operatie.scula] })),
    ...taieturi.map((t) => {
      const op = operatieDe(t);
      const fp = t.tip === 'vcarve' ? op?.fundPlat : undefined;
      // Și frezele de rest (ADR 0093), ale buzunarului și ale fundului plat.
      const rest = [...(t.tip === 'buzunar' ? op?.rest ?? [] : []), ...(fp?.rest ?? [])].map((r) => r.scula);
      return { idLume: t.idLume, scule: [t.scula, ...(fp ? [fp.scula] : []), ...rest] };
    }),
  ];
  for (const t of deJudecat) {
    for (const u of t.scule) {
      const s = freze.get(u.numar);
      if (s === undefined) { freze.set(u.numar, u); continue; }
      if (s.diametru !== u.diametru) {
        return { ok: false, motiv: `${t.idLume}: T${u.numar} are două diametre (${s.diametru} și ${u.diametru} mm): fiecare freză cere numărul ei` };
      }
      if (forma(s) !== forma(u)) {
        return { ok: false, motiv: `${t.idLume}: T${u.numar} are două freze de Ø${s.diametru} (${forma(s)} și ${forma(u)}): fiecare freză cere numărul ei` };
      }
      // Turația e a frezei montate (ADR 0300 §5): același T cu două turații e un conflict, ca două diametre. Avansul și
      // plonjarea pot diferi de la o operație la alta.
      const ts = regimFrezei(s, regim).turatie, tu = regimFrezei(u, regim).turatie;
      if (ts !== tu) {
        return { ok: false, motiv: `${t.idLume}: T${u.numar} are două turații (${ts} și ${tu} rot/min): o freză se montează cu o singură turație; fiecare turație cere numărul ei` };
      }
    }
  }
  const scula: Scula = sculaIR(primaScula);
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
  const buzunare = buzunareSiInsule(taieturi, conturDe, (u) => operatieDe(u)?.incrustatie?.fel === 'drept');
  if (typeof buzunare === 'string') return { ok: false, motiv: buzunare };
  // V-carve-ul (ADR 0090), ca buzunarul: înăuntrul contururilor închise, fără nimic din profil; înaintea căilor deschise,
  // ca motivul să fie al lui, nu al profilului.
  for (const t of taieturi) {
    if (t.tip !== 'vcarve') continue;
    if (t.latura !== 'interior' || t.urechi || t.rampa || t.intrari || t.colturi || t.despartire) {
      return { ok: false, motiv: `${t.idLume}: un V-carve sapă înăuntrul contururilor, fără urechi, rampă, intrări, degajări sau despărțire` };
    }
    if (esteCaleDeschisa(t.forma)) return { ok: false, motiv: `${t.idLume}: V-carve-ul cere contururi închise, iar calea e deschisă` };
  }
  // Căile deschise (ADR 0037 §9): laturile care nu se potrivesc cu `inchis`, ce vine mai târziu pe ele și calea degenerată,
  // refuzate cu motiv înaintea regiunii (o cale deschisă n-are arie, deci nu poate fi inel) și a oricărui traseu.
  const refuz = refuzDeschise(taieturi, contururi);
  if (refuz) return { ok: false, motiv: refuz };
  // Regiunea păstrată (ADR 0026): inelele și includerea lor, înaintea oricărui traseu.
  const regiune = regiunePastrata(taieturi, contururi);
  if (!regiune.ok) return { ok: false, motiv: regiune.motiv };
  const miscari: Miscare[] = [];
  const avertismente: string[] = [];
  // Finisarea pusă de mână înaintea degroșării aceluiași relief (ADR 0313 §4): programul rămâne bun, dar degroșarea taie aproape
  // doar aer.
  for (const { finisare: fi, degrosare: de } of finisariInainteaDegrosarii(pasi)) {
    avertismente.push(`${fi.piesa}/${fi.operatie.id}: finisarea vine înaintea degroșării ${de.piesa}/${de.operatie.id} a aceluiași relief (ordinea de mână): finisarea scoate cu freza ei tot lemnul, iar degroșarea taie aproape doar aer`);
  }
  // Urechile „unde ține” (ADR 0211, b): buclele cu mai puține decât numărul și centrele lor, în lume.
  const putine: BuclaPutine[] = [];
  const puncteLemn: Punct[] = [];
  // Regulile pe laturi (ADR 0211, c): buclele cu mai puține urechi decât numărul, pe fiecare regulă.
  const putineLaturi: Record<'lungi' | 'scurte', BuclaPutine[]> = { lungi: [], scurte: [] };
  // Profilele tuturor tăieturilor, o dată. Un profil care nu iese se raportează mai jos, la tăietura lui. Pe o parte
  // (ADR 0037 §3), partea pe foaie se inversează sub o matrice care oglindește.
  const profile = taieturi.map((u) => profil(conturDe(u), {
    latura: u.latura, sens: u.sens, diametruScula: u.scula.diametru, adancime: u.adancime, pas: u.pas,
    oglindit: oglindeste(u.matrice),
  }));
  // Pereții (ADR 0037 §10): calea fiecărei tăieturi pe o parte; muchia ei se promite, deci niciun disc nu vine mai aproape
  // de R − ε de ea, nici al profilelor, nici al altor tăieturi pe o parte.
  const pereti: Perete[] = [];
  for (const u of taieturi) {
    if ((u.latura === 'stanga' || u.latura === 'dreapta') && !pereti.some((p) => p.idLume === u.idLume)) pereti.push(perete(u.idLume, conturDe(u)));
  }
  // Buclele fiecărei tăieturi: ca o degajare să nu se apropie de ele (ADR 0032 §5 a); cele cu urechi, ca o intrare să nu le
  // taie legătura (ADR 0030 §3, condiția c).
  const bucleToate: readonly (readonly Contur[])[] = profile.map((p) => (p.ok ? (p.treceri[0]?.contururi ?? []) : []));
  const bucleCuUrechi: readonly (readonly Contur[])[] = taieturi.map((u, i) => (u.urechi ? (bucleToate[i] ?? []) : []));
  const cutiiBucle: readonly (readonly Cutie[])[] = bucleToate.map((bs) => bs.map(cutieContur));
  /** Pragul degajărilor și al intrărilor unei tăieturi: diametrul sculei ei plus 1 mm (ADR 0032 §5 a). */
  const pragDe = (iu: number): number => (taieturi[iu]?.scula.diametru ?? 0) + MARJA_SCHELET;
  /** Distanța de la x la bucla jb a tăieturii iu e cel puțin `prag`; cutiile sunt o margine de jos, deci o sar pe cele departe. */
  const departeDeBucla = (x: Contur, cx: Cutie, iu: number, jb: number, prag: number): boolean => {
    const cb = cutiiBucle[iu]?.[jb];
    const b = bucleToate[iu]?.[jb];
    return !cb || !b || distantaCutii(cx, cb) >= prag || apropiereContururi(x, b, prag).distanta >= prag;
  };
  // Degajările candidate (ADR 0032 §5 a, precizarea din 11.10): colțurile fiecărei tăieturi cu degajări, pe conturul curățat
  // ca la offset, cu Q pe o buclă și cu drumul departe de traseele celorlalte bucle. Ele se judecă apoi și între ele: două
  // candidate a două bucle diferite, mai apropiate de D + 1 mm, se omit amândouă (ordinea tăieturilor nu contează).
  // `pereti`: condiția d (ADR 0134 §2), pe pereții elementului care nu se întâlnesc în V.
  type Candidat = {
    readonly d: Degajare; readonly j: number; readonly drum: Contur; readonly cutie: Cutie; readonly departe: boolean; readonly pereti: boolean;
  };
  /** Conturul curățat al fiecărei tăieturi cu degajări: pereții și K ai condițiilor d și e (ADR 0134). */
  const conturCurat: Array<Contur | null> = taieturi.map(() => null);
  const candidati: readonly (readonly Candidat[])[] = taieturi.map((u, iu) => {
    const bs = bucleToate[iu] ?? [];
    if (!u.colturi || (u.latura !== 'exterior' && u.latura !== 'interior') || bs.length === 0) return [];
    const R = u.scula.diametru / 2, prag = pragDe(iu);
    const curat = curataIntrare(conturDe(u));
    const element = curat.ok ? curat.contur : conturDe(u);
    conturCurat[iu] = element;
    const rez: Candidat[] = [];
    let segmente: ReturnType<typeof segmenteCuCutii> | null = null;
    for (const d of colturiDeDegajat(element, u.latura, u.sens, R, u.colturi.tip)) {
      // Decalarea a mâncat colțul (laturi prea scurte): nu există Q, deci nici degajare (§2).
      const j = bs.findIndex((c) => c.varfuri.some((x) => Math.hypot(x.p.x - d.q.x, x.p.y - d.q.y) <= EPS_COLT));
      if (j < 0) continue;
      const drum: Contur = { inchis: false, varfuri: [{ p: d.q, s: LINIE }, { p: d.e, s: LINIE }] };
      const cutie = cutieContur(drum);
      const departe = bucleToate.every((bb, ib) => bb.every((_, jb) => (ib === iu && jb === j) || departeDeBucla(drum, cutie, ib, jb, prag)));
      segmente ??= segmenteCuCutii(element);
      rez.push({ d, j, drum, cutie, departe, pereti: departeDePereti(element, u.latura, R, d, MARJA_SCHELET, segmente) });
    }
    return rez;
  });
  /**
   * Condiția e (ADR 0134 §3): între drumul candidatului x și al fiecărui alt candidat al aceleiași bucle nu rămâne sub 1 mm de
   * material păstrat. Ca la candidații altor bucle, un candidat omis pentru alt motiv tot îl oprește pe cel de lângă el.
   */
  const departeDeColturi = (x: Candidat, iu: number): boolean => {
    const u = taieturi[iu], element = conturCurat[iu];
    if (!u || !element || (u.latura !== 'exterior' && u.latura !== 'interior')) return true;
    const prag = pragDe(iu), latura = u.latura, R = u.scula.diametru / 2;
    return (candidati[iu] ?? []).every((y) => y === x || y.j !== x.j || !y.departe || !materialIntre(x.d, y.d, element, latura, prag, R));
  };
  /** Drumul candidatului (iu, j) stă la cel puțin D + 1 mm de drumurile candidate ale celorlalte bucle. */
  const departeDeDegajari = (x: Candidat, iu: number): boolean => {
    const prag = pragDe(iu);
    return candidati.every((cs, ib) => cs.every((y) => !y.departe
      || (ib === iu && y.j === x.j) || distantaCutii(x.cutie, y.cutie) >= prag || apropiereContururi(x.drum, y.drum, prag).distanta >= prag));
  };
  /** Cât trece discul frezei (raza R) de fiecare latură a foii, pe un traseu (măsura ieșirii din foaie). */
  const iese = (x: Contur, R: number): Depasire => depasire(largita(cutieContur(x), R), foaie.stoc.latime, foaie.stoc.inaltime, PRAG_REZOLUTIE);
  /**
   * Scula montată; o tăietură cu alta cere întâi schimbarea (ADR 0084). Numărul o spune: un T are o singură freză (mai sus).
   * Prima montată e scula programului (ADR 0091 §3: un V-carve cu fund plat începe cu freza dreaptă).
   */
  let initiala: Scula | null = null, curenta: Scula | null = null;
  /** Freza montată prima, din document: turația ei pornește programul (ADR 0300 §5). */
  let initialaDoc: Taietura['scula'] | null = null;
  const monteaza = (s: Taietura['scula']): void => {
    if (curenta === null) { curenta = initiala = sculaIR(s); initialaDoc = s; return; }
    if (s.numar === curenta.numar) return;
    curenta = sculaIR(s);
    miscari.push({ tip: 'schimba-scula', scula: curenta, turatie: regimFrezei(s, regim).turatie });
  };
  const montata = (t: Taietura): void => { monteaza(t.scula); };
  // V-carve-urile făcute (ADR 0090): contururile unei regiuni se taie odată, la prima lor tăietură. O regiune = contururile
  // V-carve ale unei piese dintr-o instanță cu aceleași valori (freza, adâncimea, pasul, sensul, fundul plat), oricâte
  // operații ar fi (ADR 0112, precizarea): un text cu operațiile importului (exteriorul, golurile), trecute pe V-carve rând cu
  // rând în fereastra exportului, se sapă cu golurile lui, ca dintr-o singură operație.
  const cheieVcarve = (u: Taietura): string => `${u.instanta}/${u.piesa}/${valoriVcarve({ ...u, fundPlat: operatieDe(u)?.fundPlat, incrustatie: operatieDe(u)?.incrustatie })}`;
  const vcarveFacute = new Set<string>();
  // Incrustațiile cu pereți drepți făcute (ADR 0171): ca la V-carve, o regiune pe piesă, instanță și valori.
  const cheieDreapta = (u: Taietura): string => {
    const o = operatieDe(u);
    return `${u.instanta}/${u.piesa}/${o ? valoriBuzunarDrept(o) : u.operatie}`;
  };
  const drepteFacute = new Set<string>();
  /** Operațiile reliefului de dinaintea tăieturii k (ADR 0312 §7, ADR 0313); refuzul primei care nu iese. */
  const faFinisari = (k: number): string | null => {
    for (const f of finisariLa.get(k) ?? []) {
      const r = programRelief(f, reliefuri, regim);
      if (!r.ok) return r.motiv;
      monteaza(f.operatie.scula);
      const id = f.reliefuri[0]?.idLume ?? `${f.instanta}/${f.operatie.id}`;
      const pasL = Math.round(r.pasLateral * 1e4) / 1e4;
      miscari.push({
        tip: 'eticheta',
        text: f.operatie.tip === 'degrosare'
          ? `${id}: degroșarea reliefului, ${f.operatie.adancime} mm, adaosul ${f.operatie.degrosare?.adaos ?? 0} mm, pasul lateral ${pasL} mm`
          : `${id}: finisarea reliefului, ${f.operatie.adancime} mm, pasul lateral ${pasL} mm`,
        element: id, operatie: `${f.piesa}/${f.operatie.id}`,
      });
      for (const m of r.miscari) miscari.push(m);
      for (const a of r.avertismente) avertismente.push(`${id}: ${a}`);
    }
    return null;
  };
  for (const [it, t] of taieturi.entries()) {
    // Întâi finisările puse înaintea acestei tăieturi (înaintea oricărui `continue` de mai jos).
    const refuzFinisare = faFinisari(it);
    if (refuzFinisare !== null) return { ok: false, motiv: refuzFinisare };
    const latura = t.latura;
    // Diametrul și raza sculei acestei tăieturi.
    const D = t.scula.diametru, R = D / 2;
    // Mai adânc decât foaia înseamnă în masa de sacrificiu (sau în masa mașinii): cel mult supracursa.
    if (t.adancime > grosime + supracursa + 1e-9) {
      return {
        ok: false,
        motiv: supracursa > 0
          ? `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${grosime} mm) plus supracursa (${supracursa} mm)`
          : `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${grosime} mm)`,
      };
    }
    // V-carve-ul (ADR 0090): contururile operației din instanța ei sunt o singură regiune par-impar (literele, cu golurile
    // lor), săpată cu freza în V pe axa ei medială. Ca buzunarul, nu e inel al regiunii păstrate și stă în regiune prin
    // construcție (raza exactă în fiecare punct).
    if (t.tip === 'vcarve') {
      const cheie = cheieVcarve(t);
      if (vcarveFacute.has(cheie)) continue;
      vcarveFacute.add(cheie);
      const forma = t.scula.forma;
      if (forma?.tip !== 'v') return { ok: false, motiv: `${t.idLume}: V-carve-ul cere o freză în V (T${t.scula.numar} e ${felFrezei(forma)})` };
      const ale = taieturi.filter((u) => u.tip === 'vcarve' && cheieVcarve(u) === cheie);
      const op = operatieDe(t);
      const fp = op?.fundPlat;
      // Incrustația fără freză dreaptă (ADR 0173): fundul locașului îl fac inelele frezei V, cu creasta cel mult g/2.
      const inc = !fp && op ? valoriIncrustatie(op) : null;
      // Fiecare freză cu avansurile ei (ADR 0300 §5): V-ul, freza fundului plat și frezele ei de rest.
      const rv = regimFrezei(t.scula, regim);
      const avansuri = (s: Taietura['scula']): { readonly avans: number; readonly avansPlonjare: number } => {
        const r = regimFrezei(s, regim);
        return { avans: r.avans, avansPlonjare: r.avansPlonjare };
      };
      const v = traseuVcarve({
        contururi: ale.map(conturDe), unghi: forma.unghi, varf: forma.varf ?? 0, diametruScula: D, adancime: t.adancime, pas: t.pas,
        avans: rv.avans, avansPlonjare: rv.avansPlonjare, zSigur: regim.zSigur,
        ...(fp ? {
          fundPlat: {
            diametru: fp.scula.diametru, pasLateral: fp.pasLateral, sens: t.sens, ...avansuri(fp.scula),
            ...(fp.rest ? { rest: fp.rest.map((r) => ({ diametru: r.scula.diametru, pasLateral: r.pasLateral, ...avansuri(r.scula) })) } : {}),
          },
        } : inc ? { fundV: { creasta: inc.creastaLocas } } : {}),
      });
      if (!v.ok) return { ok: false, motiv: `${t.idLume}: ${v.motiv}` };
      const nume = `${t.idLume}${ale.length > 1 ? ` (+${ale.length - 1})` : ''}`;
      // Fundul plat (ADR 0091 §3): întâi freza dreaptă, dacă taie ceva; apoi freza în V.
      if (fp && v.fund.length > 0) {
        monteaza(fp.scula);
        miscari.push({ tip: 'eticheta', text: `${nume}: V-carve, fundul plat cu T${fp.scula.numar} Ø${fp.scula.diametru}`, element: t.idLume, operatie: `${t.piesa}/${t.operatie}` });
        for (const m of v.fund) miscari.push(m);
      }
      // Frezele de rest ale fundului (ADR 0093), fiecare doar dacă taie ceva.
      for (const [k, r] of (fp?.rest ?? []).entries()) {
        const mr = v.fundRest[k] ?? [];
        if (mr.length === 0) {
          avertismente.push(`${t.idLume}: freza de rest a fundului T${r.scula.numar} (Ø${r.scula.diametru}) n-are ce scoate: frezele dinainte au ajuns peste tot unde ajunge și ea`);
          continue;
        }
        monteaza(r.scula);
        miscari.push({ tip: 'eticheta', text: `${nume}: V-carve, restul fundului cu T${r.scula.numar} Ø${r.scula.diametru}`, element: t.idLume, operatie: `${t.piesa}/${t.operatie}` });
        for (const m of mr) miscari.push(m);
      }
      montata(t);
      miscari.push({ tip: 'eticheta', text: `${nume}: V-carve, până la ${t.adancime} mm`, element: t.idLume, operatie: `${t.piesa}/${t.operatie}` });
      for (const m of v.miscari) miscari.push(m);
      for (const a of v.avertismente) avertismente.push(`${t.idLume}: ${a}`);
      continue;
    }
    // Găurirea (ADR 0087): în centru, în pași, pe un cerc cât freza; în elice, pe perete, pe unul mai mare. Ca buzunarul, nu
    // e inel al regiunii păstrate (scoate material doar din cercul ei) și stă în cerc prin construcție.
    if (t.tip === 'gaurire') {
      if (t.latura !== 'interior' || t.urechi || t.rampa || t.intrari || t.colturi || t.despartire) {
        return { ok: false, motiv: `${t.idLume}: o găurire stă înăuntrul cercului, fără urechi, rampă, intrări, degajări sau despărțire` };
      }
      const cerc = cercInLume(t);
      if (typeof cerc === 'string') return { ok: false, motiv: cerc };
      const op = doc.piese.find((p) => p.id === t.piesa)?.operatii.find((o) => o.id === t.operatie);
      const g = traseuGaurire({
        centru: cerc.centru, diametru: cerc.diametru, diametruScula: D, adancime: t.adancime, pas: t.pas,
        retragereCompleta: op?.retragereCompleta ?? 1, trigonometric: t.sens === 'urcare', ...regimFrezei(t.scula, regim),
      });
      if (!g.ok) return { ok: false, motiv: `${t.idLume}: ${g.motiv}` };
      montata(t);
      miscari.push({ tip: 'eticheta', text: `${t.idLume}: cerc, găurire${g.fel === 'elice' ? ' în elice' : ''}, ${t.adancime} mm`, element: t.idLume, operatie: `${t.piesa}/${t.operatie}` });
      for (const m of g.miscari) miscari.push(m);
      continue;
    }
    // Buzunarul (ADR 0069): inelele dinăuntru în afară, pe fiecare trecere. Nu e inel al regiunii păstrate: scoate material
    // doar dinăuntrul conturului lui, până la adâncimea lui (§4), iar traseul lui stă înăuntru prin construcție (§5). O
    // insulă (ADR 0073) rămâne în picioare: n-are traseu, o ocolește buzunarul care o cuprinde.
    if (t.tip === 'buzunar') {
      const op = doc.piese.find((p) => p.id === t.piesa)?.operatii.find((o) => o.id === t.operatie);
      /**
       * Buzunarul unei regiuni (exteriorul și insulele ei), cu inelele sau liniile, coborârea și frezele de rest ale operației;
       * motivul unui refuz (fără element), sau null.
       */
      const taieBuzunar = (contur: Contur, ci: readonly Contur[], eticheta: string, treceri?: readonly number[] | string): string | null => {
        const pasLateral = op?.pasLateral;
        if (pasLateral === undefined) return 'buzunarul n-are pasul lateral';
        // `treceri`: adâncimile trecerilor, dacă nu sunt cele ale tăieturii (nivelurile incrustației în trepte, ADR 0175).
        const adancimi = treceri ?? adancimiTreceri(t.adancime, t.pas);
        if (typeof adancimi === 'string') return adancimi;
        // Strategia paralelă (ADR 0094): liniile, apoi trecerea de profil; coborârea, doar prin plonjare.
        const paralel = op?.strategie?.fel === 'paralel' ? op.strategie : null;
        if (paralel && op?.coborare && op.coborare.fel !== 'plonjare') return 'strategia paralelă coboară prin plonjare; rampa, zigzagul și elicea sunt ale inelelor';
        let tb: { readonly ok: true; readonly miscari: readonly Miscare[]; readonly avertismente: readonly string[] } | { readonly ok: false; readonly motiv: string };
        if (paralel) {
          const tp = traseuParalel(contur, { ...regimFrezei(t.scula, regim), sens: t.sens, raza: R, pasLateral, unghi: paralel.unghi, adancimi }, ci);
          tb = tp.ok ? { ok: true, miscari: tp.miscari, avertismente: [] } : tp;
        } else {
          const inele = ineleBuzunar(contur, R, pasLateral, ci);
          if (!inele.ok) return inele.motiv;
          // Coborârea (ADR 0076): a operației; lipsă, plonjarea dreaptă.
          tb = traseuBuzunar(contur, ordineInele(inele.radacini), { ...regimFrezei(t.scula, regim), sens: t.sens, raza: R, adancimi, ...(op?.coborare ? { coborare: op.coborare } : {}) }, ci);
        }
        if (!tb.ok) return tb.motiv;
        for (const a of tb.avertismente) avertismente.push(`${t.idLume}: ${a}`);
        montata(t);
        miscari.push({ tip: 'eticheta', text: eticheta, element: t.idLume, operatie: `${t.piesa}/${t.operatie}` });
        for (const m of tb.miscari) miscari.push(m);
        // Frezele de rest (ADR 0093): fiecare doar unde cea dinainte n-a ajuns, pe aceleași treceri; una care n-are ce scoate
        // nu se montează (avertisment).
        const rest = op?.rest ?? [];
        const lant = bucatiRestInLant(contur, ci, R, rest.map((r) => ({ diametru: r.scula.diametru, pasLateral: r.pasLateral })), t.sens);
        if (!lant.ok) return `freza de rest T${rest[lant.freza]?.scula.numar}: ${lant.motiv}`;
        for (const [k, r] of rest.entries()) {
          const b = { bucati: lant.bucati[k] ?? [] };
          if (b.bucati.length === 0) {
            avertismente.push(`${t.idLume}: freza de rest T${r.scula.numar} (Ø${r.scula.diametru}) n-are ce scoate: frezele dinainte au ajuns peste tot unde ajunge și ea`);
            continue;
          }
          const tr = taieBucati(adancimi.map((adancime) => ({ adancime, bucati: b.bucati })), regimFrezei(r.scula, regim));
          monteaza(r.scula);
          miscari.push({ tip: 'eticheta', text: `${t.idLume}: buzunar, restul cu T${r.scula.numar} Ø${r.scula.diametru}`, element: t.idLume, operatie: `${t.piesa}/${t.operatie}` });
          for (const m of tr.miscari) miscari.push(m);
        }
        return null;
      };
      // Incrustația cu pereți drepți (ADR 0171): contururile regiunii (operațiile piesei din instanță cu aceleași valori), închise
      // cu raza celei mai mici freze a dopului minus jocul, se taie odată, la prima lor tăietură, regiune cu regiune.
      if (op?.incrustatie?.fel === 'drept') {
        const cheie = cheieDreapta(t);
        if (drepteFacute.has(cheie)) continue;
        drepteFacute.add(cheie);
        const ale = taieturi.filter((u) => u.tip === 'buzunar' && cheieDreapta(u) === cheie);
        const f = figuraDreapta(ale.map(conturDe), op);
        if (!f.ok) return { ok: false, motiv: `${t.idLume}: ${f.motiv}` };
        for (const a of f.figura.avertismente) avertismente.push(`${t.idLume}: ${a}`);
        // În trepte (ADR 0175 §3): întâi nivelul de sus, până la umăr (d), apoi deschiderea, de la d la D (trecerile ei pornesc
        // de sub umăr: deasupra, nivelul de sus e deja scos).
        const d = op.incrustatie.treapta?.adancime;
        const jos = f.figura.jos;
        const sus = jos && d !== undefined ? adancimiTreceri(d, t.pas) : undefined;
        for (const r of f.figura.locas) {
          const cuInsule = r.gauri.length > 0 ? `, insule: ${r.gauri.length}` : '';
          const cat = sus ? `umărul, ${d} mm` : `${t.adancime} mm`;
          const e = taieBuzunar(r.exterior, r.gauri, `${t.idLume}: incrustație cu pereți drepți, buzunar, ${cat}${cuInsule}`, sus);
          if (e) return { ok: false, motiv: `${t.idLume}: ${e}` };
        }
        if (jos && d !== undefined) {
          const sub = adancimiTreceri(t.adancime - d, t.pas);
          const treceri = typeof sub === 'string' ? sub : sub.map((x) => d + x);
          for (const r of jos.locas) {
            const cuInsule = r.gauri.length > 0 ? `, insule: ${r.gauri.length}` : '';
            const e = taieBuzunar(r.exterior, r.gauri, `${t.idLume}: incrustație cu pereți drepți, deschiderea de sub umăr, de la ${d} la ${t.adancime} mm${cuInsule}`, treceri);
            if (e) return { ok: false, motiv: `${t.idLume}: ${e}` };
          }
        }
        continue;
      }
      const insule = buzunare.get(it);
      if (!insule) continue;
      const ci = insule.map((j) => conturDe(taieturi[j] as Taietura));
      const cuInsule = insule.length > 0 ? `, insule: ${insule.length}` : '';
      const e = taieBuzunar(conturDe(t), ci, `${t.idLume}: ${t.forma.tip}, buzunar, ${t.adancime} mm${cuInsule}`);
      if (e) return { ok: false, motiv: `${t.idLume}: ${e}` };
      continue;
    }
    // Gravarea pe linie cu freza în V (ADR 0092 §3): conul ajunge la adâncime doar dacă ((Ø − t) / 2)·cot(θ/2) ≥ adâncimea;
    // mai adânc, ar tăia coada frezei.
    const fv = t.scula.forma;
    if (fv?.tip === 'v') {
      const con = (D - (fv.varf ?? 0)) / 2 / Math.tan((fv.unghi * Math.PI) / 360);
      if (t.adancime > con + 1e-9) {
        return { ok: false, motiv: `${t.idLume}: tăietura cere ${t.adancime} mm, iar conul frezei în V (Ø${D}, ${fv.unghi}°) are ${con.toFixed(3)} mm: ar tăia coada frezei` };
      }
    }
    // Urechile (ADR 0028 §2): vârful lor se măsoară de la fața de jos a foii, deci puntea are grosimea cerută oricât de
    // adânc merge tăietura.
    let urechi: ParametriUrechi | undefined;
    // Modurile urechilor (ADR 0211): „egale” (implicit), „alese”, „unde ține” și regulile pe laturi.
    const mod = t.urechi?.mod;
    const regula = t.urechi !== null && (mod === 'lungi' || mod === 'scurte' || mod === 'mijloc') ? mod : undefined;
    // „Unde ține” (ADR 0211, b): urechea ține de o parte a tăieturii (pe dinafară, de foaie; pe dinăuntru, miezul de piesă), deci
    // cere un profil închis cu o parte de deșeu; locurile vin din fundul foii, iar în prima trecere tăietura n-are urechi.
    const lemnAici = t.urechi !== null && mod === 'lemn';
    if (lemnAici) {
      if (latura !== 'exterior' && latura !== 'interior') {
        const dece = latura === 'pe-linie' ? 'pe linie, freza taie ambii pereți' : 'pe o cale deschisă, urechea n-are de ce să țină';
        return { ok: false, motiv: `${t.idLume}: urechile „unde ține” cer un profil pe dinafară sau pe dinăuntru: ${dece}` };
      }
      if (lemn === undefined) {
        return { ok: false, motiv: `${t.idLume}: urechile „unde ține” se socotesc pe fundul foii, la export, la traseu și în vederea 3D` };
      }
    }
    // La locuri alese, un element fără niciun loc n-are urechi (numărul e câte ai pus).
    const alese = puncteAlese(t);
    if (t.urechi && !(alese && alese.length === 0) && !(lemnAici && lemn === 'fara')) {
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
      if (t.urechi.latime < D - EPS_VARF) {
        return { ok: false, motiv: `${t.idLume}: urechile de ${t.urechi.latime} mm sunt mai scurte decât diametrul frezei (Ø${D}), deci puntea de peste tăietură ar fi mai subțire de ${g} mm sau n-ar exista` };
      }
      urechi = { numar: t.urechi.numar, latime: t.urechi.latime, varf };
    }
    const pr = profile[it];
    if (!pr) return { ok: false, motiv: `${t.idLume}: profilul lipsește` };
    if (!pr.ok) return { ok: false, motiv: `${t.idLume}: ${pr.motiv}` };
    // Calea deschisă (ADR 0037 §8, §10): despărțirea marcată, tăietura prin foaie care ajunge la marginea foii, apoi
    // avertismentele. Capetele sunt ale căii; discul merge pe trasee (pe linie, chiar calea; pe o parte, bucățile).
    if (esteCaleDeschisa(t.forma)) {
      const j = judecaDeschisa(t, conturDe(t), pr.treceri[0]?.contururi ?? [], regiune.regiune, foaie.stoc, D);
      if (!j.ok) return { ok: false, motiv: j.motiv };
      for (const a of j.avertismente) avertismente.push(a);
    }
    // Urechile alese (ADR 0211): centrele lor pe buclele tăieturii, judecate o dată (buclele sunt aceleași pe toate trecerile).
    let centreAlese: number[][] | undefined;
    if (urechi && alese) {
      const r = centrePeBucle(pr.treceri[0]?.contururi ?? [], alese, urechi.latime);
      if (typeof r === 'string') return { ok: false, motiv: `${t.idLume}: ${r}` };
      centreAlese = r;
    }
    // „Unde ține” (ADR 0211, b): pe fiecare buclă, din fundul foii. Cu toate buclele la distanțe egale (și fără intrări, care ar
    // număra urechile de la pornirea lor), urechile rămân ale modului „egale”, octet cu octet; altfel, ca alese.
    if (urechi && lemnAici && lemn !== undefined && lemn !== 'fara' && (latura === 'exterior' || latura === 'interior')) {
      const u = urechi, fund = lemn, bucle = pr.treceri[0]?.contururi ?? [];
      const parte: LaturaLemn = latura;
      const rez = bucle.map((c) => urechiLemnBucla(c, t.sens, parte, fund, D, u.latime, u.numar, fund.celula, !t.intrari));
      rez.forEach((r, j) => {
        if (r.cate < u.numar) putine.push({ id: t.idLume, j, bucle: bucle.length, k: r.cate, n: u.numar });
        for (const s of r.centre) {
          const q = punctLa(bucle[j] as Contur, s)?.p;
          if (q) puncteLemn.push(q);
        }
      });
      if (!rez.every((r) => r.egale)) centreAlese = rez.map((r) => [...r.centre]);
    }
    // Regulile pe laturi (ADR 0211, c): centrele pe laturile fiecărei bucle, apoi drumul locurilor alese. Fără nicio latură
    // dreaptă, tăietura rămâne a modului „egale”, octet cu octet.
    if (urechi && regula) {
      const bucle = pr.treceri[0]?.contururi ?? [];
      const r = centrePeLaturi(bucle, regula, urechi.latime, urechi.numar);
      if (typeof r === 'string') return { ok: false, motiv: `${t.idLume}: ${r}` };
      if (r) {
        if (regula !== 'mijloc') for (const x of r.putine) putineLaturi[regula].push({ id: t.idLume, j: x.j, bucle: bucle.length, k: x.k, n: x.n });
        for (const x of r.semne) {
          const q = punctLa(bucle[x.j] as Contur, x.s)?.p;
          if (q) puncteLemn.push(q);
        }
        centreAlese = r.centre;
      }
    }
    /** Urechile buclei j înainte de pornire: la locuri alese, centrele ei pe bucla din profil; altfel, ale tăieturii. */
    const urechiInitiale = (j: number): ParametriUrechi | undefined => (urechi && centreAlese ? urechiPeBucla({ ...urechi, bucle: centreAlese }, j) : urechi);
    // Invarianta 2: trecerile au același traseu în plan, deci se judecă o dată, pe prima. Cu pereții (ADR 0037 §10).
    const incalcare = verificaTaietura(regiune.regiune, t.idLume, latura, pr.treceri[0]?.contururi ?? [], R, pereti);
    if (incalcare) return { ok: false, motiv: incalcare };
    // Peretele neatins (ADR 0037 §10, precizarea 2.3c-5): un singur avertisment pe tăietură, doar cu porțiunile mai lungi
    // decât D. Rotunjirea unui colț concav de cel puțin 90° (R · cot(θ / 2) pe fiecare latură, cel mult D în total) e ca
    // la un profil închis fără degajări și nu se spune.
    const lungi = pr.neatins.filter((n) => n.lungime > D + NEATINS_PESTE_D);
    if (lungi.length > 0) {
      const total = lungi.reduce((s, n) => s + n.lungime, 0);
      const cea = lungi.reduce((a, b) => (b.lungime > a.lungime ? b : a));
      const cate = lungi.length === 1 ? `o porțiune a peretelui, de ${total.toFixed(3)} mm` : `${lungi.length} porțiuni ale peretelui, în total ${total.toFixed(3)} mm (cea mai lungă: ${cea.lungime.toFixed(3)} mm)`;
      avertismente.push(`${t.idLume}: freza nu ajunge la ${cate}, lângă X ${cea.la.x.toFixed(3)}, Y ${cea.la.y.toFixed(3)}: acolo rămâne material lipit de perete`);
    }
    // Intrările (ADR 0030): alese pe fiecare buclă, verificate exact pe regiunea păstrată; bucla pornește din p₀.
    let treceri = pr.treceri;
    let intrari: (IntrareAleasa | null)[] | undefined;
    /** Unde pornește fiecare buclă care și-a primit intrarea (poziția lui p₀ pe bucla din profil). */
    const porniri: number[] = [];
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
        const dBucla = iese(c, R);
        // Urechile buclei înseși (ADR 0031, precizarea din 10.10, la ADR 0030 §3 c): coloana punții fiecărei urechi, pe
        // traseu, e [c_k − h + R; c_k + h − R] numărat de la p₀ (ADR 0028 §2: puntea ține grosimea pe W − D).
        const uj = urechiInitiale(j);
        const gu = uj ? geometrieUrechi(lungimeBucla(c), uj) : null;
        // ADR 0030 §3: încape dacă (a) ține discul în afara regiunii păstrate, (b) nu iese din foaie mai mult decât bucla,
        // pe nicio latură, și (c) lasă cel puțin 1 mm de material lângă orice altă buclă cu urechi, iar puntea fiecărei
        // urechi a buclei înseși rămâne întreagă (traseul la cel puțin D de coloana ei). Urechile alese (ADR 0211) stau pe
        // loc, iar bucla nu pornește în zona uneia: acolo, Z-ul n-ar fi adâncimea plină.
        const fixe = centreAlese !== undefined;
        const incape = (semicerc: Contur, s: number): boolean => {
          if (fixe && gu && typeof gu !== 'string' && inZonaUrechii(gu, s, lungimeBucla(c))) return false;
          if (verificaTaietura(regiune.regiune, t.idLume, latura, [semicerc], R, pereti) !== null) return false;
          const d = iese(semicerc, R);
          if (d.stanga > dBucla.stanga || d.dreapta > dBucla.dreapta || d.jos > dBucla.jos || d.sus > dBucla.sus) return false;
          if (!departeDeUrechi(semicerc, c, s, gu, R, D, fixe)) return false;
          return bucleCuUrechi.every((bs, iu) => bs.every((b, jb) => (iu === it && jb === j)
            || apropiereContururi(semicerc, b, D + MARJA_SCHELET).distanta >= D + MARJA_SCHELET));
        };
        let sAles = 0;
        const ales = alegeIntrarea(c, t.sens, raza, (semicerc, s) => {
          const da = incape(semicerc, s);
          if (da) sAles = s;
          return da;
        }, cuRampa);
        porniri[j] = sAles;
        if (!ales) {
          const raze = razeIncercate(raza, cuRampa).map((r) => `${r} mm`).join(', ');
          avertismente.push(`${t.idLume}: intrarea omisă pe bucla ${j + 1} (nu încape nicăieri cu raza de ${raze})`);
        }
        return ales;
      });
      const pornite = bucle.map((c, j) => intrari?.[j]?.bucla ?? c);
      treceri = pr.treceri.map((x) => ({ adancime: x.adancime, contururi: pornite }));
    }
    // Urechile alese (ADR 0211, 5a): o buclă cu intrare pornește din p₀ (ales în afara zonelor urechilor), una fără, din
    // mijlocul celui mai lung gol dintre urechile ei; centrele, de acum, față de pornirea ei.
    if (urechi && centreAlese) {
      const din = pr.treceri[0]?.contururi ?? [];
      const acum = treceri[0]?.contururi ?? [];
      const relative: number[][] = [];
      const pornite = din.map((c, j) => {
        const cs = centreAlese?.[j] ?? [];
        const P = lungimeBucla(c);
        if (intrari?.[j]) {
          relative.push(centreDeLa(P, cs, porniri[j] ?? 0));
          return acum[j] ?? c;
        }
        if (cs.length === 0) {
          relative.push([]);
          return acum[j] ?? c;
        }
        const s = pornireInGol(P, cs);
        relative.push(centreDeLa(P, cs, s));
        return incepeLa(c, s);
      });
      treceri = treceri.map((x) => ({ adancime: x.adancime, contururi: pornite }));
      urechi = { ...urechi, bucle: relative };
    }
    // Degajările (ADR 0032): colțurile concave pentru K, socotite pe desen; fiecare pe bucla care are vârful Q, dacă trece
    // de condițiile de la §5, în ordine (a: traseele, apoi drumurile candidate ale celorlalte bucle; b: urechile buclei
    // tăiate, numărate de la pornirea ei; c: marginea foii). Altfel, avertisment cu primul motiv.
    let degajari: Degajare[][] | undefined;
    if (t.colturi) {
      if (latura === 'pe-linie') return { ok: false, motiv: `${t.idLume}: degajările cer o parte de deșeu, iar pe linie freza taie ambii pereți` };
      // Pe o parte nu se ajunge aici: degajările pe o cale deschisă se refuză înainte (ADR 0037 §9).
      if (latura !== 'exterior' && latura !== 'interior') return { ok: false, motiv: `${t.idLume}: degajările colțurilor pe o cale deschisă vin mai târziu` };
      // Arcele sub raza frezei se socotesc pe DESEN (recenzia 2.7b): arcele biarcelor unei cubice nu sunt colțuri, iar o
      // curbă strânsă se spune o dată, nu pe fiecare arc al ei.
      if (t.forma.tip === 'relief') return { ok: false, motiv: `${t.idLume}: un relief nu se taie cu o operație 2D` };
      const desen = conturElement({ forma: t.forma, matrice: t.matrice });
      const curat = curataIntrare(desen);
      for (const r of arceSubRaza(curat.ok ? curat.contur : desen, latura, t.sens, R)) {
        avertismente.push(`${t.idLume}: colțul rotunjit cu raza ${r.toFixed(3)} mm (sub raza frezei, ${R.toFixed(3)} mm) rămâne cu raza frezei; o degajare cere un colț ascuțit în desen`);
      }
      for (const c of cubiceSubRaza(desen, latura, t.sens, R)) {
        avertismente.push(`${t.idLume}: curba de lângă (${c.p.x.toFixed(3)}, ${c.p.y.toFixed(3)}) se strânge până la raza ${c.raza.toFixed(3)} mm (sub raza frezei, ${R.toFixed(3)} mm): freza o rotunjește`);
      }
      const bucle = treceri[0]?.contururi ?? [];
      const lista: Degajare[][] = bucle.map(() => []);
      for (const x of candidati[it] ?? []) {
        const c = bucle[x.j];
        if (!c) continue;
        const uj = urechiPeBucla(urechi, x.j);
        const gu = uj ? geometrieUrechi(lungimeBucla(c), uj) : null;
        // c: pe fiecare latură a foii, discul de pe drum stă la cel puțin 1 mm de ea, sau cel puțin cât bucla, dacă ea e mai
        // aproape (sau iese).
        const dc = largita(x.cutie, R), bc = largita(cutieContur(c), R);
        const W = foaie.stoc.latime, H = foaie.stoc.inaltime;
        const margine = [[dc.minX, bc.minX], [W - dc.maxX, W - bc.maxX], [dc.minY, bc.minY], [H - dc.maxY, H - bc.maxY]]
          .every(([gd, gb]) => (gd ?? 0) >= Math.min(MARJA_SCHELET, gb ?? 0) - 1e-9);
        // Ordinea motivelor (ADR 0134 §1): a (traseele, candidații), b, c, apoi d (pereții piesei) și e (colțurile buclei).
        const motiv = !x.departe ? 'prea aproape de altă buclă'
          : !departeDeDegajari(x, it) ? 'prea aproape de degajarea altei bucle'
            : !departeDeUrechi(x.drum, c, 0, gu, R, D) ? 'ar tăia puntea unei urechi'
              : !margine ? 'prea aproape de marginea foii'
                : !x.pereti ? 'prea aproape de alt perete al piesei'
                  : !departeDeColturi(x, it) ? 'prea aproape de degajarea altui colț al buclei' : null;
        if (motiv) {
          avertismente.push(`${t.idLume}: degajarea omisă la colțul (${x.d.v.x.toFixed(3)}, ${x.d.v.y.toFixed(3)}): ${motiv}`);
          continue;
        }
        lista[x.j]?.push(x.d);
      }
      degajari = lista;
      // Plasa (ADR 0135 §5): un colț al desenului cu o latură curbă, la care freza ajunge (o buclă trece la cel mult
      // 2·R/cos(θ/2) de el), dar care nu e candidat (Q nu e vârf al traseului: decalarea a mâncat colțul), se spune, nu se
      // omite pe tăcute (recenzia 2.7b). Candidații omiși la §5 își spun singuri motivul.
      const aici = (p: { x: number; y: number }, q: { x: number; y: number }): boolean => Math.hypot(p.x - q.x, p.y - q.y) <= EPS_COLT;
      for (const c of colturiCurbe(desen, latura, t.sens, R)) {
        if ((candidati[it] ?? []).some((x) => aici(x.d.v, c.v))) continue;
        if (!bucle.some((b) => distantaLaContur(c.v, b) <= (2 * R) / c.cosJumatate)) continue;
        avertismente.push(`${t.idLume}: degajarea omisă la colțul (${c.v.x.toFixed(3)}, ${c.v.y.toFixed(3)}): freza nu ajunge în colț`);
      }
    }
    // Direcția pe linie (ADR 0092 §4): `invers` = fiecare buclă în sens opus desenului; `scurt` = o cale deschisă pornește
    // din capătul mai apropiat de unde a rămas freza (o buclă închisă rămâne cum e desenată).
    const directie = operatieDe(t)?.directie;
    if (directie !== undefined) {
      const c0 = treceri[0]?.contururi[0], aici = ultimaPozitie(miscari);
      const a = c0?.varfuri[0]?.p, b = c0?.varfuri[c0.varfuri.length - 1]?.p;
      const scurt = directie === 'scurt' && c0 !== undefined && !c0.inchis && aici !== null && a !== undefined && b !== undefined
        && Math.hypot(b.x - aici.x, b.y - aici.y) < Math.hypot(a.x - aici.x, a.y - aici.y);
      if (directie === 'invers' || scurt) {
        treceri = treceri.map((x) => ({ ...x, contururi: x.contururi.map(inverseaza) }));
        // Bucla inversată pornește din același vârf, deci poziția s devine P − s: urechile alese se oglindesc (cele egale sunt
        // simetrice).
        const bucle = treceri[0]?.contururi ?? [];
        if (urechi?.bucle) urechi = { ...urechi, bucle: urechi.bucle.map((cs, j) => { const P = lungimeBucla(bucle[j] as Contur); return cs.map((x) => P - x).sort((a, b) => a - b); }) };
      }
    }
    const tr = traseuProfil(treceri, regimFrezei(t.scula, regim), urechi, t.rampa ? { lungime: t.rampa.lungime } : undefined, intrari, degajari);
    if (!tr.ok) return { ok: false, motiv: `${t.idLume}: ${tr.motiv}` };
    montata(t);
    miscari.push({
      tip: 'eticheta', text: `${t.idLume}: ${t.forma.tip}, ${latura}, ${t.adancime} mm`, element: t.idLume, operatie: `${t.piesa}/${t.operatie}`,
    });
    // Fără `push(...listă)`: o listă foarte lungă depășește stiva de argumente.
    for (const m of tr.miscari) miscari.push(m);
  }
  // Finisările de după ultima tăietură (o ordine de mână care le pune la capăt; fără tăieturi, toate).
  const refuzFinisare = faFinisari(taieturi.length);
  if (refuzFinisare !== null) return { ok: false, motiv: refuzFinisare };
  if (putine.length > 0) avertismente.push(avertismentLemn(putine));
  for (const regula of ['lungi', 'scurte'] as const) {
    if (putineLaturi[regula].length > 0) avertismente.push(avertismentLaturi(regula, putineLaturi[regula]));
  }
  const program: Program = {
    axe: AXE_XYZ, scula: initiala ?? scula, turatie: regimFrezei(initialaDoc ?? primaScula, regim).turatie, zSigur: regim.zSigur, miscari,
  };
  // Tăișul (ADR 0300 §5): nicio freză nu coboară mai adânc decât el, pe tot ce taie (treceri, rampe, elice, supracursă).
  const peste = refuzTais(program, freze);
  if (peste) return { ok: false, motiv: peste };
  return { ok: true, program, avertismente, ...(puncteLemn.length > 0 ? { urechiLemn: puncteLemn } : {}) };
}
