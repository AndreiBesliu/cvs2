import { useEffect, useState, type ReactElement } from 'react';
import { t } from '../i18n/t.ts';
import { latimeBuna } from '../model/intreBucati.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { schimbaOptiuniTaiere, useOptiuniTaiere } from './optiuniTaiere.ts';

/** Numele părților păstrate, după cuțit (ADR 0181 §2): stânga / dreapta, deasupra / dedesubt (orizontala), înăuntru / în afară. */
export type NumeParti = readonly ['stanga', 'dreapta'] | readonly ['deasupra', 'dedesubt'] | readonly ['inauntru', 'afara'];

/**
 * Grupurile „Prelungește capetele”, „Păstrează” și „Între bucăți” (ADR 0181 §2), comune panoului Taie și opțiunilor din bara
 * Cuțitului: o singură setare, ținută în browser (`optiuniTaiere.ts`). `loc` dă numele grupurilor și atributul de date
 * (`data-taiere` în panou, `data-cutit` în bara cuțitului: amândouă pot fi deschise deodată); `parti`, numele părților după
 * cuțit; `cuCapete`: prelungirea are sens (un cuțit cu capete; liniile din panou sunt deja întregi, iar un cuțit închis n-are
 * capete). „Între bucăți” cere „Închide bucățile”: fără ea, grupul e oprit, iar sfatul lui spune de ce.
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
      <div className="rand-optiuni-taiere" role="radiogroup" aria-label={t('editare.taiere.intre')}
        title={t(o.inchide ? 'editare.taiere.intre.titlu' : 'editare.taiere.intre.inchide')}>
        <span>{t('editare.taiere.intre')}</span>
        {(['nimic', 'spatiu', 'suprapunere'] as const).map((x) => (
          <label key={x}>
            <input type="radio" name={`${loc}-intre`} checked={o.intre === x} disabled={!o.inchide} {...date(`intre-${x}`)}
              onChange={() => { schimbaOptiuniTaiere({ intre: x }); }} />
            {t(`editare.taiere.intre.${x}`)}
          </label>
        ))}
        <CampLatime date={date} oprit={!o.inchide || o.intre === 'nimic'} />
      </div>
    </>
  );
}

/**
 * Lățimea dintre bucăți, în mm: textul scris rămâne cât scrii (o valoare care nu e bună se arată ca greșită și nu ajunge în
 * opțiuni); altfel urmează opțiunile, schimbate și din celălalt loc.
 */
function CampLatime({ date, oprit }: { readonly date: (x: string) => Record<string, string>; readonly oprit: boolean }): ReactElement {
  const o = useOptiuniTaiere();
  const virgula = useLimba() === 'ro';
  const [text, setText] = useState(() => textNumar(o.latime, virgula));
  const [scriu, setScriu] = useState(false);
  useEffect(() => { if (!scriu) setText(textNumar(o.latime, virgula)); }, [o.latime, virgula, scriu]);
  const x = citesteNumar(text);
  const bun = x !== null && latimeBuna(x);
  return (
    <span className="camp-latime-intre">
      <input className="camp-taiere" value={text} inputMode="decimal" disabled={oprit} aria-invalid={!bun} aria-label={t('editare.taiere.intre.latime')}
        title={t('editare.taiere.intre.latime')} {...date('latime')}
        onFocus={() => { setScriu(true); }} onBlur={() => { setScriu(false); }}
        onChange={(e) => {
          setText(e.target.value);
          const v = citesteNumar(e.target.value);
          if (v !== null && latimeBuna(v)) schimbaOptiuniTaiere({ latime: v });
        }} />
      <span>mm</span>
    </span>
  );
}
