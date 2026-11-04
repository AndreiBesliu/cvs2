/**
 * Reparațiile verificării vectorilor (ADR 0124 §10–§16, felia 10.2↑): ce se poate repara din lista verificării și reparația
 * însăși, pe documentul din clipa cererii. Calculul e al workerului CAM (cererile `verificare` și `reparare`), ca verificarea:
 * bucla cere cavalier. Pur: întoarce piesele schimbate (cu aceleași id-uri) și instanțele de șters; comanda (un singur pas de
 * anulare, prin ușa documentului) e a acțiunii `document.repara`. Verificarea ajută întâi la găsit (nota owner-ului din
 * 04.11): reparațiile sunt puține și cerute, niciuna automată.
 * - copiile (§11, decizia 1c): un singur buton pentru toată lista; rămâne prima formă, iar o copie cu o operație pe care
 *   prima n-o are rămâne și ea;
 * - căile deschise (§12, deciziile 2a, 3a): „Închide” pe rând, cu golul cel mult pragul de închidere;
 * - buclele unei căi închise (§13, deciziile 4a, 5a): sub pragul buclei mici bucla se scoate, peste el se desparte într-o formă;
 * - nodurile prea apropiate (§14, decizia 6b): doar în aceeași formă, unite într-un nod;
 * - intersecțiile dintre forme rămân arătate (decizia 7b: tăierea la intersecții vine cu rândul „Tăierea și conversia”);
 * - o piesă pusă de mai multe ori nu se repară de aici (§15, decizia 8a): reparația le-ar schimba pe toate.
 */
import { arieCuSemn, cerculArcului, segment, type Contur, type Punct, type Segment } from '../geom/contur.ts';
import { IDENTITATE } from '../geom/matrice.ts';
import { autointersectii } from '../geom/offset.ts';
import { noduriPiesa, PLAFON, type Document, type ElementNod, type Nod, type Operatie, type Piesa, type PunctDoc, type VarfDoc } from './document.ts';
import { conturElement } from './forme.ts';
import { jsonCanonic } from './jsonCanonic.ts';
import { elementeFoaie, instantaDin, type ElementLume } from './lume.ts';
import { adaugaNod, type FormaCale } from './noduri.ts';
import {
  buclaLa, locuri, pentruCavalier, siruriMici, verificaVectorii, type OptiuniVerificare, type Problema, type RezultatVerificare,
} from './verificare.ts';
import { TOLERANTA_MAXIMA, TOLERANTA_MINIMA } from './verificareLimite.ts';

/** Ce se poate repara dintr-un rând al listei (paralel cu `probleme`). */
export type Reparabil =
  /** Nimic de aici: intersecțiile, nodurile dintre forme, atingerile, buclele căilor deschise, formele care nu sunt căi. */
  | { readonly cum: 'nimic' }
  /** Ar fi reparabil (`ce`), dar piesa formei e pusă de `ori` ori (decizia 8a): reparația le-ar schimba pe toate. */
  | { readonly cum: 'impartita'; readonly ori: number; readonly ce: 'inchide' | 'bucla' | 'noduri' }
  /** Calea deschisă se închide („Închide”), dacă golul e cel mult pragul de închidere al panoului. */
  | { readonly cum: 'inchide' }
  /** Bucla unei căi închise: sub pragul buclei mici se scoate, peste el se desparte într-o formă. */
  | { readonly cum: 'bucla' }
  /** Șirul de segmente scurte al unei căi se unește într-un nod. */
  | { readonly cum: 'noduri' }
  /** Copiile grupului: câte se scot și câte rămân (cu altă operație decât prima; în piese puse de mai multe ori). */
  | { readonly cum: 'copii'; readonly scoase: number; readonly operatie: number; readonly impartita: number };

/** Verificarea, cu ce se poate repara din fiecare rând: ce primește panoul. */
export type VerificarePanou =
  | (Extract<RezultatVerificare, { readonly ok: true }> & { readonly reparabile: readonly Reparabil[] })
  | Extract<RezultatVerificare, { readonly ok: false }>;

/** Reparația cerută din panou: pe un rând (forma, cu punctul rândului), sau pentru toată lista de un fel. */
export type CerereReparare =
  | { readonly fel: 'copii' }
  | { readonly fel: 'inchide'; readonly element: string }
  | { readonly fel: 'bucla'; readonly element: string; readonly punct: Punct }
  | { readonly fel: 'bucle' }
  | { readonly fel: 'noduri'; readonly element: string; readonly punct: Punct }
  | { readonly fel: 'toate-nodurile' };

export type OptiuniReparare = OptiuniVerificare & {
  /** Pragul buclei mici, în procente din suma ariilor celor două bucle (§13). */
  readonly pragBucla: number;
  /** Golul cel mai mare pe care „Închide” îl închide, în mm (§12). */
  readonly pragInchidere: number;
};

