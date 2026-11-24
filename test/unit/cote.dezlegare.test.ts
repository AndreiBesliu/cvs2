import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coteCopiate, indexLume, punctAncora } from '../../src/model/cote.ts';
import { documentNou, type AncoraCota, type Cota, type Document, type LegaturaCota, type LocCota } from '../../src/model/document.ts';
import { jsonCanonic } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou, reface, type Comanda, type Istoric } from '../../src/model/jurnal.ts';
import '../../src/model/jurnalCote.ts';
import { comandaDuplicareLegata } from '../../src/model/pieseLegate.ts';
import '../../src/model/jurnalFoi.ts';

/**
 * Dezlegarea cinstită (ADR 0330 §3), în același pas de anulare: după o comandă, un capăt legat a cărui formă nu mai e pe foaia
 * cotei (ștearsă, mutată pe altă foaie) sau și-a schimbat numărul de segmente își scrie ultimul punct văzut, iar legătura
 * rămâne (panoul spune de ce). Comanda și scrierea sunt un singur pas: anularea le întoarce pe amândouă, exact. Plus copiile
 * foilor: cotele copiate se leagă de instanțele noi.
 *
 * Documentul: dreptunghiul 100 × 50 („p”, elementul „e”), instanța „i1” la (10, 20), fără rotire; cota orizontală „c1” cu
 * capetele pe vârfurile 0 și 1, (10, 20) și (110, 20), și cota „c2” cu capătul A pe centrul cutiei, (60, 45).
 */
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const leg = (loc: LocCota, n = 4): LegaturaCota => ({ instanta: 'i1', nod: 'e', loc, n });
function document(): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const f = d.foi[0];
  if (!f) throw new Error('fără foaie');
  const c1: Cota = { id: 'c1', fel: 'orizontala', puncte: [{ x: 10, y: 20, legatura: leg({ fel: 'varf', k: 0 }) }, { x: 110, y: 20, legatura: leg({ fel: 'varf', k: 1 }) }], linie: { d: -10 } };
  const c2: Cota = { id: 'c2', fel: 'aliniata', puncte: [{ x: 60, y: 45, legatura: leg({ fel: 'cutie', i: 4 }) }, { x: 200, y: 150 }], linie: { d: 5 } };
  return {
    ...d,
    piese: [{ id: 'p', operatii: [], radacina: { tip: 'element', id: 'e', matrice: { ...ID }, forma: { tip: 'dreptunghi', latime: 100, inaltime: 50, razaColt: 0 } } }],
    foi: [{ ...f, instante: [{ id: 'i1', piesa: 'p', x: 10, y: 20, rotire: 0 }], cote: [c1, c2] }],
  };
}

const ancora = (h: Istoric, cota: string, k: number, foaie = 0): AncoraCota => {
  const a = h.doc.foi[foaie]?.cote?.find((c) => c.id === cota)?.puncte?.[k];
  assert.ok(a, `${cota}[${k}]`);
  return a;
};
const stare = (h: Istoric, cota: string, k: number, foaie = 0): ReturnType<typeof punctAncora> => punctAncora(ancora(h, cota, k, foaie), indexLume(h.doc, foaie));

test('mutată, forma își ține cotele legate: punctul citit e cel nou, iar comanda rămâne una singură', () => {
  const d = document();
  const f = d.foi[0];
  assert.ok(f);
  const vechi = f.instante[0];
  assert.ok(vechi);
  const h = executa(istoricNou(d), { tip: 'inlocuieste-instanta', foaie: f.id, vechi, nou: { ...vechi, x: 30, y: 40 } });
  assert.equal(h.trecut.at(-1)?.tip, 'inlocuieste-instanta', 'nimic nu s-a dezlegat: fără pas în plus');
  assert.deepEqual(stare(h, 'c1', 1), { p: { x: 130, y: 40 }, stare: 'legata' });
  assert.deepEqual(stare(h, 'c2', 0), { p: { x: 80, y: 65 }, stare: 'legata' });
});

test('ștearsă, forma își dezleagă cotele: ultimul punct văzut, în același pas; anularea și refacerea, exacte', () => {
  const d = document();
  const f = d.foi[0];
  const vechi = f?.instante[0];
  const piesa = d.piese[0];
  assert.ok(f && vechi && piesa);
  let h = executa(istoricNou(d), { tip: 'inlocuieste-instanta', foaie: f.id, vechi, nou: { ...vechi, x: 30, y: 40 } });
  const inainte = h.doc;
  const sterge: Comanda = { tip: 'sterge', foaie: f.id, instanta: { ...vechi, x: 30, y: 40 }, pozitie: 0, piesa: { piesa, pozitie: 0 } };
  h = executa(h, sterge);
  const pas = h.trecut.at(-1);
  assert.equal(pas?.tip, 'lot', 'ștergerea și dezlegarea sunt un singur pas');
  assert.equal(pas?.tip === 'lot' ? pas.comenzi.length : 0, 2);
  assert.deepEqual(stare(h, 'c1', 0), { p: { x: 30, y: 40 }, stare: 'dezlegata', motiv: 'forma' });
  assert.deepEqual(stare(h, 'c1', 1), { p: { x: 130, y: 40 }, stare: 'dezlegata', motiv: 'forma' }, 'punctul de după mutare, nu cel de la punere');
  assert.deepEqual(stare(h, 'c2', 0), { p: { x: 80, y: 65 }, stare: 'dezlegata', motiv: 'forma' });
  assert.equal(ancora(h, 'c1', 0).legatura?.instanta, 'i1', 'legătura rămâne (panoul spune de ce s-a dezlegat)');
  assert.deepEqual(ancora(h, 'c2', 1), { x: 200, y: 150 }, 'capătul liber, neatins');
  assert.equal(h.doc.rev, inainte.rev + 1, 'un singur pas și în revizie');
  h = anuleaza(h);
  assert.equal(jsonCanonic({ ...h.doc, rev: inainte.rev }), jsonCanonic(inainte), 'anularea întoarce și forma, și punctele');
  h = reface(h);
  assert.deepEqual(stare(h, 'c1', 1), { p: { x: 130, y: 40 }, stare: 'dezlegata', motiv: 'forma' });
});

