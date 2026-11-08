/**
 * „Așază pe foi” și „Mută și așază la capăt” prin registru (ADR 0210 §3, felia 11.3↑), cu calculul încărcat, pe hârtie:
 * dreptunghiul implicit (100 × 60, profil exterior cu freza de 6) pe foaia de 300 × 200, marginea 10, distanța 6: pe un rând
 * încap două (10 și 116; a treia ar ieși la 222 + 100 > 290), pe foaie două rânduri (y = 130 și 200 − 10 − 60 − 66 = 64),
 * deci patru. Fiecare gest e un pas de anulare; refuzurile au motivul lor. Alegerile ținute în browser: valide sau implicite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEIE_ASEZARE, optiuniTinute, tineOptiunile } from '../../src/app/asezareTinuta.ts';
import { ASEZARE_IMPLICITA, type OptiuniAsezare } from '../../src/model/asezare.ts';
import { documentNou, type Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

type Banc = ContextDocument & { readonly h: () => Istoric; readonly activa: () => string };

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
const motiv = (b: ContextDocument, id: string, extra: Partial<ContextDocument> = {}): unknown => {
  const r = stare(R, id, { ...b, ...extra });
  return r.ok ? true : r.motiv;
};
const continut = (d: Document): string => jsonCanonic({ piese: d.piese, foi: d.foi });
const locuri = (d: Document): number[][][] => d.foi.map((f) => f.instante.map((i) => [i.x, i.y]));
const cu = (o: Partial<OptiuniAsezare>): OptiuniAsezare => ({ ...ASEZARE_IMPLICITA, ...o });

/** `n` dreptunghiuri implicite pe foaia activă, toate alese. */
function dreptunghiuri(n: number, b: Banc = banc()): Banc {
  const ids: string[] = [];
  for (let k = 0; k < n; k++) {
    ok(b, 'document.adauga-dreptunghi');
    ids.push(...b.selectie());
  }
  b.selecteaza(ids);
  return b;
}
const aseaza = (b: Banc, o: Partial<OptiuniAsezare> = {}, ids: readonly string[] = b.selectie()): Partial<ContextDocument> => ({
  asezare: () => ({ ids, optiuni: cu(o) }),
});

test('foaie.aseaza: din stânga-sus, două pe rând, patru pe foaie, apoi o foaie nouă; un pas; selecția, cu cele rămase pe foaie', () => {
  const b = dreptunghiuri(7);
  const toate = b.selectie();
  const inainte = b.h().doc;
  // Freza de 6 a profilului: distanța implicită de 5 e refuzată, cu motivul ei.
  assert.equal(motiv(b, 'foaie.aseaza', aseaza(b)), 'motiv.aseaza-distanta');
  const trecut = b.h().trecut.length;
  ok(b, 'foaie.aseaza', aseaza(b, { distantaX: 6, distantaY: 6 }));
  const d = b.h().doc;
  assert.deepEqual(locuri(d), [[[10, 130], [116, 130], [10, 64], [116, 64]], [[10, 130], [116, 130], [10, 64]]]);
  assert.equal(b.h().trecut.length, trecut + 1, 'un pas de anulare');
  assert.deepEqual(b.selectie(), toate.slice(0, 4), 'cele plecate pe foaia nouă ies din selecție');
  assert.equal(b.activa(), inainte.foi[0]?.id, 'foaia activă rămâne');
  assert.ok(incarca(JSON.parse(JSON.stringify(d))).ok);
  // Aceeași așezare, din nou: nimic de schimbat.
  b.selecteaza(toate.slice(0, 4));
  assert.equal(motiv(b, 'foaie.aseaza', aseaza(b, { distantaX: 6, distantaY: 6 })), 'motiv.aseaza-nimic');
  ok(b, 'istoric.anuleaza');
  assert.equal(continut(b.h().doc), continut(inainte));
});

test('foaie.aseaza: refuzurile — fără cerere, valori greșite, toate prea mari, doar citire', () => {
  const b = dreptunghiuri(2);
  assert.equal(motiv(b, 'foaie.aseaza'), 'motiv.nimic-ales');
  assert.equal(motiv(b, 'foaie.aseaza', aseaza(b, { distantaX: 6, distantaY: 6, margineX: 150 })), 'motiv.aseaza-valori');
  assert.equal(motiv(b, 'foaie.aseaza', aseaza(b, { distantaX: 6, distantaY: 6, margineY: Number.NaN })), 'motiv.aseaza-valori');
  assert.equal(motiv(b, 'foaie.aseaza', aseaza(b, { distantaX: 6, distantaY: 6 }, [])), 'motiv.nimic-ales');
  // Unul lățit la 290 (> 300 − 2 · 10), așezat singur: rămâne pe loc, deci nimic de făcut.
  const [primul] = b.selectie();
  assert.ok(primul);
  b.selecteaza([primul]);
  ok(b, 'document.forma', { formaEditata: () => ({ tip: 'dreptunghi', latime: 290, inaltime: 60, razaColt: 0 }) });
  assert.equal(motiv(b, 'foaie.aseaza', aseaza(b, { distantaX: 6, distantaY: 6 }, [primul])), 'motiv.aseaza-prea-mari');
  const citire = banc(b.h().doc, true);
  assert.equal(motiv(citire, 'foaie.aseaza', aseaza(citire, { distantaX: 6, distantaY: 6 }, [primul])), 'motiv.doar-citire');
});

