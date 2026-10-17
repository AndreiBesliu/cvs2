/**
 * Cazurile recenziei feliei 2.7b (ADR 0034), fiecare reprodus de o lentilă și confirmat de un verificator:
 * - ușa: arcul cu raza absurdă (bulge aproape de 0 sau uriaș; NaN în CAM, un semicerc ascuns tăiat în piesă), matricile la
 *   limita similitudinii sub rotirea instanței (pânza arunca la fiecare pornire), instanța mutată sau copiată peste 10⁷ mm;
 * - offsetul: contactul fals dintre două arce mici tangente și buclele minuscule de la joncțiunile aproape tangente
 *   (căi netede refuzate cu „se atinge singur”);
 * - regiunea: două căi care se ating exact scăpau de refuz când biarcele le depărtau cu ~1e-4 mm;
 * - avertismentele: colțurile curbe fără degajare se spun; o curbă strânsă se spune o dată, nu pe fiecare arc al ei;
 * - timpul: verificările offsetului și apropierile erau O(n·m).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Dicționarele de bază vin la cerere (`t.ts`): testele care cer texte le încarcă întâi pe amândouă.
import './limbi.ts';
import { listaDesen } from '../../src/app/desen.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { distantaLaContur } from '../../src/geom/distanta.ts';
import { compune, determinant, rotatie, transformaContur } from '../../src/geom/matrice.ts';
import { TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import { traduce } from '../../src/i18n/t.ts';
import { avertismente } from '../../src/model/avertismente.ts';
import { PLAFON, type Document, type FormaDoc, type Operatie, type VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { istoricNou } from '../../src/model/jurnal.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { instantaLa } from '../../src/ui/actiuniAlegere.ts';
import { D } from './ajutor-cale.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const P = (x: number, y: number) => ({ x, y });
const F = { latime: 2440, inaltime: 1220, grosime: 18 };
const motiv = (r: ReturnType<typeof incarca>): string => (r.ok ? '' : r.motiv);
const prinUsa = (d: unknown) => incarca(JSON.parse(jsonCanonic(d)));

/** O piesă cu un singur element, pusă cu rotirea dată (matricea elementului dată). */
function piesa(forma: FormaDoc, matrice: Document['piese'][number]['radacina']['matrice'], x: number, y: number, rotire: number, op?: Partial<Operatie>): Document {
  const d = docDin(F, { id: 'c', forma, matrice: { ...ID } });
  const p = d.piese[0];
  if (!p || p.radacina.tip !== 'element') throw new Error('piesa');
  p.radacina.matrice = matrice;
  const foaie = d.foi[0];
  if (!foaie) throw new Error('foaie');
  foaie.instante = [{ id: 'c', piesa: 'c', x, y, rotire }];
  return op ? cuOperatie(d, 'c', op) : d;
}

const kappa = 0.5522847498307936;
/** Elipsa din patru cubice (κ), cu centrul în (cx, cy). */
function elipsa(cx: number, cy: number, a: number, b: number): FormaDoc {
  const v: VarfDoc[] = [
    { p: P(cx + a, cy), s: { tip: 'C', c1: P(cx + a, cy + kappa * b), c2: P(cx + kappa * a, cy + b) } },
    { p: P(cx, cy + b), s: { tip: 'C', c1: P(cx - kappa * a, cy + b), c2: P(cx - a, cy + kappa * b) } },
    { p: P(cx - a, cy), s: { tip: 'C', c1: P(cx - a, cy - kappa * b), c2: P(cx - kappa * a, cy - b) } },
    { p: P(cx, cy - b), s: { tip: 'C', c1: P(cx + kappa * a, cy - b), c2: P(cx + a, cy - kappa * b) } },
  ];
  return { tip: 'cale', inchis: true, varfuri: v };
}

