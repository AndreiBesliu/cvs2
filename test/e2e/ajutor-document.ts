import { expect, type Page } from '@playwright/test';

/**
 * Textul ultimei versiuni salvate a proiectului (IndexedDB `cncvs2-proiecte`, magazia `versiuni`), așteptat până când
 * revizia ei ajunge cel puțin la `rev`: salvarea pleacă după schimbare, nu odată cu ea.
 */
export async function documentSalvat(page: Page, rev: number): Promise<string> {
  let text: string | null = null;
  await expect.poll(async () => {
    text = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((ok, eroare) => {
        const r = indexedDB.open('cncvs2-proiecte', 1);
        r.onsuccess = () => { ok(r.result); };
        r.onerror = () => { eroare(r.error); };
      });
      const v = await new Promise<unknown>((ok, eroare) => {
        const r = db.transaction('versiuni').objectStore('versiuni').openCursor(null, 'prev');
        r.onsuccess = () => { ok(r.result?.value ?? null); };
        r.onerror = () => { eroare(r.error); };
      });
      db.close();
      return typeof v === 'string' ? v : null;
    });
    return text === null ? -1 : (JSON.parse(text) as { rev: number }).rev;
  }).toBeGreaterThanOrEqual(rev);
  return text ?? '';
}
