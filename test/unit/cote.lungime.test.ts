/**
 * Lungimea (ADR 0330, felia 10.4↑e-2), pe hârtie: o cotă de felul `lungime` are un singur capăt, legat la mijlocul unei laturi
 * (`loc: mijloc k`), și măsoară lungimea laturii (linia, arcul exact, cubica pe curbă) sau, cu `pe: 'contur'`, a conturului
 * întreg. Dezlegată (forma ștearsă, alte noduri, „Dezleagă”), rămâne la ultima lungime văzută (`urma`), scrisă în același pas
 * de anulare cu comanda care a dezlegat-o. Desenul e o etichetă cu săgeată: săgeata cu vârful pe latură, linia de lungime `d`
 * pe direcția `u` (grade), umărul orizontal cât cifra, cifra deasupra; pe un arc sau o curbă, simbolul arcului deasupra cifrei
 * (ISO 129-1); pe contur, „L ” înaintea cifrei. Programul nu se schimbă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { calculeazaExportul } from '../../src/jobs/calculCam.ts';
import { entitatiCote } from '../../src/io/coteExport.ts';
import { cotaVazuta, indexLume, lungimeCota, masuraCota, punctAncora, valoareCota } from '../../src/model/cote.ts';
import { cifraCuToleranta, desenCota, desenLungime, distantaLaDesen, formatImplicit, STIL_IMPLICIT, type CapatDesen, type DesenCota } from '../../src/model/desenCota.ts';
import { documentNou, type AncoraCota, type Cota, type Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { dezleagaDupa } from '../../src/model/jurnalCote.ts';
import { cotaLungimeLa } from '../../src/model/coteLungime.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';

const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/**
 * Piesa „p”, pusă o dată (instanța „i1”) la (10, 20), rotită cu 90° (lungimile nu se schimbă):
 * - „r”: dreptunghiul 100 × 50 (laturile 100, 50, 100, 50; conturul 300);
 * - „a”: calea deschisă (200,0) → (240,0) → semicercul R20 până în (240,40) (40 + 20π);
 * - „b”: cubica (0,100) → (100,100) cu mânerele (100/3, 400/3) și (200/3, 400/3): parabola ridicată la cubică, de lungime
 *   50 (√2 + asinh 1) pe hârtie.
 */
function document(cuR = true): Document {
  const d = documentNou({ latime: 300, inaltime: 300, grosime: 18 });
  const f = d.foi[0];
  if (!f) throw new Error('fără foaie');
  return {
    ...d,
    piese: [{
      id: 'p', operatii: [],
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
          ...(cuR ? [{ tip: 'element' as const, id: 'r', matrice: { ...ID }, forma: { tip: 'dreptunghi' as const, latime: 100, inaltime: 50, razaColt: 0 } }] : []),
          {
            tip: 'element', id: 'a', matrice: { ...ID }, forma: {
              tip: 'cale', inchis: false, varfuri: [
                { p: { x: 200, y: 0 }, s: { tip: 'L' } }, { p: { x: 240, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 240, y: 40 }, s: { tip: 'L' } },
              ],
            },
          },
          {
            tip: 'element', id: 'b', matrice: { ...ID }, forma: {
              tip: 'cale', inchis: false, varfuri: [
                { p: { x: 0, y: 100 }, s: { tip: 'C', c1: { x: 100 / 3, y: 400 / 3 }, c2: { x: 200 / 3, y: 400 / 3 } } }, { p: { x: 100, y: 100 }, s: { tip: 'L' } },
              ],
            },
          },
        ],
      },
    }],
    foi: [{ ...f, instante: [{ id: 'i1', piesa: 'p', x: 10, y: 20, rotire: 90 }] }],
  };
}

