import { useRef, useState, type ReactElement } from 'react';
import { t } from '../i18n/t.ts';
import { pragGolBun, tolerantaLegareBuna, type GolLegare } from '../model/legareOptiuni.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useInFereastra } from './inFereastra.ts';
import { useLimba } from '../ui/useLimba.ts';
import { schimbaOptiuniLegare, useOptiuniLegare } from './optiuniLegare.ts';

/**
 * Opțiunile legării căilor (ADR 0182 §7, felia 10.3↑o), sub butonul lor din secțiunea booleanului: lipirea (mm), golul dintre
 * două căi (cu o linie; cu o linie până la N mm; doar lipirea), unde se întâlnesc capetele lipite și căile cu operații
 * diferite. Se țin în browser (`optiuniLegare.ts`), aceleași și în panoul Verificare; un număr greșit rămâne în câmp, cu
 * motivul, și nu schimbă nimic. „Leagă căile” leagă alegerea de acum. Esc îl închide.
 */
export function PanouLegare({ poate, onLeaga, onInchide }: {
  /** Leagă: cel puțin o formă aleasă și documentul se poate schimba. */
  readonly poate: boolean;
  readonly onLeaga: () => void;
  readonly onInchide: () => void;
}): ReactElement {
  const o = useOptiuniLegare();
  const virgula = useLimba() === 'ro';
  const [textToleranta, setTextToleranta] = useState(() => textNumar(o.toleranta, virgula));
  const [textPrag, setTextPrag] = useState(() => textNumar(o.pragGol, virgula));
  const radacina = useRef<HTMLDivElement | null>(null);
  useInFereastra(radacina);
  const toleranta = citesteNumar(textToleranta), prag = citesteNumar(textPrag);
  const tolerantaRea = toleranta === null || !tolerantaLegareBuna(toleranta);
  const pragRau = o.gol === 'prag' && (prag === null || !pragGolBun(prag));
  const radio = <K extends string>(nume: string, valori: readonly K[], ales: K, eticheta: (k: K) => string, schimba: (k: K) => void): ReactElement => (
    <div className="fel-retea" role="radiogroup" aria-label={t(`editare.legare.${nume}` as 'editare.legare.gol')}>
      {valori.map((k) => (
        <button key={k} type="button" role="radio" aria-checked={ales === k} aria-pressed={ales === k} data-legare={`${nume}-${k}`}
          onClick={() => { schimba(k); }}>
          {eticheta(k)}
        </button>
      ))}
    </div>
  );
  return (
    <div className="insula panou-retea panou-legare" id="panou-legare" ref={radacina} role="group" aria-label={t('editare.legare.optiuni')} data-testid="panou-legare"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onInchide();
      }}>
      <div className="campuri-retea">
        <label className="camp-retea" title={t('editare.legare.toleranta.titlu')}>
          <span>{t('editare.legare.toleranta')}</span>
          <input value={textToleranta} inputMode="decimal" data-legare="toleranta" aria-invalid={tolerantaRea}
            onChange={(e) => {
              setTextToleranta(e.target.value);
              const x = citesteNumar(e.target.value);
              if (x !== null && tolerantaLegareBuna(x)) schimbaOptiuniLegare({ toleranta: x });
            }} />
        </label>
      </div>
      <span className="eticheta-retea">{t('editare.legare.gol')}</span>
      {radio<GolLegare>('gol', ['linie', 'prag', 'lipire'], o.gol, (k) => t(`editare.legare.gol.${k}`), (k) => { schimbaOptiuniLegare({ gol: k }); })}
      {o.gol === 'prag' ? (
        <div className="campuri-retea">
          <label className="camp-retea">
            <span>{t('editare.legare.prag')}</span>
            <input value={textPrag} inputMode="decimal" data-legare="prag" aria-invalid={pragRau}
              onChange={(e) => {
                setTextPrag(e.target.value);
                const x = citesteNumar(e.target.value);
                if (x !== null && pragGolBun(x)) schimbaOptiuniLegare({ pragGol: x });
              }} />
          </label>
        </div>
      ) : null}
      <span className="eticheta-retea">{t('editare.legare.capete')}</span>
      {radio('capete', ['prima', 'mijloc'] as const, o.capete, (k) => t(`editare.legare.capete.${k}`), (k) => { schimbaOptiuniLegare({ capete: k }); })}
      <span className="eticheta-retea">{t('editare.legare.operatii')}</span>
      {radio('operatii', ['refuza', 'prima'] as const, o.operatii, (k) => t(`editare.legare.operatii.${k}`), (k) => { schimbaOptiuniLegare({ operatii: k }); })}
      {tolerantaRea || pragRau ? <p className="motiv-retea" role="status" data-testid="motiv-optiuni-legare">{t('editare.legare.motiv.toleranta')}</p> : null}
      <div className="butoane-retea">
        <button type="button" className="principal" data-legare="leaga" disabled={!poate || tolerantaRea || pragRau} onClick={onLeaga}>
          {t('actiune.leaga-caile')}
        </button>
        <button type="button" data-legare="inchide" onClick={onInchide}>{t('editare.retea.inchide')}</button>
      </div>
    </div>
  );
}
