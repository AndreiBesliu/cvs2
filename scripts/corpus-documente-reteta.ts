/**
 * Rețeta corpusului de aur al documentului (ADR 0121): proiectul de probă al unui atelier, salvat de aplicația fiecărei
 * versiuni a schemei. Rulează în codul unei versiuni (sursele ei, scoase din git de `corpus-documente.ts --istorie`) și
 * folosește doar ce are orice versiune: `documentNou`, `operatieImplicita` (din v3), ușa `incarca` și `jsonCanonic`.
 *
 * Proiectul trăiește prin versiuni, ca al unui om: versiunea N deschide salvarea versiunii N − 1 cu ușa ei (deci cu
 * migrarea ei), adaugă ce a adus versiunea N (v2 grupul și a doua instanță, v3 operațiile … v22 banda dopului în V), apoi
 * salvează, după ce ușa ei a primit documentul neschimbat. v1 îl desenează de la zero. `gol` e documentul nou al lui v1.
 *
 *   node scripts/corpus-documente-reteta.ts <salvarea N − 1 | -> <ieșirea> proiect|gol [<deschis>]
 *
 * Cu `<deschis>`, rețeta scrie și documentul deschis de ușa versiunii N din salvarea N − 1, înaintea adăugirii: ce a făcut
 * atunci migrarea N − 1 → N. Proba corpusului îl compară cu migrarea de azi.
 *
 * O versiune nouă (v23) își scrie aici adăugirea, la `ADAUGIRI[23]`, cu câmpul ei.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as D from '../src/model/document.ts';
import { incarca, jsonCanonic } from '../src/model/incarcare.ts';

type Obj = Record<string, any>;

const N: number = (D as Obj)['VERSIUNE_SCHEMA'];
const [intrare, iesire, fel, deschis] = process.argv.slice(2);
if (!intrare || !iesire || (fel !== 'proiect' && fel !== 'gol')) throw new Error('folosire: <salvarea N − 1 | -> <ieșirea> proiect|gol [<deschis>]');

const STOC = { latime: 600, inaltime: 400, grosime: 18 };
const rad = (grade: number): number => (grade * Math.PI) / 180;
/** Rotirea cu translația, calculată ca în aplicație (cosinusul și sinusul, cu ultimele lor zecimale). */
const rot = (grade: number, e = 0, f = 0) => ({ a: Math.cos(rad(grade)), b: Math.sin(rad(grade)), c: -Math.sin(rad(grade)), d: Math.cos(rad(grade)), e, f });
const tr = (e: number, f: number, k = 1) => ({ a: k, b: 0, c: 0, d: k, e, f });

const piesa = (d: Obj, id: string): Obj => {
  const p = d['piese'].find((x: Obj) => x['id'] === id);
  if (!p) throw new Error(`v${N}: lipsește piesa ${id}`);
  return p;
};
/** Prima operație a piesei (fiecare piesă a proiectului are una). */
const op = (d: Obj, id: string): Obj => {
  const o = piesa(d, id)['operatii']?.[0];
  if (!o) throw new Error(`v${N}: piesa ${id} n-are operație`);
  return o;
};
const operatie = (id: string, forma: Obj): Obj => (D as Obj)['operatieImplicita'](id, forma);
/** O piesă nouă cu un singur element, pe foaia 1, cu operația implicită a versiunii, peste care se pun valorile date. */
function adaugaPiesa(d: Obj, id: string, forma: Obj, x: number, y: number, valori: Obj, matrice = tr(0, 0)): void {
  d['piese'].push({ id, radacina: { tip: 'element', id, forma, matrice }, operatii: [{ ...operatie(id, forma), ...valori }] });
  d['foi'][0]['instante'].push({ id, piesa: id, x, y, rotire: 0 });
}

/** v1: proiectul desenat de la zero: un capac rotit cu colțuri rotunjite, două găuri (una scalată), o plăcuță. */
function proiectV1(): Obj {
  const d: Obj = D.documentNou(STOC);
  d['elemente'].push(
    { id: 'capac', nume: 'Capac', forma: { tip: 'dreptunghi', latime: 120, inaltime: 80, razaColt: 6 }, matrice: rot(30, 120, 140) },
    { id: 'gaura-mare', forma: { tip: 'cerc', raza: 25 }, matrice: tr(400, 250) },
    { id: 'gaura-mica', forma: { tip: 'cerc', raza: 10 }, matrice: tr(300, 100, 1.5) },
    { id: 'placuta', nume: 'Plăcuță', forma: { tip: 'dreptunghi', latime: 50, inaltime: 30, razaColt: 0 }, matrice: tr(480, 60) },
  );
  d['rev'] = 4;
  return d;
}