const lume = indexLume(document(), 0);
const pe = (nod: string, k: number, n: number): AncoraCota => ({ x: -999, y: -999, legatura: { instanta: 'i1', nod, loc: { fel: 'mijloc', k }, n } });
const lungime = (a: AncoraCota, extra: Partial<Cota> = {}): Cota => ({ id: 'L1', fel: 'lungime', puncte: [a], linie: { d: 10, u: 45 }, ...extra });
const aproape = (a: number | null | undefined, b: number, unde: string, tol = 1e-9): void => {
  assert.ok(typeof a === 'number' && Math.abs(a - b) < tol, `${unde}: ${a}, nu ${b}`);
};
const PARABOLA = 50 * (Math.SQRT2 + Math.asinh(1));

test('latura: dreaptă (100, 50), arcul (20π), cubica (pe curbă, 50 (√2 + asinh 1)); simbolul arcului doar pe arc și pe cubică', () => {
  const r0 = lungimeCota(lungime(pe('r', 0, 4)), lume);
  aproape(r0?.l, 100, 'latura de jos a dreptunghiului');
  assert.equal(r0?.curba, false);
  aproape(lungimeCota(lungime(pe('r', 1, 4)), lume)?.l, 50, 'latura din dreapta');
  aproape(lungimeCota(lungime(pe('a', 0, 2)), lume)?.l, 40, 'linia căii');
  const arc = lungimeCota(lungime(pe('a', 1, 2)), lume);
  aproape(arc?.l, 20 * Math.PI, 'semicercul R20');
  assert.equal(arc?.curba, true);
  const cub = lungimeCota(lungime(pe('b', 0, 1)), lume);
  aproape(cub?.l, PARABOLA, 'cubica', 1e-7);
  assert.equal(cub?.curba, true);
});

test('conturul: închis (300), deschis (40 + 20π), cu o cubică (cât latura ei); „L ” înaintea cifrei', () => {
  aproape(lungimeCota(lungime(pe('r', 2, 4), { pe: 'contur' }), lume)?.l, 300, 'dreptunghiul');
  const c = lungimeCota(lungime(pe('a', 1, 2), { pe: 'contur' }), lume);
  aproape(c?.l, 40 + 20 * Math.PI, 'calea deschisă');
  assert.equal(c?.curba, false, 'conturul n-are simbolul arcului');
  aproape(lungimeCota(lungime(pe('b', 0, 1), { pe: 'contur' }), lume)?.l, PARABOLA, 'cubica singură', 1e-7);
  const F = formatImplicit(true);
  assert.equal(cifraCuToleranta(lungime(pe('r', 0, 4), { pe: 'contur' }), 300, F), 'L 300');
  assert.equal(cifraCuToleranta(lungime(pe('r', 0, 4)), 100, F), '100');
  assert.equal(cifraCuToleranta(lungime(pe('r', 0, 4), { pe: 'contur', toleranta: { sus: 0.5, jos: -0.5 } }), 300, F), 'L 300 ±0,5');
});

test('dezlegată: ultima lungime văzută (`urma`); fără ea, nimic; cu alte noduri, la fel; masuraCota alege lumea, apoi urma', () => {
  const c = lungime(pe('r', 0, 4));
  const vazuta = cotaVazuta(c, lume);
  assert.deepEqual(vazuta.urma, { l: 100, curba: false });
  assert.equal(c.urma, undefined, 'cota dată rămâne neatinsă');
  // Forma ștearsă: lumea fără „r”.
  const fara = indexLume(document(false), 0);
  assert.equal(punctAncora(c.puncte![0]!, fara).stare, 'dezlegata');
  assert.equal(lungimeCota(c, fara), null, 'fără urmă, fără lungime');
  aproape(masuraCota(vazuta, vazuta.puncte!.map((a) => punctAncora(a, fara)), fara), 100, 'cu urma');
  // Alte noduri (n = 5 la legare): dezlegată, deci urma, chiar dacă forma e acolo.
  assert.deepEqual(lungimeCota(lungime(pe('r', 0, 5), { urma: { l: 77, curba: true } }), lume), { l: 77, curba: true });
  // Legată, lumea câștigă peste o urmă veche (și în masuraCota, pe care o citesc pânza și exportul).
  const veche = lungime(pe('r', 0, 4), { urma: { l: 77, curba: true } });
  aproape(lungimeCota(veche, lume)?.l, 100, 'lumea, nu urma');
  aproape(masuraCota(veche, veche.puncte!.map((a) => punctAncora(a, lume)), lume), 100, 'masuraCota: lumea, nu urma');
  // O urmă stricată nu se folosește.
  assert.equal(lungimeCota(lungime(pe('r', 0, 5), { urma: { l: -1, curba: false } }), lume), null);
  assert.equal(lungimeCota(lungime(pe('r', 0, 5), { urma: 12 }), lume), null);
  // Capătul liber (după „Dezleagă”): doar urma.
  aproape(masuraCota(lungime({ x: 1, y: 2 }, { urma: { l: 42, curba: false } }), [{ p: { x: 1, y: 2 }, stare: 'libera' }], lume), 42, 'liberă, cu urma');
  // valoareCota (fără lume): urma, la orice fel de lungime.
  aproape(valoareCota(lungime({ x: 1, y: 2 }, { urma: { l: 42, curba: false } }), [{ x: 1, y: 2 }]), 42, 'valoarea fără lume');
  // Celelalte feluri: cotaVazuta nu le schimbă.
  const o: Cota = { id: 'o', fel: 'orizontala', puncte: [{ x: 0, y: 0 }, { x: 5, y: 0 }], linie: { d: 3 } };
  assert.deepEqual(cotaVazuta(o, lume), o);
});

