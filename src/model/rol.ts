import type { Contur } from '../geom/conturBaza.ts';
import { cutieContur, type Cutie } from '../geom/cutie.ts';
import { adancimiImbricare } from '../geom/imbricare.ts';
import { IDENTITATE } from '../geom/matrice.ts';
import {
  ADAOS_IMPLICIT, inaltimeConV, INCRUSTATIE_DREAPTA_IMPLICITA, INCRUSTATIE_IMPLICITA, JOC_INCRUSTATIE_MINIM, operatieImplicita, pasLateralImplicit, PLAFON,
  UNGHI_V_IMPLICIT, type Document, type FormaSculaDoc, type Incrustatie, type IncrustatieDreapta, type IncrustatieV, type Latura, type Operatie,
  type Piesa, type Scula, type TipOperatie,
} from './document.ts';
import { conturElement, esteContur } from './forme.ts';
import { elementeInstanta } from './lume.ts';
import { cuNoduri } from './urechiLocuri.ts';

/**
 * Rolul de tăiere al unei piese (ADR 0112): ce face freza cu toate formele ei. Se alege din panoul de proprietăți și
 * înlocuiește operațiile piesei cu ale rolului (`document.rol`); fereastra exportului rămâne pentru restul valorilor.
 * - exterior: contururile de afară (adâncimea pară a imbricării) pe exterior, golurile pe interior; interior: invers;
 * - pe linie: toate formele într-o operație; stânga / dreapta: doar o piesă care e o singură cale deschisă;
 * - buzunar, V-carve: toate contururile într-o singură operație (regiunea par-impar, cu golurile ei);
 * - incrustație în V (ADR 0170 §5): un V-carve al tuturor contururilor, care își declară dopul (`incrustatie`), cu freza dreaptă
 *   a fundului plat și a feței dopului;
 * - incrustație cu pereți drepți (ADR 0171 §5): un buzunar al tuturor contururilor, care își declară dopul;
 * - găurire: toate cercurile, doar pe o piesă numai din cercuri;
 * - finisarea reliefului (ADR 0312): o finisare pe toate reliefurile, doar pe o piesă numai cu reliefuri;
 * - Relief 3D (ADR 0310 §6, ADR 0313 §6): degroșarea, apoi finisarea, pe toate reliefurile.
 * Un rol se oferă doar dacă se potrivește tuturor formelor piesei.
 */
export type Rol =
  | 'exterior' | 'interior' | 'pe-linie' | 'stanga' | 'dreapta' | 'buzunar' | 'gaurire' | 'vcarve' | 'incrustatie' | 'incrustatie-drept' | 'finisare'
  | 'relief3d';

/** Rolurile, în ordinea listei din panou (a tăieturii din fereastra exportului). */
export const ROLURI: readonly Rol[] = [
  'exterior', 'interior', 'pe-linie', 'stanga', 'dreapta', 'buzunar', 'gaurire', 'vcarve', 'incrustatie', 'incrustatie-drept', 'finisare', 'relief3d',
];

/**
 * Bugetul imbricării unei piese (candidații vizitați plus vârfurile măsurate, ca la import): panoul o cere la fiecare
 * selecție, deci mai mic decât al importului. Peste el, exteriorul și interiorul nu se oferă pe piesa aceea.
 */
const BUGET_IMBRICARE = 2_000_000;

type FormaPiesei = { readonly id: string; readonly inchis: boolean; readonly cerc: boolean; readonly contur: Contur };
/** Formele piesei, în sistemul ei, adâncimea de imbricare a fiecăreia (null: peste buget) și reliefurile ei (id-urile). */
type Analiza = { readonly forme: readonly FormaPiesei[]; readonly adancimi: readonly number[] | null; readonly reliefuri: readonly string[] };

/** Analiza ținută pe obiectul piesei: documentul nu se schimbă pe loc, iar panoul o cere la fiecare desen. */
const ANALIZE = new WeakMap<Piesa, Analiza>();

