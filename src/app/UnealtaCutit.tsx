/**
 * Unealta Cuțit (ADR 0181 §1; felia 10.3↑f): bara ei (felurile Linie, Pen, Liber și Formă; „Închide bucățile”, aceeași bifă ca
 * în panoul Taie), urma de pe pânză cu locurile unde taie, formele adunate în cuțit și tăierea la capătul gestului (răspunsul
 * 3a): calculată de workerul CAM pe documentul de atunci și aplicată prin `document.taie`, într-un pas de anulare. Taie
 * formele alese, sau, fără alegere, toate formele foii (răspunsul 2a); cuțitul tras nu intră în document, iar formele-cuțit
 * rămân. Vine la cerere, în bucata tăierii, la prima alegere a uneltei.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react';
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
import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { TaiereCalculata } from '../ui/actiuniDocument.ts';
import {
  adaugaLaUrma, bucataSub, caleCutit, caleDinPen, conturAproximat, cuPrelungiri, cutiePuncte, esteModCutit, locuriAproximative, locuriComune,
  MODURI_CUTIT, poligonSters, prelungiriAproximative, regiuniAtinse, selectieDupa, subPolilinie, tinteCutit, type ConturAproximat, type ModCutit,
  type Polilinie, type RegiuneAproximativa,
} from './cutitCalcul.ts';
import { capatConstrans, type FormaDesenata } from './desenCalcul.ts';
import { GrupuriTaiere } from './GrupuriTaiere.tsx';
import { useInFereastra } from './inFereastra.ts';
import { drumSvg } from './noduriCalcul.ts';
import { schimbaOptiuniTaiere, useOptiuniTaiere } from './optiuniTaiere.ts';

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
  // Opțiunile tăierii (ADR 0181 §2), aceleași ca în panoul Taie: închiderea, prelungirea, partea păstrată, cuțitul șters.
  const optiuni = useOptiuniTaiere();
  // Opțiunile din bara cuțitului: un panou sub butonul lor, ca panourile extensiei (bara de sus n-are loc de ele pe un rând).
  const [optiuniDeschise, setOptiuniDeschise] = useState(false);
  const panouOptiuni = useRef<HTMLDivElement | null>(null);
  useInFereastra(panouOptiuni);
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
    const laCerere = doc, alegerea = selectie;
    const alese = tinteCutit(laCerere, alegerea, cutitIds);
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
    // Opțiunile din clipa tăierii; foarfeca și retezatul nu le folosesc (modelul le lasă deoparte).
    const o = optiuni;
    import('../ui/actiuniExportCalcul.ts').then((calc) => {
      if (s.signal.aborted) return;
      calc.taieVectorii(laCerere, { cutit, alese, inchide: o.inchide, prelungeste: o.prelungeste, pastreaza: o.pastreaza, stergeCutitul: o.stergeCutitul }, s.signal).then((r) => {
        if (s.signal.aborted) return;
        if (!r.ok) {
          setStare({ fel: 'gata', text: t(`editare.taiere.motiv.${r.motiv}`), rau: true });
          return;
        }
        // Selecția rămâne cum era (fără nimic ales, tot nimic): tăieturile următoare au aceleași forme.
        const v = onTaie({ doc: laCerere, degrupate: r.degrupate, ids: selectieDupa(alegerea, r.degrupate, r.sterse), sterse: r.sterse });
        const parti = String(r.ids.length);
        const text = cutit.fel === 'reteaza'
          ? (r.ids.length === 0 ? t('editare.cutit.retezat-tot') : t('editare.cutit.retezat'))
          : r.scoase > 0
            ? t('editare.cutit.gata-scoase', { n: String(r.forme), parti, s: String(r.scoase) })
            : t('editare.cutit.gata', { n: String(r.forme), parti });
        const sters = cutitIds.length > 0 && cutitIds.every((id) => r.sterse.includes(id)) ? ` ${t('editare.taiere.cutit-sters')}` : '';
        setStare(v.ok ? { fel: 'gata', text: text + sters, rau: false } : { fel: 'gata', text: t(v.motiv), rau: true });
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
        const b = capatConstrans('linie', a0, q, m);
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
      // Felurile Formă, Foarfecă și Retează: un clic (fără tragere) pe o formă.
      if (faza === 'misca') return;
      a = null;
      const s0 = start;
      if (!s0 || Math.hypot(x - s0.x, y - s0.y) * scara > MINIM_PX) return;
      const id = instantaLa(s.doc, x, y, TOLERANTA_CLIC_PX / scara);
      if (!id) {
        setStare({ fel: 'gata', text: t('editare.cutit.nimic-sub'), rau: true });
        return;
      }
      if (s.mod === 'foarfeca' || s.mod === 'reteaza') {
        // Locul exact (nodul de lângă clic, sau piciorul pe latură) îl caută workerul, pe conturul formei de sub clic.
        s.taie({ fel: s.mod, id, punct: { x, y }, toleranta: TOLERANTA_CLIC_PX / scara }, []);
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

  // Formele de tăiat (doar la Linie și Liber; peste plafon, doar urma): contururile ca polilinii, pentru locurile arătate cât
  // tragi, și regiunile lor (contururile închise ale fiecărei forme), pentru prelungirea capetelor și partea care pleacă.
  const deTaiat = useMemo((): { readonly tinte: Polilinie[]; readonly regiuni: RegiuneAproximativa[]; readonly cutie: Cutie } | null => {
    if (mod !== 'linie' && mod !== 'liber') return null;
    const ids = new Set(tinteCutit(doc, selectie, []));
    const tinte: Polilinie[] = [];
    const peForma = new Map<string, Polilinie[]>();
    let cutie: Cutie = CUTIE_GOALA;
    let n = 0;
    for (const e of elementeFoaie(doc, 0)) {
      if (!ids.has(e.instanta)) continue;
      const c = conturElement(e);
      const p = puncteContur(c, 0.05).map(([x, y]) => ({ x, y }));
      n += p.length;
      if (n > PLAFON_PUNCTE) return null;
      if (p.length < 2) continue;
      const pl: Polilinie = { puncte: p, inchis: c.inchis, cutie: cutiePuncte(p) };
      tinte.push(pl);
      cutie = uneste(cutie, pl.cutie);
      if (c.inchis) peForma.set(e.instanta, [...(peForma.get(e.instanta) ?? []), pl]);
    }
    const regiuni = [...peForma].map(([instanta, contururi]) => ({ instanta, contururi, cutie: contururi.reduce((u, c) => uneste(u, c.cutie), CUTIE_GOALA) }));
    return { tinte, regiuni, cutie };
  }, [doc, selectie, mod]);
  // Cât tragi (ADR 0181 §2): capetele prelungite (punctate), locurile unde taie calea prelungită și, cu „Păstrează”, partea
  // care pleacă, estompată peste formele pe care cuțitul le împarte (cele pe care nu le atinge rămân).
  const arata = useMemo(() => {
    if (!urma || !deTaiat) return null;
    const puncte = urma.fel === 'linie' ? [urma.a, urma.b] : urma.puncte;
    if (puncte.length < 2) return null;
    const prelungiri = prelungiriAproximative(puncte, optiuni.prelungeste, deTaiat.regiuni, deTaiat.cutie);
    const cale = cuPrelungiri(puncte, prelungiri);
    let sters: { readonly poligoane: ReadonlyArray<readonly Punct[]>; readonly atinse: readonly RegiuneAproximativa[] } | null = null;
    if (optiuni.pastreaza !== 'ambele') {
      const atinse = regiuniAtinse(cale, false, deTaiat.regiuni);
      const poligoane = poligonSters(cale, false, optiuni.pastreaza, (2 * Math.hypot(marime.latime, marime.inaltime)) / vedere.scara);
      if (atinse.length > 0 && poligoane) sters = { poligoane, atinse };
    }
    return { prelungiri, locuri: locuriAproximative(cale, deTaiat.tinte), sters };
  }, [urma, deTaiat, optiuni.prelungeste, optiuni.pastreaza, marime.latime, marime.inaltime, vedere.scara]);
  const locuri = arata?.locuri ?? [];
  const idTaieturi = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // Formele adunate în cuțit, conturate pe pânză.
  const adunate = useMemo(() => {
    if (forme.length === 0) return [];
    const ids = new Set(forme);
    return elementeFoaie(doc, 0).filter((e) => ids.has(e.instanta)).map((e) => drumSvg(conturElement(e), vedere));
  }, [forme, doc, vedere]);

  // Retează: contururile tuturor formelor foii (sub clic poate fi oricare, chiar nealeasă) și locurile lor comune cu partenerii
  // (formele alese, fără alegere toate ale foii, și aceeași formă), aproximate, pentru bucata arătată sub maus; peste plafon,
  // doar clicul (tăierea e tot exactă, a workerului).
  const retezare = useMemo((): { readonly forme: ConturAproximat[]; readonly locuri: number[][] } | null => {
    if (mod !== 'reteaza') return null;
    const parteneri = new Set(tinteCutit(doc, selectie, []));
    const forme: ConturAproximat[] = [];
    let n = 0;
    for (const e of elementeFoaie(doc, 0)) {
      const c = conturElement(e);
      const p = puncteContur(c, 0.05).map(([x, y]) => ({ x, y }));
      n += p.length;
      if (n > PLAFON_PUNCTE) return null;
      if (p.length >= 2) forme.push(conturAproximat(p, c.inchis, e.instanta));
    }
    const locuri = locuriComune(forme, undefined, parteneri);
    return locuri ? { forme, locuri } : null;
  }, [doc, selectie, mod]);
  const [marcaj, setMarcaj] = useState<readonly Punct[] | null>(null);
  const radacina = useRef<HTMLDivElement | null>(null);
  const acumRetezare = useRef({ retezare, vedere });
  acumRetezare.current = { retezare, vedere };
  useEffect(() => {
    if (mod !== 'reteaza') { setMarcaj(null); return undefined; }
    let cadru = 0;
    const misca = (e: PointerEvent): void => {
      const el = radacina.current;
      if (!el || cadru) return;
      const cx = e.clientX, cy = e.clientY;
      cadru = requestAnimationFrame(() => {
        cadru = 0;
        const { retezare: r, vedere: v } = acumRetezare.current;
        const box = el.getBoundingClientRect();
        if (!r || cx < box.left || cx > box.right || cy < box.top || cy > box.bottom) { setMarcaj(null); return; }
        const q = { x: (cx - box.left - v.tx) / v.scara, y: (v.ty - (cy - box.top)) / v.scara };
        const b = bucataSub(r.forme, r.locuri, q, TOLERANTA_CLIC_PX / v.scara);
        setMarcaj(b ? subPolilinie(r.forme[b.i] as ConturAproximat, b.de, b.pana) : null);
      });
    };
    window.addEventListener('pointermove', misca, true);
    return () => { window.removeEventListener('pointermove', misca, true); if (cadru) cancelAnimationFrame(cadru); };
  }, [mod]);
  // Documentul s-a schimbat (o bucată scoasă): marcajul vechi nu mai e al lui.
  useEffect(() => { setMarcaj(null); }, [doc]);

  const cuOptiuni = mod === 'linie' || mod === 'pen' || mod === 'liber' || mod === 'forma';
  // Opțiunile care nu sunt cele implicite se spun în sfat și se semnalează pe butonul lor: „Păstrează” șterge ceva.
  const activeOptiuni: string[] = [];
  if (cuOptiuni && optiuni.pastreaza !== 'ambele') {
    const parte = mod === 'forma' ? (optiuni.pastreaza === 'stanga' ? 'inauntru' : 'afara') : optiuni.pastreaza;
    activeOptiuni.push(t('editare.cutit.activ.pastreaza', { parte: t(`editare.taiere.parte.${parte}`) }));
  }
  if (cuOptiuni && optiuni.prelungeste !== 'nu') activeOptiuni.push(t('editare.cutit.activ.prelungeste', { cum: t(`editare.taiere.prelungeste.${optiuni.prelungeste}`) }));
  if (mod === 'forma' && optiuni.stergeCutitul) activeOptiuni.push(t('editare.cutit.activ.sterge'));
  const cuActive = (text: string): string => (activeOptiuni.length > 0 ? `${text} ${t('editare.cutit.activ', { lista: activeOptiuni.join('; ') })}` : text);
  const sfat = stare?.fel === 'gata' ? stare.text
    : stare?.fel === 'calcul' ? t('editare.cutit.calcul')
      : mod === 'forma' && forme.length > 0 ? cuActive(t('editare.cutit.sfat.adunate', { n: String(forme.length) }))
        : cuActive(t(`editare.cutit.sfat.${mod}`));
  const sx = (x: number): number => vedere.tx + x * vedere.scara;
  const sy = (y: number): number => vedere.ty - y * vedere.scara;
  /** Poligoanele, ca drum SVG pe pânză (fiecare închis). */
  const drum = (ps: ReadonlyArray<readonly Punct[]>): string => ps.map((p) => `M${p.map((q) => `${sx(q.x)} ${sy(q.y)}`).join('L')}Z`).join('');
  const sters = arata?.sters ?? null;

  const bara = (
    <span className="bara-cutit" role="group" aria-label={t('editare.cutit.felul')} data-testid="bara-cutit">
      {MODURI_CUTIT.map((m) => (
        <button key={m} type="button" className="aliniaza" aria-pressed={mod === m} data-cutit={m} title={t(`editare.cutit.${m}`)} aria-label={t(`editare.cutit.${m}`)}
          onClick={() => { setMod(m); scrieMod(m); setUrma(null); setForme([]); setStare(null); }}>
          <IconaMod m={m} />
        </button>
      ))}
      <label className="cutit-inchide" title={t('editare.cutit.inchide-sfat')}>
        <input type="checkbox" checked={optiuni.inchide} data-cutit="inchide" onChange={(e) => { schimbaOptiuniTaiere({ inchide: e.target.checked }); }} />
        {t('editare.cutit.inchide')}
      </label>
      {cuOptiuni ? (
        <span className="optiuni-cutit">
          <button type="button" className="aliniaza" aria-expanded={optiuniDeschise} aria-controls="optiuni-cutit" title={t('editare.cutit.optiuni')}
            aria-label={t('editare.cutit.optiuni')} data-cutit="optiuni" data-activ={activeOptiuni.length > 0 ? '1' : '0'}
            onClick={() => { setOptiuniDeschise(!optiuniDeschise); }}>
            <IconaOptiuni />
          </button>
          {optiuniDeschise ? (
            <div className="insula panou-retea panou-optiuni-cutit" id="optiuni-cutit" ref={panouOptiuni} role="group" aria-label={t('editare.cutit.optiuni')}
              data-testid="optiuni-cutit" onKeyDown={(e) => {
                if (e.key !== 'Escape') return;
                e.preventDefault();
                e.stopPropagation();
                setOptiuniDeschise(false);
              }}>
              {/* La felul Formă, cuțitul e de obicei închis (un text, un cerc): stânga e înăuntru, dreapta în afară. */}
              <GrupuriTaiere loc="cutit" parti={mod === 'forma' ? ['inauntru', 'afara'] : ['stanga', 'dreapta']} cuCapete />
              {mod === 'forma' ? (
                <label className="bifa-taiere" title={t('editare.cutit.sterge-sfat')}>
                  <input type="checkbox" checked={optiuni.stergeCutitul} data-cutit="sterge" onChange={(e) => { schimbaOptiuniTaiere({ stergeCutitul: e.target.checked }); }} />
                  <span>{t('editare.cutit.sterge')}</span>
                </label>
              ) : null}
            </div>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  return (
    <>
      {loc ? createPortal(bara, loc) : null}
      {mod === 'pen' ? pen({ termina: (f) => { const c = caleDinPen(f); if (c) taie({ fel: 'cale', cale: c }, []); }, sfat }) : (
        <div className="cutit" ref={radacina} data-testid="cutit" data-mod={mod} data-locuri={locuri.length} data-adunate={forme.length}
          data-marcaj={marcaj ? marcaj.length : 0} data-prelungiri={arata?.prelungiri.length ?? 0} data-estompate={sters?.atinse.length ?? 0}>
          <svg className="rigle-desen urma-cutit" width={marime.latime} height={marime.inaltime} aria-hidden="true">
            {sters ? (
              <g className="parte-stearsa">
                <defs>
                  {sters.atinse.map((r, i) => (
                    <clipPath key={r.instanta} id={`${idTaieturi}-${i}`} clipPathUnits="userSpaceOnUse">
                      <path d={drum(r.contururi.map((c) => c.puncte))} clipRule="evenodd" />
                    </clipPath>
                  ))}
                </defs>
                {sters.atinse.map((r, i) => (
                  <g key={r.instanta} clipPath={`url(#${idTaieturi}-${i})`}>
                    <path className="estompare" d={drum(sters.poligoane)} fillRule="evenodd" />
                    <path className="tenta" d={drum(sters.poligoane)} fillRule="evenodd" />
                  </g>
                ))}
              </g>
            ) : null}
            {arata?.prelungiri.map(([de, pana], i) => <line key={`p${i}`} className="prelungire-cutit" x1={sx(de.x)} y1={sy(de.y)} x2={sx(pana.x)} y2={sy(pana.y)} />)}
            {urma?.fel === 'linie' ? <line x1={sx(urma.a.x)} y1={sy(urma.a.y)} x2={sx(urma.b.x)} y2={sy(urma.b.y)} /> : null}
            {urma?.fel === 'liber' ? <polyline points={urma.puncte.map((q) => `${sx(q.x)},${sy(q.y)}`).join(' ')} /> : null}
            {adunate.map((d, i) => <path key={i} d={d} />)}
            {marcaj ? <polyline className="bucata-reteaza" points={marcaj.map((q) => `${sx(q.x)},${sy(q.y)}`).join(' ')} /> : null}
            {locuri.map((q, i) => <circle key={i} className="loc-taiere" cx={sx(q.x)} cy={sy(q.y)} r={3.5} />)}
          </svg>
          {/* Sfatul se rupe pe rânduri (cele ale felurilor trec de un rând); marginea lui de jos stă la 16 px de capătul pânzei. */}
          <span className={stare?.fel === 'gata' && stare.rau ? 'cip cip-rosu noduri-sfat cutit-sfat' : 'cip noduri-sfat cutit-sfat'} role="status"
            data-testid="cutit-sfat" style={{ left: zona.x + 8, top: zona.y + zona.h - 16 }}>{sfat}</span>
        </div>
      )}
    </>
  );
}

/** Opțiunile tăierii (ADR 0181 §2): trei glisoare, ca la proprietăți. */
function IconaOptiuni(): ReactElement {
  return (
    <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path className="contur" d="M1.5 4h13M1.5 8h13M1.5 12h13" />
      <circle className="contur" cx="5" cy="4" r="1.6" />
      <circle className="contur" cx="11" cy="8" r="1.6" />
      <circle className="contur" cx="7" cy="12" r="1.6" />
    </svg>
  );
}

/**
 * Iconițele felurilor: linia cu capetele ei, curba Pen-ului cu un nod, urma mâinii, un „T” punctat (o formă existentă),
 * foarfeca și o linie cu capătul de dincolo de o altă linie, gros (bucata care pleacă).
 */
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
    foarfeca: (
      <>
        <circle className="contur" cx="4" cy="12" r="2" /><circle className="contur" cx="12" cy="12" r="2" />
        <path className="contur" d="M5.4 10.6 L11 2.5 M10.6 10.6 L5 2.5" />
      </>
    ),
    reteaza: (
      <>
        <path className="contur" d="M1.5 8 H9.5 M9.5 2.5 V13.5" />
        <path className="contur gros" d="M10.5 8 H14.5" />
      </>
    ),
  };
  return <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{desen[m]}</svg>;
}
