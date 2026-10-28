/**
 * Publicarea unei instanțe (ADR 0044), cu amprenta ei (`meta/deployment`):
 *
 *   node scripts/publica.ts --instanta test [--doar hosting|server]
 *
 * - **test:** de pe mașina owner-ului (cu `firebase login`) sau din workflow-ul `publica`;
 * - **live:** DOAR din workflow-ul `publica`, în mediul GitHub `live` (aprobarea owner-ului), dintr-un checkout curat al
 *   sha-ului cerut. Pe mașina owner-ului, scriptul refuză (și cârligul de publicare la fel).
 *
 * Ordinea: serverul întâi (funcțiile `cncvs2`, regulile, indecșii; funcțiile aplicației vechi și indecșii ei rămân
 * neatinși), apoi hosting-ul (pagina nouă așteaptă serverul nou), apoi amprenta, doar pe țintele publicate. Hosting-ul
 * pleacă doar dacă `dist/` e build-ul commit-ului curent (capcana din 17.10: un `dist/` vechi trecea de e2e).
 * `publica-test.ts` (hosting) și `publica-functii.ts` (serverul) sunt scurtăturile instanței de test.
 */
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  esteInstanta, PROIECTE, SHA_COMPLET, shaScurt, TINTE, TINTE_SERVER, TOATE_TINTELE, type Instanta, type Publicare, type Tinta,
} from '../shared/publicare.ts';
import { META_VERSIUNE } from '../shared/versiune.ts';
import { scrieAmprenta } from './amprenta.ts';
import { clientFirebaseTools } from './firebase-api.ts';
import { pregatestePublicare } from './pregateste-publicare.ts';

export interface Cerere {
  readonly instanta: Instanta;
  readonly tinte: readonly Tinta[];
}

/** `--instanta test|live [--doar hosting|server]`; implicit toate țintele. */
export function citesteArgumente(argv: readonly string[]): Cerere | { readonly eroare: string } {
  let instanta: unknown;
  let doar: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--instanta') instanta = argv[++i];
    else if (a === '--doar') doar = argv[++i];
    else return { eroare: `argument necunoscut: ${String(a)}` };
  }
  if (!esteInstanta(instanta)) return { eroare: '--instanta test|live lipsește' };
  if (doar === undefined) return { instanta, tinte: TOATE_TINTELE };
  if (doar === 'hosting') return { instanta, tinte: ['hosting'] };
  if (doar === 'server') return { instanta, tinte: TINTE_SERVER };
  return { eroare: `--doar hosting|server, nu ${doar}` };
}

type Mediu = Readonly<Record<string, string | undefined>>;

/**
 * Cine are voie să publice instanța. Live: doar workflow-ul (`GITHUB_ACTIONS`), în mediul GitHub `live`
 * (`CNCVS2_MEDIU` = variabila `INSTANTA` a mediului, care există doar după aprobarea owner-ului), cu sha-ul cerut
 * (`CNCVS2_SHA`, 40 de caractere). În workflow, instanța cerută trebuie să fie a mediului (test nu publică pe live și invers).
 */
export function poatePublica(instanta: Instanta, env: Mediu): { readonly ok: true } | { readonly ok: false; readonly motiv: string } {
  const ci = env['GITHUB_ACTIONS'] === 'true';
  const mediu = env['CNCVS2_MEDIU'];
  if (ci && mediu !== instanta) return { ok: false, motiv: `workflow-ul rulează în mediul ${String(mediu)}, nu ${instanta}` };
  if (instanta === 'live') {
    if (!ci) return { ok: false, motiv: 'live se publică doar din workflow-ul „publica”, în mediul GitHub live (aprobarea owner-ului)' };
    if (!SHA_COMPLET.test(env['CNCVS2_SHA'] ?? '')) return { ok: false, motiv: 'CNCVS2_SHA (sha-ul cerut, 40 de caractere) lipsește' };
  }
  return { ok: true };
}

/** Cine publică, scris în amprentă. */
export function cinePublica(env: Mediu): string {
  return env['GITHUB_ACTIONS'] === 'true' ? `github:${env['GITHUB_ACTOR'] ?? '?'} #${env['GITHUB_RUN_ID'] ?? '?'}` : 'local';
}

/**
 * `dist/` e build-ul commit-ului: `index.html` poartă versiunea (primele 12 caractere) în antet (ADR 0098, `shared/versiune.ts`),
 * nu într-o bucată JavaScript, ca o publicare fără cod să nu redenumească bucățile.
 */
export function distEsteAlCommitului(html: string, sha: string): boolean {
  return new RegExp(`<meta name="${META_VERSIUNE}" content="([^"]*)"`).exec(html)?.[1] === shaScurt(sha);
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function firebase(args: readonly string[], cwd?: string): void {
  execFileSync('firebase', [...args, '--non-interactive'], { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}

export async function publica(c: Cerere, env: Mediu = process.env): Promise<void> {
  const voie = poatePublica(c.instanta, env);
  if (!voie.ok) throw new Error(voie.motiv);
  const proiect = PROIECTE[c.instanta];
  const gitSha = git('rev-parse', 'HEAD');
  const arboreCurat = git('status', '--porcelain') === '';
  if (c.instanta === 'live' && (!arboreCurat || gitSha !== env['CNCVS2_SHA'])) {
    throw new Error(`live: checkout-ul trebuie să fie curat și exact ${String(env['CNCVS2_SHA'])} (e ${gitSha}${arboreCurat ? '' : ', cu modificări'})`);
  }
  const gitRef = env['GITHUB_REF_NAME'] ?? git('rev-parse', '--abbrev-ref', 'HEAD');
  const server = c.tinte.filter((t) => t !== 'hosting');
  let builtAt: string | undefined;
  if (c.tinte.includes('hosting')) {
    if (!distEsteAlCommitului(readFileSync(join('dist', 'index.html'), 'utf8'), gitSha)) throw new Error(`dist/ nu e build-ul lui ${shaScurt(gitSha)}: rulează întâi npm run build`);
    builtAt = statSync(join('dist', 'index.html')).mtime.toISOString();
  }
  if (!arboreCurat) console.warn(`\n⚠ Arborele are modificări necomise: amprenta o spune (arboreCurat: false).\n`);
  if (server.length > 0) {
    execSync('npm --prefix functions run compileaza', { stdio: 'inherit' });
    firebase(['deploy', '--only', server.map((t) => TINTE[t]).join(','), '--project', proiect]);
  }
  if (c.tinte.includes('hosting')) {
    const dir = await pregatestePublicare({ instanta: c.instanta });
    firebase(['deploy', '--only', 'hosting', '--project', proiect], dir);
  }
  const p: Publicare = {
    gitSha, gitRef, arboreCurat, deployedAt: new Date().toISOString(), deployedBy: cinePublica(env), ...(builtAt ? { builtAt } : {}),
  };
  await scrieAmprenta(await clientFirebaseTools('https://firestore.googleapis.com'), proiect, c.tinte, p);
  console.log(`Amprenta: ${proiect} / meta/deployment, ${c.tinte.join(', ')} = ${shaScurt(gitSha)}${arboreCurat ? '' : ' (necomis)'}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = citesteArgumente(process.argv.slice(2));
  if ('eroare' in c) {
    console.error(c.eroare);
    process.exit(2);
  }
  await publica(c);
}
