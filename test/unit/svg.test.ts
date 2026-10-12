import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cerculArcului, type Varf } from '../../src/geom/contur.ts';
import { TOLERANTA_IMPORT } from '../../src/geom/toleranta.ts';
import { laturiDinImbricare } from '../../src/io/imbricare.ts';
import { numeDinFisier, piesaDinImport } from '../../src/io/piesa.ts';
import { citesteDateCale, citesteTransform } from '../../src/io/svgDate.ts';
import { problemaEntitati } from '../../src/io/svg.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { documentNou } from '../../src/model/document.ts';
import { citeste, octeti, pagina, PARSER } from './ajutor-svg.ts';
import { citesteSvg } from '../../src/io/svg.ts';

const aproape = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);
const puncte = (v: readonly Varf[]) => v.map((x) => [+x.p.x.toFixed(9), +x.p.y.toFixed(9)]);

function cai(text: string, px: 96 | 72 = 96) {
  const r = citeste(text, { pxPeTol: px });
  assert.ok(r.ok, r.ok ? '' : `refuzat: ${r.cod} ${r.detaliu ?? ''}`);
  return r;
}

test('pagina în mm cu Y în sus: un dreptunghi de 30 × 20 la (10, 10) din colțul de sus', () => {
  const r = cai(pagina('<rect x="10" y="10" width="30" height="20"/>'));
  assert.deepEqual(r.pagina, { latime: 100, inaltime: 50 });
  assert.equal(r.px, false);
  assert.deepEqual(puncte(r.cai[0]?.varfuri ?? []), [[10, 40], [40, 40], [40, 20], [10, 20]]);
});

test('unitățile pe hârtie: 1 in = 25,4 mm; px la 96 (CSS) sau la 72 (Illustrator); viewBox 2000 pe 200 mm = 0,1', () => {
  const lat = (rad: string, corp: string, px: 96 | 72 = 96) => {
    const v = cai(pagina(corp, rad), px).cai[0]?.varfuri ?? [];
    const xs = v.map((x) => x.p.x);
    return Math.max(...xs) - Math.min(...xs);
  };
  aproape(lat('width="2in" height="1in" viewBox="0 0 2 1"', '<rect width="1" height="1"/>'), 25.4);
  aproape(lat('width="96" height="96"', '<rect width="96" height="10"/>'), 25.4);
  aproape(lat('width="96" height="96"', '<rect width="72" height="10"/>', 72), 25.4);
  aproape(lat('width="200mm" height="100mm" viewBox="0 0 2000 1000"', '<rect width="800" height="10"/>'), 80);
  aproape(lat('width="10cm" height="5cm" viewBox="0 0 100 50"', '<rect width="10" height="1"/>'), 10);
  aproape(lat('width="72pt" height="72pt" viewBox="0 0 72 72"', '<rect width="72" height="1"/>'), 25.4);
  // Unitatea din atributul formei e CSS (96 px pe țol), oricare ar fi alegerea px a paginii.
  aproape(lat('width="100mm" height="50mm" viewBox="0 0 100 50"', '<rect width="10mm" height="1"/>'), 10 * 96 / 25.4);
});

test('preserveAspectRatio: meet centrează, slice taie, none scalează neuniform', () => {
  const r = (par: string) => cai(pagina('<rect width="10" height="10"/>', `width="200mm" height="100mm" viewBox="0 0 10 10" preserveAspectRatio="${par}"`)).cai[0]?.varfuri ?? [];
  // meet: scara min(20, 10) = 10, centrat pe x: (200 − 100) / 2 = 50.
  assert.deepEqual(puncte(r('xMidYMid meet')), [[50, 100], [150, 100], [150, 0], [50, 0]]);
  assert.deepEqual(puncte(r('xMinYMin meet')), [[0, 100], [100, 100], [100, 0], [0, 0]]);
  // slice: scara max = 20; y centrat: (100 − 200) / 2 = −50 de sus.
  assert.deepEqual(puncte(r('xMidYMid slice')), [[0, 150], [200, 150], [200, -50], [0, -50]]);
  assert.deepEqual(puncte(r('none')), [[0, 100], [200, 100], [200, 0], [0, 0]]);
});