/**
 * De ce nu s-a reparat: `disparuta` (problema nu mai e acolo: desenul s-a schimbat), `impartita` (decizia 8a),
 * `operatie` (copiile au operații pe care prima formă nu le are), `prea-departe` (golul trece de pragul de închidere), `degenerata` (forma ar rămâne fără arie sau cu prea puține noduri),
 * `nereusita` (bucla nu se poate tăia exact: rămâne pentru unealta Noduri), `nimic` (nimic de reparat).
 */
export type MotivReparare = 'toleranta' | 'disparuta' | 'impartita' | 'operatie' | 'prea-departe' | 'degenerata' | 'nereusita' | 'nimic';

export type RezultatReparare =
  | {
    readonly ok: true;
    /** Piesele schimbate, cu aceleași id-uri. */
    readonly piese: readonly Piesa[];
    /** Instanțele de șters (copii întregi). */
    readonly sterse: readonly string[];
    /** Câte probleme s-au reparat și câte au rămas (la „toate”). */
    readonly reparate: number;
    readonly ramase: number;
  }
  | { readonly ok: false; readonly motiv: MotivReparare };

const dist = (p: Punct, q: Punct): number => Math.hypot(p.x - q.x, p.y - q.y);

/** Unde stă un element în lume: elementul, piesa lui și de câte ori e pusă piesa (pe toate foile). */
type Loc = { readonly e: ElementLume; readonly piesa: Piesa; readonly ori: number };
type Harta = { readonly loc: (id: string) => Loc | null; readonly elementeInstantei: (instanta: string) => readonly string[] };

function harta(doc: Document, indexFoaie: number): Harta {
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const ori = new Map<string, number>();
  for (const f of doc.foi) for (const i of f.instante) ori.set(i.piesa, (ori.get(i.piesa) ?? 0) + 1);
  const elemente = new Map<string, ElementLume>();
  const peInstanta = new Map<string, string[]>();
  for (const e of elementeFoaie(doc, indexFoaie)) {
    elemente.set(e.idLume, e);
    const l = peInstanta.get(e.instanta);
    if (l) l.push(e.idLume);
    else peInstanta.set(e.instanta, [e.idLume]);
  }
  return {
    loc: (id) => {
      const e = elemente.get(id);
      const p = e ? piese.get(e.piesa) : undefined;
      return e && p ? { e, piesa: p, ori: ori.get(p.id) ?? 0 } : null;
    },
    elementeInstantei: (i) => peInstanta.get(i) ?? [],
  };
}

/** Cum se taie o operație, fără ce o leagă de noduri și de ordine (id-ul, nodurile, rangul). */
function felulOperatiei(o: Operatie): string {
  const { id: _id, noduri: _noduri, rang: _rang, ...rest } = o;
  return jsonCanonic(rest);
}

/** Felurile operațiilor unui element al piesei. */
function operatiiNod(p: Piesa, nod: string): Set<string> {
  return new Set(p.operatii.filter((o) => o.noduri.includes(nod)).map(felulOperatiei));
}

/**
 * Planul copiilor (§11): o copie se scoate dacă fiecare operație a ei e și a primei forme (altfel s-ar pierde o tăietură
 * voită). O instanță cu toate formele copii se șterge întreagă (piesa ei nu se schimbă, deci se poate și când piesa e pusă de
 * mai multe ori); altfel copia se scoate din piesă, doar dacă piesa e pusă o singură dată (decizia 8a).
 */
type PlanCopii = {
  readonly sterse: ReadonlySet<string>;
  readonly scoase: ReadonlyMap<string, ReadonlySet<string>>;
  readonly grupuri: ReadonlyMap<number, { readonly scoase: number; readonly operatie: number; readonly impartita: number }>;
};

function planCopii(h: Harta, probleme: readonly Problema[]): PlanCopii {
  const candidat = new Map<string, number>();
  const grupuri = new Map<number, { scoase: number; operatie: number; impartita: number }>();
  probleme.forEach((p, k) => {
    if (p.fel !== 'duplicat') return;
    const g = { scoase: 0, operatie: 0, impartita: 0 };
    grupuri.set(k, g);
    const prima = h.loc(p.elemente[0] as string);
    const aleIei = prima ? operatiiNod(prima.piesa, prima.e.nod) : new Set<string>();
    for (const id of p.elemente.slice(1)) {
      const l = h.loc(id);
      if (!l) continue;
      if ([...operatiiNod(l.piesa, l.e.nod)].every((x) => aleIei.has(x))) candidat.set(id, k);
      else g.operatie++;
    }
  });
  const sterse = new Set<string>();
  const scoase = new Map<string, Set<string>>();
  for (const i of new Set([...candidat.keys()].map(instantaDin))) {
    const toate = h.elementeInstantei(i);
    const intreaga = toate.length > 0 && toate.every((id) => candidat.has(id));
    if (intreaga) sterse.add(i);
    for (const id of toate) {
      const k = candidat.get(id);
      const l = h.loc(id);
      const g = k === undefined ? undefined : grupuri.get(k);
      if (!g || !l) continue;
      if (intreaga) { g.scoase++; continue; }
      if (l.ori > 1) { g.impartita++; continue; }
      g.scoase++;
      const s = scoase.get(l.piesa.id);
      if (s) s.add(l.e.nod);
      else scoase.set(l.piesa.id, new Set([l.e.nod]));
    }
  }
  return { sterse, scoase, grupuri };
}

