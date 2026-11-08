import type { ReactElement } from 'react';
import { t } from '../i18n/t.ts';
import { schimbaOptiuniTaiere, useOptiuniTaiere } from './optiuniTaiere.ts';

/** Numele părților păstrate, după cuțit (ADR 0181 §2): stânga / dreapta, deasupra / dedesubt (orizontala), înăuntru / în afară. */
export type NumeParti = readonly ['stanga', 'dreapta'] | readonly ['deasupra', 'dedesubt'] | readonly ['inauntru', 'afara'];

/**
 * Grupurile „Prelungește capetele” și „Păstrează” (ADR 0181 §2), comune panoului Taie și opțiunilor din bara Cuțitului: o
 * singură setare, ținută în browser (`optiuniTaiere.ts`). `loc` dă numele grupurilor și atributul de date (`data-taiere` în
 * panou, `data-cutit` în bara cuțitului: amândouă pot fi deschise deodată); `parti`, numele părților după cuțit; `cuCapete`:
 * prelungirea are sens (un cuțit cu capete; liniile din panou sunt deja întregi, iar un cuțit închis n-are capete).
 */
export function GrupuriTaiere({ loc, parti, cuCapete }: {
  readonly loc: 'taiere' | 'cutit';
  readonly parti: NumeParti;
  readonly cuCapete: boolean;
}): ReactElement {
  const o = useOptiuniTaiere();
  const date = (x: string): Record<string, string> => ({ [`data-${loc}`]: x });
  return (
    <>
      <div className="rand-optiuni-taiere" role="radiogroup" aria-label={t('editare.taiere.prelungeste')} title={t('editare.taiere.prelungeste.titlu')}>
        <span>{t('editare.taiere.prelungeste')}</span>
        {(['nu', 'forma', 'intreaga'] as const).map((x) => (
          <label key={x}>
            <input type="radio" name={`${loc}-prelungeste`} checked={o.prelungeste === x} disabled={!cuCapete} {...date(`prelungeste-${x}`)}
              onChange={() => { schimbaOptiuniTaiere({ prelungeste: x }); }} />
            {t(`editare.taiere.prelungeste.${x}`)}
          </label>
        ))}
      </div>
      <div className="rand-optiuni-taiere" role="radiogroup" aria-label={t('editare.taiere.pastreaza')} title={t('editare.taiere.parte.titlu')}>
        <span>{t('editare.taiere.pastreaza')}</span>
        {(['ambele', 'stanga', 'dreapta'] as const).map((x) => (
          <label key={x}>
            <input type="radio" name={`${loc}-parte`} checked={o.pastreaza === x} {...date(`parte-${x}`)} onChange={() => { schimbaOptiuniTaiere({ pastreaza: x }); }} />
            {t(`editare.taiere.parte.${x === 'ambele' ? 'ambele' : parti[x === 'stanga' ? 0 : 1]}`)}
          </label>
        ))}
      </div>
    </>
  );
}
