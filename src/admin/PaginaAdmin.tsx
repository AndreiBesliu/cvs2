import { useCallback, useEffect, useState, type ReactElement } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { esteRol, type Rol } from '../../shared/personal.ts';
import { ascultaContul, conecteaza, iesi, intraCuGoogle, type ConfigCloud, type Conexiune } from '../cloud/conexiune.ts';
import '../i18n/admin.ts';
import { t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import { FilaDiagnoza } from './diagnoza/FilaDiagnoza.tsx';
import { motivDin } from './erori/date.ts';
import { FilaErori } from './erori/FilaErori.tsx';
import './admin.css';

/**
 * Pagina `/admin` (ADR 0040): contul Google, rolul din `staff/{uid}`, apoi filele Erori și Diagnoză. Se încarcă la
 * cerere, din pornire, înaintea deschiderii proiectului: nu ia blocarea lui și nu aduce Firebase în pachetul de pornire.
 */
export interface ProprietatiAdmin {
  readonly config: { readonly ok: true; readonly config: ConfigCloud & { readonly instanta: string } } | { readonly ok: false; readonly motiv: string };
  readonly build: string;
}

type StareCont =
  | { readonly faza: 'verifica' }
  | { readonly faza: 'neconectat'; readonly eroare?: string }
  | { readonly faza: 'se-intra' }
  | { readonly faza: 'rol'; readonly user: User }
  | { readonly faza: 'fara-rol'; readonly user: User }
  | { readonly faza: 'rol-eroare'; readonly user: User; readonly motiv: string }
  | { readonly faza: 'personal'; readonly user: User; readonly rol: Rol };

export function PaginaAdmin({ config, build }: ProprietatiAdmin): ReactElement {
  useLimba();
  const [con] = useState(() => (config.ok ? conecteaza(config.config) : null));
  if (!config.ok) return <Cadru><p className="admin-mesaj" role="alert">{t('admin.config-stricat', { motiv: config.motiv })}</p></Cadru>;
  if (!con?.ok) {
    const cheie = con?.motiv === 'emulatoare-in-afara' ? 'admin.emulatoare-in-afara' : 'admin.neconfigurat';
    return <Cadru><p className="admin-mesaj" data-admin="neconfigurat">{t(cheie)}</p></Cadru>;
  }
  return <Cont con={con.conexiune} instanta={config.config.instanta} build={build} />;
}

function Cadru({ children, antet }: { readonly children: ReactElement | ReactElement[]; readonly antet?: ReactElement }): ReactElement {
  return (
    <div className="admin">
      <header className="admin-antet">
        <h1>CNC Vector Studio · {t('admin.titlu')}</h1>
        {antet}
        <a className="admin-inapoi" href="/">{t('admin.inapoi')}</a>
      </header>
      <main className="admin-corp">{children}</main>
    </div>
  );
}

function Cont({ con, instanta, build }: { readonly con: Conexiune; readonly instanta: string; readonly build: string }): ReactElement {
  const [stare, setStare] = useState<StareCont>({ faza: 'verifica' });
  const [fila, setFila] = useState<'erori' | 'diagnoza'>('erori');
  const [copiat, setCopiat] = useState(false);

  const citesteRol = useCallback((user: User): void => {
    setStare({ faza: 'rol', user });
    getDoc(doc(con.db, 'staff', user.uid)).then((s) => {
      const rol: unknown = s.exists() ? s.get('rol') : undefined;
      setStare(esteRol(rol) ? { faza: 'personal', user, rol } : { faza: 'fara-rol', user });
    }, (e: unknown) => { setStare({ faza: 'rol-eroare', user, motiv: motivDin(e) }); });
  }, [con]);

  useEffect(() => ascultaContul(con, (u) => {
    if (u) citesteRol(u);
    else setStare((s) => (s.faza === 'se-intra' ? s : { faza: 'neconectat' }));
  }), [con, citesteRol]);

  const intra = (): void => {
    setStare({ faza: 'se-intra' });
    intraCuGoogle(con).catch((e: unknown) => { setStare({ faza: 'neconectat', eroare: motivDin(e) }); });
  };

  const instantaText = t('admin.instanta', { instanta, proiect: con.projectId });
  const antet = 'user' in stare
    ? (
      <div className="admin-cont">
        <span>{instantaText}</span>
        <span data-admin="cont">{t('admin.cont.rol', { email: stare.user.email ?? stare.user.uid, rol: stare.faza === 'personal' ? stare.rol : '—' })}</span>
        <button type="button" onClick={() => { void iesi(con); }}>{t('admin.cont.iesi')}</button>
      </div>
    )
    : <div className="admin-cont"><span>{instantaText}</span></div>;

  if (stare.faza === 'verifica' || stare.faza === 'rol') {
    return <Cadru antet={antet}><p className="admin-mesaj" aria-busy="true">{t('admin.cont.verifica')}</p></Cadru>;
  }
  if (stare.faza === 'neconectat' || stare.faza === 'se-intra') {
    return (
      <Cadru antet={antet}>
        <section className="admin-intrare">
          <p>{t('admin.cont.intra-text')}</p>
          <button type="button" className="principal" data-admin="intra" disabled={stare.faza === 'se-intra'} onClick={intra}>
            {stare.faza === 'se-intra' ? t('admin.cont.se-intra') : t('admin.cont.intra')}
          </button>
          {stare.faza === 'neconectat' && stare.eroare ? <p className="admin-eroare" role="alert">{t('admin.cont.esec', { motiv: stare.eroare })}</p> : null}
        </section>
      </Cadru>
    );
  }
  if (stare.faza === 'rol-eroare') {
    return (
      <Cadru antet={antet}>
        <p className="admin-eroare" role="alert">{t('admin.cont.rol-citire', { motiv: stare.motiv })}</p>
        <button type="button" data-admin="reincearca" onClick={() => { citesteRol(stare.user); }}>{t('admin.cont.reincearca')}</button>
      </Cadru>
    );
  }
  if (stare.faza === 'fara-rol') {
    const consola = `https://console.firebase.google.com/project/${con.projectId}/firestore/databases/-default-/data/~2Fstaff`;
    return (
      <Cadru antet={antet}>
        <section className="admin-fara-rol" data-admin="fara-rol">
          <h2>{t('admin.cont.fara-rol')}</h2>
          <p>{t('admin.cont.fara-rol-text')}</p>
          <p className="admin-uid"><code data-admin="uid">{stare.user.uid}</code></p>
          <div className="admin-randuri">
            <button type="button" onClick={() => {
              navigator.clipboard.writeText(stare.user.uid).then(() => { setCopiat(true); }, () => { setCopiat(false); });
            }}>{copiat ? t('admin.cont.copiat') : t('admin.cont.copiaza')}</button>
            <a href={consola} target="_blank" rel="noopener noreferrer">{t('admin.cont.consola')}</a>
            <button type="button" data-admin="reincearca" onClick={() => { citesteRol(stare.user); }}>{t('admin.cont.reincearca')}</button>
          </div>
        </section>
      </Cadru>
    );
  }
  return (
    <Cadru antet={antet}>
      <div className="admin-file" role="tablist">
        {(['erori', 'diagnoza'] as const).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={fila === f} data-fila={f} onClick={() => { setFila(f); }}>
            {t(f === 'erori' ? 'admin.fila.erori' : 'admin.fila.diagnoza')}
          </button>
        ))}
      </div>
      <section role="tabpanel">
        {fila === 'erori' ? <FilaErori con={con} /> : <FilaDiagnoza con={con} instanta={instanta} build={build} rol={stare.rol} />}
      </section>
    </Cadru>
  );
}
