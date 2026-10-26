/**
 * Sesiunea mașinii (ADR 0081), cu un ceas fals: conectarea la mașina simulată (bannerul, rapoartele la 200 ms), programul unei
 * plăci trimis până la capăt (exact octeții ei la emulator), o linie ruptă în două bucăți, refuzurile fără port, portul care
 * se închide (în flux: pierdut, cu motivul), scrierea căzută, jurnalul comenzilor manuale, ce nu știe simularea, publicarea rară.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deschideSimulata } from '../../src/machine/MasinaSimulata.ts';
import { incarcaProgram } from '../../src/machine/program.ts';
import { SesiuneMasina, type Ceas, type Transport } from '../../src/machine/sesiune.ts';
import { octeti, primitiFaraTimpReal } from './ajutor-sender.ts';

/** Un ceas fals: timerele pornesc doar la `avanseaza`, iar între ele se golesc promisiunile (scrierile sesiunii). */
class CeasFals implements Ceas {
  t = 0;
  private urm = 1;
  private timere: { id: number; la: number; perioada: number | null; f: () => void }[] = [];
  readonly setInterval = (f: () => void, ms: number): number => { const id = this.urm++; this.timere.push({ id, la: this.t + ms, perioada: ms, f }); return id; };
  readonly setTimeout = (f: () => void, ms: number): number => { const id = this.urm++; this.timere.push({ id, la: this.t + ms, perioada: null, f }); return id; };
  readonly clearInterval = (id: unknown): void => { this.timere = this.timere.filter((x) => x.id !== id); };
  async avanseaza(ms: number): Promise<void> {
    const tinta = this.t + ms;
    await golire();
    for (;;) {
      const x = [...this.timere].sort((a, b) => a.la - b.la || a.id - b.id)[0];
      if (!x || x.la > tinta) break;
      this.t = x.la;
      if (x.perioada === null) this.timere = this.timere.filter((y) => y !== x);
      else x.la += x.perioada;
      x.f();
      await golire();
    }
    this.t = tinta;
  }
}
const golire = (): Promise<void> => new Promise((r) => { setImmediate(r); });

/** Un transport fals, condus de probă: ce scrie sesiunea se ține minte, iar proba trimite octeți sau închide portul. */
function transportFals(opt: { readonly scrieCade?: boolean } = {}) {
  let primit: ((o: Uint8Array) => void) | null = null, inchis: ((m: string | null) => void) | null = null;
  const scrise: string[] = [];
  const t: Transport = {
    fel: 'serial',
    scrie: (o) => (opt.scrieCade ? Promise.reject(new Error('scrierea a căzut')) : (scrise.push(String.fromCharCode(...o)), Promise.resolve())),
    porneste: (p, i) => { primit = p; inchis = i; },
    inchide: () => Promise.resolve(),
  };
  return { t, scrise, trimite: (s: string) => { primit?.(octeti(s)); }, inchide: (m: string) => { inchis?.(m); } };
}

test('mașina simulată: bannerul în jurnal, rapoartele la 200 ms, Idle; deconectarea oprește ceasul', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  await s.conecteaza(deschideSimulata({ ceas, viteza: () => 1 }));
  assert.equal(s.stare().conexiune, 'conectat');
  assert.equal(s.stare().transport, 'simulat');
  assert.ok(s.stare().jurnal.some((l) => l.fel === 'primit' && l.text === "Grbl 1.1h ['$' for help]"));
  assert.deepEqual(s.stare().jurnal[0], { fel: 'sesiune', text: '', cod: 'conectat-simulat' });
  assert.equal(s.stare().flux.raport, null);
  await ceas.avanseaza(200);
  assert.equal(s.stare().flux.raport?.stare, 'Idle');
  await s.deconecteaza();
  assert.equal(s.stare().conexiune, 'deconectat');
  assert.equal(s.stare().eroare, null);
});

test('programul plăcii 1 (A) pe mașina simulată, la 100×: terminat, exact octeții plăcii; panoul publicat rar', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  let publicari = 0;
  s.aboneaza(() => { publicari++; });
  const sim = deschideSimulata({ ceas, viteza: () => 100 });
  await s.conecteaza(sim);
  const text = readFileSync('test/placi/placa-01/placa-01-A.nc', 'ascii');
  const p = await incarcaProgram(octeti(text), { sursa: 'export' });
  assert.ok(p.ok);
  if (!p.ok) return;
  s.eveniment({ tip: 'incarca', program: p.program });
  s.eveniment({ tip: 'start' });
  for (let k = 0; k < 600 && s.stare().flux.faza !== 'terminat'; k++) await ceas.avanseaza(100);
  assert.equal(s.stare().flux.faza, 'terminat');
  assert.deepEqual(s.stare().flux.erori, []);
  assert.equal(primitiFaraTimpReal(sim.emulator), text);
  assert.ok(publicari < ceas.t / 100 + 10, `${publicari} publicări în ${ceas.t} ms`);
});

