import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Varf } from '../../src/geom/contur.ts';
import { aplica } from '../../src/geom/matrice.ts';
import { pregateste } from '../../src/io/piesa.ts';
import { documentNou, type ImagineFoaie } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie, matriceInstanta } from '../../src/model/lume.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { asezareInPagina, caiDinTrasare } from '../../src/ui/actiuniImportCalcul.ts';
import { coltImagine, peFoaie, type Asezare } from '../../src/app/manereImagine.ts';
import {
  asezarePeImagine, calibrata, colturiZonei, distanta, numeFisierImagine, peAxa, peImagine, zonaDinTragere, zonaInPixeli,
} from '../../src/app/modImagineCalcul.ts';

/**
 * „Calibrează” și „Trasează…” din imaginea de pe foaie (ADR 0272 §6, §7; felia 25.8↑b), partea pură, pe hârtie: calibrarea
 * scalează uniform în jurul primului punct (el rămâne pe loc, distanța devine cea scrisă), Shift duce al doilea punct pe axa
 * imaginii, zona trasă pe foaie e dreptunghiul din cadrul imaginii (și pe una rotită), tăiat la ea, în pixeli fără un pixel în
 * plus, iar vectorii trasați din imagine cad pe foaie exact peste pixelii din care au ieșit (rotită, scalată, cu zonă).
 */

const aproape = (a: number, b: number, e = 1e-9): boolean => Math.abs(a - b) <= e;
const aproapeP = (p: { x: number; y: number }, q: { x: number; y: number }, e = 1e-9): boolean => aproape(p.x, q.x, e) && aproape(p.y, q.y, e);

const DREAPTA: Asezare = { x: 100, y: 50, latime: 200, inaltime: 100, rotire: 0 };
const ROTITA: Asezare = { x: 150, y: 120, latime: 160, inaltime: 90, rotire: 30 };

test('calibrata: scalată uniform în jurul primului punct, care rămâne pe loc; distanța dintre puncte devine cea scrisă', () => {
  for (const a of [DREAPTA, ROTITA]) {
    // Două puncte ale imaginii, date în cadrul ei: capetele unei laturi de 60 mm „acum”.
    const p1 = peFoaie(a, -40, 10), p2 = peFoaie(a, 20, 10);
    assert.ok(aproape(distanta(p1, p2), 60));
    const r = calibrata(a, p1, p2, 300);
    assert.ok(r.ok);
    const b = r.a;
    assert.ok(aproape(b.latime, a.latime * 5) && aproape(b.inaltime, a.inaltime * 5) && b.rotire === a.rotire);
    // Același punct al imaginii (în fracțiuni) e tot unde era p1; cel al lui p2 e la 300 mm de el.
    assert.ok(aproapeP(peFoaie(b, -40 * 5, 10 * 5), p1), JSON.stringify(b));
    assert.ok(aproape(distanta(p1, peFoaie(b, 20 * 5, 10 * 5)), 300));
  }
  // Micșorarea merge la fel (3 / 60).
  const r = calibrata(DREAPTA, { x: 0, y: 0 }, { x: 60, y: 0 }, 3);
  assert.ok(r.ok && aproape(r.a.latime, 10) && aproape(r.a.x, 5) && aproape(r.a.y, 2.5));
});

test('calibrata: refuzurile: punctele una peste alta, distanța care nu e un număr pozitiv, imaginea sub 1 mm pe o latură', () => {
  const p = { x: 10, y: 10 };
  assert.deepEqual(calibrata(DREAPTA, p, { ...p }, 50), { ok: false, motiv: 'puncte' });
  for (const d of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) assert.deepEqual(calibrata(DREAPTA, p, { x: 20, y: 10 }, d), { ok: false, motiv: 'distanta' });
  // 100 mm înălțime × (1 / 200) = 0,5 mm: sub latura cea mai mică.
  assert.deepEqual(calibrata(DREAPTA, { x: 0, y: 0 }, { x: 200, y: 0 }, 1), { ok: false, motiv: 'mica' });
  assert.ok(calibrata(DREAPTA, { x: 0, y: 0 }, { x: 200, y: 0 }, 2).ok, 'exact 1 mm trece');
});

test('peAxa (Shift): al doilea punct pe orizontala sau verticala imaginii prin primul, cea mai apropiată', () => {
  for (const a of [DREAPTA, ROTITA]) {
    const p = peFoaie(a, -30, 5);
    assert.ok(aproapeP(peAxa(a, p, peFoaie(a, 50, 12)), peFoaie(a, 50, 5)), 'orizontala imaginii');
    assert.ok(aproapeP(peAxa(a, p, peFoaie(a, -26, -40)), peFoaie(a, -30, -40)), 'verticala imaginii');
  }
});

