import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { cuMesaje, t } from '../i18n/t.ts';
import { LIMITE_TEXT, type BlocText } from '../model/blocText.ts';
import { FONT_IMPLICIT, FONTURI_INCLUSE } from '../text/fonturi.ts';
import { numeVarianta, sursaFont } from '../text/iduriFont.ts';
import type { AliniereText } from '../text/asezare.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { CerereText } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { descarcaInBiblioteca } from './fonturiGoogleClient.ts';
import { textRefuzFont } from './texteFont.ts';

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

/** Ce scrie omul în panou; câmpurile numerice rămân text până la citire (un câmp greșit se spune, nu se rotunjește). */
type Formular = {
  readonly continut: string; readonly font: string; readonly inaltime: string; readonly spatiere: string; readonly interlinie: string;
  readonly aliniere: AliniereText;
};

const CHEIE = 'cncvs2.text';
const ALINIERI: readonly AliniereText[] = ['stanga', 'centru', 'dreapta'];

/** Alegerile de data trecută (fontul, mărimile, alinierea), fără text: ținute în browser, ca la celelalte panouri. */
function formularSalvat(): Formular {
  const baza: Formular = { continut: '', font: FONT_IMPLICIT, inaltime: '20', spatiere: '0', interlinie: '1', aliniere: 'stanga' };
  try {
    const s = JSON.parse(localStorage.getItem(CHEIE) ?? 'null') as Partial<Record<keyof Formular, unknown>> | null;
    if (!s || typeof s !== 'object') return baza;
    const sir = (v: unknown, implicit: string): string => (typeof v === 'string' ? v : implicit);
    return {
      ...baza,
      font: typeof s.font === 'string' && sursaFont(s.font) ? s.font : baza.font,
      inaltime: sir(s.inaltime, baza.inaltime), spatiere: sir(s.spatiere, baza.spatiere), interlinie: sir(s.interlinie, baza.interlinie),
      aliniere: ALINIERI.find((a) => a === s.aliniere) ?? baza.aliniere,
    };
  } catch {
    return baza;
  }
}

function salveaza(f: Formular): void {
  try {
    localStorage.setItem(CHEIE, JSON.stringify({ font: f.font, inaltime: f.inaltime, spatiere: f.spatiere, interlinie: f.interlinie, aliniere: f.aliniere }));
  } catch {
    // Fără stocare (fereastră privată): alegerile țin cât pagina.
  }
}

/** Parametrii citiți din formular, în marginile blocului (ADR 0105 §3), sau cheia câmpului greșit. */
function parametri(f: Formular, numeFont: string | null): Omit<BlocText, 'amprenta'> | 'continut' | 'inaltime' | 'spatiere' | 'interlinie' {
  if (f.continut.trim() === '' || f.continut.length > LIMITE_TEXT.caractere) return 'continut';
  const inaltime = citesteNumar(f.inaltime);
  if (inaltime === null || inaltime < LIMITE_TEXT.inaltimeMinima || inaltime > LIMITE_TEXT.inaltimeMaxima) return 'inaltime';
  const spatiere = citesteNumar(f.spatiere, true);
  if (spatiere === null || Math.abs(spatiere) > LIMITE_TEXT.spatiere) return 'spatiere';
  const interlinie = citesteNumar(f.interlinie);
  if (interlinie === null || interlinie < LIMITE_TEXT.interlinieMinima || interlinie > LIMITE_TEXT.interlinieMaxima) return 'interlinie';
  const bloc = { continut: f.continut, font: f.font, inaltime, spatiere, interlinie, aliniere: f.aliniere };
  return numeFont ? { ...bloc, numeFont: numeFont.slice(0, LIMITE_TEXT.numeFont) } : bloc;
}

/** Mesajul unui font care nu s-a putut aduce (ADR 0106 §2): lipsește aici, cere permisiunea, e o instanță necitită… */
function textIncarcare(r: Exclude<RezultatIncarcare, { ok: true }>, nume: string): string {
  switch (r.cod) {
    case 'lipseste': return t('editare.text.font.lipseste', { nume });
    case 'permisiune': return t('editare.text.font.permisiune', { nume });
    case 'instanta-variabila': return t('editare.text.font.instanta', { stil: r.detaliu ?? nume });
    case 'fara-stocare': return t('editare.text.font.fara-stocare');
    case 'retea': return t('editare.text.font.retea', { detaliu: r.detaliu ?? '' });
    case 'necunoscut': return t('editare.text.font.necunoscut');
    default: return textRefuzFont(r.cod, r.detaliu);
  }
}

