/**
 * Ușa DXF (ADR 0101) pe pachetul de probă al owner-ului (sonda s2, `docs/faza2/sonde/s2-export-import/pachet-owner/`):
 * același desen scris „exact” (R2007) și „compatibil” (R12), cu valorile pe hârtie din `CITESTE.md`. Apoi dus-întors cu
 * scriitorul nostru DXF (ADR 0088): un contur amestecat, scris ca polilinie plus spline, se leagă înapoi într-unul închis.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { citesteDxf, type CaleDxf } from '../../src/io/dxf.ts';
import { scrieDxf } from '../../src/io/dxfExport.ts';
import { bucatiContur, type VectoriFoaie } from '../../src/io/vectori.ts';
import { conturDreptunghi, type Contur } from '../../src/geom/contur.ts';
import { TOLERANTA_IMPORT } from '../../src/geom/toleranta.ts';
import { abatereElipsa, aproape, arie, cutie, esantioane, segmente } from './ajutor-dxf.ts';

const PACHET = 'docs/faza2/sonde/s2-export-import/pachet-owner';
const citit = (fisier: string) => {
  const r = citesteDxf(readFileSync(`${PACHET}/${fisier}`));
  if (!r.ok) assert.fail(`${fisier}: refuzat (${r.cod})`);
  return r;
};

/** Dreptunghiul 200 × 100 cu colțurile R10, rotit 30° în jurul centrului (270; 200): caseta și aria, pe hârtie. */
const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
const CASETA = { latime: (200 - 20) * COS + (100 - 20) * SIN + 20, inaltime: (200 - 20) * SIN + (100 - 20) * COS + 20 };
const ARIE_DREPTUNGHI = 200 * 100 - (4 - Math.PI) * 100;
const ELIPSA = { c: [75, 95] as const, a: 60, b: 30, rot_grade: 20 };

/** `tol`: precizia numerelor din fișier (R12 al sondei le scrie cu 9 zecimale). */
function comune(fisier: string, abatereElipsaMm: number, tol: number) {
  const r = citit(fisier);
  assert.deepEqual([...new Set(r.cai.map((c) => c.strat))].sort(), ['DECUPARE', 'GRAVARE']);
  // 11 închise: cercul, dreptunghiul, elipsa, cele 8 contururi ale textului (C, N, C, 2, 0 cu golul lui, m, m); deschisă: curba S.
  assert.deepEqual({ inchise: r.cai.filter((c) => c.inchis).length, deschise: r.cai.filter((c) => !c.inchis).length }, { inchise: 11, deschise: 1 });
  const cercul = r.cai.filter((c) => c.inchis && c.varfuri.length === 2 && aproape(c.varfuri[0]!.p, [120, 227], tol) && aproape(c.varfuri[1]!.p, [20, 227], tol));
  assert.equal(cercul.length, 1, 'cercul Ø100 în (70; 227), din două semicercuri');
  assert.ok(cercul[0]!.varfuri.every((v) => v.s.tip === 'A' && v.s.bulge === 1));
  const dreptunghi = r.cai.find((c) => c.strat === 'DECUPARE' && c.inchis && c.varfuri.length === 8);
  assert.ok(dreptunghi, 'dreptunghiul rotunjit: 4 laturi și 4 colțuri');
  assert.deepEqual(dreptunghi.varfuri.map((v) => v.s.tip), ['L', 'A', 'L', 'A', 'L', 'A', 'L', 'A']);
  assert.ok(dreptunghi.varfuri.every((v) => v.s.tip !== 'A' || Math.abs(v.s.bulge - Math.tan(Math.PI / 8)) <= tol), 'colțurile rotunde, de 90°');
  const k = cutie(dreptunghi);
  assert.ok(Math.abs(k.maxX - k.minX - CASETA.latime) <= tol && Math.abs(k.maxY - k.minY - CASETA.inaltime) <= tol, JSON.stringify(k));
  assert.equal(CASETA.latime.toFixed(2), '215.88');
  assert.equal(CASETA.inaltime.toFixed(2), '179.28');
  assert.ok(Math.abs(Math.abs(arie(dreptunghi)) - ARIE_DREPTUNGHI) <= tol * ARIE_DREPTUNGHI);
  const elipsa = r.cai.find((c) => c.strat === 'DECUPARE' && c.inchis && c !== dreptunghi && c !== cercul[0]);
  assert.ok(elipsa, 'elipsa 120 × 60');
  assert.ok(esantioane(elipsa).every((p) => abatereElipsa(p, ELIPSA) * ELIPSA.b <= abatereElipsaMm), 'elipsa, pe elipsă');
  const s = r.cai.find((c) => !c.inchis);
  assert.ok(s && s.strat === 'GRAVARE');
  assert.ok(aproape(s.varfuri[0]!.p, [160, 60], tol) && aproape(s.varfuri[s.varfuri.length - 1]!.p, [310, 60], tol));
  const ks = cutie(s);
  assert.equal((ks.maxY - ks.minY).toFixed(2), '34.64');
  assert.deepEqual([ks.minY.toFixed(2), ks.maxY.toFixed(2)], ['42.68', '77.32']);
  // Textul „CNC 20 mm”: litera N are exact 20,00, de la y 15 la y 35.
  const litere = r.cai.filter((c) => c.strat === 'GRAVARE' && c.inchis);
  assert.equal(litere.length, 8);
  assert.ok(litere.some((c) => { const q = cutie(c); return Math.abs(q.minY - 15) <= 1e-6 && Math.abs(q.maxY - 35) <= 1e-6; }), 'litera N, 20,00 mm');
  return { r, elipsa, s };
}

