import { plineClosed, plineOpen, type Polyline } from './cavalier/index.ts';
import { LINIE, arc, arieCuSemn, cerculArcului, inSensTrigonometric, type Contur, type Punct, type Varf } from './contur.ts';
import { distantaLaContur, inRegiune } from './distanta.ts';

/**
 * Offsetul (T5, ADR 0005): cavalier_contours, adus în repo în `cavalier/`. Arcele rămân arce. Orice eșec iese ca motiv
 * scris, niciodată ca traseu tăcut și niciodată ca excepție.
 *
 * Gărzile (felia 2.1; contractul e în `docs/etape/etapa-02.md`, din `docs/faza2/sonde/s1-geometrie/VERIFICARE.md` §5):
 * - **rezoluția declarată e 0,01 mm:** o distanță sub jumătatea ei e refuzată;
 * - **intrarea se curăță fără să-și schimbe forma** (arcele de peste 180° împărțite, arcele plate devenite linii, vârfuri
 *   repetate, vârfuri în plus pe o latură dreaptă), iar cea care nu se poate decala (degenerată, autointersectată, cu
 *   cubice) e refuzată cu motiv. Și la distanța 0;
 * - **ieșirea se verifică singură** (`verificaIesire`): fiecare punct al traseului stă la |d| de intrare, pe partea
 *   cerută; niciun contur nu se atinge pe el însuși sau pe altul; insulele merg trigonometric, găurile orar. La o
 *   verificare picată se încearcă o dată cu |d| + 1e-4 mm: la un prag de topologie (un gât lat exact cât 2d), epsilon-ul
 *   lui cavalier decide, iar 0,1 µm mai încolo rezultatul e cel corect (s1-V §5.4; măsurat pe 08.10). Apoi se refuză.
 */
export type RezultatOffset =
  | { readonly ok: true; readonly contururi: readonly Contur[] }
  | { readonly ok: false; readonly motiv: string };

/** Rezoluția modelului, în mm: sub ea (colțuri, offseturi), rezultatul nu e garantat (s1-V §5.4). */
export const REZOLUTIE = 0.01;
/** Cea mai mică distanță de offset acceptată: jumătate din rezoluție. */
export const DISTANTA_MINIMA = REZOLUTIE / 2;
/** Două puncte mai apropiate de atât sunt unul singur, iar două segmente mai apropiate se ating (mm). */
export const EPS_ATINGERE = 1e-6;
/** Un arc mai plat de atât e o linie (s1-V §5.6). */
const BULGE_MINIM = 1e-6;
/** Pasul celei de-a doua încercări: peste pragul de topologie decis de epsilon, sub rezoluția postului (1 µm). */
const PAS_REINCERCARE = 1e-4;
/** Cât poate diferi distanța unui punct al traseului de |d| (mm): sub rezoluția declarată, cu loc pentru rotunjiri. */
const TOLERANTA_DISTANTA = 2e-3;

function laCavalier(c: Contur): Polyline {
  const v: Array<[number, number, number]> = c.varfuri.map((varf) => {
    if (varf.s.tip === 'C') throw new Error('cubicele intră în offset doar ca biarce');
    return [varf.p.x, varf.p.y, varf.s.tip === 'A' ? varf.s.bulge : 0];
  });
  return c.inchis ? plineClosed(v) : plineOpen(v);
}

function dinCavalier(pl: Polyline): Contur {
  const varfuri: Varf[] = [];
  for (let i = 0; i < pl.vertexCount; i++) {
    const v = pl.at(i);
    varfuri.push({ p: { x: v.x, y: v.y }, s: v.bulge === 0 ? LINIE : arc(v.bulge) });
  }
  return { inchis: pl.isClosed, varfuri };
}

/** Lungimea segmentului care pleacă din `a` spre `b`, pe curbă (un arc aproape întreg are coarda mică, nu lungimea). */
function lungime(a: Punct, b: Punct, s: Varf['s']): number {
  if (s.tip !== 'A') return Math.hypot(b.x - a.x, b.y - a.y);
  const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
  return Number.isFinite(raza) ? raza * Math.abs(baleiaj) : Math.hypot(b.x - a.x, b.y - a.y);
}