function analiza(p: Piesa): Analiza {
  const tinuta = ANALIZE.get(p);
  if (tinuta) return tinuta;
  // Relieful (ADR 0310) n-are rolurile contururilor: are rolurile lui, finisarea (ADR 0312) și „Relief 3D” (ADR 0313).
  const elemente = elementeInstanta(p.radacina, { id: '', piesa: p.id }, IDENTITATE);
  const reliefuri = elemente.filter((e) => e.forma.tip === 'relief').map((e) => e.nod);
  const forme = elemente.filter(esteContur).map((e): FormaPiesei => {
    const contur = conturElement(e);
    return { id: e.nod, inchis: contur.inchis, cerc: e.forma.tip === 'cerc', contur };
  });
  const contururi = forme.map((f) => f.contur);
  // Candidații: cutiile care conțin punctul (un superset; includerea exactă decide), fără indexul din cavalier.
  const cutii: Cutie[] = contururi.map(cutieContur);
  const adancimi = forme.length === 1 ? [0] : adancimiImbricare(contururi, (q, vizita) => {
    for (const [j, c] of cutii.entries()) if (q.x >= c.minX && q.x <= c.maxX && q.y >= c.minY && q.y <= c.maxY) vizita(j);
  }, BUGET_IMBRICARE);
  const a = { forme, adancimi, reliefuri };
  ANALIZE.set(p, a);
  return a;
}

/** Rolurile pe care le poate primi piesa, în ordinea listei. */
export function roluriOferite(p: Piesa): Rol[] {
  const { forme, adancimi, reliefuri } = analiza(p);
  // O piesă doar cu reliefuri are finisarea (ADR 0312); una cu reliefuri și contururi, deocamdată doar rolurile contururilor
  // (rolul e al piesei întregi, ADR 0112): finisarea ei se scrie din document sau dintr-un rol separat, mai târziu.
  if (forme.length === 0) return reliefuri.length > 0 && reliefuri.length <= PLAFON.noduriOperatie ? ['finisare', 'relief3d'] : [];
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
    // Locașul incrustației e tot un V-carve (ADR 0170 §2).
    incrustatie: inchise && forme.length <= PLAFON.noduriOperatie,
    // Cu pereți drepți, un buzunar (ADR 0171 §2), tot al unei singure operații: conturul potrivit e al figurii întregi.
    'incrustatie-drept': inchise && forme.length <= PLAFON.noduriOperatie,
    finisare: false,
    relief3d: false,
  };
  return ROLURI.filter((r) => potrivit[r]);
}

/**
 * O operație a rolului, fără valori: felul, latura și formele ei (id-ul e al grupei); `incrustatie`, felul incrustației, dacă
 * operația își declară dopul: `v` pe un V-carve (ADR 0170), `drept` pe un buzunar (ADR 0171).
 */
export type Grupa = {
  readonly id: string; readonly tip: TipOperatie; readonly latura: Latura; readonly noduri: readonly string[]; readonly incrustatie?: 'v' | 'drept';
};

/** Câte o grupă la fiecare `PLAFON.noduriOperatie` noduri, ca la import: `id`, `id-2`, `id-3`…; nimic pentru o listă goală. */
function bucati(id: string, tip: TipOperatie, latura: Latura, noduri: readonly string[]): Grupa[] {
  const rez: Grupa[] = [];
  for (let i = 0; i < noduri.length; i += PLAFON.noduriOperatie) {
    rez.push({ id: i === 0 ? id : `${id}-${i / PLAFON.noduriOperatie + 1}`, tip, latura, noduri: noduri.slice(i, i + PLAFON.noduriOperatie) });
  }
  return rez;
}

/** Grupele rolului pe piesă, sau null dacă rolul nu i se potrivește. */
export function grupeRol(p: Piesa, rol: Rol): Grupa[] | null {
  if (!roluriOferite(p).includes(rol)) return null;
  const { forme, adancimi, reliefuri } = analiza(p);
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
    case 'incrustatie':
      return bucati('incrustatie', 'vcarve', 'interior', toate).map((g) => ({ ...g, incrustatie: 'v' as const }));
    case 'incrustatie-drept':
      return bucati('incrustatie-drept', 'buzunar', 'interior', toate).map((g) => ({ ...g, incrustatie: 'drept' as const }));
    case 'finisare':
      return [{ id: 'finisare', tip: 'finisare', latura: 'pe-linie', noduri: [...reliefuri] }];
    case 'relief3d':
      return [
        { id: 'degrosare', tip: 'degrosare', latura: 'pe-linie', noduri: [...reliefuri] },
        { id: 'finisare', tip: 'finisare', latura: 'pe-linie', noduri: [...reliefuri] },
      ];
  }
}

