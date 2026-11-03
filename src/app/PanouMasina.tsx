/**
 * Panoul mașinii (ADR 0081, felia 3.6b): conexiunea (portul Web Serial; pe instanța de test și mașina simulată), starea din
 * rapoarte, programul (ultimul export, exact octeții lui, sau un fișier străin, verificat), lucrarea (faza, linia, erorile) cu
 * butoanele ei, comenzile manuale și jurnalul. Sesiunea (`src/machine/sesiune.ts`) e una pe pagină: rămâne conectată și cu
 * panoul strâns. Tot ce trimite la mașină trece prin fluxul senderului (ADR 0080); panoul doar arată și cere.
 *
 * Poziționarea (ADR 0082, felia 3.7a): jog-ul (pași de 0,1–100 mm, diagonalele într-o singură mișcare), WCS-ul activ (G54–G59),
 * zero-ul XY / Z și palparea Z cu placa de contact. Zero-ul și palparea se scriu în WCS-ul programului încărcat (altfel în cel
 * activ), cu numele lui pe buton; nepotrivirea cu WCS-ul activ se spune; lângă zero stă Z0-ul declarat de program (lecțiile
 * ediției întâi). Un buton care nu se poate folosi acum e dezactivat, cu motivul alături.
 *
 * Codurile controlerului (ADR 0085, felia 3.6c): ultimul `error:N` / `ALARM:N` se explică într-un card sub stare (`PanouCod`),
 * din tabelul familiei controlerului; lista erorilor și jurnalul își arată titlul. Deblocarea după o alarmă care pierde
 * poziția cere confirmarea, și de pe butonul lucrării.
 *
 * Legătura prin WiFi (ADR 0119, felia 3.6d): „Conectează (WiFi)” cere controlerul, adresa (un IP local sau un nume `.local`,
 * judecată înainte de conectare) și portul, ținute în browser; prima pornire a unui program prin WiFi, în pagina asta, spune
 * întâi ce se întâmplă dacă legătura cade.
 *
 * Fereastra pe tot ecranul (ADR 0132, felia 13.A↑): același conținut, sub meniul global, pe coloane (mașina, lucrarea,
 * consola; una pe telefon, în ordinea urgenței). De aici vin și indicatorul lucrării din meniu, titlul filei, confirmarea
 * browserului la închiderea paginii cu o lucrare pornită și „Deschide în Mașina” din fereastra exportului.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { ActiuneCod } from '../../shared/coduri.ts';
import '../i18n/masina.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { PALPARE_IMPLICITA, WCS, esteWcs, type AxaJog, type FelMiscare, type Wcs } from '../machine/proceduri.ts';
import { lucrareInceputa } from '../machine/indicator.ts';
import { incarcaProgram, montajDeclarat, sculaLaOprire, type RezultatIncarcare } from '../machine/program.ts';
import { pozitieDeLucru } from '../machine/raspunsuri.ts';
import { deschideSerial, serialDisponibil } from '../machine/serial.ts';
import { SesiuneMasina, type Ceas, type LinieJurnal, type Procedura, type StareSesiune } from '../machine/sesiune.ts';
import { adresaRetea, deschideRetea, esteProfilRetea, PROFIL_RETEA, PROFILURI_RETEA, type ProfilRetea } from '../machine/websocket.ts';
import { useLimba } from '../ui/useLimba.ts';
import { ConfirmareMasina, type CerereConfirmare } from './ConfirmareMasina.tsx';
import { contulPermite, useContTinut } from './dreptCont.ts';
import { IndicatorLucrare } from './IndicatorLucrare.tsx';
import { lucrarePornita, masinaPentruExtensii } from './lucrare.ts';
import { invelisMasina } from './masinaExtensii.ts';
import { CardCod, ConfirmareDeblocare, cuTitlu, deblocareCuConfirmare, titluCod, useDictionarCoduri, type StareDictionar } from './PanouCod.tsx';
import type { LucrarePrimita } from './primireLucrare.ts';
import './masina.css';
import { mesajeGata } from '../i18n/laCerere.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Programul ultimului export (octeții exacți și amprenta lor), dat de carcasă. */
export type ExportPentruMasina = { readonly octeti: Uint8Array; readonly sha256: string; readonly nume: string };

const CEAS: Ceas = {
  setInterval: (f, ms) => window.setInterval(f, ms),
  clearInterval: (id) => { window.clearInterval(id as number); },
  setTimeout: (f, ms) => window.setTimeout(f, ms),
};
let comuna: SesiuneMasina | null = null;
/** Sesiunea paginii: una singură, creată la prima deschidere a panoului. */
function sesiunea(): SesiuneMasina {
  comuna ??= new SesiuneMasina(CEAS);
  return comuna;
}
/** Adresa controlerului legat prin WiFi (gazda:portul), pentru starea conexiunii; ca sesiunea, rămâne peste panoul strâns. */
let adresaConectata: string | null = null;
/** Avertismentul căderii WiFi-ului s-a arătat (și s-a trecut) în pagina asta. */
let avertizatWifi = false;

/**
 * Cu o lucrare pornită, închiderea sau reîncărcarea paginii ar tăia legătura la mijlocul ei (ADR 0132 §6): browserul întreabă
 * întâi, cu textul lui (pagina nu-și poate scrie mesajul).
 */
const intreabaLaIesire = (e: BeforeUnloadEvent): void => {
  e.preventDefault();
  e.returnValue = '';
};

