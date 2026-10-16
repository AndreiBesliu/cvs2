import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

/**
 * Regulile Firestore (`firestore.rules`, ADR 0039 §7) pe emulator: cine citește jurnalul de erori, nimeni nu-l scrie din
 * client, colecțiile aplicației vechi sunt refuzate. Tokenurile emulatorului nu sunt semnate: se probează regulile, nu
 * autenticitatea tokenurilor.
 */

let env: RulesTestEnvironment | undefined;

before(async () => {
  const e = await initializeTestEnvironment({
    projectId: 'demo-cncvs2',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
  env = e;
  await e.clearFirestore();
  await e.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'staff/sup'), { rol: 'support' });
    await setDoc(doc(db, 'staff/adm'), { rol: 'admin' });
    await setDoc(doc(db, 'staff/own'), { rol: 'owner' });
    await setDoc(doc(db, 'staff/fals'), { rol: 'stapan' });
    await setDoc(doc(db, 'errorLogs/g1'), { numar: 1, rezolvat: false });
    await setDoc(doc(db, 'errorLogs/g1/aparitii/a1'), { mesaj: 'x' });
    await setDoc(doc(db, 'limiteErori/client_1'), { numar: 1 });
    await setDoc(doc(db, 'audit/a1'), { cine: 'sup', actiune: 'erori.marcheaza' });
    await setDoc(doc(db, 'marcaje/backupZilnic'), { job: 'backupZilnic', esecuriLaRand: 0 });
    // Colecțiile aplicației vechi, pe care regulile vechi le dădeau omului lor.
    await setDoc(doc(db, 'users/om'), { nume: 'om' });
    await setDoc(doc(db, 'customers/om'), { stripeId: 'cus_x' });
  });
});

// Cu un filtru de nume care nu prinde niciun test de aici, `before` nu rulează, dar `after` da.
after(async () => { await env?.cleanup(); });

function ca(uid: string | null) {
  if (!env) throw new Error('mediul regulilor nu e pornit');
  return (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore();
}

test('jurnalul de erori îl citește doar personalul (support, admin, owner), grupurile și aparițiile', async () => {
  for (const uid of ['sup', 'adm', 'own']) {
    const db = ca(uid);
    await assertSucceeds(getDoc(doc(db, 'errorLogs/g1')));
    await assertSucceeds(getDocs(collection(db, 'errorLogs')));
    await assertSucceeds(getDoc(doc(db, 'errorLogs/g1/aparitii/a1')));
    await assertSucceeds(getDocs(collection(db, 'errorLogs/g1/aparitii')));
  }
  for (const uid of [null, 'om', 'fals']) {
    const db = ca(uid);
    await assertFails(getDoc(doc(db, 'errorLogs/g1')));
    await assertFails(getDocs(collection(db, 'errorLogs')));
    await assertFails(getDoc(doc(db, 'errorLogs/g1/aparitii/a1')));
  }
});

test('nimeni nu scrie jurnalul din client, nici owner-ul: doar serverul, prin Admin SDK', async () => {
  for (const uid of [null, 'om', 'sup', 'own']) {
    const db = ca(uid);
    await assertFails(setDoc(doc(db, 'errorLogs/nou'), { numar: 1 }));
    await assertFails(updateDoc(doc(db, 'errorLogs/g1'), { rezolvat: true }));
    await assertFails(deleteDoc(doc(db, 'errorLogs/g1')));
    await assertFails(setDoc(doc(db, 'errorLogs/g1/aparitii/a2'), { mesaj: 'fals' }));
    await assertFails(getDoc(doc(db, 'limiteErori/client_1')));
    await assertFails(setDoc(doc(db, 'limiteErori/client_1'), { numar: 0 }));
  }
});

test('staff: fiecare își citește doar documentul lui și nu-l scrie nimeni din client', async () => {
  await assertSucceeds(getDoc(doc(ca('sup'), 'staff/sup')));
  await assertSucceeds(getDoc(doc(ca('om'), 'staff/om')));
  await assertFails(getDoc(doc(ca('sup'), 'staff/own')));
  await assertFails(getDocs(collection(ca('own'), 'staff')));
  await assertFails(getDoc(doc(ca(null), 'staff/sup')));
  await assertFails(setDoc(doc(ca('om'), 'staff/om'), { rol: 'owner' }));
  await assertFails(updateDoc(doc(ca('sup'), 'staff/sup'), { rol: 'owner' }));
  await assertFails(setDoc(doc(ca('own'), 'staff/nou'), { rol: 'support' }));
});

test('auditul îl citesc doar admin și owner; nu-l scrie nimeni din client', async () => {
  for (const uid of ['adm', 'own']) {
    await assertSucceeds(getDoc(doc(ca(uid), 'audit/a1')));
    await assertSucceeds(getDocs(collection(ca(uid), 'audit')));
  }
  for (const uid of [null, 'om', 'sup', 'fals']) await assertFails(getDoc(doc(ca(uid), 'audit/a1')));
  for (const uid of ['sup', 'own']) {
    await assertFails(setDoc(doc(ca(uid), 'audit/a2'), { cine: uid }));
    await assertFails(deleteDoc(doc(ca(uid), 'audit/a1')));
  }
});

test('marcajele joburilor le citește personalul; nu le scrie nimeni din client', async () => {
  for (const uid of ['sup', 'adm', 'own']) {
    await assertSucceeds(getDoc(doc(ca(uid), 'marcaje/backupZilnic')));
    await assertSucceeds(getDocs(collection(ca(uid), 'marcaje')));
  }
  for (const uid of [null, 'om', 'fals']) await assertFails(getDoc(doc(ca(uid), 'marcaje/backupZilnic')));
  await assertFails(setDoc(doc(ca('own'), 'marcaje/backupZilnic'), { esecuriLaRand: 0 }));
  await assertFails(updateDoc(doc(ca('sup'), 'marcaje/backupZilnic'), { esecuriLaRand: 0 }));
});

test('colecțiile aplicației vechi sunt refuzate, chiar și omului lor', async () => {
  await assertFails(getDoc(doc(ca('om'), 'users/om')));
  await assertFails(setDoc(doc(ca('om'), 'users/om'), { nume: 'altul' }));
  await assertFails(getDoc(doc(ca('om'), 'customers/om')));
  await assertFails(getDocs(collection(ca('own'), 'users')));
});