/**
 * Împărțirea în operații, fără id-uri și valori: felul (la profil, cu latura; celelalte feluri sunt mereu pe interior) și
 * formele fiecărei operații, sortate. Aceeași împărțire = aceeași tăiere: un V-carve împărțit în două operații taie altă
 * regiune decât unul întreg (ADR 0090), deci nu e rolul „V-carve”.
 */
function impartire(ops: ReadonlyArray<{ readonly tip: TipOperatie; readonly latura: Latura; readonly noduri: readonly string[]; readonly incrustatie?: unknown }>): string[] {
  // Un V-carve sau un buzunar care își declară dopul (ADR 0170, ADR 0171) e rolul incrustației, nu al V-carve-ului sau al
  // buzunarului: felul incrustației, din grupă (`v` / `drept`) sau din operație (`incrustatie.fel`).
  const inc = (o: (typeof ops)[number]): unknown => (typeof o.incrustatie === 'object' && o.incrustatie !== null ? (o.incrustatie as { fel?: unknown }).fel : o.incrustatie);
  const fel = (o: (typeof ops)[number]): string => (o.tip === 'profil' ? `profil ${o.latura}` : o.incrustatie !== undefined ? `${o.tip}+incrustatie-${String(inc(o))}` : o.tip);
  return ops.map((o) => `${fel(o)}|${[...o.noduri].sort().join('\u0000')}`).sort();
}

/**
 * Rolul piesei: cel care ar da exact operațiile ei (felul, latura și formele fiecăreia); null dacă niciunul (operații
 * amestecate, împărțite altfel, o formă fără operație sau una de două ori).
 */
export function rolPiesei(p: Piesa): Rol | null {
  if (p.operatii.length === 0) return null;
  const are = impartire(p.operatii);
  for (const r of roluriOferite(p)) {
    const g = impartire(grupeRol(p, r) ?? []);
    if (g.length === are.length && g.every((x, i) => x === are[i])) return r;
  }
  return null;
}

/** Aceeași formă de freză: amândouă plate, sau amândouă în V cu același unghi și același vârf. */
function aceeasiForma(a: FormaSculaDoc | undefined, b: FormaSculaDoc | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.tip === b.tip && a.unghi === b.unghi && (a.varf ?? 0) === (b.varf ?? 0);
}

/**
 * Aceeași freză montată (ADR 0084, ADR 0300 §5): același diametru, aceeași formă și aceeași turație (a valorilor ei, sau
 * niciuna: turația lucrării). Același T cu altă turație ar fi refuzat la export, deci o turație diferită cere alt număr.
 */
export function aceeasiFreza(a: Pick<Scula, 'diametru' | 'forma' | 'regim'>, b: Pick<Scula, 'diametru' | 'forma' | 'regim'>): boolean {
  return a.diametru === b.diametru && aceeasiForma(a.forma, b.forma) && a.regim?.turatie === b.regim?.turatie;
}

/**
 * Toate frezele proiectului: ale operațiilor, ale fundului plat, frezele de rest și ale dopurilor cu pereți drepți (ADR 0171:
 * același T e aceeași freză și în fișierul dopului); fără piesele din `fara` și fără freza principală a operațiilor pentru
 * care `faraScula` spune da (ADR 0300 §4: freza pe care o înlocuiește alegerea din bibliotecă).
 */
export function sculeProiect(doc: Document, fara: ReadonlySet<string> = new Set(), faraScula: (p: Piesa, o: Operatie) => boolean = () => false): Scula[] {
  const rez: Scula[] = [];
  for (const p of doc.piese) {
    if (fara.has(p.id)) continue;
    for (const o of p.operatii) {
      if (!faraScula(p, o)) rez.push(o.scula);
      rez.push(...(o.rest ?? []).map((r) => r.scula));
      if (o.fundPlat) rez.push(o.fundPlat.scula, ...(o.fundPlat.rest ?? []).map((r) => r.scula));
      if (o.incrustatie?.fel === 'drept') rez.push(...(o.incrustatie.frezeDop ?? []).map((r) => r.scula));
    }
  }
  return rez;
}