/** Alegerile legăturii prin WiFi, ținute în browser (`v: 1`): controlerul, adresa scrisă, portul. */
const CHEIE_RETEA = 'cncvs2.masina.retea';
type AlegeriRetea = { readonly profil: ProfilRetea; readonly adresa: string; readonly port: string };
function alegeriTinute(): AlegeriRetea {
  try {
    const x: unknown = JSON.parse(localStorage.getItem(CHEIE_RETEA) ?? 'null');
    const d = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
    const profil = d['profil'];
    const adresa = d['adresa'];
    const port = d['port'];
    if (d['v'] === 1 && esteProfilRetea(profil) && typeof adresa === 'string' && typeof port === 'number') return { profil, adresa, port: String(port) };
  } catch {
    // Stocarea lipsă sau stricată: implicitele.
  }
  return { profil: 'fluidnc', adresa: '', port: String(PROFIL_RETEA.fluidnc.port) };
}
function tineAlegeri(profil: ProfilRetea, adresa: string, port: number): void {
  try {
    localStorage.setItem(CHEIE_RETEA, JSON.stringify({ v: 1, profil, adresa, port }));
  } catch {
    // Fără stocare, alegerile nu se țin: legătura merge.
  }
}

const AXE = ['X', 'Y', 'Z', 'A', 'B', 'C'];
const VITEZE = [1, 10, 100] as const;
const IN_FLUX = new Set(['trimite', 'golire', 'terminare']);
const PASI_JOG = [0.1, 1, 10, 100] as const;
/** Butoanele jog-ului, pe o grilă 4 × 3: XY cu diagonalele (o singură mișcare), Z în dreapta; null e o celulă goală. */
const DIRECTII: readonly ({ readonly id: string; readonly simbol: string; readonly d: Partial<Record<AxaJog, number>> } | null)[] = [
  { id: 'X-Y+', simbol: '↖', d: { X: -1, Y: 1 } }, { id: 'Y+', simbol: '↑', d: { Y: 1 } }, { id: 'X+Y+', simbol: '↗', d: { X: 1, Y: 1 } }, { id: 'Z+', simbol: 'Z+', d: { Z: 1 } },
  { id: 'X-', simbol: '←', d: { X: -1 } }, null, { id: 'X+', simbol: '→', d: { X: 1 } }, null,
  { id: 'X-Y-', simbol: '↙', d: { X: -1, Y: -1 } }, { id: 'Y-', simbol: '↓', d: { Y: -1 } }, { id: 'X+Y-', simbol: '↘', d: { X: 1, Y: -1 } }, { id: 'Z-', simbol: 'Z−', d: { Z: -1 } },
];

type Refuz = Extract<RezultatIncarcare, { ok: false }>;
/** Motivele legăturii prin WiFi (`websocket.ts`), fără parametri. */
const MOTIVE_RETEA: ReadonlySet<string> = new Set(['retea-nedeschis', 'retea-timp', 'retea-permisiune', 'retea-cazuta']);
/** Motivul portului închis: gol (închis de dispozitiv) sau un cod al nostru se traduc; altfel, textul browserului. */
const textMotiv = (m: string): string => {
  if (m === '') return t('masina.motiv.inchis');
  if (m === 'fara-web-serial' || m === 'port-fara-scriere') return t(`masina.motiv.${m}`);
  if (MOTIVE_RETEA.has(m)) return t(`masina.motiv.${m}` as CheieSimpla);
  const inchisa = /^retea-inchisa(?::(\d+))?$/.exec(m);
  return inchisa ? t('masina.motiv.retea-inchisa', { cod: inchisa[1] ?? '—' }) : m;
};
/** Portul (USB) sau legătura (WiFi) închisă, cu motivul ei. */
const textEroare = (m: string): string => t(m.startsWith('retea-') ? 'masina.eroare.retea' : 'masina.eroare', { motiv: textMotiv(m) });
/** O linie a jurnalului: ce spune sesiunea (un cod) în limba omului; restul, cum l-a trimis controlerul (un cod, cu titlul lui). */
const textJurnal = (l: LinieJurnal, d: StareDictionar, st: StareSesiune): string => {
  if (l.cod === undefined) return l.fel === 'trimis' ? `> ${l.text}` : cuTitlu(l.text, d, st);
  if (l.cod === 'port-inchis') return textEroare(l.motiv ?? '');
  if (l.cod === 'miscare') return t('masina.jurnal.miscare', { motiv: t(`masina.miscare.${l.motiv ?? 'ocupata'}` as CheieSimpla) });
  return t(`masina.jurnal.${l.cod}` as CheieSimpla);
};
/** De ce s-a întrerupt lucrarea: un cod al fluxului, în limba omului, sau linia alarmei cu titlul ei. */
const textPierdut = (m: string, d: StareDictionar, st: StareSesiune): string =>
  (m === 'oprit' || m === 'deconectat' || m === 'repornire' ? t(`masina.pierdut.${m}`) : cuTitlu(m, d, st));
/** Ce a făcut ultima procedură (zero, WCS, palparea), în limba omului; gol când nu e nimic de spus. */
function textProcedura(p: Procedura): string {
  if (p.fel !== 'palpare') {
    if (p.rezultat === 'pierdut') return t('masina.procedura.pierdut');
    if (typeof p.rezultat === 'number') return p.fel === 'zero' ? t('masina.zero.eroare', { cod: p.rezultat }) : t('masina.wcs.eroare', { wcs: p.wcs, cod: p.rezultat });
    if (p.fel === 'wcs') return '';
    return p.rezultat === 'ok' ? t('masina.zero.ok', { axe: p.axe.join(''), wcs: p.wcs }) : t('masina.zero.in-curs');
  }
  const s = p.stare;
  if (s.pas === 'gata') return t('masina.palpare.gata', { wcs: s.p.wcs, z: (s.zAtingere ?? 0).toFixed(3), grosime: s.p.grosime });
  if (s.pas === 'esuat') return t(`masina.palpare.esuat.${s.motiv ?? 'intrerupt'}` as CheieSimpla, { cod: s.cod ?? '' });
  return t(`masina.palpare.pas.${s.pas}` as CheieSimpla);
}
const numar = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text.replace(',', '.')));
const textRefuz = (r: Pick<Refuz, 'cod' | 'linie'>): string => {
  const cod = r.cod === 'fara-wcs' && r.linie !== null ? 'fara-wcs-linie' : r.cod;
  return t(`masina.refuz.${cod}` as CheieSimpla, { linie: (r.linie ?? 0) + 1 });
};

