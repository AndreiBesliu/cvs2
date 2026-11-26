/**
 * Ornamentul cu nume din atelierul Easy 3Draw (ADR 0285, felia 3.Cl-3), pe plasele reale ale motorului:
 * - fontul dintr-o singură linie: semnele, lățimile lor, câteva litere scrise aici pe hârtie; literele îngroșate ale
 *   plasei sunt „la cel mult jumătate de linie de trăsături”, punct cu punct, pentru toate semnele, la trei mărimi;
 * - numele: majuscule, sedilele duse la virgulă, semnele necunoscute sărite, cel mult 16;
 * - potrivirea: cea mai mare literă a cărei cutie, lărgită cu 2 mm, stă cu totul în formă și nu atinge gaura;
 * - scrisul: în relief (peste placă), adâncit (un buzunar, cu fundul rămas) sau decupat (cu punți: nimic nu cade);
 * - formele: eticheta, globul, inima și steaua, cu agățătoarea lor.
 */
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { L, plasa, cote } from './ajutor-plasa-lego.ts';
import { type P2, type Def, type Semn, RAD, r2, num, inPoli, steaPoli, INEL, inInel, inTijaInel, numePeHartie, intreSemn, caPeHartie, inchisa, plata } from './ajutor-craciun.ts';

type Cote = {
  forma: string; text: string; sarite: string; scris: string; lungime: number; inaltime: number; diam: number; grosime: number; relief: number; agatatoare: string;
  litera: number; linie: number; intre: number; loc: [number, number]; cutie: [number, number]; schimb: number;
};
const Lg = L as typeof L & {
  ornamentCote(d: Def): Cote; prinderi(d: Def): unknown[]; asezareModel(d: Def): { ax: boolean };
  _: { SCRIS: Readonly<Record<string, Semn>>; PUNTI: Readonly<Record<string, readonly [number, number, number]>> };
};
const ornament = (d: Def = {}) => L.construieste({ tip: 'ornament', ...d });
const FONT = Lg._.SCRIS, PUNTI = Lg._.PUNTI;

// ------------------------------------------------------------------------------------------------ regulile, pe hârtie
/** Linia literelor: 16 % din majusculă, între 1,2 și 2,6 mm. */
const linia = (h: number) => Math.max(1.2, Math.min(2.6, 0.16 * h));
/** Între casetele a două semne: linia și un gol de 0,8 linii; la scrisul decupat, golul (peretele) are cel puțin 1,2 mm. */
const intre = (w: number, scris: string) => w + (scris === 'decupat' ? Math.max(1.2, 0.8 * w) : 0.8 * w);
/** Marginea din jurul cutiei numelui. */
const MARGINE = 2;
/** Puntea scrisului decupat: lată de 1,2 mm. */
const PUNTE = 1.2;

