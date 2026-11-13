/**
 * Piesele puse de mai multe ori prin registru (ADR 0210 §2, felia 11.2↑), cu calculul încărcat: «Încă…», «+1», «Desprinde»,
 * „Duplică foaia cu aceleași piese” și gruparea cu surori („Doar aceasta”, „În toate cele N”, întrebarea), fiecare un pas de
 * anulare, cu refuzurile lor; alegerea ținută a grupării. Valorile pe hârtie: dreptunghiul implicit (100 × 60, colțul în
 * 20, 20, profil exterior cu freza de 6, deci distanța dintre copii 6) pe foaia de 300 × 200, cu marginea 10: pe rândul lui
 * încape una, la x = 120 + 6 = 126 (a doua ar ieși la 232 + 100 > 290); pe o foaie nouă, de sus, rândurile y = 200 − 10 − 60
 * = 130 și 130 − 66 = 64, cu x = 10 și 10 + 106 = 116.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, type Document, type Instanta } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeInstanta, matriceInstanta } from '../../src/model/lume.ts';
import { cutieInstanta, distantaCopii, folosiri } from '../../src/model/pieseLegate.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { alegereTinuta, CHEIE_GRUPARE, tineAlegerea } from '../../src/ui/grupareSurori.ts';

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
const motiv = (b: ContextDocument, id: string, extra: Partial<ContextDocument> = {}): unknown => {
  const s = stare(R, id, { ...b, ...extra });
  return s.ok ? true : s.motiv;
};
const seRedeschide = (d: Document): void => { assert.ok(incarca(JSON.parse(JSON.stringify(d))).ok, 'ce scriu acțiunile se redeschide'); };
/** Foile și piesele, fără revizie: ce trebuie să dea anularea înapoi. */
const continut = (d: Document): string => jsonCanonic({ piese: d.piese, foi: d.foi });
/** Locurile instanțelor fiecărei foi, ca [x, y]. */
const locuri = (d: Document): number[][][] => d.foi.map((f) => f.instante.map((i) => [i.x, i.y]));
const instanta = (d: Document, id: string): Instanta => {
  const i = d.foi.flatMap((f) => f.instante).find((x) => x.id === id);
  if (!i) throw new Error(`fără instanța ${id}`);
  return i;
};
const cutie = (d: Document, id: string): number[] => {
  const i = instanta(d, id);
  const p = d.piese.find((x) => x.id === i.piesa);
  const c = p ? cutieInstanta(p, i) : null;
  if (!c) throw new Error(`fără cutie pentru ${id}`);
  // + 0: −0 (din rotunjire) e 0.
  return [c.minX, c.minY, c.maxX, c.maxY].map((v) => Math.round(v * 1e6) / 1e6 + 0);
};

/** Dreptunghiul implicit, ales, singur pe foaie. */
function unDreptunghi(): Banc & { readonly ales: string } {
  const b = banc();
  ok(b, 'document.adauga-dreptunghi');
  const [ales] = b.selectie();
  if (!ales) throw new Error('fără selecție');
  return Object.assign(b, { ales });
}

