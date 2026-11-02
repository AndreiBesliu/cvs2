/**
 * Pachetul de atelier (ADR 0131, felia 4.6↑b): fișierele de probă T0–T7 ale fiecărui controler, după sonda s8 (Anexa B) și
 * placa 3. Pe hârtie: setul și numele fiecărui controler; apoi geometria fiecărui test, citită din text cu cititorul
 * dialectelor (`ajutor-dialecte.ts`, scris după s8, fără post): cercurile de la T1, timpii și pauza de la T2, elicea de la T3,
 * adâncimile de la T4 și T7, WCS-ul de la T5, liniile lungi de la T6; fișa poartă amprenta fiecărui fișier. Octeții comiși îi
 * păzește `ateliere.aur.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CONTRACTE, ID_CONTRACTE, type IdContract } from '../../src/post/contracte/index.ts';
import { ASTEPTARE, T1, T1_ARC_MARE, T1_CERC, T3_ELICE, T4_PATRATE, T7_GAURI, fisiereAtelier, pachet } from '../ateliere/pachet.ts';
import { citesteProgram, type DialectCitit, type Eveniment } from './ajutor-dialecte.ts';

const dialect = (id: IdContract): DialectCitit => {
  const k = CONTRACTE[id];
  return { comentariu: k.comentariu === null ? 'niciunul' : k.comentariu.deschidere === "'" ? 'apostrof' : 'paranteze', pauza: k.pauza?.unitate ?? 's' };
};
const text = (id: IdContract, nume: string): string => {
  const f = fisiereAtelier(id).find((x) => x.nume === `${nume}.${CONTRACTE[id].extensie.toUpperCase()}`);
  assert.ok(f, `${id}: ${nume} lipsește`);
  return f?.text ?? '';
};
const evenimente = (id: IdContract, nume: string): readonly Eveniment[] => citesteProgram(text(id, nume), dialect(id)).evenimente;

type Arc = { readonly c: { x: number; y: number }; readonly r: number; readonly baleiaj: number; readonly z0: number; readonly z1: number };
/** Arcele unui program, cu centrul din startul scris plus I / J, raza și baleiajul (cu semn: pozitiv = trigonometric). */
function arce(ev: readonly Eveniment[]): Arc[] {
  const out: Arc[] = [];
  let p = { x: 0, y: 0, z: 0 };
  for (const e of ev) {
    if (e.tip !== 'miscare') continue;
    const q = { x: e.x ?? p.x, y: e.y ?? p.y, z: e.z ?? p.z };
    if (e.g === 2 || e.g === 3) {
      const c = { x: p.x + (e.i ?? 0), y: p.y + (e.j ?? 0) };
      let b = Math.atan2(q.y - c.y, q.x - c.x) - Math.atan2(p.y - c.y, p.x - c.x);
      if (e.g === 3) { while (b <= 1e-9) b += 2 * Math.PI; } else { while (b >= -1e-9) b -= 2 * Math.PI; }
      out.push({ c, r: Math.hypot(p.x - c.x, p.y - c.y), baleiaj: b, z0: p.z, z1: q.z });
    }
    p = q;
  }
  return out;
}
const aproape = (a: number, b: number, tol = 1e-3): boolean => Math.abs(a - b) <= tol;

// ——— Setul și numele ———

const NUME: Readonly<Record<IdContract, readonly string[]>> = {
  'grbl-11': ['T0CITIRE', 'T1ARCE', 'T2AVANS', 'T3ELICE', 'T4SCULA', 'T5G54', 'T5G55', 'T6LINII', 'T7GAURI'],
  grblhal: ['T0CITIRE', 'T1ARCE', 'T2AVANS', 'T4SCULA'],
  fluidnc: ['T0CITIRE', 'T1ARCE', 'T2AVANS', 'T4SCULA'],
  ncstudio: ['T0AFARA', 'T0BAPOS', 'T0CALT', 'T1ARCE', 'T2AVANS', 'T3ELICE', 'T4SCULA1', 'T4SCULA2', 'T5G54', 'T5G55'],
  richauto: ['T0AFARA', 'T0BPAR', 'T0CALT', 'T0DANTET', 'T1ARCE', 'T2AVANS', 'T3ELICE', 'T4SCULA1', 'T4SCULA2', 'T5G54', 'T5G55'],
  syntec: ['T0CITIRE', 'T0CALT', 'T1ARCE', 'T2AVANS', 'T3ELICE', 'T4SCULA', 'T5G54', 'T5G55'],
  mach3: ['T0CITIRE', 'T1ARCE', 'T2AVANS', 'T3ELICE', 'T4SCULA', 'T5G54', 'T5G55'],
  mach4: ['T0CITIRE', 'T1ARCE', 'T2AVANS', 'T3ELICE', 'T4SCULA', 'T5G54', 'T5G55'],
};

