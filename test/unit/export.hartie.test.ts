/**
 * Fereastra exportului „pe hârtie” (ADR 0291, felia 28.8↑h): ce desenează și ce numără fișa vine din funcțiile lucrării, deci
 * spune ce taie programul. Probele:
 * - adâncimea tăiată a fiecărei operații e cea din documentul pe care îl taie lucrarea (`cuGauriPrinFoaie`, apoi, cu bifa,
 *   `cuTaieturiPrinFoaie`), pe corpusul CAM și pe foaia cu toate felurile (cât foaia, sub ea, peste ea, V-carve, incrustații);
 * - cazul din audit (constatarea 1), până la G-code: 18 mm cu pasul 6, supracursa 0,3 și bifa: 4 treceri de 4,575, ca programul;
 * - felul găuririi e cel al lui `traseuGaurire` pe o grilă de cercuri și freze, iar pașii ciocănirii sunt mișcările lui pe Z;
 *   cercul de Ø30 cu freza Ø6 (constatarea 2) e „mare”, ca refuzul exportului.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hartieRand } from '../../src/app/hartieExport.ts';
import { traseuGaurire } from '../../src/cam/gaurire.ts';
import { adancimeScrisa, adancimeTaiata, cuTaieturiPrinFoaie } from '../../src/cam/prinFoaie.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { cuGauriPrinFoaie } from '../../src/model/incrustatie.ts';
import type { Document } from '../../src/model/document.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import type { IntrareHartie } from '../../src/ui/exportRand.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';
import { zuriProgram } from './ajutor-incrustatie.ts';

type Rec = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const F6 = { numar: 1, nume: 'freza 6', diametru: 6 };
const V60 = { numar: 2, nume: 'freza V60', diametru: 12, forma: { tip: 'v', unghi: 60 } };
const DR = (latime: number, inaltime: number): Rec => ({ tip: 'dreptunghi', latime, inaltime, razaColt: 0 });
const CERC = (raza: number): Rec => ({ tip: 'cerc', raza });
const piesa = (id: string, forma: Rec, x: number, y: number, extra: Rec): Rec => ({
  id,
  radacina: { tip: 'element', id: `${id}-a`, matrice: { ...I, e: x, f: y }, forma },
  operatii: [{
    id: 'o', tip: 'profil', noduri: [`${id}-a`], scula: F6, latura: 'exterior', sens: 'urcare', adancime: 6, pas: 2,
    urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
  }],
});
const document = (grosime: number, piese: readonly Rec[]): Document => {
  const d = incarca({
    schema: 28, rev: 0, piese,
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime }, instante: piese.map((p) => ({ id: `i-${String(p['id'])}`, piesa: p['id'], x: 0, y: 0, rotire: 0 })) }],
  });
  if (!d.ok) assert.fail(d.motiv);
  return d.doc;
};

/** Foaia de 6 cu toate felurile: cât foaia (profil, buzunar, găurire), sub ea, peste ea, V-carve, incrustație, gaură. */
const TOATE = document(6, [
  piesa('profil', DR(40, 30), 20, 20, { urechi: { numar: 4, latime: 8, grosime: 1.5 } }),
  piesa('buzunar', CERC(10), 100, 35, { tip: 'buzunar', latura: 'interior', pasLateral: 2.4 }),
  piesa('gauri', CERC(5), 150, 35, { tip: 'gaurire', latura: 'interior', retragereCompleta: 1 }),
  piesa('mic', DR(20, 20), 20, 90, { adancime: 3, pas: 3 }),
  piesa('voie', DR(20, 15), 20, 120, { adancime: 6.3 }),
  piesa('v', DR(30, 20), 70, 90, { tip: 'vcarve', latura: 'interior', scula: V60 }),
  piesa('inc', DR(30, 20), 130, 90, {
    tip: 'buzunar', latura: 'interior', pasLateral: 2.4,
    incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 8 },
  }),
  piesa('gaura', DR(20, 20), 170, 110, {
    tip: 'buzunar', latura: 'interior', pasLateral: 2.4, adancime: 3,
    incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 8, locas: 'gaura' },
  }),
]);