/** Ce se poate repara din fiecare rând (§10): paralel cu `probleme`. */
export function reparabile(doc: Document, probleme: readonly Problema[], tol: number, indexFoaie = 0): Reparabil[] {
  const h = harta(doc, indexFoaie);
  const copii = planCopii(h, probleme);
  const nimic: Reparabil = { cum: 'nimic' };
  return probleme.map((p, k): Reparabil => {
    if (p.fel === 'duplicat') {
      const g = copii.grupuri.get(k);
      return g ? { cum: 'copii', ...g } : nimic;
    }
    if (p.fel === 'intersectie' || p.elemente.length !== 1) return nimic;
    const l = h.loc(p.elemente[0] as string);
    const f = l?.e.forma;
    if (!l || f?.tip !== 'cale') return nimic;
    let ce: 'inchide' | 'bucla' | 'noduri' | null = null;
    if (p.fel === 'deschis') ce = !f.inchis && (f.varfuri.length >= 3 || (f.varfuri[0]?.s.tip !== 'L' && p.distanta > tol)) ? 'inchide' : null;
    else if (p.fel === 'autointersectie') ce = f.inchis && p.puncte.length === 1 && p.bucla !== null && p.bucla.procent !== null ? 'bucla' : null;
    else if (p.fel === 'noduri') ce = siruriMici(conturElement(l.e), tol) === 'praf' ? null : 'noduri';
    if (!ce) return nimic;
    return l.ori > 1 ? { cum: 'impartita', ori: l.ori, ce } : { cum: ce };
  });
}

/** Verificarea pentru panou: rezultatul verificării și ce se poate repara din fiecare rând. */
export function verificaPentruPanou(doc: Document, o: OptiuniVerificare, indexFoaie = 0): VerificarePanou {
  const r = verificaVectorii(doc, o, indexFoaie);
  if (!r.ok) return r;
  return { ...r, reparabile: reparabile(doc, r.probleme, o.toleranta, indexFoaie) };
}

// ——— Schimbările pieselor ———

/** Ce se schimbă într-o piesă: formele noi ale unor elemente, elementele noi puse după ele, elementele scoase. */
type Schimbare = { readonly forme: Map<string, FormaCale>; readonly dupa: Map<string, FormaCale[]>; readonly scoase: Set<string> };

function schimbarea(toate: Map<string, Schimbare>, piesa: string): Schimbare {
  let s = toate.get(piesa);
  if (!s) { s = { forme: new Map(), dupa: new Map(), scoase: new Set() }; toate.set(piesa, s); }
  return s;
}

/**
 * Piesa cu schimbările ei: un element scos pleacă (și grupul rămas gol); unul nou stă după elementul din care vine, cu
 * matricea lui, un id nou și în operațiile lui (se taie la fel). O rădăcină-element cu elemente noi devine un grup. Null:
 * n-ar rămâne nimic din piesă.
 */
function aplicaSchimbarea(p: Piesa, s: Schimbare): Piesa | null {
  const folosite = new Set(noduriPiesa(p.radacina).map((x) => x.nod.id));
  const idNou = (baza: string): string => {
    for (let k = 1; ; k++) {
      const sufix = `-${k}`;
      const id = `${baza.slice(0, PLAFON.idLungime - sufix.length)}${sufix}`;
      if (!folosite.has(id)) { folosite.add(id); return id; }
    }
  };
  const noi = new Map<string, string[]>();
  const refa = (n: Nod): Nod[] => {
    if (n.tip === 'element') {
      if (s.scoase.has(n.id)) return [];
      const forma = s.forme.get(n.id);
      const el: ElementNod = forma ? { ...n, forma } : n;
      const dupa = s.dupa.get(n.id) ?? [];
      const ids = dupa.map(() => idNou(n.id));
      if (ids.length > 0) noi.set(n.id, ids);
      return [el, ...dupa.map((f, k): ElementNod => ({ tip: 'element', id: ids[k] as string, forma: f, matrice: { ...n.matrice } }))];
    }
    const copii = n.copii.flatMap(refa);
    return copii.length === 0 ? [] : [{ ...n, copii }];
  };
  const r = refa(p.radacina);
  if (r.length === 0) return null;
  const radacina: Nod = r.length === 1 ? (r[0] as Nod) : { tip: 'grup', id: idNou('g'), matrice: { ...IDENTITATE }, copii: r };
  const operatii = p.operatii.flatMap((o) => {
    const noduri = o.noduri.flatMap((id) => (s.scoase.has(id) ? [] : [id, ...(noi.get(id) ?? [])]));
    return noduri.length === 0 ? [] : [{ ...o, noduri }];
  });
  return { ...p, radacina, operatii };
}

