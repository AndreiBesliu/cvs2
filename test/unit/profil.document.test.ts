/**
 * Profilurile parametrice în proiect (ADR 0304 §1, §5, felia 16.A↑f-3): rotunjirea, ogee-ul, ogee-ul roman și panoul ridicat
 * trec în document ca linii (`puncteProfil`), cu abaterea de la arcele siluetei sub 0,001 mm (ca biarcele, ADR 0033): primul
 * punct (0, 0), r strict crescător (treapta verticală a ogee-ului roman primește un pas de 0,0001 mm), h nedescrescător, capătul
 * exact la (Ø / 2, capătul frezei), cel mult 200 de puncte. Ușa le primește, iar lucrarea taie canelura cu ele. Felurile care
 * nu sunt profiluri n-au puncte.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FELURI_CU_CAM, inaltimeCon, sculaDinFreza, type Freza } from '../../src/model/freza.ts';
import { ABATERE_PROFIL, profilFreza, puncteProfil } from '../../src/model/profilFreza.ts';
import { PLAFON } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';

type Pct = readonly [number, number];
const BAZA: Freza = { nume: 'F', fel: 'plata', diametru: 6, numar: 1, turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40 };
const PROFILURI: readonly Freza[] = [
  { ...BAZA, nume: 'Rotunjire R3', fel: 'rotunjire', diametru: 12, raza: 3 },
  { ...BAZA, nume: 'Rotunjire R6,35', fel: 'rotunjire', diametru: 19.05, raza: 6.35 },
  { ...BAZA, nume: 'Rotunjire R0,5', fel: 'rotunjire', diametru: 6, raza: 0.5 },
  { ...BAZA, nume: 'Rotunjire mare', fel: 'rotunjire', diametru: 100, raza: 49.9 },
  { ...BAZA, nume: 'Ogee R3', fel: 'ogee', diametru: 18, raza: 3 },
  { ...BAZA, nume: 'Ogee mare', fel: 'ogee', diametru: 100, raza: 24.9 },
  { ...BAZA, nume: 'Ogee roman', fel: 'ogee-roman', diametru: 21, raza: 3, treapta: 1.5 },
  { ...BAZA, nume: 'Ogee roman mare', fel: 'ogee-roman', diametru: 100, raza: 20, treapta: 9.9 },
  { ...BAZA, nume: 'Panou 12°', fel: 'panou', diametru: 50.8, unghi: 12, varf: 6.35 },
  { ...BAZA, nume: 'Panou 12° R6,35', fel: 'panou', diametru: 50.8, unghi: 12, varf: 6.35, raza: 6.35 },
  { ...BAZA, nume: 'Panou fără fund plat', fel: 'panou', diametru: 30, unghi: 20, varf: 0 },
];

/** Distanța de la un punct la o linie frântă. */
function laLinie(p: Pct, l: readonly Pct[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < l.length; i++) {
    const [ax, ay] = l[i]!, [bx, by] = l[i + 1]!;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2)) : 0;
    best = Math.min(best, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy));
  }
  return best;
}

test('profilurile parametrice ca linii: (0, 0) … (Ø / 2, capătul), r strict crescător, h nedescrescător, cel mult 200 de puncte', () => {
  for (const f of PROFILURI) {
    const p = puncteProfil(f);
    assert.ok(p !== null, f.nume);
    assert.deepEqual(p[0], [0, 0], f.nume);
    const [rN, hN] = p[p.length - 1]!;
    assert.equal(rN, f.diametru / 2, `${f.nume}: capătul la r = ${rN}`);
    assert.ok(Math.abs(hN - inaltimeCon(f)) < 1e-9, `${f.nume}: capătul la h = ${hN}, nu ${inaltimeCon(f)}`);
    assert.ok(p.length >= 2 && p.length <= PLAFON.puncteProfil, `${f.nume}: ${p.length} puncte`);
    for (let i = 1; i < p.length; i++) {
      assert.ok(p[i]![0] > p[i - 1]![0], `${f.nume}: r nu crește la ${i}`);
      assert.ok(p[i]![1] >= p[i - 1]![1], `${f.nume}: h scade la ${i}`);
    }
  }
});

test('pe hârtie: liniile stau la cel mult 0,001 mm de silueta adevărată, în ambele sensuri', () => {
  for (const f of PROFILURI) {
    const p = puncteProfil(f)!;
    // Silueta adevărată, din arce foarte dese (la 4 000 de pași pe arc, coarda e la sub 0,00002 mm de arc).
    const dens = profilFreza(f, 4000);
    let dus = 0, intors = 0;
    for (const q of dens) dus = Math.max(dus, laLinie(q, p));
    for (const q of p) intors = Math.max(intors, laLinie(q, dens));
    assert.ok(dus <= ABATERE_PROFIL, `${f.nume}: silueta la ${dus} mm de linii`);
    // Punctele stau pe siluetă; doar treapta ogee-ului roman e mutată cu 0,0001 mm.
    assert.ok(intors <= 1.1e-4, `${f.nume}: un punct la ${intors} mm de siluetă`);
    assert.equal(ABATERE_PROFIL, 0.001);
  }
});

test('felurile care nu sunt profiluri n-au puncte; profilurile au CAM și se copiază în proiect cu punctele lor', () => {
  for (const fel of ['plata', 'v', 'gravare', 'bila', 'toroidala', 'conica', 'burghiu'] as const) {
    assert.equal(puncteProfil({ ...BAZA, fel, unghi: 60, raza: 1 }), null, fel);
  }
  for (const fel of ['rotunjire', 'ogee', 'ogee-roman', 'panou'] as const) assert.ok((FELURI_CU_CAM as readonly string[]).includes(fel), fel);
  const f = PROFILURI[0]!;
  assert.deepEqual(sculaDinFreza(f, 7), { numar: 7, nume: 'Rotunjire R3', diametru: 12, forma: { tip: 'profil', puncte: puncteProfil(f) } });
});

test('ușa documentului primește fiecare profil, iar lucrarea taie canelura cu el', () => {
  const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  for (const f of PROFILURI) {
    const doc = {
      schema: 32, rev: 0,
      piese: [{
        id: 'p',
        radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: [{ tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }, matrice: { ...I, e: 70, f: 70 } }] },
        operatii: [{
          id: 'o', tip: 'profil', noduri: ['e'], scula: sculaDinFreza(f), latura: 'pe-linie', sens: 'urcare', adancime: 2, pas: 1,
          urechi: null, rampa: null, intrari: null, colturi: null,
        }],
      }],
      foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 200, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
    };
    const r = incarca(doc);
    if (!r.ok) assert.fail(`${f.nume}: ${r.motiv}`);
    const j = programDinDocument(r.doc, REGIM_IMPLICIT);
    if (!j.ok) assert.fail(`${f.nume}: ${j.motiv}`);
    assert.equal(j.program.scula.forma?.tip, 'profil', f.nume);
  }
});
