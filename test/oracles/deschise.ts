/**
 * CĂILE DESCHISE ÎN POARTĂ (ADR 0037 §7, §8, §9, §13; felia 2.3c-2, sesiune independentă, scris doar din textul ADR-ului),
 * cu ZERO importuri din `src/`. Rulează tot doar cu `regiune` (documentul v10 în context, `regiuneDinDocument`): eticheta
 * `(<idLume>: cale, pe-linie, <adâncime> mm)` e a unei căi deschise când `TaieturaDoc.inchis === false` (poarta află asta
 * din document, ca sensul, urechile, rampa și intrările). Conturul căii deschise (fără coarda de închidere, cu capetele
 * în lume) îl construiește `regiune.ts`; pe el judecă 14 (i) (`pe-linie.ts`), neschimbată.
 *
 * Ce judecă aici:
 * - **Invarianta 11, amendată** (§7, §13), pe fiecare LANȚ (definiția din `rampa.ts`: mișcările G1 / G2 / G3 consecutive,
 *   cu startul cunoscut, ale căror capete sunt sub fața de sus, sub aceeași etichetă) al unei etichete de cale deschisă:
 *   - începe cu o plonjare pe verticală din aer (X și Y neschimbate, din Z ≥ 0);
 *   - nicio altă coborâre pe verticală în lanț (zig-zag-ul la a doua trecere, „fără zig-zag”, §7);
 *   - Z constant pe drum, la adâncimea plonjării (± `TOL_Z_DESCHIS`): fără rampă;
 *   - imediat după lanț, ridicarea: o mișcare pe verticală, în sus, care se termină în aer (Z ≥ 0);
 *   - pe `pe-linie`: plonjarea în vârful 0 al căii, capătul lanțului în ultimul vârf (± `TOL_CAPAT`), iar drumul în plan
 *     nu e mai lung decât calea (± `tolLungime`): o singură parcurgere, fără întoarcere la adâncime;
 *   - pe etichetă: toate trecerile plonjează în același punct, adâncimile lor nu scad, iar cea mai adâncă ajunge la
 *     adâncimea operației (± 0,001).
 *   Întoarcerea în punctul plonjării NU se mai cere (o cale care se închide singură o face, și e permisă).
 * - **14 (iii), ordinea** (§8): doar pe documentele cu cel puțin o tăietură deschisă pe foaia 0 (ALEGERE: pe celelalte,
 *   ordinea §8 coincide cu ADR 0025, iar echivalența de la §13 cere aceleași verdicte; ordinea ADR 0025 o probează
 *   oracolul documentului). Fiecare etichetă validă e legată de tăietura ei din `Regiune.ordine` (elementul, latura,
 *   adâncimea ± 0,0005; a k-a apariție = a k-a candidată, ca la 9–13); indicii trebuie să crească strict, iar orice
 *   tăietură a foii fără etichetă lipsește din program. Așa, despărțirea tăiată înaintea exterioarelor și tăietura
 *   deschisă nemarcată pusă după ele (în clasa despărțirilor) sunt amândouă încălcări.
 * - **Refuzurile, luate ca încălcări** (§9, §13), pe document (linia 0, o dată pe operație sau pe element), fiindcă
 *   exportul trebuia refuzat întreg:
 *   - o operație cu cel puțin un nod deschis, cu urechi (10), rampă (11), intrări (12) sau degajări (13) (ALEGERE:
 *     numărul invariantei e al parametrului);
 *   - exteriorul / interiorul pe un element deschis (2), stânga / dreapta pe unul închis (2), stânga și dreapta pe același
 *     element (2);
 *   - (14) marcajul `despartire: true` pe o cale închisă sau pe o adâncime sub grosimea foii (§8: „marcajul se judecă”);
 *     calea deschisă degenerată, cu mai puțin de 2 vârfuri distincte sau mai scurtă de 0,01 mm (§4);
 *   - (14) §8, ca în textul acceptat: o tăietură DESCHISĂ prin foaie (adâncimea ≥ grosimea foii), NEMARCATĂ, care ajunge
 *     la marginea foii: un capăt (vârful 0 sau ultimul, în lume) la cel mult R + 1 mm de conturul foii 0 a documentului,
 *     sau în afara ei (R = raza frezei operației). Aplicația nu hotărăște în locul omului: exportul o refuză.
 *     (Refuzul, nu avertismentul, e propunerea din 13.10 pe care owner-ul o confirmă înaintea lui 2.3c-5; dacă devine
 *     avertisment, refuzul iese de aici.)
 *
 * Felia 2.3c-5 (sesiune independentă): tăieturile pe o parte (stânga / dreapta: 14 (ii), părțile invariantelor 2 și 9)
 * sunt în `parte.ts`. Aici, 11 AMENDATĂ pe ele (§7: „pentru fiecare trecere k, pe fiecare bucată, în ordine”): sub o
 * etichetă pe o parte, trecerile sunt lanțurile consecutive la aceeași adâncime (±0,001), fiecare cu o bucată sau mai
 * multe; toate trecerile au tot atâtea bucăți, iar bucata j plonjează la fiecare trecere în punctul în care a plonjat la
 * prima („toate trecerile unei bucăți pornesc din același punct”, §13). Pe linie rămâne regula de dinainte (vârful 0).
 *
 * Ce NU face (limitele, spuse în raport): discul unei despărțiri pe linie care intră într-o piesă nu e judecat (pe o
 * parte, îl judecă invarianta 2 din `parte.ts`).
 */
