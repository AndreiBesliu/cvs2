/**
 * Construcția bibliotecii extensiilor (ADR 0230): din `extensii/biblioteca.json` (ce extensii intră, descrierea lor în română și
 * în engleză, versiunea și amprenta conținutului înregistrate), pachetul fiecăreia (Easy 3Draw cu `pachetTrenulet()`, celelalte
 * cu `impacheteaza()`) și catalogul lor, pentru `dist/extensii/` (pluginul din `vite.config.ts`, la fiecare build). Numele,
 * versiunea, `api`-ul și permisiunile din catalog vin din manifestul pachetului, nu se scriu de mână.
 *
 * **Un conținut nou cere o versiune nouă.** Amprenta conținutului e SHA-256 al manifestului, care are amprenta fiecărui fișier
 * (deci nu depinde de compresie). Lista o ține lângă versiune; proba unitară (`biblioteca.constructie.test.ts`) cere ca ele să fie
 * ale pachetului de acum. Altfel, cine are versiunea veche ar vedea „Instalată” și n-ar primi schimbarea.
 *
 *   node scripts/biblioteca.ts            # catalogul de acum și starea fiecărei înregistrări
 *   node scripts/biblioteca.ts --scrie    # înregistrează versiunea nouă (refuză un conținut nou cu versiunea veche)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  comparaVersiuni, DIR_BIBLIOTECA, FISIER_CATALOG_BIBLIOTECA, FORMAT_CATALOG, MAX_DESCRIERE, numePachet, RE_VERSIUNE_BIBLIOTECA,
  SCHEMA_CATALOG, type CatalogBiblioteca, type RandBiblioteca,
} from '../shared/biblioteca.ts';
import { pachetTrenulet } from './construieste-trenulet.ts';
import { impacheteaza } from './impacheteaza-extensie.ts';

export const LISTA_BIBLIOTECA = 'extensii/biblioteca.json';

export type InregistrareBiblioteca = {
  /** Dosarul extensiei, în `extensii/`. */
  readonly dosar: string;
  readonly descriere: { readonly ro: string; readonly en: string };
  /** Versiunea publicată în bibliotecă și amprenta conținutului ei (SHA-256 al manifestului). */
  readonly versiune: string;
  readonly continut: string;
};
export type StareInregistrare = 'la-zi' | 'versiune-nescrisa' | 'continut-fara-versiune' | 'versiune-mai-mica';

const sha = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex');

/** Lista bibliotecii, judecată: dosarul, descrierea în ambele limbi (cel mult `MAX_DESCRIERE`), versiunea, amprenta. */
export function citesteLista(cale = LISTA_BIBLIOTECA): InregistrareBiblioteca[] {
  const brut = JSON.parse(readFileSync(cale, 'utf8')) as { extensii?: unknown };
  if (!Array.isArray(brut.extensii)) throw new Error(`${cale}: lipsește lista „extensii”`);
  return brut.extensii.map((x: unknown, i: number) => {
    const r = x as Partial<InregistrareBiblioteca> | null;
    const unde = `${cale}, extensia ${i + 1}`;
    if (!r || typeof r.dosar !== 'string' || !/^[a-z0-9-]{1,40}$/.test(r.dosar)) throw new Error(`${unde}: dosarul`);
    for (const l of ['ro', 'en'] as const) {
      const d = r.descriere?.[l];
      if (typeof d !== 'string' || d.length === 0 || d.length > MAX_DESCRIERE) throw new Error(`${unde}: descrierea (${l}), 1–${MAX_DESCRIERE} caractere`);
    }
    if (typeof r.versiune !== 'string' || typeof r.continut !== 'string' || !/^[0-9a-f]{64}$/.test(r.continut)) throw new Error(`${unde}: versiunea și amprenta`);
    return { dosar: r.dosar, descriere: { ro: r.descriere!.ro, en: r.descriere!.en }, versiune: r.versiune, continut: r.continut };
  });
}

/** Pachetul extensiei dintr-un dosar al lui `extensii/`: Easy 3Draw are construcția lui (ADR 0129), celelalte împachetatorul. */
export function pachetDinDosar(dosar: string): { readonly manifest: Record<string, unknown>; readonly octeti: Uint8Array } {
  return dosar === 'trenulet' ? pachetTrenulet() : impacheteaza(join('extensii', dosar));
}

