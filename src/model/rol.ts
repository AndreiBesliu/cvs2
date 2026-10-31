import type { Contur } from '../geom/conturBaza.ts';
import { cutieContur, type Cutie } from '../geom/cutie.ts';
import { adancimiImbricare } from '../geom/imbricare.ts';
import { IDENTITATE } from '../geom/matrice.ts';
import {
  inaltimeConV, operatieImplicita, pasLateralImplicit, PLAFON, UNGHI_V_IMPLICIT, type Document, type FormaSculaDoc, type Latura, type Operatie,
  type Piesa, type Scula, type TipOperatie,
} from './document.ts';
import { conturElement } from './forme.ts';
import { elementeInstanta } from './lume.ts';

/**
 * Rolul de tăiere al unei piese (ADR 0112): ce face freza cu toate formele ei. Se alege din panoul de proprietăți și
 * înlocuiește operațiile piesei cu ale rolului (`document.rol`); fereastra exportului rămâne pentru restul valorilor.
 * - exterior: contururile de afară (adâncimea pară a imbricării) pe exterior, golurile pe interior; interior: invers;
 * - pe linie: toate formele într-o operație; stânga / dreapta: doar o piesă care e o singură cale deschisă;
 * - buzunar, V-carve: toate contururile într-o singură operație (regiunea par-impar, cu golurile ei);
 * - găurire: toate cercurile, doar pe o piesă numai din cercuri.
 * Un rol se oferă doar dacă se potrivește tuturor formelor piesei.
 */
export type Rol = 'exterior' | 'interior' | 'pe-linie' | 'stanga' | 'dreapta' | 'buzunar' | 'gaurire' | 'vcarve';

/** Rolurile, în ordinea listei din panou (a tăieturii din fereastra exportului). */
export const ROLURI: readonly Rol[] = ['exterior', 'interior', 'pe-linie', 'stanga', 'dreapta', 'buzunar', 'gaurire', 'vcarve'];

/**
 * Bugetul imbricării unei piese (candidații vizitați plus vârfurile măsurate, ca la import): panoul o cere la fiecare
 * selecție, deci mai mic decât al importului. Peste el, exteriorul și interiorul nu se oferă pe piesa aceea.
 */
const BUGET_IMBRICARE = 2_000_000;

type FormaPiesei = { readonly id: string; readonly inchis: boolean; readonly cerc: boolean; readonly contur: Contur };
/** Formele piesei, în sistemul ei, și adâncimea de imbricare a fiecăreia (null: peste buget). */
type Analiza = { readonly forme: readonly FormaPiesei[]; readonly adancimi: readonly number[] | null };

/** Analiza ținută pe obiectul piesei: documentul nu se schimbă pe loc, iar panoul o cere la fiecare desen. */
const ANALIZE = new WeakMap<Piesa, Analiza>();

function analiza(p: Piesa): Analiza {
  const tinuta = ANALIZE.get(p);
  if (tinuta) return tinuta;
  const forme = elementeInstanta(p.radacina, { id: '', piesa: p.id }, IDENTITATE).map((e): FormaPiesei => {
    const contur = conturElement(e);
    return { id: e.nod, inchis: contur.inchis, cerc: e.forma.tip === 'cerc', contur };
  });
  const contururi = forme.map((f) => f.contur);
  // Candidații: cutiile care conțin punctul (un superset; includerea exactă decide), fără indexul din cavalier.
  const cutii: Cutie[] = contururi.map(cutieContur);
  const adancimi = forme.length === 1 ? [0] : adancimiImbricare(contururi, (q, vizita) => {
    for (const [j, c] of cutii.entries()) if (q.x >= c.minX && q.x <= c.maxX && q.y >= c.minY && q.y <= c.maxY) vizita(j);
  }, BUGET_IMBRICARE);
  const a = { forme, adancimi };
  ANALIZE.set(p, a);
  return a;
}

/** Rolurile pe care le poate primi piesa, în ordinea listei. */
export function roluriOferite(p: Piesa): Rol[] {
  const { forme, adancimi } = analiza(p);
  if (forme.length === 0) return [];
  const inchise = forme.every((f) => f.inchis);
  const potrivit: Record<Rol, boolean> = {
    exterior: inchise && adancimi !== null,
    interior: inchise && adancimi !== null,
    'pe-linie': true,
    stanga: forme.length === 1 && !inchise,
    dreapta: forme.length === 1 && !inchise,
    buzunar: inchise,
    gaurire: forme.every((f) => f.cerc),
    // Regiunea unui V-carve e a unei singure operații (ADR 0090): peste plafonul nodurilor pe operație, s-ar împărți.
    vcarve: inchise && forme.length <= PLAFON.noduriOperatie,
  };
  return ROLURI.filter((r) => potrivit[r]);
}

