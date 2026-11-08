/** Editarea pe pânză (ADR 0050), partea pură: țintele lipirii, cutiile instanțelor alese, id-ul unui ghidaj nou. */
import { conturAtinge, cuprinsaIn } from '../geom/cadru.ts';
import type { Cutie } from '../geom/cutie.ts';
import { tinteCutie, tinteDin, tintePunct, type LinieLipire, type Tinte, type TintaLipire } from '../geom/lipire.ts';
import { aplica } from '../geom/matrice.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import { conturElement, cutieElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';
import { motivRetea, type MotivRetea, type PozitieCurba, type Retea } from '../model/retea.ts';
import type { Transformare } from '../model/transformare.ts';

/** Ce poate da un mâner: rotirea sau scalarea (oglindirea și înclinarea au butoanele lor, ADR 0054, ADR 0065). */
export type TransformareManer = Exclude<Transformare, { readonly fel: 'oglindire' | 'inclinare' }>;
import { FOAIA } from '../ui/actiuniDocument.ts';
import { citesteNumar } from '../ui/numar.ts';

type Punct = { readonly x: number; readonly y: number };

/**
 * Pură: țintele lipirii pe foaia curentă: foaia (marginile, mijlocul), ghidajele (dacă le cer), marginile și mijlocul
 * cutiei fiecărui element al instanțelor NEalese și capetele căilor deschise ale lor.
 */
export function tinteFoaie(doc: Document, alese: ReadonlySet<string>, cuGhidaje: boolean): Tinte {
  const foaie = doc.foi[FOAIA];
  if (!foaie) return tinteDin([]);
  const lista: TintaLipire[] = tinteCutie({ minX: 0, minY: 0, maxX: foaie.stoc.latime, maxY: foaie.stoc.inaltime }, 'foaie');
  if (cuGhidaje) for (const g of foaie.ghidaje ?? []) lista.push({ axa: g.axa, poz: g.poz, de: -Infinity, la: Infinity, fel: 'ghidaj' });
  for (const e of elementeFoaie(doc, FOAIA)) {
    if (alese.has(e.instanta)) continue;
    for (const x of tinteCutie(cutieElement(e), 'forma')) lista.push(x);
    if (e.forma.tip === 'cale' && !e.forma.inchis) {
      const v = e.forma.varfuri;
      for (const q of [v[0], v[v.length - 1]]) {
        if (!q) continue;
        const w = aplica(e.matrice, q.p);
        for (const x of tintePunct(w.x, w.y, 'forma')) lista.push(x);
      }
    }
  }
  return tinteDin(lista);
}

/** Pură: cutia fiecărei instanțe alese a foii curente (unirea cutiilor elementelor ei). */
export function cutiiAlese(doc: Document, alese: ReadonlySet<string>): Array<{ readonly id: string; readonly cutie: Cutie }> {
  const cutii = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
  for (const e of elementeFoaie(doc, FOAIA)) {
    if (!alese.has(e.instanta)) continue;
    const c = cutieElement(e);
    const v = cutii.get(e.instanta);
    cutii.set(e.instanta, v
      ? { minX: Math.min(v.minX, c.minX), minY: Math.min(v.minY, c.minY), maxX: Math.max(v.maxX, c.maxX), maxY: Math.max(v.maxY, c.maxY) }
      : { ...c });
  }
  return [...cutii].map(([id, cutie]) => ({ id, cutie }));
}

/** Pură: un id liber de ghidaj (`g<n>`). */
export function idGhidaj(ghidaje: readonly Ghidaj[]): string {
  const folosite = new Set(ghidaje.map((g) => g.id));
  let n = ghidaje.length + 1;
  while (folosite.has(`g${n}`)) n++;
  return `g${n}`;
}

export type Maner = 'nv' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sv' | 'v';
export const MANERE: readonly Maner[] = ['nv', 'n', 'ne', 'e', 'se', 's', 'sv', 'v'];
const OPUS: Record<Maner, Maner> = { nv: 'se', n: 's', ne: 'sv', e: 'v', se: 'nv', s: 'n', sv: 'ne', v: 'e' };

