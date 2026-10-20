import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { COLECTII_PERSONAL, esteIdRol, OWNER, permisiuniDin, type Permisiune } from '../../shared/personal.ts';
import {
  acceptaInvitatia, ascultaContul, conecteaza, iesi, intraCuGoogle, intraCuParola, trimiteResetarea, type ConfigCloud, type Conexiune,
} from '../cloud/conexiune.ts';
import '../i18n/admin.ts';
import { t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import { citesteAdresa, scrieAdresa, type Fila } from './adresa.ts';
import { FilaDiagnoza } from './diagnoza/FilaDiagnoza.tsx';
import { aducatorDocumentatie } from './documentatie/aducere.ts';
import { FilaDocumentatie } from './documentatie/FilaDocumentatie.tsx';
import { motivDin } from './erori/date.ts';
import { FilaErori } from './erori/FilaErori.tsx';
import { FilaCont } from './cont/FilaCont.tsx';
import { motivCont } from './cont/motive.ts';
import { fileVizibile } from './personal/date.ts';
import { FilaPersonal } from './personal/FilaPersonal.tsx';
import { FilaRoadmap } from './roadmap/FilaRoadmap.tsx';
import './admin.css';

/**
 * Pagina `/admin` (ADR 0040): contul (Google sau parola, ADR 0049), rolul din `staff/{uid}` și permisiunile lui din
 * `roluri/{rol}`, apoi filele pe care le dau: Erori, Diagnoză, Roadmap și Documentație (ADR 0048; fila și documentul
 * deschis stau în `#`, `adresa.ts`), Personal (owner-ul), Cont (oricine). Un om fără document de personal, cu o
 * invitație pe adresa lui verificată, intră singur în personal. Se încarcă la
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
  | { readonly faza: 'fara-rol'; readonly user: User; readonly motiv?: string }
  | { readonly faza: 'rol-eroare'; readonly user: User; readonly motiv: string }
  | {
    readonly faza: 'personal'; readonly user: User; readonly rol: string; readonly owner: boolean;
    readonly permisiuni: ReadonlySet<Permisiune>; readonly numeRol: string;
  };

/**
 * Rolul și permisiunile omului, din aceleași documente ca regulile (`staff/{uid}`, apoi `roluri/{rol}`). Fără document de
 * personal și cu adresa verificată, întâi invitația (`acceptaInvitatia`); fără invitație, „nu ești în personal”.
 */
async function stareaPersonalului(con: Conexiune, user: User, cuInvitatie: boolean): Promise<StareCont> {
  const s = await getDoc(doc(con.db, COLECTII_PERSONAL.staff, user.uid));
  if (!s.exists()) {
    if (!cuInvitatie || !user.emailVerified) return { faza: 'fara-rol', user };
    try {
      // „Nicio invitație” e cazul obișnuit al unui om din afară (`ok: false`); refuzurile (expirată, App Check) se spun.
      if (!(await acceptaInvitatia(con)).ok) return { faza: 'fara-rol', user };
    } catch (e) {
      return { faza: 'fara-rol', user, motiv: motivDin(e) };
    }
    return stareaPersonalului(con, user, false);
  }
  const rol: unknown = s.get('rol');
  if (rol === OWNER) return { faza: 'personal', user, rol, owner: true, permisiuni: permisiuniDin(OWNER, undefined), numeRol: OWNER };
  const r = esteIdRol(rol) ? await getDoc(doc(con.db, COLECTII_PERSONAL.roluri, rol)) : null;
  const nume: unknown = r?.exists() ? r.get('nume') : undefined;
  return {
    faza: 'personal', user, rol: typeof rol === 'string' ? rol : '', owner: false,
    permisiuni: permisiuniDin(rol, r?.exists() ? r.get('permisiuni') : undefined),
    numeRol: typeof nume === 'string' ? nume : t('admin.pers.rol-necunoscut', { rol: typeof rol === 'string' ? rol : '—' }),
  };
}

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

function Cadru({ children, antet }: { readonly children: ReactNode; readonly antet?: ReactElement }): ReactElement {
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
    stareaPersonalului(con, user, true).then(setStare, (e: unknown) => { setStare({ faza: 'rol-eroare', user, motiv: motivDin(e) }); });
  }, [con]);

  useEffect(() => ascultaContul(con, (u) => {
    if (u) citesteRol(u);
    else setStare((s) => (s.faza === 'se-intra' ? s : { faza: 'neconectat' }));
  }), [con, citesteRol]);

  const intra = (): void => {
    setStare({ faza: 'se-intra' });
    intraCuGoogle(con).catch((e: unknown) => { setStare({ faza: 'neconectat', eroare: motivCont(e) }); });
  };
  const intraParola = (email: string, parola: string): void => {
    setStare({ faza: 'se-intra' });
    intraCuParola(con, email, parola).catch((e: unknown) => { setStare({ faza: 'neconectat', eroare: motivCont(e) }); });
  };

  const instantaText = t('admin.instanta', { instanta, proiect: con.projectId });
  const antet = 'user' in stare
    ? (
      <div className="admin-cont">
        <span>{instantaText}</span>
        <span data-admin="cont">{t('admin.cont.rol', { email: stare.user.email ?? stare.user.uid, rol: stare.faza === 'personal' ? stare.numeRol : '—' })}</span>
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
          {stare.faza === 'neconectat' && stare.eroare ? <p className="admin-eroare" role="alert" data-admin="eroare-intrare">{t('admin.cont.esec', { motiv: stare.eroare })}</p> : null}
          <IntrareCuParola con={con} ocupat={stare.faza === 'se-intra'} intra={intraParola} />
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
          <p>{t('admin.cont.fara-rol-invitatie', { email: stare.user.email ?? '—' })}</p>
          {stare.motiv ? <p className="admin-eroare" role="alert" data-admin="invitatie-esec">{t('admin.cont.invitatie-esec', { motiv: stare.motiv })}</p> : null}
          <p className="admin-slab">{t('admin.cont.fara-rol-text')}</p>
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
  // Filele rolului (ADR 0049); o adresă cu o filă pe care rolul n-o dă arată prima filă permisă.
  const vizibile = fileVizibile(stare.owner, stare.permisiuni);
  const aratata: Fila = vizibile.includes(fila) ? fila : vizibile[0] ?? 'cont';
  return (
    <Cadru antet={antet}>
      {vizibile.length === 1 ? <p className="admin-mesaj" data-admin="fara-file">{t('admin.cont.fara-file', { rol: stare.numeRol })}</p> : null}
      <div className="admin-file" role="tablist" aria-label={t('admin.file')} onKeyDown={(e: KeyboardEvent) => {
        // Săgețile mută între file (tiparul tablist: o singură filă în ordinea Tab, cea aleasă).
        const k = vizibile.indexOf(aratata);
        const urm = { ArrowRight: k + 1, ArrowLeft: k - 1 + vizibile.length, Home: 0, End: vizibile.length - 1 }[e.key];
        if (urm === undefined) return;
        e.preventDefault();
        const f = vizibile[urm % vizibile.length] ?? 'cont';
        alegeFila(f);
        butoaneFile.current.get(f)?.focus();
      }}>
        {vizibile.map((f) => (
          <button key={f} id={`fila-${f}`} ref={(b) => { if (b) butoaneFile.current.set(f, b); }} type="button" role="tab"
            aria-selected={aratata === f} aria-controls="panoul-filei" tabIndex={aratata === f ? 0 : -1} data-fila={f} onClick={() => { alegeFila(f); }}>
            {t(`admin.fila.${f}`)}
          </button>
        ))}
      </div>
      <section role="tabpanel" id="panoul-filei" aria-labelledby={`fila-${aratata}`}>
        {aratata === 'erori' ? <FilaErori con={con} poateMarca={stare.permisiuni.has('erori.rezolva')} /> : null}
        {aratata === 'diagnoza' ? <FilaDiagnoza con={con} instanta={instanta} build={build} rol={stare.numeRol} /> : null}
        {aratata === 'roadmap' ? <FilaRoadmap aducator={aducator} deschide={deschide} /> : null}
        {aratata === 'documentatie' ? <FilaDocumentatie aducator={aducator} cale={adresa.document} ancora={adresa.ancora} deschide={deschide} /> : null}
        {aratata === 'personal' ? <FilaPersonal con={con} eu={stare.user.uid} /> : null}
        {aratata === 'cont' ? <FilaCont con={con} user={stare.user} /> : null}
      </section>
    </Cadru>
  );
}

