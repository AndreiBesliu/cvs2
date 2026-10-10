/**
 * Oracolul intrărilor cu rampă (ADR 0031), lipirea: octeții programelor fără combinație = cei de dinainte de ADR 0031.
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

/**
 * Amprentele programelor aplicației DE DINAINTE de ADR 0031 (6c4d131), pe documentele fără combinație
 * (`documenteFaraCombinatie`): pe fiecare familie, câte documente, sha256 al șirului de amprente sha256 (programul, sau
 * „REFUZ: <motiv>”), câte programe. Măsurate în sesiunea oracolului, pe un instantaneu al aplicației de dinainte.
 */
const AMPRENTE_INAINTE: Readonly<Record<string, readonly [number, string, number]>> = {
  'doar intrări, fără urechi (2.5b)': [75, '683ec6d37ac0eb30d857dc872bdfe335e61dd5138296d92d4a6be82be9eca3f8', 39],
  'niciuna (2.5b fără intrări)': [338, '1fbf8d02a81a628176368ec81ea881ad87aa1bb9a2b76cb5760f580b83e0e759', 204],
  'doar rampă (2.5a)': [338, '8b313f1538c56df4bf8b01eca68291300752d1737a4038b8807aa148defd6db3', 204],
  'placa 1': [16, '397d8c2f1ee625c72051e9999cdb8f245daa1b079e98d16013076bf5f16df965', 16],
};

/**
 * Precizarea din 10.10 a ADR 0031 (urechile buclei înseși) schimbă, cu intenție, doar intrările pe buclele cu urechi.
 * Pe familia „doar intrări” cu urechi pe o operație cu intrări: primele 12 cifre hex ale amprentei fiecărui program de
 * dinainte (6c4d131), în ordine; 28 s-au schimbat la 00a6b85. În sesiunea oracolului, toate 28 de programe de dinainte
 * sunt roșii pe poarta amendată (12, condiția urechilor proprii) și verzi pe cea de dinainte; cele noi sunt verzi.
 */
