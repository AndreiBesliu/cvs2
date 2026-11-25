/**
 * Piesele atelierului Easy 3Draw pe file (ADR 0281, felia 3.Tp; răspunsurile owner-ului: 1b, 2a, 3a), pe pagina de sine
 * stătătoare a planificatorului (din aceleași surse ca pachetul), servită de pe o origine a probei (cu `localStorage`) și cu
 * three.js din pachet:
 * - sus, filele familiilor (Cărămizi, Legături, Roți), cu câte piese au, apoi „Calibrare” („Din cvs2” doar în cvs2); sub ele,
 *   galeria familiei alese: piesele ei, în ordine, iar fiecare își deschide editorul, cu ea apăsată și cu fila ei;
 * - fiecare filă ține minte ultima piesă aleasă în ea (după altă filă, după „Calibrare”, după model și după „Schimb-o în
 *   editor”); „Placă cu găuri” rămâne pe Cărămizi, în editorul cărămizii;
 * - o listă salvată de 18.14.0 (`test/fixtures/trenulet/atelier-18.14.0.json`, făcută de pagina publicată, ca un om) se
 *   deschide la fel: piesa din editor (acum pe fila Roți), lista cu aceleași rânduri, modelul, culoarea; iar datele scrise
 *   înapoi sunt aceleași (nimic nu se mută în date). Și pe claude.ai, unde vine din baza artefactului abia după ce partea
 *   3D a pornit: filele și galeria trec pe piesa ei;
 * - pe telefon (390 px): filele și galeria fiecărei familii încap, fără depășire, iar galeria stă sub file, deasupra vederii 3D.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';

/** Familiile, cum le-a ales owner-ul (1b): id-ul filei, numele, piesele galeriei (tipul și numele), în ordine. */
const FAMILII: readonly (readonly [string, string, readonly (readonly [string, string])[]])[] = [
  ['caramizi', 'Cărămizi', [['caramida', 'Cărămidă / placă'], ['panta', 'Pantă'], ['pantaInversa', 'Pantă inversă'], ['pana', 'Pană / aripă'],
    ['rotund', 'Rotund / con'], ['arc', 'Arc'], ['lateral', 'Știfturi pe lateral'], ['suport', 'Suport (bracket)'], ['grinda', 'Grindă'], ['caramidaTechnic', 'Cărămidă Technic'],
    ['placaTechnic', 'Placă cu găuri']]],
  ['legaturi', 'Legături', [['stiftTechnic', 'Știft'], ['ax', 'Ax'], ['bucsa', 'Bucșă / conector'], ['conector', 'Conector perpendicular'], ['conectorUnghi', 'Conector în unghi'], ['clema', 'Clemă'], ['bara', 'Bară'], ['maner', 'Mâner'],
    ['bila', 'Bilă'], ['cupa', 'Cupă']]],
  ['roti', 'Roți', [['rotita', 'Roată dințată'], ['cremaliera', 'Cremalieră'], ['cama', 'Camă'], ['conica', 'Roată conică'], ['coroana', 'Roată coroană'], ['conicaDubla', 'Conică dublă'], ['fulie', 'Fulie'],
    ['roata', 'Roată cu anvelopă'], ['senila', 'Șenilă']]],
  ['propulsie', 'Elice', [['elice', 'Elice'], ['eliceBarca', 'Elice de barcă'], ['ventilator', 'Ventilator cu carcasă'], ['roataPalete', 'Roată cu palete']]],
];
/** Titlul editorului fiecărui tip: piesa aleasă își deschide editorul ei („placaTechnic” e o formă gata a cărămizii). */
const EDITOR: Readonly<Record<string, string>> = {
  caramida: 'Forma, pe grila de știfturi', panta: 'Pantă', pantaInversa: 'Pantă inversă', pana: 'Pană: aripi, colțuri tăiate, vârfuri',
  rotund: 'Rotund și con', arc: 'Arc', lateral: 'Cărămidă cu știfturi pe lateral', suport: 'Suport (bracket)', grinda: 'Grindă Technic, de orice formă',
  caramidaTechnic: 'Cărămidă Technic', stiftTechnic: 'Știft Technic', ax: 'Ax Technic', bucsa: 'Bucșă și conector de ax', conector: 'Conector perpendicular', conectorUnghi: 'Conector în unghi', clema: 'Placă cu clemă',
  bara: 'Bară', maner: 'Placă cu mâner', bila: 'Placă cu bilă', cupa: 'Placă cu cupă', rotita: 'Roată dințată', cremaliera: 'Cremalieră', cama: 'Camă', conica: 'Roată conică',
  coroana: 'Roată coroană', conicaDubla: 'Conică dublă', fulie: 'Fulie', roata: 'Roată cu anvelopă', senila: 'Șenilă', elice: 'Elice',
  eliceBarca: 'Elice de barcă', ventilator: 'Ventilator cu carcasă', roataPalete: 'Roată cu palete',
};
const tipul = (k: string): string => (k === 'placaTechnic' ? 'caramida' : k);

