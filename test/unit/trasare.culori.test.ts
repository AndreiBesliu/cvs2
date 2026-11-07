import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traseazaCulori, type OptiuniCulori, type PiesaCuloare, type RezultatCulori } from '../../src/trasare/culori.ts';
import type { ImagineRGBA } from '../../src/trasare/trasare.ts';
import { esantioane } from './ajutor-trasare.ts';

/**
 * Probele țintite ale trasării pe culori (ADR 0221): fiecare regulă a reducerii și a etichetelor, pe o imagine desenată aici
 * din straturi, cu acoperirea eșantionată (8 × 8 pe pixel). Corpusul (`trasare.culori.corpus.test.ts`) judecă geometria pe
 * hârtie; aici, ce culori ies și unde ajunge fiecare pixel.
 */

type Culoare = readonly [number, number, number];
type Strat = {
  readonly inauntru: (x: number, y: number) => boolean;
  readonly culoare: Culoare | ((x: number, y: number) => Culoare);
  /** Opacitatea stratului (doar pe fundal transparent). */
  readonly alfa?: number;
};

/** Imaginea din straturi (ultimul deasupra): în fiecare pixel, 64 de eșantioane; culoarea ne-premultiplicată, alfa = acoperirea. */
function deseneaza(latime: number, inaltime: number, fundal: Culoare | null, straturi: readonly Strat[]): ImagineRGBA {
  const date = new Uint8ClampedArray(latime * inaltime * 4);
  const S = 8;
  for (let y = 0; y < inaltime; y++) {
    for (let x = 0; x < latime; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S; i++) {
          const sx = x + (i + 0.5) / S, sy = y + (j + 0.5) / S;
          let c: Culoare | null = fundal, al = fundal ? 1 : 0;
          for (let k = straturi.length - 1; k >= 0; k--) {
            const s = straturi[k] as Strat;
            if (s.inauntru(sx, sy)) { c = typeof s.culoare === 'function' ? s.culoare(sx, sy) : s.culoare; al = s.alfa ?? 1; break; }
          }
          if (c) { r += c[0] * al; g += c[1] * al; b += c[2] * al; a += al; }
        }
      }
      const o = 4 * (y * latime + x);
      if (a > 0) { date[o] = r / a; date[o + 1] = g / a; date[o + 2] = b / a; }
      date[o + 3] = Math.round((255 * a) / (S * S));
    }
  }
  return { latime, inaltime, date };
}

const IMPLICITE: OptiuniCulori = { numar: null, legaturi: [], bifate: null, netezime: 'echilibrat', petePx: 0, gauriPx: 0 };
const dreptunghi = (x0: number, y0: number, x1: number, y1: number) => (x: number, y: number): boolean => x >= x0 && x < x1 && y >= y0 && y < y1;
const disc = (cx: number, cy: number, r: number) => (x: number, y: number): boolean => Math.hypot(x - cx, y - cy) < r;
const rgb = (h: string): Culoare => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Cea mai mare diferență pe un canal (niveluri sRGB). */
const dif = (h: string, c: Culoare): number => { const x = rgb(h); return Math.max(Math.abs(x[0] - c[0]), Math.abs(x[1] - c[1]), Math.abs(x[2] - c[2])); };

const GRI_INCHIS: Culoare = [40, 46, 54], GRI_DESCHIS: Culoare = [98, 106, 118];
const ALBASTRU: Culoare = [8, 96, 156], PORTOCALIU: Culoare = [239, 145, 63], INCHIS: Culoare = [53, 60, 69];
const DESCHIS: Culoare = [141, 150, 163], ALB: Culoare = [255, 255, 255], ROSU: Culoare = [200, 40, 40];

function ok(r: RezultatCulori): Extract<RezultatCulori, { ok: true }> {
  assert.ok(r.ok, 'trasarea a refuzat');
  return r;
}

/** Indicele culorii din paletă cel mai apropiat de c (cu diferența lui). */
function cauta(r: RezultatCulori, c: Culoare): { readonly k: number; readonly d: number } {
  let k = -1, d = Infinity;
  r.raport.paleta.forEach((p, i) => { const e = dif(p.hex, c); if (e < d) { d = e; k = i; } });
  return { k, d };
}