/** Dreptunghiul cu colțurile sferturi de cerc scrise ca cubice (κ), cu raza r. */
function dreptunghiCubic(x: number, y: number, w: number, h: number, r: number): FormaDoc {
  const k = kappa * r, x1 = x + w, y1 = y + h;
  const v: VarfDoc[] = [
    { p: P(x + r, y), s: { tip: 'L' } },
    { p: P(x1 - r, y), s: { tip: 'C', c1: P(x1 - r + k, y), c2: P(x1, y + r - k) } },
    { p: P(x1, y + r), s: { tip: 'L' } },
    { p: P(x1, y1 - r), s: { tip: 'C', c1: P(x1, y1 - r + k), c2: P(x1 - r + k, y1) } },
    { p: P(x1 - r, y1), s: { tip: 'L' } },
    { p: P(x + r, y1), s: { tip: 'C', c1: P(x + r - k, y1), c2: P(x, y1 - r + k) } },
    { p: P(x, y1 - r), s: { tip: 'L' } },
    { p: P(x, y + r), s: { tip: 'C', c1: P(x, y + r - k), c2: P(x + r - k, y) } },
  ];
  return { tip: 'cale', inchis: true, varfuri: v };
}

/** Bulă netedă: Catmull-Rom închis, ca cubice, pe raze aleatoare (sămânța dată). */
function bula(n: number, r0: number, samanta: number): FormaDoc {
  let s = samanta;
  const rnd = (): number => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const pts = Array.from({ length: n }, (_, i) => {
    const u = (2 * Math.PI * i) / n, r = r0 * (0.75 + 0.5 * rnd());
    return P(r * Math.cos(u), r * Math.sin(u));
  });
  return {
    tip: 'cale',
    inchis: true,
    varfuri: pts.map((p, i): VarfDoc => {
      const p0 = pts[(i - 1 + n) % n] as { x: number; y: number }, p2 = pts[(i + 1) % n] as { x: number; y: number }, p3 = pts[(i + 2) % n] as { x: number; y: number };
      return { p, s: { tip: 'C', c1: P(p.x + (p2.x - p0.x) / 6, p.y + (p2.y - p0.y) / 6), c2: P(p2.x - (p3.x - p.x) / 6, p2.y - (p3.y - p.y) / 6) } };
    }),
  };
}

const PATRAT_CU_ARC = (bulge: number): FormaDoc => ({
  tip: 'cale',
  inchis: true,
  varfuri: [{ p: P(0, 0), s: { tip: 'A', bulge } }, { p: P(40, 0), s: { tip: 'L' } }, { p: P(40, 40), s: { tip: 'L' } }, { p: P(0, 40), s: { tip: 'L' } }],
});

test('ușa: arcul căii are raza cel mult 10 000 mm (bulge aproape de 0, uriaș, nefinit în CAM); semicercul și raza de 9 990 mm trec', () => {
  for (const b of [-6.123233995736766e-17, -1e-12, -1e-20, 1e200, 1.4e154, Number.MAX_VALUE, 5e-324]) {
    assert.match(motiv(prinUsa(piesa(PATRAT_CU_ARC(b), { ...ID }, 100, 50, 0))), /are raza peste 10000 mm/, String(b));
  }
  // Raza (c/4)(b + 1/b) cu coarda 40: b = 0,001001 dă ~9 990 mm, sub plafon.
  assert.ok(prinUsa(piesa(PATRAT_CU_ARC(-0.001001), { ...ID }, 100, 50, 0)).ok);
  assert.ok(prinUsa(piesa(D, { ...ID }, 100, 50, 0)).ok);
  assert.equal(PLAFON.latura, 10_000);
});

test('matricile la limita similitudinii: sub orice rotire a instanței, pânza, clicul și exportul nu aruncă', () => {
  const aproape = { a: 1, b: 0.495e-12, c: 0.495e-12, d: 1 - 0.99e-12, e: 0, f: 0 };
  const cerc: FormaDoc = { tip: 'cerc', raza: 15 };
  for (const forma of [D, cerc]) {
    for (const rotire of [0, 30, 45, 123.456, 315]) {
      const d = piesa(forma, aproape, 300, 300, rotire, { latura: 'interior' });
      const r = prinUsa(d);
      assert.ok(r.ok, `${forma.tip} ${rotire}: ${motiv(r)}`);
      if (!r.ok) continue;
      assert.doesNotThrow(() => listaDesen(r.doc), `pânza ${rotire}`);
      assert.doesNotThrow(() => instantaLa(r.doc, 300, 300, 0.5), `clicul ${rotire}`);
      assert.doesNotThrow(() => avertismente(r.doc), `avertismentele ${rotire}`);
      assert.doesNotThrow(() => programDinDocument(r.doc), `exportul ${rotire}`);
    }
  }
});