function rezultat(doc: Document, schimbari: Map<string, Schimbare>, sterse: readonly string[], reparate: number, ramase: number): RezultatReparare {
  const piese: Piesa[] = [];
  for (const p of doc.piese) {
    const s = schimbari.get(p.id);
    if (!s) continue;
    const nou = aplicaSchimbarea(p, s);
    if (!nou) return { ok: false, motiv: 'degenerata' };
    piese.push(nou);
  }
  return { ok: true, piese, sterse, reparate, ramase };
}

// ——— Căile: validitatea, închiderea, unirea nodurilor ———

const mutat = (q: PunctDoc, dx: number, dy: number): PunctDoc => ({ ...q, x: q.x + dx, y: q.y + dy });

/** Calea trece de regulile ușii pe care le poate strica o reparație: cel puțin 2 vârfuri, arcele cu capete diferite. */
function caleBuna(f: FormaCale): boolean {
  const n = f.varfuri.length;
  if (n < 2) return false;
  if (!f.inchis && f.varfuri[n - 1]?.s.tip !== 'L') return false;
  for (let i = 0; i < (f.inchis ? n : n - 1); i++) {
    const a = (f.varfuri[i] as VarfDoc), b = (f.varfuri[(i + 1) % n] as VarfDoc);
    if (a.s.tip === 'A' && a.p.x === b.p.x && a.p.y === b.p.y) return false;
  }
  return true;
}

/** Calea închisă are arie (în lume, peste `tol`²): două linii dus-întors n-au. */
function areArie(f: FormaCale, e: ElementLume, tol: number): boolean {
  return Math.abs(arieCuSemn(conturElement({ forma: f, matrice: e.matrice }))) > tol * tol;
}

/**
 * Calea deschisă, închisă (§12): cu golul sub toleranță, ultimul vârf se lipește de primul (pleacă, iar segmentul care venea
 * în el vine în primul, cu mânerul cubicei mutat la fel); peste, segmentul ultimului vârf (o linie) devine linia de închidere.
 */
function inchide(f: FormaCale, lipeste: boolean): FormaCale | null {
  if (!lipeste) return { ...f, inchis: true };
  const n = f.varfuri.length;
  if (n - 1 < 2) return null;
  const p0 = (f.varfuri[0] as VarfDoc).p, pn = (f.varfuri[n - 1] as VarfDoc).p;
  const varfuri = f.varfuri.slice(0, -1);
  const u = varfuri[n - 2] as VarfDoc;
  if (u.s.tip === 'C') varfuri[n - 2] = { ...u, s: { ...u.s, c2: mutat(u.s.c2, p0.x - pn.x, p0.y - pn.y) } };
  return { ...f, inchis: true, varfuri };
}

/**
 * Șirurile de segmente scurte (§14), fiecare unit într-un nod: rămâne primul vârf al șirului, care ia segmentul de după șir
 * (cu mânerul cubicei mutat cât s-a mutat începutul ei); la capătul unei căi deschise rămâne capătul, iar segmentul care
 * venea în șir vine în el. Indicii unui contur închis trec de capătul listei (`siruriMici`).
 */
function unesteSiruri(f: FormaCale, siruri: ReadonlyArray<{ readonly a: number; readonly b: number }>): FormaCale | null {
  const n = f.varfuri.length;
  const v: VarfDoc[] = [...f.varfuri];
  const sterse = new Set<number>();
  const laCapat = (x: { readonly a: number; readonly b: number }): boolean => !f.inchis && x.b === n - 1 && x.a > 0;
  // Cine ține acum segmentul unui vârf scos (al primului vârf al șirului lui): șirul de la capăt îl caută aici.
  const tine = new Map<number, number>();
  for (const x of [...siruri].sort((u, w) => Number(laCapat(u)) - Number(laCapat(w)))) {
    const a = x.a % n, b = x.b % n;
    const pa = (f.varfuri[a] as VarfDoc).p, pb = (f.varfuri[b] as VarfDoc).p;
    if (laCapat(x)) {
      for (let q = x.a; q < x.b; q++) sterse.add(q);
      const j = tine.get(x.a - 1) ?? x.a - 1;
      const u = v[j] as VarfDoc;
      if (u.s.tip === 'C') v[j] = { ...u, s: { ...u.s, c2: mutat(u.s.c2, pb.x - pa.x, pb.y - pa.y) } };
    } else {
      for (let q = x.a + 1; q <= x.b; q++) sterse.add(q % n);
      const s = (v[b] as VarfDoc).s;
      v[a] = { ...(v[a] as VarfDoc), s: s.tip === 'C' ? { ...s, c1: mutat(s.c1, pa.x - pb.x, pa.y - pb.y) } : s };
      tine.set(b, a);
    }
  }
  const rez: FormaCale = { ...f, varfuri: v.filter((_, k) => !sterse.has(k)) };
  return caleBuna(rez) ? rez : null;
}

