import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Calculul CAM în workerul lui (ADR 0109), în Edge:
 * - workerul CONSTRUIT (`dist/assets/lucratorCam-*.js`, cel din aplicație) întoarce, pe tot corpusul
 *   (`test/unit/ajutor-corpus-cam.ts`), bit cu bit ce dă același cod rulat pe firul principal al paginii (același motor);
 * - față de calculul direct în Node (`cam-node.ts`): octeții și SHA-256 fiecărui fișier, rezumatul, avertismentele și
 *   felurile mișcărilor sunt aceleași; dublele programului și ale mutărilor, cel mult 1e-6 mm. Edge și Node au alt V8, cu
 *   alte funcții matematice (`sin`, `cos`, `atan2`… diferă pe ultimul bit, măsurat pe 30.10): pe curbe, centrul unui arc
 *   aproape drept le duce până la 4,65e-7 mm (placa 2), sub rotunjirea G-code-ului la 0,001 mm;
 * - pe calea omului: placa 2, deschisă ca proiect salvat și exportată din fereastra exportului, e fișierul ei de aur;
 * - pe documentul mare (2 304 de forme), cât calculează CAM-ul traseului, pânza primește cadre (firul principal nu
 *   îngheață), iar un document schimbat în timpul calculului îl anulează: workerul se oprește, rezultatul vechi nu apare.
 */
test.use({ locale: 'ro-RO' });

const LUCRATOR = readdirSync('dist/assets').find((f) => /^lucratorCam-[\w-]+\.js$/.test(f));
const nod = (...arg: string[]): string => execFileSync(process.execPath, ['test/e2e/cam-node.ts', ...arg], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });

type Caz = { readonly id: string; readonly cerere: { readonly fel: string }; readonly asteptat: unknown };

/**
 * Răspunsurile workerului construit, aduse la forma așteptării (tablourile în base64): într-un worker (`fir: false`) sau
 * cu același script încărcat pe firul principal al paginii (`fir: true`; scriptul își pune ascultătorul pe `self`, adică
 * pe fereastră, iar răspunsul lui se prinde din `postMessage`).
 */
async function raspunsuri(page: Page, cazuri: readonly Caz[], fir: boolean): Promise<unknown[]> {
  return page.evaluate(async ({ url, cazuri, fir }) => {
    type V = { buffer: ArrayBufferLike; byteOffset: number; byteLength: number };
    const b64 = (v: V): string => {
      const u = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
      let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
      return btoa(s);
    };
    type Raspuns = { ok: boolean; raspuns?: Record<string, any>; motiv?: string };
    const inWorker = (cerere: unknown): Promise<Raspuns> => new Promise((ok, eroare) => {
      const w = new Worker(url, { type: 'module' });
      w.onerror = (e) => { w.terminate(); eroare(new Error(e.message)); };
      w.onmessage = (e: MessageEvent<Raspuns>) => { w.terminate(); ok(e.data); };
      w.postMessage({ id: 1, cerere });
    });
    const fereastra = window as unknown as {
      onmessage: ((e: { data: unknown }) => void) | null; postMessage: (m: Raspuns) => void; camIncarcat?: boolean;
    };
    const peFir = async (cerere: unknown): Promise<Raspuns> => {
      if (!fereastra.camIncarcat) {
        await import(url);
        fereastra.camIncarcat = true;
      }
      const trimite = fereastra.postMessage;
      try {
        return await new Promise<Raspuns>((ok) => {
          fereastra.postMessage = (m) => { ok(m); };
          fereastra.onmessage?.({ data: { id: 1, cerere } });
        });
      } finally {
        fereastra.postMessage = trimite;
      }
    };
    const iesire: unknown[] = [];
    for (const c of cazuri) {
      const m = await (fir ? peFir(c.cerere) : inWorker(c.cerere));
      const r = m.raspuns;
      if (!m.ok || !r) throw new Error(`${c.id}: ${m.motiv ?? 'fără răspuns'}`);
      if (!r['ok']) { iesire.push(r); continue; }
      const mutari = (s: Record<string, any>): string[] => [s['mutari'], ...(s['apoi'] ?? []).map((g: Record<string, any>) => g['mutari'])].map(b64);
      if (c.cerere.fel === 'export') {
        const s = r['simulare'];
        iesire.push({
          ok: true,
          fisiere: r['fisiere'].map((f: Record<string, any>) => ({ b64: b64(f['octeti']), sha256: f['sha256'], linii: f['linii'], sectiuni: f['sectiuni'], scula: f['scula'] })),
          rezumat: r['rezumat'], avertismente: r['avertismente'], foaie: r['foaie'],
          simulare: s['ok'] ? { scula: s['scula'], mutari: mutari(s) } : s,
        });
      } else if (c.cerere.fel === 'traseu') {
        const p = r['program'];
        iesire.push({
          ok: true, axe: p['axe'], scula: p['scula'], turatie: p['turatie'], zSigur: p['zSigur'], texte: p['texte'], scule: p['scule'],
          feluri: b64(p['feluri']), masti: b64(p['masti']), numere: b64(p['numere']),
        });
      } else {
        iesire.push({ ok: true, scula: r['simulare']['scula'], mutari: mutari(r['simulare']) });
      }
    }
    return iesire;
  }, { url: `/assets/${LUCRATOR ?? ''}`, cazuri, fir });
}

