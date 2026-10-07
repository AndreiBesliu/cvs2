// SONDA s9-admin: matricea App Check x identitate x functie, pe emulatoare (proiect demo-*, fara cloud).
// Oracolele sunt mai jos (3): cel initial a fost scris inainte de rulare; cele folosite acum sunt derivate din SURSA citata.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(new URL('./functions/package.json', import.meta.url));
const PROJECT = 'demo-cncvs2-s9';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:19399';
const FUNCS = '127.0.0.1:19401';
const REGION = 'europe-central2';
const REPS = Number(process.env.REPS || 5);
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH;

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const unsignedJwt = (payload) => `${b64u({ alg: 'none', typ: 'JWT' })}.${b64u(payload)}.`;
const now = () => Math.floor(Date.now() / 1000);

async function post(url, body, headers = {}) {
  const t0 = performance.now();
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const ms = performance.now() - t0;
  let json = null;
  try { json = await r.json(); } catch { /* corp gol */ }
  return { status: r.status, json, ms };
}

async function signUp(email) {
  const r = await post(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { email, password: 'sonda-s9-parola', returnSecureToken: true });
  if (r.status !== 200) throw new Error(`signUp ${email}: ${r.status} ${JSON.stringify(r.json)}`);
  return r.json.localId;
}
async function signIn(email) {
  const r = await post(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { email, password: 'sonda-s9-parola', returnSecureToken: true });
  if (r.status !== 200) throw new Error(`signIn ${email}: ${r.status}`);
  return r.json.idToken;
}

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
initializeApp({ projectId: PROJECT });

// 1) Identitati REALE emise de emulatorul de Auth, cu claim-urile puse prin Admin SDK (ca seed-ul).
const ROLES = { user: null, support: 'support', admin: 'admin', owner: 'owner' };
const tokens = {};
for (const [who, role] of Object.entries(ROLES)) {
  const email = `${who}@sonda-s9.test`;
  const uid = await signUp(email);
  if (role) await getAuth().setCustomUserClaims(uid, { staff: true, staffRole: role });
  tokens[who] = await signIn(email);
  const claims = JSON.parse(Buffer.from(tokens[who].split('.')[1], 'base64url').toString());
  if ((claims.staffRole ?? null) !== role) throw new Error(`claim lipsa pe ${who}`);
}
// 2) Un token FALSIFICAT de mana: nesemnat, cu rol de owner, pentru un uid care nu exista in Auth.
tokens.forgedOwner = unsignedJwt({
  iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, auth_time: now(), iat: now(), exp: now() + 3600,
  sub: 'uid-inexistent-s9', user_id: 'uid-inexistent-s9', staff: true, staffRole: 'owner',
  firebase: { identities: {}, sign_in_provider: 'custom' },
});
tokens.garbageAuth = 'nu-e-un-jwt';
tokens.none = null;

const APPCHECK = {
  absent: null,
  dummy: unsignedJwt({
    iss: 'https://firebaseappcheck.googleapis.com/000000000000', sub: '1:000000000000:web:s9sonda',
    aud: ['projects/000000000000', `projects/${PROJECT}`], iat: now(), exp: now() + 3600,
  }),
  malformed: 'nu-e-un-jwt',
};
const FNS = ['openPing', 'supportPing', 'ownerPing'];
const WHO = ['none', 'garbageAuth', 'user', 'support', 'admin', 'owner', 'forgedOwner'];