type Forma = { forma: string; H: number; inCorp: (p: P2) => boolean; gaura: { c: P2; r: number } | null; inAgat: (p: P2) => boolean; golAgat: (p: P2) => boolean; loc: P2; cutie: [number, number, number, number] };
/** Forma de pe hârtie (ADR 0285): corpul plin, agățătoarea și golul ei, locul numelui. */
function formaPeHartie(d: Def = {}): Forma {
  const forma = typeof d.forma === 'string' ? d.forma : 'eticheta', H = num(d.grosime, 3), fara = d.agatatoare === 'fara';
  if (forma === 'eticheta') {
    // dreptunghiul cu colțurile din stânga teșite (o treime din înălțime, cel mult 8 mm); gaura de 4 mm, la 5 mm de capăt
    const W = num(d.lungime, 70), Ht = num(d.inaltime, 26), c = Math.min(Ht / 3, 8);
    const poli: P2[] = [[-W / 2 + c, -Ht / 2], [W / 2, -Ht / 2], [W / 2, Ht / 2], [-W / 2 + c, Ht / 2], [-W / 2, Ht / 2 - c], [-W / 2, -Ht / 2 + c]];
    const gaura = fara ? null : { c: [-W / 2 + 5, 0] as P2, r: 2 };
    return { forma, H, inCorp: p => inPoli(poli, p), gaura, inAgat: () => false, golAgat: p => !!gaura && Math.hypot(p[0] - gaura.c[0], p[1] - gaura.c[1]) < gaura.r, loc: [fara ? 0 : 3.5, 0], cutie: [-W / 2 - 1, -Ht / 2 - 1, W / 2 + 1, Ht / 2 + 1] };
  }
  const D = num(d.diam, 60);
  if (forma === 'glob') {
    // discul cu căpăcelul globului (26 % din diametru, cel puțin 8; înalt de 9 %, cel puțin 4) și inelul de pe el
    const R = D / 2, capL = Math.max(8, 0.26 * D), capH = Math.max(4, 0.09 * D);
    const inCap = (p: P2) => Math.abs(p[0]) <= capL / 2 && p[1] >= 0 && p[1] <= R + capH;
    return { forma, H, inCorp: p => Math.hypot(p[0], p[1]) <= R || inCap(p), gaura: null, inAgat: p => !fara && Math.hypot(p[0], p[1] - (R + capH + INEL.sus)) <= INEL.afara,
      golAgat: p => !fara && Math.hypot(p[0], p[1] - (R + capH + INEL.sus)) < INEL.gol, loc: [0, 0], cutie: [-R - 1, -R - 1, R + 1, R + capH + INEL.tot + 1] };
  }
  if (forma === 'inima') {
    // doi lobi de rază r = D / 3,6, cu centrele la ±0,8 · r; vârful de jos la 2,2 · r sub ei, pe tangentele la lobi
    const r = D / 3.6, a = 0.8 * r, T: P2 = [0, -2.2 * r], lg = Math.hypot(a, 2.2 * r), tang = Math.sqrt(lg * lg - r * r), u = Math.atan2(2.2 * r, a) - Math.asin(r / lg);
    const P: P2 = [tang * Math.cos(u), T[1] + tang * Math.sin(u)], poli: P2[] = [T, P, [a, 0], [0, 0.6 * r], [-a, 0], [-P[0], P[1]]];
    // inelul: pe o tijă de 2,4 mm, din crestătură (de la 1 mm sub ea) până la 0,2 peste vârful lobilor
    const inTija = (p: P2) => Math.abs(p[0]) <= 1.2 && p[1] >= 0.6 * r - 1 && p[1] <= r + 0.2;
    return { forma, H, inCorp: p => Math.hypot(p[0] - a, p[1]) <= r || Math.hypot(p[0] + a, p[1]) <= r || inPoli(poli, p), gaura: null,
      inAgat: p => !fara && (inTija(p) || Math.hypot(p[0], p[1] - (r + INEL.sus)) <= INEL.afara), golAgat: p => !fara && Math.hypot(p[0], p[1] - (r + INEL.sus)) < INEL.gol,
      loc: [0, -0.2 * r], cutie: [-D / 2 - 1, -2.2 * r - 1, D / 2 + 1, r + INEL.tot + 1] };
  }
  // steaua cu cinci colțuri, plină, cu vârfurile dinăuntru la 55 % din rază; inelul, pe colțul de sus
  const R = D / 2, poli = steaPoli(5, R, 0.55 * R, 90 * RAD);
  return { forma, H, inCorp: p => inPoli(poli, p), gaura: null, inAgat: p => !fara && (inTijaInel(poli, R, p) || Math.hypot(p[0], p[1] - (R + INEL.sus)) <= INEL.afara),
    golAgat: p => !fara && Math.hypot(p[0], p[1] - (R + INEL.sus)) < INEL.gol, loc: [0, 0.08 * R], cutie: [-R - 1, -R - 1, R + 1, R + INEL.tot + 1] };
}
const inPlaca = (f: Forma, p: P2): boolean => (f.inCorp(p) || f.inAgat(p)) && !f.golAgat(p);
/** Cutia numelui, lărgită cu marginea, stă în formă (pe conturul ei, din 0,2 în 0,2 mm) și nu atinge gaura? */
function incape(f: Forma, X: number, Y: number): boolean {
  const x0 = f.loc[0] - X / 2 - MARGINE, x1 = f.loc[0] + X / 2 + MARGINE, y0 = f.loc[1] - Y / 2 - MARGINE, y1 = f.loc[1] + Y / 2 + MARGINE;
  const nx = Math.ceil((x1 - x0) / 0.2), ny = Math.ceil((y1 - y0) / 0.2);
  for (let k = 0; k <= nx; k++) { const x = x0 + (x1 - x0) * k / nx; if (!f.inCorp([x, y0]) || !f.inCorp([x, y1])) return false; }
  for (let k = 0; k <= ny; k++) { const y = y0 + (y1 - y0) * k / ny; if (!f.inCorp([x0, y]) || !f.inCorp([x1, y])) return false; }
  if (f.gaura) { const dx = Math.max(x0 - f.gaura.c[0], 0, f.gaura.c[0] - x1), dy = Math.max(y0 - f.gaura.c[1], 0, f.gaura.c[1] - y1); if (Math.hypot(dx, dy) < f.gaura.r) return false; }
  return true;
}
/** Cât ocupă numele la majuscula h: cutia cernelii. */
function cutieNume(text: string, h: number, scris: string): [number, number] {
  const w = linia(h), n = numePeHartie(FONT, text, h, w, intre(w, scris), [0, 0]);
  return [n.X, n.Y];
}
/** Numele de pe hârtie al unui ornament: așezat cu majuscula și linia spuse de motor (verificate separat, în proba potrivirii). */
function nume(d: Def) {
  const q = Lg.ornamentCote(d), f = formaPeHartie(d);
  return { q, f, n: numePeHartie(FONT, q.text, q.litera, linia(q.litera), intre(linia(q.litera), q.scris), f.loc) };
}
/** Punțile scrisului decupat: la fiecare semn cu ochi, o fâșie de 1,2 mm, la locul ei din semn, între înălțimile ei. */
function inPunte(n: ReturnType<typeof numePeHartie>, text: string, p: P2): boolean {
  return [...text].some((c, k) => { const b = PUNTI[c]; return !!b && Math.abs(p[0] - (n.x[k]! + b[0] * n.u)) <= PUNTE / 2 && p[1] >= n.yb + b[1] * n.u && p[1] <= n.yb + b[2] * n.u; });
}

