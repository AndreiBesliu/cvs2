/**
 * Tăierea cu o linie dreaptă (ADR 0180, felia 10.3↑), judecată de oracolul independent (`test/oracles/taiere.ts`) pe un corpus
 * din sămânță: dreptunghiuri (și cu colțuri rotunjite), cercuri, poligoane, forme din cubice, căi deschise (linii și cubice),
 * contururi cu arce, inele (o piesă cu o gaură), la locuri și rotiri oarecare, tăiate cu linii verticale și orizontale, cu și
 * fără închidere. Fiecare tăiere: acoperirea, nimic inventat, părțile de o parte și de alta, aria fiecărei părți (cu închidere),
 * documentul de după trecut prin ușă; un „nimic de tăiat” e verificat de oracol (forma chiar nu trece linia).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, Operatie } from '../../src/model/document.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie } from '../../src/model/taiere.ts';
import { esantioane, formeInstanta, judecaTaierea } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, GENERATORI, inel, intre, NUME, stoc, type Gen } from './ajutor-taiere.ts';

test('corpusul din sămânță: fiecare tăiere trece de oracol (acoperirea, nimic inventat, părțile, aria), iar documentul, de ușă', () => {
  const r = aleator(0x10_3);
  let taieri = 0, inchise = 0, nimic = 0;
  for (let caz = 0; caz < 160; caz++) {
    const fel = r() < 0.15 ? 'inel' : (NUME[Math.floor(r() * NUME.length)] as string);
    const id = `s${caz}`;
    const x = intre(r, 150, 850), y = intre(r, 150, 850);
    const baza = docDin(stoc, { id, forma: fel === 'inel' ? { tip: 'cerc', raza: 1 } : (GENERATORI[fel] as Gen)(r), matrice: { ...ID, e: x, f: y } });
    let d: Document = baza;
    const foaie = baza.foi[0];
    assert.ok(foaie);
    const rotire = [0, 90, 180, 270][Math.floor(r() * 4)] as number;
    d = { ...d, foi: [{ ...foaie, instante: foaie.instante.map((i) => ({ ...i, rotire })) }] };
    if (fel === 'inel') {
      const p0 = d.piese[0];
      assert.ok(p0);
      d = { ...d, piese: [{ ...p0, ...inel(r, id, (p0.operatii[0] as Operatie).scula) }] };
    }
    const inainte = formeInstanta(d, id);
    const xs = inainte.flatMap((f) => esantioane(f, 8));
    const axa: 'x' | 'y' = r() < 0.5 ? 'x' : 'y';
    const lo = Math.min(...xs.map((q) => (axa === 'x' ? q.x : q.y))), hi = Math.max(...xs.map((q) => (axa === 'x' ? q.x : q.y)));
    // De cele mai multe ori prin formă; uneori pe lângă ea (atunci trebuie să nu se taie nimic).
    const v = r() < 0.9 ? intre(r, lo + 0.05 * (hi - lo), hi - 0.05 * (hi - lo)) : hi + intre(r, 1, 20);
    const inchide = r() < 0.6;
    const rez = taie(d, { cutit: axa === 'x' ? { fel: 'x', x: v } : { fel: 'y', y: v }, alese: [id], inchide });
    const mesaj = `cazul ${caz} (${fel}, rotire ${rotire}, ${axa} = ${v}, ${inchide ? 'cu' : 'fără'} închidere)`;
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      const fete = inainte.flatMap((f) => esantioane(f, 32)).map((q) => (axa === 'x' ? q.x : q.y) - v);
      assert.ok(!(Math.min(...fete) < -1e-7 && Math.max(...fete) > 1e-7), `${mesaj}: forma trece linia, dar n-a fost tăiată`);
      nimic++;
      continue;
    }
    const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
    assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), `${mesaj}: documentul de după trece de ușă`);
    const parti = rez.ids.map((pid) => formeInstanta(dupa, pid));
    const rau = judecaTaierea({ inainte, parti, axa, v, inchide });
    assert.deepEqual(rau, [], mesaj);
    taieri++;
    if (inchide) inchise++;
  }
  assert.ok(taieri >= 120, `tăieri judecate: ${taieri}`);
  assert.ok(inchise >= 60, `cu închidere: ${inchise}`);
  assert.ok(nimic >= 5, `nimic de tăiat, verificat: ${nimic}`);
});

test('martorul oracolului: o tăiere stricată (o bucată lipsă, o parte mutată peste linie) e prinsă', () => {
  const d = docDin(stoc, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } });
  const rez = taie(d, { cutit: { fel: 'x', x: 150 }, alese: ['a'], inchide: true });
  if (!rez.ok) assert.fail(rez.motiv);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
  const inainte = formeInstanta(d, 'a');
  const [a, b] = rez.ids.map((pid) => formeInstanta(dupa, pid));
  assert.deepEqual(judecaTaierea({ inainte, parti: [a ?? [], b ?? []], axa: 'x', v: 150, inchide: true }), []);
  assert.notDeepEqual(judecaTaierea({ inainte, parti: [a ?? [], []], axa: 'x', v: 150, inchide: true }), [], 'o parte lipsă');
  assert.notDeepEqual(judecaTaierea({ inainte, parti: [b ?? [], a ?? []], axa: 'x', v: 150, inchide: true }), [], 'părțile inversate');
  assert.notDeepEqual(judecaTaierea({ inainte, parti: [a ?? [], b ?? []], axa: 'x', v: 140, inchide: true }), [], 'altă linie');
});
