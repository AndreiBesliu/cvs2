import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement, type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore/lite';
import { COLECTII_PERSONAL, esteIdRol, OWNER, permisiuniDin, type Permisiune } from '../../shared/personal.ts';
import {
  acceptaInvitatia, ascultaContul, conecteaza, iesi, intraCuGoogle, intraCuParola, trimiteResetarea, type ConfigCloud, type Conexiune,
} from '../cloud/conexiune.ts';
import '../i18n/admin.ts';
import { t } from '../i18n/t.ts';
import { LIMBI, type Limba } from '../i18n/tipuri.ts';
import { useLimba } from '../ui/useLimba.ts';
import { citesteAdresa, scrieAdresa, type Adresa, type Fila } from './adresa.ts';
import { FilaAzi } from './azi/FilaAzi.tsx';
import { Cautare } from './carcasa/Cautare.tsx';
import {
  FELURI_GASITE, FILA_FELULUI, fileBarei, filaAratata, grupuriBarei, insigna, numarBara, partiAzi, punctDiagnoza, type FelGasit, type Gasibil,
} from './carcasa/date.ts';
import { ContextCarcasa, LegaturaFila, SeIncarca, type Carcasa, type Tinta } from './carcasa/stari.tsx';
import { citesteSumarul, type Sumar } from './carcasa/sumar.ts';
import { FilaDiagnoza } from './diagnoza/FilaDiagnoza.tsx';
import { aducatorDocumentatie } from './documentatie/aducere.ts';
import { FilaDocumentatie } from './documentatie/FilaDocumentatie.tsx';
import { motivDin } from './erori/date.ts';
import { FilaErori } from './erori/FilaErori.tsx';
import { FilaCont } from './cont/FilaCont.tsx';
import { motivCont } from './cont/motive.ts';
import { FilaPersonal } from './personal/FilaPersonal.tsx';
import { FilaRoadmap } from './roadmap/FilaRoadmap.tsx';
import { FilaSetari } from './setari/FilaSetari.tsx';
import { FilaSugestii } from './sugestii/FilaSugestii.tsx';
import { FilaTichete } from './tichete/FilaTichete.tsx';
import { FilaUtilizatori } from './utilizatori/FilaUtilizatori.tsx';
import './admin.css';

/**
 * Pagina `/admin` (ADR 0040): contul (Google sau parola, ADR 0049), rolul din `staff/{uid}` și permisiunile lui din
 * `roluri/{rol}`, apoi filele pe care le dau: Erori, Diagnoză, Roadmap și Documentație (ADR 0048; fila și documentul
 * deschis stau în `#`, `adresa.ts`), Sugestii (ADR 0107), Utilizatori (conturile clienților, ADR 0116), Personal și Setări
 * (owner-ul), Cont (oricine). Un om fără document de
 * personal, cu o invitație pe adresa lui verificată, intră singur în personal. Se încarcă la cerere, din pornire, înaintea
 * deschiderii proiectului: nu ia blocarea lui și nu aduce Firebase în pachetul de pornire.
 *
 * Carcasa (ADR 0260 §1, felia A.1): antetul cu insigna instanței, căutarea și meniul contului; bara laterală grupată, cu
 * numerele și punctul Diagnozei; fila Azi întâi. Intrarea, „fără rol” și eroarea rolului stau într-un card centrat.
 */
export interface ProprietatiAdmin {
  readonly config: { readonly ok: true; readonly config: ConfigCloud & { readonly instanta: string } } | { readonly ok: false; readonly motiv: string };
  readonly build: string;
  /** Alegerea limbii (ADR 0056: roadmap-ul are și varianta în engleză): aceeași ca în aplicație, ținută în browser. */
  readonly alegeLimba?: (l: Limba) => void;
}

/** Alegerea limbii, pentru antetul fiecărui cadru (fără ea, antetul n-are comutator). */
const AlegeLimba = createContext<((l: Limba) => void) | null>(null);

interface Personal {
  readonly faza: 'personal'; readonly user: User; readonly rol: string; readonly owner: boolean;
  readonly permisiuni: ReadonlySet<Permisiune>; readonly numeRol: string;
}