test('adâncimea tăiată a fiecărei operații e cea din documentul tăiat de lucrare, pe corpus și pe foaia cu toate felurile', () => {
  let n = 0, schimbate = 0;
  for (const doc of [TOATE, ...CORPUS_CAM.map((c) => c.doc)]) {
    const grosime = doc.foi[0]?.stoc.grosime ?? 0;
    for (const s of [0, 0.5, 2]) {
      for (const prin of [false, true]) {
        let taiat = cuGauriPrinFoaie(doc, s);
        if (prin) taiat = cuTaieturiPrinFoaie(taiat, s);
        for (const [i, p] of doc.piese.entries()) {
          for (const [j, o] of p.operatii.entries()) {
            const asteptat = taiat.piese[i]?.operatii[j]?.adancime;
            assert.equal(adancimeTaiata(adancimeScrisa(o), grosime, s, prin), asteptat, `${p.id}/${o.id}, supracursa ${s}, bifa ${prin}`);
            n++;
            if (asteptat !== o.adancime) schimbate++;
          }
        }
      }
    }
  }
  // Martorul: proba vede și operații pe care lucrarea le duce prin foaie (altfel ar trece și o regulă care nu schimbă nimic).
  assert.ok(n > 100 && schimbate >= 20, `${n} operații, ${schimbate} schimbate`);
});

/**
 * Foaia de 18 cu un profil și o finisare a reliefului (ADR 0312), amândouă cât foaia. Dalele nu contează aici: regula privește
 * doar operațiile, deci amprenta e una oarecare, cu forma cerută de ușă.
 */
const CU_FINISARE = ((): Document => {
  const d = incarca({
    schema: 30, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...I },
        copii: [
          { tip: 'element', id: 'e', forma: DR(30, 30), matrice: { ...I, e: -5, f: -5 } },
          { tip: 'element', id: 'r', forma: { tip: 'relief', nx: 40, ny: 40, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: 'a'.repeat(64) }] }, matrice: { ...I } },
        ],
      },
      operatii: [
        { id: 'o', tip: 'profil', noduri: ['e'], scula: F6, latura: 'exterior', sens: 'urcare', adancime: 18, pas: 6, urechi: null, rampa: null, intrari: null, colturi: null },
        {
          id: 'f', tip: 'finisare', noduri: ['r'], scula: { numar: 2, nume: 'freza bila', diametru: 4, forma: { tip: 'bila' } }, latura: 'pe-linie', sens: 'urcare',
          adancime: 18, pas: 2.5, pasLateral: 0.5, finisare: { unghi: 0 }, urechi: null, rampa: null, intrari: null, colturi: null,
        },
        {
          id: 'd', tip: 'degrosare', noduri: ['r'], scula: { numar: 3, nume: 'freza plata', diametru: 6 }, latura: 'pe-linie', sens: 'urcare',
          adancime: 18, pas: 3, pasLateral: 2.4, degrosare: { adaos: 0.5, unghi: 0 }, urechi: null, rampa: null, intrari: null, colturi: null,
        },
      ],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 40, y: 40, rotire: 0 }] }],
  });
  if (!d.ok) assert.fail(d.motiv);
  return d.doc;
})();

