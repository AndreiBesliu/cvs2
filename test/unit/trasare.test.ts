import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arie, cerneala, contururi, PLAFON_TRASARE, pragAutomat, traseaza, type ImagineRGBA, type OptiuniTrasare } from '../../src/trasare/trasare.ts';
import { citestePng } from './ajutor-png.ts';
import { esantioane } from './ajutor-trasare.ts';

/** Probele țintite ale nucleului trasării (ADR 0220): fiecare regulă din decizie, pe o imagine scrisă aici, pixel cu pixel. */

const IMPLICITE: OptiuniTrasare = { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat', petePx: 0, gauriPx: 0 };

/** O imagine din funcția (x, y) → [r, g, b, a] pe pixeli. */
function imagine(latime: number, inaltime: number, pixel: (x: number, y: number) => readonly [number, number, number, number]): ImagineRGBA {
  const date = new Uint8ClampedArray(latime * inaltime * 4);
  for (let y = 0; y < inaltime; y++) for (let x = 0; x < latime; x++) date.set(pixel(x, y), (y * latime + x) * 4);
  return { latime, inaltime, date };
}

const discAlb = (x: number, y: number): boolean => Math.hypot(x + 0.5 - 20, y + 0.5 - 20) < 12;

test('pragul automat: mijlocul mediilor celor două clase (jumătatea acoperirii), 0,5 fără două clase', () => {
  const f = new Float32Array(1000);
  for (let i = 0; i < f.length; i++) f[i] = i < 600 ? 0.1 : 0.9;
  assert.ok(Math.abs(pragAutomat(f) - 0.5) < 1 / 255);
  for (let i = 0; i < f.length; i++) f[i] = i < 600 ? 0.2 : 0.6;
  assert.ok(Math.abs(pragAutomat(f) - 0.4) < 1 / 255);
  assert.equal(pragAutomat(new Float32Array(50).fill(0.3)), 0.5);
});

test('cerneala (lecția D7): pe transparență contează alfa, oricare ar fi culoarea; pe o imagine opacă, fundalul e marginea', () => {
  for (const culoare of [255, 0, 128]) {
    const img = imagine(40, 40, (x, y) => (discAlb(x, y) ? [culoare, culoare, culoare, 255] : [255, 255, 255, 0]));
    const c = cerneala(img, IMPLICITE);
    assert.equal(c.transparenta, true);
    assert.equal(c.sursa, 'alfa');
    assert.equal(c.f[20 * 40 + 20], 1, `culoarea ${culoare}: cerneala plină în disc`);
    assert.equal(c.f[0], 0);
  }
  // Alb pe negru, opac: ce domină marginea (negrul) e fundalul.
  const albPeNegru = imagine(40, 40, (x, y) => (discAlb(x, y) ? [255, 255, 255, 255] : [0, 0, 0, 255]));
  const c = cerneala(albPeNegru, IMPLICITE);
  assert.equal(c.sursa, 'lum');
  assert.ok((c.f[20 * 40 + 20] ?? 0) > 0.99 && (c.f[0] ?? 1) < 0.01);
  // Inversează întoarce cerneala.
  const inv = cerneala(albPeNegru, { ...IMPLICITE, inverseaza: true });
  assert.ok((inv.f[20 * 40 + 20] ?? 1) < 0.01 && (inv.f[0] ?? 0) > 0.99);
  // Luminozitatea aleasă pe o imagine transparentă cu litere albe: nimic de trasat (greșeala D7, la cerere).
  const albPeTransparent = imagine(40, 40, (x, y) => (discAlb(x, y) ? [255, 255, 255, 255] : [255, 255, 255, 0]));
  const r = traseaza(albPeTransparent, { ...IMPLICITE, sursa: 'lum' });
  assert.ok(r.ok && r.raport.contururi === 0);
  assert.ok(traseaza(albPeTransparent, IMPLICITE).ok);
});

test('cerneala: alfa se socotește față de nivelul plin al imaginii (percentila 98), deci un desen semitransparent iese întreg', () => {
  const img = imagine(40, 40, (x, y) => (discAlb(x, y) ? [0, 0, 0, 150] : [0, 0, 0, 0]));
  const c = cerneala(img, IMPLICITE);
  assert.equal(c.f[20 * 40 + 20], 1);
  const r = traseaza(img, IMPLICITE);
  assert.ok(r.ok);
  assert.equal(r.raport.contururi, 1);
});

test('pragul ales: o valoare cel puțin cât pragul e cerneală', () => {
  const img = imagine(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? [0, 0, 0, 100] : [0, 0, 0, 0]));
  // Nivelul plin e 100 (percentila 98): cerneala 1 în pătrat; cu pragul 254 încă e cerneală, cu un prag pe alfa brut nu s-ar vedea.
  assert.equal(traseaza(img, { ...IMPLICITE, prag: 254 }).raport.contururi, 1);
  const gri = imagine(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? [155, 155, 155, 255] : [255, 255, 255, 255]));
  // Întunecimea 100/255: cu pragul 100 e cerneală, cu 101 nu.
  assert.equal(traseaza(gri, { ...IMPLICITE, prag: 100 }).raport.contururi, 1);
  assert.equal(traseaza(gri, { ...IMPLICITE, prag: 101 }).raport.contururi, 0);
});

