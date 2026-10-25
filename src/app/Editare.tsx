import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Rigle, GROSIME_RIGLA, type Zona } from '../canvas/Rigle.tsx';
import type { GestDesen, LinieGhid, Lipeste, Vedere } from '../canvas/protocol.ts';
import type { Cutie } from '../geom/cutie.ts';
import { aliniaza, FELURI_ALINIERE, minimAliniere, type FelAliniere } from '../geom/aliniere.ts';
import { lipeste } from '../geom/lipire.ts';
import '../i18n/editare.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import { transforma, type Transformare } from '../model/transformare.ts';
import { FOAIA, type ContextDocument } from '../ui/actiuniDocument.ts';
import {
  adaugaLaSelectie, aleseInCadru, citesteRetea, comutaInSelectie, cutieFormelor, cutiiAlese, felCadru, FORMULAR_RETEA, type FormularRetea, idGhidaj, manerLovit, manereVazute, punctManer, ROTIRE_PX, tinteFoaie,
  transformareManer, transformareManerLipita, type LipirePunct, type Maner, type TransformareManer,
} from './editareCalcul.ts';
import { instantaLa } from '../model/alegere.ts';
import { capatConstrans, deseneaza, formaDesenata, LATURI_MAX, LATURI_MIN, TASTE_UNELTE, UNELTE, type FormaDesenata, type Unealta, type UnealtaDesen } from './desenCalcul.ts';
// Calculul acțiunilor `foaie.ghidaje` și `document.muta-instantele` se înregistrează odată cu modulul ăsta.
import { motivCopiereRetea, motivDesen } from '../ui/actiuniDocumentCalcul.ts';
import type { FormaNoua } from '../ui/actiuniDocument.ts';
import { copiiRetea, punctulCopiei, type Retea } from '../model/retea.ts';
import {
  adaugaNod, caleDinForma, caleDinNoduri, manereNod, mutaManer, mutaNod, schimbaTipNod, stergeNod, tipNod, type FormaCale, type NodCuManere, type ParteNod,
  type TipCerut,
} from '../model/noduri.ts';
import { formaPen, nodPus, sePoateInchide } from './penCalcul.ts';
import { conturNoduri, drumSvg, formaNoduri, inversa, laturaLovita, nodLovit, noduriPeEcran } from './noduriCalcul.ts';
import { aplica, IDENTITATE } from '../geom/matrice.ts';
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
const CHEIE_RETEA = 'cncvs2.retea';
const CHEIE_OFFSET = 'cncvs2.offset';

/** Calculul offsetului (ADR 0064): o bucată la cerere, adusă la prima deschidere a panoului (cu motorul CAM). */
type ModulOffset = typeof import('./offsetCalcul.ts');
type FormularOffset = { readonly distanta: string; readonly sens: 'exterior' | 'interior' };

/** Formularul offsetului ținut în browser; unul stricat lasă implicitele (5 mm spre exterior). */
function offsetSalvat(): FormularOffset {
  try {
    const x: unknown = JSON.parse(citeste(CHEIE_OFFSET) ?? 'null');
    if (typeof x !== 'object' || x === null) return { distanta: '5', sens: 'exterior' };
    const o = x as Record<string, unknown>;
    return { distanta: typeof o.distanta === 'string' ? o.distanta : '5', sens: o.sens === 'interior' ? 'interior' : 'exterior' };
  } catch {
    return { distanta: '5', sens: 'exterior' };
  }
}

/** Formularul rețelei ținut în browser (ADR 0061); unul stricat sau al altei versiuni lasă implicitele. */
function formularSalvat(): FormularRetea {
  try {
    const x: unknown = JSON.parse(citeste(CHEIE_RETEA) ?? 'null');
    if (typeof x !== 'object' || x === null) return FORMULAR_RETEA;
    const o = x as Record<string, unknown>;
    const text = (k: keyof FormularRetea): string => (typeof o[k] === 'string' ? (o[k] as string) : (FORMULAR_RETEA[k] as string));
    return {
      fel: o.fel === 'cerc' ? 'cerc' : 'grila', coloane: text('coloane'), randuri: text('randuri'), spatiuX: text('spatiuX'), spatiuY: text('spatiuY'),
      numar: text('numar'), centruX: text('centruX'), centruY: text('centruY'), unghi: text('unghi'), roteste: o.roteste !== false,
    };
  } catch {
    return FORMULAR_RETEA;
  }
}

/**
 * Vederea 3D (ADR 0057): o bucată la cerere a modulului ăstuia, cu WebGL-ul și calculul ei; adusă abia la primul clic pe
 * „3D”. Dacă nu vine (rețea, o versiune nouă publicată între timp), se spune, în locul plăcii.
 */
const Vedere3D = lazy(() => import('./Vedere3D.tsx').then((m) => ({ default: m.Vedere3D }), () => ({
  default: ({ zona }: { readonly zona: Zona }) => (
    <span className="cip cip-rosu" role="status" data-testid="vedere-3d-neincarcata" style={{ position: 'absolute', left: zona.x + 8, top: zona.y + 8, pointerEvents: 'auto' }}>
      {t('editare.3d.neincarcata')}
    </span>
  ),
})));

/**
 * Manualul (documentația live, ADR 0058): fereastra lui, adusă la primul „?” sau F1. Dacă nu vine, se spune, sus pe
 * ecran, până la clic.
 */
const Manual = lazy(() => import('./Manual.tsx').then((m) => ({ default: m.Manual }), () => ({
  default: ({ onInchide }: { readonly onInchide: () => void }) => (
    <button type="button" className="cip cip-rosu" role="status" data-testid="manual-neincarcat" onClick={onInchide}
      style={{ position: 'fixed', left: '50%', top: 96, translate: '-50% 0', zIndex: 20, pointerEvents: 'auto' }}>
      {t('editare.manual.neincarcat')}
    </button>
  ),
})));

/**
 * Ușa interfeței de acum, pentru ajutorul după context (F1): o fereastră a aplicației deschisă (exportul, importul,
 * paleta), apoi vederea 3D, altfel unealta aleasă. Id-urile sunt cele din `%% acopera:` ale manualului.
 */
function usaDeAcum(unealta: Unealta, vedere3d: boolean): string {
  if (document.querySelector('[aria-labelledby="export-titlu"]')) return 'export.gcode';
  if (document.querySelector('[aria-labelledby="import-titlu"]')) return 'import.svg';
  if (document.querySelector('.paleta[role="dialog"]')) return 'vedere.paleta';
  if (vedere3d) return 'editare.3d';
  return `unealta.${unealta}`;
}
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

type Extra = Partial<Pick<ContextDocument, 'ghidajeNoi' | 'deplasari' | 'deplasare' | 'formaNoua' | 'transformare' | 'alese' | 'retea' | 'formaEditata'>>;

