import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROPORTII_NESIGURE, aplicaOmografia, colturiBune, colturiImplicite, formatOrientat, gasesteFoaia, indreaptaFoaia, omografie,
  pareOblica, potrivesteFormatul, proportiiDinPoza, type Colturi, type Punct,
} from '../../src/trasare/foaia.ts';
import { traseaza, type ImagineRGBA, type OptiuniTrasare } from '../../src/trasare/trasare.ts';
import { FOAIE_A4, POZE_FOAIE, distFormeFoaie, pozaFoaie, type CumFoaie, type PozaFoaie } from './ajutor-poze.ts';

/**
 * Probele foii pozate oblic (ADR 0225, felia 25.5↑): pe poze sintetice ale unei foi A4 cu patru forme de mărime știută
 * (`ajutor-poze.ts`, generatorul prototipului), pozate cu o cameră pinhole (1600 × 1200 px, focala 1400) sub patru unghiuri:
 * colțurile găsite, proporțiile din perspectivă (Zhang și He), foaia îndreptată și trasată (formele în mm), orientarea, foaia
 * negăsită (un scan, o foaie tăiată de margine, un logo), sugestia, plafonul de pixeli și viteza. Plafoanele, din
 * măsurătorile prototipului (`.tmp/proto-255.ts`, în ADR) și ale nucleului.
 */

const POZE = Object.fromEntries(Object.entries(POZE_FOAIE).map(([k, o]) => [k, pozaFoaie(o)])) as Record<keyof typeof POZE_FOAIE, PozaFoaie>;
const A4 = FOAIE_A4.w / FOAIE_A4.h;
const dist = (a: Punct, b: Punct): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Cât de departe e cel mai depărtat colț găsit de al lui adevărat (în ordine: stânga-sus, apoi în sensul acelor). */
const abatere = (c: Colturi, adevarate: readonly Punct[]): number => Math.max(...c.map((q, i) => dist(q, adevarate[i] ?? [0, 0])));
const IMPL: OptiuniTrasare = {
  sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat', petePx: 40, gauriPx: 40, lumina: 'neuniforma', margine: true,
};

/** Formele trasate pe foaia îndreptată, față de cele adevărate (mm): cea mai mare distanță a unui vârf și media lor. */
function eroareForme(img: ImagineRGBA, mmPePx: number): { max: number; med: number; contururi: number } {
  const r = traseaza(img, IMPL);
  assert.ok(r.ok);
  let max = 0, s = 0, n = 0;
  for (let v = 0; v < r.cai.xy.length / 6; v++) {
    const e = distFormeFoaie((r.cai.xy[6 * v] ?? 0) * mmPePx, (r.cai.xy[6 * v + 1] ?? 0) * mmPePx);
    max = Math.max(max, e); s += e; n++;
  }
  return { max, med: s / Math.max(1, n), contururi: r.raport.contururi };
}

/** Un dreptunghi deschis (0,93) pe o masă închisă cu textură, rotit cu `grade` în jurul centrului imaginii (800 × 600). */
function dreptunghiPeMasa(grade: number): { img: ImagineRGBA; colturi: Punct[] } {
  const W = 800, H = 600, a = (grade * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const rot = (x: number, y: number): Punct => [W / 2 + c * (x - W / 2) - s * (y - H / 2), H / 2 + s * (x - W / 2) + c * (y - H / 2)];
  const colturi = [rot(150, 50), rot(650, 50), rot(650, 550), rot(150, 550)];
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let t = 0;
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          // Punctul eșantionului, adus înapoi în cadrul dreptunghiului nerotit.
          const px = x + (i + 0.5) / 4 - W / 2, py = y + (j + 0.5) / 4 - H / 2;
          const u = c * px + s * py + W / 2, v = -s * px + c * py + H / 2;
          t += u >= 150 && u < 650 && v >= 50 && v < 550 ? 0.93 : 0.2 + 0.05 * Math.sin(x * 0.07 + y * 0.013);
        }
      }
      const b = Math.round((255 * t) / 16);
      d.set([b, b, b, 255], 4 * (y * W + x));
    }
  }
  return { img: { latime: W, inaltime: H, date: d }, colturi };
}

