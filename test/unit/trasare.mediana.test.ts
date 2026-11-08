import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEDIANA, subtiaza, traseazaMediana } from '../../src/trasare/mediana.ts';
import { PLAFON_TRASARE, type ImagineRGBA, type OptiuniTrasare } from '../../src/trasare/trasare.ts';
import { esantioaneCai, grila } from './ajutor-trasare.ts';

/**
 * Probele țintite ale liniei mediane (ADR 0222), pe lângă corpus: subțierea cu cozi e exact cea clasică, zgomotul și marginile
 * dure nu lasă cioturi, punctele se numără, curățarea lucrează înainte, plafonul, căile care trec printr-o încrucișare (un 8,
 * o acadea), un umflet pe o trăsătură și aceeași ieșire la fiecare rulare.
 */

const IMPLICITE: OptiuniTrasare = { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat', petePx: 0, gauriPx: 0 };
type Pt = readonly [number, number];

/** Imaginea cu cerneala închisă pe alb, din acoperirea dată pe pixel. */
function imagine(W: number, H: number, acop: (x: number, y: number) => number): ImagineRGBA {
  const date = new Uint8ClampedArray(4 * W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = 255 - Math.round(255 * Math.max(0, Math.min(1, acop(x, y))));
      date.set([v, v, v, 255], 4 * (y * W + x));
    }
  }
  return { latime: W, inaltime: H, date };
}

/** Distanța de la un punct la o linie frântă. */
function laLinie(x: number, y: number, P: readonly Pt[], inchisa = false): number {
  let d = Infinity;
  const n = P.length;
  for (let k = 0; k < (inchisa ? n : n - 1); k++) {
    const [ax, ay] = P[k] ?? [0, 0], [bx, by] = P[(k + 1) % n] ?? [0, 0];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    d = Math.min(d, Math.hypot(ax + u * dx - x, ay + u * dy - y));
  }
  return d;
}

/** Trăsăturile (linii frânte cu grosimea w, capete rotunde), eșantionate 4 × 4 pe pixel; `dur`: doar centrul pixelului. */
function trasaturi(W: number, H: number, linii: ReadonlyArray<{ readonly P: readonly Pt[]; readonly inchisa?: boolean }>, w: number, dur = false): ImagineRGBA {
  const s = dur ? 1 : 4;
  return imagine(W, H, (x, y) => {
    if (Math.min(...linii.map((l) => laLinie(x + 0.5, y + 0.5, l.P, l.inchisa))) > w / 2 + 1) return 0;
    let a = 0;
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) if (Math.min(...linii.map((l) => laLinie(x + (i + 0.5) / s, y + (j + 0.5) / s, l.P, l.inchisa))) <= w / 2) a++;
    return a / (s * s);
  });
}

/** Distanța cea mai mare de la eșantioanele curbelor la linii (în afara cercurilor date) și înapoi. */
function abateri(c: ReturnType<typeof esantioaneCai>, linii: ReadonlyArray<{ readonly P: readonly Pt[]; readonly inchisa?: boolean }>, ocolite: readonly Pt[], raza: number): { dus: number; intors: number } {
  const departe = (x: number, y: number): boolean => ocolite.every((q) => Math.hypot(q[0] - x, q[1] - y) > raza);
  let dus = 0;
  for (const k of c) {
    for (let i = 0; i < k.puncte.length; i += 2) {
      const x = k.puncte[i] ?? 0, y = k.puncte[i + 1] ?? 0;
      if (departe(x, y)) dus = Math.max(dus, Math.min(...linii.map((l) => laLinie(x, y, l.P, l.inchisa))));
    }
  }
  const g = grila(c.flatMap((k) => k.puncte));
  let intors = 0;
  for (const l of linii) {
    const n = l.P.length;
    for (let k = 0; k < (l.inchisa ? n : n - 1); k++) {
      const [ax, ay] = l.P[k] ?? [0, 0], [bx, by] = l.P[(k + 1) % n] ?? [0, 0];
      const pasi = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.25));
      for (let i = 0; i <= pasi; i++) {
        const x = ax + ((bx - ax) * i) / pasi, y = ay + ((by - ay) * i) / pasi;
        if (departe(x, y)) intors = Math.max(intors, g(x, y));
      }
    }
  }
  return { dus, intors };
}

