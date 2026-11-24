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
 * **O versiune nouă își spune „ce e nou”** (ADR 0231, răspunsul 3a): primul rând din `noutati` e al versiunii pachetului de
 * acum, în română și în engleză. Aceeași probă îl cere, iar `--scrie` nu înregistrează versiunea fără el.
 * Un rând poate spune și când a apărut versiunea (ADR 0232 §C.15): `"data": "2026-11-23"` (an-lună-zi), la alegere.
 *
 * Datele de prezentare (ADR 0231 §B.1), lângă pachet, cu amprenta în nume: semnul extensiei (fișierul `pictograma` al
 * manifestului, luat din dosarul ei), capturile (`extensii/<dosar>/biblioteca/<nume>.<limba>.webp`, comise; le face
 * `scripts/capturi-biblioteca.ts`), descrierea lungă, autorul și ultimele `MAX_NOUTATI` rânduri de „ce e nou”.
 * Rafturile pe care stă extensia (ADR 0233): `"categorii": ["modele", "imprimare"]`, 1–3 din `CATEGORII_BIBLIOTECA`
 * (`shared/biblioteca.ts`), primul fiind cel principal. Nu țin de pachet: o schimbare a lor nu cere o versiune nouă.
 *
 *   node scripts/biblioteca.ts            # catalogul de acum și starea fiecărei înregistrări
 *   node scripts/biblioteca.ts --scrie    # înregistrează versiunea nouă (refuză un conținut nou cu versiunea veche)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CATEGORII_BIBLIOTECA, comparaVersiuni, DIR_BIBLIOTECA, esteCategorie, esteData, FISIER_CATALOG_BIBLIOTECA, FORMAT_CATALOG, MAX_ALT, MAX_AUTOR,
  MAX_CAPTURI, MAX_CATEGORII, MAX_DESCRIERE, MAX_DESPRE, MAX_NOUTATE, MAX_NOUTATI, MAX_OCTETI_CAPTURA, MAX_OCTETI_PICTOGRAMA, numeFisierBiblioteca,
  numePachet, RE_VERSIUNE_BIBLIOTECA, SCHEMA_CATALOG, type CapturaBiblioteca, type CatalogBiblioteca, type CategorieBiblioteca, type DescriereRand,
  type NoutateBiblioteca, type PrezentareRand, type RandBiblioteca,
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
  /** Descrierea lungă (cel mult `MAX_DESPRE`). */
  readonly despre?: DescriereRand;
  readonly autor?: string;
  /** „Ce e nou”, de la versiunea cea mai nouă în jos; primul rând e al versiunii de acum (`stareNoutati`). */
  readonly noutati?: readonly NoutateBiblioteca[];
  /** Capturile: `extensii/<dosar>/biblioteca/<nume>.ro.webp` și `.en.webp`, cu textul lor alternativ. */
  readonly capturi?: ReadonlyArray<{ readonly nume: string; readonly alt: DescriereRand }>;
  /** Rafturile bibliotecii pe care stă extensia (ADR 0233): 1–`MAX_CATEGORII` din `CATEGORII_BIBLIOTECA`; primul e cel principal. */
  readonly categorii?: readonly CategorieBiblioteca[];
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
    const gresit = (camp: string, ce: string): never => { throw new Error(`${unde}: ${camp} (${ce})`); };
    const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
    const peLimbi = (v: unknown, max: number): DescriereRand | null => {
      const d = v as Partial<DescriereRand> | null;
      return d && typeof d === 'object' && text(d.ro, max) && text(d.en, max) ? { ro: d.ro, en: d.en } : null;
    };
    let despre: DescriereRand | undefined, noutati: NoutateBiblioteca[] | undefined;
    let capturi: Array<{ nume: string; alt: DescriereRand }> | undefined;
    if (r.despre !== undefined) despre = peLimbi(r.despre, MAX_DESPRE) ?? gresit('despre', `română și engleză, 1–${MAX_DESPRE} caractere`);
    if (r.autor !== undefined && !text(r.autor, MAX_AUTOR)) gresit('autor', `1–${MAX_AUTOR} caractere`);
    if (r.noutati !== undefined) {
      if (!Array.isArray(r.noutati)) gresit('noutati', 'o listă');
      noutati = (r.noutati as unknown[]).map((y) => {
        const n = y as Partial<NoutateBiblioteca> | null;
        const t = peLimbi(n, MAX_NOUTATE);
        if (!n || !t || typeof n.versiune !== 'string' || !RE_VERSIUNE_BIBLIOTECA.test(n.versiune)) return gresit('noutati', `versiunea din numere, textul în română și în engleză, 1–${MAX_NOUTATE} caractere`);
        if (n.data !== undefined && !esteData(n.data)) return gresit('noutati', `data versiunii ${n.versiune}, an-lună-zi (de exemplu "2026-11-23")`);
        return { versiune: n.versiune, ...t, ...(n.data !== undefined ? { data: n.data } : {}) };
      });
      for (let k = 1; k < noutati.length; k++) {
        if (comparaVersiuni(noutati[k - 1]!.versiune, noutati[k]!.versiune) !== 1) gresit('noutati', `versiunile de la cea mai nouă în jos, fiecare o dată: ${noutati[k]!.versiune}`);
      }
    }
    if (r.capturi !== undefined) {
      if (!Array.isArray(r.capturi) || r.capturi.length > MAX_CAPTURI) gresit('capturi', `o listă de cel mult ${MAX_CAPTURI}`);
      capturi = (r.capturi as unknown[]).map((y) => {
        const c = y as { nume?: unknown; alt?: unknown } | null;
        const alt = peLimbi(c?.alt, MAX_ALT);
        if (!c || typeof c.nume !== 'string' || !/^[a-z0-9-]{1,30}$/.test(c.nume) || !alt) return gresit('capturi', `numele din litere mici, cifre și liniuțe; textul alternativ în română și în engleză, 1–${MAX_ALT} caractere`);
        return { nume: c.nume, alt };
      });
      if (new Set(capturi.map((c) => c.nume)).size !== capturi.length) gresit('capturi', 'un nume de două ori');
    }
    let categorii: CategorieBiblioteca[] | undefined;
    if (r.categorii !== undefined) {
      const c: unknown = r.categorii;
      if (!Array.isArray(c) || c.length < 1 || c.length > MAX_CATEGORII || !c.every(esteCategorie) || new Set(c).size !== c.length) {
        gresit('categorii', `1–${MAX_CATEGORII}, fiecare o dată, dintre: ${CATEGORII_BIBLIOTECA.join(', ')}`);
      }
      categorii = c as CategorieBiblioteca[];
    }
    return {
      dosar: r.dosar, descriere: { ro: r.descriere!.ro, en: r.descriere!.en }, versiune: r.versiune, continut: r.continut,
      ...(despre ? { despre } : {}), ...(r.autor !== undefined ? { autor: r.autor } : {}), ...(noutati ? { noutati } : {}), ...(capturi ? { capturi } : {}),
      ...(categorii ? { categorii } : {}),
    };
  });
}

