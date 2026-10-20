/**
 * Documentația admin generată la build (ADR 0048): parserele pure ale surselor (`PLAN.md` §5.3–§5.4, fișele etapelor,
 * fișele plăcilor, indexul și fișierele ADR), roadmap-ul dedus din ele și poarta care pică pe un tabel care nu se mai
 * poate citi. Întâi pe documentele reale (cifrele de azi), apoi pe fixturi mici, fiecare cu defectul ei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EroareDocumentatie, citesteAdr, citesteDetaliile, citesteEtapele, citesteFisa, citesteIndexAdr, citestePlaca,
  construiesteRoadmap, genereazaDocumentatia, primaPropozitie, titluScurt, type SurseRoadmap,
} from '../../scripts/documentatie.ts';
import { parseazaMarkdown } from '../../src/docs/markdown.ts';
import { esteCatalog, esteRoadmap, type Catalog, type Etapa, type Felie, type Roadmap } from '../../shared/documentatie.ts';

const citeste = (cale: string): string => readFileSync(cale, 'utf8').replace(/\r\n/g, '\n');
const PLAN = citeste('PLAN.md');

/** Generat o singură dată din arborele real (aceeași funcție ca pluginul de build). */
const GENERAT = genereazaDocumentatia('.');
const roadmap = JSON.parse(GENERAT.get('documentatie/roadmap.json') ?? 'null') as Roadmap;
const catalog = JSON.parse(GENERAT.get('documentatie/catalog.json') ?? 'null') as Catalog;
const etapa = (id: string): Etapa => {
  const e = roadmap.etape.find((x) => x.id === id);
  assert.ok(e, `etapa ${id}`);
  return e;
};
const felie = (e: Etapa, id: string): Felie => {
  const f = e.felii.find((x) => x.id === id);
  assert.ok(f, `felia ${id} din etapa ${e.id}`);
  return f;
};

// ——— Documentele reale ———

