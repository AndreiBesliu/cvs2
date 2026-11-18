/**
 * Placa 11 (ADR 0210, felia 11.7; `docs/etape/placa-11.md`): criteriul din prag pe lemn. MDF 12, foi de 300 × 220, zero XY
 * în colțul stânga-jos al fiecărei foi, Z0 pe fața de sus. Șablonul plăcuței: rama 80 × 30, tăiată pe dinafară prin toată
 * grosimea cu freza plată Ø3,175 (T5, patru treceri de 3 mm, două urechi de 6 × 2), și textul „{Nume}” (Roboto, majuscula de
 * 8 mm, centrat pe ramă), săpat V-carve cu V90 Ø6 (T3). «Din CSV…» cu `nume.csv` (25 de rânduri, UTF-8 cu BOM), așezate cu
 * „Așază pe foi” (din stânga-sus, marginea 10, în ordinea listei, fără rotire), cu distanța 10 în loc de 5: 15 pe foaia 1,
 * 10 pe foaia 2. Exportul „Toate foile”, câte un fișier pe freză (GRBL 1.1): arhiva și cele patru programe din ea.
 *
 * De ce 10: la distanța 5, ramele vecine, tăiate fiecare cu 3,175 pe dinafară, scot tot lemnul dintre plăcuțe, iar urechile
 * de pe laturile dinspre vecini nu mai țin de nimic (urechile a două plăcuțe vecine nu stau față în față): plăcuțele din
 * mijloc ar cădea sub freză (`placa11.test.ts`, proba urechilor). La 10 rămân 10 − 2 · 3,175 = 3,65 mm de lemn între tăieturi.
 *
 * Totul pe drumul aplicației: cititorul CSV și potrivirea coloanelor (`citesteCsv`, `surseImplicite`, `valoriRand`), literele
 * fiecărei plăcuțe (`textePlacutei`), cererea `placute` a acțiunii textului (`comandaText`, cu așezarea), ușa documentului
 * (`incarca`) și exportul (`calculeazaExport`). Rulat direct (`node test/placi/placa-11/genereaza.ts`), rescrie fișierele de
 * aur; `test/unit/placa11.test.ts` cere ca exportul de acum să fie identic, octet cu octet.
 */
import { readFileSync, writeFileSync } from 'node:fs';
// Dicționarele de bază (numele foilor din rezumatul exportului; programele nu le folosesc), ca în probele unitare.
import '../../unit/limbi.ts';
import { citesteZip } from '../../../src/extensii/zip.ts';
import { citesteCsv, decodeazaCsv, separatorGasit } from '../../../src/io/csv.ts';
import { ASEZARE_IMPLICITA } from '../../../src/model/asezare.ts';
import { documentNou, type Document, type GrupNod, type Operatie, type Piesa, type Scula } from '../../../src/model/document.ts';
import { doarFoaia } from '../../../src/model/foi.ts';
import { incarca } from '../../../src/model/incarcare.ts';
import { executa, istoricNou } from '../../../src/model/jurnal.ts';
import { operatiiPentruRol } from '../../../src/model/rol.ts';
import { surseImplicite, valoriRand } from '../../../src/model/valoriCsv.ts';
import { aseazaText, type ParametriText } from '../../../src/text/asezare.ts';
import { citesteFont, type Font } from '../../../src/text/font.ts';
import { piesaText } from '../../../src/text/piesaText.ts';
import { textePlacutei } from '../../../src/text/placute.ts';
import { comandaText } from '../../../src/ui/actiuniDocumentCalcul.ts';
import { calculeazaExport } from '../../../src/ui/actiuniExportCalcul.ts';
import type { RezultatExport } from '../../../src/ui/actiuniExportTipuri.ts';

export const FOAIA = { latime: 300, inaltime: 220, grosime: 12 } as const;
/** Distanța dintre plăcuțe, pe X și pe Y: cel puțin două freze ale ramei, plus lemnul de care se țin urechile. */
export const DISTANTA = 10;
export const MATERIAL = 'MDF 12';
/** Rama plăcuței și locul textului pe ea (ancora, la mijloc pe lățime; majuscula de 8 mm între 11 și 19). */
export const PLACUTA = { latime: 80, inaltime: 30, textX: 40, textY: 11, majuscula: 8 } as const;
export const FREZA_RAMA: Scula = { numar: 5, nume: 'freza plata 3.175', diametru: 3.175 };
export const FREZA_TEXT: Scula = { numar: 3, nume: 'freza V90', diametru: 6, forma: { tip: 'v', unghi: 90 } };
export const PAS_RAMA = 3;
export const URECHI = { numar: 2, latime: 6, grosime: 2 } as const;
/** Parametrii exportului: ca în fereastra lui, cu „Toate foile” și câte un fișier pe freză. */
export const PARAMETRI = { origine: 'stanga-jos', z0: 'sus', strategieScula: 'fisiere-separate', toateFoile: true } as const;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as const;

const font = (() => {
  const r = citesteFont(new Uint8Array(readFileSync(new URL('../../../public/fonturi/roboto.ttf', import.meta.url))));
  if (!r.ok) throw new Error(`fontul Roboto: ${r.cod}`);
  return r.font;
})();
const FONT = (): Font => font;

