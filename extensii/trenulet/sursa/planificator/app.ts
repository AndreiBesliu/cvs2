"use strict";
/** Un capăt de piesă: unde e, încotro iese (u, în grade), cuplajul (tată / mamă) și cât de sus e. */
type CapatDef = { x: number; y: number; u: number; tip: string; z: number };
/** Segmentele axei unei piese la comandă: drept (lungimea) sau arc (raza, unghiul în grade, sensul). */
type SegLC = { t: "L"; l: number } | { t: "A"; r: number; a: number; s: number };
/** O piesă la comandă: segmentele axei și cuplajele de la capete. */
type LucrareLC = { seg: SegLC[]; cap: string[] };
/** O piesă din catalog (sau la comandă): conturul, șanțurile, capetele, interiorul (pentru suprapuneri). */
type DefPiesa = { id: string; titlu: string; contur: number[][]; santuri: number[][][]; capete: CapatDef[]; oglinda: string | null; interior: number[][];
  grupa: string; panta?: boolean; rampa?: boolean; dim: number[]; lc?: LucrareLC; bb?: number[]; lungime?: number; forma?: string;
  mijloc?: { x: number; y: number; u: number } };
type CatalogPlan = { versiune: number; latime: number; pas_inaltime: number; stalpi: { id: string; inaltime: number }[]; grupe: string[]; piese: DefPiesa[] };
/** O piesă pusă în circuit: din catalog (sau la comandă); unde stă sau de cine se prinde (părintele și capetele lor). */
type PiesaPusa = { uid: string; id: string; lc?: LucrareLC; parinte?: string | null; pcon?: number; con?: number; x?: number; y?: number; rot?: number;
  z?: number; panta?: number; stalp?: boolean };
type CapatPus = { uid: string; j: number; x: number; y: number; u: number; tip: string; z: number; legat: CapatPus | null; rampaSus: boolean };
type PozPiesa = { x: number; y: number; rot: number; baza: number };
/** Un punct cu direcție (u, în grade): capătul de unde pleacă sau unde ajunge o piesă. */
type Baza = { x: number; y: number; u: number; z?: number };
/** O cale a trenului pe o piesă: punctele, lungimile cumulate, capetele de la cele două margini (sau null) și înălțimile. */
type CaleTren = { uid: string; i: number; pct: number[][]; L: number[]; lung: number; cap: (number | null)[]; z: (number | null)[]; rampa: boolean; idx: number };
type Vehicul = { c: CaleTren; s: number; dir: number };
type SetariPlan = typeof CNC_IMPLICIT;
/** Un câmp al setărilor CNC: unde stă (calea în setări), eticheta, felul și limitele, când se arată. */
type CampSetare = { s: string; k: string; e: string; t?: string; min?: number; max?: number; pas?: number; intreg?: boolean; ajutor?: string;
  cand?: (s: SetariPlan) => unknown; opt?: readonly (readonly [string, string])[] | (() => readonly (readonly [string, string])[]) };
type InfoPiesa = { capete: CapatPus[]; zmin: number; zmax: number; poli: number[][]; bb: number[] };
type Problema = { rau: boolean; x?: number; y?: number; text: string };
type StalpPus = { n: number; x: number; y: number; u: number; z: number; poli: number[][]; bb: number[]; uids: string[]; deMana?: boolean; lovit?: boolean };
type SubPod = { x: number; y: number; spatiu: number; mic?: boolean };
/** Ce a ieșit din așezarea circuitului (`calculeaza`). */
type RezultatPlan = { poz: Map<string, PozPiesa>; capete: CapatPus[]; deschise: CapatPus[]; dupaPiesa: Map<string, InfoPiesa>; probleme: Problema[];
  stalpi: StalpPus[]; lovite: Set<string>; aproape: [CapatPus, CapatPus][]; subPod: SubPod[] };
const CATALOG: CatalogPlan = /*CATALOG*/null!;
const PAS = CATALOG.pas_inaltime;             // 12 mm = un strat de placa
const P: Record<string, DefPiesa> = {};
CATALOG.piese.forEach(p => { P[p.id] = p; });

const NUME: Record<string, string | undefined> = {
  dreapta_216: "Dreaptă 216", dreapta_144: "Dreaptă 144", dreapta_108: "Dreaptă 108", dreapta_54: "Dreaptă 54",
  adaptor_tata_tata: "Adaptor tată–tată", adaptor_mama_mama: "Adaptor mamă–mamă",
  curba_mare_stanga: "Curbă mare stânga", curba_mare_dreapta: "Curbă mare dreapta",
  curba_mica_stanga: "Curbă mică stânga", curba_mica_dreapta: "Curbă mică dreapta",
  macaz_stanga: "Macaz stânga", macaz_dreapta: "Macaz dreapta",
  macaz_curb_stanga: "Macaz curb stânga", macaz_curb_dreapta: "Macaz curb dreapta",
  ramificatie_y: "Ramificație Y", incrucisare_90: "Încrucișare 90°", incrucisare_45: "Încrucișare 45°",
  trecere_nivel: "Trecere la nivel", dreapta_dubla_216: "Dreaptă dublă 216",
  curba_dubla_stanga: "Curbă dublă stânga", curba_dubla_dreapta: "Curbă dublă dreapta",
  rampa_urcare: "Rampă (urcare)", rampa_coborare: "Rampă (coborâre)", opritor: "Opritor",
  opritor_bloc: "Bloc opritor",
};
const GRUPE: Record<string, string> = { "Drepte": "Drepte", "Curbe": "Curbe", "Ramificatii": "Ramificații", "Incrucisari": "Încrucișări",
  "Cale dubla": "Cale dublă", "Pod": "Pod", "Capat": "Capăt" };
const numeStalp = (n: number) => tr`Stâlp ${Math.round(n * PAS)} mm`;
const nume = (id: string) => (NUME[id] ? tr(NUME[id]!) : LC_TITLU[id] || (/^stalp_(\d+)$/.test(id) ? numeStalp(+id.split("_")[1]!) : id));

// elementele paginii, după selector (sunt în body.html: `$` nu întoarce null)
const $ = <E extends Element = HTMLElement>(s: string): E => document.querySelector(s) as E;
const rad = (d: number) => d * Math.PI / 180;
const norm = (a: number) => ((a % 360) + 360) % 360;
function rotP(x: number, y: number, r: number) { const c = Math.cos(rad(r)), s = Math.sin(rad(r)); return [x * c - y * s, x * s + y * c]; }
function difUnghi(a: number, b: number) { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); }
const opus = (t: string) => (t === "M" ? "T" : "M");
const numeTip = (t: string) => (t === "M" ? tr("mamă") : tr("tată"));

// ----------------------------------------------------------------------------- stare
let stare: { docId: string | null; nume: string; piese: PiesaPusa[]; exemplu: boolean } = { docId: null, nume: "", piese: [], exemplu: true };
let selPiesa: string | null = null, selCapat: { uid: string; j: number } | null = null;
let istoric: string[] = [];
let rez: RezultatPlan = null!;
let vedere = { cx: 0, cy: 0, s: 1 };
let uidUrm = 1;
const uidNou = () => "p" + (Date.now().toString(36)) + (uidUrm++).toString(36);

// ----------------------------------------------------------------------------- geometrie
function relZ(pi: PiesaPusa, j: number) {
  const def = D(pi);
  let z = def.capete[j]!.z - def.capete[0]!.z;
  if (def.panta && pi.panta && j === 1) z += pi.panta * PAS;
  return z;
}

function calculeaza() {
  const dupaUid = new Map(stare.piese.map((p): [string, PiesaPusa] => [p.uid, p]));
  const poz = new Map<string, PozPiesa>();
  const inLucru = new Set<string>();
  function pune(p: PiesaPusa): PozPiesa {
    if (poz.has(p.uid)) return poz.get(p.uid)!;
    let r: PozPiesa;
    const par = p.parinte != null ? dupaUid.get(p.parinte) : null;
    if (!par || inLucru.has(p.uid)) {
      r = { x: p.x || 0, y: p.y || 0, rot: p.rot || 0, baza: p.z || 0 };
    } else {
      inLucru.add(p.uid);
      const rp = pune(par);
      const cp = D(par).capete[p.pcon!];
      const [px, py] = rotP(cp!.x, cp!.y, rp.rot);
      const h = cp!.u + rp.rot;
      const c = D(p).capete[p.con!];
      const rot = norm(h + 180 - c!.u);
      const [cx, cy] = rotP(c!.x, c!.y, rot);
      r = { x: rp.x + px! - cx!, y: rp.y + py! - cy!, rot, baza: rp.baza + relZ(par, p.pcon!) - relZ(p, p.con!) };
    }
    poz.set(p.uid, r);
    return r;
  }
  stare.piese.forEach(pune);

  const capete: CapatPus[] = [], dupaPiesa = new Map<string, InfoPiesa>();
  for (const p of stare.piese) {
    const r = poz.get(p.uid)!, def = D(p), lista: CapatPus[] = [];
    def.capete.forEach((c, j: number) => {
      const [x, y] = rotP(c.x, c.y, r.rot);
      const k: CapatPus = { uid: p.uid, j, x: r.x + x!, y: r.y + y!, u: norm(c.u + r.rot), tip: c.tip,
                  z: r.baza + relZ(p, j), legat: null, rampaSus: !!def.rampa && c.z > 0 };
      capete.push(k); lista.push(k);
    });
    const zs = lista.map(k => k.z);
    const poli = def.interior.map(([x, y]) => { const [a, b] = rotP(x!, y!, r.rot); return [r.x + a!, r.y + b!]; });
    dupaPiesa.set(p.uid, { capete: lista, zmin: Math.min(...zs), zmax: Math.max(...zs) + PAS, poli, bb: bbox(poli) });
  }

  // imbinari
  const probleme: Problema[] = [], vecini = new Set<string>(), grupuri: CapatPus[][] = [];
  for (let a = 0; a < capete.length; a++) {
    for (let b = a + 1; b < capete.length; b++) {
      const A = capete[a]!, B = capete[b]!;
      if (A.uid === B.uid) continue;
      const d = Math.hypot(A.x - B.x, A.y - B.y);
      if (d > 2.5) continue;
      if (difUnghi(A.u, B.u + 180) > 4) continue;
      A.legat = B; B.legat = A;
      vecini.add(A.uid + "|" + B.uid); vecini.add(B.uid + "|" + A.uid);
      grupuri.push([A, B]);
      if (A.tip === B.tip) probleme.push({ rau: true, x: A.x, y: A.y, text: tr`Două capete ${numeTip(A.tip)} față în față: pune un adaptor ${numeTip(opus(A.tip))}–${numeTip(opus(A.tip))}.` });
      if (Math.abs(A.z - B.z) > 1) probleme.push({ rau: true, x: A.x, y: A.y, text: tr`Înălțimi diferite la îmbinare (${Math.round(A.z)} și ${Math.round(B.z)} mm).` });
    }
  }
  const deschise = capete.filter(k => !k.legat);

  // aproape inchis: doua capete libere, aproape fata in fata
  const aproape: [CapatPus, CapatPus][] = [];
  for (let a = 0; a < deschise.length; a++) for (let b = a + 1; b < deschise.length; b++) {
    const A = deschise[a]!, B = deschise[b]!;
    if (A.uid === B.uid) continue;
    const d = Math.hypot(A.x - B.x, A.y - B.y);
    if (d < 40 && difUnghi(A.u, B.u + 180) < 25) {
      aproape.push([A, B]);
      probleme.push({ rau: false, x: A.x, y: A.y, text: tr`Aproape închis: lipsesc ${d.toFixed(0)} mm și ${difUnghi(A.u, B.u + 180).toFixed(0)}°. Atinge un capăt și apasă Închide: pun eu piesa care lipsește.` });
    }
  }

  // stalpi: sub fiecare imbinare / capat liber aflat sus, daca nu-l tine o rampa
  const stalpi: StalpPus[] = [];
  const locuri = grupuri.map(g => g).concat(deschise.map(k => [k]));
  for (const g of locuri) {
    const z = Math.max(...g.map(k => k.z));
    if (z < 0.5) continue;
    if (g.some(k => k.rampaSus)) continue;
    const n = Math.round(z / PAS);
    const k = g[0];
    if (n < 1 || n > CATALOG.stalpi.length || Math.abs(z - n * PAS) > 0.6) {
      probleme.push({ rau: true, x: k!.x, y: k!.y, text: tr`Înălțime fără stâlp potrivit: ${Math.round(z)} mm.` });
      continue;
    }
    const colt = patrat(k!.x, k!.y, k!.u);
    stalpi.push({ n, x: k!.x, y: k!.y, u: k!.u, z, poli: colt, bb: bbox(colt), uids: g.map(c => c.uid) });
  }
  // stalpi pusi de mana, sub mijlocul unei piese de pe pod
  for (const p of stare.piese) {
    if (!p.stalp) continue;
    const def = D(p), d = dupaPiesa.get(p.uid), r = poz.get(p.uid);
    const z = d!.capete[0]!.z, n = Math.round(z / PAS);
    if (!def.mijloc || d!.capete.length !== 2 || Math.abs(d!.capete[1]!.z - z) > 0.5 || n < 1 || n > CATALOG.stalpi.length || Math.abs(z - n * PAS) > 0.6) {
      probleme.push({ rau: true, x: d!.capete[0]!.x, y: d!.capete[0]!.y, text: tr`Stâlpul de sub ${nume(idPiesa(p))} nu se potrivește: merge doar sub o piesă dreaptă (neînclinată) de pe pod.` });
      continue;
    }
    const [mx, my] = rotP(def.mijloc.x, def.mijloc.y, r!.rot);
    const x = r!.x + mx!, y = r!.y + my!, u = norm(def.mijloc.u + r!.rot), colt = patrat(x, y, u);
    stalpi.push({ n, x, y, u, z, poli: colt, bb: bbox(colt), uids: [p.uid], deMana: true });
  }
  for (const p of stare.piese) {
    const d = dupaPiesa.get(p.uid);
    if (d!.zmin < -0.5) probleme.push({ rau: true, x: d!.capete[0]!.x, y: d!.capete[0]!.y, text: tr`${nume(idPiesa(p))} coboară sub masă.` });
  }

  // suprapuneri si poduri: unde doua piese care nu se ating la capete se suprapun in plan, se compara inaltimile
  // lor chiar acolo (o rampa sau o piesa in panta au alta inaltime la fiecare capat)
  const lovite = new Set<string>(), subPod: SubPod[] = [];
  const ids = stare.piese.map(p => p.uid);
  const zLocal = (uid: string, x: number, y: number) => {
    const c = dupaPiesa.get(uid)!.capete;
    if (c.length < 2 || c.every(k => Math.abs(k.z - c[0]!.z) < 0.5)) return c[0]!.z;
    const a = c[0], b = c[1], L2 = (b!.x - a!.x) ** 2 + (b!.y - a!.y) ** 2;
    let t = L2 > 0 ? Math.min(1, Math.max(0, ((x - a!.x) * (b!.x - a!.x) + (y - a!.y) * (b!.y - a!.y)) / L2)) : 0;
    if (D(dupaUid.get(uid)!).rampa) { const f = 24 / 216, u = Math.min(1, Math.max(0, (t - f) / (1 - 2 * f))); t = u * u * (3 - 2 * u); }
    return a!.z + (b!.z - a!.z) * t;
  };
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    const A = dupaPiesa.get(ids[a]!), B = dupaPiesa.get(ids[b]!);
    if (vecini.has(ids[a] + "|" + ids[b])) continue;
    if (!bbIntersect(A!.bb, B!.bb)) continue;
    if (!poligoaneSeAting(A!.poli, B!.poli)) continue;
    const pc = puncteComune(A!.poli, B!.poli);
    // spatiul dintre fata de sus a piesei de jos si fata de jos a celei de sus, in fiecare punct comun
    let min = Infinity, unde: number[] = pc[0]!;
    for (const [x, y] of pc) {
      const za = zLocal(ids[a]!, x!, y!), zb = zLocal(ids[b]!, x!, y!), g = Math.abs(za - zb) - PAS;
      if (g < min) { min = g; unde = [x!, y!]; }
    }
    if (!pc.length || min < 0.5) { lovite.add(ids[a]!); lovite.add(ids[b]!); }
    else subPod.push({ x: unde[0]!, y: unde[1]!, spatiu: min });
  }
  for (const s of stalpi) {
    for (const uid of ids) {
      if (s.uids.includes(uid)) continue;
      const Q = dupaPiesa.get(uid);
      if (Q!.zmin >= s.z - 1) continue;
      if (bbIntersect(s.bb, Q!.bb) && poligoaneSeAting(s.poli, Q!.poli)) { lovite.add(uid); s.lovit = true; }
    }
  }
  if (lovite.size) probleme.push({ rau: true, text: tr`Piese care se suprapun: ${lovite.size} (marcate cu roșu).` });
  // trece trenul pe sub pod?
  const tren = setariCNC.inaltime_tren;
  for (const sp of subPod) sp.mic = !!tren && sp.spatiu < tren;
  const mici = subPod.filter(sp => sp.mic);
  if (mici.length) {
    const cel = mici.reduce((x, y) => (y.spatiu < x.spatiu ? y : x));
    probleme.push({ rau: true, x: cel.x, y: cel.y, text: tr`${mici.length === 1 ? tr("Un pod e prea jos") : tr`${mici.length} poduri sunt prea jos`}: sub el rămân ${fmt(cel.spatiu)} mm, iar trenul are ${fmt(tren!)} mm. Pune stâlpi mai înalți sau o rampă mai sus.` });
  } else if (subPod.length && !tren) {
    const cel = subPod.reduce((x, y) => (y.spatiu < x.spatiu ? y : x));
    probleme.push({ rau: false, x: cel.x, y: cel.y, text: tr`Sub pod rămân cel puțin ${fmt(cel.spatiu)} mm. Măsoară cel mai înalt tren și scrie-l mai jos, ca să verific dacă trece.` });
  }

  rez = { poz, capete, deschise, dupaPiesa, probleme, stalpi, lovite, aproape, subPod };
}

function patrat(x: number, y: number, u: number) {
  const L = 32;      // stalpul: 64 x 64 mm
  return [[-L, -L], [L, -L], [L, L], [-L, L], [-L, -L]].map(([a, b]) => { const [c, d] = rotP(a!, b!, u); return [x + c!, y + d!]; });
}
function bbox(p: readonly (readonly number[])[]): number[] {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of p) { if (x! < a) a = x!; if (y! < b) b = y!; if (x! > c) c = x!; if (y! > d) d = y!; }
  return [a, b, c, d];
}
const bbIntersect = (A: readonly number[], B: readonly number[]) => A[0]! < B[2]! && B[0]! < A[2]! && A[1]! < B[3]! && B[1]! < A[3]!;
function inPoligon(x: number, y: number, p: readonly (readonly number[])[]) {
  let in_ = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]!, [xj, yj] = p[j]!;
    if ((yi! > y) !== (yj! > y) && x < (xj! - xi!) * (y - yi!) / (yj! - yi!) + xi!) in_ = !in_;
  }
  return in_;
}
function segmenteSeTaie(a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[]) {
  const o = (p: readonly number[], q: readonly number[], r: readonly number[]) => (q[0]! - p[0]!) * (r[1]! - p[1]!) - (q[1]! - p[1]!) * (r[0]! - p[0]!);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function puncteComune(A: readonly (readonly number[])[], B: readonly (readonly number[])[]): number[][] {
  // varfurile zonei comune: ale lui A in B, ale lui B in A si intersectiile laturilor
  const out = [];
  for (const [x, y] of A) if (inPoligon(x!, y!, B)) out.push([x, y]);
  for (const [x, y] of B) if (inPoligon(x!, y!, A)) out.push([x, y]);
  for (let i = 0; i + 1 < A.length; i++) for (let j = 0; j + 1 < B.length; j++) {
    const a = A[i], b = A[i + 1], c = B[j], d = B[j + 1];
    const den = (b![0]! - a![0]!) * (d![1]! - c![1]!) - (b![1]! - a![1]!) * (d![0]! - c![0]!);
    if (Math.abs(den) < 1e-12) continue;
    const t = ((c![0]! - a![0]!) * (d![1]! - c![1]!) - (c![1]! - a![1]!) * (d![0]! - c![0]!)) / den, u = ((c![0]! - a![0]!) * (b![1]! - a![1]!) - (c![1]! - a![1]!) * (b![0]! - a![0]!)) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) out.push([a![0]! + t * (b![0]! - a![0]!), a![1]! + t * (b![1]! - a![1]!)]);
  }
  return out as number[][];
}
function poligoaneSeAting(A: readonly (readonly number[])[], B: readonly (readonly number[])[]) {
  for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < B.length - 1; j++)
    if (segmenteSeTaie(A[i]!, A[i + 1]!, B[j]!, B[j + 1]!)) return true;
  return inPoligon(A[0]![0]!, A[0]![1]!, B) || inPoligon(B[0]![0]!, B[0]![1]!, A);
}

// ----------------------------------------------------------------------------- piese la comanda
// O piesa la comanda = axa din segmente {t:"L", l} / {t:"A", r, a (grade), s (+1 stanga, -1 dreapta)},
// cu cuplaje la capete (cap: ["M", "T"]). Forma cuplajelor e luata din dreapta de 54 a generatorului.
const LC = "la_comanda";
const RMIN = 110;                  // raza minima pe axa (cat curba mica)
const LAT = CATALOG.latime;        // 40 mm
const SANT = 13;                   // de la axa la axa santului
const PLACA_MAX = [950, 550];      // cat de mare poate fi o piesa ca sa incapa pe placa
const LC_TITLU: Record<string, string | undefined> = {};
const fmt = (v: number) => String(Math.round(v * 10) / 10).replace(".", Limba.zecimal);
const fmtS = (v: number) => String(Math.round(v * 100) / 100).replace(".", Limba.zecimal);

function capSablon(def: DefPiesa, tip: string): number[][] {
  // conturul unui capat, in coordonatele lui: u spre exterior, v spre stanga (de la dreapta la stanga)
  const k = def.capete.find(c => c.tip === tip);
  const ux = Math.cos(rad(k!.u)), uy = Math.sin(rad(k!.u));
  const pts = def.contur.slice();
  const [a0, b0] = [pts[0], pts[pts.length - 1]];
  if (a0![0] === b0![0] && a0![1] === b0![1]) pts.pop();
  const L = pts.map(([x, y]) => [(x! - k!.x) * ux + (y! - k!.y) * uy, -(x! - k!.x) * uy + (y! - k!.y) * ux]);
  const cel = (v: number) => { let b = 0, bd = Infinity; L.forEach(([p, q], i: number) => { const d = Math.hypot(p!, q! - v); if (d < bd) { bd = d; b = i; } }); return b; };
  const a = cel(-LAT / 2), b = cel(LAT / 2), out: number[][] = [];
  for (let i = a; ; i = (i + 1) % L.length) { out.push(L[i]!); if (i === b) break; }
  return out as number[][];
}
const CAP: Record<string, number[][]> = { T: capSablon(P.dreapta_54!, "T"), M: capSablon(P.dreapta_54!, "M") };

function axaLC(seg: readonly SegLC[]): [number, number, number][] {
  let x = 0, y = 0, h = 0;
  const pts: [number, number, number][] = [[0, 0, 0]];
  for (const s of seg) {
    if (s.t === "L") { x += s.l * Math.cos(h); y += s.l * Math.sin(h); pts.push([x, y, h]); continue; }
    const a = rad(s.a), sg = s.s >= 0 ? 1 : -1;
    const cx = x - sg * s.r * Math.sin(h), cy = y + sg * s.r * Math.cos(h);
    const n = Math.max(2, Math.ceil(s.a / 1.5));
    for (let i = 1; i <= n; i++) {
      const hh = h + sg * a * i / n;
      pts.push([cx + sg * s.r * Math.sin(hh), cy - sg * s.r * Math.cos(hh), hh]);
    }
    [x, y, h] = pts[pts.length - 1]!;
  }
  return pts;
}
const decalat = (pts: readonly (readonly number[])[], d: number): number[][] => pts.map(([x, y, h]) => [x! - d * Math.sin(h!), y! + d * Math.cos(h!)]);
const lungimeSeg = (seg: readonly SegLC[]): number => seg.reduce((t, s) => t + (s.t === "L" ? s.l : s.r * rad(s.a)), 0);
const cheieLC = (lc: LucrareLC) => JSON.stringify([lc.seg.map(s => s.t === "L" ? ["L", +s.l.toFixed(2)] : ["A", +s.r.toFixed(2), +s.a.toFixed(3), s.s]), lc.cap]);
function idLC(lc: LucrareLC) {
  let h = 2166136261;
  for (const ch of cheieLC(lc)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return "lc_" + h.toString(36);
}
function formaLC(seg: readonly SegLC[]) {
  const arce = seg.filter(s => s.t === "A");
  if (!arce.length) return "dreapta";
  if (seg.length === 1) return "curba";
  if (arce.length === 2 && arce[0]!.s !== arce[1]!.s) return "S";
  return "compusa";
}
function titluLC(lc: LucrareLC) {
  const f = formaLC(lc.seg), c = lc.cap.join("");
  const capete = c === "TT" ? tr(" · tată–tată") : c === "MM" ? tr(" · mamă–mamă") : "";
  if (f === "dreapta") return tr`Dreaptă la comandă ${fmt(lungimeSeg(lc.seg))}` + capete;
  if (f === "curba") { const s = lc.seg[0] as Extract<SegLC, { t: "A" }>; return tr`Curbă la comandă R${fmt(s.r)} · ${fmt(s.a)}° ${s.s > 0 ? tr("stânga") : tr("dreapta")}` + capete; }
  return (f === "S" ? tr`Piesă la comandă în S · ${fmt(lungimeSeg(lc.seg))} mm` : tr`Piesă la comandă · ${fmt(lungimeSeg(lc.seg))} mm`) + capete;
}

const LC_CACHE = new Map<string, DefPiesa>();
function defLC(lc: LucrareLC): DefPiesa {
  const cheie = cheieLC(lc);
  if (LC_CACHE.has(cheie)) return LC_CACHE.get(cheie)!;
  const pts = axaLC(lc.seg);
  const [xe, ye, he] = pts[pts.length - 1]!;
  const capete = [{ x: 0, y: 0, u: 180, tip: lc.cap[0]!, z: 0 },
                  { x: xe, y: ye, u: norm(he * 180 / Math.PI), tip: lc.cap[1]!, z: 0 }];
  const pune = (sab: readonly number[][], k: CapatDef) => { const ux = Math.cos(rad(k.u)), uy = Math.sin(rad(k.u)); return sab.map(([u, v]) => [k.x + u! * ux - v! * uy, k.y + u! * uy + v! * ux]); };
  const dr = decalat(pts, -LAT / 2), st = decalat(pts, LAT / 2);
  const contur = [...pune(CAP[lc.cap[0]!]!, capete[0]!), ...dr.slice(1, -1), ...pune(CAP[lc.cap[1]!]!, capete[1]!), ...st.slice(1, -1).reverse()];
  contur.push(contur[0]!);
  // pentru suprapuneri: banda ingustata cu 1,2 mm pe fiecare parte si la capete
  const pi = pts.map(p => p.slice());
  pi[0] = [pi[0]![0]! + 1.2 * Math.cos(pi[0]![2]!), pi[0]![1]! + 1.2 * Math.sin(pi[0]![2]!), pi[0]![2]!];
  const u = pi[pi.length - 1];
  pi[pi.length - 1] = [u![0]! - 1.2 * Math.cos(u![2]!), u![1]! - 1.2 * Math.sin(u![2]!), u![2]!];
  const interior = [...decalat(pi, -LAT / 2 + 1.2), ...decalat(pi, LAT / 2 - 1.2).reverse()];
  interior.push(interior[0]!);
  // mijlocul axei (pentru un stalp pus de mana)
  const lung = lungimeSeg(lc.seg);
  let acum = 0, mij = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
    if (acum + d >= lung / 2) { const f = (lung / 2 - acum) / (d || 1); mij = [pts[i - 1]![0] + f * (pts[i]![0] - pts[i - 1]![0]), pts[i - 1]![1] + f * (pts[i]![1] - pts[i - 1]![1]), pts[i - 1]![2] + f * (pts[i]![2] - pts[i - 1]![2])]; break; }
    acum += d;
  }
  const bb = bbox(contur), titlu = titluLC(lc);
  const def: DefPiesa = { id: LC, lc, titlu, contur, santuri: [decalat(pts, SANT), decalat(pts, -SANT)], capete, interior,
                dim: [bb[2]! - bb[0]!, bb[3]! - bb[1]!], bb, oglinda: null, grupa: "La comanda", lungime: lung,
                panta: lc.seg.length === 1 && lc.seg[0]!.t === "L", forma: formaLC(lc.seg),
                mijloc: { x: mij![0], y: mij![1], u: norm(mij![2] * 180 / Math.PI) } };
  LC_TITLU[idLC(lc)] = titlu;
  LC_CACHE.set(cheie, def);
  return def;
}
const D = (p: PiesaPusa): DefPiesa => (p.lc ? defLC(p.lc) : P[p.id]!);
const idPiesa = (p: PiesaPusa) => (p.lc ? idLC(p.lc) : p.id);