/** Pură: punctul mânerului `m` pe cutie (colțurile, mijloacele laturilor). */
export function punctManer(c: Cutie, m: Maner): Punct {
  const x = m === 'nv' || m === 'sv' || m === 'v' ? c.minX : m === 'n' || m === 's' ? (c.minX + c.maxX) / 2 : c.maxX;
  const y = m === 'nv' || m === 'n' || m === 'ne' ? c.maxY : m === 'v' || m === 'e' ? (c.minY + c.maxY) / 2 : c.minY;
  return { x, y };
}

/**
 * Tastele ținute la un gest (ADR 0240): Shift = proporția pe orice mâner, Ctrl (⌘ pe Mac) = liber pe orice mâner, Alt = față
 * de ancoră (la desen, din centru). Cu Shift și Ctrl împreună, câștigă Shift.
 */
export type Taste = { readonly shift: boolean; readonly ctrl: boolean; readonly alt: boolean };
export const FARA_TASTE: Taste = { shift: false, ctrl: false, alt: false };
/** Tastele unui eveniment al mausului sau al tastaturii (⌘ pe Mac e Ctrl, ca la scurtături). */
export const tasteDin = (e: { readonly shiftKey: boolean; readonly ctrlKey: boolean; readonly metaKey: boolean; readonly altKey: boolean }): Taste =>
  ({ shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey });

const centrul = (c: Cutie): Punct => ({ x: (c.minX + c.maxX) / 2, y: (c.minY + c.maxY) / 2 });

/**
 * Pură: transformarea gestului pe un mâner (ADR 0052, ADR 0240). Scalarea: fix e mânerul opus, sau, cu Alt, `ancora`
 * (implicit centrul cutiei); colțurile scalează proporțional (după axa care s-a schimbat mai mult), laturile pe o singură
 * axă; Shift face proporțional orice mâner (la o latură, scara ei intră și pe cealaltă axă), Ctrl face liber orice mâner (la
 * o latură nu schimbă nimic), iar cu amândouă câștigă Shift. Pe o axă pe care punctul fix stă pe linia mânerului, axa nu se
 * scalează. Mânerul urmează DEPLASAREA cursorului față de apăsare (un clic pe mâner nu schimbă nimic). Rotirea: unghiul
 * dintre apăsare și cursor, în jurul ancorei, Shift în pași de 15°. Scările și unghiul se rotunjesc (1e-4, 0,001°), ca
 * pixelii mausului să nu ajungă în geometrie; pe o axă lipită (`tinta`), mânerul ajunge exact pe țintă (ADR 0055).
 */
export function transformareManer(
  c: Cutie, m: Maner | 'rotire', start: Punct, q: Punct, taste: Taste, tinta: { readonly x?: number; readonly y?: number } = {},
  ancora: Punct = centrul(c),
): TransformareManer {
  if (m === 'rotire') {
    const { x: cx, y: cy } = ancora;
    let u = ((Math.atan2(q.y - cy, q.x - cx) - Math.atan2(start.y - cy, start.x - cx)) * 180) / Math.PI;
    if (u > 180) u -= 360;
    if (u < -180) u += 360;
    u = taste.shift ? Math.round(u / 15) * 15 : Math.round(u * 1000) / 1000;
    return { fel: 'rotire', unghi: u, centru: { x: cx, y: cy } };
  }
  const a = taste.alt ? { x: ancora.x, y: ancora.y } : punctManer(c, OPUS[m]), h = punctManer(c, m);
  const peX = m !== 'n' && m !== 's', peY = m !== 'e' && m !== 'v';
  const rot = (v: number): number => Math.round(v * 10000) / 10000;
  const hx = tinta.x ?? h.x + q.x - start.x, hy = tinta.y ?? h.y + q.y - start.y;
  let fx = !peX || h.x === a.x ? 1 : tinta.x === undefined ? rot((hx - a.x) / (h.x - a.x)) : (hx - a.x) / (h.x - a.x);
  let fy = !peY || h.y === a.y ? 1 : tinta.y === undefined ? rot((hy - a.y) / (h.y - a.y)) : (hy - a.y) / (h.y - a.y);
  if (taste.shift || (m.length === 2 && !taste.ctrl)) {
    const f = !peY ? fx : !peX ? fy : Math.abs(fx - 1) >= Math.abs(fy - 1) ? fx : fy;
    fx = f;
    fy = f;
  }
  return { fel: 'scalare', sx: fx, sy: fy, ancora: a };
}

