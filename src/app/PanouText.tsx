import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { cuMesaje, t } from '../i18n/t.ts';
import type { Contur } from '../geom/conturBaza.ts';
import { aldinMaxim, LIMITE_TEXT, majusculaBloc, POZITII_PE_CURBA, type BlocText, type CurbaText } from '../model/blocText.ts';
import { FONT_IMPLICIT, FONTURI_INCLUSE } from '../text/fonturi.ts';
import { numeVarianta, sursaFont } from '../text/iduriFont.ts';
import { majusculaDinMarime, marimeDinMajuscula, raportMajuscula, rotunjesteMarime, UNITATI_MARIME, type UnitateMarime } from '../text/marime.ts';
import type { AliniereText, CasetaText } from '../text/asezare.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { CerereText } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { descarcaInBiblioteca } from './fonturiGoogleClient.ts';
import { Previzualizare } from './PrevizualizareText.tsx';
import { textIncarcare } from './texteFont.ts';

type ModulText = typeof import('../text/calcul.ts');
type RezultatIncarcare = Awaited<ReturnType<ModulText['incarcaFont']>>;
type FontSalvat = import('../text/biblioteca.ts').FontSalvat;
type FontSistem = import('../text/sistem.ts').FontSistem;
type TextAsezat = import('../text/asezare.ts').TextAsezat;
type Punct = { readonly x: number; readonly y: number };

/** Fereastra fonturilor (ADR 0106 §5), la cerere: abia la primul „Fonturi…”. */
const DialogFonturi = lazy(() => import('./DialogFonturi.tsx').then(cuMesaje).then((m) => ({ default: m.DialogFonturi }), () => ({
  default: ({ onInchide }: { readonly onInchide: () => void }) => (
    <div className="dialog" role="dialog" aria-modal="true">
      <div className="dialog-cutie">
        <p role="alert">{t('editare.text.neincarcat')}</p>
        <div className="butoane"><button type="button" onClick={onInchide}>{t('editare.retea.inchide')}</button></div>
      </div>
    </div>
  ),
})));

type PozitiePeCurba = (typeof POZITII_PE_CURBA)[number];

/** Ce scrie omul în panou; câmpurile numerice rămân text până la citire (un câmp greșit se spune, nu se rotunjește). */
type Formular = {
  readonly continut: string; readonly font: string; readonly inaltime: string; readonly spatiere: string; readonly interlinie: string;
  readonly aliniere: AliniereText;
  /** Textul pe curbă (ADR 0108): poziția față de curbă, distanța, partea cealaltă, literele verticale, întins pe toată curba. */
  readonly pozitie: PozitiePeCurba; readonly distanta: string; readonly invers: boolean; readonly verticala: boolean; readonly intinsa: boolean;
  /** Aldinul și cursivul sintetic (ADR 0123): pornite sau nu, cu îngroșarea (mm, pe fiecare parte) și înclinarea (grade). */
  readonly aldin: boolean; readonly grosime: string; readonly cursiv: boolean; readonly unghi: string;
  /** Textul vertical (ADR 0141): literele una sub alta, rândurile în coloane. */
  readonly textVertical: boolean;
  /** Încadrarea în casetă (ADR 0142): fără, limitat de casetă sau scalat la ea, cu lățimea și înălțimea (mm). */
  readonly caseta: FelCaseta; readonly casetaLatime: string; readonly casetaInaltime: string;
  /** Unitatea mărimii (ADR 0138 §1): mm și in măsoară majuscula, pt e mărimea fontului. */
  readonly unitate: UnitateMarime;
  /** Proporțiile literelor (ADR 0138 §2), în procente, și crenarea fontului (§3). */
  readonly latime: string; readonly inaltimeLitere: string; readonly crenare: boolean;
};

/**
 * Mărimea arătată în câmp după o conversie (un text ales, o altă unitate), cu valoarea ei exactă în mm: cât câmpul are chiar
 * textul acela, se folosește valoarea exactă, ca un „Aplică” fără nicio schimbare să n-o rotunjească (ADR 0138 §1).
 */
type MarimeExacta = { readonly text: string; readonly unitate: UnitateMarime; readonly mm: number };

/** Mărimea `mm` ca text de arătat în `unitate`: în mm exact (ca înainte), în pt și in rotunjită (ADR 0138 §1). */
function textMarime(mm: number, unitate: UnitateMarime, raport: number): string {
  return unitate === 'mm' ? textNumar(mm) : textNumar(rotunjesteMarime(marimeDinMajuscula(mm, unitate, raport), unitate));
}

type FelCaseta = 'fara' | CasetaText['fel'];
const FELURI_CASETA: readonly FelCaseta[] = ['fara', 'limita', 'scala'];

/** Curba la care stă textul: conturul în sistemul piesei (originea în ancoră) și distanța ancorei pe el. */
type CurbaAleasa = { readonly contur: Contur; readonly s: number };

const CHEIE = 'cncvs2.text';
const ALINIERI: readonly AliniereText[] = ['stanga', 'centru', 'dreapta'];
/** Alinierea unui text vertical (ADR 0141), față de ancoră: coloana pornește din ea în jos, stă la mijloc sau se termină în ea. */
const ALINIERI_VERTICALE = { stanga: 'sus', centru: 'mijloc', dreapta: 'jos' } as const;

/** Îngroșarea propusă când se pornește aldinul (ADR 0123): 3 % din majuscula tăiată (mm), la sutimea de mm. */
function grosimeImplicita(majuscula: number | null): string {
  return textNumar(majuscula === null ? 0.6 : Math.max(LIMITE_TEXT.aldinMinim, Math.round(majuscula * 3) / 100));
}