/** Ce adaugă fiecare versiune, pe proiectul migrat de ușa ei; `rev` crește cu fiecare pas al omului. */
const ADAUGIRI: Readonly<Record<number, (d: Obj) => void>> = {
  // v2 (ADR 0024): un grup de două cercuri ca o piesă și a doua instanță a găurii mari, rotită.
  2: (d) => {
    d['piese'].push({
      id: 'pereche', nume: 'Pereche', radacina: {
        tip: 'grup', id: 'pereche', matrice: tr(0, 0), copii: [
          { tip: 'element', id: 'pereche-a', forma: { tip: 'cerc', raza: 8 }, matrice: tr(-20, 0) },
          { tip: 'element', id: 'pereche-b', forma: { tip: 'cerc', raza: 8 }, matrice: tr(20, 0) },
        ],
      },
    });
    d['foi'][0]['instante'].push({ id: 'pereche', piesa: 'pereche', x: 200, y: 300, rotire: 0 });
    d['foi'][0]['instante'].push({ id: 'gaura-mare-2', piesa: 'gaura-mare', x: 520, y: 320, rotire: 90 });
    d['rev'] += 2;
  },
  // v3 (ADR 0025): operațiile au venit din migrare; capacul se taie prin foaie cu o freză de 1/8", gaura mare mai adânc.
  3: (d) => {
    Object.assign(op(d, 'capac'), { adancime: 18.2, pas: 6.1, scula: { numar: 2, nume: 'freza 1/8', diametru: 3.175 } });
    Object.assign(op(d, 'gaura-mare'), { adancime: 10, pas: 5 });
    d['rev'] += 2;
  },
  // v4 (ADR 0027): gaura mare, în opoziție.
  4: (d) => { op(d, 'gaura-mare')['sens'] = 'opozitie'; d['rev'] += 1; },
  // v5 (ADR 0028): urechile capacului.
  5: (d) => { op(d, 'capac')['urechi'] = { numar: 4, latime: 6, grosime: 2 }; d['rev'] += 1; },
  // v6 (ADR 0029): rampa plăcuței.
  6: (d) => { op(d, 'placuta')['rampa'] = { lungime: 20 }; d['rev'] += 1; },
  // v7 (ADR 0030): intrările găurii mari.
  7: (d) => { op(d, 'gaura-mare')['intrari'] = { raza: 3 }; d['rev'] += 1; },
  // v8 (ADR 0032): plăcuța devine un locaș (interior), cu degajări dog-bone în colțuri.
  8: (d) => { Object.assign(op(d, 'placuta'), { latura: 'interior', colturi: { tip: 'dog-bone' } }); d['rev'] += 1; },
  // v9 (ADR 0034): o cale închisă, din linii, un arc și o cubică, rotită.
  9: (d) => {
    const forma = {
      tip: 'cale', inchis: true, varfuri: [
        { p: { x: 0, y: 0 }, s: { tip: 'L' } },
        { p: { x: 40, y: 0 }, s: { tip: 'A', bulge: 1 } },
        { p: { x: 40, y: 40 }, s: { tip: 'L' } },
        { p: { x: 0, y: 40 }, s: { tip: 'C', c1: { x: -15, y: 30 }, c2: { x: -15, y: 10 } } },
      ],
    };
    adaugaPiesa(d, 'semn', forma, 250, 200, { adancime: 4, pas: 2 }, rot(15));
    d['rev'] += 1;
  },
  // v10 (ADR 0037): o cale deschisă gravată pe linie; ghidajele foii (ADR 0050), unde versiunea le are.
  10: (d) => {
    const forma = {
      tip: 'cale', inchis: false, varfuri: [
        { p: { x: 0, y: 0 }, s: { tip: 'L' } },
        { p: { x: 60, y: 10 }, s: { tip: 'A', bulge: -0.4 } },
        { p: { x: 120, y: 0 }, s: { tip: 'L' } },
      ],
    };
    adaugaPiesa(d, 'linie', forma, 60, 330, { latura: 'pe-linie', adancime: 2, pas: 1 });
    if ((D as Obj)['PLAFON']?.['ghidaje'] !== undefined) d['foi'][0]['ghidaje'] = [{ id: 'g1', axa: 'x', poz: 300 }, { id: 'g2', axa: 'y', poz: 200 }];
    d['rev'] += 2;
  },
  // v11 (ADR 0069): un buzunar cu colțuri rotunjite.
  11: (d) => {
    adaugaPiesa(d, 'buzunar', { tip: 'dreptunghi', latime: 80, inaltime: 50, razaColt: 5 }, 120, 260,
      { tip: 'buzunar', latura: 'interior', adancime: 6, pas: 3, pasLateral: 2.5 });
    d['rev'] += 1;
  },
  // v12 (ADR 0076): coborârea în buzunar, în elice.
  12: (d) => { op(d, 'buzunar')['coborare'] = { fel: 'elice', unghi: 3, raza: 2 }; d['rev'] += 1; },
  // v13 (ADR 0087): o gaură de șurub cât freza, ciocănită, cu retragerea completă la a doua trecere.
  13: (d) => {
    adaugaPiesa(d, 'gaura-surub', { tip: 'cerc', raza: 3 }, 560, 40, { tip: 'gaurire', latura: 'interior', adancime: 12, pas: 4, retragereCompleta: 2 });
    d['rev'] += 1;
  },
  // v14 (ADR 0090): un V-carve cu freza V60.
  14: (d) => {
    adaugaPiesa(d, 'eticheta', { tip: 'dreptunghi', latime: 60, inaltime: 20, razaColt: 2 }, 400, 60,
      { tip: 'vcarve', latura: 'interior', adancime: 3, pas: 3, scula: { numar: 3, nume: 'V60', diametru: 12, forma: { tip: 'v', unghi: 60 } } });
    d['rev'] += 1;
  },
  // v15 (ADR 0091): fundul plat al V-carve-ului, cu o freză dreaptă.
  15: (d) => { op(d, 'eticheta')['fundPlat'] = { scula: { numar: 4, nume: 'freza plata', diametru: 3.175 }, pasLateral: 1.2 }; d['rev'] += 1; },
  // v16 (ADR 0092): gravarea pe linie cu freza de gravare (V cu vârf plat), în sens invers.
  16: (d) => {
    Object.assign(op(d, 'linie'), { scula: { numar: 5, nume: 'gravare', diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.2 } }, directie: 'invers' });
    d['rev'] += 1;
  },
  // v17 (ADR 0093): o freză de rest în buzunar.
  17: (d) => { op(d, 'buzunar')['rest'] = [{ scula: { numar: 6, nume: 'freza plata', diametru: 2 }, pasLateral: 0.8 }]; d['rev'] += 1; },
  // v18 (ADR 0094): buzunarul în linii paralele, la 45°.
  18: (d) => { op(d, 'buzunar')['strategie'] = { fel: 'paralel', unghi: 45 }; d['rev'] += 1; },
  // v19 (ADR 0133): ordinea de mână: fiecare operație primește rangul ei, în ordinea inversă a pieselor din listă.
  19: (d) => {
    const ops: Obj[] = d['piese'].flatMap((p: Obj) => p['operatii'] as Obj[]);
    ops.reverse().forEach((o, k) => { o['rang'] = k; });
    d['rev'] += 1;
  },
  // v20 (ADR 0170): eticheta V-carve devine locașul unei incrustații în V (jocul 0,5, fierăstrăul 2, marginea 5, fața coborâtă).
  20: (d) => { op(d, 'eticheta')['incrustatie'] = { fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'fata' }; d['rev'] += 1; },
  // v21 (ADR 0171): buzunarul devine locașul unei incrustații cu pereți drepți (jocul lateral 0,1, dopul ridicat, pe fund, g 0,5,
  // H 2, marginea 5), cu freza lui pentru dop (T7, Ø1,5).
  21: (d) => {
    op(d, 'buzunar')['incrustatie'] = {
      fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5,
      frezeDop: [{ scula: { numar: 7, nume: 'freza plata', diametru: 1.5 }, pasLateral: 0.6 }],
    };
    d['rev'] += 1;
  },
  // v22 (ADR 0172): dopul etichetei se taie cu banda îngustă, lată de 8 mm, decupat din placa de 6 mm cu freza lui (T8, Ø2) și
  // cu 3 punți de 5 × 1,5 mm.
  22: (d) => {
    const inc = op(d, 'eticheta')['incrustatie'];
    inc['jurDop'] = 'banda';
    inc['banda'] = {
      latime: 8, decupare: true, grosimePlaca: 6, freza: { numar: 8, nume: 'freza dreapta', diametru: 2 }, punti: { numar: 3, latime: 5, grosime: 1.5 },
    };
    d['rev'] += 1;
  },
};

