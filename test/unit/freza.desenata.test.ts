/**
 * Freza cu silueta desenată (ADR 0304 §5, felia 16.A↑f-5), pe hârtie: felul `desenata`, punctele (r, h) de la (0, 0) la
 * (Ø / 2, capătul), cu r strict crescător și h nedescrescător, 2 … 200 de puncte, în marginile ușii documentului; fiecare
 * greșeală are motivul ei și punctul la care e; punctele se țin rotunjite la 0,0001 mm (afară de capătul razei), ca o freză
 * de 200 de puncte să încapă în cont (`OCTETI_FREZA`), iar ce se judecă e ce se ține. Copia în proiect e forma `profil`
 * (ADR 0304 §1), primită de ușa documentului; silueta oricărei freze („Pornește de la…”) dă puncte bune, la cel mult
 * 0,001 mm de ea; fișierul JSON le poartă dus-întors, iar CSV-ul le citește din coloana `puncte`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  areCam, cuFreza, FELURI_CU_CAM, FELURI_FREZA, FREZE_PORNIRE, frezaDinDate, frezaImportata, inaltimeCon, MARGINI_FREZA, PAS_PUNCT,
  problemaPuncte, problemeFreza, puncteDesenate, sculaDinFreza, type Freza, type FrezaSalvata,
} from '../../src/model/freza.ts';
import { profilFreza } from '../../src/model/profilFreza.ts';
import { CATALOG_FREZE } from '../../src/model/catalogFreze.ts';
import { frezePeRanduri, frezePotrivite } from '../../src/model/alegereFreza.ts';
import { operatieImplicita, PLAFON, type FormaDoc } from '../../src/model/document.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';
import { jsonCanonic } from '../../src/model/frezeSincron.ts';
import { citesteFisierFreze, COLOANE_CSV, textFisierFreze } from '../../src/io/frezeFisier.ts';
import { OCTETI_FREZA } from '../../shared/freze.ts';

type Pct = readonly [number, number];
const LUCRU = { numar: 7, turatie: 18000, avans: 1000, plonjare: 300, pas: 1, pasLateral: 40 } as const;
/** O rotunjire desenată de mână: fundul plat până la 2, apoi urcă până la Ø12, la 4 mm. */
const DESENATA: Freza = { nume: 'Margine desenată', fel: 'desenata', diametru: 12, puncte: [[0, 0], [2, 0], [3, 1.5], [6, 4]], ...LUCRU };
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const salvata = (f: Freza, id: string): FrezaSalvata => ({ ...f, id, rev: 1, schimbatLa: 1_000 });

test('felul nou: „desenata”, la capătul listei, cu CAM (taie ca profilul desenat)', () => {
  assert.equal(FELURI_FREZA[FELURI_FREZA.length - 1], 'desenata');
  assert.ok((FELURI_CU_CAM as readonly string[]).includes('desenata'));
  assert.ok(areCam('desenata'));
});

test('o freză desenată bună n-are probleme; capătul e h-ul ultimului punct; silueta e chiar punctele', () => {
  assert.deepEqual(problemeFreza(DESENATA), {});
  assert.equal(problemaPuncte(DESENATA.puncte, DESENATA.diametru), null);
  assert.equal(inaltimeCon(DESENATA), 4);
  assert.deepEqual(profilFreza(DESENATA), DESENATA.puncte);
  // O siluetă de două puncte orizontale e o plată, iar una de două puncte în pantă, un V: amândouă sunt bune.
  assert.deepEqual(problemeFreza({ ...DESENATA, puncte: [[0, 0], [6, 0]] }), {});
  assert.deepEqual(problemeFreza({ ...DESENATA, puncte: [[0, 0], [6, 6]] }), {});
  // Tăișul nu poate fi mai scurt decât capătul.
  assert.deepEqual(problemeFreza({ ...DESENATA, tais: 3.9 }), { tais: 'con' });
  assert.deepEqual(problemeFreza({ ...DESENATA, tais: 4 }), {});
});

