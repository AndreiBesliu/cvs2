/**
 * Locurile alese ale urechilor (v26, ADR 0211) stau pe elementele operației: ușa refuză o cheie care nu e un element al ei.
 * Aici, funcția prin care trece orice schimbare a nodurilor unei operații (`cuNoduri`), urechile unui rol salvat
 * (`urechiDeSablon`) și, ca a doua plasă, drumurile modelului care schimbă nodurile (gruparea, degruparea, piesa coaptă a
 * unei plăcuțe, rolurile): documentul care iese trece prin ușă, cu locurile pe elementele lor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Document, Operatie, Piesa, UrechiOperatie } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { cuNoduri, urechiDeSablon } from '../../src/model/urechiLocuri.ts';
import { grupDin } from '../../src/model/grupare.ts';
import { partiDegrupare } from '../../src/model/degrupare.ts';
import { placutaCoapta } from '../../src/model/placute.ts';
import { operatiiPentruRol } from '../../src/model/rol.ts';
import { operatiiPentruRolPersonal, rolPersonalPiesei, sablonDinPiese, type RolPersonal } from '../../src/model/rolPersonal.ts';
import { taie } from '../../src/model/taiere.ts';
import { raportFoi } from '../../src/model/raportFoi.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const D = { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 } as const;
const SCURTE = [{ x: 0, y: 15 }, { x: 80, y: 15 }];
const alese = (locuri: Record<string, { x: number; y: number }[]>): UrechiOperatie => ({ numar: 2, latime: 6, grosime: 2, mod: 'alese', locuri });
const profil = (id: string, noduri: string[], urechi: UrechiOperatie | null): Operatie => ({
  id, tip: 'profil', noduri, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', sens: 'urcare', adancime: 6, pas: 3,
  urechi, rampa: null, intrari: null, colturi: null,
});
const piesa = (urechi: UrechiOperatie | null = alese({ e: SCURTE })): Piesa => ({
  id: 'p', radacina: { tip: 'element', id: 'e', forma: { ...D }, matrice: { ...I } }, operatii: [profil('x1', ['e'], urechi)],
});
/** Documentul v26 cu piesele date, fiecare pusă o dată. */
const documentCu = (piese: readonly Piesa[]): Document => ({
  schema: 26, rev: 0, piese: [...piese],
  foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: piese.map((p, k) => ({ id: `i${k}`, piesa: p.id, x: 50 + 100 * k, y: 50, rotire: 0 })) }],
});
/** Ușa primește documentul, iar fiecare operație are locurile doar pe nodurile ei. */
function treceUsa(d: Document): void {
  const r = incarca(structuredClone(d));
  assert.ok(r.ok, r.ok ? '' : String(r.motiv));
  for (const p of d.piese) {
    for (const o of p.operatii) {
      for (const k of Object.keys(o.urechi?.locuri ?? {})) assert.ok(o.noduri.includes(k), `${p.id}/${o.id}: ${k} nu e în ${o.noduri.join(', ')}`);
    }
  }
}

test('cuNoduri: fără locuri alese, doar nodurile se schimbă', () => {
  const o = profil('x1', ['e'], { numar: 4, latime: 8, grosime: 2 });
  const r = cuNoduri(o, ['f']);
  assert.deepEqual(r, { ...o, noduri: ['f'] });
  assert.equal(r.urechi, o.urechi);
  assert.deepEqual(cuNoduri(profil('x1', ['e'], null), ['e', 'f']).noduri, ['e', 'f']);
});

test('cuNoduri: locurile rămân doar pe nodurile noi, în ordinea lor, cu listele neatinse', () => {
  const o = profil('x1', ['e', 'f', 'g'], alese({ e: SCURTE, f: [{ x: 1, y: 2 }], g: [] }));
  const r = cuNoduri(o, ['g', 'e']);
  assert.deepEqual(r.noduri, ['g', 'e']);
  assert.deepEqual(Object.keys(r.urechi?.locuri ?? {}), ['e', 'g']);
  assert.equal(r.urechi?.locuri?.['e'], o.urechi?.locuri?.['e']);
  assert.equal(r.urechi?.mod, 'alese');
  // Intrarea rămâne cum era.
  assert.deepEqual(Object.keys(o.urechi?.locuri ?? {}), ['e', 'f', 'g']);
  // Niciun nod rămas: locurile, goale; modul rămâne „alese” (nicio ureche).
  assert.deepEqual(cuNoduri(o, ['h']).urechi?.locuri, {});
});

test('cuNoduri: redenumirile mută locurile pe numele noi', () => {
  const o = profil('x1', ['e', 'f'], alese({ e: SCURTE, f: [{ x: 1, y: 2 }] }));
  const r = cuNoduri(o, ['e_2', 'f'], new Map([['e', 'e_2']]));
  assert.deepEqual(r.urechi?.locuri, { e_2: SCURTE, f: [{ x: 1, y: 2 }] });
});

