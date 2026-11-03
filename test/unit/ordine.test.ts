/**
 * Ordinea de mână a operațiilor (ADR 0133, felia 5.9↑), pe hârtie: rangul operației (documentul v19) sortează stabil ordinea
 * automată (clasele, apoi frezele); o operație fără rang vine la capăt; regiunea V-carve se sapă la prima ei tăietură din
 * ordine; un document fără rang taie exact ca înainte; rolul aplicat păstrează locul piesei, iar rolul personalizat nu ține
 * rangul.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import type { Document, Nod, Operatie, Piesa } from '../../src/model/document.ts';
import { grupeazaPeScula, ordineTaieturi, taieturiFoaie } from '../../src/model/lume.ts';
import { conturCerc, conturDreptunghi } from '../../src/geom/conturBaza.ts';
import { cuprinse, cuRangulPiesei, type FormeRand } from '../../src/model/ordine.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import type { Rol } from '../../src/model/rol.ts';
import { sablonDinPiese, type RolPersonal } from '../../src/model/rolPersonal.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const T1 = { numar: 1, nume: 'freza plata', diametru: 6 };
const T2 = { numar: 2, nume: 'freza plata', diametru: 3 };
const V90 = { numar: 3, nume: 'freza V90', diametru: 6, forma: { tip: 'v' as const, unghi: 90 } };
const STOC = { latime: 400, inaltime: 300, grosime: 18 };
const dr = (id: string, x: number, y: number) => ({ id, forma: { tip: 'dreptunghi' as const, latime: 60, inaltime: 40, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });
const cerc = (id: string, x: number, y: number, raza = 8) => ({ id, forma: { tip: 'cerc' as const, raza }, matrice: { ...ID, e: x, f: y } });

/**
 * Patru piese, câte o instanță: dreptunghiul A (exterior, T1), gaura a în el (interior, T1), dreptunghiul B (exterior, T1) și
 * cercul c, gravat pe linie cu T2. Ordinea automată: a (interioarele), c (liniile, cu T2), A și B (exterioarele, înapoi la T1).
 */
function baza(): Document {
  let d = docDin(STOC, dr('A', 20, 20), cerc('a', 50, 40), dr('B', 120, 20), cerc('c', 250, 200, 10));
  d = cuOperatie(d, 'A', { latura: 'exterior', scula: T1 });
  d = cuOperatie(d, 'a', { latura: 'interior', scula: T1 });
  d = cuOperatie(d, 'B', { latura: 'exterior', scula: T1 });
  d = cuOperatie(d, 'c', { latura: 'pe-linie', scula: T2, adancime: 1, pas: 1 });
  return d;
}

/** Documentul cu rangul dat pe operațiile pieselor numite (celelalte rămân fără rang). */
const cuRang = (d: Document, ranguri: Readonly<Record<string, number>>): Document => ({
  ...d, piese: d.piese.map((p) => (p.id in ranguri ? { ...p, operatii: p.operatii.map((o) => ({ ...o, rang: ranguri[p.id] as number })) } : p)),
});

/** Ordinea programului: eticheta fiecărei tăieturi (până la „:”) și schimbările de freză. */
function ordine(d: Document): string[] {
  const job = programDinDocument(d);
  assert.ok(job.ok, job.ok ? '' : job.motiv);
  return job.ok ? job.program.miscari.flatMap((m) => (m.tip === 'eticheta' ? [m.text.split(':')[0] as string] : m.tip === 'schimba-scula' ? [`T${m.scula.numar}`] : [])) : [];
}

test('fără rang, ordinea e cea automată, cu aceleași tăieturi ca înainte: interioarele, liniile, exterioarele, grupate pe freză', () => {
  const d = baza();
  assert.deepEqual(ordine(d), ['a/a', 'T2', 'c/c', 'T1', 'A/A', 'B/B']);
  assert.deepEqual(ordineTaieturi(d), grupeazaPeScula(taieturiFoaie(d)));
});

test('cu rangurile omului, programul taie în ordinea lor, cu schimbările de freză pe care le cere ordinea', () => {
  assert.deepEqual(ordine(cuRang(baza(), { B: 0, A: 1, a: 2, c: 3 })), ['B/B', 'A/A', 'a/a', 'T2', 'c/c']);
  // Gravura întâi: prima freză montată e T2, apoi o singură schimbare.
  assert.deepEqual(ordine(cuRang(baza(), { c: 0, B: 1, a: 2, A: 3 })), ['c/c', 'T1', 'B/B', 'a/a', 'A/A']);
});

test('rangurile egale și operațiile fără rang păstrează ordinea automată între ele; cele fără rang vin la capăt', () => {
  // A și B au același rang (o copie): între ele, ordinea automată (A, apoi B). a și c n-au rang: după ele, tot automat.
  assert.deepEqual(ordine(cuRang(baza(), { B: 0, A: 0 })), ['A/A', 'B/B', 'a/a', 'T2', 'c/c']);
  // Doar c are rang: el întâi, restul în ordinea automată.
  assert.deepEqual(ordine(cuRang(baza(), { c: 5 })), ['c/c', 'T1', 'a/a', 'A/A', 'B/B']);
});