test('o linie ruptă în două bucăți („o”, apoi „k\\r\\n”) e un singur ok; „\\r” se scoate', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  const f = transportFals();
  await s.conecteaza(f.t);
  s.eveniment({ tip: 'manual', id: 'x', text: 'G0 X1' });
  await ceas.avanseaza(0);
  assert.deepEqual(f.scrise, ['G0 X1\n']);
  f.trimite('o');
  assert.equal(s.stare().flux.inZbor.length, 1);
  f.trimite('k\r\n');
  assert.equal(s.stare().flux.inZbor.length, 0);
  assert.equal(s.stare().jurnal.at(-1)?.text, 'ok');
});

test('fără port: start, reia, comenzile se refuză în jurnal; încărcarea merge', async () => {
  const s = new SesiuneMasina(new CeasFals());
  s.eveniment({ tip: 'start' });
  s.eveniment({ tip: 'manual', id: 'x', text: '$G' });
  assert.deepEqual(s.stare().jurnal.map((l) => [l.fel, l.text, l.cod]), [['refuz', 'start', 'neconectat'], ['refuz', 'manual', 'neconectat']]);
  const p = await incarcaProgram(octeti('G54\nG0 X1\n'), { sursa: 'fisier' });
  assert.ok(p.ok);
  if (p.ok) s.eveniment({ tip: 'incarca', program: p.program });
  assert.equal(s.stare().flux.faza, 'pregatit');
});

test('portul se închide în flux (cablul scos): deconectat, cu motivul; fluxul pierdut', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  const f = transportFals();
  await s.conecteaza(f.t);
  const p = await incarcaProgram(octeti(`G54\n${'G0 X1\nG0 X0\n'.repeat(20)}`), { sursa: 'fisier' });
  assert.ok(p.ok);
  if (!p.ok) return;
  s.eveniment({ tip: 'incarca', program: p.program });
  s.eveniment({ tip: 'start' });
  await ceas.avanseaza(0);
  assert.equal(s.stare().flux.faza, 'trimite');
  f.inchide('cablul scos');
  assert.equal(s.stare().conexiune, 'deconectat');
  assert.equal(s.stare().eroare, 'cablul scos');
  assert.deepEqual(s.stare().jurnal.at(-1), { fel: 'sesiune', text: '', cod: 'port-inchis', motiv: 'cablul scos' });
  assert.equal(s.stare().flux.faza, 'pierdut');
  assert.equal(s.stare().flux.motiv, 'deconectat');
  await ceas.avanseaza(1000);
  assert.equal(f.scrise.filter((x) => x === '?').length, 0, 'ceasul s-a oprit odată cu portul');
});

test('scrierea căzută închide portul, cu motivul ei', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  await s.conecteaza(transportFals({ scrieCade: true }).t);
  await ceas.avanseaza(200);
  assert.equal(s.stare().conexiune, 'deconectat');
  assert.equal(s.stare().eroare, 'scrierea a căzut');
});

test('jurnalul unei comenzi manuale: trimis, datele, ok; ce nu știe simularea: un mesaj și error:20', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  await s.conecteaza(deschideSimulata({ ceas, viteza: () => 1 }));
  await ceas.avanseaza(200);
  s.eveniment({ tip: 'manual', id: 'a', text: '$G' });
  await ceas.avanseaza(200);
  s.eveniment({ tip: 'manual', id: 'b', text: '$J=G91X1F100' });
  await ceas.avanseaza(200);
  const j = s.stare().jurnal.filter((l) => l.fel !== 'sesiune' && !l.text.startsWith('Grbl')).map((l) => `${l.fel}:${l.text}`);
  assert.deepEqual(j, [
    'trimis:$G', 'raspuns:[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]', 'raspuns:ok',
    'trimis:$J=G91X1F100', 'raspuns:[MSG:Not simulated: comanda $J=G91X1F100]', 'raspuns:error:20',
  ]);
});

test('după o deconectare și o reconectare, rapoartele se cer o dată la 200 ms (nu rămân două ceasuri)', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  const a = transportFals();
  await s.conecteaza(a.t);
  a.inchide('cablul scos');
  const b = transportFals();
  await s.conecteaza(b.t);
  await ceas.avanseaza(1000);
  assert.equal(b.scrise.filter((x) => x === '?').length, 5);
});
