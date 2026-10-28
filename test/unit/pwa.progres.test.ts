/**
 * Progresul instalării workerului PWA (ADR 0097), partea workerului: pluginul strategiei precache-ului adună mărimile din
 * manifest după fiecare fișier terminat la instalare și trimite procentul doar când se schimbă; starea de până acum, pentru
 * o filă care întreabă; mesajele și procentul (`src/pwa/protocol.ts`). Pagina care îl arată: `pwa.actualizare.test.ts`; pe build-ul real: `test/e2e/pwa.spec.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pluginProgres } from '../../src/pwa/progres.ts';
import { esteCerereProgres, esteProgres, esteSkipWaiting, MESAJ_CERE_PROGRES, MESAJ_SKIP_WAITING, procentDin, TIP_PROGRES, type MesajProgres } from '../../src/pwa/protocol.ts';

const BAZA = 'https://cncvs.test/sw.js';
const MANIFEST = [
  { url: 'index.html', marime: 100 },
  { url: 'assets/index-AAAAAAAA.js', marime: 300 },
  { url: 'mesaje/ro.json', marime: 600 },
] as const;

/** Pluginul pe un manifest, cu mesajele trimise strânse în ordine. */
function banc(manifest: Parameters<typeof pluginProgres>[0] = MANIFEST, trimite?: (m: MesajProgres) => Promise<void>) {
  const trimise: MesajProgres[] = [];
  const progres = pluginProgres(manifest, BAZA, trimite ?? (async (m) => { trimise.push(m); }));
  const pas = (cale: string, tip: string) => ({ request: { url: new URL(cale, 'https://cncvs.test/').href }, event: { type: tip } });
  const incepe = (cale: string, tip = 'install'): Promise<void> => progres.plugin.handlerWillStart(pas(cale, tip));
  const termina = async (cale: string, tip = 'install'): Promise<void> => {
    await incepe(cale, tip);
    await progres.plugin.handlerDidComplete(pas(cale, tip));
  };
  return { trimise, incepe, termina, stare: progres.stare };
}

const procente = (m: readonly MesajProgres[]): number[] => m.map(procentDin);

test('după fiecare fișier al instalării: octeții gata din total, în ordine, până la 100', async () => {
  const b = banc();
  await b.termina('/index.html');
  await b.termina('/assets/index-AAAAAAAA.js');
  await b.termina('/mesaje/ro.json');
  assert.deepEqual(b.trimise, [
    { type: TIP_PROGRES, gata: 100, total: 1000 },
    { type: TIP_PROGRES, gata: 400, total: 1000 },
    { type: TIP_PROGRES, gata: 1000, total: 1000 },
  ]);
  assert.deepEqual(procente(b.trimise), [10, 40, 100]);
});

test('adresele din manifest se citesc față de adresa workerului, ca la Workbox', async () => {
  const b = banc([{ url: 'assets/a.js', marime: 5 }]);
  await b.termina('/assets/a.js');
  assert.deepEqual(b.trimise, [{ type: TIP_PROGRES, gata: 5, total: 5 }]);
});

test('un fișier terminat de două ori, unul necunoscut și cererile din afara instalării nu se numără', async () => {
  const b = banc();
  await b.termina('/index.html');
  await b.termina('/index.html');
  await b.termina('/necunoscut.js');
  // Precache-ul servește și cererile paginii (`fetch`): ele nu sunt instalarea.
  await b.termina('/assets/index-AAAAAAAA.js', 'fetch');
  assert.deepEqual(b.trimise, [{ type: TIP_PROGRES, gata: 100, total: 1000 }]);
  await b.termina('/assets/index-AAAAAAAA.js');
  assert.deepEqual(procente(b.trimise), [10, 40]);
});

test('același procent nu se trimite de două ori', async () => {
  const b = banc([{ url: 'a', marime: 1 }, { url: 'b', marime: 1 }, { url: 'c', marime: 998 }]);
  await b.termina('/a');
  await b.termina('/b');
  await b.termina('/c');
  assert.deepEqual(b.trimise.map((m) => m.gata), [1, 1000], 'al doilea fișier tot 0 %');
});