/** Subțierea de referință: Zhang–Suen cu B între 3 și 6 (Lü și Wang), pe toată imaginea la fiecare sub-trecere. */
function subtiazaClasic(m: Uint8Array, W: number, H: number): Uint8Array {
  const s = new Uint8Array(m);
  const v = (x: number, y: number): number => (x >= 0 && y >= 0 && x < W && y < H ? s[y * W + x] ?? 0 : 0);
  for (let schimbat = true; schimbat;) {
    schimbat = false;
    for (const sub of [0, 1]) {
      const scoase: number[] = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!s[y * W + x]) continue;
          const p2 = v(x, y - 1), p3 = v(x + 1, y - 1), p4 = v(x + 1, y), p5 = v(x + 1, y + 1);
          const p6 = v(x, y + 1), p7 = v(x - 1, y + 1), p8 = v(x - 1, y), p9 = v(x - 1, y - 1);
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 3 || B > 6) continue;
          const tr = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let A = 0;
          for (let k = 0; k < 8; k++) if (!tr[k] && tr[k + 1]) A++;
          if (A !== 1) continue;
          if (sub === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          scoase.push(y * W + x);
        }
      }
      for (const p of scoase) s[p] = 0;
      if (scoase.length > 0) schimbat = true;
    }
  }
  return s;
}

test('subțierea cu cozi (doar pixelii cu vecinătatea schimbată) e exact cea clasică, pe pete, bare și zgomot', () => {
  let sem = 7;
  const r = (): number => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff; };
  for (let caz = 0; caz < 12; caz++) {
    const W = 40 + Math.floor(r() * 50), H = 30 + Math.floor(r() * 50);
    const m = new Uint8Array(W * H);
    for (let k = 0; k < 6; k++) {
      const cx = r() * W, cy = r() * H, a = 2 + r() * 12, b = 2 + r() * 12, u = r() * Math.PI;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dx = x - cx, dy = y - cy, p = dx * Math.cos(u) + dy * Math.sin(u), q = -dx * Math.sin(u) + dy * Math.cos(u);
          if ((p / a) ** 2 + (q / b) ** 2 <= 1) m[y * W + x] = 1;
        }
      }
    }
    // Zgomot: pixeli răsturnați, ca să apară găuri, ace și trepte.
    for (let k = 0; k < (W * H) / 25; k++) { const p = Math.floor(r() * W * H); m[p] = 1 - (m[p] ?? 0); }
    assert.deepEqual(subtiaza(m, W, H), subtiazaClasic(m, W, H), `cazul ${caz}`);
  }
});

test('o trăsătură la 45° rămâne (Zhang–Suen fără îndreptarea lui Lü și Wang o ștergea toată)', () => {
  const img = trasaturi(64, 64, [{ P: [[8.4, 8.1], [52.6, 52.3]] }], 4);
  const r = traseazaMediana(img, IMPLICITE);
  assert.ok(r.ok);
  assert.equal(r.raport.contururi, 1);
  const [c] = esantioaneCai(r.cai);
  assert.ok(c?.deschisa);
  const n = c.varfuri.length / 2;
  const [ax, ay, bx, by] = [c.varfuri[0] ?? 0, c.varfuri[1] ?? 0, c.varfuri[2 * n - 2] ?? 0, c.varfuri[2 * n - 1] ?? 0];
  // Capetele în centrul capetelor rotunde, la cel mult 0,4 px fiecare (în orice ordine).
  const d0 = Math.max(Math.hypot(ax - 8.4, ay - 8.1), Math.hypot(bx - 52.6, by - 52.3));
  const d1 = Math.max(Math.hypot(bx - 8.4, by - 8.1), Math.hypot(ax - 52.6, ay - 52.3));
  assert.ok(Math.min(d0, d1) <= 0.4, `capetele: (${ax.toFixed(2)}, ${ay.toFixed(2)}) și (${bx.toFixed(2)}, ${by.toFixed(2)})`);
});