// -------------------------------------------------------------------------------------------------------------- fontul
test('fontul dintr-o singură linie: semnele și lățimile lor; fiecare semn stă în caseta lui; câteva litere, pe hârtie', () => {
  // lățimile, în unități (majuscula are 6)
  const LAT: Record<string, number> = {
    A: 4, B: 4, C: 3.75, D: 4, E: 3.5, F: 3.5, G: 4, H: 4, I: 0, J: 3, K: 3.75, L: 3.25, M: 5, N: 4, O: 4, P: 4, Q: 4, R: 4, S: 3, T: 4, U: 4, V: 4, W: 6, X: 4, Y: 4, Z: 4,
    'Ă': 4, 'Â': 4, 'Î': 1.8, 'Ș': 3, 'Ț': 4, 0: 3.5, 1: 1.5, 2: 3.5, 3: 3, 4: 3.75, 5: 3.25, 6: 3.5, 7: 3.5, 8: 3, 9: 3.5, ' ': 2, '-': 2.5, '.': 0, '!': 0, "'": 0, '+': 3,
  };
  assert.deepEqual(Object.keys(FONT).sort(), Object.keys(LAT).sort());
  for (const [c, lat] of Object.entries(LAT)) {
    const s = FONT[c]!;
    assert.equal(s[0], lat, `lățimea lui „${c}”`);
    assert.equal(s[1].length > 0, c !== ' ', `trăsăturile lui „${c}”`);
    // în lățime, între 0 și lățimea semnului; în înălțime, între −2,1 (virgula de sub Ș și Ț) și 8 (căciula)
    for (const t of s[1]) for (const v of t) assert.ok(v[0]! >= -1e-9 && v[0]! <= lat + 1e-9 && v[1]! >= -2.1 - 1e-9 && v[1]! <= 8 + 1e-9, `„${c}” iese din casetă: ${v}`);
    const i = intreSemn(s);
    if (i) assert.ok(i[0] >= -2.1 - 1e-6 && i[1] <= 8 + 1e-6, `arcele lui „${c}” ies din casetă: ${i}`);
  }
  // literele și cifrele stau între linia de bază și majusculă (arcele ating amândouă marginile)
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') { const i = intreSemn(FONT[c]!)!; assert.deepEqual([r2(i[0]), r2(i[1])], [0, 6], c); }
  assert.deepEqual([r2(intreSemn(FONT['Ș']!)![0]), r2(intreSemn(FONT['Ț']!)![0])], [-2.1, -2.1]);
  assert.deepEqual([r2(intreSemn(FONT['Ă']!)![1]), r2(intreSemn(FONT['Â']!)![1]), r2(intreSemn(FONT['Î']!)![1])], [7.9, 8, 8]);
  // câteva semne, cum sunt pe hârtie
  const plat = (c: string) => Array.from(FONT[c]![1], t => Array.from(t, v => [v[0], v[1], v[2] ?? 0]));
  assert.deepEqual(plat('I'), [[[0, 0, 0], [0, 6, 0]]]);
  assert.deepEqual(plat('L'), [[[0, 6, 0], [0, 0, 0], [3.25, 0, 0]]]);
  assert.deepEqual(plat('T'), [[[0, 6, 0], [4, 6, 0]], [[2, 6, 0], [2, 0, 0]]]);
  assert.deepEqual(plat('H'), [[[0, 0, 0], [0, 6, 0]], [[4, 0, 0], [4, 6, 0]], [[0, 3, 0], [4, 3, 0]]]);
  // O e un oval din două semicercuri de rază 2 și două laturi drepte: trăsătură închisă (se termină unde a început)
  assert.deepEqual(plat('O'), [[[0, 2, 0], [0, 4, -1], [4, 4, 0], [4, 2, -1], [0, 2, 0]]]);
  assert.deepEqual(plat('.'), [[[0, 0, 0]]]);
  // desenul semnelor e al fontului: o schimbare a lui se vede aici și se judecă pe randare, înainte de amprenta nouă
  const tot = Object.keys(FONT).sort().map(c => [c, FONT[c]![0], Array.from(FONT[c]![1], t => Array.from(t, v => [v[0], v[1], v[2] ?? 0].map(x => Math.round(x! * 1e4) / 1e4)))]);
  assert.equal(createHash('sha256').update(JSON.stringify(tot)).digest('hex').slice(0, 16), '516ceccc69861fd8');
  // semnele cu ochi au puntea lor (pentru scrisul decupat): locul în semn și înălțimile între care stă
  assert.deepEqual(Object.keys(PUNTI).sort(), [...'ABDOPQR04689', 'Ă', 'Â'].sort());
  for (const [c, b] of Object.entries(PUNTI)) assert.ok(b[0] > 0 && b[0] < FONT[c]![0] && b[1] < b[2], `puntea lui „${c}”`);
});

