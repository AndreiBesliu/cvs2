import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as v from 'valibot';
import { caleText } from '../../src/app/caleText.ts';
import type { Varf } from '../../src/geom/contur.ts';
import { blocText, SchemaBlocText } from '../../src/model/blocText.ts';
import { documentNou, type Document, type Piesa } from '../../src/model/document.ts';
import { transforma } from '../../src/model/transformare.ts';
import { aseazaText, type ParametriText, type TextAsezat } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { aseazaPeCurba } from '../../src/text/peCurba.ts';
import { piesaText } from '../../src/text/piesaText.ts';

/**
 * Aldinul și cursivul sintetic (ADR 0123).
 *
 * - **Corpusul independent** (`aldin` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/aldin.json`): oracolul nu
 *   construiește litera îngroșată; așază miezul (litera la h − 2d, înclinată dacă e cursivă, contururile din fontTools),
 *   apoi judecă punctele unei grile în jurul fiecărei litere: în figură dacă sunt în miez (înfășurarea nenulă) sau la cel
 *   mult d de conturul lui, după mutarea cu (d, d). Aici, aceleași puncte în contururile aplicației (par-impar, arcele
 *   desfăcute aici din bulge, după definiția DXF, nu cu codul aplicației), plus cutia fiecărei litere (a miezului lărgită
 *   cu d, exactă): sub 1,5e-3 mm, cât lasă aproximarea cubicelor prin biarce (0,001 mm, ADR 0033).
 * - **Cursivul** e exact (liniile și cubicele trec prin înclinare fără aproximare): cazurile lui sunt în corpusul comun
 *   (`text.corpus.test.ts`), contur cu contur, sub 1e-9 mm.
 * - **Pe hârtie:** H de 20 mm cu aldinul 0,6 (marginile, colțul dinăuntru ascuțit, avansul), H înclinat cu 12°.
 * - **Blocul:** aldinul și cursivul se țin în bloc și trec prin ușa lui (marginile, raportul față de înălțime), scalarea
 *   uniformă crește îngroșarea; pe curbă, literele îngroșate se mută întregi.
 */

const RAD = new URL('../../', import.meta.url);
const fonturi = new Map<string, Font>();
function font(cale: string): Font {
  const gata = fonturi.get(cale);
  if (gata) return gata;
  const r = citesteFont(new Uint8Array(readFileSync(new URL(cale, RAD))));
  if (!r.ok) throw new Error(`${cale}: ${r.cod}`);
  fonturi.set(cale, r.font);
  return r.font;
}
const roboto = (): Font => font('public/fonturi/roboto.ttf');

type Grila = { readonly x: number; readonly y: number; readonly pas: number; readonly nx: number; readonly ny: number; readonly clase: string };
type CazAldin = {
  readonly font: string; readonly parametri: ParametriText; readonly lipsa: number;
  readonly glife: ReadonlyArray<{ readonly caracter: string; readonly rand: number; readonly cutie: readonly [number, number, number, number]; readonly grila: Grila }>;
};
const ALDIN = JSON.parse(readFileSync(new URL('test/fixtures/text/aldin.json', RAD), 'utf8')) as Readonly<Record<string, CazAldin>>;

/**
 * Conturul ca poligon: arcele desfăcute din bulge (baleiajul 4 · atan(b), raza c (1 + b²) / 4|b|, centrul pe mediatoarea
 * coardei, la r · cos(baleiaj / 2) spre stânga mersului unui arc trigonometric), până la o săgeată de 1e-5 mm.
 */