/** Ca la pânză: cât de departe de contur prinde un clic (px) și de la cât începe o tragere (px). */
const TOLERANTA_CLIC_PX = 4;
const PRAG_CADRU_PX = 3;
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
  // Vederea 3D (ADR 0057): în locul pânzei 2D, cât e pornită; nu se ține minte (ar porni o simulare la fiecare pornire).
  const [vedere3d, setVedere3d] = useState(false);
  const vedere3dRef = useRef(vedere3d);
  vedere3dRef.current = vedere3d;
  // Copierea în rețea (ADR 0061): panoul din extensia barei, formularul lui (ținut în browser) și rețeaua citită din el.
  const [panouRetea, setPanouRetea] = useState(false);
  const panouReteaRef = useRef(panouRetea);
  panouReteaRef.current = panouRetea;
  const [formRetea, setFormRetea] = useState<FormularRetea>(formularSalvat);
  const scrieFormular = (f: FormularRetea): void => { setFormRetea(f); scrieLocal(CHEIE_RETEA, JSON.stringify(f)); };
  // Offsetul (ADR 0064): panoul din extensia barei, formularul lui (în browser) și calculul, adus la prima deschidere.
  const [panouOffset, setPanouOffset] = useState(false);
  const panouOffsetRef = useRef(panouOffset);
  panouOffsetRef.current = panouOffset;
  const [formOffset, setFormOffset] = useState<FormularOffset>(offsetSalvat);
  const scrieOffset = (f: FormularOffset): void => { setFormOffset(f); scrieLocal(CHEIE_OFFSET, JSON.stringify(f)); };
  const [modOffset, setModOffset] = useState<ModulOffset | 'eroare' | null>(null);
  useEffect(() => {
    if (!panouOffset || (modOffset !== null && modOffset !== 'eroare')) return;
    let viu = true;
    import('./offsetCalcul.ts').then((m) => { if (viu) setModOffset(m); }, () => { if (viu) setModOffset('eroare'); });
    return () => { viu = false; };
  }, [panouOffset, modOffset]);
  const rezOffset = useMemo(() => {
    if (!panouOffset || modOffset === null || modOffset === 'eroare') return null;
    const d = citesteNumar(formOffset.distanta);
    return d === null ? ('distanta' as const) : modOffset.offsetSelectie(doc, selectie, formOffset.sens === 'exterior' ? d : -d);
  }, [panouOffset, modOffset, formOffset, doc, selectie]);
  // Manualul deschis, cu ușa de la deschidere (capitolul ei); `null`: închis.
  const [manual, setManual] = useState<{ readonly usa: string | null } | null>(null);
  const unealtaRef = useRef<Unealta>('selectie');
  // Locul uneltelor din bara de sus (ADR 0052): îl desenează aplicația, iar modulul ăsta îl umple, printr-un portal.
  const [loc, setLoc] = useState<HTMLElement | null>(null);
  const [locExtensie, setLocExtensie] = useState<HTMLElement | null>(null);
  // Locul tipurilor nodului ales (ADR 0063), în bara de sus, cât unealta Noduri e aleasă.
  const [locNoduri, setLocNoduri] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setLoc(document.getElementById('loc-unelte')); setLocExtensie(document.getElementById('loc-extensie')); });
  const [liniiDesen, setLiniiDesen] = useState<readonly LinieGhid[]>([]);
  // Liniile de aliniere ale mânerului lipit (ADR 0055), cât se trage.
  const [liniiManere, setLiniiManere] = useState<readonly LinieGhid[]>([]);
  const tinteToate = useMemo(() => tinteFoaie(doc, new Set(), true), [doc]);
  // Gestul îl dă pânza printr-o funcție stabilă; starea de acum o citește de aici (fără închideri vechi).
  const scrieRaza = (r: number): void => { setRaza(r); setTextRaza(textNumar(r)); scrieLocal(CHEIE_RAZA, String(r)); };
  unealtaRef.current = unealta;
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
      // F1 (ADR 0058): manualul, la capitolul de acum, de oriunde (și peste o fereastră a aplicației); altfel Edge și-ar
      // deschide propriul ajutor.
      if (e.key === 'F1') {
        e.preventDefault();
        setManual({ usa: usaDeAcum(unealtaRef.current, vedere3dRef.current) });
        return;
      }
      const tinta = e.target;
      const peCorp = tinta === document.body || tinta === document.documentElement;
      // Pe pânză sau în bara uneltelor (după un clic pe „Aliniază”, săgețile continuă), dar nu într-un câmp.
      const pePanza = tinta instanceof Element && tinta.closest('.panza-cutie, .bara-editare, .extensie') !== null
        && tinta.closest('input, textarea, select, [contenteditable="true"]') === null;
      if (!peCorp && !pePanza) return;
      // În vederea 3D, tastele uneltelor și săgețile nu ating documentul (nu s-ar vedea); Escape întoarce la 2D.
      if (vedere3dRef.current) {
        if (e.key === 'Escape') setVedere3d(false);
        return;
      }
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
        // Întâi panoul deschis (rețeaua, ADR 0061; offsetul, ADR 0064), apoi forma începută, apoi unealta.
        if (panouReteaRef.current) setPanouRetea(false);
        else if (panouOffsetRef.current) setPanouOffset(false);
        else if (acum.current.a) gestDesen('anulat', 0, 0, 1, { alt: false, shift: false });
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

  // Cadrul de selecție (ADR 0059), cu uneltele Selecție și Transformare: o apăsare pe gol (sau cu Shift oriunde) e a lui;
  // pânza nu o mai primește. Trasă spre dreapta, fereastra; spre stânga, intersecția. Un clic pe gol golește selecția, iar
  // Shift + clic pe o formă o adaugă sau o scoate. Apăsarea pe o formă, fără Shift, rămâne a pânzei (alegerea și mutarea);
  // cea pe un mâner, a mânerelor.
  const [cadru, setCadru] = useState<{ readonly a: Punct; readonly b: Punct } | null>(null);
  const pentruCadru = useRef({ unealta, vedere3d, selectie, doc, vedere, cutie, ruleaza });
  pentruCadru.current = { unealta, vedere3d, selectie, doc, vedere, cutie, ruleaza };
  useEffect(() => {
    const el = radacina.current;
    const panza = el?.closest('.panza-cutie')?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !panza) return undefined;
    let spatiu = false;
    let g: { readonly id: number; readonly a: Punct; readonly ecran: Punct; readonly lovita: string | null; readonly shift: boolean; tras: boolean } | null = null;
    const local = (e: { clientX: number; clientY: number }): Punct => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const apasa = (e: PointerEvent): void => {
      const s = pentruCadru.current;
      if (e.target !== panza || e.button !== 0 || spatiu || e.defaultPrevented || s.vedere3d || (s.unealta !== 'selectie' && s.unealta !== 'transformare')) return;
      const p = local(e), v = s.vedere;
      if (s.unealta === 'transformare' && s.cutie && s.selectie.length > 0 && manerLovit(s.cutie, v, p.x, p.y)) return;
      const lovita = instantaLa(s.doc, (p.x - v.tx) / v.scara, (v.ty - p.y) / v.scara, TOLERANTA_CLIC_PX / v.scara);
      if (lovita && !e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      panza.setPointerCapture(e.pointerId);
      g = { id: e.pointerId, a: p, ecran: { x: e.clientX, y: e.clientY }, lovita, shift: e.shiftKey, tras: false };
    };
    const misca = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.id) return;
      if (!g.tras && Math.hypot(e.clientX - g.ecran.x, e.clientY - g.ecran.y) < PRAG_CADRU_PX) return;
      g.tras = true;
      setCadru({ a: g.a, b: local(e) });
    };
    const elibereaza = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.id) return;
      const x = g;
      g = null;
      setCadru(null);
      const s = pentruCadru.current;
      let noi: string[];
      if (!x.tras) {
        if (x.shift && !x.lovita) return;
        noi = x.shift && x.lovita ? comutaInSelectie(s.selectie, x.lovita) : [];
      } else {
        const b = local(e), v = s.vedere;
        const r = {
          minX: (Math.min(x.a.x, b.x) - v.tx) / v.scara, maxX: (Math.max(x.a.x, b.x) - v.tx) / v.scara,
          minY: (v.ty - Math.max(x.a.y, b.y)) / v.scara, maxY: (v.ty - Math.min(x.a.y, b.y)) / v.scara,
        };
        const prinse = aleseInCadru(s.doc, r, felCadru(x.a.x, b.x));
        noi = x.shift ? adaugaLaSelectie(s.selectie, prinse) : prinse;
      }
      s.ruleaza('selectie.din-lista', { alese: () => noi });
    };
    const anuleaza = (): void => {
      g = null;
      setCadru(null);
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
    };
  }, []);

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
  // Cutia tuturor formelor foii, pentru liniile de cotă ale riglelor (ADR 0060).
  const cutieForme = useMemo(() => cutieFormelor(doc), [doc]);
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
      {manual ? (
        <Suspense fallback={null}>
          <Manual usa={manual.usa} onInchide={() => { setManual(null); }} />
        </Suspense>
      ) : null}
      {vedere3d ? (
        <Suspense fallback={null}>
          <Vedere3D doc={doc} marime={marime} zona={zona} onInchide={() => { setVedere3d(false); }} />
        </Suspense>
      ) : null}
      {foaie && !vedere3d ? (
        <Rigle
          vedere={vedere} latime={marime.latime} inaltime={marime.inaltime} zona={zona} foaie={foaie.stoc} forme={cutieForme}
          ghidaje={ghidaje} linii={liniiDesen.length > 0 || liniiManere.length > 0 ? [...p.linii, ...liniiDesen, ...liniiManere] : p.linii} grila={pasGrila} lipestePoz={lipestePoz} doarCitire={p.doarCitire}
          onNou={(axa, poz) => { scrieGhidaje([...ghidaje, { id: idGhidaj(ghidaje), axa, poz }]); }}
          onMuta={(id, poz) => { scrieGhidaje(ghidaje.map((g) => (g.id === id ? { ...g, poz } : g))); }}
          onSterge={(id) => { scrieGhidaje(ghidaje.filter((g) => g.id !== id)); }}
          eticheta={(cheie, poz) => (cheie === 'sus' ? t('editare.rigla-sus') : cheie === 'stanga' ? t('editare.rigla-stanga')
            : cheie === 'poz' ? t('editare.ghidaj', { poz: poz ?? '' }) : t(`editare.${cheie}`, { mm: poz ?? '' }))}
          textPoz={(poz) => textNumar(Math.round(poz * 1000) / 1000, true)}
          citestePoz={(s) => citesteNumar(s, true)}
        />
      ) : null}
      {unealta === 'transformare' && cutie && !p.doarCitire && selectie.length > 0 && !vedere3d ? (
        <Manere cutie={cutie} vedere={vedere} doc={doc} selectie={selectie}
          aplica={(tr) => { ruleaza('document.transforma', { transformare: () => tr }); }}
          lipire={(alt) => (lipire !== alt
            ? (q) => lipeste(tinte, { minX: q.x, minY: q.y, maxX: q.x, maxY: q.y }, 0, 0, { toleranta: TOLERANTA_LIPIRE_PX / vedere.scara, grila: pasGrila })
            : null)}
          onLinii={setLiniiManere} />
      ) : null}
      {panouRetea && cutie && selectie.length > 0 && !vedere3d ? (() => {
        // Previzualizarea copiilor: cutia selecției mutată de fiecare copie, punctată.
        const r = citesteRetea(formRetea, foaie?.stoc ?? { latime: 0, inaltime: 0 });
        if (typeof r === 'string') return null;
        const colturi = [{ x: cutie.minX, y: cutie.minY }, { x: cutie.maxX, y: cutie.minY }, { x: cutie.maxX, y: cutie.maxY }, { x: cutie.minX, y: cutie.maxY }];
        const ecran = (q: { x: number; y: number }): string => `${vedere.tx + q.x * vedere.scara},${vedere.ty - q.y * vedere.scara}`;
        return (
          <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="retea-previzualizare">
            {copiiRetea(cutie, r).map((k, i) => <polygon key={i} className="retea-copie" points={colturi.map((q) => ecran(punctulCopiei(q, k))).join(' ')} />)}
          </svg>
        );
      })() : null}
      {rezOffset !== null && typeof rezOffset !== 'string' && !vedere3d ? (
        // Previzualizarea offsetului: contururile noi, punctate, cât panoul e deschis.
        <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="offset-previzualizare"
          data-contururi={rezOffset.contururi.length}>
          {rezOffset.contururi.map((k, i) => <path key={i} className="offset-previzualizare" d={drumSvg(k, vedere)} />)}
        </svg>
      ) : null}
      {cadru ? (
        <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="cadru-selectie" data-fel={felCadru(cadru.a.x, cadru.b.x)}>
          <rect className={`cadru-${felCadru(cadru.a.x, cadru.b.x)}`} x={Math.min(cadru.a.x, cadru.b.x) + 0.5} y={Math.min(cadru.a.y, cadru.b.y) + 0.5}
            width={Math.abs(cadru.b.x - cadru.a.x)} height={Math.abs(cadru.b.y - cadru.a.y)} />
        </svg>
      ) : null}
      {unealta === 'noduri' && !vedere3d ? (
        <Noduri doc={doc} selectie={selectie} vedere={vedere} marime={marime} zona={zona} doarCitire={p.doarCitire}
          lipire={(alt) => (lipire !== alt
            ? (q) => lipeste(tinte, { minX: q.x, minY: q.y, maxX: q.x, maxY: q.y }, 0, 0, { toleranta: TOLERANTA_LIPIRE_PX / vedere.scara, grila: pasGrila })
            : null)}
          onLinii={setLiniiManere} locBara={locNoduri}
          aplica={(f) => { ruleaza('document.forma', { formaEditata: () => f }); }} />
      ) : null}
      {unealta === 'pen' && !vedere3d && !p.doarCitire ? (
        <Pen vedere={vedere} marime={marime} zona={zona}
          lipire={(alt) => (lipire !== alt
            ? (q) => lipeste(tinteToate, { minX: q.x, minY: q.y, maxX: q.x, maxY: q.y }, 0, 0, { toleranta: TOLERANTA_LIPIRE_PX / vedere.scara, grila: pasGrila })
            : null)}
          onLinii={setLiniiManere}
          termina={(f) => { ruleaza('document.deseneaza', { formaNoua: () => f }); }} />
      ) : null}
      {traseu && deseneaza(unealta) && !vedere3d ? (
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
        const copiereSectiune = (
          <span className="sectiune-extensie sectiune-retea" role="toolbar" aria-label={t('editare.copiere')} data-testid="extensie-copiere">
            <button type="button" className="aliniaza" aria-expanded={panouRetea} aria-controls="panou-retea" title={t('editare.retea')} aria-label={t('editare.retea')}
              data-editare="retea" onClick={() => { setPanouRetea(!panouRetea); setPanouOffset(false); }}>
              <IconaRetea />
            </button>
            {panouRetea ? (
              <PanouRetea form={formRetea} onForm={scrieFormular} foaie={foaie?.stoc ?? { latime: 0, inaltime: 0 }}
                motivActiune={(r) => motivCopiereRetea(doc, selectie, r, p.doarCitire)}
                onCopiaza={(r) => { ruleaza('document.copiaza-in-retea', { retea: () => r }); setPanouRetea(false); }}
                onInchide={() => { setPanouRetea(false); }} />
            ) : null}
          </span>
        );
        const offsetSectiune = (
          <span className="sectiune-extensie sectiune-retea" role="toolbar" aria-label={t('editare.offset.sectiune')} data-testid="extensie-offset">
            <button type="button" className="aliniaza" aria-expanded={panouOffset} aria-controls="panou-offset" title={t('editare.offset')} aria-label={t('editare.offset')}
              data-editare="offset" onClick={() => { setPanouOffset(!panouOffset); setPanouRetea(false); }}>
              <IconaOffset />
            </button>
            {panouOffset ? (
              <PanouOffset form={formOffset} onForm={scrieOffset} rez={modOffset === 'eroare' ? 'eroare' : rezOffset}
                motivActiune={(f) => motivDesen(doc, f, p.doarCitire)}
                onAplica={(f) => { ruleaza('document.deseneaza', { formaNoua: () => f }); setPanouOffset(false); }}
                onInchide={() => { setPanouOffset(false); }} />
            ) : null}
          </span>
        );
        const vedereSectiune = (
          <span className="sectiune-extensie" role="toolbar" aria-label={t('editare.3d')} data-testid="extensie-vedere">
            <button type="button" className="aliniaza vedere-3d-buton" aria-pressed={vedere3d} title={vedere3d ? t('editare.3d.ascunde') : t('editare.3d.arata')}
              aria-label={vedere3d ? t('editare.3d.ascunde') : t('editare.3d.arata')} data-editare="vedere-3d" onClick={() => { setVedere3d(!vedere3d); }}>
              3D
            </button>
          </span>
        );
        const ajutorSectiune = (
          <span className="sectiune-extensie" role="toolbar" aria-label={t('editare.manual.sectiune')} data-testid="extensie-ajutor">
            <button type="button" className="aliniaza manual-buton" title={t('editare.manual')} aria-label={t('editare.manual')} data-editare="manual"
              onClick={() => { setManual({ usa: null }); }}>
              ?
            </button>
          </span>
        );
        const sectiuni = (
          <>
            {aliniereSectiune}
            <span className="separator" aria-hidden="true" />
            {oglindireSectiune}
            <span className="separator" aria-hidden="true" />
            {copiereSectiune}
            {offsetSectiune}
            <span className="separator" aria-hidden="true" />
            {vedereSectiune}
            <span className="separator" aria-hidden="true" />
            {ajutorSectiune}
          </>
        );
        const bara = (
          <div className={loc ? 'bara-editare bara-sus' : 'bara-editare'} role="toolbar" aria-label={t('editare.bara')} data-testid="bara-editare"
            style={loc ? undefined : { left: zona.x + GROSIME_RIGLA + 8, top: zona.y + zona.h - 52 }}>
            {UNELTE.map((u) => {
              const titlu = t(`editare.unealta.${u}`);
              return (
                <button key={u} type="button" className="unealta aliniaza" aria-pressed={unealta === u} title={titlu} aria-label={titlu} data-unealta={u}
                  disabled={p.doarCitire && u !== 'selectie'} onClick={() => { setUnealta(u); setVedere3d(false); }}>
                  <IconaUnealta u={u} />
                </button>
              );
            })}
            {unealta === 'noduri' ? <span className="loc-noduri" ref={setLocNoduri} /> : null}
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
    pen: (
      <>
        <path className="contur" d="M8 1.5 L12.5 8.5 L8 14.5 L3.5 8.5 Z M8 1.5 V7.2" />
        <circle cx="8" cy="8.6" r="1.3" />
      </>
    ),
    noduri: (
      <>
        <path className="contur" d="M3 12 L6 4 L13 6" />
        <rect x="1.5" y="10.5" width="3" height="3" /><rect x="4.5" y="2.5" width="3" height="3" /><rect x="11.5" y="4.5" width="3" height="3" />
      </>
    ),
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

/**
 * Unealta Noduri (ADR 0062): pe forma aleasă singură (piesa doar a ei, un singur element), nodurile căii ei, de apucat.
 * Tragerea mută nodul (cu lipirea, liniile de aliniere), dublu clic pe o latură adaugă un nod, Delete (sau Backspace) scoate
 * nodul ales, Esc îl lasă. Forma nouă pleacă prin `document.forma`; dreptunghiul și cercul devin căi la prima schimbare.
 * Apăsările pe noduri nu mai ajung la pânză (nici alegerea, nici mutarea); restul, da.
 */
function Noduri({ doc, selectie, vedere, marime, zona, doarCitire, lipire, onLinii, locBara, aplica: aplicaForma }: {
  readonly doc: Document;
  readonly selectie: readonly string[];
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
  readonly zona: Zona;
  readonly doarCitire: boolean;
  readonly lipire: (alt: boolean) => ((p: Punct) => ReturnType<typeof lipeste>) | null;
  readonly onLinii: (l: readonly LinieGhid[]) => void;
  /** Locul din bara de sus în care stau tipurile nodului ales (ADR 0063). */
  readonly locBara: HTMLElement | null;
  readonly aplica: (f: FormaCale) => void;
}): ReactElement {
  const f = formaNoduri(doc, selectie);
  const cale = typeof f === 'string' ? null : caleDinForma(f.forma);
  const [ales, setAles] = useState<number | null>(null);
  const [tras, setTras] = useState<FormaCale | null>(null);
  const [motiv, setMotiv] = useState<string | null>(null);
  // Altă formă aleasă: nodul ales și motivul se lasă (o schimbare a formei de acum le păstrează).
  useEffect(() => { setAles(null); setMotiv(null); }, [selectie.join(' '), typeof f === 'string' ? f : f.instanta]);
  const radacina = useRef<HTMLDivElement | null>(null);
  const acum = useRef({ f, cale, vedere, ales, doarCitire, lipire, onLinii, aplicaForma });
  acum.current = { f, cale, vedere, ales, doarCitire, lipire, onLinii, aplicaForma };
  useEffect(() => {
    const el = radacina.current;
    const panza = el?.closest('.panza-cutie')?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !panza) return undefined;
    // Gestul: nodul apucat, sau mânerul lui (`parte`).
    let g: { readonly i: number; readonly id: number; readonly ecran: Punct; readonly parte: ParteNod | null } | null = null;
    const local = (e: { clientX: number; clientY: number }): Punct => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const inLume = (q: Punct): Punct => ({ x: (q.x - acum.current.vedere.tx) / acum.current.vedere.scara, y: (acum.current.vedere.ty - q.y) / acum.current.vedere.scara });
    /** Locul nou al nodului, în coordonatele elementului: punctul lumii lipit (sau rotunjit la 0,001 mm), prin inversa matricei. */
    const tinta = (e: PointerEvent): { readonly la: Punct; readonly linii: readonly LinieGhid[] } | null => {
      const s = acum.current;
      if (typeof s.f === 'string') return null;
      const inv = inversa(s.f.matrice);
      if (!inv) return null;
      const w = inLume(local(e));
      const l = s.lipire(e.altKey);
      const r = l ? l(w) : null;
      const rot = (v: number): number => Math.round(v * 1000) / 1000;
      const q = r && r.linii.length > 0
        ? { x: r.linii.some((x) => x.axa === 'x') ? w.x + r.dx : rot(w.x), y: r.linii.some((x) => x.axa === 'y') ? w.y + r.dy : rot(w.y) }
        : { x: rot(w.x), y: rot(w.y) };
      return { la: aplica(inv, q), linii: r?.linii ?? [] };
    };
    /** Locul nou al unui mâner, în coordonatele elementului: punctul lumii rotunjit la 0,001 mm (mânerele nu se lipesc). */
    const locManer = (e: PointerEvent): Punct | null => {
      const s = acum.current;
      const inv = typeof s.f === 'string' ? null : inversa(s.f.matrice);
      if (!inv) return null;
      const w = inLume(local(e));
      return aplica(inv, { x: Math.round(w.x * 1000) / 1000, y: Math.round(w.y * 1000) / 1000 });
    };
    const apasa = (e: PointerEvent): void => {
      const s = acum.current;
      if (e.target !== panza || e.button !== 0 || !s.cale || typeof s.f === 'string') return;
      const p = local(e);
      // Întâi mânerele nodului ales (stau peste vecini), apoi nodurile.
      if (s.ales !== null && !s.doarCitire) {
        const m = manereNod(s.cale, s.ales), matrice = s.f.matrice;
        const parte = (['inainte', 'inapoi'] as const).find((k) => {
          const q = m[k];
          return q !== null && nodLovit(noduriPeEcran([{ p: q }], matrice, s.vedere), p.x, p.y, 6) === 0;
        });
        if (parte) {
          e.preventDefault();
          e.stopPropagation();
          panza.setPointerCapture(e.pointerId);
          setMotiv(null);
          g = { i: s.ales, id: e.pointerId, ecran: { x: e.clientX, y: e.clientY }, parte };
          return;
        }
      }
      const i = nodLovit(noduriPeEcran(s.cale.varfuri, s.f.matrice, s.vedere), p.x, p.y, 6);
      if (i === null) return;
      e.preventDefault();
      e.stopPropagation();
      panza.setPointerCapture(e.pointerId);
      setAles(i);
      setMotiv(null);
      g = { i, id: e.pointerId, ecran: { x: e.clientX, y: e.clientY }, parte: null };
    };
    const misca = (e: PointerEvent): void => {
      const s = acum.current;
      if (!g || e.pointerId !== g.id || !s.cale || s.doarCitire) return;
      if (Math.hypot(e.clientX - g.ecran.x, e.clientY - g.ecran.y) < 3) return;
      if (g.parte) {
        const la = locManer(e);
        if (la) setTras(mutaManer(s.cale, g.i, g.parte, la, e.altKey));
        return;
      }
      const r = tinta(e);
      if (!r) return;
      setTras(mutaNod(s.cale, g.i, r.la));
      s.onLinii(r.linii);
    };
    const elibereaza = (e: PointerEvent): void => {
      const s = acum.current;
      if (!g || e.pointerId !== g.id) return;
      const x = g;
      g = null;
      setTras(null);
      s.onLinii([]);
      if (!s.cale || s.doarCitire || Math.hypot(e.clientX - x.ecran.x, e.clientY - x.ecran.y) < 3) return;
      if (x.parte) {
        const la = locManer(e);
        if (la) s.aplicaForma(mutaManer(s.cale, x.i, x.parte, la, e.altKey));
        return;
      }
      const r = tinta(e);
      if (r) s.aplicaForma(mutaNod(s.cale, x.i, r.la));
    };
    const dublu = (e: MouseEvent): void => {
      const s = acum.current;
      if (e.target !== panza || !s.cale || typeof s.f === 'string' || s.doarCitire) return;
      const p = local(e);
      if (nodLovit(noduriPeEcran(s.cale.varfuri, s.f.matrice, s.vedere), p.x, p.y, 6) !== null) return;
      const lat = laturaLovita(conturNoduri(s.cale, s.f.matrice), inLume(p), 6 / s.vedere.scara);
      if (!lat || lat.t <= 1e-6 || lat.t >= 1 - 1e-6) return;
      e.preventDefault();
      e.stopPropagation();
      s.aplicaForma(adaugaNod(s.cale, lat.i, lat.t));
      setAles(lat.i + 1);
      setMotiv(null);
    };
    const tasta = (e: KeyboardEvent): void => {
      const s = acum.current;
      if (s.ales === null || !s.cale || e.ctrlKey || e.metaKey) return;
      const tinta = e.target;
      if (tinta instanceof Element && tinta.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], dialog') !== null) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setAles(null);
        return;
      }
      if ((e.key !== 'Delete' && e.key !== 'Backspace') || s.doarCitire) return;
      // Delete e și scurtătura aplicației (Șterge selecția): cu un nod ales, e a nodului.
      e.preventDefault();
      e.stopImmediatePropagation();
      const r = stergeNod(s.cale, s.ales);
      if (typeof r === 'string') {
        setMotiv(t(`editare.noduri.${r}`));
        return;
      }
      s.aplicaForma(r);
      setAles(null);
      setMotiv(null);
    };
    const anuleaza = (): void => { g = null; setTras(null); acum.current.onLinii([]); };
    window.addEventListener('pointerdown', apasa, true);
    window.addEventListener('pointermove', misca, true);
    window.addEventListener('pointerup', elibereaza, true);
    window.addEventListener('pointercancel', anuleaza, true);
    window.addEventListener('dblclick', dublu, true);
    window.addEventListener('keydown', tasta, true);
    return () => {
      window.removeEventListener('pointerdown', apasa, true);
      window.removeEventListener('pointermove', misca, true);
      window.removeEventListener('pointerup', elibereaza, true);
      window.removeEventListener('pointercancel', anuleaza, true);
      window.removeEventListener('dblclick', dublu, true);
      window.removeEventListener('keydown', tasta, true);
      acum.current.onLinii([]);
    };
  }, []);

  const sfat = typeof f === 'string' ? t(`editare.noduri.${f}`) : motiv ?? t('editare.noduri.sfat');
  const vizibila = tras ?? cale;
  const tipAles = vizibila && ales !== null && ales < vizibila.varfuri.length ? tipNod(vizibila, ales) : null;
  // Tipul nodului ales (ADR 0063): colț, curbă pe ambele părți, curbă pe o parte; refuzul (un arc vecin, capătul unei căi
  // deschise) se spune în sfat. O cerere care nu schimbă nimic nu face un pas de anulare.
  const schimba = (tip: TipCerut): void => {
    if (ales === null || !cale || doarCitire) return;
    const r = schimbaTipNod(cale, ales, tip);
    if (typeof r === 'string') {
      setMotiv(t(`editare.noduri.${r}`));
      return;
    }
    setMotiv(null);
    if (JSON.stringify(r.varfuri) !== JSON.stringify(cale.varfuri)) aplicaForma(r);
  };
  const fara = tipAles === null || doarCitire;
  const manere = vizibila && ales !== null && tipAles !== null && typeof f !== 'string' ? manereNod(vizibila, ales) : null;
  return (
    <div className="noduri" ref={radacina} data-testid="noduri" data-noduri={vizibila && typeof f !== 'string' ? vizibila.varfuri.length : 0} data-ales={ales ?? undefined}
      data-tip={tipAles ?? undefined}>
      {vizibila && typeof f !== 'string' ? (
        <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true">
          <path className="drum-noduri" d={drumSvg(conturNoduri(vizibila, f.matrice), vedere)} />
          {manere && ales !== null ? (['inapoi', 'inainte'] as const).map((k) => {
            const q = manere[k];
            if (!q) return null;
            const [n, m] = noduriPeEcran([vizibila.varfuri[ales]!, { p: q }], f.matrice, vedere);
            return (
              <g key={k}>
                <line className="maner-linie" x1={n!.x} y1={n!.y} x2={m!.x} y2={m!.y} />
                <circle className="maner-nod" cx={m!.x} cy={m!.y} r={3.5} data-maner={k} />
              </g>
            );
          }) : null}
          {noduriPeEcran(vizibila.varfuri, f.matrice, vedere).map((q, k) => {
            const cls = k === ales ? 'nod nod-ales' : 'nod';
            // Colțurile, pătrate; nodurile cu curbă, rotunde.
            return tipNod(vizibila, k) === 'colt'
              ? <rect key={k} className={cls} x={q.x - 4} y={q.y - 4} width={8} height={8} data-nod={k} />
              : <circle key={k} className={`${cls} nod-curba`} cx={q.x} cy={q.y} r={4.5} data-nod={k} />;
          })}
        </svg>
      ) : null}
      <span className={motiv ? 'cip cip-atentie noduri-sfat' : 'cip noduri-sfat'} role="status" data-testid="noduri-sfat" style={{ left: zona.x + 8, top: zona.y + zona.h - 44 }}>{sfat}</span>
      {locBara ? createPortal(
        <span className="noduri-tipuri" role="group" aria-label={t('editare.noduri.tipuri')}>
          <button type="button" className="aliniaza" aria-pressed={tipAles === 'colt'} disabled={fara} title={t('editare.noduri.colt')}
            aria-label={t('editare.noduri.colt')} data-editare="nod-colt" onClick={() => { schimba('colt'); }}>
            <IconaTipNod tip="colt" />
          </button>
          <button type="button" className="aliniaza" aria-pressed={tipAles === 'ambele'} disabled={fara} title={t('editare.noduri.ambele')}
            aria-label={t('editare.noduri.ambele')} data-editare="nod-ambele" onClick={() => { schimba('ambele'); }}>
            <IconaTipNod tip="ambele" />
          </button>
          <button type="button" className="aliniaza" aria-pressed={tipAles === 'inainte' || tipAles === 'inapoi'} disabled={fara} title={t('editare.noduri.o-parte')}
            aria-label={t('editare.noduri.o-parte')} data-editare="nod-o-parte" onClick={() => { schimba('o-parte'); }}>
            <IconaTipNod tip="o-parte" />
          </button>
        </span>, locBara) : null}
    </div>
  );
}

/** Pictogramele tipurilor de nod: vârful colțului, curba netedă cu mânerele ei, linia care intră lin în curbă. */
function IconaTipNod({ tip }: { readonly tip: TipCerut }): ReactElement {
  const desen: Record<TipCerut, ReactElement> = {
    colt: <><path className="contur" d="M2.5 13 L8 4 L13.5 13" /><rect x="6.2" y="2.2" width="3.6" height="3.6" /></>,
    ambele: <><path className="contur" d="M2 13 C3.5 5.5 12.5 5.5 14 13 M3 7.2 H13" /><circle cx="8" cy="7.2" r="1.8" /></>,
    'o-parte': <><path className="contur" d="M2 13 L8 7.2 C11 4.2 13.5 8 14 13 M8 7.2 L11 4.2" /><circle cx="8" cy="7.2" r="1.8" /></>,
  };
  return <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{desen[tip]}</svg>;
}

/** Cât de aproape (px pe ecran) de un nod prinde un clic al uneltei Pen. */
const RAZA_NOD_PX = 6;

/**
 * Unealta Pen (ADR 0063): calea pusă nod cu nod, cu tipurile comune uneltei Noduri. Clic = colț; tragere = curbă pe ambele
 * părți (mânerele în oglindă); Shift + tragere = curbă doar înainte (segmentul care vine intră drept). Clic pe ultimul nod îi
 * scoate mânerul de înainte (curba rămâne doar înapoi), tragerea din el îi pune unul nou; clic pe primul nod închide calea
 * (tragerea de acolo îi pune mânerele); Enter sau dublu clic o termină deschisă; Backspace scoate ultimul nod; Esc renunță.
 * Nodurile se lipesc (Alt inversează), mânerele nu. Forma pleacă prin `document.deseneaza`; apăsările pe pânză sunt ale
 * Pen-ului (nu aleg și nu mută), afară de deplasarea cu Space.
 */
function Pen({ vedere, marime, zona, lipire, onLinii, termina }: {
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
  readonly zona: Zona;
  readonly lipire: (alt: boolean) => ((p: Punct) => ReturnType<typeof lipeste>) | null;
  readonly onLinii: (l: readonly LinieGhid[]) => void;
  readonly termina: (f: FormaDesenata) => void;
}): ReactElement {
  const [noduri, setNoduri] = useState<readonly NodCuManere[]>([]);
  // Punctul de sub maus (în lume, lipit), pentru segmentul următor; `null` cât se trage sau în afara pânzei.
  const [cursor, setCursor] = useState<Punct | null>(null);
  const radacina = useRef<HTMLDivElement | null>(null);
  const acum = useRef({ noduri, vedere, lipire, onLinii, termina });
  acum.current = { ...acum.current, vedere, lipire, onLinii, termina };
  useEffect(() => {
    const el = radacina.current;
    const panza = el?.closest('.panza-cutie')?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !panza) return undefined;
    let spatiu = false;
    let g: { readonly id: number; readonly a: Punct; readonly ecran: Punct; readonly fel: 'nou' | 'ultimul' | 'primul'; readonly nod: NodCuManere | null; tras: boolean } | null = null;
    const scrie = (n: readonly NodCuManere[]): void => { acum.current.noduri = n; setNoduri(n); };
    const local = (e: { clientX: number; clientY: number }): Punct => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const rot = (v: number): number => Math.round(v * 1000) / 1000;
    const inLume = (q: Punct): Punct => ({ x: rot((q.x - acum.current.vedere.tx) / acum.current.vedere.scara), y: rot((acum.current.vedere.ty - q.y) / acum.current.vedere.scara) });
    const peEcran = (q: Punct): Punct => ({ x: acum.current.vedere.tx + q.x * acum.current.vedere.scara, y: acum.current.vedere.ty - q.y * acum.current.vedere.scara });
    const aproape = (q: Punct, p: Punct): boolean => { const e = peEcran(q); return Math.hypot(e.x - p.x, e.y - p.y) <= RAZA_NOD_PX; };
    /** Punctul lumii de sub maus, lipit (sau rotunjit la 0,001 mm), cu liniile de aliniere. */
    const lipit = (e: PointerEvent): { readonly q: Punct; readonly linii: readonly LinieGhid[] } => {
      const r0 = el.getBoundingClientRect(), v = acum.current.vedere;
      const w = { x: (e.clientX - r0.left - v.tx) / v.scara, y: (v.ty - (e.clientY - r0.top)) / v.scara };
      const l = acum.current.lipire(e.altKey);
      const r = l ? l(w) : null;
      if (!r || r.linii.length === 0) return { q: { x: rot(w.x), y: rot(w.y) }, linii: [] };
      return { q: { x: r.linii.some((x) => x.axa === 'x') ? w.x + r.dx : rot(w.x), y: r.linii.some((x) => x.axa === 'y') ? w.y + r.dy : rot(w.y) }, linii: r.linii };
    };
    const gata = (inchis: boolean, n: readonly NodCuManere[]): void => {
      const f = formaPen(n, inchis);
      if (f) acum.current.termina(f);
      scrie([]);
      setCursor(null);
      acum.current.onLinii([]);
    };
    const apasa = (e: PointerEvent): void => {
      if (e.target !== panza || e.button !== 0 || spatiu) return;
      e.preventDefault();
      e.stopPropagation();
      panza.setPointerCapture(e.pointerId);
      const n = acum.current.noduri, p = local(e);
      const prim = n[0], ultim = n[n.length - 1];
      const ecranul = { x: e.clientX, y: e.clientY };
      setCursor(null);
      if (prim && n.length >= 2 && aproape(prim.p, p)) {
        g = { id: e.pointerId, a: prim.p, ecran: ecranul, fel: 'primul', nod: prim, tras: false };
      } else if (ultim && aproape(ultim.p, p)) {
        g = { id: e.pointerId, a: ultim.p, ecran: ecranul, fel: 'ultimul', nod: ultim, tras: false };
      } else {
        const r = lipit(e);
        acum.current.onLinii(r.linii);
        g = { id: e.pointerId, a: r.q, ecran: ecranul, fel: 'nou', nod: null, tras: false };
        scrie([...n, nodPus(r.q, null, false)]);
      }
    };
    const misca = (e: PointerEvent): void => {
      const s = acum.current;
      if (!g || e.pointerId !== g.id) {
        if (g || s.noduri.length === 0 || e.target !== panza) return;
        const r = lipit(e);
        setCursor(r.q);
        s.onLinii(r.linii);
        return;
      }
      if (!g.tras && Math.hypot(e.clientX - g.ecran.x, e.clientY - g.ecran.y) < 3) return;
      g.tras = true;
      s.onLinii([]);
      const b = inLume(local(e));
      const n = s.noduri;
      if (g.fel === 'nou') scrie([...n.slice(0, -1), nodPus(g.a, b, e.shiftKey)]);
      else if (g.fel === 'ultimul' && g.nod) scrie([...n.slice(0, -1), { ...g.nod, inainte: b }]);
      else if (g.fel === 'primul' && g.nod) {
        const m = nodPus(g.a, b, e.shiftKey);
        scrie([{ ...m, inapoi: e.shiftKey ? g.nod.inapoi : m.inapoi }, ...n.slice(1)]);
      }
    };
    const elibereaza = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.id) return;
      const x = g;
      g = null;
      acum.current.onLinii([]);
      const n = acum.current.noduri;
      if (x.fel === 'ultimul' && !x.tras && x.nod) scrie([...n.slice(0, -1), { ...x.nod, inainte: null }]);
      else if (x.fel === 'primul' && sePoateInchide(n)) gata(true, n);
    };
    const dublu = (e: MouseEvent): void => {
      if (e.target !== panza || acum.current.noduri.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      gata(false, acum.current.noduri);
    };
    const tasta = (e: KeyboardEvent): void => {
      if (e.code === 'Space') spatiu = e.type === 'keydown';
      const n = acum.current.noduri;
      if (e.type !== 'keydown' || n.length === 0 || e.ctrlKey || e.metaKey) return;
      const tinta = e.target;
      if (tinta instanceof Element && tinta.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], dialog') !== null) return;
      if (e.key !== 'Enter' && e.key !== 'Escape' && e.key !== 'Backspace' && e.key !== 'Delete') return;
      // Cât e o cale începută, tastele sunt ale ei: Esc nu schimbă unealta, Delete nu șterge selecția.
      e.preventDefault();
      e.stopImmediatePropagation();
      g = null;
      if (e.key === 'Enter') gata(false, n);
      else if (e.key === 'Escape') gata(false, []);
      else scrie(n.slice(0, -1));
    };
    const anuleaza = (): void => { g = null; acum.current.onLinii([]); };
    const iese = (): void => { if (!g) setCursor(null); };
    const uita = (): void => { spatiu = false; };
    window.addEventListener('pointerdown', apasa, true);
    window.addEventListener('pointermove', misca, true);
    window.addEventListener('pointerup', elibereaza, true);
    window.addEventListener('pointercancel', anuleaza, true);
    window.addEventListener('dblclick', dublu, true);
    window.addEventListener('keydown', tasta, true);
    window.addEventListener('keyup', tasta, true);
    window.addEventListener('blur', uita);
    panza.addEventListener('pointerleave', iese);
    return () => {
      window.removeEventListener('pointerdown', apasa, true);
      window.removeEventListener('pointermove', misca, true);
      window.removeEventListener('pointerup', elibereaza, true);
      window.removeEventListener('pointercancel', anuleaza, true);
      window.removeEventListener('dblclick', dublu, true);
      window.removeEventListener('keydown', tasta, true);
      window.removeEventListener('keyup', tasta, true);
      window.removeEventListener('blur', uita);
      panza.removeEventListener('pointerleave', iese);
      acum.current.onLinii([]);
    };
  }, []);

  const sx = (x: number): number => vedere.tx + x * vedere.scara;
  const sy = (y: number): number => vedere.ty - y * vedere.scara;
  const ultim = noduri[noduri.length - 1];
  const prim = noduri[0];
  const inchide = cursor !== null && prim !== undefined && noduri.length >= 2 && Math.hypot(sx(prim.p.x) - sx(cursor.x), sy(prim.p.y) - sy(cursor.y)) <= RAZA_NOD_PX;
  // Segmentul următor, de la ultimul nod la maus (cu mânerul de înainte al ultimului nod, dacă are).
  const elastic = ultim && cursor
    ? (ultim.inainte
      ? `M ${sx(ultim.p.x)} ${sy(ultim.p.y)} C ${sx(ultim.inainte.x)} ${sy(ultim.inainte.y)} ${sx(cursor.x)} ${sy(cursor.y)} ${sx(cursor.x)} ${sy(cursor.y)}`
      : `M ${sx(ultim.p.x)} ${sy(ultim.p.y)} L ${sx(cursor.x)} ${sy(cursor.y)}`)
    : null;
  return (
    <div className="pen" ref={radacina} data-testid="pen" data-noduri={noduri.length}>
      {noduri.length > 0 ? (
        <svg className="rigle-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true">
          <path className="drum-pen" d={drumSvg(conturNoduri(caleDinNoduri(noduri, false), IDENTITATE), vedere)} />
          {elastic ? <path className="pen-elastic" d={elastic} /> : null}
          {ultim ? (['inapoi', 'inainte'] as const).map((k) => {
            const q = ultim[k];
            return q ? (
              <g key={k}>
                <line className="maner-linie" x1={sx(ultim.p.x)} y1={sy(ultim.p.y)} x2={sx(q.x)} y2={sy(q.y)} />
                <circle className="maner-nod" cx={sx(q.x)} cy={sy(q.y)} r={3.5} />
              </g>
            ) : null;
          }) : null}
          {noduri.map((n, k) => {
            const cls = k === 0 && inchide ? 'nod nod-ales' : 'nod';
            return n.inapoi || n.inainte
              ? <circle key={k} className={`${cls} nod-curba`} cx={sx(n.p.x)} cy={sy(n.p.y)} r={4.5} />
              : <rect key={k} className={cls} x={sx(n.p.x) - 4} y={sy(n.p.y) - 4} width={8} height={8} />;
          })}
        </svg>
      ) : null}
      <span className="cip noduri-sfat" role="status" data-testid="pen-sfat" style={{ left: zona.x + 8, top: zona.y + zona.h - 44 }}>{t('editare.pen.sfat')}</span>
    </div>
  );
}

