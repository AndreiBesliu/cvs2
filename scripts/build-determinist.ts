/**
 * Build-ul determinist: două build-uri ale aceluiași arbore trebuie să iasă identice, octet cu octet. Apoi, bugetul de
 * mărime: JavaScript-ul aplicației, comprimat gzip, nu trece de plafon fără o decizie scrisă aici.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { DIR_DOCUMENTATIE, FISIER_CATALOG, FISIER_ROADMAP, FISIER_ROADMAP_EN, esteCatalog, esteRoadmap, fisierDocument } from '../shared/documentatie.ts';
import { DIR_CODURI, esteDictionarCoduri, fisierCoduri, LIMBI_CODURI } from '../shared/coduri.ts';
import { DIR_MANUAL, esteManual, fisierManual, LIMBI_MANUAL } from '../shared/manual.ts';
import { DIR_MESAJE, esteDictionarMesaje, esteFisierMesaje, fisierBaza, fisierMesaje, MODULE_MESAJE, type Limba } from '../shared/mesaje.ts';
import { DICTIONARE_BAZA, DICTIONARE_MODULE } from './mesaje.ts';
import { DOAR_ONLINE, inPrecache, motivPrecache } from '../shared/precache.ts';
import { cspPentru, hashuriInline } from './cspHtml.ts';

/**
 * Plafoanele JavaScript-ului comprimat, în kB:
 * - la pornire, ce cere `index.html` (scriptul de intrare și `modulepreload`): măsurat 81 kB la felia 1.9c (React +
 *   valibot + aplicația; calculul exportului se încarcă la cerere); din 17.10, plus dicționarul limbii active, cerut
 *   înaintea primei randări la fiecare pornire (99,1 kB înainte de „loc în pachetul de pornire”); 100 kB până pe 28.10, 110 kB
 *   din 28.10 (ADR 0100: decizia owner-ului; fiecare bucată nouă la cerere își pune numele în lista de preîncărcare din pornire);
 * - totalul, cu bucățile încărcate la cerere și workerele; 330 kB din 25.10 (ADR 0075: totul rămâne în precache, ca
 *   aplicația să meargă întreagă offline), 400 kB din 28.10 (ADR 0096: decizia owner-ului; se descarcă în fundal, cu
 *   progresul în bara de jos, ADR 0097), 450 kB din 30.10 (ADR 0109: decizia owner-ului, „1”; workerul CAM are copia lui de
 *   cavalier și de geometrie, ~73 kB, pe care firul principal le ține pentru desen și import);
 * - pagina `/admin` (ADR 0040, decizia din 16.10): bucata ei (`PaginaAdmin-*`, cu Firebase: contul, Firestore, funcțiile,
 *   App Check; 170 kB la felia 3.3) are plafonul ei și nu intră în totalul aplicației, fiindcă aplicația n-o descarcă
 *   niciodată. Firebase-ul pe care îl aduce raportorul de erori (3.2, ADR 0043) intră în total: îl descarcă oricine are o
 *   eroare. Din 3.2, Firebase-ul comun (aplicația, App Check, funcțiile: `conexiuneBaza-*`) e o bucată împărțită de admin
 *   și de raportor: adminul se măsoară cu tot ce aduce (închiderea lui), raportorul la fel, cu plafonul lui.
 */
const PLAFON_PORNIRE_KB = 110;
const PLAFON_TOTAL_KB = 450;
const PLAFON_ADMIN_KB = 200;
/**
 * Ușa de încărcare a proiectului vine înaintea primei randări pentru oricine are un proiect salvat (proiectLocal): are
 * plafonul ei, iar pornirea plus ușa nu trec de plafonul pornirii. Altfel codul mutat din pornire în ușă ar ocoli poarta
 * (recenzia felii „loc în pachetul de pornire”, 17.10: 92,3 + 4,6 kB).
 */
const PLAFON_USA_KB = 8;
const BUCATA_ADMIN = /^assets\/PaginaAdmin-[^/]+\.js$/;
/**
 * Testul pas cu pas al owner-ului (ADR 0072): o bucată doar online, ca `/admin` (vine doar pe instanța de test, la clicul pe
 * Test), cu plafonul ei, în afara totalului aplicației, pe care nimeni altcineva n-o descarcă.
 */
const BUCATA_TEST = /^assets\/TestPasCuPas-[^/]+\.js$/;
const PLAFON_TEST_KB = 12;
/**
 * Mașina simulată a panoului mașinii (ADR 0081): emulatorul GRBL, doar pe instanța de test, la clicul pe „Mașină simulată”;
 * o bucată doar online, cu plafonul ei, în afara totalului (ca testul pas cu pas).
 */
const BUCATA_SIMULATA = /^assets\/MasinaSimulata-[^/]+\.js$/;
const PLAFON_SIMULATA_KB = 8;
/**
 * Raportorul de erori (ADR 0043): bucata la cerere cu Firebase-ul ei (17,5 kB după recenzia 3.2), descărcată la prima
 * eroare. Nu numără `enterprise.js` (reCAPTCHA, terț), adus în plus pe o instanță cu App Check.
 */
const PLAFON_RAPORTOR_KB = 25;
/**
 * Partea raportorului din pornire (`src/app/raportorPornire.ts`, cu ce aduce din `shared/`), măsurată singură, minificată:
 * coada, plafoanele, stingerea, curățarea textelor (1,39 kB după recenzia 3.2). Un import static al bucății trimițătoare
 * (în loc de `import type`) ar trage Firebase după ea și ar sări plafonul.
 */
const PLAFON_RAPORTOR_PORNIRE_KB = 1.5;
/**
 * Dicționarul codurilor controlerului (ADR 0085): date (JSON), nu JavaScript, cerute de panoul mașinii la primul cod și ținute
 * în precache (explicația unei alarme vine și fără rețea). Plafonul e pe fișierul unei limbi, comprimat (8,9 kB la felia 3.6c).
 */
const PLAFON_CODURI_KB = 12;
const RAPORTOR_PORNIRE = 'src/app/raportorPornire.ts';

function fisiere(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? fisiere(p) : [p];
  });
}

function amprenta(dir: string): Map<string, string> {
  return new Map(fisiere(dir).map((p) => [
    relative(dir, p).replace(/\\/g, '/'),
    createHash('sha256').update(readFileSync(p)).digest('hex'),
  ]));
}

/** Vite rulat direct prin Node, fără shell: argumentele ajung neatinse, pe orice platformă. */
const VITE = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

function construieste(outDir: string, mediu: Readonly<Record<string, string>> = {}): Map<string, string> {
  rmSync(outDir, { recursive: true, force: true });
  execFileSync(process.execPath, [VITE, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'warn'], {
    stdio: 'inherit',
    env: { ...process.env, ...mediu },
  });
  return amprenta(outDir);
}