test('cuNoduri: o cheie „__proto__” rămâne o cheie proprie (pusă, nu atribuită)', () => {
  const locuri = JSON.parse('{"__proto__": [{"x": 0, "y": 15}], "e": []}') as Record<string, { x: number; y: number }[]>;
  const r = cuNoduri(profil('x1', ['__proto__', 'e'], alese(locuri)), ['__proto__']);
  const l = r.urechi?.locuri as object;
  assert.ok(Object.hasOwn(l, '__proto__'));
  assert.deepEqual(Object.keys(l), ['__proto__']);
  assert.equal(Object.getPrototypeOf(l), Object.prototype);
});

test('urechiDeSablon: locurile pleacă, „alese” devine implicitul; celelalte moduri și câmpurile necunoscute rămân', () => {
  assert.equal(urechiDeSablon(null), null);
  const egale = { numar: 4, latime: 8, grosime: 2 };
  assert.equal(urechiDeSablon(egale), egale);
  assert.deepEqual(urechiDeSablon({ ...alese({ e: SCURTE }), nota: 1 }), { numar: 2, latime: 6, grosime: 2, nota: 1 });
  assert.deepEqual(urechiDeSablon({ numar: 2, latime: 6, grosime: 2, mod: 'lemn' }), { numar: 2, latime: 6, grosime: 2, mod: 'lemn' });
  assert.deepEqual(urechiDeSablon({ numar: 2, latime: 6, grosime: 2, mod: 'egale', locuri: {} }), { numar: 2, latime: 6, grosime: 2, mod: 'egale' });
});

test('a doua plasă: gruparea a două instanțe ale aceleiași piese redenumește elementul și locurile lui', () => {
  const p = piesa();
  const g = grupDin([{ instanta: { id: 'a', piesa: 'p', x: 0, y: 0, rotire: 0 }, piesa: p }, { instanta: { id: 'b', piesa: 'p', x: 100, y: 0, rotire: 0 }, piesa: p }], 'g');
  assert.ok(typeof g === 'object');
  assert.equal(g.piesa.operatii.length, 2);
  const [o1, o2] = g.piesa.operatii as [Operatie, Operatie];
  assert.notEqual(o1.noduri[0], o2.noduri[0]);
  for (const o of [o1, o2]) assert.deepEqual(o.urechi?.locuri, { [o.noduri[0] as string]: SCURTE });
  treceUsa(documentCu([{ ...g.piesa, id: 'p' }]));
  // Degruparea dă fiecărei părți locurile elementului ei.
  const parti = partiDegrupare(g.piesa);
  assert.ok(Array.isArray(parti));
  for (const parte of parti) {
    const [o] = parte.operatii as [Operatie];
    assert.deepEqual(Object.keys(o.urechi?.locuri ?? {}), o.noduri);
  }
  treceUsa(documentCu(parti.map((x, k) => ({ id: `q${k}`, radacina: x.radacina, operatii: [...x.operatii] }))));
});

test('a doua plasă: degruparea unei operații pe două elemente împarte locurile', () => {
  const p: Piesa = {
    id: 'p', radacina: {
      tip: 'grup', id: 'g', matrice: { ...I }, copii: [
        { tip: 'element', id: 'e', forma: { ...D }, matrice: { ...I } },
        { tip: 'element', id: 'f', forma: { tip: 'cerc', raza: 10 }, matrice: { ...I, e: 120, f: 15 } },
      ],
    },
    operatii: [profil('x1', ['e', 'f'], alese({ e: SCURTE, f: [{ x: 10, y: 0 }] }))],
  };
  treceUsa(documentCu([p]));
  const parti = partiDegrupare(p);
  assert.ok(Array.isArray(parti) && parti.length === 2);
  assert.deepEqual(parti.map((x) => x.operatii[0]?.urechi?.locuri), [{ e: SCURTE }, { f: [{ x: 10, y: 0 }] }]);
});

test('a doua plasă: piesa coaptă a unei plăcuțe («Desprinde») ține locurile', () => {
  const c = placutaCoapta(piesa(), { id: 'i0', piesa: 'p', x: 50, y: 50, rotire: 0 }, 'p2');
  assert.deepEqual(c.piesa.operatii[0]?.urechi?.locuri, { e: SCURTE });
  treceUsa(documentCu([c.piesa]));
});

test('a doua plasă: rolul schimbat (exterior → interior) ține locurile; rolul salvat nu le ia', () => {
  const p = piesa();
  const doc = documentCu([p]);
  const ops = operatiiPentruRol(doc, p, 'interior');
  assert.ok(ops);
  assert.deepEqual(ops.map((o) => o.urechi?.locuri), [{ e: SCURTE }]);
  treceUsa(documentCu([{ ...p, operatii: ops }]));
  // Rolul salvat dintr-o piesă cu urechi alese: urechile lui, fără locuri, la distanțe egale.
  const s = sablonDinPiese([p]);
  assert.ok(s.ok);
  assert.deepEqual(s.sablon.operatie.urechi, { numar: 2, latime: 6, grosime: 2 });
  // Aplicat pe altă piesă: fără locuri; piesa cu urechile alese își recunoaște rolul (locurile sunt ale ei, nu ale rolului).
  const alta = piesa({ numar: 2, latime: 6, grosime: 2 });
  const aplicate = operatiiPentruRolPersonal(alta, s.sablon);
  assert.ok(aplicate);
  assert.deepEqual(aplicate.map((o) => o.urechi), [{ numar: 2, latime: 6, grosime: 2 }]);
  const rol: RolPersonal = { id: 'r1', nume: 'Cu urechi', ...s.sablon };
  assert.equal(rolPersonalPiesei(p, [rol])?.id, 'r1');
  assert.equal(rolPersonalPiesei(alta, [rol])?.id, 'r1');
});