// ——— Bucla: unde trec cele două drumuri prin punctul de încrucișare ———

type Seg = { readonly a: Punct; readonly b: Punct; readonly s: Segment };

function punctPe(g: Seg, t: number): Punct {
  const { a, b, s } = g;
  if (s.tip === 'C') {
    const u = 1 - t;
    const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
    return { x: k0 * a.x + k1 * s.c1.x + k2 * s.c2.x + k3 * b.x, y: k0 * a.y + k1 * s.c1.y + k2 * s.c2.y + k3 * b.y };
  }
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const u = start + baleiaj * t;
    return { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
  }
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function derivataPe(g: Seg, t: number): Punct {
  const { a, b, s } = g;
  if (s.tip === 'C') {
    const u = 1 - t;
    return {
      x: 3 * (u * u * (s.c1.x - a.x) + 2 * u * t * (s.c2.x - s.c1.x) + t * t * (b.x - s.c2.x)),
      y: 3 * (u * u * (s.c1.y - a.y) + 2 * u * t * (s.c2.y - s.c1.y) + t * t * (b.y - s.c2.y)),
    };
  }
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const u = start + baleiaj * t;
    return { x: -raza * baleiaj * Math.sin(u), y: raza * baleiaj * Math.cos(u) };
  }
  return { x: b.x - a.x, y: b.y - a.y };
}

/** Parametrii la care segmentul trece pe lângă X (minimele locale ale distanței, cel mult `eps`), cel mai apropiat întâi. */
function treceri(g: Seg, X: Punct, eps: number): number[] {
  const N = g.s.tip === 'L' ? 1 : 64;
  const d2 = (t: number): number => { const p = punctPe(g, t); return (p.x - X.x) ** 2 + (p.y - X.y) ** 2; };
  const cand: number[] = [];
  if (g.s.tip === 'L') {
    const dx = g.b.x - g.a.x, dy = g.b.y - g.a.y, l2 = dx * dx + dy * dy;
    cand.push(l2 === 0 ? 0 : Math.max(0, Math.min(1, ((X.x - g.a.x) * dx + (X.y - g.a.y) * dy) / l2)));
  } else {
    const d = Array.from({ length: N + 1 }, (_, k) => d2(k / N));
    for (let k = 0; k <= N; k++) {
      if ((k > 0 && (d[k] as number) > (d[k - 1] as number)) || (k < N && (d[k] as number) > (d[k + 1] as number))) continue;
      // Newton pe (P(t) − X)·P'(t) = 0, cu derivata numerică; rămâne în bucata ei.
      let t = k / N;
      const lo = Math.max(0, (k - 1) / N), hi = Math.min(1, (k + 1) / N);
      for (let it = 0; it < 30; it++) {
        const h = 1e-7;
        const f = (x: number): number => { const p = punctPe(g, x), q = derivataPe(g, x); return (p.x - X.x) * q.x + (p.y - X.y) * q.y; };
        const fp = (f(Math.min(1, t + h)) - f(Math.max(0, t - h))) / (Math.min(1, t + h) - Math.max(0, t - h));
        if (!Number.isFinite(fp) || fp === 0) break;
        const tn = Math.max(lo, Math.min(hi, t - f(t) / fp));
        if (Math.abs(tn - t) < 1e-15) { t = tn; break; }
        t = tn;
      }
      cand.push(t);
    }
  }
  const rez: number[] = [];
  for (const t of cand.filter((x) => d2(x) <= eps * eps).sort((u, w) => d2(u) - d2(w))) {
    if (rez.every((x) => Math.abs(x - t) > 1e-6)) rez.push(t);
  }
  return rez;
}

/** Punctul dublu al unei cubice (ea se taie singură): parametrii s < t cu B(s) = B(t), sau null. */
function punctDublu(g: Seg): readonly [number, number] | null {
  if (g.s.tip !== 'C') return null;
  const { a: p0, b: p3 } = g, p1 = g.s.c1, p2 = g.s.c2;
  const A = { x: -p0.x + 3 * p1.x - 3 * p2.x + p3.x, y: -p0.y + 3 * p1.y - 3 * p2.y + p3.y };
  const B = { x: 3 * p0.x - 6 * p1.x + 3 * p2.x, y: 3 * p0.y - 6 * p1.y + 3 * p2.y };
  const C = { x: -3 * p0.x + 3 * p1.x, y: -3 * p0.y + 3 * p1.y };
  const cruce = (u: Punct, v: Punct): number => u.x * v.y - u.y * v.x;
  const ab = cruce(A, B), aa = A.x * A.x + A.y * A.y;
  if (Math.abs(ab) < 1e-15 || aa < 1e-30) return null;
  const sigma = -cruce(A, C) / ab;
  const pi = sigma * sigma + ((B.x * sigma + C.x) * A.x + (B.y * sigma + C.y) * A.y) / aa;
  const delta = sigma * sigma - 4 * pi;
  if (!(delta > 0)) return null;
  const r = Math.sqrt(delta);
  const s = (sigma - r) / 2, t = (sigma + r) / 2;
  return s >= 0 && t <= 1 ? [s, t] : null;
}