test('un grup neuniform compensat de element, cu arce: ușa judecă matricea în lume și refuză, cu motiv, în loc să arunce la pornire', () => {
  // Grupul scalează 1e4 × 1 (cond ≈ 1e4, la plafonul scării), elementul îl compensează; compus în ordinea lumii (de la
  // instanță în jos), rotunjirea diferă de cea a ușii (de la rădăcină în jos).
  const d = docDin(F, { id: 'c', forma: D, matrice: { ...ID } });
  const p = d.piese[0];
  if (!p || p.radacina.tip !== 'element') throw new Error('piesa');
  const element = { ...p.radacina, matrice: { a: 1e-4 * (1 + 3e-13), b: 0, c: 0, d: 1, e: 0, f: 0 } };
  p.radacina = { tip: 'grup', id: 'g', matrice: { a: 1e4, b: 0, c: 0, d: 1, e: 0, f: 0 }, copii: [element] };
  const foaie = d.foi[0];
  if (!foaie) throw new Error('foaie');
  foaie.instante = [{ id: 'c', piesa: 'c', x: 300, y: 300, rotire: 37 }];
  const r = prinUsa(d);
  if (r.ok) {
    // Dacă rotunjirea o lasă în toleranță, consumatorii trebuie s-o poată desena.
    assert.doesNotThrow(() => listaDesen(r.doc));
  } else {
    assert.match(r.motiv, /arce sub o matrice neuniformă/);
  }
});

test('mută și Ctrl+D nu duc o instanță peste 10⁷ mm: acțiunea e inactivă, cu motivul ei', () => {
  const d = piesa({ tip: 'cerc', raza: 15 }, { ...ID }, 9_999_990, 0, 0);
  let h = istoricNou(d);
  const ctx = (dx: number): ContextDocument => ({
    istoric: () => h, scrie: (x) => { h = x; }, selectie: () => ['c'], selecteaza: () => {}, deplasare: () => ({ dx, dy: 0 }),
  });
  const muta = ACTIUNI_DOCUMENT.find((a) => a.id === 'document.muta-selectia');
  const copie = ACTIUNI_DOCUMENT.find((a) => a.id === 'document.duplica-selectia');
  assert.ok(muta && copie);
  if (!muta || !copie) return;
  assert.equal(muta.activa(ctx(5)), true, 'în plafon');
  assert.equal(muta.activa(ctx(25)), 'motiv.prea-departe');
  assert.equal(copie.activa(ctx(0)), 'motiv.prea-departe', 'copia ar sta la 10 000 010 mm');
});

test('offsetul: contactul fals dintre două arce mici tangente nu mai refuză o cale (elipsa mică, dreptunghiul cu colțuri cubice)', () => {
  const elipsaMica = programDinDocument(piesa(elipsa(0, 0, 3, 1), { ...ID }, 600, 300, 10, { latura: 'exterior' }));
  assert.ok(elipsaMica.ok, elipsaMica.ok ? '' : elipsaMica.motiv);
  const colturi = programDinDocument(piesa(dreptunghiCubic(-10, -6, 20, 12, 3.5), { ...ID }, 600, 300, 10, { latura: 'interior' }));
  assert.ok(colturi.ok, colturi.ok ? '' : colturi.motiv);
});

/** Punctele în plan ale mișcărilor de tăiere din prima trecere, pe linii și arce. */
function puncte(d: Document): Array<{ x: number; y: number }> {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (!j.ok) return [];
  const rez: Array<{ x: number; y: number }> = [];
  let x = Number.NaN, y = Number.NaN, z = Number.NaN, z0: number | null = null;
  for (const a of j.program.miscari) {
    if (!('la' in a)) continue;
    const nx = a.la.X ?? x, ny = a.la.Y ?? y, nz = a.la.Z ?? z;
    if (a.tip !== 'rapida' && nz === z && nz < 0 && (z0 === null || nz === z0)) {
      z0 = nz;
      for (let k = 0; k <= 8; k++) {
        const f = k / 8;
        if (a.tip === 'arc') {
          const c = a.centru, r = Math.hypot(x - c.x, y - c.y), u0 = Math.atan2(y - c.y, x - c.x);
          let b = Math.atan2(ny - c.y, nx - c.x) - u0;
          if (a.sens === 'trigonometric') { while (b <= 1e-12) b += 2 * Math.PI; } else { while (b >= -1e-12) b -= 2 * Math.PI; }
          rez.push(P(c.x + r * Math.cos(u0 + b * f), c.y + r * Math.sin(u0 + b * f)));
        } else {
          rez.push(P(x + (nx - x) * f, y + (ny - y) * f));
        }
      }
    }
    x = nx; y = ny; z = nz;
  }
  return rez;
}