let doc: Obj;
if (fel === 'gol') {
  if (N !== 1) throw new Error('documentul gol e al versiunii 1');
  doc = D.documentNou(STOC);
} else if (N === 1) {
  doc = proiectV1();
} else {
  const r = incarca(JSON.parse(readFileSync(intrare, 'utf8')));
  if (!r.ok) throw new Error(`v${N} nu deschide salvarea versiunii dinainte: ${r.motiv}`);
  doc = structuredClone(r.doc) as Obj;
  if (deschis) writeFileSync(deschis, jsonCanonic(doc));
  const adauga = ADAUGIRI[N];
  if (!adauga) throw new Error(`v${N} n-are adăugirea ei în rețetă`);
  adauga(doc);
}
// Salvarea, ca în aplicație: JSON-ul canonic; ușa versiunii trebuie s-o redeschidă neschimbată.
const text = jsonCanonic(doc);
const inapoi = incarca(JSON.parse(text));
if (!inapoi.ok) throw new Error(`v${N}: ușa refuză proiectul salvat: ${inapoi.motiv}`);
if (jsonCanonic(inapoi.doc) !== text) throw new Error(`v${N}: ușa schimbă proiectul salvat`);
writeFileSync(iesire, text);
console.log(`v${N} ${fel}: ${text.length} octeți`);