test('cercul rămâne cerc: două semicercuri, cu sensul întors de Y; sub o scalare neuniformă devine cubice', () => {
  const c = cai(pagina('<circle cx="50" cy="25" r="10"/>')).cai[0]?.varfuri ?? [];
  assert.equal(c.length, 2);
  for (const v of c) assert.ok(v.s.tip === 'A' && Math.abs(Math.abs(v.s.bulge) - 1) < 1e-12);
  assert.deepEqual(puncte(c), [[60, 25], [40, 25]]);
  // Pe ecran (Y în jos) cercul SVG merge în sensul acelor; în document (Y în sus), tot în sensul acelor: bulge negativ.
  assert.ok(c[0]?.s.tip === 'A' && c[0].s.bulge < 0);
  const e = cai(pagina('<circle cx="50" cy="25" r="10" transform="scale(2 1)"/>'));
  assert.ok((e.cai[0]?.varfuri ?? []).every((v) => v.s.tip === 'C'));
  assert.equal(e.avertismente['arce-eliptice'], 2);
});

test('o oglindire întoarce sensul arcului (bulge cu semnul determinantului)', () => {
  const a = cai(pagina('<circle cx="50" cy="25" r="10"/>')).cai[0]?.varfuri[0];
  const b = cai(pagina('<circle cx="50" cy="25" r="10" transform="translate(100 0) scale(-1 1)"/>')).cai[0]?.varfuri[0];
  assert.ok(a?.s.tip === 'A' && b?.s.tip === 'A');
  assert.equal(Math.sign(a.s.bulge), -Math.sign(b.s.bulge));
});

test('elipsa în cubice: abaterea radială măsurată sub TOLERANTA_IMPORT (densă, 2 000 de puncte pe cubică)', () => {
  const rx = 400;
  const ry = 150;
  const v = cai(pagina(`<ellipse cx="500" cy="250" rx="${rx}" ry="${ry}"/>`, 'width="1000mm" height="500mm" viewBox="0 0 1000 500"')).cai[0]?.varfuri ?? [];
  let max = 0;
  for (const [i, x] of v.entries()) {
    const b = v[(i + 1) % v.length]?.p;
    assert.ok(x.s.tip === 'C' && b);
    for (let k = 0; k <= 2000; k++) {
      const t = k / 2000;
      const u = 1 - t;
      const px = u * u * u * x.p.x + 3 * u * u * t * x.s.c1.x + 3 * u * t * t * x.s.c2.x + t * t * t * b.x - 500;
      const py = u * u * u * x.p.y + 3 * u * u * t * x.s.c1.y + 3 * u * t * t * x.s.c2.y + t * t * t * b.y - 250;
      // Distanța la elipsă, aproximată (sub 1e-12 la abaterile de aici) prin gradientul ecuației implicite.
      const f = (px / rx) ** 2 + (py / ry) ** 2 - 1;
      const g = Math.hypot((2 * px) / (rx * rx), (2 * py) / (ry * ry));
      max = Math.max(max, Math.abs(f / g));
    }
  }
  assert.ok(max <= TOLERANTA_IMPORT, `${max}`);
  assert.ok(max >= TOLERANTA_IMPORT / 100, `prea multe cubice? ${max}`);
});

test('arcul de peste 180° se împarte în două; Q devine cubică exact; datele lipite se citesc', () => {
  const v = cai(pagina('<path d="M 60 25 A 10 10 0 1 1 50 15 Z"/>')).cai[0]?.varfuri ?? [];
  assert.equal(v.length, 3);
  for (const x of v.slice(0, 2)) assert.ok(x.s.tip === 'A' && Math.abs(Math.abs(x.s.bulge) - Math.tan((270 * Math.PI) / 180 / 8)) < 1e-12);
  const a = v[0];
  const b = v[1];
  assert.ok(a && b && a.s.tip === 'A');
  // Mijlocul împărțirii stă pe cercul de rază 10 din (50, 25).
  aproape(Math.hypot(b.p.x - 50, b.p.y - 25), 10, 1e-9);
  const k = cerculArcului(a.p, b.p, a.s.bulge);
  aproape(k.raza, 10, 1e-9);
  const q = citesteDateCale('M0 0Q10 10 20 0').comenzi[1];
  assert.ok(q?.tip === 'C');
  for (const [u, v] of [[q.c1.x, 20 / 3], [q.c1.y, 20 / 3], [q.c2.x, 40 / 3], [q.c2.y, 20 / 3], [q.p.x, 20], [q.p.y, 0]] as const) aproape(u, v, 1e-14);
  const lipite = citesteDateCale('M.5.5L1-2a1 1 0 1120 20');
  assert.equal(lipite.eroare, false);
  assert.deepEqual(lipite.comenzi.map((c) => c.tip), ['M', 'L', 'A']);
  assert.deepEqual(lipite.comenzi[0], { tip: 'M', p: { x: 0.5, y: 0.5 } });
  assert.deepEqual(lipite.comenzi[1], { tip: 'L', p: { x: 1, y: -2 } });
  const arc = lipite.comenzi[2];
  assert.ok(arc?.tip === 'A' && arc.mare && arc.pozitiv && arc.p.x === 21 && arc.p.y === 18);
});

