/**
 * Urechile „unde ține” (ADR 0211, varianta b; felia 11.3↑e), pe hârtie, întâi pe placa 11: 25 de plăcuțe 80 × 30, rama tăiată
 * pe dinafară cu Ø3,175, cu două urechi de 6 × 2, pe foi de 300 × 220, din stânga-sus, marginea 10.
 *
 * - **La 5 mm** (rândurile la y = 180 / 145 / 110 / 75 / 40, coloanele la x = 10 / 95 / 180), tăieturile vecine se unesc
 *   (5 < 2 × 3,175), deci lângă o vecină nu rămâne lemn. Cad doar plăcuțele fără nicio latură spre lemn, cele înconjurate pe
 *   toate patru laturile: pe foaia 1 (cinci rânduri pline), mijlocul rândurilor 2–4 (numele 5, 8 și 11 din CSV); pe foaia 2
 *   (trei rânduri pline și una la x = 10, y = 75), doar mijlocul rândului 2 (numele 20): sub mijlocul rândului 3 e lemn. Cu
 *   urechile la distanțe egale cădeau 9 + 4.
 * - **La 10 mm** (distanța plăcii), între tăieturi rămân 3,65 mm de lemn, legat de margine; palierul dus cât freza
 *   (1,5875 + 3,175 = 4,76 mm de la plăcuță) cade în el. Toate locurile de la distanțe egale sunt bune, deci programele sunt
 *   chiar cele ale plăcii, octet cu octet.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { cereMesaje } from '../../src/i18n/laCerere.ts';
import { exportInBazin } from '../../src/jobs/bazinCam.ts';
import { calculeazaPotrivirea, calculeazaSimularea, programFoii } from '../../src/jobs/calculCam.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { alegeIndici, centreBune, FUND_LEGAT, FUND_TAIAT, urechiLemnBucla, type FundLemn } from '../../src/cam/urechiLemn.ts';
import { LEGAT, TAIAT } from '../../src/sim/desprinse.ts';
import type { Document } from '../../src/model/document.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { LINIE, type Contur } from '../../src/geom/contur.ts';
import { calculeazaExport, operatiiDesprinse } from '../../src/ui/actiuniExportCalcul.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { CAZURI_INCRUSTATIE } from '../oracles/incrustatie.cazuri.ts';
import { documentCaz } from './ajutor-incrustatie.ts';
import { servesteMesajele } from './ajutor-mesaje.ts';
import { cazute } from '../placi/placa-11/cazute.ts';
import { documentPlaca11, exportPlaca11, numele, PARAMETRI, PLACUTA } from '../placi/placa-11/genereaza.ts';

const { toateFoile: _toate, ...FOAIE } = PARAMETRI;
const LIMITE = { fisiere: 100, octetiFisier: 50_000_000, octetiTotal: 200_000_000 };

const servite = servesteMesajele();
try {
  await cereMesaje('export');
} finally {
  servite.restaureaza();
}

/** Documentul cu urechile ramei „unde ține” (sau alt mod), pe toate operațiile cu urechi. */
function cuMod(d: Document, mod: 'lemn' | 'egale', numar?: number): Document {
  return {
    ...d,
    piese: d.piese.map((p) => ({
      ...p,
      operatii: p.operatii.map((o) => (o.urechi ? { ...o, urechi: { ...o.urechi, mod, ...(numar !== undefined ? { numar } : {}) } } : o)),
    })),
  };
}

/** Numele plăcuțelor desprinse, pe fiecare foaie (exportul fiecărei foi, în workerul CAM), și avertismentele. */
async function desprinse(d: Document): Promise<{ readonly nume: string[][]; readonly avertismente: string[][] }> {
  const nume: string[][] = [], avertismente: string[][] = [];
  for (const f of d.foi) {
    const r = await exportInBazin(doarFoaia(d, f.id), FOAIE);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    const n = new Map(f.instante.map((i) => [i.id, i.campuri?.Nume ?? '?']));
    nume.push(r.desprinse.map((x) => n.get(x.instanta) ?? '?'));
    avertismente.push([...r.avertismente]);
  }
  return { nume, avertismente };
}

