/**
 * Plăcuțele (ADR 0210 §4, §7; felia 11.4↑): literele fiecărei plăcuțe din textul șablonului cu valorile ei, operațiile lor,
 * valorile din panou (acțiunea textului), refacerea la editarea șablonului, «Desprinde» (coacerea), gruparea și degruparea,
 * rolul de tăiere, scalarea și refuzurile cu motiv. Valorile pe hârtie: literele unei plăcuțe sunt chiar literele unui text
 * obișnuit cu același conținut (aceeași așezare, alte id-uri), iar ce taie fiecare operație e același contur, pe rând.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { is } from 'valibot';
import { conturDreptunghi } from '../../src/geom/conturBaza.ts';
import { operatiiPlacutei } from '../../src/io/placuteOperatii.ts';
import { amprentaContururi, blocText } from '../../src/model/blocText.ts';
import { documentNou, noduriPiesa, type Document, type GrupNod, type Instanta, type Nod, type Piesa } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { judecaTexte } from '../../src/model/judecataTexte.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { anuleaza, executa, istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeInstanta, matriceInstanta, taieturiFoaie } from '../../src/model/lume.ts';
import { comenziDesprinde } from '../../src/model/pieseLegate.ts';
import { campuriPiesei, placutaCoapta, textePiesei, valoriPlacutei } from '../../src/model/placute.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { aseazaPeCurba } from '../../src/text/peCurba.ts';
import { piesaText } from '../../src/text/piesaText.ts';
import { textePlacutei } from '../../src/text/placute.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type CerereText, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { comandaText } from '../../src/ui/actiuniDocumentCalcul.ts';

const r0 = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/roboto.ttf', import.meta.url))));
if (!r0.ok) throw new Error(r0.cod);
const font: Font = r0.font;
const FONT = (): Font => font;
const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

const P = (continut: string, extra: Partial<ParametriText> = {}): ParametriText => ({ continut, inaltime: 10, spatiere: 0, interlinie: 1.2, aliniere: 'stanga', ...extra });
const bloc = (p: ParametriText) => ({ ...p, font: 'roboto' });

/** Piesa unui text obișnuit (ca din panoul textului), cu operațiile implicite: profilul pe exterior și pe interior. */
function text(continut: string, id = 'e1', extra: Partial<ParametriText> = {}): Piesa {
  const r = piesaText(aseazaText(font, P(continut, extra)), bloc(P(continut, extra)), id);
  assert.ok(r.ok);
  return r.piesa;
}

/** O plăcuță a piesei `p`: valorile și literele ei, făcute cu fontul. */
function placuta(p: Piesa, id: string, valori: Record<string, string>, x = 20, y = 20): Instanta {
  const r = textePlacutei(p, valori, FONT);
  assert.ok(r.ok);
  return { id, piesa: p.id, x, y, rotire: 0, campuri: r.campuri, ...(r.texte ? { texte: r.texte } : {}) };
}

/** Un document cu piesele date și câte o foaie pe fiecare listă de instanțe (prima e `f1`). */
function doc(piese: Piesa[], foi: Instanta[][]): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const f0 = d.foi[0]!;
  return { ...d, piese, foi: foi.map((instante, k) => ({ ...f0, id: k === 0 ? f0.id : `f${k + 1}`, instante })) };
}

const trece = (d: Document): void => {
  assert.equal(judecaTexte(d), null);
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(d))));
  assert.ok(incarca(JSON.parse(JSON.stringify(d))).ok, 'se redeschide');
};
const instanta = (d: Document, id: string): Instanta => {
  const i = d.foi.flatMap((f) => f.instante).find((x) => x.id === id);
  assert.ok(i, id);
  return i;
};
/** Formele literelor, în ordinea textului. */
const forme = (copii: readonly Nod[]): unknown[] => copii.flatMap((c) => noduriPiesa(c).map((x) => x.nod)).flatMap((n) => (n.tip === 'element' ? [n.forma] : []));
/** Tăieturile unei foi fără id-uri: operația, conturul în lume și valorile, în ordinea tăierii. */
const taieturi = (d: Document, k = 0): string[] => taieturiFoaie(d, k).map((t) => jsonCanonic({ o: t.operatie, f: t.forma, m: t.matrice, l: t.latura, a: t.adancime }));

