import type { Document, Latura, Operatie, Piesa, Scula, TipOperatie } from './document.ts';
import { jsonCanonic } from './jsonCanonic.ts';
import { grupeRol, numereFreze, rolPiesei, ROLURI, type Rol } from './rol.ts';
import { operatieInMargini } from './schemaDocument.ts';

/**
 * Rolurile personalizate (ADR 0114): un nume, un rol de bază și operația-model a lui (toate valorile operației), ținute de om
 * în browser și aplicate din panou pe oricâte piese. Aici e partea pură: rolul salvat din piese, aplicarea lui, recunoașterea,
 * verificarea unui rol citit și lista (adăugarea, redenumirea, ștergerea, textul ei). Stocarea e în `src/app/roluriMele.ts`.
 */

/** Plafoanele listei (ADR 0114 §2): câte roluri și câte caractere are un nume. */
export const PLAFON_ROLURI = { roluri: 100, nume: 40 } as const;
/** Versiunea textului listei (ADR 0114 §3); o listă cu alt număr, mai mare, e a unei aplicații mai noi și nu se rescrie. */
export const VERSIUNE_ROLURI = 1;

export type RolPersonal = {
  readonly id: string;
  readonly nume: string;
  readonly baza: Rol;
  /** Operația-model a formelor (ADR 0114 §1); la exterior și interior, a conturului de afară. */
  readonly operatie: Operatie;
  /** La exterior și interior: operația-model a golurilor, când valorile lor diferă de ale conturului. */
  readonly goluri?: Operatie;
};

/** Ce se salvează din piese: rolul de bază și operațiile-model. */
export type SablonRol = Pick<RolPersonal, 'baza' | 'operatie' | 'goluri'>;

/** De ce nu s-a salvat, redenumit sau șters un rol (textele, în panou). */
export type MotivRol =
  | 'fara-rol' | 'roluri-diferite' | 'valori-diferite' | 'operatii-diferite' | 'nume-gol' | 'nume-lung' | 'nume-folosit'
  | 'aceleasi-valori' | 'plafon' | 'disparut' | 'invalid' | 'versiune';

/** Rolurile tăiate pe contur, pe afară și pe dinăuntru: singurele cu goluri (ADR 0112 §2). */
const cuGoluri = (baza: Rol): baza is 'exterior' | 'interior' => baza === 'exterior' || baza === 'interior';

/** Felul și latura operației-model a formelor, după rolul de bază (grupa ei, ADR 0112 §2). */
function felModel(baza: Rol): { readonly tip: TipOperatie; readonly latura: Latura } {
  switch (baza) {
    case 'exterior':
    case 'interior':
    case 'pe-linie':
    case 'stanga':
    case 'dreapta':
      return { tip: 'profil', latura: baza };
    case 'buzunar':
    case 'gaurire':
    case 'vcarve':
      return { tip: baza, latura: 'interior' };
  }
}

/** Latura golurilor la exterior și interior: cealaltă. */
const laturaGolurilor = (baza: 'exterior' | 'interior'): Latura => (baza === 'exterior' ? 'interior' : 'exterior');

/** Id-ul și forma operației-model: nu sunt ale vreunei piese, dar o țin validă pentru schemă. */
const ID_MODEL = 'model';

/**
 * Operația ca model (ADR 0114 §1): fără id-ul, formele, despărțirea și rangul ei (locul în ordinea de mână e al piesei, ADR
 * 0133 §4), cu felul și latura grupei.
 */
function model(o: Operatie, tip: TipOperatie, latura: Latura): Operatie {
  const { despartire: _d, rang: _r, ...v } = o;
  void _d; void _r;
  return { ...structuredClone(v), id: ID_MODEL, noduri: [ID_MODEL], tip, latura };
}

/**
 * Operația cu fiecare freză trecută prin `f`, mereu în aceeași ordine: a ei, a fundului plat, frezele de rest ale fundului,
 * frezele de rest ale buzunarului. Numărarea și renumerotarea frezelor (§5) se bazează pe ordinea asta.
 */