function poligon(varfuri: readonly Varf[]): Array<readonly [number, number]> {
  const pts: Array<readonly [number, number]> = [];
  varfuri.forEach((q, k) => {
    const b = varfuri[(k + 1) % varfuri.length]!.p;
    pts.push([q.p.x, q.p.y]);
    assert.notEqual(q.s.tip, 'C', 'o literă îngroșată n-are cubice: doar linii și arce');
    if (q.s.tip !== 'A') return;
    const bulge = q.s.bulge;
    const dx = b.x - q.p.x, dy = b.y - q.p.y, c = Math.hypot(dx, dy);
    const baleiaj = 4 * Math.atan(bulge);
    const r = (c * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
    const h = Math.sign(bulge) * r * Math.cos(Math.abs(baleiaj) / 2);
    const cx = (q.p.x + b.x) / 2 - (dy / c) * h, cy = (q.p.y + b.y) / 2 + (dx / c) * h;
    const a0 = Math.atan2(q.p.y - cy, q.p.x - cx);
    const n = Math.max(1, Math.ceil(Math.abs(baleiaj) / Math.sqrt((8 * 1e-5) / r)));
    for (let i = 1; i < n; i++) pts.push([cx + r * Math.cos(a0 + (baleiaj * i) / n), cy + r * Math.sin(a0 + (baleiaj * i) / n)]);
  });
  return pts;
}

/** Clasa fiecărui punct al grilei în contururile unei litere, par-impar: rând cu rând, trecerile prin orizontala lui. */
function clase(poligoane: ReadonlyArray<ReadonlyArray<readonly [number, number]>>, g: Grila): string {
  let s = '';
  for (let j = 0; j < g.ny; j++) {
    const y = g.y + j * g.pas;
    const xs: number[] = [];
    for (const pg of poligoane) {
      for (let k = 0; k < pg.length; k++) {
        const [ax, ay] = pg[k]!, [bx, by] = pg[(k + 1) % pg.length]!;
        if ((ay <= y) !== (by <= y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    for (let i = 0; i < g.nx; i++) {
      const x = g.x + i * g.pas;
      s += xs.filter((t) => t > x).length % 2 === 1 ? '1' : '0';
    }
  }
  return s;
}

for (const [nume, caz] of Object.entries(ALDIN)) {
  test(`corpusul aldinului: ${nume} (${caz.font}), față de oracol (cutia și ${caz.glife.reduce((n, g) => n + g.grila.nx * g.grila.ny, 0)} de puncte)`, () => {
    const r = aseazaText(font(caz.font), caz.parametri);
    assert.equal(r.raport.lipsa, caz.lipsa);
    assert.equal(r.raport['aldin-esuat'], 0);
    assert.deepEqual(r.glife.map((g) => [g.caracter, g.rand]), caz.glife.map((g) => [g.caracter, g.rand]));
    caz.glife.forEach((ga, i) => {
      const gb = r.glife[i]!;
      for (const c of gb.cai) assert.ok(c.inchis);
      const poligoane = gb.cai.map((c) => poligon(c.varfuri));
      const xs = poligoane.flat().map((p) => p[0]), ys = poligoane.flat().map((p) => p[1]);
      const cutie = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      assert.ok(cutie.every((x, k) => Math.abs(x - ga.cutie[k]!) <= 1.5e-3), `${ga.caracter}: cutia ${cutie.join(', ')} față de ${ga.cutie.join(', ')}`);
      const aici = clase(poligoane, ga.grila);
      const gresite: string[] = [];
      for (let k = 0; k < aici.length; k++) {
        const o = ga.grila.clase[k];
        if (o !== '?' && o !== aici[k]) gresite.push(`(${(ga.grila.x + (k % ga.grila.nx) * ga.grila.pas).toFixed(3)}, ${(ga.grila.y + Math.floor(k / ga.grila.nx) * ga.grila.pas).toFixed(3)}) ${o}≠${aici[k]}`);
      }
      assert.equal(gresite.length, 0, `${ga.caracter} (rândul ${ga.rand}): ${gresite.length} puncte altfel decât oracolul, ca ${gresite.slice(0, 5).join('; ')}`);
    });
  });
}

const varfuriLitera = (t: TextAsezat, i: number): Array<readonly [number, number]> => t.glife[i]!.cai.flatMap((c) => c.varfuri.map((q) => [q.p.x, q.p.y] as const));
const are = (pts: ReadonlyArray<readonly [number, number]>, x: number, y: number, tol = 1e-9): boolean => pts.some(([a, b]) => Math.abs(a - x) <= tol && Math.abs(b - y) <= tol);

test('pe hârtie (ADR 0123): H de 20 mm cu aldinul 0,6 are tot 20 mm; marginea din stânga a miezului; colțul dinăuntru ascuțit; avansul + 1,2', () => {
  // Roboto: majuscula 1456; H are picioarele 169–361 și 1095–1288, bara 673–830, avansul 1460. Miezul are 18,8 mm.
  const s = 18.8 / 1456;
  const r = aseazaText(roboto(), { continut: 'HH', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', aldin: 0.6 });
  const v = varfuriLitera(r, 0);
  const ys = v.map((p) => p[1]), xs = v.map((p) => p[0]);
  assert.ok(Math.abs(Math.min(...ys)) <= 1e-9 && Math.abs(Math.max(...ys) - 20) <= 1e-9, `înălțimea ${Math.min(...ys)}…${Math.max(...ys)}`);
  assert.ok(Math.abs(Math.min(...xs) - 169 * s) <= 1e-9 && Math.abs(Math.max(...xs) - (1288 * s + 1.2)) <= 1e-9, `lățimea ${Math.min(...xs)}…${Math.max(...xs)}`);
  // Colțul dintre piciorul din stânga și bară, dedesubt: ascuțit, în (361 s + 1,2, 673 s); cel de deasupra, în (361 s + 1,2, 830 s + 1,2).
  assert.ok(are(v, 361 * s + 1.2, 673 * s), 'colțul dinăuntru de sub bară');
  assert.ok(are(v, 361 * s + 1.2, 830 * s + 1.2), 'colțul dinăuntru de deasupra barei');
  // Colțul de afară, sus în stânga, e rotunjit: arcul de rază 0,6 din (169 s − 0,6 + 0,6, 18,8 + 0,6) până în (169 s + 0,6, 20).
  assert.ok(!are(v, 169 * s, 20, 1e-6), 'colțul de afară nu e ascuțit');
  assert.ok(are(v, 169 * s, 19.4) && are(v, 169 * s + 0.6, 20), 'capetele arcului colțului');
  assert.ok(Math.abs(r.glife[1]!.x - r.glife[0]!.x - (1460 * s + 1.2)) <= 1e-12, 'avansul');
  assert.ok(Math.abs(r.glife[0]!.avans - (1460 * s + 1.2)) <= 1e-12);
});

test('pe hârtie (ADR 0123): cursivul de 12° duce vârful lui H cu 20 · tan 12° = 4,2511 mm la dreapta; baza și înălțimea rămân', () => {
  const s = 20 / 1456;
  const r = aseazaText(roboto(), { continut: 'H', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', cursiv: 12 });
  const v = varfuriLitera(r, 0);
  assert.ok(are(v, 169 * s, 0) && are(v, 169 * s + 4.2511312334004430, 20), 'piciorul din stânga, jos și sus');
  assert.ok(are(v, 1288 * s, 0) && are(v, 1288 * s + 4.2511312334004430, 20), 'piciorul din dreapta, jos și sus');
  // Bara (y = 673 s) se mută cu 673 s · tan 12°.
  assert.ok(are(v, 361 * s + 673 * s * Math.tan((12 * Math.PI) / 180), 673 * s));
  // Avansul nu se schimbă: un cursiv nu lărgește rândul.
  assert.ok(Math.abs(r.glife[0]!.avans - 1460 * s) <= 1e-12);
  assert.equal(r.raport['aldin-esuat'], 0);
});

test('literele îngroșate ținute în memorie: același miez cu altă îngroșare dă altă literă; din memorie, aceleași contururi', () => {
  // 20 mm cu 0,5 și 19,5 mm cu 0,25 au același miez, exact 19 mm: H de 20, respectiv de 19,5 mm.
  const p: ParametriText = { continut: 'H', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', aldin: 0.5 };
  const a = aseazaText(roboto(), p), b = aseazaText(roboto(), { ...p, inaltime: 19.5, aldin: 0.25 });
  const sus = (t: TextAsezat): number => Math.max(...varfuriLitera(t, 0).map((q) => q[1]));
  assert.ok(Math.abs(sus(a) - 20) <= 1e-9 && Math.abs(sus(b) - 19.5) <= 1e-9, `${sus(a)}, ${sus(b)}`);
  assert.deepEqual(aseazaText(roboto(), p), a);
});

test('o literă pe care offsetul o refuză nu se desenează și se numără (aldin-esuat)', () => {
  // Sub jumătatea rezoluției (0,005 mm), fațada refuză offsetul; panoul nu lasă așa ceva, dar așezarea trebuie s-o spună.
  const r = aseazaText(roboto(), { continut: 'HI', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', aldin: 0.001 });
  assert.equal(r.raport['aldin-esuat'], 2);
  assert.equal(r.glife.length, 0);
});

test('fără aldin și cursiv, așezarea e cea de dinainte (același rezultat cu 0 ca fără câmpuri)', () => {
  const p: ParametriText = { continut: 'Ușă\nde stejar', inaltime: 13, spatiere: 0.2, interlinie: 1.1, aliniere: 'centru' };
  assert.deepEqual(aseazaText(roboto(), { ...p, aldin: 0, cursiv: 0 }), aseazaText(roboto(), p));
});

test('aldinul păstrează rândurile (distanța lor e a înălțimii cerute) și coborârea miezului', () => {
  const p: ParametriText = { continut: 'H\nH', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' };
  const normal = aseazaText(roboto(), p), gros = aseazaText(roboto(), { ...p, aldin: 1 });
  assert.equal(gros.metrici.rand, normal.metrici.rand);
  assert.ok(Math.abs(gros.metrici.coborare - (normal.metrici.coborare * 18) / 20) <= 1e-12);
  // H de pe rândul al doilea are baza pe linia lui (−rândul) și vârful la 20 deasupra.
  const ys = gros.glife[1]!.cai.flatMap((c) => c.varfuri.map((q) => q.p.y));
  assert.ok(Math.abs(Math.min(...ys) + normal.metrici.rand) <= 1e-9 && Math.abs(Math.max(...ys) + normal.metrici.rand - 20) <= 1e-9);
});

// ── Blocul ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

const PARAM: ParametriText = { continut: 'OB a', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', aldin: 0.6, cursiv: 12 };
function piesa(p: ParametriText = PARAM): Piesa {
  const rez = piesaText(aseazaText(roboto(), p), { ...p, font: 'roboto' }, 'p1');
  if (!rez.ok) throw new Error(rez.motiv);
  return rez.piesa;
}
const docCu = (p: Piesa): Document => {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese: [p], foi: [{ ...d.foi[0]!, instante: [{ id: 'i1', piesa: p.id, x: 50, y: 50, rotire: 0 }] }] };
};

test('blocul ține aldinul și cursivul; scalarea uniformă crește îngroșarea (cursivul rămâne); sub 0,01 mm, piesa devine vectori', () => {
  const p = piesa();
  const b = blocText(p.radacina);
  assert.ok(b);
  assert.deepEqual([b.aldin, b.cursiv], [0.6, 12]);
  const mare = transforma(docCu(p), 0, ['i1'], { fel: 'scalare', sx: 1.5, sy: 1.5, ancora: { x: 0, y: 0 } });
  assert.ok(mare.ok);
  const bm = blocText(mare.piese[0]!.radacina);
  assert.ok(bm);
  assert.ok(Math.abs(bm.aldin! - 0.9) <= 1e-12 && bm.cursiv === 12 && Math.abs(bm.inaltime - 30) <= 1e-12);
  // Îngroșarea cea mai mică (0,01 mm), micșorată cu 0,9: 0,009 mm, sub rezoluție; textul rămâne doar vectori.
  const subtire = piesa({ ...PARAM, aldin: 0.01 });
  assert.equal(blocText(subtire.radacina)?.aldin, 0.01);
  const mic = transforma(docCu(subtire), 0, ['i1'], { fel: 'scalare', sx: 0.9, sy: 0.9, ancora: { x: 0, y: 0 } });
  assert.ok(mic.ok);
  assert.equal(Object.hasOwn(mic.piese[0]!.radacina, 'text'), false);
});

test('ușa blocului: îngroșarea între 0,01 mm și o cincime din înălțime, cursivul între −45° și 45°; fără ele, ca înainte', () => {
  const baza = { continut: 'A', font: 'roboto', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', amprenta: 'x' };
  const bun = (b: object): boolean => v.safeParse(SchemaBlocText, { ...baza, ...b }).success;
  assert.ok(bun({}));
  assert.ok(bun({ aldin: 0.01 }) && bun({ aldin: 4 }) && bun({ cursiv: -45 }) && bun({ cursiv: 45 }) && bun({ aldin: 4, cursiv: 0 }));
  assert.ok(!bun({ aldin: 0.009 }) && !bun({ aldin: 4.01 }) && !bun({ aldin: -1 }) && !bun({ aldin: Number.NaN }));
  assert.ok(!bun({ cursiv: 45.5 }) && !bun({ cursiv: -46 }) && !bun({ cursiv: Number.POSITIVE_INFINITY }));
  // Raportul e față de înălțimea blocului: 4 mm e prea mult la 19,9 mm.
  assert.ok(!v.safeParse(SchemaBlocText, { ...baza, inaltime: 19.9, aldin: 4 }).success);
});

test('previzualizarea desenează arcele (pe hârtie): raza c (1 + b²) / 4|b|, arcul mare peste |b| > 1, sensul întors de axa Y', () => {
  // Din (1, 0) în (−1, 0) cu b = 1: semicercul de rază 1, trigonometric (prin (0, 1), deasupra); în SVG, cu Y în jos, prin
  // (0, −1), deci în sensul unghiurilor descrescătoare: sweep 0. Înapoi cu b = −2: coarda 2, raza 2 · 5 / 8 = 1,25, arcul
  // mare (baleiajul 4 · atan 2 ≈ 253°), orar: sweep 1.
  const t = {
    glife: [{ caracter: 'o', rand: 0, x: 0, avans: 2, indice: 0, cai: [{ inchis: true, varfuri: [
      { p: { x: 1, y: 0 }, s: { tip: 'A' as const, bulge: 1 } }, { p: { x: -1, y: 0 }, s: { tip: 'A' as const, bulge: -2 } },
    ] }] }],
  } as unknown as TextAsezat;
  assert.equal(caleText(t)?.d, 'M1 0A1 1 0 0 0 -1 0A1.25 1.25 0 1 1 1 0Z');
  // H îngroșat: linii și colțurile de afară (câte patru pe fiecare picior; cele patru dinăuntru, de lângă bară, rămân
  // ascuțite), arce de 90° cu raza 0,6, trigonometrice (conturul de afară).
  const h = caleText(aseazaText(roboto(), { continut: 'H', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', aldin: 0.6 }))!.d;
  const arce = h.match(/A[^A-Z]*/g) ?? [];
  assert.equal(arce.length, 8);
  for (const a of arce) assert.match(a, /^A0\.6 0\.6 0 0 0 /);
});

test('aldinul pe curbă: literele îngroșate se mută întregi (arcele rămân arce, cu același bulge, laturile la fel de lungi)', () => {
  const drept = aseazaText(roboto(), { continut: 'OB', inaltime: 10, spatiere: 0, interlinie: 1, aliniere: 'centru', aldin: 0.5 });
  // Cercul R50 cu ancora sus (în origine), desenat trigonometric.
  const cerc = { inchis: true, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A' as const, bulge: 1 } }, { p: { x: 0, y: -100 }, s: { tip: 'A' as const, bulge: 1 } }] };
  const pe = aseazaPeCurba(drept, { contur: cerc, s: 0, pozitie: 'baza', distanta: 0, invers: false, orientare: 'rotita', intinsa: false }, 10, 'centru');
  assert.ok(pe);
  let arce = 0;
  drept.glife.forEach((g, i) => g.cai.forEach((c, j) => {
    const m = pe.glife[i]!.cai[j]!.varfuri;
    assert.equal(m.length, c.varfuri.length);
    c.varfuri.forEach((q, k) => {
      assert.deepEqual(m[k]!.s, q.s);
      if (q.s.tip === 'A') arce++;
      const u = c.varfuri[(k + 1) % c.varfuri.length]!.p, w = m[(k + 1) % m.length]!.p;
      assert.ok(Math.abs(Math.hypot(u.x - q.p.x, u.y - q.p.y) - Math.hypot(w.x - m[k]!.p.x, w.y - m[k]!.p.y)) <= 1e-9);
    });
  }));
  assert.ok(arce > 0);
});