const a = construieste('.tmp/build-1');
const b = construieste('.tmp/build-2');
const diferente = [...new Set([...a.keys(), ...b.keys()])].filter((f) => a.get(f) !== b.get(f));
if (diferente.length) {
  console.error(`Build-ul NU e determinist: ${diferente.length} fișiere diferă între două build-uri.`);
  for (const f of diferente) console.error(`  ✗ ${f}`);
  process.exit(1);
}

/**
 * O publicare redenumește doar ce s-a schimbat (ADR 0098). Proba: un al treilea build, al aceluiași arbore cu altă versiune
 * (`CNCVS2_VERSIUNE`, citită de `vite.config.ts` doar pentru proba asta), poate schimba doar `index.html` (versiunea stă în
 * antetul lui) și `sw.js` (revizia lui `index.html` din manifest). Fără harta importurilor, fiecare bucată purta numele
 * celorlalte, iar versiunea stătea în bucata de pornire, importată de aproape toate: măsurat pe test, o publicare fără cod
 * re-aducea 38 din 71 de fișiere, ~72 % din octeți (ADR 0096, „Limite”).
 */
const VERSIUNE_PROBA = 'proba-cascada';
const c = construieste('.tmp/build-3', { CNCVS2_VERSIUNE: VERSIUNE_PROBA });
const schimbateDeVersiune = [...new Set([...a.keys(), ...c.keys()])].filter((f) => a.get(f) !== c.get(f)).sort();
const PERMISE_LA_VERSIUNE = ['index.html', 'sw.js'];
const cascada = schimbateDeVersiune.filter((f) => !PERMISE_LA_VERSIUNE.includes(f));
if (cascada.length > 0) {
  console.error(`O versiune nouă schimbă ${cascada.length} fișiere în afara lui index.html și sw.js (cascada amprentelor, ADR 0098):`);
  for (const f of cascada) console.error(`  ✗ ${f}`);
  process.exit(1);
}
// Martorul: proba vede versiunea (altfel „nimic schimbat” ar trece și cu versiunea uitată în afara build-ului).
if (!schimbateDeVersiune.includes('index.html') || !readFileSync('.tmp/build-3/index.html', 'utf8').includes(VERSIUNE_PROBA)) {
  console.error('Proba cascadei e oarbă: index.html din build-ul cu altă versiune nu poartă versiunea cerută.');
  process.exit(1);
}

const gz = (p: string): number => gzipSync(readFileSync(p), { level: 9 }).length / 1024;
const html = readFileSync('.tmp/build-1/index.html', 'utf8');
// Harta importurilor (ADR 0098) e singurul script inline al paginii, iar CSP-ul din meta are exact amprenta ei: fără ea,
// nicio bucată nu s-ar mai rezolva; cu `unsafe-inline` sau cu alt script inline, CSP-ul n-ar mai fi cel scris.
const inline = hashuriInline(html);
const cspMeta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1];
// Codarea (`<meta charset>`) stă în primii 1024 de octeți ai paginii, înaintea CSP-ului lung (`vite.config.ts`, `dupaCharset`).
const octetCharset = Buffer.from(html, 'utf8').indexOf('<meta charset');
if (octetCharset < 0 || octetCharset > 1024 - 30 || octetCharset > html.indexOf('Content-Security-Policy')) {
  console.error(`index.html: <meta charset> e la octetul ${octetCharset}: trebuie în primii 1024 de octeți, înaintea CSP-ului.`);
  process.exit(1);
}
if (!html.includes('<script type="importmap">') || inline.length !== 1 || cspMeta !== cspPentru(html)) {
  console.error(`index.html: harta importurilor lipsește, are alte scripturi inline (${inline.length}) sau CSP-ul din meta n-are amprenta ei.`);
  process.exit(1);
}
const laPornire = new Set([...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1] ?? ''));
if (laPornire.size === 0) {
  console.error('index.html nu cere niciun script: măsurătoarea pachetului de pornire ar fi vidă.');
  process.exit(1);
}
// Pornirea e o singură bucată (grupul `pornire`, `vite.config.ts`). O a doua (o bucată comună, preîncărcată) înseamnă că
// grupul nu mai prinde tot ce importă intrarea: o mutare la cerere ar adăuga atunci o cerere la pornire, nu ar scoate octeți.
if (laPornire.size !== 1) {
  console.error(`index.html cere ${laPornire.size} scripturi (${[...laPornire].join(', ')}); pornirea trebuie să fie o singură bucată.`);
  process.exit(1);
}
let pornire = 0;
let total = 0;
let admin = 0;
let bucatiAdmin = 0;
let testPasCuPas = 0;
let bucatiTest = 0;
let simulata = 0;
let bucatiSimulata = 0;
/** Fiecare bucată JavaScript (calea din `dist/`, ca în `index.html`), cu mărimea ei gzip. */
const bucati = new Map<string, number>();
for (const p of fisiere('.tmp/build-1')) {
  if (!p.endsWith('.js')) continue;
  const kb = gz(p);
  const rel = relative('.tmp/build-1', p).replace(/\\/g, '/');
  bucati.set(rel, kb);
  if (BUCATA_ADMIN.test(rel)) {
    admin += kb;
    bucatiAdmin++;
    if (laPornire.has(rel)) {
      console.error(`${rel}: pagina /admin a ajuns în pachetul de pornire.`);
      process.exit(1);
    }
    continue;
  }
  if (BUCATA_TEST.test(rel)) {
    testPasCuPas += kb;
    bucatiTest++;
    if (laPornire.has(rel)) {
      console.error(`${rel}: testul pas cu pas a ajuns în pachetul de pornire.`);
      process.exit(1);
    }
    continue;
  }
  if (BUCATA_SIMULATA.test(rel)) {
    simulata += kb;
    bucatiSimulata++;
    if (laPornire.has(rel)) {
      console.error(`${rel}: mașina simulată a ajuns în pachetul de pornire.`);
      process.exit(1);
    }
    continue;
  }
  total += kb;
  if (laPornire.has(rel)) pornire += kb;
}
if (bucatiTest !== 1) {
  console.error(`Testul pas cu pas trebuie să fie exact o bucată separată (TestPasCuPas-*.js, ADR 0072); găsite: ${bucatiTest}.`);
  process.exit(1);
}
if (bucatiSimulata !== 1) {
  console.error(`Mașina simulată trebuie să fie exact o bucată separată (MasinaSimulata-*.js, ADR 0081); găsite: ${bucatiSimulata}.`);
  process.exit(1);
}
if (bucatiAdmin !== 1) {
  // Fără bucata ei, Firebase-ul adminului s-ar număra în altă parte (sau deloc): măsurătoarea ar minți.
  console.error(`Pagina /admin trebuie să fie exact o bucată separată (PaginaAdmin-*.js); găsite: ${bucatiAdmin}.`);
  process.exit(1);
}

