/**
 * Transformările selecției (ADR 0052, ADR 0054), pure: rotirea, scalarea și oglindirea instanțelor alese, față de un punct
 * al foii. Rotirea schimbă doar instanța (unghiul și locul). Scalarea schimbă geometria piesei, EXACT: dreptunghiul își
 * schimbă laturile, cercul raza, calea vârfurile și punctele de control; un cerc scalat neuniform devine elipsa generatorului
 * uneltei de desen (ADR 0240); unde rezultatul n-ar mai fi exact se refuză cu motiv (o scalare neuniformă pe o instanță sau
 * un nod rotit altfel decât cu un multiplu de 90°; colțurile care nu mai încap; două instanțe alese ale aceleiași piese, pe
 * care schimbarea ar face-o diferit: o piesă pusă de mai multe ori se schimbă pentru toate, ADR 0210 §2, iar literele
 * plăcuțelor ei cu ea, §4). Oglindirea pune reflexia în matricea
 * rădăcinii piesei (o similitudine: arcele rămân arce) și oglindește locul instanței; rotirea instanței rămâne. Înclinarea
 * (ADR 0065) intră în geometrie: liniile și cubicele rămân exacte; arcele (cercul, colțurile rotunjite) se refuză, sau, la
 * cererea omului, devin întâi cubice (ADR 0078), cu abaterea de după înclinare sub toleranța proiectului. Blocul unui text
 * (ADR 0105 §4) crește cu o scalare uniformă; orice altă schimbare a contururilor lui îl lasă doar vectori.
 */
import { inversa } from '../geom/inversa.ts';
import { aplica, compune, rotatie, translatie } from '../geom/matrice.ts';
import { TOLERANTA_IMPORT, TOLERANTA_PROIECT } from '../geom/toleranta.ts';
import { PLAFON, type Document, type FormaDoc, type Instanta, type Matrice, type Nod, type Piesa, type VarfDoc } from './document.ts';
import { blocScalat, blocText, textNeuniformPosibil } from './blocText.ts';
import { elipsa, parametri } from './formeParametrice.ts';
import { jsonCanonic } from './jsonCanonic.ts';
import { cuLitere } from './lume.ts';
import { arcInCubice, caleDinForma, type FormaCale } from './noduri.ts';

type P = { readonly x: number; readonly y: number };

export type Transformare =
  | { readonly fel: 'rotire'; readonly unghi: number; readonly centru: P }
  | {
    readonly fel: 'scalare'; readonly sx: number; readonly sy: number; readonly ancora: P;
    /**
     * Colțurile rotunjite ale unui dreptunghi (ADR 0240 §F.28): lipsă, raza rămâne la o scalare neuniformă și crește la una
     * uniformă; `pastreaza`, raza rămâne mereu; `scaleaza`, crește mereu (la una neuniformă, colțurile devin sferturi de
     * elipsă, din curbe).
     */
    readonly colturi?: 'pastreaza' | 'scaleaza';
  }
  /** `orizontal`: stânga ↔ dreapta, față de dreapta verticală prin `centru`; `vertical`: sus ↔ jos, față de orizontala lui. */
  | { readonly fel: 'oglindire'; readonly directie: 'orizontal' | 'vertical'; readonly centru: P }
  /**
   * Înclinarea (ADR 0065), față de `centru`: întâi orizontal (x crește cu tan(unghiX) · distanța pe y), apoi vertical (y crește
   * cu tan(unghiY) · distanța pe x); unghiurile în grade, cel mult 75° în valoare absolută.
   */
  | {
    readonly fel: 'inclinare'; readonly unghiX: number; readonly unghiY: number; readonly centru: P;
    /** Arcele devin cubice înaintea înclinării (ADR 0078: cercul devine elipsă); lipsă sau false: o formă cu arce se refuză. */
    readonly arceInCurbe?: boolean;
  };

export type MotivTransformare =
  | 'colturi-nu-incap' | 'neuniform-rotit' | 'piesa-impartita' | 'scara-invalida' | 'inclinare-arc' | 'unghi-invalid';

/** Cel mai mare unghi de înclinare acceptat, în grade (tan 75° ≈ 3,7). */
export const UNGHI_MAXIM_INCLINARE = 75;

