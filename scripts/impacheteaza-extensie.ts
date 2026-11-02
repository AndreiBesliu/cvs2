/**
 * Împachetează o extensie (ADR 0127 §A): scoate tipurile din modulul de intrare (TypeScript doar cu sintaxă care se șterge,
 * ca restul repo-ului, un singur fișier, fără importuri de valori; `stripTypeScriptTypes` din Node: TypeScript 7 n-are API
 * de transpilare), scrie amprenta SHA-256 a fiecărui fișier în manifest și pune totul într-un `.zip` (deflate). Sursa e un
 * dosar cu `extensie.json` (manifestul fără `fisiere`) și fișierele lui; `intrare` poate fi `.ts` (devine `.js`).
 *
 *   node scripts/impacheteaza-extensie.ts extensii/salut      # scrie .tmp/extensii/<id>-<versiune>.zip
 *
 * `scrieZip` e și scriitorul probelor cititorului (`test/unit/extensii.zip.test.ts`).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join, resolve } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

export type IntrareScrisa = { readonly nume: string; readonly octeti: Uint8Array; readonly metoda?: 0 | 8 };

/** Un `.zip` simplu: antetele locale, directorul central, sfârșitul lui; metoda 0 (stocat) sau 8 (deflate, implicit). */
export function scrieZip(intrari: readonly IntrareScrisa[]): Uint8Array {
  const locale: Buffer[] = [], centrale: Buffer[] = [];
  let deplasare = 0;
  for (const x of intrari) {
    const nume = Buffer.from(x.nume, 'latin1');
    const metoda = x.metoda ?? 8;
    const date = metoda === 8 ? deflateRawSync(x.octeti) : Buffer.from(x.octeti);
    const crc = crc32(x.octeti);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(metoda, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(date.length, 18); local.writeUInt32LE(x.octeti.length, 22);
    local.writeUInt16LE(nume.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8);
    central.writeUInt16LE(metoda, 10); central.writeUInt32LE(crc, 16); central.writeUInt32LE(date.length, 20);
    central.writeUInt32LE(x.octeti.length, 24); central.writeUInt16LE(nume.length, 28); central.writeUInt32LE(deplasare, 42);
    locale.push(local, nume, date);
    centrale.push(central, nume);
    deplasare += local.length + nume.length + date.length;
  }
  const dir = Buffer.concat(centrale);
  const sfarsit = Buffer.alloc(22);
  sfarsit.writeUInt32LE(0x06054b50, 0); sfarsit.writeUInt16LE(intrari.length, 8); sfarsit.writeUInt16LE(intrari.length, 10);
  sfarsit.writeUInt32LE(dir.length, 12); sfarsit.writeUInt32LE(deplasare, 16);
  return new Uint8Array(Buffer.concat([...locale, dir, sfarsit]));
}

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

/** Pachetul unei extensii din dosarul ei: manifestul complet și octeții `.zip`-ului. */
export function impacheteaza(dosar: string): { readonly manifest: Record<string, unknown>; readonly octeti: Uint8Array } {
  const sursa = JSON.parse(readFileSync(join(dosar, 'extensie.json'), 'utf8')) as Record<string, unknown>;
  const intrare = String(sursa.intrare);
  const fisiere = new Map<string, Uint8Array>();
  if (intrare.endsWith('.ts')) {
    const iesire = stripTypeScriptTypes(readFileSync(join(dosar, intrare), 'utf8'), { mode: 'strip' });
    fisiere.set(intrare.replace(/\.ts$/, '.js'), new TextEncoder().encode(iesire));
  } else fisiere.set(intrare, new Uint8Array(readFileSync(join(dosar, intrare))));
  for (const c of [...((sursa.stiluri as string[] | undefined) ?? []), ...((sursa.altele as string[] | undefined) ?? [])]) {
    fisiere.set(c, new Uint8Array(readFileSync(join(dosar, c))));
  }
  const { altele: _altele, ...rest } = sursa;
  const manifest = {
    ...rest, intrare: intrare.replace(/\.ts$/, '.js'),
    fisiere: Object.fromEntries([...fisiere].map(([c, b]) => [c, sha(b)])),
  };
  const octeti = scrieZip([
    { nume: 'extensie.json', octeti: new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`) },
    ...[...fisiere].map(([nume, b]) => ({ nume, octeti: b })),
  ]);
  return { manifest, octeti };
}

if (import.meta.main) {
  const dosar = process.argv[2];
  if (!dosar) {
    console.error('folosire: node scripts/impacheteaza-extensie.ts <dosarul extensiei>');
    process.exit(2);
  }
  const { manifest, octeti } = impacheteaza(resolve(dosar));
  mkdirSync('.tmp/extensii', { recursive: true });
  const cale = join('.tmp/extensii', `${String(manifest.id)}-${String(manifest.versiune)}.zip`);
  writeFileSync(cale, octeti);
  console.log(`${cale}: ${octeti.length} octeți, ${Object.keys(manifest.fisiere as object).length} fișiere`);
}