test('omografia: duce cele patru puncte exact în perechile lor, cea inversă le aduce înapoi; trei puncte coliniare n-au omografie', () => {
  const de: Punct[] = [[0, 0], [210, 0], [210, 297], [0, 297]];
  const la: Punct[] = [[512.3, 140.7], [1101.9, 188.2], [1188.4, 1020.5], [430.1, 990.6]];
  const H = omografie(de, la);
  assert.ok(H);
  for (let i = 0; i < 4; i++) {
    const [x, y] = de[i] ?? [0, 0];
    assert.ok(dist(aplicaOmografia(H, x, y), la[i] ?? [0, 0]) < 1e-9, `punctul ${i}`);
  }
  const I = omografie(la, de);
  assert.ok(I);
  const [u, v] = aplicaOmografia(H, 77, 123);
  assert.ok(dist(aplicaOmografia(I, u, v), [77, 123]) < 1e-9, 'dus și întors');
  assert.equal(omografie([[0, 0], [1, 1], [2, 2], [0, 5]], la), null);
});

test('colțurile foii, pe patru poze (de la aproape din față la 40°): găsite singure la cel mult 0,5 px de cele adevărate', () => {
  for (const [nume, p] of Object.entries(POZE)) {
    const c = gasesteFoaia(p);
    assert.ok(c, `${nume}: foaia negăsită`);
    const e = abatere(c, p.colturi);
    // Măsurat: 0,02–0,20 px în prototip (găsirea grosieră singură, 1,6–2,2 px; Visvalingam până la patru vârfuri, 29 px pe
    // poza aproape din față, unde pixelii rotunjesc colțul în trei vârfuri apropiate).
    assert.ok(e <= 0.5, `${nume}: colțurile la ${e.toFixed(2)} px`);
  }
});

test('o agrafă peste marginea foii (intră 6 px pe ea): normalele ei ies din dreaptă și se scot; colțurile, tot la 0,5 px', () => {
  const p = POZE.inclinata25, [a, b] = p.colturi;
  // Un dreptunghi închis peste latura de sus, la 40 % din ea, de 60 px de-a lungul ei, de la 6 px pe foaie la 30 px afară.
  const cx = a[0] + 0.4 * (b[0] - a[0]), cy = a[1] + 0.4 * (b[1] - a[1]);
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const d = new Uint8ClampedArray(p.date);
  for (let y = 0; y < p.inaltime; y++) {
    for (let x = 0; x < p.latime; x++) {
      const t = (x - cx) * ux + (y - cy) * uy, n = (x - cx) * uy - (y - cy) * ux;
      if (Math.abs(t) <= 30 && n >= -6 && n <= 30) d.set([40, 40, 40, 255], 4 * (y * p.latime + x));
    }
  }
  const c = gasesteFoaia({ latime: p.latime, inaltime: p.inaltime, date: d });
  assert.ok(c);
  // Măsurat: 0,05 px; fără a doua potrivire a dreptei (doar punctele la cel mult 1 px de prima), 0,57 px.
  assert.ok(abatere(c, p.colturi) <= 0.5, `colțurile la ${abatere(c, p.colturi).toFixed(2)} px`);
});

test('un colț ieșit din cadru (cu 135 px): se extrapolează din laturile vecine; normalele tăiate de cadru nu se iau', () => {
  const p = pozaFoaie({ ...POZE_FOAIE.rotita30, dist: 380 });
  assert.ok((p.colturi[0]?.[1] ?? 0) < -100, `colțul stânga-sus: ${p.colturi[0]?.join(', ')}`);
  const c = gasesteFoaia(p);
  assert.ok(c);
  // Măsurat: 0,01–0,02 px pe toate patru (cu laturile vecine din învelitoarea brută, colțul ieșea cu 47 px pe lângă).
  assert.ok(abatere(c, p.colturi) <= 0.5, `colțurile la ${abatere(c, p.colturi).toFixed(2)} px`);
});

