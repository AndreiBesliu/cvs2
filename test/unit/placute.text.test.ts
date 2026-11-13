/**
 * Unealta Text pe un șablon cu ramă (ADR 0210 §4, felia 11.4↑c): textul grupat se alege la clic pe literele lui (cutia lor în
 * lume, ale plăcuței dacă instanța e una), iar «Aplică» îi înlocuiește literele cu cele ale blocului nou (`sablonCuAsezat`):
 * rama și locul textului rămân, id-urile noi sunt libere, operațiile textului se mută pe literele noi, iar plăcuțele piesei se
 * refac în același pas. Valorile pe hârtie: rama 100 × 30, textul în (10, 10), înălțimea 10 → 6 mm.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blocText } from '../../src/model/blocText.ts';
import { cutieContur } from '../../src/geom/cutie.ts';
import { documentNou, noduriPiesa, type Document, type GrupNod, type Instanta, type Nod, type Piesa } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { judecaTexte } from '../../src/model/judecataTexte.ts';
import { anuleaza, executa, istoricNou } from '../../src/model/jurnal.ts';
import { blocuriPiesei } from '../../src/model/placute.ts';
import { texteGrupate, textLovit } from '../../src/app/texteGrupate.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { piesaText } from '../../src/text/piesaText.ts';
import { sablonCuAsezat, textePlacutei } from '../../src/text/placute.ts';
import { comandaText } from '../../src/ui/actiuniDocumentCalcul.ts';

const r0 = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/roboto.ttf', import.meta.url))));
if (!r0.ok) throw new Error(r0.cod);
const font: Font = r0.font;
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

const P = (continut: string, inaltime = 10): ParametriText => ({ continut, inaltime, spatiere: 0, interlinie: 1.2, aliniere: 'stanga' });
/** Șablonul: rama 100 × 30 (cu o operație) și textul „{nume}” grupat în (10, 10), cu operația lui pe litere. */
function sablon(): Piesa {
  const t = piesaText(aseazaText(font, P('{nume}')), { ...P('{nume}'), font: 'roboto' }, 'x');
  assert.ok(t.ok);
  const g = t.piesa.radacina;
  assert.ok(g.tip === 'grup');
  const rama: Nod = { tip: 'element', id: 'rama', forma: { tip: 'dreptunghi', latime: 100, inaltime: 30, razaColt: 0 }, matrice: ID };
  return {
    id: 'p', nume: 'Ecuson',
    radacina: { tip: 'grup', id: 'rad', matrice: ID, copii: [rama, { ...g, id: 'txt', matrice: { ...ID, e: 10, f: 10 } }] },
    operatii: [
      { ...t.piesa.operatii[0]!, id: 'o-rama', noduri: ['rama'], latura: 'exterior' },
      { ...t.piesa.operatii[0]!, id: 'o-text', noduri: noduriPiesa(g).filter((x) => x.nod.tip === 'element').map((x) => x.nod.id) },
    ],
  };
}
const literele = (p: Piesa, g = 'txt'): Nod[] => {
  const x = noduriPiesa(p.radacina).find((y) => y.nod.id === g)?.nod;
  return x?.tip === 'grup' ? x.copii.flatMap((c) => noduriPiesa(c).map((y) => y.nod)).filter((n) => n.tip === 'element') : [];
};
function doc(p: Piesa, instante: Instanta[]): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese: [p], foi: [{ ...d.foi[0]!, instante }] };
}

test('sablonCuAsezat: textul grupat cu înălțimea 6 în loc de 10; rama, locul grupului și operația ramei rămân; operația textului taie literele noi', () => {
  const p = sablon();
  const nou = sablonCuAsezat(p, 'txt', aseazaText(font, P('{nume}', 6)), { ...P('{nume}', 6), font: 'roboto' });
  assert.ok(nou.ok);
  const [b] = blocuriPiesei(nou.piesa);
  assert.equal(b?.grup.id, 'txt');
  assert.equal(b?.bloc.inaltime, 6);
  assert.deepEqual(b?.grup.matrice, { ...ID, e: 10, f: 10 }, 'locul textului pe ramă rămâne');
  assert.ok(noduriPiesa(nou.piesa.radacina).some((x) => x.nod.id === 'rama'), 'rama rămâne');
  const ids = noduriPiesa(nou.piesa.radacina).map((x) => x.nod.id);
  assert.equal(new Set(ids).size, ids.length, 'id-uri unice');
  const noi = new Set(literele(nou.piesa).map((n) => n.id));
  assert.deepEqual(nou.piesa.operatii.find((o) => o.id === 'o-rama')?.noduri, ['rama']);
  const oText = nou.piesa.operatii.find((o) => o.id === 'o-text');
  assert.ok(oText && oText.noduri.length > 0 && oText.noduri.every((n) => noi.has(n)), 'operația textului taie doar literele noi');
  // Literele noi au 6 / 10 din înălțimea celor vechi (aceeași majusculă a fontului, alt bloc).
  const inalt = (q: Piesa): number => {
    const c = literele(q).map((n) => cutieContur(conturElement({ forma: (n as Extract<Nod, { tip: 'element' }>).forma, matrice: ID })));
    return Math.max(...c.map((x) => x.maxY)) - Math.min(...c.map((x) => x.minY));
  };
  assert.ok(Math.abs(inalt(nou.piesa) / inalt(p) - 0.6) < 1e-9, String(inalt(nou.piesa) / inalt(p)));
  // Un grup fără bloc valid (rama nu e un text): refuz, fără piesă.
  assert.deepEqual(sablonCuAsezat(p, 'rama', aseazaText(font, P('x')), { ...P('x'), font: 'roboto' }), { ok: false, motiv: 'gol' });
  assert.deepEqual(sablonCuAsezat(p, 'nu-exista', aseazaText(font, P('x')), { ...P('x'), font: 'roboto' }), { ok: false, motiv: 'gol' });
  // Nici rădăcina șablonului (un grup fără bloc): altfel textul ar lua locul piesei întregi, cu ramă cu tot.
  assert.deepEqual(sablonCuAsezat(p, 'rad', aseazaText(font, P('x')), { ...P('x'), font: 'roboto' }), { ok: false, motiv: 'gol' });
});