test('fiecare greșeală a punctelor are motivul ei și punctul la care e', () => {
  const D = 12;
  const p = (puncte: unknown): ReturnType<typeof problemaPuncte> => problemaPuncte(puncte, D);
  assert.deepEqual(p(undefined), { motiv: 'lipsa', punct: null });
  assert.deepEqual(p('0 0, 6 4'), { motiv: 'lipsa', punct: null });
  assert.deepEqual(p([[0, 0]]), { motiv: 'puncte-putine', punct: null });
  assert.deepEqual(p([]), { motiv: 'puncte-putine', punct: null });
  const multe: Pct[] = Array.from({ length: PLAFON.puncteProfil + 1 }, (_, i) => [(6 * i) / PLAFON.puncteProfil, 0]);
  assert.deepEqual(p(multe), { motiv: 'puncte-multe', punct: null });
  assert.equal(p(multe.slice(1).map(([r], i) => [i === 0 ? 0 : r, 0])), null, 'cu 200 de puncte, e bine');
  assert.deepEqual(p([[0, 0], [3, Number.NaN], [6, 4]]), { motiv: 'puncte-numar', punct: 1 });
  assert.deepEqual(p([[0, 0], [3, -1], [6, 4]]), { motiv: 'puncte-numar', punct: 1 });
  assert.deepEqual(p([[0, 0], [3], [6, 4]]), { motiv: 'puncte-numar', punct: 1 });
  assert.deepEqual(p([[0, 0], [3, 1], [6, PLAFON.adancimeOperatie + 1]]), { motiv: 'puncte-numar', punct: 2 });
  assert.deepEqual(p([[0, 1], [6, 4]]), { motiv: 'puncte-inceput', punct: 0 });
  assert.deepEqual(p([[0.5, 0], [6, 4]]), { motiv: 'puncte-inceput', punct: 0 });
  assert.deepEqual(p([[0, 0], [3, 1], [3, 2], [6, 4]]), { motiv: 'puncte-r', punct: 2 });
  assert.deepEqual(p([[0, 0], [4, 1], [3, 2], [6, 4]]), { motiv: 'puncte-r', punct: 2 });
  assert.deepEqual(p([[0, 0], [3, 2], [4, 1], [6, 4]]), { motiv: 'puncte-h', punct: 2 });
  assert.deepEqual(p([[0, 0], [3, 1], [5, 4]]), { motiv: 'puncte-capat', punct: 2 });
  assert.deepEqual(p([[0, 0], [3, 1], [6.1, 4]]), { motiv: 'puncte-capat', punct: 2 });
  // Ce se judecă e ce se ține: două r care se rotunjesc la fel (la 0,0001 mm) nu cresc strict.
  assert.deepEqual(p([[0, 0], [1.00001, 0], [1.00003, 0], [6, 1]]), { motiv: 'puncte-r', punct: 2 });
  // În `problemeFreza`, motivul stă pe câmpul `puncte`; capătul nu se judecă pe un diametru greșit.
  assert.deepEqual(problemeFreza({ ...DESENATA, puncte: [[0, 0], [3, 2], [4, 1], [6, 4]] }), { puncte: 'puncte-h' });
  assert.deepEqual(problemeFreza({ ...DESENATA, puncte: undefined }), { puncte: 'lipsa' });
  assert.deepEqual(problemeFreza({ ...DESENATA, diametru: 0 }), { diametru: 'margini' });
  assert.deepEqual(problemeFreza({ ...DESENATA, diametru: 14 }), { puncte: 'puncte-capat' });
});