/** Newton pe P_i(s) = P_j(t): încrucișarea exactă a celor două drumuri, pornind de la (s, t); întoarce perechea mai bună. */
function rafineaza(gi: Seg, gj: Seg, s0: number, t0: number): readonly [number, number] {
  let s = s0, t = t0;
  const rest = (u: number, w: number): number => dist(punctPe(gi, u), punctPe(gj, w));
  let best = rest(s, t);
  for (let it = 0; it < 30 && best > 1e-13; it++) {
    const P = punctPe(gi, s), Q = punctPe(gj, t), dP = derivataPe(gi, s), dQ = derivataPe(gj, t);
    const fx = P.x - Q.x, fy = P.y - Q.y;
    const det = dP.x * -dQ.y - -dQ.x * dP.y;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-18) break;
    const ds = (-fx * -dQ.y - -dQ.x * -fy) / det;
    const dt = (dP.x * -fy - -fx * dP.y) / det;
    const sn = Math.max(0, Math.min(1, s + ds)), tn = Math.max(0, Math.min(1, t + dt));
    const r = rest(sn, tn);
    if (!(r < best)) break;
    s = sn; t = tn; best = r;
  }
  return [s, t];
}

/** Locul unui drum pe cale: segmentul și parametrul, cu capătul unui segment scris ca începutul celui următor. */
type Pozitie = { readonly k: number; readonly t: number };
function pozitie(k: number, t: number, n: number): Pozitie {
  if (t >= 1 - 1e-9) return { k: (k + 1) % n, t: 0 };
  return { k, t: t <= 1e-9 ? 0 : t };
}
const inainte = (p: Pozitie, q: Pozitie): boolean => p.k < q.k || (p.k === q.k && p.t < q.t);

/**
 * Cele două bucle ale căii închise despărțite în X (§13): cele două drumuri prin X, găsite pe segmentele lume ale
 * încrucișării (la cubica care se taie singură, punctul ei dublu), rafinate cu Newton, apoi tăiate exact (`adaugaNod`) în
 * coordonatele elementului, unde parametrii sunt aceiași. Întâi bucla dintre cele două drumuri, apoi restul; fiecare, o
 * cale închisă cu nodul de încrucișare.
 */
function despartiLa(f: FormaCale, lume: Contur, I: number, J: number, X: Punct): readonly [FormaCale, FormaCale] | null {
  const n = f.varfuri.length;
  const gi = segment(lume, I), gj = segment(lume, J);
  let pereche: readonly [number, number] | null = null;
  if (I === J) {
    const d = punctDublu(gi);
    if (d && dist(punctPe(gi, d[0]), X) <= 0.01 && dist(punctPe(gi, d[1]), X) <= 0.01) pereche = d;
  } else {
    const eps = (g: Seg): number => (g.s.tip === 'C' ? 0.005 : 1e-6 + 1e-9 * Math.max(Math.abs(X.x), Math.abs(X.y)));
    const si = treceri(gi, X, eps(gi)), tj = treceri(gj, X, eps(gj));
    if (si.length === 1 && tj.length === 1) pereche = [si[0] as number, tj[0] as number];
  }
  if (!pereche) return null;
  const [s, t] = rafineaza(gi, gj, pereche[0], pereche[1]);
  let p1 = pozitie(I, s, n), p2 = pozitie(J, t, n);
  if (inainte(p2, p1)) [p1, p2] = [p2, p1];
  if (p1.k === p2.k && p1.t === p2.t) return null;
  // Întâi tăietura de mai departe pe cale, ca indicii celei dintâi să rămână aceiași.
  let c = f;
  let iB = p2.k;
  if (p2.t > 0) { c = adaugaNod(c, p2.k, p2.t); iB = p2.k + 1; }
  let iA = p1.k;
  if (p1.t > 0) {
    // Pe același segment, prima tăietură cade în bucata de la început a celui tăiat deja: parametrul ei se rescalează.
    const t1 = p1.k === p2.k && p2.t > 0 ? p1.t / p2.t : p1.t;
    c = adaugaNod(c, p1.k, t1);
    iA = p1.k + 1;
    iB++;
  }
  // O parte dintr-un singur segment (bucla unei singure cubice) n-ar avea două vârfuri: segmentul ei se taie la jumătate.
  if (iB - iA === 1) { c = adaugaNod(c, iA, 0.5); iB++; }
  if (iA === 0 && iB === c.varfuri.length - 1) c = adaugaNod(c, iB, 0.5);
  const bucla: FormaCale = { ...c, inchis: true, varfuri: c.varfuri.slice(iA, iB) };
  const rest: FormaCale = { ...c, inchis: true, varfuri: [...c.varfuri.slice(0, iA), ...c.varfuri.slice(iB)] };
  return caleBuna(bucla) && caleBuna(rest) ? [bucla, rest] : null;
}