test('jurnalul: o comandă care șterge forma scrie, în același pas, urma lungimii și punctul văzut', () => {
  const inainte = cuCote(document(), [lungime(pe('r', 0, 4))]);
  const dupa = cuCote(document(false), [lungime(pe('r', 0, 4))]);
  const cmd = dezleagaDupa(inainte, dupa);
  assert.equal(cmd.length, 1);
  const noua = cmd[0]?.tip === 'inlocuieste-cote' ? cmd[0].nou[0] : undefined;
  assert.deepEqual(noua?.urma, { l: 100, curba: false });
  // Mijlocul laturii de jos (50, 0) în piesă → (10 − 0, 20 + 50) pe foaie.
  assert.deepEqual([noua?.puncte?.[0]?.x, noua?.puncte?.[0]?.y], [10, 70]);
});

test('punerea: latura cea mai apropiată de clic, legată la mijloc, cu urma; eticheta spre afara formei; departe, nimic', () => {
  // Latura de jos a dreptunghiului (y = 0 în piesă) e, pe foaie, verticala x = 10, de la y = 20 la 120; mijlocul (10, 70).
  // Cutia dreptunghiului pe foaie: x ∈ [−40, 10], y ∈ [20, 120], centrul (−15, 70): eticheta spre dreapta (0°).
  const c = cotaLungimeLa(document(), 0, { x: 11, y: 60 }, 2, 'latura', 'c7');
  assert.deepEqual(c, {
    id: 'c7', fel: 'lungime', linie: { d: 8, u: 0 },
    puncte: [{ x: 10, y: 70, legatura: { instanta: 'i1', nod: 'r', loc: { fel: 'mijloc', k: 0 }, n: 4 } }],
    urma: { l: 100, curba: false },
  });
  const k = cotaLungimeLa(document(), 0, { x: 11, y: 60 }, 2, 'contur', 'c8');
  assert.equal(k?.pe, 'contur');
  assert.deepEqual(k?.urma, { l: 300, curba: false });
  // Pe semicerc (centrul (240, 20) în piesă → (−10, 260) pe foaie, R20): mijlocul arcului, curbă.
  const a = cotaLungimeLa(document(), 0, { x: -30.5, y: 260 }, 1, 'latura', 'c9');
  assert.deepEqual(a?.urma, { l: 20 * Math.PI, curba: true });
  assert.equal(cotaLungimeLa(document(), 0, { x: 150, y: 150 }, 2, 'latura', 'c10'), null);
  // În cutia dreptunghiului, dar departe de laturile lui (centrul, la 25 de cea mai apropiată): nimic.
  assert.equal(cotaLungimeLa(document(), 0, { x: -15, y: 70 }, 2, 'latura', 'c11'), null);
});