test('punctele se țin rotunjite la 0,0001 mm (afară de raza capătului); celelalte feluri nu țin puncte', () => {
  assert.equal(PAS_PUNCT, 1e-4);
  const f: Freza = { ...DESENATA, diametru: 6.35001 * 2, puncte: [[0, 0], [1.234567, 0.000049], [2.71828, 1.41421], [6.35001, 3.14159]] };
  assert.deepEqual(problemeFreza(f), {});
  const r = cuFreza([], null, f, () => 'd1', 5);
  assert.ok(r.ok);
  const s = r.lista[0]!;
  assert.deepEqual(s.puncte, [[0, 0], [1.2346, 0], [2.7183, 1.4142], [6.35001, 3.1416]]);
  assert.equal(frezaDinDate(s)?.id, 'd1');
  // Trecută pe plată, freza își pierde punctele; o plată cu puncte (date vechi, străine) le pierde la salvare.
  const plata = cuFreza(r.lista, 'd1', { ...s, fel: 'plata' }, () => 'x', 6);
  assert.ok(plata.ok);
  assert.equal(plata.lista[0]!.puncte, undefined);
  assert.equal('puncte' in plata.lista[0]!, false);
});

test('copia în proiect: forma `profil`, cu punctele și capătul exact la rază; ușa documentului o primește', () => {
  const s = sculaDinFreza(DESENATA, 9);
  assert.deepEqual(s, { numar: 9, nume: 'Margine desenată', diametru: 12, forma: { tip: 'profil', puncte: [[0, 0], [2, 0], [3, 1.5], [6, 4]] } });
  const forma: FormaDoc = { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 };
  assert.ok(operatieInMargini({ ...operatieImplicita('e', forma), scula: s }));
  // Copia nu e aceeași listă cu a bibliotecii: o schimbare a ei nu atinge freza.
  assert.notEqual((s.forma as { puncte: unknown }).puncte, DESENATA.puncte);
  // Capătul la cel mult 1e-9 de rază e bun, iar copia îl pune exact pe rază.
  const aproape: Freza = { ...DESENATA, puncte: [[0, 0], [3, 1], [6 + 5e-10, 4]] };
  assert.deepEqual(problemeFreza(aproape), {});
  assert.equal((sculaDinFreza(aproape).forma as { puncte: Pct[] }).puncte[2]![0], 6);
  // La marginile ușii: 200 de puncte, Ø100, h până la plafon.
  const mare: Pct[] = Array.from({ length: PLAFON.puncteProfil }, (_, i) => [(50 * i) / (PLAFON.puncteProfil - 1), (999.9999 * i) / (PLAFON.puncteProfil - 1)]);
  const fm: Freza = { ...DESENATA, diametru: 100, puncte: mare };
  assert.deepEqual(problemeFreza(fm), {});
  assert.ok(operatieInMargini({ ...operatieImplicita('e', forma), scula: sculaDinFreza(fm) }));
});

test('cea mai mare freză desenată încape în cont (`OCTETI_FREZA`), cu toate câmpurile la margine', () => {
  const n = PLAFON.puncteProfil;
  const puncte: Pct[] = Array.from({ length: n }, (_, i) => [i === n - 1 ? 50 : 49.9999 * (i / (n - 1)) + 0.0000123, i === 0 ? 0 : 999.9999 - (n - 1 - i) * 0.00011]);
  puncte[0] = [0, 0];
  const f: Freza = {
    ...DESENATA, nume: 'x'.repeat(MARGINI_FREZA.nume), nota: 'ă'.repeat(MARGINI_FREZA.nota), grup: 'ș'.repeat(MARGINI_FREZA.grup),
    diametru: 100, puncte, tais: 1000, taisuri: 12, numar: 999, turatie: 99999, avans: 99999.99, plonjare: 99999.99, pas: 999.99, pasLateral: 49.99,
  };
  const r = cuFreza([], null, f, () => 'id-de-64-' + 'z'.repeat(55), Date.UTC(2099, 0, 1));
  assert.ok(r.ok, JSON.stringify(r.ok ? null : r.probleme));
  const octeti = new TextEncoder().encode(jsonCanonic(r.lista[0])).length;
  assert.ok(octeti <= OCTETI_FREZA, `${octeti} > ${OCTETI_FREZA}`);
});

