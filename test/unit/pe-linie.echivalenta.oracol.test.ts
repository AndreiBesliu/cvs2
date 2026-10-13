/**
 * Invarianta 14 (i) pe programele APLICAȚIEI (ADR 0037 §13, „Echivalența”): documentele fără căi deschise primesc exact
 * aceleași verdicte, cu o singură excepție (programele cu arcele de la „Ce am măsurat”, punctul 2, deci martorul).
 * Corpusurile de lipire ale oracolelor de dinainte (regiunea 2.3a, urechile 2.4, rampa 2.5a, intrările 2.5b, intrările
 * cu rampă 2.5c, degajările 2.6: corpusul și cazurile §8), căile 2.7b (`CAZURI_POARTA_CALE`) și placa 1 pe 8 montaje:
 * - pe fiecare program cu o etichetă `pe-linie` (controalele pozitive reale: dreptunghiuri, cercuri, colțuri rotunjite,
 *   urechi, cubicele inimii și valului ca biarce), pe programele căilor și pe placa 1: poarta de acum = poarta de
 *   dinainte (`inainteDe0037`), iar lanțurile chiar sunt judecate; abaterea cea mai mare se măsoară și se raportează;
 * - pe restul nu există nicio etichetă `pe-linie`, deci 14 (i) n-are ce judeca (aceeași poartă, fără să o mai rulez de
 *   două ori: echivalența pe programele scrise de mână ale oracolelor de dinainte o probează deja testele lor de mod,
 *   care compară poarta de acum, deci și 14, cu `inainteDe0032`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { ctxDoc, SCHEMA } from './ajutor-degajari.ts';
import { poarta, parteaDeTaiere, type ContextPoarta } from '../oracles/poarta.ts';
import { citeste } from '../oracles/gcode.ts';
import { citesteEticheta, verificaEticheta } from '../oracles/regiune.ts';
import { lanturiPeLinie, TOL_14, verificaPeLinie } from '../oracles/pe-linie.ts';
import { corpusDegajari, CAZURI_DEG } from '../oracles/degajari.cazuri.ts';
import { corpusIntrariRampa } from '../oracles/intrari-rampa.cazuri.ts';
import { corpusIntrari } from '../oracles/intrari.cazuri.ts';
import { corpusRampa } from '../oracles/rampa.cazuri.ts';
import { corpus } from '../oracles/regiune.cazuri.ts';
import { corpusUrechi } from '../oracles/urechi.cazuri.ts';
import { docPlaca1 } from '../oracles/sens.cazuri.ts';
import { CAZURI_POARTA_CALE } from '../oracles/poarta-cale.cazuri.ts';
import type { DocV8O } from '../oracles/document.ts';

const ORIGINI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
type Origine = (typeof ORIGINI)[number];
type Prog = { readonly familie: string; readonly nume: string; readonly text: string; readonly ctx: ContextPoarta };

let toate: Promise<{ readonly programe: Prog[]; readonly refuzuri: number }> | null = null;
/** Programele aplicației pe toate corpusurile (o singură dată pe fișier). */
function programele(): Promise<{ readonly programe: Prog[]; readonly refuzuri: number }> {
  toate ??= (async () => {
    const programe: Prog[] = [];
    let refuzuri = 0;
    const pune = async (familie: string, nume: string, doc: unknown, origine: Origine, z0: 'sus' | 'jos'): Promise<void> => {
      const r = await programulAplicatiei(doc as never, { origine, z0 });
      if (!r.ok) { refuzuri++; return; }
      programe.push({ familie, nume, text: r.text, ctx: ctxDoc(doc as DocV8O, { origine, z0 }) });
    };
    for (const [k, c] of corpusDegajari(0x2600, 110).entries()) await pune('degajări', `#${k}`, c.doc, c.origine, c.z0);
    for (const c of CAZURI_DEG) for (const [k, o] of ORIGINI.entries()) await pune('cazuri §8', c.nume, c.doc, o, k % 2 ? 'jos' : 'sus');
    for (const [k, c] of corpusIntrariRampa().entries()) await pune('intrări cu rampă', `#${k}`, c.doc, c.origine, c.z0);
    for (const [k, c] of corpusIntrari().entries()) await pune('intrări', `#${k}`, c.doc, c.origine, c.z0);
    for (const [k, c] of corpusRampa().entries()) await pune('rampa', `#${k}`, c.doc, c.origine, c.z0);
    for (const c of corpus()) await pune('regiunea', c.nume, c.doc, c.origine, c.z0);
    for (const [k, c] of corpusUrechi().entries()) await pune('urechi', `#${k}`, c.doc, c.origine, c.z0);
    for (const c of CAZURI_POARTA_CALE) await pune('căi', c.nume, c.doc, c.montaj.origine, c.montaj.z0);
    for (const o of ORIGINI) for (const z0 of ['sus', 'jos'] as const) await pune('placa 1', `${o} ${z0}`, docPlaca1(), o, z0);
    return { programe, refuzuri };
  })();
  return toate;
}

