import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { Document } from '../model/document.ts';
import { cutieElement } from '../model/forme.ts';
import { grilaPanouri, type GrilaPanouri } from '../model/grilaPanouri.ts';
import { elementeFoaie } from '../model/lume.ts';
import type { CererePanouri } from '../model/panouri.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { TaiereCalculata } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { imbinareDin, intreDin, useOptiuniTaiere } from './optiuniTaiere.ts';

/** Grila de arătat pe pânză (ADR 0181 §7): liniile ei, în cutia formelor. */
export type GrilaTaiere = { readonly axa: 'grila'; readonly cutie: Cutie; readonly xs: readonly number[]; readonly ys: readonly number[] };
type Stare = { readonly fel: 'calcul' } | { readonly fel: 'gata'; readonly text: string; readonly rau: boolean };
/** Un număr rotunjit la 0,001 mm, cu virgulă în română. */
const mm = (x: number, virgula: boolean): string => textNumar(Math.round(x * 1000) / 1000, virgula);

/**
 * Blocul „Taie în panouri” al panoului Taie (ADR 0181 §7, felia 10.3↑k): mărimea panoului (implicit, materialul foii) cu
 * panourile egale sau din colț, ori numărul lor pe lățime și pe înălțime; formele alese, sau, fără alegere, toate ale foii;
 * închiderea, spațiul și îmbinarea sunt opțiunile tăierii de deasupra. Cât lucrezi în bloc, pânza arată grila (`onActiv`, apoi
 * `onGrila`), iar sub câmpuri, câte panouri ies. Calculul e al workerului CAM, pe documentul din clipa clicului; tăierea și
 * gruparea panourilor se aplică prin acțiunea `document.taie`, într-un pas de anulare.
 */