// mijlocul pieselor din catalog cu doua capete (drepte, curbe): pentru stalpii pusi de mana
for (const def of CATALOG.piese) {
  if (def.capete.length !== 2 || def.rampa) continue;
  const [a, b] = def.capete;
  const delta = (() => { let d = norm(b!.u - (a!.u + 180)); return d > 180 ? d - 360 : d; })();
  const cx = (a!.x + b!.x) / 2, cy = (a!.y + b!.y) / 2, c = Math.hypot(b!.x - a!.x, b!.y - a!.y);
  const cu = Math.atan2(b!.y - a!.y, b!.x - a!.x), sag = (c / 2) * Math.tan(rad(delta) / 4);
  def.mijloc = { x: cx + sag * Math.sin(cu), y: cy - sag * Math.cos(cu), u: norm(a!.u + 180 + delta / 2) };
}

function validLC(lc: LucrareLC) {
  if (!lc || !Array.isArray(lc.seg) || !lc.seg.length || lc.seg.length > 8) return false;
  if (!Array.isArray(lc.cap) || lc.cap.length !== 2 || !lc.cap.every((c: string) => c === "T" || c === "M")) return false;
  return lc.seg.every(s => s && (s.t === "L" ? Number.isFinite(s.l) && s.l > 0 && s.l < 2000
    : s.t === "A" && Number.isFinite(s.r) && s.r >= 20 && s.r < 20000 && Number.isFinite(s.a) && s.a > 0 && s.a <= 360 && (s.s === 1 || s.s === -1)));
}

// cat de lunga trebuie sa fie macar o piesa, dupa cuplaje (locasul mama are ~19 mm adancime)
const lungimeMinima = (cap: readonly string[]) => 22 + cap.filter((c: string) => c === "M").length * 14;

/**
 * Motivul pentru care piesa nu se poate freza ("" dacă se poate) și dacă mai mult loc ar ajuta (o curbă prea strânsă, o piesă
 * prea scurtă): sfatul se alege după felul motivului, nu după textul lui, care e în limba paginii (ADR 0165).
 */
function motivLC(lc: LucrareLC): { motiv: string; loc: boolean } {
  const def = defLC(lc);
  const rmin = Math.min(...lc.seg.filter(s => s.t === "A").map(s => s.r), Infinity);
  if (rmin < RMIN - 0.5) return { motiv: tr`Curba ar fi prea strânsă: rază ${fmt(rmin)} mm (minim ${RMIN}).`, loc: true };
  if (lc.seg.some(s => s.t === "A" && s.a > 180.01)) return { motiv: tr("Piesa s-ar întoarce prea mult (peste 180°)."), loc: false };
  const lm = lungimeMinima(lc.cap);
  if (def.lungime! < lm - 0.01) return { motiv: tr`Piesa ar avea doar ${fmt(def.lungime!)} mm; cu cuplajele ei trebuie să aibă măcar ${lm} mm.`, loc: true };
  const [xe, ye] = [def.capete[1]!.x, def.capete[1]!.y];
  const ung = Math.atan2(ye, xe), c = Math.cos(-ung), s = Math.sin(-ung);
  const rot = def.contur.map(([x, y]) => [x! * c - y! * s, x! * s + y! * c]);
  const b = bbox(rot), w = b[2]! - b[0]!, h = b[3]! - b[1]!;
  if (Math.max(w, h) > PLACA_MAX[0]! || Math.min(w, h) > PLACA_MAX[1]!) return { motiv: tr`Piesa ar fi prea mare pentru placă (${Math.round(w)} × ${Math.round(h)} mm).`, loc: false };
  return { motiv: "", loc: false };
}
function verificaLC(lc: LucrareLC) {
  // intoarce "" daca piesa se poate freza, altfel motivul
  return motivLC(lc).motiv;
}

// ---- piesa care leaga doua capete libere: dreapta, arc sau doua arce tangente (biarc)
function arcIntre(S: readonly number[], t: readonly number[], E: readonly number[]): SegLC[] {
  const c = [E[0]! - S[0]!, E[1]! - S[1]!], lc = Math.hypot(c[0]!, c[1]!);
  if (lc < 1e-6) return [];
  const th = 2 * Math.atan2(t[0]! * c[1]! - t[1]! * c[0]!, t[0]! * c[0]! + t[1]! * c[1]!);
  if (Math.abs(th) < 1e-6) return [{ t: "L", l: lc }];
  return [{ t: "A", r: lc / (2 * Math.abs(Math.sin(th / 2))), a: Math.abs(th) * 180 / Math.PI, s: th > 0 ? 1 : -1 }];
}
function lipeste(seg: readonly SegLC[]): SegLC[] {
  const out = [];
  for (const s of seg) {
    const u = out[out.length - 1];
    if (u && u.t === "L" && s.t === "L") u.l += s.l;
    else if (u && u.t === "A" && s.t === "A" && u.s === s.s && Math.abs(u.r - s.r) < 0.02 * Math.max(1, u.r / 100)) u.a += s.a;
    else out.push({ ...s });
  }
  return out.filter(s => (s.t === "L" ? s.l > 0.01 : s.a > 0.001));
}
function segmentePintre(X: number, Y: number, phi: number): SegLC[] | null {
  // de la (0,0) cu directia 0, la (X,Y) cu directia phi (radiani)
  if (Math.abs(phi) < 1e-5 && Math.abs(Y) < 0.02) return X > 0 ? [{ t: "L", l: X }] : null;
  const t1 = [Math.cos(phi), Math.sin(phi)];
  const vt = X * (1 + t1[0]!) + Y * t1[1]!, vv = X * X + Y * Y, tt = t1[0];
  let d;
  if (Math.abs(1 - tt!) < 1e-9) { if (vt <= 1e-9) return null; d = vv / (2 * vt); }
  else {
    const a = 2 * (tt! - 1), b = -2 * vt, disc = b * b - 4 * a * vv;
    if (disc < 0) return null;
    d = Math.max((-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a));
    if (!(d > 0)) return null;
  }
  const q0 = [d, 0], q1 = [X - d * t1[0]!, Y - d * t1[1]!];
  const J = [(q0[0]! + q1[0]!) / 2, (q0[1]! + q1[1]!) / 2];
  const tm = [q1[0]! - q0[0]!, q1[1]! - q0[1]!], lm = Math.hypot(tm[0]!, tm[1]!);
  if (lm < 1e-9) return null;
  return lipeste([...arcIntre([0, 0], [1, 0], J), ...arcIntre(J, [tm[0]! / lm, tm[1]! / lm], [X, Y])]);
}
function conector(A: CapatPus, B: CapatPus) {
  // piesa noua porneste din A (in directia A.u) si trebuie sa intre in B
  if (Math.abs(A.z - B.z) > 1) return { motiv: tr`Capetele sunt la înălțimi diferite (${Math.round(A.z)} și ${Math.round(B.z)} mm).` };
  const h = rad(A.u), dx = B.x - A.x, dy = B.y - A.y;
  const X = dx * Math.cos(h) + dy * Math.sin(h), Y = -dx * Math.sin(h) + dy * Math.cos(h);
  let phi = norm(B.u + 180 - A.u); if (phi > 180) phi -= 360;
  if (X < 1 && Math.abs(phi) < 60) return { motiv: "Capetele trec unul pe lângă altul: piesele de acolo se suprapun. Șterge piesele roșii, apoi apasă din nou Închide.", spate: true };
  const seg = segmentePintre(X, Y, rad(phi));
  if (!seg || !seg.length) return { motiv: "Capetele sunt întoarse așa că nu le pot lega cu o singură piesă." };
  const lc = { seg, cap: [opus(A.tip), opus(B.tip)] };
  const { motiv, loc } = motivLC(lc);
  if (motiv) return { motiv: motiv + (loc ? tr(" Scoate o dreaptă de lângă capăt ca să fie mai mult loc și apasă din nou Închide.") : "") };
  return { lc, lungime: lungimeSeg(seg) };
}

// ----------------------------------------------------------------------------- lista de piese
function numara() {
  const n: Record<string, number> = {};
  for (const p of stare.piese) { const k = idPiesa(p); n[k] = (n[k] || 0) + 1; }
  if (n.opritor) n.opritor_bloc = n.opritor;
  for (const s of rez.stalpi) { const k = "stalp_" + s.n; n[k] = (n[k] || 0) + 1; }
  return n;
}

// ----------------------------------------------------------------------------- desen
const NS = "http://www.w3.org/2000/svg";
function puncte(arr: readonly (readonly number[])[]) { return arr.map(([x, y]) => x!.toFixed(1) + "," + y!.toFixed(1)).join(" "); }

function deseneaza() {
  const svg = $("#plan");
  const W = svg.clientWidth || 800, H = svg.clientHeight || 500;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  const s = vedere.s;
  const m = [s, 0, 0, -s, W / 2 - vedere.cx * s, H / 2 + vedere.cy * s];
  const ecran = (x: number, y: number): [number, number] => [m[0]! * x + m[4]!, m[3]! * y + m[5]!];
  let h = "";

  // grila de 54 mm (modulul dreptei scurte)
  const pas = 54;
  const [x0, y1] = [vedere.cx - W / 2 / s, vedere.cy + H / 2 / s];
  const [x1, y0] = [vedere.cx + W / 2 / s, vedere.cy - H / 2 / s];
  let grila = "";
  const lw = (0.7 / s).toFixed(3);
  for (let x = Math.floor(x0 / pas) * pas; x <= x1; x += pas) grila += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/>`;
  for (let y = Math.floor(y0 / pas) * pas; y <= y1; y += pas) grila += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`;
  h += `<g transform="matrix(${m.join(",")})">`;
  h += `<g stroke="var(--grila-tare)" stroke-width="${lw}">${grila}</g>`;

  const ordine = stare.piese.slice().sort((a, b) => rez.dupaPiesa.get(a.uid)!.zmin - rez.dupaPiesa.get(b.uid)!.zmin);
  const jos = ordine.filter(p => rez.dupaPiesa.get(p.uid)!.zmin < 0.5);
  const sus = ordine.filter(p => rez.dupaPiesa.get(p.uid)!.zmin >= 0.5);
  const piesa = (p: PiesaPusa) => {
    const r = rez.poz.get(p.uid), def = D(p), d = rez.dupaPiesa.get(p.uid);
    const ridicat = d!.zmax - PAS > 0.5;
    const sel = selPiesa === p.uid, lovit = rez.lovite.has(p.uid);
    let g = "";
    if (ridicat) {
      const dz = Math.max(...d!.capete.map(k => k.z)) * 0.12;
      g += `<g transform="translate(${(r!.x + dz).toFixed(2)} ${(r!.y - dz).toFixed(2)}) rotate(${r!.rot.toFixed(3)})"><polygon points="${puncte(def.contur)}" fill="var(--umbra)"/></g>`;
    }
    g += `<g data-uid="${p.uid}" transform="translate(${r!.x.toFixed(3)} ${r!.y.toFixed(3)}) rotate(${r!.rot.toFixed(4)})">`;
    g += `<polygon points="${puncte(def.contur)}" fill="${lovit ? "var(--pericol-moale)" : ridicat ? "var(--pod)" : "var(--fag)"}" stroke="${lovit ? "var(--pericol)" : sel ? "var(--semnal)" : "var(--fag-margine)"}" stroke-width="${sel || lovit ? 2.6 : 1}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
    for (const sg of def.santuri) g += `<polyline points="${puncte(sg)}" fill="none" stroke="var(--sant)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`;
    g += `</g>`;
    return g;
  };
  for (const p of jos) h += piesa(p);
  for (const st of rez.stalpi) {
    h += `<polygon points="${puncte(st.poli)}" fill="${st.lovit ? "var(--pericol-moale)" : "var(--stalp)"}" stroke="${st.lovit ? "var(--pericol)" : "var(--stalp-margine)"}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  }
  for (const p of sus) h += piesa(p);

  // capete libere
  for (const k of rez.deschise) {
    const sel = selCapat && selCapat.uid === k.uid && selCapat.j === k.j;
    const [ox, oy] = rotP(-6, 0, k.u);
    const cx = (k.x + ox!).toFixed(2), cy = (k.y + oy!).toFixed(2);
    h += `<g data-capat="${k.uid}:${k.j}">`;
    h += `<circle cx="${cx}" cy="${cy}" r="${Math.max(16, 22 / s)}" fill="transparent"/>`;
    if (sel) h += `<circle class="puls" cx="${cx}" cy="${cy}" r="15" fill="none" stroke="var(--semnal)" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
    h += k.tip === "T"
      ? `<circle cx="${cx}" cy="${cy}" r="7" fill="${sel ? "var(--semnal)" : "var(--fag-margine)"}"/>`
      : `<circle cx="${cx}" cy="${cy}" r="7" fill="var(--masa)" stroke="${sel ? "var(--semnal)" : "var(--fag-margine)"}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;
    h += `</g>`;
  }
  for (const [A, B] of rez.aproape) h += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="var(--atentie)" stroke-width="2.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`;
  // trenul: pe macazuri, ramura pusa; vagoanele le deseneaza bucla animatiei in stratul de deasupra
  if (tren) {
    for (const [uid, i] of tren.macaz) {
      const c = tren.cai.find(x => x.uid === uid && x.i === i);
      if (c) h += `<polyline points="${puncte(c.pct)}" fill="none" stroke="var(--semnal)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity=".9" pointer-events="none"/>`;
    }
    h += `<g id="strat-tren" pointer-events="none">${desenTren()}</g>`;
  }

  // piesa propusa (cand tragi dintr-un capat sau in editor)
  const live = [];
  if (fantoma) {
    const col = fantoma.ok ? "var(--semnal)" : "var(--pericol)", fb = fantoma.baza;
    if (fantoma.lc) {
      const def = defLC(fantoma.lc);
      h += `<g transform="translate(${fb.x.toFixed(3)} ${fb.y.toFixed(3)}) rotate(${fb.u.toFixed(4)})" pointer-events="none">` +
        `<polygon points="${puncte(def.contur)}" fill="${col}" fill-opacity=".22" stroke="${col}" stroke-width="2.2" stroke-dasharray="7 4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` +
        def.santuri.map(sg => `<polyline points="${puncte(sg)}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" opacity=".35"/>`).join("") + `</g>`;
    }
    if (fantoma.tinta) h += `<circle cx="${fantoma.tinta.x}" cy="${fantoma.tinta.y}" r="${(20 / s).toFixed(2)}" fill="none" stroke="${col}" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    if (fantoma.text && fantoma.px != null) live.push({ x: fantoma.px, y: fantoma.py! - 34, text: fantoma.text.split(/(?<=\.) /)[0], ok: fantoma.ok });
  }
  // bulina care schimba forma piesei la comanda selectate
  const mod = gest && gest.tip === "maner" ? gest.model : null;
  const mn = (!gest || gest.tip !== "trage") ? manerPiesa(piesaSel()!) : null;
  if (mn) {
    h += `<g data-maner="${mn.mod}"><circle cx="${mn.x.toFixed(2)}" cy="${mn.y.toFixed(2)}" r="${(24 / s).toFixed(2)}" fill="transparent"/>` +
      `<circle cx="${mn.x.toFixed(2)}" cy="${mn.y.toFixed(2)}" r="${(10 / s).toFixed(2)}" fill="${mod && !mod.ok ? "var(--pericol)" : "var(--semnal)"}" stroke="var(--panou)" stroke-width="3" vector-effect="non-scaling-stroke"/></g>`;
    if (mod && mod.mutat) { const [x, y] = ecran(mn.x, mn.y); live.push({ x, y: y - 30, text: mod.text.split(/(?<=\.) /)[0], ok: mod.ok }); }
  }
  h += `</g>`;

  // etichete de inaltime (in coordonate ecran, ca textul sa nu fie intors)
  if (s > 0.2) {
    const vazute: number[][] = [];
    for (const st of rez.stalpi) {
      const [x, y] = ecran(st.x, st.y);
      if (vazute.some(([a, b]) => Math.hypot(a! - x, b! - y) < 44)) continue;
      vazute.push([x, y]);
      h += `<g transform="translate(${x.toFixed(1)} ${(y - 22).toFixed(1)})" pointer-events="none"><rect x="-31" y="-10" width="62" height="18" rx="9" fill="var(--panou)" stroke="var(--stalp-margine)"/><text text-anchor="middle" y="3.5" font-size="11" font-weight="700" fill="var(--text)" font-family="var(--font-text)">${tr`stâlp ${Math.round(st.z)}`}</text></g>`;
    }
    // cat loc ramane sub fiecare pod (rosu daca trenul nu incape)
    for (const sp of rez.subPod || []) {
      const [x, y] = ecran(sp.x, sp.y);
      if (vazute.some(([a, b]) => Math.hypot(a! - x, b! - y) < 40)) continue;
      vazute.push([x, y]);
      const t = "↕ " + Math.round(sp.spatiu) + " mm", w = 16 + t.length * 6.4;
      h += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" pointer-events="none"><rect x="${(-w / 2).toFixed(1)}" y="-10" width="${w.toFixed(1)}" height="20" rx="10" fill="${sp.mic ? "var(--pericol)" : "var(--panou)"}" stroke="${sp.mic ? "var(--pericol)" : "var(--stalp-margine)"}"/>` +
        `<text text-anchor="middle" y="4" font-size="11" font-weight="700" fill="${sp.mic ? "#fff" : "var(--text)"}" font-family="var(--font-text)">${t}</text></g>`;
    }
  }
  for (const L of live) {
    const w = Math.min(W - 16, 14 + L.text!.length * 6.6), x = Math.min(Math.max(L.x, w / 2 + 8), W - w / 2 - 8), y = Math.max(L.y, 16);
    h += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" pointer-events="none"><rect x="${(-w / 2).toFixed(1)}" y="-12" width="${w.toFixed(1)}" height="24" rx="12" fill="${L.ok ? "var(--semnal)" : "var(--pericol)"}"/>` +
      `<text text-anchor="middle" y="4.5" font-size="12.5" font-weight="700" fill="#fff" font-family="var(--font-text)">${L.text!.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></g>`;
  }
  svg.innerHTML = h;
}

// ----------------------------------------------------------------------------- trenul animat
// Caile fiecarei piese sunt mijlocul dintre cele doua santuri ale ei (santurile vin in perechi). Locomotiva si vagoanele
// merg fiecare pe graful cailor, cu acelasi pas; la un capat legat trec pe piesa vecina, pe calea care pleaca de acolo
// (la un macaz luat din varf, pe ramura pusa; luat dinspre o ramura, il impinge pe ramura aceea, ca limba adevarata);
// la un capat liber sau la un opritor, trenul se intoarce.
/** Trenul de pe plan: căile (din `grafTren`), macazurile puse, vehiculele (calea, poziția pe ea, sensul). */
type StareTren = ReturnType<typeof grafTren> & { macaz: Map<string, number>; vag: Vehicul[];
  t0: number; raf?: number; inainte?: boolean; schimbat?: boolean };
let tren: StareTren | null = null;   // { cai, intrari, macaz: Map(uid -> calea pusa), vag: [{ c, s, dir }], viteza, raf, t0 }
const TREN = { viteza: 150, lungimi: [74, 62, 62], distanta: 78, culori: ["#c8372d", "#2f6fd6", "#e0a526"] };
function netezeste(pts: number[][]): number[][] {
  // Catmull-Rom prin punctele axei (curbele vin cu 9 puncte), ca trenul sa nu mearga in zig-zag
  if (pts.length < 3) return pts;
  const out: number[][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 6; k++) {
      const t = k / 6, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(a => 0.5 * (2 * p1![a]! + (-p0![a]! + p2![a]!) * t + (2 * p0![a]! - 5 * p1![a]! + 4 * p2![a]! - p3![a]!) * t2 + (-p0![a]! + 3 * p1![a]! - 3 * p2![a]! + p3![a]!) * t3)));
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}
function grafTren() {
  const cai: CaleTren[] = [], intrari = new Map<string, { c: CaleTren; e: number }[]>();
  for (const p of stare.piese) {
    const def = D(p), r = rez.poz.get(p.uid), d = rez.dupaPiesa.get(p.uid);
    if (!r || !d) continue;
    for (let i = 0; i + 1 < def.santuri.length; i += 2) {
      const a = def.santuri[i], b = def.santuri[i + 1];
      if (a!.length !== b!.length) continue;
      const loc = netezeste(a!.map((q, k) => [(q[0]! + b![k]![0]!) / 2, (q[1]! + b![k]![1]!) / 2]));
      const capat = (q: readonly number[]): number | null => { let best: number | null = null, bd = 3; def.capete.forEach((c, j) => { const e = Math.hypot(c.x - q[0]!, c.y - q[1]!); if (e < bd) { bd = e; best = j; } }); return best; };
      const cap = [capat(loc[0]!), capat(loc[loc.length - 1]!)];
      const pct = loc.map(([x, y]) => { const [u, v] = rotP(x!, y!, r.rot); return [r.x + u!, r.y + v!]; });
      const L = [0];
      for (let k = 1; k < pct.length; k++) L.push(L[k - 1]! + Math.hypot(pct[k]![0]! - pct[k - 1]![0]!, pct[k]![1]! - pct[k - 1]![1]!));
      const z = cap.map((j, e) => (j !== null ? d.capete[j]!.z : null));
      if (z[0] === null) z[0] = z[1] ?? d.zmin; if (z[1] === null) z[1] = z[0]!;
      const c: CaleTren = { uid: p.uid, i: i / 2, pct, L, lung: L[L.length - 1]!, cap, z, rampa: !!def.rampa, idx: cai.length };
      cai.push(c);
      cap.forEach((j, e) => { if (j === null) return; const k = p.uid + ":" + j; if (!intrari.has(k)) intrari.set(k, []); intrari.get(k)!.push({ c, e }); });
    }
  }
  // macazurile: piesele cu un capat din care pleaca doua cai
  const macaz = new Map<string, number>();
  for (const [k, l] of intrari) if (l.length > 1) { const uid = k.split(":")[0]; if (!macaz.has(uid!)) macaz.set(uid!, l[0]!.c.i); }
  return { cai, intrari, macaz };
}
function punctPeCale(c: CaleTren, s: number) {
  s = Math.min(c.lung, Math.max(0, s));
  let a = 0, b = c.L.length - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (c.L[m]! <= s) a = m; else b = m; }
  const f = c.L[b]! > c.L[a]! ? (s - c.L[a]!) / (c.L[b]! - c.L[a]!) : 0;
  const [x0, y0] = c.pct[a]!, [x1, y1] = c.pct[b]!;
  let t = c.lung > 0 ? s / c.lung : 0;
  if (c.rampa) { const fr = 24 / 216, u = Math.min(1, Math.max(0, (t - fr) / (1 - 2 * fr))); t = u * u * (3 - 2 * u); }
  return { x: x0! + (x1! - x0!) * f, y: y0! + (y1! - y0!) * f, u: Math.atan2(y1! - y0!, x1! - x0!), z: c.z[0]! + (c.z[1]! - c.z[0]!) * t };
}
function treceMai(v: Vehicul) {
  // v a ajuns la capatul caii lui: calea pe care intra (de la capatul ei), sau null (capat liber / opritor)
  const c = v.c, e = v.dir > 0 ? 1 : 0, j = c.cap[e];
  const k = j !== null ? rez.capete.find(x => x.uid === c.uid && x.j === j) : null;
  const B = k && k.legat;
  const l = B ? tren!.intrari.get(B.uid + ":" + B.j) : null;
  if (!l || !l.length) return null;
  let ales = l[0];
  if (l.length > 1) ales = l.find(x => x.c.i === tren!.macaz.get(B!.uid)) || l[0];
  else if (tren!.macaz.has(B!.uid) && tren!.macaz.get(B!.uid) !== ales!.c.i) { tren!.macaz.set(B!.uid, ales!.c.i); tren!.schimbat = true; }   // intrat dinspre o ramura: limba e impinsa pe ea
  return { c: ales!.c, s: ales!.e === 0 ? 0 : ales!.c.lung, dir: ales!.e === 0 ? 1 : -1 };
}
function mutaVehicul(v: Vehicul, ds: number) {
  // muta vehiculul cu ds (>= 0) in sensul lui, trecand pe piesele vecine; la un capat fara continuare se opreste: false
  let rest = ds;
  for (let pas = 0; pas < 50; pas++) {
    const pana = v.dir > 0 ? v.c.lung - v.s : v.s;
    if (rest <= pana) { v.s += v.dir * rest; return true; }
    rest -= pana;
    const n = treceMai(v);
    if (!n) { v.s = v.dir > 0 ? v.c.lung : 0; return false; }
    v.c = n.c; v.s = n.s; v.dir = n.dir;
  }
  return true;
}
function porneste(c: CaleTren, s: number) {
  // locomotiva la s pe calea c; vagoanele in spatele ei, pe unde a venit. Daca in spate e un capat liber prea aproape,
  // trenul se pune invers, apoi mai incolo pe aceeasi cale.
  const macaz = new Map(tren!.macaz);
  for (const [dir, s0] of [[1, s], [-1, s], [1, c.lung], [-1, 0]] as [number, number][]) {
    tren!.macaz = new Map(macaz);
    const vag: Vehicul[] = [{ c, s: s0, dir }];
    let ok = true;
    for (let k = 1; k < TREN.lungimi.length; k++) {
      const v = { ...vag[k - 1]!, dir: -vag[k - 1]!.dir };
      ok = mutaVehicul(v, TREN.distanta) && ok;
      v.dir = -v.dir;
      vag.push(v);
    }
    tren!.vag = vag; tren!.inainte = true;
    if (ok) return;
  }
}
function refaTren() {
  const g = grafTren();
  if (!g.cai.length) { opresteTren(); return; }
  const vechi = tren!.vag || [], pus = tren!.macaz;
  Object.assign(tren!, g);
  for (const [uid, i] of pus) if (tren!.macaz.has(uid)) tren!.macaz.set(uid, i);
  // vehiculele raman unde erau, daca piesa lor mai e
  const gasit = vechi.map(v => tren!.cai.find(c => c.uid === v.c.uid && c.i === v.c.i));
  if (vechi.length && gasit.every(Boolean)) tren!.vag = vechi.map((v, k) => ({ c: gasit[k]!, s: Math.min(v.s, gasit[k]!.lung), dir: v.dir }));
  else { const c = tren!.cai.find(x => x.uid === selPiesa) || tren!.cai[0]; porneste(c!, c!.lung / 2); }
}
function pornesteTren() {
  if (!stare.piese.length) { toast("Pune întâi piese pe plan."); return; }
  tren = { macaz: new Map(), vag: [], t0: performance.now() } as unknown as StareTren;
  refaTren();
  if (!tren) return;
  $("#btn-tren").setAttribute("aria-pressed", "true"); $("#btn-tren").textContent = "■ Stop";
  toast("Atinge un macaz ca să-l schimbi (verde: ramura pusă) sau locomotiva ca să meargă înapoi.");
  const pas = (t: number) => {
    if (!tren) return;
    const dt = Math.min(0.05, (t - tren.t0) / 1000); tren.t0 = t;
    avanseazaTren(TREN.viteza * dt);
    const g = document.getElementById("strat-tren");
    if (g && !tren.schimbat) g.innerHTML = desenTren(); else { tren.schimbat = false; deseneaza(); }
    tren.raf = requestAnimationFrame(pas);
  };
  tren.raf = requestAnimationFrame(pas);
  deseneaza();
}
function opresteTren() {
  if (tren && tren.raf) cancelAnimationFrame(tren.raf);
  tren = null;
  const b = $("#btn-tren"); if (b) { b.setAttribute("aria-pressed", "false"); b.textContent = "▶ Tren"; }
  deseneaza();
}
function avanseazaTren(ds: number) {
  // primul vehicul in sensul mersului hotaraste: la un capat fara continuare, tot trenul se intoarce
  const ordine = tren!.inainte ? tren!.vag : tren!.vag.slice().reverse();
  const cap = { ...ordine[0] };
  if (!mutaVehicul(cap as Vehicul, ds)) {
    for (const v of tren!.vag) v.dir = -v.dir;
    tren!.inainte = !tren!.inainte;
    return;
  }
  ordine[0]!.c = cap.c!; ordine[0]!.s = cap.s!; ordine[0]!.dir = cap.dir!;
  for (const v of ordine.slice(1)) mutaVehicul(v, ds);
}
function desenTren() {
  if (!tren || !tren.vag) return "";
  let h = "";
  tren.vag.forEach((v, k: number) => {
    const p = punctPeCale(v.c, v.s), u = (p.u + (v.dir > 0 ? 0 : Math.PI)) * 180 / Math.PI;
    const fata = tren!.inainte ? 1 : -1, L = TREN.lungimi[k], W = 32;
    const dz = p.z * 0.12;
    if (p.z > 0.5) h += `<g transform="translate(${(p.x + dz).toFixed(1)} ${(p.y - dz).toFixed(1)}) rotate(${u.toFixed(1)})"><rect x="${-L! / 2}" y="${-W / 2}" width="${L}" height="${W}" rx="7" fill="var(--umbra)"/></g>`;
    h += `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${u.toFixed(1)})">` +
      `<rect x="${-L! / 2}" y="${-W / 2}" width="${L}" height="${W}" rx="7" fill="${TREN.culori[k % TREN.culori.length]}" stroke="#2a1d14" stroke-width="2"/>`;
    if (k === 0) {
      // locomotiva: cabina in spate, cosul in fata (fata = sensul in care merge acum trenul)
      const cab = -fata * (L! / 2 - 13), cos = fata * (L! / 2 - 14);
      h += `<rect x="${cab - 11}" y="${-W / 2 + 2}" width="22" height="${W - 4}" rx="4" fill="#8e241c"/><circle cx="${cos}" cy="0" r="6" fill="#2a1d14"/>`;
    } else h += `<rect x="${-L! / 2 + 6}" y="${-W / 2 + 6}" width="${L! - 12}" height="${W - 12}" rx="4" fill="#fff" opacity=".28"/>`;
    h += `</g>`;
  });
  return h;
}
function atingereTren(cx: number, cy: number) {
  // in modul tren: locomotiva se intoarce, macazurile se schimba; altfel atingerea merge mai departe
  const svg = $("#plan"), b = svg.getBoundingClientRect(), s = vedere.s;
  const x = vedere.cx + (cx - b.left - svg.clientWidth / 2) / s, y = vedere.cy - (cy - b.top - svg.clientHeight / 2) / s;
  const loc = punctPeCale(tren!.vag[0]!.c, tren!.vag[0]!.s);
  if (Math.hypot(loc.x - x, loc.y - y) < Math.max(45, 26 / s)) {
    for (const v of tren!.vag) v.dir = -v.dir;
    tren!.inainte = !tren!.inainte;
    return true;
  }
  const el = document.elementFromPoint(cx, cy), pc = el && el.closest<HTMLElement>("[data-uid]");
  if (!pc) return false;
  const uid = pc.getAttribute("data-uid");
  if (!tren!.macaz.has(uid!)) return false;
  if (tren!.vag.some(v => v.c.uid === uid)) { toast("Așteaptă să treacă trenul de macaz."); return true; }
  const cai = tren!.cai.filter(c => c.uid === uid).map(c => c.i), i = cai.indexOf(tren!.macaz.get(uid!)!);
  tren!.macaz.set(uid!, cai[(i + 1) % cai.length]!);
  deseneaza();
  return true;
}