/**
 * Intrarea cu parola (ADR 0049 §5, §6): conturile create de owner și cei care și-au adăugat o parolă. „Am uitat parola”
 * trimite e-mailul Firebase, fără să spună dacă adresa are cont.
 */
function IntrareCuParola({ con, ocupat, intra }: { readonly con: Conexiune; readonly ocupat: boolean; readonly intra: (email: string, parola: string) => void }): ReactElement {
  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [resetare, setResetare] = useState<{ readonly faza: 'liber' | 'trimisa' } | { readonly faza: 'eroare'; readonly motiv: string }>({ faza: 'liber' });
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    intra(email.trim(), parola);
  };
  return (
    <form className="admin-parola" onSubmit={trimite} data-admin="intrare-parola">
      <p className="admin-slab">{t('admin.cont.sau-parola')}</p>
      <label>
        <span>{t('admin.pers.email')}</span>
        <input type="email" required autoComplete="username" value={email} data-admin="email" onChange={(e) => { setEmail(e.target.value); }} />
      </label>
      <label>
        <span>{t('admin.contul.parola')}</span>
        <input type="password" required autoComplete="current-password" value={parola} data-admin="parola" onChange={(e) => { setParola(e.target.value); }} />
      </label>
      <div className="admin-randuri">
        <button type="submit" disabled={ocupat} data-admin="intra-parola">{t('admin.cont.intra-parola')}</button>
        <button type="button" disabled={ocupat || email.trim() === ''} data-admin="am-uitat" onClick={() => {
          trimiteResetarea(con, email.trim()).then(() => { setResetare({ faza: 'trimisa' }); }, (e: unknown) => { setResetare({ faza: 'eroare', motiv: motivCont(e) }); });
        }}>{t('admin.cont.am-uitat')}</button>
      </div>
      {resetare.faza === 'trimisa' ? <p role="status">{t('admin.cont.resetare-trimisa', { email: email.trim() })}</p> : null}
      {resetare.faza === 'eroare' ? <p className="admin-eroare" role="alert">{t('admin.cont.esec', { motiv: resetare.motiv })}</p> : null}
    </form>
  );
}
