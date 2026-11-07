import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as v from 'valibot';
import { blocText, SchemaBlocText, type BlocText } from '../../src/model/blocText.ts';
import { documentNou, type Document, type Nod, type Piesa } from '../../src/model/document.ts';
import { transforma } from '../../src/model/transformare.ts';
import { aseazaText, type ParametriText, type SpatiuLitera } from '../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { piesaText } from '../../src/text/piesaText.ts';
import { cuGoluri, dupaEditare, goluriAtinse, pePuncte, valoareComuna } from '../../src/text/spatieri.ts';

/**
 * Spațierea literelor alese (ADR 0138 §5, felia 7.9↑b): ce goluri atinge alegerea din câmpul textului, valoarea lor comună,
 * schimbarea lor, cum trec peste o editare a textului, marginile blocului, așezarea și mânerele. Corpusul independent (Python,
 * pe hârtie) e în `proportii.json`, `pe-curba.json`, `caseta.json` și `aldin.json` (cazurile `*-spatieri*`).
 */

const RAD = new URL('../../', import.meta.url);
let roboto: Font | null = null;
function font(): Font {
  if (roboto) return roboto;
  const r = citesteFont(new Uint8Array(readFileSync(new URL('public/fonturi/roboto.ttf', RAD))));
  assert.ok(r.ok);
  if (!r.ok) throw new Error('roboto');
  roboto = r.font;
  return r.font;
}
const baza: ParametriText = { continut: 'AVATAR', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' };

test('pePuncte: poziția din câmp (unități UTF-16) devine indicele pe puncte de cod', () => {
  assert.equal(pePuncte('AVATAR', 3), 3);
  // 😀 e o pereche de surogate: după el, B e la unitatea 3, dar e al treilea caracter (indicele 2).
  assert.equal(pePuncte('A😀B', 3), 2);
  assert.equal(pePuncte('A😀B', 4), 3);
});

test('goluriAtinse: n litere alese au n − 1 goluri; cursorul, perechea lui; nimic lângă un capăt de rând', () => {
  assert.deepEqual(goluriAtinse('AVATAR', 0, 3), [0, 1]);
  assert.deepEqual(goluriAtinse('AVATAR', 0, 6), [0, 1, 2, 3, 4]);
  assert.deepEqual(goluriAtinse('AVATAR', 1, 2), []);
  assert.deepEqual(goluriAtinse('AVATAR', 2, 2), [1]);
  assert.deepEqual(goluriAtinse('AVATAR', 0, 0), []);
  assert.deepEqual(goluriAtinse('AVATAR', 6, 6), []);
  // Pe două rânduri: golurile de lângă `\n` nu se ating (B | ↵, ↵ | C).
  assert.deepEqual(goluriAtinse('AB\nCD', 0, 5), [0, 3]);
  assert.deepEqual(goluriAtinse('AB\nCD', 2, 2), []);
  assert.deepEqual(goluriAtinse('AB\nCD', 3, 3), []);
  // `\r` nu se numără (ca în așezare): C | D rămâne golul 3.
  assert.deepEqual(goluriAtinse('AB\r\nCD', 4, 4), [3]);
  // Dincolo de text (o alegere rămasă de dinaintea unei ștergeri), nimic.
  assert.deepEqual(goluriAtinse('AV', 5, 9), []);
});

test('valoareComuna: aceeași peste tot, null dacă diferă sau nu e niciun gol; un gol fără spațiu are 0', () => {
  const s: SpatiuLitera[] = [{ dupa: 0, mm: 2 }, { dupa: 1, mm: 2 }, { dupa: 3, mm: -1 }];
  assert.equal(valoareComuna(s, [0, 1]), 2);
  assert.equal(valoareComuna(s, [1, 2]), null);
  assert.equal(valoareComuna(s, [2, 4]), 0);
  assert.equal(valoareComuna(s, [3]), -1);
  assert.equal(valoareComuna(s, []), null);
});

test('cuGoluri: valoarea nouă pe golurile date, la miime de mm, în ±1 000 mm; 0 scoate golul; lista rămâne sortată', () => {
  const s: SpatiuLitera[] = [{ dupa: 1, mm: 2 }, { dupa: 4, mm: 0.5 }];
  assert.deepEqual(cuGoluri(s, [0, 1], () => 3), [{ dupa: 0, mm: 3 }, { dupa: 1, mm: 3 }, { dupa: 4, mm: 0.5 }]);
  assert.deepEqual(cuGoluri(s, [1, 2], (x) => x + 0.1), [{ dupa: 1, mm: 2.1 }, { dupa: 2, mm: 0.1 }, { dupa: 4, mm: 0.5 }]);
  assert.deepEqual(cuGoluri(s, [4], (x) => x - 0.5), [{ dupa: 1, mm: 2 }]);
  assert.deepEqual(cuGoluri(s, [1], () => 1 / 3), [{ dupa: 1, mm: 0.333 }, { dupa: 4, mm: 0.5 }]);
  assert.deepEqual(cuGoluri([], [0], () => 5000), [{ dupa: 0, mm: 1000 }]);
  assert.deepEqual(cuGoluri([], [0], () => -5000), [{ dupa: 0, mm: -1000 }]);
  // Pașii de 0,1 nu adună erori de rotunjire: de zece ori + 0,1 dă exact 1.
  let x: SpatiuLitera[] = [];
  for (let k = 0; k < 10; k++) x = cuGoluri(x, [0], (m) => m + 0.1);
  assert.deepEqual(x, [{ dupa: 0, mm: 1 }]);
});

test('dupaEditare: spațierile literelor neatinse rămân pe ele, ale celor șterse sau despărțite pleacă', () => {
  const s: SpatiuLitera[] = [{ dupa: 0, mm: 2 }, { dupa: 3, mm: -1 }];
  // Scris înainte: totul se mută cu unu.
  assert.deepEqual(dupaEditare('AVATAR', 'XAVATAR', s), [{ dupa: 1, mm: 2 }, { dupa: 4, mm: -1 }]);
  // Scris la capăt: nimic nu se mută.
  assert.deepEqual(dupaEditare('AVATAR', 'AVATARS', s), s);
  // Prima literă ștearsă: A | V pleacă, T | A se mută înapoi.
  assert.deepEqual(dupaEditare('AVATAR', 'VATAR', s), [{ dupa: 2, mm: -1 }]);
  // O literă pusă între A și V: perechea nu mai există.
  assert.deepEqual(dupaEditare('AVATAR', 'AXVATAR', s), [{ dupa: 4, mm: -1 }]);
  // Totul înlocuit: nimic.
  assert.deepEqual(dupaEditare('AVATAR', 'LEMN', s), []);
  // Pe puncte de cod: un 😀 scris în față mută cu unu, nu cu doi.
  assert.deepEqual(dupaEditare('AVATAR', '😀AVATAR', s), [{ dupa: 1, mm: 2 }, { dupa: 4, mm: -1 }]);
  // `\r` nu se numără (textul din câmp nu-l are; blocul poate): aceleași goluri.
  assert.deepEqual(dupaEditare('AV\r\nTA', 'AV\nTA', [{ dupa: 3, mm: 1 }]), [{ dupa: 3, mm: 1 }]);
});

/** Un generator de numere determinist (mulberry32), ca proba să fie aceeași la fiecare rulare. */
function aleator(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('panoul ține blocul valid: oricâte editări și schimbări ale golurilor dau spațieri pe care schema le primește', () => {
  const r = aleator(7903);
  const litere = ['A', 'V', 'T', 'a', ' ', '\n', 'ș', '😀', '中'];
  const bloc = { font: 'roboto', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', amprenta: 'x' } as const;
  let text = 'AVATAR\nTa';
  let s: SpatiuLitera[] = [];
  for (let pas = 0; pas < 3000; pas++) {
    const c = Array.from(text);
    if (r() < 0.5) {
      // O editare: o bucată din text înlocuită cu 0–3 caractere.
      const i = Math.floor(r() * (c.length + 1)), j = Math.min(c.length, i + Math.floor(r() * 3));
      const nou = Array.from({ length: Math.floor(r() * 4) }, () => litere[Math.floor(r() * litere.length)]!);
      const urm = [...c.slice(0, i), ...nou, ...c.slice(j)].join('');
      if (urm.trim() === '') continue;
      s = dupaEditare(text, urm, s);
      text = urm;
    } else {
      // O alegere și o schimbare (o valoare scrisă, un pas, zero).
      const i = Math.floor(r() * (c.length + 1)), j = i + Math.floor(r() * 4);
      const g = goluriAtinse(text, i, Math.min(j, c.length));
      const fel = r();
      s = cuGoluri(s, g, fel < 0.4 ? () => Math.round((r() * 20 - 10) * 1000) / 1000 : fel < 0.9 ? (x) => x + (r() < 0.5 ? 0.1 : -0.1) : () => 0);
    }
    const rez = v.safeParse(SchemaBlocText, { ...bloc, continut: text, ...(s.length > 0 ? { spatieri: s } : {}) });
    assert.ok(rez.success, `pasul ${pas}: ${JSON.stringify(text)} ${JSON.stringify(s)}`);
  }
});

test('blocul: spațierile sortate, unice, nenule, după un caracter care mai are unul după el, în ±1 000 mm', () => {
  const b = { continut: 'AVATAR', font: 'roboto', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga', amprenta: 'x' };
  const bun = (spatieri: unknown, continut = 'AVATAR'): boolean => v.safeParse(SchemaBlocText, { ...b, continut, spatieri }).success;
  assert.ok(bun([{ dupa: 0, mm: 2 }, { dupa: 4, mm: -1000 }]));
  assert.ok(bun([{ dupa: 4, mm: 1000 }]));
  assert.ok(!bun([{ dupa: 4, mm: 1000.5 }]));
  assert.ok(!bun([{ dupa: 1, mm: 2 }, { dupa: 0, mm: 2 }]), 'nesortate');
  assert.ok(!bun([{ dupa: 1, mm: 2 }, { dupa: 1, mm: 3 }]), 'de două ori');
  assert.ok(!bun([{ dupa: 1, mm: 0 }]), 'zero');
  assert.ok(!bun([{ dupa: 5, mm: 1 }]), 'după ultimul caracter');
  assert.ok(!bun([{ dupa: 0.5, mm: 1 }]) && !bun([{ dupa: -1, mm: 1 }]));
  // Pe puncte de cod, fără `\r`: „A😀B” are trei caractere, deci golul 1 (😀 | B) e ultimul.
  assert.ok(bun([{ dupa: 1, mm: 1 }], 'A😀B') && !bun([{ dupa: 2, mm: 1 }], 'A😀B'));
  assert.ok(!bun([{ dupa: 2, mm: 1 }], 'AB\r\n'));
});

test('așezarea: fără spațieri, bit cu bit ca înainte; cu ele, litera de după gol se mută exact cu el', () => {
  const f = font();
  for (const p of [baza, { ...baza, vertical: true as const }, { ...baza, aldin: 0.6 }, { ...baza, caseta: { fel: 'scala' as const, latime: 90, inaltime: 40 } }]) {
    assert.deepEqual(aseazaText(f, { ...p, spatieri: [] }), aseazaText(f, p));
  }
  const fara = aseazaText(f, baza), cu = aseazaText(f, { ...baza, spatieri: [{ dupa: 1, mm: 2.5 }] });
  assert.deepEqual(cu.glife.map((g, k) => g.x - fara.glife[k]!.x), [0, 0, 2.5, 2.5, 2.5, 2.5]);
  assert.equal(cu.linii[0]!.latime - fara.linii[0]!.latime, 2.5);
  // Peste rânduri, golul nu trece de `\n` (C e al patrulea caracter: AB↵C).
  const doua = aseazaText(f, { ...baza, continut: 'AB\nCD', spatieri: [{ dupa: 3, mm: 4 }] });
  const doua0 = aseazaText(f, { ...baza, continut: 'AB\nCD' });
  assert.deepEqual(doua.glife.map((g, k) => g.x - doua0.glife[k]!.x), [0, 0, 0, 4]);
});

// Mânerele, la scalarea uniformă (ADR 0138 §5): spațierile cresc cu textul, iar textul scalat e chiar textul așezat din nou.
const docCu = (p: Piesa): Document => {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return { ...d, piese: [p], foi: [{ ...d.foi[0]!, instante: [{ id: 'i1', piesa: p.id, x: 50, y: 50, rotire: 0 }] }] };
};
function numere(n: Nod, out: number[] = []): number[] {
  out.push(n.matrice.a, n.matrice.b, n.matrice.c, n.matrice.d, n.matrice.e, n.matrice.f);
  if (n.tip === 'element') {
    if (n.forma.tip === 'cale') {
      for (const q of n.forma.varfuri) {
        out.push(q.p.x, q.p.y);
        if (q.s.tip === 'C') out.push(q.s.c1.x, q.s.c1.y, q.s.c2.x, q.s.c2.y);
      }
    }
  } else for (const c of n.copii) numere(c, out);
  return out;
}

test('mânerele, scalarea uniformă: spațierile literelor alese cresc cu textul; peste 1 000 mm, textul devine vectori', () => {
  const p: ParametriText = { ...baza, spatieri: [{ dupa: 0, mm: 2 }, { dupa: 3, mm: -0.75 }] };
  const rez = piesaText(aseazaText(font(), p), { ...p, font: 'roboto' }, 'p1');
  assert.ok(rez.ok);
  if (!rez.ok) return;
  const s = transforma(docCu(rez.piesa), 0, ['i1'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } });
  assert.ok(s.ok);
  const b: BlocText | null = blocText(s.piese[0]!.radacina);
  assert.ok(b);
  assert.deepEqual(b.spatieri, [{ dupa: 0, mm: 4 }, { dupa: 3, mm: -1.5 }]);
  const din = piesaText(aseazaText(font(), { ...p, inaltime: b.inaltime, spatieri: b.spatieri }), { ...b }, 'p1');
  assert.ok(din.ok);
  if (!din.ok) return;
  // Contururile (copiii rădăcinii); matricea rădăcinii e a piesei, nu a textului.
  const copii = (r: Nod): readonly Nod[] => (r.tip === 'grup' ? r.copii : [r]);
  const a = copii(s.piese[0]!.radacina).flatMap((n) => numere(n)), c = copii(din.piesa.radacina).flatMap((n) => numere(n));
  assert.equal(a.length, c.length);
  assert.ok(a.every((x, i) => Math.abs(x - c[i]!) < 1e-9));
  // Un gol care ar trece de 1 000 mm: textul nu mai poate fi un bloc (ca spațierea), rămâne vectori.
  const mare = piesaText(aseazaText(font(), { ...p, spatieri: [{ dupa: 0, mm: 600 }] }), { ...p, spatieri: [{ dupa: 0, mm: 600 }], font: 'roboto' }, 'p1');
  assert.ok(mare.ok);
  if (!mare.ok) return;
  const s2 = transforma(docCu(mare.piesa), 0, ['i1'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } });
  assert.ok(s2.ok);
  assert.equal(Object.hasOwn(s2.piese[0]!.radacina, 'text'), false);
});
