/**
 * Banda îngustă din jurul dopului în V și decuparea lui (ADR 0172), pe oracolul potrivirii (`test/oracles/incrustatie.ts`):
 * cazurile în V de pe hârtie (`incrustatie.cazuri.ts`), cu `jurDop: 'banda'` și decuparea prin placa de grosime T, cu punți.
 * Contractul, scris aici din nou din ADR (c = 0,5 mm, t = tan(θ/2), Ø: freza decupării, implicit cea a fundului plat):
 * - banda cea mai îngustă: M = 2·H·t + max(Ø fundului plat, Ø decupării) + 2c; semifabricatul e cutia desenului cu
 *   M + S·t + marginea pe fiecare parte, oglindit ca la fața coborâtă; înainte de decupare, inelul tăieturii (între e și
 *   e + Ø de desen) e chiar fundul benzii, la S + H: tăietura stă toată pe fundul plat (de aici lățimea cea mai mică);
 * - tăietura lasă piesa păstrată până la e = H·t + c de desen (în unghiurile intrânde, cel mult e + Ø/2);
 * - întoarsă, piesa păstrată (punțile rupte) se oprește la S = D − g, cu pereții în contact, g sub dop și H între plăci;
 * - punțile: câte cere documentul pe buclă, sau câte încap pe o buclă mică (golurile desenului nu se decupează), groase de gp
 *   de la fundul plăcii, fiecare cu palierul cel puțin cât lățimea cerută; între ele, tăietura trece prin placă.
 * Lângă cazurile pe hârtie, rama din patru bare separate, la 1 mm una de alta: tăietura le ocolește pe toate (reuniunea), iar
 * golul dinăuntru (lemnul de la fața plăcii, la peste M de bare) se taie afară, altfel piesa păstrată s-ar opri pe placă. Și
 * litera „i”: bucla mică a punctului primește câte punți încap (3 din 4), cu avertismentul, în loc să refuze tot exportul.
 * Controlul negativ: banda fără decupare lasă placa întreagă, care se oprește pe fața plăcii (nu la S). Un document de
 * dinainte de v22, cu banda aleasă, dar fără valorile ei, se taie cu cele implicite (decuparea, placa S + H + 1, 4 punți).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { masoaraPotrivirea, suprafataPeScule, laDesen, cutieDesen } from '../oracles/incrustatie.ts';
import { CAZURI_INCRUSTATIE, type CazIncrustatie } from '../oracles/incrustatie.cazuri.ts';
import type { PunctO } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { documentCaz } from './ajutor-incrustatie.ts';

const TOL = 0.05;
const CELULA = 0.1;
const REZERVA = 0.5;
/** Punțile din document și placa, cu vârful punților sub fundul benzii (ca oracolul să le deosebească). */
const PUNTI = { numar: 4, latime: 4, grosime: 1 } as const;
const placa = (c: CazIncrustatie): number => c.D - c.g + c.H + PUNTI.grosime + 0.5;

/** Documentul v22 al cazului, cu banda (și decuparea, la cerere). */
function documentBanda(c: CazIncrustatie, decupare = true): unknown {
  const d = documentCaz(c) as { schema: number; piese: { operatii: { incrustatie: Record<string, unknown> }[] }[] };
  d.schema = 22;
  const inc = d.piese[0]!.operatii[0]!.incrustatie;
  inc['jurDop'] = 'banda';
  inc['banda'] = { decupare, grosimePlaca: placa(c), punti: { ...PUNTI } };
  return d;
}

const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};

/** Sculele unui program: la pornire, freza dreaptă dacă programul o schimbă, apoi pe rând, după `T… M6`. */
function scule(text: string, c: CazIncrustatie): SculaOracol[] {
  const v: SculaOracol = { tip: 'v', diametru: c.v.diametru, unghi: c.v.unghi };
  const dreapta: SculaOracol = { tip: 'plata', diametru: c.dreapta.diametru };
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  // T1 e freza dreaptă, T2 freza în V (documentul cazului); prima bucată e a frezei montate la pornire.
  const dupa = (n: number): SculaOracol => (n === 2 ? v : dreapta);
  const pornire = m6.length === 0 ? 2 : (m6[0] === 2 ? 1 : 2);
  return [pornire, ...m6].map(dupa);
}

