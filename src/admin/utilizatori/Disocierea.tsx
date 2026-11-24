import { useState, type ReactElement } from 'react';
import { disociazaUtilizarea, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { dataScurta, motivDin } from '../erori/date.ts';

/**
 * Disocierea utilizării unui cont (ADR 0262 §3, felia A.11e), la cererea omului (printr-un tichet), cu „Conturi:
 * administrează”: un pas de confirmare (nu se poate desface), apoi serverul pune pseudonimul pe loturile de până acum și pe
 * cele care vin; fila arată câte, iar contul rămâne cu data despărțirii.
 */

type Stare =
  | { readonly faza: 'liber' }
  | { readonly faza: 'confirma' }
  | { readonly faza: 'lucreaza' }
  | { readonly faza: 'gata'; readonly loturi: number }
  | { readonly faza: 'eroare'; readonly motiv: string };

export function Disocierea({ con, uid, disociatLa, limba, faraAppCheck, dupa }: {
  readonly con: Conexiune; readonly uid: string; readonly disociatLa: Date | null; readonly limba: string; readonly faraAppCheck: boolean;
  /** După o disociere: lista se citește din nou (contul vine cu data). */
  readonly dupa: () => void;
}): ReactElement {
  const [stare, setStare] = useState<Stare>({ faza: 'liber' });
  const disociaza = (): void => {
    setStare({ faza: 'lucreaza' });
    disociazaUtilizarea(con, uid).then(
      (r) => { setStare({ faza: 'gata', loturi: r.loturi }); dupa(); },
      (e: unknown) => { setStare({ faza: 'eroare', motiv: motivDin(e) }); },
    );
  };
  return (
    <section className="util-disociere" data-util="disociere" aria-labelledby="util-dis">
      <h4 id="util-dis">{t('admin.util.dis')}</h4>
      {stare.faza === 'gata' ? <p className="admin-mesaj" role="status" data-util="disociat-acum">{t('admin.util.dis.gata', { n: stare.loturi })}</p> : null}
      {disociatLa !== null ? (
        <p className="admin-slab" data-util="disociat">{t('admin.util.dis.din', { data: dataScurta(disociatLa, limba) })}</p>
      ) : stare.faza === 'gata' ? null : (
        <>
          <p className="admin-slab">{t('admin.util.dis.nota')}</p>
          {stare.faza === 'confirma' || stare.faza === 'lucreaza' ? (
            <div className="util-confirma" role="group" aria-label={t('admin.util.dis')}>
              <p>{t('admin.util.dis.sigur')}</p>
              <button type="button" className="principal" data-util="confirma-disocierea" disabled={stare.faza === 'lucreaza' || faraAppCheck} onClick={disociaza}>
                {stare.faza === 'lucreaza' ? t('admin.util.dis.lucreaza') : t('admin.util.dis.confirma')}
              </button>
              <button type="button" disabled={stare.faza === 'lucreaza'} onClick={() => { setStare({ faza: 'liber' }); }}>{t('admin.util.dis.renunta')}</button>
            </div>
          ) : (
            <button type="button" data-util="disociaza" disabled={faraAppCheck} onClick={() => { setStare({ faza: 'confirma' }); }}>{t('admin.util.dis.buton')}</button>
          )}
        </>
      )}
      {stare.faza === 'eroare' ? <p className="admin-eroare" role="alert" data-util="disociere-eroare">{t('admin.util.dis.esec', { motiv: stare.motiv })}</p> : null}
    </section>
  );
}
