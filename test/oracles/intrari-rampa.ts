/**
 * ORACOLUL intrărilor cu rampă (ADR 0031, felia 2.5c), cu ZERO importuri din `src/`. Scris doar din textul ADR 0031
 * (plus ADR 0029 pentru rampă și lanțuri, prin `rampa.ts`, ADR 0030 pentru intrare, buclă și ieșire, prin `intrari.ts`,
 * și ADR 0028 pentru profilul urechilor, prin `urechi.ts`), de o sesiune independentă de cea care a scris aplicația.
 * Două metode, care se verifică una pe alta:
 *
 * A. POARTA (`verificaIntrariCuRampa`, cu documentul în context, ca 2, 9–12). Pe o operație cu rampă și intrări (nu
 *    `pe-linie`), un LANȚ (`rampa.ts`: mișcările G1 / G2 / G3 consecutive, sub aceeași etichetă, care se termină sub
 *    fața de sus) care începe cu o porțiune deschisă înaintea primei bucle închise (`desparte` din `intrari.ts`) e o
 *    TRECERE CU INTRARE (ALEGERE: „are intrare” se citește din formă, nu din document; bucla fără intrare e un singur
 *    lanț din vârful 0, ADR 0029 §2, judecat în `rampa.ts`). Pe fiecare trecere cu intrare k (ADR 0031 §3, §5):
 *    - 11: înaintea lanțului, un G1 pe verticală care coboară prin aer și se oprește la fața de sus (Z = 0 ± 0,0005),
 *      în A; lanțul pleacă de la Z = 0; nicio altă coborâre pe verticală în lanț (cu toleranța din ADR 0029, precizarea
 *      din 10.10, pe panta intrării: d_k·0,001 / L_in + 0,0005);
 *    - 11: intrarea (porțiunea de dinaintea buclei, una sau mai multe mișcări) coboară LINIAR în lungimea arcului, de la
 *      0 în A la −d_k în p₀: în fiecare capăt de mișcare, |Z + d_k·s / L_in| ≤ TOL_Z_RAMPA + (d_k / L_in)·T_in;
 *    - 11: bucla pornește și se întoarce în p₀ la −d_k; ieșirea e la −d_k (fiecare capăt); urmează ridicarea (prima
 *      mișcare după lanț e pe verticală, în sus); trecerea are exact o buclă închisă;
 *    - 10 (ADR 0031 §5: s de la p₀; fiecare trecere e o tură întreagă la profilul ei): bucla, cu P MĂSURAT pe ea și s
 *      de la p₀, urmează profilul urechilor din ADR 0028 §3 la d_k (sau −d_k constant fără urechi / cu d_k ≤ vârf), pe
 *      banda `abatere` din `rampa.ts`; urechile care nu încap (W > 0,9·S, judecat cu P + T) = refuz;
 *    - 11, pe buclă (ALEGERE: „aceeași buclă” = aceeași tăietură, cu p₀ la cel mult TOL_ACELASI): trecerile ei vin una
 *      după alta, fără altă tăiere între ele (ADR 0031 §3: fiecare buclă, cu toate trecerile ei, înaintea buclei
 *      următoare); fundul crește strict (d_k > d_{k−1} + TOL_Z_RAMPA); ultima trecere ajunge la adâncimea operației
 *      (±TOL_ADANCIME_FINALA).
 *    d_k = −(cel mai jos Z al lanțului): fundul trecerii, citit din program (ALEGERE, ca în `rampa.ts`: împărțirea
 *    adâncimii în treceri nu e în contract; invarianta 1 o leagă de pas).
 *    Invariantele 9 și 12 amendate sunt în `intrari.ts` (`regula0030` cu razele de sub rampă; razele, capetele Z ale
 *    intrării și refuzul razei cu sfertul sub 1 mm), iar bucla fără intrare rămâne în `rampa.ts` (predicatul
 *    `pasCuIntrare`, dat de poartă lui `verificaRampa`).
 *
 * B. HÂRTIA (`masoaraIntrariCuRampa`, `campul`): un cititor fără etichete (`parcurgeriHartie`, plus mișcarea de dinainte
 *    și de după fiecare parcurgere) care măsoară, pe fiecare buclă și trecere: A, p₀, C și ρ (din arcul intrării), Z-ul
 *    la capetele intrării, cât se abate Z de la dreapta dintre ele (în lungimea arcului), viteza pe verticală pe elice
 *    (F·|ΔZ| / L₃) și F scris, coborârea prin aer (G1 pe verticală până la Z = 0, cu F), ieșirea, ridicarea; și un CÂMP
 *    DE ÎNĂLȚIMI propriu, pe o fereastră în jurul cercului intrării, care dă cât scoate fiecare mișcare (pe discul
 *    R − 0,004, ca poarta) și fundul lăsat într-un punct. Valorile așteptate vin din geometria de pe hârtie
 *    (`intrari-rampa.cazuri.ts`), niciodată din program.
 *    PRECIZAREA DIN 10.10 (urechile buclei înseși): `punteleUrechilor` citește pe același câmp fundul lăsat de-a lungul
 *    coloanei fiecărei urechi ([c_k − h + R, c_k + h − R] pe bucla analitică, de la p₀), în secțiunea fantei (normala
 *    traseului, ±0,9·R): puntea are grosimea întreagă dacă fundul nu coboară sub −vârf (±0,002). Condiția c a
 *    invariantei 12 (coloana la cel puțin D de semicerc) e în `intrari.ts` (`incapeTot`, `coloaneleUrechilor`).
 *
 * TĂIEREA TRECERII cu intrare (`desparteCuRampa` din `intrari.ts`, ALEGERE): după coborâre, nu după prima închidere a
 * drumului: A poate sta pe buclă (sfertul intrării chiar pe arcul unui colț de rază ρ, iar bucla trece din nou prin A).
 *
 * TOLERANȚELE (cotele rotunjite la 3 zecimale, F la 0,1):
 * - Z: TOL_Z_RAMPA = 0,002 (ca la rampă); fața de sus TOL_FATA = 0,0005; adâncimea finală ±0,001;
 * - s: T = TOL_S_FIX + TOL_S_PE_RADIAN·Θ (ca la urechi și rampă), pe intrare cu Θ al intrării, pe buclă cu Θ al buclei;
 * - pe hârtie: A, p₀, C, ρ ±0,003; F ±(0,05 + 300·0,0011 / d_k + 0,1) (rotunjirea lui F și a cotelor); fundul în câmp
 *   ±(panta·(celula·√2/2 + pasul eșantionării) + 0,002); cât scoate o mișcare ±0,002 (Z rotunjit).
 */
