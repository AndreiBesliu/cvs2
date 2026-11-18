import { useId, useState, type ReactElement } from 'react';
import { t } from '../../i18n/t.ts';
import { cauta, FILA_FELULUI, simplu, type FelGasit, type Gasibil } from './date.ts';
import { LegaturaFila } from './stari.tsx';

/**
 * Căutarea din antet (ADR 0260 §1): o eroare, un cont sau un tichet, în ce au citit deja filele (căutarea pe server rămâne
 * mai târziu, ADR 0116). Un fel pe care rolul îl vede, dar pe care nicio filă nu l-a citit încă, se spune. Un rezultat
 * deschide fila lui, cu rândul găsit.
 */
export function Cautare({ surse, feluri }: { readonly surse: ReadonlyMap<FelGasit, readonly Gasibil[]>; readonly feluri: readonly FelGasit[] }): ReactElement {
  const [q, setQ] = useState('');
  const [deschis, setDeschis] = useState(false);
  const id = useId();
  const necitite = feluri.filter((f) => !surse.has(f));
  const rezultate = cauta(q, surse);
  return (
    <div className="admin-cauta" role="search" onKeyDown={(e) => { if (e.key === 'Escape') setDeschis(false); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDeschis(false); }}>
      <input type="search" data-admin="cauta" aria-label={t('admin.cauta')} placeholder={t('admin.cauta')} value={q} aria-controls={id}
        aria-expanded={deschis} onFocus={() => { setDeschis(true); }} onChange={(e) => { setQ(e.target.value); setDeschis(true); }} />
      {deschis && simplu(q.trim()).length >= 2 ? (
        <div className="admin-cauta-rezultate" id={id}>
          {rezultate.map(({ fel, randuri }) => (
            <section key={fel}>
              <h3>{t(`admin.fila.${FILA_FELULUI[fel]}`)}</h3>
              <ul>
                {randuri.map((r) => (
                  <li key={r.id}>
                    <LegaturaFila fila={FILA_FELULUI[fel]} tinta={{ id: r.id, rezolvat: r.rezolvat }} data-gasit={`${fel}:${r.id}`}
                      laClic={() => { setDeschis(false); }}>
                      <span>{r.text}</span>
                      {r.detaliu ? <span className="admin-slab">{r.detaliu}</span> : null}
                    </LegaturaFila>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {rezultate.length === 0 ? <p className="admin-slab">{t('admin.cauta.nimic')}</p> : null}
          {necitite.length > 0 ? (
            <p className="admin-slab" data-admin="cauta-necitite">
              {t('admin.cauta.necitite', { file: necitite.map((f) => t(`admin.fila.${FILA_FELULUI[f]}`)).join(', ') })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
