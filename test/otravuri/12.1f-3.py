# Lista de otrăvuri a feliei 12.1↑f-3 (supracursa în fereastra exportului, ADR 0176), 18.11.2026, alese de autor: decupările
# dopurilor cu supracursa (dopul drept simplu, cel în trepte, banda dopului în V; lucrarea dopului primește supracursa), calculul
# exportului care o dă dopurilor, marginea ei, fereastra (câmpul, judecata lui, motivul, cererea de export, rezultatul vechi
# scos la o valoare nouă) și aplicația care o ține de la o fereastră la alta.
# Țintele din ADR 0176: o decupare care se oprește la placă, o supracursă pusă de două ori, punțile subțiate de supracursă
# (vârful măsurat de la adâncime), un câmp care primește 0 greșit sau 2,5, o supracursă care nu ajunge la export.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DOP = 'src/cam/dopDrept.ts'
DOPV = 'src/cam/dopV.ts'
JOB = 'src/cam/job.ts'
CALC = 'src/jobs/calculCam.ts'
MAX = 'src/cam/supracursaMaxima.ts'
DLG = 'src/ui/DialogExport.tsx'
CON = 'src/app/ExportConectat.tsx'
APP = 'src/app/App.tsx'

# ---- Dopurile ----
o('S01', DOP, 'const d = decupareCuPunti(t.idLume, exterioare, goluri, op, inc, m, grosime + supracursa);',
  'const d = decupareCuPunti(t.idLume, exterioare, goluri, op, inc, m, grosime);', 'dopuri',
  'dopul decupat simplu se oprește la placă, fără supracursă')
o('S02', DOP, 'const d = decupareCuPunti(t.idLume, exterioare, goluri, op, inc, m, grosime + supracursa);',
  'const d = decupareCuPunti(t.idLume, exterioare, goluri, op, inc, m, grosime + 2 * supracursa);', 'dopuri',
  'supracursa pusă de două ori la dopul decupat simplu')
o('S03', DOP, 'const d = decupareCuPunti(id, exterioare, goluri, op, inc, k.m, k.h + k.supracursa);',
  'const d = decupareCuPunti(id, exterioare, goluri, op, inc, k.m, k.h);', 'dopuri',
  'flanșa dopului în trepte decupată fără supracursă')
o('S04', DOP, 'flansa: treapta.flansa, supracursa });', 'flansa: treapta.flansa, supracursa: 0 });', 'dopuri',
  'dopul în trepte nu primește supracursa')
o('S05', DOP, '    const job = programDinDocument(sintetic, regim, supracursa);', '    const job = programDinDocument(sintetic, regim);', 'dopuri',
  'lucrarea dopului drept fără supracursă (refuză decuparea de sub placă)')
o('S06', DOPV, 'adancime: T + supracursa, pas: op.pas,', 'adancime: T, pas: op.pas,', 'dopuri',
  'decuparea benzii în V se oprește la placă')
o('S07', DOPV, '      const job = programDinDocument(sintetic, regim, supracursa);', '      const job = programDinDocument(sintetic, regim);', 'dopuri',
  'lucrarea decupării benzii fără supracursă (refuză decuparea de sub placă)')
o('S08', JOB, '      const varf = grosime - g;', '      const varf = t.adancime - g;', 'dopuri',
  'vârful punților măsurat de la adâncime: supracursa subțiază punțile')

# ---- Calculul exportului ----
o('S09', CALC, '  const inV = programeDopuri(doc, REGIM_IMPLICIT, p.supracursa ?? 0);', '  const inV = programeDopuri(doc, REGIM_IMPLICIT);', 'dopuri',
  'dopurile în V nu primesc supracursa exportului')
o('S10', CALC, '  const drepte = programeDopuriDrepte(doc, REGIM_IMPLICIT, p.supracursa ?? 0);', '  const drepte = programeDopuriDrepte(doc, REGIM_IMPLICIT);',
  'dopuri', 'dopurile drepte nu primesc supracursa exportului')

# ---- Marginea, fereastra, aplicația ----
o('S11', MAX, 'export const SUPRACURSA_MAXIMA = 2;', 'export const SUPRACURSA_MAXIMA = 3;', 'e2e', 'marginea câmpului (și a lucrării) 3 mm: 2,5 primit')
o('S12', DLG, '&& supracursaCitita >= 0 && supracursaCitita <= SUPRACURSA_MAXIMA;', '&& supracursaCitita > 0 && supracursaCitita <= SUPRACURSA_MAXIMA;',
  'e2e', '0 (implicitul) marcat greșit')
o('S13', DLG, '&& supracursaCitita >= 0 && supracursaCitita <= SUPRACURSA_MAXIMA;', '&& supracursaCitita >= 0;', 'e2e',
  'fără marginea de sus: 2,5 primit')
o('S14', DLG, '    && supracursaBuna;\n', '    && true;\n', 'e2e', 'Exportă pornit cu o supracursă greșită')
o('S15', DLG, "    ...(supracursaBuna ? [] : [t('motiv.supracursa-invalida',", "    ...(true ? [] : [t('motiv.supracursa-invalida',", 'e2e',
  'fără motivul supracursei greșite')
o('S16', DLG, 'data-camp="supracursa" aria-invalid={!supracursaBuna}', 'data-camp="supracursa" aria-invalid={false}', 'e2e',
  'câmpul greșit nemarcat')
o('S17', DLG, '              onChange={(e) => { schimbat(); onSupracursa(e.target.value); }} />',
  '              onChange={(e) => { onSupracursa(e.target.value); }} />', 'e2e', 'altă supracursă lasă rezultatul vechi al exportului')
o('S18', DLG, '...(supracursaCitita !== null && supracursaCitita > 0 ? { supracursa: supracursaCitita } : {}),',
  '...(false ? { supracursa: supracursaCitita } : {}),', 'e2e', 'supracursa nu ajunge la export')
o('S19', CON, '      supracursa={supracursa}\n', '      supracursa="0"\n', 'e2e', 'fereastra nu primește supracursa aplicației')
o('S20', APP, "  const [supracursa, setSupracursa] = useState('0');", "  const [supracursa, setSupracursa] = useState('');", 'e2e',
  'implicitul gol (marcat greșit), nu 0')
o('S21', APP, '          onSupracursa={setSupracursa}\n', '          onSupracursa={() => {}}\n', 'e2e', 'câmpul nu se poate schimba')

SETURI = {
    'dopuri': ['test/unit/incrustatieDreapta.punti.test.ts', 'test/unit/incrustatieDreapta.gaura.test.ts', 'test/unit/incrustatieDreapta.trepte.test.ts',
               'test/unit/incrustatie.banda.test.ts'],
}
E2E = ['test/e2e/supracursa.spec.ts']
