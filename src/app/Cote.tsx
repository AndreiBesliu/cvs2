/**
 * Cotele pe pânză și unealta Cote (ADR 0330 §5; felia 10.4↑a-2). Vine la cerere, într-o bucată a ei: la prima apăsare pe D sau
 * M, sau după prima randare a unei foi cu cote.
 *
 * - **Desenul:** cotele foii active, peste pânză, într-un strat care nu prinde evenimente (cu Selecția și cu celelalte unelte,
 *   clicul trece la forma de sub ele). Cele dezlegate, punctate, în roșu. Cifrele, sub 6 px pe ecran, se ascund.
 * - **Unealta** (doar cu ea aleasă): felurile în bara de sus (Automată, Orizontală, Verticală, Aliniată, Măsoară); pusul în
 *   trei clicuri (primul punct, al doilea, locul liniei), cu lipirea pe puncte (`lipirePuncte.ts`) și capetele legate de forme
 *   (setarea „Cotele noi sunt legate”); la Automată, un clic pe o latură dreaptă îi ia lungimea. Măsoară: două puncte, fără
 *   urmă; Enter (sau „Păstrează”) o face cotă aliniată, Esc o șterge.
 * - **Alegerea:** un clic pe o cotă o alege; capetele se trag pe alt punct (se leagă din nou), linia se trage (sau săgețile o
 *   mută), Delete o șterge. Dublu clic pe o cotă, cu orice unealtă (afară de un desen Pen sau o tăiere începută), trece la Cote,
 *   cu ea aleasă.
 *
 * Fiecare schimbare e o listă nouă a cotelor foii, scrisă prin acțiunea `foaie.cote` (un pas de anulare).
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { Zona } from '../canvas/Rigle.tsx';
import type { Vedere } from '../canvas/protocol.ts';
import { apropiat } from '../geom/apropiat.ts';
import { numarSegmente, segment, type Punct } from '../geom/conturBaza.ts';
import { lipestePunct, type FelPunct, type PunctTinta } from '../geom/lipirePuncte.ts';
import { t } from '../i18n/t.ts';
import { felCunoscut, indexLume, punctAncora, valoareCota, type PunctCota } from '../model/cote.ts';
import { desenLiniar, distantaDinCursor, distantaLaDesen, felAutomat, STIL_IMPLICIT, textCota, textValoare, type DesenCota, type FelLiniar } from '../model/desenCota.ts';
import type { AncoraCota, Cota, Document, LegaturaCota } from '../model/document.ts';
// Judecata cotelor și dezlegarea lor în jurnal (ADR 0330 §2, §3): cu unealta, o cotă nouă trece de ușă și se dezleagă cinstit.
import '../model/judecataCote.ts';
import { puncteFoaie, surseCote } from '../model/puncteCote.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import './cote.css';
import { optiuniLipireCote, setariCote, useSetariCote, type SetariCote } from './setariCote.ts';

/** Felurile din bara uneltei, în ordine (raza, diametrul și unghiul vin în felia b). */
export const FELURI_UNEALTA = ['automata', 'orizontala', 'verticala', 'aliniata', 'masoara'] as const;
export type FelUnealta = (typeof FELURI_UNEALTA)[number];

/** Ultimul fel folosit (setarea „Unealta pornește cu: ultimul fel folosit”), ținut în browser. */
const CHEIE_FEL = 'cncvs2.cote-fel';
/** Cât de departe de o cotă, de un capăt sau de o latură prinde un clic (px). */
const TOLERANTA_PX = 6;
/** O tragere mai scurtă (px) e un clic. */
const PRAG_TRAGERE_PX = 3;
/** Distanța liniei de cotă la „Păstrează” din Măsoară, în mm (setarea ei vine în fereastra Setări, felia a-3). */
const DISTANTA_PUNERE = 10;
/** Sub atâția pixeli pe ecran, cifrele nu se mai scriu (rămân liniile). */
const CIFRE_MINIM_PX = 6;

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

type Desenata = {
  readonly cota: Cota;
  readonly puncte: readonly PunctCota[];
  readonly desen: DesenCota | null;
  readonly text: string;
  readonly valoare: number | null;
  readonly dezlegata: boolean;
};

const esteLiniar = (f: string): f is FelLiniar => f === 'orizontala' || f === 'verticala' || f === 'aliniata';