const dubleDin = (b: string): Float64Array => {
  const u = Buffer.from(b, 'base64');
  return new Float64Array(u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength));
};

/** Cea mai mare abatere dintre două tablouri de duble (în base64), și câte valori diferă; lungimi diferite = Infinity. */
function abatere(a: string, b: string): { readonly max: number; readonly diferite: number } {
  const x = dubleDin(a), y = dubleDin(b);
  if (x.length !== y.length) return { max: Infinity, diferite: Math.max(x.length, y.length) };
  let max = 0, diferite = 0;
  for (let i = 0; i < x.length; i++) {
    if (Object.is(x[i], y[i])) continue;
    diferite++;
    max = Math.max(max, Math.abs((x[i] as number) - (y[i] as number)));
  }
  return { max, diferite };
}

/** Cât pot diferi dublele programului și ale mutărilor între Edge și Node (motorul, nu workerul), în mm. */
const TOLERANTA = 1e-6;

/** Edge față de Node: totul egal, în afară de duble, comparate până la `TOLERANTA`. Câte au ieșit diferite și cât de mult. */
function comparaCuNode(edge: unknown, asteptat: unknown, id: string): { diferite: number; max: number } {
  const faraDuble = (x: unknown): unknown => {
    if (x === null || typeof x !== 'object') return x;
    const o = { ...(x as Record<string, unknown>) };
    if ('numere' in o) o['numere'] = 'duble';
    if ('mutari' in o) o['mutari'] = 'duble';
    const s = o['simulare'] as Record<string, unknown> | undefined;
    if (s && typeof s === 'object' && 'mutari' in s) o['simulare'] = { ...s, mutari: 'duble' };
    return o;
  };
  expect(faraDuble(edge), id).toEqual(faraDuble(asteptat));
  const e = edge as Record<string, any>, a = asteptat as Record<string, any>;
  const perechi: Array<[string, string]> = [];
  if (typeof a['numere'] === 'string') perechi.push([e['numere'], a['numere']]);
  const me: string[] | undefined = e['mutari'] ?? e['simulare']?.['mutari'];
  const ma: string[] | undefined = a['mutari'] ?? a['simulare']?.['mutari'];
  if (Array.isArray(ma)) {
    expect(me?.length, `${id}: grupurile mutărilor`).toBe(ma.length);
    ma.forEach((m, k) => { perechi.push([me?.[k] ?? '', m]); });
  }
  let diferite = 0, max = 0;
  for (const [x, y] of perechi) {
    const d = abatere(x, y);
    expect(d.max, `${id}: dublele (${d.diferite} diferite)`).toBeLessThanOrEqual(TOLERANTA);
    diferite += d.diferite;
    max = Math.max(max, d.max);
  }
  return { diferite, max };
}

