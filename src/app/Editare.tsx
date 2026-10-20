import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import { Rigle, GROSIME_RIGLA, type Zona } from '../canvas/Rigle.tsx';
import type { LinieGhid, Lipeste, Vedere } from '../canvas/protocol.ts';
import type { Cutie } from '../geom/cutie.ts';
import { aliniaza, FELURI_ALINIERE, minimAliniere, type FelAliniere } from '../geom/aliniere.ts';
import { lipeste } from '../geom/lipire.ts';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import { FOAIA, type ContextDocument } from '../ui/actiuniDocument.ts';
import { cutiiAlese, idGhidaj, tinteFoaie } from './editareCalcul.ts';
// Calculul acțiunilor `foaie.ghidaje` și `document.muta-instantele` se înregistrează odată cu modulul ăsta.
import '../ui/actiuniDocumentCalcul.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';

/**
 * Editarea pe pânză (ADR 0050), la cerere după prima randare: riglele și ghidajele foii, grila, lipirea mutării (dată
 * pânzei), bara lipirii și a alinierii, săgețile. Documentul se schimbă doar prin acțiuni (`foaie.ghidaje`,
 * `document.muta-instantele`, `document.muta-selectia`); preferințele (lipirea, grila) stau în browser.
 */

/** Pixelii de pe ecran la care o țintă trage. */
export const TOLERANTA_LIPIRE_PX = 6;

const CHEIE_LIPIRE = 'cncvs2.lipire';
const CHEIE_GRILA = 'cncvs2.grila';
const PAS_GRILA_IMPLICIT = 10;

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

type Extra = Partial<Pick<ContextDocument, 'ghidajeNoi' | 'deplasari' | 'deplasare'>>;

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
};

export function Editare(p: ProprietatiEditare): ReactElement | null {
  useLimba();
  const { doc, selectie, cutie, vedere, marime, ruleaza, onLipeste } = p;
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
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!d || selectieRef.current.length === 0 || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      const tinta = e.target;
      const peCorp = tinta === document.body || tinta === document.documentElement;
      const pePanza = tinta instanceof Element && tinta.closest('.panza-cutie') !== null
        && tinta.closest('input, textarea, select, [contenteditable="true"]') === null;
      if (!peCorp && !pePanza) return;
      e.preventDefault();
      const k = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      const [dx = 0, dy = 0] = d;
      ruleaza('document.muta-selectia', { deplasare: () => ({ dx: dx * k, dy: dy * k }) });
    };
    window.addEventListener('keydown', apasa);
    return () => { window.removeEventListener('keydown', apasa); };
  }, [ruleaza]);

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
          ghidaje={ghidaje} linii={p.linii} grila={pasGrila} lipestePoz={lipestePoz} doarCitire={p.doarCitire}
          onNou={(axa, poz) => { scrieGhidaje([...ghidaje, { id: idGhidaj(ghidaje), axa, poz }]); }}
          onMuta={(id, poz) => { scrieGhidaje(ghidaje.map((g) => (g.id === id ? { ...g, poz } : g))); }}
          onSterge={(id) => { scrieGhidaje(ghidaje.filter((g) => g.id !== id)); }}
          eticheta={(cheie, poz) => (cheie === 'sus' ? t('editare.rigla-sus') : cheie === 'stanga' ? t('editare.rigla-stanga') : t('editare.ghidaj', { poz: poz ?? '' }))}
          textPoz={(poz) => textNumar(Math.round(poz * 1000) / 1000, true)}
          citestePoz={(s) => citesteNumar(s, true)}
        />
      ) : null}
      <div className="bara-editare" role="toolbar" aria-label={t('editare.bara')} data-testid="bara-editare"
        style={{ left: zona.x + GROSIME_RIGLA + 8, top: zona.y + zona.h - 52 }}>
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
