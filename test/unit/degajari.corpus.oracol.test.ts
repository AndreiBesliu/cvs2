/**
 * Oracolul degajărilor (ADR 0032), lipirea pe corpusul din sămânță (`corpusDegajari`): găuri și piese de mărimi
 * diferite, pătrate, paralelograme, rotite și oglindite, ambele sensuri, toate colțurile de origine și ambele Z0, urechi
 * (și lângă colțuri), rampă, intrări, găuri apropiate, pe-linie, freze Ø3,175 / Ø6 / Ø8. Pe fiecare program: toată poarta
 * (1, 2, 3, 5, 9–13, viteza pe verticală); avertismentele = exact colțurile omise de §5 (pe hârtie); un refuz are motiv și
 * nu vine din degajări; fără drumuri, programul are exact geometria celui fără `colturi`. Ajutoarele în
 * `ajutor-degajari.ts`.
 *
 * PREEXISTENTE (ALEGERE): o încălcare a programului cu degajări care apare IDENTIC (invarianta și mesajul) pe programul
 * aceluiași document fără `colturi`, judecat de poarta de dinainte de ADR 0032, nu e a feliei 2.6: se numără și se
 * raportează, fără să pice testul. Pe programul fără `colturi`, poarta nouă și cea de dinainte dau EXACT aceleași
 * verdicte (cerința „aceleași verdicte fără colturi”, pe acest corpus). Găsite la scrierea oracolului: rampa ADR 0029
 * pe o buclă cu cote nerotunde (Ø3,175, dreptunghi 42,82 × 31,301) iese cu 0,002 mm peste banda T = 0,0015 a
 * invariantelor 10 / 11 (`rampa.ts`): tura ultimei treceri „se oprește la σ 493,873, nu la 493,875”.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpusDegajari } from '../oracles/degajari.cazuri.ts';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { colturileJudecate, ctxDoc, faraColturi, geometria, judeca, mesaje, primaDiferenta, SCHEMA } from './ajutor-degajari.ts';
import { avertismenteleCerute, comparaAvertismentele } from '../oracles/degajari.ts';
import type { Incalcare } from '../oracles/poarta.ts';

const cheie = (i: Incalcare): string => `${i.invarianta}|${i.mesaj}`;

test('lipire: corpusul degajărilor (din sămânță): orice program trece toată poarta; avertismentele sunt exact colțurile omise; refuzurile au motiv și nu vin din degajări; fără drumuri, geometria e a programului fără colturi', async () => {
  // Felia 2.3c-2: v10 (ADR 0037) adaugă căile deschise; documentele fără ele se taie la fel (ADR 0037 §2, §13), deci și pe 10.
  // Felia 5.1↑ (ADR 0069): v11 adaugă buzunarul; documentele fără el se taie la fel (doar numărul), deci și pe 11.
  assert.ok(SCHEMA >= 8 && SCHEMA <= 14, `schema ${SCHEMA}`);
  const rele: string[] = [];
  let programe = 0, refuzuri = 0, drumuri = 0, pastrate = 0, omise = 0, banda = 0, ascutite = 0, obtuze = 0, tee = 0, dogb = 0, arce = 0;
  const preexistente: string[] = [];
  const motiveOmise = new Map<string, number>();
  const motive: string[] = [];
  const familii = new Set<string>();
  for (const caz of corpusDegajari(0x2600, 110)) {
    const m = { origine: caz.origine, z0: caz.z0 };
    const r = await programulAplicatiei(caz.doc, m);
    const f = await programulAplicatiei(faraColturi(caz.doc), m);
    if (!r.ok) {
      refuzuri++;
      motive.push(r.motiv.slice(0, 80));
      if (!r.motiv.trim()) rele.push(`${caz.nume}: refuz fără motiv`);
      if (f.ok) rele.push(`${caz.nume}: refuzat doar cu degajări: ${r.motiv}`);
      continue;
    }
    programe++;
    familii.add(caz.familie);
    if (!f.ok) { rele.push(`${caz.nume}: fără colturi e refuzat (${f.motiv}), cu colturi nu`); continue; }
    const ctx = ctxDoc(caz.doc, m);
    const ctxF = ctxDoc(faraColturi(caz.doc), m);
    const vechi = judeca(f.text, ctxF, { inainteDe0032: true });
    const nou = judeca(f.text, ctxF);
    if (JSON.stringify(nou) !== JSON.stringify(vechi)) rele.push(`${caz.nume}: fără colturi, poarta nouă și cea de dinainte de ADR 0032 diferă: ${mesaje(nou.slice(0, 2))} / ${mesaje(vechi.slice(0, 2))}`);
    const stiute = new Set(vechi.map(cheie));
    const v = judeca(r.text, ctx).filter((i) => {
      if (!stiute.has(cheie(i))) return true;
      preexistente.push(`${caz.nume}: [${i.invarianta}] ${i.mesaj.slice(0, 120)}`);
      return false;
    });
    if (v.length) rele.push(`${caz.nume} (${m.origine}, ${m.z0}): ${mesaje(v.slice(0, 3))}`);
    const dif = primaDiferenta(geometria(r.text, ctx), geometria(f.text));
    if (dif) rele.push(`${caz.nume}: fără drumuri, geometria diferă de cea fără colturi: ${dif}`);
    const j = colturileJudecate(r.text, ctx);
    drumuri += j.drumuri;
    for (const lista of j.pe.values()) {
      for (const c of lista) {
        if (c.alfa < Math.PI / 2 - 1e-6) ascutite++; else if (c.alfa > Math.PI / 2 + 1e-6) obtuze++;
        if (c.tip === 't-bone') tee++; else dogb++;
        if (c.verdict === 'banda') { banda++; continue; }
        if (c.verdict === 'da') { pastrate++; continue; }
        omise++;
        const m = c.rezultate[0]!;
        motiveOmise.set(m, (motiveOmise.get(m) ?? 0) + 1);
      }
    }
    arce += j.judecata.arce.length;
    // Avertismentele: exact cele cerute de judecata foii (textul exact, precizarea din 11.10), nici unul în plus.
    for (const x of comparaAvertismentele(r.avertismente, avertismenteleCerute(j.judecata, caz.D / 2))) rele.push(`${caz.nume}: ${x}`);
  }
  console.log(`lipire ADR 0032: ${programe} programe, ${refuzuri} refuzuri; ${drumuri} drumuri; colțuri: ${pastrate} păstrate, ${omise} omise (${[...motiveOmise].map(([k, n]) => `${k}: ${n}`).join(', ')}), ${banda} la limită; ${arce} arce sub R; ${ascutite} ascuțite, ${obtuze} obtuze; ${dogb} dog-bone, ${tee} T-bone; familii: ${[...familii].join(', ')}`);
  if (motive.length) console.log(`  refuzuri: ${[...new Set(motive)].slice(0, 6).join(' | ')}`);
  if (preexistente.length) console.log(`  ${preexistente.length} încălcări preexistente (identice fără colturi, pe poarta de dinainte):\n    ${preexistente.join('\n    ')}`);
  assert.deepEqual(rele, []);
  assert.ok(programe >= 30 && drumuri >= 300 && pastrate >= 100 && omise >= 10 && ascutite >= 10 && obtuze >= 10 && tee >= 40 && dogb >= 40, `${programe} programe, ${drumuri} drumuri, ${pastrate} / ${omise}`);
  assert.ok((motiveOmise.get('prea aproape de altă buclă') ?? 0) >= 4 && (motiveOmise.get('ar tăia puntea unei urechi') ?? 0) >= 2 && arce >= 4, `omise: ${[...motiveOmise].join(', ')}; ${arce} arce`);
});
