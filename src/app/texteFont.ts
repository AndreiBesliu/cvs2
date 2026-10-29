import { t } from '../i18n/t.ts';

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
    default:
      return t('editare.text.refuz.stricat', { detaliu: detaliu ?? cod });
  }
}
