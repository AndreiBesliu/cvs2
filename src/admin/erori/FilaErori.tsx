import { useEffect, useState, type ReactElement } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { marcheazaEroarea, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { aparitieDin, dataScurta, laPlafonOameni, motivDin, randDin, type Aparitie, type Masura, type RandGrup } from './date.ts';

/** Câte grupuri arată fila; peste, ADR 0040 („Se redeschide dacă”) cere paginarea. */
export const PLAFON_GRUPURI = 100;
const PLAFON_APARITII = 20;

/**
 * Fila Erori (ADR 0040 §4): grupurile din `errorLogs`, cele mai recente întâi, citite la cerere prin reguli; deschis, un
 * grup arată ultima apariție și ultimele 20, plus „Rezolvat” / „Redeschide” prin callable.
 */
export function FilaErori({ con, poateMarca }: { readonly con: Conexiune; readonly poateMarca: boolean }): ReactElement {
  const l = useLimba();
  const [filtru, setFiltru] = useState<'nerezolvate' | 'toate'>('nerezolvate');
  const [lista, setLista] = useState<Masura<readonly RandGrup[]> | null>(null);
  const [deschis, setDeschis] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let viu = true;
    setLista(null);
    const col = collection(con.db, 'errorLogs');
    const q = filtru === 'nerezolvate'
      ? query(col, where('rezolvat', '==', false), orderBy('ultimaData', 'desc'), limit(PLAFON_GRUPURI))
      : query(col, orderBy('ultimaData', 'desc'), limit(PLAFON_GRUPURI));
    getDocs(q).then(
      (s) => { if (viu) setLista({ ok: true, valoare: s.docs.map((d) => randDin(d.id, d.data())) }); },
      (e: unknown) => { if (viu) setLista({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, filtru, rev]);

  return (
    <div className="admin-erori">
      <div className="admin-randuri">
        {(['nerezolvate', 'toate'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filtru === f} data-filtru={f} onClick={() => { setFiltru(f); }}>
            {t(f === 'nerezolvate' ? 'admin.erori.nerezolvate' : 'admin.erori.toate')}
          </button>
        ))}
        <button type="button" data-admin="reincarca" onClick={() => { setRev((r) => r + 1); }}>{t('admin.erori.reincarca')}</button>
      </div>
      {lista === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.erori.se-incarca')}</p>
        : !lista.ok ? <p className="admin-eroare" role="alert" data-admin="eroare-lista">{t('admin.erori.citire', { motiv: lista.motiv })}</p>
          : lista.valoare.length === 0 ? <p className="admin-mesaj" data-admin="gol">{t('admin.erori.niciuna')}</p>
            : (
              <ul className="admin-grupuri">
                {lista.valoare.map((g) => (
                  <li key={g.id} className="admin-grup" data-grup={g.id} data-rezolvat={g.rezolvat}>
                    <div className="admin-grup-rand">
                      <span className="admin-eticheta">{t(g.sursa === 'server' ? 'admin.erori.sursa.server' : 'admin.erori.sursa.client')} · {g.tip}</span>
                      <span className="admin-grup-mesaj">{g.mesaj}</span>
                      <span className="admin-slab">
                        {g.numar === null ? '?' : t('admin.erori.numar', { n: g.numar })}
                        {' · '}
                        {g.oameni === null ? '?' : laPlafonOameni(g.oameni) ? t('admin.erori.oameni-plafon') : t('admin.erori.oameni', { n: g.oameni })}
                        {' · '}
                        {t('admin.erori.prima', { data: dataScurta(g.primaData, l) })}
                        {' · '}
                        {t('admin.erori.ultima', { data: dataScurta(g.ultimaData, l) })}
                        {g.rezolvat ? ` · ${t('admin.erori.rezolvat')}` : ''}
                      </span>
                      <button type="button" aria-expanded={deschis === g.id} onClick={() => { setDeschis((d) => (d === g.id ? null : g.id)); }}>
                        {deschis === g.id ? t('admin.erori.ascunde') : t('admin.erori.detaliu')}
                      </button>
                    </div>
                    {deschis === g.id ? <DetaliuGrup con={con} grup={g} poateMarca={poateMarca} marcat={() => { setRev((r) => r + 1); }} /> : null}
                  </li>
                ))}
              </ul>
            )}
    </div>
  );
}

function DetaliiAparitie({ a }: { readonly a: Aparitie }): ReactElement {
  return (
    <div className="admin-aparitie">
      <p>{t('admin.erori.build', { build: a.build || '—', instanta: a.instanta || '—' })}</p>
      {a.adresa ? <p>{t('admin.erori.adresa', { adresa: a.adresa })}</p> : null}
      {a.browser ? <p>{t('admin.erori.browser', { browser: a.browser })}</p> : null}
      <p>{a.uid ? t('admin.erori.uid', { uid: a.uid }) : t('admin.erori.fara-cont')}</p>
      {a.context ? <p>{t('admin.erori.context', { context: a.context })}</p> : null}
      {a.stiva ? <details><summary>{t('admin.erori.stiva')}</summary><pre>{a.stiva}</pre></details> : null}
    </div>
  );
}

function DetaliuGrup({ con, grup, poateMarca, marcat }: { readonly con: Conexiune; readonly grup: RandGrup; readonly poateMarca: boolean; readonly marcat: () => void }): ReactElement {
  const l = useLimba();
  const [aparitii, setAparitii] = useState<Masura<readonly Aparitie[]> | null>(null);
  const [marcare, setMarcare] = useState<{ readonly faza: 'liber' } | { readonly faza: 'se-marcheaza' } | { readonly faza: 'esec'; readonly motiv: string }>({ faza: 'liber' });

  useEffect(() => {
    let viu = true;
    getDocs(query(collection(con.db, 'errorLogs', grup.id, 'aparitii'), orderBy('cand', 'desc'), limit(PLAFON_APARITII))).then(
      (s) => { if (viu) setAparitii({ ok: true, valoare: s.docs.map((d) => aparitieDin(d.data())) }); },
      (e: unknown) => { if (viu) setAparitii({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, grup.id]);

  const faraAppCheck = con.appCheck === 'oprit';
  const marcheaza = (): void => {
    setMarcare({ faza: 'se-marcheaza' });
    marcheazaEroarea(con, grup.id, !grup.rezolvat).then(
      () => { setMarcare({ faza: 'liber' }); marcat(); },
      (e: unknown) => { setMarcare({ faza: 'esec', motiv: motivDin(e) }); },
    );
  };

  return (
    <div className="admin-detaliu">
      <DetaliiAparitie a={grup.ultima} />
      {/* Fără `erori.rezolva` (ADR 0049), rolul doar citește: butonul nu se arată (serverul l-ar refuza oricum). */}
      {poateMarca ? <div className="admin-randuri">
        <button type="button" data-admin="marcheaza" disabled={faraAppCheck || marcare.faza === 'se-marcheaza'} onClick={marcheaza}>
          {marcare.faza === 'se-marcheaza' ? t('admin.erori.se-marcheaza') : grup.rezolvat ? t('admin.erori.redeschide') : t('admin.erori.marcheaza')}
        </button>
        {faraAppCheck ? <span className="admin-slab" data-admin="fara-appcheck">{t('admin.erori.fara-appcheck')}</span> : null}
        {marcare.faza === 'esec' ? <span className="admin-eroare" role="alert">{t('admin.erori.marcare-esec', { motiv: marcare.motiv })}</span> : null}
      </div> : null}
      <h3>{t('admin.erori.aparitii')}</h3>
      {aparitii === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.erori.se-incarca')}</p>
        : !aparitii.ok ? <p className="admin-eroare" role="alert">{t('admin.erori.aparitii-citire', { motiv: aparitii.motiv })}</p>
          : (
            <ol className="admin-aparitii">
              {aparitii.valoare.map((a, i) => (
                <li key={i}>
                  <span className="admin-slab">{dataScurta(a.cand, l)}</span> {a.mesaj}
                </li>
              ))}
            </ol>
          )}
    </div>
  );
}