function cuScule(o: Operatie, f: (s: Scula) => Scula): Operatie {
  const fp = o.fundPlat;
  return {
    ...o,
    scula: f(o.scula),
    ...(fp ? { fundPlat: { ...fp, scula: f(fp.scula), ...(fp.rest ? { rest: fp.rest.map((r) => ({ ...r, scula: f(r.scula) })) } : {}) } } : {}),
    ...(o.rest ? { rest: o.rest.map((r) => ({ ...r, scula: f(r.scula) })) } : {}),
  };
}

function sculeDin(o: Operatie): Scula[] {
  const rez: Scula[] = [];
  cuScule(o, (s) => {
    rez.push(s);
    return s;
  });
  return rez;
}

function faraNumar(s: Scula): Scula {
  const { numar: _n, ...rest } = s;
  void _n;
  return rest as Scula;
}

/**
 * Valorile operației ca text (ADR 0114 §1): fără id, fel, forme, latură, despărțire și rang (ADR 0133 §4); la cerere, fără
 * numerele frezelor (§6).
 */
function cheie(o: Operatie, faraNumere: boolean): string {
  const { id: _i, tip: _t, noduri: _n, latura: _l, despartire: _d, rang: _r, ...v } = faraNumere ? cuScule(o, faraNumar) : o;
  void _i; void _t; void _n; void _l; void _d; void _r;
  return jsonCanonic(v);
}

/** Valorile unui rol salvat ca text: rolul de bază și operațiile-model. */
function cheieSablon(s: SablonRol, faraNumere: boolean): string {
  return `${s.baza}|${cheie(s.operatie, faraNumere)}|${s.goluri ? cheie(s.goluri, faraNumere) : ''}`;
}

/** Rolul de salvat dintr-o piesă cu rolul de bază `baza` recunoscut, sau null dacă o grupă are operații cu valori diferite. */
function sablonPiesei(p: Piesa, baza: Rol): SablonRol | null {
  const goluri = cuGoluri(baza) ? p.operatii.filter((o) => o.latura !== baza) : [];
  const forme = p.operatii.filter((o) => !goluri.includes(o));
  const prima = forme[0];
  const una = (ops: readonly Operatie[]): boolean => ops.every((o) => cheie(o, false) === cheie(ops[0]!, false));
  if (!prima || !una(forme) || !una(goluri)) return null;
  const f = felModel(baza);
  const operatie = model(prima, f.tip, f.latura);
  const gol = goluri[0];
  // Golurile cu aceleași valori ca forma nu se țin separat: aplicarea le dă tot pe ale ei (§4).
  if (!gol || !cuGoluri(baza) || cheie(gol, false) === cheie(prima, false)) return { baza, operatie };
  return { baza, operatie, goluri: model(gol, 'profil', laturaGolurilor(baza)) };
}

/**
 * Rolul de salvat din piesele alese (ADR 0114 §2), sau motivul refuzului. Toate piesele au același rol de bază recunoscut și
 * aceleași valori (fără numerele frezelor; se iau ale primei piese), iar operațiile aceleiași grupe ale unei piese, aceleași
 * valori (cu numere).
 */
export function sablonDinPiese(piese: readonly Piesa[]): { readonly ok: true; readonly sablon: SablonRol } | { readonly ok: false; readonly motiv: MotivRol } {
  let rez: SablonRol | null = null;
  for (const p of piese) {
    const baza = rolPiesei(p);
    if (!baza) return { ok: false, motiv: 'fara-rol' };
    if (rez && baza !== rez.baza) return { ok: false, motiv: 'roluri-diferite' };
    const s = sablonPiesei(p, baza);
    if (!s) return { ok: false, motiv: 'operatii-diferite' };
    if (rez && cheieSablon(s, true) !== cheieSablon(rez, true)) return { ok: false, motiv: 'valori-diferite' };
    rez ??= s;
  }
  return rez ? { ok: true, sablon: rez } : { ok: false, motiv: 'fara-rol' };
}

/**
 * Rolul cu numerele frezelor potrivite proiectului (ADR 0114 §5), pentru piesele `inlocuite`: o dată pe comandă, ca toate
 * piesele alese să primească aceleași numere.
 */
