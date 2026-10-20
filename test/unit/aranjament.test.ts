/**
 * Aranjamentul carcasei (felia 2.8a, `src/ui/aranjament.ts`): barele și panourile vin din date, după id-urile din
 * registrul de acțiuni. Testul probează aranjamentul implicit (șablonul modern) și, cu controale negative, verificarea
 * pe care o va folosi un aranjament salvat de om sau un șablon nou: o plasă care nu prinde nimic ar fi vidă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIUNI_DOCUMENT } from '../../src/ui/actiuniDocument.ts';
import { ACTIUNI_EXPORT } from '../../src/ui/actiuniExport.ts';
import { ACTIUNI_IMPORT } from '../../src/ui/actiuniImport.ts';
import { ACTIUNI_VEDERE } from '../../src/ui/actiuniVedere.ts';
import {
  ARANJAMENT_MODERN, COMUTA_PANOU, DOCURI, PANOURI, verificaAranjament, ZONE, ZONE_CU_DATA_ACTIUNE,
  type Aranjament, type Grup, type IdZona,
} from '../../src/ui/aranjament.ts';

/** Toate id-urile registrului: cele patru registre ale aplicației, ca în paletă. */
const REGISTRU = new Set([...ACTIUNI_DOCUMENT, ...ACTIUNI_EXPORT, ...ACTIUNI_IMPORT, ...ACTIUNI_VEDERE].map((a) => a.id));

/** Acțiunile unei zone, în ordine, cu dublurile lor (scrise aici din nou, fără funcția din aplicație). */
const actiuniZona = (a: Aranjament, z: IdZona): string[] => a.zone[z].flatMap((g) => g.intrari.flatMap((x) => ('actiune' in x ? [x.actiune] : [])));

/** O copie a aranjamentului implicit cu o zonă înlocuită. */
const cuZona = (z: IdZona, grupuri: readonly Grup[]): Aranjament => ({ ...ARANJAMENT_MODERN, zone: { ...ARANJAMENT_MODERN.zone, [z]: grupuri } });

test('aranjamentul implicit: fiecare acțiune din el există în registru și apare cel mult o dată pe zonă', () => {
  let numarate = 0;
  for (const z of ZONE) {
    const ids = actiuniZona(ARANJAMENT_MODERN, z);
    numarate += ids.length;
    for (const id of ids) assert.ok(REGISTRU.has(id), `zona ${z}: „${id}” nu e în registru`);
    assert.equal(new Set(ids).size, ids.length, `zona ${z} are o acțiune de două ori: ${ids.join(', ')}`);
  }
  // Plasa nu e vidă: bara de sus, uneltele, bara selecției și cea de jos au, împreună, acțiunile prototipului B, plus
  // „Arată traseul” în bara de jos (2.8d), fără „Adaugă dreptunghi / cerc” (ADR 0052: locul uneltelor de desen).
  assert.equal(numarate, 4 + 2 + 3 + 2);
  for (const p of PANOURI) assert.ok(REGISTRU.has(COMUTA_PANOU[p]), `panoul ${p}: comutatorul lipsește din registru`);
  assert.deepEqual(verificaAranjament(ARANJAMENT_MODERN, REGISTRU), []);
});

test('aranjamentul implicit e cel al prototipului B: bara de sus în aceeași ordine, panourile la locul lor', () => {
  // Primul grup e locul uneltelor de desen (ADR 0052); „Adaugă dreptunghi / cerc” au ieșit din bară (rămân în paletă).
  assert.deepEqual(ARANJAMENT_MODERN.zone.sus[0], { id: 'forme', intrari: [{ control: 'unelte' }] });
  assert.deepEqual(actiuniZona(ARANJAMENT_MODERN, 'sus'), [
    'istoric.anuleaza', 'istoric.reface', 'import.svg', 'export.gcode',
  ]);
  assert.deepEqual(actiuniZona(ARANJAMENT_MODERN, 'selectie'), ['document.duplica-selectia', 'document.sterge-selectia', 'vedere.proprietati']);
  assert.deepEqual(ARANJAMENT_MODERN.docuri, { stanga: ['lista'], dreapta: ['proprietati'] });
  // Fiecare panou stă undeva: altfel nu s-ar mai putea deschide.
  assert.deepEqual(DOCURI.flatMap((d) => ARANJAMENT_MODERN.docuri[d]).sort(), [...PANOURI].sort());
});

