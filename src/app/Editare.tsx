import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Rigle, GROSIME_RIGLA, type Zona } from '../canvas/Rigle.tsx';
import type { GestDesen, LinieGhid, Lipeste, Vedere } from '../canvas/protocol.ts';
import type { Cutie } from '../geom/cutie.ts';
import { aliniaza, FELURI_ALINIERE, minimAliniere, type FelAliniere } from '../geom/aliniere.ts';
import { lipeste } from '../geom/lipire.ts';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import { transforma, type Transformare } from '../model/transformare.ts';
import { FOAIA, type ContextDocument } from '../ui/actiuniDocument.ts';
import { cutiiAlese, idGhidaj, manerLovit, manereVazute, punctManer, ROTIRE_PX, tinteFoaie, transformareManer, transformareManerLipita, type LipirePunct, type Maner, type TransformareManer } from './editareCalcul.ts';
import { capatConstrans, deseneaza, formaDesenata, LATURI_MAX, LATURI_MIN, TASTE_UNELTE, UNELTE, type Unealta, type UnealtaDesen } from './desenCalcul.ts';
// Calculul acțiunilor `foaie.ghidaje` și `document.muta-instantele` se înregistrează odată cu modulul ăsta.
import '../ui/actiuniDocumentCalcul.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';

/**
 * Editarea pe pânză (ADR 0050–0053), la cerere după prima randare: riglele și ghidajele foii, grila, lipirea mutării
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
const CHEIE_RAZA = 'cncvs2.raza';
const CHEIE_ALINIERE = 'cncvs2.aliniere-stransa';
/** Raza cercului pus cu un clic, fără tragere (ADR 0052), până o schimbă omul. */
const RAZA_IMPLICITA = 15;
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