type Banc = ContextDocument & { readonly h: () => Istoric };
function banc(d: Document, alese: readonly string[] = []): Banc {
  let h = istoricNou(d);
  let s = alese;
  let activa = d.foi[0]?.id ?? '';
  return {
    istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => s, selecteaza: (ids) => { s = ids; }, doarCitire: () => false,
    foaie: () => activa, activeazaFoaie: (id) => { activa = id; }, h: () => h,
  };
}

test('șablonul: textele cu câmpuri ale piesei, câmpurile ei, valorile unei plăcuțe (un câmp fără valoare e gol)', () => {
  const p = text('Masa {nr} {nume}');
  assert.deepEqual(textePiesei(p).map((t) => [t.grup.id, t.campuri]), [['g', ['nr', 'nume']]]);
  assert.deepEqual(campuriPiesei(p), ['nr', 'nume']);
  assert.deepEqual(valoriPlacutei(p, { nr: '7', alt: 'x' }), { nr: '7', alt: 'x', nume: '' });
  assert.deepEqual(campuriPiesei(text('Masa 7')), []);
  const r = textePlacutei(p, { nr: '7' }, FONT);
  assert.ok(r.ok);
  assert.equal(r.texte?.['g']?.continut, 'Masa 7 ');
  // Fără câmpuri, piesa nu e un șablon: valorile rămân, literele lipsesc.
  assert.deepEqual(textePlacutei(text('Masa 7'), { nr: '7' }, FONT), { ok: true, campuri: { nr: '7' }, texte: undefined });
});

test('literele plăcuței sunt literele unui text obișnuit cu același conținut, cu id-uri ale ei; operațiile taie aceleași contururi', () => {
  const p = text('Masa {nr}');
  const i = placuta(p, 'a', { nr: '68' });
  const t = i.texte?.['g'];
  assert.ok(t);
  assert.equal(t.continut, 'Masa 68');
  const obisnuit = text('Masa 68', 'x');
  assert.equal(obisnuit.radacina.tip, 'grup');
  assert.deepEqual(forme(t.copii), forme((obisnuit.radacina as GrupNod).copii));
  const ids = t.copii.flatMap((c) => noduriPiesa(c).map((x) => x.nod.id));
  assert.ok(ids.every((id) => /^t1-[lc]\d+$/.test(id)), ids.join(' '));
  // Fiecare operație a șablonului (exteriorul, interiorul) taie contururile de același fel ale textului obișnuit.
  for (const o of p.operatii) {
    const k = obisnuit.operatii.find((x) => x.latura === o.latura);
    assert.ok(k, o.latura);
    assert.deepEqual(t.operatii[o.id], k.noduri.map((n) => `t1-${n}`), o.latura);
  }
  // „68” are goluri (6, 8, a): interiorul taie ceva.
  assert.ok((t.operatii[p.operatii.find((o) => o.latura === 'interior')!.id] ?? []).length >= 3);
  const d = doc([p], [[i]]);
  trece(d);
  // În lume, plăcuța are literele ei, nu pe ale șablonului; tăieturile ei sunt ale textului obișnuit, pe rând.
  assert.deepEqual(taieturi(d), taieturi(doc([obisnuit], [[{ id: 'b', piesa: 'x', x: 20, y: 20, rotire: 0 }]])));
});

test('un id al plăcuței nu se ciocnește cu unul al piesei: prefixul primește un sufix', () => {
  const p = text('{a}');
  // Un grup al piesei cu un id ca al literelor plăcuței (`t1-l1`): prefixul devine `t1_2-`.
  const rad = p.radacina as GrupNod;
  const copii = [{ ...(rad.copii[0] as GrupNod), id: 't1-l1' }, ...rad.copii.slice(1)];
  const cuId: Piesa = { ...p, radacina: { ...rad, copii, text: { ...(rad['text'] as object), amprenta: amprentaContururi(copii) } } };
  assert.ok(blocText(cuId.radacina));
  const r = textePlacutei(cuId, { a: 'X' }, FONT);
  assert.ok(r.ok);
  assert.ok(r.texte?.['g']?.copii.every((c) => c.id.startsWith('t1_2-')));
});