function cuCote(d: Document, cote: Cota[]): Document {
  return { ...d, foi: d.foi.map((f, k) => (k === 0 ? { ...f, cote } : f)) };
}

const S = STIL_IMPLICIT;
const sag = (c: CapatDesen | undefined): readonly [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }] => {
  assert.ok(c?.fel === 'sageata');
  return c.puncte;
};
const egal = (a: { x: number; y: number } | undefined, x: number, y: number, unde: string): void => {
  assert.ok(a && Math.abs(a.x - x) < 1e-9 && Math.abs(a.y - y) < 1e-9, `${unde}: (${a?.x}, ${a?.y}), nu (${x}, ${y})`);
};

// „52,36”: cinci semne, deci 5 × 0,6 × 3,5 = 10,5 mm; golul 0,3 × 3,5 = 1,05; umărul 10,5 + 2 × 1,05 = 12,6.
test('desenul: săgeata cu vârful pe latură, linia pe direcția u, umărul orizontal spre partea liniei, cifra deasupra', () => {
  const d = desenLungime({ x: 10, y: 20 }, 10, 0, S, '52,36', false) as DesenCota;
  assert.ok(d);
  egal(d.linie[0], 10, 20, 'linia pornește din capăt');
  egal(d.linie[1], 20, 20, 'și merge d = 10 pe u = 0°');
  assert.equal(d.bucati.length, 2);
  egal(d.bucati[1]?.[0], 20, 20, 'umărul pornește din cotul liniei');
  egal(d.bucati[1]?.[1], 32.6, 20, 'cât cifra și golurile ei');
  egal(d.text.p, 26.3, 21.05, 'cifra deasupra umărului, la mijloc');
  assert.equal(d.text.unghi, 0);
  egal(sag(d.capete[0])[0], 10, 20, 'vârful săgeții pe latură');
  assert.deepEqual(d.arce, []);
  assert.deepEqual(d.extensii, []);
  // Spre stânga (u = 135°): umărul spre stânga.
  const s = desenLungime({ x: 10, y: 20 }, 10, 135, S, '52,36', false) as DesenCota;
  const e = { x: 10 - 10 * Math.SQRT1_2, y: 20 + 10 * Math.SQRT1_2 };
  egal(s.linie[1], e.x, e.y, 'cotul, pe 135°');
  egal(s.bucati[1]?.[1], e.x - 12.6, e.y, 'umărul spre stânga');
  // Linia nu e mai scurtă decât săgeata și un gol (2,5 + 1,05).
  egal((desenLungime({ x: 10, y: 20 }, 1, 0, S, '52,36', false) as DesenCota).linie[1], 13.55, 20, 'linia cel puțin cât săgeata');
  // Alegerea cu clicul prinde și umărul, nu doar linia.
  assert.ok(distantaLaDesen(d, '52,36', { x: 31, y: 20 }) < 1e-9);
});

test('simbolul arcului: un arc deasupra cifrei, cât ea, cu săgeata 0,3 × înălțimea, la un gol deasupra cifrei', () => {
  const d = desenLungime({ x: 10, y: 20 }, 10, 0, S, '52,36', true) as DesenCota;
  assert.equal(d.arce.length, 1);
  const a = d.arce[0]!;
  // Coarda la y = 21,05 + 3,5 + 1,05 = 25,6, pe x ∈ [21,05; 31,55]; săgeata 1,05: R = (5,25² + 1,05²) / 2,1 = 13,65.
  aproape(a.raza, 13.65, 'raza');
  egal(a.centru, 26.3, 25.6 + 1.05 - 13.65, 'centrul, sub coardă');
  const capat = (t: number): { x: number; y: number } => ({ x: a.centru.x + a.raza * Math.cos(t), y: a.centru.y + a.raza * Math.sin(t) });
  egal(capat(a.de), 31.55, 25.6, 'capătul din dreapta');
  egal(capat(a.de + a.baleiaj), 21.05, 25.6, 'capătul din stânga');
  egal(capat(a.de + a.baleiaj / 2), 26.3, 26.65, 'vârful, la săgeată deasupra coardei');
  // Prin desenCota: același desen, din cotă.
  const c: Cota = { id: 'L', fel: 'lungime', puncte: [{ x: 10, y: 20 }], linie: { d: 10, u: 0 } };
  assert.deepEqual(desenCota(c, [{ x: 10, y: 20 }], S, '52,36', true), d);
  assert.equal(desenCota(c, [], S, '52,36'), null, 'fără capăt, fără desen');
});