/** Alegerile de data trecută (fontul, mărimile, alinierea), fără text: ținute în browser, ca la celelalte panouri. */
function formularSalvat(): Formular {
  const baza: Formular = {
    continut: '', font: FONT_IMPLICIT, inaltime: '20', spatiere: '0', interlinie: '1', aliniere: 'stanga',
    pozitie: 'baza', distanta: '0', invers: false, verticala: false, intinsa: false,
    aldin: false, grosime: '', cursiv: false, unghi: '12', textVertical: false, caseta: 'fara', casetaLatime: '100', casetaInaltime: '50',
    unitate: 'mm', latime: '100', inaltimeLitere: '100', crenare: true,
  };
  try {
    const s = JSON.parse(localStorage.getItem(CHEIE) ?? 'null') as Partial<Record<keyof Formular, unknown>> | null;
    if (!s || typeof s !== 'object') return baza;
    const sir = (v: unknown, implicit: string): string => (typeof v === 'string' ? v : implicit);
    return {
      ...baza,
      font: typeof s.font === 'string' && sursaFont(s.font) ? s.font : baza.font,
      inaltime: sir(s.inaltime, baza.inaltime), spatiere: sir(s.spatiere, baza.spatiere), interlinie: sir(s.interlinie, baza.interlinie),
      aliniere: ALINIERI.find((a) => a === s.aliniere) ?? baza.aliniere,
      pozitie: POZITII_PE_CURBA.find((x) => x === s.pozitie) ?? baza.pozitie, distanta: sir(s.distanta, baza.distanta),
      invers: s.invers === true, verticala: s.verticala === true, intinsa: s.intinsa === true,
      aldin: s.aldin === true, grosime: sir(s.grosime, baza.grosime), cursiv: s.cursiv === true, unghi: sir(s.unghi, baza.unghi),
      textVertical: s.textVertical === true,
      caseta: FELURI_CASETA.find((x) => x === s.caseta) ?? baza.caseta,
      casetaLatime: sir(s.casetaLatime, baza.casetaLatime), casetaInaltime: sir(s.casetaInaltime, baza.casetaInaltime),
      unitate: UNITATI_MARIME.find((u) => u === s.unitate) ?? baza.unitate,
      latime: sir(s.latime, baza.latime), inaltimeLitere: sir(s.inaltimeLitere, baza.inaltimeLitere), crenare: s.crenare !== false,
    };
  } catch {
    return baza;
  }
}

function salveaza(f: Formular): void {
  try {
    localStorage.setItem(CHEIE, JSON.stringify({
      font: f.font, inaltime: f.inaltime, spatiere: f.spatiere, interlinie: f.interlinie, aliniere: f.aliniere,
      pozitie: f.pozitie, distanta: f.distanta, invers: f.invers, verticala: f.verticala, intinsa: f.intinsa,
      aldin: f.aldin, grosime: f.grosime, cursiv: f.cursiv, unghi: f.unghi, textVertical: f.textVertical,
      caseta: f.caseta, casetaLatime: f.casetaLatime, casetaInaltime: f.casetaInaltime,
      unitate: f.unitate, latime: f.latime, inaltimeLitere: f.inaltimeLitere, crenare: f.crenare,
    }));
  } catch {
    // Fără stocare (fereastră privată): alegerile țin cât pagina.
  }
}

/**
 * Parametrii citiți din formular, în marginile blocului (ADR 0105 §3), cu curba textului dacă stă pe una (ADR 0108), sau
 * cheia câmpului greșit.
 */
