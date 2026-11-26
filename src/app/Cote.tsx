/**
 * Cotele pe pânză și unealta Cote (ADR 0330 §5; felia 10.4↑a-2). Vine la cerere, într-o bucată a ei: la prima apăsare pe D sau
 * M, sau după prima randare a unei foi cu cote.
 *
 * - **Desenul:** cotele foii active, peste pânză, într-un strat care nu prinde evenimente (cu Selecția și cu celelalte unelte,
 *   clicul trece la forma de sub ele). Cele dezlegate, punctate, în roșu. Cifrele, sub 6 px pe ecran, se ascund.
 * - **Unealta** (doar cu ea aleasă): felurile în bara de sus (Automată, Orizontală, Verticală, Aliniată, Rază, Diametru, Unghi,
 *   Măsoară); pusul în trei clicuri (primul punct, al doilea, locul liniei), cu lipirea pe puncte (`lipirePuncte.ts`) și
 *   capetele legate de forme (setarea „Cotele noi sunt legate”). La Automată, un clic pe o latură dreaptă îi ia lungimea (iar
 *   un clic pe altă latură, înainte de locul liniei, face unghiul dintre ele, sau distanța, la laturi paralele), unul pe un
 *   cerc diametrul, pe un arc raza. Rază și Diametru: un clic pe un cerc sau pe un arc (pe o elipsă sau pe o curbă, refuzat),
 *   apoi locul cifrei; punctul de pe cerc e cel numit (vârf, mijloc, cadran) cel mai apropiat de cursor. Unghi: două laturi,
 *   sau trei puncte (vârful, apoi câte unul pe fiecare latură), apoi arcul, în sectorul cursorului (felia 10.4↑b). Măsoară:
 *   două puncte, fără urmă; Enter (sau „Păstrează”) o face cotă aliniată, Esc o șterge.
 * - **Alegerea:** un clic pe o cotă o alege; capetele se trag pe alt punct (se leagă din nou), linia se trage (sau săgețile o
 *   mută), Delete o șterge. Dublu clic pe o cotă, cu orice unealtă (afară de un desen Pen sau o tăiere începută), trece la Cote,
 *   cu ea aleasă.
 *
 * Fiecare schimbare e o listă nouă a cotelor foii, scrisă prin acțiunea `foaie.cote` (un pas de anulare).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { Zona } from '../canvas/Rigle.tsx';
import type { Vedere } from '../canvas/protocol.ts';
import { apropiat } from '../geom/apropiat.ts';
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/conturBaza.ts';
import { lipestePunct, type FelPunct, type PunctTinta } from '../geom/lipirePuncte.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import {
  cotaCuDistanta, cotaCuText, cotaCuToleranta, cotaDezlegata, felCunoscut, indexLume, punctAncora, stareCota, tolerantaCota, TOLERANTA_MAXIMA,
  valoareCota, type PunctCota,
} from '../model/cote.ts';
import {
  caleArc, cifraCuToleranta, desenCota, distantaDinCursor, distantaLaDesen, distantaRadiala, felAutomat, linieUnghiDinCursor, scrieCifra, textCota, textValoare,
  type CapatDesen, type DesenCota, type FelLiniar, type FormatCifre, type StilCota,
} from '../model/desenCota.ts';
import type { AncoraCota, Cota, Document, FelCota, FormaDoc, LegaturaCota } from '../model/document.ts';
import { locuriFoi } from '../model/foi.ts';
// Judecata cotelor și dezlegarea lor în jurnal (ADR 0330 §2, §3): cu unealta, o cotă nouă trece de ușă și se dezleagă cinstit.
import '../model/judecataCote.ts';
import { coteSelectie } from '../model/coteSelectie.ts';
import { puncteFoaie, surseCote } from '../model/puncteCote.ts';
import { cotaUrmatoare, idCotaNou, pornesteSerie, type ModSerie, type StareSerie } from '../model/serieCote.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { alegeCota, publicaPanou, publicaRanduri, useAscunse, useStareCote } from '../ui/coteVedere.ts';
import './cote.css';
import { formatCote, optiuniLipireCote, setariCote, stilCote, useSetariCote, type SetariCote } from './setariCote.ts';

/** Felurile din bara uneltei, în ordine. */
export const FELURI_UNEALTA = ['automata', 'orizontala', 'verticala', 'aliniata', 'lant', 'baza', 'raza', 'diametru', 'unghi', 'masoara'] as const;
export type FelUnealta = (typeof FELURI_UNEALTA)[number];

/** Ultimul fel folosit (setarea „Unealta pornește cu: ultimul fel folosit”), ținut în browser. */
const CHEIE_FEL = 'cncvs2.cote-fel';
/** Cât de departe de o cotă, de un capăt sau de o latură prinde un clic (px). */
const TOLERANTA_PX = 6;
/** O tragere mai scurtă (px) e un clic. */
const PRAG_TRAGERE_PX = 3;

const esteFel = (x: unknown): x is FelUnealta => (FELURI_UNEALTA as readonly unknown[]).includes(x);
function felTinut(): FelUnealta {
  try {
    const v = localStorage.getItem(CHEIE_FEL);
    return esteFel(v) && v !== 'masoara' ? v : 'automata';
  } catch {
    return 'automata';
  }
}
function tineFel(f: FelUnealta): void {
  if (f === 'masoara') return;
  try {
    localStorage.setItem(CHEIE_FEL, f);
  } catch {
    // Fără stocare: felul ține cât pagina.
  }
}
const felLaPornire = (s: SetariCote): FelUnealta => (s.comportament.pornire === 'ultimul' ? felTinut() : 'automata');

/** Un capăt ales: punctul (lipit) și legătura lui, dacă e lipit de o formă și cotele noi sunt legate. */
type Capat = { readonly p: Punct; readonly legatura: LegaturaCota | null };
const ancoraDin = (c: Capat): AncoraCota => (c.legatura ? { x: c.p.x, y: c.p.y, legatura: c.legatura } : { x: c.p.x, y: c.p.y });

/**
 * Ce s-a ales până acum din cota începută: capetele puse, felul hotărât de alegere (o latură: aliniata; două laturi: unghiul
 * sau, la laturi paralele, distanța; un cerc: raza sau diametrul), latura aleasă (un clic pe altă latură face unghiul) și
 * cercul ales (centrul, raza și punctele numite de pe el, dintre care cursorul îl alege pe cel de pe linie).
 */
type Puse = {
  readonly capete: readonly Capat[];
  readonly fix: FelCota | null;
  readonly latura: { readonly id: string; readonly k: number } | null;
  readonly cerc: { readonly c: Capat; readonly r: number; readonly pe: readonly Capat[] } | null;
};
const NIMIC: Puse = { capete: [], fix: null, latura: null, cerc: null };
/** Cota începută așteaptă doar locul liniei (al cifrei, al arcului). */
const asteapta = (p: Puse): boolean => p.cerc !== null || (p.fix === 'unghi' ? p.capete.length >= 3 : p.capete.length === 2);
/**
 * Punctul de pe cercul ales, după cursor: cel numit (vârf, mijloc, cadran), legat, cel mai apropiat ca unghi de direcția
 * cursorului; fără puncte numite (cotele libere), chiar punctul de pe cerc din direcția cursorului.
 */
function peCercul(cerc: NonNullable<Puse['cerc']>, w: Punct): Capat {
  const c = cerc.c.p, u = Math.atan2(w.y - c.y, w.x - c.x);
  let cel: { readonly q: Capat; readonly d: number } | null = null;
  for (const q of cerc.pe) {
    const d = Math.abs(Math.atan2(Math.sin(Math.atan2(q.p.y - c.y, q.p.x - c.x) - u), Math.cos(Math.atan2(q.p.y - c.y, q.p.x - c.x) - u)));
    if (!cel || d < cel.d - 1e-12) cel = { q, d };
  }
  return cel?.q ?? { p: { x: c.x + cerc.r * Math.cos(u), y: c.y + cerc.r * Math.sin(u) }, legatura: null };
}
/** Conturul e un cerc întreg: închis, doar arce ale aceluiași cerc (centrul și raza la 1e-6), cu baleiajul de 360°. */
function eCerc(c: Contur): boolean {
  const n = numarSegmente(c);
  if (!c.inchis || n === 0) return false;
  let total = 0, cerc0: ReturnType<typeof cerculArcului> | null = null;
  for (let i = 0; i < n; i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip !== 'A' || Math.abs(s.bulge) <= 1e-12) return false;
    const k = cerculArcului(a, b, s.bulge);
    const tol = 1e-6 * Math.max(1, k.raza);
    if (cerc0 && (Math.hypot(k.centru.x - cerc0.centru.x, k.centru.y - cerc0.centru.y) > tol || Math.abs(k.raza - cerc0.raza) > tol)) return false;
    cerc0 ??= k;
    total += Math.abs(k.baleiaj);
  }
  return Math.abs(total - 2 * Math.PI) < 1e-6;
}