/** Mijlocul segmentului, pe curbă. */
function mijloc(a: Punct, b: Punct, s: Varf['s']): Punct {
  if (s.tip !== 'A') return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
  const u = start + baleiaj / 2;
  return { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
}

/**
 * Arcele de peste 180° (|bulge| > 1) se împart în două jumătăți: cavalier le cere de cel mult 180°. Forma nu se schimbă:
 * mijlocul e pe același cerc, iar fiecare jumătate are bulge-ul tan(atan(b) / 2).
 */
function imparteArceMari(varfuri: readonly Varf[]): Varf[] {
  const rez: Varf[] = [];
  for (let i = 0; i < varfuri.length; i++) {
    const v = varfuri[i];
    const urm = varfuri[(i + 1) % varfuri.length];
    if (!v || !urm) continue;
    if (v.s.tip === 'A' && Math.abs(v.s.bulge) > 1) {
      const jumatate = arc(Math.tan(Math.atan(v.s.bulge) / 2));
      rez.push({ p: v.p, s: jumatate }, { p: mijloc(v.p, urm.p, v.s), s: jumatate });
    } else {
      rez.push(v);
    }
  }
  return rez;
}

/**
 * Vârfurile unui contur închis, cu segmentele mai scurte de `eps` (pe curbă) scoase: capetele lor se unesc. Rămâne
 * vârful cu indicele mai mic, cu segmentul celui scos, deci un contur curat nu se mișcă deloc: un vârf repetat la 1e-7 mm
 * dispare fără să-și ia locul celui adevărat. Merge în cerc: ultimul se unește și cu primul (rămâne primul).
 */
function unesteVarfuri(varfuri: readonly Varf[], eps: number): Varf[] {
  const v = [...varfuri];
  let schimbat = true;
  while (schimbat && v.length > 1) {
    schimbat = false;
    for (let i = 0; i < v.length && v.length > 1; i++) {
      const urm = (i + 1) % v.length;
      const a = v[i];
      const b = v[urm];
      if (!a || !b || lungime(a.p, b.p, a.s) >= eps) continue;
      if (urm === 0) {
        // Perechea ultim–prim: segmentul scurt e al ultimului, care pleacă.
        v.splice(i, 1);
      } else {
        v[i] = { p: a.p, s: b.s };
        v.splice(urm, 1);
      }
      schimbat = true;
      i--;
    }
  }
  return v;
}

/** Scoate un vârf între două linii care stă pe latura dreaptă dintre vecinii lui (fără să întoarcă drumul înapoi). */
function scoateVarfuriPeLatura(varfuri: readonly Varf[]): Varf[] {
  const v = [...varfuri];
  let schimbat = true;
  while (schimbat && v.length > 3) {
    schimbat = false;
    for (let i = 0; i < v.length && v.length > 3; i++) {
      const prev = v[(i - 1 + v.length) % v.length];
      const cur = v[i];
      const next = v[(i + 1) % v.length];
      if (!prev || !cur || !next || prev.s.tip !== 'L' || cur.s.tip !== 'L') continue;
      const dx = next.p.x - prev.p.x;
      const dy = next.p.y - prev.p.y;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) continue;
      const t = ((cur.p.x - prev.p.x) * dx + (cur.p.y - prev.p.y) * dy) / l2;
      const departe = Math.abs((cur.p.x - prev.p.x) * dy - (cur.p.y - prev.p.y) * dx) / Math.sqrt(l2);
      if (t > 0 && t < 1 && departe < EPS_ATINGERE) {
        v.splice(i, 1);
        schimbat = true;
        i--;
      }
    }
  }
  return v;
}

const seAtingeSingur = (c: Contur): boolean => laCavalier(c).scanForSelfIntersectOpt({ posEqualEps: EPS_ATINGERE });

function seAtingIntreEle(a: Contur, b: Contur): boolean {
  const r = laCavalier(a).findIntersectsOpt(laCavalier(b), { posEqualEps: EPS_ATINGERE });
  return r.basicIntersects.length + r.overlappingIntersects.length > 0;
}