test('curățarea: petele sub prag se șterg, golurile mici se umplu, cel lipit de margine rămâne', () => {
  const img = imagine(60, 40, (x, y) => {
    const disc = Math.hypot(x + 0.5 - 30, y + 0.5 - 20) < 14;
    const gaura = x === 30 && y === 20;
    const pata = (x === 3 && y === 3) || (x === 50 && y >= 35 && y <= 36);
    // Un golf deschis spre marginea de sus, de 2 px, într-o bandă de cerneală lipită de margine.
    const banda = y < 6 && x >= 52 && x !== 56;
    return (disc && !gaura) || pata || banda ? [0, 0, 0, 255] : [255, 255, 255, 255];
  });
  const brut = traseaza(img, IMPLICITE);
  const curat = traseaza(img, { ...IMPLICITE, petePx: 3, gauriPx: 3 });
  assert.ok(brut.ok && curat.ok);
  assert.equal(curat.raport.pete, 2);
  assert.equal(curat.raport.gauri, 1);
  assert.equal(brut.raport.contururi - curat.raport.contururi, 3, 'două pete și o gaură mai puțin');
});

test('punctul-șa: doi pixeli de cerneală care se ating într-un colț sunt o singură formă (8-vecinătate, ca la curățare)', () => {
  const img = imagine(10, 10, (x, y) => ((x === 4 && y === 4) || (x === 5 && y === 5) ? [0, 0, 0, 255] : [255, 255, 255, 255]));
  const { f } = cerneala(img, IMPLICITE);
  const bucle = contururi(f, 10, 10, 0.5);
  assert.equal(bucle.length, 1);
  // Iar curățarea îi vede ca o singură pată de 2 px: cu pragul 3, dispar amândoi.
  assert.equal(traseaza(img, { ...IMPLICITE, petePx: 3 }).raport.contururi, 0);
  assert.equal(traseaza(img, { ...IMPLICITE, petePx: 2 }).raport.contururi, 1);
});

test('orientarea: exterioarele au aria pozitivă, golurile negativă', () => {
  const img = imagine(40, 40, (x, y) => {
    const r = Math.hypot(x + 0.5 - 20, y + 0.5 - 20);
    return r < 15 && r > 6 ? [0, 0, 0, 255] : [255, 255, 255, 255];
  });
  const { f } = cerneala(img, IMPLICITE);
  const bucle = contururi(f, 40, 40, 0.5);
  assert.equal(bucle.length, 2);
  assert.deepEqual(bucle.map((b) => Math.sign(arie(b))).sort(), [-1, 1]);
  const r = traseaza(img, IMPLICITE);
  assert.ok(r.ok && r.raport.exterioare === 1 && r.raport.contururi === 2);
});

test('Netezimea (lecția D15): treptele dau ieșiri diferite (pe logoul owner-ului, cu multe curbe), fiecare în abaterea ei', () => {
  const img = citestePng(readFileSync(new URL('../fixtures/trasare/logo-cvs.png', import.meta.url)));
  const varfuri = (['fidel', 'echilibrat', 'neted'] as const).map((netezime) => {
    const r = traseaza(img, { ...IMPLICITE, netezime });
    assert.ok(r.ok);
    return { netezime, varfuri: r.raport.varfuri, abatere: r.raport.abatere };
  });
  assert.equal(new Set(varfuri.map((v) => v.varfuri)).size, 3, JSON.stringify(varfuri));
  assert.ok((varfuri[0]?.varfuri ?? 0) > (varfuri[1]?.varfuri ?? 0) && (varfuri[1]?.varfuri ?? 0) > (varfuri[2]?.varfuri ?? 0), 'Fidel > Echilibrat > Neted, în vârfuri');
  assert.ok((varfuri[0]?.abatere ?? 1) < (varfuri[2]?.abatere ?? 0), 'și o abatere mai mică');
});

