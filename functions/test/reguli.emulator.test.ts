import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

/**
 * Regulile Firestore (`firestore.rules`, ADR 0039 §7, ADR 0049) pe emulator: cine citește ce, după permisiunile rolului
 * lui (rolurile custom din `roluri/{id}`, owner-ul fix), nimeni nu scrie din client, colecțiile aplicației vechi sunt
 * refuzate. Tokenurile emulatorului nu sunt semnate: se probează regulile, nu autenticitatea tokenurilor.
 */

let env: RulesTestEnvironment | undefined;

// Rolurile custom (id-uri de 20 de caractere, ca cele date de server).
const SUPORT = 'RSuport0000000000000';
const AUDIT = 'RAudit00000000000000';
const GOL = 'RGol0000000000000000';
const STRICAT = 'RStricat000000000000';
const LIPSA = 'RLipsa00000000000000';

before(async () => {
  const e = await initializeTestEnvironment({
    projectId: 'demo-cncvs2',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
  env = e;
  await e.clearFirestore();
  await e.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `roluri/${SUPORT}`), { nume: 'Suport', permisiuni: ['erori.citeste', 'erori.rezolva'] });
    await setDoc(doc(db, `roluri/${AUDIT}`), { nume: 'Audit', permisiuni: ['audit.citeste', 'diagnoza.citeste'] });
    await setDoc(doc(db, `roluri/${GOL}`), { nume: 'Gol', permisiuni: [] });
    await setDoc(doc(db, `roluri/${STRICAT}`), { nume: 'Stricat', permisiuni: 'erori.citeste' });
    await setDoc(doc(db, 'staff/sup'), { rol: SUPORT });
    await setDoc(doc(db, 'staff/aud'), { rol: AUDIT });
    await setDoc(doc(db, 'staff/gol'), { rol: GOL });
    await setDoc(doc(db, 'staff/strica'), { rol: STRICAT });
    await setDoc(doc(db, 'staff/lipsa'), { rol: LIPSA });
    await setDoc(doc(db, 'staff/own'), { rol: 'owner' });
    await setDoc(doc(db, 'staff/fals'), { rol: 'stapan' });
    // Treptele vechi (ADR 0040) nu mai dau nimic.
    await setDoc(doc(db, 'staff/vechi'), { rol: 'admin' });
    await setDoc(doc(db, 'invitatiiPersonal/i1'), { email: 'a@b.ro', rol: SUPORT });
    await setDoc(doc(db, 'errorLogs/g1'), { numar: 1, rezolvat: false });
    await setDoc(doc(db, 'errorLogs/g1/aparitii/a1'), { mesaj: 'x' });
    await setDoc(doc(db, 'limiteErori/client_1'), { numar: 1 });
    await setDoc(doc(db, 'audit/a1'), { cine: 'sup', actiune: 'erori.marcheaza' });
    await setDoc(doc(db, 'marcaje/backupZilnic'), { job: 'backupZilnic', esecuriLaRand: 0 });
    await setDoc(doc(db, 'meta/deployment'), { schema: 1, app: 'cncvs2', projectId: 'demo-cncvs2', tinte: {} });
    await setDoc(doc(db, 'meta/altceva'), { x: 1 });
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

/** Cei fără niciun drept: fără cont, fără document de personal, rol necunoscut, treapta veche, rol gol / stricat / lipsă. */
const FARA_NIMIC = [null, 'om', 'fals', 'vechi', 'gol', 'strica', 'lipsa'];

test('jurnalul de erori îl citesc cei cu erori.citeste și owner-ul, grupurile și aparițiile; ceilalți nu', async () => {
  for (const uid of ['sup', 'own']) {
    const db = ca(uid);
    await assertSucceeds(getDoc(doc(db, 'errorLogs/g1')));
    await assertSucceeds(getDocs(collection(db, 'errorLogs')));
    await assertSucceeds(getDoc(doc(db, 'errorLogs/g1/aparitii/a1')));
    await assertSucceeds(getDocs(collection(db, 'errorLogs/g1/aparitii')));
  }
  for (const uid of [...FARA_NIMIC, 'aud']) {
    const db = ca(uid);
    await assertFails(getDoc(doc(db, 'errorLogs/g1')));
    await assertFails(getDocs(collection(db, 'errorLogs')));
    await assertFails(getDoc(doc(db, 'errorLogs/g1/aparitii/a1')));
  }
});

test('o permisiune scoasă din rol nu mai deschide nimic de la cererea următoare (fără copii de ținut la zi)', async () => {
  await assertSucceeds(getDoc(doc(ca('sup'), 'errorLogs/g1')));
  await env?.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), `roluri/${SUPORT}`), { nume: 'Suport', permisiuni: ['erori.rezolva'] }); });
  await assertFails(getDoc(doc(ca('sup'), 'errorLogs/g1')));
  await env?.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), `roluri/${SUPORT}`), { nume: 'Suport', permisiuni: ['erori.citeste', 'erori.rezolva'] }); });
  await assertSucceeds(getDoc(doc(ca('sup'), 'errorLogs/g1')));
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