type Desenata = {
  readonly cota: Cota;
  readonly puncte: readonly PunctCota[];
  readonly desen: DesenCota | null;
  readonly text: string;
  readonly valoare: number | null;
  readonly dezlegata: boolean;
};

/** Fără cote de desenat (ascunse): aceeași listă, ca alegerea să nu se refacă la fiecare randare. */
const FARA_COTE: readonly Desenata[] = [];

const esteLiniar = (f: string): f is FelLiniar => f === 'orizontala' || f === 'verticala' || f === 'aliniata';
const esteRadial = (f: string): f is 'raza' | 'diametru' => f === 'raza' || f === 'diametru';

/** Desenul unei cote cu punctele ei citite, după setări (stilul și scrierea cifrelor, cu prefixul razei și al diametrului). */
function deseneaza(c: Cota, puncte: readonly PunctCota[], stil: StilCota, format: FormatCifre): Desenata {
  const p = puncte.map((x) => x.p);
  const valoare = valoareCota(c, p);
  const text = valoare === null ? '' : textCota(c, cifraCuToleranta(c, valoare, format));
  return { cota: c, puncte, desen: desenCota(c, p, stil, text), text, valoare, dezlegata: puncte.some((x) => x.stare === 'dezlegata') };
}

/**
 * Linia cotei din cursor (tragerea liniei, locul ei la punere): la cotele liniare, distanța pe normală; la rază și diametru,
 * locul cifrei pe direcția razei; la unghi, raza arcului și sectorul. Null: un unghi fără vârf, ori cursorul în vârf.
 */
function linieDin(fel: string, p: readonly Punct[], w: Punct, veche: Cota['linie']): NonNullable<Cota['linie']> | null {
  const [a, b] = p;
  if (!a || !b) return null;
  if (esteLiniar(fel)) return { ...veche, d: distantaDinCursor(fel, a, b, w) };
  if (esteRadial(fel)) return { ...veche, d: distantaRadiala(a, b, w) };
  if (fel === 'unghi') {
    const l = linieUnghiDinCursor(p, w);
    return l ? { ...veche, ...l } : null;
  }
  return null;
}

/** Un capăt al liniei de cotă, pe ecran: săgeata (plină sau doar conturul), bara oblică, punctul. */
function Capat({ c, sx, sy, scara }: { readonly c: CapatDesen; readonly sx: (x: number) => number; readonly sy: (y: number) => number; readonly scara: number }): ReactElement {
  if (c.fel === 'bara') return <line className="cota-capat-bara" x1={sx(c.bucata[0].x)} y1={sy(c.bucata[0].y)} x2={sx(c.bucata[1].x)} y2={sy(c.bucata[1].y)} />;
  if (c.fel === 'punct') return <circle className="cota-capat" cx={sx(c.centru.x)} cy={sy(c.centru.y)} r={Math.max(c.raza * scara, 1)} />;
  return <polygon className={c.plina ? 'cota-capat' : 'cota-capat cota-capat-deschis'} points={c.puncte.map((q) => `${sx(q.x)},${sy(q.y)}`).join(' ')} />;
}

/** O cotă desenată pe ecran: extensiile, linia (sau bucățile ei), capetele, cifra (sub prag, doar ca titlu) și mânerele alesei. */
function CotaSvg({ d, cls, sx, sy, scara, prag }: {
  readonly d: Desenata; readonly cls: string; readonly sx: (x: number) => number; readonly sy: (y: number) => number; readonly scara: number; readonly prag: number;
}): ReactElement | null {
  if (!d.desen) return null;
  const dc = d.desen, h = dc.text.inaltime * scara;
  const tp = { x: sx(dc.text.p.x), y: sy(dc.text.p.y) };
  return (
    <g className={`cota${d.dezlegata ? ' cota-dezlegata' : ''}${cls ? ` cota-${cls}` : ''}`} data-cota={d.cota.id}
      data-fel={d.cota.fel} data-stare={d.dezlegata ? 'dezlegata' : 'legata'} data-valoare={d.valoare ?? undefined} data-text={d.text}>
      {dc.extensii.map((e, k) => <line key={k} x1={sx(e[0].x)} y1={sy(e[0].y)} x2={sx(e[1].x)} y2={sy(e[1].y)} />)}
      {dc.bucati.map((b, k) => <line key={`l${k}`} className="cota-linie" x1={sx(b[0].x)} y1={sy(b[0].y)} x2={sx(b[1].x)} y2={sy(b[1].y)} />)}
      {dc.arce.map((a, k) => <path key={`a${k}`} className="cota-linie cota-arc" d={caleArc(a, sx, sy, scara)} />)}
      {dc.capete.map((c, k) => <Capat key={`c${k}`} c={c} sx={sx} sy={sy} scara={scara} />)}
      {h >= prag ? (
        <text x={tp.x} y={tp.y} fontSize={h} textAnchor="middle" transform={`rotate(${-dc.text.unghi} ${tp.x} ${tp.y})`}>{d.text}</text>
      ) : <title>{d.text}</title>}
      {cls === 'aleasa' ? d.puncte.map((q, k) => (
        <circle key={`m${k}`} className={`cota-maner${q.stare === 'dezlegata' ? ' cota-maner-dezlegat' : ''}`} data-maner={k} cx={sx(q.p.x)} cy={sy(q.p.y)} r={4} />
      )) : null}
    </g>
  );
}

/**
 * Cota începută, gata de pus cu linia din cursorul `w` (punerea și desenul ei elastic): felul, capetele și linia; la rază și
 * diametru, punctul de pe cerc ales de cursor. Null: nu așteaptă locul liniei, sau linia nu se poate (un unghi fără vârf).
 */
function cotaInceputa(p: Puse, fel: FelUnealta, w: Punct, shift: boolean): { readonly fel: FelCota; readonly capete: readonly Capat[]; readonly linie: NonNullable<Cota['linie']> } | null {
  if (!asteapta(p) || fel === 'masoara') return null;
  if (p.cerc) {
    const q = peCercul(p.cerc, w);
    return { fel: p.fix ?? 'raza', capete: [p.cerc.c, q], linie: { d: distantaRadiala(p.cerc.c.p, q.p, w) } };
  }
  const [a, b] = p.capete;
  if (!a || !b) return null;
  // Lanțul și linia de bază își pun prima cotă ca Automata între două puncte: orizontală, verticală sau aliniată.
  const f: FelCota = p.fix ?? (fel === 'automata' || esteSerie(fel) ? (shift ? 'aliniata' : felAutomat(a.p, b.p, w)) : fel);
  const linie = linieDin(f, p.capete.map((c) => c.p), w, undefined);
  return linie ? { fel: f, capete: p.capete, linie } : null;
}

/** Sfatul de jos al uneltei, după fel și după ce s-a ales până acum. */
function sfatCote(fel: FelUnealta, p: Puse, aleasa: boolean, serie: boolean): CheieSimpla {
  if (fel === 'masoara') return 'editare.cote.sfat.masoara';
  if (serie) return fel === 'baza' ? 'editare.cote.sfat.baza' : 'editare.cote.sfat.lant';
  if (p.cerc) return 'editare.cote.sfat.cifra';
  if (p.latura && p.fix === 'unghi') return 'editare.cote.sfat.a-doua-latura';
  if (p.latura) return 'editare.cote.sfat.latura';
  if (p.fix === 'unghi') {
    if (p.capete.length === 1) return 'editare.cote.sfat.unghi-1';
    if (p.capete.length === 2) return 'editare.cote.sfat.unghi-2';
    return 'editare.cote.sfat.arc';
  }
  if (p.capete.length === 1) return 'editare.cote.sfat.al-doilea';
  if (p.capete.length === 2) return 'editare.cote.sfat.linia';
  if (aleasa) return 'editare.cote.sfat.aleasa';
  if (fel === 'raza' || fel === 'diametru') return 'editare.cote.sfat.cerc';
  if (fel === 'unghi') return 'editare.cote.sfat.unghi';
  return 'editare.cote.sfat.primul';
}

