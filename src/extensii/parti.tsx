/**
 * Părțile comune ale ferestrelor extensiilor (ADR 0231 §B.3, §B.4): cutia unei ferestre (cu capul unei extensii: semnul,
 * numele, de unde vine), lista „Ce poate face” și întrebarea de la „Scoate”. Le folosesc ferestrele de confirmare
 * (`Instalare.tsx`) și fereastra bibliotecii (`Biblioteca.tsx`); vin la cerere, odată cu ele.
 */
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { ADRESA_CATALOG } from '../../shared/biblioteca.ts';
import type { RefuzBiblioteca } from './biblioteca.ts';
import { scoateExtensia, type ExtensieInstalata, type SursaExtensie } from './depozit.ts';
import { textMarime } from './marimeText.ts';
import { Semn } from './Semn.tsx';

/** Adresa absolută a catalogului: pachetele și imaginile bibliotecii stau lângă el. */
export const adresaCatalog = (): string => new URL(ADRESA_CATALOG, location.href).href;
export const textSursa = (s: SursaExtensie): string => (s.fel === 'fisier' ? s.nume : s.fel === 'adresa' ? s.adresa : t('extensii.biblioteca'));
/**
 * Motivul unui refuz, pe înțeles (ADR 0232 §A.4): propoziția lui și, în paranteză, detaliul (fișierul, răspunsul serverului).
 * La lipsa rețelei, detaliul e textul browserului („Failed to fetch”): rămâne doar în jurnal.
 */
export const motivText = (m: RefuzBiblioteca['motiv'], detaliu?: string): string =>
  `${t(`extensii.motiv.${m}` as CheieSimpla)}${detaliu && m !== 'retea' ? ` (${detaliu})` : ''}`;
/** Numele unei permisiuni, cu literă mare (capul unui rând din „Ce poate face”). */
const numePermisiune = (p: string, limba: Limba): string => {
  const s = t(`extensii.permisiune-scurt.${p}` as CheieSimpla);
  return s.charAt(0).toLocaleUpperCase(limba) + s.slice(1);
};

/**
 * O fereastră a extensiilor. Cu `cap`, e o fereastră despre o extensie anume: semnul ei (sau piesa de puzzle) lângă titlu și,
 * dedesubt, de unde vine.
 */
export function Fereastra({ titlu, test, onEscape, cap, children }: {
  readonly titlu: string; readonly test: string; readonly onEscape: () => void;
  readonly cap?: { readonly semn: string | null; readonly sub?: string };
  readonly children: ReactNode;
}): ReactNode {
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    onEscape();
  };
  // O fereastră mai înaltă decât ecranul rămâne sus, cu despre ce extensie e vorba la vedere: butoanele ei sunt lipite jos
  // (`extensii.css`), deci focusul pus pe unul nu o mai derulează la capăt.
  return (
    <div className="dialog dialog-extensii" role="dialog" aria-modal="true" aria-labelledby={`${test}-titlu`} data-testid={test} onKeyDown={tasta}>
      <div className="dialog-cutie">
        {cap ? (
          <div className="confirmare-cap">
            <Semn adresa={cap.semn} marime={48} />
            <div>
              <h2 id={`${test}-titlu`}>{titlu}</h2>
              {cap.sub !== undefined && <p className="confirmare-sursa" data-testid="extensii-despre">{cap.sub}</p>}
            </div>
          </div>
        ) : <h2 id={`${test}-titlu`}>{titlu}</h2>}
        {children}
      </div>
    </div>
  );
}

/**
 * „Ce poate face” (ADR 0231 §B.3): câte un rând pe permisiune, cu numele ei și ce face extensia cu ea; fără permisiuni, o
 * propoziție. `nou`: ce cere în plus o versiune nouă, evidențiat.
 */
export function Poate({ titlu, permisiuni, limba, test = 'extensii-permisiuni', nou = false }: {
  readonly titlu: string; readonly permisiuni: readonly string[]; readonly limba: Limba; readonly test?: string; readonly nou?: boolean;
}): ReactNode {
  return (
    <section className={nou ? 'poate nou' : 'poate'}>
      <h3>{titlu}</h3>
      {permisiuni.length === 0 ? <p data-testid={test}>{t('extensii.instalare.fara-permisiuni')}</p> : (
        <ul data-testid={test}>
          {permisiuni.map((p) => (
            <li key={p} data-permisiune={p}><strong>{numePermisiune(p, limba)}</strong> <span>{t(`extensii.poate.${p}` as CheieSimpla)}</span></li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * „Scoate” întreabă întâi (ADR 0231 §B.4) și spune ce se pierde: extensia și datele ei din browserul acesta (`octeti`: cât
 * ocupă; null sau lipsă: nu s-au putut număra). „Păstrează” are focusul; el și Escape nu schimbă nimic.
 */
export function IntrebareScoatere({ extensie, octeti, limba, onPastreaza, onScoasa }: {
  readonly extensie: ExtensieInstalata; readonly octeti: number | null | undefined; readonly limba: Limba;
  readonly onPastreaza: () => void; readonly onScoasa: (id: string) => void;
}): ReactNode {
  const [scot, setScot] = useState(false);
  const nume = extensie.manifest.nume;
  const scoate = async (): Promise<void> => {
    setScot(true);
    try {
      await scoateExtensia(extensie.id);
    } finally {
      setScot(false);
    }
    onScoasa(extensie.id);
  };
  const ceDate = octeti === undefined || octeti === null ? t('extensii.scoatere.date-oricare')
    : octeti === 0 ? t('extensii.scoatere.fara-date')
      : t('extensii.scoatere.date', { marime: textMarime(octeti, limba) });
  return (
    <Fereastra titlu={t('extensii.scoatere.titlu', { nume })} test="extensii-scoatere" onEscape={() => { if (!scot) onPastreaza(); }}>
      <p data-testid="extensii-scoatere-text">{t('extensii.scoatere.text', { nume })} {ceDate}</p>
      <div className="butoane">
        <button type="button" className="pericol" data-extensii="scoate-confirma" disabled={scot} onClick={() => { void scoate(); }}>
          {t('extensii.gestionare.scoate')}
        </button>
        <button type="button" data-extensii="scoate-pastreaza" autoFocus disabled={scot} onClick={onPastreaza}>{t('extensii.scoatere.pastreaza')}</button>
      </div>
    </Fereastra>
  );
}