export function PanouMasina({ ultimulExport, lucrarePrimita, simulare, cerere = 0, onDeschide = () => undefined, onModal = () => undefined }: {
  /** Fișierele ultimului export: unul, sau câte unul pe freză (ADR 0084). */
  readonly ultimulExport: readonly ExportPentruMasina[] | null;
  /** Lucrarea primită de la altă aplicație (ADR 0126): fișierele verificate, încărcate ca unele străine. */
  readonly lucrarePrimita: LucrarePrimita | null;
  /** Mașina simulată se oferă (în afara instanței live). */
  readonly simulare: boolean;
  /** Numărul ultimei cereri „Deschide în Mașina” (ADR 0132 §7): una nouă încarcă primul fișier al exportului, fără pornire. */
  readonly cerere?: number;
  /** Deschide fereastra Mașina (clicul pe indicatorul lucrării, din orice fereastră). */
  readonly onDeschide?: () => void;
  /** Confirmarea cerută de o extensie e deschisă (ADR 0160 §B): aplicația de sub ea e inertă, ca sub un dialog. */
  readonly onModal?: (deschisa: boolean) => void;
}): ReactNode {
  useLimba();
  // Pornirea programului cere capabilitatea senderului (ADR 0116 §9), judecată din contul ținut; jog-ul, zero-ul și oprirea
  // rămân, ca omul să poată muta mașina din drum.
  useContTinut();
  const faraSender = !contulPermite('masina');
  const s = sesiunea();
  const st = useSyncExternalStore((f) => s.aboneaza(f), () => s.stare());
  const [nume, setNume] = useState<string | null>(null);
  const [refuz, setRefuz] = useState<string | null>(null);
  const [viteza, setViteza] = useState<(typeof VITEZE)[number]>(10);
  const vitezaRef = useRef(viteza);
  vitezaRef.current = viteza;
  const [comanda, setComanda] = useState('');
  // Fișierul ales din ultimul export, când are câte unul pe freză (ADR 0084).
  const [fisierAles, setFisierAles] = useState(0);
  const exportAles = ultimulExport?.[fisierAles] ?? ultimulExport?.[0] ?? null;
  // Fișierul ales din lucrarea primită; o lucrare nouă pornește de la primul (ordinea de tăiere).
  const [primitAles, setPrimitAles] = useState(0);
  const idPrimita = lucrarePrimita?.id ?? null;
  useEffect(() => { setPrimitAles(0); }, [idPrimita]);
  const fisier = useRef<HTMLInputElement | null>(null);
  const idComanda = useRef(0);
  const dict = useDictionarCoduri();
  // Cardul codului ascuns cu „Am înțeles” (numărul lui): următorul cod îl arată din nou.
  const [ascuns, setAscuns] = useState<number | null>(null);
  const [confirmDeblocare, setConfirmDeblocare] = useState(false);
  const [wifi, setWifi] = useState(false);
  const butonWifi = useRef<HTMLButtonElement | null>(null);
  const [avertismentWifi, setAvertismentWifi] = useState(false);
  // Extensiile (ADR 0160 §B): cine a încărcat programul de acum, și pornirea sau reluarea care așteaptă omul.
  const [deLa, setDeLa] = useState<string | null>(null);
  const [cerereExtensie, setCerereExtensie] = useState<CerereConfirmare | null>(null);
  const numeRef = useRef(nume);
  numeRef.current = nume;
  const nrAlarma = st.alarma?.nr ?? null;
  useEffect(() => { setConfirmDeblocare(false); }, [nrAlarma]);

  const f = st.flux;
  const conectat = st.conexiune === 'conectat';
  const r = f.raport;
  const lucru = r ? pozitieDeLucru(r, f.wco) : null;
  const poz = lucru ?? r?.pozitie ?? null;
  const n = f.program?.linii.length ?? 0;

  const incarca = async (octeti: Uint8Array, sursa: 'export' | 'fisier', numeNou: string, sha256?: string): Promise<void> => {
    const rez = await incarcaProgram(octeti, { sursa, ...(sha256 ? { sha256 } : {}) });
    if (!rez.ok) { setRefuz(textRefuz(rez)); return; }
    setRefuz(null);
    setNume(numeNou);
    setDeLa(null);
    s.eveniment({ tip: 'incarca', program: rez.program });
  };
  const conecteazaSerial = async (): Promise<void> => {
    try {
      await s.conecteaza(await deschideSerial());
    } catch (e) {
      // Omul a închis fereastra de alegere: nimic de spus.
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) setRefuz(textMotiv(e instanceof Error ? e.message : String(e)));
    }
  };
  /** Legătura prin WiFi: adresa se judecă întâi; întoarce motivul refuzului, în limba omului, sau null. */
  const conecteazaRetea = async (profil: ProfilRetea, text: string, port: number): Promise<string | null> => {
    const a = adresaRetea(text, port);
    if (!a.ok) return t(`masina.wifi.refuz.${a.motiv}`);
    try {
      await s.conecteaza(await deschideRetea(a.adresa, profil));
    } catch (e) {
      return textMotiv(e instanceof Error ? e.message : String(e));
    }
    adresaConectata = `${a.adresa.gazda}:${a.adresa.port}`;
    tineAlegeri(profil, text.trim(), a.adresa.port);
    setWifi(false);
    return null;
  };
  /** Pornirea: prima dată prin WiFi, în pagina asta, întâi avertismentul căderii legăturii. */
  const porneste = (): void => {
    if (st.transport === 'retea' && !avertizatWifi) { setAvertismentWifi(true); return; }
    s.eveniment({ tip: 'start' });
  };
  const conecteazaSimulata = async (): Promise<void> => {
    const m = await import('../machine/MasinaSimulata.ts');
    await s.conecteaza(m.deschideSimulata({ ceas: CEAS, viteza: () => vitezaRef.current }));
  };
  const trimiteComanda = (): void => {
    const text = comanda.trim();
    if (!text) return;
    s.eveniment({ tip: 'manual', id: `om-${++idComanda.current}`, text });
    setComanda('');
  };

  // Lucrarea pornită (ADR 0132 §6): carcasa o citește („Reîncarcă” așteaptă), iar browserul întreabă la închiderea paginii.
  const inceputa = lucrareInceputa(f.faza);
  useEffect(() => {
    lucrarePornita.scrie(inceputa);
    if (!inceputa) return undefined;
    window.addEventListener('beforeunload', intreabaLaIesire);
    return () => { window.removeEventListener('beforeunload', intreabaLaIesire); };
  }, [inceputa]);
  // „Deschide în Mașina” (ADR 0132 §7): fiecare cerere nouă încarcă primul fișier al exportului, ca „Ultimul export”, fără
  // pornire; cu o lucrare pornită, se refuză, cu motivul. Doar numărul cererii pornește efectul: exportul și sesiunea se
  // citesc la cerere, cum sunt atunci.
  const cerereTratata = useRef(0);
  useEffect(() => {
    if (cerere === cerereTratata.current) return;
    cerereTratata.current = cerere;
    const x = ultimulExport?.[0];
    if (!x) return;
    if (lucrareInceputa(s.stare().flux.faza)) {
      setRefuz(t('masina.program.in-lucru'));
      return;
    }
    setFisierAles(0);
    void incarca(x.octeti, 'export', x.nume, x.sha256);
  }, [cerere]);
  // Învelișul pentru extensii (ADR 0160 §B, §E): senderul paginii, cu verificările lui „Fișier…” și confirmarea omului la
  // pornire și la reluare (`masinaExtensii.ts`). Stă pus cât e montată fereastra; numele și contul se citesc la fiecare cerere.
  useEffect(() => {
    const m = invelisMasina(s, {
      nume: () => numeRef.current,
      permis: () => contulPermite('masina'),
      confirmare: setCerereExtensie,
      incarcat: (numeNou, extensie) => {
        numeRef.current = numeNou;
        setRefuz(null);
        setNume(numeNou);
        setDeLa(extensie);
      },
      avertizat: () => { avertizatWifi = true; },
    });
    masinaPentruExtensii.scrie(m);
    return () => {
      masinaPentruExtensii.scrie(null);
      m.anuleaza();
    };
  }, []);
  useEffect(() => { onModal(cerereExtensie !== null); }, [cerereExtensie]);
  /** Escape închide doar ce e deschis în fereastră (ADR 0132 §8): formularul WiFi, o confirmare. Nu trimite nimic la mașină. */
  const tasta = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Escape') return;
    if (wifi) {
      setWifi(false);
      butonWifi.current?.focus();
    } else if (avertismentWifi) {
      setAvertismentWifi(false);
    } else if (confirmDeblocare) {
      setConfirmDeblocare(false);
    } else {
      return;
    }
    e.preventDefault();
  };

  const deblocheaza = (): void => { s.eveniment({ tip: 'manual', id: `om-${++idComanda.current}`, text: '$X' }); };
  const cereDeblocare = (): void => { if (deblocareCuConfirmare(dict, st)) setConfirmDeblocare(true); else deblocheaza(); };
  const actiune = (a: ActiuneCod): void => {
    switch (a) {
      case 'repornire': s.eveniment({ tip: 'opreste' }); break;
      case 'deblocare': cereDeblocare(); break;
      case 'eliberare': s.eveniment({ tip: 'eliberare' }); break;
      // Jog-ul și palparea: panoul duce omul la ele (un buton dezactivat acum primește doar derularea).
      case 'jog': case 'palpare': {
        const b = document.querySelector<HTMLButtonElement>(a === 'jog' ? '[data-masina="jog"][data-jog="Z+"]' : '[data-masina="palpeaza"]');
        b?.scrollIntoView({ block: 'center' });
        b?.focus();
        break;
      }
    }
  };
  const cod = st.cod !== null && st.cod.nr !== ascuns ? st.cod : null;
  const confirmare = confirmDeblocare && conectat && r?.stare === 'Alarm'
    ? <ConfirmareDeblocare onDa={() => { setConfirmDeblocare(false); deblocheaza(); }} onNu={() => { setConfirmDeblocare(false); }} />
    : null;

  // La o oprire pentru schimbarea frezei (ADR 0084), ce freză se montează, din comentariul postului.
  const deMontat = f.faza === 'bariera' && f.bariera && f.program ? sculaLaOprire(f.program, f.bariera.linie, f.bariera.ultima) : null;
  const faza = f.faza === 'bariera' && f.bariera
    ? deMontat !== null
      ? t('masina.faza.bariera.montare', { linie: f.bariera.linie + 1, scula: deMontat })
      : t(f.bariera.m6 ? 'masina.faza.bariera.scula' : 'masina.faza.bariera', { linie: f.bariera.linie + 1 })
    : f.faza === 'pierdut' ? t('masina.faza.pierdut', { motiv: textPierdut(f.motiv ?? '', dict, st) }) : t(`masina.faza.${f.faza}` as CheieSimpla);
  const inHold = r?.stare === 'Hold';

  return (
    // Escape închide doar ce e deschis aici (formularul WiFi, o confirmare): ascultat pe fereastră, nu pe pagină.
    <div className="masina" onKeyDown={tasta}>
      <h2 className="masina-ascuns">{t('vedere.masina')}</h2>
      <IndicatorLucrare s={s} st={st} onDeschide={onDeschide} />

      {/* Coloana mașinii: conexiunea, starea cu poziția, poziționarea. */}
      <div className="masina-coloana" data-coloana="masina">
        <section className="masina-conexiune" aria-label={t('masina.conexiune')}>
          <h3>{t('masina.conexiune')}</h3>
          <p className="masina-cap" data-testid="masina-conexiune">
            {!conectat ? t('masina.deconectat')
              : st.transport === 'retea' ? t('masina.conectat.retea', { adresa: adresaConectata ?? '—' })
                : t(st.transport === 'simulat' ? 'masina.conectat.simulat' : 'masina.conectat.serial')}
          </p>
          {st.eroare !== null && <p className="masina-nota" role="status">{textEroare(st.eroare)}</p>}
          <div className="masina-butoane">
            {!conectat && (serialDisponibil()
              ? <button type="button" data-masina="conecteaza" title={t('masina.conecteaza.titlu')} onClick={() => { void conecteazaSerial(); }}>{t('masina.conecteaza')}</button>
              : <p className="masina-nota">{t('masina.fara-serial')}</p>)}
            {!conectat && (
              <button type="button" ref={butonWifi} data-masina="conecteaza-wifi" title={t('masina.conecteaza-wifi.titlu')} aria-expanded={wifi} onClick={() => { setWifi((x) => !x); }}>
                {t('masina.conecteaza-wifi')}
              </button>
            )}
            {!conectat && simulare && (
              <button type="button" data-masina="simulata" title={t('masina.simulata.titlu')} onClick={() => { void conecteazaSimulata(); }}>{t('masina.simulata')}</button>
            )}
            {conectat && <button type="button" data-masina="deconecteaza" onClick={() => { void s.deconecteaza(); }}>{t('masina.deconecteaza')}</button>}
          </div>
          {wifi && !conectat && <FormularWifi conecteaza={conecteazaRetea} renunta={() => { setWifi(false); }} />}
          {simulare && (
            <label className="masina-camp">
              <span>{t('masina.viteza')}</span>
              <select value={viteza} data-masina="viteza" onChange={(e) => { setViteza(Number(e.target.value) as (typeof VITEZE)[number]); }}>
                {VITEZE.map((v) => <option key={v} value={v}>{`${v}×`}</option>)}
              </select>
            </label>
          )}
        </section>

        <section className="masina-stare" aria-label={t('masina.stare')}>
          <h3>{t('masina.stare')}</h3>
          <dl>
            <div className="masina-rand"><dt>{t('masina.stare')}</dt><dd data-testid="masina-stare" data-stare={r?.stare ?? ''}>
              {r ? `${r.stare}${r.sub !== null ? `:${r.sub}` : ''}` : t('masina.stare.necunoscuta')}
            </dd></div>
            {poz && (
              <div className="masina-rand masina-rand-dro"><dt>{t(poz.cadru === 'lucru' ? 'masina.pozitie.lucru' : 'masina.pozitie.masina')}</dt>
                {/* Cifrele mari, câte o axă pe rând; spațiile dintre ele rămân în text („X 1.000 Y 2.000”), pentru cititoare. */}
                <dd className="masina-dro" data-testid="masina-pozitie">
                  {poz.valori.map((v, k) => <span key={k} className="masina-axa"><span>{AXE[k] ?? `#${k}`}</span> <span>{v.toFixed(3)}</span> </span>)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {conectat && <Pozitionare s={s} st={st} />}
      </div>

      {/* Coloana lucrării: codul controlerului, faza cu butoanele, programul. */}
      <div className="masina-coloana" data-coloana="lucrare">
        {cod && <CardCod d={dict} st={st} cod={cod} confirmare={confirmare} onActiune={actiune} onAscunde={() => { setAscuns(cod.nr); }} />}

        <section className="masina-lucrare" aria-label={t('masina.faza')}>
          <h3>{t('masina.faza')}</h3>
          <p className="masina-cap" data-testid="masina-faza" data-faza={f.faza}>{faza}</p>
          {f.program && (
            <div className="masina-progres">
              <progress max={n} value={Math.min(f.urm, n)} />
              <span data-testid="masina-progres">{t('masina.progres', { urm: Math.min(f.urm, n), n })}</span>
            </div>
          )}
          {f.erori.length > 0 && (
            <ul className="masina-erori" aria-label={t('masina.erori')} data-testid="masina-erori">
              {f.erori.map((e, k) => {
                const titlu = titluCod(dict, st, 'eroare', e.cod);
                return <li key={k}>{t('masina.eroare.linie', { linie: e.linie + 1, cod: e.cod })}{titlu === null ? '' : ` — ${titlu}`}</li>;
              })}
            </ul>
          )}
          <div className="masina-butoane masina-butoane-lucrare">
            <button type="button" className="principal" data-masina="start" {...(faraSender ? { title: t('motiv.fara-capabilitate') } : {})}
              disabled={faraSender || !conectat || !f.program || !['pregatit', 'terminat', 'pierdut'].includes(f.faza) || f.inZbor.length > 0}
              onClick={porneste}>{t('masina.start')}</button>
            {f.faza === 'suspendat' && <button type="button" className="principal" data-masina="reia" onClick={() => { s.eveniment({ tip: 'reia' }); }}>{t('masina.reia')}</button>}
            {f.faza === 'bariera' && <button type="button" className="principal" data-masina="continua" onClick={() => { s.eveniment({ tip: 'continua' }); }}>{t('masina.continua')}</button>}
            {conectat && f.faza !== 'suspendat' && (inHold
              ? <button type="button" data-masina="eliberare" onClick={() => { s.eveniment({ tip: 'eliberare' }); }}>{t('masina.eliberare')}</button>
              : <button type="button" data-masina="pauza" onClick={() => { s.eveniment({ tip: 'hold' }); }}>{t('masina.pauza')}</button>)}
            {conectat && <button type="button" className="masina-opreste" data-masina="opreste" title={t('masina.opreste.titlu')} onClick={() => { s.eveniment({ tip: 'opreste' }); }}>{t('masina.opreste')}</button>}
            {conectat && r?.stare === 'Alarm' && (
              <button type="button" data-masina="deblocheaza" onClick={cereDeblocare}>{t('masina.deblocheaza')}</button>
            )}
          </div>
          {avertismentWifi && conectat && st.transport === 'retea' && (
            <div className="masina-nota masina-avertisment" role="alertdialog" aria-label={t('masina.start')} data-testid="masina-avertisment-wifi">
              <p>{t('masina.wifi.avertisment')}</p>
              <div className="masina-butoane">
                <button type="button" className="principal" data-masina="start-wifi"
                  onClick={() => { avertizatWifi = true; setAvertismentWifi(false); s.eveniment({ tip: 'start' }); }}>{t('masina.wifi.porneste-oricum')}</button>
                <button type="button" data-masina="start-wifi-renunta" onClick={() => { setAvertismentWifi(false); }}>{t('masina.wifi.renunta')}</button>
              </div>
            </div>
          )}
          {!cod && confirmare}
        </section>

        <section className="masina-programul" aria-label={t('masina.program')}>
          <h3>{t('masina.program')}</h3>
          <div className="masina-butoane">
            {ultimulExport && ultimulExport.length > 1 && (
              <select value={fisierAles} data-masina="export-fisier" aria-label={t('masina.program.export.fisier')}
                onChange={(e) => { setFisierAles(Number(e.target.value)); }}>
                {ultimulExport.map((x, k) => <option key={x.nume} value={k}>{x.nume}</option>)}
              </select>
            )}
            <button type="button" data-masina="export" disabled={!exportAles || IN_FLUX.has(f.faza)}
              title={exportAles ? t('masina.program.export.titlu') : t('masina.program.export.lipsa')}
              onClick={() => { if (exportAles) void incarca(exportAles.octeti, 'export', exportAles.nume, exportAles.sha256); }}>
              {t('masina.program.export')}
            </button>
            <button type="button" data-masina="fisier" disabled={IN_FLUX.has(f.faza)} title={t('masina.program.fisier.titlu')} onClick={() => fisier.current?.click()}>
              {t('masina.program.fisier')}
            </button>
            <input ref={fisier} type="file" accept=".nc,.gcode,.ngc,.tap,.txt" hidden data-masina="fisier-ales"
              onChange={(e) => {
                const fis = e.target.files?.[0];
                e.target.value = '';
                if (fis) void fis.arrayBuffer().then((b) => incarca(new Uint8Array(b), 'fisier', fis.name));
              }} />
          </div>
          {lucrarePrimita && (
            <div data-testid="masina-primita">
              <p className="masina-nota">{t('masina.primit.titlu', { titlu: lucrarePrimita.titlu || '—', aplicatie: lucrarePrimita.de_la.aplicatie })}</p>
              {lucrarePrimita.acceptate.length > 0 && (
                <div className="masina-butoane">
                  <select value={primitAles} data-masina="primit-fisier" aria-label={t('masina.primit.fisier')}
                    onChange={(e) => { setPrimitAles(Number(e.target.value)); }}>
                    {lucrarePrimita.acceptate.map((x, k) => <option key={x.nume} value={k}>{x.nume}</option>)}
                  </select>
                  <button type="button" data-masina="primit" disabled={IN_FLUX.has(f.faza)} title={t('masina.primit.incarca.titlu')}
                    onClick={() => { const x = lucrarePrimita.acceptate[primitAles]; if (x) void incarca(x.octeti, 'fisier', x.nume, x.sha256); }}>
                    {t('masina.primit.incarca')}
                  </button>
                </div>
              )}
              {lucrarePrimita.refuzate.length > 0 && <>
                <p className="masina-nota">{t('masina.primit.refuzate', { n: lucrarePrimita.refuzate.length })}</p>
                <ul className="masina-erori" data-testid="masina-primit-refuzate">
                  {lucrarePrimita.refuzate.map((x) => (
                    <li key={x.nume} data-cod={x.cod}><strong>{x.nume}</strong>: {x.cod === 'hash' ? t('masina.refuz.hash-primit') : textRefuz(x)}</li>
                  ))}
                </ul>
              </>}
            </div>
          )}
          {refuz && <p className="masina-nota" role="alert" data-testid="masina-refuz">{refuz}</p>}
          <p className="masina-program" data-testid="masina-program">
            {f.program ? <>
              <strong>{nume ?? '—'}</strong>{' · '}{t('masina.program.linii', { n })}
              {deLa !== null && <>{' · '}<span data-testid="masina-program-de-la">{t('masina.program.de-la', { extensie: deLa })}</span></>}<br />
              <span className="masina-sha" title={f.program.sha256} data-sha={f.program.sha256}>SHA-256 {f.program.sha256.slice(0, 16)}…</span>
            </> : t('masina.program.niciunul')}
          </p>
        </section>
      </div>

      {/* Consola: comanda manuală și jurnalul. */}
      <div className="masina-coloana" data-coloana="consola">
        <section className="masina-consola" aria-label={t('masina.consola')}>
          <h3>{t('masina.consola')}</h3>
          <form className="masina-comanda" onSubmit={(e) => { e.preventDefault(); trimiteComanda(); }}>
            <input value={comanda} data-masina="comanda" aria-label={t('masina.comanda')} placeholder="$G" disabled={!conectat}
              onChange={(e) => { setComanda(e.target.value); }} />
            <button type="submit" data-masina="trimite" disabled={!conectat || comanda.trim() === ''}>{t('masina.comanda.trimite')}</button>
          </form>
          <ol className="masina-jurnal" aria-label={t('masina.jurnal')} data-testid="masina-jurnal">
            {st.jurnal.slice(-60).map((l, k) => <li key={k} data-fel={l.fel}>{textJurnal(l, dict, st)}</li>)}
          </ol>
        </section>
      </div>
      {cerereExtensie && <ConfirmareMasina key={cerereExtensie.nr} cerere={cerereExtensie} />}
    </div>
  );
}

/**
 * Legătura prin WiFi (ADR 0119): controlerul (cu portul lui implicit), adresa și portul, din alegerile ținute; refuzul (adresa
 * sau legătura) se spune sub formular.
 */
function FormularWifi({ conecteaza, renunta }: {
  readonly conecteaza: (profil: ProfilRetea, adresa: string, port: number) => Promise<string | null>;
  readonly renunta: () => void;
}): ReactNode {
  const [initial] = useState(alegeriTinute);
  const [profil, setProfil] = useState<ProfilRetea>(initial.profil);
  const [adresa, setAdresa] = useState(initial.adresa);
  const [port, setPort] = useState(initial.port);
  const [ocupat, setOcupat] = useState(false);
  const [refuz, setRefuz] = useState<string | null>(null);
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    setOcupat(true);
    setRefuz(null);
    void conecteaza(profil, adresa, numar(port)).then((r) => { setOcupat(false); setRefuz(r); });
  };
  return (
    <form className="masina-wifi" onSubmit={trimite} data-testid="masina-wifi">
      <label className="masina-camp">
        <span>{t('masina.wifi.profil')}</span>
        <select value={profil} data-masina="wifi-profil"
          onChange={(e) => { const v = e.target.value; if (esteProfilRetea(v)) { setProfil(v); setPort(String(PROFIL_RETEA[v].port)); } }}>
          {PROFILURI_RETEA.map((p) => <option key={p} value={p}>{t(`masina.wifi.profil.${p}`)}</option>)}
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
      <p className="masina-nota">{t('masina.wifi.adresa.ajutor')}</p>
      <div className="masina-butoane">
        <button type="submit" className="principal" data-masina="wifi-conecteaza" disabled={ocupat}>
          {t(ocupat ? 'masina.wifi.se-conecteaza' : 'masina.wifi.conecteaza')}
        </button>
        <button type="button" data-masina="wifi-renunta" onClick={renunta}>{t('masina.wifi.renunta')}</button>
      </div>
      {refuz && <p className="masina-nota" role="alert" data-testid="masina-wifi-refuz">{refuz}</p>}
    </form>
  );
}

/** Jog-ul, WCS-ul, zero-ul și palparea Z (ADR 0082); doar cu mașina conectată. */
function Pozitionare({ s, st }: { readonly s: SesiuneMasina; readonly st: StareSesiune }): ReactNode {
  const [pas, setPas] = useState<(typeof PASI_JOG)[number]>(1);
  const [avans, setAvans] = useState('1000');
  const [grosime, setGrosime] = useState(String(PALPARE_IMPLICITA.grosime));
  const [distanta, setDistanta] = useState(String(PALPARE_IMPLICITA.distanta));
  const [avansPalpare, setAvansPalpare] = useState(String(PALPARE_IMPLICITA.avans));
  const f = st.flux;
  const motiv = (fel: FelMiscare): string | null => { const m = s.motiv(fel); return m === null ? null : t(`masina.miscare.${m}` as CheieSimpla); };
  // Zero-ul și palparea merg în WCS-ul programului (cel în care va tăia), altfel în cel activ.
  const wcsProgram = f.program && esteWcs(f.program.wcs) ? f.program.wcs : null;
  const tinta: Wcs | null = wcsProgram ?? st.wcsActiv;
  const montaj = f.program ? montajDeclarat(f.program) : null;
  const mJog = motiv('jog');
  const mZero = motiv('zero-z') ?? (tinta === null ? t('masina.wcs.necitit') : null);
  const mXy = motiv('zero-xy');
  const mWcs = motiv('wcs');
  const proc = st.procedura ? textProcedura(st.procedura) : '';
  const nr = numar(avans);

  return (
    <section aria-label={t('masina.pozitionare')} className="masina-pozitionare">
      <h3>{t('masina.pozitionare')}</h3>
      <label className="masina-camp">
        <span>{t('masina.wcs')}</span>
        <select value={st.wcsActiv ?? ''} data-masina="wcs" title={mWcs ?? t('masina.wcs.titlu')} disabled={mWcs !== null}
          onChange={(e) => { const w = e.target.value; if (esteWcs(w)) s.alegeWcs(w); }}>
          {st.wcsActiv === null && <option value="">{t('masina.wcs.necitit')}</option>}
          {WCS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      {wcsProgram && st.wcsActiv && wcsProgram !== st.wcsActiv && (
        <div className="masina-nota masina-wcs-nepotrivit" role="status" data-testid="masina-wcs-nepotrivit">
          {t('masina.wcs.nepotrivit', { program: wcsProgram, activ: st.wcsActiv })}{' '}
          <button type="button" data-masina="wcs-program" disabled={mWcs !== null} onClick={() => { s.alegeWcs(wcsProgram); }}>
            {t('masina.wcs.treci', { wcs: wcsProgram })}
          </button>
        </div>
      )}

      <h4>{t('masina.jog')}</h4>
      <div className="masina-jog" role="group" aria-label={t('masina.jog')}>
        {DIRECTII.map((d, k) => (d === null ? <span key={k} /> : (
          <button key={d.id} type="button" data-masina="jog" data-jog={d.id} disabled={mJog !== null || !(nr > 0)}
            aria-label={t('masina.jog.axa', { axe: d.id.replace(/([XYZ])/g, ' $1').trim().replace(/-/g, '−') })}
            onClick={() => {
              const dep: Partial<Record<AxaJog, number>> = {};
              for (const [a, v] of Object.entries(d.d) as [AxaJog, number][]) dep[a] = v * pas;
              s.jog(dep, nr);
            }}>{d.simbol}</button>
        )))}
      </div>
      <div className="masina-butoane">
        <label className="masina-camp">
          <span>{t('masina.jog.pas')}</span>
          <select value={pas} data-masina="pas-jog" onChange={(e) => { setPas(Number(e.target.value) as (typeof PASI_JOG)[number]); }}>
            {PASI_JOG.map((p) => <option key={p} value={p}>{`${p} mm`}</option>)}
          </select>
        </label>
        <label className="masina-camp">
          <span>{t('masina.jog.avans')}</span>
          <input type="number" inputMode="decimal" min={1} step={100} value={avans} data-masina="avans-jog" className="masina-numar"
            onChange={(e) => { setAvans(e.target.value); }} />
        </label>
        {f.raport?.stare === 'Jog' && (
          <button type="button" className="masina-opreste" data-masina="anuleaza-jog" onClick={() => { s.anuleazaJog(); }}>{t('masina.jog.opreste')}</button>
        )}
      </div>
      {mJog !== null && <p className="masina-motiv" data-testid="masina-motiv-jog">{t('masina.miscare.acum', { motiv: mJog })}</p>}

      <div className="masina-butoane">
        <button type="button" data-masina="zero-xy" disabled={mZero !== null || mXy !== null || tinta === null}
          title={mXy ?? (tinta ? t('masina.zero.titlu', { wcs: tinta }) : undefined)}
          onClick={() => { if (tinta) s.zero(['X', 'Y'], tinta); }}>{t('masina.zero.xy', { wcs: tinta ?? '—' })}</button>
        <button type="button" data-masina="zero-z" disabled={mZero !== null || tinta === null}
          title={tinta ? t('masina.zero.titlu', { wcs: tinta }) : undefined}
          onClick={() => { if (tinta) s.zero(['Z'], tinta); }}>{t('masina.zero.z', { wcs: tinta ?? '—' })}</button>
      </div>
      {f.program && (
        <p className="masina-z0" data-testid="masina-z0">
          {montaj ? <>{t(`masina.z0.${montaj.z0}`)}<br />{t('masina.origine', { colt: t(`masina.colt.${montaj.origine}`) })}</> : t('masina.z0.necunoscut')}
        </p>
      )}

      <h4>{t('masina.palpare')}</h4>
      <div className="masina-palpare">
        <label className="masina-camp"><span>{t('masina.palpare.grosime')}</span>
          <input type="number" inputMode="decimal" min={0.1} max={100} step={0.1} value={grosime} data-masina="palpare-grosime" className="masina-numar"
            onChange={(e) => { setGrosime(e.target.value); }} /></label>
        <label className="masina-camp"><span>{t('masina.palpare.distanta')}</span>
          <input type="number" inputMode="decimal" min={1} max={300} step={1} value={distanta} data-masina="palpare-distanta" className="masina-numar"
            onChange={(e) => { setDistanta(e.target.value); }} /></label>
        <label className="masina-camp"><span>{t('masina.palpare.avans')}</span>
          <input type="number" inputMode="decimal" min={1} max={2000} step={10} value={avansPalpare} data-masina="palpare-avans" className="masina-numar"
            onChange={(e) => { setAvansPalpare(e.target.value); }} /></label>
      </div>
      <div className="masina-butoane">
        <button type="button" className="principal" data-masina="palpeaza" disabled={mZero !== null || tinta === null}
          title={tinta ? t('masina.palpare.titlu', { wcs: tinta }) : undefined}
          onClick={() => {
            if (tinta) s.palpeaza({ ...PALPARE_IMPLICITA, wcs: tinta, grosime: numar(grosime), distanta: numar(distanta), avans: numar(avansPalpare) });
          }}>{t('masina.palpare.porneste', { wcs: tinta ?? '—' })}</button>
      </div>
      {mZero !== null && mJog === null && <p className="masina-motiv" data-testid="masina-motiv-zero">{t('masina.miscare.acum', { motiv: mZero })}</p>}
      {proc !== '' && <p className="masina-cap" role="status" data-testid="masina-procedura">{proc}</p>}
    </section>
  );
}