test('cu 18.1↑c și 18.1↑d: o finisare și o degroșare cât foaia nu primesc supracursa, nici în lucrare, nici pe hârtie; profilul cât foaia o primește', () => {
  const [profil, finisare, degrosare] = CU_FINISARE.piese[0]?.operatii ?? [];
  assert.ok(profil?.tip === 'profil' && finisare?.tip === 'finisare' && degrosare?.tip === 'degrosare');
  for (const s of [0.3, 0.5, 2]) {
    const [p, f, d] = cuTaieturiPrinFoaie(CU_FINISARE, s).piese[0]?.operatii ?? [];
    assert.equal(p?.adancime, 18 + s, `lucrarea, profilul, supracursa ${s}`);
    assert.equal(f?.adancime, 18, `lucrarea, finisarea, supracursa ${s}`);
    assert.equal(d?.adancime, 18, `lucrarea, degroșarea, supracursa ${s}`);
    assert.equal(adancimeTaiata(adancimeScrisa(profil), 18, s, true), 18 + s, `hârtia, profilul, supracursa ${s}`);
    assert.equal(adancimeTaiata(adancimeScrisa(finisare), 18, s, true), 18, `hârtia, finisarea, supracursa ${s}`);
    assert.equal(adancimeTaiata(adancimeScrisa(degrosare), 18, s, true), 18, `hârtia, degroșarea, supracursa ${s}`);
    // Fără bifă, toate cum sunt scrise.
    assert.equal(adancimeTaiata(adancimeScrisa(profil), 18, s, false), 18);
    assert.equal(adancimeTaiata(adancimeScrisa(finisare), 18, s, false), 18);
    assert.equal(adancimeTaiata(adancimeScrisa(degrosare), 18, s, false), 18);
  }
});

const intrare = (x: Partial<IntrareHartie>): IntrareHartie => ({
  tip: 'profil', adancime: 18, incrustatie: 'fara', pas: 6, grosime: 18, supracursa: 0, prinFoaie: false, diametruScula: 6, retragere: 1,
  diametre: [], ...x,
});

test('constatarea 1: 18 mm cu pasul 6, supracursa 0,3 și bifa: 4 treceri de 4,575, ca programul; fără bifă, 3 de 6', async () => {
  const doc = document(18, [piesa('d', DR(100, 60), 20, 20, { adancime: 18, pas: 6 })]);
  for (const prin of [true, false]) {
    const h = hartieRand(intrare({ supracursa: 0.3, prinFoaie: prin }));
    const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus', supracursa: 0.3, prinFoaie: prin });
    if (!r.ok) assert.fail(r.motiv);
    const z = [...zuriProgram(r.program.text)].filter((x) => x < 0).sort((a, b) => b - a);
    assert.deepEqual(h.treceri?.map((x) => -Math.round(x * 1000) / 1000), z, `bifa ${prin}`);
    assert.equal(h.adancime, prin ? 18.3 : 18);
  }
  assert.deepEqual(hartieRand(intrare({ supracursa: 0.3, prinFoaie: true })).treceri?.map((x) => Math.round(x * 1e9) / 1e9), [4.575, 9.15, 13.725, 18.3]);
  // Gaura incrustației: grosimea foii plus supracursa, cu bifa sau fără, oricare ar fi adâncimea scrisă (ca `cuGauriPrinFoaie`).
  for (const prin of [true, false]) assert.equal(hartieRand(intrare({ incrustatie: 'gaura', adancime: null, grosime: 6, supracursa: 0.5, prinFoaie: prin })).adancime, 6.5);
  // V-carve-ul și incrustațiile cât foaia rămân cum sunt scrise; fără valori bune, nimic.
  assert.equal(hartieRand(intrare({ tip: 'vcarve', supracursa: 0.3, prinFoaie: true })).adancime, 18);
  assert.equal(hartieRand(intrare({ incrustatie: 'alta', supracursa: 0.3, prinFoaie: true })).adancime, 18);
  assert.equal(hartieRand(intrare({ pas: 0 })).treceri, null);
  // Pe hârtie: 19,05 cu pasul 1,5875 (¾ țol în pași de 1/16) = 12 treceri: împărțirea iese 12,000000000000002, iar rotunjirea
  // ei nu adaugă a treisprezecea.
  assert.equal(hartieRand(intrare({ adancime: 19.05, pas: 1.5875, grosime: 19.05 })).treceri?.length, 12);
  assert.equal(hartieRand(intrare({ adancime: null })).adancime, null);
});