test('zgomot ca pe o poză (±12 niveluri): aceleași căi și capete, fără cioturi, linia la cel mult 0,5 px', () => {
  // Un T, un arc și o trăsătură liberă, cu zgomot pe fiecare pixel (aceeași secvență la fiecare rulare).
  let sem = 99;
  const r = (): number => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff; };
  const arc: Pt[] = Array.from({ length: 65 }, (_, k) => [150 + 30 * Math.cos((Math.PI * k) / 64), 60 + 30 * Math.sin((Math.PI * k) / 64)] as const);
  const linii = [{ P: [[12.3, 20.4], [92.6, 20.4]] as Pt[] }, { P: [[52.5, 20.4], [52.5, 95.1]] as Pt[] }, { P: arc }, { P: [[20.2, 110.3], [180.8, 118.9]] as Pt[] }];
  const curat = trasaturi(200, 130, linii, 6);
  const date = new Uint8ClampedArray(curat.date.length);
  for (let i = 0; i < date.length; i += 4) {
    const v = (curat.date[i] ?? 0) + Math.round(24 * (r() - 0.5));
    date.set([v, v, v, 255], i);
  }
  const img = { latime: 200, inaltime: 130, date };
  const t = traseazaMediana(img, { ...IMPLICITE, petePx: 4, gauriPx: 4 });
  assert.ok(t.ok);
  assert.equal(t.raport.contururi, 4, 'bara T-ului, piciorul, arcul, trăsătura liberă');
  assert.equal(t.raport.jonctiuni, 1);
  const c = esantioaneCai(t.cai);
  const capete: Pt[] = [[12.3, 20.4], [92.6, 20.4], [52.5, 95.1], arc[0] ?? [0, 0], arc[64] ?? [0, 0], [20.2, 110.3], [180.8, 118.9]];
  const { dus, intors } = abateri(c, linii, [...capete, [52.5, 20.4]], 6);
  assert.ok(dus <= 0.5 && intors <= 0.5, `linia: ${dus.toFixed(3)} / ${intors.toFixed(3)} px`);
  assert.ok(Math.abs(t.raport.grosime - 6) <= 0.3, `grosimea ${t.raport.grosime.toFixed(2)}`);
});

test('marginile dure (fără nuanțe): T-ul la 17° iese tot din două căi, cu linia la cel mult 0,6 px', () => {
  const u = (17 * Math.PI) / 180, c = Math.cos(u), s = Math.sin(u);
  const R = (x: number, y: number): Pt => [60 + (x - 60) * c - (y - 40) * s, 40 + (x - 60) * s + (y - 40) * c];
  const linii = [{ P: [R(15.3, 30.2), R(105.1, 30.2)] }, { P: [R(60.2, 30.2), R(60.2, 75.4)] }];
  const img = trasaturi(120, 100, linii, 7, true);
  const t = traseazaMediana(img, IMPLICITE);
  assert.ok(t.ok);
  assert.equal(t.raport.margini, 'dure');
  assert.equal(t.raport.contururi, 2);
  assert.equal(t.raport.jonctiuni, 1);
  const { dus, intors } = abateri(esantioaneCai(t.cai), linii, [R(15.3, 30.2), R(105.1, 30.2), R(60.2, 75.4), R(60.2, 30.2)], 7);
  assert.ok(dus <= 0.6 && intors <= 0.6, `linia: ${dus.toFixed(3)} / ${intors.toFixed(3)} px`);
});

test('punctele (trăsături mai scurte decât grosimea lor) se numără, fără cale; petele sub prag se șterg întâi', () => {
  const linie: Pt[] = [[10.2, 20.3], [70.4, 20.3]];
  const img = imagine(80, 50, (x, y) => {
    if (laLinie(x + 0.5, y + 0.5, linie) <= 3) return 1;
    if (Math.hypot(x + 0.5 - 40.2, y + 0.5 - 38.1) <= 3.5) return 1;
    return x === 70 && y === 44 ? 1 : 0;
  });
  const t = traseazaMediana(img, IMPLICITE);
  assert.ok(t.ok);
  assert.equal(t.raport.contururi, 1, 'doar linia');
  assert.equal(t.raport.puncte, 2, 'discul și pixelul');
  const curat = traseazaMediana(img, { ...IMPLICITE, petePx: 2 });
  assert.ok(curat.ok);
  assert.equal(curat.raport.puncte, 1, 'pixelul, șters la curățare');
  assert.equal(curat.raport.pete, 1);
});

