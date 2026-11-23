import { t } from '../i18n/t.ts';
import type { RezultatLegare } from '../model/legareCai.ts';
import { textNumar } from '../ui/numar.ts';

/** Textele legării căilor (ADR 0182, felia 10.3↑o), aceleași în secțiunea booleanului și în panoul Verificare. */

/** Rezultatul legării căilor: câte căi, câte au ieșit, câte închise; apoi ce a rămas nelegat, dacă ceva. */
export function textLegare(r: Extract<RezultatLegare, { readonly ok: true }>): string {
  const baza = r.cai === 1 ? t('editare.legare.inchisa')
    : t('editare.legare.gata', { n: String(r.cai), c: String(r.rezultate), i: String(r.inchise) });
  const x = r.nelegate;
  const parti = [
    x.t > 0 ? t('editare.legare.nelegate.t', { n: String(x.t) }) : '',
    x.operatii > 0 ? t('editare.legare.nelegate.operatii', { n: String(x.operatii) }) : '',
    x.piese > 0 ? t('editare.legare.nelegate.piese', { n: String(x.piese) }) : '',
    x.impartite > 0 ? t('editare.legare.nelegate.impartite', { n: String(x.impartite) }) : '',
  ].filter((s) => s !== '');
  return parti.length > 0 ? `${baza} ${t('editare.legare.nelegate', { lista: parti.join('; ') })}` : baza;
}

/** Motivul unei legări refuzate; la golul prea mare, cu golul, în mm. */
export function motivLegare(r: Extract<RezultatLegare, { readonly ok: false }>, virgula: boolean): string {
  const m = r.motiv;
  return m === 'prea-departe' ? t('editare.legare.motiv.prea-departe', { mm: textNumar(Math.round((r.gol ?? 0) * 1000) / 1000, virgula) })
    : t(`editare.legare.motiv.${m}`);
}
