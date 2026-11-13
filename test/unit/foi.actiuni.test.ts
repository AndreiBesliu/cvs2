/**
 * Foile prin registru (ADR 0210 §1, §5; felia 11.1↑), cu calculul încărcat: foaia nouă, copia, ștergerea, ordinea, eticheta și
 * mutarea selecției pe altă foaie, fiecare un pas de anulare, cu refuzurile lor. Criteriul din prag: o editare pe foaia activă
 * lasă celelalte foi identice (JSON-ul canonic). Exportul foii active e, octet cu octet, exportul unui document doar cu ea.
 * Foaia activă ținută în browser: id-ul ei, sau nimic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEIE_FOAIA, foaiaTinuta, tineFoaia, type StocareFoaie } from '../../src/app/foaiaActiva.ts';
import { calculeazaExportul } from '../../src/jobs/calculCam.ts';
import { documentNou, PLAFON, type Document, type Foaie } from '../../src/model/document.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

type Banc = ContextDocument & { readonly h: () => Istoric; readonly activa: () => string };

/** Un proiect cu foaia activă ținută ca în aplicație: `activeazaFoaie` o schimbă și golește selecția. */
function banc(doc: Document = documentNou({ latime: 300, inaltime: 200, grosime: 18 }), doarCitire = false): Banc {
  let h = istoricNou(doc);
  let s: readonly string[] = [];
  let activa = doc.foi[0]?.id ?? '';
  return {
    istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => s, selecteaza: (ids) => { s = ids; }, doarCitire: () => doarCitire,
    foaie: () => activa, activeazaFoaie: (id) => { activa = id; s = []; }, h: () => h, activa: () => activa,
  };
}

const ok = (b: ContextDocument, id: string, extra: Partial<ContextDocument> = {}): void => {
  assert.deepEqual(ruleaza(R, id, { ...b, ...extra }), { ok: true }, id);
};
const ids = (f: Foaie | undefined): string[] => (f?.instante ?? []).map((i) => i.id);
const seRedeschide = (d: Document): void => { assert.ok(incarca(JSON.parse(JSON.stringify(d))).ok, 'ce scriu acțiunile se redeschide'); };

/**
 * Trei foi prin registru: f1 cu un dreptunghi și un cerc, f2 (activă la capăt) cu un dreptunghi mutat, f3 cu un cerc și numele
 * „Resturi”; apoi foaia activă trece înapoi pe f2.
 */
function treiFoi(): Banc {
  const b = banc();
  ok(b, 'document.adauga-dreptunghi');
  ok(b, 'document.adauga-cerc');
  ok(b, 'foaie.adauga');
  ok(b, 'document.adauga-dreptunghi');
  ok(b, 'document.muta-selectia', { deplasare: () => ({ dx: 40, dy: 25 }) });
  ok(b, 'foaie.adauga');
  ok(b, 'document.adauga-cerc');
  ok(b, 'foaie.eticheta', { etichetaNoua: () => ({ camp: 'nume', valoare: 'Resturi' }) });
  b.activeazaFoaie?.(b.h().doc.foi[1]?.id ?? '');
  return b;
}

test('foaie.adauga: o foaie goală după cea activă, cu mărimea și materialul ei, care devine activă; un pas de anulare', () => {
  const b = banc();
  ok(b, 'document.adauga-dreptunghi');
  ok(b, 'foaie.eticheta', { etichetaNoua: () => ({ camp: 'material', valoare: 'MDF alb 18' }) });
  const trecut = b.h().trecut.length;
  ok(b, 'foaie.adauga');
  const d = b.h().doc;
  assert.equal(d.foi.length, 2);
  assert.deepEqual(d.foi[1], { id: 'f2', stoc: d.foi[0]?.stoc, instante: [], material: 'MDF alb 18' });
  assert.equal(b.activa(), 'f2');
  assert.deepEqual(b.selectie(), []);
  assert.equal(b.h().trecut.length, trecut + 1);
  // Ce se desenează acum ajunge pe foaia activă.
  ok(b, 'document.adauga-cerc');
  assert.equal(b.h().doc.foi[1]?.instante.length, 1);
  assert.equal(b.h().doc.foi[0]?.instante.length, 1);
  seRedeschide(b.h().doc);
  ok(b, 'istoric.anuleaza');
  ok(b, 'istoric.anuleaza');
  assert.equal(b.h().doc.foi.length, 1);
  // Foaia activă ștearsă de anulare: contextul cade pe prima foaie, iar desenul merge tot.
  ok(b, 'document.adauga-cerc');
  assert.equal(b.h().doc.foi[0]?.instante.length, 2);
  // Din meniul altei foi, foaia nouă vine după aceea.
  const t = treiFoi();
  ok(t, 'foaie.adauga', { foaieAleasa: () => 'f1' });
  assert.deepEqual(t.h().doc.foi.map((f) => f.id), ['f1', 'f4', 'f2', 'f3']);
});