test('un șablon grupat (rama și textul): rama rămâne, literele plăcuței iau locul textului; operația ramei nu le taie', () => {
  const t = text('Ion {n}', 't');
  const rama: Piesa = {
    id: 'r', radacina: { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: -5, f: -10 } },
    operatii: [{ ...t.operatii[0]!, id: 'o-rama', noduri: ['r'], latura: 'exterior' }],
  };
  const d0 = doc([t, rama], [[{ id: 't', piesa: 't', x: 50, y: 50, rotire: 0 }, { id: 'r', piesa: 'r', x: 50, y: 50, rotire: 0 }]]);
  const b = banc(d0, ['t', 'r']);
  assert.deepEqual(ruleaza(R, 'document.grupeaza', b), { ok: true });
  const d1 = b.h().doc;
  const sablon = d1.piese.find((p) => p.id === d1.foi[0]!.instante[0]!.piesa)!;
  const texte = textePiesei(sablon);
  assert.equal(texte.length, 1);
  const g = texte[0]!.grup.id;
  const i = placuta(sablon, d1.foi[0]!.instante[0]!.id, { n: 'Popescu' }, 50, 50);
  const t2 = i.texte?.[g];
  assert.ok(t2);
  assert.equal(t2.continut, 'Ion Popescu');
  const opRama = sablon.operatii.find((o) => o.noduri.includes('r'))!;
  assert.equal(t2.operatii[opRama.id], undefined, 'rama nu taie literele');
  const d2 = { ...d1, foi: [{ ...d1.foi[0]!, instante: [i] }] };
  trece(d2);
  // În lume: rama și literele plăcuței (nimic din „{n}”).
  const lume = elementeInstanta(sablon.radacina, i, matriceInstanta(i));
  assert.ok(lume.some((e) => e.nod === 'r'));
  assert.ok(lume.filter((e) => e.nod !== 'r').every((e) => e.nod.startsWith('t1-')));
});

test('operațiile plăcuței: doar cele care taie literele șablonului; găurirea nu are pe ce sta', () => {
  const p = text('{a}');
  const r = textePlacutei(p, { a: 'O' }, FONT);
  assert.ok(r.ok);
  const copii = r.texte!['g']!.copii;
  const ext = p.operatii.find((o) => o.latura === 'exterior')!;
  const cuGaurire: Piesa = { ...p, operatii: [...p.operatii, { ...ext, id: 'gaura', tip: 'gaurire' }, { ...ext, id: 'nimic', noduri: ['altceva'] }] };
  const op = operatiiPlacutei(cuGaurire, 'g', copii);
  assert.ok(op);
  assert.deepEqual(Object.keys(op).sort(), p.operatii.map((o) => o.id).sort());
});

