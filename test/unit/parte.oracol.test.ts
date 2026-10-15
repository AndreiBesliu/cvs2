/**
 * Tăieturile pe o parte în poartă (ADR 0037 §3, §5, §6, §7, §10, §13; felia 2.3c-5, sesiune independentă, scrisă doar din
 * ADR), pe documente și programe scrise de mână, fără aplicație (cazurile în `test/oracles/parte.cazuri.ts`):
 * - (a) valorile de pe hârtie 1, 3, 4 și 9 (plus 5, 6, 7, cubica, zig-zag-ul dens, „G”-ul cu camera, 10 și 12 acceptate)
 *   trec toată poarta, iar etichetele lor pe o parte chiar sunt judecate (lanțuri, perete, offset ideal valid); textul
 *   valorilor 1, 3, 4, 9 e chiar cel de pe hârtie;
 * - (b) regiunea pe v10: pereții, partea în lume (XOR-ul determinantului), K neschimbat; refuzul „nu încape” pe document;
 * - (c) valorile 10, 11, 12: refuzurile cerute, la eticheta cerută, și tăieturile curate;
 * - (d) martorii negativi: fiecare prins de invarianta cerută, la linia cerută, cu mesajul cerut;
 * - (e) sensul: semnul lui τ × v se derivă din modelul așchiei (urcare ⇔ τ × v > 0), iar tabelul §6 (partea în lume ×
 *   sens → direcția față de desen) iese din poartă, nu e copiat;
 * - (f) toleranțele declarate (14 (ii) la `tolII`, partea pe normala capătului) și precizarea „picioarele la egalitate”;
 * - (g) modul `inainteDe0037` și echivalența: fără tăieturi pe o parte, nimic nou (niciun perete, nicio încălcare nouă).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poarta, parteaDeTaiere, laDocument, type Incalcare } from '../oracles/poarta.ts';
import { citeste } from '../oracles/gcode.ts';
import { citesteEticheta, peOParte, regiuneDinDocument, verificaEticheta, pt } from '../oracles/regiune.ts';
import {
  idealValid, judecaFataDe, judecaPunct, lanturiPeOParte, picioare, pregateste, tolII, verificaPeOParte, TOL_EGALITATE,
} from '../oracles/parte.ts';
import { parteaPastrataPrinAschie, type EtichetaActiva } from '../oracles/sens.ts';
import type { DocV10O } from '../oracles/document.v10.ts';
import {
  cazuriRegiune, corecteParte, ctxP, martoriParte, programLinii, liniaLui, V1, V4, V6, V9, VG, VZ, programParte, TRASEE,
} from '../oracles/parte.cazuri.ts';
import { corecte, martoriDeschise, D1, D5, ctxD } from '../oracles/deschise.cazuri.ts';
import { ctx14, martori14, PROGRAM_ED5CD65, PROGRAM_REPARAT, docMartor } from '../oracles/pe-linie.cazuri.ts';
import { migreazaV9V10O } from '../oracles/document.v10.ts';

const arata = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n') || '(nimic)';
/** Mesajele aduse de felia 2.3c-5. */
const NOI = /^(pe o parte|sensul de tăiere \(pe o parte\)|regiunea păstrată: tăietura lui .* (trece pe partea păstrată|ocolește capătul|atinge (propriul perete|peretele)))/;

/** Etichetele valide ale programului, ca în poartă. */
function etichetele(text: string, doc: DocV10O): EtichetaActiva[] {
  const reg = regiuneDinDocument(doc);
  return citeste(text).comentarii.flatMap((c) => {
    const e = citesteEticheta(c.text);
    if (e === null) return [];
    return [{ linia: c.linia, eticheta: e !== 'stricata' && c.singur && verificaEticheta(reg, e) === null ? e : null }];
  });
}

// ── (a) Hârtia ───────────────────────────────────────────────────────────────────────────────────────────────────────

