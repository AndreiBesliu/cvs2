import type { getStorage } from 'firebase-admin/storage';

/**
 * Fișierele serverului în Storage (felia 15.B↑b: proiectul atașat unui tichet). Le scrie, le citește și le șterge doar
 * serverul, prin Admin SDK; regulile Storage refuză orice cerere din client. Interfața e mică, ca jobul de păstrare și
 * callable-ul să se probeze pe emulatorul Storage (implementarea reală) și, pentru căile de eșec, cu un fals.
 */

type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

/** Un fișier dintr-o listare: numele (calea) și când a fost creat (ms). */
export interface FisierListat {
  readonly nume: string;
  readonly creatLa: number;
}

export interface PaginaFisiere {
  readonly fisiere: readonly FisierListat[];
  /** Cheia paginii următoare, sau null la capăt. */
  readonly urmatoarea: string | null;
}

export interface Fisiere {
  /**
   * Scrie fișierul (unul cu același nume s-ar înlocui; un id de tichet nou n-are fișier). Fără precondiția
   * `ifGenerationMatch: 0`: emulatorul Storage o ignoră (măsurat pe 07.11), deci o asemenea gardă n-ar avea nicio probă.
   */
  scrie(cale: string, octeti: Buffer, tip: string): Promise<void>;
  /** Octeții fișierului, sau null dacă lipsește. */
  citeste(cale: string): Promise<Buffer | null>;
  /** Șterge fișierul; unul care lipsește deja nu e o eroare. */
  sterge(cale: string): Promise<void>;
  /** O pagină din fișierele de sub `prefix`, în ordinea numelor (cel mult `marime`, cel mult 1000 pe pagină în GCS). */
  pagina(prefix: string, marime: number, dupa: string | null): Promise<PaginaFisiere>;
}

/** Codul HTTP al unei erori GCS (`ApiError.code`), dacă are. */
function codHttp(e: unknown): number | null {
  const c = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
  return typeof c === 'number' ? c : null;
}

/** Fișierele dintr-un bucket GCS (în cloud, bucket-ul implicit al proiectului; pe emulatoare, al proiectului demo). */
export function fisiereDin(bucket: Bucket): Fisiere {
  return {
    async scrie(cale, octeti, tip) {
      await bucket.file(cale).save(octeti, { contentType: tip, resumable: false });
    },
    async citeste(cale) {
      try {
        const [octeti] = await bucket.file(cale).download();
        return octeti;
      } catch (e) {
        if (codHttp(e) === 404) return null;
        throw e;
      }
    },
    async sterge(cale) {
      await bucket.file(cale).delete({ ignoreNotFound: true });
    },
    async pagina(prefix, marime, dupa) {
      // O singură cerere (fără paginarea automată), cu cheia paginii de dinainte: GCS dă cel mult 1000 de nume pe pagină.
      const [lista, urm] = await bucket.getFiles({ prefix, maxResults: marime, autoPaginate: false, ...(dupa ? { pageToken: dupa } : {}) });
      const token = (urm as { pageToken?: unknown } | null | undefined)?.pageToken;
      return {
        fisiere: lista.map((f) => ({ nume: f.name, creatLa: Date.parse(String(f.metadata.timeCreated ?? '')) })),
        urmatoarea: typeof token === 'string' && token !== '' ? token : null,
      };
    },
  };
}
