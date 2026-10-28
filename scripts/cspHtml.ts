/**
 * Amprentele CSP ale scripturilor inline dintr-o pagină (ADR 0098). În `index.html` e unul singur: harta importurilor, scrisă
 * de Vite (`build.chunkImportMap`). CSP-ul, fără `unsafe-inline`, o lasă să ruleze doar prin amprenta ei exactă: sha256 al
 * textului dintre etichete, în base64. Le folosesc build-ul (meta-ul, `vite.config.ts`), poarta lui, publicarea (antetul de
 * pe Hosting, `scripts/pregateste-publicare.ts`) și publicarea simulată a probelor PWA.
 */
import { createHash } from 'node:crypto';
import { cspCu } from '../shared/csp.ts';

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/** Amprenta fiecărui script fără `src`, în ordinea din pagină, în forma din CSP (`'sha256-…'`). */
export function hashuriInline(html: string): string[] {
  const r: string[] = [];
  for (const m of html.matchAll(SCRIPT)) {
    if (/\bsrc\s*=/i.test(m[1] ?? '')) continue;
    r.push(`'sha256-${createHash('sha256').update(m[2] ?? '', 'utf8').digest('base64')}'`);
  }
  return r;
}

/** CSP-ul paginii: cel din `shared/csp.ts`, cu amprentele scripturilor ei inline. */
export const cspPentru = (html: string): string => cspCu(hashuriInline(html));
