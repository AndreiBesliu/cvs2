import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cutiiAlese, idGhidaj, MANERE, manerLovit, manereVazute, modManer, punctManer, ROTIRE_PX, susEticheta, tinteFoaie, transformareManer,
  transformareManerLipita, type Taste,
} from '../../src/app/editareCalcul.ts';
import { pasRigla } from '../../src/canvas/gradatii.ts';
import { lipeste, tinteDin } from '../../src/geom/lipire.ts';
import type { Document } from '../../src/model/document.ts';
import { docDin, ID } from './ajutor-document.ts';

/** Editarea pe pânză (ADR 0050): țintele foii, cutiile instanțelor alese, id-ul ghidajului nou, gradațiile riglelor. */

const STOC = { latime: 300, inaltime: 200, grosime: 18 };

/** Un dreptunghi de 40 × 20 la (50, 60), un cerc de rază 10 la (200, 100) și o cale deschisă (10, 10) → (30, 10). */
function document(): Document {
  const d = docDin(STOC,
    { id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { ...ID, e: 50, f: 60 } },
    { id: 'c', forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID, e: 200, f: 100 } },
    { id: 'l', forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 20, y: 0 }, s: { tip: 'L' } }] }, matrice: { ...ID, e: 10, f: 10 } });
  const f = d.foi[0];
  if (f) f.ghidaje = [{ id: 'g1', axa: 'x', poz: 123 }];
  return d;
}

test('țintele foii: foaia, ghidajele, cutiile celorlalte forme și capetele căilor deschise; fără cele alese', () => {
  const d = document();
  const t = tinteFoaie(d, new Set(['r']), true);
  const x = t.x.map((v) => `${v.fel}:${v.poz}`);
  for (const a of ['foaie:0', 'foaie:150', 'foaie:300', 'ghidaj:123', 'forma:190', 'forma:200', 'forma:210', 'forma:10', 'forma:30']) assert.ok(x.includes(a), a);
  assert.ok(!x.some((v) => v === 'forma:50' || v === 'forma:90'), 'dreptunghiul ales nu e țintă');
  assert.ok(!tinteFoaie(d, new Set(), false).x.some((v) => v.fel === 'ghidaj'), 'fără ghidaje la cerere');
  // Capătul căii (30, 10) e țintă pe ambele axe.
  assert.ok(t.y.some((v) => v.poz === 10 && v.fel === 'forma' && v.de === 30 && v.la === 30));
  // Sortate după poziție (căutarea binară o cere).
  assert.deepEqual(t.x.map((v) => v.poz), [...t.x.map((v) => v.poz)].sort((a, b) => a - b));
});

test('lipirea pe documentul real: dreptunghiul ales se lipește de ghidaj și de mijlocul cercului', () => {
  const d = document();
  const [r] = cutiiAlese(d, new Set(['r']));
  assert.deepEqual(r, { id: 'r', cutie: { minX: 50, minY: 60, maxX: 90, maxY: 80 } });
  const t = tinteFoaie(d, new Set(['r']), true);
  // Marginea dreaptă la 122,6 (dx = 32,6): ghidajul de la 123 trage, la 1 mm toleranță.
  assert.equal(lipeste(t, r?.cutie ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }, 32.6, 0, { toleranta: 1, grila: null }).dx, 33);
  // Mijlocul pe y (70 + dy) la 99,5: mijlocul cercului (100).
  assert.equal(lipeste(t, r?.cutie ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }, 0, 29.5, { toleranta: 1, grila: null }).dy, 30);
});

test('id-ul unui ghidaj nou e liber', () => {
  assert.equal(idGhidaj([]), 'g1');
  assert.equal(idGhidaj([{ id: 'g1', axa: 'x', poz: 0 }, { id: 'g2', axa: 'y', poz: 0 }]), 'g3');
  assert.equal(idGhidaj([{ id: 'g2', axa: 'x', poz: 0 }]), 'g3');
});

