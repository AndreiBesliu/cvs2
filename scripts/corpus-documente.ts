/**
 * Corpusul de aur al documentului (ADR 0121; `PLAN.md` §5.3, etapa 4, punctul 1). Intrările sunt proiecte salvate chiar de
 * aplicația fiecărei versiuni a schemei (`test/fixtures/documente/intrari/`, înghețate, cu sha256-ul lor în `corpus.json`);
 * ieșirile așteptate sunt ce face din ele ușa de azi (`asteptat/`). O schimbare a unei migrări, a ușii sau a schemei care
 * mută un singur octet din ce se deschide azi pică proba (`test/unit/documente.aur.test.ts`). Lângă ele, documentele deschise
 * atunci de aplicația fiecărei versiuni din salvarea celei dinainte (`istorie/`): ce a făcut migrarea N − 1 → N în codul ei,
 * comparat cu migrarea de azi.
 *
 *   node scripts/corpus-documente.ts             # ieșirile așteptate, scrise din nou cu ușa de azi (după o schemă nouă)
 *   node scripts/corpus-documente.ts --verifica  # intrările neschimbate și ieșirile egale; codul 1 altfel
 *   node scripts/corpus-documente.ts --istorie   # intrările, scrise din nou de aplicația fiecărei versiuni (`ISTORIE`)
 *
 * Pentru `--istorie`: sursele fiecărei versiuni (`src`, `shared`) ies din git într-un dosar temporar din afara repo-ului,
 * lângă un `node_modules` legat de cel al repo-ului (o joncțiune pe Windows), iar acolo rulează rețeta
 * (`corpus-documente-reteta.ts`), cu salvarea versiunii dinainte. Același commit și aceeași rețetă dau aceiași octeți.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { VERSIUNE_SCHEMA } from '../src/model/document.ts';
import { incarca, jsonCanonic, MIGRARI } from '../src/model/incarcare.ts';

export const DOSAR = 'test/fixtures/documente';
const INTRARI = join(DOSAR, 'intrari');
const ASTEPTAT = join(DOSAR, 'asteptat');
const ISTORIC = join(DOSAR, 'istorie');
const CORPUS = join(DOSAR, 'corpus.json');
const RETETA = 'scripts/corpus-documente-reteta.ts';

/**
 * Commit-ul care scrie intrările fiecărei versiuni: ultimul cu acea schemă (părintele celui care a urcat-o); pentru
 * versiunea curentă, unul al ei. O versiune nouă adaugă aici rândul ei, iar rândul versiunii dinainte primește ultimul ei
 * commit.
 */
export const ISTORIE: ReadonlyArray<{ readonly versiune: number; readonly commit: string }> = [
  { versiune: 1, commit: 'a50469e' },
  { versiune: 2, commit: 'd9a0931' },
  { versiune: 3, commit: '463ed60' },
  { versiune: 4, commit: 'f258f48' },
  { versiune: 5, commit: 'b427907' },
  { versiune: 6, commit: '8014801' },
  { versiune: 7, commit: '60a02c6' },
  { versiune: 8, commit: '417570d' },
  { versiune: 9, commit: '812996a' },
  { versiune: 10, commit: 'f973fa4' },
  { versiune: 11, commit: 'b85f533' },
  { versiune: 12, commit: '40092e2' },
  { versiune: 13, commit: '48a4108' },
  { versiune: 14, commit: '7d8c883' },
  { versiune: 15, commit: '7b36f42' },
  { versiune: 16, commit: '5d65334' },
  { versiune: 17, commit: '3676445' },
  { versiune: 18, commit: 'feb6920' },
  { versiune: 19, commit: '5fbdb67' },
  { versiune: 20, commit: 'dbb3e2b' },
  { versiune: 21, commit: '452f06c' },
  { versiune: 22, commit: 'f7b4c04' },
];

export interface IntrareCorpus {
  readonly nume: string;
  readonly versiune: number;
  readonly commit: string;
  readonly sha256: string;
}

/** Un document deschis de versiunea N din salvarea versiunii N − 1 (`din`), scris de commit-ul versiunii N. */
export interface DeschisCorpus {
  readonly nume: string;
  readonly versiune: number;
  readonly din: string;
  readonly commit: string;
  readonly sha256: string;
}

export const sha256 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');
const vv = (n: number): string => String(n).padStart(2, '0');

