/**
 * «Din CSV…» în calcul (ADR 0210 §4, felia 11.4↑b): cererea `placute` (primul rând pe plăcuța aleasă, restul instanțe noi,
 * toate așezate pe foi, într-un pas, cu anularea exactă și refuzurile), cererea `sablon` („Fă din textul ales câmpul”: textul
 * șablonului schimbat, plăcuțele refăcute), textul unui șablon grupat (rama rămâne, literele noi au id-uri libere, operațiile
 * se mută pe ele) și cât s-a micșorat o plăcuță în caseta „Limitat de casetă”. Valorile pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { is } from 'valibot';
import { ASEZARE_IMPLICITA } from '../../src/model/asezare.ts';
import { blocText } from '../../src/model/blocText.ts';
import { documentNou, noduriPiesa, type Document, type GrupNod, type Instanta, type Piesa } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { judecaTexte } from '../../src/model/judecataTexte.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { anuleaza, executa, istoricNou } from '../../src/model/jurnal.ts';
import { blocuriPiesei, campuriPiesei, textePiesei } from '../../src/model/placute.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { piesaText } from '../../src/text/piesaText.ts';
import { sablonCuContinut, textePlacutei } from '../../src/text/placute.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type CerereText, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { comandaText } from '../../src/ui/actiuniDocumentCalcul.ts';

const r0 = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/roboto.ttf', import.meta.url))));
if (!r0.ok) throw new Error(r0.cod);
const font: Font = r0.font;
const FONT = (): Font => font;
const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

const P = (continut: string, extra: Partial<ParametriText> = {}): ParametriText => ({ continut, inaltime: 10, spatiere: 0, interlinie: 1.2, aliniere: 'stanga', ...extra });
const bloc = (p: ParametriText) => ({ ...p, font: 'roboto' });
function text(continut: string, id = 'e1', extra: Partial<ParametriText> = {}): Piesa {
  const r = piesaText(aseazaText(font, P(continut, extra)), bloc(P(continut, extra)), id);
  assert.ok(r.ok);
  return r.piesa;
}
function doc(piese: Piesa[], instante: Instanta[]): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese, foi: [{ ...d.foi[0]!, instante }] };
}
const trece = (d: Document): void => {
  assert.equal(judecaTexte(d), null);
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(d))));
  assert.ok(incarca(JSON.parse(JSON.stringify(d))).ok, 'se redeschide');
};
const forme = (copii: readonly unknown[]): unknown[] => (copii as GrupNod[]).flatMap((c) => noduriPiesa(c).map((x) => x.nod)).flatMap((n) => (n.tip === 'element' ? [n.forma] : []));
const randuri = (p: Piesa, valori: ReadonlyArray<Record<string, string>>) => valori.map((v) => {
  const r = textePlacutei(p, v, FONT);
  assert.ok(r.ok);
  return { campuri: r.campuri, texte: r.texte };
});

test('plăcuțele din CSV: primul rând pe plăcuța aleasă, restul instanțe noi, toate așezate pe foaie, într-un pas', () => {
  const p = text('{nume}');
  const d0 = doc([p], [{ id: 'a', piesa: p.id, x: 150, y: 100, rotire: 0 }]);
  const c = comandaText(d0, { fel: 'placute', instanta: 'a', piesa: p, randuri: randuri(p, [{ nume: 'Ana' }, { nume: 'Ion' }, { nume: 'Eva' }]), asezare: { ...ASEZARE_IMPLICITA, distantaX: 6, distantaY: 6 } }, 'f1');
  assert.ok(c.ok);
  const h = executa(istoricNou(d0), c.comanda);
  const inst = h.doc.foi[0]!.instante;
  assert.deepEqual(inst.map((i) => [i.piesa, i.campuri, i.texte?.['g']?.continut]), [[p.id, { nume: 'Ana' }, 'Ana'], [p.id, { nume: 'Ion' }, 'Ion'], [p.id, { nume: 'Eva' }, 'Eva']]);
  assert.equal(inst[0]!.id, 'a', 'primul rând ia plăcuța aleasă');
  // Așezate din stânga-sus, cu marginea 10, pe același rând (literele de 10 mm încap): x crește, nu se suprapun.
  const xs = inst.map((i) => i.x);
  assert.ok(xs[0]! < xs[1]! && xs[1]! < xs[2]!, xs.join(' '));
  trece(h.doc);
  assert.equal(jsonCanonic(anuleaza(h).doc.foi), jsonCanonic(d0.foi), 'un pas de anulare');
});

test('plăcuțele din CSV: refuzurile (piesa schimbată, prea multe, distanța sub freză, nimic)', () => {
  const p = text('{nume}');
  const d0 = doc([p], [{ id: 'a', piesa: p.id, x: 150, y: 100, rotire: 0 }]);
  const cerere = (x: Partial<Extract<CerereText, { fel: 'placute' }>>): CerereText => ({
    fel: 'placute', instanta: 'a', piesa: p, randuri: randuri(p, [{ nume: 'Ana' }, { nume: 'Ion' }]), asezare: { ...ASEZARE_IMPLICITA, distantaX: 6, distantaY: 6 }, ...x,
  });
  assert.deepEqual(comandaText(d0, cerere({ piesa: { ...p } }), 'f1'), { ok: false, motiv: 'motiv.placute' });
  assert.deepEqual(comandaText(d0, cerere({ randuri: [] }), 'f1'), { ok: false, motiv: 'motiv.nimic-ales' });
  // Freza profilului exterior e Ø6: distanța 5 ar face tăieturile să intre una în alta.
  assert.deepEqual(comandaText(d0, cerere({ asezare: ASEZARE_IMPLICITA }), 'f1'), { ok: false, motiv: 'motiv.aseaza-distanta' });
  // Cel mult 1 000 de instanțe ale piesei (ca «Încă…»): 1 + 1 000 nu.
  const r1 = randuri(p, [{ nume: 'Ana' }])[0]!;
  assert.deepEqual(comandaText(d0, cerere({ randuri: Array.from({ length: 1_001 }, () => r1) }), 'f1'), { ok: false, motiv: 'motiv.inca-total' });
});

test('textul unui șablon pe rădăcină schimbat din fereastra CSV: „Fă din textul ales câmpul”, plăcuțele refăcute', () => {
  const p = text('Masa {nr}');
  const placuta = (id: string, nr: string): Instanta => {
    const r = textePlacutei(p, { nr }, FONT);
    assert.ok(r.ok);
    return { id, piesa: p.id, x: 20, y: 20, rotire: 0, campuri: r.campuri, ...(r.texte ? { texte: r.texte } : {}) };
  };
  const d0 = doc([p], [placuta('a', '7'), placuta('b', '8')]);
  const nou = sablonCuContinut(p, 'g', '{loc} {nr}', font);
  assert.ok(nou.ok);
  assert.equal(blocText(nou.piesa.radacina)?.continut, '{loc} {nr}');
  assert.deepEqual(campuriPiesei(nou.piesa), ['loc', 'nr']);
  const c = comandaText(d0, { fel: 'sablon', instanta: 'a', piesa: p, nou: nou.piesa, texte: (n, v) => textePlacutei(n, v, FONT) }, 'f1');
  assert.ok(c.ok);
  const d1 = executa(istoricNou(d0), c.comanda).doc;
  assert.deepEqual(d1.foi[0]!.instante.map((i) => [i.campuri, i.texte?.['g']?.continut]), [[{ nr: '7', loc: '' }, ' 7'], [{ nr: '8', loc: '' }, ' 8']]);
  trece(d1);
  // Pe o piesă schimbată între timp: refuz.
  assert.deepEqual(comandaText(d0, { fel: 'sablon', instanta: 'a', piesa: { ...p }, nou: nou.piesa, texte: (n, v) => textePlacutei(n, v, FONT) }, 'f1'), { ok: false, motiv: 'motiv.placute' });
});

test('textul unui șablon grupat (rama și textul): rama rămâne, literele noi au id-uri libere, operațiile textului se mută pe ele', () => {
  const t = text('Ion', 't');
  const rama: Piesa = {
    id: 'r', radacina: { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: -5, f: -10 } },
    operatii: [{ ...t.operatii[0]!, id: 'o-rama', noduri: ['r'], latura: 'exterior' }],
  };
  const d0 = doc([t, rama], [{ id: 't', piesa: 't', x: 50, y: 50, rotire: 0 }, { id: 'r', piesa: 'r', x: 50, y: 50, rotire: 0 }]);
  let h = istoricNou(d0);
  let s: readonly string[] = ['t', 'r'];
  const ctx: ContextDocument = { istoric: () => h, scrie: (x) => { h = x; }, selectie: () => s, selecteaza: (x) => { s = x; }, doarCitire: () => false, foaie: () => 'f1' };
  assert.deepEqual(ruleaza(R, 'document.grupeaza', ctx), { ok: true });
  const sablon = h.doc.piese[0]!;
  const [b] = blocuriPiesei(sablon);
  assert.ok(b);
  assert.notEqual(b.grup.id, sablon.radacina.id, 'textul e un grup sub rădăcină');
  assert.deepEqual(textePiesei(sablon), [], 'fără câmpuri încă');
  const nou = sablonCuContinut(sablon, b.grup.id, '{Nume}', font);
  assert.ok(nou.ok);
  const [b2] = blocuriPiesei(nou.piesa);
  assert.equal(b2?.bloc.continut, '{Nume}');
  assert.deepEqual(campuriPiesei(nou.piesa), ['Nume']);
  // Rama e aceeași (forma și operația ei); literele textului sunt ale unui text obișnuit „{Nume}”.
  assert.ok(noduriPiesa(nou.piesa.radacina).some((x) => x.nod.tip === 'element' && x.nod.forma.tip === 'dreptunghi'));
  assert.ok(nou.piesa.operatii.some((o) => o.noduri.includes('r') && o.noduri.length === 1), 'operația ramei taie doar rama');
  assert.deepEqual(forme(b2!.grup.copii), forme((text('{Nume}', 'x').radacina as GrupNod).copii));
  // Id-urile: unice în piesă; fiecare operație taie doar elemente ale piesei.
  const ids = noduriPiesa(nou.piesa.radacina).map((x) => x.nod.id);
  assert.equal(new Set(ids).size, ids.length);
  const elemente = new Set(noduriPiesa(nou.piesa.radacina).filter((x) => x.nod.tip === 'element').map((x) => x.nod.id));
  assert.ok(nou.piesa.operatii.every((o) => o.noduri.length > 0 && o.noduri.every((n) => elemente.has(n))));
  // Operațiile care tăiau literele vechi le taie pe cele noi (exteriorul și interiorul acoladelor și ale literelor).
  const litere = new Set(b2!.grup.copii.flatMap((c) => noduriPiesa(c).map((x) => x.nod.id)));
  assert.ok(nou.piesa.operatii.some((o) => o.noduri.some((n) => litere.has(n))));
  const d1 = { ...h.doc, piese: [nou.piesa] };
  trece(d1);
  // Spațierile literelor alese țin de caracterele textului vechi: textul nou nu le are.
  assert.equal(b2!.bloc.spatieri, undefined);
});

test('textul grupat schimbat: un id al ramei ca al unei litere noi (c1) primește sufix; spațierile vechi pleacă; operația golurilor, fără goluri, pleacă', () => {
  // Textul „OAO”, cu o spațiere după primul O; rama e elementul `c1` (ca o literă nouă) și stă prima pe foaie, deci își
  // păstrează id-ul la grupare, iar literele textului vechi îl primesc cu sufix.
  const p0 = P('OAO', { spatieri: [{ dupa: 0, mm: 2 }] });
  const r = piesaText(aseazaText(font, p0), bloc(p0), 't');
  assert.ok(r.ok);
  const t = r.piesa;
  assert.ok(t.operatii.some((o) => o.latura === 'interior'), 'golurile lui O și A au profilul lor');
  const rama: Piesa = {
    id: 'r', radacina: { tip: 'element', id: 'c1', forma: { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: -5, f: -10 } },
    operatii: [{ ...t.operatii[0]!, id: 'o-rama', noduri: ['c1'], latura: 'exterior' }],
  };
  const d0 = doc([rama, t], [{ id: 'r', piesa: 'r', x: 50, y: 50, rotire: 0 }, { id: 't', piesa: 't', x: 50, y: 50, rotire: 0 }]);
  let h = istoricNou(d0);
  let s: readonly string[] = ['r', 't'];
  const ctx: ContextDocument = { istoric: () => h, scrie: (x) => { h = x; }, selectie: () => s, selecteaza: (x) => { s = x; }, doarCitire: () => false, foaie: () => 'f1' };
  assert.deepEqual(ruleaza(R, 'document.grupeaza', ctx), { ok: true });
  const sablon = h.doc.piese[0]!;
  const [b] = blocuriPiesei(sablon);
  assert.ok(b && b.bloc.spatieri?.length === 1, 'textul grupat își are spațierea');
  assert.ok(noduriPiesa(sablon.radacina).some((x) => x.nod.id === 'c1' && x.nod.tip === 'element' && x.nod.forma.tip === 'dreptunghi'));
  // „{x}”: acoladele și x n-au goluri.
  const nou = sablonCuContinut(sablon, b.grup.id, '{x}', font);
  assert.ok(nou.ok);
  const ids = noduriPiesa(nou.piesa.radacina).map((x) => x.nod.id);
  assert.equal(new Set(ids).size, ids.length, 'id-urile rămân unice');
  assert.ok(ids.includes('c1_2'), 'litera nouă c1 a primit sufixul');
  assert.equal(blocuriPiesei(nou.piesa)[0]?.bloc.spatieri, undefined);
  assert.ok(nou.piesa.operatii.every((o) => o.noduri.length > 0), 'nicio operație fără nimic de tăiat');
  assert.ok(!nou.piesa.operatii.some((o) => o.latura === 'interior'), 'profilul golurilor a plecat');
  trece({ ...h.doc, piese: [nou.piesa] });
});

test('caseta „Limitat de casetă”: plăcuța cu un nume prea lung e micșorată, iar rezultatul spune cât', () => {
  const caseta = { fel: 'limita' as const, latime: 40, inaltime: 15, ceruta: 10 };
  const a = aseazaText(font, P('{nume}', { caseta }));
  const r = piesaText(a, { ...bloc(P('{nume}', { caseta })), inaltime: a.inaltime }, 'e1');
  assert.ok(r.ok);
  const scurt = textePlacutei(r.piesa, { nume: 'Ana' }, FONT);
  assert.ok(scurt.ok);
  assert.equal(scurt.micsorat, undefined, '„Ana” încape la 10 mm');
  const lung = textePlacutei(r.piesa, { nume: 'Alexandra Constantinescu' }, FONT);
  assert.ok(lung.ok);
  assert.ok(lung.micsorat !== undefined && lung.micsorat < 0.5 && lung.micsorat > 0.1, String(lung.micsorat));
  // Pe hârtie: înălțimea care a încăput e chiar a unui text obișnuit limitat de aceeași casetă.
  const ob = aseazaText(font, P('Alexandra Constantinescu', { caseta }));
  assert.ok(Math.abs((lung.micsorat ?? 0) - ob.inaltime / 10) < 1e-12);
});
