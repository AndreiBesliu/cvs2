import { useMemo, type ReactElement } from 'react';
import { t } from '../i18n/t.ts';
import { caleText } from './caleText.ts';

type TextAsezat = import('../text/asezare.ts').TextAsezat;

/**
 * Previzualizarea unui text așezat (ADR 0106, ADR 0108): contururile lui, cum se vor tăia, potrivite în cutia lor; trăsăturile
 * unui font cu o singură linie (ADR 0140), desenate cu linia, fără umplere.
 */
export function Previzualizare({ asezat, clasa = 'previzualizare-text', testid = 'text-previzualizare', laStanga = false }: {
  readonly asezat: TextAsezat;
  readonly clasa?: string;
  readonly testid?: string;
  /** Lipită de stânga (proba din lista fonturilor), nu centrată. */
  readonly laStanga?: boolean;
}): ReactElement | null {
  const c = useMemo(() => caleText(asezat), [asezat]);
  if (!c) return null;
  const [x0, y0, x1, y1] = c.cutie;
  const m = Math.max(x1 - x0, y1 - y0) * 0.04;
  return (
    <svg className={clasa} viewBox={`${x0 - m} ${y0 - m} ${x1 - x0 + 2 * m} ${y1 - y0 + 2 * m}`} preserveAspectRatio={laStanga ? 'xMinYMid meet' : 'xMidYMid meet'}
      role="img" aria-label={t('editare.text.previzualizare')} data-testid={testid}>
      {c.d ? <path d={c.d} fillRule="evenodd" /> : null}
      {c.linii ? <path className="trasaturi" d={c.linii} vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  );
}