/** Numele intrărilor scrise de `--istorie`: documentul gol al lui v1, apoi proiectul la fiecare versiune. */
export const numeIntrari = (): ReadonlyArray<{ readonly nume: string; readonly versiune: number; readonly fel: 'gol' | 'proiect' }> => [
  { nume: 'v01-gol.json', versiune: 1, fel: 'gol' },
  ...ISTORIE.map(({ versiune }) => ({ nume: `v${vv(versiune)}-proiect.json`, versiune, fel: 'proiect' as const })),
];

/** Numele documentelor deschise: câte unul pentru fiecare versiune de la 2, din proiectul versiunii dinainte. */
export const numeDeschise = (): ReadonlyArray<{ readonly nume: string; readonly versiune: number; readonly din: string }> =>
  ISTORIE.filter(({ versiune }) => versiune >= 2).map(({ versiune }) => ({
    nume: `v${vv(versiune)}-deschis.json`, versiune, din: `v${vv(versiune - 1)}-proiect.json`,
  }));

type FisierCorpus = { readonly schema: number; readonly intrari: readonly IntrareCorpus[]; readonly deschise: readonly DeschisCorpus[] };

function citeste(radacina: string): FisierCorpus {
  const x = JSON.parse(readFileSync(join(radacina, CORPUS), 'utf8')) as FisierCorpus;
  if (x.schema !== 1 || !Array.isArray(x.intrari) || !Array.isArray(x.deschise)) throw new Error(`${CORPUS} nu are forma { schema: 1, intrari, deschise }`);
  return x;
}

export const citesteCorpus = (radacina = '.'): readonly IntrareCorpus[] => citeste(radacina).intrari;
export const citesteDeschise = (radacina = '.'): readonly DeschisCorpus[] => citeste(radacina).deschise;

/** Migrarea de azi `versiune − 1 → versiune`, pe o salvare a versiunii dinainte, ca JSON canonic. */
export function migrareaDeAzi(text: string, versiune: number): string {
  const pas = MIGRARI[versiune - 1];
  if (!pas) throw new Error(`lipsește migrarea ${versiune - 1} → ${versiune}`);
  const r = pas(JSON.parse(text));
  if (!r.ok) throw new Error(`migrarea ${versiune - 1} → ${versiune} refuză: ${r.motiv}`);
  return jsonCanonic(r.doc);
}

/** Ieșirea așteptată a unei intrări: documentul deschis de ușa de azi, JSON cu cheile sortate, pe rânduri (diferențele se citesc). */
export function iesireAsteptata(text: string): string {
  const r = incarca(JSON.parse(text));
  if (!r.ok) throw new Error(`ușa de azi refuză intrarea: ${r.motiv}`);
  return `${JSON.stringify(JSON.parse(jsonCanonic(r.doc)), null, 2)}\n`;
}