/** Desenul unei cote cu punctele ei citite; null pentru felurile care nu se desenează încă (raza, diametrul, unghiul: felia b). */
function deseneaza(c: Cota, puncte: readonly PunctCota[], virgula: boolean): Desenata {
  const p = puncte.map((x) => x.p);
  const valoare = valoareCota(c, p);
  const [a, b] = p;
  const desen = esteLiniar(c.fel) && a && b && c.linie ? desenLiniar(c.fel, a, b, c.linie.d, STIL_IMPLICIT) : null;
  return { cota: c, puncte, desen, text: valoare === null ? '' : textCota(c, valoare, virgula), valoare, dezlegata: puncte.some((x) => x.stare === 'dezlegata') };
}

/** Un id nou pe foaie: `c` și primul număr după cele folosite. */
function idCota(cote: readonly Cota[]): string {
  let n = 0;
  for (const c of cote) {
    const m = /^c(\d+)$/.exec(c.id);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `c${n + 1}`;
}

/** Măsurile dintre două puncte (Măsoară, ADR 0330 §1): distanța, Δx, Δy, unghiul față de orizontală, ca text, după setări. */
function textMasura(a: Punct, b: Punct, s: SetariCote, virgula: boolean): string {
  const dx = b.x - a.x, dy = b.y - a.y;
  const parti: string[] = [];
  if (s.masurare.distanta) parti.push(t('editare.cote.masura.distanta', { v: textValoare(Math.hypot(dx, dy), virgula, 3) }));
  if (s.masurare.delta) parti.push(t('editare.cote.masura.dx', { v: textValoare(dx, virgula, 3) }), t('editare.cote.masura.dy', { v: textValoare(dy, virgula, 3) }));
  if (s.masurare.unghi && (dx !== 0 || dy !== 0)) parti.push(t('editare.cote.masura.unghi', { v: textValoare((Math.atan2(dy, dx) * 180) / Math.PI, virgula, 2) }));
  return parti.join(' · ');
}

export type CerereCote = { readonly mod: 'd' | 'm'; readonly n: number };

export function StratCote({ doc, indexFoaie, vedere, marime, zona, unealta, activ, loc, locJos, cerere, lipire, grila, virgula, onScrie, onUnealta, poateDublu }: {
  readonly doc: Document;
  readonly indexFoaie: number;
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
  /** Lista nouă a cotelor foii (acțiunea `foaie.cote`), cu verdictul ei. */
  readonly onScrie: (cote: readonly Cota[]) => RezultatActiune;
  readonly onUnealta: (u: 'cote' | 'selectie') => void;
  /** Dublul clic poate trece la Cote (nu e un desen Pen sau o tăiere începută). */
  readonly poateDublu: () => boolean;
}): ReactElement | null {
  const setari = useSetariCote();
  const foaie = doc.foi[indexFoaie];
  const cote = useMemo(() => foaie?.cote ?? [], [foaie]);
  const lume = useMemo(() => indexLume(doc, indexFoaie), [doc, indexFoaie]);
  const desenate = useMemo(() => cote.filter((c) => felCunoscut(c.fel) && Array.isArray(c.puncte))
    .map((c) => deseneaza(c, (c.puncte ?? []).map((a) => punctAncora(a, lume)), virgula)), [cote, lume, virgula]);
  // Lipirea și laturile, doar cu unealta aleasă (un import mare nu-și face indexul degeaba).
  const surse = useMemo(() => (unealta ? surseCote(doc, indexFoaie) : []), [unealta, doc, indexFoaie]);
  const fixe = useMemo(() => (foaie ? puncteFoaie(foaie.stoc.latime, foaie.stoc.inaltime) : []), [foaie]);

  const [fel, setFel] = useState<FelUnealta>(() => (cerere.mod === 'm' ? 'masoara' : felLaPornire(setariCote())));
  const [puse, setPuse] = useState<{ readonly capete: readonly Capat[]; readonly fix: FelLiniar | null }>({ capete: [], fix: null });
  const [tinta, setTinta] = useState<PunctTinta<LegaturaCota> | null>(null);
  const [cursor, setCursor] = useState<{ readonly p: Punct; readonly shift: boolean } | null>(null);
  const [masura, setMasura] = useState<{ readonly a: Capat; readonly b: Capat | null } | null>(null);
  const [aleasa, setAleasa] = useState<string | null>(null);
  const [trage, setTrage] = useState<{ readonly fel: 'capat'; readonly k: number; readonly c: Capat } | { readonly fel: 'linie'; readonly d: number } | null>(null);
  const [motiv, setMotiv] = useState<string | null>(null);
  const radacina = useRef<HTMLDivElement | null>(null);

  // D (felul de pornire, după setare) sau M (Măsoară): o cerere nouă a editorului.
  const ultimaCerere = useRef(cerere.n);
  useEffect(() => {
    if (cerere.n === ultimaCerere.current) return;
    ultimaCerere.current = cerere.n;
    setFel(cerere.mod === 'm' ? 'masoara' : felLaPornire(setariCote()));
    setPuse({ capete: [], fix: null });
    setMasura(null);
  }, [cerere]);
  // Fără unealtă: nimic început, nimic ales.
  useEffect(() => {
    if (unealta) return;
    setPuse({ capete: [], fix: null });
    setMasura(null);
    setAleasa(null);
    setTrage(null);
    setTinta(null);
    setCursor(null);
    setMotiv(null);
  }, [unealta]);
  // O cotă aleasă care nu mai e pe foaie (ștearsă, anulată) nu mai e aleasă.
  useEffect(() => {
    if (aleasa && !cote.some((c) => c.id === aleasa)) setAleasa(null);
  }, [cote, aleasa]);

  const acum = useRef({ cote, desenate, surse, fixe, vedere, setari, lipire, grila, fel, puse, masura, aleasa, unealta, activ, onScrie, onUnealta, poateDublu });
  acum.current = { cote, desenate, surse, fixe, vedere, setari, lipire, grila, fel, puse, masura, aleasa, unealta, activ, onScrie, onUnealta, poateDublu };

  useEffect(() => {
    const el = radacina.current;
    const panza = el?.closest('.panza-cutie')?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !panza) return undefined;
    let spatiu = false;
    type Tragere = { readonly fel: 'capat'; readonly k: number; readonly c: Capat } | { readonly fel: 'linie'; readonly d: number };
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
    /** Latura dreaptă de sub cursor (Automată): capetele ei, legate, sau null. */
    const laturaLa = (w: Punct): readonly [Capat, Capat] | null => {
      const s = acum.current, tol = TOLERANTA_PX / s.vedere.scara;
      let cel: { readonly a: Capat; readonly b: Capat; readonly d: number } | null = null;
      for (const sursa of s.surse) {
        const k = sursa.cutie;
        if (w.x < k.minX - tol || w.x > k.maxX + tol || w.y < k.minY - tol || w.y > k.maxY + tol || !sursa.contur) continue;
        const c = sursa.contur();
        const n = numarSegmente(c);
        for (let i = 0; i < n; i++) {
          const sg = segment(c, i);
          if (sg.s.tip === 'C' || (sg.s.tip === 'A' && Math.abs(sg.s.bulge) > 1e-12)) continue;
          const r = apropiat(c, i, w);
          if (r.d > tol || (cel && r.d >= cel.d)) continue;
          const pts = sursa.puncte();
          const v = (k2: number): PunctTinta<LegaturaCota> | undefined => pts.find((q) => q.fel === 'varf' && q.date?.loc.fel === 'varf' && q.date.loc.k === k2);
          const va = v(i), vb = v((i + 1) % c.varfuri.length);
          if (!va || !vb) continue;
          const leg = (q: PunctTinta<LegaturaCota>): Capat => ({ p: q.p, legatura: s.setari.comportament.legate ? q.date : null });
          cel = { a: leg(va), b: leg(vb), d: r.d };
        }
      }
      return cel ? [cel.a, cel.b] : null;
    };
    const scrie = (lista: readonly Cota[]): boolean => {
      const r = acum.current.onScrie(lista);
      if (!r.ok) setMotiv(t(r.motiv));
      else setMotiv(null);
      return r.ok;
    };
    const puneCota = (a: Capat, b: Capat, felCota: FelLiniar, d: number): void => {
      const s = acum.current;
      const noua: Cota = { id: idCota(s.cote), fel: felCota, puncte: [ancoraDin(a), ancoraDin(b)], linie: { d: rot(d) } };
      if (scrie([...s.cote, noua]) && s.setari.comportament.dupa === 'selectie') s.onUnealta('selectie');
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
      const n = s.puse.capete.length;
      if (n === 2) {
        const [a, b] = s.puse.capete;
        if (!a || !b) return;
        const felCota = s.puse.fix ?? (s.fel === 'automata' ? (e.shiftKey ? 'aliniata' : felAutomat(a.p, b.p, w)) : s.fel as FelLiniar);
        setPuse({ capete: [], fix: null });
        puneCota(a, b, felCota, distantaDinCursor(felCota, a.p, b.p, w));
        return;
      }
      if (n === 1) {
        const { c } = lipit(e);
        const a = s.puse.capete[0];
        if (a && Math.hypot(a.p.x - c.p.x, a.p.y - c.p.y) < 1e-9) return;
        setPuse({ capete: [...s.puse.capete, c], fix: s.puse.fix });
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
      if (s.fel === 'automata' && (!tl || tl.fel === 'contur' || tl.fel === 'grila')) {
        const l = laturaLa(w);
        if (l) {
          setPuse({ capete: l, fix: 'aliniata' });
          return;
        }
      }
      setPuse({ capete: [c], fix: null });
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
        } else if (esteLiniar(d.cota.fel)) {
          const [a, b] = d.puncte;
          if (a && b) apasat.tr = { fel: 'linie', d: distantaDinCursor(d.cota.fel, a.p, b.p, inLume(e)) };
        }
        setTrage(apasat.tr);
        return;
      }
      if (e.target !== panza) return;
      const r = lipit(e);
      setTinta(r.t);
      // Locul liniei de cotă urmează mausul liber; altfel cursorul lipit e capătul elastic al cotei începute sau al măsurii.
      setCursor({ p: s.fel !== 'masoara' && s.puse.capete.length === 2 ? inLume(e) : r.c.p, shift: e.shiftKey });
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
        scrie(s.cote.map((c) => (c.id === cota.id ? { ...c, linie: { ...c.linie, d: rot(tr.d) } } : c)));
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
        if (s.puse.capete.length > 0) { ia(); setPuse({ capete: [], fix: null }); return; }
        if (s.masura) { ia(); setMasura(null); return; }
        if (s.aleasa) { ia(); setAleasa(null); return; }
        return;
      }
      if (e.key === 'Enter' && s.masura?.b) {
        ia();
        const { a, b } = s.masura;
        setMasura(null);
        if (Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y) > 1e-9) puneCota(a, b, 'aliniata', DISTANTA_PUNERE);
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
      if (!d || !a || !b || !esteLiniar(cota.fel) || !cota.linie) return;
      // Pasul ca la forme: 1 mm, cu Shift 10, cu Alt 0,1; doar partea de pe normala cotei mută linia.
      const k = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      const p0 = { x: (a.p.x + b.p.x) / 2, y: (a.p.y + b.p.y) / 2 };
      const dd = distantaDinCursor(cota.fel, a.p, b.p, { x: p0.x + dir[0] * k, y: p0.y + dir[1] * k }) - distantaDinCursor(cota.fel, a.p, b.p, p0);
      if (Math.abs(dd) < 1e-12) return;
      scrie(s.cote.map((c) => (c.id === cota.id ? { ...c, linie: { ...cota.linie, d: rot((cota.linie?.d ?? 0) + dd) } } : c)));
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
  const pct = (q: Punct): string => `${sx(q.x)},${sy(q.y)}`;

  // Cotele de desenat: cele ale foii (cea trasă, cu schimbarea ei) și cea începută.
  const desene: Array<Desenata & { readonly cls: string }> = desenate.map((d) => {
    if (d.cota.id !== aleasa || !trage) return { ...d, cls: d.cota.id === aleasa ? 'aleasa' : '' };
    if (trage.fel === 'linie') {
      const c = { ...d.cota, linie: { ...d.cota.linie, d: trage.d } };
      return { ...deseneaza(c, d.puncte, virgula), cls: 'aleasa' };
    }
    const puncte = d.puncte.map((q, k) => (k === trage.k ? { p: trage.c.p, stare: trage.c.legatura ? 'legata' as const : 'libera' as const } : q));
    return { ...deseneaza(d.cota, puncte, virgula), cls: 'aleasa' };
  });
  let elastic: ReactElement | null = null;
  if (unealta && fel !== 'masoara' && puse.capete.length === 2 && cursor) {
    const [a, b] = puse.capete;
    if (a && b) {
      const f = puse.fix ?? (fel === 'automata' ? (cursor.shift ? 'aliniata' : felAutomat(a.p, b.p, cursor.p)) : fel);
      const c: Cota = { id: '-', fel: f, puncte: [ancoraDin(a), ancoraDin(b)], linie: { d: distantaDinCursor(f, a.p, b.p, cursor.p) } };
      desene.push({ ...deseneaza(c, [a, b].map((q) => ({ p: q.p, stare: 'libera' as const })), virgula), cls: 'noua' });
    }
  } else if (unealta && fel !== 'masoara' && puse.capete.length === 1 && cursor) {
    const a = puse.capete[0];
    if (a) elastic = <line className="cota-elastic" x1={sx(a.p.x)} y1={sy(a.p.y)} x2={sx(cursor.p.x)} y2={sy(cursor.p.y)} />;
  }
  // Măsura: de la primul punct la al doilea (sau la cursor), cu cifrele lângă capăt.
  const capatMasura = masura ? (masura.b?.p ?? cursor?.p ?? null) : null;
  const textM = masura && capatMasura ? textMasura(masura.a.p, capatMasura, setari, virgula) : null;
  const marcaj = unealta && tinta ? <Marcaj fel={tinta.fel} x={sx(tinta.p.x)} y={sy(tinta.p.y)} /> : null;
  const sfat = !unealta ? null : motiv ?? (fel === 'masoara' ? t('editare.cote.sfat.masoara')
    : puse.capete.length === 1 ? t('editare.cote.sfat.al-doilea') : puse.capete.length === 2 ? t('editare.cote.sfat.linia')
      : aleasa ? t('editare.cote.sfat.aleasa') : t('editare.cote.sfat.primul'));
  const alegeFel = (f: FelUnealta): void => {
    setFel(f);
    tineFel(f);
    setPuse({ capete: [], fix: null });
    setMasura(null);
  };

  return (
    <div className="strat-cote" ref={radacina} data-testid="strat-cote" data-fel={unealta ? fel : undefined} data-puse={puse.capete.length} data-aleasa={aleasa ?? undefined}>
      <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true">
        {desene.map((d) => {
          if (!d.desen) return null;
          const dc = d.desen, h = dc.text.inaltime * vedere.scara;
          const tp = { x: sx(dc.text.p.x), y: sy(dc.text.p.y) };
          return (
            <g key={d.cota.id} className={`cota${d.dezlegata ? ' cota-dezlegata' : ''}${d.cls ? ` cota-${d.cls}` : ''}`} data-cota={d.cota.id}
              data-fel={d.cota.fel} data-stare={d.dezlegata ? 'dezlegata' : 'legata'} data-valoare={d.valoare ?? undefined} data-text={d.text}>
              {dc.extensii.map((e, k) => <line key={k} x1={sx(e[0].x)} y1={sy(e[0].y)} x2={sx(e[1].x)} y2={sy(e[1].y)} />)}
              <line x1={sx(dc.linie[0].x)} y1={sy(dc.linie[0].y)} x2={sx(dc.linie[1].x)} y2={sy(dc.linie[1].y)} />
              {dc.capete.map((c, k) => <polygon key={k} className="cota-capat" points={c.map(pct).join(' ')} />)}
              {h >= CIFRE_MINIM_PX ? (
                <text x={tp.x} y={tp.y} fontSize={h} textAnchor="middle" transform={`rotate(${-dc.text.unghi} ${tp.x} ${tp.y})`}>{d.text}</text>
              ) : <title>{d.text}</title>}
              {d.cls === 'aleasa' ? d.puncte.map((q, k) => (
                <circle key={`m${k}`} className={`cota-maner${q.stare === 'dezlegata' ? ' cota-maner-dezlegat' : ''}`} data-maner={k} cx={sx(q.p.x)} cy={sy(q.p.y)} r={4} />
              )) : null}
            </g>
          );
        })}
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
                const noua: Cota = { id: idCota(cote), fel: 'aliniata', puncte: [ancoraDin(m.a), ancoraDin(m.b)], linie: { d: DISTANTA_PUNERE } };
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
    masoara: 'M1.5 10.5 L10.5 1.5 L14.5 5.5 L5.5 14.5 Z M4 8 L5.5 9.5 M6 6 L8 8 M8 4 L9.5 5.5',
  };
  return (
    <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path className="contur" d={d[f]} />
    </svg>
  );
}
