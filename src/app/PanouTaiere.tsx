import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { Vedere } from '../canvas/protocol.ts';
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';
import type { CerereTaiere, Cutit } from '../model/taiere.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { TaiereCalculata } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { GrupuriTaiere, type NumeParti } from './GrupuriTaiere.tsx';
import { schimbaOptiuniTaiere, useOptiuniTaiere } from './optiuniTaiere.ts';
import './taiere.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * Panoul Convertește (felia 10.3↑d) vine în aceeași bucată, adus de aici: amândouă folosesc `taiere.css`, iar o foaie de stil
 * împărțită de două bucăți la cerere ar ieși într-o bucată comună doar de CSS, pe care harta importurilor (ADR 0098) o
 * pomenește fără fișierul ei (poarta din `scripts/build-determinist.ts`).
 */
export { PanouConversie } from './PanouConversie.tsx';
/** Unealta Cuțit (ADR 0181, felia 10.3↑f) vine tot de aici, din același motiv (`taiere.css`). */
export { UnealtaCutit } from './UnealtaCutit.tsx';

/**
 * Panoul Taie (ADR 0180 §3, §4, §5; feliile 10.3↑, 10.3↑b și 10.3↑c), adus la cerere din extensia barei: cu ce se taie (linia
 * verticală X, orizontală Y, linia prin X, Y la un unghi, un ghidaj al foii sau ultima formă aleasă, cu Shift + clic, care se
 * poate șterge după tăiere), opțiunile tăierii (ADR 0181 §2: „Închide bucățile”, „Prelungește capetele”, „Păstrează”; ținute în
 * browser, aceleași ca în bara Cuțitului) și Taie; „Decupează la ultima formă aleasă” (ce se păstrează, ce se face cu formele
 * care trec granița) și „Taie la intersecții”, fiecare cu butonul lui. Cât e deschis, linia se vede pe pânză. Calculul e al
 * workerului CAM, pe documentul din clipa clicului; tăierea se aplică prin acțiunea `document.taie`, într-un pas de anulare,
 * doar dacă desenul nu s-a schimbat între timp.
 */

/** Linia de tăiere de arătat pe pânză, în mm ai foii (verticala, orizontala sau linia prin x, y la unghiul dat), sau nimic. */
export type LinieTaiere =
  | { readonly axa: 'x' | 'y'; readonly v: number }
  | { readonly axa: 'u'; readonly x: number; readonly y: number; readonly unghi: number }
  | null;