test('placa 11 la 5 mm, „unde ține”: cad doar plăcuțele înconjurate de vecine (5, 8, 11 pe foaia 1; 20 pe foaia 2)', async () => {
  const n = numele();
  const r = await desprinse(cuMod(documentPlaca11(5), 'lemn'));
  assert.deepEqual(r.nume, [[n[4], n[7], n[10]], [n[19]]]);
  // Fără nicio ureche: spuse și de lucrare, cu instanța și ramă (nimic nu se micșorează pe tăcute).
  const lemn = r.avertismente.map((a) => a.filter((x) => x.startsWith('urechile „unde ține”')));
  assert.equal(lemn[0]?.length, 1);
  assert.match(lemn[0]?.[0] ?? '', /^urechile „unde ține”: 3 bucle au mai puține urechi decât cere numărul, fiindcă în jurul lor nu e destul lemn de care să țină: [^;]+: 0 din 2; [^;]+: 0 din 2; [^;]+: 0 din 2$/);
  assert.match(lemn[1]?.[0] ?? '', /^urechile „unde ține”: o buclă are mai puține urechi decât cere numărul, fiindcă în jurul lor nu e destul lemn de care să țină: [^;]+: 0 din 2$/);
});

test('a doua plasă: proba pe G-code a plăcii găsește aceleași plăcuțe căzute, pe programele ramelor din arhivă', async () => {
  const d = cuMod(documentPlaca11(5), 'lemn');
  const r = await calculeazaExport(doarFoaia(d, d.foi[0]?.id), { ...PARAMETRI }, undefined, d);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const zip = r.fisiere[0];
  assert.ok(zip);
  const z = await citesteZip(zip.octeti, LIMITE);
  assert.ok(z.ok);
  const programe = new Map(z.intrari.map((x) => [x.nume, new TextDecoder().decode(x.octeti)]));
  const n = numele();
  const gasite = d.foi.map((f, k) => {
    const text = programe.get(`cncvs2-stanga-jos-foaia-${k + 1}-2-T5.nc`);
    assert.ok(text !== undefined, `ramele foii ${k + 1}`);
    const m = f.instante.map((i) => [i.x + PLACUTA.latime / 2, i.y + PLACUTA.inaltime / 2] as const);
    return cazute(text, m).map((j) => f.instante[j]?.campuri?.Nume ?? '?');
  });
  assert.deepEqual(gasite, [[n[4], n[7], n[10]], [n[19]]]);
  // Plăcuțele căzute sunt deja „unde ține”: butonul n-are ce trece.
  assert.equal(r.undeTine, undefined);
});

test('la distanța plăcii (10), „unde ține” dă programele plăcii, octet cu octet: toate locurile de la distanțe egale țin', async () => {
  const aur = await exportPlaca11();
  const d = cuMod(documentPlaca11(), 'lemn');
  const r = await calculeazaExport(doarFoaia(d, d.foi[0]?.id), { ...PARAMETRI }, undefined, d);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  assert.equal(r.program.sha256, aur.program.sha256);
  assert.deepEqual(r.avertismente, aur.avertismente);
});

test('butonul „Pune urechile unde țin”: cu urechile la distanțe egale, la 5 mm, rama plăcuței e rândul de trecut', async () => {
  const d = documentPlaca11(5);
  const r = await calculeazaExport(doarFoaia(d, d.foi[0]?.id), { ...FOAIE });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const p = d.piese[0];
  const rama = p?.operatii.find((o) => o.urechi);
  assert.ok(p && rama);
  assert.deepEqual(r.undeTine, [`${p.id}/${rama.id}`]);
  // O operație deja „unde ține”, sau fără urechi, nu se mai trece.
  const parte = { instanta: 'x', element: 'x/e', operatie: `${p.id}/${rama.id}`, x: 0, y: 0 };
  assert.deepEqual(operatiiDesprinse(cuMod(d, 'lemn'), [parte]), []);
  assert.deepEqual(operatiiDesprinse(d, [parte, parte]), [`${p.id}/${rama.id}`]);
  assert.deepEqual(operatiiDesprinse(d, [{ ...parte, operatie: `${p.id}/nu-e` }]), []);
});