test('piesa.inca: până la totalul cerut, instanțe ale aceleiași piese după cea aleasă, cu vărsarea pe o foaie nouă; un pas; refuzurile', () => {
  const b = unDreptunghi();
  const inainte = b.h().doc;
  const p = instanta(inainte, b.ales).piesa;
  const piesa = inainte.piese[0];
  assert.ok(piesa);
  assert.equal(distantaCopii(piesa), 6, 'profilul exterior cu freza de 6');
  const trecut = b.h().trecut.length;
  ok(b, 'piesa.inca', { cateInTotal: () => 4 });
  const d = b.h().doc;
  assert.equal(folosiri(d).get(p), 4);
  assert.equal(d.piese.length, 1, 'nicio piesă nouă');
  assert.deepEqual(locuri(d), [[[20, 20], [126, 20]], [[10, 130], [116, 130]]]);
  assert.deepEqual(d.foi[1]?.stoc, inainte.foi[0]?.stoc, 'foaia nouă e ca foaia piesei');
  assert.equal(b.h().trecut.length, trecut + 1, 'un pas de anulare');
  assert.deepEqual(b.selectie(), [b.ales], 'selecția rămâne');
  assert.equal(b.activa(), inainte.foi[0]?.id, 'foaia activă rămâne');
  seRedeschide(d);
  ok(b, 'istoric.anuleaza');
  assert.equal(continut(b.h().doc), continut(inainte));
  // Totalul: mai mare decât acum, întreg, cel mult 1 000.
  for (const n of [1, 0, -3, 2.5, 1001, Number.NaN]) assert.equal(motiv(b, 'piesa.inca', { cateInTotal: () => n }), 'motiv.inca-total', String(n));
  assert.equal(motiv(b, 'piesa.inca', { cateInTotal: () => 1000 }), true);
  assert.equal(motiv(b, 'piesa.inca'), 'motiv.nimic-ales', 'fără total');
  b.selecteaza([]);
  assert.equal(motiv(b, 'piesa.inca', { cateInTotal: () => 4 }), 'motiv.nicio-selectie');
  ok(b, 'document.adauga-cerc');
  b.selecteaza([b.ales, ...b.selectie()]);
  assert.equal(motiv(b, 'piesa.inca', { cateInTotal: () => 4 }), 'motiv.o-singura-piesa');
  const citire = banc(b.h().doc, true);
  citire.selecteaza([b.ales]);
  assert.equal(motiv(citire, 'piesa.inca', { cateInTotal: () => 4 }), 'motiv.doar-citire');
  // O piesă care nu încape între margini (290 > 300 − 2 · 10): refuz, fără foi noi fără sfârșit.
  b.selecteaza([b.ales]);
  ok(b, 'document.forma', { formaEditata: () => ({ tip: 'dreptunghi', latime: 290, inaltime: 60, razaColt: 0 }) });
  assert.equal(motiv(b, 'piesa.inca', { cateInTotal: () => 2 }), 'motiv.inca-prea-mare');
});

test('piesa.plus-unu: încă una după ultima instanță a piesei (în ordinea proiectului), oricare ar fi cea aleasă', () => {
  const b = unDreptunghi();
  ok(b, 'piesa.inca', { cateInTotal: () => 4 });
  const trecut = b.h().trecut.length;
  ok(b, 'piesa.plus-unu');
  // Ultima e pe foaia nouă, la 116, 130: rândul ei e plin, deci rândul de dedesubt, de la margine (130 − 66 = 64).
  assert.deepEqual(locuri(b.h().doc)[1], [[10, 130], [116, 130], [10, 64]]);
  assert.equal(b.h().trecut.length, trecut + 1);
  assert.equal(folosiri(b.h().doc).get(instanta(b.h().doc, b.ales).piesa), 5);
  b.selecteaza([]);
  assert.equal(motiv(b, 'piesa.plus-unu'), 'motiv.nicio-selectie');
});

test('piesa.desprinde: instanța aleasă primește o piesă a ei, în același loc; ultima păstrează piesa; un pas; fără surori, refuz', () => {
  const b = unDreptunghi();
  assert.equal(motiv(b, 'piesa.desprinde'), 'motiv.fara-surori');
  ok(b, 'piesa.plus-unu');
  const inainte = b.h().doc;
  const sora = inainte.foi[0]?.instante[1];
  assert.ok(sora);
  b.selecteaza([sora.id]);
  const trecut = b.h().trecut.length;
  ok(b, 'piesa.desprinde');
  const d = b.h().doc;
  const noua = instanta(d, sora.id);
  assert.notEqual(noua.piesa, instanta(d, b.ales).piesa, 'o piesă a ei');
  assert.deepEqual([noua.x, noua.y, noua.rotire], [sora.x, sora.y, sora.rotire], 'în același loc');
  assert.equal(d.piese.length, 2);
  assert.equal(b.h().trecut.length, trecut + 1);
  assert.deepEqual(b.selectie(), [sora.id], 'selecția rămâne');
  seRedeschide(d);
  // Acum amândouă sunt singure: nimic de desprins.
  assert.equal(motiv(b, 'piesa.desprinde'), 'motiv.fara-surori');
  ok(b, 'istoric.anuleaza');
  assert.equal(continut(b.h().doc), continut(inainte));
  b.selecteaza([]);
  assert.equal(motiv(b, 'piesa.desprinde'), 'motiv.nicio-selectie');
});