// 3) ORACOLELE.
// (a) ORACOLUL INITIAL, scris inainte de prima rulare (rulat o data, 17/63 celule gresite, pastrat in
//     rezultate-oracol-initial.json): presupunea ca un token malformat e INVALID si in emulator.
// (b) EMULATORUL, derivat din SURSA, nu din rezultate (firebase-tools lib/emulator/functionsEmulator.js:1005-1008
//     pune FIREBASE_DEBUG_FEATURES.skipTokenVerification=true; firebase-functions lib/common/providers/https.js:
//     234-249 unsafeDecodeToken intoarce {} pe un sir care nu e JWT, fara sa arunce; :310 (cont) si :339 (App Check) aleg
//     calea nesemnata; :479-491 refuza doar MISSING/INVALID). Deci in emulator ambele verificari sunt de PREZENTA.
// (c) PRODUCTIA, din aceeasi sursa, ramura fara skipTokenVerification: verifyIdToken + appCheck.verifyToken.
//     Nu se poate masura aici (fara cloud); se calculeaza ca sa numaram celulele in care emulatorul minte.
const LVL = { user: 0, support: 1, admin: 2, owner: 3, forgedOwner: 3, garbageAuth: 0 };
const MIN = { openPing: 0, supportPing: 1, ownerPing: 3 };
function asteptatEmulator(fn, app, who) {
  if (fn !== 'openPing' && app === 'absent') return 401;      // App Check MISSING + enforceAppCheck
  if (MIN[fn] === 0) return 200;                                // fara rol cerut
  if (who === 'none') return 401;                               // requireLevel: unauthenticated
  return LVL[who] >= MIN[fn] ? 200 : 403;                       // orice Authorization prezent = autentificat
}
function asteptatProductie(fn, app, who) {
  if (who === 'garbageAuth' || who === 'forgedOwner') return 401; // verifyIdToken respinge
  if (fn === 'openPing') return 200;                              // App Check lipsa/invalid: doar avertisment
  return 401;                                                     // niciun token App Check din matrice nu e semnat
}
const asteptat = asteptatEmulator;

const rows = [];
for (let rep = 0; rep < REPS; rep++) {
  for (const fn of FNS) for (const app of Object.keys(APPCHECK)) for (const who of WHO) {
    const h = {};
    if (tokens[who]) h.authorization = `Bearer ${tokens[who]}`;
    if (APPCHECK[app]) h['x-firebase-appcheck'] = APPCHECK[app];
    const r = await post(`http://${FUNCS}/${PROJECT}/${REGION}/${fn}`, { data: {} }, h);
    rows.push({ rep, fn, app, who, status: r.status, expected: asteptat(fn, app, who), prod: asteptatProductie(fn, app, who),
      appId: r.json?.result?.appId ?? null, err: r.json?.error?.status ?? null, ms: Math.round(r.ms) });
  }
}

// 4) Verdict + stabilitate intre repetari.
const key = (r) => `${r.fn}|${r.app}|${r.who}`;
const byCell = new Map();
for (const r of rows) { const k = key(r); if (!byCell.has(k)) byCell.set(k, []); byCell.get(k).push(r); }
let mismatches = 0, unstable = 0;
const table = [];
for (const [k, rs] of byCell) {
  const statuses = [...new Set(rs.map((r) => r.status))];
  if (statuses.length > 1) unstable++;
  const ok = statuses.length === 1 && statuses[0] === rs[0].expected;
  if (!ok) mismatches++;
  const ms = rs.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(rs.length / 2)];
  table.push({ cell: k, expected: rs[0].expected, measured: statuses.join('/'), prod: rs[0].prod, err: rs[0].err, appId: rs[0].appId, medianMs: ms, ok });
}
console.table(table);
const gapProd = table.filter((t) => String(t.prod) !== t.measured).length;
const ownerBlockedNoAppCheck = table.filter((t) => t.cell.endsWith('|absent|owner') && t.cell.startsWith('ownerPing') && t.measured === '401').length;
const summary = { cells: byCell.size, reps: REPS, calls: rows.length, mismatches, unstable, gapEmulatorVsProductie: gapProd, ownerBlockedNoAppCheck,
  dummyAppIdSeen: rows.some((r) => r.appId === '1:000000000000:web:s9sonda') };
console.log(JSON.stringify(summary));
writeFileSync(new URL('./rezultate.json', import.meta.url), JSON.stringify({ summary, table }, null, 2));
process.exit(mismatches === 0 && unstable === 0 ? 0 : 1);
