/**
 * Buzunarul (ADR 0069, 0073, 0076, 0093, 0094) judecat de oracolul lui independent (`test/oracles/buzunar.ts`, felia 5.1↑b,
 * scris doar din ADR-uri, fără să vadă `src/cam/` și probele vechi), pe G-code-ul exportat de aplicație:
 * - (a) corpusul CAM (`ajutor-corpus-cam.ts`), cu toți parametrii de export (posturile, unitățile, fișierele separate), plus
 *   documentele de măsură micșorate (două buzunare rotunde în același grup): fiecare bucată fără nicio problemă; un document
 *   refuzat de aplicație e unul pentru care oracolul prezice refuzul (sau unul fără buzunare), și invers;
 * - (b) cazurile pe hârtie (`test/oracles/buzunar.cazuri.ts`): verdictul curat și măsurile oracolului egale cu valorile
 *   socotite acolo (nivelurile inelelor, ariile și cutiile buclelor, liniile, trecerile, pantele, frezele de rest);
 * - (c) refuzurile prezise de oracol: aplicația le refuză, cu același motiv;
 * - (d) sabotajele țintite, pe o copie a G-code-ului: peretele mutat cu 0,1 mm, prima trecere cu 1 mm mai adâncă, freza de
 *   rest dusă pe lângă peretele tăiat de freza mare, un inel scos: fiecare dă problema lui, iar programul neatins niciuna;
 * - (e) fiecare verificare are o pereche care pică: același program judecat față de documentul schimbat într-un singur
 *   câmp (sensul, pasul lateral, coborârea, pasul, adâncimea, freza, unghiul liniilor), sau programul stricat într-un singur
 *   loc (o rapidă în material, o trecere prin insulă, inelul de lângă perete scos, freza de rest în mijlocul buzunarului).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculeazaExportul } from '../../src/jobs/calculCam.ts';
import type { ParametriExport } from '../../src/jobs/protocolCam.ts';
import type { Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import {
  citesteBuzunarele, judecaBuzunarele, refuzuriAsteptate, type Bucla, type DocumentOracol, type FelProblema, type MasuriBuzunar,
  type VerdictBuzunare,
} from '../oracles/buzunar.ts';
import { CAZURI, type AsteptatBuzunar, type BuclaAsteptata } from '../oracles/buzunar.cazuri.ts';
import { CORPUS_CAM, documentGreu, documentMare } from './ajutor-corpus-cam.ts';

const IMPLICIT: ParametriExport = { origine: 'stanga-jos', z0: 'sus' };
const oracol = (doc: Document): DocumentOracol => doc as unknown as DocumentOracol;

/** Programul exportat: textul, sau fișierele, cu strategia „fișiere separate”. */
async function exporta(doc: Document, p: ParametriExport): Promise<{ readonly ok: true; readonly program: string | string[] } | { readonly ok: false; readonly motiv: string }> {
  const r = await calculeazaExportul(doc, p);
  if (!r.ok) return { ok: false, motiv: r.motiv };
  return { ok: true, program: r.fisiere.length > 1 ? r.fisiere.map((f) => f.text) : r.program.text };
}

const judeca = (doc: Document, program: string | readonly string[], p: ParametriExport): VerdictBuzunare =>
  judecaBuzunarele({ document: oracol(doc), program, montaj: { origine: p.origine, z0: p.z0 } });

const curat = (v: VerdictBuzunare, cine: string): void => {
  assert.deepEqual(v.refuz, [], `${cine}: oracolul refuză documentul`);
  assert.deepEqual(v.probleme.map((p) => `${p.fel} ${p.buzunar}: ${p.mesaj}`), [], `${cine}: problemele oracolului`);
};

function prinUsa(json: Record<string, unknown>, cine: string): Document {
  const r = incarca(json);
  if (!r.ok) throw new Error(`${cine}: ușa refuză documentul: ${r.motiv}`);
  return r.doc;
}