/** Cel mai mic număr pe care nu-l are nicio freză din listă. */
function primulLiber(scule: readonly Scula[]): number {
  const folosite = new Set(scule.map((s) => s.numar));
  let n = 1;
  while (folosite.has(n)) n++;
  return n;
}

/**
 * Numărul unei freze care intră printre `luate` (ADR 0114 §5, ADR 0300 §4): al ei, cât nicio freză diferită nu-l are; altfel
 * al unei freze identice (`aceeasiFreza`); altfel cel mai mic liber.
 */
export function numarPrintre(luate: readonly Scula[], s: Scula): number {
  if (luate.every((x) => x.numar !== s.numar || aceeasiFreza(x, s))) return s.numar;
  return luate.find((x) => aceeasiFreza(x, s))?.numar ?? primulLiber(luate);
}

/**
 * Numărul (T) unei freze care intră în proiect: al unei freze identice (diametrul, forma, fără valori de lucru), altfel cel mai
 * mic liber, ca două freze diferite să nu aibă același număr (ADR 0084).
 */
export function numarFreza(doc: Document, diametru: number, forma: FormaSculaDoc | undefined): number {
  const scule = sculeProiect(doc);
  const identica = scule.find((s) => aceeasiFreza(s, { diametru, ...(forma ? { forma } : {}) }));
  if (identica) return identica.numar;
  return primulLiber(scule);
}

/**
 * Numerele frezelor unui rol personalizat (ADR 0114 §5), în ordinea dată (`numarPrintre`). Frezele pieselor din `inlocuite`
 * nu se numără (își pierd operațiile), iar cele numerotate deja intră în socoteala următoarelor.
 */
export function numereFreze(doc: Document, scule: readonly Scula[], inlocuite: ReadonlySet<string>): number[] {
  const luate = sculeProiect(doc, inlocuite);
  return scule.map((s) => {
    const n = numarPrintre(luate, s);
    luate.push({ ...s, numar: n });
    return n;
  });
}

/**
 * Freza unei finisări, schimbată din panou (ADR 0312): forma (bila, plata sau V-ul cu unghiul implicit) și diametrul; numărul
 * T e al unei freze identice din proiect, altfel cel mai mic liber (`numarFreza`), iar numele urmează forma. Cu aceeași formă
 * și același diametru, freza rămâne (cu originea și valorile ei).
 */
export function frezaFinisare(doc: Document, s: Scula, forma: 'bila' | 'plata' | 'v' | 'toroidala', diametru: number, razaColt?: number): Scula {
  const acum = s.forma?.tip === 'bila' ? 'bila' : s.forma?.tip === 'v' ? 'v' : s.forma?.tip === 'toroidala' ? 'toroidala' : 'plata';
  const razaVeche = s.forma?.tip === 'toroidala' ? s.forma.raza : undefined;
  if (acum === forma && s.diametru === diametru && (forma !== 'toroidala' || razaColt === undefined || razaColt === razaVeche)) return s;
  // Toroidala (18.1↑e-1, ADR 0319): raza colțului scrisă, ori cea de acum (cât încape sub Ø / 2), ori implicit cel mult 1 mm și
  // Ø / 4.
  const raza = razaColt ?? (razaVeche !== undefined && razaVeche < diametru / 2 ? razaVeche : Math.min(1, diametru / 4));
  const f: FormaSculaDoc | undefined = forma === 'bila' ? { tip: 'bila' } : forma === 'v' ? { tip: 'v', unghi: s.forma?.tip === 'v' ? s.forma.unghi : UNGHI_V_IMPLICIT }
    : forma === 'toroidala' ? { tip: 'toroidala', raza } : undefined;
  const nume = forma === 'bila' ? 'freza bila' : forma === 'v' ? `freza V${f?.tip === 'v' ? f.unghi : UNGHI_V_IMPLICIT}` : forma === 'toroidala' ? `freza toroidala r${raza}` : 'freza plata';
  return { numar: numarFreza(doc, diametru, f), nume, diametru, ...(f ? { forma: f } : {}) };
}