test('gradațiile: 1, 2 sau 5 × 10ⁿ mm, cel puțin 64 px între etichete; diviziunile mici după mantisă', () => {
  assert.deepEqual(pasRigla(1), { mare: 100, mic: 10 }, '1 px/mm: 64 mm → 100');
  assert.deepEqual(pasRigla(4), { mare: 20, mic: 5 }, '4 px/mm: 16 mm → 20');
  assert.deepEqual(pasRigla(10), { mare: 10, mic: 1 });
  assert.deepEqual(pasRigla(20), { mare: 5, mic: 1 });
  assert.deepEqual(pasRigla(1000).mare, 0.1);
  for (const s of [0.01, 0.37, 1, 3.3, 77, 1000]) assert.ok(pasRigla(s).mare * s >= 64 - 1e-9, String(s));
});

/** Tastele ținute la un gest (ADR 0240): „S” Shift, „C” Ctrl (⌘ pe Mac), „A” Alt. */
const T = (s = ''): Taste => ({ shift: s.includes('S'), ctrl: s.includes('C'), alt: s.includes('A') });

test('mânerele (ADR 0052, ADR 0240): ancora e mânerul opus; colțul proporțional, Ctrl liber; latura pe o axă; rotirea în jurul centrului', () => {
  const c = { minX: 0, minY: 0, maxX: 100, maxY: 50 };
  assert.deepEqual(MANERE.map((m) => punctManer(c, m)), [
    { x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 25 }, { x: 100, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 25 },
  ]);
  // Colțul ne tras la (150, 60): x s-a schimbat mai mult (1,5 față de 1,2), deci ambele 1,5; ancora în sv. Cu Ctrl, liber.
  assert.deepEqual(transformareManer(c, 'ne', { x: 100, y: 50 }, { x: 150, y: 60 }, T()), { fel: 'scalare', sx: 1.5, sy: 1.5, ancora: { x: 0, y: 0 } });
  assert.deepEqual(transformareManer(c, 'ne', { x: 100, y: 50 }, { x: 150, y: 60 }, T('C')), { fel: 'scalare', sx: 1.5, sy: 1.2, ancora: { x: 0, y: 0 } });
  // Latura v trasă la x = -100: doar x, ancora în mijlocul laturii e.
  assert.deepEqual(transformareManer(c, 'v', { x: 0, y: 25 }, { x: -100, y: 99 }, T()), { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 100, y: 25 } });
  // Mânerul urmează deplasarea: apăsat la 3 mm de punctul lui și neclintit, nu schimbă nimic; tras cu 50 mm, scalează cu 50 mm.
  assert.deepEqual(transformareManer(c, 'n', { x: 52, y: 51.5 }, { x: 52, y: 51.5 }, T()), { fel: 'scalare', sx: 1, sy: 1, ancora: { x: 50, y: 0 } });
  assert.deepEqual(transformareManer(c, 'n', { x: 52, y: 51.5 }, { x: 40, y: 101.5 }, T()), { fel: 'scalare', sx: 1, sy: 2, ancora: { x: 50, y: 0 } });
  // Pixelii mausului nu intră în geometrie: scara se rotunjește la 1e-4.
  const z = transformareManer(c, 'e', { x: 100, y: 25 }, { x: 133.333333, y: 25 }, T());
  assert.equal(z.fel === 'scalare' ? z.sx : 0, 1.3333);
  // Rotirea: un sfert de tură în jurul centrului (50, 25); Shift o prinde în pași de 15° (11,46° → 15°).
  assert.deepEqual(transformareManer(c, 'rotire', { x: 50, y: 75 }, { x: 0, y: 25 }, T()), { fel: 'rotire', unghi: 90, centru: { x: 50, y: 25 } });
  const u = transformareManer(c, 'rotire', { x: 150, y: 25 }, { x: 50 + 100 * Math.cos(0.2), y: 25 + 100 * Math.sin(0.2) }, T('S'));
  assert.equal(u.fel === 'rotire' ? u.unghi : NaN, 15);
  // Peste ±180° se ia drumul scurt: de la 170° la -170° sunt +20°, nu -340°.
  const s = transformareManer(c, 'rotire', { x: 50 + Math.cos(170 * Math.PI / 180), y: 25 + Math.sin(170 * Math.PI / 180) },
    { x: 50 + Math.cos(-170 * Math.PI / 180), y: 25 + Math.sin(-170 * Math.PI / 180) }, T());
  assert.equal(s.fel === 'rotire' ? s.unghi : NaN, 20);
});