test('erorile din date: se păstrează ce e dinainte; prima comandă trebuie să fie M', () => {
  assert.deepEqual(citesteDateCale('M0 0 L10 0 L10').comenzi.length, 2);
  assert.equal(citesteDateCale('M0 0 L10 0 L10').eroare, true);
  assert.deepEqual(citesteDateCale('L10 10').comenzi, []);
  // După Z, un desen fără M pornește din startul subcăii închise.
  assert.deepEqual(citesteDateCale('M5 5 L10 5 L10 10 Z L0 0').comenzi.slice(-2), [{ tip: 'M', p: { x: 5, y: 5 } }, { tip: 'L', p: { x: 0, y: 0 } }]);
  assert.equal(citesteTransform('rotate(90 10 10) translate(1)')?.e, 20);
  assert.equal(citesteTransform('scale(2'), null);
  const r = cai(pagina('<path d="M0 0 H20 V20 H0 Z L"/>'));
  assert.equal(r.avertismente['eroare-date'], 1);
  assert.equal(r.cai.length, 1);
});

test('subcăile deschise, elementele sărite și cele ascunse se numără; fișierul fără nicio cale închisă e refuzat', () => {
  const r = cai(pagina(`
    <path d="M0 0 L10 10"/><line x1="0" y1="0" x2="5" y2="5"/><polyline points="0,0 10,0 10,10 0,0"/>
    <text>x</text><use href="#a"/><image href="a.png"/><svg/>
    <g style="display:none"><rect width="3" height="3"/><circle r="2"/><text>y</text></g>
    <g visibility="hidden"><rect width="3" height="3"/><rect width="4" height="4" visibility="visible"/></g>
    <defs><rect width="9" height="9"/></defs>
    <switch><foreignObject requiredExtensions="http://ns.adobe.com/AdobeIllustrator/10.0/"/><g><rect width="5" height="5"/></g></switch>`));
  const a = r.avertismente;
  assert.equal(a.deschise, 2);
  assert.deepEqual([a['sarit-text'], a['sarit-use'], a['sarit-image'], a['sarit-svg']], [1, 1, 1, 1]);
  assert.equal(a.ascunse, 3);
  // Polilinia închisă de la sine, dreptunghiul vizibil din grupul ascuns și cel din switch.
  assert.equal(r.cai.length, 3);
  const gol = citeste(pagina('<path d="M0 0 L10 10"/>'));
  assert.ok(!gol.ok && gol.cod === 'gol' && gol.avertismente?.deschise === 1);
});