/** Pasul lateral implicit al finisării (ADR 0312): 10 % din freză, rotunjit în jos la 0,001 mm (creasta bilei ~0,6 % din Ø). */
export function pasLateralFinisare(diametru: number): number {
  return Math.max(0.001, Math.floor(diametru * 100) / 1000);
}

/**
 * Freza potrivită rolului (ADR 0112 §5): freza în V merge doar pe linie și în V-carve (ADR 0092). La V-carve cu o freză plată,
 * V60 cu același diametru; la alt rol, cu o freză în V, cea plată cu același diametru. Altfel, freza rămâne.
 */
export function frezaPentruRol(doc: Document, s: Scula, rol: Rol): Scula {
  const v = s.forma?.tip === 'v';
  const { forma: _forma, ...baza } = s;
  void _forma;
  // Finisarea reliefului (ADR 0312): cu o bilă de același diametru, dacă nu era deja una; bila nu merge altundeva.
  if (rol === 'finisare') {
    // Toroidala (18.1↑e-1, ADR 0319) se taie și ea la finisare: rămâne, ca bila.
    if (s.forma?.tip === 'bila' || s.forma?.tip === 'toroidala') return s;
    const forma: FormaSculaDoc = { tip: 'bila' };
    return { ...baza, numar: numarFreza(doc, s.diametru, forma), nume: 'freza bila', forma };
  }
  if (s.forma?.tip === 'bila') {
    if (rol === 'vcarve' || rol === 'incrustatie') {
      const forma: FormaSculaDoc = { tip: 'v', unghi: UNGHI_V_IMPLICIT };
      return { ...baza, numar: numarFreza(doc, s.diametru, forma), nume: `freza V${UNGHI_V_IMPLICIT}`, forma };
    }
    return { ...baza, numar: numarFreza(doc, s.diametru, undefined), nume: 'freza plata' };
  }
  if ((rol === 'vcarve' || rol === 'incrustatie') && !v) {
    const forma: FormaSculaDoc = { tip: 'v', unghi: UNGHI_V_IMPLICIT };
    return { ...baza, numar: numarFreza(doc, s.diametru, forma), nume: `freza V${UNGHI_V_IMPLICIT}`, forma };
  }
  if (v && rol !== 'vcarve' && rol !== 'incrustatie' && rol !== 'pe-linie') return { ...baza, numar: numarFreza(doc, s.diametru, undefined), nume: 'freza plata' };
  return s;
}

/**
 * Valorile incrustației unui rol nou (ADR 0170, răspunsul 3): cele de dinainte, dacă erau, altfel cele implicite; spațiul pentru
 * fierăstrău cel mult cât lasă conul (S + H ≤ con, rotunjit în jos la 0,001 mm) și jocul sub adâncime, ca lucrarea să nu le
 * refuze din prima.
 */
function incrustatiePentru(vechi: Incrustatie | undefined, adancime: number, con: number): IncrustatieV {
  const i = vechi?.fel === 'v' ? structuredClone(vechi) : structuredClone(INCRUSTATIE_IMPLICITA);
  const joc = Math.min(i.joc, Math.max(JOC_INCRUSTATIE_MINIM, Math.floor((adancime / 2) * 1000) / 1000));
  const loc = Math.floor((con - (adancime - joc)) * 1000) / 1000;
  return { ...i, joc, fierastrau: loc > 0 ? Math.min(i.fierastrau, loc) : i.fierastrau };
}

/**
 * Valorile incrustației cu pereți drepți a unui rol nou (ADR 0171): cele de dinainte, dacă era una cu pereți drepți, altfel cele
 * implicite; jocul de sub dop cel mult jumătate din adâncime (la sprijinul pe față, dopul intră cel puțin jumătate).
 */
function incrustatieDreaptaPentru(vechi: Incrustatie | undefined, adancime: number): IncrustatieDreapta {
  const i = vechi?.fel === 'drept' ? structuredClone(vechi) : structuredClone(INCRUSTATIE_DREAPTA_IMPLICITA);
  return { ...i, joc: Math.min(i.joc, Math.max(JOC_INCRUSTATIE_MINIM, Math.floor((adancime / 2) * 1000) / 1000)) };
}