test('alte noduri: capetele pe vârfuri se dezleagă (motivul „noduri”), cel pe cutie rămâne legat', () => {
  const d = document();
  const piesa = d.piese[0];
  assert.ok(piesa);
  const varfuri = [[0, 0], [100, 0], [100, 50], [50, 70], [0, 50]].map(([x = 0, y = 0]) => ({ p: { x, y }, s: { tip: 'L' as const } }));
  const nou = { ...piesa, radacina: { tip: 'element' as const, id: 'e', matrice: { ...ID }, forma: { tip: 'cale' as const, inchis: true, varfuri } } };
  const h = executa(istoricNou(d), { tip: 'inlocuieste-piesa', vechi: piesa, nou });
  assert.equal(h.trecut.at(-1)?.tip, 'lot');
  assert.deepEqual(stare(h, 'c1', 0), { p: { x: 10, y: 20 }, stare: 'dezlegata', motiv: 'noduri' });
  assert.equal(stare(h, 'c2', 0).stare, 'legata', 'cutia nu ține de noduri');
});

test('mutată pe altă foaie: cotele foii vechi se dezleagă', () => {
  const d0 = document();
  const f = d0.foi[0];
  assert.ok(f);
  const { cote: _, ...faraCote } = f;
  const d: Document = { ...d0, foi: [f, { ...faraCote, id: 'f2', instante: [] }] };
  const i = f.instante[0];
  assert.ok(i);
  const h = executa(istoricNou(d), { tip: 'lot', comenzi: [{ tip: 'sterge', foaie: f.id, instanta: i, pozitie: 0 }, { tip: 'adauga', foaie: 'f2', instanta: i, pozitie: 0 }] });
  assert.equal(stare(h, 'c1', 0).stare, 'dezlegata');
  assert.deepEqual(stare(h, 'c1', 1).p, { x: 110, y: 20 });
});

test('o comandă a cotelor nu se judecă: o cotă nouă, legată de o formă lipsă, își păstrează punctul dat', () => {
  const d = document();
  const f = d.foi[0];
  assert.ok(f);
  const noua: Cota = { id: 'c3', fel: 'orizontala', puncte: [{ x: 1, y: 2, legatura: { instanta: 'nu', nod: 'e', loc: { fel: 'varf', k: 0 }, n: 4 } }, { x: 3, y: 4 }], linie: { d: 1 } };
  const h = executa(istoricNou(d), { tip: 'inlocuieste-cote', foaie: f.id, vechi: f.cote ?? [], nou: [...(f.cote ?? []), noua] });
  assert.equal(h.trecut.at(-1)?.tip, 'inlocuieste-cote');
  assert.deepEqual(ancora(h, 'c3', 0), noua.puncte?.[0]);
});

test('un capăt deja dezlegat nu se mai scrie (punctul lui rămâne cel de la dezlegare)', () => {
  const d0 = document();
  const f = d0.foi[0];
  assert.ok(f);
  const dezlegata: Cota = { id: 'c4', fel: 'orizontala', puncte: [{ x: 7, y: 8, legatura: { instanta: 'plecata', nod: 'e', loc: { fel: 'varf', k: 0 }, n: 4 } }, { x: 9, y: 8 }], linie: { d: 1 } };
  const d: Document = { ...d0, foi: [{ ...f, cote: [...(f.cote ?? []), dezlegata] }] };
  const i = f.instante[0], piesa = d.piese[0];
  assert.ok(i && piesa);
  const h = executa(istoricNou(d), { tip: 'sterge', foaie: f.id, instanta: i, pozitie: 0, piesa: { piesa, pozitie: 0 } });
  assert.deepEqual(ancora(h, 'c4', 0), dezlegata.puncte?.[0]);
});

test('copiile foilor: cotele copiate se leagă de instanțele noi (aceleași noduri), iar cele străine rămân neatinse', () => {
  const d = document();
  const f = d.foi[0];
  assert.ok(f?.cote);
  const strain = { id: 'x', fel: 'din-viitor', puncte: [{ legatura: { instanta: 'i1' } }] } as unknown as Cota;
  const copii = coteCopiate([...f.cote, strain], new Map([['i1', 'i9']]));
  assert.equal(copii[0]?.puncte?.[0]?.legatura?.instanta, 'i9');
  assert.equal(copii[1]?.puncte?.[0]?.legatura?.instanta, 'i9');
  assert.deepEqual(copii[1]?.puncte?.[1], { x: 200, y: 150 });
  assert.deepEqual(copii[2], strain, 'o cotă cu un fel necunoscut, copiată neatinsă');
  assert.equal(f.cote[0]?.puncte?.[0]?.legatura?.instanta, 'i1', 'originalul neatins');
  // „Duplică foaia cu aceleași piese”: pe copie, cotele sunt legate de instanțele ei, în aceleași puncte.
  const r = comandaDuplicareLegata(d, f.id);
  assert.ok(r);
  const h = executa(istoricNou(d), r.comanda);
  assert.deepEqual(stare(h, 'c1', 1, 1), { p: { x: 110, y: 20 }, stare: 'legata' });
  assert.deepEqual(stare(h, 'c2', 0, 1), { p: { x: 60, y: 45 }, stare: 'legata' });
});
