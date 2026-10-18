/** Commit-ul din care s-a făcut build-ul, pus de `vite.config.ts`. Există doar în aplicație, nu și în testele Node. */
declare const __VERSIUNE__: string;

/** Foile de stil se importă doar pentru efectul lor; Vite le scoate în fișiere separate la build. */
declare module '*.css';

/** Vite: `PROD` e adevărat doar în build (`vite build`); serverul de dezvoltare n-are worker PWA (ADR 0045 §7). */
interface ImportMetaEnv {
  readonly PROD: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