const arePeLinie = (text: string): boolean => /, pe-linie, /.test(text);

/** Lanțurile și etichetele, ca în poartă (etichetele valide, singure pe linie, ale unei tăieturi din document). */
function judecata(p: Prog): { readonly lanturi: ReturnType<typeof lanturiPeLinie>; readonly etichete: Parameters<typeof verificaPeLinie>[2] } {
  const reg = p.ctx.regiune!;
  const { evenimente, comentarii } = citeste(p.text);
  const etichete = comentarii.flatMap((c) => {
    const e = citesteEticheta(c.text);
    if (e === null) return [];
    return [{ linia: c.linia, eticheta: e !== 'stricata' && c.singur && verificaEticheta(reg, e) === null ? e : null }];
  });
  return { lanturi: lanturiPeLinie(evenimente, etichete, (m) => parteaDeTaiere(m, p.ctx)), etichete };
}

/**
 * O margine de sus a abaterii (în ambele sensuri): cea mai mică dintre TOL_14, TOL_14 / 2, …, TOL_14 / 16 la care 14 (i)
 * încă trece (scara se oprește la primul refuz; toleranțele mici cer rafinări fine, deci costă).
 */
function abaterea(p: Prog): number {
  const { lanturi, etichete } = judecata(p);
  const trece = (T: number): boolean => verificaPeLinie(lanturi.lanturi, lanturi.fara, etichete, p.ctx.regiune!, T).length === 0;
  let sus = TOL_14;
  for (const k of [2, 4, 8, 16]) {
    if (!trece(TOL_14 / k)) break;
    sus = TOL_14 / k;
  }
  return sus;
}

const DOAR_V9 = SCHEMA >= 9 ? false : `aplicația e pe schema ${SCHEMA}; căile cer v9 (ADR 0034)`;

test('echivalența: pe programele aplicației cu etichete pe linie, pe căi și pe placa 1, poarta de acum = poarta de dinainte de ADR 0037; lanțurile chiar sunt judecate', { skip: DOAR_V9 }, async () => {
  const { programe } = await programele();
  const alese = programe.filter((p) => arePeLinie(p.text) || p.familie === 'căi' || p.familie === 'placa 1');
  const rele: string[] = [];
  let cuPeLinie = 0, lant = 0, maxAbatere = 0, unde = '';
  const pe = new Map<string, number>();
  for (const p of alese) {
    const nou = poarta(p.text, p.ctx), vechi = poarta(p.text, p.ctx, { inainteDe0037: true });
    if (JSON.stringify(nou) !== JSON.stringify(vechi)) {
      rele.push(`${p.familie} ${p.nume}: ${nou.filter((i) => i.invarianta === 14).slice(0, 2).map((i) => `${i.linia}: ${i.mesaj}`).join('; ')}`);
    }
    if (!arePeLinie(p.text)) continue;
    cuPeLinie++;
    pe.set(p.familie, (pe.get(p.familie) ?? 0) + 1);
    const j = judecata(p);
    lant += j.lanturi.lanturi.length;
    const a = abaterea(p);
    if (a > maxAbatere) { maxAbatere = a; unde = `${p.familie} ${p.nume}`; }
  }
  console.log(`14 (i) pe aplicație: ${alese.length} programe judecate de două ori, ${cuPeLinie} cu etichete pe linie (${[...pe].map(([f, n]) => `${f} ${n}`).join(', ')}), ${lant} lanțuri; abaterea cea mai mare ≤ ${maxAbatere.toFixed(5)} mm (${unde}), toleranța ${TOL_14}`);
  assert.deepEqual(rele, []);
  assert.ok(cuPeLinie >= 20 && lant >= 25, `${cuPeLinie} programe pe linie, ${lant} lanțuri`);
  assert.ok((pe.get('căi') ?? 0) >= 2, 'nicio cale (cubice ca biarce) pe linie');
});

test('echivalența: restul programelor aplicației n-au nicio etichetă pe linie, deci 14 (i) n-are ce judeca', { skip: DOAR_V9 }, async () => {
  const { programe, refuzuri } = await programele();
  const rest = programe.filter((p) => !arePeLinie(p.text));
  let fara = 0;
  for (const p of rest) {
    const j = judecata(p);
    if (j.lanturi.lanturi.length === 0 && j.lanturi.fara.length === 0) fara++;
  }
  console.log(`${programe.length} programe (${refuzuri} refuzuri), ${rest.length} fără etichete pe linie`);
  assert.equal(fara, rest.length);
  assert.ok(programe.length > 1000, `${programe.length}`);
});
