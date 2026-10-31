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
 * - pe un document greu pentru CAM (3 136 de forme într-o piesă), cât calculează workerul traseul, pânza primește cadre
 *   (firul principal nu stă), iar un document schimbat în timpul calculului îl anulează: workerul se oprește fără răspuns,
 *   rezultatul vechi nu apare.
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
  // Textul vine din alt proces (`cam-node.ts`): unul tăiat cade aici, pe loc, nu peste un minut, în aplicație.
  expect(() => JSON.parse(text), `documentul de deschis (${text.length} caractere) nu e JSON întreg`).not.toThrow();
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
  // Proiectul e deschis înaintea primei randări, deci primul rând al listei vine odată cu ea. Dacă nu vine (aplicația a refuzat
  // proiectul și a pornit unul nou), eroarea spune ce a zis aplicația la deschidere (bara de jos, jurnalul local) și ce e în
  // bază: așa s-a văzut, pe CI (31.10), documentul greu tăiat de `cam-node.ts` la 146 176 de caractere din 449 000.
  await page.getByTestId('lista-vectori').locator('button[data-instanta]').first().waitFor({ timeout: 60_000 }).catch(async (e: unknown) => {
    const stare = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((ok, eroare) => {
        const r = indexedDB.open('cncvs2-proiecte', 1);
        r.onsuccess = () => { ok(r.result); };
        r.onerror = () => { eroare(r.error); };
      });
      const t0 = performance.now();
      const versiuni = await new Promise<string[]>((ok, eroare) => {
        const r = db.transaction('versiuni', 'readonly').objectStore('versiuni').openCursor();
        const lista: string[] = [];
        r.onsuccess = () => {
          const c = r.result;
          if (!c) { ok(lista); return; }
          lista.push(`${JSON.stringify(c.key)}: ${typeof c.value === 'string' ? `${c.value.length} caractere` : typeof c.value}`);
          c.continue();
        };
        r.onerror = () => { eroare(r.error); };
      }).catch((x: unknown) => [`citirea a căzut: ${x instanceof Error ? `${x.name}: ${x.message}` : String(x)}`]);
      const citireMs = Math.round(performance.now() - t0);
      db.close();
      return {
        proiect: document.querySelector('[data-testid="proiect"]')?.textContent ?? null,
        jurnal: localStorage.getItem('cncvs2.jurnalErori.v1'),
        versiuni,
        citireMs,
        browserul: navigator.userAgent,
      };
    });
    throw new Error(`proiectul n-a ajuns în listă: ${JSON.stringify(stare)}`, { cause: e });
  });
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

/**
 * Ceasurile paginii: fiecare cadru al pânzei, apoi fiecare worker CAM pornit, cu ora la care a răspuns și la care s-a oprit
 * (după numele lui, `cam-<fel>`), și ora apăsării pe Delete. Așa se vede ce face firul principal cât lucrează workerul.
 */
async function ceasuri(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as {
      cadre: number[]; workere: Array<{ nume: string; pornit: number; raspuns: number; oprit: number }>; sters: number;
    };
    w.cadre = [];
    w.workere = [];
    w.sters = Number.NaN;
    const f = (t: number): void => {
      w.cadre.push(t);
      if (w.cadre.length < 100_000) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    const W = window.Worker;
    window.Worker = class extends W {
      readonly ceas: { nume: string; pornit: number; raspuns: number; oprit: number };
      constructor(u: string | URL, o?: WorkerOptions) {
        super(u, o);
        this.ceas = { nume: o?.name ?? '', pornit: performance.now(), raspuns: Number.NaN, oprit: Number.NaN };
        w.workere.push(this.ceas);
        this.addEventListener('message', () => { if (Number.isNaN(this.ceas.raspuns)) this.ceas.raspuns = performance.now(); });
      }
      override terminate(): void {
        if (Number.isNaN(this.ceas.oprit)) this.ceas.oprit = performance.now();
        super.terminate();
      }
    };
    window.addEventListener('keydown', (e) => { if (e.key === 'Delete') w.sters = performance.now(); }, true);
  });
}