/** Locurile (un punct) în care calea, în lume, se taie singură, sub toleranță; null: n-are geometrie pentru cavalier. */
function incrucisari(lume: Contur, tol: number, orig?: number[]): ReturnType<typeof locuri> | null {
  const lucru = pentruCavalier(lume, orig);
  if (lucru === null || lucru === 'esuat') return null;
  return locuri(autointersectii(lucru), tol).filter((l) => l.puncte.length === 1);
}

/**
 * Bucla de la X a căii (închise) unui element (§13): cu bucla mai mică decât `pragBucla` din suma ariilor celor două, calea
 * rămâne cea mare (drumul trece drept prin X); altfel, amândouă, cea mare întâi. Reușită doar dacă nicio parte nu se mai taie
 * singură în X.
 */
function reparaBucla(f: FormaCale, e: ElementLume, X: Punct, o: OptiuniReparare): readonly FormaCale[] | MotivReparare {
  const lume = conturElement({ forma: f, matrice: e.matrice });
  const orig: number[] = [];
  const lucru = pentruCavalier(lume, orig);
  if (lucru === null || lucru === 'esuat') return 'nereusita';
  let loc: ReturnType<typeof locuri>[number] | null = null;
  for (const l of locuri(autointersectii(lucru), o.toleranta)) {
    if (l.puncte.length !== 1 || dist(l.puncte[0], X) > o.toleranta) continue;
    if (!loc || dist(l.puncte[0], X) < dist(loc.puncte[0], X)) loc = l;
  }
  if (!loc) return 'disparuta';
  const P = loc.puncte[0];
  if (!buclaLa(lucru, loc.at.i, loc.at.j, P)) return 'nereusita';
  const parti = despartiLa(f, lume, orig[loc.at.i] as number, orig[loc.at.j] as number, P);
  if (!parti) return 'nereusita';
  const arii = parti.map((x) => Math.abs(arieCuSemn(conturElement({ forma: x, matrice: e.matrice }))));
  const [a0, a1] = arii as [number, number];
  // La arii egale rămâne partea cu începutul căii.
  const mare = a1 >= a0 ? 1 : 0;
  const procent = a0 + a1 > 0 ? (100 * Math.min(a0, a1)) / (a0 + a1) : 0;
  const rez = procent < o.pragBucla ? [parti[mare]] : [parti[mare], parti[1 - mare]];
  for (const x of rez as FormaCale[]) {
    if (!areArie(x, e, o.toleranta)) return 'degenerata';
    const inc = incrucisari(conturElement({ forma: x, matrice: e.matrice }), o.toleranta);
    if (inc === null || inc.some((l) => dist(l.puncte[0], P) <= o.toleranta)) return 'nereusita';
  }
  return rez as FormaCale[];
}

// ——— Reparația ———

const gresit = (motiv: MotivReparare): RezultatReparare => ({ ok: false, motiv });

/** Calea elementului, dacă e una și piesa lui se poate schimba de aici. */
function caleDe(l: Loc | null): { readonly f: FormaCale; readonly l: Loc } | MotivReparare {
  if (!l || l.e.forma.tip !== 'cale') return 'disparuta';
  if (l.ori > 1) return 'impartita';
  return { f: l.e.forma, l };
}

