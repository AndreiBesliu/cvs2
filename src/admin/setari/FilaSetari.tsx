import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { doc, getDoc } from 'firebase/firestore/lite';
import { MARGINI_SETARI, type SetariConturi } from '../../../shared/conturi.ts';
import { CALE_SETARI, SETARI_IMPLICITE, setariCerute, setariDin } from '../../../shared/conturiPlan.ts';
import { setarileConturilor, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { dataDin, dataScurta, motivDin, type Masura } from '../erori/date.ts';
import '../personal/personal.css';
import '../utilizatori/utilizatori.css';

/**
 * Fila Setări (ADR 0116 §20, felia 14.C↑b), doar a owner-ului: zilele în care aplicația ține dreptul contului fără
 * reconfirmare (offline) și cât se păstrează tichetele rezolvate. Valorile se citesc din `setari/conturi` (regula o dă doar
 * owner-ului; fără document, implicitele) și se schimbă prin callable-ul `administreazaConturile`, cu auditul pe server.
 */

type Citite = { readonly setari: SetariConturi; readonly modificatLa: Date | null; readonly salvate: boolean };

type Lucru = { readonly faza: 'liber' | 'lucreaza' } | { readonly faza: 'gata'; readonly mesaj: string } | { readonly faza: 'eroare'; readonly motiv: string };

export function FilaSetari({ con }: { readonly con: Conexiune }): ReactElement {
  const limba = useLimba();
  const [citite, setCitite] = useState<Masura<Citite> | null>(null);
  const [rev, setRev] = useState(0);
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });

  useEffect(() => {
    let viu = true;
    getDoc(doc(con.db, CALE_SETARI.colectie, CALE_SETARI.id)).then(
      (s) => { if (viu) setCitite({ ok: true, valoare: { setari: setariDin(s.data()), modificatLa: dataDin(s.get('modificatLa')), salvate: s.exists() } }); },
      (e: unknown) => { if (viu) setCitite({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, rev]);

  const salveaza = (setari: SetariConturi): void => {
    setLucru({ faza: 'lucreaza' });
    setarileConturilor(con, { actiune: 'setari', setari }).then((r) => {
      setLucru({ faza: 'gata', mesaj: t(r.schimbat ? 'admin.set.salvate' : 'admin.set.neschimbate') });
      setRev((n) => n + 1);
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e) }); });
  };

  return (
    <div className="pers util">
      {lucru.faza === 'gata' ? <div className="pers-stare" role="status" data-set="gata"><p>{lucru.mesaj}</p></div> : null}
      <section className="pers-sectiune" aria-labelledby="set-conturi">
        <h2 id="set-conturi">{t('admin.set.titlu')}</h2>
        <p className="admin-slab">{t('admin.set.text')}</p>
        {citite === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.set.se-incarca')}</p>
          : !citite.ok ? <p className="admin-eroare" role="alert" data-set="eroare-citire">{t('admin.set.citire', { motiv: citite.motiv })}</p>
            : (
              <>
                <p className="admin-slab" data-set="sursa">
                  {citite.valoare.salvate ? t('admin.set.modificate', { data: dataScurta(citite.valoare.modificatLa, limba) }) : t('admin.set.implicite')}
                </p>
                <Formular key={rev} initiale={citite.valoare.setari} ocupat={lucru.faza === 'lucreaza'} faraAppCheck={con.appCheck === 'oprit'}
                  eroare={lucru.faza === 'eroare' ? lucru.motiv : null} salveaza={salveaza} />
              </>
            )}
      </section>
    </div>
  );
}

function Formular({ initiale, ocupat, faraAppCheck, eroare, salveaza }: {
  readonly initiale: SetariConturi; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly salveaza: (s: SetariConturi) => void;
}): ReactElement {
  const [offline, setOffline] = useState(String(initiale.zileOffline));
  const [tichete, setTichete] = useState(String(initiale.zilePastrareTichete));
  const cerute = setariCerute({ zileOffline: Number(offline), zilePastrareTichete: Number(tichete) });
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    if (cerute) salveaza(cerute);
  };
  const { zileOffline: o, zilePastrareTichete: p } = MARGINI_SETARI;
  return (
    <form className="util-setari" onSubmit={trimite} data-set="formular">
      <label>
        <span>{t('admin.set.offline')}</span>
        <input type="number" required min={o.min} max={o.max} step={1} value={offline} data-set="zile-offline" onChange={(e) => { setOffline(e.target.value); }} />
        <span className="admin-slab">{t('admin.set.offline-text', { min: o.min, max: o.max, implicit: SETARI_IMPLICITE.zileOffline })}</span>
      </label>
      <label>
        <span>{t('admin.set.tichete')}</span>
        <input type="number" required min={p.min} max={p.max} step={1} value={tichete} data-set="zile-tichete" onChange={(e) => { setTichete(e.target.value); }} />
        <span className="admin-slab">{t('admin.set.tichete-text', { min: p.min, max: p.max, implicit: SETARI_IMPLICITE.zilePastrareTichete })}</span>
      </label>
      <div className="admin-randuri">
        <button type="submit" className="principal" disabled={ocupat || faraAppCheck || cerute === null} data-set="salveaza">{t('admin.set.salveaza')}</button>
        {faraAppCheck ? <span className="admin-slab" data-set="fara-appcheck">{t('admin.erori.fara-appcheck')}</span> : null}
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-set="eroare">{t('admin.set.esec', { motiv: eroare })}</p> : null}
    </form>
  );
}
