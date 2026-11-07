import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestContext, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, getMetadata, listAll, ref, updateMetadata, uploadBytes } from 'firebase/storage';

/**
 * Regulile Storage (`storage.rules`, felia 15.B↑b, ADR 0116 §12) pe emulator: din client nu se citește, nu se listează, nu se
 * scrie și nu se șterge nimic, nici de autorul unui tichet, nici de personal, nici de owner; nici pe căile aplicației vechi
 * (`users/{uid}/…`, ale căror reguli dădeau omului scriere în dosarul lui). Proiectele atașate le scrie și le dă înapoi doar
 * callable-ul `tichete`. Controlul: aceleași cereri trec cu regulile oprite (obiectul există, cererea e bună), deci refuzul
 * vine din reguli, iar după toate refuzurile obiectele sunt încă acolo. Tokenurile emulatorului nu sunt semnate.
 */

const CALE = 'tichete/AbCdEfGhIjKlMnOpQrSt/proiect.json.gz';
const VECHE = 'users/ana/projects/p1';
const GZ = new Uint8Array([0x1f, 0x8b, 8, 0]);
let env: RulesTestEnvironment | undefined;

const mediu = (): RulesTestEnvironment => {
  if (!env) throw new Error('mediul de probă nu s-a pornit');
  return env;
};

before(async () => {
  if (!process.env['FIREBASE_STORAGE_EMULATOR_HOST']) throw new Error('FIREBASE_STORAGE_EMULATOR_HOST lipsește: emulatorul Storage nu e pornit');
  env = await initializeTestEnvironment({
    projectId: 'demo-cncvs2',
    storage: { rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8') },
  });
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const s = ctx.storage();
    await uploadBytes(ref(s, CALE), GZ, { contentType: 'application/gzip' });
    await uploadBytes(ref(s, VECHE), new Uint8Array([1, 2, 3]));
  });
});

after(async () => {
  await env?.cleanup();
});

const oameni: ReadonlyArray<readonly [string, () => RulesTestContext]> = [
  ['fără cont', () => mediu().unauthenticatedContext()],
  ['autorul tichetului', () => mediu().authenticatedContext('ana', { email: 'ana@exemplu.ro', email_verified: true })],
  ['personalul care citește tichetele', () => mediu().authenticatedContext('cit')],
  ['owner-ul', () => mediu().authenticatedContext('own')],
];

for (const [cine, context] of oameni) {
  test(`${cine}: nicio citire, listare, scriere sau ștergere în Storage, nici pe căile aplicației vechi`, async () => {
    const s = context().storage();
    await assertFails(getBytes(ref(s, CALE)));
    await assertFails(getMetadata(ref(s, CALE)));
    await assertFails(listAll(ref(s, 'tichete')));
    await assertFails(listAll(ref(s, 'tichete/AbCdEfGhIjKlMnOpQrSt')));
    await assertFails(listAll(ref(s, '')));
    await assertFails(uploadBytes(ref(s, 'tichete/ZzZzZzZzZzZzZzZzZzZz/proiect.json.gz'), GZ, { contentType: 'application/gzip' }));
    await assertFails(uploadBytes(ref(s, CALE), GZ, { contentType: 'application/gzip' }));
    await assertFails(updateMetadata(ref(s, CALE), { customMetadata: { autor: 'ana' } }));
    await assertFails(deleteObject(ref(s, CALE)));
    await assertFails(getBytes(ref(s, VECHE)));
    await assertFails(listAll(ref(s, 'users/ana')));
    await assertFails(uploadBytes(ref(s, 'users/ana/projects/p2'), new Uint8Array([4])));
    await assertFails(deleteObject(ref(s, VECHE)));
  });
}

test('controlul: cu regulile oprite, aceleași cereri trec, iar obiectele au rămas întregi după toate refuzurile', async () => {
  await mediu().withSecurityRulesDisabled(async (ctx) => {
    const s = ctx.storage();
    assert.deepEqual(new Uint8Array(await assertSucceeds(getBytes(ref(s, CALE)))), GZ);
    assert.deepEqual(new Uint8Array(await assertSucceeds(getBytes(ref(s, VECHE)))), new Uint8Array([1, 2, 3]));
    assert.deepEqual((await assertSucceeds(listAll(ref(s, 'tichete/AbCdEfGhIjKlMnOpQrSt')))).items.map((x) => x.fullPath), [CALE]);
    assert.deepEqual((await assertSucceeds(listAll(ref(s, 'tichete')))).prefixes.map((x) => x.fullPath), ['tichete/AbCdEfGhIjKlMnOpQrSt']);
    // Emulatorul dă `{}` pentru un obiect fără metadate proprii; refuzul lui `updateMetadata` nu le-a pus.
    assert.deepEqual((await assertSucceeds(getMetadata(ref(s, CALE)))).customMetadata ?? {}, {}, 'metadatele n-au fost schimbate');
  });
});