test('workerul CAM construit, pe tot corpusul: bit cu bit ca același cod pe firul principal; față de Node, aceiași octeți G-code', async ({ page }) => {
  test.setTimeout(240_000);
  expect(LUCRATOR, 'workerul CAM lipsește din dist/assets (build-ul)').toBeTruthy();
  const cazuri = JSON.parse(nod()) as Caz[];
  expect(cazuri.length).toBeGreaterThanOrEqual(50);
  await page.goto('/');
  const worker = await raspunsuri(page, cazuri, false);
  const fir = await raspunsuri(page, cazuri, true);
  // Același motor: workerul nu schimbă nimic, nici ultimul bit al unei duble.
  cazuri.forEach((c, k) => { expect(worker[k], `${c.id}: workerul față de firul principal`).toEqual(fir[k]); });
  // Față de Node: octeții G-code (și SHA-256) identici; dublele, în toleranță.
  let diferite = 0, max = 0, exacte = 0;
  cazuri.forEach((c, k) => {
    const d = comparaCuNode(worker[k], c.asteptat, c.id);
    diferite += d.diferite;
    max = Math.max(max, d.max);
    if (d.diferite === 0) exacte++;
  });
  console.log(`Edge față de Node: ${exacte} / ${cazuri.length} cazuri bit cu bit; ${diferite} duble diferite, cel mult ${max.toExponential(2)} mm`);
  // Martorul: proba compară octeți reali (nu „nimic” cu „nimic”).
  const fisiere = cazuri.flatMap((c) => ((c.asteptat as { fisiere?: Array<{ b64: string }> }).fisiere ?? []));
  expect(fisiere.length).toBeGreaterThanOrEqual(25);
  expect(fisiere.every((f) => f.b64.length > 100)).toBe(true);
});

/** Scrie direct în baza aplicației o versiune a proiectului (ca o salvare), apoi reîncarcă: aplicația o deschide. */
async function deschide(page: Page, text: string): Promise<void> {
  await page.goto('/');
  // Întâi aplicația își creează baza (cu tabelele ei); o deschidere din test înaintea ei ar crea-o goală.
  await expect(page.getByTestId('lista-vectori')).toBeVisible();
  await page.evaluate(async (text) => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    await new Promise<void>((ok, eroare) => {
      const tx = db.transaction('versiuni', 'readwrite');
      tx.objectStore('versiuni').put(text, ['proiect', 1_000_000]);
      tx.oncomplete = () => { ok(); };
      tx.onerror = () => { eroare(tx.error); };
    });
    db.close();
  }, text);
  await page.reload();
  await expect(page.getByTestId('lista-vectori')).toBeVisible();
}

