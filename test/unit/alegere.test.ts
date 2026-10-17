/**
 * Alegerea cu clicul la cerere (loc în pachetul de pornire, 17.10; `alegereLaCerere` din `actiuniDocument.ts`): calea
 * asincronă, cu sosirea modulului ținută în mână (o promisiune amânată). Clicul dat înaintea modulului golește selecția pe
 * loc și se aplică la sosire, doar ultimul, doar pe același document și aceeași selecție, și doar prin ușa aplicației.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import * as modulAlegere from '../../src/ui/actiuniAlegere.ts';
import { ACTIUNI_DOCUMENT, alegereLaCerere, incarcaAlegerea, type Alegere, type ContextDocument } from '../../src/ui/actiuniDocument.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

function amanat(): { p: Promise<Alegere>; ok: () => void; eroare: (e: unknown) => void } {
  let ok: (v: Alegere) => void = () => undefined;
  let eroare: (e: unknown) => void = () => undefined;
  const p = new Promise<Alegere>((a, b) => { ok = a; eroare = b; });
  return { p, ok: () => { ok(modulAlegere); }, eroare };
}
/** Toate continuările în așteptare (sosirea modulului și ce pornește ea). */
const curge = (): Promise<void> => new Promise((ok) => { setImmediate(ok); });

/**
 * Un dreptunghi (e1, 100 × 60 în 20, 20) și un cerc deasupra lui (e2, R15 în 70, 50), adăugate prin registru; `usa` e
 * ușa aplicației pentru `dinNou` (refuză cât e deschis un dialog), `jurnal` strânge erorile.
 */
function lume(): {
  ctx: (x: number, y: number) => ContextDocument; sel: () => readonly string[]; h: () => Istoric;
  scrie: (h: Istoric) => void; selecteaza: (ids: readonly string[]) => void; dialog: { deschis: boolean }; jurnal: unknown[]; usi: number[];
} {
  let h = istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let s: readonly string[] = [];
  const baza: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => s, selecteaza: (ids) => { s = ids; } };
  ruleaza(R, 'document.adauga-dreptunghi', baza);
  ruleaza(R, 'document.adauga-cerc', baza);
  s = [];
  const dialog = { deschis: false };
  const jurnal: unknown[] = [];
  const usi: number[] = [];
  return {
    ctx: (x, y) => {
      const punct = (): { x: number; y: number; toleranta: number } => ({ x, y, toleranta: 0.5 });
      return {
        ...baza, punct,
        dinNou: () => { usi.push(x); if (!dialog.deschis) ALEGERI.curenta?.ruleaza({ ...baza, punct }); },
        jurnal: (e) => { jurnal.push(e); },
      };
    },
    sel: () => s, h: () => h, scrie: (n) => { h = n; }, selecteaza: (ids) => { s = ids; }, dialog, jurnal, usi,
  };
}
/** Alegerea testului curent (ușa o rulează din nou pe ea, ca aplicația pe registru). */
const ALEGERI: { curenta: ReturnType<typeof alegereLaCerere> | null } = { curenta: null };
function alegere(aduce: () => Promise<Alegere>): ReturnType<typeof alegereLaCerere> {
  ALEGERI.curenta = alegereLaCerere(aduce);
  return ALEGERI.curenta;
}

test('clic înaintea modulului: selecția se golește pe loc, apoi se pune pe forma lovită, prin ușă', async () => {
  const d = amanat();
  const a = alegere(() => d.p);
  const w = lume();
  w.selecteaza(['e1']);
  a.ruleaza(w.ctx(70, 50));
  assert.deepEqual(w.sel(), [], 'pe loc: nimic ales (nu rămâne selecția veche)');
  d.ok();
  await curge();
  assert.deepEqual(w.sel(), ['e2'], 'la sosire: cercul, deasupra dreptunghiului');
  assert.deepEqual(w.usi, [70], 'aplicat o dată, prin ușa aplicației');
  // Cu modulul sosit, clicul alege pe loc, fără ușă.
  a.ruleaza(w.ctx(30, 30));
  assert.deepEqual(w.sel(), ['e1']);
  a.ruleaza(w.ctx(250, 150));
  assert.deepEqual(w.sel(), []);
  assert.deepEqual(w.usi, [70]);
});

