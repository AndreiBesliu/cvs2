import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import { Rigle, GROSIME_RIGLA, type Zona } from '../canvas/Rigle.tsx';
import type { GestDesen, LinieGhid, Lipeste, Vedere } from '../canvas/protocol.ts';
import type { Cutie } from '../geom/cutie.ts';
import { aliniaza, FELURI_ALINIERE, minimAliniere, type FelAliniere } from '../geom/aliniere.ts';
import { lipeste } from '../geom/lipire.ts';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import { FOAIA, type ContextDocument } from '../ui/actiuniDocument.ts';
import { cutiiAlese, idGhidaj, tinteFoaie } from './editareCalcul.ts';
import { capatConstrans, formaDesenata, LATURI_MAX, LATURI_MIN, TASTE_UNELTE, UNELTE, type Unealta, type UnealtaDesen } from './desenCalcul.ts';
// Calculul acțiunilor `foaie.ghidaje` și `document.muta-instantele` se înregistrează odată cu modulul ăsta.
import '../ui/actiuniDocumentCalcul.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';

/**
 * Editarea pe pânză (ADR 0050, ADR 0051), la cerere după prima randare: riglele și ghidajele foii, grila, lipirea mutării
 * (dată pânzei), uneltele de desen (gestul dat pânzei, cu previzualizarea), bara uneltelor, a lipirii și a alinierii,
 * săgețile și tastele uneltelor. Documentul se schimbă doar prin acțiuni (`foaie.ghidaje`, `document.muta-instantele`,
 * `document.muta-selectia`, `document.deseneaza`); preferințele (lipirea, grila, laturile poligonului) stau în browser.
 */

/** Pixelii de pe ecran la care o țintă trage. */
export const TOLERANTA_LIPIRE_PX = 6;

const CHEIE_LIPIRE = 'cncvs2.lipire';
const CHEIE_GRILA = 'cncvs2.grila';
const PAS_GRILA_IMPLICIT = 10;
const CHEIE_LATURI = 'cncvs2.laturi';
/** O tragere mai scurtă de atât (pe ecran) nu desenează nimic. */
const MINIM_DESEN_PX = 3;

function citeste(cheie: string): string | null {
  try {
    return localStorage.getItem(cheie);
  } catch {
    return null;
  }
}
function scrieLocal(cheie: string, valoare: string): void {
  try {
    localStorage.setItem(cheie, valoare);
  } catch {
    // Fără stocare (fereastră privată, date blocate): preferința ține doar cât pagina.
  }
}

type Extra = Partial<Pick<ContextDocument, 'ghidajeNoi' | 'deplasari' | 'deplasare' | 'formaNoua'>>;
type Punct = { readonly x: number; readonly y: number };

export type ProprietatiEditare = {
  readonly doc: Document;
  readonly selectie: readonly string[];
  readonly cutie: Cutie | null;
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
  readonly linii: readonly LinieGhid[];
  readonly zona: RefObject<HTMLElement | null>;
  readonly doarCitire: boolean;
  /** Rulează o acțiune a documentului prin ușa aplicației (garda dialogului deschis). */
  readonly ruleaza: (id: string, extra: Extra) => void;
  /** Lipirea mutării, dată pânzei (null: lipirea oprită sau modulul plecat). */
  readonly onLipeste: (f: Lipeste | null) => void;
  /** Gestul uneltei de desen, dat pânzei (null: selecția, sau modulul plecat). */
  readonly onDesen: (f: GestDesen | null) => void;
};