test('pe calea omului: placa 2, deschisă ca proiect și exportată din fereastră, e fișierul de aur, octet cu octet', async ({ page }) => {
  await deschide(page, nod('--document', 'placa-02'));
  await page.locator('[data-actiune="export.gcode"]').click();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const d = await descarcare;
  expect(readFileSync(await d.path()).equals(readFileSync('test/placi/placa-02/placa-02.nc'))).toBe(true);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

/** Cadrele pânzei, cu starea cipului traseului la fiecare: așa se vede dacă firul principal a stat cât a calculat CAM-ul. */
async function pornesteCadrele(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { cadre: Array<[number, string]> };
    w.cadre = [];
    const f = (t: number): void => {
      w.cadre.push([t, document.querySelector('[data-testid="traseu-stare"]')?.getAttribute('data-stare') ?? '']);
      if (w.cadre.length < 20_000) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}

/** Cel mai lung gol dintre două cadre cât cipul spunea „se calculează”, și câte cadre au venit atunci. */
async function golulCalculului(page: Page): Promise<{ golMs: number; cadre: number }> {
  return page.evaluate(() => {
    const c = (window as unknown as { cadre: Array<[number, string]> }).cadre;
    let gol = 0, cadre = 0;
    for (let i = 1; i < c.length; i++) {
      const [t0, s0] = c[i - 1] as [number, string];
      if (s0 !== 'traseu.calcul') continue;
      cadre++;
      gol = Math.max(gol, (c[i] as [number, string])[0] - t0);
    }
    return { golMs: gol, cadre };
  });
}

test('documentul mare: cât calculează CAM-ul traseului în worker, pânza primește cadre; apoi traseul apare', async ({ page }) => {
  test.setTimeout(120_000);
  await deschide(page, nod('--mare', '48'));
  await pornesteCadrele(page);
  await page.keyboard.press('t');
  const cip = page.getByTestId('traseu-stare');
  await expect(cip).toHaveAttribute('data-stare', 'traseu.calcul');
  await expect(page.locator('[data-stare="traseu.calcul"]')).toHaveCount(0, { timeout: 60_000 });
  const { golMs, cadre } = await golulCalculului(page);
  console.log(`documentul mare: ${cadre} cadre cât a calculat CAM-ul, cel mai lung gol ${golMs.toFixed(0)} ms`);
  // Pe firul principal, CAM-ul acestui document ținea pânza ~0,5 s (măsurat pe 30.10, ADR 0109); în worker, doar
  // trimiterea documentului și primirea programului.
  expect(cadre).toBeGreaterThanOrEqual(5);
  expect(golMs).toBeLessThan(250);
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-stare="traseu.refuz"]')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un document schimbat în timpul calculului îl anulează: workerul se oprește, rezultatul vechi nu apare, T calculează din nou', async ({ page }) => {
  test.setTimeout(120_000);
  // Workerele paginii, învelite: ora fiecărei opriri (cu numele workerului) și ora apăsării pe Delete.
  await page.addInitScript(() => {
    const w = window as unknown as { oprite: Array<[string, number]>; sters: number };
    w.oprite = [];
    w.sters = Number.NaN;
    const W = window.Worker;
    window.Worker = class extends W {
      readonly nume: string;
      constructor(u: string | URL, o?: WorkerOptions) {
        super(u, o);
        this.nume = o?.name ?? '';
      }
      override terminate(): void {
        w.oprite.push([this.nume, performance.now()]);
        super.terminate();
      }
    };
    window.addEventListener('keydown', (e) => { if (e.key === 'Delete') w.sters = performance.now(); }, true);
  });
  await deschide(page, nod('--mare', '48'));
  // Rama din colțul stânga-jos (latura ei stângă, la x = 10 mm), aleasă înainte, ca ștergerea să vină imediat după T.
  const v = await vedere(page);
  const pe = await ecran(page, v);
  const p = pe(10, 30);
  await page.mouse.click(p.x, p.y);
  await page.keyboard.press('t');
  await expect(page.getByTestId('traseu-stare')).toHaveAttribute('data-stare', 'traseu.calcul');
  await page.keyboard.press('Delete');
  // Fără un traseu de dinainte, nu se mai arată nimic: nici cipul, nici butonul apăsat; nici după cât ar fi durat calculul.
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('traseu-stare')).toHaveCount(0);
  // Workerul traseului s-a oprit chiar la ștergere (CAM-ul lui mai avea de lucru sute de ms), nu la capătul calculului.
  const { oprite, sters } = await page.evaluate(() => {
    const w = window as unknown as { oprite: Array<[string, number]>; sters: number };
    return { oprite: w.oprite, sters: w.sters };
  });
  const traseu = oprite.filter(([n]) => n === 'cam-traseu');
  expect(traseu.length, JSON.stringify(oprite)).toBe(1);
  expect((traseu[0] as [string, number])[1] - sters).toBeLessThan(150);
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'false');
  // Pe documentul de acum, „Arată traseul” calculează din nou și ajunge la capăt.
  await page.keyboard.press('t');
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-stare="traseu.calcul"]')).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator('[data-stare="traseu.refuz"]')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