test('PLAN.md §5.4: 33 de săptămâni, etapele 1–30 în ordine, tampoanele T1–T3, live-urile', () => {
  const e = citesteEtapele(PLAN);
  assert.equal(e.length, 33);
  assert.deepEqual(e.filter((x) => x.numar !== null).map((x) => x.numar), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual(e.filter((x) => x.numar === null).map((x) => [x.id, x.saptamana]), [['T1', 11], ['T2', 22], ['T3', 31]]);
  assert.deepEqual(e.map((x) => x.saptamana), Array.from({ length: 33 }, (_, i) => i + 1));
  const [unu, , trei, patru] = e;
  assert.equal(unu?.tinta, '**Un schelet care taie** (§5.3)');
  assert.equal(unu?.areLive, false);
  assert.equal(trei?.areLive, true);
  assert.equal(trei?.live, '**da (primul)**');
  assert.equal(patru?.placa, 'șanțurile de calibrare');
  assert.equal(e.at(-1)?.id, '30');
  assert.equal(e.at(-1)?.areLive, true, '„lansarea” e un live');
});

test('PLAN.md §5.3: punctele etapelor 1–4, cu titlul scurt', () => {
  const d = citesteDetaliile(PLAN);
  assert.deepEqual([...d.keys()], [1, 2, 3, 4]);
  const patru = d.get(4) ?? [];
  assert.equal(patru.length, 9);
  assert.equal(patru[1]?.titlu, 'Nucleul de simulare CPU (2 felii)');
  assert.equal(patru[6]?.titlu, 'PWA');
  assert.equal(patru[0]?.titlu, 'Migrările pure vN → vN+1');
  assert.match(patru[1]?.descriere ?? '', /dale mici într-un atlas/);
});

test('fișa etapei 3: feliile, jurnalul (cu rândurile aduse ↑ și 3.P), ce îi trebuie owner-ului, ziua pornirii', () => {
  const f = citesteFisa('docs/etape/etapa-03.md', citeste('docs/etape/etapa-03.md'));
  assert.equal(f.numar, 3);
  assert.equal(f.pornita, '16.10.2026');
  assert.deepEqual(f.felii.map((x) => x.id), ['3.1', '3.2', '3.3', '3.4a', '3.4b', '3.5', '3.6', '3.7', '3.8', '3.9']);
  const ids = f.jurnal.map((x) => x.id);
  for (const id of ['3.1', '3.4b', '4.7↑', '4.5↑b', '4.2↑', '4.7↑b', '3.P']) assert.ok(ids.includes(id), id);
  const sim = f.jurnal.find((x) => x.id === '4.2↑');
  assert.deepEqual([sim?.started, sim?.completed, sim?.treceri], ['19.10 08:05', '19.10 14:05', 2]);
  // Lista se schimbă des (o cerere făcută iese din tabel): un rând stabil, nu numărul lor.
  assert.ok(f.owner.some((o) => /Placa de contact pentru Z/.test(o.ce) && o.pentru === '3.7' && o.termen === 'înainte de 3.7'));
});

test('fișa etapei 1: rândul 1.10 citit întreg (era rupt de un heredoc), și în tabelul feliilor', () => {
  const f = citesteFisa('docs/etape/etapa-01.md', citeste('docs/etape/etapa-01.md'));
  assert.ok(f.felii.some((x) => x.id === '1.10'));
  const r = f.jurnal.find((x) => x.id === '1.10');
  assert.match(r?.nota ?? '', /pierdute de heredoc/);
  assert.match(r?.nota ?? '', /\*\*Durata:\*\*/);
  assert.equal(f.jurnal.length, 14);
});

test('plăcile: fișele 1 și 2 există, niciuna tăiată încă', () => {
  for (const n of [1, 2]) {
    const p = citestePlaca(`docs/etape/placa-0${n}.md`, citeste(`docs/etape/placa-0${n}.md`));
    assert.equal(p.numar, n);
    assert.equal(p.taiata, null);
  }
});

test('indexul ADR și fișierele: în ambele sensuri, cu starea fiecăruia', () => {
  const index = citesteIndexAdr(citeste('docs/adr/README.md'));
  const fisiere = readdirSync('docs/adr').filter((f) => /^\d{4}-.+\.md$/.test(f)).sort();
  assert.deepEqual(index.map((r) => r.fisier).sort(), fisiere);
  const a47 = citesteAdr('docs/adr/0047-nucleul-de-simulare.md', citeste('docs/adr/0047-nucleul-de-simulare.md'));
  assert.equal(a47.numar, '0047');
  assert.equal(a47.stare, 'acceptat');
  assert.equal(a47.titluScurt, 'Nucleul de simulare pe CPU');
  const a1 = citesteAdr('docs/adr/0001-conturul-are-trei-primitive.md', citeste('docs/adr/0001-conturul-are-trei-primitive.md'));
  assert.equal(a1.titluScurt, 'Conturul are trei primitive');
});

test('roadmap-ul real: etapa curentă 3, 1 și 2 așteaptă placa, 4 e următoarea cu feliile aduse, restul viitoare', () => {
  assert.ok(esteRoadmap(roadmap));
  assert.equal(roadmap.etape.length, 33);
  assert.equal(roadmap.cifre.etapaCurenta, '3');
  assert.deepEqual(roadmap.etape.filter((e) => e.curenta).map((e) => e.id), ['3']);
  for (const id of ['1', '2']) {
    assert.equal(etapa(id).stare, 'in-lucru', id);
    assert.equal(etapa(id).asteaptaPlaca, true, id);
    assert.ok(etapa(id).felii.every((f) => f.stare === 'gata'), `toate feliile etapei ${id} sunt gata`);
  }
  assert.equal(etapa('3').stare, 'in-lucru');
  assert.equal(etapa('3').asteaptaPlaca, false);
  assert.equal(etapa('4').stare, 'urmatoare');
  assert.equal(etapa('5').stare, 'viitoare');
  assert.equal(etapa('T1').stare, 'viitoare');
  assert.equal(etapa('1').fisaPlacii, 'docs/etape/placa-01.md');
  assert.equal(etapa('3').fisaPlacii, null);
  assert.equal(etapa('3').fisa, 'docs/etape/etapa-03.md');
  assert.equal(etapa('3').pornita, '16.10.2026');
  assert.equal(etapa('1').placaTaiata, null);
});

test('o felie cunoscută cu datele ei: 3.4a gata, cu ADR 0041; 3.5 de făcut; 3.P din jurnal, fără rând în tabel', () => {
  const f = felie(etapa('3'), '3.4a');
  assert.equal(f.stare, 'gata');
  assert.equal(f.started, '16.10 21:35');
  assert.equal(f.completed, '16.10 22:20');
  assert.equal(f.treceri, 2);
  assert.deepEqual(f.adr, ['0041']);
  assert.equal(f.titlu, 'Backup-ul zilnic al Firestore');
  assert.match(f.nota, /^Backup-ul și marcajele \(ADR 0041\)/);
  assert.ok(f.nota.length <= f.notaIntreaga.length);
  assert.equal(felie(etapa('3'), '3.5').stare, 'de-facut');
  assert.equal(felie(etapa('3'), '3.5').started, null);
  assert.equal(felie(etapa('3'), '3.P').stare, 'gata');
  assert.equal(felie(etapa('3'), '3.P').titlu, 'Loc în pachetul de pornire');
  // Rândurile aduse din etapa 4 nu se numără la etapa 3.
  assert.ok(!etapa('3').felii.some((x) => x.id.startsWith('4.')));
});

test('feliile aduse înainte (↑) stau la etapa lor (4), cu punctul din §5.3 și jurnalul etapei 3', () => {
  const patru = etapa('4');
  const sim = felie(patru, '4.2↑');
  assert.equal(sim.adusa, true);
  assert.equal(sim.stare, 'gata');
  assert.equal(sim.jurnal, 'docs/etape/etapa-03.md');
  assert.deepEqual(sim.adr, ['0047']);
  assert.equal(sim.titlu, 'Simularea, nucleul CPU, felia 1 din 2');
  assert.deepEqual(patru.felii.map((x) => x.id), ['4.7↑', '4.5↑', '4.5↑b', '4.2↑', '4.7↑b']);
  assert.equal(patru.puncte.length, 9);
  assert.deepEqual(patru.puncte[1]?.felii, ['4.2↑']);
  assert.deepEqual(patru.puncte[4]?.felii, ['4.5↑', '4.5↑b']);
  assert.deepEqual(patru.puncte[6]?.felii, ['4.7↑', '4.7↑b']);
  assert.deepEqual(patru.puncte[0]?.felii, []);
  // Etapele cu fișă nu-și repetă punctele din plan: fișa le înlocuiește.
  assert.deepEqual(etapa('3').puncte, []);
});

test('o felie împărțită fără rând propriu ia starea din sub-felii (2.7 din 2.7a–d); sub-feliile își știu părintele', () => {
  const doi = etapa('2');
  assert.equal(felie(doi, '2.7').stare, 'gata');
  assert.equal(felie(doi, '2.7').dinSubfelii, true);
  assert.equal(felie(doi, '2.7a').parinte, '2.7');
  assert.equal(felie(doi, '2.8-0').parinte, '2.8');
  assert.equal(felie(doi, '2.3c').parinte, null);
});

test('ce așteaptă de la owner: din fișele etapelor neîncheiate, cu etapa și fișa', () => {
  // Exact rândurile tabelului din fișa etapei 3 (singura neîncheiată cu tabelul ăsta), în ordine.
  const f3 = citesteFisa('docs/etape/etapa-03.md', citeste('docs/etape/etapa-03.md'));
  assert.ok(f3.owner.length > 0);
  assert.deepEqual(roadmap.owner.map((o) => [o.ce, o.pentru, o.termen]), f3.owner.map((o) => [o.ce, o.pentru, o.termen]));
  assert.deepEqual([...new Set(roadmap.owner.map((o) => o.etapa))], ['3']);
  assert.equal(roadmap.owner[0]?.fisa, 'docs/etape/etapa-03.md');
  // Ancora e cea a titlului randat de cititor, deci linkul „fișa etapei 3” duce chiar la secțiune.
  const fisa3 = parseazaMarkdown(citeste('docs/etape/etapa-03.md'));
  assert.ok(fisa3.some((b) => b.tip === 'titlu' && b.ancora === roadmap.owner[0]?.ancora));
});

test('cifrele: din aceleași date, nu scrise de mână', () => {
  const toate = roadmap.etape.flatMap((e) => e.felii);
  const c = roadmap.cifre;
  assert.equal(c.felii.gata, toate.filter((f) => f.stare === 'gata').length);
  assert.equal(c.felii.deFacut, toate.filter((f) => f.stare === 'de-facut').length);
  assert.equal(c.felii.aduse, toate.filter((f) => f.adusa && f.stare === 'gata').length);
  assert.equal(c.felii.aduse, 5);
  assert.equal(c.etape, 30);
  assert.equal(c.tampoane, 3);
  assert.equal(c.saptamani, 33);
  assert.equal(c.etapeGata, 0);
  const adr = readdirSync('docs/adr').filter((f) => /^\d{4}-.+\.md$/.test(f));
  assert.equal(c.adr.total, adr.length);
  assert.equal(c.adr.acceptate + c.adr.propuse + c.adr.inlocuite + c.adr.altele, adr.length);
  assert.deepEqual(c.placi, { fise: 2, taiate: 0 });
  assert.equal(Object.keys(roadmap.adr).length, adr.length);
  assert.equal(roadmap.adr['0047']?.cale, 'docs/adr/0047-nucleul-de-simulare.md');
});

test('catalogul: planul, starea, fișele, plăcile, toate ADR-urile; fără docs/faza0 sau alte căi', () => {
  assert.ok(esteCatalog(catalog));
  const cai = catalog.documente.map((d) => d.cale);
  for (const c of ['PLAN.md', 'CLAUDE.md', 'DEVLOG.md', 'docs/adr/README.md', 'docs/etape/etapa-01.md', 'docs/etape/placa-02.md']) assert.ok(cai.includes(c), c);
  for (const f of readdirSync('docs/adr').filter((x) => x.endsWith('.md'))) assert.ok(cai.includes(`docs/adr/${f}`), f);
  assert.ok(cai.every((c) => /^(PLAN|CLAUDE|DEVLOG)\.md$|^docs\/(adr|etape)\/[^/]+\.md$/.test(c)), 'doar sursele din lista albă');
  // Fiecare document din catalog are fișierul lui, cu textul sursei (LF), și nimic în plus.
  const generate = [...GENERAT.keys()].filter((k) => k.startsWith('documentatie/doc/'));
  assert.deepEqual(generate.sort(), cai.map((c) => `documentatie/doc/${c}`).sort());
  assert.equal(GENERAT.get('documentatie/doc/docs/etape/placa-02.md'), citeste('docs/etape/placa-02.md'));
  const adr47 = catalog.documente.find((d) => d.cale === 'docs/adr/0047-nucleul-de-simulare.md');
  assert.deepEqual([adr47?.categorie, adr47?.adr, adr47?.eticheta], ['adr', '0047', '0047 · Nucleul de simulare pe CPU']);
  assert.equal(catalog.documente.find((d) => d.cale === 'docs/etape/etapa-03.md')?.eticheta, 'Etapa 3 — Senderul, postul cu contracte, observabilitatea, primul live');
  // Ordinea: categoriile în ordinea lor, ADR-urile după număr, indexul întâi.
  const adrCai = catalog.documente.filter((d) => d.categorie === 'adr').map((d) => d.cale);
  assert.equal(adrCai[0], 'docs/adr/README.md');
  assert.deepEqual(adrCai.slice(1), [...adrCai.slice(1)].sort());
});

test('determinismul: două generări dau aceleași fișiere, octet cu octet, în aceeași ordine; fără ore', () => {
  const a = genereazaDocumentatia('.');
  assert.deepEqual([...a.entries()], [...GENERAT.entries()]);
  assert.deepEqual([...a.keys()], [...a.keys()].sort());
  const r = a.get('documentatie/roadmap.json') ?? '';
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:/.test(r), 'nicio oră de build');
  assert.ok(!r.includes('\r'));
});