test('un gol mic în trăsătură face o buclă; „Umple golurile sub” îl umple înainte de schelet', () => {
  const linie: Pt[] = [[10.2, 20.3], [90.4, 20.3]];
  const img = imagine(100, 40, (x, y) => (laLinie(x + 0.5, y + 0.5, linie) <= 5 && !(x >= 49 && x <= 50 && y >= 19 && y <= 20) ? 1 : 0));
  const cu = traseazaMediana(img, IMPLICITE);
  assert.ok(cu.ok);
  assert.equal(cu.raport.bucle + cu.raport.jonctiuni > 0, true, 'golul se vede în schelet');
  const fara = traseazaMediana(img, { ...IMPLICITE, gauriPx: 9 });
  assert.ok(fara.ok);
  assert.equal(fara.raport.contururi, 1);
  assert.equal(fara.raport.jonctiuni, 0);
  assert.equal(fara.raport.gauri, 1);
});

test('un umflet pe marginea trăsăturii (sub o rază) nu lasă ciot: o cale, două capete', () => {
  const linie: Pt[] = [[10.2, 30.3], [90.4, 30.3]];
  const img = imagine(100, 60, (x, y) => (laLinie(x + 0.5, y + 0.5, linie) <= 4 || Math.hypot(x + 0.5 - 50.3, y + 0.5 - 35.6) <= 3.2 ? 1 : 0));
  const t = traseazaMediana(img, IMPLICITE);
  assert.ok(t.ok);
  assert.equal(t.raport.contururi, 1);
  assert.equal(t.raport.jonctiuni, 0);
});

test('un 8 (o curbă închisă care se încrucișează o dată) e o singură buclă, trecută drept prin încrucișare', () => {
  // Lemniscata lui Gerono: x = 50 + 34 cos t, y = 35 + 34 sin t cos t; se încrucișează în (50, 35).
  const P: Pt[] = Array.from({ length: 400 }, (_, k) => {
    const u = (2 * Math.PI * k) / 400;
    return [50.3 + 34 * Math.cos(u), 35.4 + 34 * Math.sin(u) * Math.cos(u)] as const;
  });
  const img = trasaturi(101, 72, [{ P, inchisa: true }], 4);
  const t = traseazaMediana(img, IMPLICITE);
  assert.ok(t.ok);
  assert.equal(t.raport.contururi, 1);
  assert.equal(t.raport.bucle, 1);
  assert.equal(t.raport.jonctiuni, 1);
  const { dus, intors } = abateri(esantioaneCai(t.cai), [{ P, inchisa: true }], [[50.3, 35.4]], 4);
  assert.ok(dus <= 0.4 && intors <= 0.4, `linia: ${dus.toFixed(3)} / ${intors.toFixed(3)} px`);
});

test('o acadea (o coadă care intră tangent într-un cerc): o cale, din capătul cozii, de-a lungul cercului, până în joncțiune', () => {
  const cerc: Pt[] = Array.from({ length: 200 }, (_, k) => [60.2 + 20 * Math.cos((2 * Math.PI * k) / 200), 30.4 + 20 * Math.sin((2 * Math.PI * k) / 200)] as const);
  // Coada vine de jos, din stânga, tangentă cercului în punctul lui cel mai de jos (60,2; 50,4).
  const coada: Pt[] = [[10.3, 50.4], [60.2, 50.4]];
  const img = trasaturi(90, 62, [{ P: cerc, inchisa: true }, { P: coada }], 4);
  const t = traseazaMediana(img, IMPLICITE);
  assert.ok(t.ok);
  assert.equal(t.raport.contururi, 1);
  assert.equal(t.raport.bucle, 0);
  const [c] = esantioaneCai(t.cai);
  assert.ok(c?.deschisa);
});

