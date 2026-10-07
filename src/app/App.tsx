import { useEffect, useSyncExternalStore } from 'react';
import { t } from '../i18n/t.ts';
import { LIMBI, type Limba } from '../i18n/tipuri.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { RezultatConfig } from './config.ts';
import type { Jurnal } from './jurnalErori.ts';

type Props = {
  readonly config: RezultatConfig;
  readonly jurnal: Jurnal;
  readonly diagnostic: string | null;
  readonly alegeLimba: (l: Limba) => void;
};

/** Diagnosticul `?diagnostic=eroare-de-randare` aruncă la randare, ca ErrorBoundary-ul să se poată proba pe build. */
function EroareProvocata(): never {
  throw new Error('Eroare de randare provocată (diagnostic)');
}

export function App({ config, jurnal, diagnostic, alegeLimba }: Props) {
  const limbaActiva = useLimba();
  const intrari = useSyncExternalStore(jurnal.asculta, () => jurnal.citeste().length);

  useEffect(() => {
    document.documentElement.lang = limbaActiva;
  }, [limbaActiva]);

  // Pe live, diagnosticul nu există.
  if (diagnostic === 'eroare-de-randare' && config.ok && config.config.instanta !== 'live') return <EroareProvocata />;

  const instanta = config.ok ? config.config.instanta : t('app.instanta.necunoscuta');

  return (
    <main className="schelet">
      <header>
        <h1>{t('app.titlu')}</h1>
        <nav aria-label={t('app.limba')}>
          {LIMBI.map((l) => (
            <button key={l} type="button" aria-pressed={l === limbaActiva} onClick={() => { alegeLimba(l); }}>
              {l.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>
      <p>{t('app.schelet')}</p>
      <p data-testid="instanta">{t('app.instanta', { nume: instanta })}</p>
      {!config.ok && <p role="status">{t('eroare.config', { motiv: config.motiv })}</p>}
      <footer data-testid="jurnal">{t('jurnal.intrari', { n: intrari })}</footer>
    </main>
  );
}