test('cererea editat cu grupul: un pas, plăcuțele refăcute cu blocul nou, anularea exactă; grupul care nu e text, refuz', () => {
  const p = sablon();
  const pl = textePlacutei(p, { nume: 'Ana' }, () => font);
  assert.ok(pl.ok && pl.texte);
  const d0 = doc(p, [
    { id: 'a', piesa: 'p', x: 10, y: 10, rotire: 0, campuri: pl.campuri, texte: pl.texte },
    { id: 'b', piesa: 'p', x: 10, y: 60, rotire: 0 },
  ]);
  assert.equal(judecaTexte(d0), null);
  const c = comandaText(d0, {
    fel: 'editat', instanta: 'b', grup: 'txt',
    piesa: (vechi) => sablonCuAsezat(vechi, 'txt', aseazaText(font, P('{nume}', 6)), { ...P('{nume}', 6), font: 'roboto' }),
    texte: (nou, valori) => textePlacutei(nou, valori, () => font),
  }, 'f1');
  assert.ok(c.ok, c.ok ? '' : c.motiv);
  const h = executa(istoricNou(d0), c.comanda);
  const d1 = h.doc;
  assert.equal(judecaTexte(d1), null);
  assert.ok(incarca(JSON.parse(JSON.stringify(d1))).ok, 'se redeschide');
  // Plăcuța „Ana” are literele blocului nou: înălțimea 6 în textul ei.
  const placuta = d1.foi[0]!.instante.find((i) => i.id === 'a');
  const g = noduriPiesa(d1.piese[0]!.radacina).find((x) => x.nod.id === 'txt')?.nod as GrupNod;
  assert.equal(blocText(g)?.inaltime, 6);
  assert.equal(placuta?.texte?.['txt']?.continut, 'Ana');
  assert.notDeepEqual(placuta?.texte?.['txt']?.copii, pl.texte['txt']?.copii, 'literele plăcuței s-au refăcut');
  const inapoi = anuleaza(h).doc;
  assert.deepEqual([inapoi.piese, inapoi.foi], [d0.piese, d0.foi], 'anularea exactă');
  // Grupul dat nu e un text (rama): refuzul vechi al unui text devenit vectori.
  const r = comandaText(d0, { fel: 'editat', instanta: 'b', grup: 'rama', piesa: () => ({ ok: false, motiv: 'gol' }) }, 'f1');
  assert.deepEqual(r, { ok: false, motiv: 'motiv.text-vectori' });
  // Fără grup, pe un șablon cu ramă (rădăcina nu e un text): același refuz, ca până acum.
  assert.deepEqual(comandaText(d0, { fel: 'editat', instanta: 'b', piesa: () => ({ ok: false, motiv: 'gol' }) }, 'f1'), { ok: false, motiv: 'motiv.text-vectori' });
});

test('textele grupate la clic: cutia literelor în lume (ale plăcuței pe o plăcuță); o piesă-text n-are', () => {
  const p = sablon();
  const pl = textePlacutei(p, { nume: 'W'.repeat(5) }, () => font);
  assert.ok(pl.ok && pl.texte);
  // Instanța în (100, 50): textul începe la x = 100 + 10, deasupra ramei de la y = 50.
  const sab = texteGrupate(p, { x: 100, y: 50, rotire: 0 });
  const plac = texteGrupate(p, { x: 100, y: 50, rotire: 0, texte: pl.texte });
  assert.equal(sab.length, 1);
  assert.equal(sab[0]?.grup, 'txt');
  const cs = sab[0]!.cutie, cp = plac[0]!.cutie;
  // Linia de bază în y = 50 + 10; acoladele coboară sub ea (în Roboto, ~0,2 em: sub 3 mm la majuscula de 10 mm).
  assert.ok(cs.minX >= 110 - 1 && cs.minX < 115 && cs.minY > 60 - 3 && cs.minY < 60, JSON.stringify(cs));
  // Cinci W (fiecare peste 5 mm lățime la 10 mm) trec de „{nume}”: cutia plăcuței e a literelor ei, nu a șablonului.
  assert.ok(cp.maxX > cs.maxX, JSON.stringify([cs, cp]));
  // Clicul: pe litere (cu toleranța), pe ramă în afara lor (nimic).
  assert.equal(textLovit(sab, (cs.minX + cs.maxX) / 2, (cs.minY + cs.maxY) / 2, 0.1)?.grup, 'txt');
  assert.equal(textLovit(sab, 100 + 95, 50 + 2, 0.1), null);
  // O piesă care e chiar un text: n-are texte grupate (se alege întreagă).
  const t = piesaText(aseazaText(font, P('Ion')), { ...P('Ion'), font: 'roboto' }, 'i');
  assert.ok(t.ok);
  assert.deepEqual(texteGrupate(t.piesa, { x: 0, y: 0, rotire: 0 }), []);
});
