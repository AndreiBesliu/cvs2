import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OptiuniCulori } from '../../src/trasare/culori.ts';
import { traseazaCuloriMediane, type OptiuniMedianeCulori, type RezultatCuloriMediane } from '../../src/trasare/medianeCulori.ts';
import type { CaiTrasate, ImagineRGBA } from '../../src/trasare/trasare.ts';
import { HARTIE_COLOR, LINII_COLORATE, MIJLOC_LINII, desenLiniiColorate } from './ajutor-poze.ts';

/**
 * Liniile mediane pe culori (ADR 0227, felia 25.3↑c): pe un desen cu trăsături colorate de 6 px, cu mijlocul știut
 * (`ajutor-poze.ts`: o linie roșie tăiată de una albastră și de două ori de un cerc verde, un pătrat galben plin cu marginea
 * neagră), linia mediană a fiecărei culori bifate pe masca ei; legarea peste alte culori; pragul părților late din grosimea
 * desenului întreg; grosimea fiecărei culori. Plafoanele, din prototip (`.tmp/proto-mediane-culori.ts`, în ADR).
 */

const OC: OptiuniCulori = { numar: null, legaturi: [], bifate: null, netezime: 'echilibrat', petePx: 25, gauriPx: 0 };
const OM: OptiuniMedianeCulori = { capete: 'centru', late: 'mediane', pragLatPx: null, semnaleaza: false, bucle: 'linie', leaga: true };
type Ok = Extract<RezultatCuloriMediane, { ok: true }>;
type Nume = keyof typeof LINII_COLORATE;

function trasat(om: Partial<OptiuniMedianeCulori> = {}, oc: Partial<OptiuniCulori> = {}, golRosu = false): Ok {
  const r = traseazaCuloriMediane(desenLiniiColorate({ golRosu }), { ...OC, ...oc }, { ...OM, ...om });
  assert.ok(r.ok);
  return r;
}
/** Piesa culorii cu numele dat (cea mai apropiată culoare din paletă). */
function piesa(r: Ok, nume: Nume): Ok['piese'][number] {
  const t = LINII_COLORATE[nume];
  let bun = r.piese[0], d = Infinity;
  for (const p of r.piese) {
    const c = [1, 3, 5].map((i) => parseInt(p.hex.slice(i, i + 2), 16));
    const e = (t[0] - (c[0] ?? 0)) ** 2 + (t[1] - (c[1] ?? 0)) ** 2 + (t[2] - (c[2] ?? 0)) ** 2;
    if (e < d) { d = e; bun = p; }
  }
  assert.ok(bun && d < 400, `${nume}: nicio piesă apropiată`);
  return bun;
}
function numara(c: CaiTrasate): { deschise: number; bucle: number; contururi: number } {
  let deschise = 0, bucle = 0, contururi = 0;
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    if (c.deschisa?.[k] === 1) deschise++; else if (c.peLinie?.[k] === 0) contururi++; else bucle++;
  }
  return { deschise, bucle, contururi };
}
/** Cea mai mare distanță de mijlocul adevărat a unui vârf și a mijlocului fiecărei curbe (cu mânerele ei). */
function abatere(c: CaiTrasate, f: (x: number, y: number) => number): number {
  let m = 0;
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0;
    for (let v = a; v < b; v++) {
      const q = (i: number): number => c.xy[6 * v + i] ?? 0, w = v + 1 < b ? v + 1 : a;
      m = Math.max(m, f(q(0), q(1)));
      if (c.tip[v] !== 1) continue;
      const x1 = c.xy[6 * w] ?? 0, y1 = c.xy[6 * w + 1] ?? 0;
      m = Math.max(m, f(0.125 * (q(0) + x1) + 0.375 * (q(2) + q(4)), 0.125 * (q(1) + y1) + 0.375 * (q(3) + q(5))));
    }
  }
  return m;
}

