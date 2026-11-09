/**
 * Fereastra Imprimanta (ADR 0190, felia 3.6g): o imprimantă Creality din familia K1 (K1C), legată prin WiFi, pe protocolul ei
 * din fabrică (WebSocket-ul de pe 9999). Conectarea (imprimantele ținute în browser, adresa scrisă de mână sau căutarea în
 * toată rețeaua, la clic), starea (lucrarea, temperaturile, codul de la imprimantă), Pauză / Reia / Oprește, fișierele din
 * imprimantă, pornite cu confirmare („Patul e gol”), și jurnalul cadrelor. Din felia 3.6h, și trimiterea unui `.gcode` de pe
 * calculator: verificat întâi pe calculator (antetul feliatorului, mișcările față de pat), apoi căutat în lista imprimantei.
 *
 * Siguranța (ADR 0190 §E, ADR 0192 §D): singură, fereastra doar citește și răspunde `ok` la bătaia inimii; fiecare comandă
 * pleacă dintr-un clic. Pornirea cere bifa „Patul e gol”, oprirea o confirmare (o imprimare oprită nu se mai poate relua), pauza
 * pleacă pe loc. O legătură căzută nu oprește imprimarea: fereastra spune asta și se leagă singură din nou; oprirea de urgență
 * rămâne ecranul imprimantei.
 *
 * Din felia 3.6o (ADR 0192): comenzile din timpul imprimării, după capabilitățile imprimantei legate (driverul ei): lumina,
 * ventilatoarele, viteza și debitul cât imprimă, țintele duzei și patului, cu Preîncălzește (materialele felierului) și Răcește,
 * homing-ul (cu bifa „Patul e gol”, doar cu imprimanta liberă). O valoare cerută se arată „în așteptare” până o raportează
 * imprimanta (după 6 s fără ea: „n-a confirmat”). Încălzirea pornită fără lucrare stă la vedere în bandă, cu Răcește; după o
 * preîncălzire din aplicație fără imprimare, imprimanta se răcește singură (implicit în 30 de minute, de schimbat sau de oprit).
 */
import {
  lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode,
} from 'react';
import { MATERIALE, type Material } from '../cam/feliere/profil.ts';
import type { DesenImprimanta } from './DialogDinDesen.tsx';
import '../i18n/imprimanta.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { limba, t } from '../i18n/t.ts';
import { adresaRetea, type AdresaRetea } from '../machine/reteaLocala.ts';
import { numeDin } from '../machine/imprimanta/creality.ts';
import {
  esteLibera, intregIn, sePoateOpri, sePoatePauza, sePoatePorni, sePoateRegla, sePoateRelua, type Capabilitati, type FisierImprimanta,
  type IdVentilator, type Imprimanta as ImprimantaCitita, type Incalzitor, type Interval, type StareLucrare,
} from '../machine/imprimanta/driver.ts';
import { DRIVER_IMPLICIT, DRIVERE, driverDupaId, esteIdDriver } from '../machine/imprimanta/drivere.ts';
import { analizeazaFisier, patPentru, type AnalizaGcode } from '../machine/imprimanta/gcode3d.ts';
import { RACIRE_IMPLICITA_MIN, SesiuneImprimanta, type LinieJurnal, type MotivImprimanta, type StareImprimanta } from '../machine/imprimanta/sesiune.ts';
import {
  cautaInRetea, CHEIE_IMPRIMANTE, citesteImprimante, reteleDeCautat, scrieImprimante, tineImprimanta, uitaImprimanta, type ImprimantaTinuta,
} from '../machine/imprimanta/tinute.ts';
import { numeDeTrimis, urca, type MotivUrcare } from '../machine/imprimanta/urcare.ts';
import './imprimanta.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** O singură sesiune pe pagină: fereastra rămâne montată după prima deschidere, iar legătura trăiește cu pagina. */
const sesiune = new SesiuneImprimanta();

/** Driverul unei adrese scrise de mână și al căutării în rețea: azi singurul (ADR 0192 §A.5). */
const IMPLICIT = DRIVERE[DRIVER_IMPLICIT];

/**
 * Răcirea singură (ADR 0192 §D.16, răspunsul 3a): pornită sau nu, și după câte minute, ținută în browser
 * (`cncvs2.imprimanta.racire`, `v: 1`); implicit, pornită, la 30 de minute. Sesiunea o primește de la început.
 */
type SetareRacire = { readonly pornita: boolean; readonly minute: number };
const CHEIE_RACIRE = 'cncvs2.imprimanta.racire';
const MINUTE_RACIRE: Interval = { min: 1, max: 240 };

function citesteRacire(): SetareRacire {
  try {
    const o = JSON.parse(localStorage.getItem(CHEIE_RACIRE) ?? 'null') as unknown;
    if (typeof o === 'object' && o !== null && (o as { v?: unknown }).v === 1) {
      const { pornita, minute } = o as { pornita?: unknown; minute?: unknown };
      if (typeof pornita === 'boolean' && typeof minute === 'number' && intregIn(minute, MINUTE_RACIRE) !== null) return { pornita, minute };
    }
  } catch {
    // Fără stocare (sau o valoare stricată): implicitul.
  }
  return { pornita: true, minute: RACIRE_IMPLICITA_MIN };
}

function scrieRacire(r: SetareRacire): void {
  try {
    localStorage.setItem(CHEIE_RACIRE, JSON.stringify({ v: 1, pornita: r.pornita, minute: r.minute }));
  } catch {
    // Fără stocare: setarea ține doar cât pagina.
  }
}

const racireInitiala = citesteRacire();
sesiune.seteazaRacire(racireInitiala.pornita ? racireInitiala.minute : null);

/**
 * Dialogul „Din desen…” (ADR 0191, felia 3.6j), cu felierea pieselor plate: o bucată a lui, adusă la primul clic, ca
 * fereastra să nu crească pentru cine doar trimite fișiere gata feliate. O bucată care nu vine (o publicare nouă, cu alte
 * nume de fișiere, peste o filă veche) spune asta, cu „Reîncarcă”, ca dialogurile aplicației.
 */
const DialogDinDesen = lazy(() => import('./DialogDinDesen.tsx').then((m) => ({ default: m.DialogDinDesen }), () => ({ default: FelieNeincarcata })));

function FelieNeincarcata({ inchide }: { readonly inchide: () => void }): ReactNode {
  return (
    <div className="imprimanta-dialog" role="alert" data-testid="imprimanta-felie-neincarcata">
      <p>{t('dialog.neincarcat')}</p>
      <div className="imprimanta-butoane">
        <button type="button" onClick={() => { window.location.reload(); }}>{t('eroare.reincarca')}</button>
        <button type="button" onClick={inchide}>{t('imprimanta.felie.renunta')}</button>
      </div>
    </div>
  );
}

/** Desenul de feliat: documentul și selecția, citite din aplicație la clicul pe „Din desen…”. */
export type SursaDesen = () => DesenImprimanta;

function citesteTinute(): readonly ImprimantaTinuta[] {
  try {
    return citesteImprimante(localStorage.getItem(CHEIE_IMPRIMANTE));
  } catch {
    return [];
  }
}

function scrieTinute(l: readonly ImprimantaTinuta[]): void {
  try {
    localStorage.setItem(CHEIE_IMPRIMANTE, scrieImprimante(l));
  } catch {
    // Fără stocare (o fereastră privată plină): lista rămâne doar în pagină.
  }
}


const durata = (s: number): string => {
  const x = Math.max(0, Math.round(s));
  if (x < 60) return t('imprimanta.secunde', { s: x });
  // Sub 10 minute contează secundele; peste, sau la fix, doar minutele („19 min”, nu „19 min 0 s”).
  if (x < 3600) return x < 600 && x % 60 !== 0 ? t('imprimanta.minute', { m: Math.floor(x / 60), s: x % 60 }) : t('imprimanta.min', { m: Math.floor(x / 60) });
  return t('imprimanta.ore', { h: Math.floor(x / 3600), m: Math.floor((x % 3600) / 60) });
};
const grade = (v: number | null): string => (v === null ? '—' : String(Math.round(v)));
const loc = (): string => (limba() === 'ro' ? 'ro-RO' : 'en-GB');
const ora = (ms: number): string => new Date(ms).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' });
/** Mărimea unui fișier: MB cu o zecimală de la 1 MB, altfel kB. */
const marimeText = (o: number): string => (o >= 1e6 ? `${(o / 1e6).toLocaleString(loc(), { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(o / 1e3))} kB`);
/** Adresa, cu portul doar dacă nu e cel din fabrică al driverului. */
const gazdaPort = (a: AdresaRetea, port: number): string => (a.port === port ? a.gazda : `${a.gazda}:${a.port}`);
const textMotiv = (m: MotivImprimanta, st: StareImprimanta): string => t(`imprimanta.motiv.${m}`, { adresa: st.adresa ? gazdaPort(st.adresa, st.driver.port) : '—' });

