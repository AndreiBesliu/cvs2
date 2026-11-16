/**
 * Felia 11.6↑ (ADR 0210 §6): raportul foilor și lista de tăiere, pe hârtie. Criteriul din prag: 25 de plăcuțe 80 × 30 pe foi
 * 300 × 200 (marginea 10, distanța 5) dau 15 + 10, folosite 60 % și 40 %; prototipul: 12 suporturi 150 × 100 pe 600 × 400
 * (10 / 10) dau 9 + 3, 56,25 % și 18,75 %. Mărimea piesei e cutia conturului tăiat prin toată grosimea (profilul exterior),
 * în axele piesei; fără el, a desenului. Foile identice (aceleași forme, locuri și operații, legate sau copii separate) se
 * spun o dată, ×N. CSV-ul: UTF-8 cu BOM, `;` cu virgula zecimală sau `,` cu punctul, ghilimelele RFC 4180.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { DICTIONARE_MODULE } from '../../scripts/mesaje.ts';
import { adaugaMesaje, schimbaLimba } from '../../src/i18n/t.ts';
import { operatieImplicita, VERSIUNE_SCHEMA, type Document, type Foaie, type Instanta, type Piesa } from '../../src/model/document.ts';
import { raportFoi } from '../../src/model/raportFoi.ts';
import { csvRaport } from '../../src/app/raportCsv.ts';
import { ID } from './ajutor-document.ts';

adaugaMesaje(DICTIONARE_MODULE.export);

const dr = (latime: number, inaltime: number) => ({ tip: 'dreptunghi', latime, inaltime, razaColt: 0 }) as const;
const sablon = (n: number): string => `Foaia ${n}`;

/** O piesă dreptunghi, cu profilul exterior la adâncimea dată (pasul 4, freza Ø6). */
function piesaDr(id: string, latime: number, inaltime: number, adancime: number, nume?: string): Piesa {
  return {
    id, ...(nume ? { nume } : {}),
    radacina: { tip: 'element', id, forma: dr(latime, inaltime), matrice: ID },
    operatii: [{ ...operatieImplicita(id, dr(latime, inaltime)), adancime, pas: 4 }],
  };
}
const inst = (id: string, piesa: string, x: number, y: number, extra: Partial<Instanta> = {}): Instanta => ({ id, piesa, x, y, rotire: 0, ...extra });
const foaie = (id: string, stoc: [number, number, number], instante: Instanta[], material?: string): Foaie => ({
  id, stoc: { latime: stoc[0], inaltime: stoc[1], grosime: stoc[2] }, instante, ...(material ? { material } : {}),
});
const doc = (piese: Piesa[], foi: Foaie[]): Document => ({ schema: VERSIUNE_SCHEMA, rev: 0, piese, foi });

/** Criteriul din prag: 25 de plăcuțe 80 × 30, din stânga-sus, pe două foi de Fag 10 mm. */
function plăcuțe(): Document {
  const locuri = [160, 125, 90, 55, 20].flatMap((y) => [10, 95, 180].map((x) => ({ x, y })));
  const cu = (k: number) => inst(`i${k}`, 'p', locuri[(k - 1) % 15]!.x, locuri[(k - 1) % 15]!.y, { campuri: { nume: `Nume ${k}` } });
  return doc([piesaDr('p', 80, 30, 10, 'Plăcuță nume')], [
    foaie('f1', [300, 200, 10], Array.from({ length: 15 }, (_, k) => cu(k + 1)), 'Fag 10 mm'),
    foaie('f2', [300, 200, 10], Array.from({ length: 10 }, (_, k) => cu(k + 16)), 'Fag 10 mm'),
  ]);
}

test('criteriul din prag: 15 + 10 plăcuțe 80 × 30, folosite 60 % și 40 %, cu valorile lor; totalurile pe piesă și pe material', () => {
  const r = raportFoi(plăcuțe(), 'taiata', sablon);
  assert.equal(r.foi.length, 2, 'valorile diferă: foile nu sunt identice');
  const [a, b] = r.foi;
  assert.deepEqual([a?.nume, a?.material, a?.latime, a?.inaltime, a?.grosime, a?.folosita, a?.identice], ['Foaia 1', 'Fag 10 mm', 300, 200, 10, 60, []]);
  assert.equal(b?.folosita, 40);
  assert.deepEqual(a?.piese.map((x) => [x.piesa, x.nume, x.cate, x.latime, x.inaltime, x.din, x.rotiri]), [['p', 'Plăcuță nume', 15, 80, 30, 'taiata', [0]]]);
  assert.deepEqual(a?.piese[0]?.valori, Array.from({ length: 15 }, (_, k) => `Nume ${k + 1}`));
  assert.deepEqual(b?.piese[0]?.valori.slice(0, 2), ['Nume 16', 'Nume 17']);
  // Operațiile foii: profilul exterior Ø6, 10 mm în 3 treceri (pasul 4), fără urechi.
  assert.deepEqual(a?.operatii, [{ tip: 'profil', latura: 'exterior', scula: { numar: 1, diametru: 6, unghi: null }, adancime: 10, treceri: 3, urechi: 0, despartire: false }]);
  assert.deepEqual(r.piese.map((x) => [x.piesa, x.cate, x.latime, x.inaltime, x.din, x.materiale, x.foi]), [['p', 25, 80, 30, 'taiata', ['Fag 10 mm'], [0, 1]]]);
  assert.deepEqual(r.materiale, [{ material: 'Fag 10 mm', latime: 300, inaltime: 200, grosime: 10, foi: 2 }]);
});