// ----------------------------------------------------------------------------- vedere
function incadreaza() {
  const svg = $("#plan");
  const W = svg.clientWidth || 800, H = svg.clientHeight || 500;
  if (!stare.piese.length) { vedere = { cx: 0, cy: 0, s: Math.min(W, H) / 700 }; return; }
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [, D] of rez.dupaPiesa) { a = Math.min(a, D.bb[0]!); b = Math.min(b, D.bb[1]!); c = Math.max(c, D.bb[2]!); d = Math.max(d, D.bb[3]!); }
  const marg = 60;
  vedere.cx = (a + c) / 2; vedere.cy = (b + d) / 2;
  vedere.s = Math.min(W / (c - a + 2 * marg), H / (d - b + 2 * marg), 3);
}
function asiguraVizibil(uid: string) {
  const D = rez.dupaPiesa.get(uid); if (!D) return;
  const svg = $("#plan"), W = svg.clientWidth, H = svg.clientHeight, s = vedere.s;
  const vx0 = vedere.cx - W / 2 / s, vx1 = vedere.cx + W / 2 / s, vy0 = vedere.cy - H / 2 / s, vy1 = vedere.cy + H / 2 / s;
  if (D.bb[0]! < vx0 || D.bb[2]! > vx1 || D.bb[1]! < vy0 || D.bb[3]! > vy1) incadreaza();
}

// ----------------------------------------------------------------------------- actiuni
function salveazaIstoric() {
  istoric.push(JSON.stringify(stare.piese));
  if (istoric.length > 60) istoric.shift();
}
function schimbat(opts: { incadreaza?: boolean; faraSalvare?: boolean } = {}) {
  calculeaza();
  if (tren) refaTren();
  if (selPiesa && !stare.piese.some(p => p.uid === selPiesa)) selPiesa = null;
  if (selCapat) {
    const k = rez.capete.find(c => c.uid === selCapat!.uid && c.j === selCapat!.j);
    if (!k || k.legat) {
      const lib = selPiesa ? rez.deschise.filter(c => c.uid === selPiesa) : [];
      selCapat = lib.length ? { uid: lib[0]!.uid, j: lib[0]!.j } : null;
    }
  }
  if (opts.incadreaza) incadreaza();
  deseneaza();
  actualizeazaUI();
  if (!opts.faraSalvare) programeazaSalvare();
}

function candidati(def: DefPiesa, tip: string): number[] {
  return def.capete.map((c, i): [CapatDef, number] => [c, i]).filter(([c]) => c.tip === opus(tip)).map(([, i]) => i);
}

function adaugaPiesa(id: string) {
  const def = P[id];
  if (!stare.piese.length) {
    salveazaIstoric();
    const p = { uid: uidNou(), id, parinte: null, x: 0, y: 0, rot: 0, panta: 0 };
    stare.piese.push(p);
    schimbat({ incadreaza: true });
    selecteazaUrmatorul(p);
    return;
  }
  if (!selCapat) { toast("Atinge întâi un capăt liber (cerculețele de la capete)."); return; }
  const k = rez.capete.find(c => c.uid === selCapat!.uid && c.j === selCapat!.j);
  if (!k || k.legat) { selCapat = null; actualizeazaUI(); toast("Capătul ales nu mai e liber."); return; }
  const cand = candidati(def!, k.tip);
  if (!cand.length) {
    toast(tr`Capătul e ${numeTip(k.tip)}, iar ${nume(id)} nu are ${numeTip(opus(k.tip))}. Pune întâi un adaptor.`);
    return;
  }
  salveazaIstoric();
  const p = { uid: uidNou(), id, parinte: k.uid, pcon: k.j, con: cand[0]!, panta: 0 };
  stare.piese.push(p);
  const inainte = rez.deschise.length;
  schimbat();
  asiguraVizibil(p.uid);
  anuntaInchidere(inainte, p);
  selecteazaUrmatorul(p);
}
function anuntaInchidere(inainte: number, p: PiesaPusa, prefix = "") {
  if (rez.deschise.length < inainte && !rez.deschise.some(c => c.uid === p.uid) && stare.piese.length > 2) {
    toast(prefix + (rez.deschise.length ? tr("S-a închis o buclă.") : tr("Circuit închis!")));
    return true;
  }
  if (prefix) toast(prefix);
  return false;
}
function capatSel() {
  if (!selCapat) return null;
  const k = rez.capete.find(c => c.uid === selCapat!.uid && c.j === selCapat!.j);
  return k && !k.legat ? k : null;
}

// ---- piese la comanda: puse de mana (dreapta / curba) sau calculate de Inchide
function adaugaLC(seg: SegLC[]) {
  if (!stare.piese.length) {
    const lc = { seg, cap: ["M", "T"] }, m = verificaLC(lc);
    if (m) { toast(m); return false; }
    salveazaIstoric();
    const p = { uid: uidNou(), id: LC, lc, parinte: null, x: 0, y: 0, rot: 0, panta: 0 };
    stare.piese.push(p);
    schimbat({ incadreaza: true });
    selecteazaUrmatorul(p);
    return true;
  }
  const k = capatSel();
  if (!k) { toast("Atinge întâi un capăt liber (cerculețele de la capete)."); return false; }
  const lc = { seg, cap: [opus(k.tip), k.tip] }, m = verificaLC(lc);
  if (m) { toast(m); return false; }
  salveazaIstoric();
  const p = { uid: uidNou(), id: LC, lc, parinte: k.uid, pcon: k.j, con: 0, panta: 0 };
  stare.piese.push(p);
  const inainte = rez.deschise.length;
  schimbat();
  asiguraVizibil(p.uid);
  anuntaInchidere(inainte, p);
  selecteazaUrmatorul(p);
  return true;
}
function modificaLC(uid: string, seg: SegLC[]) {
  const p = stare.piese.find(q => q.uid === uid);
  if (!p || !p.lc) return false;
  const lc = { seg, cap: p.lc.cap }, m = verificaLC(lc);
  if (m) { toast(m); return false; }
  salveazaIstoric();
  p.lc = lc;
  schimbat();
  return true;
}
let capatAnterior: { uid: string; j: number } | null = null;
function inchide() {
  const A = capatSel();
  if (!A) { toast("Atinge întâi un capăt liber, apoi Închide."); return; }
  let alte = rez.deschise.filter(k => k.uid !== A.uid);
  if (!alte.length) { toast("Nu mai e alt capăt liber de care să-l leg."); return; }
  // daca ai atins inainte alt capat liber, le leg exact pe acelea doua; altfel pe cel mai apropiat care merge
  const pref = capatAnterior && alte.find(k => k.uid === capatAnterior!.uid && k.j === capatAnterior!.j);
  let best = null, motiv = "", dmin = Infinity;
  for (const B of pref ? [pref] : alte) {
    const r = conector(A, B), d = Math.hypot(B.x - A.x, B.y - A.y);
    if (r.lc) { if (!best || r.lungime < best.lungime) best = r; }
    else if (d < dmin) { dmin = d; motiv = r.motiv; }
  }
  if (!best) { toast(motiv); return; }
  salveazaIstoric();
  const p = { uid: uidNou(), id: LC, lc: best.lc, parinte: A.uid, pcon: A.j, con: 0, panta: 0 };
  stare.piese.push(p);
  const inainte = rez.deschise.length;
  schimbat();
  asiguraVizibil(p.uid);
  selPiesa = p.uid; selCapat = null; capatAnterior = null;
  const lov = rez.lovite.has(p.uid) ? tr(" Atenție: atinge altă piesă (roșu).") : "";
  if (!anuntaInchidere(inainte, p, tr`Am pus: ${defLC(best.lc).titlu}.` + lov + " ")) toast(tr`Am pus: ${defLC(best.lc).titlu}.` + lov);
  deseneaza(); actualizeazaUI();
}
function stalpMana() {
  const p = piesaSel();
  if (!p) { toast("Stâlpii se pun singuri sub fiecare îmbinare de pe pod. Pentru unul în plus, atinge o piesă de pe pod, apoi Stâlp."); return; }
  const d = rez.dupaPiesa.get(p.uid), def = D(p), z = d!.capete[0]!.z;
  if (p.stalp) { salveazaIstoric(); delete p.stalp; schimbat(); toast("Am scos stâlpul de sub piesă."); return; }
  if (!def.mijloc || d!.capete.length !== 2) { toast("Un stâlp în plus se pune doar sub o dreaptă sau o curbă."); return; }
  if (z < PAS - 0.5) { toast("Piesa e pe masă; stâlpii sunt pentru piesele de pe pod."); return; }
  if (Math.abs(d!.capete[1]!.z - z) > 0.5) { toast("Piesa e înclinată; pune stâlpul sub o piesă dreaptă de pe pod."); return; }
  salveazaIstoric(); p.stalp = true; schimbat();
  toast(tr`Am pus un stâlp de ${Math.round(z)} mm sub mijlocul piesei.`);
}
const poateIntoarce = (p: PiesaPusa) => (p.lc ? p.lc.seg.some(s => s.t === "A") : !!P[p.id]!.oglinda);

function selecteazaUrmatorul(p: PiesaPusa) {
  capatAnterior = null;
  const libere = rez.deschise.filter(c => c.uid === p.uid);
  selPiesa = p.uid;
  selCapat = libere.length ? { uid: p.uid, j: libere[0]!.j } : null;
  if (!selCapat && rez.deschise.length) selCapat = { uid: rez.deschise[0]!.uid, j: rez.deschise[0]!.j };
  deseneaza(); actualizeazaUI();
}

function piesaSel() { return stare.piese.find(p => p.uid === selPiesa); }

function roteste() {
  const p = piesaSel(); if (!p) return;
  salveazaIstoric();
  if (p.parinte == null) {
    p.rot = norm((p.rot || 0) + 45);
  } else {
    const par = stare.piese.find(q => q.uid === p.parinte);
    const tipPar = D(par!).capete[p.pcon!]!.tip;
    const cand = candidati(D(p), tipPar);
    if (cand.length < 2) { istoric.pop(); toast("Piesa asta se poate prinde aici într-un singur fel."); return; }
    const vechi = p.con, nou = cand[(cand.indexOf(vechi!) + 1) % cand.length];
    for (const c of stare.piese) if (c.parinte === p.uid && c.pcon === nou) c.pcon = vechi!;
    p.con = nou!;
  }
  schimbat();
}
function intoarce() {
  const p = piesaSel(); if (!p) return;
  if (!poateIntoarce(p)) { toast("Piesa asta e la fel pe ambele părți."); return; }
  salveazaIstoric();
  if (p.lc) p.lc = { seg: p.lc.seg.map(s => (s.t === "A" ? { ...s, s: -s.s } : { ...s })), cap: p.lc.cap };
  else p.id = P[p.id]!.oglinda!;
  schimbat();
}
function panta() {
  const p = piesaSel(); if (!p || !D(p).panta) return;
  salveazaIstoric();
  p.panta = p.panta === 0 ? 1 : p.panta === 1 ? -1 : 0;
  schimbat();
}
function sterge() {
  const p = piesaSel(); if (!p) return;
  salveazaIstoric();
  // piesele prinse de ea raman pe loc: devin piese libere, cu pozitia si inaltimea de acum
  for (const q of stare.piese) {
    if (q.parinte !== p.uid) continue;
    const r = rez.poz.get(q.uid);
    q.parinte = null; delete q.pcon; delete q.con;
    q.x = r!.x; q.y = r!.y; q.rot = r!.rot; q.z = r!.baza;
  }
  stare.piese = stare.piese.filter(q => q.uid !== p.uid);
  selPiesa = null;
  schimbat();
  if (rez.deschise.length) selCapat = { uid: rez.deschise[rez.deschise.length - 1]!.uid, j: rez.deschise[rez.deschise.length - 1]!.j };
  deseneaza(); actualizeazaUI();
}
function anuleaza() {
  if (!istoric.length) return;
  stare.piese = JSON.parse(istoric.pop()!);
  selPiesa = null; selCapat = null;
  schimbat();
}

// ----------------------------------------------------------------------------- interfata
function actualizeazaUI() {
  const st = $("#stare");
  const n = stare.piese.length;
  const rele = rez.probleme.filter(p => p.rau).length;
  st.className = "chip";
  if (!n) { st.textContent = "Gol"; }
  else if (rele) { st.className = "chip pericol"; st.textContent = rele === 1 ? tr("1 problemă") : tr`${rele} probleme`; }
  else if (!rez.deschise.length) { st.className = "chip ok"; st.textContent = "Circuit închis"; }
  else { st.className = "chip atentie"; st.textContent = rez.deschise.length === 1 ? tr`${1} capăt liber` : tr`${rez.deschise.length} capete libere`; }
  if (document.activeElement !== $("#nume")) $<CampNumeric>("#nume").value = stare.nume;

  const p = piesaSel();
  const t = $("#sel-text");
  if (p) {
    const d = rez.dupaPiesa.get(p.uid);
    t.textContent = nume(idPiesa(p)) + (d && d.zmax - PAS > 0.5 ? tr(" · sus") : "") + (p.stalp ? tr(" · cu stâlp") : "") + (manerPiesa(p) ? tr(" · trage de bulina verde ca s-o îndoi") : selCapat ? tr(" · continuă cu o piesă de jos") : "");
  } else if (selCapat) {
    const k = rez.capete.find(c => c.uid === selCapat!.uid && c.j === selCapat!.j);
    t.textContent = k ? (k.z > 0.5 ? tr`Capăt ${numeTip(k.tip)} la +${Math.round(k.z)} mm: alege o piesă de jos` : tr`Capăt ${numeTip(k.tip)}: alege o piesă de jos`) : "";
  } else t.textContent = n ? "Atinge o piesă sau un capăt liber." : "Alege prima piesă de jos.";
  $<HTMLInputElement>("#a-roteste").disabled = !p;
  $<HTMLInputElement>("#a-intoarce").disabled = !p || !poateIntoarce(p);
  $<HTMLInputElement>("#a-panta").disabled = !p || !D(p).panta;
  const ks = capatSel();
  $("#a-inchide").hidden = !(ks && rez.deschise.some(k => k.uid !== ks.uid));
  $("#a-modifica").hidden = !(p && p.lc && ["dreapta", "curba"].includes(formaLC(p.lc.seg)));
  $("#a-panta").textContent = tr`Pantă: ${!p || !p.panta ? tr("plat") : p.panta > 0 ? tr("urcă 12") : tr("coboară 12")}`;
  $<HTMLInputElement>("#a-sterge").disabled = !p;
  $<HTMLInputElement>("#a-anuleaza").disabled = !istoric.length;
  $("#indiciu").textContent = n ? "Trage dintr-un capăt liber ca să desenezi o piesă (până la alt capăt, le unește) · trage pe fundal ca să muți planul" : "";
  randeazaLista();
}

function htmlLista() {
  const n = numara();
  const ordine = CATALOG.piese.map(p => p.id).concat(["opritor_bloc"]).concat(Object.keys(n).filter(k => k.startsWith("lc_"))).concat(CATALOG.stalpi.map(s => s.id));
  let h = "";
  let total = 0;
  for (const id of ordine) if (n[id]) { h += `<div class="rand"><span>${nume(id)}</span><span class="n">${n[id]}</span></div>`; total += n[id]; }
  if (!h) h = `<p class="mic">Încă nu ai pus nicio piesă.</p>`;
  let av = "";
  for (const pr of rez.probleme) av += `<div class="avert ${pr.rau ? "rau" : ""}">${pr.text}</div>`;
  return `<h2>Lista de piese</h2><div>${h}</div>` +
    (total ? `<p class="mic">${tr`${total} bucăți de frezat${rez.stalpi.length ? tr(", cu stâlpii de sub pod") : ""}.`}</p>` : "") +
    (av ? `<div class="avertismente">${av}</div>` : "") +
    (rez.subPod && rez.subPod.length || setariCNC.inaltime_tren ? `<label class="tren">Cel mai înalt tren, de la șină în sus <span><input type="number" inputmode="decimal" min="20" max="200" step="1" data-tren value="${setariCNC.inaltime_tren || ""}" placeholder="—"> mm</span></label>` : "") +
    `<p class="mic">Cerculețele pline sunt capete tată, cele goale sunt mamă. Piesele de pod sunt mai închise la culoare; pătratele de sub ele sunt stâlpii. Stâlpii se pun singuri sub fiecare îmbinare de pe pod; din grupa Pod poți pune unul și sub mijlocul unei piese.</p>`;
}
function randeazaLista() {
  const h = htmlLista();
  $("#lista").innerHTML = h;
  if (!$("#foaie-lista").hidden) $("#lista-mobil").innerHTML = h;
}

const GRUPE_LISTA = CATALOG.grupe.slice();
GRUPE_LISTA.splice(GRUPE_LISTA.indexOf("Curbe") + 1, 0, "La comanda");
GRUPE["La comanda"] = "La comandă";
let grupaActiva = GRUPE_LISTA[0];

const ICON: Record<string, string> = {
  "lc-L": `<path d="M4 9h84M4 5v8M88 5v8" stroke="var(--text-2)" stroke-width="1.6" fill="none"/><rect x="4" y="20" width="84" height="18" rx="1" fill="var(--fag)" stroke="var(--fag-margine)" stroke-width="1.5"/><path d="M4 25h84M4 33h84" stroke="var(--sant)" stroke-width="1.6"/>`,
  "lc-A": `<path d="M8 44 A64 64 0 0 1 84 10" fill="none" stroke="var(--fag-margine)" stroke-width="19"/><path d="M8 44 A64 64 0 0 1 84 10" fill="none" stroke="var(--fag)" stroke-width="16"/><path d="M8 44 A64 64 0 0 1 84 10" fill="none" stroke="var(--sant)" stroke-width="11"/><path d="M8 44 A64 64 0 0 1 84 10" fill="none" stroke="var(--fag)" stroke-width="8"/>`,
  "inchide": `<rect x="2" y="6" width="30" height="16" fill="var(--fag)" stroke="var(--fag-margine)" stroke-width="1.5"/><rect x="60" y="24" width="30" height="16" fill="var(--fag)" stroke="var(--fag-margine)" stroke-width="1.5"/><path d="M32 14 C46 14 46 32 60 32" fill="none" stroke="var(--semnal)" stroke-width="16" opacity=".3"/><path d="M32 14 C46 14 46 32 60 32" fill="none" stroke="var(--semnal)" stroke-width="2" stroke-dasharray="4 3"/>`,
  "stalp": `<rect x="6" y="6" width="80" height="10" fill="var(--pod)" stroke="var(--fag-margine)" stroke-width="1.5"/><rect x="33" y="16" width="26" height="28" fill="var(--stalp)" stroke="var(--stalp-margine)" stroke-width="1.5"/><path d="M33 23h26M33 30h26M33 37h26" stroke="var(--stalp-margine)" stroke-width="1"/>`,
};
const butonActiune = (a: string, text: string) => `<button type="button" class="piesa-btn" data-actiune="${a}" title="${text}"><svg viewBox="0 0 92 46" aria-hidden="true">${ICON[a]}</svg><span>${text}</span></button>`;

function randeazaPaleta() {
  $("#grupe").innerHTML = GRUPE_LISTA.map(g => `<button type="button" data-grupa="${g}" aria-pressed="${g === grupaActiva}">${GRUPE[g] || g}</button>`).join("");
  if (grupaActiva === "La comanda") {
    $("#paleta").innerHTML = butonActiune("inchide", "Închide circuitul") + butonActiune("lc-L", "Dreaptă la comandă") + butonActiune("lc-A", "Curbă la comandă");
    return;
  }
  const piese = CATALOG.piese.filter(p => p.grupa === grupaActiva);
  $("#paleta").innerHTML = piese.map(p => {
    const [w, h] = p.dim, m = 4;
    const sg = p.santuri.map(s => `<polyline points="${puncte(s)}" fill="none" stroke="var(--sant)" stroke-width="6" stroke-linecap="round"/>`).join("");
    return `<button type="button" class="piesa-btn" data-piesa="${p.id}" title="${nume(p.id)}">
      <svg viewBox="${-m} ${-m} ${w! + 2 * m} ${h! + 2 * m}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g transform="translate(0 ${h}) scale(1 -1)">
      <polygon points="${puncte(p.contur)}" fill="${p.rampa ? "var(--pod)" : "var(--fag)"}" stroke="var(--fag-margine)" stroke-width="1.5"/>${sg}</g></svg>
      <span>${nume(p.id)}</span></button>`;
  }).join("") + (grupaActiva === "Pod" ? butonActiune("stalp", "Stâlp sub piesă") : "");
}