/** Pură: matricea afină a înclinării față de `centru`: întâi orizontal cu `unghiX`, apoi vertical cu `unghiY` (grade). */
export function matriceInclinare(unghiX: number, unghiY: number, centru: P): Matrice {
  const kx = Math.tan((unghiX * Math.PI) / 180), ky = Math.tan((unghiY * Math.PI) / 180);
  // H = Hy · Hx (determinantul 1: aria se păstrează), mutată în centru.
  const H: Matrice = { a: 1, b: ky, c: kx, d: kx * ky + 1, e: 0, f: 0 };
  return compune(translatie(centru.x, centru.y), compune(H, translatie(-centru.x, -centru.y)));
}

/** Pură: cât lungește cel mult harta liniară a lui `m` (cea mai mare valoare singulară). */
export function intindere(m: Matrice): number {
  const s = m.a * m.a + m.b * m.b + m.c * m.c + m.d * m.d, det = m.a * m.d - m.b * m.c;
  return Math.sqrt((s + Math.sqrt(Math.max(0, s * s - 4 * det * det))) / 2);
}

/** Pură: vârful `k` începe un arc desenat (cu bulge; segmentul ultimului vârf al unei căi deschise nu se desenează, ADR 0001). */
function arcDesenat(c: FormaCale, k: number): boolean {
  const v = c.varfuri[k];
  return v !== undefined && v.s.tip === 'A' && v.s.bulge !== 0 && (c.inchis || k < c.varfuri.length - 1);
}
const areArcCale = (c: FormaCale): boolean => c.varfuri.some((_, k) => arcDesenat(c, k));

/** Piesele instanțelor `ids` ale foii (o piesă folosită de mai multe instanțe, o dată pe instanță). */
function pieseAlese(doc: Document, indexFoaie: number, ids: readonly string[]): Piesa[] {
  const alese = new Set(ids);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  return (doc.foi[indexFoaie]?.instante ?? []).flatMap((i) => {
    const p = alese.has(i.id) ? piese.get(i.piesa) : undefined;
    return p ? [p] : [];
  });
}

/** Pură: o formă a instanțelor `ids` ale foii are arce (un cerc, colțuri rotunjite, o cale cu arce): înclinarea le-ar refuza. */
export function areArce(doc: Document, indexFoaie: number, ids: readonly string[]): boolean {
  const inNod = (n: Nod): boolean => (n.tip === 'element' ? areArcCale(caleDinForma(n.forma)) : n.copii.some(inNod));
  return pieseAlese(doc, indexFoaie, ids).some((p) => inNod(p.radacina));
}

/**
 * Ce schimbă o scalare formelor instanțelor `ids` (ADR 0240 §F), pentru eticheta mânerelor: un cerc (devine elipsă), arcele
 * unei căi (devin curbe), colțurile rotunjite (după felul ales), un text care devine vectori (cu aldin sau pe o curbă; o spune
 * o dată pentru toate literele lui, cu arcele aldinului).
 */
export type FormeScalate = { readonly cerc: boolean; readonly arce: boolean; readonly colturi: boolean; readonly text: boolean };

/** Pură: `FormeScalate` pentru instanțele `ids` ale foii. */
export function formeScalate(doc: Document, indexFoaie: number, ids: readonly string[]): FormeScalate {
  const r = { cerc: false, arce: false, colturi: false, text: false };
  const inNod = (n: Nod): void => {
    if (n.tip === 'grup') {
      for (const c of n.copii) inNod(c);
      return;
    }
    const f = n.forma;
    if (f.tip === 'cerc') r.cerc = true;
    else if (f.tip === 'dreptunghi') r.colturi ||= f.razaColt > 0;
    else r.arce ||= areArcCale(f);
  };
  for (const p of pieseAlese(doc, indexFoaie, ids)) {
    const b = blocText(p.radacina);
    if (b && !textNeuniformPosibil(b)) r.text = true;
    else inNod(p.radacina);
  }
  return r;
}

export type RezultatTransformare =
  | {
    readonly ok: true; readonly instante: readonly Instanta[]; readonly piese: readonly Piesa[];
    /**
     * Plăcuțele neselectate ale pieselor scalate (ADR 0210 §4), pe orice foaie, cu literele lor scalate odată cu piesa (cele
     * alese le au deja în `instante`).
     */
    readonly placute?: ReadonlyArray<{ readonly foaie: string; readonly vechi: Instanta; readonly nou: Instanta }>;
  }
  | { readonly ok: false; readonly motiv: MotivTransformare };