type Extra = Partial<Pick<ContextDocument, 'ghidajeNoi' | 'deplasari' | 'deplasare' | 'formaNoua' | 'transformare'>>;
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
  const [raza, setRaza] = useState(() => {
    const n = citesteNumar(citeste(CHEIE_RAZA) ?? '');
    return n !== null && n > 0 ? n : RAZA_IMPLICITA;
  });
  const [textRaza, setTextRaza] = useState(() => textNumar(raza));
  // Secțiunea Aliniere a extensiei barei (ADR 0053): mereu acolo, strânsă spre stânga la cerere; starea, în browser.
  const [stransa, setStransa] = useState(() => citeste(CHEIE_ALINIERE) === '1');
  // Locul uneltelor din bara de sus (ADR 0052): îl desenează aplicația, iar modulul ăsta îl umple, printr-un portal.
  const [loc, setLoc] = useState<HTMLElement | null>(null);
  const [locExtensie, setLocExtensie] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setLoc(document.getElementById('loc-unelte')); setLocExtensie(document.getElementById('loc-extensie')); });
  const [liniiDesen, setLiniiDesen] = useState<readonly LinieGhid[]>([]);
  // Liniile de aliniere ale mânerului lipit (ADR 0055), cât se trage.
  const [liniiManere, setLiniiManere] = useState<readonly LinieGhid[]>([]);
  const tinteToate = useMemo(() => tinteFoaie(doc, new Set(), true), [doc]);
  // Gestul îl dă pânza printr-o funcție stabilă; starea de acum o citește de aici (fără închideri vechi).
  const scrieRaza = (r: number): void => { setRaza(r); setTextRaza(textNumar(r)); scrieLocal(CHEIE_RAZA, String(r)); };
  const acum = useRef({ unealta, laturi, raza, scrieRaza, lipire, pasGrila, tinteToate, ruleaza, a: null as Punct | null });
  acum.current = { ...acum.current, unealta, laturi, raza, scrieRaza, lipire, pasGrila, tinteToate, ruleaza };
  const [gestDesen] = useState(() => {
    const g: GestDesen = (faza, x, y, scara, mod) => {
      const s = acum.current;
      if (faza === 'anulat' || !deseneaza(s.unealta)) {
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
      // Alt inversează lipirea (ADR 0052): o oprește când e pornită, o pornește când e oprită.
      if (s.lipire !== mod.alt) {
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
      const tras = formaDesenata(u, a, b, s.laturi, MINIM_DESEN_PX / scara);
      // Cercul: un clic fără tragere îl pune cu raza din câmp; o tragere scrie raza ei în câmp (ADR 0052).
      const f = tras ?? (u === 'cerc' ? { forma: { tip: 'cerc' as const, raza: s.raza }, x: a.x, y: a.y } : null);
      if (u === 'cerc' && tras?.forma.tip === 'cerc') s.scrieRaza(Math.round(tras.forma.raza * 1000) / 1000);
      if (f) s.ruleaza('document.deseneaza', { formaNoua: () => f });
    };
    return g;
  });
  useEffect(() => {
    onDesen(!deseneaza(unealta) || p.doarCitire ? null : gestDesen);
  }, [unealta, p.doarCitire, onDesen, gestDesen]);
  useEffect(() => () => { onDesen(null); }, [onDesen]);

  useEffect(() => {
    onLipeste(cutie
      ? (dx, dy, scara, alt) => (lipire !== alt
        ? lipeste(tinte, cutie, dx, dy, { toleranta: TOLERANTA_LIPIRE_PX / scara, grila: pasGrila })
        : { dx, dy, linii: [] })
      : null);
  }, [lipire, cutie, tinte, pasGrila, onLipeste]);
  useEffect(() => () => { onLipeste(null); }, [onLipeste]);

  // Săgețile mută selecția: 1 mm, Shift 10 mm, Alt 0,1 mm, cu focusul pe pagină sau pe pânză (și pe butoanele de deasupra
  // ei: după un clic pe „Aliniază”, săgețile continuă); într-un control din afara pânzei (arborele proiectului, bara de
  // sus) sau într-un câmp, săgețile sunt ale lui. Un dialog deschis îl oprește garda ușii.
  const selectieRef = useRef(selectie);
  selectieRef.current = selectie;
  // Oglindirea selecției (ADR 0054), față de centrul cutiei ei: exactă, prin `document.transforma`; refuzul (o piesă folosită
  // și de alte instanțe) se spune în secțiunea ei din extensie, până la altă selecție.
  const [motivOglinda, setMotivOglinda] = useState<string | null>(null);
  useEffect(() => { setMotivOglinda(null); }, [selectie]);
  const oglindeste = (directie: 'orizontal' | 'vertical'): void => {
    if (!cutie || selectie.length === 0 || p.doarCitire) return;
    const tr: Transformare = { fel: 'oglindire', directie, centru: { x: (cutie.minX + cutie.maxX) / 2, y: (cutie.minY + cutie.maxY) / 2 } };
    const r = transforma(doc, FOAIA, selectie, tr);
    if (!r.ok) {
      setMotivOglinda(t(`editare.transformare.${r.motiv}`));
      return;
    }
    setMotivOglinda(null);
    ruleaza('document.transforma', { transformare: () => tr });
  };
  const oglindesteRef = useRef(oglindeste);
  oglindesteRef.current = oglindeste;
  useEffect(() => {
    const apasa = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      const tinta = e.target;
      const peCorp = tinta === document.body || tinta === document.documentElement;
      // Pe pânză sau în bara uneltelor (după un clic pe „Aliniază”, săgețile continuă), dar nu într-un câmp.
      const pePanza = tinta instanceof Element && tinta.closest('.panza-cutie, .bara-editare, .extensie') !== null
        && tinta.closest('input, textarea, select, [contenteditable="true"]') === null;
      if (!peCorp && !pePanza) return;
      // Tastele uneltelor (V, R, O, E, L, P); Escape anulează forma începută, apoi întoarce la selecție.
      const u = e.altKey || e.shiftKey ? undefined : TASTE_UNELTE[e.key.toLowerCase()];
      if (u) {
        e.preventDefault();
        setUnealta(u);
        return;
      }
      // Oglindirea (ADR 0054): Shift+H orizontal, Shift+V vertical.
      const o = e.shiftKey && !e.altKey ? ({ h: 'orizontal', v: 'vertical' } as const)[e.key.toLowerCase() as 'h' | 'v'] : undefined;
      if (o) {
        e.preventDefault();
        oglindesteRef.current(o);
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
  const lipestePoz = (axa: 'x' | 'y', poz: number, scara: number, alt: boolean): number => {
    if (lipire === alt) return poz;
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
          ghidaje={ghidaje} linii={liniiDesen.length > 0 || liniiManere.length > 0 ? [...p.linii, ...liniiDesen, ...liniiManere] : p.linii} grila={pasGrila} lipestePoz={lipestePoz} doarCitire={p.doarCitire}
          onNou={(axa, poz) => { scrieGhidaje([...ghidaje, { id: idGhidaj(ghidaje), axa, poz }]); }}
          onMuta={(id, poz) => { scrieGhidaje(ghidaje.map((g) => (g.id === id ? { ...g, poz } : g))); }}
          onSterge={(id) => { scrieGhidaje(ghidaje.filter((g) => g.id !== id)); }}
          eticheta={(cheie, poz) => (cheie === 'sus' ? t('editare.rigla-sus') : cheie === 'stanga' ? t('editare.rigla-stanga') : t('editare.ghidaj', { poz: poz ?? '' }))}
          textPoz={(poz) => textNumar(Math.round(poz * 1000) / 1000, true)}
          citestePoz={(s) => citesteNumar(s, true)}
        />
      ) : null}
      {unealta === 'transformare' && cutie && !p.doarCitire && selectie.length > 0 ? (
        <Manere cutie={cutie} vedere={vedere} doc={doc} selectie={selectie}
          aplica={(tr) => { ruleaza('document.transforma', { transformare: () => tr }); }}
          lipire={(alt) => (lipire !== alt
            ? (q) => lipeste(tinte, { minX: q.x, minY: q.y, maxX: q.x, maxY: q.y }, 0, 0, { toleranta: TOLERANTA_LIPIRE_PX / vedere.scara, grila: pasGrila })
            : null)}
          onLinii={setLiniiManere} />
      ) : null}
      {traseu && deseneaza(unealta) ? (
        <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="desen-previzualizare">
          <Previzualizare unealta={unealta} a={traseu.a} b={traseu.b} laturi={laturi} vedere={vedere} />
        </svg>
      ) : null}
      {(() => {
        const aliniereSectiune = (
          <span className="sectiune-extensie" role="toolbar" aria-label={t('editare.aliniere')} data-testid="extensie-aliniere" data-stransa={stransa}>
            <button type="button" className="aliniaza strange" aria-expanded={!stransa}
              title={stransa ? t('editare.aliniere.arata') : t('editare.aliniere.strange')}
              aria-label={stransa ? t('editare.aliniere.arata') : t('editare.aliniere.strange')} data-editare="aliniere"
              onClick={() => { setStransa(!stransa); scrieLocal(CHEIE_ALINIERE, stransa ? '0' : '1'); }}>
              <Icona fel="stanga" /><span aria-hidden="true">{stransa ? '▸' : '◂'}</span>
            </button>
            {stransa ? null : FELURI_ALINIERE.map((fel) => {
              const destule = selectie.length >= minimAliniere(fel) && !p.doarCitire;
              const titlu = `${t(`editare.aliniaza.${fel}`)}${selectie.length === 1 && !fel.startsWith('distribuie') ? ` ${t('editare.aliniaza.fata-de-foaie')}` : ''}`;
              return (
                <button key={fel} type="button" className="aliniaza" disabled={!destule} title={titlu} aria-label={titlu} data-aliniaza={fel}
                  onClick={() => { aliniere(fel); }}>
                  <Icona fel={fel} />
                </button>
              );
            })}
          </span>
        );
        const poateOglindi = selectie.length > 0 && cutie !== null && !p.doarCitire;
        const oglindireSectiune = (
          <span className="sectiune-extensie" role="toolbar" aria-label={t('editare.oglindire')} data-testid="extensie-oglindire">
            {(['orizontal', 'vertical'] as const).map((d) => (
              <button key={d} type="button" className="aliniaza" disabled={!poateOglindi} title={t(`editare.oglindeste.${d}`)}
                aria-label={t(`editare.oglindeste.${d}`)} data-oglindeste={d} onClick={() => { oglindeste(d); }}>
                <IconaOglinda directie={d} />
              </button>
            ))}
            {motivOglinda ? <span className="motiv-extensie" role="status" data-testid="motiv-oglindire">{motivOglinda}</span> : null}
          </span>
        );
        const sectiuni = (
          <>
            {aliniereSectiune}
            <span className="separator" aria-hidden="true" />
            {oglindireSectiune}
          </>
        );
        const bara = (
          <div className={loc ? 'bara-editare bara-sus' : 'bara-editare'} role="toolbar" aria-label={t('editare.bara')} data-testid="bara-editare"
            style={loc ? undefined : { left: zona.x + GROSIME_RIGLA + 8, top: zona.y + zona.h - 52 }}>
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
            {unealta === 'cerc' ? (
              <input className="laturi raza" value={textRaza} inputMode="decimal" aria-label={t('editare.raza')} title={t('editare.raza')} data-editare="raza"
                onChange={(e) => {
                  setTextRaza(e.target.value);
                  const n = citesteNumar(e.target.value);
                  if (n !== null && n > 0 && n <= 5000) {
                    setRaza(n);
                    scrieLocal(CHEIE_RAZA, String(n));
                  }
                }} />
            ) : null}
            <span className="separator" aria-hidden="true" />
            <button type="button" className="aliniaza" aria-pressed={lipire} title={t('editare.lipire-sfat')} aria-label={t('editare.lipire')} data-editare="lipire"
              onClick={() => { setLipire(!lipire); scrieLocal(CHEIE_LIPIRE, lipire ? '0' : '1'); }}>
              <IconaUnealta u="lipire" />
            </button>
            <button type="button" className="aliniaza" aria-pressed={grila.pornita} title={t('editare.grila')} aria-label={t('editare.grila')} data-editare="grila"
              onClick={() => { schimbaGrila({ ...grila, pornita: !grila.pornita }); }}>
              <IconaUnealta u="grila" />
            </button>
            {grila.pornita ? (
              <input className="pas-grila" value={textPas} inputMode="decimal" aria-label={t('editare.grila-pas')} data-editare="pas-grila"
                onChange={(e) => {
                  setTextPas(e.target.value);
                  const n = citesteNumar(e.target.value);
                  if (n !== null && n >= 0.1 && n <= 1000) schimbaGrila({ pornita: true, pas: n });
                }} />
            ) : null}
            {locExtensie ? null : sectiuni}
          </div>
        );
        // În bara de sus (locul `unelte` al aranjamentului, ADR 0052); fără el, plutitoare în colțul zonei libere. Alinierea,
        // în extensia barei (ADR 0053), dacă aranjamentul o are; altfel, în bara uneltelor.
        return (
          <>
            {loc ? createPortal(bara, loc) : bara}
            {locExtensie ? createPortal(sectiuni, locExtensie) : null}
          </>
        );
      })()}
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

/** Pictogramele uneltelor: săgeata selecției și conturul fiecărei forme; magnetul lipirii și grila. */
function IconaUnealta({ u }: { readonly u: Unealta | 'lipire' | 'grila' }): ReactElement {
  const desen: Record<Unealta | 'lipire' | 'grila', ReactElement> = {
    lipire: <path className="contur" d="M4 2.5 V8.5 A4 4 0 0 0 12 8.5 V2.5 M4 5 H6.5 M9.5 5 H12 M6.5 2.5 V8.5 A1.5 1.5 0 0 0 9.5 8.5 V2.5" />,
    grila: <path className="contur" d="M2 5.5 H14 M2 10.5 H14 M5.5 2 V14 M10.5 2 V14" />,
    selectie: <path d="M3 2 L3 13 L6 10 L8.5 14.5 L10.5 13.5 L8 9 L12.5 9 Z" />,
    dreptunghi: <rect x="2.5" y="4" width="11" height="8" className="contur" />,
    cerc: <circle cx="8" cy="8" r="5.5" className="contur" />,
    elipsa: <ellipse cx="8" cy="8" rx="6" ry="3.8" className="contur" />,
    linie: <line x1="2.5" y1="13.5" x2="13.5" y2="2.5" className="contur" />,
    poligon: <polygon points="8,2 13.2,5 13.2,11 8,14 2.8,11 2.8,5" className="contur" />,
    transformare: (
      <>
        <rect x="3.5" y="3.5" width="9" height="9" className="contur" strokeDasharray="2 1.6" />
        <rect x="1.5" y="1.5" width="4" height="4" /><rect x="10.5" y="1.5" width="4" height="4" />
        <rect x="1.5" y="10.5" width="4" height="4" /><rect x="10.5" y="10.5" width="4" height="4" />
      </>
    ),
  };
  return <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{desen[u]}</svg>;
}

/** Oglindirea (ADR 0054): două figuri, una plină și una în contur, de o parte și de alta a axei punctate. */
function IconaOglinda({ directie }: { readonly directie: 'orizontal' | 'vertical' }): ReactElement {
  return (
    <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <g transform={directie === 'vertical' ? 'rotate(90 8 8)' : undefined}>
        <polygon points="1.5,13 6.5,3 6.5,13" />
        <polygon points="14.5,13 9.5,3 9.5,13" className="contur" />
        <line x1="8" y1="1" x2="8" y2="15" className="contur" strokeDasharray="1.6 1.4" />
      </g>
    </svg>
  );
}

/** Cursorul deasupra fiecărui mâner (pânza îl primește cât mausul stă pe el). */
const CURSOR_MANER: Record<Maner | 'rotire', string> = {
  nv: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sv: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', v: 'ew-resize', rotire: 'grab',
};

/**
 * Mânerele selecției (ADR 0052): 8 de scalare și unul de rotire deasupra cutiei. Sunt doar desen (`pointer-events: none`):
 * lovitura se decide geometric (`manerLovit`), într-un ascultător pus înaintea pânzei, și doar pentru butonul stâng fără
 * Space; rotița, butonul din mijloc și Space ajung la pânză ca înainte, oriunde ar fi mânerele. Cât se trage, conturul
 * cutiei transformate și mărimea (sau unghiul); la eliberare, acțiunea `document.transforma`; Escape renunță. Un refuz
 * (o scalare care n-ar mai fi exactă) se spune deasupra cutiei, cu motivul. Cât e apăsată pânza în altă parte (mutarea,
 * panoramarea), mânerele se ascund: n-ar urma forma.
 */
function Manere({ cutie: c, vedere: v, doc, selectie, aplica, lipire, onLinii }: {
  readonly cutie: Cutie; readonly vedere: Vedere; readonly doc: Document; readonly selectie: readonly string[];
  readonly aplica: (t: Transformare) => void;
  /** Lipirea mânerului tras (ADR 0055), după Alt ținut (care o inversează): null = mânerul merge liber. */
  readonly lipire: (alt: boolean) => LipirePunct | null;
  readonly onLinii: (l: readonly LinieGhid[]) => void;
}): ReactElement {
  const ex = (x: number): number => v.tx + x * v.scara;
  const ey = (y: number): number => v.ty - y * v.scara;
  const cx = (c.minX + c.maxX) / 2, cy = (c.minY + c.maxY) / 2;
  const [gest, setGest] = useState<{ readonly m: Maner | 'rotire'; readonly t: TransformareManer } | null>(null);
  const [motiv, setMotiv] = useState<string | null>(null);
  const [ascunse, setAscunse] = useState(false);
  const radacina = useRef<HTMLDivElement | null>(null);
  const acum = useRef({ c, v, doc, selectie, aplica, lipire, onLinii });
  acum.current = { c, v, doc, selectie, aplica, lipire, onLinii };
  // Motivul unui refuz rămâne până la următorul gest sau până se schimbă selecția.
  useEffect(() => { setMotiv(null); }, [selectie]);
  useEffect(() => {
    const el = radacina.current;
    const panza = el?.closest('.panza-cutie')?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !panza) return undefined;
    let spatiu = false;
    let g: { readonly m: Maner | 'rotire'; readonly start: Punct; readonly ecran: Punct; readonly id: number } | null = null;
    let apasata: number | null = null;
    const local = (e: { clientX: number; clientY: number }): Punct => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const laFoaie = (e: { clientX: number; clientY: number }): Punct => {
      const { v: w } = acum.current;
      const p = local(e);
      return { x: (p.x - w.tx) / w.scara, y: (w.ty - p.y) / w.scara };
    };
    const apasa = (e: PointerEvent): void => {
      if (e.target !== panza) return;
      const p = local(e);
      const m = e.button === 0 && !spatiu ? manerLovit(acum.current.c, acum.current.v, p.x, p.y) : null;
      if (!m) {
        apasata = e.pointerId;
        setAscunse(true);
        return;
      }
      // Apăsarea e a mânerului: pânza n-o mai primește (nici alegerea, nici mutarea).
      e.preventDefault();
      e.stopPropagation();
      panza.setPointerCapture(e.pointerId);
      g = { m, start: laFoaie(e), ecran: { x: e.clientX, y: e.clientY }, id: e.pointerId };
      setMotiv(null);
      setGest({ m, t: transformareManer(acum.current.c, m, g.start, g.start, e.shiftKey) });
    };
    const misca = (e: PointerEvent): void => {
      if (g) {
        if (e.pointerId !== g.id) return;
        const r = transformareManerLipita(acum.current.c, g.m, g.start, laFoaie(e), e.shiftKey, acum.current.lipire(e.altKey));
        setGest({ m: g.m, t: r.t });
        acum.current.onLinii(r.linii);
        return;
      }
      if (apasata !== null) return;
      const p = local(e);
      const m = e.target === panza && !spatiu ? manerLovit(acum.current.c, acum.current.v, p.x, p.y) : null;
      panza.style.cursor = m ? CURSOR_MANER[m] : '';
    };
    const elibereaza = (e: PointerEvent): void => {
      if (apasata === e.pointerId) {
        apasata = null;
        setAscunse(false);
      }
      if (!g || e.pointerId !== g.id) return;
      const s = g;
      g = null;
      setGest(null);
      const { c: cutie, doc: d, selectie: alese, aplica: ap, lipire: lip, onLinii: linii } = acum.current;
      linii([]);
      // Un clic (sub 3 px de tragere) nu e o transformare.
      if (Math.hypot(e.clientX - s.ecran.x, e.clientY - s.ecran.y) < MINIM_DESEN_PX) return;
      const tr = transformareManerLipita(cutie, s.m, s.start, laFoaie(e), e.shiftKey, lip(e.altKey)).t;
      if (tr.fel === 'rotire' ? tr.unghi === 0 : tr.sx === 1 && tr.sy === 1) return;
      const r = transforma(d, FOAIA, alese, tr);
      if (!r.ok) {
        setMotiv(t(`editare.transformare.${r.motiv}`));
        return;
      }
      ap(tr);
    };
    const anuleaza = (): void => {
      g = null;
      apasata = null;
      setGest(null);
      setAscunse(false);
      acum.current.onLinii([]);
    };
    const tasta = (e: KeyboardEvent): void => {
      if (e.code === 'Space') spatiu = e.type === 'keydown';
      if (e.type === 'keydown' && e.key === 'Escape' && g) {
        e.preventDefault();
        e.stopImmediatePropagation();
        anuleaza();
      }
    };
    const uita = (): void => { spatiu = false; };
    window.addEventListener('pointerdown', apasa, true);
    window.addEventListener('pointermove', misca, true);
    window.addEventListener('pointerup', elibereaza, true);
    window.addEventListener('pointercancel', anuleaza, true);
    window.addEventListener('keydown', tasta, true);
    window.addEventListener('keyup', tasta, true);
    window.addEventListener('blur', uita);
    return () => {
      window.removeEventListener('pointerdown', apasa, true);
      window.removeEventListener('pointermove', misca, true);
      window.removeEventListener('pointerup', elibereaza, true);
      window.removeEventListener('pointercancel', anuleaza, true);
      window.removeEventListener('keydown', tasta, true);
      window.removeEventListener('keyup', tasta, true);
      window.removeEventListener('blur', uita);
      panza.style.cursor = '';
    };
  }, []);
  // Conturul cutiei transformate, cât se trage.
  const colturi = (['sv', 'se', 'ne', 'nv'] as const).map((m) => {
    const q = punctManer(c, m);
    const tr = gest?.t;
    if (!tr) return q;
    if (tr.fel === 'rotire') {
      const co = Math.cos((tr.unghi * Math.PI) / 180), si = Math.sin((tr.unghi * Math.PI) / 180);
      return { x: cx + co * (q.x - cx) - si * (q.y - cy), y: cy + si * (q.x - cx) + co * (q.y - cy) };
    }
    return { x: tr.ancora.x + (q.x - tr.ancora.x) * tr.sx, y: tr.ancora.y + (q.y - tr.ancora.y) * tr.sy };
  });
  const mm = (x: number): string => textNumar(Math.round(x * 100) / 100, true);
  const eticheta = gest
    ? gest.t.fel === 'rotire'
      ? `${textNumar(gest.t.unghi, true)}°`
      : `${mm((c.maxX - c.minX) * gest.t.sx)} × ${mm((c.maxY - c.minY) * gest.t.sy)} mm`
    : null;
  const sus = ey(c.maxY);
  const vazute = manereVazute((c.maxX - c.minX) * v.scara, (c.maxY - c.minY) * v.scara);
  return (
    <div className="manere" ref={radacina} data-testid="manere" style={ascunse ? { visibility: 'hidden' } : undefined}>
      <svg className="rigle-desen" width="100%" height="100%" aria-hidden="true">
        {gest ? <polygon className="desen-previzualizare" points={colturi.map((q) => `${ex(q.x)},${ey(q.y)}`).join(' ')} data-testid="manere-contur" /> : null}
        <line className="manere-tija" x1={ex(cx)} x2={ex(cx)} y1={sus} y2={sus - ROTIRE_PX} />
      </svg>
      {vazute.map((m) => {
        const q = punctManer(c, m);
        return <div key={m} className={`maner maner-${m}`} style={{ left: ex(q.x) - 5, top: ey(q.y) - 5 }} data-maner={m} />;
      })}
      <div className="maner maner-rotire" style={{ left: ex(cx) - 6, top: sus - ROTIRE_PX - 6 }} data-maner="rotire" />
      {eticheta || motiv ? (
        <span className={motiv && !eticheta ? 'manere-eticheta manere-motiv' : 'manere-eticheta'} role={motiv && !eticheta ? 'status' : undefined}
          style={{ left: ex(cx), top: sus - ROTIRE_PX - 34 }} data-testid={motiv && !eticheta ? 'manere-motiv' : 'manere-eticheta'}>
          {eticheta ?? motiv}
        </span>
      ) : null}
    </div>
  );
}