/** `scrieInaltimi`: scrie înălțimea de imprimare a pieselor în proiect (3.6l); null în doar-citire, lipsă fără proiect. */
export function PanouImprimanta({ desen, versiuneDesen, scrieInaltimi }: {
  readonly desen?: SursaDesen; readonly versiuneDesen?: string; readonly scrieInaltimi?: ((m: ReadonlyMap<string, number | null>) => void) | null;
}): ReactNode {
  const st = useSyncExternalStore((f) => sesiune.aboneaza(f), () => sesiune.stare());
  const [tinute, setTinute] = useState<readonly ImprimantaTinuta[]>(citesteTinute);
  const tine = (f: (l: readonly ImprimantaTinuta[]) => readonly ImprimantaTinuta[]): void => {
    setTinute((l) => {
      const noua = f(l);
      scrieTinute(noua);
      return noua;
    });
  };
  // Dialogul „Din desen…” (3.6j): unul singur, deasupra vederilor, ca să nu dispară când legătura se schimbă; fișierul feliat
  // trece la trimitere prin `deTrimis`. La închidere, focusul revine la butonul care l-a deschis.
  const [dinDesen, setDinDesen] = useState(false);
  const [deTrimis, setDeTrimis] = useState<{ readonly f: File; readonly k: number } | null>(null);
  const deschizator = useRef<HTMLElement | null>(null);
  const deschideDinDesen = desen === undefined ? null : (el: HTMLElement): void => { deschizator.current = el; setDinDesen(true); };
  const inchideDinDesen = (): void => {
    setDinDesen(false);
    requestAnimationFrame(() => {
      const b = deschizator.current;
      (b?.isConnected ? b : document.querySelector<HTMLElement>('[data-imprimanta="din-desen"]'))?.focus();
    });
  };
  const sePoateTrimite = st.legatura === 'conectat' && st.fisiere !== null && st.driver.capabilitati(st.imprimanta).trimitere;
  // O imprimantă legată intră prima în listă, cu driverul ei; modelul și numele ei, când le spune.
  const { legatura, adresa } = st;
  const { model, nume } = st.imprimanta;
  const driver = esteIdDriver(st.driver.id) ? st.driver.id : DRIVER_IMPLICIT;
  useEffect(() => {
    if (legatura !== 'conectat' || adresa === null) return;
    tine((l) => tineImprimanta(l, { adresa: adresa.gazda, port: adresa.port, model, nume, driver }, Date.now()));
  }, [legatura, adresa, model, nume, driver]);

  return (
    <div className="imprimanta" data-testid="imprimanta">
      <h2 className="imprimanta-ascuns">{t('vedere.imprimanta')}</h2>
      {dinDesen && desen !== undefined && (
        <Suspense fallback={<p role="status">{t('imprimanta.felie.lucreaza')}</p>}>
          <DialogDinDesen sursa={desen} versiune={versiuneDesen ?? ''} model={st.imprimanta.model} inchide={inchideDinDesen}
            scrieInaltimi={scrieInaltimi ?? null}
            trimite={sePoateTrimite ? (f) => { setDinDesen(false); setDeTrimis((x) => ({ f, k: (x?.k ?? 0) + 1 })); } : null} />
        </Suspense>
      )}
      {st.legatura === 'deconectat' || (st.legatura === 'se-leaga' && st.imprimanta.cod === null && st.imprimanta.model === null)
        ? <Conectare st={st} tinute={tinute} uita={(id) => { tine((l) => uitaImprimanta(l, id)); }} dinDesen={deschideDinDesen} />
        : <Imprimanta st={st} dinDesen={deschideDinDesen} deTrimis={deTrimis} inchideDinDesen={() => { setDinDesen(false); }} />}
    </div>
  );
}

function Conectare({ st, tinute, uita, dinDesen }: {
  readonly st: StareImprimanta; readonly tinute: readonly ImprimantaTinuta[]; readonly uita: (id: string) => void;
  readonly dinDesen: ((el: HTMLElement) => void) | null;
}): ReactNode {
  const [text, setText] = useState('');
  const [refuz, setRefuz] = useState<string | null>(null);
  const [cautare, setCautare] = useState<{ readonly n: number; readonly total: number } | null>(null);
  const [nimic, setNimic] = useState<string | null>(null);
  const oprire = useRef<AbortController | null>(null);
  useEffect(() => () => { oprire.current?.abort(); }, []);
  const lega = (a: AdresaRetea, driver = IMPLICIT): void => {
    setRefuz(null);
    setNimic(null);
    void sesiune.conecteaza(a, driver);
  };
  const trimis = (e: FormEvent): void => {
    e.preventDefault();
    const a = adresaRetea(text, IMPLICIT.port);
    if (!a.ok) { setRefuz(t(`imprimanta.refuz.${a.motiv}`)); return; }
    lega(a.adresa);
  };
  const cauta = (): void => {
    const c = new AbortController();
    oprire.current = c;
    setNimic(null);
    const retele = reteleDeCautat(tinute.map((x) => x.adresa));
    setCautare({ n: 0, total: retele.length * 254 });
    void cautaInRetea(retele, { semnal: c.signal, driver: IMPLICIT, laProgres: (n, total) => { setCautare({ n, total }); } }).then((g) => {
      if (oprire.current !== c) return;
      oprire.current = null;
      setCautare(null);
      if (c.signal.aborted) return;
      if (g === null) setNimic(t('imprimanta.cauta.nimic', { retele: retele.map((r) => `${r}.x`).join(', ') }));
      else lega(g.adresa);
    });
  };
  const seLeaga = st.legatura === 'se-leaga';
  return (
    <div className="imprimanta-coloane imprimanta-doua">
      <section className="imprimanta-card" aria-labelledby="imprimanta-conectare" data-testid="imprimanta-conectare">
        <h3 id="imprimanta-conectare">{t('imprimanta.conectare')}</h3>
        {tinute.length === 0
          ? <p className="imprimanta-slab">{t('imprimanta.niciuna')}</p>
          : (
            <ul className="imprimanta-tinute" aria-label={t('imprimanta.tinute')}>
              {tinute.map((x) => {
                const a = adresaRetea(x.adresa, x.port);
                const d = driverDupaId(x.driver) ?? IMPLICIT;
                return (
                  <li key={x.id} className="imprimanta-tinuta">
                    <span className="imprimanta-tinuta-nume">
                      <strong>{x.nume ?? x.model ?? t('imprimanta.tinuta.fara-nume')}</strong>
                      <span className="imprimanta-slab">{x.port === d.port ? x.adresa : `${x.adresa}:${x.port}`}{x.model && x.nume ? ` · ${x.model}` : ''}</span>
                    </span>
                    <button type="button" className="principal" data-imprimanta="tinuta" disabled={seLeaga || !a.ok}
                      onClick={() => { if (a.ok) lega(a.adresa, d); }}>{t('imprimanta.tinuta.conecteaza')}</button>
                    <button type="button" data-imprimanta="uita" disabled={seLeaga} onClick={() => { uita(x.id); }}>{t('imprimanta.tinuta.uita')}</button>
                  </li>
                );
              })}
            </ul>
          )}
        <form className="imprimanta-formular" onSubmit={trimis} noValidate>
          <label className="imprimanta-camp">
            <span>{t('imprimanta.adresa')}</span>
            <input value={text} data-imprimanta="adresa" inputMode="url" autoComplete="off" spellCheck={false} placeholder="192.168.1.50"
              disabled={seLeaga} onChange={(e) => { setText(e.target.value); setRefuz(null); }} />
          </label>
          <p className="imprimanta-ajutor">{t('imprimanta.adresa.ajutor')}</p>
          {refuz !== null && <p className="imprimanta-refuz" role="alert" data-testid="imprimanta-refuz">{refuz}</p>}
          <div className="imprimanta-butoane">
            <button type="submit" className="principal" data-imprimanta="conecteaza" disabled={seLeaga}>{t('imprimanta.conecteaza')}</button>
            {cautare === null
              ? <button type="button" data-imprimanta="cauta" disabled={seLeaga} onClick={cauta}>{t('imprimanta.cauta')}</button>
              : <button type="button" data-imprimanta="cauta-opreste" onClick={() => { oprire.current?.abort(); oprire.current = null; setCautare(null); }}>{t('imprimanta.cauta.opreste')}</button>}
          </div>
          {cautare !== null
            ? <p className="imprimanta-ajutor" role="status" data-testid="imprimanta-cauta">{t('imprimanta.cauta.progres', { n: cautare.n, total: cautare.total })}</p>
            : <p className="imprimanta-ajutor">{t('imprimanta.cauta.ajutor')}</p>}
          {nimic !== null && <p className="imprimanta-refuz" role="alert" data-testid="imprimanta-nimic">{nimic}</p>}
        </form>
        {seLeaga && st.adresa !== null && <p role="status" data-testid="imprimanta-se-leaga">{t('imprimanta.se-leaga', { adresa: gazdaPort(st.adresa, st.driver.port) })}</p>}
      </section>
      <section className="imprimanta-card" aria-labelledby="imprimanta-pasi">
        {st.motiv !== null
          ? (
            <>
              <h3 id="imprimanta-pasi">{t('imprimanta.pasi')}</h3>
              <p className="imprimanta-refuz" role="alert" data-testid="imprimanta-motiv" data-motiv={st.motiv}>{textMotiv(st.motiv, st)}</p>
              {st.motiv !== 'retea-permisiune' && (
                <ul className="imprimanta-pasi">
                  <li>{t('imprimanta.pasi.pornita')}</li>
                  <li>{t('imprimanta.pasi.retea')}</li>
                  <li>{t('imprimanta.pasi.adresa')}</li>
                  <li>{t('imprimanta.pasi.cauta')}</li>
                </ul>
              )}
            </>
          )
          : (
            <>
              <h3 id="imprimanta-pasi">{t('imprimanta.titlu')}</h3>
              <p>{t('imprimanta.prima')}</p>
            </>
          )}
        {dinDesen !== null && (
          <div className="imprimanta-din-desen">
            {/* „Din desen…” merge și fără imprimantă legată: atunci fișierul doar se salvează. */}
            <button type="button" data-imprimanta="din-desen" onClick={(e) => { dinDesen(e.currentTarget); }}>{t('imprimanta.felie.din-desen')}</button>
            <p className="imprimanta-ajutor">{t('imprimanta.felie.din-desen.ajutor')}</p>
          </div>
        )}
      </section>
    </div>
  );
}