test('selectie.muta-si-aseaza: pe altă foaie, după piesele ei, la capătul listei; pe o foaie nouă; selecția se golește', () => {
  const b = dreptunghiuri(3);
  const alese = b.selectie();
  ok(b, 'foaie.adauga');
  ok(b, 'document.adauga-dreptunghi');
  const f1 = b.h().doc.foi[0]?.id ?? '', f2 = b.activa();
  b.activeazaFoaie?.(f1);
  b.selecteaza(alese);
  const inainte = b.h().doc;
  // Alegerile ținute (implicitele, în node) au distanța 5: urcă singură la freza de 6, fără refuz.
  const trecut = b.h().trecut.length;
  ok(b, 'selectie.muta-si-aseaza', { foaieTinta: () => f2 });
  const d = b.h().doc;
  // Pe f2 rămâne dreptunghiul ei, jos (20, 20): rândul de sus e liber; al doilea rând (v = 76) l-ar atinge, deci sare la 120 + 6.
  assert.deepEqual(locuri(d), [[], [[20, 20], [10, 130], [116, 130], [126, 64]]]);
  assert.deepEqual(d.foi[1]?.instante.slice(1).map((i) => i.id), alese, 'la capătul listei foii');
  assert.deepEqual(b.selectie(), []);
  assert.equal(b.activa(), f1);
  assert.equal(b.h().trecut.length, trecut + 1);
  ok(b, 'istoric.anuleaza');
  assert.equal(continut(b.h().doc), continut(inainte));
  // Pe o foaie nouă (după cea activă, ca ea): din colț.
  b.selecteaza(alese);
  ok(b, 'selectie.muta-si-aseaza', { foaieTinta: () => null });
  const n = b.h().doc;
  assert.deepEqual(n.foi.map((f) => f.instante.length), [0, 3, 1]);
  assert.deepEqual(locuri(n)[1], [[10, 130], [116, 130], [10, 64]]);
  assert.deepEqual(n.foi[1]?.stoc, n.foi[0]?.stoc);
  // Refuzurile: aceeași foaie, fără selecție, fără țintă.
  b.activeazaFoaie?.(n.foi[1]?.id ?? '');
  b.selecteaza(alese);
  assert.equal(motiv(b, 'selectie.muta-si-aseaza', { foaieTinta: () => n.foi[1]?.id ?? '' }), 'motiv.aceeasi-foaie');
  assert.equal(motiv(b, 'selectie.muta-si-aseaza'), 'motiv.nimic-ales');
  b.selecteaza([]);
  assert.equal(motiv(b, 'selectie.muta-si-aseaza', { foaieTinta: () => f2 }), 'motiv.nicio-selectie');
});

test('alegerile ținute: implicitele fără nimic, cu o valoare stricată sau cu o stocare care aruncă; altfel, cele scrise', () => {
  const m = new Map<string, string>();
  const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
  assert.deepEqual(optiuniTinute(s), ASEZARE_IMPLICITA);
  const ale = cu({ colt: 'dreapta-jos', margineX: 12, distantaY: 7.5, ordinea: 'mari', rotirea: '90' });
  tineOptiunile(ale, s);
  assert.deepEqual(JSON.parse(m.get(CHEIE_ASEZARE) ?? 'null'), ale);
  assert.deepEqual(optiuniTinute(s), ale);
  // Un câmp lipsă vine din implicite; unul străin se lasă deoparte.
  m.set(CHEIE_ASEZARE, JSON.stringify({ colt: 'stanga-jos', strain: 1 }));
  assert.deepEqual(optiuniTinute(s), cu({ colt: 'stanga-jos' }));
  for (const rau of ['{', '42', '"text"', JSON.stringify({ colt: 'mijloc' }), JSON.stringify({ margineX: -1 }), JSON.stringify({ rotirea: '45' })]) {
    m.set(CHEIE_ASEZARE, rau);
    assert.deepEqual(optiuniTinute(s), ASEZARE_IMPLICITA, rau);
  }
  const rea = { getItem: (): string | null => { throw new Error('privat'); }, setItem: (): void => { throw new Error('plin'); } };
  assert.deepEqual(optiuniTinute(rea), ASEZARE_IMPLICITA);
  assert.doesNotThrow(() => { tineOptiunile(ale, rea); });
  assert.deepEqual(optiuniTinute(null), ASEZARE_IMPLICITA);
});
