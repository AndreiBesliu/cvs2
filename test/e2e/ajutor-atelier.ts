import { readFileSync } from 'node:fs';
import { expect, type FrameLocator, type Page } from '@playwright/test';

/**
 * Intrarea în atelierul Easy 3Draw (partea 3D a planificatorului), pentru probele lui.
 *
 * La prima intrare în 3D, atelierul își aduce three.js (pagina de sine stătătoare, de pe cdnjs; în cvs2, din pachet), iar
 * când sosește pune previzualizarea, alege din nou piesa de acum și redesenează editorul. O probă care lucrează în editor
 * înainte de asta poate pierde ce scrie: `fill` alege textul câmpului și abia apoi scrie, iar o redesenare căzută între cele
 * două lasă scrierea fără câmp. Măsurat pe 23.11 pe secvența rotițelor (roata de 8, modulul 0,5), cu three.js întârziat din
 * 3 în 3 ms: 3 valori pierdute din 201, toate cu sosirea în timpul scrierii; cu așteptarea de aici, niciuna.
 * Un om nu scrie în câteva zeci de milisecunde de la intrare, iar un câmp în care a scris deja își dă valoarea înaintea
 * redesenării (`editor()` din `atelier.ts`, felia 3.Tq): cursa e doar a probelor.
 *
 * Deci: o probă a atelierului intră în 3D cu `intraIn3D`, iar pe pagina de sine stătătoare cheamă întâi `threeDinPachet`.
 */

/** three.js din pachet (r128, aceiași octeți ca pe cdnjs: ADR 0163). */
export const THREE = readFileSync('extensii/trenulet/sursa/vendor/three.min.js');

/** Pagina de sine stătătoare cere three.js de pe cdnjs: proba i-l dă din pachet, deci nu depinde de rețea. Înaintea paginii. */
export async function threeDinPachet(page: Page): Promise<void> {
  await page.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ body: THREE, contentType: 'application/javascript' }));
}

/**
 * Intră în partea 3D și așteaptă pornirea ei încheiată: pânza previzualizării e pusă în același pas cu redesenarea
 * editorului, deci după ea editorul nu se mai schimbă singur. `c` e pagina de sine stătătoare sau cadrul extensiei din cvs2.
 */
export async function intraIn3D(c: Page | FrameLocator): Promise<void> {
  await c.locator('[data-mod="3d"]').first().click();
  await expect(c.locator('#at-vedere canvas')).toBeAttached();
}
