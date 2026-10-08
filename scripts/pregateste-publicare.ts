/**
 * Pregătirea comună a unei publicări pe instanța de test: build-ul din `dist/` nu se schimbă; într-o copie din
 * `.tmp/publicare/` se pune `config.json` cu instanța „test”, `firebase.json` (din aceeași sursă unică) și un
 * `.firebaserc` care numește doar proiectul de test. Întoarce dosarul din care se rulează `firebase`.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { configHosting } from './firebase-json.ts';

export function pregatestePublicare(): string {
  if (!existsSync('dist/index.html')) {
    console.error('dist/ lipsește: rulează întâi npm run build');
    process.exit(2);
  }
  const dir = '.tmp/publicare';
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync('dist', `${dir}/public`, { recursive: true });
  writeFileSync(`${dir}/public/config.json`, `${JSON.stringify({ instanta: 'test' })}\n`);
  writeFileSync(`${dir}/firebase.json`, `${JSON.stringify(configHosting('public'), null, 2)}\n`);
  writeFileSync(`${dir}/.firebaserc`, `${JSON.stringify({ projects: { test: 'cncvectorstudio-test' } }, null, 2)}\n`);
  return dir;
}