/** O operație a rolului, fără valori: felul, latura și formele ei (id-ul e al grupei). */
type Grupa = { readonly id: string; readonly tip: TipOperatie; readonly latura: Latura; readonly noduri: readonly string[] };

/** Câte o grupă la fiecare `PLAFON.noduriOperatie` noduri, ca la import: `id`, `id-2`, `id-3`…; nimic pentru o listă goală. */
function bucati(id: string, tip: TipOperatie, latura: Latura, noduri: readonly string[]): Grupa[] {
  const rez: Grupa[] = [];
  for (let i = 0; i < noduri.length; i += PLAFON.noduriOperatie) {
    rez.push({ id: i === 0 ? id : `${id}-${i / PLAFON.noduriOperatie + 1}`, tip, latura, noduri: noduri.slice(i, i + PLAFON.noduriOperatie) });
  }
  return rez;
}

/** Grupele rolului pe piesă, sau null dacă rolul nu i se potrivește. */
function grupe(p: Piesa, rol: Rol): Grupa[] | null {
  if (!roluriOferite(p).includes(rol)) return null;
  const { forme, adancimi } = analiza(p);
  const toate = forme.map((f) => f.id);
  switch (rol) {
    case 'exterior':
    case 'interior': {
      const gol: Latura = rol === 'exterior' ? 'interior' : 'exterior';
      const afara = forme.filter((_, k) => (adancimi?.[k] ?? 0) % 2 === 0).map((f) => f.id);
      const goluri = forme.filter((_, k) => (adancimi?.[k] ?? 0) % 2 === 1).map((f) => f.id);
      return [...bucati(rol, 'profil', rol, afara), ...bucati(gol, 'profil', gol, goluri)];
    }
    case 'pe-linie':
    case 'stanga':
    case 'dreapta':
      return bucati('linie', 'profil', rol, toate);
    case 'buzunar':
    case 'gaurire':
    case 'vcarve':
      return bucati(rol, rol, 'interior', toate);
  }
}

/**
 * Împărțirea în operații, fără id-uri și valori: felul (la profil, cu latura; celelalte feluri sunt mereu pe interior) și
 * formele fiecărei operații, sortate. Aceeași împărțire = aceeași tăiere: un V-carve împărțit în două operații taie altă
 * regiune decât unul întreg (ADR 0090), deci nu e rolul „V-carve”.
 */
function impartire(ops: ReadonlyArray<{ readonly tip: TipOperatie; readonly latura: Latura; readonly noduri: readonly string[] }>): string[] {
  return ops.map((o) => `${o.tip === 'profil' ? `profil ${o.latura}` : o.tip}|${[...o.noduri].sort().join('\u0000')}`).sort();
}

/**
 * Rolul piesei: cel care ar da exact operațiile ei (felul, latura și formele fiecăreia); null dacă niciunul (operații
 * amestecate, împărțite altfel, o formă fără operație sau una de două ori).
 */
export function rolPiesei(p: Piesa): Rol | null {
  if (p.operatii.length === 0) return null;
  const are = impartire(p.operatii);
  for (const r of roluriOferite(p)) {
    const g = impartire(grupe(p, r) ?? []);
    if (g.length === are.length && g.every((x, i) => x === are[i])) return r;
  }
  return null;
}

/** Aceeași formă de freză: amândouă plate, sau amândouă în V cu același unghi și același vârf. */
function aceeasiForma(a: FormaSculaDoc | undefined, b: FormaSculaDoc | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.tip === b.tip && a.unghi === b.unghi && (a.varf ?? 0) === (b.varf ?? 0);
}

/** Toate frezele proiectului: ale operațiilor, ale fundului plat și frezele de rest. */
function sculeProiect(doc: Document): Scula[] {
  const rez: Scula[] = [];
  for (const p of doc.piese) {
    for (const o of p.operatii) {
      rez.push(o.scula, ...(o.rest ?? []).map((r) => r.scula));
      if (o.fundPlat) rez.push(o.fundPlat.scula, ...(o.fundPlat.rest ?? []).map((r) => r.scula));
    }
  }
  return rez;
}

/**
 * Numărul (T) unei freze care intră în proiect: al unei freze identice (diametrul și forma), altfel cel mai mic liber, ca
 * două freze diferite să nu aibă același număr (ADR 0084).
 */
