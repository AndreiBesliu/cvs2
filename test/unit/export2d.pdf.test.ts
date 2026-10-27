/**
 * Exportul 2D în PDF și EPS (ADR 0089): arcele din cubice sub 0,001 mm, cu cât mai puține bucăți (cercul R50 din 7, ca în
 * s2), drumurile entităților, structura PDF-ului (offseturile xref, lungimea fluxului, straturile OCG, pagina = cutia foii)
 * și a EPS-ului (cutiile, căile), cutia lărgită de o formă care iese din foaie. Recitirea independentă: PyMuPDF și
 * Ghostscript, în `test/oracles-py/export2d.py`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abatereCubica, arcBulgeCubice, arcCubice, bucatiArc, TOLERANTA_CUBICE } from '../../src/io/cubice.ts';
import { drumEntitate } from '../../src/io/drumuri.ts';
import { PT_PE_MM, scriePdf } from '../../src/io/pdfExport.ts';
import { scrieEps } from '../../src/io/epsExport.ts';
import { exportaVectori } from '../../src/io/exportVectori.ts';
import { vectoriFoaie } from '../../src/io/vectori.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { CORPUS } from '../../scripts/export2d-corpus.ts';

const corpus = () => {
  const r = incarca(structuredClone(CORPUS));
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};

test('cubicele unui arc: sub toleranță, cu cele mai puține bucăți (cel mult 90° fiecare); cercul R50 din 7, ca în s2', () => {
  assert.equal(TOLERANTA_CUBICE, 0.001);
  assert.equal(bucatiArc(50, 2 * Math.PI), 7);
  assert.ok(abatereCubica(50, (2 * Math.PI) / 7) < 0.0005, 'R50: sub 0,0005 mm (s2: 0,00047)');
  for (const r of [0.01, 1, 3, 10, 25, 50, 600, 2440]) {
    const n = bucatiArc(r, 2 * Math.PI);
    assert.ok(abatereCubica(r, (2 * Math.PI) / n) <= 0.9 * TOLERANTA_CUBICE, `R${r}: ${n} bucăți`);
    assert.ok(n === 4 || abatereCubica(r, (2 * Math.PI) / (n - 1)) > 0.9 * TOLERANTA_CUBICE, `R${r}: ${n - 1} ar fi ajuns`);
    assert.ok(n >= 4, 'cel mult 90° pe bucată');
  }
  // Abaterea crește cu raza: R2440 cere mai multe bucăți decât R50, R0,01 doar sferturi.
  assert.equal(bucatiArc(0.01, 2 * Math.PI), 4);
  assert.ok(bucatiArc(2440, 2 * Math.PI) > 7);
});

test('arcul cu bulge, ca cubice: capetele exacte, punctele pe cerc, pe partea cerută de semn', () => {
  const pe = (c: { p: { x: number; y: number } }) => c.p;
  // Semicercul (0, 0) → (10, 0), bulge 1 (trigonometric): centrul (5, 0), trece pe dedesubt.
  const s = arcBulgeCubice({ x: 0, y: 0 }, { x: 10, y: 0 }, 1);
  assert.deepEqual(pe(s.at(-1)!), { x: 10, y: 0 });
  for (const c of s) {
    for (const t of [0.25, 0.5, 0.75]) {
      const u = 1 - t, a = s[s.indexOf(c) - 1]?.p ?? { x: 0, y: 0 };
      const x = u * u * u * a.x + 3 * u * u * t * c.c1.x + 3 * u * t * t * c.c2.x + t * t * t * c.p.x;
      const y = u * u * u * a.y + 3 * u * u * t * c.c1.y + 3 * u * t * t * c.c2.y + t * t * t * c.p.y;
      assert.ok(Math.abs(Math.hypot(x - 5, y) - 5) <= TOLERANTA_CUBICE, `pe cerc: ${x}, ${y}`);
      assert.ok(y <= 1e-9, 'trigonometric de la stânga la dreapta = pe dedesubt');
    }
  }
  // Același cu bulge −1: deasupra.
  assert.ok(arcBulgeCubice({ x: 0, y: 0 }, { x: 10, y: 0 }, -1).every((c) => c.p.y >= -1e-9 && c.c1.y >= -1e-9));
  // Un sfert orar (baleiaj negativ): de la unghiul 0 la −90°, punctele cu y ≤ 0.
  const o = arcCubice({ x: 0, y: 0 }, 10, 0, -Math.PI / 2);
  assert.ok(Math.abs(o.at(-1)!.p.x) < 1e-9 && Math.abs(o.at(-1)!.p.y + 10) < 1e-9);
});

test('drumurile: cercul pornește din (cx + r, cy) și se închide; polilinia închisă se închide, cea deschisă nu; curba e exactă', () => {
  const c = drumEntitate({ fel: 'cerc', strat: 'INTERIOR', element: 'c', centru: { x: 400, y: 250 }, raza: 50 });
  assert.deepEqual(c[0], { op: 'm', x: 450, y: 250 });
  assert.equal(c.filter((x) => x.op === 'c').length, 7);
  assert.deepEqual(c.at(-1), { op: 'h' });
  const ultima = c.at(-2)!;
  assert.ok(ultima.op === 'c' && Math.abs(ultima.x - 450) < 1e-9 && Math.abs(ultima.y - 250) < 1e-9);
  const inchisa = drumEntitate({ fel: 'polilinie', strat: 'EXTERIOR', element: 'p', inchis: true, varfuri: [{ x: 0, y: 0, bulge: 0 }, { x: 10, y: 0, bulge: 1 }] });
  // Semicercul R5: două sferturi ar ieși la 0,00135 mm, deci 3 cubice.
  assert.equal(bucatiArc(5, Math.PI), 3);
  assert.deepEqual(inchisa.map((x) => x.op), ['m', 'l', 'c', 'c', 'c', 'h']);
  const deschisa = drumEntitate({ fel: 'polilinie', strat: 'EXTERIOR', element: 'p', inchis: false, varfuri: [{ x: 0, y: 0, bulge: 0 }, { x: 10, y: 0, bulge: 0 }] });
  assert.deepEqual(deschisa, [{ op: 'm', x: 0, y: 0 }, { op: 'l', x: 10, y: 0 }]);
  const s = drumEntitate({ fel: 'spline', strat: 'PE_LINIE', element: 's', puncte: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 0 }] });
  assert.deepEqual(s, [{ op: 'm', x: 0, y: 0 }, { op: 'c', x1: 1, y1: 2, x2: 3, y2: 2, x: 4, y: 0 }]);
});

test('PDF: 1.5, numai ASCII; offseturile xref duc la obiecte, startxref la xref, /Length = fluxul; straturile OCG; pagina = cutia foii', () => {
  const v = vectoriFoaie(corpus(), 0, true);
  const pdf = scriePdf(v);
  assert.ok(pdf.startsWith('%PDF-1.5\n'));
  assert.ok(/^[\x0a\x20-\x7e]*$/.test(pdf), 'numai ASCII');
  const xref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(pdf)![1]);
  assert.ok(pdf.startsWith('xref\n', xref));
  const randuri = pdf.slice(xref).split('\n');
  const n = Number(randuri[1]!.split(' ')[1]);
  for (let i = 1; i < n; i++) {
    const intrare = randuri[2 + i]!;
    assert.match(intrare, /^\d{10} 00000 n $/);
    assert.ok(pdf.startsWith(`${i} 0 obj\n`, Number(intrare.slice(0, 10))), `obiectul ${i}`);
  }
  assert.match(pdf, new RegExp(`trailer\\n<< /Size ${n} /Root 1 0 R >>`));
  const m = /<< \/Length (\d+) >>\nstream\n/.exec(pdf)!;
  const start = m.index + m[0].length;
  assert.ok(pdf.startsWith('endstream', start + Number(m[1])), '/Length');
  const straturi = [...pdf.matchAll(/<< \/Type \/OCG \/Name \(([A-Z_]+)\) >>/g)].map((x) => x[1]);
  assert.deepEqual(straturi, ['EXTERIOR', 'INTERIOR', 'PE_LINIE', 'BUZUNAR', 'GAURIRE', 'FARA_OPERATIE', 'FOAIE']);
  assert.equal([...pdf.matchAll(/\/OC \/OC\d BDC/g)].length, 7);
  assert.equal([...pdf.matchAll(/\nS\n/g)].length, v.entitati.length, 'o cale pe entitate');
  assert.ok(pdf.includes(`/MediaBox [0 0 ${(600 * PT_PE_MM).toFixed(6)} ${(400 * PT_PE_MM).toFixed(6).replace(/0+$/, '')}]`));
  assert.ok(pdf.includes(`\n${72 / 25.4} 0 0 ${72 / 25.4} 0 0 cm\n`) || pdf.includes(`${72 / 25.4} 0 0 ${72 / 25.4} 0 0 cm`), 'scara în mm, cu toate cifrele');
});

test('EPS: EPSF-3.0, numai ASCII; BoundingBox întreg (în jos / în sus) din HiResBoundingBox; o cale pe entitate; culoarea fiecărui strat', () => {
  const v = vectoriFoaie(corpus(), 0, false);
  const eps = scrieEps(v, 'corpus');
  assert.ok(eps.startsWith('%!PS-Adobe-3.0 EPSF-3.0\n'));
  assert.ok(/^[\x0a\x20-\x7e]*$/.test(eps), 'numai ASCII');
  const hi = /%%HiResBoundingBox: (.+)\n/.exec(eps)![1]!.split(' ').map(Number);
  assert.deepEqual(hi.map((x) => Math.round(x * 1000) / 1000), [0, 0, 1700.787, 1133.858]);
  assert.match(eps, /%%BoundingBox: 0 0 1701 1134\n/);
  assert.equal([...eps.matchAll(/\nstroke\n/g)].length, v.entitati.length);
  assert.equal([...eps.matchAll(/% Stratul /g)].length, 6, 'fără conturul foii: 6 straturi');
  for (const l of eps.split('\n').filter((x) => x.endsWith(' curveto'))) assert.equal(l.split(' ').length, 7, l);
  assert.match(eps, /% Stratul GAURIRE\n0\.0902 0\.7451 0\.8118 setrgbcolor\n/);
  // Un contur închis se închide și în fișier (un program care importă EPS-ul altfel îl vede deschis): cele 5 cercuri și cele
  // 2 dreptunghiuri; curbele și poliliniile deschise, nu.
  const inchise = v.entitati.filter((e) => e.fel === 'cerc' || (e.fel === 'polilinie' && e.inchis)).length;
  assert.equal(inchise, 7);
  assert.equal([...eps.matchAll(/\nclosepath\nstroke\n/g)].length, inchise);
  assert.equal([...eps.matchAll(/\nclosepath\n/g)].length, inchise);
  assert.equal([...scriePdf(v).matchAll(/\nh\nS\n/g)].length, inchise, 'la fel în PDF');
});

test('cutia: o formă care iese din foaie o lărgește exact (pagina PDF, EPS, întinderea DXF); fără ea, cutia e foaia', () => {
  const d = corpus();
  assert.deepEqual(vectoriFoaie(d, 0, false).cutie, { minX: 0, minY: 0, maxX: 600, maxY: 400 });
  // Cercul piesei C mutat spre stânga, peste margine: centrul în (−10, 30), R5 → x de la −15.
  const iesit = structuredClone(d);
  iesit.foi[0]!.instante[2] = { ...iesit.foi[0]!.instante[2]!, x: -10 };
  const c = vectoriFoaie(iesit, 0, false).cutie;
  assert.deepEqual([c.minX, c.minY, c.maxX, c.maxY], [-15, 0, 600, 400]);
  assert.ok(scriePdf(vectoriFoaie(iesit, 0, false)).includes(`/MediaBox [${(-15 * PT_PE_MM).toFixed(6)} 0 `));
  assert.match(scrieEps(vectoriFoaie(iesit, 0, false), 'x'), /%%BoundingBox: -43 0 1701 1134\n/);
  // Și o formă care nu e cerc: piesa B (dreptunghiul oglindit, x 520…560) mutată cu 50 mm iese pe dreapta până la 610.
  const dreapta = structuredClone(d);
  dreapta.foi[0]!.instante[1] = { ...dreapta.foi[0]!.instante[1]!, x: 50 };
  assert.deepEqual(vectoriFoaie(dreapta, 0, false).cutie, { minX: 0, minY: 0, maxX: 610, maxY: 400 });
});

test('panoul: PDF și EPS cu numele și tipul lor', () => {
  const p = exportaVectori(corpus(), 0, 'pdf', false);
  assert.deepEqual([p.nume, p.tip, p.entitati, p.straturi], ['cncvs2-foaia-1.pdf', 'application/pdf', 12, 6]);
  const e = exportaVectori(corpus(), 0, 'eps', true);
  assert.deepEqual([e.nume, e.tip, e.entitati, e.straturi], ['cncvs2-foaia-1.eps', 'application/postscript', 13, 7]);
  assert.match(e.text, /%%Title: cncvs2-foaia-1\n/);
});