/** Ferestrele de confirmare: pornirea unui fișier, oprirea imprimării și homing-ul (3.6o). */
type Confirmare = { readonly fel: 'pornire'; readonly fisier: FisierImprimanta } | { readonly fel: 'oprire' } | { readonly fel: 'homing' };

function Imprimanta({ st, dinDesen, deTrimis, inchideDinDesen }: {
  readonly st: StareImprimanta; readonly dinDesen: ((el: HTMLElement) => void) | null;
  readonly deTrimis: { readonly f: File; readonly k: number } | null; readonly inchideDinDesen: () => void;
}): ReactNode {
  const i = st.imprimanta;
  const stare: StareLucrare = st.driver.lucrare(i);
  // Ce poate imprimanta legată (ADR 0192 §A.4): fereastra arată doar comenzile de aici.
  const cap = st.driver.capabilitati(i);
  const cereri = useCereri(i);
  const legata = st.legatura === 'conectat';
  // Încălzirea pornită fără o lucrare stă la vedere, în bandă, cu Răcește (ADR 0192 §D.15).
  const calda = (i.duzaTinta ?? 0) > 0 || (i.patTinta ?? 0) > 0;
  const raceste = (): void => {
    for (const x of cap.tinte) cereri.cere(`tinta:${x.incalzitor}`, 0, () => sesiune.comanda({ fel: 'tinta', incalzitor: x.incalzitor, grade: 0 }));
  };
  const [confirmare, setConfirmare] = useState<Confirmare | null>(null);
  // După Oprește, imprimanta trece prin 7 („oprirea în curs”, pe care altfel o arătăm neutru, ca pregătire) până la 4.
  const [oprireCeruta, setOprireCeruta] = useState(false);
  const seOpreste = oprireCeruta && stare === 'pregatire';
  useEffect(() => { if (stare !== 'pregatire' && stare !== 'imprima' && stare !== 'pauza') setOprireCeruta(false); }, [stare]);
  // O confirmare veche nu rămâne după o legătură pierdută sau o stare în care comanda n-ar mai avea rost: se închide de tot,
  // ca să nu reapară singură când legătura revine.
  const rost = confirmare === null || !legata ? false
    : confirmare.fel === 'oprire' ? sePoateOpri(stare)
      : confirmare.fel === 'homing' ? esteLibera(stare) && st.secventa === null && i.ocupata !== true : sePoatePorni(stare);
  const afisata = rost ? confirmare : null;
  useEffect(() => { if (confirmare !== null && !rost) setConfirmare(null); }, [confirmare, rost]);
  // Fișierul ales pentru trimitere (3.6h); `k` repornește dialogul la fiecare alegere.
  const [ales, setAles] = useState<{ readonly f: File; readonly k: number } | null>(null);
  const intrare = useRef<HTMLInputElement | null>(null);
  // „Trimite un fișier…” închide dialogul „Din desen…” (altfel ar reveni singur, cu valorile de început, după trimitere).
  const alege = (): void => { inchideDinDesen(); intrare.current?.click(); };
  // Piesele plate din desen (3.6j): fișierul feliat trece prin aceeași trimitere ca unul de pe calculator.
  useEffect(() => { if (deTrimis !== null) setAles((x) => ({ f: deTrimis.f, k: (x?.k ?? 0) + 1 })); }, [deTrimis]);
  // IP-ul schimbat (3.6i: imprimanta owner-ului și-a luat altă adresă la o pornire de pe ecran): după o reîncercare căzută, o
  // caută o dată în rețea, după numele ei, și se leagă acolo; lista ținută o mută la noua adresă (`tineImprimanta`).
  const cautare = useRef<AbortController | null>(null);
  const [cautNume, setCautNume] = useState<string | null>(null);
  const deCautat = st.legatura === 'pierduta' && st.incercari >= 1 && i.nume !== null && st.adresa !== null;
  useEffect(() => {
    const nume = i.nume;
    const veche = st.adresa;
    if (!deCautat || cautare.current !== null || nume === null || veche === null) return;
    const c = new AbortController();
    cautare.current = c;
    setCautNume(nume);
    sesiune.noteaza(`search ${nume}`);
    void cautaInRetea(reteleDeCautat([veche.gazda]), { semnal: c.signal, nume, driver: st.driver }).then((g) => {
      if (c.signal.aborted) return;
      setCautNume(null);
      if (g === null || g.adresa.url === veche.url) return;
      sesiune.noteaza(`found ${nume} at ${g.adresa.url}`);
      void sesiune.conecteaza(g.adresa);
    });
  }, [deCautat]);
  useEffect(() => { if (st.legatura !== 'pierduta') { cautare.current?.abort(); cautare.current = null; setCautNume(null); } }, [st.legatura]);
  useEffect(() => () => { cautare.current?.abort(); }, []);
  const numeImprimanta = i.nume ?? i.model ?? t('imprimanta.tinuta.fara-nume');
  const detalii = [st.adresa ? t('imprimanta.prin-wifi', { adresa: gazdaPort(st.adresa, st.driver.port) }) : null, i.firmware ? t('imprimanta.firmware', { versiune: i.firmware }) : null]
    .filter((x): x is string => x !== null).join(' · ');
  return (
    <>
      <div className="imprimanta-banda" data-testid="imprimanta-banda">
        {st.legatura === 'pierduta'
          ? <span className="imprimanta-cip" data-stare="pierduta" data-testid="imprimanta-stare">{t('imprimanta.pierduta')}</span>
          : <span className="imprimanta-cip" data-stare={stare} data-testid="imprimanta-stare">{seOpreste ? t('imprimanta.stare.se-opreste') : t(`imprimanta.stare.${stare}`)}</span>}
        {legata && esteLibera(stare) && calda && (
          <span className="imprimanta-incalzeste" data-testid="imprimanta-incalzeste">
            {t('imprimanta.incalzeste', { duza: grade(i.duzaTinta), pat: grade(i.patTinta) })}
            <button type="button" data-imprimanta="incalzeste-raceste" onClick={raceste}>{t('imprimanta.raceste')}</button>
          </span>
        )}
        <span className="imprimanta-cine">
          <strong data-testid="imprimanta-nume">{numeImprimanta}</strong>
          <span className="imprimanta-slab">{detalii}</span>
        </span>
        <span className="imprimanta-butoane imprimanta-comenzi">
          {sePoateRelua(stare)
            ? <button type="button" className="principal" data-imprimanta="reia" disabled={!legata} onClick={() => { sesiune.reia(); }}>{t('imprimanta.reia')}</button>
            : <button type="button" data-imprimanta="pauza" disabled={!legata || !sePoatePauza(stare)} onClick={() => { sesiune.pauza(); }}>{t('imprimanta.pauza')}</button>}
          <button type="button" className="imprimanta-opreste" data-imprimanta="opreste" disabled={!legata || !sePoateOpri(stare)}
            onClick={() => { setConfirmare({ fel: 'oprire' }); }}>{t('imprimanta.opreste')}</button>
          <button type="button" data-imprimanta="deconecteaza" onClick={() => { setConfirmare(null); sesiune.deconecteaza(); }}>{t('imprimanta.deconecteaza')}</button>
        </span>
      </div>
      {st.legatura === 'pierduta' && (
        <div className="imprimanta-pierduta" role="alert" data-testid="imprimanta-pierduta">
          <strong>{t('imprimanta.pierduta.text')}</strong>
          <span>{st.pierdutaLa === null ? '' : st.incercari === 0
            ? t('imprimanta.pierduta.cand', { ora: ora(st.pierdutaLa) })
            : t('imprimanta.pierduta.incercari', { ora: ora(st.pierdutaLa), n: st.incercari })}</span>
          {cautNume !== null && <span data-testid="imprimanta-cauta-nume">{t('imprimanta.pierduta.cauta', { nume: cautNume })}</span>}
        </div>
      )}
      {st.legatura === 'se-leaga' && <p className="imprimanta-nota" role="status" data-testid="imprimanta-reface">{t('imprimanta.reface')}</p>}
      {afisata !== null && (
        <DialogConfirmare c={afisata} renunta={() => { setConfirmare(null); }}
          confirma={() => {
            if (afisata.fel === 'oprire') { if (sesiune.opresteImprimarea()) setOprireCeruta(true); }
            else if (afisata.fel === 'homing') sesiune.comanda({ fel: 'homing' });
            else sesiune.porneste(afisata.fisier);
            setConfirmare(null);
          }} />
      )}
      <input type="file" accept=".gcode" hidden ref={intrare} data-testid="imprimanta-ales"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setAles((x) => ({ f, k: (x?.k ?? 0) + 1 })); }} />
      {ales !== null && (
        <DialogTrimitere key={ales.k} fisier={ales.f} st={st} stare={stare} alt={alege} inchide={() => { setAles(null); }}
          porneste={(f) => { setAles(null); setConfirmare({ fel: 'pornire', fisier: f }); }} />
      )}
      <div className="imprimanta-coloane">
        <div className="imprimanta-stiva">
          <section className="imprimanta-card" aria-labelledby="imprimanta-lucrarea" data-testid="imprimanta-lucrarea">
            <h3 id="imprimanta-lucrarea">{t('imprimanta.lucrarea')}</h3>
            {i.fisier === null
              ? <p className="imprimanta-slab">{t('imprimanta.fara-lucrare')}</p>
              : (
                <>
                  <p className="imprimanta-fisier" data-testid="imprimanta-fisier">{numeDin(i.fisier)}</p>
                  <div className="imprimanta-progres" role="progressbar" aria-label={t('imprimanta.progres')} aria-valuemin={0} aria-valuemax={100}
                    aria-valuenow={Math.round(i.progres ?? 0)}>
                    <i style={{ width: `${Math.min(100, Math.max(0, i.progres ?? 0))}%` }} />
                  </div>
                  <dl className="imprimanta-cifre">
                    <dt>{t('imprimanta.progres')}</dt><dd data-testid="imprimanta-progres">{i.progres === null ? '—' : `${Math.round(i.progres)} %`}</dd>
                    <dt>{t('imprimanta.trecut')}</dt><dd>{i.trecut === null ? '—' : durata(i.trecut)}</dd>
                    <dt>{t('imprimanta.ramas')}</dt><dd data-testid="imprimanta-ramas">{i.ramas === null ? '—' : durata(i.ramas)}</dd>
                    {i.strat !== null && i.straturi !== null && i.straturi > 0 && (
                      <><dt>{t('imprimanta.strat')}</dt><dd>{t('imprimanta.strat.din', { strat: i.strat, straturi: i.straturi })}</dd></>
                    )}
                  </dl>
                </>
              )}
            {/* Viteza și debitul țin de lucrarea de acum: doar cât imprimă sau stă în pauză (ADR 0192 §B.9). */}
            {sePoateRegla(stare) && (cap.viteza !== null || cap.debit !== null) && (
              <div className="imprimanta-reglaje">
                {cap.viteza !== null && <RandProcent fel="viteza" iv={cap.viteza} raportat={i.viteza} legata={legata} cereri={cereri} />}
                {cap.debit !== null && <RandProcent fel="debit" iv={cap.debit} raportat={i.debit} legata={legata} cereri={cereri} />}
              </div>
            )}
          </section>
          <section className="imprimanta-card" aria-labelledby="imprimanta-de-la">
            <h3 id="imprimanta-de-la">{t('imprimanta.de-la')}</h3>
            {i.eroare === null
              ? <p className="imprimanta-slab">{t('imprimanta.fara-eroare')}</p>
              : (
                <div className="imprimanta-cod" data-testid="imprimanta-cod">
                  <strong>{t('imprimanta.eroare', { cod: i.eroare })}</strong>
                  <span>{t('imprimanta.eroare.text')}</span>
                </div>
              )}
          </section>
        </div>
        <Temperaturi st={st} cap={cap} stare={stare} legata={legata} cereri={cereri} raceste={raceste} />
        {(cap.lumina || cap.ventilatoare.length > 0 || cap.homing) && (
          <VentilatoareLumina st={st} cap={cap} stare={stare} legata={legata} cereri={cereri} homing={() => { setConfirmare({ fel: 'homing' }); }} />
        )}
        {cap.fisiere && (
          <Fisiere st={st} stare={stare} alege={alege} porneste={(f) => { setConfirmare({ fel: 'pornire', fisier: f }); }}
            dinDesen={dinDesen} trimitere={ales !== null} cuTrimitere={cap.trimitere} />
        )}
        <Jurnal st={st} />
      </div>
    </>
  );
}