test('proporțiile din perspectivă (Zhang și He): lățimea pe înălțime a foii, la 1 % de A4; focala, la 3 % de cea adevărată', () => {
  for (const [nume, p] of Object.entries(POZE)) {
    const c = gasesteFoaia(p);
    assert.ok(c);
    const { raport, focala, min, max } = proportiiDinPoza(c, p.latime, p.inaltime);
    // Măsurat: la 0,10 % cel mult; focala 1400–1407.
    assert.ok(Math.abs(raport / A4 - 1) <= 0.01, `${nume}: raportul ${raport.toFixed(4)} (A4 ${A4.toFixed(4)})`);
    assert.ok(focala !== null && Math.abs(focala / 1400 - 1) <= 0.03, `${nume}: focala ${focala?.toFixed(0)}`);
    // Intervalul (colțurile mișcate cu câte 1 px) cuprinde adevărul; măsurat: 0,4–3,3 % lățime.
    assert.ok(min <= A4 && A4 <= max && max / min - 1 <= 0.05, `${nume}: între ${min.toFixed(4)} și ${max.toFixed(4)}`);
  }
  // Colțurile unui dreptunghi din față (laturile paralele două câte două): focala nu se poate afla, raportul e al laturilor.
  const fata = proportiiDinPoza([[100, 100], [400, 100], [400, 500], [100, 500]], 800, 600);
  assert.equal(fata.focala, null);
  assert.ok(Math.abs(fata.raport - 0.75) < 1e-9, `${fata.raport}`);
  assert.ok(!fata.nesigure && fata.max / fata.min - 1 <= PROPORTII_NESIGURE, `din față, focala nu contează: ${fata.min} – ${fata.max}`);
});

test('o poză înclinată doar înainte (laturile de sus și de jos paralele): focala nedeterminată, proporțiile nesigure, dar cuprinse', () => {
  const p = pozaFoaie({ ...POZE_FOAIE.inclinata25, rotire: 0, laterala: 0 });
  const c = gasesteFoaia(p);
  assert.ok(c);
  const g = proportiiDinPoza(c, p.latime, p.inaltime);
  // Măsurat: raportul 0,6788 (−4 %, cu focala obișnuită de 0,85 diagonale față de cea adevărată de 0,7), între 0,55 și 0,74.
  assert.equal(g.focala, null);
  assert.ok(g.nesigure && g.max / g.min - 1 > PROPORTII_NESIGURE, `între ${g.min.toFixed(4)} și ${g.max.toFixed(4)}`);
  assert.ok(g.min <= A4 && A4 <= g.max);
  // Nesigure: A4 se potrivește (e în interval); o foaie pătrată, nu (nicio focală de telefon n-o face așa).
  assert.ok(potrivesteFormatul(g, { w: 210, h: 297 }));
  assert.equal(potrivesteFormatul(g, { w: 200, h: 200 }), false);
});

test('formatul: pe o poză cu focala găsită, A4 și A5 (aceleași proporții) se potrivesc, Letter nu; orientarea nu contează', () => {
  const p = POZE.inclinata40, c = gasesteFoaia(p);
  assert.ok(c);
  const g = proportiiDinPoza(c, p.latime, p.inaltime);
  assert.ok(potrivesteFormatul(g, { w: 210, h: 297 }) && potrivesteFormatul(g, { w: 148, h: 210 }) && potrivesteFormatul(g, { w: 297, h: 210 }));
  assert.equal(potrivesteFormatul(g, { w: 215.9, h: 279.4 }), false, `Letter (0,773) față de ${g.min.toFixed(4)} – ${g.max.toFixed(4)}`);
});

test('foaia îndreptată cu A4 și trasată: formele adevărate, la cel mult 0,5 mm (media sub 0,15), pe toate patru pozele', () => {
  for (const [nume, p] of Object.entries(POZE)) {
    const c = gasesteFoaia(p);
    assert.ok(c);
    const ind = indreaptaFoaia(p, c, A4);
    assert.ok(ind);
    assert.ok(Math.abs(ind.latime / ind.inaltime / A4 - 1) < 0.005, `${nume}: ${ind.latime} × ${ind.inaltime}`);
    const e = eroareForme(ind, FOAIE_A4.w / ind.latime);
    // Pătratul, discul, dreptunghiul și inelul (două contururi). Măsurat în prototip: 0,12–0,27 mm max, 0,04–0,09 medie.
    assert.equal(e.contururi, 5, nume);
    assert.ok(e.max <= 0.5 && e.med <= 0.15, `${nume}: ${e.max.toFixed(2)} mm max, ${e.med.toFixed(3)} medie`);
  }
});