/** Pagina planificatorului, cu stocarea dată (ca la o deschidere de mai târziu), în partea 3D. */
async function deschide(page: Page, stocat?: unknown): Promise<void> {
  const { preview } = paginiPlanificator();
  await page.route(PAGINA, (r) => r.fulfill({ body: preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (stocat !== undefined) await page.addInitScript(([k, s]) => { localStorage.setItem(k, s); }, [CHEIE, JSON.stringify(stocat)] as const);
  await page.goto(PAGINA);
  await intraIn3D(page);
}
const fila = (page: Page, f: string) => page.locator(`#at-tipuri [data-fila="${f}"]`);
const piesa = (page: Page, k: string) => page.locator(`#at-galerie [data-piesa="${k}"]`);
const filaApasata = (page: Page) => page.locator('#at-tipuri [aria-pressed="true"]');
const piesaApasata = (page: Page) => page.locator('#at-galerie [aria-pressed="true"]');

test('filele: Cărămizi, Legături, Roți (cu câte piese au), apoi Calibrare; sub fiecare, piesele familiei ei, cu editorul lor', async ({ page }) => {
  await deschide(page);
  await expect(page.locator('#at-tipuri button:visible')).toHaveText(['Cărămizi 11', 'Legături 10', 'Roți 9', 'Elice 4', 'Calibrare']);
  // la început: Cărămizi, cu cărămida
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'caramizi');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'caramida');
  for (const [f, nume, piese] of FAMILII) {
    await fila(page, f).click();
    await expect(filaApasata(page)).toHaveCount(1);
    await expect(filaApasata(page)).toHaveAttribute('data-fila', f);
    const g = page.locator('#at-galerie');
    await expect(g).toBeVisible();
    await expect(g).toHaveAttribute('aria-label', nume);
    await expect(g.locator('button')).toHaveText(piese.map(([, n]) => n));
    expect(await g.locator('button').evaluateAll((b) => b.map((x) => (x as HTMLElement).dataset['piesa']))).toEqual(piese.map(([k]) => k));
    for (const [k] of piese) {
      await piesa(page, k).click();
      await expect(piesaApasata(page)).toHaveCount(1);
      await expect(piesaApasata(page)).toHaveAttribute('data-piesa', tipul(k));
      await expect(fila(page, f)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#at-editor h2').first()).toHaveText(EDITOR[tipul(k)]!);
      await expect(page.locator('#at-nume-piesa')).not.toHaveText('');
    }
  }
  // cu tastatura: în aceeași familie, butonul ales rămâne în focus (galeria nu se face din nou), iar apăsarea se mută
  await fila(page, 'caramizi').click();
  await piesa(page, 'pana').focus();
  await page.keyboard.press('Enter');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'pana');
  await expect(piesa(page, 'pana')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'rotund');
  await expect(piesa(page, 'rotund')).toBeFocused();
  await expect(page.locator('#at-editor h2').first()).toHaveText(EDITOR['rotund']!);
  // „Calibrare”: fila ei, fără galerie; „Din cvs2” doar în cvs2
  await fila(page, 'calibrare').click();
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'calibrare');
  await expect(page.locator('#at-galerie')).toBeHidden();
  await expect(page.locator('#at-editor h2').first()).toHaveText('Calibrare: ce se potrivește pe imprimanta ta');
  await expect(fila(page, 'dinCvs2')).toBeHidden();
});