test('setul fiecărui controler (s8 Anexa B), cu nume ASCII de cel mult 8 caractere (stick FAT); fiecare fișier sub 300 de linii', () => {
  for (const id of ID_CONTRACTE) {
    const f = fisiereAtelier(id);
    const ext = CONTRACTE[id].extensie.toUpperCase();
    assert.deepEqual(f.map((x) => x.nume), NUME[id].map((n) => `${n}.${ext}`), id);
    for (const x of f) {
      assert.match(x.nume, /^[A-Z0-9]{1,8}\.(NC|TAP)$/, x.nume);
      assert.ok(x.text.split('\n').length < 300, `${id} ${x.nume}: ${x.text.split('\n').length} linii`);
      assert.ok([...x.text].every((c) => c === '\n' || (c >= ' ' && c <= '~')), `${id} ${x.nume}: ASCII`);
    }
  }
});

// ——— Geometria, pe hârtie ———

test('T1, pe toate: cercul A în 2 × 180°, cercul B în 4 × 90° (raza 25, centrele la 100 mm), colțurile R5, arcul R1200 scris ca arc, arcul mic ca G1, totul la Z −1', () => {
  const { raza, a, b } = T1_CERC;
  assert.equal(Math.hypot(b.x - a.x, b.y - a.y), 100);
  // Canalul cu freza Ø6: 50 + 6 = 56 și 50 − 6 = 44, pe hârtie.
  assert.deepEqual([2 * raza + T1.diametru, 2 * raza - T1.diametru], [56, 44]);
  for (const id of ID_CONTRACTE) {
    const ev = evenimente(id, 'T1ARCE');
    const ar = arce(ev);
    const pe = (c: { x: number; y: number }, r: number): Arc[] => ar.filter((x) => aproape(x.c.x, c.x) && aproape(x.c.y, c.y) && aproape(x.r, r));
    assert.deepEqual(pe(a, raza).map((x) => Math.round(Math.abs(x.baleiaj) * 180 / Math.PI)), [180, 180], `${id}: cercul A`);
    assert.deepEqual(pe(b, raza).map((x) => Math.round(Math.abs(x.baleiaj) * 180 / Math.PI)), [90, 90, 90, 90], `${id}: cercul B`);
    assert.equal(ar.filter((x) => aproape(x.r, 5)).length, 4, `${id}: colțurile R5`);
    const mare = ar.filter((x) => aproape(x.r, T1_ARC_MARE.raza, 0.003));
    assert.equal(mare.length, 1, `${id}: arcul R1200`);
    assert.ok(Math.abs(mare[0]?.baleiaj ?? 1) < 0.07, `${id}: arcul R1200 e scurt (coarda 80), nu un cerc`);
    // Niciun arc cu raza de 1 000 (arcul mic, coarda 0,05): iese G1 până la X230.05.
    assert.equal(ar.filter((x) => aproape(x.r, 1000, 1)).length, 0, id);
    assert.ok(ev.some((e) => e.tip === 'miscare' && e.g === 1 && e.x === 230.05 && e.y === 20), `${id}: arcul mic, G1`);
    for (const e of ev) if (e.tip === 'miscare' && e.g !== 0) assert.equal(e.z, -1, `${id}: tăierea la Z −1`);
  }
});

test('T2: 200 mm la F1000 (12,0 s) și înapoi la F2000 (6,0 s); pauza de 2 s după M3, unde contractul o scrie; pe Syntec, X10 fără punct', () => {
  for (const id of ID_CONTRACTE) {
    const ev = evenimente(id, 'T2AVANS');
    const linii = ev.filter((e): e is Extract<Eveniment, { tip: 'miscare' }> => e.tip === 'miscare' && e.g === 1 && e.y === 40 && e.z === -1);
    const timpi = linii.slice(1).map((e, k) => (Math.abs((e.x ?? 0) - (linii[k]?.x ?? 0)) / (e.f ?? 1)) * 60);
    assert.deepEqual(timpi, [12, 6], id);
    const pauze = ev.filter((e) => e.tip === 'pauza');
    assert.deepEqual(pauze, CONTRACTE[id].pauza === null ? [] : [{ tip: 'pauza', secunde: ASTEPTARE }], id);
  }
  const s = text('syntec', 'T2AVANS').split('\n');
  const k = s.indexOf('G1 X10 F1000.');
  assert.ok(k > 0 && s[k + 1] === 'M0' && s[k + 2] === 'G1 X10.', s.join('\n'));
  assert.ok(!text('mach3', 'T2AVANS').includes('X10 '), 'doar Syntec are proba punctului zecimal');
});