/** Calea SVG a textului așezat (Y în sus devine Y în jos) și cutia ei: previzualizarea din panou. */
function caleText(a: TextAsezat): { readonly d: string; readonly cutie: readonly [number, number, number, number] } | null {
  let d = '', x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const n = (v: number): string => (Math.round(v * 1000) / 1000).toString();
  const pune = (x: number, y: number): string => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (-y < y0) y0 = -y;
    if (-y > y1) y1 = -y;
    return `${n(x)} ${n(-y)}`;
  };
  for (const g of a.glife) {
    for (const c of g.cai) {
      const v = c.varfuri;
      if (v.length === 0) continue;
      d += `M${pune(v[0]!.p.x, v[0]!.p.y)}`;
      v.forEach((q, k) => {
        const urm = v[(k + 1) % v.length]!.p;
        d += q.s.tip === 'C' ? `C${pune(q.s.c1.x, q.s.c1.y)} ${pune(q.s.c2.x, q.s.c2.y)} ${pune(urm.x, urm.y)}` : `L${pune(urm.x, urm.y)}`;
      });
      d += 'Z';
    }
  }
  return d === '' ? null : { d, cutie: [x0, y0, x1, y1] };
}

function Previzualizare({ asezat }: { readonly asezat: TextAsezat }): ReactElement | null {
  const c = useMemo(() => caleText(asezat), [asezat]);
  if (!c) return null;
  const [x0, y0, x1, y1] = c.cutie;
  const m = Math.max(x1 - x0, y1 - y0) * 0.04;
  return (
    <svg className="previzualizare-text" viewBox={`${x0 - m} ${y0 - m} ${x1 - x0 + 2 * m} ${y1 - y0 + 2 * m}`} preserveAspectRatio="xMidYMid meet"
      role="img" aria-label={t('editare.text.previzualizare')} data-testid="text-previzualizare">
      <path d={c.d} fillRule="evenodd" />
    </svg>
  );
}

/**
 * Panoul uneltei Text (ADR 0105 §5, ADR 0106 §5): textul (pe rânduri), fontul (cele incluse, „Fonturile mele”, ale
 * sistemului), înălțimea majusculei, spațierea literelor, distanța dintre rânduri și alinierea, cu previzualizarea textului.
 * „Adaugă” pune un text nou în ancoră (clicul pe foaie); „Aplică” înlocuiește textul ales (clicul pe un text, sau un text
 * ales înainte de unealtă), cu blocul lui încărcat în panou. „Fonturi…” deschide fereastra fonturilor: încărcarea, Google
 * Fonts, permisiunea pentru fonturile sistemului. Modulul textului vine la prima deschidere, fontul la prima folosire;
 * caracterele pe care fontul nu le are se spun pe loc, ca și un font care lipsește de pe calculatorul ăsta.
 */
export function PanouText({ ancora, editat, ruleaza, onInchide, doarCitire, stil }: {
  readonly ancora: Punct | null;
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
    setForm({
      continut: b.continut, font: b.font, inaltime: textNumar(b.inaltime), spatiere: textNumar(b.spatiere),
      interlinie: textNumar(b.interlinie), aliniere: b.aliniere,
    });
    setMotiv(null);
  }, [cheieEditat]);
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
  const p = parametri(form, FONTURI_INCLUSE.some((f) => f.id === form.font) ? null : numeFont(form.font));
  const asezat = useMemo(() => {
    if (modul === null || modul === 'eroare' || !rezFont?.ok || typeof p === 'string') return null;
    return modul.aseazaText(rezFont.font, p);
  }, [modul, rezFont, typeof p === 'string' ? p : JSON.stringify(p)]);

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
          <DialogFonturi modul={modul} ales={form.font} onSchimbat={schimbat} onFoloseste={(id) => { scrie({ ...form, font: id }); }}
            onInchide={() => { setDialog(false); }} />
        </Suspense>,
        document.body,
      ) : null}
    </>
  );
}
