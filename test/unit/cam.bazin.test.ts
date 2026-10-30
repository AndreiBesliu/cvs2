/**
 * Calculul CAM în workerul lui (ADR 0109): același G-code, octet cu octet, ca la calculul direct (codul de dinainte, mutat
 * neschimbat în `src/jobs/calculCam.ts`), pe plăcile 1 și 2 și pe corpusul fiecărui fel de lucrare (`ajutor-corpus-cam.ts`).
 * Ce probează fiecare test:
 * - calea interfeței (bazinul, cu cererea și răspunsul trecute prin granița unui mesaj: `structuredClone` cu transferul)
 *   dă aceiași octeți, același rezumat și aceeași simulare;
 * - traseul despachetat e programul CAM-ului, timpul lui e cel calculat direct, iar mutările vederii 3D sunt aceleași;
 * - codecul IR e exact: numerele bit cu bit (și −0), câmpurile lipsă rămân lipsă;
 * - cu un `Worker` fals care rulează chiar `lucratorCam.ts`, workerul se oprește la răspuns, la anulare, la eroare și la
 *   termen. Workerul construit, în Edge, e probat în `test/e2e/cam-bazin.spec.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import type { Program } from '../../src/ir/ir.ts';
import { CalculAnulat, exportInBazin, LucratorCazut, timpInBazin, traseuInBazin } from '../../src/jobs/bazinCam.ts';
import { calculeazaExportul } from '../../src/jobs/calculCam.ts';
import { despacheteaza, impacheteaza, transferabileProgram, type ProgramImpachetat } from '../../src/jobs/impachetare.ts';
import type { MesajCam, RaspunsMesajCam } from '../../src/jobs/protocolCam.ts';
import { timpProgram } from '../../src/jobs/rezumat.ts';
import type { Document } from '../../src/model/document.ts';
import type { FisierExportat } from '../../src/post/export.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { calculeazaExport, programSimulare, programTraseu, simuleazaExport, timpTraseu } from '../../src/ui/actiuniExportCalcul.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';

const octeti = (v: ArrayBufferView): Buffer => Buffer.from(v.buffer, v.byteOffset, v.byteLength);
const faraComentarii = (t: string): string[] => t.split('\n').filter((l) => l !== '' && !l.startsWith('('));
const SETARI = '$11=0.02\n$12=0.004\n$110=3000\n$111=3000\n$112=800\n$120=200\n$121=200\n$122=100';

function acelasiFisier(a: FisierExportat, b: FisierExportat, unde: string): void {
  assert.ok(octeti(a.octeti).equals(octeti(b.octeti)), `${unde}: octeții diferă`);
  assert.equal(a.text, b.text, `${unde}: textul`);
  assert.equal(a.sha256, b.sha256, `${unde}: SHA-256`);
  assert.deepEqual([a.linii, a.extensie, a.aproximari, a.sectiuni, a.scula], [b.linii, b.extensie, b.aproximari, b.sectiuni, b.scula], `${unde}: restul`);
}

test('exportul prin bazin = calculul direct, octet cu octet, pe tot corpusul (cu fiecare post, unitate, strategie, `$$`)', async () => {
  let fisiere = 0;
  for (const c of CORPUS_CAM) {
    for (const p0 of c.parametri) {
      let p = p0;
      let direct = await calculeazaExportul(c.doc, p);
      let bazin = await calculeazaExport(c.doc, p);
      // Ieșirea din foaie: cererea de confirmare e aceeași, iar confirmarea ei dă același program (cu declarația în antet).
      if (!direct.ok && 'cereConfirmare' in direct) {
        assert.deepEqual(bazin, direct, `${c.id}: cererea de confirmare`);
        p = { ...p, confirmareIesire: direct.cereConfirmare };
        direct = await calculeazaExportul(c.doc, p);
        bazin = await calculeazaExport(c.doc, p);
        assert.ok(direct.ok && direct.program.text.includes('CONFIRMAT'), `${c.id}: confirmarea`);
      }
      const unde = `${c.id} ${JSON.stringify(p0)}`;
      if (!direct.ok) {
        assert.deepEqual(bazin, direct, `${unde}: refuzul`);
        continue;
      }
      assert.ok(bazin.ok, `${unde}: ${bazin.ok ? '' : bazin.motiv}`);
      if (!bazin.ok) continue;
      acelasiFisier({ ...bazin.program, scula: null }, { ...direct.program, scula: null }, unde);
      assert.equal(bazin.fisiere.length, direct.fisiere.length, `${unde}: câte fișiere`);
      direct.fisiere.forEach((f, k) => { acelasiFisier(bazin.fisiere[k] as FisierExportat, f, `${unde}, fișierul ${k + 1}`); });
      fisiere += direct.fisiere.length;
      assert.deepEqual(bazin.rezumat, direct.rezumat, `${unde}: rezumatul`);
      assert.deepEqual(bazin.avertismente, direct.avertismente, `${unde}: avertismentele`);
      // Simularea: mutările pregătite în worker dau aceeași amprentă ca pregătirea directă.
      const ac = new AbortController();
      const [s1, s2] = [await bazin.simulare(ac.signal), await simuleazaExport(direct.simulare, direct.foaie, ac.signal)];
      assert.ok(s1.ok && s2.ok, `${unde}: simularea`);
      if (s1.ok && s2.ok) assert.deepEqual([s1.amprenta, s1.volum, s1.adancimeMax], [s2.amprenta, s2.volum, s2.adancimeMax], `${unde}: simularea`);
    }
  }
  assert.ok(fisiere >= 25, `${fisiere} fișiere comparate`);
});

test('plăcile prin bazin sunt fișierele lor de aur: placa 1 A (liniile) și placa 2 (octet cu octet)', async () => {
  const caz = (id: string): Document => (CORPUS_CAM.find((c) => c.id === id) as (typeof CORPUS_CAM)[number]).doc;
  const p1 = await calculeazaExport(caz('placa-01'), { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(p1.ok);
  if (p1.ok) assert.deepEqual(faraComentarii(p1.program.text), faraComentarii(readFileSync(new URL('../placi/placa-01/placa-01-A.nc', import.meta.url), 'ascii')));
  const p2 = await calculeazaExport(caz('placa-02'), { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(p2.ok);
  if (p2.ok) assert.ok(octeti(p2.program.octeti).equals(readFileSync(new URL('../placi/placa-02/placa-02.nc', import.meta.url))));
});

test('traseul prin bazin e programul CAM-ului (despachetat), iar timpul lui e cel calculat direct, cu și fără `$$`', async () => {
  for (const c of CORPUS_CAM) {
    const direct = programDinDocument(c.doc);
    const bazin = await programTraseu(c.doc);
    if (!direct.ok) {
      assert.deepEqual(bazin, { ok: false, motiv: direct.motiv }, c.id);
      continue;
    }
    assert.ok(bazin.ok, c.id);
    if (!bazin.ok) continue;
    assert.deepStrictEqual(bazin.program, direct.program, `${c.id}: programul`);
    const foaie = c.doc.foi[0]?.stoc;
    assert.ok(foaie);
    for (const setari of [undefined, SETARI, '$110=abc']) {
      assert.deepEqual(await timpTraseu(bazin.program, foaie, setari), timpProgram(direct.program, foaie, setari), `${c.id}: timpul cu ${String(setari)}`);
    }
  }
});

test('vederea 3D prin bazin primește mutările pregătirii directe, bit cu bit, cu grupurile de după schimbări', async () => {
  for (const c of CORPUS_CAM) {
    const job = programDinDocument(c.doc, REGIM_IMPLICIT, 0);
    const bazin = await programSimulare(c.doc);
    if (!job.ok) {
      assert.deepEqual(bazin, { ok: false, motiv: job.motiv }, c.id);
      continue;
    }
    const direct = pregatesteProgram(job.program, 0);
    if (!direct.ok) {
      assert.deepEqual(bazin, { ok: false, motiv: direct.motiv }, c.id);
      continue;
    }
    assert.ok(bazin.ok, c.id);
    if (!bazin.ok) continue;
    const date = bazin.date as { scula: unknown; mutari: Float64Array; apoi?: ReadonlyArray<{ scula: unknown; mutari: Float64Array }> };
    assert.deepEqual(date.scula, direct.scula, c.id);
    assert.ok(octeti(date.mutari).equals(octeti(direct.mutari)), `${c.id}: mutările`);
    assert.equal(date.apoi?.length ?? 0, direct.apoi?.length ?? 0, `${c.id}: grupurile`);
    (direct.apoi ?? []).forEach((g, k) => {
      assert.deepEqual(date.apoi?.[k]?.scula, g.scula);
      assert.ok(octeti(date.apoi?.[k]?.mutari ?? new Float64Array()).equals(octeti(g.mutari)), `${c.id}: grupul ${k + 1}`);
    });
  }
});

/** Un program cu fiecare fel de mișcare și cu valorile de margine: −0, axa A, ținta goală, etichetele cu și fără câmpuri. */
const SINTETIC: Program = {
  axe: ['X', 'Y', 'Z', 'A'], scula: { numar: 1, nume: 'freza 6', diametru: 6 }, turatie: 18000, zSigur: 5,
  miscari: [
    { tip: 'eticheta', text: 'început' },
    { tip: 'eticheta', text: 'cu element', element: 'i/a' },
    { tip: 'eticheta', text: 'cu operație', operatie: 'p/o' },
    { tip: 'eticheta', text: 'cu amândouă', element: 'i/a', operatie: 'p/o' },
    { tip: 'ax-pornit', turatie: 18000 },
    { tip: 'pauza', secunde: 2.001 },
    { tip: 'rapida', la: { Z: 5 } },
    { tip: 'rapida', la: { X: -0, Y: 0.1 + 0.2 } },
    { tip: 'taiere', la: { Z: -1e-300 }, avans: 300 },
    { tip: 'taiere', la: { X: 1, Y: 2, Z: -3, A: 90 }, avans: 1000 },
    { tip: 'arc', la: { X: 10, Y: 0 }, centru: { x: 5, y: 0 }, sens: 'orar', avans: 1000 },
    { tip: 'arc', la: { X: 10, Y: 0, Z: -2 }, centru: { x: 5, y: -0 }, sens: 'trigonometric', avans: 800 },
    { tip: 'schimba-scula', scula: { numar: 2, nume: 'freza V90', diametru: 6, forma: { tip: 'v', unghi: 90, varf: 0.5 } }, turatie: 16000 },
    { tip: 'schimba-scula', scula: { numar: 3, nume: 'bila', diametru: 3, forma: { tip: 'bila' } }, turatie: 12000 },
    { tip: 'ax-oprit' },
    { tip: 'rapida', la: {} },
  ],
};

