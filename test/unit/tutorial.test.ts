/**
 * Testul pas cu pas (ADR 0072): generatorul pașilor (`scripts/tutorial.ts`, cu poarta lui), forma fișierului
 * (`esteTutorial`) și raportul (`raportHtml`: rezultatele, notele scăpate de HTML, pozele încorporate, datele citibile).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { citesteTutorial, genereazaTutorialele, sursaTutorial } from '../../scripts/tutorial.ts';
import { esteTutorial, fisierTutorial, type Tutorial } from '../../shared/tutorial.ts';
import { numaratoare, numeRaport, raportHtml } from '../../src/app/raportTest.ts';

const citeste = (cale: string): string => readFileSync(cale, 'utf8');
/** Pașii testului din artifact (25.10), în ordine: testul din aplicație îi păstrează pe toți. */
const ID_ARTIFACT = [
  'p-deschide', 'p-curata', 'd-dreptunghi', 'd-cerc', 'd-elipsa', 'd-lipire', 'd-ghidaj', 's-cadru', 's-shift', 't-manere', 't-oglinda',
  't-inclina', 'c-grila', 'c-cerc', 'c-curba', 'o-exterior', 'o-interior', 'b-scade', 'b-uneste', 'b-disjuncte', 'pen-desen', 'pen-parti',
  'pen-taste', 'n-muta', 'n-tipuri', 'n-cerc', 'n-gaura', 'a-aliniaza', 'x-anulare', 'x-manual', 'x-export',
];

test('testul uneltelor: 31 de pași în 11 secțiuni, aceiași ca în artifact, fiecare cu „faci” și „vezi”; fișierul trece de formă', () => {
  const f = genereazaTutorialele(citeste);
  assert.deepEqual([...f.keys()], [fisierTutorial('unelte-desen')]);
  const t = JSON.parse(f.get(fisierTutorial('unelte-desen')) ?? '') as Tutorial;
  assert.equal(esteTutorial(t), true);
  assert.equal(t.titlu, 'Testul uneltelor de desen');
  assert.equal(t.sectiuni.length, 11);
  assert.deepEqual(t.sectiuni.flatMap((s) => s.pasi.map((p) => p.id)), ID_ARTIFACT);
  const d = t.sectiuni[1]!.pasi[0]!;
  assert.deepEqual([d.titlu, d.faci, d.vezi], [
    'Dreptunghiul', 'Dreptunghi (`R`): trage pe foaie; apoi încă unul ținând `Shift`.',
    'Un dreptunghi din colț în colț; cu Shift, un pătrat. Forma nouă e aleasă și apare în listă.',
  ]);
  assert.match(t.intro, /^Fiecare pas spune ce faci/);
  // Mai multe rânduri ale aceluiași câmp se unesc cu un spațiu.
  assert.match(t.sectiuni[2]!.pasi[0]!.faci, /peste jumătatea alteia; apoi la fel, de la dreapta la stânga\.$/);
});