/**
 * Harta importurilor (ADR 0098): bucățile se pomenesc între ele după numele stabile din hartă, nu după numele fișierelor.
 * `cod()` le traduce înapoi în numele reale, ca măsurătorile de mai jos (închiderile, importurile cerute) să citească
 * fișierele build-ului. Fiecare nume stabil trebuie să ducă la un fișier care există.
 */
const hartaImporturi = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '{"imports":{}}';
const traduceri = Object.entries((JSON.parse(hartaImporturi) as { imports: Record<string, string> }).imports)
  .map(([stabil, real]) => [stabil.replace(/^\/assets\//, ''), real.replace(/^\/assets\//, '')] as const);
const hartaFaraFisier = traduceri.filter(([, real]) => !a.has(`assets/${real}`));
if (traduceri.length === 0 || hartaFaraFisier.length > 0) {
  console.error(`Harta importurilor e goală sau trimite la fișiere care nu există: ${hartaFaraFisier.map(([s, r]) => `${s} → ${r}`).join(', ')}.`);
  process.exit(1);
}
const cod = (rel: string): string =>
  traduceri.reduce((text, [stabil, real]) => text.split(stabil).join(real), readFileSync(join('.tmp/build-1', rel), 'utf8'));
const bucataPornirii = [...laPornire][0] ?? '';
/** Bucata unui modul după numele ei (`assets/<nume>-<hash>.js`): exact una, altfel măsurătoarea de mai jos n-ar avea obiect. */
function bucataNumita(nume: string): string {
  const gasite = [...bucati.keys()].filter((r) => new RegExp(`^assets/${nume}-[A-Za-z0-9_-]{8}\\.js$`).test(r));
  if (gasite.length !== 1) {
    console.error(`Bucata ${nume}-*.js trebuie să existe o dată; găsite: ${gasite.length} (${gasite.join(', ')}).`);
    process.exit(1);
  }
  return gasite[0] ?? '';
}
/**
 * Ce aduce un `import()` al bucății: ea și ce importă static (`import "./x.js"`, `from "./x.js"`, nu `import("./x.js")`),
 * în afara pornirii (pornirea e deja în browser).
 */
function inchidere(rel: string): string[] {
  const vazute = new Set([rel]);
  const coada = [rel];
  for (let r = coada.shift(); r !== undefined; r = coada.shift()) {
    for (const m of cod(r).matchAll(/(?:import|from)\s*["']\.\/([^"']+\.js)["']/g)) {
      const dep = `assets/${m[1] ?? ''}`;
      if (bucati.has(dep) && !vazute.has(dep)) {
        vazute.add(dep);
        coada.push(dep);
      }
    }
  }
  return [...vazute].filter((r) => !laPornire.has(r));
}
const kbInchidere = (rel: string): number => inchidere(rel).reduce((s, r) => s + (bucati.get(r) ?? 0), 0);

/**
 * A doua plasă, pe artefact: un modul care trebuie să vină la cerere nu e în bucata de pornire. Măsurătoarea vede doar
 * cifra; un import static rămas (o schemă chemată din pornire) ar aduce modulul înapoi cu doar câteva sute de octeți în
 * plus, sub plafon. Fiecare marcaj e un text pe care îl are doar modulul acela și trebuie să existe în altă bucată
 * (altfel plasa n-ar mai vedea nimic, de exemplu după o reformulare a mesajului).
 */
const LA_CERERE: ReadonlyArray<readonly [string, string]> = [
  ['un arc cu bulge 0 n-are cerc', 'schemele documentului (src/model/schemaDocument.ts) vin cu ușa și cu fereastra exportului'],
  ['aria cere un contur închis', 'orientarea conturului (src/geom/contur.ts; pornirea importă doar conturBaza.ts) vine cu CAM-ul și offsetul'],
  ['până la omul de la mașină', 'estimarea timpului (src/sim/timp.ts, ADR 0046) vine cu calculul exportului'],
  ['nu conține nicio setare de mișcare', 'citirea setărilor mașinii (src/ir/masina.ts, ADR 0046) vine cu calculul exportului'],
];
for (const [marcaj, ce] of LA_CERERE) {
  if (cod(bucataPornirii).includes(marcaj)) {
    console.error(`Bucata de pornire conține „${marcaj}”: ${ce}, nu la pornire.`);
    process.exit(1);
  }
  if (![...bucati.keys()].some((r) => r !== bucataPornirii && cod(r).includes(marcaj))) {
    console.error(`Niciun fișier al build-ului nu conține „${marcaj}”: plasa pentru ${ce} nu mai vede nimic (marcajul s-a schimbat?).`);
    process.exit(1);
  }
}

/**
 * Firebase (ADR 0040 §1, ADR 0043 §2) stă DOAR în bucățile permise: raportorul, baza comună și pagina `/admin`. Marcajele
 * se caută în TOATE bucățile, nu doar în cea de pornire (recenzia 3.2: pornirea mai cere imediat ~9 bucăți, de exemplu
 * `PanouProprietati`; un import de valoare din baza conexiunii într-una dintre ele ar aduce Firebase la fiecare pornire).
 * Și nicio altă bucată nu importă static o bucată permisă: baza ar rămâne în bucata ei, dar ar veni odată cu importatorul.
 */
/**
 * Nucleul simulării și bazinul lui (ADR 0047) stau DOAR în bucata calculului exportului și în workerul simulării; vederea
 * 3D (ADR 0057) le cere tot prin bucata calculului exportului. Pregătirea programului (`program.ts`) stă și în workerul CAM,
 * care trimite mutările gata (ADR 0109). Plasa caută în TOATE bucățile (recenzia 19.10: un import static din
 * `PanouProprietati`, adus la pornire, scăpa unei căutări doar în bucata de pornire).
 *
 * CAM-ul (ADR 0109) stă DOAR în workerul lui: firul principal primește programul gata. Plasa vede și ramura din proces a
 * bazinului CAM (a testelor din Node), care trebuie să dispară la build cu importul ei (`__CNCVS2_CONSTRUIT__`): altfel
 * calculul CAM ar ieși într-o bucată a firului principal, încă ~45 kB în total.
 */
const bucataNumitaRe = (nume: string): RegExp => new RegExp(`^assets\\/${nume}-[A-Za-z0-9_-]{8}\\.js$`);
const CU_SIMULARE = /^assets\/(?:actiuniExportCalcul|lucratorSimulare|lucratorCam)-[A-Za-z0-9_-]{8}\.js$/;
const MARCAJE_SIMULARE: ReadonlyArray<readonly [string, string, RegExp, string]> = [
  ['nu se simulează încă', 'nucleul simulării (src/sim/nucleu.ts și program.ts)', CU_SIMULARE, 'simularea are voie doar în bucata calculului exportului și în workerele ei'],
  ['workerul simulării a căzut', 'bazinul simulării (src/jobs/bazin.ts)', bucataNumitaRe('actiuniExportCalcul'), 'bazinul simulării are voie doar în bucata calculului exportului'],
  ['nicio formă n-are o operație de tăiere', 'CAM-ul (src/cam/job.ts)', bucataNumitaRe('lucratorCam'), 'CAM-ul are voie doar în workerul lui (ADR 0109)'],
  ['exportul cere confirmarea ta', 'calculul exportului (src/jobs/calculCam.ts)', bucataNumitaRe('lucratorCam'), 'calculul CAM are voie doar în workerul lui (ADR 0109)'],
  ['workerul CAM a căzut', 'bazinul CAM (src/jobs/bazinCam.ts)', bucataNumitaRe('actiuniExportCalcul'), 'bazinul CAM are voie doar în bucata calculului exportului'],
];
for (const [marcaj, ce, permise, regula] of MARCAJE_SIMULARE) {
  const cu = [...bucati.keys()].filter((r) => cod(r).includes(marcaj));
  if (cu.length === 0) {
    console.error(`Niciun fișier al build-ului nu conține „${marcaj}”: plasa pentru ${ce} nu mai vede nimic (marcajul s-a schimbat?).`);
    process.exit(1);
  }
  const straine = cu.filter((r) => !permise.test(r));
  if (straine.length > 0) {
    console.error(`„${marcaj}” (${ce}) e în ${straine.join(', ')}: ${regula}.`);
    process.exit(1);
  }
}

/**
 * Vederea 3D (ADR 0057): shaderele și camera ei stau DOAR în bucata ei, adusă la primul clic pe „3D”. Un import static din
 * modulul editării ar aduce WebGL-ul ei la fiecare deschidere a aplicației, după prima randare; unul din pornire, la
 * fiecare pornire.
 */
const MARCAJ_3D = 'texelFetch(u_z';
const cu3d = [...bucati.keys()].filter((r) => cod(r).includes(MARCAJ_3D));
if (cu3d.length === 0) {
  console.error(`Niciun fișier al build-ului nu conține „${MARCAJ_3D}”: plasa pentru vederea 3D nu mai vede nimic (marcajul s-a schimbat?).`);
  process.exit(1);
}
const straine3d = cu3d.filter((r) => !/^assets\/Vedere3D-[A-Za-z0-9_-]{8}\.js$/.test(r));
if (straine3d.length > 0) {
  console.error(`„${MARCAJ_3D}” (vederea 3D, src/app/Vedere3D.tsx) e în ${straine3d.join(', ')}: vederea 3D are voie doar în bucata ei.`);
  process.exit(1);
}

// Google Fonts (ADR 0106 §4): clientul funcției `fonturiGoogle` vine tot la cerere, prin import() din fereastra fonturilor.
const CU_FIREBASE = /^assets\/(?:raportor|conexiuneBaza|PaginaAdmin|apelFonturiGoogle)-[A-Za-z0-9_-]{8}\.js$/;
const MARCAJE_FIREBASE: ReadonlyArray<readonly [string, string]> = [
  ['@firebase/app', 'aplicația Firebase (src/cloud/conexiuneBaza.ts)'],
  ['content-firebaseappcheck.googleapis.com', 'App Check'],
  ['@firebase/functions', 'funcțiile Firebase'],
  ['logClientError', 'trimiterea raportului (src/cloud/raportor.ts)'],
];
for (const [marcaj, ce] of MARCAJE_FIREBASE) {
  const cu = [...bucati.keys()].filter((r) => cod(r).includes(marcaj));
  if (cu.length === 0) {
    console.error(`Niciun fișier al build-ului nu conține „${marcaj}”: plasa pentru ${ce} nu mai vede nimic (marcajul s-a schimbat?).`);
    process.exit(1);
  }
  const straine = cu.filter((r) => !CU_FIREBASE.test(r));
  if (straine.length > 0) {
    console.error(`„${marcaj}” (${ce}) e în ${straine.join(', ')}: Firebase are voie doar în raportor-*, conexiuneBaza-*, PaginaAdmin-* și apelFonturiGoogle-* (vine la cerere, cu raportorul de erori, cu /admin și cu Google Fonts).`);
    process.exit(1);
  }
}
for (const r of bucati.keys()) {
  if (CU_FIREBASE.test(r)) continue;
  for (const m of cod(r).matchAll(/(?:import|from)\s*["']\.\/([^"']+\.js)["']/g)) {
    if (CU_FIREBASE.test(`assets/${m[1] ?? ''}`)) {
      console.error(`${r} importă static ${m[1] ?? ''}: Firebase ar veni odată cu ea, nu la cerere (doar import() are voie).`);
      process.exit(1);
    }
  }
}
// Prețul unui proiect salvat: ușa documentului curent (`usaCurenta`, ADR 0070) și ce aduce ea în afara pornirii vin
// înaintea primei randări. Migrările (`migrari.ts`, în bucata `incarcare`) vin doar pentru un document mai vechi: a doua
// plasă, pe artefact, e un text pe care îl are doar migrarea v1 → v2, care trebuie să fie în `incarcare` și nu în ușă.
const usa = bucataNumita('usaCurenta');
const kbUsa = kbInchidere(usa);
const MARCAJ_MIGRARI = 'pe care v2 îl folosește';
if (!cod(bucataNumita('incarcare')).includes(MARCAJ_MIGRARI) || inchidere(usa).some((r) => cod(r).includes(MARCAJ_MIGRARI))) {
  console.error(`Migrările („${MARCAJ_MIGRARI}”) trebuie să fie în bucata incarcare-*.js și în afara ușii de la pornire (${inchidere(usa).join(', ')}).`);
  process.exit(1);
}

/**
 * Dicționarul limbii active (`mesaje/ro.json` / `mesaje/en.json`, ADR 0095; `t.ts`) vine la cerere, ca date, dar înaintea
 * primei randări, la FIECARE pornire: se numără în pornire (cel mai mare dintre ele, gzip), altfel cifra ar ascunde ~2 kB.
 * Ambele fișiere există, cu forma citită de aplicație, iar nicio bucată JavaScript nu mai e o bucată de limbă
 * (`mesaje.*.js`: dicționarul ar fi ajuns înapoi în cod). Textele lor, căutate în cod, mai jos, cu mesajele modulelor.
 */
const LIMBI_BAZA: readonly Limba[] = ['ro', 'en'];
const fisiereBaza = LIMBI_BAZA.map(fisierBaza);
const bucatiLimba = [...bucati.keys()].filter((r) => /^assets\/mesaje\.[^/]+\.js$/.test(r));
const bazaStricata = fisiereBaza.filter((f) => !a.has(f) || !esteDictionarMesaje(JSON.parse(readFileSync(join('.tmp/build-1', f), 'utf8'))));
if (bucatiLimba.length > 0 || bazaStricata.length > 0) {
  console.error(`Dicționarele de bază (ADR 0095) stau în ${fisiereBaza.join(', ')}, nu în JavaScript: bucăți de limbă ${bucatiLimba.join(', ') || '—'}; lipsă sau cu altă formă ${bazaStricata.join(', ') || '—'}.`);
  process.exit(1);
}
const kbLimba = Math.max(...fisiereBaza.map((f) => gz(join('.tmp/build-1', f))));
pornire += kbLimba;

/**
 * Alegerea cu clicul (`actiuniAlegere`) vine imediat după montare, iar un clic dat înainte o așteaptă: ce aduce ea în
 * afara pornirii rămâne mic (distanța la contur, ~1,8 kB la 17.10). Dacă bucata ei ajunge să împartă o bucată mare (de
 * exemplu offsetul, care folosește și el distanța), primul clic ar aștepta-o: atunci regula din `vite.config.ts`.
 */
const PLAFON_ALEGERE_KB = 3;
const alegere = bucataNumita('actiuniAlegere');
const kbAlegere = kbInchidere(alegere);
if (kbAlegere > PLAFON_ALEGERE_KB) {
  console.error(`Alegerea cu clicul aduce ${kbAlegere.toFixed(1)} kB în afara pornirii (plafon ${PLAFON_ALEGERE_KB}): ${inchidere(alegere).join(', ')}.`);
  process.exit(1);
}

/**
 * Raportorul de erori (ADR 0043): bucata trimițătoare există, separat, iar pornirea o cere doar dinamic (`import()`);
 * ce aduce ea (Firebase-ul comun) are plafonul ei. Adminul se măsoară cu închiderea lui: cu Firebase-ul împărțit.
 */
const raportor = bucataNumita('raportor');
const numeRaportor = raportor.replace('assets/', '');
if (!['`', '"', "'"].some((g) => cod(bucataPornirii).includes(`import(${g}./${numeRaportor}${g})`))) {
  console.error(`Pornirea nu cere ${numeRaportor} cu import(): raportorul nu mai vine la cerere (sau nu mai vine deloc).`);
  process.exit(1);
}
const kbRaportor = kbInchidere(raportor);
const bucataAdmin = [...bucati.keys()].find((r) => BUCATA_ADMIN.test(r)) ?? '';
admin = kbInchidere(bucataAdmin);

/** Partea din pornire, măsurată singură: modulul, minificat, cu tot ce importă (nimic extern), gzip 9. */
async function kbModul(intrare: string): Promise<number> {
  const { build } = await import('vite');
  const iesire = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: { entry: intrare, formats: ['es'], fileName: 'modul' },
      // În modul bibliotecă, `minify: true` lasă spațiile (ieșirea rămâne citibilă); minificarea completă, ca în build.
      rolldownOptions: { treeshake: true, output: { minify: true } },
    },
  });
  const rezultate = Array.isArray(iesire) ? iesire : [iesire];
  let codModul = '';
  for (const r of rezultate) {
    if ('output' in r) for (const o of r.output) if (o.type === 'chunk') codModul += o.code;
  }
  if (codModul === '') {
    console.error(`${intrare}: măsurătoarea n-a produs cod (plasa ar fi vidă).`);
    process.exit(1);
  }
  return gzipSync(codModul, { level: 9 }).length / 1024;
}
/**
 * Workerul PWA (ADR 0045 §8): `sw.js` există (iar determinismul de mai sus îl cere identic în cele două build-uri), iar
 * manifestul lui de precache e EXACT ce cere predicatul (`shared/precache.ts`), în ambele direcții. Cum predicatul e
 * același în `vite.config.ts` și aici, egalitatea prinde doar un manifest nefiltrat sau tăiat de workbox (un fișier peste
 * plafonul lui de mărime); de aceea, câteva verificări NU trec prin predicat: ambele dicționare, ferestrele, workerul
 * pânzei și raportorul (cu baza conexiunii) sunt în manifest, pagina `/admin` (după CONȚINUT: Firestore, contul) nu e,
 * iar o bucată adusă doar de bucăți doar online (de exemplu o parte nouă a paginii `/admin`) cere să fie trecută în
 * `DOAR_ONLINE`.
 */
