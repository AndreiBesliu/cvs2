/**
 * Pregătirea comună a unei publicări pe instanța de test: build-ul din `dist/` nu se schimbă; într-o copie din
 * `.tmp/publicare/` se pune `config.json` cu instanța „test”, `firebase.json` (din aceeași sursă unică) și un
 * `.firebaserc` care numește doar proiectul de test. Întoarce dosarul din care se rulează `firebase`.
 *
 * Configurația web Firebase a instanței (ADR 0040 §2) se citește din Firebase la fiecare publicare (`apps:list`,
 * `apps:sdkconfig`): valorile sunt publice, dar nu stau în repo, ca să nu rămână în urma proiectului. La fel cheia App
 * Check a instanței (ADR 0043 §7), din înregistrarea App Check a aplicației web (`appcheck-cheie.ts`, doar GET).
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { citesteCheieAppCheck, configPublicat, type CheieAppCheck, type ConfigWeb } from './appcheck-cheie.ts';
import { configHosting } from './firebase-json.ts';

export const PROIECT_TEST = 'cncvectorstudio-test';

function firebaseJson(args: readonly string[]): unknown {
  const iesire = execFileSync('firebase', [...args, '--json'], { encoding: 'utf8', shell: process.platform === 'win32' });
  const r = JSON.parse(iesire) as { status?: string; result?: unknown };
  if (r.status !== 'success') throw new Error(`firebase ${args.join(' ')}: ${iesire.slice(0, 300)}`);
  return r.result;
}

/** Configurația web a singurei aplicații web a proiectului; mai multe sau niciuna = eroare, nu o alegere. */
export function configWeb(proiect: string): { apiKey: string; authDomain: string; projectId: string; appId: string } {
  const aplicatii = firebaseJson(['apps:list', 'WEB', '--project', proiect]) as ReadonlyArray<{ appId: string }>;
  if (aplicatii.length !== 1 || !aplicatii[0]) throw new Error(`${proiect} are ${aplicatii.length} aplicații web; aștept exact una`);
  const r = firebaseJson(['apps:sdkconfig', 'WEB', aplicatii[0].appId, '--project', proiect]) as {
    sdkConfig: { apiKey: string; authDomain: string; projectId: string; appId: string };
  };
  const { apiKey, authDomain, projectId, appId } = r.sdkConfig;
  if (projectId !== proiect) throw new Error(`sdkconfig numește proiectul ${projectId}, nu ${proiect}`);
  return { apiKey, authDomain, projectId, appId };
}

/** Ce citește pregătirea din afară (Firebase, dosarele): injectat în teste, implicit cel adevărat. */
export interface DepsPublicare {
  readonly configWeb?: (proiect: string) => ConfigWeb;
  readonly cheie?: (proiect: string, appId: string) => Promise<CheieAppCheck>;
  readonly dist?: string;
  readonly dir?: string;
}

export async function pregatestePublicare(deps: DepsPublicare = {}): Promise<string> {
  const dist = deps.dist ?? 'dist';
  if (!existsSync(join(dist, 'index.html'))) {
    console.error(`${dist}/ lipsește: rulează întâi npm run build`);
    process.exit(2);
  }
  const dir = deps.dir ?? '.tmp/publicare';
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(dist, join(dir, 'public'), { recursive: true });
  const firebase = (deps.configWeb ?? configWeb)(PROIECT_TEST);
  // Fără înregistrare: config fără appCheck și avertismentul (raportorul primește 401); o eroare de citire oprește aici.
  const cheie = await (deps.cheie ?? citesteCheieAppCheck)(PROIECT_TEST, firebase.appId);
  const { json, avertisment } = configPublicat('test', firebase, cheie);
  if (avertisment) console.warn(`\n⚠ ${avertisment}\n`);
  else console.log(`App Check: cheia reCAPTCHA Enterprise a instanței intră în config.json (${PROIECT_TEST}).`);
  writeFileSync(join(dir, 'public', 'config.json'), json);
  writeFileSync(join(dir, 'firebase.json'), `${JSON.stringify(configHosting('public'), null, 2)}\n`);
  writeFileSync(join(dir, '.firebaserc'), `${JSON.stringify({ projects: { test: PROIECT_TEST } }, null, 2)}\n`);
  return dir;
}
