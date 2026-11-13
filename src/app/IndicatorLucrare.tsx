/**
 * Indicatorul lucrării din meniul global (ADR 0132 §5): starea mașinii și a lucrării, de oriunde, pusă de fereastra Mașina în
 * locul ei din meniu (`#loc-lucrare`), printr-un portal. Un clic pe el deschide Mașina; lângă el stă doar Pauză (cât rulează)
 * sau Reia (cât stă în Hold): Oprește rămâne în fereastră, fiindcă o repornire în mișcare pierde poziția. Tot el ține titlul
 * filei browserului: procentul cât rulează lucrarea, starea cât e oprită. Pe telefon rămân punctul colorat, procentul și
 * iconițele (numele întreg stă în eticheta accesibilă). Din 3.6s (ADR 0194), titlul trece prin `titluFila.ts`, ca partea
 * imprimantei să nu-l șteargă pe al mașinii (și invers).
 */
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n/t.ts';
import { indicatorLucrare, type Indicator } from '../machine/indicator.ts';
import type { SesiuneMasina, StareSesiune } from '../machine/sesiune.ts';
import { parteTitlu } from './titluFila.ts';

/** Cuvântul stării, în limba omului (fără procent: acela vine separat, ca pe telefon să rămână doar el). */
function cuvant(i: Indicator): string {
  switch (i.fel) {
    case 'conectata': return t('masina.indicator.conectata');
    case 'ruleaza': return t('masina.indicator.ruleaza');
    case 'pauza': return t('masina.indicator.pauza');
    case 'oprita-m6': return t('masina.indicator.oprita-m6', { linie: i.linie ?? 0 });
    case 'oprita': return t('masina.indicator.oprita', { linie: i.linie ?? 0 });
    case 'suspendata': return t('masina.indicator.suspendata');
    case 'alarma': return i.cod === null ? t('masina.indicator.alarma') : t('masina.indicator.alarma.cod', { cod: i.cod });
    case 'intrerupta': return t('masina.indicator.intrerupta');
    case 'gata': return t('masina.indicator.gata');
  }
}

/** Procentul, doar cât programul pleacă (rulează sau stă în pauză); altfel nimic. */
const procentul = (i: Indicator): string | null =>
  ((i.fel === 'ruleaza' || i.fel === 'pauza') && i.procent !== null ? t('masina.indicator.procent', { procent: i.procent }) : null);

/** Partea mașinii din titlul filei: fără lucrare, nimic; cât rulează, procentul; altfel starea (cu procentul, dacă e). */
function parteMasina(i: Indicator | null): string | null {
  if (!i || i.fel === 'conectata') return null;
  const p = procentul(i);
  if (i.fel === 'ruleaza' && p !== null) return p;
  return p === null ? cuvant(i) : `${cuvant(i)} ${p}`;
}

export function IndicatorLucrare({ s, st, onDeschide }: {
  readonly s: SesiuneMasina;
  readonly st: StareSesiune;
  /** Deschide fereastra Mașina (fila ei din meniu). */
  readonly onDeschide: () => void;
}): ReactNode {
  // Locul din meniul global îl desenează carcasa (controlul `lucrare`); un aranjament fără el lasă doar titlul filei.
  const [loc, setLoc] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setLoc(document.getElementById('loc-lucrare')); });
  const i = indicatorLucrare(st);
  const parte = parteMasina(i);
  useEffect(() => { parteTitlu('masina', parte); }, [parte]);
  useEffect(() => () => { parteTitlu('masina', null); }, []);
  if (!i || !loc) return null;
  const c = cuvant(i);
  const p = procentul(i);
  return createPortal(
    <span className="indicator-lucrare" data-culoare={i.culoare} data-fel={i.fel} data-procent={p !== null} data-testid="indicator-lucrare">
      <button type="button" className="indicator-deschide" data-masina="indicator" title={t('masina.indicator.titlu')}
        aria-label={`${t('masina.indicator.titlu')}: ${p === null ? c : `${c} ${p}`}`} onClick={onDeschide}>
        <span className="indicator-punct" aria-hidden="true" />
        <span className="indicator-cuvant">{c}</span>
        {p !== null && <> <span className="indicator-procent">{p}</span></>}
      </button>
      {i.buton === 'pauza' && (
        <button type="button" className="cu-eticheta" data-icona="indicator.pauza" data-masina="indicator-pauza" title={t('masina.pauza')}
          onClick={() => { s.eveniment({ tip: 'hold' }); }}><span className="eticheta">{t('masina.pauza')}</span></button>
      )}
      {i.buton === 'reia' && (
        <button type="button" className="cu-eticheta" data-icona="indicator.reia" data-masina="indicator-reia" title={t('masina.eliberare')}
          onClick={() => { s.eveniment({ tip: 'eliberare' }); }}><span className="eticheta">{t('masina.eliberare')}</span></button>
      )}
    </span>,
    loc,
  );
}