test('căile netede din multe cubice se taie (buclele minuscule ale offsetului scoase), la raza frezei de cubica exactă', () => {
  for (const [n, samanta] of [[32, 5], [128, 5], [128, 77]] as const) {
    for (const latura of ['exterior', 'interior'] as const) {
      for (let k = 0; k < 4; k++) {
        const forma = bula(n, 40, samanta + k);
        const d = piesa(forma, { ...ID }, 600, 300, 0, { latura });
        const exacta = conturElement({ forma, matrice: { a: 1, b: 0, c: 0, d: 1, e: 600, f: 300 } });
        let abatere = 0;
        for (const p of puncte(d)) abatere = Math.max(abatere, Math.abs(distantaLaContur(p, exacta) - 3));
        assert.ok(abatere <= TOLERANTA_PROIECT + 1e-6, `${n} cubice, ${latura}, ${samanta + k}: ${abatere}`);
      }
    }
  }
});

test('regiunea: o gaură-cale care atinge exact piesa-cale (omotetia printr-un punct al marginii) e refuzată', () => {
  // Piesa: elipsa 50 × 35 din cubice; gaura: omotetia ei de raport 0,5 prin punctul T de pe margine (pe o cubică).
  const piesaE = elipsa(0, 0, 25, 17.5);
  if (piesaE.tip !== 'cale') return;
  const u = 0.7, T = P(25 * Math.cos(u), 17.5 * Math.sin(u));
  // T e pe elipsa exactă, nu pe cea din cubice: luăm punctul cubicei de la t = 0,5 din primul sfert.
  const v0 = piesaE.varfuri[0] as VarfDoc, v1 = piesaE.varfuri[1] as VarfDoc;
  if (v0.s.tip !== 'C') return;
  const t = 0.5, w = 1 - t;
  const Tc = P(w * w * w * v0.p.x + 3 * w * w * t * v0.s.c1.x + 3 * w * t * t * v0.s.c2.x + t * t * t * v1.p.x,
    w * w * w * v0.p.y + 3 * w * w * t * v0.s.c1.y + 3 * w * t * t * v0.s.c2.y + t * t * t * v1.p.y);
  void T;
  const om = (p: { x: number; y: number }) => P(Tc.x + 0.5 * (p.x - Tc.x), Tc.y + 0.5 * (p.y - Tc.y));
  const gaura: FormaDoc = {
    tip: 'cale', inchis: true,
    varfuri: piesaE.varfuri.map((v) => ({ p: om(v.p), s: v.s.tip === 'C' ? { tip: 'C', c1: om(v.s.c1), c2: om(v.s.c2) } : v.s })),
  };
  const d = docDin(F, { id: 'p', forma: piesaE, matrice: { ...ID, e: 600, f: 300 } }, { id: 'g', forma: gaura, matrice: { ...ID, e: 600, f: 300 } });
  const r = programDinDocument(cuOperatie(d, 'g', { latura: 'interior' }));
  assert.match(r.ok ? '' : r.motiv, /regiunea păstrată: .* se ating sau se intersectează/);
});