test('felul găuririi e cel al lui traseuGaurire, pe o grilă de cercuri și freze; pașii ciocănirii sunt mișcările lui pe Z', () => {
  const P = { centru: { x: 0, y: 0 }, adancime: 10, pas: 3, retragereCompleta: 2, trigonometric: true, avans: 1000, avansPlonjare: 300, zSigur: 5 };
  const feluri = new Set<string>();
  for (const D of [3, 6, 6.35, 16]) {
    for (const Dc of [2.9, D - 0.03, D - 0.02, D - 0.01, D, D + 0.01, D + 0.02, D + 0.03, 1.5 * D, 2 * D, 2 * D + 0.001, 30]) {
      const h = hartieRand(intrare({ tip: 'gaurire', adancime: 10, pas: 3, retragere: 2, diametruScula: D, diametre: [Dc] }));
      const fel = h.gaurire?.cercuri[0]?.fel;
      const g = traseuGaurire({ ...P, diametru: Dc, diametruScula: D });
      feluri.add(String(fel));
      if (g.ok) {
        assert.equal(fel, g.fel, `Ø${Dc} cu Ø${D}`);
        if (g.fel === 'ciocanire') {
          // Mișcările pe Z dintre coborârea la centru și ieșirea de la capăt, ca pașii ciocănirii.
          const z = g.miscari.slice(2, -1).map((m) => {
            if (m.tip !== 'taiere' && m.tip !== 'rapida') assert.fail(`mișcare neașteptată: ${m.tip}`);
            return m.tip === 'taiere' ? { z: m.la.Z, taie: true } : { z: m.la.Z === 5 ? 'sus' : m.la.Z, taie: false };
          });
          assert.deepEqual(h.gaurire?.ciocanire, z);
        }
      } else {
        assert.equal(fel, /mai mic/.test(g.motiv) ? 'mic' : 'mare', `Ø${Dc} cu Ø${D}: ${g.motiv}`);
      }
    }
  }
  assert.deepEqual([...feluri].sort(), ['ciocanire', 'elice', 'mare', 'mic']);
});

test('constatarea 2: cercul R15 cu Ø16 e elice (fără pașii ciocănirii), cu Ø6 e „mare”, ca refuzul exportului', async () => {
  const elice = hartieRand(intrare({ tip: 'gaurire', adancime: 8, pas: 4, diametruScula: 16, diametre: [30] }));
  assert.deepEqual(elice.gaurire?.cercuri, [{ diametru: 30, fel: 'elice' }]);
  assert.equal(elice.gaurire?.ciocanire, null);
  assert.deepEqual(elice.treceri, [4, 8]);
  const mare = hartieRand(intrare({ tip: 'gaurire', adancime: 8, pas: 4, diametruScula: 6, diametre: [30] }));
  assert.deepEqual(mare.gaurire?.cercuri, [{ diametru: 30, fel: 'mare' }]);
  const doc = document(18, [piesa('c', CERC(15), 50, 50, { tip: 'gaurire', latura: 'interior', adancime: 8, pas: 4, retragereCompleta: 1 })]);
  const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(!r.ok && /trece de două diametre/.test(r.motiv), r.ok ? 'exportul a trecut' : r.motiv);
  // Cercuri amestecate: ciocănirea pe cel cât freza, elicea pe cel mai mare; pașii ciocănirii, pe trecerile găuririi.
  const amestec = hartieRand(intrare({ tip: 'gaurire', adancime: 8, pas: 4, retragere: 1, diametruScula: 6, diametre: [6, 10] }));
  assert.deepEqual(amestec.gaurire?.cercuri.map((c) => c.fel), ['ciocanire', 'elice']);
  assert.equal(amestec.gaurire?.ciocanire?.filter((p) => p.taie).length, 2);
  assert.equal(amestec.gaurire?.ridicare, 1);
});
