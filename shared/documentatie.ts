/**
 * Documentația admin (ADR 0048): forma fișierelor pe care build-ul le scrie în `dist/documentatie/` (generatorul:
 * `scripts/documentatie.ts`) și pe care pagina `/admin` le cere abia la deschiderea filei (Roadmap, Documentație).
 * Un singur contract, comun generatorului și paginii; textele din câmpurile `md` sunt markdown inline (titluri, note),
 * randate de cititorul din `src/docs/`.
 *
 * Fișierele nu intră în precache-ul PWA (doar online, ca pagina `/admin`: `shared/precache.ts`).
 */

/** Rădăcina fișierelor generate, în `dist/` și pe hosting. */
export const DIR_DOCUMENTATIE = 'documentatie';
export const FISIER_ROADMAP = `${DIR_DOCUMENTATIE}/roadmap.json`;
/** Roadmap-ul în engleză (ADR 0056): aceeași formă, cu textele din dicționarul `docs/traduceri/roadmap.en.json`. */
export const FISIER_ROADMAP_EN = `${DIR_DOCUMENTATIE}/roadmap.en.json`;
/** Fișierul roadmap-ului în limba dată. */
export const fisierRoadmap = (limba: 'ro' | 'en'): string => (limba === 'en' ? FISIER_ROADMAP_EN : FISIER_ROADMAP);
export const FISIER_CATALOG = `${DIR_DOCUMENTATIE}/catalog.json`;

/** Calea fișierului generat pentru un document al repo-ului (`docs/adr/0047-….md` → `documentatie/doc/docs/adr/0047-….md`). */
export function fisierDocument(cale: string): string {
  return `${DIR_DOCUMENTATIE}/doc/${cale}`;
}

/** Adresa de pe site a unui fișier generat (cu `/` în față), cu fiecare segment codat. */
export function adresaFisier(fisier: string): string {
  return `/${fisier.split('/').map(encodeURIComponent).join('/')}`;
}

export type StareEtapa = 'gata' | 'in-lucru' | 'urmatoare' | 'viitoare';
export type StareFelie = 'gata' | 'in-lucru' | 'de-facut';
export type StareAdr = 'acceptat' | 'propus' | 'inlocuit' | 'altul';

export interface Felie {
  /** `3.4b`, `4.2↑` (adusă înainte din etapa 4), `2.8-0`, `3.P`. */
  readonly id: string;
  readonly titlu: string;
  /** Rândul din tabelul „Feliile” al fișei (sau nota, pentru o felie doar din jurnal). */
  readonly descriere: string;
  readonly stare: StareFelie;
  readonly started: string | null;
  readonly completed: string | null;
  readonly treceri: number | null;
  /** Prima propoziție a notei din jurnal; `notaIntreaga` e nota toată. */
  readonly nota: string;
  readonly notaIntreaga: string;
  /** Numerele ADR pomenite în rândul feliei și în notă (`0047`), în ordinea apariției. */
  readonly adr: readonly string[];
  /** Felie a etapei asteia făcută mai devreme, în jurnalul altei etape (`↑`). */
  readonly adusa: boolean;
  /** Felia din care s-a desprins (`2.7` pentru `2.7a`), dacă e în aceeași listă. */
  readonly parinte: string | null;
  /** Fișa în al cărei jurnal stă rândul ei (null: niciun rând). */
  readonly jurnal: string | null;
  /** Fără rând propriu în jurnal: starea vine din sub-felii. */
  readonly dinSubfelii: boolean;
}

/** Un punct din `PLAN.md` §5.3 (etapele descrise în detaliu, fără fișă încă), cu feliile aduse care îl ating. */
export interface Punct {
  readonly numar: number;
  readonly titlu: string;
  readonly descriere: string;
  readonly felii: readonly string[];
}

/**
 * Rândurile de prag pe care le închide o etapă (coloana „Închide” din `PLAN.md` §5.4), cu starea lor din
 * `ACOPERIRE-ARTCAM-DESKPROTO.md`; `fara` = punctele coloanei fără rând în prag (adminul, §10, listele), nemăsurate.
 */
export interface Prag {
  readonly facut: number;
  readonly inLucru: number;
  readonly deFacut: number;
  readonly fara: number;
}