/** Un id nou pe foaie: `c` și primul număr după cele folosite. */
const idCota = idCotaNou;
/** Lanțul și linia de bază (felia 10.4↑d-1): felul uneltei e o serie. */
const esteSerie = (f: FelUnealta): f is ModSerie => f === 'lant' || f === 'baza';
/** O serie pornită: starea ei (pură) și capătul din care pleacă cota următoare, cu legătura lui. */
type Serie = { readonly s: StareSerie; readonly din: Capat };
/** Depărtarea dintre liniile de bază: două înălțimi de cifră (7 mm la cifrele implicite de 3,5). */
const pasBaza = (stil: StilCota): number => 2 * stil.inaltime;

/**
 * Măsurile dintre două puncte (Măsoară, ADR 0330 §1): distanța, Δx, Δy, unghiul față de orizontală, ca text, după setări
 * (ce se arată; unitatea, separatorul și unitatea scrisă ale cifrelor, cu cel puțin 3 zecimale și fără rotunjirea la pas).
 */
function textMasura(a: Punct, b: Punct, s: SetariCote, format: FormatCifre): string {
  const dx = b.x - a.x, dy = b.y - a.y;
  const f: FormatCifre = { ...format, zecimale: Math.max(format.zecimale, 3), pas: null };
  const parti: string[] = [];
  // Distanța își scrie mereu unitatea (măsura nu e o cotă: fără ea, „120” nu spune în ce).
  if (s.masurare.distanta) parti.push(t('editare.cote.masura.distanta', { v: scrieCifra(Math.hypot(dx, dy), { ...f, cuUnitate: true }) }));
  if (s.masurare.delta) parti.push(t('editare.cote.masura.dx', { v: scrieCifra(dx, f) }), t('editare.cote.masura.dy', { v: scrieCifra(dy, f) }));
  if (s.masurare.unghi && (dx !== 0 || dy !== 0)) parti.push(t('editare.cote.masura.unghi', { v: textValoare((Math.atan2(dy, dx) * 180) / Math.PI, format.virgula, 2) }));
  return parti.join(' · ');
}

/** D, M sau „Cotează selecția” (`s`), cu un număr care crește la fiecare cerere: un obiect nou pentru fiecare. */
export type CerereCote = { readonly mod: 'd' | 'm' | 's'; readonly n: number };
/** Cererile „Cotează selecția” deja făcute: un strat montat din nou nu le repetă. */
const CERERI_FACUTE = new WeakSet<CerereCote>();