test('titluScurt și primaPropozitie', () => {
  assert.equal(titluScurt('Jurnalul de erori pe server (P0, partea 1a; ADR 0039): funcțiile în TypeScript'), 'Jurnalul de erori pe server');
  assert.equal(titluScurt('Oracolul G-code din s4 în `test/oracles/`, cu valorile pe hârtie'), 'Oracolul G-code din s4 în `test/oracles/`');
  assert.equal(titluScurt('**PWA offline, adusă din etapa 4** (plăcile netăiate)'), 'PWA offline');
  assert.equal(titluScurt('Dog-bone și T-bone'), 'Dog-bone și T-bone');
  assert.equal(titluScurt('Scheletul: `t()` en / ro, cu paritatea'), 'Scheletul');
  assert.ok(titluScurt('a'.repeat(200)).length <= 91);
  assert.equal(primaPropozitie('Prima, cu `a. B` înăuntru. A doua.'), 'Prima, cu `a. B` înăuntru.');
  assert.equal(primaPropozitie('Fără punct'), 'Fără punct');
  assert.ok(primaPropozitie(`${'x '.repeat(200)}.`).length <= 241);
});

// ——— Fixturi și poarta ———

const PLAN_MIC = `# Plan

### 5.3 Primele etape

**Etapa 1 — Unu (săptămâna 1).** Ținta: a.
1. **Primul punct:** x.
2. Al doilea, cu virgulă.

**Etapa 3 — Trei (săptămâna 4).** Ținta: c.
1. Doar unul.
2. Al doilea.

### 5.4 Etapele

| Săpt. | Etapa | Ținta | Închide (rânduri) | Placa probează | Live |
|---:|---|---|---|---|---|
| 1 | 1 | **Unu** | — | p1 | nu |
| 2 | 2 | Doi | x | p2 | **da (primul)** |
| 3 | T1 | **Tampon:** c | — | regresia | da |
| 4 | 3 | Trei | y | p3 | da; **pachetul** |

### 5.5 Altceva
`;

