/**
 * Rolurile personalizate (ADR 0114), pe hârtie: rolul salvat din piese (cu golurile lui), refuzurile salvării, aplicarea pe
 * alt contur și pe o literă, numerele frezelor, rolul recunoscut înapoi, verificarea unui rol citit, lista și textul ei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieImplicita, PLAFON, VERSIUNE_SCHEMA, type Document, type ElementNod, type FormaDoc, type Operatie, type Piesa } from '../../src/model/document.ts';
import { rolPiesei } from '../../src/model/rol.ts';
import {
  citesteRoluri, cuNumeNou, cuRolNou, faraRol, operatiiPentruRolPersonal, PLAFON_ROLURI, rolNumerotat, rolPersonalBun, rolPersonalPiesei,
  sablonDinPiese, textRoluri, VERSIUNE_ROLURI, type RolPersonal, type SablonRol,
} from '../../src/model/rolPersonal.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const el = (id: string, forma: FormaDoc, x = 0, y = 0): ElementNod => ({ tip: 'element', id, matrice: { ...I, e: x, f: y }, forma });
const DR = (latime: number, inaltime: number): FormaDoc => ({ tip: 'dreptunghi', latime, inaltime, razaColt: 0 });
const CERC = (raza: number): FormaDoc => ({ tip: 'cerc', raza });
const LINIE = (...puncte: ReadonlyArray<readonly [number, number]>): FormaDoc => ({
  tip: 'cale', inchis: false, varfuri: puncte.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' as const } })),
});

/** O piesă dintr-o singură formă, cu operația implicită (ca „Adaugă”), schimbată de `v`. */
const simpla = (id: string, forma: FormaDoc, v: Partial<Operatie> = {}): Piesa => ({
  id, radacina: el(`${id}e`, forma), operatii: [{ ...operatieImplicita(`${id}e`, forma), ...v }],
});
const grup = (id: string, forme: ElementNod[], operatii: Operatie[]): Piesa => ({ id, radacina: { tip: 'grup', id: `${id}g`, matrice: { ...I }, copii: forme }, operatii });
const doc = (...piese: Piesa[]): Document => ({
  schema: VERSIUNE_SCHEMA, rev: 0, piese,
  foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: piese.map((p, k) => ({ id: `i${k}`, piesa: p.id, x: 0, y: 0, rotire: 0 })) }],
});

/** Litera cu un gol: conturul 30 × 40 și golul 10 × 20 în (10, 10), cu operațiile unui import; golul schimbat de `gol`. */
const litera = (id = 'L', gol: Partial<Operatie> = {}): Piesa => grup(id, [el(`${id}o`, DR(30, 40)), el(`${id}h`, DR(10, 20), 10, 10)], [
  { ...operatieImplicita('exterior', DR(30, 40)), noduri: [`${id}o`] },
  { ...operatieImplicita('interior', DR(30, 40)), noduri: [`${id}h`], latura: 'interior', ...gol },
]);

const URECHI = { numar: 4, latime: 6, grosime: 2 };
/** Dreptunghiul de decupat: 6,5 mm în treceri de 2, cu 4 urechi. */
const decupare = (id = 'd'): Piesa => simpla(id, DR(30, 20), { adancime: 6.5, pas: 2, urechi: URECHI });

function sablon(piese: readonly Piesa[]): SablonRol {
  const s = sablonDinPiese(piese);
  assert.ok(s.ok, `refuzat: ${s.ok ? '' : s.motiv}`);
  return s.sablon;
}
function rol(nume: string, s: SablonRol, id = 'r1', lista: readonly RolPersonal[] = []): RolPersonal {
  const r = cuRolNou(lista, nume, s, id);
  assert.ok(r.ok, `refuzat: ${r.ok ? '' : r.motiv}`);
  return r.roluri.at(-1)!;
}

