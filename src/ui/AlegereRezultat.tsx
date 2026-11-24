import { t } from '../i18n/t.ts';

/** Ce se face dintr-o imagine adusă cu „Importă…” (ADR 0310 §7): vectori (trasarea, ADR 0220) sau relief. */
export type RezultatImagine = 'vectori' | 'relief';

/**
 * Alegerea de sus a ferestrei unei imagini (ADR 0310 §7): Vectori (trasarea de azi) sau Relief. „Doar imaginea” (ADR 0272)
 * rămâne butonul din piciorul ferestrei trasării. Litofania vine cu felia ei (18.1↑f).
 */
export function AlegereRezultat({ ales, onAlege, dezactivat = false }: {
  readonly ales: RezultatImagine; readonly onAlege: (r: RezultatImagine) => void; readonly dezactivat?: boolean;
}) {
  return (
    <div className="segmentat" role="radiogroup" aria-label={t('import.rezultat')} data-testid="import-rezultat">
      {(['vectori', 'relief'] as const).map((r) => (
        <label key={r}>
          <input type="radio" name="import-rezultat" value={r} checked={ales === r} disabled={dezactivat} data-camp={`import-rezultat-${r}`}
            onChange={() => { onAlege(r); }} />
          {t(`import.rezultat.${r}`)}
        </label>
      ))}
    </div>
  );
}