/**
 * Operațiile piesei cu rolul ales (ADR 0112 §4), sau null dacă rolul nu i se potrivește. Din prima operație rămân freza
 * (potrivită rolului), sensul, adâncimea, pasul și câmpurile necunoscute; între exterior și interior, și urechile, rampa,
 * intrările și degajările. Restul revine la implicit: pasul lateral al buzunarului 40 % din freză (sau cel vechi, dacă era
 * buzunar și încape), fără coborâre, strategie, freze de rest, fund plat, direcție sau despărțire. O operație care devine
 * tot una își păstrează id-ul.
 */
export function operatiiPentruRol(doc: Document, p: Piesa, rol: Rol): Operatie[] | null {
  const g = grupeRol(p, rol);
  if (!g || g.length === 0) return null;
  if (rol === 'relief3d') return operatiiRelief3d(doc, p, g);
  // La finisare, operația de pornire e finisarea piesei, dacă are una (din „Relief 3D”, prima e degroșarea).
  const finPiesei = rol === 'finisare' ? p.operatii.find((o) => o.tip === 'finisare') : undefined;
  const prima = finPiesei ?? p.operatii[0] ?? operatieImplicita(g[0]!.id, { tip: 'cerc', raza: 1 });
  const {
    id: _id, tip: tipVechi, noduri: _noduri, latura: _latura, scula: sculaVeche, sens, adancime: adancimeVeche, pas, urechi, rampa, intrari, colturi,
    despartire: _d, pasLateral: pasVechi, coborare: _c, retragereCompleta: _r, fundPlat: fundVechi, directie: _dir, rest: _rest, strategie: _s,
    incrustatie: incVechi, finisare: finVechi, degrosare: _deg, ...necunoscute
  } = prima;
  void _id; void _noduri; void _latura; void _d; void _c; void _r; void _dir; void _rest; void _s; void _deg;
  const scula = frezaPentruRol(doc, sculaVeche, rol);
  // La V-carve, adâncimea e cel mult conul frezei, rotunjit în jos la 0,001 mm (ADR 0112, precizarea 5.8↑c): altfel lucrarea
  // l-ar refuza („regiunea cere … iar conul frezei are …”), de pildă la gaura de 8 mm a unui cerc nou, cu V60 Ø6.
  const v = rol === 'vcarve' || rol === 'incrustatie';
  const con = v && scula.forma?.tip === 'v' ? inaltimeConV(scula.diametru, scula.forma.unghi, scula.forma.varf ?? 0) : Infinity;
  const adancime = Math.min(adancimeVeche, Math.floor(con * 1000) / 1000);
  // Incrustația (ADR 0170): valorile ei de dinainte, dacă era deja una, altfel cele implicite, cu spațiul pentru fierăstrău cel
  // mult cât lasă conul (S + H ≤ con); fundul plat (și fața dopului) cu freza dreaptă de dinainte, sau cu freza plată a operației.
  const incrustatie = rol === 'incrustatie' ? incrustatiePentru(incVechi, adancime, con)
    : rol === 'incrustatie-drept' ? incrustatieDreaptaPentru(incVechi, adancime) : undefined;
  const fundPlat = rol !== 'incrustatie' ? undefined : fundVechi ?? {
    scula: sculaVeche.forma ? { numar: numarFreza(doc, sculaVeche.diametru, undefined), nume: 'freza plata', diametru: sculaVeche.diametru } : structuredClone(sculaVeche),
    pasLateral: pasLateralImplicit(sculaVeche.diametru),
  };
  const vechi = rolPiesei(p);
  const profil = (r: Rol | null): boolean => r === 'exterior' || r === 'interior';
  const extra = profil(vechi) && profil(rol) ? { urechi, rampa, intrari, colturi } : { urechi: null, rampa: null, intrari: null, colturi: null };
  const pasLateral = tipVechi === 'buzunar' && pasVechi !== undefined && pasVechi <= scula.diametru / 2 ? pasVechi : pasLateralImplicit(scula.diametru);
  // Finisarea (ADR 0312): valorile ei de dinainte, dacă era deja una; altfel liniile la 0°, pasul lateral 10 % din freză și
  // podeaua cât placa (sub ea nu se coboară; relieful își spune adâncimea în lucrare).
  const fin = rol === 'finisare' ? {
    finisare: finVechi ? structuredClone(finVechi) : { unghi: 0 },
    pasLateral: tipVechi === 'finisare' && pasVechi !== undefined && pasVechi <= scula.diametru ? pasVechi : pasLateralFinisare(scula.diametru),
  } : null;
  const adancimeRol = fin ? (tipVechi === 'finisare' ? adancime : doc.foi[0]?.stoc.grosime ?? adancime) : adancime;
  const ops = g.map((x): Operatie => cuNoduri({
    ...structuredClone(necunoscute), id: x.id, tip: x.tip, noduri: [], scula: structuredClone(scula), latura: x.latura, sens, adancime: adancimeRol, pas,
    ...structuredClone(extra), ...(x.tip === 'buzunar' ? { pasLateral } : {}), ...(fin ? structuredClone(fin) : {}),
    ...(incrustatie ? { incrustatie: structuredClone(incrustatie) } : {}), ...(fundPlat ? { fundPlat: structuredClone(fundPlat) } : {}),
  }, [...x.noduri]));
  const singura = finPiesei ?? (p.operatii.length === 1 ? p.operatii[0] : undefined);
  if (ops.length === 1 && singura) ops[0] = { ...ops[0]!, id: singura.id };
  return ops;
}