const INAINTE_URECHI = [
  'b33290086e9f a8255df675fd 385085bc74aa 8b841f214fe4 aa50738e4864 87d5af51bb1c 9f3634b60aed c2fb2f03a3ab 8ef6b8d212a3',
  'd99b63c54a92 8312b96f94a6 ea493e96bc03 10bbb60ebd68 975dc6b2cb1b e52afe2c126a 1b69c370682c 085c9a555255 46bb0680582b',
  '98c5c4fc0fae 72ddd1625dcb f58b5ad91fe4 29ed9bf93c81 fbf3ac551f7b 7df105ace341 1411109959ee 2218b57998a4 95809d719505',
  '9c60d5f5f7ce 5ccb4544a481 c8bc15b43436 f6e2f388761d a5893fcb02e6 1972235890f9 d2f9e1672fd7 74f98cc968e9 94451ca68ebb',
  '0e70ce7b4333 8db7bb51d9ee 26cd2a4f447b 362de277bd51 e6e7a5ce74f6 5ad22dcea02e 08c89d2d33db c16194177e18 2179fb573d7a',
  'a831fa367f8b 2932b627dee2 a1a1fbb5eb32 25f6d6d349ee fd7d470b34b4 44bdf83f0eb9 af7c8c6a07d1 8c66bfde15c2 3f213a3ef56d',
  '32d2480e9371 2e6839c9367c 8f55e3995b25 63ddd70de813 40c6f420eafb 531415e5275a 2e6839c9367c 418e1398f617 02b37c7986a7',
  '2f853e444d1f 2e6839c9367c 2e6839c9367c 354908bf25fa 5364da03046d 1d1b70a5e3de 2e6839c9367c 2e6839c9367c eb4c8040cf80',
  '9e287ecf7541 78ca29faf9c4 b9710c95b5b0 da3daa5e3307 fd6b830ddab4 f2751d9f2367 fea04c739db4 dee762c138f6 a39ddb46e09e',
  '3f07e6ffaf16 47940b5a4510 b5e118664c8e 00f4a358f78c 191ad9a35372 af18f3406e5e 40a60b38fb25 5310051776e5 d93764b44a15',
  '53a73cc03e95 d98388db9a14 9aa8945697e0 45a2c06e539a 3049e02880f1 19d0eeb82ac6 a01b9924ca0b 2ec6db1b2700 d7728acb0f84',
  '0c5420505d6e 48d981ea90b1 a6a44834cacd bbf639b989b8 fe99a6f4d00e e3dfa047e8ff c7ca962817ea e86feb3a9695 b6c4199505f0',
  'b4510871cdfd 33ff4e366b28 d5d93dc33d31 b0c257f7309a 410ced4df9cf 324d9368b20a 6e0a4eb19e41 0564e917248b 3e2c388f6505',
  '6f9e818282ee b36e1eba1496 4883f2a4930e 24b2898d02c3 a248230bf88e 4384634fbb91 0fe9497a86a0 a825141ee9cf 4bf15bd7e848',
  '80d4d49f21ea 55e01e90e01f 4e2406d082d3 981198794214 a6fff1e19ad3 49a49fa15489 8d960c88f453 9197d3fc8f1c 2f54f72a72f0',
  '58c17f39dcde 19edf1116056 add661e4f6e6 9d0e479d1a30 ed752c53cd83 9371bac6689e bbcf9178ded5 be59810f3d9a 21d4484cfdbb',
  '2c507cf82e25 1f19a47d368a e3ec86d25d68 91404a46f296 a0dffe229c14 3243cc538177 21d4484cfdbb d3f93e452a6f 7846aa38ee59',
  '328b187dc6d8 2e571ff04604 e82c6334b54d b92803b10016 114c5425f9a9 0bbcfcbfa4ff c7caf63eb9a3 64a187a963bc 875249d3863e',
  '19b8552771b2 77555119595a 217ff900d321 e454b72f3326 46887f89a7c9 0033b8023b2c 14d8569790fa 049ec5bc153c aba3aae4b57c',
  '64a06a14d5af 5d31cc18ab5c 22b857773e90 1465dac369a7 be6128d9dcd7 e770518a39da 9d238aa91c4d 8958b739a0e5 49c545746578',
  'bbc74ed95bae 87e66da304ea 246519fa1a3c 662fc24e50a8 3f72fee9a41f 6c9d6c896ec3 3acb9d549dd0 a98ba2cce394 f1cde2015dfb',
  '7f1bdece2d2d 880aa4ca653c 63947424642d ff227a0a0580 53c7a8b495dd 6adb7ad6f41e 8e1585fdc85e d77c4e2615d0 61c115ab54b7',
  '5763a7986704 72e351b7dce2 4fe38ebf20fe 8fc4d9a13a17 99eca2ab532b 8957a2e4fe85 6d51b6be1a2e a127f8c6e37e 05177f260cba',
  '127110c58ef5 c6d38cdcfd3b f3e8aede832c acd4e437e907 02227abcca16 28f3ddfce9dc 3cd11678793e 25b35dc7326f d8c5f3d6c99b',
  '790403904e07 6ee93d6d2bec 7b7f1c60d466 1e337d2894b9 a044a104a09c c30faf3ef3de 5d98303b143c 7dfceceaa35c c6e89f199756',
  'a3428497ceb5 e86907e84de2 b421e6dd0f85 9f9a1a1623f4 d16e5154bc6d 64583dc5aded b25648c66ce2 1fc842e4c584 1a95532f5a4c',
  '06c9f04a13f9 495153913e3e ec87a8d32a9c 3405fcdc63dd adaf5989db4b 68d1e547410c 61faf356efe3 7acfb04105b3 be141578834b',
  'bd86b2050531 79169e45f011 12e9e82cc584 21d99bea88b9 0123c490c316 1a3258287a07 ce302affcd71 25e984bbb96a b1228d2d1b03',
  'e79ef040b9e1 a81d3971b78c 2d283b06ca3a ab4aef4aba37 334eeae1e1a7 f3647cc14a31 8f409e75cc92 bb44e5ab635b 8506f045ab61',
  '8506f045ab61 fcce6c64d153',
].join(' ').split(' ');
const SCHIMBATE_URECHI = 28;

