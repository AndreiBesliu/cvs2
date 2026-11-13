/**
 * Decuparea la ultima formă aleasă (ADR 0180 §4; felia 10.3↑c), judecată de oracolul independent (`test/oracles/taiere.ts`,
 * `judecaDecuparea`) pe un corpus din sămânță: formele corpusurilor tăierii (dreptunghiuri, cercuri, poligoane, cubice, arce,
 * căi deschise, inele), la rotiri oarecare, decupate la un poligon convex sau la un cerc, păstrând înăuntru sau în afară, cu
 * și fără închidere. Ce rămâne e de partea păstrată și o acoperă, nimic nu e inventat, iar cu închidere aria e a regiunii
 * tăiate de graniță; o formă fără nimic de partea păstrată pleacă; un „nimic de decupat” e verificat și el.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { FormaDoc, Instanta, Piesa, VarfDoc } from '../../src/model/document.ts';
import { executa, istoricNou, type Comanda } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie } from '../../src/model/taiere.ts';
import { comenziStergere } from '../../src/ui/actiuniDocument.ts';
import { esantioane, formeInstanta, judecaDecuparea } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';
import { aleator, document, formaCorpus, intre, stoc } from './ajutor-taiere.ts';

type P = { readonly x: number; readonly y: number };
const L = { tip: 'L' } as const;

test('decuparea, pe corpusul din sămânță: ce rămâne e de partea păstrată și o acoperă, cu aria tăiată de graniță', () => {
  const r = aleator(0x10_3d);
  let decupate = 0, sterse = 0, nimic = 0, inchise = 0, inauntru = 0;
  for (let caz = 0; caz < 100; caz++) {
    const id = `s${caz}`;
    const forma = formaCorpus(r, id, intre(r, 250, 750), intre(r, 250, 750));
    const inainte = formeInstanta(document([forma]), id);
    const q = inainte.flatMap((f) => esantioane(f, 8));
    const minX = Math.min(...q.map((p) => p.x)), maxX = Math.max(...q.map((p) => p.x)), minY = Math.min(...q.map((p) => p.y)), maxY = Math.max(...q.map((p) => p.y));
    const kx = (minX + maxX) / 2 + intre(r, -0.6, 0.6) * (maxX - minX), ky = (minY + maxY) / 2 + intre(r, -0.6, 0.6) * (maxY - minY);
    let granita: FormaDoc;
    let convex: P[];
    let cerc: { readonly c: P; readonly r: number } | null = null;
    if (r() < 0.7) {
      const n = 3 + Math.floor(r() * 6), R = intre(r, 20, 70), u0 = intre(r, 0, 2 * Math.PI);
      const v = Array.from({ length: n }, (_, k) => ({ x: R * Math.cos(u0 + (2 * Math.PI * k) / n), y: R * Math.sin(u0 + (2 * Math.PI * k) / n) }));
      granita = { tip: 'cale', inchis: true, varfuri: v.map((p): VarfDoc => ({ p, s: L })) };
      convex = v.map((p) => ({ x: p.x + kx, y: p.y + ky }));
    } else {
      const R = intre(r, 15, 60);
      granita = { tip: 'cerc', raza: R };
      convex = Array.from({ length: 1440 }, (_, k) => ({ x: kx + R * Math.cos((2 * Math.PI * k) / 1440), y: ky + R * Math.sin((2 * Math.PI * k) / 1440) }));
      cerc = { c: { x: kx, y: ky }, r: R };
    }
    const k = docDin(stoc, { id: 'k', forma: granita, matrice: { ...ID, e: kx, f: ky } });
    const d = document([forma, { piesa: k.piese[0] as Piesa, instanta: k.foi[0]?.instante[0] as Instanta }]);
    const pastreazaInauntru = r() < 0.5, inchide = r() < 0.6;
    const rez = taie(d, { cutit: { fel: 'decupare', id: 'k', pastreaza: pastreazaInauntru ? 'inauntru' : 'afara', trec: 'taie' }, alese: [id, 'k'], inchide });
    const mesaj = `cazul ${caz} (${cerc ? 'cerc' : 'convex'}, ${pastreazaInauntru ? 'înăuntru' : 'în afară'}, ${inchide ? 'cu' : 'fără'} închidere)`;
    const granitaLume = formeInstanta(d, 'k');
    if (!rez.ok) {
      assert.equal(rez.motiv, 'nimic-taiat', `${mesaj}: refuzat cu ${rez.motiv}`);
      // Nimic de decupat: niciun punct al formei, departe de graniță, nu e de partea nepăstrată.
      assert.deepEqual(judecaDecuparea({ inainte, granita: granitaLume, dupa: inainte, inauntru: pastreazaInauntru, inchide: false, convex, cerc }), [], mesaj);
      nimic++;
      continue;
    }
    const foaie = d.foi[0];
    assert.ok(foaie);
    const comenzi: Comanda[] = [...comenziStergere(d, new Set(rez.sterse), foaie.id).comenzi];
    if (rez.degrupate.length > 0) comenzi.push({ tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate });
    const dupa = executa(istoricNou(d), { tip: 'lot', comenzi }).doc;
    assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), `${mesaj}: documentul de după trece de ușă`);
    assert.deepEqual(formeInstanta(dupa, 'k'), granitaLume, `${mesaj}: granița rămâne`);
    const plecata = rez.sterse.includes(id);
    const ramase = plecata ? [] : formeInstanta(dupa, rez.ids[0] ?? id);
    assert.deepEqual(judecaDecuparea({ inainte, granita: granitaLume, dupa: ramase, inauntru: pastreazaInauntru, inchide, convex, cerc }), [], mesaj);
    if (plecata) sterse++; else decupate++;
    if (inchide) inchise++;
    if (pastreazaInauntru) inauntru++;
  }
  assert.ok(decupate >= 50, `decupate: ${decupate}`);
  assert.ok(sterse >= 3, `șterse (nimic de partea păstrată): ${sterse}`);
  assert.ok(nimic >= 3, `nimic de decupat: ${nimic}`);
  assert.ok(inchise >= 30 && inauntru >= 25, `cu închidere: ${inchise}; înăuntru: ${inauntru}`);
});

test('martorul oracolului decupării: o parte nepăstrată lăsată, o bucată lipsă, aria greșită sunt prinse', () => {
  const d = docDin(stoc, { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } },
    { id: 'k', forma: { tip: 'cale', inchis: true, varfuri: [[150, 50], [250, 50], [250, 250], [150, 250]].map(([x, y]): VarfDoc => ({ p: { x: x as number, y: y as number }, s: L })) }, matrice: { ...ID } });
  const rez = taie(d, { cutit: { fel: 'decupare', id: 'k', pastreaza: 'inauntru', trec: 'taie' }, alese: ['a', 'k'], inchide: true });
  if (!rez.ok) assert.fail(rez.motiv);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: rez.degrupate }).doc;
  const inainte = formeInstanta(d, 'a'), granita = formeInstanta(d, 'k'), ramase = formeInstanta(dupa, rez.ids[0] as string);
  const convex = [{ x: 150, y: 50 }, { x: 250, y: 50 }, { x: 250, y: 250 }, { x: 150, y: 250 }];
  const judeca = (x: typeof ramase, inchide = true): string[] => judecaDecuparea({ inainte, granita, dupa: x, inauntru: true, inchide, convex });
  assert.deepEqual(judeca(ramase), []);
  assert.notDeepEqual(judeca(inainte), [], 'forma întreagă: o parte nepăstrată');
  assert.notDeepEqual(judeca([]), [], 'nimic rămas din ce era înăuntru');
  assert.notDeepEqual(judecaDecuparea({ inainte, granita, dupa: ramase, inauntru: false, inchide: true, convex }), [], 'partea cealaltă');
});