test('fiecare filă ține minte ultima piesă aleasă în ea: după altă filă, Calibrare, model, „Schimb-o în editor”; placa cu găuri rămâne pe Cărămizi', async ({ page }) => {
  await deschide(page);
  // la început, fiecare familie deschide prima ei piesă
  await fila(page, 'legaturi').click();
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'stiftTechnic');
  await fila(page, 'roti').click();
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'rotita');
  // câte o piesă pe fiecare filă, apoi înapoi pe fiecare: piesa ei, cu editorul ei
  await piesa(page, 'conica').click();
  await fila(page, 'caramizi').click();
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'caramida');
  await piesa(page, 'panta').click();
  await fila(page, 'legaturi').click();
  await piesa(page, 'bucsa').click();
  for (const [f, k] of [['roti', 'conica'], ['caramizi', 'panta'], ['legaturi', 'bucsa'], ['roti', 'conica']] as const) {
    await fila(page, f).click();
    await expect(piesaApasata(page)).toHaveAttribute('data-piesa', k);
    await expect(page.locator('#at-editor h2').first()).toHaveText(EDITOR[k]!);
  }
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată conică 20 pentru 20, gaură rotundă');
  // după „Calibrare”
  await fila(page, 'calibrare').click();
  await expect(page.locator('#at-galerie')).toBeHidden();
  await fila(page, 'caramizi').click();
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'panta');
  // modelul: nicio filă apăsată, nicio galerie; o filă duce înapoi la piesa ei
  await fila(page, 'roti').click();
  await page.locator('#at-in-model').click();
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(filaApasata(page)).toHaveCount(0);
  await expect(page.locator('#at-galerie')).toBeHidden();
  await fila(page, 'caramizi').click();
  await expect(page.locator('#at-vedere-mod [data-v="piesa"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'panta');
  // „Schimb-o în editor”: conica din model, pe fila Roți (deși acolo era aleasă fulia), iar Roți o ține minte
  await fila(page, 'roti').click();
  await piesa(page, 'fulie').click();
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await page.locator('#at-m-editeaza').click();
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'roti');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'conica');
  await expect(page.locator('#at-in-model')).toHaveText('Înlocuiește în model');
  // altă filă sau altă piesă din galerie: piesa nouă nu mai înlocuiește conica din model
  await fila(page, 'legaturi').click();
  await expect(page.locator('#at-in-model')).toHaveText('Pune în model');
  await fila(page, 'roti').click();
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'conica');
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await page.locator('#at-m-editeaza').click();
  await expect(page.locator('#at-in-model')).toHaveText('Înlocuiește în model');
  await piesa(page, 'coroana').click();
  await expect(page.locator('#at-in-model')).toHaveText('Pune în model');
  await piesa(page, 'conica').click();
  // „Placă cu găuri”: forma gata a cărămizii, pe aceeași filă; Cărămizi ține minte cărămida, cu placa în ea
  await fila(page, 'caramizi').click();
  await piesa(page, 'placaTechnic').click();
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'caramizi');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'caramida');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Placă 2×6, 5 găuri');
  await expect(page.locator('#at-toast')).toContainText('Placă Technic 2×6, cu găuri pe mijloc');
  await fila(page, 'roti').click();
  await fila(page, 'caramizi').click();
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'caramida');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Placă 2×6, 5 găuri');
});

/** Rândurile listei de printat, ca text: numele, mărimea, bucățile, filamentul, butonul. */
const randuri = (page: Page) => page.locator('#at-lista tr').evaluateAll((rs) => rs.map((r) => [...r.querySelectorAll('td')]
  .map((c) => c.querySelector('input')?.value ?? (c.textContent ?? '').replace(/\s+/g, ' ').trim())));

