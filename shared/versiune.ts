/**
 * Versiunea build-ului (primele 12 caractere ale commit-ului) stă în antetul lui `index.html`, nu într-o bucată JavaScript
 * (ADR 0098): o publicare fără cod schimbă atunci doar pagina, iar bucățile își păstrează numele și locul din cache. O scrie
 * `vite.config.ts`; o citesc aplicația (raportul, jurnalul, `/admin`) și verificarea publicării (`scripts/publica.ts`).
 */
export const META_VERSIUNE = 'cncvs2-versiune';

/** Ce citește funcția din pagină: `document`, sau un fals în probe. */
interface Pagina {
  querySelector(selector: string): { getAttribute(nume: string): string | null } | null;
}

/** Versiunea din antetul paginii, sau „necunoscută” (o pagină fără ea). */
export function versiuneDin(pagina: Pagina): string {
  return pagina.querySelector(`meta[name="${META_VERSIUNE}"]`)?.getAttribute('content') || 'necunoscută';
}
