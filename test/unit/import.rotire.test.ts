import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROTIRE_IMPLICITA, TRASARE_IMPLICITA, UNGHI_SCRIS_MAXIM } from '../../src/io/imagine.ts';
import { PIXELI_POSTER, raspundeTrasare, type CerereTrasare, type RaspunsTrasare } from '../../src/jobs/calculTrasare.ts';
import { UNGHI_MAXIM, panzaRotita } from '../../src/trasare/rotire.ts';
import type { CaiTrasate, ImagineRGBA } from '../../src/trasare/trasare.ts';
import { cerereTrasare, previzualizareDinRaspuns } from '../../src/ui/actiuniImportCalcul.ts';
import { citestePng } from './ajutor-png.ts';
import { POZE_FOAIE, pozaFoaie } from './ajutor-poze.ts';
import { pagina, randeaza } from './ajutor-rotire.ts';

/**
 * Scanarea strâmbă în calculul trasării și în ușa importului (ADR 0271, felia 25.4↑c): pe desenul tehnic rotit de GDI+ cu
 * +1,7° (`test/fixtures/trasare/rotire`, chenarul de 940 × 640 px tras cu o peniță de 3 px, deci cutia lui de afară are
 * 943 × 643 px), unghiul găsit și sugestia, imaginea îndreptată (pânza, scara, previzualizarea, cutia chenarului), unghiul
 * scris, zona, marginea prelungită, foaia și scanarea împreună, cererea din alegeri.
 */