test('staff: fiecare își citește documentul lui; owner-ul citește și listează tot personalul; nu-l scrie nimeni din client', async () => {
  for (const uid of ['sup', 'om', 'gol', 'vechi']) await assertSucceeds(getDoc(doc(ca(uid), `staff/${uid}`)));
  await assertSucceeds(getDoc(doc(ca('own'), 'staff/sup')));
  await assertSucceeds(getDocs(collection(ca('own'), 'staff')));
  await assertFails(getDoc(doc(ca('sup'), 'staff/own')));
  await assertFails(getDocs(collection(ca('sup'), 'staff')));
  await assertFails(getDocs(collection(ca('vechi'), 'staff')));
  await assertFails(getDoc(doc(ca(null), 'staff/sup')));
  await assertFails(setDoc(doc(ca('om'), 'staff/om'), { rol: 'owner' }));
  await assertFails(updateDoc(doc(ca('sup'), 'staff/sup'), { rol: 'owner' }));
  await assertFails(setDoc(doc(ca('own'), 'staff/nou'), { rol: SUPORT }));
  await assertFails(deleteDoc(doc(ca('own'), 'staff/sup')));
});

test('roluri: fiecare își citește rolul lui (nu și pe altele); owner-ul le citește și le listează; nu le scrie nimeni din client', async () => {
  await assertSucceeds(getDoc(doc(ca('sup'), `roluri/${SUPORT}`)));
  await assertSucceeds(getDoc(doc(ca('gol'), `roluri/${GOL}`)));
  await assertFails(getDoc(doc(ca('sup'), `roluri/${AUDIT}`)));
  await assertFails(getDocs(collection(ca('sup'), 'roluri')));
  for (const uid of [null, 'om', 'fals', 'vechi']) await assertFails(getDoc(doc(ca(uid), `roluri/${SUPORT}`)));
  await assertSucceeds(getDoc(doc(ca('own'), `roluri/${AUDIT}`)));
  await assertSucceeds(getDocs(collection(ca('own'), 'roluri')));
  await assertFails(setDoc(doc(ca('own'), 'roluri/RNou0000000000000000'), { nume: 'x', permisiuni: ['audit.citeste'] }));
  await assertFails(updateDoc(doc(ca('sup'), `roluri/${SUPORT}`), { permisiuni: ['audit.citeste'] }));
  await assertFails(deleteDoc(doc(ca('own'), `roluri/${GOL}`)));
});

test('invitațiile le citește doar owner-ul; nu le scrie nimeni din client', async () => {
  await assertSucceeds(getDoc(doc(ca('own'), 'invitatiiPersonal/i1')));
  await assertSucceeds(getDocs(collection(ca('own'), 'invitatiiPersonal')));
  for (const uid of [...FARA_NIMIC, 'sup', 'aud']) await assertFails(getDoc(doc(ca(uid), 'invitatiiPersonal/i1')));
  await assertFails(setDoc(doc(ca('own'), 'invitatiiPersonal/i2'), { email: 'x@y.ro', rol: 'owner' }));
  await assertFails(setDoc(doc(ca('om'), 'invitatiiPersonal/i1'), { email: 'om@y.ro', rol: 'owner' }));
});

test('auditul îl citesc cei cu audit.citeste și owner-ul; nu-l scrie nimeni din client', async () => {
  for (const uid of ['aud', 'own']) {
    await assertSucceeds(getDoc(doc(ca(uid), 'audit/a1')));
    await assertSucceeds(getDocs(collection(ca(uid), 'audit')));
  }
  for (const uid of [...FARA_NIMIC, 'sup']) await assertFails(getDoc(doc(ca(uid), 'audit/a1')));
  for (const uid of ['aud', 'own']) {
    await assertFails(setDoc(doc(ca(uid), 'audit/a2'), { cine: uid }));
    await assertFails(deleteDoc(doc(ca(uid), 'audit/a1')));
  }
});

test('marcajele joburilor le citesc cei cu diagnoza.citeste și owner-ul; nu le scrie nimeni din client', async () => {
  for (const uid of ['aud', 'own']) {
    await assertSucceeds(getDoc(doc(ca(uid), 'marcaje/backupZilnic')));
    await assertSucceeds(getDocs(collection(ca(uid), 'marcaje')));
  }
  for (const uid of [...FARA_NIMIC, 'sup']) await assertFails(getDoc(doc(ca(uid), 'marcaje/backupZilnic')));
  await assertFails(setDoc(doc(ca('own'), 'marcaje/backupZilnic'), { esecuriLaRand: 0 }));
  await assertFails(updateDoc(doc(ca('aud'), 'marcaje/backupZilnic'), { esecuriLaRand: 0 }));
});

test('amprenta publicării (meta/deployment) o citesc cei cu diagnoza.citeste; nu o scrie nimeni din client; restul lui meta e refuzat', async () => {
  for (const uid of ['aud', 'own']) await assertSucceeds(getDoc(doc(ca(uid), 'meta/deployment')));
  for (const uid of [...FARA_NIMIC, 'sup']) await assertFails(getDoc(doc(ca(uid), 'meta/deployment')));
  await assertFails(setDoc(doc(ca('own'), 'meta/deployment'), { schema: 1 }));
  await assertFails(updateDoc(doc(ca('own'), 'meta/deployment'), { projectId: 'altul' }));
  await assertFails(deleteDoc(doc(ca('own'), 'meta/deployment')));
  await assertFails(getDoc(doc(ca('own'), 'meta/altceva')));
  await assertFails(getDocs(collection(ca('own'), 'meta')));
});

test('colecțiile aplicației vechi sunt refuzate, chiar și omului lor', async () => {
  await assertFails(getDoc(doc(ca('om'), 'users/om')));
  await assertFails(setDoc(doc(ca('om'), 'users/om'), { nume: 'altul' }));
  await assertFails(getDoc(doc(ca('om'), 'customers/om')));
  await assertFails(getDocs(collection(ca('own'), 'users')));
});
