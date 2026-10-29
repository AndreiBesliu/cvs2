import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { partiDegrupare } from '../../src/model/degrupare.ts';
import { blocText } from '../../src/model/blocText.ts';
import { documentNou, type Document, type ElementNod, type GrupNod, type Nod, type Operatie, type Piesa } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { transforma } from '../../src/model/transformare.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { piesaText } from '../../src/text/piesaText.ts';

/**
 * Piesa unui text (ADR 0105 §4): câte un grup pe literă, contururile închise, operațiile din imbricare, blocul pe rădăcină
 * legat de contururi prin amprentă; ușa documentului o primește (blocul e un câmp păstrat, nu o schemă nouă), iar după
 * salvare blocul rămâne valid. Scalarea uniformă îl crește, cea neuniformă și o editare a contururilor îl fac vectori,
 * oglindirea îl păstrează, degruparea dă literele ca piese obișnuite. La editare, operațiile se mută pe contururile noi de
 * același fel.
 */

const RAD = new URL('../../', import.meta.url);
const r = citesteFont(new Uint8Array(readFileSync(new URL('public/fonturi/roboto.ttf', RAD))));
if (!r.ok) throw new Error(r.cod);
const font: Font = r.font;
const PARAM: ParametriText = { continut: 'OB a', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' };

function piesa(p: ParametriText = PARAM, vechi?: Piesa): Piesa {
  const rez = piesaText(aseazaText(font, p), { ...p, font: 'roboto' }, 'p1', undefined, vechi);
  if (!rez.ok) throw new Error(rez.motiv);
  return rez.piesa;
}
const docCu = (p: Piesa, x = 50, y = 50, rotire = 0): Document => {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese: [p], foi: [{ ...d.foi[0]!, instante: [{ id: 'i1', piesa: p.id, x, y, rotire }] }] };
};
const grup = (n: Nod): GrupNod => {
  assert.equal(n.tip, 'grup');
  return n as GrupNod;
};

