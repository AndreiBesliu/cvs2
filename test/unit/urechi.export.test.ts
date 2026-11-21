/**
 * Proba urechilor la export (ADR 0210, felia 11.3↑c), pe placa 11: 25 de plăcuțe 80 × 30, rama tăiată pe dinafară cu
 * Ø3,175, cu două urechi, pe foi de 300 × 220, din stânga-sus, marginea 10. Pe hârtie: urechile stau sus și jos (la un
 * sfert și la trei sferturi din drum), deci o plăcuță cade când are vecine și deasupra, și dedesubt, iar tăieturile se
 * unesc (distanța sub 2 × 3,175 = 6,35). La distanța plăcii (10) țin toate. La 5, rândurile sunt la y = 180 / 145 / 110 /
 * 75 / 40: pe foaia 1 cad rândurile 2–4 (9 plăcuțe, numele 4–12 din CSV), pe foaia 2 (10 plăcuțe: trei rânduri și una la
 * x = 10) rândul 2 și prima din rândul 3 (numele 19–22). Aceleași plăcuțe le găsește și proba pe G-code a plăcii (alt drum:
 * programul scris, discul frezei), iar exportul le spune omului, pe fiecare foaie, cu numele și locul lor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { cereMesaje } from '../../src/i18n/laCerere.ts';
import { exportInBazin } from '../../src/jobs/bazinCam.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { servesteMesajele } from './ajutor-mesaje.ts';
import { cazute } from '../placi/placa-11/cazute.ts';
import { documentPlaca11, numele, PARAMETRI, PLACUTA } from '../placi/placa-11/genereaza.ts';

const { toateFoile: _toate, ...FOAIE } = PARAMETRI;
const LIMITE = { fisiere: 100, octetiFisier: 50_000_000, octetiTotal: 200_000_000 };

// Mesajele exportului, pe drumul aplicației (fereastra exportului le are deja când exportă).
const servite = servesteMesajele();
try {
  await cereMesaje('export');
} finally {
  servite.restaureaza();
}

/** Plăcuțele desprinse pe fiecare foaie, după numele lor, din proba aplicației (exportul fiecărei foi, în workerul CAM). */
async function desprinse(distanta: number): Promise<string[][]> {
  const d = documentPlaca11(distanta);
  const rez: string[][] = [];
  for (const f of d.foi) {
    const r = await exportInBazin(doarFoaia(d, f.id), FOAIE);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    const nume = new Map(f.instante.map((i) => [i.id, i.campuri?.Nume ?? '?']));
    rez.push(r.desprinse.map((x) => nume.get(x.instanta) ?? '?'));
  }
  return rez;
}

test('la distanța plăcii (10), nicio plăcuță desprinsă; la 5 mm, exact cele de pe hârtie: rândurile 2–4 pe foaia 1, rândul 2 și prima din rândul 3 pe foaia 2', async () => {
  const n = numele();
  assert.deepEqual(await desprinse(10), [[], []]);
  assert.deepEqual(await desprinse(5), [n.slice(3, 12), n.slice(18, 22)]);
});

test('a doua plasă: proba pe G-code a plăcii găsește aceleași plăcuțe căzute la 5 mm, pe programele ramelor din arhivă', async () => {
  const d = documentPlaca11(5);
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
  assert.deepEqual(gasite, [n.slice(3, 12), n.slice(18, 22)]);
});

test('avertismentul exportului „Toate foile”: pe fiecare foaie, câte piese se desprind, primele cinci cu numele și locul, apoi câte mai sunt', async () => {
  const d = documentPlaca11(5);
  const r = await calculeazaExport(doarFoaia(d, d.foi[0]?.id), { ...PARAMETRI }, undefined, d);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const sfat = 'De obicei, piesele sunt prea aproape: cu urechi, lasă între ele cel puțin 2 × freza + 3 mm.';
  // Mijloacele plăcuțelor: x = 10 / 95 / 180 + 40, y = rândul + 15.
  assert.deepEqual(r.avertismente.filter((a) => a.includes('se desprind')), [
    'Foaia 1: 9 piese se desprind de foaie cât freza încă taie lângă ele, fiindcă urechile lor nu mai țin de lemnul foii: '
    + 'Dan (lângă X 50, Y 160); Elena (lângă X 135, Y 160); Florin (lângă X 220, Y 160); Gabriela (lângă X 50, Y 125); '
    + `Horia (lângă X 135, Y 125); și încă 4. ${sfat}`,
    'Foaia 2: 4 piese se desprind de foaie cât freza încă taie lângă ele, fiindcă urechile lor nu mai țin de lemnul foii: '
    + `Teodora (lângă X 50, Y 160); Tudor (lângă X 135, Y 160); Valentin (lângă X 220, Y 160); Zoe (lângă X 50, Y 125). ${sfat}`,
  ]);
  // La distanța plăcii, niciun astfel de avertisment.
  const bun = documentPlaca11();
  const r10 = await calculeazaExport(doarFoaia(bun, bun.foi[0]?.id), { ...PARAMETRI }, undefined, bun);
  assert.ok(r10.ok);
  assert.deepEqual(r10.avertismente.filter((a) => a.includes('se desprind')), []);
});