function parametri(
  f: Formular, numeFont: string | null, curba: CurbaAleasa | null, linie: boolean, raport: number | null, exacta: MarimeExacta | null,
): Omit<BlocText, 'amprenta'> | 'continut' | 'inaltime' | 'proportii' | 'spatiere' | 'interlinie' | 'distanta' | 'aldin' | 'cursiv' | 'caseta' | 'asteapta' {
  if (f.continut.trim() === '' || f.continut.length > LIMITE_TEXT.caractere) return 'continut';
  // În pt, majuscula depinde de font (ADR 0138 §1): până vine fontul, nu e nimic de arătat (și nici de spus).
  if (f.unitate === 'pt' && raport === null) return 'asteapta';
  // Scalat la casetă (ADR 0142), înălțimea o dă caseta: câmpul e oprit, iar valoarea lui doar ține locul.
  const scala = f.caseta === 'scala';
  const scrisa = citesteNumar(f.inaltime);
  // Majuscula în mm, oricare ar fi unitatea: textul arătat după o conversie își păstrează valoarea exactă.
  const mm = scrisa === null ? null
    : exacta && exacta.text === f.inaltime && exacta.unitate === f.unitate ? exacta.mm : majusculaDinMarime(scrisa, f.unitate, raport ?? 1);
  const buna = mm !== null && mm >= LIMITE_TEXT.inaltimeMinima && mm <= LIMITE_TEXT.inaltimeMaxima;
  if (!buna && !scala) return 'inaltime';
  const inaltime = buna ? mm : 20;
  // Proporțiile literelor (ADR 0138 §2), în procente; 100 și 100 nu intră în bloc.
  const latime = citesteNumar(f.latime), inaltimeLitere = citesteNumar(f.inaltimeLitere);
  const procent = (x: number | null): x is number => x !== null && x >= LIMITE_TEXT.procentMinim && x <= LIMITE_TEXT.procentMaxim;
  if (!procent(latime) || !procent(inaltimeLitere)) return 'proportii';
  const proportii = latime === 100 && inaltimeLitere === 100 ? undefined : { latime, inaltime: inaltimeLitere };
  const spatiere = citesteNumar(f.spatiere, true);
  if (spatiere === null || Math.abs(spatiere) > LIMITE_TEXT.spatiere) return 'spatiere';
  const interlinie = citesteNumar(f.interlinie);
  if (interlinie === null || interlinie < LIMITE_TEXT.interlinieMinima || interlinie > LIMITE_TEXT.interlinieMaxima) return 'interlinie';
  // Aldinul și cursivul (ADR 0123), doar pornite; un cursiv de 0° e un text drept. Un font cu o singură linie nu se
  // îngroașă (ADR 0140): bifa lui e oprită, iar blocul nu-l primește.
  const gros = f.aldin && !linie;
  const aldin = gros ? citesteNumar(f.grosime) : 0;
  // Scalat la casetă, înălțimea care încape e de cel puțin cinci ori aldinul (așezarea o caută așa). Aldinul se măsoară pe
  // majuscula tăiată (ADR 0138 §2).
  if (aldin === null || (gros && (aldin < LIMITE_TEXT.aldinMinim || (!scala && aldin > aldinMaxim(majusculaBloc({ inaltime, proportii })))))) return 'aldin';
  const cursiv = f.cursiv ? citesteNumar(f.unghi, true) : 0;
  if (cursiv === null || Math.abs(cursiv) > LIMITE_TEXT.cursiv) return 'cursiv';
  let pe: CurbaText | null = null;
  if (curba) {
    const distanta = citesteNumar(f.distanta, true);
    if (distanta === null || Math.abs(distanta) > LIMITE_TEXT.distantaCurba) return 'distanta';
    pe = {
      inchis: curba.contur.inchis,
      varfuri: curba.contur.varfuri.map((v) => ({ p: { x: v.p.x, y: v.p.y }, s: v.s.tip === 'C' ? { tip: 'C', c1: { ...v.s.c1 }, c2: { ...v.s.c2 } } : v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : { tip: 'L' } })),
      s: curba.s, pozitie: f.pozitie, distanta, invers: f.invers, orientare: f.verticala ? 'verticala' : 'rotita', intinsa: f.intinsa,
    };
  }
  let caseta: CasetaText | null = null;
  if (f.caseta !== 'fara') {
    const latime = citesteNumar(f.casetaLatime), inaltimeCaseta = citesteNumar(f.casetaInaltime);
    const bun = (x: number | null): x is number => x !== null && x >= LIMITE_TEXT.casetaMinima && x <= LIMITE_TEXT.casetaMaxima;
    if (!bun(latime) || !bun(inaltimeCaseta)) return 'caseta';
    caseta = f.caseta === 'limita'
      ? { fel: 'limita', latime, inaltime: inaltimeCaseta, ceruta: inaltime }
      : { fel: 'scala', latime, inaltime: inaltimeCaseta };
  }
  const bloc = { continut: f.continut, font: f.font, inaltime, spatiere, interlinie, aliniere: f.aliniere };
  return {
    ...bloc, ...(numeFont ? { numeFont: numeFont.slice(0, LIMITE_TEXT.numeFont) } : {}), ...(pe ? { curba: pe } : {}),
    ...(aldin > 0 ? { aldin } : {}), ...(cursiv !== 0 ? { cursiv } : {}), ...(f.textVertical ? { vertical: true as const } : {}),
    ...(caseta ? { caseta } : {}),
    // ADR 0138: unitatea (doar pentru panou), proporțiile și crenarea oprită; lipsă, ca înainte.
    ...(f.unitate !== 'mm' ? { unitate: f.unitate } : {}), ...(proportii ? { proportii } : {}), ...(f.crenare ? {} : { crenare: false as const }),
  };
}

/** Un număr la sutime, cu virgulă: ce arată notele panoului (majusculele, caseta). */
const douaZecimale = (x: number): string => textNumar(Math.round(x * 100) / 100, true);

/** Curba unui bloc salvat, ca un contur în sistemul piesei. */
const curbaDinBloc = (c: CurbaText): CurbaAleasa => ({ contur: { inchis: c.inchis, varfuri: c.varfuri }, s: c.s });

/**
 * Panoul uneltei Text (ADR 0105 §5, ADR 0106 §5): textul (pe rânduri), fontul (cele incluse, „Fonturile mele”, ale
 * sistemului), înălțimea majusculei, spațierea literelor, distanța dintre rânduri și alinierea, cu previzualizarea textului.
 * „Adaugă” pune un text nou în ancoră (clicul pe foaie); „Aplică” înlocuiește textul ales (clicul pe un text, sau un text
 * ales înainte de unealtă), cu blocul lui încărcat în panou. „Fonturi…” deschide fereastra fonturilor: încărcarea, Google
 * Fonts, permisiunea pentru fonturile sistemului. Modulul textului vine la prima deschidere, fontul la prima folosire;
 * caracterele pe care fontul nu le are se spun pe loc, ca și un font care lipsește de pe calculatorul ăsta.
 */