test('lipire: programele fără combinație (doar intrări, doar rampă, niciuna; placa 1 pe 8 montaje) sunt, octet cu octet, cele ale aplicației de dinainte de ADR 0031 (în afara intrărilor pe bucle cu urechi, precizarea din 10.10: cele schimbate trec poarta); poarta amendată le dă aceleași verdicte; amprentele plăcii 1 rămân', async () => {
  assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
  const pe = new Map<string, { h: string[]; ok: number }>();
  const rele: string[] = [];
  let k = 0, iu = 0, schimbate = 0, puntiFaraRampa = 0;
  for (const x0 of documenteFaraCombinatie()) {
    const cuUrechi = x0.familie === 'doar intrări (2.5b)' && x0.doc.piese.some((p) => p.operatii.some((o) => o.intrari !== null && o.urechi !== null));
    const x = x0.familie !== 'doar intrări (2.5b)' ? x0 : { ...x0, familie: cuUrechi ? 'intrări pe bucle cu urechi (2.5b)' : 'doar intrări, fără urechi (2.5b)' };
    const r = await programulAplicatiei(x.doc, x.m);
    const s = r.ok ? r.text : `REFUZ: ${r.motiv}`;
    if (cuUrechi) {
      if (r.ok) {
        const st = x.doc.foi[0]!.stoc;
        const pu = puntiProgram(x.doc, r.text, {
          foaie: { latime: st.latime, inaltime: st.inaltime, grosime: st.grosime }, origine: x.m.origine, z0: x.m.z0, diametruScula: x.doc.piese[0]?.operatii[0]?.scula.diametru ?? 6,
          pas: 18, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(x.doc),
        });
        puntiFaraRampa += pu.punti;
        for (const q of pu.rele) rele.push(`${x.nume} (doar intrări): ${q}`);
      }
      const h = createHash('sha256').update(s).digest('hex').slice(0, 12);
      if (h !== INAINTE_URECHI[iu++]) {
        schimbate++;
        if (!r.ok) { rele.push(`${x.nume}: schimbat în refuz: ${r.motiv}`); continue; }
        const stoc = x.doc.foi[0]!.stoc;
        const ctx: ContextPoarta = {
          foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: x.m.origine, z0: x.m.z0,
          diametruScula: x.doc.piese[0]?.operatii[0]?.scula.diametru ?? 6, pas: Math.max(...x.doc.piese.flatMap((p) => p.operatii.map((o) => o.pas))), supracursa: 0, asteptareAx: 3,
          regiune: regiuneDinDocument(x.doc), avansPlonjare: AVANS_PLONJARE,
        };
        const v = poarta(r.text, ctx).filter((i) => [1, 2, 3, 5, 9, 10, 11, 12].includes(i.invarianta));
        if (v.length) rele.push(`${x.nume} (schimbat): ${mesaje(v.slice(0, 3))}`);
      }
      continue;
    }
    const f = pe.get(x.familie) ?? { h: [], ok: 0 };
    f.h.push(createHash('sha256').update(s).digest('hex'));
    if (r.ok) f.ok++;
    pe.set(x.familie, f);
    // Verdictele porții, nou față de dinainte de ADR 0031, pe un eșantion (fiecare al 6-lea program).
    if (r.ok && k++ % 6 === 0) {
      const stoc = x.doc.foi[0]!.stoc;
      const ctx: ContextPoarta = {
        foaie: { latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime }, origine: x.m.origine, z0: x.m.z0,
        diametruScula: x.doc.piese[0]?.operatii[0]?.scula.diametru ?? 6, pas: Math.max(...x.doc.piese.flatMap((p) => p.operatii.map((o) => o.pas))), supracursa: 0, asteptareAx: 3,
        regiune: regiuneDinDocument(x.doc), avansPlonjare: AVANS_PLONJARE,
      };
      const nou = poarta(r.text, ctx), vechi = poarta(r.text, ctx, { inainteDe0031: true });
      if (JSON.stringify(nou) !== JSON.stringify(vechi)) rele.push(`${x.familie} ${x.nume}: verdictele diferă: ${mesaje(nou.slice(0, 2))} / ${mesaje(vechi.slice(0, 2))}`);
    }
  }
  console.log(`intrări pe bucle cu urechi, fără rampă: ${iu} documente, ${schimbate} programe schimbate față de 6c4d131, ${puntiFaraRampa} punți de urechi întregi`);
  if (puntiFaraRampa < 200) rele.push(`doar ${puntiFaraRampa} punți judecate`);
  if (iu !== INAINTE_URECHI.length || schimbate !== SCHIMBATE_URECHI) rele.push(`intrări pe bucle cu urechi: ${iu} documente (înainte ${INAINTE_URECHI.length}), ${schimbate} programe schimbate (cerute ${SCHIMBATE_URECHI})`);
  for (const [familie, [n, h, ok]] of Object.entries(AMPRENTE_INAINTE)) {
    const f = pe.get(familie);
    if (!f) { rele.push(`${familie}: lipsește`); continue; }
    const acum = createHash('sha256').update(f.h.join('\n')).digest('hex');
    if (f.h.length !== n || acum !== h || f.ok !== ok) rele.push(`${familie}: ${f.h.length} documente, ${f.ok} programe, amprenta ${acum}; înainte ${n}, ${ok}, ${h}`);
  }
  assert.deepEqual(rele, []);
  const AMPRENTE = {
    A: '03d6cf5376faadb728cbd8bc1a6ea408af543b5b40548200b707a8fe6b697ac9',
    B: 'a65c7e8a71481dd14de400be08d70139775efc74a858bee0cd660eaad39e1105',
  } as const;
  for (const f of ['A', 'B'] as const) {
    const octeti = readFileSync(new URL(`../placi/placa-01/placa-01-${f}.nc`, import.meta.url));
    assert.equal(createHash('sha256').update(octeti).digest('hex'), AMPRENTE[f], `placa-01-${f}.nc`);
  }
});

// ── Precizarea din 10.10: urechile buclei înseși, și fără rampă ─────────────────────────────────────────────────────

/** Cazurile cu urechi proprii (7, 8) fără rampă: aceleași alegeri (ADR 0030 §3 c precizat), forma ADR 0030 §5. */