if (!a.has('sw.js')) {
  console.error('dist/sw.js lipsește: workerul PWA nu s-a construit (vite-plugin-pwa, `vite.config.ts`).');
  process.exit(1);
}
const codSw = readFileSync('.tmp/build-1/sw.js', 'utf8');
if (codSw.includes('__WB_MANIFEST')) {
  console.error('sw.js conține încă `self.__WB_MANIFEST`: manifestul precache-ului nu s-a injectat.');
  process.exit(1);
}
const manifest = new Set([...codSw.matchAll(/["']?url["']?\s*:\s*["']([^"']+)["']/g)].map((m) => m[1] ?? ''));
const necunoscute = [...a.keys()].filter((f) => motivPrecache(f) === 'necunoscut');
if (necunoscute.length > 0) {
  console.error(`Fișiere fără decizie de precache (shared/precache.ts): ${necunoscute.join(', ')}.`);
  process.exit(1);
}
const dePrecache = [...a.keys()].filter(inPrecache);
const lipsaDinManifest = dePrecache.filter((f) => !manifest.has(f));
const inPlusInManifest = [...manifest].filter((f) => !dePrecache.includes(f));
if (lipsaDinManifest.length > 0 || inPlusInManifest.length > 0) {
  console.error(`Manifestul precache-ului din sw.js nu e cel din shared/precache.ts: lipsesc ${lipsaDinManifest.join(', ') || '—'}; în plus ${inPlusInManifest.join(', ') || '—'}.`);
  process.exit(1);
}
/**
 * Mărimile din manifest (ADR 0097): progresul instalării le adună, deci fiecare intrare are una, egală cu fișierul din build.
 * Una lipsă ar opri progresul (totalul 0) sau l-ar arăta greșit. Workbox scrie intrarea cu cheile în ordine alfabetică.
 */
const marimiManifest = new Map([...codSw.matchAll(/\{"marime":(\d+),"revision":(?:null|"[0-9a-f]+"),"url":"([^"]+)"\}/g)].map((m) => [m[2] ?? '', Number(m[1])]));
const marimiGresite = dePrecache.filter((f) => marimiManifest.get(f) !== statSync(join('.tmp/build-1', f)).size);
if (marimiManifest.size !== manifest.size || marimiGresite.length > 0) {
  console.error(`Manifestul din sw.js n-are mărimea fișierului (marime) la ${marimiGresite.join(', ') || `${manifest.size - marimiManifest.size} intrări`}: progresul instalării ar fi greșit (ADR 0097, vite.config.ts).`);
  process.exit(1);
}
// Raportorul și baza conexiunii sunt obligatorii (recenzia din 18.10): fila rămâne pe versiunea ei până la clic, deci și
// raportorul ei trebuie să vină după o publicare, când bucata lui veche nu mai e pe hosting.
const obligatorii = ['index.html', bucataPornirii, ...fisiereBaza, ...['ExportConectat', 'ImportConectat', 'actiuniAlegere', 'actiuniExportCalcul', 'lucrator', 'lucratorSimulare', 'lucratorCam', 'raportor', 'conexiuneBaza'].map(bucataNumita)];
const lipsaObligatorii = obligatorii.filter((f) => !manifest.has(f));
if (lipsaObligatorii.length > 0) {
  console.error(`Precache-ul nu are ${lipsaObligatorii.join(', ')}: offline, aplicația n-ar porni sau limba / ferestrele / raportorul n-ar veni (ADR 0042, ADR 0045 §2).`);
  process.exit(1);
}
/**
 * Pagina `/admin` rămâne afară, după CONȚINUT (nu prin predicat): adresele Firestore și ale contului (Auth), pe care le
 * are doar ea. Firebase-ul raportorului (aplicația, App Check, funcțiile) are voie în precache doar în raportor-* și
 * conexiuneBaza-*.
 */
const MARCAJE_ADMIN: ReadonlyArray<readonly [string, string]> = [
  ['firestore.googleapis.com', 'Firestore (pagina /admin)'],
  ['identitytoolkit', 'contul Firebase (pagina /admin)'],
];
for (const [marcaj, ce] of MARCAJE_ADMIN) {
  if (![...bucati.keys()].some((r) => cod(r).includes(marcaj))) {
    console.error(`Niciun fișier al build-ului nu conține „${marcaj}”: plasa pentru ${ce} nu mai vede nimic (marcajul s-a schimbat?).`);
    process.exit(1);
  }
}
const FIREBASE_IN_PRECACHE = /^assets\/(?:raportor|conexiuneBaza)-[A-Za-z0-9_-]{8}\.js$/;
const straineInPrecache = [...manifest].filter((f) => f === 'config.json' || f === 'sw.js' || f.startsWith('banc/') || f.startsWith(`${DIR_DOCUMENTATIE}/`)
  || (f.endsWith('.js') && MARCAJE_ADMIN.some(([marcaj]) => cod(f).includes(marcaj)))
  || (f.endsWith('.js') && !FIREBASE_IN_PRECACHE.test(f) && MARCAJE_FIREBASE.some(([marcaj]) => cod(f).includes(marcaj))));
if (straineInPrecache.length > 0) {
  console.error(`Precache-ul conține ${straineInPrecache.join(', ')}: pagina /admin (Firestore, contul), config.json, sw.js, bancul și documentația rămân în afara lui; Firebase doar în raportor-* și conexiuneBaza-*.`);
  process.exit(1);
}

/**
 * Documentația admin (ADR 0048): build-ul a scris-o (pluginul pică el însuși pe un tabel care nu se mai poate citi),
 * fiecare document din catalog are fișierul lui, iar ea vine din rețea la deschiderea filei, nu cu codul: niciun text al
 * documentelor în vreo bucată JS (un `import …?raw` ar aduce-o în /admin), cu marcajul prezent în roadmap (plasa nu e vidă).
 */
const roadmapBrut = a.has(FISIER_ROADMAP) ? readFileSync(join('.tmp/build-1', FISIER_ROADMAP), 'utf8') : '';
const catalogBrut = a.has(FISIER_CATALOG) ? readFileSync(join('.tmp/build-1', FISIER_CATALOG), 'utf8') : '';
const roadmapCitit: unknown = roadmapBrut === '' ? null : JSON.parse(roadmapBrut);
const catalogCitit: unknown = catalogBrut === '' ? null : JSON.parse(catalogBrut);
if (!esteRoadmap(roadmapCitit) || !esteCatalog(catalogCitit)) {
  console.error(`dist/${FISIER_ROADMAP} sau dist/${FISIER_CATALOG} lipsește sau are altă formă: documentația admin nu s-a generat (pluginul din vite.config.ts).`);
  process.exit(1);
}
// Roadmap-ul în engleză (ADR 0056): același, din dicționarul traducerilor; textele netraduse se spun (proba unitară le cere 0).
const roadmapEnCitit: unknown = a.has(FISIER_ROADMAP_EN) ? JSON.parse(readFileSync(join('.tmp/build-1', FISIER_ROADMAP_EN), 'utf8')) : null;
if (!esteRoadmap(roadmapEnCitit) || roadmapEnCitit.limba !== 'en' || roadmapEnCitit.etape.length !== roadmapCitit.etape.length) {
  console.error(`dist/${FISIER_ROADMAP_EN} lipsește, are altă formă sau alte etape decât dist/${FISIER_ROADMAP} (ADR 0056).`);
  process.exit(1);
}
// Manualul utilizatorului (ADR 0058): ambele limbi, cu aceleași capitole, și în precache (se citește și fără rețea).
const manualeCitite = LIMBI_MANUAL.map((l): unknown => (a.has(fisierManual(l)) ? JSON.parse(readFileSync(join('.tmp/build-1', fisierManual(l)), 'utf8')) : null));
const capitoleManual = manualeCitite.map((m) => (esteManual(m) ? m.capitole.map((c) => c.id).join(',') : null));
if (capitoleManual.some((c, k) => c === null || c !== capitoleManual[0] || (manualeCitite[k] as { limba?: string }).limba !== LIMBI_MANUAL[k])
  || LIMBI_MANUAL.some((l) => !manifest.has(fisierManual(l)))) {
  console.error(`Manualul (dist/${DIR_MANUAL}/): lipsește, are altă formă, alte capitole într-o limbă sau nu e în precache (ADR 0058).`);
  process.exit(1);
}
// Dicționarul codurilor (ADR 0085): ambele limbi, cu aceleași tabele, în precache, sub plafon.
const coduriCitite = LIMBI_CODURI.map((l): unknown => (a.has(fisierCoduri(l)) ? JSON.parse(readFileSync(join('.tmp/build-1', fisierCoduri(l)), 'utf8')) : null));
const formaCodurilor = coduriCitite.map((d) => (esteDictionarCoduri(d) ? JSON.stringify(d.familii) : null));
const kbCoduri = LIMBI_CODURI.map((l) => (a.has(fisierCoduri(l)) ? gz(join('.tmp/build-1', fisierCoduri(l))) : 0));
if (formaCodurilor.some((f, k) => f === null || f !== formaCodurilor[0] || (coduriCitite[k] as { limba?: string }).limba !== LIMBI_CODURI[k])
  || LIMBI_CODURI.some((l) => !manifest.has(fisierCoduri(l))) || kbCoduri.some((kb) => kb > PLAFON_CODURI_KB)) {
  console.error(`Dicționarul codurilor (dist/${DIR_CODURI}/): lipsește, are altă formă, alte tabele într-o limbă, nu e în precache sau trece de ${PLAFON_CODURI_KB} kB gzip (${kbCoduri.map((kb) => kb.toFixed(1)).join(', ')}; ADR 0085).`);
  process.exit(1);
}
// Mesajele modulelor la cerere (ADR 0086): un fișier pe modul, ambele limbi cu aceleași chei, în precache; textele lor nu
// mai stau în JavaScript (cel mai lung mesaj al fiecărui modul, căutat în fiecare bucată, marcajul care nu trebuie să apară).
const problemeMesaje: string[] = [];
let kbMesaje = 0;
for (const m of MODULE_MESAJE) {
  const f = fisierMesaje(m);
  if (!a.has(f) || !manifest.has(f)) problemeMesaje.push(`${f} lipsește sau nu e în precache`);
  else {
    kbMesaje += gz(join('.tmp/build-1', f));
    if (!esteFisierMesaje(JSON.parse(readFileSync(join('.tmp/build-1', f), 'utf8')))) problemeMesaje.push(`${f} nu are forma așteptată`);
  }
  // Doar ASCII fără ghilimele: minificatorul ar putea scrie altfel un caracter peste 0x7F sau o ghilimea, și marcajul n-ar
  // mai găsi nimic.
  const marcaj = Object.values(DICTIONARE_MODULE[m].en).filter((v): v is string => typeof v === 'string' && /^[ !#-&(-[\]-~]+$/.test(v))
    .sort((x, y) => y.length - x.length)[0] ?? '';
  if (marcaj.length < 20) problemeMesaje.push(`${m}: niciun marcaj ASCII destul de lung`);
  const inCod = [...bucati.keys()].filter((r) => marcaj !== '' && cod(r).includes(marcaj));
  if (inCod.length > 0) problemeMesaje.push(`textele modulului ${m} sunt încă în JavaScript (${inCod.join(', ')})`);
}
for (const l of LIMBI_BAZA) {
  const marcaj = Object.values(DICTIONARE_BAZA[l]).filter((v): v is string => typeof v === 'string' && /^[ !#-&(-[\]-~]+$/.test(v))
    .sort((x, y) => y.length - x.length)[0] ?? '';
  if (marcaj.length < 20) problemeMesaje.push(`dicționarul de bază ${l}: niciun marcaj ASCII destul de lung`);
  const inCod = [...bucati.keys()].filter((r) => marcaj !== '' && cod(r).includes(marcaj));
  if (inCod.length > 0) problemeMesaje.push(`dicționarul de bază ${l} e încă în JavaScript (${inCod.join(', ')})`);
}
if (problemeMesaje.length > 0) {
  console.error(`Mesajele (dist/${DIR_MESAJE}/, ADR 0086, 0095): ${problemeMesaje.join('; ')}.`);
  process.exit(1);
}
const faraFisier = catalogCitit.documente.filter((d) => !a.has(fisierDocument(d.cale)));
if (faraFisier.length > 0) {
  console.error(`Documente din catalog fără fișierul lor în dist/: ${faraFisier.map((d) => d.cale).join(', ')}.`);
  process.exit(1);
}
const MARCAJ_DOCUMENTATIE = 'Un schelet care taie';
if (!roadmapBrut.includes(MARCAJ_DOCUMENTATIE)) {
  console.error(`dist/${FISIER_ROADMAP} nu conține „${MARCAJ_DOCUMENTATIE}”: plasa „documentația nu e în cod” nu mai vede nimic (marcajul s-a schimbat?).`);
  process.exit(1);
}
const cuDocumentatie = [...bucati.keys()].filter((r) => cod(r).includes(MARCAJ_DOCUMENTATIE));
if (cuDocumentatie.length > 0) {
  console.error(`${cuDocumentatie.join(', ')} conține textul documentației („${MARCAJ_DOCUMENTATIE}”): ea vine din rețea, la deschiderea filei (ADR 0048), nu în cod.`);
  process.exit(1);
}
const fisiereDoc = [...a.keys()].filter((f) => f.startsWith(`${DIR_DOCUMENTATIE}/`));
const kbDocBrut = fisiereDoc.reduce((s, f) => s + statSync(join('.tmp/build-1', f)).size, 0) / 1024;
const kbDocGz = fisiereDoc.reduce((s, f) => s + gz(join('.tmp/build-1', f)), 0);
/** Cine pomenește o bucată JS: un import static sau dinamic (`./x.js`) ori un worker (`/assets/x.js`). */
const referinte = (rel: string): string[] => {
  const nume = rel.replace('assets/', '');
  return [...bucati.keys()].filter((r) => r !== rel && r !== 'sw.js'
    && [...cod(r).matchAll(/["'`](?:\.\/|\/assets\/)([^"'`]+\.js)["'`]/g)].some((m) => m[1] === nume));
};
for (const f of manifest) {
  if (f.endsWith('.js') && f !== bucataPornirii && !referinte(f).some((r) => manifest.has(r))) {
    console.error(`${f} e adusă doar de bucăți din afara precache-ului (${referinte(f).join(', ') || 'de nimeni'}): o parte doar online (/admin) se trece în DOAR_ONLINE (${DOAR_ONLINE.join(', ')}).`);
    process.exit(1);
  }
  const stil = /^assets\/(.+)-[A-Za-z0-9_-]{8}\.css$/.exec(f);
  if (stil && !html.includes(`/${f}"`) && ![...manifest].some((j) => j.startsWith(`assets/${stil[1] ?? ''}-`) && j.endsWith('.js'))) {
    console.error(`${f}: stilul unei bucăți din afara precache-ului (nici în index.html, nici lângă o bucată JS a lui): se trece în DOAR_ONLINE.`);
    process.exit(1);
  }
}
const kbPrecache = [...manifest].reduce((s, f) => s + gz(join('.tmp/build-1', f)), 0);

/**
 * Înregistrarea workerului (ADR 0045 §7) vine la cerere, după prima randare: bucata de pornire o cere doar cu `import()`,
 * iar adresa workerului (`/sw.js`, un text pe care îl are doar ea) nu e în pornire, dar e în altă bucată.
 */
const inregistrare = bucataNumita('inregistrare');
const numeInregistrare = inregistrare.replace('assets/', '');
if (!['`', '"', "'"].some((g) => cod(bucataPornirii).includes(`import(${g}./${numeInregistrare}${g})`))) {
  console.error(`Pornirea nu cere ${numeInregistrare} cu import(): înregistrarea workerului nu mai vine la cerere (sau deloc).`);
  process.exit(1);
}
if (cod(bucataPornirii).includes('/sw.js')) {
  console.error('Bucata de pornire conține „/sw.js”: înregistrarea workerului PWA vine la cerere (src/pwa/inregistrare.ts), nu la pornire.');
  process.exit(1);
}
if (!cod(inregistrare).includes('/sw.js')) {
  console.error(`${inregistrare} nu conține „/sw.js”: plasa înregistrării la cerere nu mai vede nimic.`);
  process.exit(1);
}

const kbRaportorPornire = await kbModul(RAPORTOR_PORNIRE);
console.log(`Build determinist: ${a.size} fișiere, identice în două build-uri.`);
console.log(`O versiune nouă schimbă doar ${schimbateDeVersiune.join(' și ')} (harta importurilor, ADR 0098): ${traduceri.length} bucăți pomenite după nume stabile.`);
console.log(`JavaScript gzip la pornire: ${pornire.toFixed(1)} kB, cu dicționarul limbii active (date, ${kbLimba.toFixed(1)} kB) (plafon ${PLAFON_PORNIRE_KB}); total: ${total.toFixed(1)} kB (plafon ${PLAFON_TOTAL_KB}); /admin: ${admin.toFixed(1)} kB (plafon ${PLAFON_ADMIN_KB}); testul pas cu pas: ${testPasCuPas.toFixed(1)} kB (plafon ${PLAFON_TEST_KB}, doar online); mașina simulată: ${simulata.toFixed(1)} kB (plafon ${PLAFON_SIMULATA_KB}, doar online).`);
console.log(`Raportorul de erori: în pornire ${kbRaportorPornire.toFixed(2)} kB (plafon ${PLAFON_RAPORTOR_PORNIRE_KB}); la cerere, la prima eroare: ${kbRaportor.toFixed(1)} kB (plafon ${PLAFON_RAPORTOR_KB}) (${inchidere(raportor).map((r) => r.replace('assets/', '')).join(', ')}).`);
console.log(`Workerul PWA: sw.js ${gz('.tmp/build-1/sw.js').toFixed(1)} kB; precache ${manifest.size} fișiere, ${kbPrecache.toFixed(1)} kB gzip (fără ${[...a.keys()].filter((f) => !inPrecache(f) && !f.startsWith(`${DIR_DOCUMENTATIE}/`)).join(', ')} și ${DIR_DOCUMENTATIE}/, ${fisiereDoc.length} fișiere).`);
console.log(`Documentația admin (doar online, la cerere): ${fisiereDoc.length} fișiere, ${kbDocBrut.toFixed(0)} kB (${kbDocGz.toFixed(0)} kB gzip); roadmap ${gz(join('.tmp/build-1', FISIER_ROADMAP)).toFixed(1)} kB gzip (în engleză ${gz(join('.tmp/build-1', FISIER_ROADMAP_EN)).toFixed(1)} kB, ${roadmapEnCitit.netraduse} texte netraduse), ${roadmapCitit.etape.length} rânduri de etape, ${catalogCitit.documente.length} documente.`);
console.log(`Manualul (în precache): ${LIMBI_MANUAL.map((l) => `${l} ${gz(join('.tmp/build-1', fisierManual(l))).toFixed(1)} kB gzip`).join(', ')}, ${capitoleManual[0]?.split(',').length ?? 0} capitole.`);
console.log(`Mesajele modulelor la cerere (date, în precache): ${MODULE_MESAJE.length} fișiere, ${kbMesaje.toFixed(1)} kB gzip (ambele limbi; ADR 0086); dicționarele de bază: ${fisiereBaza.map((f) => `${f} ${gz(join('.tmp/build-1', f)).toFixed(1)} kB`).join(', ')} gzip (ADR 0095).`);
console.log(`Dicționarul codurilor (în precache): ${LIMBI_CODURI.map((l, k) => `${l} ${(kbCoduri[k] ?? 0).toFixed(1)} kB gzip`).join(', ')} (plafon ${PLAFON_CODURI_KB} pe limbă).`);
console.log(`Cu un proiect salvat, ușa vine înaintea primei randări: +${kbUsa.toFixed(1)} kB (plafon ${PLAFON_USA_KB}; cu pornirea ${(pornire + kbUsa).toFixed(1)} / ${PLAFON_PORNIRE_KB}) (${inchidere(usa).map((r) => r.replace('assets/', '')).join(', ')}).`);
rmSync('.tmp/build-1', { recursive: true, force: true });
rmSync('.tmp/build-2', { recursive: true, force: true });
if (kbUsa > PLAFON_USA_KB || pornire + kbUsa > PLAFON_PORNIRE_KB) {
  console.error(`Ușa proiectului: ${kbUsa.toFixed(1)} kB (plafon ${PLAFON_USA_KB}); pornirea cu ușa: ${(pornire + kbUsa).toFixed(1)} kB (plafon ${PLAFON_PORNIRE_KB}).`);
  process.exit(1);
}
if (kbRaportorPornire > PLAFON_RAPORTOR_PORNIRE_KB || kbRaportor > PLAFON_RAPORTOR_KB) {
  console.error(`Raportorul de erori: în pornire ${kbRaportorPornire.toFixed(2)} kB (plafon ${PLAFON_RAPORTOR_PORNIRE_KB}); la cerere ${kbRaportor.toFixed(1)} kB (plafon ${PLAFON_RAPORTOR_KB}).`);
  process.exit(1);
}
if (pornire > PLAFON_PORNIRE_KB || total > PLAFON_TOTAL_KB || admin > PLAFON_ADMIN_KB || testPasCuPas > PLAFON_TEST_KB || simulata > PLAFON_SIMULATA_KB) {
  console.error('Mărimea pachetului trece de plafon.');
  process.exit(1);
}
