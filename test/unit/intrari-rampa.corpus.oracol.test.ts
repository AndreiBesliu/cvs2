/**
 * Oracolul intrărilor cu rampă (ADR 0031), lipirea pe corpusul 2.5b cu rampe la întâmplare.
 * Mutat neschimbat din `intrari-rampa.oracol.test.ts` (sesiunea oracolului), ca să ruleze în paralel cu el;
 * ajutoarele sunt în `ajutor-intrari-rampa.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Punct3 } from '../oracles/gcode.ts';
import { laDocument, poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import type { DocV7O } from '../oracles/document.ts';
import { citesteEticheta, regiuneDinDocument } from '../oracles/regiune.ts';
import { citeste } from '../oracles/gcode.ts';
import { asteptatRampa, comparaRampa, lanturile, masoaraRampa, parcurgeriHartie, type PasL } from '../oracles/rampa.ts';
import { asteptatPeHartie, comparaCuHartia, masoara, profil, zProfil, type BucataTrecere, type Trecere } from '../oracles/urechi.ts';
import {
  buclaAnalitica, comparaIntrarea, desparte, desparteCuRampa, masoaraIntrari, razele, razeleCuRampa, sfertulIncape, type Bucata,
} from '../oracles/intrari.ts';
import {
  avansElice, campul, comparaIntrareCuRampa, masoaraIntrariCuRampa, punteleUrechilor, type AsteptatIR, type MasuraIR,
} from '../oracles/intrari-rampa.ts';
import {
  CAZURI_IR, corpusIntrariRampa, documenteFaraCombinatie, FARA_URECHI_PROPRII, fundSubIntrare, laRampaPeIntrare, martorIR, P_RAMA_IR, programIR, refuzPrezis,
  type CazIR, type MartorIR,
} from '../oracles/intrari-rampa.cazuri.ts';
import { CAZURI_INTRARI, programIntrari, type AsteptatH, type MartorIntrari } from '../oracles/intrari.cazuri.ts';
import { CAZURI_URECHI, programCaz } from '../oracles/urechi.cazuri.ts';
import { CAZURI_RAMPA, programCazRampa } from '../oracles/rampa.cazuri.ts';
import { corpus, PLACA_1, programDinTrasee, type Montaj, type Stoc } from '../oracles/regiune.cazuri.ts';
import { docPlaca1, STOC_PLACA, traseeCerute } from '../oracles/sens.cazuri.ts';
import { programulAplicatiei, schemaAplicatiei } from './ajutor-lipire.ts';

import {
  AVANS_PLONJARE, SCHEMA, R, mesaje, COLTURI, montaje, descrieM, dist, ctxDe, numerele, type Hartie, hartie, programulEtichetei, puntiProgram, urechiDe, punti,
} from './ajutor-intrari-rampa.ts';

test('lipire: corpusul 2.5b cu rampe la întâmplare (intrări 0,5–20, rampe 1–30; foi de 3–18 mm, toate colțurile, ambele Z0, toate laturile, ambele sensuri, urechi): orice program trece 1, 2, 3, 5, 9, 10, 11, 12 și viteza pe verticală; refuzurile prezise au motiv', async () => {
  assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
  const rele: string[] = [];
  let programe = 0, cuCombinatie = 0, treceriCuIntrare = 0, bucleOmise = 0, refuzuri = 0, prezise = 0, puntiJudecate = 0;
  const laturi = new Set<string>(), raze = new Set<number>();
  const motive: string[] = [];
  for (const caz of corpusIntrariRampa()) {
    const m = { origine: caz.origine, z0: caz.z0 };
    const r = await programulAplicatiei(caz.doc, m);
    if (caz.refuzPrezis) {
      prezise++;
      if (r.ok) rele.push(`${caz.nume}: refuzul ADR 0031 prezis, dar aplicația trece`);
      else if (!r.motiv.trim()) rele.push(`${caz.nume}: refuz fără motiv`);
      continue;
    }
    if (!r.ok) {
      refuzuri++;
      // Un refuz neprezis de ADR 0031 trebuie să fie unul de dinainte: același document fără rampe e refuzat și el.
      // (ALEGERE: refuzul „rampa nu încape pe buclă” pe o buclă omisă, Lr < 1 mm, ar cădea aici; corpusul nu-l are.)
      const fara = structuredClone(caz.doc);
      for (const p of fara.piese) for (const o of p.operatii) o.rampa = null;
      const r2 = await programulAplicatiei(fara, m);
      if (r2.ok) rele.push(`${caz.nume}: refuz neașteptat: ${r.motiv}`);
      motive.push(r.motiv.slice(0, 90));
      continue;
    }
    programe++;
    const stoc = caz.doc.foi[0]!.stoc;
    const pas = Math.max(...caz.doc.piese.flatMap((p) => p.operatii.map((o) => o.pas)));
    const ctx: ContextPoarta = {
      foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: caz.origine, z0: caz.z0, diametruScula: caz.diametru, pas,
      supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(caz.doc), avansPlonjare: AVANS_PLONJARE,
    };
    const v = poarta(r.text, ctx).filter((i) => [1, 2, 3, 5, 9, 10, 11, 12].includes(i.invarianta));
    if (v.length) rele.push(`[${caz.familie}] ${caz.nume} (${caz.origine}, ${caz.z0}, T ${stoc.grosime}): ${mesaje(v.slice(0, 3))}`);
    if (caz.cuIntrariRampa) cuCombinatie++;
    for (const p of caz.doc.piese) for (const o of p.operatii) if (o.rampa && o.intrari && o.latura !== 'pe-linie') { laturi.add(o.latura); raze.add(o.intrari.raza); }
    for (const x of masoaraIntrariCuRampa(r.text, (q) => laDocument(q, ctx))) {
      if (x.cuIntrare && x.zA > -0.0005 && x.aer?.zb !== undefined && Math.abs(x.aer.zb) <= 0.0005) treceriCuIntrare++;
    }
    bucleOmise += (r.avertismente ?? []).length;
    const pu = puntiProgram(caz.doc, r.text, ctx);
    puntiJudecate += pu.punti;
    for (const x of pu.rele) rele.push(`[${caz.familie}] ${caz.nume}: ${x}`);
  }
  console.log(`lipire ADR 0031: ${programe} programe (${cuCombinatie} cu rampă și intrări pe aceeași operație), ${treceriCuIntrare} treceri cu rampa pe intrare, ${bucleOmise} bucle omise (avertismente), laturile ${[...laturi].join(', ')}, ${raze.size} raze; ${puntiJudecate} punți de urechi întregi; ${prezise} refuzuri ADR 0031 prezise, ${refuzuri} alte refuzuri`);
  if (motive.length) console.log(`  alte refuzuri: ${[...new Set(motive)].slice(0, 5).join(' | ')}`);
  assert.deepEqual(rele, []);
  assert.ok(programe >= 60 && cuCombinatie >= 40 && treceriCuIntrare >= 200 && bucleOmise >= 5 && laturi.size === 2 && prezise >= 5 && puntiJudecate >= 100, `${programe} programe, ${cuCombinatie} cu combinație, ${treceriCuIntrare} treceri, ${bucleOmise} omise, ${prezise} prezise`);
});
