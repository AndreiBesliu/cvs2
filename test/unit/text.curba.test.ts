import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as v from 'valibot';
import { conturCerc, conturDreptunghi, type Contur } from '../../src/geom/conturBaza.ts';
import { blocScalat, blocText, LIMITE_TEXT, SchemaCurbaText, type CurbaText } from '../../src/model/blocText.ts';
import { parcurgere, pozitiePeCurba } from '../../src/model/curba.ts';
import { aseazaText, type ParametriText } from '../../src/text/asezare.ts';
import { citesteFont } from '../../src/text/font.ts';
import { aseazaPeCurba, conturOrientat, type TextPeCurba } from '../../src/text/peCurba.ts';
import { piesaText } from '../../src/text/piesaText.ts';

/**
 * Textul pe curbă (ADR 0108), pe bucăți: parcurgerea curbei (închisă se reia, deschisă continuă pe tangentă, segmentele fără
 * lungime sărite), ancora din clic (punctul cel mai apropiat de pe curbă), sensul (cercul desenat trigonometric se parcurge
 * invers, ca textul să stea afară), criteriul din cercetare pe cercul R50 (clicul deasupra dă ancora sus, la 25π; textul
 * centrat stă simetric, deasupra cercului), schema curbei din bloc și scalarea ei. Locurile literelor, față de oracolul
 * independent: `text.corpus.test.ts`.
 */

const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' as const };
const aproape = (a: number, b: number, mesaj: string, eps = 1e-9): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const unghiAproape = (a: number, b: number, mesaj: string): void => { const d = (((a - b) % 360) + 540) % 360 - 180; assert.ok(Math.abs(d) < 1e-9, `${mesaj}: ${a} ≠ ${b}`); };
const roboto = (() => {
  const r = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/roboto.ttf', import.meta.url))));
  if (!r.ok) throw new Error(r.cod);
  return r.font;
})();
const PARAM: ParametriText = { continut: 'LEMN', inaltime: 10, spatiere: 0, interlinie: 1, aliniere: 'centru' };
const peCurba = (contur: Contur, s: number, alte: Partial<TextPeCurba> = {}): TextPeCurba =>
  ({ contur, s, pozitie: 'baza', distanta: 0, invers: false, orientare: 'rotita', intinsa: false, ...alte });
/** Toate punctele (vârfurile și punctele de control) unui text așezat. */
const puncte = (glife: ReturnType<typeof aseazaText>['glife']) =>
  glife.flatMap((g) => g.cai.flatMap((c) => c.varfuri.flatMap((q) => (q.s.tip === 'C' ? [q.p, q.s.c1, q.s.c2] : [q.p]))));

test('parcurgerea: o linie deschisă continuă pe tangentă dincolo de capete; segmentele fără lungime nu dau tangenta (nici la capete)', () => {
  const c: Contur = { inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(40, 0), s: L }, { p: P(40, 0), s: L }, { p: P(40, 30), s: L }] };
  const par = parcurgere(c)!;
  aproape(par.lungime, 70, 'lungimea');
  assert.deepEqual(par.la(-5).p, P(-5, 0), 'înaintea începutului, pe tangenta primului segment');
  unghiAproape(par.la(-5).unghi, 0, 'tangenta la început');
  // În colț (40), tangenta e a segmentului care pleacă din el: cel fără lungime se sare, deci în sus.
  unghiAproape(par.la(40).unghi, 90, 'tangenta în colț');
  unghiAproape(par.la(39.999).unghi, 0, 'chiar înaintea colțului');
  aproape(par.la(80).p.x, 40, 'dincolo de capăt, x');
  aproape(par.la(80).p.y, 40, 'dincolo de capăt, y');
  assert.equal(parcurgere({ inchis: false, varfuri: [{ p: P(3, 3), s: L }, { p: P(3, 3), s: L }] }), null, 'fără lungime');
  // Segmente fără lungime la capete (un punct dublat, ca după un dublu clic): tangentele capetelor sunt ale celor cu lungime.
  const dublat: Contur = { inchis: false, varfuri: [P(0, 0), P(0, 0), P(0, 50), P(30, 50), P(30, 50)].map((p) => ({ p, s: L })) };
  const pd = parcurgere(dublat)!;
  aproape(pd.lungime, 80, 'lungimea, cu punctele dublate');
  unghiAproape(pd.la(0).unghi, 90, 'la început, în sus');
  aproape(pd.la(-5).p.x, 0, 'înaintea începutului, x');
  aproape(pd.la(-5).p.y, -5, 'înaintea începutului, în jos');
  unghiAproape(pd.la(80).unghi, 0, 'la capăt, spre dreapta');
  aproape(pd.la(90).p.x, 40, 'după capăt, spre dreapta');
  aproape(pd.la(90).p.y, 50, 'după capăt, y');
});