/** Aria netă a unei piese (eșantioanele curbelor, pe fiecare contur). */
function aria(pc: PiesaCuloare): number {
  let s = 0;
  const c = pc.cai;
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0;
    const { puncte: p } = esantioane({ inceput: Uint32Array.from([0, b - a]), tip: c.tip.subarray(a, b), xy: c.xy.subarray(6 * a, 6 * b), exterior: c.exterior.subarray(k, k + 1) });
    const n = p.length / 2;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; s += (p[2 * i] ?? 0) * (p[2 * j + 1] ?? 0) - (p[2 * j] ?? 0) * (p[2 * i + 1] ?? 0); }
  }
  return Math.abs(s / 2);
}

const piesa = (r: Extract<RezultatCulori, { ok: true }>, k: number): PiesaCuloare | undefined => r.piese.find((p) => p.culoare === k);

// Un logo în mic: un gri cu umbrire (luminozitatea crește spre dreapta), un albastru cu aceeași luminozitate ca griul deschis,
// și o linie portocalie subțire (2,8 px), cu marginile parțial transparente, pe fundal transparent.
const umbrire = (x: number): Culoare => {
  const t = Math.max(0, Math.min(1, (x - 10) / 60));
  return [GRI_INCHIS[0] + t * (GRI_DESCHIS[0] - GRI_INCHIS[0]), GRI_INCHIS[1] + t * (GRI_DESCHIS[1] - GRI_INCHIS[1]), GRI_INCHIS[2] + t * (GRI_DESCHIS[2] - GRI_INCHIS[2])];
};
const LOGO = deseneaza(160, 90, null, [
  { inauntru: dreptunghi(10, 10, 70, 60), culoare: (x) => umbrire(x) },
  { inauntru: dreptunghi(90, 10, 150, 60), culoare: ALBASTRU },
  { inauntru: dreptunghi(10, 75.3, 150, 78.1), culoare: PORTOCALIU },
]);

test('paleta automată: o culoare mică și deosebită (linia portocalie subțire, cu margini transparente) e o culoare', () => {
  const r = ok(traseazaCulori(LOGO, IMPLICITE));
  assert.equal(r.raport.automat, true);
  const port = cauta(r, PORTOCALIU);
  assert.ok(port.d <= 12, `portocaliul lipsește: ${r.raport.paleta.map((c) => c.hex).join(', ')}`);
  // Piesa portocalie e linia: 140 × 2,8 px.
  const pp = piesa(r, port.k);
  assert.ok(pp);
  assert.ok(Math.abs(aria(pp) - 392) < 392 * 0.03, `aria liniei: ${aria(pp)}`);
});

test('paleta automată: umbrirea unei suprafețe rămâne o culoare (luminozitatea cântărește pe jumătate)', () => {
  const r = ok(traseazaCulori(LOGO, IMPLICITE));
  assert.equal(r.raport.paleta.length, 3, r.raport.paleta.map((c) => c.hex).join(', '));
  const gri = cauta(r, umbrire(40)), alb = cauta(r, ALBASTRU);
  assert.ok(gri.d <= 16 && alb.d <= 12, r.raport.paleta.map((c) => c.hex).join(', '));
  assert.notEqual(gri.k, alb.k);
  // Tot dreptunghiul cu umbrire e în piesa griului (60 × 50 px), nimic din el în a albastrului (60 × 50).
  const pg = piesa(r, gri.k), pa = piesa(r, alb.k);
  assert.ok(pg && pa);
  assert.ok(Math.abs(aria(pg) - 3000) < 30, `griul: ${aria(pg)}`);
  assert.ok(Math.abs(aria(pa) - 3000) < 30, `albastrul: ${aria(pa)}`);
});

test('numărul dat: unirea ține culorile cele mai deosebite (la 3, griul cu umbrirea lui, albastrul, portocaliul)', () => {
  const r = ok(traseazaCulori(LOGO, { ...IMPLICITE, numar: 3 }));
  assert.equal(r.raport.automat, false);
  assert.equal(r.raport.paleta.length, 3);
  for (const c of [umbrire(40), ALBASTRU, PORTOCALIU]) assert.ok(cauta(r, c).d <= 16, `${c}: ${r.raport.paleta.map((p) => p.hex).join(', ')}`);
  // La 2: griul și albastrul (cele mai apropiate) se unesc, portocaliul rămâne.
  const r2 = ok(traseazaCulori(LOGO, { ...IMPLICITE, numar: 2 }));
  assert.equal(r2.raport.paleta.length, 2);
  assert.ok(cauta(r2, PORTOCALIU).d <= 12, r2.raport.paleta.map((p) => p.hex).join(', '));
  // La 4: o culoare în plus, din umbrire (cea mai întinsă), nu din culorile curate.
  const r4 = ok(traseazaCulori(LOGO, { ...IMPLICITE, numar: 4 }));
  assert.equal(r4.raport.paleta.length, 4);
  assert.ok(cauta(r4, ALBASTRU).d <= 12 && cauta(r4, PORTOCALIU).d <= 12, r4.raport.paleta.map((p) => p.hex).join(', '));
});