export function PanouText({ ancora, curba, editat, ruleaza, onInchide, doarCitire, stil }: {
  readonly ancora: Punct | null;
  /** Curba pe care a căzut ancora (ADR 0108 §3): conturul în coordonatele foii și distanța ancorei pe el. */
  readonly curba: { readonly contur: Contur; readonly s: number } | null;
  /** Textul ales, cu blocul lui valid: „Aplică” îl înlocuiește. */
  readonly editat: { readonly instanta: string; readonly bloc: BlocText } | null;
  readonly ruleaza: (cerere: CerereText) => RezultatActiune;
  readonly onInchide: () => void;
  readonly doarCitire: boolean;
  readonly stil: CSSProperties;
}): ReactElement {
  const [form, setForm] = useState<Formular>(formularSalvat);
  const [modul, setModul] = useState<ModulText | 'eroare' | null>(null);
  const [fonturi, setFonturi] = useState<ReadonlyMap<string, RezultatIncarcare>>(new Map());
  const [mele, setMele] = useState<readonly FontSalvat[]>([]);
  const [sistem, setSistem] = useState<readonly FontSistem[]>([]);
  const [dialog, setDialog] = useState(false);
  const [motiv, setMotiv] = useState<string | null>(null);
  const [descarc, setDescarc] = useState(false);
  // „Pe linie dreaptă”: textul nu urmează curba (cea aleasă acum sau a textului editat), deși are una.
  const [drept, setDrept] = useState(false);
  // Mărimea arătată după o conversie, cu valoarea ei exactă (ADR 0138 §1); majuscula unui text ales în pt, până vine fontul.
  const [exacta, setExacta] = useState<MarimeExacta | null>(null);
  const [asteaptaMarime, setAsteaptaMarime] = useState<number | null>(null);
  const scrie = (f: Formular): void => { setForm(f); salveaza(f); setMotiv(null); };

  useEffect(() => {
    let viu = true;
    import('../text/calcul.ts').then((m) => { if (viu) setModul(m); }, () => { if (viu) setModul('eroare'); });
    return () => { viu = false; };
  }, []);
  // Listele fonturilor: „Fonturile mele” din browser, cele ale sistemului doar cu permisiunea dată (fără să o ceară aici).
  const reincarcaListe = useCallback((m: ModulText): void => {
    void m.listaBiblioteca().then(setMele, () => { setMele([]); });
    void m.stareSistem().then((s) => (s === 'permis' ? m.listaSistem() : []), () => []).then(setSistem, () => { setSistem([]); });
  }, []);
  useEffect(() => { if (modul !== null && modul !== 'eroare') reincarcaListe(modul); }, [modul, reincarcaListe]);

  // Textul ales intră în panou: conținutul și alegerile lui (o dată pe instanță și pe bloc).
  const cheieEditat = editat ? `${editat.instanta}:${editat.bloc.amprenta}` : null;
  useEffect(() => {
    if (!editat) return;
    const b = editat.bloc;
    // Mărimea, în unitatea în care a fost scrisă (ADR 0138 §1); limitat de casetă, înălțimea cerută. În pt, după fontul
    // textului: până vine, câmpul rămâne gol, iar majuscula așteaptă (efectul de mai jos).
    const unitate = b.unitate ?? 'mm';
    const mm = b.caseta?.fel === 'limita' ? b.caseta.ceruta : b.inaltime;
    const adus = fonturi.get(b.font);
    const raportAdus = adus?.ok ? raportMajuscula(adus.font) : null;
    const marime = unitate === 'pt' && raportAdus === null ? null : textMarime(mm, unitate, raportAdus ?? 1);
    setExacta(marime === null ? null : { text: marime, unitate, mm });
    setAsteaptaMarime(marime === null ? mm : null);
    setForm((f) => ({
      ...f, continut: b.continut, font: b.font, inaltime: marime ?? '', unitate, spatiere: textNumar(b.spatiere),
      interlinie: textNumar(b.interlinie), aliniere: b.aliniere,
      // Proporțiile și crenarea (ADR 0138 §2–3); un text fără ele le pune la loc: 100 %, crenarea pornită.
      latime: textNumar(b.proportii?.latime ?? 100), inaltimeLitere: textNumar(b.proportii?.inaltime ?? 100), crenare: b.crenare !== false,
      ...(b.curba ? {
        pozitie: b.curba.pozitie, distanta: textNumar(b.curba.distanta), invers: b.curba.invers, verticala: b.curba.orientare === 'verticala',
        intinsa: b.curba.intinsa,
      } : {}),
      // Aldinul și cursivul ale textului ales (ADR 0123); unul fără ele le oprește, cu valorile scrise păstrate.
      aldin: !!b.aldin, ...(b.aldin ? { grosime: textNumar(b.aldin) } : {}),
      cursiv: !!b.cursiv, ...(b.cursiv ? { unghi: textNumar(b.cursiv) } : {}),
      // Textul vertical (ADR 0141): un text orizontal oprește bifa.
      textVertical: b.vertical === true,
      // Caseta (ADR 0142): limitat de ea, câmpul înălțimii ține înălțimea cerută; fără casetă, ea se oprește.
      caseta: b.caseta?.fel ?? 'fara',
      ...(b.caseta ? { casetaLatime: textNumar(b.caseta.latime), casetaInaltime: textNumar(b.caseta.inaltime) } : {}),
    }));
    setMotiv(null);
    setDrept(false);
  }, [cheieEditat]);
  // O ancoră nouă (pe o curbă sau nu) pornește din nou pe curbă.
  const cheieCurba = curba ? `${curba.s}:${curba.contur.varfuri.length}:${ancora?.x ?? ''}:${ancora?.y ?? ''}` : null;
  useEffect(() => { setDrept(false); }, [cheieCurba]);
  // Curba textului: a celui editat (din blocul lui), altfel cea pe care a căzut ancora, adusă în sistemul ancorei.
  const curbaPosibila = useMemo((): CurbaAleasa | null => {
    if (editat) return editat.bloc.curba ? curbaDinBloc(editat.bloc.curba) : null;
    if (!curba || !ancora) return null;
    const m = (q: Punct): Punct => ({ x: q.x - ancora.x, y: q.y - ancora.y });
    return {
      contur: {
        inchis: curba.contur.inchis,
        varfuri: curba.contur.varfuri.map((v) => ({ p: m(v.p), s: v.s.tip === 'C' ? { tip: 'C', c1: m(v.s.c1), c2: m(v.s.c2) } : v.s })),
      },
      s: curba.s,
    };
  }, [editat, curba, ancora]);
  // Un text vertical (ADR 0141) sau în casetă (ADR 0142) stă drept: nu urmează curba, chiar dacă ancora e pe una.
  const curbaActiva = drept || form.textVertical || form.caseta !== 'fara' ? null : curbaPosibila;
  const rezFont = fonturi.get(form.font);
  // Raportul majusculei fontului ales (ADR 0138 §1): pt are nevoie de el; null cât fontul nu e adus.
  const raport = rezFont?.ok ? raportMajuscula(rezFont.font) : null;
  // Mărimea în pt a unui text ales, când îi vine fontul.
  useEffect(() => {
    if (asteaptaMarime === null || raport === null) return;
    const marime = textMarime(asteaptaMarime, 'pt', raport);
    setForm((f) => ({ ...f, inaltime: marime }));
    setExacta({ text: marime, unitate: 'pt', mm: asteaptaMarime });
    setAsteaptaMarime(null);
  }, [asteaptaMarime, raport]);
  useEffect(() => {
    if (modul === null || modul === 'eroare' || fonturi.has(form.font)) return;
    let viu = true;
    const id = form.font;
    void modul.incarcaFont(id).then((r) => { if (viu) setFonturi((m) => new Map(m).set(id, r)); });
    return () => { viu = false; };
  }, [modul, form.font, fonturi]);

  /** Numele arătat al unui font: din lista lui; altfel cel din blocul editat, sau cel din id. */
  const numeFont = (id: string): string => {
    const inclus = FONTURI_INCLUSE.find((f) => f.id === id);
    if (inclus) return inclus.nume;
    const m = mele.find((f) => f.id === id);
    if (m) return m.nume.complet;
    const s = sistem.find((f) => f.id === id);
    if (s) return s.complet;
    if (editat && editat.bloc.font === id && editat.bloc.numeFont) return editat.bloc.numeFont;
    const sursa = sursaFont(id);
    if (sursa?.fel === 'google') return `${sursa.familie} ${numeVarianta(sursa.varianta)}`;
    if (sursa?.fel === 'sistem') return sursa.postscript;
    return id;
  };
  // Un font cu o singură linie (ADR 0140): trăsături de gravat, fără aldin.
  const linieFont = rezFont?.ok === true && rezFont.font.linie;
  const p = parametri(form, FONTURI_INCLUSE.some((f) => f.id === form.font) ? null : numeFont(form.font), curbaActiva, linieFont, raport, exacta);
  const asezat = useMemo(() => {
    if (modul === null || modul === 'eroare' || !rezFont?.ok || typeof p === 'string') return null;
    const dreptul = modul.aseazaText(rezFont.font, p);
    if (!p.curba) return dreptul;
    const c = p.curba;
    return modul.aseazaPeCurba(dreptul, { contur: { inchis: c.inchis, varfuri: c.varfuri }, s: c.s, pozitie: c.pozitie, distanta: c.distanta,
      invers: c.invers, orientare: c.orientare, intinsa: c.intinsa }, dreptul.majuscula, p.aliniere);
  }, [modul, rezFont, typeof p === 'string' ? p : JSON.stringify(p)]);
  const lungimeCurba = useMemo(() => (curbaPosibila && modul !== null && modul !== 'eroare' ? modul.lungimeCurba(curbaPosibila.contur) : 0), [curbaPosibila, modul]);

  const mesaj = ((): string | null => {
    if (motiv) return motiv;
    if (modul === 'eroare') return t('editare.text.neincarcat');
    if (rezFont && !rezFont.ok) return textIncarcare(rezFont, numeFont(form.font));
    if (typeof p === 'string' && p !== 'asteapta' && !(p === 'continut' && form.continut === '')) return t(`editare.text.gresit.${p}`);
    if (asezat && asezat.raport['aldin-esuat'] > 0) return t('editare.text.aldin-esuat', { n: asezat.raport['aldin-esuat'] });
    if (asezat && asezat.raport['caseta-prea-mica'] > 0) return t('editare.text.caseta.prea-mica');
    if (asezat && asezat.caractereLipsa.length > 0) return t('editare.text.lipsa', { n: asezat.raport.lipsa, caractere: asezat.caractereLipsa.join(' ') });
    if (!editat && !ancora) return t('editare.text.ancora');
    return null;
  })();
  // O literă pe care aldinul n-a putut-o îngroșa lipsește din text: un asemenea text nu se pune pe foaie (ADR 0123).
  // Un text care nu încape în casetă (ADR 0142) nu se pune pe foaie.
  const gata = !!asezat && asezat.glife.length > 0 && asezat.raport['aldin-esuat'] === 0 && asezat.raport['caseta-prea-mica'] === 0
    && typeof p !== 'string' && !doarCitire;
  // Blocul ține înălțimea desenată: cu o casetă, cea care a încăput.
  const bloc = (q: Omit<BlocText, 'amprenta'>, a: TextAsezat): Omit<BlocText, 'amprenta'> => (q.caseta ? { ...q, inaltime: a.inaltime } : q);
  // Ce spune caseta: înălțimea care a încăput și mărimea textului (cutia literelor tăiate).
  const stareCaseta = ((): string | null => {
    if (!asezat || typeof p === 'string' || !p.caseta || asezat.glife.length === 0 || asezat.raport['caseta-prea-mica'] > 0) return null;
    const c = asezat.glife.map((g) => g.cutie).reduce((x, y) => ({ minX: Math.min(x.minX, y.minX), minY: Math.min(x.minY, y.minY), maxX: Math.max(x.maxX, y.maxX), maxY: Math.max(x.maxY, y.maxY) }));
    // Majuscula tăiată (ADR 0138 §2): cea care a încăput, la înălțimea literelor.
    const date = { majuscula: douaZecimale(asezat.majuscula), latime: douaZecimale(c.maxX - c.minX), inaltime: douaZecimale(c.maxY - c.minY) };
    return t(p.caseta.fel === 'limita' && asezat.inaltime < p.caseta.ceruta ? 'editare.text.caseta.micsorat' : 'editare.text.caseta.stare', date);
  })();
  // Sub mărime, în pt și in: majusculele pe care le dă (în mm, la 100 %); sub proporții, majusculele tăiate (ADR 0138).
  const notaMarime = typeof p !== 'string' && form.unitate !== 'mm'
    ? t('editare.text.marime.majuscule', { mm: douaZecimale(p.caseta?.fel === 'scala' && asezat ? asezat.inaltime : p.inaltime) }) : null;
  const notaProportii = typeof p !== 'string' && p.proportii && p.proportii.inaltime !== 100 && asezat
    ? t('editare.text.proportii.taiate', { mm: douaZecimale(asezat.majuscula) }) : null;
  /** Mărimea arătată când o dă caseta (scalat la ea): în unitatea aleasă. */
  const marimeDinCaseta = (mm: number): string => (form.unitate === 'mm' ? textNumar(Math.round(mm * 100) / 100) : textMarime(mm, form.unitate, raport ?? 1));
  /** O altă unitate a mărimii (ADR 0138 §1): numărul se convertește, textul rămâne cum e; pt cere fontul adus. */
  const schimbaUnitatea = (u: UnitateMarime): void => {
    if (u === form.unitate || (raport === null && (u === 'pt' || form.unitate === 'pt'))) return;
    const scrisa = citesteNumar(form.inaltime);
    const mm = scrisa === null ? null
      : exacta && exacta.text === form.inaltime && exacta.unitate === form.unitate ? exacta.mm : majusculaDinMarime(scrisa, form.unitate, raport ?? 1);
    if (mm === null) {
      scrie({ ...form, unitate: u });
      return;
    }
    const marime = u === 'mm' ? textNumar(rotunjesteMarime(mm, 'mm')) : textMarime(mm, u, raport ?? 1);
    scrie({ ...form, unitate: u, inaltime: marime });
    setExacta({ text: marime, unitate: u, mm });
  };
  const trimite = (cerere: CerereText): void => {
    const r = ruleaza(cerere);
    setMotiv(r.ok ? null : t(r.motiv));
  };
  const adauga = (): void => {
    if (!gata || !ancora || modul === null || modul === 'eroare' || typeof p === 'string' || !asezat) return;
    trimite({ fel: 'nou', loc: ancora, piesa: (id, scula, grosime) => modul.piesaText(asezat, bloc(p, asezat), id, scula, undefined, grosime) });
  };
  const aplica = (): void => {
    if (!gata || !editat || modul === null || modul === 'eroare' || typeof p === 'string' || !asezat) return;
    trimite({ fel: 'editat', instanta: editat.instanta, piesa: (vechi, grosime) => modul.piesaText(asezat, bloc(p, asezat), vechi.id, undefined, vechi, grosime) });
  };
  /** Fontul ales s-a schimbat în bibliotecă (încărcat, descărcat, șters): listele se recitesc, fontul se caută din nou. */
  const schimbat = (id?: string): void => {
    if (modul === null || modul === 'eroare') return;
    reincarcaListe(modul);
    if (id) modul.uitaFont(id);
    setFonturi(new Map());
  };
  // Un font Google care lipsește din bibliotecă (alt calculator, biblioteca golită): se descarcă din nou, la clic.
  const sursa = sursaFont(form.font);
  const descarcaDinNou = (): void => {
    if (modul === null || modul === 'eroare' || sursa?.fel !== 'google' || descarc) return;
    setDescarc(true);
    void descarcaInBiblioteca(modul, sursa.familie, sursa.varianta).then((r) => {
      setDescarc(false);
      if (r.ok) schimbat(r.id);
      else setMotiv(t(`editare.fonturi.google.${r.motiv}`));
    });
  };

  const inLista = FONTURI_INCLUSE.some((f) => f.id === form.font) || mele.some((f) => f.id === form.font) || sistem.some((f) => f.id === form.font);
  return (
    <>
      <div className="insula panou-retea panou-text" role="group" aria-label={t('editare.text.sectiune')} data-testid="panou-text" style={stil}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.preventDefault();
          e.stopPropagation();
          onInchide();
        }}>
        <p className="nota-retea" data-testid="text-stare">{editat ? t('editare.text.editezi') : t('editare.text.nou')}</p>
        <textarea className="continut-text" rows={3} value={form.continut} aria-label={t('editare.text.continut')} placeholder={t('editare.text.continut')}
          data-text="continut" spellCheck={false} onChange={(e) => { scrie({ ...form, continut: e.target.value }); }} />
        <label className="camp-retea">
          <span>{t('editare.text.font')}</span>
          <select value={form.font} data-text="font" onChange={(e) => { scrie({ ...form, font: e.target.value }); }}>
            <optgroup label={t('editare.text.grup.incluse')}>
              {FONTURI_INCLUSE.map((f) => <option key={f.id} value={f.id}>{f.nume}</option>)}
            </optgroup>
            {mele.length > 0 ? (
              <optgroup label={t('editare.text.grup.mele')}>
                {mele.map((f) => <option key={f.id} value={f.id}>{f.nume.complet}</option>)}
              </optgroup>
            ) : null}
            {sistem.length > 0 ? (
              <optgroup label={t('editare.text.grup.sistem')}>
                {sistem.map((f) => <option key={f.id} value={f.id}>{f.complet}</option>)}
              </optgroup>
            ) : null}
            {inLista ? null : <option value={form.font}>{t('editare.text.font-lipsa-optiune', { nume: numeFont(form.font) })}</option>}
          </select>
        </label>
        <div className="fonturi-retea">
          <button type="button" data-text="fonturi" title={t('editare.text.fonturi')} onClick={() => { setDialog(true); }} disabled={modul === null || modul === 'eroare'}>
            {t('editare.text.fonturi.buton')}
          </button>
          {rezFont && !rezFont.ok && rezFont.cod === 'lipseste' && sursa?.fel === 'google' ? (
            <button type="button" data-text="descarca-din-nou" disabled={descarc} onClick={descarcaDinNou}>{t('editare.text.font.descarca-din-nou')}</button>
          ) : null}
        </div>
        {/* Aldinul și cursivul sintetic (ADR 0123): pornite, își arată câmpul; la pornire, aldinul propune 3 % din înălțime. Un
            font cu o singură linie (ADR 0140) nu se îngroașă: bifa e oprită, cu motivul. */}
        <label className="bifa-retea" title={linieFont ? t('editare.text.aldin.linie') : undefined}>
          <input type="checkbox" checked={form.aldin && !linieFont} disabled={linieFont} data-text="aldin" onChange={(e) => {
            scrie({ ...form, aldin: e.target.checked, grosime: e.target.checked && form.grosime.trim() === '' ? grosimeImplicita(typeof p === 'string' ? null : majusculaBloc(p)) : form.grosime });
          }} />
          {t('editare.text.aldin')}
        </label>
        {linieFont ? <p className="nota-retea" data-testid="text-linie">{t('editare.text.aldin.linie')}</p> : null}
        {form.aldin && !linieFont ? (
          <label className="camp-retea">
            <span>{t('editare.text.aldin.grosime')}</span>
            <input value={form.grosime} inputMode="decimal" data-text="grosime" onChange={(e) => { scrie({ ...form, grosime: e.target.value }); }} />
          </label>
        ) : null}
        <label className="bifa-retea">
          <input type="checkbox" checked={form.cursiv} data-text="cursiv" onChange={(e) => {
            scrie({ ...form, cursiv: e.target.checked, unghi: e.target.checked && form.unghi.trim() === '' ? '12' : form.unghi });
          }} />
          {t('editare.text.cursiv')}
        </label>
        {form.cursiv ? (
          <label className="camp-retea">
            <span>{t('editare.text.cursiv.unghi')}</span>
            <input value={form.unghi} inputMode="decimal" data-text="unghi" onChange={(e) => { scrie({ ...form, unghi: e.target.value }); }} />
          </label>
        ) : null}
        <label className="bifa-retea">
          <input type="checkbox" checked={form.textVertical} data-text="vertical" onChange={(e) => { scrie({ ...form, textVertical: e.target.checked }); }} />
          {t('editare.text.vertical')}
        </label>
        <label className="camp-retea">
          <span>{t('editare.text.caseta')}</span>
          <select value={form.caseta} data-text="caseta" onChange={(e) => { scrie({ ...form, caseta: FELURI_CASETA.find((x) => x === e.target.value) ?? 'fara' }); }}>
            {FELURI_CASETA.map((x) => <option key={x} value={x}>{t(`editare.text.caseta.${x}`)}</option>)}
          </select>
        </label>
        {form.caseta !== 'fara' ? (['casetaLatime', 'casetaInaltime'] as const).map((c) => (
          <label key={c} className="camp-retea">
            <span>{t(c === 'casetaLatime' ? 'editare.text.caseta.latime' : 'editare.text.caseta.inaltime')}</span>
            <input value={form[c]} inputMode="decimal" data-text={c === 'casetaLatime' ? 'caseta-latime' : 'caseta-inaltime'}
              onChange={(e) => { scrie({ ...form, [c]: e.target.value }); }} />
          </label>
        )) : null}
        {stareCaseta ? <p className="nota-retea" data-testid="text-caseta">{stareCaseta}</p> : null}
        {curbaPosibila && form.textVertical ? <p className="nota-retea" data-testid="text-vertical-curba">{t('editare.text.vertical.curba')}</p> : null}
        {curbaPosibila && !form.textVertical && form.caseta !== 'fara' ? (
          <p className="nota-retea" data-testid="text-caseta-curba">{t('editare.text.caseta.curba')}</p>
        ) : null}
        {curbaPosibila && !form.textVertical && form.caseta === 'fara' ? (
          <fieldset className="curba-text" data-testid="text-curba">
            <legend>{curbaActiva ? t('editare.text.curba.sectiune', { lungime: textNumar(Math.round(lungimeCurba * 100) / 100, true) }) : t('editare.text.curba.drept')}</legend>
            {curbaActiva ? (
              <>
                <label className="camp-retea">
                  <span>{t('editare.text.curba.pozitie')}</span>
                  <select value={form.pozitie} data-text="pozitie" onChange={(e) => { scrie({ ...form, pozitie: POZITII_PE_CURBA.find((x) => x === e.target.value) ?? 'baza' }); }}>
                    {POZITII_PE_CURBA.map((x) => <option key={x} value={x}>{t(`editare.text.curba.pozitie.${x}`)}</option>)}
                  </select>
                </label>
                <label className="camp-retea">
                  <span>{t('editare.text.curba.distanta')}</span>
                  <input value={form.distanta} inputMode="decimal" data-text="distanta" onChange={(e) => { scrie({ ...form, distanta: e.target.value }); }} />
                </label>
                {(['invers', 'verticala', 'intinsa'] as const).map((c) => (
                  <label key={c} className="bifa-retea">
                    <input type="checkbox" checked={form[c]} data-text={c} onChange={(e) => { scrie({ ...form, [c]: e.target.checked }); }} />
                    {t(`editare.text.curba.${c}`)}
                  </label>
                ))}
              </>
            ) : null}
            <button type="button" data-text={curbaActiva ? 'drept' : 'pe-curba'} onClick={() => { setDrept(!drept); setMotiv(null); }}>
              {t(curbaActiva ? 'editare.text.curba.buton-drept' : 'editare.text.curba.buton-curba')}
            </button>
          </fieldset>
        ) : null}
        {/* Mărimea, cu unitatea ei (ADR 0138 §1): în mm și in, majusculele; în pt, mărimea fontului, cu majusculele dedesubt.
            Scalat la casetă (ADR 0142), o dă caseta: câmpul e oprit. */}
        <label className="camp-retea camp-marime">
          <span>{t(form.unitate === 'pt'
            ? (form.caseta === 'scala' ? 'editare.text.marime-font.caseta' : 'editare.text.marime-font')
            : (form.caseta === 'scala' ? 'editare.text.inaltime.caseta' : 'editare.text.inaltime'))}</span>
          {form.caseta === 'scala'
            ? <input value={asezat && asezat.raport['caseta-prea-mica'] === 0 ? marimeDinCaseta(asezat.inaltime) : ''} disabled data-text="inaltime" />
            : <input value={form.inaltime} inputMode="decimal" data-text="inaltime" onChange={(e) => { scrie({ ...form, inaltime: e.target.value }); }} />}
          <select value={form.unitate} data-text="unitate" aria-label={t('editare.text.unitate')} disabled={raport === null}
            onChange={(e) => { schimbaUnitatea(UNITATI_MARIME.find((u) => u === e.target.value) ?? 'mm'); }}>
            {UNITATI_MARIME.map((u) => <option key={u} value={u}>{t(`editare.text.unitate.${u}`)}</option>)}
          </select>
        </label>
        {notaMarime ? <p className="nota-retea" data-testid="text-marime">{notaMarime}</p> : null}
        {/* Proporțiile literelor (ADR 0138 §2), în procente; la altă înălțime, majusculele tăiate dedesubt. */}
        {(['latime', 'inaltimeLitere'] as const).map((c) => (
          <label key={c} className="camp-retea">
            <span>{t(c === 'latime' ? 'editare.text.proportii.latime' : 'editare.text.proportii.inaltime')}</span>
            <input value={form[c]} inputMode="decimal" data-text={c === 'latime' ? 'latime' : 'inaltime-litere'}
              onChange={(e) => { scrie({ ...form, [c]: e.target.value }); }} />
          </label>
        ))}
        {notaProportii ? <p className="nota-retea" data-testid="text-proportii">{notaProportii}</p> : null}
        {/* Crenarea fontului (ADR 0138 §3); textul vertical n-o folosește. */}
        <label className="bifa-retea" title={form.textVertical ? t('editare.text.crenare.vertical') : undefined}>
          <input type="checkbox" checked={form.crenare} disabled={form.textVertical} data-text="crenare"
            onChange={(e) => { scrie({ ...form, crenare: e.target.checked }); }} />
          {t('editare.text.crenare')}
        </label>
        {(['spatiere', 'interlinie'] as const).map((c) => (
          <label key={c} className="camp-retea">
            <span>{t(c === 'interlinie' && form.textVertical ? 'editare.text.interlinie.coloane' : `editare.text.${c}`)}</span>
            <input value={form[c]} inputMode="decimal" data-text={c} onChange={(e) => { scrie({ ...form, [c]: e.target.value }); }} />
          </label>
        ))}
        <div className="fel-retea" role="radiogroup" aria-label={t('editare.text.aliniere')}>
          {ALINIERI.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={form.aliniere === a} aria-pressed={form.aliniere === a} data-text-aliniere={a}
              onClick={() => { scrie({ ...form, aliniere: a }); }}>
              {t(form.textVertical ? `editare.text.aliniere.${ALINIERI_VERTICALE[a]}` : `editare.text.aliniere.${a}`)}
            </button>
          ))}
        </div>
        {asezat ? <Previzualizare asezat={asezat} /> : null}
        {mesaj ? <p className="motiv-retea" role="status" data-testid="text-motiv">{mesaj}</p> : null}
        <div className="butoane-retea">
          <button type="button" className="principal" data-text="adauga" disabled={!gata || !ancora} onClick={adauga}>{t('editare.text.adauga')}</button>
          {editat ? <button type="button" data-text="aplica" disabled={!gata} onClick={aplica}>{t('editare.text.aplica')}</button> : null}
          <button type="button" data-text="inchide" onClick={onInchide}>{t('editare.retea.inchide')}</button>
        </div>
      </div>
      {/* Fereastra stă pe `body`, peste panou și peste bare, ca celelalte ferestre ale aplicației. */}
      {dialog && modul !== null && modul !== 'eroare' ? createPortal(
        <Suspense fallback={null}>
          <DialogFonturi modul={modul} ales={form.font} textProba={form.continut.split('\n').find((r) => r.trim() !== '')?.slice(0, 60) ?? ''} onSchimbat={schimbat} onFoloseste={(id) => { scrie({ ...form, font: id }); }}
            onInchide={() => { setDialog(false); }} />
        </Suspense>,
        document.body,
      ) : null}
    </>
  );
}
