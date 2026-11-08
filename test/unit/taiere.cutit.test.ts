/**
 * Cuțitul uneltei (ADR 0181 §1; felia 10.3↑f), pe hârtie:
 * - **calea trasă** (felurile Linie, Pen, Liber), care nu intră în document: pătratul 100 × 100 tăiat de la (−10, 20) la
 *   (110, 60), cu tăieturile în (0; 70/3) și (100; 170/3), bucățile de 4 000 și 6 000 mm²; aceleași bucăți ca o formă din
 *   document cu aceeași cale (deschisă sau închisă); mâna liberă netezită: unda y = 50 + 5·sin(2πx / 100) taie pătratul în
 *   două bucăți de câte 5 000 mm², la toleranța netezirii;
 * - **formele existente** (felul Formă, nota owner-ului): un „O” (inelul R20 / R10, o piesă cu două contururi) pus înăuntrul
 *   plăcii 100 × 60, fără să-i atingă marginea: litera (942,478 mm²) și placa cu golul ei și mijlocul literei (5 057,522);
 *   două cercuri R10, cuțit împreună (628,319 și 5 371,681); decuparea la „O”, înăuntru (litera) și în afară (placa cu gol);
 *   fără închidere, nimic; cuțitul rămâne neschimbat;
 * - **operațiile** unei piese fără rol: bucla cuțitului ia operația conturului în care stă, cu latura întoarsă unde e gol.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { arieCuSemn, type Contur } from '../../src/geom/contur.ts';
import type { Document, FormaDoc, Nod, Operatie, Piesa, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import type { FormaCale } from '../../src/model/noduri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type CerereTaiere, type Cutit, type RezultatTaiere } from '../../src/model/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const caleDoc = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaCale =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const dreptunghi = (id: string, x: number, y: number, w: number, h: number) => forma(id, { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 }, x, y);
const cercF = (id: string, x: number, y: number, r: number) => forma(id, { tip: 'cerc', raza: r }, x, y);
const cerere = (cutit: Cutit, alese: readonly string[], inchide = true): CerereTaiere => ({ cutit, alese, inchide });

/** Documentul după tăiere (degruparea și ștergerile, ca acțiunea `document.taie`), trecut prin ușă. */
function aplica(d: Document, r: RezultatTaiere): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  const foaie = d.foi[0];
  assert.ok(foaie);
  let dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }).doc;
  if (r.sterse.length > 0) {
    const sterse = new Set(r.sterse);
    dupa = { ...dupa, foi: dupa.foi.map((f) => ({ ...f, instante: f.instante.filter((i) => !sterse.has(i.id)) })) };
  }
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const taiat = (d: Document, c: CerereTaiere): { readonly dupa: Document; readonly r: Extract<RezultatTaiere, { ok: true }> } => {
  const r = taie(d, c);
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return { dupa: aplica(d, r), r };
};
const contururi = (d: Document, inst: string): Contur[] => elementeFoaie(d).filter((e) => e.instanta === inst).map((e) => conturElement(e));
/** Aria regiunii par-impar a unei instanțe (contururile ei închise, cu semn după adâncime). */
function ariePar(d: Document, inst: string): number {
  const cs = contururi(d, inst).filter((c) => c.inchis);
  return cs.reduce((s, c) => s + Math.abs(arieCuSemn(c)) * (cs.filter((x) => x !== c && contine(x, c)).length % 2 === 0 ? 1 : -1), 0);
}
/** Conține conturul `x` primul vârf al lui `c`? (Raza din punct spre +x, numărând trecerile prin coarde dese.) */
function contine(x: Contur, c: Contur): boolean {
  const q = c.varfuri[0]?.p;
  if (!q) return false;
  const p = poligon(x);
  let in_ = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i] as { x: number; y: number }, b = p[j] as { x: number; y: number };
    if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
  }
  return in_;
}
/** Conturul ca poligon des (arcele prin 64 de coarde). */
function poligon(c: Contur): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  const n = c.varfuri.length, m = c.inchis ? n : n - 1;
  for (let k = 0; k < m; k++) {
    const a = c.varfuri[k] as Contur['varfuri'][number], b = c.varfuri[(k + 1) % n] as Contur['varfuri'][number];
    out.push({ x: a.p.x, y: a.p.y });
    if (a.s.tip === 'A' && Math.abs(a.s.bulge) > 1e-12) {
      const u = 4 * Math.atan(a.s.bulge), coarda = Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y), r = coarda / (2 * Math.sin(Math.abs(u) / 2));
      const mx = (a.p.x + b.p.x) / 2, my = (a.p.y + b.p.y) / 2, h = r * Math.cos(Math.abs(u) / 2) * Math.sign(a.s.bulge);
      const cx = mx - ((b.p.y - a.p.y) / coarda) * h, cy = my + ((b.p.x - a.p.x) / coarda) * h;
      const u0 = Math.atan2(a.p.y - cy, a.p.x - cx);
      for (let i = 1; i < 64; i++) out.push({ x: cx + r * Math.cos(u0 + (u * i) / 64), y: cy + r * Math.sin(u0 + (u * i) / 64) });
    }
  }
  return out;
}
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const areVarf = (c: Contur, x: number, y: number): boolean => c.varfuri.some((v) => Math.hypot(v.p.x - x, v.p.y - y) <= 1e-9);