test('avertismentele: colțurile curbe fără degajare se spun; o curbă strânsă se spune o dată, nu pe fiecare arc al biarcelor', () => {
  // „D”-ul ca gaură, cu dog-bone: cele două colțuri dintre linie și semicerc sunt concave pentru piesă și nu se degajează.
  const dGaura = programDinDocument(piesa(D, { ...ID }, 600, 300, 0, { latura: 'interior', colturi: { tip: 'dog-bone' } }));
  assert.ok(dGaura.ok, dGaura.ok ? '' : dGaura.motiv);
  if (dGaura.ok) assert.equal(dGaura.avertismente.filter((a) => /o latură a colțului e curbă/.test(a)).length, 2, dGaura.avertismente.join('\n'));
  // Elipsa 40 × 8 ca gaură: capetele ei (raza de curbură 1,6 mm) sunt sub raza frezei Ø6. Un avertisment pe capăt, nu pe arc.
  const el = programDinDocument(piesa(elipsa(0, 0, 20, 4), { ...ID }, 600, 300, 0, { latura: 'interior', colturi: { tip: 'dog-bone' } }));
  assert.ok(el.ok, el.ok ? '' : el.motiv);
  if (!el.ok) return;
  const curbe = el.avertismente.filter((a) => /se strânge până la raza/.test(a));
  assert.ok(curbe.length >= 2 && curbe.length <= 4, el.avertismente.join('\n'));
  assert.equal(el.avertismente.filter((a) => /colțul rotunjit/.test(a)).length, 0, 'arcele biarcelor nu sunt colțuri');
});

test('eticheta căii: pluralul românesc („1 segment”, „2 segmente”, „20 de segmente”) și cel englezesc', () => {
  const p = { latime: '1.00', inaltime: '1.00', x: '0.00', y: '0.00' };
  assert.match(traduce('ro', 'forma.cale', { ...p, n: 1 }), /, 1 segment,/);
  assert.match(traduce('ro', 'forma.cale', { ...p, n: 2 }), /, 2 segmente,/);
  assert.match(traduce('ro', 'forma.cale', { ...p, n: 20 }), /, 20 de segmente,/);
  assert.match(traduce('en', 'forma.cale', { ...p, n: 1 }), /, 1 segment,/);
  assert.match(traduce('en', 'forma.cale', { ...p, n: 50000 }), /, 50000 segments,/);
});

test('timpul CAM-ului crește aproape liniar: un poligon de 35 000 de vârfuri se taie în câteva secunde (era peste 7 minute)', () => {
  const n = 35_000, r = 500;
  const forma: FormaDoc = {
    tip: 'cale', inchis: true,
    varfuri: Array.from({ length: n }, (_, i): VarfDoc => ({ p: P(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)), s: { tip: 'L' } })),
  };
  const t0 = performance.now();
  const j = programDinDocument(piesa(forma, { ...ID }, 1220, 610, 0));
  const s = (performance.now() - t0) / 1000;
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  // Local ~2 s; pe CI de ~2,6 ori mai încet. Pătratic, era 437 s.
  assert.ok(s < 30, `${s.toFixed(1)} s`);
});

test('determinantul normat: o scalare de 1e-162 sub o rotire de 45° nu mai face din cerc o „matrice neuniformă” care aruncă', () => {
  // Determinantul brut al scalării e 5e-324 (pozitiv, deci ușa o primește), iar sub rotire ajunge 0.
  const s = 1.9e-162;
  const d = piesa({ tip: 'cerc', raza: 15 }, { a: s, b: 0, c: 0, d: s, e: 0, f: 0 }, 300, 300, 45);
  const r = prinUsa(d);
  if (!r.ok) return; // un refuz cu motiv e și el în contract; aruncarea nu.
  assert.doesNotThrow(() => listaDesen(r.doc));
  assert.doesNotThrow(() => instantaLa(r.doc, 300, 300, 0.5));
  assert.doesNotThrow(() => programDinDocument(r.doc));
});

test('un vârf dublat lângă un colț curb (o linie nulă, des într-un SVG) nu ascunde avertismentul colțului (oracolul, C20)', () => {
  // „D”-ul ca gaură, cu vârful (0, 40) dublat: o linie nulă înaintea semicercului.
  if (D.tip !== 'cale') return;
  const dublat: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 40), s: { tip: 'L' } }, ...D.varfuri] };
  const j = programDinDocument(piesa(dublat, { ...ID }, 600, 300, 0, { latura: 'interior', colturi: { tip: 'dog-bone' } }));
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (j.ok) assert.equal(j.avertismente.filter((a) => /o latură a colțului e curbă/.test(a)).length, 2, j.avertismente.join('\n'));
});