type Fel = 'x' | 'y' | 'unghi' | 'ghidaj' | 'forma';
type Stare = { readonly fel: 'calcul' } | { readonly fel: 'gata'; readonly text: string; readonly rau: boolean };

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
  const [textUx, setTextUx] = useState(() => (centru ? numar(centru.x, virgula) : ''));
  const [textUy, setTextUy] = useState(() => (centru ? numar(centru.y, virgula) : ''));
  const [textUnghi, setTextUnghi] = useState(() => numar(45, virgula));
  const [ghidaj, setGhidaj] = useState(() => ghidaje[0]?.id ?? '');
  // Opțiunile tăierii (ADR 0181 §2), aceleași ca în bara Cuțitului.
  const optiuni = useOptiuniTaiere();
  const inchide = optiuni.inchide;
  const [pastreaza, setPastreaza] = useState<'inauntru' | 'afara'>('inauntru');
  const [trec, setTrec] = useState<'taie' | 'sterge' | 'intregi'>('taie');
  const [stare, setStare] = useState<Stare | null>(null);
  const semnal = useRef<AbortController | null>(null);
  useEffect(() => () => { semnal.current?.abort(); }, []);
  // Rezultatul stă sub blocuri, iar panoul (cel mult 70 % din fereastră) se derulează: adus în vedere la fiecare schimbare.
  const randStare = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => { if (stare) randStare.current?.scrollIntoView({ block: 'nearest' }); }, [stare]);

  const g = ghidaje.find((x) => x.id === ghidaj) ?? null;
  const x = citesteNumar(textX, true), y = citesteNumar(textY, true);
  const ux = citesteNumar(textUx, true), uy = citesteNumar(textUy, true), unghi = citesteNumar(textUnghi, true);
  // Cuțitul-formă: ultima formă aleasă (Shift + clic), cu cel puțin o formă de tăiat înaintea ei.
  const forma = selectie.length >= 2 ? (selectie[selectie.length - 1] ?? null) : null;
  // Un cuțit-formă închis (toate contururile lui închise) are înăuntru și în afară, nu capete de prelungit.
  const formaInchisa = useMemo(() => {
    if (!forma) return false;
    const es = elementeFoaie(doc).filter((e) => e.instanta === forma);
    try {
      return es.length > 0 && es.every((e) => conturElement(e).inchis);
    } catch {
      return false;
    }
  }, [doc, forma]);
  const cutit: Cutit | null = fel === 'x' ? (x === null ? null : { fel: 'x', x }) : fel === 'y' ? (y === null ? null : { fel: 'y', y })
    : fel === 'unghi' ? (ux === null || uy === null || unghi === null ? null : { fel: 'unghi', x: ux, y: uy, unghi })
      : fel === 'ghidaj' ? (g ? { fel: 'ghidaj', id: g.id } : null) : forma ? { fel: 'forma', id: forma } : null;
  const linie: LinieTaiere = fel === 'x' ? (x === null ? null : { axa: 'x', v: x }) : fel === 'y' ? (y === null ? null : { axa: 'y', v: y })
    : fel === 'unghi' ? (ux === null || uy === null || unghi === null ? null : { axa: 'u', x: ux, y: uy, unghi })
      : fel === 'ghidaj' && g ? { axa: g.axa, v: g.poz } : null;
  const cheieLinie = linie ? (linie.axa === 'u' ? `u${linie.x},${linie.y},${linie.unghi}` : `${linie.axa}${linie.v}`) : '';
  // „Păstrează”, cu numele părților după cuțit: deasupra / dedesubt la orizontală, înăuntru / în afară la un cuțit închis.
  const orizontala = fel === 'y' || (fel === 'ghidaj' && g?.axa === 'y');
  const numeParti: NumeParti = orizontala ? ['deasupra', 'dedesubt'] : fel === 'forma' && formaInchisa ? ['inauntru', 'afara'] : ['stanga', 'dreapta'];
  // „Prelungește capetele” are sens doar la un cuțit-formă deschis (liniile sunt deja întregi).
  const cuCapete = fel === 'forma' && !formaInchisa;
  // Linia de pe pânză urmează valoarea (cheia ei), nu fiecare randare.
  useEffect(() => { onLinie(linie); }, [cheieLinie]);
  useEffect(() => () => { onLinie(null); }, [onLinie]);

  const motiv = selectie.length === 0 ? t('editare.taiere.motiv.nimic-ales')
    : cutit === null ? t(fel === 'ghidaj' ? 'editare.taiere.fara-ghidaje' : fel === 'forma' ? 'editare.taiere.forma.lipsa' : 'editare.taiere.motiv.valoare') : null;

  /** Tăierea, calculată de worker pe documentul de acum; aplicată prin acțiunea documentului. Un eșec (nu o anulare) merge în jurnal. */
  const ruleaza = (cu: Cutit, o: Omit<CerereTaiere, 'cutit' | 'alese'>): void => {
    if (selectie.length === 0 || stare?.fel === 'calcul') return;
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
      calc.taieVectorii(laCerere, { cutit: cu, alese: [...selectie], ...o }, s.signal).then((r) => {
        if (s.signal.aborted) return;
        if (!r.ok) {
          const nimic = cu.fel === 'intersectii' ? 'editare.taiere.motiv.nimic-intersectii' : cu.fel === 'decupare' ? 'editare.taiere.motiv.nimic-decupat' : null;
          setStare({ fel: 'gata', text: t(r.motiv === 'nimic-taiat' && nimic ? nimic : `editare.taiere.motiv.${r.motiv}`), rau: true });
          return;
        }
        const v = onTaie({ doc: laCerere, degrupate: r.degrupate, ids: r.ids, sterse: r.sterse });
        const parti = String(r.ids.length);
        const text = cu.fel === 'decupare'
          ? t('editare.taiere.decupat', { n: String(r.degrupate.length), s: String(r.sterse.length), parti })
          : r.scoase > 0
            ? t('editare.taiere.gata-scoase', { n: String(r.forme), parti, s: String(r.scoase) })
            : t('editare.taiere.gata', { n: String(r.forme), parti });
        const sters = cu.fel === 'forma' && r.sterse.includes(cu.id) ? ` ${t('editare.taiere.cutit-sters')}` : '';
        setStare(v.ok ? { fel: 'gata', text: text + sters, rau: false } : { fel: 'gata', text: t(v.motiv), rau: true });
      }, (e: unknown) => { if (!(e instanceof calc.CalculAnulat)) cade(e); });
    }, cade);
  };
  const taie = (): void => {
    if (cutit === null) return;
    ruleaza(cutit, {
      inchide, pastreaza: optiuni.pastreaza, prelungeste: cuCapete ? optiuni.prelungeste : 'nu', stergeCutitul: fel === 'forma' && optiuni.stergeCutitul,
    });
  };
  const intersectii = (): void => { ruleaza({ fel: 'intersectii' }, { inchide: false }); };
  const decupeaza = (): void => { if (forma) ruleaza({ fel: 'decupare', id: forma, pastreaza, trec }, { inchide }); };
  const bifaInchide = (v: boolean): void => { schimbaOptiuniTaiere({ inchide: v }); };

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
          <input type="radio" name="taiere-cu" checked={fel === 'unghi'} data-taiere="cu-unghi" onChange={() => { setFel('unghi'); }} />
          <span className="rand-taiere-lung">{t('editare.taiere.unghi')}</span>
        </label>
        <div className="campuri-unghi">
          <span>X</span>
          <input className="camp-taiere" value={textUx} inputMode="decimal" data-taiere="unghi-x" aria-label={t('editare.taiere.unghi.x')}
            onFocus={() => { setFel('unghi'); }} onChange={(e) => { setTextUx(e.target.value); }} />
          <span>Y</span>
          <input className="camp-taiere" value={textUy} inputMode="decimal" data-taiere="unghi-y" aria-label={t('editare.taiere.unghi.y')}
            onFocus={() => { setFel('unghi'); }} onChange={(e) => { setTextUy(e.target.value); }} />
          <span>{t('editare.taiere.unghi.la')}</span>
          <input className="camp-taiere camp-unghi" value={textUnghi} inputMode="decimal" data-taiere="unghi" aria-label={t('editare.taiere.unghi.alfa')}
            onFocus={() => { setFel('unghi'); }} onChange={(e) => { setTextUnghi(e.target.value); }} />
          <span>°</span>
        </div>
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
        <label className="rand-taiere" title={t('editare.taiere.forma.titlu')}>
          <input type="radio" name="taiere-cu" checked={fel === 'forma'} data-taiere="cu-forma" onChange={() => { setFel('forma'); }} />
          <span className="rand-taiere-lung">{t('editare.taiere.forma')}</span>
        </label>
        <label className="bifa-taiere bifa-sub-rand" title={t('editare.taiere.forma.sterge.titlu')}>
          <input type="checkbox" checked={optiuni.stergeCutitul} data-taiere="sterge-cutitul" onChange={(e) => { schimbaOptiuniTaiere({ stergeCutitul: e.target.checked }); }} />
          <span>{t('editare.taiere.forma.sterge')}</span>
        </label>
      </fieldset>
      <label className="bifa-taiere" title={t('editare.taiere.inchide.titlu')}>
        <input type="checkbox" checked={inchide} data-taiere="inchide" onChange={(e) => { bifaInchide(e.target.checked); }} />
        <span>{t('editare.taiere.inchide')}</span>
      </label>
      <GrupuriTaiere loc="taiere" parti={numeParti} cuCapete={cuCapete} />
      {motiv ? <p className="motiv-retea" role="status" data-testid="taiere-motiv">{motiv}</p> : (
        <p className="stare-taiere">
          {fel === 'forma' ? t('editare.taiere.forma.alese', { n: String(selectie.length - 1) }) : t('editare.taiere.alese', { n: String(selectie.length) })}
        </p>
      )}
      <div className="butoane-retea">
        <button type="button" className="principal" data-taiere="taie" disabled={motiv !== null || stare?.fel === 'calcul'} onClick={taie}>{t('editare.taiere.taie')}</button>
      </div>
      <fieldset className="campuri-taiere">
        <legend>{t('editare.taiere.decupare')}</legend>
        <p className="stare-taiere">{t('editare.taiere.decupare.text')}</p>
        <div className="rand-optiuni-taiere" role="radiogroup" aria-label={t('editare.taiere.pastreaza')}>
          <span>{t('editare.taiere.pastreaza')}</span>
          {(['inauntru', 'afara'] as const).map((x) => (
            <label key={x}>
              <input type="radio" name="taiere-pastreaza" checked={pastreaza === x} data-taiere={`pastreaza-${x}`} onChange={() => { setPastreaza(x); }} />
              {t(`editare.taiere.pastreaza.${x}`)}
            </label>
          ))}
        </div>
        <div className="rand-optiuni-taiere" role="radiogroup" aria-label={t('editare.taiere.trec')}>
          <span>{t('editare.taiere.trec')}</span>
          {(['taie', 'sterge', 'intregi'] as const).map((x) => (
            <label key={x}>
              <input type="radio" name="taiere-trec" checked={trec === x} data-taiere={`trec-${x}`} onChange={() => { setTrec(x); }} />
              {t(`editare.taiere.trec.${x}`)}
            </label>
          ))}
        </div>
        <label className="bifa-taiere" title={t('editare.taiere.inchide.titlu')}>
          <input type="checkbox" checked={inchide} data-taiere="inchide-decupare" onChange={(e) => { bifaInchide(e.target.checked); }} />
          <span>{t('editare.taiere.inchide')}</span>
        </label>
        {forma ? null : <p className="motiv-retea" data-testid="decupare-motiv">{t('editare.taiere.decupare.lipsa')}</p>}
        <div className="butoane-retea">
          <button type="button" data-taiere="decupeaza" disabled={!forma || stare?.fel === 'calcul'} onClick={decupeaza}>{t('editare.taiere.decupeaza')}</button>
        </div>
      </fieldset>
      <fieldset className="campuri-taiere">
        <legend>{t('editare.taiere.intersectii')}</legend>
        <p className="stare-taiere">{t('editare.taiere.intersectii.text')}</p>
        <div className="butoane-retea">
          <button type="button" data-taiere="intersectii" disabled={selectie.length === 0 || stare?.fel === 'calcul'} onClick={intersectii}>{t('editare.taiere.intersectii.taie')}</button>
        </div>
      </fieldset>
      {stare ? (
        <p ref={randStare} className={stare.fel === 'gata' && stare.rau ? 'motiv-retea' : 'stare-taiere'} role="status" data-testid="taiere-stare">
          {stare.fel === 'calcul' ? t('editare.taiere.calcul') : stare.text}
        </p>
      ) : null}
      <div className="butoane-retea">
        <button type="button" data-taiere="inchide-panoul" onClick={onInchide}>{t('editare.retea.inchide')}</button>
      </div>
    </>
  );
}

