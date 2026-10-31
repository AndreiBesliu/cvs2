import { t } from '../i18n/t.ts';

type RezultatIncarcare = import('../text/calcul.ts').RezultatIncarcare;

/**
 * Textul unui refuz al cititorului de fonturi sau al bibliotecii (ADR 0106 §2), comun panoului textului și ferestrei
 * fonturilor: ce înseamnă codul pentru om (un WOFF2 de convertit, un font fără H, „Fonturile mele” pline…).
 */
export function textRefuzFont(cod: string, detaliu?: string): string {
  switch (cod) {
    case 'nu-e-font': case 'woff': case 'woff2': case 'cff2': case 'majuscula': case 'fara-unicode': case 'fata-lipsa': case 'prea-mare':
    case 'biblioteca-plina':
      return t(`editare.text.refuz.${cod}`);
    case 'fara-stocare':
      return t('editare.text.font.fara-stocare');
    case 'tabel-lipsa':
      return t('editare.text.refuz.tabel-lipsa', { tabel: detaliu ?? '' });
    case 'variatii':
      return t('editare.text.refuz.variatii', { detaliu: detaliu ?? '' });
    default:
      return t('editare.text.refuz.stricat', { detaliu: detaliu ?? cod });
  }
}

/** Mesajul unui font care nu s-a putut aduce (ADR 0106 §2): lipsește aici, cere permisiunea, rețeaua… */
export function textIncarcare(r: Exclude<RezultatIncarcare, { ok: true }>, nume: string): string {
  switch (r.cod) {
    case 'lipseste': return t('editare.text.font.lipseste', { nume });
    case 'permisiune': return t('editare.text.font.permisiune', { nume });
    case 'fara-stocare': return t('editare.text.font.fara-stocare');
    case 'retea': return t('editare.text.font.retea', { detaliu: r.detaliu ?? '' });
    case 'necunoscut': return t('editare.text.font.necunoscut');
    default: return textRefuzFont(r.cod, r.detaliu);
  }
}