test('parcurgerea: o curbă închisă se reia (s modulo lungimea); cercul R50 are 100π, desenat trigonometric din (50, 0)', () => {
  const par = parcurgere(conturCerc(0, 0, 50))!;
  aproape(par.lungime, 100 * Math.PI, 'circumferința', 1e-12);
  const sus = par.la(25 * Math.PI);
  aproape(sus.p.x, 0, 'sus x');
  aproape(sus.p.y, 50, 'sus y');
  unghiAproape(sus.unghi, 180, 'sus, spre stânga (trigonometric)');
  for (const s of [10, 123.4]) {
    for (const k of [-2, -1, 1, 3]) {
      const a = par.la(s), b = par.la(s + k * par.lungime);
      aproape(b.p.x, a.p.x, `x la ${s} + ${k}L`, 1e-9);
      aproape(b.p.y, a.p.y, `y la ${s} + ${k}L`, 1e-9);
    }
  }
});

test('ancora din clic: punctul cel mai apropiat de pe curbă (cercul R50, linia, dreptunghiul), pe o curbă deschisă între capete', () => {
  const cerc = conturCerc(0, 0, 50);
  aproape(pozitiePeCurba(cerc, P(0, 80))!, 25 * Math.PI, 'deasupra cercului: sus, la 25π (78,54 mm)');
  aproape(pozitiePeCurba(cerc, P(-60, 0))!, 50 * Math.PI, 'la stânga: 50π');
  aproape(pozitiePeCurba(cerc, P(0, -10))!, 75 * Math.PI, 'dinăuntru, dedesubt: 75π');
  const linie: Contur = { inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(100, 0), s: L }] };
  aproape(pozitiePeCurba(linie, P(30, 7))!, 30, 'pe linie');
  assert.equal(pozitiePeCurba(linie, P(-5, 3)), 0, 'înaintea începutului: începutul');
  assert.equal(pozitiePeCurba(linie, P(130, -3)), 100, 'după capăt: capătul');
  aproape(pozitiePeCurba(conturDreptunghi(0, 0, 60, 30, 0), P(62, 10))!, 70, 'lângă latura dreaptă a dreptunghiului');
  assert.equal(pozitiePeCurba({ inchis: false, varfuri: [{ p: P(1, 1), s: L }, { p: P(1, 1), s: L }] }, P(0, 0)), null, 'fără lungime');
});

test('sensul: cercul desenat trigonometric se parcurge invers (textul afară), „partea cealaltă” îl întoarce; ancora rămâne același punct', () => {
  const cerc = conturCerc(0, 0, 50);
  const L50 = 100 * Math.PI;
  for (const [invers, inversat] of [[false, true], [true, false]] as const) {
    const o = conturOrientat(peCurba(cerc, 25 * Math.PI, { invers }));
    assert.equal(o.inversat, inversat, `invers: ${invers}`);
    const p = parcurgere(o.contur)!.la(o.s).p;
    aproape(p.x, 0, 'ancora, x');
    aproape(p.y, 50, 'ancora, y');
  }
  // Același cerc desenat în sensul acelor: deja afară, nu se întoarce; o curbă deschisă, doar la cerere.
  const orar = conturOrientat(peCurba(conturOrientat(peCurba(cerc, 0)).contur, 10));
  assert.equal(orar.inversat, false);
  assert.equal(orar.s, 10);
  const linie: Contur = { inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(100, 0), s: L }] };
  assert.equal(conturOrientat(peCurba(linie, 30)).inversat, false);
  const inv = conturOrientat(peCurba(linie, 30, { invers: true }));
  assert.equal(inv.inversat, true);
  aproape(inv.s, 70, 'deschisă, inversată: L − s');
  aproape(conturOrientat(peCurba(cerc, 0)).s, 0, 'ancora în primul vârf rămâne în el');
  aproape(conturOrientat(peCurba(cerc, L50 / 4)).s, (3 * L50) / 4, 'sus, în sensul invers');
});

test('criteriul din cercetare, pe cercul R50: clicul deasupra dă ancora sus; „LEMN” centrat stă simetric, afară, citit de la stânga', () => {
  const cerc = conturCerc(0, 0, 50);
  aproape(pozitiePeCurba(cerc, P(0, 75))!, 25 * Math.PI, 'ancora sus');
  const a = aseazaPeCurba(aseazaText(roboto, PARAM), peCurba(cerc, 25 * Math.PI), PARAM.inaltime, PARAM.aliniere)!;
  assert.deepEqual(a.glife.map((g) => g.caracter), ['L', 'E', 'M', 'N']);
  const pts = puncte(a.glife);
  // Afară: fiecare punct al literelor e cel puțin la raza 50 (baza pe cerc), cel mult la 50 + majuscula (și puțin peste,
  // fiindcă literele drepte nu se îndoaie: colțurile bazei ies din cerc).
  for (const q of pts) assert.ok(Math.hypot(q.x, q.y) >= 50 - 1e-9 && Math.hypot(q.x, q.y) <= 60.5, `${q.x}, ${q.y}`);
  const centre = a.glife.map((g) => { const xs = g.cai.flatMap((c) => c.varfuri.map((q) => q.p.x)); return (Math.min(...xs) + Math.max(...xs)) / 2; });
  assert.deepEqual([...centre].sort((x, y) => x - y), centre, 'de la stânga la dreapta');
  // Simetric față de verticala ancorei: „LEMN” e aproape simetric (L și N diferă), deci cutia întregului e centrată în ±0,6 mm.
  const xs = pts.map((q) => q.x);
  aproape((Math.min(...xs) + Math.max(...xs)) / 2, 0, 'mijlocul cutiei', 0.6);
  assert.equal(aseazaPeCurba(aseazaText(roboto, PARAM), peCurba({ inchis: false, varfuri: [{ p: P(1, 1), s: L }, { p: P(1, 1), s: L }] }, 0), 10, 'centru'), null, 'curba fără lungime');
});