test('fiecare culoare bifată, linia ei mediană: negrul și verdele câte o buclă, albastrul o linie, roșul legat peste celelalte', () => {
  const r = trasat();
  // Cinci culori de desen bifate și hârtia; pătratul galben plin, lung cât e de lat, e un punct (25.3↑d, ca discul plin):
  // patru piese, un punct.
  assert.equal(r.piese.length, 4);
  assert.equal(r.raport.mediane.puncte, 1);
  const rosu = piesa(r, 'rosu'), albastru = piesa(r, 'albastru'), verde = piesa(r, 'verde'), negru = piesa(r, 'negru');
  assert.deepEqual(numara(rosu.cai), { deschise: 1, bucle: 0, contururi: 0 });
  assert.equal(rosu.legaturi, 3, 'peste albastru și de două ori peste verde');
  assert.deepEqual(numara(albastru.cai), { deschise: 1, bucle: 0, contururi: 0 });
  assert.deepEqual(numara(verde.cai), { deschise: 0, bucle: 1, contururi: 0 });
  assert.deepEqual(numara(negru.cai), { deschise: 0, bucle: 1, contururi: 0 });
  // Pe mijlocul trăsăturilor (măsurat în prototip: cel mult 0,17 px), și pe bucățile legate ale roșului; la curbe, și
  // mijlocul lor (mânerele mutate odată cu vârfurile, din cutia culorii în imagine).
  for (const [nume, p] of [['rosu', rosu], ['albastru', albastru], ['verde', verde], ['negru', negru]] as const) {
    const e = abatere(p.cai, MIJLOC_LINII[nume]);
    assert.ok(e <= 0.5, `${nume}: ${e.toFixed(2)} px`);
  }
  // Linia roșie legată: de la un capăt la celălalt (centrele capetelor rotunde, x 50 și 550).
  const xs = Array.from({ length: rosu.cai.xy.length / 6 }, (_, v) => rosu.cai.xy[6 * v] ?? 0);
  assert.ok(Math.abs(Math.min(...xs) - 50) <= 1 && Math.abs(Math.max(...xs) - 550) <= 1, `${Math.min(...xs)}–${Math.max(...xs)}`);
});

test('fără legare, roșul rupt de încrucișări iese în patru bucăți; cu legarea, un gol de hârtie rămâne gol', () => {
  const fara = trasat({ leaga: false });
  assert.deepEqual(numara(piesa(fara, 'rosu').cai), { deschise: 4, bucle: 0, contururi: 0 });
  assert.equal(piesa(fara, 'rosu').legaturi, 0);
  // Golul de 10 px (x 420–430) e pe hârtie: acolo nu trece altă culoare, deci cele două părți rămân separate.
  const gol = trasat({}, {}, true);
  assert.deepEqual(numara(piesa(gol, 'rosu').cai), { deschise: 2, bucle: 0, contururi: 0 });
  assert.equal(piesa(gol, 'rosu').legaturi, 3);
});

test('pătratul galben plin: cu părțile late ca contur, iese contur (pragul din grosimea desenului întreg); grosimea fiecărei culori', () => {
  const r = trasat({ late: 'contur' });
  assert.deepEqual(numara(piesa(r, 'galben').cai), { deschise: 0, bucle: 0, contururi: 1 });
  // Liniile rămân linii.
  assert.deepEqual(numara(piesa(r, 'verde').cai), { deschise: 0, bucle: 1, contururi: 0 });
  // Grosimea fiecărei culori (răspunsul 2a) și a desenului întreg, din care vine pragul: 6 px (măsurat: 6,0).
  for (const nume of ['rosu', 'albastru', 'verde', 'negru'] as const) {
    const g = piesa(r, nume).grosime;
    assert.ok(Math.abs(g - 6) <= 1, `${nume}: ${g}`);
  }
  assert.ok(piesa(r, 'galben').grosime > 50, `galbenul: ${piesa(r, 'galben').grosime}`);
  assert.ok(Math.abs(r.raport.mediane.grosime - 6) <= 1, `desenul: ${r.raport.mediane.grosime}`);
  assert.equal(r.raport.mediane.legaturi, 3);
  // Contururile părților late, pentru semnalare: doar ale pătratului galben (120 × 120, centrul (450, 300)), în imagine.
  const late = r.late;
  assert.ok(late && late.inceput.length > 1, 'fără contururile părților late');
  for (let v = 0; v < late.tip.length; v++) {
    const x: number = late.xy[6 * v] ?? 0, y: number = late.xy[6 * v + 1] ?? 0;
    assert.ok(Math.abs(x - 450) <= 61 && Math.abs(y - 300) <= 61, `(${x.toFixed(1)}, ${y.toFixed(1)})`);
  }
});

test('culorile legate (ADR 0221) se trasează împreună: verdele legat de roșu nu mai are piesa lui', () => {
  const r0 = trasat();
  const paleta = r0.raport.paleta.map((c) => c.hex);
  const idx = (nume: Nume): number => r0.raport.paleta.findIndex((c) => c.hex === piesa(r0, nume).hex);
  const legaturi = paleta.map(() => -1);
  legaturi[idx('verde')] = idx('rosu');
  const r = trasat({}, { legaturi });
  assert.equal(r.piese.length, 3);
  assert.ok(!r.piese.some((p) => p.hex === piesa(r0, 'verde').hex));
});