/** Inelul R20 / R10 (un „O”), centrat în (cx, cy): o piesă cu un grup de două cercuri, ca literele unui text. */
function cuLitera(d: Document, id: string, cx: number, cy: number): Document {
  const radacina: Nod = {
    tip: 'grup', id, matrice: { ...ID }, copii: [
      { tip: 'element', id: `${id}-o`, forma: { tip: 'cerc', raza: 20 }, matrice: { ...ID } },
      { tip: 'element', id: `${id}-g`, forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID } },
    ],
  };
  const foaie = d.foi[0];
  assert.ok(foaie);
  return {
    ...d,
    piese: [...d.piese, { id, radacina, operatii: [] }],
    foi: [{ ...foaie, instante: [...foaie.instante, { id, piesa: id, x: cx, y: cy, rotire: 0 }] }],
  };
}

// ——— Calea trasă ———

test('Linie: pătratul tăiat de la (−10, 20) la (110, 60): tăieturile în (0; 70/3) și (100; 170/3), bucățile de 4 000 și 6 000 mm²', () => {
  const d = docDin(stoc, dreptunghi('a', 0, 0, 100, 100));
  const { dupa, r } = taiat(d, cerere({ fel: 'cale', cale: caleDoc(false, [-10, 20], [110, 60]) }, ['a']));
  assert.equal(r.forme, 1);
  assert.equal(r.ids.length, 2);
  const arii = r.ids.map((id) => ariePar(dupa, id)).sort((u, v) => u - v);
  aproape(arii[0] as number, 4000, 1e-6, 'bucata de dedesubt');
  aproape(arii[1] as number, 6000, 1e-6, 'bucata de deasupra');
  for (const id of r.ids) {
    const [c] = contururi(dupa, id);
    assert.ok(c && areVarf(c, 0, 70 / 3) && areVarf(c, 100, 170 / 3), `bucata ${id} are vârfurile tăieturii, la bit`);
  }
  assert.equal(dupa.foi[0]?.instante.length, 2, 'cuțitul nu intră în document');
});

test('calea trasă taie ca o formă din document cu aceeași cale (deschisă și închisă)', () => {
  const caiCutit: FormaCale[] = [
    caleDoc(false, [-10, 20], [50, 70], [110, 40]),
    caleDoc(true, [30, -20], [130, 40], [40, 80]),
  ];
  for (const k of caiCutit) {
    for (const inchide of [true, false]) {
      const d = docDin(stoc, dreptunghi('a', 0, 0, 100, 100), cercF('c', 160, 50, 30), forma('k', k));
      const cuForma = taie(d, cerere({ fel: 'forma', id: 'k' }, ['a', 'c', 'k'], inchide));
      const cuCale = taie(d, cerere({ fel: 'cale', cale: k }, ['a', 'c'], inchide));
      assert.ok(cuForma.ok && cuCale.ok, `ambele taie (${k.inchis ? 'închisă' : 'deschisă'}, ${inchide ? 'cu' : 'fără'} închidere)`);
      assert.deepEqual(cuCale.degrupate.map((x) => x.parti.map((p) => p.piesa.radacina)), cuForma.degrupate.map((x) => x.parti.map((p) => p.piesa.radacina)));
      assert.deepEqual(cuCale.ids, cuForma.ids);
    }
  }
});