test('T3: elicea pe raza 7 (gaura Ø20 cu freza Ø6), 3 spire de 1 mm până la Z −3, apoi o tură plină la fund; și pe RichAuto (varianta de probă)', () => {
  const { centru, diametru, spire, pas } = T3_ELICE;
  const r = (diametru - T1.diametru) / 2;
  assert.equal(r, 7);
  for (const id of ID_CONTRACTE.filter((x) => fisiereAtelier(x).some((f) => f.test === 'T3'))) {
    const ar = arce(evenimente(id, 'T3ELICE'));
    assert.ok(ar.every((x) => aproape(x.c.x, centru.x) && aproape(x.c.y, centru.y) && aproape(x.r, r)), id);
    assert.deepEqual(ar.map((x) => x.z1), [-0.5, -1, -1.5, -2, -2.5, -3, -3, -3], id);
    const ture = ar.reduce((s, x) => s + x.baleiaj, 0) / (2 * Math.PI);
    assert.ok(aproape(ture, spire + 1), `${id}: ${ture} ture`);
    assert.equal(-Math.min(...ar.map((x) => x.z1)), spire * pas);
  }
});

test('T4: pătratele la Z −2 cu T1 (Ø6) și T2 (Ø3,175); schimbarea după strategia probată: bariera, M6 la controler sau un fișier pe freză', () => {
  const z = -T4_PATRATE.adancime;
  for (const id of ID_CONTRACTE) {
    const k = CONTRACTE[id];
    const ext = k.extensie.toUpperCase();
    const fis = fisiereAtelier(id).filter((f) => f.test === 'T4');
    const texte = fis.map((f) => f.text);
    const ev = texte.flatMap((t) => citesteProgram(t, dialect(id)).evenimente);
    const taieri = ev.filter((e) => e.tip === 'miscare' && e.g === 1);
    assert.ok(taieri.length > 0 && taieri.every((e) => e.tip === 'miscare' && e.z === z), `${id}: tăierile la Z −2`);
    if (k.scula.implicita === 'fisiere-separate') {
      assert.deepEqual(fis.map((f) => f.nume), [`T4SCULA1.${ext}`, `T4SCULA2.${ext}`], id);
      assert.ok(!texte.join('').includes('M6'), id);
    } else {
      assert.equal(fis.length, 1, id);
      const l = texte[0]?.split('\n') ?? [];
      if (id === 'mach3' || id === 'mach4') assert.ok(l.indexOf('M6') === l.indexOf('T2') + 1, id);
      else assert.ok(l.includes('T2 M6'), id);
      if (id === 'syntec') assert.ok(l.includes('G43 H2') && l.includes('G43 H1') && l.includes('T1 M6'), id);
      assert.deepEqual(ev.filter((e) => e.tip === 'scula').map((e) => (e.tip === 'scula' ? e.numar : 0)), id === 'syntec' ? [1, 2] : [2], id);
    }
  }
});

test('T5: același pătrat, o dată în G54 și o dată în G55 (și pe RichAuto, care altfel nu scrie WCS-ul)', () => {
  for (const id of ID_CONTRACTE.filter((x) => fisiereAtelier(x).some((f) => f.test === 'T5'))) {
    for (const w of ['G54', 'G55']) {
      const c = citesteProgram(text(id, `T5${w}`), dialect(id)).coduri;
      assert.ok(c.includes(w) && !c.includes(w === 'G54' ? 'G55' : 'G54'), `${id} ${w}`);
    }
  }
});

test('T6 (GRBL 1.1): o linie de 79 de caractere utile, apoi una de 80 (error:11); T7: 4 găuri Ø6, în pași de 2 mm până la Z −10', () => {
  const lungi = text('grbl-11', 'T6LINII').split('\n').filter((l) => l.startsWith('G1X'));
  assert.deepEqual(lungi.map((l) => l.replace(/\s/g, '').length), [79, 80]);
  const ev = evenimente('grbl-11', 'T7GAURI');
  const fund = ev.filter((e) => e.tip === 'miscare' && e.g === 1).map((e) => (e.tip === 'miscare' ? e.z : null));
  const pasi = [-2, -4, -6, -8, -10];
  assert.deepEqual(fund, T7_GAURI.centre.flatMap(() => pasi));
  assert.equal(-Math.min(...fund.map((z) => z ?? 0)), T7_GAURI.adancime);
});

test('fișa: fiecare fișier, cu ce se măsoară și amprenta lui SHA-256; setările contractului; nimic legat de ce nu e în pachet', () => {
  for (const id of ID_CONTRACTE) {
    const f = fisiereAtelier(id);
    const fisa = new TextDecoder().decode(pachet(id).get(`${id}/FISA.md`));
    for (const x of f) {
      assert.ok(fisa.includes(`| ${x.nume} | ${x.ce} |`), `${id}: ${x.nume} în tabel`);
      assert.ok(fisa.includes(`| ${x.nume} | \`${createHash('sha256').update(x.text, 'ascii').digest('hex')}\` |`), `${id}: amprenta ${x.nume}`);
    }
    for (const s of CONTRACTE[id].setari) assert.ok(fisa.includes(s), `${id}: ${s}`);
    assert.equal(fisa.includes('Ø3,175'), f.some((x) => x.test === 'T4'), id);
  }
  assert.ok(new TextDecoder().decode(pachet('grblhal').get('grblhal/FISA.md')).includes('$341'));
  assert.ok(new TextDecoder().decode(pachet('syntec').get('syntec/FISA.md')).includes('0,010'));
});