test('zonaDinTragere: dreptunghiul din cadrul imaginii, în fracțiuni cu Y de sus, tăiat la ea; în afară, nicio zonă', () => {
  // Fără rotire: (50, 20)–(150, 70) pe imaginea (0…200, 0…100).
  assert.deepEqual(zonaDinTragere(DREAPTA, { x: 150, y: 20 }, { x: 50, y: 70 }), { x0: 0.25, y0: 0.3, x1: 0.75, y1: 0.8 });
  // Tăiată la imagine.
  assert.deepEqual(zonaDinTragere(DREAPTA, { x: -50, y: -10 }, { x: 100, y: 60 }), { x0: 0, y0: 0.4, x1: 0.5, y1: 1 });
  // În afara imaginii, ori fără arie.
  assert.equal(zonaDinTragere(DREAPTA, { x: 250, y: 10 }, { x: 300, y: 60 }), null);
  assert.equal(zonaDinTragere(DREAPTA, { x: 50, y: 10 }, { x: 50, y: 60 }), null);
  // Rotită: punctele date în cadrul imaginii dau aceleași fracțiuni, iar colțurile zonei cad în colțurile imaginii la (0, 1).
  const z = zonaDinTragere(ROTITA, peFoaie(ROTITA, -40, 45), peFoaie(ROTITA, 40, -22.5));
  assert.ok(z && aproape(z.x0, 0.25) && aproape(z.x1, 0.75) && aproape(z.y0, 0) && aproape(z.y1, 0.75), JSON.stringify(z));
  const toata = colturiZonei(ROTITA, { x0: 0, y0: 0, x1: 1, y1: 1 });
  (['sv', 'se', 'ne', 'nv'] as const).forEach((k, i) => { assert.ok(aproapeP(toata[i] ?? { x: NaN, y: NaN }, coltImagine(ROTITA, k)), k); });
});

test('peImagine: în cadrul rotit, marginea inclusă', () => {
  assert.ok(peImagine(ROTITA, peFoaie(ROTITA, 80, 45)));
  assert.ok(peImagine(ROTITA, peFoaie(ROTITA, -79, -44)));
  assert.ok(!peImagine(ROTITA, peFoaie(ROTITA, 81, 0)));
  assert.ok(!peImagine(ROTITA, peFoaie(ROTITA, 0, -46)));
});

test('zonaInPixeli: pixelii atinși, fără un pixel în plus la marginile întregi, cel puțin unul, în imagine', () => {
  assert.deepEqual(zonaInPixeli({ x0: 0.25, y0: 0.3, x1: 0.75, y1: 0.8 }, 800, 560), { x: 200, y: 168, w: 400, h: 280 });
  // 0,3 · 800 = 239,99999999999997 în virgulă mobilă: tot 240.
  assert.deepEqual(zonaInPixeli({ x0: 0.3, y0: 0, x1: 1, y1: 1 }, 800, 10), { x: 240, y: 0, w: 560, h: 10 });
  assert.deepEqual(zonaInPixeli({ x0: 0.1001, y0: 0.5, x1: 0.1002, y1: 0.5001 }, 100, 100), { x: 10, y: 50, w: 1, h: 1 });
  assert.deepEqual(zonaInPixeli({ x0: 0.9999, y0: 0.9999, x1: 1, y1: 1 }, 100, 100), { x: 99, y: 99, w: 1, h: 1 });
  // O zonă mai îngustă decât toleranța marginilor: tot un pixel.
  assert.deepEqual(zonaInPixeli({ x0: 0.5, y0: 0.5, x1: 0.50000001, y1: 0.50000001 }, 100, 100), { x: 50, y: 50, w: 1, h: 1 });
});

test('asezarePeImagine: centrul imaginii în pagina importului, ca `asezareInPagina`, cu zonă și fără', () => {
  for (const zona of [null, { x: 40, y: 30, w: 200, h: 100 }, { x: 0, y: 290, w: 400, h: 10 }]) {
    const p = asezareInPagina(400, 300, 0.25, zona);
    const a = asezarePeImagine({ x: 7, y: 8, rotire: 12 }, 400, 300, 0.25, zona);
    assert.deepEqual([a.cx, a.cy, a.x, a.y, a.rotire], [p.x, p.y, 7, 8, 12]);
  }
});

test('numeFisierImagine: numele fără extensie, cu extensia tipului păstrat', () => {
  assert.equal(numeFisierImagine('scan.pdf', 'image/jpeg'), 'scan.jpg');
  assert.equal(numeFisierImagine('poza', 'image/png'), 'poza.png');
  assert.equal(numeFisierImagine('a.b.webp', 'image/webp'), 'a.b.webp');
  assert.equal(numeFisierImagine('.png', 'image/png'), 'imagine.png');
});

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
function context(extra: Partial<ContextDocument> = {}): ContextDocument & { h: () => Istoric } {
  let h = istoricNou(documentNou({ latime: 600, inaltime: 400, grosime: 18 }));
  let sel: readonly string[] = [];
  return {
    istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false,
    ...extra, h: () => h,
  };
}