/**
 * O valoare cerută imprimantei (ADR 0192 §C.13): se arată „în așteptare” până o raportează imprimanta; după `CONFIRMARE_MS` fără
 * ea, fereastra revine la valoarea raportată, cu „n-a confirmat” încă `NOTA_ESEC_MS`.
 */
type Cerere = { readonly v: number; readonly la: number; readonly esuata: boolean };
const CONFIRMARE_MS = 6000;
const NOTA_ESEC_MS = 8000;

type Cereri = {
  /** Ce se arată: valoarea cerută, cât așteaptă imprimanta; altfel cea raportată. */
  readonly afisat: (k: string, raportat: number | null) => number | null;
  readonly cerere: (k: string) => Cerere | undefined;
  /** Trimite comanda (`trimite`: a plecat?) și ține minte valoarea cerută, dacă nu e deja cea raportată. */
  readonly cere: (k: string, v: number, trimite: () => boolean) => void;
};

/** Valorile urmărite, cu cheile lor: lumina (1 / 0), ventilatoarele, viteza, debitul, țintele. */
const raportate = (i: ImprimantaCitita): Readonly<Record<string, number | null>> => ({
  lumina: i.lumina === null ? null : i.lumina ? 1 : 0,
  'vent:piesa': i.ventilatoare.piesa ?? null, 'vent:carcasa': i.ventilatoare.carcasa ?? null, 'vent:lateral': i.ventilatoare.lateral ?? null,
  viteza: i.viteza, debit: i.debit, 'tinta:duza': i.duzaTinta, 'tinta:pat': i.patTinta,
});

function useCereri(i: ImprimantaCitita): Cereri {
  const [m, setM] = useState<ReadonlyMap<string, Cerere>>(() => new Map());
  const r = useMemo(() => raportate(i), [i.lumina, i.ventilatoare, i.viteza, i.debit, i.duzaTinta, i.patTinta]);
  // Confirmată: imprimanta raportează valoarea cerută.
  useEffect(() => {
    setM((x) => {
      let n: Map<string, Cerere> | null = null;
      for (const [k, c] of x) {
        if (!c.esuata && r[k] === c.v) { n ??= new Map(x); n.delete(k); }
      }
      return n ?? x;
    });
  }, [r]);
  // Termenul cel mai apropiat: o cerere neconfirmată devine „n-a confirmat”, iar nota ei pleacă după o vreme.
  useEffect(() => {
    if (m.size === 0) return undefined;
    let urm = Number.POSITIVE_INFINITY;
    for (const c of m.values()) urm = Math.min(urm, c.la + CONFIRMARE_MS + (c.esuata ? NOTA_ESEC_MS : 0));
    const id = setTimeout(() => {
      const acum = Date.now();
      setM((x) => {
        const n = new Map<string, Cerere>();
        for (const [k, c] of x) {
          if (!c.esuata) n.set(k, acum >= c.la + CONFIRMARE_MS ? { ...c, esuata: true } : c);
          else if (acum < c.la + CONFIRMARE_MS + NOTA_ESEC_MS) n.set(k, c);
        }
        return n;
      });
    }, Math.max(0, urm - Date.now()));
    return () => { clearTimeout(id); };
  }, [m]);
  return {
    afisat: (k, raportat) => { const c = m.get(k); return c !== undefined && !c.esuata ? c.v : raportat; },
    cerere: (k) => m.get(k),
    cere: (k, v, trimite) => {
      if (!trimite()) return;
      setM((x) => {
        const n = new Map(x);
        if (r[k] === v) n.delete(k);
        else n.set(k, { v, la: Date.now(), esuata: false });
        return n;
      });
    },
  };
}

/** Starea unei cereri: „→ 120 % · așteaptă imprimanta” sau „imprimanta n-a confirmat”; nimic, fără cerere. */
function NotaCerere({ cerere, text }: { readonly cerere: Cerere | undefined; readonly text: (v: number) => string }): ReactNode {
  if (cerere === undefined) return null;
  return cerere.esuata
    ? <span className="imprimanta-neconfirmat" data-cerere="esuata">{t('imprimanta.cerere.esuata')}</span>
    : <span className="imprimanta-asteapta" data-cerere="asteapta">→ {text(cerere.v)} · {t('imprimanta.cerere.asteapta')}</span>;
}

/** Rândul de sus al unui reglaj: eticheta și valoarea, sau starea cererii. */
function AntetReglaj({ eticheta, cerere, valoare, text }: {
  readonly eticheta: string; readonly cerere: Cerere | undefined; readonly valoare: number | null; readonly text: (v: number) => string;
}): ReactNode {
  return (
    <span className="imprimanta-reglaj-sus">
      <span>{eticheta}</span>
      <span aria-live="polite">
        {cerere !== undefined
          ? <NotaCerere cerere={cerere} text={text} />
          : <span className="imprimanta-reglaj-val">{valoare === null ? '—' : text(valoare)}</span>}
      </span>
    </span>
  );
}

const procent = (v: number): string => `${Math.round(v)} %`;

/**
 * Glisorul și câmpul unui procent (viteza, debitul, un ventilator), ca proprietăți de pus pe intrări (`data-imprimanta` rămâne
 * scris la vedere, la fiecare intrare): glisorul trimite la eliberare, câmpul la Enter sau la ieșire; un număr greșit nu pleacă.
 */
