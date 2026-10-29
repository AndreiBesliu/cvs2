import { useMemo, type ReactElement } from 'react';
import { t } from '../i18n/t.ts';

type TextAsezat = import('../text/asezare.ts').TextAsezat;

/** Calea SVG a textului așezat (Y în sus devine Y în jos) și cutia ei: previzualizarea din panou. */
export function caleText(a: TextAsezat): { readonly d: string; readonly cutie: readonly [number, number, number, number] } | null {
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

/** Previzualizarea unui text așezat (ADR 0106, ADR 0108): contururile lui, cum se vor tăia, potrivite în cutia lor. */
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
      <path d={c.d} fillRule="evenodd" />
    </svg>
  );
}