test('refuzurile ușii: octeții, arhiva, entitățile, XML-ul stricat, rădăcina, coordonatele de peste 10⁷ mm', () => {
  assert.ok(!citesteSvg(new Uint8Array(16 * 1024 * 1024 + 1), { parser: PARSER }).ok);
  const svgz = citesteSvg(new Uint8Array([0x1f, 0x8b, 8, 0]), { parser: PARSER });
  assert.ok(!svgz.ok && svgz.cod === 'svgz');
  assert.equal(problemaEntitati('<!DOCTYPE svg [<!ENTITY a "x"><!ENTITY b "&a;&a;">]>'), 'valoare');
  assert.equal(problemaEntitati('<!DOCTYPE svg [<!ENTITY % p "x">]>'), 'parametru');
  assert.equal(problemaEntitati('<!DOCTYPE svg [<!ENTITY e SYSTEM "file:///etc/passwd">]>'), 'externa');
  const mare = 'x'.repeat(1000);
  assert.equal(problemaEntitati(`<!DOCTYPE svg [<!ENTITY a "${mare}">]>${'&a;'.repeat(20_000)}`), 'expansiune');
  // Recenzia 2.7c: la o declarație dublă contează prima (ca în Edge), iar valorile implicite din ATTLIST se refuză.
  assert.equal(problemaEntitati(`<!DOCTYPE svg [<!ENTITY a "${mare}"><!ENTITY a "">]>${'&a;'.repeat(20_000)}`), 'expansiune');
  assert.equal(problemaEntitati('<!DOCTYPE svg [<!ATTLIST path d CDATA "M0 0L10 0L10 10Z">]>'), 'attlist');
  assert.equal(problemaEntitati('<!DOCTYPE svg [<!ATTLIST path id ID #IMPLIED>]>'), null);
  // Entitățile simple ale lui Illustrator trec.
  assert.equal(problemaEntitati('<!DOCTYPE svg [<!ENTITY ns_svg "http://www.w3.org/2000/svg">]><svg xmlns="&ns_svg;"/>'), null);
  const stricat = citeste('<svg xmlns="http://www.w3.org/2000/svg"><rect></svg>');
  assert.ok(!stricat.ok && stricat.cod === 'parsare');
  const html = citeste('<html><body/></html>');
  assert.ok(!html.ok && html.cod === 'radacina');
  const departe = citeste(pagina('<rect x="20000000" width="1" height="1"/>'));
  assert.ok(!departe.ok && departe.cod === 'departe');
  assert.ok(citesteSvg(octeti(pagina('<rect width="1" height="1"/>')), { parser: PARSER }).ok);
});

test('plafoanele de lucru: prea multe entități; un arc eliptic cât un continent se sare fără să fie făcut; citirea se oprește la 10⁶ vârfuri', () => {
  const decl = Array.from({ length: 101 }, (_, i) => `<!ENTITY e${i} "x">`).join('');
  assert.equal(problemaEntitati(`<!DOCTYPE svg [${decl}]>`), 'numar');
  // σ ≈ 2·10²² mm: ~84 000 de cubice pe semielipsă, peste 50 000. Socotite înainte, deci calea se sare imediat.
  const t0 = performance.now();
  const urias = citeste(pagina('<ellipse rx="1" ry="2" transform="scale(1e22)"/>'));
  assert.ok(!urias.ok && urias.cod === 'gol' && urias.avertismente?.['prea-mari'] === 1);
  assert.ok(performance.now() - t0 < 1000);
  // 26 de elipse a câte ~40 000 de cubice (σ ≈ 3,66·10²¹): peste plafonul de lucru, refuzul vine înainte de sfârșit.
  const multe = citeste(pagina(Array.from({ length: 26 }, () => '<ellipse rx="1" ry="0.5" transform="scale(3.66e21)"/>').join('')));
  assert.ok(!multe.ok && multe.cod === 'plafon', JSON.stringify(multe.ok ? 'ok' : multe.cod));
});

test('imbricarea alege latura: O (exterior + gaură), pătratele de trei niveluri, formele separate', () => {
  const r = cai(pagina(`
    <rect x="0" y="0" width="40" height="40"/><rect x="10" y="10" width="20" height="20"/><rect x="15" y="15" width="10" height="10"/>
    <circle cx="70" cy="20" r="10"/><circle cx="70" cy="20" r="5"/><rect x="85" y="5" width="5" height="5"/>`));
  assert.deepEqual(laturiDinImbricare(r.cai), ['exterior', 'interior', 'exterior', 'exterior', 'interior', 'exterior']);
});