/** Programul împachetat, transferat ca între fire, apoi despachetat. */
function prinGranita(p: Program): Program {
  const pk = impacheteaza(p);
  return despacheteaza(structuredClone(pk, { transfer: transferabileProgram(pk) }));
}

test('codecul IR e exact: aceleași câmpuri, în aceeași ordine, numerele bit cu bit (și −0), pe sintetic și pe corpus', () => {
  const programe: Array<[string, Program]> = [['sintetic', SINTETIC], ['gol', { ...SINTETIC, miscari: [] }]];
  for (const c of CORPUS_CAM) {
    const r = programDinDocument(c.doc);
    if (r.ok) programe.push([c.id, r.program]);
  }
  assert.ok(programe.length >= 12);
  for (const [id, p] of programe) {
    const d = prinGranita(p);
    assert.deepStrictEqual(d, p, id);
    assert.equal(JSON.stringify(d), JSON.stringify(p), `${id}: ordinea câmpurilor`);
  }
  const d = prinGranita(SINTETIC).miscari;
  const la = (k: number) => (d[k] as { la: Record<string, number> }).la;
  assert.ok(Object.is(la(7)['X'], -0) && Object.is((d[11] as { centru: { y: number } }).centru.y, -0), '−0 rămâne −0');
  assert.equal(la(10)['Z'], undefined);
  assert.ok(!('Z' in la(10)), 'axa lipsă rămâne lipsă');
});