export function Editare(p: ProprietatiEditare): ReactElement | null {
  useLimba();
  const { doc, selectie, cutie, vedere, marime, ruleaza, onLipeste, onDesen } = p;
  const foaie = doc.foi[FOAIA];
  const ghidaje = useMemo(() => foaie?.ghidaje ?? [], [foaie]);
  const [lipire, setLipire] = useState(() => citeste(CHEIE_LIPIRE) !== '0');
  const [grila, setGrila] = useState<{ readonly pornita: boolean; readonly pas: number }>(() => {
    const s = citeste(CHEIE_GRILA);
    const n = s === null ? null : citesteNumar(s.replace(/^-/, ''));
    return { pornita: s !== null && !s.startsWith('-') && n !== null && n > 0, pas: n !== null && n > 0 ? n : PAS_GRILA_IMPLICIT };
  });
  const [textPas, setTextPas] = useState(() => textNumar(grila.pas));

  const alese = useMemo(() => new Set(selectie), [selectie]);
  const tinte = useMemo(() => tinteFoaie(doc, alese, true), [doc, alese]);
  // Un ghidaj tras se lipește de foaie, de forme și de grilă (nu de celelalte ghidaje: ar trage spre el însuși).
  const tinteFaraGhidaje = useMemo(() => tinteFoaie(doc, new Set(), false), [doc]);
  const pasGrila = grila.pornita ? grila.pas : null;

  // Uneltele de desen (ADR 0051): unealta aleasă rămâne după o formă; capetele gestului se lipesc ca puncte.
  const [unealta, setUnealta] = useState<Unealta>('selectie');
  const [laturi, setLaturi] = useState(() => {
    const n = Number(citeste(CHEIE_LATURI));
    return Number.isInteger(n) && n >= LATURI_MIN && n <= LATURI_MAX ? n : 6;
  });
  const [traseu, setTraseu] = useState<{ readonly a: Punct; readonly b: Punct } | null>(null);
  const [liniiDesen, setLiniiDesen] = useState<readonly LinieGhid[]>([]);
  const tinteToate = useMemo(() => tinteFoaie(doc, new Set(), true), [doc]);
  // Gestul îl dă pânza printr-o funcție stabilă; starea de acum o citește de aici (fără închideri vechi).
  const acum = useRef({ unealta, laturi, lipire, pasGrila, tinteToate, ruleaza, a: null as Punct | null });
  acum.current = { ...acum.current, unealta, laturi, lipire, pasGrila, tinteToate, ruleaza };
  const [gestDesen] = useState(() => {
    const g: GestDesen = (faza, x, y, scara, mod) => {
      const s = acum.current;
      if (faza === 'anulat' || s.unealta === 'selectie') {
        s.a = null;
        setTraseu(null);
        setLiniiDesen([]);
        return;
      }
      const u: UnealtaDesen = s.unealta;
      // Un punct nelipit vine din pixelii mausului (60,000002661): se rotunjește la 0,001 mm; unul lipit stă exact pe țintă.
      const rot = (v: number): number => Math.round(v * 1000) / 1000;
      let linii: readonly LinieGhid[] = [];
      let q: Punct = { x: rot(x), y: rot(y) };
      if (s.lipire && !mod.alt) {
        const r = lipeste(s.tinteToate, { minX: x, minY: y, maxX: x, maxY: y }, 0, 0, { toleranta: TOLERANTA_LIPIRE_PX / scara, grila: s.pasGrila });
        linii = r.linii;
        q = { x: linii.some((l) => l.axa === 'x') ? x + r.dx : rot(x), y: linii.some((l) => l.axa === 'y') ? y + r.dy : rot(y) };
      }
      if (faza === 'start') {
        s.a = q;
        setTraseu({ a: q, b: q });
        setLiniiDesen(linii);
        return;
      }
      const a = s.a;
      if (!a) return;
      const b = capatConstrans(u, a, q, mod.shift);
      if (faza === 'misca') {
        setTraseu({ a, b });
        setLiniiDesen(linii);
        return;
      }
      s.a = null;
      setTraseu(null);
      setLiniiDesen([]);
      const f = formaDesenata(u, a, b, s.laturi, MINIM_DESEN_PX / scara);
      if (f) s.ruleaza('document.deseneaza', { formaNoua: () => f });
    };
    return g;
  });
  useEffect(() => {
    onDesen(unealta === 'selectie' || p.doarCitire ? null : gestDesen);
  }, [unealta, p.doarCitire, onDesen, gestDesen]);
  useEffect(() => () => { onDesen(null); }, [onDesen]);

  useEffect(() => {
    onLipeste(lipire && cutie
      ? (dx, dy, scara) => lipeste(tinte, cutie, dx, dy, { toleranta: TOLERANTA_LIPIRE_PX / scara, grila: pasGrila })
      : null);
  }, [lipire, cutie, tinte, pasGrila, onLipeste]);
  useEffect(() => () => { onLipeste(null); }, [onLipeste]);

  // Săgețile mută selecția: 1 mm, Shift 10 mm, Alt 0,1 mm, cu focusul pe pagină sau pe pânză (și pe butoanele de deasupra
  // ei: după un clic pe „Aliniază”, săgețile continuă); într-un control din afara pânzei (arborele proiectului, bara de
  // sus) sau într-un câmp, săgețile sunt ale lui. Un dialog deschis îl oprește garda ușii.
  const selectieRef = useRef(selectie);
  selectieRef.current = selectie;
  useEffect(() => {
    const apasa = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      const tinta = e.target;
      const peCorp = tinta === document.body || tinta === document.documentElement;
      const pePanza = tinta instanceof Element && tinta.closest('.panza-cutie') !== null
        && tinta.closest('input, textarea, select, [contenteditable="true"]') === null;
      if (!peCorp && !pePanza) return;
      // Tastele uneltelor (V, R, O, E, L, P); Escape anulează forma începută, apoi întoarce la selecție.
      const u = e.altKey || e.shiftKey ? undefined : TASTE_UNELTE[e.key.toLowerCase()];
      if (u) {
        e.preventDefault();
        setUnealta(u);
        return;
      }
      if (e.key === 'Escape') {
        if (acum.current.a) gestDesen('anulat', 0, 0, 1, { alt: false, shift: false });
        else setUnealta('selectie');
        return;
      }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!d || selectieRef.current.length === 0) return;
      e.preventDefault();
      const k = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      const [dx = 0, dy = 0] = d;
      ruleaza('document.muta-selectia', { deplasare: () => ({ dx: dx * k, dy: dy * k }) });
    };
    window.addEventListener('keydown', apasa);
    return () => { window.removeEventListener('keydown', apasa); };
  }, [ruleaza, gestDesen]);

  // Zona liberă a pânzei, în pixeli din colțul ei (riglele stau pe marginile ei).
  const radacina = useRef<HTMLDivElement | null>(null);
  const [zona, setZona] = useState<Zona>({ x: 0, y: 0, w: marime.latime, h: marime.inaltime });
  useLayoutEffect(() => {
    const masoara = (): void => {
      const z = p.zona.current?.getBoundingClientRect();
      const c = radacina.current?.parentElement?.getBoundingClientRect();
      const n = z && c && z.width > 100 && z.height > 100
        ? { x: Math.round(z.left - c.left), y: Math.round(z.top - c.top), w: Math.round(z.width), h: Math.round(z.height) }
        : { x: 0, y: 0, w: marime.latime, h: marime.inaltime };
      setZona((v) => (v.x === n.x && v.y === n.y && v.w === n.w && v.h === n.h ? v : n));
    };
    masoara();
    const ro = new ResizeObserver(masoara);
    if (p.zona.current) ro.observe(p.zona.current);
    return () => { ro.disconnect(); };
  }, [marime.latime, marime.inaltime, p.zona]);

  const scrieGhidaje = (nou: readonly Ghidaj[]): void => { ruleaza('foaie.ghidaje', { ghidajeNoi: () => nou }); };
  const lipestePoz = (axa: 'x' | 'y', poz: number, scara: number): number => {
    if (!lipire) return poz;
    const r = lipeste(tinteFaraGhidaje, { minX: poz, minY: poz, maxX: poz, maxY: poz }, 0, 0, { toleranta: TOLERANTA_LIPIRE_PX / scara, grila: pasGrila });
    // Lipirea unui punct pe ambele axe: din ea contează doar axa ghidajului.
    const lipita = axa === 'x' ? poz + r.dx : poz + r.dy;
    const peAxa = r.linii.some((l) => l.axa === axa);
    return peAxa ? lipita : poz;
  };

  const cutiiInstante = useMemo(() => cutiiAlese(doc, alese), [doc, alese]);
  const aliniere = (fel: FelAliniere): void => {
    if (!foaie) return;
    const d = aliniaza(cutiiInstante, fel, { minX: 0, minY: 0, maxX: foaie.stoc.latime, maxY: foaie.stoc.inaltime });
    if (d.length > 0) ruleaza('document.muta-instantele', { deplasari: () => d });
  };

  const schimbaGrila = (g: { readonly pornita: boolean; readonly pas: number }): void => {
    setGrila(g);
    scrieLocal(CHEIE_GRILA, `${g.pornita ? '' : '-'}${g.pas}`);
  };

  return (
    <div className="editare" ref={radacina}>
      {foaie ? (
        <Rigle
          vedere={vedere} latime={marime.latime} inaltime={marime.inaltime} zona={zona} foaie={foaie.stoc}
          ghidaje={ghidaje} linii={liniiDesen.length > 0 ? [...p.linii, ...liniiDesen] : p.linii} grila={pasGrila} lipestePoz={lipestePoz} doarCitire={p.doarCitire}
          onNou={(axa, poz) => { scrieGhidaje([...ghidaje, { id: idGhidaj(ghidaje), axa, poz }]); }}
          onMuta={(id, poz) => { scrieGhidaje(ghidaje.map((g) => (g.id === id ? { ...g, poz } : g))); }}
          onSterge={(id) => { scrieGhidaje(ghidaje.filter((g) => g.id !== id)); }}
          eticheta={(cheie, poz) => (cheie === 'sus' ? t('editare.rigla-sus') : cheie === 'stanga' ? t('editare.rigla-stanga') : t('editare.ghidaj', { poz: poz ?? '' }))}
          textPoz={(poz) => textNumar(Math.round(poz * 1000) / 1000, true)}
          citestePoz={(s) => citesteNumar(s, true)}
        />
      ) : null}
      {traseu && unealta !== 'selectie' ? (
        <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="desen-previzualizare">
          <Previzualizare unealta={unealta} a={traseu.a} b={traseu.b} laturi={laturi} vedere={vedere} />
        </svg>
      ) : null}
      <div className="bara-editare" role="toolbar" aria-label={t('editare.bara')} data-testid="bara-editare"
        style={{ left: zona.x + GROSIME_RIGLA + 8, top: zona.y + zona.h - 52 }}>
        {UNELTE.map((u) => {
          const titlu = t(`editare.unealta.${u}`);
          return (
            <button key={u} type="button" className="unealta aliniaza" aria-pressed={unealta === u} title={titlu} aria-label={titlu} data-unealta={u}
              disabled={p.doarCitire && u !== 'selectie'} onClick={() => { setUnealta(u); }}>
              <IconaUnealta u={u} />
            </button>
          );
        })}
        {unealta === 'poligon' ? (
          <input className="laturi" value={laturi} inputMode="numeric" aria-label={t('editare.laturi')} title={t('editare.laturi')} data-editare="laturi"
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= LATURI_MIN && n <= LATURI_MAX) {
                setLaturi(n);
                scrieLocal(CHEIE_LATURI, String(n));
              }
            }} />
        ) : null}
        <span className="separator" aria-hidden="true" />
        <button type="button" aria-pressed={lipire} title={t('editare.lipire-sfat')} data-editare="lipire"
          onClick={() => { setLipire(!lipire); scrieLocal(CHEIE_LIPIRE, lipire ? '0' : '1'); }}>
          {t('editare.lipire')}
        </button>
        <button type="button" aria-pressed={grila.pornita} data-editare="grila" onClick={() => { schimbaGrila({ ...grila, pornita: !grila.pornita }); }}>
          {t('editare.grila')}
        </button>
        {grila.pornita ? (
          <input className="pas-grila" value={textPas} inputMode="decimal" aria-label={t('editare.grila-pas')} data-editare="pas-grila"
            onChange={(e) => {
              setTextPas(e.target.value);
              const n = citesteNumar(e.target.value);
              if (n !== null && n >= 0.1 && n <= 1000) schimbaGrila({ pornita: true, pas: n });
            }} />
        ) : null}
        <span className="separator" aria-hidden="true" />
        {FELURI_ALINIERE.map((fel) => {
          const destule = selectie.length >= minimAliniere(fel) && !p.doarCitire;
          const titlu = `${t(`editare.aliniaza.${fel}`)}${selectie.length === 1 && !fel.startsWith('distribuie') ? ` ${t('editare.aliniaza.fata-de-foaie')}` : ''}`;
          return (
            <button key={fel} type="button" className="aliniaza" disabled={!destule} title={titlu} aria-label={titlu} data-aliniaza={fel}
              onClick={() => { aliniere(fel); }}>
              <Icona fel={fel} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pictogramele alinierii: linia de referință și două bare, în culoarea textului. */
function Icona({ fel }: { readonly fel: FelAliniere }): ReactElement {
  const bare: Record<FelAliniere, ReactElement> = {
    stanga: <><line x1="2" y1="1" x2="2" y2="15" /><rect x="3" y="3" width="10" height="3" /><rect x="3" y="10" width="6" height="3" /></>,
    'centru-x': <><line x1="8" y1="1" x2="8" y2="15" /><rect x="2" y="3" width="12" height="3" /><rect x="5" y="10" width="6" height="3" /></>,
    dreapta: <><line x1="14" y1="1" x2="14" y2="15" /><rect x="3" y="3" width="10" height="3" /><rect x="7" y="10" width="6" height="3" /></>,
    sus: <><line x1="1" y1="2" x2="15" y2="2" /><rect x="3" y="3" width="3" height="10" /><rect x="10" y="3" width="3" height="6" /></>,
    'centru-y': <><line x1="1" y1="8" x2="15" y2="8" /><rect x="3" y="2" width="3" height="12" /><rect x="10" y="5" width="3" height="6" /></>,
    jos: <><line x1="1" y1="14" x2="15" y2="14" /><rect x="3" y="3" width="3" height="10" /><rect x="10" y="7" width="3" height="6" /></>,
    'distribuie-x': <><rect x="1" y="4" width="3" height="8" /><rect x="6.5" y="4" width="3" height="8" /><rect x="12" y="4" width="3" height="8" /></>,
    'distribuie-y': <><rect x="4" y="1" width="8" height="3" /><rect x="4" y="6.5" width="8" height="3" /><rect x="4" y="12" width="8" height="3" /></>,
  };
  return <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{bare[fel]}</svg>;
}

/** Conturul formei trase, pe ecran, cât se trage (ADR 0051). */
function Previzualizare({ unealta, a, b, laturi, vedere: v }: {
  readonly unealta: UnealtaDesen; readonly a: Punct; readonly b: Punct; readonly laturi: number; readonly vedere: Vedere;
}): ReactElement | null {
  const sx = (x: number): number => v.tx + x * v.scara;
  const sy = (y: number): number => v.ty - y * v.scara;
  switch (unealta) {
    case 'dreptunghi':
      return <rect className="desen-previzualizare" x={Math.min(sx(a.x), sx(b.x))} y={Math.min(sy(a.y), sy(b.y))} width={Math.abs(b.x - a.x) * v.scara} height={Math.abs(b.y - a.y) * v.scara} />;
    case 'cerc':
      return <circle className="desen-previzualizare" cx={sx(a.x)} cy={sy(a.y)} r={Math.hypot(b.x - a.x, b.y - a.y) * v.scara} />;
    case 'elipsa':
      return <ellipse className="desen-previzualizare" cx={sx((a.x + b.x) / 2)} cy={sy((a.y + b.y) / 2)} rx={(Math.abs(b.x - a.x) / 2) * v.scara} ry={(Math.abs(b.y - a.y) / 2) * v.scara} />;
    case 'linie':
      return <line className="desen-previzualizare" x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} />;
    case 'poligon': {
      const f = formaDesenata('poligon', a, b, laturi, 0);
      if (!f || f.forma.tip !== 'cale') return null;
      const pct = f.forma.varfuri.map((q) => `${sx(f.x + q.p.x)},${sy(f.y + q.p.y)}`).join(' ');
      return <polygon className="desen-previzualizare" points={pct} />;
    }
  }
}

/** Pictogramele uneltelor: săgeata selecției și conturul fiecărei forme. */
function IconaUnealta({ u }: { readonly u: Unealta }): ReactElement {
  const desen: Record<Unealta, ReactElement> = {
    selectie: <path d="M3 2 L3 13 L6 10 L8.5 14.5 L10.5 13.5 L8 9 L12.5 9 Z" />,
    dreptunghi: <rect x="2.5" y="4" width="11" height="8" className="contur" />,
    cerc: <circle cx="8" cy="8" r="5.5" className="contur" />,
    elipsa: <ellipse cx="8" cy="8" rx="6" ry="3.8" className="contur" />,
    linie: <line x1="2.5" y1="13.5" x2="13.5" y2="2.5" className="contur" />,
    poligon: <polygon points="8,2 13.2,5 13.2,11 8,14 2.8,11 2.8,5" className="contur" />,
  };
  return <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{desen[u]}</svg>;
}