/** Copierea în rețea (ADR 0061): patru pătrate, unul plin (originalul) și trei în contur (copiile). */
function IconaRetea(): ReactElement {
  return (
    <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="9" width="5.5" height="5.5" />
      <rect x="9" y="9" width="5.5" height="5.5" className="contur" />
      <rect x="1.5" y="1.5" width="5.5" height="5.5" className="contur" />
      <rect x="9" y="1.5" width="5.5" height="5.5" className="contur" />
    </svg>
  );
}

/**
 * Panoul copierii în rețea (ADR 0061), sub butonul lui din extensia barei: felul (rânduri și coloane, sau pe cerc), câmpurile,
 * motivul pentru care nu se poate (valorile, sau verdictul acțiunii: nicio selecție, doar citire, plafonul, prea departe) și
 * Copiază. Esc îl închide.
 */
function PanouRetea({ form, onForm, foaie, motivActiune, onCopiaza, onInchide }: {
  readonly form: FormularRetea;
  readonly onForm: (f: FormularRetea) => void;
  readonly foaie: { readonly latime: number; readonly inaltime: number };
  readonly motivActiune: (r: Retea) => CheieSimpla | null;
  readonly onCopiaza: (r: Retea) => void;
  readonly onInchide: () => void;
}): ReactElement {
  const r = citesteRetea(form, foaie);
  const motiv = typeof r === 'string' ? t(`editare.retea.motiv.${r}`) : (() => {
    const m = motivActiune(r);
    return m === 'motiv.nicio-selectie' ? t('editare.retea.nicio-selectie') : m ? t(m) : null;
  })();
  const camp = (k: 'coloane' | 'randuri' | 'spatiuX' | 'spatiuY' | 'numar' | 'centruX' | 'centruY' | 'unghi', eticheta: string, loc?: string): ReactElement => (
    <label className="camp-retea">
      <span>{eticheta}</span>
      <input value={form[k]} inputMode="decimal" placeholder={loc} data-retea={k} onChange={(e) => { onForm({ ...form, [k]: e.target.value }); }} />
    </label>
  );
  return (
    <div className="insula panou-retea" id="panou-retea" role="group" aria-label={t('editare.retea')} data-testid="panou-retea"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onInchide();
      }}>
      <div className="fel-retea" role="radiogroup" aria-label={t('editare.copiere')}>
        {(['grila', 'cerc'] as const).map((f) => (
          <button key={f} type="button" role="radio" aria-checked={form.fel === f} aria-pressed={form.fel === f} data-retea-fel={f}
            onClick={() => { onForm({ ...form, fel: f }); }}>
            {t(`editare.retea.${f}`)}
          </button>
        ))}
      </div>
      {form.fel === 'grila' ? (
        <div className="campuri-retea">
          {camp('coloane', t('editare.retea.coloane'))}
          {camp('randuri', t('editare.retea.randuri'))}
          {camp('spatiuX', t('editare.retea.spatiu-x'))}
          {camp('spatiuY', t('editare.retea.spatiu-y'))}
        </div>
      ) : (
        <div className="campuri-retea">
          {camp('numar', t('editare.retea.numar'))}
          {camp('unghi', t('editare.retea.unghi'))}
          {camp('centruX', t('editare.retea.centru-x'), textNumar(foaie.latime / 2, true))}
          {camp('centruY', t('editare.retea.centru-y'), textNumar(foaie.inaltime / 2, true))}
          <label className="bifa-retea">
            <input type="checkbox" checked={form.roteste} data-retea="roteste" onChange={(e) => { onForm({ ...form, roteste: e.target.checked }); }} />
            <span>{t('editare.retea.roteste')}</span>
          </label>
        </div>
      )}
      {motiv ? <p className="motiv-retea" role="status" data-testid="motiv-retea">{motiv}</p> : null}
      <div className="butoane-retea">
        <button type="button" className="principal" data-retea="copiaza" disabled={motiv !== null || typeof r === 'string'}
          onClick={() => { if (typeof r !== 'string') onCopiaza(r); }}>
          {t('editare.retea.copiaza')}
        </button>
        <button type="button" data-retea="inchide" onClick={onInchide}>{t('editare.retea.inchide')}</button>
      </div>
    </div>
  );
}