/**
 * Blocurile de text din arborele scalat uniform cu `s` (ADR 0105 §4): fiecare grup cu un bloc valid înainte (rădăcina sau un
 * text grupat, ca un șablon de plăcuțe, ADR 0210 §4) îl păstrează, scalat (`blocScalat`). Arborii au aceeași formă.
 */
function blocuriScalate(inainte: Nod, dupa: Nod, s: number): Nod {
  if (inainte.tip !== 'grup' || dupa.tip !== 'grup') return dupa;
  const copii = dupa.copii.map((c, k) => {
    const v = inainte.copii[k];
    return v ? blocuriScalate(v, c, s) : c;
  });
  return blocScalat(inainte, copii.every((c, k) => c === dupa.copii[k]) ? dupa : { ...dupa, copii }, s, s, true);
}

/**
 * Literele plăcuței `i` scalate cu piesa ei (ADR 0210 §4): arborele ei în lume (`cuLitere`) scalat ca rădăcina piesei, din
 * care fiecare text își ia copiii; textul și operațiile rămân. Motivul, dacă scalarea nu se poate (ca la piesă).
 */
function texteScalate(
  piesa: Piesa, i: Instanta, lx: number, ly: number, colturi: 'pastreaza' | 'scaleaza' | undefined,
): Instanta['texte'] | MotivTransformare {
  const texte = i.texte;
  if (!texte) return texte;
  const lume = scaleazaNod(cuLitere(piesa.radacina, texte), lx, ly, colturi);
  if (typeof lume === 'string') return lume;
  const rez: NonNullable<Instanta['texte']> = {};
  const viziteaza = (n: Nod): void => {
    if (n.tip !== 'grup') return;
    const t = Object.hasOwn(texte, n.id) ? texte[n.id] : undefined;
    if (t) rez[n.id] = { ...t, copii: n.copii };
    else for (const c of n.copii) viziteaza(c);
  };
  viziteaza(lume);
  return rez;
}

const EPS = 1e-12;
const uniforma = (sx: number, sy: number): boolean => Math.abs(sx - sy) <= EPS * Math.max(1, Math.abs(sx), Math.abs(sy));
/** Unghiul (grade) e un multiplu de 90°: 0, 1, 2 sau 3 sferturi; altfel null. */
function sferturi(grade: number): number | null {
  const k = Math.round(grade / 90);
  return Math.abs(grade - k * 90) <= 1e-9 ? ((k % 4) + 4) % 4 : null;
}
const norm360 = (g: number): number => ((g % 360) + 360) % 360;

/** Scalarea (sx, sy) în axele unui nod rotit cu `q` sferturi: la 90° și 270° axele își schimbă locul. */
const inAxe = (sx: number, sy: number, q: number): [number, number] => (q % 2 === 1 ? [sy, sx] : [sx, sy]);

/** Sferturile părții liniare a unei matrice care e o rotire cu multiplu de 90° (eventual oglindită), sau null. */
function sferturiMatrice(m: Matrice): number | null {
  const s = Math.hypot(m.a, m.b);
  if (s <= 0) return null;
  return sferturi((Math.atan2(m.b, m.a) * 180) / Math.PI);
}

/**
 * Pură: calea cu arcele ei desenate făcute cubice ale aceluiași cerc, la cel mult `tol` mm (`arcInCubice`, ADR 0068). Comună
 * înclinării (ADR 0078) și scalării neuniforme (ADR 0240 §F.27).
 */
function arceInCubiceCale(c: FormaCale, tol: number): FormaCale {
  const n = c.varfuri.length;
  return {
    ...c,
    varfuri: c.varfuri.flatMap((v, k): VarfDoc[] => {
      const b = c.varfuri[(k + 1) % n];
      return arcDesenat(c, k) && b && v.s.tip === 'A' ? arcInCubice(v.p, b.p, v.s.bulge, tol) : [v];
    }),
  };
}

/**
 * Pură: forma scalată cu (sx, sy), în axele ei. `sW` e scara elementului în lume (produsul scărilor nodurilor de deasupra și
 * a lui): un arc făcut cubice la o scalare neuniformă rămâne sub toleranța proiectului în lume (ADR 0240 §F.27).
 */