/** Stocarea lui 18.14.0 și ce arăta pagina publicată după ea: făcute cu pagina din `main` `0ab28651`, ca un om (piese din
 *  toate familiile, perechi, două piese în model, culoarea albastră, coroana 32 pentru pinionul de 16 în editor). */
const SALVAT = JSON.parse(readFileSync('test/fixtures/trenulet/atelier-18.14.0.json', 'utf8')) as {
  stocat: { stare: { tip: string }; lista: unknown[]; model: unknown[] };
  arata: { nume: string; fila: string[]; galerie: string[]; dinti: string; pinion: string; lista: string[][]; model: string; culoare: string };
};
/** Pagina de acum arată ce arăta 18.14.0: coroana în editor (acum pe fila Roți), aceleași rânduri în listă, modelul, culoarea. */
async function laFelCa18140(page: Page): Promise<void> {
  const { arata } = SALVAT;
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'roti');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'coroana');
  await expect(page.locator('#at-nume-piesa')).toHaveText(arata.nume);
  await expect(page.locator('#at-cr-dinti')).toHaveValue(arata.dinti);
  await expect(page.locator('#at-cr-pinion')).toHaveValue(arata.pinion);
  await expect.poll(() => randuri(page)).toEqual(arata.lista);
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveText(arata.model);
  await expect(page.locator('#at-culori [aria-pressed="true"]')).toHaveAttribute('data-c', arata.culoare);
}

test('o listă salvată de 18.14.0 se deschide la fel: piesa din editor, acum pe fila Roți, lista, modelul, culoarea; datele rămân aceleași', async ({ page }) => {
  const { stocat, arata } = SALVAT;
  // pagina 18.14.0 o arăta sub „Legături”, cu coroana aleasă în galeria lor
  expect([stocat.stare.tip, arata.fila, arata.galerie]).toEqual(['coroana', ['legaturi'], ['coroana']]);
  await deschide(page, stocat);
  await laFelCa18140(page);
  // scrise înapoi la deschidere: aceeași stare, aceeași listă, același model (nimic mutat); singura cheie nouă e starea
  // implicită a tipurilor venite după 18.14.0 (șenila, 3.To; elicea, 3.Tq; elicea de barcă, 3.Tr, cu înclinarea spre pupa
  // de la 3.Tt; ventilatorul, 3.Ts; conectorul perpendicular, 3.Ca; conectorul în unghi, 3.Cb; cremaliera, 3.Cc; arcul, 3.Cd; cama și roata cu palete, 3.Cj)
  const scris = JSON.parse(await page.evaluate((k) => localStorage.getItem(k) ?? 'null', CHEIE)) as typeof stocat;
  const { senila, elice, eliceBarca, ventilator, conector, conectorUnghi, cremaliera, arc, cama, roataPalete, ...stare } = scris.stare as Record<string, unknown>;
  expect([stare, scris.lista, scris.model]).toEqual([stocat.stare, stocat.lista, stocat.model]);
  expect(senila).toEqual({ piesa: 'zala', gauriStift: 'da', dinti: 10, gaura: 'x', pereche: 10, distanta: 8 });
  expect(elice).toEqual({ palete: 3, diametru: 72, pas: 0.7, latime: 30, forma: 'rot', paleta: 'rasucita', profil: 'placa', sens: 'dreapta', gaura: 'x', con: 'nu' });
  expect(eliceBarca).toEqual({ palete: 3, diametru: 40, pas: 1, latime: 100, inclinare: 20, pupa: 0, sens: 'dreapta', gaura: 'x', capac: 'nu' });
  expect(ventilator).toEqual({ piesa: 'rotor', palete: 7, diametru: 40, joc: 0.8, pas: 0.8, latime: 45, sens: 'dreapta', gaura: 'x', inel: 'nu', urechi: 2 });
  expect(conector).toEqual({ gauri: ['xv', 'ro'] });
  expect(conectorUnghi).toEqual({ mansoane: [[0, 'x'], [135, 'x']], butuc: 'r' });
  expect(cremaliera).toEqual({ lung: 4, modul: 1, prindere: 'stifturi', roata: 8 });
  expect(arc).toEqual({ lung: 4, inalt: 1, bolta: 'inalta' });
  expect(cama).toEqual({ forma: 'excentric', diam: 16, cursa: 8, grosime: 7.8, gaura: 'x' });
  expect(roataPalete).toEqual({ diam: 64, palete: 8, lat: 15.8, forma: 'drepte', disc: 'unul', gaura: 'x' });
});