test('foaia îndreptată cu proporțiile din poză („Din poză”): formele la cel mult 0,6 mm (media sub 0,2), pe pozele înclinate', () => {
  for (const nume of ['inclinata25', 'inclinata40'] as const) {
    const p = POZE[nume], c = gasesteFoaia(p);
    assert.ok(c);
    const ind = indreaptaFoaia(p, c, proportiiDinPoza(c, p.latime, p.inaltime).raport);
    assert.ok(ind);
    const e = eroareForme(ind, FOAIE_A4.w / ind.latime);
    // Măsurat în prototip: 0,12–0,36 mm max, 0,06–0,14 medie.
    assert.equal(e.contururi, 5, nume);
    assert.ok(e.max <= 0.6 && e.med <= 0.2, `${nume}: ${e.max.toFixed(2)} mm max, ${e.med.toFixed(3)} medie`);
  }
});

test('o foaie culcată în poză (rotită 90°): proporțiile ies peste 1, iar formatul se întoarce după ele', () => {
  const p = pozaFoaie({ ...POZE_FOAIE.rotita30, rotire: 90 });
  const c = gasesteFoaia(p);
  assert.ok(c);
  // Rotită 90° și înclinată doar în jurul axei orizontale: laturile lungi rămân paralele, deci focala e nedeterminată
  // (măsurat: 1,3917, între 1,27 și 1,44); orientarea e sigură.
  const { raport, min, max } = proportiiDinPoza(c, p.latime, p.inaltime);
  assert.ok(raport > 1 && min <= 1 / A4 && 1 / A4 <= max, `raportul ${raport.toFixed(4)}, între ${min.toFixed(4)} și ${max.toFixed(4)}`);
  assert.deepEqual(formatOrientat({ w: 210, h: 297 }, raport), { w: 297, h: 210 });
  assert.deepEqual(formatOrientat({ w: 210, h: 297 }, 0.7), { w: 210, h: 297 });
  assert.deepEqual(formatOrientat({ w: 297, h: 210 }, 0.7), { w: 210, h: 297 });
  assert.deepEqual(formatOrientat({ w: 100, h: 100 }, 1.5), { w: 100, h: 100 });
  const f = formatOrientat({ w: 210, h: 297 }, raport), ind = indreaptaFoaia(p, c, f.w / f.h);
  assert.ok(ind);
  assert.ok(ind.latime > ind.inaltime, `${ind.latime} × ${ind.inaltime}`);
});

test('nicio foaie: un scan (foaia umple cadrul), o foaie tăiată de margine, un logo rotund, o pată mică, o imagine transparentă', () => {
  const mic = (o: Partial<CumFoaie>): CumFoaie => ({ ...POZE_FOAIE.inclinata25, W: 800, H: 600, focala: 700, ...o });
  assert.equal(gasesteFoaia(pozaFoaie(mic({ faraMasa: true }))), null, 'scanul');
  assert.equal(gasesteFoaia(pozaFoaie(mic({ dist: 300 }))), null, 'foaia tăiată de marginile de sus și de jos');
  const logo = (r: number): ImagineRGBA => {
    const W = 400, H = 300, d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const b = Math.hypot(x - 200, y - 150) < r ? 240 : 30; d.set([b, b, b, 255], 4 * (y * W + x)); }
    return { latime: W, inaltime: H, date: d };
  };
  assert.equal(gasesteFoaia(logo(120)), null, 'un disc alb pe negru nu e o foaie');
  assert.equal(gasesteFoaia(logo(20)), null, 'o pată mică');
  // O pată pătrată (are formă de foaie) de 30 × 30 px: sub 5 % din imagine.
  const pata = new Uint8ClampedArray(400 * 300 * 4);
  for (let y = 0; y < 300; y++) for (let x = 0; x < 400; x++) { const v = x >= 185 && x < 215 && y >= 135 && y < 165 ? 240 : 30; pata.set([v, v, v, 255], 4 * (y * 400 + x)); }
  assert.equal(gasesteFoaia({ latime: 400, inaltime: 300, date: pata }), null, 'o pată pătrată mică');
  const transp = new Uint8ClampedArray(400 * 300 * 4);
  for (let y = 0; y < 300; y++) for (let x = 0; x < 400; x++) if (x > 50 && x < 350 && y > 30 && y < 270) transp.set([255, 255, 255, 255], 4 * (y * 400 + x));
  assert.equal(gasesteFoaia({ latime: 400, inaltime: 300, date: transp }), null, 'pe transparență nu se caută');
});