test('(a) corpusul CAM: fiecare buzunar exportat trece oracolul, iar refuzurile se potrivesc cu ale lui', async () => {
  let bucati = 0;
  const cazuri = [
    ...CORPUS_CAM.map((c) => ({ id: c.id, doc: c.doc, parametri: c.parametri })),
    { id: 'documentMare(2)', doc: documentMare(2), parametri: [IMPLICIT] },
    { id: 'documentGreu(2)', doc: documentGreu(2), parametri: [IMPLICIT] },
  ];
  for (const caz of cazuri) {
    const asteptat = refuzuriAsteptate(oracol(caz.doc));
    const cuBuzunare = citesteBuzunarele(oracol(caz.doc)).bucati.length > 0;
    for (const [k, p] of caz.parametri.entries()) {
      const cine = `${caz.id}[${k}]`;
      const r = await exporta(caz.doc, p);
      if (asteptat.length > 0) {
        assert.equal(r.ok, false, `${cine}: oracolul cere refuzul (${asteptat.join('; ')}), aplicația a exportat`);
        continue;
      }
      if (!r.ok) {
        assert.equal(cuBuzunare, false, `${cine}: aplicația refuză un document cu buzunare pe care oracolul nu-l refuză: ${r.motiv}`);
        continue;
      }
      const v = judeca(caz.doc, r.program, p);
      curat(v, cine);
      bucati += v.buzunare.length;
    }
  }
  // Corpusul are buzunare de judecat: insula și treapta, cele trei coborâri, liniile cu restul (×2), cele cinci exporturi
  // cu mai multe freze și cele două buzunare rotunde din fiecare document de măsură.
  assert.equal(bucati, 2 + 3 + 2 + 5 + 2 + 2);
});

const aproape = (u: number, v: number, tol: number): boolean => Math.abs(u - v) <= tol;

function gasesteBucla(b: readonly Bucla[], a: BuclaAsteptata): Bucla | undefined {
  return b.find((x) => (a.d === undefined || aproape(x.d, a.d, 0.002)) && aproape(x.aria, a.aria, Math.max(0.05, 1e-4 * Math.abs(a.aria)))
    && (a.cutie === undefined || a.cutie.every((v, i) => aproape(x.cutie[i]!, v, 0.002))));
}

function potriveste(m: MasuriBuzunar, a: AsteptatBuzunar, cine: string): void {
  const lista = (u: readonly number[], v: readonly number[], ce: string, tol: number): void => {
    assert.equal(u.length, v.length, `${cine}: ${ce}: ${JSON.stringify(u)} față de ${JSON.stringify(v)}`);
    u.forEach((x, i) => assert.ok(aproape(x, v[i]!, tol), `${cine}: ${ce}[${i}] = ${x}, pe hârtie ${v[i]}`));
  };
  if (a.treceri) lista(m.treceri, a.treceri, 'trecerile', 1e-9);
  if (a.niveluri) lista(m.niveluri, a.niveluri, 'nivelurile inelelor', 0.002);
  if (a.linii) lista(m.linii, a.linii, 'liniile', 0.002);
  if (a.numarInele !== undefined) assert.equal(m.inele.length, a.numarInele, `${cine}: buclele inelelor la adâncimea finală`);
  if (a.bucleDePerete !== undefined) assert.equal(m.bucleDePerete, a.bucleDePerete, `${cine}: buclele de pe perete`);
  for (const x of a.inele ?? []) assert.ok(gasesteBucla(m.inele, x), `${cine}: inelul ${JSON.stringify(x)} lipsește din ${JSON.stringify(m.inele)}`);
  for (const x of a.perete ?? []) assert.ok(gasesteBucla(m.perete, x), `${cine}: bucla de perete ${JSON.stringify(x)} lipsește din ${JSON.stringify(m.perete)}`);
  if (a.panta !== undefined) assert.ok(aproape(m.pantaMaxima, a.panta, 0.001), `${cine}: panta coborârii ${m.pantaMaxima}, pe hârtie ${a.panta}`);
  if (a.plonjariInMaterial !== undefined) assert.equal(m.plonjariInMaterial, a.plonjariInMaterial, `${cine}: coborârile verticale în material`);
  for (const r of a.rest ?? []) {
    const x = m.rest.find((y) => y.numar === r.numar);
    assert.ok(x && x.lungime > 0, `${cine}: freza de rest T${r.numar} n-a tăiat nimic`);
    r.cutie.forEach((v, i) => assert.ok(aproape(x.cutie[i]!, v, 0.002), `${cine}: cutia frezei de rest T${r.numar}: ${JSON.stringify(x.cutie)}, pe hârtie ${JSON.stringify(r.cutie)}`));
  }
}

test('(b) cazurile pe hârtie: verdictul curat și măsurile egale cu valorile socotite', async () => {
  for (const caz of CAZURI.filter((c) => !c.refuz)) {
    const doc = prinUsa(caz.document, caz.id);
    assert.deepEqual(refuzuriAsteptate(oracol(doc)), [], `${caz.id}: oracolul prezice un refuz`);
    const p: ParametriExport = caz.montaj ? { origine: caz.montaj.origine, z0: caz.montaj.z0 } : IMPLICIT;
    const r = await exporta(doc, p);
    assert.ok(r.ok, `${caz.id}: aplicația refuză: ${r.ok ? '' : r.motiv}`);
    const v = judeca(doc, r.program, p);
    curat(v, caz.id);
    for (const a of caz.asteptat ?? []) {
      const m = v.buzunare.find((x) => x.id === a.id);
      assert.ok(m, `${caz.id}: bucata ${a.id} lipsește din verdict`);
      potriveste(m, a, caz.id);
    }
  }
});