test('tastele la mânere (ADR 0240), exemplul owner-ului: cercul Ø 40 din (100, 100), latura dreaptă trasă cu 10 mm', () => {
  const c = { minX: 80, minY: 80, maxX: 120, maxY: 120 };
  const e = (taste: string) => transformareManer(c, 'e', { x: 120, y: 100 }, { x: 130, y: 100 }, T(taste));
  // Fără tastă și cu Ctrl: elipsa 50 × 40, fix mijlocul laturii stângi (80, 100).
  assert.deepEqual(e(''), { fel: 'scalare', sx: 1.25, sy: 1, ancora: { x: 80, y: 100 } });
  assert.deepEqual(e('C'), { fel: 'scalare', sx: 1.25, sy: 1, ancora: { x: 80, y: 100 } });
  // Shift: proporțional, și pe latură: cercul Ø 50 (fix tot (80, 100), deci crește simetric față de linia de mijloc).
  assert.deepEqual(e('S'), { fel: 'scalare', sx: 1.25, sy: 1.25, ancora: { x: 80, y: 100 } });
  // Alt: față de centru (ancora, implicit centrul cutiei): elipsa 60 × 40; Alt + Shift: cercul Ø 60; Alt + Ctrl, ca Alt.
  assert.deepEqual(e('A'), { fel: 'scalare', sx: 1.5, sy: 1, ancora: { x: 100, y: 100 } });
  assert.deepEqual(e('AS'), { fel: 'scalare', sx: 1.5, sy: 1.5, ancora: { x: 100, y: 100 } });
  assert.deepEqual(e('AC'), { fel: 'scalare', sx: 1.5, sy: 1, ancora: { x: 100, y: 100 } });
  // Shift + Ctrl: câștigă Shift (răspunsul 3a).
  assert.deepEqual(e('SC'), e('S'));
  assert.deepEqual(e('SCA'), e('AS'));
  // Colțul ne tras cu (10, 4): fără tastă și cu Shift, decide x (1,25 față de 1,1); cu Ctrl, liber; cu Alt, față de centru
  // (1,5 față de 1,2); cu Alt + Ctrl, liber față de centru.
  const ne = (taste: string) => transformareManer(c, 'ne', { x: 120, y: 120 }, { x: 130, y: 124 }, T(taste));
  assert.deepEqual(ne(''), { fel: 'scalare', sx: 1.25, sy: 1.25, ancora: { x: 80, y: 80 } });
  assert.deepEqual(ne('S'), ne(''));
  assert.deepEqual(ne('C'), { fel: 'scalare', sx: 1.25, sy: 1.1, ancora: { x: 80, y: 80 } });
  assert.deepEqual(ne('A'), { fel: 'scalare', sx: 1.5, sy: 1.5, ancora: { x: 100, y: 100 } });
  assert.deepEqual(ne('AC'), { fel: 'scalare', sx: 1.5, sy: 1.2, ancora: { x: 100, y: 100 } });
  assert.deepEqual(ne('SC'), ne(''));
  // Latura de sus trasă cu 6 mm: fără tastă, elipsa 40 × 46; cu Shift, cercul Ø 46 (fix mijlocul laturii de jos); cu Alt,
  // 40 × 52 față de centru.
  const n = (taste: string) => transformareManer(c, 'n', { x: 100, y: 120 }, { x: 103, y: 126 }, T(taste));
  assert.deepEqual(n(''), { fel: 'scalare', sx: 1, sy: 1.15, ancora: { x: 100, y: 80 } });
  assert.deepEqual(n('S'), { fel: 'scalare', sx: 1.15, sy: 1.15, ancora: { x: 100, y: 80 } });
  assert.deepEqual(n('A'), { fel: 'scalare', sx: 1, sy: 1.3, ancora: { x: 100, y: 100 } });
});

