/**
 * Bazinul cotelor (ADR 0323, planul liniilor pe workere; felia 18.1↑h-8). Cu o operație a reliefului peste prag, `bazinCam`
 * cere workerului CAM planul (loturile, ca cereri de sine stătătoare), calculează fiecare lot într-un worker al lui (în Node, în
 * proces, prin aceeași graniță a unui mesaj, cu transferul tablourilor) și dă cotele exportului, traseului și simulării, după
 * cheia operației. Programul trebuie să fie același, octet cu octet, ca fără bazin.
 *
 * Documentul: litofania plăcii 18 (degroșarea și finisarea aceluiași relief, `test/placi/placa-18/genereaza-litofanie.ts`), cu
 * pragul coborât la 0, ca bazinul să lucreze pe un relief mic, și cu 1, 2 și 5 workere.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { exportInBazin, simulareInBazin, traseuInBazin } from '../../src/jobs/bazinCam.ts';
import { documentLitofanie, PARAMETRI_LIT } from '../placi/placa-18/genereaza-litofanie.ts';

test('exportul cu bazinul cotelor (2 și 5 workere) = exportul fără el, octet cu octet; bazinul chiar a lucrat', async () => {
  const { doc, resurse } = await documentLitofanie();
  const fara = await exportInBazin(doc, PARAMETRI_LIT, { fireCote: 1 }, resurse);
  assert.ok(fara.ok, fara.ok ? '' : fara.motiv);
  for (const fire of [2, 5]) {
    let loturi = 0;
    const cu = await exportInBazin(doc, PARAMETRI_LIT, { fireCote: fire, pragCote: 0, laCote: (n) => { loturi = n; } }, resurse);
    assert.ok(cu.ok, cu.ok ? '' : cu.motiv);
    // Două operații (degroșarea și finisarea), fiecare în `fire` loturi.
    assert.equal(loturi, 2 * fire);
    if (fara.ok && cu.ok) {
      assert.deepEqual(cu.fisiere.map((f) => f.text), fara.fisiere.map((f) => f.text));
      assert.deepEqual(cu.avertismente, fara.avertismente);
    }
  }
});

test('traseul și simularea cu bazinul cotelor = fără el', async () => {
  const { doc, resurse } = await documentLitofanie();
  const o = { fireCote: 3, pragCote: 0 };
  const [t1, t2] = [await traseuInBazin(doc, { fireCote: 1 }, resurse), await traseuInBazin(doc, o, resurse)];
  assert.ok(t1.ok && t2.ok);
  assert.deepEqual(t2, t1);
  const [s1, s2] = [await simulareInBazin(doc, { fireCote: 1 }, undefined, resurse), await simulareInBazin(doc, o, undefined, resurse)];
  assert.deepEqual(s2, s1);
});

test('sub prag (implicit), bazinul cotelor nu lucrează: un relief mic se face într-un singur worker', async () => {
  const { doc, resurse } = await documentLitofanie();
  let loturi = -1;
  const r = await exportInBazin(doc, PARAMETRI_LIT, { fireCote: 4, laCote: (n) => { loturi = n; } }, resurse);
  assert.ok(r.ok);
  assert.equal(loturi, -1);
});