/** Dreptunghiul 100 × 60 pus în (100, 100), cu urechile alese pe laturile scurte, tăiat de verticala x = 150, apoi degrupat. */
function taiatCuUrechi(alteOperatii: readonly Operatie[]): Document {
  const d0 = docDin({ latime: 1000, inaltime: 1000, grosime: 18 }, { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } });
  const d1 = cuOperatie(d0, 'r', { urechi: alese({ r: [{ x: 0, y: 30 }, { x: 100, y: 30 }] }) });
  const d = { ...d1, piese: d1.piese.map((p) => ({ ...p, operatii: [...p.operatii, ...alteOperatii] })) };
  treceUsa(d);
  const r = taie(d, { cutit: { fel: 'x', x: 150 }, alese: ['r'], inchide: true });
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return executa(istoricNou(d), { tip: 'degrupeaza', foaie: d.foi[0]!.id, degrupate: r.degrupate }).doc;
}

test('a doua plasă: tăierea unei piese cu rol (profilul exterior) ține locurile doar pe elementele care rămân', () => {
  const dupa = taiatCuUrechi([]);
  assert.ok(dupa.piese.length >= 2, `${dupa.piese.length} piese`);
  treceUsa(dupa);
});

test('a doua plasă: tăierea unei piese fără rol (profil și gravare pe același contur) ține locurile doar pe elementele care rămân', () => {
  const dupa = taiatCuUrechi([{ ...profil('l1', ['r'], null), latura: 'pe-linie', adancime: 1, pas: 1 }]);
  assert.ok(dupa.piese.length >= 2, `${dupa.piese.length} piese`);
  treceUsa(dupa);
});

test('a doua plasă: rolul schimbat pe o piesă cu goluri dă urechile primei operații fiecărei operații noi, doar cu locurile elementelor ei', () => {
  const p: Piesa = {
    id: 'p', radacina: {
      tip: 'grup', id: 'g', matrice: { ...I }, copii: [
        { tip: 'element', id: 'e', forma: { ...D }, matrice: { ...I } },
        { tip: 'element', id: 'h', forma: { tip: 'cerc', raza: 5 }, matrice: { ...I, e: 40, f: 15 } },
      ],
    },
    // Rolul „exterior” cu goluri (ADR 0112): conturul pe dinafară, gaura pe dinăuntru, fiecare cu locurile ei.
    operatii: [profil('x1', ['e'], alese({ e: SCURTE })), { ...profil('x2', ['h'], alese({ h: [{ x: 5, y: 0 }] })), latura: 'interior' }],
  };
  treceUsa(documentCu([p]));
  // Pe „interior”, conturul trece pe dinăuntru, gaura pe dinafară; urechile vin din prima operație (ADR 0112 §4): locurile ei
  // rămân pe contur, iar operația găurii nu le poate ține (nu-i sunt elemente).
  const ops = operatiiPentruRol(documentCu([p]), p, 'interior');
  assert.ok(ops && ops.length === 2, JSON.stringify(ops?.map((o) => o.noduri)));
  assert.deepEqual(ops.map((o) => [o.latura, o.noduri, o.urechi?.locuri]), [['interior', ['e'], { e: SCURTE }], ['exterior', ['h'], {}]]);
  treceUsa(documentCu([{ ...p, operatii: ops }]));
});

test('a doua plasă: un rol salvat cu locuri (scris în stocare de altcineva) nu le dă pieselor', () => {
  const rol: RolPersonal = { id: 'r2', nume: 'Străin', baza: 'exterior', operatie: profil('model', ['model'], alese({ model: SCURTE, e: SCURTE })) };
  const aplicate = operatiiPentruRolPersonal(piesa(null), rol);
  assert.ok(aplicate);
  assert.deepEqual(aplicate.map((o) => o.urechi), [{ numar: 2, latime: 6, grosime: 2 }]);
  treceUsa(documentCu([{ ...piesa(null), operatii: aplicate }]));
});

test('raportul foilor: la locuri alese, câte urechi sunt alese (nu câte pe buclă)', () => {
  const r = raportFoi(documentCu([piesa(alese({ e: [...SCURTE, { x: 40, y: 0 }] }))]), 'taiata', (n) => `Foaia ${n}`);
  assert.equal(r.foi[0]?.operatii[0]?.urechi, 3);
  const egale = raportFoi(documentCu([piesa({ numar: 4, latime: 6, grosime: 2 })]), 'taiata', (n) => `Foaia ${n}`);
  assert.equal(egale.foi[0]?.operatii[0]?.urechi, 4);
});