function useReglaj(o: {
  readonly iv: Interval; readonly afisat: number | null; readonly trimite: (v: number) => void; readonly dezactivat: boolean; readonly eticheta: string;
}) {
  const [trag, setTrag] = useState<number | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [refuz, setRefuz] = useState(false);
  const gata = (): void => {
    if (trag === null) return;
    setTrag(null);
    if (trag !== o.afisat) o.trimite(trag);
  };
  const scris = (): void => {
    if (text === null) return;
    const x = text.trim() === '' ? Number.NaN : Number(text);
    if (intregIn(x, o.iv) === null) { setRefuz(true); return; }
    setText(null);
    setRefuz(false);
    if (x !== o.afisat) o.trimite(x);
  };
  const v = trag ?? o.afisat ?? o.iv.min;
  return {
    refuz,
    glisor: {
      type: 'range', min: o.iv.min, max: o.iv.max, step: 1, value: Math.min(o.iv.max, Math.max(o.iv.min, Math.round(v))), disabled: o.dezactivat,
      'aria-label': o.eticheta, onChange: (e: ChangeEvent<HTMLInputElement>) => { setTrag(Number(e.target.value)); },
      onPointerUp: gata, onKeyUp: gata, onBlur: gata,
    },
    camp: {
      type: 'number', inputMode: 'numeric', min: o.iv.min, max: o.iv.max, step: 1, disabled: o.dezactivat, className: 'imprimanta-camp-mic',
      value: text ?? (o.afisat === null ? '' : String(Math.round(o.afisat))), 'aria-label': t('imprimanta.reglaj.camp', { nume: o.eticheta }),
      'aria-invalid': refuz, onBlur: scris,
      onChange: (e: ChangeEvent<HTMLInputElement>) => { setText(e.target.value); setRefuz(false); },
      onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); scris(); } else if (e.key === 'Escape' && text !== null) { e.stopPropagation(); setText(null); setRefuz(false); }
      },
    },
  } as const;
}

/** Viteza sau debitul, cât imprimă (ADR 0192 §B.9): glisorul, câmpul și „100 %”. */
function RandProcent({ fel, iv, raportat, legata, cereri }: {
  readonly fel: 'viteza' | 'debit'; readonly iv: Interval; readonly raportat: number | null; readonly legata: boolean; readonly cereri: Cereri;
}): ReactNode {
  const afisat = cereri.afisat(fel, raportat);
  const trimite = (v: number): void => { cereri.cere(fel, v, () => sesiune.comanda({ fel, procent: v })); };
  const eticheta = fel === 'viteza' ? t('imprimanta.viteza') : t('imprimanta.debit');
  const r = useReglaj({ iv, afisat, trimite, dezactivat: !legata, eticheta });
  const sutaOprita = !legata || afisat === 100;
  return (
    <div className="imprimanta-reglaj" data-testid={`imprimanta-reglaj-${fel}`}>
      <AntetReglaj eticheta={eticheta} cerere={cereri.cerere(fel)} valoare={afisat} text={procent} />
      <span className="imprimanta-reglaj-jos imprimanta-reglaj-trei">
        {fel === 'viteza' ? <input {...r.glisor} data-imprimanta="viteza" /> : <input {...r.glisor} data-imprimanta="debit" />}
        {fel === 'viteza' ? <input {...r.camp} data-imprimanta="viteza-camp" /> : <input {...r.camp} data-imprimanta="debit-camp" />}
        {fel === 'viteza'
          ? <button type="button" data-imprimanta="viteza-suta" disabled={sutaOprita} onClick={() => { trimite(100); }}>{t('imprimanta.reglaj.suta')}</button>
          : <button type="button" data-imprimanta="debit-suta" disabled={sutaOprita} onClick={() => { trimite(100); }}>{t('imprimanta.reglaj.suta')}</button>}
      </span>
      {r.refuz && <span className="imprimanta-refuz" role="alert">{t('imprimanta.reglaj.refuz', { min: iv.min, max: iv.max })}</span>}
    </div>
  );
}

function Temperatura({ nume, v, tinta, id, camp, nota }: {
  readonly nume: string; readonly v: number | null; readonly tinta: number | null; readonly id: string; readonly camp?: ReactNode; readonly nota?: ReactNode;
}): ReactNode {
  const parte = v !== null && tinta !== null && tinta > 0 ? Math.min(100, Math.max(0, (v / tinta) * 100)) : null;
  return (
    <div className="imprimanta-temp">
      <span className="imprimanta-temp-rand">
        <span>{nume}</span>
        {camp === undefined
          ? <span data-testid={`imprimanta-temp-${id}`}><b>{grade(v)}</b>{tinta !== null && tinta > 0 ? ` / ${grade(tinta)}` : ''} °C</span>
          : <span className="imprimanta-temp-tinta" data-testid={`imprimanta-temp-${id}`}><b>{grade(v)}</b> / {camp} °C</span>}
      </span>
      {parte !== null && <span className="imprimanta-bara" aria-hidden="true"><i style={{ width: `${parte}%` }} /></span>}
      {nota}
    </div>
  );
}

/** Ținta unui încălzitor, scrisă direct (ADR 0192 §B.10): întregi între 0 și maximul imprimantei; pleacă la Enter sau la ieșire. */
function CampTinta({ inc, max, afisat, dezactivat, trimite, refuz, setRefuz }: {
  readonly inc: Incalzitor; readonly max: number; readonly afisat: number | null; readonly dezactivat: boolean; readonly trimite: (g: number) => void;
  readonly refuz: boolean; readonly setRefuz: (x: boolean) => void;
}): ReactNode {
  const [text, setText] = useState<string | null>(null);
  const scris = (): void => {
    if (text === null) return;
    const x = text.trim() === '' ? Number.NaN : Number(text);
    if (intregIn(x, { min: 0, max }) === null) { setRefuz(true); return; }
    setText(null);
    setRefuz(false);
    if (afisat === null || x !== Math.round(afisat)) trimite(x);
  };
  const p = {
    type: 'number', inputMode: 'numeric', min: 0, max, step: 1, disabled: dezactivat, className: 'imprimanta-camp-mic',
    value: text ?? (afisat === null ? '' : String(Math.round(afisat))), 'aria-label': t(`imprimanta.tinta.${inc}`), 'aria-invalid': refuz,
    onBlur: scris, onChange: (e: ChangeEvent<HTMLInputElement>) => { setText(e.target.value); setRefuz(false); },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); scris(); } else if (e.key === 'Escape' && text !== null) { e.stopPropagation(); setText(null); setRefuz(false); }
    },
  } as const;
  return inc === 'duza' ? <input {...p} data-imprimanta="tinta-duza" /> : <input {...p} data-imprimanta="tinta-pat" />;
}

/** Temperaturile primului strat ale unui material, tăiate la maximul imprimantei. */
const tintePentru = (m: Material, tinte: Capabilitati['tinte']): Readonly<Record<Incalzitor, number>> => {
  const max = (inc: Incalzitor): number => tinte.find((x) => x.incalzitor === inc)?.max ?? Number.POSITIVE_INFINITY;
  return { duza: Math.min(m.duza1, max('duza')), pat: Math.min(m.pat1, max('pat')) };
};