test('valorile fundului: aceleași în lucrare și în simulare (lucrarea nu importă simularea)', () => {
  assert.equal(FUND_TAIAT, TAIAT);
  assert.equal(FUND_LEGAT, LEGAT);
});

test('centrele bune: palierul întreg pe mostre bune, de jur împrejur; cu un palier cât bucla, toate sau niciuna', () => {
  const b = Uint8Array.from([1, 1, 1, 0, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual([...centreBune(b, 1)], [1, 1, 0, 0, 0, 1, 1, 1, 1, 1]);
  assert.deepEqual([...centreBune(b, 0)], [...b]);
  assert.deepEqual([...centreBune(b, 5)], new Array(10).fill(0));
  assert.deepEqual([...centreBune(new Uint8Array(10).fill(1), 5)], new Array(10).fill(1));
});

test('alegerea, pe hârtie: capetele unui arc bun, mijloacele a două arce opuse, cât încap, nimic pe o buclă fără lemn', () => {
  const bune = (m: number, ...arce: [number, number][]): Uint8Array => {
    const b = new Uint8Array(m);
    for (const [a, z] of arce) for (let i = a; i <= z; i++) b[i] = 1;
    return b;
  };
  // Un singur arc bun: două urechi, la capetele lui (golul cel mai mare, 20, pe arc).
  assert.deepEqual(alegeIndici(bune(100, [10, 30]), 2, 5), [10, 30]);
  // Trei: capetele și mijlocul.
  assert.deepEqual(alegeIndici(bune(100, [10, 30]), 3, 5), [10, 20, 30]);
  // Două arce opuse: golul cel mai mare e 50; pornirile bune sunt seriile 10–20 și 60–70, de la mijlocul primei.
  assert.deepEqual(alegeIndici(bune(100, [10, 20], [60, 70]), 2, 5), [15, 65]);
  // Peste tot bun: la distanțe egale, de la 0.
  assert.deepEqual(alegeIndici(bune(100, [0, 99]), 4, 5), [0, 25, 50, 75]);
  // O singură ureche: la mijlocul celui mai lung arc bun.
  assert.deepEqual(alegeIndici(bune(100, [10, 20], [40, 70]), 1, 5), [55]);
  // Cât încap: pe 0–9, cu golul 5, două (0 și 9), nu trei, nici patru.
  assert.deepEqual(alegeIndici(bune(100, [0, 9]), 3, 5), [0, 9]);
  assert.deepEqual(alegeIndici(bune(100, [0, 9]), 4, 5), [0, 9]);
  // Arcul bun trece prin vârful 0 (de la 95 la 5, de jur împrejur): capetele lui, la 10 una de alta.
  assert.deepEqual(alegeIndici(bune(100, [0, 5], [95, 99]), 2, 5), [5, 95]);
  // Nimic bun; o buclă mai scurtă decât golul.
  assert.deepEqual(alegeIndici(new Uint8Array(100), 2, 5), []);
  assert.deepEqual(alegeIndici(bune(4, [0, 3]), 1, 5), []);
});

/** Un fund de 100 × 100 mm, cu celula 1: pe fiecare celulă, valoarea din centrul ei. */
function fundV(v: (x: number, y: number) => number): FundLemn {
  const s = new Uint8Array(100 * 100);
  for (let j = 0; j < 100; j++) for (let i = 0; i < 100; i++) s[j * 100 + i] = v(i + 0.5, j + 0.5);
  return { s, nx: 100, ny: 100, celula: 1 };
}
/** Legat peste tot, cu `taiat(x, y)` tăiat. */
const fund = (taiat: (x: number, y: number) => boolean): FundLemn => fundV((x, y) => (taiat(x, y) ? FUND_TAIAT : FUND_LEGAT));
/** Lemnul nelegat de foaie (o piesă tăiată de jur împrejur): `LEMN` din `sim/desprinse.ts`. */
const NELEGAT = 0;
/** Bucla frezei a unui dreptunghi, în sensul acelor de ceasornic din (x0, y0): la urcare, piesa e în dreapta mersului. */
const bucla = (x0: number, y0: number, x1: number, y1: number): Contur => ({
  inchis: true, varfuri: [{ p: { x: x0, y: y0 }, s: LINIE }, { p: { x: x0, y: y1 }, s: LINIE }, { p: { x: x1, y: y1 }, s: LINIE }, { p: { x: x1, y: y0 }, s: LINIE }],
});

test('pe un fund de hârtie: cu lemn de jur împrejur, la distanțe egale; fără lemn sus, pe laturile din stânga și din dreapta', () => {
  const c = bucla(30, 40, 70, 60); // P = 2 · (40 + 20) = 120, pornind în colțul stânga-jos, în sus
  const peste = urechiLemnBucla(c, 'urcare', 'exterior', fund(() => false), 3, 6, 2, 1, true);
  assert.deepEqual(peste, { cate: 2, centre: [30, 90], egale: true });
  // Fără egale (cu intrări): două, cât mai departe una de alta; toate pornirile sunt bune, deci de la vârful 0.
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fund(() => false), 3, 6, 2, 1, false), { cate: 2, centre: [0, 60], egale: false });
  // Tăiat la stânga lui x = 29: latura din stânga (s de la 0 la 20) n-are lemn la 3 mm spre deșeu (x = 27), dar locurile
  // egale (30, pe latura de sus, și 90, pe cea de jos) stau departe de ea: rămân.
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fund((x) => x < 29), 3, 6, 2, 1, true), { cate: 2, centre: [30, 90], egale: true });
  // Tăiat deasupra lui y = 62: latura de sus (s de la 20 la 60) n-are lemn, deci nici locul egal 30. Centrele bune sunt de la
  // 63 la 16 (de jur împrejur, cu palierul de ±3 în afara laturii de sus); golul cel mai mare, 60, îl dau perechile (x, x + 60)
  // cu x de la 3 la 16 sau de la 63 la 76: prima serie, de la mijlocul ei, 9 (stânga, la y = 49), și 69 (dreapta, la y = 51).
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fund((_x, y) => y > 62), 3, 6, 2, 1, true), { cate: 2, centre: [9, 69], egale: false });
  // Sus, lemn nelegat de foaie (o vecină tăiată de jur împrejur): pe dinafară nu ține, ca tăiat.
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fundV((_x, y) => (y > 62 ? NELEGAT : FUND_LEGAT)), 3, 6, 2, 1, true), { cate: 2, centre: [9, 69], egale: false });
  // Același dreptunghi în sens trigonometric, la opoziție (piesa tot în stânga mersului): de jos, spre dreapta; latura de sus,
  // s de la 60 la 100, fără lemn; centrele bune de la 103 la 56, iar perechile la 60 pornesc de la 43–56 sau 103–116.
  const trig: Contur = {
    inchis: true, varfuri: [{ p: { x: 30, y: 40 }, s: LINIE }, { p: { x: 70, y: 40 }, s: LINIE }, { p: { x: 70, y: 60 }, s: LINIE }, { p: { x: 30, y: 60 }, s: LINIE }],
  };
  assert.deepEqual(urechiLemnBucla(trig, 'opozitie', 'exterior', fund((_x, y) => y > 62), 3, 6, 2, 1, true), { cate: 2, centre: [49, 109], egale: false });
  // Doar spre stânga e lemn (tăiat de la x = 29 încolo): mostrele bune 0–19, centrele 3–16 (palierul de ±3 rămâne pe latură),
  // deci două urechi la capetele lor.
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fund((x) => x >= 29), 3, 6, 2, 1, true), { cate: 2, centre: [3, 16], egale: false });
  // Lângă marginea foii: latura din stânga la x = 2, deci la 3 mm spre deșeu, în afara foii, nu e lemn. Patru urechi: locul
  // egal 15 cade acolo; centrele bune 23–116, iar patru încap cel mult la 30 una de alta (de la 23 la 113, cu 30 de la 113
  // înapoi la 23): prima serie de porniri, 23–26, de la mijlocul ei.
  assert.deepEqual(urechiLemnBucla(bucla(2, 40, 42, 60), 'urcare', 'exterior', fund(() => false), 3, 6, 4, 1, true), { cate: 4, centre: [24, 54, 84, 114], egale: false });
  // Pe dinăuntru, urechea ține de piesă: deșeul e înăuntrul buclei, iar piesa (în afară) e lemn, deci locurile egale; și cu
  // piesa nelegată de foaie (în prima trecere, cu ea însăși „unde ține”, piesa e tăiată de jur împrejur).
  const miez = (x: number, y: number): boolean => x > 31 && x < 69 && y > 41 && y < 59;
  assert.deepEqual(urechiLemnBucla(c, 'opozitie', 'interior', fund(miez), 3, 6, 2, 1, true), { cate: 2, centre: [30, 90], egale: true });
  assert.deepEqual(urechiLemnBucla(c, 'opozitie', 'interior', fundV((x, y) => (miez(x, y) ? FUND_TAIAT : NELEGAT)), 3, 6, 2, 1, true), { cate: 2, centre: [30, 90], egale: true });
  // Fără niciun lemn legat: nicio ureche.
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fund(() => true), 3, 6, 2, 1, true), { cate: 0, centre: [], egale: false });
});