test('o culoare sub 0,2 % din pixelii plini nu intră în paleta automată', () => {
  // Un punct verde de 2 × 2 px într-o imagine de 100 × 100 (0,04 %), lângă două culori mari.
  const img = deseneaza(100, 100, ALB, [
    { inauntru: dreptunghi(10, 10, 50, 90), culoare: INCHIS },
    { inauntru: dreptunghi(55, 10, 90, 90), culoare: ALBASTRU },
    { inauntru: dreptunghi(70, 94, 72, 96), culoare: [30, 200, 60] },
  ]);
  const r = ok(traseazaCulori(img, IMPLICITE));
  assert.equal(r.raport.paleta.length, 3, r.raport.paleta.map((c) => c.hex).join(', '));
  assert.ok(cauta(r, [30, 200, 60]).d > 60);
});

test('un amestec nu e curat: pe marginea netezită închis–alb, pixelii cu culoarea gri-deschisului rămân ai marginii', () => {
  // Pătratul închis, rotit (marginile trec prin toate amestecurile cu albul, deci și prin gri-deschis), și un disc gri-deschis.
  const c = Math.cos(0.35), s = Math.sin(0.35);
  const rotit = (x: number, y: number): boolean => { const u = (x - 35) * c + (y - 35) * s, v = -(x - 35) * s + (y - 35) * c; return Math.abs(u) < 18 && Math.abs(v) < 18; };
  const img = deseneaza(100, 70, ALB, [
    { inauntru: rotit, culoare: INCHIS },
    { inauntru: disc(80.3, 35.6, 7), culoare: DESCHIS },
  ]);
  const r = ok(traseazaCulori(img, IMPLICITE));
  assert.equal(r.raport.paleta.length, 3, r.raport.paleta.map((p) => p.hex).join(', '));
  const d = cauta(r, DESCHIS);
  assert.ok(d.d <= 8);
  const pd = piesa(r, d.k);
  assert.ok(pd);
  assert.equal(pd.cai.inceput.length - 1, 1, 'gri-deschisul: doar discul, fără petice pe marginea pătratului');
  assert.ok(Math.abs(aria(pd) - Math.PI * 49) < 4, `discul: ${aria(pd)}`);
});

test('aura parțial transparentă din jurul unei forme ia culoarea formei, nu pe cea mai apropiată din paletă', () => {
  // Pătratul închis cu o aură albă de 5 px (alfa 0,6: vizibilă), și un pătrat portocaliu (culoarea cea mai deschisă).
  const aura = (x: number, y: number): boolean => x >= 10 && x < 50 && y >= 10 && y < 50;
  const img = deseneaza(100, 60, null, [
    { inauntru: aura, culoare: ALB, alfa: 0.6 },
    { inauntru: dreptunghi(15, 15, 45, 45), culoare: INCHIS },
    { inauntru: dreptunghi(70, 20, 85, 35), culoare: PORTOCALIU },
  ]);
  const r = ok(traseazaCulori(img, IMPLICITE));
  assert.equal(r.raport.paleta.length, 2, r.raport.paleta.map((p) => p.hex).join(', '));
  const po = piesa(r, cauta(r, PORTOCALIU).k), pi = piesa(r, cauta(r, INCHIS).k);
  assert.ok(po && pi);
  assert.ok(Math.abs(aria(po) - 225) < 6, `portocaliul: ${aria(po)}`);
  // Aura (vizibilă, alfa ≥ 50 %) intră în forma închisă, ca la trasarea alb-negru: pătratul de 40 px, cu marginea acolo unde
  // acoperirea (0,6 în ultimul pixel, 0 dincolo) trece prin 50 %: la o șesime din pasul dintre centre, deci ⅓ px înăuntru.
  assert.ok(Math.abs(aria(pi) - (40 - 2 / 3) ** 2) < 8, `închisul cu aura: ${aria(pi)}`);
});

