/**
 * Conectarea prin WiFi, mai ușoară (ADR 0136, felia 3.6f), sub „Conectează (WiFi)” din fereastra Mașina:
 *
 * - **alegerea:** conexiunile ținute, fiecare cu rețeaua ei (prin rețeaua atelierului, direct prin rețeaua proprie a mașinii,
 *   o adresă scrisă de mână); omul alege la care se leagă, nimic nu pornește singur. Un eșec își spune pașii;
 * - **căutarea:** numele știute deodată, iar la cerere toată rețeaua (/24), cu progresul și oprirea;
 * - **„Altă adresă…”:** formularul din 3.6d (controlerul, adresa, portul);
 * - **asistentul podului ESP3D**, în trei pași: podul verificat în rețeaua lui, rețeaua atelierului cu parolele (trimise doar
 *   podului, neținute), podul găsit în rețeaua atelierului și ținut, cu ambele drumuri.
 *
 * Logica e în `src/machine/conexiuni.ts` (pură) și `src/machine/sonde.ts` (probele); aici, doar ecranele și ordinea pașilor.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import '../i18n/masina.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import {
  CHEIE_CONEXIUNI, CONCURENTA_RETEA, INCERCARE_81, INCERCARE_POD, IP_RETEA_PROPRIE, NICIUNA, TIMP_DESCHIDERE_RETEA_MS, citesteConexiuni,
  comenziPod, cuFormular, esteIpv4, gazdeCautare, gazdeRetea, numeLocal, primulGasit, reteleDeCautat, scrieConexiuni, tineConexiune,
  uitaConexiune,
  type ConexiuneNoua, type ConexiuneTinuta, type ConexiuniTinute, type Gazda, type InfoPod, type ReteaVazuta,
} from '../machine/conexiuni.ts';
import type { Transport } from '../machine/sesiune.ts';
import {
  ADRESA_POD_NOU, deschideConexiune, deschidePod, RefuzPod, sondeazaGazda, type Gasit, type LegaturaPod, type MotivSonda,
} from '../machine/sonde.ts';
import { adresaRetea, esteProfilRetea, permisiuneRetea, PROFIL_RETEA, PROFILURI_RETEA, TIMP_DESCHIDERE_MS, type ProfilRetea } from '../machine/websocket.ts';

const citesteTinute = (): ConexiuniTinute => {
  try {
    return citesteConexiuni(localStorage.getItem(CHEIE_CONEXIUNI));
  } catch {
    return NICIUNA;
  }
};
/** Fără stocare, conexiunile nu se țin: legătura merge. */
const scrieTinute = (s: ConexiuniTinute): void => {
  try {
    localStorage.setItem(CHEIE_CONEXIUNI, scrieConexiuni(s));
  } catch {
    // nimic de făcut
  }
};

const numar = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text.replace(',', '.')));
const profilText = (p: ProfilRetea): string => t(`masina.wifi.profil.${p}`);

/** Cum se numește o conexiune: drumul și rețeaua ei. */
export function etichetaConexiune(c: Pick<ConexiuneTinuta, 'drum' | 'retea'>): string {
  if (c.drum === 'adresa') return t('masina.wifi.drum.adresa');
  if (c.retea === null) return t(c.drum === 'atelier' ? 'masina.wifi.drum.atelier.fara' : 'masina.wifi.drum.proprie.fara');
  return t(c.drum === 'atelier' ? 'masina.wifi.drum.atelier' : 'masina.wifi.drum.proprie', { retea: c.retea });
}
const detaliuConexiune = (c: ConexiuneTinuta): string =>
  t(c.ultimIp === null ? 'masina.wifi.detaliu' : 'masina.wifi.detaliu.ip', { profil: profilText(c.profil), adresa: `${c.adresa}:${c.port}`, ip: c.ultimIp ?? '' });

/** De ce n-a mers o probă, în limba omului (motivele transportului vin din dicționarul panoului). */
export function textMotivSonda(m: MotivSonda, pod?: InfoPod): string {
  if (m === 'versiune') return t('masina.wifi.motiv.versiune', { versiune: pod?.versiune ?? '—' });
  if (m === 'tinta') return t('masina.wifi.motiv.tinta', { tinta: pod?.tinta || '—' });
  if (m === 'tacut') return t('masina.wifi.motiv.tacut');
  if (m === 'oprit') return '';
  return t(`masina.motiv.${m}`);
}

/** Un motiv spus singur, ca propoziție: cu majusculă și punct (motivele panoului încep cu literă mică, după „…: ”). */
const propozitie = (s: string): string => (s === '' ? s : `${s.charAt(0).toLocaleUpperCase()}${s.slice(1)}${/[.?!]$/.test(s) ? '' : '.'}`);

/** Drumul unei mașini găsite: în rețeaua ei proprie (podul spune modul AP, sau e la 192.168.0.1), altfel a atelierului. */
const drumGasit = (adresa: string, pod: InfoPod | null): 'atelier' | 'proprie' =>
  (pod?.mod === 'AP' || (pod?.mod !== 'STA' && adresa === IP_RETEA_PROPRIE) ? 'proprie' : 'atelier');

type Vedere = 'alege' | 'cauta' | 'adresa' | 'pod';
type Diagnoza = { readonly eticheta: string; readonly motiv: MotivSonda; readonly incercate: readonly string[]; readonly pod?: InfoPod; readonly retea: string | null; readonly gazda: string };

