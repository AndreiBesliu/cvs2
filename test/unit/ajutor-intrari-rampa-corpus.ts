/**
 * Oracolul intrărilor cu rampă (ADR 0031), lipirea pe corpusul 2.5b cu rampe la întâmplare, pe părți.
 *
 * Până pe 24.11.2026 era un singur test, într-un singur fișier (`intrari-rampa.corpus.oracol.test.ts`): 6 min 19 s de unul
 * singur. Rapidul împarte fișierele de probă pe felii după poziția lor în listă, deci un fișier atât de lung, ajuns după alte
 * oracole grele, a scos o felie peste limita ei (lotul al șaptesprezecelea). Corpusul și judecata sunt aceleași, neschimbate;
 * doar se împart: cazul k merge în partea (k mod PARTI) + 1, iar fiecare parte are fișierul ei
 * (`intrari-rampa.corpus.<n>.oracol.test.ts`), deci rulează în paralel cu celelalte.
 *
 * Ce păzește împărțirea:
 * - fiecare parte cere, pe cazurile ei, exact ce cerea testul întreg pe fiecare caz (nicio încălcare, niciun refuz neprezis);
 * - pragurile corpusului întreg (câte programe, câte cu rampă și intrări, câte treceri, bucle omise, refuzuri prezise, punți)
 *   se cer pe părți, cu minimele din `MINIME`, a căror sumă e cel puțin pragul de dinainte (verificat în partea 1);
 * - partea 1 mai cere ca fișierele părților să fie exact PARTI și ca părțile să acopere corpusul întreg, fiecare caz o dată.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laDocument, poarta, type ContextPoarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { masoaraIntrariCuRampa } from '../oracles/intrari-rampa.ts';
import { corpusIntrariRampa } from '../oracles/intrari-rampa.cazuri.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { AVANS_PLONJARE, SCHEMA, mesaje, puntiProgram } from './ajutor-intrari-rampa.ts';
import { cazurilePartii as partea, cereImpartirea, cereMinimele } from './ajutor-parti.ts';

/** În câte părți se împarte corpusul: tot atâtea fișiere de probă. */
export const PARTI = 6;

/** Ce numără lipirea, pe o parte a corpusului (aceleași numărători ca în testul întreg). */
export type Lipire = {
  readonly cazuri: number;
  readonly rele: readonly string[];
  readonly programe: number;
  readonly cuCombinatie: number;
  readonly treceriCuIntrare: number;
  readonly bucleOmise: number;
  readonly refuzuri: number;
  readonly prezise: number;
  readonly puntiJudecate: number;
  readonly laturi: readonly string[];
  readonly raze: number;
  readonly motive: readonly string[];
};

/** Pragurile testului întreg, de dinaintea împărțirii: suma minimelor pe părți nu coboară sub ele. */
export const PRAGURI = { programe: 60, cuCombinatie: 40, treceriCuIntrare: 200, bucleOmise: 5, prezise: 5, puntiJudecate: 100 } as const;
type Prag = keyof typeof PRAGURI;

/**
 * Minimele fiecărei părți: partea ei din pragul întreg, pe măsura a ce a numărat pe 24.11.2026 (rotunjită în sus), deci la fel
 * de largi ca pragurile de dinainte, iar suma lor nu coboară sub ele. Numărătoarea de atunci, pe tot corpusul (338 de cazuri,
 * aceeași sămânță): 199 programe, 183 cu rampă și intrări pe aceeași operație, 1554 treceri cu rampa pe intrare,
 * 84 bucle omise, 12 refuzuri prezise, 1513 punți judecate; pe părți, în jurnalul fiecărei probe. Un corpus schimbat cu bună
 * știință își schimbă minimele aici, din numărătoarea nouă.
 */