test(`plafonul (ADR 0220 §9): peste ${PLAFON_TRASARE.contururi} de căi, refuzul spune câte au fost`, () => {
  // Liniuțe de 4 × 1 px, la câte 6 × 2 px: 150 × 134 = 20 100 de căi.
  const img = imagine(900, 268, (x, y) => (y % 2 === 0 && x % 6 < 4 ? 1 : 0));
  const r = traseazaMediana(img, { ...IMPLICITE, sursa: 'lum' });
  assert.equal(r.ok, false);
  assert.ok(r.raport.contururi > PLAFON_TRASARE.contururi, `${r.raport.contururi}`);
});

test('aceeași imagine dă aceleași căi, octet cu octet (fără ordine dependentă de Map sau de timp)', () => {
  const img = trasaturi(80, 60, [{ P: [[10.3, 15.2], [70.3, 15.2]] }, { P: [[40.3, 15.2], [40.3, 52.7]] }], 5);
  const a = traseazaMediana(img, IMPLICITE), b = traseazaMediana(img, IMPLICITE);
  assert.ok(a.ok && b.ok);
  assert.deepEqual(Array.from(a.cai.xy), Array.from(b.cai.xy));
  assert.deepEqual(Array.from(a.cai.inceput), Array.from(b.cai.inceput));
  assert.equal(MEDIANA.cotitura, 30);
});

// ── Probele țintite ale otrăvurilor scăpate (lista 25.3, prima rulare) ─────────────────────────────────────────────────

/** Trăsături drepte cu capete drepte (dreptunghiuri), eșantionate 4 × 4 pe pixel. */
function dreptunghiuri(W: number, H: number, seg: ReadonlyArray<readonly [Pt, Pt]>, w: number): ImagineRGBA {
  return imagine(W, H, (x, y) => {
    let a = 0;
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const px = x + (i + 0.5) / 4, py = y + (j + 0.5) / 4;
        if (seg.some(([A, B]) => {
          const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
          const t = (px - A[0]) * ux + (py - A[1]) * uy, d = Math.abs(-(px - A[0]) * uy + (py - A[1]) * ux);
          return t >= 0 && t <= L && d <= w / 2;
        })) a++;
      }
    }
    return a / 16;
  });
}

test('furcile de 20–45° (o trăsătură dreaptă și o ramură din mijlocul ei): dreapta rămâne o cale, prin joncțiune, la cel mult 0,2 px', () => {
  // Măsurat la scriere: linia la cel mult 0,17 px, curbele la cel mult 0,21 px de punctul furcii. Cu perechile cele mai strâmbe
  // întâi (L04), dreapta se rupe sub 30°; cu brațele curățate larg (B02), se rupe la 20° și linia trece de 0,25 px la 40°; cu
  // raza grupului din primul pixel (P04), linia ajunge la 0,23 px la 35°.
  const c: Pt = [60.3, 45.2], u = 0.31, L = 45;
  for (const unghi of [20, 25, 30, 35, 40, 45]) {
    for (const w of [3, 4, 6, 8]) {
      const A: Pt = [c[0] - L * Math.cos(u), c[1] - L * Math.sin(u)], B: Pt = [c[0] + L * Math.cos(u), c[1] + L * Math.sin(u)];
      const C: Pt = [c[0] + L * Math.cos(u + (unghi * Math.PI) / 180), c[1] + L * Math.sin(u + (unghi * Math.PI) / 180)];
      const linii = [{ P: [A, B] }, { P: [c, C] }];
      const t = traseazaMediana(trasaturi(120, 100, linii, w), IMPLICITE);
      const caz = `${unghi}°, w ${w}`;
      assert.ok(t.ok, caz);
      const cai = esantioaneCai(t.cai);
      assert.equal(cai.length, 2, caz);
      const lang = (p: Pt, q: Pt): boolean => Math.hypot(p[0] - q[0], p[1] - q[1]) < w;
      const capete = cai.map((k) => { const n = k.varfuri.length / 2; return [[k.varfuri[0] ?? 0, k.varfuri[1] ?? 0], [k.varfuri[2 * n - 2] ?? 0, k.varfuri[2 * n - 1] ?? 0]] as const; });
      assert.ok(capete.some(([p, q]) => (lang(p, A) && lang(q, B)) || (lang(p, B) && lang(q, A))), `${caz}: A și B pe aceeași cale`);
      let jonct = Infinity;
      for (const k of cai) for (let i = 0; i < k.puncte.length; i += 2) jonct = Math.min(jonct, Math.hypot((k.puncte[i] ?? 0) - c[0], (k.puncte[i + 1] ?? 0) - c[1]));
      assert.ok(jonct <= 0.25, `${caz}: curbele trec la ${jonct.toFixed(3)} px de furcă`);
      const zona = w / Math.sin((unghi * Math.PI) / 180) + w;
      const departe = (x: number, y: number): boolean => Math.hypot(x - c[0], y - c[1]) > zona && [A, B, C].every((p) => Math.hypot(x - p[0], y - p[1]) > w);
      let abatere = 0;
      for (const k of cai) {
        for (let i = 0; i < k.puncte.length; i += 2) {
          const x = k.puncte[i] ?? 0, y = k.puncte[i + 1] ?? 0;
          if (departe(x, y)) abatere = Math.max(abatere, Math.min(laLinie(x, y, [A, B]), laLinie(x, y, [c, C])));
        }
      }
      assert.ok(abatere <= 0.2, `${caz}: linia la ${abatere.toFixed(3)} px`);
    }
  }
});