export function StratCote({ doc, indexFoaie, selectie, vedere, marime, zona, unealta, activ, loc, locJos, cerere, lipire, grila, virgula, toateFoile, onScrie, onDesen, onUnealta, onSetari, poateDublu }: {
  readonly doc: Document;
  readonly indexFoaie: number;
  /** Instanțele alese în editor: „Cotează selecția” le cotează pe cele de pe foaie (felia 10.4↑d-1). */
  readonly selectie: readonly string[];
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
  readonly zona: Zona;
  /** Unealta Cote e aleasă (și editorul e activ, nu doar de citit). */
  readonly unealta: boolean;
  /** Editorul e activ și se poate scrie: dublul clic pe o cotă trece la unealtă. */
  readonly activ: boolean;
  /** Locul barei uneltei, în bara de sus. */
  readonly loc: HTMLElement | null;
  /** Rândul de jos, pentru măsură (setarea „Unde: în bara de jos”). */
  readonly locJos: HTMLElement | null;
  /** D sau M apăsate (felul de pornire), cu un număr care crește la fiecare apăsare. */
  readonly cerere: CerereCote;
  /** Butonul Lipire (Alt îl inversează) și pasul grilei pornite. */
  readonly lipire: boolean;
  readonly grila: number | null;
  readonly virgula: boolean;
  /** „Toate foile pe pânză” (ADR 0210 §1): cotele foilor vecine se desenează lângă ale foii active, după setare (a-4). */
  readonly toateFoile: boolean;
  /** Lista nouă a cotelor foii (acțiunea `foaie.cote`), cu verdictul ei. */
  readonly onScrie: (cote: readonly Cota[]) => RezultatActiune;
  /** „Fă desen din cotă” (felia 10.4↑d-2): formele desenului și, cu „Șterge cota”, lista fără ea (acțiunea `foaie.desen-din-cota`). */
  readonly onDesen: (forme: readonly FormaDoc[], cote: readonly Cota[] | null) => RezultatActiune;
  readonly onUnealta: (u: 'cote' | 'selectie') => void;
  /** ⚙ din bara uneltei: fereastra Setări, la secțiunea Cotele (ADR 0330 §5, §6). */
  readonly onSetari?: () => void;
  /** Dublul clic poate trece la Cote (nu e un desen Pen sau o tăiere începută). */
  readonly poateDublu: () => boolean;
}): ReactElement | null {
  const setari = useSetariCote();
  const stil = useMemo(() => stilCote(setari), [setari]);
  const format = useMemo(() => formatCote(setari, virgula), [setari, virgula]);
  const foaie = doc.foi[indexFoaie];
  const idFoaie = foaie?.id ?? '';
  const cote = useMemo(() => foaie?.cote ?? [], [foaie]);
  const lume = useMemo(() => indexLume(doc, indexFoaie), [doc, indexFoaie]);
  // Toate cotele foii, desenate (lista și panoul le citesc și când nu se văd pe pânză).
  const toate = useMemo(() => cote.filter((c) => felCunoscut(c.fel) && Array.isArray(c.puncte))
    .map((c) => deseneaza(c, (c.puncte ?? []).map((a) => punctAncora(a, lume)), stil, format)), [cote, lume, stil, format]);
  // Ascunse din Setări („Cotele pe pânză”, „Arată cotele”) sau de ochiul listei, pe foaia lor, cotele nu se desenează și nu se
  // aleg; cu unealta Cote, se văd oricum.
  const ascunse = useAscunse();
  const vizibile = unealta || (setari.comportament.pePanza && !ascunse.has(idFoaie));
  const desenate = vizibile ? toate : FARA_COTE;
  // Cotele foilor vecine (ADR 0210 §1, felia a-4): cu „Toate foile pe pânză”, estompate, lângă foile lor, doar de văzut.
  const vecine = useMemo(() => {
    if (!toateFoile || doc.foi.length < 2 || setari.comportament.vecine === 'ascunse' || !setari.comportament.pePanza) return [];
    const locuri = locuriFoi(doc);
    const x0 = locuri[indexFoaie] ?? 0;
    return doc.foi.flatMap((f, k) => {
      if (k === indexFoaie || ascunse.has(f.id) || !(f.cote?.length)) return [];
      const lumeK = indexLume(doc, k);
      const desene = f.cote.filter((c) => felCunoscut(c.fel) && Array.isArray(c.puncte))
        .map((c) => deseneaza(c, (c.puncte ?? []).map((a) => punctAncora(a, lumeK)), stil, format));
      return [{ foaie: f.id, dx: (locuri[k] ?? 0) - x0, desene }];
    });
  }, [toateFoile, doc, indexFoaie, setari, ascunse, stil, format]);
  // Lipirea și laturile, doar cu unealta aleasă (un import mare nu-și face indexul degeaba).
  const surse = useMemo(() => (unealta ? surseCote(doc, indexFoaie) : []), [unealta, doc, indexFoaie]);
  const fixe = useMemo(() => (foaie ? puncteFoaie(foaie.stoc.latime, foaie.stoc.inaltime) : []), [foaie]);

  const [fel, setFel] = useState<FelUnealta>(() => (cerere.mod === 'm' ? 'masoara' : felLaPornire(setariCote())));
  const [puse, setPuse] = useState<Puse>(NIMIC);
  const [tinta, setTinta] = useState<PunctTinta<LegaturaCota> | null>(null);
  const [cursor, setCursor] = useState<{ readonly p: Punct; readonly shift: boolean } | null>(null);
  const [masura, setMasura] = useState<{ readonly a: Capat; readonly b: Capat | null } | null>(null);
  // Lanțul sau linia de bază pornite: fiecare clic pune cota următoare, până la Esc (felia 10.4↑d-1).
  const [serie, setSerie] = useState<Serie | null>(null);
  // Cota aleasă stă în depozitul cotelor (`coteVedere.ts`): panoul o descrie, iar lista o poate alege.
  const stareCote = useStareCote();
  const aleasa = stareCote.aleasa?.foaie === idFoaie ? stareCote.aleasa.id : null;
  const idFoaieRef = useRef(idFoaie);
  idFoaieRef.current = idFoaie;
  const setAleasa = useCallback((id: string | null): void => { alegeCota(idFoaieRef.current, id); }, []);
  const [trage, setTrage] = useState<{ readonly fel: 'capat'; readonly k: number; readonly c: Capat } | { readonly fel: 'linie'; readonly linie: NonNullable<Cota['linie']> } | null>(null);
  const [motiv, setMotiv] = useState<string | null>(null);
  const radacina = useRef<HTMLDivElement | null>(null);

  // D (felul de pornire, după setare) sau M (Măsoară): o cerere nouă a editorului.
  const ultimaCerere = useRef(cerere.n);
  useEffect(() => {
    if (cerere.n === ultimaCerere.current) return;
    ultimaCerere.current = cerere.n;
    setFel(cerere.mod === 'm' ? 'masoara' : felLaPornire(setariCote()));
    setPuse(NIMIC);
    setMasura(null);
    setSerie(null);
  }, [cerere]);
  // Fără unealtă: nimic început, nimic ales.
  useEffect(() => {
    if (unealta) return;
    setPuse(NIMIC);
    setMasura(null);
    setSerie(null);
    setAleasa(null);
    setTrage(null);
    setTinta(null);
    setCursor(null);
    setMotiv(null);
  }, [unealta]);
  // O cotă aleasă care nu mai e pe foaie (ștearsă, anulată) nu mai e aleasă.
  useEffect(() => {
    if (aleasa && !cote.some((c) => c.id === aleasa)) setAleasa(null);
  }, [cote, aleasa, setAleasa]);
  // Rândurile listei: toate cotele foii active, cu cifra lor (și ascunse pe pânză).
  useEffect(() => {
    publicaRanduri(idFoaie, toate.map((d) => ({ id: d.cota.id, fel: d.cota.fel, cifra: d.text, dezlegata: d.dezlegata })));
  }, [idFoaie, toate]);
  // Panoul cotei alese (ADR 0330 §5): felul, valoarea, cifra, textul, legătura, distanța și ce poate schimba.
  useEffect(() => {
    const d = aleasa ? toate.find((x) => x.cota.id === aleasa) : undefined;
    if (!d) {
      publicaPanou(null);
      return;
    }
    const id = d.cota.id;
    const scrie = (f: (c: Cota) => Cota | null): RezultatActiune => {
      const s = acum.current;
      const noi = s.cote.flatMap((c) => {
        if (c.id !== id) return [c];
        const n = f(c);
        return n ? [n] : [];
      });
      return s.onScrie(noi);
    };
    publicaPanou({
      foaie: idFoaie, id, fel: d.cota.fel, valoare: d.valoare, cifra: d.text, text: typeof d.cota.text === 'string' ? d.cota.text : '',
      ...stareCota(d.puncte), d: d.cota.linie?.d ?? 0, toleranta: tolerantaCota(d.cota),
      actiuni: {
        dezleaga: () => scrie((c) => cotaDezlegata(c, d.puncte)),
        text: (t) => scrie((c) => cotaCuText(c, t)),
        // La unghi, raza arcului rămâne pozitivă (un arc de rază zero nu se desenează).
        distanta: (x) => scrie((c) => cotaCuDistanta(c, c.fel === 'unghi' ? Math.max(0.1, Math.abs(x)) : x)),
        sterge: () => scrie(() => null),
        // Toleranța (felia 10.4↑e-1): abaterile în ±TOLERANTA_MAXIMA, cea de sus nu sub cea de jos.
        toleranta: (t) => {
          const bune = t === null || [t.sus, t.jos].every((x) => Number.isFinite(x) && Math.abs(x) <= TOLERANTA_MAXIMA);
          if (!bune) return { ok: false, motiv: 'prop.cota.toleranta.margini' };
          if (t && t.sus < t.jos) return { ok: false, motiv: 'prop.cota.toleranta.ordine' };
          return scrie((c) => cotaCuToleranta(c, t));
        },
        // Desenul cotei, cu cifrele ca trăsăturile fontului cu o singură linie (adus la cerere, ca la export), ca o piesă nouă.
        desen: async (sterge) => {
          const [m, tx] = await Promise.all([import('../io/coteExport.ts'), import('../text/calcul.ts')]);
          const f = await tx.incarcaFont(tx.FONT_COTE);
          if (!f.ok) return { ok: false, motiv: 'editare.cote.motiv.font' };
          const s = acum.current;
          const g = m.geometrieCota(s.doc, s.indexFoaie, id, { stil: s.stil, format: s.format, cifre: tx.cifreDinFont(f.font) });
          if (!g) return { ok: false, motiv: 'motiv.nimic-ales' };
          const forme: FormaDoc[] = g.contururi.map((k) => ({ tip: 'cale', inchis: k.inchis, varfuri: k.varfuri.map((v) => structuredClone(v)) }));
          const r = s.onDesen(forme, sterge ? s.cote.filter((c) => c.id !== id) : null);
          // Desenul e ales (de acțiune), cu Selecția: panoul îi arată tăierea, de unde primește un rol.
          if (r.ok) s.onUnealta('selectie');
          return r;
        },
      },
    });
  }, [aleasa, toate, idFoaie]);
  // „Cotează selecția” (felia 10.4↑d-1), cerută din extensia barei: lățimea și înălțimea fiecărei piese alese, legate de
  // colțurile cutiei, într-un singur pas. O cerere se face o singură dată, și după o montare din nou a stratului.
  const coteaza = useRef<() => void>(() => undefined);
  coteaza.current = (): void => {
    const noi = coteSelectie(doc, indexFoaie, selectie, setari.linii.distanta, cote, setari.comportament.legate);
    if (noi.length === 0) {
      setMotiv(t('editare.cote.motiv.selectie'));
      return;
    }
    const r = onScrie([...cote, ...noi]);
    setMotiv(r.ok ? null : t(r.motiv));
    if (r.ok && setari.comportament.dupa === 'selectie') onUnealta('selectie');
  };
  useEffect(() => {
    if (cerere.mod !== 's' || CERERI_FACUTE.has(cerere)) return;
    CERERI_FACUTE.add(cerere);
    coteaza.current();
  }, [cerere]);
  // Plecată (alt proiect, vederea 3D, nicio cotă), unealta nu mai publică nimic.
  useEffect(() => () => {
    publicaPanou(null);
    publicaRanduri('', []);
  }, []);

  const acum = useRef({ doc, indexFoaie, cote, desenate, surse, fixe, vedere, setari, stil, format, lipire, grila, fel, puse, masura, serie, aleasa, unealta, activ, onScrie, onDesen, onUnealta, poateDublu });
  acum.current = { doc, indexFoaie, cote, desenate, surse, fixe, vedere, setari, stil, format, lipire, grila, fel, puse, masura, serie, aleasa, unealta, activ, onScrie, onDesen, onUnealta, poateDublu };

  useEffect(() => {
    const el = radacina.current;
    const panza = el?.closest('.panza-cutie')?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !panza) return undefined;
    let spatiu = false;
    type Tragere = { readonly fel: 'capat'; readonly k: number; readonly c: Capat } | { readonly fel: 'linie'; readonly linie: NonNullable<Cota['linie']> };
    let apasat: { readonly id: number; readonly x: number; readonly y: number; readonly ce: 'capat' | 'linie'; readonly k: number; tras: boolean; tr: Tragere | null } | null = null;
    const rot = (v: number): number => Math.round(v * 1000) / 1000;
    const inLume = (e: { clientX: number; clientY: number }): Punct => {
      const r = el.getBoundingClientRect(), v = acum.current.vedere;
      return { x: (e.clientX - r.left - v.tx) / v.scara, y: (v.ty - (e.clientY - r.top)) / v.scara };
    };
    /** Punctul lipit de sub maus (sau rotunjit la 0,001 mm), cu legătura lui după setare. */
    const lipit = (e: PointerEvent | MouseEvent): { readonly c: Capat; readonly t: PunctTinta<LegaturaCota> | null } => {
      const s = acum.current, w = inLume(e);
      const o = optiuniLipireCote(s.setari, { alt: e.altKey, ctrl: e.ctrlKey || e.metaKey }, s.lipire, s.grila, s.vedere.scara);
      const r = o ? lipestePunct(s.surse, s.fixe, w, o) : null;
      if (!r) return { c: { p: { x: rot(w.x), y: rot(w.y) }, legatura: null }, t: null };
      return { c: { p: r.p, legatura: s.setari.comportament.legate ? r.date : null }, t: r };
    };
    /**
     * Cota de sub punct (cea mai apropiată, la cel mult toleranța), sau null: doar linia de cotă și cifra, nu și liniile de
     * extensie, care pleacă chiar de lângă punctele formelor (un clic pe un vârf începe o cotă nouă, nu o alege pe cea veche).
     */
    const cotaLa = (w: Punct): Desenata | null => {
      const s = acum.current, tol = TOLERANTA_PX / s.vedere.scara;
      let cel: { readonly d: Desenata; readonly dist: number } | null = null;
      for (const d of s.desenate) {
        if (!d.desen) continue;
        const dist = distantaLaDesen({ ...d.desen, extensii: [] }, d.text, w);
        if (dist <= tol && (!cel || dist < cel.dist)) cel = { d, dist };
      }
      return cel?.d ?? null;
    };
    /**
     * Segmentul de sub cursor (cel mai apropiat, la cel mult toleranța), cu felul lui: o latură dreaptă (capetele ei, vârfurile,
     * legate după setare), un arc (centrul, raza și punctele numite de pe cercul lui) sau o curbă (cubica: refuzată la rază).
     */
    type SubCursor =
      | { readonly fel: 'latura'; readonly id: string; readonly k: number; readonly capete: readonly [Capat, Capat] }
      | { readonly fel: 'arc'; readonly cerc: NonNullable<Puse['cerc']>; readonly intreg: boolean }
      | { readonly fel: 'curba' };
    const segmentLa = (w: Punct): SubCursor | null => {
      const s = acum.current, tol = TOLERANTA_PX / s.vedere.scara, legate = s.setari.comportament.legate;
      let cel: { readonly sursa: (typeof s.surse)[number]; readonly c: Contur; readonly i: number; readonly d: number } | null = null;
      for (const sursa of s.surse) {
        const k = sursa.cutie;
        if (w.x < k.minX - tol || w.x > k.maxX + tol || w.y < k.minY - tol || w.y > k.maxY + tol || !sursa.contur) continue;
        const c = sursa.contur();
        const n = numarSegmente(c);
        for (let i = 0; i < n; i++) {
          const r = apropiat(c, i, w);
          if (r.d <= tol && (!cel || r.d < cel.d)) cel = { sursa, c, i, d: r.d };
        }
      }
      if (!cel) return null;
      const { sursa, c, i } = cel;
      const sg = segment(c, i);
      const pts = sursa.puncte();
      const leg = (q: PunctTinta<LegaturaCota>): Capat => ({ p: q.p, legatura: legate ? q.date : null });
      if (sg.s.tip === 'C') return { fel: 'curba' };
      if (sg.s.tip === 'A' && Math.abs(sg.s.bulge) > 1e-12) {
        const k = cerculArcului(sg.a, sg.b, sg.s.bulge);
        const tol6 = 1e-6 * Math.max(1, k.raza);
        const aici = (q: PunctTinta<LegaturaCota>, p: Punct): boolean => Math.hypot(q.p.x - p.x, q.p.y - p.y) <= tol6;
        const centru = pts.find((q) => q.fel === 'centru' && aici(q, k.centru));
        const pe = legate ? pts.filter((q) => (q.fel === 'varf' || q.fel === 'mijloc' || q.fel === 'cadran')
          && Math.abs(Math.hypot(q.p.x - k.centru.x, q.p.y - k.centru.y) - k.raza) <= tol6).map(leg) : [];
        return { fel: 'arc', cerc: { c: centru ? leg(centru) : { p: k.centru, legatura: null }, r: k.raza, pe }, intreg: eCerc(c) };
      }
      const v = (k2: number): PunctTinta<LegaturaCota> | undefined => pts.find((q) => q.fel === 'varf' && q.date?.loc.fel === 'varf' && q.date.loc.k === k2);
      const va = v(i), vb = v((i + 1) % c.varfuri.length);
      if (!va || !vb) return null;
      return { fel: 'latura', id: `${va.date?.instanta ?? ''}/${va.date?.nod ?? ''}`, k: i, capete: [leg(va), leg(vb)] };
    };
    /**
     * A doua latură aleasă (Automată, Unghi): unghiul dintre cele două, prin capetele lor (patru puncte), sau, la laturi
     * paralele, distanța dintre ele (doar la Automată): verticală între două laturi orizontale, orizontală între două
     * verticale, legate; între două oblice, aliniată de la primul capăt la piciorul lui pe cealaltă, liberă (un desen fix:
     * piciorul nu e un punct al formei). Null: paralele la Unghi (fără unghi), sau o latură de lungime zero.
     */
    const douaLaturi = (a: readonly [Capat, Capat], b: readonly [Capat, Capat], automata: boolean): Puse | null => {
      const e1 = { x: a[1].p.x - a[0].p.x, y: a[1].p.y - a[0].p.y }, e2 = { x: b[1].p.x - b[0].p.x, y: b[1].p.y - b[0].p.y };
      const l1 = Math.hypot(e1.x, e1.y), l2 = Math.hypot(e2.x, e2.y);
      if (!(l1 > 1e-12) || !(l2 > 1e-12)) return null;
      if (Math.abs(e1.x * e2.y - e1.y * e2.x) > 1e-9 * l1 * l2) return { capete: [...a, ...b], fix: 'unghi', latura: null, cerc: null };
      if (!automata) return null;
      const tol = 1e-9 * l1;
      if (Math.abs(e1.y) <= tol) return { capete: [a[0], b[0]], fix: 'verticala', latura: null, cerc: null };
      if (Math.abs(e1.x) <= tol) return { capete: [a[0], b[0]], fix: 'orizontala', latura: null, cerc: null };
      const t = ((a[0].p.x - b[0].p.x) * e2.x + (a[0].p.y - b[0].p.y) * e2.y) / (l2 * l2);
      const picior = { x: b[0].p.x + t * e2.x, y: b[0].p.y + t * e2.y };
      return { capete: [{ p: a[0].p, legatura: null }, { p: picior, legatura: null }], fix: 'aliniata', latura: null, cerc: null };
    };
    const scrie = (lista: readonly Cota[]): boolean => {
      const r = acum.current.onScrie(lista);
      if (!r.ok) setMotiv(t(r.motiv));
      else setMotiv(null);
      return r.ok;
    };
    const puneCota = (capete: readonly Capat[], felCota: FelCota, linie: NonNullable<Cota['linie']>): boolean => {
      const s = acum.current;
      const l = { ...linie, d: rot(linie.d) };
      const noua: Cota = { id: idCota(s.cote), fel: felCota, puncte: capete.map(ancoraDin), linie: l };
      if (!scrie([...s.cote, noua])) return false;
      // Într-un lanț sau într-o linie de bază, unealta rămâne până la Esc (setarea „După o cotă” vine după ultima).
      if (s.setari.comportament.dupa === 'selectie' && !esteSerie(s.fel)) s.onUnealta('selectie');
      return true;
    };

    const peCote = (e: Event): boolean => e.target === panza && !spatiu;

    const apasa = (e: PointerEvent): void => {
      const s = acum.current;
      if (!s.unealta || !peCote(e) || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      panza.setPointerCapture(e.pointerId);
      const w = inLume(e);
      if (s.fel === 'masoara') {
        const { c } = lipit(e);
        setMasura((m) => (!m || m.b ? { a: c, b: null } : { a: m.a, b: c }));
        return;
      }
      // Lanțul sau linia de bază pornite: punctul de sub maus pune cota următoare, din capătul seriei.
      if (s.serie && esteSerie(s.fel)) {
        const { c } = lipit(e);
        const r = cotaUrmatoare(s.serie.s, c.p, pasBaza(s.stil));
        if (!r) {
          setMotiv(t('editare.cote.motiv.zero'));
          return;
        }
        if (puneCota([s.serie.din, c], s.serie.s.fel, { d: r.d })) setSerie({ s: r.stare, din: s.serie.s.mod === 'lant' ? c : s.serie.din });
        return;
      }
      const n = s.puse.capete.length;
      if (asteapta(s.puse)) {
        // La Automată, cu o latură aleasă, un clic pe altă latură face unghiul (sau distanța, la paralele).
        if (s.puse.latura && s.fel === 'automata') {
          const sub = segmentLa(w);
          const [a, b] = s.puse.capete;
          if (sub?.fel === 'latura' && a && b && (sub.id !== s.puse.latura.id || sub.k !== s.puse.latura.k)) {
            const d = douaLaturi([a, b], sub.capete, true);
            if (d) {
              setPuse(d);
              return;
            }
          }
        }
        const x = cotaInceputa(s.puse, s.fel, w, e.shiftKey);
        if (!x) return;
        setPuse(NIMIC);
        const pusa = puneCota(x.capete, x.fel, x.linie);
        // Prima cotă a unui lanț sau a unei linii de bază: seria pornește din ea.
        const [a, b] = x.capete;
        if (pusa && esteSerie(s.fel) && a && b && (x.fel === 'orizontala' || x.fel === 'verticala' || x.fel === 'aliniata')) {
          const st = pornesteSerie(s.fel, x.fel, a.p, b.p, rot(x.linie.d));
          if (st) setSerie({ s: st, din: s.fel === 'lant' ? b : a });
        }
        return;
      }
      // La Unghi, cu prima latură aleasă: a doua latură.
      if (s.puse.latura && s.puse.fix === 'unghi') {
        const sub = segmentLa(w);
        const [a, b] = s.puse.capete;
        if (sub?.fel !== 'latura' || !a || !b || (sub.id === s.puse.latura.id && sub.k === s.puse.latura.k)) return;
        const d = douaLaturi([a, b], sub.capete, false);
        if (!d) {
          setMotiv(t('editare.cote.motiv.paralele'));
          return;
        }
        setMotiv(null);
        setPuse(d);
        return;
      }
      if (n >= 1) {
        const { c } = lipit(e);
        const ultim = s.puse.capete[n - 1];
        if (ultim && Math.hypot(ultim.p.x - c.p.x, ultim.p.y - c.p.y) < 1e-9) return;
        setPuse({ ...s.puse, capete: [...s.puse.capete, c] });
        return;
      }
      // Niciun punct pus: întâi o cotă (a aleasă: capetele ei; apoi orice cotă), apoi un punct nou.
      const tol = TOLERANTA_PX / s.vedere.scara;
      const aleasa = s.aleasa ? s.desenate.find((d) => d.cota.id === s.aleasa) : undefined;
      if (aleasa) {
        const k = aleasa.puncte.findIndex((q) => Math.hypot(q.p.x - w.x, q.p.y - w.y) <= tol);
        if (k >= 0) {
          apasat = { id: e.pointerId, x: e.clientX, y: e.clientY, ce: 'capat', k, tras: false, tr: null };
          return;
        }
      }
      // Un punct numit al unei forme (vârful, mijlocul, centrul, cadranul, cutia) bate cota de sub el: începe o cotă nouă.
      const { c, t: tl } = lipit(e);
      const numit = tl !== null && tl.date !== null;
      const sub = numit ? null : cotaLa(w);
      if (sub) {
        setAleasa(sub.cota.id);
        apasat = { id: e.pointerId, x: e.clientX, y: e.clientY, ce: 'linie', k: -1, tras: false, tr: null };
        return;
      }
      setAleasa(null);
      setMotiv(null);
      // Rază și Diametru: doar pe un cerc sau pe un arc (ADR 0330 §4), oriunde pe el, și pe un punct numit al lui.
      if (s.fel === 'raza' || s.fel === 'diametru') {
        const sub = segmentLa(w);
        if (sub?.fel === 'arc') setPuse({ ...NIMIC, fix: s.fel, cerc: sub.cerc });
        else if (sub) setMotiv(t('editare.cote.motiv.arc'));
        return;
      }
      // Automată (fără un punct numit sub cursor): o latură dreaptă, un cerc (diametrul), un arc (raza). Unghi: o latură.
      if ((s.fel === 'automata' || s.fel === 'unghi') && (!tl || tl.fel === 'contur' || tl.fel === 'grila')) {
        const sub = segmentLa(w);
        if (sub?.fel === 'latura') {
          setPuse({ capete: sub.capete, fix: s.fel === 'unghi' ? 'unghi' : 'aliniata', latura: { id: sub.id, k: sub.k }, cerc: null });
          return;
        }
        if (sub?.fel === 'arc' && s.fel === 'automata') {
          setPuse({ ...NIMIC, fix: sub.intreg ? 'diametru' : 'raza', cerc: sub.cerc });
          return;
        }
      }
      setPuse({ ...NIMIC, capete: [c], fix: s.fel === 'unghi' ? 'unghi' : null });
    };
    const misca = (e: PointerEvent): void => {
      const s = acum.current;
      if (!s.unealta) return;
      if (apasat && e.pointerId === apasat.id) {
        if (!apasat.tras && Math.hypot(e.clientX - apasat.x, e.clientY - apasat.y) < PRAG_TRAGERE_PX) return;
        apasat.tras = true;
        const d = s.desenate.find((x) => x.cota.id === s.aleasa);
        if (!d) return;
        if (apasat.ce === 'capat') {
          const r = lipit(e);
          setTinta(r.t);
          apasat.tr = { fel: 'capat', k: apasat.k, c: r.c };
        } else {
          const l = linieDin(d.cota.fel, d.puncte.map((q) => q.p), inLume(e), d.cota.linie);
          if (l) apasat.tr = { fel: 'linie', linie: l };
        }
        setTrage(apasat.tr);
        return;
      }
      if (e.target !== panza) return;
      const r = lipit(e);
      setTinta(r.t);
      // Locul liniei de cotă urmează mausul liber; altfel cursorul lipit e capătul elastic al cotei începute sau al măsurii.
      setCursor({ p: s.fel !== 'masoara' && asteapta(s.puse) ? inLume(e) : r.c.p, shift: e.shiftKey });
    };
    const elibereaza = (e: PointerEvent): void => {
      if (!apasat || e.pointerId !== apasat.id) return;
      const x = apasat;
      apasat = null;
      const s = acum.current, tr = x.tr;
      setTrage(null);
      setTinta(null);
      if (!x.tras || !tr) return;
      const cota = s.cote.find((c) => c.id === s.aleasa);
      if (!cota) return;
      if (tr.fel === 'linie') {
        scrie(s.cote.map((c) => (c.id === cota.id ? { ...c, linie: { ...tr.linie, d: rot(tr.linie.d) } } : c)));
        return;
      }
      // Capătul tras: legat din nou de punctul de sub el, sau liber.
      const puncte = (cota.puncte ?? []).map((a, k) => (k === tr.k ? ancoraDin(tr.c) : a));
      scrie(s.cote.map((c) => (c.id === cota.id ? { ...c, puncte } : c)));
    };
    const dublu = (e: MouseEvent): void => {
      const s = acum.current;
      if (e.target !== panza || !s.activ || spatiu || !s.poateDublu()) return;
      const sub = cotaLa(inLume(e));
      if (!sub) return;
      e.preventDefault();
      e.stopPropagation();
      s.onUnealta('cote');
      setAleasa(sub.cota.id);
    };
    const tasta = (e: KeyboardEvent): void => {
      if (e.code === 'Space') spatiu = e.type === 'keydown';
      const s = acum.current;
      if (e.type !== 'keydown' || !s.unealta || e.ctrlKey || e.metaKey) return;
      const tinta2 = e.target;
      if (tinta2 instanceof Element && tinta2.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], dialog') !== null) return;
      const ia = (): void => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (e.key === 'Escape') {
        if (s.puse.capete.length > 0 || s.puse.cerc) { ia(); setPuse(NIMIC); setMotiv(null); return; }
        if (s.serie) {
          ia();
          setSerie(null);
          setMotiv(null);
          if (s.setari.comportament.dupa === 'selectie') s.onUnealta('selectie');
          return;
        }
        if (s.masura) { ia(); setMasura(null); return; }
        if (s.aleasa) { ia(); setAleasa(null); return; }
        return;
      }
      if (e.key === 'Enter' && s.masura?.b) {
        ia();
        const { a, b } = s.masura;
        setMasura(null);
        if (Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y) > 1e-9) puneCota([a, b], 'aliniata', { d: s.setari.linii.distanta });
        return;
      }
      if (!s.aleasa) return;
      const cota = s.cote.find((c) => c.id === s.aleasa);
      if (!cota) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        ia();
        scrie(s.cote.filter((c) => c.id !== cota.id));
        setAleasa(null);
        return;
      }
      const dir = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] } as Record<string, [number, number]>)[e.key];
      if (!dir) return;
      ia();
      const d = s.desenate.find((x) => x.cota.id === cota.id);
      const [a, b] = d?.puncte ?? [];
      if (!d || !a || !b || !cota.linie) return;
      // Pasul ca la forme: 1 mm, cu Shift 10, cu Alt 0,1. La cotele liniare, doar partea de pe normala cotei mută linia; la
      // rază, diametru și unghi, săgețile sus și dreapta duc cifra (raza arcului) mai departe, jos și stânga mai aproape.
      const k = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      let dd: number;
      if (esteLiniar(cota.fel)) {
        const p0 = { x: (a.p.x + b.p.x) / 2, y: (a.p.y + b.p.y) / 2 };
        dd = distantaDinCursor(cota.fel, a.p, b.p, { x: p0.x + dir[0] * k, y: p0.y + dir[1] * k }) - distantaDinCursor(cota.fel, a.p, b.p, p0);
      } else dd = (dir[0] + dir[1]) * k;
      const nou = cota.fel === 'unghi' ? Math.max(0.1, cota.linie.d + dd) : cota.linie.d + dd;
      if (Math.abs(nou - cota.linie.d) < 1e-12) return;
      scrie(s.cote.map((c) => (c.id === cota.id ? { ...c, linie: { ...cota.linie, d: rot(nou) } } : c)));
    };
    const iese = (): void => { if (!apasat) { setTinta(null); setCursor(null); } };
    const uita = (): void => { spatiu = false; };
    window.addEventListener('pointerdown', apasa, true);
    window.addEventListener('pointermove', misca, true);
    window.addEventListener('pointerup', elibereaza, true);
    window.addEventListener('dblclick', dublu, true);
    window.addEventListener('keydown', tasta, true);
    window.addEventListener('keyup', tasta, true);
    window.addEventListener('blur', uita);
    panza.addEventListener('pointerleave', iese);
    return () => {
      window.removeEventListener('pointerdown', apasa, true);
      window.removeEventListener('pointermove', misca, true);
      window.removeEventListener('pointerup', elibereaza, true);
      window.removeEventListener('dblclick', dublu, true);
      window.removeEventListener('keydown', tasta, true);
      window.removeEventListener('keyup', tasta, true);
      window.removeEventListener('blur', uita);
      panza.removeEventListener('pointerleave', iese);
    };
  }, []);

  if (!foaie) return null;
  const sx = (x: number): number => vedere.tx + x * vedere.scara;
  const sy = (y: number): number => vedere.ty - y * vedere.scara;

  // Cotele de desenat: cele ale foii (cea trasă, cu schimbarea ei) și cea începută.
  const desene: Array<Desenata & { readonly cls: string }> = desenate.map((d) => {
    if (d.cota.id !== aleasa || !trage) return { ...d, cls: d.cota.id === aleasa ? 'aleasa' : '' };
    if (trage.fel === 'linie') {
      const c = { ...d.cota, linie: trage.linie };
      return { ...deseneaza(c, d.puncte, stil, format), cls: 'aleasa' };
    }
    const puncte = d.puncte.map((q, k) => (k === trage.k ? { p: trage.c.p, stare: trage.c.legatura ? 'legata' as const : 'libera' as const } : q));
    return { ...deseneaza(d.cota, puncte, stil, format), cls: 'aleasa' };
  });
  let elastic: ReactElement | null = null;
  const inceputa = unealta && cursor ? cotaInceputa(puse, fel, cursor.p, cursor.shift) : null;
  const urmatoarea = unealta && cursor && serie && esteSerie(fel) ? cotaUrmatoare(serie.s, cursor.p, pasBaza(stil)) : null;
  if (serie && urmatoarea && cursor) {
    // Cota următoare a seriei, de la capătul ei la punctul lipit de sub maus.
    const c: Cota = { id: '-', fel: serie.s.fel, puncte: [ancoraDin(serie.din), { x: cursor.p.x, y: cursor.p.y }], linie: { d: urmatoarea.d } };
    desene.push({ ...deseneaza(c, [{ p: serie.din.p, stare: 'libera' }, { p: cursor.p, stare: 'libera' }], stil, format), cls: 'noua' });
  } else if (inceputa) {
    const c: Cota = { id: '-', fel: inceputa.fel, puncte: inceputa.capete.map(ancoraDin), linie: inceputa.linie };
    desene.push({ ...deseneaza(c, inceputa.capete.map((q) => ({ p: q.p, stare: 'libera' as const })), stil, format), cls: 'noua' });
  } else if (unealta && fel !== 'masoara' && !serie && !asteapta(puse) && !puse.latura && cursor) {
    // Capătul elastic: de la ultimul punct pus (la unghi, al doilea punct se leagă tot de vârf).
    const a = puse.fix === 'unghi' ? puse.capete[0] : puse.capete[puse.capete.length - 1];
    if (a) elastic = <line className="cota-elastic" x1={sx(a.p.x)} y1={sy(a.p.y)} x2={sx(cursor.p.x)} y2={sy(cursor.p.y)} />;
  }
  // Măsura: de la primul punct la al doilea (sau la cursor), cu cifrele lângă capăt.
  const capatMasura = masura ? (masura.b?.p ?? cursor?.p ?? null) : null;
  const textM = masura && capatMasura ? textMasura(masura.a.p, capatMasura, setari, format) : null;
  const marcaj = unealta && tinta ? <Marcaj fel={tinta.fel} x={sx(tinta.p.x)} y={sy(tinta.p.y)} /> : null;
  const sfat = !unealta ? null : motiv ?? t(sfatCote(fel, puse, aleasa !== null, serie !== null));
  const alegeFel = (f: FelUnealta): void => {
    setFel(f);
    tineFel(f);
    setPuse(NIMIC);
    setMasura(null);
    setMotiv(null);
    // Lanțul sau linia de bază cu o cotă liniară aleasă: seria pornește din ea (lanțul, din al doilea capăt; baza, din primul).
    const d = esteSerie(f) && aleasa ? toate.find((x) => x.cota.id === aleasa) : undefined;
    const [a, b] = d?.cota.puncte ?? [];
    const [pa, pb] = d?.puncte ?? [];
    const st = d && a && b && pa && pb && esteLiniar(d.cota.fel) && d.cota.linie ? pornesteSerie(f as ModSerie, d.cota.fel, pa.p, pb.p, d.cota.linie.d) : null;
    const capatDin = f === 'lant' ? { a: b, p: pb } : { a, p: pa };
    setSerie(st && capatDin.a && capatDin.p ? { s: st, din: { p: capatDin.p.p, legatura: capatDin.p.stare === 'legata' ? capatDin.a.legatura ?? null : null } } : null);
  };


  return (
    <div className="strat-cote" ref={radacina} data-testid="strat-cote" data-fel={unealta ? fel : undefined} data-puse={puse.capete.length} data-fix={puse.fix ?? undefined} data-cerc={puse.cerc ? '' : undefined} data-aleasa={aleasa ?? undefined}
      data-serie={serie ? serie.s.mod : undefined}
      data-ascunse={vizibile ? undefined : ''} style={setari.comportament.culoare ? ({ '--cota': setari.comportament.culoare } as CSSProperties) : undefined}>
      <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true">
        {vecine.map((v) => (
          <g key={`v${v.foaie}`} className="cote-vecine" data-foaie={v.foaie}>
            {v.desene.map((d) => <CotaSvg key={d.cota.id} d={d} cls="" sx={(x) => sx(x + v.dx)} sy={sy} scara={vedere.scara} prag={setari.comportament.pragCifre} />)}
          </g>
        ))}
        {desene.map((d) => <CotaSvg key={d.cota.id} d={d} cls={d.cls} sx={sx} sy={sy} scara={vedere.scara} prag={setari.comportament.pragCifre} />)}
        {elastic}
        {unealta && puse.capete.map((c, k) => <circle key={`p${k}`} className="cota-pus" cx={sx(c.p.x)} cy={sy(c.p.y)} r={3} />)}
        {masura && capatMasura ? (
          <g className="masura" data-testid="masura-linie">
            <line x1={sx(masura.a.p.x)} y1={sy(masura.a.p.y)} x2={sx(capatMasura.x)} y2={sy(capatMasura.y)} />
            <circle cx={sx(masura.a.p.x)} cy={sy(masura.a.p.y)} r={3} />
            {masura.b ? <circle cx={sx(masura.b.p.x)} cy={sy(masura.b.p.y)} r={3} /> : null}
          </g>
        ) : null}
        {marcaj}
      </svg>
      {textM && capatMasura && setari.masurare.cursor ? (
        <span className="cip cip-masura" role="status" data-testid="masura" style={{ left: sx(capatMasura.x) + 12, top: sy(capatMasura.y) + 12 }}>
          {textM}
          {masura?.b ? (
            <button type="button" data-testid="masura-pastreaza" onClick={() => {
              const m = masura;
              setMasura(null);
              if (m?.b && Math.hypot(m.b.p.x - m.a.p.x, m.b.p.y - m.a.p.y) > 1e-9) {
                const noua: Cota = { id: idCota(cote), fel: 'aliniata', puncte: [ancoraDin(m.a), ancoraDin(m.b)], linie: { d: setari.linii.distanta } };
                const r = onScrie([...cote, noua]);
                setMotiv(r.ok ? null : t(r.motiv));
              }
            }}>{t('editare.cote.pastreaza')}</button>
          ) : null}
        </span>
      ) : null}
      {textM && locJos && setari.masurare.bara ? createPortal(<span className="cip cip-masura-jos" role="status" data-testid="masura-jos">{textM}</span>, locJos) : null}
      {sfat ? (
        <span className={motiv ? 'cip cip-rosu noduri-sfat' : 'cip noduri-sfat'} role="status" data-testid="cote-sfat" style={{ left: zona.x + 8, top: zona.y + zona.h - 44 }}>{sfat}</span>
      ) : null}
      {unealta && loc ? createPortal(
        <span className="cote-feluri" role="group" aria-label={t('editare.cote.bara')} data-testid="cote-bara">
          {FELURI_UNEALTA.map((f) => {
            const titlu = t(`editare.cote.fel.${f}`);
            return (
              <button key={f} type="button" className="aliniaza" aria-pressed={fel === f} title={titlu} aria-label={titlu} data-testid={`cote-fel-${f}`}
                onClick={() => { alegeFel(f); }}>
                <IconaFel f={f} />
              </button>
            );
          })}
          {onSetari ? (
            <button type="button" className="aliniaza cote-setari" title={t('editare.cote.setari')} aria-label={t('editare.cote.setari')} data-testid="cote-setari"
              onClick={onSetari}>
              <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path className="contur" d="M8 5.5 A2.5 2.5 0 1 0 8 10.5 A2.5 2.5 0 1 0 8 5.5 Z M7 1.5 H9 L9.4 3.4 L11 4.3 L12.8 3.6 L13.8 5.3 L12.4 6.6 V9.4 L13.8 10.7 L12.8 12.4 L11 11.7 L9.4 12.6 L9 14.5 H7 L6.6 12.6 L5 11.7 L3.2 12.4 L2.2 10.7 L3.6 9.4 V6.6 L2.2 5.3 L3.2 3.6 L5 4.3 L6.6 3.4 Z" />
              </svg>
            </button>
          ) : null}
        </span>,
        loc,
      ) : null}
    </div>
  );
}