test('rolul salvat dintr-un dreptunghi: rolul de bază și toate valorile, fără id, forme și despărțire', () => {
  const s = sablon([decupare()]);
  assert.deepEqual(s, {
    baza: 'exterior',
    operatie: {
      id: 'model', tip: 'profil', noduri: ['model'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', sens: 'urcare',
      adancime: 6.5, pas: 2, urechi: URECHI, rampa: null, intrari: null, colturi: null,
    },
  });
  assert.equal(operatieInMargini(s.operatie), true);
  // Despărțirea foii e a unei linii anume (ADR 0037 §2): nu intră în rol.
  const l = simpla('l', LINIE([0, 0], [50, 0]), { latura: 'pe-linie', despartire: true, adancime: 18 });
  const sl = sablon([l]);
  assert.equal(sl.baza, 'pe-linie');
  assert.equal('despartire' in sl.operatie, false);
  assert.equal(sl.operatie.adancime, 18);
});

test('litera cu gol: golul își are valorile lui doar când diferă de ale conturului', () => {
  const fara = sablon([litera()]);
  assert.equal(fara.baza, 'exterior');
  assert.equal(fara.goluri, undefined);
  const cu = sablon([litera('L', { adancime: 2, pas: 1 })]);
  assert.equal(cu.operatie.adancime, 3);
  assert.deepEqual([cu.goluri?.tip, cu.goluri?.latura, cu.goluri?.adancime, cu.goluri?.pas, cu.goluri?.noduri], ['profil', 'interior', 2, 1, ['model']]);
  // Rolul „interior” (contururile pe dinăuntru, golurile pe afară): golurile sunt pe exterior.
  const inv = litera('M');
  const inv2: Piesa = { ...inv, operatii: [{ ...inv.operatii[0]!, latura: 'interior' }, { ...inv.operatii[1]!, latura: 'exterior', adancime: 5 }] };
  assert.equal(rolPiesei(inv2), 'interior');
  const si = sablon([inv2]);
  assert.deepEqual([si.baza, si.operatie.latura, si.goluri?.latura, si.goluri?.adancime], ['interior', 'interior', 'exterior', 5]);
});

test('salvarea refuzată: fără rol, roluri diferite, valori diferite, bucăți cu valori diferite', () => {
  const motiv = (piese: readonly Piesa[]): string => { const s = sablonDinPiese(piese); return s.ok ? 'ok' : s.motiv; };
  // Cercul nou e o gaură (interior), dreptunghiul pe exterior.
  assert.equal(motiv([decupare(), simpla('c', CERC(10))]), 'roluri-diferite');
  assert.equal(motiv([decupare('a'), simpla('b', DR(30, 20), { adancime: 6.5, pas: 3, urechi: URECHI })]), 'valori-diferite');
  // Aceleași valori sub alt număr de freză: același rol (numerele nu contează), cu numerele primei piese.
  const t3 = simpla('b', DR(30, 20), { adancime: 6.5, pas: 2, urechi: URECHI, scula: { numar: 3, nume: 'freza plata', diametru: 6 } });
  assert.equal(sablon([decupare('a'), t3]).operatie.scula.numar, 1);
  // Contururi și o cale deschisă, cu câte o operație: nicio împărțire a unui rol.
  const amestec = grup('m', [el('a', DR(10, 10)), el('b', LINIE([0, 20], [10, 20]))], [
    { ...operatieImplicita('a', DR(10, 10)), noduri: ['a'] }, { ...operatieImplicita('b', DR(10, 10)), noduri: ['b'], latura: 'pe-linie' },
  ]);
  assert.equal(motiv([amestec]), 'fara-rol');
  assert.equal(motiv([]), 'fara-rol');
  // Peste plafonul nodurilor pe operație: două bucăți ale aceleiași grupe, cu adâncimi diferite.
  const n = PLAFON.noduriOperatie + 1;
  const forme = Array.from({ length: n }, (_, k) => el(`l${k}`, LINIE([0, k], [5, k])));
  const ids = forme.map((f) => f.id);
  const baza = { ...operatieImplicita('linie', LINIE([0, 0], [5, 0])), latura: 'pe-linie' as const, adancime: 1, pas: 1 };
  const bucati = (a2: number): Piesa => grup('mult', forme, [{ ...baza, noduri: ids.slice(0, PLAFON.noduriOperatie) }, { ...baza, id: 'linie-2', noduri: ids.slice(PLAFON.noduriOperatie), adancime: a2 }]);
  assert.equal(rolPiesei(bucati(2)), 'pe-linie');
  assert.equal(motiv([bucati(2)]), 'operatii-diferite');
  assert.equal(motiv([bucati(1)]), 'ok');
});

test('rolul aplicat: grupele rolului de bază cu valorile lui; o operație care rămâne una își păstrează id-ul', () => {
  const s = sablon([decupare()]);
  // Cercul (o gaură) devine decupat pe exterior, cu valorile rolului și id-ul operației lui.
  const c = simpla('c', CERC(10));
  const ops = operatiiPentruRolPersonal(c, s)!;
  assert.deepEqual(ops, [{ ...s.operatie, id: 'ce', noduri: ['ce'] }]);
  // Pe o literă: conturul de afară pe exterior, golul pe interior, amândouă cu valorile rolului (rolul n-are goluri).
  const L = litera('L', { adancime: 1 });
  const pe = operatiiPentruRolPersonal(L, s)!;
  assert.deepEqual(pe.map((o) => [o.id, o.latura, o.noduri, o.adancime, o.pas, o.urechi]), [
    ['exterior', 'exterior', ['Lo'], 6.5, 2, URECHI], ['interior', 'interior', ['Lh'], 6.5, 2, URECHI],
  ]);
  // Rolul cu goluri: golul primește valorile lui.
  const sg = sablon([litera('K', { adancime: 2, pas: 1 })]);
  assert.deepEqual(operatiiPentruRolPersonal(litera('N'), sg)!.map((o) => [o.latura, o.adancime, o.pas]), [['exterior', 3, 3], ['interior', 2, 1]]);
  // Găurirea (doar cercuri) nu se potrivește dreptunghiului.
  const gaura = sablon([simpla('g', CERC(3), { tip: 'gaurire', adancime: 10, pas: 2, retragereCompleta: 3 })]);
  assert.equal(gaura.baza, 'gaurire');
  assert.equal(operatiiPentruRolPersonal(decupare('x'), gaura), null);
  assert.deepEqual(operatiiPentruRolPersonal(simpla('h', CERC(3)), gaura)!.map((o) => [o.tip, o.retragereCompleta, o.adancime]), [['gaurire', 3, 10]]);
  // Fiecare operație dată trece de schema documentului.
  for (const o of [...ops, ...pe]) assert.equal(operatieInMargini(o), true);
});

test('numerele frezelor: păstrat cât e liber, al frezei identice, cel mai mic liber; piesele înlocuite nu se numără', () => {
  const s = sablon([decupare()]);
  const numar = (d: Document, r: SablonRol, inlocuite: readonly string[]): number => rolNumerotat(d, r, new Set(inlocuite)).operatie.scula.numar;
  const t = (numar: number, diametru: number) => ({ numar, nume: 'freza', diametru });
  const alta = simpla('a', DR(10, 10), { scula: t(1, 3) });
  const c = simpla('c', CERC(10));
  // T1 e al frezei de Ø3: rolul (T1 Ø6) ia cel mai mic liber.
  assert.equal(numar(doc(alta, c), s, ['c']), 2);
  // Cu o freză de Ø6 ca T4 în proiect: numărul ei.
  assert.equal(numar(doc(alta, simpla('b', DR(10, 10), { scula: t(4, 6) }), c), s, ['c']), 4);
  // T5 liber rămâne T5, chiar dacă o freză identică are alt număr.
  const s5: SablonRol = { ...s, operatie: { ...s.operatie, scula: t(5, 6) } };
  assert.equal(numar(doc(alta, simpla('b', DR(10, 10), { scula: t(4, 6) }), c), s5, ['c']), 5);
  // Piesa înlocuită își pierde operațiile: T1 al ei nu mai e luat.
  assert.equal(numar(doc(simpla('c', CERC(10), { scula: t(1, 3) })), s, ['c']), 1);
  // Două freze ale rolului sub același număr, cu diametre diferite: a doua ia cel mai mic liber.
  const buz = simpla('z', DR(40, 40), { tip: 'buzunar', latura: 'interior', pasLateral: 2.4, rest: [{ scula: t(1, 3), pasLateral: 1.2 }] });
  const sb = sablon([buz]);
  assert.equal(sb.baza, 'buzunar');
  const nb = rolNumerotat(doc(buz), sb, new Set(['z']));
  assert.deepEqual([nb.operatie.scula.numar, nb.operatie.rest?.[0]?.scula.numar], [1, 2]);
  // Fundul plat al unui V-carve: freza lui intră în socoteală după freza în V.
  const vc = simpla('v', DR(40, 40), {
    tip: 'vcarve', latura: 'interior', scula: { numar: 2, nume: 'V60', diametru: 6, forma: { tip: 'v', unghi: 60 } }, adancime: 3, pas: 3,
    fundPlat: { scula: t(2, 3), pasLateral: 1 },
  });
  const nv = rolNumerotat(doc(vc), sablon([vc]), new Set(['v']));
  assert.deepEqual([nv.operatie.scula.numar, nv.operatie.fundPlat?.scula.numar], [2, 1]);
  // Freza dopului cu pereți drepți (ADR 0171): intră în socoteală după cele ale buzunarului; sub T1 (al locașului, Ø6) cu Ø2,
  // ia cel mai mic liber.
  const dr = simpla('w', DR(40, 40), {
    tip: 'buzunar', latura: 'interior', pasLateral: 2.4,
    incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5, frezeDop: [{ scula: t(1, 2), pasLateral: 0.8 }] },
  });
  const sd = sablon([dr]);
  assert.equal(sd.baza, 'incrustatie-drept');
  const nd = rolNumerotat(doc(dr), sd, new Set(['w']));
  const inc = nd.operatie.incrustatie;
  assert.deepEqual([nd.operatie.scula.numar, inc?.fel === 'drept' ? inc.frezeDop?.[0]?.scula.numar : null], [1, 2]);
});

