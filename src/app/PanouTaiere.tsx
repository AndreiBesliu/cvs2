import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Vedere } from '../canvas/protocol.ts';
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import type { Cutit } from '../model/taiere.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { TaiereCalculata } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import './taiere.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * Panoul Taie (ADR 0180 §3; felia 10.3↑), adus la cerere din extensia barei: linia (verticală X, orizontală Y, sau un ghidaj
 * al foii), „Închide bucățile” (ținută în browser, ca Lipirea) și Taie. Cât e deschis, linia se vede pe pânză. Calculul e al
 * workerului CAM, pe documentul din clipa clicului; tăierea se aplică prin acțiunea `document.taie`, într-un pas de anulare,
 * doar dacă desenul nu s-a schimbat între timp.
 */

/** Linia de tăiere de arătat pe pânză, în mm ai foii, sau nimic. */
export type LinieTaiere = { readonly axa: 'x' | 'y'; readonly v: number } | null;

type Fel = 'x' | 'y' | 'ghidaj';
type Stare = { readonly fel: 'calcul' } | { readonly fel: 'gata'; readonly text: string; readonly rau: boolean };

/** Bifa „Închide bucățile” se ține în browser, pentru toate proiectele (implicit bifată). */
const CHEIE_INCHIDE = 'cncvs2.taiere-inchide';
function citesteInchide(): boolean {
  try {
    return localStorage.getItem(CHEIE_INCHIDE) !== '0';
  } catch {
    return true;
  }
}
function scrieInchide(v: boolean): void {
  try {
    localStorage.setItem(CHEIE_INCHIDE, v ? '1' : '0');
  } catch {
    // Fără stocare (fereastră privată, date blocate): alegerea ține doar cât pagina.
  }
}

/** Un număr rotunjit la 0,001 mm, cu virgulă în română. */
const numar = (x: number, virgula: boolean): string => textNumar(Math.round(x * 1000) / 1000, virgula);