type Ceasuri = { readonly cadre: number[]; readonly workere: Array<{ nume: string; pornit: number; raspuns: number; oprit: number }>; readonly sters: number };
const citesteCeasurile = (page: Page): Promise<Ceasuri> => page.evaluate(() => {
  const w = window as unknown as Ceasuri;
  return { cadre: w.cadre, workere: w.workere, sters: w.sters };
});

test('documentul greu: cât calculează workerul CAM traseul, pânza primește cadre (firul principal nu stă); apoi traseul apare', async ({ page }) => {
  test.setTimeout(120_000);
  await ceasuri(page);
  await deschide(page, nod('--greu', '56'));
  await page.keyboard.press('t');
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('traseu-timp')).toBeVisible({ timeout: 60_000 });
  const c = await citesteCeasurile(page);
  const w = c.workere.find((x) => x.nume === 'cam-traseu');
  expect(w, `workerele: ${JSON.stringify(c.workere)}`).toBeTruthy();
  if (!w) return;
  // Fereastra calculului: de la pornirea workerului până la răspunsul lui. Pe firul principal, CAM-ul acestui document ar
  // ține pânza toată fereastra (~0,4–0,5 s în Node). Singurul gol lung e la început (măsurat pe 30.10: 100–183 ms, la ~20
  // ms după pornire): copia documentului spre worker și randarea stării „se calculează”. Pragul e o parte din fereastră,
  // nu milisecunde fixe, ca pe o mașină mai lentă (CI) să judece la fel.
  const fereastra = w.raspuns - w.pornit;
  const cadre = c.cadre.filter((t) => t >= w.pornit && t <= w.raspuns);
  const repere = [w.pornit, ...cadre, w.raspuns];
  const gol = Math.max(...repere.slice(1).map((t, k) => t - (repere[k] as number)));
  console.log(`documentul greu: workerul a calculat ${fereastra.toFixed(0)} ms; ${cadre.length} cadre, cel mai lung gol ${gol.toFixed(0)} ms`);
  expect(fereastra, 'fereastra calculului e destul de lungă ca proba să spună ceva').toBeGreaterThan(150);
  expect(cadre.length).toBeGreaterThanOrEqual(5);
  expect(gol).toBeLessThan(0.6 * fereastra);
  expect(w.oprit - w.raspuns, 'workerul se oprește la răspuns').toBeLessThan(50);
  await expect(page.locator('[data-stare="traseu.refuz"]')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un document schimbat în timpul calculului îl anulează: workerul se oprește, rezultatul vechi nu apare, T calculează din nou', async ({ page }) => {
  test.setTimeout(120_000);
  await ceasuri(page);
  await deschide(page, nod('--greu', '56'));
  // Piesa (rama din colțul stânga-jos, latura ei stângă, la x = 10 mm), aleasă înainte, ca ștergerea să vină imediat după T.
  const v = await vedere(page);
  const pe = await ecran(page, v);
  const p = pe(10, 25);
  await page.mouse.click(p.x, p.y);
  await page.keyboard.press('t');
  await expect(page.getByTestId('traseu-stare')).toHaveAttribute('data-stare', 'traseu.calcul');
  await page.keyboard.press('Delete');
  // Fără un traseu de dinainte, nu se mai arată nimic: nici cipul, nici butonul apăsat; nici după cât ar fi durat calculul.
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('traseu-stare')).toHaveCount(0);
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'false');
  // Workerul traseului s-a oprit chiar la ștergere, fără răspuns (CAM-ul lui mai avea de lucru), nu la capătul calculului.
  const c = await citesteCeasurile(page);
  const traseu = c.workere.filter((x) => x.nume === 'cam-traseu');
  expect(traseu.length, JSON.stringify(c.workere)).toBe(1);
  const w = traseu[0] as Ceasuri['workere'][number];
  expect(Number.isNaN(w.raspuns), 'workerul oprit n-a mai apucat să răspundă').toBe(true);
  expect(w.oprit - c.sters, 'oprit chiar după ștergere').toBeLessThan(1000);
  // Pe documentul de acum (gol), „Arată traseul” calculează din nou și spune de ce nu se poate.
  await page.keyboard.press('t');
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-stare="traseu.refuz"]')).toHaveCount(1, { timeout: 60_000 });
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
