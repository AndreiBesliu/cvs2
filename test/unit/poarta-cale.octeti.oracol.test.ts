/**
 * ADR 0034 §3 și §9 (felia 2.7b, sesiune independentă): „documentele fără căi dau aceleași programe, octet cu octet
 * (corpusul și placa 1)”. Amprentele programelor (și ale refuzurilor, cu motivul lor) pe toate corpusurile de lipire ale
 * oracolelor de dinainte: regiunea (2.3a), urechile (2.4), rampa (2.5a), intrările (2.5b), intrările cu rampă (2.5c),
 * degajările (2.6: corpusul CU degajări și cazurile §8 pe 4 montaje), plus placa 1 pe 8 montaje. Măsurate în sesiunea
 * oracolului pe un instantaneu al aplicației de DINAINTE de felia 2.7b (417570d, rulat, necitit), cu aceleași documente
 * (v4–v8; ușa de acum le aduce la v9, doar numărul): trebuie să fie exact cele de acum. Familie → [câte programe, sha256
 * al șirului de sha256 ale programelor, unul pe rând].
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { SCHEMA, sha } from './ajutor-degajari.ts';
import { corpusDegajari, CAZURI_DEG } from '../oracles/degajari.cazuri.ts';
import { corpusIntrariRampa } from '../oracles/intrari-rampa.cazuri.ts';
import { corpusIntrari } from '../oracles/intrari.cazuri.ts';
import { corpusRampa } from '../oracles/rampa.cazuri.ts';
import { corpus } from '../oracles/regiune.cazuri.ts';
import { corpusUrechi } from '../oracles/urechi.cazuri.ts';
import { docPlaca1 } from '../oracles/sens.cazuri.ts';

const AMPRENTE_417570D: Readonly<Record<string, readonly [number, string]>> = {
  degajari: [110, '132c4202e4a27a18ba871581617e5bc3b2e947e1a4830ed003c60c50dd09f879'],
  cazuriDeg: [104, 'ab9440463e1eeba9b65d4951b2cee9ba163aaadc73081c896015691371743edd'],
  intrariRampa: [338, '821ba374a4974fe60859ee0cb41059a8109eea80fa901a83256c5e6d5bdbf9eb'],
  intrari: [338, 'c71dec646677f561d31f06ff7de79c90b1416a49306f9092b24cef83d1e30637'],
  rampa: [338, '8b313f1538c56df4bf8b01eca68291300752d1737a4038b8807aa148defd6db3'],
  regiune: [338, '227429f295ba43b5bd9406103bf2269560405febbfb2e003182ef51ea27e0505'],
  urechi: [338, '1fbf8d02a81a628176368ec81ea881ad87aa1bb9a2b76cb5760f580b83e0e759'],
  placa1: [8, 'f155588b22f87b4941455e2598380415ccc7fc1f5a0c4a9f13d47a84c28c56e8'],
};

const ORIGINI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;

test('lipire: programele documentelor fără căi (toate corpusurile de lipire 2.3a–2.6 și placa 1) sunt, octet cu octet, cele ale aplicației de dinainte de felia 2.7b (417570d)', { skip: SCHEMA >= 9 ? false : `aplicația e pe schema ${SCHEMA}` }, async () => {
  const fam: Record<string, string[]> = {};
  let trecute = 0;
  const pune = async (f: string, doc: unknown, origine: (typeof ORIGINI)[number], z0: 'sus' | 'jos'): Promise<void> => {
    const r = await programulAplicatiei(doc as never, { origine, z0 });
    if (r.ok) trecute++;
    (fam[f] ??= []).push(sha(r.ok ? r.text : `REFUZ: ${r.motiv}`));
  };
  for (const c of corpusDegajari(0x2600, 110)) await pune('degajari', c.doc, c.origine, c.z0);
  for (const c of CAZURI_DEG) for (const [k, o] of ORIGINI.entries()) await pune('cazuriDeg', c.doc, o, k % 2 ? 'jos' : 'sus');
  for (const c of corpusIntrariRampa()) await pune('intrariRampa', c.doc, c.origine, c.z0);
  for (const c of corpusIntrari()) await pune('intrari', c.doc, c.origine, c.z0);
  for (const c of corpusRampa()) await pune('rampa', c.doc, c.origine, c.z0);
  for (const c of corpus()) await pune('regiune', c.doc, c.origine, c.z0);
  for (const c of corpusUrechi()) await pune('urechi', c.doc, c.origine, c.z0);
  for (const o of ORIGINI) for (const z0 of ['sus', 'jos'] as const) await pune('placa1', docPlaca1(), o, z0);
  const rele: string[] = [];
  for (const [f, [n, h]] of Object.entries(AMPRENTE_417570D)) {
    const x = fam[f] ?? [];
    const acum = sha(x.join('\n'));
    if (x.length !== n || acum !== h) rele.push(`${f}: ${x.length} programe, amprenta ${acum}; înainte ${n}, ${h}`);
  }
  assert.deepEqual(rele, []);
  assert.ok(trecute > 1000, `${trecute} programe (restul, refuzuri cu același motiv)`);
});