test('tastele la mânere, pe toate opt mânerele: punctul fix, proporția, axa care nu se mișcă (ADR 0240)', () => {
  // Cutia 0…100 × 0…50, fiecare mâner tras cu (13, 7) mm față de apăsare.
  const c = { minX: 0, minY: 0, maxX: 100, maxY: 50 }, centru = { x: 50, y: 25 };
  const d = { x: 13, y: 7 };
  for (const m of MANERE) {
    const h = punctManer(c, m);
    const colt = m.length === 2, peX = m !== 'n' && m !== 's', peY = m !== 'e' && m !== 'v';
    for (const k of ['', 'S', 'C', 'A', 'AS', 'AC', 'SC', 'SCA']) {
      const t = transformareManer(c, m, h, { x: h.x + d.x, y: h.y + d.y }, T(k));
      assert.equal(t.fel, 'scalare');
      if (t.fel !== 'scalare') continue;
      const opus = punctManer(c, ({ nv: 'se', n: 's', ne: 'sv', e: 'v', se: 'nv', s: 'n', sv: 'ne', v: 'e' } as const)[m]);
      assert.deepEqual(t.ancora, k.includes('A') ? centru : opus, `${m}/${k}: punctul fix`);
      const proportional = k.includes('S') || (colt && !k.includes('C'));
      assert.equal(t.sx === t.sy, proportional || (t.sx === 1 && t.sy === 1), `${m}/${k}: proporția`);
      // Pe axa pe care mânerul nu se mișcă, fără proporție, scara e 1; pe cea pe care se mișcă, mânerul ajunge la h + d.
      if (!proportional && !peX) assert.equal(t.sx, 1, `${m}/${k}: x neatins`);
      if (!proportional && !peY) assert.equal(t.sy, 1, `${m}/${k}: y neatins`);
      if (!proportional && peX) assert.ok(Math.abs(t.ancora.x + (h.x - t.ancora.x) * t.sx - (h.x + d.x)) <= 1e-2, `${m}/${k}: x`);
      if (!proportional && peY) assert.ok(Math.abs(t.ancora.y + (h.y - t.ancora.y) * t.sy - (h.y + d.y)) <= 1e-2, `${m}/${k}: y`);
    }
  }
});

test('tastele la mânere: o ancoră dată (ADR 0240 §A); pe linia mânerului tras, axa ei nu se scalează; rotirea în jurul ei', () => {
  const c = { minX: 0, minY: 0, maxX: 40, maxY: 20 };
  // Ancora în (10, 10): latura dreaptă trasă de la 40 la 50 cu Alt dă sx = 40 / 30, cutia de la 10 − 10 · 4/3 la 50.
  const a = transformareManer(c, 'e', { x: 40, y: 10 }, { x: 50, y: 10 }, T('A'), {}, { x: 10, y: 10 });
  assert.deepEqual(a, { fel: 'scalare', sx: 1.3333, sy: 1, ancora: { x: 10, y: 10 } });
  // Fără Alt, ancora dată nu contează: fix e latura stângă, sx = 1,25, cutia [0, 50].
  assert.deepEqual(transformareManer(c, 'e', { x: 40, y: 10 }, { x: 50, y: 10 }, T(), {}, { x: 10, y: 10 }), { fel: 'scalare', sx: 1.25, sy: 1, ancora: { x: 0, y: 10 } });
  // Ancora pe latura dreaptă (40, 10), trasă cu Alt: x nu se scalează (1); cu Alt + Shift, nici y.
  assert.deepEqual(transformareManer(c, 'e', { x: 40, y: 10 }, { x: 50, y: 10 }, T('A'), {}, { x: 40, y: 10 }), { fel: 'scalare', sx: 1, sy: 1, ancora: { x: 40, y: 10 } });
  assert.deepEqual(modManer(c, 'e', T('A'), { x: 40, y: 10 }), { proportie: 'axa', fix: 'ancora', peLinie: true });
  // Rotirea în jurul ancorei: dreptunghiul rotit cu 90° în jurul colțului stânga-jos.
  assert.deepEqual(transformareManer(c, 'rotire', { x: 20, y: 0 }, { x: 0, y: 20 }, T(), {}, { x: 0, y: 0 }), { fel: 'rotire', unghi: 90, centru: { x: 0, y: 0 } });
});

test('modul mânerului, pentru eticheta de lângă cutie (ADR 0240 §E)', () => {
  const c = { minX: 0, minY: 0, maxX: 100, maxY: 50 }, centru = { x: 50, y: 25 };
  assert.deepEqual(modManer(c, 'e', T(), centru), { proportie: 'axa', fix: 'latura', peLinie: false });
  assert.deepEqual(modManer(c, 'e', T('S'), centru), { proportie: 'proportional', fix: 'latura', peLinie: false });
  assert.deepEqual(modManer(c, 'ne', T(), centru), { proportie: 'proportional', fix: 'colt', peLinie: false });
  assert.deepEqual(modManer(c, 'ne', T('C'), centru), { proportie: 'liber', fix: 'colt', peLinie: false });
  assert.deepEqual(modManer(c, 'ne', T('SC'), centru), { proportie: 'proportional', fix: 'colt', peLinie: false });
  assert.deepEqual(modManer(c, 'ne', T('AC'), centru), { proportie: 'liber', fix: 'centru', peLinie: false });
  assert.deepEqual(modManer(c, 'ne', T('A'), { x: 10, y: 10 }), { proportie: 'proportional', fix: 'ancora', peLinie: false });
});