test('prototipul: 12 suporturi 150 × 100 pe 600 × 400 dau 9 + 3, folosite 56,25 % și 18,75 %; o foaie goală, 0 %', () => {
  const locuri = [290, 180, 70].flatMap((y) => [10, 170, 330].map((x) => ({ x, y })));
  const d = doc([piesaDr('s', 150, 100, 18, 'Suport')], [
    foaie('f1', [600, 400, 18], locuri.map((l, k) => inst(`s${k}`, 's', l.x, l.y)), 'MDF 18'),
    foaie('f2', [600, 400, 18], locuri.slice(0, 3).map((l, k) => inst(`t${k}`, 's', l.x, l.y)), 'MDF 18'),
    foaie('f3', [600, 400, 18], []),
  ]);
  const r = raportFoi(d, 'taiata', sablon);
  assert.deepEqual(r.foi.map((f) => [f.nume, f.folosita, f.piese.map((x) => x.cate)]), [['Foaia 1', 56.25, [9]], ['Foaia 2', 18.75, [3]], ['Foaia 3', 0, []]]);
  assert.deepEqual(r.foi[2]?.material, null);
  assert.deepEqual(r.materiale, [
    { material: 'MDF 18', latime: 600, inaltime: 400, grosime: 18, foi: 2 }, { material: null, latime: 600, inaltime: 400, grosime: 18, foi: 1 },
  ]);
});

test('mărimea: cutia conturului tăiat prin toată grosimea; fără el (sau la alegere), a desenului, marcată', () => {
  // q: rama 100 × 60 tăiată prin 18 mm, cu o linie gravată care iese 10 mm de fiecare parte; r: tăiată doar 5 mm din 18.
  const q: Piesa = {
    id: 'q',
    radacina: {
      tip: 'grup', id: 'q', matrice: ID, copii: [
        { tip: 'element', id: 'q1', forma: dr(100, 60), matrice: ID },
        { tip: 'element', id: 'q2', forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: -10, y: 30 }, s: { tip: 'L' } }, { p: { x: 110, y: 30 }, s: { tip: 'L' } }] }, matrice: ID },
      ],
    },
    operatii: [{ ...operatieImplicita('q1', dr(100, 60)), adancime: 18, pas: 6 }],
  };
  const d = doc([q, piesaDr('r', 50, 40, 5)], [foaie('f1', [600, 400, 18], [inst('a', 'q', 100, 100), inst('b', 'r', 300, 100)])]);
  const taiata = raportFoi(d, 'taiata', sablon).foi[0]?.piese.map((x) => [x.piesa, x.latime, x.inaltime, x.din]);
  assert.deepEqual(taiata, [['q', 100, 60, 'taiata'], ['r', 50, 40, 'desen']]);
  const desen = raportFoi(d, 'desen', sablon).foi[0]?.piese.map((x) => [x.piesa, x.latime, x.inaltime, x.din]);
  assert.deepEqual(desen, [['q', 120, 60, 'desen'], ['r', 50, 40, 'desen']]);
  // Fără nume, rândul spune felul primului element (aplicația îl traduce).
  assert.deepEqual(raportFoi(d, 'taiata', sablon).foi[0]?.piese.map((x) => [x.nume, x.forma]), [[null, 'dreptunghi'], [null, 'dreptunghi']]);
});

test('rotirea: mărimea rămâne în axele piesei, iar rândul spune rotirile instanțelor (0°, 90°)', () => {
  const d = doc([piesaDr('p', 80, 30, 10)], [foaie('f1', [300, 200, 10], [inst('a', 'p', 10, 10), inst('b', 'p', 150, 10, { rotire: 90 }), inst('c', 'p', 200, 100, { rotire: -270 })])]);
  const [rand] = raportFoi(d, 'taiata', sablon).foi[0]?.piese ?? [];
  assert.deepEqual([rand?.cate, rand?.latime, rand?.inaltime, rand?.rotiri], [3, 80, 30, [0, 90]]);
});