const tan = (c: CazIncrustatie): number => Math.tan((c.v.unghi * Math.PI) / 360);
const bara = (x: number, y: number, w: number, h: number): PunctO[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
/**
 * Rama: patru bare de 4 mm, la 1 mm una de alta, în jurul unui pătrat de 16 × 14 (V60, D 3, g 0,5, H 2, Ø3). Pe hârtie: M =
 * 6,309, deci centrul (162, 72), la 8 mm de fiecare bară, e lemn de la fața plăcii (un gol al benzii); e + r = 3,155 unește
 * barele (golurile de 1 mm) într-un inel cu un gol de 9,7 × 9,7, tăiat pe linie, fără punți.
 */
const RAMA: CazIncrustatie = {
  id: 'rama', desen: [bara(150, 60, 24, 4), bara(150, 80, 24, 4), bara(150, 65, 4, 14), bara(170, 65, 4, 14)], v: { diametru: 6, unghi: 60 },
  dreapta: { diametru: 3, pasLateral: 1.2 }, D: 3, g: 0.5, H: 2, margine: 5, pas: 1.5, fundPlat: true,
  hartie: 'patru bare separate: reuniunea tăieturii le ocolește pe toate, iar golul ei (cu lemnul de la fața plăcii) se taie afară',
};
/**
 * Litera „i”: bara 1,6 × 10 și punctul R0,8, la 9 mm deasupra (V60, D 3, g 0,5, H 2, Ø3). Buclele decupării, la e + r = 3,155
 * de desen, sunt separate; bucla punctului (2π·(0,8 + 3,155) ≈ 24,85 mm) primește 3 punți din cele 4 (palierul 4 + 3 = 7,
 * 0,9·24,85 / 7 = 3,2), bara pe toate 4, deci 7 pe inel, cu avertismentul buclei mici (înainte, tot exportul era refuzat).
 */
const punctI = (cx: number, cy: number, r: number, n = 72): PunctO[] => Array.from({ length: n }, (_, k): PunctO => [cx + r * Math.cos((2 * Math.PI * k) / n), cy + r * Math.sin((2 * Math.PI * k) / n)]);
const LITERA_I: CazIncrustatie = {
  id: 'i', desen: [bara(20, 120, 1.6, 10), punctI(20.8, 139.8, 0.8)], v: { diametru: 6, unghi: 60 }, dreapta: { diametru: 3, pasLateral: 1.2 },
  D: 3, g: 0.5, H: 2, margine: 5, pas: 1.5, fundPlat: false,
  hartie: 'un „i”: punctul, o buclă mică a decupării, primește mai puține punți (3), cu avertismentul',
};
/** Câte punți pe inel așteaptă hârtia: 4 pe fiecare buclă, iar la „i”, 4 pe bară și 3 pe punct. */
const puntiPeInel = (c: CazIncrustatie): number => (c.id === 'i' ? PUNTI.numar + 3 : PUNTI.numar);
const latimeMinima = (c: CazIncrustatie): number => 2 * c.H * tan(c) + c.dreapta.diametru + 2 * REZERVA;

for (const c of [...CAZURI_INCRUSTATIE, RAMA, LITERA_I]) {
  test(`banda cu decupare, ${c.id}: piesa păstrată se oprește la S, pereții se ating, g sub dop, H între plăci, ${puntiPeInel(c)} punți pe inel`, async () => {
    const r = await calculeazaExport(deschis(documentBanda(c)), { origine: 'stanga-jos', z0: 'sus' });
    if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
    const mica = r.avertismente.filter((a) => a.includes('bucl') && a.includes('mai puține punți'));
    assert.deepEqual(mica, c.id === 'i' ? ['dopul i/a0: pe o buclă mică încap mai puține punți decât cele 4 cerute (cel puțin 3 pe buclă)'] : [], `${c.id}: avertismentul buclelor mici`);
    assert.equal(r.dopuri.length, 1);
    const dop = r.dopuri[0]!;
    const t = tan(c), S = c.D - c.g, T = placa(c), M = latimeMinima(c), e = c.H * t + REZERVA;
    const margine = M + S * t + c.margine;
    // Semifabricatul: cutia desenului cu banda, șanțul de la față și marginea; placa exactă.
    const { x0, y0, x1, y1 } = cutieDesen(c.desen);
    assert.ok(Math.abs(dop.semifabricat.latime - (x1 - x0 + 2 * margine)) < 1e-6, `lățimea semifabricatului ${dop.semifabricat.latime}`);
    assert.ok(Math.abs(dop.semifabricat.inaltime - (y1 - y0 + 2 * margine)) < 1e-6, `înălțimea semifabricatului ${dop.semifabricat.inaltime}`);
    assert.equal(dop.semifabricat.grosimeMinima, T);
    assert.equal(dop.semifabricat.exacta, true);
    const locas = r.program.text, textDop = dop.program.text;
    const m = masoaraPotrivirea(
      { text: locas, scule: scule(locas, c) }, { text: textDop, scule: scule(textDop, c) }, c.desen,
      { D: c.D, g: c.g, H: c.H, margine, unghi: c.v.unghi, celula: CELULA, lat: Math.min(margine, e + c.dreapta.diametru + 1), decupare: { grosimePlaca: T, grosimePunte: PUNTI.grosime } },
    );
    const unde = `${c.id}: oprirea ${m.asezare.toFixed(4)}; contactul ${(m.contact * 100).toFixed(1)} % din ${m.nContact}; sub ${JSON.stringify(m.sub)}; între ${JSON.stringify(m.intre)}; păstrate ${m.pastrate}, întinderea ${m.intindere.toFixed(3)} (e = ${e.toFixed(3)})`;
    assert.ok(Math.abs(m.asezare - S) <= TOL, `oprirea la S = ${S}: ${unde}`);
    assert.ok(m.nContact > 0 && m.contact >= 0.95, `pereții în contact: ${unde}`);
    if (c.fundPlat) assert.ok(m.sub.n > 0 && m.sub.min >= c.g - TOL && m.sub.max <= c.g + TOL, `g sub dop: ${unde}`);
    assert.ok(m.intre.n > 0 && m.intre.min >= c.H - TOL && m.intre.max <= c.H + TOL, `H între plăci, pe fundul benzii păstrat: ${unde}`);
    assert.ok(m.intindere >= e - 2 * CELULA && m.intindere <= e + c.dreapta.diametru / 2 + 2 * CELULA, `piesa păstrată până la e: ${unde}`);
    // Punțile: pe inelul tăieturii (între e și e + Ø de desen), bucățile netăiate până jos, la grosimea punții de la fund.
    const lat = e + c.dreapta.diametru + 1;
    const g0x = x1 + margine - (x0 - lat) - Math.ceil((x1 - x0 + 2 * lat) / CELULA) * CELULA;
    const nx = Math.ceil((x1 - x0 + 2 * lat) / CELULA), ny = Math.ceil((y1 - y0 + 2 * lat) / CELULA);
    const grila = { x0: g0x, y0: y0 - lat - y0 + margine, latime: nx * CELULA, inaltime: ny * CELULA, celula: CELULA };
    const Mg = suprafataPeScule(textDop, grila, scule(textDop, c));
    // Înainte de decupare (programul până la ultima schimbare de freză): inelul tăieturii e chiar fundul benzii, la S + H, deci
    // tăietura stă toată pe fundul plat (ADR 0172, lățimea cea mai mică: „iar tăietura să stea pe el”).
    const inainte = textDop.slice(0, [...textDop.matchAll(/^T\d+ M6$/gm)].at(-1)!.index);
    const Mf = suprafataPeScule(inainte, grila, scule(inainte, c));
    const punte = new Uint8Array(nx * ny);
    let inel = 0, prin = 0, peFund = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 - lat + (i + 0.5) * CELULA, y = y0 - lat + (j + 0.5) * CELULA;
      const { d, inauntru } = laDesen(c.desen, x, y);
      if (inauntru || d < e + 0.3 || d > e + c.dreapta.diametru - 0.3) continue;
      inel++;
      const z = -Mg.z[j * nx + (nx - 1 - i)]!;
      if (z >= T - 0.05) prin++;
      if (Math.abs(z - (T - PUNTI.grosime)) < 0.05) punte[j * nx + i] = 1;
      if (Math.abs(-Mf.z[j * nx + (nx - 1 - i)]! - (S + c.H)) <= 0.05) peFund++;
    }
    assert.ok(peFund >= 0.99 * inel, `${c.id}: înainte de decupare, inelul tăieturii pe fundul benzii: ${peFund} din ${inel}`);
    // Bucățile, cu vecinii pe 8; o celulă izolată la capătul unei punți (arcul frezei, pe grila de 0,1 mm: măsurat la stea,
    // câte una lângă două dintre cele 4 punți de ~620 de celule) e o firimitură a grilei, nu o punte: sub FIRIMITURA, nu se numără.
    const FIRIMITURA = 20;
    // Palierul unei punți, pe inelul măsurat (lat de Ø − 0,6): cel puțin cât lățimea cerută (măsurat: 1,1–1,2 din ea; rampele
    // punților lucrării urcă treptat de o parte și de alta).
    const palier = (PUNTI.latime * (c.dreapta.diametru - 0.6)) / (CELULA * CELULA);
    const paliere: number[] = [];
    let bucati = 0;
    const vazut = new Uint8Array(nx * ny);
    for (let k = 0; k < nx * ny; k++) {
      if (!punte[k] || vazut[k]) continue;
      let celule = 0;
      const coada = [k];
      vazut[k] = 1;
      while (coada.length > 0) {
        const q = coada.pop()!, i = q % nx, j = (q - i) / nx;
        celule++;
        for (let jj = j - 1; jj <= j + 1; jj++) for (let ii = i - 1; ii <= i + 1; ii++) {
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
          const kk = jj * nx + ii;
          if (punte[kk] && !vazut[kk]) { vazut[kk] = 1; coada.push(kk); }
        }
      }
      if (celule >= FIRIMITURA) { bucati++; paliere.push(celule); }
    }
    assert.ok(inel > 0, `${c.id}: inelul tăieturii are celule`);
    assert.equal(bucati, puntiPeInel(c), `${c.id}: punțile pe inel (${bucati})`);
    for (const k of paliere) assert.ok(k >= 0.8 * palier && k <= 1.6 * palier, `${c.id}: palierul unei punți, ${k} celule din ~${palier.toFixed(0)}`);
    // Între punți (și rampele lor), tăietura trece prin placă: măsurat, 26–51 % din inel.
    assert.ok(prin >= 0.1 * inel, `${c.id}: tăiat prin placă ${prin} din ${inel}`);
  });
}