test('exportul: pe o latură curbă, simbolul arcului (un arc în plus); niciodată o DIMENSION', () => {
  const doc = (curba: boolean): Document => cuCote(document(), [lungime({ x: 150, y: 160 }, { urma: { l: 63, curba } })]);
  const o = { stil: S, format: formatImplicit(true), ca: 'text' as const };
  const cu = entitatiCote(doc(true), 0, o), fara = entitatiCote(doc(false), 0, o);
  assert.equal(cu.cote, 1);
  assert.deepEqual(cu.definitii, [], 'lungimea n-are DIMENSION');
  assert.ok(cu.entitati.length > fara.entitati.length, `simbolul arcului: ${cu.entitati.length} entități, fără el ${fara.entitati.length}`);
  assert.deepEqual(cu.entitati.filter((e) => e.fel === 'text').map((e) => e.fel === 'text' ? e.text : ''), ['63']);
});

const caz = CORPUS_CAM.find((x) => x.id === 'placa-01');
if (!caz) throw new Error('placa 1');

test('ușa: o lungime bună trece; una stricată oprește documentul, cu motivul', () => {
  const brut = (cote: unknown[]): ReturnType<typeof incarca> => {
    const b = JSON.parse(JSON.stringify(caz.doc)) as { foi: Record<string, unknown>[] };
    b.foi = b.foi.map((f, k) => (k === 0 ? { ...f, cote } : f));
    return incarca(b);
  };
  const bun = { id: 'L', fel: 'lungime', puncte: [{ x: 70, y: 20 }], linie: { d: 8, u: 45 } };
  assert.ok(brut([bun]).ok);
  assert.ok(brut([{ ...bun, pe: 'contur', urma: { l: 320, curba: false } }]).ok);
  for (const [rau, motiv] of [
    [{ ...bun, puncte: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }, /lungime are 1 puncte/],
    [{ ...bun, linie: { d: 8 } }, /linie\.u/],
    [{ ...bun, linie: { d: 8, u: Number.NaN } }, /linie\.u/],
    [{ ...bun, pe: 'cerc' }, /pe e „contur”/],
    [{ ...bun, urma: { l: -1, curba: false } }, /urma/],
    [{ ...bun, urma: { l: 3 } }, /urma/],
    [{ ...bun, puncte: [{ x: 1, y: 1, legatura: { instanta: 'i', nod: 'n', n: 4, loc: { fel: 'varf', k: 0 } } }] }, /mijloc/],
  ] as const) {
    const u = brut([rau]);
    assert.ok(!u.ok, JSON.stringify(rau));
    assert.match(u.ok ? '' : u.motiv, motiv);
  }
});

test('programul: o cotă de lungime nu se taie (aceiași octeți ca fără cote)', async () => {
  const p = caz.parametri[0]!;
  const e0 = await calculeazaExportul(caz.doc, p);
  const b = JSON.parse(JSON.stringify(caz.doc)) as { foi: Record<string, unknown>[] };
  b.foi = b.foi.map((f, k) => (k === 0 ? { ...f, cote: [{ id: 'L', fel: 'lungime', puncte: [{ x: 70, y: 20 }], linie: { d: 8, u: 45 }, pe: 'contur', urma: { l: 320, curba: false } }] } : f));
  const u = incarca(b);
  assert.ok(u.ok && e0.ok);
  const e1 = await calculeazaExportul(u.doc, p);
  assert.ok(e1.ok);
  assert.equal(e1.program.text, e0.program.text);
  assert.deepEqual(e1.fisiere.map((x) => x.sha256), e0.fisiere.map((x) => x.sha256));
});