import type { Eveniment, Mutare, Punct3 } from './gcode.ts';
import { lanturile, type Lant } from './rampa.ts';
import { TOL_SUB, type EtichetaActiva } from './sens.ts';
import { lungime, peOParte, type Eticheta, type Pt, type Regiune } from './regiune.ts';
import { CLASE_O, type TaieturaV10O } from './document.v10.ts';

/** Plonjarea în vârful 0 și capătul în ultimul vârf: rotunjirea postului (√2/2 · 0,001) plus o rezervă. */
export const TOL_CAPAT = 0.002;
/** Z-ul drumului față de adâncimea plonjării: două cote rotunjite la 3 zecimale. */
export const TOL_Z_DESCHIS = 0.001;
/** Cea mai adâncă trecere față de adâncimea operației: eticheta și Z-ul, câte 0,0005. */
export const TOL_ADANCIME_DESCHIS = 0.001 + 1e-9;
/** Adâncimea din etichetă față de cea a operației (ca la invariantele 2, 9–13). */
const TOL_ETICHETA = 0.0005 + 1e-9;
/** §8: un capăt la cel mult R + atât (mm) de conturul foii „ajunge la marginea foii”. */
export const MARJA_MARGINE = 1;
/** §4: sub atât (mm), o cale deschisă e degenerată (`REZOLUTIE`). */
export const REZOLUTIE_DESCHIS = 0.01;
/**
 * Drumul în plan al unei treceri pe linie față de lungimea căii: 1e-3 relativ (biarcele unei cubice față de polilinia
 * mea a ei), 0,01 mm fix și 0,0042 mm pe radian de arc (raza din I / J rotunjite, ca în `urechi.ts`). Un drum dus-întors
 * are de două ori lungimea, deci banda nu-l ascunde.
 */
export const tolLungime = (L: number, theta: number): number => 1e-3 * L + 0.01 + 0.0042 * theta;

export type IncalcareDeschisa = { readonly invarianta: 2 | 10 | 11 | 12 | 13 | 14; readonly linia: number; readonly mesaj: string };

const mm = (v: number): string => v.toFixed(3);
const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
const pct = (p: Pt): string => `(${mm(p.x)}, ${mm(p.y)})`;

/** Eticheta e a unei căi deschise (documentul v10, `inchis: false`). */
export function etichetaDeschisa(et: Eticheta | null | undefined, reg: Regiune): boolean {
  return !!et && reg.taieturi.get(et.idLume)?.inchis === false;
}

// ---------------------------------------------------------------------------------------------------------------
// Invarianta 11, amendată: forma trecerilor pe o cale deschisă.