test('valorile din panou: acțiunea textului scrie plăcuța într-un pas; piesa schimbată între timp sau literele altei piese: refuz', () => {
  const p = text('Masa {nr}');
  const d0 = doc([p], [[{ id: 'a', piesa: p.id, x: 20, y: 20, rotire: 0 }]]);
  const r = textePlacutei(p, { nr: '7' }, FONT);
  assert.ok(r.ok);
  const cerere: CerereText = { fel: 'placuta', instanta: 'a', piesa: p, campuri: r.campuri, texte: r.texte };
  const c = comandaText(d0, cerere, 'f1');
  assert.ok(c.ok);
  assert.equal(c.comanda.tip, 'inlocuieste-instanta');
  const h1 = executa(istoricNou(d0), c.comanda);
  assert.equal(instanta(h1.doc, 'a').texte?.['g']?.continut, 'Masa 7');
  assert.deepEqual(instanta(h1.doc, 'a').campuri, { nr: '7' });
  trece(h1.doc);
  assert.equal(jsonCanonic(anuleaza(h1).doc.foi), jsonCanonic(d0.foi), 'un pas de anulare');
  // Piesa nu mai e cea pe care s-au făcut literele (alt obiect, de pildă după o schimbare).
  assert.deepEqual(comandaText(d0, { ...cerere, piesa: { ...p } }, 'f1'), { ok: false, motiv: 'motiv.placute' });
  // Literele altui text (alt șablon): ușa le refuză, cu motivul plăcuțelor.
  const altul = textePlacutei(text('Sala {nr}'), { nr: '7' }, FONT);
  assert.ok(altul.ok);
  assert.deepEqual(comandaText(d0, { ...cerere, campuri: altul.campuri, texte: altul.texte }, 'f1'), { ok: false, motiv: 'motiv.placute' });
});

test('editarea șablonului reface literele tuturor plăcuțelor (pe toate foile), într-un pas; fără literele noi, refuz', () => {
  const p = text('Masa {nr}');
  const d0 = doc([p], [[placuta(p, 'a', { nr: '7' }), { id: 'c', piesa: p.id, x: 150, y: 20, rotire: 0 }], [placuta(p, 'b', { nr: '12' })]]);
  trece(d0);
  const nou = P('Sala {nr}', { inaltime: 12 });
  const cerere = (texte: boolean): CerereText => ({
    fel: 'editat', instanta: 'a', piesa: (vechi) => piesaText(aseazaText(font, nou), bloc(nou), vechi.id, undefined, vechi),
    ...(texte ? { texte: (n: Piesa, valori: Readonly<Record<string, string>>) => textePlacutei(n, valori, FONT) } : {}),
  });
  assert.deepEqual(comandaText(d0, cerere(false), 'f1'), { ok: false, motiv: 'motiv.placute' });
  const c = comandaText(d0, cerere(true), 'f1');
  assert.ok(c.ok);
  const d1 = executa(istoricNou(d0), c.comanda).doc;
  assert.equal(instanta(d1, 'a').texte?.['g']?.continut, 'Sala 7');
  assert.equal(instanta(d1, 'b').texte?.['g']?.continut, 'Sala 12');
  assert.equal(instanta(d1, 'c').texte, undefined, 'instanța fără valori rămâne șablonul');
  assert.deepEqual(forme(instanta(d1, 'b').texte!['g']!.copii), forme((text('Sala 12', 'y', { inaltime: 12 }).radacina as GrupNod).copii));
  trece(d1);
  // Textul fără câmpuri: plăcuțele rămân doar cu valorile (toate arată textul piesei).
  const fara = P('Sala');
  const c2 = comandaText(d1, { fel: 'editat', instanta: 'a', piesa: (vechi) => piesaText(aseazaText(font, fara), bloc(fara), vechi.id, undefined, vechi), texte: (n, v) => textePlacutei(n, v, FONT) }, 'f1');
  assert.ok(c2.ok);
  const d2 = executa(istoricNou(d1), c2.comanda).doc;
  assert.equal(instanta(d2, 'a').texte, undefined);
  assert.deepEqual(instanta(d2, 'a').campuri, { nr: '7' });
  trece(d2);
});

