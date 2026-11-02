/**
 * `HostApi` v1 (ADR 0127 §E): ce primește o extensie de la cvs2, în cadrul ei izolat. E singurul fișier din cvs2 pe care
 * o extensie îl importă, și doar ca tipuri; cvs2 nu importă nimic altceva din `extensii/`.
 */
export type Limba = 'ro' | 'en';
/** Variabilele temei lui cvs2 (numele CSS, cu `--`, și valoarea), puse și pe rădăcina cadrului. */
export type Tema = Readonly<Record<string, string>>;
export type ContextHost = { readonly limba: Limba; readonly tema: Tema };

export interface HostApi {
  readonly api: 1;
  readonly limba: Limba;
  readonly tema: Tema;
  /** Limba sau tema s-au schimbat; întoarce dezabonarea. */
  laSchimbare(f: (c: ContextHost) => void): () => void;
  /** Un fișier al pachetului, sau null. */
  fisier(cale: string): Blob | null;
  /** O eroare, în jurnalul local al lui cvs2, cu id-ul extensiei. */
  raporteaza(eroare: unknown): void;
  /** Cere închiderea spațiului extensiei. */
  inchide(): void;
  /** Un serviciu cu permisiune (3.Xb: senderul, stocarea); în v1, fiecare cerere se refuză. */
  cere(serviciu: string, ...argumente: unknown[]): Promise<unknown>;
}

/** Spațiul extensiei: desenează în containerul primit (corpul cadrului). */
export interface Spatiu {
  deschide(container: HTMLElement): void;
}

/** Ce exportă modulul de intrare al unei extensii. */
export type Activeaza = (host: HostApi) => Spatiu | Promise<Spatiu>;
