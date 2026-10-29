import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conturCerc } from '../../src/geom/conturBaza.ts';
import { blocText } from '../../src/model/blocText.ts';
import { documentNou, type Document, type Piesa } from '../../src/model/document.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { aseazaText, type ParametriText, type TextAsezat } from '../../src/text/asezare.ts';
import { citesteFont } from '../../src/text/font.ts';
import { aseazaPeCurba } from '../../src/text/peCurba.ts';
import { piesaText } from '../../src/text/piesaText.ts';
import { comandaText } from '../../src/ui/actiuniDocumentCalcul.ts';
import type { CerereText } from '../../src/ui/actiuniDocument.ts';

/**
 * Acțiunea `document.text` (ADR 0105 §5): un text nou e o piesă cu instanța ei în ancoră; unul editat înlocuiește piesa
 * (același id, aceeași instanță), într-un pas. Refuzurile: o piesă care nu mai e text, o piesă folosită de mai multe
 * instanțe, un text fără litere, o ancoră prea departe.
 */

const r = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/roboto.ttf', import.meta.url))));
if (!r.ok) throw new Error(r.cod);
const font = r.font;
const PARAM: ParametriText = { continut: 'AB', inaltime: 10, spatiere: 0, interlinie: 1, aliniere: 'stanga' };
const bloc = (p: ParametriText) => ({ ...p, font: 'roboto' });
const nou = (p: ParametriText, x = 30, y = 40): CerereText => ({ fel: 'nou', loc: { x, y }, piesa: (id, scula) => piesaText(aseazaText(font, p), bloc(p), id, scula) });
const editat = (instanta: string, p: ParametriText): CerereText => ({
  fel: 'editat', instanta, piesa: (vechi: Piesa) => piesaText(aseazaText(font, p), bloc(p), vechi.id, undefined, vechi),
});
const gol = (): Document => documentNou({ latime: 300, inaltime: 200, grosime: 18 });

test('un text nou: piesa și instanța ei în ancoră, într-un pas; editarea o înlocuiește (același id, aceeași instanță)', () => {
  const d0 = gol();
  const c = comandaText(d0, nou(PARAM));
  assert.ok(c.ok);
  assert.equal(c.comanda.tip, 'adauga');
  const d1 = executa({ ...istoricNou(d0) }, c.comanda).doc;
  assert.deepEqual(d1.foi[0]!.instante.map((i) => [i.id, i.piesa, i.x, i.y, i.rotire]), [[c.id, c.id, 30, 40, 0]]);
  assert.ok(blocText(d1.piese[0]!.radacina));
  const e = comandaText(d1, editat(c.id, { ...PARAM, continut: 'ABC', inaltime: 12 }));
  assert.ok(e.ok);
  assert.equal(e.comanda.tip, 'inlocuieste-piesa');
  assert.equal(e.id, c.id);
  const d2 = executa({ ...istoricNou(d1) }, e.comanda).doc;
  assert.deepEqual(d2.piese.map((p) => p.id), [c.id]);
  assert.equal(blocText(d2.piese[0]!.radacina)?.continut, 'ABC');
});

test('refuzurile: piesa care nu mai e text, piesa împărțită, textul fără litere, ancora prea departe, instanța lipsă', () => {
  const d0 = gol();
  const c = comandaText(d0, nou(PARAM));
  assert.ok(c.ok);
  const d1 = executa({ ...istoricNou(d0) }, c.comanda).doc;
  // Contururile schimbate pe altă cale (aici: blocul cu altă amprentă): nu mai e text.
  const p = d1.piese[0]!;
  const rad = p.radacina as Extract<Piesa['radacina'], { tip: 'grup' }>;
  const stricat: Document = { ...d1, piese: [{ ...p, radacina: { ...rad, text: { ...(rad['text'] as object), amprenta: '0' } } }] };
  assert.deepEqual(comandaText(stricat, editat(c.id, PARAM)), { ok: false, motiv: 'motiv.text-vectori' });
  // A doua instanță a aceleiași piese: editarea le-ar schimba pe amândouă.
  const doua: Document = { ...d1, foi: [{ ...d1.foi[0]!, instante: [...d1.foi[0]!.instante, { id: 'alta', piesa: p.id, x: 100, y: 100, rotire: 0 }] }] };
  assert.deepEqual(comandaText(doua, editat(c.id, PARAM)), { ok: false, motiv: 'motiv.text-impartit' });
  assert.deepEqual(comandaText(d0, nou({ ...PARAM, continut: '  ' })), { ok: false, motiv: 'motiv.text-gol' });
  assert.deepEqual(comandaText(d0, nou(PARAM, 2e7, 0)), { ok: false, motiv: 'motiv.prea-departe' });
  assert.deepEqual(comandaText(d1, editat('lipsa', PARAM)), { ok: false, motiv: 'motiv.nimic-ales' });
});

test('un text pe curbă (ADR 0108): piesa ține curba în bloc, documentul întreg trece schema; editat drept, curba pleacă', () => {
  const d0 = gol();
  const cerc = conturCerc(0, -50, 50);
  const curba = { ...cerc, varfuri: [...cerc.varfuri], s: 25 * Math.PI, pozitie: 'baza' as const, distanta: 1, invers: false, orientare: 'rotita' as const, intinsa: true };
  const pe = (p: ParametriText): TextAsezat => aseazaPeCurba(aseazaText(font, p), { contur: cerc, ...curba }, p.inaltime, p.aliniere)!;
  const c = comandaText(d0, { fel: 'nou', loc: { x: 150, y: 150 }, piesa: (id, scula) => piesaText(pe(PARAM), { ...bloc(PARAM), curba }, id, scula) });
  assert.ok(c.ok);
  const d1 = executa({ ...istoricNou(d0) }, c.comanda).doc;
  assert.deepEqual(blocText(d1.piese[0]!.radacina)?.curba, curba);
  const e = comandaText(d1, editat(c.id, PARAM));
  assert.ok(e.ok);
  const d2 = executa({ ...istoricNou(d1) }, e.comanda).doc;
  assert.equal(blocText(d2.piese[0]!.radacina)?.curba, undefined);
});