test('numele scris: majuscule, sedilele duse la virgulă, spațiile strânse, semnele necunoscute sărite, cel mult 16', () => {
  const t = (text: unknown) => { const q = Lg.ornamentCote({ text }); return [q.text, q.sarite]; };
  assert.deepEqual(t('Ana'), ['ANA', '']);
  assert.deepEqual(t('  ştefan   ţiriac '), ['ȘTEFAN ȚIRIAC', '']);
  assert.deepEqual(t('Ăâîșț 2026'), ['ĂÂÎȘȚ 2026', '']);
  assert.deepEqual(t('mos-craciun! +1.'), ['MOS-CRACIUN! +1.', '']);
  assert.deepEqual(t("d'or"), ["D'OR", '']);
  assert.deepEqual(t('a@b#c@'), ['ABC', '@#']);
  // spațiile rămase în jurul unui semn sărit se strâng și ele
  assert.deepEqual(t('ana @ maria'), ['ANA MARIA', '@']);
  assert.deepEqual(t('@ ana #'), ['ANA', '@#']);
  // un rând nou sau un tab e tot un spațiu, nu un semn necunoscut
  assert.deepEqual(t('ana\tmaria\n'), ['ANA MARIA', '']);
  assert.deepEqual(t(''), ['', '']);
  assert.deepEqual(t(undefined), ['', '']);
  assert.deepEqual(t(2026), ['2026', '']);
  assert.match(ornament({ text: 'a@b' }).avert.join(' | '), /Nu am semnul „@”: l-am sărit\./);
  assert.match(ornament({ text: 'a@b#' }).avert.join(' | '), /Nu am semnele „@#”: le-am sărit\./);
  assert.match(ornament({ text: 'abcdefghijklmnopqrstuvwxyz', lungime: 160 }).avert.join(' | '), /Un nume are cel mult 16 semne: am păstrat „ABCDEFGHIJKLMNOP”\./);
  assert.deepEqual([...ornament({ text: 'Ana' }).avert], []);
  // exact 16 semne încap fără nicio vorbă
  assert.doesNotMatch(ornament({ text: 'mos-craciun! +1.', lungime: 160 }).avert.join(' | '), /cel mult 16/);
});

test('literele plasei sunt cele de pe hârtie, punct cu punct: toate semnele, la trei mărimi', () => {
  // în relief, pe o etichetă lungă: deasupra plăcii e lemn doar la cel mult jumătate de linie de trăsăturile numelui
  const bucati = ['ABCDEFGH', 'IJKLMNOP', 'QRSTUVWX', "YZĂÂÎȘȚ'", '01234567', '89-.!+ A'];
  const marimi: number[] = [];
  for (const [inaltime, puncte] of [[16, 1500], [30, 2500], [60, 3000]] as const) for (const text of bucati) {
    const d = { text, lungime: 160, inaltime, agatatoare: 'fara' }, { q, n } = nume(d), p = ornament(d), ce = `„${text}” pe ${inaltime} mm`;
    assert.ok(q.litera >= 4.8, ce);
    marimi.push(q.litera);
    const r = caPeHartie(p, n.inLitere, [n.cutie[0] - 1, n.cutie[1] - 1, n.cutie[2] + 1, n.cutie[3] + 1], q.grosime + q.relief / 2, ce, puncte);
    assert.ok(r.judecate > puncte * 0.6 && r.lemn > puncte * 0.12, `${ce}: ${JSON.stringify(r)}`);
  }
  // cele trei mărimi sunt chiar diferite: litere mici (linia de 1,2), mijlocii și mari (linia de 2,6)
  assert.ok(Math.min(...marimi) < 7.5 && Math.max(...marimi) > 16.3, String(marimi));
});

// ---------------------------------------------------------------------------------------------------------- potrivirea
test('potrivirea numelui: cea mai mare literă a cărei cutie, lărgită cu 2 mm, stă în formă; linia și golul dintre semne', () => {
  const cazuri: Def[] = [
    {}, { text: 'ANA' }, { text: 'ȘTEFAN' }, { text: 'I' }, { text: 'MOȘ CRĂCIUN 2026', lungime: 150, inaltime: 30 }, { text: 'ANA', agatatoare: 'fara' },
    { text: 'ANA', scris: 'decupat' }, { text: 'MARIA', scris: 'adancit', lungime: 100, inaltime: 40 }, { text: 'ANA', lungime: 160, inaltime: 60 },
    { forma: 'glob', text: 'ANA' }, { forma: 'glob', text: 'CRĂCIUN', diam: 90 }, { forma: 'glob', text: 'IOANA', diam: 40, agatatoare: 'fara' },
    { forma: 'inima', text: 'ANA' }, { forma: 'inima', text: 'MAMA', diam: 100 }, { forma: 'inima', text: 'ȚUȚU', diam: 80, scris: 'decupat' },
    { forma: 'stea', text: 'ANA' }, { forma: 'stea', text: 'DAN', diam: 120 }, { forma: 'stea', text: '2026', diam: 90, scris: 'decupat' },
  ];
  for (const d of cazuri) {
    const text = typeof d.text === 'string' ? d.text : '', q = Lg.ornamentCote(d), f = formaPeHartie(d), ce = JSON.stringify(d);
    if (!text) { assert.deepEqual([q.litera, q.linie, [...q.cutie]], [0, 0, [0, 0]], ce); continue; }
    const h = q.litera;
    // majuscula: din zecime în zecime, între 4,8 mm (8 la scrisul decupat) și 40
    assert.ok(h >= (q.scris === 'decupat' ? 8 : 4.8) && h <= 40 && Math.abs(h * 10 - Math.round(h * 10)) < 1e-6, `${ce}: majuscula ${h}`);
    assert.deepEqual([r2(q.linie), r2(q.intre)], [r2(linia(h)), r2(intre(linia(h), q.scris))], ce);
    const [X, Y] = cutieNume(text, h, q.scris);
    assert.deepEqual([r2(q.cutie[0]), r2(q.cutie[1]), r2(q.loc[0]), r2(q.loc[1])], [r2(X), r2(Y), r2(f.loc[0]), r2(f.loc[1])], ce);
    // încape (cu o zecime de mm îngăduită: conturul motorului are arcele din laturi)
    assert.ok(incape(f, X - 0.1, Y - 0.1), `${ce}: cutia de ${r2(X)} × ${r2(Y)} iese din formă`);
    // și e cea mai mare: cu 0,3 mm în plus la majusculă n-ar mai încăpea (sau e la capătul de 40 mm)
    if (h < 40) { const [X2, Y2] = cutieNume(text, h + 0.3, q.scris); assert.ok(!incape(f, X2, Y2), `${ce}: ar fi încăput și la ${h + 0.3}`); }
  }
  // fiecare semn, singur: cutia lui e cea de pe hârtie (înălțimea trăsăturilor, cu arcele lor), și semnul stă în etichetă
  for (const c of Object.keys(FONT)) {
    if (c === ' ') continue;
    const q = Lg.ornamentCote({ text: c }), [X, Y] = cutieNume(c, q.litera, 'relief');
    assert.deepEqual([r2(q.cutie[0]), r2(q.cutie[1])], [r2(X), r2(Y)], `cutia lui „${c}” la ${q.litera} mm`);
    assert.ok(incape(formaPeHartie({}), X - 0.1, Y - 0.1), `„${c}” iese din etichetă`);
  }
  // pe eticheta obișnuită (70 × 26), „ANA” e limitat de înălțime: 26 − 2 · 2 − linie; „MOȘ CRĂCIUN”, de lungime
  const ana = Lg.ornamentCote({ text: 'ANA' });
  assert.ok(Math.abs(ana.cutie[1] - 22) < 0.12 && ana.cutie[0] < 70 - 7 - 4 - 5, JSON.stringify(ana));
  const mos = Lg.ornamentCote({ text: 'MOȘ CRĂCIUN' });
  assert.ok(mos.cutie[1] < 20 && mos.cutie[0] > 70 - 7 - 4 - 1.5, JSON.stringify(mos));
  // literele mici se spun; un nume care nu încape nici la 4,8 mm nu se scrie
  const mic = ornament({ text: 'MOȘ CRĂCIUN' });
  assert.ok(Lg.ornamentCote({ text: 'MOȘ CRĂCIUN' }).litera < 6);
  assert.match(mic.avert.join(' | '), /^Literele au ieșit de \d,\d mm: pentru litere mai mari, fă forma mai mare sau numele mai scurt\.$/);
  const prea = { forma: 'stea', diam: 30, text: 'WWWWWWWWWWWWWWWW' }, qp = Lg.ornamentCote(prea), pp = ornament(prea);
  assert.deepEqual([qp.litera, qp.linie, [...qp.cutie]], [0, 0, [0, 0]]);
  assert.deepEqual([...pp.avert], ['Numele nu încape pe forma asta: fă forma mai mare sau numele mai scurt.']);
  // marginile literei: 4,8 mm (pe etichetă, „MOȘ CRĂCIUN 2” ar încăpea doar la 4,4) și 8 mm la scrisul decupat („CRĂCIUN 26”
  // ar încăpea la 6,6; în relief, se scrie)
  assert.equal(Lg.ornamentCote({ text: 'MOȘ CRĂCIUN 2' }).litera, 0);
  assert.equal(Lg.ornamentCote({ text: 'CRĂCIUN 26', scris: 'decupat' }).litera, 0);
  assert.ok(Lg.ornamentCote({ text: 'CRĂCIUN 26' }).litera > 6.5);
  // fără nume scris, deasupra plăcii nu e nimic
  assert.ok(Math.abs(cote(pp)[2]! - 3) < 1e-6);
  assert.deepEqual([...ornament({ text: 'ANA', lungime: 160, inaltime: 60 }).avert], []);
});

// -------------------------------------------------------------------------------------------------------------- formele
test('formele ornamentului sunt cele de pe hârtie: eticheta, globul, inima și steaua, cu agățătoarea lor', () => {
  const cazuri: Def[] = [
    { text: 'ANA' }, { text: 'ANA', agatatoare: 'fara', lungime: 50, inaltime: 16 }, { text: 'ION', lungime: 120, inaltime: 45, grosime: 2 },
    { forma: 'glob', text: 'ANA' }, { forma: 'glob', text: 'ANA', diam: 100, agatatoare: 'fara' },
    { forma: 'inima', text: 'ANA' }, { forma: 'inima', text: 'EU', diam: 30 }, { forma: 'inima', text: 'ANA', diam: 110, agatatoare: 'fara' },
    { forma: 'stea', text: 'ANA' }, { forma: 'stea', text: 'ANA', diam: 110, agatatoare: 'fara' }, { forma: 'stea', diam: 40 },
  ];
  for (const d of cazuri) {
    const f = formaPeHartie(d), p = ornament(d), ce = JSON.stringify(d);
    const r = caPeHartie(p, q => inPlaca(f, q), f.cutie, f.H / 2, ce, 2500);
    assert.ok(r.judecate > 1800 && r.lemn > 500, `${ce}: ${JSON.stringify(r)}`);
    plata(p, ce);
    const m = plasa(p.tri);
    assert.deepEqual([m.deschise, m.negative], [0, 0], ce);
  }
  // mărimile: eticheta 70 × 26 × (3 + 0,8); globul Ø60 cu căpăcel (5,4) și inel (5); inima de 60: lobii până la r, vârful la 2,2 · r
  const dim = (d: Def) => cote(ornament(d)).map(r2);
  assert.deepEqual(dim({ text: 'ANA' }), [70, 26, 3.8]);
  assert.deepEqual(dim({ forma: 'glob', text: 'ANA' }), [60, 70.4, 3.8]);
  assert.deepEqual(dim({ forma: 'inima', text: 'ANA', agatatoare: 'fara' }), [60, r2(3.2 * 60 / 3.6), 3.8]);
  assert.deepEqual(dim({ forma: 'inima', text: 'ANA' }), [60, r2(3.2 * 60 / 3.6 + INEL.tot), 3.8]);
  // steaua Ø60: colțurile de jos la −R · cos 36°, cel de sus la R, plus inelul
  assert.deepEqual(dim({ forma: 'stea', text: 'ANA' }), [r2(60 * Math.cos(18 * RAD)), r2(30 + 30 * Math.cos(36 * RAD) + INEL.tot), 3.8]);
  // o formă necunoscută e eticheta; agățătoarea etichetei e gaura, a celorlalte, inelul
  assert.deepEqual(['x', 'eticheta', 'glob', 'inima', 'stea'].map(forma => { const q = Lg.ornamentCote({ forma }); return `${q.forma} ${q.agatatoare}`; }), ['eticheta gaura', 'eticheta gaura', 'glob inel', 'inima inel', 'stea inel']);
  assert.equal(Lg.ornamentCote({ forma: 'glob', agatatoare: 'fara' }).agatatoare, 'fara');
  assert.deepEqual([...Lg.prinderi({ tip: 'ornament', text: 'ANA' })], []);
  assert.equal(Lg.asezareModel({ tip: 'ornament', text: 'ANA' }).ax, false);
});

// --------------------------------------------------------------------------------------------------------------- scrisul
test('scrisul în relief stă peste placa întreagă; adâncit, e un buzunar cu fundul rămas; schimbul de filament', () => {
  for (const d of [{ text: 'ANA' }, { forma: 'inima', text: 'MAMA', diam: 90, relief: 1.6, grosime: 2 }] as Def[]) {
    const { q, f, n } = nume(d), p = ornament(d), ce = JSON.stringify(d);
    assert.deepEqual([q.scris, q.schimb], ['relief', q.grosime], ce);
    assert.ok(Math.abs(cote(p)[2]! - (q.grosime + q.relief)) < 1e-6, ce);
    // sub litere, placa e întreagă (lemn peste tot în formă); peste ea, doar literele, lipite de placă (fără niciun gol sub ele)
    caPeHartie(p, pt => inPlaca(f, pt), f.cutie, q.grosime - 0.005, `${ce}, sub litere`, 1500);
    caPeHartie(p, n.inLitere, f.cutie, q.grosime + 0.005, `${ce}, la baza literelor`, 1500);
    caPeHartie(p, n.inLitere, f.cutie, q.grosime + q.relief - 0.05, `${ce}, sus`, 1500);
    inchisa(p, ce, plasa(p.tri).corpuri);
  }
  for (const d of [{ text: 'ANA', scris: 'adancit' }, { forma: 'glob', text: 'BOB 08', scris: 'adancit', relief: 1.5, grosime: 4 }] as Def[]) {
    const { q, f, n } = nume(d), p = ornament(d), ce = JSON.stringify(d);
    assert.deepEqual([q.scris, q.schimb], ['adancit', 0], ce);
    assert.ok(Math.abs(cote(p)[2]! - q.grosime) < 1e-6, ce);
    // în buzunar (de sus până la adâncimea lui) lipsesc literele; ochiurile literelor rămân; sub el, placa e întreagă
    const r = caPeHartie(p, pt => inPlaca(f, pt) && !n.inLitere(pt), [n.cutie[0] - 1, n.cutie[1] - 1, n.cutie[2] + 1, n.cutie[3] + 1], q.grosime - q.relief / 2, `${ce}, în buzunar`, 2500);
    assert.ok(r.lemn < r.judecate * 0.85, `${ce}: ${JSON.stringify(r)}`);
    caPeHartie(p, pt => inPlaca(f, pt), f.cutie, q.grosime - q.relief - 0.05, `${ce}, sub buzunar`, 1500);
    plata(p, ce);
  }
  // adâncimea lasă cel puțin 0,6 mm dedesubt
  const q = Lg.ornamentCote({ text: 'ANA', scris: 'adancit', relief: 3, grosime: 2 });
  assert.equal(q.relief, 1.4);
  assert.match(ornament({ text: 'ANA', scris: 'adancit', relief: 3, grosime: 2 }).avert.join(' | '), /Scrisul adâncit lasă cel puțin 0,6 mm dedesubt: l-am făcut de 1,4 mm\./);
  assert.deepEqual([...ornament({ text: 'ANA', scris: 'adancit', relief: 2.4, grosime: 3 }).avert], []);
  // scrisul decupat n-are relief: o valoare din afara marginilor nu se spune; fără nume scris, nu e niciun schimb de filament
  assert.deepEqual([...ornament({ text: 'ANA', scris: 'decupat', relief: 9 }).avert], []);
  assert.deepEqual([Lg.ornamentCote({}).schimb, Lg.ornamentCote({ forma: 'stea', diam: 30, text: 'WWWWWWWWWWWWWWWW' }).schimb], [0, 0]);
});

test('scrisul decupat trece prin placă, cu punți la semnele cu ochi: nimic nu cade', () => {
  for (const d of [{ text: 'BOA 2468', scris: 'decupat', lungime: 150, inaltime: 40 }, { text: 'PĂDUREA', scris: 'decupat', lungime: 160, inaltime: 30 }, { forma: 'glob', text: 'RAQ 09', scris: 'decupat', diam: 110 }] as Def[]) {
    const { q, f, n } = nume(d), p = ornament(d), ce = JSON.stringify(d);
    assert.deepEqual([q.scris, q.schimb], ['decupat', 0], ce);
    assert.ok(Math.abs(cote(p)[2]! - q.grosime) < 1e-6, ce);
    const r = caPeHartie(p, pt => inPlaca(f, pt) && !(n.inLitere(pt) && !inPunte(n, q.text, pt)), [n.cutie[0] - 1, n.cutie[1] - 1, n.cutie[2] + 1, n.cutie[3] + 1], q.grosime / 2, ce, 4000);
    assert.ok(r.lemn > r.judecate * 0.3 && r.lemn < r.judecate * 0.9, `${ce}: ${JSON.stringify(r)}`);
    // placa e dintr-o bucată
    inchisa(p, ce, 1);
    plata(p, ce);
  }
  // pe hârtie: în jurul fiecărui semn, lemnul rămas e legat de margine (la cea mai mică literă și la una mare), iar fără
  // punți ar cădea un ochi
  for (const h of [8, 20]) for (const c of Object.keys(FONT)) {
    if (c === ' ') continue;
    const w = linia(h), n = numePeHartie(FONT, c, h, w, intre(w, 'decupat'), [0, 0]), pas = 0.08, x0 = n.cutie[0] - 1.5, y0 = n.cutie[1] - 1.5;
    const nx = Math.ceil((n.cutie[2] - n.cutie[0] + 3) / pas), ny = Math.ceil((n.cutie[3] - n.cutie[1] + 3) / pas);
    const insule = (cuPunti: boolean): number => {
      const lemn = new Uint8Array(nx * ny);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const pt: P2 = [x0 + (i + 0.5) * pas, y0 + (j + 0.5) * pas]; lemn[i * ny + j] = n.inLitere(pt) && !(cuPunti && inPunte(n, c, pt)) ? 0 : 1; }
      // umplerea din colț (și pe diagonală): ce lemn nu e atins e o insulă
      const coada = [0]; lemn[0] = 2;
      while (coada.length) { const k = coada.pop()!, i = Math.floor(k / ny), j = k % ny; for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1], [i + 1, j + 1], [i - 1, j - 1], [i + 1, j - 1], [i - 1, j + 1]] as const) { if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const m = a * ny + b; if (lemn[m] === 1) { lemn[m] = 2; coada.push(m); } } }
      return lemn.reduce((t: number, v) => t + (v === 1 ? 1 : 0), 0) * pas * pas;
    };
    // (un colț de pătrățel rămas la o tangență nu e o insulă: sub 0,03 mm²)
    assert.ok(insule(true) < 0.03, `„${c}” la ${h} mm lasă o insulă de ${insule(true)} mm²`);
    if (PUNTI[c]) assert.ok(insule(false) > 0.5, `„${c}” la ${h} mm: fără punte ar fi trebuit să cadă ochiul (${insule(false)} mm²)`);
  }
  // fiecare semn, singur (cât de mare încape) și de opt ori la rând (mic): plasa plăcii decupate e închisă
  for (const c of Object.keys(FONT)) {
    if (c === ' ') continue;
    for (const text of [c, c.repeat(8)]) {
      const scris = 'decupat', d = { text, scris, agatatoare: 'fara' };
      if (!Lg.ornamentCote(d).litera) continue;
      const m = plasa(ornament(d).tri);
      assert.deepEqual([m.deschise, m.negative, m.corpuri > 0], [0, 0, true], `„${text}”, ${scris}`);
    }
  }
  // între semnele scrisului decupat rămâne un perete de cel puțin 1,2 mm, și la literele mici (cu linia sub 1,5 mm)
  const hi = Lg.ornamentCote({ text: 'HIHIHIHIHIH', scris: 'decupat' });
  assert.ok(hi.litera >= 8 && hi.linie < 1.5 && Math.abs(hi.intre - hi.linie - 1.2) < 1e-9, JSON.stringify(hi));
});