/** Amprenta conținutului unui pachet: SHA-256 al manifestului lui (cu amprenta fiecărui fișier), nu al `.zip`-ului. */
export function amprentaContinut(manifest: Readonly<Record<string, unknown>>): string {
  return sha(JSON.stringify(manifest));
}

/** Pură: înregistrarea din listă față de pachetul de acum. */
export function judecaInregistrarea(
  inreg: { readonly versiune: string; readonly continut: string },
  calc: { readonly versiune: string; readonly continut: string },
): StareInregistrare {
  if (inreg.versiune === calc.versiune) return inreg.continut === calc.continut ? 'la-zi' : 'continut-fara-versiune';
  return comparaVersiuni(calc.versiune, inreg.versiune) === 1 ? 'versiune-nescrisa' : 'versiune-mai-mica';
}

/**
 * Catalogul și fișierele bibliotecii, cu căile din `dist/` (`extensii/catalog.json`, `extensii/<pachet>`), plus starea fiecărei
 * înregistrări (construcția nu cade pe ea: proba unitară e poarta). O versiune care nu e din numere cu puncte oprește
 * construcția: biblioteca n-ar putea spune care e mai nouă.
 */
export function construiesteBiblioteca(cale = LISTA_BIBLIOTECA): {
  readonly catalog: CatalogBiblioteca;
  readonly fisiere: Map<string, Uint8Array>;
  readonly stari: ReadonlyMap<string, StareInregistrare>;
} {
  const fisiere = new Map<string, Uint8Array>();
  const stari = new Map<string, StareInregistrare>();
  const randuri: RandBiblioteca[] = [];
  for (const x of citesteLista(cale)) {
    const { manifest, octeti } = pachetDinDosar(x.dosar);
    const id = String(manifest.id), versiune = String(manifest.versiune);
    if (!RE_VERSIUNE_BIBLIOTECA.test(versiune)) throw new Error(`extensii/${x.dosar}: versiunea „${versiune}” nu e din numere cu puncte (ADR 0230 §D)`);
    const h = sha(octeti);
    const rand: RandBiblioteca = {
      id, nume: String(manifest.nume), versiune, api: Number(manifest.api), permisiuni: manifest.permisiuni as string[],
      descriere: x.descriere, pachet: numePachet(id, versiune, h), octeti: octeti.length, sha256: h,
    };
    randuri.push(rand);
    fisiere.set(`${DIR_BIBLIOTECA}/${rand.pachet}`, octeti);
    stari.set(x.dosar, judecaInregistrarea(x, { versiune, continut: amprentaContinut(manifest) }));
  }
  const catalog: CatalogBiblioteca = { format: FORMAT_CATALOG, schema: SCHEMA_CATALOG, extensii: randuri };
  fisiere.set(FISIER_CATALOG_BIBLIOTECA, new TextEncoder().encode(`${JSON.stringify(catalog, null, 2)}\n`));
  return { catalog, fisiere, stari };
}

if (import.meta.main) {
  const scrie = process.argv.includes('--scrie');
  const brut = JSON.parse(readFileSync(LISTA_BIBLIOTECA, 'utf8')) as { extensii: Array<Record<string, unknown>> };
  let refuz = false, schimbat = false;
  for (const x of citesteLista()) {
    const { manifest, octeti } = pachetDinDosar(x.dosar);
    const calc = { versiune: String(manifest.versiune), continut: amprentaContinut(manifest) };
    const stare = judecaInregistrarea(x, calc);
    console.log(`${x.dosar}: ${String(manifest.nume)} ${calc.versiune}, ${octeti.length} octeți, ${stare}`);
    if (stare === 'continut-fara-versiune' || stare === 'versiune-mai-mica') {
      console.error(stare === 'continut-fara-versiune'
        ? `  conținutul s-a schimbat, versiunea (${x.versiune}) nu: ridică versiunea în extensii/${x.dosar}/extensie.json`
        : `  versiunea (${calc.versiune}) e mai mică decât cea înregistrată (${x.versiune})`);
      refuz = true;
    } else if (stare === 'versiune-nescrisa' && scrie) {
      const r = brut.extensii.find((y) => y.dosar === x.dosar);
      if (r) { r.versiune = calc.versiune; r.continut = calc.continut; schimbat = true; }
    }
  }
  if (schimbat) {
    writeFileSync(LISTA_BIBLIOTECA, `${JSON.stringify(brut, null, 2)}\n`);
    console.log(`${LISTA_BIBLIOTECA}: versiunile noi înregistrate.`);
  }
  if (refuz) process.exit(1);
}