const fisa = (n: number, corp: string): string => `# Etapa ${n} — Proba ${n}

**Ținta:** x.

**Starea:** pornită pe 0${n}.01.2027.

${corp}`;

const FISA_1 = fisa(1, `## Feliile

| # | Felia | Clasa |
|---|---|---|
| 1.1 | Prima: detalii (ADR 0001) | R1 |
| 1.2 | A doua | R1 |

## Jurnalul feliilor

| # | Started | Completed | Treceri | Nota |
|---|---|---|---:|---|
| 1.1 | 01.01 10:00 | 01.01 11:00 | 2 | Gata. Mai mult. |
| 1.2 | 01.01 12:00 | 01.01 13:00 | 1 | Și asta (ADR 0002). |
`);

const FISA_2 = fisa(2, `## Feliile

| # | Felia | Clasa |
|---|---|---|
| 2.1 | Una | R1 |
| 2.2 | Împărțită | R1 |
| 2.2a | Sub | R1 |
| 2.3 | Neîncepută | R1 |

## Ce îi trebuie owner-ului

| Ce | Pentru | Termen |
|---|---|---|
| Placa | 2.2 | acum |

## Jurnalul feliilor

| # | Started | Completed | Treceri | Nota |
|---|---|---|---:|---|
| 2.1 | 02.01 10:00 | 02.01 11:00 | 2 | Gata. |
| 2.2a | 02.01 12:00 | — | — | În lucru. |
| 3.2↑ | 02.01 14:00 | 02.01 15:00 | 1 | **Adusă, adusă din etapa 3** (ADR 0002) |
`);