// ---- editorul pentru dreapta / curba la comanda
let editor: { mod: "nou" | "modifica"; uid?: string; tip: string; sens: number } | null = null;   // { mod: "nou" | "modifica", uid, tip: "L" | "A", sens }
const numar = (sel: string) => parseFloat(String($<HTMLInputElement>(sel).value).replace(",", "."));
function deschideEditor(tip: string | null, uid?: string | null) {
  if (uid) {
    const p = stare.piese.find(q => q.uid === uid);
    if (!p || !p.lc) return;
    const f = formaLC(p.lc.seg);
    if (f !== "dreapta" && f !== "curba") { toast("Piesa asta a fost calculată de Închide. Ca s-o refaci, șterge-o și apasă din nou Închide."); return; }
    const s0 = p.lc.seg[0];
    editor = { mod: "modifica", uid, tip: s0!.t, sens: s0!.t === "A" ? s0!.s : 1 };
    if (s0!.t === "L") $<CampNumeric>("#lc-l").value = +s0!.l.toFixed(1);
    else { $<CampNumeric>("#lc-r").value = +s0!.r.toFixed(1); $<CampNumeric>("#lc-a").value = +s0!.a.toFixed(2); }
  } else {
    if (stare.piese.length && !capatSel()) { toast("Atinge întâi un capăt liber, apoi alege piesa la comandă."); return; }
    editor = { mod: "nou", tip: tip!, sens: editor ? editor.sens : 1 };
  }
  actualizeazaEditor();
  arata("#foaie-lc");
  requestAnimationFrame(incadreazaFantoma);
}
function segEditor(): SegLC[] | null {
  if (editor!.tip === "L") { const l = numar("#lc-l"); return l > 0 ? [{ t: "L", l }] : null; }
  const r = numar("#lc-r"), a = numar("#lc-a");
  return r > 0 && a > 0 ? [{ t: "A", r, a, s: editor!.sens }] : null;
}
function capeteEditor() {
  if (editor!.mod === "modifica") { const p = stare.piese.find(q => q.uid === editor!.uid); return p ? p.lc!.cap : ["M", "T"]; }
  const k = capatSel();
  return k ? [opus(k.tip), k.tip] : ["M", "T"];
}
function actualizeazaEditor() {
  $("#lc-dreapta").hidden = editor!.tip !== "L";
  $("#lc-curba").hidden = editor!.tip !== "A";
  document.querySelectorAll<HTMLElement>("[data-lc-tip]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lcTip === editor!.tip)));
  document.querySelectorAll<HTMLElement>("[data-lc-sens]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.lcSens! === editor!.sens)));
  $("#t-lc").textContent = editor!.mod === "nou" ? "Piesă la comandă" : "Modifică piesa";
  $("#lc-ok").textContent = editor!.mod === "nou" ? "Pune piesa" : "Salvează";
  const seg = segEditor();
  const lc = seg ? { seg, cap: capeteEditor() } : null;
  const motiv = lc ? verificaLC(lc) : "Scrie un număr.";
  const info = $("#lc-info");
  info.className = "mic" + (motiv ? " eroare" : "");
  info.textContent = motiv || (editor!.tip === "L"
    ? "Lungimea pe axă, fără ciuperca de la capăt. Dreptele standard au 54, 108, 144 și 216 mm."
    : tr`Rază pe axa căii. Curba mare standard: R202 · 45°; curba mică: R110 · 45°. Lungime pe axă: ${fmt(lungimeSeg(seg!))} mm.`);
  $<HTMLInputElement>("#lc-ok").disabled = !!motiv;
  // piesa apare direct pe plan, la locul ei
  let baza = { x: 0, y: 0, u: 0, z: 0 }, exclus = null;
  if (editor!.mod === "modifica") {
    const p = stare.piese.find(q => q.uid === editor!.uid), r = p && rez.poz.get(p.uid);
    if (r) { baza = { x: r.x, y: r.y, u: r.rot, z: r.baza }; exclus = p.uid; }
  } else { const k = capatSel(); if (k) { baza = { x: k.x, y: k.y, u: k.u, z: k.z }; exclus = k.uid; } }
  fantoma = lc ? { lc, baza, ok: !motiv, text: "", editor: true } : null;
  if (lc && !motiv && stare.piese.length) {
    const v = verdictPeplan(lc, baza, exclus);
    if (v) info.textContent = v + " " + info.textContent;
  }
  deseneaza();
}
function inchideEditor() {
  $("#foaie-lc").hidden = true;
  if (fantoma && fantoma.editor) { fantoma = null; deseneaza(); }
}
function confirmaEditor() {
  const seg = segEditor();
  if (!seg) return;
  const f = fantoma;
  fantoma = null;
  const ok = editor!.mod === "nou" ? adaugaLC(seg) : modificaLC(editor!.uid!, seg);
  if (ok) inchideEditor(); else { fantoma = f; deseneaza(); }
}

let toastT: ReturnType<typeof setTimeout> | null = null;
function toast(t: string) {
  const el = $("#toast"); el.textContent = t; el.classList.add("vizibil");
  clearTimeout(toastT!); toastT = setTimeout(() => el.classList.remove("vizibil"), Math.max(3200, t.length * 55));
}

// ----------------------------------------------------------------------------- desen cu mouse-ul / degetul
// Tragi dintr-un capat liber: apare piesa propusa ("fantoma"). Daca o lasi pe alt capat liber, piesa le
// leaga exact; altfel e o dreapta sau o curba pana unde ai lasat-o. Bulina de pe o piesa la comanda
// selectata ii schimba forma.
/** Piesa „fantomă” arătată înainte de a fi pusă: unde ar sta, dacă se poate și de ce nu. */
type Fantoma = { lc: LucrareLC | null; baza: Baza; ok: boolean; text: string; tinta?: CapatPus; px?: number; py?: number;
  editor?: boolean };
let fantoma: Fantoma | null = null;     // { lc, baza: {x, y, u, z}, ok, text, tinta, px, py, editor }
const PRINDERE_PX = 34;

function laLocal(b: Baza, x: number, y: number): [number, number] { const h = rad(b.u), dx = x - b.x, dy = y - b.y; return [dx * Math.cos(h) + dy * Math.sin(h), -dx * Math.sin(h) + dy * Math.cos(h)]; }
function dinLocal(b: Baza, X: number, Y: number): [number, number] { const h = rad(b.u); return [b.x + X * Math.cos(h) - Y * Math.sin(h), b.y + X * Math.sin(h) + Y * Math.cos(h)]; }
function eticheta(seg: readonly SegLC[]) {
  const arce = seg.filter(s => s.t === "A");
  if (!arce.length) return fmt(lungimeSeg(seg)) + " mm";
  return arce.map(s => "R" + Math.round(s.r) + " · " + fmt(s.a) + "°").join(" + ") + " · " + Math.round(lungimeSeg(seg)) + " mm";
}
const rotunjeste = (seg: readonly SegLC[]): SegLC[] => seg.map(s => (s.t === "L" ? { t: "L", l: Math.round(s.l * 2) / 2 } : { t: "A", r: Math.round(s.r), a: Math.max(0.5, Math.round(s.a * 2) / 2), s: s.s }));

function arcPanaLa(X: number, Y: number): SegLC[] | null {
  // din capat (directia 0) pana in punctul (X, Y): dreapta daca e aproape in linie, altfel un arc tangent
  if (Math.hypot(X, Y) < 10) return null;
  if (X > 0 && Math.abs(Y) < 3) return [{ t: "L", l: Math.round(X * 2) / 2 }];
  const s = arcIntre([0, 0], [1, 0], [X, Y]);
  if (!s.length || (s[0]!.t === "A" && s[0]!.a > 180)) return null;
  return rotunjeste(s);
}
function arcCuMijlocul(X: number, Y: number): SegLC[] | null {
  // piesa libera: bulina e mijlocul piesei, deci arcul pana la bulina e jumatate din piesa
  if (X > 0 && Math.abs(Y) < 1.5) return [{ t: "L", l: Math.round(2 * X * 2) / 2 }];
  const s = arcIntre([0, 0], [1, 0], [X, Y]);
  if (!s.length) return null;
  if (s[0]!.t === "L") return [{ t: "L", l: Math.round(2 * s[0]!.l * 2) / 2 }];
  if (s[0]!.a > 90) return null;
  return rotunjeste([{ ...s[0], a: 2 * (s[0] as Extract<SegLC, { t: "A" }>).a } as SegLC]);
}
function biarcCuD1(E: readonly number[], phi: number, d1: number) {
  // doua arce tangente de la (0,0) directia 0 la E cu directia phi; d1 alege punctul de imbinare J
  const t1 = [Math.cos(phi), Math.sin(phi)];
  const vv = E[0]! * E[0]! + E[1]! * E[1]!, vt1 = E[0]! * t1[0]! + E[1]! * t1[1]!, tt = t1[0];
  const num = vv - 2 * d1 * E[0]!, den = 2 * (vt1 + d1 * (1 - tt!));
  if (Math.abs(den) < 1e-9) return null;
  const d2 = num / den;
  if (!(d2 > 0)) return null;
  const Q0 = [d1, 0], Q1 = [E[0]! - d2 * t1[0]!, E[1]! - d2 * t1[1]!];
  const tm = [Q1[0]! - Q0[0]!, Q1[1]! - Q0[1]!], lm = Math.hypot(tm[0]!, tm[1]!);
  if (lm < 1e-9) return null;
  const J = [(d2 * Q0[0]! + d1 * Q1[0]!) / (d1 + d2), (d2 * Q0[1]! + d1 * Q1[1]!) / (d1 + d2)];
  const seg = lipeste([...arcIntre([0, 0], [1, 0], J), ...arcIntre(J, [tm[0]! / lm, tm[1]! / lm], E)]);
  if (!seg.length || seg.some(x => x.t === "A" && x.a > 180)) return null;
  return { J, seg };
}
function biarcPrin(E: readonly number[], phi: number, M: readonly number[]) {
  // forma cu capetele neschimbate al carei punct de imbinare e cel mai aproape de M
  const L = Math.hypot(E[0]!, E[1]!) || 1;
  let best = null as (NonNullable<ReturnType<typeof biarcCuD1>> & { d: number; d1: number }) | null;
  const incearca = (d1: number) => { const r = biarcCuD1(E, phi, d1); if (!r) return; const d = Math.hypot(r.J[0]! - M[0]!, r.J[1]! - M[1]!); if (!best || d < best.d) best = { ...r, d, d1 }; };
  for (let k = 0; k <= 160; k++) incearca(L * Math.pow(10, -2.2 + 3 * k / 160));
  if (best) { const d0 = best.d1; for (let k = -20; k <= 20; k++) incearca(d0 * Math.pow(10, k * 0.0009)); }
  return best;
}

function capatLume(uid: string, j: number) { return rez.capete.find(c => c.uid === uid && c.j === j); }
function actualizeazaTragere(px: number, py: number, cap: { uid: string; j: number }) {
  const A = capatLume(cap.uid, cap.j);
  if (!A || A.legat) { fantoma = null; deseneaza(); return; }
  const [wx, wy] = laLume(px, py);
  let tinta = null, dmin = PRINDERE_PX / vedere.s;
  for (const B of rez.deschise) {
    if (B.uid === A.uid || Math.abs(B.z - A.z) > 1) continue;
    const d = Math.hypot(B.x - wx, B.y - wy);
    if (d < dmin) { dmin = d; tinta = B; }
  }
  const baza = { x: A.x, y: A.y, u: A.u, z: A.z };
  if (tinta) {
    const r = conector(A, tinta);
    fantoma = r.lc ? { lc: r.lc, baza, ok: true, tinta, text: tr`Leagă capetele · ${eticheta(r.lc.seg)}` } : { lc: null, baza, ok: false, tinta, text: r.motiv };
  } else {
    const [X, Y] = laLocal(baza, wx, wy);
    const seg = arcPanaLa(X, Y);
    if (!seg) fantoma = { lc: null, baza, ok: false, text: "Trage înainte, în direcția căii." };
    else { const lc = { seg, cap: [opus(A.tip), A.tip] }, m = verificaLC(lc); fantoma = { lc, baza, ok: !m, text: m || eticheta(seg) }; }
  }
  fantoma.px = px; fantoma.py = py;
  deseneaza();
}
function finalizeazaTragere(cap: { uid: string; j: number }) {
  const f = fantoma;
  fantoma = null;
  if (!f || !f.lc || !f.ok) { deseneaza(); if (f && f.text) toast(f.text); return; }
  const A = capatLume(cap.uid, cap.j);
  if (!A || A.legat) { deseneaza(); return; }
  salveazaIstoric();
  const p = { uid: uidNou(), id: LC, lc: f.lc, parinte: A.uid, pcon: A.j, con: 0, panta: 0 };
  stare.piese.push(p);
  const inainte = rez.deschise.length;
  schimbat();
  selPiesa = p.uid; capatAnterior = null;
  const k = capatLume(p.uid, 1);
  selCapat = k && !k.legat ? { uid: p.uid, j: 1 } : null;
  anuntaInchidere(inainte, p, tr`Am pus: ${defLC(f.lc).titlu}. Trage de bulina verde ca s-o îndoi.` + " ");
  deseneaza(); actualizeazaUI();
}

function manerPiesa(p: PiesaPusa) {
  // bulina de pe piesa la comanda selectata: "imbinare" (capetele raman pe loc) sau "liber" (capatul se misca)
  if (!p || !p.lc || (p.parinte != null && p.con !== 0)) return null;
  const def = D(p), r = rez.poz.get(p.uid), d = rez.dupaPiesa.get(p.uid);
  if (!r || !d) return null;
  const ocupat = !!d.capete[1]!.legat || stare.piese.some(q => q.parinte === p.uid && q.pcon === 1);
  if (ocupat && p.lc.seg.every(s => s.t === "L")) return null;    // o dreapta intre doua capete fixe nu se poate indoi
  let local = [def.mijloc!.x, def.mijloc!.y];
  if (ocupat && p.lc.seg.length === 2) { const a = axaLC([p.lc.seg[0]!]); local = a[a.length - 1]!; }
  const [a, b] = rotP(local[0]!, local[1]!, r.rot);
  return { mod: ocupat ? "imbinare" : "liber", x: r.x + a!, y: r.y + b! };
}
function incepeModelare(p: PiesaPusa) {
  const m = manerPiesa(p);
  return m ? { uid: p.uid, mod: m.mod, original: JSON.stringify(p.lc), istoric: JSON.stringify(stare.piese), ok: true, text: eticheta(p.lc!.seg), mutat: false } : null;
}
function actualizeazaModelare(px: number, py: number, mod: NonNullable<ReturnType<typeof incepeModelare>>) {
  const p = stare.piese.find(q => q.uid === mod.uid);
  if (!p) return;
  const r = rez.poz.get(p.uid);
  const [X, Y] = laLocal({ x: r!.x, y: r!.y, u: r!.rot }, ...laLume(px, py));
  const orig = JSON.parse(mod.original);
  let seg = null;
  if (mod.mod === "liber") seg = arcCuMijlocul(X, Y);
  else {
    const c = defLC(orig).capete[1];
    const b = biarcPrin([c!.x, c!.y], rad(c!.u), [X, Y]);
    seg = b && b.seg;
  }
  mod.mutat = true;
  if (!seg) { mod.ok = false; mod.text = "Așa nu se poate; trage bulina mai aproape de cale."; return; }
  const lc = { seg, cap: orig.cap }, m = verificaLC(lc);
  p.lc = lc; mod.ok = !m; mod.text = m || eticheta(seg);
  calculeaza(); deseneaza();
}
function finalizeazaModelare(mod: NonNullable<ReturnType<typeof incepeModelare>>, anulat: boolean) {
  const p = stare.piese.find(q => q.uid === mod.uid);
  if (!p || !mod.mutat) { deseneaza(); return; }
  if (anulat || !mod.ok) {
    p.lc = JSON.parse(mod.original);
    calculeaza(); deseneaza(); actualizeazaUI();
    if (!anulat) toast(mod.text);
    return;
  }
  istoric.push(mod.istoric);
  if (istoric.length > 60) istoric.shift();
  schimbat();
}
function anuleazaGest(g = gest) {
  if (!g) return;
  if (g.tip === "trage") { fantoma = null; deseneaza(); }
  if (g.tip === "maner" && g.model) finalizeazaModelare(g.model, true);
}

// ---- piesa propusa de editor, aratata direct pe plan
function verdictPeplan(lc: LucrareLC, baza: Baza, exclus?: string | null) {
  // se imbina capatul de la capat cu ceva? daca nu, cat de departe e cel mai apropiat capat liber
  const def = defLC(lc), c = def.capete[1];
  const [x, y] = dinLocal(baza, c!.x, c!.y), u = norm(c!.u + baza.u);
  let cel = null;
  for (const k of rez.capete) {
    if (k.uid === exclus || (k.legat && k.legat.uid !== exclus)) continue;
    const d = Math.hypot(k.x - x, k.y - y), du = difUnghi(k.u, u + 180);
    if (d < 2.5 && du < 4) return "Se îmbină cu capătul de lângă.";
    if (du < 30 && d < 400 && (!cel || d < cel.d)) cel = { d, du };
  }
  return cel ? tr`Până la capătul liber de lângă: ${fmt(cel.d)} mm și ${fmt(cel.du)}°.` : "";
}
function conturFantoma(f: Fantoma) {
  return defLC(f.lc!).contur.map(([x, y]) => dinLocal(f.baza, x!, y!));
}
function incadreazaFantoma() {
  if (!fantoma || !fantoma.lc) return;
  const b = bbox(conturFantoma(fantoma).concat([[fantoma.baza.x, fantoma.baza.y]]));
  const svg = $("#plan"), sv = svg.getBoundingClientRect(), W = svg.clientWidth, H = svg.clientHeight;
  const pr = $("#foaie-lc .foaie").getBoundingClientRect();
  const z = { x0: 0, y0: 0, x1: W, y1: H };
  if (pr.width > W * 0.8) z.y1 = Math.max(H * 0.3, pr.top - sv.top);      // panou jos (telefon)
  else z.x0 = Math.min(W * 0.6, pr.right - sv.left);                         // panou in stanga
  // fereastra de cel putin 32 x 22 cm in jurul piesei, ca sa vezi si piesele vecine
  const m = 30, bw = Math.max(320, b[2]! - b[0]!), bh = Math.max(220, b[3]! - b[1]!);
  vedere.s = Math.min(3, Math.max(0.15, Math.min((z.x1 - z.x0 - 2 * m) / bw, (z.y1 - z.y0 - 2 * m) / bh)));
  const cxE = (z.x0 + z.x1) / 2, cyE = (z.y0 + z.y1) / 2;
  vedere.cx = (b[0]! + b[2]!) / 2 - (cxE - W / 2) / vedere.s;
  vedere.cy = (b[1]! + b[3]!) / 2 + (cyE - H / 2) / vedere.s;
  deseneaza();
}

// ----------------------------------------------------------------------------- atingeri, mutare, zoom
const ptr = new Map();
/** Gestul în curs pe plan (tragere, ciupire, mutarea unei piese). */
let gest: { tip: string; start?: number[]; s?: number; model?: NonNullable<ReturnType<typeof incepeModelare>>; m?: number[]; cx?: number; cy?: number; d?: number; d0?: number; s0?: number; cap?: { uid: string; j: number } } | null = null;
function pe(svgEv: { clientX: number; clientY: number }) { const r = $("#plan").getBoundingClientRect(); return [svgEv.clientX - r.left, svgEv.clientY - r.top]; }
function laLume(px: number, py: number): [number, number] {
  const svg = $("#plan"), W = svg.clientWidth, H = svg.clientHeight;
  return [vedere.cx + (px - W / 2) / vedere.s, vedere.cy - (py - H / 2) / vedere.s];
}
function zoomLa(px: number, py: number, f: number) {
  const [wx, wy] = laLume(px, py);
  vedere.s = Math.min(6, Math.max(0.08, vedere.s * f));
  const svg = $("#plan"), W = svg.clientWidth, H = svg.clientHeight;
  vedere.cx = wx - (px - W / 2) / vedere.s;
  vedere.cy = wy + (py - H / 2) / vedere.s;
  deseneaza();
}
function initGesturi() {
  const svg = $("#plan");
  svg.addEventListener("pointerdown", e => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    svg.setPointerCapture(e.pointerId);
    ptr.set(e.pointerId, pe(e));
    if (ptr.size === 1) {
      const baza = { start: pe(e), t: performance.now(), cx: vedere.cx, cy: vedere.cy };
      const man = el && el.closest<HTMLElement>("[data-maner]"), cap = el && el.closest<HTMLElement>("[data-capat]");
      const model = man && piesaSel() ? incepeModelare(piesaSel()!) : null;
      if ((model || cap) && !$("#foaie-lc").hidden) inchideEditor();
      if (model) gest = { tip: "maner", ...baza, model };
      else if (cap) { const [uid, j] = cap.getAttribute("data-capat")!.split(":"); gest = { tip: "capat", ...baza, cap: { uid: uid!, j: +j! } }; }
      else gest = { tip: "tap", ...baza };
    } else if (ptr.size === 2) {
      anuleazaGest();
      const [a, b] = [...ptr.values()];
      gest = { tip: "ciupit", d0: Math.hypot(a[0] - b[0], a[1] - b[1]), s0: vedere.s, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], cx: vedere.cx, cy: vedere.cy };
    }
  });
  svg.addEventListener("pointermove", e => {
    if (!ptr.has(e.pointerId) || !gest) return;
    ptr.set(e.pointerId, pe(e));
    if (gest.tip === "ciupit" && ptr.size >= 2) {
      const [a, b] = [...ptr.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      vedere.s = Math.min(6, Math.max(0.08, gest.s0! * d / gest.d0!));
      const W = svg.clientWidth, H = svg.clientHeight;
      const wx = gest.cx! + (gest.m![0]! - W / 2) / gest.s0!, wy = gest.cy! - (gest.m![1]! - H / 2) / gest.s0!;
      vedere.cx = wx - (m[0]! - W / 2) / vedere.s; vedere.cy = wy + (m[1]! - H / 2) / vedere.s;
      deseneaza();
    } else if (gest.tip === "capat" || gest.tip === "trage") {
      const p = pe(e);
      if (gest.tip === "capat" && Math.hypot(p[0]! - gest.start![0]!, p[1]! - gest.start![1]!) > 7) gest.tip = "trage";
      if (gest.tip === "trage") actualizeazaTragere(p[0]!, p[1]!, gest.cap!);
    } else if (gest.tip === "maner") {
      const p = pe(e);
      if (gest.model!.mutat || Math.hypot(p[0]! - gest.start![0]!, p[1]! - gest.start![1]!) > 3) actualizeazaModelare(p[0]!, p[1]!, gest.model!);
    } else if (gest.tip === "tap" || gest.tip === "mutare") {
      const p = pe(e), dx = p[0]! - gest.start![0]!, dy = p[1]! - gest.start![1]!;
      if (gest.tip === "tap" && Math.hypot(dx, dy) > 7) gest.tip = "mutare";
      if (gest.tip === "mutare") { vedere.cx = gest.cx! - dx / vedere.s; vedere.cy = gest.cy! + dy / vedere.s; deseneaza(); }
    }
  });
  const sfarsit = (e: PointerEvent) => {
    if (!ptr.has(e.pointerId)) return;
    ptr.delete(e.pointerId);
    if (gest && ptr.size === 0) {
      const g = gest;
      gest = null;      // gestul s-a terminat inainte de redesenare (altfel bulina nu apare)
      if (e.type !== "pointerup") anuleazaGest(g);
      else if (g.tip === "tap" || g.tip === "capat") atingere(e.clientX, e.clientY);
      else if (g.tip === "trage") finalizeazaTragere(g.cap!);
      else if (g.tip === "maner") finalizeazaModelare(g.model!, false);
    }
    if (ptr.size === 0) gest = null;
    else if (gest && gest.tip === "ciupit") gest = { tip: "mutare", start: [...ptr.values()][0], cx: vedere.cx, cy: vedere.cy };
  };
  svg.addEventListener("pointerup", sfarsit);
  svg.addEventListener("pointercancel", sfarsit);
  svg.addEventListener("wheel", e => { e.preventDefault(); const [px, py] = pe(e); zoomLa(px!, py!, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
}
function atingere(cx: number, cy: number) {
  if (tren && atingereTren(cx, cy)) return;
  const el = document.elementFromPoint(cx, cy);
  const cap = el && el.closest<HTMLElement>("[data-capat]");
  const pc = el && el.closest<HTMLElement>("[data-uid]");
  if (cap) {
    const [uid, j] = cap.getAttribute("data-capat")!.split(":");
    if (selCapat && !(selCapat.uid === uid && selCapat.j === +j!)) capatAnterior = selCapat;
    selCapat = { uid: uid!, j: +j! }; selPiesa = null;
  } else if (pc) {
    selPiesa = pc.getAttribute("data-uid"); selCapat = null; capatAnterior = null;
  } else { selPiesa = null; selCapat = null; capatAnterior = null; }
  if (!$("#foaie-lc").hidden && editor && editor.mod === "nou" && capatSel()) actualizeazaEditor();
  deseneaza(); actualizeazaUI();
}

// ----------------------------------------------------------------------------- exemple
function construieste(pasi: readonly string[]) {
  // pasi: [id, ...] fiecare se prinde de ultimul capat liber al piesei anterioare
  stare.piese = [];
  calculeaza();
  let ultima: PiesaPusa | null = null;
  for (const id of pasi) {
    if (!ultima) {
      ultima = { uid: uidNou(), id, parinte: null, x: 0, y: 0, rot: 0, panta: 0 };
      stare.piese.push(ultima); calculeaza(); continue;
    }
    const libere = rez.deschise.filter(c => c.uid === ultima!.uid);
    const k = libere[libere.length - 1];
    const cand = candidati(P[id]!, k!.tip);
    const p = { uid: uidNou(), id, parinte: k!.uid, pcon: k!.j, con: cand[0]!, panta: 0 };
    stare.piese.push(p); calculeaza(); ultima = p;
  }
}
function exempluOval() {
  const c = "curba_mare_stanga";
  construieste(["dreapta_216", "dreapta_144", c, c, c, c, "dreapta_216", "dreapta_144", c, c, c, c]);
  stare.nume = tr("Ovalul (exemplu)"); stare.docId = null; stare.exemplu = true;
}
function exempluPod() {
  construieste(["dreapta_144", "rampa_urcare", "dreapta_216", "dreapta_216", "rampa_coborare", "dreapta_144"]);
  // o linie jos, pe sub pod, perpendiculara pe mijlocul primei drepte de sus
  calculeaza();
  const sus = stare.piese[2], r = rez.poz.get(sus!.uid);
  const def = P[sus!.id], mx = (def!.capete[0]!.x + def!.capete[1]!.x) / 2, my = def!.capete[0]!.y;
  const [ox, oy] = rotP(mx, my, r!.rot);
  const cx = r!.x + ox!, cy = r!.y + oy!;
  const d = P.dreapta_216;
  const [ax, ay] = rotP((d!.capete[0]!.x + d!.capete[1]!.x) / 2, d!.capete[0]!.y, 90);
  stare.piese.push({ uid: uidNou(), id: "dreapta_216", parinte: null, x: cx - ax!, y: cy - ay!, rot: 90, panta: 0 });
  stare.nume = tr("Pod peste linie (exemplu)"); stare.docId = null; stare.exemplu = true;
}

// ----------------------------------------------------------------------------- salvare (db sau acest dispozitiv)
let db: ClaudeDb | null = null, listaCircuite: ({ id: string } & Record<string, unknown>)[] = [], cronSalvare: ReturnType<typeof setTimeout> | null = null,
  salvareInCurs: Promise<unknown> = Promise.resolve();
const CHEIE_LOCALA = "trenulet.circuite.v1";
function citesteLocal() { try { return JSON.parse(localStorage.getItem(CHEIE_LOCALA) || "{}"); } catch (e) { return {}; } }
function scrieLocal(o: unknown) { try { localStorage.setItem(CHEIE_LOCALA, JSON.stringify(o)); } catch (e) { /* fara stocare */ } }

function corpCircuit() {
  return { nume: stare.nume || tr("Circuit fără nume"), piese: stare.piese.map(p => ({ ...p })),
           actualizat: new Date().toISOString(), nrPiese: stare.piese.length, versiune: 1 };
}
function programeazaSalvare() {
  // in cvs2 (ADR 0164), salvarea amanata o tine gazda: stie ca e ceva nesalvat si, la inchiderea ferestrei, o porneste pe loc
  if (window.cvs2) { window.cvs2.amana("circuit", salveaza, 1200); return; }
  clearTimeout(cronSalvare!);
  cronSalvare = setTimeout(salveaza, 1200);
}
async function salveaza() {
  if (!stare.piese.length && !stare.docId) return;
  // sufixul exemplului, în limba paginii (ADR 0165): pleacă la prima schimbare
  if (stare.exemplu) { stare.exemplu = false; const x = tr(" (exemplu)"); if (stare.nume.endsWith(x)) stare.nume = stare.nume.slice(0, -x.length); }
  const corp = corpCircuit();
  salvareInCurs = salvareInCurs.then(async () => {
    try {
      if (db) {
        if (!stare.docId) stare.docId = db.collection("circuite").doc().id;
        await db.doc("circuite/" + stare.docId).set(corp);
      } else {
        if (!stare.docId) stare.docId = "l" + Date.now().toString(36);
        const o = citesteLocal(); o[stare.docId] = corp; scrieLocal(o); listaCircuite = listaDinLocal(); randeazaCircuite();
      }
    } catch (e) {
      toast(e && (e as { code?: string }).code === "quota_exceeded" ? "Nu mai e loc pentru circuite noi. Șterge unul vechi." : "Nu am putut salva circuitul acum.");
    }
  });
}
function listaDinLocal() {
  const o = citesteLocal();
  return Object.entries(o).map(([id, c]) => ({ id, ...(c as { actualizat?: string }) })).sort((a, b) => (b.actualizat || "").localeCompare(a.actualizat || ""));
}
function deschide(c: { id?: string; nume?: string; piese?: unknown } & Record<string, unknown>) {
  const cunoscuta = (p: PiesaPusa) => p && (p.lc ? validLC(p.lc) : !!P[p.id]);
  const bune = ((Array.isArray(c.piese) ? c.piese : []) as PiesaPusa[]).filter(p => cunoscuta(p) && (p.parinte != null || (Number.isFinite(p.x) && Number.isFinite(p.y))));
  const dupaUid = new Map(bune.map((p): [string, PiesaPusa] => [p.uid, p]));
  const legat = (p: PiesaPusa): boolean => { const par = dupaUid.get(p.parinte!);
    return !!par && par !== p && !!D(par).capete[p.pcon!] && !!D(p).capete[p.con!]; };
  const extra = (p: PiesaPusa) => ({ ...(p.lc ? { id: LC, lc: { seg: p.lc.seg.map(s => ({ ...s })), cap: p.lc.cap.slice() } } : {}), ...(p.stalp ? { stalp: true } : {}) });
  stare = { docId: c.id as string | null, nume: String(c.nume || ""), exemplu: false,
            piese: bune.map(p => legat(p) ? { ...p, panta: +p.panta! || 0, ...extra(p) }
              : { uid: p.uid, id: p.id, parinte: null, x: +p.x! || 0, y: +p.y! || 0, rot: +p.rot! || 0, z: +p.z! || 0, panta: +p.panta! || 0, ...extra(p) }) };
  $<CampNumeric>("#nume").value = stare.nume;
  istoric = []; selPiesa = null; selCapat = null;
  calculeaza(); incadreaza();
  if (rez.deschise.length) selCapat = { uid: rez.deschise[0]!.uid, j: rez.deschise[0]!.j };
  deseneaza(); actualizeazaUI();
  anunta3D();
}
// in cvs2, cu permisiunea `cont` (ADR 0164): contul lui cvs2, doar citit; circuitele raman deocamdata in browserul acesta
const PLANURI_CVS2: Record<string, string> = { proba: "proba gratuită", gratuit: "planul gratuit", personal: "personalul aplicației",
  expirat: "proba încheiată", dezactivat: "cont dezactivat" };
function randeazaCont() {
  const el = $("#circ-cont"), c = window.cvs2 ? window.cvs2.cont() : null;
  el.hidden = !c;
  if (!c) return;
  el.textContent = !c.conectat ? "Nu ești conectat la cvs2."
    : c.plan === null ? "Ești conectat la cvs2; adresa contului nu e încă confirmată."
    : tr`Ești conectat la cvs2 ca ${c.nume} (${PLANURI_CVS2[c.plan] || c.plan}).`;
}
let deConfirmat: string | null | undefined = null;
function randeazaCircuite() {
  // in cvs2 (ADR 0161), circuitele stau in stocarea extensiei, adica doar in browserul acesta
  $("#circ-unde").textContent = window.cvs2
    ? "Circuitele se salvează singure, în browserul acesta (prin cvs2): pe alt calculator sau în alt browser nu apar."
    : db
    ? "Circuitele se salvează singure și le vezi pe telefon, tabletă sau calculator."
    : "Circuitele se salvează doar pe acest dispozitiv.";
  randeazaCont();
  if (!listaCircuite.length) { $("#circ-lista").innerHTML = `<p class="mic">Încă nu ai circuite salvate. Orice schimbare pe plan se salvează singură.</p>`; return; }
  $("#circ-lista").innerHTML = listaCircuite.map(c => {
    const d = c.actualizat ? new Date(c.actualizat as string) : null;
    const cand = d ? d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "";
    const conf = deConfirmat === c.id;
    return `<div class="circ ${c.id === stare.docId ? "activ" : ""}"><div class="info"><b></b><span class="mic">${tr`${c.nrPiese || 0} piese · ${cand}`}</span></div>
      <button class="btn" type="button" data-deschide="${c.id}">Deschide</button>
      <button class="btn${conf ? " pericol" : ""}" type="button" data-sterge-c="${c.id}">${conf ? "Sigur? Șterge" : "Șterge"}</button></div>`;
  }).join("");
  $("#circ-lista").querySelectorAll<HTMLElement>(".circ b").forEach((b, i) => { b.textContent = (listaCircuite[i]!.nume as string) || tr("Circuit fără nume"); });
}
async function stergeCircuit(id: string) {
  try {
    if (db) await db.doc("circuite/" + id).delete();
    else { const o = citesteLocal(); delete o[id]; scrieLocal(o); listaCircuite = listaDinLocal(); }
    if (stare.docId === id) { stare.docId = null; }
    deConfirmat = null; randeazaCircuite();
  } catch (e) { toast("Nu am putut șterge circuitul."); }
}

// ----------------------------------------------------------------------------- export
function listaLC(): NonNullable<Parameters<typeof TrenCNC.genereaza>[1]> {
  // piesele la comanda din circuit, o data fiecare (cu numarul de bucati)
  const n = numara(), lc = [], vazute = new Set();
  for (const p of stare.piese) {
    if (!p.lc) continue;
    const id = idLC(p.lc);
    if (vazute.has(id)) continue;
    vazute.add(id);
    lc.push({ id, titlu: defLC(p.lc).titlu, capete: p.lc.cap, bucati: n[id],
              segmente: p.lc.seg.map(s => (s.t === "L" ? { t: "L", l: +s.l.toFixed(3) } : { t: "A", r: +s.r.toFixed(3), a: +s.a.toFixed(4), s: s.s })) });
  }
  return lc as unknown as NonNullable<Parameters<typeof TrenCNC.genereaza>[1]>;
}
function jsonExport() {
  const n = numara(), lc = listaLC();
  const o = { format: "trenulet-circuit", versiune: lc.length ? 2 : 1, nume: stare.nume || "circuit", piese: n };
  if (lc.length) (o as Record<string, unknown>).la_comanda = lc;
  return JSON.stringify(o, null, 1);
}
function deschideExport() {
  const n = numara();
  const rele = rez.probleme.filter(p => p.rau).length;
  $("#exp-rezumat").innerHTML = (rele ? `<div class="avert rau">${tr`Circuitul are ${rele} ${rele === 1 ? tr("problemă") : tr("probleme")}; uită-te în listă înainte să frezezi.`}</div>` : "") +
    (Object.keys(n).length ? `<p class="mic">${tr`${Object.values(n).reduce((a, b) => a + b, 0)} bucăți: ${Object.entries(n).map(([k, v]) => v + " × " + nume(k)).join(", ")}.`}</p>` : `<p class="mic">Circuitul e gol.</p>`);
  $("#exp-json").textContent = jsonExport();
  arataSetariCNC();
  arata("#foaie-export");
  pregatesteCNC(true);
}

// ----------------------------------------------------------------------------- vectori pentru CNC
// Motorul e in TrenCNC (cnc.js): geometria pieselor (cu arce adevarate), asezarea pe placi si DXF-urile.
// Setarile de frezare tin de masina, nu de circuit: le tin in baza de date a paginii (si local, ca rezerva).
const CHEIE_CNC = "trenulet.cnc.v1";
const CNC_IMPLICIT = {
  freza: 6, varianta_tata: 3, varianta_mama: 3, evazare: 0.8, placa: [1000, 600] as [number, number], placa_margine: 15, distanta_piese: 14,
  doua_fete: false, inaltime_tren: null as number | null,
  limbi: true, limba_joc: 0.2, pivot_adancime: 2.5,
  stalpi_printati: false, opritor_printat: false, tunel: 0, peron: 0, cale_printata: [] as string[], print_tata: 3, print_mama: 3, proba_cuplaje: false,
  pret_placa: 0, pret_filament: 100,
  tesire: { tip: "fara" as string, unghi: 90, latime: 1.5, raza: 3, varf: 6, santuri: false, latimeSant: 0.8 },
  umplere: [] as string[],
  continut: { gcode: true, dxfPlaci: true, dxfPiese: true, svg: true, rampa: true, limbi: true, printate: true, calibrare: true },
  gcode: {
    controler: "grbl-11", strategieScula: "fisiere-separate", origine: "stanga-jos", z0: "sus",
    turatie: 18000, avans: 1000, avansPlonjare: 300, zSigur: 5, asteptareAx: 3,
    pasContur: 3, supracursa: 0.3, pasSant: 1.5, sens: "urcare", coborareDirecta: false, rampa: true, lungimeRampa: 30,
    urechi: { numar: 3, latime: 12, grosime: 2.5 }, tesire: { numar: 2, turatie: 18000, avans: 1000 }, setariMasina: "",
  },
  cvs2: { adresa: "https://cncvectorstudio-test.firebaseapp.com/" },
};
const MARGINE_STIFTURI = 13.5;    // la doua fete: gaura de 6 mm la 7,5 mm de margine, plus 3 mm de lemn
// piesele cu care se poate umple locul liber de pe placi
const PIESE_UMPLERE = ["dreapta_216", "dreapta_144", "dreapta_108", "dreapta_54", "curba_mare_stanga", "curba_mare_dreapta", "curba_mica_stanga",
  "curba_mica_dreapta", "adaptor_tata_tata", "adaptor_mama_mama", "macaz_stanga", "macaz_dreapta", "ramificatie_y", "incrucisare_90"];
const CONTROLERE = (): [string, string][] => (window.TrenGCode ? Object.entries(TrenGCode.CONTRACTE).map(([id, k]) => [id, k.nume + (k.probat ? "" : " (neprobat)")]) : [["grbl-11", "GRBL 1.1"]]);
const V = (s: SetariPlan) => s.tesire.tip === "v", ROT = (s: SetariPlan) => s.tesire.tip === "rotunjire", TES = (s: SetariPlan) => s.tesire.tip !== "fara";
// campurile setarilor: sectiunea, calea in setari, eticheta, felul si limitele
const CAMPURI: CampSetare[] = [
  { s: "frezare", k: "freza", e: "Freza reală (mm)", min: 2, max: 12, pas: 0.05 },
  { s: "frezare", k: "varianta_tata", e: "Ciupercă tată (1–5)", min: 1, max: 5, pas: 1, intreg: true },
  { s: "frezare", k: "varianta_mama", e: "Locaș mamă (1–5)", min: 1, max: 5, pas: 1, intreg: true },
  { s: "frezare", k: "evazare", e: "Evazare (mm)", min: 0, max: 3, pas: 0.1 },
  { s: "frezare", k: "placa.0", e: "Placă: lungime (mm)", min: 200, max: 3000, pas: 10 },
  { s: "frezare", k: "placa.1", e: "Placă: lățime (mm)", min: 150, max: 2000, pas: 10 },
  { s: "frezare", k: "placa_margine", e: "Margine (mm)", min: 0, max: 100, pas: 1 },
  { s: "frezare", k: "distanta_piese", e: "Între piese (mm)", min: 4, max: 60, pas: 1 },
  { s: "frezare", k: "doua_fete", e: "Șanțuri pe ambele fețe", t: "bifa" },
  { s: "limbi", k: "limbi", e: "Macazurile au limbă mobilă (locaș și pivot în șanț, limba se printează)", t: "bifa" },
  { s: "limbi", k: "limba_joc", e: "Jocul limbii (mm)", min: 0.05, max: 0.8, pas: 0.05, cand: s => s.limbi },
  { s: "limbi", k: "pivot_adancime", e: "Gaura pivotului, sub șanț (mm)", min: 1, max: 5, pas: 0.5, cand: s => s.limbi },
  { s: "printate", k: "tunel", e: "Tuneluri", min: 0, max: 20, pas: 1, intreg: true },
  { s: "printate", k: "peron", e: "Peroane", min: 0, max: 20, pas: 1, intreg: true },
  { s: "printate", k: "stalpi_printati", e: "Stâlpii podurilor, printați dintr-o bucată (în loc de straturi de placă)", t: "bifa" },
  { s: "printate", k: "opritor_printat", e: "Blocul opritorului, printat, cu două tampoane", t: "bifa" },
  { s: "printate", k: "print_tata", e: "Cuplaj tată, la piesele printate (1–5)", min: 1, max: 5, pas: 1, intreg: true },
  { s: "printate", k: "print_mama", e: "Locaș mamă, la piesele printate (1–5)", min: 1, max: 5, pas: 1, intreg: true },
  { s: "printate", k: "proba_cuplaje", e: "Proba cuplajelor printate: 5 bucăți scurte, variantele 1–5", t: "bifa" },
  { s: "deviz", k: "pret_placa", e: "Prețul unei plăci (lei)", min: 0, max: 5000, pas: 1 },
  { s: "deviz", k: "pret_filament", e: "Filament (lei / kg)", min: 0, max: 2000, pas: 1 },
  { s: "tesire", k: "tesire.tip", e: "Freza de teșit", t: "alege", opt: [["fara", "Fără teșire"], ["v", "Freză în V"], ["rotunjire", "Freză de rotunjit"]] },
  { s: "tesire", k: "tesire.unghi", e: "Unghiul V-ului (°)", min: 20, max: 150, pas: 1, cand: V },
  { s: "tesire", k: "tesire.latime", e: "Lățimea teșiturii (mm)", min: 0.2, max: 6, pas: 0.1, cand: V },
  { s: "tesire", k: "tesire.raza", e: "Raza rotunjirii (mm)", min: 0.5, max: 12, pas: 0.5, cand: ROT },
  { s: "tesire", k: "tesire.varf", e: "Diametrul vârfului (mm)", min: 1, max: 25, pas: 0.05, cand: ROT },
  { s: "tesire", k: "tesire.santuri", e: "Și marginile șanțurilor", t: "bifa", cand: V },
  { s: "tesire", k: "tesire.latimeSant", e: "Teșitura șanțurilor (mm)", min: 0.2, max: 2, pas: 0.1, cand: s => V(s) && s.tesire.santuri },
  { s: "tesire", k: "gcode.tesire.numar", e: "Numărul frezei (T)", min: 1, max: 99, pas: 1, intreg: true, cand: TES },
  { s: "tesire", k: "gcode.tesire.turatie", e: "Turație (rot/min)", min: 1000, max: 40000, pas: 500, intreg: true, cand: TES },
  { s: "tesire", k: "gcode.tesire.avans", e: "Avans (mm/min)", min: 50, max: 10000, pas: 50, cand: TES },
  { s: "gcode", k: "gcode.controler", e: "Controlerul", t: "alege", opt: CONTROLERE },
  { s: "gcode", k: "gcode.strategieScula", e: "Schimbarea frezei", t: "alege", opt: () => [["fisiere-separate", "Un fișier pe freză"], ["m0-comentariu", "Un fișier, cu oprire (M0)"], ["m6-controler", "Un fișier, cu M6 (schimbător; nu și pentru cvs2)"]] },
  { s: "gcode", k: "gcode.origine", e: "Zero X / Y", t: "alege", opt: [["stanga-jos", "Colțul stânga-jos"], ["dreapta-jos", "Colțul dreapta-jos"], ["stanga-sus", "Colțul stânga-sus"], ["dreapta-sus", "Colțul dreapta-sus"]] },
  { s: "gcode", k: "gcode.z0", e: "Zero Z", t: "alege", opt: [["sus", "Fața de sus a plăcii"], ["jos", "Masa (placa de sacrificiu)"]] },
  { s: "gcode", k: "gcode.turatie", e: "Turație (rot/min)", min: 1000, max: 40000, pas: 500, intreg: true },
  { s: "gcode", k: "gcode.avans", e: "Avans (mm/min)", min: 50, max: 10000, pas: 50 },
  { s: "gcode", k: "gcode.avansPlonjare", e: "Avans la coborâre (mm/min)", min: 20, max: 5000, pas: 10 },
  { s: "gcode", k: "gcode.zSigur", e: "Z sigur (mm)", min: 1, max: 50, pas: 0.5 },
  { s: "gcode", k: "gcode.pasContur", e: "Pas la decupare (mm)", min: 0.5, max: 12, pas: 0.5 },
  { s: "gcode", k: "gcode.supracursa", e: "În placa de sacrificiu (mm)", min: 0, max: 2, pas: 0.1 },
  { s: "gcode", k: "gcode.pasSant", e: "Pas la șanțuri (mm)", min: 0.3, max: 3, pas: 0.1 },
  { s: "gcode", k: "gcode.urechi.numar", e: "Punți pe piesă", min: 0, max: 8, pas: 1, intreg: true },
  { s: "gcode", k: "gcode.urechi.latime", e: "Lungimea punții (mm)", min: 6, max: 40, pas: 1 },
  { s: "gcode", k: "gcode.urechi.grosime", e: "Grosimea punții (mm)", min: 0.5, max: 6, pas: 0.5 },
  { s: "gcode", k: "gcode.asteptareAx", e: "Așteptare după pornirea axului (s)", min: 0, max: 20, pas: 0.5 },
  { s: "gcode", k: "gcode.sens", e: "Sensul", t: "alege", opt: [["urcare", "Urcare (climb)"], ["opozitie", "Opoziție (conventional)"]] },
  { s: "gcode", k: "gcode.lungimeRampa", e: "Lungimea rampei (mm)", min: 1, max: 300, pas: 1, cand: s => s.gcode.rampa },
  { s: "gcode", k: "gcode.rampa", e: "La decupare, coborâre pe rampă de-a lungul conturului (fără plonjare)", t: "bifa" },
  { s: "gcode", k: "gcode.coborareDirecta", e: "La șanțuri, fără ridicare între treceri", t: "bifa" },
  { s: "gcode", k: "gcode.setariMasina", e: "Setările mașinii, pentru timpul de lucru: lipește aici răspunsul la $$", t: "text" },
  { s: "cvs2", k: "cvs2.adresa", e: "Adresa lui cvs2 (pagina pe care o deschizi de obicei)", t: "adresa" },
  { s: "continut", k: "continut.gcode", e: "G-code direct (fără ArtCAM)", t: "bifa" },
  { s: "continut", k: "continut.dxfPlaci", e: "DXF-urile plăcilor (pentru ArtCAM)", t: "bifa" },
  { s: "continut", k: "continut.dxfPiese", e: "Fiecare piesă, într-un DXF separat", t: "bifa" },
  { s: "continut", k: "continut.svg", e: "Imaginile plăcilor (SVG)", t: "bifa" },
  { s: "continut", k: "continut.rampa", e: "Rampa: G-code de finisare, relieful 3D (STL) și șanțurile", t: "bifa" },
  { s: "continut", k: "continut.limbi", e: "Limbile macazurilor, de printat (STL)", t: "bifa" },
  { s: "continut", k: "continut.printate", e: "Piesele printate: stâlpi, opritoare, tuneluri, peroane, piese de cale (STL)", t: "bifa" },
  { s: "continut", k: "continut.calibrare", e: "Placa de calibrare", t: "bifa" },
];
const ia = (o: unknown, k: string): unknown => k.split(".").reduce((x: unknown, p) => (x == null ? undefined : (x as Record<string, unknown>)[p]), o);
function pune(o: unknown, k: string, v: unknown) { const p = k.split("."); let x = o as Record<string, unknown>; for (let i = 0; i < p.length - 1; i++) x = x[p[i]!] as Record<string, unknown>; x[p[p.length - 1]!] = v; }
const opt = (c: CampSetare) => (typeof c.opt === "function" ? c.opt() : c.opt);
function curataSetari(o: unknown): SetariPlan {
  const brut = (o && typeof o === "object" ? o : {}) as Record<string, unknown> & { continut?: unknown };
  // pornesc de la valorile implicite si pun peste ele ce se poate citi din cele salvate
  const s = JSON.parse(JSON.stringify(CNC_IMPLICIT));
  if (brut.calibrare === false) s.continut.calibrare = false;          // setarile din versiunea de dinainte
  for (const c of CAMPURI) {
    const v = ia(brut, c.k);
    if (v === undefined || v === null || v === "") continue;
    if (c.t === "bifa") pune(s, c.k, v === true);
    else if (c.t === "text") pune(s, c.k, String(v).slice(0, 6000));
    else if (c.t === "adresa") { const a = adresaCvs2(v); if (a) pune(s, c.k, a); }
    else if (c.t === "alege") { if (opt(c)!.some(([x]) => x === v)) pune(s, c.k, v); }
    else {
      let n = Number(v);
      if (!Number.isFinite(n)) continue;
      n = Math.min(c.max!, Math.max(c.min!, n));
      pune(s, c.k, c.intreg ? Math.round(n) : Math.round(n * 100) / 100);
    }
  }
  s.umplere = Array.isArray(brut.umplere) ? brut.umplere.filter((id: string) => PIESE_UMPLERE.includes(id)) : [];
  s.cale_printata = Array.isArray(brut.cale_printata) ? [...new Set(brut.cale_printata.filter(x => typeof x === "string" && x.length < 200))].slice(0, 100) : [];
  const inalt = Number(brut.inaltime_tren);
  s.inaltime_tren = brut.inaltime_tren != null && brut.inaltime_tren !== "" && Number.isFinite(inalt) && inalt >= 20 && inalt <= 200 ? Math.round(inalt) : null;
  return s;
}
function citesteSetariLocal() { try { return curataSetari(JSON.parse(localStorage.getItem(CHEIE_CNC) || "null")); } catch (e) { return curataSetari(null); } }
let setariCNC = citesteSetariLocal();

// masinile: fiecare cu freza, placa, calibrarea cuplajelor, G-code-ul si adresa lui cvs2; una e implicita (cu ea se
// deschide pagina). Restul setarilor (limbi, piese printate, continutul arhivei) tin de circuit, nu de masina.
const CHEIE_MASINI = "trenulet.masini.v1";
const CHEI_MASINA = CAMPURI.map(c => c.k).filter(k => /^(freza$|varianta_tata$|varianta_mama$|evazare$|placa\.|placa_margine$|distanta_piese$|tesire\.|gcode\.|cvs2\.|pret_placa$)/.test(k));
const valoriMasina = (s = setariCNC) => JSON.parse(JSON.stringify(Object.fromEntries(CHEI_MASINA.map(k => [k, ia(s, k)]))));
function cuMasina(s: SetariPlan, v: Record<string, unknown> | null) {
  const nou = JSON.parse(JSON.stringify(s));
  for (const k of CHEI_MASINA) if (v && v[k] !== undefined && v[k] !== null) pune(nou, k, JSON.parse(JSON.stringify(v[k])));
  return curataSetari(nou);
}
let masini = (() => { try { return Profiluri.curata(JSON.parse(localStorage.getItem(CHEIE_MASINI) || "null"), valoriMasina(), tr("Mașina mea")); } catch (e) { return Profiluri.curata(null, valoriMasina(), tr("Mașina mea")); } })();
{ const v = Profiluri.laDeschidere(masini); if (v) setariCNC = cuMasina(setariCNC, v); }
let timerMasini: ReturnType<typeof setTimeout> | null = null, uiMasini: { desen(): void } | null = null;
function salveazaMasini() {
  try { localStorage.setItem(CHEIE_MASINI, JSON.stringify(masini)); } catch (e) { /* fara stocare */ }
  const inDb = async () => {
    if (!db) return;
    try { await db.doc("setari/masini").set({ ...JSON.parse(JSON.stringify(masini)), actualizat: new Date().toISOString() }); } catch (e) { /* raman cele locale */ }
  };
  if (window.cvs2) { window.cvs2.amana("masini", inDb, 900); return; }   // ca la circuite (ADR 0164)
  clearTimeout(timerMasini!);
  timerMasini = setTimeout(inDb, 900);
}
function memoreazaMasina() { Profiluri.memoreaza(masini, valoriMasina()); salveazaMasini(); }
function aplicaMasina(v: Record<string, unknown> | null) {
  // alta masina aleasa: setarile ei peste cele de acum, apoi totul se recalculeaza
  setariCNC = cuMasina(setariCNC, v); salveazaSetariCNC();
  if (!$("#foaie-export").hidden) { arataSetariCNC(); pregatesteCNC(false); }
  calculeaza(); deseneaza(); actualizeazaUI(); anunta3D();
}
let rezCNC: ReturnType<typeof TrenCNC.genereaza> | null = null, cheieCNC: string | null = null, timerCNC: ReturnType<typeof setTimeout> | null = null,
  timerTimp: ReturnType<typeof setTimeout> | null = null, timerSalvareCNC: ReturnType<typeof setTimeout> | null = null, lucruCNC = 0;

let cacheCale: { cheie: string | null; ids: string[] } = { cheie: null, ids: [] };
function calePrintataCareIncape(par: Partial<SetariPlan>) {
  // din piesele bifate ca printate, doar cele care incap pe patul imprimantei (din 3D); celelalte raman de taiat
  const s = setariCNC;
  if (!s.cale_printata.length || !window.TrenCNC || !window.Cavalier) return [];
  const pat = window.Atelier3D && Atelier3D.pat ? Atelier3D.pat() : { pat: [180, 180], margine: 5 };
  const lc = listaLC(), cheie = JSON.stringify([s.cale_printata, pat, lc.map(x => x.id), par]);
  if (cheie === cacheCale.cheie) return cacheCale.ids;
  const L = pat.pat[0]! - 2 * pat.margine, A = pat.pat[1]! - 2 * pat.margine, ids: string[] = [];
  try {
    TrenCNC.seteaza(par as Parameters<typeof TrenCNC.seteaza>[0]);
    const cat = TrenCNC.catalog(lc);
    for (const id of s.cale_printata) {
      const p = cat.piese[id];
      if (!p || cat.kituri[id]) continue;
      const g = TrenCNC.geometrie(p);
      if ((g.w <= L && g.h <= A) || (g.h <= L && g.w <= A)) ids.push(id);
    }
  } catch (e) { /* fara piese printate */ }
  cacheCale = { cheie, ids };
  return ids;
}
function parametriCNC() {
  const par = parametriBaza();
  return { ...par, cale_printata: calePrintataCareIncape(par as unknown as Partial<SetariPlan>) };
}
function parametriBaza() {
  // ce primeste motorul geometriei; intre piese trebuie sa incapa freza, cu 2 mm de rezerva
  const s = setariCNC, t = s.tesire;
  return { freza: s.freza, varianta_tata: s.varianta_tata, varianta_mama: s.varianta_mama, evazare: s.evazare,
           placa: s.placa.slice(), placa_margine: s.doua_fete ? Math.max(s.placa_margine, MARGINE_STIFTURI) : s.placa_margine,
           distanta_piese: Math.max(s.distanta_piese, s.freza + 2), doua_fete: s.doua_fete,
           limbi: s.limbi, limba_joc: s.limba_joc, pivot_adancime: s.pivot_adancime,
           stalpi_printati: s.stalpi_printati, opritor_printat: s.opritor_printat, tunel: s.tunel, peron: s.peron, inaltime_tren: s.inaltime_tren,
           print_tata: s.print_tata, print_mama: s.print_mama, proba_cuplaje: s.proba_cuplaje,
           tesire: t.tip === "v" ? { tip: "v", unghi: t.unghi, latime: t.latime, santuri: t.santuri }
             : t.tip === "rotunjire" ? { tip: "rotunjire", raza: t.raza, varf: t.varf } : null };
}
function optiuniCNC() {
  // ce intra in arhiva, piesele de umplutura si setarile G-code-ului
  const s = setariCNC, t = s.tesire, k = window.TrenGCode && (TrenGCode.CONTRACTE as Record<string, { nume: string; scula: string[]; probat: boolean; extensie: string } | undefined>)[s.gcode.controler];
  const g = k && !k.scula.includes(s.gcode.strategieScula) ? { ...s.gcode, strategieScula: k.scula[0] } : s.gcode;
  return {
    continut: { ...s.continut },
    umplere: s.umplere.slice(),
    gcode: { ...g, setariMasina: undefined, urechi: { ...g.urechi }, scula: { numar: 1, nume: "freza dreapta" },
             tesire: { ...g.tesire, nume: t.tip === "v" ? `freza in V ${t.unghi} grade` : "freza de rotunjit R" + t.raza, diametru: t.tip === "v" ? 2 * t.latime : t.varf + 2 * t.raza, latimeSant: t.latimeSant } },
  };
}
function rezumatSetari() {
  const s = setariCNC, d = CNC_IMPLICIT;
  const standard = ["freza", "varianta_tata", "varianta_mama", "evazare"].every(k => (s as Record<string, unknown>)[k] === (d as Record<string, unknown>)[k]) && s.placa[0] === d.placa[0] && s.placa[1] === d.placa[1];
  return (standard ? tr("· standard (nicio calibrare încă)") : tr`· freză ${fmtS(s.freza)} mm, tată ${s.varianta_tata}, mamă ${s.varianta_mama}, placă ${s.placa[0]} × ${s.placa[1]}`) + (s.doua_fete ? tr(", două fețe") : "");
}
function htmlCamp(c: CampSetare) {
  const id = "s-" + c.k.replace(/\./g, "-");
  if (c.t === "bifa") return `<label class="bifa" data-camp="${c.k}"><input type="checkbox" id="${id}" data-cale="${c.k}"> ${c.e}</label>`;
  if (c.t === "text") return `<label class="text" data-camp="${c.k}">${c.e}<textarea id="${id}" data-cale="${c.k}" rows="3" spellcheck="false" placeholder="$100=800.000&#10;$110=6000.000&#10;$120=200.000 …"></textarea><span class="mic" id="${id}-stare"></span></label>`;
  if (c.t === "adresa") return `<label class="lata" data-camp="${c.k}">${c.e}<input id="${id}" type="url" inputmode="url" spellcheck="false" autocomplete="off" data-cale="${c.k}"><span class="mic" id="${id}-stare"></span></label>`;
  if (c.t === "alege") return `<label data-camp="${c.k}">${c.e}<select id="${id}" data-cale="${c.k}">${opt(c)!.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>`;
  return `<label data-camp="${c.k}">${c.e}<input id="${id}" type="number" inputmode="decimal" min="${c.min}" max="${c.max}" step="${c.pas}" data-cale="${c.k}"></label>`;
}
function construiesteSetari() {
  // campurile se scriu o data; apoi doar valorile si ce se vede
  for (const sec of ["frezare", "limbi", "printate", "deviz", "tesire", "gcode", "cvs2", "continut"]) {
    const cs = CAMPURI.filter(c => c.s === sec);
    const bife = cs.filter(c => c.t === "bifa").map(htmlCamp).join(""), numere = `<div class="campuri mici">${cs.filter(c => !c.t || c.t === "alege" || c.t === "adresa").map(htmlCamp).join("")}</div>`;
    // la limbi, intai bifa (le pornesti), apoi masurile
    $("#sec-" + sec).innerHTML = (sec === "limbi" ? bife + numere : numere + bife) + cs.filter(c => c.t === "text").map(htmlCamp).join("");
  }
  $("#sec-umplere").innerHTML = `<div class="bife">${PIESE_UMPLERE.map(id => `<label class="bifa"><input type="checkbox" data-umplere="${id}"> ${nume(id)}</label>`).join("")}</div>`;
}
function arataSetariCNC() {
  if (!$("#sec-frezare").firstChild) construiesteSetari();
  const s = setariCNC;
  for (const c of CAMPURI) {
    const el = document.querySelector<HTMLElement>(`[data-cale="${c.k}"]`);
    if (!el) continue;
    if (document.activeElement !== el) { if (c.t === "bifa") (el as HTMLInputElement).checked = !!ia(s, c.k); else (el as CampNumeric).value = ia(s, c.k) as string; }
    el.closest<HTMLElement>("[data-camp]")!.hidden = !!(c.cand && !c.cand(s));
  }
  document.querySelectorAll<HTMLInputElement>("[data-umplere]").forEach(b => { b.checked = s.umplere.includes(b.dataset.umplere!); });
  $("#s-fete-info").hidden = !s.doua_fete;
  arataCalePrintata();
  $("#cnc-setari-rez").textContent = rezumatSetari();
  $("#rez-tesire").textContent = s.tesire.tip === "fara" ? "· fără" : s.tesire.tip === "v" ? tr`· V ${s.tesire.unghi}°, ${fmtS(s.tesire.latime)} mm` : tr`· rotunjire R${fmtS(s.tesire.raza)}`;
  $("#rez-umplere").textContent = s.umplere.length ? `· ${s.umplere.length} ${s.umplere.length === 1 ? tr("piesă") : tr("piese")}` : "· nimic în plus";
  const k = window.TrenGCode && (TrenGCode.CONTRACTE as Record<string, { nume: string; scula: string[]; probat: boolean; extensie: string } | undefined>)[s.gcode.controler];
  $("#rez-gcode").textContent = k ? tr`· ${k.nume}, ${s.gcode.urechi.numar} punți` : "";
  $("#rez-limbi").textContent = s.limbi ? tr`· da, joc ${fmtS(s.limba_joc)} mm` : "· nu (macazuri fixe)";
  const nCale = s.cale_printata.length ? calePrintataCareIncape(parametriBaza() as unknown as Partial<SetariPlan>).filter(id => numara()[id]).length : 0;
  const pr = [s.tunel ? (s.tunel === 1 ? tr`${1} tunel` : tr`${s.tunel} tuneluri`) : "", s.peron ? (s.peron === 1 ? tr`${1} peron` : tr`${s.peron} peroane`) : "",
    s.stalpi_printati ? tr("stâlpii") : "", s.opritor_printat ? tr("opritoarele") : "",
    nCale ? tr`${nCale} ${nCale === 1 ? tr("fel de piesă") : tr("feluri de piese")} de cale` : ""].filter(Boolean);
  $("#rez-printate").textContent = pr.length ? "· " + pr.join(", ") : "· nimic în plus";
  $("#rez-cvs2").textContent = "· " + (originea(s.cvs2.adresa) || "").replace(/^https?:\/\//, "");
  $("#rez-deviz").textContent = tr`· placa ${s.pret_placa ? s.pret_placa + " lei" : tr("fără preț")}, filament ${s.pret_filament} lei/kg`;
  // schimbarea frezei: doar felurile pe care le accepta controlerul ales
  if (k) for (const o of document.querySelectorAll<HTMLOptionElement>('[data-cale="gcode.strategieScula"] option')) o.disabled = !k.scula.includes(o.value);
  $("#gcode-neprobat").hidden = !k || k.probat;
  const mesaje = [];
  if (s.distanta_piese < s.freza + 2) mesaje.push(tr`Între piese las ${fmtS(s.freza + 2)} mm: trebuie să încapă freza, cu puțină rezervă.`);
  if (s.freza > 6.5) mesaje.push(tr("Freza e mai lată decât șanțul de 6 mm: șanțurile vor ieși mai late."));
  if (s.doua_fete && s.placa_margine < MARGINE_STIFTURI) mesaje.push(tr`La două fețe marginea e de cel puțin ${fmtS(MARGINE_STIFTURI)} mm, ca găurile pentru știfturi să aibă lemn în jur.`);
  const av = $("#cnc-setari-avert");
  av.hidden = !mesaje.length; av.textContent = mesaje.join(" ");
}
function schimbaSetare(e: Event) {
  const el = (e && e.target) as HTMLInputElement | null;
  const nou = JSON.parse(JSON.stringify(setariCNC));
  if (el && el.dataset.cale) {
    const c = CAMPURI.find(x => x.k === el.dataset.cale);
    if (c!.t === "bifa") pune(nou, c!.k, el.checked);
    else if (c!.t === "alege" || c!.t === "text" || c!.t === "adresa") pune(nou, c!.k, el.value);
    else { const t = el.value.trim().replace(",", "."); if (t === "" || !Number.isFinite(+t)) return; pune(nou, c!.k, +t); }   // camp gol cat timp scrie
  }
  if (el && el.dataset.umplere) nou.umplere = [...document.querySelectorAll<HTMLInputElement>("[data-umplere]")].filter(b => b.checked).map(b => b.dataset.umplere);
  if (el && el.dataset.calePrintata !== undefined) {
    // piesele bifate se printeaza; cele din circuit nebifate ies din lista (celelalte, din alte circuite, raman)
    const aici = [...document.querySelectorAll<HTMLElement>("[data-cale-printata]")];
    nou.cale_printata = [...nou.cale_printata.filter((id: string) => !aici.some(b => b.dataset.calePrintata === id)), ...aici.filter(b => (b as HTMLInputElement).checked).map(b => b.dataset.calePrintata)];
  }
  if (el && el.dataset.cale === "cvs2.adresa") {
    // o adresa care nu se poate citi nu inlocuieste adresa buna de pana acum (si nici nu revine pe tacute la cea de test)
    const ok = adresaCvs2(el.value), st = $("#s-cvs2-adresa-stare");
    if (st) { st.textContent = ok ? "" : tr`Adresa nu se poate citi; rămâne ${setariCNC.cvs2.adresa}`; st.className = ok ? "mic" : "mic eroare"; }
    if (!ok) return;
    nou.cvs2.adresa = ok;
  }
  setariCNC = curataSetari(nou);
  salveazaSetariCNC();
  if (el && CHEI_MASINA.includes(el.dataset.cale!)) memoreazaMasina();
  if (el && /^print_(tata|mama)$/.test(el.dataset.cale || "") && window.Atelier3D && Atelier3D.printSchimbat) Atelier3D.printSchimbat();
  arataSetariCNC();
  if (el && el.dataset.cale === "gcode.setariMasina") { clearTimeout(timerTimp!); timerTimp = setTimeout(estimeazaTimpi, 500); return; }   // doar timpul se schimba
  if (el && el.dataset.cale === "cvs2.adresa") return;            // adresa nu schimba fisierele
  clearTimeout(timerCNC!);
  timerCNC = setTimeout(() => pregatesteCNC(false), el && el.type === "number" ? 650 : 150);
}
function salveazaSetariCNC() {
  try { localStorage.setItem(CHEIE_CNC, JSON.stringify(setariCNC)); } catch (e) { /* fara stocare */ }
  const inDb = async () => {
    if (!db) return;
    try { await db.doc("setari/cnc").set({ ...setariCNC, actualizat: new Date().toISOString() }); } catch (e) { /* raman cele locale */ }
  };
  if (window.cvs2) { window.cvs2.amana("cnc", inDb, 900); return; }   // ca la circuite (ADR 0164)
  clearTimeout(timerSalvareCNC!);
  timerSalvareCNC = setTimeout(inDb, 900);
}
async function incarcaSetariCNC() {
  if (!db) return;
  try {
    const d = await db.doc("setari/cnc").get();
    if (!d.exists) { salveazaSetariCNC(); return; }       // prima data: urc ce era pe dispozitivul asta
    setariCNC = curataSetari(d.data());
    try {
      const dm = await db.doc("setari/masini").get();
      if (dm.exists) masini = Profiluri.curata(dm.data(), valoriMasina(), tr("Mașina mea"));
      const v = Profiluri.laDeschidere(masini);
      if (v) setariCNC = cuMasina(setariCNC, v);
      salveazaMasini(); if (uiMasini) uiMasini.desen();
    } catch (e) { /* raman masinile locale */ }
    try { localStorage.setItem(CHEIE_CNC, JSON.stringify(setariCNC)); } catch (e) { /* fara stocare */ }
    if (!$("#foaie-export").hidden) { arataSetariCNC(); pregatesteCNC(false); }
    calculeaza(); deseneaza(); actualizeazaUI();         // inaltimea trenului schimba verificarea podurilor
    anunta3D();
  } catch (e) { /* raman cele locale */ }
}

function arataCalePrintata() {
  // piesele de cale din circuit, care incap pe patul imprimantei: bifate, se printeaza in loc sa se taie
  const loc = $("#sec-cale-printata");
  if (!loc || !window.TrenCNC || !window.Cavalier) return;
  const n = numara(), lc = listaLC();
  let cat;
  try { TrenCNC.seteaza(parametriBaza() as Parameters<typeof TrenCNC.seteaza>[0]); cat = TrenCNC.catalog(lc); } catch (e) { loc.innerHTML = ""; return; }
  const pat = window.Atelier3D && Atelier3D.pat ? Atelier3D.pat() : { pat: [180, 180], margine: 5 };
  const L = pat.pat[0]! - 2 * pat.margine, A = pat.pat[1]! - 2 * pat.margine;
  const ids = Object.keys(n).filter(id => cat.piese[id] && !cat.kituri[id] && id !== "opritor_bloc").sort((a, b) => nume(a).localeCompare(nume(b), "ro"));
  if (!ids.length) { loc.innerHTML = ""; return; }
  loc.innerHTML = `<p class="mic"><b>Piese de cale printate, în loc de frezate</b> ${tr`(pe patul de ${pat.pat[0]} × ${pat.pat[1]} mm). Bifate, nu mai intră pe plăci; vin în dosarul`} <b>printate</b> și în lista de printat din 3D, culcate, cu șanțurile în sus. Cuplajele au variantele de printare de mai sus (le alegi după proba cuplajelor); macazurile printate n-au limbă mobilă.</p>
    <div class="bife">${ids.map(id => {
      let g = null;
      try { g = TrenCNC.geometrie(cat.piese[id]!); } catch (e) { g = null; }
      const incape = g && ((g.w <= L && g.h <= A) || (g.h <= L && g.w <= A));
      const bif = setariCNC.cale_printata.includes(id) && incape;
      return `<label class="bifa"${incape ? "" : ` title="${tr("nu încape pe pat")}"`}><input type="checkbox" data-cale-printata="${id}"${bif ? " checked" : ""}${incape ? "" : " disabled"}> ${nume(id)} <span class="mic">${n[id]} × · ${g ? `${fmt(g.w)} × ${fmt(g.h)}` : "?"}${incape ? "" : tr(", nu încape")}</span></label>`;
    }).join("")}</div>`;
}
/** Colțul zero-ului X / Y, în fișa G-code-ului (cheile din setări). */
const COLT: Record<string, string | undefined> = { "stanga-jos": "stânga jos", "dreapta-jos": "dreapta jos", "stanga-sus": "stânga sus", "dreapta-sus": "dreapta sus" };
const NUME_TAIAT: Record<string, string | undefined> = { stalp_strat: "Stâlp: strat", stalp_obraz: "Stâlp: obraz", opritor_bloc: "Bloc opritor" };
function numeTaiat(id: string) {
  // la doua fete, "stanga" se taie si pentru "dreapta" (intoarsa pe partea cealalta)
  if (setariCNC.doua_fete && id.endsWith("_stanga") && NUME[id.slice(0, -7) + "_dreapta"]) return tr`${tr(NUME[id]!)} (și dreapta, întoarsă)`;
  const fix = NUME_TAIAT[id] || NUME[id];
  if (fix) return tr(fix);
  if (LC_TITLU[id]) return LC_TITLU[id];
  const m = /^rampa_(?:(urcare|coborare)_)?strat_(\d+)$/.exec(id);
  if (m) return tr`Rampă${m[1] ? (m[1] === "urcare" ? tr(" urcare") : tr(" coborâre")) : ""}: strat ${m[2]}`;
  return id;
}
function continutPlaca(pl: NonNullable<typeof rezCNC>["placi"][number]) {
  const n: Record<string, number> = {}, p: Record<string, number> = {};
  for (const l of pl.locuri) { const o = l.inPlus ? p : n; o[l.piesa.nume] = (o[l.piesa.nume] || 0) + 1; }
  const lista = (o: Record<string, number>) => Object.entries(o).map(([k, v]): [number, string] => [v, numeTaiat(k)!]).sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1], "ro")).map(([v, t]) => v + " × " + t).join(", ");
  return lista(n) + (Object.keys(p).length ? tr`; în plus: ${lista(p)}` : "");
}
let arataTraseu = (() => { try { return localStorage.getItem("trenulet.traseu") !== "0"; } catch (e) { return true; } })();
let timpiCNC: Record<string, ReturnType<typeof TrenGCode.estimeazaTimp> | null> | null = null;      // { [numele fisierului]: estimarea } pentru rezCNC; null cat se calculeaza
// placa vazuta de dedesubt: intoarsa pe latura lunga (y -> H - y). La doua fete, dedesubt e fata 2, cu santurile oglindite;
// la o singura fata, dedesubt e lemnul gol, cu decupajul pieselor
let placaJos = (() => { try { return localStorage.getItem("trenulet.placaJos") === "1"; } catch (e) { return false; } })();
function svgPlacaUI(pl: NonNullable<typeof rezCNC>["placi"][number], i: number, W: number, H: number, margine: number, vizual: readonly { v: Parameters<typeof TrenCNC.caleSvg>[0]; punti: number[][] }[] | null | undefined,
  jos = false, douaFete = false, stifturi: { x: number[]; r: number } | null = null) {
  const c = pl.locuri.filter(l => !l.inPlus).map(l => TrenCNC.caleSvg(l.contur, true)).join(" ");
  const cp = pl.locuri.filter(l => l.inPlus).map(l => TrenCNC.caleSvg(l.contur, true)).join(" ");
  const peFata = !jos || douaFete;
  const sant = peFata ? pl.locuri.flatMap(l => [...l.santuri, ...(l.treceriLocas || [])]).map(v => TrenCNC.caleSvg(v, false)).join(" ") : "";
  const piv = peFata ? pl.locuri.flatMap(l => l.pivoti || []).map(v => [(v[0]![0] + v[1]![0]) / 2, (v[0]![1] + v[1]![1]) / 2]) : [];
  // traseul centrului frezei la decupare si puntile (cerculete rosii)
  const traseu = vizual && vizual.length ? vizual.map(b => TrenCNC.caleSvg(b.v, true)).join(" ") : "";
  const punti = vizual ? vizual.flatMap(b => b.punti) : [];
  // de sus: y in sus (oglindire fata de ecran); de dedesubt: placa intoarsa, deci fara oglindire
  return `<svg viewBox="-4 -4 ${W + 8} ${H + 8}" role="img" aria-label="${tr`Placa ${i + 1}, ${pl.locuri.length} piese, văzută ${jos ? tr("de dedesubt") : tr("de sus")}`}"><g${jos ? "" : ` transform="translate(0 ${H}) scale(1 -1)"`}>` +
    `<rect x="0" y="0" width="${W}" height="${H}" rx="3" fill="var(--panou-2)" stroke="var(--grila-tare)" stroke-width="3"/>` +
    (margine > 0 ? `<rect x="${margine}" y="${margine}" width="${W - 2 * margine}" height="${H - 2 * margine}" fill="none" stroke="var(--grila-tare)" stroke-width="1.5" stroke-dasharray="8 6"/>` : "") +
    `<path d="${c}" fill="var(--fag)" stroke="var(--fag-margine)" stroke-width="1.6" stroke-linejoin="round"${jos ? ` fill-opacity=".8"` : ""}/>` +
    (cp ? `<path d="${cp}" fill="var(--fag)" fill-opacity=".45" stroke="var(--fag-margine)" stroke-width="1.6" stroke-dasharray="6 4" stroke-linejoin="round"/>` : "") +
    `<path d="${sant}" fill="none" stroke="var(--sant)" stroke-width="6" stroke-linecap="round" opacity=".85"/>` +
    (traseu ? `<path d="${traseu}" fill="none" stroke="var(--semnal)" stroke-width="1.4" stroke-linejoin="round" opacity=".9"/>` : "") +
    piv.map(([x, y]) => `<circle cx="${x!.toFixed(1)}" cy="${y!.toFixed(1)}" r="3" fill="var(--text)" opacity=".7"/>`).join("") +
    // la doua fete, gaurile stifturilor de centrare (in margine), pe care se intoarce placa
    (douaFete && stifturi ? stifturi.x.map((x: number) => `<circle cx="${x.toFixed(1)}" cy="${(H / 2).toFixed(1)}" r="${stifturi.r.toFixed(1)}" fill="var(--panou)" stroke="var(--text-2)" stroke-width="1.5"/>`).join("") : "") +
    punti.map(([x, y]) => `<circle cx="${x!.toFixed(1)}" cy="${y!.toFixed(1)}" r="4.5" fill="var(--pericol)" stroke="var(--panou)" stroke-width="1.2"/>`).join("") +
    `</g></svg>`;
}
function durata(sec: number) {
  const m = Math.round(sec / 60);
  return m < 60 ? `${Math.max(1, m)} min` : tr`${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}
function profilMasina() {
  // profilul pentru estimarea timpului: din $$ lipit, sau cel din fabrica al GRBL 1.1h
  const t = (setariCNC.gcode.setariMasina || "").trim();
  if (!t || !window.TrenGCode) return { profil: window.TrenGCode && TrenGCode.PROFIL_GRBL_11H, din: "fabrica" };
  const r = TrenGCode.profilDinSetari(t);
  return r.ok ? { profil: r.profil, din: "$$", citite: r.citite } : { profil: TrenGCode.PROFIL_GRBL_11H, din: "fabrica", eroare: r.motiv + (r.linie ? tr` (linia ${r.linie})` : "") };
}
function randeazaPlaci() {
  const r = rezCNC;
  if (!r) { $("#cnc-placi").innerHTML = ""; return; }
  const [W, H] = r.setari.placa, g = r.gcode;
  $("#cnc-placi").innerHTML = r.placi.map((pl, i: number) => {
    // timpul fiecarui fisier al placii (fetele si frezele)
    let timp = "";
    if (g) {
      const ale = g.rezumat.filter(x => x.baza === `placa_${i + 1}` || x.baza.startsWith(`placa_${i + 1}_`));
      if (timpiCNC) timp = ale.map(x => { const t = timpiCNC![x.nume]; return `${x.baza.endsWith("fata1") ? tr("fața 1 ") : x.baza.endsWith("fata2") ? tr("fața 2 ") : ""}T${x.scula.numar} ≈ ${t && t.ok ? durata(t.secunde) : "?"}`; }).join(" · ");
      else timp = "calculez timpul…";
    }
    const fete = !!r.setari.doua_fete;
    return `<figure class="placa">${svgPlacaUI(pl, i, W, H, r.setari.placa_margine, arataTraseu && g ? g.vizual[i] : null, placaJos, fete,
      r.setari.stift_margine ? { x: [r.setari.stift_margine, W - r.setari.stift_margine], r: (r.setari.stift_d || 6) / 2 } : null)}` +
      `<figcaption><b>${tr`Placa ${i + 1}`}</b>${tr`${placaJos ? (fete ? tr(" · fața 2 (întoarsă pe latura lungă)") : tr(" · de dedesubt (întoarsă pe latura lungă): doar decupajul")) : ""} · ${pl.locuri.length} ${pl.locuri.length === 1 ? tr("bucată") : tr("bucăți")} · ${Math.round(pl.folosit * 100)}% din lemn`}` +
      (timp ? `<span class="mic timp">${timp}</span>` : "") + `<span class="mic">${continutPlaca(pl)}</span></figcaption></figure>`;
  }).join("");
}
function estimeazaTimpi() {
  // timpul fiecarui fisier G-code, cu modelul planificatorului GRBL 1.1h (cel din cvs2), pe rand, ca pagina sa nu inghete
  const r = rezCNC, nr = lucruCNC;
  const pm = profilMasina(), stare = $("#s-gcode-setariMasina-stare");
  if (stare) stare.textContent = pm.eroare ? tr`Nu am putut citi setările: ${pm.eroare}` : pm.din === "$$" ? tr`Citite ${pm.citite} setări de mișcare.` : "Fără ele, timpul e cu setările din fabrică ale GRBL (500 mm/min, 10 mm/s²), deci mult mai lung decât în realitate.";
  if (!r || !r.gcode) { $("#cnc-timp").textContent = ""; return; }
  timpiCNC = null; randeazaPlaci();
  const fis = r.gcode.rezumat.slice(), timpi: Record<string, ReturnType<typeof TrenGCode.estimeazaTimp>> = {};
  const opriri = r.gcode.strategie !== "fisiere-separate";
  $("#cnc-timp").textContent = "Calculez timpul de lucru…";
  const pas = () => {
    if (nr !== lucruCNC || r !== rezCNC) return;
    const x = fis.shift();
    if (x) {
      const f = r.fisiere.find(y => y.nume === x.nume);
      timpi[x.nume] = TrenGCode.estimeazaTimp(f!.text as string, pm.profil, opriri);
      setTimeout(pas, 0);
      return;
    }
    timpiCNC = timpi;
    randeazaPlaci();
    arataDeviz();
    const toate = Object.entries(timpi).filter(([nume]) => /placa_/.test(nume)), t = toate.reduce((a, [, e]) => a + (e.ok ? e.secunde : 0), 0);
    const lim = Object.values(timpi).reduce((a, e) => a + (e.ok ? e.liniiLimitate : 0), 0);
    const suma = (re: RegExp) => Object.entries(timpi).filter(([nume]) => re.test(nume)).reduce((a, [, e]) => a + (e.ok ? e.secunde : 0), 0);
    const cal = suma(/calibrare/), rmp = suma(/rampa_/);
    $("#cnc-timp").innerHTML = `${tr`Timp de lucru, după modelul GRBL 1.1h${pm.din === "$$" ? tr(" cu setările mașinii tale") : tr(", <b>cu setările din fabrică</b> (lipește $$ în secțiunea G-code)")}:`} <b>${durata(t)}</b>${tr(" pentru plăci")}` +
      (rmp ? tr`, plus ${durata(rmp)} finisarea ${r.gcode!.rezumat.filter(x => /rampa_/.test(x.baza)).length > 1 ? tr("rampelor") : tr("rampei")}` : "") +
      (cal ? tr`, plus ${durata(cal)} placa de calibrare` : "") + (opriri ? tr(", fără opririle pentru schimbarea frezei") : "") + "." +
      (lim ? tr` Avansul cerut trece de viteza maximă a mașinii pe ${lim} ${lim === 1 ? tr("linie") : tr("linii")}: controlerul îl taie.` : "");
  };
  setTimeout(pas, 30);
}
function pregatesteCNC(imediat: boolean) {
  // calculeaza placile (pe firul principal; dureaza sub o secunda la un circuit obisnuit)
  const n = numara(), lc = listaLC(), par = parametriCNC(), opt = optiuniCNC();
  const cheie = JSON.stringify([n, lc, par, opt]);
  const btn = $<HTMLButtonElement>("#e-dxf"), st = $("#cnc-stare");
  if (!window.TrenCNC || !window.Cavalier) { st.textContent = "Motorul de vectori nu s-a încărcat."; st.className = "mic eroare"; btn.disabled = true; return; }
  if (!Object.keys(n).length) { rezCNC = null; cheieCNC = null; $("#cnc-placi").innerHTML = ""; arataDeviz(); st.textContent = "Pune piese în circuit ca să ai ce freza."; st.className = "mic"; btn.disabled = true; butoaneCvs2(); return; }
  if (cheie === cheieCNC && rezCNC) { btn.disabled = false; butoaneCvs2(); return; }
  const nr = ++lucruCNC;
  btn.disabled = true; $<HTMLInputElement>("#e-cvs2").disabled = true; $<HTMLInputElement>("#e-gcode").disabled = true;
  st.textContent = "Așez piesele pe plăci…"; st.className = "mic puls";
  setTimeout(() => {
    if (nr !== lucruCNC) return;
    try {
      const t0 = performance.now();
      const r = TrenCNC.genereaza(n, lc, par as Parameters<typeof TrenCNC.genereaza>[2], opt as Parameters<typeof TrenCNC.genereaza>[3]);
      if (nr !== lucruCNC) return;
      for (const x of r.printate || []) if (x.nume.startsWith("cale_")) x.titlu = tr`${nume(x.nume.slice(5))}, printată`;
      rezCNC = r; cheieCNC = cheie;
      const [W, H] = r.setari.placa, total = Object.values(r.bucati).reduce((a, b) => a + b, 0);
      timpiCNC = null;
      randeazaPlaci();
      const rampe = ["rampa_urcare", "rampa_coborare"].filter(k => n[k]).length;
      const plus = Object.values(r.inPlus).reduce((a, b) => a + b, 0);
      const gc = r.gcode ? r.gcode.fisiere.length : 0;
      st.innerHTML = `<b>${tr`${r.placi.length} ${r.placi.length === 1 ? tr("placă") : tr("plăci")} de ${W} × ${H} mm`}</b>` + (r.setari.doua_fete ? tr(" (fiecare cu fața 1 și fața 2)") : "") +
        tr`, ${total} ${total === 1 ? tr("bucată") : tr("bucăți")} de tăiat` + (plus ? tr` și ${plus} în plus, din locul liber` : "") +
        (rampe && opt.continut.rampa ? (r.gcode ? tr`, plus finisarea ${rampe === 1 ? tr("rampei") : tr("rampelor")} (G-code și relief 3D)` : tr`, plus relieful 3D pentru ${rampe === 1 ? tr("rampă") : tr("rampe")}`) : "") +
        ((r.printate || []).length ? tr`; ${r.printate.reduce((t, x) => t + x.bucati, 0)} ${r.printate.reduce((t, x) => t + x.bucati, 0) === 1 ? tr("piesă") : tr("piese")} de printat` : "") +
        (gc ? tr`; ${gc} ${gc === 1 ? tr("fișier") : tr("fișiere")} G-code pentru ${r.gcode!.contract.nume}` : "") +
        (r.limbi && r.limbi.length ? tr`; ${nrLimbi(r)} ${nrLimbi(r) === 1 ? tr("limbă") : tr("limbi")} de macaz de printat` : "") + ` · ${fmt((performance.now() - t0) / 1000)} s` +
        (r.faraLimba && r.faraLimba.length ? `<br><span class="eroare">${tr`Fără limbă (nu încape): ${r.faraLimba.map(numeTaiat).join(", ")}.`}</span>` : "") +
        (r.gcode && r.gcode.avertismente.length ? `<br><span class="eroare">${r.gcode.avertismente.slice(0, 3).join(" ")}</span>` : "") +
        (r.necunoscute.length ? `<br><span class="eroare">${tr`Nu știu să tai: ${r.necunoscute.map(nume).join(", ")}.`}</span>` : "");
      st.className = "mic";
      btn.disabled = false;
      butoaneCvs2();
      arataDeviz();
      estimeazaTimpi();
    } catch (e) {
      if (nr !== lucruCNC) return;
      rezCNC = null; cheieCNC = null; butoaneCvs2();
      $("#cnc-placi").innerHTML = ""; $("#cnc-timp").textContent = ""; arataDeviz();
      const piesa = e && (e as { piesa?: unknown }).piesa;
      st.textContent = typeof piesa === "string" ? tr`${numeTaiat(piesa)} nu încape pe placa de ${setariCNC.placa[0]} × ${setariCNC.placa[1]} mm (cu marginea). Mărește placa din setări.`
                         : tr`Nu am putut calcula fișierele: ${e && (e as Error).message || e}`;
      st.className = "mic eroare";
    }
  }, imediat ? 60 : 20);
}
// cate limbi se printeaza: una pe macaz; la doua fete, cate una pentru fiecare fata
const nrLimbi = (r: NonNullable<typeof rezCNC>) => (r.limbi || []).reduce((t: number, x) => t + x.bucati * (r.setari.doua_fete ? 2 : 1), 0);
// devizul: plăcile, filamentul (limbile si piesele printate) si timpul de frezare (cand s-a calculat)
function deviz(r: NonNullable<typeof rezCNC>) {
  const s = setariCNC, fete = r.setari.doua_fete, nPl = r.placi.length;
  const gLimbi = (r.limbi || []).reduce((t: number, x) => t + x.grame * x.bucati * (fete ? 2 : 1), 0);
  const gPrint = (r.printate || []).reduce((t: number, x) => t + x.grame * x.bucati, 0);
  const grame = gLimbi + gPrint, lemn = s.pret_placa > 0 ? nPl * s.pret_placa : 0, fil = grame * s.pret_filament / 1000;
  let sec = null;
  if (r.gcode && timpiCNC) sec = Object.entries(timpiCNC).filter(([n]) => !/calibrare/.test(n)).reduce((a, [, e]) => a + (e!.ok ? e!.secunde : 0), 0);
  const folosit = Math.round(r.placi.reduce((t, p) => t + p.folosit, 0) / Math.max(1, nPl) * 100);
  return { nPl, folosit, lemn, grame, gLimbi, gPrint, fil, sec, total: lemn + fil };
}
const lei = (v: number) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(".", Limba.zecimal) + " lei";
const grameT = (g: number) => (g >= 1000 ? fmt(g / 1000) + " kg" : Math.max(1, Math.round(g / 5) * 5) + " g");
function arataDeviz() {
  const el = $("#cnc-deviz"), r = rezCNC;
  if (!el) return;
  if (!r) { el.innerHTML = ""; return; }
  const d = deviz(r), s = setariCNC;
  el.innerHTML = `<b>Deviz:</b> ${tr`${d.nPl} ${d.nPl === 1 ? tr("placă") : tr("plăci")} (în medie ${d.folosit}% folosit)`}` + (d.lemn ? ` = ${lei(d.lemn)}` : "") +
    (d.grame ? tr` · filament ≈ ${grameT(d.grame)}` + (s.pret_filament ? ` = ${lei(d.fil)}` : "") : "") +
    (d.sec !== null ? tr` · frezare ≈ ${durata(d.sec)}` : r.gcode ? tr(" · frezare: calculez…") : "") +
    (d.lemn || d.fil ? ` · <b>${tr`total ≈ ${lei(d.total)}`}</b>` : "") + (!s.pret_placa ? ` <span class="mic">(pune prețul plăcii la Deviz)</span>` : "");
}
function textCiteste(r: NonNullable<typeof rezCNC>) {
  const s = setariCNC, ce = s.continut, g = s.gcode, [W, H] = r.setari.placa, R = "\r\n", T = s.tesire;
  const rampe = ["rampa_urcare", "rampa_coborare"].filter(k => r.fisiere.some(f => f.nume === `piese/${k}_relief.stl`));
  const k = r.gcode && r.gcode.contract;
  const zero = { "stanga-jos": tr("colțul din stânga-jos"), "dreapta-jos": tr("colțul din dreapta-jos"), "stanga-sus": tr("colțul din stânga-sus"), "dreapta-sus": tr("colțul din dreapta-sus") }[g.origine];
  const tesire = T.tip === "v" ? tr`freză în V de ${T.unghi}°, teșitură de ${fmtS(T.latime)} mm${T.santuri ? tr` (și marginile șanțurilor, ${fmtS(T.latimeSant)} mm)` : ""}` : T.tip === "rotunjire" ? tr`freză de rotunjit R${fmtS(T.raza)}, vârf Ø${fmtS(T.varf)} mm` : "";
  const l = [
    tr("TRENULEȚ — fișierele pentru CNC"),
    tr`Circuit: ${stare.nume || tr("circuit")} · ${new Date().toLocaleString(Limba.locala)}`,
    tr`Setări: freză ${fmtS(s.freza)} mm · ciupercă tată ${s.varianta_tata} · locaș mamă ${s.varianta_mama} · evazare ${fmtS(s.evazare)} mm · placă ${W} × ${H} mm, margine ${fmtS(r.setari.placa_margine)} mm, ${fmtS(r.setari.distanta_piese)} mm între piese${r.setari.doua_fete ? tr(" · șanțuri pe ambele fețe") : ""}${tesire ? tr(" · teșire: ") + tesire : ""}.`,
    "",
    tr("CE E ÎN ARHIVĂ"),
    ...(r.gcode ? [tr`- gcode/ — programele pentru ${k!.nume}${k!.probat ? "" : tr(" (post NEPROBAT: rulează-l întâi în aer, cu Z ridicat)")}, gata de trimis la mașină: ` +
      (r.gcode.strategie === "fisiere-separate" ? tr("câte un fișier pe freză (_T1 freza dreaptă, _T2 freza de teșit).") : r.gcode.strategie === "m6-controler" ? tr("câte un fișier pe placă; freza o schimbă controlerul (M6).") : tr("câte un fișier pe placă; la schimbarea frezei programul se oprește (M0)."))] : []),
    ...(ce.dxfPlaci ? (r.setari.doua_fete
      ? [tr("- placi/placa_N_fata1.dxf și placi/placa_N_fata2.dxf — vectorii pentru ArtCAM, câte două pe placă (vezi ȘANȚURI PE AMBELE FEȚE).")]
      : [tr("- placi/placa_N.dxf — vectorii pentru ArtCAM: piesele așezate pe placă (originea în colțul din stânga-jos).")]) : []),
    ...(ce.svg ? [tr("- placi/placa_N.svg — imaginea plăcii.")] : []),
    ...(ce.dxfPiese ? [tr("- piese/<nume>.dxf — fiecare piesă, separat.")] : []),
    ...(rampe.length ? [tr("- piese/rampa_*_santuri.dxf și piese/rampa_*_relief.stl — pentru finisarea rampei; piese/rampa_*_finisata.stl — cum trebuie să iasă.")] : []),
    ...((r.printate || []).length && ce.printate ? [tr("- printate/<piesa>.stl — piesele de printat: ") + r.printate.map(x => `${x.bucati} × ${x.titlu}`).join(", ") + tr(" (vezi PIESE PRINTATE).")] : []),
    ...(r.limbi && r.limbi.length && ce.limbi ? [tr`- limbi/limba_<macaz>.stl — limbile macazurilor, gata de printat${r.setari.doua_fete ? tr(" (_spate.stl: cele pentru spatele pieselor)") : ""}; limbi/limba_<macaz>.dxf — conturul lor (vezi MACAZURI CU LIMBĂ).`] : []),
    ...(ce.calibrare ? [tr`- placa de calibrare (prima placă de frezat)${ce.dxfPlaci || ce.dxfPiese ? ": calibrare/placa_calibrare.dxf" : ""}${r.gcode ? (ce.dxfPlaci || ce.dxfPiese ? tr(" și ") : ": ") + "gcode/calibrare*" : ""}.`] : []),
    tr("- circuit.json — lista de piese a circuitului."),
    "",
    tr("STRATURI (în DXF) ȘI OPERAȚII (în G-code)"),
    tr("- CONTUR: forma piesei, se decupează complet (în G-code, cu punți)."),
    tr("- SANTURI: traseul frezei pentru șanțuri (linia de mijloc), 3 mm adâncime. Liniile scurte de la capete sunt intrările evazate."),
    tr("- MARCAJE: puncte frezate la 1 mm (numerele de pe placa de calibrare și de pe straturile rampei)."),
    ...(r.limbi && r.limbi.length ? [tr("- LOCAS: traseul frezei prin locașul limbii de macaz (linia de mijloc a fiecărei treceri), la adâncimea șanțului, 3 mm."),
      tr`- PIVOT: gaura pivotului limbii, Ø${fmtS(s.freza)} mm (o coborâre cu freza dreaptă în centrul cercului), adâncă de ${fmtS(3 + r.setari.pivot_adancime)} mm de la fața plăcii.`] : []),
    ...(tesire ? [tr("- TESIRE: traseul frezei de teșit (cu V-ul, vârful pe muchie; cu freza de rotunjit, centrul la jumătatea vârfului în afară).")] : []),
    ...(r.setari.doua_fete ? [tr("- GAURI: găurile pentru cele două știfturi de aliniere (doar la două fețe).")] : []),
    tr("- PLACA: marginea plăcii. Doar ca reper, nu se frezează."),
  ];
  if (r.gcode) l.push("",
    tr("G-CODE, DIRECT LA MAȘINĂ"),
    tr`1. Prinde placa de ${W} × ${H} mm cu fibra de-a lungul laturii lungi. Zero X / Y în ${zero}, zero Z ${g.z0 === "sus" ? tr("pe fața de sus a plăcii") : tr("pe masă (placa de sacrificiu)")}.`,
    tr`2. Freza dreaptă de ${fmtS(s.freza)} mm (T1). Programul: ${r.setari.doua_fete ? tr("pe fața 1 găurile pentru știfturi, ") : ""}marcajele (1 mm), șanțurile (3 mm, în pași de ${fmtS(g.pasSant)} mm)${r.limbi && r.limbi.length ? tr(", locașurile limbilor (tot 3 mm) și gaurile pivoților") : ""}, apoi decuparea la ${fmtS(12 + g.supracursa)} mm, în pași de cel mult ${fmtS(g.pasContur)} mm, cu ${g.urechi.numar} punți de ${fmtS(g.urechi.latime)} × ${fmtS(g.urechi.grosime)} mm pe piesă.`,
    tr`   Turație ${g.turatie} rot/min, avans ${g.avans} mm/min, coborâre ${g.avansPlonjare} mm/min, Z sigur ${fmtS(g.zSigur)} mm.`,
    ...(g.rampa ? [tr`   La decupare freza nu plonjează: coboară pe o rampă de ${fmtS(g.lungimeRampa)} mm de-a lungul conturului și taie toate trecerile fără să se ridice (ca în cvs2).`] : []),
    ...(tesire ? [tr`3. Teșirea (T${g.tesire.numar}, ${tesire}): după decupare, cât piesele stau în punți. ${r.gcode.strategie === "fisiere-separate" ? tr("E fișierul _T") + g.tesire.numar + tr(": schimbi freza, refaci zero Z, apoi îl pornești.") : r.gcode.strategie === "m6-controler" ? tr("Freza o schimbă controlerul (M6).") : tr("Programul se oprește (M0): schimbi freza, refaci zero Z, apoi pornești din nou.")}`] : []),
    tr`${tesire ? "4" : "3"}. Taie punțile cu o daltă sau un cuțit și șlefuiește locul lor.`,
    tr("Cu CNC Vector Studio 2: în panoul mașinii, „Fișier…” și alegi fișierul (sau, când cvs2 are primirea de lucrări, butonul"),
    tr("„Trimite la cvs2” din planificator i le dă direct). gcode/lucrare_cvs2.json are ordinea fișierelor și amprenta SHA-256 a fiecăruia."));
  if (r.setari.doua_fete) l.push("",
    tr("ȘANȚURI PE AMBELE FEȚE"),
    tr("Curbele și macazurile se taie doar în varianta „stânga”: întoarsă pe partea cealaltă, fiecare devine varianta „dreapta”, ca la Brio."),
    tr("1. Fața 1 (placa_N_fata1): găurile pentru știfturi, prin placă și încă 5 mm în placa de sacrificiu (la 7,5 mm de capetele plăcii), apoi marcajele și șanțurile."),
    tr`2. Întoarce placa pe latura lungă (cea de ${Math.max(W, H)} mm) și pune două știfturi de 6 mm prin găuri, în placa de sacrificiu.`,
    tr("3. Fața 2 (placa_N_fata2): șanțurile de pe spate, apoi decuparea. Totul e deja oglindit."));
  l.push("",
    tr("CALIBRAREA (o singură dată, înainte de piese)"),
    tr`1. Frezează placa de calibrare: ${r.gcode ? tr("gcode/calibrare* (pusă în colțul plăcii, la margine)") : "calibrare/placa_calibrare.dxf"}${ce.dxfPlaci && r.gcode ? tr(" sau, în ArtCAM, DXF-ul ei") : ""}.`,
    tr("2. Măsoară cu șublerul lățimea șanțului lung din mijloc și scrie-o în planificator, la Export CNC › Setări de frezare › Freza reală."),
    tr("   Sub 6 mm, fiecare șanț primește două treceri alăturate, ca să iasă tot de 6 mm."),
    tr("3. Locașurile mamă sunt pe marginea de jos. Încearcă în fiecare o piesă Brio cu ciupercă și alege-l pe cel în care intră ușor, fără joc mare."),
    tr("   Numără punctele de lângă el (1–5) și scrie numărul la Locaș mamă."),
    tr("4. Ciupercile tată sunt pe marginea de sus. Pune pe fiecare o piesă Brio cu locaș, alege-o pe cea mai bună și scrie numărul ei la Ciupercă tată."),
    tr("5. Descarcă din nou arhiva: toate piesele se refac cu noile mărimi."));
  if (ce.dxfPlaci) l.push("",
    tr("FREZARE ÎN ARTCAM (cu DXF-ul)"),
    tr`1. Model nou de ${W} × ${H} mm, cu originea în colțul din stânga-jos. Importă placi/placa_1.dxf (Import Vector), în milimetri.`,
    tr("2. MARCAJE (dacă există): Machine Along Vector, 1 mm."),
    tr("3. SANTURI: Machine Along Vector, end mill 6 mm, adâncime finală 3 mm, în pași de 1,5 mm."),
    ...(r.limbi && r.limbi.length ? [tr`3b. LOCAS: Machine Along Vector, end mill 6 mm, 3 mm, ca șanțurile. PIVOT: Drilling cu freza de 6 mm în centrul cercului, ${fmtS(3 + r.setari.pivot_adancime)} mm.`] : []),
    tr("4. CONTUR: Profile, Outside (în exterior), adâncime finală 12,3 mm, pași de 3 mm, cu 2–3 punți (tabs) pe piesă, înalte de 2–3 mm."),
    ...(tesire ? [tr("5. TESIRE: Machine Along Vector, cu freza de teșit, la adâncimea din G-code (teșitura împărțită la tangenta jumătății de unghi).")] : []));
  if (r.limbi && r.limbi.length) {
    const fete = r.setari.doua_fete, rs = s.freza / 2 - 0.2;
    l.push("",
      tr("MACAZURI CU LIMBĂ"),
      tr("Ca la Brio: în șanțul în care se despart cele două căi stă o limbă care se rotește pe un știft. Într-o poziție își lipește vârful de peretele unui șanț și duce roata în celălalt; în cealaltă poziție, invers."),
      tr("Un tren care vine din ramura închisă împinge singur limba în partea cealaltă (e o pană lungă, cu unghi mic), deci macazul nu deraiază trenurile care se întorc."),
      tr`1. Printează limbile din dosarul limbi (${r.limbi.map(x => `${x.bucati * (fete ? 2 : 1)} × ${x.nume}${fete ? tr(" (jumătate normale, jumătate _spate)") : ""}`).join(", ")}).`,
      tr("   Sunt deja întoarse: fața de sus a limbii (cea dinspre roți) stă pe masa imprimantei, știftul e în sus. Fără suporturi; PLA sau PETG, strat de 0,2 mm, 100% umplere, 3 perimetre."),
      tr`   Limba e groasă de ${fmtS(3 - 0.2)} mm (cu 0,2 mm sub fața șinei), știftul are Ø${fmtS(2 * rs)} mm și e lung de ${fmtS(Math.max(0.5, r.setari.pivot_adancime - 0.3))} mm.`,
      tr("2. Curăță locașul și gaura de așchii. Pune limba cu știftul în gaură: trebuie să se rotească liber, fără să se blocheze în niciuna din poziții."),
      tr`   Dacă freacă, mărește „Jocul limbii” (acum ${fmtS(r.setari.limba_joc)} mm) și printează din nou doar limba; dacă joacă prea mult, micșorează-l.`,
      tr("3. Încearcă întâi un singur macaz, cu un vagon împins de mână, în ambele sensuri și din ambele ramuri. Abia apoi frezează restul."),
      ...(fete ? [tr("4. La două fețe, fiecare macaz are locaș pe ambele fețe: limba normală pe fața de sus, cea _spate pe fața de jos (dacă o întorci, o muți).")] : []),
      tr("Limba se poate scoate din locaș și e o piesă mică: ține-o departe de copiii care încă bagă lucruri în gură."),
      tr("Dacă o limbă se pierde, macazul merge și fără ea, dar trenul alege ramura după cum vine."));
  }
  if (rampe.length) l.push("",
    tr("RAMPA ÎN S"),
    tr("1. Straturile rampei (Rampă: strat 1…6) se taie din placă, odată cu celelalte piese. Punctele frezate pe ele arată numărul stratului."),
    tr("2. Lipește-le în ordine (1 jos, 6 sus), aliniate la capătul înalt și pe laturi. Iese un bloc în trepte, înalt de 72 mm."),
    ...(r.gcode && r.gcode.rezumat.some(x => /rampa_/.test(x.baza)) ? [
      tr`3. Cu G-code (gcode/rampa_urcare* / rampa_coborare*), freza dreaptă de ${fmtS(s.freza)} mm: prinde blocul pe masă, cu latura lungă paralelă cu X și capătul de jos (cel subțire) spre X mic.`,
      tr`   Zero X pe fața capătului de jos (fața de lemn, nu ciuperca), zero Y pe latura lungă, ${g.z0 === "sus" ? tr("zero Z pe fața de sus a capătului înalt (vârful blocului, 72 mm)") : tr("zero Z pe masă")}.`,
      tr("   Programul: degroșarea în trepte de câte ") + fmtS(g.pasContur) + tr(" mm (lasă 0,5 mm), finisarea cu treceri la 1 mm de-a lungul rampei, apoi cele două șanțuri, de 3 mm sub suprafață."),
      tr("   Freza trebuie să iasă cel puțin 25 mm din pensetă: coboară până la 63 mm sub vârful blocului, iar piulița nu trebuie să atingă treptele."),
      tr("   Suprafața iese cu creste sub 0,06 mm; șanțurile ies întregi, cu fundul ridicat cu cel mult 0,7 mm lângă pereți, unde rampa e cea mai abruptă."),
      tr("4. Sau, în ArtCAM: importă piese/rampa_*_relief.stl ca model 3D (colțul în (0, 0), baza la Z = 0), finisează cu freza de 6 mm la pas de 0,5 mm,"),
      tr("   apoi piese/rampa_*_santuri.dxf cu Machine Along Vector și Project toolpath onto relief, la 3 mm.")] : [
      tr("3. Finisarea 3D în ArtCAM: importă piese/rampa_*_relief.stl ca model 3D, cu colțul în (0, 0) și baza la Z = 0; pune blocul lipit exact peste el;"),
      tr("   finisează suprafața cu freza de 6 mm, cu pas lateral mic (0,5 mm), paralel cu lungimea rampei."),
      tr("4. Șanțurile: importă piese/rampa_*_santuri.dxf și frezează SANTURI cu Machine Along Vector și Project toolpath onto relief, la 3 mm.")]),
    tr("5. piese/rampa_*_finisata.stl arată cum trebuie să iasă la final."),
    tr("Verifică întâi dacă un bloc de 72 mm încape sub portalul mașinii."));
  if ((r.printate || []).length) l.push("",
    tr("PIESE PRINTATE"),
    ...r.printate.map(x => tr`- ${x.bucati} × ${x.titlu}: ${x.dim.map((v: number) => fmt(v)).join(" × ")} mm, cam ${grameT(x.grame)} bucata.`),
    tr("Toate sunt deja așezate pentru printare, fără suporturi: PLA, strat de 0,2 mm, 3 perimetre, umplere 15% (opritorul 25%)."),
    ...(r.printate.some(x => x.nume === "tunel") ? [tr`Tunelul se printează în picioare, pe portal (150 mm înălțime de printare); înăuntru are ${fmt(Math.min(165, 12 + (s.inaltime_tren || 70) + 10))} mm de la masă${s.inaltime_tren ? "" : tr(" (trenul nu e măsurat: am pus 70 mm; scrie-l în lista de piese)")}.`] : []),
    ...(r.printate.some(x => x.nume.startsWith("stalp_")) ? [tr("Stâlpii printați înlocuiesc straturile de placă: piesele de pod stau între obraji, ca la cei din lemn.")] : []),
    ...(r.printate.some(x => x.nume === "opritor_tampoane") ? [tr("Opritorul cu tampoane se lipește pe ultimii 18 mm ai opritorului, cu tampoanele spre capătul șanțurilor.")] : []),
    ...(r.printate.some(x => x.nume.startsWith("cale_")) ? [tr`Piesele de cale printate stau culcate, cu șanțurile în sus (PLA sau PETG, 3 perimetre, umplere 15–20%). Cuplajele au variantele de printare: tată ${s.print_tata}, mamă ${s.print_mama} (3 = cele de la frezare).`] : []),
    ...(r.printate.some(x => x.nume.startsWith("proba_cuplaj_")) ? [tr("Proba cuplajelor: cinci bucăți scurte; câte cuburi mici au pe mijloc, atâta e varianta. Bagă tatăl fiecăreia într-o piesă de lemn și o piesă de lemn în mama ei. Alege varianta care intră fără forță și fără joc, separat pentru tată și pentru mamă, și scrie-le la „Cuplaj tată / Locaș mamă, la piesele printate” (Export CNC → Piese printate 3D). Fiecare punct înseamnă 0,1 mm pe fiecare parte.")] : []));
  { const d = deviz(r);
    l.push("", "DEVIZ",
      tr`- Lemn: ${d.nPl} ${d.nPl === 1 ? tr("placă") : tr("plăci")} de ${W} × ${H} mm (în medie ${d.folosit}% folosit)${d.lemn ? ` × ${lei(s.pret_placa)} = ${lei(d.lemn)}` : ""}.`,
      ...(d.grame ? [tr`- Filament: cam ${grameT(d.grame)}${d.gLimbi && d.gPrint ? tr` (limbi ${grameT(d.gLimbi)}, alte piese ${grameT(d.gPrint)})` : d.gLimbi ? tr(" (limbile macazurilor)") : ""}${s.pret_filament ? tr` × ${lei(s.pret_filament)}/kg = ${lei(d.fil)}` : ""}.`] : []),
      ...(d.sec !== null ? [tr`- Frezare: ${durata(d.sec)} (plăci și rampe, fără placa de calibrare și fără schimbările de freză)${profilMasina().din === "$$" ? "" : tr(", cu setările din fabrică ale GRBL")}.`] : []),
      ...(d.lemn || d.fil ? [tr`- Total: cam ${lei(d.total)}.`] : [])); }
  l.push("", tr("PLĂCILE"));
  r.placi.forEach((pl, i: number) => {
    const t = r.gcode && timpiCNC ? r.gcode.rezumat.filter(x => x.baza === `placa_${i + 1}` || x.baza.startsWith(`placa_${i + 1}_`))
      .map(x => { const e = timpiCNC![x.nume]; return e && e.ok ? `${x.nume.split("/").pop()} ≈ ${durata(e.secunde)}` : ""; }).filter(Boolean).join(", ") : "";
    l.push(tr`Placa ${i + 1} (${pl.locuri.length} bucăți): ${continutPlaca(pl)}.` + (t ? tr` Timp estimat${profilMasina().din === "$$" ? "" : tr(" (cu setările din fabrică ale GRBL)")}: ${t}.` : ""));
  });
  return l.join(R) + R;
}
async function descarcaDXF() {
  if (!rezCNC) return;
  const r = rezCNC;
  const numeF = (stare.nume || "circuit").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase() || "circuit";
  const fisiere = [{ nume: tr("CITESTE.txt"), text: textCiteste(r) }, ...r.fisiere, { nume: "circuit.json", text: jsonExport() }];
  if (r.gcode) { try { fisiere.push({ nume: "gcode/lucrare_cvs2.json", text: JSON.stringify(fisaLucrarii(await lucrareCvs2(r)), null, 2) + "\n" }); } catch (e) { /* fara fisa */ } }
  const date = TrenCNC.zip(fisiere);
  const fisier = numeF + "_cnc.zip";
  const dl = await (window.claude ? window.claude.use("downloads") : null);
  if (!dl) {   // copia locala (fara Claude): descarcare obisnuita din browser
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([date as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
    a.download = fisier; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return;
  }
  try { await dl.save({ filename: fisier, data: new Blob([date as Uint8Array<ArrayBuffer>], { type: "application/zip" }) }); toast("Arhiva e salvată."); }
  catch (e) { if (e && (e as { code?: string }).code !== "declined") toast(e && (e as { code?: string }).code === "rate_limited" ? "Mai e o salvare deschisă." : "Nu am putut salva arhiva."); }
}

// ----------------------------------------------------------------------------- legatura cu cvs2
// Protocolul "cvs2-lucrare" (cvs2/PROTOCOL_CVS2.md): planificatorul deschide cvs2 intr-o fila noua, la #primeste-lucrare,
// si il intreaba ("cauta") pana raspunde "gata"; atunci ii trimite lucrarea: fisierele G-code (text ASCII cu LF), fiecare
// cu SHA-256-ul lui, in ordinea in care se taie. cvs2 le verifica ca pe un fisier adus cu "Fisier..." si raspunde "primit".
// Mesajele pleaca doar spre originea din setari, iar raspunsurile se iau doar de la fila deschisa de aici.
const VERSIUNE = "11";
const PROTOCOL_CVS2 = "cvs2-lucrare";
function adresaCvs2(v: unknown) {
  let t = String(v || "").trim();
  if (t && !/^[a-z][a-z0-9+.-]*:/i.test(t)) t = (/^(localhost|127\.0\.0\.1)(:|\/|$)/.test(t) ? "http://" : "https://") + t;
  try {
    const u = new URL(t);
    if (u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname))) return u.origin + u.pathname + u.search;
  } catch (e) { /* nu e o adresa */ }
  return null;
}
function originea(a: string) { try { return new URL(a).origin; } catch (e) { return null; } }
// SHA-256: cu crypto.subtle cand se poate, altfel cu varianta de mai jos (aceeasi amprenta)
const K256 = (() => {
  const p: number[] = [];
  for (let n = 2; p.length < 64; n++) if (p.every(q => n % q)) p.push(n);
  const f = (x: number) => ((x - Math.floor(x)) * 2 ** 32) >>> 0;
  return { k: p.map(q => f(Math.cbrt(q))), h: p.slice(0, 8).map(q => f(Math.sqrt(q))) };
})();
function sha256Js(b: Uint8Array) {
  const l = b.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
  m.set(b); m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l / 2 ** 29));
  const H = K256.h.slice(), K = K256.k, W = new Uint32Array(64), r = (x: number, k: number) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + 4 * i);
    for (let i = 16; i < 64; i++) { const a = W[i - 15], c = W[i - 2]; W[i] = (W[i - 16]! + (r(a!, 7) ^ r(a!, 18) ^ (a! >>> 3)) + W[i - 7]! + (r(c!, 17) ^ r(c!, 19) ^ (c! >>> 10))) >>> 0; }
    let [a, b2, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h! + (r(e!, 6) ^ r(e!, 11) ^ r(e!, 25)) + ((e! & f!) ^ (~e! & g!)) + K[i]! + W[i]!) >>> 0;
      const t2 = ((r(a!, 2) ^ r(a!, 13) ^ r(a!, 22)) + ((a! & b2!) ^ (a! & c!) ^ (b2! & c!))) >>> 0;
      h = g; g = f; f = e; e = (d! + t1) >>> 0; d = c; c = b2; b2 = a; a = (t1 + t2) >>> 0;
    }
    [a, b2, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i]! + v!) >>> 0; });
  }
  return H.map(x => x.toString(16).padStart(8, "0")).join("");
}
async function sha256Hex(text: string) {
  const b = new TextEncoder().encode(text);
  try {
    if (window.crypto && crypto.subtle) return [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))].map(x => x.toString(16).padStart(2, "0")).join("");
  } catch (e) { /* fara crypto.subtle */ }
  return sha256Js(b);
}
async function lucrareCvs2(r: NonNullable<typeof rezCNC>, id?: string) {
  // lucrarea: fisierele G-code ale exportului, in ordinea de taiere, cu ce trebuie stiut la masina
  const g = r.gcode, fisiere = [];
  for (const x of g!.rezumat) {
    const f = r.fisiere.find(y => y.nume === x.nume);
    if (!f) continue;
    const t = timpiCNC && timpiCNC[x.nume];
    const m = /^(?:placa_(\d+)(?:_fata([12]))?|(calibrare)|(rampa_\w+?))(?:_T\d+)?$/.exec(x.baza) || [];
    fisiere.push({
      nume: x.nume.replace(/^gcode\//, ""), text: f.text, sha256: await sha256Hex(f.text as string), octeti: new TextEncoder().encode(f.text as string).length,
      rol: m[1] ? "placa" : m[3] ? "calibrare" : m[4] ? "rampa" : "alt", placa: m[1] ? +m[1] : null, fata: m[2] ? +m[2] : null,
      scula: x.scula ? `T${x.scula.numar} ${x.scula.nume}${x.scula.diametru ? " D" + (+x.scula.diametru).toFixed(3) : ""}` : null,
      linii: x.linii || null, timp_s: t && t.ok ? Math.round(t.secunde) : null,
    });
  }
  const s = r.setari, gs = setariCNC.gcode;
  return {
    protocol: PROTOCOL_CVS2, versiune: 1, tip: "lucrare", id: id || "l" + Date.now().toString(36),
    de_la: { aplicatie: "Planificator Trenuleț", versiune: VERSIUNE }, titlu: stare.nume || "Circuit", creat: new Date().toISOString(),
    controler: g!.contract.nume, strategie: g!.strategie,
    montaj: { origine: gs.origine, z0: gs.z0, foaie: { latime: s.placa[0], inaltime: s.placa[1], grosime: s.grosime }, doua_fete: !!s.doua_fete },
    fisiere,
  };
}
// fisa lucrarii fara textele (pentru arhiva): numele, amprentele, ordinea
const fisaLucrarii = (l: Awaited<ReturnType<typeof lucrareCvs2>>) => ({ ...l, tip: "fisa", fisiere: l.fisiere.map(({ text, ...f }) => f) });
function butoaneCvs2() {
  const ok = !!(rezCNC && rezCNC.gcode);
  $<HTMLInputElement>("#e-cvs2").disabled = !ok; $<HTMLInputElement>("#e-gcode").disabled = !ok;
  randeazaMasina();
}
let legaturaCvs2: { w: Window | null; origine: string; id: string; lucrare: Awaited<ReturnType<typeof lucrareCvs2>> | null; gata: boolean; trimis: boolean; t0: number;
  cron: ReturnType<typeof setInterval> | null } | null = null;   // { w, origine, id, lucrare, gata, trimis, t0, cron }
function stareCvs2(html: string, fel?: string) {
  const el = $("#cvs2-stare");
  el.hidden = !html; el.innerHTML = html || ""; el.className = "mic cvs2-stare" + (fel ? " " + fel : "");
}
function opresteLegatura() { if (legaturaCvs2) { clearInterval(legaturaCvs2.cron!); legaturaCvs2 = null; } }
const BTN_GCODE = `<button class="btn" type="button" data-cvs2="gcode">Descarcă doar G-code-ul (.zip)</button>`;
function trimiteLaCvs2() {
  const r = rezCNC;
  if (!r) return;
  if (!r.gcode) { stareCvs2("cvs2 primește G-code: bifează „G-code direct” la „Ce pun în arhivă”.", "rau"); return; }
  if (!["grbl-11", "grblhal", "fluidnc"].includes(setariCNC.gcode.controler)) {
    stareCvs2(tr`cvs2 trimite la mașini din familia GRBL (GRBL 1.1, grblHAL, FluidNC); fișierele sunt pentru ${r.gcode.contract.nume}. Alege controlerul la „G-code”.`, "rau");
    return;
  }
  if (r.gcode.strategie === "m6-controler") {
    stareCvs2(`Fișierele au schimbarea frezei cu <b>M6</b>, iar cvs2 nu primește M6 într-un fișier care nu e al lui. <button class="btn" type="button" data-cvs2="separate">Treci pe „Un fișier pe freză”</button>`, "rau");
    return;
  }
  const adresa = setariCNC.cvs2.adresa, origine = originea(adresa);
  if (!origine) { stareCvs2("Adresa lui cvs2 din setări nu e bună.", "rau"); $<HTMLDetailsElement>("#det-cvs2").open = true; return; }
  opresteLegatura();
  let w = null;
  try { w = window.open(adresa + "#primeste-lucrare", "cvs2"); } catch (e) { w = null; }
  if (!w) { stareCvs2(tr`Browserul n-a lăsat pagina să deschidă o filă nouă. Deschide copia de pe calculator (planificator.html) sau încarcă G-code-ul în cvs2 cu „Fișier…”. ${BTN_GCODE}`, "rau"); return; }
  const id = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const L = legaturaCvs2 = { w, origine, id, lucrare: null, gata: false, trimis: false, t0: Date.now(), cron: null } as NonNullable<typeof legaturaCvs2>;
  stareCvs2(tr`Am deschis cvs2 (${origine.replace(/^https?:\/\//, "")}). Aștept să răspundă…`);
  lucrareCvs2(r, id).then(l => { if (legaturaCvs2 === L) { L.lucrare = l; trimiteLucrarea(L); } })
    .catch(e => { if (legaturaCvs2 === L) { opresteLegatura(); stareCvs2(tr`Nu am putut pregăti fișierele: ${e.message || e}`, "rau"); } });
  L.cron = setInterval(() => {
    if (legaturaCvs2 !== L) return;
    const dt = Date.now() - L.t0;
    if (L.w!.closed) {
      opresteLegatura();
      stareCvs2(dt < 4000 ? tr`Browserul a despărțit fila lui cvs2 de pagina asta (din claude.ai se întâmplă). Din copia de pe calculator (planificator.html) merge; până atunci, încarcă G-code-ul în cvs2 cu „Fișier…”. ${BTN_GCODE}`
                          : "Fila lui cvs2 s-a închis înainte să primească lucrarea.", "rau");
      return;
    }
    // il intreb pe cvs2 daca e gata (pleaca doar daca fila e deja la originea lui cvs2)
    if (!L.gata) { try { L.w!.postMessage({ protocol: PROTOCOL_CVS2, versiune: 1, tip: "cauta" }, L.origine); } catch (e) { /* inca se incarca */ } }
    if (!L.gata && dt > 20000) {
      opresteLegatura();
      stareCvs2(tr`cvs2 nu a răspuns. Probabil nu are încă primirea de lucrări (cvs2/PROTOCOL_CVS2.md). Până atunci: în cvs2, panoul mașinii → „Fișier…” și alegi fișierul plăcii. ${BTN_GCODE}`, "rau");
    } else if (L.trimis && dt > 90000) {
      opresteLegatura();
      stareCvs2("Lucrarea a plecat spre cvs2, dar n-a venit confirmarea. Uită-te în fila lui cvs2.", "rau");
    }
  }, 500);
}
function trimiteLucrarea(L: NonNullable<typeof legaturaCvs2>) {
  if (!L.gata || !L.lucrare || L.trimis) return;
  L.w!.postMessage(L.lucrare, L.origine);
  L.trimis = true;
  const n = L.lucrare.fisiere.length;
  stareCvs2(tr`Am trimis ${n} ${n === 1 ? tr("fișier") : tr("fișiere")} G-code. Confirmă în cvs2 că le primești…`);
}
window.addEventListener("message", ev => {
  const L = legaturaCvs2;
  if (!L || ev.source !== L.w || ev.origin !== L.origine) return;
  const m = ev.data;
  if (!m || typeof m !== "object" || m.protocol !== PROTOCOL_CVS2) return;
  if (m.tip === "gata" && !L.gata) {
    if (m.versiune !== 1) { opresteLegatura(); stareCvs2(tr`cvs2 vorbește altă versiune a protocolului (${String(m.versiune).slice(0, 8)}).`, "rau"); return; }
    L.gata = true;
    if (L.lucrare) trimiteLucrarea(L); else stareCvs2("cvs2 e gata. Pregătesc fișierele…");
  } else if (m.tip === "primit" && m.id === L.id) {
    opresteLegatura();
    const bune = Array.isArray(m.acceptate) ? m.acceptate.length : 0, rele = Array.isArray(m.refuzate) ? m.refuzate : [];
    const esc = (t: unknown) => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[c]!);
    if (m.renuntat) { stareCvs2("În cvs2 ai ales să nu primești lucrarea."); return; }
    stareCvs2(tr`cvs2 a primit ${bune} ${bune === 1 ? tr("fișier") : tr("fișiere")}` + (rele.length ? tr`; a refuzat ${rele.length}: ${rele.slice(0, 4).map((x: { nume: string; cod: string; linie?: number }) => `${esc(x.nume)} (${esc(x.cod)}${x.linie != null ? tr`, linia ${+x.linie + 1}` : ""})`).join(", ")}.` : tr(". Alege-l pe primul în panoul mașinii, pune zero-ul și pornește.")), rele.length ? "rau" : "ok");
  }
});
// ----------------------------------------------------------------------------- pe masina, prin cvs2
// In cvs2 (window.cvs2.masina, ADR 0161), senderul lui cvs2, din exportul CNC: alegi fisierul (in ordinea taierii), il
// incarci pe masina (cvs2 il verifica la fel ca unul adus cu "Fisier..."), il pornesti (cvs2 te intreaba inainte sa miste
// masina), pui pauza, il reiei (tot cu intrebarea), il opresti. Conectarea, zero-ul, jog-ul si continuarea dupa o oprire din
// program raman in fereastra Masina a lui cvs2. In afara lui cvs2 (claude.ai, copia de pe calculator) sectiunea nu se arata.
const MASINA = (window.cvs2 && window.cvs2.masina) || null;
let stareMasina: import("../../../api.ts").StareMasina | null = null, cerereMasinaInZbor = false;
const FEL_MASINA: Record<string, string | undefined> = {
  conectata: "conectată", ruleaza: "rulează", pauza: "în pauză", "oprita-m6": "oprită pentru schimbarea frezei (M6)",
  oprita: "oprită de program", suspendata: "oprită pe o eroare", alarma: "în alarmă", intrerupta: "lucrarea s-a întrerupt",
  gata: "lucrarea e gata",
};
const REFUZ_MASINA: Record<string, string | undefined> = {
  neconectat: "Mașina nu e conectată: conecteaz-o în fereastra Mașina a lui cvs2.",
  renuntat: "Ai ales să nu pornești.",
  ocupat: "cvs2 așteaptă deja un răspuns de la tine.",
  "in-lucru": "O lucrare e pornită: fișierul nou se încarcă după ea.",
  "fara-program": "Încarcă întâi un fișier pe mașină.",
  "fara-capabilitate": "Contul tău din cvs2 nu permite pornirea programelor.",
  faza: "Mașina nu poate face asta acum.",
  schimbat: "Programul sau starea mașinii s-au schimbat cât te gândeai: încearcă din nou.",
  alarma: "Mașina e în alarmă: deblocheaz-o din fereastra Mașina.",
  bariera: "Continuă din fereastra Mașina, după pasul de la mașină.",
  nimic: "Nu e nimic de oprit sau de reluat acum.",
  live: "Pe instanța live, cvs2 nu dă încă senderul extensiilor.",
  indisponibila: "Fereastra Mașina a lui cvs2 nu s-a deschis.",
};
function textRefuzMasina(e: unknown) {
  const c = String((e && (e as Error).message) || e).replace(/^masina:/, "");
  const p = /^program:([a-z0-9-]+)(?::(\d+))?$/.exec(c);
  if (p) return tr`cvs2 a refuzat fișierul (${p[1]}${p[2] ? tr`, linia ${p[2]}` : ""}).`;
  return REFUZ_MASINA[c] || tr`cvs2 a refuzat cererea (${c}).`;
}
const textLinii = (n: number) => (n === 1 ? tr("o linie") : new Intl.PluralRules("ro").select(n) === "few" ? tr`${n} linii` : tr`${n} de linii`);
// fisierele G-code ale exportului, in ordinea taierii: numele (fara "gcode/") si textul
function fisiereMasina() {
  const r = rezCNC;
  if (!r || !r.gcode) return [];
  return r.gcode.rezumat.map(x => r.fisiere.find(y => y.nume === x.nume)).filter(Boolean)
    .map(f => ({ nume: f!.nume.replace(/^gcode\//, ""), text: f!.text }));
}
const FAZE_INCEPUTE = ["trimite", "golire", "terminare", "suspendat", "bariera"];
function randeazaMasina() {
  if (!MASINA) return;
  const s = stareMasina, i = s && s.indicator, fis = fisiereMasina(), sel = $<HTMLSelectElement>("#m-fisier");
  const optiuni = fis.map(f => f.nume).join("\n");
  if (sel.dataset.optiuni !== optiuni) {
    const ales = sel.value;
    sel.dataset.optiuni = optiuni;
    sel.replaceChildren(...fis.map(f => { const o = document.createElement("option"); o.value = o.textContent = f.nume; return o; }));
    if (fis.some(f => f.nume === ales)) sel.value = ales;
  }
  const inceputa = !!s && FAZE_INCEPUTE.includes(s.faza);
  const procent = i && i.procent != null && (i.fel === "ruleaza" || i.fel === "pauza") ? ` ${i.procent} %` : "";
  const cum = !s ? tr("încă nu știu") : !s.conectata && !(i && i.fel === "intrerupta")
    ? tr("neconectată. Conecteaz-o în fereastra Mașina a lui cvs2") : tr(String(FEL_MASINA[i ? i.fel : "conectata"] || FEL_MASINA.conectata)) + procent;
  const program = s && s.program ? tr` Program: ${s.program.nume || "—"} (${textLinii(s.program.linii)}).` : "";
  $("#masina-stare").textContent = tr`Mașina: ${cum}.${program}`;
  $("#rez-masina").textContent = s ? "· " + (s.conectata ? tr(String(FEL_MASINA[i ? i.fel : "conectata"] || FEL_MASINA.conectata)) : tr("neconectată")) : "";
  const z = cerereMasinaInZbor;
  $<HTMLInputElement>("#m-incarca").disabled = z || !fis.length || inceputa;
  $<HTMLInputElement>("#m-porneste").disabled = z || !s || !s.conectata || !s.program || !["pregatit", "terminat", "pierdut"].includes(s.faza);
  $<HTMLInputElement>("#m-pauza").disabled = z || !(i && i.fel === "ruleaza");
  $<HTMLInputElement>("#m-reia").disabled = z || !(i && (i.fel === "pauza" || i.fel === "suspendata"));
  $<HTMLInputElement>("#m-opreste").disabled = !s || !s.conectata || !inceputa;
}
// o cerere spre cvs2: butoanele asteapta raspunsul (pornirea si reluarea, si pe al omului); un refuz se spune sub ele
async function cereMasina(f: () => Promise<unknown>) {
  cerereMasinaInZbor = true;
  $("#masina-raspuns").textContent = "";
  randeazaMasina();
  try { await f(); }
  catch (e) { $("#masina-raspuns").textContent = textRefuzMasina(e); }
  finally { cerereMasinaInZbor = false; randeazaMasina(); }
}
function initMasina() {
  if (!MASINA) return;
  $("#det-masina").hidden = false;
  // in cvs2, "Trimite la cvs2" pune lucrarea in fereastra Masina (fara fila noua); textele despre fila si protocol nu mai tin
  $("#cvs2-fila").hidden = true; $("#cvs2-primirea").hidden = true; $("#cvs2-in-cvs2").hidden = false;
  MASINA.laStare(s => { stareMasina = s; randeazaMasina(); });
  void MASINA.stare().then(s => { if (!stareMasina) { stareMasina = s; randeazaMasina(); } }, () => {});
  $("#m-incarca").onclick = () => {
    const f = fisiereMasina().find(x => x.nume === $<HTMLInputElement>("#m-fisier").value);
    if (f) void cereMasina(() => MASINA.incarca(f.nume, f.text));
  };
  $("#m-porneste").onclick = () => { void cereMasina(() => MASINA.porneste()); };
  $("#m-pauza").onclick = () => { void cereMasina(() => MASINA.pauza()); };
  $("#m-reia").onclick = () => { void cereMasina(() => MASINA.reia()); };
  $("#m-opreste").onclick = () => { void cereMasina(() => MASINA.opreste()); };
  randeazaMasina();
}
async function salveazaDescarcare(fisier: string, blob: Blob) {
  const dl = await (window.claude ? window.claude.use("downloads") : null);
  if (!dl) {   // copia locala (fara Claude): descarcare obisnuita din browser
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = fisier; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return;
  }
  try { await dl.save({ filename: fisier, data: blob }); toast("Fișierul e salvat."); }
  catch (e) { if (e && (e as { code?: string }).code !== "declined") toast(e && (e as { code?: string }).code === "rate_limited" ? "Mai e o salvare deschisă." : "Nu am putut salva fișierul."); }
}
async function descarcaGcode() {
  // doar G-code-ul si fisa lucrarii: ce ii trebuie lui cvs2 (sau oricarui sender)
  const r = rezCNC;
  if (!r || !r.gcode) return;
  const l = await lucrareCvs2(r);
  const numeF = (stare.nume || "circuit").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase() || "circuit";
  const R = "\r\n", citeste = [tr("G-CODE PENTRU MAȘINĂ — ") + (stare.nume || tr("Circuit")), new Date().toLocaleString(Limba.locala), "",
    tr`Controler: ${r.gcode.contract.nume}. Zero X / Y în colțul ${tr(COLT[setariCNC.gcode.origine] || setariCNC.gcode.origine)} al plăcii, Z0 ${setariCNC.gcode.z0 === "sus" ? tr("pe fața de sus a plăcii") : tr("pe masă")}.`,
    tr("Ordinea de tăiere (fiecare cu amprenta SHA-256, ca s-o verifici în cvs2):"),
    ...l.fisiere.map((f, i) => `${i + 1}. ${f.nume}${f.scula ? " — " + f.scula : ""}${f.timp_s ? " — ≈ " + durata(f.timp_s) : ""}${R}   ${f.sha256}`),
    "", tr("În cvs2: panoul mașinii → „Fișier…” → alegi fișierul. lucrare_cvs2.json e fișa lucrării (pentru primirea automată).")].join(R) + R;
  const date = TrenCNC.zip([{ nume: tr("CITESTE.txt"), text: citeste }, ...l.fisiere.map(f => ({ nume: "gcode/" + f.nume, text: f.text })),
    { nume: "gcode/lucrare_cvs2.json", text: JSON.stringify(fisaLucrarii(l), null, 2) + "\n" }]);
  await salveazaDescarcare(numeF + "_gcode.zip", new Blob([date as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
}

function arata(sel: string) { $(sel).hidden = false; }
function ascunde(el: HTMLElement) { if (el.closest<HTMLElement>("#foaie-lc")) inchideEditor(); else el.closest<HTMLElement>(".fundal")!.hidden = true; }

// ----------------------------------------------------------------------------- cele doua parti: 2D (tren, CNC) si 3D (printare)
// Partea 3D e in atelier.js (window.Atelier3D); de aici primeste piesele printate ale circuitului deschis.
const CHEIE_MOD = "trenulet.mod";
let mod = "2d";
function alegeMod(m: string) {
  mod = m === "3d" ? "3d" : "2d";
  $(".app").classList.toggle("e3d", mod === "3d");
  $("#mod-3d").hidden = mod !== "3d";
  document.querySelectorAll<HTMLElement>("[data-mod]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mod === mod)));
  try { localStorage.setItem(CHEIE_MOD, mod); } catch (e) { /* fara stocare */ }
  try { history.replaceState(null, "", "#" + mod); } catch (e) { /* adresa nu se poate schimba aici */ }
  if (mod === "3d") {
    if (tren) opresteTren();
    document.querySelectorAll<HTMLElement>(".fundal").forEach(f => { f.hidden = true; });
    inchideEditor();
    if (window.Atelier3D) Atelier3D.intra();
  } else deseneaza();
}
function anunta3D() { if (mod === "3d" && window.Atelier3D) Atelier3D.reimprospateaza(); }
const mic = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
function titluPrintata(p: { nume: string; fel: string; piesa?: string; n?: number }) {
  if (p.fel === "limba") return tr`Limbă pentru ${mic(nume(p.piesa!))}`;
  if (p.fel === "limba_spate") return tr`Limbă pentru ${mic(nume(p.piesa!))}, pe spate`;
  if (p.fel === "stalp") return tr`Stâlp printat, ${p.n} mm`;
  if (p.fel === "cale") return tr`${nume(p.piesa!)}, printată`;
  if (p.fel === "proba") return tr`Proba cuplajelor, varianta ${p.n}`;
  const t = ({ opritor: "Opritor cu tampoane", tunel: "Tunel", peron: "Peron" } as Record<string, string | undefined>)[p.fel];
  return t ? tr(t) : p.nume;
}
var TrenPentru3D = {
  cheie: () => JSON.stringify([numara(), listaLC().map(x => x.id), parametriCNC(), stare.nume]),
  piese: () => ({ titlu: stare.nume, piese: TrenCNC.piesePrintate(numara(), listaLC(), parametriCNC() as Parameters<typeof TrenCNC.piesePrintate>[2]).map(p => ({ ...p, titlu: titluPrintata(p) })) }),
  // cuplajele pieselor de cale printate tin de imprimanta: profilul imprimantei din 3D le ia si le pune
  print: () => ({ print_tata: setariCNC.print_tata, print_mama: setariCNC.print_mama }),
  seteazaPrint: (v: { print_tata?: number | undefined; print_mama?: number | undefined } | null) => {
    if (!v || (v.print_tata === undefined && v.print_mama === undefined)) return;
    setariCNC = curataSetari({ ...setariCNC, ...(v.print_tata !== undefined ? { print_tata: v.print_tata } : {}), ...(v.print_mama !== undefined ? { print_mama: v.print_mama } : {}) });
    salveazaSetariCNC();
    if (!$("#foaie-export").hidden) { arataSetariCNC(); pregatesteCNC(false); }
  },
  setari: () => {
    // din 3D, la setarile pieselor printate (Export CNC -> Piese printate 3D)
    alegeMod("2d"); deschideExport();
    const d = $("#sec-printate").closest<HTMLDetailsElement>("details");
    d!.open = true;
    setTimeout(() => d!.scrollIntoView({ block: "start", behavior: "smooth" }), 80);
  },
};

// ----------------------------------------------------------------------------- pornire
function init() {
  randeazaPaleta();
  exempluOval();
  calculeaza(); incadreaza();
  selCapat = null;
  deseneaza(); actualizeazaUI();
  initGesturi();
  new ResizeObserver(() => deseneaza()).observe($("#scena"));

  $("#grupe").addEventListener("click", e => { const b = (e.target as Element).closest<HTMLElement>("[data-grupa]"); if (!b) return; grupaActiva = b.dataset.grupa; randeazaPaleta(); });
  $("#paleta").addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLElement>("[data-piesa], [data-actiune]");
    if (!b) return;
    if (b.dataset.piesa) { adaugaPiesa(b.dataset.piesa); return; }
    const a = b.dataset.actiune;
    if (a === "inchide") inchide();
    else if (a === "stalp") stalpMana();
    else deschideEditor(a!.slice(3));
  });
  $("#a-roteste").onclick = roteste; $("#a-intoarce").onclick = intoarce; $("#a-panta").onclick = panta;
  $("#a-sterge").onclick = sterge; $("#a-anuleaza").onclick = anuleaza;
  $("#a-inchide").onclick = inchide; $("#a-modifica").onclick = () => deschideEditor(null, selPiesa);
  document.querySelectorAll<HTMLElement>("[data-lc-tip]").forEach(b => { b.onclick = () => { editor!.tip = b.dataset.lcTip!; actualizeazaEditor(); }; });
  document.querySelectorAll<HTMLElement>("[data-lc-sens]").forEach(b => { b.onclick = () => { editor!.sens = +b.dataset.lcSens!; actualizeazaEditor(); }; });
  ["#lc-l", "#lc-r", "#lc-a"].forEach(sel => $(sel).addEventListener("input", actualizeazaEditor));
  $("#foaie-lc").addEventListener("keydown", e => { if (e.key === "Enter" && !$<HTMLInputElement>("#lc-ok").disabled) confirmaEditor(); });
  $("#lc-ok").onclick = confirmaEditor;
  $("#z-plus").onclick = () => { const s = $("#plan"); zoomLa(s.clientWidth / 2, s.clientHeight / 2, 1.3); };
  $("#z-minus").onclick = () => { const s = $("#plan"); zoomLa(s.clientWidth / 2, s.clientHeight / 2, 1 / 1.3); };
  $("#z-tot").onclick = () => { incadreaza(); deseneaza(); };
  $("#nume").addEventListener("input", e => { stare.nume = (e.target as HTMLInputElement).value; programeazaSalvare(); });
  $("#btn-circuite").onclick = () => { deConfirmat = null; randeazaCircuite(); arata("#foaie-circuite"); };
  $("#btn-export").onclick = deschideExport;
  $("#btn-tren").onclick = () => (tren ? opresteTren() : pornesteTren());
  $("#btn-lista").onclick = () => { $("#lista-mobil").innerHTML = htmlLista(); const h = $("#lista-mobil").querySelector<HTMLElement>("h2"); if (h) h.remove(); arata("#foaie-lista"); };
  document.querySelectorAll<HTMLElement>("[data-inchide]").forEach(b => { b.onclick = () => ascunde(b); });
  document.querySelectorAll<HTMLElement>(".fundal").forEach(f => f.addEventListener("click", e => { if (e.target === f) f.hidden = true; }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { document.querySelectorAll<HTMLElement>(".fundal").forEach(f => { f.hidden = true; }); inchideEditor(); }
    if (mod === "3d") return;            // tastele planului nu lucreaza in partea 3D
    // nici cand scrii intr-un camp (acolo Backspace si Ctrl+Z sunt ale campului) si nici peste o foaie deschisa
    const a = document.activeElement, inCamp = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || (a as HTMLElement).isContentEditable);
    if (inCamp || document.querySelector<HTMLElement>(".fundal:not([hidden]):not(.fara-fundal)")) return;
    if ((e.key === "Delete" || e.key === "Backspace") && selPiesa) sterge();
    if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); anuleaza(); }
  });
  $("#c-nou").onclick = () => { stare = { docId: null, nume: tr("Circuit nou"), piese: [], exemplu: false }; istoric = []; selPiesa = selCapat = null; schimbat({ incadreaza: true, faraSalvare: true }); ascunde($("#c-nou")); };
  $("#c-exemplu").onclick = () => { exempluOval(); istoric = []; selPiesa = selCapat = null; schimbat({ incadreaza: true, faraSalvare: true }); ascunde($("#c-exemplu")); };
  $("#c-pod").onclick = () => { exempluPod(); istoric = []; selPiesa = selCapat = null; schimbat({ incadreaza: true, faraSalvare: true }); ascunde($("#c-pod")); };
  $("#circ-lista").addEventListener("click", e => {
    const d = (e.target as Element).closest<HTMLElement>("[data-deschide]"), s = (e.target as Element).closest<HTMLElement>("[data-sterge-c]");
    if (d) { const c = listaCircuite.find(x => x.id === d.dataset.deschide); if (c) { deschide(c); ascunde(d); } }
    if (s) { const id = s.dataset.stergeC; if (deConfirmat === id) stergeCircuit(id!); else { deConfirmat = id; randeazaCircuite(); } }
  });
  for (const el of [$("#lista"), $("#lista-mobil")]) el.addEventListener("change", e => {
    const i = (e.target as Element).closest<HTMLElement>("[data-tren]");
    if (!i) return;
    setariCNC = curataSetari({ ...setariCNC, inaltime_tren: (i as HTMLInputElement).value.trim() === "" ? null : +(i as HTMLInputElement).value.replace(",", ".") });
    salveazaSetariCNC();
    calculeaza(); deseneaza(); actualizeazaUI();
  });
  const foaieExp = $("#foaie-export");
  foaieExp.addEventListener("input", e => { if ((e.target as HTMLElement).matches("input[type=number][data-cale], input[type=url][data-cale], textarea[data-cale]")) schimbaSetare(e); });
  foaieExp.addEventListener("change", e => { if ((e.target as HTMLElement).matches("[data-cale]:not([type=number]):not(textarea), [data-umplere], [data-cale-printata]")) schimbaSetare(e); });
  $<HTMLInputElement>("#arata-traseu").checked = arataTraseu;
  const fataPlaci = () => document.querySelectorAll<HTMLElement>("#cnc-fata [data-f]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.f === "jos") === placaJos)));
  fataPlaci();
  $("#cnc-fata").addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLElement>("[data-f]"); if (!b) return;
    placaJos = b.dataset.f === "jos"; fataPlaci();
    try { localStorage.setItem("trenulet.placaJos", placaJos ? "1" : "0"); } catch (x) { /* fara stocare */ }
    randeazaPlaci();
  });
  // un clic pe o placa o mareste pe toata latimea (si inapoi)
  $("#cnc-placi").addEventListener("click", e => { const f = (e.target as Element).closest<HTMLElement>(".placa"); if (f) f.classList.toggle("mare"); });
  $("#arata-traseu").addEventListener("change", e => { arataTraseu = (e.target as HTMLInputElement).checked; try { localStorage.setItem("trenulet.traseu", arataTraseu ? "1" : "0"); } catch (x) { /* fara stocare */ } randeazaPlaci(); });
  $("#s-implicit").onclick = () => {
    // inapoi la valorile initiale ale calibrarii si ale placii (restul setarilor ramane)
    const nou = JSON.parse(JSON.stringify(setariCNC));
    for (const k of ["freza", "varianta_tata", "varianta_mama", "evazare", "placa", "placa_margine", "distanta_piese"]) nou[k] = JSON.parse(JSON.stringify((CNC_IMPLICIT as Record<string, unknown>)[k]));
    setariCNC = curataSetari(nou); arataSetariCNC(); salveazaSetariCNC(); memoreazaMasina(); pregatesteCNC(false);
  };
  uiMasini = Profiluri.ui($("#prof-masina"), {
    eticheta: "Mașina", fel: "mașina",
    ajutor: "Fiecare mașină își ține freza, placa, calibrarea cuplajelor, G-code-ul și adresa lui cvs2; ce schimbi în setări se scrie în mașina aleasă. Pagina se deschide cu cea implicită (★).",
    stare: () => masini, salveaza: s => { masini = s; salveazaMasini(); }, valori: () => valoriMasina(), aplica: aplicaMasina,
  });
  uiMasini.desen();
  $("#u-toate").onclick = () => { setariCNC = curataSetari({ ...setariCNC, umplere: PIESE_UMPLERE.slice() }); arataSetariCNC(); salveazaSetariCNC(); pregatesteCNC(false); };
  $("#u-niciuna").onclick = () => { setariCNC = curataSetari({ ...setariCNC, umplere: [] }); arataSetariCNC(); salveazaSetariCNC(); pregatesteCNC(false); };
  $("#e-dxf").onclick = descarcaDXF;
  $("#e-cvs2").onclick = trimiteLaCvs2;
  initMasina();
  $("#e-gcode").onclick = descarcaGcode;
  $("#cvs2-stare").addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLElement>("[data-cvs2]");
    if (!b) return;
    if (b.dataset.cvs2 === "gcode") descarcaGcode();
    if (b.dataset.cvs2 === "separate") {
      setariCNC = curataSetari({ ...setariCNC, gcode: { ...setariCNC.gcode, strategieScula: "fisiere-separate" } });
      salveazaSetariCNC(); arataSetariCNC(); stareCvs2(""); pregatesteCNC(true);
    }
  });
  $("#e-copiaza").onclick = () => {
    const t = jsonExport();
    try {
      navigator.clipboard.writeText(t).then(() => toast("Copiat."), () => selecteazaJson());
    } catch (e) { selecteazaJson(); }
  };
  $("#e-salveaza").onclick = async () => {
    const dl = await (window.claude ? window.claude.use("downloads") : null);
    const numeF = (stare.nume || "circuit").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase() || "circuit";
    if (!dl) {   // copia locala (fara Claude): descarcare obisnuita din browser
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([jsonExport()], { type: "application/json" }));
      a.download = numeF + ".json"; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return;
    }
    try { await dl.save({ filename: numeF + ".json", data: jsonExport() }); toast("Fișier salvat."); }
    catch (e) { if (e && (e as { code?: string }).code !== "declined") toast("Nu am putut salva fișierul."); }
  };

  // partea 3D: comutatorul din bara, lista de printat, legatura din Export CNC
  document.querySelectorAll<HTMLElement>("[data-mod]").forEach(b => { b.onclick = () => alegeMod(b.dataset.mod!); });
  $("#btn-la-lista").onclick = () => $("#at-sectiune-lista").scrollIntoView({ block: "start", behavior: "smooth" });
  $("#e-la-3d").onclick = () => { alegeMod("3d"); setTimeout(() => $("#at-sectiune-lista").scrollIntoView({ block: "start" }), 60); };
  if (window.Atelier3D) Atelier3D.init();
  if (window.cvs2) window.cvs2.laSchimbare(randeazaCont);   // intrarea sau iesirea din contul lui cvs2, pe loc (ADR 0164)
  const dinAdresa = /^#(2d|3d)$/i.exec(location.hash || "");
  let modSalvat = null;
  try { modSalvat = localStorage.getItem(CHEIE_MOD); } catch (e) { /* fara stocare */ }
  alegeMod(dinAdresa ? dinAdresa[1]!.toLowerCase() : modSalvat === "3d" ? "3d" : "2d");

  // circuitele salvate: in baza de date a paginii (vizibile pe orice dispozitiv) sau local
  (async () => {
    try { db = window.claude ? await window.claude.use("db") : null; } catch (e) { db = null; }
    if (!db) {
      listaCircuite = listaDinLocal();
      if (listaCircuite.length && stare.exemplu && !istoric.length) deschide(listaCircuite[0]!);
      randeazaCircuite();
      return;
    }
    incarcaSetariCNC();
    let primul = true;
    db.collection("circuite").orderBy("actualizat", "desc").onSnapshot(snap => {
      listaCircuite = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (primul && listaCircuite.length && stare.exemplu && !istoric.length) deschide(listaCircuite[0]!);
      primul = false;
      randeazaCircuite();
    }, () => { db = null; listaCircuite = listaDinLocal(); randeazaCircuite(); });
  })();
}
function selecteazaJson() {
  const pre = $("#exp-json"); const r = document.createRange(); r.selectNodeContents(pre);
  const s = window.getSelection(); s!.removeAllRanges(); s!.addRange(r);
  toast("Textul e selectat: copiază-l manual.");
}
init();