/** Repară ce cere panoul, pe documentul dat (cel din clipa cererii); nimic nu se schimbă în el. */
export function repara(doc: Document, c: CerereReparare, o: OptiuniReparare, indexFoaie = 0): RezultatReparare {
  if (!(o.toleranta >= TOLERANTA_MINIMA && o.toleranta <= TOLERANTA_MAXIMA)) return gresit('toleranta');
  const h = harta(doc, indexFoaie);
  const schimbari = new Map<string, Schimbare>();
  const tol = o.toleranta;

  if (c.fel === 'inchide') {
    const x = caleDe(h.loc(c.element));
    if (typeof x === 'string') return gresit(x);
    const { f, l } = x;
    if (f.inchis) return gresit('disparuta');
    const lume = conturElement(l.e);
    const gol = dist((lume.varfuri[0] as { p: Punct }).p, (lume.varfuri[lume.varfuri.length - 1] as { p: Punct }).p);
    if (gol > o.pragInchidere) return gresit('prea-departe');
    const nou = inchide(f, gol <= tol);
    if (!nou || !caleBuna(nou) || !areArie(nou, l.e, tol)) return gresit('degenerata');
    schimbarea(schimbari, l.piesa.id).forme.set(l.e.nod, nou);
    return rezultat(doc, schimbari, [], 1, 0);
  }

  if (c.fel === 'noduri') {
    const x = caleDe(h.loc(c.element));
    if (typeof x === 'string') return gresit(x);
    const { f, l } = x;
    const lume = conturElement(l.e);
    const siruri = siruriMici(lume, tol);
    if (siruri === 'praf') return gresit('degenerata');
    let ales: { readonly a: number; readonly b: number } | null = null;
    const p = (k: number): Punct => (lume.varfuri[k % lume.varfuri.length] as { p: Punct }).p;
    for (const s of siruri) if (dist(p(s.a), c.punct) <= tol && (!ales || dist(p(s.a), c.punct) < dist(p(ales.a), c.punct))) ales = s;
    if (!ales) return gresit('disparuta');
    const nou = unesteSiruri(f, [ales]);
    if (!nou || (nou.inchis && !areArie(nou, l.e, tol))) return gresit('degenerata');
    schimbarea(schimbari, l.piesa.id).forme.set(l.e.nod, nou);
    return rezultat(doc, schimbari, [], 1, 0);
  }

  if (c.fel === 'bucla') {
    const x = caleDe(h.loc(c.element));
    if (typeof x === 'string') return gresit(x);
    const { f, l } = x;
    if (!f.inchis) return gresit('disparuta');
    const r = reparaBucla(f, l.e, c.punct, o);
    if (typeof r === 'string') return gresit(r);
    const s = schimbarea(schimbari, l.piesa.id);
    s.forme.set(l.e.nod, r[0] as FormaCale);
    if (r.length > 1) s.dupa.set(l.e.nod, r.slice(1));
    return rezultat(doc, schimbari, [], 1, 0);
  }

  // „Toate”: pe lista de acum a verificării (aceleași opțiuni), deci exact ce arată panoul.
  const v = verificaVectorii(doc, o, indexFoaie);
  if (!v.ok) return gresit('toleranta');

  if (c.fel === 'copii') {
    const plan = planCopii(h, v.probleme);
    let scoase = 0, operatie = 0, impartita = 0;
    for (const g of plan.grupuri.values()) { scoase += g.scoase; operatie += g.operatie; impartita += g.impartita; }
    if (scoase === 0) return gresit(impartita > 0 ? 'impartita' : operatie > 0 ? 'operatie' : 'nimic');
    for (const [piesa, noduri] of plan.scoase) for (const nod of noduri) schimbarea(schimbari, piesa).scoase.add(nod);
    return rezultat(doc, schimbari, [...plan.sterse], scoase, operatie + impartita);
  }

  // Buclele sau nodurile, pe fiecare formă a listei.
  const fel = c.fel === 'bucle' ? 'autointersectie' : 'noduri';
  const peForma = new Map<string, Punct[]>();
  for (const p of v.probleme) {
    if (p.fel !== fel || p.elemente.length !== 1) continue;
    if (p.fel === 'autointersectie' && (p.puncte.length !== 1 || p.bucla === null || p.bucla.procent === null)) continue;
    const id = p.elemente[0] as string;
    peForma.set(id, [...(peForma.get(id) ?? []), p.puncte[0]]);
  }
  let reparate = 0, ramase = 0, impartite = 0;
  for (const [id, puncte] of peForma) {
    const x = caleDe(h.loc(id));
    if (typeof x === 'string') { ramase += puncte.length; if (x === 'impartita') impartite += puncte.length; continue; }
    const { f, l } = x;
    if (c.fel === 'toate-nodurile') {
      const siruri = siruriMici(conturElement(l.e), tol);
      const nou = siruri === 'praf' || siruri.length === 0 ? null : unesteSiruri(f, siruri);
      if (!nou || (nou.inchis && !areArie(nou, l.e, tol))) { ramase += puncte.length; continue; }
      schimbarea(schimbari, l.piesa.id).forme.set(l.e.nod, nou);
      reparate += puncte.length;
      continue;
    }
    // Buclele formei, una câte una, pe părțile de până acum (o buclă despărțită poate purta alta).
    let parti: FormaCale[] = [f];
    for (const X of puncte) {
      let gata = false;
      for (let k = 0; k < parti.length && !gata; k++) {
        const r = reparaBucla(parti[k] as FormaCale, l.e, X, o);
        if (r === 'disparuta') continue;
        gata = true;
        if (typeof r === 'string') { ramase++; continue; }
        parti = [...parti.slice(0, k), ...r, ...parti.slice(k + 1)];
        reparate++;
      }
      // Fără nicio parte care să se mai taie în X: bucla a plecat cu alta, scoasă înaintea ei.
    }
    if (parti.length === 1 && parti[0] === f) continue;
    // Elementul rămâne partea cea mai mare; celelalte vin după el.
    const arii = parti.map((x) => Math.abs(arieCuSemn(conturElement({ forma: x, matrice: l.e.matrice }))));
    const mare = arii.indexOf(Math.max(...arii));
    const s = schimbarea(schimbari, l.piesa.id);
    s.forme.set(l.e.nod, parti[mare] as FormaCale);
    const rest = parti.filter((_, k) => k !== mare);
    if (rest.length > 0) s.dupa.set(l.e.nod, rest);
  }
  if (reparate === 0) return gresit(impartite > 0 && impartite === ramase ? 'impartita' : ramase > 0 ? 'nereusita' : 'nimic');
  return rezultat(doc, schimbari, [], reparate, ramase);
}