type Curatare = { readonly ok: true; readonly contur: Contur } | { readonly ok: false; readonly motiv: string };

/** Ușa de intrare a offsetului: curăță ce se poate curăța fără să schimbe forma și refuză ce nu se poate decala. */
export function curataIntrare(c: Contur): Curatare {
  if (!c.inchis) return { ok: false, motiv: 'offsetul exterior / interior cere un contur închis' };
  for (const v of c.varfuri) {
    if (v.s.tip === 'C') return { ok: false, motiv: 'conturul are o cubică: intră în offset doar ca biarce (felia 2.7)' };
    if (!Number.isFinite(v.p.x) || !Number.isFinite(v.p.y) || (v.s.tip === 'A' && !Number.isFinite(v.s.bulge))) {
      return { ok: false, motiv: 'conturul are o coordonată care nu e un număr finit' };
    }
  }
  const plate = c.varfuri.map((v) => (v.s.tip === 'A' && Math.abs(v.s.bulge) < BULGE_MINIM ? { p: v.p, s: LINIE } : v));
  const varfuri = scoateVarfuriPeLatura(unesteVarfuri(imparteArceMari(plate), EPS_ATINGERE));
  if (varfuri.length < 2) return { ok: false, motiv: 'conturul are mai puțin de două vârfuri distincte' };
  const curat: Contur = { inchis: true, varfuri };
  // Întâi autointersecția: o fundiță are aria netă zero, iar motivul adevărat e că laturile ei se taie.
  let autointersectat: boolean;
  try {
    autointersectat = seAtingeSingur(curat);
  } catch (e) {
    return { ok: false, motiv: `conturul nu se poate citi: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (autointersectat) return { ok: false, motiv: 'conturul se autointersectează: nu se poate decala' };
  // Un contur închis care nu se autointersectează are arie; unul mai mic decât rezoluția nu se poate însă garanta.
  const xs = varfuri.map((v) => v.p.x);
  const ys = varfuri.map((v) => v.p.y);
  if (Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < REZOLUTIE) {
    return { ok: false, motiv: `conturul e mai mic decât rezoluția declarată (${REZOLUTIE} mm)` };
  }
  return { ok: true, contur: curat };
}

/**
 * Ieșirea, fără segmentele de lungime practic zero (sub toleranța de atingere). Cele scurte, dar reale, rămân: scoaterea
 * lor ar muta începutul arcului următor, iar arcul și-ar schimba cercul (măsurat pe 08.10: conturul ajungea să se atingă
 * singur). Postul scrie oricum G1 acolo unde coarda e sub 10 rezoluții.
 */
function curataIesire(c: Contur): Contur {
  return { inchis: c.inchis, varfuri: unesteVarfuri(c.varfuri, EPS_ATINGERE) };
}

/**
 * Ce e greșit în ieșirea offsetului `d` al conturului `intrare` (curățat, trigonometric), sau null. Ieșirea se verifică pe
 * ea însăși față de intrare, nu doar ca formă. Aria nu se mai verifică separat: o curbă închisă cu toate punctele la
 * exact |d| de intrare, pe partea cerută, e chiar curba de nivel, deci aria ei crește afară și scade înăuntru de la sine.
 */
export function verificaIesire(intrare: Contur, d: number, iesire: readonly Contur[]): string | null {
  if (iesire.length === 0) return d < 0 ? 'scula nu încape: offsetul interior dispare' : 'offsetul exterior n-a dat niciun contur';
  for (const c of iesire) {
    if (!c.inchis) return 'offsetul a dat un contur deschis';
    if (c.varfuri.length < 2) return 'offsetul a dat un contur cu mai puțin de două vârfuri';
    for (const v of c.varfuri) {
      if (v.s.tip === 'C') return 'offsetul a dat o cubică';
      if (!Number.isFinite(v.p.x) || !Number.isFinite(v.p.y) || (v.s.tip === 'A' && !Number.isFinite(v.s.bulge))) {
        return 'offsetul a dat o coordonată nefinită';
      }
    }
  }
  // Fiecare punct al traseului (vârfurile și mijloacele segmentelor) stă la |d| de intrare, pe partea cerută.
  for (const c of iesire) {
    for (let i = 0; i < c.varfuri.length; i++) {
      const v = c.varfuri[i];
      const urm = c.varfuri[(i + 1) % c.varfuri.length];
      if (!v || !urm) continue;
      for (const p of [v.p, mijloc(v.p, urm.p, v.s)]) {
        const dist = distantaLaContur(p, intrare);
        if (Math.abs(dist - Math.abs(d)) > TOLERANTA_DISTANTA) {
          return `offsetul a dat un punct la ${dist.toFixed(4)} mm de contur, nu la ${Math.abs(d)} mm`;
        }
        if (inRegiune(p, [intrare]) !== d < 0) return 'offsetul a dat un punct pe partea greșită a conturului';
      }
    }
  }
  // Niciun contur nu se atinge pe el însuși sau pe altul: freza ar trece de două ori pe același loc.
  for (let i = 0; i < iesire.length; i++) {
    const a = iesire[i];
    if (!a) continue;
    if (seAtingeSingur(a)) return 'offsetul a dat un contur care se atinge singur';
    for (let j = i + 1; j < iesire.length; j++) {
      const b = iesire[j];
      if (b && seAtingIntreEle(a, b)) return 'offsetul a dat două contururi care se ating';
    }
  }
  // Insulele merg trigonometric, găurile orar: adâncimea de includere pară = insulă.
  for (const c of iesire) {
    const p = c.varfuri[0]?.p;
    if (!p) continue;
    const adancime = iesire.filter((alt) => alt !== c && inRegiune(p, [alt])).length;
    if ((arieCuSemn(c) > 0) !== (adancime % 2 === 0)) return 'offsetul a dat un contur în sensul greșit';
  }
  return null;
}

function incearca(intrare: Contur, d: number): RezultatOffset {
  let rezultat: Polyline[];
  try {
    // cavalier: pe un contur trigonometric, distanța pozitivă merge spre interior.
    rezultat = laCavalier(intrare).parallelOffset(-d);
  } catch (e) {
    return { ok: false, motiv: `offsetul a eșuat: ${e instanceof Error ? e.message : String(e)}` };
  }
  const contururi = rezultat.map((pl) => curataIesire(dinCavalier(pl)));
  const problema = verificaIesire(intrare, d, contururi);
  return problema ? { ok: false, motiv: problema } : { ok: true, contururi };
}

/**
 * Offsetul unui contur închis, spre exterior (`distanta` > 0) sau spre interior (`distanta` < 0). Conturul se curăță,
 * se aduce în sens trigonometric (ca semnul să însemne același lucru pentru orice intrare), se decalează, iar ieșirea se
 * verifică. La distanța 0, conturul trece tot prin gărzi și iese neschimbat. Niciodată o excepție: orice eșec iese ca motiv.
 */
export function offsetInchis(contur: Contur, distanta: number): RezultatOffset {
  if (!contur.inchis) return { ok: false, motiv: 'offsetul exterior / interior cere un contur închis' };
  if (!Number.isFinite(distanta)) return { ok: false, motiv: `distanța offsetului nu e un număr finit (${distanta})` };
  if (distanta !== 0 && Math.abs(distanta) < DISTANTA_MINIMA) {
    return { ok: false, motiv: `distanța ${distanta} mm e sub rezoluția declarată (${REZOLUTIE} mm)` };
  }
  try {
    const intrare = curataIntrare(contur);
    if (!intrare.ok) return intrare;
    if (distanta === 0) return { ok: true, contururi: [contur] };
    const trig = inSensTrigonometric(intrare.contur);
    const prima = incearca(trig, distanta);
    if (prima.ok) return prima;
    // Interiorul care dispare nu e un accident numeric: scula chiar nu încape.
    if (prima.motiv.startsWith('scula nu încape')) return prima;
    const aDoua = incearca(trig, distanta + Math.sign(distanta) * PAS_REINCERCARE);
    return aDoua.ok ? aDoua : { ok: false, motiv: `${prima.motiv} (și la a doua încercare)` };
  } catch (e) {
    return { ok: false, motiv: `offsetul a eșuat: ${e instanceof Error ? e.message : String(e)}` };
  }
}
