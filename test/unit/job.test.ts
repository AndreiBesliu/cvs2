import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { programDinDocument } from '../../src/cam/job.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { documentNou, type Document, type Operatie } from '../../src/model/document.ts';
import { cuDiametru, cuOperatie, docDin, ID } from './ajutor-document.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';

const doc = (latime: number, inaltime: number): Document => docDin(
  { latime, inaltime, grosime: 18 },
  // Ordinea din document: întâi dreptunghiul. Lucrarea trebuie să taie totuși gaura (interiorul) prima.
  { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
  { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } },
);
const faraComentarii = (text: string): string[] => text.split('\n').filter((l) => l !== '' && !l.startsWith('('));
const etichete = (d: Document): string[] => {
  const job = programDinDocument(d);
  assert.ok(job.ok, job.ok ? '' : job.motiv);
  return job.ok ? job.program.miscari.flatMap((m) => (m.tip === 'eticheta' ? [m.text] : [])) : [];
};

test('exportul din document, cu implicitele, dă exact liniile de G-code ale plăcii 1 A (comentariile diferă)', () => {
  const aur = faraComentarii(readFileSync(new URL('../placi/placa-01/placa-01-A.nc', import.meta.url), 'utf8'));
  for (const [w, h] of [[140, 100], [300, 200]] as const) {
    const job = programDinDocument(doc(w, h));
    assert.ok(job.ok, job.ok ? '' : job.motiv);
    if (!job.ok) continue;
    const r = posteaza(job.program, { foaie: { latime: w, inaltime: h, grosime: 18 }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(faraComentarii(r.text), aur, `foaia ${w} × ${h}`);
  }
});

test('interioarele se taie primele, oricare ar fi ordinea din document', () => {
  assert.deepEqual(etichete(doc(300, 200)), ['e2/e2: cerc, interior, 8 mm', 'e1/e1: dreptunghi, exterior, 3 mm']);
});

test('un document gol, unul fără operații și o sculă care nu încape dau motivul, nu un program', () => {
  assert.equal(programDinDocument(documentNou({ latime: 100, inaltime: 100, grosime: 18 })).ok, false);
  const faraOp = programDinDocument({ ...doc(300, 200), piese: doc(300, 200).piese.map((p) => ({ ...p, operatii: [] })) });
  assert.match(faraOp.ok ? '' : faraOp.motiv, /nicio formă n-are o operație de tăiere/);
  const r = programDinDocument(cuDiametru(cuOperatie(doc(300, 200), 'e2', { latura: 'interior', adancime: 3, pas: 3 }), 40));
  assert.match(r.ok ? '' : r.motiv, /e2\/e2: scula nu încape/);
});

test('mai adânc decât foaia (în masa de sacrificiu) e refuzat; exact grosimea foii trece', () => {
  const d = doc(300, 200);
  const prea = programDinDocument(cuOperatie(d, 'e1', { latura: 'exterior', adancime: 30, pas: 5 }));
  assert.match(prea.ok ? '' : prea.motiv, /e1\/e1: adâncimea 30 mm trece de grosimea foii \(18 mm\)/);
  assert.ok(programDinDocument(cuOperatie(d, 'e1', { latura: 'exterior', adancime: 18, pas: 6 })).ok);
});

test('un pas absurd de mic e refuzat cu motiv, nu cu stiva depășită; o mie de treceri încă trec', () => {
  const d = doc(300, 200);
  const mic = programDinDocument(cuOperatie(d, 'e1', { latura: 'exterior', adancime: 3, pas: 0.0002 }));
  assert.match(mic.ok ? '' : mic.motiv, /e1\/e1: 15000 treceri/);
  assert.ok(programDinDocument(cuOperatie(d, 'e1', { latura: 'exterior', adancime: 10, pas: 0.01 })).ok);
});

test('parametrii vin din operațiile documentului: latura, adâncimea, pasul și freza de acolo (ADR 0025)', () => {
  const d = cuDiametru(cuOperatie(doc(300, 200), 'e2', { latura: 'pe-linie', adancime: 5, pas: 2.5 }), 3.175);
  assert.deepEqual(etichete(d), ['e2/e2: cerc, pe-linie, 5 mm', 'e1/e1: dreptunghi, exterior, 3 mm']);
  const job = programDinDocument(d);
  assert.ok(job.ok);
  if (job.ok) assert.deepEqual(job.program.scula, { numar: 1, nume: 'freza plata', diametru: 3.175 });
});

test('două scule (ADR 0084): fiecare tăietură cu diametrul ei, o schimbare între ele, cu turația regimului; doar numele diferit = aceeași sculă', () => {
  const T2 = { numar: 2, nume: 'freza plata', diametru: 3 };
  const d = cuOperatie(doc(300, 200), 'e1', { scula: T2 });
  const job = programDinDocument(d);
  assert.ok(job.ok, job.ok ? '' : job.motiv);
  if (!job.ok) return;
  assert.deepEqual(job.program.scula, { numar: 1, nume: 'freza plata', diametru: 6 }, 'scula de antet e a primei tăieturi (gaura, T1)');
  const m = job.program.miscari;
  const k = m.findIndex((x) => x.tip === 'schimba-scula');
  assert.deepEqual(m[k], { tip: 'schimba-scula', scula: T2, turatie: 18000 });
  assert.equal(m.filter((x) => x.tip === 'schimba-scula').length, 1);
  assert.equal((m[k + 1] as { text?: string }).text, 'e1/e1: dreptunghi, exterior, 3 mm');
  // Exteriorul dreptunghiului 20…120 × 20…80, cu raza 1,5 (nu 3): traseul la X 18,5 … 121,5.
  const xs = m.slice(k).flatMap((x) => (x.tip === 'taiere' || x.tip === 'arc') && x.la.X !== undefined ? [x.la.X] : []);
  assert.ok(Math.abs(Math.min(...xs) - 18.5) < 1e-9 && Math.abs(Math.max(...xs) - 121.5) < 1e-9, `${Math.min(...xs)} … ${Math.max(...xs)}`);
  // Doar numele diferă: aceeași sculă pentru mașină, nicio schimbare.
  const nume = programDinDocument(cuOperatie(doc(300, 200), 'e1', { scula: { numar: 1, nume: 'alt nume', diametru: 6 } }));
  assert.ok(nume.ok && !nume.program.miscari.some((x) => x.tip === 'schimba-scula'));
});

test('degajările și buzunarul se socotesc cu freza tăieturii lor, nu cu a primei (ADR 0084)', () => {
  const T1 = { numar: 1, nume: 'freza plata', diametru: 6 }, T2 = { numar: 2, nume: 'freza plata', diametru: 3 };
  // Gaura e2 (T1 Ø6) întâi în document, apoi dreptunghiul e1 cu dog-bone (T2 Ø3). Bucla găurii stă la ~5,7 mm de drumul
  // degajării din colțul (100, 100): peste pragul lui T2 (3 + 1), sub al lui T1 (6 + 1).
  const gaura = { id: 'e2', forma: { tip: 'cerc' as const, raza: 5 }, matrice: { ...ID, e: 95, f: 95 } };
  const drept = { id: 'e1', forma: { tip: 'dreptunghi' as const, latime: 40, inaltime: 30, razaColt: 0 }, matrice: { ...ID, e: 100, f: 100 } };
  const stoc = { latime: 300, inaltime: 200, grosime: 18 };
  const cuDrept = (d: Document): Document => cuOperatie(d, 'e1', { scula: T2, latura: 'interior', adancime: 3, pas: 3, colturi: { tip: 'dog-bone' } });
  const ambele = programDinDocument(cuOperatie(cuDrept(docDin(stoc, gaura, drept)), 'e2', { scula: T1, latura: 'interior', adancime: 3, pas: 3 }));
  const singur = programDinDocument(cuDrept(docDin(stoc, drept)));
  assert.ok(ambele.ok && singur.ok, ambele.ok ? (singur.ok ? '' : singur.motiv) : ambele.motiv);
  if (!ambele.ok || !singur.ok) return;
  assert.deepEqual(ambele.avertismente, []);
  const aleLui = (m: readonly Miscare[]) => {
    const i = m.findIndex((x) => x.tip === 'eticheta' && x.text.startsWith('e1/e1'));
    return m.slice(i);
  };
  assert.deepEqual(aleLui(ambele.program.miscari), aleLui(singur.program.miscari), 'aceleași mișcări ca singur, cu T2');
  // Un buzunar pe altă freză: schimbarea vine înaintea lui.
  const buz = programDinDocument(cuOperatie(cuOperatie(docDin(stoc, gaura, { ...drept, id: 'e1' }), 'e2', { scula: T1, latura: 'interior', adancime: 3, pas: 3 }),
    'e1', { scula: T2, tip: 'buzunar', latura: 'interior', adancime: 3, pas: 3, pasLateral: 1.2 } as Partial<Operatie>));
  assert.ok(buz.ok, buz.ok ? '' : buz.motiv);
  if (!buz.ok) return;
  const k = buz.program.miscari.findIndex((x) => x.tip === 'eticheta' && x.text.includes('buzunar'));
  assert.deepEqual(buz.program.miscari[k - 1], { tip: 'schimba-scula', scula: T2, turatie: 18000 });
});

test('același număr cu două diametre e refuzat cu motiv (omul ar monta o singură freză sub T1)', () => {
  const r = programDinDocument(cuOperatie(doc(300, 200), 'e1', { scula: { numar: 1, nume: 'freza plata', diametru: 8 } }));
  assert.deepEqual(r, { ok: false, motiv: 'e1/e1: T1 are două diametre (6 și 8 mm): fiecare freză cere numărul ei' });
});

test('același număr cu două forme e refuzat la fel (ADR 0090): plată și în V, sau două unghiuri; schimbarea vine doar după număr', () => {
  const V = (unghi: number) => ({ numar: 1, nume: `freza V${unghi}`, diametru: 6, forma: { tip: 'v' as const, unghi } });
  assert.deepEqual(programDinDocument(cuOperatie(doc(300, 200), 'e1', { scula: V(90) })),
    { ok: false, motiv: 'e1/e1: T1 are două freze de Ø6 (plată și în V de 90°): fiecare freză cere numărul ei' });
  assert.deepEqual(programDinDocument(cuOperatie(cuOperatie(doc(300, 200), 'e1', { scula: V(90) }), 'e2', { scula: V(60) })),
    { ok: false, motiv: 'e1/e1: T1 are două freze de Ø6 (în V de 60° și în V de 90°): fiecare freză cere numărul ei' });
  // Controlul: aceeași freză V pe ambele trece de verificare.
  const aceeasi = programDinDocument(cuOperatie(cuOperatie(doc(300, 200), 'e1', { scula: V(90) }), 'e2', { scula: V(90) }));
  assert.ok(aceeasi.ok || !/două freze|două diametre/.test(aceeasi.motiv), aceeasi.ok ? '' : aceeasi.motiv);
});

test('în aceeași clasă, tăieturile se grupează pe sculă; o clasă nouă începe cu scula deja montată (cât mai puține schimbări)', () => {
  const T = (numar: number, diametru = 3) => ({ numar, nume: 'freza plata', diametru });
  const cerc = (id: string, x: number) => ({ id, forma: { tip: 'cerc' as const, raza: 6 }, matrice: { ...ID, e: x, f: 100 } });
  const baza = docDin({ latime: 300, inaltime: 200, grosime: 18 }, cerc('a', 40), cerc('b', 80), cerc('c', 120), cerc('d', 160), cerc('e', 200));
  const cu = (d: Document, id: string, o: Partial<Operatie>): Document => cuOperatie(d, id, o);
  // Interioarele: a T1, b T2, c T1 → a, c (T1), apoi b (T2). Pe linie: d T1, e T2 → e întâi (T2 e montată), apoi d.
  let d = cu(cu(cu(baza, 'a', { scula: T(1), latura: 'interior' }), 'b', { scula: T(2), latura: 'interior' }), 'c', { scula: T(1), latura: 'interior' });
  d = cu(cu(d, 'd', { scula: T(1), latura: 'pe-linie' }), 'e', { scula: T(2), latura: 'pe-linie' });
  const job = programDinDocument(d);
  assert.ok(job.ok, job.ok ? '' : job.motiv);
  if (!job.ok) return;
  const ordine = job.program.miscari.flatMap((m) => (m.tip === 'eticheta' ? [m.text.split(':')[0]] : m.tip === 'schimba-scula' ? [`T${m.scula.numar}`] : []));
  assert.deepEqual(ordine, ['a/a', 'c/c', 'T2', 'b/b', 'e/e', 'T1', 'd/d']);
});

test('ordinea tăieturilor: latura, apoi instanța, apoi operația, apoi nodul din operație; elementul fără operație nu se taie', () => {
  const M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const op = (id: string, noduri: string[], latura: Operatie['latura']): Operatie =>
    ({ id, tip: 'profil', noduri, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura, sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null });
  const baza = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const d: Document = {
    ...baza,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: M, copii: [
          { tip: 'element', id: 'a', forma: { tip: 'cerc', raza: 5 }, matrice: { ...M, e: 20, f: 20 } },
          { tip: 'element', id: 'b', forma: { tip: 'cerc', raza: 5 }, matrice: { ...M, e: 40, f: 20 } },
          { tip: 'element', id: 'c', forma: { tip: 'dreptunghi', latime: 60, inaltime: 30, razaColt: 0 }, matrice: { ...M, e: 10, f: 5 } },
          { tip: 'element', id: 'fara', forma: { tip: 'cerc', raza: 2 }, matrice: { ...M, e: 60, f: 40 } },
        ],
      },
      // Operațiile în altă ordine decât arborele: exteriorul întâi, iar nodurile operației interioare inversate.
      operatii: [op('o-ext', ['c'], 'exterior'), op('o-int', ['b', 'a'], 'interior'), op('o-lin', ['c'], 'pe-linie')],
    }],
    foi: [{ ...baza.foi[0]!, instante: [{ id: 'i2', piesa: 'p', x: 150, y: 100, rotire: 0 }, { id: 'i1', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
  assert.deepEqual(etichete(d).map((t) => t.split(':')[0] + ' ' + (t.split(', ')[1] ?? '')), [
    'i2/b interior', 'i2/a interior', 'i1/b interior', 'i1/a interior',
    'i2/c pe-linie', 'i1/c pe-linie',
    'i2/c exterior', 'i1/c exterior',
  ]);
  assert.ok(!etichete(d).some((t) => t.includes('/fara')), 'elementul fără operație nu apare');
});

test('un element oglindit (determinant −1) se taie pe aceeași latură și în același sens ca cel neoglindit', () => {
  // Același dreptunghi și același cerc în lume: o dată cu matricea identitate, o dată oglindite pe X în piesă (x' = 100 − x
  // pentru dreptunghi, x' = −x pentru cercul centrat în instanță). Offsetul nu are voie să schimbe latura după sensul conturului.
  const drept = docDin({ latime: 300, inaltime: 200, grosime: 18 },
    { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 4 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } });
  const oglindit: Document = {
    ...drept,
    piese: drept.piese.map((p) => ({
      ...p,
      radacina: p.radacina.tip === 'element'
        ? { ...p.radacina, matrice: { ...p.radacina.matrice, a: -1, e: p.radacina.forma.tip === 'dreptunghi' ? 100 : 0 } }
        : p.radacina,
    })),
  };
  // Oglindirea chiar e acolo: determinantul în lume e −1 pentru ambele elemente.
  assert.deepEqual(elementeFoaie(oglindit).map((e) => e.matrice.a * e.matrice.d - e.matrice.b * e.matrice.c), [-1, -1]);
  const amprenta = (d: Document) => {
    const job = programDinDocument(d);
    assert.ok(job.ok, job.ok ? '' : job.motiv);
    if (!job.ok) return null;
    const jos = job.program.miscari.flatMap((m) => ((m.tip === 'taiere' || m.tip === 'arc') && (m.la.Z ?? -1) < 0 ? [m] : []));
    const xs = jos.flatMap((m) => (m.la.X === undefined ? [] : [m.la.X]));
    const ys = jos.flatMap((m) => (m.la.Y === undefined ? [] : [m.la.Y]));
    const r = (v: number): number => Math.round(v * 1e6) / 1e6;
    return {
      cadru: [r(Math.min(...xs)), r(Math.max(...xs)), r(Math.min(...ys)), r(Math.max(...ys))],
      sensuri: [...new Set(job.program.miscari.flatMap((m) => (m.tip === 'arc' ? [m.sens] : [])))].sort(),
    };
  };
  const a = amprenta(drept);
  const b = amprenta(oglindit);
  // Pe hârtie: exteriorul dreptunghiului 20…120 × 20…80 cu freza R3 merge pe 17…123 × 17…83.
  assert.deepEqual(a?.cadru, [17, 123, 17, 83]);
  assert.deepEqual(b, a);
});

test('urechile (ADR 0028): vârful de la fața de jos, puntea de grosimea cerută, și cu supracursă', () => {
  // Placa 2: MDF 12, piesa 120 × 80 cu colțurile R10, tăiată prin, în treceri de 4; urechi 4 × 8, puntea de 2.
  const d0 = docDin({ latime: 300, inaltime: 200, grosime: 12 },
    { id: 'p', forma: { tip: 'dreptunghi', latime: 120, inaltime: 80, razaColt: 10 }, matrice: { ...ID, e: 50, f: 50 } });
  const cu = (adancime: number, urechi: Operatie['urechi']): Document => cuOperatie(d0, 'p', { adancime, pas: 4, urechi });
  const cote = (d: Document, supracursa = 0): number[] => {
    const job = programDinDocument(d, undefined, supracursa);
    assert.ok(job.ok, job.ok ? '' : job.motiv);
    if (!job.ok) return [];
    return [...new Set(job.program.miscari.flatMap((m) => (m.tip !== 'rapida' && m.tip !== 'eticheta' && 'la' in m && m.la.Z !== undefined ? [m.la.Z] : [])))];
  };
  // Fără urechi: doar −4, −8, −12.
  assert.deepEqual(cote(cu(12, null)).sort((a, b) => b - a), [-4, -8, -12]);
  // Cu urechi: și palierul la −10 (12 − 2), iar flancurile între −10 și −12; nimic între −8 și −10.
  const z = cote(cu(12, { numar: 4, latime: 8, grosime: 2 }));
  assert.ok(z.includes(-10) && z.includes(-12) && z.includes(-4) && z.includes(-8));
  assert.ok(z.every((x) => x === -4 || x === -8 || (x <= -10 && x >= -12)), `cote neașteptate: ${z.join(', ')}`);
  // Cu supracursă de 0,3: palierul rămâne la −10, deci puntea tot 2 (ediția întâi o subția la 1,7).
  const zs = cote(cu(12.3, { numar: 4, latime: 8, grosime: 2 }), 0.3);
  // 12,3 în treceri de cel mult 4: patru de 3,075; doar ultima trece de vârful urechii.
  assert.ok(zs.includes(-10) && zs.includes(-12.3), zs.join(', '));
  assert.ok(zs.every((x) => [-3.075, -6.15, -9.225000000000001].includes(x) || (x <= -10 && x >= -12.3)), zs.join(', '));
  // Fără supracursă, aceeași adâncime e refuzată.
  const peste = programDinDocument(cu(12.3, null));
  assert.match(peste.ok ? '' : peste.motiv, /adâncimea 12.3 mm trece de grosimea foii \(12 mm\)/);
  const preaMult = programDinDocument(cu(12.3, null), undefined, 0.2);
  assert.match(preaMult.ok ? '' : preaMult.motiv, /plus supracursa \(0.2 mm\)/);
  for (const s of [-0.1, 2.1, Number.NaN]) {
    const r = programDinDocument(d0, undefined, s);
    assert.match(r.ok ? '' : r.motiv, /supracursa trebuie să fie între 0 și 2 mm/, String(s));
  }
});

test('urechile refuzate cu motiv: puntea cât foaia, tăietura care nu ajunge la vârf, urechile care nu încap', () => {
  const d0 = docDin({ latime: 300, inaltime: 200, grosime: 12 },
    { id: 'p', forma: { tip: 'dreptunghi', latime: 120, inaltime: 80, razaColt: 10 }, matrice: { ...ID, e: 50, f: 50 } });
  const motiv = (v: Partial<Operatie>): string => {
    const r = programDinDocument(cuOperatie(d0, 'p', { adancime: 12, pas: 4, ...v }));
    return r.ok ? '' : r.motiv;
  };
  assert.match(motiv({ urechi: { numar: 4, latime: 8, grosime: 12 } }), /p\/p: urechile de 12 mm nu încap în foaia de 12 mm/);
  assert.match(motiv({ urechi: { numar: 4, latime: 8, grosime: 13 } }), /nu încap în foaia/);
  assert.match(motiv({ adancime: 10, urechi: { numar: 4, latime: 8, grosime: 2 } }), /tăietura de 10 mm nu ajunge la vârful urechilor \(la 10 mm de fața de sus\)/);
  assert.equal(motiv({ adancime: 10.5, urechi: { numar: 4, latime: 8, grosime: 2 } }), '', 'puțin sub vârf: urechile există');
  // Perimetrul traseului: 2·100 + 2·60 + 2π·13 ≈ 401,68; S ≈ 100,42 cu 4 urechi, deci cel mult 90,38.
  assert.match(motiv({ urechi: { numar: 4, latime: 91, grosime: 2 } }), /p\/p: urechile nu încap: 4 urechi de 91 mm/);
  assert.equal(motiv({ urechi: { numar: 4, latime: 90, grosime: 2 } }), '');
});

test('o operație fără urechi dă același program ca în v4: placa 1 neschimbată (amprentele, în placa01)', () => {
  const d = doc(300, 200);
  assert.ok(d.piese.every((p) => p.operatii.every((o) => o.urechi === null)));
  const job = programDinDocument(d);
  assert.ok(job.ok);
  if (job.ok) assert.ok(job.program.miscari.every((m) => m.tip !== 'arc' || m.la.Z === undefined), 'nicio elice');
});

test('urechile mai scurte decât diametrul frezei sunt refuzate: pe axa tăieturii puntea ar fi mai subțire (recenzia 2.4)', () => {
  const d0 = docDin({ latime: 300, inaltime: 200, grosime: 12 },
    { id: 'p', forma: { tip: 'dreptunghi', latime: 120, inaltime: 80, razaColt: 10 }, matrice: { ...ID, e: 50, f: 50 } });
  const motiv = (latime: number, diametru: number): string => {
    const r = programDinDocument(cuDiametru(cuOperatie(d0, 'p', { adancime: 12, pas: 4, urechi: { numar: 4, latime, grosime: 2 } }), diametru));
    return r.ok ? '' : r.motiv;
  };
  assert.match(motiv(3, 6), /p\/p: urechile de 3 mm sunt mai scurte decât diametrul frezei \(Ø6\), deci puntea de peste tăietură ar fi mai subțire de 2 mm/);
  assert.match(motiv(5.99, 6), /mai scurte decât diametrul frezei/);
  assert.match(motiv(8, 10), /mai scurte decât diametrul frezei \(Ø10\)/);
  assert.equal(motiv(6, 6), '', 'W = D trece: pe axă, puntea atinge grosimea într-un punct');
  assert.equal(motiv(8, 6), '');
  assert.equal(motiv(8, 3.175), '');
});