function scaleazaForma(f: FormaDoc, sx: number, sy: number, colturi: 'pastreaza' | 'scaleaza' | undefined, sW: number): FormaDoc | MotivTransformare {
  const u = uniforma(sx, sy);
  // Abaterea unei cubice față de arcul ei crește, la scalare, cel mult cu scara cea mai mare, apoi cu scara elementului.
  const tolArce = TOLERANTA_PROIECT / (sW * Math.max(Math.abs(sx), Math.abs(sy)));
  switch (f.tip) {
    case 'dreptunghi': {
      const latime = f.latime * Math.abs(sx), inaltime = f.inaltime * Math.abs(sy);
      if (f.razaColt === 0) return { ...f, latime, inaltime, razaColt: 0 };
      // Colțurile care se scalează neuniform devin sferturi de elipsă: o cale, din curbe (ADR 0240 §F.28, felul c).
      if (!u && colturi === 'scaleaza') return scaleazaForma(arceInCubiceCale(caleDinForma(f), tolArce), sx, sy, colturi, sW);
      // Altfel raza rămâne (la o scalare neuniformă, sau mereu cu `pastreaza`): dreptunghiul rămâne exact și editabil.
      const razaColt = u && colturi !== 'pastreaza' ? f.razaColt * Math.abs(sx) : f.razaColt;
      if (razaColt > Math.min(latime, inaltime) / 2) return 'colturi-nu-incap';
      return { ...f, latime, inaltime, razaColt };
    }
    case 'cerc':
      // Scalat neuniform, cercul devine elipsa generatorului uneltei de desen (ADR 0240 §F): aceleași cubice ca o elipsă
      // desenată, deci panoul o recunoaște și îi editează razele.
      if (!u) return elipsa({ x: 0, y: 0 }, f.raza * Math.abs(sx), f.raza * Math.abs(sy));
      return { ...f, raza: f.raza * Math.abs(sx) };
    case 'cale': {
      // O elipsă a generatorului, scalată neuniform, se face din nou din generator: cubicele ei rămân sub toleranța lui și
      // recunoscute (scalate punct cu punct, abaterea ar crește cu scara). Uniform, se scalează punct cu punct, ca înainte.
      const el = u ? null : parametri(f);
      if (el?.tip === 'elipsa') {
        const rx = el.rx * Math.abs(sx), ry = el.ry * Math.abs(sy), s = Math.max(rx, ry);
        // Zgomotul recunoașterii (media vârfurilor, ~1e-15) nu scoate centrul din originea piesei: acolo, razele egale dau
        // din nou un cerc exact.
        const z = (v: number): number => (Math.abs(v) <= 1e-9 * s ? 0 : v);
        return elipsa({ x: z(el.centru.x * sx), y: z(el.centru.y * sy) }, rx, ry);
      }
      // Scalate neuniform, arcele devin întâi curbe ale aceluiași cerc (ADR 0240 §F.27), apoi se scalează ca orice cubică.
      const baza = u ? f : arceInCubiceCale(f, tolArce);
      const p = (q: { readonly x: number; readonly y: number; readonly [k: string]: unknown }) => ({ ...q, x: q.x * sx, y: q.y * sy });
      const scalate = baza.varfuri.map((v) => ({ ...v, p: p(v.p), s: v.s.tip === 'C' ? { ...v.s, c1: p(v.s.c1), c2: p(v.s.c2) } : v.s }));
      // Un arc pe care mărirea îl duce peste latura documentului (raza din coardă și bulge, ca schema, cu marja de 0,1 % a
      // importului) devine cubice sub toleranța importului, ca un arc plat la import (ADR 0035 §6, ADR 0102): altfel schema
      // ar refuza documentul, iar piesa n-ar mai crește deloc.
      const n = scalate.length;
      const varfuri = scalate.flatMap((v, i) => {
        const urm = scalate[(i + 1) % n];
        if (v.s.tip !== 'A' || !urm || (!f.inchis && i === n - 1)) return [v];
        const k = Math.abs(v.s.bulge);
        const raza = (Math.hypot(urm.p.x - v.p.x, urm.p.y - v.p.y) / 4) * (k + 1 / k);
        return raza <= PLAFON.latura * 0.999 ? [v] : arcInCubice(v.p, urm.p, v.s.bulge, TOLERANTA_IMPORT);
      });
      return { ...f, varfuri };
    }
  }
}