const INDEX = `# ADR

| ADR | Rândul | Decizia | Intră în |
|---|---|---|---|
| [0001](0001-a.md) | T1 | Prima | etapa 1 |
| [0002](0002-b.md) | — | A doua | etapa 2 |
`;
const ADR_1 = '# ADR 0001 — Prima decizie (T1)\n\n**Starea:** acceptat pe 07.10.2026.\n';
const ADR_2 = '# ADR 0002: A doua: cu detalii\n\n**Starea:** propus pe 19.10.2026.\n';

const surse = (schimba: Partial<SurseRoadmap> = {}): SurseRoadmap => ({
  plan: PLAN_MIC,
  fise: [{ cale: 'docs/etape/etapa-01.md', text: FISA_1 }, { cale: 'docs/etape/etapa-02.md', text: FISA_2 }],
  placi: [{ cale: 'docs/etape/placa-01.md', text: '# Fișa plăcii 1\n\nCe probează.\n' }],
  indexAdr: INDEX,
  adr: [{ cale: 'docs/adr/0001-a.md', text: ADR_1 }, { cale: 'docs/adr/0002-b.md', text: ADR_2 }],
  ...schimba,
});

/** Aruncă EroareDocumentatie, iar mesajul numește fișierul și ce nu s-a citit. */
function pica(f: () => unknown, cale: string, motiv: RegExp): void {
  assert.throws(f, (e: unknown) => {
    assert.ok(e instanceof EroareDocumentatie, String(e));
    assert.equal(e.cale, cale);
    assert.match(e.message, motiv);
    assert.ok(e.message.includes(cale), e.message);
    return true;
  });
}