test('nonzero (ADR 0036): în același sens, pătratul interior e plin, deci rămâne doar exteriorul; în sensuri opuse e gaură, neschimbat', () => {
  const plin = cai(pagina('<path d="M0 0 H40 V40 H0 Z M10 10 H30 V30 H10 Z"/>'));
  assert.equal(plin.avertismente['nonzero-normalizate'], 1);
  assert.equal(plin.cai.length, 1);
  assert.deepEqual(puncte(plin.cai[0]?.varfuri ?? []).sort(), [[0, 10], [0, 50], [40, 10], [40, 50]].sort());
  const gaura = cai(pagina('<path d="M0 0 H40 V40 H0 Z M10 10 V30 H30 V10 Z"/>'));
  assert.equal(gaura.avertismente['nonzero-normalizate'], 0);
  assert.equal(gaura.cai.length, 2);
  // Sub evenodd nu se normalizează nimic: interiorul rămâne gaură.
  const eo = cai(pagina('<path fill-rule="evenodd" d="M0 0 H40 V40 H0 Z M10 10 H30 V30 H10 Z"/>'));
  assert.equal(eo.avertismente['nonzero-normalizate'], 0);
  assert.equal(eo.cai.length, 2);
  // Două cercuri suprapuse în aceeași cale: reuniunea, din arce pe cercurile-sursă.
  const u = cai(pagina('<path d="M 30 25 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0 Z M 42 25 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0 Z"/>'));
  assert.equal(u.avertismente['nonzero-normalizate'], 1);
  assert.equal(u.cai.length, 1);
  assert.ok((u.cai[0]?.varfuri ?? []).every((v) => v.s.tip === 'A'));
});

// Un pătrat cu un pătrat interior în ACELAȘI sens: sub nonzero e plin (1 contur), sub evenodd e gaură (2 contururi).
const SAIBA = 'd="M0 0 H40 V40 H0 Z M10 10 H30 V30 H10 Z"';

test('recenzia 2.7d: regulile CSS simple (Illustrator: clase) dau fill-rule, fill și display; specificitatea și ordinea ca în CSS', () => {
  const contururi = (corp: string) => {
    const r = cai(pagina(corp));
    return { n: r.cai.length, normalizate: r.avertismente['nonzero-normalizate'], stil: r.avertismente.stil, ascunse: r.avertismente.ascunse };
  };
  // Clasa Illustrator: gaura rămâne gaură, nimic de avertizat (toate regulile s-au citit).
  assert.deepEqual(contururi(`<style>.st0{fill-rule:evenodd;clip-rule:evenodd}</style><path class="st0" ${SAIBA}/>`), { n: 2, normalizate: 0, stil: 0, ascunse: 0 });
  // Moștenită de la grup; comentariile se sar.
  assert.equal(contururi(`<style>/* x{fill-rule:nonzero} */ g.eo{fill-rule:evenodd}</style><g class="eo"><path ${SAIBA}/></g>`).n, 2);
  // CSS peste atributul de prezentare; `style` peste CSS; #id peste .clasă; la aceeași specificitate, ultima regulă.
  assert.equal(contururi(`<style>.st0{fill-rule:evenodd}</style><path class="st0" fill-rule="nonzero" ${SAIBA}/>`).n, 2);
  assert.equal(contururi(`<style>.st0{fill-rule:evenodd}</style><path class="st0" style="fill-rule:nonzero" ${SAIBA}/>`).n, 1);
  assert.equal(contururi(`<style>#a{fill-rule:nonzero}.st0{fill-rule:evenodd}</style><path id="a" class="st0" ${SAIBA}/>`).n, 1);
  assert.equal(contururi(`<style>.a{fill-rule:evenodd}.b{fill-rule:nonzero}</style><path class="b a" ${SAIBA}/>`).n, 1);
  assert.equal(contururi(`<style>.b{fill-rule:nonzero}.a{fill-rule:evenodd}</style><path class="b a" ${SAIBA}/>`).n, 2);
  // Selectorii compuși cer toate clasele; elementul și `*`.
  assert.equal(contururi(`<style>.a.b{fill-rule:evenodd}</style><path class="a" ${SAIBA}/>`).n, 1);
  assert.equal(contururi(`<style>path.a{fill-rule:evenodd}</style><path class="a" ${SAIBA}/>`).n, 2);
  assert.equal(contururi(`<style>*{fill-rule:evenodd}</style><path ${SAIBA}/>`).n, 2);
  // `display: none` dintr-o clasă ascunde (în 2.7c, forma se importa).
  assert.deepEqual(contururi(`<style>.h{display:none}</style><rect class="h" width="5" height="5"/><rect x="10" width="5" height="5"/>`), { n: 1, normalizate: 0, stil: 0, ascunse: 1 });
  // Ce nu se citește (combinatori, regulile `@`, `!important`) avertizează, iar regula nu se aplică.
  assert.deepEqual(contururi(`<style>g > path{fill-rule:evenodd}</style><g><path ${SAIBA}/></g>`), { n: 1, normalizate: 1, stil: 1, ascunse: 0 });
  assert.equal(contururi(`<style>@media print{path{fill-rule:evenodd}}</style><path ${SAIBA}/>`).stil, 1);
  assert.equal(contururi(`<style>path{fill-rule:evenodd!important}</style><path ${SAIBA}/>`).stil, 1);
  // O regulă care nu atinge proprietățile citite nu avertizează, oricât de complicat ar fi selectorul.
  assert.equal(contururi(`<style>g > path:hover{stroke:red}</style><path ${SAIBA}/>`).stil, 0);
});