test('piesa: un grup pe literă (cu golurile ei), contururile închise, profilul pe exterior și pe interior din imbricare', () => {
  const p = piesa();
  const rad = grup(p.radacina);
  // „OB a”: spațiul n-are contur; O are 2 contururi, B 3, a 2.
  assert.deepEqual(rad.copii.map((g) => [g.nume, grup(g).copii.length]), [['O', 2], ['B', 3], ['a', 2]]);
  assert.equal(p.nume, 'OB a');
  const ids = rad.copii.flatMap((g) => grup(g).copii.map((e) => e.id));
  assert.deepEqual(ids, ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']);
  for (const g of rad.copii) for (const e of grup(g).copii) assert.ok((e as ElementNod).forma.tip === 'cale' && (e as ElementNod).forma['inchis'] === true);
  assert.deepEqual(p.operatii.map((o) => [o.id, o.latura, o.noduri.length]), [['exterior', 'exterior', 3], ['interior', 'interior', 4]]);
  const b = blocText(rad);
  assert.ok(b);
  assert.deepEqual({ ...b, amprenta: '' }, { ...PARAM, font: 'roboto', amprenta: '' });
});

test('ușa documentului primește piesa cu blocul (câmp păstrat), iar după salvare blocul e tot valid', () => {
  const d = docCu(piesa());
  const u = incarca(JSON.parse(JSON.stringify(d)));
  assert.ok(u.ok, JSON.stringify(u));
  assert.ok(blocText(u.doc.piese[0]!.radacina));
});

test('blocul e legat de contururi: o schimbare a unui vârf îl face vectori; un bloc stricat nu e bloc', () => {
  const p = piesa();
  const rad = grup(p.radacina);
  const g0 = grup(rad.copii[0]!);
  const e0 = g0.copii[0] as ElementNod;
  assert.equal(e0.forma.tip, 'cale');
  const varfuri = (e0.forma as Extract<ElementNod['forma'], { tip: 'cale' }>).varfuri;
  const mutat = { ...e0, forma: { ...e0.forma, varfuri: [{ ...varfuri[0]!, p: { x: varfuri[0]!.p.x + 0.001, y: varfuri[0]!.p.y } }, ...varfuri.slice(1)] } };
  const editat: GrupNod = { ...rad, copii: [{ ...g0, copii: [mutat, ...g0.copii.slice(1)] }, ...rad.copii.slice(1)] };
  assert.equal(blocText(editat), null);
  assert.equal(blocText({ ...rad, text: { ...(rad['text'] as object), inaltime: -1 } }), null);
  assert.equal(blocText({ ...rad, text: 'LEMN' }), null);
});

test('scalarea uniformă crește blocul (înălțimea, spațierea, amprenta nouă); cea neuniformă îl scoate; oglindirea îl păstrează', () => {
  const p = piesa({ ...PARAM, spatiere: 0.5 });
  const d = docCu(p);
  const s = transforma(d, 0, ['i1'], { fel: 'scalare', sx: 1.5, sy: 1.5, ancora: { x: 0, y: 0 } });
  assert.ok(s.ok);
  const b = blocText(s.piese[0]!.radacina);
  assert.ok(b);
  assert.deepEqual([b.inaltime, b.spatiere], [30, 0.75]);
  const n = transforma(d, 0, ['i1'], { fel: 'scalare', sx: 1.5, sy: 1, ancora: { x: 0, y: 0 } });
  assert.ok(n.ok);
  assert.equal(Object.hasOwn(n.piese[0]!.radacina, 'text'), false);
  const o = transforma(d, 0, ['i1'], { fel: 'oglindire', directie: 'orizontal', centru: { x: 50, y: 50 } });
  assert.ok(o.ok);
  assert.ok(blocText(o.piese[0]!.radacina));
});

test('degruparea dă literele ca piese obișnuite, fără bloc, fiecare cu golurile ei', () => {
  const parti = partiDegrupare(piesa());
  assert.ok(Array.isArray(parti));
  assert.equal(parti.length, 3);
  for (const x of parti) assert.equal(Object.hasOwn(x.radacina, 'text'), false);
  assert.deepEqual(parti.map((x) => grup(x.radacina).copii.length), [2, 3, 2]);
});

test('editarea: operațiile vechi trec pe contururile noi de același fel; matricea rădăcinii (oglinda) rămâne; găurirea se scoate', () => {
  const vechi = piesa();
  const rad = grup(vechi.radacina);
  const sablon = vechi.operatii[0]!;
  const vcarve: Operatie = { ...sablon, id: 'v', tip: 'vcarve', latura: 'interior', noduri: [...rad.copii.flatMap((g) => grup(g).copii.map((e) => e.id))] };
  const gaurire: Operatie = { ...sablon, id: 'g', tip: 'gaurire', latura: 'interior', noduri: ['c1'] };
  const oglindit: Piesa = { ...vechi, radacina: { ...rad, matrice: { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [{ ...sablon, adancime: 5 }, vechi.operatii[1]!, vcarve, gaurire] };
  // „OBO”: 3 contururi de afară, 4 goluri.
  const nou = piesa({ ...PARAM, continut: 'OBO' }, oglindit);
  assert.deepEqual(grup(nou.radacina).matrice, { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  assert.deepEqual(nou.operatii.map((o) => [o.id, o.tip, o.noduri.length]), [['exterior', 'profil', 3], ['interior', 'profil', 4], ['v', 'vcarve', 7]]);
  assert.equal(nou.operatii[0]!.adancime, 5);
  assert.ok(blocText(nou.radacina));
  // „LT” n-are goluri: operația pe interior n-are pe ce sta și se scoate; celelalte rămân.
  const faraGoluri = piesa({ ...PARAM, continut: 'LT' }, oglindit);
  assert.deepEqual(faraGoluri.operatii.map((o) => [o.id, o.noduri.length]), [['exterior', 2], ['v', 2]]);
});

test('un text fără contururi (doar spații, sau caractere pe care fontul nu le are) nu face o piesă', () => {
  assert.deepEqual(piesaText(aseazaText(font, { ...PARAM, continut: '   ' }), { ...PARAM, continut: '   ', font: 'roboto' }, 'p1'), { ok: false, motiv: 'gol' });
  assert.deepEqual(piesaText(aseazaText(font, { ...PARAM, continut: '☃' }), { ...PARAM, continut: '☃', font: 'roboto' }, 'p1'), { ok: false, motiv: 'gol' });
});