test('fixtura: stările deduse (așteaptă placa, în lucru curentă, tamponul următor, adusă ↑), owner-ul, cifrele', () => {
  const r = construiesteRoadmap(surse());
  assert.deepEqual(r.etape.map((e) => [e.id, e.stare, e.curenta, e.asteaptaPlaca]), [
    ['1', 'in-lucru', false, true], ['2', 'in-lucru', true, false], ['T1', 'urmatoare', false, false], ['3', 'viitoare', false, false],
  ]);
  const doi = r.etape[1];
  assert.deepEqual(doi?.felii.map((f) => [f.id, f.stare]), [['2.1', 'gata'], ['2.2', 'in-lucru'], ['2.2a', 'in-lucru'], ['2.3', 'de-facut']]);
  assert.equal(doi?.felii[1]?.dinSubfelii, true);
  assert.equal(doi?.felii[2]?.completed, null, '„—” = neterminată');
  assert.equal(doi?.felii[2]?.treceri, null);
  const trei = r.etape[3];
  assert.deepEqual(trei?.felii.map((f) => [f.id, f.adusa, f.titlu, f.adr]), [['3.2↑', true, 'Adusă', ['0002']]]);
  assert.deepEqual(trei?.puncte.map((p) => [p.numar, p.felii]), [[1, []], [2, ['3.2↑']]]);
  assert.equal(r.etape[0]?.felii[0]?.titlu, 'Prima');
  assert.deepEqual(r.etape[0]?.felii[0]?.adr, ['0001']);
  assert.equal(r.etape[0]?.felii[0]?.nota, 'Gata.');
  assert.deepEqual(r.owner, [{ ce: 'Placa', pentru: '2.2', termen: 'acum', etapa: '2', fisa: 'docs/etape/etapa-02.md', ancora: 'ce-îi-trebuie-owner-ului' }]);
  assert.deepEqual(r.cifre.felii, { gata: 4, inLucru: 2, deFacut: 1, aduse: 1 });
  assert.deepEqual(r.cifre.adr, { total: 2, acceptate: 1, propuse: 1, inlocuite: 0, altele: 0 });
  assert.equal(r.etape[1]?.areLive, true);
  assert.equal(r.etape[0]?.areLive, false);
  assert.equal(r.adr['0002']?.titlu, 'A doua');
});