test('o culoare doar cu puncte (mai scurte decât grosimea lor) nu dă piesă; raportul le numără', () => {
  // 200 × 120: o linie neagră de 6 px (y 80, x 20–180) și cinci puncte portocalii cu diametrul de 7 px (y 30), cu centrele
  // decalate față de grila pixelilor, ca în proba punctelor de la alb-negru.
  const W = 200, H = 120, d = new Uint8ClampedArray(W * H * 4), portocaliu = [232, 120, 30] as const;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      let k: readonly number[] = HARTIE_COLOR;
      if (Math.abs(cy - 80) < 3 && cx > 20 && cx < 180) k = LINII_COLORATE.negru;
      for (let i = 0; i < 5; i++) if (Math.hypot(cx - (30.2 + 35 * i), cy - 30.1) < 3.5) k = portocaliu;
      const q = 4 * (y * W + x);
      d[q] = k[0] ?? 0; d[q + 1] = k[1] ?? 0; d[q + 2] = k[2] ?? 0; d[q + 3] = 255;
    }
  }
  const r = traseazaCuloriMediane({ latime: W, inaltime: H, date: d }, OC, OM);
  assert.ok(r.ok);
  // Portocaliul e o culoare bifată a paletei, dar fără linie: doar negrul dă piesă.
  const bifate = r.raport.paleta.filter((c) => c.bifata).map((c) => c.hex);
  assert.equal(bifate.length, 2, bifate.join(', '));
  assert.equal(r.piese.length, 1, r.piese.map((p) => p.hex).join(', '));
  const negru = r.piese[0];
  assert.ok(negru);
  assert.deepEqual(numara(negru.cai), { deschise: 1, bucle: 0, contururi: 0 });
  assert.equal(r.raport.mediane.puncte, 5);
});

/** Un desen W × H, cu marginile dure: culoarea întoarsă de `clasa` în centrul fiecărui pixel, sau hârtia. */
function desen(W: number, H: number, clasa: (x: number, y: number) => readonly number[] | null): ImagineRGBA {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = clasa(x + 0.5, y + 0.5) ?? HARTIE_COLOR, q = 4 * (y * W + x);
      d[q] = k[0] ?? 0; d[q + 1] = k[1] ?? 0; d[q + 2] = k[2] ?? 0; d[q + 3] = 255;
    }
  }
  return { latime: W, inaltime: H, date: d };
}
/** Distanța de la (x, y) la segmentul (ax, ay)–(bx, by). */
function laSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - ax - t * vx, y - ay - t * vy);
}
const { rosu: ROSU, albastru: ALBASTRU } = LINII_COLORATE;

test('legarea doar față în față: un V roșu cu vârful sub un disc albastru se leagă la 10° de orizontală, nu la 30°', () => {
  // Brațele, de 100 px, din vârful (150, 60), coboară la unghiul dat; discul albastru (raza 5) e desenat peste vârf. Capetele
  // brațelor stau la ~8 px de vârf: la 30°, drumul dintre ele trece peste roșu și albastru, la sub trei grosimi, dar direcțiile
  // lor se abat de la el cu 30° (peste 25°).
  const v = (grade: number): Ok => {
    const c = Math.cos((grade * Math.PI) / 180), s = Math.sin((grade * Math.PI) / 180);
    const r = traseazaCuloriMediane(desen(300, 130, (x, y) => {
      if (Math.hypot(x - 150, y - 60) < 5) return ALBASTRU;
      return laSegment(x, y, 150, 60, 150 - 100 * c, 60 + 100 * s) < 3 || laSegment(x, y, 150, 60, 150 + 100 * c, 60 + 100 * s) < 3 ? ROSU : null;
    }), OC, OM);
    assert.ok(r.ok);
    return r;
  };
  const drept = v(10), stramb = v(30);
  assert.deepEqual(numara(piesa(drept, 'rosu').cai), { deschise: 1, bucle: 0, contururi: 0 });
  assert.equal(piesa(drept, 'rosu').legaturi, 1);
  assert.deepEqual(numara(piesa(stramb, 'rosu').cai), { deschise: 2, bucle: 0, contururi: 0 });
  assert.equal(piesa(stramb, 'rosu').legaturi, 0);
});