test('(c) refuzurile prezise de oracol sunt și ale aplicației', async () => {
  for (const caz of CAZURI.filter((c) => c.refuz)) {
    const doc = prinUsa(caz.document, caz.id);
    assert.notDeepEqual(refuzuriAsteptate(oracol(doc)), [], `${caz.id}: oracolul nu prezice refuzul`);
    const r = await exporta(doc, IMPLICIT);
    assert.ok(!r.ok && caz.refuz!.test(r.motiv), `${caz.id}: aplicația trebuia să refuze (${String(caz.refuz)}): ${r.ok ? 'a exportat' : r.motiv}`);
  }
});

/** Programul exportat al unui caz pe hârtie sau al corpusului (un singur text). */
async function program(doc: Document): Promise<string> {
  const r = await exporta(doc, IMPLICIT);
  assert.ok(r.ok && typeof r.program === 'string', 'exportul sabotajului');
  return r.program as string;
}

function feluri(v: VerdictBuzunare): ReadonlySet<FelProblema> {
  return new Set(v.probleme.map((p) => p.fel));
}

test('(d) sabotajele țintite pe o copie a ieșirii CAM: oracolul le prinde, originalul trece', async () => {
  const dreptunghi = prinUsa(CAZURI.find((c) => c.id === 'dreptunghi-100x60')!.document, 'dreptunghi');
  const text = await program(dreptunghi);
  curat(judeca(dreptunghi, text, IMPLICIT), 'originalul dreptunghiului');

  // 1. Peretele din dreapta (x = 120 − 3) mutat cu 0,1 mm spre perete: centrul la 2,9 mm de margine.
  assert.ok(text.includes('X117.000'), 'inelul de lângă perete trece pe x = 117');
  const perete = judeca(dreptunghi, text.replaceAll('X117.000', 'X117.100'), IMPLICIT);
  assert.ok(feluri(perete).has('perete'), `peretele: ${JSON.stringify(perete.probleme)}`);

  // 2. Prima trecere la −4 în loc de −3: 4 mm de material dintr-o dată, cu pasul de 3.
  assert.ok(text.includes('Z-3.000'), 'prima trecere e la −3');
  const trecere = judeca(dreptunghi, text.replaceAll('Z-3.000', 'Z-4.000'), IMPLICIT);
  assert.ok(feluri(trecere).has('trecere'), `trecerea: ${JSON.stringify(trecere.probleme)}`);

  // 3. Inelul cel mai adânc al ultimei treceri scos (41,2 × 1,2, primul după coborârea la −6): golul până la inelul de la 27
  //    rămâne acoperit de freză (s < R), dar centrul ei trece la peste s de zona centrului: pasul lateral.
  const linii = text.split('\n');
  const jos = linii.findIndex((l) => l.startsWith('G1 Z-6.000'));
  assert.ok(jos > 0, 'coborârea la −6');
  const inel = linii.slice(jos + 1, jos + 5);
  assert.ok(inel.every((l) => /X(49\.400|90\.600) Y(49\.400|50\.600)/.test(l)), `inelul cel mai adânc: ${inel.join(' | ')}`);
  const faraInel = judeca(dreptunghi, [...linii.slice(0, jos + 1), ...linii.slice(jos + 5)].join('\n'), IMPLICIT);
  assert.ok(feluri(faraInel).has('pas-lateral'), `inelul scos: ${JSON.stringify(faraInel.probleme)}`);

  // 4. Freza de rest Ø3 dusă pe tot peretele, la 1,5 mm de el, după bucățile ei: la R_a − R = 4,5 de drumul frezei Ø12, deci
  //    pe lângă ce a tăiat aceea (mutația „pragul R_a − R − h” din ADR 0093).
  const rest = CORPUS_CAM.find((c) => c.id === 'buzunar-paralel-rest')!;
  const textRest = await program(rest.doc);
  curat(judeca(rest.doc, textRest, IMPLICIT), 'originalul restului');
  const pePerete = ['G0 X21.500 Y21.500', 'G1 Z-5.000 F300.0', 'G1 X98.500 Y21.500 F1000.0', 'G1 X98.500 Y58.500', 'G1 X21.500 Y58.500', 'G1 X21.500 Y21.500', 'G0 Z5.000'];
  const sfarsit = textRest.lastIndexOf('\nM5\n');
  assert.ok(sfarsit > 0, 'oprirea axului de la capăt');
  const sabotat = `${textRest.slice(0, sfarsit)}\n${pePerete.join('\n')}${textRest.slice(sfarsit)}`;
  const restPePerete = judeca(rest.doc, sabotat, IMPLICIT);
  assert.ok(feluri(restPePerete).has('rest'), `restul pe perete: ${JSON.stringify(restPePerete.probleme)}`);
});

