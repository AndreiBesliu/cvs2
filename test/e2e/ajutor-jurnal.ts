import { expect, type Page } from '@playwright/test';

/** O intrare a jurnalului local de erori (`src/app/jurnalErori.ts`), cât îi trebuie probei. */
export type IntrareJurnal = { readonly mesaj: string; readonly stiva: string };

/**
 * Intrările jurnalului local, fără una pe care o face harnașul, nu aplicația: proiectul `edge` blochează workerul PWA
 * (`serviceWorkers: 'block'`, `playwright.config.ts`), iar Playwright pune pentru asta în FIECARE cadru un script care citește
 * `navigator.serviceWorker`. În cadrul cu sandbox al unei extensii, citirea aruncă `SecurityError`; când scriptul rulează după
 * ascultătorul încărcătorului, eroarea ajunge în jurnal, cu numele extensiei (de aceea pica uneori o probă, „1 eroare”, la o
 * rulare oarecare). Utilizatorii n-au scriptul ăsta. Intrarea lui se recunoaște după mesaj și după stivă, doar din
 * `<anonymous>`: o eroare a extensiei are în stivă adresa `blob:` a modulului ei.
 */
export async function eroriJurnal(page: Page): Promise<readonly IntrareJurnal[]> {
  const brut = await page.evaluate(() => localStorage.getItem('cncvs2.jurnalErori.v1'));
  const toate = brut ? JSON.parse(brut) as IntrareJurnal[] : [];
  const harnas = (x: IntrareJurnal): boolean => /Failed to read the 'serviceWorker' property/.test(x.mesaj) && !/blob:|https?:\/\//.test(x.stiva);
  return toate.filter((x) => !harnas(x));
}

/** Jurnalul local fără erori ale aplicației; dacă are, eșecul le arată pe toate. */
export async function faraEroriInJurnal(page: Page): Promise<void> {
  const erori = await eroriJurnal(page);
  expect(erori, JSON.stringify(erori)).toEqual([]);
}