test('«Desprinde» o plăcuță: o piesă a ei cu textul ei obișnuit; ce se taie rămâne același; una singură se coace în piesa ei', () => {
  const p = text('Masa {nr}');
  const d0 = doc([p], [[placuta(p, 'a', { nr: '7' }), placuta(p, 'b', { nr: '12' }, 150, 20)]]);
  const inainte = taieturi(d0);
  const h1 = executa(istoricNou(d0), { tip: 'lot', comenzi: comenziDesprinde(d0, new Set(['a']), 'f1') });
  const a = instanta(h1.doc, 'a');
  assert.equal(a.texte, undefined);
  assert.notEqual(a.piesa, p.id);
  const coapta = h1.doc.piese.find((x) => x.id === a.piesa)!;
  assert.equal(blocText(coapta.radacina)?.continut, 'Masa 7');
  assert.equal(coapta.nume, 'Masa 7', 'numele piesei coapte e textul ei, ca la un text');
  assert.deepEqual(taieturi(h1.doc), inainte);
  trece(h1.doc);
  // A doua, rămasă singură: se coace chiar în piesa ei (același id), fără comandă de adăugare.
  const c2 = comenziDesprinde(h1.doc, new Set(['b']), 'f1');
  assert.deepEqual(c2.map((c) => c.tip), ['inlocuieste-instanta', 'inlocuieste-piesa']);
  const h2 = executa(h1, { tip: 'lot', comenzi: c2 });
  assert.equal(instanta(h2.doc, 'b').piesa, p.id);
  assert.equal(blocText(h2.doc.piese.find((x) => x.id === p.id)!.radacina)?.continut, 'Masa 12');
  assert.deepEqual(taieturi(h2.doc), inainte);
  trece(h2.doc);
  // Prin registru, butonul panoului: aceeași coacere, un pas de anulare.
  const b = banc(d0, ['b']);
  assert.deepEqual(ruleaza(R, 'piesa.desprinde', b), { ok: true });
  assert.equal(jsonCanonic(anuleaza(b.h()).doc.foi), jsonCanonic(d0.foi));
});

test('coacerea: un text gol rămâne fără bloc; o operație fără nimic de tăiat pleacă', () => {
  const p = text('{a}');
  const i = placuta(p, 'a', { a: '' });
  assert.deepEqual(i.texte?.['g']?.copii, []);
  assert.deepEqual(i.texte?.['g']?.operatii, {}, 'nicio operație fără nimic de tăiat');
  const c = placutaCoapta(p, i, 'nou');
  assert.equal(blocText(c.piesa.radacina), null);
  assert.deepEqual(c.piesa.operatii, []);
  assert.equal(c.instanta.texte, undefined);
  trece(doc([c.piesa], [[c.instanta]]));
});