/** Documentul cu primul câmp schimbat pe operația primei piese. */
function cuOperatia(doc: Document, schimbare: Record<string, unknown>): DocumentOracol {
  const c = structuredClone(doc) as unknown as { piese: Array<{ operatii: Array<Record<string, unknown>> }> };
  Object.assign(c.piese[0]!.operatii[0]!, schimbare);
  return c as unknown as DocumentOracol;
}

/** Linia `i` a programului înlocuită (sau scoasă, cu ''), după o funcție pe liniile lui. */
function cuLinia(text: string, gaseste: (linii: readonly string[]) => number, inlocuire: (l: string) => string): string {
  const linii = text.split('\n');
  const i = gaseste(linii);
  assert.ok(i >= 0, 'linia sabotajului');
  linii[i] = inlocuire(linii[i]!);
  return linii.join('\n');
}

test('(e) fiecare verificare are o pereche care pică', async () => {
  const caz = (id: string): Document => prinUsa(CAZURI.find((c) => c.id === id)!.document, id);
  const grile = { celulaCamp: 0.25, celulaAcoperire: 0.2 } as const;
  const dreptunghi = caz('dreptunghi-100x60'), rampa = caz('coborare-rampa'), linii = caz('paralel-30'), insula = caz('insula');
  const rest = CORPUS_CAM.find((c) => c.id === 'buzunar-paralel-rest')!.doc;
  const [tD, tR, tL, tI, tRest] = await Promise.all([dreptunghi, rampa, linii, insula, rest].map(program));
  const dupaCoborare = (l: readonly string[]): number => l.findIndex((x) => x.startsWith('G1 Z-6.000'));
  const perechi: ReadonlyArray<readonly [string, DocumentOracol, string, FelProblema]> = [
    ['sensul opus', cuOperatia(dreptunghi, { sens: 'opozitie' }), tD!, 'sens'],
    ['pasul lateral 2,3 în loc de 2,4', cuOperatia(dreptunghi, { pasLateral: 2.3 }), tD!, 'nivel'],
    ['rampa cerută, plonjarea tăiată', cuOperatia(dreptunghi, { coborare: { fel: 'rampa', unghi: 3 } }), tD!, 'coborare'],
    ['pasul 2,5 în loc de 3', cuOperatia(dreptunghi, { pas: 2.5 }), tD!, 'trecere'],
    ['adâncimea 5,9 în loc de 6', cuOperatia(dreptunghi, { adancime: 5.9 }), tD!, 'fund'],
    ['freza de 6,2 în loc de 6', cuOperatia(dreptunghi, { scula: { numar: 1, nume: 'freza 6.2', diametru: 6.2 } }), tD!, 'perete'],
    ['rampa de 4° în locul celei de atan 0,1', cuOperatia(rampa, { coborare: { fel: 'rampa', unghi: 4 } }), tR!, 'coborare'],
    ['liniile la 31° în loc de 30°', cuOperatia(linii, { strategie: { fel: 'paralel', unghi: 31 } }), tL!, 'linii'],
    ['liniile la 4,7 în loc de 4,8', cuOperatia(linii, { pasLateral: 4.7 }), tL!, 'linii'],
    ['trecerea de profil în sensul opus', cuOperatia(linii, { sens: 'opozitie' }), tL!, 'sens'],
    ['legătura de după inelul cel mai adânc, ca rapidă', oracol(dreptunghi), cuLinia(tD!, (l) => dupaCoborare(l) + 5, (x) => x.replace('G1', 'G0')), 'rapida'],
    ['inelul de lângă perete scos la −6', oracol(dreptunghi), cuLinia(tD!, (l) => l.findLastIndex((x) => x.includes('X117.000')), () => ''), 'acoperire'],
    ['o trecere prin insulă', oracol(insula), tI!.replace('\nM5\n', '\nG0 X65.000 Y45.000\nG1 Z-1.000 F300.0\nG1 X75.000 Y55.000\nG0 Z5.000\nM5\n'), 'regiune'],
    ['freza de rest prin mijlocul buzunarului', oracol(rest), tRest!.replace('\nM5\nM30', '\nG0 X40.000 Y40.000\nG1 Z-5.000 F300.0\nG1 X80.000 Y40.000 F1000.0\nG0 Z5.000\nM5\nM30'), 'rest'],
  ];
  for (const [nume, document, text, fel] of perechi) {
    const v = judecaBuzunarele({ document, program: text, ...grile });
    assert.ok(feluri(v).has(fel), `${nume}: se aștepta „${fel}”, oracolul dă ${JSON.stringify(v.probleme.map((p) => p.fel))}`);
  }
});