test('Liber: unda y = 50 + 5·sin(2πx / 100), trasă din 241 de puncte și netezită la 0,05: două bucăți de câte 5 000 mm²', () => {
  const p: Array<readonly [number, number]> = [];
  for (let i = 0; i <= 240; i++) {
    const x = -10 + i * 0.5;
    p.push([x, 50 + 5 * Math.sin((2 * Math.PI * x) / 100)]);
  }
  const d = docDin(stoc, dreptunghi('a', 0, 0, 100, 100));
  const { dupa, r } = taiat(d, cerere({ fel: 'cale', cale: caleDoc(false, ...p), netezire: 0.05 }, ['a']));
  assert.equal(r.ids.length, 2);
  for (const id of r.ids) aproape(ariePar(dupa, id), 5000, 0.05 * 100, `bucata ${id}`);
  // Marginea nouă e netezită: din cele 241 de puncte au rămas câteva curbe (cubice), nu sute de linii.
  const cubice = r.ids.flatMap((id) => contururi(dupa, id)).flatMap((c) => c.varfuri).filter((v) => v.s.tip === 'C').length;
  assert.ok(cubice > 0 && cubice < 40, `marginea netezită are ${cubice} cubice`);
  // O toleranță a netezirii care nu e un număr pozitiv se refuză.
  for (const netezire of [0, -1, Number.NaN, Infinity]) {
    const x = taie(d, cerere({ fel: 'cale', cale: caleDoc(false, ...p), netezire }, ['a']));
    assert.equal(x.ok ? 'tăiată' : x.motiv, 'valoare', `netezirea ${netezire}`);
  }
});

test('un cuțit închis care se încrucișează înăuntrul plăcii (o fundă) se refuză: n-are o parte dinăuntru bine făcută', () => {
  const d = docDin(stoc, dreptunghi('a', 0, 0, 100, 60));
  const r = taie(d, cerere({ fel: 'cale', cale: caleDoc(true, [30, 20], [70, 40], [70, 20], [30, 40]) }, ['a']));
  assert.equal(r.ok ? 'tăiată' : r.motiv, 'cutit');
});

// ——— Formele existente (felul Formă) ———

test('un „O” înăuntrul plăcii, fără să-i atingă marginea: litera (942,478 mm²) și placa cu golul și mijlocul literei (5 057,522)', () => {
  const d = cuLitera(docDin(stoc, dreptunghi('a', 0, 0, 100, 60)), 'o', 50, 30);
  const { dupa, r } = taiat(d, cerere({ fel: 'forme', ids: ['o'] }, ['a']));
  assert.equal(r.ids.length, 2, 'înăuntrul cuțitului, apoi în afara lui');
  assert.equal(r.forme, 1, 'placa se socotește tăiată');
  const [inauntru, afara] = r.ids as [string, string];
  aproape(ariePar(dupa, inauntru), Math.PI * 300, 1e-6, 'litera');
  aproape(ariePar(dupa, afara), 6000 - Math.PI * 300, 1e-6, 'placa cu golul ei');
  assert.equal(contururi(dupa, inauntru).length, 2, 'litera: conturul ei și golul din mijloc');
  assert.equal(contururi(dupa, afara).length, 3, 'placa: marginea, golul literei și mijlocul literei');
  assert.deepEqual(contururi(dupa, 'o'), contururi(d, 'o'), 'cuțitul rămâne neschimbat');
});

