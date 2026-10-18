/**
 * Un `CacheStorage` fals pentru probele workerului PWA (ADR 0045), cu cele două purtări ale browserului care au mai prins
 * un proiect (OurDays): `open(nume)` CREEAZĂ cache-ul cerut, iar `match(url, { cacheName })` caută DOAR în cache-ul
 * numit (fără nume, în toate, în ordinea creării). Un fals care ignoră `cacheName` ar lăsa verde exact bugul pe care
 * îl caută probele. `pwa.preluare.test.ts` probează întâi falsul însuși.
 */

class CacheFals {
  readonly intrari = new Map<string, Response>();

  async put(cerere: RequestInfo | URL, raspuns: Response): Promise<void> {
    this.intrari.set(cheie(cerere), raspuns);
  }

  async match(cerere: RequestInfo | URL): Promise<Response | undefined> {
    return this.intrari.get(cheie(cerere))?.clone();
  }
}

function cheie(c: RequestInfo | URL): string {
  return typeof c === 'string' ? new URL(c, 'http://localhost/').href : c instanceof URL ? c.href : c.url;
}

export class CacheStorageFals {
  readonly cacheuri = new Map<string, CacheFals>();

  async open(nume: string): Promise<CacheFals> {
    let c = this.cacheuri.get(nume);
    if (!c) {
      c = new CacheFals();
      this.cacheuri.set(nume, c);
    }
    return c;
  }

  async has(nume: string): Promise<boolean> {
    return this.cacheuri.has(nume);
  }

  async keys(): Promise<string[]> {
    return [...this.cacheuri.keys()];
  }

  async delete(nume: string): Promise<boolean> {
    return this.cacheuri.delete(nume);
  }

  async match(cerere: RequestInfo | URL, optiuni?: { readonly cacheName?: string }): Promise<Response | undefined> {
    if (optiuni?.cacheName !== undefined) return this.cacheuri.get(optiuni.cacheName)?.match(cerere);
    for (const c of this.cacheuri.values()) {
      const r = await c.match(cerere);
      if (r) return r;
    }
    return undefined;
  }

  /** Pune un răspuns într-un cache (creat dacă lipsește), ca o stare de dinaintea probei. */
  async pune(nume: string, url: string, corp: string, status = 200): Promise<void> {
    await (await this.open(nume)).put(url, new Response(corp, { status }));
  }
}
