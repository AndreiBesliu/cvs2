/**
 * `HostApi` v1 (ADR 0127 §E): ce primește o extensie de la cvs2, în cadrul ei izolat. E singurul fișier din cvs2 pe care
 * o extensie îl importă, și doar ca tipuri; cvs2 nu importă nimic altceva din `extensii/`.
 */
export type Limba = 'ro' | 'en';
/**
 * Tema lui cvs2, puse și pe rădăcina cadrului: variabilele CSS (numele, cu `--`, și valoarea) ale suprafețelor, textului,
 * accentului și marginilor, fonturile (`--font`, `--mono`) și `color-scheme` (`light` sau `dark`: tema aleasă în cvs2, nu
 * neapărat a sistemului; din ADR 0164).
 */
export type Tema = Readonly<Record<string, string>>;
/** Planul contului lui cvs2 (ADR 0116): `proba`, `gratuit`, `personal`, sau `expirat`, `dezactivat`. */
export type PlanCont = 'proba' | 'gratuit' | 'expirat' | 'dezactivat' | 'personal';
/**
 * Contul lui cvs2, cum îl vede o extensie cu permisiunea `cont` (ADR 0164): conectat sau nu, numele și planul de acum, doar
 * pentru citire; cât adresa contului nu e confirmată, numele e gol și planul null. Nimic din adresă, uid, parolă sau proiecte.
 */
export type ContCvs2 =
  | { readonly conectat: false }
  | { readonly conectat: true; readonly nume: string; readonly plan: PlanCont | null };
/** Contextul de acum: limba, tema și, doar cu permisiunea `cont`, contul. */
export type ContextHost = { readonly limba: Limba; readonly tema: Tema; readonly cont?: ContCvs2 };

/**
 * Starea mașinii, cum o vede o extensie (ADR 0160 §B): legătura, faza senderului (`liber`, `pregatit`, `trimite`, `golire`,
 * `terminare`, `suspendat`, `bariera`, `terminat`, `pierdut`), indicatorul lucrării (`fel`: `conectata`, `ruleaza`, `pauza`,
 * `oprita-m6`, `oprita`, `suspendata`, `alarma`, `intrerupta`, `gata`; procentul; linia unei opriri; codul alarmei) și programul
 * încărcat. Nimic din poziție, jurnal sau setările controlerului.
 */
export type StareMasina = {
  readonly conectata: boolean;
  readonly faza: string;
  readonly indicator: { readonly fel: string; readonly procent: number | null; readonly linie: number | null; readonly cod: number | null } | null;
  readonly program: { readonly nume: string | null; readonly sha256: string; readonly linii: number } | null;
};

/**
 * Un contur trimis din desen (ADR 0166): în mm, în coordonatele foii (originea în colțul stânga-jos, Y în sus); un contur
 * închis nu-și repetă la sfârșit primul punct.
 */
export type ConturCvs2 = { readonly inchis: boolean; readonly puncte: readonly (readonly [number, number])[] };
/**
 * Formele trimise de om din desen (ADR 0166), versiunea 1: contururile instanțelor alese (arcele, cercurile și cubicele
 * aproximate prin segmente, la cel mult 0,02 mm) și cutia lor; sau refuzul: `prea-mare` (peste 10 000 de contururi sau
 * 200 000 de puncte), `nimic` (nicio formă în selecție).
 */
export type FormeCvs2 =
  | {
    readonly versiune: 1; readonly ok: true; readonly unitate: 'mm'; readonly contururi: readonly ConturCvs2[];
    readonly cutie: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  }
  | { readonly versiune: 1; readonly ok: false; readonly motiv: 'prea-mare' | 'nimic' };