test('foaie.duplica-legat: o foaie nouă după cea din meniu, cu aceleași piese (instanțe noi, aceleași locuri), activă; forma se schimbă pe ambele', () => {
  const b = unDreptunghi();
  ok(b, 'document.adauga-cerc');
  const inainte = b.h().doc;
  const f1 = inainte.foi[0];
  assert.ok(f1);
  const trecut = b.h().trecut.length;
  ok(b, 'foaie.duplica-legat', { foaieAleasa: () => f1.id });
  const d = b.h().doc;
  const f2 = d.foi[1];
  assert.ok(f2);
  assert.equal(d.foi.length, 2);
  assert.deepEqual(f2.instante.map((i) => [i.piesa, i.x, i.y, i.rotire]), f1.instante.map((i) => [i.piesa, i.x, i.y, i.rotire]));
  assert.equal(new Set([...f1.instante, ...f2.instante].map((i) => i.id)).size, 4, 'id-uri noi');
  assert.equal(d.piese.length, inainte.piese.length, 'nicio piesă nouă');
  assert.deepEqual(f2.stoc, f1.stoc);
  assert.equal(f2.nume, undefined, 'numele nu se copiază');
  assert.equal(b.activa(), f2.id, 'foaia nouă devine activă');
  assert.deepEqual(b.selectie(), []);
  assert.equal(b.h().trecut.length, trecut + 1);
  seRedeschide(d);
  // Forma dreptunghiului, schimbată de pe foaia nouă, se vede și pe prima.
  const copie = f2.instante[0];
  assert.ok(copie);
  b.selecteaza([copie.id]);
  ok(b, 'document.forma', { formaEditata: () => ({ tip: 'dreptunghi', latime: 80, inaltime: 40, razaColt: 0 }) });
  assert.deepEqual(cutie(b.h().doc, b.ales), [20, 20, 100, 60]);
  ok(b, 'istoric.anuleaza');
  ok(b, 'istoric.anuleaza');
  assert.equal(continut(b.h().doc), continut(inainte));
});

/** Dreptunghiul de două ori (20, 20 și 126, 20) și cercul de rază 15 mutat în 170, 110, în afara lor. */
function grupareCuSurori(): Banc & { readonly ales: string; readonly sora: string; readonly cerc: string } {
  const b = unDreptunghi();
  ok(b, 'piesa.plus-unu');
  const sora = b.h().doc.foi[0]?.instante[1]?.id;
  ok(b, 'document.adauga-cerc');
  ok(b, 'document.muta-selectia', { deplasare: () => ({ dx: 100, dy: 60 }) });
  const [cerc] = b.selectie();
  if (!sora || !cerc) throw new Error('fără instanțe');
  b.selecteaza([b.ales, cerc]);
  return Object.assign(b, { sora, cerc });
}

test('document.grupeaza cu surori: fără alegere, întrebarea; „În toate cele N” pune cercul în piesă, deci lângă fiecare instanță', () => {
  const b = grupareCuSurori();
  assert.equal(motiv(b, 'document.grupeaza'), 'motiv.grupare-intrebare');
  assert.deepEqual(cutie(b.h().doc, b.sora), [126, 20, 226, 80]);
  const inainte = b.h().doc;
  const trecut = b.h().trecut.length;
  ok(b, 'document.grupeaza', { grupareSurori: () => 'toate' });
  const d = b.h().doc;
  const gazda = instanta(d, b.ales), sora = instanta(d, b.sora);
  assert.equal(gazda.piesa, sora.piesa, 'aceeași piesă');
  assert.ok(!d.foi[0]?.instante.some((i) => i.id === b.cerc), 'cercul a intrat în piesă');
  // Gazda: dreptunghiul [20, 120] × [20, 80] și cercul [155, 185] × [95, 125], la locurile lor; sora, mutată cu 106 pe x.
  assert.deepEqual(cutie(d, b.ales), [20, 20, 185, 125]);
  assert.deepEqual(cutie(d, b.sora), [126, 20, 291, 125]);
  const piesa = d.piese.find((p) => p.id === sora.piesa);
  assert.ok(piesa);
  assert.equal(elementeInstanta(piesa.radacina, sora, matriceInstanta(sora)).length, 2);
  assert.equal(piesa.operatii.length, 2, 'operația cercului vine cu el');
  assert.deepEqual(b.selectie(), [b.ales], 'aleasă e gazda');
  assert.equal(b.h().trecut.length, trecut + 1);
  seRedeschide(d);
  ok(b, 'istoric.anuleaza');
  assert.equal(continut(b.h().doc), continut(inainte));
});

