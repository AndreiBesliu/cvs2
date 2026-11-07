/**
 * Banda îngustă din jurul dopului în V și decuparea lui (ADR 0172), pe oracolul potrivirii (`test/oracles/incrustatie.ts`):
 * cazurile în V de pe hârtie (`incrustatie.cazuri.ts`), cu `jurDop: 'banda'` și decuparea prin placa de grosime T, cu punți.
 * Contractul, scris aici din nou din ADR (c = 0,5 mm, t = tan(θ/2), Ø: freza decupării, implicit cea a fundului plat):
 * - banda cea mai îngustă: M = 2·H·t + max(Ø fundului plat, Ø decupării) + 2c; semifabricatul e cutia desenului cu
 *   M + S·t + marginea pe fiecare parte, oglindit ca la fața coborâtă;
 * - tăietura lasă piesa păstrată până la e = H·t + c de desen (în unghiurile intrânde, cel mult e + Ø/2);
 * - întoarsă, piesa păstrată (punțile rupte) se oprește la S = D − g, cu pereții în contact, g sub dop și H între plăci;
 * - punțile: câte cere documentul pe buclă (golurile desenului nu se decupează), groase de gp de la fundul plăcii.
 * Controlul negativ: banda fără decupare lasă placa întreagă, care se oprește pe fața plăcii (nu la S).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { masoaraPotrivirea, suprafataPeScule, laDesen, cutieDesen } from '../oracles/incrustatie.ts';
import { CAZURI_INCRUSTATIE, type CazIncrustatie } from '../oracles/incrustatie.cazuri.ts';
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
const latimeMinima = (c: CazIncrustatie): number => 2 * c.H * tan(c) + c.dreapta.diametru + 2 * REZERVA;

for (const c of CAZURI_INCRUSTATIE) {
  test(`banda cu decupare, ${c.id}: piesa păstrată se oprește la S, pereții se ating, g sub dop, H între plăci, ${PUNTI.numar} punți pe buclă`, async () => {
    const r = await calculeazaExport(deschis(documentBanda(c)), { origine: 'stanga-jos', z0: 'sus' });
    if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
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
    const Mg = suprafataPeScule(textDop, { x0: g0x, y0: y0 - lat - y0 + margine, latime: nx * CELULA, inaltime: ny * CELULA, celula: CELULA }, scule(textDop, c));
    const punte = new Uint8Array(nx * ny);
    let inel = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 - lat + (i + 0.5) * CELULA, y = y0 - lat + (j + 0.5) * CELULA;
      const { d, inauntru } = laDesen(c.desen, x, y);
      if (inauntru || d < e + 0.3 || d > e + c.dreapta.diametru - 0.3) continue;
      inel++;
      const z = -Mg.z[j * nx + (nx - 1 - i)]!;
      if (Math.abs(z - (T - PUNTI.grosime)) < 0.05) punte[j * nx + i] = 1;
    }
    // Bucățile, cu vecinii pe 8; o celulă izolată la capătul unei punți (arcul frezei, pe grila de 0,1 mm: măsurat la stea,
    // câte una lângă două dintre cele 4 punți de ~620 de celule) e o firimitură a grilei, nu o punte: sub FIRIMITURA, nu se numără.
    const FIRIMITURA = 20;
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
      if (celule >= FIRIMITURA) bucati++;
    }
    assert.ok(inel > 0, `${c.id}: inelul tăieturii are celule`);
    assert.equal(bucati, PUNTI.numar, `${c.id}: punțile pe inel (${bucati})`);
  });
}

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