test('foaie.duplica: copii separate ale pieselor, la aceleași locuri, pe o foaie nouă după ea; numele nu vine; un pas', () => {
  const b = treiFoi();
  ok(b, 'foaie.eticheta', { foaieAleasa: () => 'f1', etichetaNoua: () => ({ camp: 'material', valoare: 'Fag 10' }) });
  ok(b, 'foaie.eticheta', { foaieAleasa: () => 'f1', etichetaNoua: () => ({ camp: 'nume', valoare: 'Sus' }) });
  const inainte = b.h().doc;
  ok(b, 'foaie.duplica', { foaieAleasa: () => 'f1' });
  const d = b.h().doc;
  assert.deepEqual(d.foi.map((f) => f.id), ['f1', 'f4', 'f2', 'f3']);
  const [sursa, copie] = [d.foi[0] as Foaie, d.foi[1] as Foaie];
  assert.equal(copie.nume, undefined);
  assert.equal(copie.material, 'Fag 10');
  assert.deepEqual(copie.stoc, sursa.stoc);
  assert.equal(copie.instante.length, 2);
  copie.instante.forEach((i, k) => {
    const o = sursa.instante[k];
    assert.ok(o);
    assert.notEqual(i.id, o.id);
    assert.notEqual(i.piesa, o.piesa, 'piesă separată, ca la Ctrl+D');
    assert.deepEqual([i.x, i.y, i.rotire], [o.x, o.y, o.rotire]);
    const [p, q] = [d.piese.find((x) => x.id === i.piesa), d.piese.find((x) => x.id === o.piesa)];
    assert.deepEqual(p?.operatii.map((x) => [x.tip, x.adancime, x.scula.diametru]), q?.operatii.map((x) => [x.tip, x.adancime, x.scula.diametru]));
  });
  assert.equal(b.activa(), 'f4');
  seRedeschide(d);
  ok(b, 'istoric.anuleaza');
  assert.equal(jsonCanonic(b.h().doc), jsonCanonic({ ...inainte, rev: b.h().doc.rev }));
});

test('foaie.sterge: cu piesele care stau doar pe ea; cea activă lasă locul vecinei; ultima foaie rămâne', () => {
  const b = treiFoi();
  const inainte = b.h().doc;
  const pieseF2 = new Set(inainte.foi[1]?.instante.map((i) => i.piesa));
  ok(b, 'foaie.sterge');
  const d = b.h().doc;
  assert.deepEqual(d.foi.map((f) => f.id), ['f1', 'f3']);
  assert.ok(d.piese.every((p) => !pieseF2.has(p.id)), 'piesele foii pleacă odată cu ea');
  assert.equal(b.activa(), 'f1', 'vecina de dinainte');
  seRedeschide(d);
  ok(b, 'istoric.anuleaza');
  assert.equal(jsonCanonic(b.h().doc), jsonCanonic({ ...inainte, rev: b.h().doc.rev }), 'anularea pune foaia și piesele la locul lor');
  // Prima foaie, ștearsă cât e activă: devine activă următoarea.
  b.activeazaFoaie?.('f1');
  ok(b, 'foaie.sterge');
  assert.equal(b.activa(), 'f2');
  // O foaie care nu e activă pleacă fără să schimbe foaia activă.
  ok(b, 'foaie.sterge', { foaieAleasa: () => 'f3' });
  assert.equal(b.activa(), 'f2');
  assert.deepEqual(stare(R, 'foaie.sterge', b), { ok: false, motiv: 'motiv.ultima-foaie' });
});

test('foaie.muta-sus / muta-jos: un loc în listă, un pas; la capăt, motivul', () => {
  const b = treiFoi();
  ok(b, 'foaie.muta-sus');
  assert.deepEqual(b.h().doc.foi.map((f) => f.id), ['f2', 'f1', 'f3']);
  assert.deepEqual(stare(R, 'foaie.muta-sus', b), { ok: false, motiv: 'motiv.foaie-capat' });
  ok(b, 'foaie.muta-jos', { foaieAleasa: () => 'f1' });
  assert.deepEqual(b.h().doc.foi.map((f) => f.id), ['f2', 'f3', 'f1']);
  assert.deepEqual(stare(R, 'foaie.muta-jos', { ...b, foaieAleasa: () => 'f1' }), { ok: false, motiv: 'motiv.foaie-capat' });
  ok(b, 'istoric.anuleaza');
  ok(b, 'istoric.anuleaza');
  assert.deepEqual(b.h().doc.foi.map((f) => f.id), ['f1', 'f2', 'f3']);
  assert.equal(b.activa(), 'f2', 'ordinea nu schimbă foaia activă');
});