test('rolul recunoscut înapoi, și după renumerotarea frezelor; o valoare schimbată arată rolul de bază', () => {
  const r = rol('Decupare 18', sablon([decupare()]));
  const alta = simpla('a', DR(10, 10), { scula: { numar: 1, nume: 'freza', diametru: 3 } });
  const c = simpla('c', CERC(10));
  const d = doc(alta, c);
  const nou: Piesa = { ...c, operatii: operatiiPentruRolPersonal(c, rolNumerotat(d, r, new Set(['c'])))! };
  assert.equal(nou.operatii[0]!.scula.numar, 2);
  assert.equal(rolPersonalPiesei(nou, [r]), r);
  const schimbata: Piesa = { ...nou, operatii: [{ ...nou.operatii[0]!, adancime: 7 }] };
  assert.equal(rolPersonalPiesei(schimbata, [r]), null);
  assert.equal(rolPiesei(schimbata), 'exterior');
  // Fără roluri, sau cu altul pe aceeași bază: nimic, respectiv primul care se potrivește.
  assert.equal(rolPersonalPiesei(nou, []), null);
  const altul = rol('Gravura', sablon([simpla('g', DR(30, 20), { adancime: 1 })]), 'r2', [r]);
  assert.equal(rolPersonalPiesei(nou, [altul, r]), r);
  // Litera cu rolul cu goluri: recunoscută; litera fără valorile golului: nu.
  const rg = rol('Litere', sablon([litera('K', { adancime: 2 })]), 'r3');
  const N = litera('N');
  const cuRol: Piesa = { ...N, operatii: operatiiPentruRolPersonal(N, rg)! };
  assert.equal(rolPersonalPiesei(cuRol, [rg]), rg);
  assert.equal(rolPersonalPiesei(N, [rg]), null);
});