// ------------------------------------------------------------------------------------------------------------ marginile
test('marginile ornamentului: ce iese din ele e adus înapoi, cu un mesaj; fără nume, forma rămâne goală', () => {
  const q = Lg.ornamentCote({});
  assert.deepEqual([q.forma, q.text, q.scris, q.lungime, q.inaltime, q.diam, q.grosime, q.relief, q.agatatoare], ['eticheta', '', 'relief', 70, 26, 60, 3, 0.8, 'gaura']);
  const adus = (d: Def, camp: keyof Cote) => Lg.ornamentCote(d)[camp];
  assert.deepEqual([adus({ lungime: 20 }, 'lungime'), adus({ lungime: 400 }, 'lungime'), adus({ inaltime: 5 }, 'inaltime'), adus({ inaltime: 90 }, 'inaltime')], [40, 160, 16, 60]);
  assert.deepEqual([adus({ forma: 'glob', diam: 10 }, 'diam'), adus({ forma: 'stea', diam: 500 }, 'diam'), adus({ grosime: 0.5 }, 'grosime'), adus({ grosime: 9 }, 'grosime')], [30, 120, 1.2, 6]);
  assert.deepEqual([adus({ text: 'A', relief: 0.1 }, 'relief'), adus({ text: 'A', relief: 9 }, 'relief'), adus({ scris: 'altceva' }, 'scris')], [0.4, 3, 'relief']);
  const mesaj = (d: Def) => ornament(d).avert.join(' | ');
  assert.match(mesaj({ lungime: 400 }), /Lungimea unei etichete e între 40 și 160 mm: am făcut-o de 160 mm\./);
  assert.match(mesaj({ inaltime: 5 }), /Înălțimea unei etichete e între 16 și 60 mm: am făcut-o de 16 mm\./);
  assert.match(mesaj({ forma: 'inima', diam: 10 }), /Mărimea unui ornament e între 30 și 120 mm: l-am făcut de 30 mm\./);
  assert.match(mesaj({ grosime: 9 }), /Grosimea unui ornament e între 1,2 și 6 mm: l-am făcut de 6 mm\./);
  assert.match(mesaj({ text: 'A', relief: 9 }), /Scrisul are între 0,4 și 3 mm: l-am făcut de 3 mm\./);
  // mărimile care nu sunt ale formei nu se judecă: eticheta nu spune nimic despre diametru, nici globul despre lungime
  assert.deepEqual([...ornament({ diam: 500, text: 'ANA' }).avert], []);
  assert.deepEqual([...ornament({ forma: 'glob', lungime: 500, text: 'ANA' }).avert], []);
  // fără nume: forma goală, fără relief și fără mesaj
  const gol = ornament({});
  assert.deepEqual([...gol.avert], []);
  assert.deepEqual(cote(gol).map(r2), [70, 26, 3]);
  inchisa(gol, 'eticheta goală', 1);
});