test('eticheta mânerelor rămâne în banda vizibilă: deasupra rotirii, apoi sub cutie, apoi chiar sub bare (ADR 0102)', () => {
  const banda = { sus: 60, jos: 800 };
  // Cutia de la 200 la 400 px: eticheta la 200 − 26 − 34 = 140, deasupra mânerului de rotire.
  assert.equal(susEticheta(200, 400, banda), 140);
  // Exact la marginea benzii încă stă deasupra; un pixel mai sus ar intra sub bare și coboară sub cutie (400 + 16).
  assert.equal(susEticheta(120, 400, banda), 60);
  assert.equal(susEticheta(119, 400, banda), 416);
  // Sub cutie încape până la 800 − 34 − 16 = 750; mai jos (o piesă mai mare decât ecranul), eticheta stă chiar sub bare.
  assert.equal(susEticheta(70, 750, banda), 766);
  assert.equal(susEticheta(70, 751, banda), 60);
  assert.equal(susEticheta(-500, 2000, banda), 60);
});

test('mânerele pe ecran: sub 24 px pe o axă nu apar cele care o scalează; lovitura: rotirea, colțurile, apoi laturile', () => {
  assert.deepEqual(manereVazute(100, 100), MANERE);
  // O linie orizontală: doar capetele (e, v); o formă mică pe ecran: niciunul, ca să rămână de apucat și mutat.
  assert.deepEqual(manereVazute(200, 0), ['e', 'v']);
  assert.deepEqual(manereVazute(23.9, 23.9), []);
  // Cutia 0…100 × 0…50 mm, la 2 px/mm, cu originea foii în (10, 300) pe ecran: colțul ne în (210, 200), centrul sus în
  // (110, 200), rotirea în (110, 200 − 26).
  const c = { minX: 0, minY: 0, maxX: 100, maxY: 50 };
  const v = { tx: 10, ty: 300, scara: 2 };
  assert.equal(manerLovit(c, v, 210, 200), 'ne');
  assert.equal(manerLovit(c, v, 215.9, 194.1), 'ne');
  assert.equal(manerLovit(c, v, 216.1, 200), null);
  assert.equal(manerLovit(c, v, 110, 200 - ROTIRE_PX), 'rotire');
  assert.equal(manerLovit(c, v, 110, 203), 'n');
  assert.equal(manerLovit(c, v, 110, 250), null, 'înăuntrul cutiei: forma, nu un mâner');
  // Cutie strâmtă (30 px): colțul câștigă în fața laturii vecine.
  const s = { minX: 0, minY: 0, maxX: 15, maxY: 15 };
  assert.equal(manerLovit(s, v, 10 + 30 - 4, 300 - 30 + 4), 'ne');
  // Mică (10 px): nimic de scalat, doar rotirea.
  assert.equal(manerLovit({ minX: 0, minY: 0, maxX: 5, maxY: 5 }, v, 20, 290), null);
});