/** „Preîncălzește”: lista materialelor felierului (aceeași, nu o copie), cu temperaturile primului strat. */
function MeniuPreincalzire({ tinte, dezactivat, alege }: {
  readonly tinte: Capabilitati['tinte']; readonly dezactivat: boolean; readonly alege: (v: Readonly<Record<Incalzitor, number>>) => void;
}): ReactNode {
  const [deschis, setDeschis] = useState(false);
  const cutie = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!deschis) return undefined;
    cutie.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const afara = (e: PointerEvent): void => { if (!cutie.current?.contains(e.target as Node)) setDeschis(false); };
    document.addEventListener('pointerdown', afara);
    return () => { document.removeEventListener('pointerdown', afara); };
  }, [deschis]);
  const inchide = (): void => { setDeschis(false); cutie.current?.querySelector<HTMLElement>('[data-imprimanta="preincalzeste"]')?.focus(); };
  const tasta = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!deschis) return;
    if (e.key === 'Escape') { e.stopPropagation(); inchide(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const x = [...(cutie.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const k = x.indexOf(document.activeElement as HTMLElement);
    x[(k + (e.key === 'ArrowDown' ? 1 : x.length - 1)) % x.length]?.focus();
  };
  return (
    <div className="imprimanta-meniu" ref={cutie} onKeyDown={tasta}>
      <button type="button" className="principal" data-imprimanta="preincalzeste" aria-haspopup="menu" aria-expanded={deschis} disabled={dezactivat}
        onClick={() => { setDeschis((x) => !x); }}>{t('imprimanta.preincalzeste')}</button>
      {deschis && (
        <ul className="imprimanta-meniu-lista" role="menu" aria-label={t('imprimanta.preincalzeste.lista')}>
          {MATERIALE.map((m) => {
            const v = tintePentru(m, tinte);
            return (
              <li key={m.id} role="none">
                <button type="button" role="menuitem" data-imprimanta="preincalzeste-material" data-material={m.id}
                  onClick={() => { inchide(); alege(v); }}>
                  <span>{m.nume}</span><span className="imprimanta-slab">{v.duza} / {v.pat} °C</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Temperaturile (ADR 0192 §B.10, §D.15–§D.16): țintele scrise direct; cu imprimanta liberă, Preîncălzește, Răcește și răcirea singură. */
function Temperaturi({ st, cap, stare, legata, cereri, raceste }: {
  readonly st: StareImprimanta; readonly cap: Capabilitati; readonly stare: StareLucrare; readonly legata: boolean; readonly cereri: Cereri;
  readonly raceste: () => void;
}): ReactNode {
  const i = st.imprimanta;
  const libera = esteLibera(stare);
  const [refuzuri, setRefuzuri] = useState<Readonly<Partial<Record<Incalzitor, boolean>>>>({});
  const trimite = (inc: Incalzitor, g: number): void => {
    cereri.cere(`tinta:${inc}`, g, () => sesiune.comanda({ fel: 'tinta', incalzitor: inc, grade: g }));
  };
  const rand = (inc: Incalzitor, nume: string, v: number | null, raportat: number | null): ReactNode => {
    const c = cap.tinte.find((x) => x.incalzitor === inc);
    if (c === undefined) return <Temperatura nume={nume} v={v} tinta={raportat} id={inc} />;
    const k = `tinta:${inc}`;
    const afisat = cereri.afisat(k, raportat);
    const cerere = cereri.cerere(k);
    const refuz = refuzuri[inc] === true;
    return (
      <Temperatura nume={nume} v={v} tinta={afisat} id={inc}
        camp={<CampTinta inc={inc} max={c.max} afisat={afisat} dezactivat={!legata} trimite={(g) => { trimite(inc, g); }} refuz={refuz}
          setRefuz={(x) => { setRefuzuri((r) => ({ ...r, [inc]: x })); }} />}
        nota={refuz
          ? <span className="imprimanta-refuz" role="alert">{t('imprimanta.tinta.refuz', { max: c.max })}</span>
          : <span className="imprimanta-temp-nota" aria-live="polite"><NotaCerere cerere={cerere} text={(x) => `${x} °C`} /></span>} />
    );
  };
  const calde = cap.tinte.some((x) => ((x.incalzitor === 'duza' ? i.duzaTinta : i.patTinta) ?? 0) > 0);
  return (
    <section className="imprimanta-card" aria-labelledby="imprimanta-temperaturi" data-testid="imprimanta-temperaturi">
      <h3 id="imprimanta-temperaturi">{t('imprimanta.temperaturi')}</h3>
      {rand('duza', t('imprimanta.duza'), i.duza, i.duzaTinta)}
      {rand('pat', t('imprimanta.pat'), i.pat, i.patTinta)}
      <Temperatura nume={t('imprimanta.carcasa')} v={i.carcasa} tinta={null} id="carcasa" />
      {cap.tinte.length > 0 && (libera
        ? (
          <>
            <div className="imprimanta-butoane">
              <MeniuPreincalzire tinte={cap.tinte} dezactivat={!legata}
                alege={(v) => { for (const x of cap.tinte) trimite(x.incalzitor, v[x.incalzitor]); }} />
              <button type="button" data-imprimanta="raceste" disabled={!legata || !calde} onClick={raceste}>{t('imprimanta.raceste')}</button>
            </div>
            <Racire st={st} />
          </>
        )
        : <p className="imprimanta-ajutor">{t('imprimanta.tinte.fisierul')}</p>)}
    </section>
  );
}

/** Răcirea singură (ADR 0192 §D.16): bifa și minutele, ținute în browser; când pleacă, sau când a plecat. */
function Racire({ st }: { readonly st: StareImprimanta }): ReactNode {
  const [setare, setSetare] = useState<SetareRacire>(citesteRacire);
  const [text, setText] = useState<string | null>(null);
  const [refuz, setRefuz] = useState(false);
  const schimba = (r: SetareRacire): void => {
    setSetare(r);
    scrieRacire(r);
    sesiune.seteazaRacire(r.pornita ? r.minute : null);
  };
  const scris = (): void => {
    if (text === null) return;
    const x = text.trim() === '' ? Number.NaN : Number(text);
    if (intregIn(x, MINUTE_RACIRE) === null) { setRefuz(true); return; }
    setText(null);
    setRefuz(false);
    if (x !== setare.minute) schimba({ ...setare, minute: x });
  };
  return (
    <div className="imprimanta-racire">
      <div className="imprimanta-racire-rand">
        <input type="checkbox" id="imprimanta-racire" data-imprimanta="racire" checked={setare.pornita}
          onChange={(e) => { schimba({ ...setare, pornita: e.target.checked }); }} />
        <label htmlFor="imprimanta-racire">{t('imprimanta.racire.bifa')}</label>
        <input type="number" inputMode="numeric" className="imprimanta-camp-mic" data-imprimanta="racire-minute" min={MINUTE_RACIRE.min} max={MINUTE_RACIRE.max}
          step={1} value={text ?? String(setare.minute)} disabled={!setare.pornita} aria-label={t('imprimanta.racire.minute.camp')} aria-invalid={refuz}
          onChange={(e) => { setText(e.target.value); setRefuz(false); }} onBlur={scris}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); scris(); } }} />
        <span>{t('imprimanta.racire.minute')}</span>
      </div>
      {refuz && <p className="imprimanta-refuz" role="alert">{t('imprimanta.racire.refuz', { min: MINUTE_RACIRE.min, max: MINUTE_RACIRE.max })}</p>}
      {st.racireLa !== null && <p className="imprimanta-ajutor" data-testid="imprimanta-racire-la">{t('imprimanta.racire.la', { ora: ora(st.racireLa) })}</p>}
      {st.racireLa === null && st.racitaLa !== null && (
        <p className="imprimanta-ajutor" data-testid="imprimanta-racita">{t('imprimanta.racire.facuta', { ora: ora(st.racitaLa) })}</p>
      )}
    </div>
  );
}

/** Un ventilator (ADR 0192 §B.8): 0–100 %, glisorul și câmpul. */
function RandVentilator({ id, raportat, legata, cereri }: {
  readonly id: IdVentilator; readonly raportat: number | null; readonly legata: boolean; readonly cereri: Cereri;
}): ReactNode {
  const k = `vent:${id}`;
  const afisat = cereri.afisat(k, raportat);
  const r = useReglaj({
    iv: { min: 0, max: 100 }, afisat, dezactivat: !legata, eticheta: t(`imprimanta.vent.${id}.nume`),
    trimite: (v) => { cereri.cere(k, v, () => sesiune.comanda({ fel: 'ventilator', id, procent: v })); },
  });
  return (
    <div className="imprimanta-reglaj" data-testid={`imprimanta-vent-${id}`}>
      <AntetReglaj eticheta={t(`imprimanta.vent.${id}`)} cerere={cereri.cerere(k)} valoare={afisat} text={procent} />
      <span className="imprimanta-reglaj-jos">
        <input {...r.glisor} data-imprimanta="ventilator" data-ventilator={id} />
        <input {...r.camp} data-imprimanta="ventilator-camp" data-ventilator={id} />
      </span>
      {r.refuz && <span className="imprimanta-refuz" role="alert">{t('imprimanta.reglaj.refuz', { min: 0, max: 100 })}</span>}
    </div>
  );
}

/** Lumina, ventilatoarele și homing-ul (ADR 0192 §B.7, §B.8, §B.11), după ce are imprimanta. */
function VentilatoareLumina({ st, cap, stare, legata, cereri, homing }: {
  readonly st: StareImprimanta; readonly cap: Capabilitati; readonly stare: StareLucrare; readonly legata: boolean; readonly cereri: Cereri;
  readonly homing: () => void;
}): ReactNode {
  const i = st.imprimanta;
  const lumina = cereri.afisat('lumina', i.lumina === null ? null : i.lumina ? 1 : 0);
  const cerereLumina = cereri.cerere('lumina');
  const libera = esteLibera(stare);
  const axe = st.secventa === 'homing' ? t('imprimanta.homing.in-curs')
    : !libera ? t('imprimanta.homing.libera')
      : i.axe ? t('imprimanta.homing.axe', { axe: i.axe.split('').join(', ') }) : t('imprimanta.homing.axe.niciuna');
  return (
    <section className="imprimanta-card imprimanta-ventilatoare" aria-labelledby="imprimanta-ventilatoare" data-testid="imprimanta-ventilatoare">
      <h3 id="imprimanta-ventilatoare">{t('imprimanta.ventilatoare')}</h3>
      {cap.lumina && (
        <div className="imprimanta-lumina">
          <span id="imprimanta-lumina-eticheta">{t('imprimanta.lumina')}</span>
          <span className="imprimanta-lumina-stare">
            <span aria-live="polite">
              <NotaCerere cerere={cerereLumina} text={(x) => (x === 1 ? t('imprimanta.lumina.aprinsa') : t('imprimanta.lumina.stinsa'))} />
            </span>
            <button type="button" role="switch" className="imprimanta-comutator" data-imprimanta="lumina" aria-checked={lumina === 1}
              aria-labelledby="imprimanta-lumina-eticheta" disabled={!legata}
              onClick={() => { const v = lumina === 1 ? 0 : 1; cereri.cere('lumina', v, () => sesiune.comanda({ fel: 'lumina', aprinsa: v === 1 })); }}>
              <i aria-hidden="true" />{lumina === 1 ? t('imprimanta.lumina.aprinsa') : t('imprimanta.lumina.stinsa')}
            </button>
          </span>
        </div>
      )}
      {cap.ventilatoare.map((id) => <RandVentilator key={id} id={id} raportat={i.ventilatoare[id] ?? null} legata={legata} cereri={cereri} />)}
      {cap.ventilatoare.length > 0 && !libera && <p className="imprimanta-ajutor">{t('imprimanta.ventilatoare.fisierul')}</p>}
      {cap.homing && (
        <div className="imprimanta-homing">
          <button type="button" data-imprimanta="homing" disabled={!legata || !libera || st.secventa !== null || i.ocupata === true} onClick={homing}>
            {t('imprimanta.homing')}
          </button>
          <span className="imprimanta-ajutor" data-testid="imprimanta-axe">{axe}</span>
        </div>
      )}
    </section>
  );
}

/** `cuTrimitere`: imprimanta primește fișiere de la calculator (capabilitatea `trimitere` a driverului). */
function Fisiere({ st, stare, alege, porneste, dinDesen, trimitere, cuTrimitere }: {
  readonly st: StareImprimanta; readonly stare: StareLucrare; readonly alege: () => void; readonly porneste: (f: FisierImprimanta) => void;
  readonly dinDesen: ((el: HTMLElement) => void) | null; readonly trimitere: boolean; readonly cuTrimitere: boolean;
}): ReactNode {
  const legata = st.legatura === 'conectat';
  const libera = sePoatePorni(stare);
  return (
    <section className="imprimanta-card imprimanta-lat" aria-labelledby="imprimanta-fisiere" data-testid="imprimanta-fisiere">
      <h3 id="imprimanta-fisiere">{t('imprimanta.fisiere')}</h3>
      {st.fisiere === null
        ? <p className="imprimanta-slab">{t('imprimanta.fisiere.asteapta')}</p>
        : st.fisiere.length === 0
          ? <p className="imprimanta-slab">{t('imprimanta.fisiere.niciunul')}</p>
          : (
            <ul className="imprimanta-lista">
              {st.fisiere.map((f) => (
                <li key={f.cale}>
                  <span className="imprimanta-lista-nume">{f.nume}</span>
                  <span className="imprimanta-slab">{[f.material, f.timp === null ? null : durata(f.timp), f.marime === null ? null : marimeText(f.marime)].filter((x) => x !== null).join(' · ')}</span>
                  <button type="button" data-imprimanta="porneste" disabled={!legata || !libera} onClick={() => { porneste(f); }}>{t('imprimanta.porneste')}</button>
                </li>
              ))}
            </ul>
          )}
      {!libera && st.fisiere !== null && st.fisiere.length > 0 && <p className="imprimanta-ajutor">{t('imprimanta.porneste.ocupata')}</p>}
      <div className="imprimanta-butoane">
        {cuTrimitere && <button type="button" data-imprimanta="trimite" disabled={!legata || st.fisiere === null} onClick={alege}>{t('imprimanta.trimite')}</button>}
        {/* Cât o trimitere e deschisă (sau în curs), „Din desen…” așteaptă: nu o oprește pe aceea. */}
        {dinDesen !== null && <button type="button" data-imprimanta="din-desen" disabled={trimitere} onClick={(e) => { dinDesen(e.currentTarget); }}>{t('imprimanta.felie.din-desen')}</button>}
        <button type="button" data-imprimanta="fisiere-reimprospateaza" disabled={!legata} onClick={() => { sesiune.reimprospateaza(); }}>{t('imprimanta.fisiere.reimprospateaza')}</button>
      </div>
      {cuTrimitere && <p className="imprimanta-ajutor">{t('imprimanta.trimite.ajutor')}</p>}
      {dinDesen !== null && <p className="imprimanta-ajutor">{t('imprimanta.felie.din-desen.ajutor')}</p>}
    </section>
  );
}

/** Pașii trimiterii unui fișier (ADR 0190 §D, schița, secțiunea E): verificarea pe calculator, trimiterea, rezultatul. */
type PasTrimitere =
  | { readonly fel: 'citeste' }
  | { readonly fel: 'gata' | 'trimite'; readonly a: AnalizaGcode }
  | { readonly fel: 'esec'; readonly a: AnalizaGcode | null; readonly motiv: MotivUrcare | 'citire' }
  | { readonly fel: 'ajuns'; readonly f: FisierImprimanta };

/** Numele unei imprimante, de comparat („Creality K1C” îl conține pe „K1C”). */
const simplu = (s: string): string => s.toLowerCase().replace(/[\s_-]/g, '');

function DialogTrimitere({ fisier, st, stare, alt, inchide, porneste }: {
  readonly fisier: File; readonly st: StareImprimanta; readonly stare: StareLucrare; readonly alt: () => void; readonly inchide: () => void;
  readonly porneste: (f: FisierImprimanta) => void;
}): ReactNode {
  const legata = st.legatura === 'conectat';
  const model = st.imprimanta.model;
  // Numele, ales o dată, față de lista de la alegere: un fișier din imprimantă nu se înlocuiește.
  const [nume] = useState(() => numeDeTrimis(fisier.name, (st.fisiere ?? []).map((x) => x.nume)));
  const [pas, setPas] = useState<PasTrimitere>({ fel: 'citeste' });
  const [pat] = useState(() => patPentru(model));
  const oprire = useRef<AbortController | null>(null);
  const cutie = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const c = new AbortController();
    oprire.current = c;
    if (nume !== null) {
      analizeazaFisier(fisier, pat, c.signal).then(
        (a) => { if (!c.signal.aborted) setPas({ fel: 'gata', a }); },
        () => { if (!c.signal.aborted) setPas({ fel: 'esec', a: null, motiv: 'citire' }); },
      );
    }
    return () => { oprire.current?.abort(); };
  }, [fisier, nume, pat]);
  // Focusul, pe butonul fără urmări al fiecărui pas (Renunță sau Închide), ca la celelalte confirmări.
  useEffect(() => { cutie.current?.querySelector<HTMLElement>('.imprimanta-butoane button:last-child')?.focus(); }, [pas.fel]);
  const trimite = (a: AnalizaGcode): void => {
    const adresa = st.adresa;
    if (adresa === null || nume === null) return;
    const c = new AbortController();
    oprire.current = c;
    setPas({ fel: 'trimite', a });
    urca({ adresa, nume, date: fisier, lista: sesiune, semnal: c.signal }).then(
      (r) => { if (!c.signal.aborted) setPas(r.ok ? { fel: 'ajuns', f: r.fisier } : { fel: 'esec', a, motiv: r.motiv }); },
      () => undefined,
    );
  };
  const renunta = (): void => { oprire.current?.abort(); inchide(); };
  const a = pas.fel === 'gata' || pas.fel === 'trimite' || pas.fel === 'esec' ? pas.a : null;
  const avert: string[] = [];
  if (a !== null) {
    const e = a.iesire;
    if (e !== null) {
      avert.push(t(e.valoare < 0 ? 'imprimanta.trimite.iesire.sub' : 'imprimanta.trimite.iesire.peste',
        { linie: e.linie, text: e.text, axa: e.axa, limita: pat['XYZ'.indexOf(e.axa)] ?? 0 }));
    }
    if (a.imprimanta !== null && model !== null && !simplu(a.imprimanta).includes(simplu(model))) {
      avert.push(t('imprimanta.trimite.alta', { feliat: a.imprimanta, model }));
    }
    if (a.miscari === 0) avert.push(t('imprimanta.trimite.fara-miscari'));
  }
  const despre = a === null ? '' : [
    a.imprimanta === null ? null
      : t('imprimanta.trimite.feliat', { imprimanta: a.imprimanta }) + (a.duza === null ? '' : ` (${t('imprimanta.trimite.duza', { d: a.duza.toLocaleString(loc()) })})`),
    a.material,
    a.tDuza === null && a.tPat === null ? null : `${grade(a.tDuza)} / ${grade(a.tPat)} °C`,
    a.timp === null ? null : `~${durata(a.timp)}`,
  ].filter((x) => x !== null).join(' · ');
  const marime = marimeText(fisier.size);
  return (
    <div className="imprimanta-dialog" role="dialog" aria-labelledby="imprimanta-trimite-titlu" data-testid="imprimanta-trimite" data-pas={pas.fel}
      ref={cutie} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); renunta(); } }}>
      <h3 id="imprimanta-trimite-titlu">{t('imprimanta.trimite.titlu')}</h3>
      <p className="imprimanta-trimite-fisier">
        <strong data-testid="imprimanta-trimite-nume">{fisier.name}</strong>
        <span className="imprimanta-slab">{marime}</span>
        {(nume === null || pas.fel === 'gata' || pas.fel === 'esec') && <button type="button" data-imprimanta="trimite-alt" onClick={alt}>{t('imprimanta.trimite.alt')}</button>}
      </p>
      {nume === null && <p className="imprimanta-refuz" role="alert" data-testid="imprimanta-trimite-refuz">{t('imprimanta.trimite.refuz')}</p>}
      {nume !== null && pas.fel === 'citeste' && <p role="status">{t('imprimanta.trimite.citeste')}</p>}
      {a !== null && (
        <div className="imprimanta-trimite-despre">
          {a.miniatura !== null && <img className="imprimanta-miniatura" src={`data:image/png;base64,${a.miniatura}`} alt={t('imprimanta.trimite.miniatura')} />}
          <div>
            {despre !== '' && <p data-testid="imprimanta-trimite-despre">{avert.length === 0 ? '✓ ' : ''}{despre}</p>}
            {a.iesire === null && a.miscari > 0 && <p className="imprimanta-slab" data-testid="imprimanta-trimite-incape">{t('imprimanta.trimite.incape', { x: pat[0], y: pat[1], z: pat[2] })}</p>}
          </div>
        </div>
      )}
      {avert.length > 0 && <ul className="imprimanta-avert" data-testid="imprimanta-trimite-avert">{avert.map((x) => <li key={x}>{x}</li>)}</ul>}
      {nume !== null && nume !== fisier.name && <p className="imprimanta-ajutor" data-testid="imprimanta-trimite-nume-nou">{t('imprimanta.trimite.nume-nou', { nume })}</p>}
      {pas.fel === 'trimite' && <p role="status" data-testid="imprimanta-trimite-progres">{t('imprimanta.trimite.se-trimite', { nume: nume ?? '', marime })}</p>}
      {pas.fel === 'esec' && <p className="imprimanta-refuz" role="alert" data-testid="imprimanta-trimite-motiv" data-motiv={pas.motiv}>{t(`imprimanta.trimite.motiv.${pas.motiv}`)}</p>}
      {pas.fel === 'ajuns' && (
        <p role="status" data-testid="imprimanta-trimite-ajuns">{pas.f.marime === null
          ? t('imprimanta.trimite.ajuns', { nume: pas.f.nume })
          : t('imprimanta.trimite.ajuns-marime', { nume: pas.f.nume, octeti: pas.f.marime.toLocaleString(loc()) })}</p>
      )}
      <div className="imprimanta-butoane">
        {pas.fel === 'gata' && (avert.length === 0
          ? <button type="button" className="principal" data-imprimanta="trimite-confirma" disabled={!legata} onClick={() => { trimite(pas.a); }}>{t('imprimanta.trimite.confirma')}</button>
          : <button type="button" className="principal" data-imprimanta="trimite-oricum" disabled={!legata} onClick={() => { trimite(pas.a); }}>{t('imprimanta.trimite.oricum')}</button>)}
        {pas.fel === 'esec' && pas.a !== null && (
          <button type="button" className="principal" data-imprimanta="trimite-reia" disabled={!legata} onClick={() => { if (pas.a) trimite(pas.a); }}>{t('imprimanta.trimite.reia')}</button>
        )}
        {pas.fel === 'ajuns'
          ? (
            <>
              <button type="button" className="principal" data-imprimanta="trimite-porneste" disabled={!legata || !sePoatePorni(stare)}
                onClick={() => { porneste(pas.f); }}>{t('imprimanta.trimite.porneste')}</button>
              <button type="button" data-imprimanta="trimite-inchide" onClick={inchide}>{t('imprimanta.trimite.inchide')}</button>
            </>
          )
          : <button type="button" data-imprimanta="trimite-renunta" onClick={renunta}>{t('imprimanta.trimite.renunta')}</button>}
      </div>
    </div>
  );
}