/**
 * Operațiile rolului „Relief 3D” (ADR 0313 §6): finisarea, ca la rolul ei (din finisarea piesei, dacă are una), și înaintea
 * ei degroșarea: a piesei, dacă are una, cu valorile ei, altfel freza plată cu diametrul finisării, pasul lateral 40 % din ea,
 * adaosul 0,5 mm, liniile la 0°, adâncimea și pasul finisării. Marginea și planul zero ale degroșării sunt mereu ale
 * finisării (lucrarea le cere potrivite). Numărul T al frezei plate nu ia numărul bilei finisării.
 */
function operatiiRelief3d(doc: Document, p: Piesa, g: readonly Grupa[]): Operatie[] | null {
  const degVeche = p.operatii.find((o) => o.tip === 'degrosare');
  const finVeche = p.operatii.find((o) => o.tip === 'finisare');
  const pornire = finVeche ?? degVeche ?? p.operatii[0];
  const finOps = operatiiPentruRol(doc, { ...p, operatii: pornire ? [pornire] : [] }, 'finisare');
  const fin = finOps?.[0];
  const noduri = g[0]?.noduri ?? [];
  if (!fin) return null;
  const D = degVeche?.scula.diametru ?? fin.scula.diametru;
  const luate = [...sculeProiect(doc, new Set([p.id])), fin.scula];
  const plata: Scula = degVeche && !degVeche.scula.forma ? structuredClone(degVeche.scula) : { numar: 0, nume: 'freza plata', diametru: D };
  const scula = { ...plata, numar: numarPrintre(luate, plata.numar === 0 ? { ...plata, numar: primulLiber(luate) } : plata) };
  const vf = fin.finisare;
  const valori: Record<string, unknown> = degVeche?.degrosare ? structuredClone(degVeche.degrosare) : { adaos: ADAOS_IMPLICIT, unghi: 0 };
  delete valori['margine']; delete valori['planZero'];
  if (vf?.margine !== undefined) valori['margine'] = vf.margine;
  if (vf?.planZero !== undefined) valori['planZero'] = vf.planZero;
  const pasLateral = degVeche?.pasLateral !== undefined && degVeche.pasLateral <= 2 * D ? degVeche.pasLateral : pasLateralImplicit(D);
  let id = degVeche?.id ?? 'degrosare';
  if (id === fin.id) id = `${id}-2`;
  const deg = cuNoduri({
    id, tip: 'degrosare', noduri: [], scula, latura: 'pe-linie', sens: fin.sens, adancime: degVeche?.adancime ?? fin.adancime,
    pas: degVeche?.pas ?? fin.pas, pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
    degrosare: valori as NonNullable<Operatie['degrosare']>,
  }, [...noduri]);
  return [deg, fin];
}