test('pachetul owner-ului, R2007: cercul e cerc, dreptunghiul cu colțuri rotunde, elipsa exactă (cubice), curba S o singură cubică', () => {
  const { r, elipsa, s } = comune('CNC-referinta-R2007.dxf', TOLERANTA_IMPORT * 1.01, 1e-9);
  assert.equal(r.unitati.declarate, true);
  assert.equal(r.unitati.mmPeUnitate, 1);
  assert.ok(segmente(elipsa).every((x) => x.s.tip === 'C'));
  assert.ok(Math.abs(Math.abs(arie(elipsa)) - Math.PI * 60 * 30) <= 1e-5 * Math.PI * 60 * 30);
  assert.equal(segmente(s).length, 1, 'curba S: 2 noduri');
  assert.equal(s.varfuri[0]!.s.tip, 'C');
  assert.equal(r.avertismente['unitati-nedeclarate'], 0);
});

test('pachetul owner-ului, R12: aceleași valori; elipsa din 112 arce (sub 0,001 mm; două perechi pe același cerc, unite: 110), curba S din 64 de arce (65 de noduri)', () => {
  const { r, elipsa, s } = comune('CNC-referinta-R12.dxf', 0.001, 1e-7);
  // R12 nu-și scrie unitățile: mm, cu avertismentul (dialogul lasă omul să aleagă).
  assert.equal(r.unitati.declarate, false);
  assert.equal(r.avertismente['unitati-nedeclarate'], 1);
  // 112 arce în fișier; la capetele axei mari, două perechi de arce vecine stau pe același cerc (R 15,002, simetria
  // biarcelor; verificat și cu ezdxf): ușa le unește, cu aceeași geometrie.
  assert.equal(segmente(elipsa).length, 110);
  assert.ok(segmente(elipsa).every((x) => x.s.tip === 'A'));
  assert.equal(s.varfuri.length, 65);
  assert.ok(segmente(s).every((x) => x.s.tip === 'A'));
});

test('dus-întors cu scriitorul DXF (ADR 0088): cercul, dreptunghiul rotunjit, conturul amestecat (polilinie + spline) legat la loc, linia frântă', () => {
  const amestecat: Contur = {
    inchis: true,
    varfuri: [
      { p: { x: 200, y: 0 }, s: { tip: 'L' } },
      { p: { x: 200, y: 40 }, s: { tip: 'C', c1: { x: 240, y: 40 }, c2: { x: 240, y: 0 } } },
    ],
  };
  const dreptunghi = conturDreptunghi(0, 0, 100, 50, 5);
  const v: VectoriFoaie = {
    latime: 400, inaltime: 100,
    cutie: { minX: 0, minY: 0, maxX: 400, maxY: 100 },
    entitati: [
      { fel: 'cerc', strat: 'INTERIOR', element: 'c1', centru: { x: 50, y: 25 }, raza: 10 },
      ...bucatiContur(dreptunghi, 'EXTERIOR', 'c2'),
      ...bucatiContur(amestecat, 'EXTERIOR', 'c3'),
      { fel: 'polilinie', strat: 'PE_LINIE', element: 'c4', inchis: false, varfuri: [{ x: 300, y: 0, bulge: 0 }, { x: 320, y: 10, bulge: 0 }, { x: 340, y: 0, bulge: 0 }] },
    ],
  };
  // Conturul amestecat iese din două bucăți, de la prima schimbare de fel: cubica (o spline), apoi linia (o polilinie deschisă).
  assert.deepEqual(bucatiContur(amestecat, 'EXTERIOR', 'c3').map((e) => e.fel), ['spline', 'polilinie']);
  const r = citesteDxf(new TextEncoder().encode(scrieDxf(v)));
  assert.ok(r.ok);
  assert.equal(r.cai.length, 4);
  const [cerc, d, a, l] = r.cai as [CaleDxf, CaleDxf, CaleDxf, CaleDxf];
  assert.deepEqual(cerc.varfuri, [{ p: { x: 60, y: 25 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 40, y: 25 }, s: { tip: 'A', bulge: 1 } }]);
  assert.equal(cerc.strat, 'INTERIOR');
  assert.deepEqual(d.varfuri, dreptunghi.varfuri);
  assert.ok(d.inchis);
  assert.ok(a.inchis && a.strat === 'EXTERIOR');
  assert.deepEqual(segmente(a).map((x) => x.s.tip).sort(), ['C', 'L']);
  assert.ok(Math.abs(arie(a) - arie({ inchis: true, varfuri: amestecat.varfuri })) <= 1e-9);
  assert.equal(r.avertismente.unite, 2);
  assert.deepEqual(l.varfuri.map((x) => [x.p.x, x.p.y]), [[300, 0], [320, 10], [340, 0]]);
  assert.equal(l.inchis, false);
});
