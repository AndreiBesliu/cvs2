import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { cuMesaje, t } from '../i18n/t.ts';
import type { Contur } from '../geom/conturBaza.ts';
import { LIMITE_TEXT, POZITII_PE_CURBA, type BlocText, type CurbaText } from '../model/blocText.ts';
import { FONT_IMPLICIT, FONTURI_INCLUSE } from '../text/fonturi.ts';
import { numeVarianta, sursaFont } from '../text/iduriFont.ts';
import type { AliniereText } from '../text/asezare.ts';
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
};

/** Curba la care stă textul: conturul în sistemul piesei (originea în ancoră) și distanța ancorei pe el. */
type CurbaAleasa = { readonly contur: Contur; readonly s: number };

const CHEIE = 'cncvs2.text';
const ALINIERI: readonly AliniereText[] = ['stanga', 'centru', 'dreapta'];

/** Alegerile de data trecută (fontul, mărimile, alinierea), fără text: ținute în browser, ca la celelalte panouri. */
function formularSalvat(): Formular {
  const baza: Formular = {
    continut: '', font: FONT_IMPLICIT, inaltime: '20', spatiere: '0', interlinie: '1', aliniere: 'stanga',
    pozitie: 'baza', distanta: '0', invers: false, verticala: false, intinsa: false,
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
    }));
  } catch {
    // Fără stocare (fereastră privată): alegerile țin cât pagina.
  }
}

/**
 * Parametrii citiți din formular, în marginile blocului (ADR 0105 §3), cu curba textului dacă stă pe una (ADR 0108), sau
 * cheia câmpului greșit.
 */
function parametri(f: Formular, numeFont: string | null, curba: CurbaAleasa | null): Omit<BlocText, 'amprenta'> | 'continut' | 'inaltime' | 'spatiere' | 'interlinie' | 'distanta' {
  if (f.continut.trim() === '' || f.continut.length > LIMITE_TEXT.caractere) return 'continut';
  const inaltime = citesteNumar(f.inaltime);
  if (inaltime === null || inaltime < LIMITE_TEXT.inaltimeMinima || inaltime > LIMITE_TEXT.inaltimeMaxima) return 'inaltime';
  const spatiere = citesteNumar(f.spatiere, true);
  if (spatiere === null || Math.abs(spatiere) > LIMITE_TEXT.spatiere) return 'spatiere';
  const interlinie = citesteNumar(f.interlinie);
  if (interlinie === null || interlinie < LIMITE_TEXT.interlinieMinima || interlinie > LIMITE_TEXT.interlinieMaxima) return 'interlinie';
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
  const bloc = { continut: f.continut, font: f.font, inaltime, spatiere, interlinie, aliniere: f.aliniere };
  return { ...bloc, ...(numeFont ? { numeFont: numeFont.slice(0, LIMITE_TEXT.numeFont) } : {}), ...(pe ? { curba: pe } : {}) };
}

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
    setForm((f) => ({
      ...f, continut: b.continut, font: b.font, inaltime: textNumar(b.inaltime), spatiere: textNumar(b.spatiere),
      interlinie: textNumar(b.interlinie), aliniere: b.aliniere,
      ...(b.curba ? {
        pozitie: b.curba.pozitie, distanta: textNumar(b.curba.distanta), invers: b.curba.invers, verticala: b.curba.orientare === 'verticala',
        intinsa: b.curba.intinsa,
      } : {}),
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
  const curbaActiva = drept ? null : curbaPosibila;
  const rezFont = fonturi.get(form.font);
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
  const p = parametri(form, FONTURI_INCLUSE.some((f) => f.id === form.font) ? null : numeFont(form.font), curbaActiva);
  const asezat = useMemo(() => {
    if (modul === null || modul === 'eroare' || !rezFont?.ok || typeof p === 'string') return null;
    const dreptul = modul.aseazaText(rezFont.font, p);
    if (!p.curba) return dreptul;
    const c = p.curba;
    return modul.aseazaPeCurba(dreptul, { contur: { inchis: c.inchis, varfuri: c.varfuri }, s: c.s, pozitie: c.pozitie, distanta: c.distanta,
      invers: c.invers, orientare: c.orientare, intinsa: c.intinsa }, p.inaltime, p.aliniere);
  }, [modul, rezFont, typeof p === 'string' ? p : JSON.stringify(p)]);
  const lungimeCurba = useMemo(() => (curbaPosibila && modul !== null && modul !== 'eroare' ? modul.lungimeCurba(curbaPosibila.contur) : 0), [curbaPosibila, modul]);

  const mesaj = ((): string | null => {
    if (motiv) return motiv;
    if (modul === 'eroare') return t('editare.text.neincarcat');
    if (rezFont && !rezFont.ok) return textIncarcare(rezFont, numeFont(form.font));
    if (typeof p === 'string' && !(p === 'continut' && form.continut === '')) return t(`editare.text.gresit.${p}`);
    if (asezat && asezat.caractereLipsa.length > 0) return t('editare.text.lipsa', { n: asezat.raport.lipsa, caractere: asezat.caractereLipsa.join(' ') });
    if (!editat && !ancora) return t('editare.text.ancora');
    return null;
  })();
  const gata = !!asezat && asezat.glife.length > 0 && typeof p !== 'string' && !doarCitire;
  const trimite = (cerere: CerereText): void => {
    const r = ruleaza(cerere);
    setMotiv(r.ok ? null : t(r.motiv));
  };
  const adauga = (): void => {
    if (!gata || !ancora || modul === null || modul === 'eroare' || typeof p === 'string' || !asezat) return;
    trimite({ fel: 'nou', loc: ancora, piesa: (id, scula) => modul.piesaText(asezat, p, id, scula) });
  };
  const aplica = (): void => {
    if (!gata || !editat || modul === null || modul === 'eroare' || typeof p === 'string' || !asezat) return;
    trimite({ fel: 'editat', instanta: editat.instanta, piesa: (vechi) => modul.piesaText(asezat, p, vechi.id, undefined, vechi) });
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
        {curbaPosibila ? (
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
        {(['inaltime', 'spatiere', 'interlinie'] as const).map((c) => (
          <label key={c} className="camp-retea">
            <span>{t(`editare.text.${c}`)}</span>
            <input value={form[c]} inputMode="decimal" data-text={c} onChange={(e) => { scrie({ ...form, [c]: e.target.value }); }} />
          </label>
        ))}
        <div className="fel-retea" role="radiogroup" aria-label={t('editare.text.aliniere')}>
          {ALINIERI.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={form.aliniere === a} aria-pressed={form.aliniere === a} data-text-aliniere={a}
              onClick={() => { scrie({ ...form, aliniere: a }); }}>
              {t(`editare.text.aliniere.${a}`)}
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