test('gruparea unei plăcuțe o coace (anularea o pune la loc); degruparea uneia singure îi păstrează literele', () => {
  const p = text('Masa {nr}');
  const rama: Piesa = {
    id: 'r', radacina: { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
    operatii: [{ ...p.operatii[0]!, id: 'o-rama', noduri: ['r'] }],
  };
  const d0 = doc([p, rama], [[placuta(p, 'a', { nr: '7' }, 30, 30), { id: 'r', piesa: 'r', x: 25, y: 20, rotire: 0 }]]);
  const inainte = new Set(taieturi(d0));
  const b = banc(d0, ['a', 'r']);
  assert.deepEqual(ruleaza(R, 'document.grupeaza', b), { ok: true });
  const d1 = b.h().doc;
  assert.equal(d1.foi[0]!.instante.length, 1);
  assert.equal(d1.foi[0]!.instante[0]!.texte, undefined);
  assert.deepEqual(new Set(taieturi(d1)), inainte, 'aceleași tăieturi (grupul le ordonează altfel)');
  trece(d1);
  assert.equal(jsonCanonic(anuleaza(b.h()).doc.foi), jsonCanonic(d0.foi), 'anularea pune plăcuța la loc');
  // Textul copt e un text obișnuit (fără câmpuri), cu textul plăcuței.
  const grup = d1.piese[0]!;
  assert.deepEqual(textePiesei(grup), []);
  assert.ok(noduriPiesa(grup.radacina).some((x) => blocText(x.nod)?.continut === 'Masa 7'));
  // Un șablon grupat (rama și textul cu câmpul) cu o singură plăcuță: degruparea dă rama și textul plăcuței, copt.
  const d2 = doc([p, rama], [[{ id: 't', piesa: p.id, x: 30, y: 30, rotire: 0 }, { id: 'r', piesa: 'r', x: 25, y: 20, rotire: 0 }]]);
  const b2 = banc(d2, ['t', 'r']);
  assert.deepEqual(ruleaza(R, 'document.grupeaza', b2), { ok: true });
  const sablon = b2.h().doc.piese[0]!;
  const id = b2.h().doc.foi[0]!.instante[0]!.id;
  const d3 = { ...b2.h().doc, foi: [{ ...b2.h().doc.foi[0]!, instante: [placuta(sablon, id, { nr: '12' }, b2.h().doc.foi[0]!.instante[0]!.x, b2.h().doc.foi[0]!.instante[0]!.y)] }] };
  trece(d3);
  const inainte3 = new Set(taieturi(d3));
  const b3 = banc(d3, [id]);
  assert.deepEqual(ruleaza(R, 'document.degrupeaza', b3), { ok: true });
  const d4 = b3.h().doc;
  assert.equal(d4.foi[0]!.instante.length, 2);
  assert.ok(d4.foi[0]!.instante.every((i) => i.texte === undefined));
  assert.ok(d4.piese.some((x) => blocText(x.radacina)?.continut === 'Masa 12'));
  assert.deepEqual(new Set(taieturi(d4)), inainte3);
  trece(d4);
});

test('rolul de tăiere al unui șablon mută operațiile noi și pe literele plăcuțelor', () => {
  const p = text('Masa {nr}');
  const d0 = doc([p], [[placuta(p, 'a', { nr: '68' }), placuta(p, 'b', { nr: '9' }, 150, 20)]]);
  const b = banc(d0, ['a']);
  assert.deepEqual(ruleaza(R, 'document.rol', { ...b, rolNou: () => 'pe-linie' }), { ok: true });
  const d1 = b.h().doc;
  const op = d1.piese[0]!.operatii;
  assert.equal(op.length, 1);
  for (const id of ['a', 'b']) {
    const t = instanta(d1, id).texte!['g']!;
    const toate = t.copii.flatMap((c) => noduriPiesa(c).map((x) => x.nod)).filter((n) => n.tip === 'element').map((n) => n.id);
    assert.deepEqual(t.operatii, { [op[0]!.id]: toate }, id);
  }
  trece(d1);
});

test('scalarea unui șablon scalează literele tuturor plăcuțelor lui; textul grupat își ține blocul; înclinarea e refuzată', () => {
  const p = text('Masa {nr}');
  const d0 = doc([p], [[placuta(p, 'a', { nr: '7' })], [placuta(p, 'b', { nr: '12' })]]);
  const b = banc(d0, ['a']);
  assert.deepEqual(ruleaza(R, 'document.transforma', { ...b, transformare: () => ({ fel: 'scalare', sx: 2, sy: 2, ancora: { x: 20, y: 20 } }) }), { ok: true });
  const d1 = b.h().doc;
  assert.equal(blocText(d1.piese[0]!.radacina)?.inaltime, 20);
  const dublu = (txt: string) => forme((text(txt, 'y', { inaltime: 20 }).radacina as GrupNod).copii);
  const aproape = (x: unknown, y: unknown): void => {
    const a = JSON.stringify(x).match(/-?\d+(\.\d+)?(e-?\d+)?/g)!.map(Number), c = JSON.stringify(y).match(/-?\d+(\.\d+)?(e-?\d+)?/g)!.map(Number);
    assert.equal(a.length, c.length);
    a.forEach((v, k) => { assert.ok(Math.abs(v - c[k]!) < 1e-9, `${v} ≠ ${c[k]}`); });
  };
  aproape(forme(instanta(d1, 'a').texte!['g']!.copii), dublu('Masa 7'));
  aproape(forme(instanta(d1, 'b').texte!['g']!.copii), dublu('Masa 12'));
  trece(d1);
  // Înclinarea: literele șablonului nu mai sunt un text, deci plăcuțele n-ar mai avea șablon.
  const b2 = banc(d0, ['a']);
  assert.equal(stare(R, 'document.transforma', { ...b2, transformare: () => ({ fel: 'inclinare', unghiX: 10, unghiY: 0, centru: { x: 0, y: 0 } }) }).ok, false);
  const s = stare(R, 'document.transforma', { ...b2, transformare: () => ({ fel: 'inclinare', unghiX: 10, unghiY: 0, centru: { x: 0, y: 0 } }) });
  assert.deepEqual(s, { ok: false, motiv: 'motiv.placute' });
  // Un text grupat (șablonul cu ramă): blocul lui rămâne valid după o scalare uniformă.
  const t = text('Ion {n}', 't');
  const rama: Piesa = { id: 'r', radacina: { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] };
  const b3 = banc(doc([t, rama], [[{ id: 't', piesa: 't', x: 50, y: 50, rotire: 0 }, { id: 'r', piesa: 'r', x: 40, y: 40, rotire: 0 }]]), ['t', 'r']);
  assert.deepEqual(ruleaza(R, 'document.grupeaza', b3), { ok: true });
  assert.deepEqual(ruleaza(R, 'document.transforma', { ...b3, transformare: () => ({ fel: 'scalare', sx: 1.5, sy: 1.5, ancora: { x: 0, y: 0 } }) }), { ok: true });
  const sablon = b3.h().doc.piese[0]!;
  assert.deepEqual(textePiesei(sablon).map((x) => x.bloc.inaltime), [15]);
});

test('editarea nodurilor unei litere a șablonului e refuzată cu motivul plăcuțelor', () => {
  const p = text('{a}');
  const d0 = doc([p], [[placuta(p, 'a', { a: 'X' })]]);
  const el = noduriPiesa(p.radacina).map((x) => x.nod).find((n) => n.tip === 'element')!;
  const b = banc(d0, ['a']);
  const s = stare(R, 'document.forma', { ...b, nodEditat: () => el.id, formaEditata: () => ({ tip: 'cale', inchis: true, varfuri: conturDreptunghi(0, 0, 5, 5, 0).varfuri.map((v) => ({ p: v.p, s: { tip: 'L' } })) }) });
  assert.deepEqual(s, { ok: false, motiv: 'motiv.placute' });
});

test('caseta limitată: plăcuța pornește de la înălțimea cerută, nu de la cea a șablonului; un text care nu încape e refuzat', () => {
  const caseta = { fel: 'limita' as const, latime: 20, inaltime: 15, ceruta: 10 };
  const sab = P('{nume}', { caseta });
  const a = aseazaText(font, sab);
  assert.ok(a.inaltime < 10, 'șablonul s-a micșorat');
  const r = piesaText(a, { ...bloc(sab), inaltime: a.inaltime }, 'e1');
  assert.ok(r.ok);
  const i = placuta(r.piesa, 'a', { nume: 'Al' });
  const al = aseazaText(font, P('Al', { caseta }));
  assert.equal(al.inaltime, 10, '„Al” încape la înălțimea cerută');
  const ob = piesaText(al, { ...bloc(P('Al', { caseta })), inaltime: al.inaltime }, 'x');
  assert.ok(ob.ok);
  assert.deepEqual(forme(i.texte!['g']!.copii), forme((ob.piesa.radacina as GrupNod).copii));
  assert.deepEqual(textePlacutei(r.piesa, { nume: 'X'.repeat(900) }, FONT), { ok: false, motiv: 'caseta' });
});

test('un șablon pe curbă: literele plăcuței stau pe aceeași curbă, ca ale unui text obișnuit cu același conținut', () => {
  const curba = {
    inchis: false, varfuri: [{ p: { x: -50, y: 0 }, s: { tip: 'A' as const, bulge: -0.4 } }, { p: { x: 50, y: 0 }, s: { tip: 'L' as const } }],
    s: 50, pozitie: 'baza' as const, distanta: 0, invers: false, orientare: 'rotita' as const, intinsa: false,
  };
  const peCurba = (continut: string, id: string): Piesa => {
    const p = P(continut, { aliniere: 'centru' });
    const drept = aseazaText(font, p);
    const a = aseazaPeCurba(drept, { contur: { inchis: curba.inchis, varfuri: curba.varfuri }, s: curba.s, pozitie: curba.pozitie, distanta: curba.distanta,
      invers: curba.invers, orientare: curba.orientare, intinsa: curba.intinsa }, drept.majuscula, 'centru');
    assert.ok(a);
    const r = piesaText(a, { ...bloc(p), curba }, id);
    assert.ok(r.ok);
    return r.piesa;
  };
  const p = peCurba('Masa {nr}', 'e1');
  assert.ok(blocText(p.radacina)?.curba);
  const i = placuta(p, 'a', { nr: '7' });
  assert.deepEqual(forme(i.texte!['g']!.copii), forme((peCurba('Masa 7', 'x').radacina as GrupNod).copii));
  assert.notDeepEqual(forme(i.texte!['g']!.copii), forme((text('Masa 7', 'y', { aliniere: 'centru' }).radacina as GrupNod).copii), 'nu e textul drept');
  trece(doc([p], [[i]]));
});

test('un câmp și un grup numite `__proto__` sau `constructor` sunt date (ADR 0024 §9): plăcuța se face, ușa o judecă și o păstrează', () => {
  const p = text('A{__proto__}{constructor}B');
  assert.deepEqual(campuriPiesei(p), ['__proto__', 'constructor']);
  const gol = valoriPlacutei(p, {});
  assert.ok(Object.hasOwn(gol, '__proto__') && Object.hasOwn(gol, 'constructor'));
  const i = placuta(p, 'a', {});
  assert.equal(i.texte?.['g']?.continut, 'AB');
  const cu: Record<string, string> = { constructor: 'y' };
  Object.defineProperty(cu, '__proto__', { value: 'x', enumerable: true, writable: true, configurable: true });
  const j = placuta(p, 'b', cu, 100, 20);
  assert.equal(j.texte?.['g']?.continut, 'AxyB');
  const d = doc([p], [[i, j]]);
  trece(d);
  const r = incarca(JSON.parse(JSON.stringify(d)));
  assert.ok(r.ok);
  assert.equal(jsonCanonic(r.doc.foi), jsonCanonic(d.foi), 'ușa păstrează cheile');
});

test('o plăcuță sub o cheie pe care validatorul o sare (`constructor`) e judecată de ușă: litere stricate, valori greșite, refuz', () => {
  // Grupul textului se cheamă `constructor`: cheia din `texte` e sărită de dicționarul validatorului, dar ușa o judecă.
  const p0 = text('Masa {nr}');
  const rad = p0.radacina as GrupNod;
  const p: Piesa = { ...p0, radacina: { ...rad, id: 'constructor' } };
  const bun = placuta(p, 'a', { nr: '7' });
  assert.ok(bun.texte && Object.hasOwn(bun.texte, 'constructor'));
  trece(doc([p], [[bun]]));
  const brut = (i: unknown): Document => JSON.parse(JSON.stringify(doc([p], [[i as Instanta]]))) as Document;
  const t = bun.texte['constructor']!;
  // Litere în altă formă (copiii nu sunt o listă), alt text decât al valorilor, o operație cu o listă care nu e listă.
  for (const [ce, rau] of [
    ['litere stricate', { ...bun, texte: { constructor: { ...t, copii: 'x' } } }],
    ['alt text', { ...bun, texte: { constructor: { ...t, continut: 'Masa 8' } } }],
    ['o valoare care nu e text', { ...bun, campuri: { nr: '7', constructor: 5 } }],
  ] as const) {
    const r = incarca(brut(rau));
    assert.equal(r.ok, false, ce);
  }
  const op = { ...p, operatii: [{ ...p.operatii[0]!, id: 'constructor' }, ...p.operatii.slice(1)] };
  const cuOp = placuta(op, 'a', { nr: '7' });
  const lista = { ...cuOp, texte: { constructor: { ...cuOp.texte!['constructor']!, operatii: { ...cuOp.texte!['constructor']!.operatii, constructor: 'x' } } } };
  assert.equal(incarca(JSON.parse(JSON.stringify(doc([op], [[lista as unknown as Instanta]])))).ok, false, 'lista operației sărite');
});