test('foaie.eticheta: numele și materialul, fără spațiile de la capete; gol = fără; peste 200 de caractere, motivul', () => {
  const b = treiFoi();
  const trecut = b.h().trecut.length;
  ok(b, 'foaie.eticheta', { etichetaNoua: () => ({ camp: 'material', valoare: '  MDF alb 18 ' }) });
  assert.equal(b.h().doc.foi[1]?.material, 'MDF alb 18');
  ok(b, 'foaie.eticheta', { etichetaNoua: () => ({ camp: 'material', valoare: 'MDF alb 18' }) });
  assert.equal(b.h().trecut.length, trecut + 1, 'aceeași valoare: nicio comandă');
  ok(b, 'foaie.eticheta', { foaieAleasa: () => 'f3', etichetaNoua: () => ({ camp: 'nume', valoare: '   ' }) });
  assert.equal(Object.hasOwn(b.h().doc.foi[2] as Foaie, 'nume'), false);
  const lung = 'x'.repeat(PLAFON.numeLungime + 1);
  assert.deepEqual(stare(R, 'foaie.eticheta', { ...b, etichetaNoua: () => ({ camp: 'nume', valoare: lung }) }), { ok: false, motiv: 'motiv.eticheta-lunga' });
  ok(b, 'foaie.eticheta', { etichetaNoua: () => ({ camp: 'nume', valoare: ` ${'x'.repeat(PLAFON.numeLungime)} ` }) });
  seRedeschide(b.h().doc);
  assert.deepEqual(stare(R, 'foaie.eticheta', b), { ok: false, motiv: 'motiv.nimic-ales' });
});

test('selectie.muta-pe-foaie: piesele își păstrează locul, foaia activă rămâne, selecția se golește; un singur pas', () => {
  const b = treiFoi();
  b.activeazaFoaie?.('f1');
  const inainte = b.h().doc;
  const [a, c] = ids(inainte.foi[0]);
  assert.ok(a && c);
  b.selecteaza([c]);
  assert.deepEqual(stare(R, 'selectie.muta-pe-foaie', { ...b, foaieTinta: () => 'f1' }), { ok: false, motiv: 'motiv.aceeasi-foaie' });
  assert.deepEqual(stare(R, 'selectie.muta-pe-foaie', { ...b, foaieTinta: () => 'f9' }), { ok: false, motiv: 'motiv.aceeasi-foaie' });
  assert.deepEqual(stare(R, 'selectie.muta-pe-foaie', b), { ok: false, motiv: 'motiv.nimic-ales' });
  const trecut = b.h().trecut.length;
  ok(b, 'selectie.muta-pe-foaie', { foaieTinta: () => 'f3' });
  const d = b.h().doc;
  assert.deepEqual(ids(d.foi[0]), [a]);
  assert.deepEqual(ids(d.foi[2]).at(-1), c);
  assert.deepEqual(d.foi[2]?.instante.at(-1), inainte.foi[0]?.instante[1], 'același loc, aceeași piesă');
  assert.equal(d.piese, inainte.piese);
  assert.equal(b.activa(), 'f1');
  assert.deepEqual(b.selectie(), []);
  assert.equal(b.h().trecut.length, trecut + 1);
  seRedeschide(d);
  ok(b, 'istoric.anuleaza');
  assert.equal(jsonCanonic(b.h().doc), jsonCanonic({ ...inainte, rev: b.h().doc.rev }));
  // Pe o foaie nouă: făcută după cea activă, în același pas.
  b.selecteaza([a, c]);
  ok(b, 'selectie.muta-pe-foaie', { foaieTinta: () => null });
  assert.deepEqual(b.h().doc.foi.map((f) => f.id), ['f1', 'f4', 'f2', 'f3']);
  assert.deepEqual(ids(b.h().doc.foi[1]), [a, c]);
  assert.deepEqual(ids(b.h().doc.foi[0]), []);
  ok(b, 'istoric.anuleaza');
  assert.equal(jsonCanonic(b.h().doc), jsonCanonic({ ...inainte, rev: b.h().doc.rev }), 'foaia nouă și mutarea pleacă împreună');
  // Doar citind, nimic.
  const doarCitire = banc(inainte, true);
  doarCitire.selecteaza([a]);
  assert.deepEqual(stare(R, 'selectie.muta-pe-foaie', { ...doarCitire, foaieTinta: () => 'f2' }), { ok: false, motiv: 'motiv.doar-citire' });
  for (const id of ['foaie.adauga', 'foaie.duplica', 'foaie.sterge', 'foaie.muta-jos']) {
    assert.deepEqual(stare(R, id, doarCitire), { ok: false, motiv: 'motiv.doar-citire' }, id);
  }
});