function DialogConfirmare({ c, confirma, renunta }: { readonly c: Confirmare; readonly confirma: () => void; readonly renunta: () => void }): ReactNode {
  const [patGol, setPatGol] = useState(false);
  const primul = useRef<HTMLElement | null>(null);
  useEffect(() => { primul.current?.focus(); }, []);
  const tasta = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') { e.stopPropagation(); renunta(); }
  };
  if (c.fel === 'oprire') {
    return (
      <div className="imprimanta-dialog" role="alertdialog" aria-labelledby="imprimanta-oprire-titlu" aria-describedby="imprimanta-oprire-text"
        data-testid="imprimanta-oprire" onKeyDown={tasta}>
        <h3 id="imprimanta-oprire-titlu">{t('imprimanta.oprire.titlu')}</h3>
        <p id="imprimanta-oprire-text">{t('imprimanta.oprire.text')}</p>
        <div className="imprimanta-butoane">
          <button type="button" className="imprimanta-opreste plin" data-imprimanta="oprire-confirma" onClick={confirma}>{t('imprimanta.oprire.confirma')}</button>
          <button type="button" data-imprimanta="oprire-renunta" ref={(b) => { primul.current = b; }} onClick={renunta}>{t('imprimanta.oprire.renunta')}</button>
        </div>
      </div>
    );
  }
  if (c.fel === 'homing') {
    // Homing-ul (ADR 0192 §B.11): la Z, duza coboară spre pat; doar după bifa „Patul e gol”, ca pornirea.
    return (
      <div className="imprimanta-dialog" role="alertdialog" aria-labelledby="imprimanta-homing-titlu" aria-describedby="imprimanta-homing-text"
        data-testid="imprimanta-homing" onKeyDown={tasta}>
        <h3 id="imprimanta-homing-titlu">{t('imprimanta.homing.titlu')}</h3>
        <p id="imprimanta-homing-text">{t('imprimanta.homing.text')}</p>
        <label className="imprimanta-bifa">
          <input type="checkbox" data-imprimanta="homing-pat-gol" checked={patGol} ref={(x) => { primul.current = x; }}
            onChange={(e) => { setPatGol(e.target.checked); }} />
          <span>{t('imprimanta.pornire.pat-gol')}</span>
        </label>
        <div className="imprimanta-butoane">
          <button type="button" className="principal" data-imprimanta="homing-confirma" disabled={!patGol} onClick={confirma}>{t('imprimanta.homing.confirma')}</button>
          <button type="button" data-imprimanta="homing-renunta" onClick={renunta}>{t('imprimanta.homing.renunta')}</button>
        </div>
      </div>
    );
  }
  const f = c.fisier;
  return (
    <div className="imprimanta-dialog" role="alertdialog" aria-labelledby="imprimanta-pornire-titlu" data-testid="imprimanta-pornire" onKeyDown={tasta}>
      <h3 id="imprimanta-pornire-titlu">{t('imprimanta.pornire.titlu')}</h3>
      <dl className="imprimanta-cifre">
        <dt>{t('imprimanta.pornire.fisier')}</dt><dd data-testid="imprimanta-pornire-fisier">{f.nume}</dd>
        {f.material !== null && <><dt>{t('imprimanta.pornire.material')}</dt><dd>{f.material}</dd></>}
        {f.timp !== null && <><dt>{t('imprimanta.pornire.timp')}</dt><dd>{durata(f.timp)}</dd></>}
      </dl>
      <label className="imprimanta-bifa">
        <input type="checkbox" data-imprimanta="pat-gol" checked={patGol} ref={(x) => { primul.current = x; }}
          onChange={(e) => { setPatGol(e.target.checked); }} />
        <span>{t('imprimanta.pornire.pat-gol')}</span>
      </label>
      <p className="imprimanta-ajutor">{t('imprimanta.pornire.nota')}</p>
      <div className="imprimanta-butoane">
        <button type="button" className="principal" data-imprimanta="pornire-confirma" disabled={!patGol} onClick={confirma}>{t('imprimanta.pornire.confirma')}</button>
        <button type="button" data-imprimanta="pornire-renunta" onClick={renunta}>{t('imprimanta.pornire.renunta')}</button>
      </div>
    </div>
  );
}