test('abaterea raportată e chiar distanța cea mai mare de la contur la curbe (măsurată și aici, pe eșantioane dese)', () => {
  const img = citestePng(readFileSync(new URL('../fixtures/trasare/litera-R.png', import.meta.url)));
  const r = traseaza(img, IMPLICITE);
  assert.ok(r.ok);
  const { f } = cerneala(img, IMPLICITE);
  const bucle = contururi(f, img.latime, img.inaltime, r.raport.prag / 255);
  const { puncte } = esantioane(r.cai);
  let cel = 0;
  for (const b of bucle) {
    for (let k = 0; k < b.length; k += 2) {
      let d = Infinity;
      for (let i = 0; i < puncte.length; i += 2) d = Math.min(d, Math.hypot((puncte[i] ?? 0) - (b[k] ?? 0), (puncte[i + 1] ?? 0) - (b[k + 1] ?? 0)));
      cel = Math.max(cel, d);
    }
  }
  assert.ok(Math.abs(cel - r.raport.abatere) < 0.03, `raportul spune ${r.raport.abatere.toFixed(3)}, eșantioanele ${cel.toFixed(3)}`);
});

test('o margine zgomotoasă (ca a unei poze JPEG): acele de un pixel și limbile subțiri rămân în banda treptei', () => {
  // Pete netede tăiate de prag, cu zgomot de ±5 niveluri: marginile au ace de un pixel lățime și limbi lângă marginea
  // imaginii. Înainte, latura poligonului sărea un ac întors lângă start, cubica nu ajungea în vârful unei limbi, iar mutarea
  // vârfului în încrucișare scurta acul: 1,52 / 1,56 / 1,65 px pe cele trei trepte. Acum 0,56 / 0,61 / 0,63 px. Neted
  // rotunjește, din decizie, colțurile cu brațele scurte (până la ~colt · eps = 1,26 px).
  let s = 12345;
  const r = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const img = imagine(400, 300, (x, y) => {
    const v = 128 + 60 * Math.sin(x / 17 + 2 * Math.sin(y / 23)) * Math.cos(y / 19 + 2 * Math.sin(x / 29)) + 10 * (r() - 0.5);
    return [v, v, v, 255];
  });
  const banda = { fidel: 0.7, echilibrat: 0.8, neted: 1.3 } as const;
  for (const netezime of ['fidel', 'echilibrat', 'neted'] as const) {
    const t = traseaza(img, { ...IMPLICITE, netezime, petePx: 4, gauriPx: 4 });
    assert.ok(t.ok);
    assert.ok(t.raport.abatere < banda[netezime], `${netezime}: abaterea ${t.raport.abatere.toFixed(3)} px, banda ${banda[netezime]}`);
  }
});

test('marginile: dure pe o imagine fără nuanțe, netezite pe una cu ele', () => {
  const dur = imagine(40, 40, (x, y) => (discAlb(x, y) ? [0, 0, 0, 255] : [255, 255, 255, 255]));
  assert.equal(traseaza(dur, IMPLICITE).raport.margini, 'dure');
  const img = citestePng(readFileSync(new URL('../fixtures/trasare/cerc-opac-alb.png', import.meta.url)));
  assert.equal(traseaza(img, IMPLICITE).raport.margini, 'netezite');
});

test('plafonul (lecția D6): peste 20 000 de contururi, refuzul spune câte au fost', () => {
  // Pixeli izolați, pe o tablă de șah cu pasul 2: 151 × 151 de pete, fiecare cu conturul ei.
  const img = imagine(302, 302, (x, y) => (x % 2 === 0 && y % 2 === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
  const r = traseaza(img, IMPLICITE);
  assert.equal(r.ok, false);
  assert.ok(r.raport.contururi > PLAFON_TRASARE.contururi);
  // Cu petele de 1 px șterse, rămâne nimic.
  const curat = traseaza(img, { ...IMPLICITE, petePx: 2 });
  assert.ok(curat.ok && curat.raport.contururi === 0);
});