export function numarFreza(doc: Document, diametru: number, forma: FormaSculaDoc | undefined): number {
  const scule = sculeProiect(doc);
  const identica = scule.find((s) => s.diametru === diametru && aceeasiForma(s.forma, forma));
  if (identica) return identica.numar;
  const folosite = new Set(scule.map((s) => s.numar));
  let n = 1;
  while (folosite.has(n)) n++;
  return n;
}

/**
 * Freza potrivită rolului (ADR 0112 §5): freza în V merge doar pe linie și în V-carve (ADR 0092). La V-carve cu o freză plată,
 * V60 cu același diametru; la alt rol, cu o freză în V, cea plată cu același diametru. Altfel, freza rămâne.
 */
export function frezaPentruRol(doc: Document, s: Scula, rol: Rol): Scula {
  const v = s.forma?.tip === 'v';
  const { forma: _forma, ...baza } = s;
  void _forma;
  if (rol === 'vcarve' && !v) {
    const forma: FormaSculaDoc = { tip: 'v', unghi: UNGHI_V_IMPLICIT };
    return { ...baza, numar: numarFreza(doc, s.diametru, forma), nume: `freza V${UNGHI_V_IMPLICIT}`, forma };
  }
  if (v && rol !== 'vcarve' && rol !== 'pe-linie') return { ...baza, numar: numarFreza(doc, s.diametru, undefined), nume: 'freza plata' };
  return s;
}

/**
 * Operațiile piesei cu rolul ales (ADR 0112 §4), sau null dacă rolul nu i se potrivește. Din prima operație rămân freza
 * (potrivită rolului), sensul, adâncimea, pasul și câmpurile necunoscute; între exterior și interior, și urechile, rampa,
 * intrările și degajările. Restul revine la implicit: pasul lateral al buzunarului 40 % din freză (sau cel vechi, dacă era
 * buzunar și încape), fără coborâre, strategie, freze de rest, fund plat, direcție sau despărțire. O operație care devine
 * tot una își păstrează id-ul.
 */
export function operatiiPentruRol(doc: Document, p: Piesa, rol: Rol): Operatie[] | null {
  const g = grupe(p, rol);
  if (!g || g.length === 0) return null;
  const prima = p.operatii[0] ?? operatieImplicita(g[0]!.id, { tip: 'cerc', raza: 1 });
  const {
    id: _id, tip: tipVechi, noduri: _noduri, latura: _latura, scula: sculaVeche, sens, adancime: adancimeVeche, pas, urechi, rampa, intrari, colturi,
    despartire: _d, pasLateral: pasVechi, coborare: _c, retragereCompleta: _r, fundPlat: _f, directie: _dir, rest: _rest, strategie: _s,
    ...necunoscute
  } = prima;
  void _id; void _noduri; void _latura; void _d; void _c; void _r; void _f; void _dir; void _rest; void _s;
  const scula = frezaPentruRol(doc, sculaVeche, rol);
  // La V-carve, adâncimea e cel mult conul frezei, rotunjit în jos la 0,001 mm (ADR 0112, precizarea 5.8↑c): altfel lucrarea
  // l-ar refuza („regiunea cere … iar conul frezei are …”), de pildă la gaura de 8 mm a unui cerc nou, cu V60 Ø6.
  const con = rol === 'vcarve' && scula.forma?.tip === 'v' ? inaltimeConV(scula.diametru, scula.forma.unghi, scula.forma.varf ?? 0) : Infinity;
  const adancime = Math.min(adancimeVeche, Math.floor(con * 1000) / 1000);
  const vechi = rolPiesei(p);
  const profil = (r: Rol | null): boolean => r === 'exterior' || r === 'interior';
  const extra = profil(vechi) && profil(rol) ? { urechi, rampa, intrari, colturi } : { urechi: null, rampa: null, intrari: null, colturi: null };
  const pasLateral = tipVechi === 'buzunar' && pasVechi !== undefined && pasVechi <= scula.diametru / 2 ? pasVechi : pasLateralImplicit(scula.diametru);
  const ops = g.map((x): Operatie => ({
    ...structuredClone(necunoscute), id: x.id, tip: x.tip, noduri: [...x.noduri], scula: structuredClone(scula), latura: x.latura, sens, adancime, pas,
    ...structuredClone(extra), ...(x.tip === 'buzunar' ? { pasLateral } : {}),
  }));
  const singura = p.operatii.length === 1 ? p.operatii[0] : undefined;
  if (ops.length === 1 && singura) ops[0] = { ...ops[0]!, id: singura.id };
  return ops;
}