const DESEN: ImagineRGBA = citestePng(new Uint8Array(readFileSync('test/fixtures/trasare/rotire/desen-p1.7.png')));
const cerere = (c: Partial<CerereTrasare>): CerereTrasare => ({
  imagine: DESEN, optiuni: { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat' }, peteMm: 0, gauriMm: 0, latimeMm: null,
  dpi: null, ...c,
});
const lang = (a: number, b: number, tol: number, m: string): void => { assert.ok(Math.abs(a - b) <= tol, `${m}: ${a.toFixed(4)} față de ${b}`); };

/** Cutia tuturor vârfurilor trasate, în px (chenarul e cel mai din afară). */
function cutie(c: CaiTrasate): { readonly l: number; readonly h: number; readonly x0: number } {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let v = 0; v < c.xy.length / 6; v++) {
    const x = c.xy[6 * v] ?? 0, y = c.xy[6 * v + 1] ?? 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { l: x1 - x0, h: y1 - y0, x0 };
}

const alb = async (c: Partial<CerereTrasare>): Promise<Extract<RaspunsTrasare, { ok: true; fel: 'alb-negru' }>> => {
  const r = (await raspundeTrasare(cerere(c))).raspuns;
  assert.ok(r.ok && r.fel === 'alb-negru', 'trasarea');
  return r;
};

test('îndreptată cu unghiul găsit: pânza mărită, scara neschimbată, chenarul cu laturile pe axe; previzualizarea, redusă', async () => {
  const r = await alb({ rotire: { unghi: null } });
  const t = r.rotire;
  assert.ok(t && t.gasit !== null);
  lang(t.gasit, 1.7, 0.05, 'unghiul găsit');
  assert.equal(t.ceruta, true);
  assert.equal(t.aplicat, t.gasit);
  assert.equal(t.sursa, 'gasit');
  assert.equal(t.sugestie, false);
  assert.deepEqual(t.inainte, { latime: 1000, inaltime: 700 });
  assert.deepEqual({ latime: r.intreg.latime, inaltime: r.intreg.inaltime }, panzaRotita(1000, 700, t.gasit));
  assert.equal(r.scara, 'presupus');
  lang(r.mmPePx, 25.4 / 96, 1e-12, 'mm pe px');
  // Chenarul (cutia de afară 943 × 643 px): îndreptat, are mărimea lui; rotit, ar fi ~962 × 671.
  const k = cutie(r.cai);
  lang(k.l, 943, 1.5, 'lățimea chenarului'); lang(k.h, 643, 1.5, 'înălțimea chenarului');
  const pz = t.previzualizare;
  assert.ok(pz && pz.latime * pz.inaltime <= PIXELI_POSTER);
  lang(pz.latime / pz.inaltime, r.intreg.latime / r.intreg.inaltime, 0.01, 'proporțiile previzualizării');
  // Ușa: raportul imaginii poartă rotirea.
  const pv = previzualizareDinRaspuns({ nume: 'scan.png', octeti: new Uint8Array() }, r);
  assert.ok(pv.ok && pv.format === 'imagine');
  assert.equal(pv.trasare.rotire, t);
});

test('neîndreptată: unghiul găsit și sugestia, imaginea și chenarul rotite ca în scanare', async () => {
  const r = await alb({});
  const t = r.rotire;
  assert.ok(t && t.gasit !== null);
  lang(t.gasit, 1.7, 0.05, 'unghiul găsit');
  assert.deepEqual({ ceruta: t.ceruta, aplicat: t.aplicat, sursa: t.sursa, sugestie: t.sugestie, previzualizare: t.previzualizare },
    { ceruta: false, aplicat: null, sursa: null, sugestie: true, previzualizare: null });
  assert.deepEqual({ latime: r.intreg.latime, inaltime: r.intreg.inaltime }, { latime: 1000, inaltime: 700 });
  const k = cutie(r.cai), a = (1.7 * Math.PI) / 180;
  lang(k.l, 943 * Math.cos(a) + 643 * Math.sin(a), 2, 'lățimea chenarului rotit');
  // Desenul nerotit (GDI+, același desen): nicio sugestie.
  const zero = (await raspundeTrasare(cerere({ imagine: citestePng(new Uint8Array(readFileSync('test/fixtures/trasare/rotire/desen-p0.png'))) }))).raspuns;
  assert.ok(zero.ok && zero.rotire);
  assert.equal(zero.rotire.sugestie, false);
});

test('unghiul scris: folosit în locul celui găsit, tăiat la ±45°; unul care nu e număr lasă unghiul găsit', async () => {
  const r = await alb({ rotire: { unghi: -2 } });
  assert.ok(r.rotire);
  assert.deepEqual([r.rotire.aplicat, r.rotire.sursa], [-2, 'scris']);
  lang(r.rotire.gasit ?? 0, 1.7, 0.05, 'unghiul găsit, tot spus');
  assert.deepEqual({ latime: r.intreg.latime, inaltime: r.intreg.inaltime }, panzaRotita(1000, 700, -2));
  const mare = await alb({ rotire: { unghi: 60 } });
  assert.equal(mare.rotire?.aplicat, UNGHI_MAXIM);
  assert.equal(UNGHI_MAXIM, 45);
  const nan = await alb({ rotire: { unghi: Number.NaN } });
  assert.equal(nan.rotire?.sursa, 'gasit');
  lang(nan.rotire?.aplicat ?? 0, 1.7, 0.05, 'NaN: unghiul găsit');
});

test('zona e în pixelii imaginii îndreptate; DPI-ul fișierului rămâne, și cu pânza redusă sub plafon', async () => {
  const z = await alb({ rotire: { unghi: null }, zona: { x: 10, y: 20, w: 300, h: 200 } });
  assert.deepEqual(z.zona, { x: 10, y: 20, w: 300, h: 200 });
  assert.deepEqual([z.raport.latime, z.raport.inaltime], [300, 200]);
  const d = await alb({ rotire: { unghi: null }, dpi: 300 });
  assert.equal(d.scara, 'fisier');
  lang(d.dpi, 300, 1e-9, 'DPI-ul');
  lang(d.mmPePx, 25.4 / 300, 1e-12, 'mm pe px');
  // Sub 500 000 de pixeli, pânza (~1020 × 729) se reduce, dar foaia are aceeași mărime în mm.
  const k = await alb({ rotire: { unghi: null }, dpi: 300, maxPixeli: 500_000 });
  assert.ok(k.intreg.latime * k.intreg.inaltime <= 500_000);
  lang(k.dpi, 300, 1e-9, 'DPI-ul pe pânza redusă');
  lang(k.intreg.latime * k.mmPePx, d.intreg.latime * d.mmPePx, 2 * k.mmPePx, 'lățimea în mm');
});

test('„Ignoră ce atinge marginea” cu îndreptarea: o bandă lipită de marginea veche o atinge și pe cea nouă, deci se șterge', async () => {
  // O bandă neagră de 4 px pe marginea din stânga, între rândurile 100 și 600 (departe de colțuri).
  const d = new Uint8ClampedArray(DESEN.date);
  for (let y = 100; y < 600; y++) for (let x = 0; x < 4; x++) d.set([0, 0, 0, 255], 4 * (y * DESEN.latime + x));
  const cuBanda: ImagineRGBA = { ...DESEN, date: d };
  const optiuni = { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat', margine: true } as const;
  const fara = await alb({ imagine: cuBanda, rotire: { unghi: null } });
  const cu = await alb({ imagine: cuBanda, rotire: { unghi: null }, optiuni });
  assert.equal(cu.raport.margine, 1);
  assert.equal(cu.raport.contururi, fara.raport.contururi - 1);
  assert.ok(cutie(fara.cai).x0 < 20 && cutie(cu.cai).x0 > 20, 'banda e ștearsă doar cu marginea');
});

test('foaia și scanarea: sugestia foii o oprește pe a scanării; împreună, rotirea vine după foaie, cu scara foii', async () => {
  // O foaie pozată din față, rotită cu 5° în planul ei, pe masă: marginile ei dau unghiul (−5°), dar se îndreaptă după colțuri.
  const opt = { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat', lumina: 'neuniforma', margine: true } as const;
  const fata = pozaFoaie({ W: 1200, H: 900, focala: 1100, inclinare: 0, rotire: 5, laterala: 0, dist: 420 });
  const s = (await raspundeTrasare(cerere({ imagine: fata, optiuni: opt, peteMm: 2, gauriMm: 2 }))).raspuns;
  assert.ok(s.ok && s.foaie && s.rotire);
  assert.equal(s.foaie.sugestie, true);
  lang(s.rotire.gasit ?? 0, -5, 0.1, 'unghiul marginilor foii');
  assert.equal(s.rotire.sugestie, false);
  const p = pozaFoaie(POZE_FOAIE.inclinata25);
  const a = (await raspundeTrasare(cerere({ imagine: p, optiuni: opt, peteMm: 2, gauriMm: 2, foaie: { colturi: null, format: { w: 210, h: 297 } }, rotire: { unghi: 1 } }))).raspuns;
  assert.ok(a.ok && a.foaie?.indreptata && a.rotire);
  assert.equal(a.scara, 'foaie');
  const ft = a.rotire.inainte;
  assert.deepEqual({ latime: a.intreg.latime, inaltime: a.intreg.inaltime }, panzaRotita(ft.latime, ft.inaltime, 1));
  // Un pixel al pânzei rotite ține cât unul al foii: 210 mm pe lățimea foii îndreptate.
  lang(a.mmPePx * ft.latime, 210, 1e-9, 'lățimea foii');
  // Cu plafonul cât foaia, pânza rotită (mai mare) se reduce, iar scara foii ține cont: aceeași lățime în mm.
  const k = (await raspundeTrasare(cerere({
    imagine: p, optiuni: opt, peteMm: 2, gauriMm: 2, foaie: { colturi: null, format: { w: 210, h: 297 } }, rotire: { unghi: 1 }, maxPixeli: ft.latime * ft.inaltime,
  }))).raspuns;
  assert.ok(k.ok && k.rotire);
  assert.deepEqual(k.rotire.inainte, ft);
  const panza = panzaRotita(ft.latime, ft.inaltime, 1);
  assert.ok(k.intreg.latime < panza.latime, 'pânza redusă');
  lang(k.intreg.latime * k.mmPePx, (panza.latime * 210) / ft.latime, 2 * k.mmPePx, 'lățimea pânzei în mm');
});

test('fără unghi: cerută pe cercuri, neaplicată; pe o imagine cu transparență, nimic (fără cerere)', async () => {
  const cercuri = randeaza(pagina('cercuri', 600, 400), 600, 400, 2);
  const c = (await raspundeTrasare(cerere({ imagine: cercuri, rotire: { unghi: null } }))).raspuns;
  assert.ok(c.ok && c.rotire);
  assert.deepEqual([c.rotire.gasit, c.rotire.ceruta, c.rotire.aplicat, c.rotire.sursa], [null, true, null, null]);
  assert.deepEqual({ latime: c.intreg.latime, inaltime: c.intreg.inaltime }, { latime: 600, inaltime: 400 });
  const t = randeaza(pagina('desen', 600, 400), 600, 400, 2);
  const d = new Uint8ClampedArray(t.date);
  for (let i = 3; i < d.length; i += 8) d[i] = 0;
  const tr = (await raspundeTrasare(cerere({ imagine: { ...t, date: d } }))).raspuns;
  assert.ok(tr.ok);
  assert.equal(tr.rotire, null);
});

test('cererea din alegeri: „Îndreaptă scanarea” cu unghiul scris sau găsit; implicit, fără', () => {
  const f = { nume: 'scan.png', octeti: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) };
  assert.deepEqual(TRASARE_IMPLICITA.rotire, { indreapta: false, unghi: null });
  assert.equal(TRASARE_IMPLICITA.rotire, ROTIRE_IMPLICITA);
  assert.equal(cerereTrasare(f, TRASARE_IMPLICITA).rotire, undefined);
  assert.deepEqual(cerereTrasare(f, { ...TRASARE_IMPLICITA, rotire: { indreapta: true, unghi: null } }).rotire, { unghi: null });
  assert.deepEqual(cerereTrasare(f, { ...TRASARE_IMPLICITA, rotire: { indreapta: true, unghi: -1.25 } }).rotire, { unghi: -1.25 });
  assert.equal(cerereTrasare(f, { ...TRASARE_IMPLICITA, rotire: { indreapta: false, unghi: 3 } }).rotire, undefined);
  assert.equal(UNGHI_SCRIS_MAXIM, UNGHI_MAXIM);
});

test('imaginea pentru foaie (ADR 0272): întreagă, îndreptată, cu scara trasării și zona ei; refuzurile citirii trec la fel', async () => {
  const { raspundeImagineaFoii } = await import('../../src/jobs/calculTrasare.ts');
  const r = (await raspundeImagineaFoii(cerere({ rotire: { unghi: null }, dpi: 300, zona: { x: 10, y: 20, w: 300, h: 200 } }))).raspuns;
  assert.ok(r.ok && r.fel === 'imagine-foaie');
  // Pânza îndreptată (~1020 × 729), nu zona: zona doar se spune, ca imaginea să stea exact sub vectorii ei.
  const t = (await raspundeTrasare(cerere({ rotire: { unghi: null }, dpi: 300, zona: { x: 10, y: 20, w: 300, h: 200 } }))).raspuns;
  assert.ok(t.ok);
  assert.deepEqual([r.img.latime, r.img.inaltime], [t.intreg.latime, t.intreg.inaltime]);
  assert.equal(r.img.date.length, 4 * r.img.latime * r.img.inaltime);
  assert.equal(r.mmPePx, t.mmPePx);
  assert.deepEqual(r.zona, { x: 10, y: 20, w: 300, h: 200 });
  // Dată în pixeli (fără fișier), imaginea se codează: nu e „originală”.
  assert.equal(r.originala, null);
  assert.equal(r.jpeg, false);
  const gol = (await raspundeImagineaFoii(cerere({ imagine: new Blob([new Uint8Array([1, 2, 3, 4])]) }))).raspuns;
  assert.ok(!gol.ok);
});
