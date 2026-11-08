/**
 * Unealta Cuțit (ADR 0181 §1; felia 10.3↑f): bara ei (felurile Linie, Pen, Liber și Formă; „Închide bucățile”, aceeași bifă ca
 * în panoul Taie), urma de pe pânză cu locurile unde taie, formele adunate în cuțit și tăierea la capătul gestului (răspunsul
 * 3a): calculată de workerul CAM pe documentul de atunci și aplicată prin `document.taie`, într-un pas de anulare. Taie
 * formele alese, sau, fără alegere, toate formele foii (răspunsul 2a); cuțitul tras nu intră în document, iar formele-cuțit
 * rămân. Vine la cerere, în bucata tăierii, la prima alegere a uneltei.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { Zona } from '../canvas/Rigle.tsx';
import type { GestDesen, LinieGhid, Vedere } from '../canvas/protocol.ts';
import { puncteContur } from '../extensii/formeSelectie.ts';
import type { lipeste } from '../geom/lipire.ts';
import { t } from '../i18n/t.ts';
import { instantaLa } from '../model/alegere.ts';
import type { Document } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';
import type { Cutit } from '../model/taiere.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { TaiereCalculata } from '../ui/actiuniDocument.ts';
import { adaugaLaUrma, caleCutit, caleDinPen, cutiePuncte, esteModCutit, locuriAproximative, MODURI_CUTIT, tinteCutit, type ModCutit, type Polilinie } from './cutitCalcul.ts';
import { capatConstrans, type FormaDesenata } from './desenCalcul.ts';
import { citesteInchide, scrieInchide } from './inchidereTaiere.ts';
import { drumSvg } from './noduriCalcul.ts';

type Punct = { readonly x: number; readonly y: number };
type Urma = { readonly fel: 'linie'; readonly a: Punct; readonly b: Punct } | { readonly fel: 'liber'; readonly puncte: readonly Punct[] };
type Stare = { readonly fel: 'calcul' } | { readonly fel: 'gata'; readonly text: string; readonly rau: boolean };

/** Felul ales se ține în browser, ca bifa închiderii. */
const CHEIE_MOD = 'cncvs2.cutit-mod';
/** Un gest mai scurt de atâția pixeli nu taie; o tragere mai scurtă e un clic (felul Formă). */
const MINIM_PX = 3;
/** Cât de departe de contur prinde clicul felului Formă (ca alegerea, `TOLERANTA_CLIC_PX` din editare). */
const TOLERANTA_CLIC_PX = 4;
/** Peste atâtea puncte ale formelor de tăiat, locurile nu se mai arată cât tragi (doar urma). */
const PLAFON_PUNCTE = 200_000;

function citesteMod(): ModCutit {
  try {
    const m = localStorage.getItem(CHEIE_MOD);
    return esteModCutit(m) ? m : 'linie';
  } catch {
    return 'linie';
  }
}
function scrieMod(m: ModCutit): void {
  try {
    localStorage.setItem(CHEIE_MOD, m);
  } catch {
    // Fără stocare: felul ține doar cât pagina.
  }
}