test('joncțiunea a trei culori: vârful comun stă în punctul în care se întâlnesc granițele (cele mai mici pătrate)', () => {
  const cx = 30.37, cy = 30.71;
  const sector = (a0: number, a1: number) => (x: number, y: number): boolean => {
    if (Math.hypot(x - cx, y - cy) >= 24) return false;
    let a = Math.atan2(y - cy, x - cx) - a0;
    while (a < 0) a += 2 * Math.PI;
    return a < a1 - a0;
  };
  const r0 = (g: number): number => (g * Math.PI) / 180;
  const img = deseneaza(61, 61, null, [
    { inauntru: sector(r0(10), r0(130)), culoare: ALBASTRU },
    { inauntru: sector(r0(130), r0(250)), culoare: INCHIS },
    { inauntru: sector(r0(250), r0(370)), culoare: DESCHIS },
  ]);
  const r = ok(traseazaCulori(img, IMPLICITE));
  assert.equal(r.piese.length, 3);
  for (const p of r.piese) {
    let d = Infinity;
    const xy = p.cai.xy;
    for (let v = 0; 6 * v < xy.length; v++) d = Math.min(d, Math.hypot((xy[6 * v] ?? 0) - cx, (xy[6 * v + 1] ?? 0) - cy));
    assert.ok(d < 0.25, `${p.hex}: centrul la ${d.toFixed(3)} px`);
  }
});

// Imagine opacă: fundal alb, trei pătrate (roșu, albastru, închis), departe unul de altul.
const OPACA = deseneaza(110, 50, ALB, [
  { inauntru: dreptunghi(10.4, 10.4, 30.4, 30.4), culoare: ROSU },
  { inauntru: dreptunghi(45.4, 10.4, 65.4, 30.4), culoare: ALBASTRU },
  { inauntru: dreptunghi(80.4, 10.4, 100.4, 30.4), culoare: INCHIS },
]);

test('imaginea opacă: culoarea care domină marginea e fundalul, nebifată; o piesă pe fiecare altă culoare', () => {
  const r = ok(traseazaCulori(OPACA, IMPLICITE));
  assert.equal(r.raport.transparenta, false);
  assert.equal(r.raport.paleta.length, 4);
  const f = cauta(r, ALB);
  const pf = r.raport.paleta[f.k];
  assert.ok(pf && pf.fundal && !pf.bifata);
  assert.equal(r.piese.length, 3);
  for (const c of [ROSU, ALBASTRU, INCHIS]) {
    const p = piesa(r, cauta(r, c).k);
    assert.ok(p, `${c}`);
    assert.ok(Math.abs(aria(p) - 400) < 4, `${c}: ${aria(p)}`);
  }
});

test('legăturile: culoarea legată intră în piesa celei de care e legată (cu lanțul urmat până la prima)', () => {
  const r0 = ok(traseazaCulori(OPACA, IMPLICITE));
  const ro = cauta(r0, ROSU).k, al = cauta(r0, ALBASTRU).k, in_ = cauta(r0, INCHIS).k;
  const leg = r0.raport.paleta.map(() => -1);
  leg[al] = ro;
  leg[in_] = al;
  const r = ok(traseazaCulori(OPACA, { ...IMPLICITE, legaturi: leg }));
  assert.equal(r.raport.paleta[al]?.prima, ro);
  assert.equal(r.raport.paleta[in_]?.prima, ro);
  assert.equal(r.piese.length, 1);
  const p = piesa(r, ro);
  assert.ok(p);
  assert.equal(p.cai.inceput.length - 1, 3);
  assert.ok(Math.abs(aria(p) - 1200) < 10, `${aria(p)}`);
  // Un ciclu (roșu → închis → albastru → roșu): toate trei au aceeași primă, cea cu indicele cel mai mic, și o singură piesă.
  leg[ro] = in_;
  const rc = ok(traseazaCulori(OPACA, { ...IMPLICITE, legaturi: leg }));
  const m = Math.min(ro, al, in_);
  assert.deepEqual([ro, al, in_].map((k) => rc.raport.paleta[k]?.prima), [m, m, m]);
  assert.deepEqual(rc.piese.map((p) => p.culoare), [m]);
  assert.ok(Math.abs(aria(rc.piese[0] as PiesaCuloare) - 1200) < 10);
  // Legată de fundal, o culoare devine fundal: nu se mai trasează.
  const f = cauta(r0, ALB).k;
  const lf = r0.raport.paleta.map(() => -1);
  lf[in_] = f;
  const rf = ok(traseazaCulori(OPACA, { ...IMPLICITE, legaturi: lf }));
  assert.deepEqual(rf.piese.map((p) => p.culoare).sort(), [ro, al].sort());
  assert.equal(rf.raport.paleta[in_]?.bifata, false);
});