test('fixtura: placa tăiată (**Tăiată:** pe fișa plăcii) încheie etapa cu toate feliile gata', () => {
  const r = construiesteRoadmap(surse({ placi: [{ cale: 'docs/etape/placa-01.md', text: '# Fișa plăcii 1\n\n**Tăiată:** 20.10.2026, cotele în teste.\n' }] }));
  assert.deepEqual([r.etape[0]?.stare, r.etape[0]?.placaTaiata, r.cifre.etapeGata, r.cifre.placi.taiate], ['gata', '20.10.2026', 1, 1]);
  // Cu placa tăiată dar o felie neterminată, etapa rămâne în lucru.
  const r2 = construiesteRoadmap(surse({
    fise: [{ cale: 'docs/etape/etapa-01.md', text: FISA_1.replace('| 1.2 | 01.01 12:00 | 01.01 13:00 |', '| 1.2 | 01.01 12:00 | — |') }, { cale: 'docs/etape/etapa-02.md', text: FISA_2 }],
    placi: [{ cale: 'docs/etape/placa-01.md', text: '# Fișa plăcii 1\n\n**Tăiată:** 20.10.2026\n' }],
  }));
  assert.equal(r2.etape[0]?.stare, 'in-lucru');
  assert.equal(r2.etape[0]?.asteaptaPlaca, false);
});

test('poarta, PLAN.md: antetul §5.4 schimbat, o etapă lipsă, o săptămână sărită, secțiunea lipsă', () => {
  pica(() => citesteEtapele(PLAN_MIC.replace('| Ținta |', '| Scopul |')), 'PLAN.md', /5\.4/);
  pica(() => citesteEtapele(PLAN_MIC.replace('| 2 | 2 | Doi | x | p2 | **da (primul)** |\n', '')), 'PLAN.md', /etap/);
  pica(() => citesteEtapele(PLAN_MIC.replace('| 4 | 3 |', '| 5 | 3 |')), 'PLAN.md', /săptăm/);
  pica(() => citesteEtapele(PLAN_MIC.replace('### 5.4 Etapele', '### 5.4 Altele')), 'PLAN.md', /5\.4/);
  pica(() => citesteEtapele(PLAN_MIC.replace('| 3 | T1 |', '| 3 | X1 |')), 'PLAN.md', /X1/);
  pica(() => citesteDetaliile(PLAN_MIC.replace('### 5.3 Primele etape', '### 5.3 Altceva')), 'PLAN.md', /5\.3/);
  pica(() => construiesteRoadmap(surse({ plan: PLAN_MIC.replace('**Etapa 3 — Trei', '**Etapa 9 — Trei') })), 'PLAN.md', /9/);
});

test('poarta, fișa: jurnalul fără antetul lui, un rând rupt, un rând de tabel orfan, un id dublu, un id străin, o dată lipsă', () => {
  const c = 'docs/etape/etapa-02.md';
  pica(() => citesteFisa(c, FISA_2.replace('| Treceri | Nota |', '| Treceri | Note |')), c, /Jurnalul/);
  pica(() => citesteFisa(c, FISA_2.replace('## Jurnalul feliilor', '## Jurnal')), c, /Jurnalul/);
  pica(() => citesteFisa(c, FISA_2.replace('## Feliile', '## Lista')), c, /Feliile/);
  // Rândul rupt de la 1.10 (etapa 1, până la 19.10): fără `|` la capăt, iar restul notei pe linia următoare.
  pica(() => citesteFisa(c, FISA_2.replace('| 2.1 | 02.01 10:00 | 02.01 11:00 | 2 | Gata. |', '| 2.1 | 02.01 10:00 | 02.01 11:00 | 2 | Gata, cu `\n`-uri pierdute |')), c, /2\.1|rând/);
  pica(() => citesteFisa(c, FISA_2.replace('| 2.1 | 02.01 10:00 | 02.01 11:00 | 2 | Gata. |', '| 2.1 | 02.01 10:00 | 02.01 11:00 | Gata. |')), c, /2\.1/);
  // Un rând gol în tabelul feliilor: restul rândurilor ar deveni un paragraf (ca 1.10 în etapa 1).
  pica(() => citesteFisa(c, FISA_2.replace('| 2.2a | Sub | R1 |\n', '\n| 2.2a | Sub | R1 |\n')), c, /tabel/);
  pica(() => citesteFisa(c, FISA_2.replace('| 2.2a | 02.01 12:00 |', '| 2.1 | 02.01 12:00 |')), c, /2\.1/);
  pica(() => citesteFisa(c, FISA_2.replace('| 3.2↑ |', '| 3.2 |')), c, /3\.2/);
  pica(() => citesteFisa(c, FISA_2.replace('| 3.2↑ |', '| 1.9↑ |')), c, /1\.9↑/);
  pica(() => citesteFisa(c, FISA_2.replace('| 2.1 | 02.01 10:00 |', '| 2.1 |  |')), c, /2\.1/);
  pica(() => citesteFisa(c, FISA_2.replace('| 2.3 | Neîncepută | R1 |', '| 2 3 | Neîncepută | R1 |')), c, /2 3/);
  pica(() => citesteFisa(c, FISA_2.replace('# Etapa 2 — Proba 2', '# Etapa 7 — Proba 2')), c, /7/);
  pica(() => citesteFisa(c, FISA_2.replace('| Ce | Pentru | Termen |', '| Ce | Cine | Termen |')), c, /owner/);
  // Treceri care nu e un număr.
  pica(() => citesteFisa(c, FISA_2.replace('| 02.01 11:00 | 2 |', '| 02.01 11:00 | doi |')), c, /doi/);
  // Aceeași felie adusă (↑) și în jurnalul altei fișe: două rânduri cu același id la etapa 3.
  const dubla = FISA_1.replace('| 1.2 | 01.01 12:00 | 01.01 13:00 | 1 | Și asta (ADR 0002). |', '$&\n| 3.2↑ | 01.01 14:00 | — | — | Tot ea. |');
  pica(() => construiesteRoadmap(surse({ fise: [{ cale: 'docs/etape/etapa-01.md', text: dubla }, { cale: 'docs/etape/etapa-02.md', text: FISA_2 }] })), c, /3\.2↑.*etapa-01\.md/);
});