type StareCont =
  | { readonly faza: 'verifica' }
  | { readonly faza: 'neconectat'; readonly eroare?: string }
  | { readonly faza: 'se-intra' }
  | { readonly faza: 'rol'; readonly user: User }
  | { readonly faza: 'fara-rol'; readonly user: User; readonly motiv?: string }
  | { readonly faza: 'rol-eroare'; readonly user: User; readonly motiv: string }
  | Personal;

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

export function PaginaAdmin({ alegeLimba, ...p }: ProprietatiAdmin): ReactElement {
  return <AlegeLimba.Provider value={alegeLimba ?? null}><PaginaInterior {...p} /></AlegeLimba.Provider>;
}

function PaginaInterior({ config, build }: Omit<ProprietatiAdmin, 'alegeLimba'>): ReactElement {
  useLimba();
  const [con] = useState(() => (config.ok ? conecteaza(config.config) : null));
  if (!config.ok) return <Cadru><p className="admin-mesaj" role="alert">{t('admin.config-stricat', { motiv: config.motiv })}</p></Cadru>;
  if (!con?.ok) {
    const cheie = con?.motiv === 'emulatoare-in-afara' ? 'admin.emulatoare-in-afara' : 'admin.neconfigurat';
    return <Cadru instanta={config.config.instanta}><p className="admin-mesaj" data-admin="neconfigurat">{t(cheie)}</p></Cadru>;
  }
  return <Cont con={con.conexiune} instanta={config.config.instanta} build={build} />;
}