test('codecul refuză un program împachetat stricat: un fel necunoscut, numere sau texte în plus', () => {
  const pk = impacheteaza(SINTETIC);
  const fel = Uint8Array.from(pk.feluri);
  fel[0] = 99;
  assert.throws(() => despacheteaza({ ...pk, feluri: fel }), /fel necunoscut \(99\) la 0/);
  assert.throws(() => despacheteaza({ ...pk, numere: Float64Array.from([...pk.numere, 1]) }), /date în plus/);
  assert.throws(() => despacheteaza({ ...pk, texte: [...pk.texte, 'x'] }), /date în plus/);
});

test('o cerere anulată înainte de calcul e respinsă cu `CalculAnulat`, fără niciun calcul', async () => {
  const ac = new AbortController();
  ac.abort();
  const caz = CORPUS_CAM[0];
  assert.ok(caz);
  await assert.rejects(exportInBazin(caz.doc, caz.parametri[0] ?? { origine: 'stanga-jos', z0: 'sus' }, { semnal: ac.signal }), CalculAnulat);
  await assert.rejects(calculeazaExport(caz.doc, { origine: 'stanga-jos', z0: 'sus' }, ac.signal), CalculAnulat);
  await assert.rejects(programTraseu(caz.doc, ac.signal), CalculAnulat);
  await assert.rejects(programSimulare(caz.doc, ac.signal), CalculAnulat);
});