test('criteriul din prag: o editare pe foaia activă lasă celelalte foi identice (JSON-ul canonic), pe trei foi', () => {
  const b = treiFoi();
  const altele = (d: Document): string => jsonCanonic(d.foi.filter((f) => f.id !== 'f2'));
  const pieseAltor = (d: Document): string => {
    const folosite = new Set(d.foi.filter((f) => f.id !== 'f2').flatMap((f) => f.instante.map((i) => i.piesa)));
    return jsonCanonic(d.piese.filter((p) => folosite.has(p.id)));
  };
  const [foi0, piese0] = [altele(b.h().doc), pieseAltor(b.h().doc)];
  const [e] = ids(b.h().doc.foi[1]);
  assert.ok(e);
  const pasi: Array<[string, Partial<ContextDocument>]> = [
    ['document.adauga-dreptunghi', {}],
    ['document.adauga-cerc', {}],
    ['document.muta-selectia', { deplasare: () => ({ dx: 3, dy: -2 }) }],
    ['document.duplica-selectia', {}],
    ['document.pozitioneaza', { pozitieNoua: () => ({ x: 12 }) }],
    ['document.roteste', { rotireNoua: () => 30 }],
    ['foaie.stoc', { stocNou: () => ({ latime: 640 }) }],
    ['foaie.ghidaje', { ghidajeNoi: () => [{ id: 'g1', axa: 'x', poz: 100 }] }],
    ['foaie.eticheta', { etichetaNoua: () => ({ camp: 'material', valoare: 'Placaj' }) }],
    ['document.sterge-selectia', {}],
  ];
  b.selecteaza([e]);
  for (const [id, extra] of pasi) {
    if (b.selectie().length === 0) b.selecteaza(ids(b.h().doc.foi[1]).slice(-1));
    ok(b, id, extra);
    assert.equal(altele(b.h().doc), foi0, `${id}: celelalte foi`);
    assert.equal(pieseAltor(b.h().doc), piese0, `${id}: piesele celorlalte foi`);
  }
  assert.notEqual(jsonCanonic(b.h().doc.foi[1]), jsonCanonic(treiFoi().h().doc.foi[1]), 'editările au ajuns pe foaia activă');
  seRedeschide(b.h().doc);
});

test('exportul foii active: octet cu octet exportul unui document doar cu ea; o foaie adăugată nu schimbă programul alteia', async () => {
  const b = treiFoi();
  const d = b.h().doc;
  const p = { origine: 'stanga-jos', z0: 'sus' } as const;
  const octeti = async (doc: Document): Promise<string> => {
    const r = await calculeazaExportul(doc, p);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    return r.ok ? jsonCanonic([r.program.sha256, r.program.text, r.fisiere.map((f) => [f.nume, f.sha256])]) : '';
  };
  for (const f of d.foi) {
    const folosite = new Set(f.instante.map((i) => i.piesa));
    const singur: Document = { ...d, foi: [f], piese: d.piese.filter((x) => folosite.has(x.id)) };
    assert.equal(await octeti(doarFoaia(d, f.id)), await octeti(singur), f.id);
  }
  // Foaia 1 a proiectului cu o singură foaie, înainte de celelalte: același program.
  const unu = banc();
  ok(unu, 'document.adauga-dreptunghi');
  ok(unu, 'document.adauga-cerc');
  assert.equal(await octeti(doarFoaia(d, 'f1')), await octeti(unu.h().doc));
});

test('foaia activă ținută în browser: id-ul ei, sau nimic (lipsă, alt format, stocarea care aruncă)', () => {
  const mem = new Map<string, string>();
  const st: StocareFoaie = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); } };
  assert.equal(foaiaTinuta(st), null);
  tineFoaia('f2', st);
  assert.equal(mem.get(CHEIE_FOAIA), 'f2');
  assert.equal(foaiaTinuta(st), 'f2');
  for (const rau of ['', 'f 2', 'x'.repeat(65), '<f2>']) {
    mem.set(CHEIE_FOAIA, rau);
    assert.equal(foaiaTinuta(st), null, JSON.stringify(rau));
  }
  const aruncă: StocareFoaie = { getItem: () => { throw new Error('refuzat'); }, setItem: () => { throw new Error('plin'); } };
  assert.equal(foaiaTinuta(aruncă), null);
  assert.doesNotThrow(() => { tineFoaia('f1', aruncă); });
  assert.equal(foaiaTinuta(null), null);
});