/** Linia de tăiere pe pânză, cât panoul e deschis: punctată, de-a curmezișul ferestrei, la X, la Y sau prin X, Y la unghiul ei. */
export function LiniaTaierii({ linie, vedere, marime }: {
  readonly linie: LinieTaiere;
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
}): ReactElement | null {
  if (!linie) return null;
  if (linie.axa === 'u') {
    // Prin punctul ei, pe direcția ei (pe ecran, y crește în jos), cât să treacă de toată fereastra.
    const px = vedere.tx + linie.x * vedere.scara, py = vedere.ty - linie.y * vedere.scara;
    const a = (linie.unghi * Math.PI) / 180, dx = Math.cos(a), dy = -Math.sin(a);
    const l = Math.abs(px) + Math.abs(py) + 2 * (marime.latime + marime.inaltime);
    return (
      <svg className="rigle-desen linia-taierii" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="taiere-linia" data-axa="u">
        <line x1={px - dx * l} y1={py - dy * l} x2={px + dx * l} y2={py + dy * l} />
      </svg>
    );
  }
  const x = vedere.tx + linie.v * vedere.scara;
  const y = vedere.ty - linie.v * vedere.scara;
  return (
    <svg className="rigle-desen linia-taierii" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="taiere-linia" data-axa={linie.axa}>
      {linie.axa === 'x' ? <line x1={x} y1={0} x2={x} y2={marime.inaltime} /> : <line x1={0} y1={y} x2={marime.latime} y2={y} />}
    </svg>
  );
}
