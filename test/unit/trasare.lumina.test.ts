import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cernealaDeschisa, fereastraLocala, filtruFereastra, fundalLocal, fundalNeted, variatieHartie, type Lumina,
} from '../../src/trasare/lumina.ts';
import { campul, pragAutomat, traseaza, type ImagineRGBA, type OptiuniTrasare } from '../../src/trasare/trasare.ts';
import { traseazaMediana } from '../../src/trasare/mediana.ts';
import { traseazaCulori } from '../../src/trasare/culori.ts';
import { erori, luminaLaterala, poza, type Poza } from './ajutor-poze.ts';

/**
 * Probele luminii (ADR 0224, felia 25.4↑): pe poze sintetice cu cerneala știută (`ajutor-poze.ts`), pragul de azi
 * („Uniformă”), fundalul neted („Neuniformă”: un polinom de gradul 3 potrivit pe hârtie) și fundalul local („Cu umbre”:
 * închiderea morfologică), fiecare pe cazurile lui; polaritatea din minoritatea locală a cernelii; filtrele pe fereastră,
 * exacte; marginea. Plafoanele, din măsurătorile de aici (`.tmp/masoara-lumina-0224.ts`), cu greșelile clare: un pixel
 * cu acoperirea sub 0,4 luat drept cerneală, sau cu cel puțin 0,6 pierdut (`erori`).
 */

