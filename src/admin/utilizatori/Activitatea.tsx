import { useState, type ReactElement } from 'react';
import { pasDin } from '../../../shared/pasiEroare.ts';
import type { LotCronologie } from '../../../shared/utilizare.ts';
import { cronologiaContului, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { dataScurta, motivDin } from '../erori/date.ts';
import { DescrierePas } from '../pasi/Pasi.tsx';
import { paginaDin, sesiuniDin, textClipa } from './activitate.ts';

/**
 * Activitatea unui om (ADR 0262 §6, felia A.11c), în contul ales din Utilizatori, doar cu „Utilizare: sesiuni”: nimic nu se
 * citește până nu cere cineva (citirea intră în audit); apoi sesiunile, cele mai noi întâi, fiecare cu pașii ei (clipa față
 * de pornirea paginii, ce, felul, rezultatul altul decât „ok”) și „Mai vechi” cât mai sunt loturi.
 */

type Stare =
  | { readonly faza: 'inchis' }
  | { readonly faza: 'citeste'; readonly loturi: readonly LotCronologie[] }
  | { readonly faza: 'gata'; readonly loturi: readonly LotCronologie[]; readonly maiVechi: boolean }
  | { readonly faza: 'eroare'; readonly loturi: readonly LotCronologie[]; readonly motiv: string };

export function Activitatea({ con, uid, nume, limba }: {
  readonly con: Conexiune; readonly uid: string; readonly nume: ReadonlyMap<string, string>; readonly limba: string;
}): ReactElement {
  const [stare, setStare] = useState<Stare>({ faza: 'inchis' });
  const citeste = (inainte: readonly LotCronologie[]): void => {
    setStare({ faza: 'citeste', loturi: inainte });
    cronologiaContului(con, uid, inainte.at(-1)?.primit).then(
      (r) => {
        const p = paginaDin(r);
        setStare({ faza: 'gata', loturi: [...inainte, ...p.loturi], maiVechi: p.maiVechi });
      },
      (e: unknown) => { setStare({ faza: 'eroare', loturi: inainte, motiv: motivDin(e) }); },
    );
  };
  const loturi = stare.faza === 'inchis' ? [] : stare.loturi;
  const sesiuni = sesiuniDin(loturi);
  return (
    <section className="util-activitate" data-util="activitate" aria-labelledby="util-act">
      <h4 id="util-act">{t('admin.util.act')}</h4>
      {stare.faza === 'inchis' ? (
        <>
          <p className="admin-slab">{t('admin.util.act.nota')}</p>
          <button type="button" data-util="arata-activitatea" onClick={() => { citeste([]); }}>{t('admin.util.act.arata')}</button>
        </>
      ) : null}
      {stare.faza === 'gata' && sesiuni.length === 0 ? <p className="admin-slab" data-util="activitate-gol">{t('admin.util.act.gol')}</p> : null}
      {sesiuni.length > 0 ? (
        <ol className="util-sesiuni" data-util="sesiuni">
          {sesiuni.map((s) => (
            <li key={s.sesiune} data-sesiune={s.sesiune}>
              <details>
                <summary>
                  {dataScurta(new Date(s.inceput), limba)}
                  <span className="admin-slab">
                    {' · '}{t('admin.util.act.versiune', { versiune: s.context?.versiune ?? '?' })}
                    {' · '}{t('admin.util.act.pasi', { n: s.evenimente.length })}
                    {' · '}{textClipa(s.durata).slice(1)}
                    {s.aruncate > 0 ? ` · ${t('admin.util.act.aruncate', { n: s.aruncate })}` : ''}
                  </span>
                </summary>
                <ol className="admin-pasi">
                  {s.evenimente.map((e, i) => {
                    const p = pasDin(e, e.t);
                    return (
                      <li key={i} data-pas={p.fel} data-pas-id={p.id}>
                        <span className="admin-slab">{textClipa(e.t)}</span>{' '}<DescrierePas p={p} nume={nume} />
                      </li>
                    );
                  })}
                </ol>
              </details>
            </li>
          ))}
        </ol>
      ) : null}
      {stare.faza === 'citeste' ? <p className="admin-slab" aria-busy="true">{t('admin.util.act.citeste')}</p> : null}
      {stare.faza === 'eroare' ? (
        <p className="admin-eroare" role="alert" data-util="activitate-eroare">
          {t('admin.util.act.citire', { motiv: stare.motiv })}{' '}
          <button type="button" onClick={() => { citeste(stare.loturi); }}>{t('admin.uz.reincearca')}</button>
        </p>
      ) : null}
      {stare.faza === 'gata' && stare.maiVechi ? (
        <button type="button" data-util="mai-vechi" onClick={() => { citeste(stare.loturi); }}>{t('admin.util.act.mai-vechi')}</button>
      ) : null}
    </section>
  );
}