test('un document de dinainte de v22, cu banda aleasă și fără valorile ei: decuparea, placa S + H + 1 exactă, cea mai mică bandă', async () => {
  const c = CAZURI_INCRUSTATIE.find((x) => x.id === 'dreptunghi')!;
  const d = documentCaz(c) as { schema: number; piese: { operatii: { incrustatie: Record<string, unknown> }[] }[] };
  d.schema = 21;
  d.piese[0]!.operatii[0]!.incrustatie['jurDop'] = 'banda';
  const r = await calculeazaExport(deschis(d), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const dop = r.dopuri[0]!;
  const t = tan(c), S = c.D - c.g, margine = latimeMinima(c) + S * t + c.margine;
  assert.equal(dop.semifabricat.exacta, true);
  assert.equal(dop.semifabricat.grosimeMinima, S + c.H + 1);
  const { x0, x1 } = cutieDesen(c.desen);
  assert.ok(Math.abs(dop.semifabricat.latime - (x1 - x0 + 2 * margine)) < 1e-6, `lățimea semifabricatului ${dop.semifabricat.latime}`);
  // Fundul, pereții, decuparea: două schimbări de freză; punțile implicite: 4 pe buclă.
  assert.equal((dop.program.text.match(/^T\d+ M6$/gm) ?? []).length, 2);
});

test('controlul negativ: banda fără decupare lasă placa întreagă, care se oprește pe fața plăcii, nu la S', async () => {
  const c = CAZURI_INCRUSTATIE.find((x) => x.id === 'dreptunghi')!;
  const r = await calculeazaExport(deschis(documentBanda(c, false)), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const dop = r.dopuri[0]!;
  // Fără decupare, placa are „cel puțin” S + H + 1, ca la fața coborâtă.
  assert.equal(dop.semifabricat.exacta, undefined);
  const t = tan(c), S = c.D - c.g, margine = latimeMinima(c) + S * t + c.margine;
  const m = masoaraPotrivirea(
    { text: r.program.text, scule: scule(r.program.text, c) }, { text: dop.program.text, scule: scule(dop.program.text, c) }, c.desen,
    { D: c.D, g: c.g, H: c.H, margine, unghi: c.v.unghi, celula: CELULA, lat: margine },
  );
  assert.ok(m.asezare < S - 1, `oprirea ${m.asezare.toFixed(4)}: placa întreagă trebuie să se oprească pe fața plăcii`);
});

test('o punte prea lată pentru bucla mică a punctului din „i” (palierul 30 + 3): refuzul, cu bucla, lungimea și sfatul', async () => {
  // Pe hârtie: bucla punctului are ~24,85 mm, deci nici o punte cu palierul de 33 mm nu încape (0,9·24,85 = 22,4).
  const d = documentBanda(LITERA_I) as { piese: { operatii: { incrustatie: { banda: Record<string, unknown> } }[] }[] };
  d.piese[0]!.operatii[0]!.incrustatie.banda['punti'] = { numar: 4, latime: 30, grosime: 1 };
  const r = await calculeazaExport(deschis(d), { origine: 'stanga-jos', z0: 'sus' });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.motiv, /^i\/a0, decuparea dopului: bucla \d a decupării, de 24\.8\d* mm, e prea mică pentru o punte cu palierul de 33 mm \(lățimea plus freza\): micșorează punțile$/);
});
