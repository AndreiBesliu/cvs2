import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { esteRol, type Rol } from '../../shared/personal.ts';
import { ascultaContul, conecteaza, iesi, intraCuGoogle, type ConfigCloud, type Conexiune } from '../cloud/conexiune.ts';
import '../i18n/admin.ts';
import { t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import { citesteAdresa, FILE, scrieAdresa, type Fila } from './adresa.ts';
import { FilaDiagnoza } from './diagnoza/FilaDiagnoza.tsx';
import { aducatorDocumentatie } from './documentatie/aducere.ts';
import { FilaDocumentatie } from './documentatie/FilaDocumentatie.tsx';
import { motivDin } from './erori/date.ts';
import { FilaErori } from './erori/FilaErori.tsx';
import { FilaRoadmap } from './roadmap/FilaRoadmap.tsx';
import './admin.css';

/**
 * Pagina `/admin` (ADR 0040): contul Google, rolul din `staff/{uid}`, apoi filele Erori, Diagnoză, Roadmap și
 * Documentație (ADR 0048; fila și documentul deschis stau în `#`, `adresa.ts`). Se încarcă la
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
  const [adresa, setAdresa] = useState(() => citesteAdresa(globalThis.location?.hash ?? '') ?? { fila: 'erori' as Fila, document: null, ancora: null });
  const [aducator] = useState(() => aducatorDocumentatie());
  const deschide = useCallback((document: string, ancora?: string | null): void => {
    setAdresa({ fila: 'documentatie', document, ancora: ancora ?? null });
  }, []);
  // Adresa din `#` urmează fila și documentul (fără intrări noi în istoric); un `#` schimbat de om (sau Înapoi) le mută.
  useEffect(() => {
    const noua = scrieAdresa(adresa);
    if (globalThis.location.hash !== noua) history.replaceState(history.state, '', noua);
  }, [adresa]);
  useEffect(() => {
    const asculta = (): void => {
      const a = citesteAdresa(globalThis.location.hash);
      if (a) setAdresa(a);
    };
    globalThis.addEventListener('hashchange', asculta);
    return () => { globalThis.removeEventListener('hashchange', asculta); };
  }, []);
  const butoaneFile = useRef(new Map<Fila, HTMLButtonElement>());
  const fila = adresa.fila;
  // Întoarcerea la Documentație redeschide ultimul document citit.
  const ultimulDocument = useRef<{ readonly document: string | null; readonly ancora: string | null }>({ document: null, ancora: null });
  if (adresa.fila === 'documentatie') ultimulDocument.current = { document: adresa.document, ancora: adresa.ancora };
  const alegeFila = (f: Fila): void => {
    setAdresa((a) => (a.fila === f ? a : f === 'documentatie' ? { fila: f, ...ultimulDocument.current } : { fila: f, document: null, ancora: null }));
  };
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
      <div className="admin-file" role="tablist" aria-label={t('admin.file')} onKeyDown={(e: KeyboardEvent) => {
        // Săgețile mută între file (tiparul tablist: o singură filă în ordinea Tab, cea aleasă).
        const k = FILE.indexOf(fila);
        const urm = { ArrowRight: k + 1, ArrowLeft: k - 1 + FILE.length, Home: 0, End: FILE.length - 1 }[e.key];
        if (urm === undefined) return;
        e.preventDefault();
        const f = FILE[urm % FILE.length] ?? 'erori';
        alegeFila(f);
        butoaneFile.current.get(f)?.focus();
      }}>
        {FILE.map((f) => (
          <button key={f} id={`fila-${f}`} ref={(b) => { if (b) butoaneFile.current.set(f, b); }} type="button" role="tab"
            aria-selected={fila === f} aria-controls="panoul-filei" tabIndex={fila === f ? 0 : -1} data-fila={f} onClick={() => { alegeFila(f); }}>
            {t(`admin.fila.${f}`)}
          </button>
        ))}
      </div>
      <section role="tabpanel" id="panoul-filei" aria-labelledby={`fila-${fila}`}>
        {fila === 'erori' ? <FilaErori con={con} /> : null}
        {fila === 'diagnoza' ? <FilaDiagnoza con={con} instanta={instanta} build={build} rol={stare.rol} /> : null}
        {fila === 'roadmap' ? <FilaRoadmap aducator={aducator} deschide={deschide} /> : null}
        {fila === 'documentatie' ? <FilaDocumentatie aducator={aducator} cale={adresa.document} ancora={adresa.ancora} deschide={deschide} /> : null}
      </section>
    </Cadru>
  );
}