test('poarta, ADR: un fișier lipsă din index, un rând din index fără fișier, titlul cu alt număr, starea lipsă', () => {
  pica(() => construiesteRoadmap(surse({ adr: [{ cale: 'docs/adr/0001-a.md', text: ADR_1 }] })), 'docs/adr/README.md', /0002/);
  pica(() => construiesteRoadmap(surse({ adr: [...surse().adr, { cale: 'docs/adr/0003-c.md', text: '# ADR 0003 — C\n\n**Starea:** propus.\n' }] })), 'docs/adr/README.md', /0003/);
  pica(() => citesteAdr('docs/adr/0002-b.md', ADR_2.replace('ADR 0002', 'ADR 0020')), 'docs/adr/0002-b.md', /0020/);
  pica(() => citesteAdr('docs/adr/0002-b.md', ADR_2.replace('**Starea:**', 'Starea:')), 'docs/adr/0002-b.md', /Starea/);
  pica(() => citesteIndexAdr(INDEX.replace('| Decizia |', '| Ce |')), 'docs/adr/README.md', /antet/);
  pica(() => citesteIndexAdr(INDEX.replace('[0002](0002-b.md)', '0002')), 'docs/adr/README.md', /0002/);
  pica(() => citestePlaca('docs/etape/placa-01.md', '# Placa 1\n'), 'docs/etape/placa-01.md', /Fișa plăcii/);
  pica(() => citestePlaca('docs/etape/placa-01.md', '# Fișa plăcii 2\n'), 'docs/etape/placa-01.md', /2/);
});

test('poarta pe arborele real copiat: un tabel stricat face generarea să pice, cu fișierul și motivul', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cncvs2-doc-'));
  try {
    for (const f of ['PLAN.md', 'CLAUDE.md', 'DEVLOG.md']) cpSync(f, join(dir, f));
    cpSync('docs/etape', join(dir, 'docs/etape'), { recursive: true });
    cpSync('docs/adr', join(dir, 'docs/adr'), { recursive: true });
    assert.deepEqual([...genereazaDocumentatia(dir).keys()], [...GENERAT.keys()], 'copia întreagă se generează la fel');
    const fisa3 = join(dir, 'docs/etape/etapa-03.md');
    writeFileSync(fisa3, readFileSync(fisa3, 'utf8').replace('| # | Started | Completed | Treceri | Nota |', '| # | Început | Completed | Treceri | Nota |'));
    pica(() => genereazaDocumentatia(dir), 'docs/etape/etapa-03.md', /Jurnalul/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