export function rolNumerotat<T extends SablonRol>(doc: Document, r: T, inlocuite: ReadonlySet<string>): T {
  const numere = numereFreze(doc, [...sculeDin(r.operatie), ...(r.goluri ? sculeDin(r.goluri) : [])], inlocuite);
  let k = 0;
  const pune = (s: Scula): Scula => ({ ...s, numar: numere[k++] ?? s.numar });
  const operatie = cuScule(r.operatie, pune);
  return r.goluri ? { ...r, operatie, goluri: cuScule(r.goluri, pune) } : { ...r, operatie };
}

/**
 * Operațiile piesei cu rolul personalizat (ADR 0114 §4), sau null dacă rolul de bază nu i se potrivește: grupele rolului de
 * bază, fiecare cu operația-model (golurile cu a lor, sau cu a formelor). O operație care rămâne una își păstrează id-ul.
 */
export function operatiiPentruRolPersonal(p: Piesa, r: SablonRol): Operatie[] | null {
  const g = grupeRol(p, r.baza);
  if (!g || g.length === 0) return null;
  const ops = g.map((x): Operatie => {
    const { despartire: _d, ...v } = cuGoluri(r.baza) && x.latura !== r.baza ? r.goluri ?? r.operatie : r.operatie;
    void _d;
    return { ...structuredClone(v), id: x.id, tip: x.tip, noduri: [...x.noduri], latura: x.latura };
  });
  const singura = p.operatii.length === 1 ? p.operatii[0] : undefined;
  if (ops.length === 1 && singura) ops[0] = { ...ops[0]!, id: singura.id };
  return ops;
}

/** Operațiile ca mulțime: felul, latura, formele și valorile fără numerele frezelor, fără id-uri. */
function semnatura(ops: readonly Operatie[]): string {
  return ops.map((o) => `${o.tip}|${o.latura}|${[...o.noduri].sort().join('\u0000')}|${cheie(o, true)}`).sort().join('\n');
}

