/**
 * Urechile după reguli (ADR 0211, varianta c; felia 11.3↑f), pe hârtie, pe placa 11: 25 de plăcuțe 80 × 30, rama tăiată pe
 * dinafară cu Ø3,175, cu două urechi de 6 × 2, pe foi de 300 × 220, câte trei pe rând (x = 10 / 95 / 180), rândurile la
 * y = 180 / 145 / 110 / 75 / 40.
 *
 * **La 5 mm**, tăieturile vecine se unesc (5 < 2 × 3,175), deci între plăcuțe nu rămâne lemn decât unde freza se ridică. Cu
 * urechile la distanțe egale, cele de sus și de jos ale unei plăcuțe nu stau în dreptul celor ale vecinelor: cad 9 + 4
 * (ADR 0211, „Problema”). Cu o regulă, urechile stau la mijlocul laturilor, deci ale plăcuțelor vecine cad **față în față**: acolo
 * amândouă frezele se ridică, iar puntea de 2 mm ține plăcuțele una de alta, pe toată lățimea de 5 mm dintre ele.
 * - „Scurte”: fiecare rând e un lanț (stânga, mijloc, dreapta), ținut de marginile foii prin capete: nu cade niciuna.
 * - „Lungi”: fiecare coloană e un lanț, ținut de lemnul de deasupra și de dedesubt: nu cade niciuna.
 * - „Mijloc”: patru urechi pe fiecare: nu cade niciuna.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { cereMesaje } from '../../src/i18n/laCerere.ts';
import { exportInBazin } from '../../src/jobs/bazinCam.ts';
import type { Document, ModUrechi } from '../../src/model/document.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { servesteMesajele } from './ajutor-mesaje.ts';
import { cazute } from '../placi/placa-11/cazute.ts';
import { documentPlaca11, numele, PARAMETRI, PLACUTA } from '../placi/placa-11/genereaza.ts';

const { toateFoile: _toate, ...FOAIE } = PARAMETRI;
const LIMITE = { fisiere: 100, octetiFisier: 50_000_000, octetiTotal: 200_000_000 };

const servite = servesteMesajele();
try {
  await cereMesaje('export');
} finally {
  servite.restaureaza();
}

/** Documentul cu urechile ramei în modul dat, pe toate operațiile cu urechi. */
function cuMod(d: Document, mod: ModUrechi): Document {
  return { ...d, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => (o.urechi ? { ...o, urechi: { ...o.urechi, mod } } : o)) })) };
}

/** Numele plăcuțelor desprinse de pe foaia k (de la 0), la exportul ei, și avertismentele. */
async function desprinse(d: Document, k: number): Promise<{ readonly nume: string[]; readonly avertismente: readonly string[] }> {
  const f = d.foi[k];
  assert.ok(f);
  const r = await exportInBazin(doarFoaia(d, f.id), FOAIE);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const n = new Map(f.instante.map((i) => [i.id, i.campuri?.Nume ?? '?']));
  return { nume: r.desprinse.map((x) => n.get(x.instanta) ?? '?'), avertismente: r.avertismente };
}

test('placa 11 la 5 mm, la distanțe egale (martorul): pe foaia 1 cad rândurile 2–4, nouă plăcuțe', async () => {
  const n = numele();
  const r = await desprinse(documentPlaca11(5), 0);
  assert.deepEqual(r.nume, n.slice(3, 12));
});

for (const mod of ['scurte', 'lungi', 'mijloc'] as const) {
  test(`placa 11 la 5 mm, „${mod}”: urechile vecinelor stau față în față și plăcuțele se țin una de alta; nu cade niciuna, pe nicio foaie`, async () => {
    const d = cuMod(documentPlaca11(5), mod);
    for (const k of [0, 1]) {
      const r = await desprinse(d, k);
      assert.deepEqual(r.nume, [], `foaia ${k + 1}`);
      assert.deepEqual(r.avertismente.filter((a) => a.startsWith('urechile pe laturile')), [], `foaia ${k + 1}`);
    }
  });
}

test('a doua plasă: proba pe G-code a plăcii (discul frezei pe programul scris) găsește la fel: la distanțe egale cad 9 + 4, pe laturile lungi niciuna', async () => {
  const n = numele();
  const gasite = async (d: Document): Promise<string[][]> => {
    const r = await calculeazaExport(doarFoaia(d, d.foi[0]?.id), { ...PARAMETRI }, undefined, d);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    const zip = r.fisiere[0];
    assert.ok(zip);
    const z = await citesteZip(zip.octeti, LIMITE);
    assert.ok(z.ok);
    const programe = new Map(z.intrari.map((x) => [x.nume, new TextDecoder().decode(x.octeti)]));
    return d.foi.map((f, k) => {
      const text = programe.get(`cncvs2-stanga-jos-foaia-${k + 1}-2-T5.nc`);
      assert.ok(text !== undefined, `ramele foii ${k + 1}`);
      const m = f.instante.map((i) => [i.x + PLACUTA.latime / 2, i.y + PLACUTA.inaltime / 2] as const);
      return cazute(text, m).map((j) => f.instante[j]?.campuri?.Nume ?? '?');
    });
  };
  assert.deepEqual(await gasite(documentPlaca11(5)), [n.slice(3, 12), [n[18], n[19], n[20], n[21]]]);
  assert.deepEqual(await gasite(cuMod(documentPlaca11(5), 'lungi')), [[], []]);
});