/** Numele din `nume.csv`, citite ca în fereastra «Din CSV…»: codarea și separatorul găsite singure, antetul, coloana „Nume”. */
export function numele(): string[] {
  const { text } = decodeazaCsv(new Uint8Array(readFileSync(new URL('nume.csv', import.meta.url))));
  const { randuri } = citesteCsv(text, separatorGasit(text));
  const [antet, ...date] = randuri;
  if (!antet) throw new Error('nume.csv e gol');
  const surse = surseImplicite(['Nume'], antet, antet.length);
  return date.map((r, k) => valoriRand(['Nume'], surse, r, k)['Nume'] ?? '');
}

/** Șablonul: rama și textul „{Nume}” grupate (ca după Ctrl+G), cu profilul exterior al ramei și V-carve-ul literelor. */
export function sablon(): Piesa {
  const p: ParametriText = { continut: '{Nume}', inaltime: PLACUTA.majuscula, spatiere: 0, interlinie: 1.2, aliniere: 'centru' };
  const r = piesaText(aseazaText(font, p), { ...p, font: 'roboto' }, 'text');
  if (!r.ok || r.piesa.radacina.tip !== 'grup') throw new Error('textul șablonului');
  const text: GrupNod = { ...r.piesa.radacina, matrice: { ...I, e: PLACUTA.textX, f: PLACUTA.textY } };
  // V-carve-ul literelor, ca rolul din panou: pornind de la o operație cu V90, cu adâncimea plafonată la conul frezei.
  const prima: Operatie = {
    id: 'text', tip: 'vcarve', noduri: [], scula: { ...FREZA_TEXT }, latura: 'interior', sens: 'urcare', adancime: 3, pas: 3,
    urechi: null, rampa: null, intrari: null, colturi: null,
  };
  const doar = { id: 'text', radacina: text, operatii: [prima] };
  const v = operatiiPentruRol(documentNou({ ...FOAIA }), doar, 'vcarve');
  if (!v) throw new Error('V-carve-ul textului');
  const rama: Operatie = {
    id: 'rama', tip: 'profil', noduri: ['rama'], scula: { ...FREZA_RAMA }, latura: 'exterior', sens: 'urcare', adancime: FOAIA.grosime,
    pas: PAS_RAMA, urechi: { ...URECHI }, rampa: null, intrari: null, colturi: null,
  };
  return {
    id: 'placuta', nume: 'Plăcuță nume',
    radacina: {
      tip: 'grup', id: 'sablon', matrice: { ...I }, copii: [
        { tip: 'element', id: 'rama', forma: { tip: 'dreptunghi', latime: PLACUTA.latime, inaltime: PLACUTA.inaltime, razaColt: 0 }, matrice: { ...I } },
        text,
      ],
    },
    operatii: [...v, rama],
  };
}

/**
 * Documentul plăcii: o foaie, șablonul pus o dată, apoi «Din CSV…» cu cele 25 de nume, așezate pe foi (ușa îl primește). Cu altă
 * `distanta` decât cea a plăcii, aceeași placă așezată mai strâns (proba urechilor de la export, felia 11.3↑c).
 */
export function documentPlaca11(distanta = DISTANTA): Document {
  const p = sablon();
  const d0 = documentNou({ ...FOAIA });
  const foaie = d0.foi[0];
  if (!foaie) throw new Error('documentul nou n-are foaie');
  const doc: Document = { ...d0, piese: [p], foi: [{ ...foaie, material: MATERIAL, instante: [{ id: 'a', piesa: p.id, x: 10, y: 180, rotire: 0 }] }] };
  const randuri = numele().map((nume) => {
    const r = textePlacutei(p, { Nume: nume }, FONT);
    if (!r.ok) throw new Error(`plăcuța „${nume}”: ${r.motiv}`);
    return { campuri: r.campuri, texte: r.texte };
  });
  const asezare = { ...ASEZARE_IMPLICITA, distantaX: distanta, distantaY: distanta };
  const c = comandaText(doc, { fel: 'placute', instanta: 'a', piesa: p, randuri, asezare }, foaie.id);
  if (!c.ok) throw new Error(`plăcuțele: ${c.motiv}`);
  const u = incarca(JSON.parse(JSON.stringify(executa(istoricNou(doc), c.comanda).doc)));
  if (!u.ok) throw new Error(`documentul plăcii 11 nu trece de ușă: ${u.motiv}`);
  return u.doc;
}

/** Exportul „Toate foile” al plăcii, ca din fereastra exportului deschisă pe foaia 1. */
export async function exportPlaca11(): Promise<Extract<RezultatExport, { ok: true }>> {
  const d = documentPlaca11();
  const r = await calculeazaExport(doarFoaia(d, d.foi[0]?.id), { ...PARAMETRI }, undefined, d);
  if (!r.ok) throw new Error(`placa 11: ${r.motiv}`);
  return r;
}

if (import.meta.main) {
  const r = await exportPlaca11();
  const zip = r.fisiere[0];
  if (!zip) throw new Error('fără arhivă');
  writeFileSync(new URL(zip.nume, import.meta.url), zip.octeti);
  console.log(`${zip.nume}  sha256 ${zip.sha256}`);
  const z = await citesteZip(zip.octeti, { fisiere: 100, octetiFisier: 50_000_000, octetiTotal: 200_000_000 });
  if (!z.ok) throw new Error('arhiva nu se citește');
  for (const x of z.intrari) {
    writeFileSync(new URL(x.nume, import.meta.url), x.octeti);
    console.log(`${x.nume}  ${x.octeti.length} octeți`);
  }
  for (const f of r.foi?.foi ?? []) console.log(`${f.nume}: ${f.fisiere.join(', ')}; ${f.secunde ?? '—'} s`);
}