test('un refuz al biarcelor în CAM spune al cui e (otrava „refuzul fără id”, 2.7b): <idLume>: <motiv>', () => {
  // Un arc de 2·10⁶ mm, cu raza de curbură ~10⁶ mm: peste raza maximă a arcelor (9 900 mm), deci linii de ~89 mm la
  // 0,001 mm; zeci de mii de bucăți, peste plafonul de 4 096.
  const arc: FormaDoc = {
    tip: 'cale', inchis: true,
    varfuri: [{ p: P(0, 0), s: { tip: 'C', c1: P(0, 2e6), c2: P(2e6, 2e6) } }, { p: P(2e6, 0), s: { tip: 'L' } }],
  };
  const j = programDinDocument(cuOperatie(docDin(F, { id: 'c', forma: arc, matrice: ID }), 'c', { latura: 'exterior' }));
  assert.ok(!j.ok);
  assert.match(j.motiv, /^\S+\/c: .*4096 de bucăți/);
});

test('matricea în lume e judecată de ușă (otrava „fără matricea în lume”, 2.7b): un caz care trece în piesă și pică în lume', () => {
  // Grupul: 10⁴ × 1 sub o rotire de 27,1°, compensat de element; în piesă, abaterea e 9,1e-13 (sub 1e-12). Instanța rotită
  // cu 19,9° o duce, prin rotunjire, la 2,65e-12 în lume (peste 2e-12): ușa trebuie să refuze, cu motivul ei.
  const S = (x: number, y: number) => ({ a: x, b: 0, c: 0, d: y, e: 0, f: 0 });
  const d = docDin(F, { id: 'c', forma: D, matrice: { ...ID } });
  const p = d.piese[0];
  if (!p || p.radacina.tip !== 'element') throw new Error('piesa');
  const element = { ...p.radacina, matrice: compune(rotatie(360 - 27.1), S(1e-4, 1)) };
  p.radacina = { tip: 'grup', id: 'g', matrice: compune(S(1e4, 1), rotatie(27.1)), copii: [element] };
  const foaie = d.foi[0];
  if (!foaie) throw new Error('foaie');
  foaie.instante = [{ id: 'c', piesa: 'c', x: 300, y: 300, rotire: 19.9 }];
  assert.match(motiv(prinUsa(d)), /instanța c: c are arce sub o matrice neuniformă în lume/);
  // Fără rotirea instanței, aceeași piesă trece.
  foaie.instante = [{ id: 'c', piesa: 'c', x: 300, y: 300, rotire: 0 }];
  assert.ok(prinUsa(d).ok);
});

test('Ctrl+D împarte forma, nu o copiază (otrava „copia copiază formele”, 2.7b): istoricul nu crește cu o cale întreagă', () => {
  const d = piesa(D, { ...ID }, 100, 100, 0);
  let h = istoricNou(d);
  const ctx: ContextDocument = { istoric: () => h, scrie: (x) => { h = x; }, selectie: () => ['c'], selecteaza: () => {} };
  ACTIUNI_DOCUMENT.find((a) => a.id === 'document.duplica-selectia')?.ruleaza(ctx);
  const [vechi, nou] = h.doc.piese;
  assert.ok(vechi && nou && vechi.radacina.tip === 'element' && nou.radacina.tip === 'element');
  assert.notEqual(nou.radacina, vechi.radacina);
  assert.equal(nou.radacina.forma, vechi.radacina.forma);
});

test('oglindirea la scară minusculă (otrava „semnul din determinantul brut”, 2.7b): bulge-ul își schimbă tot semnul', () => {
  // Sub 1,9e-162 și 45°, determinantul brut se rotunjește la −0, iar cel normat rămâne −1.
  const s = 1.9e-162;
  const m = compune(rotatie(45), { a: -s, b: 0, c: 0, d: s, e: 0, f: 0 });
  assert.ok(!(determinant(m) < 0));
  const c = conturElement({ forma: D, matrice: { ...ID } });
  const t = transformaContur(c, m);
  const arc0 = c.varfuri.find((v) => v.s.tip === 'A');
  const arc1 = t.varfuri.find((v) => v.s.tip === 'A');
  assert.ok(arc0?.s.tip === 'A' && arc1?.s.tip === 'A');
  assert.equal(Math.sign(arc1.s.bulge), -Math.sign(arc0.s.bulge));
});