/**
 * Cea mai mare depărtare dintre două linii frânte: a fiecărui vârf al uneia de cel mai apropiat segment al celeilalte, în
 * ambele sensuri (Hausdorff pe vârfuri; cu o linie deasă, aproape cel adevărat). Pe un arc aproape vertical, o măsură pe
 * verticală ar crește fără margine, deci distanța e cea adevărată.
 */
function abatere(a: readonly Pct[], b: readonly Pct[]): number {
  const laSegment = ([x, y]: Pct, [x0, y0]: Pct, [x1, y1]: Pct): number => {
    const dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy;
    const u = l === 0 ? 0 : Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l));
    return Math.hypot(x - (x0 + u * dx), y - (y0 + u * dy));
  };
  const deLa = (p: readonly Pct[], q: readonly Pct[]): number => {
    let m = 0;
    for (const v of p) {
      let d = Number.POSITIVE_INFINITY;
      for (let i = 1; i < q.length; i++) d = Math.min(d, laSegment(v, q[i - 1]!, q[i]!));
      m = Math.max(m, d);
    }
    return m;
  };
  return Math.max(deLa(a, b), deLa(b, a));
}

test('„Pornește de la…”: silueta oricărei freze dă puncte bune, rotunjite, la cel mult 0,001 mm de ea', () => {
  const toate: Freza[] = [
    DESENATA,
    ...FREZE_PORNIRE.map((f, i) => ({ ...f, nume: `P${i}` })),
    ...CATALOG_FREZE.map((c) => ({ ...c, nume: c.id })),
  ];
  for (const f of toate) {
    const p = puncteDesenate(f);
    assert.ok(p, f.nume);
    assert.equal(problemaPuncte(p, f.diametru), null, f.nume);
    assert.deepEqual(p[0], [0, 0], f.nume);
    assert.equal(p[p.length - 1]![0], f.diametru / 2, f.nume);
    assert.ok(Math.abs(p[p.length - 1]![1] - inaltimeCon(f)) <= PAS_PUNCT, f.nume);
    for (const [r, h] of p.slice(0, -1)) {
      assert.ok(Math.abs(r * 1e4 - Math.round(r * 1e4)) < 1e-6 && Math.abs(h * 1e4 - Math.round(h * 1e4)) < 1e-6, `${f.nume}: ${r}, ${h}`);
    }
    // Față de silueta din arce foarte dese (treapta verticală a ogee-ului roman devine o linie abruptă, la 0,0001 mm pe r).
    const dens = profilFreza(f, (raza, unghi) => Math.max(8, Math.ceil((unghi * raza) / 0.01)));
    const ab = abatere(p, dens);
    assert.ok(ab <= 0.001, `${f.nume}: abaterea ${ab}`);
    // Desenată din ea, freza e bună și se copiază în proiect.
    const d: Freza = { ...f, fel: 'desenata', puncte: p, unghi: undefined, varf: undefined, raza: undefined, treapta: undefined };
    assert.deepEqual(problemeFreza({ ...d, tais: undefined }), {}, f.nume);
    assert.equal(sculaDinFreza(d).forma?.tip, 'profil', f.nume);
  }
});

test('„Pornește de la…”: punctele care s-ar contopi la rotunjire pleacă; silueta rămâne bună', () => {
  const p = puncteDesenate({ ...DESENATA, puncte: [[0, 0], [1.00001, 0], [1.00003, 0], [6, 1]] });
  assert.deepEqual(p, [[0, 0], [1, 0], [6, 1]]);
  assert.equal(problemaPuncte(p, 12), null);
});