test('pe arce: un cerc de rază 10 (două semicercuri în sensul acelor), cu lemnul tăiat deasupra lui y = 55', () => {
  // Pornind din (40, 50), peste vârf, apoi pe dedesubt; P = 20π, 63 de mostre. Dus 3 mm spre deșeu (raza 13), punctul cade
  // deasupra lui y = 55 când sin θ > 5 / 13: mostrele 4–27; centrele bune (±3), de la 31 la 62 și 0. Două urechi: golul cel
  // mai mare, 31 de pași; pornirile bune 31, 32 și 62, 0: prima serie, de la mijlocul ei (31), apoi 62.
  const cerc: Contur = { inchis: true, varfuri: [{ p: { x: 40, y: 50 }, s: { tip: 'A', bulge: -1 } }, { p: { x: 60, y: 50 }, s: { tip: 'A', bulge: -1 } }] };
  const P = 20 * Math.PI;
  assert.deepEqual(urechiLemnBucla(cerc, 'urcare', 'exterior', fund((_x, y) => y > 55), 3, 6, 2, 1, true), { cate: 2, centre: [(31 * P) / 63, (62 * P) / 63], egale: false });
});

test('lucrarea: „unde ține” fără fundul foii se refuză; în prima trecere, fără urechi; pe linie, refuz cu motivul', () => {
  const d = cuMod(documentPlaca11(), 'lemn');
  const f = doarFoaia(d, d.foi[0]?.id);
  const fara = programDinDocument(f);
  assert.equal(fara.ok, false);
  assert.match(fara.ok ? '' : fara.motiv, /urechile „unde ține” se socotesc pe fundul foii, la export, la traseu și în vederea 3D$/);
  const prima = programDinDocument(f, undefined, 0, false, 'fara');
  const egale = programDinDocument(doarFoaia(cuMod(documentPlaca11(), 'egale'), d.foi[0]?.id));
  assert.ok(prima.ok && egale.ok);
  // Prima trecere n-are palierele urechilor (Z −10, la 2 mm de fund); a doua dă programul cu urechi (aici, cel cu egale).
  const paliere = (p: typeof prima): number => (p.ok ? p.program.miscari.filter((m) => 'la' in m && Math.abs((m.la.Z ?? 0) + 10) < 1e-9).length : 0);
  assert.equal(paliere(prima), 0);
  assert.ok(paliere(egale) > 0);
  const doua = programFoii(f);
  assert.ok(doua.ok);
  assert.deepEqual(doua.program, egale.program);
  assert.equal(doua.urechiLemn?.length, 2 * (d.foi[0]?.instante.length ?? 0));
  // Vederea 3D trece și ea prin cele două treceri.
  assert.equal(calculeazaSimularea(f).ok, true);
  // Cu intrări, locurile nu se mai numără de la vârful 0 (le-ar muta pornirea intrării): alese, deci altele decât cele egale.
  const cuIntrari = (x: Document): Document => ({
    ...x, piese: x.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => (o.urechi ? { ...o, intrari: { raza: 3 } } : o)) })),
  });
  const intrari = programFoii(doarFoaia(cuIntrari(d), d.foi[0]?.id));
  assert.ok(intrari.ok);
  assert.equal(intrari.urechiLemn?.length, doua.urechiLemn?.length);
  assert.notDeepEqual(intrari.urechiLemn, doua.urechiLemn);
  const peLinie = {
    ...d, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => (o.urechi ? { ...o, latura: 'pe-linie' as const } : o)) })),
  };
  const r = programFoii(doarFoaia(peLinie, d.foi[0]?.id));
  assert.equal(r.ok, false);
  assert.match(r.ok ? '' : r.motiv, /urechile „unde ține” cer un profil pe dinafară sau pe dinăuntru: pe linie, freza taie ambii pereți$/);
});