test('un dreptunghi drept pe masă (un scan cu capacul negru): găsit la 0,5 px, dar nu pare oblic; rotit cu 3°, pare', () => {
  for (const [grade, oblic] of [[0, false], [1, false], [3, true]] as const) {
    const { img, colturi } = dreptunghiPeMasa(grade);
    const c = gasesteFoaia(img);
    assert.ok(c, `${grade}°`);
    assert.ok(abatere(c, colturi) <= 0.5, `${grade}°: ${abatere(c, colturi).toFixed(2)} px`);
    assert.equal(pareOblica(c), oblic, `${grade}°`);
  }
  for (const [nume, p] of Object.entries(POZE)) {
    const c = gasesteFoaia(p);
    assert.ok(c && pareOblica(c), nume);
  }
});

test('îndreptarea: colțurile pozei întregi o lasă neschimbată (pixel cu pixel); plafonul de pixeli ține proporțiile', () => {
  const W = 64, H = 48, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d.set([(x * 37 + y * 11) & 255, ((x ^ y) * 9) & 255, (x * y) & 255, (x * 5 + y * 3) & 255], 4 * (y * W + x));
  const img: ImagineRGBA = { latime: W, inaltime: H, date: d };
  const la = indreaptaFoaia(img, [[0, 0], [W, 0], [W, H], [0, H]], W / H);
  assert.ok(la);
  assert.deepEqual([la.latime, la.inaltime], [W, H]);
  assert.deepEqual(Array.from(la.date), [...d]);
  // Densitatea: latura cea mai lungă din poză; cealaltă, după raport (aici crește înălțimea).
  const p = POZE.inclinata40, c = gasesteFoaia(p);
  assert.ok(c);
  const ind = indreaptaFoaia(p, c, A4);
  assert.ok(ind);
  const sus = dist(c[0], c[1]), jos = dist(c[3], c[2]), st = dist(c[0], c[3]), dr = dist(c[1], c[2]);
  assert.ok(Math.abs(ind.latime - Math.max(sus, jos)) <= 1 || Math.abs(ind.inaltime - Math.max(st, dr)) <= 1, `${ind.latime} × ${ind.inaltime}`);
  assert.ok(ind.latime >= Math.max(sus, jos) - 1 && ind.inaltime >= Math.max(st, dr) - 1);
  const mica = indreaptaFoaia(p, c, A4, 100_000);
  assert.ok(mica);
  assert.ok(mica.latime * mica.inaltime <= 100_000, `${mica.latime} × ${mica.inaltime}`);
  assert.ok(Math.abs(mica.latime / mica.inaltime / A4 - 1) < 0.01);
});

test('colțurile implicite (foaia negăsită): puțin înăuntrul colțurilor pozei, în aceeași ordine; colțurile bune', () => {
  assert.deepEqual(colturiImplicite(1000, 500), [[40, 20], [960, 20], [960, 480], [40, 480]]);
  assert.ok(colturiBune(colturiImplicite(1000, 500)));
  // Încrucișate (două colțuri schimbate), în sens invers, strânse într-un punct sau nedefinite: nu sunt o foaie.
  assert.equal(colturiBune([[40, 20], [960, 480], [960, 20], [40, 480]]), false);
  assert.equal(colturiBune([[40, 20], [40, 480], [960, 480], [960, 20]]), false);
  assert.equal(colturiBune([[5, 5], [5, 5], [5, 5], [5, 5]]), false);
  assert.equal(colturiBune([[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]), false, 'sub 1 px²');
  assert.equal(colturiBune([[40, 20], [960, 20], [960, Number.NaN], [40, 480]]), false);
  assert.equal(indreaptaFoaia({ latime: 4, inaltime: 4, date: new Uint8ClampedArray(64) }, [[0, 0], [4, 4], [4, 0], [0, 4]], 1), null);
});

test('viteza: îndreptarea unei poze de 12 Mpx (ieșirea ~10 Mpx) sub 1,5 s (măsurat: 0,22–0,26 s)', () => {
  const W = 4000, H = 3000, d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < d.length; i += 4) { const v = (i * 7919) & 255; d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255; }
  const t0 = performance.now();
  const o = indreaptaFoaia({ latime: W, inaltime: H, date: d }, [[900, 300], [3200, 420], [3400, 2700], [700, 2550]], A4);
  const t = performance.now() - t0;
  assert.ok(o);
  assert.ok(o.latime * o.inaltime > 9_000_000, `${o.latime} × ${o.inaltime}`);
  assert.ok(t < 1500, `${t.toFixed(0)} ms`);
});
