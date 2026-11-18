/**
 * Proba urechilor la export (felia 11.3↑c): avertismentul își cere singur mesajele exportului (vin la cerere, ADR 0086).
 * Fereastra exportului le are deja; aici, într-un proces fără ele, exportul unei singure foi a plăcii 11 la 5 mm le aduce pe
 * drumul aplicației (`/mesaje/export.json`) și spune cele 9 plăcuțe ale foii 1 (rândurile 2–4), fără numele foii în față.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { servesteMesajele } from './ajutor-mesaje.ts';
import { documentPlaca11, PARAMETRI } from '../placi/placa-11/genereaza.ts';

test('exportul unei foi, fără mesajele exportului încărcate dinainte: le aduce și spune piesele desprinse', async () => {
  const { toateFoile: _toate, ...foaie } = PARAMETRI;
  const d = documentPlaca11(5);
  const f = servesteMesajele();
  try {
    const r = await calculeazaExport(doarFoaia(d, d.foi[0]?.id), foaie);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    assert.ok(f.cereri.includes('mesaje/export.json'), `cererile: ${f.cereri.join(', ')}`);
    const a = r.avertismente.filter((x) => x.includes('se desprind'));
    assert.equal(a.length, 1);
    assert.match(a[0]!, /^9 piese se desprind de foaie cât freza încă taie lângă ele, fiindcă urechile lor nu mai țin de lemnul foii: Dan \(lângă X 50, Y 160\);/);
  } finally {
    f.restaureaza();
  }
});