const W = 600, H = 400;
const IMPLICITE: OptiuniTrasare = { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat', petePx: 25, gauriPx: 0 };
const lat = luminaLaterala(W, H);
const CAZURI = {
  egala: poza({ W, H }),
  laterala: poza({ W, H, lumina: lat }),
  pata: poza({ W, H, lumina: lat, pata: true }),
  umbra: poza({ W, H, lumina: lat, umbra: true }),
  masa: poza({ W, H, lumina: lat, masa: true }),
  creta: poza({ W, H, lumina: lat, creta: true }),
  // Desenele rare (ca în e2e): cerneala nu umple nicio fereastră a fundalului local.
  rar: poza({ W, H, lumina: lat, rar: true }),
  rarMasa: poza({ W, H, lumina: lat, rar: true, masa: true }),
  rarCreta: poza({ W, H, lumina: lat, rar: true, creta: true }),
} as const;

/** Cerneala găsită de `campul` cu lumina dată, față de cea adevărată. */
function cu(p: Poza, lumina: Lumina, extra: Partial<OptiuniTrasare> = {}): { plus: number; lipsa: number } {
  const { f, T } = campul(p, { ...IMPLICITE, lumina, ...extra });
  return erori(p, f, T);
}
const pct = (x: number): string => `${(100 * x).toFixed(2)} %`;

test('luminile pe lumina egală: toate trei găsesc desenul (pragul de azi nu se strică, iar corecțiile nu îngroașă liniile)', () => {
  for (const l of ['uniforma', 'neuniforma', 'umbre'] as const) {
    const e = cu(CAZURI.egala, l);
    assert.ok(e.plus <= 0.002 && e.lipsa <= 0.002, `${l}: în plus ${pct(e.plus)}, lipsă ${pct(e.lipsa)}`);
  }
});

test('lumina dintr-o parte: pragul de azi ia partea întunecată a foii drept cerneală; fundalul neted și cel local, nu', () => {
  const u = cu(CAZURI.laterala, 'uniforma');
  assert.ok(u.plus > 1, `Uniformă: în plus ${pct(u.plus)} (măsurat: 450 %)`);
  for (const l of ['neuniforma', 'umbre'] as const) {
    const e = cu(CAZURI.laterala, l);
    assert.ok(e.plus <= 0.002 && e.lipsa <= 0.002, `${l}: în plus ${pct(e.plus)}, lipsă ${pct(e.lipsa)}`);
  }
});

test('o pată plină: fundalul neted o ține plină; fundalul local o golește (e mai lată decât fereastra), cum spune ADR-ul', () => {
  const n = cu(CAZURI.pata, 'neuniforma');
  assert.ok(n.plus <= 0.002 && n.lipsa <= 0.002, `Neuniformă: în plus ${pct(n.plus)}, lipsă ${pct(n.lipsa)}`);
  const u = cu(CAZURI.pata, 'umbre');
  assert.ok(u.lipsa > 0.15, `Cu umbre: lipsă ${pct(u.lipsa)} (măsurat: 48 %)`);
});

test('o umbră tare: fundalul local o ține în fundal (o treaptă rămâne la închidere); fundalul neted ia toată banda ei', () => {
  const u = cu(CAZURI.umbra, 'umbre');
  assert.ok(u.plus <= 0.005 && u.lipsa <= 0.005, `Cu umbre: în plus ${pct(u.plus)}, lipsă ${pct(u.lipsa)}`);
  const n = cu(CAZURI.umbra, 'neuniforma');
  assert.ok(n.plus > 1, `Neuniformă: în plus ${pct(n.plus)} (măsurat: 335 %)`);
});

test('foaia pe masă: masa iese cerneală lipită de margine; „Ignoră ce atinge marginea” o scoate și rămâne desenul', () => {
  for (const l of ['neuniforma', 'umbre'] as const) {
    const fara = cu(CAZURI.masa, l);
    assert.ok(fara.plus > 0.5, `${l}, fără margine: în plus ${pct(fara.plus)} (masa)`);
    const e = cu(CAZURI.masa, l, { margine: true });
    // Fundalul are cel puțin un sfert din hârtia cea mai deschisă: zgomotul mesei închise nu iese pete (fără el: 1 % în plus).
    assert.ok(e.plus <= 0.002 && e.lipsa <= 0.002, `${l}, fără ce atinge marginea: în plus ${pct(e.plus)}, lipsă ${pct(e.lipsa)}`);
  }
});

test('un desen rar (un zigzag larg, un cerc, o linie): ambele lumini de poză îl găsesc, și pe masă, și cu creta', () => {
  for (const [nume, extra] of [['rar', {}], ['rarMasa', { margine: true }], ['rarCreta', {}]] as const) {
    for (const l of ['neuniforma', 'umbre'] as const) {
      const e = cu(CAZURI[nume], l, extra);
      // Cu umbre pe cretă: zgomotul tablei închise, raportat la deschiderea ei, lasă puțină cerneală în plus (ca pe creta deasă).
      const plus = nume === 'rarCreta' && l === 'umbre' ? 0.03 : 0.005;
      assert.ok(e.plus <= plus && e.lipsa <= 0.005, `${nume}, ${l}: în plus ${pct(e.plus)}, lipsă ${pct(e.lipsa)}`);
    }
  }
});

test('creta pe tablă (cerneala deschisă): raportul față de fondul închis ține toată creta, și în colțul întunecat', () => {
  const u = cu(CAZURI.creta, 'uniforma');
  assert.ok(u.lipsa > 0.015, `Uniformă: lipsă ${pct(u.lipsa)} (măsurat: 3 %)`);
  const n = cu(CAZURI.creta, 'neuniforma');
  assert.ok(n.plus <= 0.003 && n.lipsa <= 0.002, `Neuniformă: în plus ${pct(n.plus)}, lipsă ${pct(n.lipsa)}`);
  const s = cu(CAZURI.creta, 'umbre');
  assert.ok(s.plus <= 0.03 && s.lipsa <= 0.015, `Cu umbre: în plus ${pct(s.plus)}, lipsă ${pct(s.lipsa)}`);
});

test('polaritatea pe poze: minoritatea locală a cernelii nimerește toate cazurile, și umbra și masa, unde marginea se întoarce', () => {
  for (const [nume, p] of Object.entries(CAZURI)) {
    assert.equal(cernealaDeschisa(p.l, W, H), nume === 'creta' || nume === 'rarCreta', nume);
  }
  // Pragul de azi ia polaritatea din margine: pe umbră și pe masă, hârtia devine cerneală (desenul, găuri în ea).
  for (const nume of ['umbra', 'masa'] as const) {
    const e = cu(CAZURI[nume], 'uniforma');
    assert.ok(e.lipsa > 0.9, `${nume}, Uniformă: lipsă ${pct(e.lipsa)}`);
  }
});

test('polaritatea: pe un logo opac care umple cadrul (un disc negru cu linii albe), minoritatea ia liniile albe drept cerneală', () => {
  // De aceea „Uniformă” păstrează marginea (ADR 0224, „Ce am respins”): acolo, fundalul e marginea albă.
  const p = poza({ W, H });
  const l = Float32Array.from(p.l, (v, i) => {
    const x = i % W, y = (i - x) / W;
    return Math.hypot(x - W / 2, y - H / 2) < 0.58 * H ? 0.08 + (0.93 - v) : 0.97;
  });
  assert.equal(cernealaDeschisa(l, W, H), true);
});

test('Inversează, cu o lumină de poză: întoarce polaritatea înaintea corecției (pe cretă, tabla devine cerneala)', () => {
  const { f, T } = campul(CAZURI.creta, { ...IMPLICITE, lumina: 'neuniforma', inverseaza: true });
  const e = erori(CAZURI.creta, f, T);
  assert.ok(e.plus > 5 && e.lipsa > 0.9, `în plus ${pct(e.plus)}, lipsă ${pct(e.lipsa)}`);
});

test('filtrul pe fereastră (van Herk – Gil-Werman): exact ca maximul și minimul naiv, și la margini (fereastra tăiată)', () => {
  let s = 7;
  const r = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (const [w, h] of [[37, 23], [5, 9], [1, 1], [64, 3]] as const) {
    const v = Float32Array.from({ length: w * h }, r);
    for (const k of [0, 1, 2, 5, 40]) {
      for (const max of [true, false]) {
        const o = filtruFereastra(v, w, h, k, max);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let e = max ? -Infinity : Infinity;
            for (let yy = Math.max(0, y - k); yy <= Math.min(h - 1, y + k); yy++) {
              for (let xx = Math.max(0, x - k); xx <= Math.min(w - 1, x + k); xx++) {
                const q = v[yy * w + xx] ?? 0;
                e = max ? Math.max(e, q) : Math.min(e, q);
              }
            }
            assert.equal(o[y * w + x], e, `${w}×${h}, k ${k}, ${max ? 'max' : 'min'}, (${x}, ${y})`);
          }
        }
      }
    }
  }
});