test('două cercuri R10, cuțit împreună (Shift + clic): cercurile (628,319 mm²) și placa cu două goluri (5 371,681)', () => {
  // Placa mutată din origine, în (100, 50): buclele trec în coordonatele piesei ei, iar cercurile rămân cercuri, unde erau.
  const d = docDin(stoc, dreptunghi('a', 100, 50, 100, 60), cercF('k1', 125, 80, 10), cercF('k2', 175, 80, 10));
  const { dupa, r } = taiat(d, cerere({ fel: 'forme', ids: ['k1', 'k2'] }, ['a', 'k1', 'k2']));
  assert.equal(r.ids.length, 2);
  aproape(ariePar(dupa, r.ids[0] as string), 200 * Math.PI, 1e-6, 'înăuntru');
  aproape(ariePar(dupa, r.ids[1] as string), 6000 - 200 * Math.PI, 1e-6, 'în afară');
  assert.equal(dupa.foi[0]?.instante.filter((i) => i.id === 'k1' || i.id === 'k2').length, 2, 'cercurile-cuțit rămân, netăiate');
  const inauntru = dupa.piese.find((p) => p.id === r.ids[0]) as Piesa;
  const cercuri: Array<{ x: number; y: number }> = [];
  const umbla = (n: Nod): void => { if (n.tip === 'element') { if (n.forma.tip === 'cerc') cercuri.push({ x: n.matrice.e, y: n.matrice.f }); } else n.copii.forEach(umbla); };
  umbla(inauntru.radacina);
  assert.equal(cercuri.length, 2, 'buclele rămân cercuri');
  for (const c of contururi(dupa, r.ids[0] as string)) {
    const xs = c.varfuri.map((v) => v.p.x), ys = c.varfuri.map((v) => v.p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    assert.ok([125, 175].some((x) => Math.abs(cx - x) < 10.5) && Math.abs(cy - 80) < 10.5, `un cerc din placă stă unde era cuțitul (${cx}, ${cy})`);
  }
});

test('un „O” peste marginea plăcii: litera din placă (o față și golul din mijloc) și restul plăcii', () => {
  // Inelul centrat pe latura de sus (y = 60): jumătatea de jos a literei e în placă, mijlocul R10 trece și el marginea.
  const d = cuLitera(docDin(stoc, dreptunghi('a', 0, 0, 100, 60)), 'o', 50, 60);
  const { dupa, r } = taiat(d, cerere({ fel: 'forme', ids: ['o'] }, ['a']));
  assert.equal(r.ids.length, 2);
  aproape(ariePar(dupa, r.ids[0] as string), (Math.PI * 300) / 2, 1e-6, 'jumătatea literei din placă');
  aproape(ariePar(dupa, r.ids[1] as string), 6000 - (Math.PI * 300) / 2, 1e-6, 'restul plăcii');
});

test('Decupează la „O”-ul dinăuntrul plăcii: înăuntru, placa devine litera; în afară, placa rămâne cu golul literei', () => {
  const d = cuLitera(docDin(stoc, dreptunghi('a', 0, 0, 100, 60)), 'o', 50, 30);
  const inauntru = taiat(d, cerere({ fel: 'decupare', id: 'o', pastreaza: 'inauntru', trec: 'taie' }, ['a', 'o']));
  assert.equal(inauntru.r.ids.length, 1);
  aproape(ariePar(inauntru.dupa, inauntru.r.ids[0] as string), Math.PI * 300, 1e-6, 'litera');
  const afara = taiat(d, cerere({ fel: 'decupare', id: 'o', pastreaza: 'afara', trec: 'taie' }, ['a', 'o']));
  assert.equal(afara.r.ids.length, 1);
  aproape(ariePar(afara.dupa, afara.r.ids[0] as string), 6000 - Math.PI * 300, 1e-6, 'placa cu golul');
});

test('fără „Închide bucățile”, un cuțit închis dinăuntrul plăcii nu taie nimic (nu trece niciun contur)', () => {
  const d = cuLitera(docDin(stoc, dreptunghi('a', 0, 0, 100, 60)), 'o', 50, 30);
  const r = taie(d, cerere({ fel: 'forme', ids: ['o'] }, ['a'], false));
  assert.equal(r.ok ? 'tăiată' : r.motiv, 'nimic-taiat');
});

test('o placă fără rol: bucla cuțitului ia operația conturului în care stă, cu latura întoarsă unde e gol', () => {
  // Piesa „a”: dreptunghiul (profil pe exterior) și o gaură R5 fără operație, deci fără rol.
  const d0 = docDin(stoc, dreptunghi('a', 0, 0, 100, 60));
  const p0 = d0.piese[0] as Piesa;
  const op = p0.operatii[0] as Operatie;
  const radacina: Nod = {
    tip: 'grup', id: 'a', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID } },
      { tip: 'element', id: 'h', forma: { tip: 'cerc', raza: 5 }, matrice: { ...ID, e: 10, f: 10 } },
    ],
  };
  const d = cuLitera({ ...d0, piese: [{ ...p0, radacina, operatii: [{ ...op, latura: 'exterior', noduri: ['r'] }] }] }, 'o', 50, 30);
  const { dupa, r } = taiat(d, cerere({ fel: 'forme', ids: ['o'] }, ['a']));
  const [inauntru, afara] = r.ids.map((id) => dupa.piese.find((p) => p.id === id) as Piesa) as [Piesa, Piesa];
  const laturi = (p: Piesa): string[] => p.operatii.map((o) => `${o.latura}:${o.noduri.length}`).sort();
  assert.deepEqual(laturi(inauntru), ['exterior:1', 'interior:1'], 'litera: marginea pe exterior, golul din mijloc pe interior');
  assert.deepEqual(laturi(afara), ['exterior:2', 'interior:1'], 'placa: marginea și mijlocul literei pe exterior, golul literei pe interior');
});