test('legarea doar aproape: peste o bandă albastră de 20 px (capetele la 26 px, peste trei grosimi), roșul rămâne rupt', () => {
  const r = traseazaCuloriMediane(desen(300, 120, (x, y) => {
    if (Math.abs(x - 150) < 10 && y > 10 && y < 110) return ALBASTRU;
    return laSegment(x, y, 30, 60, 270, 60) < 3 ? ROSU : null;
  }), OC, OM);
  assert.ok(r.ok);
  assert.deepEqual(numara(piesa(r, 'rosu').cai), { deschise: 2, bucle: 0, contururi: 0 });
  assert.equal(r.raport.mediane.legaturi, 0);
});

test('legarea doar peste altă culoare: liniile oprite pe conturul unei pete late de aceeași culoare nu se leagă peste ea', () => {
  // O linie roșie de 6 px cu un disc roșu de 16 px la mijloc (peste pragul automat, 12 px): ca contur, discul rupe linia în
  // două, cu capetele pe conturul lui, față în față, la ~16 px; drumul dintre ele e doar roșu.
  const img = desen(300, 120, (x, y) => (Math.hypot(x - 150, y - 60) < 8 || laSegment(x, y, 30, 60, 270, 60) < 3 ? ROSU : null));
  const contur = traseazaCuloriMediane(img, OC, { ...OM, late: 'contur' });
  assert.ok(contur.ok);
  assert.deepEqual(numara(piesa(contur, 'rosu').cai), { deschise: 2, bucle: 0, contururi: 1 });
  assert.equal(contur.raport.mediane.legaturi, 0);
  // Ca linii mediane, discul ține de linie: o singură cale, fără legături.
  const mediane = traseazaCuloriMediane(img, OC, OM);
  assert.ok(mediane.ok);
  assert.deepEqual(numara(piesa(mediane, 'rosu').cai), { deschise: 1, bucle: 0, contururi: 0 });
});

test('o buclă tăiată de altă culoare se închide la loc: cercul verde sub linia roșie, o buclă cu două legături', () => {
  const VERDE = LINII_COLORATE.verde;
  const r = traseazaCuloriMediane(desen(300, 130, (x, y) => {
    if (laSegment(x, y, 60, 65, 240, 65) < 3) return ROSU;
    return Math.abs(Math.hypot(x - 150, y - 65) - 40) < 3 ? VERDE : null;
  }), OC, OM);
  assert.ok(r.ok);
  assert.deepEqual(numara(piesa(r, 'verde').cai), { deschise: 0, bucle: 1, contururi: 0 });
  assert.equal(piesa(r, 'verde').legaturi, 2);
  assert.deepEqual(numara(piesa(r, 'rosu').cai), { deschise: 1, bucle: 0, contururi: 0 });
});

test('legarea doar pe desen: un gol de hârtie cu o linie albastră subțire prin el rămâne gol', () => {
  // Golul roșu, x 140–150; linia albastră, de 2 px, la x 145: capetele roșii, la 16 px, față în față, cu drumul și pe albastru,
  // dar și pe hârtie.
  const r = traseazaCuloriMediane(desen(300, 120, (x, y) => {
    if (Math.abs(x - 145) < 1 && y > 20 && y < 100) return ALBASTRU;
    return laSegment(x, y, 30, 60, 270, 60) < 3 && !(x > 140 && x < 150) ? ROSU : null;
  }), OC, OM);
  assert.ok(r.ok);
  assert.deepEqual(numara(piesa(r, 'rosu').cai), { deschise: 2, bucle: 0, contururi: 0 });
  assert.equal(piesa(r, 'rosu').legaturi, 0);
});

test('punctele centrate pe colțul unui pixel se numără și pe culori (25.3↑d): masca lor dură se subția până la 2 × 2', () => {
  // Cinci puncte portocalii cu diametrul de 6 px, centrate pe colțuri de pixel, și o linie neagră.
  const W = 200, H = 120, d = new Uint8ClampedArray(W * H * 4), portocaliu = [232, 120, 30] as const;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      let k: readonly number[] = HARTIE_COLOR;
      if (Math.abs(cy - 80) < 3 && cx > 20 && cx < 180) k = LINII_COLORATE.negru;
      for (let i = 0; i < 5; i++) if (Math.hypot(cx - (30 + 35 * i), cy - 30) < 3) k = portocaliu;
      const q = 4 * (y * W + x);
      d[q] = k[0] ?? 0; d[q + 1] = k[1] ?? 0; d[q + 2] = k[2] ?? 0; d[q + 3] = 255;
    }
  }
  const r = traseazaCuloriMediane({ latime: W, inaltime: H, date: d }, OC, OM);
  assert.ok(r.ok);
  assert.equal(r.piese.length, 1, r.piese.map((p) => p.hex).join(', '));
  assert.equal(r.raport.mediane.puncte, 5);
});
