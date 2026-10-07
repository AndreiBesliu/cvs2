'use strict';
/*
 * SONDA ARUNCABILA s9-admin. Nu e cod de produs.
 * Intrebarea: de ce dadeau 401 callable-urile de admin pe instanta locala, si cum se exerseaza adminul
 * acolo FARA sa slabim codul de productie (enforceAppCheck ramane true, exact ca pe live).
 * Rolul e citit aici din claim-uri doar fiindca sonda nu porneste emulatorul Firestore (Java 21).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');

initializeApp();

const REGION = 'europe-central2';
const LEVEL = Object.freeze({ support: 1, admin: 2, owner: 3 });

/** 0 = nu e personal. Un rol necunoscut NU devine owner (spre deosebire de regula veche). */
function levelOf(token) {
  if (!token || token.staff !== true) return 0;
  return LEVEL[token.staffRole] || 0;
}

function requireLevel(req, min) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in.');
  if (levelOf(req.auth.token) < min) throw new HttpsError('permission-denied', 'Insufficient role.');
  return req.auth.uid;
}

const ENFORCED = { region: REGION, enforceAppCheck: true, cors: true };

exports.supportPing = onCall(ENFORCED, (req) => ({
  ok: true, uid: requireLevel(req, LEVEL.support), appId: req.app ? req.app.appId : null,
}));

exports.ownerPing = onCall(ENFORCED, (req) => ({
  ok: true, uid: requireLevel(req, LEVEL.owner), appId: req.app ? req.app.appId : null,
}));

/* Control: aceeasi functie fara enforceAppCheck. Arata ca 401-ul vine de la App Check, nu de la cont. */
exports.openPing = onCall({ region: REGION, cors: true }, (req) => ({
  ok: true, auth: !!req.auth, appId: req.app ? req.app.appId : null,
}));
