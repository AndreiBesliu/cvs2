/** Foile de stil se importă doar pentru efectul lor; Vite le scoate în fișiere separate la build. */
declare module '*.css';

/**
 * Vite (`define` din `vite.config.ts`): `true` în codul servit de Vite (build și dezvoltare); lipsă în Node, unde testele
 * rulează calculul CAM în proces, fără worker (ADR 0109, `src/jobs/bazinCam.ts`).
 */
declare const __CNCVS2_CONSTRUIT__: true | undefined;

/** Vite: `PROD` e adevărat doar în build (`vite build`); serverul de dezvoltare n-are worker PWA (ADR 0045 §7). */
interface ImportMetaEnv {
  readonly PROD: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
