import { useState, useSyncExternalStore, type ReactElement } from 'react';
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { AlegereSurori } from '../model/taiereSurori.ts';
import { alegereTinuta, ascultaSurori, raspundeSurori, tineAlegerea, type IntrebareSurori as Intrebare } from '../ui/intrebareSurori.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * Banda întrebării pentru o piesă pusă de mai multe ori (felia 10.3↑m, ADR 0180), sus, sub bare, ca întrebarea grupării: de
 * câte ori e pusă piesa, «Desprinde și taie» (principal: nu schimbă nimic în afara formelor tăiate), «Taie piesa (toate cele
 * N)» (doar unde are sens), „Ține minte alegerea” și «Renunță». La conversie, aceleași, cu „convertește”.
 */
export function IntrebareSurori({ intrebare }: { readonly intrebare: Intrebare }): ReactElement | null {
  const [tine, setTine] = useState(false);
  const taie = intrebare.fel === 'taie';
  const n = intrebare.n;
  const text = t(taie ? 'editare.surori.taie' : 'editare.surori.converteste', { n });
  return (
    <div className="intrebare-grupare" role="group" aria-label={text} data-testid="intrebare-surori">
      <span>{text}</span>
      <button type="button" className="principal" data-surori="desprinde" title={t('editare.surori.desprinde.titlu')}
        onClick={() => { raspundeSurori('desprinde', tine); }}>
        {t(taie ? 'editare.surori.desprinde' : 'editare.surori.desprinde-converteste')}
      </button>
      {intrebare.piesa ? (
        <button type="button" data-surori="piesa" title={t(taie ? 'editare.surori.piesa.titlu' : 'editare.surori.piesa-converteste.titlu')}
          onClick={() => { raspundeSurori('piesa', tine); }}>
          {t(taie ? 'editare.surori.piesa' : 'editare.surori.piesa-converteste', { n })}
        </button>
      ) : null}
      <label>
        <input type="checkbox" data-surori="tine" checked={tine} onChange={(e) => { setTine(e.target.checked); }} />
        {t('editare.surori.tine')}
      </label>
      <button type="button" data-surori="renunta" onClick={() => { raspundeSurori(null); }}>{t('editare.surori.renunta')}</button>
    </div>
  );
}

/**
 * Rândul „Piese puse de mai multe ori” al opțiunilor tăierii și al conversiei: alegerea ținută („întreabă”, „desprinde”, „toată
 * piesa”), aceeași în toate locurile; „întreabă” o uită.
 */
export function RandSurori({ date }: { readonly date: (x: string) => Record<string, string> }): ReactElement {
  const a = useSyncExternalStore(ascultaSurori, citeste, citeste);
  return (
    <div className="rand-optiuni-taiere" title={t('editare.surori.optiune.titlu')}>
      <label>
        {t('editare.surori.optiune')}
        <select className="camp-taiere" value={a ?? 'intreaba'} {...date('surori')}
          onChange={(e) => { const v = e.target.value; tineAlegerea(v === 'desprinde' || v === 'piesa' ? (v as AlegereSurori) : null); }}>
          <option value="intreaba">{t('editare.surori.optiune.intreaba')}</option>
          <option value="desprinde">{t('editare.surori.optiune.desprinde')}</option>
          <option value="piesa">{t('editare.surori.optiune.piesa')}</option>
        </select>
      </label>
    </div>
  );
}

const citeste = (): AlegereSurori | null => alegereTinuta();