/** Problemele corpusului, față de ușa de azi: o listă goală = corpusul e întreg. */
export function verifica(radacina = '.'): string[] {
  const p: string[] = [];
  const intrari = citesteCorpus(radacina);
  const peDisc = new Set(readdirSync(join(radacina, INTRARI)));
  const inCorpus = new Set(intrari.map((i) => i.nume));
  for (const f of peDisc) if (!inCorpus.has(f)) p.push(`${f}: în intrări, dar nu în ${CORPUS}`);
  for (const v of Array.from({ length: VERSIUNE_SCHEMA }, (_, k) => k + 1)) {
    if (!intrari.some((i) => i.versiune === v)) p.push(`versiunea ${v} n-are nicio intrare în corpus`);
  }
  for (const i of intrari) {
    const cale = join(radacina, INTRARI, i.nume);
    if (!existsSync(cale)) {
      p.push(`${i.nume}: lipsește`);
      continue;
    }
    const octeti = readFileSync(cale);
    if (sha256(octeti) !== i.sha256) p.push(`${i.nume}: schimbat (sha256 ${sha256(octeti).slice(0, 12)}, în corpus ${i.sha256.slice(0, 12)})`);
    const versiune = (JSON.parse(octeti.toString('utf8')) as { readonly schema?: unknown }).schema;
    if (versiune !== i.versiune) p.push(`${i.nume}: schema ${String(versiune)}, în corpus ${i.versiune}`);
    const asteptat = join(radacina, ASTEPTAT, i.nume);
    let iesire: string;
    try {
      iesire = iesireAsteptata(octeti.toString('utf8'));
    } catch (e) {
      p.push(`${i.nume}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (!existsSync(asteptat)) p.push(`${i.nume}: lipsește ieșirea așteptată`);
    else if (readFileSync(asteptat, 'utf8') !== iesire) p.push(`${i.nume}: ușa de azi dă altceva decât ieșirea așteptată`);
  }
  for (const f of existsSync(join(radacina, ASTEPTAT)) ? readdirSync(join(radacina, ASTEPTAT)) : []) {
    if (!inCorpus.has(f)) p.push(`asteptat/${f}: fără intrare`);
  }
  const deschise = citesteDeschise(radacina);
  const deschiseCorpus = new Set(deschise.map((d) => d.nume));
  for (const f of existsSync(join(radacina, ISTORIC)) ? readdirSync(join(radacina, ISTORIC)) : []) {
    if (!deschiseCorpus.has(f)) p.push(`istorie/${f}: nu e în ${CORPUS}`);
  }
  for (const d of deschise) {
    const cale = join(radacina, ISTORIC, d.nume);
    if (!existsSync(cale)) {
      p.push(`istorie/${d.nume}: lipsește`);
      continue;
    }
    const text = readFileSync(cale, 'utf8');
    if (sha256(text) !== d.sha256) p.push(`istorie/${d.nume}: schimbat`);
    try {
      if (migrareaDeAzi(readFileSync(join(radacina, INTRARI, d.din), 'utf8'), d.versiune) !== text) {
        p.push(`istorie/${d.nume}: migrarea de azi ${d.versiune - 1} → ${d.versiune} dă altceva decât a dat aplicația v${d.versiune}`);
      }
    } catch (e) {
      p.push(`istorie/${d.nume}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return p;
}

/** Ieșirile așteptate, scrise din nou (cele fără intrare se șterg). Întoarce câte s-au schimbat. */
export function scrieAsteptate(radacina = '.'): number {
  const intrari = citesteCorpus(radacina);
  mkdirSync(join(radacina, ASTEPTAT), { recursive: true });
  let schimbate = 0;
  for (const i of intrari) {
    const cale = join(radacina, ASTEPTAT, i.nume);
    const iesire = iesireAsteptata(readFileSync(join(radacina, INTRARI, i.nume), 'utf8'));
    if (!existsSync(cale) || readFileSync(cale, 'utf8') !== iesire) {
      writeFileSync(cale, iesire);
      schimbate++;
    }
  }
  const nume = new Set(intrari.map((i) => i.nume));
  for (const f of readdirSync(join(radacina, ASTEPTAT))) if (!nume.has(f)) rmSync(join(radacina, ASTEPTAT, f));
  return schimbate;
}

/** Leagă `node_modules` al repo-ului lângă sursele scoase (o joncțiune pe Windows) și o desface fără să atingă ținta. */
function leaga(tinta: string, legatura: string): () => void {
  symlinkSync(tinta, legatura, process.platform === 'win32' ? 'junction' : 'dir');
  return () => {
    // Doar legătura pleacă: `rmdir` pe o joncțiune nu coboară în ea; pe POSIX, legătura simbolică se scoate cu `unlink`.
    if (process.platform === 'win32') rmdirSync(legatura);
    else unlinkSync(legatura);
  };
}

/**
 * Sursele unui commit (`src`, `shared`), scrise în dosar printr-un singur `git cat-file --batch`: fără `tar` (pe Windows,
 * cel din Git Bash nu primește căile cu `C:`) și fără un worktree (Drive-ul ține blocate dosarele lui).
 */
function scoate(repo: string, commit: string, dosar: string): void {
  const fisiere = execFileSync('git', ['ls-tree', '-r', '--name-only', commit, '--', 'src', 'shared'], { cwd: repo, encoding: 'utf8' })
    .split('\n').filter((f) => f !== '');
  const tot = execFileSync('git', ['cat-file', '--batch'], { cwd: repo, input: `${fisiere.map((f) => `${commit}:${f}`).join('\n')}\n`, maxBuffer: 1 << 30 });
  let k = 0;
  for (const f of fisiere) {
    // Fiecare obiect: „<sha> blob <mărime>\n”, octeții lui, apoi un „\n”.
    const nl = tot.indexOf(10, k);
    const [, tip, marime] = tot.subarray(k, nl).toString('utf8').split(' ');
    if (tip !== 'blob') throw new Error(`${commit}:${f} nu e un fișier (${String(tip)})`);
    const capat = nl + 1 + Number(marime);
    mkdirSync(dirname(join(dosar, f)), { recursive: true });
    writeFileSync(join(dosar, f), tot.subarray(nl + 1, capat));
    k = capat + 1;
  }
}

/** Intrările, scrise din nou de aplicația fiecărei versiuni; întoarce numele celor care au ieșit altfel decât în corpus. */
export function istorie(radacina = '.'): string[] {
  const repo = resolve(radacina);
  const lucru = mkdtempSync(join(tmpdir(), 'cncvs2-corpus-'));
  const desface = leaga(join(repo, 'node_modules'), join(lucru, 'node_modules'));
  const schimbate: string[] = [];
  try {
    writeFileSync(join(lucru, 'package.json'), '{ "type": "module" }\n');
    const scrise = new Map<string, string>();
    let dinainte = '-';
    for (const { versiune, commit } of ISTORIE) {
      const dosar = join(lucru, `v${vv(versiune)}`);
      scoate(repo, commit, dosar);
      mkdirSync(join(dosar, 'scripts'), { recursive: true });
      copyFileSync(join(repo, RETETA), join(dosar, RETETA));
      for (const { nume, fel } of numeIntrari().filter((x) => x.versiune === versiune)) {
        const iesire = join(lucru, nume);
        const deschis = fel === 'proiect' && versiune >= 2 ? join(lucru, `v${vv(versiune)}-deschis.json`) : null;
        execFileSync(process.execPath, [RETETA, fel === 'gol' ? '-' : dinainte, iesire, fel, ...(deschis ? [deschis] : [])],
          { cwd: dosar, stdio: ['ignore', 'inherit', 'inherit'] });
        scrise.set(nume, readFileSync(iesire, 'utf8'));
        if (deschis) scrise.set(`v${vv(versiune)}-deschis.json`, readFileSync(deschis, 'utf8'));
        if (fel === 'proiect') dinainte = iesire;
      }
    }
    // Corpusul de dinainte, citit cu îngăduință: poate fi și unul mai vechi decât forma de azi (doar ca să spunem ce s-a schimbat).
    const vechi = (existsSync(join(repo, CORPUS)) ? JSON.parse(readFileSync(join(repo, CORPUS), 'utf8')) : {}) as Partial<FisierCorpus>;
    const shaVechi = new Map([...(vechi.intrari ?? []), ...(vechi.deschise ?? [])].map((i) => [i.nume, i.sha256]));
    const commitul = (versiune: number): string => ISTORIE.find((x) => x.versiune === versiune)?.commit ?? '';
    const scrie = (dosarRel: string, nume: string): string => {
      const text = scrise.get(nume) ?? '';
      if (shaVechi.get(nume) !== sha256(text)) schimbate.push(nume);
      mkdirSync(join(repo, dosarRel), { recursive: true });
      writeFileSync(join(repo, dosarRel, nume), text);
      return sha256(text);
    };
    const intrari: IntrareCorpus[] = numeIntrari().map(({ nume, versiune }) => ({ nume, versiune, commit: commitul(versiune), sha256: scrie(INTRARI, nume) }));
    const deschise: DeschisCorpus[] = numeDeschise().map(({ nume, versiune, din }) => ({
      nume, versiune, din, commit: commitul(versiune), sha256: scrie(ISTORIC, nume),
    }));
    writeFileSync(join(repo, CORPUS), `${JSON.stringify({ schema: 1, intrari, deschise }, null, 2)}\n`);
  } finally {
    desface();
    rmSync(lucru, { recursive: true, force: true });
  }
  return schimbate;
}

if (import.meta.main) {
  if (process.argv.includes('--istorie')) {
    const s = istorie();
    console.log(s.length === 0 ? 'Intrările, scrise din nou: aceiași octeți.' : `Intrări schimbate: ${s.join(', ')}.`);
  } else if (process.argv.includes('--verifica')) {
    const p = verifica();
    console.log(p.length === 0
      ? `Corpusul de aur: ${citesteCorpus().length} intrări, toate deschise de ușa de azi exact ca în ieșirile așteptate; ` +
        `${citesteDeschise().length} migrări de azi, egale octet cu octet cu ce au deschis atunci versiunile lor.`
      : p.join('\n'));
    process.exit(p.length === 0 ? 0 : 1);
  } else {
    console.log(`Ieșirile așteptate: ${scrieAsteptate()} scrise din nou.`);
  }
}