test('două clicuri înaintea modulului: se aplică doar al doilea', async () => {
  const d = amanat();
  const a = alegere(() => d.p);
  const w = lume();
  a.ruleaza(w.ctx(30, 30));
  a.ruleaza(w.ctx(70, 50));
  assert.deepEqual(w.sel(), []);
  d.ok();
  await curge();
  assert.deepEqual(w.sel(), ['e2']);
  assert.deepEqual(w.usi, [70], 'primul clic nu mai trece pe la ușă');
  // Și invers: ultimul clic, în gol, câștigă (nu rămâne forma primului).
  const d2 = amanat();
  const b = alegere(() => d2.p);
  const v = lume();
  b.ruleaza(v.ctx(70, 50));
  b.ruleaza(v.ctx(250, 150));
  d2.ok();
  await curge();
  assert.deepEqual(v.sel(), []);
});

test('documentul schimbat între timp: clicul în așteptare nu se aplică', async () => {
  const d = amanat();
  const a = alegere(() => d.p);
  const w = lume();
  a.ruleaza(w.ctx(70, 50));
  ruleaza(R, 'document.adauga-cerc', { istoric: w.h, scrie: w.scrie, selectie: w.sel, selecteaza: () => undefined });
  d.ok();
  await curge();
  assert.deepEqual(w.sel(), []);
  assert.deepEqual(w.usi, []);
});

test('selecția schimbată între timp (din listă): clicul în așteptare n-o acoperă', async () => {
  const d = amanat();
  const a = alegere(() => d.p);
  const w = lume();
  a.ruleaza(w.ctx(70, 50));
  w.selecteaza(['e1']);
  d.ok();
  await curge();
  assert.deepEqual(w.sel(), ['e1']);
});

test('un dialog deschis între timp: ușa refuză, nimic nu se aplică', async () => {
  const d = amanat();
  const a = alegere(() => d.p);
  const w = lume();
  a.ruleaza(w.ctx(70, 50));
  w.dialog.deschis = true;
  d.ok();
  await curge();
  assert.deepEqual(w.usi, [70], 'a cerut ușa');
  assert.deepEqual(w.sel(), [], 'ușa n-a lăsat');
});

test('modulul care nu vine: clicul nu alege, intrarea în jurnal; clicul următor îl cere din nou și alege', async () => {
  let cereri = 0;
  const d1 = amanat();
  const d2 = amanat();
  const a = alegere(() => { cereri++; return cereri === 1 ? d1.p : d2.p; });
  const w = lume();
  a.ruleaza(w.ctx(70, 50));
  d1.eroare(new Error('bucata lipsește'));
  await curge();
  assert.deepEqual(w.sel(), []);
  assert.equal(w.jurnal.length, 1);
  assert.match(String(w.jurnal[0]), /bucata lipsește/);
  a.ruleaza(w.ctx(30, 30));
  assert.equal(cereri, 2, 'cerut din nou');
  d2.ok();
  await curge();
  assert.deepEqual(w.sel(), ['e1']);
  assert.equal(w.jurnal.length, 1);
});

test('fără ușă (contextul n-are `dinNou`), clicul în așteptare se aplică direct la sosire', async () => {
  const d = amanat();
  const a = alegere(() => d.p);
  const w = lume();
  const { dinNou: _faraUsa, ...ctx } = w.ctx(70, 50);
  a.ruleaza(ctx);
  d.ok();
  await curge();
  assert.deepEqual(w.sel(), ['e2']);
});

test('acțiunea din registru, cu modulul adevărat adus la cerere: golește, apoi alege; după sosire, pe loc', async () => {
  const w = lume();
  const { dinNou: _faraUsa, ...ctx } = w.ctx(70, 50);
  ruleaza(R, 'selectie.la-punct', ctx);
  assert.deepEqual(w.sel(), []);
  await incarcaAlegerea();
  await curge();
  assert.deepEqual(w.sel(), ['e2']);
  ruleaza(R, 'selectie.la-punct', { ...ctx, punct: () => ({ x: 30, y: 30, toleranta: 0.5 }) });
  assert.deepEqual(w.sel(), ['e1']);
});