import type { LaturaV10O } from './document.ts';
import { citeste, regulaArcGrbl, type Eveniment, type Mutare, type Punct3 } from './gcode.ts';
import type { Regiune } from './regiune.ts';
import { orientareMontaj, type EtichetaActiva, type P2 } from './sens.ts';
import {
  abatere, lanturile, parametriiEtichetelor, parcurgeriHartie, TOL_ADANCIME_FINALA, TOL_FATA, TOL_Z_RAMPA, tolVerticala,
  type Lant, type ParametriEticheta, type PasL,
} from './rampa.ts';
import { profil, rupturi, TOL_S_FIX, TOL_S_PE_RADIAN, zProfil, type Profil } from './urechi.ts';
import { arcul, bucataDeTraseu, desparte, desparteCuRampa, dinVarful0, TOL_ACELASI, type Bucata, type TrecereI } from './intrari.ts';
import { distantaListe, lungime as lungimeP, peOParte, punct, pt, punctLa, type Primitiva } from './regiune.ts';
import type { UrechiO } from './document.ts';

const mm = (v: number): string => v.toFixed(3);
const dist = (p: P2, q: P2): number => Math.hypot(p.x - q.x, p.y - q.y);

/** Lanțul e o trecere cu rampa pe intrare (ADR 0031 §3): operația are intrări, nu e pe linie, iar lanțul pleacă din afara buclei. */
export function pasCuIntrare(l: Lant, x: ParametriEticheta, latura: LaturaV10O): boolean {
  return x.intrari !== null && x.rampa !== null && latura !== 'pe-linie' && !peOParte(latura) && desparteCuRampa(l.pasi) !== null;
}

// ---------------------------------------------------------------------------------------------------------------
// A. Invariantele 10 și 11 pe trecerile cu rampa pe intrare.

export type IncalcareIR = { readonly invarianta: 10 | 11; readonly linia: number; readonly mesaj: string };

/** Pașii lanțului care corespund unor bucăți ale trecerii (după linie), în ordine. */
const pasiiBucatilor = (t: TrecereI, bucati: readonly Bucata[]): PasL[] => bucati.map((b) => t.pasi.find((p) => p.linia === b.linia)!).filter(Boolean);

/** Bucla trecerii ca lanț separat, cu s de la p₀ (pentru `abatere`). */
function lantulBuclei(l: Lant, pasi: readonly PasL[]): Lant {
  const s0 = pasi[0]!.s0;
  const re = pasi.map((p) => ({ ...p, s0: p.s0 - s0, s1: p.s1 - s0 }));
  const theta = re.reduce((s, p) => s + (p.unghi === undefined ? 0 : Math.abs(p.unghi)), 0);
  return { eticheta: l.eticheta, pasi: re, inainte: null, lungime: re[re.length - 1]!.s1, theta };
}