test('fără mărimi în manifest (un build vechi), nimic de trimis: un total de 0 n-are procent', async () => {
  const b = banc([{ url: 'a' }, 'b', { url: 'c', marime: 0 }]);
  await b.termina('/a');
  await b.termina('/b');
  await b.termina('/c');
  assert.deepEqual(b.trimise, []);
});

test('o trimitere căzută nu respinge (instalarea ar cădea odată cu ea), iar următoarea pleacă', async () => {
  let cazute = 0;
  const trimise: MesajProgres[] = [];
  const b = banc(MANIFEST, async (m) => {
    if (m.gata === 100) {
      cazute++;
      throw new Error('fila s-a închis');
    }
    trimise.push(m);
  });
  await b.termina('/index.html');
  await b.termina('/assets/index-AAAAAAAA.js');
  assert.equal(cazute, 1);
  assert.deepEqual(procente(trimise), [40]);
});

test('procentul: întreg, rotunjit în jos, 100 doar când e gata tot', () => {
  assert.equal(procentDin({ gata: 0, total: 7 }), 0);
  assert.equal(procentDin({ gata: 999, total: 1000 }), 99);
  assert.equal(procentDin({ gata: 1, total: 3 }), 33);
  assert.equal(procentDin({ gata: 2, total: 3 }), 66);
  assert.equal(procentDin({ gata: 7, total: 7 }), 100);
});

test('mesajul de progres: doar forma lui trece', () => {
  assert.equal(esteProgres({ type: TIP_PROGRES, gata: 0, total: 10 }), true);
  assert.equal(esteProgres({ type: TIP_PROGRES, gata: 10, total: 10 }), true);
  for (const m of [
    null, 'PROGRES_INSTALARE', { type: 'SKIP_WAITING' }, { type: TIP_PROGRES, gata: 1 }, { type: TIP_PROGRES, total: 1 },
    { type: TIP_PROGRES, gata: 11, total: 10 }, { type: TIP_PROGRES, gata: -1, total: 10 }, { type: TIP_PROGRES, gata: 0, total: 0 },
    { type: TIP_PROGRES, gata: Number.NaN, total: 10 }, { type: TIP_PROGRES, gata: 1, total: Number.POSITIVE_INFINITY },
    { type: TIP_PROGRES, gata: '1', total: 10 }, { type: 'ALT', gata: 1, total: 10 },
  ]) assert.equal(esteProgres(m), false, JSON.stringify(m));
});

test('starea de până acum (o filă care întreabă): nimic înaintea instalării, apoi octeții gata, și la 0', async () => {
  const b = banc();
  assert.equal(b.stare(), null, 'înaintea instalării');
  await b.incepe('/index.html', 'fetch');
  assert.equal(b.stare(), null, 'o cerere a paginii nu e instalarea');
  await b.incepe('/index.html');
  assert.deepEqual(b.stare(), { type: TIP_PROGRES, gata: 0, total: 1000 }, 'primul fișier, încă neadus');
  await b.termina('/index.html');
  await b.incepe('/assets/index-AAAAAAAA.js');
  assert.deepEqual(b.stare(), { type: TIP_PROGRES, gata: 100, total: 1000 });
});

test('starea, fără mărimi în manifest: nimic de spus nici la întrebare', async () => {
  const b = banc([{ url: 'a' }]);
  await b.termina('/a');
  assert.equal(b.stare(), null);
});

test('cererea progresului și SKIP_WAITING nu se confundă', () => {
  assert.equal(esteCerereProgres(MESAJ_CERE_PROGRES), true);
  assert.equal(esteCerereProgres(MESAJ_SKIP_WAITING), false);
  assert.equal(esteSkipWaiting(MESAJ_CERE_PROGRES), false);
  for (const m of [null, 'CERE_PROGRES', {}, { type: TIP_PROGRES, gata: 0, total: 1 }]) assert.equal(esteCerereProgres(m), false, JSON.stringify(m));
});