test('foile identice: copia legată și copia separată (alte id-uri, aceleași forme și operații) ies o dată, ×3; alt loc, nu', () => {
  const p2: Piesa = { ...piesaDr('p2', 80, 30, 10), radacina: { tip: 'element', id: 'p2', forma: dr(80, 30), matrice: ID }, operatii: [{ ...operatieImplicita('p2', dr(80, 30)), adancime: 10, pas: 4, scula: { numar: 1, nume: 'alt nume', diametru: 6 } }] };
  const d = doc([piesaDr('p', 80, 30, 10), p2], [
    foaie('f1', [300, 200, 10], [inst('a', 'p', 10, 10)]),
    foaie('f2', [300, 200, 10], [inst('b', 'p', 10, 10)]),
    foaie('f3', [300, 200, 10], [inst('c', 'p2', 10, 10)]),
    foaie('f4', [300, 200, 10], [inst('d', 'p', 20, 10)]),
    foaie('f5', [300, 200, 12], [inst('e', 'p', 10, 10)]),
  ]);
  const r = raportFoi(d, 'taiata', sablon);
  assert.deepEqual(r.foi.map((f) => [f.nume, f.identice]), [['Foaia 1', [1, 2]], ['Foaia 4', []], ['Foaia 5', []]]);
  // Totalurile numără fiecare foaie: piesa p de 3 ori tăiată (foile 1, 2, 4), p2 o dată. Pe foaia de 12 mm, profilul de
  // 10 mm nu taie prin toată grosimea: acolo mărimea e a desenului, cu rândul ei.
  assert.deepEqual(r.piese.map((x) => [x.piesa, x.cate, x.din, x.foi]), [['p', 3, 'taiata', [0, 1, 3]], ['p2', 1, 'taiata', [2]], ['p', 1, 'desen', [4]]]);
  assert.deepEqual(r.materiale.map((m) => [m.grosime, m.foi]), [[10, 4], [12, 1]]);
});

test('CSV-ul: BOM, `;` cu virgula zecimală (Excel în română) sau `,` cu punctul; ghilimelele; foile, totalurile, materialele', () => {
  schimbaLimba('ro');
  const locuri = [290, 180, 70].flatMap((y) => [10, 170, 330].map((x) => ({ x, y })));
  const d = doc([piesaDr('s', 150, 100, 18, 'Suport; mare')], [
    foaie('f1', [600, 400, 18], locuri.map((l, k) => inst(`s${k}`, 's', l.x, l.y)), 'MDF "alb" 18'),
    foaie('f2', [600, 400, 18], locuri.slice(0, 3).map((l, k) => inst(`t${k}`, 's', l.x, l.y, { campuri: { nr: `${k + 1},5` } })), 'MDF "alb" 18'),
  ]);
  const r = raportFoi(d, 'taiata', sablon);
  const BOM = String.fromCharCode(0xfeff), CRLF = String.fromCharCode(13, 10);
  const csv = csvRaport(r, ';');
  assert.ok(csv.startsWith(BOM), 'BOM-ul, ca Excel să citească UTF-8');
  const randuri = csv.slice(1).split(CRLF);
  assert.equal(randuri[0], 'Foaia;De câte ori;Materialul;Lățimea foii (mm);Înălțimea foii (mm);Grosimea (mm);Folosită (%);Piesa;Câte;Lățimea (mm);Înălțimea (mm);Mărimea;Rotirea;Valorile');
  assert.equal(randuri[1], 'Foaia 1;1;"MDF ""alb"" 18";600;400;18;56,25;"Suport; mare";9;150;100;tăiată;0°;');
  assert.equal(randuri[2], 'Foaia 2;1;"MDF ""alb"" 18";600;400;18;18,75;"Suport; mare";3;150;100;tăiată;0°;1,5, 2,5, 3,5');
  assert.equal(randuri[3], '');
  assert.equal(randuri[4], 'Totalurile pe piesă');
  assert.equal(randuri[5], 'Piesa;Câte;Lățimea (mm);Înălțimea (mm);Mărimea;Materialul;Pe foile');
  assert.equal(randuri[6], '"Suport; mare";12;150;100;tăiată;"MDF ""alb"" 18";1, 2');
  assert.equal(randuri[8], 'Foile, pe material');
  assert.equal(randuri[9], 'Materialul;Lățimea foii (mm);Înălțimea foii (mm);Grosimea (mm);Foi');
  assert.equal(randuri[10], '"MDF ""alb"" 18";600;400;18;2');
  assert.equal(randuri.at(-1), '', 'fiecare rând se termină cu CRLF');
  // Cu virgula: punctul zecimal, iar celulele cu virgulă primesc ghilimele.
  const cuVirgula = csvRaport(r, ',').slice(1).split(CRLF);
  assert.equal(cuVirgula[1], 'Foaia 1,1,"MDF ""alb"" 18",600,400,18,56.25,Suport; mare,9,150,100,tăiată,0°,');
  assert.equal(cuVirgula[2], 'Foaia 2,1,"MDF ""alb"" 18",600,400,18,18.75,Suport; mare,3,150,100,tăiată,0°,"1,5, 2,5, 3,5"');
});

