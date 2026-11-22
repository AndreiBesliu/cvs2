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
import { programFoii } from '../../src/jobs/calculCam.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { alegeIndici, centreBune, FUND_LEGAT, FUND_TAIAT, urechiLemnBucla, type FundLemn } from '../../src/cam/urechiLemn.ts';
import { LEGAT, TAIAT } from '../../src/sim/desprinse.ts';
import type { Document } from '../../src/model/document.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { LINIE, type Contur } from '../../src/geom/contur.ts';
import { calculeazaExport, operatiiDesprinse } from '../../src/ui/actiuniExportCalcul.ts';
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
  // Cât încap: pe 0–9, cu golul 5, două (0 și 9), nu trei.
  assert.deepEqual(alegeIndici(bune(100, [0, 9]), 3, 5), [0, 9]);
  // Arcul bun trece prin vârful 0 (de la 95 la 5, de jur împrejur): capetele lui, la 10 una de alta.
  assert.deepEqual(alegeIndici(bune(100, [0, 5], [95, 99]), 2, 5), [5, 95]);
  // Nimic bun; o buclă mai scurtă decât golul.
  assert.deepEqual(alegeIndici(new Uint8Array(100), 2, 5), []);
  assert.deepEqual(alegeIndici(bune(4, [0, 3]), 1, 5), []);
});

/** Un fund de 100 × 100 mm, cu celula 1: legat peste tot, cu `taiat(x, y)` tăiat. */
function fund(taiat: (x: number, y: number) => boolean): FundLemn {
  const s = new Uint8Array(100 * 100);
  for (let j = 0; j < 100; j++) for (let i = 0; i < 100; i++) s[j * 100 + i] = taiat(i + 0.5, j + 0.5) ? FUND_TAIAT : FUND_LEGAT;
  return { s, nx: 100, ny: 100, celula: 1 };
}
/** Bucla frezei a unui dreptunghi, în sensul acelor de ceasornic din (x0, y0): la urcare, piesa e în dreapta mersului. */
const bucla = (x0: number, y0: number, x1: number, y1: number): Contur => ({
  inchis: true, varfuri: [{ p: { x: x0, y: y0 }, s: LINIE }, { p: { x: x0, y: y1 }, s: LINIE }, { p: { x: x1, y: y1 }, s: LINIE }, { p: { x: x1, y: y0 }, s: LINIE }],
});

test('pe un fund de hârtie: cu lemn de jur împrejur, la distanțe egale; fără lemn sus, pe laturile din stânga și din dreapta', () => {
  const c = bucla(30, 40, 70, 60); // P = 2 · (40 + 20) = 120, pornind în colțul stânga-jos, în sus
  const peste = urechiLemnBucla(c, 'urcare', 'exterior', fund(() => false), 3, 6, 2, 1, true);
  assert.deepEqual(peste, { cate: 2, centre: [30, 90], egale: true });
  // Fără egale (cu intrări): aceleași două, cât mai departe una de alta, oriunde e bun.
  const faraEgale = urechiLemnBucla(c, 'urcare', 'exterior', fund(() => false), 3, 6, 2, 1, false);
  assert.equal(faraEgale.cate, 2);
  assert.equal(Math.abs((faraEgale.centre[1] ?? 0) - (faraEgale.centre[0] ?? 0)), 60);
  // Tăiat la stânga lui x = 29: latura din stânga (s de la 0 la 20) n-are lemn la 3 mm spre deșeu (x = 27), dar locurile
  // egale (30, pe latura de sus, și 90, pe cea de jos) stau departe de ea: rămân.
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fund((x) => x < 29), 3, 6, 2, 1, true), { cate: 2, centre: [30, 90], egale: true });
  // Tăiat deasupra lui y = 62: latura de sus (s de la 20 la 60) n-are lemn, deci nici locul egal 30. Centrele bune sunt de la
  // 63 la 16 (de jur împrejur, cu palierul de ±3 în afara laturii de sus); golul cel mai mare, 60, îl dau perechile (x, x + 60)
  // cu x de la 3 la 16 sau de la 63 la 76: prima serie, de la mijlocul ei, 9 (stânga, la y = 49), și 69 (dreapta, la y = 51).
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fund((_x, y) => y > 62), 3, 6, 2, 1, true), { cate: 2, centre: [9, 69], egale: false });
  // Pe dinăuntru, urechea ține de piesă: deșeul e înăuntrul buclei, iar piesa (în afară) e lemn, deci locurile egale.
  const interior = urechiLemnBucla(c, 'opozitie', 'interior', fund((x, y) => x > 31 && x < 69 && y > 41 && y < 59), 3, 6, 2, 1, true);
  assert.deepEqual(interior, { cate: 2, centre: [30, 90], egale: true });
  // Fără niciun lemn legat: nicio ureche.
  assert.deepEqual(urechiLemnBucla(c, 'urcare', 'exterior', fund(() => true), 3, 6, 2, 1, true), { cate: 0, centre: [], egale: false });
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
  const peLinie = {
    ...d, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => (o.urechi ? { ...o, latura: 'pe-linie' as const } : o)) })),
  };
  const r = programFoii(doarFoaia(peLinie, d.foi[0]?.id));
  assert.equal(r.ok, false);
  assert.match(r.ok ? '' : r.motiv, /urechile „unde ține” cer un profil pe dinafară sau pe dinăuntru: pe linie, freza taie ambii pereți$/);
});