export const MINIME: readonly Readonly<Record<Prag, number>>[] = [
  { programe: 10, cuCombinatie: 6, treceriCuIntrare: 30, bucleOmise: 1, prezise: 1, puntiJudecate: 17 },
  { programe: 10, cuCombinatie: 7, treceriCuIntrare: 32, bucleOmise: 2, prezise: 2, puntiJudecate: 20 },
  { programe: 9, cuCombinatie: 7, treceriCuIntrare: 29, bucleOmise: 1, prezise: 1, puntiJudecate: 13 },
  { programe: 12, cuCombinatie: 8, treceriCuIntrare: 34, bucleOmise: 2, prezise: 1, puntiJudecate: 19 },
  { programe: 10, cuCombinatie: 7, treceriCuIntrare: 33, bucleOmise: 2, prezise: 2, puntiJudecate: 20 },
  { programe: 11, cuCombinatie: 7, treceriCuIntrare: 46, bucleOmise: 1, prezise: 1, puntiJudecate: 15 },
];

/** Cazurile unei părți (1 … PARTI): cele de pe pozițiile k cu k mod PARTI = parte − 1. */
export function cazurilePartii<T>(corpus: readonly T[], parte: number, parti = PARTI): T[] {
  return partea(corpus, parte, parti);
}

/** Lipirea pe o parte a corpusului: judecata fiecărui caz e cea a testului întreg, neschimbată. */
export async function lipesteParte(parte: number): Promise<Lipire> {
  const rele: string[] = [];
  let programe = 0, cuCombinatie = 0, treceriCuIntrare = 0, bucleOmise = 0, refuzuri = 0, prezise = 0, puntiJudecate = 0;
  const laturi = new Set<string>(), raze = new Set<number>();
  const motive: string[] = [];
  const cazuri = cazurilePartii(corpusIntrariRampa(), parte);
  for (const caz of cazuri) {
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
  return {
    cazuri: cazuri.length, rele, programe, cuCombinatie, treceriCuIntrare, bucleOmise, refuzuri, prezise, puntiJudecate,
    laturi: [...laturi].sort(), raze: raze.size, motive,
  };
}

/** Înregistrează proba unei părți (apelată din fișierul ei). */
export function probaPartii(parte: number): void {
  if (parte === 1) {
    test('lipire, împărțirea corpusului 2.5b cu rampe: exact câte un fișier pe parte, părțile acoperă corpusul întreg, fiecare caz o dată, iar minimele pe părți nu coboară sub pragurile testului întreg', () => {
      cereImpartirea(import.meta.dirname, /^intrari-rampa\.corpus\..*\.test\.ts$/, (n) => `intrari-rampa.corpus.${n}.oracol.test.ts`, PARTI,
        corpusIntrariRampa().map((c, k) => `${k}: ${c.nume}`));
      cereMinimele(PRAGURI, MINIME, PARTI);
    });
  }
  test(`lipire: corpusul 2.5b cu rampe la întâmplare, partea ${parte} din ${PARTI} (intrări 0,5–20, rampe 1–30; foi de 3–18 mm, toate colțurile, ambele Z0, toate laturile, ambele sensuri, urechi): orice program trece 1, 2, 3, 5, 9–12; un refuz neprezis e unul de dinainte; punțile urechilor, judecate`, { timeout: 600_000 }, async () => {
    assert.ok(SCHEMA >= 7, `schema ${SCHEMA}`);
    const s = await lipesteParte(parte);
    console.log(`lipire ADR 0031, partea ${parte} din ${PARTI}: ${s.cazuri} cazuri, ${s.programe} programe (${s.cuCombinatie} cu rampă și intrări pe aceeași operație), ${s.treceriCuIntrare} treceri cu rampa pe intrare, ${s.bucleOmise} bucle omise (avertisment), ${s.refuzuri} refuzuri de dinainte, ${s.prezise} refuzuri prezise, ${s.puntiJudecate} punți judecate, laturile ${s.laturi.join(' și ')}, ${s.raze} raze`);
    if (s.motive.length) console.log(`  alte refuzuri: ${[...new Set(s.motive)].slice(0, 5).join(' | ')}`);
    assert.deepEqual(s.rele, []);
    const minime = MINIME[parte - 1]!;
    for (const prag of Object.keys(PRAGURI) as Prag[]) assert.ok(s[prag] >= minime[prag], `${prag}: ${s[prag]} sub minimul părții, ${minime[prag]}`);
    // Ambele laturi (exterior și interior) în fiecare parte, cum le cerea testul întreg pe tot corpusul.
    assert.deepEqual(s.laturi, ['exterior', 'interior']);
  });
}