/** Cele 9 puncte ale cutiei, de unde pornește ancora (ADR 0240 §A), în ordinea selectorului: rândul de sus întâi. */
export type PunctCutie = 'nv' | 'n' | 'ne' | 'v' | 'c' | 'e' | 'sv' | 's' | 'se';
export const PUNCTE_CUTIE: readonly PunctCutie[] = ['nv', 'n', 'ne', 'v', 'c', 'e', 'sv', 's', 'se'];
/** Un punct ținut față de cutia selecției, ca fracții din lățimea și înălțimea ei (0…1 înăuntru; și în afara ei). */
export type Fractii = { readonly u: number; readonly v: number };

/** Pură: fracțiile unuia din cele 9 puncte ale cutiei. */
export function fractiiPunct(p: PunctCutie): Fractii {
  const u = p === 'nv' || p === 'v' || p === 'sv' ? 0 : p === 'n' || p === 'c' || p === 's' ? 0.5 : 1;
  const v = p === 'nv' || p === 'n' || p === 'ne' ? 1 : p === 'v' || p === 'c' || p === 'e' ? 0.5 : 0;
  return { u, v };
}

/** Pură: punctul foii al fracțiilor `f` pe cutia `c`. */
export const punctDinFractii = (c: Cutie, f: Fractii): Punct => ({ x: c.minX + f.u * (c.maxX - c.minX), y: c.minY + f.v * (c.maxY - c.minY) });

/** Pură: fracțiile punctului `p` pe cutia `c`; pe o axă fără lățime (o linie), ancora stă pe linie. */
export function fractiiDinPunct(c: Cutie, p: Punct): Fractii {
  const w = c.maxX - c.minX, h = c.maxY - c.minY;
  return { u: w > 0 ? (p.x - c.minX) / w : 0.5, v: h > 0 ? (p.y - c.minY) / h : 0.5 };
}

/**
 * Pură: ancora trasă cu mâna în `p` (ADR 0240 §A.3), lipită: întâi de cele 9 puncte ale cutiei (la cel mult `toleranta` mm),
 * apoi de țintele obișnuite (`lipire`: ghidajele, foaia, celelalte forme, grila); fără lipire, rotunjită la 0,001 mm.
 */
export function ancoraLipita(c: Cutie, p: Punct, lipire: LipirePunct | null, toleranta: number): { readonly punct: Punct; readonly linii: readonly LinieLipire[] } {
  const rot = (v: number): number => Math.round(v * 1000) / 1000;
  if (!lipire) return { punct: { x: rot(p.x), y: rot(p.y) }, linii: [] };
  let cel: Punct | null = null, d0 = toleranta;
  for (const k of PUNCTE_CUTIE) {
    const q = punctDinFractii(c, fractiiPunct(k));
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d <= d0) { d0 = d; cel = q; }
  }
  if (cel) return { punct: cel, linii: [] };
  const r = lipire(p);
  const lx = r?.linii.find((l) => l.axa === 'x')?.poz, ly = r?.linii.find((l) => l.axa === 'y')?.poz;
  return { punct: { x: lx ?? rot(p.x), y: ly ?? rot(p.y) }, linii: r?.linii ?? [] };
}

/** Pură: ținta ancorei e sub punctul (px, py) al pânzei (pixeli din colțul ei), la cel mult 7 px; `null`: nicio țintă arătată. */
export function ancoraLovita(a: Punct | null, v: { readonly tx: number; readonly ty: number; readonly scara: number }, px: number, py: number): boolean {
  return a !== null && Math.hypot(px - (v.tx + a.x * v.scara), py - (v.ty - a.y * v.scara)) <= LOVIRE_PX + 1;
}

