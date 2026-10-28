import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { animatie, VITEZE, type StareAnimatie } from './actiuniAnimatie.ts';
import type { RezumatJob } from './actiuniExportTipuri.ts';
import { durata } from './durata.ts';
import { useLimba } from './useLimba.ts';

type Traseu = NonNullable<Extract<RezumatJob, { ok: true }>['traseu']>;

/** O coordonată cu 3 zecimale, în limba interfeței; un zero cu semn (−0,000) se scrie 0,000. */
function mm(v: number, limba: Limba): string {
  const f = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return f.format(Math.abs(v) < 5e-4 ? 0 : v);
}

/** Ce face freza acum, în cuvinte. */
function miscarea(a: StareAnimatie): string {
  switch (a.tip) {
    case 'pregatire': return t('animatie.tip.pregatire');
    case 'rapida': return t('animatie.tip.rapida');
    case 'taiere': return t('animatie.tip.taiere', { avans: a.avans ?? 0 });
    case 'arc': return t('animatie.tip.arc', { avans: a.avans ?? 0 });
    case 'pauza': return t('animatie.tip.pauza');
    case 'scula': return t('animatie.tip.scula');
    case 'ax': return t('animatie.tip.ax');
    case 'final': return t('animatie.tip.final');
  }
}

/**
 * Panoul animației traseului (ADR 0099), deasupra cipului timpului: rulează / pauză, pașii înainte și înapoi, viteza,
 * glisorul timpului, apoi ce face freza (timpul, pasul, mișcarea și lucrarea, poziția, scula). Încarcă programul în player
 * la deschidere (și când se schimbă timpul traseului: alt program, alt `$$`) și îl închide la ieșire; freza o desenează
 * stratul traseului de pe pânză. Escape îl închide.
 */
export function PanouAnimatie({ traseu, onInchide }: { readonly traseu: Traseu; readonly onInchide: () => void }): ReactNode {
  const limba = useLimba();
  const s = useSyncExternalStore(animatie.asculta, animatie.citeste);
  useEffect(() => {
    animatie.incarcaProgram(traseu.program, traseu.foaie, traseu.setari);
    return () => { animatie.inchide(); };
  }, [traseu]);
  const a = s.acum;
  if (!s.activa || !a || !s.cronologie) return null;
  return (
    <div className="panou-animatie" data-testid="animatie" role="group" aria-labelledby="animatie-titlu"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onInchide(); } }}>
      <header>
        <h2 id="animatie-titlu">{t('animatie.titlu')}</h2>
        <button type="button" data-animatie="inchide" aria-label={t('animatie.inchide')} title={t('animatie.inchide')} onClick={onInchide}>×</button>
      </header>
      <div className="comenzi">
        <button type="button" data-animatie="inapoi" aria-label={t('animatie.inapoi')} title={t('animatie.inapoi')} onClick={() => { animatie.inapoi(); }}>⏮</button>
        {s.ruleaza
          ? <button type="button" data-animatie="opreste" aria-label={t('animatie.opreste')} title={t('animatie.opreste')} onClick={() => { animatie.pauza(); }}>⏸</button>
          : <button type="button" data-animatie="reda" aria-label={t('animatie.reda')} title={t('animatie.reda')} onClick={() => { animatie.reda(); }}>▶</button>}
        <button type="button" data-animatie="inainte" aria-label={t('animatie.inainte')} title={t('animatie.inainte')} onClick={() => { animatie.inainte(); }}>⏭</button>
        <label>
          {t('animatie.viteza')}{' '}
          <select data-animatie="viteza" value={s.viteza} onChange={(e) => { animatie.viteza(Number(e.currentTarget.value)); }}>
            {VITEZE.map((v) => <option key={v} value={v}>{t('animatie.viteza.x', { v })}</option>)}
          </select>
        </label>
      </div>
      <input type="range" data-animatie="glisor" aria-label={t('animatie.glisor')} min={0} max={s.durata} step="any" value={s.t}
        onChange={(e) => { animatie.sari(Number(e.currentTarget.value)); }} />
      <p className="citire" data-animatie="timp" data-t={s.t.toFixed(3)}>
        {t('animatie.timp', { t: durata(s.t, limba), total: durata(s.durata, limba) })}
        {' · '}
        <span data-animatie="pas" data-pas={a.pas}>{t('animatie.pas', { pas: a.pas, din: s.cronologie.pasi.length })}</span>
      </p>
      <p className="citire" data-animatie="miscare" data-tip={a.tip}>{miscarea(a)}{a.eticheta ? ` · ${a.eticheta}` : ''}</p>
      <p className="citire" data-animatie="pozitie" data-x={a.x.toFixed(3)} data-y={a.y.toFixed(3)} data-z={a.z.toFixed(3)}>
        {t('animatie.pozitie', { x: mm(a.x, limba), y: mm(a.y, limba), z: mm(a.z, limba) })}
        {' · '}
        {t('animatie.scula', { numar: a.scula.numar, d: mm(a.scula.diametru, limba) })}
      </p>
    </div>
  );
}