test('CSV-ul în engleză: capetele traduse, mărimea „cut” / „drawing”; o foaie goală are rândul ei, fără piese', () => {
  schimbaLimba('en');
  try {
    const d = doc([piesaDr('r', 50, 40, 5)], [foaie('f1', [300, 200, 18], [inst('a', 'r', 10, 10)]), foaie('f2', [300, 200, 18], [])]);
    const randuri = csvRaport(raportFoi(d, 'taiata', (n) => `Sheet ${n}`), ',').slice(1).split(String.fromCharCode(13, 10));
    assert.equal(randuri[0], 'Sheet,Times,Material,Sheet width (mm),Sheet height (mm),Thickness (mm),Used (%),Part,Count,Width (mm),Height (mm),Size,Rotation,Values');
    // 50 × 40 din 300 × 200: 2 000 / 60 000 = 3,33 %.
    assert.equal(randuri[1], 'Sheet 1,1,,300,200,18,3.33,rectangle,1,50,40,drawing,0°,');
    assert.equal(randuri[2], 'Sheet 2,1,,300,200,18,0,,,,,,,');
  } finally {
    schimbaLimba('ro');
  }
});

test('operațiile și mărimea: interiorul și despărțirea nu decupează piesa; urechile, freza în V; materialul contează, ordinea nu', () => {
  const cerc = { tip: 'cerc', raza: 10 } as const;
  const gaura: Piesa = { id: 'g', radacina: { tip: 'element', id: 'g', forma: cerc, matrice: ID }, operatii: [{ ...operatieImplicita('g', cerc), adancime: 18, pas: 6 }] };
  const desp = piesaDr('d', 40, 20, 18);
  const despartita: Piesa = { ...desp, operatii: desp.operatii.map((o) => ({ ...o, despartire: true })) };
  const cuUrechi = piesaDr('u', 60, 40, 18);
  const urechi: Piesa = { ...cuUrechi, operatii: cuUrechi.operatii.map((o) => ({ ...o, urechi: { numar: 4, latime: 6, grosime: 2 }, scula: { numar: 2, nume: 'V', diametru: 12, forma: { tip: 'v', unghi: 90 } } })) };
  const d = doc([gaura, despartita, urechi], [
    foaie('f1', [300, 200, 18], [inst('a', 'g', 50, 50), inst('b', 'd', 100, 100), inst('c', 'u', 150, 20)], 'MDF'),
    foaie('f2', [300, 200, 18], [inst('e', 'u', 150, 20), inst('f', 'g', 50, 50), inst('h', 'd', 100, 100)], 'MDF'),
    foaie('f3', [300, 200, 18], [inst('i', 'g', 50, 50), inst('j', 'd', 100, 100), inst('k', 'u', 150, 20)], 'Fag'),
  ]);
  const r = raportFoi(d, 'taiata', sablon);
  // Gaura (profilul interior) și despărțirea foii nu decupează piesa: mărimea desenului; urechile au profilul exterior.
  assert.deepEqual(r.foi[0]?.piese.map((x) => [x.piesa, x.din]), [['g', 'desen'], ['d', 'desen'], ['u', 'taiata']]);
  assert.deepEqual(r.foi[0]?.operatii.map((o) => [o.tip, o.latura, o.despartire, o.urechi, o.scula.unghi]), [
    ['profil', 'interior', false, 0, null], ['profil', 'exterior', true, 0, null], ['profil', 'exterior', false, 4, 90],
  ]);
  // Foile 1 și 2 au aceleași piese în aceleași locuri, în altă ordine: identice; foaia 3, alt material: nu.
  assert.deepEqual(r.foi.map((f) => [f.nume, f.identice]), [['Foaia 1', [1]], ['Foaia 3', []]]);
});

test('CSV-ul: o valoare cu rând nou stă între ghilimele (rândul rămâne în celulă)', () => {
  schimbaLimba('ro');
  const d = doc([piesaDr('p', 80, 30, 10)], [foaie('f1', [300, 200, 10], [inst('a', 'p', 10, 10, { campuri: { nume: `Ana${String.fromCharCode(10)}Pop` } })])]);
  const randuri = csvRaport(raportFoi(d, 'taiata', sablon), ';').slice(1).split(String.fromCharCode(13, 10));
  assert.equal(randuri[1], `Foaia 1;1;;300;200;10;4;dreptunghi;1;80;30;tăiată;0°;"Ana${String.fromCharCode(10)}Pop"`);
});