test('fundalul local: o treaptă de umbră rămâne întocmai, o linie mai îngustă decât fereastra dispare, o pată mai lată rămâne', () => {
  const w = 120, h = 80;
  // O treaptă: hârtia luminată 0,9 la stânga, 0,55 la dreapta (umbra); peste ea, o linie de 3 px și un pătrat de 40 px.
  const l = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) l[y * w + x] = x < 70 ? 0.9 : 0.55;
  const treapta = fundalLocal(l, w, h, 15, true);
  assert.deepEqual(Array.from(treapta), Array.from(l), 'închiderea păstrează treapta');
  const desen = Float32Array.from(l, (v, i) => {
    const x = i % w, y = (i - x) / w;
    return (y >= 20 && y < 23) || (x >= 10 && x < 50 && y >= 35 && y < 75) ? 0.1 * v : v;
  });
  const B = fundalLocal(desen, w, h, 15, true);
  for (let x = 0; x < w; x++) assert.equal(B[21 * w + x], l[21 * w + x], `linia, la x ${x}`);
  assert.ok((B[55 * w + 30] ?? 1) < 0.2, 'mijlocul pătratului rămâne închis');
  // Fereastra: 1/12 din latura mică, impară, cel puțin 15 px.
  assert.equal(fereastraLocala(600, 400), 35);
  assert.equal(fereastraLocala(4000, 3000), 251);
  assert.equal(fereastraLocala(100, 60), 15);
});

test('fundalul neted: regăsește o suprafață cubică știută sub un desen (cerneala nu intră în potrivire), cu variația ei', () => {
  const w = 300, h = 200;
  const S = (x: number, y: number): number => {
    const u = (2 * (x + 0.5)) / w - 1, v = (2 * (y + 0.5)) / h - 1;
    return 0.8 - 0.2 * u + 0.08 * v + 0.05 * u * u - 0.04 * u * v - 0.03 * v * v + 0.02 * u * u * u + 0.03 * v * v * v;
  };
  const p = poza({ W: w, H: h, zgomot: 0 });
  const l = Float32Array.from(p.l, (v, i) => { const x = i % w, y = (i - x) / w; return (S(x, y) * v) / 0.97; });
  const { B, variatie } = fundalNeted(l, w, h, true, 1 - pragAutomat(Float32Array.from(l, (v) => 1 - v)));
  let maxErr = 0, mn = Infinity, mx = -Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = 0.93 * S(x, y);
      maxErr = Math.max(maxErr, Math.abs((B[y * w + x] ?? 0) - s) / s);
      mn = Math.min(mn, s); mx = Math.max(mx, s);
    }
  }
  assert.ok(maxErr < 0.01, `abaterea relativă cea mai mare: ${maxErr}`);
  assert.ok(Math.abs(variatie - (mx - mn) / mx) < 0.02, `variația ${variatie}, pe hârtie ${(mx - mn) / mx}`);
});

test('sugestia raportului: pe lumina dintr-o parte, hârtia variază mult; pe lumina egală, aproape deloc; doar la „Uniformă”', () => {
  const v = (p: Poza): number => { const f = Float32Array.from(p.l, (x) => 1 - x); return variatieHartie(f, W, H, pragAutomat(f)); };
  assert.ok(v(CAZURI.laterala) > 0.25, `laterală: ${v(CAZURI.laterala)}`);
  assert.ok(v(CAZURI.egala) < 0.05, `egală: ${v(CAZURI.egala)}`);
  const u = campul(CAZURI.laterala, { ...IMPLICITE, lumina: 'uniforma' }).baza;
  assert.equal(u.lumina, 'uniforma');
  assert.ok(u.inegala !== null && u.inegala > 0.25, `inegala: ${String(u.inegala)}`);
  const n = campul(CAZURI.laterala, { ...IMPLICITE, lumina: 'neuniforma' }).baza;
  assert.equal(n.lumina, 'neuniforma');
  assert.equal(n.inegala, null);
});