test('rolul citit din stocare: id, nume curat, rol de bază, operația-model a grupei, golurile doar pe contur', () => {
  const r = rol('Decupare', sablon([decupare()]));
  assert.equal(rolPersonalBun(r), true);
  const strica = (x: Record<string, unknown>): boolean => rolPersonalBun({ ...r, ...x });
  assert.equal(strica({ baza: 'altceva' }), false);
  assert.equal(strica({ id: 'cu spatii' }), false);
  assert.equal(strica({ nume: ' Decupare' }), false);
  assert.equal(strica({ nume: '' }), false);
  assert.equal(strica({ nume: 'x'.repeat(PLAFON_ROLURI.nume + 1) }), false);
  // Operația nu e a grupei rolului de bază (buzunarul cere `buzunar` pe interior), sau iese din marginile schemei.
  assert.equal(strica({ baza: 'buzunar' }), false);
  assert.equal(strica({ operatie: { ...r.operatie, adancime: -1 } }), false);
  assert.equal(strica({ operatie: undefined }), false);
  // Golurile: doar la exterior și interior, pe latura cealaltă.
  assert.equal(strica({ goluri: { ...r.operatie, latura: 'interior' } }), true);
  assert.equal(strica({ goluri: { ...r.operatie, latura: 'exterior' } }), false);
  const pl = rol('Linie', sablon([simpla('l', LINIE([0, 0], [50, 0]), { latura: 'pe-linie' })]));
  assert.equal(rolPersonalBun({ ...pl, goluri: { ...r.operatie, latura: 'interior' } }), false);
});