test('pe claude.ai, lista salvată de 18.14.0 vine din baza artefactului după ce partea 3D a pornit: filele și galeria o urmează', async ({ page }) => {
  // baza artefactului (`window.claude.use('db')`, cât folosește pagina), care răspunde cu stocarea lui 18.14.0 abia la semnal;
  // pe calculatorul acesta, `localStorage` e gol (alt browser decât cel care a salvat)
  await page.addInitScript((s) => {
    const w = window as unknown as { claude: unknown; dbGata?: boolean };
    const asteapta = async (): Promise<void> => { while (!w.dbGata) await new Promise((r) => setTimeout(r, 20)); };
    const doc = (cale: string) => ({
      get: async () => {
        if (cale !== 'atelier/curent') return { exists: false, data: () => ({}) };
        await asteapta();
        return { exists: true, data: () => JSON.parse(s) as unknown };
      },
      set: async () => undefined, delete: async () => undefined,
    });
    const colectie = () => ({ doc: () => ({ id: String(Math.random()).slice(2) }),
      orderBy: () => ({ onSnapshot: (f: (x: { docs: never[] }) => void) => { setTimeout(() => f({ docs: [] }), 0); return () => undefined; } }) });
    w.claude = { use: async (ce: string) => (ce === 'db' ? { doc, collection: colectie } : { save: async () => undefined }) };
  }, JSON.stringify(SALVAT.stocat));
  await deschide(page);
  // partea 3D a pornit cu piesa de la început, înainte ca baza să răspundă
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'caramizi');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'caramida');
  await page.evaluate(() => { (window as unknown as { dbGata: boolean }).dbGata = true; });
  await laFelCa18140(page);
});

test('pe telefon (390 px): filele și galeria fiecărei familii încap, fără depășire; galeria stă sub file, deasupra vederii 3D', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await deschide(page);
  for (const [f, , piese] of FAMILII) {
    await fila(page, f).click();
    await expect(page.locator('#at-galerie button')).toHaveCount(piese.length);
    // nicio depășire: nici a paginii, nici a părții 3D (care se derulează singură)
    expect(await page.evaluate(() => {
      const m = document.querySelector('#mod-3d')!;
      return [document.documentElement.scrollWidth - innerWidth, m.scrollWidth - m.clientWidth];
    })).toEqual([0, 0]);
    for (const b of await page.locator('#at-tipuri button:visible, #at-galerie button').all()) {
      const r = (await b.boundingBox())!;
      expect(r.x, await b.textContent() ?? '').toBeGreaterThanOrEqual(0);
      expect(r.x + r.width, await b.textContent() ?? '').toBeLessThanOrEqual(390);
    }
    // și întregi: fiecare filă și fiecare piesă pe un singur rând (strânse pe un rând prea plin, numele s-ar rupe în pastilă)
    expect(await page.locator('#at-tipuri button:visible, #at-galerie button').evaluateAll((bs) => bs.filter((b) => {
      const r = document.createRange();
      r.selectNodeContents(b);
      const rs = [...r.getClientRects()].filter((x) => x.width > 0);
      return rs.some((x) => x.top >= rs[0]!.bottom - 1);
    }).map((b) => b.textContent))).toEqual([]);
    const t = (await page.locator('#at-tipuri').boundingBox())!, g = (await page.locator('#at-galerie').boundingBox())!;
    const v = (await page.locator('#at-vedere').boundingBox())!;
    expect(g.y).toBeGreaterThanOrEqual(t.y + t.height);
    expect(g.y + g.height).toBeLessThan(v.y);
  }
});
