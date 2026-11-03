/**
 * Confirmarea omului la o pornire sau o reluare cerută de o extensie (ADR 0199 §B): o fereastră a lui cvs2, peste toată
 * pagina, pe care extensia, din cadrul ei izolat, n-o poate atinge. Spune cine cere, ce program (numele, liniile, începutul
 * amprentei), ce se reia și, prin WiFi, ce se întâmplă dacă legătura cade. „Pornește” sau „Reia” se poate apăsa abia după o
 * secundă (un clic pornit spre extensie nu cade pe el), focusul stă pe „Nu”, iar Escape e „Nu”.
 */
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n/t.ts';
import type { ProgramIncarcat } from '../machine/program.ts';

/** O cerere care așteaptă omul; `raspunde` o închide (o singură dată). */
export type CerereConfirmare = {
  /** Numărul cererii: fiecare își are fereastra ei (și întârzierea butonului). */
  readonly nr: number;
  readonly fel: 'porneste' | 'reia';
  /** Numele extensiei care cere (din manifestul ei). */
  readonly extensie: string;
  /** Programul arătat: confirmarea e a lui, nu a celui încărcat între timp. */
  readonly program: ProgramIncarcat;
  readonly nume: string | null;
  /** Ce trimite confirmarea: `start`, sau la reluare eliberarea din pauză ori reluarea după o eroare. */
  readonly eveniment: 'start' | 'eliberare' | 'reia';
  /** Linia (de la 1) de la care continuă o reluare după eroare. */
  readonly linie: number;
  readonly wifi: boolean;
  readonly raspunde: (da: boolean) => void;
};

/** Cât stă dezactivat butonul care mișcă mașina, după ce apare fereastra. */
export const INTARZIERE_CONFIRMARE_MS = 1000;

export function ConfirmareMasina({ cerere: c }: { readonly cerere: CerereConfirmare }): ReactNode {
  const [activ, setActiv] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => { setActiv(true); }, INTARZIERE_CONFIRMARE_MS);
    return () => { clearTimeout(id); };
  }, []);
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    // Portalul trimite evenimentul și ferestrei Mașina (React urcă pe arborele lui): Escape-ul de aici nu închide altceva.
    e.preventDefault();
    e.stopPropagation();
    c.raspunde(false);
  };
  const porneste = c.fel === 'porneste';
  return createPortal(
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirmare-masina-titlu" data-testid="confirmare-masina"
      data-fel={c.fel} onKeyDown={tasta}>
      <div className="dialog-cutie">
        <h2 id="confirmare-masina-titlu">{t(porneste ? 'masina.confirmare.porneste.titlu' : 'masina.confirmare.reia.titlu')}</h2>
        <p data-testid="confirmare-masina-cere">{t(porneste ? 'masina.confirmare.porneste.cere' : 'masina.confirmare.reia.cere', { extensie: c.extensie })}</p>
        <p className="masina-program" data-testid="confirmare-masina-program">
          <strong>{c.nume ?? '—'}</strong>{' · '}{t('masina.program.linii', { n: c.program.linii.length })}<br />
          <span className="masina-sha" data-sha={c.program.sha256}>SHA-256 {c.program.sha256.slice(0, 16)}…</span>
        </p>
        {c.eveniment === 'eliberare' && <p>{t('masina.confirmare.reia.pauza')}</p>}
        {c.eveniment === 'reia' && <p>{t('masina.confirmare.reia.eroare', { linie: c.linie })}</p>}
        {c.wifi && porneste && <p className="masina-nota masina-avertisment">{t('masina.wifi.avertisment')}</p>}
        <p>{t('masina.confirmare.atentie')}</p>
        <div className="butoane">
          <button type="button" className="principal" data-masina="confirma" disabled={!activ} onClick={() => { c.raspunde(true); }}>
            {t(porneste ? 'masina.start' : 'masina.eliberare')}
          </button>
          <button type="button" data-masina="confirma-renunta" autoFocus onClick={() => { c.raspunde(false); }}>{t('masina.confirmare.nu')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