test('recenzia 2.7d: o formă fără umplere (fill="none", desenul unui contur) nu se normalizează: șaiba își păstrează gaura', () => {
  const n = (corp: string) => cai(pagina(corp)).cai.length;
  assert.equal(n(`<path fill="none" stroke="#000" ${SAIBA}/>`), 2);
  assert.equal(n(`<style>.st1{fill:none;stroke:#000}</style><path class="st1" ${SAIBA}/>`), 2);
  assert.equal(n(`<g fill="none"><path ${SAIBA}/></g>`), 2);
  // Umplerea se moștenește și se poate repune; `inherit` ia părintele.
  assert.equal(n(`<g fill="none"><path fill="red" ${SAIBA}/></g>`), 1);
  assert.equal(n(`<g style="fill:none"><path fill="inherit" ${SAIBA}/></g>`), 2);
  assert.equal(cai(pagina(`<path ${SAIBA}/>`, 'width="100mm" height="50mm" viewBox="0 0 100 50" fill="none"')).cai.length, 2);
});

test('recenzia 2.7d: potrivirile CSS au un buget pe fișier; peste el, refuz (nu o citire pe jumătate stilată)', () => {
  const t0 = performance.now();
  const reguli = '*{fill:red}'.repeat(10_000);
  const elemente = '<rect width="1" height="1"/>'.repeat(2_100);
  const r = citeste(pagina(`<style>${reguli}</style>${elemente}`));
  assert.ok(!r.ok && r.cod === 'plafon' && r.detaliu === 'css', JSON.stringify(r.ok ? 'ok' : [r.cod, r.detaliu]));
  // Sub buget: aceleași reguli, mai puține elemente.
  assert.ok(citeste(pagina(`<style>${reguli}</style>${'<rect width="1" height="1"/>'.repeat(1_900)}`)).ok);
  assert.ok(performance.now() - t0 < 10_000, `${performance.now() - t0} ms`);
});

test('recenzia 2.7d: bugetul normalizării e al fișierului: după trei forme scumpe, a patra se citește ca în 2.7c, numărată', () => {
  // 200 de triunghiuri suprapuse într-o cale: ~7,0·10⁶ unități (măsurat 12.10), sub plafonul unui apel (12·10⁶). Patru
  // costă ~28·10⁶ > 24·10⁶: primele trei se normalizează, a patra nu mai încape.
  let d = '';
  for (let i = 0; i < 200; i++) d += `M${i % 100} 0h.5L50 10z`;
  const forma = `<path d="${d}"/>`;
  const trei = cai(pagina(forma.repeat(3))).avertismente;
  assert.deepEqual([trei['nonzero-normalizate'], trei['nonzero-refuzate']], [3, 0]);
  const patru = cai(pagina(forma.repeat(4)));
  assert.deepEqual([patru.avertismente['nonzero-normalizate'], patru.avertismente['nonzero-refuzate']], [3, 1]);
  // Forma refuzată intră ca în 2.7c: subcăile ei brute (200), după cele normalizate.
  assert.equal(patru.cai.filter((c) => c.forma === 3).length, 200);
});

