import type { Page } from '@playwright/test';

/**
 * Biblioteca de freze fără cont, goală și cu frezele standard deja hotărâte (ADR 0300 §3, precizarea din 24.11: ca după
 * ștergerea lor), scrisă direct în IndexedDB, apoi pagina reîncărcată: frezele standard nu mai vin singure. Pentru probele
 * care pornesc de la o bibliotecă goală (o freză nouă, două file, „Adaugă frezele standard”).
 */
export async function bibliotecaGoala(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((rezolva, respinge) => {
    const r = indexedDB.open('cncvs2-freze', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('biblioteci'); };
    r.onerror = () => { respinge(r.error ?? new Error('IndexedDB')); };
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('biblioteci', 'readwrite');
      tx.objectStore('biblioteci').put({ v: 1, freze: [], standard: true }, 'local');
      tx.oncomplete = () => { db.close(); rezolva(); };
      tx.onerror = () => { respinge(tx.error ?? new Error('IndexedDB')); };
    };
  }));
  await page.reload();
}