test('localizatorii e2e `[data-actiune=…]` rămân unici: o acțiune stă cel mult o dată în zonele care o poartă așa', () => {
  const ids = [
    ...ZONE_CU_DATA_ACTIUNE.flatMap((z) => actiuniZona(ARANJAMENT_MODERN, z)),
    // Comutatorul fiecărui panou pus într-un doc stă în colțul panoului, tot cu `data-actiune`.
    ...DOCURI.flatMap((d) => ARANJAMENT_MODERN.docuri[d].map((p) => COMUTA_PANOU[p])),
  ];
  assert.equal(new Set(ids).size, ids.length, ids.join(', '));
  // Bara selecției (`data-context`) e singura care repetă acțiuni din bara de sus.
  assert.ok(!ZONE_CU_DATA_ACTIUNE.includes('selectie'));
});

test('verificarea prinde ce ar strica un aranjament salvat sau un șablon nou (controalele negative)', () => {
  const sus = ARANJAMENT_MODERN.zone.sus;
  // O acțiune care nu e în registru (un id vechi, după o redenumire).
  assert.match(verificaAranjament(cuZona('sus', [...sus, { id: 'x', intrari: [{ actiune: 'document.nu-exista' }] }]), REGISTRU).join('\n'),
    /zona sus: acțiunea „document\.nu-exista” nu e în registru/);
  // Aceeași acțiune de două ori în zonă, chiar și în grupuri diferite.
  assert.match(verificaAranjament(cuZona('sus', [...sus, { id: 'x', intrari: [{ actiune: 'istoric.anuleaza' }] }]), REGISTRU).join('\n'),
    /zona sus: actiune:istoric\.anuleaza apare de două ori/);
  // Același id de grup de două ori (cheia React a grupului).
  assert.match(verificaAranjament(cuZona('jos', [...ARANJAMENT_MODERN.zone.jos, { id: 'stare', intrari: [] }]), REGISTRU).join('\n'),
    /zona jos: grupul „stare” apare de două ori/);
  // Un cip, un control sau un aspect necunoscut (un JSON salvat de altă versiune).
  const necunoscute = [
    { cip: 'nu-exista' }, { control: 'nu-exista' }, { actiune: 'istoric.reface', aspect: 'nu-exista' },
  ] as unknown as Grup['intrari'];
  const probleme = verificaAranjament(cuZona('jos', [{ id: 'x', intrari: necunoscute }]), REGISTRU).join('\n');
  assert.match(probleme, /cipul „nu-exista” nu există/);
  assert.match(probleme, /controlul „nu-exista” nu există/);
  assert.match(probleme, /aspectul „nu-exista” nu există/);
  // Același panou în ambele docuri, și un panou necunoscut.
  assert.match(verificaAranjament({ ...ARANJAMENT_MODERN, docuri: { stanga: ['lista'], dreapta: ['lista'] } }, REGISTRU).join('\n'),
    /panoul „lista” e pus de două ori/);
  assert.match(verificaAranjament({ ...ARANJAMENT_MODERN, docuri: { stanga: ['nu-exista' as 'lista'], dreapta: [] } }, REGISTRU).join('\n'),
    /docul stanga: panoul „nu-exista” nu există/);
  // Un registru fără comutatorul unui panou pus într-un doc: panoul n-ar mai avea buton.
  const faraLista = new Set([...REGISTRU].filter((id) => id !== 'vedere.lista'));
  assert.match(verificaAranjament(ARANJAMENT_MODERN, faraLista).join('\n'), /panoul „lista”: acțiunea „vedere\.lista” nu e în registru/);
});

test('aceeași acțiune în zone diferite e permisă (Anulează și sus, și jos), doar nu de două ori în aceeași zonă', () => {
  const jos = [...ARANJAMENT_MODERN.zone.jos, { id: 'istoric', intrari: [{ actiune: 'istoric.anuleaza' }] }];
  assert.deepEqual(verificaAranjament(cuZona('jos', jos), REGISTRU), []);
});