export function ConectareWifi({ conecteaza, renunta }: {
  /** Sesiunea pornește pe transportul deschis; adresa (gazda:portul) e pentru starea conexiunii. */
  readonly conecteaza: (transport: Transport, adresa: string) => Promise<void>;
  readonly renunta: () => void;
}): ReactNode {
  const [vedere, setVedere] = useState<Vedere>('alege');
  const [tinute, setTinute] = useState(citesteTinute);
  const [ocupat, setOcupat] = useState<string | null>(null);
  const [diagnoza, setDiagnoza] = useState<Diagnoza | null>(null);
  // Căutarea pornită direct în toată rețeaua (din diagnoză sau din asistent).
  const [scanareCeruta, setScanareCeruta] = useState(false);
  // Alegerea închisă (Escape, Renunță) în timpul unei legări: legătura deschisă după aceea se închide, nu pornește sesiunea.
  const inchisa = useRef(false);
  useEffect(() => { inchisa.current = false; return () => { inchisa.current = true; }; }, []);

  /** Conexiunile se recitesc din stocare la fiecare schimbare (altă filă le poate fi schimbat). */
  const tine = (f: (s: ConexiuniTinute) => ConexiuniTinute): void => {
    const n = f(citesteTinute());
    scrieTinute(n);
    setTinute(n);
  };

  /** Legătura cu o conexiune (ținută, găsită sau scrisă): reușită, se ține prima; altfel, motivul (în diagnoză sau întors). */
  const lega = async (c: ConexiuneNoua, eticheta: string, cheie: string): Promise<string | null> => {
    setOcupat(cheie);
    setDiagnoza(null);
    const r = await deschideConexiune({ profil: c.profil, adresa: c.adresa, port: c.port, ultimIp: c.ultimIp ?? null });
    if (!r.ok) {
      setOcupat(null);
      const gazda = adresaRetea(c.adresa, c.port);
      setDiagnoza({ eticheta, motiv: r.motiv, incercate: r.incercate, ...(r.pod ? { pod: r.pod } : {}), retea: c.retea ?? null, gazda: gazda.ok ? gazda.adresa.gazda : c.adresa });
      return propozitie(textMotivSonda(r.motiv, r.pod));
    }
    if (inchisa.current) {
      await r.transport.inchide();
      return null;
    }
    const ip = !esteIpv4(c.adresa) && r.pod?.ip ? r.pod.ip : null;
    tine((s) => tineConexiune(s, { ...c, ...(ip !== null ? { ultimIp: ip } : {}) }, Date.now()));
    try {
      await conecteaza(r.transport, `${r.adresa.gazda}:${r.adresa.port}`);
    } finally {
      setOcupat(null);
    }
    return null;
  };

  const legaGasita = (g: Gasit, adresa: string): Promise<string | null> => {
    const c: ConexiuneNoua = {
      profil: g.inc.profil, adresa, port: g.inc.port, drum: drumGasit(adresa, g.pod),
      ...(g.pod?.ip && !esteIpv4(adresa) ? { ultimIp: g.pod.ip } : {}),
    };
    return lega(c, etichetaConexiune({ drum: c.drum, retea: null }), `gasit:${adresa}`);
  };

  if (vedere === 'cauta') {
    return (
      <Cautare tinute={tinute.conexiuni} scanare={scanareCeruta} ocupat={ocupat} legaGasita={legaGasita}
        inapoi={() => { setScanareCeruta(false); setVedere('alege'); }} alta={() => { setVedere('adresa'); }} />
    );
  }
  if (vedere === 'adresa') {
    return (
      <FormularAdresa initial={tinute.formular} inapoi={() => { setVedere('alege'); }}
        conecteaza={(profil, text, port) => {
          const a = adresaRetea(text, port);
          if (!a.ok) return Promise.resolve(t(`masina.wifi.refuz.${a.motiv}`));
          tine((s) => cuFormular(s, { profil, adresa: text.trim(), port: a.adresa.port }));
          return lega({ profil, adresa: text.trim(), port: a.adresa.port, drum: 'adresa' }, t('masina.wifi.drum.adresa'), 'adresa');
        }} />
    );
  }
  if (vedere === 'pod') {
    return (
      <AsistentPod tine={tine} lega={lega} gata={() => { setVedere('alege'); }}
        cautaInRetea={() => { setScanareCeruta(true); setVedere('cauta'); }} />
    );
  }

  return (
    <div className="masina-wifi" data-testid="masina-wifi">
      <h4>{t('masina.wifi.tinute')}</h4>
      {tinute.conexiuni.length === 0
        ? <p className="masina-nota-slaba">{t('masina.wifi.tinute.niciuna')}</p>
        : (
          <ul className="masina-wifi-lista" data-testid="masina-wifi-tinute">
            {tinute.conexiuni.map((c) => {
              const eticheta = etichetaConexiune(c);
              return (
                <li key={c.id} className="masina-wifi-rand" data-drum={c.drum}>
                  <span className="masina-wifi-text">
                    <strong>{eticheta}</strong>
                    <span>{detaliuConexiune(c)}</span>
                  </span>
                  <span className="masina-butoane">
                    <button type="button" className="principal" data-masina="wifi-tinuta" disabled={ocupat !== null}
                      onClick={() => { void lega(c, eticheta, c.id); }}>
                      {t(ocupat === c.id ? 'masina.wifi.se-conecteaza' : 'masina.wifi.conecteaza')}
                    </button>
                    <button type="button" data-masina="wifi-uita" disabled={ocupat !== null} title={t('masina.wifi.uita.titlu', { eticheta })}
                      onClick={() => { setDiagnoza(null); tine((s) => uitaConexiune(s, c.id)); }}>{t('masina.wifi.uita')}</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      {diagnoza && <CardDiagnoza d={diagnoza} cauta={() => { setDiagnoza(null); setVedere('cauta'); }}
        scaneaza={() => { setDiagnoza(null); setScanareCeruta(true); setVedere('cauta'); }} />}
      <div className="masina-butoane">
        <button type="button" data-masina="wifi-cauta" disabled={ocupat !== null} onClick={() => { setDiagnoza(null); setVedere('cauta'); }}>{t('masina.wifi.cauta')}</button>
        <button type="button" data-masina="wifi-alta" disabled={ocupat !== null} onClick={() => { setDiagnoza(null); setVedere('adresa'); }}>{t('masina.wifi.alta')}</button>
        <button type="button" data-masina="wifi-pod" disabled={ocupat !== null} onClick={() => { setDiagnoza(null); setVedere('pod'); }}>{t('masina.wifi.pod')}</button>
        <button type="button" data-masina="wifi-renunta" onClick={renunta}>{t('masina.wifi.renunta')}</button>
      </div>
      <p className="masina-nota-slaba">{t('masina.wifi.nota')}</p>
    </div>
  );
}

/** Ce s-a încercat și ce verifici (ADR 0136 §3); la permisiune sau la alt pod, doar motivul. */
function CardDiagnoza({ d, cauta, scaneaza }: { readonly d: Diagnoza; readonly cauta: () => void; readonly scaneaza: () => void }): ReactNode {
  const pasi = d.motiv === 'retea-nedeschis' || d.motiv === 'retea-timp' || d.motiv === 'tacut';
  return (
    <div className="masina-nota masina-wifi-diagnoza" role="alert" data-testid="masina-wifi-diagnoza" data-motiv={d.motiv}>
      <p><strong>{t('masina.wifi.esec', { eticheta: d.eticheta })}</strong></p>
      <p>{propozitie(textMotivSonda(d.motiv, d.pod))}{d.incercate.length > 0 ? ` ${t('masina.wifi.esec.incercate', { adrese: d.incercate.join(', ') })}` : ''}</p>
      {pasi && (
        <ol>
          <li>{t('masina.wifi.esec.pornita')}</li>
          <li>{d.retea === null ? t('masina.wifi.esec.retea.fara') : t('masina.wifi.esec.retea', { retea: d.retea })}</li>
          <li>{t('masina.wifi.esec.pagina')}{' '}
            <a href={`http://${d.gazda}`} target="_blank" rel="noopener noreferrer">{t('masina.wifi.esec.deschide', { gazda: d.gazda })}</a></li>
        </ol>
      )}
      {pasi && (
        <div className="masina-butoane">
          <button type="button" data-masina="wifi-cauta" onClick={cauta}>{t('masina.wifi.cauta')}</button>
          <button type="button" data-masina="wifi-scaneaza" onClick={scaneaza}>{t('masina.wifi.scaneaza')}</button>
        </div>
      )}
    </div>
  );
}

type StareGazda = { readonly adresa: string; readonly stare: 'caut' | 'nu' | 'gasit' | 'raspuns'; readonly gasit?: Gasit; readonly motiv?: MotivSonda; readonly pod?: InfoPod };
type Scanare = { readonly retele: string; readonly facute: number; readonly total: number; readonly gata: boolean; readonly gasit: { readonly adresa: string; readonly g: Gasit } | null; readonly nepotrivite: readonly string[]; readonly refuz: string | null; readonly oprita: boolean };

/** Ce s-a găsit: podul (versiunea, ținta, IP-ul) sau un controler GRBL (portul, controlerul). */
const textGasit = (g: Gasit): string => (g.pod
  ? t(g.pod.ip ? 'masina.wifi.gasit.pod' : 'masina.wifi.gasit.pod.fara-ip', { versiune: g.pod.versiune, tinta: g.pod.tinta, ip: g.pod.ip ?? '' })
  : t('masina.wifi.gasit.grbl', { port: g.inc.port, profil: profilText(g.inc.profil) }));

/**
 * „Caută mașina” (ADR 0136 §2): gazdele știute deodată, fiecare cu rândul ei; „Caută în toată rețeaua”, la clic, cu progresul,
 * oprirea și prima mașină găsită. Ieșirea din vedere oprește tot.
 */
function Cautare({ tinute, scanare: scanareCeruta, ocupat, legaGasita, inapoi, alta }: {
  readonly tinute: readonly ConexiuneTinuta[];
  readonly scanare: boolean;
  readonly ocupat: string | null;
  readonly legaGasita: (g: Gasit, adresa: string) => Promise<string | null>;
  readonly inapoi: () => void;
  readonly alta: () => void;
}): ReactNode {
  const [gazde, setGazde] = useState<readonly StareGazda[]>([]);
  const [scanare, setScanare] = useState<Scanare | null>(null);
  const [refuz, setRefuz] = useState<string | null>(null);
  const oprireCautare = useRef<AbortController | null>(null);
  const oprireScanare = useRef<AbortController | null>(null);

  useEffect(() => {
    const oprire = new AbortController();
    oprireCautare.current = oprire;
    const lista = gazdeCautare(tinute);
    setGazde(lista.map((g) => ({ adresa: g.adresa, stare: 'caut' })));
    lista.forEach((g, k) => {
      void sondeazaGazda(g, { semnal: oprire.signal, timpDeschidereMs: TIMP_DESCHIDERE_MS }).then((r) => {
        if (oprire.signal.aborted) return;
        setGazde((v) => v.map<StareGazda>((x, j) => (j !== k ? x
          : r.ok ? { adresa: x.adresa, stare: 'gasit', gasit: r.gasit }
            : r.motiv === 'versiune' || r.motiv === 'tinta' || r.motiv === 'retea-permisiune' ? { adresa: x.adresa, stare: 'raspuns', motiv: r.motiv, ...(r.pod ? { pod: r.pod } : {}) }
              : { adresa: x.adresa, stare: 'nu' })));
      });
    });
    if (scanareCeruta) void scaneaza();
    return () => { oprire.abort(); oprireScanare.current?.abort(); };
  }, []);

  /**
   * Toată rețeaua: cele /24 ale IP-urilor știute (altfel 192.168.0.x și 192.168.1.x), întâi podul (8282) pe toate gazdele,
   * apoi portul 81, câte `CONCURENTA_RETEA` deodată. Fiecare încercare așteaptă și întârzierea browserului (până la 5 s).
   */
  const scaneaza = async (): Promise<void> => {
    oprireScanare.current?.abort();
    const oprire = new AbortController();
    oprireScanare.current = oprire;
    const prefixe = reteleDeCautat(tinute);
    const lista: Gazda[] = [INCERCARE_POD, INCERCARE_81].flatMap((inc) => prefixe.flatMap((p) => gazdeRetea(p, inc)));
    const retele = prefixe.map((p) => `${p}.x`).join(', ');
    const nepotrivite: string[] = [];
    setScanare({ retele, facute: 0, total: lista.length, gata: false, gasit: null, nepotrivite: [], refuz: null, oprita: false });
    const permisiune = await permisiuneRetea();
    if (permisiune === 'denied') {
      setScanare({ retele, facute: 0, total: lista.length, gata: true, gasit: null, nepotrivite: [], refuz: t('masina.motiv.retea-permisiune'), oprita: false });
      return;
    }
    // Permisiunea neîntrebată încă: prima gazdă singură, cu timp, cât omul răspunde la întrebarea browserului.
    const prima = permisiune === 'prompt' ? 1 : 0;
    const proba = async (i: number, semnal: AbortSignal, lung: boolean): Promise<Gasit | null> => {
      const g = lista[i];
      if (!g) return null;
      const r = await sondeazaGazda(g, { semnal, timpDeschidereMs: lung ? 30_000 : TIMP_DESCHIDERE_RETEA_MS, timpRaspunsMs: 2500 });
      if (!r.ok && (r.motiv === 'versiune' || r.motiv === 'tinta')) nepotrivite.push(`${g.adresa}: ${textMotivSonda(r.motiv, r.pod)}`);
      return r.ok ? r.gasit : null;
    };
    let gasit: { readonly i: number; readonly rezultat: Gasit } | null = null;
    if (prima === 1) {
      const r = await proba(0, oprire.signal, true);
      if (r) gasit = { i: 0, rezultat: r };
    }
    if (gasit === null && !oprire.signal.aborted) {
      gasit = await primulGasit(lista.length - prima, (i, semnal) => proba(i + prima, semnal, false), {
        concurenta: CONCURENTA_RETEA,
        semnal: oprire.signal,
        laProgres: (n) => { setScanare((s) => (s && !s.gata ? { ...s, facute: n + prima } : s)); },
      });
      if (gasit) gasit = { i: gasit.i + prima, rezultat: gasit.rezultat };
    }
    if (oprire.signal.aborted && gasit === null) return;
    const g = gasit === null ? null : { adresa: lista[gasit.i]?.adresa ?? '', g: gasit.rezultat };
    setScanare((s) => ({ retele, facute: s?.facute ?? 0, total: lista.length, gata: true, gasit: g, nepotrivite: [...nepotrivite], refuz: null, oprita: false }));
  };
  const opresteScanarea = (): void => {
    oprireScanare.current?.abort();
    setScanare((s) => (s ? { ...s, gata: true, oprita: true } : s));
  };
  const leaga = (g: Gasit, adresa: string): void => {
    setRefuz(null);
    void legaGasita(g, adresa).then((m) => { setRefuz(m); });
  };

  return (
    <div className="masina-wifi" data-testid="masina-wifi-cauta">
      <h4>{t('masina.wifi.cauta.titlu')}</h4>
      <p className="masina-nota-slaba">{t('masina.wifi.cauta.ajutor')}</p>
      <ul className="masina-wifi-lista">
        {gazde.map((g) => (
          <li key={g.adresa} className="masina-wifi-rand" data-gazda={g.adresa} data-stare={g.stare}>
            <span className="masina-wifi-text">
              <strong>{g.adresa}</strong>
              <span>{g.stare === 'caut' ? t('masina.wifi.cauta.caut')
                : g.stare === 'nu' ? t('masina.wifi.cauta.nu')
                  : g.stare === 'raspuns' ? textMotivSonda(g.motiv ?? 'tacut', g.pod)
                    : g.gasit ? textGasit(g.gasit) : ''}</span>
            </span>
            {g.stare === 'gasit' && g.gasit && (
              <span className="masina-butoane">
                <button type="button" className="principal" data-masina="wifi-gasita" disabled={ocupat !== null}
                  onClick={() => { if (g.gasit) leaga(g.gasit, g.adresa); }}>
                  {t(ocupat === `gasit:${g.adresa}` ? 'masina.wifi.se-conecteaza' : 'masina.wifi.conecteaza')}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {scanare && (
        <div className="masina-wifi-scanare" data-testid="masina-wifi-scanare" data-gata={scanare.gata ? 'da' : 'nu'}>
          {!scanare.gata && <progress max={scanare.total} value={scanare.facute} />}
          <p className="masina-nota-slaba" role="status">
            {scanare.refuz ?? (!scanare.gata ? t('masina.wifi.scaneaza.progres', {
              retele: scanare.retele, facute: scanare.facute, total: scanare.total,
              port: scanare.facute < scanare.total / 2 ? INCERCARE_POD.port : INCERCARE_81.port,
            })
              : scanare.oprita ? t('masina.wifi.scaneaza.oprita', { facute: scanare.facute, total: scanare.total })
                : scanare.gasit ? '' : t('masina.wifi.scaneaza.nimic', { retele: scanare.retele }))}
          </p>
          {scanare.nepotrivite.map((x) => <p key={x} className="masina-nota-slaba">{x}</p>)}
          {scanare.gasit && (
            <div className="masina-wifi-rand" data-gazda={scanare.gasit.adresa} data-stare="gasit">
              <span className="masina-wifi-text">
                <strong>{scanare.gasit.adresa}</strong>
                <span>{textGasit(scanare.gasit.g)}</span>
              </span>
              <span className="masina-butoane">
                <button type="button" className="principal" data-masina="wifi-gasita" disabled={ocupat !== null}
                  onClick={() => { if (scanare.gasit) leaga(scanare.gasit.g, scanare.gasit.adresa); }}>
                  {t(ocupat === `gasit:${scanare.gasit.adresa}` ? 'masina.wifi.se-conecteaza' : 'masina.wifi.conecteaza')}
                </button>
              </span>
            </div>
          )}
        </div>
      )}
      {refuz && <p className="masina-nota" role="alert" data-testid="masina-wifi-refuz">{refuz}</p>}
      <div className="masina-butoane">
        {scanare && !scanare.gata
          ? <button type="button" data-masina="wifi-scaneaza-opreste" onClick={opresteScanarea}>{t('masina.wifi.scaneaza.opreste')}</button>
          : <button type="button" data-masina="wifi-scaneaza" disabled={ocupat !== null} onClick={() => { void scaneaza(); }}>{t('masina.wifi.scaneaza')}</button>}
        <button type="button" data-masina="wifi-alta" disabled={ocupat !== null} onClick={alta}>{t('masina.wifi.alta')}</button>
        <button type="button" data-masina="wifi-inapoi" onClick={inapoi}>{t('masina.wifi.inapoi')}</button>
      </div>
      {!scanare && <p className="masina-nota-slaba">{t('masina.wifi.scaneaza.ajutor')}</p>}
    </div>
  );
}

/**
 * „Altă adresă…” (ADR 0119): controlerul (cu portul lui implicit), adresa și portul, din ultima scriere; refuzul (adresa sau
 * legătura) se spune sub formular.
 */
function FormularAdresa({ initial, conecteaza, inapoi }: {
  readonly initial: ConexiuniTinute['formular'];
  readonly conecteaza: (profil: ProfilRetea, adresa: string, port: number) => Promise<string | null>;
  readonly inapoi: () => void;
}): ReactNode {
  const [profil, setProfil] = useState<ProfilRetea>(initial?.profil ?? 'fluidnc');
  const [adresa, setAdresa] = useState(initial?.adresa ?? '');
  const [port, setPort] = useState(String(initial?.port ?? PROFIL_RETEA.fluidnc.port));
  const [ocupat, setOcupat] = useState(false);
  const [refuz, setRefuz] = useState<string | null>(null);
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    setOcupat(true);
    setRefuz(null);
    void conecteaza(profil, adresa, numar(port)).then((r) => { setOcupat(false); setRefuz(r); });
  };
  return (
    <form className="masina-wifi" onSubmit={trimite} data-testid="masina-wifi-adresa">
      <label className="masina-camp">
        <span>{t('masina.wifi.profil')}</span>
        <select value={profil} data-masina="wifi-profil"
          onChange={(e) => { const v = e.target.value; if (esteProfilRetea(v)) { setProfil(v); setPort(String(PROFIL_RETEA[v].port)); } }}>
          {PROFILURI_RETEA.map((p) => <option key={p} value={p}>{profilText(p)}</option>)}
        </select>
      </label>
      <label className="masina-camp">
        <span>{t('masina.wifi.adresa')}</span>
        <input value={adresa} data-masina="wifi-adresa" placeholder="192.168.1.50" autoComplete="off" spellCheck={false}
          onChange={(e) => { setAdresa(e.target.value); }} />
      </label>
      <label className="masina-camp">
        <span>{t('masina.wifi.port')}</span>
        <input type="number" inputMode="numeric" min={1} max={65535} step={1} value={port} data-masina="wifi-port" className="masina-numar"
          onChange={(e) => { setPort(e.target.value); }} />
      </label>
      <p className="masina-nota-slaba">{t('masina.wifi.adresa.ajutor')}</p>
      <div className="masina-butoane">
        <button type="submit" className="principal" data-masina="wifi-conecteaza" disabled={ocupat}>
          {t(ocupat ? 'masina.wifi.se-conecteaza' : 'masina.wifi.conecteaza')}
        </button>
        <button type="button" data-masina="wifi-inapoi" onClick={inapoi}>{t('masina.wifi.inapoi')}</button>
      </div>
      {refuz && <p className="masina-nota" role="alert" data-testid="masina-wifi-refuz">{refuz}</p>}
    </form>
  );
}

/** Rețeaua aleasă la pasul 2: una văzută de pod, sau una ascunsă, scrisă de mână (`null` până la alegere). */
type Alegere = { readonly fel: 'vazuta'; readonly r: ReteaVazuta } | { readonly fel: 'ascunsa' } | null;
/** Numele scurt al unei comenzi a podului, pentru refuzul ei. */
const COMENZI_POD: Readonly<Record<number, CheieSimpla>> = {
  106: 'masina.pod.comanda.106', 100: 'masina.pod.comanda.100', 101: 'masina.pod.comanda.101', 110: 'masina.pod.comanda.110',
};
/** Cât caută pasul 3 podul în rețeaua atelierului: o încercare la 4 secunde, cam două minute. */
const INCERCARI_PAS3 = 30;
const PAUZA_PAS3_MS = 4000;

/**
 * Asistentul podului ESP3D (ADR 0136 §4): 1) calculatorul în rețeaua podului, podul verificat (`[ESP800]`) și ținut ca drum
 * direct; 2) rețelele văzute de pod (`[ESP410]`), parola rețelei și parola nouă a podului, trimise doar podului, apoi trecerea
 * în rețeaua atelierului; 3) calculatorul înapoi în rețeaua atelierului, podul căutat după nume până răspunde, apoi ținut.
 */
function AsistentPod({ tine, lega, gata, cautaInRetea }: {
  readonly tine: (f: (s: ConexiuniTinute) => ConexiuniTinute) => void;
  readonly lega: (c: ConexiuneNoua, eticheta: string, cheie: string) => Promise<string | null>;
  readonly gata: () => void;
  readonly cautaInRetea: () => void;
}): ReactNode {
  const [pas, setPas] = useState<1 | 2 | 3>(1);
  const [adresaPod, setAdresaPod] = useState(ADRESA_POD_NOU);
  const [ocupat, setOcupat] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoPod | null>(null);
  const legatura = useRef<LegaturaPod | null>(null);
  const [retele, setRetele] = useState<readonly ReteaVazuta[] | null>(null);
  const [alegere, setAlegere] = useState<Alegere>(null);
  const [ascunsa, setAscunsa] = useState('');
  const [parola, setParola] = useState('');
  const [parolaPod, setParolaPod] = useState('');
  const [progres, setProgres] = useState<string | null>(null);
  const [legaturaPierduta, setLegaturaPierduta] = useState(false);
  // Pasul 3.
  const [reteaAtelier, setReteaAtelier] = useState('');
  const [incercarea, setIncercarea] = useState(0);
  const [gasit, setGasit] = useState<InfoPod | null>(null);
  const [cautareGata, setCautareGata] = useState(false);
  const [refuzLegare, setRefuzLegare] = useState<string | null>(null);
  const oprire = useRef<AbortController | null>(null);

  // Ieșirea din asistent închide legătura cu podul și oprește căutarea.
  useEffect(() => () => { oprire.current?.abort(); void legatura.current?.inchide(); }, []);

  const verifica = async (): Promise<void> => {
    const a = adresaRetea(adresaPod, PROFIL_RETEA.esp3d.port);
    if (!a.ok) { setMesaj(t(`masina.wifi.refuz.${a.motiv}`)); return; }
    setOcupat(true);
    setMesaj(null);
    setInfo(null);
    await legatura.current?.inchide();
    legatura.current = null;
    const r = await deschidePod(a.adresa);
    if (!r.ok) {
      setOcupat(false);
      setMesaj(propozitie(textMotivSonda(r.motiv, r.info)));
      return;
    }
    legatura.current = r.pod;
    const nume = await r.pod.numeReteaProprie();
    // Drumul direct, prin rețeaua podului: rămâne și dacă asistentul se oprește aici.
    tine((s) => tineConexiune(s, { profil: 'esp3d', adresa: a.adresa.gazda, port: a.adresa.port, drum: 'proprie', retea: nume }, Date.now()));
    setInfo(r.pod.info);
    setOcupat(false);
    setLegaturaPierduta(false);
  };

  const cereRetele = async (): Promise<void> => {
    const l = legatura.current;
    if (!l) return;
    setRetele(null);
    setMesaj(null);
    try {
      const v = await l.retele();
      setRetele(v);
      setAlegere((x) => x ?? (v[0] ? { fel: 'vazuta', r: v[0] } : null));
    } catch {
      setRetele([]);
      setLegaturaPierduta(true);
    }
  };

  const continua = (): void => {
    setPas(2);
    void cereRetele();
  };

  const ssid = alegere?.fel === 'vazuta' ? alegere.r.ssid : ascunsa;
  const cuParola = alegere?.fel === 'ascunsa' ? parola !== '' : alegere?.fel === 'vazuta' && alegere.r.protejata;

  const trimite = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const l = legatura.current;
    if (!l || alegere === null) return;
    const plan = comenziPod({ retea: ssid, parola: cuParola ? parola : null, parolaPod });
    if (!plan.ok) {
      setMesaj(t('masina.pod.refuz.valoare', { camp: t(`masina.pod.camp.${plan.camp}`), motiv: t(`masina.pod.valoare.${plan.motiv}`) }));
      return;
    }
    setOcupat(true);
    setMesaj(null);
    try {
      for (const [k, c] of plan.comenzi.entries()) {
        setProgres(t('masina.pod.trimite.ocupat', { k: k + 1, n: plan.comenzi.length + 1 }));
        await l.seteaza(c);
      }
      setProgres(t('masina.pod.trimite.ocupat', { k: plan.comenzi.length + 1, n: plan.comenzi.length + 1 }));
      await l.treciPeAtelier();
    } catch (err) {
      setOcupat(false);
      setProgres(null);
      if (err instanceof RefuzPod) setMesaj(t('masina.pod.refuz.pod', { comanda: t(COMENZI_POD[err.nr] ?? 'masina.pod.comanda.100'), date: err.date }));
      else setLegaturaPierduta(true);
      return;
    }
    // Parolele nu rămân nici în pagină.
    setParola('');
    setParolaPod('');
    setProgres(null);
    setOcupat(false);
    await l.inchide();
    legatura.current = null;
    setReteaAtelier(ssid);
    setPas(3);
    void cautaPodul(ssid);
  };

  /** Pasul 3: podul, după numele lui din rețeaua atelierului (cel spus la pasul 1), până răspunde. */
  const nume = numeLocal(info);
  const cautaPodul = async (retea: string): Promise<void> => {
    oprire.current?.abort();
    const o = new AbortController();
    oprire.current = o;
    setGasit(null);
    setCautareGata(false);
    setRefuzLegare(null);
    for (let k = 1; k <= INCERCARI_PAS3 && !o.signal.aborted; k++) {
      setIncercarea(k);
      const r = await sondeazaGazda({ adresa: nume, incercari: [INCERCARE_POD] }, { semnal: o.signal, timpDeschidereMs: TIMP_DESCHIDERE_RETEA_MS });
      if (o.signal.aborted) return;
      if (r.ok && r.gasit.pod) {
        const p = r.gasit.pod;
        tine((s) => tineConexiune(s, { profil: 'esp3d', adresa: nume, port: PROFIL_RETEA.esp3d.port, drum: 'atelier', retea, ...(p.ip ? { ultimIp: p.ip } : {}) }, Date.now()));
        setGasit(p);
        setCautareGata(true);
        return;
      }
      await new Promise<void>((gata2) => {
        const ceas = setTimeout(gata2, PAUZA_PAS3_MS);
        o.signal.addEventListener('abort', () => { clearTimeout(ceas); gata2(); }, { once: true });
      });
    }
    if (!o.signal.aborted) setCautareGata(true);
  };

  const reia = (): void => {
    oprire.current?.abort();
    void legatura.current?.inchide();
    legatura.current = null;
    setPas(1);
    setInfo(null);
    setRetele(null);
    setAlegere(null);
    setMesaj(null);
    setLegaturaPierduta(false);
  };

  const cap = (
    <>
      <p className="masina-pod-pas" data-testid="masina-pod-pas" data-pas={pas}>{t('masina.pod.pas', { n: pas })}</p>
    </>
  );

  if (pas === 1) {
    return (
      <div className="masina-wifi" data-testid="masina-pod">
        {cap}
        <h4>{t('masina.pod.1.titlu')}</h4>
        <ol className="masina-pod-pasi">
          <li>{t('masina.pod.1.porneste')}</li>
          <li>{t('masina.pod.1.retea')}</li>
          <li>{t('masina.pod.1.verifica')}</li>
        </ol>
        <label className="masina-camp">
          <span>{t('masina.pod.adresa')}</span>
          <input value={adresaPod} data-masina="pod-adresa" autoComplete="off" spellCheck={false} onChange={(e) => { setAdresaPod(e.target.value); }} />
        </label>
        {info && <p className="masina-cap" role="status" data-testid="masina-pod-raspunde">{t('masina.pod.raspunde', { adresa: adresaPod.trim(), versiune: info.versiune, tinta: info.tinta })}</p>}
        {mesaj && <p className="masina-nota" role="alert" data-testid="masina-pod-refuz">{mesaj}</p>}
        <div className="masina-butoane">
          <button type="button" className={info ? '' : 'principal'} data-masina="pod-verifica" disabled={ocupat} onClick={() => { void verifica(); }}>
            {t(ocupat ? 'masina.pod.verifica.ocupat' : 'masina.pod.verifica')}
          </button>
          {info && <button type="button" className="principal" data-masina="pod-continua" onClick={continua}>{t('masina.pod.continua')}</button>}
          <button type="button" data-masina="wifi-inapoi" onClick={gata}>{t('masina.wifi.inapoi')}</button>
        </div>
        <p className="masina-nota-slaba">{t('masina.pod.1.nota')}</p>
      </div>
    );
  }

  if (pas === 2) {
    return (
      <form className="masina-wifi" data-testid="masina-pod" onSubmit={(e) => { void trimite(e); }}>
        {cap}
        <h4>{t('masina.pod.2.titlu')}</h4>
        <fieldset className="masina-pod-retele" disabled={ocupat}>
          <legend>{t('masina.pod.retele')}</legend>
          {retele === null && <p className="masina-nota-slaba" role="status">{t('masina.pod.retele.caut')}</p>}
          {retele !== null && retele.length === 0 && !legaturaPierduta && <p className="masina-nota-slaba">{t('masina.pod.retele.niciuna')}</p>}
          {retele?.map((r) => (
            <label key={r.ssid} className="masina-pod-retea">
              <input type="radio" name="masina-pod-retea" data-masina="pod-retea" value={r.ssid}
                checked={alegere?.fel === 'vazuta' && alegere.r.ssid === r.ssid} onChange={() => { setAlegere({ fel: 'vazuta', r }); setParola(''); }} />
              <span className="masina-pod-ssid">{r.ssid}</span>
              <span>{t('masina.pod.semnal', { semnal: r.semnal })}</span>
              <span>{t(r.protejata ? 'masina.pod.protejata' : 'masina.pod.libera')}</span>
            </label>
          ))}
          <label className="masina-pod-retea">
            <input type="radio" name="masina-pod-retea" data-masina="pod-retea-ascunsa" checked={alegere?.fel === 'ascunsa'}
              onChange={() => { setAlegere({ fel: 'ascunsa' }); setParola(''); }} />
            <span>{t('masina.pod.ascunsa')}</span>
          </label>
          {alegere?.fel === 'ascunsa' && (
            <input value={ascunsa} data-masina="pod-retea-nume" aria-label={t('masina.pod.ascunsa.nume')} autoComplete="off" spellCheck={false}
              onChange={(e) => { setAscunsa(e.target.value); }} />
          )}
          <div className="masina-butoane">
            <button type="button" data-masina="pod-retele" disabled={ocupat || retele === null} onClick={() => { void cereRetele(); }}>{t('masina.pod.retele.din-nou')}</button>
          </div>
        </fieldset>
        {(alegere?.fel === 'ascunsa' || (alegere?.fel === 'vazuta' && alegere.r.protejata)) && (
          <label className="masina-camp masina-camp-lung">
            <span>{t(alegere.fel === 'ascunsa' ? 'masina.pod.parola.ascunsa' : 'masina.pod.parola')}</span>
            <input type="password" value={parola} data-masina="pod-parola" autoComplete="off" disabled={ocupat} onChange={(e) => { setParola(e.target.value); }} />
          </label>
        )}
        <label className="masina-camp masina-camp-lung">
          <span>{t('masina.pod.parola-pod')}</span>
          <input type="password" value={parolaPod} data-masina="pod-parola-pod" autoComplete="new-password" disabled={ocupat} onChange={(e) => { setParolaPod(e.target.value); }} />
        </label>
        <p className="masina-nota-slaba">{t('masina.pod.parola-pod.ajutor')}</p>
        {mesaj && <p className="masina-nota" role="alert" data-testid="masina-pod-refuz">{mesaj}</p>}
        {legaturaPierduta && (
          <div className="masina-nota" role="alert" data-testid="masina-pod-legatura">
            <p>{t('masina.pod.legatura')}</p>
            <div className="masina-butoane"><button type="button" data-masina="pod-reia" onClick={reia}>{t('masina.pod.reia')}</button></div>
          </div>
        )}
        <div className="masina-butoane">
          <button type="submit" className="principal" data-masina="pod-trimite" disabled={ocupat || alegere === null || legaturaPierduta}>
            {progres ?? t('masina.pod.trimite')}
          </button>
          <button type="button" data-masina="wifi-inapoi" disabled={ocupat} onClick={gata}>{t('masina.wifi.inapoi')}</button>
        </div>
        <p className="masina-nota-slaba">{t('masina.pod.2.nota')}</p>
      </form>
    );
  }

  return (
    <div className="masina-wifi" data-testid="masina-pod">
      {cap}
      <h4>{t('masina.pod.3.titlu', { retea: reteaAtelier })}</h4>
      <p>{t('masina.pod.3.text', { retea: reteaAtelier, nume })}</p>
      {!cautareGata && <p className="masina-nota-slaba" role="status" data-testid="masina-pod-caut">{t('masina.pod.3.caut', { nume, n: incercarea })}</p>}
      {gasit && (
        <div className="masina-wifi-rand" data-stare="gasit" data-testid="masina-pod-gasit">
          <span className="masina-wifi-text">
            <strong>{t(gasit.ip ? 'masina.pod.3.gasit' : 'masina.pod.3.gasit.fara-ip', { nume, ip: gasit.ip ?? '' })}</strong>
            <span>{t('masina.pod.3.tinut', { retea: reteaAtelier })}</span>
          </span>
        </div>
      )}
      {cautareGata && !gasit && <p className="masina-nota" role="alert" data-testid="masina-pod-nimic">{t('masina.pod.3.nimic', { nume, retea: reteaAtelier })}</p>}
      {refuzLegare && <p className="masina-nota" role="alert" data-testid="masina-wifi-refuz">{refuzLegare}</p>}
      <div className="masina-butoane">
        {gasit && (
          <button type="button" className="principal" data-masina="pod-conecteaza"
            onClick={() => {
              setRefuzLegare(null);
              void lega({ profil: 'esp3d', adresa: nume, port: PROFIL_RETEA.esp3d.port, drum: 'atelier', retea: reteaAtelier, ...(gasit.ip ? { ultimIp: gasit.ip } : {}) },
                etichetaConexiune({ drum: 'atelier', retea: reteaAtelier }), 'pod').then((m) => { setRefuzLegare(m); });
            }}>{t('masina.wifi.conecteaza')}</button>
        )}
        {gasit && <button type="button" data-masina="pod-gata" onClick={gata}>{t('masina.pod.gata')}</button>}
        {cautareGata && !gasit && <button type="button" className="principal" data-masina="pod-cauta-iar" onClick={() => { void cautaPodul(reteaAtelier); }}>{t('masina.pod.3.din-nou')}</button>}
        {cautareGata && !gasit && <button type="button" data-masina="wifi-scaneaza" onClick={cautaInRetea}>{t('masina.wifi.scaneaza')}</button>}
        {!gasit && <button type="button" data-masina="pod-reia" onClick={reia}>{t('masina.pod.reia')}</button>}
      </div>
    </div>
  );
}