/**
 * Invariantele 10 și 11 pe trecerile cu rampa pe intrare (antetul, A). `grosimeFoaie` = grosimea foii documentului
 * (vârful urechilor). Întoarce încălcările.
 */
export function verificaIntrariCuRampa(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, laDoc: (p: Punct3) => Punct3, grosimeFoaie: number,
): IncalcareIR[] {
  const rez: IncalcareIR[] = [];
  const par = parametriiEtichetelor(etichete, reg);
  const mutari = evenimente.flatMap((e) => (e.tip === 'mutare' ? [e.m] : []));
  const dupa = (linia: number): Mutare | undefined => mutari.find((m) => m.linia > linia);
  type BuclaIR = { readonly cheie: string; readonly p0: P2; readonly cine: string; readonly adancime: number; readonly d: number[]; readonly linia: number };
  const bucle: BuclaIR[] = [];
  let ultima: BuclaIR | null = null;
  for (const l of lanturile(evenimente, etichete.map((e) => e.linia), laDoc)) {
    const et = l.eticheta >= 0 ? etichete[l.eticheta]!.eticheta : null;
    const x = l.eticheta >= 0 ? par[l.eticheta] : null;
    if (!et || !x || 'motiv' in x || !pasCuIntrare(l, x, et.latura)) { ultima = null; continue; }
    const cine = `${et.idLume} (${et.latura})`;
    const t = desparteCuRampa(l.pasi)!;
    const linia = l.pasi[0]!.linia;
    const d = -t.zMin;
    // §3.2: coborârea prin aer, G1 pe verticală, până la fața de sus, în A.
    const i = l.inainte;
    if (!i || i.cod !== 1 || i.a[0] !== i.b[0] || i.a[1] !== i.b[1] || !(i.b[2] < i.a[2]) || !(i.a[2] > TOL_FATA) || Math.abs(i.b[2]) > TOL_FATA) {
      rez.push({ invarianta: 11, linia: i?.linia ?? linia, mesaj: `intrările cu rampă (11): înaintea trecerii lui ${cine} nu e coborârea G1 pe verticală, prin aer, până la fața de sus (Z = 0), în A` });
    }
    if (Math.abs(l.pasi[0]!.za) > TOL_FATA) {
      rez.push({ invarianta: 11, linia, mesaj: `intrările cu rampă (11): trecerea lui ${cine} pleacă din A de la Z ${mm(l.pasi[0]!.za)}, nu de la fața de sus` });
    }
    const intrare = pasiiBucatilor(t, t.intrare);
    const Lin = intrare.reduce((s, p) => s + (p.s1 - p.s0), 0);
    // §5, 11: singura coborâre pe verticală e cea prin aer, înaintea lanțului.
    const tolV = tolVerticala(d, Math.max(Lin, 1e-9));
    const v = l.pasi.find((p) => p.vertical && p.za - p.zb > tolV + 1e-9);
    if (v) rez.push({ invarianta: 11, linia: v.linia, mesaj: `intrările cu rampă (11): ${cine} coboară pe verticală în material, de la ${mm(v.za)} la ${mm(v.zb)}` });
    if (!t.inchisa || t.p0 === null) {
      rez.push({ invarianta: 11, linia, mesaj: `intrările cu rampă (11): trecerea lui ${cine} nu are o buclă închisă` });
      ultima = null;
      continue;
    }
    if (t.bucle !== 1) rez.push({ invarianta: 11, linia, mesaj: `intrările cu rampă (11): trecerea lui ${cine} are ${t.bucle} bucle (o trecere = intrarea, o buclă, ieșirea)` });
    // §3.3: Z liniar în lungimea arcului, de la 0 în A la −d_k în p₀.
    const thetaIn = intrare.reduce((s, p) => s + (p.unghi === undefined ? 0 : Math.abs(p.unghi)), 0);
    const Tin = TOL_S_FIX + TOL_S_PE_RADIAN * thetaIn;
    let rau = { abatere: 0, linia, s: 0, z: 0, cerut: 0 };
    let s = 0;
    for (const p of intrare) {
      for (const [sp, z] of [[s, p.za], [s + (p.s1 - p.s0), p.zb]] as const) {
        const cerut = Lin > 0 ? -(d * sp) / Lin : -d;
        const ab = Math.abs(z - cerut) - (TOL_Z_RAMPA + (Lin > 0 ? (d / Lin) * Tin : 0));
        if (ab > rau.abatere) rau = { abatere: ab, linia: p.linia, s: sp, z, cerut };
      }
      s += p.s1 - p.s0;
    }
    if (rau.abatere > 0) {
      rez.push({ invarianta: 11, linia: rau.linia, mesaj: `intrările cu rampă (11): intrarea lui ${cine} are Z ${mm(rau.z)} la ${mm(rau.s)} mm din A; liniar de la 0 la −d_k = ${mm(-d)} pe ${mm(Lin)} mm cere ${mm(rau.cerut)}` });
    }
    // §3.4: bucla din p₀ înapoi în p₀, la −d_k în p₀; §3.5: ieșirea la −d_k.
    const bucla = pasiiBucatilor(t, t.bucla);
    const iesire = pasiiBucatilor(t, t.iesire);
    const zP0 = [bucla[0]?.za ?? NaN, bucla[bucla.length - 1]?.zb ?? NaN];
    if (zP0.some((z) => !(Math.abs(z + d) <= TOL_Z_RAMPA))) {
      rez.push({ invarianta: 11, linia: bucla[0]?.linia ?? linia, mesaj: `intrările cu rampă (11): bucla lui ${cine} e în p₀ la Z ${zP0.map(mm).join(' / ')}, nu la fundul trecerii (${mm(-d)})` });
    }
    const iesRea = iesire.find((p) => !(Math.abs(p.za + d) <= TOL_Z_RAMPA && Math.abs(p.zb + d) <= TOL_Z_RAMPA));
    if (iesRea) rez.push({ invarianta: 11, linia: iesRea.linia, mesaj: `intrările cu rampă (11): ieșirea lui ${cine} merge de la Z ${mm(iesRea.za)} la ${mm(iesRea.zb)}, nu la −d_k = ${mm(-d)}` });
    // §3.6: ridicarea.
    const ultimul = l.pasi[l.pasi.length - 1]!;
    const urm = dupa(ultimul.linia);
    if (!urm || urm.a[0] !== urm.b[0] || urm.a[1] !== urm.b[1] || !(urm.b[2] > urm.a[2])) {
      rez.push({ invarianta: 11, linia: urm?.linia ?? ultimul.linia, mesaj: `intrările cu rampă (11): după ieșirea lui ${cine} nu urmează ridicarea pe verticală` });
    }
    // 10 (§5): bucla la profilul trecerii, cu s de la p₀ și P măsurat pe ea.
    if (bucla.length) {
      const lb = lantulBuclei(l, bucla);
      const P = lb.lungime;
      const T = TOL_S_FIX + TOL_S_PE_RADIAN * lb.theta;
      const varf = x.urechi === null ? Infinity : grosimeFoaie - x.urechi.grosime;
      let pr: Profil | null = null;
      let refuz = false;
      if (x.urechi !== null && d > varf + TOL_Z_RAMPA) {
        if (!profil(P + T, x.urechi, varf, d)) refuz = true;
        else pr = profil(P, x.urechi, varf, d) ?? profil(P + T, x.urechi, varf, d);
      }
      if (refuz) {
        rez.push({ invarianta: 10, linia, mesaj: `urechile lui ${cine} nu încap pe bucla de ${mm(P)} mm (W > 0,9·S): exportul trebuia refuzat` });
      } else {
        const f = (q: number): number => (pr ? zProfil(pr, q) : -d);
        const ab = abatere(lb, f, pr ? rupturi(pr) : [], T, 0, P, 'egal');
        if (ab.abatere > 0) {
          rez.push({ invarianta: 10, linia: ab.linia, mesaj: `urechile (intrări cu rampă): bucla lui ${cine} are Z ${mm(ab.z)} la s ${mm(ab.s)} de la p₀; profilul trecerii (d ${mm(d)}, P ${mm(P)}) cere ${mm(ab.asteptat[0])}…${mm(ab.asteptat[1])}` });
        }
      }
    }
    // Trecerile aceleiași bucle: una după alta, fundul crescător.
    const cheie = `${et.idLume}|${et.latura}|${x.adancime}`;
    let b = bucle.find((q) => q.cheie === cheie && dist(q.p0, t.p0!) <= TOL_ACELASI) ?? null;
    if (b && b !== ultima) {
      rez.push({ invarianta: 11, linia, mesaj: `intrările cu rampă (11): bucla lui ${cine} din p₀ (${mm(t.p0.x)}, ${mm(t.p0.y)}) revine după altă tăiere (ADR 0031 §3: fiecare buclă, cu toate trecerile ei, înaintea buclei următoare)` });
    }
    if (!b) {
      b = { cheie, p0: t.p0, cine, adancime: x.adancime, d: [], linia };
      bucle.push(b);
    } else if (!(d > b.d[b.d.length - 1]! + TOL_Z_RAMPA)) {
      rez.push({ invarianta: 11, linia, mesaj: `intrările cu rampă (11): ${cine}, trecerea ${b.d.length + 1}: fundul ${mm(-d)} nu e sub cel al trecerii de dinainte (${mm(-b.d[b.d.length - 1]!)})` });
    }
    b.d.push(d);
    ultima = b;
  }
  for (const b of bucle) {
    const dn = b.d[b.d.length - 1]!;
    if (Math.abs(dn - b.adancime) > TOL_ADANCIME_FINALA) {
      rez.push({ invarianta: 11, linia: b.linia, mesaj: `intrările cu rampă (11): ultima trecere a buclei lui ${b.cine} ajunge la ${mm(-dn)}, nu la adâncimea operației (${b.adancime} mm)` });
    }
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// B. Hârtia: cititorul fără etichete și câmpul de înălțimi.

/** O mișcare a programului, în document. */
export type MiscareH = { readonly linia: number; readonly cod: number; readonly a: Punct3; readonly b: Punct3; readonly f?: number };

export type MasuraIR = {
  readonly cuIntrare: boolean;
  readonly A: P2;
  readonly p0: P2 | null;
  readonly C: P2 | null;
  readonly rho: number | null;
  /** Unghiul intrării (rad, cu semn, în document). */
  readonly unghi: number | null;
  /** Z la capetele intrării (în A și în p₀). */
  readonly zA: number;
  readonly zP0: number;
  /** Cea mai mare abatere a Z-ului de pe intrare de la dreapta zA → zP0, în lungimea arcului (capetele mișcărilor). */
  readonly neliniar: number;
  /** Cea mai mare viteză pe verticală pe intrare (F·|ΔZ| / L₃, mm/min) și F-ul primei mișcări a intrării. */
  readonly vitezaV: number;
  readonly F: number | null;
  readonly zFund: number;
  /** Z-ul ieșirii, cel mai jos și cel mai sus. */
  readonly iesire: readonly [number, number] | null;
  /** Mișcarea de dinainte: coborârea prin aer (G1 pe verticală, Z la capăt, F). */
  readonly aer: { readonly g1Vertical: boolean; readonly za: number; readonly zb: number; readonly f: number | null } | null;
  readonly ridicare: boolean;
  /** Coborârile pe verticală din parcurgere (peste 0,0005). */
  readonly verticale: number;
  readonly linii: readonly [number, number];
};

/** Mișcările programului, în document, cu cea de dinainte și de după fiecare linie. */
function miscarile(text: string, laDoc: (p: Punct3) => Punct3): MiscareH[] {
  return citeste(text).evenimente.flatMap((e) => (e.tip === 'mutare'
    ? [{ linia: e.m.linia, cod: e.m.cod, a: laDoc(e.m.a), b: laDoc(e.m.b), ...(e.m.f === undefined ? {} : { f: e.m.f }) }] : []));
}

/** Măsoară fiecare parcurgere (antetul, B). */
export function masoaraIntrariCuRampa(text: string, laDoc: (p: Punct3) => Punct3): MasuraIR[] {
  const toate = miscarile(text, laDoc);
  return parcurgeriHartie(text, laDoc).map((pasi) => {
    const t = desparteCuRampa(pasi) ?? desparte(pasi);
    const prima = pasi[0]!, ultima = pasi[pasi.length - 1]!;
    const k0 = toate.findIndex((m) => m.linia === prima.linia), k1 = toate.findIndex((m) => m.linia === ultima.linia);
    const ina = toate[k0 - 1], urm = toate[k1 + 1];
    const intrare = t.intrare.map((b) => pasi.find((p) => p.linia === b.linia)!);
    const iesire = t.iesire.map((b) => pasi.find((p) => p.linia === b.linia)!);
    const a = t.intrare.length ? arcul(t.intrare) : null;
    const arc = a && typeof a === 'object' ? a : null;
    const zA = intrare[0]?.za ?? prima.za;
    const zP0 = intrare[intrare.length - 1]?.zb ?? prima.za;
    const Lin = intrare.reduce((s, p) => s + (p.s1 - p.s0), 0);
    let neliniar = 0, vitezaV = 0, s = 0;
    for (const p of intrare) {
      const L = p.s1 - p.s0;
      for (const [sp, z] of [[s, p.za], [s + L, p.zb]] as const) neliniar = Math.max(neliniar, Math.abs(z - (zA + ((zP0 - zA) * sp) / (Lin || 1))));
      const dz = p.za - p.zb;
      if (dz > 0 && p.f !== undefined) vitezaV = Math.max(vitezaV, (p.f * dz) / Math.hypot(L, dz));
      s += L;
    }
    const zi = iesire.flatMap((p) => [p.za, p.zb]);
    return {
      cuIntrare: t.intrare.length > 0, A: t.A, p0: t.p0, C: arc?.c ?? null, rho: arc?.r ?? null, unghi: arc?.unghi ?? null,
      zA, zP0, neliniar, vitezaV, F: intrare[0]?.f ?? null, zFund: t.zMin,
      iesire: zi.length ? [Math.min(...zi), Math.max(...zi)] as const : null,
      aer: ina ? { g1Vertical: ina.cod === 1 && ina.a[0] === ina.b[0] && ina.a[1] === ina.b[1], za: ina.a[2], zb: ina.b[2], f: ina.f ?? null } : null,
      ridicare: !!urm && urm.a[0] === urm.b[0] && urm.a[1] === urm.b[1] && urm.b[2] > urm.a[2],
      verticale: pasi.filter((p) => p.vertical && p.za - p.zb > 0.0005 + 1e-9).length,
      linii: [prima.linia, ultima.linia] as const,
    };
  });
}

/** Ce cere hârtia pe o trecere cu intrare (ADR 0031 §3), din geometria de pe hârtie. */
export type AsteptatIR = {
  readonly A: P2; readonly p0: P2; readonly C: P2; readonly rho: number;
  /** +1: intrarea trigonometrică (deșeul în stânga), −1: orară. */
  readonly semn: 1 | -1;
  /** Fundul trecerii și fundul trecerii de dinainte (mm, pozitive). */
  readonly d: number;
  readonly avans: number; readonly avansPlonjare: number;
};

/** F cerut pe elice (ADR 0029 §3, ADR 0031 §3.3): min(avans, avansPlonjare·L₃ / |ΔZ|), cu L₃ = √((πρ/2)² + d²). */
export const avansElice = (rho: number, d: number, avans = 1000, avansPlonjare = 300): number =>
  Math.min(avans, (avansPlonjare * Math.hypot((Math.PI * rho) / 2, d)) / d);

/** Diferențele dintre o măsură și hârtie (goală = trecerea e cea de pe hârtie). */
export function comparaIntrareCuRampa(m: MasuraIR, a: AsteptatIR, tol = 0.003): string[] {
  const rele: string[] = [];
  const la = (p: P2 | null, q: P2, ce: string): void => { if (!p || dist(p, q) > tol) rele.push(`${ce} ${p ? `(${mm(p.x)}, ${mm(p.y)})` : 'lipsă'}, nu (${mm(q.x)}, ${mm(q.y)})`); };
  if (!m.cuIntrare) return ['trecerea n-are intrare; hârtia cere intrarea cu rampă'];
  la(m.A, a.A, 'A');
  la(m.p0, a.p0, 'p₀');
  la(m.C, a.C, 'C');
  if (m.rho === null || Math.abs(m.rho - a.rho) > tol) rele.push(`ρ ${m.rho === null ? 'lipsă' : mm(m.rho)}, nu ${mm(a.rho)}`);
  if (m.unghi === null || Math.abs(m.unghi - (a.semn * Math.PI) / 2) > tol / a.rho + 1e-4) rele.push(`intrarea are ${m.unghi === null ? '?' : (m.unghi * 180 / Math.PI).toFixed(2)}°, nu ${a.semn * 90}°`);
  if (Math.abs(m.zA) > TOL_FATA) rele.push(`intrarea pleacă din A de la Z ${mm(m.zA)}, nu de la 0`);
  if (Math.abs(m.zP0 + a.d) > TOL_Z_RAMPA) rele.push(`intrarea ajunge în p₀ la Z ${mm(m.zP0)}, nu la −d_k = ${mm(-a.d)}`);
  if (Math.abs(m.zFund + a.d) > TOL_Z_RAMPA) rele.push(`fundul trecerii e ${mm(m.zFund)}, nu ${mm(-a.d)}`);
  if (m.neliniar > TOL_Z_RAMPA) rele.push(`Z-ul intrării se abate cu ${mm(m.neliniar)} de la dreapta în lungimea arcului`);
  const F = avansElice(a.rho, a.d, a.avans, a.avansPlonjare);
  if (m.F === null || Math.abs(m.F - F) > 0.05 + (a.avansPlonjare * 0.0011) / a.d + 0.1) rele.push(`F pe elice ${m.F ?? 'lipsă'}, nu ${F.toFixed(1)} (min(avans, avansPlonjare·L₃ / d))`);
  if (m.vitezaV > a.avansPlonjare * (1 + 0.0011 / a.d) * (1 + 0.0021 / ((Math.PI * a.rho) / 2)) + 0.05) rele.push(`viteza pe verticală pe elice ${m.vitezaV.toFixed(1)} mm/min, peste avansul de plonjare ${a.avansPlonjare}`);
  if (!m.iesire || Math.abs(m.iesire[0] + a.d) > TOL_Z_RAMPA || Math.abs(m.iesire[1] + a.d) > TOL_Z_RAMPA) rele.push(`ieșirea e la Z ${m.iesire ? `${mm(m.iesire[0])}…${mm(m.iesire[1])}` : 'lipsă'}, nu la ${mm(-a.d)}`);
  if (!m.aer || !m.aer.g1Vertical || !(m.aer.za > TOL_FATA) || Math.abs(m.aer.zb) > TOL_FATA) rele.push('înaintea trecerii nu e G1 pe verticală, prin aer, până la Z = 0');
  else if (m.aer.f === null || Math.abs(m.aer.f - a.avansPlonjare) > 0.05) rele.push(`coborârea prin aer are F ${m.aer.f ?? 'lipsă'}, nu avansul de plonjare ${a.avansPlonjare}`);
  if (!m.ridicare) rele.push('după ieșire nu urmează ridicarea pe verticală');
  if (m.verticale) rele.push(`${m.verticale} coborâri pe verticală în material`);
  return rele;
}

/** Fereastra câmpului (în document) și celula, mm. */
export type Fereastra = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly celula: number };

export type Camp = {
  /** Cât scoate fiecare mișcare (după linie), pe discul R − 0,004, în fereastră. */
  readonly scos: ReadonlyMap<number, number>;
  /** Fundul lăsat în punctul (x, y) (celula care îl conține); 0 = fața de sus. */
  readonly fund: (x: number, y: number) => number;
};

/**
 * Câmpul de înălțimi propriu (antetul, B): fiecare mișcare G1 / G2 / G3 cu startul cunoscut, în ordine, eșantionată la
 * cel mult celula / 3 (arcul pe cercul văzut de GRBL, Z liniar în fracțiune); sub fiecare eșantion de sub fața de sus,
 * discul R taie celulele din fereastră; cât scoate se măsoară pe discul R − 0,004 (ca poarta: banda de rotunjire).
 */
export function campul(text: string, laDoc: (p: Punct3) => Punct3, R: number, f: Fereastra): Camp {
  const nx = Math.ceil((f.x1 - f.x0) / f.celula), ny = Math.ceil((f.y1 - f.y0) / f.celula);
  const g = new Float64Array(nx * ny);
  const scos = new Map<number, number>();
  const Rm2 = (R - 0.004) ** 2;
  const orientare = orientareMontaj(laDoc);
  for (const e of citeste(text).evenimente) {
    if (e.tip !== 'mutare' || e.m.cod === 0 || !e.m.startCunoscut) continue;
    const m = e.m;
    const a = laDoc(m.a), b = laDoc(m.b);
    if (Math.min(a[2], b[2]) >= -1e-6) continue;
    let punct: (u: number) => readonly [number, number];
    let L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if ((m.cod === 2 || m.cod === 3) && ((m.i ?? 0) !== 0 || (m.j ?? 0) !== 0)) {
      const { unghi, raza } = regulaArcGrbl(m);
      const c3 = laDoc([m.a[0] + (m.i ?? 0), m.a[1] + (m.j ?? 0), m.a[2]]);
      const u0 = Math.atan2(a[1] - c3[1], a[0] - c3[0]);
      const du = unghi * orientare;
      L = raza * Math.abs(unghi);
      punct = (u) => [c3[0] + raza * Math.cos(u0 + du * u), c3[1] + raza * Math.sin(u0 + du * u)];
    } else {
      punct = (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    }
    const n = Math.max(1, Math.ceil(L / (f.celula / 3)));
    let max = 0;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const z = a[2] + (b[2] - a[2]) * u;
      if (z >= -1e-6) continue;
      const [x, y] = punct(u);
      if (x + R < f.x0 || x - R > f.x1 || y + R < f.y0 || y - R > f.y1) continue;
      const i0 = Math.max(0, Math.floor((x - R - f.x0) / f.celula)), i1 = Math.min(nx - 1, Math.floor((x + R - f.x0) / f.celula));
      const j0 = Math.max(0, Math.floor((y - R - f.y0) / f.celula)), j1 = Math.min(ny - 1, Math.floor((y + R - f.y0) / f.celula));
      for (let j = j0; j <= j1; j++) {
        const dy = f.y0 + (j + 0.5) * f.celula - y;
        for (let i = i0; i <= i1; i++) {
          const dx = f.x0 + (i + 0.5) * f.celula - x;
          const d2 = dx * dx + dy * dy;
          if (d2 > R * R) continue;
          const sus = g[j * nx + i]!;
          if (d2 <= Rm2 && sus - z > max) max = sus - z;
          if (z < sus) g[j * nx + i] = z;
        }
      }
    }
    if (max > 0) scos.set(m.linia, Math.max(scos.get(m.linia) ?? 0, max));
  }
  const fund = (x: number, y: number): number => {
    const i = Math.floor((x - f.x0) / f.celula), j = Math.floor((y - f.y0) / f.celula);
    return i >= 0 && j >= 0 && i < nx && j < ny ? g[j * nx + i]! : 0;
  };
  return { scos, fund };
}

/** Punctul și tangenta (în sensul de mers) pe o buclă de primitive, la lungimea s de la startul ei. */
function peBucla(bucla: readonly Primitiva[], s: number): { readonly p: P2; readonly t: P2 } {
  let acum = 0;
  for (const q of bucla) {
    const L = lungimeP(q);
    if (s <= acum + L + 1e-12 || q === bucla[bucla.length - 1]) {
      const u = Math.max(0, Math.min(L, s - acum));
      const p = punctLa(q, u);
      if (q.tip === 'segment') { const n = Math.hypot(q.b.x - q.a.x, q.b.y - q.a.y); return { p, t: { x: (q.b.x - q.a.x) / n, y: (q.b.y - q.a.y) / n } }; }
      if (q.tip === 'arc') { const r = { x: (p.x - q.c.x) / q.r, y: (p.y - q.c.y) / q.r }; return { p, t: q.du > 0 ? { x: -r.y, y: r.x } : { x: r.y, y: -r.x } }; }
      return { p, t: { x: 1, y: 0 } };
    }
    acum += L;
  }
  return { p: { x: 0, y: 0 }, t: { x: 1, y: 0 } };
}

export type Punte = { readonly k: number; readonly zMin: number; readonly la: P2; readonly esantioane: number };

/**
 * Puntea fiecărei urechi (precizarea din 10.10 a ADR 0031; ADR 0028 §2): pe bucla analitică pornită din p₀ (`bucla`, în
 * sensul de mers), coloana urechii k e [c_k − h + R, c_k + h − R], c_k = (k + ½)·P / n; de-a lungul ei (din 0,25 în
 * 0,25 mm, plus capetele; un punct cu W = D) și peste fantă (normala, la 0, ±0,45·R, ±0,9·R), fundul lăsat de program pe
 * câmpul de înălțimi (celula 0,05). ALEGERE (puntea GARANTATĂ de ADR 0028): se păstrează doar eșantioanele la peste
 * R + 0,05 de traseul din afara palierului ([c_k − h, c_k + h]): pe o buclă strânsă, partea concavă a secțiunii de la
 * capetele coloanei e atinsă de flancuri (fundul sub −vârf fără nicio intrare: gaura R8, bucla R5, cu 0,124 mm), iar
 * la capete rotunjirea celulei (0,035) ar atinge flancul. Întoarce cel mai jos fund de pe fiecare punte; hârtia cere
 * ≥ −vârf.
 */
export function punteleUrechilor(text: string, laDoc: (p: Punct3) => Punct3, bucla: readonly Primitiva[], p0: P2, urechi: UrechiO, R: number): Punte[] {
  const { bucla: b } = dinVarful0(bucla, p0);
  const P = b.reduce((s, q) => s + lungimeP(q), 0);
  const S = P / urechi.numar, h = urechi.latime / 2;
  return Array.from({ length: urechi.numar }, (_, k) => {
    const c = (k + 0.5) * S;
    const s0 = c - h + R, s1 = c + h - R;
    const ss = s1 > s0 ? [s0, ...Array.from({ length: Math.floor((s1 - s0) / 0.25) }, (_, j) => s0 + 0.25 * (j + 1)).filter((x) => x < s1), s1] : [c];
    const afara = [...bucataDeTraseu(b, 0, c - h), ...bucataDeTraseu(b, c + h, P)].filter((q) => q.tip !== 'punct');
    const puncte: P2[] = [];
    for (const s of ss) {
      const { p, t } = peBucla(b, s);
      for (const o of [-0.9, -0.45, 0, 0.45, 0.9]) {
        const q = { x: p.x - t.y * o * R, y: p.y + t.x * o * R };
        if (distantaListe([punct(pt(q.x, q.y))], afara) > R + 0.05) puncte.push(q);
      }
    }
    if (!puncte.length) return { k, zMin: Infinity, la: { x: NaN, y: NaN }, esantioane: 0 };
    const xs = puncte.map((q) => q.x), ys = puncte.map((q) => q.y);
    const m = R + 0.5;
    const camp = campul(text, laDoc, R, { x0: Math.min(...xs) - m, y0: Math.min(...ys) - m, x1: Math.max(...xs) + m, y1: Math.max(...ys) + m, celula: 0.05 });
    let zMin = Infinity, la = puncte[0]!;
    for (const q of puncte) { const z = camp.fund(q.x, q.y); if (z < zMin) { zMin = z; la = q; } }
    return { k, zMin, la, esantioane: puncte.length };
  });
}