test('importul peste imaginea de pe foaie: fiecare vârf trasat cade pe foaie peste pixelul lui (rotită 30°, scalată, cu zonă)', () => {
  // Imaginea: 400 × 300 px, pe foaie 160 × 120 mm (0,4 mm pe pixel, după o calibrare), centrul în (300, 200), rotită 30°.
  const W = 400, H = 300;
  const im: ImagineFoaie = {
    id: 'im1', sursa: 'ab'.repeat(32), nume: 'poza.png', x: 300, y: 200, latime: 160, inaltime: 120, rotire: 30, opacitate: 0.4, vizibila: true,
    fixata: true,
  };
  const m = im.latime / W;
  for (const zona of [null, { x: 40, y: 30, w: 200, h: 100 }]) {
    // Un pătrat trasat în zonă (px ai zonei, Y în jos) și un triunghi, puse în mm cum le pune importul.
    const pixeli = [[[10, 5], [50, 5], [50, 9], [10, 9]], [[100, 20], [180, 60], [120, 90]]] as const;
    let xy: number[] = [];
    const inceput = [0];
    for (const c of pixeli) {
      for (const [u, v] of c) xy = xy.concat([u, v, 0, 0, 0, 0]);
      inceput.push(xy.length / 6);
    }
    const trasate = {
      inceput: Uint32Array.from(inceput), tip: new Uint8Array(xy.length / 6), exterior: Uint8Array.from([1, 1]), xy: Float64Array.from(xy),
    };
    const zh = zona?.h ?? H;
    const { cai, laturi } = caiDinTrasare(trasate, m, zh);
    const pregatit = { ...pregateste({ nume: 'poza', cai, laturi, pagina: { latime: (zona?.w ?? W) * m, inaltime: zh * m } }), peImagine: asezarePeImagine(im, W, H, m, zona) };
    const c = context({ importNou: () => pregatit, locImport: () => ({ x: 1, y: 1 }) });
    assert.ok(ruleaza(R, 'document.importa', c).ok);
    const doc = c.h().doc;
    assert.ok(incarca(JSON.parse(JSON.stringify(doc))).ok, 'ce scrie importul se redeschide');
    assert.equal(doc.foi[0]?.instante[0]?.rotire, 30, 'instanța, rotită cu imaginea');
    const el = elementeFoaie(doc, 0);
    assert.equal(el.length, 2);
    el.forEach((e, k) => {
      const f = e.forma;
      assert.equal(f.tip, 'cale');
      if (f.tip !== 'cale') return;
      f.varfuri.forEach((vf, j) => {
        const w = aplica(e.matrice, vf.p);
        const [u = 0, v = 0] = pixeli[k]?.[j] ?? [];
        // Pixelul (zx + u, zy + v) al imaginii întregi, pe foaie: din centrul ei, în cadrul ei rotit.
        const q = peFoaie(im, ((zona?.x ?? 0) + u - W / 2) * m, (H / 2 - (zona?.y ?? 0) - v) * m);
        assert.ok(aproapeP(w, q, 1e-9), `${JSON.stringify(zona)} ${k}/${j}: ${w.x},${w.y} ≠ ${q.x},${q.y}`);
      });
    });
    // Instanța stă unde o pune așezarea (punctul lăsat nu contează).
    const i = doc.foi[0]?.instante[0];
    assert.ok(i);
    const colt = aplica(matriceInstanta(i), { x: 0, y: 0 });
    assert.ok(Number.isFinite(colt.x));
  }
});

const patrat = (x: number, y: number, l: number): Varf[] => [
  { p: { x, y }, s: { tip: 'L' } }, { p: { x: x + l, y }, s: { tip: 'L' } },
  { p: { x: x + l, y: y + l }, s: { tip: 'L' } }, { p: { x, y: y + l }, s: { tip: 'L' } },
];

test('fără așezare peste imagine, importul rămâne cum era (locul din pagină, ori punctul lăsat)', () => {
  const p = pregateste({ nume: 'p', cai: [{ varfuri: patrat(20, 30, 80) }], laturi: ['exterior'], pagina: { latime: 200, inaltime: 150 } });
  const c = context({ importNou: () => p });
  ruleaza(R, 'document.importa', c);
  assert.deepEqual(c.h().doc.foi[0]?.instante.map((i) => [i.x, i.y, i.rotire]), [[20, 30, 0]]);
});