test('culorile bifate: doar ele se trasează; fundalul bifat devine o piesă', () => {
  const r0 = ok(traseazaCulori(OPACA, IMPLICITE));
  const in_ = cauta(r0, INCHIS).k, f = cauta(r0, ALB).k;
  const bif = r0.raport.paleta.map((_, k) => k === in_);
  const r = ok(traseazaCulori(OPACA, { ...IMPLICITE, bifate: bif }));
  assert.deepEqual(r.piese.map((p) => p.culoare), [in_]);
  assert.equal(r.raport.paleta[cauta(r, ROSU).k]?.bifata, false);
  const rf = ok(traseazaCulori(OPACA, { ...IMPLICITE, bifate: r0.raport.paleta.map((_, k) => k === f) }));
  const pf = piesa(rf, f);
  assert.ok(pf);
  // Fundalul: toată imaginea, cu trei goluri.
  assert.equal(pf.cai.inceput.length - 1, 4);
  assert.ok(Math.abs(aria(pf) - (110 * 50 - 1200)) < 15, `${aria(pf)}`);
});

test('curățarea pe culori (margini dure): pata sub prag trece la vecina ei, golul de fundal din interior se umple, cel de la margine rămâne', () => {
  // Fără netezire (pixeli întregi): un dreptunghi roșu lipit de marginea de sus, cu colțul (0–2, 0–2) alb (un gol de fundal
  // de 4 px care atinge marginea imaginii), o pată albastră de 2 × 2 și un gol alb de 3 × 3 în el; alături, un pătrat albastru.
  const img = deseneaza(100, 60, ALB, [
    { inauntru: (x, y) => x < 50 && y < 40 && !(x < 2 && y < 2), culoare: ROSU },
    { inauntru: dreptunghi(20, 20, 22, 22), culoare: ALBASTRU },
    { inauntru: dreptunghi(35, 25, 38, 28), culoare: ALB },
    { inauntru: dreptunghi(60, 10, 80, 30), culoare: ALBASTRU },
  ]);
  const fara = ok(traseazaCulori(img, IMPLICITE));
  assert.equal(fara.raport.margini, 'dure');
  assert.deepEqual([fara.raport.pete, fara.raport.gauri], [0, 0]);
  const r = ok(traseazaCulori(img, { ...IMPLICITE, petePx: 6, gauriPx: 12 }));
  assert.deepEqual([r.raport.pete, r.raport.gauri], [1, 1]);
  const ro = piesa(r, cauta(r, ROSU).k), al = piesa(r, cauta(r, ALBASTRU).k);
  assert.ok(ro && al);
  // Roșul: un singur contur (pata și golul din interior au intrat în el), cu colțul de la margine scos: 50 × 40 − 4.
  assert.equal(ro.cai.inceput.length - 1, 1);
  assert.ok(Math.abs(aria(ro) - (2000 - 4)) < 2, `roșul: ${aria(ro)}`);
  // Albastrul: doar pătratul din dreapta.
  assert.equal(al.cai.inceput.length - 1, 1);
  assert.ok(Math.abs(aria(al) - 400) < 4, `albastrul: ${aria(al)}`);
  // Fără curățare, roșul are două goluri (pata și golul alb). Pe margini dure, golurile atât de mici își rotunjesc colțurile
  // la netezire: împreună, sub 4 + 9 px², dar nu nimic.
  const rf = piesa(fara, cauta(fara, ROSU).k);
  assert.ok(rf);
  assert.equal(rf.cai.inceput.length - 1, 3);
  const goluri = aria(ro) - aria(rf);
  assert.ok(goluri > 4 && goluri <= 13, `golurile: ${goluri}`);
});