export function UnealtaCutit({ doc, selectie, vedere, marime, zona, loc, onGest, onTaie, lipire, onLinii, pen }: {
  readonly doc: Document;
  /** Selecția aplicației: id-urile instanțelor. */
  readonly selectie: readonly string[];
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
  readonly zona: Zona;
  /** Locul barei uneltei, în bara de sus (un portal), sau nimic. */
  readonly loc: HTMLElement | null;
  /** Gestul pânzei (Linie, Liber, Formă), sau null (Pen-ul are gestul lui). */
  readonly onGest: (g: GestDesen | null) => void;
  /** Aplică o tăiere calculată (acțiunea `document.taie`), cu verdictul ei. */
  readonly onTaie: (r: TaiereCalculata) => RezultatActiune;
  /** Lipirea desenului (Alt o inversează): funcția ei, sau null când e oprită. */
  readonly lipire: (alt: boolean) => ((p: Punct) => ReturnType<typeof lipeste>) | null;
  readonly onLinii: (l: readonly LinieGhid[]) => void;
  /** Unealta Pen a editării, care termină aici în loc să deseneze. */
  readonly pen: (o: { readonly termina: (f: FormaDesenata) => void; readonly sfat: string }) => ReactElement;
}): ReactElement {
  const [mod, setMod] = useState<ModCutit>(citesteMod);
  const [inchide, setInchide] = useState(citesteInchide);
  const [urma, setUrma] = useState<Urma | null>(null);
  // Formele adunate în cuțit cu Shift + clic (felul Formă).
  const [forme, setForme] = useState<readonly string[]>([]);
  const [stare, setStare] = useState<Stare | null>(null);
  const semnal = useRef<AbortController | null>(null);
  useEffect(() => () => { semnal.current?.abort(); }, []);
  // O formă adunată care nu mai e pe foaie (ștearsă, anulată) iese din cuțit.
  useEffect(() => {
    const pe = new Set((doc.foi[0]?.instante ?? []).map((i) => i.id));
    setForme((f) => (f.every((id) => pe.has(id)) ? f : f.filter((id) => pe.has(id))));
  }, [doc]);

  /** Tăierea, calculată de worker pe documentul de acum; aplicată prin acțiunea documentului. Un eșec (nu o anulare) merge în jurnal. */
  const taie = (cutit: Cutit, cutitIds: readonly string[]): void => {
    const laCerere = doc;
    const alese = tinteCutit(laCerere, selectie, cutitIds);
    if (alese.length === 0) {
      setStare({ fel: 'gata', text: t('editare.cutit.nimic-de-taiat'), rau: true });
      return;
    }
    const s = new AbortController();
    semnal.current?.abort();
    semnal.current = s;
    setStare({ fel: 'calcul' });
    const cade = (e: unknown): void => {
      if (s.signal.aborted) return;
      reportError(new Error(`cuțitul: ${e instanceof Error ? e.message : String(e)}`));
      setStare({ fel: 'gata', text: t('editare.taiere.eroare'), rau: true });
    };
    import('../ui/actiuniExportCalcul.ts').then((calc) => {
      if (s.signal.aborted) return;
      calc.taieVectorii(laCerere, { cutit, alese, inchide }, s.signal).then((r) => {
        if (s.signal.aborted) return;
        if (!r.ok) {
          setStare({ fel: 'gata', text: t(`editare.taiere.motiv.${r.motiv}`), rau: true });
          return;
        }
        const v = onTaie({ doc: laCerere, degrupate: r.degrupate, ids: r.ids, sterse: r.sterse });
        const parti = String(r.ids.length);
        const text = r.scoase > 0
          ? t('editare.taiere.gata-scoase', { n: String(r.forme), parti, s: String(r.scoase) })
          : t('editare.taiere.gata', { n: String(r.forme), parti });
        setStare(v.ok ? { fel: 'gata', text, rau: false } : { fel: 'gata', text: t(v.motiv), rau: true });
      }, (e: unknown) => { if (!(e instanceof calc.CalculAnulat)) cade(e); });
    }, cade);
  };

  // Gestul pânzei citește starea de acum de aici (fără închideri vechi).
  const acum = useRef({ mod, forme, doc, lipire, onLinii, taie });
  acum.current = { mod, forme, doc, lipire, onLinii, taie };
  const [gest] = useState(() => {
    let a: Punct | null = null;
    let start: Punct | null = null;
    let puncte: Punct[] = [];
    const g: GestDesen = (faza, x, y, scara, m) => {
      const s = acum.current;
      if (faza === 'anulat') {
        a = null;
        puncte = [];
        setUrma(null);
        s.onLinii([]);
        return;
      }
      // Un punct nelipit vine din pixelii mausului: se rotunjește la 0,001 mm; unul lipit stă exact pe țintă (ca la desen).
      const rot = (v: number): number => Math.round(v * 1000) / 1000;
      let q: Punct = { x: rot(x), y: rot(y) };
      let linii: readonly LinieGhid[] = [];
      if (s.mod === 'linie') {
        const l = s.lipire(m.alt);
        const r = l ? l({ x, y }) : null;
        if (r && r.linii.length > 0) {
          linii = r.linii;
          q = { x: r.linii.some((v) => v.axa === 'x') ? x + r.dx : rot(x), y: r.linii.some((v) => v.axa === 'y') ? y + r.dy : rot(y) };
        }
      }
      if (faza === 'start') {
        a = q;
        start = { x, y };
        puncte = [q];
        setStare(null);
        if (s.mod === 'linie') setUrma({ fel: 'linie', a: q, b: q });
        else if (s.mod === 'liber') setUrma({ fel: 'liber', puncte });
        s.onLinii(linii);
        return;
      }
      const a0 = a;
      if (!a0) return;
      if (s.mod === 'linie') {
        const b = capatConstrans('linie', a0, q, m.shift);
        if (faza === 'misca') {
          setUrma({ fel: 'linie', a: a0, b });
          s.onLinii(linii);
          return;
        }
        a = null;
        setUrma(null);
        s.onLinii([]);
        const cale = caleCutit([a0, b], MINIM_PX / scara);
        if (cale) s.taie({ fel: 'cale', cale }, []);
        return;
      }
      if (s.mod === 'liber') {
        puncte = adaugaLaUrma(puncte, q, 1 / scara);
        if (faza === 'misca') {
          setUrma({ fel: 'liber', puncte });
          return;
        }
        a = null;
        setUrma(null);
        const cale = caleCutit(puncte, MINIM_PX / scara);
        // Urma mâinii se netezește la o jumătate de pixel al vederii: mai fin la zoom mare.
        if (cale) s.taie({ fel: 'cale', cale, netezire: 0.5 / scara }, []);
        return;
      }
      // Felul Formă: un clic (fără tragere) pe o formă existentă.
      if (faza === 'misca') return;
      a = null;
      const s0 = start;
      if (!s0 || Math.hypot(x - s0.x, y - s0.y) * scara > MINIM_PX) return;
      const id = instantaLa(s.doc, x, y, TOLERANTA_CLIC_PX / scara);
      if (!id) {
        setStare({ fel: 'gata', text: t('editare.cutit.nimic-sub'), rau: true });
        return;
      }
      if (m.shift) {
        setForme((f) => (f.includes(id) ? f.filter((z) => z !== id) : [...f, id]));
        return;
      }
      const ids = s.forme.includes(id) ? s.forme : [...s.forme, id];
      setForme([]);
      s.taie({ fel: 'forme', ids }, ids);
    };
    return g;
  });
  useEffect(() => {
    onGest(mod === 'pen' ? null : gest);
  }, [mod, gest, onGest]);
  useEffect(() => () => { onGest(null); }, [onGest]);

  // Felul Formă: Enter taie cu formele adunate, Esc le lasă (doar cât sunt; altfel tastele sunt ale editării).
  useEffect(() => {
    if (mod !== 'forma') return undefined;
    const tasta = (e: KeyboardEvent): void => {
      const s = acum.current;
      if (s.forme.length === 0 || (e.key !== 'Enter' && e.key !== 'Escape')) return;
      const tinta = e.target;
      if (tinta instanceof Element && tinta.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], dialog') !== null) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const ids = s.forme;
      setForme([]);
      if (e.key === 'Enter') s.taie({ fel: 'forme', ids }, ids);
    };
    window.addEventListener('keydown', tasta, true);
    return () => { window.removeEventListener('keydown', tasta, true); };
  }, [mod]);

  // Formele de tăiat, ca polilinii, pentru locurile arătate cât tragi (doar la Linie și Liber; peste plafon, doar urma).
  const tinte = useMemo((): Polilinie[] | null => {
    if (mod !== 'linie' && mod !== 'liber') return null;
    const ids = new Set(tinteCutit(doc, selectie, []));
    const rez: Polilinie[] = [];
    let n = 0;
    for (const e of elementeFoaie(doc, 0)) {
      if (!ids.has(e.instanta)) continue;
      const c = conturElement(e);
      const p = puncteContur(c, 0.05).map(([x, y]) => ({ x, y }));
      n += p.length;
      if (n > PLAFON_PUNCTE) return null;
      if (p.length >= 2) rez.push({ puncte: p, inchis: c.inchis, cutie: cutiePuncte(p) });
    }
    return rez;
  }, [doc, selectie, mod]);
  const locuri = useMemo(() => (urma && tinte ? locuriAproximative(urma.fel === 'linie' ? [urma.a, urma.b] : urma.puncte, tinte) : []), [urma, tinte]);
  // Formele adunate în cuțit, conturate pe pânză.
  const adunate = useMemo(() => {
    if (forme.length === 0) return [];
    const ids = new Set(forme);
    return elementeFoaie(doc, 0).filter((e) => ids.has(e.instanta)).map((e) => drumSvg(conturElement(e), vedere));
  }, [forme, doc, vedere]);

  const sfat = stare?.fel === 'gata' ? stare.text
    : stare?.fel === 'calcul' ? t('editare.cutit.calcul')
      : mod === 'forma' && forme.length > 0 ? t('editare.cutit.sfat.adunate', { n: String(forme.length) })
        : t(`editare.cutit.sfat.${mod}`);
  const sx = (x: number): number => vedere.tx + x * vedere.scara;
  const sy = (y: number): number => vedere.ty - y * vedere.scara;

  const bara = (
    <span className="bara-cutit" role="group" aria-label={t('editare.cutit.felul')} data-testid="bara-cutit">
      {MODURI_CUTIT.map((m) => (
        <button key={m} type="button" className="aliniaza" aria-pressed={mod === m} data-cutit={m} title={t(`editare.cutit.${m}`)} aria-label={t(`editare.cutit.${m}`)}
          onClick={() => { setMod(m); scrieMod(m); setUrma(null); setForme([]); setStare(null); }}>
          <IconaMod m={m} />
        </button>
      ))}
      <label className="cutit-inchide" title={t('editare.cutit.inchide-sfat')}>
        <input type="checkbox" checked={inchide} data-cutit="inchide" onChange={(e) => { setInchide(e.target.checked); scrieInchide(e.target.checked); }} />
        {t('editare.cutit.inchide')}
      </label>
    </span>
  );

  return (
    <>
      {loc ? createPortal(bara, loc) : null}
      {mod === 'pen' ? pen({ termina: (f) => { const c = caleDinPen(f); if (c) taie({ fel: 'cale', cale: c }, []); }, sfat }) : (
        <div className="cutit" data-testid="cutit" data-mod={mod} data-locuri={locuri.length} data-adunate={forme.length}>
          <svg className="rigle-desen urma-cutit" width={marime.latime} height={marime.inaltime} aria-hidden="true">
            {urma?.fel === 'linie' ? <line x1={sx(urma.a.x)} y1={sy(urma.a.y)} x2={sx(urma.b.x)} y2={sy(urma.b.y)} /> : null}
            {urma?.fel === 'liber' ? <polyline points={urma.puncte.map((q) => `${sx(q.x)},${sy(q.y)}`).join(' ')} /> : null}
            {adunate.map((d, i) => <path key={i} d={d} />)}
            {locuri.map((q, i) => <circle key={i} className="loc-taiere" cx={sx(q.x)} cy={sy(q.y)} r={3.5} />)}
          </svg>
          <span className={stare?.fel === 'gata' && stare.rau ? 'cip cip-rosu noduri-sfat' : 'cip noduri-sfat'} role="status" data-testid="cutit-sfat"
            style={{ left: zona.x + 8, top: zona.y + zona.h - 44 }}>{sfat}</span>
        </div>
      )}
    </>
  );
}

/** Iconițele felurilor: linia cu capetele ei, curba Pen-ului cu un nod, urma mâinii, un „T” punctat (o formă existentă). */
function IconaMod({ m }: { readonly m: ModCutit }): ReactElement {
  const desen: Record<ModCutit, ReactElement> = {
    linie: (
      <>
        <path className="contur" d="M2.5 13 L13.5 3" />
        <circle cx="2.5" cy="13" r="1.5" /><circle cx="13.5" cy="3" r="1.5" />
      </>
    ),
    pen: (
      <>
        <path className="contur" d="M2 12.5 C5 2.5 11 2.5 14 12.5" />
        <rect x="6.5" y="3" width="3" height="3" />
      </>
    ),
    liber: <path className="contur" d="M1.5 10 C3 6 5 13 7 9 S10 4 11.5 8 S13.5 11 14.5 7" />,
    forma: <path className="contur" d="M3 4 H13 M8 4 V13.5" strokeDasharray="2 1.5" />,
  };
  return <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{desen[m]}</svg>;
}