test('poarta generatorului: id lipsă, repetat sau greșit, câmp lipsă, cheie necunoscută, text sau pas în afara locului', () => {
  const pas = (id: string, corp = '%% faci\nA\n%% vezi\nB') => `### P\n%% pas: ${id}\n${corp}\n`;
  const sursa = (corp: string) => `# T\nIntro.\n\n## S\n\n${corp}`;
  const rau = (text: string, motiv: RegExp) => {
    assert.throws(() => citesteTutorial(text, 'unelte-desen', 'x.md'), (e: Error) => motiv.test(e.message), motiv.source);
  };
  assert.equal(citesteTutorial(sursa(pas('a')), 'unelte-desen', 'x.md').sectiuni[0]!.pasi[0]!.id, 'a');
  rau(sursa('### P\n%% faci\nA\n%% vezi\nB\n'), /n-are „%% pas: id”/);
  rau(sursa(pas('a') + pas('a')), /id-ul „a” se repetă/);
  rau(sursa(pas('A_b')), /doar litere mici/);
  rau(sursa(pas('a', '%% faci\nA')), /cere „%% faci” și „%% vezi”/);
  rau(sursa(pas('a', '%% faci\nA\n%% vezi\nB\n%% poza\nC')), /cheia „poza” nu există/);
  rau(sursa(pas('a', 'A\n%% faci\nA\n%% vezi\nB')), /stă sub „%% faci” sau „%% vezi”/);
  rau(`# T\n\n${pas('a')}`, /în afara unei secțiuni/);
  rau(sursa(`${pas('a')}\n## Goală\n\n## Alta\n${pas('b')}`), /secțiunea dinainte n-are pași/);
  rau('Fără titlu', /începe cu „# Titlu”/);
  rau(`# T\n\n## S\n`, /cere secțiuni cu pași/);
  assert.equal(sursaTutorial('unelte-desen'), 'docs/tutorial/unelte-desen.md');
});

test('forma fișierului: un câmp lipsă, alt test, altă schemă nu trec', () => {
  const bun: Tutorial = { schema: 1, id: 'unelte-desen', titlu: 'T', intro: '', sectiuni: [{ titlu: 'S', pasi: [{ id: 'a', titlu: 'P', faci: 'A', vezi: 'B' }] }] };
  assert.equal(esteTutorial(bun), true);
  for (const rau of [{ ...bun, schema: 2 }, { ...bun, id: 'altul' }, { ...bun, sectiuni: [] }, { ...bun, sectiuni: [{ titlu: 'S', pasi: [{ id: 'a', titlu: 'P', faci: '', vezi: 'B' }] }] }, null, 'x']) {
    assert.equal(esteTutorial(rau), false, JSON.stringify(rau));
  }
});

test('raportul: rezultatele, notele scăpate, pozele încorporate pe pasul lor și datele citibile din HTML', () => {
  const tutorial: Tutorial = {
    schema: 1, id: 'unelte-desen', titlu: 'Testul <uneltelor>', intro: '',
    sectiuni: [{ titlu: 'S1', pasi: [{ id: 'a', titlu: 'Unu', faci: 'F `R`', vezi: 'V' }, { id: 'b', titlu: 'Doi', faci: 'F', vezi: 'V' }] },
      { titlu: 'S2', pasi: [{ id: 'c', titlu: 'Trei', faci: 'F', vezi: 'V' }] }],
  };
  const stare = { pas: 1, rezultate: { a: { stare: 'bine' as const, nota: '', la: 1 }, b: { stare: 'nu' as const, nota: 'mânerul <script>alert(1)</script> & </script>', la: 2 } } };
  const la = new Date(2026, 9, 25, 15, 42).getTime();
  const html = raportHtml({
    tutorial, stare, versiune: 'abc123', instanta: 'test', browser: 'Edge', generatLa: la,
    poze: [{ pas: 'b', la, src: 'data:image/png;base64,iVBORw0KGgo=' }, { pas: 'b', la, src: 'data:image/png;base64,AAAA' }],
  });
  assert.deepEqual(numaratoare(tutorial, stare), { bine: 1, nu: 1, sarit: 0, ramas: 1 });
  assert.equal(numeRaport('unelte-desen', la), 'raport-test-unelte-desen-2026-10-25-1542.html');
  assert.match(html, /^<!doctype html>/);
  assert.ok(html.includes('<title>Raportul testului: Testul &lt;uneltelor&gt;</title>'));
  assert.ok(html.includes('1 bine · 1 nu · 0 sărite · 1 rămase'));
  assert.ok(html.includes('mânerul &lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;/script&gt;'));
  assert.equal(html.match(/<script/g)?.length, 1, 'singurul <script> e al datelor');
  assert.equal(html.match(/<img data-pas="b" src="data:image\/png;base64,/g)?.length, 2);
  assert.ok(html.includes('<article id="c" class="ramas"><h3>3. Trei · <span>—</span></h3>'));
  const date = JSON.parse(/<script type="application\/json" id="date-raport">([^<]*)<\/script>/.exec(html)?.[1] ?? '') as {
    pasi: Array<{ id: string; stare: string | null; nota: string; poze: number }>; bine: number; versiune: string;
  };
  assert.deepEqual(date.pasi.map((p) => [p.id, p.stare, p.poze]), [['a', 'bine', 0], ['b', 'nu', 2], ['c', null, 0]]);
  assert.equal(date.pasi[1]!.nota, stare.rezultate.b.nota);
  assert.deepEqual([date.bine, date.versiune], [1, 'abc123']);
});