test('schema curbei din bloc: linii, arce, cubice; refuză s negativ, distanța peste 1 000 mm, prea multe vârfuri, valorile necunoscute', () => {
  const bun: CurbaText = {
    inchis: false,
    varfuri: [{ p: P(0, 0), s: { tip: 'A', bulge: 0.4 } }, { p: P(50, 0), s: { tip: 'C', c1: P(60, 10), c2: P(70, -10) } }, { p: P(80, 0), s: L }],
    s: 12.5, pozitie: 'centru', distanta: -3, invers: true, orientare: 'verticala', intinsa: false,
  };
  assert.ok(v.is(SchemaCurbaText, bun));
  const rau = (x: Record<string, unknown>, mesaj: string): void => { assert.equal(v.is(SchemaCurbaText, { ...bun, ...x }), false, mesaj); };
  rau({ s: -0.1 }, 's negativ');
  rau({ distanta: LIMITE_TEXT.distantaCurba + 1 }, 'distanța peste plafon');
  rau({ distanta: Number.NaN }, 'distanța NaN');
  rau({ pozitie: 'sus' }, 'poziția necunoscută');
  rau({ orientare: 'oglindita' }, 'orientarea necunoscută');
  rau({ varfuri: [bun.varfuri[0]] }, 'un singur vârf');
  rau({ varfuri: Array.from({ length: LIMITE_TEXT.varfuriCurba + 1 }, (_, k) => ({ p: P(k, 0), s: L })) }, 'prea multe vârfuri');
  rau({ varfuri: [{ p: P(0, 0), s: { tip: 'C', c1: P(1, 1) } }, { p: P(5, 0), s: L }] }, 'cubica fără al doilea punct de control');
  rau({ varfuri: [{ p: P(0, Number.POSITIVE_INFINITY), s: L }, { p: P(5, 0), s: L }] }, 'un punct infinit');
});

test('scalarea unui text pe curbă: curba (vârfurile și mânerele), ancora pe ea și distanța cresc cu el; peste plafon, doar contururile', () => {
  // Sus un semicerc (arc), jos o cubică: forma închisă, în sistemul piesei (ancora în origine, sus pe arc).
  const forma: Contur = {
    inchis: true,
    varfuri: [{ p: P(50, -50), s: { tip: 'A', bulge: 1 } }, { p: P(-50, -50), s: { tip: 'C', c1: P(-50, -120), c2: P(50, -120) } }],
  };
  const curba: CurbaText = { ...forma, varfuri: [...forma.varfuri], s: 25 * Math.PI, pozitie: 'deasupra', distanta: 2, invers: false, orientare: 'rotita', intinsa: false };
  const asezat = aseazaPeCurba(aseazaText(roboto, PARAM), peCurba(forma, curba.s, { pozitie: 'deasupra', distanta: 2 }), 10, 'centru')!;
  const r = piesaText(asezat, { ...PARAM, font: 'roboto', curba }, 'p1');
  assert.ok(r.ok);
  const rad = r.piesa.radacina;
  assert.deepEqual(blocText(rad)?.curba, curba, 'blocul ține curba');
  const dublu = blocText(blocScalat(rad, rad, 2, 2, true))!;
  assert.equal(dublu.inaltime, 20);
  assert.deepEqual(dublu.curba!.varfuri, [
    { p: P(100, -100), s: { tip: 'A', bulge: 1 } },
    { p: P(-100, -100), s: { tip: 'C', c1: P(-100, -240), c2: P(100, -240) } },
  ], 'vârfurile și mânerele cubicei, de două ori; bulge-ul arcului nu depinde de scară');
  aproape(dublu.curba!.s, 50 * Math.PI, 'ancora pe curbă');
  assert.equal(dublu.curba!.distanta, 4);
  // Distanța peste plafon (1 200 mm > 1 000): blocul pleacă de tot (nu rămâne unul nevalid în document), contururile rămân.
  const departe = piesaText(asezat, { ...PARAM, font: 'roboto', curba: { ...curba, distanta: 600 } }, 'p2');
  assert.ok(departe.ok);
  const scalat = blocScalat(departe.piesa.radacina, departe.piesa.radacina, 2, 2, true);
  assert.equal('text' in scalat, false);
  assert.equal(scalat.tip === 'grup' && scalat.copii.length, departe.piesa.radacina.tip === 'grup' && departe.piesa.radacina.copii.length);
});
