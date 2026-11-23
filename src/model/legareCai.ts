import { arieCuSemn, type Punct } from '../geom/contur.ts';
import { aplica, compune, determinantNormat, esteSimilitudine, TOLERANTA_SIMILITUDINE_LUME, type Matrice } from '../geom/matrice.ts';
import { noduriPiesa, type Document, type Piesa, type PunctDoc, type SegmentDoc, type VarfDoc } from './document.ts';
import { conturElement } from './forme.ts';
import { elementeFoaie, type ElementLume } from './lume.ts';
import type { FormaCale } from './noduri.ts';
import { aplicaSchimbarea, caleBuna, harta, operatiiNod, schimbarea, type Schimbare } from './reparare.ts';
import { pragGolBun, tolerantaLegareBuna, type OptiuniLegare } from './legareOptiuni.ts';

/**
 * Legarea căilor (ADR 0182, felia 10.3↑o): căile deschise ale căror capete se întâlnesc devin o singură cale, cu regulile
 * legării din importul DXF (ADR 0101 §7). Calculul e al workerului CAM, ca reparațiile verificării: pur, întoarce piesele
 * schimbate (cu aceleași id-uri) și instanțele de șters, pe care acțiunea `document.repara` le aplică într-un pas.
 * - **Lipirea:** două capete la cel mult toleranță devin un nod; doar câte două într-un punct (trei sau mai multe, un T, rămân
 *   nelegate). Nodul e capătul căii mai devreme în document (implicit, răspunsul 2a), sau mijlocul dintre ele; mânerul unei
 *   cubice vine cu capătul ei.
 * - **Golurile** (răspunsul 1a, cu opțiunile): după lipire, când rămân exact două lanțuri deschise, cele mai apropiate capete
 *   ale lor se leagă cu o linie dreaptă (oricât, până la N mm, sau deloc); o singură cale deschisă aleasă se închide cu o
 *   linie. Cu trei lanțuri sau mai multe, golurile rămân (liniile ar lega capete depărtate, la întâmplare).
 * - Un lanț ale cărui capete se lipesc devine o cale închisă; operația rămâne a primei căi.
 * - **Cine se leagă:** căi cu aceleași operații (răspunsul 3a; opțiunea „operația primei”), fiecare singură în piesa ei sau
 *   toate în aceeași instanță; o piesă pusă de mai multe ori nu se schimbă de aici (ca reparațiile, ADR 0124 §15).
 * - **Unde ajunge:** calea legată ia locul primei căi a lanțului (prima în document), în coordonatele ei, cu sensul ei; celelalte
 *   pleacă din piesa lor, iar o instanță rămasă fără nimic se șterge.
 */

export { OPTIUNI_LEGARE, PRAG_GOL, type GolLegare, type OptiuniLegare } from './legareOptiuni.ts';

/**
 * Ce se leagă: căile deschise ale instanțelor alese (comanda „Leagă căile”); cele două forme ale unui rând al verificării
 * (doar prin lipire); toate căile deschise ale foii, sau ale instanțelor alese ale verificării (doar prin lipire).
 */
export type CerereLegare =
  | { readonly fel: 'alese'; readonly alese: readonly string[] }
  | { readonly fel: 'capete'; readonly elemente: readonly [string, string] }
  | { readonly fel: 'toate'; readonly alese: readonly string[] | null };

/** Ce a rămas nelegat: punctele cu trei sau mai multe capete, perechile refuzate și golul peste prag. */
export type NelegateLegare = { readonly t: number; readonly operatii: number; readonly piese: number; readonly impartite: number; readonly departe: number };

/**
 * De ce nu s-a legat nimic: `toleranta` (opțiunile), `nimic` (nicio cale deschisă), `disparuta` (formele rândului nu mai sunt
 * căi deschise), `prea-departe` (golul, peste opțiuni; `gol` îl dă), `multe` (golurile, între mai mult de două lanțuri), `t`
 * (trei capete într-un punct), `operatii`, `piese` („Degrupează întâi”), `impartita` (piesa pusă de mai multe ori),
 * `transformare` (un arc printr-o matrice neuniformă), `degenerata` (calea legată, fără arie).
 */