test('oracolul 2.7d (K7): o formă nonzero mai subțire decât τ peste tot poate ieși goală; se numără normalizată, iar fișierul gol e refuzat', () => {
  const felie = '<polygon points="0,10 10,10 20,10.000000001"/>';
  const singura = citeste(pagina(felie));
  assert.ok(!singura.ok && singura.cod === 'gol', JSON.stringify(singura.ok ? 'ok' : singura.cod));
  assert.deepEqual([singura.avertismente?.degenerate, singura.avertismente?.['nonzero-normalizate']], [0, 1]);
  const cuAlta = cai(pagina(`${felie}<rect x="30" width="5" height="5"/>`));
  assert.deepEqual([cuAlta.cai.length, cuAlta.avertismente.degenerate, cuAlta.avertismente['nonzero-normalizate']], [1, 0, 1]);
  // Sub evenodd nu trece prin normalizare: rămâne o cale, ca în 2.7c.
  assert.equal(cai(pagina('<polygon fill-rule="evenodd" points="0,10 10,10 20,10.000000001"/>')).cai.length, 1);
});

test('recenzia 2.7d: plafonul total al vârfurilor se judecă pe intrare, înaintea normalizării', () => {
  // 5 căi × 14 000 de triunghiuri suprapuse (42 000 de vârfuri fiecare; 210 000 > 200 000): refuzat fără să normalizeze.
  let d = '';
  for (let i = 0; i < 14_000; i++) d += `M${i % 100} 0h.5L50 10z`;
  const r = citeste(pagina(`<path d="${d}"/>`.repeat(5)));
  assert.ok(!r.ok && r.cod === 'plafon' && r.detaliu === '210000', JSON.stringify(r.ok ? 'ok' : [r.cod, r.detaliu]));
  assert.equal((r.avertismente?.['nonzero-normalizate'] ?? 0) + (r.avertismente?.['nonzero-refuzate'] ?? 0), 0);
});

test('piesa importului: grupul cu c1…cN, operațiile pe laturi, colțul cutiei în instanță; trece de ușa documentului', () => {
  const r = cai(pagina('<rect id="exterior" x="10" y="10" width="40" height="30"/><circle cx="30" cy="25" r="5"/>'));
  const laturi = laturiDinImbricare(r.cai);
  const { piesa, x, y } = piesaDinImport({ nume: numeDinFisier('logo.SVG'), cai: r.cai, laturi, pagina: r.pagina }, 'e1');
  assert.equal(piesa.nume, 'logo');
  assert.deepEqual([x, y], [10, 10]);
  assert.ok(piesa.radacina.tip === 'grup');
  assert.deepEqual(piesa.radacina.copii.map((c) => [c.id, c.nume]), [['c1', 'exterior'], ['c2', undefined]]);
  assert.deepEqual(piesa.operatii.map((o) => [o.id, o.latura, o.noduri, o.adancime, o.pas]), [['exterior', 'exterior', ['c1'], 3, 3], ['interior', 'interior', ['c2'], 3, 3]]);
  const c1 = piesa.radacina.copii[0];
  assert.ok(c1?.tip === 'element' && c1.forma.tip === 'cale');
  assert.deepEqual(c1.forma.varfuri.map((v) => [v.p.x, v.p.y]), [[0, 30], [40, 30], [40, 0], [0, 0]]);
  const doc = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const cu = { ...doc, piese: [piesa], foi: doc.foi.map((f) => ({ ...f, instante: [{ id: 'e1', piesa: 'e1', x, y, rotire: 0 }] })) };
  const u = incarca(JSON.parse(JSON.stringify(cu)));
  assert.ok(u.ok, u.ok ? '' : u.motiv);
});

test('recenzia 2.7c, pagina și formele: o singură latură absolută ia raportul viewBox-ului; rx / ry ca în Edge; line e deschisă', () => {
  const r = cai(pagina('<rect width="80" height="40"/>', 'width="80mm" viewBox="0 0 80 40"'));
  assert.deepEqual(r.pagina, { latime: 80, inaltime: 40 });
  assert.equal(r.px, false);
  const latime = (corp: string) => {
    const v = cai(pagina(corp)).cai[0]?.varfuri ?? [];
    return v.length;
  };
  // rx="auto" scris ca atribut: colțuri drepte (4 vârfuri); rx negativ: lipsă, deci ia ry (8 vârfuri, 4 arce).
  assert.equal(latime('<rect width="30" height="20" rx="auto" ry="5"/>'), 4);
  assert.equal(latime('<rect width="30" height="20" rx="-1" ry="5"/>'), 8);
  // Elipsa cu ry negativ e cercul de rx; cu ry="auto", nu se desenează (în tăcere).
  const cerc = cai(pagina('<ellipse cx="50" cy="25" rx="10" ry="-3"/>')).cai[0]?.varfuri ?? [];
  assert.ok(cerc.length === 2 && cerc.every((v) => v.s.tip === 'A'));
  const tacut = citeste(pagina('<ellipse cx="50" cy="25" rx="10" ry="auto"/>'));
  assert.ok(!tacut.ok && tacut.cod === 'gol' && tacut.avertismente?.['atribut-invalid'] === 0);
  const linie = citeste(pagina('<line x1="20" y1="20" x2="20" y2="20"/>'));
  assert.ok(!linie.ok && linie.avertismente?.deschise === 1 && linie.avertismente.degenerate === 0);
});