export interface HostApi {
  readonly api: 1;
  readonly limba: Limba;
  readonly tema: Tema;
  /**
   * Contul lui cvs2 (ADR 0164), cu permisiunea `cont`; fără ea, null. Intrarea în cont, ieșirea (și din altă filă) sau alt
   * plan vin prin `laSchimbare`.
   */
  readonly cont: ContCvs2 | null;
  /** Limba, tema sau contul s-au schimbat; întoarce dezabonarea. */
  laSchimbare(f: (c: ContextHost) => void): () => void;
  /** Un fișier al pachetului, sau null. */
  fisier(cale: string): Blob | null;
  /** O eroare, în jurnalul local al lui cvs2, cu id-ul extensiei. */
  raporteaza(eroare: unknown): void;
  /** Cere închiderea ferestrei extensiei; cvs2 n-o mai întreabă de lucrul nesalvat (extensia știe ce are). */
  inchide(): void;
  /**
   * Cere repornirea extensiei (ADR 0165): cvs2 îi oprește cadrul și îl pornește din nou, cu contextul de acum (de exemplu,
   * într-o limbă nouă). Salvările le face extensia întâi. Cel mult o repornire la 2 s: una cerută mai devreme așteaptă până
   * trec cele 2 s, iar cererile de până atunci se adună în ea.
   */
  reporneste(): void;
  /**
   * Lucrul nesalvat (ADR 0164): `true` cât extensia are modificări pe care nu le-a salvat, `false` după ce le-a salvat. Cât
   * e `true`, × și reîncărcarea paginii întreabă omul întâi.
   */
  nesalvat(da: boolean): void;
  /**
   * Închiderea ferestrei (ADR 0164): la ×, cvs2 cheamă `f` și îi așteaptă promisiunea, cel mult 5 s, ca extensia să salveze
   * acum ce avea de salvat (și să anunțe `nesalvat(false)`); dacă tot rămâne ceva nesalvat, întreabă omul. Întoarce
   * dezabonarea.
   */
  laInchidere(f: () => unknown): () => void;
  /**
   * Un serviciu cu permisiune; un refuz respinge promisiunea, cu codul lui. `stocare.*` (ADR 0128), `descarcari.*` (ADR 0129)
   * și `masina.*` (ADR 0160), și prin învelișurile de mai jos.
   */
  cere(serviciu: string, ...argumente: unknown[]): Promise<unknown>;
  /**
   * Datele extensiei (ADR 0128), cu permisiunea `stocare`: JSON sau octeți, cel mult 4 MB o valoare, 16 MB și 1 000 de chei
   * toate. O cheie lipsă se citește `null`. Refuzurile: `stocare:permisiune`, `:cheie`, `:valoare`, `:plin`, `:indisponibila`.
   */
  readonly stocare: {
    citeste(cheie: string): Promise<unknown>;
    scrie(cheie: string, valoare: unknown): Promise<null>;
    sterge(cheie: string): Promise<null>;
    chei(): Promise<string[]>;
  };
  /**
   * Descărcările (ADR 0129), cu permisiunea `descarcari`: textul, octeții sau `Blob`-ul, cel mult 64 MB, descărcat de cvs2 cu
   * numele curățat, doar cu un tip de date sau desen (`.zip`, `.json`, `.gcode`, `.stl`…); răspunsul e numele. Refuzurile:
   * `descarcari:permisiune`, `:nume`, `:date`, `:prea-mare`.
   */
  readonly descarcari: {
    salveaza(nume: string, date: string | ArrayBuffer | Uint8Array | Blob): Promise<string>;
  };
  /**
   * Senderul lui cvs2 (ADR 0160), cu permisiunea `masina`, oprit pe instanța live. Conectarea, jog-ul, zero-ul, palparea,
   * deblocarea, comenzile manuale și continuarea după o barieră rămân în fereastra Mașina.
   * - `stare()` și `laStare(f)`: starea, la cerere și la fiecare schimbare;
   * - `incarca(nume, date)`: un program G-code (`.nc`, `.gcode`, `.ngc`, `.tap`, `.txt`; text sau octeți, cel mult 32 MB),
   *   verificat ca unul adus cu „Fișier…” (`M6` refuzat), cât nicio lucrare nu e pornită; răspunsul: numele, amprenta, liniile;
   * - `porneste()`, `reia()`: după confirmarea omului, într-o fereastră a lui cvs2; reia din pauză sau după o eroare;
   * - `pauza()`, `opreste()`: direct (oprirea repornește controlerul: poziția se poate pierde);
   * - `trimite(lucrare)`: o lucrare în forma protocolului „cvs2-lucrare” v1, spre „Lucrarea primită”, după dialogul primirii;
   *   răspunsul e mesajul `primit`.
   * Refuzurile: `masina:permisiune`, `:live`, `:fara-capabilitate`, `:neconectat`, `:fara-program`, `:faza`, `:in-lucru`,
   * `:nume`, `:date`, `:prea-mare`, `:program:<cod>[:<linia>]`, `:renuntat`, `:schimbat`, `:ocupat`, `:alarma`, `:bariera`,
   * `:nimic`, `:lucrare`, `:indisponibila`.
   */
  readonly masina: {
    stare(): Promise<StareMasina>;
    laStare(f: (s: StareMasina) => void): () => void;
    incarca(nume: string, date: string | ArrayBuffer | Uint8Array | Blob): Promise<{ readonly nume: string; readonly sha256: string; readonly linii: number }>;
    porneste(): Promise<null>;
    reia(): Promise<null>;
    pauza(): Promise<null>;
    opreste(): Promise<null>;
    trimite(lucrare: unknown): Promise<unknown>;
  };
  /**
   * Formele dintre desen și extensie (ADR 0166), cu permisiunea `forme`:
   * - `laPrimire(f)`: formele pe care omul i le trimite din desen („Trimite la <extensie>”, în bara selecției); întoarce
   *   dezabonarea. Extensia nu citește desenul altfel;
   * - `propune(nume, date)`: un fișier SVG sau DXF pentru desen (text sau octeți, cât un import, cel mult 16 MB): cvs2 trece
   *   la Proiectare și deschide fereastra Importă cu el, „Propus de <extensie>”; nimic nu intră în desen fără „Importă”.
   *   Răspunsul e `deschis`. Refuzurile: `forme:permisiune`, `:nume`, `:date`, `:prea-mare`, `:ocupat` (alt import e deschis),
   *   `:doar-citire` (fila doar citește), `:indisponibila`.
   */
  readonly forme: {
    laPrimire(f: (forme: FormeCvs2) => void): () => void;
    propune(nume: string, date: string | ArrayBuffer | Uint8Array | Blob): Promise<'deschis'>;
  };
}

/**
 * Spațiul extensiei: desenează în containerul primit (corpul cadrului). O pagină pusă asincron întoarce promisiunea ei: gazda
 * spune „pornit” abia după ea, când pagina e gata de folosit (ADR 0139).
 */
export interface Spatiu {
  deschide(container: HTMLElement): void | Promise<void>;
}

/** Ce exportă modulul de intrare al unei extensii. */
export type Activeaza = (host: HostApi) => Spatiu | Promise<Spatiu>;