test('textul listei: dus-întors, stricat, altă versiune, intrări rele sau repetate, plafonul', () => {
  const a = rol('Decupare', sablon([decupare()]), 'a');
  const b = rol('Gravura', sablon([simpla('g', DR(30, 20), { adancime: 1 })]), 'b', [a]);
  assert.deepEqual(citesteRoluri(textRoluri([a, b])), { roluri: [a, b], scriere: true });
  assert.deepEqual(citesteRoluri(null), { roluri: [], scriere: true });
  assert.deepEqual(citesteRoluri('{nu e json'), { roluri: [], scriere: true });
  assert.deepEqual(citesteRoluri(JSON.stringify({ roluri: [a] })), { roluri: [], scriere: true });
  // O aplicație mai nouă a scris lista: nu se citește și nu se rescrie.
  assert.deepEqual(citesteRoluri(JSON.stringify({ v: VERSIUNE_ROLURI + 1, roluri: [a] })), { roluri: [], scriere: false });
  // Un rol rău se sare; un id sau un nume repetat (și cu alte majuscule) rămâne o dată.
  const text = JSON.stringify({ v: VERSIUNE_ROLURI, roluri: [a, { ...b, baza: 'x' }, { ...b, nume: 'Alt nume' , id: 'a' }, { ...b, id: 'c', nume: 'DECUPARE' }, b] });
  assert.deepEqual(citesteRoluri(text).roluri.map((r) => r.id), ['a', 'b']);
  const multe = Array.from({ length: PLAFON_ROLURI.roluri + 1 }, (_, k) => ({ ...a, id: `r${k}`, nume: `Rol ${k}` }));
  assert.equal(citesteRoluri(textRoluri(multe)).roluri.length, PLAFON_ROLURI.roluri);
});

test('lista: numele (gol, lung, folosit cu alte majuscule), aceleași valori, plafonul, redenumirea, ștergerea', () => {
  const s = sablon([decupare()]);
  const motiv = (r: ReturnType<typeof cuRolNou>): string => (r.ok ? 'ok' : r.motiv);
  const a = rol('  Decupare 18  ', s, 'a');
  assert.equal(a.nume, 'Decupare 18');
  const lista = [a];
  const alt = sablon([simpla('g', DR(30, 20), { adancime: 1 })]);
  assert.equal(motiv(cuRolNou(lista, '   ', alt, 'b')), 'nume-gol');
  assert.equal(motiv(cuRolNou(lista, 'x'.repeat(PLAFON_ROLURI.nume + 1), alt, 'b')), 'nume-lung');
  assert.equal(motiv(cuRolNou(lista, 'decupare 18', alt, 'b')), 'nume-folosit');
  assert.deepEqual(cuRolNou(lista, 'Alt nume', s, 'b'), { ok: false, motiv: 'aceleasi-valori', nume: 'Decupare 18' });
  const pline = Array.from({ length: PLAFON_ROLURI.roluri }, (_, k) => ({ ...a, id: `r${k}`, nume: `Rol ${k}` }));
  assert.equal(motiv(cuRolNou(pline, 'Încă unul', alt, 'b')), 'plafon');
  // Redenumirea: propriul nume cu alte majuscule merge; numele altuia, nu; un rol scos din altă filă, nici atât.
  const doua = [a, rol('Gravura', alt, 'b', lista)];
  assert.deepEqual(cuNumeNou(doua, 'a', 'DECUPARE 18'), { ok: true, roluri: [{ ...a, nume: 'DECUPARE 18' }, doua[1]] });
  assert.equal(motiv(cuNumeNou(doua, 'a', 'gravura')), 'nume-folosit');
  assert.equal(motiv(cuNumeNou(doua, 'z', 'Nou')), 'disparut');
  assert.deepEqual(faraRol(doua, 'a'), { ok: true, roluri: [doua[1]] });
  assert.deepEqual(faraRol(doua, 'z'), { ok: true, roluri: doua });
});