export interface Etapa {
  /** `1`…`30` sau `T1`… (tampoanele). */
  readonly id: string;
  readonly numar: number | null;
  readonly saptamana: number;
  readonly tinta: string;
  readonly inchide: string;
  readonly placa: string;
  readonly live: string;
  readonly areLive: boolean;
  readonly stare: StareEtapa;
  readonly curenta: boolean;
  /** Toate feliile gata, placa netăiată: etapa se încheie cu placa owner-ului. */
  readonly asteaptaPlaca: boolean;
  readonly fisa: string | null;
  readonly pornita: string | null;
  readonly fisaPlacii: string | null;
  readonly placaTaiata: string | null;
  readonly felii: readonly Felie[];
  readonly puncte: readonly Punct[];
  readonly prag: Prag;
}

export interface CerereOwner {
  readonly ce: string;
  readonly pentru: string;
  readonly termen: string;
  readonly etapa: string;
  readonly fisa: string;
  /** Ancora secțiunii „Ce îi trebuie owner-ului” în fișa randată (cititorul din `src/docs/`). */
  readonly ancora: string | null;
}

export interface AdrPeScurt {
  readonly cale: string;
  readonly titlu: string;
  readonly stare: StareAdr;
}

export interface Cifre {
  readonly saptamani: number;
  readonly etape: number;
  readonly tampoane: number;
  readonly etapeGata: number;
  readonly etapaCurenta: string | null;
  readonly felii: { readonly gata: number; readonly inLucru: number; readonly deFacut: number; readonly aduse: number };
  readonly adr: { readonly total: number; readonly acceptate: number; readonly propuse: number; readonly inlocuite: number; readonly altele: number };
  readonly placi: { readonly fise: number; readonly taiate: number };
}

export interface Roadmap {
  readonly schema: 1;
  /** Limba textelor (ADR 0056): `ro`, din fișe; `en`, din dicționar. */
  readonly limba: 'ro' | 'en';
  /** Câte texte n-au încă traducere și apar în română (0 în română). */
  readonly netraduse: number;
  readonly etape: readonly Etapa[];
  readonly owner: readonly CerereOwner[];
  readonly adr: Readonly<Record<string, AdrPeScurt>>;
  readonly cifre: Cifre;
}

export type Categorie = 'stare' | 'plan' | 'etape' | 'placi' | 'adr';
export const CATEGORII: readonly Categorie[] = ['stare', 'plan', 'etape', 'placi', 'adr'];

export interface DocumentCatalog {
  /** Calea din repo (`docs/adr/0047-nucleul-de-simulare.md`); fișierul generat: `fisierDocument(cale)`. */
  readonly cale: string;
  readonly categorie: Categorie;
  /** Titlul întreg (primul `#`), markdown inline. */
  readonly titlu: string;
  /** Ce scrie în navigator: `0047 · Nucleul de simulare pe CPU`, `Etapa 3 — …`. */
  readonly eticheta: string;
  readonly adr: string | null;
  readonly stare: StareAdr | null;
  readonly octeti: number;
}

export interface Catalog {
  readonly schema: 1;
  readonly documente: readonly DocumentCatalog[];
}

const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Pură: forma roadmap-ului adus din rețea, verificată cât să nu cadă interfața (schema, listele, câmpurile citite peste
 * tot). Fișierul îl scrie build-ul nostru; o formă străină (un 200 cu pagina aplicației, o versiune veche) dă un mesaj.
 */
export function esteRoadmap(x: unknown): x is Roadmap {
  if (!obiect(x) || x['schema'] !== 1 || !Array.isArray(x['etape']) || !Array.isArray(x['owner']) || !obiect(x['adr']) || !obiect(x['cifre'])) return false;
  if ((x['limba'] !== 'ro' && x['limba'] !== 'en') || typeof x['netraduse'] !== 'number') return false;
  return x['etape'].every((e) => obiect(e) && typeof e['id'] === 'string' && typeof e['saptamana'] === 'number'
    && typeof e['stare'] === 'string' && Array.isArray(e['felii']) && Array.isArray(e['puncte'])
    && obiect(e['prag']) && ['facut', 'inLucru', 'deFacut', 'fara'].every((k) => typeof (e['prag'] as Record<string, unknown>)[k] === 'number')
    && e['felii'].every((f) => obiect(f) && typeof f['id'] === 'string' && typeof f['stare'] === 'string' && Array.isArray(f['adr'])));
}

export function esteCatalog(x: unknown): x is Catalog {
  return obiect(x) && x['schema'] === 1 && Array.isArray(x['documente'])
    && x['documente'].every((d) => obiect(d) && typeof d['cale'] === 'string' && typeof d['eticheta'] === 'string'
      && (CATEGORII as readonly unknown[]).includes(d['categorie']));
}
