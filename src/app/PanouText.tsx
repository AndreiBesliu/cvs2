import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { t } from '../i18n/t.ts';
import { LIMITE_TEXT, type BlocText } from '../model/blocText.ts';
import { FONT_IMPLICIT, FONTURI_INCLUSE, esteFontInclus, type IdFont } from '../text/fonturi.ts';
import type { AliniereText } from '../text/asezare.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { CerereText } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';

type ModulText = typeof import('../text/calcul.ts');
type Punct = { readonly x: number; readonly y: number };

/** Ce scrie omul în panou; câmpurile numerice rămân text până la citire (un câmp greșit se spune, nu se rotunjește). */
type Formular = {
  readonly continut: string; readonly font: IdFont; readonly inaltime: string; readonly spatiere: string; readonly interlinie: string;
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
      font: typeof s.font === 'string' && esteFontInclus(s.font) ? s.font : baza.font,
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
function parametri(f: Formular): Omit<BlocText, 'amprenta'> | 'continut' | 'inaltime' | 'spatiere' | 'interlinie' {
  if (f.continut.trim() === '' || f.continut.length > LIMITE_TEXT.caractere) return 'continut';
  const inaltime = citesteNumar(f.inaltime);
  if (inaltime === null || inaltime < LIMITE_TEXT.inaltimeMinima || inaltime > LIMITE_TEXT.inaltimeMaxima) return 'inaltime';
  const spatiere = citesteNumar(f.spatiere, true);
  if (spatiere === null || Math.abs(spatiere) > LIMITE_TEXT.spatiere) return 'spatiere';
  const interlinie = citesteNumar(f.interlinie);
  if (interlinie === null || interlinie < LIMITE_TEXT.interlinieMinima || interlinie > LIMITE_TEXT.interlinieMaxima) return 'interlinie';
  return { continut: f.continut, font: f.font, inaltime, spatiere, interlinie, aliniere: f.aliniere };
}

/**
 * Panoul uneltei Text (ADR 0105 §5): textul (pe rânduri), fontul, înălțimea majusculei, spațierea literelor, distanța dintre
 * rânduri și alinierea. „Adaugă” pune un text nou în ancoră (clicul pe foaie); „Aplică” înlocuiește textul ales (clicul pe
 * un text, sau un text ales înainte de unealtă), cu blocul lui încărcat în panou. Modulul textului (cititorul, așezarea,
 * piesa) vine la prima deschidere, fontul la prima folosire; caracterele pe care fontul nu le are se spun pe loc.
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
  const [fonturi, setFonturi] = useState<ReadonlyMap<IdFont, Awaited<ReturnType<ModulText['incarcaFont']>>>>(new Map());
  const [motiv, setMotiv] = useState<string | null>(null);
  const scrie = (f: Formular): void => { setForm(f); salveaza(f); setMotiv(null); };

  useEffect(() => {
    let viu = true;
    import('../text/calcul.ts').then((m) => { if (viu) setModul(m); }, () => { if (viu) setModul('eroare'); });
    return () => { viu = false; };
  }, []);
  // Textul ales intră în panou: conținutul și alegerile lui (o dată pe instanță și pe bloc).
  const cheieEditat = editat ? `${editat.instanta}:${editat.bloc.amprenta}` : null;
  useEffect(() => {
    if (!editat) return;
    const b = editat.bloc;
    setForm({
      continut: b.continut, font: esteFontInclus(b.font) ? b.font : FONT_IMPLICIT, inaltime: textNumar(b.inaltime), spatiere: textNumar(b.spatiere),
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

  const p = parametri(form);
  const asezat = useMemo(() => {
    if (modul === null || modul === 'eroare' || !rezFont?.ok || typeof p === 'string') return null;
    return modul.aseazaText(rezFont.font, p);
  }, [modul, rezFont, typeof p === 'string' ? p : JSON.stringify(p)]);

  const mesaj = ((): string | null => {
    if (motiv) return motiv;
    if (modul === 'eroare') return t('editare.text.neincarcat');
    if (rezFont && !rezFont.ok) return t('editare.text.font-refuzat', { cod: rezFont.cod });
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

  return (
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
        <select value={form.font} data-text="font" onChange={(e) => { if (esteFontInclus(e.target.value)) scrie({ ...form, font: e.target.value }); }}>
          {FONTURI_INCLUSE.map((f) => <option key={f.id} value={f.id}>{f.nume}</option>)}
        </select>
      </label>
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
      {mesaj ? <p className="motiv-retea" role="status" data-testid="text-motiv">{mesaj}</p> : null}
      <div className="butoane-retea">
        <button type="button" className="principal" data-text="adauga" disabled={!gata || !ancora} onClick={adauga}>{t('editare.text.adauga')}</button>
        {editat ? <button type="button" data-text="aplica" disabled={!gata} onClick={aplica}>{t('editare.text.aplica')}</button> : null}
        <button type="button" data-text="inchide" onClick={onInchide}>{t('editare.retea.inchide')}</button>
      </div>
    </div>
  );
}
