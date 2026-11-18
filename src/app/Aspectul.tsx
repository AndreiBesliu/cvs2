/**
 * Fereastra Aspectul (ADR 0250 §3–§5, felia 28.1↑b; planșa „Aspectul” a schițelor): cele patru aranjamente, cu o miniatură
 * și un rând de descriere, tema și „Butoane mari”. Totul se aplică pe loc: densitatea pe `<html>` (`data-densitate`), tema
 * prin aplicație (butonul din bară o arată). Renunță sau Escape pun la loc ce era când s-a deschis fereastra; Păstrează ține
 * aranjamentul și densitatea pe dispozitiv (`cncvs2.aranjament`), iar tema rămâne cum o ține deja aplicația (`cncvs2.tema`).
 *
 * Doar aranjamentele pe care build-ul le are se pot alege (azi, Insule); celelalte se văd, „în curând”, cu descrierea lor.
 * Vine la cerere, cu mesajele panourilor (`carcasa`).
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import {
  alegereaDeAcum, CHEIE_ARANJAMENT, IDURI_ARANJAMENT, scrieAlegerea, TEME, type Alegere, type Densitate, type IdAranjament, type Tema,
} from '../ui/alegereAranjament.ts';
import { ARANJAMENTE_DISPONIBILE } from '../ui/aranjament.ts';
import { useLimba } from '../ui/useLimba.ts';
import './aspect.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Pune alegerea pe `<html>`: CSS-ul densității o citește de acolo. */
function aplica(a: Alegere): void {
  document.documentElement.dataset['aranjament'] = a.aranjament;
  document.documentElement.dataset['densitate'] = a.densitate;
}

export function Aspectul({ tema, onTema, onInchide, focusInapoi }: {
  /** Tema de acum a aplicației. */
  readonly tema: Tema;
  /** Schimbă tema aplicației, pe loc (și o ține, ca butonul din bară). */
  readonly onTema: (tema: Tema) => void;
  readonly onInchide: () => void;
  /** Unde era focusul înainte: acolo se întoarce la închidere. */
  readonly focusInapoi: Element | null;
}): ReactNode {
  useLimba();
  const [inainte] = useState(() => ({ ...alegereaDeAcum(document.documentElement.dataset), tema }));
  const [alegere, setAlegere] = useState<Alegere>(() => alegereaDeAcum(document.documentElement.dataset));
  const ales = useRef<HTMLInputElement>(null);
  // Focusul pe aranjamentul ales; la închidere (curățarea rulează după ce aplicația nu mai e inertă) se întoarce unde era.
  useEffect(() => {
    ales.current?.focus();
    return () => { if (focusInapoi instanceof HTMLElement) focusInapoi.focus(); };
  }, [focusInapoi]);

  const schimba = (a: Alegere): void => {
    aplica(a);
    setAlegere(a);
  };
  const renunta = (): void => {
    aplica(inainte);
    if (tema !== inainte.tema) onTema(inainte.tema);
    onInchide();
  };
  const pastreaza = (): void => {
    try {
      localStorage.setItem(CHEIE_ARANJAMENT, scrieAlegerea(alegere));
    } catch {
      // Fără stocare (navigare privată, blocată): alegerea rămâne până la reîncărcare.
    }
    onInchide();
  };
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    renunta();
  };
  const densitate = (mare: boolean): Densitate => (mare ? 'mare' : 'normala');
  const eticheta = (id: IdAranjament): string => {
    if (!ARANJAMENTE_DISPONIBILE.includes(id)) return t('aspect.in-curand');
    return id === 'modern' ? t('aspect.implicit') : '';
  };
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="aspect-titlu" data-testid="dialog-aspect" onKeyDown={tasta}>
      <div className="dialog-cutie dialog-aspect">
        <h2 id="aspect-titlu">{t('vedere.aspect')}</h2>
        <p className="aspect-intro">{t('aspect.intro')}</p>
        <div className="aspect-aranjamente" role="radiogroup" aria-labelledby="aspect-aranjamentul">
          <h3 id="aspect-aranjamentul">{t('aspect.aranjamentul')}</h3>
          {IDURI_ARANJAMENT.map((id) => {
            const poate = ARANJAMENTE_DISPONIBILE.includes(id);
            const e = eticheta(id);
            return (
              <label key={id} className="aspect-card" data-aspect={id}>
                <input ref={alegere.aranjament === id ? ales : undefined} type="radio" name="aspect-aranjament" value={id}
                  checked={alegere.aranjament === id} disabled={!poate}
                  aria-labelledby={e ? `aspect-nume-${id} aspect-eticheta-${id}` : `aspect-nume-${id}`} aria-describedby={`aspect-descriere-${id}`}
                  onChange={() => { schimba({ ...alegere, aranjament: id }); }} />
                <span className={`aspect-mini aspect-mini-${id}`} aria-hidden="true"><i /><i /><i /></span>
                <span className="aspect-text">
                  <span className="aspect-nume">
                    <strong id={`aspect-nume-${id}`}>{t(`aranjament.${id}`)}</strong>
                    {e ? <span id={`aspect-eticheta-${id}`} className="aspect-eticheta">{e}</span> : null}
                  </span>
                  <span id={`aspect-descriere-${id}`} className="aspect-descriere">{t(`aspect.descriere.${id}`)}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="aspect-tema" role="radiogroup" aria-labelledby="aspect-tema">
          <h3 id="aspect-tema">{t('vedere.tema')}</h3>
          <div className="aspect-optiuni">
            {TEME.map((x) => (
              <label key={x}>
                <input type="radio" name="aspect-tema" value={x} checked={tema === x} onChange={() => { onTema(x); }} />
                <span>{t(`tema.${x}`)}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="aspect-comutator">
          <input type="checkbox" role="switch" checked={alegere.densitate === 'mare'} aria-labelledby="aspect-butoane-mari" aria-describedby="aspect-butoane-mari-nota"
            onChange={(ev) => { schimba({ ...alegere, densitate: densitate(ev.currentTarget.checked) }); }} />
          <span id="aspect-butoane-mari">{t('aspect.butoane-mari')}</span>
          <small id="aspect-butoane-mari-nota">{t('aspect.butoane-mari.nota')}</small>
        </label>
        <div className="butoane">
          <button type="button" data-buton="pastreaza" onClick={pastreaza}>{t('aspect.pastreaza')}</button>
          <button type="button" data-buton="renunta" onClick={renunta}>{t('aspect.renunta')}</button>
        </div>
      </div>
    </div>
  );
}