test('pe transparență, lumina nu se aplică (n-are lumină): același câmp ca la „Uniformă”, iar raportul spune „uniforma”', () => {
  const w = 60, h = 40, date = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x - 30, y - 20) < 12) date.set([200, 30, 30, 255], (y * w + x) * 4);
  const img: ImagineRGBA = { latime: w, inaltime: h, date };
  const a = campul(img, { ...IMPLICITE, lumina: 'uniforma' }), b = campul(img, { ...IMPLICITE, lumina: 'umbre' });
  assert.equal(b.baza.sursa, 'alfa');
  assert.equal(b.baza.lumina, 'uniforma');
  assert.deepEqual(Array.from(b.f), Array.from(a.f));
});

test('„Ignoră ce atinge marginea”: bucata lipită de margine se șterge (numărată), cea la un pixel de ea rămâne', () => {
  const w = 50, h = 30, date = new Uint8ClampedArray(w * h * 4).fill(255);
  const negru = (x: number, y: number): void => { date.set([0, 0, 0, 255], (y * w + x) * 4); };
  for (let y = 5; y < 25; y++) for (let x = 0; x < 6; x++) negru(x, y);        // lipită de stânga
  for (let y = 5; y < 25; y++) for (let x = 43; x < 49; x++) negru(x, y);      // la un pixel de dreapta
  const img: ImagineRGBA = { latime: w, inaltime: h, date };
  const fara = traseaza(img, { ...IMPLICITE, petePx: 0 });
  assert.ok(fara.ok);
  assert.equal(fara.raport.contururi, 2);
  assert.equal(fara.raport.margine, 0);
  const cuMargine = traseaza(img, { ...IMPLICITE, petePx: 0, margine: true });
  assert.ok(cuMargine.ok);
  assert.equal(cuMargine.raport.contururi, 1);
  assert.equal(cuMargine.raport.margine, 1);
  const x0 = Math.min(...Array.from({ length: cuMargine.cai.xy.length / 6 }, (_, v) => cuMargine.cai.xy[6 * v] ?? 0));
  assert.ok(x0 > 40, `rămâne bucata din dreapta (x ${x0})`);
});

test('liniile mediane primesc aceeași cerneală: pe umbră, cu „Cu umbre”, la fel de multe linii ca pe lumina egală', () => {
  const egala = traseazaMediana(CAZURI.egala, IMPLICITE);
  const umbra = traseazaMediana(CAZURI.umbra, { ...IMPLICITE, lumina: 'umbre', margine: true });
  assert.ok(egala.ok && umbra.ok);
  assert.equal(umbra.raport.lumina, 'umbre');
  const n = (c: typeof egala): number => (c.ok ? c.cai.inceput.length - 1 : -1);
  assert.equal(n(umbra), n(egala), `liniile: ${n(umbra)} față de ${n(egala)}`);
});

test('pe culori, „Ignoră ce atinge marginea”: culoarea lipită de margine trece la fundal, numărată; cealaltă rămâne', () => {
  const w = 60, h = 40, date = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < 8 && y >= 10 && y < 30) date.set([210, 30, 30, 255], (y * w + x) * 4);
      else if (Math.hypot(x - 38, y - 20) < 9) date.set([30, 60, 210, 255], (y * w + x) * 4);
    }
  }
  const img: ImagineRGBA = { latime: w, inaltime: h, date };
  const o = { numar: 3, legaturi: [], bifate: null, netezime: 'echilibrat' as const, petePx: 0, gauriPx: 0 };
  const fara = traseazaCulori(img, o), cuM = traseazaCulori(img, { ...o, margine: true });
  assert.ok(fara.ok && cuM.ok);
  assert.equal(fara.piese.length, 2);
  assert.equal(cuM.piese.length, 1);
  assert.equal(cuM.raport.margine, 1);
  assert.equal(fara.raport.margine, 0);
  // Bucata trece la fundal (culoarea marginii), nu la transparent: în imaginea pictată are eticheta fundalului.
  const fundal = cuM.raport.paleta.findIndex((c) => c.fundal);
  assert.equal(cuM.etichete[20 * w + 3], fundal);
});
