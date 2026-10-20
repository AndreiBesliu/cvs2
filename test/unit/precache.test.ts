/**
 * Ce ține workerul PWA în cache (ADR 0045 §2): predicatul pur din `shared/precache.ts`, pe lista REALĂ de fișiere a
 * build-ului (`dist/` la felia „PWA offline”, 18.10), plus cazurile de margine. Poarta (`scripts/build-determinist.ts`)
 * aplică același predicat pe build-ul de fiecare dată și verifică manifestul workerului față de conținutul bucăților.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOAR_ONLINE, inPrecache, motivPrecache } from '../../shared/precache.ts';

/** `find dist -type f`, după `npm run build` pe arborele feliei (fără `npm run banc`, care adaugă `banc/`). */
const BUILD_REAL = [
  'assets/ExportConectat-rR2tOARF.js',
  'assets/ImportConectat-DYEWkEUO.js',
  'assets/NivelPiesa-D6qdvvci.js',
  'assets/PaginaAdmin-BgpvZvPc.js',
  'assets/PaginaAdmin-DHbMpMzy.css',
  'assets/Paleta-Cc00IWV_.js',
  'assets/PanouProprietati-B1f3aC6T.js',
  'assets/StratTraseu-BSpttvVm.js',
  'assets/actiuniAlegere-M8-q1zoq.js',
  'assets/actiuniDocumentCalcul-paL_EIGm.js',
  'assets/actiuniExportCalcul-D5gZsIhI.js',
  'assets/actiuniImportCalcul-CixfiXhb.js',
  'assets/carcasa-FK0TiwXO.js',
  'assets/conexiuneBaza-DYdQp5k3.js',
  'assets/distanta-D8RXJGbw.js',
  'assets/incarcare-h_xQ4vH4.js',
  'assets/index-By72-50K.css',
  'assets/index-xo36z9N6.js',
  'assets/inregistrare-C3ReffNb.js',
  'assets/intrariMinima-BlrQ0DaA.js',
  'assets/ir-BqxCollu.js',
  'assets/job-Civrc1Pb.js',
  'assets/lucrator-zecPKZ0t.js',
  'assets/mesaje.en-CJbzhZWY.js',
  'assets/mesaje.ro-DiAdfLkf.js',
  'assets/numar-Ba7odLDi.js',
  'assets/offset-A4evuOAL.js',
  'assets/raportor-CGLYFYQB.js',
  'assets/schemaDocument-BwcvXeKb.js',
  'assets/svgCoduri-B5dBVGAW.js',
  'assets/traseu-eeyBDnrk.js',
  'assets/traseuDesen-Ddk6spvN.js',
  'config.json',
  'favicon.svg',
  'index.html',
  'sw.js',
];

/**
 * Ce trebuie să lipsească din precache: pagina `/admin` (doar online), configurația, workerul însuși. Raportorul și baza
 * conexiunii INTRĂ (recenzia din 18.10): fila rămâne pe versiunea ei până la clic, deci și raportorul ei trebuie să rămână
 * disponibil după o publicare (altfel, prima eroare îl stinge pe toată sesiunea: 404).
 */
const ASTEPTAT_IN_AFARA: Readonly<Record<string, ReturnType<typeof motivPrecache>>> = {
  'assets/PaginaAdmin-BgpvZvPc.js': 'doar-online',
  'assets/PaginaAdmin-DHbMpMzy.css': 'doar-online',
  'config.json': 'configuratie',
  'sw.js': 'worker',
};

test('pe build-ul real: totul în precache, în afară de pagina /admin, config.json și sw.js', () => {
  for (const f of BUILD_REAL) {
    const asteptat = ASTEPTAT_IN_AFARA[f] ?? 'precache';
    assert.equal(motivPrecache(f), asteptat, f);
    assert.equal(inPrecache(f), asteptat === 'precache', f);
  }
});

test('ambele dicționare, bucățile la cerere, workerul pânzei, index.html și favicon intră', () => {
  for (const f of [
    'assets/mesaje.ro-DiAdfLkf.js', 'assets/mesaje.en-CJbzhZWY.js', 'assets/ExportConectat-rR2tOARF.js',
    'assets/ImportConectat-DYEWkEUO.js', 'assets/actiuniAlegere-M8-q1zoq.js', 'assets/lucrator-zecPKZ0t.js',
    'assets/index-By72-50K.css', 'index.html', 'favicon.svg',
  ]) assert.ok(inPrecache(f), f);
});

test('raportorul de erori și baza conexiunii intră: raportorul versiunii din filă rămâne disponibil după o publicare', () => {
  for (const f of ['assets/raportor-CGLYFYQB.js', 'assets/conexiuneBaza-DYdQp5k3.js']) {
    assert.equal(motivPrecache(f), 'precache', f);
    assert.ok(inPrecache(f), f);
  }
});

test('bancul vizual (`/banc/`) nu intră, oricât de adânc', () => {
  for (const f of ['banc/index.html', 'banc/poza.png', 'banc/a/b/martor.json']) assert.equal(motivPrecache(f), 'banc', f);
});

test('numele se potrivesc întregi: un prefix comun cu o bucată doar online nu o scoate din precache', () => {
  assert.ok(inPrecache('assets/PaginaAdminLista-abcdEF12.js'));
  assert.ok(inPrecache('assets/xPaginaAdmin-abcdEF12.js'));
  // Amprenta are exact 8 caractere, cu `-` și `_` printre ele (rolldown).
  assert.equal(motivPrecache('assets/PaginaAdmin-a-b_c-d1.js'), 'doar-online');
  assert.equal(motivPrecache('assets/PaginaAdmin-12345678.css'), 'doar-online');
});

test('un fișier de alt fel e „necunoscut”: poarta cere o decizie, nu-l lasă tăcut în afara precache-ului', () => {
  for (const f of ['assets/litere-abcdEF12.woff2', 'assets/poza-abcdEF12.png', 'robots.txt', 'firebase.json', 'assets/index.js', 'sub/index.html']) {
    assert.equal(motivPrecache(f), 'necunoscut', f);
    assert.equal(inPrecache(f), false, f);
  }
});

test('documentația generată (`documentatie/`, ADR 0048) nu intră: e doar online, ca pagina /admin care o cere', () => {
  for (const f of ['documentatie/roadmap.json', 'documentatie/catalog.json', 'documentatie/doc/PLAN.md', 'documentatie/doc/docs/adr/0047-nucleul-de-simulare.md']) {
    assert.equal(motivPrecache(f), 'documentatie', f);
    assert.equal(inPrecache(f), false, f);
  }
  // Doar dosarul de la rădăcină: o bucată JS cu același nume rămâne o bucată a aplicației.
  assert.equal(motivPrecache('assets/documentatie-abcdEF12.js'), 'precache');
  assert.equal(motivPrecache('sub/documentatie/roadmap.json'), 'necunoscut');
});

test('lista bucăților doar online e doar pagina /admin (raportorul și baza conexiunii sunt în precache)', () => {
  assert.deepEqual([...DOAR_ONLINE], ['PaginaAdmin']);
});