test('potrivirea dopului în V (ADR 0179) ia locașul din programul foii: cu o ramă „unde ține” pe aceeași foaie, aceeași potrivire', () => {
  // Cazul „dreptunghi” al oracolului incrustației (locașul la (20, 20), 12 × 6), pe foaia lui de 200 × 150 × 18; departe de el,
  // la (100, 80), o piesă 40 × 30 tăiată pe dinafară prin foaie, cu două urechi „unde ține”. Fără cele două treceri, lucrarea
  // refuză urechile (`programDinDocument`, fără fundul foii), deci și potrivirea.
  const caz = CAZURI_INCRUSTATIE[0];
  assert.ok(caz);
  const brut = documentCaz(caz) as { piese: unknown[]; foi: { instante: unknown[] }[] };
  const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const cuRama = (mod: 'lemn' | 'egale'): Document => {
    const d = structuredClone(brut);
    d.piese.push({
      id: 'q', radacina: { tip: 'element', id: 'e', matrice: I, forma: { tip: 'dreptunghi', latime: 40, inaltime: 30, razaColt: 0 } },
      operatii: [{
        id: 'x1', tip: 'profil', noduri: ['e'], scula: { numar: 3, nume: 'freza 1/8', diametru: 3.175 }, latura: 'exterior', sens: 'urcare',
        adancime: 18, pas: 6, urechi: { numar: 2, latime: 6, grosime: 2, mod }, rampa: null, intrari: null, colturi: null,
      }],
    });
    d.foi[0]?.instante.push({ id: 'j', piesa: 'q', x: 100, y: 80, rotire: 0 });
    const r = incarca({ ...d, schema: 26 });
    if (!r.ok) assert.fail(r.motiv);
    return r.doc;
  };
  const lemn = cuRama('lemn'), egale = cuRama('egale');
  assert.equal(programDinDocument(lemn).ok, false);
  const a = calculeazaPotrivirea(lemn, 0), b = calculeazaPotrivirea(egale, 0);
  assert.ok(a.ok, a.ok ? '' : a.motiv);
  assert.ok(b.ok, b.ok ? '' : b.motiv);
  // Rama stă în lemn de jur împrejur: locurile sunt cele de la distanțe egale, deci locașul e același, la bit.
  assert.deepEqual(a.potrivire, b.potrivire);
  assert.ok(Object.values(a.potrivire.randuri).every((x) => x.ok), JSON.stringify(a.potrivire.randuri));
});