test('mânerul lipit (ADR 0055): latura ajunge exact pe ghidaj, nerotunjită; colțul proporțional ia doar axa care decide', () => {
  // Cutia 0…30 × 0…50; ghidajele x = 40,1 și y = 53; toleranța 2 mm, fără grilă.
  const c = { minX: 0, minY: 0, maxX: 30, maxY: 50 };
  const tinte = tinteDin([
    { axa: 'x', poz: 40.1, de: -Infinity, la: Infinity, fel: 'ghidaj' },
    { axa: 'y', poz: 53, de: -Infinity, la: Infinity, fel: 'ghidaj' },
  ]);
  const lip = (grila: number | null = null) => (p: { x: number; y: number }) => lipeste(tinte, { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }, 0, 0, { toleranta: 2, grila });
  const axe = (r: { linii: readonly { axa: string }[] }): string[] => r.linii.map((l) => l.axa).sort();

  // Latura e trasă la 39,5: se lipește la 40,1; scara 40,1 / 30 nu se rotunjește (fără lipire ar fi 1,3167).
  const e = transformareManerLipita(c, 'e', { x: 30, y: 25 }, { x: 39.5, y: 52.5 }, T(), lip());
  assert.ok(e.t.fel === 'scalare' && Math.abs(e.t.ancora.x + 30 * e.t.sx - 40.1) <= 1e-12 && e.t.sy === 1);
  assert.deepEqual(axe(e), ['x'], 'latura e nu ia lipirea pe y');
  const liber = transformareManerLipita(c, 'e', { x: 30, y: 25 }, { x: 39.5, y: 25 }, T(), null);
  assert.deepEqual([liber.t.fel === 'scalare' ? liber.t.sx : 0, liber.linii.length], [1.3167, 0]);

  // Colțul ne tras la (39,5; 52,5): x se lipește la 40,1 (schimbarea mai mare, 1,337 față de 1,06), y la 53 dar nu decide.
  const ne = transformareManerLipita(c, 'ne', { x: 30, y: 50 }, { x: 39.5, y: 52.5 }, T(), lip());
  assert.ok(ne.t.fel === 'scalare' && ne.t.sx === ne.t.sy && Math.abs(30 * ne.t.sx - 40.1) <= 1e-12);
  assert.deepEqual(axe(ne), ['x']);
  // Cu Ctrl (liber pe axe, ADR 0240; înainte, Shift): ambele ajung pe ghidaje.
  const sh = transformareManerLipita(c, 'ne', { x: 30, y: 50 }, { x: 39.5, y: 52.5 }, T('C'), lip());
  assert.ok(sh.t.fel === 'scalare' && Math.abs(30 * sh.t.sx - 40.1) <= 1e-12 && Math.abs(50 * sh.t.sy - 53) <= 1e-12);
  assert.deepEqual(axe(sh), ['x', 'y']);

  // Latura n ignoră ghidajul pe x: doar înălțimea, până la 53.
  const n = transformareManerLipita(c, 'n', { x: 15, y: 50 }, { x: 39.9, y: 52.4 }, T(), lip());
  assert.ok(n.t.fel === 'scalare' && n.t.sx === 1 && Math.abs(50 * n.t.sy - 53) <= 1e-12);
  assert.deepEqual(axe(n), ['y']);

  // Grila de 10: latura e trasă la 58,7 se lipește la 60 (fără ținte aproape).
  const g = transformareManerLipita(c, 'e', { x: 30, y: 25 }, { x: 58.7, y: 25 }, T(), lip(10));
  assert.ok(g.t.fel === 'scalare' && g.t.sx === 2);
  assert.deepEqual(g.linii.map((l) => l.fel), ['grila']);

  // Cu Alt (față de ancora din centrul cutiei, (15, 25)): latura e ajunge exact pe 40,1, iar cea stângă la 15 − 25,1 = −10,1;
  // scara (40,1 − 15) / 15 nu se rotunjește.
  const ea = transformareManerLipita(c, 'e', { x: 30, y: 25 }, { x: 39.5, y: 25 }, T('A'), lip(), { x: 15, y: 25 });
  assert.ok(ea.t.fel === 'scalare' && Math.abs(ea.t.sx - 25.1 / 15) <= 1e-15 && ea.t.sy === 1 && Math.abs(15 - 15 * ea.t.sx + 10.1) <= 1e-12);
  assert.deepEqual(axe(ea), ['x']);
  // Cu Shift pe latură: proporțional, decide latura trasă (40,1 / 30, nerotunjit, pe ambele axe); linia arătată, doar x.
  const es = transformareManerLipita(c, 'e', { x: 30, y: 25 }, { x: 39.5, y: 52.5 }, T('S'), lip());
  assert.ok(es.t.fel === 'scalare' && es.t.sx === 40.1 / 30 && es.t.sy === es.t.sx);
  assert.deepEqual(axe(es), ['x']);

  // Rotirea nu se lipește.
  const r = transformareManerLipita(c, 'rotire', { x: 15, y: 80 }, { x: 40.1, y: 53 }, T(), lip());
  assert.deepEqual([r.t.fel, r.linii.length], ['rotire', 0]);
});