export function PanouTaiere({ doc, selectie, ghidaje, centru, onLinie, onTaie, onInchide }: {
  readonly doc: Document;
  /** Selecția aplicației: id-urile instanțelor. */
  readonly selectie: readonly string[];
  readonly ghidaje: readonly Ghidaj[];
  /** Mijlocul formelor alese, în mm ai foii: de aici pornesc X și Y. */
  readonly centru: { readonly x: number; readonly y: number } | null;
  /** Linia de arătat pe pânză (sau nimic, cât valoarea nu e bună). */
  readonly onLinie: (l: LinieTaiere) => void;
  /** Aplică o tăiere calculată (acțiunea `document.taie`), cu verdictul ei. */
  readonly onTaie: (t: TaiereCalculata) => RezultatActiune;
  readonly onInchide: () => void;
}): ReactElement {
  const virgula = useLimba() === 'ro';
  const [fel, setFel] = useState<Fel>('x');
  const [textX, setTextX] = useState(() => (centru ? numar(centru.x, virgula) : ''));
  const [textY, setTextY] = useState(() => (centru ? numar(centru.y, virgula) : ''));
  const [ghidaj, setGhidaj] = useState(() => ghidaje[0]?.id ?? '');
  const [inchide, setInchide] = useState(citesteInchide);
  const [stare, setStare] = useState<Stare | null>(null);
  const semnal = useRef<AbortController | null>(null);
  useEffect(() => () => { semnal.current?.abort(); }, []);

  const g = ghidaje.find((x) => x.id === ghidaj) ?? null;
  const x = citesteNumar(textX, true), y = citesteNumar(textY, true);
  const cutit: Cutit | null = fel === 'x' ? (x === null ? null : { fel: 'x', x }) : fel === 'y' ? (y === null ? null : { fel: 'y', y }) : g ? { fel: 'ghidaj', id: g.id } : null;
  const linie: LinieTaiere = fel === 'x' ? (x === null ? null : { axa: 'x', v: x }) : fel === 'y' ? (y === null ? null : { axa: 'y', v: y }) : g ? { axa: g.axa, v: g.poz } : null;
  const cheieLinie = linie ? `${linie.axa}${linie.v}` : '';
  // Linia de pe pânză urmează valoarea (cheia ei), nu fiecare randare.
  useEffect(() => { onLinie(linie); }, [cheieLinie]);
  useEffect(() => () => { onLinie(null); }, [onLinie]);

  const motiv = selectie.length === 0 ? t('editare.taiere.motiv.nimic-ales') : cutit === null ? (fel === 'ghidaj' ? t('editare.taiere.fara-ghidaje') : t('editare.taiere.motiv.valoare')) : null;

  /** Tăierea, calculată de worker pe documentul de acum; aplicată prin acțiunea documentului. Un eșec (nu o anulare) merge în jurnal. */
  const taie = (): void => {
    if (cutit === null || selectie.length === 0 || stare?.fel === 'calcul') return;
    const laCerere = doc;
    const s = new AbortController();
    semnal.current?.abort();
    semnal.current = s;
    setStare({ fel: 'calcul' });
    const cade = (e: unknown): void => {
      if (s.signal.aborted) return;
      reportError(new Error(`tăierea vectorilor: ${e instanceof Error ? e.message : String(e)}`));
      setStare({ fel: 'gata', text: t('editare.taiere.eroare'), rau: true });
    };
    import('../ui/actiuniExportCalcul.ts').then((calc) => {
      if (s.signal.aborted) return;
      calc.taieVectorii(laCerere, { cutit, alese: [...selectie], inchide }, s.signal).then((r) => {
        if (s.signal.aborted) return;
        if (!r.ok) { setStare({ fel: 'gata', text: t(`editare.taiere.motiv.${r.motiv}`), rau: true }); return; }
        const v = onTaie({ doc: laCerere, degrupate: r.degrupate, ids: r.ids });
        const parti = String(r.ids.length);
        const text = r.scoase > 0
          ? t('editare.taiere.gata-scoase', { n: String(r.forme), parti, s: String(r.scoase) })
          : t('editare.taiere.gata', { n: String(r.forme), parti });
        setStare(v.ok ? { fel: 'gata', text, rau: false } : { fel: 'gata', text: t(v.motiv), rau: true });
      }, (e: unknown) => { if (!(e instanceof calc.CalculAnulat)) cade(e); });
    }, cade);
  };

  return (
    <>
      <fieldset className="campuri-taiere">
        <legend>{t('editare.taiere.cu')}</legend>
        <label className="rand-taiere">
          <input type="radio" name="taiere-cu" checked={fel === 'x'} data-taiere="cu-x" onChange={() => { setFel('x'); }} />
          <span>{t('editare.taiere.x')}</span>
          <input className="camp-taiere" value={textX} inputMode="decimal" data-taiere="x" aria-label={t('editare.taiere.x')}
            onFocus={() => { setFel('x'); }} onChange={(e) => { setTextX(e.target.value); }} />
          <span>mm</span>
        </label>
        <label className="rand-taiere">
          <input type="radio" name="taiere-cu" checked={fel === 'y'} data-taiere="cu-y" onChange={() => { setFel('y'); }} />
          <span>{t('editare.taiere.y')}</span>
          <input className="camp-taiere" value={textY} inputMode="decimal" data-taiere="y" aria-label={t('editare.taiere.y')}
            onFocus={() => { setFel('y'); }} onChange={(e) => { setTextY(e.target.value); }} />
          <span>mm</span>
        </label>
        <label className="rand-taiere">
          <input type="radio" name="taiere-cu" checked={fel === 'ghidaj'} disabled={ghidaje.length === 0} data-taiere="cu-ghidaj" onChange={() => { setFel('ghidaj'); }} />
          <span>{t('editare.taiere.ghidaj')}</span>
          <select className="camp-taiere" value={ghidaj} disabled={ghidaje.length === 0} data-taiere="ghidaj" aria-label={t('editare.taiere.ghidaj')}
            onFocus={() => { setFel('ghidaj'); }} onChange={(e) => { setGhidaj(e.target.value); setFel('ghidaj'); }}>
            {ghidaje.map((x) => (
              <option key={x.id} value={x.id}>{t(x.axa === 'x' ? 'editare.taiere.ghidaj.x' : 'editare.taiere.ghidaj.y', { poz: numar(x.poz, virgula) })}</option>
            ))}
          </select>
        </label>
      </fieldset>
      <label className="bifa-taiere" title={t('editare.taiere.inchide.titlu')}>
        <input type="checkbox" checked={inchide} data-taiere="inchide" onChange={(e) => { setInchide(e.target.checked); scrieInchide(e.target.checked); }} />
        <span>{t('editare.taiere.inchide')}</span>
      </label>
      {motiv ? <p className="motiv-retea" role="status" data-testid="taiere-motiv">{motiv}</p> : <p className="stare-taiere">{t('editare.taiere.alese', { n: String(selectie.length) })}</p>}
      {stare ? (
        <p className={stare.fel === 'gata' && stare.rau ? 'motiv-retea' : 'stare-taiere'} role="status" data-testid="taiere-stare">
          {stare.fel === 'calcul' ? t('editare.taiere.calcul') : stare.text}
        </p>
      ) : null}
      <div className="butoane-retea">
        <button type="button" className="principal" data-taiere="taie" disabled={motiv !== null || stare?.fel === 'calcul'} onClick={taie}>{t('editare.taiere.taie')}</button>
        <button type="button" data-taiere="inchide-panoul" onClick={onInchide}>{t('editare.retea.inchide')}</button>
      </div>
    </>
  );
}

/** Linia de tăiere pe pânză, cât panoul e deschis: punctată, de-a curmezișul ferestrei, la X sau Y. */
export function LiniaTaierii({ linie, vedere, marime }: {
  readonly linie: LinieTaiere;
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
}): ReactElement | null {
  if (!linie) return null;
  const x = vedere.tx + linie.v * vedere.scara;
  const y = vedere.ty - linie.v * vedere.scara;
  return (
    <svg className="rigle-desen linia-taierii" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="taiere-linia" data-axa={linie.axa}>
      {linie.axa === 'x' ? <line x1={x} y1={0} x2={x} y2={marime.inaltime} /> : <line x1={0} y1={y} x2={marime.latime} y2={y} />}
    </svg>
  );
}