/** Invarianta 11 pe etichetele căilor deschise (antetul). */
export function formaDeschisa(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, laDoc: (p: Punct3) => Punct3,
): IncalcareDeschisa[] {
  const rez: IncalcareDeschisa[] = [];
  const mutari: Mutare[] = evenimente.flatMap((e) => (e.tip === 'mutare' ? [e.m] : []));
  const dupaLinie = new Map<number, number>();
  mutari.forEach((m, k) => dupaLinie.set(m.linia, k));
  const peEticheta = new Map<number, Array<{ readonly l: Lant; readonly plonjare: Pt; readonly d: number }>>();
  for (const l of lanturile(evenimente, etichete.map((e) => e.linia), laDoc)) {
    if (l.eticheta < 0) continue;
    const et = etichete[l.eticheta]!.eticheta;
    if (!et || !etichetaDeschisa(et, reg)) continue;
    const cine = `${et.idLume} (${et.latura}, cale deschisă)`;
    const p0 = l.pasi[0]!;
    const ultim = l.pasi[l.pasi.length - 1]!;
    // Plonjarea pe verticală, din aer.
    const plonjare = p0.vertical && p0.zb < p0.za - 1e-9 && p0.za >= -TOL_SUB;
    if (!plonjare) rez.push({ invarianta: 11, linia: p0.linia, mesaj: `trecerea pe calea deschisă (§7): lanțul lui ${cine} nu începe cu o plonjare pe verticală din aer` });
    // Nicio altă coborâre pe verticală (zig-zag-ul: coborârea la capăt, fără ridicare).
    const coborare = l.pasi.slice(1).find((p) => p.vertical && p.zb < p.za - 1e-9);
    if (coborare) {
      rez.push({ invarianta: 11, linia: coborare.linia, mesaj: `trecerea pe calea deschisă (§7): ${cine} coboară pe verticală de la ${mm(coborare.za)} la ${mm(coborare.zb)} fără ridicare (zig-zag: fiecare trecere pornește din același capăt, după ridicare)` });
    }
    // Z constant pe drum (fără rampă), la adâncimea plonjării.
    const z = p0.zb;
    const abatere = l.pasi.slice(1).filter((p) => !p.vertical).find((p) => Math.abs(p.za - z) > TOL_Z_DESCHIS || Math.abs(p.zb - z) > TOL_Z_DESCHIS);
    if (abatere) {
      rez.push({ invarianta: 11, linia: abatere.linia, mesaj: `trecerea pe calea deschisă (§7): ${cine} nu stă la adâncimea plonjării ${mm(z)} (Z ${mm(abatere.za)} → ${mm(abatere.zb)}): pe o cale deschisă nu există rampă` });
    }
    // Ridicarea, imediat după lanț.
    const k = dupaLinie.get(ultim.linia);
    const urm = k === undefined ? undefined : mutari[k + 1];
    const sus = urm ? laDoc(urm.b)[2] : -Infinity;
    if (!urm || !(urm.a[0] === urm.b[0] && urm.a[1] === urm.b[1] && urm.b[2] > urm.a[2] && sus >= -TOL_SUB)) {
      rez.push({ invarianta: 11, linia: urm?.linia ?? ultim.linia, mesaj: `trecerea pe calea deschisă (§7): după drumul lui ${cine}, scula nu se ridică pe verticală din material` });
    }
    const t = reg.taieturi.get(et.idLume);
    const c = t?.contur;
    if (et.latura === 'pe-linie') {
      if (!c?.capete) {
        rez.push({ invarianta: 11, linia: p0.linia, mesaj: `trecerea pe calea deschisă (§7): capetele căii lui ${et.idLume} nu se pot construi, deci trecerea nu se poate judeca` });
      } else {
        const [v0, vn] = c.capete;
        if (dist(p0.a, v0) > TOL_CAPAT) {
          rez.push({ invarianta: 11, linia: p0.linia, mesaj: `trecerea pe calea deschisă (§13): ${cine} plonjează în ${pct(p0.a)}, nu în vârful 0 ${pct(v0)} (la ${mm(dist(p0.a, v0))} mm)` });
        }
        if (dist(ultim.b, vn) > TOL_CAPAT) {
          rez.push({ invarianta: 11, linia: ultim.linia, mesaj: `trecerea pe calea deschisă (§7): ${cine} se oprește în ${pct(ultim.b)}, nu în celălalt capăt ${pct(vn)} (la ${mm(dist(ultim.b, vn))} mm)` });
        }
        const Lc = c.primitive.reduce((s, q) => s + lungime(q), 0);
        if (l.lungime > Lc + tolLungime(Lc, l.theta)) {
          rez.push({ invarianta: 11, linia: ultim.linia, mesaj: `trecerea pe calea deschisă (§7): drumul lui ${cine} are ${mm(l.lungime)} mm în plan, iar calea ${mm(Lc)} mm: o trecere e o singură parcurgere, de la un capăt la celălalt` });
        }
      }
    }
    const d = -Math.min(...l.pasi.flatMap((p) => [p.za, p.zb]));
    const lista = peEticheta.get(l.eticheta) ?? [];
    lista.push({ l, plonjare: p0.a, d });
    peEticheta.set(l.eticheta, lista);
  }
  // Pe etichetă: același punct de plonjare, adâncimile care nu scad, ultima la adâncimea operației.
  for (const [i, lista] of peEticheta) {
    const et = etichete[i]!.eticheta!;
    const cine = `${et.idLume} (${et.latura}, cale deschisă)`;
    const prima = lista[0]!;
    let prec = 0;
    // Felia 2.3c-5 (antetul): pe o parte, trecerile pe bucăți; bucata j plonjează mereu unde a plonjat la prima trecere.
    if (peOParte(et.latura)) {
      const treceri: Array<typeof lista> = [];
      for (const x of lista) {
        const t = treceri[treceri.length - 1];
        if (t && Math.abs(t[0]!.d - x.d) <= TOL_Z_DESCHIS) t.push(x); else treceri.push([x]);
      }
      const bucati = treceri[0]!;
      for (const t of treceri.slice(1)) {
        if (t.length !== bucati.length) {
          rez.push({ invarianta: 11, linia: t[0]!.l.pasi[0]!.linia, mesaj: `trecerea pe calea deschisă (§7): la ${mm(t[0]!.d)} mm, ${cine} are ${t.length} bucăți; prima trecere avea ${bucati.length}` });
        }
        t.forEach((x, k) => {
          const b = bucati[k];
          if (b && dist(x.plonjare, b.plonjare) > TOL_CAPAT) {
            rez.push({ invarianta: 11, linia: x.l.pasi[0]!.linia, mesaj: `trecerea pe calea deschisă (§13): bucata ${k + 1} a lui ${cine} plonjează în ${pct(x.plonjare)}; la prima trecere, în ${pct(b.plonjare)}: toate trecerile unei bucăți pornesc din același punct` });
          }
        });
      }
    }
    for (const x of lista) {
      if (!peOParte(et.latura) && dist(x.plonjare, prima.plonjare) > TOL_CAPAT) {
        rez.push({ invarianta: 11, linia: x.l.pasi[0]!.linia, mesaj: `trecerea pe calea deschisă (§13): ${cine} plonjează în ${pct(x.plonjare)}; trecerea de dinainte, în ${pct(prima.plonjare)}: toate trecerile pornesc din același capăt` });
      }
      if (x.d < prec - TOL_Z_DESCHIS) {
        rez.push({ invarianta: 11, linia: x.l.pasi[0]!.linia, mesaj: `trecerea pe calea deschisă (§7): sub eticheta lui ${cine}, o trecere la ${mm(x.d)} vine după una la ${mm(prec)}` });
      }
      prec = Math.max(prec, x.d);
    }
    if (prec < et.adancime - TOL_ADANCIME_DESCHIS) {
      rez.push({ invarianta: 11, linia: etichete[i]!.linia, mesaj: `trecerea pe calea deschisă (§7): cea mai adâncă trecere a lui ${cine} ajunge la ${mm(prec)}, nu la adâncimea operației (${et.adancime} mm)` });
    }
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// 14 (iii): ordinea de la §8.

const descrie = (t: TaieturaV10O): string => `tăietura lui ${t.idLume} (${t.latura}, ${t.adancime} mm${t.deschisa ? ', deschisă' : ''}${t.despartire ? ', marcată despărțire' : ''})`;
const clasa = (t: TaieturaV10O): string => `clasa ${t.clasa}, ${CLASE_O[t.clasa]}`;

/** 14 (iii) pe etichetele valide ale programului (antetul). */
export function verificaOrdinea(etichete: readonly EtichetaActiva[], reg: Regiune): IncalcareDeschisa[] {
  const ord = reg.ordine;
  if (!ord || !ord.some((t) => t.deschisa)) return [];
  const rez: IncalcareDeschisa[] = [];
  const folosite = new Set<number>();
  const aparitii = new Map<string, number>();
  let maxim: { readonly j: number; readonly linia: number } | null = null;
  for (const e of etichete) {
    const et = e.eticheta;
    if (!et) continue;
    const candidate = ord.flatMap((t, j) => (t.idLume === et.idLume && t.latura === et.latura && Math.abs(t.adancime - et.adancime) <= TOL_ETICHETA ? [j] : []));
    if (candidate.length === 0) {
      rez.push({ invarianta: 14, linia: e.linia, mesaj: `ordinea (§8): eticheta lui ${et.idLume} (${et.latura}, ${et.adancime} mm) nu e a niciunei tăieturi a foii` });
      continue;
    }
    const cheie = `${et.idLume}|${et.latura}|${candidate.join(',')}`;
    const k = aparitii.get(cheie) ?? 0;
    aparitii.set(cheie, k + 1);
    if (k >= candidate.length) {
      rez.push({ invarianta: 14, linia: e.linia, mesaj: `ordinea (§8): eticheta lui ${et.idLume} (${et.latura}, ${et.adancime} mm) apare de ${k + 1} ori, iar foaia are ${candidate.length} astfel de tăieturi` });
      continue;
    }
    const j = candidate[k]!;
    folosite.add(j);
    if (maxim && j < maxim.j) {
      const t = ord[j]!, p = ord[maxim.j]!;
      rez.push({
        invarianta: 14, linia: e.linia,
        mesaj: t.clasa !== p.clasa
          ? `ordinea (§8): ${descrie(t)} (${clasa(t)}) vine după ${descrie(p)} (${clasa(p)}, linia ${maxim.linia}); clasele se taie în ordinea 0, 1, 2, 3`
          : `ordinea (§8): în ${clasa(t)}, ${descrie(t)} vine după ${descrie(p)} (linia ${maxim.linia}); în clasă, ordinea de azi (instanța, operația, nodul)`,
      });
    }
    if (!maxim || j > maxim.j) maxim = { j, linia: e.linia };
  }
  ord.forEach((t, j) => {
    if (!folosite.has(j)) rez.push({ invarianta: 14, linia: 0, mesaj: `ordinea (§8): ${descrie(t)} (${clasa(t)}) lipsește din program` });
  });
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Refuzurile de la §9 (și marcajul de la §8), luate ca încălcări.

/** Câte vârfuri distincte are forma (coordonatele elementului; o matrice nedegenerată le păstrează distincte). */
function varfuriDistincte(forma: unknown): number {
  const vs = (forma as { varfuri?: ReadonlyArray<{ p?: { x?: unknown; y?: unknown } }> }).varfuri ?? [];
  return new Set(vs.map((v) => `${String(v.p?.x)}|${String(v.p?.y)}`)).size;
}

/** Refuzurile documentului (antetul): exportul trebuia refuzat întreg, deci orice program e o încălcare (linia 0). */
export function refuzurileDeschise(reg: Regiune): IncalcareDeschisa[] {
  const ord = reg.ordine;
  if (!ord) return [];
  const rez: IncalcareDeschisa[] = [];
  const vazute = new Set<string>();
  const o = (cheie: string, invarianta: IncalcareDeschisa['invarianta'], mesaj: string): void => {
    if (vazute.has(cheie)) return;
    vazute.add(cheie);
    rez.push({ invarianta, linia: 0, mesaj });
  };
  const parti = new Map<string, Set<string>>();
  for (const t of ord) {
    const op = `${t.piesa}/${t.operatie}`;
    if (t.deschisa && (t.latura === 'exterior' || t.latura === 'interior')) {
      o(`latura|${t.idLume}|${op}`, 2, `căile deschise (§9): ${t.idLume} e o cale deschisă cu profilul ${t.latura} (operația ${op}): exportul trebuia refuzat („profilul exterior / interior cere un contur închis”)`);
    }
    if (!t.deschisa && (t.latura === 'stanga' || t.latura === 'dreapta')) {
      o(`parte|${t.idLume}|${op}`, 2, `căile deschise (§9): ${t.idLume} e un contur închis cu latura ${t.latura} (operația ${op}): exportul trebuia refuzat („alege exterior sau interior”)`);
    }
    if (t.latura === 'stanga' || t.latura === 'dreapta') {
      const s = parti.get(t.idLume) ?? new Set<string>();
      s.add(t.latura);
      parti.set(t.idLume, s);
      if (s.size === 2) o(`ambele|${t.idLume}`, 2, `căile deschise (§9): ${t.idLume} are tăieturi și pe stânga, și pe dreapta: nu se știe ce parte se păstrează; exportul trebuia refuzat`);
    }
    if (t.operatieDeschisa) {
      const ce: ReadonlyArray<readonly [IncalcareDeschisa['invarianta'], string, unknown]> = [[10, 'urechi', t.urechi], [11, 'rampă', t.rampa], [12, 'intrări', t.intrari], [13, 'degajări', t.colturi]];
      for (const [inv, nume, v] of ce) {
        if (v !== null) o(`${nume}|${op}`, inv, `căile deschise (§9): operația ${op} are cel puțin un nod deschis și ${nume}: exportul trebuia refuzat („pe o cale deschisă vin mai târziu”)`);
      }
    }
    if (t.despartire && !t.deschisa) {
      o(`desp-inchis|${t.idLume}|${op}`, 14, `ordinea (§8): ${descrie(t)} e marcată despărțire pe un contur închis: marcajul se judecă, exportul trebuia refuzat`);
    }
    if (t.despartire && t.deschisa && reg.grosimeFoaie !== undefined && t.adancime < reg.grosimeFoaie - 1e-9) {
      o(`desp-adanc|${t.idLume}|${op}`, 14, `ordinea (§8): ${descrie(t)} e marcată despărțire, dar adâncimea e sub grosimea foii (${reg.grosimeFoaie} mm): marcajul se judecă, exportul trebuia refuzat`);
    }
    // §8: tăietura deschisă prin foaie, nemarcată, care ajunge la marginea foii (antetul).
    const prinFoaie = reg.grosimeFoaie !== undefined && t.adancime >= reg.grosimeFoaie - 1e-9;
    const capete = reg.taieturi.get(t.idLume)?.contur?.capete;
    if (t.deschisa && !t.despartire && prinFoaie && capete && reg.foaieDocument) {
      const { latime: W, inaltime: H } = reg.foaieDocument;
      const R = t.scula.diametru / 2;
      for (const p of capete) {
        const d = Math.min(p.x, W - p.x, p.y, H - p.y);
        if (d <= R + MARJA_MARGINE + 1e-9) {
          o(`margine|${t.idLume}|${op}`, 14, `ordinea (§8): ${descrie(t)} e o tăietură deschisă prin foaie, nemarcată, care ajunge la marginea foii (capătul ${pct(p)} ${d < 0 ? 'e în afara foii' : `e la ${mm(d)} mm de ea`}, cel mult R + 1 = ${mm(R + MARJA_MARGINE)} mm) și o poate despărți: exportul trebuia refuzat („marchează-o «despărțire» sau micșorează adâncimea”)`);
          break;
        }
      }
    }
    if (t.deschisa) {
      const c = reg.taieturi.get(t.idLume)?.contur;
      const L = c ? c.primitive.reduce((s, q) => s + lungime(q), 0) : 0;
      if (varfuriDistincte(t.forma) < 2 || L < REZOLUTIE_DESCHIS) {
        o(`degenerata|${t.idLume}`, 14, `căile deschise (§4): calea lui ${t.idLume} e degenerată (${varfuriDistincte(t.forma)} vârfuri distincte, lungimea ${mm(L)} mm): „ar fi o găurire, nu o linie”, exportul trebuia refuzat`);
      }
    }
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------

/** Tot ce aduce ADR 0037 în poartă în afară de 14 (i): 11 pe căile deschise, refuzurile, 14 (iii). */
export function verificaDeschise(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, laDoc: (p: Punct3) => Punct3,
): IncalcareDeschisa[] {
  return [...refuzurileDeschise(reg), ...formaDeschisa(evenimente, etichete, reg, laDoc), ...verificaOrdinea(etichete, reg)];
}