export type MotivLegare = 'toleranta' | 'nimic' | 'disparuta' | 'prea-departe' | 'multe' | 't' | 'operatii' | 'piese' | 'impartita' | 'transformare' | 'degenerata';

export type RezultatLegare =
  | {
    readonly ok: true;
    readonly piese: readonly Piesa[];
    readonly sterse: readonly string[];
    /** Câte căi au intrat în căile legate, câte căi legate au ieșit și câte din ele sunt închise. */
    readonly cai: number;
    readonly rezultate: number;
    readonly inchise: number;
    readonly nelegate: NelegateLegare;
  }
  | { readonly ok: false; readonly motiv: MotivLegare; readonly gol?: number };

/** O cale deschisă de legat: ordinea ei în document, locul, forma (locală) și capetele în lume. */
type Cale = {
  readonly k: number;
  readonly e: ElementLume;
  readonly piesa: Piesa;
  readonly forma: FormaCale;
  readonly w: readonly [Punct, Punct];
  readonly ops: ReadonlySet<string>;
  /** `solo` (singura formă a piesei ei) sau instanța piesei cu mai multe forme: se leagă doar în aceeași clasă. */
  readonly grup: string;
};

/** Un lanț: căile în ordine (`inv`: parcursă invers), legăturile dintre ele și cea de închidere. */
type Lant = { cai: Array<{ readonly i: number; readonly inv: boolean }>; legaturi: Array<'lipit' | 'linie'>; inchidere: 'lipit' | 'linie' | null };

const dist = (p: Punct, q: Punct): number => Math.hypot(p.x - q.x, p.y - q.y);

function inversa(m: Matrice): Matrice {
  const det = m.a * m.d - m.b * m.c;
  return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det };
}

const laFel = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => a.size === b.size && [...a].every((x) => b.has(x));

/** Segmentul întors: arcul cu bulge-ul cu semn schimbat, cubica cu mânerele schimbate. */
function intors(s: SegmentDoc): SegmentDoc {
  if (s.tip === 'A') return { ...s, bulge: -s.bulge };
  if (s.tip === 'C') return { ...s, c1: s.c2, c2: s.c1 };
  return s;
}

/** Vârfurile unei căi deschise, parcurse invers (ultimul segment, al capătului, o linie: convenția căii deschise). */
function inversate(v: readonly VarfDoc[]): VarfDoc[] {
  const n = v.length;
  return v.map((_, j) => {
    const x = v[n - 1 - j] as VarfDoc;
    return j === n - 1 ? { ...x, s: { tip: 'L' } } : { ...x, s: intors((v[n - 2 - j] as VarfDoc).s) };
  });
}

const mutat = (p: PunctDoc, d: Punct): PunctDoc => ({ ...p, x: p.x + d.x, y: p.y + d.y });

/** Vârfurile căii în coordonatele primei căi (`T`, de la elementul ei la al primei); arcele schimbă semnul sub oglindire. */
function transformate(v: readonly VarfDoc[], T: Matrice | null): VarfDoc[] | null {
  if (!T) return [...v];
  const arce = v.some((x) => x.s.tip === 'A');
  if (arce && !esteSimilitudine(T, TOLERANTA_SIMILITUDINE_LUME)) return null;
  const semn = determinantNormat(T) < 0 ? -1 : 1;
  const tp = (p: PunctDoc): PunctDoc => ({ ...p, ...aplica(T, p) });
  return v.map((x) => ({
    ...x,
    p: tp(x.p),
    s: x.s.tip === 'A' ? { ...x.s, bulge: semn * x.s.bulge } : x.s.tip === 'C' ? { ...x.s, c1: tp(x.s.c1), c2: tp(x.s.c2) } : x.s,
  }));
}

