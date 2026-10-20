import { useState, type FormEvent, type ReactElement } from 'react';
import type { User } from 'firebase/auth';
import { adaugaParola, leagaGoogle, metodeCont, schimbaParola, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { motivCont, PAROLA_MIN } from './motive.ts';
import '../personal/personal.css';

/**
 * Fila Cont (ADR 0049 §6), pentru oricine e logat: un singur cont pe adresă, cu metodele legate la el. Cine a intrat cu
 * Google își adaugă o parolă; cine are parolă își leagă Google; parola se schimbă cu cea veche. Firebase păstrează
 * setarea „un cont pe adresă de e-mail”, deci a doua metodă nu face un al doilea cont.
 */
export function FilaCont({ con, user }: { readonly con: Conexiune; readonly user: User }): ReactElement {
  useLimba();
  const [, setRev] = useState(0);
  const [stare, setStare] = useState<{ readonly faza: 'liber' | 'lucreaza' } | { readonly faza: 'gata'; readonly mesaj: string } | { readonly faza: 'eroare'; readonly motiv: string }>({ faza: 'liber' });
  const metode = metodeCont(user);
  const areGoogle = metode.includes('google.com');
  const areParola = metode.includes('password');
  const ocupat = stare.faza === 'lucreaza';

  const fa = (p: Promise<void>, mesaj: string): void => {
    setStare({ faza: 'lucreaza' });
    p.then(() => {
      setStare({ faza: 'gata', mesaj });
      // `reload()` a schimbat metodele contului: fila le citește din nou.
      setRev((n) => n + 1);
    }, (e: unknown) => { setStare({ faza: 'eroare', motiv: motivCont(e) }); });
  };

  return (
    <div className="pers">
      <section className="pers-sectiune" aria-labelledby="cont-metode">
        <h2 id="cont-metode">{t('admin.contul.titlu')}</h2>
        <p data-cont="email"><strong>{user.email ?? user.uid}</strong>{user.emailVerified ? null : <span className="admin-slab"> · {t('admin.contul.neverificat')}</span>}</p>
        <ul className="pers-lista" data-cont="metode">
          <li data-metoda="google.com" data-are={areGoogle}>{t('admin.contul.google')}: {areGoogle ? t('admin.contul.legat') : t('admin.contul.nelegat')}</li>
          <li data-metoda="password" data-are={areParola}>{t('admin.contul.parola')}: {areParola ? t('admin.contul.legat') : t('admin.contul.nelegat')}</li>
        </ul>
        <p className="admin-slab">{t('admin.contul.un-cont')}</p>
        {stare.faza === 'gata' ? <p role="status" data-cont="gata">{stare.mesaj}</p> : null}
        {stare.faza === 'eroare' ? <p className="admin-eroare" role="alert" data-cont="eroare">{t('admin.contul.esec', { motiv: stare.motiv })}</p> : null}
      </section>

      {areParola ? null : (
        <FormularParola titlu={t('admin.contul.adauga-parola')} text={t('admin.contul.adauga-parola-text')} cuVeche={false} ocupat={ocupat}
          trimite={(_, noua) => { fa(adaugaParola(con, noua), t('admin.contul.parola-adaugata')); }} />
      )}
      {areParola ? (
        <FormularParola titlu={t('admin.contul.schimba-parola')} text={null} cuVeche ocupat={ocupat}
          trimite={(veche, noua) => { fa(schimbaParola(con, veche, noua), t('admin.contul.parola-schimbata')); }} />
      ) : null}
      {areGoogle ? null : (
        <section className="pers-sectiune" aria-labelledby="cont-google">
          <h2 id="cont-google">{t('admin.contul.leaga-google')}</h2>
          <p className="admin-slab">{t('admin.contul.leaga-google-text')}</p>
          <button type="button" disabled={ocupat} data-cont="leaga-google" onClick={() => { fa(leagaGoogle(con), t('admin.contul.google-legat')); }}>
            {t('admin.contul.leaga-google')}
          </button>
        </section>
      )}
    </div>
  );
}

function FormularParola({ titlu, text, cuVeche, ocupat, trimite }: {
  readonly titlu: string; readonly text: string | null; readonly cuVeche: boolean; readonly ocupat: boolean;
  readonly trimite: (veche: string, noua: string) => void;
}): ReactElement {
  const [veche, setVeche] = useState('');
  const [noua, setNoua] = useState('');
  const [din, setDin] = useState('');
  const [problema, setProblema] = useState<string | null>(null);
  const id = cuVeche ? 'cont-schimba' : 'cont-adauga';
  const pleaca = (e: FormEvent): void => {
    e.preventDefault();
    if (noua.length < PAROLA_MIN) {
      setProblema(t('admin.contul.parola-scurta', { n: PAROLA_MIN }));
      return;
    }
    if (noua !== din) {
      setProblema(t('admin.contul.parola-diferita'));
      return;
    }
    setProblema(null);
    trimite(veche, noua);
    setVeche('');
    setNoua('');
    setDin('');
  };
  return (
    <section className="pers-sectiune" aria-labelledby={id}>
      <h2 id={id}>{titlu}</h2>
      {text ? <p className="admin-slab">{text}</p> : null}
      <form className="pers-formular" onSubmit={pleaca} data-cont={id}>
        {cuVeche ? (
          <label>
            <span>{t('admin.contul.parola-veche')}</span>
            <input type="password" required autoComplete="current-password" value={veche} data-cont="veche" onChange={(e) => { setVeche(e.target.value); }} />
          </label>
        ) : null}
        <label>
          <span>{t('admin.contul.parola-noua')}</span>
          <input type="password" required autoComplete="new-password" value={noua} data-cont="noua" onChange={(e) => { setNoua(e.target.value); }} />
        </label>
        <label>
          <span>{t('admin.contul.parola-din-nou')}</span>
          <input type="password" required autoComplete="new-password" value={din} data-cont="din-nou" onChange={(e) => { setDin(e.target.value); }} />
        </label>
        {problema ? <p className="admin-eroare" role="alert">{problema}</p> : null}
        <div className="admin-randuri">
          <button type="submit" className="principal" disabled={ocupat} data-cont="salveaza">{titlu}</button>
        </div>
      </form>
    </section>
  );
}