/**
 * Workerul, cu un `Worker` fals în Node: rulează chiar `src/jobs/lucratorCam.ts` (cu `self` fals), iar mesajele trec prin
 * `structuredClone` cu transferul, ca între fire. `fel` alege purtarea lui: răspunde, tace, cade sau trimite ceva necitibil.
 */
type Fel = 'raspunde' | 'tace' | 'eroare' | 'necitibil';
const lumea: { fel: Fel; create: number; oprite: number; transferateInapoi: number; curent: WorkerFals | null } = {
  fel: 'raspunde', create: 0, oprite: 0, transferateInapoi: 0, curent: null,
};
const scopul: { onmessage: ((e: { data: MesajCam }) => void) | null; postMessage: (m: RaspunsMesajCam, t?: Transferable[]) => void } = {
  onmessage: null,
  postMessage(m, t = []) {
    lumea.transferateInapoi += t.length;
    const w = lumea.curent;
    const primit = structuredClone(m, { transfer: t });
    setTimeout(() => { if (w && !w.oprit) w.onmessage?.({ data: primit }); }, 0);
  },
};

class WorkerFals {
  onmessage: ((e: { data: RaspunsMesajCam }) => void) | null = null;
  onerror: ((e: { message: string; preventDefault: () => void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  oprit = false;
  constructor(url: URL, o: { type: string; name: string }) {
    assert.match(String(url), /lucratorCam\.ts$/);
    assert.equal(o.type, 'module');
    lumea.create++;
    lumea.curent = this;
  }
  postMessage(m: MesajCam, t: Transferable[] = []): void {
    const primit = structuredClone(m, { transfer: t });
    setTimeout(() => {
      if (this.oprit) return;
      if (lumea.fel === 'tace') return;
      if (lumea.fel === 'eroare') { this.onerror?.({ message: 'memoria s-a terminat', preventDefault: () => {} }); return; }
      if (lumea.fel === 'necitibil') { this.onmessageerror?.(); return; }
      scopul.onmessage?.({ data: primit });
    }, 0);
  }
  terminate(): void {
    if (!this.oprit) lumea.oprite++;
    this.oprit = true;
  }
}

async function cuWorkerFals(fel: Fel, f: () => Promise<void>): Promise<void> {
  const g = globalThis as { Worker?: unknown; self?: unknown };
  Object.assign(lumea, { fel, create: 0, oprite: 0, transferateInapoi: 0, curent: null });
  g.self = scopul;
  await import('../../src/jobs/lucratorCam.ts');
  g.Worker = WorkerFals;
  try {
    await f();
  } finally {
    delete g.Worker;
  }
}

test('prin workerul adevărat (cu `Worker` fals): exportul și traseul = calculul direct; răspunsul vine transferat, workerul se oprește', async () => {
  await cuWorkerFals('raspunde', async () => {
    for (const id of ['placa-02', 'mai-multe-freze', 'vcarve-fund-rest']) {
      const c = CORPUS_CAM.find((x) => x.id === id);
      assert.ok(c);
      for (const p of c.parametri) {
        const direct = await calculeazaExportul(c.doc, p);
        const bazin = await calculeazaExport(c.doc, p);
        assert.ok(direct.ok && bazin.ok, id);
        if (!direct.ok || !bazin.ok) continue;
        direct.fisiere.forEach((f, k) => { acelasiFisier(bazin.fisiere[k] as FisierExportat, f, `${id}, fișierul ${k + 1}`); });
        assert.deepEqual(bazin.rezumat, direct.rezumat);
      }
      const t = await traseuInBazin(c.doc);
      const j = programDinDocument(c.doc);
      assert.ok(t.ok && j.ok);
      if (t.ok && j.ok) assert.deepStrictEqual(despacheteaza(t.program), j.program);
    }
    assert.equal(lumea.oprite, lumea.create, 'fiecare worker s-a oprit la răspuns');
    assert.ok(lumea.create >= 9);
    assert.ok(lumea.transferateInapoi >= 2 * lumea.create, 'octeții, mutările și programul vin transferate');
    // Cererea `timp` trimite programul împachetat transferat: după apel, tablourile lui sunt ale workerului.
    const j = programDinDocument((CORPUS_CAM[1] as (typeof CORPUS_CAM)[number]).doc);
    assert.ok(j.ok);
    if (!j.ok) return;
    const pk: ProgramImpachetat = impacheteaza(j.program);
    const foaie = { latime: 300, inaltime: 200, grosime: 12 };
    const r = await timpInBazin(pk, foaie, undefined);
    assert.equal(pk.numere.byteLength, 0, 'programul a plecat transferat');
    const { traseu: _t, ...fara } = timpProgram(j.program, foaie, undefined) as Extract<ReturnType<typeof timpProgram>, { ok: true }>;
    void _t;
    assert.deepEqual(r, fara);
  });
});

test('anularea oprește workerul din mijlocul calculului; o cerere deja anulată nu pornește niciun worker', async () => {
  const c = CORPUS_CAM[0];
  assert.ok(c);
  const P = { origine: 'stanga-jos', z0: 'sus' } as const;
  await cuWorkerFals('tace', async () => {
    const ac = new AbortController();
    // Cu termenul scurt, o anulare ignorată ar pica aici în 1 s (ca workerul căzut), nu după 180 s.
    const r = exportInBazin(c.doc, P, { semnal: ac.signal, termenMs: 1000 });
    await new Promise((ok) => setTimeout(ok, 5));
    ac.abort();
    await assert.rejects(r, CalculAnulat);
    assert.deepEqual([lumea.create, lumea.oprite], [1, 1]);
    const anulat = new AbortController();
    anulat.abort();
    await assert.rejects(exportInBazin(c.doc, P, { semnal: anulat.signal, termenMs: 1000 }), CalculAnulat);
    await assert.rejects(calculeazaExport(c.doc, P, anulat.signal), CalculAnulat);
    assert.equal(lumea.create, 1, 'niciun worker nou pentru o cerere deja anulată');
  });
});

test('un worker care cade, tace peste termen sau trimite ceva necitibil: `LucratorCazut`, oprit; o excepție a calculului: motivul ei', async () => {
  const c = CORPUS_CAM[0];
  assert.ok(c);
  await cuWorkerFals('eroare', async () => {
    await assert.rejects(exportInBazin(c.doc, { origine: 'stanga-jos', z0: 'sus' }), (e: unknown) => e instanceof LucratorCazut && /a căzut: memoria s-a terminat/.test(e.message));
    assert.equal(lumea.oprite, 1);
  });
  await cuWorkerFals('tace', async () => {
    await assert.rejects(exportInBazin(c.doc, { origine: 'stanga-jos', z0: 'sus' }, { termenMs: 20 }), (e: unknown) => e instanceof LucratorCazut && /n-a răspuns în 0 s/.test(e.message));
    assert.equal(lumea.oprite, 1);
  });
  await cuWorkerFals('necitibil', async () => {
    await assert.rejects(traseuInBazin(c.doc), (e: unknown) => e instanceof LucratorCazut && /necitibil/.test(e.message));
    assert.equal(lumea.oprite, 1);
  });
  // Un document stricat aruncă în calcul: workerul trimite motivul (o eroare, nu `LucratorCazut`) și se oprește.
  await cuWorkerFals('raspunde', async () => {
    const stricat = { ...c.doc, foi: null } as unknown as Document;
    await assert.rejects(traseuInBazin(stricat), (e: unknown) => e instanceof Error && !(e instanceof LucratorCazut) && !(e instanceof CalculAnulat));
    assert.equal(lumea.oprite, 1);
  });
});