/**
 * Pură: nodul scalat cu (sx, sy) în axele lui de deasupra: translația lui se scalează, iar copiii (sau forma) primesc scalarea
 * trecută prin rotirea lui (un multiplu de 90°; altfel doar o scalare uniformă trece).
 */
function scaleazaNod(n: Nod, sx: number, sy: number, colturi: 'pastreaza' | 'scaleaza' | undefined, sW = 1): Nod | MotivTransformare {
  const m = n.matrice;
  const matrice = { ...m, e: m.e * sx, f: m.f * sy };
  let lx = sx, ly = sy;
  if (!uniforma(sx, sy)) {
    const q = sferturiMatrice(m);
    if (q === null) return 'neuniform-rotit';
    [lx, ly] = inAxe(sx, sy, q);
  }
  // Scara proprie a nodului (|a, b|) nu se schimbă: scalarea intră în geometrie, în axele locale.
  const s = sW * Math.hypot(m.a, m.b);
  if (n.tip === 'element') {
    const f = scaleazaForma(n.forma, lx, ly, colturi, s);
    return typeof f === 'string' ? f : { ...n, matrice, forma: f };
  }
  const copii: Nod[] = [];
  for (const c of n.copii) {
    const r = scaleazaNod(c, lx, ly, colturi, s);
    if (typeof r === 'string') return r;
    copii.push(r);
  }
  return { ...n, matrice, copii };
}

/** Pură: rotirea sau scalarea instanțelor `ids` ale foii `indexFoaie`, cu piesele lor (scalarea), sau motivul refuzului. */
export function transforma(doc: Document, indexFoaie: number, ids: readonly string[], t: Transformare): RezultatTransformare {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) return { ok: true, instante: [], piese: [] };
  const alese = new Set(ids);
  const instante = foaie.instante.filter((i) => alese.has(i.id));
  if (t.fel === 'rotire') {
    const c = Math.cos((t.unghi * Math.PI) / 180), s = Math.sin((t.unghi * Math.PI) / 180);
    return {
      ok: true,
      piese: [],
      instante: instante.map((i) => {
        const dx = i.x - t.centru.x, dy = i.y - t.centru.y;
        return { ...i, x: t.centru.x + c * dx - s * dy, y: t.centru.y + s * dx + c * dy, rotire: norm360(i.rotire + t.unghi) };
      }),
    };
  }
  // O piesă pusă de mai multe ori (ADR 0210 §2) se schimbă pentru toate instanțele ei: locul și rotirea rămân ale fiecăreia.
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  if (t.fel === 'oglindire') return oglindeste(instante, piese, t);
  if (t.fel === 'inclinare') return inclina(instante, piese, t);
  const { sx, sy, ancora } = t;
  // Fără oglindire din mânere: o scară care trece de zero (mânerul tras peste ancoră) e refuzată, nu întoarsă (oglindirea
  // are butoanele ei, ADR 0054).
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0) return { ok: false, motiv: 'scara-invalida' };
  const noiPiese = new Map<string, Piesa>();
  const noiInstante: Instanta[] = [];
  // Scara fiecărei piese scalate, în axele ei: aceeași pentru literele plăcuțelor ei (ADR 0210 §4).
  const scari = new Map<string, readonly [number, number]>();
  for (const i of instante) {
    const piesa = piese.get(i.piesa);
    if (!piesa) continue;
    let lx = sx, ly = sy;
    if (!uniforma(sx, sy)) {
      const q = sferturi(i.rotire);
      if (q === null) return { ok: false, motiv: 'neuniform-rotit' };
      [lx, ly] = inAxe(sx, sy, q);
    }
    const scalata = scaleazaNod(piesa.radacina, lx, ly, t.colturi);
    if (typeof scalata === 'string') return { ok: false, motiv: scalata };
    // Un bloc de text (ADR 0105 §4) crește cu o scalare uniformă (și unul grupat, ca textul unui șablon de plăcuțe); una
    // neuniformă îl păstrează doar pe un text drept, fără aldin (ADR 0138 §4), pe rădăcină. Scara blocului e cea din axele
    // contururilor lui: ale copiilor rădăcinii, sub rotirea ei.
    const [bx, by] = uniforma(sx, sy) ? [lx, ly] : inAxe(lx, ly, sferturiMatrice(piesa.radacina.matrice) ?? 0);
    const radacina = uniforma(sx, sy) ? blocuriScalate(piesa.radacina, scalata, lx) : blocScalat(piesa.radacina, scalata, bx, by, false);
    if (!oSinguraSchimbare(noiPiese, { ...piesa, radacina })) return { ok: false, motiv: 'piesa-impartita' };
    scari.set(piesa.id, [lx, ly]);
    noiInstante.push({ ...i, x: ancora.x + (i.x - ancora.x) * sx, y: ancora.y + (i.y - ancora.y) * sy });
  }
  // Plăcuțele pieselor scalate (ADR 0210 §4), pe toate foile: literele lor cresc cu piesa.
  const scalate = new Set(noiInstante.map((i) => i.id));
  const placute: Array<{ foaie: string; vechi: Instanta; nou: Instanta }> = [];
  for (const [k, i] of noiInstante.entries()) {
    const piesa = piese.get(i.piesa), s = scari.get(i.piesa);
    if (!piesa || !s || !i.texte) continue;
    const texte = texteScalate(piesa, i, s[0], s[1], t.colturi);
    if (typeof texte === 'string') return { ok: false, motiv: texte };
    if (texte) noiInstante[k] = { ...i, texte };
  }
  for (const f of doc.foi) {
    for (const i of f.instante) {
      const piesa = piese.get(i.piesa), s = scari.get(i.piesa);
      if (!piesa || !s || !i.texte || (f === foaie && scalate.has(i.id))) continue;
      const texte = texteScalate(piesa, i, s[0], s[1], t.colturi);
      if (typeof texte === 'string') return { ok: false, motiv: texte };
      if (texte) placute.push({ foaie: f.id, vechi: i, nou: { ...i, texte } });
    }
  }
  return { ok: true, instante: noiInstante, piese: [...noiPiese.values()], ...(placute.length > 0 ? { placute } : {}) };
}