test('recenzia 2.7c, căile: aproape de 360° raza rămâne 50; contururile coliniare sunt degenerate; bucla dintr-o cubică se împarte', () => {
  const v = cai(pagina('<path d="M 150 100 A 50 50 0 1 1 150 99.99999999999999 Z"/>', 'width="300mm" height="200mm" viewBox="0 0 300 200"')).cai[0]?.varfuri ?? [];
  for (const [i, x] of v.entries()) {
    const b = v[(i + 1) % v.length]?.p;
    if (x.s.tip !== 'A' || !b) continue;
    aproape(cerculArcului(x.p, b, x.s.bulge).raza, 50, 1e-9);
  }
  const dreapta = citeste(pagina('<path d="M 10 10 L 30 30 L 50 50 Z"/><polygon points="60,10 90,10"/>'));
  assert.ok(!dreapta.ok && dreapta.cod === 'gol' && dreapta.avertismente?.degenerate === 2);
  const picatura = cai(pagina('<path d="M 50 45 C 90 0 10 0 50 45 Z"/>')).cai[0]?.varfuri ?? [];
  assert.equal(picatura.length, 2);
  assert.ok(picatura.every((x) => x.s.tip === 'C'));
  // Mijlocul (t = 1/2): (50, 45 − 0,75 · 45) = (50, 11,25) pe pagină, deci (50, 38,75) în mm cu Y în sus.
  assert.deepEqual(puncte(picatura), [[50, 5], [50, 38.75]]);
});

test('recenzia 2.7c: switch cu systemLanguage, după limba aplicației; similitudinea relativă la scară', () => {
  const sw = pagina('<switch><rect systemLanguage="fr" width="5" height="5"/><rect systemLanguage="ro-RO,de" width="6" height="6"/><rect width="7" height="7"/></switch>');
  const lat = (limba: string) => {
    const r = citeste(sw, { limba } as never);
    assert.ok(r.ok);
    const xs = (r.cai[0]?.varfuri ?? []).map((x) => x.p.x);
    return Math.max(...xs) - Math.min(...xs);
  };
  assert.equal(lat('ro'), 6);
  assert.equal(lat('en'), 7);
  // O elipsă de 0,1 × 0,2 mm sub o scară minusculă rămâne elipsă (cubice), nu cerc.
  const e = cai(pagina('<circle cx="1e12" cy="1e12" r="1" transform="scale(1e-13 2e-13)"/>', 'width="100mm" height="100mm" viewBox="0 0 1 1"'));
  assert.equal(e.avertismente['arce-eliptice'], 2);
});

test('recenzia 2.7c: bugetul includerilor (imbricarea și perechile nonzero) oprește contururile suprapuse, repede', () => {
  const t0 = performance.now();
  const multe = Array.from({ length: 50_000 }, () => '<rect width="10" height="10"/>').join('');
  const r = cai(pagina(multe));
  assert.equal(laturiDinImbricare(r.cai, 2e7), null);
  // 60 000 de triunghiuri (180 000 de vârfuri, sub plafon) într-o singură formă nonzero, cu cutiile suprapuse.
  let d = '';
  for (let i = 0; i < 60_000; i++) d += `M${i % 100} 0h.5L50 10z`;
  // ADR 0036: normalizarea o refuză din bugetul ei (determinist), iar forma se citește ca în 2.7c, numărată.
  const nz = citeste(pagina(`<path d="${d}"/>`));
  assert.ok(nz.ok && nz.avertismente['nonzero-refuzate'] === 1, JSON.stringify(nz.ok ? nz.avertismente['nonzero-refuzate'] : nz.cod));
  assert.ok(performance.now() - t0 < 20_000, `${performance.now() - t0} ms`);
});
