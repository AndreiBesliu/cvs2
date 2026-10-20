/**
 * Cititorul de markdown (ADR 0048 §4): subsetul pe care îl folosesc documentele proiectului, ca arbore pur (fără HTML,
 * fără React), pe fiecare construct și pe documentele reale. Același cititor îl va folosi documentația live (felia
 * următoare), iar generatorul documentației admin citește tabelele cu aceleași funcții (`citesteTabel`, `celule`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ancora, celule, citesteTabel, felLegatura, parseazaInline, parseazaMarkdown, rezolvaRelativ, textSimplu,
  type Bloc, type Inline,
} from '../../src/docs/markdown.ts';

const unic = (b: readonly Bloc[]): Bloc => {
  assert.equal(b.length, 1, JSON.stringify(b));
  return b[0] as Bloc;
};
const text = (s: string): Inline => ({ tip: 'text', text: s });

test('titlurile: nivelurile 1–6, ancora din text, # de la capăt scos; 7 diezi sau fără spațiu = paragraf', () => {
  const b = parseazaMarkdown('# Etapa 1 — Un schelet\n## Feliile ##\n###### Șase\n####### Șapte\n#fara');
  assert.deepEqual(b.map((x) => x.tip), ['titlu', 'titlu', 'titlu', 'paragraf']);
  assert.deepEqual(b[0], { tip: 'titlu', nivel: 1, continut: [text('Etapa 1 — Un schelet')], ancora: 'etapa-1-un-schelet' });
  assert.equal((b[1] as Extract<Bloc, { tip: 'titlu' }>).nivel, 2);
  assert.deepEqual((b[1] as Extract<Bloc, { tip: 'titlu' }>).continut, [text('Feliile')]);
  assert.equal((b[2] as Extract<Bloc, { tip: 'titlu' }>).nivel, 6);
  assert.deepEqual((b[3] as Extract<Bloc, { tip: 'paragraf' }>).continut, [text('####### Șapte #fara')]);
});

test('ancora: litere mici, diacriticele păstrate, punctuația scoasă, spațiile → -', () => {
  assert.equal(ancora('Ce îi trebuie owner-ului (coada din `PLAN.md` §8.3)'), 'ce-îi-trebuie-owner-ului-coada-din-planmd-83');
  assert.equal(ancora('  Două   spații  '), 'două-spații');
});

test('paragraful: liniile se unesc cu spațiu; două spații la capăt sau `\\` = rând nou; <br> = rând nou', () => {
  const p = unic(parseazaMarkdown('unu\ndoi  \ntrei\\\npatru<br>cinci')) as Extract<Bloc, { tip: 'paragraf' }>;
  assert.deepEqual(p.continut, [text('unu doi'), { tip: 'rand-nou' }, text('trei'), { tip: 'rand-nou' }, text('patru'), { tip: 'rand-nou' }, text('cinci')]);
  assert.equal(p.brut, 'unu\ndoi  \ntrei\\\npatru<br>cinci');
});

test('accentul: **tare**, *cursiv*, _cursiv_; _ în mijlocul cuvântului rămâne text', () => {
  assert.deepEqual(parseazaInline('a **b c** d *e* _f_ snake_case_x'), [
    text('a '), { tip: 'tare', continut: [text('b c')] }, text(' d '), { tip: 'cursiv', continut: [text('e')] }, text(' '),
    { tip: 'cursiv', continut: [text('f')] }, text(' snake_case_x'),
  ]);
  assert.deepEqual(parseazaInline('**Gata când:** *x*'), [{ tip: 'tare', continut: [text('Gata când:')] }, text(' '), { tip: 'cursiv', continut: [text('x')] }]);
  // Un delimitator fără pereche rămâne text.
  assert.deepEqual(parseazaInline('2 * 3 și **neînchis'), [text('2 * 3 și **neînchis')]);
});

test('codul inline: conținutul exact (fără accent sau linkuri înăuntru), cu ghilimele duble de backtick', () => {
  assert.deepEqual(parseazaInline('`**nu** [x](y)` și `` a`b ``'), [{ tip: 'cod', text: '**nu** [x](y)' }, text(' și '), { tip: 'cod', text: 'a`b' }]);
  assert.deepEqual(parseazaInline('`neînchis'), [text('`neînchis')]);
  assert.deepEqual(parseazaInline('`<id element>`'), [{ tip: 'cod', text: '<id element>' }]);
});

test('escape-urile: \\* și \\` rămân caractere', () => {
  assert.deepEqual(parseazaInline('\\*nu\\* \\`x\\`'), [text('*nu* `x`')]);
});

test('linkurile: externe doar http(s), interne relative sau #ancoră; javascript:, data:, // rămân text', () => {
  assert.deepEqual(parseazaInline('[ADR](0001-a.md) [web](https://x.ro/a) <https://y.ro/> [s](#feliile)'), [
    { tip: 'legatura', href: '0001-a.md', fel: 'interna', continut: [text('ADR')] }, text(' '),
    { tip: 'legatura', href: 'https://x.ro/a', fel: 'externa', continut: [text('web')] }, text(' '),
    { tip: 'legatura', href: 'https://y.ro/', fel: 'externa', continut: [text('https://y.ro/')] }, text(' '),
    { tip: 'legatura', href: '#feliile', fel: 'interna', continut: [text('s')] },
  ]);
  for (const rau of ['javascript:alert(1)', 'JAVASCRIPT:x', 'data:text/html,x', '//rau.ro/x', 'vbscript:x', 'mailto:a@b.ro', 'file:///c:/x']) {
    const r = parseazaInline(`[clic](${rau})`);
    assert.deepEqual(r, [text('clic')], rau);
    assert.equal(felLegatura(rau), 'interzisa', rau);
  }
  assert.equal(felLegatura('../faza2/s1.md'), 'interna');
  assert.equal(felLegatura('HTTPS://x.ro'), 'externa');
  // Accentul din eticheta unui link.
  assert.deepEqual(parseazaInline('[**0001**](a.md)'), [{ tip: 'legatura', href: 'a.md', fel: 'interna', continut: [{ tip: 'tare', continut: [text('0001')] }] }]);
  // Paranteza pătrată fără link rămâne text.
  assert.deepEqual(parseazaInline('[măsurat, s1 §4]'), [text('[măsurat, s1 §4]')]);
});

test('HTML brut: rămâne text (doar <br> are sens), fără niciun nod HTML în arbore', () => {
  const r = parseazaInline('<script>alert(1)</script> <img src=x onerror=y> <b>x</b>');
  assert.deepEqual(r, [text('<script>alert(1)</script> <img src=x onerror=y> <b>x</b>')]);
  const b = parseazaMarkdown('<div>\n<script>x</script>\n</div>');
  assert.deepEqual(b.map((x) => x.tip), ['paragraf']);
});

test('listele: neordonate, ordonate (cu startul), imbricate pe indentare, continuarea leneșă', () => {
  const b = unic(parseazaMarkdown('- unu\n  continuat\n- doi\n  - doi.a\n  - doi.b\n- trei\nleneș')) as Extract<Bloc, { tip: 'lista' }>;
  assert.equal(b.ordonata, false);
  assert.equal(b.elemente.length, 3);
  assert.deepEqual(b.elemente[0]?.blocuri, [{ tip: 'paragraf', continut: [text('unu continuat')], brut: 'unu\ncontinuat' }]);
  const doi = b.elemente[1]?.blocuri ?? [];
  assert.deepEqual(doi.map((x) => x.tip), ['paragraf', 'lista']);
  assert.equal((doi[1] as Extract<Bloc, { tip: 'lista' }>).elemente.length, 2);
  assert.deepEqual((b.elemente[2]?.blocuri[0] as Extract<Bloc, { tip: 'paragraf' }>).continut, [text('trei leneș')]);

  const o = unic(parseazaMarkdown('3. trei\n4. patru\n   - sub\n5. cinci')) as Extract<Bloc, { tip: 'lista' }>;
  assert.equal(o.ordonata, true);
  assert.equal(o.start, 3);
  assert.equal(o.elemente.length, 3);
  assert.deepEqual(o.elemente[1]?.blocuri.map((x) => x.tip), ['paragraf', 'lista']);
});

test('listele de bifat: [ ] și [x] devin bife; restul elementelor n-au bifă (null)', () => {
  const b = unic(parseazaMarkdown('- [ ] de făcut\n- [x] făcut\n- [X] tot făcut\n- simplu')) as Extract<Bloc, { tip: 'lista' }>;
  assert.deepEqual(b.elemente.map((e) => e.bifa), [false, true, true, null]);
  assert.deepEqual(b.elemente[0]?.blocuri, [{ tip: 'paragraf', continut: [text('de făcut')], brut: 'de făcut' }]);
});

test('o listă cu un rând gol între elemente rămâne o listă; o listă de alt fel începe o listă nouă', () => {
  const b = parseazaMarkdown('- a\n\n- b\n\n1. c');
  assert.deepEqual(b.map((x) => x.tip), ['lista', 'lista']);
  assert.equal((b[0] as Extract<Bloc, { tip: 'lista' }>).elemente.length, 2);
});

test('citatele: > pe fiecare rând, cu blocuri înăuntru', () => {
  const c = unic(parseazaMarkdown('> Ești o sesiune\n> independentă.\n>\n> - unu')) as Extract<Bloc, { tip: 'citat' }>;
  assert.deepEqual(c.blocuri.map((x) => x.tip), ['paragraf', 'lista']);
  assert.deepEqual((c.blocuri[0] as Extract<Bloc, { tip: 'paragraf' }>).continut, [text('Ești o sesiune independentă.')]);
});

test('blocurile de cod: liniile EXACTE (indentarea, rândurile goale, markdown-ul neinterpretat), limbajul', () => {
  const md = '```powershell\n  npm run build\n\n# nu e titlu\n| nu | tabel |\n```\ndupă';
  const b = parseazaMarkdown(md);
  assert.deepEqual(b[0], { tip: 'cod', limbaj: 'powershell', linii: ['  npm run build', '', '# nu e titlu', '| nu | tabel |'] });
  assert.equal(b[1]?.tip, 'paragraf');
  // Neînchis: până la capăt. Cu tilde, la fel.
  assert.deepEqual(parseazaMarkdown('~~~\na\n```\n'), [{ tip: 'cod', limbaj: '', linii: ['a', '```'] }]);
});

test('regula orizontală: ---, ***, ___ (și cu spații)', () => {
  assert.deepEqual(parseazaMarkdown('---\n\n* * *\n\n___').map((x) => x.tip), ['regula', 'regula', 'regula']);
});

test('tabelele: antetul, alinierea, celulele cu inline, rândurile scurte completate, `\\|` în celulă', () => {
  const t = unic(parseazaMarkdown('| # | Felia | Treceri |\n|---|:---:|---:|\n| 1.1 | **Fișa** `a\\|b` | 2 |\n| 1.2 | scurt |')) as Extract<Bloc, { tip: 'tabel' }>;
  assert.deepEqual(t.antet, [[text('#')], [text('Felia')], [text('Treceri')]]);
  assert.deepEqual(t.aliniere, [null, 'centru', 'dreapta']);
  assert.deepEqual(t.randuri[0], [[text('1.1')], [{ tip: 'tare', continut: [text('Fișa')] }, text(' '), { tip: 'cod', text: 'a|b' }], [text('2')]]);
  assert.deepEqual(t.randuri[1], [[text('1.2')], [text('scurt')], []]);
});

test('citesteTabel: celulele brute, linia de sfârșit; fără separator nu e tabel; un rând de text lipit continuă tabelul (ca GFM)', () => {
  const linii = ['| a | b |', '|---|---|', '| 1 | 2 |', 'lipit', '', '| x |'];
  const t = citesteTabel(linii, 0);
  assert.ok(t);
  assert.deepEqual(t.antet, ['a', 'b']);
  assert.deepEqual(t.randuri, [['1', '2'], ['lipit']]);
  assert.equal(t.sfarsit, 4);
  assert.equal(citesteTabel(linii, 5), null);
  assert.equal(citesteTabel(['| a | b |', '|---|'], 0), null, 'separatorul cu alt număr de coloane nu face tabel');
  assert.deepEqual(celule('| a | `b` | c \\| d |'), ['a', '`b`', 'c | d']);
  assert.deepEqual(celule('| fără capăt | x'), ['fără capăt', 'x']);
});

test('un tabel se oprește la un titlu sau la un bloc de cod', () => {
  const b = parseazaMarkdown('| a |\n|---|\n| 1 |\n## T\n| b |\n|---|\n```\nx\n```');
  assert.deepEqual(b.map((x) => x.tip), ['tabel', 'titlu', 'tabel', 'cod']);
});

test('textSimplu și rezolvaRelativ', () => {
  assert.equal(textSimplu(parseazaInline('**a** `b` [c](d)<br>e')), 'a b c e');
  assert.equal(rezolvaRelativ('docs/adr/README.md', '0001-a.md'), 'docs/adr/0001-a.md');
  assert.equal(rezolvaRelativ('docs/adr/0001-a.md', '../etape/etapa-01.md#feliile'), 'docs/etape/etapa-01.md#feliile');
  assert.equal(rezolvaRelativ('docs/adr/0001-a.md', '../../PLAN.md'), 'PLAN.md');
  assert.equal(rezolvaRelativ('PLAN.md', './docs/./adr/README.md'), 'docs/adr/README.md');
  assert.equal(rezolvaRelativ('docs/adr/0001-a.md', '#decizia'), 'docs/adr/0001-a.md#decizia');
  assert.equal(rezolvaRelativ('PLAN.md', '../afara.md'), null, 'în afara rădăcinii');
  assert.equal(rezolvaRelativ('PLAN.md', '/abs.md'), null);
});

test('fără HTML brut: nimic `dangerouslySetInnerHTML` / `innerHTML` în cititor și în filele adminului (plasa pe sursă)', () => {
  const surse = ['src/docs', 'src/admin'].flatMap((d) => readdirSync(d, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f)).map((f) => `${d}/${f.replace(/\\/g, '/')}`));
  assert.ok(surse.includes('src/docs/Markdown.tsx') && surse.includes('src/admin/roadmap/FilaRoadmap.tsx'), 'plasa vede fișierele');
  for (const f of surse) assert.doesNotMatch(readFileSync(f, 'utf8'), /dangerouslySetInnerHTML\s*=|\.(?:inner|outer)HTML\s*=|insertAdjacentHTML\s*\(/, f);
});

test('pe documentele reale: niciun rând de tabel lăsat ca text, codul exact, linkurile', () => {
  const placa = readFileSync('docs/etape/placa-02.md', 'utf8').replace(/\r\n/g, '\n');
  const b = parseazaMarkdown(placa);
  assert.equal(b[0]?.tip, 'titlu');
  const cod = b.find((x): x is Extract<Bloc, { tip: 'cod' }> => x.tip === 'cod');
  assert.ok(cod);
  assert.equal(cod.limbaj, 'powershell');
  // Liniile exacte, ca în fișier, între gărduri.
  const intre = placa.split('```powershell\n')[1]?.split('\n```')[0] ?? '';
  assert.deepEqual(cod.linii, intre.split('\n'));

  for (const cale of ['PLAN.md', 'docs/adr/README.md', 'docs/etape/etapa-01.md', 'docs/etape/etapa-02.md', 'docs/etape/etapa-03.md', 'docs/adr/0047-nucleul-de-simulare.md']) {
    const blocuri = parseazaMarkdown(readFileSync(cale, 'utf8').replace(/\r\n/g, '\n'));
    // Un paragraf care începe cu `|` ar fi un tabel citit greșit.
    const rupte: string[] = [];
    const umbla = (bs: readonly Bloc[]): void => {
      for (const x of bs) {
        if (x.tip === 'paragraf' && x.brut.startsWith('|')) rupte.push(x.brut.slice(0, 60));
        if (x.tip === 'lista') for (const e of x.elemente) umbla(e.blocuri);
        if (x.tip === 'citat') umbla(x.blocuri);
      }
    };
    umbla(blocuri);
    assert.deepEqual(rupte, [], cale);
  }
  const index = parseazaMarkdown(readFileSync('docs/adr/README.md', 'utf8').replace(/\r\n/g, '\n'));
  const tabel = index.find((x): x is Extract<Bloc, { tip: 'tabel' }> => x.tip === 'tabel');
  assert.ok(tabel);
  assert.ok(tabel.randuri.length >= 47);
  assert.deepEqual(tabel.randuri[0]?.[0], [{ tip: 'legatura', href: '0001-conturul-are-trei-primitive.md', fel: 'interna', continut: [text('0001')] }]);
  // PLAN.md: <br> în celulele tabelului T1–T23 devine rând nou, nu text.
  const plan = parseazaMarkdown(readFileSync('PLAN.md', 'utf8').replace(/\r\n/g, '\n'));
  const json = JSON.stringify(plan);
  assert.ok(json.includes('"rand-nou"'));
  assert.ok(!json.includes('<br>'));
});