test('un colț ascuțit (un V de ~37°, subțire): o singură cale, fiindcă joncțiunea cu două brațe rămasă după ciot e o trecere', () => {
  // Configurația care a despărțit otrava L03: fără trecerea forțată, V-ul ieșea în două căi.
  const t = traseazaMediana(trasaturi(90, 80, [{ P: [[22.31, 57.49], [56.19, 53.12], [31.38, 29.63]] }], 3.13), IMPLICITE);
  assert.ok(t.ok);
  assert.equal(t.raport.contururi, 1);
  const [c] = esantioaneCai(t.cai);
  assert.ok(c?.deschisa);
});

test('capetele drepte ale trăsăturilor groase și oblice: centrul lor, recentrat de-a curmezișul, la cel mult 0,2 px', () => {
  // Fără recentrare, direcția puțin strâmbă a capătului (scheletul cotit spre un colț) muta capătul cu până la 0,71 px într-o
  // parte; cu ea, 0,14 px pe 61 de trăsături întâmplătoare. Aici, cele patru cele mai rele de atunci.
  const cazuri: Array<readonly [Pt, Pt, number]> = [[[75.94, 25.23], [49.36, 77.67], 8.17], [[71.07, 27.7], [49.09, 77.19], 8.9],
    [[95.17, 40.24], [40.88, 55.79], 9.16], [[86.95, 36.97], [35.05, 62.42], 6.7]];
  for (const [A, B, w] of cazuri) {
    const t = traseazaMediana(dreptunghiuri(120, 90, [[A, B]], w), { ...IMPLICITE, petePx: 4, gauriPx: 4 });
    assert.ok(t.ok);
    const [c] = esantioaneCai(t.cai);
    assert.ok(c);
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    const n = c.varfuri.length / 2;
    const capete: Pt[] = [[c.varfuri[0] ?? 0, c.varfuri[1] ?? 0], [c.varfuri[2 * n - 2] ?? 0, c.varfuri[2 * n - 1] ?? 0]];
    for (const q of [[A[0] + (ux * w) / 2, A[1] + (uy * w) / 2], [B[0] - (ux * w) / 2, B[1] - (uy * w) / 2]] as Pt[]) {
      const d = Math.min(...capete.map((p) => Math.hypot(p[0] - q[0], p[1] - q[1])));
      assert.ok(d <= 0.2, `w ${w}: capătul (${q.map((v) => v.toFixed(2)).join(', ')}) la ${d.toFixed(3)} px`);
    }
  }
});
