# Lista de otrăvuri a feliei 12.1↑f-4 (supracursa și pe tăieturile cât foaia, la alegere, ADR 0177), 18.11.2026, alese de
# autor: ce taie lucrarea (felurile de operații, incrustațiile, potrivirea „cât foaia”, adâncimea nouă), unde intră (lucrarea,
# calculul exportului), fereastra (bifa, oprirea ei fără supracursă, cererea, rezultatul vechi scos) și aplicația care o ține.
# Țintele din ADR 0177: un V-carve sau o incrustație cât foaia schimbate, o adâncime deja peste foaie sau mai mică schimbată,
# supracursa pusă de două ori, bifa fără efect sau cu efect și debifată, implicitul debifat, bifa pornită fără supracursă.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PRIN = 'src/cam/prinFoaie.ts'
JOB = 'src/cam/job.ts'
CALC = 'src/jobs/calculCam.ts'
DLG = 'src/ui/DialogExport.tsx'
CON = 'src/app/ExportConectat.tsx'
APP = 'src/app/App.tsx'

# ---- Ce taie lucrarea ----
# Mutată pe `catFoaia` (28.8↑h) cu finisarea din 18.1↑c; aceeași greșeală.
# F01, F02 mutate pe codul din 18.1↑d (26.11): `catFoaia` lasă și degroșarea reliefului cum e scrisă (`o.tip !== 'degrosare'`); aceeași greșeală.
o('F01', PRIN, "  o.tip !== 'vcarve' && o.tip !== 'finisare' && o.tip !== 'degrosare' && o.incrustatie === 'fara' &&",
  "  o.tip !== 'finisare' && o.tip !== 'degrosare' && o.incrustatie === 'fara' &&", 'prin', 'V-carve-ul cât foaia coboară și el')
o('F02', PRIN, "o.tip !== 'vcarve' && o.tip !== 'finisare' && o.tip !== 'degrosare' && o.incrustatie === 'fara' && Math.abs",
  "o.tip !== 'vcarve' && o.tip !== 'finisare' && o.tip !== 'degrosare' && Math.abs", 'prin', 'incrustația cât foaia coboară și ea')
o('F03', PRIN, 'Math.abs(o.adancime - grosime) <= EPS_FOAIE;', 'o.adancime >= grosime - EPS_FOAIE;', 'prin',
  'și adâncimile deja peste foaie (voia) se schimbă')
o('F04', PRIN, 'Math.abs(o.adancime - grosime) <= EPS_FOAIE;', 'Math.abs(o.adancime - grosime) <= 3;', 'prin',
  'și adâncimile cu până la 3 mm sub foaie se schimbă')
o('F05', PRIN, '  const adancime = grosime + supracursa;', '  const adancime = grosime + 2 * supracursa;', 'prin', 'supracursa pusă de două ori')
o('F06', JOB, '  if (prinFoaie) doc = cuTaieturiPrinFoaie(doc, supracursa);', '  if (false) doc = cuTaieturiPrinFoaie(doc, supracursa);', 'prin',
  'bifa fără efect în lucrare')
o('F07', JOB, '  if (prinFoaie) doc = cuTaieturiPrinFoaie(doc, supracursa);', '  if (true) doc = cuTaieturiPrinFoaie(doc, supracursa);', 'prin',
  'tăieturile cât foaia coboară și fără bifă')
# Mutată pe codul din 18.1↑c (25.11: argumentul `reliefuri`, ordinea cu finisările, bila); aceeași greșeală.
o('F08', CALC, 'p.supracursa ?? 0, p.prinFoaie === true, reliefuri);', 'p.supracursa ?? 0, false, reliefuri);', 'prin',
  'calculul exportului pierde bifa')
# Mutată pe codul din 18.1↑c (25.11: argumentul `reliefuri`, ordinea cu finisările, bila); aceeași greșeală.
o('F09', CALC, 'p.supracursa ?? 0, p.prinFoaie === true, reliefuri);', 'p.supracursa ?? 0, true, reliefuri);', 'prin',
  'calculul exportului pune bifa mereu')
# ---- Fereastra și aplicația ----
o('B01', APP, '  const [prinFoaie, setPrinFoaie] = useState(true);', '  const [prinFoaie, setPrinFoaie] = useState(false);', 'e2e',
  'bifa implicit scoasă')
# Mutată pe codul din 28.8↑k (26.11: fără supracursă, bifa nu se mai arată, în loc de oprită); aceeași greșeală.
o('B02', DLG, '          {cuSupracursa && (\n          <label className="alegere bifa-supracursa"',
  '          {true && (\n          <label className="alegere bifa-supracursa"', 'e2e', 'bifa arătată și fără supracursă')
o('B03', DLG, '  const cuSupracursa = supracursaBuna && supracursaCitita !== null && supracursaCitita > 0;',
  '  const cuSupracursa = supracursaBuna && supracursaCitita !== null && supracursaCitita >= 0;', 'e2e', 'bifa pornită la supracursa 0')
o('B04', DLG, 'supracursa: supracursaCitita, ...(prinFoaie ? { prinFoaie: true } : {}) } : {}),',
  'supracursa: supracursaCitita, ...(false ? { prinFoaie: true } : {}) } : {}),', 'e2e', 'bifa nu ajunge la export')
o('B05', DLG, 'supracursa: supracursaCitita, ...(prinFoaie ? { prinFoaie: true } : {}) } : {}),',
  'supracursa: supracursaCitita, ...({ prinFoaie: true }) } : {}),', 'e2e', 'debifată, tot ajunge la export')
o('B06', DLG, '              onChange={(e) => { schimbat(); onPrinFoaie(e.target.checked); }} />',
  '              onChange={(e) => { onPrinFoaie(e.target.checked); }} />', 'e2e', 'altă bifă lasă rezultatul vechi al exportului')
o('B07', DLG, '<input type="checkbox" checked={prinFoaie} data-camp="supracursa-prin-foaie"',
  '<input type="checkbox" checked={true} data-camp="supracursa-prin-foaie"', 'e2e', 'bifa nu se poate scoate')
o('B08', CON, '      prinFoaie={prinFoaie}\n', '      prinFoaie={true}\n', 'e2e', 'fereastra nu primește bifa aplicației')
o('B09', APP, '          onPrinFoaie={setPrinFoaie}\n', '          onPrinFoaie={() => {}}\n', 'e2e', 'aplicația nu ține bifa')

SETURI = {
    'prin': ['test/unit/supracursa.prinFoaie.test.ts'],
    'prin2': ['test/unit/supracursa.prinFoaie.test.ts', 'test/unit/incrustatieDreapta.gaura.test.ts', 'test/unit/incrustatieDreapta.punti.test.ts'],
}
E2E = ['test/e2e/supracursa.spec.ts']