/** Piesa g: un grup cu două dreptunghiuri 30 × 20 (r1 la 0, r2 la 50), fiecare cu un V-carve cu aceleași valori. */
function cuGrupVcarve(d: Document, ranguri: Readonly<Record<string, number>> = {}): Document {
  const el = (id: string, x: number): Nod => ({ tip: 'element', id, forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 }, matrice: { ...ID, e: x, f: 0 } });
  const op = (id: string, nod: string): Operatie => ({
    id, tip: 'vcarve', noduri: [nod], scula: V90, latura: 'interior', sens: 'urcare', adancime: 2, pas: 2, urechi: null, rampa: null,
    intrari: null, colturi: null, ...(ranguri[id] !== undefined ? { rang: ranguri[id] } : {}),
  });
  const g: Piesa = { id: 'g', radacina: { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [el('r1', 0), el('r2', 50)] }, operatii: [op('o1', 'r1'), op('o2', 'r2')] };
  return { ...d, piese: [...d.piese, g], foi: d.foi.map((f) => ({ ...f, instante: [...f.instante, { id: 'g', piesa: 'g', x: 20, y: 150, rotire: 0 }] })) };
}

test('V-carve-urile aceleiași piese, cu aceleași valori, se sapă o dată, la prima lor tăietură din ordine (ADR 0133 §2)', () => {
  const b = cuOperatie(docDin(STOC, dr('B', 200, 20)), 'B', { latura: 'exterior', scula: T1 });
  // Automat: V-carve-ul e în clasa interioarelor, deci întâi, de la r1.
  assert.deepEqual(ordine(cuGrupVcarve(b)), ['g/r1 (+1)', 'T1', 'B/B']);
  // o2 întâi: regiunea pornește de la r2; o1, mai târziu în ordine, nu se mai sapă.
  assert.deepEqual(ordine(cuGrupVcarve(cuRang(b, { B: 1 }), { o2: 0, o1: 2 })), ['g/r2 (+1)', 'T1', 'B/B']);
  // B întâi, apoi regiunea, de la r1.
  assert.deepEqual(ordine(cuGrupVcarve(cuRang(b, { B: 0 }), { o1: 1, o2: 2 })), ['B/B', 'T3', 'g/r1 (+1)']);
});

test('cuRangulPiesei: operația păstrează rangul celei vechi cu același id; una nouă primește cel mai mic rang al piesei', () => {
  const op = (id: string, rang?: number): Operatie => ({
    id, tip: 'profil', noduri: ['x'], scula: T1, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null, intrari: null,
    colturi: null, ...(rang !== undefined ? { rang } : {}),
  });
  assert.deepEqual(cuRangulPiesei([op('o1', 4), op('o2', 2)], [op('o1'), op('o3')]).map((o) => [o.id, o.rang]), [['o1', 4], ['o3', 2]]);
  // Fără rang în piesa veche: operațiile noi rămân fără rang (ordinea automată).
  assert.deepEqual(cuRangulPiesei([op('o1')], [op('o1'), op('o3')]).map((o) => Object.hasOwn(o, 'rang')), [false, false]);
});

type Ctx = ContextDocument & { h: () => Istoric; rol: Rol | RolPersonal };
const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

test('rolul aplicat în ordinea omului păstrează locul piesei; rolul personalizat salvat nu ține rangul', () => {
  let h = istoricNou(cuRang(baza(), { B: 0, A: 1, a: 2, c: 3 }));
  let sel: readonly string[] = ['A'];
  const ctx: Ctx = {
    istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false,
    rolNou: () => ctx.rol, h: () => h, rol: 'buzunar',
  };
  assert.equal(ruleaza(R, 'document.rol', ctx).ok, true);
  const A = h.doc.piese.find((p) => p.id === 'A');
  assert.deepEqual(A?.operatii.map((o) => [o.tip, o.rang]), [['buzunar', 1]]);
  const s = sablonDinPiese([A as Piesa]);
  assert.ok(s.ok);
  if (s.ok) assert.equal(Object.hasOwn(s.sablon.operatie, 'rang'), false);
});

test('cuprinderea (riscul din fereastra exportului): primul punct al altei piese, în oricare contur închis (și într-o gaură); aceeași piesă și ce e afară, nu', () => {
  const forme = (cheie: string, piesa: string, ...contururi: FormeRand['contururi']): FormeRand => (
    { cheie, piesa, contururi, punct: contururi[0]?.varfuri[0]?.p ?? null });
  const randuri: FormeRand[] = [
    // Placa P: 0…100 × 0…60, cu o gaură de 10 în (50, 30) în aceeași operație.
    forme('P/ext', 'P', conturDreptunghi(0, 0, 100, 60), conturCerc(50, 30, 10)),
    // Cercul C stă în gaura plăcii; L e pe placă; A e afară; P/linie e altă operație a plăcii; G n-are forme.
    forme('C/gaura', 'C', conturCerc(50, 30, 4)),
    forme('L/linie', 'L', { inchis: false, varfuri: [{ p: { x: 10, y: 10 }, s: { tip: 'L' } }, { p: { x: 20, y: 10 }, s: { tip: 'L' } }] }),
    forme('A/ext', 'A', conturCerc(200, 30, 10)),
    forme('P/linie', 'P', conturCerc(80, 30, 2)),
    forme('G/gol', 'G'),
  ];
  const c = cuprinse(randuri);
  assert.deepEqual([...c.keys()], ['P/ext']);
  assert.deepEqual([...(c.get('P/ext') ?? [])].sort(), ['C/gaura', 'L/linie']);
  // Peste buget, cuprinderile rămase nu se mai caută (riscul rămâne doar pe aceeași piesă).
  assert.equal(cuprinse(randuri, 0).size, 0);
});