/** Semnul punctului lipit (ADR 0330 §5): pătrat vârf, triunghi mijloc, cerc centru, romb cadran; restul, o cruce. */
function Marcaj({ fel, x, y }: { readonly fel: FelPunct; readonly x: number; readonly y: number }): ReactElement {
  const r = 5;
  const forma = fel === 'varf' ? <rect x={x - r} y={y - r} width={2 * r} height={2 * r} />
    : fel === 'mijloc' ? <polygon points={`${x},${y - r} ${x + r},${y + r * 0.8} ${x - r},${y + r * 0.8}`} />
      : fel === 'centru' ? <circle cx={x} cy={y} r={r} />
        : fel === 'cadran' ? <polygon points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`} />
          : fel === 'cutie' || fel === 'foaie' ? <rect x={x - r} y={y - r} width={2 * r} height={2 * r} strokeDasharray="2 2" />
            : <path d={`M${x - r} ${y - r} L${x + r} ${y + r} M${x - r} ${y + r} L${x + r} ${y - r}`} />;
  return <g className="cota-lipire" data-testid="cote-lipire" data-fel={fel}>{forma}</g>;
}

/** Pictogramele felurilor din bara uneltei. */
function IconaFel({ f }: { readonly f: FelUnealta }): ReactElement {
  const d: Record<FelUnealta, string> = {
    automata: 'M2 12 L14 4 M2 12 L2 9 M14 4 L14 7 M5 13.5 L15 6.5',
    orizontala: 'M2 4 V12 M14 4 V12 M2 8 H14 M2 8 L4.5 6.5 M2 8 L4.5 9.5 M14 8 L11.5 6.5 M14 8 L11.5 9.5',
    verticala: 'M4 2 H12 M4 14 H12 M8 2 V14 M8 2 L6.5 4.5 M8 2 L9.5 4.5 M8 14 L6.5 11.5 M8 14 L9.5 11.5',
    aliniata: 'M3 13 L13 3 M3 13 L3.4 10 M3 13 L6 12.6 M13 3 L10 3.4 M13 3 L12.6 6',
    lant: 'M1.5 4 V12 M8 4 V12 M14.5 4 V12 M1.5 8 H14.5 M1.5 8 L3.5 7 M1.5 8 L3.5 9 M8 8 L6 7 M8 8 L6 9 M8 8 L10 7 M8 8 L10 9 M14.5 8 L12.5 7 M14.5 8 L12.5 9',
    baza: 'M2 14 V3 M8 14 V8 M14 14 V3 M2 10 H8 M2 5 H14 M2 10 L4 9 M2 10 L4 11 M8 10 L6 9 M8 10 L6 11 M2 5 L4 4 M2 5 L4 6 M14 5 L12 4 M14 5 L12 6',
    raza: 'M14 8 A6 6 0 1 1 2 8 A6 6 0 1 1 14 8 M8 8 L12.2 3.8 M12.2 3.8 L9.8 4.4 M12.2 3.8 L11.6 6.2',
    diametru: 'M14 8 A6 6 0 1 1 2 8 A6 6 0 1 1 14 8 M3.8 12.2 L12.2 3.8 M12.2 3.8 L9.8 4.4 M12.2 3.8 L11.6 6.2 M3.8 12.2 L6.2 11.6 M3.8 12.2 L4.4 9.8',
    unghi: 'M2 13 H14 M2 13 L11 3 M10 13 A8 8 0 0 0 7.4 7.1',
    masoara: 'M1.5 10.5 L10.5 1.5 L14.5 5.5 L5.5 14.5 Z M4 8 L5.5 9.5 M6 6 L8 8 M8 4 L9.5 5.5',
  };
  return (
    <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path className="contur" d={d[f]} />
    </svg>
  );
}
