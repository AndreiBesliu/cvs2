import { useEffect, useState, type ReactElement } from 'react';
import { t } from '../i18n/t.ts';
import { MODELE_IMBINARE } from '../model/imbinare.ts';
import { latimeBuna } from '../model/intreBucati.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { marimeImbinareBuna, schimbaOptiuniTaiere, useOptiuniTaiere, type FelImbinare } from './optiuniTaiere.ts';

/** Numele părților păstrate, după cuțit (ADR 0181 §2): stânga / dreapta, deasupra / dedesubt (orizontala), înăuntru / în afară. */
export type NumeParti = readonly ['stanga', 'dreapta'] | readonly ['deasupra', 'dedesubt'] | readonly ['inauntru', 'afara'];

/**
 * Grupurile „Prelungește capetele”, „Păstrează”, „Între bucăți” și „Îmbinarea” (ADR 0181 §2, §6), comune panoului Taie și
 * opțiunilor din bara Cuțitului: o singură setare, ținută în browser (`optiuniTaiere.ts`). `loc` dă numele grupurilor și
 * atributul de date (`data-taiere` în panou, `data-cutit` în bara cuțitului: amândouă pot fi deschise deodată); `parti`, numele
 * părților după cuțit; `cuCapete`: prelungirea are sens (un cuțit cu capete; liniile din panou sunt deja întregi, iar un cuțit
 * închis n-are capete); `drept`: tăietura e dreaptă (liniile din panou, felul Linie al cuțitului), deci se poate îmbina. „Între
 * bucăți” și „Îmbinarea” cer „Închide bucățile”: fără ea, grupurile sunt oprite, iar sfatul lor spune de ce.
 */
export function GrupuriTaiere({ loc, parti, cuCapete, drept }: {
  readonly loc: 'taiere' | 'cutit';
  readonly parti: NumeParti;
  readonly cuCapete: boolean;
  readonly drept: boolean;
}): ReactElement {
  const o = useOptiuniTaiere();
  const date = (x: string): Record<string, string> => ({ [`data-${loc}`]: x });
  const faraImbinare = !o.inchide || !drept;
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
        <CampMm valoare={o.latime} bun={latimeBuna} scrie={(latime) => { schimbaOptiuniTaiere({ latime }); }} eticheta={t('editare.taiere.intre.latime')}
          date={date('latime')} oprit={!o.inchide || o.intre === 'nimic'} />
        <span>mm</span>
      </div>
      <div className="rand-optiuni-taiere" title={t(!o.inchide ? 'editare.taiere.imbinare.inchide' : !drept ? 'editare.taiere.imbinare.drepte' : 'editare.taiere.imbinare.titlu')}>
        <label>
          {t('editare.taiere.imbinare')}
          <select className="camp-taiere" value={o.imbinare} disabled={faraImbinare} {...date('imbinare')}
            onChange={(e) => { schimbaOptiuniTaiere({ imbinare: e.target.value as FelImbinare }); }}>
            {(['dreapta', ...MODELE_IMBINARE] as const).map((m) => <option key={m} value={m}>{t(`editare.taiere.imbinare.${m}`)}</option>)}
          </select>
        </label>
        {o.imbinare === 'dreapta' ? null : (
          <span className="campuri-imbinare">
            {(['pas', 'inaltime', 'raza'] as const).map((x) => (
              <label key={x}>
                {t(`editare.taiere.imbinare.${x}`)}
                <CampMm valoare={o[x]} bun={(v) => marimeImbinareBuna(v, x === 'raza')} scrie={(v) => { schimbaOptiuniTaiere({ [x]: v }); }}
                  eticheta={t(`editare.taiere.imbinare.${x}`)} date={date(`imbinare-${x}`)} oprit={faraImbinare} />
              </label>
            ))}
            <span>mm</span>
          </span>
        )}
      </div>
    </>
  );
}

/**
 * Un câmp în mm al opțiunilor: textul scris rămâne cât scrii (o valoare care nu e bună se arată ca greșită și nu ajunge în
 * opțiuni); altfel urmează opțiunile, schimbate și din celălalt loc.
 */
function CampMm({ valoare, bun, scrie, eticheta, date, oprit }: {
  readonly valoare: number;
  readonly bun: (x: number) => boolean;
  readonly scrie: (x: number) => void;
  readonly eticheta: string;
  readonly date: Record<string, string>;
  readonly oprit: boolean;
}): ReactElement {
  const virgula = useLimba() === 'ro';
  const [text, setText] = useState(() => textNumar(valoare, virgula));
  const [scriu, setScriu] = useState(false);
  useEffect(() => { if (!scriu) setText(textNumar(valoare, virgula)); }, [valoare, virgula, scriu]);
  const x = citesteNumar(text);
  return (
    <input className="camp-taiere camp-mm" value={text} inputMode="decimal" disabled={oprit} aria-invalid={x === null || !bun(x)} aria-label={eticheta}
      title={eticheta} {...date} onFocus={() => { setScriu(true); }} onBlur={() => { setScriu(false); }}
      onChange={(e) => {
        setText(e.target.value);
        const v = citesteNumar(e.target.value);
        if (v !== null && bun(v)) scrie(v);
      }} />
  );
}