/**
 * O piesă schimbată o singură dată (ADR 0210 §2): două instanțe alese ale aceleiași piese o schimbă la fel (atunci intră o
 * dată), sau diferit (rotite altfel, la o scalare neuniformă, o oglindire sau o înclinare): atunci schimbarea nu se poate
 * face, iar motivul e `piesa-impartita`.
 */
function oSinguraSchimbare(noi: Map<string, Piesa>, p: Piesa): boolean {
  const deja = noi.get(p.id);
  if (deja) return jsonCanonic(deja) === jsonCanonic(p);
  noi.set(p.id, p);
  return true;
}

/** −0 → 0 (o reflexie înmulțește zerourile cu −1): matricea scrisă în document rămâne aceeași la comparare. */
const fara0 = (m: Matrice): Matrice => ({ a: m.a + 0, b: m.b + 0, c: m.c + 0, d: m.d + 0, e: m.e + 0, f: m.f + 0 });

/**
 * Oglindirea (ADR 0054). În lume, un punct p al piesei e T(loc)·R(rotire)·p. Oglinda S față de axa prin `centru` dă
 * S·T(loc)·R(rotire)·p = T(loc′)·R(rotire)·L·p, cu loc′ = oglinda locului și L = R(−rotire)·S·R(rotire) (o reflexie): rotirea
 * instanței rămâne, iar L intră în matricea rădăcinii piesei, înaintea ei. La multiplii de 90°, L e exactă (0 și ±1).
 */
function oglindeste(
  instante: readonly Instanta[], piese: ReadonlyMap<string, Piesa>, t: Extract<Transformare, { fel: 'oglindire' }>,
): RezultatTransformare {
  const S: Matrice = t.directie === 'orizontal' ? { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 } : { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 };
  const noiPiese = new Map<string, Piesa>();
  const noiInstante: Instanta[] = [];
  for (const i of instante) {
    const piesa = piese.get(i.piesa);
    if (!piesa) continue;
    const L = compune(rotatie(-i.rotire), compune(S, rotatie(i.rotire)));
    if (!oSinguraSchimbare(noiPiese, { ...piesa, radacina: { ...piesa.radacina, matrice: fara0(compune(L, piesa.radacina.matrice)) } })) {
      return { ok: false, motiv: 'piesa-impartita' };
    }
    noiInstante.push(t.directie === 'orizontal' ? { ...i, x: 2 * t.centru.x - i.x } : { ...i, y: 2 * t.centru.y - i.y });
  }
  return { ok: true, instante: noiInstante, piese: [...noiPiese.values()] };
}