for (const c of corecteParte()) {
  test(`(a) ${c.nume}: trece toată poarta; eticheta pe o parte chiar e judecată`, () => {
    const ctx = ctxP(c.doc);
    assert.deepEqual(poarta(c.text, ctx).map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`), []);
    const et = etichetele(c.text, c.doc);
    const parti = et.filter((x) => peOParte(x.eticheta?.latura));
    assert.ok(parti.length >= 1, 'nicio etichetă pe o parte validă');
    const lanturi = lanturiPeOParte(citeste(c.text).evenimente, et, (m) => parteaDeTaiere(m, ctx), (p) => laDocument(p, ctx));
    assert.ok(lanturi.length >= 1, 'niciun lanț de tăiere sub etichetele pe o parte');
    for (const x of parti) {
      const w = ctx.regiune!.pereti?.find((p) => p.idLume === x.eticheta!.idLume);
      const j = w ? pregateste(w) : null;
      assert.ok(j, `${x.eticheta!.idLume}: fără perete judecat`);
      assert.ok(idealValid(j, 3).tronsoane.length > 0, `${x.eticheta!.idLume}: offsetul ideal n-are porțiuni valide`);
    }
  });
}

/** Liniile programului de după etichetă (fără antet), până la ridicare. */
const corp = (text: string, eticheta: string, n: number): string[] => text.split('\n').slice(liniaLui(text, eticheta), liniaLui(text, eticheta) + n);

test('(a) valorile de pe hârtie 1, 3, 4 și 9 sunt chiar în programele care trec (cotele de pe hârtie, mutate cu instanța)', () => {
  const dupa = (prefix: string): string => corecteParte().find((c) => c.nume.startsWith(prefix))!.text;
  assert.deepEqual(corp(dupa('1 linia, stânga + urcare'), '(a/l: cale, stanga, 3 mm)', 3), ['G0 X10.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X110.000 Y53.000 F1000.0']);
  assert.deepEqual(corp(dupa('1 linia, dreapta + urcare'), '(a/l: cale, dreapta, 3 mm)', 3), ['G0 X110.000 Y47.000', 'G1 Z-3.000 F300.0', 'G1 X10.000 Y47.000 F1000.0']);
  // 3: semicercul pus în (100, 30): (47, 0) → (147, 30), I-47 J0 neschimbat.
  assert.deepEqual(corp(dupa('3 semicercul R50, stânga'), '(c/s: cale, stanga, 3 mm)', 3), ['G0 X147.000 Y30.000', 'G1 Z-3.000 F300.0', 'G3 X53.000 Y30.000 I-47.000 J0.000 F1000.0']);
  assert.deepEqual(corp(dupa('3 semicercul R50, dreapta'), '(c/s: cale, dreapta, 3 mm)', 3), ['G0 X47.000 Y30.000', 'G1 Z-3.000 F300.0', 'G2 X153.000 Y30.000 I53.000 J0.000 F1000.0']);
  // 4: L-ul pus în (20, 10): (0,−3) → (20, 7); arcul G3 X103 Y0 I0 J3 → X123 Y10.
  assert.deepEqual(corp(dupa('4 L-ul, dreapta + opoziție'), '(e/l: cale, dreapta, 3 mm)', 5), [
    'G0 X20.000 Y7.000', 'G1 Z-3.000 F300.0', 'G1 X120.000 Y7.000 F1000.0', 'G3 X123.000 Y10.000 I0.000 J3.000 F1000.0', 'G1 X123.000 Y110.000 F1000.0',
  ]);
  assert.deepEqual(corp(dupa('4 L-ul, stânga'), '(e/l: cale, stanga, 3 mm)', 4), ['G0 X20.000 Y13.000', 'G1 Z-3.000 F300.0', 'G1 X117.000 Y13.000 F1000.0', 'G1 X117.000 Y110.000 F1000.0']);
  assert.deepEqual(corp(dupa('9 oglindirea'), '(m/l: cale, stanga, 3 mm)', 3), ['G0 X50.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X150.000 Y53.000 F1000.0']);
});

test('(a) 4, stânga: colțul concav lasă 9 − 9π/4 ≈ 1,93 mm² (nicio rotire în jurul vârfului, centrul în intersecția offseturilor)', () => {
  const j = pregateste(regiuneDinDocument(V4('stanga', 'urcare')).pereti![0]!)!;
  const id = idealValid(j, 3);
  // Nicio piesă ideală validă nu e evantai (colțul nu e convex dinspre sculă), iar (117, 13) e pe două porțiuni valide.
  assert.ok(id.tronsoane.every((t) => !/evantai/.test(t.piesa.unde)));
  assert.equal(Number((9 - (9 * Math.PI) / 4).toFixed(2)), 1.93);
  assert.equal(judecaPunct(j, pt(117, 13), 3).v, 'ok');
});

test('(a) 5, cârligul: o singură porțiune validă pe prima latură, până la x = 42,172 (în lume 92,172)', () => {
  const doc = corecteParte().find((c) => c.nume.startsWith('5 '))!.doc;
  const j = pregateste(regiuneDinDocument(doc).pereti![0]!)!;
  const id = idealValid(j, 3);
  assert.equal(id.tronsoane.length, 1);
  const t = id.tronsoane[0]!;
  // Marginea poartă marja de validitate (R − 1e-5): se mută cu ~1e-5 mm (precizarea 2.3c-4).
  assert.ok(Math.abs(t.piesa.la(t.b).x - (50 + 45 - Math.sqrt(8))) < 1e-4, `${t.piesa.la(t.b).x}`);
  assert.deepEqual(id.capete.map((c) => c.valid), [true, false]);
});

test('(a) 7, V-ul de 10°: centrul se oprește la R / sin 5° = 34,421 mm de vârf (cota din program)', () => {
  const c = corecteParte().find((x) => x.nume.startsWith('7 '))!;
  assert.ok(c.text.includes('G1 X150.000 Y84.421 F1000.0'), c.text);
  assert.equal((3 / Math.sin((5 * Math.PI) / 180)).toFixed(3), '34.421');
});

// ── (b) Regiunea ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('(b) pereții: partea în lume = latura XOR (det < 0); K nu se schimbă; un document fără tăieturi pe o parte n-are pereți', () => {
  const p1 = regiuneDinDocument(V1('stanga')).pereti!;
  assert.equal(p1.length, 1);
  assert.equal(p1[0]!.parte, 'stanga');
  assert.deepEqual(p1[0]!.contur.capete, [{ x: 10, y: 50 }, { x: 110, y: 50 }]);
  assert.equal(regiuneDinDocument(V1('dreapta')).pereti![0]!.parte, 'dreapta');
  assert.equal(regiuneDinDocument(V9()).pereti![0]!.parte, 'dreapta', 'oglindirea inversează partea în lume');
  assert.equal(regiuneDinDocument(V1('stanga')).inele.length, 0);
  for (const d of [D1(), D5(), ...corecte().map((c) => c.doc)]) assert.equal(regiuneDinDocument(d).pereti, undefined);
  // Tăietura pe o parte intră în hărțile tăieturilor (eticheta se leagă de operație), cu `inchis: false`.
  const t = regiuneDinDocument(V1('stanga', 'opozitie')).taieturi.get('a/l')!;
  assert.deepEqual([...t.laturi], [['stanga', [3]]]);
  assert.deepEqual([...t.sensuri], [['stanga', ['opozitie']]]);
  assert.equal(t.inchis, false);
});

test('(b) stânga și dreapta pe același element: peretele rămâne (margine), fără parte; refuzul §9 e o încălcare', () => {
  const doc = V1('stanga');
  const op = doc.piese[0]!.operatii[0]!;
  const ambele: DocV10O = { ...doc, piese: [{ ...doc.piese[0]!, operatii: [op, { ...op, id: 'op2', latura: 'dreapta' }] }] };
  const reg = regiuneDinDocument(ambele);
  assert.equal(reg.pereti!.length, 1);
  assert.equal(reg.pereti![0]!.parte, null);
  const text = programParte([{ idLume: 'a/l', latura: 'stanga', adancime: 3, bucati: [TRASEE.v1.stangaUrcare] }, { idLume: 'a/l', latura: 'dreapta', adancime: 3, bucati: [TRASEE.v1.dreaptaUrcare] }]);
  const v = poarta(text, ctxP(ambele));
  assert.ok(v.some((i) => i.invarianta === 2 && i.linia === 0 && /are tăieturi și pe stânga, și pe dreapta/.test(i.mesaj)), arata(v));
});

test('(b) §6: U-ul de 5 mm, stânga: niciun punct ideal valid, deci exportul trebuia refuzat (pe document, chiar fără etichetă)', () => {
  const reg = regiuneDinDocument(V6('stanga'));
  assert.equal(idealValid(pregateste(reg.pereti![0]!)!, 3).tronsoane.length, 0);
  const v = poarta(programLinii([]), ctxP(V6('stanga')));
  assert.ok(v.some((i) => i.invarianta === 14 && i.linia === 0 && /scula nu încape nicăieri pe partea cerută a lui u\/u/.test(i.mesaj)), arata(v));
  assert.ok(v.some((i) => i.invarianta === 14 && /lipsește din program/.test(i.mesaj)), arata(v));
  // Pe dreapta (în afară) încape: 6 vârfuri, colțurile convexe ca arce R3 (valoarea 6), deci niciun refuz.
  assert.ok(idealValid(pregateste(regiuneDinDocument(V6('dreapta')).pereti![0]!)!, 3).tronsoane.length > 0);
});

// ── (c) Valorile 10, 11, 12 ──────────────────────────────────────────────────────────────────────────────────────────

/** Liniile de sub o etichetă: de la ea până la următoarea etichetă. */
function subEticheta(text: string, eticheta: string): [number, number] {
  const a = liniaLui(text, eticheta);
  const linii = text.split('\n');
  let b = linii.length;
  for (let k = a; k < linii.length; k++) if (/^\([A-Za-z0-9_-]+\/[A-Za-z0-9_-]+: /.test(linii[k]!)) { b = k; break; }
  return [a, b];
}

for (const c of cazuriRegiune()) {
  test(`(c) ${c.nume}`, () => {
    const v = poarta(c.text, ctxP(c.doc));
    for (const x of c.cere) {
      const [a, b] = subEticheta(c.text, x.eticheta);
      assert.ok(v.some((i) => i.invarianta === 2 && i.linia > a && i.linia <= b && x.tipar.test(i.mesaj)), `lipsește ${x.eticheta} ${x.tipar}\n${arata(v)}`);
    }
    for (const e of c.curate) {
      const [a, b] = subEticheta(c.text, e);
      assert.deepEqual(v.filter((i) => i.linia >= a && i.linia <= b), [], `sub ${e}:\n${arata(v)}`);
    }
  });
}

// ── (d) Martorii negativi ────────────────────────────────────────────────────────────────────────────────────────────

const martori = martoriParte();
for (const m of martori) {
  test(`(d) martorul ${m.nume}: prins`, () => {
    const v = poarta(m.text, ctxP(m.doc));
    for (const c of m.cere) {
      assert.ok(v.some((i) => i.invarianta === c.invarianta && i.linia === c.linia && c.tipar.test(i.mesaj)), `${m.nume}: lipsește [${c.invarianta}] ${c.linia} ${c.tipar}\n${arata(v)}`);
    }
  });
}

test('(d) martorii ceruți sunt toți aici', () => {
  const nume = martori.map((m) => m.nume).join('\n');
  for (const x of [
    /partea inversată \(Y47 în loc de Y53\)/, /mersul invers la urcare/, /prelungit .* dincolo de normala capătului/, /ocolește capătul/,
    /oglindirea fără XOR/, /zig-zag-ul la a doua trecere/, /lanțul concav/, /linia oprită la 1 mm/, /în X/, /bucată scăpată/,
  ]) assert.match(nume, x);
  assert.ok(martori.length >= 20, `${martori.length}`);
});

// ── (e) Sensul, din modelul așchiei ─────────────────────────────────────────────────────────────────────────────────

test('(e) urcare ⇔ τ × v > 0 iese din modelul așchiei (materialul păstrat în dreapta mersului la urcare cu M3)', () => {
  assert.equal(parteaPastrataPrinAschie('urcare'), 'dreapta');
  assert.equal(parteaPastrataPrinAschie('opozitie'), 'stanga');
});

test('(e) tabelul §6 iese din poartă: pe linia (10,50)→(110,50), doar direcția din tabel trece invarianta 9', () => {
  // parteaLume × sens → „ca desenul” (de la X10 la X110) sau „invers”, pe ambele părți.
  const tabel = { stanga: { urcare: 'ca desenul', opozitie: 'invers' }, dreapta: { urcare: 'invers', opozitie: 'ca desenul' } } as const;
  for (const latura of ['stanga', 'dreapta'] as const) {
    for (const sens of ['urcare', 'opozitie'] as const) {
      const y = latura === 'stanga' ? '53.000' : '47.000';
      const drum = (desen: boolean): string => peHartieLinie(latura, y, desen);
      const v9 = (desen: boolean): Incalcare[] => poarta(drum(desen), ctxP(V1(latura, sens))).filter((i) => i.invarianta === 9);
      const bun = tabel[latura][sens] === 'ca desenul';
      assert.deepEqual(v9(bun), [], `${latura} ${sens}: ${tabel[latura][sens]}`);
      assert.ok(v9(!bun).length > 0, `${latura} ${sens}: direcția cealaltă trebuia prinsă`);
    }
  }
});

function peHartieLinie(latura: 'stanga' | 'dreapta', y: string, caDesenul: boolean): string {
  const [a, b] = caDesenul ? ['10.000', '110.000'] : ['110.000', '10.000'];
  return programLinii([`(a/l: cale, ${latura}, 3 mm)`, `G0 X${a} Y${y}`, 'G1 Z-3.000 F300.0', `G1 X${b} Y${y} F1000.0`, 'G0 Z5.000']);
}

// ── (f) Toleranțele și picioarele la egalitate ───────────────────────────────────────────────────────────────────────

test('(f) 14 (ii) la tolII = 0,0046: linia decalată cu 0,004 trece, cu 0,006 nu (înainte și acoperirea)', () => {
  assert.equal(tolII(false), 0.0046);
  assert.ok(Math.abs(tolII(true) - 0.0057) < 1e-12);
  const prog = (y: string): string => programLinii(['(a/l: cale, stanga, 3 mm)', `G0 X10.000 Y${y}`, 'G1 Z-3.000 F300.0', `G1 X110.000 Y${y} F1000.0`, 'G0 Z5.000']);
  assert.deepEqual(poarta(prog('53.004'), ctxP(V1('stanga'))), []);
  const v = poarta(prog('53.006'), ctxP(V1('stanga')));
  assert.ok(v.some((i) => i.invarianta === 14 && /iese de pe offsetul ideal/.test(i.mesaj)), arata(v));
  assert.ok(v.some((i) => i.invarianta === 14 && /nu acoperă offsetul ideal/.test(i.mesaj)), arata(v));
});

test('(f) precizarea 2.3c-4: startul zig-zag-ului dens e „la egalitate”; judecat doar față de capăt ar cădea în capac', () => {
  const j = pregateste(regiuneDinDocument(VZ()).pereti![0]!)!;
  const h = Math.sqrt(9 - 0.25);
  // Startul exact și startul rotunjit al postului (mutat cu ~0,0009 spre capătul căii): amândouă corecte, prin vârful V2.
  for (const q of [pt(50.5, 100 - h), pt(50.4993, 100 - h + 0.0005)]) {
    assert.equal(judecaPunct(j, q, 3).v, 'ok', `${q.x}, ${q.y}`);
    const ps = picioare(j, q, TOL_EGALITATE, 3);
    const capat = ps.find((x) => x.k === 0 && x.loc === 'start');
    const varf = ps.find((x) => x.k === 1 && x.loc === 'capat') ?? ps.find((x) => x.k === 2 && x.loc === 'start');
    assert.ok(capat && varf, JSON.stringify(ps));
    // Judecat doar față de capătul căii, punctul e în capac; față de vârful V2, în evantaiul lui.
    assert.equal(judecaFataDe(j, q, capat).v, 'capac');
    assert.equal(judecaFataDe(j, q, varf).v, 'ok');
  }
  // Mutat spre capăt, piciorul cel mai apropiat e chiar capătul: fără egalitate (toleranța 0), punctul ar fi refuzat.
  const rotunjit = pt(50.4993, 100 - h + 0.0005);
  assert.deepEqual(picioare(j, rotunjit, 0, 3).map((x) => [x.k, x.loc]), [[0, 'start']]);
  const ideal = idealValid(j, 3);
  assert.deepEqual(ideal.capete.map((c) => c.valid), [false, false], 'pe zig-zag-ul dens, normalele capetelor nu sunt valide');
});

test('(f) capătul: pe normală (la tolII) trece; la 0,01 mm dincolo de ea, capac', () => {
  const j = pregateste(regiuneDinDocument(V1('stanga')).pereti![0]!)!;
  assert.equal(judecaPunct(j, pt(10 - 0.004, 53), 3).v, 'ok');
  assert.equal(judecaPunct(j, pt(10 - 0.01, 53), 3).v, 'capac');
  assert.equal(judecaPunct(j, pt(10, 47), 3).v, 'partea');
  assert.equal(judecaPunct(j, pt(60, 47), 3).v, 'partea');
  assert.equal(judecaPunct(j, pt(60, 53), 3).v, 'ok');
});

// ── (g) Modul de dinainte și echivalența ─────────────────────────────────────────────────────────────────────────────

test('(g) poarta de dinainte (inainteDe0037) citește stânga / dreapta ca etichete stricate și nu spune nimic din 2.3c-5', () => {
  for (const c of [...corecteParte(), ...martori]) {
    const vechi = poarta(c.text, ctxP(c.doc), { inainteDe0037: true });
    assert.equal(vechi.filter((i) => NOI.test(i.mesaj)).length, 0, `${c.nume}: ${arata(vechi)}`);
    if (/\((stanga|dreapta)|, (stanga|dreapta), /.test(c.text)) {
      assert.ok(vechi.some((i) => i.invarianta === 2 && /etichetă de nerecunoscut: „\([A-Za-z0-9_-]+\/[A-Za-z0-9_-]+: cale, (stanga|dreapta), /.test(i.mesaj)), `${c.nume}: ${arata(vechi)}`);
    }
  }
});

test('(g) echivalența: pe programele fără tăieturi pe o parte (căile deschise pe linie, 14 (i), documentele v9 → v10), nimic din 2.3c-5', () => {
  const programe: Array<readonly [string, string, ReturnType<typeof ctxD>]> = [
    ...corecte().map((c) => [c.nume, c.text, ctxD(c.doc)] as const),
    ...martoriDeschise().map((m) => [m.nume, m.text, ctxD(m.doc)] as const),
    ...[['ed5cd65', PROGRAM_ED5CD65, docMartor(1)], ['reparat', PROGRAM_REPARAT, docMartor(1)], ...martori14().map((m) => [m.nume, m.text, m.doc] as const)].map(
      ([n, t, d]) => [n as string, t as string, { ...ctx14(d as never), regiune: regiuneDinDocument(migreazaV9V10O(d as never)) }] as const,
    ),
  ];
  for (const [nume, text, ctx] of programe) {
    assert.equal(ctx.regiune!.pereti, undefined, nume);
    const { evenimente } = citeste(text);
    const et = citeste(text).comentarii.flatMap((c) => { const e = citesteEticheta(c.text); return e === null ? [] : [{ linia: c.linia, eticheta: e === 'stricata' ? null : e }]; });
    assert.deepEqual(verificaPeOParte(evenimente, et, ctx.regiune!, (m) => parteaDeTaiere(m, ctx), (p) => laDocument(p, ctx), 3), [], nume);
    assert.equal(poarta(text, ctx).filter((i) => NOI.test(i.mesaj)).length, 0, nume);
  }
  assert.ok(programe.length >= 30, `${programe.length}`);
});

test('(g) peretele unei căi pe o parte e conturul ei deschis (fără coarda de închidere), în lume', () => {
  const c = regiuneDinDocument(VG()).pereti![0]!.contur;
  assert.equal(c.deschis, true);
  assert.equal(c.primitive.length, 4);
  assert.deepEqual(c.capete, [{ x: 50, y: 50 }, { x: 100, y: 52 }]);
});