export function PanouriTaiere({ doc, selectie, activ, onActiv, onGrila, onTaie }: {
  readonly doc: Document;
  readonly selectie: readonly string[];
  /** Grila e cea arătată pe pânză (nu linia de deasupra). */
  readonly activ: boolean;
  readonly onActiv: () => void;
  readonly onGrila: (l: GrilaTaiere | null) => void;
  readonly onTaie: (t: TaiereCalculata) => RezultatActiune;
}): ReactElement {
  const virgula = useLimba() === 'ro';
  const stoc = doc.foi[0]?.stoc;
  const [fel, setFel] = useState<'marime' | 'numar'>('marime');
  const [textL, setTextL] = useState(() => (stoc ? mm(stoc.latime, virgula) : ''));
  const [textI, setTextI] = useState(() => (stoc ? mm(stoc.inaltime, virgula) : ''));
  const [textC, setTextC] = useState('2');
  const [textR, setTextR] = useState('1');
  const [colt, setColt] = useState(false);
  const [stare, setStare] = useState<Stare | null>(null);
  const semnal = useRef<AbortController | null>(null);
  useEffect(() => () => { semnal.current?.abort(); }, []);
  const optiuni = useOptiuniTaiere();

  // Formele de tăiat: cele alese (care mai sunt pe foaie: după Anulează, alegerea poate arăta spre forme care nu mai sunt); fără
  // alegere, toate ale foii. Cutia lor, exactă, e cea a grilei.
  const peFoaie = useMemo(() => (doc.foi[0]?.instante ?? []).map((i) => i.id), [doc]);
  const alese = useMemo(() => {
    const x = selectie.filter((id) => peFoaie.includes(id));
    return x.length > 0 ? x : peFoaie;
  }, [peFoaie, selectie]);
  const cuAlegere = alese !== peFoaie;
  const cutie = useMemo(() => {
    const ids = new Set(alese);
    let k = CUTIE_GOALA;
    for (const e of elementeFoaie(doc, 0)) {
      if (!ids.has(e.instanta)) continue;
      try {
        k = uneste(k, cutieElement(e));
      } catch {
        // O formă care nu se poate citi: tăierea o refuză, cu motivul ei.
      }
    }
    return k;
  }, [doc, alese]);
  const L = citesteNumar(textL), I = citesteNumar(textI), C = citesteNumar(textC), R = citesteNumar(textR);
  const g: GrilaPanouri | null = fel === 'marime' ? (L === null || I === null ? null : { fel, latime: L, inaltime: I, colt })
    : C === null || R === null ? null : { fel, coloane: C, randuri: R };
  const goala = !(cutie.minX <= cutie.maxX);
  const grila = g && !goala ? grilaPanouri(cutie, g) : null;
  const xs = typeof grila === 'object' && grila ? grila.xs : null, ys = typeof grila === 'object' && grila ? grila.ys : [];
  const c = xs ? xs.length + 1 : 0, r = ys.length + 1;
  const motiv = goala ? t('editare.taiere.motiv.nimic-ales')
    : grila === 'panouri' ? t('editare.taiere.motiv.panouri')
      : !xs ? t('editare.taiere.panouri.valoare')
        : c * r === 1 ? t('editare.taiere.panouri.unul') : null;
  // Grila de pe pânză urmează liniile (cheia lor), cât blocul e cel activ.
  const cheie = xs ? `${cutie.minX},${cutie.minY},${cutie.maxX},${cutie.maxY}|${xs.join(',')}|${ys.join(',')}` : '';
  useEffect(() => { if (activ) onGrila(xs ? { axa: 'grila', cutie, xs, ys } : null); }, [activ, cheie]);

  const taie = (): void => {
    if (motiv !== null || !g || stare?.fel === 'calcul') return;
    const laCerere = doc;
    const s = new AbortController();
    semnal.current?.abort();
    semnal.current = s;
    setStare({ fel: 'calcul' });
    const intre = intreDin(optiuni), imbinare = imbinareDin(optiuni, true);
    const cerere: CererePanouri = {
      alese: [...alese], grila: g, inchide: optiuni.inchide, nume: t('editare.taiere.panouri.nume'), ...(intre ? { intre } : {}), ...(imbinare ? { imbinare } : {}),
    };
    const cade = (e: unknown): void => {
      if (s.signal.aborted) return;
      reportError(new Error(`tăierea în panouri: ${e instanceof Error ? e.message : String(e)}`));
      setStare({ fel: 'gata', text: t('editare.taiere.eroare'), rau: true });
    };
    import('../ui/actiuniExportCalcul.ts').then((calc) => {
      if (s.signal.aborted) return;
      calc.taiePanourile(laCerere, cerere, s.signal).then((rez) => {
        if (s.signal.aborted) return;
        if (!rez.ok) {
          const m = rez.motiv === 'valoare' ? 'editare.taiere.panouri.valoare' : rez.motiv === 'nimic-taiat' ? 'editare.taiere.panouri.unul' : (`editare.taiere.motiv.${rez.motiv}` as const);
          setStare({ fel: 'gata', text: t(m), rau: true });
          return;
        }
        const v = onTaie({ doc: laCerere, degrupate: rez.degrupate, ids: rez.ids, sterse: rez.sterse, ...(rez.grupuri ? { grupuri: rez.grupuri } : {}) });
        const text = t('editare.taiere.panouri.gata', { p: String(rez.panouri ?? rez.ids.length), nume: cerere.nume, n: String(rez.forme) })
          + (rez.scoase > 0 ? ` ${t('editare.taiere.panouri.scoase', { s: String(rez.scoase) })}` : '');
        setStare(v.ok ? { fel: 'gata', text, rau: false } : { fel: 'gata', text: t(v.motiv), rau: true });
      }, (e: unknown) => { if (!(e instanceof calc.CalculAnulat)) cade(e); });
    }, cade);
  };

  const camp = (valoare: string, cheie: string, eticheta: CheieSimpla, scrie: (v: string) => void, f: 'marime' | 'numar'): ReactElement => (
    <input className="camp-taiere" value={valoare} inputMode={f === 'marime' ? 'decimal' : 'numeric'} data-taiere={cheie} aria-label={t(eticheta)}
      onFocus={() => { setFel(f); }} onChange={(e) => { scrie(e.target.value); }} />
  );
  return (
    <fieldset className="campuri-taiere" data-taiere="panouri" onFocus={onActiv} onPointerDown={onActiv}>
      <legend>{t('editare.taiere.panouri')}</legend>
      <p className="stare-taiere">{t('editare.taiere.panouri.text')}</p>
      <label className="rand-taiere">
        <input type="radio" name="panouri-fel" checked={fel === 'marime'} data-taiere="panouri-marime" onChange={() => { setFel('marime'); }} />
        <span className="rand-taiere-lung">{t('editare.taiere.panouri.marime')}</span>
      </label>
      <div className="campuri-unghi">
        {camp(textL, 'panouri-latime', 'editare.taiere.panouri.latime', setTextL, 'marime')}
        <span>×</span>
        {camp(textI, 'panouri-inaltime', 'editare.taiere.panouri.inaltime', setTextI, 'marime')}
        <span>mm</span>
      </div>
      <div className="rand-optiuni-taiere panouri-colt" role="radiogroup" aria-label={t('editare.taiere.panouri.fel')}>
        <span>{t('editare.taiere.panouri.fel')}</span>
        {([false, true] as const).map((x) => (
          <label key={String(x)} title={t(x ? 'editare.taiere.panouri.colt.titlu' : 'editare.taiere.panouri.egale.titlu')}>
            <input type="radio" name="panouri-colt" checked={colt === x} disabled={fel !== 'marime'} data-taiere={x ? 'panouri-colt' : 'panouri-egale'}
              onChange={() => { setColt(x); }} />
            {t(x ? 'editare.taiere.panouri.colt' : 'editare.taiere.panouri.egale')}
          </label>
        ))}
      </div>
      <label className="rand-taiere">
        <input type="radio" name="panouri-fel" checked={fel === 'numar'} data-taiere="panouri-numar" onChange={() => { setFel('numar'); }} />
        <span className="rand-taiere-lung">{t('editare.taiere.panouri.numar')}</span>
      </label>
      <div className="campuri-unghi">
        {camp(textC, 'panouri-coloane', 'editare.taiere.panouri.coloane', setTextC, 'numar')}
        <span>×</span>
        {camp(textR, 'panouri-randuri', 'editare.taiere.panouri.randuri', setTextR, 'numar')}
      </div>
      {motiv ? <p className="motiv-retea" role="status" data-testid="panouri-motiv">{motiv}</p> : (
        <p className="stare-taiere" data-testid="panouri-grila">
          {t(cuAlegere ? 'editare.taiere.panouri.alese' : 'editare.taiere.panouri.toate', {
            n: String(alese.length), c: String(c), r: String(r), l: mm(cutie.maxX - cutie.minX, virgula), i: mm(cutie.maxY - cutie.minY, virgula),
          })}
        </p>
      )}
      <div className="butoane-retea">
        <button type="button" data-taiere="panouri-taie" disabled={motiv !== null || stare?.fel === 'calcul'} onClick={taie}>{t('editare.taiere.panouri.taie')}</button>
      </div>
      {stare ? (
        <p className={stare.fel === 'gata' && stare.rau ? 'motiv-retea' : 'stare-taiere'} role="status" data-testid="panouri-stare">
          {stare.fel === 'calcul' ? t('editare.taiere.calcul') : stare.text}
        </p>
      ) : null}
    </fieldset>
  );
}