/**
 * Forma elementului cu harta afină `A` aplicată geometriei: o cale (dreptunghiul devine conturul lui). Arcele se refuză, sau,
 * cu `tolArce` (mm, în coordonatele elementului), devin întâi cubice ale aceluiași cerc (`arcInCubice`, ADR 0068), apoi se
 * transformă ca orice cubică: exact față de cubice, la cel mult `tolArce` · |A| de arcul înclinat.
 */
function aplicaFormei(f: FormaDoc, A: Matrice, tolArce: number | null): FormaDoc | MotivTransformare {
  const c = caleDinForma(f);
  if (tolArce === null && areArcCale(c)) return 'inclinare-arc';
  const { varfuri } = tolArce === null ? c : arceInCubiceCale(c, tolArce);
  const p = (q: { readonly x: number; readonly y: number }) => aplica(A, q);
  return { ...c, varfuri: varfuri.map((v) => ({ p: p(v.p), s: v.s.tip === 'C' ? { tip: 'C' as const, c1: p(v.s.c1), c2: p(v.s.c2) } : { tip: 'L' as const } })) };
}

/**
 * Nodul cu înclinarea `H` (în lume) trecută în geometria fiecărui element: punctul p al unui element, cu matricea lui în lume
 * W, ajunge în H·W·p = W·(W⁻¹·H·W)·p, deci geometria primește A = W⁻¹·H·W, iar matricele (instanța, nodurile) rămân.
 * Cu `arce`, abaterea unei cubice față de arcul ei (în element) ajunge în lume înmulțită cel mult cu scara lui W și cu
 * întinderea lui H, deci arcele se fac cubice la toleranța proiectului împărțită la amândouă (ADR 0078 §2).
 */
function inclinaNod(n: Nod, sus: Matrice, H: Matrice, arce: boolean): Nod | MotivTransformare {
  const W = compune(sus, n.matrice);
  if (n.tip === 'element') {
    const inv = inversa(W);
    if (!inv) return 'unghi-invalid';
    const tol = arce ? TOLERANTA_PROIECT / (Math.hypot(W.a, W.b) * intindere(H)) : null;
    const f = aplicaFormei(n.forma, compune(inv, compune(H, W)), tol);
    return typeof f === 'string' ? f : { ...n, forma: f };
  }
  const copii: Nod[] = [];
  for (const c of n.copii) {
    const r = inclinaNod(c, W, H, arce);
    if (typeof r === 'string') return r;
    copii.push(r);
  }
  return { ...n, copii };
}

/** Înclinarea (ADR 0065): geometria pieselor primește înclinarea, locul și rotirea instanțelor rămân. */
function inclina(
  instante: readonly Instanta[], piese: ReadonlyMap<string, Piesa>, t: Extract<Transformare, { fel: 'inclinare' }>,
): RezultatTransformare {
  const bun = (u: number): boolean => Number.isFinite(u) && Math.abs(u) <= UNGHI_MAXIM_INCLINARE;
  if (!bun(t.unghiX) || !bun(t.unghiY)) return { ok: false, motiv: 'unghi-invalid' };
  const H = matriceInclinare(t.unghiX, t.unghiY, t.centru);
  const noiPiese = new Map<string, Piesa>();
  for (const i of instante) {
    const piesa = piese.get(i.piesa);
    if (!piesa) continue;
    const radacina = inclinaNod(piesa.radacina, compune(translatie(i.x, i.y), rotatie(i.rotire)), H, t.arceInCurbe === true);
    if (typeof radacina === 'string') return { ok: false, motiv: radacina };
    if (!oSinguraSchimbare(noiPiese, { ...piesa, radacina })) return { ok: false, motiv: 'piesa-impartita' };
  }
  return { ok: true, instante: [], piese: [...noiPiese.values()] };
}
