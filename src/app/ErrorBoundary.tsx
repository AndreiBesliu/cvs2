import { Component, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { Context, Jurnal } from './jurnalErori.ts';

type Props = { readonly jurnal: Jurnal; readonly context: () => Context; readonly children: ReactNode };
type Stare = { readonly cazut: boolean };

/** Prinde orice eroare de randare, o scrie în jurnalul local și arată ecranul cu „Copiază raportul”. */
export class ErrorBoundary extends Component<Props, Stare> {
  override state: Stare = { cazut: false };

  static getDerivedStateFromError(): Stare {
    return { cazut: true };
  }

  override componentDidCatch(eroare: unknown, info: ErrorInfo): void {
    this.props.jurnal.adauga('randare', eroare, info.componentStack ?? '');
  }

  override render(): ReactNode {
    if (!this.state.cazut) return this.props.children;
    return <EcranEroare jurnal={this.props.jurnal} context={this.props.context} />;
  }
}

function EcranEroare({ jurnal, context }: { readonly jurnal: Jurnal; readonly context: () => Context }) {
  useLimba();
  // Ecranul se randează înainte de `componentDidCatch`: ascultă jurnalul, ca raportul să conțină și eroarea de acum.
  useSyncExternalStore(jurnal.asculta, () => jurnal.citeste().length);
  const [copiere, setCopiere] = useState<'inca-nu' | 'copiat' | 'esuat'>('inca-nu');
  const raport = jurnal.raport(context());

  const copiaza = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(raport);
      setCopiere('copiat');
    } catch {
      setCopiere('esuat');
    }
  };

  return (
    <main className="ecran-eroare" role="alert">
      <h1>{t('eroare.titlu')}</h1>
      <p>{t('eroare.explicatie')}</p>
      <div className="butoane">
        <button type="button" onClick={() => { void copiaza(); }}>{t('eroare.copiaza')}</button>
        <button type="button" onClick={() => { location.reload(); }}>{t('eroare.reincarca')}</button>
      </div>
      {copiere === 'copiat' && <p role="status">{t('eroare.copiat')}</p>}
      {copiere === 'esuat' && <p role="status">{t('eroare.copiere.esuata')}</p>}
      <textarea readOnly value={raport} rows={14} aria-label={t('eroare.copiaza')} />
    </main>
  );
}