test('document.grupeaza cu surori, „Doar aceasta”: o desprinde, apoi grupează; sora rămâne cum era; un pas', () => {
  const b = grupareCuSurori();
  const inainte = b.h().doc;
  const piesaSorei = inainte.piese.find((p) => p.id === instanta(inainte, b.sora).piesa);
  const trecut = b.h().trecut.length;
  ok(b, 'document.grupeaza', { grupareSurori: () => 'doar' });
  const d = b.h().doc;
  // Gruparea obișnuită: grupul e o instanță nouă, aleasă.
  const [grup] = b.selectie();
  assert.ok(grup && grup !== b.ales);
  assert.ok(!d.foi[0]?.instante.some((i) => i.id === b.ales || i.id === b.cerc));
  assert.notEqual(instanta(d, grup).piesa, instanta(d, b.sora).piesa);
  assert.equal(jsonCanonic(d.piese.find((p) => p.id === instanta(d, b.sora).piesa)), jsonCanonic(piesaSorei), 'sora, neatinsă');
  assert.deepEqual(cutie(d, b.sora), [126, 20, 226, 80]);
  assert.deepEqual(cutie(d, grup), [20, 20, 185, 125]);
  assert.equal(b.h().trecut.length, trecut + 1);
  seRedeschide(d);
  ok(b, 'istoric.anuleaza');
  assert.equal(continut(b.h().doc), continut(inainte));
});

test('document.grupeaza cu surori, „În toate cele N”, cu gazda rotită: cercul rămâne pe loc la ea și apare rotit la fel lângă sora ei', () => {
  const b = grupareCuSurori();
  // Dreptunghiul ales, rotit cu 90° în jurul centrului lui (70, 50): colțul (20, 20) ajunge în (100, 0), cutia [40, 100] × [0, 100].
  b.selecteaza([b.ales]);
  ok(b, 'document.transforma', { transformare: () => ({ fel: 'rotire', unghi: 90, centru: { x: 70, y: 50 } }) });
  const g = instanta(b.h().doc, b.ales);
  assert.deepEqual([g.x, g.y, g.rotire].map((v) => Math.round(v * 1e6) / 1e6 + 0), [100, 0, 90]);
  b.selecteaza([b.ales, b.cerc]);
  ok(b, 'document.grupeaza', { grupareSurori: () => 'toate' });
  const d = b.h().doc;
  // Gazda: cercul (170, 110) rămâne unde era. În piesă, el stă la R(−90)·(170 − 100, 110 − 0) = (110, −70); lângă sora
  // nerotită din (126, 20), deci în (236, −50), cu cutia [221, 251] × [−65, −35].
  assert.deepEqual(cutie(d, b.ales), [40, 0, 185, 125]);
  assert.deepEqual(cutie(d, b.sora), [126, -65, 251, 80]);
  seRedeschide(d);
});

test('alegerea grupării ținută în browser: doar valorile cunoscute; o stocare care aruncă înseamnă „întreabă”', () => {
  const m = new Map<string, string>();
  const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
  assert.equal(alegereTinuta(s), null);
  tineAlegerea('toate', s);
  assert.equal(m.get(CHEIE_GRUPARE), 'toate');
  assert.equal(alegereTinuta(s), 'toate');
  tineAlegerea('doar', s);
  assert.equal(alegereTinuta(s), 'doar');
  m.set(CHEIE_GRUPARE, 'altceva');
  assert.equal(alegereTinuta(s), null);
  const rea = { getItem: (): string | null => { throw new Error('privat'); }, setItem: (): void => { throw new Error('plin'); } };
  assert.equal(alegereTinuta(rea), null);
  assert.doesNotThrow(() => { tineAlegerea('doar', rea); });
  assert.equal(alegereTinuta(null), null);
});