test('alegerea: desenata merge pe canelură și, cu fund plat și destul de înaltă, pe o parte; nu în buzunar', () => {
  const lista = [salvata(DESENATA, 'd')];
  assert.equal(frezePotrivite(lista, [{ tip: 'profil', latura: 'pe-linie' }]).length, 1);
  assert.equal(frezePotrivite(lista, [{ tip: 'profil', latura: 'exterior', adancime: 3 }]).length, 1);
  assert.equal(frezePotrivite(lista, [{ tip: 'profil', latura: 'exterior', adancime: 5 }]).length, 0);
  assert.equal(frezePotrivite(lista, [{ tip: 'buzunar', latura: 'interior' }]).length, 0);
  assert.equal(frezePeRanduri(lista).length, 1);
});

test('datele: o freză desenată ținută sau adusă din fișier se citește; punctele cu altă formă o fac greșită', () => {
  assert.ok(frezaDinDate(salvata(DESENATA, 'd')));
  assert.ok(frezaImportata(DESENATA));
  assert.equal(frezaImportata({ ...DESENATA, puncte: [[0, 0], ['3', 1], [6, 4]] }), null);
  assert.equal(frezaImportata({ ...DESENATA, puncte: { 0: [0, 0], 1: [6, 4] } }), null);
  assert.equal(frezaImportata({ ...DESENATA, puncte: [[0, 0], [6, 4, 1]] }), null);
  // Și pe o freză de alt fel, câmpul `puncte` cu altă formă o face greșită (ca orice câmp cunoscut); cu forma bună, rămâne.
  const plata: Freza = { ...DESENATA, fel: 'plata', diametru: 6, puncte: undefined };
  assert.equal(frezaImportata({ ...plata, puncte: 'x' }), null);
  assert.equal(frezaImportata({ ...plata, puncte: [[0, 0], [3, '0']] }), null);
  assert.ok(frezaImportata({ ...plata, puncte: [[0, 0], [3, 0]] }));
});

test('fișierul: JSON-ul poartă punctele dus-întors; CSV-ul le citește din coloana `puncte`', () => {
  const text = textFisierFreze([salvata(DESENATA, 'd')]);
  const r = citesteFisierFreze(enc(text));
  assert.ok(r.ok);
  assert.deepEqual(r.freze, [DESENATA]);
  assert.equal(COLOANE_CSV[COLOANE_CSV.length - 1], 'puncte');
  // `;` cu virgula zecimală; perechile despărțite de „|”, r și h de un spațiu; diametrul lipsă vine din ultimul punct.
  const csv = 'nume;fel;diametru;numar;puncte\nM;desenata;;7;0 0 | 2 0 | 3 1,5 | 6 4\nN;desenata;12;8;0 0|2 0|3 1,5|6 4\n'
    + 'Greșită;desenata;12;9;0 0|3 2|2 1|6 4\nFără;desenata;12;9;\n';
  const c = citesteFisierFreze(enc(csv));
  assert.ok(c.ok);
  assert.equal(c.sarite, 2);
  assert.deepEqual(c.freze.map((f) => [f.nume, f.diametru, f.puncte]), [
    ['M', 12, [[0, 0], [2, 0], [3, 1.5], [6, 4]]],
    ['N', 12, [[0, 0], [2, 0], [3, 1.5], [6, 4]]],
  ]);
  // `,` cu punctul zecimal; un diametru care nu e al ultimului punct se sare.
  const c2 = citesteFisierFreze(enc('nume,fel,diametru,puncte\nA,desenata,12,0 0|3 1.5|6 4\nB,desenata,10,0 0|6 4\n'));
  assert.ok(c2.ok);
  assert.deepEqual(c2.freze.map((f) => f.nume), ['A']);
  assert.equal(c2.sarite, 1);
  // Celelalte feluri nu primesc puncte din CSV.
  const c3 = citesteFisierFreze(enc('nume;fel;diametru;puncte\nP;plata;6;0 0|3 0\n'));
  assert.ok(c3.ok);
  assert.equal(c3.freze[0]!.puncte, undefined);
});