/** Ce face gestul pe mânerul `m`, pentru eticheta de lângă cutie (ADR 0240 §E): proporția, punctul fix, ancora pe linia lui. */
export type ModManer = { readonly proportie: 'proportional' | 'liber' | 'axa'; readonly fix: 'ancora' | 'centru' | 'colt' | 'latura'; readonly peLinie: boolean };

/** Pură: modul gestului pe mânerul `m` cu tastele date; `ancora` e punctul fix al lui Alt (centrul cutiei = „față de centru”). */
export function modManer(c: Cutie, m: Maner, taste: Taste, ancora: Punct): ModManer {
  const colt = m.length === 2;
  const proportie = taste.shift || (colt && !taste.ctrl) ? 'proportional' : colt ? 'liber' : 'axa';
  if (!taste.alt) return { proportie, fix: colt ? 'colt' : 'latura', peLinie: false };
  const ctr = centrul(c), h = punctManer(c, m);
  const peLinie = (m !== 'n' && m !== 's' && h.x === ancora.x) || (m !== 'e' && m !== 'v' && h.y === ancora.y);
  return { proportie, fix: ancora.x === ctr.x && ancora.y === ctr.y ? 'centru' : 'ancora', peLinie };
}

/** Cât de departe deasupra cutiei stă mânerul de rotire (pixeli). */
export const ROTIRE_PX = 26;
/** Sub atâția pixeli pe o axă, mânerele care o scalează nu apar: forma (mică pe ecran) trebuie să rămână de apucat și mutat. */
export const MANER_MINIM_PX = 24;
/** Jumătatea pătratului în care un mâner e lovit (pixeli). */
const LOVIRE_PX = 6;

/** Pură: mânerele de scalare arătate pe o cutie de `w` × `h` pixeli: laturile unei axe doar de la 24 px, colțurile cu ambele. */
export function manereVazute(w: number, h: number): readonly Maner[] {
  const x = w >= MANER_MINIM_PX, y = h >= MANER_MINIM_PX;
  return MANERE.filter((m) => (m === 'e' || m === 'v' ? x : m === 'n' || m === 's' ? y : x && y));
}