/** Rolul personalizat al piesei (ADR 0114 §6): primul din listă care ar da exact operațiile ei, fără numerele frezelor. */
export function rolPersonalPiesei(p: Piesa, roluri: readonly RolPersonal[]): RolPersonal | null {
  const baza = roluri.length > 0 ? rolPiesei(p) : null;
  if (!baza) return null;
  const are = semnatura(p.operatii);
  for (const r of roluri) {
    if (r.baza !== baza) continue;
    const ops = operatiiPentruRolPersonal(p, r);
    if (ops && semnatura(ops) === are) return r;
  }
  return null;
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;
/** Numele așa cum se ține: fără spațiile de la capete, în forma compusă (NFC). */
export const numeCurat = (s: string): string => s.normalize('NFC').trim();
/** Numele pentru comparație, fără deosebire de majuscule. */
const pliat = (s: string): string => numeCurat(s).toLocaleLowerCase('ro');

function modelBun(o: unknown, tip: TipOperatie, latura: Latura): boolean {
  return operatieInMargini(o) && (o as Operatie).tip === tip && (o as Operatie).latura === latura;
}

/**
 * Un rol citit din stocare (ADR 0114 §3): id-ul, numele curat în plafon, rolul de bază cunoscut, operația-model a grupei lui
 * (felul, latura, schema documentului) și, doar la exterior și interior, cea a golurilor.
 */
export function rolPersonalBun(x: unknown): x is RolPersonal {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  const baza = ROLURI.find((b) => b === r.baza);
  if (!baza || typeof r.id !== 'string' || !ID.test(r.id) || typeof r.nume !== 'string') return false;
  if (r.nume !== numeCurat(r.nume) || r.nume.length === 0 || r.nume.length > PLAFON_ROLURI.nume) return false;
  const f = felModel(baza);
  if (!modelBun(r.operatie, f.tip, f.latura)) return false;
  return r.goluri === undefined || (cuGoluri(baza) && modelBun(r.goluri, 'profil', laturaGolurilor(baza)));
}

/**
 * Lista din textul stocării (ADR 0114 §3): rolurile bune, fiecare id și fiecare nume o dată, cel mult plafonul. Un text lipsă
 * sau stricat dă o listă goală; o listă cu o versiune mai mare dă o listă goală care nu se rescrie (`scriere: false`).
 */
export function citesteRoluri(text: string | null): { readonly roluri: readonly RolPersonal[]; readonly scriere: boolean } {
  let x: unknown = null;
  try {
    x = text === null ? null : JSON.parse(text);
  } catch {
    return { roluri: [], scriere: true };
  }
  const lista = typeof x === 'object' && x !== null ? (x as { v?: unknown; roluri?: unknown }) : {};
  if (typeof lista.v === 'number' && lista.v > VERSIUNE_ROLURI) return { roluri: [], scriere: false };
  if (lista.v !== VERSIUNE_ROLURI || !Array.isArray(lista.roluri)) return { roluri: [], scriere: true };
  const roluri: RolPersonal[] = [];
  const ids = new Set<string>();
  const nume = new Set<string>();
  for (const r of lista.roluri as unknown[]) {
    if (roluri.length >= PLAFON_ROLURI.roluri) break;
    if (!rolPersonalBun(r) || ids.has(r.id) || nume.has(pliat(r.nume))) continue;
    ids.add(r.id);
    nume.add(pliat(r.nume));
    roluri.push(r);
  }
  return { roluri, scriere: true };
}

/** Textul listei, pentru stocare. */
export const textRoluri = (roluri: readonly RolPersonal[]): string => JSON.stringify({ v: VERSIUNE_ROLURI, roluri });

export type RezultatLista =
  | { readonly ok: true; readonly roluri: readonly RolPersonal[] }
  | { readonly ok: false; readonly motiv: MotivRol; readonly nume?: string };

/** Motivul pentru care numele nu merge (gol, prea lung, folosit de alt rol decât `afara`), sau null. */
function motivNume(roluri: readonly RolPersonal[], nume: string, afara?: string): MotivRol | null {
  const n = numeCurat(nume);
  if (n.length === 0) return 'nume-gol';
  if (n.length > PLAFON_ROLURI.nume) return 'nume-lung';
  return roluri.some((r) => r.id !== afara && pliat(r.nume) === pliat(n)) ? 'nume-folosit' : null;
}

/** Lista cu rolul nou la capăt (ADR 0114 §2), sau motivul: plafonul, numele, aceleași valori ca alt rol (cu numele lui). */
export function cuRolNou(roluri: readonly RolPersonal[], nume: string, s: SablonRol, id: string): RezultatLista {
  if (roluri.length >= PLAFON_ROLURI.roluri) return { ok: false, motiv: 'plafon' };
  const m = motivNume(roluri, nume);
  if (m) return { ok: false, motiv: m };
  const acelasi = roluri.find((r) => cheieSablon(r, true) === cheieSablon(s, true));
  if (acelasi) return { ok: false, motiv: 'aceleasi-valori', nume: acelasi.nume };
  const rol = { id, nume: numeCurat(nume), baza: s.baza, operatie: structuredClone(s.operatie), ...(s.goluri ? { goluri: structuredClone(s.goluri) } : {}) };
  return rolPersonalBun(rol) ? { ok: true, roluri: [...roluri, rol] } : { ok: false, motiv: 'invalid' };
}

/** Lista cu rolul `id` redenumit, sau motivul: rolul nu mai e (scos din altă filă), numele. */
export function cuNumeNou(roluri: readonly RolPersonal[], id: string, nume: string): RezultatLista {
  if (!roluri.some((r) => r.id === id)) return { ok: false, motiv: 'disparut' };
  const m = motivNume(roluri, nume, id);
  if (m) return { ok: false, motiv: m };
  return { ok: true, roluri: roluri.map((r) => (r.id === id ? { ...r, nume: numeCurat(nume) } : r)) };
}

/** Lista fără rolul `id` (dacă nu mai era, lista rămâne cum e). */
export function faraRol(roluri: readonly RolPersonal[], id: string): RezultatLista {
  return { ok: true, roluri: roluri.filter((r) => r.id !== id) };
}