/** Semnul paginii: litera A pe pătratul culorii de accent (schițele, rândul G). */
function Marca(): ReactElement {
  return (
    <svg className="admin-marca" width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="1" y="1" width="24" height="24" rx="6" />
      <path d="M7 18L13 7l6 11M9.5 14h7" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Antetul (ADR 0260 §1): semnul, titlul, insigna instanței (TEST albastră, LIVE roșie, mereu la vedere) cu instanța și
 * proiectul, apoi căutarea, limba, „Înapoi la aplicație” și meniul contului, când pagina le are. Sub el, conținutul: un card
 * centrat (fără `carcasa`) sau carcasa cu bara laterală.
 */
function Cadru({ children, instanta, proiect, cautare, cont, carcasa = false }: {
  readonly children: ReactNode; readonly instanta?: string; readonly proiect?: string; readonly cautare?: ReactElement | null;
  readonly cont?: ReactElement; readonly carcasa?: boolean;
}): ReactElement {
  const alege = useContext(AlegeLimba);
  const activa = useLimba();
  return (
    <div className="admin">
      <header className="admin-antet">
        <Marca />
        <h1>{t('admin.titlu')}</h1>
        {instanta ? <span className="admin-insigna" data-insigna={insigna(instanta)}>{instanta.toUpperCase()}</span> : null}
        {instanta && proiect ? <span className="admin-instanta">{t('admin.instanta', { instanta, proiect })}</span> : null}
        <span className="admin-antet-spatiu" />
        {cautare}
        {alege ? (
          <nav className="admin-limba" aria-label={t('app.limba')}>
            {LIMBI.map((l) => (
              <button key={l} type="button" aria-pressed={l === activa} data-limba={l} onClick={() => { alege(l); }}>{l.toUpperCase()}</button>
            ))}
          </nav>
        ) : null}
        <a className="admin-inapoi" href="/">{t('admin.inapoi')}</a>
        {cont}
      </header>
      {carcasa ? children : <main className="admin-centru">{children}</main>}
    </div>
  );
}

function Cont({ con, instanta, build }: { readonly con: Conexiune; readonly instanta: string; readonly build: string }): ReactElement {
  const [stare, setStare] = useState<StareCont>({ faza: 'verifica' });
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

  if (stare.faza === 'personal') return <CarcasaAdmin con={con} instanta={instanta} build={build} p={stare} />;

  const butonIesi = <button type="button" data-admin="iesi" onClick={() => { void iesi(con); }}>{t('admin.cont.iesi')}</button>;
  let card: ReactElement;
  if (stare.faza === 'verifica' || stare.faza === 'rol') {
    card = <div className="admin-card"><SeIncarca text={t('admin.cont.verifica')} /></div>;
  } else if (stare.faza === 'neconectat' || stare.faza === 'se-intra') {
    card = (
      <section className="admin-card" data-admin="intrare" aria-labelledby="admin-intrare-titlu">
        <h2 id="admin-intrare-titlu">{t('admin.cont.intra-titlu')}</h2>
        <p className="admin-slab">{t('admin.cont.intra-text')}</p>
        <button type="button" className="principal" data-admin="intra" disabled={stare.faza === 'se-intra'} onClick={intra}>
          {stare.faza === 'se-intra' ? t('admin.cont.se-intra') : t('admin.cont.intra')}
        </button>
        {stare.faza === 'neconectat' && stare.eroare ? <p className="admin-eroare" role="alert" data-admin="eroare-intrare">{t('admin.cont.esec', { motiv: stare.eroare })}</p> : null}
        <IntrareCuParola con={con} ocupat={stare.faza === 'se-intra'} intra={intraParola} />
      </section>
    );
  } else if (stare.faza === 'rol-eroare') {
    card = (
      <section className="admin-card" data-admin="rol-eroare">
        <p className="admin-eroare" role="alert">{t('admin.cont.rol-citire', { motiv: stare.motiv })}</p>
        <div className="admin-randuri">
          <button type="button" data-admin="reincearca" onClick={() => { citesteRol(stare.user); }}>{t('admin.cont.reincearca')}</button>
          {butonIesi}
        </div>
      </section>
    );
  } else {
    const consola = `https://console.firebase.google.com/project/${con.projectId}/firestore/databases/-default-/data/~2Fstaff`;
    card = (
      <section className="admin-card" data-admin="fara-rol" aria-labelledby="admin-fara-rol-titlu">
        <span className="admin-semn" data-semn="atentie" aria-hidden="true">!</span>
        <h2 id="admin-fara-rol-titlu">{t('admin.cont.fara-rol')}</h2>
        <p data-admin="fara-rol-pasi">{t('admin.cont.fara-rol-pasi')}</p>
        <p className="admin-slab">{t('admin.cont.fara-rol-invitatie', { email: stare.user.email ?? '—' })}</p>
        {stare.motiv ? <p className="admin-eroare" role="alert" data-admin="invitatie-esec">{t('admin.cont.invitatie-esec', { motiv: stare.motiv })}</p> : null}
        <div className="admin-uid">
          <code data-admin="uid">{stare.user.uid}</code>
          <button type="button" onClick={() => {
            navigator.clipboard.writeText(stare.user.uid).then(() => { setCopiat(true); }, () => { setCopiat(false); });
          }}>{copiat ? t('admin.cont.copiat') : t('admin.cont.copiaza')}</button>
        </div>
        <p className="admin-slab">{t('admin.cont.fara-rol-text')}</p>
        <div className="admin-randuri">
          <a href={consola} target="_blank" rel="noopener noreferrer">{t('admin.cont.consola')}</a>
          <button type="button" data-admin="reincearca" onClick={() => { citesteRol(stare.user); }}>{t('admin.cont.reincearca')}</button>
          {butonIesi}
        </div>
      </section>
    );
  }
  return <Cadru instanta={instanta} proiect={con.projectId}>{card}</Cadru>;
}

/** Unde e rândul găsit de căutare, în fila lui. */
const SELECTOR_TINTA: Partial<Record<Fila, (id: string) => string>> = {
  erori: (id) => `[data-grup="${id}"]`,
  tichete: (id) => `[data-tichet="${id}"]`,
  utilizatori: (id) => `[data-uid="${id}"]`,
};

const unite = (vechi: readonly Gasibil[] = [], noi: readonly Gasibil[]): Gasibil[] => [...new Map([...vechi, ...noi].map((g) => [g.id, g])).values()];

/**
 * Carcasa (ADR 0260 §1): bara laterală grupată (filele date de rol, plus Azi), cu numerele (erorile nerezolvate, tichetele
 * noi, sugestiile fără decizie) și punctul Diagnozei, citite la intrare și la „Reîncarcă” din fila Azi; antetul cu căutarea
 * în ce au citit filele și meniul contului. O adresă fără `#` deschide Azi.
 */
function CarcasaAdmin({ con, instanta, build, p }: { readonly con: Conexiune; readonly instanta: string; readonly build: string; readonly p: Personal }): ReactElement {
  const [adresa, setAdresa] = useState<Adresa>(() => citesteAdresa(globalThis.location?.hash ?? '') ?? { fila: 'azi', document: null, ancora: null });
  const [aducator] = useState(() => aducatorDocumentatie());
  const deschideDocument = useCallback((document: string, ancora?: string | null): void => {
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
  // Întoarcerea la Documentație redeschide ultimul document citit.
  const ultimulDocument = useRef<{ readonly document: string | null; readonly ancora: string | null }>({ document: null, ancora: null });
  if (adresa.fila === 'documentatie') ultimulDocument.current = { document: adresa.document, ancora: adresa.ancora };

  const vizibile = useMemo(() => fileBarei(p.owner, p.permisiuni), [p]);
  const parti = useMemo(() => partiAzi(p.owner, p.permisiuni), [p]);
  const aratata = filaAratata(adresa.fila, vizibile);
  const [tinta, setTinta] = useState<(Tinta & { readonly fila: Fila }) | null>(null);
  const [surse, setSurse] = useState<ReadonlyMap<FelGasit, readonly Gasibil[]>>(() => new Map());

  const carcasa: Carcasa = useMemo(() => ({
    deschide: (f, x) => {
      setAdresa((a) => (a.fila === f ? a : f === 'documentatie' ? { fila: f, ...ultimulDocument.current } : { fila: f, document: null, ancora: null }));
      setTinta(x ? { ...x, fila: f } : null);
    },
    vede: (f) => vizibile.includes(f),
    publica: (fel, randuri) => { setSurse((s) => new Map(s).set(fel, unite(s.get(fel), randuri))); },
  }), [vizibile]);

  // Rezumatul: la intrare și la „Reîncarcă”, nu în timp real (Firestore Lite, ADR 0260 „Probele”).
  const [sumar, setSumar] = useState<Sumar | null>(null);
  const [rev, setRev] = useState(0);
  useEffect(() => {
    let viu = true;
    setSumar(null);
    citesteSumarul(con, parti, { instanta, build, rol: p.numeRol, eu: p.user.uid }).then((s) => { if (viu) setSumar(s); }, () => { if (viu) setSumar({}); });
    return () => { viu = false; };
  }, [con, parti, instanta, build, p, rev]);

  // Rândul găsit de căutare: arătat (derulat la vedere și marcat) când fila lui l-a citit.
  const panou = useRef<HTMLElement>(null);
  useEffect(() => {
    const el0 = panou.current;
    const sel = tinta === null || tinta.fila !== aratata ? undefined : SELECTOR_TINTA[tinta.fila]?.(CSS.escape(tinta.id));
    if (el0 === null || sel === undefined) return undefined;
    const gaseste = (): boolean => {
      const el = el0.querySelector<HTMLElement>(sel);
      if (el === null) return false;
      el0.querySelectorAll('[data-gasit-aici]').forEach((x) => { x.removeAttribute('data-gasit-aici'); });
      el.setAttribute('data-gasit-aici', 'true');
      el.scrollIntoView({ block: 'center' });
      return true;
    };
    if (gaseste()) return undefined;
    const o = new MutationObserver(() => { if (gaseste()) o.disconnect(); });
    o.observe(el0, { childList: true, subtree: true });
    return () => { o.disconnect(); };
  }, [tinta, aratata]);

  const numere: Partial<Record<Fila, number | null>> = {
    erori: numarBara(sumar?.erori), tichete: numarBara(sumar?.tichete), sugestii: numarBara(sumar?.sugestii),
  };
  const punct = punctDiagnoza(sumar?.diagnoza ?? null);
  const feluri = FELURI_GASITE.filter((f) => vizibile.includes(FILA_FELULUI[f]));
  const tintaErori = tinta?.fila === 'erori' ? tinta : null;
  return (
    <ContextCarcasa.Provider value={carcasa}>
      <Cadru instanta={instanta} proiect={con.projectId} carcasa
        cautare={feluri.length > 0 ? <Cautare surse={surse} feluri={feluri} /> : null}
        cont={<MeniuCont text={t('admin.cont.rol', { email: p.user.email ?? p.user.uid, rol: p.numeRol })} iesi={() => { void iesi(con); }} />}>
        <div className="admin-carcasa">
          <nav className="admin-bara" aria-label={t('admin.file')} data-admin="bara">
            {grupuriBarei(vizibile).map((g) => (
              <div key={g.grup ?? g.file[0]} className="admin-bara-grup">
                {g.grup ? <span className="admin-bara-titlu" data-grup-bara={g.grup}>{t(`admin.grup.${g.grup}`)}</span> : null}
                {g.file.map((f) => {
                  const n = numere[f];
                  return (
                    <LegaturaFila key={f} fila={f} data-fila={f} aria-current={f === aratata ? 'page' : undefined}>
                      <span className="admin-bara-nume">{t(`admin.fila.${f}`)}</span>
                      {n ? <span className="admin-numar" data-numar="">{n}</span> : null}
                      {f === 'diagnoza' && punct ? <span className="admin-punct" data-punct={punct} role="img" aria-label={t(`admin.punct.${punct}`)} /> : null}
                    </LegaturaFila>
                  );
                })}
              </div>
            ))}
          </nav>
          <main className="admin-continut" ref={panou} aria-label={t(`admin.fila.${aratata}`)}>
            {vizibile.every((f) => f === 'cont') ? <p className="admin-mesaj" data-admin="fara-file">{t('admin.cont.fara-file', { rol: p.numeRol })}</p> : null}
            {aratata === 'azi' ? <FilaAzi parti={parti} sumar={sumar} reincarca={() => { setRev((r) => r + 1); }} aducator={aducator} /> : null}
            {aratata === 'erori' ? <FilaErori key={tintaErori?.id ?? ''} con={con} poateMarca={p.permisiuni.has('erori.rezolva')} tinta={tintaErori} /> : null}
            {aratata === 'diagnoza' ? <FilaDiagnoza con={con} instanta={instanta} build={build} rol={p.numeRol} /> : null}
            {aratata === 'roadmap' ? <FilaRoadmap aducator={aducator} deschide={deschideDocument} /> : null}
            {aratata === 'documentatie' ? <FilaDocumentatie aducator={aducator} cale={adresa.document} ancora={adresa.ancora} deschide={deschideDocument} /> : null}
            {aratata === 'sugestii' ? <FilaSugestii con={con} eu={p.user.uid} owner={p.owner} permisiuni={p.permisiuni} /> : null}
            {aratata === 'tichete' ? <FilaTichete con={con} owner={p.owner} permisiuni={p.permisiuni} /> : null}
            {aratata === 'utilizatori' ? <FilaUtilizatori con={con} poateAdministra={p.permisiuni.has('conturi.administreaza')} /> : null}
            {aratata === 'personal' ? <FilaPersonal con={con} eu={p.user.uid} emailEu={p.user.email ?? null} /> : null}
            {aratata === 'setari' ? <FilaSetari con={con} /> : null}
            {aratata === 'cont' ? <FilaCont con={con} user={p.user} /> : null}
          </main>
        </div>
      </Cadru>
    </ContextCarcasa.Provider>
  );
}

/** Meniul contului (un meniu derulant, ca în aplicație): cine și ce rol, Contul meu, Ieși. */
function MeniuCont({ text, iesi: laIesire }: { readonly text: string; readonly iesi: () => void }): ReactElement {
  const [deschis, setDeschis] = useState(false);
  const loc = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!deschis) return undefined;
    const afara = (e: PointerEvent): void => { if (!loc.current?.contains(e.target as Node)) setDeschis(false); };
    document.addEventListener('pointerdown', afara);
    return () => { document.removeEventListener('pointerdown', afara); };
  }, [deschis]);
  return (
    <div className="admin-meniu-cont" ref={loc} onKeyDown={(e) => { if (e.key === 'Escape') setDeschis(false); }}>
      <button type="button" data-admin="meniu-cont" aria-expanded={deschis} aria-label={`${t('admin.meniu-cont')}: ${text}`}
        onClick={() => { setDeschis((d) => !d); }}>
        <span className="admin-avatar" aria-hidden="true" />
        <span data-admin="cont">{text}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {deschis ? (
        <div className="admin-meniu">
          <LegaturaFila fila="cont" data-admin="meniu-contul-meu" laClic={() => { setDeschis(false); }}>{t('admin.fila.cont')}</LegaturaFila>
          <button type="button" data-admin="iesi" onClick={laIesire}>{t('admin.cont.iesi')}</button>
        </div>
      ) : null}
    </div>
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