/** Leagă căile cerute, pe documentul dat (cel din clipa cererii); nimic nu se schimbă în el. */
export function leagaCaile(doc: Document, c: CerereLegare, o: OptiuniLegare, indexFoaie = 0): RezultatLegare {
  const tol = o.toleranta;
  if (!tolerantaLegareBuna(tol) || !pragGolBun(o.pragGol)) {
    return { ok: false, motiv: 'toleranta' };
  }
  const h = harta(doc, indexFoaie);
  const toate = elementeFoaie(doc, indexFoaie);
  const deschisa = (e: ElementLume): boolean => e.forma.tip === 'cale' && !e.forma.inchis && e.forma.varfuri.length >= 2;
  let alese: ElementLume[];
  if (c.fel === 'capete') {
    alese = c.elemente.flatMap((id) => toate.filter((e) => e.idLume === id));
    if (alese.length !== 2 || !alese.every(deschisa)) return { ok: false, motiv: 'disparuta' };
  } else {
    const inst = c.alese === null ? null : new Set(c.alese);
    alese = toate.filter((e) => (inst === null || inst.has(e.instanta)) && deschisa(e));
    if (alese.length === 0) return { ok: false, motiv: 'nimic' };
  }
  const doarLipire = c.fel !== 'alese';
  const limita = doarLipire || o.gol === 'lipire' ? 0 : o.gol === 'prag' ? o.pragGol : Infinity;

  // Căile de legat: fără cele din piesele puse de mai multe ori.
  const ordine = new Map(toate.map((e, k) => [e.idLume, k]));
  const cai: Cale[] = [];
  let impartite = 0;
  for (const e of alese) {
    const l = h.loc(e.idLume);
    if (!l || e.forma.tip !== 'cale') continue;
    if (l.ori > 1) { impartite++; continue; }
    const v = e.forma.varfuri;
    const elemente = noduriPiesa(l.piesa.radacina).filter((x) => x.nod.tip === 'element').length;
    cai.push({
      k: ordine.get(e.idLume) ?? 0, e, piesa: l.piesa, forma: e.forma,
      w: [aplica(e.matrice, (v[0] as VarfDoc).p), aplica(e.matrice, (v[v.length - 1] as VarfDoc).p)],
      ops: operatiiNod(l.piesa, e.nod), grup: elemente === 1 ? 'solo' : `i:${e.instanta}`,
    });
  }
  const nelegate = { t: 0, operatii: 0, piese: 0, impartite, departe: 0 };
  let transformare = 0, degenerate = 0, multe = false;
  let departe: number | null = null;
  /** De ce nu se leagă două căi (null: se leagă). */
  const refuz = (a: Cale, b: Cale): 'piese' | 'operatii' | null => (a.grup !== b.grup ? 'piese'
    : o.operatii === 'refuza' && !laFel(a.ops, b.ops) ? 'operatii' : null);

  // Capătul j: calea j >> 1, începutul (j par) sau sfârșitul (j impar). Grupele de capete la cel mult toleranță (o grilă).
  const capat = (j: number): Punct => (cai[j >> 1] as Cale).w[j & 1] as Punct;
  const n = cai.length;
  const tata = Array.from({ length: 2 * n }, (_, i) => i);
  const radacina = (i: number): number => {
    let r = i;
    while (tata[r] !== r) r = tata[r] as number;
    while (tata[i] !== r) { const u = tata[i] as number; tata[i] = r; i = u; }
    return r;
  };
  const celule = new Map<string, number[]>();
  for (let j = 0; j < 2 * n; j++) {
    const p = capat(j);
    const cx = Math.floor(p.x / tol), cy = Math.floor(p.y / tol);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const l of celule.get(`${cx + dx},${cy + dy}`) ?? []) if (dist(p, capat(l)) <= tol) tata[radacina(j)] = radacina(l);
      }
    }
    const k = `${cx},${cy}`;
    const aici = celule.get(k);
    if (aici) aici.push(j);
    else celule.set(k, [j]);
  }
  const membri = new Map<number, number[]>();
  for (let j = 0; j < 2 * n; j++) {
    const r = radacina(j);
    const m = membri.get(r);
    if (m) m.push(j);
    else membri.set(r, [j]);
  }
  const partener = new Int32Array(2 * n).fill(-1);
  const blocat = new Uint8Array(2 * n);
  for (const m of membri.values()) {
    if (m.length > 2) { nelegate.t++; for (const j of m) blocat[j] = 1; continue; }
    if (m.length !== 2) continue;
    const [a, b] = m as [number, number];
    const de = refuz(cai[a >> 1] as Cale, cai[b >> 1] as Cale);
    if (de) { nelegate[de]++; continue; }
    partener[a] = b;
    partener[b] = a;
  }

  // Lanțurile, din perechile lipite (ca la importul DXF).
  const vazute = new Uint8Array(n);
  const lanturi: Lant[] = [];
  for (let i = 0; i < n; i++) {
    if (vazute[i]) continue;
    let j = 2 * i;
    for (let pasi = 0; pasi < n; pasi++) {
      const p = partener[j] as number;
      if (p < 0) break;
      if (p >> 1 === i) { j = 2 * i; break; }
      j = p ^ 1;
    }
    const start = j;
    const lant: Lant = { cai: [], legaturi: [], inchidere: null };
    for (;;) {
      const b = j >> 1;
      lant.cai.push({ i: b, inv: (j & 1) === 1 });
      vazute[b] = 1;
      const p = partener[j ^ 1] as number;
      if (p < 0) break;
      if (p === start) { lant.inchidere = 'lipit'; break; }
      if (vazute[p >> 1]) break;
      lant.legaturi.push('lipit');
      j = p;
    }
    lanturi.push(lant);
  }

  // Golurile: între exact două lanțuri deschise, cele mai apropiate capete libere; o singură cale aleasă se închide.
  const capeteLant = (l: Lant): readonly [number, number] => {
    const p = l.cai[0] as { i: number; inv: boolean }, u = l.cai[l.cai.length - 1] as { i: number; inv: boolean };
    return [2 * p.i + (p.inv ? 1 : 0), 2 * u.i + (u.inv ? 0 : 1)];
  };
  const deschise = lanturi.filter((l) => l.inchidere === null);
  if (c.fel !== 'toate' && deschise.length === 2) {
    const [A, B] = deschise as [Lant, Lant];
    let best: { readonly a: number; readonly b: number; readonly d: number } | null = null;
    let refuzuri: 'piese' | 'operatii' | null = null;
    for (const a of capeteLant(A)) {
      for (const b of capeteLant(B)) {
        if (blocat[a] || blocat[b]) continue;
        const de = refuz(cai[a >> 1] as Cale, cai[b >> 1] as Cale);
        if (de) { refuzuri ??= de; continue; }
        const d = dist(capat(a), capat(b));
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    if (best && best.d <= limita) {
      // A se întoarce ca să se termine în `a`, B ca să înceapă în `b`; apoi B vine după A, cu o linie.
      const [a0] = capeteLant(A), [, b1] = capeteLant(B);
      if (best.a === a0) intoarce(A);
      if (best.b === b1) intoarce(B);
      A.cai.push(...B.cai);
      A.legaturi.push('linie', ...B.legaturi);
      lanturi.splice(lanturi.indexOf(B), 1);
    } else if (best) { nelegate.departe++; departe = best.d; } else if (refuzuri && nelegate[refuzuri] === 0) nelegate[refuzuri]++;
  } else if (c.fel !== 'toate' && deschise.length === 1 && alese.length === 1) {
    const L = deschise[0] as Lant;
    const [a, b] = capeteLant(L);
    const d = dist(capat(a), capat(b));
    if (d <= limita) L.inchidere = 'linie';
    else { nelegate.departe++; departe = d; }
  } else if (c.fel !== 'toate' && deschise.length > 2) {
    if (limita > 0) multe = true;
    else {
      // Doar lipirea: golul cel mai mic dintre capetele libere a două lanțuri, spus în refuz.
      const libere = deschise.flatMap((l, k) => capeteLant(l).filter((j) => !blocat[j]).map((j) => ({ j, k })));
      for (const x of libere) for (const y of libere) if (x.k < y.k) { const d = dist(capat(x.j), capat(y.j)); if (departe === null || d < departe) departe = d; }
      if (departe !== null) nelegate.departe++;
    }
  }

  // Căile legate, în coordonatele primei căi a fiecărui lanț.
  const schimbari = new Map<string, Schimbare>();
  const sterse: string[] = [];
  let caiLegate = 0, rezultate = 0, inchise = 0;
  for (const L of lanturi) {
    if (L.cai.length < 2 && L.inchidere === null) continue;
    const nou = construieste(L, cai, o);
    if (nou === 'transformare') { transformare++; continue; }
    const prima = cai[(L.cai.reduce((m, x) => ((cai[x.i] as Cale).k < (cai[m.i] as Cale).k ? x : m), L.cai[0] as { i: number; inv: boolean })).i] as Cale;
    if (!caleBuna(nou) || (nou.inchis && !areArie(nou, prima.e.matrice, tol))) { degenerate++; continue; }
    schimbarea(schimbari, prima.piesa.id).forme.set(prima.e.nod, nou);
    for (const { i } of L.cai) {
      const x = cai[i] as Cale;
      if (x === prima) continue;
      if (x.grup === 'solo') sterse.push(x.e.instanta);
      else schimbarea(schimbari, x.piesa.id).scoase.add(x.e.nod);
    }
    caiLegate += L.cai.length;
    rezultate++;
    if (nou.inchis) inchise++;
  }
  if (rezultate === 0) {
    const motiv: MotivLegare = nelegate.piese > 0 ? 'piese' : nelegate.operatii > 0 ? 'operatii' : transformare > 0 ? 'transformare'
      : degenerate > 0 ? 'degenerata' : nelegate.t > 0 ? 't' : impartite > 0 && cai.length <= 1 ? 'impartita' : multe ? 'multe'
        : departe !== null ? 'prea-departe' : impartite > 0 ? 'impartita' : 'nimic';
    return motiv === 'prea-departe' ? { ok: false, motiv, gol: departe as number } : { ok: false, motiv };
  }
  const piese: Piesa[] = [];
  for (const p of doc.piese) {
    const s = schimbari.get(p.id);
    if (!s) continue;
    const nou = aplicaSchimbarea(p, s);
    if (!nou) return { ok: false, motiv: 'degenerata' };
    piese.push(nou);
  }
  return { ok: true, piese, sterse, cai: caiLegate, rezultate, inchise, nelegate };
}

/** Lanțul parcurs invers: căile în ordine inversă, fiecare întoarsă; legăturile, în ordine inversă. */
function intoarce(L: Lant): void {
  L.cai = L.cai.reverse().map((x) => ({ i: x.i, inv: !x.inv }));
  L.legaturi = L.legaturi.reverse();
}

/** Calea închisă are arie (în lume, peste `tol`²). */
function areArie(f: FormaCale, m: Matrice, tol: number): boolean {
  try {
    return Math.abs(arieCuSemn(conturElement({ forma: f, matrice: m }))) > tol * tol;
  } catch {
    return false;
  }
}

/**
 * Calea legată a unui lanț: în coordonatele primei căi (prima în document), cu sensul ei; la un lanț închis, începe cu ea.
 * La fiecare lipire, nodul e capătul căii mai devreme în document (sau mijlocul), iar mânerele cubicelor vin cu capetele.
 */
function construieste(L0: Lant, cai: readonly Cale[], o: OptiuniLegare): FormaCale | 'transformare' {
  const L: Lant = { cai: [...L0.cai], legaturi: [...L0.legaturi], inchidere: L0.inchidere };
  let p = 0;
  for (let k = 1; k < L.cai.length; k++) if ((cai[(L.cai[k] as { i: number }).i] as Cale).k < (cai[(L.cai[p] as { i: number }).i] as Cale).k) p = k;
  // Lanțul are sensul primei căi. Un lanț închis începe chiar cu ea: mersul pornește de la cea mai devreme cale nevăzută, deci
  // prima în document, neîntoarsă (otrava L14: rotirea lui era de prisos).
  if ((L.cai[p] as { inv: boolean }).inv) { intoarce(L); p = L.cai.length - 1 - p; }
  const prima = cai[(L.cai[p] as { i: number }).i] as Cale;
  const spre = inversa(prima.e.matrice);
  const bucati: Array<{ readonly v: VarfDoc[]; readonly k: number }> = [];
  for (const { i, inv } of L.cai) {
    const x = cai[i] as Cale;
    const t = transformate(x.forma.varfuri, x === prima ? null : compune(spre, x.e.matrice));
    if (!t) return 'transformare';
    bucati.push({ v: inv ? inversate(t) : t, k: x.k });
  }
  /** Nodul unei lipiri: capătul căii mai devreme în document, sau mijlocul. */
  const nodul = (stanga: PunctDoc, kStanga: number, dreapta: PunctDoc, kDreapta: number): Punct => (o.capete === 'mijloc'
    ? { x: (stanga.x + dreapta.x) / 2, y: (stanga.y + dreapta.y) / 2 } : kStanga < kDreapta ? stanga : dreapta);
  const r: VarfDoc[] = [...(bucati[0] as { v: VarfDoc[] }).v];
  let kUltim = (bucati[0] as { k: number }).k;
  for (let b = 1; b < bucati.length; b++) {
    const q = bucati[b] as { v: VarfDoc[]; k: number };
    if (L.legaturi[b - 1] === 'linie') {
      r.push(...q.v);
    } else {
      const u = r[r.length - 1] as VarfDoc, q0 = q.v[0] as VarfDoc;
      const X = nodul(u.p, kUltim, q0.p, q.k);
      const dU = { x: X.x - u.p.x, y: X.y - u.p.y }, dQ = { x: X.x - q0.p.x, y: X.y - q0.p.y };
      const inainte = r[r.length - 2];
      if (inainte && inainte.s.tip === 'C') r[r.length - 2] = { ...inainte, s: { ...inainte.s, c2: mutat(inainte.s.c2, dU) } };
      const s = q0.s.tip === 'C' ? { ...q0.s, c1: mutat(q0.s.c1, dQ) } : q0.s;
      r[r.length - 1] = { ...u, p: { ...u.p, x: X.x, y: X.y }, s };
      r.push(...q.v.slice(1));
    }
    kUltim = q.k;
  }
  if (L.inchidere === null) return { ...prima.forma, inchis: false, varfuri: r };
  if (L.inchidere === 'linie') return { ...prima.forma, inchis: true, varfuri: r };
  // Lipirea de închidere: ultimul vârf pleacă; segmentul care venea în el vine în primul, mutat cu nodul.
  const u = r[r.length - 1] as VarfDoc, v0 = r[0] as VarfDoc;
  const X = nodul(u.p, kUltim, v0.p, prima.k);
  const dU = { x: X.x - u.p.x, y: X.y - u.p.y }, d0 = { x: X.x - v0.p.x, y: X.y - v0.p.y };
  const varfuri = r.slice(0, -1);
  const inainte = varfuri[varfuri.length - 1] as VarfDoc;
  if (inainte.s.tip === 'C') varfuri[varfuri.length - 1] = { ...inainte, s: { ...inainte.s, c2: mutat(inainte.s.c2, dU) } };
  const s0 = v0.s.tip === 'C' ? { ...v0.s, c1: mutat(v0.s.c1, d0) } : v0.s;
  varfuri[0] = { ...(varfuri[0] as VarfDoc), p: { ...v0.p, x: X.x, y: X.y }, s: s0 };
  return { ...prima.forma, inchis: true, varfuri };
}