function Jurnal({ st }: { readonly st: StareImprimanta }): ReactNode {
  const [mesaj, setMesaj] = useState<string | null>(null);
  const zona = useRef<HTMLTextAreaElement | null>(null);
  const [arata, setArata] = useState(false);
  const sageata = (d: LinieJurnal['dir']): string => (d === 'trimis' ? '→' : d === 'primit' ? '←' : '·');
  const text = (): string => st.jurnal.map((l) => `${new Date(l.la).toISOString()} ${sageata(l.dir)} ${l.text}`).join('\n');
  const copiaza = (): void => {
    const tot = text();
    const selecteaza = (): void => {
      setArata(true);
      setMesaj(t('imprimanta.jurnal.selectat'));
      setTimeout(() => { if (zona.current) { zona.current.value = tot; zona.current.focus(); zona.current.select(); } }, 0);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(tot).then(() => { setMesaj(t('imprimanta.jurnal.copiat')); }, selecteaza);
    } else selecteaza();
  };
  // Pe ecran, fără bătăile inimii și `ok`-urile lor (numărate dedesubt); copia le păstrează, cu ora fiecărui cadru.
  const esteInima = (x: string): boolean => x === 'ok' || x.includes('"heart_beat"');
  // K1C 2025 n-are bătăi ale inimii, dar trimite la ~3 s o bucată fără nimic nou: tot zgomot, pe ecran (3.6i).
  const esteRepaus = (x: string): boolean => /^\{"maxBedTemp":\d+\}$/.test(x);
  const randuri = st.jurnal.map((l, k) => ({ l, k })).filter((x) => !esteInima(x.l.text) && !esteRepaus(x.l.text));
  const ultimele = randuri.slice(-40);
  const inimi = st.jurnal.filter((l) => l.dir === 'primit' && l.text.includes('"heart_beat"')).length;
  const repaus = st.jurnal.filter((l) => l.dir === 'primit' && esteRepaus(l.text)).length;
  return (
    <section className="imprimanta-card imprimanta-lat" aria-labelledby="imprimanta-jurnal">
      <h3 id="imprimanta-jurnal">{t('imprimanta.jurnal')}</h3>
      <p className="imprimanta-ajutor">{t('imprimanta.jurnal.ajutor')}</p>
      <ol className="imprimanta-jurnal" data-testid="imprimanta-jurnal">
        {ultimele.map(({ l, k }) => <li key={k} data-dir={l.dir}>{sageata(l.dir)} {l.text}</li>)}
      </ol>
      {inimi > 0 && <p className="imprimanta-ajutor" data-testid="imprimanta-inimi">{t('imprimanta.jurnal.inimi', { n: inimi })}</p>}
      {repaus > 0 && <p className="imprimanta-ajutor" data-testid="imprimanta-repaus">{t('imprimanta.jurnal.repaus', { n: repaus })}</p>}
      <div className="imprimanta-butoane">
        <button type="button" data-imprimanta="jurnal-copiaza" disabled={st.jurnal.length === 0} onClick={copiaza}>{t('imprimanta.jurnal.copiaza')}</button>
        {mesaj !== null && <span className="imprimanta-slab" role="status">{mesaj}</span>}
      </div>
      {arata && <textarea ref={zona} className="imprimanta-copie" readOnly aria-label={t('imprimanta.jurnal')} />}
    </section>
  );
}