/** Numele scurt al unei etichete (rândul ei în meniul de clic dreapta): înaintea parantezei sau a celor două puncte, fără „…”. */
export function numeScurt(e: string): string {
  return (e.split(/ \(|:/)[0] ?? e).replace(/…$/, '').trim();
}

/** Înălțimea etichetei mânerelor, cu spațiul de lângă ea (pixeli). */
export const ETICHETA_PX = 34;

/**
 * Pură: marginea de sus a etichetei mânerelor (mărimea, unghiul, motivul unui refuz), pe cutia de pe ecran dintre `sus` și
 * `jos`, în banda vizibilă (sub barele de sus, deasupra celei de jos): deasupra mânerului de rotire; dacă acolo ar intra sub
 * bare, sub cutie; dacă nici acolo nu se vede (o piesă mai mare decât ecranul), chiar sub bare (DXF-ul owner-ului, 28.10).
 */
export function susEticheta(sus: number, jos: number, vizibil: { readonly sus: number; readonly jos: number }): number {
  const deasupra = sus - ROTIRE_PX - ETICHETA_PX;
  if (deasupra >= vizibil.sus) return deasupra;
  return jos + 16 + ETICHETA_PX <= vizibil.jos ? jos + 16 : vizibil.sus;
}

/**
 * Pură: mânerul de sub punctul (px, py) al pânzei (pixeli din colțul ei), sau null: întâi rotirea, apoi colțurile, apoi
 * laturile (pe o cutie strâmtă, colțul câștigă).
 */
export function manerLovit(c: Cutie, v: { readonly tx: number; readonly ty: number; readonly scara: number }, px: number, py: number): Maner | 'rotire' | null {
  const ex = (x: number): number => v.tx + x * v.scara;
  const ey = (y: number): number => v.ty - y * v.scara;
  if (Math.hypot(px - ex((c.minX + c.maxX) / 2), py - (ey(c.maxY) - ROTIRE_PX)) <= LOVIRE_PX + 1) return 'rotire';
  const vazute = manereVazute((c.maxX - c.minX) * v.scara, (c.maxY - c.minY) * v.scara);
  for (const m of [...vazute.filter((n) => n.length === 2), ...vazute.filter((n) => n.length === 1)]) {
    const q = punctManer(c, m);
    if (Math.abs(px - ex(q.x)) <= LOVIRE_PX && Math.abs(py - ey(q.y)) <= LOVIRE_PX) return m;
  }
  return null;
}

/** Lipirea unui punct al foii (ADR 0055): liniile țintelor atinse (`poz` = ținta, exactă), sau null cu lipirea oprită. */
export type LipirePunct = (p: Punct) => { readonly linii: readonly LinieLipire[] } | null;

/**
 * Pură: transformarea mânerului `m`, cu punctul lui lipit (ADR 0055). Mânerul tras (punctul lui + deplasarea cursorului) se
 * lipește ca un punct de ținte; pe axele pe care mânerul le scalează și pe care s-a lipit, scara îl duce exact pe țintă, față
 * de punctul fix (mânerul opus sau, cu Alt, ancora). La proporțional decide axa care s-a schimbat mai mult (la o latură, axa
 * ei), deci o lipire pe cealaltă axă nu se folosește. Liniile întoarse sunt doar ale axelor pe care mânerul a ajuns chiar pe
 * țintă. Rotirea nu se lipește (are Shift, în pași de 15°).
 */
export function transformareManerLipita(
  c: Cutie, m: Maner | 'rotire', start: Punct, q: Punct, taste: Taste, lipire: LipirePunct | null, ancora: Punct = centrul(c),
): { readonly t: TransformareManer; readonly linii: readonly LinieLipire[] } {
  if (m === 'rotire' || !lipire) return { t: transformareManer(c, m, start, q, taste, {}, ancora), linii: [] };
  const h = punctManer(c, m);
  const r = lipire({ x: h.x + q.x - start.x, y: h.y + q.y - start.y });
  const x = m === 'n' || m === 's' ? undefined : r?.linii.find((l) => l.axa === 'x')?.poz;
  const y = m === 'e' || m === 'v' ? undefined : r?.linii.find((l) => l.axa === 'y')?.poz;
  const t = transformareManer(c, m, start, q, taste, { ...(x === undefined ? {} : { x }), ...(y === undefined ? {} : { y }) }, ancora);
  if (t.fel !== 'scalare' || !r) return { t, linii: [] };
  // Unde a ajuns mânerul după scalare (la colțul proporțional, o axă poate fi dusă de cealaltă, nu de ținta ei).
  const nx = t.ancora.x + (h.x - t.ancora.x) * t.sx, ny = t.ancora.y + (h.y - t.ancora.y) * t.sy;
  const pe = (v: number, w: number | undefined): boolean => w !== undefined && Math.abs(v - w) <= 1e-9 * Math.max(1, Math.abs(w));
  return { t, linii: r.linii.filter((l) => (l.axa === 'x' ? pe(nx, x) : pe(ny, y))) };
}

/**
 * Cadrul de selecție (ADR 0059): trasă spre dreapta, **fereastra** (doar formele cuprinse în întregime); trasă spre stânga,
 * **intersecția** (orice formă al cărei contur îl atinge), ca în programele de CAD.
 */
export type FelCadru = 'fereastra' | 'intersectie';

/** Felul cadrului după sensul tragerii pe orizontală (un cadru vertical, fără deplasare pe X, e o fereastră). */
export function felCadru(x0: number, x1: number): FelCadru {
  return x1 >= x0 ? 'fereastra' : 'intersectie';
}

/**
 * Pură: instanțele foii curente prinse de cadrul `r` (mm), în ordinea documentului. Fereastra cere ca fiecare element al
 * instanței (o piesă importată are mai multe contururi) să stea în cadru; intersecția, ca măcar unul să-l atingă.
 */
export function aleseInCadru(doc: Document, r: Cutie, fel: FelCadru): string[] {
  const stare = new Map<string, boolean>();
  for (const e of elementeFoaie(doc, FOAIA)) {
    const pana = stare.get(e.instanta);
    if (fel === 'fereastra') {
      if (pana === false) continue;
      stare.set(e.instanta, cuprinsaIn(cutieElement(e), r));
    } else {
      if (pana === true) continue;
      const k = cutieElement(e);
      const aproape = k.maxX >= r.minX && k.minX <= r.maxX && k.maxY >= r.minY && k.minY <= r.maxY;
      stare.set(e.instanta, aproape && conturAtinge(conturElement(e), r));
    }
  }
  return [...stare].filter(([, da]) => da).map(([id]) => id);
}

/** Pură: cutia tuturor formelor foii curente (mm), sau `null` dacă foaia e goală (liniile de cotă ale riglelor, ADR 0060). */
export function cutieFormelor(doc: Document): Cutie | null {
  let r: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  for (const e of elementeFoaie(doc, FOAIA)) {
    const k = cutieElement(e);
    r = r ? { minX: Math.min(r.minX, k.minX), minY: Math.min(r.minY, k.minY), maxX: Math.max(r.maxX, k.maxX), maxY: Math.max(r.maxY, k.maxY) } : { ...k };
  }
  return r;
}

/** Selecția veche plus cele noi (Shift + cadru), fără dubluri, cele vechi întâi. */
export function adaugaLaSelectie(veche: readonly string[], noi: readonly string[]): string[] {
  const out = [...veche];
  for (const id of noi) if (!out.includes(id)) out.push(id);
  return out;
}

/** Shift + clic: forma intră în selecție, sau iese dacă era deja în ea. */
export function comutaInSelectie(veche: readonly string[], id: string): string[] {
  return veche.includes(id) ? veche.filter((x) => x !== id) : [...veche, id];
}

/**
 * Formularul copierii în rețea (ADR 0061), ca text (cum îl scrie omul, cu punct sau virgulă), ținut în browser între
 * deschideri. Centrul gol înseamnă centrul foii.
 */
export type FormularRetea = {
  readonly fel: 'grila' | 'cerc' | 'curba';
  readonly coloane: string; readonly randuri: string; readonly spatiuX: string; readonly spatiuY: string;
  readonly numar: string; readonly centruX: string; readonly centruY: string; readonly unghi: string; readonly roteste: boolean;
  /** Pe curbă (ADR 0066): câte copii se așază pe curbă (originalele rămân). */
  readonly copiiCurba: string;
  /** Pe curbă (ADR 0074 §3): centrul pe ea sau formele lângă ea, la stânga / la dreapta, și distanța (mm, cu semn). */
  readonly pozitieCurba: PozitieCurba;
  readonly distantaCurba: string;
};

export const FORMULAR_RETEA: FormularRetea = {
  fel: 'grila', coloane: '3', randuri: '2', spatiuX: '10', spatiuY: '10', numar: '6', centruX: '', centruY: '', unghi: '360', roteste: true, copiiCurba: '5',
  pozitieCurba: 'centru', distantaCurba: '0',
};

/**
 * Pură: rețeaua din formular, sau motivul (câmpul greșit sau valorile în afara marginilor). Pe curbă, `curba` e ultima formă
 * aleasă (`null`: nicio selecție de cel puțin două forme).
 */
export function citesteRetea(f: FormularRetea, foaie: { readonly latime: number; readonly inaltime: number }, curba: string | null = null): Retea | MotivRetea {
  const n = (s: string, semn = false): number => citesteNumar(s, semn) ?? Number.NaN;
  const r: Retea = f.fel === 'grila'
    ? { fel: 'grila', coloane: n(f.coloane), randuri: n(f.randuri), spatiuX: n(f.spatiuX), spatiuY: n(f.spatiuY) }
    : f.fel === 'curba' ? {
      fel: 'curba', curba: curba ?? '', numar: n(f.copiiCurba), roteste: f.roteste, pozitie: f.pozitieCurba,
      distanta: f.distantaCurba.trim() === '' ? 0 : n(f.distantaCurba, true),
    } : {
      fel: 'cerc', numar: n(f.numar), unghi: n(f.unghi), roteste: f.roteste,
      centru: { x: f.centruX.trim() === '' ? foaie.latime / 2 : n(f.centruX, true), y: f.centruY.trim() === '' ? foaie.inaltime / 2 : n(f.centruY, true) },
    };
  return motivRetea(r) ?? r;
}