/** Pură: „ce e nou” e la zi doar când primul lui rând e al versiunii pachetului de acum (ADR 0231, răspunsul 3a). */
export function stareNoutati(noutati: readonly NoutateBiblioteca[] | undefined, versiune: string): 'la-zi' | 'lipsesc' {
  return noutati?.[0]?.versiune === versiune ? 'la-zi' : 'lipsesc';
}

/**
 * Pură: lățimea și înălțimea unei imagini WebP, din antetul ei (RIFF, apoi prima bucată: `VP8 ` cu pierderi, `VP8L` fără,
 * `VP8X` extins); null dacă octeții nu sunt un WebP.
 */
export function marimeWebp(o: Uint8Array): { readonly lat: number; readonly inalt: number } | null {
  const ascii = (i: number, n: number): string => String.fromCharCode(...o.subarray(i, i + n));
  if (o.length < 20 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP') return null;
  const d = 20; // datele primei bucăți: după „RIFF”, mărime, „WEBP”, numele bucății și mărimea ei
  const le = (i: number, n: number): number => { let v = 0; for (let k = n - 1; k >= 0; k--) v = v * 256 + (o[i + k] ?? 0); return v; };
  switch (ascii(12, 4)) {
    case 'VP8 ':
      return o.length >= d + 10 && o[d + 3] === 0x9d && o[d + 4] === 0x01 && o[d + 5] === 0x2a ? { lat: le(d + 6, 2) & 0x3fff, inalt: le(d + 8, 2) & 0x3fff } : null;
    case 'VP8L': {
      if (o.length < d + 5 || o[d] !== 0x2f) return null;
      const b = le(d + 1, 4);
      return { lat: (b & 0x3fff) + 1, inalt: (Math.floor(b / 0x4000) & 0x3fff) + 1 };
    }
    case 'VP8X':
      return o.length >= d + 10 ? { lat: le(d + 4, 3) + 1, inalt: le(d + 7, 3) + 1 } : null;
    default:
      return null;
  }
}

/**
 * Datele de prezentare ale unei înregistrări și fișierele lor, cu numele din `dist/extensii/`: semnul din dosarul extensiei
 * (același fișier ca în pachet: amprenta lui e în manifest), capturile comise, descrierea lungă, autorul, „ce e nou”.
 */
function prezentarea(x: InregistrareBiblioteca, manifest: Readonly<Record<string, unknown>>): { readonly prezentare: PrezentareRand; readonly fisiere: Map<string, Uint8Array> } {
  const id = String(manifest.id);
  const dosar = join('extensii', x.dosar);
  const fisiere = new Map<string, Uint8Array>();
  const pune = (nume: string, o: Uint8Array, fel: 'svg' | 'webp') => {
    const fisier = numeFisierBiblioteca(id, nume, sha(o), fel);
    fisiere.set(`${DIR_BIBLIOTECA}/${fisier}`, o);
    return { fisier, octeti: o.length };
  };
  let pictograma: PrezentareRand['pictograma'];
  if (typeof manifest.pictograma === 'string') {
    const o = new Uint8Array(readFileSync(join(dosar, manifest.pictograma)));
    if (sha(o) !== (manifest.fisiere as Record<string, string>)[manifest.pictograma]) throw new Error(`${dosar}: semnul din dosar (${manifest.pictograma}) nu e cel din pachet`);
    if (o.length > MAX_OCTETI_PICTOGRAMA) throw new Error(`${dosar}: semnul are ${o.length} octeți, peste ${MAX_OCTETI_PICTOGRAMA}`);
    pictograma = pune('pictograma', o, 'svg');
  }
  const captura = (c: { readonly nume: string; readonly alt: DescriereRand }, limba: 'ro' | 'en'): CapturaBiblioteca => {
    const cale = join(dosar, 'biblioteca', `${c.nume}.${limba}.webp`);
    const o = new Uint8Array(readFileSync(cale));
    const m = marimeWebp(o);
    if (!m) throw new Error(`${cale}: nu e o imagine WebP`);
    if (o.length > MAX_OCTETI_CAPTURA) throw new Error(`${cale}: ${o.length} octeți, peste ${MAX_OCTETI_CAPTURA}`);
    return { ...pune(`captura-${c.nume}-${limba}`, o, 'webp'), ...m, alt: c.alt[limba] };
  };
  const capturi = x.capturi && x.capturi.length > 0
    ? { ro: x.capturi.map((c) => captura(c, 'ro')), en: x.capturi.map((c) => captura(c, 'en')) }
    : undefined;
  return {
    prezentare: {
      ...(pictograma ? { pictograma } : {}), ...(capturi ? { capturi } : {}), ...(x.despre ? { despre: x.despre } : {}),
      ...(x.noutati && x.noutati.length > 0 ? { noutati: x.noutati.slice(0, MAX_NOUTATI) } : {}), ...(x.autor !== undefined ? { autor: x.autor } : {}),
      ...(x.categorii ? { categorii: x.categorii } : {}),
    },
    fisiere,
  };
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
    const p = prezentarea(x, manifest);
    const rand: RandBiblioteca = {
      id, nume: String(manifest.nume), versiune, api: Number(manifest.api), permisiuni: manifest.permisiuni as string[],
      descriere: x.descriere, pachet: numePachet(id, versiune, h), octeti: octeti.length, sha256: h, ...p.prezentare,
    };
    randuri.push(rand);
    fisiere.set(`${DIR_BIBLIOTECA}/${rand.pachet}`, octeti);
    for (const [cale, o] of p.fisiere) fisiere.set(cale, o);
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
    } else if (stareNoutati(x.noutati, calc.versiune) !== 'la-zi') {
      console.error(`  lipsește „ce e nou” pentru ${calc.versiune}: scrie în ${LISTA_BIBLIOTECA}, primul în „noutati” la ${x.dosar}, { "versiune": "${calc.versiune}", "ro": "…", "en": "…" } (cel mult ${MAX_NOUTATE} de caractere)`);
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