/**
 * Panoul offsetului (ADR 0064): distanța, sensul (spre exterior / spre interior), motivul pentru care nu se poate (calculul,
 * apoi verdictul acțiunii `document.deseneaza`), câte forme deschise se sar, Aplică și Închide. Cât calculul nu e încă adus,
 * o notă; dacă nu vine, se spune. Esc îl închide.
 */
function PanouOffset({ form, onForm, rez, motivActiune, onAplica, onInchide }: {
  readonly form: FormularOffset;
  readonly onForm: (f: FormularOffset) => void;
  readonly rez: ReturnType<ModulOffset['offsetSelectie']> | 'eroare' | null;
  readonly motivActiune: (f: readonly FormaNoua[]) => CheieSimpla | null;
  readonly onAplica: (f: readonly FormaNoua[]) => void;
  readonly onInchide: () => void;
}): ReactElement {
  const gata = rez !== null && rez !== 'eroare' && typeof rez !== 'string' ? rez : null;
  const motiv = rez === null ? t('editare.offset.incarca') : rez === 'eroare' ? t('editare.offset.neincarcat')
    : typeof rez === 'string' ? t(`editare.offset.motiv.${rez}`) : (() => {
      const m = motivActiune(rez.forme);
      return m === 'motiv.nimic-ales' ? t('editare.offset.motiv.nimic') : m ? t(m) : null;
    })();
  return (
    <div className="insula panou-retea panou-offset" id="panou-offset" role="group" aria-label={t('editare.offset.sectiune')} data-testid="panou-offset"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onInchide();
      }}>
      <div className="fel-retea" role="radiogroup" aria-label={t('editare.offset.sectiune')}>
        {(['exterior', 'interior'] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={form.sens === k} aria-pressed={form.sens === k} data-offset-sens={k}
            onClick={() => { onForm({ ...form, sens: k }); }}>
            {t(`editare.offset.${k}`)}
          </button>
        ))}
      </div>
      <div className="campuri-retea">
        <label className="camp-retea">
          <span>{t('editare.offset.distanta')}</span>
          <input value={form.distanta} inputMode="decimal" data-offset="distanta" onChange={(e) => { onForm({ ...form, distanta: e.target.value }); }} />
        </label>
      </div>
      {gata && gata.sarite > 0 ? <p className="motiv-retea" data-testid="offset-sarite">{t('editare.offset.sarite', { n: String(gata.sarite) })}</p> : null}
      {motiv ? <p className="motiv-retea" role="status" data-testid="motiv-offset">{motiv}</p> : null}
      <div className="butoane-retea">
        <button type="button" className="principal" data-offset="aplica" disabled={motiv !== null || !gata}
          onClick={() => { if (gata) onAplica(gata.forme); }}>
          {t('editare.offset.aplica')}
        </button>
        <button type="button" data-offset="inchide" onClick={onInchide}>{t('editare.retea.inchide')}</button>
      </div>
    </div>
  );
}

/** Offsetul (ADR 0064): forma plină și conturul ei paralel, punctat, în jur. */
function IconaOffset(): ReactElement {
  return (
    <svg className="icona-aliniere" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5" y="5" width="6" height="6" rx="0.5" />
      <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="3.2" className="contur" strokeDasharray="2 1.5" />
    </svg>
  );
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
